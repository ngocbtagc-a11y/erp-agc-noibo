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
  quyenCua, duocXemTab, duocXemLuong, laAdmin, duocThemNhanSu, duocQuanLyChinhSachCa, duocTaoTaiKhoan, nhomVaiTro,
  quyenKho, quyenShopee, duocThaoTacKho, duocQuanLyKho, duocXemDonHoan, duocThaoTacVanHanh, TEN_VAI_TRO, VAI_TRO_HOP_LE
} from './quyen.js';
import { kiemTraMatKhauDat, DAI_TOI_THIEU } from './mat-khau.js';
import * as kho from './kho.js';
import * as shopee from './shopee.js';
import * as tiktok from './tiktok.js';
import * as nhansu from './nhansu.js';
import * as dulieunen from './dulieunen.js';
import * as taisan from './taisan.js';
import * as ca from './ca.js';
import { sinhMa } from './dinh-danh.js';

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
  const ns = await env.DB.prepare('SELECT (anh_chan_dung IS NOT NULL) AS co_anh, phong_ban_id, loai_lao_dong FROM nhan_su WHERE id = ?')
                         .bind(phien.nhan_su_id).first();
  const trangThai = await docTrangThaiHienDien(env, phien.nhan_su_id);
  // Phòng ban mà mình là trưởng phòng (Xếp ca tuần + các quyền theo phòng
  // ban khác dùng chung field này) — KHÔNG suy từ vai trò, đọc thẳng DB vì
  // đây là quan hệ theo TỪNG phòng ban cụ thể (xem src/ca.js laTruongPhong).
  const { results: phongBanQuanLy } = await env.DB.prepare(
    'SELECT id, ten FROM phong_ban WHERE truong_phong_id = ? AND hoat_dong = 1'
  ).bind(phien.nhan_su_id).all();

  return json({
    id: phien.nhan_su_id,
    ten: phien.ho_ten,
    viet_tat: phien.viet_tat,
    chuc_vu: phien.chuc_vu || TEN_VAI_TRO[phien.vai_tro] || '',
    vai_tro: phien.vai_tro,
    phai_doi_mk: !!phien.phai_doi_mk,
    co_anh: !!ns?.co_anh,
    phong_ban_id: ns ? ns.phong_ban_id : null,
    loai_lao_dong: ns ? ns.loai_lao_dong : null,
    trang_thai_hd: trangThai.ma,
    trang_thai_ghi_chu: trangThai.ghi_chu,
    phong_ban_quan_ly: phongBanQuanLy,
    quyen: q.tab,
    xem_luong: q.xem_luong,
    la_admin: laAdmin(phien.vai_tro),
    them_nhan_su: duocThemNhanSu(phien.vai_tro),
    quan_ly_chinh_sach_ca: duocQuanLyChinhSachCa(phien.vai_tro),
    duoc_tao_tai_khoan: duocTaoTaiKhoan(phien.vai_tro),
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
  // Ẩn tài khoản vai trò "nv_test" (test/Shopee reviewer) khỏi danh bạ —
  // đây là tài khoản bấm thử, không phải nhân sự thật, không để lẫn vào
  // danh sách chọn người (Chat, Người nhận/Người phối hợp ở Trạm Việc...).
  const { results } = await env.DB.prepare(`
    SELECT n.id, n.ma_nv, n.ho_ten, n.viet_tat, n.chuc_vu, n.bo_phan, n.sdt, n.email,
           (n.anh_chan_dung IS NOT NULL) AS co_anh,
           q.ho_ten AS quan_ly,
           tt.ma_trang_thai, tt.ghi_chu AS trang_thai_ghi_chu, tt.het_han_luc
      FROM nhan_su n
      LEFT JOIN nhan_su q ON q.id = n.quan_ly_id
      LEFT JOIN tai_khoan t ON t.nhan_su_id = n.id
      LEFT JOIN nhan_su_trang_thai tt ON tt.nhan_su_id = n.id
     WHERE n.dang_lam = 1 AND (t.vai_tro IS NULL OR t.vai_tro != 'nv_test')
     ORDER BY n.bo_phan, n.ho_ten
  `).all();

  // Hết hạn thì coi như 'available', không lộ ghi chú cũ (Rule 22 — không
  // render dữ liệu đã hết hiệu lực). Tính khi đọc, không cần cron dọn nền.
  // het_han_luc lưu giờ UTC thật (giống phien.het_han), KHÔNG dùng hack
  // +7 giờ (hack đó chỉ dành cho log hiển thị "x phút trước", không phải
  // mốc so sánh nội bộ).
  for (const r of results) {
    const hetHan = r.het_han_luc && new Date(r.het_han_luc) < new Date();
    r.trang_thai_hd = (!r.ma_trang_thai || hetHan) ? 'available' : r.ma_trang_thai;
    r.trang_thai_ghi_chu = hetHan ? null : r.trang_thai_ghi_chu;
    delete r.ma_trang_thai; delete r.het_han_luc;
  }

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
    ? `SELECT id, ma_nv, ho_ten, viet_tat, chuc_vu, bo_phan, trang_thai,
              ngay_vao, luong, (anh_chan_dung IS NOT NULL) AS co_anh
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`
    : `SELECT id, ma_nv, ho_ten, viet_tat, chuc_vu, bo_phan, trang_thai,
              ngay_vao, (anh_chan_dung IS NOT NULL) AS co_anh
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`;

  const { results } = await env.DB.prepare(cauLenh).all();

  return json({ nhan_su: results, xem_luong: xemLuong });
}

/* Lịch sử thay đổi vị trí/phòng ban/quản lý/trạng thái của 1 nhân sự — dùng
   cho tab "Hồ sơ & Công việc" trong Employee Profile (CORE_CHANGE Phase 1,
   25/08/2026). Cùng quyền xem với danh sách Nhân sự — không mở thêm bề mặt
   quyền mới. Tự thêm tên người thực hiện qua JOIN, khỏi phải tra riêng. */
async function nsLichSu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'nhansu')) return loi('Không có quyền', 403);

  const u = new URL(req.url);
  const nhanSuId = String(u.searchParams.get('id') || '').trim();
  if (!nhanSuId) return loi('Thiếu id nhân sự');

  try {
    const { results } = await env.DB.prepare(`
      SELECT h.id, h.loai_su_kien, h.gia_tri_cu, h.gia_tri_moi, h.ghi_chu, h.luc,
             n.ho_ten AS nguoi_thuc_hien_ten
        FROM nhan_su_lich_su h
        LEFT JOIN nhan_su n ON n.id = h.nguoi_thuc_hien_id
       WHERE h.nhan_su_id = ?
       ORDER BY h.luc DESC, h.id DESC
       LIMIT 200
    `).bind(nhanSuId).all();
    return json({ lich_su: results || [] });
  } catch {
    return json({ lich_su: [] });   // chưa nạp migration them-nhansu-lichsu.sql
  }
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

  // Đếm chưa đọc theo mốc ĐÃ ĐỌC lưu ở MÁY CHỦ (chat_xem_id) — không phụ thuộc
  // trình duyệt, nên tải lại trang không làm tin cũ thành "chưa đọc" nữa.
  const { results } = await env.DB.prepare(`
    SELECT COUNT(*) AS so_luong, MAX(id) AS id_lon_nhat
    FROM tin_nhan_chat
    WHERE (nguoi_nhan_id IS NULL OR nguoi_nhan_id = ?)
      AND nguoi_gui_id != ?
      AND id > (SELECT COALESCE(chat_xem_id, 0) FROM tai_khoan WHERE id = ?)
  `).bind(phien.nhan_su_id, phien.nhan_su_id, phien.tai_khoan_id).all();
  const r = (results && results[0]) || {};
  return json({ so_luong: r.so_luong || 0, id_lon_nhat: r.id_lon_nhat || 0 });
}

/* Đánh dấu ĐÃ ĐỌC chat tới tin mới nhất (gọi khi mở popup chat) */
async function chatDaDoc(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  await env.DB.prepare(
    `UPDATE tai_khoan SET chat_xem_id = (SELECT COALESCE(MAX(id), 0) FROM tin_nhan_chat) WHERE id = ?`
  ).bind(phien.tai_khoan_id).run();
  return json({ ok: true });
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
    /* Duyệt THEO LÔ, không trải cả mảng vào tham số hàm.
       Cách cũ `String.fromCharCode(...new Uint8Array(buf))` biến MỖI BYTE thành
       một tham số hàm — ảnh 300KB = 307.200 tham số → tràn ngăn xếp
       (`RangeError: Maximum call stack size exceeded`). Đo được ngưỡng gãy nằm
       trong khoảng 100–200KB, mà ảnh chụp màn hình sau khi nén là 200–800KB,
       tức là ĐA SỐ ảnh dán vào chat sẽ báo "Không gửi được" (REV-0006 lỗi #1).
       Lô 0x8000 = 32.768 tham số/lần gọi, an toàn trên mọi engine V8. */
    const u8 = new Uint8Array(buf);
    let chuoi = '';
    for (let i = 0; i < u8.length; i += 0x8000) {
      chuoi += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    }
    tepB64 = btoa(chuoi);
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
   QUẢN TRỊ — chỉ admin (Admin)
   ---------------------------------------------------------------------------
   Mọi đầu việc dưới đây đều kiểm tra laAdmin() ở máy chủ. Người không phải
   admin gọi thẳng vào cũng nhận 403 — không phải chỉ ẩn nút trên giao diện.
   ========================================================================== */

async function batBuocAdmin(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!laAdmin(phien.vai_tro)) return { loi: loi('Chỉ Admin mới được cấp/khoá tài khoản', 403) };
  return { phien };
}

/* Được TẠO tài khoản — Admin hoặc người "backup" (hiện là HCNS). Rộng hơn
   batBuocAdmin ở trên nhưng CHỈ dùng cho việc tạo mới; các việc admin khác
   (đặt lại MK/khoá/xoá/đổi vai trò) vẫn phải batBuocAdmin như cũ. */
