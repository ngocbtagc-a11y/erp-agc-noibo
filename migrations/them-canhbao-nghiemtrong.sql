-- Đánh dấu đã cảnh báo cho đơn hoàn có lý do NGHIÊM TRỌNG (nghi hàng giả/
-- nhái hoặc hộp hàng rỗng) — tránh gửi thông báo lặp lại mỗi 5 phút cho
-- cùng 1 đơn (Sếp Ngọc yêu cầu 20/08/2026).
ALTER TABLE don_hoan ADD COLUMN da_canh_bao_nghiem_trong INTEGER NOT NULL DEFAULT 0;
