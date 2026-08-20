-- ==========================================================================
-- MIGRATION — Bù 2 cột đang được code dùng (src/shopee.js, tiktok.js, index.js)
-- nhưng bị thiếu trong lịch sử migrations (chắc đã ALTER thẳng trên DB thật
-- mà quên lưu lại file này) — phát hiện khi dựng lại DB local từ đầu.
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-mavandon.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-mavandon.sql
--             (chỉ chạy trên mây nếu PRAGMA table_info(don_hoan) xác nhận
--              2 cột này thật sự chưa có — có thể DB thật đã có sẵn rồi)
-- ==========================================================================

ALTER TABLE don_hoan ADD COLUMN ma_van_don TEXT;   -- mã vận đơn của kiện hàng hoàn
ALTER TABLE don_hoan ADD COLUMN san_pham   TEXT;   -- chuỗi mô tả sản phẩm gộp (dòng cũ trước khi tách san_pham_ten/san_pham_sku)
