/* ==========================================================================
   TÀI SẢN — Asset Management (module mới, xem docs/ENTITY_IDENTITY.md)
   ---------------------------------------------------------------------------
   Data Owner: P. Support/Hành chính (duocQuanLyTaiSan — giam_doc, pho_giam_doc,
   hcns). Mọi nhân viên XEM được danh sách + lịch sử (minh bạch, giống Trạm
   Mục Tiêu/Lịch sử làm việc) nhưng chỉ Data Owner mới tạo/cấp phát/thu hồi/
   thanh lý. Riêng "Báo hỏng" cho phép người ĐANG GIỮ tài sản tự báo.

   Lifecycle:  san_sang -> da_cap_phat -> bao_hong -> san_sang (đã sửa xong)
                                                     -> da_thanh_ly (kết thúc,
                                                        từ bất kỳ trạng thái nào)
   Mọi thay đổi ghi vào tai_san_lich_su (ledger bất biến) — KHÔNG chỉ
   overwrite nguoi_giu_id/vi_tri mà không giữ vết, cùng khuôn mẫu sổ cái
   giao_dich_kho đã dùng cho Kho vận.
   ========================================================================== */

import { duocQuanLyTaiSan } from './quyen.js';
import { sinhMa } from './dinh-danh.js';

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }

function chuoi(v) { const s = String(v ?? '').trim(); return s || null; }

