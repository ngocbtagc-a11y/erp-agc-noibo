-- ==========================================================================
-- MIGRATION — Đơn hàng bị HỦY trước khi giao (khác Đơn hoàn/Trả hàng)
-- --------------------------------------------------------------------------
-- Chị Huyền theo dõi tay hằng ngày bằng file xuất "Order.cancelled" từ
-- Shopee — đơn bị hủy khi CHƯA từng xuất kho (khác đơn "Trả hàng/Hoàn tiền"
-- đã có sẵn trong bảng don_hoan). Thêm cột vào bảng don_hang có sẵn (xem
-- migrations/them-donhang.sql) vì đây vẫn là dữ liệu từ Order API, chỉ lọc
-- theo trang_thai = 'CANCELLED'.
--
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-donhang-huy.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-donhang-huy.sql
-- ==========================================================================

ALTER TABLE don_hang ADD COLUMN san_pham_ten     TEXT;
ALTER TABLE don_hang ADD COLUMN san_pham_sku     TEXT;
ALTER TABLE don_hang ADD COLUMN huy_ly_do        TEXT;   -- cancel_reason (Shopee)
ALTER TABLE don_hang ADD COLUMN huy_boi          TEXT;   -- cancel_by: buyer | seller | system
ALTER TABLE don_hang ADD COLUMN huy_ly_do_khach  TEXT;   -- buyer_cancel_reason
