-- ==========================================================================
-- LÙI them-gopy-da-len-that.sql
-- --------------------------------------------------------------------------
-- CẤT TRƯỚC, BỎ SAU — không mất chữ nào. Bước 1 chép cả 7 cột sang bảng lưu
-- (cộng dồn qua nhiều lần lùi, kèm mốc lui_luc), bước 3 mới bỏ cột. Cả file
-- chạy trong MỘT giao dịch nên bước 1 hỏng là bước 3 không bao giờ chạy.
--
-- Lùi rồi TIẾN LẠI ĐƯỢC: file này gỡ luôn chốt trong schema_migrations.
--
-- KHÔNG đụng một cột nghiệp vụ cũ nào của gop_y.
--
-- HỆ QUẢ SAU KHI LÙI: deploy không còn đóng được góp ý nào — quay lại đúng
-- hiện trạng cũ (người báo lỗi không biết lỗi mình đã sửa xong). Code mới
-- KHÔNG sập khi thiếu cột: `gopYDaLenThat()` nuốt đúng lỗi "no such column"
-- và trả về `{ bo_qua: 'thieu_cot' }`, nên lùi DB không bắt buộc phải deploy
-- code cũ trước.
--
-- Chạy:  npx wrangler d1 execute crm-agc --local --file=migrations/lui-gopy-da-len-that.sql
--
-- Xem lại giá trị đã cất:
--   SELECT * FROM gopy_da_len_luu_lui ORDER BY lui_luc DESC;
-- ==========================================================================

-- ---- 1. Cất toàn bộ dấu vết deploy ---------------------------------------
CREATE TABLE IF NOT EXISTS gopy_da_len_luu_lui (
  gop_y_id            INTEGER,
  deploy_sha          TEXT,
  deploy_luc          TEXT,
  deploy_cho_xac_nhan INTEGER,
  deploy_tom_tat      TEXT,
  bao_da_len_luc      TEXT,
  dong_kieu           TEXT,
  deploy_tt_cu        TEXT,
  lui_luc             TEXT
);

-- Bảng lưu có thể đã tồn tại từ một lần lùi TRƯỚC bản REV-0042 (7 cột). Thêm
-- êm cột mới vào đó; đã có sẵn thì SQLite kêu "duplicate column" và file lùi
-- vẫn chạy tiếp — chạy bằng scripts/chay-migration.mjs, câu này bỏ qua được.
ALTER TABLE gopy_da_len_luu_lui ADD COLUMN deploy_tt_cu TEXT;

INSERT INTO gopy_da_len_luu_lui
       (gop_y_id, deploy_sha, deploy_luc, deploy_cho_xac_nhan, deploy_tom_tat,
        bao_da_len_luc, dong_kieu, deploy_tt_cu, lui_luc)
SELECT id, deploy_sha, deploy_luc, deploy_cho_xac_nhan, deploy_tom_tat,
       bao_da_len_luc, dong_kieu, deploy_tt_cu, datetime('now', '+7 hours')
  FROM gop_y;

-- ---- 2. Bỏ chỉ mục trước --------------------------------------------------
-- SQLite từ chối DROP COLUMN khi cột đang nằm trong một chỉ mục.
DROP INDEX IF EXISTS idx_gopy_choxacnhan;
DROP INDEX IF EXISTS idx_gopy_deploy_ttcu;

-- ---- 3. Bỏ đúng 7 cột file xuôi đã thêm ----------------------------------
ALTER TABLE gop_y DROP COLUMN deploy_sha;
ALTER TABLE gop_y DROP COLUMN deploy_luc;
ALTER TABLE gop_y DROP COLUMN deploy_cho_xac_nhan;
ALTER TABLE gop_y DROP COLUMN deploy_tom_tat;
ALTER TABLE gop_y DROP COLUMN bao_da_len_luc;
ALTER TABLE gop_y DROP COLUMN dong_kieu;
ALTER TABLE gop_y DROP COLUMN deploy_tt_cu;

DELETE FROM schema_migrations WHERE filename = 'them-gopy-da-len-that.sql';
