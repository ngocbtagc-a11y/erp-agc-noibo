-- ==========================================================================
-- MIGRATION — LÝ DO SỬA + CHỐT ĐỔI CAM KẾT · CTL-0017
-- --------------------------------------------------------------------------
-- VẤN ĐỀ GỐC (Sếp Ngọc nêu HAI lần): "việc giao xong không sửa được", rồi
-- "mục tiêu đã giao không sửa được nữa kìa". Lớp vấn đề: TẠO XONG LÀ ĐÓNG
-- BĂNG — gõ nhầm một chữ cũng phải huỷ đi làm lại, mất lịch sử, người nhận
-- ăn hai thông báo.
--
-- KHÔNG ĐẺ BẢNG MỚI. `lich_su_thay_doi_nen` (them-khoa-danhmuc-nen.sql) đã
-- có SẴN đúng khuôn cần: (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
-- nguoi_id, nguoi_ten, luc). `ban_ghi_id` là TEXT nên nhận cả id chuỗi lẫn
-- id số. Dựng thêm `cong_viec_lich_su` + `muc_tieu_lich_su` là hai bảng cho
-- đúng một nhu cầu, và bảng thứ ba sẽ tới khi tài sản cần — nên bảng này từ
-- nay là SỔ SỬA CHUNG của cả ERP, không riêng dữ liệu nền.
-- Nới đúng một cột, không đụng một dòng dữ liệu cũ nào.
--
-- ⚠️ CHỐT NẰM Ở CSDL, KHÔNG CHỈ Ở MÃ.
-- ERP vừa lên tính năng nhắc việc quá hạn (SPEC-0004). Cho dời hạn chót
-- không dấu vết thì ai cũng dời hạn để KHỎI BỊ NHẮC — và mọi con số "đúng
-- hạn" thành vô nghĩa trong đúng một tuần, phá thẳng gốc của cách quản MBOs.
-- Chốt trong `src/index.js` là đủ cho HÔM NAY; nhưng đường ghi viết thêm
-- sáu tháng nữa sẽ KHÔNG tự nhớ luật này. CSDL thì nhớ.
-- Dùng TRIGGER chứ không dùng CHECK vì SQLite không thêm được CHECK bằng
-- ALTER — phải dựng lại cả bảng, mà bảng này đang có dữ liệu thật.
-- Có tiền lệ trong repo: `trg_don_hang_lich_su` (them-lichsu-donhang-donhoan).
--
--   Nạp máy:  node scripts/chay-migration.mjs migrations/them-ly-do-sua.sql
--   Nạp mây:  node scripts/chay-migration.mjs migrations/them-ly-do-sua.sql --remote
--
-- Chạy lần hai báo "duplicate column name: ly_do" tức là ĐÃ CHẠY RỒI, không
-- phải hỏng (giống them-muctieu.sql đang dùng cùng lối này).
-- ==========================================================================

ALTER TABLE lich_su_thay_doi_nen ADD COLUMN ly_do TEXT;

-- ĐỔI CAM KẾT THÌ PHẢI NÓI VÌ SAO — chốt cứng, không đường vòng.
-- `length(trim(...)) < 5` chặn luôn kiểu lý do cho có: "x", ".", "   ".
-- Danh sách trường ở đây là các trường CAM KẾT:
--   han_chot      — đổi hạn là đổi lời hứa thời gian, và là đúng cái mà
--                   SPEC-0004 đang dùng để chấm đúng hạn/quá hạn.
--   nguoi_nhan_id — đổi người nhận là đổi NGƯỜI CHỊU TRÁCH NHIỆM.
CREATE TRIGGER IF NOT EXISTS trg_doi_cam_ket_phai_co_ly_do
BEFORE INSERT ON lich_su_thay_doi_nen
FOR EACH ROW
WHEN NEW.truong IN ('han_chot', 'nguoi_nhan_id')
 AND (NEW.ly_do IS NULL OR length(trim(NEW.ly_do)) < 5)
BEGIN
  SELECT RAISE(ABORT, 'Doi han chot / nguoi nhan bat buoc phai ghi ly do');
END;

-- Đọc lịch sử sửa của MỘT bản ghi là đường đi nóng nhất (mở thẻ việc ra xem).
-- Chỉ mục cũ `idx_lstdn_bang_banghi` không có `luc` nên vẫn phải sắp xếp tay.
CREATE INDEX IF NOT EXISTS idx_lstdn_doc
  ON lich_su_thay_doi_nen (bang, ban_ghi_id, luc DESC);
