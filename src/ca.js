/* ==========================================================================
   ĐĂNG KÝ CA / XẾP CA — Part-time & Thời vụ (xem docs/ENTITY_IDENTITY.md)
   ---------------------------------------------------------------------------
   3 lớp dữ liệu TÁCH RIÊNG, không gộp:
     dang_ky_ca (nhu cầu nhân viên) -> lich_lam_viec (lịch chính thức, chỉ
     tạo khi đăng ký ĐƯỢC DUYỆT hoặc trưởng phòng GÁN CA thủ công).
   Chấm công (attendance) CHƯA xây — lich_lam_viec chỉ chừa chỗ nối sau này,
   KHÔNG được suy luận "đã duyệt ca" = "đã đi làm".

   Duyệt/từ chối/gán ca/khoá: chỉ đúng TRƯỞNG PHÒNG của phòng ban đó
   (phong_ban.truong_phong_id) hoặc Admin — kiểm tra bằng cách đọc DB, không
   phải permission tĩnh (khác Kho/Tài sản vì đây là quyền theo TỪNG phòng ban
   cụ thể, không theo vai trò chung).
   ========================================================================== */

import { laAdmin, duocQuanLyChinhSachCa } from './quyen.js';

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }
function chuoi(v) { const s = String(v ?? '').trim(); return s || null; }

/* ---- Ai được duyệt/gán ca/khoá lịch của 1 phòng ban? ---------------------
   Admin luôn được. Ngoài ra chỉ đúng người đang là truong_phong_id của
   CHÍNH phòng ban đó — không suy rộng ra "quản lý trực tiếp" nói chung. */
async function laTruongPhong(env, phien, phongBanId) {
  if (laAdmin(phien.vai_tro)) return true;
  const pb = await env.DB.prepare('SELECT truong_phong_id FROM phong_ban WHERE id = ?').bind(phongBanId).first();
  return !!(pb && pb.truong_phong_id === phien.nhan_su_id);
}

async function ghiLichSuCa(env, phien, loaiDoiTuong, doiTuongId, hanhDong, ttCu, ttMoi, ghiChu) {
  await env.DB.prepare(`
    INSERT INTO ca_lich_su (loai_doi_tuong, doi_tuong_id, hanh_dong, trang_thai_cu, trang_thai_moi, ghi_chu, nguoi_thuc_hien)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(loaiDoiTuong, String(doiTuongId), hanhDong, ttCu ?? null, ttMoi ?? null, ghiChu ?? null, phien.nhan_su_id).run();
}

/* ==========================================================================
   MẪU CA — danh mục chuẩn (HR/Admin quản lý, ai cũng xem được để hiểu ký hiệu)
   ========================================================================== */
export async function danhSachMauCa(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM mau_ca WHERE dang_dung = 1 ORDER BY gio_bat_dau'
  ).all();
  return json({ ds: results });
}

export async function themMauCa(env, phien, body) {
  if (!duocQuanLyChinhSachCa(phien.vai_tro)) return loi('Bạn không có quyền quản lý Mẫu ca', 403);
  const maCa = chuoi(body.ma_ca), tenCa = chuoi(body.ten_ca);
  const gioBd = chuoi(body.gio_bat_dau), gioKt = chuoi(body.gio_ket_thuc);
  if (!maCa || !tenCa || !gioBd || !gioKt) return loi('Vui lòng nhập đủ mã ca, tên ca, giờ bắt đầu/kết thúc');

  const id = 'mc_' + crypto.randomUUID().slice(0, 12);
  try {
    await env.DB.prepare(`
      INSERT INTO mau_ca (id, ma_ca, ten_ca, gio_bat_dau, gio_ket_thuc, phut_nghi)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, maCa, tenCa, gioBd, gioKt, parseInt(body.phut_nghi, 10) || 0).run();
  } catch (e) {
    return loi(String(e.message || '').includes('UNIQUE') ? `Mã ca "${maCa}" đã tồn tại` : 'Không lưu được, thử lại nhé.');
  }
  return json({ ok: true, id });
}

export async function suaMauCa(env, phien, body) {
  if (!duocQuanLyChinhSachCa(phien.vai_tro)) return loi('Bạn không có quyền quản lý Mẫu ca', 403);
  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id mẫu ca');
  const maCa = chuoi(body.ma_ca), tenCa = chuoi(body.ten_ca);
  const gioBd = chuoi(body.gio_bat_dau), gioKt = chuoi(body.gio_ket_thuc);
  if (!maCa || !tenCa || !gioBd || !gioKt) return loi('Vui lòng nhập đủ mã ca, tên ca, giờ bắt đầu/kết thúc');

  try {
    await env.DB.prepare(`
      UPDATE mau_ca SET ma_ca = ?, ten_ca = ?, gio_bat_dau = ?, gio_ket_thuc = ?, phut_nghi = ? WHERE id = ?
    `).bind(maCa, tenCa, gioBd, gioKt, parseInt(body.phut_nghi, 10) || 0, id).run();
  } catch (e) {
    return loi(String(e.message || '').includes('UNIQUE') ? `Mã ca "${maCa}" đã tồn tại` : 'Không lưu được, thử lại nhé.');
  }
  return json({ ok: true });
}

