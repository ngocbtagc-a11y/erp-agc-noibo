/* ==========================================================================
   CRM Alpha Green Commerce — Máy chủ (Cloudflare Worker)
   ---------------------------------------------------------------------------
   NGUYÊN TẮC XUYÊN SUỐT: không tin gì từ trình duyệt.
   Mỗi lần hỏi dữ liệu, máy chủ tự tra "anh là ai" từ cookie phiên rồi mới
   quyết định trả cái gì. Trình duyệt không tự khai vai trò của mình được.
   ========================================================================== */

import {
  bamMatKhau, kiemTraMatKhau, taoPhien, docPhien, xoaPhien, xoaPhienHetHan,
  dangBiKhoa, ghiNhanSai, xoaLanSai,
  cookieDangNhap, cookieDangXuat, layTokenTuCookie
} from './auth.js';

import { quyenCua, duocXemTab, duocXemLuong, TEN_VAI_TRO } from './quyen.js';
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

/* ---- Bộ định tuyến ------------------------------------------------------ */

const DUONG_DAN = {
  'POST /api/dang-nhap':     dangNhap,
  'POST /api/dang-xuat':     dangXuat,
  'GET  /api/toi-la-ai':     toiLaAi,
  'POST /api/doi-mat-khau':  doiMatKhau,
  'GET  /api/danh-ba':       layDanhBa,
  'GET  /api/nhan-su':       layNhanSu
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
