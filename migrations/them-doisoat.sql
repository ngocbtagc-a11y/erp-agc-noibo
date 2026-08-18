-- ==========================================================================
-- MIGRATION — Thêm cột đối soát cho đơn hoàn quá 12h (Vận hành sàn xử lý)
-- --------------------------------------------------------------------------
--   Nạp máy:  npm run nap-doisoat-may
--   Nạp mây:  npm run nap-doisoat
-- Chỉ THÊM CỘT vào bảng don_hoan đã có, không đụng dữ liệu cũ.
-- ==========================================================================

ALTER TABLE don_hoan ADD COLUMN doi_soat_luc TEXT;
ALTER TABLE don_hoan ADD COLUMN doi_soat_boi TEXT;
