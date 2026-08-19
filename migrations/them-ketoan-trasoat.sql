-- ==========================================================================
-- MIGRATION — Đẩy đơn hoàn sang Kế toán tra soát (song song với đẩy sang Kho)
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-ketoan-trasoat.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-ketoan-trasoat.sql
-- dang_cho giờ có 3 giá trị: 'van_hanh' | 'kho' | 'ke_toan'
-- ==========================================================================

ALTER TABLE don_hoan ADD COLUMN ke_toan_luc TEXT;   -- thời điểm kế toán bấm "Đã tra soát"
ALTER TABLE don_hoan ADD COLUMN ke_toan_boi TEXT;   -- ai bên kế toán tra soát