async function batBuocTaoTaiKhoan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!duocTaoTaiKhoan(phien.vai_tro)) return { loi: loi('Bạn không có quyền tạo tài khoản', 403) };
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
    SELECT n.id, n.ma_nv, n.ho_ten, n.viet_tat, n.chuc_vu, n.bo_phan, n.phong_ban_id, n.chuc_danh_id,
           n.sdt, n.email, n.quan_ly_id, n.trang_thai_dl, n.loai_lao_dong,
           n.phap_nhan, n.trang_thai, n.dang_lam, (n.anh_chan_dung IS NOT NULL) AS co_anh,
           t.id AS tai_khoan_id, t.ten_dang_nhap, t.vai_tro, t.kich_hoat, t.phai_doi_mk
      FROM nhan_su n
      LEFT JOIN tai_khoan t ON t.nhan_su_id = n.id
     ORDER BY n.dang_lam DESC, n.bo_phan, n.ho_ten
  `).all();

  return json({
    nhan_su: results,
    vai_tro: VAI_TRO_HOP_LE.map(v => ({ ma: v, ten: TEN_VAI_TRO[v], nhom: nhomVaiTro(v) }))
  });
}

/* Phòng ban/Chức danh: nếu body gửi *_id (chọn từ danh mục chuẩn Dữ liệu
   nền) thì lấy TÊN thật ghi vào cột chữ cũ (bo_phan/chuc_vu) để màn hình cũ
   đọc cột chữ vẫn hiển thị đúng. Id không hợp lệ/đã ẩn thì âm thầm bỏ qua. */
async function phongBanTuId(env, id) {
  if (!id) return null;
  return env.DB.prepare('SELECT id, ten FROM phong_ban WHERE id = ? AND hoat_dong = 1').bind(id).first();
}
async function chucDanhTuId(env, id) {
  if (!id) return null;
  return env.DB.prepare('SELECT id, ten FROM chuc_danh WHERE id = ? AND hoat_dong = 1').bind(id).first();
}

const LOAI_LAO_DONG_HOP_LE = ['toan_thoi_gian', 'ban_thoi_gian', 'thoi_vu'];
function loaiLaoDongTuBody(b) {
  return LOAI_LAO_DONG_HOP_LE.includes(b.loai_lao_dong) ? b.loai_lao_dong : 'toan_thoi_gian';
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
  // Mã nhân sự (Business Code) — sinh 1 lần, không đổi, không tái sử dụng
  // (xem docs/ENTITY_IDENTITY.md). Tên có thể trùng/đổi, mã thì không. Tiền
  // tố theo Loại lao động LÚC TẠO (01=Toàn TG/02=Part-time/03=Thời vụ) —
  // đổi Loại lao động sau đó KHÔNG đổi lại mã đã cấp.
  const maNv = await sinhMa(env, 'nhan_su_' + loaiLaoDongTuBody(b));

  // RANH GIỚI LƯƠNG: chỉ admin mới được đặt lương. HCNS gửi lương lên cũng
  // bị bỏ qua ở đây — máy chủ ép NULL, không tin giao diện.
  const luong = laAdmin(phien.vai_tro)
    ? ((b.luong === '' || b.luong == null) ? null : parseInt(String(b.luong).replace(/\D/g, ''), 10) || null)
    : null;

  const pb = await phongBanTuId(env, b.phong_ban_id ? parseInt(b.phong_ban_id, 10) : null);
  const cd = await chucDanhTuId(env, b.chuc_danh_id ? parseInt(b.chuc_danh_id, 10) : null);

  // phap_nhan luôn là 'Công ty' — công ty đang đóng HKD, không còn phân biệt.
  await env.DB.prepare(`
    INSERT INTO nhan_su (id, ma_nv, ho_ten, viet_tat, chuc_vu, bo_phan, phong_ban_id, chuc_danh_id,
                         sdt, email, quan_ly_id, phap_nhan, trang_thai, ngay_vao, luong, loai_lao_dong)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Công ty', ?, ?, ?, ?)
  `).bind(
    id, maNv, hoTen, vietTatTen(hoTen),
    cd ? cd.ten : String(b.chuc_vu || '').trim(),
    pb ? pb.ten : String(b.bo_phan || '').trim(),
    pb ? pb.id : null,
    cd ? cd.id : null,
    String(b.sdt || '').trim() || null,
    String(b.email || '').trim() || null,
    String(b.quan_ly_id || '').trim() || null,
    String(b.trang_thai || 'da_ky').trim(),
    String(b.ngay_vao || '').trim() || null,
    luong,
    loaiLaoDongTuBody(b)
  ).run();

  try {
    await env.DB.prepare(`
      INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_moi, nguoi_thuc_hien_id, luc)
      VALUES (?, 'vao_lam', ?, ?, datetime('now','+7 hours'))
    `).bind(id, cd ? cd.ten : String(b.chuc_vu || '').trim(), phien.nhan_su_id).run();
  } catch { /* chưa nạp migration them-nhansu-lichsu.sql — bỏ qua êm */ }

  return json({ ok: true, id, ma_nv: maNv });
}

/* Sửa hồ sơ nhân sự đã có (Admin/HCNS) — trước đây CHƯA có, chỉ thêm mới
   được. Cùng ranh giới lương như Thêm: HCNS gửi lương lên cũng bị bỏ qua. */
async function qtSuaNhanSu(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const id = String(b.id || '').trim();
  if (!id) return loi('Thiếu id nhân sự');

  const hienCo = await env.DB.prepare('SELECT id, ho_ten, chuc_vu, bo_phan, phong_ban_id, chuc_danh_id, quan_ly_id, trang_thai, trang_thai_dl, ma_nv FROM nhan_su WHERE id = ?').bind(id).first();
  if (!hienCo) return loi('Không tìm thấy nhân sự', 404);

  // Đã khoá thì chỉ Admin sửa được (Data Lock — xem migration them-khoa-danhmuc-nen.sql)
  if (hienCo.trang_thai_dl === 'da_khoa' && !laAdmin(phien.vai_tro)) {
    return loi('Hồ sơ này đã khoá — cần Admin sửa hoặc mở khoá lại', 403);
  }

  const hoTen = String(b.ho_ten || '').trim();
  if (hoTen.length < 2) return loi('Vui lòng nhập họ tên');

  const pb = await phongBanTuId(env, b.phong_ban_id ? parseInt(b.phong_ban_id, 10) : null);
  const cd = await chucDanhTuId(env, b.chuc_danh_id ? parseInt(b.chuc_danh_id, 10) : null);
  const chucVuMoi = cd ? cd.ten : String(b.chuc_vu || '').trim();
  const boPhanMoi = pb ? pb.ten : String(b.bo_phan || '').trim();

  const coCapNhatLuong = laAdmin(phien.vai_tro) && b.luong !== undefined;
  const luong = coCapNhatLuong
    ? ((b.luong === '' || b.luong == null) ? null : parseInt(String(b.luong).replace(/\D/g, ''), 10) || null)
    : null;

  // Mã nhân sự BÌNH THƯỜNG là bất biến (xem docs/ENTITY_IDENTITY.md) — chỉ
  // Admin mới sửa lại được, dùng cho trường hợp cấp nhầm (VD chọn nhầm Loại
  // lao động lúc tạo nên sai tiền tố). Luôn ghi lịch sử vì đây là hành động
  // hiếm, nhạy cảm — không chờ hồ sơ đã khoá mới ghi như các trường khác.
  const coCapNhatMaNv = laAdmin(phien.vai_tro) && b.ma_nv !== undefined && String(b.ma_nv).trim() && String(b.ma_nv).trim() !== hienCo.ma_nv;
  const maNvMoi = coCapNhatMaNv ? String(b.ma_nv).trim() : null;

  try {
    await env.DB.prepare(`
      UPDATE nhan_su SET ho_ten = ?, viet_tat = ?, chuc_vu = ?, bo_phan = ?,
             phong_ban_id = ?, chuc_danh_id = ?, sdt = ?, email = ?, quan_ly_id = ?,
             trang_thai = ?, ngay_vao = ?, loai_lao_dong = ?${coCapNhatLuong ? ', luong = ?' : ''}${coCapNhatMaNv ? ', ma_nv = ?' : ''}
       WHERE id = ?
    `).bind(
      ...[
        hoTen, vietTatTen(hoTen),
        chucVuMoi, boPhanMoi,
        pb ? pb.id : null,
        cd ? cd.id : null,
        String(b.sdt || '').trim() || null,
        String(b.email || '').trim() || null,
        String(b.quan_ly_id || '').trim() || null,
        String(b.trang_thai || 'da_ky').trim(),
        String(b.ngay_vao || '').trim() || null,
        loaiLaoDongTuBody(b),
        ...(coCapNhatLuong ? [luong] : []),
        ...(coCapNhatMaNv ? [maNvMoi] : []),
        id
      ]
    ).run();
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) return loi(`Mã nhân sự "${maNvMoi}" đã có người dùng`, 409);
    throw e;
  }

  if (hienCo.trang_thai_dl === 'da_khoa') {
    await dulieunen.ghiLichSuThayDoi(env, phien, 'nhan_su', id, {
      ho_ten: [hienCo.ho_ten, hoTen],
      chuc_vu: [hienCo.chuc_vu, chucVuMoi],
      bo_phan: [hienCo.bo_phan, boPhanMoi]
    });
  }
  if (coCapNhatMaNv) {
    await dulieunen.ghiLichSuThayDoi(env, phien, 'nhan_su', id, { ma_nv: [hienCo.ma_nv, maNvMoi] });
  }

  // Lịch sử thay đổi nhân sự (Employee Profile Phase 1) — ghi vào bảng sự
  // kiện RIÊNG (nhan_su_lich_su), LUÔN LUÔN chứ không chỉ khi hồ sơ đã khoá
  // (khác cơ chế Data Lock ở trên vốn chỉ log sau khi khoá) — đóng đúng
  // khoảng trống "chưa có audit trail vị trí/phòng ban/quản lý" đã ghi trong
  // báo cáo CORE_CHANGE 25/08/2026. Chỉ ghi khi THẬT SỰ đổi, không ghi khống.
  const suKien = [];
  const quanLyMoi = String(b.quan_ly_id || '').trim() || null;
  const trangThaiMoi = String(b.trang_thai || 'da_ky').trim();
  const phongBanIdMoi = pb ? pb.id : null;
  const chucDanhIdMoi = cd ? cd.id : null;
  if (phongBanIdMoi !== hienCo.phong_ban_id) suKien.push(['doi_phong_ban', hienCo.bo_phan, boPhanMoi]);
  if (chucDanhIdMoi !== hienCo.chuc_danh_id) suKien.push(['doi_chuc_danh', hienCo.chuc_vu, chucVuMoi]);
  if (quanLyMoi !== hienCo.quan_ly_id) {
    // Ghi TÊN quản lý, không ghi thẳng id — id không đọc được trên màn hình
    // lịch sử (khác các sự kiện khác vốn đã có tên qua chuc_vu/bo_phan/
    // trang_thai sẵn có).
    const [qlCu, qlMoi] = await Promise.all([
      hienCo.quan_ly_id ? env.DB.prepare('SELECT ho_ten FROM nhan_su WHERE id = ?').bind(hienCo.quan_ly_id).first() : null,
      quanLyMoi ? env.DB.prepare('SELECT ho_ten FROM nhan_su WHERE id = ?').bind(quanLyMoi).first() : null
    ]);
    suKien.push(['doi_quan_ly', qlCu ? qlCu.ho_ten : null, qlMoi ? qlMoi.ho_ten : null]);
  }
  if (trangThaiMoi !== hienCo.trang_thai) suKien.push(['doi_trang_thai', hienCo.trang_thai, trangThaiMoi]);
  if (suKien.length) {
    const nguoiThucHien = phien.nhan_su_id;
    // Bọc try/catch — nếu máy chủ CHƯA nạp migration them-nhansu-lichsu.sql
    // thì bỏ qua êm, không chặn việc SỬA hồ sơ (việc chính, quan trọng hơn
    // ghi log), cùng nếp schema-detection graceful degrade đã dùng khắp nơi.
    try {
      await env.DB.batch(suKien.map(([loai, cu, moi]) => env.DB.prepare(`
        INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien_id, luc)
        VALUES (?, ?, ?, ?, ?, datetime('now','+7 hours'))
      `).bind(id, loai, cu, moi, nguoiThucHien)));
    } catch { /* chưa nạp migration — bỏ qua, không chặn sửa hồ sơ */ }
  }

  return json({ ok: true });
}

/* Xoá HẲN hồ sơ nhân sự — chỉ Admin, chỉ khi chưa có dữ liệu nghiệp vụ nào
   gắn vào (đơn hàng, tài sản, chấm công, MBO...). Dùng để dọn hồ sơ tạo
   nhầm/test, KHÔNG dùng để xử lý nhân sự nghỉ việc thật (dùng "Hoàn tất"
   để khoá + giữ lịch sử — đúng nguyên tắc không xoá Entity đã có dữ liệu). */
async function qtXoaNhanSu(req, env) {
  const { phien, loi: l } = await batBuocAdmin(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const id = String(b.id || '').trim();
  if (!id) return loi('Thiếu id nhân sự');
  if (id === phien.nhan_su_id) return loi('Không thể tự xoá hồ sơ của chính mình');

  const ns = await env.DB.prepare('SELECT id FROM nhan_su WHERE id = ?').bind(id).first();
  if (!ns) return loi('Không tìm thấy nhân sự', 404);

  try {
    await env.DB.prepare('DELETE FROM tai_khoan WHERE nhan_su_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM nhan_su WHERE id = ?').bind(id).run();
  } catch (e) {
    if (String(e.message || '').includes('FOREIGN KEY')) {
      return loi('Không xoá được — nhân sự này đã có dữ liệu gắn vào (đơn hàng, tài sản, chấm công, mục tiêu...). Dùng nút "Hoàn tất" để khoá thay vì xoá.', 409);
    }
    throw e;
  }
  return json({ ok: true });
}

/* Khoá (HCNS/Admin bấm "Xác nhận & khoá") / Mở khoá (chỉ Admin). */
async function qtKhoaNhanSu(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const id = String(b.id || '').trim();
  if (!id) return loi('Thiếu id nhân sự');
  const muon = b.trang_thai_dl === 'da_khoa' ? 'da_khoa' : 'nhap';
  if (muon === 'nhap' && !laAdmin(phien.vai_tro)) {
    return loi('Chỉ Admin mới mở khoá lại được', 403);
  }

  await env.DB.prepare('UPDATE nhan_su SET trang_thai_dl = ? WHERE id = ?').bind(muon, id).run();
  return json({ ok: true });
}

/* Tạo tài khoản đăng nhập cho một nhân sự → trả mật khẩu tạm MỘT LẦN.
   Admin hoặc người "backup" (HCNS) — nhưng backup KHÔNG được tự tạo tài
   khoản Admin (chặn tự nâng quyền), chỉ tạo được vai trò nghiệp vụ thường. */
async function qtTaoTaiKhoan(req, env) {
  const { phien, loi: l } = await batBuocTaoTaiKhoan(req, env);
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
  if (!laAdmin(phien.vai_tro) && (vaiTro === 'admin' || vaiTro === 'admin_backup')) {
    return loi('Bạn không có quyền tạo tài khoản Admin/Admin backup — cần Admin thật', 403);
  }

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

/* Đổi vai trò (phân quyền lại) một tài khoản đã có — trước đây chỉ chọn
   được LÚC tạo tài khoản, không sửa lại được sau. Chặn hạ vai trò Admin
   cuối cùng còn hoạt động xuống vai trò thường (giữ nguyên logic chặn ở
   qtXoaTaiKhoan — tránh hệ thống mất hết người quản trị). */
async function qtSuaVaiTro(req, env) {
  const { phien, loi: l } = await batBuocTaoTaiKhoan(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const tkId = parseInt(b.tai_khoan_id, 10);
  const vaiTroMoi = String(b.vai_tro || '').trim();
  if (!tkId) return loi('Thiếu tài khoản');
  if (!VAI_TRO_HOP_LE.includes(vaiTroMoi)) return loi('Vai trò không hợp lệ');

  // Admin backup KHÔNG được tự gán vai trò Admin/Admin backup cho ai (kể cả
  // chính mình) — tránh tự nâng quyền. Chỉ Admin thật mới gán được vai trò
  // hệ thống cấp cao.
  if (!laAdmin(phien.vai_tro) && (vaiTroMoi === 'admin' || vaiTroMoi === 'admin_backup')) {
    return loi('Bạn không có quyền gán vai trò Admin/Admin backup — cần Admin thật', 403);
  }

  const tk = await env.DB.prepare('SELECT id, vai_tro FROM tai_khoan WHERE id = ?').bind(tkId).first();
  if (!tk) return loi('Không tìm thấy tài khoản', 404);

  if (laAdmin(tk.vai_tro) && !laAdmin(vaiTroMoi)) {
    const { results } = await env.DB.prepare('SELECT vai_tro FROM tai_khoan WHERE kich_hoat = 1 AND id != ?').bind(tkId).all();
    if (!results.some(x => laAdmin(x.vai_tro))) {
      return loi('Không thể đổi — đây là tài khoản Admin cuối cùng còn hoạt động', 409);
    }
  }

  await env.DB.prepare('UPDATE tai_khoan SET vai_tro = ? WHERE id = ?').bind(vaiTroMoi, tkId).run();
  return json({ ok: true });
}

/* Xoá HẲN tài khoản đăng nhập (khác "Khoá" — Khoá chỉ chặn đăng nhập, giữ
   nguyên lịch sử; Xoá dùng khi tạo nhầm và cần cấp lại tài khoản đúng cho
   đúng nhân sự đó — "Nhân sự này đã có tài khoản rồi" sẽ chặn tạo lại nếu
   không xoá cái cũ trước). KHÔNG đụng tới hồ sơ nhân_su — chỉ xoá phần
   đăng nhập. Chặn tự xoá chính mình và chặn xoá Admin cuối cùng còn hoạt
   động, tránh hệ thống mất hết người quản trị được. */
async function qtXoaTaiKhoan(req, env) {
  const { phien, loi: l } = await batBuocAdmin(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const tkId = parseInt(b.tai_khoan_id, 10);
  if (!tkId) return loi('Thiếu tài khoản');

  if (tkId === phien.tai_khoan_id) {
    return loi('Không thể tự xoá tài khoản đang đăng nhập');
  }

  const tk = await env.DB.prepare('SELECT id, vai_tro FROM tai_khoan WHERE id = ?').bind(tkId).first();
  if (!tk) return loi('Không tìm thấy tài khoản', 404);

  if (laAdmin(tk.vai_tro)) {
    const { results } = await env.DB.prepare('SELECT vai_tro FROM tai_khoan WHERE kich_hoat = 1 AND id != ?').bind(tkId).all();
    if (!results.some(x => laAdmin(x.vai_tro))) {
      return loi('Không thể xoá — đây là tài khoản Admin cuối cùng còn hoạt động', 409);
    }
  }

  await env.DB.prepare('DELETE FROM tai_khoan WHERE id = ?').bind(tkId).run();
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

/* Sản phẩm/SKU giờ có 2 chủ: Kho vận (sửa ngày thường) VÀ Kinh doanh (chủ
   sở hữu, khoá/duyệt) — nên danh sách + thêm/sửa/ẩn-hiện/khoá phải mở cho
   CẢ 2 tab, khác với batBuocXemKho (chỉ Kho vận) vốn còn dùng cho Nhập/
   Xuất/Báo cáo/Lịch sử — những việc CHỈ Kho vận mới cần. Quyền chi tiết
   (ai thực sự sửa/khoá được) vẫn kiểm ở kho.js qua duocSuaSanPham/
   duocKhoaSanPham — đây chỉ là cửa vào theo TAB. */
async function batBuocXemSanPham(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!duocXemTab(phien.vai_tro, 'khovan') && !duocXemTab(phien.vai_tro, 'kinhdoanh')) {
    return { loi: loi('Bạn không có quyền xem Sản phẩm/SKU', 403) };
  }
  return { phien };
}

async function khoDanhSachSP(req, env) {
  const { phien, loi: l } = await batBuocXemSanPham(req, env);
  if (l) return l;
  return kho.danhSachSanPham(env, phien);
}

async function khoThemSP(req, env) {
  const { phien, loi: l } = await batBuocXemSanPham(req, env);
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

async function khoSuaSP(req, env) {
  const { phien, loi: l } = await batBuocXemSanPham(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return kho.suaSanPham(env, phien, b);
}

async function khoAnHienSP(req, env) {
  const { phien, loi: l } = await batBuocXemSanPham(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return kho.anHienSanPham(env, phien, b);
}

async function khoKhoaSP(req, env) {
  const { phien, loi: l } = await batBuocXemSanPham(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return kho.khoaSanPham(env, phien, b);
}

/* ==========================================================================
   DỮ LIỆU NỀN — Phòng ban / Chức danh / Đơn vị tính + tình trạng sẵn sàng.
   Nghiệp vụ nằm trong src/dulieunen.js. Ai có tab 'dulieunen' đều XEM được
   (danh sách + tình trạng); THÊM/SỬA thì dulieunen.js tự kiểm quyền chi
   tiết theo đúng chủ sở hữu từng nhóm (HCNS cho Tổ chức, Quản lý kho cho
   Đơn vị tính) — giống cách kho.js chặn kép.
   ========================================================================== */

async function batBuocXemDuLieuNen(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!duocXemTab(phien.vai_tro, 'dulieunen')) return { loi: loi('Bạn không có quyền xem Dữ liệu nền', 403) };
  return { phien };
}

async function dlnDanhSachPhongBan(req, env) {
  const { loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  return dulieunen.danhSachPhongBan(env);
}
async function dlnThemPhongBan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.themPhongBan(env, phien, b);
}
async function dlnSuaPhongBan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.suaPhongBan(env, phien, b);
}
async function dlnKhoaPhongBan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.khoaPhongBan(env, phien, b);
}
async function dlnGanTruongPhong(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.ganTruongPhong(env, phien, b);
}

async function dlnDanhSachChucDanh(req, env) {
  const { loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  return dulieunen.danhSachChucDanh(env);
}
async function dlnThemChucDanh(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.themChucDanh(env, phien, b);
}
async function dlnSuaChucDanh(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.suaChucDanh(env, phien, b);
}
async function dlnKhoaChucDanh(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.khoaChucDanh(env, phien, b);
}

async function dlnDanhSachDanhMucTaiSan(req, env) {
  const { loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  return dulieunen.danhSachDanhMucTaiSan(env);
}
async function dlnThemDanhMucTaiSan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.themDanhMucTaiSan(env, phien, b);
}
async function dlnSuaDanhMucTaiSan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.suaDanhMucTaiSan(env, phien, b);
}
async function dlnKhoaDanhMucTaiSan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.khoaDanhMucTaiSan(env, phien, b);
}

async function dlnDanhSachViTriTaiSan(req, env) {
  const { loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  return dulieunen.danhSachViTriTaiSan(env);
}
async function dlnThemViTriTaiSan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.themViTriTaiSan(env, phien, b);
}
async function dlnSuaViTriTaiSan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.suaViTriTaiSan(env, phien, b);
}
async function dlnKhoaViTriTaiSan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.khoaViTriTaiSan(env, phien, b);
}

async function dlnDanhSachDonVi(req, env) {
  const { loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  return dulieunen.danhSachDonVi(env);
}
async function dlnThemDonVi(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.themDonVi(env, phien, b);
}
async function dlnSuaDonVi(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.suaDonVi(env, phien, b);
}
async function dlnKhoaDonVi(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.khoaDonVi(env, phien, b);
}

async function dlnTinhTrang(req, env) {
  const { loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  return dulieunen.tinhTrangSanSang(env);
}

async function dlnDanhSachNCC(req, env) {
  const { loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  return dulieunen.danhSachNhaCungCap(env);
}
async function dlnThemNCC(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.themNhaCungCap(env, phien, b);
}
async function dlnSuaNCC(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.suaNhaCungCap(env, phien, b);
}
async function dlnKhoaNCC(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.khoaNhaCungCap(env, phien, b);
}

async function dlnDanhSachKho(req, env) {
  const { loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  return dulieunen.danhSachKho(env);
}
async function dlnThemKho(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.themKho(env, phien, b);
}
async function dlnSuaKho(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return dulieunen.suaKho(env, phien, b);
}

/* ==========================================================================
   TÀI SẢN — Asset Management (xem docs/ENTITY_IDENTITY.md)
   ---------------------------------------------------------------------------
   Nghiệp vụ nằm trong src/taisan.js. XEM (danh sách + lịch sử) cho mọi
   người có tab 'taisan' (mọi vai trò); THÊM/CẤP PHÁT/THU HỒI/THANH LÝ thì
   taisan.js tự kiểm duocQuanLyTaiSan — giống cách kho.js chặn kép.
   ========================================================================== */

async function batBuocXemTaiSan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!duocXemTab(phien.vai_tro, 'taisan')) return { loi: loi('Bạn không có quyền xem Tài sản', 403) };
  return { phien };
}

async function tsDanhSach(req, env) {
  const { phien, loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  return taisan.danhSachTaiSan(env, phien);
}
async function tsLichSu(req, env) {
  const { loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  const url = new URL(req.url);
  return taisan.lichSuTaiSan(env, url.searchParams.get('id'));
}
async function tsChiTiet(req, env) {
  const { loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  const url = new URL(req.url);
  return taisan.chiTietTaiSan(env, url.searchParams.get('id'));
}
async function tsTraCuu(req, env) {
  const { loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  const url = new URL(req.url);
  return taisan.traCuuTheoMa(env, url.searchParams.get('ma'));
}
async function tsThem(req, env) {
  const { phien, loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return taisan.themTaiSan(env, phien, b);
}
async function tsSua(req, env) {
  const { phien, loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return taisan.suaTaiSan(env, phien, b);
}
async function tsCapPhat(req, env) {
  const { phien, loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return taisan.capPhatTaiSan(env, phien, b);
}
async function tsThuHoi(req, env) {
  const { phien, loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return taisan.thuHoiTaiSan(env, phien, b);
}
async function tsBaoHong(req, env) {
  const { phien, loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return taisan.baoHongTaiSan(env, phien, b);
}
async function tsBaoTriXong(req, env) {
  const { phien, loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return taisan.baoTriXongTaiSan(env, phien, b);
}
async function tsThanhLy(req, env) {
  const { phien, loi: l } = await batBuocXemTaiSan(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return taisan.thanhLyTaiSan(env, phien, b);
}

/* ==========================================================================
   ĐĂNG KÝ CA / XẾP CA — Part-time & Thời vụ (xem docs/ENTITY_IDENTITY.md)
   ---------------------------------------------------------------------------
   Nghiệp vụ nằm trong src/ca.js. XEM tab 'xepca' mở cho MỌI vai trò —
   ca.js tự kiểm chi tiết theo loai_lao_dong (nhân viên) hoặc
   phong_ban.truong_phong_id (trưởng phòng), không dựa vào vai trò chung.
   ========================================================================== */

async function batBuocXemXepCa(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return { loi: l };
  if (!duocXemTab(phien.vai_tro, 'xepca')) return { loi: loi('Bạn không có quyền xem Xếp ca', 403) };
  return { phien };
}

async function caDanhSachMauCa(req, env) {
  const { loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  return ca.danhSachMauCa(env);
}
async function caThemMauCa(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.themMauCa(env, phien, b);
}
async function caSuaMauCa(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.suaMauCa(env, phien, b);
}
async function caXoaMauCa(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.xoaMauCa(env, phien, b);
}
async function caThemCaMo(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.themCaMo(env, phien, b);
}
async function caMoDangKyTuan(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.moDangKyTuan(env, phien, b);
}
async function caKhoaCaMo(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.khoaCaMo(env, phien, b);
}
async function caDangMoXem(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  return ca.caDangMo(env, phien);
}
async function caDangKy(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.dangKyCa(env, phien, b);
}
async function caHuyDangKy(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.huyDangKyCa(env, phien, b);
}
async function caLichCuaToi(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  const url = new URL(req.url);
  const tu = url.searchParams.get('tu') || '0000-01-01';
  const den = url.searchParams.get('den') || '9999-12-31';
  return ca.lichCuaToi(env, phien, tu, den);
}
async function caMaTranTuan(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  const url = new URL(req.url);
  const phongBanId = parseInt(url.searchParams.get('phong_ban_id'), 10);
  const tu = url.searchParams.get('tu'), den = url.searchParams.get('den');
  if (!phongBanId || !tu || !den) return loi('Thiếu phong_ban_id/tu/den');
  return ca.maTranTuan(env, phien, phongBanId, tu, den);
}
async function caXepTuDong(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.chayPhanBo(env, phien, b);
}
async function caDuyet(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.duyetDangKy(env, phien, b);
}
async function caDuyetHangLoat(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.duyetHangLoat(env, phien, b);
}
async function caTuChoi(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.tuChoiDangKy(env, phien, b);
}
async function caGanThuCong(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.ganCaThuCong(env, phien, b);
}
async function caChotLichTuan(req, env) {
  const { phien, loi: l } = await batBuocXemXepCa(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return ca.chotLichTuan(env, phien, b);
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
  if (laAdmin(vaiTro)) return ['kho', 'van_hanh', 'ke_toan'];
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

/* Đơn hàng (doanh thu) — KHÔNG xoá dòng như đơn hoàn (đây là dữ liệu kinh
   doanh cần giữ lâu dài để tra cứu doanh thu quá khứ, khác đơn hoàn chỉ có
   giá trị vận hành trong tháng). Chỉ dọn cột du_lieu_json (payload thô từ
   sàn, nặng nhất) sau 90 ngày — giữ nguyên tong_tien/so_sp/trang_thai/ngày
   tháng vĩnh viễn (audit hiệu năng 21/08/2026, mục P0). */
async function donDepJsonDonHangCu(env) {
  const gioNay = Math.floor(Date.now() / 1000);
  const nguong90Ngay = gioNay - 90 * 86400;
  const r = await env.DB.prepare(
    `UPDATE don_hang SET du_lieu_json = NULL
      WHERE du_lieu_json IS NOT NULL
        AND tao_luc_san IS NOT NULL AND CAST(tao_luc_san AS INTEGER) < ?`
  ).bind(nguong90Ngay).run();
  if (r.meta.changes) console.log(`Dọn payload thô của ${r.meta.changes} đơn hàng cũ hơn 90 ngày`);
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
   để Vận hành sàn thấy ngay trong bảng "Cần đối soát", không phải lục chuông.
   Kèm ẢNH minh chứng (nén ở trình duyệt, gửi base64) — lưu ở bảng
   khieu_nai_minh_chung (xem migrations/them-khieunai-minhchung.sql). VIDEO
   gửi riêng sau (multipart) qua hoanKhieuNaiVideo — chỉ cần return_sn, gọi
   ngay sau khi hàm này chạy xong. */
const GIOI_HAN_ANH_KN = 6;
const GIOI_HAN_ANH_BYTE_KN = 1_500_000;   // ~1.1MB gốc sau khi mã hoá base64

async function hoanKhieuNai(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacKho(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const rsn = (b.return_sn || '').trim();
  const ghiChu = (b.ghi_chu || '').trim().slice(0, 300);
  if (!rsn) return loi('Thiếu mã đơn hoàn');

  const anhDs = Array.isArray(b.anh) ? b.anh.slice(0, GIOI_HAN_ANH_KN) : [];
  for (const a of anhDs) {
    if (typeof a !== 'string' || !a.startsWith('data:image/')) return loi('Có ảnh gửi lên không hợp lệ');
    if (a.length > GIOI_HAN_ANH_BYTE_KN) return loi('Có ảnh quá nặng — chụp lại hoặc để trình duyệt tự nén rồi thử lại');
  }

  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const ok = await dayVeVanHanh(env, rsn, ghiChu, nguoi);
  if (!ok) return loi('Không tìm thấy đơn (hoặc đã nhận đủ)', 404);

  if (anhDs.length) {
    const cauLenh = anhDs.map(a => env.DB.prepare(`
      INSERT INTO khieu_nai_minh_chung (id, return_sn, loai, du_lieu, kich_thuoc, nguoi)
      VALUES (?, ?, 'anh', ?, ?, ?)
    `).bind('mc_' + crypto.randomUUID().slice(0, 12), rsn, a, a.length, nguoi));
    await env.DB.batch(cauLenh);
  }

  return json({ ok: true });
}

/* ---- Video minh chứng khiếu nại (multipart, lưu R2 vì D1 giới hạn 2MB) --
   Gửi SAU hoanKhieuNai. Chưa cấu hình bucket MINH_CHUNG (chưa deploy R2) thì
   báo lỗi rõ ràng, không sập máy chủ — lý do + ảnh vẫn lưu bình thường. */
async function hoanKhieuNaiVideo(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocThaoTacKho(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  if (!env.MINH_CHUNG) {
    return loi('Máy chủ chưa cấu hình lưu trữ video (R2) — báo Sếp Ngọc tạo bucket. Lý do + ảnh vẫn lưu được bình thường.', 409);
  }

  let form;
  try { form = await req.formData(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const rsn = String(form.get('return_sn') || '').trim();
  const file = form.get('file');
  if (!rsn) return loi('Thiếu mã đơn hoàn');
  if (!(file instanceof File)) return loi('Chưa chọn file video');
  if (!String(file.type || '').startsWith('video/')) return loi('Chỉ nhận file video');
  const GIOI_HAN_VIDEO = 50 * 1024 * 1024;
  if (file.size > GIOI_HAN_VIDEO) return loi('Video quá lớn (tối đa 50MB) — quay ngắn lại hoặc giảm độ phân giải');

  const don = await env.DB.prepare('SELECT return_sn FROM don_hoan WHERE return_sn = ?').bind(rsn).first();
  if (!don) return loi('Không tìm thấy đơn hoàn này', 404);

  const id = 'mc_' + crypto.randomUUID().slice(0, 12);
  const tenAnToan = String(file.name || 'video').replace(/[^\w.\-]+/g, '_').slice(0, 80);
  const r2Key = `khieu-nai/${rsn}/${id}-${tenAnToan}`;

  await env.MINH_CHUNG.put(r2Key, file, { httpMetadata: { contentType: file.type || 'application/octet-stream' } });
  await env.DB.prepare(`
    INSERT INTO khieu_nai_minh_chung (id, return_sn, loai, r2_key, loai_mime, ten_file, kich_thuoc, nguoi)
    VALUES (?, ?, 'video', ?, ?, ?, ?, ?)
  `).bind(id, rsn, r2Key, file.type || null, tenAnToan, file.size || null,
          phien.ho_ten || phien.ten_dang_nhap).run();

  return json({ ok: true, id });
}

/* Tải lại video (hỗ trợ Range để trình duyệt tua được) */
async function hoanKhieuNaiVideoXem(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemDonHoan(phien.vai_tro) && !duocThaoTacKho(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  if (!env.MINH_CHUNG) return loi('Chưa cấu hình lưu trữ video trên máy chủ', 409);

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return loi('Thiếu mã minh chứng');
  const mc = await env.DB.prepare(
    `SELECT r2_key, loai_mime, ten_file, kich_thuoc FROM khieu_nai_minh_chung WHERE id = ? AND loai = 'video'`
  ).bind(id).first();
  if (!mc) return new Response('Không tìm thấy video', { status: 404 });

  const rangeHeader = req.headers.get('Range');
  const tuyChon = {};
  if (rangeHeader) {
    const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : undefined;
      tuyChon.range = (end != null) ? { offset: start, length: end - start + 1 } : { offset: start };
    }
  }
  const obj = await env.MINH_CHUNG.get(mc.r2_key, tuyChon);
  if (!obj) return new Response('Video không còn trong kho lưu trữ', { status: 404 });

  const dungRange = !!(rangeHeader && obj.range);
  const headers = {
    'Content-Type': mc.loai_mime || 'video/mp4',
    'Cache-Control': 'private, max-age=3600',
    'Accept-Ranges': 'bytes'
  };
  if (dungRange) {
    const tong = mc.kich_thuoc || obj.size || 0;
    const offset = obj.range.offset ?? 0;
    const len = obj.range.length ?? (tong - offset);
    headers['Content-Range'] = `bytes ${offset}-${offset + len - 1}/${tong}`;
  }
  return new Response(obj.body, { status: dungRange ? 206 : 200, headers });
}

/* Chi tiết minh chứng (ảnh inline base64 + danh sách video) của 1 đơn hoàn —
   Vận hành sàn bấm "Xem minh chứng" ở bảng Cần đối soát để gọi cái này. */
async function hoanKhieuNaiMinhChung(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemDonHoan(phien.vai_tro) && !duocThaoTacKho(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  const rsn = new URL(req.url).searchParams.get('return_sn');
  if (!rsn) return loi('Thiếu mã đơn hoàn');
  const { results } = await env.DB.prepare(
    `SELECT id, loai, du_lieu, ten_file, kich_thuoc, nguoi, tao_luc
       FROM khieu_nai_minh_chung WHERE return_sn = ? ORDER BY tao_luc ASC`
  ).bind(rsn).all();
  return json({ minh_chung: results || [] });
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
const CV_COT = `c.id, c.tieu_de, c.dau_ra, c.mo_ta, c.nguoi_giao_id, c.nguoi_giao_ten,
                c.nguoi_nhan_id, c.nguoi_nhan_ten, c.phoi_hop_ids, c.phoi_hop_ten,
                c.han_chot, c.trang_thai, c.ket_qua, c.tao_luc, c.cap_nhat_luc,
                c.muc_tieu_id, m.tieu_de AS muc_tieu_ten`;
const CV_TU = `cong_viec c LEFT JOIN muc_tieu m ON m.id = c.muc_tieu_id`;

async function cvDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  // LIMIT 300 mỗi danh sách — phòng khi công ty đông lên, tránh trả về vô hạn
  // dòng (audit hiệu năng 21/08/2026, mục P0). Việc cũ/hoàn thành đã bị xếp
  // xuống cuối bởi ORDER BY nên bị cắt bớt trước, không mất việc đang mở —
  // và giờ đã có tab "Lịch sử làm việc" riêng để tra việc cũ đầy đủ.
  const [nhan, giao, phoiHop] = await Promise.all([
    env.DB.prepare(
      `SELECT ${CV_COT} FROM ${CV_TU} WHERE c.nguoi_nhan_id = ?
        ORDER BY (c.trang_thai IN ('hoan_thanh','huy')), (c.han_chot IS NULL), c.han_chot ASC, c.id DESC
        LIMIT 300`
    ).bind(phien.nhan_su_id).all(),
    env.DB.prepare(
      // Việc GIAO cho người khác. Todo cá nhân (tự giao cho mình) không tính
      // vào đây — nó nằm ở "Việc cần làm" — nên loại nguoi_nhan = nguoi_giao.
      `SELECT ${CV_COT} FROM ${CV_TU}
         WHERE c.nguoi_giao_id = ? AND c.nguoi_nhan_id <> c.nguoi_giao_id
        ORDER BY (c.trang_thai IN ('hoan_thanh','huy')), c.id DESC
        LIMIT 300`
    ).bind(phien.nhan_su_id).all(),
    env.DB.prepare(
      `SELECT ${CV_COT} FROM ${CV_TU} WHERE c.phoi_hop_ids LIKE '%,' || ? || ',%'
        ORDER BY (c.trang_thai IN ('hoan_thanh','huy')), (c.han_chot IS NULL), c.han_chot ASC, c.id DESC
        LIMIT 300`
    ).bind(phien.nhan_su_id).all()
  ]);
  return json({ nhan: nhan.results || [], giao: giao.results || [], phoi_hop: phoiHop.results || [] });
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
  const mucTieuId = b.muc_tieu_id ? parseInt(b.muc_tieu_id, 10) : null;

  // Tự giao cho mình = TODO CÁ NHÂN (việc cần làm của bản thân) — được phép.
  const laTodoCaNhan = nguoiNhanId === phien.nhan_su_id;
  if (!nguoiNhanId) return loi('Chưa chọn người nhận việc');
  if (!tieuDe) return loi('Thiếu tên việc');
  // Giao cho người KHÁC bắt buộc có đầu ra (tinh thần MBOs). Todo cá nhân thì
  // đầu ra để tuỳ chọn cho nhẹ — todo kiểu "gọi NCC chè" không cần đặc tả.
  if (!dauRa && !laTodoCaNhan) return loi('Thiếu đầu ra cụ thể cần đạt — đừng chỉ ghi "làm gì", ghi rõ xong thì kết quả ra sao');

  const ns = await env.DB.prepare('SELECT ho_ten FROM nhan_su WHERE id = ?').bind(nguoiNhanId).first();
  if (!ns) return loi('Không tìm thấy người nhận việc', 404);

  // Gắn vào mục tiêu (tuỳ chọn) — chỉ chấp nhận id mục tiêu có thật, âm thầm
  // bỏ qua nếu gõ bậy/mục tiêu đã bị xoá, không chặn việc giao việc.
  let mtIdHopLe = null;
  if (mucTieuId) {
    const mt = await env.DB.prepare('SELECT id FROM muc_tieu WHERE id = ?').bind(mucTieuId).first();
    if (mt) mtIdHopLe = mucTieuId;
  }

  // Người phối hợp (tuỳ chọn, chọn nhiều) — MBOs: chỉ hỗ trợ, không chịu đầu ra.
  // Loại trùng người nhận chính và người giao; chỉ giữ nhân sự có thật.
  const phArr = Array.isArray(b.phoi_hop)
    ? [...new Set(b.phoi_hop.map(x => String(x).trim()).filter(Boolean))] : [];
  const phList = [];
  for (const id of phArr) {
    if (id === nguoiNhanId || id === phien.nhan_su_id) continue;
    const p = await env.DB.prepare('SELECT ho_ten FROM nhan_su WHERE id = ?').bind(id).first();
    if (p) phList.push({ id, ten: p.ho_ten });
  }
  const phoiHopIds = phList.length ? ',' + phList.map(p => p.id).join(',') + ',' : null;
  const phoiHopTen = phList.length ? phList.map(p => p.ten).join(', ') : null;

  const nguoiGiao = phien.ho_ten || phien.ten_dang_nhap;
  const r = await env.DB.prepare(`
    INSERT INTO cong_viec (tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten, phoi_hop_ids, phoi_hop_ten, han_chot, muc_tieu_id, trang_thai, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'moi', datetime('now','+7 hours'))
  `).bind(tieuDe, dauRa, moTa, phien.nhan_su_id, nguoiGiao, nguoiNhanId, ns.ho_ten, phoiHopIds, phoiHopTen, hanChot, mtIdHopLe).run();

  // Todo cá nhân thì khỏi tự bắn thông báo cho chính mình.
  if (!laTodoCaNhan) {
    await guiThongBao(env, null, `${nguoiGiao} giao việc mới: "${tieuDe}"`, 'cong_viec_moi', String(r.meta.last_row_id), nguoiNhanId);
  }
  for (const p of phList) {
    await guiThongBao(env, null, `${nguoiGiao} mời bạn PHỐI HỢP việc: "${tieuDe}" (người chính: ${ns.ho_ten})`, 'cong_viec_phoi_hop', String(r.meta.last_row_id), p.id);
  }
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

  // Người PHỐI HỢP CHỈ THEO DÕI, không được chuyển trạng thái/báo cáo thay —
  // Sếp Ngọc chốt lại 20/08/2026: "cứ để người chính báo cáo đừng để người
  // phối hợp làm" (đã thử cho phối hợp thao tác, Sếp yêu cầu hoàn tác lại,
  // giữ đúng 1 đầu mối chịu trách nhiệm báo cáo cho mỗi việc — tinh thần MBOs).
  const laNguoiNhan = cv.nguoi_nhan_id === phien.nhan_su_id;
  const laNguoiGiao = cv.nguoi_giao_id === phien.nhan_su_id || laAdmin(phien.vai_tro);
  const laTodoCaNhan = cv.nguoi_nhan_id === cv.nguoi_giao_id;

  // TODO CÁ NHÂN: tự giao cho mình thì được đánh dấu XONG thẳng từ bất kỳ đâu
  // (moi/dang_lam/cho_duyet), khỏi qua bước nộp + duyệt, không bắt điền kết quả.
  if (laTodoCaNhan && laNguoiNhan && trangThaiMoi === 'hoan_thanh'
      && ['moi', 'dang_lam', 'cho_duyet'].includes(cv.trang_thai)) {
    // hợp lệ — bỏ qua luật dưới
  }
  // Trả lại làm tiếp (cho_duyet -> dang_lam) — CHỈ người giao được bấm, tách
  // riêng khỏi bảng dưới vì đích đến 'dang_lam' còn dùng chung với nhánh
  // "Bắt đầu làm" (moi -> dang_lam, người NHẬN bấm) — 2 luật khác hẳn nhau
  // dù cùng đích đến, phải phân biệt bằng trạng thái NGUỒN.
  else if (trangThaiMoi === 'dang_lam' && cv.trang_thai === 'cho_duyet') {
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

/* Lịch sử làm việc — kho lưu trữ TOÀN CỤC mọi việc trong Trạm Mục Tiêu,
   không chỉ việc của riêng người xem (Sếp Ngọc yêu cầu 21/08/2026: "lưu trữ
   lại quá trình làm việc của nhân sự, ai làm gì, xong task gì như nào").
   Mở cho mọi vai trò xem (tab 'lichsuviec' — xem quyen.js), đúng tinh thần
   minh bạch đã áp dụng cho Trạm Mục Tiêu (MBOs): ai cũng thấy tiến độ của
   tất cả thành viên. Giới hạn 500 việc gần cập nhật nhất — team ~20 người,
   đủ dùng, tránh kéo quá nhiều dữ liệu 1 lần. */
async function cvLichSu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'lichsuviec')) return loi('Bạn không có quyền', 403);
  const { results } = await env.DB.prepare(
    `SELECT ${CV_COT} FROM ${CV_TU} ORDER BY c.cap_nhat_luc DESC, c.id DESC LIMIT 500`
  ).all();
  return json({ viec: results || [] });
}

/* Tổng quan việc TOÀN CÔNG TY — chỉ Admin (Sếp Ngọc/Sếp Phong xem "full
   toàn bộ công ty" thay vì chỉ việc của riêng mình, đúng như "Việc cần
   làm/Việc tôi giao" đang lọc theo người xem). Dùng lại đúng bảng cong_viec
   đã có, không tạo bảng/API riêng cho từng chỉ số — chỉ 1 query tổng hợp +
   1 query top việc quá hạn (Sếp Ngọc chốt 23/08/2026: làm nhẹ, không xây
   dashboard nhiều khối biểu đồ). */
async function cvTongQuanCongTy(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!laAdmin(phien.vai_tro)) return loi('Bạn không có quyền', 403);

  const homNay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

  const [tongTheoPhong, quaHan] = await Promise.all([
    env.DB.prepare(`
      SELECT COALESCE(NULLIF(n.bo_phan, ''), '— Chưa gán phòng ban') AS bo_phan,
             COUNT(*) AS dang_mo,
             SUM(CASE WHEN c.han_chot IS NOT NULL AND c.han_chot < ? THEN 1 ELSE 0 END) AS qua_han,
             SUM(CASE WHEN c.trang_thai = 'cho_duyet' THEN 1 ELSE 0 END) AS cho_duyet
        FROM cong_viec c
        LEFT JOIN nhan_su n ON n.id = c.nguoi_nhan_id
       WHERE c.trang_thai IN ('moi', 'dang_lam', 'cho_duyet')
       GROUP BY bo_phan
       ORDER BY dang_mo DESC
    `).bind(homNay).all(),
    env.DB.prepare(`
      SELECT c.id, c.tieu_de, c.han_chot, c.nguoi_nhan_ten, c.nguoi_giao_ten,
             COALESCE(NULLIF(n.bo_phan, ''), '—') AS bo_phan
        FROM cong_viec c
        LEFT JOIN nhan_su n ON n.id = c.nguoi_nhan_id
       WHERE c.trang_thai IN ('moi', 'dang_lam', 'cho_duyet')
         AND c.han_chot IS NOT NULL AND c.han_chot < ?
       ORDER BY c.han_chot ASC
       LIMIT 15
    `).bind(homNay).all()
  ]);

  const phong = tongTheoPhong.results || [];
  return json({
    dang_mo: phong.reduce((s, p) => s + p.dang_mo, 0),
    qua_han: phong.reduce((s, p) => s + p.qua_han, 0),
    cho_duyet: phong.reduce((s, p) => s + p.cho_duyet, 0),
    theo_phong_ban: phong,
    viec_qua_han: quaHan.results || []
  });
}

/* Tổng quan việc THEO PHÒNG BAN — cho Manager (trưởng phòng, KHÔNG phải
   Admin). Audit Home/Dashboard 23/08/2026: Home trước đây chỉ có 2 mức
   Admin/không-Admin, trong khi trưởng phòng thật (VD anh Duy — Kho Vận)
   nhiều khi vai_tro hệ thống chỉ là "nguoi_dung" — phải theo đúng
   phong_ban.truong_phong_id (đã có ở TOI.phong_ban_quan_ly), không theo
   vai_tro (xem docs/audit/AUDIT-HOME-DASHBOARD.md mục A). Mirror đúng
   logic cvTongQuanCongTy phía trên, chỉ khác WHERE lọc theo phòng ban
   người gọi quản lý — đọc từ SESSION, không nhận phong_ban_id từ client
   (Rule K trong audit: tránh 1 nhân viên tự dò xem team người khác). */
async function cvTongQuanPhongBan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  const { results: phongBanQuanLy } = await env.DB.prepare(
    'SELECT id, ten FROM phong_ban WHERE truong_phong_id = ? AND hoat_dong = 1'
  ).bind(phien.nhan_su_id).all();
  if (!phongBanQuanLy.length) return loi('Bạn không quản lý phòng ban nào', 403);

  const ids = phongBanQuanLy.map(p => p.id);
  const cho = ids.map(() => '?').join(',');
  const homNay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

  const [tong, quaHan] = await Promise.all([
    env.DB.prepare(`
      SELECT COUNT(*) AS dang_mo,
             SUM(CASE WHEN c.han_chot IS NOT NULL AND c.han_chot < ? THEN 1 ELSE 0 END) AS qua_han,
             SUM(CASE WHEN c.trang_thai = 'cho_duyet' THEN 1 ELSE 0 END) AS cho_duyet
        FROM cong_viec c
        JOIN nhan_su n ON n.id = c.nguoi_nhan_id
       WHERE c.trang_thai IN ('moi', 'dang_lam', 'cho_duyet') AND n.phong_ban_id IN (${cho})
    `).bind(homNay, ...ids).first(),
    env.DB.prepare(`
      SELECT c.id, c.tieu_de, c.han_chot, c.nguoi_nhan_ten, c.nguoi_giao_ten
        FROM cong_viec c
        JOIN nhan_su n ON n.id = c.nguoi_nhan_id
       WHERE c.trang_thai IN ('moi', 'dang_lam', 'cho_duyet') AND n.phong_ban_id IN (${cho})
         AND c.han_chot IS NOT NULL AND c.han_chot < ?
       ORDER BY c.han_chot ASC
       LIMIT 15
    `).bind(...ids, homNay).all()
  ]);

  return json({
    phong_ban: phongBanQuanLy,
    dang_mo: tong.dang_mo || 0,
    qua_han: tong.qua_han || 0,
    cho_duyet: tong.cho_duyet || 0,
    viec_qua_han: quaHan.results || []
  });
}

/* ==========================================================================
   MỤC TIÊU — MBOs 3 tầng: Công ty -> Phòng ban -> Cá nhân (Sếp Phong chốt
   20/08/2026, Sếp Ngọc bổ sung tầng cá nhân + gộp chung 1 khối "Trạm Mục
   Tiêu (MBOs)" với bảng giao việc 21/08/2026 — 2 khối vốn cùng bản chất:
   mục tiêu ở đây, việc cụ thể để đạt mục tiêu ở Trạm Mục Tiêu bên dưới).
   Mục tiêu CÔNG TY: chỉ Admin tạo VÀ chốt (Sếp Phong: "Tôi là
   người chốt mục tiêu công ty"). Mục tiêu PHÒNG BAN + CÁ NHÂN: mở cho ai cũng
   tạo được (giống triết lý MVP của Trạm Mục Tiêu — tin tưởng tự đặt mục tiêu
   cho phòng/cho bản thân). Phòng ban gắn với 1 bộ phận (bo_phan, chữ tự do
   theo nhan_su); cá nhân không cần bo_phan — nguoi_tao_ten đã đủ nhận diện.
   Tiến độ KHÔNG nhập tay — tự tính % từ công việc (Trạm Mục Tiêu) đã gắn vào
   mục tiêu đó mà trạng thái = hoàn_thành, để khỏi nói suông không có việc cụ
   thể chứng minh (đúng tinh thần MBOs). Theo QUÝ — xem migrations/them-muctieu.sql
   (bảng dùng cột cap kiểu TEXT tự do, không CHECK constraint, nên thêm tầng
   'ca_nhan' không cần migration mới).
   ========================================================================== */

function kyHienTai() {
  const _vn = new Date(Date.now() + 7 * 3600 * 1000);
  return { nam: _vn.getUTCFullYear(), quy: Math.floor(_vn.getUTCMonth() / 3) + 1 };
}

const MT_COT = `id, cap, bo_phan, tieu_de, mo_ta, nam, quy, nguoi_tao_id, nguoi_tao_ten,
                trang_thai, da_chot, chot_boi, chot_luc, tao_luc, cap_nhat_luc,
                (SELECT COUNT(*) FROM cong_viec WHERE muc_tieu_id = m.id) AS so_viec,
                (SELECT COUNT(*) FROM cong_viec WHERE muc_tieu_id = m.id AND trang_thai = 'hoan_thanh') AS so_viec_xong,
                (SELECT MIN(han_chot) FROM cong_viec
                  WHERE muc_tieu_id = m.id AND han_chot IS NOT NULL
                    AND trang_thai NOT IN ('hoan_thanh', 'huy')) AS han_gan_nhat`;

async function mtDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const u = new URL(req.url);
  const ky = kyHienTai();
  const nam = parseInt(u.searchParams.get('nam'), 10) || ky.nam;
  const quy = parseInt(u.searchParams.get('quy'), 10) || ky.quy;

  // LIMIT 300 — đã lọc theo đúng 1 quý nên vốn nhỏ, thêm trần cho chắc
  // (audit hiệu năng 21/08/2026, mục P0).
  // Sắp theo: đang thực hiện lên trước (đã xong/huỷ xuống cuối, frontend tự
  // gấp lại thành khối riêng) → trong nhóm đang thực hiện, hạn gần nhất lên
  // trước (không có hạn thì xuống cuối) → mới tạo trước (giữ thói quen cũ).
  const { results } = await env.DB.prepare(
    `SELECT ${MT_COT} FROM muc_tieu m WHERE nam = ? AND quy = ?
     ORDER BY cap ASC,
              (trang_thai = 'dang_thuc_hien') DESC,
              (han_gan_nhat IS NULL) ASC,
              han_gan_nhat ASC,
              tao_luc DESC
     LIMIT 300`
  ).bind(nam, quy).all();

  // Cấp cá nhân CHỈ hiện mục tiêu của CHÍNH người xem — không công khai toàn
  // công ty như công ty/phòng ban (Sếp Ngọc chốt 25/08/2026, sau khi thấy
  // thật: "cá nhân xem của nhau thì xem trong lịch sử công việc thôi chứ cả
  // công ty nhập liệu trên đó thì nhiều lắm" — card cấp cá nhân sẽ vỡ trận
  // với ~20 người, và Lịch sử làm việc (cvLichSu) đã đủ minh bạch xem việc
  // của nhau qua bảng lọc được, không cần lặp lại ở dạng thẻ tại đây).
  return json({
    nam, quy,
    cong_ty: results.filter(r => r.cap === 'cong_ty'),
    phong_ban: results.filter(r => r.cap === 'phong_ban'),
    ca_nhan: results.filter(r => r.cap === 'ca_nhan' && r.nguoi_tao_id === phien.nhan_su_id)
  });
}

async function mtTao(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const cap = String(b.cap || '').trim();
  if (!['cong_ty', 'phong_ban', 'ca_nhan'].includes(cap)) return loi('Cấp mục tiêu không hợp lệ');
  if (cap === 'cong_ty' && !laAdmin(phien.vai_tro)) {
    return loi('Chỉ Admin mới được đặt mục tiêu cấp công ty', 403);
  }

  const boPhan = cap === 'phong_ban' ? String(b.bo_phan || '').trim() : null;
  if (cap === 'phong_ban' && !boPhan) return loi('Thiếu tên phòng ban/bộ phận');

  const tieuDe = String(b.tieu_de || '').trim().slice(0, 200);
  if (!tieuDe) return loi('Thiếu tên mục tiêu');
  const moTa = String(b.mo_ta || '').trim().slice(0, 2000) || null;

  const ky = kyHienTai();
  const nam = parseInt(b.nam, 10) || ky.nam;
  const quy = parseInt(b.quy, 10) || ky.quy;
  if (quy < 1 || quy > 4) return loi('Quý không hợp lệ (1-4)');

  const nguoiTao = phien.ho_ten || phien.ten_dang_nhap;
  const r = await env.DB.prepare(`
    INSERT INTO muc_tieu (cap, bo_phan, tieu_de, mo_ta, nam, quy, nguoi_tao_id, nguoi_tao_ten, trang_thai, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dang_thuc_hien', datetime('now','+7 hours'))
  `).bind(cap, boPhan, tieuDe, moTa, nam, quy, phien.nhan_su_id, nguoiTao).run();

  return json({ ok: true, id: r.meta.last_row_id });
}

/* Admin CHỐT mục tiêu công ty — khoá lại, không sửa được nữa */
async function mtChot(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!laAdmin(phien.vai_tro)) return loi('Chỉ Admin mới được chốt mục tiêu công ty', 403);

  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const id = parseInt(b.id, 10);
  if (!id) return loi('Thiếu id mục tiêu');

  const nguoi = phien.ho_ten || phien.ten_dang_nhap;
  const r = await env.DB.prepare(`
    UPDATE muc_tieu SET da_chot = 1, chot_boi = ?, chot_luc = datetime('now','+7 hours')
     WHERE id = ? AND cap = 'cong_ty' AND da_chot = 0
  `).bind(nguoi, id).run();
  if (!r.meta.changes) return loi('Không tìm thấy mục tiêu công ty này (hoặc đã chốt trước đó)', 404);
  return json({ ok: true, nguoi });
}

/* Người tạo hoặc admin đổi trạng thái (hoàn thành/huỷ) hoặc sửa tiêu đề/mô tả.
   Mục tiêu công ty ĐÃ CHỐT thì khoá — không sửa/huỷ được nữa (phải chốt cẩn thận). */
async function mtCapNhat(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const id = parseInt(b.id, 10);
  if (!id) return loi('Thiếu id mục tiêu');

  const mt = await env.DB.prepare('SELECT * FROM muc_tieu WHERE id = ?').bind(id).first();
  if (!mt) return loi('Không tìm thấy mục tiêu', 404);
  if (mt.da_chot) return loi('Mục tiêu công ty đã chốt, không sửa được nữa', 409);

  const laChu = mt.nguoi_tao_id === phien.nhan_su_id || laAdmin(phien.vai_tro);
  if (!laChu) return loi('Chỉ người tạo (hoặc Admin) mới sửa được mục tiêu này', 403);

  const truong = {};
  if (b.trang_thai != null) {
    const tt = String(b.trang_thai).trim();
    if (!['dang_thuc_hien', 'hoan_thanh', 'huy'].includes(tt)) return loi('Trạng thái không hợp lệ');
    truong.trang_thai = tt;
  }
  if (b.tieu_de != null) truong.tieu_de = String(b.tieu_de).trim().slice(0, 200) || mt.tieu_de;
  if (b.mo_ta != null) truong.mo_ta = String(b.mo_ta).trim().slice(0, 2000) || null;
  if (!Object.keys(truong).length) return loi('Không có gì để sửa');

  const cotSet = Object.keys(truong).map(k => `${k} = ?`).join(', ');
  await env.DB.prepare(`UPDATE muc_tieu SET ${cotSet}, cap_nhat_luc = datetime('now','+7 hours') WHERE id = ?`)
              .bind(...Object.values(truong), id).run();
  return json({ ok: true });
}

/* Bấm vào 1 thẻ mục tiêu ở Trạm Mục Tiêu (MBOs) → xem chi tiết TOÀN BỘ việc
   đã gắn vào mục tiêu đó (Sếp Ngọc yêu cầu 21/08/2026: "click vào 1 mục tiêu
   cụ thể thì hiện ra các thông tin chi tiết"). Lấy KHÔNG lọc theo người xem
   — khớp đúng cách so_viec/so_viec_xong ở MT_COT phía trên đã đếm TOÀN CỤC
   (không riêng người dùng hiện tại), để số trên thẻ và danh sách chi tiết
   luôn khớp nhau. Mở cho mọi vai trò xem (giống mtDanhSach), đúng tinh thần
   minh bạch MBOs — biết việc đang chạy tới đâu, ai phụ trách. */
async function mtViec(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const u = new URL(req.url);
  const id = parseInt(u.searchParams.get('id'), 10);
  if (!id) return loi('Thiếu id mục tiêu');

  const { results } = await env.DB.prepare(`
    SELECT id, tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten,
           nguoi_nhan_id, nguoi_nhan_ten, phoi_hop_ten, han_chot, trang_thai, tao_luc
      FROM cong_viec WHERE muc_tieu_id = ?
     ORDER BY (trang_thai IN ('hoan_thanh','huy')), (han_chot IS NULL), han_chot ASC, id DESC
  `).bind(id).all();

  return json({ viec: results || [] });
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
   Quyền dùng chung với Đơn hoàn (duocXemDonHoan): Admin,
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
           d.ly_do_khieu_nai, d.khieu_nai_luc, d.khieu_nai_boi,
           (SELECT COUNT(*) FROM khieu_nai_minh_chung WHERE return_sn = d.return_sn AND loai = 'anh')   AS so_anh,
           (SELECT COUNT(*) FROM khieu_nai_minh_chung WHERE return_sn = d.return_sn AND loai = 'video') AS so_video
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
   KINH DOANH — Doanh thu + số đơn thật (kéo từ Shopee/TikTok, khác Đơn hoàn
   ở trên). Dùng LẠI kết nối đã ủy quyền cho Đơn hoàn — không cần nối lại.
   Xem migrations/them-donhang.sql + dongBoDonHangNen() trong shopee.js/tiktok.js.
   ⚠️ tong_tien là TỔNG GIÁ ĐƠN, CHƯA trừ phí sàn/voucher/phí vận chuyển —
   không phải doanh thu thực nhận (ghi rõ ở giao diện, đừng để Sếp hiểu nhầm
   là lợi nhuận hay tiền thực về tài khoản).
   ========================================================================== */

/* Đồng bộ đơn hàng CẢ 2 sàn — 1 nút bấm, dùng chung nút bấm lẫn lịch chạy nền */
async function kdDongBoDonHang(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'kinhdoanh')) return loi('Bạn không có quyền', 403);

  const ket = { shopee: null, tiktok: null, loi: [] };
  try { ket.shopee = await shopee.dongBoDonHangNen(env); }
  catch (e) { ket.loi.push('Shopee: ' + e.message); }
  try { ket.tiktok = await tiktok.dongBoDonHangNen(env); }
  catch (e) { ket.loi.push('TikTok: ' + e.message); }

  if (ket.shopee == null && ket.tiktok == null && ket.loi.length === 0) {
    return loi('Chưa cấu hình/kết nối sàn nào, hoặc chưa nạp migration them-donhang.sql trên máy chủ', 409);
  }
  const soDon = (ket.shopee || 0) + (ket.tiktok || 0);
  return json({ ok: ket.loi.length === 0, so_don: soDon, loi: ket.loi });
}

/* Tổng quan doanh thu/số đơn cho thẻ + biểu đồ tab Kinh doanh */
async function kdTongQuanDoanhThu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'kinhdoanh')) return loi('Bạn không có quyền', 403);

  const _vn = new Date(Date.now() + 7 * 3600 * 1000);
  const dauThangSec = Math.floor(Date.UTC(_vn.getUTCFullYear(), _vn.getUTCMonth(), 1) / 1000) - 7 * 3600;
  const dauNgaySec  = Math.floor(Date.UTC(_vn.getUTCFullYear(), _vn.getUTCMonth(), _vn.getUTCDate()) / 1000) - 7 * 3600;

  let coBang = true, homNay = { so_don: 0, tong_tien: 0 }, thangNay = [];
  try {
    homNay = await env.DB.prepare(`
      SELECT COUNT(*) AS so_don, COALESCE(SUM(tong_tien),0) AS tong_tien
        FROM don_hang WHERE CAST(tao_luc_san AS INTEGER) >= ?
    `).bind(dauNgaySec).first();

    const kq = await env.DB.prepare(`
      SELECT nguon, COUNT(*) AS so_don, COALESCE(SUM(tong_tien),0) AS tong_tien
        FROM don_hang WHERE CAST(tao_luc_san AS INTEGER) >= ? GROUP BY nguon
    `).bind(dauThangSec).all();
    thangNay = kq.results || [];
  } catch {
    coBang = false;   // chưa nạp migration them-donhang.sql trên máy chủ này
  }

  return json({ co_bang: coBang, hom_nay: homNay, thang_nay: thangNay });
}

/* ==========================================================================
   ĐƠN HÀNG BỊ HỦY trước khi giao (Order API — KHÁC "Đơn hoàn/Trả hàng" ở
   bảng don_hoan). Đơn khách hủy khi CHƯA từng xuất kho, hoặc hệ thống/người
   bán tự hủy — hàng vẫn nguyên trong kho, không phải luồng xử lý của Kho vận.
   Chỉ có Shopee (đã lấy được cancel_reason/cancel_by) — TikTok làm sau.
   Xem migrations/them-donhang-huy.sql + dongBoDonHangNen() trong shopee.js.
   ========================================================================== */
async function donHangHuy(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'kinhdoanh')) return loi('Bạn không có quyền', 403);

  const _vn = new Date(Date.now() + 7 * 3600 * 1000);
  const dauThangSec = Math.floor(Date.UTC(_vn.getUTCFullYear(), _vn.getUTCMonth(), 1) / 1000) - 7 * 3600;

  // Chỉ lấy đơn ĐÃ CÓ mã vận đơn (Sếp/chị Huyền chốt 21/08/2026): nghĩa là
  // đã chuẩn bị/đóng gói xong rồi mới bị hủy — khác đơn hủy ngay từ đầu,
  // chưa từng chuẩn bị. Cột ma_van_don nạp SAU (migrations/them-donhang-
  // mavandon.sql) nên kiểm tra riêng, chưa nạp thì lọc êm bằng bộ lọc cũ
  // (không có điều kiện mã vận đơn) thay vì báo lỗi cả mục.
  const coVanDon = await shopee.coCotMaVanDon(env);
  try {
    const { results } = await env.DB.prepare(`
      SELECT order_sn, nguon, tong_tien, tien_te, nguoi_mua, so_sp,
             san_pham_ten, san_pham_sku, huy_ly_do, huy_boi, huy_ly_do_khach,
             ${coVanDon ? 'ma_van_don,' : ''} tao_luc_san, cap_nhat_san
        FROM don_hang
       WHERE trang_thai = 'CANCELLED' AND CAST(tao_luc_san AS INTEGER) >= ?
         ${coVanDon ? 'AND ma_van_don IS NOT NULL' : ''}
       ORDER BY cap_nhat_san DESC LIMIT 300
    `).bind(dauThangSec).all();
    return json({ don_huy: results, co_bang: true, co_van_don: coVanDon });
  } catch {
    return json({ don_huy: [], co_bang: false, co_van_don: false });   // chưa nạp migration them-donhang-huy.sql
  }
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

/* ---- Trạng thái hiện diện (Presence) ------------------------------------
   GIAO TIẾP nội bộ ("đang ở đâu, tiện liên hệ không") — KHÔNG PHẢI chấm
   công/lịch nghỉ (Rule 19 trong spec gốc). Chỉ 1 nguồn sự thật
   (nhan_su_trang_thai), Sidebar/Danh bạ/Hồ sơ đều đọc từ đây, không copy
   sang bảng khác. Mỗi người CHỈ tự đổi trạng thái của MÌNH.

   MANUAL (người dùng tự chọn) vs SYSTEM (ERP tự suy ra từ Lịch làm/Nghỉ
   phép chính thức — CHƯA có module đó nên Phase 1 chỉ có manual; cột
   `nguon` để sẵn chỗ cho 'system' sau này, không tự chế dữ liệu system
   khi chưa có nguồn thật). */
const TRANG_THAI_HD_HOP_LE = ['available', 'busy', 'meeting', 'away', 'dnd', 'remote'];
const GHI_CHU_HD_TOI_DA = 120;
// Thời hạn nhanh — tính het_han_luc = giờ UTC thật ngay tại máy chủ, KHÔNG
// nhận timestamp thô từ client (tránh lệch giờ máy khách/giả mạo).
const THOI_HAN_HD = {
  '30p':        "datetime('now', '+30 minutes')",
  '1h':         "datetime('now', '+1 hours')",
  '2h':         "datetime('now', '+2 hours')",
  cuoi_ngay:    "datetime('now', '+7 hours', 'start of day', '+1 day', '-7 hours', '-1 seconds')",
  khong_han:    null
};

/* Đọc trạng thái hiện diện của 1 người, tự trả 'available' nếu hết hạn/chưa
   từng đặt — dùng chung cho toiLaAi() (chính mình) và Hồ sơ nhân sự sau
   này, khỏi lặp logic hết-hạn ở nhiều nơi. */
async function docTrangThaiHienDien(env, nhanSuId) {
  const tt = await env.DB.prepare(
    'SELECT ma_trang_thai, ghi_chu, het_han_luc FROM nhan_su_trang_thai WHERE nhan_su_id = ?'
  ).bind(nhanSuId).first();
  if (!tt) return { ma: 'available', ghi_chu: null, het_han_luc: null };
  const hetHan = tt.het_han_luc && new Date(tt.het_han_luc) < new Date();
  return hetHan
    ? { ma: 'available', ghi_chu: null, het_han_luc: null }
    : { ma: tt.ma_trang_thai, ghi_chu: tt.ghi_chu, het_han_luc: tt.het_han_luc };
}

async function nsTrangThaiHD(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const ma = String(b.ma_trang_thai || '');
  if (!TRANG_THAI_HD_HOP_LE.includes(ma)) return loi('Trạng thái không hợp lệ');
  const ghiChu = String(b.ghi_chu || '').trim().slice(0, GHI_CHU_HD_TOI_DA) || null;
  const thoiHan = String(b.thoi_han || 'khong_han');
  if (!(thoiHan in THOI_HAN_HD)) return loi('Thời hạn không hợp lệ');
  const bieuThucHetHan = THOI_HAN_HD[thoiHan];

  await env.DB.prepare(`
    INSERT INTO nhan_su_trang_thai (nhan_su_id, ma_trang_thai, ghi_chu, het_han_luc, nguon, cap_nhat_luc)
    VALUES (?, ?, ?, ${bieuThucHetHan || 'NULL'}, 'manual', datetime('now'))
    ON CONFLICT(nhan_su_id) DO UPDATE SET
      ma_trang_thai = excluded.ma_trang_thai,
      ghi_chu       = excluded.ghi_chu,
      het_han_luc   = excluded.het_han_luc,
      nguon         = 'manual',
      cap_nhat_luc  = excluded.cap_nhat_luc
  `).bind(phien.nhan_su_id, ma, ghiChu).run();

  return json({ ok: true });
}

/* ---- Góp ý & Cải tiến ERP ------------------------------------------------
   Nhân viên báo vấn đề thực tế, không cần viết yêu cầu kỹ thuật (spec Sếp
   Ngọc 25/08/2026). Bảng riêng `gop_y`/`gop_y_lich_su` — KHÔNG dùng chung
   cong_viec (vòng đời/trạng thái khác hẳn "được giao việc", xem migration
   them-gopy.sql). Reviewer/Builder trong quy trình = Admin (laAdmin) —
   công ty quy mô nhỏ, không tự bịa role hệ thống mới cho việc này. */
const GOPY_TRANG_THAI_HOP_LE = [
  'moi', 'dang_phan_tich', 'cho_quyet_dinh', 'da_duyet', 'dang_lam',
  'dang_kiem_tra', 'can_chinh_sua', 'cho_nghiem_thu', 'nghiem_thu_chua_dat',
  'san_sang_phat_hanh', 'hoan_thanh', 'bi_chan'
];
// 6 mốc cần phát ERP UPDATE (Telegram + chuông trong app) — spec mục 8.
const GOPY_MOC_THONG_BAO = new Set(['cho_quyet_dinh', 'da_duyet', 'can_chinh_sua', 'cho_nghiem_thu', 'hoan_thanh', 'bi_chan']);
const GOPY_TRANG_THAI_NHAN = {
  cho_quyet_dinh: 'Chờ quyết định', da_duyet: 'Đã duyệt làm', can_chinh_sua: 'Cần chỉnh sửa',
  cho_nghiem_thu: 'Chờ nghiệm thu', hoan_thanh: 'Hoàn thành', bi_chan: 'Đang bị chặn'
};
const GOPY_LOAI_HOP_LE = ['loi', 'cai_tien_trai_nghiem', 'cai_tien_quy_trinh', 'tinh_nang_moi', 'du_lieu_sai', 'loi_phan_quyen', 'loi_ket_noi'];
const GOPY_TAN_SUAT_HOP_LE = ['lan_dau', 'thinh_thoang', 'thuong_xuyen', 'lien_tuc'];
const GOPY_DINH_KEM_TOI_DA = 800 * 1024;   // giống ẢNH_DAI_DIEN_TOI_DA — 1 ảnh, không video Phase 1 (D1 không hợp cho file lớn)

/* ---- Hồ Ly tự động TRIAGE (CHẾ ĐỘ NHÁP — shadow mode) --------------------
   Sếp Ngọc chốt 26/08/2026: tự động hoá Tier 1 bằng Workers AI (đã bind sẵn
   [ai] trong wrangler.toml, 0 credential mới, dùng thay Claude API thật vì
   lý do chi phí). Chạy trong cron mỗi 5 phút đã có (default.scheduled()).

   AN TOÀN: hàm này CHỈ ghi vào các cột de_xuat_* — KHÔNG bao giờ tự đổi
   gop_y.trang_thai thật. Admin phải tự bấm "Áp dụng đề xuất" (điền sẵn
   form) rồi bấm "Lưu" thật (gopYDoiTrangThai(), có backend enforce quyền)
   mới thật sự đổi trạng thái — đúng tinh thần Owner Gate đã thống nhất,
   không cho AI đường tắt tự quyết định thay Sếp. */
const HOLY_MODEL_AI = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const HOLY_RISK_TIEU_CHI = `HIGH nếu liên quan: kiến trúc Core, Source of Truth, đăng nhập/phân quyền, tài chính/kế toán, điều chỉnh tồn kho, hợp đồng tích hợp bên ngoài (Shopee/TikTok...), migration phá dữ liệu, nhân sự nhạy cảm, lương/kỷ luật/nghỉ việc, quy định pháp lý.
MEDIUM nếu: ảnh hưởng nhiều phòng ban, đổi luồng nghiệp vụ đang dùng thật, cần trưởng phòng xác nhận trước khi làm.
LOW nếu: chỉ 1 màn hình/1 phòng ban, sửa hiển thị/UX, không đụng dữ liệu chung, dễ revert.`;

/* Rút JSON ĐẦU TIÊN trong đoạn text — model Workers AI (Llama, không phải
   Claude) hay không tuân thủ đúng "chỉ trả JSON" như đã dặn trong prompt:
   viết thêm lời chào/giải thích trước sau, thậm chí lặp lại 1 khối JSON
   khác (echo dữ liệu đầu vào) phía sau. Regex tham lam `/\{[\s\S]*\}\/`
   kiểu rutJSON() trong nhansu.js sẽ nuốt luôn từ dấu { ĐẦU đến dấu }
   CUỐI — dính cả 2 khối làm 1 chuỗi không phải JSON hợp lệ (bug thật gặp
   khi test 26/08/2026). Dò đúng cặp ngoặc CÂN BẰNG đầu tiên, có theo dõi
   chuỗi "..." để không đếm nhầm { } nằm trong text bên trong. */
function rutJsonGopY(text) {
  if (!text) return null;
  const s = String(text);
  const batDau = s.indexOf('{');
  if (batDau === -1) return null;
  let doSau = 0, trongChuoi = false, thoat = false;
  for (let i = batDau; i < s.length; i++) {
    const c = s[i];
    if (trongChuoi) {
      if (thoat) thoat = false;
      else if (c === '\\') thoat = true;
      else if (c === '"') trongChuoi = false;
      continue;
    }
    if (c === '"') trongChuoi = true;
    else if (c === '{') doSau++;
    else if (c === '}') {
      doSau--;
      if (doSau === 0) {
        try { return JSON.parse(s.slice(batDau, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

async function hoLyTriageMot(env, g) {
  const prompt = `Bạn là Hồ Ly — Business Analyst của 1 ERP nội bộ công ty thương mại điện tử Việt Nam.
Đọc góp ý sau và trả lời DUY NHẤT 1 JSON (không thêm chữ nào khác, không markdown, không giải thích ngoài JSON), đúng các khoá:
loai (1 trong: loi, cai_tien_trai_nghiem, cai_tien_quy_trinh, tinh_nang_moi, du_lieu_sai, loi_phan_quyen, loi_ket_noi),
risk (1 trong: LOW, MEDIUM, HIGH),
ly_do_risk (1 câu tiếng Việt ngắn, vì sao đánh giá mức này),
spec (Feature Spec ngắn gọn tiếng Việt, gồm 4 dòng: Vấn đề / Luồng hiện tại (suy đoán) / Luồng đề xuất / Acceptance Criteria — tối đa 150 từ tổng cộng).

Tiêu chí đánh giá risk:
${HOLY_RISK_TIEU_CHI}

Góp ý cần phân tích:
Tiêu đề: ${g.tieu_de}
Đang làm gì: ${g.boi_canh}
Vướng ở đâu: ${g.vuong_o_dau}
Mong muốn: ${g.mong_muon}
Tần suất: ${g.tan_suat || 'không rõ'}
Khu vực: ${g.khu_vuc || 'không rõ'}

Nhắc lại: CHỈ trả về JSON, không chào hỏi, không giải thích thêm, không lặp lại dữ liệu góp ý ở trên.`;

  const kq = await env.AI.run(HOLY_MODEL_AI, {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 900
  });
  // Model này trả response SẴN LÀ OBJECT khi output đúng dạng JSON (không
  // phải chuỗi cần bóc tách như model vision đọc CCCD ở nhansu.js) — chấp
  // nhận cả 2 dạng cho chắc, phòng khi Cloudflare đổi hành vi model sau này.
  const data = (kq && typeof kq.response === 'object' && kq.response)
    ? kq.response
    : rutJsonGopY(kq && kq.response);
  if (!data) throw new Error('AI không trả JSON hợp lệ');

  const loaiDeXuat = GOPY_LOAI_HOP_LE.includes(data.loai) ? data.loai : null;
  const riskHopLe = ['LOW', 'MEDIUM', 'HIGH'].includes(String(data.risk || '').toUpperCase())
    ? String(data.risk).toUpperCase() : 'MEDIUM';   // không đoán được thì coi MEDIUM (an toàn hơn LOW)
  const trangThaiDeXuat = riskHopLe === 'HIGH' ? 'cho_quyet_dinh' : 'da_duyet';

  await env.DB.prepare(`
    UPDATE gop_y SET de_xuat_loai = ?, de_xuat_risk = ?, de_xuat_trang_thai = ?,
           de_xuat_ly_do = ?, de_xuat_spec = ?, tu_dong_xu_luc = datetime('now', '+7 hours')
     WHERE id = ?
  `).bind(loaiDeXuat, riskHopLe, trangThaiDeXuat,
          String(data.ly_do_risk || '').slice(0, 300), String(data.spec || '').slice(0, 2000), g.id).run();
}

/* Gọi từ scheduled() mỗi 5 phút — quét tối đa 5 góp ý mới/lần (đủ cho quy mô
   công ty, tránh 1 lần cron chạy quá lâu). Bỏ qua êm nếu Workers AI chưa
   bật hoặc 1 dòng lỗi — không chặn các dòng khác/các cron task khác. */
async function hoLyTuDongTriage(env) {
  if (!env.AI) return;

  const { results } = await env.DB.prepare(`
    SELECT id, tieu_de, boi_canh, vuong_o_dau, mong_muon, tan_suat, khu_vuc
      FROM gop_y WHERE trang_thai = 'moi' AND tu_dong_xu_luc IS NULL
     ORDER BY tao_luc ASC LIMIT 5
  `).all();

  for (const g of results) {
    try { await hoLyTriageMot(env, g); }
    catch (e) { console.error('Hồ Ly triage #' + g.id + ':', e.message); }
  }
}

async function gopYGui(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const tieuDe = String(b.tieu_de || '').trim();
  const boiCanh = String(b.boi_canh || '').trim();
  const vuongODau = String(b.vuong_o_dau || '').trim();
  const mongMuon = String(b.mong_muon || '').trim();
  if (!tieuDe || !boiCanh || !vuongODau || !mongMuon) return loi('Điền đủ Tiêu đề, Đang làm gì, Vướng ở đâu, Mong muốn kết quả');

  const tanSuat = String(b.tan_suat || '') || null;
  if (tanSuat && !GOPY_TAN_SUAT_HOP_LE.includes(tanSuat)) return loi('Tần suất không hợp lệ');
  const khuVuc = String(b.khu_vuc || '').trim().slice(0, 40) || null;

  let dinhKem = null;
  if (b.dinh_kem) {
    const raw = String(b.dinh_kem).replace(/^data:[^,]*,/, '');
    let doDai;
    try { doDai = atob(raw).length; } catch { return loi('Ảnh không hợp lệ'); }
    if (doDai > GOPY_DINH_KEM_TOI_DA) return loi('Ảnh quá lớn, thử ảnh khác nhé (tối đa 800KB)', 413);
    dinhKem = raw;
  }

  const r = await env.DB.prepare(`
    INSERT INTO gop_y (nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon, tan_suat, khu_vuc, dinh_kem, trang_thai, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'moi', datetime('now', '+7 hours'))
  `).bind(phien.nhan_su_id, tieuDe, boiCanh, vuongODau, mongMuon, tanSuat, khuVuc, dinhKem).run();

  return json({ ok: true, id: r.meta.last_row_id });
}

/* Danh sách — người thường chỉ thấy CỦA MÌNH, Admin thấy tất cả (Reviewer/
   Builder trong quy trình). Admin: Exception First (spec mục 5) — NEW/
   NEEDS_BUSINESS_DECISION/FIX_REQUIRED/BLOCKED/READY_FOR_UAT lên đầu. */
async function gopYDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  const laAd = laAdmin(phien.vai_tro);
  const dieuKien = laAd ? '' : 'WHERE g.nguoi_gui_id = ?';
  const sapXep = laAd
    ? `ORDER BY CASE g.trang_thai
         WHEN 'moi' THEN 0 WHEN 'cho_quyet_dinh' THEN 0 WHEN 'can_chinh_sua' THEN 0
         WHEN 'bi_chan' THEN 0 WHEN 'cho_nghiem_thu' THEN 0 ELSE 1 END, g.tao_luc DESC`
    : 'ORDER BY g.tao_luc DESC';

  const stmt = env.DB.prepare(`
    SELECT g.id, g.tieu_de, g.boi_canh, g.vuong_o_dau, g.mong_muon, g.tan_suat, g.khu_vuc,
           (g.dinh_kem IS NOT NULL) AS co_dinh_kem, g.loai, g.trang_thai,
           g.nguoi_phu_trach_id, pt.ho_ten AS nguoi_phu_trach_ten, g.spec_reference,
           g.tao_luc, g.cap_nhat_luc,
           g.de_xuat_loai, g.de_xuat_risk, g.de_xuat_trang_thai, g.de_xuat_ly_do, g.de_xuat_spec,
           n.ho_ten AS nguoi_gui_ten, n.viet_tat AS nguoi_gui_viet_tat
      FROM gop_y g
      JOIN nhan_su n ON n.id = g.nguoi_gui_id
      LEFT JOIN nhan_su pt ON pt.id = g.nguoi_phu_trach_id
      ${dieuKien}
      ${sapXep}
  `);
  const { results } = laAd ? await stmt.all() : await stmt.bind(phien.nhan_su_id).all();

  return json({ gop_y: results, la_admin: laAd });
}

/* Đổi trạng thái/category/người phụ trách — CHỈ Admin (Reviewer/Builder
   trong quy trình). Ghi lịch sử (History Must Survive Change), phát
   ERP UPDATE nếu chạm 1 trong 6 mốc (chuông trong app cho người gửi +
   Telegram kênh ops chung, reuse guiThongBao/guiTelegram sẵn có). */
async function gopYDoiTrangThai(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!laAdmin(phien.vai_tro)) return loi('Không có quyền', 403);

  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const id = parseInt(b.id, 10);
  if (!id) return loi('Thiếu id');

  const hienCo = await env.DB.prepare('SELECT trang_thai, nguoi_gui_id, tieu_de FROM gop_y WHERE id = ?').bind(id).first();
  if (!hienCo) return loi('Không tìm thấy góp ý này', 404);

  const trangThaiMoi = String(b.trang_thai || hienCo.trang_thai);
  if (!GOPY_TRANG_THAI_HOP_LE.includes(trangThaiMoi)) return loi('Trạng thái không hợp lệ');
  const loaiMoi = b.loai !== undefined ? (GOPY_LOAI_HOP_LE.includes(b.loai) ? b.loai : null) : undefined;
  const nguoiPhuTrachMoi = b.nguoi_phu_trach_id !== undefined ? (String(b.nguoi_phu_trach_id || '') || null) : undefined;
  const ghiChu = String(b.ghi_chu || '').trim().slice(0, 500) || null;

  const gan = [], gia = [];
  gan.push('trang_thai = ?'); gia.push(trangThaiMoi);
  gan.push('cap_nhat_luc = datetime(\'now\', \'+7 hours\')');
  if (loaiMoi !== undefined) { gan.push('loai = ?'); gia.push(loaiMoi); }
  if (nguoiPhuTrachMoi !== undefined) { gan.push('nguoi_phu_trach_id = ?'); gia.push(nguoiPhuTrachMoi); }
  gia.push(id);
  await env.DB.prepare(`UPDATE gop_y SET ${gan.join(', ')} WHERE id = ?`).bind(...gia).run();

  if (trangThaiMoi !== hienCo.trang_thai) {
    await env.DB.prepare(`
      INSERT INTO gop_y_lich_su (gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, ghi_chu, luc)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).bind(id, hienCo.trang_thai, trangThaiMoi, phien.nhan_su_id, ghiChu).run();

    if (GOPY_MOC_THONG_BAO.has(trangThaiMoi)) {
      const nhan = GOPY_TRANG_THAI_NHAN[trangThaiMoi] || trangThaiMoi;
      await guiThongBao(env, null, `Góp ý "${hienCo.tieu_de}" của bạn: ${nhan}`, 'gop_y_cap_nhat', String(id), hienCo.nguoi_gui_id);
      guiTelegram(env, `[Góp ý ERP] "${hienCo.tieu_de}" → ${nhan}`).catch(() => {});
    }
  }

  return json({ ok: true });
}