/* Xoá HẲN — chỉ khi chưa có Ca mở nào dùng mẫu này (đúng nguyên tắc không
   được xoá Entity đã có dữ liệu gắn vào — xem docs/ENTITY_IDENTITY.md).
   Mẫu ca đã dùng rồi thì "Ẩn" (dang_dung=0) thay vì xoá, để không phá vỡ
   liên kết dữ liệu lịch sử. */
export async function xoaMauCa(env, phien, body) {
  if (!duocQuanLyChinhSachCa(phien.vai_tro)) return loi('Bạn không có quyền quản lý Mẫu ca', 403);
  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id mẫu ca');

  const dangDung = await env.DB.prepare('SELECT COUNT(*) AS n FROM ca_mo WHERE mau_ca_id = ?').bind(id).first();
  if (dangDung.n > 0) {
    await env.DB.prepare('UPDATE mau_ca SET dang_dung = 0 WHERE id = ?').bind(id).run();
    return json({ ok: true, da_an: true });
  }
  await env.DB.prepare('DELETE FROM mau_ca WHERE id = ?').bind(id).run();
  return json({ ok: true, da_an: false });
}

/* ==========================================================================
   CA MỞ — 1 mẫu ca x 1 ngày x 1 phòng ban. CHỈ trưởng phòng của đúng phòng
   ban đó (Admin luôn được, xem laTruongPhong) — HR KHÔNG mở ca thay phòng,
   HR chỉ quản lý danh mục Mẫu ca (xem themMauCa). Đây là nguyên tắc Data
   Ownership: "Trưởng bộ phận quyết định phòng mình cần bao nhiêu người".
   ========================================================================== */
export async function themCaMo(env, phien, body) {
  const phongBanId = parseInt(body.phong_ban_id, 10);
  if (!phongBanId) return loi('Thiếu phòng ban');
  if (!(await laTruongPhong(env, phien, phongBanId))) {
    return loi('Bạn không có quyền mở ca cho phòng ban này', 403);
  }

  const ngay = chuoi(body.ngay), mauCaId = chuoi(body.mau_ca_id);
  if (!ngay || !mauCaId) return loi('Thiếu ngày hoặc mẫu ca');

  const id = 'cm_' + crypto.randomUUID().slice(0, 12);
  try {
    await env.DB.prepare(`
      INSERT INTO ca_mo (id, ngay, mau_ca_id, phong_ban_id, can_bao_nhieu_nguoi, toi_da_nguoi,
                          mo_dang_ky_luc, dong_dang_ky_luc, trang_thai, ghi_chu)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mo', ?)
    `).bind(
      id, ngay, mauCaId, phongBanId,
      parseInt(body.can_bao_nhieu_nguoi, 10) || 0,
      body.toi_da_nguoi ? parseInt(body.toi_da_nguoi, 10) : null,
      chuoi(body.mo_dang_ky_luc), chuoi(body.dong_dang_ky_luc),
      chuoi(body.ghi_chu)
    ).run();
  } catch (e) {
    return loi(String(e.message || '').includes('UNIQUE') ? 'Ca này đã được mở cho đúng ngày/mẫu ca/phòng ban rồi' : 'Không lưu được, thử lại nhé.');
  }
  await ghiLichSuCa(env, phien, 'ca_mo', id, 'tao', null, 'mo', null);
  return json({ ok: true, id });
}

/* ---- Kế hoạch nhân lực tuần: mở đăng ký hàng loạt ------------------------
   Trưởng phòng nhập nhu cầu (Mẫu ca x Ngày) trong 1 ma trận rồi bấm "Mở
   đăng ký" 1 lần — KHÔNG bắt mở từng ca một. Ô có can_bao_nhieu_nguoi = 0
   thì bỏ qua, không tạo ca_mo (đúng nguyên tắc "chỉ mở ca có nhu cầu").
   Idempotent: ca_mo đã tồn tại (cùng ngày+mẫu ca+phòng ban) thì CẬP NHẬT
   lại số người cần thay vì báo lỗi trùng — trưởng phòng có thể sửa kế
   hoạch nhiều lần trước khi nhân viên đăng ký kín chỗ. */
export async function moDangKyTuan(env, phien, body) {
  const phongBanId = parseInt(body.phong_ban_id, 10);
  if (!phongBanId) return loi('Thiếu phòng ban');
  if (!(await laTruongPhong(env, phien, phongBanId))) {
    return loi('Bạn không có quyền mở đăng ký cho phòng ban này', 403);
  }

  const danhSach = Array.isArray(body.danh_sach) ? body.danh_sach : [];
  const hanDangKy = chuoi(body.han_dang_ky);
  const oCan = danhSach.filter(o => (parseInt(o.can_bao_nhieu_nguoi, 10) || 0) > 0);
  if (!oCan.length) return loi('Chưa nhập số người cần cho ca nào — chỉ mở ca có nhu cầu thật');

  let daMo = 0, daCapNhat = 0;
  for (const o of oCan) {
    const ngay = chuoi(o.ngay), mauCaId = chuoi(o.mau_ca_id);
    const can = parseInt(o.can_bao_nhieu_nguoi, 10) || 0;
    if (!ngay || !mauCaId) continue;

    const hienCo = await env.DB.prepare(
      'SELECT id FROM ca_mo WHERE ngay = ? AND mau_ca_id = ? AND phong_ban_id = ?'
    ).bind(ngay, mauCaId, phongBanId).first();

    if (hienCo) {
      await env.DB.prepare(
        "UPDATE ca_mo SET can_bao_nhieu_nguoi = ?, dong_dang_ky_luc = COALESCE(?, dong_dang_ky_luc), trang_thai = 'mo' WHERE id = ?"
      ).bind(can, hanDangKy, hienCo.id).run();
      daCapNhat++;
    } else {
      const id = 'cm_' + crypto.randomUUID().slice(0, 12);
      await env.DB.prepare(`
        INSERT INTO ca_mo (id, ngay, mau_ca_id, phong_ban_id, can_bao_nhieu_nguoi, dong_dang_ky_luc, trang_thai)
        VALUES (?, ?, ?, ?, ?, ?, 'mo')
      `).bind(id, ngay, mauCaId, phongBanId, can, hanDangKy).run();
      await ghiLichSuCa(env, phien, 'ca_mo', id, 'tao', null, 'mo', 'Mở theo Kế hoạch nhân lực tuần');
      daMo++;
    }
  }
  return json({ ok: true, da_mo: daMo, da_cap_nhat: daCapNhat });
}

