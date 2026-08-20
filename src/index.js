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
  const ns = await env.DB.prepare('SELECT (anh_chan_dung IS NOT NULL) AS co_anh FROM nhan_su WHERE id = ?')
                         .bind(phien.nhan_su_id).first();
  return json({
    id: phien.nhan_su_id,
    ten: phien.ho_ten,
    viet_tat: phien.viet_tat,
    chuc_vu: phien.chuc_vu || TEN_VAI_TRO[phien.vai_tro] || '',
    vai_tro: phien.vai_tro,
    phai_doi_mk: !!phien.phai_doi_mk,
    co_anh: !!ns?.co_anh,
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
           (n.anh_chan_dung IS NOT NULL) AS co_anh,
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
              ngay_vao, luong, (anh_chan_dung IS NOT NULL) AS co_anh
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`
    : `SELECT id, ho_ten, viet_tat, chuc_vu, bo_phan, trang_thai,
              ngay_vao, (anh_chan_dung IS NOT NULL) AS co_anh
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`;

  const { results } = await env.DB.prepare(cauLenh).all();

  return json({ nhan_su: results, xem_luong: xemLuong });
}

/* ==========================================================================
   CHAT NỘI BỘ — kênh chung TOÀN công ty + chat riêng (DM) từng người
   (Sếp Ngọc chốt 19-20/08/2026)
   ---------------------------------------------------------------------------
   Mở cho MỌI người đăng nhập (giống Danh bạ) — không phân quyền theo bộ
   phận, vì đây là kênh làm việc chung thay Zalo/Misa chat đang dùng loạn.
   nguoi_nhan_id NULL = tin ở kênh chung; có giá trị = tin nhắn RIÊNG (DM)
   giữa nguoi_gui_id và nguoi_nhan_id (2 chiều). Bấm "Chat ngay" ở Danh bạ
   mở đúng luồng riêng với người đó.
   File đính kèm lưu base64 thẳng trong D1 (theo đúng cách CCCD đang làm,
   xem nhansu.js — quy mô công ty nhỏ, chưa cần mở R2). Giới hạn 4MB/file.
   Trình duyệt tự hỏi lại (poll) — không dùng WebSocket cho gọn hạ tầng.
   ========================================================================== */
const CHAT_TEP_TOI_DA = 4 * 1024 * 1024;   // 4MB — đủ ảnh chụp màn hình, Excel, PDF ngắn

/* Lấy tin nhắn — mặc định 50 tin gần nhất; truyền sau_id để chỉ lấy tin MỚI
   hơn (dùng cho polling, đỡ tải lại toàn bộ). ?voi=<nhan_su_id> = lấy luồng
   chat RIÊNG với người đó thay vì kênh chung. Không trả tep_du_lieu (nặng). */
async function chatDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  const url = new URL(req.url);
  const sauId = parseInt(url.searchParams.get('sau_id'), 10);
  const voi = (url.searchParams.get('voi') || '').trim() || null;

  const cotChung = `id, nguoi_gui_id, nguoi_gui_ten, nguoi_gui_viet_tat, nguoi_nhan_id, noi_dung,
              tep_ten, tep_loai, tep_kich_thuoc, tao_luc`;
  // Kênh chung: nguoi_nhan_id IS NULL. Riêng (DM): 2 chiều giữa tôi và "voi".
  const dieuKienPhamVi = voi
    ? `((nguoi_gui_id = ? AND nguoi_nhan_id = ?) OR (nguoi_gui_id = ? AND nguoi_nhan_id = ?))`
    : `nguoi_nhan_id IS NULL`;
  const thamSoPhamVi = voi ? [phien.nhan_su_id, voi, voi, phien.nhan_su_id] : [];

  const cauLenh = sauId > 0
    ? `SELECT ${cotChung} FROM tin_nhan_chat WHERE ${dieuKienPhamVi} AND id > ? ORDER BY id ASC`
    : `SELECT ${cotChung} FROM tin_nhan_chat WHERE ${dieuKienPhamVi} ORDER BY id DESC LIMIT 50`;

  const thamSo = sauId > 0 ? [...thamSoPhamVi, sauId] : thamSoPhamVi;
  const { results } = await env.DB.prepare(cauLenh).bind(...thamSo).all();

  // Lấy 50 tin gần nhất theo id giảm dần thì phải đảo lại cho đúng thứ tự thời gian
  const tinNhan = sauId > 0 ? (results || []) : (results || []).reverse();
  return json({ tin_nhan: tinNhan, toi_id: phien.nhan_su_id });
}

/* Danh sách người đã từng chat riêng gần đây (2 chiều) — để hiện bong bóng
   truy cập nhanh cạnh nút chat nổi, khỏi phải vào Danh bạ bấm lại "Chat
   ngay" mỗi lần (Sếp Ngọc yêu cầu 20/08/2026). Sắp theo tin mới nhất. */
async function chatGanDay(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const { results } = await env.DB.prepare(`
    SELECT ns.id, ns.ho_ten, ns.viet_tat, MAX(x.id) AS tin_cuoi_id
      FROM (
        SELECT CASE WHEN nguoi_gui_id = ? THEN nguoi_nhan_id ELSE nguoi_gui_id END AS doi_tac_id, id
          FROM tin_nhan_chat
         WHERE nguoi_nhan_id IS NOT NULL AND (nguoi_gui_id = ? OR nguoi_nhan_id = ?)
      ) x
      JOIN nhan_su ns ON ns.id = x.doi_tac_id
     GROUP BY ns.id
     ORDER BY tin_cuoi_id DESC
     LIMIT 6
  `).bind(phien.nhan_su_id, phien.nhan_su_id, phien.nhan_su_id).all();
  return json({ gan_day: results || [] });
}

/* Đếm tin CHƯA XEM trên TOÀN BỘ các luồng (kênh chung + mọi cuộc chat riêng
   gửi tới tôi) — không phụ thuộc đang mở luồng nào trên widget. Cần cái này
   riêng vì chatDanhSach() ở trên chỉ nhìn thấy 1 luồng tại 1 thời điểm (luồng
   đang mở), nên trước đây nhắn riêng cho ai đó mà họ đang xem kênh chung
   (hoặc đóng popup) thì huy hiệu KHÔNG BAO GIỜ tăng — họ không biết có tin. */
async function chatChuaDoc(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  const sauId = parseInt(new URL(req.url).searchParams.get('sau_id'), 10) || 0;
  const { results } = await env.DB.prepare(`
    SELECT COUNT(*) AS so_luong, MAX(id) AS id_lon_nhat
    FROM tin_nhan_chat
    WHERE (nguoi_nhan_id IS NULL OR nguoi_nhan_id = ?)
      AND nguoi_gui_id != ?
      AND id > ?
  `).bind(phien.nhan_su_id, phien.nhan_su_id, sauId).all();
  const r = (results && results[0]) || {};
  // MAX(id) trả về NULL khi không có dòng nào khớp — giữ nguyên mốc cũ, đừng lùi về null
  return json({ so_luong: r.so_luong || 0, id_lon_nhat: r.id_lon_nhat || sauId });
}

/* Gửi tin nhắn — có thể chỉ có chữ, chỉ có file, hoặc cả hai. Có nguoi_nhan_id
   trong form thì là tin nhắn RIÊNG, không thì vào kênh chung. */
async function chatGui(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  let b; try { b = await req.formData(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const noiDung = String(b.get('noi_dung') || '').trim().slice(0, 2000);
  const tep = b.get('tep');   // File hoặc null
  const nguoiNhanId = String(b.get('nguoi_nhan_id') || '').trim() || null;
  if (nguoiNhanId && nguoiNhanId === phien.nhan_su_id) return loi('Không tự chat với chính mình được');

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
      (nguoi_gui_id, nguoi_gui_ten, nguoi_gui_viet_tat, nguoi_nhan_id, noi_dung,
       tep_ten, tep_loai, tep_kich_thuoc, tep_du_lieu, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))
  `).bind(
    phien.nhan_su_id, nguoi, phien.viet_tat || '?', nguoiNhanId, noiDung || null,
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
           n.phap_nhan, n.trang_thai, n.dang_lam, (n.anh_chan_dung IS NOT NULL) AS co_anh,
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

/* Lịch sử đơn hoàn — TRA CỨU LẠI đơn đã xử lý (khác apiDanhSach chỉ là hàng
   đợi việc cần làm, đơn xử lý xong là biến mất khỏi đó). Trả MỌI đơn hoàn
   đang còn trong database (kể cả đã nhận/đã tra soát xong), không lọc theo
   dang_cho. Chỉ đọc, không thao tác được ở đây (anh Duy yêu cầu 20/08/2026).
   Lưu ý: đơn hoàn ngoài THÁNG LÀM VIỆC hiện tại đã bị cron tự xoá (xem
   donDepDuLieuNgoaiThang) nên màn này cũng chỉ tra được trong tháng hiện tại.
   Cột tinh_trang_hang chỉ lấy khi DB thật đã có (xem coCotTinhTrangHang
   trong shopee.js) — tự nâng cấp khi Sếp Ngọc nạp migration, không lỗi nếu
   chưa nạp. */
async function hoanLichSu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  const coTT = await shopee.coCotTinhTrangHang(env);
  const { results } = await env.DB.prepare(`
    SELECT d.return_sn, d.order_sn, d.trang_thai, d.ly_do, d.so_tien, d.tien_te, d.nguoi_mua,
           d.san_pham, d.san_pham_ten, COALESCE(d.san_pham_sku, m.ma_sku) AS san_pham_sku,
           d.so_luong, d.ma_van_don, d.nguon, d.tao_luc_shopee, d.dong_bo_luc,
           d.kho_nhan_luc, d.kho_nhan_boi, d.phan_loai_nhan, d.phan_loai_luc, d.phan_loai_boi,
           d.dang_cho, d.ly_do_khieu_nai, d.khieu_nai_luc, d.khieu_nai_boi,
           d.ke_toan_luc, d.ke_toan_boi
           ${coTT ? ', d.tinh_trang_hang, d.tinh_trang_luc, d.tinh_trang_boi' : ''}
      FROM don_hoan d
      LEFT JOIN sku_map m ON m.ten_san_pham = d.san_pham_ten
     ORDER BY d.dong_bo_luc DESC LIMIT 500
  `).all();
  return json({ don_hoan: results });
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
  // Hàng còn tốt (bán lại được) thì đẩy luôn sang Kế toán để đối soát chéo
  // số lượng/tiền với sàn — cùng hàng đợi với luồng hoàn tiền không qua kho
  // (kdDayKeToan), phân biệt nhau bằng kho_nhan_luc có giá trị hay không
  // (Sếp Ngọc chốt 20/08/2026, 3 luồng về Kế toán). Hư hỏng/thiếu/sai hàng
  // thì KHÔNG đẩy ở đây — Kho tự bấm "Cần khiếu nại" để đẩy về Vận hành sàn.
  // Ghi tinh_trang_hang CHỈ khi DB thật đã có cột (xem coCotTinhTrangHang) —
  // chưa nạp migration thì vẫn nhận đơn bình thường, chỉ chưa lưu được tình
  // trạng chi tiết, tự nâng cấp khi Sếp Ngọc nạp xong, không cần deploy lại.
  const coTT = await shopee.coCotTinhTrangHang(env);
  const r = await env.DB.prepare(coTT ? `
    UPDATE don_hoan
       SET kho_nhan_luc = datetime('now','+7 hours'),
           kho_nhan_boi = ?, da_canh_bao = 1,
           tinh_trang_hang = ?, tinh_trang_luc = datetime('now','+7 hours'), tinh_trang_boi = ?,
           dang_cho = CASE WHEN ? = 'con_tot' THEN 'ke_toan' ELSE dang_cho END
     WHERE return_sn = ? AND kho_nhan_luc IS NULL
  ` : `
    UPDATE don_hoan
       SET kho_nhan_luc = datetime('now','+7 hours'),
           kho_nhan_boi = ?, da_canh_bao = 1,
           dang_cho = CASE WHEN ? = 'con_tot' THEN 'ke_toan' ELSE dang_cho END
     WHERE return_sn = ? AND kho_nhan_luc IS NULL
  `).bind(...(coTT ? [nguoi, tinhTrang, nguoi, tinhTrang, rsn] : [nguoi, tinhTrang, rsn])).run();
  if (!r.meta.changes) return loi('Không tìm thấy đơn hoặc đã được nhận trước đó', 404);
  if (tinhTrang === 'con_tot') {
    await guiThongBao(env, 'ke_toan',
      `Kho đã nhập kho đơn hoàn ${rsn} — cần đối soát chéo với sàn.`,
      'day_ke_toan', rsn);
  }
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

/* nguoiNhanId (tuỳ chọn): báo cho ĐÚNG 1 người thay vì cả nhóm phòng ban —
   dùng cho Tác vụ (giao việc là chuyện riêng 2 người, không phải cả phòng
   ban cần biết). Truyền nhom=null khi dùng kiểu này — cột nhom vẫn NOT NULL
   nên ghi tạm 'ca_nhan' (không khớp bất kỳ nhóm thật nào, chỉ để ràng buộc
   DB vui lòng; layThongBao lọc bằng nguoi_nhan_id chứ không phải nhom này). */
async function guiThongBao(env, nhom, noiDung, loai, lienKet, nguoiNhanId) {
  try {
    await env.DB.prepare(
      `INSERT INTO thong_bao (nhom, noi_dung, loai, lien_ket, nguoi_nhan_id, tao_luc)
       VALUES (?, ?, ?, ?, ?, datetime('now','+7 hours'))`
    ).bind(nhom || 'ca_nhan', noiDung, loai || null, lienKet || null, nguoiNhanId || null).run();
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

  // Trước khi xoá, cộng dồn số liệu (theo khách + đúng tháng gốc của từng
  // đơn) vào khach_hang_hoan_thang — bảng này KHÔNG bị xoá theo tháng, để
  // CSKH vẫn xem được xếp hạng khách hoàn/hủy nhiều nhiều tháng về sau
  // (Sếp Ngọc chốt 20/08/2026), dù bảng đơn hoàn gốc vẫn tuân luật cũ.
  await env.DB.prepare(`
    INSERT INTO khach_hang_hoan_thang (nguoi_mua, thang, nguon, so_don, so_huy, gan_nhat)
    SELECT nguoi_mua,
           strftime('%Y-%m', datetime(CAST(tao_luc_shopee AS INTEGER), 'unixepoch', '+7 hours')),
           nguon,
           COUNT(*),
           SUM(CASE WHEN trang_thai LIKE '%CANCEL%' THEN 1 ELSE 0 END),
           MAX(CAST(tao_luc_shopee AS INTEGER))
      FROM don_hoan
     WHERE tao_luc_shopee IS NOT NULL AND CAST(tao_luc_shopee AS INTEGER) < ?
       AND nguoi_mua IS NOT NULL AND nguoi_mua != ''
     GROUP BY nguoi_mua, nguon, strftime('%Y-%m', datetime(CAST(tao_luc_shopee AS INTEGER), 'unixepoch', '+7 hours'))
    ON CONFLICT(nguoi_mua, thang, nguon) DO UPDATE SET
      so_don = so_don + excluded.so_don,
      so_huy = so_huy + excluded.so_huy,
      gan_nhat = MAX(gan_nhat, excluded.gan_nhat)
  `).bind(dauThang).run();

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
  // Gộp 2 nguồn: thông báo theo NHÓM phòng ban (như cũ) + thông báo nhắm
  // ĐÚNG cá nhân (vd Tác vụ giao việc) — ai cũng có thể nhận loại sau dù
  // vai trò không thuộc nhóm phòng ban nào (vd hcns không có trong nhomCua).
  const dieuKien = nhom.length
    ? `(nhom IN (${nhom.map(() => '?').join(',')}) AND nguoi_nhan_id IS NULL) OR nguoi_nhan_id = ?`
    : `nguoi_nhan_id = ?`;
  const thamSo = [...nhom, phien.nhan_su_id];
  const { results } = await env.DB.prepare(
    `SELECT id, nhom, noi_dung, loai, lien_ket, tao_luc FROM thong_bao
      WHERE ${dieuKien} ORDER BY id DESC LIMIT 50`
  ).bind(...thamSo).all();
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

/* ==========================================================================
   TRẠM VIỆC — giao việc cho nhân viên (Sếp Ngọc yêu cầu 20/08/2026). Theo tinh
   thần MBOs của công ty: mỗi việc BẮT BUỘC có "đầu ra cụ thể" (dau_ra),
   tách khỏi "mô tả" (mo_ta, chỉ là ghi chú thêm, không bắt buộc).
   Luồng trạng thái: moi -> dang_lam -> cho_duyet -> hoan_thanh (hoặc huy
   bất kỳ lúc nào trước khi xong). Mở cho MỌI vai trò, ai cũng giao/nhận
   việc được — không giới hạn theo cấp bậc (đơn giản hoá MVP).
   ========================================================================== */
const CV_COT = `id, tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten,
                nguoi_nhan_id, nguoi_nhan_ten, han_chot, trang_thai, ket_qua,
                tao_luc, cap_nhat_luc`;

async function cvDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const [nhan, giao] = await Promise.all([
    env.DB.prepare(
      `SELECT ${CV_COT} FROM cong_viec WHERE nguoi_nhan_id = ?
        ORDER BY (trang_thai IN ('hoan_thanh','huy')), (han_chot IS NULL), han_chot ASC, id DESC`
    ).bind(phien.nhan_su_id).all(),
    env.DB.prepare(
      `SELECT ${CV_COT} FROM cong_viec WHERE nguoi_giao_id = ?
        ORDER BY (trang_thai IN ('hoan_thanh','huy')), id DESC`
    ).bind(phien.nhan_su_id).all()
  ]);
  return json({ nhan: nhan.results || [], giao: giao.results || [] });
}

async function cvTao(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const nguoiNhanId = String(b.nguoi_nhan_id || '').trim();
  const tieuDe = String(b.tieu_de || '').trim().slice(0, 200);
  const dauRa = String(b.dau_ra || '').trim().slice(0, 1000);
  const moTa = String(b.mo_ta || '').trim().slice(0, 2000) || null;
  const hanChot = String(b.han_chot || '').trim() || null;

  if (!nguoiNhanId) return loi('Chưa chọn người nhận việc');
  if (nguoiNhanId === phien.nhan_su_id) return loi('Không tự giao việc cho chính mình');
  if (!tieuDe) return loi('Thiếu tên việc');
  if (!dauRa) return loi('Thiếu đầu ra cụ thể cần đạt — đừng chỉ ghi "làm gì", ghi rõ xong thì kết quả ra sao');

  const ns = await env.DB.prepare('SELECT ho_ten FROM nhan_su WHERE id = ?').bind(nguoiNhanId).first();
  if (!ns) return loi('Không tìm thấy người nhận việc', 404);

  const nguoiGiao = phien.ho_ten || phien.ten_dang_nhap;
  const r = await env.DB.prepare(`
    INSERT INTO cong_viec (tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten, han_chot, trang_thai, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'moi', datetime('now','+7 hours'))
  `).bind(tieuDe, dauRa, moTa, phien.nhan_su_id, nguoiGiao, nguoiNhanId, ns.ho_ten, hanChot).run();

  await guiThongBao(env, null, `${nguoiGiao} giao việc mới: "${tieuDe}"`, 'cong_viec_moi', String(r.meta.last_row_id), nguoiNhanId);
  return json({ ok: true, id: r.meta.last_row_id });
}

const CV_TRANG_THAI_HOP_LE = ['moi', 'dang_lam', 'cho_duyet', 'hoan_thanh', 'huy'];

async function cvCapNhat(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const id = parseInt(b.id, 10);
  const trangThaiMoi = String(b.trang_thai || '').trim();
  const ketQua = b.ket_qua != null ? String(b.ket_qua).trim().slice(0, 2000) : null;
  if (!id) return loi('Thiếu id công việc');
  if (!CV_TRANG_THAI_HOP_LE.includes(trangThaiMoi)) return loi('Trạng thái không hợp lệ');

  const cv = await env.DB.prepare('SELECT * FROM cong_viec WHERE id = ?').bind(id).first();
  if (!cv) return loi('Không tìm thấy công việc', 404);

  const laNguoiNhan = cv.nguoi_nhan_id === phien.nhan_su_id;
  const laNguoiGiao = cv.nguoi_giao_id === phien.nhan_su_id || laAdmin(phien.vai_tro);

  // Trả lại làm tiếp (cho_duyet -> dang_lam) — CHỈ người giao được bấm, tách
  // riêng khỏi bảng dưới vì đích đến 'dang_lam' còn dùng chung với nhánh
  // "Bắt đầu làm" (moi -> dang_lam, người NHẬN bấm) — 2 luật khác hẳn nhau
  // dù cùng đích đến, phải phân biệt bằng trạng thái NGUỒN.
  if (trangThaiMoi === 'dang_lam' && cv.trang_thai === 'cho_duyet') {
    if (!laNguoiGiao) return loi('Chỉ người giao việc mới trả lại được', 403);
  } else {
    const CHUYEN_HOP_LE = {
      dang_lam:   { tu: ['moi'],       ai: laNguoiNhan },
      cho_duyet:  { tu: ['dang_lam'],  ai: laNguoiNhan, batBuocKetQua: true },
      hoan_thanh: { tu: ['cho_duyet'], ai: laNguoiGiao },
      huy:        { tu: ['moi', 'dang_lam', 'cho_duyet'], ai: laNguoiGiao }
    };
    const luat = CHUYEN_HOP_LE[trangThaiMoi];
    if (!luat || !luat.tu.includes(cv.trang_thai)) return loi(`Không thể chuyển từ "${cv.trang_thai}" sang "${trangThaiMoi}"`, 400);
    if (!luat.ai) return loi('Bạn không có quyền chuyển trạng thái này', 403);
    if (luat.batBuocKetQua && !ketQua) return loi('Hãy điền kết quả thực tế trước khi nộp');
  }

  await env.DB.prepare(`
    UPDATE cong_viec SET trang_thai = ?, ket_qua = COALESCE(?, ket_qua), cap_nhat_luc = datetime('now','+7 hours')
     WHERE id = ?
  `).bind(trangThaiMoi, ketQua, id).run();

  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  if (trangThaiMoi === 'cho_duyet') {
    await guiThongBao(env, null, `${nguoi} đã nộp kết quả việc "${cv.tieu_de}" — chờ duyệt.`, 'cong_viec_cho_duyet', String(id), cv.nguoi_giao_id);
  } else if (trangThaiMoi === 'hoan_thanh') {
    await guiThongBao(env, null, `${nguoi} đã duyệt xong việc "${cv.tieu_de}".`, 'cong_viec_xong', String(id), cv.nguoi_nhan_id);
  } else if (trangThaiMoi === 'dang_lam' && cv.trang_thai === 'cho_duyet') {
    await guiThongBao(env, null, `${nguoi} yêu cầu làm lại việc "${cv.tieu_de}".`, 'cong_viec_tralai', String(id), cv.nguoi_nhan_id);
  } else if (trangThaiMoi === 'huy') {
    await guiThongBao(env, null, `${nguoi} đã huỷ việc "${cv.tieu_de}".`, 'cong_viec_huy', String(id), cv.nguoi_nhan_id);
  }
  return json({ ok: true });
}

/* ==========================================================================
   VINH DANH — bảng khen ngợi nhỏ ở Tổng quan, ai cũng thấy (Sếp Ngọc yêu
   cầu 20/08/2026, rèn thói quen ghi nhận đồng nghiệp). Mở cho mọi vai trò
   xem VÀ gửi — không riêng ban giám đốc, khen nhau qua lại càng tốt.
   ========================================================================== */
async function vdDanhSach(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  // Chỉ hiện lời khen trong 48h gần nhất (Sếp Ngọc chốt 20/08/2026) — dữ liệu
  // vẫn giữ vĩnh viễn trong bảng, chỉ ẩn khỏi danh sách hiển thị sau 48h để
  // khu Vinh danh luôn "tươi", không tồn đọng lời khen cũ.
  const { results } = await env.DB.prepare(`
    SELECT v.id, v.nhan_su_id, v.nhan_su_ten, v.noi_dung, v.nguoi_gui_ten, v.tao_luc, v.so_sao,
           (n.anh_chan_dung IS NOT NULL) AS co_anh, n.sao
      FROM vinh_danh v
      LEFT JOIN nhan_su n ON n.id = v.nhan_su_id
     WHERE v.tao_luc >= datetime('now', '-48 hours', '+7 hours')
     ORDER BY v.id DESC LIMIT 20
  `).all();

  // Gợi ý nhẹ (Sếp Ngọc yêu cầu): "thỉnh thoảng cũng lấy dữ liệu" từ Trạm
  // Việc lên — ai hoàn thành nhiều việc nhất trong 7 ngày qua mà CHƯA được
  // vinh danh vì việc đó (so lien_ket với id cong_viec, tránh gợi ý lặp lại
  // đúng người vừa mới khen). Chỉ là gợi ý hiển thị, Sếp vẫn tự gõ lời khen.
  const goiY = await env.DB.prepare(`
    SELECT nguoi_nhan_id, nguoi_nhan_ten, COUNT(*) AS so_viec
      FROM cong_viec
     WHERE trang_thai = 'hoan_thanh'
       AND cap_nhat_luc >= datetime('now', '-7 days', '+7 hours')
     GROUP BY nguoi_nhan_id
     ORDER BY so_viec DESC
     LIMIT 1
  `).first();

  return json({ vinh_danh: results || [], goi_y: goiY || null });
}

async function vdGui(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const nhanSuId = String(b.nhan_su_id || '').trim();
  const noiDung = String(b.noi_dung || '').trim().slice(0, 500);
  const soSao = parseInt(b.so_sao, 10);
  if (!nhanSuId) return loi('Chưa chọn người được vinh danh');
  if (!noiDung) return loi('Chưa viết lời khen');
  if (!Number.isInteger(soSao) || soSao < 1 || soSao > 50) return loi('Số sao gửi tặng phải từ 1 đến 50');

  const ns = await env.DB.prepare('SELECT ho_ten FROM nhan_su WHERE id = ?').bind(nhanSuId).first();
  if (!ns) return loi('Không tìm thấy người này', 404);

  const nguoiGui = phien.ho_ten || phien.ten_dang_nhap;
  const r = await env.DB.prepare(`
    INSERT INTO vinh_danh (nhan_su_id, nhan_su_ten, noi_dung, nguoi_gui_id, nguoi_gui_ten, so_sao, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))
  `).bind(nhanSuId, ns.ho_ten, noiDung, phien.nhan_su_id, nguoiGui, soSao).run();

  // Cộng đúng số sao Sếp chọn vào sao tích luỹ (Sếp Ngọc yêu cầu 20/08/2026,
  // sau này dùng đổi quà — catalog đổi quà CHƯA xây, đây mới là phần cộng dồn).
  await env.DB.prepare('UPDATE nhan_su SET sao = sao + ? WHERE id = ?').bind(soSao, nhanSuId).run();

  if (nhanSuId !== phien.nhan_su_id) {
    await guiThongBao(env, null, `${nguoiGui} vừa vinh danh bạn: "${noiDung}" (+${soSao} ⭐)`, 'vinh_danh', String(r.meta.last_row_id), nhanSuId);
  }
  return json({ ok: true, id: r.meta.last_row_id });
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

/* Lý do hoàn NGHIÊM TRỌNG — nghi hàng giả/nhái hoặc hộp hàng rỗng (Sếp Ngọc
   yêu cầu 20/08/2026, đây là rủi ro pháp lý/uy tín, cần biết NGAY chứ không
   đợi ai đó tình cờ lướt thấy trong danh sách). Cùng nhóm từ khoá với bản
   dịch tiếng Việt ở app.js (LY_DO_KHOA) nhưng viết riêng ở đây vì backend
   không import được file frontend — sửa 1 bên thì nhớ soát bên kia.
   da_canh_bao_nghiem_trong chặn gửi lặp lại mỗi 5 phút cho cùng 1 đơn. */
const LY_DO_NGHIEM_TRONG_RE = /counterfeit|fake|empty_(box|parcel|package)/i;

async function kiemTraLyDoNghiemTrong(env) {
  const { results } = await env.DB.prepare(`
    SELECT return_sn, order_sn, ly_do, nguon, nguoi_mua
      FROM don_hoan
     WHERE da_canh_bao_nghiem_trong = 0 AND ly_do IS NOT NULL
  `).all();
  const canhBao = (results || []).filter(r => LY_DO_NGHIEM_TRONG_RE.test(r.ly_do));
  if (!canhBao.length) return;

  for (const r of canhBao) {
    const nguon = r.nguon === 'tiktok' ? 'TikTok' : 'Shopee';
    const loaiRui = /counterfeit|fake/i.test(r.ly_do) ? 'nghi HÀNG GIẢ/NHÁI' : 'HỘP HÀNG RỖNG';
    const noiDung = `🚨 Đơn hoàn ${r.return_sn} (${nguon}) — lý do ${loaiRui}: "${r.ly_do}". Cần kiểm tra ngay, đây là rủi ro pháp lý/uy tín.`;
    await guiThongBao(env, 'van_hanh', noiDung, 'canh_bao_nghiem_trong', r.return_sn);
    // Gửi thẳng vào kênh chat chung nữa (Sếp Ngọc yêu cầu 20/08/2026, sợ
    // chuông thông báo bị bỏ sót) — "Hệ thống" đóng vai người gửi, hiện
    // trong kênh chung như 1 tin nhắn bình thường, ai cũng thấy ngay.
    try {
      await env.DB.prepare(`
        INSERT INTO tin_nhan_chat (nguoi_gui_id, nguoi_gui_ten, nguoi_gui_viet_tat, nguoi_nhan_id, noi_dung, tao_luc)
        VALUES ('he_thong', '🚨 Hệ thống cảnh báo', 'HT', NULL, ?, datetime('now','+7 hours'))
      `).bind(noiDung).run();
    } catch (e) { console.error('Gửi chat cảnh báo nghiêm trọng:', e.message); }
    try {
      await guiTelegram(env,
        `🚨 CẢNH BÁO NGHIÊM TRỌNG — ĐƠN HOÀN\n\n` +
        `Sàn: ${nguon}\nMã đơn hoàn: ${r.return_sn}\nĐơn gốc: ${r.order_sn || '—'}\n` +
        `Người mua: ${r.nguoi_mua || '—'}\nLý do: ${r.ly_do} (${loaiRui})\n\n` +
        `→ Kiểm tra ngay, đây là rủi ro pháp lý/uy tín (hàng giả/nhái hoặc hộp rỗng).`);
    } catch (e) { console.error('Telegram cảnh báo nghiêm trọng:', e.message); }
  }

  const phs = canhBao.map(() => '?').join(',');
  await env.DB.prepare(`UPDATE don_hoan SET da_canh_bao_nghiem_trong = 1 WHERE return_sn IN (${phs})`)
              .bind(...canhBao.map(r => r.return_sn)).run();
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
  //
  // TỰ ẨN đơn mà KHÁCH ĐÃ TỰ HUỶ YÊU CẦU HOÀN (Sếp Ngọc chốt 20/08/2026, phát
  // hiện từ rà soát: 9 đơn CANCELLED cũ vẫn hiện song song với yêu cầu hoàn
  // MỚI hơn của cùng đơn hàng, + 39 đơn CANCELLED không có nút nào xử lý đúng
  // bản chất được — "Đẩy sang Kho"/"Đẩy sang Kế toán" đều sai vì không có
  // hàng về, không có tiền hoàn). Sàn tự cập nhật trang_thai mỗi 5 phút qua
  // dongBoNen() (shopee.js/tiktok.js) nên chỉ cần LỌC ở đây là tự "biến mất"
  // theo đúng nhịp 5 phút đó, không cần thêm cron riêng.
  // CHỪA LẠI đơn CANCELLED nhưng CÓ mã vận đơn (ma_van_don) — đây là "đơn huỷ
  // có hàng vật lý về" (khách đã gửi hàng trước khi đơn bị huỷ), vẫn cần Vận
  // hành sàn đẩy xuống Kho để chạy luồng Nhập kho/Hàng hỏng — GIỐNG HỆT điều
  // kiện apiDanhSach (shopee.js) đang dùng, để 2 nơi luôn khớp nhau tuyệt đối.
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
       AND (d.trang_thai NOT LIKE '%CANCEL%' OR d.ma_van_don IS NOT NULL)
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

/* Chăm sóc khách hàng: xếp hạng khách mua hoàn/hủy nhiều nhất trong 6 tháng
   gần đây. Bảng đơn hoàn gốc (don_hoan) chỉ giữ đúng tháng làm việc hiện
   tại (bị cron donDepDuLieuNgoaiThang dọn mỗi tháng) nên KHÔNG đủ để nhìn
   6 tháng — gộp thêm bảng tổng hợp bền vững khach_hang_hoan_thang (được
   cộng dồn ngay trước mỗi lần dọn) để có đủ lịch sử (Sếp Ngọc chốt
   20/08/2026, xem donDepDuLieuNgoaiThang()). */
async function kdKhachHoanNhieu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);

  const gioNay = new Date();
  const vn = new Date(gioNay.getTime() + 7 * 3600 * 1000);
  const moc6Thang = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth() - 6, 1));
  const thang6ThangTruoc = moc6Thang.toISOString().slice(0, 7);   // 'YYYY-MM'

  const { results } = await env.DB.prepare(`
    SELECT nguoi_mua,
           GROUP_CONCAT(DISTINCT nguon) AS nguon,
           SUM(so_don) AS so_don,
           SUM(so_huy) AS so_huy,
           MAX(gan_nhat) AS gan_nhat
      FROM (
        SELECT nguoi_mua, nguon, so_don, so_huy, gan_nhat
          FROM khach_hang_hoan_thang
         WHERE thang >= ?
        UNION ALL
        SELECT nguoi_mua, nguon, 1 AS so_don,
               CASE WHEN trang_thai LIKE '%CANCEL%' THEN 1 ELSE 0 END AS so_huy,
               CAST(tao_luc_shopee AS INTEGER) AS gan_nhat
          FROM don_hoan
         WHERE nguoi_mua IS NOT NULL AND nguoi_mua != ''
      ) x
     GROUP BY nguoi_mua
     ORDER BY so_don DESC
     LIMIT 30
  `).bind(thang6ThangTruoc).all();
  return json({ khach_hang: results });
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

  // 1 câu UPDATE duy nhất cho CẢ LOẠT đơn đã tick — trước đây chạy 1 câu
  // UPDATE RIÊNG cho từng đơn trong vòng lặp (N lượt gọi D1 tuần tự), Vận
  // hành sàn tick nhiều đơn thì thấy load chậm/đơ hẳn do phải đợi lần lượt
  // từng lượt xong mới tới lượt sau (Sếp Ngọc báo 20/08/2026).
  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const phs = dsRsn.map(() => '?').join(',');
  const rBatch = await env.DB.prepare(`
    UPDATE don_hoan
       SET doi_soat_luc = datetime('now','+7 hours'), doi_soat_boi = ?,
           lan_tra_soat = lan_tra_soat + 1, dang_cho = 'kho',
           ly_do_khieu_nai = NULL, khieu_nai_luc = NULL, khieu_nai_boi = NULL
     WHERE return_sn IN (${phs}) AND kho_nhan_luc IS NULL
  `).bind(nguoi, ...dsRsn).run();
  const da = rBatch.meta.changes;
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
  // Gộp 1 câu UPDATE cho cả loạt — xem lý do ở kdDayKho() ngay trên.
  const phs2 = dsRsn.map(() => '?').join(',');
  const rBatch = await env.DB.prepare(
    `UPDATE don_hoan SET dang_cho = 'ke_toan',
            ly_do_khieu_nai = NULL, khieu_nai_luc = NULL, khieu_nai_boi = NULL
      WHERE return_sn IN (${phs2}) AND kho_nhan_luc IS NULL AND ke_toan_luc IS NULL`
  ).bind(...dsRsn).run();
  const da = rBatch.meta.changes;
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
           d.doi_soat_boi, d.tao_luc_shopee, d.kho_nhan_luc, d.tinh_trang_hang
      FROM don_hoan d
      LEFT JOIN sku_map m ON m.ten_san_pham = d.san_pham_ten
     WHERE d.dang_cho = 'ke_toan' AND d.ke_toan_luc IS NULL
     ORDER BY d.dong_bo_luc DESC
  `).all();
  return json({ can_tra_soat: results });
}

/* Kế toán bấm "Đã tra soát" -> đóng đơn về phía kế toán */
/* return_sn có thể là 1 mã (chuỗi, nút "Đã tra soát" từng dòng) hoặc 1 mảng
   (tick chọn hàng loạt rồi bấm nút gộp — Sếp Ngọc yêu cầu 20/08/2026). Gộp 1
   câu UPDATE ... IN (...) cho cả 2 trường hợp, giống kdDayKho/kdDayKeToan. */
async function ktDaTraSoat(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'ketoan')) return loi('Bạn không có quyền', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const dsRsn = Array.isArray(b.return_sn) ? b.return_sn.map(s => String(s).trim()).filter(Boolean)
              : (b.return_sn ? [String(b.return_sn).trim()] : []);
  if (!dsRsn.length) return loi('Chưa chọn đơn nào');

  const phs = dsRsn.map(() => '?').join(',');
  const r = await env.DB.prepare(
    `UPDATE don_hoan SET ke_toan_luc = datetime('now','+7 hours'), ke_toan_boi = ?
      WHERE return_sn IN (${phs}) AND ke_toan_luc IS NULL`
  ).bind(phien.ho_ten || phien.ten_dang_nhap, ...dsRsn).run();
  if (!r.meta.changes) return loi('Không tìm thấy đơn hoặc đã tra soát trước đó', 404);
  return json({ ok: true, so_don: r.meta.changes });
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

  // Gộp 1 câu UPDATE cho cả loạt — xem lý do ở kdDayKho() (trước đây chạy
  // 1 câu riêng mỗi đơn trong vòng lặp, tick nhiều đơn thì đơ máy).
  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const phs3 = dsRsn.map(() => '?').join(',');
  const rBatch = await env.DB.prepare(`
    UPDATE don_hoan SET bien_ban_luc = datetime('now','+7 hours'), bien_ban_boi = ?
     WHERE return_sn IN (${phs3}) AND phan_loai_nhan = 'hong_cho_huy' AND bien_ban_luc IS NULL
  `).bind(nguoi, ...dsRsn).run();
  return json({ ok: true, so_don: rBatch.meta.changes });
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

/* Ảnh đại diện — TỰ ai cũng đổi được ảnh CỦA CHÍNH MÌNH (khác ảnh chân dung
   hồ sơ CCCD do HCNS đón vào, dùng CHUNG 1 cột anh_chan_dung — Sếp Ngọc yêu
   cầu 20/08/2026 "để lưu dấu ấn cá nhân + hiện khi vinh danh"). Trình duyệt
   tự nén nhỏ ảnh bằng canvas trước khi gửi (xem app.js), nên máy chủ chỉ
   việc lưu base64 thẳng vào DB — theo đúng tiền lệ ảnh CCCD, không cần R2. */
const ANH_DAI_DIEN_TOI_DA = 800 * 1024;   // 800KB — ảnh đã nén ở trình duyệt nên bình thường chỉ vài chục KB

async function nsAnhDaiDien(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const raw = String(b.anh || '').replace(/^data:[^,]*,/, '');
  if (!raw) return loi('Chưa chọn ảnh');
  let doDai;
  try { doDai = atob(raw).length; } catch { return loi('Ảnh không hợp lệ'); }
  if (doDai < 50) return loi('Ảnh quá nhỏ hoặc hỏng');
  if (doDai > ANH_DAI_DIEN_TOI_DA) return loi('Ảnh vẫn còn quá lớn, thử ảnh khác nhé', 413);
  await env.DB.prepare('UPDATE nhan_su SET anh_chan_dung = ? WHERE id = ?').bind(raw, phien.nhan_su_id).run();
  return json({ ok: true });
}

/* Xem ảnh đại diện của 1 người — GET /api/nhan-su/anh?id=X (ai đăng nhập rồi
   cũng xem được ảnh của bất kỳ ai, giống tinh thần Danh bạ mở cho tất cả). */
async function nsAnhXem(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return loi('Thiếu id', 400);
  const ns = await env.DB.prepare('SELECT anh_chan_dung FROM nhan_su WHERE id = ?').bind(id).first();
  if (!ns || !ns.anh_chan_dung) return loi('Không có ảnh', 404);
  const bin = Uint8Array.from(atob(ns.anh_chan_dung), c => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
}

/* ---- Bộ định tuyến ------------------------------------------------------ */

const DUONG_DAN = {
  'POST /api/dang-nhap':     dangNhap,
  'POST /api/dang-xuat':     dangXuat,
  'GET  /api/toi-la-ai':     toiLaAi,
  'POST /api/doi-mat-khau':  doiMatKhau,
  'GET  /api/danh-ba':       layDanhBa,
  'GET  /api/nhan-su':       layNhanSu,
  'POST /api/nhan-su/anh-dai-dien': nsAnhDaiDien,
  'GET  /api/nhan-su/anh':          nsAnhXem,
  'GET  /api/chat/tin-nhan': chatDanhSach,
  'GET  /api/chat/chua-doc': chatChuaDoc,
  'GET  /api/chat/gan-day':  chatGanDay,
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
  'GET  /api/hoan/lich-su':      hoanLichSu,
  'GET  /api/hoan/sku-map':      hoanSkuMapDanhSach,
  'POST /api/hoan/sku-map':      hoanSkuMapGan,
  'POST /api/hoan/da-nhan':      hoanDaNhan,
  'POST /api/hoan/khieu-nai':    hoanKhieuNai,
  'POST /api/hoan/chua-nhan':    hoanChuaNhan,
  'POST /api/hoan/phan-loai':    hoanPhanLoai,
  'GET  /api/vinh-danh': vdDanhSach,
  'POST /api/vinh-danh': vdGui,
  'GET  /api/cong-viec/danh-sach': cvDanhSach,
  'POST /api/cong-viec/tao':       cvTao,
  'POST /api/cong-viec/cap-nhat':  cvCapNhat,
  'GET  /api/thong-bao':         layThongBao,
  'POST /api/thong-bao/da-xem':  thongBaoDaXem,
  'GET  /api/kinh-doanh/can-doi-soat': kdCanDoiSoat,
  'GET  /api/kinh-doanh/khach-hoan-nhieu': kdKhachHoanNhieu,
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
      // Lý do hoàn nghiêm trọng (nghi hàng giả/nhái, hộp hàng rỗng) — báo NGAY
      try { await kiemTraLyDoNghiemTrong(env); } catch (e) { console.error('Cron cảnh báo nghiêm trọng:', e.message); }
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
