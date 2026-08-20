-- ==========================================================================
-- MIGRATION — Tình trạng hàng hóa khi Kho nhận đơn hoàn (đơn hoàn thường,
-- không phải đơn huỷ — đơn huỷ đã có phan_loai_nhan riêng từ trước).
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-tinhtrang-hang.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-tinhtrang-hang.sql
-- ==========================================================================

ALTER TABLE don_hoan ADD COLUMN tinh_trang_hang TEXT;   -- 'con_tot' | 'hu_hong' | 'thieu_hang' | 'sai_hang'
ALTER TABLE don_hoan ADD COLUMN tinh_trang_luc  TEXT;
ALTER TABLE don_hoan ADD COLUMN tinh_trang_boi  TEXT;
