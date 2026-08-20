/* ==========================================================================
   ERP Alpha Green Commerce — Máy chủ (Cloudflare Worker)
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
  quyenCua, duocXemTab, duocXemLuong, laAdmin, duocThemNhanSu,
  quyenKho, quyenShopee, duocThaoTacKho, duocQuanLyKho, duocXemDonHoan, duocThaoTacVanHanh, TEN_VAI_TRO, VAI_TRO_HOP_LE
} from './quyen.js';
import { kiemTraMatKhauDat, DAI_TOI_THIEU } from './mat-khau.js';
import * as kho from './kho.js';
import * as shopee from './shopee.js';
import * as tiktok from './tiktok.js';
import * as nhansu from './nhansu.js';

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

  // Bỏ mọi khoảng trắng để "0912 345 678" khớp với "0912345678"
  const ten = String(body.ten_dang_nhap || '').replace(/\s+/g, '').toLowerCase();
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
  const hashGia = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
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
    them_nhan_su: duocThemNhanSu(phien.vai_tro),
    kho: quyenKho(phien.vai_tro),           // { thao_tac, quan_ly, gia_von } cho tab Kho
    shopee: quyenShopee(phien.vai_tro),     // { xem, quan_ly } cho tab Đơn hoàn
    thao_tac_van_hanh: duocThaoTacVanHanh(phien.vai_tro),   // được bấm nút ở bước Vận hành sàn (Cần đối soát) hay chỉ xem
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
    ? `SELECT id, ho_ten, viet_tat, chuc_vu, bo_phan, trang_thai,
              ngay_vao, luong
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`
    : `SELECT id, ho_ten, viet_tat, chuc_vu, bo_phan, trang_thai,
              ngay_vao
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`;

  const { results } = await env.DB.prepare(cauLenh).all();

  return json({ nhan_su: results, xem_luong: xemLuong });
}

/* ==========================================================================
   CHAT NỘI BỘ — 1 kênh chung cho toàn công ty (Sếp Ngọc chốt 19/08/2026)
   ---------------------------------------------------------------------------
   Mở cho MỌI người đăng nhập (giống Danh bạ) — không phân quyền theo bộ
   phận, vì đây là kênh làm việc chung thay Zalo/Misa chat đang dùng loạn.
   File đính kèm lưu base64 thẳng trong D1 (theo đúng cách CCCD đang làm,
   xem nhansu.js — quy mô công ty nhỏ, chưa cần mở R2). Giới hạn 4MB/file.
   Trình duyệt tự hỏi lại (poll) — không dùng WebSocket cho gọn hạ tầng.
   ========================================================================== */
const CHAT_TEP_TOI_DA = 4 * 1024 * 1024;   // 4MB — đủ ảnh chụp màn hình, Excel, PDF ngắn

/* Lấy tin nhắn — mặc định 50 tin gần nhất; truyền sau_id để chỉ lấy tin MỚI
   hơn (dùng cho polling, đỡ tải lại toàn bộ). Không trả tep_du_lieu (nặng). */
async function chatDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  const url = new URL(req.url);
  const sauId = parseInt(url.searchParams.get('sau_id'), 10);

  const cauLenh = sauId > 0
    ? `SELECT id, nguoi_gui_id, nguoi_gui_ten, nguoi_gui_viet_tat, noi_dung,
              tep_ten, tep_loai, tep_kich_thuoc, tao_luc
         FROM tin_nhan_chat WHERE id > ? ORDER BY id ASC`
    : `SELECT id, nguoi_gui_id, nguoi_gui_ten, nguoi_gui_viet_tat, noi_dung,
              tep_ten, tep_loai, tep_kich_thuoc, tao_luc
         FROM tin_nhan_chat ORDER BY id DESC LIMIT 50`;

  const { results } = sauId > 0
    ? await env.DB.prepare(cauLenh).bind(sauId).all()
    : await env.DB.prepare(cauLenh).all();

  // Lấy 50 tin gần nhất theo id giảm dần thì phải đảo lại cho đúng thứ tự thời gian
  const tinNhan = sauId > 0 ? (results || []) : (results || []).reverse();
  return json({ tin_nhan: tinNhan, toi_id: phien.nhan_su_id });
}

/* Gửi tin nhắn — có thể chỉ có chữ, chỉ có file, hoặc cả hai */
async function chatGui(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  let b; try { b = await req.formData(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const noiDung = String(b.get('noi_dung') || '').trim().slice(0, 2000);
  const tep = b.get('tep');   // File hoặc null

  let tepTen = null, tepLoai = null, tepKichThuoc = null, tepB64 = null;
  if (tep && typeof tep === 'object' && tep.size > 0) {
    if (tep.size > CHAT_TEP_TOI_DA) return loi('File quá 4MB — Sếp nén lại hoặc gửi link nhé', 413);
    tepTen = String(tep.name || 'tep-dinh-kem').slice(0, 200);
    tepLoai = String(tep.type || 'application/octet-stream');
    tepKichThuoc = tep.size;
    const buf = await tep.arrayBuffer();
    tepB64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  if (!noiDung && !tepB64) return loi('Tin nhắn trống');

  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const r = await env.DB.prepare(`
    INSERT INTO tin_nhan_chat
      (nguoi_gui_id, nguoi_gui_ten, nguoi_gui_viet_tat, noi_dung,
       tep_ten, tep_loai, tep_kich_thuoc, tep_du_lieu, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))
  `).bind(
    phien.nhan_su_id, nguoi, phien.viet_tat || '?', noiDung || null,
    tepTen, tepLoai, tepKichThuoc, tepB64
  ).run();

  return json({ ok: true, id: r.meta.last_row_id });
}

/* Tải file đính kèm của 1 tin nhắn — GET /api/chat/tep?id=123 */
async function chatTepDinhKem(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  const id = parseInt(new URL(req.url).searchParams.get('id'), 10);
  if (!id) return loi('Thiếu id file', 400);

  const r = await env.DB.prepare(
    'SELECT tep_ten, tep_loai, tep_du_lieu FROM tin_nhan_chat WHERE id = ?'
  ).bind(id).first();
  if (!r || !r.tep_du_lieu) return loi('Không tìm thấy file', 404);

  const bin = Uint8Array.from(atob(r.tep_du_lieu), c => c.charCodeAt(0));
  return new Response(bin, {
    headers: {
      'Content-Type': r.tep_loai || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(r.tep_ten || 'tep')}"`,
      'Cache-Control': 'private, max-age=31536000'
    }
  });
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
  if (!laAdmin(phien.vai_tro)) return { loi: loi('Chỉ Giám đốc và Phó Giám đốc mới được cấp/khoá tài khoản', 403) };
  return { phien };
}

/* Cho phép admin HOẶC HCNS (thêm nhân sự) */
async function batBuocThemNhanSu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!duocThemNhanSu(phien.vai_tro)) return { loi: loi('Bạn không có quyền quản lý nhân sự', 403) };
  return { phien };
}

