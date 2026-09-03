-- ==========================================================================
-- LÙI them-gopy-congduyet.sql
-- --------------------------------------------------------------------------
-- REV-0016 mục 2 — VÌ SAO BẢN TRƯỚC PHẢI VIẾT LẠI:
-- Bản trước chỉ UPDATE lại giá trị rồi gỡ chốt chặn trong schema_migrations,
-- KHÔNG bỏ cột. Lùi thì sạch, nhưng tiến lên lại thì vấp ngay
-- "duplicate column name: risk". Lùi rồi không tiến lên lại được thì không
-- phải là nút hoàn tác. Nay lùi–tiến–lùi–tiến chạy bao nhiêu vòng cũng được.
--
-- CẤT TRƯỚC, BỎ SAU — KHÔNG MẤT CHỮ NÀO:
-- Bước 1 chép TOÀN BỘ giá trị của 15 cột cổng duyệt sang bảng lưu
-- gop_y_congduyet_luu_lui (cộng dồn qua nhiều lần lùi, kèm mốc lui_luc).
-- Bước 3 mới bỏ cột. Cả file chạy trong MỘT giao dịch (wrangler d1 execute
-- --file), nên bước 1 hỏng là bước 3 không bao giờ chạy.
--
-- KHÔNG đụng một cột nghiệp vụ CŨ nào: gop_y.trang_thai, nội dung góp ý,
-- ảnh đính kèm... nguyên vẹn. File xuôi cũng chưa từng UPDATE cột cũ nào,
-- nên lùi xong dữ liệu nghiệp vụ đúng y như trước khi chạy migration.
--
-- Sau khi lùi DB nhớ DEPLOY LẠI CODE CŨ (hoặc deploy code cũ trước rồi mới
-- lùi) — code SPEC-0002 đọc các cột này, mất cột là hỏng.
--
-- Chạy:  npx wrangler d1 execute crm-agc --local --file=migrations/lui-gopy-congduyet.sql
--
-- Xem lại giá trị đã cất:
--   SELECT * FROM gop_y_congduyet_luu_lui ORDER BY lui_luc DESC, gop_y_id;
-- ==========================================================================

-- ---- 1. Cất giá trị 15 cột cổng duyệt sang bảng lưu ----------------------
CREATE TABLE IF NOT EXISTS gop_y_congduyet_luu_lui (
  gop_y_id            INTEGER,
  risk                TEXT,
  risk_chot_boi_id    TEXT,
  risk_chot_luc       TEXT,
  duyet_cap1_boi_id   TEXT,
  duyet_cap1_luc      TEXT,
  duyet_cap1_nguon    TEXT,
  duyet_owner_boi_id  TEXT,
  duyet_owner_luc     TEXT,
  bang_chung_url      TEXT,
  ly_do_tu_choi       TEXT,
  so_lan_gui_lai      INTEGER,
  can_xac_minh_lai    INTEGER,
  nhac_duyet_luc      TEXT,
  current_owner       TEXT,
  next_owner          TEXT,
  lui_luc             TEXT
);

INSERT INTO gop_y_congduyet_luu_lui
SELECT id, risk, risk_chot_boi_id, risk_chot_luc,
       duyet_cap1_boi_id, duyet_cap1_luc, duyet_cap1_nguon,
       duyet_owner_boi_id, duyet_owner_luc,
       bang_chung_url, ly_do_tu_choi, so_lan_gui_lai,
       can_xac_minh_lai, nhac_duyet_luc, current_owner, next_owner,
       datetime('now', '+7 hours')
  FROM gop_y;

-- ---- 2. Bỏ chỉ mục trước ------------------------------------------------
-- SQLite từ chối DROP COLUMN khi cột đang nằm trong một chỉ mục.
DROP INDEX IF EXISTS idx_gopy_nextowner;
DROP INDEX IF EXISTS idx_gopy_xacminh;

-- ---- 3. Bỏ đúng 15 cột mà file xuôi đã thêm -----------------------------
ALTER TABLE gop_y DROP COLUMN next_owner;
ALTER TABLE gop_y DROP COLUMN current_owner;
ALTER TABLE gop_y DROP COLUMN nhac_duyet_luc;
ALTER TABLE gop_y DROP COLUMN can_xac_minh_lai;
ALTER TABLE gop_y DROP COLUMN so_lan_gui_lai;
ALTER TABLE gop_y DROP COLUMN ly_do_tu_choi;
ALTER TABLE gop_y DROP COLUMN bang_chung_url;
ALTER TABLE gop_y DROP COLUMN duyet_owner_luc;
ALTER TABLE gop_y DROP COLUMN duyet_owner_boi_id;
ALTER TABLE gop_y DROP COLUMN duyet_cap1_nguon;
ALTER TABLE gop_y DROP COLUMN duyet_cap1_luc;
ALTER TABLE gop_y DROP COLUMN duyet_cap1_boi_id;
ALTER TABLE gop_y DROP COLUMN risk_chot_luc;
ALTER TABLE gop_y DROP COLUMN risk_chot_boi_id;
ALTER TABLE gop_y DROP COLUMN risk;

DELETE FROM schema_migrations WHERE filename = 'them-gopy-congduyet.sql';
