/* ==========================================================================
   TÀI SẢN — Asset Management (module mới, xem docs/ENTITY_IDENTITY.md)
   ---------------------------------------------------------------------------
   Data Owner: P. Support/Hành chính (duocQuanLyTaiSan — admin, admin_backup,
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

/* Cột SELECT dùng chung cho danh sách + chi tiết + tra cứu quét mã — 1 chỗ
   duy nhất, thêm cột mới chỉ sửa ở đây (Rule 5, tránh 3 câu SELECT lệch nhau). */
const TS_COT = `
  t.id, t.ma_ts, t.ten, t.danh_muc, t.danh_muc_id, dm.ten AS danh_muc_ten,
  t.trang_thai, t.tinh_trang, t.vi_tri, t.vi_tri_id, vt.ten AS vi_tri_ten,
  t.phong_ban_id, pb.ten AS phong_ban_ten,
  t.hang_sx, t.model, t.serial, t.ngay_mua, t.nha_cung_cap, t.gia_mua, t.het_bao_hanh,
  t.anh, t.ghi_chu, t.nguoi_giu_id, n.ho_ten AS nguoi_giu_ten, n.ma_nv AS nguoi_giu_ma,
  t.tao_boi, tb.ho_ten AS tao_boi_ten, t.tao_luc, t.cap_nhat_boi, t.cap_nhat_luc
`;
const TS_TU = `
  tai_san t
  LEFT JOIN nhan_su n   ON n.id = t.nguoi_giu_id
  LEFT JOIN nhan_su tb  ON tb.id = t.tao_boi
  LEFT JOIN tai_san_danh_muc dm ON dm.id = t.danh_muc_id
  LEFT JOIN tai_san_vi_tri vt   ON vt.id = t.vi_tri_id
  LEFT JOIN phong_ban pb        ON pb.id = t.phong_ban_id
`;

/* ==========================================================================
   XEM — mọi nhân viên có tab 'taisan' (chặn ở index.js, không chặn lại đây)
   ========================================================================== */
export async function danhSachTaiSan(env, phien) {
  const { results } = await env.DB.prepare(`
    SELECT ${TS_COT} FROM ${TS_TU}
     WHERE t.hoat_dong = 1
     ORDER BY t.trang_thai = 'da_thanh_ly' ASC, t.ten
  `).all();
  return json({ ds: results, quyen: { quan_ly: duocQuanLyTaiSan(phien) }, toi_id: phien.nhan_su_id });
}

/* Chi tiết 1 tài sản — dùng cho Asset Detail VÀ tra cứu sau khi quét QR
   (Sếp Ngọc yêu cầu 23/08/2026: "quét mở đúng Asset"). */
export async function chiTietTaiSan(env, id) {
  const idSach = chuoi(id);
  if (!idSach) return loi('Thiếu id tài sản');
  const ts = await env.DB.prepare(`SELECT ${TS_COT} FROM ${TS_TU} WHERE t.id = ? AND t.hoat_dong = 1`).bind(idSach).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);
  return json({ ts });
}

/* Tra cứu theo Mã tài sản (ma_ts) — QR chỉ encode đúng mã này (không encode
   URL/dữ liệu nhạy cảm, xem docs/audit/AUDIT-TAISAN-MODULE.md mục G). */
