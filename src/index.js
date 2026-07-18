/* ==========================================================================
   CRM Alpha Green Commerce — Máy chủ (Cloudflare Worker)
   ---------------------------------------------------------------------------
   NGUYÊN TẮC XUYÊN SUỐT: không tin gì từ trình duyệt.
   Mỗi lần hỏi dữ liệu, máy chủ tự tra "anh là ai" từ cookie phiên rồi mới
   quyết định trả cái gì. Trình duyệt không tự khai vai trò của mình được.
   ========================================================================== */

import {
  bamMatKhau, kiemTraMatKhau, sinhMatKhauTam, taoPhien, docPhien, xoaPhien, xoaPhienHetHan,
  dangBiKhoa, ghiNhanSai, xoaLanSai,
  cookieDangNhap, cookieDangXuat, layTokenTuCookie
} from './auth.js';

import {
  quyenCua, duocXemTab, duocXemLuong, laAdmin, TEN_VAI_TRO, VAI_TRO_HOP_LE
} from './quyen.js';
import { kiemTraMatKhauDat, DAI_TOI_THIEU } from './mat-khau.js';

/* ---- Trả lời dạng JSON -------------------------------------------------- */

function json(duLieu, status = 200, headersThem = {}) {
  return new Response(JSON.stringify(duLieu), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',        // dữ liệu nội bộ, không cho cache
      'X-Content-Type-Options': 'nosniff',
      ...headersThem
    }
  });
}

function loi(thongDiep, status = 400) {
  return json({ loi: thongDiep }, status);
}

/* ---- Bắt buộc đăng nhập ------------------------------------------------- */

async function batBuocDangNhap(req, env) {
  const phien = await docPhien(env.DB, layTokenTuCookie(req));
  if (!phien) return { loi: json({ loi: 'Chưa đăng nhập' }, 401) };
  return { phien };
}

/* ---- Các đầu việc ------------------------------------------------------- */

