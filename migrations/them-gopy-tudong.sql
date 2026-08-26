-- Hồ Ly tự động TRIAGE góp ý mới bằng Workers AI (Cloudflare, đã bind sẵn
-- [ai], 0 credential mới — Sếp Ngọc chốt 26/08/2026 dùng bản miễn phí thay
-- Claude API thật). Chạy trong lịch cron */5 phút đã có sẵn.
--
-- CHẾ ĐỘ NHÁP (shadow mode) — CHỈ ĐỀ XUẤT, KHÔNG tự chuyển trạng thái thật.
-- Admin xem đề xuất ở màn Chi tiết, bấm "Áp dụng đề xuất" chỉ ĐIỀN SẴN form
-- triage có sẵn — vẫn phải bấm "Lưu" thật (đúng API gopYDoiTrangThai(), có
-- backend enforce quyền) mới thật sự đổi. AI không có đường tắt tự ghi
-- thẳng vào trang_thai thật.
ALTER TABLE gop_y ADD COLUMN de_xuat_loai TEXT;
ALTER TABLE gop_y ADD COLUMN de_xuat_risk TEXT;              -- LOW | MEDIUM | HIGH
ALTER TABLE gop_y ADD COLUMN de_xuat_trang_thai TEXT;
ALTER TABLE gop_y ADD COLUMN de_xuat_ly_do TEXT;             -- vì sao đánh giá risk này
ALTER TABLE gop_y ADD COLUMN de_xuat_spec TEXT;              -- nháp Feature Spec
ALTER TABLE gop_y ADD COLUMN tu_dong_xu_luc TEXT;            -- đánh dấu đã xử lý, tránh cron quét lặp lại
