-- ==========================================================================
-- MIGRATION — SPEC-0004: Trạm Mục Tiêu chủ động nhắc việc
--   Nạp máy:  node scripts/chay-migration.mjs migrations/them-congviec-nhacviec.sql --local
--   Nạp mây:  node scripts/chay-migration.mjs migrations/them-congviec-nhacviec.sql --remote
--
-- CHỈ `ADD COLUMN` và `CREATE INDEX`. Không DROP, không UPDATE, không chạm
-- một dòng dữ liệu nghiệp vụ nào → lùi được: revert code là xong, hai cột
-- dưới nằm im, không bảng nào tham chiếu tới chúng.
-- ==========================================================================

-- ---- ① Mốc NGƯỜI LÀM NỘP, tách khỏi mốc NGƯỜI DUYỆT BẤM -------------------
-- `cap_nhat_luc` là lúc bản ghi bị sửa LẦN CUỐI — khi việc thành 'hoan_thanh'
-- thì đó là lúc NGƯỜI GIAO bấm duyệt, không phải lúc người làm nộp. Chấm
-- "đúng hạn" bằng nó sẽ ghi nhận SAI NGƯỜI:
--     nhân viên nộp đúng hạn 29/08, quản lý bận tới 31/08 mới duyệt
--     → hệ thống ghi "nhân viên trễ 2 ngày".
-- `nop_luc` là sự thật riêng, không suy ra được từ cột nào đang có.
-- Ghi ở đúng MỘT chỗ: cvCapNhat() nhánh dang_lam -> cho_duyet.
-- Trả lại làm tiếp (cho_duyet -> dang_lam) thì XOÁ về NULL — việc chưa xong
-- thì lần nộp cũ không còn là sự thật nữa.
ALTER TABLE cong_viec ADD COLUMN nop_luc TEXT;

-- ---- ② Người dùng tự tắt nhắc việc ---------------------------------------
-- Nghe như tự phá hệ thống, nhưng ngược lại: KHÔNG cho tắt trong ứng dụng thì
-- người ta tắt chuông ở tầng điện thoại, và lúc đó không ai biết gì cả. Tắt
-- trong ERP thì Sếp còn nhìn thấy ai đã tắt và còn hỏi được vì sao.
-- QUAN TRỌNG: tắt nhắc KHÔNG tắt trách nhiệm — việc của người đã tắt VẪN leo
-- cấp lên quản lý và VẪN vào bản tin tuần của Sếp.
ALTER TABLE tai_khoan ADD COLUMN nhac_viec_tat INTEGER NOT NULL DEFAULT 0;

-- ---- ③ Chỉ mục cho vòng quét nhắc việc ------------------------------------
-- Vòng quét lọc theo (trang_thai, han_chot). Hai chỉ mục cũ
-- (nguoi_nhan_id, trang_thai) / (nguoi_giao_id, trang_thai) không phục vụ
-- được câu quét toàn cục vì không có tiền tố trang_thai đứng đầu.
CREATE INDEX IF NOT EXISTS idx_cong_viec_nhac ON cong_viec (trang_thai, han_chot);
