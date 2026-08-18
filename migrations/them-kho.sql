-- ==========================================================================
-- MIGRATION — Thêm module Kho (Xuất/Nhập/Tồn) vào database ĐANG CHẠY
-- --------------------------------------------------------------------------
-- Dùng khi database đã có nhân sự / tài khoản thật và KHÔNG muốn xoá đi.
-- File này chỉ TẠO THÊM 3 bảng kho, không đụng gì tới bảng cũ.
--   Nạp vào máy:   npm run nap-kho-may
--   Nạp lên mây:   npm run nap-kho
-- (Cài mới hoàn toàn thì dùng schema.sql — nó đã có sẵn 3 bảng này rồi.)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS san_pham (
  id            TEXT PRIMARY KEY,
  ma_sku        TEXT NOT NULL UNIQUE,
  ten           TEXT NOT NULL,
  danh_muc      TEXT,
  don_vi        TEXT NOT NULL DEFAULT 'sản phẩm',
  theo_doi_hsd  INTEGER NOT NULL DEFAULT 1,
  ton_toi_thieu INTEGER NOT NULL DEFAULT 0,
  dang_ban      INTEGER NOT NULL DEFAULT 1,
  tao_luc       TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_san_pham_danh_muc ON san_pham(danh_muc);

CREATE TABLE IF NOT EXISTS lo_hang (
  id           TEXT PRIMARY KEY,
  san_pham_id  TEXT NOT NULL REFERENCES san_pham(id),
  so_lo        TEXT,
  han_su_dung  TEXT,
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_lo_hang_san_pham ON lo_hang(san_pham_id);

CREATE TABLE IF NOT EXISTS giao_dich_kho (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  phieu_id     TEXT NOT NULL,
  san_pham_id  TEXT NOT NULL REFERENCES san_pham(id),
  lo_hang_id   TEXT REFERENCES lo_hang(id),
  loai         TEXT NOT NULL,
  so_luong     INTEGER NOT NULL,
  don_gia      INTEGER,
  doi_tac      TEXT,
  ghi_chu      TEXT,
  nguoi_id     TEXT REFERENCES nhan_su(id),
  luc          TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_gdk_san_pham ON giao_dich_kho(san_pham_id);
CREATE INDEX IF NOT EXISTS idx_gdk_lo       ON giao_dich_kho(lo_hang_id);
CREATE INDEX IF NOT EXISTS idx_gdk_luc      ON giao_dich_kho(luc);
CREATE INDEX IF NOT EXISTS idx_gdk_phieu    ON giao_dich_kho(phieu_id);
