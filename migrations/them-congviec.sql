-- Tác vụ / giao việc — Sếp Ngọc yêu cầu 20/08/2026: "1 Tác vụ để tôi giao
-- task công việc cho nhân viên khi cần". Theo tinh thần MBOs của công ty
-- (quản lý theo mục tiêu, đầu ra cụ thể chứ không phải mô tả hoạt động):
-- dau_ra là trường BẮT BUỘC, tách riêng khỏi mo_ta (mô tả cách làm, tuỳ chọn).
CREATE TABLE IF NOT EXISTS cong_viec (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tieu_de         TEXT NOT NULL,
  dau_ra          TEXT NOT NULL,   -- đầu ra cụ thể mong đợi khi xong việc
  mo_ta           TEXT,            -- ghi chú thêm cách làm/bối cảnh (tuỳ chọn)
  nguoi_giao_id   TEXT NOT NULL,
  nguoi_giao_ten  TEXT NOT NULL,
  nguoi_nhan_id   TEXT NOT NULL,
  nguoi_nhan_ten  TEXT NOT NULL,
  han_chot        TEXT,            -- 'YYYY-MM-DD', để trống nếu không có hạn
  trang_thai      TEXT NOT NULL DEFAULT 'moi',   -- moi|dang_lam|cho_duyet|hoan_thanh|huy
  ket_qua         TEXT,            -- kết quả thực tế, điền khi nộp lên "Chờ duyệt"
  tao_luc         TEXT NOT NULL,
  cap_nhat_luc    TEXT
);
CREATE INDEX IF NOT EXISTS idx_cong_viec_nhan ON cong_viec (nguoi_nhan_id, trang_thai);
CREATE INDEX IF NOT EXISTS idx_cong_viec_giao ON cong_viec (nguoi_giao_id, trang_thai);