export async function khoaCaMo(env, phien, body) {
  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id ca mở');
  const cm = await env.DB.prepare('SELECT * FROM ca_mo WHERE id = ?').bind(id).first();
  if (!cm) return loi('Không tìm thấy ca mở', 404);
  if (!(await laTruongPhong(env, phien, cm.phong_ban_id))) {
    return loi('Bạn không có quyền đóng ca này', 403);
  }
  await env.DB.prepare("UPDATE ca_mo SET trang_thai = 'dong' WHERE id = ?").bind(id).run();
  await ghiLichSuCa(env, phien, 'ca_mo', id, 'khoa', cm.trang_thai, 'dong', null);
  return json({ ok: true });
}

/* ==========================================================================
   NHÂN VIÊN — xem ca đang mở để đăng ký (chỉ trong đúng phòng ban của mình)
   ========================================================================== */
export async function caDangMo(env, phien) {
  const ns = await env.DB.prepare('SELECT phong_ban_id, loai_lao_dong FROM nhan_su WHERE id = ?').bind(phien.nhan_su_id).first();
  if (!ns || !ns.phong_ban_id) return json({ ds: [], loai_lao_dong: ns ? ns.loai_lao_dong : null });

  const { results } = await env.DB.prepare(`
    SELECT cm.id, cm.ngay, cm.can_bao_nhieu_nguoi, cm.toi_da_nguoi, cm.mo_dang_ky_luc, cm.dong_dang_ky_luc,
           mc.ma_ca, mc.ten_ca, mc.gio_bat_dau, mc.gio_ket_thuc,
           (SELECT COUNT(*) FROM dang_ky_ca d WHERE d.ca_mo_id = cm.id AND d.trang_thai = 'da_duyet') AS da_duyet,
           dk.id AS dang_ky_id, dk.trang_thai AS dang_ky_trang_thai
      FROM ca_mo cm
      JOIN mau_ca mc ON mc.id = cm.mau_ca_id
      LEFT JOIN dang_ky_ca dk ON dk.ca_mo_id = cm.id AND dk.nhan_su_id = ?
     WHERE cm.phong_ban_id = ? AND cm.trang_thai = 'mo' AND cm.ngay >= date('now', '+7 hours', '-1 day')
     ORDER BY cm.ngay, mc.gio_bat_dau
  `).bind(phien.nhan_su_id, ns.phong_ban_id).all();

  return json({ ds: results, loai_lao_dong: ns.loai_lao_dong });
}

export async function dangKyCa(env, phien, body) {
  const ns = await env.DB.prepare('SELECT phong_ban_id, loai_lao_dong, dang_lam FROM nhan_su WHERE id = ?').bind(phien.nhan_su_id).first();
  if (!ns || !ns.dang_lam) return loi('Hồ sơ của bạn không còn hoạt động', 403);
  if (!['ban_thoi_gian', 'thoi_vu'].includes(ns.loai_lao_dong)) {
    return loi('Chỉ nhân sự Part-time/Thời vụ mới tự đăng ký ca — liên hệ HCNS nếu cần hỗ trợ', 403);
  }

  const caMoId = chuoi(body.ca_mo_id);
  if (!caMoId) return loi('Thiếu ca muốn đăng ký');

  const cm = await env.DB.prepare(`
    SELECT cm.*, mc.gio_bat_dau, mc.gio_ket_thuc FROM ca_mo cm
      JOIN mau_ca mc ON mc.id = cm.mau_ca_id WHERE cm.id = ?
  `).bind(caMoId).first();
  if (!cm) return loi('Không tìm thấy ca', 404);
  if (cm.phong_ban_id !== ns.phong_ban_id) return loi('Ca này không thuộc phòng ban của bạn', 403);
  if (cm.trang_thai !== 'mo') return loi('Ca này không còn mở đăng ký', 409);

  const homNay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  if (cm.mo_dang_ky_luc && homNay < cm.mo_dang_ky_luc.slice(0, 10)) return loi('Ca này chưa tới lúc mở đăng ký', 409);
  if (cm.dong_dang_ky_luc && homNay > cm.dong_dang_ky_luc.slice(0, 10)) return loi('Ca này đã đóng đăng ký', 409);

  // Chặn trùng giờ với BẤT KỲ ca nào cùng ngày đã đăng ký/đã xếp (không chỉ
  // trùng đúng 1 ca_mo_id — phải so khoảng giờ thật, đúng mục "Overlapping
  // Shift Detection" trong bản thiết kế).
  const { results: trung } = await env.DB.prepare(`
    SELECT mc2.ten_ca FROM dang_ky_ca dk
      JOIN ca_mo cm2 ON cm2.id = dk.ca_mo_id
      JOIN mau_ca mc2 ON mc2.id = cm2.mau_ca_id
     WHERE dk.nhan_su_id = ? AND cm2.ngay = ? AND dk.trang_thai IN ('cho_duyet', 'da_duyet', 'cho_xep')
       AND mc2.gio_bat_dau < ? AND mc2.gio_ket_thuc > ?
  `).bind(phien.nhan_su_id, cm.ngay, cm.gio_ket_thuc, cm.gio_bat_dau).all();
  if (trung.length) return loi(`Bạn đã đăng ký ca trùng giờ: ${trung[0].ten_ca}`, 409);

  const id = 'dk_' + crypto.randomUUID().slice(0, 12);
  try {
    await env.DB.prepare(`
      INSERT INTO dang_ky_ca (id, nhan_su_id, ca_mo_id, trang_thai, ghi_chu_ns)
      VALUES (?, ?, ?, 'cho_duyet', ?)
    `).bind(id, phien.nhan_su_id, caMoId, chuoi(body.ghi_chu_ns)).run();
  } catch (e) {
    return loi(String(e.message || '').includes('UNIQUE') ? 'Bạn đã đăng ký ca này rồi' : 'Không lưu được, thử lại nhé.');
  }
  await ghiLichSuCa(env, phien, 'dang_ky_ca', id, 'tao', null, 'cho_duyet', null);
  return json({ ok: true, id });
}

