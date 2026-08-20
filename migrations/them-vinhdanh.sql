-- Bảng vinh danh nhỏ ở Tổng quan — Sếp Ngọc (hoặc bất kỳ ai) gõ lời khen
-- ngắn cho 1 đồng nghiệp, hiện công khai cho cả công ty thấy. Rèn thói quen
-- ghi nhận/khen ngợi (Sếp Ngọc yêu cầu 20/08/2026).
CREATE TABLE IF NOT EXISTS vinh_danh (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_su_id     TEXT NOT NULL,
  nhan_su_ten    TEXT NOT NULL,
  noi_dung       TEXT NOT NULL,
  nguoi_gui_id   TEXT NOT NULL,
  nguoi_gui_ten  TEXT NOT NULL,
  tao_luc        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vinhdanh_taoluc ON vinh_danh (tao_luc);
