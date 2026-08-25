-- ==========================================================================
-- MIGRATION — Danh mục nền: Phòng ban / Chức danh / Đơn vị tính
-- --------------------------------------------------------------------------
-- Chỉ THÊM bảng mới + cột tham chiếu (mặc định NULL), KHÔNG đụng dữ liệu cũ.
-- Cột chữ cũ (nhan_su.bo_phan/chuc_vu, san_pham.don_vi) vẫn giữ nguyên để
-- không phá màn hình/dữ liệu đang chạy — chỉ nhân sự/sản phẩm được THÊM MỚI
-- hoặc SỬA sau migration này mới gắn thêm *_id tham chiếu tới danh mục chuẩn.
-- Không tự suy đoán/migrate dữ liệu chữ cũ sang id mới.
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-danhmuc-nen.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-danhmuc-nen.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS phong_ban (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ten        TEXT NOT NULL UNIQUE,
  hoat_dong  INTEGER NOT NULL DEFAULT 1,
  tao_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE TABLE IF NOT EXISTS chuc_danh (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ten        TEXT NOT NULL UNIQUE,
  hoat_dong  INTEGER NOT NULL DEFAULT 1,
  tao_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE TABLE IF NOT EXISTS don_vi_tinh (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ten        TEXT NOT NULL UNIQUE,
  hoat_dong  INTEGER NOT NULL DEFAULT 1,
  tao_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

ALTER TABLE nhan_su  ADD COLUMN phong_ban_id INTEGER REFERENCES phong_ban(id);
ALTER TABLE nhan_su  ADD COLUMN chuc_danh_id INTEGER REFERENCES chuc_danh(id);
ALTER TABLE san_pham ADD COLUMN don_vi_id    INTEGER REFERENCES don_vi_tinh(id);
