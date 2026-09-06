-- ===========================================================================
-- KẾ HOẠCH THI CÔNG DO TRƯỞNG PHÒNG IT SOẠN
-- ---------------------------------------------------------------------------
-- Sếp Ngọc chốt 06/09/2026: phiếu đã duyệt thì Tuấn (TP IT) tự soạn kế hoạch
-- triển khai, để khi người bắt tay vào làm thì phần suy nghĩ đã xong.
--
-- TÁCH RIÊNG KHỎI de_xuat_spec, không ghi đè:
-- de_xuat_spec là ĐẶC TẢ của Hồ Ly — vấn đề là gì, đạt thế nào thì xong.
-- ke_hoach_thi_cong là CÁCH LÀM của Tuấn — làm theo thứ tự nào, hỏng ở đâu.
-- Hai thứ khác nhau và người đọc cần cả hai; gộp một cột thì cái sau đè cái
-- trước, và không ai biết đã mất gì.
-- ===========================================================================
ALTER TABLE gop_y ADD COLUMN ke_hoach_thi_cong TEXT;
ALTER TABLE gop_y ADD COLUMN ke_hoach_luc TEXT;
