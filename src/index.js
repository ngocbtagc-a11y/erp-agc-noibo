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
  cookieDangNhap, cookieDangXuat, layTokenTuCookie, layCoThieuCotDuyetGopY
} from './auth.js';

import {
  quyenCua, duocXemTab, duocXemLuong, laAdmin, duocThemNhanSu, duocQuanLyChinhSachCa, duocTaoTaiKhoan, nhomVaiTro,
  quyenKho, quyenShopee, duocThaoTacKho, duocQuanLyKho, duocXemDonHoan, duocThaoTacVanHanh, TEN_VAI_TRO, VAI_TRO_HOP_LE,
  duocDuyetGopY
} from './quyen.js';
import { kiemTraMatKhauDat, DAI_TOI_THIEU } from './mat-khau.js';
import * as kho from './kho.js';
import * as shopee from './shopee.js';
import * as tiktok from './tiktok.js';
import * as nhansu from './nhansu.js';
import * as dulieunen from './dulieunen.js';
import * as taisan from './taisan.js';
import * as saoLuu from './sao-luu.js';
import * as ca from './ca.js';
import * as hopdong from './hopdong.js';
import * as motacv from './mota-cv.js';
import * as kynang from './ky-nang.js';
import { quetNhacNhanSu, thangKeTiep, gioVN } from './nhac-nhan-su.js';
import { quetNhacCongViec, soNgayGiua } from './nhac-cong-viec.js';
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
  // LẤY CỜ TRƯỚC KHI RETURN — kể cả khi phiên không hợp lệ. Lấy là xoá, nên
  // bỏ sót một nhánh là kẹt cờ sang lượt sau và cảnh báo lệch người.
  if (layCoThieuCotDuyetGopY()) await canhBaoThieuCotDuyetGopY(env);
  if (!phien) return { loi: json({ loi: 'Chưa đăng nhập' }, 401) };
  return { phien };
}

/* ---- Cảnh báo hạ tầng, TỐI ĐA 1 TIN/NGÀY (REV-0030 lỗi 5) ---------------
   Dùng lại đúng khuôn `INSERT OR IGNORE INTO sao_luu_canh_bao (khoa)` đã có
   sẵn trong src/sao-luu.js (khoá = <việc>-<ngày VN>): bảng có PRIMARY KEY
   trên `khoa` nên hai lượt cron chồng nhau cũng chỉ bắn một tin.

   BỌC TRY/CATCH TOÀN BỘ: đây là đường CẢNH BÁO, nó không bao giờ được phép
   làm hỏng cái nó đang cảnh báo. Bảng chưa có, Telegram chưa cấu hình, mạng
   hỏng — đều im lặng đi tiếp. */
async function canhBaoMotLanMoiNgay(env, viec, text) {
  try {
    const ngay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const khoa = `${viec}-${ngay}`;
    const da = await env.DB.prepare('SELECT 1 FROM sao_luu_canh_bao WHERE khoa = ?').bind(khoa).first();
    if (da) return false;
    await env.DB.prepare('INSERT OR IGNORE INTO sao_luu_canh_bao (khoa) VALUES (?)').bind(khoa).run();
    await guiTelegram(env, text);
    return true;
  } catch { return false; }
}

/* Còn ai duyệt được góp ý ở cấp cuối không? Không còn thì BÁO, đừng để hàng
   chờ đứng im mà cả công ty tưởng đang chạy (REV-0030, lỗ dữ liệu "khôi phục
   bản sao lưu chụp trước migration"). Có tài khoản mà không ai giữ cờ mới là
   bất thường — DB trắng thì im. */
