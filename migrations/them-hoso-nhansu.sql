-- ==========================================================================
-- MIGRATION — Mở rộng hồ sơ nhân sự (đón nhân sự mới bằng ảnh CCCD)
-- --------------------------------------------------------------------------
--   Nạp máy:  npm run nap-hoso-may
--   Nạp mây:  npm run nap-hoso
-- Chỉ THÊM cột vào bảng nhan_su, không đụng dữ liệu cũ. Chạy MỘT LẦN
-- (SQLite không có ADD COLUMN IF NOT EXISTS — chạy lại sẽ báo trùng cột).
--
-- ⚠️ so_cccd và so_bhxh là DỮ LIỆU CÁ NHÂN NHẠY CẢM — máy chủ chỉ trả về cho
-- người có quyền (như cột lương). Ảnh lưu ở R2, DB chỉ giữ "khóa" tên ảnh.
-- ==========================================================================

ALTER TABLE nhan_su ADD COLUMN so_cccd        TEXT;   -- số căn cước công dân (nhạy cảm)
ALTER TABLE nhan_su ADD COLUMN ngay_sinh      TEXT;   -- YYYY-MM-DD
ALTER TABLE nhan_su ADD COLUMN gioi_tinh      TEXT;   -- Nam | Nữ | Khác
ALTER TABLE nhan_su ADD COLUMN que_quan       TEXT;
ALTER TABLE nhan_su ADD COLUMN noi_thuong_tru TEXT;
ALTER TABLE nhan_su ADD COLUMN so_bhxh        TEXT;   -- số sổ BHXH (nhạy cảm)
ALTER TABLE nhan_su ADD COLUMN anh_cccd       TEXT;   -- khóa ảnh CCCD trong R2 (nhạy cảm)
ALTER TABLE nhan_su ADD COLUMN anh_chan_dung  TEXT;   -- khóa ảnh chân dung trong R2