/* Lịch sử đổi trạng thái 1 góp ý — chủ sở hữu hoặc Admin mới xem được. */
async function gopYLichSu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const id = parseInt(new URL(req.url).searchParams.get('id'), 10);
  if (!id) return loi('Thiếu id', 400);

  const g = await env.DB.prepare('SELECT nguoi_gui_id FROM gop_y WHERE id = ?').bind(id).first();
  if (!g) return loi('Không tìm thấy góp ý này', 404);
  if (!laAdmin(phien.vai_tro) && g.nguoi_gui_id !== phien.nhan_su_id) return loi('Không có quyền', 403);

  const { results } = await env.DB.prepare(`
    SELECT ls.tu_trang_thai, ls.den_trang_thai, ls.ghi_chu, ls.luc, n.ho_ten AS nguoi_doi_ten
      FROM gop_y_lich_su ls
      JOIN nhan_su n ON n.id = ls.nguoi_doi_id
     WHERE ls.gop_y_id = ?
     ORDER BY ls.luc ASC
  `).bind(id).all();

  return json({ lich_su: results });
}

/* Ảnh đính kèm 1 góp ý — chủ sở hữu hoặc Admin mới xem được (KHÔNG mở cho
   tất cả như ảnh đại diện — nội dung góp ý có thể riêng tư giữa người gửi
   và Admin, spec mục 18 "Status message phải là thông tin nội bộ"). */