async function canhBaoKhongConNguoiDuyetGopY(env) {
  let n, tong;
  try {
    tong = (await env.DB.prepare('SELECT COUNT(*) AS n FROM tai_khoan WHERE kich_hoat = 1').first())?.n || 0;
    if (!tong) return false;
    n = (await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM tai_khoan WHERE duyet_gopy = 1 AND kich_hoat = 1').first())?.n || 0;
  } catch (e) {
    // Thiếu cột đã có đường cảnh báo riêng ở docPhien — không báo hai lần.
    if (/no such column/i.test(String(e && e.message))) return false;
    throw e;
  }
  if (n > 0) return false;
  const cho = (await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM gop_y WHERE trang_thai IN ('moi', 'cho_quyet_dinh')`).first())?.n || 0;
  return canhBaoMotLanMoiNgay(env, 'khong-con-nguoi-duyet-gopy',
    '🔴 [ERP] KHÔNG CÒN AI DUYỆT ĐƯỢC GÓP Ý Ở CẤP CUỐI.\n\n' +
    `Đang có ${tong} tài khoản hoạt động nhưng KHÔNG tài khoản nào giữ cờ duyet_gopy. ` +
    `${cho} góp ý đang đứng ở cổng duyệt.\n\n` +
    'Hay gặp nhất: vừa khôi phục một bản sao lưu chụp TRƯỚC khi nạp migration ' +
    'them-quyen-duyet-gopy.sql. Trong ERP không bật lại được (cấp cờ chỉ người đang giữ cờ ' +
    'làm được), phải chạy ở tầng dữ liệu:\n' +
    'npx wrangler d1 execute crm-agc --remote --command ' +
    '"UPDATE tai_khoan SET duyet_gopy = 1 WHERE ten_dang_nhap = \'<số của Sếp>\'"');
}

async function canhBaoThieuCotDuyetGopY(env) {
  return canhBaoMotLanMoiNgay(env, 'thieu-cot-duyet-gopy',
    '🔴 [ERP] THIẾU CỘT tai_khoan.duyet_gopy trong CSDL.\n\n' +
    'Hệ thống vẫn chạy nhưng KHÔNG AI duyệt được góp ý ở cấp cuối (cờ về false ' +
    'theo chiều an toàn) — cả hàng góp ý sẽ đứng.\n\n' +
    'Cách sửa: node scripts/chay-migration.mjs them-quyen-duyet-gopy.sql --remote');
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
  /* Công tắc riêng tư sinh nhật (SPEC-0007 Đợt 2) — hỏi RIÊNG một câu, KHÔNG
     nhét vào câu SELECT ở trên: chưa nạp them-sinhnhat-congkhai.sql thì cột
     chưa tồn tại, và một cột thiếu trong câu đó là ĐĂNG NHẬP CHẾT CẢ HỆ
     THỐNG. Mặc định BẬT khi chưa có cột — đúng câu 1 Mục 13 Sếp đã chốt. */
  let congKhaiSinhNhat = 1;
  try {
    const r = await env.DB.prepare('SELECT cong_khai_sinh_nhat FROM nhan_su WHERE id = ?')
                          .bind(phien.nhan_su_id).first();
    if (r && r.cong_khai_sinh_nhat != null) congKhaiSinhNhat = r.cong_khai_sinh_nhat;
  } catch { /* chưa nạp migration — giữ mặc định BẬT */ }
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
    cong_khai_sinh_nhat: !!congKhaiSinhNhat,
    phong_ban_quan_ly: phongBanQuanLy,
    quyen: q.tab,
    xem_luong: q.xem_luong,
    la_admin: laAdmin(phien.vai_tro),
    them_nhan_su: duocThemNhanSu(phien.vai_tro),
    quan_ly_chinh_sach_ca: duocQuanLyChinhSachCa(phien.vai_tro),
    duoc_tao_tai_khoan: duocTaoTaiKhoan(phien.vai_tro),
    // Cờ duyệt góp ý ERP ở cấp cuối — KHÔNG đi theo vai trò (Sếp Ngọc chốt
    // 28/08/2026). Giao diện dùng để vẽ nút; luật thật ở gopYDuyet().
    duyet_gopy: duocDuyetGopY(phien),
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
  // REV-0010 ISSUE-1: `dang_lam` phải có ở CẢ HAI nhánh. Giao diện lọc bằng
  // `.filter(n => n.dang_lam)`; nhánh không-xem-lương thiếu cột này thì mọi
  // dòng thành `undefined` và ô "Chọn người để chấm" của anh Duy TRỐNG TRƠN —
  // máy chủ trả 200, log sạch, không ai biết. Cột này không nhạy cảm (câu lệnh
  // đã `WHERE dang_lam = 1`), thêm vào không mở thêm bề mặt quyền nào.
  const cauLenh = xemLuong
    ? `SELECT id, ma_nv, ho_ten, viet_tat, chuc_vu, bo_phan, trang_thai,
              ngay_vao, dang_lam, luong, (anh_chan_dung IS NOT NULL) AS co_anh
         FROM nhan_su WHERE dang_lam = 1 ORDER BY bo_phan, ho_ten`
    : `SELECT id, ma_nv, ho_ten, viet_tat, chuc_vu, bo_phan, trang_thai,
              ngay_vao, dang_lam, (anh_chan_dung IS NOT NULL) AS co_anh
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
           t.id AS tai_khoan_id, t.ten_dang_nhap, t.vai_tro, t.kich_hoat, t.phai_doi_mk,
           t.duyet_gopy
      FROM nhan_su n
      LEFT JOIN tai_khoan t ON t.nhan_su_id = n.id
     ORDER BY n.dang_lam DESC, n.bo_phan, n.ho_ten
  `).all();

  // Hợp đồng đang hiệu lực, MỚI NHẤT mỗi người (SPEC-0007 Đợt 1). Hỏi RIÊNG
  // một câu rồi ghép trong JS, KHÔNG JOIN vào câu trên: chưa nạp migration
  // thì bảng chưa có, JOIN sẽ làm hỏng cả danh sách nhân sự — cả module
  // chết vì một cột hiển thị là cái giá không đáng.
  try {
    const { results: hd } = await env.DB.prepare(`
      SELECT h.nhan_su_id, h.loai, h.ngay_bat_dau, h.ngay_het_han, h.lan_thu
        FROM hop_dong_lao_dong h
       WHERE h.hieu_luc = 1
         AND h.id = (SELECT h2.id FROM hop_dong_lao_dong h2
                      WHERE h2.nhan_su_id = h.nhan_su_id AND h2.hieu_luc = 1
                      ORDER BY h2.ngay_bat_dau DESC, h2.id DESC LIMIT 1)
    `).all();
    const theoNguoi = new Map((hd || []).map(h => [h.nhan_su_id, h]));
    for (const n of results) {
      const h = theoNguoi.get(n.id);
      n.hd_loai = h ? h.loai : null;
      n.hd_bat_dau = h ? h.ngay_bat_dau : null;
      n.hd_het_han = h ? h.ngay_het_han : null;
      n.hd_lan_thu = h ? h.lan_thu : null;
    }
  } catch { /* chưa nạp them-hopdong-laodong.sql — cột hợp đồng để trống */ }

  /* Công tắc riêng tư sinh nhật (SPEC-0007 Đợt 2) — hỏi riêng, cùng lý do
     với khối trên: cột có thể chưa tồn tại, mà nhét vào câu SELECT chính là
     làm chết cả danh sách nhân sự. Chưa có cột → coi như BẬT.
     KHÔNG trả `ngay_sinh` ở đây: tab `nhansu` còn mở cho quản lý kho, mà
     ngày sinh là mức 2 theo ADR-0011 A2. Ngày sinh chỉ đi qua
     `/api/nhan-su/viec-can-lam` (cửa `them_nhan_su`). */
  try {
    const { results: ck } = await env.DB.prepare(
      'SELECT id, cong_khai_sinh_nhat FROM nhan_su'
    ).all();
    const theoId = new Map((ck || []).map(r => [r.id, r.cong_khai_sinh_nhat]));
    for (const n of results) n.cong_khai_sinh_nhat = theoId.has(n.id) ? !!theoId.get(n.id) : true;
  } catch { for (const n of results) n.cong_khai_sinh_nhat = true; }

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

/* HÌNH THỨC LÀM VIỆC — KHÔNG phải loại hợp đồng (SPEC-0007 §1.1, BH-32).
   `khoan_viec` thêm vào chứ KHÔNG thay `ban_thoi_gian`: bán thời gian là
   HỢP ĐỒNG LAO ĐỘNG có đóng BHXH, khoán việc là HỢP ĐỒNG DÂN SỰ không đóng —
   hai trục pháp lý khác nhau, gộp lại chính là thứ gây phân loại sai BHXH.
   Đặt một người sang `khoan_viec` cũng là chốt chặn: `src/ca.js` chỉ cho
   `ban_thoi_gian|thoi_vu` đăng ký ca, nên người khoán tự động không bị xếp ca
   — đúng bản chất "khoán thì không quản giờ giấc", 0 dòng code thêm. */
const LOAI_LAO_DONG_HOP_LE = ['toan_thoi_gian', 'ban_thoi_gian', 'thoi_vu', 'khoan_viec'];
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

  const hienCo = await env.DB.prepare('SELECT id, ho_ten, chuc_vu, bo_phan, phong_ban_id, chuc_danh_id, quan_ly_id, trang_thai, trang_thai_dl, ma_nv, loai_lao_dong FROM nhan_su WHERE id = ?').bind(id).first();
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
  /* ⛔ CHUYỂN SANG KHOÁN VIỆC → PHẢI DỌN DÒNG CA ĐÃ CÓ (ISSUE-1 · REV-0009).
     `loaiLaoDongTuBody` chỉ đổi một chữ trong `nhan_su`, nó KHÔNG đụng tới
     đăng ký ca và lịch làm việc đã tồn tại. Mà kể từ lúc đổi, người đó biến
     mất khỏi ma trận Xếp ca → mọi dòng cũ thành CA MỒ CÔI, kẹt im lặng.
     ~10 bạn kho sắp chuyển đúng đường này, nên chốt chặn phải chạy Ở ĐÂY
     chứ không chỉ ở cửa đăng ký. Không xoá âm thầm: huỷ có ghi `ca_lich_su`,
     phần không được phép đụng thì ĐẾM rồi trả về + ghi `nhan_su_lich_su`. */
  const loaiLaoDongMoi = loaiLaoDongTuBody(b);
  let donCa = null;
  if (loaiLaoDongMoi === 'khoan_viec' && hienCo.loai_lao_dong !== 'khoan_viec') {
    donCa = await ca.donCaKhiChuyenKhoan(env, phien, id);
  }

  const suKien = [];
  const quanLyMoi = String(b.quan_ly_id || '').trim() || null;
  const trangThaiMoi = String(b.trang_thai || 'da_ky').trim();
  if (loaiLaoDongMoi !== hienCo.loai_lao_dong) {
    suKien.push(['doi_loai_lao_dong', hienCo.loai_lao_dong, loaiLaoDongMoi]);
  }
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

  // Dấu vết việc dọn ca — đây là thứ anh Duy đọc lại được trên "Lịch sử hồ
  // sơ", để không bao giờ có chuyện đăng ký biến mất mà không ai biết vì sao.
  if (donCa && (donCa.da_huy_dang_ky || donCa.con_da_duyet || donCa.con_lich_lam_viec)) {
    try {
      await env.DB.prepare(`
        INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_moi, ghi_chu, nguoi_thuc_hien_id, luc)
        VALUES (?, 'don_ca_khoan_viec', ?, ?, ?, datetime('now','+7 hours'))
      `).bind(id,
        `huỷ ${donCa.da_huy_dang_ky} đăng ký chờ`,
        `Chuyển sang Khoán việc: đã huỷ ${donCa.da_huy_dang_ky} đăng ký ca còn chờ. ` +
        `Còn ${donCa.con_da_duyet} đăng ký ĐÃ DUYỆT và ${donCa.con_lich_lam_viec} lịch làm việc ` +
        `sắp tới — hệ thống KHÔNG tự xoá, trưởng phòng cần xem lại và xử lý tay.`,
        phien.nhan_su_id).run();
    } catch { /* chưa nạp migration — bỏ qua */ }
  }

  return json({ ok: true, don_ca: donCa });
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

  // CỬA 5a (REV-0027) — hàm này XOÁ LUÔN tai_khoan bên dưới, nên nó là một
  // đường thứ ba tới cùng một hậu quả: cờ duyệt góp ý biến mất khỏi DB.
  {
    const tkNs = await env.DB.prepare('SELECT id FROM tai_khoan WHERE nhan_su_id = ?').bind(id).first();
    if (tkNs && await laNguoiDuyetGopYCuoiCung(env, tkNs.id))
      return loi(LOI_MAT_NGUOI_DUYET, 409);
  }

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

/* ==========================================================================
   BỐN CỬA CÓ THỂ LÀM BIẾN MẤT NGƯỜI DUYỆT GÓP Ý (REV-0027 L3 + cửa thứ năm)
   --------------------------------------------------------------------------
   qtQuyenDuyetGopY chặn rất chặt "không tắt cái cờ cuối cùng" (409). Nhưng
   cờ nằm trên một DÒNG tai_khoan — mà dòng đó thì admin khoá được, xoá được,
   xoá theo hồ sơ nhân sự được, và đặt lại mật khẩu được. Đo được trước bản vá:
     · khoa-tai-khoan tài khoản Sếp  → 200, cờ vẫn =1 nhưng kich_hoat=0 →
       còn 0 người duyệt ĐANG HOẠT ĐỘNG; Sếp gọi API 401, hết đường uỷ quyền.
     · xoa-tai-khoan                → 200, cờ biến mất khỏi DB.
     · xoa-nhan-su                  → 200, xoá luôn tai_khoan bên dưới (cửa 5a).
     · dat-lai-mat-khau             → 200 + TRẢ THẲNG mật khẩu tạm cho người
       gọi → anh Phong đăng nhập BẰNG TÀI KHOẢN SẾP và duyệt với tên Sếp. Đây
       là cửa nặng nhất: nó không chỉ vượt cổng, nó làm HỒ SƠ DUYỆT NÓI DỐI
       (Rule 10) — lịch sử ghi Sếp duyệt trong khi Sếp không hề bấm (cửa 5b).
   Người bị lấy quyền duyệt không được phép tắt người duyệt, bằng bất kỳ cửa
   nào trong ba cửa đầu.

   CỬA 5b NAY MỞ LẠI THEO Ý SẾP (REV-0030 lỗi 2 — "cho a ấy duyệt khôi phục
   cho tôi đi chứ"): anh Phong BẤM ĐƯỢC (200), nhưng mật khẩu tạm KHÔNG hiện
   ra cho anh — nó đi thẳng vào chat Telegram riêng của Sếp. Chi tiết và năm
   đường rò đã soi: xem ngay trên qtDatLaiMatKhau() bên dưới.

   Đường cứu khi Sếp mất máy / quên mật khẩu / mất luôn Telegram — chạy thẳng
   ở tầng DB, cố ý KHÔNG đi vòng qua tài khoản admin (chép ở ADR-0015):
     · bật lại cờ duyệt:
       npx wrangler d1 execute crm-agc --remote \
         --command "UPDATE tai_khoan SET duyet_gopy = 1 WHERE ten_dang_nhap='<số mới>'"
     · đặt lại MẬT KHẨU (lệnh trên KHÔNG làm được — hash là PBKDF2, không gõ
       tay được; và scripts/tao-tai-khoan.mjs thì ghi seed.sql XOÁ SẠCH dữ
       liệu cũ, chạy trên bản thật là mất công ty):
       node scripts/dat-lai-mat-khau.mjs <số điện thoại> --remote
   ========================================================================== */

/* Tài khoản này có phải NGƯỜI DUY NHẤT còn duyệt được góp ý không?
   Thiếu cột `duyet_gopy` (chưa nạp migration) → coi như chưa có cơ chế cờ,
   trả false: hỏng theo chiều an toàn, không chặn oan việc quản trị. */
async function laNguoiDuyetGopYCuoiCung(env, tkId) {
  try {
    const tk = await env.DB.prepare(
      'SELECT duyet_gopy, kich_hoat FROM tai_khoan WHERE id = ?').bind(tkId).first();
    if (!tk || !tk.duyet_gopy || !tk.kich_hoat) return false;
    const con = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM tai_khoan WHERE duyet_gopy = 1 AND kich_hoat = 1 AND id <> ?')
      .bind(tkId).first();
    return !con || !con.n;
  } catch (e) {
    if (/no such column/i.test(String(e && e.message))) return false;
    throw e;
  }
}

/* Tài khoản này có đang GIỮ cờ duyệt góp ý không (bất kể còn ai khác giữ)? */
async function dangGiuCoDuyetGopY(env, tkId) {
  try {
    const tk = await env.DB.prepare(
      'SELECT duyet_gopy FROM tai_khoan WHERE id = ?').bind(tkId).first();
    return !!(tk && tk.duyet_gopy);
  } catch (e) {
    if (/no such column/i.test(String(e && e.message))) return false;
    throw e;
  }
}

const LOI_MAT_NGUOI_DUYET =
  'Không thể — đây là người DUY NHẤT còn duyệt được góp ý ERP. Bật cờ duyệt cho người thay trước (tab Quản trị), rồi hãy làm việc này.';

/* Đặt lại mật khẩu cho một tài khoản → trả mật khẩu tạm MỘT LẦN.

   ĐƯỜNG KHÔI PHỤC CHO SẾP (Sếp Ngọc chốt 28/08/2026: "cho a ấy duyệt khôi
   phục cho tôi đi chứ") — REV-0030 lỗi 2, thay cho bản 403 cứng của REV-0027.

   VẤN ĐỀ CŨ (cửa 5b): mật khẩu tạm được TRẢ THẲNG cho người bấm, nên anh
   Phong đặt lại mật khẩu tài khoản Sếp là ĐĂNG NHẬP ĐƯỢC BẰNG TÀI KHOẢN SẾP
   và duyệt dưới tên Sếp — hồ sơ duyệt nói dối (Rule 10). REV-0027 bịt bằng
   403, nhưng như thế Sếp mất máy là không còn ai khôi phục hộ được.

   CÁCH LÀM ĐÚNG: TÁCH "AI ĐƯỢC BẤM" KHỎI "AI NHẬN ĐƯỢC MẬT KHẨU".
     · Anh Phong (admin) BẤM ĐƯỢC → 200, không còn 403.
     · Mật khẩu tạm KHÔNG đi qua tay anh: JSON trả về BỎ HẲN trường
       `mat_khau_tam` (bỏ khoá, không phải để rỗng — xem BH-44), mật khẩu đi
       thẳng vào chat Telegram RIÊNG của Sếp với con bot.
     · Anh bấm xong tự đăng nhập ngay thì KHÔNG VÀO ĐƯỢC — đó mới là cái chặn
       thật, chặn bằng đường đi của bí mật chứ không bằng một câu `if`.
     · Chưa cấu hình `TELEGRAM_CHAT_ID_SEP` → 403 như cũ: không có đường giao
       thì không mở cửa.
     · GỬI TRƯỚC, GHI SAU. Telegram không nhận thì KHÔNG đụng vào mật khẩu
       hiện tại — đổi hash rồi mới phát hiện không gửi được là khoá chết tài
       khoản Sếp bằng chính đường cứu.

   NĂM ĐƯỜNG RÒ ĐÃ SOI (mật khẩu tạm không được lọt đường nào):
     (a) JSON trả về            → bỏ hẳn khoá `mat_khau_tam`
     (b) Workers Logs           → KHÔNG console.log/error mật khẩu ở bất kỳ
                                  nhánh nào ([observability] đang bật, admin
                                  Cloudflare đọc được)
     (c) bảng `thong_bao`       → tin báo cho Sếp KHÔNG kèm mật khẩu (bảng này
                                  nằm trong bản sao lưu CSV đẩy lên Drive —
                                  xem MO_TA_BANG.thong_bao trong src/sao-luu.js)
     (d) Telegram NHÓM CHUNG    → tin "[Bảo mật] ai vừa khôi phục cho ai" là
                                  tin KHÁC, không kèm mật khẩu
     (e) `tai_khoan` trong sao lưu → chỉ có hash, đường này vốn sạch, giữ nguyên

   PHÁT HIỆN ĐƯỢC, KHÔNG CẦN CHẶN: cả công ty thấy dòng "[Bảo mật] X vừa khôi
   phục tài khoản Y" trên Telegram nhóm, Sếp nhận thêm một tin trong ERP và
   MỘT DÒNG `nhan_su_lich_su` — không làm lén được. */
async function qtDatLaiMatKhau(req, env) {
  const { phien, loi: l } = await batBuocAdmin(req, env);
  if (l) return l;

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const tkId = parseInt(b.tai_khoan_id, 10);
  if (!tkId) return loi('Thiếu tài khoản');

  const tk = await env.DB.prepare(`
    SELECT t.id, t.ten_dang_nhap, t.nhan_su_id, n.ho_ten
      FROM tai_khoan t LEFT JOIN nhan_su n ON n.id = t.nhan_su_id
     WHERE t.id = ?`).bind(tkId).first();
  if (!tk) return loi('Không tìm thấy tài khoản', 404);

  // Chính chủ tự đặt lại mật khẩu của mình thì không có ai để mượn danh tính —
  // đường cũ, giữ nguyên.
  const khoiPhucHo = tkId !== phien.tai_khoan_id && await dangGiuCoDuyetGopY(env, tkId);

  if (khoiPhucHo && !env.TELEGRAM_CHAT_ID_SEP)
    return loi('Chưa cấu hình kênh riêng để gửi mật khẩu tạm cho người giữ quyền duyệt góp ý ' +
               '(secret TELEGRAM_CHAT_ID_SEP). Không có đường giao an toàn thì không mở cửa này — ' +
               'xem ADR-0015, mục "Đường khôi phục đăng nhập cho ERP Owner".', 403);

  const matKhauTam = sinhMatKhauTam(10);
  const nguoiBam = phien.ho_ten || phien.ten_dang_nhap;
  const luc = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');

  if (khoiPhucHo) {
    // GỬI TRƯỚC KHI GHI. Không gửi được thì tài khoản không bị đụng tới.
    const daGui = await guiTelegram(env,
      `🔑 [ERP] Mật khẩu tạm để đăng nhập lại\n\n` +
      `Tài khoản: ${tk.ten_dang_nhap}\n` +
      `Mật khẩu tạm: ${matKhauTam}\n\n` +
      `Người bấm khôi phục: ${nguoiBam} — lúc ${luc}.\n` +
      `Mật khẩu này KHÔNG hiện ra cho người bấm, chỉ có ở đây.\n` +
      `Đăng nhập xong hệ thống bắt đổi mật khẩu ngay.\n\n` +
      `Nếu bạn KHÔNG yêu cầu việc này: đăng nhập ngay và đổi mật khẩu, rồi hỏi lại ${nguoiBam}.`,
      env.TELEGRAM_CHAT_ID_SEP);
    if (!daGui)
      return loi('Không gửi được mật khẩu tạm vào kênh riêng của ERP Owner — mật khẩu hiện tại ' +
                 'KHÔNG bị thay đổi. Kiểm tra TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID_SEP rồi thử lại.', 502);
  }

  await env.DB.prepare('UPDATE tai_khoan SET mat_khau_hash = ?, phai_doi_mk = 1 WHERE id = ?')
              .bind(await bamMatKhau(matKhauTam), tkId).run();

  // Đá hết phiên cũ của người đó ra — buộc đăng nhập lại bằng mật khẩu mới
  await env.DB.prepare('DELETE FROM phien WHERE tai_khoan_id = ?').bind(tkId).run();

  if (khoiPhucHo) {
    const ten = tk.ho_ten || tk.ten_dang_nhap;
    // (c) — tin trong ERP KHÔNG kèm mật khẩu.
    await guiThongBao(env, null,
      `[Bảo mật] ${nguoiBam} vừa khôi phục đăng nhập cho tài khoản của bạn lúc ${luc}. ` +
      `Mật khẩu tạm đã gửi thẳng vào Telegram riêng của bạn, không qua tay ai. ` +
      `Nếu không phải bạn yêu cầu, hãy đăng nhập và đổi mật khẩu ngay.`,
      'bao_mat', null, tk.nhan_su_id);
    // Không phải chỉ một dòng log: một dòng SỰ KIỆN trong hồ sơ nhân sự.
    if (tk.nhan_su_id && phien.nhan_su_id) {
      try {
        await env.DB.prepare(`
          INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_cu, gia_tri_moi,
                                       nguoi_thuc_hien_id, ghi_chu, luc)
          VALUES (?, 'khoi_phuc_dang_nhap', NULL, ?, ?, ?, datetime('now', '+7 hours'))`)
          .bind(tk.nhan_su_id, tk.ten_dang_nhap, phien.nhan_su_id,
                `${nguoiBam} khôi phục đăng nhập hộ. Mật khẩu tạm gửi thẳng kênh riêng của ERP Owner, ` +
                `KHÔNG hiện cho người bấm.`).run();
      } catch (e) { console.error('Ghi nhan_su_lich_su khôi phục đăng nhập:', e.message); }
    }
    // (d) — Telegram NHÓM CHUNG: cả công ty thấy, không kèm mật khẩu.
    guiTelegram(env,
      `🔐 [Bảo mật] ${nguoiBam} vừa khôi phục đăng nhập cho ${ten} (${tk.ten_dang_nhap}) lúc ${luc}. ` +
      `Mật khẩu tạm KHÔNG đi qua tay người bấm — gửi thẳng cho chủ tài khoản.`).catch(() => {});
    // (a) — BỎ HẲN khoá `mat_khau_tam` khỏi thân trả về.
    return json({ ok: true, ten_dang_nhap: tk.ten_dang_nhap, da_gui_kenh_rieng: true });
  }

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

  // REV-0027 L3 — khoá tài khoản người duyệt cuối cùng = tắt cổng duyệt góp ý
  // bằng cửa sau: cờ vẫn còn trên dòng đó nhưng kich_hoat = 0 nên không ai
  // duyệt được, và chính người đó cũng 401 nên hết đường uỷ quyền cho ai.
  if (!kichHoat && await laNguoiDuyetGopYCuoiCung(env, tkId))
    return loi(LOI_MAT_NGUOI_DUYET, 409);

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

/* BẬT/TẮT CỜ "DUYỆT GÓP Ý ERP Ở CẤP CUỐI" — POST /api/quan-tri/quyen-duyet-gopy
   ---------------------------------------------------------------------------
   Đây là cái làm cho quyết định 28/08/2026 của Sếp Ngọc KHÔNG bị đóng đinh
   vào code: đổi người duyệt là bật/tắt một cái công tắc, không sửa file,
   không deploy, không chờ ai. Đi vắng thì bật tạm cho người khác, về thì tắt.

   AI ĐƯỢC BẤM: CHỈ người ĐANG GIỮ cờ — cố ý KHÔNG dùng batBuocAdmin.
   Nếu để admin bật được thì anh Phong tự bật cho mình trong 5 giây và cả
   thay đổi này thành vô nghĩa. Quyền chỉ đi ra từ tay người đang có nó.

   CHẶN TỰ KHOÁ CHÍNH MÌNH RA NGOÀI: không tắt được cái cờ CUỐI CÙNG. Sếp là
   người duy nhất duyệt — tắt nhầm cờ của chính mình là cả hàng góp ý đứng
   và không còn ai bật lại được ngoài lệnh wrangler gõ tay. Muốn chuyển giao
   thì BẬT cho người mới trước, rồi mới TẮT của mình. */
async function qtQuyenDuyetGopY(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  if (!duocDuyetGopY(phien))
    return loi('Chỉ người đang giữ quyền duyệt góp ý mới cấp/thu được quyền này', 403);

  let b;
  try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const tkId = parseInt(b.tai_khoan_id, 10);
  if (!tkId) return loi('Thiếu tài khoản');
  const bat = b.bat === true || b.bat === 1 || b.bat === '1';

  const tk = await env.DB.prepare(
    'SELECT id, ten_dang_nhap, kich_hoat, duyet_gopy FROM tai_khoan WHERE id = ?').bind(tkId).first();
  if (!tk) return loi('Không tìm thấy tài khoản', 404);
  if (bat && !tk.kich_hoat)
    return loi('Tài khoản này đang bị khoá — mở khoá trước đã', 400);

  if (!bat && tk.duyet_gopy) {
    const con = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM tai_khoan WHERE duyet_gopy = 1 AND kich_hoat = 1 AND id <> ?')
      .bind(tkId).first();
    if (!con || !con.n)
      return loi('Không thể tắt — đây là người DUY NHẤT còn duyệt được góp ý. Bật cho người thay trước, rồi hãy tắt.', 409);
  }

  await env.DB.prepare('UPDATE tai_khoan SET duyet_gopy = ? WHERE id = ?')
    .bind(bat ? 1 : 0, tkId).run();
  return json({ ok: true, duyet_gopy: bat ? 1 : 0 });
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

  // REV-0027 L3 — xoá hẳn dòng tai_khoan là làm cờ duyệt biến mất khỏi DB.
  if (await laNguoiDuyetGopYCuoiCung(env, tkId)) return loi(LOI_MAT_NGUOI_DUYET, 409);

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
/* TRẢ VỀ true/false (REV-0019 L6): có chỉ mục DUY NHẤT chặn tin nhắc việc
   trùng (loại, người, ngày) nên INSERT thứ hai của hai lượt cron chồng nhau
   sẽ TRƯỢT — và đó là đúng ý. Người gọi cần biết để đếm số tin ĐÃ GỬI THẬT
   chứ không đếm số lần định gửi. Mọi lời gọi cũ bỏ qua giá trị trả về nên
   không có gì đổi hành vi. */
async function guiThongBao(env, nhom, noiDung, loai, lienKet, nguoiNhanId) {
  try {
    await env.DB.prepare(
      `INSERT INTO thong_bao (nhom, noi_dung, loai, lien_ket, nguoi_nhan_id, tao_luc)
       VALUES (?, ?, ?, ?, ?, datetime('now','+7 hours'))`
    ).bind(nhom || 'ca_nhan', noiDung, loai || null, lienKet || null, nguoiNhanId || null).run();
    return true;
  } catch (e) { console.error('Gửi thông báo:', e.message); return false; }
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

/* ==========================================================================
   "VIỆC CỦA TÔI HÔM NAY" + màn quản lý + bảng ghi nhận  ·  SPEC-0004 câu 5–7
   ---------------------------------------------------------------------------
   MỘT endpoint trả cả ba khối, vì cả ba đọc CÙNG một bộ dữ liệu — tách ba
   endpoint là kéo cùng bảng ba lần cho một lần mở màn hình.
   EXCEPTION-FIRST: chỉ trả thứ BẤT THƯỜNG. Không có gì thì trả mảng rỗng và
   giao diện giấu cả khối — KHÔNG hiện "Bạn không có việc quá hạn 🎉". Một
   khối luôn có mặt là một khối mắt người học được cách bỏ qua trong đúng một
   tuần.
   KHÔNG mở rộng quyền xem: mọi thứ ở đây đều là dữ liệu người đó vốn đã xem
   được trong tab "Lịch sử làm việc" (mở cho mọi vai trò, Sếp Ngọc chốt
   21/08/2026 — minh bạch theo tinh thần MBOs). Đây là GOM LẠI, không phải MỞ
   THÊM — cũng là lý do SPEC-0004 không phải CORE_CHANGE. */
async function cvHomNay(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  /* REV-0019 L8 — CỔNG QUYỀN, đừng dựa vào "hôm nay vai nào cũng có tab".
     Khối ① nằm trong tab Trạm Mục Tiêu → cần `congviec`. Khối ② và ③ trả dữ
     liệu TOÀN CÔNG TY, và lý do chúng được phép trả là vì người đó vốn đã
     xem được tab `lichsuviec` — nên phải hỏi ĐÚNG cái quyền đó, chứ không
     phải tin rằng cả 10 vai đều đang có nó (BH-43: hỏi ràng buộc áp cho
     NHÁNH NÀO, không chỉ hỏi nó có mặt chưa). Ngày nào Sếp gỡ `lichsuviec`
     của một vai, chỗ này tự khoá theo. */
  if (!duocXemTab(phien.vai_tro, 'congviec')) return loi('Bạn không có quyền', 403);
  const xemToanCty = duocXemTab(phien.vai_tro, 'lichsuviec');
  const toiId = phien.nhan_su_id;

  // `nhan_viec_luc` chỉ có sau `va-nhacviec-rev0019.sql`; chưa nạp thì chạy ở
  // mức suy giảm (không có ghi chú "vừa nhận việc"), KHÔNG trả 500.
  const cauMo = (cot) => env.DB.prepare(`
      SELECT id, tieu_de, trang_thai, han_chot, tao_luc, nop_luc${cot},
             nguoi_nhan_id, nguoi_nhan_ten, nguoi_giao_id, nguoi_giao_ten
        FROM cong_viec WHERE trang_thai IN ('moi','dang_lam','cho_duyet')
    `).all();
  let moDs;
  try { moDs = await cauMo(', nhan_viec_luc'); } catch { moDs = await cauMo(''); }
  const nsDs = await env.DB.prepare('SELECT id, ho_ten, bo_phan, quan_ly_id, dang_lam FROM nhan_su').all();
  const mo = moDs.results || [];
  const banDo = new Map((nsDs.results || []).map(n => [n.id, n]));

  const vn = gioVN(new Date());
  const homNay = `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;

  /* ---- ① Việc của TÔI hôm nay ------------------------------------------ */
  const toi = { qua_han: [], den_han_hom_nay: [], chua_bat_dau: [], cho_toi_duyet: [] };
  for (const v of mo) {
    const tre = v.han_chot ? soNgayGiua(v.han_chot, homNay) : null;
    /* Việc đã NỘP (`cho_duyet`) KHÔNG hiện trong khối của người nhận, kể cả
       khi quá hạn: họ đã làm xong phần của mình và không có nút nào để bấm.
       Hiện chữ đỏ "trễ 3 ngày" cho người đang đứng chờ người khác duyệt là đổ
       lỗi sai người — đúng cái lỗi mà cột `nop_luc` sinh ra để tránh. Việc đó
       chỉ hiện ở khối 🟣 "đang chờ BẠN duyệt" của NGƯỜI GIAO. */
    if (v.nguoi_nhan_id === toiId && v.trang_thai !== 'cho_duyet') {
      /* REV-0019 L2 — người vừa nhận bàn giao một việc ĐÃ trễ từ trước không
         được để màn hình gằn "trễ 9 ngày" vào mặt mà không nói gì thêm.
         `nhan_cach_day` để giao diện ghi rõ "bạn nhận việc N ngày trước". */
      const mocCam = String(v.nhan_viec_luc || v.tao_luc || '').slice(0, 10);
      const ngayCam = soNgayGiua(mocCam, homNay);
      const nhanCachDay = (soNgayGiua(v.han_chot, mocCam) ?? 0) > 0 && ngayCam !== null ? ngayCam : null;
      if (tre !== null && tre > 0) toi.qua_han.push({ ...v, tre, nhan_cach_day: nhanCachDay });
      else if (tre === 0) toi.den_han_hom_nay.push(v);
      else if (v.trang_thai === 'moi') {
        const dong = soNgayGiua(String(v.tao_luc || '').slice(0, 10), homNay);
        if (dong !== null && dong >= 3) toi.chua_bat_dau.push({ ...v, dong });
      }
    }
    /* 🟣 "Đang chờ BẠN duyệt" — thứ hôm nay CHƯA CÓ Ở ĐÂU CẢ, và là lời giải
       trực tiếp cho lỗ hổng đau nhất: nhân viên nộp xong, người giao quên
       duyệt, việc chết ở giữa và người chịu tiếng là nhân viên.
       Chữ BẠN in đậm ở giao diện là cố ý — người giao việc thường không nghĩ
       mình đang là người làm chậm. */
    if (v.trang_thai === 'cho_duyet' && v.nguoi_giao_id === toiId && v.nguoi_nhan_id !== toiId) {
      const dong = v.nop_luc ? soNgayGiua(String(v.nop_luc).slice(0, 10), homNay) : null;
      toi.cho_toi_duyet.push({ ...v, dong });
    }
  }
  toi.qua_han.sort((a, b) => b.tre - a.tre);

  /* ---- ② "Ai đang đọng việc" — GỘP THEO NGƯỜI, không theo phòng ban -----
     Công ty 20 người: gộp theo phòng ban cho ra 4–5 dòng vô danh ("Kho vận: 7
     việc quá hạn"), Sếp nhìn xong vẫn phải bấm tiếp mới biết AI. Gộp theo
     người cho ra ngay câu Sếp hỏi.
     Anh Duy dùng CÙNG màn này, chỉ khác phạm vi — đúng kênh Kho → anh Duy →
     Sếp, không đẻ định nghĩa "quản lý" thứ hai. */
  const duoiQuyen = new Set((nsDs.results || []).filter(n => n.quan_ly_id === toiId && n.id !== toiId).map(n => n.id));
  const laOwner = laAdmin(phien.vai_tro);
  let quanLy = null;
  // `xemToanCty` = có tab `lichsuviec`. Đây là NGUỒN quyền của khối này, xem
  // ghi chú ở đầu hàm (REV-0019 L8).
  if (xemToanCty && (laOwner || duoiQuyen.size)) {
    const trongPhamVi = (id) => laOwner || duoiQuyen.has(id);
    const theoNguoi = new Map();
    const lay = (id, ten) => {
      if (!theoNguoi.has(id)) theoNguoi.set(id, { nhan_su_id: id, ho_ten: ten, qua_han: 0, tre_nhat: 0, cho_duyet: 0, dong_nhat: 0 });
      return theoNguoi.get(id);
    };
    for (const v of mo) {
      const tre = v.han_chot ? soNgayGiua(v.han_chot, homNay) : null;
      // Việc đã nộp không tính là "người này đang đọng" — nó đang đọng ở
      // người DUYỆT, và được đếm riêng ở nhánh dưới.
      if (v.trang_thai !== 'cho_duyet' && tre !== null && tre > 0 && trongPhamVi(v.nguoi_nhan_id)) {
        const d = lay(v.nguoi_nhan_id, v.nguoi_nhan_ten);
        d.qua_han++; d.tre_nhat = Math.max(d.tre_nhat, tre);
      }
      /* NGƯỜI QUẢN LÝ BỊ SOI NGANG HÀNG NGƯỜI LÀM: dòng của anh Duy không
         phải việc anh trễ, mà là việc của team ĐANG CHỜ CHÍNH ANH duyệt. Bảng
         này chỉ soi người làm thì nó là bảng đổ lỗi, không phải bảng quản
         trị. Không có cột "tổng số việc đã làm", không xếp hạng ai giỏi hơn
         ai (điều cấm 20). */
      if (v.trang_thai === 'cho_duyet' && v.nguoi_nhan_id !== v.nguoi_giao_id
          && (laOwner || v.nguoi_giao_id === toiId || duoiQuyen.has(v.nguoi_giao_id))) {
        const dong = v.nop_luc ? (soNgayGiua(String(v.nop_luc).slice(0, 10), homNay) ?? 0) : 0;
        const d = lay(v.nguoi_giao_id, v.nguoi_giao_ten);
        d.cho_duyet++; d.dong_nhat = Math.max(d.dong_nhat, dong);
      }
    }
    quanLy = {
      pham_vi: laOwner ? 'cong_ty' : 'team',
      // ⚠️ ở giao diện = quá 7 ngày: nhắc máy đã hết tác dụng, cần NGƯỜI vào cuộc.
      dong_viec: [...theoNguoi.values()].sort((a, b) => (b.tre_nhat - a.tre_nhat) || (b.dong_nhat - a.dong_nhat))
    };
  }

  /* ---- ③ "Đáng ghi nhận tuần này" --------------------------------------
     Hôm nay hệ thống CHỈ làm nổi bật cái trễ. Một hệ chỉ biết réo người trễ
     sẽ khiến nhân viên SỢ Trạm Mục Tiêu và tránh nhận việc có hạn chót rõ
     ràng — phản tác dụng ngay trên chính mục tiêu MBOs.
     Chấm đúng hạn bằng `nop_luc`, KHÔNG bằng `cap_nhat_luc`: người làm không
     bị tính trễ vì quản lý duyệt muộn. Việc cũ `nop_luc IS NULL` đứng ngoài —
     không vào bảng khen, cũng KHÔNG bị đánh dấu trễ.
     KHÔNG xếp hạng, KHÔNG đếm số việc, KHÔNG có "quán quân tuần": đây là danh
     sách NHỮNG LẦN LÀM TỐT, không phải bảng thi đua. Sắp theo thời gian gần
     nhất, không theo số lượng — sắp theo số lượng là lách điều cấm 20 bằng
     cửa sau. */
  let ghiNhan = [];
  // Cổng quyền đứng NGOÀI try/catch: hết quyền là trả rỗng có chủ đích, không
  // lẫn với "chưa nạp migration" (REV-0019 L8).
  if (xemToanCty) try {
    const { results } = await env.DB.prepare(`
      SELECT id, tieu_de, nguoi_nhan_id, nguoi_nhan_ten, han_chot, nop_luc
        FROM cong_viec
       WHERE trang_thai = 'hoan_thanh' AND nop_luc IS NOT NULL AND han_chot IS NOT NULL
         AND date(nop_luc) <= han_chot
         AND cap_nhat_luc >= datetime('now','-7 days','+7 hours')
         AND nguoi_nhan_id <> ?
       ORDER BY nop_luc DESC LIMIT 10
    `).bind(toiId).all();
    // Loại chính mình: bảng này để KHEN NGƯỜI KHÁC. Gợi ý một người tự bấm
    // "⭐ Ghi nhận" cho chính họ là biến lời khen thành thứ tự phát — hỏng hết
    // ý nghĩa của Vinh danh, vốn là lời khen từ MỘT NGƯỜI.
    ghiNhan = (results || []).map(v => ({
      ...v, som: soNgayGiua(String(v.nop_luc).slice(0, 10), v.han_chot) ?? 0
    }));
  } catch { /* chưa nạp migration → bảng ghi nhận rỗng, phần còn lại vẫn chạy */ }

  let nhacTat = 0;
  try {
    const r = await env.DB.prepare('SELECT nhac_viec_tat FROM tai_khoan WHERE nhan_su_id = ?').bind(toiId).first();
    nhacTat = r?.nhac_viec_tat ? 1 : 0;
  } catch { /* chưa nạp migration → coi như đang bật */ }

  return json({ toi, quan_ly: quanLy, ghi_nhan: ghiNhan, nhac_tat: nhacTat, hom_nay: homNay });
}