export async function traCuuTheoMa(env, maTs) {
  const ma = chuoi(maTs);
  if (!ma) return loi('Thiếu mã tài sản');
  const ts = await env.DB.prepare(`SELECT ${TS_COT} FROM ${TS_TU} WHERE UPPER(t.ma_ts) = UPPER(?) AND t.hoat_dong = 1`).bind(ma).first();
  if (!ts) return loi(`Không tìm thấy tài sản với mã "${ma}"`, 404);
  return json({ ts });
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

/* Field NHẬP ĐƯỢC ở Thêm/Sửa — 1 danh sách dùng chung để khỏi liệt kê lệch
   nhau giữa themTaiSan/suaTaiSan (Rule 5). Không gồm ma_ts/trang_thai/
   nguoi_giu_id — 3 cái đó có luồng riêng (AUTO, hoặc qua cấp phát/thu hồi). */
function truongNhapDuoc(body) {
  return {
    ten: chuoi(body.ten),
    danh_muc: chuoi(body.danh_muc),
    danh_muc_id: body.danh_muc_id ? parseInt(body.danh_muc_id, 10) || null : null,
    vi_tri: chuoi(body.vi_tri),
    vi_tri_id: body.vi_tri_id ? parseInt(body.vi_tri_id, 10) || null : null,
    phong_ban_id: body.phong_ban_id ? parseInt(body.phong_ban_id, 10) || null : null,
    hang_sx: chuoi(body.hang_sx),
    model: chuoi(body.model),
    serial: chuoi(body.serial),
    ngay_mua: chuoi(body.ngay_mua),
    nha_cung_cap: chuoi(body.nha_cung_cap),
    gia_mua: body.gia_mua ? parseInt(body.gia_mua, 10) || null : null,
    het_bao_hanh: chuoi(body.het_bao_hanh),
    anh: body.anh === undefined ? undefined : (chuoi(body.anh)),   // undefined = không đụng, null = xoá ảnh
    ghi_chu: chuoi(body.ghi_chu)
  };
}

/* ==========================================================================
   TẠO MỚI — chỉ Data Owner (P. Support/Hành chính)
   ========================================================================== */
export async function themTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien)) return loi('Bạn không có quyền quản lý Tài sản', 403);

  const ten = chuoi(body.ten);
  if (!ten) return loi('Vui lòng nhập tên tài sản');

  const f = truongNhapDuoc(body);
  const id = 'ts_' + crypto.randomUUID().slice(0, 12);
  const maTs = await sinhMa(env, 'tai_san');

  await env.DB.prepare(`
    INSERT INTO tai_san (
      id, ma_ts, ten, danh_muc, danh_muc_id, trang_thai, tinh_trang, vi_tri, vi_tri_id,
      phong_ban_id, hang_sx, model, serial, ngay_mua, nha_cung_cap, gia_mua, het_bao_hanh,
      anh, ghi_chu, tao_boi
    ) VALUES (?, ?, ?, ?, ?, 'san_sang', 'tot', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, maTs, ten, f.danh_muc, f.danh_muc_id, f.vi_tri, f.vi_tri_id,
    f.phong_ban_id, f.hang_sx, f.model, f.serial, f.ngay_mua, f.nha_cung_cap, f.gia_mua, f.het_bao_hanh,
    f.anh || null, f.ghi_chu, phien.nhan_su_id
  ).run();

  await ghiLedger(env, id, 'tao_moi', phien, { vi_tri_moi: f.vi_tri, ghi_chu: f.ghi_chu });

  return json({ ok: true, id, ma_ts: maTs });
}

/* ==========================================================================
   SỬA — chỉ Data Owner. KHÔNG sửa được ma_ts (Immutable sau khi tạo — xem
   docs/audit/AUDIT-TAISAN-MODULE.md mục F) và không sửa trạng thái/người
   giữ ở đây (đi qua capPhatTaiSan/thuHoiTaiSan/baoHongTaiSan để giữ lịch sử).
   ========================================================================== */
export async function suaTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien)) return loi('Bạn không có quyền quản lý Tài sản', 403);

  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id tài sản');
  const ts = await env.DB.prepare('SELECT id FROM tai_san WHERE id = ?').bind(id).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);

  const ten = chuoi(body.ten);
  if (!ten) return loi('Vui lòng nhập tên tài sản');
  const f = truongNhapDuoc(body);

  const tinhTrangMoi = ['tot', 'binh_thuong', 'can_sua', 'hong'].includes(body.tinh_trang) ? body.tinh_trang : null;

  await env.DB.prepare(`
    UPDATE tai_san SET
      ten = ?, danh_muc = ?, danh_muc_id = ?, vi_tri = ?, vi_tri_id = ?,
      phong_ban_id = ?, hang_sx = ?, model = ?, serial = ?, ngay_mua = ?,
      nha_cung_cap = ?, gia_mua = ?, het_bao_hanh = ?,
      anh = COALESCE(?, anh), ghi_chu = ?,
      tinh_trang = COALESCE(?, tinh_trang),
      cap_nhat_boi = ?, cap_nhat_luc = datetime('now', '+7 hours')
    WHERE id = ?
  `).bind(
    ten, f.danh_muc, f.danh_muc_id, f.vi_tri, f.vi_tri_id,
    f.phong_ban_id, f.hang_sx, f.model, f.serial, f.ngay_mua,
    f.nha_cung_cap, f.gia_mua, f.het_bao_hanh,
    f.anh === undefined ? null : f.anh, f.ghi_chu,
    tinhTrangMoi,
    phien.nhan_su_id, id
  ).run();

  return json({ ok: true });
}

/* ==========================================================================
   CẤP PHÁT / ĐIỀU CHUYỂN — gán cho 1 nhân sự (từ san_sang HOẶC đổi người
   giữ trực tiếp từ da_cap_phat, coi là điều chuyển). Chỉ Data Owner.
   ========================================================================== */
export async function capPhatTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien)) return loi('Bạn không có quyền quản lý Tài sản', 403);

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
  if (!duocQuanLyTaiSan(phien)) return loi('Bạn không có quyền quản lý Tài sản', 403);

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
   BÁO HỎNG / BÁO MẤT — Data Owner HOẶC người ĐANG GIỮ tài sản đó (self-
   service). 2 trạng thái TÁCH RIÊNG (Sếp Ngọc chốt 23/08/2026: hỏng còn
   sửa được, mất thì không — khác hẳn nhau về nghiệp vụ dù cùng 1 nút "Báo
   sự cố"). body.loai = 'mat' -> trạng thái LOST, còn lại mặc định 'bao_hong'.
   ========================================================================== */
export async function baoHongTaiSan(env, phien, body) {
  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id tài sản');

  const ts = await env.DB.prepare('SELECT * FROM tai_san WHERE id = ?').bind(id).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);

  const laNguoiDangGiu = ts.nguoi_giu_id && ts.nguoi_giu_id === phien.nhan_su_id;
  if (!duocQuanLyTaiSan(phien) && !laNguoiDangGiu) {
    return loi('Chỉ người đang giữ tài sản này hoặc Hành chính/Admin mới báo được', 403);
  }
  if (!['san_sang', 'da_cap_phat'].includes(ts.trang_thai)) {
    return loi('Tài sản này đang không ở trạng thái báo hỏng/mất được', 409);
  }

  const laMat = body.loai === 'mat';
  const trangThaiMoi = laMat ? 'mat' : 'bao_hong';

  await env.DB.prepare(`UPDATE tai_san SET trang_thai = ? WHERE id = ?`).bind(trangThaiMoi, id).run();

  await ghiLedger(env, id, trangThaiMoi, phien, { ghi_chu: chuoi(body.ghi_chu) || (laMat ? 'Không ghi chú' : 'Không ghi chú') });

  return json({ ok: true });
}

/* ==========================================================================
   BẢO TRÌ XONG / TÌM THẤY — về kho sẵn sàng cấp lại. Chỉ Data Owner. Nhận
   từ 'bao_hong' (đã sửa xong) HOẶC 'mat' (tìm lại được) — cùng 1 hành động
   "về lại sẵn sàng", ghi_chu phân biệt rõ trường hợp nào.
   ========================================================================== */
export async function baoTriXongTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien)) return loi('Bạn không có quyền quản lý Tài sản', 403);

  const id = chuoi(body.id);
  if (!id) return loi('Thiếu id tài sản');

  const ts = await env.DB.prepare('SELECT * FROM tai_san WHERE id = ?').bind(id).first();
  if (!ts) return loi('Không tìm thấy tài sản', 404);
  if (!['bao_hong', 'mat'].includes(ts.trang_thai)) return loi('Tài sản này không ở trạng thái báo hỏng/mất', 409);

  await env.DB.prepare(`UPDATE tai_san SET trang_thai = 'san_sang', nguoi_giu_id = NULL WHERE id = ?`).bind(id).run();

  await ghiLedger(env, id, 'bao_tri', phien, {
    nguoi_giu_cu: ts.nguoi_giu_id, nguoi_giu_moi: null,
    ghi_chu: chuoi(body.ghi_chu) || (ts.trang_thai === 'mat' ? 'Đã tìm lại được' : 'Đã sửa xong')
  });

  return json({ ok: true });
}

/* ==========================================================================
   THANH LÝ — kết thúc vòng đời, không cấp phát lại được nữa. Chỉ Data Owner.
   ========================================================================== */
export async function thanhLyTaiSan(env, phien, body) {
  if (!duocQuanLyTaiSan(phien)) return loi('Bạn không có quyền quản lý Tài sản', 403);

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