export async function huyDangKyCa(env, phien, body) {
  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id đăng ký');
  const dk = await env.DB.prepare('SELECT * FROM dang_ky_ca WHERE id = ?').bind(id).first();
  if (!dk) return loi('Không tìm thấy đăng ký', 404);
  if (dk.nhan_su_id !== phien.nhan_su_id) return loi('Bạn chỉ hủy được đăng ký của chính mình', 403);
  if (!['cho_duyet', 'cho_xep'].includes(dk.trang_thai)) {
    return loi(dk.trang_thai === 'da_duyet' ? 'Ca đã được duyệt — liên hệ trưởng phòng để hủy' : 'Đăng ký này không hủy được nữa', 409);
  }
  await env.DB.prepare("UPDATE dang_ky_ca SET trang_thai = 'da_huy', cap_nhat_luc = datetime('now','+7 hours') WHERE id = ?").bind(id).run();
  await ghiLichSuCa(env, phien, 'dang_ky_ca', id, 'huy', dk.trang_thai, 'da_huy', null);
  return json({ ok: true });
}

export async function lichCuaToi(env, phien, tuNgay, denNgay) {
  const { results } = await env.DB.prepare(`
    SELECT llv.*, mc.ma_ca, mc.ten_ca
      FROM lich_lam_viec llv
      JOIN ca_mo cm ON cm.id = llv.ca_mo_id
      JOIN mau_ca mc ON mc.id = cm.mau_ca_id
     WHERE llv.nhan_su_id = ? AND llv.ngay BETWEEN ? AND ?
     ORDER BY llv.ngay, llv.gio_bat_dau
  `).bind(phien.nhan_su_id, tuNgay, denNgay).all();
  return json({ ds: results });
}

/* ==========================================================================
   TRƯỞNG PHÒNG — Xếp ca tuần (ma trận): danh sách nhân sự phòng ban + toàn
   bộ đăng ký/lịch trong khoảng ngày, gộp sẵn cho frontend vẽ ma trận.
   ========================================================================== */
export async function maTranTuan(env, phien, phongBanId, tuNgay, denNgay) {
  if (!(await laTruongPhong(env, phien, phongBanId))) {
    return loi('Bạn không có quyền xem Xếp ca của phòng ban này', 403);
  }

  const { results: nhanSu } = await env.DB.prepare(`
    SELECT id, ma_nv, ho_ten, viet_tat, loai_lao_dong
      FROM nhan_su
     WHERE phong_ban_id = ? AND dang_lam = 1
       AND loai_lao_dong IN ('ban_thoi_gian', 'thoi_vu')
     ORDER BY ho_ten
  `).bind(phongBanId).all();

  const { results: dangKy } = await env.DB.prepare(`
    SELECT dk.id, dk.nhan_su_id, dk.trang_thai, dk.ghi_chu_ns, dk.tao_luc, dk.duyet_luc, dk.ly_do_tu_choi,
           dk.nguoi_duyet_id, ndg.ho_ten AS nguoi_duyet_ten,
           cm.id AS ca_mo_id, cm.ngay, cm.can_bao_nhieu_nguoi,
           mc.id AS mau_ca_id, mc.ma_ca, mc.ten_ca, mc.gio_bat_dau, mc.gio_ket_thuc,
           (SELECT ap.ly_do FROM allocation_proposals ap WHERE ap.dang_ky_ca_id = dk.id ORDER BY ap.tao_luc DESC, ap.id DESC LIMIT 1) AS ly_do_de_xuat
      FROM dang_ky_ca dk
      JOIN ca_mo cm ON cm.id = dk.ca_mo_id
      JOIN mau_ca mc ON mc.id = cm.mau_ca_id
      LEFT JOIN nhan_su ndg ON ndg.id = dk.nguoi_duyet_id
     WHERE cm.phong_ban_id = ? AND cm.ngay BETWEEN ? AND ? AND dk.trang_thai != 'da_huy'
  `).bind(phongBanId, tuNgay, denNgay).all();

  const { results: caMo } = await env.DB.prepare(`
    SELECT cm.id, cm.ngay, cm.can_bao_nhieu_nguoi, cm.toi_da_nguoi, cm.trang_thai,
           mc.ma_ca, mc.ten_ca, mc.gio_bat_dau, mc.gio_ket_thuc
      FROM ca_mo cm JOIN mau_ca mc ON mc.id = cm.mau_ca_id
     WHERE cm.phong_ban_id = ? AND cm.ngay BETWEEN ? AND ?
     ORDER BY cm.ngay, mc.gio_bat_dau
  `).bind(phongBanId, tuNgay, denNgay).all();

  const { results: lichLam } = await env.DB.prepare(`
    SELECT id, nhan_su_id, ngay, ca_mo_id, trang_thai, nguon, khoa_luc
      FROM lich_lam_viec WHERE phong_ban_id = ? AND ngay BETWEEN ? AND ?
  `).bind(phongBanId, tuNgay, denNgay).all();

  return json({ nhan_su: nhanSu, dang_ky: dangKy, ca_mo: caMo, lich_lam: lichLam });
}

