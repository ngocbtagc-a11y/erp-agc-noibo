-- ==========================================================================
-- MIGRATION — Lịch sử thay đổi nhân sự (nhan_su_lich_su)
-- --------------------------------------------------------------------------
-- Employee Profile Phase 1 (CORE_CHANGE đã duyệt 25/08/2026) — đóng đúng
-- khoảng trống docs/MODULE-MAP.md tự ghi nhận ("Audit Log dùng chung — chưa
-- có"). Bảng SỰ KIỆN (append-only), không thêm cột position_old/position_new
-- trực tiếp lên nhan_su (đúng yêu cầu §41: không tạo hàng chục cột *_old/
-- *_new trên bảng gốc).
--   Nạp máy:  node scripts/chay-migration.mjs migrations/them-nhansu-lichsu.sql
--   Nạp mây:  node scripts/chay-migration.mjs migrations/them-nhansu-lichsu.sql --remote
-- ==========================================================================

CREATE TABLE IF NOT EXISTS nhan_su_lich_su (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_su_id         TEXT NOT NULL REFERENCES nhan_su(id),
  loai_su_kien       TEXT NOT NULL,   -- vao_lam|doi_phong_ban|doi_chuc_danh|
                                      -- doi_quan_ly|doi_trang_thai|nghi_viec
  gia_tri_cu         TEXT,
  gia_tri_moi        TEXT,
  nguoi_thuc_hien_id TEXT NOT NULL REFERENCES nhan_su(id),
  ghi_chu            TEXT,
  luc                TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nhansu_lichsu_nhansu ON nhan_su_lich_su (nhan_su_id, luc DESC);