async function ghiLedger(env, taiSanId, loaiSuKien, phien, du) {
  await env.DB.prepare(`
    INSERT INTO tai_san_lich_su
      (tai_san_id, loai_su_kien, nguoi_giu_cu, nguoi_giu_moi, vi_tri_cu, vi_tri_moi, ghi_chu, nguoi_thuc_hien)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    taiSanId, loaiSuKien,
    du.nguoi_giu_cu ?? null, du.nguoi_giu_moi ?? null,
    du.vi_tri_cu ?? null, du.vi_tri_moi ?? null,
    du.ghi_chu ?? null, phien.nhan_su_id
  ).run();
}

/* ==========================================================================
   XEM — mọi nhân viên có tab 'taisan' (chặn ở index.js, không chặn lại đây)
   ========================================================================== */
export async function danhSachTaiSan(env, phien) {
  const { results } = await env.DB.prepare(`
    SELECT t.id, t.ma_ts, t.ten, t.danh_muc, t.trang_thai, t.vi_tri, t.ghi_chu,
           t.nguoi_giu_id, n.ho_ten AS nguoi_giu_ten, n.ma_nv AS nguoi_giu_ma
      FROM tai_san t
      LEFT JOIN nhan_su n ON n.id = t.nguoi_giu_id
     WHERE t.hoat_dong = 1
     ORDER BY t.trang_thai = 'da_thanh_ly' ASC, t.ten
  `).all();
  return json({ ds: results, quyen: { quan_ly: duocQuanLyTaiSan(phien.vai_tro) }, toi_id: phien.nhan_su_id });
}

export async function lichSuTaiSan(env, taiSanId) {
  const id = chuoi(taiSanId);
  if (!id) return loi('Thiếu id tài sản');
  const { results } = await env.DB.prepare(`
    SELECT ls.*, n.ho_ten AS nguoi_thuc_hien_ten,
           ncu.ho_ten AS nguoi_giu_cu_ten, nmoi.ho_ten AS nguoi_giu_moi_ten
      FROM tai_san_lich_su ls
      LEFT JOIN nhan_su n    ON n.id = ls.nguoi_thuc_hien
      LEFT JOIN nhan_su ncu  ON ncu.id = ls.nguoi_giu_cu
      LEFT JOIN nhan_su nmoi ON nmoi.id = ls.nguoi_giu_moi
     WHERE ls.tai_san_id = ?
     ORDER BY ls.luc DESC, ls.id DESC
  `).bind(id).all();
  return json({ ds: results });
}

/* ==========================================================================
   TẠO MỚI — chỉ Data Owner (P. Support/Hành chính)
   ========================================================================== */
export async function themTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien.vai_tro)) return loi('Bạn không có quyền quản lý Tài sản', 403);

  const ten = chuoi(body.ten);
  if (!ten) return loi('Vui lòng nhập tên tài sản');

  const id = 'ts_' + crypto.randomUUID().slice(0, 12);
  const maTs = await sinhMa(env, 'tai_san');

  await env.DB.prepare(`
    INSERT INTO tai_san (id, ma_ts, ten, danh_muc, trang_thai, vi_tri, ghi_chu)
    VALUES (?, ?, ?, ?, 'san_sang', ?, ?)
  `).bind(id, maTs, ten, chuoi(body.danh_muc), chuoi(body.vi_tri), chuoi(body.ghi_chu)).run();

  await ghiLedger(env, id, 'tao_moi', phien, { vi_tri_moi: chuoi(body.vi_tri), ghi_chu: chuoi(body.ghi_chu) });

  return json({ ok: true, id, ma_ts: maTs });
}

/* ==========================================================================
   CẤP PHÁT / ĐIỀU CHUYỂN — gán cho 1 nhân sự (từ san_sang HOẶC đổi người
   giữ trực tiếp từ da_cap_phat, coi là điều chuyển). Chỉ Data Owner.
   ========================================================================== */
export async function capPhatTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien.vai_tro)) return loi('Bạn không có quyền quản lý Tài sản', 403);

  const id = chuoi(body.id);
  const nguoiGiuMoi = chuoi(body.nguoi_giu_id);
  if (!id || !nguoiGiuMoi) return loi('Thiếu tài sản hoặc người nhận');

  const ts = await env.DB.prepare('SELECT * FROM tai_san WHERE id = ?').bind(id).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);
  if (!['san_sang', 'da_cap_phat'].includes(ts.trang_thai)) {
    return loi('Tài sản đang hỏng/đã thanh lý — không cấp phát được', 409);
  }

  const ns = await env.DB.prepare('SELECT id FROM nhan_su WHERE id = ?').bind(nguoiGiuMoi).first();
  if (!ns) return loi('Không tìm thấy nhân sự để cấp phát', 404);

  const viTriMoi = chuoi(body.vi_tri) ?? ts.vi_tri;

  await env.DB.prepare(`
    UPDATE tai_san SET trang_thai = 'da_cap_phat', nguoi_giu_id = ?, vi_tri = ? WHERE id = ?
  `).bind(nguoiGiuMoi, viTriMoi, id).run();

  await ghiLedger(env, id, 'cap_phat', phien, {
    nguoi_giu_cu: ts.nguoi_giu_id, nguoi_giu_moi: nguoiGiuMoi,
    vi_tri_cu: ts.vi_tri, vi_tri_moi: viTriMoi, ghi_chu: chuoi(body.ghi_chu)
  });

  return json({ ok: true });
}

/* ==========================================================================
   THU HỒI — về kho, hết người giữ. Chỉ Data Owner.
   ========================================================================== */
export async function thuHoiTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien.vai_tro)) return loi('Bạn không có quyền quản lý Tài sản', 403);

  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id tài sản');

  const ts = await env.DB.prepare('SELECT * FROM tai_san WHERE id = ?').bind(id).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);
  if (ts.trang_thai !== 'da_cap_phat') return loi('Tài sản này chưa cấp phát cho ai', 409);

  await env.DB.prepare(`UPDATE tai_san SET trang_thai = 'san_sang', nguoi_giu_id = NULL WHERE id = ?`).bind(id).run();

  await ghiLedger(env, id, 'thu_hoi', phien, {
    nguoi_giu_cu: ts.nguoi_giu_id, nguoi_giu_moi: null, ghi_chu: chuoi(body.ghi_chu)
  });

  return json({ ok: true });
}

/* ==========================================================================
   BÁO HỎNG — Data Owner HOẶC người ĐANG GIỮ tài sản đó (self-service).
   ========================================================================== */
export async function baoHongTaiSan(env, phien, body) {
  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id tài sản');

  const ts = await env.DB.prepare('SELECT * FROM tai_san WHERE id = ?').bind(id).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);

  const laNguoiDangGiu = ts.nguoi_giu_id && ts.nguoi_giu_id === phien.nhan_su_id;
  if (!duocQuanLyTaiSan(phien.vai_tro) && !laNguoiDangGiu) {
    return loi('Chỉ người đang giữ tài sản này hoặc Hành chính/Admin mới báo hỏng được', 403);
  }
  if (!['san_sang', 'da_cap_phat'].includes(ts.trang_thai)) {
    return loi('Tài sản này đang không ở trạng thái báo hỏng được', 409);
  }

  await env.DB.prepare(`UPDATE tai_san SET trang_thai = 'bao_hong' WHERE id = ?`).bind(id).run();

  await ghiLedger(env, id, 'bao_hong', phien, { ghi_chu: chuoi(body.ghi_chu) || 'Không ghi chú' });

  return json({ ok: true });
}

/* ==========================================================================
   BẢO TRÌ XONG — về kho sẵn sàng cấp lại. Chỉ Data Owner.
   ========================================================================== */
export async function baoTriXongTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien.vai_tro)) return loi('Bạn không có quyền quản lý Tài sản', 403);

  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id tài sản');

  const ts = await env.DB.prepare('SELECT * FROM tai_san WHERE id = ?').bind(id).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);
  if (ts.trang_thai !== 'bao_hong') return loi('Tài sản này không ở trạng thái báo hỏng', 409);

  await env.DB.prepare(`UPDATE tai_san SET trang_thai = 'san_sang', nguoi_giu_id = NULL WHERE id = ?`).bind(id).run();

  await ghiLedger(env, id, 'bao_tri', phien, {
    nguoi_giu_cu: ts.nguoi_giu_id, nguoi_giu_moi: null, ghi_chu: chuoi(body.ghi_chu) || 'Đã sửa xong'
  });

  return json({ ok: true });
}

/* ==========================================================================
   THANH LÝ — kết thúc vòng đời, không cấp phát lại được nữa. Chỉ Data Owner.
   ========================================================================== */
export async function thanhLyTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien.vai_tro)) return loi('Bạn không có quyền quản lý Tài sản', 403);

  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id tài sản');

  const ts = await env.DB.prepare('SELECT * FROM tai_san WHERE id = ?').bind(id).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);
  if (ts.trang_thai === 'da_thanh_ly') return loi('Tài sản này đã thanh lý rồi', 409);

  await env.DB.prepare(`UPDATE tai_san SET trang_thai = 'da_thanh_ly' WHERE id = ?`).bind(id).run();

  await ghiLedger(env, id, 'thanh_ly', phien, {
    nguoi_giu_cu: ts.nguoi_giu_id, nguoi_giu_moi: null, ghi_chu: chuoi(body.ghi_chu)
  });

  return json({ ok: true });
}
