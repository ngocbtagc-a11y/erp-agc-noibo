/* ==========================================================================
   MODULE DỮ LIỆU NỀN — Phòng ban / Chức danh / Đơn vị tính + tình trạng sẵn
   sàng dữ liệu, chạy trên máy chủ Cloudflare Worker.
   ---------------------------------------------------------------------------
   Đây là danh mục CHUẨN dùng chung (không phải dữ liệu nghiệp vụ như đơn
   hàng/kho). Mỗi danh mục chỉ có: tên, hoạt động (ẩn thay vì xoá vật lý —
   tránh vỡ tham chiếu ở nhân sự/sản phẩm đã gắn vào).
   ========================================================================== */

import { duocThemNhanSu, duocQuanLyKho, laAdmin } from './quyen.js';

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
  if (laAdmin(phien.vai_tro)) return null;             // Admin luôn sửa được kể cả đã khoá
  return loi('Dữ liệu này đã khoá — cần Giám đốc/Phó Giám đốc sửa hoặc mở khoá lại', 403);
}

/* ---- Tiện ích dùng chung cho cả 3 danh mục (Phòng ban/Chức danh/Đơn vị) -- */

async function danhSachDanhMuc(env, bang) {
  const { results } = await env.DB.prepare(
    `SELECT id, ten, hoat_dong, trang_thai FROM ${bang} ORDER BY hoat_dong DESC, ten`
  ).all();
  return json({ ds: results || [] });
}

async function themDanhMuc(env, bang, body, tenLoi) {
  const ten = String(body?.ten || '').trim();
  if (ten.length < 2) return loi(`Vui lòng nhập ${tenLoi}`);

  const trung = await env.DB.prepare(`SELECT id FROM ${bang} WHERE ten = ?`).bind(ten).first();
  if (trung) return loi(`"${ten}" đã tồn tại`);

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
    const trung = await env.DB.prepare(`SELECT id FROM ${bang} WHERE ten = ? AND id <> ?`).bind(ten, id).first();
    if (trung) return loi(`"${ten}" đã tồn tại`);
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
  if (muon === 'nhap' && !laAdmin(phien.vai_tro)) {
    return loi('Chỉ Giám đốc/Phó Giám đốc mới mở khoá lại được', 403);
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
  return duocThemNhanSu(phien.vai_tro) ? null : loi('Bạn không có quyền sửa Phòng ban/Chức danh', 403);
}
function batBuocHangHoa(phien) {
  return duocQuanLyKho(phien.vai_tro) ? null : loi('Bạn không có quyền sửa Đơn vị tính', 403);
}

/* ==========================================================================
   PHÒNG BAN
   ========================================================================== */
export const danhSachPhongBan = (env) => danhSachDanhMuc(env, 'phong_ban');
export const themPhongBan = (env, phien, body) =>
  batBuocToChuc(phien) || themDanhMuc(env, 'phong_ban', body, 'tên phòng ban');
export const suaPhongBan = (env, phien, body) =>
  batBuocToChuc(phien) || suaDanhMuc(env, phien, 'phong_ban', body, 'tên phòng ban');
export const khoaPhongBan = (env, phien, body) =>
  batBuocToChuc(phien) || khoaDanhMuc(env, phien, 'phong_ban', body);

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
   TÌNH TRẠNG SẴN SÀNG DỮ LIỆU NỀN — cho admin biết còn thiếu gì, không phải
   dashboard phức tạp, chỉ đếm số dòng thật + tính trạng thái đơn giản.
   ========================================================================== */
export async function tinhTrangSanSang(env) {
  const dem = async (sql) => (await env.DB.prepare(sql).first())?.n || 0;

  const [
    phongBan, chucDanh, donVi,
    nhanSuTong, nhanSuDaGanPB,
    sanPhamTong, sanPhamDaGanDV
  ] = await Promise.all([
    dem('SELECT COUNT(*) AS n FROM phong_ban WHERE hoat_dong = 1'),
    dem('SELECT COUNT(*) AS n FROM chuc_danh WHERE hoat_dong = 1'),
    dem('SELECT COUNT(*) AS n FROM don_vi_tinh WHERE hoat_dong = 1'),
    dem('SELECT COUNT(*) AS n FROM nhan_su WHERE dang_lam = 1'),
    dem('SELECT COUNT(*) AS n FROM nhan_su WHERE dang_lam = 1 AND phong_ban_id IS NOT NULL'),
    dem('SELECT COUNT(*) AS n FROM san_pham WHERE dang_ban = 1'),
    dem('SELECT COUNT(*) AS n FROM san_pham WHERE dang_ban = 1 AND don_vi_id IS NOT NULL')
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
    { ma: 'nha_cung_cap', ten: 'Nhà cung cấp', tong: 0, trang_thai: 'NOT_STARTED' },
    { ma: 'kho',        ten: 'Kho',          tong: 0, trang_thai: 'NOT_STARTED' },
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
