-- ==========================================================================
-- LÙI them-gopy-congduyet.sql
-- --------------------------------------------------------------------------
-- KHÔNG drop cột. SQLite/D1 có DROP COLUMN từ 3.35 nhưng drop cột trên bảng
-- đang chạy thật là rủi ro không cần thiết: cách lùi an toàn hơn nhiều là
-- DEPLOY LẠI CODE CŨ. Code cũ không đọc tới các cột mới, chúng nằm im, dữ
-- liệu nghiệp vụ không mất gì (migration xuôi chưa hề UPDATE cột cũ nào).
--
-- File này chỉ gỡ những gì migration xuôi đã ĐẶT trên cột mới, để nếu chạy
-- lại từ đầu thì backfill tính lại sạch sẽ.
--
-- Chạy:  npx wrangler d1 execute crm-agc --local --file=migrations/lui-gopy-congduyet.sql
-- ==========================================================================

UPDATE gop_y SET can_xac_minh_lai = 0;
UPDATE gop_y SET current_owner = 'NGUOI_GUI', next_owner = 'QL_CAP1';

DELETE FROM schema_migrations WHERE filename = 'them-gopy-congduyet.sql';
