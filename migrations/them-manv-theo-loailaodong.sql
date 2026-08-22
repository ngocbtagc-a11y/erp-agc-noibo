-- ==========================================================================
-- MIGRATION — Đổi quy định mã nhân sự theo Loại lao động (Sếp chốt 22/08/2026)
-- --------------------------------------------------------------------------
-- 01-00xx = Toàn thời gian · 02-00xx = Part-time · 03-00xx = Thời vụ.
-- Đếm RIÊNG từng loại (không dùng chung 1 dãy số như trước — xem
-- src/dinh-danh.js). Đổi mã CŨ (NV0001..) của nhân sự đang có sang định
-- dạng mới, GIỮ NGUYÊN thứ tự tạo cũ. Từ nay mã sinh theo tiền tố Loại lao
-- động LÚC TẠO — đổi Loại lao động sau đó KHÔNG đổi lại mã đã cấp (mã bất
-- biến, xem docs/ENTITY_IDENTITY.md).
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file=migrations/them-manv-theo-loailaodong.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file=migrations/them-manv-theo-loailaodong.sql
-- ==========================================================================

DELETE FROM bo_dem_ma WHERE loai = 'nhan_su';

INSERT OR IGNORE INTO bo_dem_ma (loai, tiep_theo)
VALUES ('nhan_su_toan_thoi_gian', (SELECT COUNT(*) FROM nhan_su WHERE loai_lao_dong = 'toan_thoi_gian'));

INSERT OR IGNORE INTO bo_dem_ma (loai, tiep_theo)
VALUES ('nhan_su_ban_thoi_gian', (SELECT COUNT(*) FROM nhan_su WHERE loai_lao_dong = 'ban_thoi_gian'));

INSERT OR IGNORE INTO bo_dem_ma (loai, tiep_theo)
VALUES ('nhan_su_thoi_vu', (SELECT COUNT(*) FROM nhan_su WHERE loai_lao_dong = 'thoi_vu'));

-- Đổi mã cũ NV0001.. -> 01-0001.. (Toàn thời gian, giữ nguyên số thứ tự đã cấp).
UPDATE nhan_su SET ma_nv = '01-' || substr(ma_nv, 3)
WHERE loai_lao_dong = 'toan_thoi_gian' AND ma_nv LIKE 'NV____';

-- Phòng trường hợp hiếm: nhân sự Part-time/Thời vụ đang mang mã kiểu cũ —
-- đánh lại theo đúng tiền tố, giữ thứ tự tạo (rowid).
UPDATE nhan_su SET ma_nv = '02-' || substr('0000' || (
  SELECT COUNT(*) FROM nhan_su n2 WHERE n2.loai_lao_dong = 'ban_thoi_gian' AND n2.rowid <= nhan_su.rowid
), -4, 4)
WHERE loai_lao_dong = 'ban_thoi_gian' AND ma_nv LIKE 'NV____';

UPDATE nhan_su SET ma_nv = '03-' || substr('0000' || (
  SELECT COUNT(*) FROM nhan_su n2 WHERE n2.loai_lao_dong = 'thoi_vu' AND n2.rowid <= nhan_su.rowid
), -4, 4)
WHERE loai_lao_dong = 'thoi_vu' AND ma_nv LIKE 'NV____';