/* ---- Duyệt 1 đăng ký -> tạo lich_lam_viec ---------------------------------
   Tách thành hàm riêng để bulk-approve gọi lại được, tự bắt lỗi từng dòng. */
async function duyetMotDangKy(env, phien, dk) {
  if (dk.trang_thai !== 'cho_duyet' && dk.trang_thai !== 'cho_xep') {
    return { ok: false, loi: 'Đăng ký này không ở trạng thái chờ duyệt' };
  }
  const cm = await env.DB.prepare(`
    SELECT cm.*, mc.gio_bat_dau, mc.gio_ket_thuc FROM ca_mo cm
      JOIN mau_ca mc ON mc.id = cm.mau_ca_id WHERE cm.id = ?
  `).bind(dk.ca_mo_id).first();
  if (!cm) return { ok: false, loi: 'Không tìm thấy ca' };
  if (!(await laTruongPhong(env, phien, cm.phong_ban_id))) {
    return { ok: false, loi: 'Bạn không có quyền duyệt ca của phòng ban này' };
  }

  const llvId = 'llv_' + crypto.randomUUID().slice(0, 12);
  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE dang_ky_ca SET trang_thai = 'da_duyet', nguoi_duyet_id = ?, duyet_luc = datetime('now','+7 hours'), cap_nhat_luc = datetime('now','+7 hours') WHERE id = ?")
        .bind(phien.nhan_su_id, dk.id),
      env.DB.prepare(`
        INSERT INTO lich_lam_viec (id, nhan_su_id, ngay, ca_mo_id, phong_ban_id, gio_bat_dau, gio_ket_thuc, nguon, dang_ky_ca_id, nguoi_xep_id, trang_thai)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'dang_ky', ?, ?, 'da_xep')
      `).bind(llvId, dk.nhan_su_id, cm.ngay, cm.id, cm.phong_ban_id, cm.gio_bat_dau, cm.gio_ket_thuc, dk.id, phien.nhan_su_id)
    ]);
  } catch (e) {
    return { ok: false, loi: String(e.message || '').includes('UNIQUE') ? 'Đã có lịch cho ngày/ca này' : 'Không lưu được' };
  }
  await ghiLichSuCa(env, phien, 'dang_ky_ca', dk.id, 'duyet', dk.trang_thai, 'da_duyet', null);
  await ghiLichSuCa(env, phien, 'lich_lam_viec', llvId, 'tao', null, 'da_xep', 'Từ đăng ký ' + dk.id);
  return { ok: true, lich_lam_viec_id: llvId };
}

/* ==========================================================================
   XẾP LỊCH TỰ ĐỘNG (Auto Allocation) — thay luồng "duyệt từng đăng ký".
   ---------------------------------------------------------------------------
   Input : Staffing Demand (ca_mo.can_bao_nhieu_nguoi) + Employee Availability
           (dang_ky_ca đang cho_duyet/cho_xep).
   Rule engine v1 (deterministic, theo thứ tự ưu tiên — xem docs):
     1. Eligibility  — đã chặn từ lúc đăng ký (active/đúng phòng/đúng loại LĐ).
     2. No conflict  — không xếp 2 ca trùng giờ trong CÙNG lần chạy này.
     3. Max hours    — chưa có policy giờ tối đa, bỏ qua ở v1 (chừa chỗ sau).
     4. Fair distribution — ưu tiên người đang có ÍT GIỜ HƠN trong tuần đang
        xếp (tính trong phạm vi lần chạy, không cộng dồn tuần khác).
     5. Skill        — chưa có dữ liệu kỹ năng, bỏ qua ở v1 (chừa chỗ sau).
     6. Tie-break    — giờ đăng ký (ai đăng ký trước, ưu tiên khi mọi thứ
        khác bằng nhau — KHÔNG phải rule chính, chỉ phá thế hoà).
   Output: KHÔNG tự chốt lịch — chỉ tạo Allocation Proposal (lich_lam_viec
   chưa khoá, đúng như trước đây "duyệt" tạo ra) để trưởng phòng review.
   Idempotent theo hướng an toàn: CHỈ xử lý đăng ký đang cho_duyet/cho_xep —
   không đụng vào cái trưởng phòng đã tự tay quyết định (da_duyet/tu_choi
   do gán thủ công hoặc duyệt tay trước đó), nên chạy lại không phá can
   thiệp thủ công đã có. */