/* CHỐNG LÀM PHIỀN #6 — cho người dùng TỰ TẮT NGAY TRONG ỨNG DỤNG.
   Nghe như tự phá hệ thống, nhưng ngược lại: không cho tắt trong app thì
   người ta tắt chuông ở tầng điện thoại, và lúc đó MẤT SẠCH khả năng nhìn
   thấy — kéo chết luôn cảnh báo đơn hoàn đang chạy tốt. Tắt trong ERP thì Sếp
   còn thấy ai đã tắt và còn hỏi được vì sao.
   TẮT NHẮC KHÔNG TẮT TRÁCH NHIỆM: leo cấp lên quản lý và bản tin tuần của Sếp
   KHÔNG bị cột này chặn (xem `nhac-cong-viec.js`). */
async function cvNhacTat(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  if (!duocXemTab(phien.vai_tro, 'congviec')) return loi('Bạn không có quyền', 403);  // REV-0019 L8
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const tat = b.tat ? 1 : 0;
  // Chỉ đổi được cờ CỦA CHÍNH MÌNH — không có tham số nhận id người khác.
  await env.DB.prepare('UPDATE tai_khoan SET nhac_viec_tat = ? WHERE nhan_su_id = ?')
    .bind(tat, phien.nhan_su_id).run();
  return json({ ok: true, nhac_tat: tat });
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

  /* `nop_luc` — MỐC NGƯỜI LÀM NỘP, ghi ở ĐÚNG MỘT CHỖ là đây (SPEC-0004).
     `cap_nhat_luc` bên cạnh là mốc bản ghi bị sửa lần cuối; khi việc thành
     'hoan_thanh' thì đó là lúc NGƯỜI GIAO bấm duyệt. Chấm "đúng hạn" bằng nó
     sẽ ghi nhận SAI NGƯỜI: nhân viên nộp đúng hạn 29/08, quản lý bận tới
     31/08 mới duyệt → hệ thống ghi "nhân viên trễ 2 ngày".
     TRẢ LẠI LÀM TIẾP (cho_duyet -> dang_lam) thì XOÁ về NULL: việc chưa xong
     thì lần nộp cũ không còn là sự thật nữa. Giữ lại "cho đẹp" nghĩa là nộp
     một bản chưa đạt vẫn được tính đúng hạn — cả cơ chế ghi nhận thành trò
     đùa. Nộp lại lần sau ghi `nop_luc` mới, và ĐÓ mới là mốc tính đúng hạn.
     Mọi trạng thái khác KHÔNG đụng tới cột này. */
  const nopLuc = trangThaiMoi === 'cho_duyet' ? 'MOI'
    : (trangThaiMoi === 'dang_lam' && cv.trang_thai === 'cho_duyet') ? 'XOA' : null;
  await env.DB.prepare(`
    UPDATE cong_viec SET trang_thai = ?, ket_qua = COALESCE(?, ket_qua), cap_nhat_luc = datetime('now','+7 hours')
    ${nopLuc === 'MOI' ? ", nop_luc = datetime('now','+7 hours')" : nopLuc === 'XOA' ? ', nop_luc = NULL' : ''}
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
  const { phien, loi: l } = await batBuocDangNhap(req, env);
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

  /* GỢI Ý NGƯỜI ĐÁNG KHEN — ĐÃ ĐỔI CÁCH TÍNH (SPEC-0004 câu 7).
     Bản cũ gợi ý theo `COUNT(*)` việc hoàn thành trong 7 ngày, tức là ĐANG
     XẾP HẠNG NĂNG SUẤT: ai làm nhiều việc nhất thì được khen. Đó là điều cấm
     20 của Hiến pháp (không đo năng suất cá nhân), và nó dạy người ta chia
     nhỏ việc + chọn việc dễ để lên đầu bảng.
     Bản mới gợi ý theo MỘT LẦN LÀM TỐT CỤ THỂ: việc gần nhất nộp ĐÚNG HẠN.
     Không đếm, không xếp hạng, không có "quán quân tuần".
     Đúng hạn chấm bằng `nop_luc` (lúc NGƯỜI LÀM nộp) chứ KHÔNG phải
     `cap_nhat_luc` (lúc NGƯỜI GIAO bấm duyệt) — nếu không, người nộp đúng hạn
     mà quản lý duyệt muộn sẽ bị ghi nhận là trễ. Việc cũ chưa có `nop_luc`
     thì đứng ngoài: không có dữ liệu thì không phán, cả khen lẫn chê. */
  let goiY = null;
  try {
    goiY = await env.DB.prepare(`
      SELECT nguoi_nhan_id, nguoi_nhan_ten, tieu_de, han_chot, nop_luc
        FROM cong_viec
       WHERE trang_thai = 'hoan_thanh'
         AND nop_luc IS NOT NULL AND han_chot IS NOT NULL
         AND date(nop_luc) <= han_chot
         AND cap_nhat_luc >= datetime('now', '-7 days', '+7 hours')
         AND nguoi_nhan_id <> ?
       ORDER BY nop_luc DESC
       LIMIT 1
    `).bind(phien.nhan_su_id).first();   // không gợi ý người xem tự khen mình
  } catch { /* chưa nạp them-congviec-nhacviec.sql → không gợi ý, không vỡ */ }

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

/* Gửi cảnh báo qua Telegram. Chưa cấu hình token/chat thì bỏ qua êm (trả false).

   THAM SỐ `chatId` (REV-0030 lỗi 2): mặc định vẫn là `env.TELEGRAM_CHAT_ID`
   — CHAT DÙNG CHUNG của công ty, có cả anh Phong. Mọi lời gọi cũ không đổi
   một chữ. Truyền `env.TELEGRAM_CHAT_ID_SEP` để gửi vào chat 1-1 giữa Sếp và
   CHÍNH CON BOT NÀY (Sếp nhắn /start cho bot một lần, lấy chat id, rồi
   `npx wrangler secret put TELEGRAM_CHAT_ID_SEP`).

   VÌ SAO KHÔNG ĐẺ CƠ CHẾ THỨ HAI: ERP chưa từng gửi mail (grep smtp|resend|
   mailgun|MailChannels ra 0 kết quả) và `guiThongBao` thì nằm TRONG ERP —
   vô dụng đúng lúc Sếp không đăng nhập được. Mở rộng một tham số của hàm đã
   chạy thật là đường rẻ nhất và ít mặt hỏng nhất. Chi phí 0. */
async function guiTelegram(env, text, chatId = null) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const dich = chatId || env.TELEGRAM_CHAT_ID;
  if (!token || !dich) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: dich, text, disable_web_page_preview: true })
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
  'moi', 'cho_phan_tich', 'dang_phan_tich', 'cho_quyet_dinh', 'da_duyet', 'dang_lam',
  'dang_kiem_tra', 'can_chinh_sua', 'cho_nghiem_thu', 'nghiem_thu_chua_dat',
  'san_sang_phat_hanh', 'hoan_thanh', 'bi_chan', 'bi_tu_choi', 'da_huy'
];
// Mốc cần phát ERP UPDATE (Telegram + chuông trong app) — spec mục 8.
const GOPY_MOC_THONG_BAO = new Set(['cho_phan_tich', 'cho_quyet_dinh', 'da_duyet', 'can_chinh_sua',
  'cho_nghiem_thu', 'hoan_thanh', 'bi_chan', 'bi_tu_choi']);
const GOPY_TRANG_THAI_NHAN = {
  moi: 'Chờ duyệt', dang_phan_tich: 'Đang phân tích', dang_lam: 'Đang làm',
  dang_kiem_tra: 'Đang kiểm tra', nghiem_thu_chua_dat: 'Nghiệm thu chưa đạt',
  san_sang_phat_hanh: 'Sẵn sàng phát hành',
  cho_phan_tich: 'Đã duyệt — chờ phân tích', cho_quyet_dinh: 'Chờ quyết định',
  da_duyet: 'Đã duyệt làm', can_chinh_sua: 'Cần chỉnh sửa', cho_nghiem_thu: 'Chờ nghiệm thu',
  hoan_thanh: 'Hoàn thành', bi_chan: 'Đang bị chặn', bi_tu_choi: 'Chưa được duyệt', da_huy: 'Đã huỷ'
};

/* ---- SPEC-0002 — Cổng duyệt phân cấp ------------------------------------
   VAN XẢ NHANH (Rollback mục 5): đặt false thì ma trận chuyển trạng thái VẪN
   chạy (trạng thái thôi nói dối, bằng chứng vẫn bắt buộc) nhưng HAI CỔNG
   DUYỆT tự vượt. Tách được "chống nói dối" khỏi "phân cấp duyệt", lùi được
   từng nửa một mà không cần revert code. */
const CONG_DUYET_BAT = true;

/* Ai đang cầm việc. KHÔNG nhồi vào nguoi_phu_trach_id (cột đó trỏ nhân sự
   thật — nhồi 'HOLY'/'KHIDOT' vào là phải tạo hồ sơ nhân sự giả, hỏng Danh
   bạ/Chấm công/bảng lương, Rule 9). */
const GOPY_OWNER_HOP_LE = new Set(['NGUOI_GUI', 'QL_CAP1', 'OWNER', 'GAO', 'HOLY', 'KHIDOT', 'RUNNER', 'NONE']);
// [current_owner, next_owner] backend TỰ TÍNH sau mỗi lần chuyển — client
// KHÔNG được gửi hai cột này lên.
const GOPY_OWNER_THEO_TT = {
  moi:                 ['NGUOI_GUI', 'QL_CAP1'],
  bi_tu_choi:          ['NGUOI_GUI', 'NGUOI_GUI'],
  cho_quyet_dinh:      ['OWNER',     'OWNER'],
  cho_phan_tich:       ['HOLY',      'HOLY'],
  dang_phan_tich:      ['HOLY',      'OWNER'],
  da_duyet:            ['OWNER',     'KHIDOT'],
  dang_lam:            ['KHIDOT',    'KHIDOT'],
  dang_kiem_tra:       ['KHIDOT',    'HOLY'],
  can_chinh_sua:       ['KHIDOT',    'KHIDOT'],
  cho_nghiem_thu:      ['NGUOI_GUI', 'NGUOI_GUI'],
  nghiem_thu_chua_dat: ['KHIDOT',    'KHIDOT'],
  san_sang_phat_hanh:  ['OWNER',     'OWNER'],
  hoan_thanh:          ['NONE',      'NONE'],
  da_huy:              ['NONE',      'NONE'],
  bi_chan:             ['OWNER',     'OWNER']
};
const GOPY_RISK_BAC = { LOW: 1, MEDIUM: 2, HIGH: 3 };
const GOPY_RISK_NHAN = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' };
const GOPY_SLA_NHAC_NGAY    = 3;   // ADR-0006 B3 — nhắc lại ở ngày thứ 3
const GOPY_SLA_LEN_SEP_NGAY = 5;   // ADR-0006 B3 — im lặng 5 ngày thì tự lên Sếp
const GOPY_SLA_NGHIEM_THU_NGAY = 7;
const GOPY_GUI_LAI_LEN_SEP  = 3;   // gửi lại lần thứ 3 trở đi thì lên thẳng Sếp

/* Ai là người duyệt cấp 1 của người gửi — viết MỘT LẦN dưới dạng biểu thức
   SQL để danh sách, cổng duyệt và SLA dùng chung đúng một luật (Rule 1: một
   sự thật, một nguồn). Cần bí danh bảng `n` là nhan_su của NGƯỜI GỬI.

   ADR-0006 B1: nhan_su.quan_ly_id THẮNG; phong_ban.truong_phong_id chỉ là
   đường lui khi quan_ly_id trống.

   ĐƯỜNG LUI NỐI BẰNG KHOÁ, KHÔNG NỐI BẰNG TÊN (REV-0016 mục 1 · BH-32):
   nhan_su CÓ cột phong_ban_id (migrations/them-danhmuc-nen.sql:34; chính file
   này đã dùng ở :493 và :554). Bản trước khai nhầm là "không có" vì chỉ đọc
   schema.sql — phải grep migrations/ mới thấy đủ.

   Vì sao nối theo TÊN là hỏng: dulieunen.js đổi tên phòng ban chỉ chạy
   UPDATE phong_ban SET ten = ?, KHÔNG cập nhật lại nhan_su.bo_phan. Đổi tên
   một phòng là cả phòng đó mất quản lý cấp 1 → rơi hết lên Sếp duyệt, đúng
   thứ cổng này sinh ra để tránh.

   Lớp 3 là ĐƯỜNG LUI CÓ KHAI BÁO cho người còn phong_ban_id NULL (bản thật
   28/08: 2/24 người, ví dụ Vũ Lan Hương). Nó CHỈ chạy khi phong_ban_id NULL,
   nên người đã có id thì tên phòng lệch cũng không kéo nhầm ai. */
const GOPY_SQL_QL1 = `COALESCE(
    (SELECT q.id FROM nhan_su q
      WHERE q.id = n.quan_ly_id AND q.dang_lam = 1 AND q.id <> n.id),
    (SELECT pb.truong_phong_id FROM phong_ban pb
      WHERE pb.hoat_dong = 1 AND pb.truong_phong_id IS NOT NULL AND pb.truong_phong_id <> n.id
        AND n.phong_ban_id IS NOT NULL AND pb.id = n.phong_ban_id LIMIT 1),
    (SELECT pb.truong_phong_id FROM phong_ban pb
      WHERE pb.hoat_dong = 1 AND pb.truong_phong_id IS NOT NULL AND pb.truong_phong_id <> n.id
        AND n.phong_ban_id IS NULL
        AND LOWER(TRIM(pb.ten)) = LOWER(TRIM(n.bo_phan)) LIMIT 1)
  )`;
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
  // Từ SPEC-0002, đích sau khi qua cổng duyệt là 'cho_phan_tich' (HIGH phải
  // dừng ở 'cho_quyet_dinh' để Sếp ghi quyết định bằng văn bản). Cột này vẫn
  // chỉ là ĐỀ XUẤT — AI không có đường tắt tự ghi vào trang_thai thật.
  const trangThaiDeXuat = riskHopLe === 'HIGH' ? 'cho_quyet_dinh' : 'cho_phan_tich';

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

  /* REV-0030 lỗi 6 — QUÉT CẢ 'cho_phan_tich'. Từ Việc 7, góp ý của người giữ
     cờ (Sếp) vào THẲNG 'cho_phan_tich', không đi qua 'moi' một giây nào. Câu
     cũ chỉ quét 'moi' nên góp ý CỦA CHÍNH SẾP không bao giờ được Hồ Ly chấm
     (đo được: de_xuat_risk = null, tu_dong_xu_luc = null) — Sếp mất bản nháp
     `de_xuat_spec` cho đúng những việc mình quan tâm nhất. Cùng ca đó xảy ra
     với mọi góp ý được duyệt nhanh hơn nhịp cron 5 phút.
     `tu_dong_xu_luc IS NULL` vẫn là chốt chặn: mỗi dòng chỉ chấm ĐÚNG MỘT
     LẦN, thêm trạng thái vào đây không làm máy chấm lại cái đã chấm. Và hàm
     này vẫn CHỈ ghi các cột de_xuat_* — không có đường nào tự đổi trang_thai. */
  const { results } = await env.DB.prepare(`
    SELECT id, tieu_de, boi_canh, vuong_o_dau, mong_muon, tan_suat, khu_vuc
      FROM gop_y WHERE trang_thai IN ('moi', 'cho_phan_tich') AND tu_dong_xu_luc IS NULL
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

  /* ---- VIỆC 7 — KHÔNG AI DUYỆT GÓP Ý CỦA CHÍNH MÌNH --------------------
     Sếp Ngọc 28/08/2026, sau khi dùng thật: "lỗi của tôi tự góp ý mà vẫn bắt
     tôi duyệt, bị ngu à :))))". Đúng: một cái cổng bắt người ta gật với chính
     mình thì không phải cổng duyệt, chỉ là một cú bấm thừa mỗi ngày.

       · NGƯỜI GIỮ CỜ DUYỆT (Sếp) gửi → vào thẳng 'cho_phan_tich', không qua
         cửa nào. Không có ai ở trên để duyệt, và tự gật với mình thì không
         thêm được sự thật nào.
       · KHÔNG CÓ AI Ở CẤP 1 (điển hình là quản lý phòng / trưởng phòng —
         GOPY_SQL_QL1 đã loại chính mình bằng `<> n.id`) → bỏ qua cổng 1, đi
         thẳng lên Sếp. Trước bản vá việc này nằm ở next_owner='QL_CAP1' chờ
         một người KHÔNG TỒN TẠI, và chỉ thoát ra được nhờ SLA sau 5 ngày.
       · Nhân viên thường → nguyên như cũ: quản lý cấp 1 rồi mới tới Sếp.

     BỎ QUA NHƯNG KHÔNG ÂM THẦM: mỗi ca bỏ qua ghi MỘT DÒNG lịch sử nói rõ vì
     sao, để sau này không ai phải đoán vì sao góp ý đó không có dấu duyệt.

     VÒNG LẶP (Sếp vừa giữ cờ, vừa là quản lý cấp 1 của chính mình): nhánh cờ
     xét TRƯỚC và `return` luôn, nên không có đường nào chạy hai nhánh. Ở tầng
     dưới, GOPY_SQL_QL1 cũng đã cấm một người làm quản lý cấp 1 của chính mình. */
  const nguoiGuiGiuCo = duocDuyetGopY(phien);
  const ql1 = await nguoiDuyetCap1(env, phien.nhan_su_id);
  // Người giữ cờ: chốt luôn mức rủi ro theo đề xuất máy (chưa có thì MEDIUM,
  // đúng sàn an toàn của cổng duyệt) — nếu không thì việc này kẹt ở bước
  // 'da_duyet' vì `canRisk` mà không còn cổng nào để chốt rủi ro nữa.
  const tt = nguoiGuiGiuCo ? 'cho_phan_tich' : 'moi';
  const [cur, nxt] = nguoiGuiGiuCo ? GOPY_OWNER_THEO_TT.cho_phan_tich
                   : (!ql1.id ? ['NGUOI_GUI', 'OWNER'] : GOPY_OWNER_THEO_TT.moi);

  const r = await env.DB.prepare(`
    INSERT INTO gop_y (nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon, tan_suat, khu_vuc, dinh_kem,
                       trang_thai, current_owner, next_owner, tao_luc,
                       risk, risk_chot_boi_id, risk_chot_luc,
                       duyet_cap1_boi_id, duyet_cap1_luc, duyet_cap1_nguon,
                       duyet_owner_boi_id, duyet_owner_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'),
            ?, ?, ${nguoiGuiGiuCo ? "datetime('now', '+7 hours')" : 'NULL'},
            ?, ${nguoiGuiGiuCo ? "datetime('now', '+7 hours')" : 'NULL'}, ?,
            ?, ${nguoiGuiGiuCo ? "datetime('now', '+7 hours')" : 'NULL'})
  `).bind(phien.nhan_su_id, tieuDe, boiCanh, vuongODau, mongMuon, tanSuat, khuVuc, dinhKem,
          tt, cur, nxt,
          nguoiGuiGiuCo ? 'MEDIUM' : null, nguoiGuiGiuCo ? phien.nhan_su_id : null,
          nguoiGuiGiuCo ? phien.nhan_su_id : null, nguoiGuiGiuCo ? 'TU_DUYET_OWNER' : null,
          nguoiGuiGiuCo ? phien.nhan_su_id : null).run();

  const id = r.meta.last_row_id;
  // Đồng hồ hàng chờ bắt đầu chạy TỪ ĐÂY (cửa 14).
  await gopYDongDauChoDuyet(env, id);
  if (nguoiGuiGiuCo) {
    await gopYGhiLichSu(env, id, 'moi', 'cho_phan_tich', {
      nguoiDoiId: phien.nhan_su_id,
      ghiChu: 'Bỏ qua cả hai cổng duyệt vì người gửi cũng là người duyệt cấp cuối — không ai duyệt góp ý của chính mình. Rủi ro tạm ghi Trung bình.'
    });
  } else if (!ql1.id) {
    await gopYGhiLichSu(env, id, 'moi', 'moi', {
      nguoiDoiId: phien.nhan_su_id,
      ghiChu: `Bỏ qua cổng duyệt cấp 1 vì người gửi không có ai duyệt cấp trên (${ql1.nguon}) — chuyển thẳng lên ERP Owner.`
    });
  }

  return json({ ok: true, id, trang_thai: tt, next_owner: nxt });
}

/* Người duyệt cấp 1 của một nhân sự (ADR-0006 B1). Trả kèm `nguon` để ĐÓNG
   BĂNG vào gop_y.duyet_cap1_nguon lúc duyệt — sau này HCNS đổi quan_ly_id
   thì hồ sơ duyệt cũ vẫn đọc đúng ai duyệt, với tư cách gì (Rule 10).

   Không tìm được ai thì PHẢI NÓI RÕ VÌ SAO, không im lặng gộp làm một
   (REV-0016 mục 1). Hai lý do khác hẳn nhau, việc phải làm cũng khác:
     KHONG_CO_QUAN_LY    — đã xếp phòng ban rồi mà phòng chưa có trưởng phòng,
                           hoặc chính người này là trưởng phòng. Việc của Sếp.
     CHUA_XEP_PHONG_BAN  — hồ sơ nhân sự còn thiếu phong_ban_id (bản thật
                           28/08: 2/24 người). Việc của HCNS, sửa hồ sơ là hết. */
async function nguoiDuyetCap1(env, nhanSuId) {
  const r = await env.DB.prepare(`
    SELECT ${GOPY_SQL_QL1} AS ql_id,
           (n.quan_ly_id IS NOT NULL AND EXISTS
              (SELECT 1 FROM nhan_su q WHERE q.id = n.quan_ly_id AND q.dang_lam = 1 AND q.id <> n.id)) AS theo_quan_ly,
           (n.phong_ban_id IS NULL) AS chua_xep_phong
      FROM nhan_su n WHERE n.id = ?
  `).bind(nhanSuId).first();
  if (!r || !r.ql_id)
    return { id: null, nguon: (r && r.chua_xep_phong) ? 'CHUA_XEP_PHONG_BAN' : 'KHONG_CO_QUAN_LY' };
  return { id: r.ql_id, nguon: r.theo_quan_ly ? 'QUAN_LY_ID' : 'TRUONG_PHONG_ID' };
}

/* Ghi 1 dòng nhật ký. Đây là CỬA DUY NHẤT để ghi gop_y_lich_su.
   - Người bấm  → truyền nguoiDoiId, KHÔNG truyền tacNhan.
   - Máy chạy   → truyền tacNhan ('SLA'/'RUNNER'/...), nguoi_doi_id để NULL,
                  kèm uyQuyenBoiId = người đã cho phép chuỗi tự động này.
   CHECK ở tầng DB chặn mọi kiểu mạo danh kể cả khi hàm này bị gọi sai. */
async function gopYGhiLichSu(env, gopYId, tu, den, o = {}) {
  const laMay = !!o.tacNhan;
  await env.DB.prepare(`
    INSERT INTO gop_y_lich_su (gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id,
                               nguoi_thuc_hien_loai, tac_nhan, uy_quyen_boi_id, job_id, ghi_chu, luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
  `).bind(gopYId, tu, den,
          laMay ? null : (o.nguoiDoiId || null),
          laMay ? (o.loai || 'he_thong') : 'nguoi',
          laMay ? o.tacNhan : null,
          o.uyQuyenBoiId || null, o.jobId || null,
          (o.ghiChu || null)).run();
}

/* ---- ĐỒNG HỒ SLA — CỬA THỨ 14 (REV-0030 lỗi 1) --------------------------
   Trước bản vá, `gopYNhacSla()` đo tuổi hàng chờ bằng `cap_nhat_luc`. Mà MỌI
   câu UPDATE trong `gopYDoiTrangThai()` đều ghi `cap_nhat_luc = now`, kể cả
   nhánh "lưu tại chỗ" KHÔNG đổi trạng thái. Đo được: góp ý chờ cổng 1 từ
   24/08 (4 ngày) → anh Phong bấm "giao người phụ trách" → 200 → đồng hồ nhảy
   về hôm nay → cron KHÔNG đẩy lên Sếp nữa. Chặn-rồi-gỡ-chặn y hệt. LẶP VÔ
   HẠN, không một dòng cảnh báo, NỔ CẢ KHI KHÔNG AI CỐ Ý.

   Đây đúng là cùng họ với cửa thứ tư (L2 — `next_owner`), chỉ khác cột: rút
   đồng hồ ra là rút việc khỏi hàng chờ của Sếp vô thời hạn — phá đúng MỘT
   TRONG BA CHỖ ĐỠ mà ADR-0015 hứa với Sếp cho rủi ro "một người duyệt".

   VÁ: một cột RIÊNG `cho_duyet_tu_luc`, tách hẳn khỏi `cap_nhat_luc`. Nó chỉ
   được đóng dấu khi việc THẬT SỰ vào một hàng chờ mới (gửi mới · qua một
   cổng duyệt · đổi trạng thái), không bao giờ vì một lần lưu tại chỗ.

   PHÒNG THỦ như L4: chưa nạp migration thì nuốt đúng lỗi "no such column" —
   đồng hồ lùi về `cap_nhat_luc` như cũ, chứ không 500 khi gửi góp ý. */
async function gopYDongDauChoDuyet(env, id) {
  if (!id) return false;
  try {
    await env.DB.prepare(
      `UPDATE gop_y SET cho_duyet_tu_luc = datetime('now', '+7 hours') WHERE id = ?`).bind(id).run();
    return true;
  } catch (e) {
    if (!/no such column/i.test(String(e && e.message))) throw e;
    return false;
  }
}

/* Danh sách — người gửi thấy của mình; QUẢN LÝ CẤP 1 thấy thêm của cấp dưới
   (SPEC-0002: mở quyền xem cho quản lý trực tiếp); Admin thấy tất cả.
   Exception First: việc đang chờ chính người xem duyệt lên đầu. */
async function gopYDanhSach(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  /* XEM ≠ DUYỆT — đây là chỗ dễ cắt quá tay nhất của thay đổi 28/08/2026.
     Sếp bảo "đừng để sếp Phong DUYỆT", KHÔNG bảo "đừng cho xem". Anh Phong
     là admin nên `laAd` vẫn true: thấy hết mọi góp ý, mọi trạng thái, mọi
     ghi chú nội bộ, mọi mức rủi ro, y như trước. Chỉ hàm gopYDuyet() và
     đúng hai đường ở gopYDoiTrangThai() từ chối tay anh.

     `|| duocDuyetGopY(phien)`: người được Sếp tạm uỷ quyền duyệt mà KHÔNG
     phải admin thì cũng phải nhìn thấy thứ mình sắp duyệt — nếu không, cờ
     uỷ quyền bật lên mà màn hình trống. */
  const laAd = laAdmin(phien.vai_tro) || duocDuyetGopY(phien);
  const dieuKien = laAd ? '' : `WHERE g.nguoi_gui_id = ?1 OR ${GOPY_SQL_QL1} = ?1`;

  const stmt = env.DB.prepare(`
    SELECT g.id, g.tieu_de, g.boi_canh, g.vuong_o_dau, g.mong_muon, g.tan_suat, g.khu_vuc,
           (g.dinh_kem IS NOT NULL) AS co_dinh_kem, g.loai, g.trang_thai,
           g.nguoi_gui_id, g.nguoi_phu_trach_id, pt.ho_ten AS nguoi_phu_trach_ten, g.spec_reference,
           g.tao_luc, g.cap_nhat_luc,
           g.de_xuat_loai, g.de_xuat_risk, g.de_xuat_trang_thai, g.de_xuat_ly_do, g.de_xuat_spec,
           g.risk, g.duyet_cap1_luc, g.duyet_cap1_nguon, g.duyet_owner_luc,
           g.bang_chung_url, g.ly_do_tu_choi, g.so_lan_gui_lai, g.can_xac_minh_lai,
           g.current_owner, g.next_owner,
           g.hoan_tac_json, g.hoan_tac_boi_id, g.hoan_tac_luc,
           n.ho_ten AS nguoi_gui_ten, n.viet_tat AS nguoi_gui_viet_tat, n.bo_phan AS nguoi_gui_bo_phan,
           ${GOPY_SQL_QL1} AS quan_ly_cap1_id,
           (SELECT ho_ten FROM nhan_su WHERE id = ${GOPY_SQL_QL1}) AS quan_ly_cap1_ten,
           d1.ho_ten AS duyet_cap1_ten, d2.ho_ten AS duyet_owner_ten,
           CAST(julianday(datetime('now', '+7 hours'))
                - julianday(COALESCE(g.cap_nhat_luc, g.tao_luc)) AS INTEGER) AS so_ngay_cho
      FROM gop_y g
      JOIN nhan_su n ON n.id = g.nguoi_gui_id
      LEFT JOIN nhan_su pt ON pt.id = g.nguoi_phu_trach_id
      LEFT JOIN nhan_su d1 ON d1.id = g.duyet_cap1_boi_id
      LEFT JOIN nhan_su d2 ON d2.id = g.duyet_owner_boi_id
      ${dieuKien}
      ORDER BY CASE g.trang_thai
         WHEN 'moi' THEN 0 WHEN 'cho_quyet_dinh' THEN 0 WHEN 'can_chinh_sua' THEN 0
         WHEN 'bi_chan' THEN 0 WHEN 'cho_nghiem_thu' THEN 0 ELSE 1 END, g.tao_luc DESC
  `);
  const { results } = laAd ? await stmt.all() : await stmt.bind(phien.nhan_su_id).all();

  /* ---- CẮT RUỘT NỘI BỘ Ở ĐÂY, KHÔNG CHE Ở GIAO DIỆN (BH-44) ------------
     Bản trước trả đủ các trường này cho MỌI dòng người gửi xem được, rồi
     nhờ biến `xemRuot` trong app.js che đi. Che ở trình duyệt không phải
     phân quyền: mở tab Network là đọc được link PR và mức rủi ro nội bộ.
     Nay máy chủ NGỪNG GỬI — xoá hẳn khoá khỏi object, không đặt null, để
     trong JSON không còn gì mà lộ.

     Ai vẫn được nhận: Admin/Sếp · quản lý cấp 1 của NGƯỜI GỬI (người phải
     bấm duyệt) · người được giao phụ trách (phải có link PR mà làm).
     Ai không: người xem dòng này chỉ vì họ là NGƯỜI GỬI — kể cả khi bản
     thân họ đang là trưởng phòng của một phòng khác (ca biên: với góp ý
     của chính mình, chức trưởng phòng không cho thêm quyền nào).

     Người gửi KHÔNG mất gì họ cần: trạng thái, next_owner, tên quản lý
     đang giữ, mốc đã duyệt cấp 1 / Sếp, lý do từ chối công khai
     (`ly_do_tu_choi`), số lần gửi lại, số ngày chờ — đều nằm ngoài danh
     sách này và vẫn trả về đủ. */
  const GOPY_RUOT_NOI_BO = ['risk', 'bang_chung_url', 'de_xuat_loai', 'de_xuat_risk',
                            'de_xuat_trang_thai', 'de_xuat_ly_do', 'de_xuat_spec'];
  const catRuot = laAd ? results : results.map(g => {
    if (g.quan_ly_cap1_id === phien.nhan_su_id || g.nguoi_phu_trach_id === phien.nhan_su_id)
      return g;
    const cat = { ...g };
    for (const k of GOPY_RUOT_NOI_BO) delete cat[k];
    return cat;
  });

  /* ---- HOÀN TÁC: trả về BOOLEAN, tuyệt đối không trả ảnh chụp -----------
     `hoan_tac_json` là trạng thái nội bộ trước cú bấm — không ai ngoài máy
     chủ cần đọc nó. Máy chủ tự tính "cái nút Hoàn tác có sáng không" rồi
     XOÁ HẲN ba cột thô khỏi JSON (không đặt null — đúng cách đã dùng cho
     ruột nội bộ ở trên). Luật thật vẫn nằm ở gopYHoanTac(); đây chỉ là để
     giao diện khỏi vẽ một cái nút bấm vào là 400. */
  const gopY = catRuot.map(g => {
    const duoc = gopYHoanTacDuoc(g, phien.nhan_su_id);
    const r = { ...g, hoan_tac_duoc: duoc };
    delete r.hoan_tac_json; delete r.hoan_tac_boi_id; delete r.hoan_tac_luc;
    return r;
  });

  return json({
    gop_y: gopY, la_admin: laAd, toi_la: phien.nhan_su_id,
    cong_duyet_bat: CONG_DUYET_BAT,
    // Giao diện dùng cờ này để KHÔNG vẽ nút duyệt cho người không có quyền.
    // Đây là phép lịch sự với người dùng, KHÔNG phải hàng rào: hàng rào thật
    // nằm ở gopYDuyet() phía máy chủ, gọi thẳng API vẫn 403.
    duyet_gopy: duocDuyetGopY(phien)
  });
}

/* ---- HOÀN TÁC MỘT CÚ DUYỆT/TỪ CHỐI LỠ TAY -------------------------------
   Sếp Bùi Thị Ngọc là NGƯỜI DUY NHẤT duyệt ở cấp cuối, và duyệt trên điện
   thoại. Bấm nhầm thì không có đồng nghiệp nào sửa hộ được — nên nút hoàn
   tác không phải tiện nghi, nó là phần bắt buộc của việc "một mình duyệt".

   BỐN ĐIỀU KIỆN, KIỂM CẢ Ở DANH SÁCH LẪN Ở CỬA HOÀN TÁC (cùng một hàm, một
   sự thật — Rule 1):
     ① có ảnh chụp        ② đúng người vừa bấm
     ③ trong 15 phút      ④ việc CHƯA đi tiếp (trạng thái + người đang chờ
                             còn y như lúc vừa bấm xong)
   ④ là chốt chặn quan trọng nhất: Hồ Ly đã bắt đầu phân tích rồi mà hoàn
   tác được thì hoàn tác chính là một kiểu nói dối mới. */
const GOPY_HOAN_TAC_PHUT = 15;

/* Các cột cổng duyệt được chụp lại. Đủ để trả về nguyên trạng, không thừa
   một cột nghiệp vụ nào (nội dung góp ý, ảnh, người phụ trách... không đụng). */
const GOPY_COT_HOAN_TAC = ['trang_thai', 'current_owner', 'next_owner',
  'risk', 'risk_chot_boi_id', 'risk_chot_luc',
  'duyet_cap1_boi_id', 'duyet_cap1_luc', 'duyet_cap1_nguon',
  'duyet_owner_boi_id', 'duyet_owner_luc', 'ly_do_tu_choi'];

function gopYAnhChup(g, sauTrangThai, sauNextOwner) {
  const truoc = {};
  for (const k of GOPY_COT_HOAN_TAC) truoc[k] = g[k] === undefined ? null : g[k];
  return JSON.stringify({ truoc, sau_trang_thai: sauTrangThai, sau_next_owner: sauNextOwner });
}

/* Bao nhiêu phút đã trôi kể từ mốc `luc`. Mốc trong DB ghi theo giờ VN
   (datetime('now','+7 hours')) nên phải cộng 7 tiếng vào "bây giờ" rồi mới
   trừ — so thẳng với giờ UTC là lệch đúng 7 tiếng và cửa sổ 15 phút không
   bao giờ mở. */
function gopYPhutTruoc(luc) {
  if (!luc) return Infinity;
  const t = Date.parse(String(luc).replace(' ', 'T') + 'Z');
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() + 7 * 3600 * 1000 - t) / 60000;
}

