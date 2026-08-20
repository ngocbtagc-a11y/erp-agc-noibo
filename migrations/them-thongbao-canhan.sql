-- Thông báo nhắm ĐÚNG 1 cá nhân, thay vì chỉ theo nhóm phòng ban — dùng cho
-- Tác vụ (giao việc là chuyện riêng 2 người). NULL = thông báo nhóm như cũ.
ALTER TABLE thong_bao ADD COLUMN nguoi_nhan_id TEXT;
CREATE INDEX IF NOT EXISTS idx_thongbao_nguoinhan ON thong_bao (nguoi_nhan_id, tao_luc);
