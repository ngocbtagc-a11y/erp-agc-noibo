-- ==========================================================================
-- MIGRATION — Bảng ghép TÊN SẢN PHẨM (trên sàn) -> MÃ SKU (kho)
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-sku-map.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-sku-map.sql
-- Dùng cho các đơn hoàn mà sàn KHÔNG trả SKU (đơn cũ đặt trước khi gắn SKU).
-- Ghép 1 lần theo tên -> mọi đơn cùng tên tự có SKU.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS sku_map (
  ten_san_pham TEXT PRIMARY KEY,   -- tên sản phẩm trên sàn (khớp don_hoan.san_pham_ten)
  ma_sku       TEXT NOT NULL,      -- mã SKU kho gán cho tên này
  cap_nhat_luc TEXT,
  cap_nhat_boi TEXT
);