async function dangNhap(req, env) {
  let body;
  try { body = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const ten = String(body.ten_dang_nhap || '').trim().toLowerCase();
  const mk  = String(body.mat_khau || '');

  if (!ten || !mk) return loi('Thiếu tên đăng nhập hoặc mật khẩu');

  if (await dangBiKhoa(env.DB, ten)) {
    return loi('Sai quá nhiều lần. Vui lòng thử lại sau 15 phút.', 429);
  }

  const tk = await env.DB.prepare(
    'SELECT id, mat_khau_hash, kich_hoat FROM tai_khoan WHERE ten_dang_nhap = ?'
  ).bind(ten).first();

  // Dù không có tài khoản vẫn chạy băm giả để thời gian trả lời như nhau —
  // tránh việc dò xem tên đăng nhập nào có thật.
  const hashGia = 'pbkdf2$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const dung = await kiemTraMatKhau(mk, tk?.mat_khau_hash || hashGia);

  if (!tk || !dung || !tk.kich_hoat) {
    await ghiNhanSai(env.DB, ten);
    // Không nói rõ sai tên hay sai mật khẩu — nói rõ là chỉ điểm cho kẻ dò.
    return loi('Tên đăng nhập hoặc mật khẩu không đúng', 401);
  }

  await xoaLanSai(env.DB, ten);
  const { token, hetHan } = await taoPhien(env.DB, tk.id);
  await xoaPhienHetHan(env.DB);

  return json({ ok: true }, 200, { 'Set-Cookie': cookieDangNhap(token, hetHan) });
}

async function dangXuat(req, env) {
  await xoaPhien(env.DB, layTokenTuCookie(req));
  return json({ ok: true }, 200, { 'Set-Cookie': cookieDangXuat() });
}

/* Thông tin người đang đăng nhập + quyền của họ.
   Giao diện dùng cái này để vẽ menu — nhưng đây chỉ là để hiển thị cho
   thuận mắt. Việc chặn thật nằm ở từng đầu việc bên dưới. */
async function toiLaAi(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  const q = quyenCua(phien.vai_tro);
  return json({
    id: phien.nhan_su_id,
    ten: phien.ho_ten,
    viet_tat: phien.viet_tat,
    chuc_vu: phien.chuc_vu || TEN_VAI_TRO[phien.vai_tro] || '',
    vai_tro: phien.vai_tro,
    phai_doi_mk: !!phien.phai_doi_mk,
    quyen: q.tab,
    xem_luong: q.xem_luong,
    la_admin: laAdmin(phien.vai_tro),
    // Để giao diện khỏi ghi cứng con số, sau này đổi một chỗ là xong
    mat_khau_dai_toi_thieu: DAI_TOI_THIEU
  });
}

async function doiMatKhau(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  let body;
  try { body = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const cu  = String(body.mat_khau_cu || '');
  const moi = String(body.mat_khau_moi || '');

  if (moi === cu) return loi('Mật khẩu mới phải khác mật khẩu cũ');

  // Không ép mật khẩu phải dài — chặn mật khẩu dễ đoán hiệu quả hơn nhiều.
  // Xem src/mat-khau.js.
  const loiDat = kiemTraMatKhauDat(moi, phien.ten_dang_nhap, phien.ho_ten);
  if (loiDat) return loi(loiDat);

  const tk = await env.DB.prepare('SELECT mat_khau_hash FROM tai_khoan WHERE id = ?')
                         .bind(phien.tai_khoan_id).first();

  if (!await kiemTraMatKhau(cu, tk.mat_khau_hash)) {
    return loi('Mật khẩu cũ không đúng', 401);
  }

  await env.DB.prepare(
    'UPDATE tai_khoan SET mat_khau_hash = ?, phai_doi_mk = 0 WHERE id = ?'
  ).bind(await bamMatKhau(moi), phien.tai_khoan_id).run();

  // Đổi mật khẩu thì đá hết phiên cũ ra, kể cả phiên hiện tại
  await env.DB.prepare('DELETE FROM phien WHERE tai_khoan_id = ?')
              .bind(phien.tai_khoan_id).run();

  return json({ ok: true }, 200, { 'Set-Cookie': cookieDangXuat() });
}

/* ---- Danh bạ: ai đăng nhập cũng xem được -------------------------------- */

async function layDanhBa(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  if (!duocXemTab(phien.vai_tro, 'danhba')) return loi('Không có quyền', 403);

  // Chỉ chọn đúng các cột liên lạc. Cột lương không nằm trong câu lệnh này,
  // nên dữ liệu lương không có đường nào rời khỏi máy chủ qua đây.
  const { results } = await env.DB.prepare(`
    SELECT n.id, n.ho_ten, n.viet_tat, n.chuc_vu, n.bo_phan, n.sdt, n.email,
           q.ho_ten AS quan_ly
      FROM nhan_su n
      LEFT JOIN nhan_su q ON q.id = n.quan_ly_id
     WHERE n.dang_lam = 1
     ORDER BY n.bo_phan, n.ho_ten
  `).all();

  return json({ danh_ba: results });
}

/* ---- Nhân sự: lương chỉ trả cho người có quyền -------------------------- */

async function layNhanSu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  if (!duocXemTab(phien.vai_tro, 'nhansu')) return loi('Không có quyền', 403);

  const xemLuong = duocXemLuong(phien.vai_tro);

  // ĐÂY LÀ CHỖ QUAN TRỌNG NHẤT CỦA CẢ HỆ THỐNG:
  // hai câu lệnh khác nhau tuỳ vai trò. Người không có quyền thì cột lương
  // không được chọn ra khỏi database — không phải "lấy ra rồi ẩn đi".
  const cauLenh = xemLuong
    ? `SELECT id, ho_ten, viet_tat, chuc_vu, bo_phan, phap_nhan, trang_thai,
              ngay_vao, luong
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`
    : `SELECT id, ho_ten, viet_tat, chuc_vu, bo_phan, phap_nhan, trang_thai,
              ngay_vao
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`;

  const { results } = await env.DB.prepare(cauLenh).all();

  return json({ nhan_su: results, xem_luong: xemLuong });
}

/* ==========================================================================
   QUẢN TRỊ — chỉ admin (Giám đốc, Phó Giám đốc)
   ---------------------------------------------------------------------------
   Mọi đầu việc dưới đây đều kiểm tra laAdmin() ở máy chủ. Người không phải
   admin gọi thẳng vào cũng nhận 403 — không phải chỉ ẩn nút trên giao diện.
   ========================================================================== */

async function batBuocAdmin(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!laAdmin(phien.vai_tro)) return { loi: loi('Chỉ Giám đốc và Phó Giám đốc mới được quản trị', 403) };
  return { phien };
}

