-- ==========================================================================
-- MIGRATION — Thêm bảng đơn hàng (doanh thu + số đơn thật từ Shopee/TikTok)
-- --------------------------------------------------------------------------
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file=migrations/them-donhang.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file=migrations/them-donhang.sql
-- Dùng LẠI kết nối shopee_ket_noi / tiktok_ket_noi đã có (đơn hoàn) — không
-- cần ủy quyền lại. Chỉ thêm 1 bảng mới + 1 cột mốc đồng bộ trên mỗi bảng
-- kết nối, không đụng dữ liệu cũ.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS don_hang (
  order_sn       TEXT PRIMARY KEY,                 -- mã đơn của sàn
  nguon          TEXT NOT NULL,                     -- 'shopee' | 'tiktok'
  trang_thai     TEXT,
  tong_tien      INTEGER,                           -- tổng tiền đơn (giá đơn, CHƯA trừ phí sàn/voucher/ship) * 100000
  tien_te        TEXT,
  nguoi_mua      TEXT,
  so_sp          INTEGER,                           -- tổng số lượng sản phẩm trong đơn
  tao_luc_san    TEXT,                              -- create_time từ sàn
  cap_nhat_san   TEXT,                              -- update_time từ sàn
  du_lieu_json   TEXT,
  dong_bo_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_don_hang_nguon     ON don_hang(nguon);
CREATE INDEX IF NOT EXISTS idx_don_hang_tao_luc   ON don_hang(tao_luc_san);
CREATE INDEX IF NOT EXISTS idx_don_hang_trangthai ON don_hang(trang_thai);

-- Mốc đồng bộ đơn hàng riêng (khác hạn token) — lần đồng bộ sau chỉ kéo đơn
-- có update_time mới hơn mốc này, đỡ quét lại toàn bộ mỗi 5 phút.
ALTER TABLE shopee_ket_noi ADD COLUMN dh_dong_bo_den TEXT;
ALTER TABLE tiktok_ket_noi ADD COLUMN dh_dong_bo_den TEXT;
