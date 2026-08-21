-- ==========================================================================
-- MIGRATION — Thêm cột mã vận đơn cho bảng đơn hàng (don_hang)
-- --------------------------------------------------------------------------
-- Dùng để lọc "Đơn hàng bị hủy": chỉ lấy đơn ĐÃ CÓ mã vận đơn (nghĩa là đã
-- chuẩn bị/đóng gói xong, có nhãn vận chuyển) rồi mới bị hủy — khác đơn bị
-- hủy ngay từ đầu (chưa từng chuẩn bị, không có mã vận đơn).
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-donhang-mavandon.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-donhang-mavandon.sql
-- ==========================================================================

ALTER TABLE don_hang ADD COLUMN ma_van_don TEXT;
