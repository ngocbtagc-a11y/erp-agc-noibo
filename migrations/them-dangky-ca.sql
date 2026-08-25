-- ==========================================================================
-- MIGRATION — Đăng ký ca / Xếp ca (Part-time & Thời vụ)
-- --------------------------------------------------------------------------
-- Thay thế Google Sheet đăng ký ca bằng workflow chuẩn trong ERP:
--   Đăng ký ca -> Trưởng bộ phận duyệt -> Lịch làm chính thức -> (sau này) Chấm công -> Lương
-- 3 lớp dữ liệu TÁCH RIÊNG, không gộp: dang_ky_ca (nhu cầu) / lich_lam_viec
-- (lịch chính thức). Chấm công (attendance) CHƯA tạo — chỉ chừa khoá ngoại
-- lich_lam_viec.id để nối sau, đúng nguyên tắc "không code trước khi có
-- nhu cầu thật".
--
-- Vá 2 lỗ hổng Employee/Department Master phát hiện khi audit (xem
-- docs/ENTITY_IDENTITY.md): loai_lao_dong (tách khỏi trang_thai hợp đồng)
-- và truong_phong_id (trước đây phong_ban không có ai là "trưởng phòng").
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file=migrations/them-dangky-ca.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file=migrations/them-dangky-ca.sql
-- ==========================================================================

-- ---- Vá Employee/Department Master ----------------------------------------
ALTER TABLE nhan_su   ADD COLUMN loai_lao_dong TEXT NOT NULL DEFAULT 'toan_thoi_gian';
-- toan_thoi_gian | ban_thoi_gian | thoi_vu — TÁCH RIÊNG khỏi nhan_su.trang_thai
-- (trạng thái hợp đồng thử việc/chờ ký/đã ký) — 2 khái niệm khác nhau, không
-- được gộp (bài học từ chính cột trang_thai đang bị lẫn "parttime" vào).

ALTER TABLE phong_ban  ADD COLUMN truong_phong_id TEXT REFERENCES nhan_su(id);
-- NULL nghĩa là chưa gán trưởng phòng — Ban Giám đốc/HCNS gán sau, không
-- suy đoán từ dữ liệu cũ.

