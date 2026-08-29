-- ============================================================================
-- SỢI DÂY GIỮA GÓP Ý VÀ BẢN VÁ ĐÃ LÊN HỆ THỐNG THẬT
-- ---------------------------------------------------------------------------
-- Vấn đề: góp ý → duyệt → xây → soi → đẩy lên… rồi HẾT. Không ai quay lại đổi
-- trạng thái, nên người báo lỗi không bao giờ biết lỗi của mình đã sửa xong.
-- Sếp Ngọc 28/08/2026: "lỗi nào đã làm xong thì hiện đã xong đi chứ".
--
-- CHỈ ALTER TABLE ADD COLUMN — không bảng mới, không đổi kiểu cột nào, không
-- đụng dữ liệu cũ. Mọi cột mặc định NULL/0 nên bản ghi cũ đọc y hệt trước đây.
-- Lùi: migrations/lui-gopy-da-len-that.sql
-- ============================================================================

-- Commit ĐÃ LÊN THẬT đóng góp ý này. Ghi bằng SHA đầy đủ để đối chiếu được
-- với git, khác `bang_chung_url` (link người dán tay, có thể là link PR).
ALTER TABLE gop_y ADD COLUMN deploy_sha TEXT;

-- Lúc bản deploy chứa commit đó chạy xong (giờ VN).
ALTER TABLE gop_y ADD COLUMN deploy_luc TEXT;

-- ⚠️ CỜ AN TOÀN. =1 nghĩa là: máy THẤY một commit khai đã sửa góp ý này,
-- NHƯNG góp ý đang ở một chỗ mà máy KHÔNG được phép tự đẩy đi (chưa qua cổng
-- duyệt, đang bị chặn…). Máy KHÔNG đổi trang_thai, chỉ dựng cờ để Sếp nhìn
-- thấy và tự quyết. Đoán sai thì hỏng theo chiều an toàn: thà để nguyên chờ
-- người xác nhận, còn hơn đánh dấu xong nhầm.
ALTER TABLE gop_y ADD COLUMN deploy_cho_xac_nhan INTEGER NOT NULL DEFAULT 0;

-- Một câu tóm tắt "đã sửa gì" — lấy từ tiêu đề commit, để nhắn cho người gửi
-- và hiện trên màn hình. Không bắt ai phải mở GitHub mới hiểu.
ALTER TABLE gop_y ADD COLUMN deploy_tom_tat TEXT;

-- 🔒 CHỐT "ĐÚNG MỘT TIN". Đã báo cho người gửi lúc nào. Mỗi lần đẩy lên main
-- là một lần deploy; không có cột này thì cùng một góp ý bị nhắn lại mỗi lượt.
-- Có cột này thì báo đúng 1 lần, dù deploy chạy lại bao nhiêu lần.
ALTER TABLE gop_y ADD COLUMN bao_da_len_luc TEXT;

-- Cách góp ý này được đóng: 'code' (có bản vá) · 'huong_dan' (trả lời bằng
-- hướng dẫn, không sửa code) · 'khong_lam' (từ chối/không làm). Nhờ nó mà
-- "Hoàn thành" không phải lúc nào cũng đòi link Pull Request — có góp ý đúng
-- là không cần một dòng code nào.
ALTER TABLE gop_y ADD COLUMN dong_kieu TEXT;

-- Panel "Đã lên hệ thống — chờ Sếp xác nhận" đọc bằng chỉ mục này.
CREATE INDEX IF NOT EXISTS idx_gopy_choxacnhan ON gop_y (deploy_cho_xac_nhan);
