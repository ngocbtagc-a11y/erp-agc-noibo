-- ==========================================================================
-- LÙI them-gopy-cho-duyet-tu-luc.sql
-- --------------------------------------------------------------------------
-- CẤT TRƯỚC, BỎ SAU — không mất chữ nào. Bước 1 chép cột đồng hồ sang bảng
-- lưu (cộng dồn qua nhiều lần lùi, kèm mốc lui_luc), bước 3 mới bỏ cột. Cả
-- file chạy trong MỘT giao dịch (wrangler d1 execute --file) nên bước 1 hỏng
-- là bước 3 không bao giờ chạy.
--
-- Lùi rồi TIẾN LẠI ĐƯỢC: file này gỡ luôn chốt trong schema_migrations nên
-- chạy lại file xuôi không vấp "duplicate column name".
--
-- KHÔNG đụng một cột nghiệp vụ cũ nào của gop_y.
--
-- HỆ QUẢ SAU KHI LÙI: đồng hồ SLA quay về đo bằng `cap_nhat_luc` — tức là
-- CỬA THỨ 14 mở lại (mọi lần "lưu tại chỗ" của admin lại đẩy lùi được ngày
-- thứ 5). Code mới KHÔNG sập khi thiếu cột (nó tự lùi về đo bằng
-- cap_nhat_luc, kèm console.warn), nên lùi DB không bắt buộc phải deploy code
-- cũ trước — nhưng biết là mình đang mở lại cửa đó thì hãy lùi.
--
-- Chạy:  npx wrangler d1 execute crm-agc --local --file=migrations/lui-gopy-cho-duyet-tu-luc.sql
--
-- Xem lại giá trị đã cất:
--   SELECT * FROM gopy_cho_duyet_luu_lui ORDER BY lui_luc DESC;
-- ==========================================================================

-- ---- 1. Cất đồng hồ hàng chờ ---------------------------------------------
CREATE TABLE IF NOT EXISTS gopy_cho_duyet_luu_lui (
  gop_y_id         INTEGER,
  cho_duyet_tu_luc TEXT,
  lui_luc          TEXT
);

INSERT INTO gopy_cho_duyet_luu_lui
SELECT id, cho_duyet_tu_luc, datetime('now', '+7 hours') FROM gop_y;

-- ---- 2. Bỏ chỉ mục trước --------------------------------------------------
-- SQLite từ chối DROP COLUMN khi cột đang nằm trong một chỉ mục.
DROP INDEX IF EXISTS idx_gopy_cho_duyet_tu_luc;

-- ---- 3. Bỏ đúng 1 cột file xuôi đã thêm ----------------------------------
ALTER TABLE gop_y DROP COLUMN cho_duyet_tu_luc;

DELETE FROM schema_migrations WHERE filename = 'them-gopy-cho-duyet-tu-luc.sql';
