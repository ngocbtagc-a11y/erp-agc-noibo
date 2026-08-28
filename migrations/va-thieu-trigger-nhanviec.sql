-- ==========================================================================
-- VÁ PHẦN CÒN THIẾU của va-nhacviec-rev0019.sql
-- ---------------------------------------------------------------------------
-- Kiểm dữ liệu thật 28/08 sau khi nạp: hai cột và hai chỉ mục DUY NHẤT đã vào,
-- nhưng TRIGGER thì không. File gốc chạy tiếp qua chỗ hỏng mà không dừng, nên
-- nạp "một phần" mà sổ vẫn ghi là xong.
--
-- File này CHỈ tạo trigger còn thiếu. Không đụng cột, không đụng chỉ mục,
-- không đụng một dòng dữ liệu nào. Chạy lại nhiều lần vô hại (IF NOT EXISTS).
--
-- Trigger để làm gì: đóng dấu thời điểm một người NHẬN việc. Không có nó thì
-- người vừa được chuyển việc sang sẽ bị máy nhắc "bạn trễ N ngày" ngay hôm
-- đầu — đổ lỗi sai người, đúng thứ REV-0019 bắt phải sửa.
-- ==========================================================================

CREATE TRIGGER IF NOT EXISTS trg_cong_viec_doi_nguoi_nhan
AFTER UPDATE OF nguoi_nhan_id ON cong_viec
FOR EACH ROW WHEN OLD.nguoi_nhan_id <> NEW.nguoi_nhan_id
BEGIN
  UPDATE cong_viec SET nhan_viec_luc = datetime('now', '+7 hours') WHERE id = NEW.id;
END;
