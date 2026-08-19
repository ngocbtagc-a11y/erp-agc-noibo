-- ==========================================================================
-- MIGRATION — Luồng ping-pong Kho <-> Vận hành sàn cho đơn hoàn
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-luong-tra-soat.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-luong-tra-soat.sql
-- Chỉ THÊM CỘT, không đụng dữ liệu cũ.
-- ==========================================================================

-- Số lần Vận hành sàn đã tra soát đơn này (0 = chưa tra soát lần nào)
ALTER TABLE don_hoan ADD COLUMN lan_tra_soat INTEGER NOT NULL DEFAULT 0;

-- Đơn đang nằm ở "sân" của ai để xử lý: 'kho' (mặc định) hoặc 'van_hanh'.
-- Quá 24h kho chưa nhận -> chuyển 'van_hanh'. Vận hành tra soát xong -> về 'kho'.
ALTER TABLE don_hoan ADD COLUMN dang_cho TEXT NOT NULL DEFAULT 'kho';
