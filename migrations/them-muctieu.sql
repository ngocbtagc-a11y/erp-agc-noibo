-- ==========================================================================
-- MIGRATION — Mục tiêu MBOs 2 tầng: Công ty -> Phòng ban (Sếp Phong chốt)
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file=migrations/them-muctieu.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file=migrations/them-muctieu.sql
-- Tiến độ mục tiêu KHÔNG nhập tay — tự tính từ % công việc (Trạm Mục Tiêu)
-- đã gắn vào mục tiêu đó mà trạng thái = hoàn_thành (xem cong_viec.muc_tieu_id).
-- ==========================================================================

CREATE TABLE IF NOT EXISTS muc_tieu (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  cap            TEXT NOT NULL,        -- 'cong_ty' | 'phong_ban'
  bo_phan        TEXT,                 -- NULL nếu cấp công ty; bắt buộc nếu cấp phòng ban
  tieu_de        TEXT NOT NULL,
  mo_ta          TEXT,
  nam            INTEGER NOT NULL,
  quy            INTEGER NOT NULL,     -- 1-4
  nguoi_tao_id   TEXT NOT NULL,
  nguoi_tao_ten  TEXT NOT NULL,
  trang_thai     TEXT NOT NULL DEFAULT 'dang_thuc_hien',   -- dang_thuc_hien|hoan_thanh|huy
  da_chot        INTEGER NOT NULL DEFAULT 0,   -- chỉ dùng cho cấp công ty — Giám đốc/Phó GĐ chốt xong khoá lại
  chot_boi       TEXT,
  chot_luc       TEXT,
  tao_luc        TEXT NOT NULL,
  cap_nhat_luc   TEXT
);
CREATE INDEX IF NOT EXISTS idx_muc_tieu_ky ON muc_tieu (nam, quy, cap);

-- Gắn 1 công việc (Trạm Mục Tiêu) vào đúng 1 mục tiêu (tuỳ chọn) — để tính
-- tiến độ mục tiêu tự động từ các việc con.
ALTER TABLE cong_viec ADD COLUMN muc_tieu_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_cong_viec_muctieu ON cong_viec (muc_tieu_id);
