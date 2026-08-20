-- ==========================================================================
-- MIGRATION — Lưu "đã đọc chat tới đâu" ở MÁY CHỦ (theo từng tài khoản)
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-chat-daxem.sql
-- Trước đây mốc đã-đọc chỉ nằm ở trình duyệt -> tải lại trang là về 0, đếm lại
-- tin cũ thành "chưa đọc" -> badge không bao giờ mất. Lưu server thì đọc là đọc thật.
-- ==========================================================================

ALTER TABLE tai_khoan ADD COLUMN chat_xem_id INTEGER NOT NULL DEFAULT 0;   -- id tin nhắn chat cuối cùng đã đọc
