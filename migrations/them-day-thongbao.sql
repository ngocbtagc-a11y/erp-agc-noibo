-- ==========================================================================
-- MIGRATION — Đẩy thông báo lên điện thoại (CTL-0014, Đợt 1: chat riêng)
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-day-thongbao.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-day-thongbao.sql
-- ==========================================================================

-- Mỗi MÁY người dùng bật thông báo là một dòng. Một người có thể có nhiều máy
-- (điện thoại + máy tính) — đều nhận, nên phải là bảng riêng chứ không phải cột.
CREATE TABLE IF NOT EXISTS push_dangky (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_su_id     TEXT NOT NULL,
  endpoint       TEXT NOT NULL UNIQUE,   -- địa chỉ máy chủ đẩy của hãng trình duyệt
  p256dh         TEXT NOT NULL,          -- khoá công khai của máy (base64url, 65 byte)
  auth           TEXT NOT NULL,          -- bí mật chia sẻ (base64url, 16 byte)
  may            TEXT,                   -- "iPhone · Safari" — để người dùng biết đang bật ở đâu
  tao_luc        TEXT NOT NULL,
  dung_luc       TEXT,                   -- lần cuối đẩy THÀNH CÔNG
  hong_lien_tiep INTEGER NOT NULL DEFAULT 0   -- 10 lượt liên tiếp là đăng ký rác, tự xoá
);
CREATE INDEX IF NOT EXISTS idx_pushdangky_nhansu ON push_dangky (nhan_su_id);

-- Nhật ký ĐÃ ĐẨY — nuôi hai chốt chặn: gộp 60 giây và trần theo ngày.
-- Cũng chính là chỗ ĐẾM ĐƯỢC một người nhận bao nhiêu thông báo trong ngày
-- bận nhất, thay vì phải đoán.
CREATE TABLE IF NOT EXISTS push_nhat_ky (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_su_id TEXT NOT NULL,
  khoa       TEXT NOT NULL,   -- 'chat:<id người gửi>' — gộp theo TỪNG người gửi
  ngay       TEXT NOT NULL,   -- 'YYYY-MM-DD' giờ VN, để đếm trần trong ngày
  tao_luc    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pushnhatky_gop  ON push_nhat_ky (nhan_su_id, khoa, id);
CREATE INDEX IF NOT EXISTS idx_pushnhatky_ngay ON push_nhat_ky (nhan_su_id, ngay);

-- Tắt RIÊNG loại "tin nhắn". Cảnh báo đơn hoàn KHÔNG tắt theo — đó là toàn bộ
-- lý do phải có cột riêng thay vì một công tắc tổng.
ALTER TABLE tai_khoan ADD COLUMN push_chat_tat INTEGER NOT NULL DEFAULT 0;

-- "Đang mở cửa sổ chat với ai" — máy tự đóng dấu mỗi nhịp hỏi lại (6 giây).
-- Máy chủ nhìn hai cột này để KHÔNG đẩy khi người ta đang ngồi đọc đúng đoạn đó.
ALTER TABLE tai_khoan ADD COLUMN xem_chat_voi TEXT;
ALTER TABLE tai_khoan ADD COLUMN xem_chat_luc TEXT;
