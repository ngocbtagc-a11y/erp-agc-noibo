-- Trạng thái hiện diện (Presence) — GIAO TIẾP, không phải chấm công/lịch
-- làm việc. 1 bảng riêng, current-state only (không phải lịch sử), tách
-- khỏi nhan_su vì đây là dữ liệu volatile/workspace, không phải hồ sơ HR
-- (One Fact One Owner). Sidebar/Danh bạ/Hồ sơ đều đọc từ đây, không copy
-- sang bảng khác.
--
-- ma_trang_thai (MANUAL, người dùng tự chọn):
--   available | busy | meeting | away | dnd | remote
-- Dự phòng SYSTEM status (off_today | on_leave...) khi có Lịch làm/Nghỉ
-- phép chính thức sau này — cột `nguon` phân biệt manual/system, KHÔNG
-- merge 2 khái niệm: Presence (giao tiếp) khác Attendance/Leave (chính thức).
--
-- het_han_luc: tính hết hạn khi ĐỌC (so với datetime('now')), không cần
-- cron — hết hạn thì API tự trả 'available', không cần job dọn nền.
CREATE TABLE IF NOT EXISTS nhan_su_trang_thai (
  nhan_su_id    TEXT PRIMARY KEY REFERENCES nhan_su(id),
  ma_trang_thai TEXT NOT NULL DEFAULT 'available',
  ghi_chu       TEXT,
  het_han_luc   TEXT,
  nguon         TEXT NOT NULL DEFAULT 'manual',
  cap_nhat_luc  TEXT NOT NULL DEFAULT (datetime('now'))
);