function gopYHoanTacDuoc(g, nhanSuId) {
  if (!g || !g.hoan_tac_json || !nhanSuId) return false;
  if (g.hoan_tac_boi_id !== nhanSuId) return false;
  const phut = gopYPhutTruoc(g.hoan_tac_luc);
  if (!(phut >= 0) || phut > GOPY_HOAN_TAC_PHUT) return false;
  let a; try { a = JSON.parse(g.hoan_tac_json); } catch { return false; }
  return !!a && a.sau_trang_thai === g.trang_thai && a.sau_next_owner === g.next_owner;
}

/* POST /api/gop-y/hoan-tac — trả bản ghi về đúng trạng thái trước cú bấm.
   KHÔNG xoá lịch sử: ghi THÊM một dòng "Hoàn tác" (append-only, Rule 10) —
   người sau đọc sổ vẫn thấy cả cú bấm nhầm lẫn cú sửa. */
async function gopYHoanTac(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const id = parseInt(b.id, 10);
  if (!id) return loi('Thiếu id');

  const g = await env.DB.prepare(`
    SELECT id, tieu_de, trang_thai, next_owner, nguoi_gui_id,
           hoan_tac_json, hoan_tac_boi_id, hoan_tac_luc
      FROM gop_y WHERE id = ?`).bind(id).first();
  if (!g) return loi('Không tìm thấy góp ý này', 404);

  // Không phải người vừa bấm → 403 (kể cả admin: hoàn tác là sửa QUYẾT ĐỊNH
  // CỦA NGƯỜI KHÁC, không ai được làm thay).
  if (!g.hoan_tac_json || g.hoan_tac_boi_id !== phien.nhan_su_id)
    return loi('Chỉ người vừa bấm mới hoàn tác được, và chỉ với cú bấm gần nhất của mình', 403);
  if (!gopYHoanTacDuoc(g, phien.nhan_su_id)) {
    const phut = gopYPhutTruoc(g.hoan_tac_luc);
    return loi(phut > GOPY_HOAN_TAC_PHUT
      ? `Quá ${GOPY_HOAN_TAC_PHUT} phút rồi, không hoàn tác được nữa. Dùng đường "Mở lại"/"Gỡ chặn" nhé.`
      : 'Góp ý này đã đi tiếp sau cú bấm đó — hoàn tác bây giờ sẽ xoá mất việc người khác vừa làm.', 409);
  }

  const { truoc } = JSON.parse(g.hoan_tac_json);
  const gan = GOPY_COT_HOAN_TAC.map(k => `${k} = ?`);
  const gia = GOPY_COT_HOAN_TAC.map(k => (truoc[k] === undefined ? null : truoc[k]));
  gan.push('hoan_tac_json = NULL', 'hoan_tac_boi_id = NULL', 'hoan_tac_luc = NULL',
           "cap_nhat_luc = datetime('now', '+7 hours')");
  gia.push(id);
  await env.DB.prepare(`UPDATE gop_y SET ${gan.join(', ')} WHERE id = ?`).bind(...gia).run();

  await gopYGhiLichSu(env, id, g.trang_thai, truoc.trang_thai, {
    nguoiDoiId: phien.nhan_su_id,
    ghiChu: `Hoàn tác — bấm nhầm, trả về "${GOPY_TRANG_THAI_NHAN[truoc.trang_thai] || truoc.trang_thai}"`
  });
  // Người gửi đã nhận tin "đã duyệt"/"chưa duyệt" ở cú bấm nhầm — phải nói
  // lại cho đúng, không để họ đọc một cái tin nay đã sai.
  await guiThongBao(env, null,
    `Góp ý "${g.tieu_de}": thao tác vừa rồi đã được hoàn tác, quay lại "${GOPY_TRANG_THAI_NHAN[truoc.trang_thai] || truoc.trang_thai}".`,
    'gop_y_cap_nhat', String(id), g.nguoi_gui_id);

  return json({ ok: true, trang_thai: truoc.trang_thai });
}