-- ---- Mẫu ca (danh mục ca chuẩn — HCNS/Admin quản lý) -----------------------
CREATE TABLE IF NOT EXISTS mau_ca (
  id            TEXT PRIMARY KEY,
  ma_ca         TEXT NOT NULL UNIQUE,   -- ký hiệu ngắn hiển thị trên ma trận: S, C, T...
  ten_ca        TEXT NOT NULL,
  gio_bat_dau   TEXT NOT NULL,          -- 'HH:MM'
  gio_ket_thuc  TEXT NOT NULL,
  phut_nghi     INTEGER NOT NULL DEFAULT 0,
  dang_dung     INTEGER NOT NULL DEFAULT 1,
  tao_luc       TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- ---- Ca mở (1 mẫu ca x 1 ngày x 1 phòng ban — cái nhân viên thấy để đăng ký) --
CREATE TABLE IF NOT EXISTS ca_mo (
  id                  TEXT PRIMARY KEY,
  ngay                TEXT NOT NULL,          -- 'YYYY-MM-DD'
  mau_ca_id           TEXT NOT NULL REFERENCES mau_ca(id),
  phong_ban_id        INTEGER NOT NULL REFERENCES phong_ban(id),
  can_bao_nhieu_nguoi INTEGER NOT NULL DEFAULT 0,
  toi_da_nguoi        INTEGER,
  mo_dang_ky_luc      TEXT,
  dong_dang_ky_luc    TEXT,
  trang_thai          TEXT NOT NULL DEFAULT 'mo',   -- nhap|mo|dong|khoa
  ghi_chu             TEXT,
  tao_luc             TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  UNIQUE(ngay, mau_ca_id, phong_ban_id)
);
CREATE INDEX IF NOT EXISTS idx_ca_mo_ngay      ON ca_mo(ngay);
CREATE INDEX IF NOT EXISTS idx_ca_mo_phongban  ON ca_mo(phong_ban_id);

-- ---- Đăng ký ca (nhu cầu của nhân viên — LỚP 1) ----------------------------
CREATE TABLE IF NOT EXISTS dang_ky_ca (
  id              TEXT PRIMARY KEY,
  nhan_su_id      TEXT NOT NULL REFERENCES nhan_su(id),
  ca_mo_id        TEXT NOT NULL REFERENCES ca_mo(id),
  trang_thai      TEXT NOT NULL DEFAULT 'cho_duyet',  -- cho_duyet|da_duyet|tu_choi|da_huy|cho_xep
  ghi_chu_ns      TEXT,
  nguoi_duyet_id  TEXT REFERENCES nhan_su(id),
  duyet_luc       TEXT,
  ly_do_tu_choi   TEXT,
  tao_luc         TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  cap_nhat_luc    TEXT,
  UNIQUE(nhan_su_id, ca_mo_id)
);
CREATE INDEX IF NOT EXISTS idx_dkc_nhansu      ON dang_ky_ca(nhan_su_id);
CREATE INDEX IF NOT EXISTS idx_dkc_camo        ON dang_ky_ca(ca_mo_id);
CREATE INDEX IF NOT EXISTS idx_dkc_trangthai   ON dang_ky_ca(trang_thai);

-- ---- Lịch làm việc chính thức (LỚP 2 — KHÔNG phải Đăng ký ca) --------------
-- Chỉ được tạo khi 1 đăng ký được DUYỆT, hoặc khi trưởng phòng GÁN CA thủ
-- công (nguon='xep_thu_cong', không qua đăng ký). Chấm công thật (sau này)
-- sẽ REFERENCES lich_lam_viec(id) — không suy ra "đã duyệt" = "đã đi làm".
CREATE TABLE IF NOT EXISTS lich_lam_viec (
  id            TEXT PRIMARY KEY,
  nhan_su_id    TEXT NOT NULL REFERENCES nhan_su(id),
  ngay          TEXT NOT NULL,
  ca_mo_id      TEXT NOT NULL REFERENCES ca_mo(id),
  phong_ban_id  INTEGER NOT NULL REFERENCES phong_ban(id),
  gio_bat_dau   TEXT NOT NULL,
  gio_ket_thuc  TEXT NOT NULL,
  nguon         TEXT NOT NULL,             -- dang_ky|xep_thu_cong|co_dinh
  dang_ky_ca_id TEXT REFERENCES dang_ky_ca(id),
  nguoi_xep_id  TEXT REFERENCES nhan_su(id),
  trang_thai    TEXT NOT NULL DEFAULT 'da_xep',  -- da_xep|da_xac_nhan|da_huy|hoan_thanh|vang
  khoa_luc      TEXT,
  tao_luc       TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  UNIQUE(nhan_su_id, ngay, ca_mo_id)
);
CREATE INDEX IF NOT EXISTS idx_llv_nhansu_ngay     ON lich_lam_viec(nhan_su_id, ngay);
CREATE INDEX IF NOT EXISTS idx_llv_phongban_ngay   ON lich_lam_viec(phong_ban_id, ngay);

-- ---- Nhật ký (audit) — mọi hành động duyệt/từ chối/huỷ/gán ca/khoá --------
CREATE TABLE IF NOT EXISTS ca_lich_su (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  loai_doi_tuong  TEXT NOT NULL,     -- 'dang_ky_ca' | 'lich_lam_viec'
  doi_tuong_id    TEXT NOT NULL,
  hanh_dong       TEXT NOT NULL,     -- tao|duyet|tu_choi|huy|gan_ca|khoa|doi_ca
  trang_thai_cu   TEXT,
  trang_thai_moi  TEXT,
  ghi_chu         TEXT,
  nguoi_thuc_hien TEXT NOT NULL REFERENCES nhan_su(id),
  luc             TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_cls_doituong ON ca_lich_su(loai_doi_tuong, doi_tuong_id);
