-- ==========================================================================
-- MIGRATION — Chat nội bộ ERP (1 kênh chung cho toàn công ty)
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-chat.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-chat.sql
-- ---------------------------------------------------------------------------
-- File đính kèm lưu base64 thẳng trong D1 (giống cách CCCD đang làm — quy mô
-- công ty nhỏ, chưa cần mở thêm R2). Giới hạn 4MB/file kiểm ở tầng API.
-- Cột tep_du_lieu KHÔNG được SELECT trong danh sách tin nhắn (nặng) — chỉ lấy
-- khi tải file riêng, xem hoanChatTep trong index.js.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS tin_nhan_chat (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  nguoi_gui_id       TEXT NOT NULL,
  nguoi_gui_ten      TEXT NOT NULL,
  nguoi_gui_viet_tat TEXT NOT NULL,
  noi_dung           TEXT,
  tep_ten            TEXT,
  tep_loai           TEXT,
  tep_kich_thuoc     INTEGER,
  tep_du_lieu        TEXT,     -- base64, chỉ đọc riêng khi tải/xem
  tao_luc            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tin_nhan_chat_id ON tin_nhan_chat (id);
