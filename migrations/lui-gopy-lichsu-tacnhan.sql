-- ==========================================================================
-- LÙI them-gopy-lichsu-tacnhan.sql — đổi tên ngược hai bảng.
-- --------------------------------------------------------------------------
-- MẤT 0 DÒNG DỮ LIỆU: bảng gốc chưa từng bị xoá, nó chỉ đang mang tên
-- gop_y_lich_su_luu_20260827. Lùi xong nó trở lại đúng tên cũ.
--
-- Các dòng đã ghi trong thời gian chạy bản mới KHÔNG mất — chúng nằm lại
-- trong gop_y_lich_su_v2 (tên sau khi lùi). Muốn xem:
--   SELECT * FROM gop_y_lich_su_v2 ORDER BY luc DESC;
--
-- Chạy:  npx wrangler d1 execute crm-agc --local --file=migrations/lui-gopy-lichsu-tacnhan.sql
-- (đổi --local thành --remote nếu phải lùi bản thật; nhớ deploy lại code cũ
--  TRƯỚC khi lùi DB, không thì code mới sẽ ghi vào bảng đã đổi tên)
-- ==========================================================================

ALTER TABLE gop_y_lich_su               RENAME TO gop_y_lich_su_v2;
ALTER TABLE gop_y_lich_su_luu_20260827  RENAME TO gop_y_lich_su;

DELETE FROM schema_migrations WHERE filename = 'them-gopy-lichsu-tacnhan.sql';
