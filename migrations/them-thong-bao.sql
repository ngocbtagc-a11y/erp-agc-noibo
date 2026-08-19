-- ==========================================================================
-- MIGRATION — Thông báo trong ERP (chuông 🔔), thay/bổ sung Telegram
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-thong-bao.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-thong-bao.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS thong_bao (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  nhom     TEXT NOT NULL,          -- gửi cho nhóm nào: 'kho' hoặc 'van_hanh'
  noi_dung TEXT NOT NULL,
  loai     TEXT,                   -- 'day_kho' | 'khieu_nai' | 'canh_bao'
  lien_ket TEXT,                   -- return_sn để bấm nhảy tới đơn
  tao_luc  TEXT NOT NULL           -- giờ VN
);

CREATE INDEX IF NOT EXISTS idx_thongbao_nhom ON thong_bao (nhom, tao_luc);

-- Mỗi tài khoản nhớ lần cuối MỞ chuông, để tính số chưa đọc (dùng chung nhóm vẫn đúng riêng từng người)
ALTER TABLE tai_khoan ADD COLUMN tb_xem_luc TEXT;
