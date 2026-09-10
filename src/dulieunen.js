/* ==========================================================================
   MODULE DỮ LIỆU NỀN — Phòng ban / Chức danh / Đơn vị tính + tình trạng sẵn
   sàng dữ liệu, chạy trên máy chủ Cloudflare Worker.
   ---------------------------------------------------------------------------
   Đây là danh mục CHUẨN dùng chung (không phải dữ liệu nghiệp vụ như đơn
   hàng/kho). Mỗi danh mục chỉ có: tên, hoạt động (ẩn thay vì xoá vật lý —
   tránh vỡ tham chiếu ở nhân sự/sản phẩm đã gắn vào).
   ========================================================================== */

import { duocThemNhanSu, duocQuanLyKho, laAdmin, duocQuanLyTaiSan } from './quyen.js';

function json(duLieu, status = 200) {
  return new Response(JSON.stringify(duLieu), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function loi(thongDiep, status = 400) {
  return json({ loi: thongDiep }, status);
}

/* ==========================================================================
   DATA LOCK — dùng CHUNG cho mọi bảng dữ liệu nền (phong_ban/chuc_danh/
   don_vi_tinh/san_pham/nhan_su). Chỉ 2 trạng thái: 'nhap' (sửa tự do) và
   'da_khoa' (chỉ Admin sửa được — người thường bị chặn, phải nhờ Admin).
   Ghi log vào lich_su_thay_doi_nen CHỈ khi sửa record đã khoá (record còn
   nháp thì sửa thoải mái, không log — tránh log rác lúc mới nhập/thử).
   ========================================================================== */
export async function ghiLichSuThayDoi(env, phien, bang, banGhiId, thayDoi) {
  const nguoiTen = phien.ho_ten || phien.ten_dang_nhap || '';
  for (const [truong, [cu, moi]] of Object.entries(thayDoi)) {
    if (String(cu ?? '') === String(moi ?? '')) continue;   // không đổi gì thì khỏi ghi
    await env.DB.prepare(`
      INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(bang, String(banGhiId), truong, cu ?? null, moi ?? null, phien.nhan_su_id, nguoiTen).run();
  }
}

/* Chặn sửa record đã khoá nếu người gọi không phải Admin. Trả về null nếu
   được phép sửa, trả về Response lỗi nếu bị chặn. */
function batBuocDuocSuaKhoa(phien, hienCo) {
  if (hienCo.trang_thai !== 'da_khoa') return null;   // còn nháp, ai có quyền sửa danh mục đều sửa được
  if (laAdmin(phien)) return null;             // Admin luôn sửa được kể cả đã khoá
  return loi('Dữ liệu này đã khoá — cần Admin sửa hoặc mở khoá lại', 403);
}

/* Chuẩn hoá tên để so "gần giống" — bỏ dấu, thường hoá, gộp khoảng trắng.
   Cùng logic với boDau() ở app.js (giữ nhất quán 2 phía), cộng thêm gộp
   khoảng trắng vì đây là so trùng chứ không phải tìm kiếm. */
function chuanHoaTen(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/\s+/g, ' ').trim();
}

/* Search Before Create: tìm bản ghi TRÙNG hẳn (chặn) và GẦN GIỐNG (chỉ cảnh
   báo, cho phép xác nhận tạo tiếp — vd "Kho vận" vs "Kho  vận" vs "kho VẬN"
   là cùng 1 chỗ, nhưng "Công ty TNHH ABC" vs "Công ty CP ABC" là 2 NCC khác
   nhau thật, không nên chặn cứng). */
async function timTrungTen(env, bang, ten, boQuaId) {
  const { results } = await env.DB.prepare(
    `SELECT id, ten FROM ${bang} WHERE hoat_dong = 1${boQuaId ? ' AND id <> ?' : ''}`
  ).bind(...(boQuaId ? [boQuaId] : [])).all();
  const chuan = chuanHoaTen(ten);
  const trungHan = (results || []).find(r => r.ten === ten);
  const ganGiong = (results || []).filter(r => r.ten !== ten && chuanHoaTen(r.ten) === chuan);
  return { trungHan, ganGiong };
}

/* ---- Tiện ích dùng chung cho cả 5 danh mục (Phòng ban/Chức danh/Đơn vị/NCC/Kho) -- */

async function danhSachDanhMuc(env, bang, cotThem = '') {
  const { results } = await env.DB.prepare(
    `SELECT id, ten, hoat_dong, trang_thai${cotThem} FROM ${bang} ORDER BY hoat_dong DESC, ten`
  ).all();
  return json({ ds: results || [] });
}

async function themDanhMuc(env, bang, body, tenLoi) {
  const ten = String(body?.ten || '').trim();
  if (ten.length < 2) return loi(`Vui lòng nhập ${tenLoi}`);

  const { trungHan, ganGiong } = await timTrungTen(env, bang, ten);
  if (trungHan) return loi(`"${ten}" đã tồn tại`);
  if (ganGiong.length && !body.xac_nhan) {
    return json({ canh_bao: true, giong: ganGiong.map(g => g.ten) }, 200);
  }

  const r = await env.DB.prepare(`INSERT INTO ${bang} (ten) VALUES (?)`).bind(ten).run();
  return json({ ok: true, id: r.meta.last_row_id });
}

async function suaDanhMuc(env, phien, bang, body, tenLoi) {
  const id = parseInt(body?.id, 10) || 0;
  if (!id) return loi('Thiếu id');

  const hienCo = await env.DB.prepare(`SELECT id, ten, trang_thai FROM ${bang} WHERE id = ?`).bind(id).first();
  if (!hienCo) return loi('Không tìm thấy', 404);

  const chanKhoa = batBuocDuocSuaKhoa(phien, hienCo);
  if (chanKhoa) return chanKhoa;

  if (body.ten != null) {
    const ten = String(body.ten).trim();
    if (ten.length < 2) return loi(`Vui lòng nhập ${tenLoi}`);
    const { trungHan, ganGiong } = await timTrungTen(env, bang, ten, id);
    if (trungHan) return loi(`"${ten}" đã tồn tại`);
    if (ganGiong.length && !body.xac_nhan) {
      return json({ canh_bao: true, giong: ganGiong.map(g => g.ten) }, 200);
    }
    await env.DB.prepare(`UPDATE ${bang} SET ten = ? WHERE id = ?`).bind(ten, id).run();
    if (hienCo.trang_thai === 'da_khoa') {
      await ghiLichSuThayDoi(env, phien, bang, id, { ten: [hienCo.ten, ten] });
    }
  }
  if (body.hoat_dong != null) {
    await env.DB.prepare(`UPDATE ${bang} SET hoat_dong = ? WHERE id = ?`)
      .bind(body.hoat_dong ? 1 : 0, id).run();
  }
  return json({ ok: true });
}

/* Khoá (Data Owner hoặc Admin bấm "Xác nhận & khoá") / Mở khoá (chỉ Admin). */
async function khoaDanhMuc(env, phien, bang, body) {
  const id = parseInt(body?.id, 10) || 0;
  if (!id) return loi('Thiếu id');
  const muon = body.trang_thai === 'da_khoa' ? 'da_khoa' : 'nhap';
  if (muon === 'nhap' && !laAdmin(phien)) {
    return loi('Chỉ Admin mới mở khoá lại được', 403);
  }
  await env.DB.prepare(`UPDATE ${bang} SET trang_thai = ? WHERE id = ?`).bind(muon, id).run();
  return json({ ok: true });
}

/* Phòng ban/Chức danh: chủ sở hữu HCNS + Admin (đúng cờ đã dùng cho "Thêm
   nhân sự" — duocThemNhanSu). Đơn vị tính: chủ sở hữu Quản lý kho + Admin
   (đúng cờ đã dùng cho "Thêm mã hàng" — duocQuanLyKho). Xem danh sách thì
   ai có tab "Dữ liệu nền" cũng xem được — không kiểm ở đây, kiểm ở tầng
   router (index.js) theo tab, giống cách Kho vận đang làm. */
function batBuocToChuc(phien) {
  return duocThemNhanSu(phien) ? null : loi('Bạn không có quyền sửa Phòng ban/Chức danh', 403);
}
function batBuocHangHoa(phien) {
  return duocQuanLyKho(phien) ? null : loi('Bạn không có quyền sửa Đơn vị tính', 403);
}

/* ==========================================================================
   PHÒNG BAN
   ========================================================================== */
export const danhSachPhongBan = async (env) => {
  const { results } = await env.DB.prepare(`
    SELECT pb.id, pb.ten, pb.hoat_dong, pb.trang_thai, pb.truong_phong_id,
           ns.ho_ten AS truong_phong_ten,
           /* Số người ĐANG LÀM của phòng — sơ đồ tổ chức mà không có con số thì
              chỉ là mấy cái hộp. Đây là chỗ nhìn ra ngay phòng nào phình, phòng
              nào trống: đo trên dữ liệu thật 06/09/2026 ra Kho Vận 17 người còn
              Kinh Doanh - MKT 0 người, thứ không ai thấy khi đọc danh sách phẳng. */
           (SELECT COUNT(*) FROM nhan_su n
             WHERE n.phong_ban_id = pb.id AND n.dang_lam = 1) AS so_nguoi,
           pb.thu_tu, pb.cha_id,
           /* Cơ cấu 09/09/2026: cấp của hộp, ai TRỰC TIẾP PHỤ TRÁCH (khác
              trưởng phòng), và hai dòng chức năng in dưới hộp Nhóm. */
           pb.cap, pb.mo_ta, pb.phu_trach_id,
           pt.ho_ten AS phu_trach_ten, pt.chuc_vu AS phu_trach_chuc_vu
      FROM phong_ban pb
      LEFT JOIN nhan_su ns ON ns.id = pb.truong_phong_id
      LEFT JOIN nhan_su pt ON pt.id = pb.phu_trach_id
     ORDER BY pb.hoat_dong DESC, COALESCE(pb.thu_tu, 9999), pb.ten
  `).all();
  return json({ ds: await ganSoCaNhanh(env, results || []),
                tom_tat: await tomTatNhanSuSoDo(env) });
};

/* ==========================================================================
   ĐẾM CẢ NHÁNH — vì một con số không gánh được hai nghĩa
   ---------------------------------------------------------------------------
   Sếp Ngọc 10/09/2026, nhìn sơ đồ ba tầng vừa dựng xong: hộp "Phòng Vận hành
   và Hỗ trợ" in **1 người**, trong khi ba Nhóm dưới nó có 2 + 1 + 17 = 20
   người nữa. Hộp "Phòng Kinh doanh" in **0 người** trong khi hai Nhóm dưới nó
   mỗi nhóm một người.

   `so_nguoi` KHÔNG sai — nó đếm đúng người gán THẲNG vào hộp đó. Cái sai là
   để một con số duy nhất đứng một mình dưới tên phòng: ai đọc cũng hiểu đó là
   "phòng này có bao nhiêu người", và hiểu thế là sai. Cùng lớp với `#ls-dem`
   in "500/500" và với dòng "N việc đang mở" ở Văn phòng ảo — con số trông
   chắc nịch mà sai NGHĨA, không sai phép tính.

   Nên trả về CẢ HAI, để giao diện nói rõ từng cái là gì. KHÔNG đổi nghĩa của
   `so_nguoi`: đổi nghĩa một khoá đang dùng là làm hỏng âm thầm mọi chỗ khác
   đang đọc nó.

   ⚠️ CHẶN VÒNG LẶP. `cha_id` sửa được bằng ô xổ trên màn, nên A-thuộc-B-thuộc-A
   là chuyện người dùng tạo ra được trong ba cú bấm. Truy hồi không chặn thì
   câu lệnh chạy mãi và D1 hết giờ — màn Quản trị chết trắng, mà nguyên nhân
   nằm ở một ô xổ bấm nhầm từ hôm trước. `sau < 8` là trần cứng: cơ cấu Sếp
   ban hành có 3 tầng; tám tầng đã là thứ cần xem lại chứ không phải thứ cần
   đếm cho xong.
   ========================================================================== */
async function ganSoCaNhanh(env, ds) {
  if (!ds.length) return ds;
  try {
    const { results } = await env.DB.prepare(`
      WITH RECURSIVE cay(goc, id, sau) AS (
        SELECT id, id, 0 FROM phong_ban
        UNION ALL
        SELECT c.goc, p.id, c.sau + 1
          FROM phong_ban p JOIN cay c ON p.cha_id = c.id
         WHERE c.sau < 8
      )
      SELECT cay.goc AS goc, COUNT(n.id) AS so
        FROM cay
        LEFT JOIN nhan_su n ON n.phong_ban_id = cay.id AND n.dang_lam = 1
       GROUP BY cay.goc
    `).all();
    const theo = new Map((results || []).map(r => [String(r.goc), Number(r.so) || 0]));
    for (const p of ds) p.so_nguoi_ca_nhanh = theo.get(String(p.id)) ?? (Number(p.so_nguoi) || 0);
  } catch (e) {
    /* Hỏng theo chiều AN TOÀN: thiếu số cả nhánh thì giao diện quay về in mỗi
       số thuộc-thẳng, chứ KHÔNG in một con số bịa. Kèm một dòng log để còn lần
       ra, vì im lặng ở đây đúng là cái lỗi đang vá. */
    console.warn('[ERP] Không đếm được số người cả nhánh:', e?.message || e);
    for (const p of ds) p.so_nguoi_ca_nhanh = null;
  }
  return ds;
}

/* ==========================================================================
   TỔNG NGƯỜI THẬT + NHỮNG NGƯỜI SƠ ĐỒ ĐANG ĐÁNH RƠI
   ---------------------------------------------------------------------------
   VÌ SAO PHẢI CÓ. Sơ đồ cũ lấy tổng người bằng cách CỘNG `so_nguoi` của các
   phòng. Đo thật 09/09/2026: cộng ra 22, mà đang làm là 24 — hai người
   (Nguyễn Thị Huyền, Vũ Lan Hương) chưa có `phong_ban_id` nên không thuộc
   phòng nào, không lọt vào phép cộng, và BIẾN MẤT khỏi sơ đồ. Không dòng nào
   trên màn hình nói rằng họ tồn tại.

   Đó là kiểu hỏng tệ nhất: màn hình trông đầy đủ, con số trông hợp lý, và
   người bị bỏ quên thì im lặng. Nên tổng ở ô gốc PHẢI đếm thẳng
   `nhan_su WHERE dang_lam = 1`, không bao giờ cộng theo phòng; còn ba nhóm
   thiếu dữ liệu thì trả về CÓ TÊN để sơ đồ in ra thành khối cảnh báo đếm
   được, không phải một con số cụt.

   `quan_ly_id` là cột ERP đã điền 23/24 mà sơ đồ cũ KHÔNG dùng một dòng nào.
   Người duy nhất được phép trống là Giám đốc (đỉnh cây) — nên ở đây loại
   đúng những người đang là `phu_trach_id` của hộp cấp công ty, còn lại mà
   trống thì là thiếu thật.
   ========================================================================== */
async function tomTatNhanSuSoDo(env) {
  const { results } = await env.DB.prepare(`
    SELECT n.id, n.ho_ten, n.chuc_vu, n.phong_ban_id, n.quan_ly_id, n.chuc_danh_id
      FROM nhan_su n WHERE n.dang_lam = 1 ORDER BY n.ho_ten
  `).all();
  const nguoi = results || [];

  /* Ai đứng đầu cây: người được gán phụ trách hộp cấp `cong_ty`. Chỉ những
     người này mới được phép trống `quan_ly_id`. */
  const { results: dinh } = await env.DB.prepare(
    `SELECT phu_trach_id, truong_phong_id FROM phong_ban WHERE cap = 'cong_ty'`
  ).all();
  const dinhCay = new Set();
  for (const d of dinh || []) {
    if (d.phu_trach_id) dinhCay.add(d.phu_trach_id);
    if (d.truong_phong_id) dinhCay.add(d.truong_phong_id);
  }

  const gon = n => ({ id: n.id, ho_ten: n.ho_ten, chuc_vu: n.chuc_vu || '' });
  return {
    tong_dang_lam: nguoi.length,
    dinh_cay: [...dinhCay],
    khong_phong:    nguoi.filter(n => n.phong_ban_id == null).map(gon),
    khong_quan_ly:  nguoi.filter(n => !n.quan_ly_id && !dinhCay.has(n.id)).map(gon),
    trong_chuc_vu:  nguoi.filter(n => !String(n.chuc_vu || '').trim()).map(gon),
    trong_chuc_danh: nguoi.filter(n => n.chuc_danh_id == null).map(gon)
  };
}
export const themPhongBan = (env, phien, body) =>
  batBuocToChuc(phien) || themDanhMuc(env, 'phong_ban', body, 'tên phòng ban');
export const suaPhongBan = (env, phien, body) =>
  batBuocToChuc(phien) || suaDanhMuc(env, phien, 'phong_ban', body, 'tên phòng ban');
export const khoaPhongBan = (env, phien, body) =>
  batBuocToChuc(phien) || khoaDanhMuc(env, phien, 'phong_ban', body);

/* Gán trưởng phòng — TÁCH riêng khỏi suaPhongBan (chỉ đổi tên) vì đây là
   quyết định cấp Ban Giám đốc, không phải sửa danh mục thường; cho phép gán
   ngay cả khi phòng ban đã khoá (khoá chỉ chặn đổi TÊN, không chặn gán
   trưởng phòng — 2 việc khác nhau). */
export async function ganTruongPhong(env, phien, body) {
  const chan = batBuocToChuc(phien);
  if (chan) return chan;
  const id = parseInt(body?.id, 10) || 0;
  if (!id) return loi('Thiếu id phòng ban');
  const pb = await env.DB.prepare('SELECT id FROM phong_ban WHERE id = ?').bind(id).first();
  if (!pb) return loi('Không tìm thấy phòng ban', 404);

  const truongPhongId = body.truong_phong_id ? String(body.truong_phong_id).trim() : null;
  if (truongPhongId) {
    const ns = await env.DB.prepare('SELECT id FROM nhan_su WHERE id = ? AND dang_lam = 1').bind(truongPhongId).first();
    if (!ns) return loi('Không tìm thấy nhân sự này hoặc đã nghỉ việc', 404);
  }
  await env.DB.prepare('UPDATE phong_ban SET truong_phong_id = ? WHERE id = ?').bind(truongPhongId, id).run();
  return json({ ok: true });
}

/* ==========================================================================
   CHỨC DANH
   ========================================================================== */
export const danhSachChucDanh = (env) => danhSachDanhMuc(env, 'chuc_danh');
export const themChucDanh = (env, phien, body) =>
  batBuocToChuc(phien) || themDanhMuc(env, 'chuc_danh', body, 'tên chức danh');
export const suaChucDanh = (env, phien, body) =>
  batBuocToChuc(phien) || suaDanhMuc(env, phien, 'chuc_danh', body, 'tên chức danh');
export const khoaChucDanh = (env, phien, body) =>
  batBuocToChuc(phien) || khoaDanhMuc(env, phien, 'chuc_danh', body);

/* ==========================================================================
   DANH MỤC TÀI SẢN / VỊ TRÍ TÀI SẢN — Master Data cho module Tài sản (xem
   docs/audit/AUDIT-TAISAN-MODULE.md). Chủ sở hữu = Data Owner Tài sản
   (duocQuanLyTaiSan: admin/admin_backup/hcns) — cùng nhóm đang tạo/cấp
   phát/thu hồi tài sản, không cần vai trò riêng. Reuse thẳng
   danhSachDanhMuc/themDanhMuc/suaDanhMuc/khoaDanhMuc chung phía trên —
   không viết lại logic khoá/Search Before Create riêng cho 2 bảng này.
   ========================================================================== */
function batBuocTaiSan(phien) {
  return duocQuanLyTaiSan(phien) ? null : loi('Bạn không có quyền sửa Danh mục/Vị trí tài sản', 403);
}
export const danhSachDanhMucTaiSan = (env) => danhSachDanhMuc(env, 'tai_san_danh_muc');
export const themDanhMucTaiSan = (env, phien, body) =>
  batBuocTaiSan(phien) || themDanhMuc(env, 'tai_san_danh_muc', body, 'tên danh mục tài sản');
export const suaDanhMucTaiSan = (env, phien, body) =>
  batBuocTaiSan(phien) || suaDanhMuc(env, phien, 'tai_san_danh_muc', body, 'tên danh mục tài sản');
export const khoaDanhMucTaiSan = (env, phien, body) =>
  batBuocTaiSan(phien) || khoaDanhMuc(env, phien, 'tai_san_danh_muc', body);

export const danhSachViTriTaiSan = (env) => danhSachDanhMuc(env, 'tai_san_vi_tri');
export const themViTriTaiSan = (env, phien, body) =>
  batBuocTaiSan(phien) || themDanhMuc(env, 'tai_san_vi_tri', body, 'tên vị trí');
export const suaViTriTaiSan = (env, phien, body) =>
  batBuocTaiSan(phien) || suaDanhMuc(env, phien, 'tai_san_vi_tri', body, 'tên vị trí');
export const khoaViTriTaiSan = (env, phien, body) =>
  batBuocTaiSan(phien) || khoaDanhMuc(env, phien, 'tai_san_vi_tri', body);

/* ==========================================================================
   ĐƠN VỊ TÍNH
   ========================================================================== */
export const danhSachDonVi = (env) => danhSachDanhMuc(env, 'don_vi_tinh');
export const themDonVi = (env, phien, body) =>
  batBuocHangHoa(phien) || themDanhMuc(env, 'don_vi_tinh', body, 'tên đơn vị tính');
export const suaDonVi = (env, phien, body) =>
  batBuocHangHoa(phien) || suaDanhMuc(env, phien, 'don_vi_tinh', body, 'tên đơn vị tính');
export const khoaDonVi = (env, phien, body) =>
  batBuocHangHoa(phien) || khoaDanhMuc(env, phien, 'don_vi_tinh', body);

/* ==========================================================================
   NHÀ CUNG CẤP — chủ sở hữu Quản lý kho + Admin (đúng nơi NCC được dùng
   hiện tại: giao_dich_kho.doi_tac lúc nhập hàng, thuộc quy trình Kho vận).
   Tên KHÔNG bắt buộc trùng khít mới cảnh báo — công ty có thể có 2 NCC tên
   gần giống thật (VD "Công ty TNHH ABC" khác "Công ty CP ABC") nên chỉ
   cảnh báo (Search Before Create), không chặn cứng như phong_ban/chuc_danh.
   ========================================================================== */
export async function danhSachNhaCungCap(env) {
  return danhSachDanhMuc(env, 'nha_cung_cap', ', ma_so_thue, dien_thoai, dia_chi');
}
export async function themNhaCungCap(env, phien, body) {
  const chan = batBuocHangHoa(phien);
  if (chan) return chan;
  const ten = String(body?.ten || '').trim();
  if (ten.length < 2) return loi('Vui lòng nhập tên nhà cung cấp');

  const { trungHan, ganGiong } = await timTrungTen(env, 'nha_cung_cap', ten);
  if (trungHan) return loi(`"${ten}" đã tồn tại`);
  if (ganGiong.length && !body.xac_nhan) return json({ canh_bao: true, giong: ganGiong.map(g => g.ten) });

  const r = await env.DB.prepare(`
    INSERT INTO nha_cung_cap (ten, ma_so_thue, dien_thoai, dia_chi) VALUES (?, ?, ?, ?)
  `).bind(ten, String(body.ma_so_thue || '').trim() || null,
    String(body.dien_thoai || '').trim() || null, String(body.dia_chi || '').trim() || null).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
export async function suaNhaCungCap(env, phien, body) {
  const chan = batBuocHangHoa(phien);
  if (chan) return chan;
  const id = parseInt(body?.id, 10) || 0;
  if (!id) return loi('Thiếu id');

  const hienCo = await env.DB.prepare('SELECT id, ten, ma_so_thue, dien_thoai, dia_chi, trang_thai FROM nha_cung_cap WHERE id = ?').bind(id).first();
  if (!hienCo) return loi('Không tìm thấy', 404);
  const chanKhoa = batBuocDuocSuaKhoa(phien, hienCo);
  if (chanKhoa) return chanKhoa;

  if (body.ten != null) {
    const ten = String(body.ten).trim();
    if (ten.length < 2) return loi('Vui lòng nhập tên nhà cung cấp');
    const { trungHan, ganGiong } = await timTrungTen(env, 'nha_cung_cap', ten, id);
    if (trungHan) return loi(`"${ten}" đã tồn tại`);
    if (ganGiong.length && !body.xac_nhan) return json({ canh_bao: true, giong: ganGiong.map(g => g.ten) });

    const moi = {
      ten, ma_so_thue: String(body.ma_so_thue || '').trim() || null,
      dien_thoai: String(body.dien_thoai || '').trim() || null,
      dia_chi: String(body.dia_chi || '').trim() || null
    };
    await env.DB.prepare('UPDATE nha_cung_cap SET ten=?, ma_so_thue=?, dien_thoai=?, dia_chi=? WHERE id=?')
      .bind(moi.ten, moi.ma_so_thue, moi.dien_thoai, moi.dia_chi, id).run();
    if (hienCo.trang_thai === 'da_khoa') {
      await ghiLichSuThayDoi(env, phien, 'nha_cung_cap', id, {
        ten: [hienCo.ten, moi.ten], ma_so_thue: [hienCo.ma_so_thue, moi.ma_so_thue],
        dien_thoai: [hienCo.dien_thoai, moi.dien_thoai], dia_chi: [hienCo.dia_chi, moi.dia_chi]
      });
    }
  }
  if (body.hoat_dong != null) {
    await env.DB.prepare('UPDATE nha_cung_cap SET hoat_dong = ? WHERE id = ?').bind(body.hoat_dong ? 1 : 0, id).run();
  }
  return json({ ok: true });
}
export const khoaNhaCungCap = (env, phien, body) => {
  const chan = batBuocHangHoa(phien);
  return chan || khoaDanhMuc(env, phien, 'nha_cung_cap', body);
};

/* ==========================================================================
   KHO (nhiều kho vật lý) — chủ sở hữu Admin, vì đây là cấu hình cấp công
   ty, hiếm khi đổi (hiện thực tế công ty chỉ có 1 kho, nhưng cứ chuẩn bị
   sẵn để mở kho 2 không cần sửa code).
   ========================================================================== */
function batBuocKho(phien) {
  return laAdmin(phien) ? null : loi('Chỉ Admin mới quản lý được danh sách Kho', 403);
}
export async function danhSachKho(env) {
  return danhSachDanhMuc(env, 'kho', ', dia_chi');
}
export async function themKho(env, phien, body) {
  const chan = batBuocKho(phien);
  if (chan) return chan;
  const ten = String(body?.ten || '').trim();
  if (ten.length < 2) return loi('Vui lòng nhập tên kho');
  const { trungHan } = await timTrungTen(env, 'kho', ten);
  if (trungHan) return loi(`"${ten}" đã tồn tại`);
  const r = await env.DB.prepare('INSERT INTO kho (ten, dia_chi) VALUES (?, ?)')
    .bind(ten, String(body.dia_chi || '').trim() || null).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
export async function suaKho(env, phien, body) {
  const chan = batBuocKho(phien);
  if (chan) return chan;
  const id = parseInt(body?.id, 10) || 0;
  if (!id) return loi('Thiếu id');
  const hienCo = await env.DB.prepare('SELECT id, ten, dia_chi FROM kho WHERE id = ?').bind(id).first();
  if (!hienCo) return loi('Không tìm thấy', 404);
  // Kho luôn do Admin quản lý nên không cần chặn khoá riêng — Admin sửa được luôn.

  if (body.ten != null) {
    const ten = String(body.ten).trim();
    if (ten.length < 2) return loi('Vui lòng nhập tên kho');
    const { trungHan } = await timTrungTen(env, 'kho', ten, id);
    if (trungHan) return loi(`"${ten}" đã tồn tại`);
    await env.DB.prepare('UPDATE kho SET ten=?, dia_chi=? WHERE id=?')
      .bind(ten, String(body.dia_chi || '').trim() || null, id).run();
  }
  if (body.hoat_dong != null) {
    await env.DB.prepare('UPDATE kho SET hoat_dong = ? WHERE id = ?').bind(body.hoat_dong ? 1 : 0, id).run();
  }
  return json({ ok: true });
}

/* ==========================================================================
   TÌNH TRẠNG SẴN SÀNG DỮ LIỆU NỀN — cho admin biết còn thiếu gì, không phải
   dashboard phức tạp, chỉ đếm số dòng thật + tính trạng thái đơn giản.
   ========================================================================== */
export async function tinhTrangSanSang(env) {
  const dem = async (sql) => (await env.DB.prepare(sql).first())?.n || 0;

  const [
    phongBan, chucDanh, donVi,
    nhanSuTong, nhanSuDaGanPB,
    sanPhamTong, sanPhamDaGanDV,
    nccTong, khoTong
  ] = await Promise.all([
    dem('SELECT COUNT(*) AS n FROM phong_ban WHERE hoat_dong = 1'),
    dem('SELECT COUNT(*) AS n FROM chuc_danh WHERE hoat_dong = 1'),
    dem('SELECT COUNT(*) AS n FROM don_vi_tinh WHERE hoat_dong = 1'),
    dem('SELECT COUNT(*) AS n FROM nhan_su WHERE dang_lam = 1'),
    dem('SELECT COUNT(*) AS n FROM nhan_su WHERE dang_lam = 1 AND phong_ban_id IS NOT NULL'),
    dem('SELECT COUNT(*) AS n FROM san_pham WHERE dang_ban = 1'),
    dem('SELECT COUNT(*) AS n FROM san_pham WHERE dang_ban = 1 AND don_vi_id IS NOT NULL'),
    dem('SELECT COUNT(*) AS n FROM nha_cung_cap WHERE hoat_dong = 1'),
    dem('SELECT COUNT(*) AS n FROM kho WHERE hoat_dong = 1')
  ]);

  // Trạng thái đơn giản: 0 dòng = NOT_STARTED, có nhưng chưa gắn hết = IN_PROGRESS, xong = READY.
  const tt = (tong, xong) => {
    if (tong === 0) return 'NOT_STARTED';
    if (xong === undefined) return 'READY';   // danh mục không có khái niệm "gắn"
    return xong >= tong ? 'READY' : 'IN_PROGRESS';
  };

  const muc = [
    { ma: 'phong_ban',  ten: 'Phòng ban',   tong: phongBan,  trang_thai: tt(phongBan) },
    { ma: 'chuc_danh',  ten: 'Chức danh',   tong: chucDanh,  trang_thai: tt(chucDanh) },
    { ma: 'don_vi',     ten: 'Đơn vị tính', tong: donVi,     trang_thai: tt(donVi) },
    { ma: 'nhan_su',    ten: 'Nhân sự',     tong: nhanSuTong, da_gan: nhanSuDaGanPB,
      trang_thai: tt(nhanSuTong, nhanSuDaGanPB) },
    { ma: 'san_pham',   ten: 'Sản phẩm/SKU', tong: sanPhamTong, da_gan: sanPhamDaGanDV,
      trang_thai: tt(sanPhamTong, sanPhamDaGanDV) },
    { ma: 'nha_cung_cap', ten: 'Nhà cung cấp', tong: nccTong, trang_thai: tt(nccTong) },
    { ma: 'kho',        ten: 'Kho',          tong: khoTong,  trang_thai: tt(khoTong) },
    { ma: 'mapping',    ten: 'Mapping mã ngoài', tong: 0, trang_thai: 'NOT_STARTED' }
  ];

  // "Việc tiếp theo" — chỉ liệt kê mục CHƯA xong, ưu tiên theo đúng thứ tự phụ thuộc.
  const viecTiepTheo = [];
  if (phongBan === 0) viecTiepTheo.push({ chu: 'Chưa có Phòng ban nào — vào Dữ liệu nền > Tổ chức để thêm.', tab: 'to-chuc' });
  if (chucDanh === 0) viecTiepTheo.push({ chu: 'Chưa có Chức danh nào — vào Dữ liệu nền > Tổ chức để thêm.', tab: 'to-chuc' });
  if (donVi === 0) viecTiepTheo.push({ chu: 'Chưa có Đơn vị tính nào — vào Dữ liệu nền > Hàng hoá để thêm.', tab: 'hang-hoa' });
  if (nhanSuTong > nhanSuDaGanPB) viecTiepTheo.push({ chu: `Còn ${nhanSuTong - nhanSuDaGanPB} nhân sự chưa gắn Phòng ban — vào Nhân sự để sửa.`, tab: null });
  if (sanPhamTong === 0) viecTiepTheo.push({ chu: 'Chưa có Sản phẩm/SKU nào — vào Kho vận > Tồn kho để thêm.', tab: null });
  else if (sanPhamTong > sanPhamDaGanDV) viecTiepTheo.push({ chu: `Còn ${sanPhamTong - sanPhamDaGanDV} sản phẩm chưa gắn Đơn vị tính — vào Kho vận để sửa.`, tab: null });

  return json({ muc, viec_tiep_theo: viecTiepTheo });
}

/* ==========================================================================
   SẮP XẾP LẠI SƠ ĐỒ — nhận kết quả kéo thả
   ---------------------------------------------------------------------------
   Sếp Ngọc 06/09/2026: kéo thả để thiết kế lại sơ đồ tổ chức.

   Nhận CẢ SƠ ĐỒ một lần, không nhận từng thao tác lẻ. Kéo một hộp thường làm
   đổi thứ tự của mấy hộp bên cạnh; gửi từng cái một thì có lúc nửa chừng mạng
   rớt và sơ đồ mắc kẹt ở trạng thái dở dang, không ai biết đúng sai.

   CHỐNG VÒNG LẶP: kéo Ban Giám đốc vào trong chính phòng con của nó thì sơ đồ
   thành vòng tròn — truy vấn cây sẽ chạy mãi không dừng. Kiểm bằng cách đi
   ngược lên gốc trước khi ghi; gặp lại chính mình thì từ chối cả lệnh.
   ========================================================================== */
export const sapXepPhongBan = async (env, phien, body) => {
  const chan = batBuocToChuc(phien);
  if (chan) return chan;

  const ds = Array.isArray(body?.ds) ? body.ds : null;
  if (!ds || !ds.length) return loi('Không có gì để sắp xếp');
  if (ds.length > 200) return loi('Sơ đồ dài bất thường, không nhận');

  /* ⚠️ KIỂM VÒNG LẶP DỰA TRÊN CÂY THẬT TRONG DATABASE, không dựa vào danh sách
     trình duyệt gửi lên.

     Bản đầu tôi cho trình duyệt gửi CẢ sơ đồ mỗi lần đổi một hộp, rồi kiểm vòng
     lặp trong chính danh sách đó. Đo ra hỏng ngay: bản chụp trong bộ nhớ trình
     duyệt cũ hơn database, nên đổi một phòng lại GHI ĐÈ cấp cha của phòng khác
     — chỉ đổi id 3 mà id 4 cũng bị kéo theo.

     Giờ trình duyệt chỉ gửi ĐÚNG dòng vừa đổi, còn máy chủ tự đọc cây hiện tại
     để soi vòng lặp. Máy chủ là nơi duy nhất biết sự thật mới nhất. */
  const { results: hienCo } = await env.DB
    .prepare('SELECT id, cha_id FROM phong_ban').all();
  const chaHienCo = new Map((hienCo || []).map(r => [Number(r.id), r.cha_id == null ? null : Number(r.cha_id)]));

  for (const m of ds) {
    const id = Number(m.id);
    if (!Number.isInteger(id) || !chaHienCo.has(id)) return loi('Mã phòng ban không hợp lệ');
    const cha = (m.cha_id === null || m.cha_id === undefined || m.cha_id === '') ? null : Number(m.cha_id);
    if (cha !== null && !chaHienCo.has(cha)) return loi('Mã phòng ban cấp trên không hợp lệ');
    if (cha === id) return loi('Một phòng ban không thể trực thuộc chính nó');
    chaHienCo.set(id, cha);          // áp thay đổi lên bản đồ rồi mới soi
  }

  for (const [id] of chaHienCo) {
    const daQua = new Set([id]);
    let cha = chaHienCo.get(id);
    while (cha !== null && cha !== undefined) {
      if (daQua.has(cha)) return loi('Sắp xếp này tạo thành vòng tròn — một phòng ban vòng lại nằm dưới chính nó');
      daQua.add(cha);
      cha = chaHienCo.get(cha);
    }
  }

  /* Chỉ ghi những dòng gửi lên. thu_tu chỉ ghi khi có gửi — không tự đặt lại,
     vì đặt lại là lặng lẽ xoá thứ tự người ta đã sắp. */
  const lenh = ds.map(m => {
    const cha = (m.cha_id === null || m.cha_id === undefined || m.cha_id === '') ? null : Number(m.cha_id);
    return (m.thu_tu === undefined || m.thu_tu === null)
      ? env.DB.prepare('UPDATE phong_ban SET cha_id = ? WHERE id = ?').bind(cha, Number(m.id))
      : env.DB.prepare('UPDATE phong_ban SET cha_id = ?, thu_tu = ? WHERE id = ?')
              .bind(cha, Number(m.thu_tu), Number(m.id));
  });
  await env.DB.batch(lenh);

  return json({ ok: true, so: ds.length });
};
