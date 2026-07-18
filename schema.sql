-- ==========================================================================
-- CRM Alpha Green Commerce — Cấu trúc database (Cloudflare D1 / SQLite)
-- ==========================================================================

DROP TABLE IF EXISTS phien;
DROP TABLE IF EXISTS lan_dang_nhap_hong;
DROP TABLE IF EXISTS tai_khoan;
DROP TABLE IF EXISTS nhan_su;

-- ---- Nhân sự -------------------------------------------------------------
-- Lương để ở đây nhưng máy chủ CHỈ trả về cho người có quyền.
CREATE TABLE nhan_su (
  id            TEXT PRIMARY KEY,
  ho_ten        TEXT NOT NULL,
  viet_tat      TEXT NOT NULL,
  chuc_vu       TEXT NOT NULL,
  bo_phan       TEXT NOT NULL,
  sdt           TEXT,
  email         TEXT,
  quan_ly_id    TEXT REFERENCES nhan_su(id),
  phap_nhan     TEXT NOT NULL DEFAULT 'Công ty',  -- luôn 'Công ty' (đã bỏ HKD khỏi giao diện)
  trang_thai    TEXT NOT NULL DEFAULT 'cho_ky',   -- da_ky | thu_viec | cho_ky | can_trao_doi | parttime
  ngay_vao      TEXT,
  luong         INTEGER,                          -- đồng/tháng; NULL = chưa có
  dang_lam      INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_nhan_su_bo_phan ON nhan_su(bo_phan);

-- ---- Tài khoản đăng nhập -------------------------------------------------
-- mat_khau_hash: định dạng "pbkdf2$<số vòng>$<salt base64>$<hash base64>"
-- KHÔNG BAO GIỜ lưu mật khẩu dạng chữ thường.
CREATE TABLE tai_khoan (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_su_id     TEXT NOT NULL UNIQUE REFERENCES nhan_su(id),
  ten_dang_nhap  TEXT NOT NULL UNIQUE,
  mat_khau_hash  TEXT NOT NULL,
  vai_tro        TEXT NOT NULL,   -- xem src/quyen.js
  phai_doi_mk    INTEGER NOT NULL DEFAULT 1,
  kich_hoat      INTEGER NOT NULL DEFAULT 1,
  tao_luc        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Phiên đăng nhập -----------------------------------------------------
-- Chỉ lưu HASH của token. Nếu database lộ, kẻ lấy được cũng không mạo danh
-- được ai, vì token gốc không nằm ở đây.
CREATE TABLE phien (
  token_hash  TEXT PRIMARY KEY,
  tai_khoan_id INTEGER NOT NULL REFERENCES tai_khoan(id) ON DELETE CASCADE,
  tao_luc     TEXT NOT NULL DEFAULT (datetime('now')),
  het_han     TEXT NOT NULL
);

CREATE INDEX idx_phien_het_han ON phien(het_han);

-- ---- Chặn dò mật khẩu ----------------------------------------------------
CREATE TABLE lan_dang_nhap_hong (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_dang_nhap TEXT NOT NULL,
  luc           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dang_nhap_hong ON lan_dang_nhap_hong(ten_dang_nhap, luc);
