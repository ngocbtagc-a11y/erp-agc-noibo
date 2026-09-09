-- ==========================================================================
-- MIGRATION — Chỉ mục cho việc dọn payload thô của đơn hàng cũ
-- --------------------------------------------------------------------------
--   Nạp máy:  node scripts/chay-migration.mjs them-chi-muc-don-payload.sql
--   Nạp mây:  node scripts/chay-migration.mjs them-chi-muc-don-payload.sql --remote
--
-- ĐO ĐƯỢC (wrangler d1 insights, 7 ngày tính tới 06/09/2026):
--   UPDATE don_hang SET du_lieu_json = NULL WHERE du_lieu_json IS NOT NULL ...
--   chạy 168 lần · mỗi lần đọc 18.228 dòng · tổng 3.062.401 lượt đọc
-- Đứng thứ ba trong danh sách ngốn hạn mức, chỉ sau hai câu của tác vụ bóc
-- dòng (đã vá ở them-chi-muc-tach-dong.sql).
--
-- VÌ SAO TỐN: câu lệnh trong donDepJsonDonHangCu (src/index.js) lọc bằng
--     WHERE du_lieu_json IS NOT NULL AND CAST(tao_luc_san AS INTEGER) < ?
-- Cả hai vế đều không dùng được chỉ mục nào đang có:
--   · `du_lieu_json IS NOT NULL` — không có chỉ mục trên cột này.
--   · `CAST(tao_luc_san AS INTEGER)` — bọc cột trong một phép biến đổi thì
--     chỉ mục thường trên `tao_luc_san` thành vô dụng: database buộc phải đọc
--     từng dòng, tính CAST, rồi mới so sánh được. Giống có mục lục sách nhưng
--     lại đòi dịch tên chương sang tiếng khác trước khi tra — đành đọc cả cuốn.
-- Nên mỗi lượt lịch nền lại quét trọn bảng đơn hàng, kể cả khi chẳng còn đơn
-- nào để dọn.
--
-- CÁCH VÁ: chỉ mục MỘT PHẦN đánh trên ĐÚNG BIỂU THỨC câu lệnh dùng.
--   · Phần `WHERE du_lieu_json IS NOT NULL` khiến chỉ mục chỉ chứa những đơn
--     CÒN payload. Dọn xong đơn nào thì đơn đó rời khỏi chỉ mục, nên chỉ mục
--     teo dần và tiến về rỗng — lúc đó câu lệnh gần như không tốn gì.
--   · Đánh theo `CAST(tao_luc_san AS INTEGER)` (SQLite cho phép chỉ mục trên
--     biểu thức) để vế so sánh thời gian cũng dùng được chỉ mục, không phải
--     tính lại từng dòng.
--
-- AN TOÀN: chỉ tạo chỉ mục, không đụng một dòng dữ liệu nào. Chạy lại nhiều
-- lần cũng không sao (IF NOT EXISTS).
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_don_hang_con_payload
  ON don_hang(CAST(tao_luc_san AS INTEGER))
  WHERE du_lieu_json IS NOT NULL;
