-- ==========================================================================
-- MIGRATION — Danh mục nền: Nhà cung cấp / Kho
-- --------------------------------------------------------------------------
-- Cùng khuôn mẫu phong_ban/chuc_danh/don_vi_tinh: có Data Lock (trang_thai
-- nhap/da_khoa) ngay từ đầu, không phải thêm sau. Chưa gắn *_id vào
-- giao_dich_kho.doi_tac hay bảng nào khác — đó là bước sau, làm khi có
-- dữ liệu NCC/Kho thật để đối chiếu (không tự suy đoán).
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-nhacungcap-kho.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-nhacungcap-kho.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS nha_cung_cap (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ten          TEXT NOT NULL,
  ma_so_thue   TEXT,
  dien_thoai   TEXT,
  dia_chi      TEXT,
  hoat_dong    INTEGER NOT NULL DEFAULT 1,
  trang_thai   TEXT NOT NULL DEFAULT 'nhap',
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE TABLE IF NOT EXISTS kho (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ten          TEXT NOT NULL UNIQUE,
  dia_chi      TEXT,
  hoat_dong    INTEGER NOT NULL DEFAULT 1,
  trang_thai   TEXT NOT NULL DEFAULT 'nhap',
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
