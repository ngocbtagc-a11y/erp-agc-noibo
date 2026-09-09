-- ===========================================================================
-- PHÒNG BAN CÓ THỨ TỰ VÀ CẤP CHA
-- ---------------------------------------------------------------------------
-- Sếp Ngọc 06/09/2026: "kéo thả là cho phép thiết kế lại sơ đồ tổ chức, tên
-- phòng ban..."
--
-- Bảng cũ phẳng tuyệt đối: chỉ có tên và trưởng phòng. Muốn kéo thả thiết kế
-- lại thì phải lưu được HAI thứ mà bảng chưa có:
--   · thu_tu — phòng nào đứng trước phòng nào. Không có nó thì kéo xong tải lại
--     trang là mọi thứ về như cũ, và người dùng nghĩ tính năng hỏng.
--   · cha_id — phòng này trực thuộc phòng nào. Đây là thứ biến một hàng hộp
--     phẳng thành SƠ ĐỒ thật: Ban Giám đốc ở trên, các phòng nằm dưới.
--
-- cha_id để NULL = phòng cấp cao nhất. KHÔNG dùng 0 làm "không có cha": 0 là
-- một id hợp lệ về mặt kiểu dữ liệu, và sớm muộn có người tra nhầm.
-- ===========================================================================
ALTER TABLE phong_ban ADD COLUMN thu_tu INTEGER;
ALTER TABLE phong_ban ADD COLUMN cha_id INTEGER REFERENCES phong_ban(id);

-- Thứ tự ban đầu = thứ tự id, để sơ đồ hiện y như trước khi có tính năng này.
UPDATE phong_ban SET thu_tu = id WHERE thu_tu IS NULL;

-- Truy vấn sơ đồ luôn lọc theo cha_id rồi sắp theo thu_tu — chỉ mục theo đúng
-- cặp đó để khỏi quét cả bảng mỗi lần mở tab.
CREATE INDEX IF NOT EXISTS ix_pb_cay ON phong_ban(cha_id, thu_tu);
