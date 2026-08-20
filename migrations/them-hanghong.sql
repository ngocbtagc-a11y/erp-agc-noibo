-- ==========================================================================
-- MIGRATION — Phân loại hàng nhận về khi đơn HUỶ có hàng vật lý quay lại kho
-- + luồng lập biên bản hủy hàng hỏng do vận chuyển hàng tháng (Kho + Kế toán)
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-hanghong.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-hanghong.sql
-- ---------------------------------------------------------------------------
-- Chỉ áp dụng cho đơn HUỶ (trang_thai LIKE '%CANCEL%') có mã vận đơn — loại
-- đơn hoàn bình thường (không huỷ) vẫn dùng nút "Nhận đủ" cũ, không đổi.
-- ==========================================================================

ALTER TABLE don_hoan ADD COLUMN phan_loai_nhan TEXT;   -- 'nhap_kho' | 'hong_cho_huy'
ALTER TABLE don_hoan ADD COLUMN phan_loai_luc  TEXT;
ALTER TABLE don_hoan ADD COLUMN phan_loai_boi  TEXT;
ALTER TABLE don_hoan ADD COLUMN bien_ban_luc   TEXT;   -- đã đưa vào biên bản hủy hàng tháng
ALTER TABLE don_hoan ADD COLUMN bien_ban_boi   TEXT;