/* CỔNG DUYỆT — POST /api/gop-y/duyet.
   Một cửa duy nhất cho cả duyệt lẫn từ chối, cả cấp 1 lẫn Sếp. Ai được bấm
   quyết định bằng gop_y.next_owner, KHÔNG bằng vai trò đăng nhập:
     next_owner='QL_CAP1' → đúng quản lý cấp 1, hoặc Sếp (vượt cấp, phải ghi lý do)
     next_owner='OWNER'   → chỉ Sếp
   Nhận `ids` (mảng) để duyệt hàng loạt — Human Cost, Rule 12. */
async function gopYDuyet(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(x => parseInt(x, 10)).filter(Boolean);
  if (!ids.length) return loi('Thiếu id');
  const tuChoi = String(b.quyet_dinh || 'duyet') === 'tu_choi';
  const lyDo = String(b.ly_do || '').trim().slice(0, 500);
  const ghiChu = String(b.ghi_chu || '').trim().slice(0, 500);
  const loiNhan = String(b.loi_nhan || '').trim().slice(0, 200);
  const riskGui = b.risk ? String(b.risk).toUpperCase() : null;
  if (riskGui && !GOPY_RISK_BAC[riskGui]) return loi('Mức rủi ro không hợp lệ');
  if (tuChoi && !lyDo) return loi('Hãy ghi rõ lý do chưa duyệt để người gửi biết đường sửa');

  /* ---- CẤP CUỐI = CỜ `duyet_gopy`, KHÔNG PHẢI VAI TRÒ `admin` -----------
     Sếp Ngọc chốt 28/08/2026: "riêng cái góp ý ERP đừng để sếp Phong duyệt,
     1 mình tao duyệt hết". Anh Phong là Giám đốc, tài khoản `admin`, biết
     đường thì gọi thẳng POST /api/gop-y/duyet được — nên chặn phải nằm ở
     ĐÂY, trên máy chủ, chứ ẩn nút trong app.js chỉ là hàng rào giấy (đúng
     lỗi đã làm vòng 2 của tính năng này hỏng, REV-0018).

     `laOwner` giữ nguyên tên vì nó vẫn có nghĩa cũ — "người cầm cổng ERP
     Owner" — chỉ đổi CÁCH XÁC ĐỊNH: từ vai trò sang cờ trên tài khoản.
     Mọi luật bám vào laOwner đi theo luôn, đúng ý Sếp:
       · cổng 2 (next_owner='OWNER')            → chỉ người có cờ
       · duyệt vượt cấp thay quản lý trực tiếp  → chỉ người có cờ
       · hạ mức rủi ro (ADR-0006 B6)            → chỉ người có cờ
     Cấp 1 KHÔNG đụng tới: `laQL1` bên dưới vẫn tính bằng GOPY_SQL_QL1. */
  const laOwner = duocDuyetGopY(phien);
  const ketQua = [];

  for (const id of ids) {
    const g = await env.DB.prepare(`
      SELECT id, trang_thai, nguoi_gui_id, tieu_de, risk, risk_chot_boi_id, risk_chot_luc,
             de_xuat_risk, duyet_cap1_boi_id, duyet_cap1_luc, duyet_cap1_nguon,
             duyet_owner_boi_id, duyet_owner_luc, ly_do_tu_choi,
             current_owner, next_owner, so_lan_gui_lai
        FROM gop_y WHERE id = ?`).bind(id).first();
    if (!g) return loi('Không tìm thấy góp ý này', 404);
    if (!['moi', 'cho_quyet_dinh'].includes(g.trang_thai))
      return loi(`Góp ý "${g.tieu_de}" không còn ở bước chờ duyệt`, 400);

    const ql1 = await nguoiDuyetCap1(env, g.nguoi_gui_id);
    const laQL1 = !!ql1.id && ql1.id === phien.nhan_su_id;
    const dangCho = g.next_owner === 'OWNER' || !ql1.id ? 'OWNER' : 'QL_CAP1';

    // ---- Ai được bấm — enforce ở BACKEND, không phải ẩn nút -------------
    // Vai trò admin KHÔNG mở được cửa này nữa; chỉ cờ tai_khoan.duyet_gopy.
    if (dangCho === 'OWNER' && !laOwner)
      return loi('Góp ý ERP chỉ ERP Owner duyệt ở cấp cuối — tài khoản của bạn không có quyền này (xem/theo dõi thì vẫn đầy đủ)', 403);
    if (dangCho === 'QL_CAP1' && !laQL1 && !laOwner)
      return loi('Chỉ quản lý trực tiếp của người gửi (hoặc ERP Owner) mới duyệt được', 403);
    // ADR-0006 B4 — Sếp vượt cấp được, nhưng KHÔNG có đường duyệt im lặng.
    const vuotCap = dangCho === 'QL_CAP1' && laOwner && !laQL1 && !!ql1.id;
    if (vuotCap && !ghiChu)
      return loi('Duyệt vượt cấp phải ghi lý do (vì sao không chờ quản lý trực tiếp)', 400);

    if (tuChoi) {
      await env.DB.prepare(`
        UPDATE gop_y SET trang_thai = 'bi_tu_choi', ly_do_tu_choi = ?,
               current_owner = 'NGUOI_GUI', next_owner = 'NGUOI_GUI', nhac_duyet_luc = NULL,
               hoan_tac_json = ?, hoan_tac_boi_id = ?,
               hoan_tac_luc = datetime('now', '+7 hours'),
               cap_nhat_luc = datetime('now', '+7 hours') WHERE id = ?`)
        .bind(lyDo, gopYAnhChup(g, 'bi_tu_choi', 'NGUOI_GUI'), phien.nhan_su_id, id).run();
      await gopYDongDauChoDuyet(env, id);       // cửa 14 — sang hàng chờ của NGƯỜI GỬI
      await gopYGhiLichSu(env, id, g.trang_thai, 'bi_tu_choi',
        { nguoiDoiId: phien.nhan_su_id, ghiChu: 'Chưa duyệt — ' + lyDo });
      await guiThongBao(env, null,
        `Góp ý "${g.tieu_de}" chưa được duyệt: ${lyDo}. Bạn sửa lại rồi gửi tiếp nhé.`,
        'gop_y_cap_nhat', String(id), g.nguoi_gui_id);
      ketQua.push({ id, trang_thai: 'bi_tu_choi' });
      continue;
    }

    // ---- Chốt mức rủi ro -----------------------------------------------
    // ADR-0006 B6: quản lý CHỈ ĐƯỢC NÂNG. Hạ mức là đường tắt lách cổng Sếp.
    const riskCu = g.risk || g.de_xuat_risk || 'MEDIUM';
    const risk = riskGui || riskCu;
    // SÀN rủi ro mà quản lý không được xuống dưới. Chưa có đánh giá của máy
    // thì sàn là MEDIUM — an toàn hơn, và bịt đúng lỗ lách: nếu để mặc định
    // LOW thì chỉ cần duyệt trước khi Hồ Ly kịp chấm là qua mặt được cổng Sếp.
    const san = g.de_xuat_risk && GOPY_RISK_BAC[g.de_xuat_risk] ? g.de_xuat_risk : 'MEDIUM';
    if (!laOwner && GOPY_RISK_BAC[risk] < GOPY_RISK_BAC[san])
      return loi(g.de_xuat_risk
        ? `Chỉ ERP Owner mới hạ được mức rủi ro. Máy đã chấm "${GOPY_RISK_NHAN[san]}", bạn chỉ nâng lên được.`
        : 'Góp ý này máy chưa kịp đánh giá nên tạm coi là rủi ro Trung bình — chờ Sếp duyệt, hoặc nâng mức lên.', 403);

    const gan = ['risk = ?', 'risk_chot_boi_id = ?', "risk_chot_luc = datetime('now', '+7 hours')",
                 "cap_nhat_luc = datetime('now', '+7 hours')", 'nhac_duyet_luc = NULL'];
    const gia = [risk, phien.nhan_su_id];
    let tt = g.trang_thai, nguonCap1 = g.duyet_cap1_nguon;

    // ---- CỔNG 1 — quản lý trực tiếp ------------------------------------
    if (!g.duyet_cap1_luc) {
      // Ghi ĐÚNG tư cách người vừa gật. Không được ghi 'QUAN_LY_ID' cho một
      // người không phải quản lý trực tiếp — đó là làm hồ sơ duyệt nói dối.
      if (laQL1)                                            nguonCap1 = ql1.nguon;
      else if (g.nguoi_gui_id === phien.nhan_su_id && laOwner) nguonCap1 = 'TU_DUYET_OWNER';
      // ql1.nguon đã phân biệt sẵn KHONG_CO_QUAN_LY / CHUA_XEP_PHONG_BAN —
      // dùng lại, đừng ghi đè bằng một lý do chung chung (REV-0016 mục 1).
      else if (!ql1.id)                                     nguonCap1 = ql1.nguon;
      else if (vuotCap)                                     nguonCap1 = 'OWNER_VUOT_CAP';
      // Việc đã tự lên Sếp vì quá hạn (SLA) hoặc vì gửi lại lần thứ 3 —
      // không ai vượt mặt ai, đừng gắn nhãn vượt cấp cho Sếp.
      else                                                  nguonCap1 = 'QUA_HAN_LEN_OWNER';
      gan.push('duyet_cap1_boi_id = ?', "duyet_cap1_luc = datetime('now', '+7 hours')", 'duyet_cap1_nguon = ?');
      gia.push(phien.nhan_su_id, nguonCap1);
      await gopYGhiLichSu(env, id, g.trang_thai, g.trang_thai, {
        nguoiDoiId: phien.nhan_su_id,
        ghiChu: `Duyệt cấp 1 (${nguonCap1}) · rủi ro: ${GOPY_RISK_NHAN[risk]}${ghiChu ? ' — ' + ghiChu : ''}`
      });
    }

    // ---- Ngưỡng ADR-0006 A1 — LOW không lên Sếp -------------------------
    // LOW: quản lý trực tiếp gật là đủ, Sếp không phải bấm gì (~60% số góp ý).
    const canSep = CONG_DUYET_BAT && risk !== 'LOW';
    if (!canSep || laOwner) {
      // Cổng 2 xong (hoặc không cần) → đi tiếp.
      if (canSep) {
        gan.push('duyet_owner_boi_id = ?', "duyet_owner_luc = datetime('now', '+7 hours')");
        gia.push(phien.nhan_su_id);
      }
      // HIGH bắt buộc dừng ở 'cho_quyet_dinh' để Sếp ghi quyết định bằng văn bản.
      if (CONG_DUYET_BAT && risk === 'HIGH' && g.trang_thai === 'moi') {
        tt = 'cho_quyet_dinh';
      } else {
        if (CONG_DUYET_BAT && risk === 'HIGH' && !ghiChu)
          return loi('Góp ý rủi ro CAO: hãy ghi quyết định bằng văn bản trước khi cho làm', 400);
        tt = 'cho_phan_tich';
      }
    } else {
      tt = 'moi';   // giữ nguyên, chỉ đổi người đang chờ sang Sếp
    }

    const [cur, nxt] = tt === 'moi' ? ['NGUOI_GUI', 'OWNER'] : GOPY_OWNER_THEO_TT[tt];
    gan.push('trang_thai = ?', 'current_owner = ?', 'next_owner = ?');
    gia.push(tt, cur, nxt);
    // Ảnh chụp để hoàn tác — chụp `g` (nguyên trạng TRƯỚC câu UPDATE này).
    gan.push('hoan_tac_json = ?', 'hoan_tac_boi_id = ?', "hoan_tac_luc = datetime('now', '+7 hours')");
    gia.push(gopYAnhChup(g, tt, nxt), phien.nhan_su_id, id);
    await env.DB.prepare(`UPDATE gop_y SET ${gan.join(', ')} WHERE id = ?`).bind(...gia).run();
    // Cửa 14 — qua một cổng duyệt là VÀO MỘT HÀNG CHỜ MỚI (cổng 2, hoặc bước
    // tiếp theo). Đóng dấu lại đồng hồ ở đây là ĐÚNG; cái sai là đóng dấu khi
    // chỉ lưu tại chỗ.
    await gopYDongDauChoDuyet(env, id);

    if (tt !== g.trang_thai) {
      await gopYGhiLichSu(env, id, g.trang_thai, tt,
        { nguoiDoiId: phien.nhan_su_id, ghiChu: ghiChu || null });
      const nhan = GOPY_TRANG_THAI_NHAN[tt] || tt;
      // Ghi nhận người gửi ngay trong quy trình, không trông chờ ai nhớ ra.
      const nguoiDuyet = phien.ho_ten || phien.ten_dang_nhap;
      await guiThongBao(env, null,
        tt === 'cho_phan_tich'
          ? `Cảm ơn bạn đã báo — ${nguoiDuyet} đã duyệt góp ý "${g.tieu_de}".${loiNhan ? ' ' + loiNhan : ''}`
          : `Góp ý "${g.tieu_de}" của bạn: ${nhan}`,
        'gop_y_cap_nhat', String(id), g.nguoi_gui_id);
      guiTelegram(env, `[Góp ý ERP] "${g.tieu_de}" → ${nhan}`).catch(() => {});
    } else if (nxt === 'OWNER') {
      guiTelegram(env, `[Góp ý ERP] "${g.tieu_de}" đã qua quản lý trực tiếp (rủi ro ${GOPY_RISK_NHAN[risk]}) — chờ Sếp duyệt`).catch(() => {});
    }
    ketQua.push({ id, trang_thai: tt, next_owner: nxt, risk });
  }

  return json({ ok: true, ket_qua: ketQua });
}