export async function chayPhanBo(env, phien, body) {
  const phongBanId = parseInt(body.phong_ban_id, 10);
  const tuNgay = chuoi(body.tu_ngay), denNgay = chuoi(body.den_ngay);
  if (!phongBanId || !tuNgay || !denNgay) return loi('Thiếu phòng ban hoặc khoảng ngày');
  if (!(await laTruongPhong(env, phien, phongBanId))) {
    return loi('Bạn không có quyền xếp lịch cho phòng ban này', 403);
  }

  const { results: caMoList } = await env.DB.prepare(`
    SELECT cm.id, cm.ngay, cm.can_bao_nhieu_nguoi, mc.gio_bat_dau, mc.gio_ket_thuc
      FROM ca_mo cm JOIN mau_ca mc ON mc.id = cm.mau_ca_id
     WHERE cm.phong_ban_id = ? AND cm.ngay BETWEEN ? AND ? AND cm.trang_thai IN ('mo', 'dong')
     ORDER BY cm.ngay, mc.gio_bat_dau
  `).bind(phongBanId, tuNgay, denNgay).all();
  if (!caMoList.length) return loi('Chưa có ca nào mở trong khoảng thời gian này');

  const idsCaMo = caMoList.map(c => c.id);
  const cho = idsCaMo.map(() => '?').join(',');
  const { results: dangKyList } = await env.DB.prepare(`
    SELECT id, nhan_su_id, ca_mo_id, trang_thai, tao_luc FROM dang_ky_ca
     WHERE ca_mo_id IN (${cho}) AND trang_thai IN ('cho_duyet', 'cho_xep')
     ORDER BY tao_luc
  `).bind(...idsCaMo).all();

  // Người ĐÃ được xếp từ trước (duyệt tay/gán thủ công trước lần chạy này)
  // vẫn phải tính vào "đã có giờ" + "đã chiếm chỗ trong ca" để không xếp
  // chồng/xếp dư — đọc thêm để rule No-conflict + headcount đúng thực tế.
  const { results: daXepTruoc } = await env.DB.prepare(`
    SELECT dk.nhan_su_id, dk.ca_mo_id FROM dang_ky_ca dk
     WHERE dk.ca_mo_id IN (${cho}) AND dk.trang_thai = 'da_duyet'
  `).bind(...idsCaMo).all();

  const caMoTheoId = {};
  caMoList.forEach(c => { caMoTheoId[c.id] = c; });

  function phutCa(cm) {
    const [h1, m1] = cm.gio_bat_dau.split(':').map(Number);
    const [h2, m2] = cm.gio_ket_thuc.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }
  function trungGio(a, b) {
    if (a.ngay !== b.ngay) return false;
    return a.gio_bat_dau < b.gio_ket_thuc && b.gio_bat_dau < a.gio_ket_thuc;
  }

  const gioTheoNhanSu = {};       // nhan_su_id -> tổng phút đã xếp (kể cả trước run)
  const caDaXepTheoNhanSu = {};   // nhan_su_id -> [ca_mo] đã xếp, để check trùng giờ
  const soDaXepTheoCa = {};       // ca_mo_id -> số người đã có (kể cả trước run)

  daXepTruoc.forEach(d => {
    const cm = caMoTheoId[d.ca_mo_id];
    if (!cm) return;
    gioTheoNhanSu[d.nhan_su_id] = (gioTheoNhanSu[d.nhan_su_id] || 0) + phutCa(cm);
    (caDaXepTheoNhanSu[d.nhan_su_id] ||= []).push(cm);
    soDaXepTheoCa[d.ca_mo_id] = (soDaXepTheoCa[d.ca_mo_id] || 0) + 1;
  });

  const dangKyTheoCa = {};
  dangKyList.forEach(d => { (dangKyTheoCa[d.ca_mo_id] ||= []).push(d); });

  const dexuat = [];   // { id, nhan_su_id, ca_mo_id, ket_qua, ly_do }

  for (const cm of caMoList) {
    const ungVien = dangKyTheoCa[cm.id] || [];
    const con = Math.max(0, (cm.can_bao_nhieu_nguoi || 0) - (soDaXepTheoCa[cm.id] || 0));

    // Rule 2 — No conflict: loại người đã có ca trùng giờ (kể cả từ trước run)
    const hopLe = ungVien.filter(d => {
      const daXep = caDaXepTheoNhanSu[d.nhan_su_id];
      if (!daXep) return true;
      return !daXep.some(cmKhac => trungGio(cm, cmKhac));
    });
    const bTrung = ungVien.filter(d => !hopLe.includes(d));

    // Rule 4 — Fair distribution (ít giờ hơn ưu tiên trước), Rule 7 — tie-break giờ đăng ký
    hopLe.sort((a, b) => {
      const gA = gioTheoNhanSu[a.nhan_su_id] || 0, gB = gioTheoNhanSu[b.nhan_su_id] || 0;
      if (gA !== gB) return gA - gB;
      return new Date(a.tao_luc) - new Date(b.tao_luc);
    });

    const chon = hopLe.slice(0, con);
    const khongChon = hopLe.slice(con);

    chon.forEach(d => {
      const gioTruoc = gioTheoNhanSu[d.nhan_su_id] || 0;
      gioTheoNhanSu[d.nhan_su_id] = gioTruoc + phutCa(cm);
      (caDaXepTheoNhanSu[d.nhan_su_id] ||= []).push(cm);
      soDaXepTheoCa[cm.id] = (soDaXepTheoCa[cm.id] || 0) + 1;
      dexuat.push({
        dk: d, ket_qua: 'chon',
        ly_do: `Có thể làm ca này, không trùng giờ, đang có ${Math.round(gioTruoc / 60 * 10) / 10}h tuần này (đăng ký lúc ${d.tao_luc})`
      });
    });
    khongChon.forEach(d => dexuat.push({
      dk: d, ket_qua: 'khong_chon',
      ly_do: `Ca đã đủ ${cm.can_bao_nhieu_nguoi} người — ưu tiên người đang ít giờ hơn`
    }));
    bTrung.forEach(d => dexuat.push({
      dk: d, ket_qua: 'khong_chon',
      ly_do: 'Trùng giờ với ca khác đã được xếp trong tuần này'
    }));
  }

  const runId = 'ar_' + crypto.randomUUID().slice(0, 12);
  await env.DB.prepare(`
    INSERT INTO allocation_runs (id, phong_ban_id, tu_ngay, den_ngay, phien_ban_rule, nguoi_chay_id)
    VALUES (?, ?, ?, ?, 'v1', ?)
  `).bind(runId, phongBanId, tuNgay, denNgay, phien.nhan_su_id).run();

  let soChon = 0, soKhongChon = 0;
  for (const dx of dexuat) {
    await env.DB.prepare(`
      INSERT INTO allocation_proposals (allocation_run_id, dang_ky_ca_id, nhan_su_id, ca_mo_id, ket_qua, ly_do)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(runId, dx.dk.id, dx.dk.nhan_su_id, dx.dk.ca_mo_id, dx.ket_qua, dx.ly_do).run();

    if (dx.ket_qua === 'chon') {
      const kq = await duyetMotDangKy(env, phien, dx.dk);
      if (kq.ok) soChon++;
    } else {
      await env.DB.prepare(
        "UPDATE dang_ky_ca SET trang_thai = 'cho_xep', cap_nhat_luc = datetime('now','+7 hours') WHERE id = ? AND trang_thai != 'cho_xep'"
      ).bind(dx.dk.id).run();
      soKhongChon++;
    }
  }

  return json({ ok: true, run_id: runId, so_da_xep: soChon, so_cho_xep: soKhongChon });
}

export async function duyetDangKy(env, phien, body) {
  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id đăng ký');
  const dk = await env.DB.prepare('SELECT * FROM dang_ky_ca WHERE id = ?').bind(id).first();
  if (!dk) return loi('Không tìm thấy đăng ký', 404);
  const kq = await duyetMotDangKy(env, phien, dk);
  if (!kq.ok) return loi(kq.loi, kq.loi.includes('quyền') ? 403 : 409);
  return json({ ok: true });
}

/* Duyệt hàng loạt — mỗi dòng tự validate riêng, dòng lỗi không chặn dòng
   hợp lệ (đúng yêu cầu "Bulk Approve" trong bản thiết kế). */
export async function duyetHangLoat(env, phien, body) {
  const ids = Array.isArray(body.ids) ? body.ids.map(chuoi).filter(Boolean) : [];
  if (!ids.length) return loi('Chưa chọn đăng ký nào');

  const thanhCong = [], loiDs = [];
  for (const id of ids) {
    const dk = await env.DB.prepare('SELECT * FROM dang_ky_ca WHERE id = ?').bind(id).first();
    if (!dk) { loiDs.push({ id, loi: 'Không tìm thấy' }); continue; }
    const kq = await duyetMotDangKy(env, phien, dk);
    if (kq.ok) thanhCong.push(id); else loiDs.push({ id, loi: kq.loi });
  }
  return json({ ok: true, thanh_cong: thanhCong, loi: loiDs });
}

export async function tuChoiDangKy(env, phien, body) {
  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id đăng ký');
  const dk = await env.DB.prepare('SELECT * FROM dang_ky_ca WHERE id = ?').bind(id).first();
  if (!dk) return loi('Không tìm thấy đăng ký', 404);
  if (!['cho_duyet', 'cho_xep'].includes(dk.trang_thai)) return loi('Đăng ký này không ở trạng thái chờ duyệt', 409);

  const cm = await env.DB.prepare('SELECT phong_ban_id FROM ca_mo WHERE id = ?').bind(dk.ca_mo_id).first();
  if (!cm || !(await laTruongPhong(env, phien, cm.phong_ban_id))) {
    return loi('Bạn không có quyền từ chối ca của phòng ban này', 403);
  }

  const lyDo = chuoi(body.ly_do_tu_choi);
  await env.DB.prepare(`
    UPDATE dang_ky_ca SET trang_thai = 'tu_choi', nguoi_duyet_id = ?, duyet_luc = datetime('now','+7 hours'),
           ly_do_tu_choi = ?, cap_nhat_luc = datetime('now','+7 hours') WHERE id = ?
  `).bind(phien.nhan_su_id, lyDo, id).run();
  await ghiLichSuCa(env, phien, 'dang_ky_ca', id, 'tu_choi', dk.trang_thai, 'tu_choi', lyDo);
  return json({ ok: true });
}

/* ---- Gán ca thủ công (trưởng phòng) — KHÔNG qua đăng ký, nguồn khác hẳn
   để audit phân biệt được (đúng mục 13 bản thiết kế). ---------------------- */
export async function ganCaThuCong(env, phien, body) {
  const nhanSuId = chuoi(body.nhan_su_id), caMoId = chuoi(body.ca_mo_id);
  if (!nhanSuId || !caMoId) return loi('Thiếu nhân sự hoặc ca');

  const cm = await env.DB.prepare(`
    SELECT cm.*, mc.gio_bat_dau, mc.gio_ket_thuc FROM ca_mo cm
      JOIN mau_ca mc ON mc.id = cm.mau_ca_id WHERE cm.id = ?
  `).bind(caMoId).first();
  if (!cm) return loi('Không tìm thấy ca', 404);
  if (!(await laTruongPhong(env, phien, cm.phong_ban_id))) return loi('Bạn không có quyền xếp ca cho phòng ban này', 403);

  const ns = await env.DB.prepare('SELECT phong_ban_id, dang_lam FROM nhan_su WHERE id = ?').bind(nhanSuId).first();
  if (!ns || !ns.dang_lam) return loi('Nhân sự không hợp lệ hoặc đã nghỉ việc', 409);
  if (ns.phong_ban_id !== cm.phong_ban_id) return loi('Nhân sự này không thuộc phòng ban của ca', 409);

  const dkId = 'dk_' + crypto.randomUUID().slice(0, 12);
  const llvId = 'llv_' + crypto.randomUUID().slice(0, 12);
  try {
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO dang_ky_ca (id, nhan_su_id, ca_mo_id, trang_thai, nguoi_duyet_id, duyet_luc)
        VALUES (?, ?, ?, 'da_duyet', ?, datetime('now','+7 hours'))
      `).bind(dkId, nhanSuId, caMoId, phien.nhan_su_id),
      env.DB.prepare(`
        INSERT INTO lich_lam_viec (id, nhan_su_id, ngay, ca_mo_id, phong_ban_id, gio_bat_dau, gio_ket_thuc, nguon, dang_ky_ca_id, nguoi_xep_id, trang_thai)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'xep_thu_cong', ?, ?, 'da_xep')
      `).bind(llvId, nhanSuId, cm.ngay, cm.id, cm.phong_ban_id, cm.gio_bat_dau, cm.gio_ket_thuc, dkId, phien.nhan_su_id)
    ]);
  } catch (e) {
    return loi(String(e.message || '').includes('UNIQUE') ? 'Nhân sự này đã có lịch/đăng ký cho ca này rồi' : 'Không lưu được, thử lại nhé.');
  }
  await ghiLichSuCa(env, phien, 'lich_lam_viec', llvId, 'gan_ca', null, 'da_xep', 'Trưởng phòng xếp trực tiếp');
  return json({ ok: true });
}