async function gopYAnh(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const id = parseInt(new URL(req.url).searchParams.get('id'), 10);
  if (!id) return loi('Thiếu id', 400);

  const g = await env.DB.prepare('SELECT nguoi_gui_id, dinh_kem FROM gop_y WHERE id = ?').bind(id).first();
  if (!g || !g.dinh_kem) return loi('Không có ảnh', 404);
  if (!laAdmin(phien.vai_tro) && g.nguoi_gui_id !== phien.nhan_su_id) return loi('Không có quyền', 403);

  const bin = Uint8Array.from(atob(g.dinh_kem), c => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
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
  'GET  /api/nhan-su/lich-su': nsLichSu,
  'POST /api/nhan-su/anh-dai-dien': nsAnhDaiDien,
  'POST /api/nhan-su/trang-thai-hd': nsTrangThaiHD,
  'GET  /api/nhan-su/anh':          nsAnhXem,
  'POST /api/gop-y':               gopYGui,
  'GET  /api/gop-y':               gopYDanhSach,
  'POST /api/gop-y/trang-thai':    gopYDoiTrangThai,
  'GET  /api/gop-y/lich-su':       gopYLichSu,
  'GET  /api/gop-y/anh':           gopYAnh,
  'GET  /api/chat/tin-nhan': chatDanhSach,
  'GET  /api/chat/chua-doc': chatChuaDoc,
  'POST /api/chat/da-doc':   chatDaDoc,
  'GET  /api/chat/gan-day':  chatGanDay,
  'POST /api/chat/gui':      chatGui,
  'GET  /api/chat/tep':      chatTepDinhKem,
  'GET  /api/quan-tri/danh-sach':      qtDanhSach,
  'POST /api/quan-tri/them-nhan-su':   qtThemNhanSu,
  'POST /api/quan-tri/sua-nhan-su':    qtSuaNhanSu,
  'POST /api/quan-tri/khoa-nhan-su':   qtKhoaNhanSu,
  'POST /api/quan-tri/xoa-nhan-su':    qtXoaNhanSu,
  'POST /api/quan-tri/tao-tai-khoan':  qtTaoTaiKhoan,
  'POST /api/quan-tri/dat-lai-mat-khau': qtDatLaiMatKhau,
  'POST /api/quan-tri/khoa-tai-khoan': qtKhoaTaiKhoan,
  'POST /api/quan-tri/sua-vai-tro':    qtSuaVaiTro,
  'POST /api/quan-tri/xoa-tai-khoan': qtXoaTaiKhoan,
  'GET  /api/kho/san-pham':      khoDanhSachSP,
  'POST /api/kho/them-san-pham': khoThemSP,
  'POST /api/kho/sua-san-pham':  khoSuaSP,
  'POST /api/kho/an-hien-san-pham': khoAnHienSP,
  'POST /api/kho/khoa-san-pham':    khoKhoaSP,
  'POST /api/kho/nhap':          khoNhap,
  'POST /api/kho/xuat':          khoXuat,
  'GET  /api/kho/lo':            khoLo,
  'GET  /api/kho/bao-cao':       khoBaoCao,
  'GET  /api/kho/lich-su':       khoLichSu,
  'GET  /api/dulieunen/phong-ban':      dlnDanhSachPhongBan,
  'POST /api/dulieunen/phong-ban/them': dlnThemPhongBan,
  'POST /api/dulieunen/phong-ban/sua':  dlnSuaPhongBan,
  'POST /api/dulieunen/phong-ban/khoa': dlnKhoaPhongBan,
  'POST /api/dulieunen/phong-ban/gan-truong-phong': dlnGanTruongPhong,
  'GET  /api/dulieunen/chuc-danh':      dlnDanhSachChucDanh,
  'POST /api/dulieunen/chuc-danh/them': dlnThemChucDanh,
  'POST /api/dulieunen/chuc-danh/sua':  dlnSuaChucDanh,
  'POST /api/dulieunen/chuc-danh/khoa': dlnKhoaChucDanh,
  'GET  /api/dulieunen/don-vi':         dlnDanhSachDonVi,
  'POST /api/dulieunen/don-vi/them':    dlnThemDonVi,
  'POST /api/dulieunen/don-vi/sua':     dlnSuaDonVi,
  'POST /api/dulieunen/don-vi/khoa':    dlnKhoaDonVi,
  'GET  /api/dulieunen/tai-san-danh-muc':      dlnDanhSachDanhMucTaiSan,
  'POST /api/dulieunen/tai-san-danh-muc/them': dlnThemDanhMucTaiSan,
  'POST /api/dulieunen/tai-san-danh-muc/sua':  dlnSuaDanhMucTaiSan,
  'POST /api/dulieunen/tai-san-danh-muc/khoa': dlnKhoaDanhMucTaiSan,
  'GET  /api/dulieunen/tai-san-vi-tri':      dlnDanhSachViTriTaiSan,
  'POST /api/dulieunen/tai-san-vi-tri/them': dlnThemViTriTaiSan,
  'POST /api/dulieunen/tai-san-vi-tri/sua':  dlnSuaViTriTaiSan,
  'POST /api/dulieunen/tai-san-vi-tri/khoa': dlnKhoaViTriTaiSan,
  'GET  /api/dulieunen/ncc':      dlnDanhSachNCC,
  'POST /api/dulieunen/ncc/them': dlnThemNCC,
  'POST /api/dulieunen/ncc/sua':  dlnSuaNCC,
  'POST /api/dulieunen/ncc/khoa': dlnKhoaNCC,
  'GET  /api/dulieunen/kho':      dlnDanhSachKho,
  'POST /api/dulieunen/kho/them': dlnThemKho,
  'POST /api/dulieunen/kho/sua':  dlnSuaKho,
  'GET  /api/tai-san':            tsDanhSach,
  'GET  /api/tai-san/lich-su':    tsLichSu,
  'GET  /api/tai-san/chi-tiet':   tsChiTiet,
  'GET  /api/tai-san/tra-cuu':    tsTraCuu,
  'POST /api/tai-san/them':       tsThem,
  'POST /api/tai-san/sua':        tsSua,
  'POST /api/tai-san/cap-phat':   tsCapPhat,
  'POST /api/tai-san/thu-hoi':    tsThuHoi,
  'POST /api/tai-san/bao-hong':   tsBaoHong,
  'POST /api/tai-san/bao-tri-xong': tsBaoTriXong,
  'POST /api/tai-san/thanh-ly':   tsThanhLy,
  'GET  /api/ca/mau-ca':          caDanhSachMauCa,
  'POST /api/ca/mau-ca/them':     caThemMauCa,
  'POST /api/ca/mau-ca/sua':      caSuaMauCa,
  'POST /api/ca/mau-ca/xoa':      caXoaMauCa,
  'POST /api/ca/mo/them':         caThemCaMo,
  'POST /api/ca/mo/mo-tuan':      caMoDangKyTuan,
  'POST /api/ca/mo/khoa':         caKhoaCaMo,
  'GET  /api/ca/dang-mo':         caDangMoXem,
  'POST /api/ca/dang-ky':         caDangKy,
  'POST /api/ca/dang-ky/huy':     caHuyDangKy,
  'GET  /api/ca/lich-cua-toi':    caLichCuaToi,
  'GET  /api/ca/ma-tran-tuan':    caMaTranTuan,
  'POST /api/ca/xep-tu-dong':     caXepTuDong,
  'POST /api/ca/duyet':           caDuyet,
  'POST /api/ca/duyet-hang-loat': caDuyetHangLoat,
  'POST /api/ca/tu-choi':         caTuChoi,
  'POST /api/ca/gan-thu-cong':    caGanThuCong,
  'POST /api/ca/chot-lich-tuan':  caChotLichTuan,
  'GET  /api/dulieunen/tinh-trang':     dlnTinhTrang,
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
  'POST /api/hoan/khieu-nai/video':  hoanKhieuNaiVideo,
  'GET  /api/hoan/khieu-nai/video':  hoanKhieuNaiVideoXem,
  'GET  /api/hoan/khieu-nai/minh-chung': hoanKhieuNaiMinhChung,
  'POST /api/hoan/chua-nhan':    hoanChuaNhan,
  'POST /api/hoan/phan-loai':    hoanPhanLoai,
  'GET  /api/vinh-danh': vdDanhSach,
  'POST /api/vinh-danh': vdGui,
  'GET  /api/cong-viec/danh-sach': cvDanhSach,
  'POST /api/cong-viec/tao':       cvTao,
  'POST /api/cong-viec/cap-nhat':  cvCapNhat,
  'GET  /api/cong-viec/lich-su':   cvLichSu,
  'GET  /api/cong-viec/tong-quan-congty': cvTongQuanCongTy,
  'GET  /api/cong-viec/tong-quan-phongban': cvTongQuanPhongBan,
  'GET  /api/muc-tieu/danh-sach': mtDanhSach,
  'POST /api/muc-tieu/tao':       mtTao,
  'POST /api/muc-tieu/chot':      mtChot,
  'POST /api/muc-tieu/cap-nhat':  mtCapNhat,
  'GET  /api/muc-tieu/viec':      mtViec,
  'GET  /api/thong-bao':         layThongBao,
  'POST /api/thong-bao/da-xem':  thongBaoDaXem,
  'GET  /api/kinh-doanh/can-doi-soat': kdCanDoiSoat,
  'GET  /api/kinh-doanh/khach-hoan-nhieu': kdKhachHoanNhieu,
  'POST /api/kinh-doanh/da-doi-soat':  kdDaDoiSoat,
  'POST /api/kinh-doanh/day-kho':      kdDayKho,
  'POST /api/kinh-doanh/day-ke-toan':  kdDayKeToan,
  'GET  /api/kinh-doanh/tong-quan-doanh-thu': kdTongQuanDoanhThu,
  'POST /api/kinh-doanh/dong-bo-don-hang':    kdDongBoDonHang,
  'GET  /api/kinh-doanh/don-hang-huy':        donHangHuy,
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
      // --- MỖI 5 PHÚT (nhẹ, cần tươi cho luồng đơn hoàn) ---
      try { await shopee.dongBoNen(env); } catch (e) { console.error('Cron Shopee:', e.message); }
      try { await tiktok.dongBoNen(env); } catch (e) { console.error('Cron TikTok:', e.message); }
      try { await kiemTraCanhBaoHoan(env); } catch (e) { console.error('Cron cảnh báo:', e.message); }
      try { await kiemTraLyDoNghiemTrong(env); } catch (e) { console.error('Cron cảnh báo nghiêm trọng:', e.message); }
      try { await hoLyTuDongTriage(env); } catch (e) { console.error('Cron Hồ Ly triage:', e.message); }

      // --- 1 GIỜ/LẦN (nặng: đồng bộ HÀNG NGÀN đơn hàng doanh thu + dọn dữ liệu) ---
      // Doanh thu không cần tươi từng 5 phút; chạy quá thường xuyên làm hệ thống
      // đơ. Chỉ chạy ở lần cron đầu giờ (phút 0). (Sếp Ngọc báo đơ 20/08/2026.)
      if (new Date().getUTCMinutes() < 5) {
        try { await shopee.dongBoDonHangNen(env); } catch (e) { console.error('Cron Shopee đơn hàng:', e.message); }
        try { await tiktok.dongBoDonHangNen(env); } catch (e) { console.error('Cron TikTok đơn hàng:', e.message); }
        try { await donDepDuLieuNgoaiThang(env); } catch (e) { console.error('Cron dọn dữ liệu ngoài tháng:', e.message); }
      try { await donDepJsonDonHangCu(env); } catch (e) { console.error('Cron dọn payload đơn hàng cũ:', e.message); }
      }
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
