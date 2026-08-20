-- ==========================================================================
-- MIGRATION — Người phối hợp cho công việc (Trạm Việc)
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-phoihop-congviec.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-phoihop-congviec.sql
-- MBOs: vẫn 1 người CHỊU TRÁCH NHIỆM CHÍNH (nguoi_nhan_id), phoi_hop chỉ là hỗ trợ.
-- ==========================================================================

ALTER TABLE cong_viec ADD COLUMN phoi_hop_ids TEXT;   -- id người phối hợp, dạng ",id1,id2," (có phẩy đầu/cuối để LIKE khớp chính xác)
ALTER TABLE cong_viec ADD COLUMN phoi_hop_ten TEXT;   -- tên người phối hợp (để hiển thị), vd "Hương, Huyền"
