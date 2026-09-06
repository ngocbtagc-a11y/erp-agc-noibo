-- ==========================================================================
-- MIGRATION — Chỉ mục cho việc bóc dòng hàng (vá sự cố hết hạn mức D1)
-- --------------------------------------------------------------------------
--   Nạp máy:  node scripts/chay-migration.mjs them-chi-muc-tach-dong.sql
--   Nạp mây:  node scripts/chay-migration.mjs them-chi-muc-tach-dong.sql --remote
--
-- (Chạy qua scripts/chay-migration.mjs chứ không gọi thẳng wrangler, để nó tự
--  ghi nhận vào schema_migrations — khỏi cảnh sau này không nhớ đã nạp chưa.)
--
-- CHUYỆN ĐÃ XẢY RA (06/09/2026): cả công ty không đăng nhập được vào ERP vì
-- database chạm trần 5 triệu lượt đọc/ngày của gói miễn phí. Hạn mức cạn thì
-- MỌI câu lệnh đọc đều bị chặn — kể cả câu tra tài khoản lúc đăng nhập.
--
-- Thủ phạm, theo `wrangler d1 insights`:
--   1.096 lần chạy  SELECT ... FROM don_hang WHERE da_tach_dong = 0
--                   → mỗi lần đọc trung bình 4.607 dòng → 5.050.064 dòng
--     196 lần chạy  SELECT COUNT(*) FROM don_hang WHERE da_tach_dong = 0
--                   → mỗi lần đọc 24.089 dòng           → 4.721.444 dòng
-- Cộng lại gần 10 triệu lượt đọc, chỉ từ một tác vụ bóc bù 21.736 đơn.
--
-- VÌ SAO TỐN THẾ: cột `da_tach_dong` sinh ra đúng để "chạy bù theo lô mà không
-- phải quét lại từ đầu" (xem them-donhang-dong.sql), nhưng lại chưa có chỉ mục.
-- Không có chỉ mục thì mỗi lần hỏi "còn đơn nào chưa bóc không" database phải
-- lật lần lượt cả 24.000 dòng — lô nào cũng lật lại từ đầu.
--
-- CHỈ MỤC MỘT PHẦN (partial index): chỉ ghi vào chỉ mục những đơn CHƯA bóc.
-- Bóc xong đơn nào thì đơn đó tự rời khỏi chỉ mục, nên bóc càng nhiều chỉ mục
-- càng nhỏ, tới khi hết việc thì nó gần như rỗng và câu lệnh trên gần như
-- không tốn gì. Chỉ mục thường (đánh cả 24.000 dòng) không có tính chất đó.
--
-- Cột tao_luc_san nằm trong chỉ mục để phần ORDER BY ... DESC cũng đọc thẳng
-- theo thứ tự có sẵn, khỏi phải xếp lại.
--
-- AN TOÀN: chỉ tạo chỉ mục, không đụng một dòng dữ liệu nào. Chạy lại nhiều
-- lần cũng không sao (IF NOT EXISTS).
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_don_hang_chua_tach
  ON don_hang(tao_luc_san DESC)
  WHERE da_tach_dong = 0;
