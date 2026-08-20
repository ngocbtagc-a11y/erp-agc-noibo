-- ==========================================================================
-- MIGRATION — Chat riêng (DM) từng người, thêm cạnh kênh chung sẵn có
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-chat-dm.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-chat-dm.sql
-- ---------------------------------------------------------------------------
-- nguoi_nhan_id NULL = tin ở kênh chung (giữ nguyên hành vi cũ với dữ liệu
-- đã có — mọi tin cũ đều NULL nên vẫn thuộc kênh chung, không mất gì).
-- ==========================================================================

ALTER TABLE tin_nhan_chat ADD COLUMN nguoi_nhan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tin_nhan_chat_dm ON tin_nhan_chat (nguoi_gui_id, nguoi_nhan_id);
