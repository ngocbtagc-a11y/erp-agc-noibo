-- ==========================================================================
-- MIGRATION — Thêm kết nối TikTok Shop (dùng chung tab Đơn hoàn với Shopee)
-- --------------------------------------------------------------------------
--   Nạp máy:  npm run nap-tiktok-may
--   Nạp mây:  npm run nap-tiktok
-- ==========================================================================

-- Kết nối TikTok: TikTok cần thêm "shop_cipher" (mã khóa shop) cho các lệnh
-- theo shop, khác Shopee. access_token/refresh_token cũng có thời hạn riêng.
CREATE TABLE IF NOT EXISTS tiktok_ket_noi (
  shop_id        TEXT PRIMARY KEY,
  shop_cipher    TEXT,
  shop_name      TEXT,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  token_het_han  TEXT NOT NULL,                    -- epoch giây access_token hết hạn
  ket_noi_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  cap_nhat_luc   TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- Bảng don_hoan dùng chung cho cả 2 sàn → thêm cột phân biệt nguồn.
-- Dữ liệu Shopee cũ mặc định 'shopee'.
ALTER TABLE don_hoan ADD COLUMN nguon TEXT NOT NULL DEFAULT 'shopee';
