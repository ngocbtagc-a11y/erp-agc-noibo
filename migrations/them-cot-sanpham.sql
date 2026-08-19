-- ==========================================================================
-- MIGRATION — Tách tên sản phẩm / SKU / số lượng cho đơn hoàn
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-cot-sanpham.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-cot-sanpham.sql
-- Chỉ THÊM CỘT, không đụng dữ liệu cũ.
-- ==========================================================================

ALTER TABLE don_hoan ADD COLUMN san_pham_ten TEXT;   -- tên sản phẩm (dòng chính)
ALTER TABLE don_hoan ADD COLUMN san_pham_sku TEXT;   -- mã SKU (dòng phụ), vd CBYM-4V
ALTER TABLE don_hoan ADD COLUMN so_luong INTEGER;    -- tổng số lượng hoàn về
