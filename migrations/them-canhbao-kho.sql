-- Cảnh báo chéo Kho ↔ Sàn: kho xác nhận đã nhận hàng hoàn, quá 12h chưa nhận thì bắn Telegram
ALTER TABLE don_hoan ADD COLUMN kho_nhan_luc TEXT;      -- thời điểm kho bấm "Đã nhận" (NULL = chưa nhận)
ALTER TABLE don_hoan ADD COLUMN kho_nhan_boi TEXT;      -- ai trong kho đã bấm nhận
ALTER TABLE don_hoan ADD COLUMN cho_kho_nhan_tu TEXT;   -- mốc bắt đầu đếm 12h (khi sàn báo khách đã gửi về)
ALTER TABLE don_hoan ADD COLUMN da_canh_bao INTEGER NOT NULL DEFAULT 0; -- đã bắn Telegram chưa (tránh spam)