/* Viết tắt tên: "Phạm Khương Duy" -> "KD" (2 chữ cuối) */
function vietTatTen(hoTen) {
  const tu = String(hoTen).trim().split(/\s+/).filter(Boolean);
  if (tu.length === 0) return '?';
  const lay = tu.slice(-2);
  return lay.map(t => t[0].toUpperCase()).join('');
}

/* Danh sách nhân sự kèm tình trạng tài khoản — admin và HCNS đều xem được.
   Câu lệnh này KHÔNG lấy cột lương, nên HCNS xem cũng không thấy lương. */
async function qtDanhSach(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
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

/* Thêm một nhân sự mới (chưa có tài khoản). Admin và HCNS đều thêm được. */
async function qtThemNhanSu(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const hoTen = String(b.ho_ten || '').trim();
  if (hoTen.length < 2) return loi('Vui lòng nhập họ tên');

  const id = 'ns_' + crypto.randomUUID().slice(0, 12);

  // RANH GIỚI LƯƠNG: chỉ admin mới được đặt lương. HCNS gửi lương lên cũng
  // bị bỏ qua ở đây — máy chủ ép NULL, không tin giao diện.
  const luong = laAdmin(phien.vai_tro)
    ? ((b.luong === '' || b.luong == null) ? null : parseInt(String(b.luong).replace(/\D/g, ''), 10) || null)
    : null;

  // phap_nhan luôn là 'Công ty' — công ty đang đóng HKD, không còn phân biệt.
  await env.DB.prepare(`
    INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, sdt, email,
                         quan_ly_id, phap_nhan, trang_thai, ngay_vao, luong)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Công ty', ?, ?, ?)
  `).bind(
    id, hoTen, vietTatTen(hoTen),
    String(b.chuc_vu || '').trim(),
    String(b.bo_phan || '').trim(),
    String(b.sdt || '').trim() || null,
    String(b.email || '').trim() || null,
    String(b.quan_ly_id || '').trim() || null,
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
  // Bỏ khoảng trắng — tên đăng nhập thường là số điện thoại
  const ten = String(b.ten_dang_nhap || '').replace(/\s+/g, '').toLowerCase();
  const vaiTro = String(b.vai_tro || '').trim();

  if (!nhanSuId) return loi('Thiếu nhân sự');
  if (!/^[a-z0-9._-]{3,20}$/.test(ten)) {
    return loi('Tên đăng nhập (số điện thoại) 3–20 ký tự, chỉ gồm số, chữ thường không dấu, dấu . _ -');
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

/* ==========================================================================
   KHO — Xuất / Nhập / Tồn
   ---------------------------------------------------------------------------
   Nghiệp vụ nằm trong src/kho.js. Các hàm dưới đây chỉ lo hai việc:
   bắt buộc đăng nhập + chỉ cho vào khi vai trò được xem tab 'khovan', rồi
   chuyển tiếp cho kho.js. Bản thân kho.js còn kiểm quyền chi tiết (thao tác,
   quản lý, giá vốn) một lần nữa — chặn kép cho chắc.
   ========================================================================== */

async function batBuocXemKho(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!duocXemTab(phien.vai_tro, 'khovan')) return { loi: loi('Bạn không có quyền xem Kho vận', 403) };
  return { phien };
}

async function khoDanhSachSP(req, env) {
  const { phien, loi: l } = await batBuocXemKho(req, env);
  if (l) return l;
  return kho.danhSachSanPham(env, phien);
}

async function khoThemSP(req, env) {
  const { phien, loi: l } = await batBuocXemKho(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return kho.themSanPham(env, phien, b);
}

async function khoNhap(req, env) {
  const { phien, loi: l } = await batBuocXemKho(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return kho.nhapKho(env, phien, b);
}

async function khoXuat(req, env) {
  const { phien, loi: l } = await batBuocXemKho(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return kho.xuatKho(env, phien, b);
}

async function khoLo(req, env) {
  const { phien, loi: l } = await batBuocXemKho(req, env);
  if (l) return l;
  const u = new URL(req.url);
  return kho.loTheoSanPham(env, phien, u.searchParams.get('san_pham_id'));
}

async function khoBaoCao(req, env) {
  const { phien, loi: l } = await batBuocXemKho(req, env);
  if (l) return l;
  const u = new URL(req.url);
  return kho.baoCaoXNT(env, phien, u.searchParams.get('tu'), u.searchParams.get('den'));
}

async function khoLichSu(req, env) {
  const { phien, loi: l } = await batBuocXemKho(req, env);
  if (l) return l;
  const u = new URL(req.url);
  return kho.lichSu(env, phien, u.searchParams.get('san_pham_id'), u.searchParams.get('gioi_han'));
}

/* ==========================================================================
   SHOPEE — Đơn hoàn (Returns)
   ---------------------------------------------------------------------------
   Nghiệp vụ trong src/shopee.js. Callback do CHÍNH SHOPEE gọi lại (không mang
   phiên đăng nhập của mình) nên KHÔNG bắt đăng nhập; các đầu việc còn lại đều
   bắt đăng nhập, phần kiểm quyền chi tiết nằm trong shopee.js.
   ========================================================================== */

async function shopeeTrangThai(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return shopee.apiTrangThai(env, phien);
}

async function shopeeConnect(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return shopee.apiConnect(env, phien);
}

/* Công khai — Shopee gọi lại sau khi shop bấm đồng ý ủy quyền */
async function shopeeCallback(req, env) {
  return shopee.apiCallback(env, new URL(req.url));
}

async function hoanDongBo(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return shopee.apiDongBo(env, phien);
}

async function hoanDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return shopee.apiDanhSach(env, phien);
}

const TINH_TRANG_HOP_LE = ['con_tot', 'hu_hong', 'thieu_hang', 'sai_hang'];

/* Kho xác nhận đã nhận được kiện hàng hoàn → tắt đồng hồ đếm 12h cho đơn đó.
   Ghi kèm tình trạng hàng hóa (còn tốt / hư hỏng / thiếu hàng / sai hàng) để
   Kế toán và Vận hành sàn biết ngay hàng về có bán lại được không, khỏi phải
   hỏi lại Kho (Sếp Ngọc chốt 20/08/2026). */
async function hoanDaNhan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacKho(phien.vai_tro)) return loi('Bạn không có quyền xác nhận nhận hàng', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const rsn = (b.return_sn || '').trim();
  const tinhTrang = (b.tinh_trang || '').trim();
  if (!rsn) return loi('Thiếu mã đơn hoàn');
  if (!TINH_TRANG_HOP_LE.includes(tinhTrang)) return loi('Thiếu hoặc sai tình trạng hàng hóa');
  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const r = await env.DB.prepare(`
    UPDATE don_hoan
       SET kho_nhan_luc = datetime('now','+7 hours'),
           kho_nhan_boi = ?, da_canh_bao = 1,
           tinh_trang_hang = ?, tinh_trang_luc = datetime('now','+7 hours'), tinh_trang_boi = ?
     WHERE return_sn = ? AND kho_nhan_luc IS NULL
  `).bind(nguoi, tinhTrang, nguoi, rsn).run();
  if (!r.meta.changes) return loi('Không tìm thấy đơn hoặc đã được nhận trước đó', 404);
  return json({ ok: true, nguoi });
}

/* Kho phân loại hàng nhận về từ đơn HUỶ có mã vận đơn (Sếp Ngọc chốt
   20/08/2026): 'nhap_kho' (hàng còn tốt, nhập lại kho) hoặc 'hong_cho_huy'
   (hư hỏng do vận chuyển, chờ lập biên bản hủy cùng kế toán). Chỉ dùng cho
   đơn huỷ — đơn hoàn bình thường vẫn "Nhận đủ" như cũ, không qua đây. */
async function hoanPhanLoai(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacKho(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const rsn = (b.return_sn || '').trim();
  const phanLoai = String(b.phan_loai || '').trim();
  if (!rsn) return loi('Thiếu mã đơn hoàn');
  if (phanLoai !== 'nhap_kho' && phanLoai !== 'hong_cho_huy') return loi('Phân loại không hợp lệ');

  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const r = await env.DB.prepare(`
    UPDATE don_hoan
       SET kho_nhan_luc = COALESCE(kho_nhan_luc, datetime('now','+7 hours')),
           kho_nhan_boi = COALESCE(kho_nhan_boi, ?),
           phan_loai_nhan = ?, phan_loai_luc = datetime('now','+7 hours'), phan_loai_boi = ?,
           dang_cho = CASE WHEN ? = 'hong_cho_huy' THEN 'ke_toan_huy' ELSE dang_cho END,
           da_canh_bao = 1
     WHERE return_sn = ? AND trang_thai LIKE '%CANCEL%'
  `).bind(nguoi, phanLoai, nguoi, phanLoai, rsn).run();
  if (!r.meta.changes) return loi('Không tìm thấy đơn (chỉ áp dụng cho đơn đã huỷ)', 404);

  if (phanLoai === 'hong_cho_huy') {
    await guiThongBao(env, 'ke_toan',
      `Kho báo hàng hỏng do vận chuyển — đơn ${rsn}, chờ lập biên bản hủy cùng kế toán.`,
      'hang_hong', rsn);
  }
  return json({ ok: true, nguoi });
}

/* ---- Thông báo trong ERP (chuông 🔔) ------------------------------------
   Nhóm nhận: kho roles -> 'kho'; vận hành sàn -> 'van_hanh'; ban giám đốc -> cả hai. */
function nhomCua(vaiTro) {
  if (vaiTro === 'nhan_vien_kho' || vaiTro === 'quan_ly_kho') return ['kho'];
  if (vaiTro === 'van_hanh_san') return ['van_hanh'];
  if (vaiTro === 'ke_toan_truong') return ['ke_toan'];
  if (vaiTro === 'giam_doc' || vaiTro === 'pho_giam_doc') return ['kho', 'van_hanh', 'ke_toan'];
  return [];
}

async function guiThongBao(env, nhom, noiDung, loai, lienKet) {
  try {
    await env.DB.prepare(
      `INSERT INTO thong_bao (nhom, noi_dung, loai, lien_ket, tao_luc)
       VALUES (?, ?, ?, ?, datetime('now','+7 hours'))`
    ).bind(nhom, noiDung, loai || null, lienKet || null).run();
  } catch (e) { console.error('Gửi thông báo:', e.message); }
}

/* LUẬT CỨNG (Sếp Ngọc chốt 19/08/2026): đơn hoàn chỉ giữ trong THÁNG LÀM VIỆC
   hiện tại — quá tháng thì tự xoá, không tích rác lại như hồi mới nối Shopee
   (dính 97 đơn từ 12/2024-2/2025 do lần đồng bộ đầu tiên chưa lọc ngày).
   Chạy mỗi lần cron (5 phút/lần) — DELETE theo mốc đầu tháng (giờ VN) nên
   luôn tự trôi theo tháng, không cần sửa code khi sang tháng mới. */
async function donDepDuLieuNgoaiThang(env) {
  const gioNay = new Date();
  const vn = new Date(gioNay.getTime() + 7 * 3600 * 1000);
  const dauThang = Math.floor(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1) / 1000) - 7 * 3600;
  const r = await env.DB.prepare(
    `DELETE FROM don_hoan WHERE tao_luc_shopee IS NULL OR CAST(tao_luc_shopee AS INTEGER) < ?`
  ).bind(dauThang).run();
  if (r.meta.changes) console.log(`Dọn ${r.meta.changes} đơn hoàn ngoài tháng làm việc`);
}

/* Đẩy 1 đơn hoàn ngược về Vận hành sàn + báo vận hành (dùng chung cho cả
   "Cần khiếu nại" gõ tay lẫn "Chưa nhận được" bấm nhanh — 2 lối vào, 1 lõi). */
async function dayVeVanHanh(env, rsn, ghiChu, nguoi, loaiThongBao) {
  const r = await env.DB.prepare(`
    UPDATE don_hoan
       SET dang_cho = 'van_hanh', ly_do_khieu_nai = ?,
           khieu_nai_luc = datetime('now','+7 hours'), khieu_nai_boi = ?
     WHERE return_sn = ? AND kho_nhan_luc IS NULL
  `).bind(ghiChu || null, nguoi, rsn).run();
  if (!r.meta.changes) return false;
  await guiThongBao(env, 'van_hanh',
    `Kho báo CẦN KHIẾU NẠI đơn ${rsn}${ghiChu ? ' — ' + ghiChu : ''}. Kiểm tra & khiếu nại với sàn.`,
    loaiThongBao || 'khieu_nai', rsn);
  return true;
}

/* Kho bấm "Cần khiếu nại" -> đẩy đơn ngược về Vận hành sàn + báo vận hành.
   Lý do ghi luôn vào chính đơn hoàn (ly_do_khieu_nai/khieu_nai_luc/khieu_nai_boi)
   để Vận hành sàn thấy ngay trong bảng "Cần đối soát", không phải lục chuông. */
async function hoanKhieuNai(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacKho(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const rsn = (b.return_sn || '').trim();
  const ghiChu = (b.ghi_chu || '').trim().slice(0, 300);
  if (!rsn) return loi('Thiếu mã đơn hoàn');
  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const ok = await dayVeVanHanh(env, rsn, ghiChu, nguoi);
  if (!ok) return loi('Không tìm thấy đơn (hoặc đã nhận đủ)', 404);
  return json({ ok: true });
}

/* Kho bấm "Chưa nhận được" -> 1 click đẩy ngay về Vận hành sàn, không cần gõ
   lý do (khác "Cần khiếu nại" là phải gõ tay) — Vận hành sàn thấy tag đỏ
   trong "Cần đối soát" giống hệt luồng khiếu nại (Sếp Ngọc chốt 20/08/2026). */
async function hoanChuaNhan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacKho(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const rsn = (b.return_sn || '').trim();
  if (!rsn) return loi('Thiếu mã đơn hoàn');
  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const ok = await dayVeVanHanh(env, rsn, 'Kho chưa nhận được hàng', nguoi);
  if (!ok) return loi('Không tìm thấy đơn (hoặc đã nhận đủ)', 404);
  return json({ ok: true });
}

async function layThongBao(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const nhom = nhomCua(phien.vai_tro);
  if (!nhom.length) return json({ thong_bao: [], chua_doc: 0 });
  const phs = nhom.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT id, nhom, noi_dung, loai, lien_ket, tao_luc FROM thong_bao
      WHERE nhom IN (${phs}) ORDER BY id DESC LIMIT 50`
  ).bind(...nhom).all();
  const xem = await env.DB.prepare('SELECT tb_xem_luc FROM tai_khoan WHERE id = ?')
                          .bind(phien.tai_khoan_id).first();
  const moc = xem?.tb_xem_luc || '';
  const chuaDoc = (results || []).filter(t => (t.tao_luc || '') > moc).length;
  return json({ thong_bao: results || [], chua_doc: chuaDoc });
}

async function thongBaoDaXem(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  await env.DB.prepare(`UPDATE tai_khoan SET tb_xem_luc = datetime('now','+7 hours') WHERE id = ?`)
              .bind(phien.tai_khoan_id).run();
  return json({ ok: true });
}

/* Gửi cảnh báo qua Telegram. Chưa cấu hình token/chat thì bỏ qua êm (trả false). */
async function guiTelegram(env, text) {
  const token = env.TELEGRAM_BOT_TOKEN, chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
    });
    return res.ok;
  } catch { return false; }
}

/* Quét đơn hoàn quá 12h kể từ khi sàn báo khách đã gửi về mà kho chưa bấm
   "Đã nhận" → bắn Telegram cho vận hành sàn đi khiếu nại. Đã bắn thì đánh dấu
   để không gửi lại. Mọi mốc thời gian đều theo giờ VN (+7). */
async function kiemTraCanhBaoHoan(env) {
  const { results } = await env.DB.prepare(`
    SELECT return_sn, order_sn, ma_van_don, san_pham, nguon, cho_kho_nhan_tu
      FROM don_hoan
     WHERE cho_kho_nhan_tu IS NOT NULL AND kho_nhan_luc IS NULL AND da_canh_bao = 0
       AND trang_thai NOT LIKE '%CANCEL%'
       AND (julianday(datetime('now','+7 hours')) - julianday(cho_kho_nhan_tu)) * 24 >= 12
  `).all();
  for (const r of (results || [])) {
    const nguon = r.nguon === 'tiktok' ? 'TikTok' : 'Shopee';
    const sp = (r.san_pham || '—').slice(0, 90);
    const text =
      `⚠️ ĐƠN HOÀN QUÁ 12H CHƯA NHẬN — CẦN KIỂM TRA/KHIẾU NẠI\n\n` +
      `Sàn: ${nguon}\n` +
      `Mã đơn hoàn: ${r.return_sn}\n` +
      `Đơn gốc: ${r.order_sn || '—'}\n` +
      `Mã vận đơn: ${r.ma_van_don || '—'}\n` +
      `Sản phẩm: ${sp}\n` +
      `Sàn báo khách gửi về từ: ${r.cho_kho_nhan_tu} (giờ VN)\n\n` +
      `→ Kho chưa xác nhận nhận hàng. Vận hành sàn tra vận đơn; nếu shipper đã quẹt giao mà kho không có hàng thì khiếu nại ngay.`;
    const ok = await guiTelegram(env, text);
    if (ok) {
      await env.DB.prepare('UPDATE don_hoan SET da_canh_bao = 1 WHERE return_sn = ?')
                  .bind(r.return_sn).run();
    }
  }
}

/* Quá 24h kể từ khi sàn báo khách gửi hàng về mà kho VẪN chưa bấm "Đã nhận"
   -> tự đẩy đơn sang sân "van_hanh" (Vận hành sàn) để họ chủ động tra soát
   với sàn/ĐVVC, thay vì kho cứ chờ vô thời hạn (Sếp Ngọc chốt 19/08/2026).
   Đơn biến mất khỏi màn Kho vận > Đơn hoàn, hiện ở Kinh doanh > Vận hành sàn
   > Cần đối soát. Vận hành sàn tra soát xong (kdDaDoiSoat/kdDayKho) thì
   dang_cho tự về lại 'kho' — xem migrations/them-luong-tra-soat.sql. */
async function kiemTraDayVanHanh(env) {
  await env.DB.prepare(`
    UPDATE don_hoan
       SET dang_cho = 'van_hanh'
     WHERE kho_nhan_luc IS NULL AND dang_cho = 'kho' AND cho_kho_nhan_tu IS NOT NULL
       AND trang_thai NOT LIKE '%CANCEL%'
       AND (julianday(datetime('now','+7 hours')) - julianday(cho_kho_nhan_tu)) * 24 >= 24
  `).run();
}

/* ==========================================================================
   KINH DOANH — Cần đối soát với sàn
   ---------------------------------------------------------------------------
   Đơn hoàn mà sàn đã báo khách gửi hàng về (cho_kho_nhan_tu) nhưng kho chưa
   xác nhận nhận (kho_nhan_luc) quá 12h thì đẩy sang đây cho Vận hành sàn
   theo dõi và đối soát/khiếu nại với sàn — cùng bộ lọc với cron cảnh báo
   Telegram ở kiemTraCanhBaoHoan(), chỉ khác là không giới hạn "chưa báo lần
   nào" (da_canh_bao) vì đây là màn xem liên tục, không phải cảnh báo 1 lần.
   Quyền dùng chung với Đơn hoàn (duocXemDonHoan): Giám đốc, Phó Giám đốc,
   Vận hành sàn, Kế toán trưởng. ========================================== */

async function kdCanDoiSoat(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);

  // Luồng (Sếp Ngọc chốt): MỌI đơn hoàn, bất kể trạng thái trên sàn, hễ KHO
  // CHƯA XÁC NHẬN "Đã nhận" (kho_nhan_luc IS NULL) đều vào danh sách tra soát —
  // vì trạng thái sàn ("Hoàn tất"...) không đảm bảo hàng đã về kho. Loại đơn huỷ.
  // Đơn chưa tra soát lần nào lên đầu; kèm số lần đã tra soát để theo dõi.
  // Đơn cũ sàn không trả SKU thì lấy tạm SKU đã ghép tay trong sku_map —
  // giống hệt cách apiDanhSach (shopee.js) làm, để 2 nơi luôn khớp nhau.
  // GỘP 1 LIST (Sếp Ngọc chốt 19/08/2026): MỌI đơn đang ở sân Vận hành sàn
  // (dang_cho='van_hanh') mà kho chưa nhận VÀ kế toán chưa tra soát — kể cả đơn
  // huỷ (trước tách riêng panel "Đơn hoàn huỷ", nay gộp chung cho nhanh). Vận
  // hành xem lý do rồi bấm "Đẩy sang Kho vận" (hàng về) hoặc "Đẩy sang Kế toán"
  // (đã hoàn tiền, kế toán tra soát).
  const { results } = await env.DB.prepare(`
    SELECT d.return_sn, d.order_sn, d.ma_van_don, d.san_pham, d.san_pham_ten,
           COALESCE(d.san_pham_sku, m.ma_sku) AS san_pham_sku, d.so_luong,
           d.nguon, d.trang_thai, d.ly_do, d.so_tien, d.tien_te, d.nguoi_mua, d.dang_cho,
           d.cho_kho_nhan_tu, d.lan_tra_soat, d.doi_soat_luc, d.doi_soat_boi,
           d.tao_luc_shopee, d.dong_bo_luc,
           d.ly_do_khieu_nai, d.khieu_nai_luc, d.khieu_nai_boi
      FROM don_hoan d
      LEFT JOIN sku_map m ON m.ten_san_pham = d.san_pham_ten
     WHERE d.kho_nhan_luc IS NULL
       AND d.ke_toan_luc IS NULL
       AND d.dang_cho = 'van_hanh'
     ORDER BY (d.doi_soat_luc IS NOT NULL), d.dong_bo_luc DESC
  `).all();
  return json({ can_doi_soat: results });
}

/* Đơn hoàn/hoàn tiền bị HUỶ trên sàn — đổ hết về Vận hành sàn theo dõi
   (Sếp Ngọc chốt 19/08/2026). Đa số không có hàng vật lý quay lại (yêu cầu
   hoàn bị huỷ/từ chối trước khi ai gửi gì), NHƯNG một số vẫn có mã vận đơn
   (khách đã gửi hàng về trước khi đơn bị huỷ) — các đơn đó vẫn cần kho nhận
   thật, nên apiDanhSach (shopee.js) đã đẩy chúng sang list Kho vận song
   song; ở đây trả kèm kho_nhan_luc để Vận hành sàn biết kho đã nhận chưa. */
async function kdDonHuy(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);

  const { results } = await env.DB.prepare(`
    SELECT d.return_sn, d.order_sn, d.ma_van_don, d.san_pham, d.san_pham_ten,
           COALESCE(d.san_pham_sku, m.ma_sku) AS san_pham_sku, d.so_luong,
           d.nguon, d.trang_thai, d.ly_do, d.kho_nhan_luc, d.kho_nhan_boi
      FROM don_hoan d
      LEFT JOIN sku_map m ON m.ten_san_pham = d.san_pham_ten
     WHERE d.trang_thai LIKE '%CANCEL%' AND d.ma_van_don IS NULL
     ORDER BY d.dong_bo_luc DESC
  `).all();
  return json({ don_huy: results });
}

/* Vận hành sàn đánh dấu đã đối soát/khiếu nại xong với sàn cho 1 đơn hoàn */
async function kdDaDoiSoat(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacVanHanh(phien.vai_tro)) return loi('Bạn không có quyền — thao tác này chỉ dành cho Vận hành sàn', 403);

  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const rsn = (b.return_sn || '').trim();
  if (!rsn) return loi('Thiếu mã đơn hoàn');

  // Cho phép tra soát NHIỀU LẦN (mỗi lần +1) chừng nào kho chưa xác nhận nhận hàng.
  // "Tra soát xong -> về sân kho" (dang_cho='kho') — xem migrations/them-luong-tra-soat.sql.
  // Xoá lý do khiếu nại cũ (nếu có) vì vòng khiếu nại này coi như đã xử lý xong —
  // đơn quay lại kho là một lượt mới, khiếu nại lần sau (nếu có) sẽ ghi đè lại.
  const r = await env.DB.prepare(`
    UPDATE don_hoan
       SET doi_soat_luc = datetime('now','+7 hours'), doi_soat_boi = ?,
           lan_tra_soat = lan_tra_soat + 1, dang_cho = 'kho',
           ly_do_khieu_nai = NULL, khieu_nai_luc = NULL, khieu_nai_boi = NULL
     WHERE return_sn = ? AND kho_nhan_luc IS NULL
  `).bind(phien.ho_ten || phien.ten_dang_nhap, rsn).run();
  if (!r.meta.changes) return loi('Không tìm thấy đơn (hoặc kho đã xác nhận nhận hàng)', 404);
  return json({ ok: true, nguoi: phien.ho_ten || phien.ten_dang_nhap });
}

/* Đẩy HÀNG LOẠT đơn đã chọn (tick chọn ở giao diện) về sân "kho" cùng lúc —
   coi như đã tra soát xong (giống kdDaDoiSoat) nhưng làm nhiều đơn 1 lần,
   để Vận hành sàn khỏi bấm từng đơn một khi đối soát cả loạt xong xuôi. */
async function kdDayKho(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacVanHanh(phien.vai_tro)) return loi('Bạn không có quyền — thao tác này chỉ dành cho Vận hành sàn', 403);

  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const dsRsn = Array.isArray(b.return_sn) ? b.return_sn.map(s => String(s).trim()).filter(Boolean) : [];
  if (!dsRsn.length) return loi('Chưa chọn đơn nào');

  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  let da = 0;
  for (const rsn of dsRsn) {
    const r = await env.DB.prepare(`
      UPDATE don_hoan
         SET doi_soat_luc = datetime('now','+7 hours'), doi_soat_boi = ?,
             lan_tra_soat = lan_tra_soat + 1, dang_cho = 'kho',
             ly_do_khieu_nai = NULL, khieu_nai_luc = NULL, khieu_nai_boi = NULL
       WHERE return_sn = ? AND kho_nhan_luc IS NULL
    `).bind(nguoi, rsn).run();
    if (r.meta.changes) da++;
  }
  if (da > 0) {
    await guiThongBao(env, 'kho',
      `Vận hành sàn đẩy ${da} đơn hoàn sang kho — vào Kho vận › Đơn hoàn để nhận.`,
      'day_kho', dsRsn[0]);
  }
  return json({ ok: true, so_don: da, nguoi });
}

/* Vận hành sàn bấm "Đẩy sang Kế toán" — đơn đã hoàn tiền, kế toán tra soát tiền */
async function kdDayKeToan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacVanHanh(phien.vai_tro)) return loi('Bạn không có quyền — thao tác này chỉ dành cho Vận hành sàn', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const dsRsn = Array.isArray(b.return_sn) ? b.return_sn.map(s => String(s).trim()).filter(Boolean)
              : (b.return_sn ? [String(b.return_sn).trim()] : []);
  if (!dsRsn.length) return loi('Chưa chọn đơn nào');
  let da = 0;
  for (const rsn of dsRsn) {
    const r = await env.DB.prepare(
      `UPDATE don_hoan SET dang_cho = 'ke_toan',
              ly_do_khieu_nai = NULL, khieu_nai_luc = NULL, khieu_nai_boi = NULL
        WHERE return_sn = ? AND kho_nhan_luc IS NULL AND ke_toan_luc IS NULL`
    ).bind(rsn).run();
    if (r.meta.changes) da++;
  }
  if (da > 0) {
    await guiThongBao(env, 'ke_toan',
      `Vận hành sàn đẩy ${da} đơn hoàn (đã hoàn tiền) sang Kế toán tra soát — vào Kế toán › Đơn hoàn tra soát.`,
      'day_ke_toan', dsRsn[0]);
  }
  return json({ ok: true, so_don: da });
}

/* Kế toán: danh sách đơn hoàn cần tra soát tiền (Vận hành đã đẩy sang) */
async function ktCanTraSoat(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'ketoan')) return loi('Bạn không có quyền', 403);
  const { results } = await env.DB.prepare(`
    SELECT d.return_sn, d.order_sn, d.ma_van_don, d.san_pham_ten,
           COALESCE(d.san_pham_sku, m.ma_sku) AS san_pham_sku, d.so_luong,
           d.nguon, d.trang_thai, d.ly_do, d.so_tien, d.tien_te, d.nguoi_mua,
           d.doi_soat_boi, d.tao_luc_shopee
      FROM don_hoan d
      LEFT JOIN sku_map m ON m.ten_san_pham = d.san_pham_ten
     WHERE d.dang_cho = 'ke_toan' AND d.ke_toan_luc IS NULL
     ORDER BY d.dong_bo_luc DESC
  `).all();
  return json({ can_tra_soat: results });
}

/* Kế toán bấm "Đã tra soát" -> đóng đơn về phía kế toán */
async function ktDaTraSoat(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'ketoan')) return loi('Bạn không có quyền', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const rsn = (b.return_sn || '').trim();
  if (!rsn) return loi('Thiếu mã đơn hoàn');
  const r = await env.DB.prepare(
    `UPDATE don_hoan SET ke_toan_luc = datetime('now','+7 hours'), ke_toan_boi = ?
      WHERE return_sn = ? AND ke_toan_luc IS NULL`
  ).bind(phien.ho_ten || phien.ten_dang_nhap, rsn).run();
  if (!r.meta.changes) return loi('Không tìm thấy đơn hoặc đã tra soát trước đó', 404);
  return json({ ok: true });
}

/* ==========================================================================
   HÀNG HỎNG DO VẬN CHUYỂN (đơn huỷ) — Kho phân loại xong đẩy sang đây, Kế
   toán + Kho cứ cuối tháng gom lại lập 1 biên bản hủy chung (Sếp Ngọc chốt
   20/08/2026). Khác "Đơn hoàn cần tra soát tiền" (đó là tiền hoàn, đây là
   HÀNG hỏng cần ghi giảm tồn kho).
   ========================================================================== */
async function ktHangHong(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'ketoan')) return loi('Bạn không có quyền', 403);
  const { results } = await env.DB.prepare(`
    SELECT d.return_sn, d.order_sn, d.ma_van_don, d.san_pham_ten,
           COALESCE(d.san_pham_sku, m.ma_sku) AS san_pham_sku, d.so_luong,
           d.nguon, d.kho_nhan_luc, d.kho_nhan_boi, d.phan_loai_luc, d.phan_loai_boi
      FROM don_hoan d
      LEFT JOIN sku_map m ON m.ten_san_pham = d.san_pham_ten
     WHERE d.phan_loai_nhan = 'hong_cho_huy' AND d.bien_ban_luc IS NULL
     ORDER BY d.phan_loai_luc ASC
  `).all();
  return json({ hang_hong: results });
}

/* Kho + Kế toán cùng chốt — tick chọn hàng loạt rồi "Đã lập biên bản hủy" */
async function ktLapBienBan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'ketoan')) return loi('Bạn không có quyền', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const dsRsn = Array.isArray(b.return_sn) ? b.return_sn.map(s => String(s).trim()).filter(Boolean) : [];
  if (!dsRsn.length) return loi('Chưa chọn đơn nào');

  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  let da = 0;
  for (const rsn of dsRsn) {
    const r = await env.DB.prepare(`
      UPDATE don_hoan SET bien_ban_luc = datetime('now','+7 hours'), bien_ban_boi = ?
       WHERE return_sn = ? AND phan_loai_nhan = 'hong_cho_huy' AND bien_ban_luc IS NULL
    `).bind(nguoi, rsn).run();
    if (r.meta.changes) da++;
  }
  return json({ ok: true, so_don: da });
}

/* ==========================================================================
   Ghép TÊN SẢN PHẨM (trên sàn) → MÃ SKU (kho) — cho đơn hoàn cũ không có SKU
   ---------------------------------------------------------------------------
   Xem quyền: ai xem được Đơn hoàn (duocXemDonHoan) đều xem được danh sách
   tên còn thiếu SKU. Gán/sửa/xoá SKU: chỉ ai quản lý được mã hàng kho
   (duocQuanLyKho — quản lý kho + ban giám đốc), giống hệt quyền "thêm mã
   hàng" ở tab Kho vận, vì gán SKU cũng là xác nhận dữ liệu danh mục kho.
   ========================================================================== */
async function hoanSkuMapDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);

  // Tên còn thiếu SKU: sàn không trả SKU (san_pham_sku NULL) và chưa ghép
  // trong sku_map — kèm số đơn đang bị ảnh hưởng để biết nên ưu tiên ghép gì.
  const [thieu, daGan, sanPham] = await Promise.all([
    env.DB.prepare(`
      SELECT san_pham_ten AS ten, COUNT(*) AS so_don
        FROM don_hoan
       WHERE san_pham_sku IS NULL AND san_pham_ten IS NOT NULL
         AND san_pham_ten NOT IN (SELECT ten_san_pham FROM sku_map)
       GROUP BY san_pham_ten
       ORDER BY so_don DESC
    `).all(),
    env.DB.prepare(`
      SELECT ten_san_pham AS ten, ma_sku, cap_nhat_luc, cap_nhat_boi
        FROM sku_map ORDER BY cap_nhat_luc DESC
    `).all(),
    env.DB.prepare(`SELECT ma_sku, ten FROM san_pham WHERE dang_ban = 1 ORDER BY ten`).all()
  ]);

  return json({
    thieu: thieu.results, da_gan: daGan.results, san_pham: sanPham.results,
    quyen: { gan: duocQuanLyKho(phien.vai_tro) }
  });
}

async function hoanSkuMapGan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocQuanLyKho(phien.vai_tro)) return loi('Bạn không có quyền gán SKU', 403);

  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const ten = String(b.ten_san_pham || '').trim();
  const sku = String(b.ma_sku || '').trim();
  if (!ten) return loi('Thiếu tên sản phẩm');

  if (!sku) {
    // Mã hàng để trống = bỏ ghép, trả tên này về danh sách "còn thiếu"
    await env.DB.prepare('DELETE FROM sku_map WHERE ten_san_pham = ?').bind(ten).run();
    return json({ ok: true, da_xoa: true });
  }

  await env.DB.prepare(`
    INSERT INTO sku_map (ten_san_pham, ma_sku, cap_nhat_luc, cap_nhat_boi)
    VALUES (?, ?, datetime('now','+7 hours'), ?)
    ON CONFLICT(ten_san_pham) DO UPDATE SET
      ma_sku = excluded.ma_sku, cap_nhat_luc = excluded.cap_nhat_luc, cap_nhat_boi = excluded.cap_nhat_boi
  `).bind(ten, sku, phien.ho_ten || phien.ten_dang_nhap).run();
  return json({ ok: true });
}

/* --- TikTok (song song Shopee, dùng chung tab Đơn hoàn) --- */
async function tiktokTrangThai(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return tiktok.apiTrangThai(env, phien);
}

async function tiktokConnect(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return tiktok.apiConnect(env, phien);
}

async function tiktokCallback(req, env) {
  return tiktok.apiCallback(env, new URL(req.url));   // công khai — TikTok gọi lại
}

async function tiktokDongBo(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return tiktok.apiDongBo(env, phien);
}

/* --- Đón nhân sự mới bằng ảnh CCCD --- */
async function nsDocCCCD(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return nhansu.docCCCD(env, phien, b);
}

async function nsDonMoi(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return nhansu.donNhanSuMoi(env, phien, b);
}

/* ---- Bộ định tuyến ------------------------------------------------------ */

const DUONG_DAN = {
  'POST /api/dang-nhap':     dangNhap,
  'POST /api/dang-xuat':     dangXuat,
  'GET  /api/toi-la-ai':     toiLaAi,
  'POST /api/doi-mat-khau':  doiMatKhau,
  'GET  /api/danh-ba':       layDanhBa,
  'GET  /api/nhan-su':       layNhanSu,
  'GET  /api/chat/tin-nhan': chatDanhSach,
  'POST /api/chat/gui':      chatGui,
  'GET  /api/chat/tep':      chatTepDinhKem,
  'GET  /api/quan-tri/danh-sach':      qtDanhSach,
  'POST /api/quan-tri/them-nhan-su':   qtThemNhanSu,
  'POST /api/quan-tri/tao-tai-khoan':  qtTaoTaiKhoan,
  'POST /api/quan-tri/dat-lai-mat-khau': qtDatLaiMatKhau,
  'POST /api/quan-tri/khoa-tai-khoan': qtKhoaTaiKhoan,
  'GET  /api/kho/san-pham':      khoDanhSachSP,
  'POST /api/kho/them-san-pham': khoThemSP,
  'POST /api/kho/nhap':          khoNhap,
  'POST /api/kho/xuat':          khoXuat,
  'GET  /api/kho/lo':            khoLo,
  'GET  /api/kho/bao-cao':       khoBaoCao,
  'GET  /api/kho/lich-su':       khoLichSu,
  'GET  /api/shopee/trang-thai': shopeeTrangThai,
  'GET  /api/shopee/connect':    shopeeConnect,
  'GET  /api/shopee/callback':   shopeeCallback,
  'POST /api/hoan/dong-bo':      hoanDongBo,
  'GET  /api/hoan/danh-sach':    hoanDanhSach,
  'GET  /api/hoan/sku-map':      hoanSkuMapDanhSach,
  'POST /api/hoan/sku-map':      hoanSkuMapGan,
  'POST /api/hoan/da-nhan':      hoanDaNhan,
  'POST /api/hoan/khieu-nai':    hoanKhieuNai,
  'POST /api/hoan/chua-nhan':    hoanChuaNhan,
  'POST /api/hoan/phan-loai':    hoanPhanLoai,
  'GET  /api/thong-bao':         layThongBao,
  'POST /api/thong-bao/da-xem':  thongBaoDaXem,
  'GET  /api/kinh-doanh/can-doi-soat': kdCanDoiSoat,
  'POST /api/kinh-doanh/da-doi-soat':  kdDaDoiSoat,
  'POST /api/kinh-doanh/day-kho':      kdDayKho,
  'POST /api/kinh-doanh/day-ke-toan':  kdDayKeToan,
  'GET  /api/ke-toan/can-tra-soat':    ktCanTraSoat,
  'POST /api/ke-toan/da-tra-soat':     ktDaTraSoat,
  'GET  /api/ke-toan/hang-hong':       ktHangHong,
  'POST /api/ke-toan/lap-bien-ban':    ktLapBienBan,
  'GET  /api/tiktok/trang-thai': tiktokTrangThai,
  'GET  /api/tiktok/connect':    tiktokConnect,
  'GET  /api/tiktok/callback':   tiktokCallback,
  'POST /api/tiktok/dong-bo':    tiktokDongBo,
  'POST /api/nhan-su/doc-cccd':  nsDocCCCD,
  'POST /api/nhan-su/don-moi':   nsDonMoi
};

export default {
  /* Lịch chạy nền (Cloudflare Cron) — tự làm mới access_token Shopee trước
     khi nó hết hạn (4h), để Sếp không bao giờ phải kết nối lại thủ công.
     Chưa cấu hình / chưa kết nối thì bỏ qua êm, không báo lỗi. */
  async scheduled(event, env, ctx) {
    // Chạy mỗi 5 phút: tự đồng bộ đơn hoàn của cả 2 sàn về DB (gần realtime).
    // dongBoNen tự bỏ qua nếu sàn chưa cấu hình/chưa kết nối, và tự làm mới
    // token khi sắp hết hạn — nên Sếp không phải bấm tay, không phải nối lại.
    ctx.waitUntil((async () => {
      try { await shopee.dongBoNen(env); } catch (e) { console.error('Cron Shopee:', e.message); }
      try { await tiktok.dongBoNen(env); } catch (e) { console.error('Cron TikTok:', e.message); }
      // Sau khi đồng bộ xong mới quét cảnh báo (mốc 12h đã được cập nhật)
      try { await kiemTraCanhBaoHoan(env); } catch (e) { console.error('Cron cảnh báo:', e.message); }
      // (Đã bỏ tự-đẩy-24h: luồng mới cho Vận hành sàn CHỦ ĐỘNG đẩy từng đơn sang kho)
      // Luật cứng: đơn hoàn chỉ giữ trong tháng làm việc hiện tại
      try { await donDepDuLieuNgoaiThang(env); } catch (e) { console.error('Cron dọn dữ liệu ngoài tháng:', e.message); }
    })());
  },

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