/* Viết tắt tên: "Phạm Khương Duy" -> "KD" (2 chữ cuối) */
function vietTatTen(hoTen) {
  const tu = String(hoTen).trim().split(/\s+/).filter(Boolean);
  if (tu.length === 0) return '?';
  const lay = tu.slice(-2);
  return lay.map(t => t[0].toUpperCase()).join('');
}

/* Danh sách nhân sự kèm tình trạng tài khoản — để admin quản lý */
async function qtDanhSach(req, env) {
  const { phien, loi: l } = await batBuocAdmin(req, env);
  if (l) return l;

  const { results } = await env.DB.prepare(`
    SELECT n.id, n.ho_ten, n.viet_tat, n.chuc_vu, n.bo_phan, n.sdt, n.email,
           n.phap_nhan, n.trang_thai, n.dang_lam,
           t.id AS tai_khoan_id, t.ten_dang_nhap, t.vai_tro, t.kich_hoat, t.phai_doi_mk
      FROM nhan_su n
      LEFT JOIN tai_khoan t ON t.nhan_su_id = n.id
     ORDER BY n.dang_lam DESC, n.bo_phan, n.ho_ten
  `).all();

  return json({
    nhan_su: results,
    vai_tro: VAI_TRO_HOP_LE.map(v => ({ ma: v, ten: TEN_VAI_TRO[v] }))
  });
}

