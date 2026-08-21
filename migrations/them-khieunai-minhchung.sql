-- ==========================================================================
-- MIGRATION — Ảnh/video minh chứng kèm khiếu nại đơn hoàn
-- --------------------------------------------------------------------------
-- Lý do (chữ) khiếu nại đã lưu thẳng trong don_hoan
-- (ly_do_khieu_nai/khieu_nai_luc/khieu_nai_boi — xem them-khieunai-lydo.sql).
-- Bảng này bổ sung ẢNH/VIDEO minh chứng đi kèm, khoá theo return_sn (không
-- cần bảng khiếu nại riêng vì lý do + trạng thái đã nằm sẵn trong don_hoan).
--
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-khieunai-minhchung.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-khieunai-minhchung.sql
--
-- Ảnh nén ở trình duyệt, lưu base64 thẳng trong bảng (giống ảnh CCCD nhân sự
-- — xem src/nhansu.js) vì D1 cho phép tối đa 2MB/giá trị, ảnh nén dễ dàng
-- dưới mức đó. VIDEO không nén nhỏ được nên KHÔNG lưu D1 — lưu trong R2
-- (bucket "MINH_CHUNG", xem wrangler.toml), bảng chỉ giữ r2_key để tải lại.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS khieu_nai_minh_chung (
  id          TEXT PRIMARY KEY,
  return_sn   TEXT NOT NULL REFERENCES don_hoan(return_sn),
  loai        TEXT NOT NULL,      -- 'anh' | 'video'
  du_lieu     TEXT,               -- base64 (chỉ dùng cho 'anh')
  r2_key      TEXT,               -- khoá R2 (chỉ dùng cho 'video')
  loai_mime   TEXT,
  ten_file    TEXT,
  kich_thuoc  INTEGER,
  nguoi       TEXT,
  tao_luc     TEXT NOT NULL DEFAULT (datetime('now','+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_kn_mc_return ON khieu_nai_minh_chung(return_sn);
