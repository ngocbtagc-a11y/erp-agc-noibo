-- Số sao tặng kèm mỗi lần vinh danh — trước đây cố định +1, giờ Sếp chọn
-- được số lượng (Sếp Ngọc yêu cầu 20/08/2026).
ALTER TABLE vinh_danh ADD COLUMN so_sao INTEGER NOT NULL DEFAULT 1;
