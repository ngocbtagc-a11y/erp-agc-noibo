-- ==========================================================================
-- MIGRATION — Lưu LÝ DO khiếu nại của kho vào chính đơn hoàn (không chỉ nằm
-- trong thông báo chuông) để Vận hành sàn thấy ngay trong bảng "Cần đối soát"
-- vì sao đơn này bị kho đẩy lên, không phải tự bấm chuông đi tìm lại.
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-khieunai-lydo.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-khieunai-lydo.sql
-- ==========================================================================

ALTER TABLE don_hoan ADD COLUMN ly_do_khieu_nai TEXT;
ALTER TABLE don_hoan ADD COLUMN khieu_nai_luc TEXT;
ALTER TABLE don_hoan ADD COLUMN khieu_nai_boi TEXT;
