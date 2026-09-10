-- ==========================================================================
-- PHÓ GIÁM ĐỐC KIÊM NHIỆM — VỀ ĐÚNG HỘP BAN GIÁM ĐỐC
-- --------------------------------------------------------------------------
--   Nạp máy:  node scripts/chay-migration.mjs sua-cho-ngoi-pho-giam-doc.sql
--   Nạp mây:  node scripts/chay-migration.mjs sua-cho-ngoi-pho-giam-doc.sql --remote
--
-- Sếp Ngọc nói rõ 10/09/2026, nguyên văn:
--   "Tôi đang kiêm nhiệm, vừa trong ban giám đốc nhưng cũng là ng phụ trách
--    phòng hỗ trợ và vận hành"
--
-- HAI VAI, HAI Ô KHÁC NHAU — hệ thống có sẵn cả hai, đừng gộp:
--   · `nhan_su.phong_ban_id`      = người này THUỘC hộp nào  → Ban Giám đốc
--   · `phong_ban.phu_trach_id`    = ai TRỰC TIẾP PHỤ TRÁCH hộp đó → đã đúng
--
-- Ô phụ trách của Phòng Vận hành và Hỗ trợ ĐÃ trỏ đúng Bùi Thị Ngọc từ
-- `xep-lai-co-cau-2026-09.sql`, nên file này KHÔNG chạm tới nó. Chỉ sửa chỗ
-- ngồi, vì `xep-lai-co-cau` xếp Sếp vào chính cái Phòng mình phụ trách — đúng
-- theo chức vụ ghi trong hồ sơ lúc đó, nhưng sai theo cơ cấu Sếp ban hành:
-- Phó Giám đốc thuộc Ban Giám đốc.
--
-- MỘT DẤU HIỆU CHO THẤY ĐÚNG LÀ THẾ: ô chữ cũ `nhan_su.bo_phan` của Sếp đã
-- ghi "Ban Giám đốc" từ trước. Cột mới `phong_ban_id` mới là cột lệch, không
-- phải ô cũ.
--
-- ĐỔI GÌ, ĐO ĐƯỢC:
--   Ban Giám đốc            1 người thuộc thẳng → 2   (cả nhánh vẫn 24)
--   Phòng Vận hành và Hỗ trợ 1 người thuộc thẳng → 0   (cả nhánh 21 → 20)
--
-- KHÔNG xoá, KHÔNG thêm hàng nào. Một người, hai ô. Lùi lại: đặt
-- `phong_ban_id = 2` và trả `chuc_vu` về chuỗi cũ ghi ở dưới.
-- ==========================================================================

-- ---- ① Chỗ ngồi: về hộp Ban Giám đốc -------------------------------------
-- Ràng chặt bằng cả `id` lẫn tên, để lỡ chạy trên bản sao khác thì trượt chứ
-- không sửa nhầm người.
UPDATE nhan_su
   SET phong_ban_id = (SELECT id FROM phong_ban WHERE cap = 'cong_ty' AND hoat_dong = 1 LIMIT 1)
 WHERE id = 'ns_admin1'
   AND ho_ten = 'Bùi Thị Ngọc';

-- ---- ② Chức vụ: bỏ tên phòng đã không còn tồn tại ------------------------
-- Cũ: "Phó Giám đốc kiêm TP. Support" — "P. Support (Kế toán - Nhân sự -
-- Admin)" đã bị cơ cấu mới thay bằng Phòng Vận hành và Hỗ trợ, nên câu chức vụ
-- đang trỏ vào một cái phòng không còn nữa.
--
-- Mới ghi đúng hai vai Sếp vừa nói. Phần trước chữ " kiêm " vẫn là "Phó Giám
-- đốc" nguyên vẹn — đó là chỗ `laBanGiamDoc()` trong src/gopy-cua-duyet.js đọc
-- để miễn cửa duyệt góp ý, nên đổi câu này KHÔNG làm mất quyền miễn.
UPDATE nhan_su
   SET chuc_vu = 'Phó Giám đốc kiêm Phụ trách Phòng Vận hành và Hỗ trợ'
 WHERE id = 'ns_admin1'
   AND ho_ten = 'Bùi Thị Ngọc'
   AND chuc_vu = 'Phó Giám đốc kiêm TP. Support';

-- ---- ③ Ghi vết vào sổ sửa chung ------------------------------------------
-- Dùng lại `lich_su_thay_doi_nen` — không dựng bảng nhật ký thứ hai.
-- `WHERE EXISTS`: câu ① trượt thì sổ không kể chuyện chưa xảy ra.
INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten)
SELECT 'nhan_su', 'ns_admin1', 'phong_ban_id', '2',
       CAST((SELECT id FROM phong_ban WHERE cap = 'cong_ty' AND hoat_dong = 1 LIMIT 1) AS TEXT),
       'ns_admin1', 'Bùi Thị Ngọc'
 WHERE EXISTS (
   SELECT 1 FROM nhan_su n JOIN phong_ban p ON p.id = n.phong_ban_id
    WHERE n.id = 'ns_admin1' AND p.cap = 'cong_ty'
 )
   AND NOT EXISTS (
   SELECT 1 FROM lich_su_thay_doi_nen
    WHERE bang = 'nhan_su' AND ban_ghi_id = 'ns_admin1' AND truong = 'phong_ban_id'
 );