/* Link bằng chứng hợp lệ: URL PR/commit, hoặc mã commit trần 7–40 ký tự hex.
   Không nhận chữ suông kiểu "đã xong rồi" — đó chính là cách trạng thái nói dối. */
function gopYBangChungHopLe(s) {
  const v = String(s || '').trim();
  return /^https?:\/\/\S{6,}$/i.test(v) || /^[0-9a-f]{7,40}$/i.test(v);
}

/* Đổi trạng thái vận hành — SPEC-0002 thay hoàn toàn bản cũ "ai là admin thì
   đổi sang bất kỳ trạng thái nào".

   Bản cũ chỉ kiểm 2 điều: laAdmin() và trạng thái nằm trong danh sách hợp lệ.
   Hệ quả THẬT: góp ý #1 đi 'dang_lam' → 'hoan_thanh' trong 12 GIÂY, không
   người phụ trách, không spec, không một dòng code. Hệ thống không nói dối
   vì ai cố tình — nó nói dối vì không có gì ngăn nó nói dối.

   Nay bê nguyên khuôn CHUYEN_HOP_LE của cong_viec (src/index.js:1956): mỗi
   đích khai rõ `tu:` (đi từ đâu) và `ai:` (ai được bấm). Cặp (tu, den) không
   có trong bảng → 400. Enforce ở BACKEND, không phải ẩn nút. */
async function gopYDoiTrangThai(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;

  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  const id = parseInt(b.id, 10);
  if (!id) return loi('Thiếu id');

  const g = await env.DB.prepare(`
    SELECT g.trang_thai, g.nguoi_gui_id, g.tieu_de, g.risk, g.bang_chung_url,
           g.can_xac_minh_lai, g.so_lan_gui_lai, g.nguoi_phu_trach_id,
           n.dang_lam AS nguoi_gui_dang_lam, n.ho_ten AS nguoi_gui_ten
      FROM gop_y g JOIN nhan_su n ON n.id = g.nguoi_gui_id WHERE g.id = ?`).bind(id).first();
  if (!g) return loi('Không tìm thấy góp ý này', 404);

  const trangThaiMoi = String(b.trang_thai || g.trang_thai);
  if (!GOPY_TRANG_THAI_HOP_LE.includes(trangThaiMoi)) return loi('Trạng thái không hợp lệ');
  const ghiChu = String(b.ghi_chu || '').trim().slice(0, 500) || null;
  const bangChung = String(b.bang_chung_url || '').trim().slice(0, 500);

  /* laOwner ở HÀM NÀY vẫn là vai trò admin — cố ý. Sếp Ngọc chỉ lấy đi cái
     nút DUYỆT/TỪ CHỐI CẤP CUỐI của anh Phong, không lấy quyền vận hành: anh
     vẫn phân loại, giao người phụ trách, gỡ chặn, mở lại bản ghi sai, đẩy
     việc qua các bước làm–kiểm–nghiệm thu như trước. Cắt rộng hơn thế là
     cắt quá tay. */
  const laOwner = laAdmin(phien.vai_tro);

  /* NHƯNG hàm này có HAI ĐƯỜNG VÒNG ra đúng cái cổng vừa khoá — phải bịt,
     nếu không thì khoá cửa trước mà bỏ ngỏ cửa sau (REV-0018):
       ① 'cho_quyet_dinh' → 'cho_phan_tich' CHÍNH LÀ quyết định cấp cuối
          của Sếp cho việc rủi ro CAO, chỉ khác là đi qua API khác.
       ② huỷ một góp ý ĐANG NẰM Ở CỔNG DUYỆT ('moi'/'cho_quyet_dinh') của
          người khác chính là từ chối nó, chỉ khác cái tên.
     Cả hai nay đòi cờ `duyet_gopy`. Huỷ góp ý ĐÃ QUA cổng ('cho_phan_tich')
     hoặc đã bị từ chối thì vẫn là việc vận hành — admin làm được như cũ. */
  const laDuyetCuoi = duocDuyetGopY(phien);
  const dangOCongDuyet = ['moi', 'cho_quyet_dinh'].includes(g.trang_thai);

  // "Người gửi" = ĐÚNG người đã gửi góp ý NÀY, kiểm bằng gop_y.nguoi_gui_id,
  // không kiểm bằng vai trò (ADR-0006 A2). Người gửi đã nghỉ việc thì chỉ còn
  // Sếp bấm được — người không dùng thử thì không xác nhận thay được (Rule 9).
  const laNguoiGui = g.nguoi_gui_id === phien.nhan_su_id && g.nguoi_gui_dang_lam === 1;

  const gan = [], gia = [];
  let ghiChuLichSu = ghiChu, goCoXacMinh = false;
  // Dòng lịch sử NÓI RÕ LÝ DO viết thêm sau dòng chính (ca bỏ qua cổng 1 khi
  // gửi lại — cửa 15). Bỏ qua âm thầm là sai, y như lúc gửi mới.
  let ghiChuBoQua = null;

  // ---- Ngoại lệ 0: LƯU mà KHÔNG đổi trạng thái ----------------------------
  // Ma trận chỉ nói về việc CHUYỂN trạng thái. Sửa phân loại, giao người phụ
  // trách, hay dán link bằng chứng vào bản ghi đang "Hoàn thành (cần xác minh
  // lại)" đều là lưu tại chỗ — không được để ma trận chặn nhầm. Đây chính là
  // nút "Đúng là đã xong" trong panel Cần xác minh lại.
  if (trangThaiMoi === g.trang_thai) {
    if (!laOwner) return loi('Chỉ ERP Owner mới sửa được thông tin xử lý', 403);
    if (g.can_xac_minh_lai) {
      if (!gopYBangChungHopLe(bangChung || g.bang_chung_url))
        return loi('Cần dán link Pull Request hoặc commit đã merge để xác nhận việc này thật sự đã xong', 400);
      gan.push('can_xac_minh_lai = 0');
      ghiChuLichSu = ghiChu || 'Đã bổ sung bằng chứng — gỡ cờ cần xác minh lại';
      goCoXacMinh = true;
    }
  }
  // ---- Ngoại lệ 1: MỞ LẠI bản ghi mang nhãn Hoàn thành sai -----------------
  // Chỉ Sếp, và CHỈ khi đã gắn cờ cần xác minh lại. Lịch sử giữ CẢ dòng sai
  // lẫn dòng mở lại — không xoá, không viết đè (Rule 10).
  else if (g.trang_thai === 'hoan_thanh' && ['da_duyet', 'dang_lam'].includes(trangThaiMoi)) {
    if (!laOwner) return loi('Chỉ ERP Owner mới mở lại được góp ý đã hoàn thành', 403);
    if (!g.can_xac_minh_lai) return loi('Góp ý này đã có bằng chứng, không mở lại theo đường này', 400);
    if (!ghiChu) return loi('Hãy ghi rõ vì sao mở lại — nhãn cũ sai ở chỗ nào');
    gan.push('can_xac_minh_lai = 0');
  }
  // ---- Ngoại lệ 2: THOÁT CHẶN — về đúng trạng thái ngay trước khi bị chặn --
  else if (g.trang_thai === 'bi_chan') {
    if (!laOwner) return loi('Chỉ ERP Owner mới gỡ chặn được', 403);
    const truoc = await env.DB.prepare(
      `SELECT tu_trang_thai FROM gop_y_lich_su
        WHERE gop_y_id = ? AND den_trang_thai = 'bi_chan' ORDER BY luc DESC, id DESC LIMIT 1`).bind(id).first();
    const dich = truoc && truoc.tu_trang_thai;
    if (!dich) return loi('Không đọc được trạng thái trước khi bị chặn', 400);
    if (trangThaiMoi !== dich) return loi(`Gỡ chặn chỉ đưa về đúng "${GOPY_TRANG_THAI_NHAN[dich] || dich}"`, 400);
    ghiChuLichSu = ghiChu || 'Gỡ chặn, quay lại bước trước đó';
  }
  // ---- Ngoại lệ 3: NGƯỜI GỬI SỬA VÀ GỬI LẠI sau khi bị từ chối ------------
  else if (g.trang_thai === 'bi_tu_choi' && trangThaiMoi === 'moi') {
    if (!laNguoiGui && !laOwner) return loi('Chỉ người gửi góp ý này mới gửi lại được', 403);
    const lanMoi = (g.so_lan_gui_lai || 0) + 1;
    // Reset dấu duyệt cũ nhưng KHÔNG xoá lịch sử — dòng từ chối cũ vẫn còn.
    gan.push('so_lan_gui_lai = ?', 'duyet_cap1_boi_id = NULL', 'duyet_cap1_luc = NULL',
             'duyet_cap1_nguon = NULL', 'duyet_owner_boi_id = NULL', 'duyet_owner_luc = NULL',
             'risk = NULL', 'risk_chot_boi_id = NULL', 'risk_chot_luc = NULL', 'nhac_duyet_luc = NULL');
    gia.push(lanMoi);
    /* CỬA 15 (REV-0030) — GỬI LẠI BỎ QUÊN VIỆC 7.
       Ở dưới, khối "ma trận" tính lại next_owner từ GOPY_OWNER_THEO_TT.moi =
       ['NGUOI_GUI','QL_CAP1']. Với người KHÔNG CÓ AI Ở CẤP 1 (quản lý phòng,
       trưởng phòng — chính ca Việc 7 đã xử ở gopYGui) thì việc rơi về chờ
       một người KHÔNG TỒN TẠI. Sếp vẫn nhìn thấy nó trong panel nhờ
       `|| coDuyet` ở app.js nên không mất việc, NHƯNG SLA sẽ ghi "quá 5 ngày
       chưa có ai duyệt ở CẤP QUẢN LÝ" trong khi không có quản lý nào — hồ sơ
       nói sai. Gửi mới thì đúng, gửi lại thì sai: cùng một luật phải cho ra
       cùng một kết quả. */
    const ql1GuiLai = await nguoiDuyetCap1(env, g.nguoi_gui_id);
    // Gửi lại lần thứ 3 trở đi thì lên thẳng Sếp — cắt giằng co giữa nhân
    // viên và quản lý, không để việc chết chìm ở cổng 1.
    if (lanMoi >= GOPY_GUI_LAI_LEN_SEP) {
      gan.push("next_owner = 'OWNER'", "current_owner = 'NGUOI_GUI'");
    } else if (!ql1GuiLai.id) {
      gan.push("next_owner = 'OWNER'", "current_owner = 'NGUOI_GUI'");
      ghiChuBoQua = `Bỏ qua cổng duyệt cấp 1 vì người gửi không có ai duyệt cấp trên (${ql1GuiLai.nguon}) — chuyển thẳng lên ERP Owner.`;
    }
    /* CỬA 16 (REV-0030) — admin gửi lại HỘ người khác thì dòng lịch sử không
       được ghi "Người gửi đã sửa và gửi lại". Truy ra được nhờ `nguoi_doi_id`
       thật, nhưng chữ trong sổ vẫn phải đúng sự thật (Rule 10). */
    ghiChuLichSu = ghiChu || (laNguoiGui
      ? `Người gửi đã sửa và gửi lại (lần ${lanMoi})`
      : `${phien.ho_ten || phien.ten_dang_nhap} gửi lại hộ ${g.nguoi_gui_ten || g.nguoi_gui_id} (lần ${lanMoi})`);
  }
  // ---- Ma trận chuyển trạng thái vận hành ---------------------------------
  else {
    const dangChay = ['moi', 'cho_phan_tich', 'dang_phan_tich', 'cho_quyet_dinh', 'da_duyet',
      'dang_lam', 'dang_kiem_tra', 'can_chinh_sua', 'cho_nghiem_thu', 'nghiem_thu_chua_dat',
      'san_sang_phat_hanh'];
    const CHUYEN_HOP_LE = {
      // Huỷ khi việc còn Ở CỔNG DUYỆT = từ chối bằng cửa sau → đòi cờ duyệt.
      // Người gửi thì lúc nào cũng tự rút góp ý của mình được.
      da_huy:              { tu: ['moi', 'bi_tu_choi', 'cho_phan_tich', 'cho_quyet_dinh'],
                             ai: laNguoiGui || (dangOCongDuyet ? laDuyetCuoi : laOwner),
                             loiRieng: 'Góp ý này đang chờ duyệt — chỉ ERP Owner (hoặc chính người gửi) mới huỷ được' },
      // Đây LÀ quyết định cấp cuối của Sếp với việc rủi ro CAO, không phải
      // một bước vận hành. Đi qua API nào cũng vậy, vẫn đòi cờ duyệt.
      cho_phan_tich:       { tu: ['cho_quyet_dinh'], ai: laDuyetCuoi,
                             loiRieng: 'Cho làm một góp ý rủi ro CAO là quyết định của ERP Owner — tài khoản của bạn không có quyền duyệt góp ý' },
      dang_phan_tich:      { tu: ['cho_phan_tich'], ai: laOwner },
      da_duyet:            { tu: ['cho_phan_tich', 'dang_phan_tich'], ai: laOwner, canRisk: true },
      dang_lam:            { tu: ['da_duyet', 'can_chinh_sua'], ai: laOwner },
      dang_kiem_tra:       { tu: ['dang_lam'], ai: laOwner },
      can_chinh_sua:       { tu: ['dang_kiem_tra', 'nghiem_thu_chua_dat'], ai: laOwner, batBuocGhiChu: true },
      cho_nghiem_thu:      { tu: ['dang_kiem_tra'], ai: laOwner },
      nghiem_thu_chua_dat: { tu: ['cho_nghiem_thu'], ai: laNguoiGui || laOwner, batBuocGhiChu: true },
      san_sang_phat_hanh:  { tu: ['cho_nghiem_thu'], ai: laOwner },
      // CHỐT CHẶN CHO ĐÚNG LỖI 12 GIÂY (ADR-0006 A2 + B2):
      //  · chỉ đến được từ 'san_sang_phat_hanh' — đường tắt moi→hoan_thanh biến mất
      //  · chỉ Sếp HOẶC chính người đã gửi góp ý này. NGƯỜI LÀM không tự bấm được
      //  · bắt buộc link bằng chứng, thiếu là 400 chứ không phải cảnh báo suông
      hoan_thanh:          { tu: ['san_sang_phat_hanh'], ai: laOwner || laNguoiGui, batBuocBangChung: true },
      // CỬA THỨ BA (REV-0027 L1) — cùng loại với `da_huy` ở trên, chỉ khác tên.
      // `dangChay` chứa cả 'moi' lẫn 'cho_quyet_dinh', nên "Chặn" một việc
      // ĐANG NẰM Ở CỔNG DUYỆT là rút nó khỏi hàng chờ của Sếp vô thời hạn —
      // từ chối trá hình (đo được: 2 cú bấm rút 2/5 việc khỏi hàng chờ).
      // Chặn việc ĐÃ QUA cổng (đang phân tích / đang làm / chờ nghiệm thu…)
      // vẫn là việc vận hành — admin bấm được như cũ, không cắt quá tay.
      bi_chan:             { tu: dangChay, ai: dangOCongDuyet ? laDuyetCuoi : laOwner,
                             batBuocGhiChu: true,
                             loiRieng: 'Góp ý này đang chờ duyệt — chặn nó lúc này chính là từ chối nó, chỉ ERP Owner làm được' }
    };
    const luat = CHUYEN_HOP_LE[trangThaiMoi];
    if (!luat || !luat.tu.includes(g.trang_thai)) {
      const tenCu = GOPY_TRANG_THAI_NHAN[g.trang_thai] || g.trang_thai;
      const tenMoi = GOPY_TRANG_THAI_NHAN[trangThaiMoi] || trangThaiMoi;
      return loi(`Không thể chuyển từ "${tenCu}" sang "${tenMoi}"`, 400);
    }
    if (!luat.ai) return loi(luat.loiRieng || 'Bạn không có quyền chuyển trạng thái này', 403);
    if (luat.canRisk && !g.risk) return loi('Chưa chốt mức rủi ro — phải qua cổng duyệt trước', 400);
    if (luat.batBuocGhiChu && !ghiChu) return loi('Hãy ghi rõ lý do trước khi đổi trạng thái này');
    if (luat.batBuocBangChung) {
      const cuoi = bangChung || g.bang_chung_url || '';
      if (!gopYBangChungHopLe(cuoi))
        return loi('Cần dán link Pull Request hoặc commit đã merge trước khi đánh dấu Hoàn thành', 400);
      if (bangChung) { gan.push('bang_chung_url = ?'); gia.push(bangChung); }
      gan.push('can_xac_minh_lai = 0');
    }
  }

  // Bằng chứng có thể dán trước, ở bất kỳ bước nào (không bắt đợi đến lúc bấm Xong).
  if (bangChung && !gan.some(x => x.startsWith('bang_chung_url'))) {
    if (!gopYBangChungHopLe(bangChung)) return loi('Link bằng chứng không hợp lệ (cần URL PR/commit)', 400);
    gan.push('bang_chung_url = ?'); gia.push(bangChung);
  }

  const loaiMoi = b.loai !== undefined ? (GOPY_LOAI_HOP_LE.includes(b.loai) ? b.loai : null) : undefined;
  const nguoiPhuTrachMoi = b.nguoi_phu_trach_id !== undefined ? (String(b.nguoi_phu_trach_id || '') || null) : undefined;
  if (loaiMoi !== undefined) { if (!laOwner) return loi('Chỉ ERP Owner mới phân loại được', 403); gan.push('loai = ?'); gia.push(loaiMoi); }
  if (nguoiPhuTrachMoi !== undefined) { if (!laOwner) return loi('Chỉ ERP Owner mới giao người phụ trách được', 403); gan.push('nguoi_phu_trach_id = ?'); gia.push(nguoiPhuTrachMoi); }

  /* current_owner/next_owner do BACKEND tự tính — client không gửi lên được.

     CỬA THỨ TƯ (REV-0027 L2) — `trangThaiMoi !== g.trang_thai` là điều kiện
     MỚI, và là cả bản vá. Nhánh "lưu tại chỗ" (giao người phụ trách, dán bằng
     chứng, gỡ cờ xác minh) KHÔNG chuyển trạng thái, nên không có gì để tính
     lại; vậy mà bản cũ vẫn ghi đè hai cột này từ GOPY_OWNER_THEO_TT. Với
     trạng thái 'moi' bảng đó trả ['NGUOI_GUI','QL_CAP1'] → việc đã được SLA
     đẩy lên Sếp ngày thứ 5, và việc gửi lại lần thứ 3 (hai cơ chế ADR-0015 kê
     làm chỗ đỡ cho "một người duyệt"), đều TỤT VỀ cổng 1 chỉ vì admin bấm
     giao người phụ trách — 200, không cảnh báo, không có đường nào trong giao
     diện đưa lại về OWNER. Nổ cả khi không ai cố ý.
     Trạng thái không đổi thì NGƯỜI ĐANG CHỜ cũng không đổi.

     CÙNG GỐC, CỬA THỨ SÁU (tự tìm thêm, cùng loại L2): VÀO và RA khỏi
     'bi_chan' cũng không được tính lại. Bảng trên cho bi_chan là OWNER/OWNER,
     nên chặn rồi gỡ chặn = XOÁ SẠCH thông tin "ai đang chờ": việc đã được SLA
     đẩy lên Sếp, gỡ chặn xong rơi về cổng 1 (GOPY_OWNER_THEO_TT.moi) và Sếp
     mất nó khỏi hàng chờ. "Bị chặn" nghĩa là ĐÓNG BĂNG — ai đang chờ thì vẫn
     là người đó khi rã băng. Panel "Chờ tôi duyệt" lọc theo trang_thai trước
     (app.js gyDangChoToi) nên việc bị chặn vẫn không hiện ra, không cần nhồi
     OWNER vào để giấu nó. */
  const raVaoBiChan = trangThaiMoi === 'bi_chan' || g.trang_thai === 'bi_chan';
  if (trangThaiMoi !== g.trang_thai && !raVaoBiChan && !gan.some(x => x.startsWith('next_owner'))) {
    const [cur, nxt] = GOPY_OWNER_THEO_TT[trangThaiMoi] || ['OWNER', 'OWNER'];
    gan.push('current_owner = ?', 'next_owner = ?'); gia.push(cur, nxt);
  }
  gan.push('trang_thai = ?'); gia.push(trangThaiMoi);
  gan.push("cap_nhat_luc = datetime('now', '+7 hours')");
  gia.push(id);
  await env.DB.prepare(`UPDATE gop_y SET ${gan.join(', ')} WHERE id = ?`).bind(...gia).run();

  /* CỬA THỨ 14 (REV-0030 lỗi 1) — ĐỒNG HỒ SLA chỉ được đóng dấu lại khi việc
     THẬT SỰ chuyển sang một hàng chờ khác. `cap_nhat_luc` ở câu trên vẫn ghi
     mỗi lần lưu (đúng nghĩa của nó: "sửa lần cuối lúc nào"), nhưng nó KHÔNG
     còn là đồng hồ nữa. Điều kiện này chính là cả bản vá: giao người phụ
     trách / dán bằng chứng / gỡ cờ xác minh / chặn rồi gỡ chặn đều KHÔNG đẩy
     lùi được ngày thứ 5 nữa.

     `!raVaoBiChan` đi kèm, cùng lý do với cửa thứ sáu ở khối trên: "Bị chặn"
     nghĩa là ĐÓNG BĂNG. Nếu gỡ chặn đóng dấu lại đồng hồ thì chặn-rồi-gỡ-chặn
     vẫn là một vòng lặp vô hạn đẩy lùi ngày thứ 5 — vá cột mà bỏ ngỏ đúng cái
     vòng lặp thì coi như chưa vá. Đóng băng ở đây là GIỮ NGUYÊN mốc cũ (thời
     gian bị chặn vẫn tính vào tuổi hàng chờ), không phải trừ đi — sai số nếu
     có thì nghiêng về phía việc LÊN SẾP SỚM HƠN, không bao giờ nghiêng về
     phía giấu việc khỏi Sếp. */
  if (trangThaiMoi !== g.trang_thai && !raVaoBiChan) await gopYDongDauChoDuyet(env, id);

  if (trangThaiMoi !== g.trang_thai) {
    await gopYGhiLichSu(env, id, g.trang_thai, trangThaiMoi,
      { nguoiDoiId: phien.nhan_su_id, ghiChu: ghiChuLichSu });
    // Ca bỏ qua cổng 1 khi gửi lại (cửa 15) — ghi thêm MỘT dòng nói rõ vì sao,
    // đúng như lúc gửi mới. Người sau không phải đoán vì sao thiếu dấu duyệt.
    if (ghiChuBoQua)
      await gopYGhiLichSu(env, id, trangThaiMoi, trangThaiMoi,
        { nguoiDoiId: phien.nhan_su_id, ghiChu: ghiChuBoQua });

    if (GOPY_MOC_THONG_BAO.has(trangThaiMoi)) {
      const nhan = GOPY_TRANG_THAI_NHAN[trangThaiMoi] || trangThaiMoi;
      await guiThongBao(env, null, `Góp ý "${g.tieu_de}" của bạn: ${nhan}`, 'gop_y_cap_nhat', String(id), g.nguoi_gui_id);
      guiTelegram(env, `[Góp ý ERP] "${g.tieu_de}" → ${nhan}`).catch(() => {});
    }
  } else if (goCoXacMinh) {
    // Gỡ cờ "cần xác minh lại" là một quyết định có trách nhiệm — phải để lại
    // vết, dù trạng thái không đổi.
    await gopYGhiLichSu(env, id, g.trang_thai, g.trang_thai,
      { nguoiDoiId: phien.nhan_su_id, ghiChu: ghiChuLichSu });
  }

  return json({ ok: true });
}