/* Thêm một nhân sự mới (chưa có tài khoản) */
async function qtThemNhanSu(req, env) {
  const { loi: l } = await batBuocAdmin(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const hoTen = String(b.ho_ten || '').trim();
  if (hoTen.length < 2) return loi('Vui lòng nhập họ tên');

  const id = 'ns_' + crypto.randomUUID().slice(0, 12);
  const luong = (b.luong === '' || b.luong == null) ? null : parseInt(String(b.luong).replace(/\D/g, ''), 10) || null;

  await env.DB.prepare(`
    INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, sdt, email,
                         quan_ly_id, phap_nhan, trang_thai, ngay_vao, luong)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, hoTen, vietTatTen(hoTen),
    String(b.chuc_vu || '').trim(),
    String(b.bo_phan || '').trim(),
    String(b.sdt || '').trim() || null,
    String(b.email || '').trim() || null,
    String(b.quan_ly_id || '').trim() || null,
    String(b.phap_nhan || 'Công ty').trim(),
    String(b.trang_thai || 'da_ky').trim(),
    String(b.ngay_vao || '').trim() || null,
    luong
  ).run();

  return json({ ok: true, id });
}

/* Tạo tài khoản đăng nhập cho một nhân sự → trả mật khẩu tạm MỘT LẦN */
async function qtTaoTaiKhoan(req, env) {
  const { loi: l } = await batBuocAdmin(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const nhanSuId = String(b.nhan_su_id || '').trim();
  const ten = String(b.ten_dang_nhap || '').trim().toLowerCase();
  const vaiTro = String(b.vai_tro || '').trim();

  if (!nhanSuId) return loi('Thiếu nhân sự');
  if (!/^[a-z0-9._-]{3,20}$/.test(ten)) {
    return loi('Tên đăng nhập 3–20 ký tự, chỉ gồm chữ thường không dấu, số, dấu . _ -');
  }
  if (!VAI_TRO_HOP_LE.includes(vaiTro)) return loi('Vai trò không hợp lệ');

  const ns = await env.DB.prepare('SELECT id FROM nhan_su WHERE id = ?').bind(nhanSuId).first();
  if (!ns) return loi('Không tìm thấy nhân sự này', 404);

  const daCoTK = await env.DB.prepare('SELECT id FROM tai_khoan WHERE nhan_su_id = ?').bind(nhanSuId).first();
  if (daCoTK) return loi('Nhân sự này đã có tài khoản rồi');

  const trungTen = await env.DB.prepare('SELECT id FROM tai_khoan WHERE ten_dang_nhap = ?').bind(ten).first();
  if (trungTen) return loi('Tên đăng nhập này đã có người dùng');

  const matKhauTam = sinhMatKhauTam(10);
  await env.DB.prepare(`
    INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mk)
    VALUES (?, ?, ?, ?, 1)
  `).bind(nhanSuId, ten, await bamMatKhau(matKhauTam), vaiTro).run();

  // Trả mật khẩu tạm về ĐÚNG MỘT LẦN để admin chép cho nhân viên.
  // Máy chủ chỉ lưu hash, sau này không ai xem lại được mật khẩu này.
  return json({ ok: true, ten_dang_nhap: ten, mat_khau_tam: matKhauTam });
}

/* Đặt lại mật khẩu cho một tài khoản → trả mật khẩu tạm MỘT LẦN */
async function qtDatLaiMatKhau(req, env) {
  const { loi: l } = await batBuocAdmin(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const tkId = parseInt(b.tai_khoan_id, 10);
  if (!tkId) return loi('Thiếu tài khoản');

  const tk = await env.DB.prepare('SELECT id, ten_dang_nhap FROM tai_khoan WHERE id = ?').bind(tkId).first();
  if (!tk) return loi('Không tìm thấy tài khoản', 404);

  const matKhauTam = sinhMatKhauTam(10);
  await env.DB.prepare('UPDATE tai_khoan SET mat_khau_hash = ?, phai_doi_mk = 1 WHERE id = ?')
              .bind(await bamMatKhau(matKhauTam), tkId).run();

  // Đá hết phiên cũ của người đó ra — buộc đăng nhập lại bằng mật khẩu mới
  await env.DB.prepare('DELETE FROM phien WHERE tai_khoan_id = ?').bind(tkId).run();

  return json({ ok: true, ten_dang_nhap: tk.ten_dang_nhap, mat_khau_tam: matKhauTam });
}

/* Khoá / mở lại một tài khoản (không xoá, để giữ lịch sử) */
async function qtKhoaTaiKhoan(req, env) {
  const { phien, loi: l } = await batBuocAdmin(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const tkId = parseInt(b.tai_khoan_id, 10);
  const kichHoat = b.kich_hoat ? 1 : 0;
  if (!tkId) return loi('Thiếu tài khoản');

  // Không cho admin tự khoá chính mình (kẻo không còn ai quản trị)
  if (tkId === phien.tai_khoan_id && !kichHoat) {
    return loi('Không thể tự khoá tài khoản của chính mình');
  }

  await env.DB.prepare('UPDATE tai_khoan SET kich_hoat = ? WHERE id = ?').bind(kichHoat, tkId).run();
  if (!kichHoat) {
    await env.DB.prepare('DELETE FROM phien WHERE tai_khoan_id = ?').bind(tkId).run();
  }
  return json({ ok: true });
}

/* ---- Bộ định tuyến ------------------------------------------------------ */

const DUONG_DAN = {
  'POST /api/dang-nhap':     dangNhap,
  'POST /api/dang-xuat':     dangXuat,
  'GET  /api/toi-la-ai':     toiLaAi,
  'POST /api/doi-mat-khau':  doiMatKhau,
  'GET  /api/danh-ba':       layDanhBa,
  'GET  /api/nhan-su':       layNhanSu,
  'GET  /api/quan-tri/danh-sach':      qtDanhSach,
  'POST /api/quan-tri/them-nhan-su':   qtThemNhanSu,
  'POST /api/quan-tri/tao-tai-khoan':  qtTaoTaiKhoan,
  'POST /api/quan-tri/dat-lai-mat-khau': qtDatLaiMatKhau,
  'POST /api/quan-tri/khoa-tai-khoan': qtKhoaTaiKhoan
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (!url.pathname.startsWith('/api/')) {
      // Không phải API thì để Cloudflare trả file tĩnh trong public/
      return env.ASSETS.fetch(req);
    }

    const khoa = `${req.method.padEnd(4)} ${url.pathname}`;
    const xuLy = DUONG_DAN[khoa];

    if (!xuLy) return loi('Không có đầu việc này', 404);

    try {
      return await xuLy(req, env);
    } catch (e) {
      // Không trả chi tiết lỗi ra ngoài — lộ cấu trúc hệ thống cho kẻ dò.
      console.error('Lỗi máy chủ:', e.stack || e.message);
      return loi('Máy chủ gặp sự cố', 500);
    }
  }
};
