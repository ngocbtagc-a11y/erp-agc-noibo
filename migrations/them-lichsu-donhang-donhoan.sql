-- ==========================================================================
-- MIGRATION — Lịch sử đổi trạng thái Đơn hàng / Đơn hoàn (Immutable History)
-- --------------------------------------------------------------------------
-- Vấn đề: don_hang/don_hoan dùng ON CONFLICT DO UPDATE khi đồng bộ Shopee/
-- TikTok — mỗi lần cập nhật GHI ĐÈ mất luôn trạng thái trước đó, không truy
-- ngược được đơn này đổi trạng thái lúc nào, từ gì sang gì.
--
-- Giải pháp: dùng TRIGGER của SQLite thay vì sửa code shopee.js/tiktok.js.
-- Lý do KHÔNG sửa code đồng bộ để tự SELECT-rồi-so-sánh-rồi-log: code hiện
-- tại đồng bộ HÀNG NGÀN đơn/lần bằng env.DB.batch() (đã từng bị lỗi "Too
-- many subrequests" và anh Duy đã fix — xem migrations/them-donhang.sql).
-- Thêm 1 SELECT riêng cho mỗi dòng trước khi ghi sẽ tái diễn đúng lỗi đó.
-- Trigger chạy NGAY BÊN TRONG D1 khi UPDATE xảy ra — không tốn thêm request
-- nào từ Worker, không đụng gì tới logic đồng bộ/idempotency đang chạy tốt.
-- Chỉ ghi log khi trang_thai THỰC SỰ đổi (không log mỗi lần đồng bộ nếu
-- trạng thái vẫn y nguyên — tránh log rác từ việc chạy cron mỗi 5 phút).
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-lichsu-donhang-donhoan.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-lichsu-donhang-donhoan.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS don_hang_lich_su (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_sn    TEXT NOT NULL,
  truong      TEXT NOT NULL,
  gia_tri_cu  TEXT,
  gia_tri_moi TEXT,
  luc         TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_dhls_order_sn ON don_hang_lich_su(order_sn);

CREATE TABLE IF NOT EXISTS don_hoan_lich_su (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  return_sn   TEXT NOT NULL,
  truong      TEXT NOT NULL,
  gia_tri_cu  TEXT,
  gia_tri_moi TEXT,
  luc         TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_dhoanls_return_sn ON don_hoan_lich_su(return_sn);

CREATE TRIGGER IF NOT EXISTS trg_don_hang_lich_su
AFTER UPDATE ON don_hang
FOR EACH ROW
WHEN OLD.trang_thai IS NOT NEW.trang_thai
BEGIN
  INSERT INTO don_hang_lich_su (order_sn, truong, gia_tri_cu, gia_tri_moi)
  VALUES (NEW.order_sn, 'trang_thai', OLD.trang_thai, NEW.trang_thai);
END;

CREATE TRIGGER IF NOT EXISTS trg_don_hoan_lich_su
AFTER UPDATE ON don_hoan
FOR EACH ROW
WHEN OLD.trang_thai IS NOT NEW.trang_thai
BEGIN
  INSERT INTO don_hoan_lich_su (return_sn, truong, gia_tri_cu, gia_tri_moi)
  VALUES (NEW.return_sn, 'trang_thai', OLD.trang_thai, NEW.trang_thai);
END;