/* ---- SLA — ADR-0006 B3 ---------------------------------------------------
   Quản lý im lặng: ngày thứ 3 nhắc, ngày thứ 5 TỰ ĐẨY người chờ lên Sếp
   (chỉ đổi NGƯỜI CHỜ, tuyệt đối không tự duyệt thay ai).

   Dòng lịch sử của việc này ghi nguoi_doi_id = NULL, tac_nhan = 'SLA' —
   KHÔNG mạo danh ai. Đây đúng là thứ bảng cũ không làm được và là lý do phải
   dựng lại gop_y_lich_su trước tiên. Gọi từ cron 5 phút đã có sẵn. */
async function gopYNhacSla(env) {
  /* CỬA THỨ 14 — đồng hồ đọc từ CỘT RIÊNG `cho_duyet_tu_luc`, không đọc
     `cap_nhat_luc` nữa (xem gopYDongDauChoDuyet). COALESCE giữ hai bậc lùi
     cho dữ liệu cũ chưa backfill và cho ca chưa nạp migration. */
  try {
    return await gopYNhacSlaVoi(env,
      `julianday(datetime('now', '+7 hours')) - julianday(COALESCE(g.cho_duyet_tu_luc, g.cap_nhat_luc, g.tao_luc))`);
  } catch (e) {
    if (!/no such column/i.test(String(e && e.message))) throw e;
    console.warn('[ERP] Thiếu cột gop_y.cho_duyet_tu_luc — SLA góp ý tạm đo bằng cap_nhat_luc. ' +
                 'Nạp migrations/them-gopy-cho-duyet-tu-luc.sql.');
    return await gopYNhacSlaVoi(env,
      `julianday(datetime('now', '+7 hours')) - julianday(COALESCE(g.cap_nhat_luc, g.tao_luc))`);
  }
}

async function gopYNhacSlaVoi(env, NGAY_CHO) {
  const CHUA_NHAC = `(g.nhac_duyet_luc IS NULL OR julianday(datetime('now', '+7 hours')) - julianday(g.nhac_duyet_luc) >= 1)`;

  // 1) Quá 5 ngày ở cổng 1 → tự đẩy lên Sếp.
  const { results: qua } = await env.DB.prepare(`
    SELECT g.id, g.tieu_de, g.trang_thai FROM gop_y g
     WHERE g.trang_thai = 'moi' AND g.next_owner = 'QL_CAP1' AND ${NGAY_CHO} >= ${GOPY_SLA_LEN_SEP_NGAY}
     LIMIT 20`).all();
  for (const g of qua) {
    await env.DB.prepare(
      `UPDATE gop_y SET next_owner = 'OWNER', nhac_duyet_luc = datetime('now', '+7 hours') WHERE id = ?`).bind(g.id).run();
    await gopYGhiLichSu(env, g.id, g.trang_thai, g.trang_thai, {
      tacNhan: 'SLA', loai: 'he_thong',
      ghiChu: `Quá ${GOPY_SLA_LEN_SEP_NGAY} ngày chưa có ai duyệt ở cấp quản lý — chuyển lên ERP Owner`
    });
    guiTelegram(env, `[Góp ý ERP] "${g.tieu_de}" quá hạn duyệt cấp quản lý — đã chuyển lên Sếp`).catch(() => {});
  }

  // 2) Quá 3 ngày ở cổng 1 → nhắc đúng người quản lý cấp 1, tối đa 1 lần/ngày.
  const { results: nhac } = await env.DB.prepare(`
    SELECT g.id, g.tieu_de, ${GOPY_SQL_QL1} AS ql_id FROM gop_y g
      JOIN nhan_su n ON n.id = g.nguoi_gui_id
     WHERE g.trang_thai = 'moi' AND g.next_owner = 'QL_CAP1'
       AND ${NGAY_CHO} >= ${GOPY_SLA_NHAC_NGAY} AND ${CHUA_NHAC}
     LIMIT 20`).all();
  for (const g of nhac) {
    if (g.ql_id) {
      await guiThongBao(env, null, `Góp ý "${g.tieu_de}" đang chờ bạn duyệt đã ${GOPY_SLA_NHAC_NGAY} ngày.`,
        'gop_y_cho_duyet', String(g.id), g.ql_id);
    }
    await env.DB.prepare(`UPDATE gop_y SET nhac_duyet_luc = datetime('now', '+7 hours') WHERE id = ?`).bind(g.id).run();
  }

  // 3) Chờ nghiệm thu quá 7 ngày → nhắc người gửi (Sếp là cuối, không đẩy đi đâu nữa).
  const { results: nt } = await env.DB.prepare(`
    SELECT g.id, g.tieu_de, g.nguoi_gui_id FROM gop_y g
     WHERE g.trang_thai = 'cho_nghiem_thu' AND ${NGAY_CHO} >= ${GOPY_SLA_NGHIEM_THU_NGAY} AND ${CHUA_NHAC}
     LIMIT 20`).all();
  for (const g of nt) {
    await guiThongBao(env, null, `Góp ý "${g.tieu_de}" đang chờ bạn dùng thử và xác nhận đã hết vướng.`,
      'gop_y_cap_nhat', String(g.id), g.nguoi_gui_id);
    await env.DB.prepare(`UPDATE gop_y SET nhac_duyet_luc = datetime('now', '+7 hours') WHERE id = ?`).bind(g.id).run();
  }
}

/* Ai được xem chi tiết 1 góp ý: người gửi · QUẢN LÝ CẤP 1 của người gửi
   (quyền mới của SPEC-0002) · Admin. Một chỗ duy nhất cho cả lịch sử lẫn ảnh. */
async function gopYDuocXem(env, phien, id) {
  if (laAdmin(phien.vai_tro)) return true;
  const r = await env.DB.prepare(`
    SELECT g.nguoi_gui_id, ${GOPY_SQL_QL1} AS ql_id
      FROM gop_y g JOIN nhan_su n ON n.id = g.nguoi_gui_id WHERE g.id = ?`).bind(id).first();
  if (!r) return false;
  return r.nguoi_gui_id === phien.nhan_su_id || r.ql_id === phien.nhan_su_id;
}

/* Lịch sử đổi trạng thái 1 góp ý.
   LEFT JOIN chứ không JOIN: từ SPEC-0002, dòng do MÁY ghi có nguoi_doi_id =
   NULL. JOIN thẳng sẽ NUỐT MẤT đúng những dòng tự động — nghĩa là mất đúng
   phần audit vừa bỏ công dựng lại. */
