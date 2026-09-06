-- ==========================================================================
-- MIGRATION — Tách DÒNG HÀNG của đơn (don_hang_item)
-- --------------------------------------------------------------------------
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-donhang-dong.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-donhang-dong.sql
--
-- VÌ SAO CẦN: bảng `don_hang` mỗi đơn 1 dòng, đơn nhiều mặt hàng bị NỐI CHUỖI
-- SKU lại thành "SKU-A | SKU-B" trong 1 ô (xem `cauLenhDonHang` trong
-- shopee.js). Vì vậy KHÔNG tính đúng được doanh số/sản lượng theo từng SKU —
-- đúng chỗ chặn câu hỏi "vì sao doanh số tăng/giảm" của ERP Owner.
-- Xem docs/audit/AUDIT-DASHBOARD-MARKETPLACE.md mục C.1.
--
-- KHÔNG MẤT DỮ LIỆU: `don_hang.du_lieu_json` đã lưu nguyên payload đơn từ sàn
-- (có item_list/line_items), nên bảng này BÓC LẠI TỪ DỮ LIỆU ĐÃ CÓ — không
-- gọi lại API sàn, không sửa/xoá gì trên `don_hang`. Chạy lại nhiều lần cũng
-- ra cùng kết quả (khoá chính order_sn+dong, ghi đè bằng INSERT OR REPLACE).
-- ==========================================================================

CREATE TABLE IF NOT EXISTS don_hang_item (
  order_sn    TEXT    NOT NULL,          -- mã đơn của sàn (khớp don_hang.order_sn)
  dong        INTEGER NOT NULL,          -- số thứ tự dòng trong đơn, bắt đầu từ 0
  nguon       TEXT    NOT NULL,          -- 'shopee' | 'tiktok'
  sku         TEXT,                      -- mã SKU người bán đặt (model_sku / seller_sku)
  ten         TEXT,                      -- tên mặt hàng trên sàn
  so_luong    INTEGER,                   -- số lượng của dòng này
  don_gia     INTEGER,                   -- đơn giá 1 đơn vị, ×100000 (cùng quy ước don_hang.tong_tien)
  thanh_tien  INTEGER,                   -- so_luong × don_gia, ×100000
  tao_luc_san TEXT,                      -- chép từ don_hang để lọc theo kỳ không cần JOIN
  PRIMARY KEY (order_sn, dong)
);

CREATE INDEX IF NOT EXISTS idx_dhi_sku     ON don_hang_item(sku);
CREATE INDEX IF NOT EXISTS idx_dhi_nguon   ON don_hang_item(nguon);
CREATE INDEX IF NOT EXISTS idx_dhi_tao_luc ON don_hang_item(tao_luc_san);

-- Mốc bóc tách: ghi lại đơn nào đã bóc xong, để chạy bù theo lô mà không phải
-- quét lại từ đầu mỗi lần (đơn hàng có thể lên tới hàng chục nghìn dòng).
ALTER TABLE don_hang ADD COLUMN da_tach_dong INTEGER NOT NULL DEFAULT 0;