/* ---- Chốt lịch tuần: khoá toàn bộ lich_lam_viec (da_xep) của 1 phòng ban
   trong khoảng ngày. Sau khi khoá: nhân viên không tự huỷ được nữa (kiểm
   tra ở huyDangKyCa qua việc lich_lam_viec đã khoá thì đăng ký gốc cũng coi
   như xong việc). ---------------------------------------------------------- */
export async function chotLichTuan(env, phien, body) {
  const phongBanId = parseInt(body.phong_ban_id, 10);
  const tuNgay = chuoi(body.tu_ngay), denNgay = chuoi(body.den_ngay);
  if (!phongBanId || !tuNgay || !denNgay) return loi('Thiếu phòng ban hoặc khoảng ngày');
  if (!(await laTruongPhong(env, phien, phongBanId))) return loi('Bạn không có quyền chốt lịch phòng ban này', 403);

  const { results: conCho } = await env.DB.prepare(`
    SELECT COUNT(*) AS n FROM dang_ky_ca dk JOIN ca_mo cm ON cm.id = dk.ca_mo_id
     WHERE cm.phong_ban_id = ? AND cm.ngay BETWEEN ? AND ? AND dk.trang_thai IN ('cho_duyet', 'cho_xep')
  `).bind(phongBanId, tuNgay, denNgay).all();
  if (conCho[0].n > 0 && !body.xac_nhan) {
    return json({ ok: false, canh_bao: true, con_cho_duyet: conCho[0].n });
  }

  const { results: ds } = await env.DB.prepare(`
    SELECT id FROM lich_lam_viec WHERE phong_ban_id = ? AND ngay BETWEEN ? AND ? AND trang_thai = 'da_xep'
  `).bind(phongBanId, tuNgay, denNgay).all();

  await env.DB.prepare(`
    UPDATE lich_lam_viec SET trang_thai = 'da_xac_nhan', khoa_luc = datetime('now','+7 hours')
     WHERE phong_ban_id = ? AND ngay BETWEEN ? AND ? AND trang_thai = 'da_xep'
  `).bind(phongBanId, tuNgay, denNgay).run();

  for (const r of ds) {
    await ghiLichSuCa(env, phien, 'lich_lam_viec', r.id, 'khoa', 'da_xep', 'da_xac_nhan', 'Chốt lịch tuần');
  }
  return json({ ok: true, da_khoa: ds.length });
}
