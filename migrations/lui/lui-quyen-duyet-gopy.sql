-- ==========================================================================
-- LÙI them-quyen-duyet-gopy.sql
-- --------------------------------------------------------------------------
-- CẤT TRƯỚC, BỎ SAU — không mất chữ nào. Bước 1 chép giá trị cờ và ảnh chụp
-- hoàn tác sang bảng lưu (cộng dồn qua nhiều lần lùi, kèm mốc lui_luc), bước
-- 3 mới bỏ cột. Cả file chạy trong MỘT giao dịch (wrangler d1 execute --file)
-- nên bước 1 hỏng là bước 3 không bao giờ chạy.
--
-- Lùi rồi TIẾN LẠI ĐƯỢC: file này bỏ hẳn cột và gỡ chốt trong
-- schema_migrations, nên chạy lại file xuôi không vấp "duplicate column name"
-- (đúng bài học của lui-gopy-congduyet.sql).
--
-- KHÔNG đụng một cột nghiệp vụ cũ nào: vai trò tài khoản, mật khẩu, trạng
-- thái góp ý, nội dung, lịch sử... nguyên vẹn.
--
-- HỆ QUẢ SAU KHI LÙI: quyền duyệt cấp cuối quay về "ai là admin cũng duyệt
-- được" — tức là anh Phong duyệt lại được. Lùi DB thì PHẢI deploy code cũ,
-- và theo đúng thứ tự NGƯỢC: DEPLOY CODE CŨ TRƯỚC, RỒI MỚI LÙI DB (code mới
-- đọc t.duyet_gopy trong docPhien — mất cột là mất đăng nhập toàn hệ thống).
--
-- Chạy:  npx wrangler d1 execute crm-agc --local --file=migrations/lui-quyen-duyet-gopy.sql
--
-- Xem lại giá trị đã cất:
--   SELECT * FROM quyen_duyet_gopy_luu_lui ORDER BY lui_luc DESC;
-- ==========================================================================

-- ---- 1. Cất cờ quyền ------------------------------------------------------
CREATE TABLE IF NOT EXISTS quyen_duyet_gopy_luu_lui (
  tai_khoan_id   INTEGER,
  ten_dang_nhap  TEXT,
  duyet_gopy     INTEGER,
  lui_luc        TEXT
);

INSERT INTO quyen_duyet_gopy_luu_lui
SELECT id, ten_dang_nhap, duyet_gopy, datetime('now', '+7 hours') FROM tai_khoan;

-- ---- 2. Cất ảnh chụp hoàn tác --------------------------------------------
CREATE TABLE IF NOT EXISTS gop_y_hoantac_luu_lui (
  gop_y_id        INTEGER,
  hoan_tac_json   TEXT,
  hoan_tac_boi_id TEXT,
  hoan_tac_luc    TEXT,
  lui_luc         TEXT
);

INSERT INTO gop_y_hoantac_luu_lui
SELECT id, hoan_tac_json, hoan_tac_boi_id, hoan_tac_luc, datetime('now', '+7 hours')
  FROM gop_y;

-- ---- 3. Bỏ chỉ mục trước --------------------------------------------------
-- SQLite từ chối DROP COLUMN khi cột đang nằm trong một chỉ mục.
DROP INDEX IF EXISTS idx_taikhoan_duyetgopy;

-- ---- 4. Bỏ đúng 4 cột file xuôi đã thêm ----------------------------------
ALTER TABLE tai_khoan DROP COLUMN duyet_gopy;
ALTER TABLE gop_y     DROP COLUMN hoan_tac_luc;
ALTER TABLE gop_y     DROP COLUMN hoan_tac_boi_id;
ALTER TABLE gop_y     DROP COLUMN hoan_tac_json;

DELETE FROM schema_migrations WHERE filename = 'them-quyen-duyet-gopy.sql';