async function gopYLichSu(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const id = parseInt(new URL(req.url).searchParams.get('id'), 10);
  if (!id) return loi('Thiếu id', 400);

  const g = await env.DB.prepare('SELECT nguoi_gui_id FROM gop_y WHERE id = ?').bind(id).first();
  if (!g) return loi('Không tìm thấy góp ý này', 404);
  if (!await gopYDuocXem(env, phien, id)) return loi('Không có quyền', 403);

  /* `ghi_chu` là ô "Ghi chú duyệt" quản lý và Sếp viết CHO NHAU (app.js còn
     tự điền "🦊 Hồ Ly (AI) đề xuất: …", và lý do duyệt vượt cấp nằm ở đây).
     Người gửi không được đọc. Cắt ở MÁY CHỦ (BH-44), không che ở giao diện.
     Người gửi VẪN thấy đủ đường đi của góp ý mình: đổi từ trạng thái nào
     sang trạng thái nào, ai đổi, lúc nào, người hay máy đổi — nên câu hỏi
     "góp ý của tôi đi tới đâu rồi" vẫn trả lời được. Còn lý do từ chối
     CÔNG KHAI nằm ở `gop_y.ly_do_tu_choi`, trả riêng ở danh sách, không
     dính bản cắt này. */
  const xemGhiChu = laAdmin(phien.vai_tro)
    || (await nguoiDuyetCap1(env, g.nguoi_gui_id)).id === phien.nhan_su_id;

  const { results } = await env.DB.prepare(`
    SELECT ls.tu_trang_thai, ls.den_trang_thai, ls.ghi_chu, ls.luc,
           ls.nguoi_thuc_hien_loai, ls.tac_nhan, ls.job_id,
           n.ho_ten AS nguoi_doi_ten, u.ho_ten AS uy_quyen_ten
      FROM gop_y_lich_su ls
      LEFT JOIN nhan_su n ON n.id = ls.nguoi_doi_id
      LEFT JOIN nhan_su u ON u.id = ls.uy_quyen_boi_id
     WHERE ls.gop_y_id = ?
     ORDER BY ls.luc ASC, ls.id ASC
  `).bind(id).all();

  return json({
    lich_su: xemGhiChu ? results : results.map(({ ghi_chu, ...r }) => r)
  });
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
  if (!await gopYDuocXem(env, phien, id)) return loi('Không có quyền', 403);

  const bin = Uint8Array.from(atob(g.dinh_kem), c => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
}

/* ---- Hợp đồng lao động (SPEC-0007 Đợt 1) --------------------------------
   Cùng đúng một cửa quyền với quản lý nhân sự (`them_nhan_su` — Admin/HCNS),
   KHÔNG mở bề mặt quyền mới, KHÔNG đụng bảng vai trò. Hợp đồng là hồ sơ
   pháp lý: ai sửa được hồ sơ thì sửa được hợp đồng, không ai khác. */
async function nsHopDongDanhSach(req, env) {
  const { loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;
  return hopdong.danhSach(env, new URL(req.url).searchParams.get('id'));
}
async function nsHopDongLuu(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return hopdong.luu(env, phien, b);
}
async function nsHopDongAn(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return hopdong.an(env, phien, b);
}

/* ---- Sinh nhật (SPEC-0007 Đợt 2) ----------------------------------------
   ⚠️ VÌ SAO PHẢI CÓ ĐƯỜNG SỬA `ngay_sinh` Ở ĐÂY.
   Audit CTL-0015 §2 kết luận "`ngay_sinh` ĐÃ CÓ SẴN → chỉ cần cron đọc".
   Cột thì có thật, nhưng đo lại trên D1 local thì **0 người đang làm có
   `ngay_sinh`**, và quét cả repo thì cột này chỉ được GHI đúng một chỗ:
   `src/nhansu.js:130`, tức luồng nhận hồ sơ mới / đọc CCCD. Người đã ở trong
   hệ thống thì KHÔNG có đường nào sửa. Đó đúng là "cột chỉ có chiều ghi" mà
   BH-32 cảnh báo — phát hành Đợt 2 mà không có đường này thì cron chạy đủ,
   không lỗi, và IM LẶNG mãi mãi: hỏng đúng kiểu khó phát hiện nhất.
   `ngay_sinh` là mức 2 (ADR-0011 A2) nên đường đọc/ghi đi cửa `them_nhan_su`,
   KHÔNG nhét vào danh sách nhân sự chung. */
async function nsSinhNhatDoc(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const dich = String(new URL(req.url).searchParams.get('id') || '').trim() || phien.nhan_su_id;
  if (dich !== phien.nhan_su_id && !duocThemNhanSu(phien.vai_tro)) {
    return loi('Không đủ quyền xem ngày sinh của người khác', 403);
  }
  try {
    const r = await env.DB.prepare(
      'SELECT ngay_sinh, cong_khai_sinh_nhat FROM nhan_su WHERE id = ?'
    ).bind(dich).first();
    return json({
      ngay_sinh: r?.ngay_sinh || null,
      cong_khai_sinh_nhat: r?.cong_khai_sinh_nhat == null ? true : !!r.cong_khai_sinh_nhat
    });
  } catch {
    return json({ ngay_sinh: null, cong_khai_sinh_nhat: true, chua_nap: true });
  }
}

/* Sửa ngày sinh. CHỈ vai trò quản lý hồ sơ — đây là dữ liệu hồ sơ nhân sự,
   không phải tuỳ chọn cá nhân: cho tự sửa thì ngày sinh trên hợp đồng và
   ngày sinh trong ERP sẽ lệch nhau mà không ai biết. Ghi `nhan_su_lich_su`. */
async function nsNgaySinhLuu(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const id = String(b.id || '').trim();
  if (!id) return loi('Thiếu id nhân sự');
  const ns = await env.DB.prepare('SELECT id, ho_ten, ngay_sinh FROM nhan_su WHERE id = ?').bind(id).first();
  if (!ns) return loi('Không tìm thấy nhân sự', 404);

  const s = String(b.ngay_sinh || '').trim();
  // Chỉ nhận YYYY-MM-DD. Lọt "31/12/1990" là mọi truy vấn strftime sau này
  // trả NULL im lặng, và người đó vĩnh viễn không được chúc.
  let ngay = null;
  if (s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return loi('Ngày sinh chưa đúng định dạng ngày/tháng/năm');
    const [y, m, d] = s.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return loi('Ngày sinh không có thật');
    // REV-0010 ISSUE-3: kiểm ĐỊNH DẠNG chưa đủ, phải kiểm NGÀY CÓ THẬT.
    // `1995-02-31` qua được vòng trên, nhưng `strftime('%m-%d', ...)` của
    // SQLite nắn thành `03-03` ⇒ người đó bị chúc nhầm ngày MÃI MÃI.
    // Dựng lại Date theo UTC rồi so đủ ba thành phần: tháng 2 ngày 30/31,
    // 29/02 năm không nhuận, 31/04... đều bị chặn ngay tại đây.
    const thu = new Date(Date.UTC(y, m - 1, d));
    if (thu.getUTCFullYear() !== y || thu.getUTCMonth() !== m - 1 || thu.getUTCDate() !== d) {
      return loi('Ngày sinh không có thật — kiểm lại ngày/tháng giúp tôi');
    }
    const namNay = new Date(Date.now() + 7 * 3600 * 1000).getUTCFullYear();
    if (y < 1930 || y > namNay - 14) return loi('Năm sinh không hợp lý — kiểm lại giúp tôi');
    ngay = s;
  }

  await env.DB.prepare('UPDATE nhan_su SET ngay_sinh = ? WHERE id = ?').bind(ngay, id).run();
  try {
    await env.DB.prepare(`
      INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien_id, luc)
      VALUES (?, 'doi_ngay_sinh', ?, ?, ?, datetime('now','+7 hours'))
    `).bind(id, ns.ngay_sinh || null, ngay, phien.nhan_su_id).run();
  } catch { /* chưa nạp them-nhansu-lichsu.sql — bỏ qua êm */ }
  return json({ ok: true, ngay_sinh: ngay });
}

/* ---- Công tắc riêng tư ---------------------------------------------------
   Công tắc riêng tư: AI ĐƯỢC TẮT? Chính mình — luôn được, không cần xin ai
   (ADR-0011 A2: giấy tờ của chính mình luôn xem/sửa được). Người khác — chỉ
   vai trò quản lý hồ sơ (`them_nhan_su`), đúng một cửa quyền với hợp đồng.
   KHÔNG thêm vai trò, KHÔNG sửa `src/quyen.js`. */
async function nsSinhNhatCongKhai(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }

  const dich = String(b.id || '').trim() || phien.nhan_su_id;
  if (dich !== phien.nhan_su_id && !duocThemNhanSu(phien.vai_tro)) {
    return loi('Bạn chỉ đổi được công tắc sinh nhật của chính mình', 403);
  }
  const bat = b.bat ? 1 : 0;
  try {
    await env.DB.prepare('UPDATE nhan_su SET cong_khai_sinh_nhat = ? WHERE id = ?').bind(bat, dich).run();
  } catch {
    return loi('Chưa nạp migration them-sinhnhat-congkhai.sql', 503);
  }
  return json({ ok: true, cong_khai_sinh_nhat: !!bat });
}

/* Dải Exception-First của tab Nhân sự: HCNS mở ra là THẤY NGAY việc phải làm,
   không phải tự đi tìm (Rule 7). Ba nhóm, tất cả đều chỉ tính `dang_lam = 1`:
   hợp đồng quá hạn · sắp hết hạn (<45 ngày) · sinh nhật tháng sau.
   "Người đang làm mà chưa có hợp đồng" đã tính sẵn ở giao diện từ Đợt 1 —
   không hỏi lại lần hai.
   Cửa quyền: `them_nhan_su` (Admin/HCNS). `ngay_sinh` và hạn hợp đồng là mức
   2 theo ADR-0011 A2, KHÔNG được rơi vào danh sách nhân sự chung — tab
   `nhansu` còn mở cho cả quản lý kho. */
async function nsViecCanLam(req, env) {
  const { loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;

  const kq = { qua_han: [], sap_het: [], sinh_nhat_thang_sau: [], thang_sau: null };

  try {
    const { results } = await env.DB.prepare(`
      SELECT n.id, n.ho_ten, n.bo_phan, h.loai, h.ngay_het_han,
             CAST(julianday(h.ngay_het_han) - julianday(date('now','+7 hours')) AS INTEGER) AS con_ngay
        FROM hop_dong_lao_dong h
        JOIN nhan_su n ON n.id = h.nhan_su_id AND n.dang_lam = 1
       WHERE h.hieu_luc = 1 AND h.ngay_het_han IS NOT NULL
         AND h.id = (SELECT h2.id FROM hop_dong_lao_dong h2
                      WHERE h2.nhan_su_id = h.nhan_su_id AND h2.hieu_luc = 1
                      ORDER BY h2.ngay_bat_dau DESC, h2.id DESC LIMIT 1)
         AND julianday(h.ngay_het_han) - julianday(date('now','+7 hours')) < 45
       ORDER BY h.ngay_het_han
    `).all();
    for (const r of results || []) (r.con_ngay < 0 ? kq.qua_han : kq.sap_het).push(r);
  } catch { /* chưa nạp them-hopdong-laodong.sql */ }

  // Tháng sau tính bằng CHÍNH hàm cron dùng — hai nơi lệch nhau thì dải trên
  // màn hình sẽ nói khác cái tin nhắn HCNS nhận được.
  const { nam, thang, mm } = thangKeTiep(gioVN());
  kq.thang_sau = `${thang}/${nam}`;
  try {
    const { results } = await env.DB.prepare(`
      SELECT id, ho_ten, bo_phan, ngay_sinh FROM nhan_su
       WHERE dang_lam = 1 AND ngay_sinh IS NOT NULL AND strftime('%m', ngay_sinh) = ?
       ORDER BY strftime('%d', ngay_sinh), ho_ten
    `).bind(mm).all();
    kq.sinh_nhat_thang_sau = results || [];
  } catch { /* không có dữ liệu ngày sinh — dải tự trống */ }

  /* Kỹ năng CHỈ MỘT NGƯỜI biết (SPEC-0007 Đợt 4) — điểm chết của kho. Người
     đó nghỉ một hôm là phần việc ấy đứng lại, mà hôm nay điều đó chỉ nằm
     trong đầu quản lý. Chưa nạp migration hoặc chưa ai chấm thì trả rỗng. */
  kq.diem_chet = await kynang.diemChet(env);

  return json(kq);
}

/* ---- Mô tả công việc theo MBOs (SPEC-0007 Đợt 3) -------------------------
   ĐỌC mở cho MỌI người đã đăng nhập — JD là mức 1 · nội bộ theo ADR-0011 A2.
   MBOs mà mỗi người giấu đầu ra của mình thì không ai đối chiếu được với ai;
   và JD không chứa lương, không chứa giấy tờ, không chứa ngày sinh.
   GHI đi qua đúng một cửa với hồ sơ và hợp đồng (`them_nhan_su`) — theo đúng
   luồng câu 3 Mục 13: quản lý mảng VIẾT nội dung, HCNS NHẬP vào. */
async function mtcvDanhSach(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const u = new URL(req.url).searchParams;
  return motacv.danhSach(env, u.get('chuc_danh_id'), u.get('nhan_su_id'), u.get('ke_ca_an') === '1');
}
async function mtcvMau(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return motacv.mau(env, new URL(req.url).searchParams.get('nhom'));
}
async function mtcvLuu(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return motacv.luu(env, phien, b);
}
async function mtcvAn(req, env) {
  const { phien, loi: l } = await batBuocThemNhanSu(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return motacv.an(env, phien, b);
}

/* ---- Bộ năng lực (SPEC-0007 Đợt 4) --------------------------------------
   ĐỌC mở cho mọi người đã đăng nhập (mức 1 · nội bộ, ADR-0011 A2) — hai màn
   tra cứu chỉ có giá trị khi người đang xếp ca mở được ngay, mà bảng này
   không chứa lương, giấy tờ hay ngày sinh.
   GHI thì `ky-nang.js` tự kiểm QUAN HỆ (quản lý trực tiếp / trưởng phòng),
   nên ở đây chỉ cần đăng nhập và truyền thêm cờ "có phải vai trò quản lý hồ
   sơ không". KHÔNG thêm hàm nào vào `src/quyen.js` — đụng là CORE_CHANGE. */
async function knDanhMuc(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return kynang.danhMuc(env, new URL(req.url).searchParams.get('nhom'));
}
async function knCuaNguoi(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return kynang.cuaNguoi(env, new URL(req.url).searchParams.get('id'));
}
async function knCham(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return kynang.cham(env, phien, b, duocThemNhanSu(phien.vai_tro));
}
async function knGo(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  let b; try { b = await req.json(); } catch { return loi('Dữ liệu gửi lên không hợp lệ'); }
  return kynang.go(env, phien, b, duocThemNhanSu(phien.vai_tro));
}
async function knAiLamDuoc(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const u = new URL(req.url).searchParams;
  return kynang.aiLamDuoc(env, u.get('ky_nang_id'), u.get('muc'));
}
async function knAiThayDuoc(req, env) {
  const { loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  return kynang.aiThayDuoc(env, new URL(req.url).searchParams.get('id'));
}
/* Ai được chấm cho người này — giao diện hỏi để ẩn/hiện form chấm cho gọn
   mắt. ĐÂY KHÔNG PHẢI CHỖ CHẶN: chặn thật nằm ở `kynang.cham()` trên máy
   chủ, giả mạo câu trả lời này cũng không ghi được gì. */
async function knQuyenCham(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);
  if (l) return l;
  const q = await kynang.duocChamCho(env, phien,
    new URL(req.url).searchParams.get('id'), duocThemNhanSu(phien.vai_tro));
  return json(q);
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
  'GET  /api/nhan-su/hop-dong':      nsHopDongDanhSach,
  'POST /api/nhan-su/hop-dong/luu':  nsHopDongLuu,
  'POST /api/nhan-su/hop-dong/an':   nsHopDongAn,
  'GET  /api/nhan-su/sinh-nhat':     nsSinhNhatDoc,
  'POST /api/nhan-su/ngay-sinh':     nsNgaySinhLuu,
  'POST /api/nhan-su/sinh-nhat-cong-khai': nsSinhNhatCongKhai,
  'GET  /api/nhan-su/viec-can-lam':  nsViecCanLam,
  'GET  /api/mo-ta-cong-viec':       mtcvDanhSach,
  'GET  /api/mo-ta-cong-viec/mau':   mtcvMau,
  'POST /api/mo-ta-cong-viec/luu':   mtcvLuu,
  'POST /api/mo-ta-cong-viec/an':    mtcvAn,
  'GET  /api/ky-nang':               knDanhMuc,
  'GET  /api/ky-nang/cua-nguoi':     knCuaNguoi,
  'GET  /api/ky-nang/quyen-cham':    knQuyenCham,
  'POST /api/ky-nang/cham':          knCham,
  'POST /api/ky-nang/go':            knGo,
  'GET  /api/ky-nang/ai-lam-duoc':   knAiLamDuoc,
  'GET  /api/ky-nang/ai-thay-duoc':  knAiThayDuoc,
  'POST /api/gop-y':               gopYGui,
  'GET  /api/gop-y':               gopYDanhSach,
  'POST /api/gop-y/duyet':         gopYDuyet,
  'POST /api/gop-y/hoan-tac':      gopYHoanTac,
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
  'POST /api/quan-tri/quyen-duyet-gopy': qtQuyenDuyetGopY,
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
  'GET  /api/cong-viec/hom-nay':   cvHomNay,
  'POST /api/cong-viec/nhac-tat':  cvNhacTat,
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
      /* Nhắc nhân sự (SPEC-0007 Đợt 2) — CÙNG cron này, KHÔNG thêm trigger
         thứ hai. Hàm tự đóng cửa ngoài 8h–18h và Chủ nhật (ADR-0013), tự
         chống trùng bằng bảng `thong_bao`, nên gọi mỗi 5 phút vẫn đúng 1
         tin/loại/người/ngày. Truyền thẳng `guiThongBao` đang chạy vào để
         không sinh ra bản sao thứ hai của cơ chế gửi. */
      try { await quetNhacNhanSu(env, guiThongBao); } catch (e) { console.error('Cron nhắc nhân sự:', e.message); }
      /* Nhắc việc Trạm Mục Tiêu (SPEC-0004) — ĐÚNG MỘT DÒNG thêm vào cron đã
         có, `wrangler.toml` KHÔNG đổi, không có lịch thứ hai. Hàm tự đóng cửa
         ngoài 8h–18h và Chủ nhật (ADR-0013 — thứ Bảy vẫn nhắc), tự gộp một
         người một tin một ngày, tự chống trùng bằng bảng `thong_bao`, nên gọi
         mỗi 5 phút vẫn đúng ≤1 tin/người/ngày.
         TẮT KHẨN CẤP: đặt biến môi trường NHAC_VIEC_TAT=1 → câm ngay, không
         cần deploy. Bật PILOT riêng một phòng: NHAC_VIEC_BO_PHAN="Kho vận". */
      try { await quetNhacCongViec(env, guiThongBao, guiTelegram); } catch (e) { console.error('Cron nhắc việc:', e.message); }

      // SAO LƯU DỮ LIỆU (SPEC-0005 Phần B · ADR-0013). Hàm tự biết giờ nào thì
      // làm gì: 0h–8h sáng thì xuất dữ liệu theo lô, 9h sáng thì hỏi "hôm qua
      // có bản sao lưu không", còn lại thì về ngay. Chưa cấp quyền Google thì
      // nó bỏ qua êm, KHÔNG làm hỏng đồng bộ Shopee/TikTok ở trên.
      try { await saoLuu.chayMotLuot(env, { guiThongBao, guiTelegram }); } catch (e) { console.error('Cron sao lưu:', e.message); }

      // SLA cổng duyệt góp ý (SPEC-0002) — thêm 1 hàm vào chuỗi cron đã có,
      // KHÔNG tạo cron mới. Lỗi ở đây không được chặn các việc nền khác.
      try { await gopYNhacSla(env); } catch (e) { console.error('Cron SLA góp ý:', e.message); }

      // KHÔNG CÒN AI DUYỆT ĐƯỢC GÓP Ý — tự phát hiện, tối đa 1 tin/ngày.
      // Ca thật đã lường (REV-0030): khôi phục một bản sao lưu CSV chụp TRƯỚC
      // migration → cột `duyet_gopy` không có trong file → mọi dòng về mặc
      // định 0 → không ai duyệt được, VÀ không ai bật lại được từ trong ERP
      // (cấp cờ chỉ người đang giữ cờ làm được). Hàng chờ đứng im, 200 hết,
      // không một dòng cảnh báo. Ba câu SQL rẻ, chạy 5 phút/lần.
      try { await canhBaoKhongConNguoiDuyetGopY(env); }
      catch (e) { console.error('Cron kiểm người duyệt góp ý:', e.message); }

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
