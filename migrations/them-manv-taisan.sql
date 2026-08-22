-- ==========================================================================
-- MIGRATION — Mã nhân sự (ma_nv) + module Tài sản (Asset Management)
-- --------------------------------------------------------------------------
-- Theo docs/ENTITY_IDENTITY.md: mỗi entity quan trọng cần Business Code ổn
-- định, không phụ thuộc tên (dễ trùng/dễ đổi). bo_dem_ma là bộ đếm TẬP
-- TRUNG dùng chung cho mọi loại mã tương lai — không hardcode format rải
-- rác từng file (xem src/dinh-danh.js).
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file=migrations/them-manv-taisan.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file=migrations/them-manv-taisan.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS bo_dem_ma (
  loai       TEXT PRIMARY KEY,
  tiep_theo  INTEGER NOT NULL
);

-- ---- Mã nhân sự -----------------------------------------------------------
ALTER TABLE nhan_su ADD COLUMN ma_nv TEXT;

-- Khởi tạo bộ đếm bằng đúng số nhân sự đang có, để mã mới không đụng số cũ.
INSERT INTO bo_dem_ma (loai, tiep_theo)
SELECT 'nhan_su', COUNT(*) FROM nhan_su
WHERE NOT EXISTS (SELECT 1 FROM bo_dem_ma WHERE loai = 'nhan_su');

-- Gán mã cho nhân sự đã có sẵn — đánh số theo rowid (thứ tự tạo, SQLite
-- luôn có rowid ẩn kể cả khi khoá chính là TEXT như nhan_su.id).
UPDATE nhan_su
SET ma_nv = 'NV' || substr('0000' || (
  SELECT COUNT(*) FROM nhan_su n2 WHERE n2.rowid <= nhan_su.rowid
), -4, 4)
WHERE ma_nv IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_nhan_su_ma_nv ON nhan_su(ma_nv);

-- ---- Module Tài sản (Asset Management) ------------------------------------
-- Data Owner: P. Support/Hành chính (xem src/quyen.js duocQuanLyTaiSan).
-- Lifecycle: san_sang -> da_cap_phat -> bao_hong -> san_sang (sau bảo trì)
--                                    -> da_thanh_ly (kết thúc, từ bất kỳ trạng thái nào).
CREATE TABLE IF NOT EXISTS tai_san (
  id            TEXT PRIMARY KEY,          -- Internal ID (ts_ + uuid)
  ma_ts         TEXT NOT NULL UNIQUE,      -- Business Code, tự sinh (TS0001)
  ten           TEXT NOT NULL,
  danh_muc      TEXT,                       -- Laptop, Máy in, Xe nâng...
  trang_thai    TEXT NOT NULL DEFAULT 'san_sang',
  nguoi_giu_id  TEXT REFERENCES nhan_su(id),
  vi_tri        TEXT,
  ghi_chu       TEXT,
  hoat_dong     INTEGER NOT NULL DEFAULT 1,
  tao_luc       TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_tai_san_nguoi_giu ON tai_san(nguoi_giu_id);
CREATE INDEX IF NOT EXISTS idx_tai_san_trang_thai ON tai_san(trang_thai);

-- Ledger bất biến — mỗi thay đổi quan trọng ghi 1 dòng, KHÔNG sửa/xoá dòng
-- cũ (cùng khuôn mẫu giao_dich_kho / don_hang_lich_su đã dùng trong ERP này).
CREATE TABLE IF NOT EXISTS tai_san_lich_su (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tai_san_id      TEXT NOT NULL REFERENCES tai_san(id),
  loai_su_kien    TEXT NOT NULL,   -- tao_moi|cap_phat|thu_hoi|bao_hong|bao_tri|thanh_ly
  nguoi_giu_cu    TEXT,
  nguoi_giu_moi   TEXT,
  vi_tri_cu       TEXT,
  vi_tri_moi      TEXT,
  ghi_chu         TEXT,
  nguoi_thuc_hien TEXT NOT NULL REFERENCES nhan_su(id),
  luc             TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_tsls_tai_san ON tai_san_lich_su(tai_san_id);

INSERT INTO bo_dem_ma (loai, tiep_theo)
SELECT 'tai_san', 0
WHERE NOT EXISTS (SELECT 1 FROM bo_dem_ma WHERE loai = 'tai_san');
