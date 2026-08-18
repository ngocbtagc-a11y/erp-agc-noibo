-- ==========================================================================
-- MIGRATION — Thêm module Đơn hoàn (Shopee Returns) vào database ĐANG CHẠY
-- --------------------------------------------------------------------------
--   Nạp vào máy:   npm run nap-shopee-may
--   Nạp lên mây:   npm run nap-shopee
-- Chỉ TẠO THÊM 2 bảng, không đụng gì bảng cũ.
-- ==========================================================================

-- ---- Kết nối Shopee: lưu token của shop đã ủy quyền ----------------------
-- Thường chỉ có 1 dòng (1 shop AGC). access_token hết hạn ~4h, refresh ~30 ngày.
CREATE TABLE IF NOT EXISTS shopee_ket_noi (
  shop_id        TEXT PRIMARY KEY,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  token_het_han  TEXT NOT NULL,                    -- thời điểm access_token hết hạn (giờ VN)
  ket_noi_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  cap_nhat_luc   TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- ---- Đơn hoàn kéo từ Shopee về (bộ nhớ đệm để đối soát) ------------------
CREATE TABLE IF NOT EXISTS don_hoan (
  return_sn      TEXT PRIMARY KEY,                 -- mã đơn hoàn của Shopee
  order_sn       TEXT,                             -- mã đơn hàng gốc
  trang_thai     TEXT,                             -- REQUESTED / PROCESSING / ACCEPTED / ...
  ly_do          TEXT,                             -- lý do hoàn
  so_tien        INTEGER,                          -- số tiền hoàn (đơn vị nhỏ nhất * 100000 tùy Shopee)
  tien_te        TEXT,
  nguoi_mua      TEXT,
  tao_luc_shopee TEXT,                             -- create_time từ Shopee
  cap_nhat_shopee TEXT,                            -- update_time từ Shopee
  du_lieu_json   TEXT,                             -- bản gốc để tra khi cần
  dong_bo_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_don_hoan_trang_thai ON don_hoan(trang_thai);
CREATE INDEX IF NOT EXISTS idx_don_hoan_cap_nhat   ON don_hoan(cap_nhat_shopee);
