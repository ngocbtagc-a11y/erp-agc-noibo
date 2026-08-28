-- ==========================================================================
-- MIGRATION — VÁ REV-0019 (L2 · L6) cho SPEC-0004 "Trạm Mục Tiêu nhắc việc"
--   Nạp máy:  node scripts/chay-migration.mjs va-nhacviec-rev0019.sql --local
--   Nạp mây:  node scripts/chay-migration.mjs va-nhacviec-rev0019.sql --remote
--
-- File RIÊNG, không sửa `them-congviec-nhacviec.sql` — file kia có thể đã nạp
-- rồi, và tách ra thì bàn thử dựng được ca ĐỐI CHỨNG "chưa vá" bằng cách bỏ
-- đúng một file (BH-16).
-- CHỈ `ADD COLUMN` + `CREATE TRIGGER` + `CREATE UNIQUE INDEX`. Câu DELETE duy
-- nhất chỉ đụng thông báo nhắc việc TRÙNG NHAU trong cùng một ngày, không
-- chạm một dòng dữ liệu nghiệp vụ nào.
-- ==========================================================================

-- ---- ① L2: mốc "NGƯỜI NÀY cầm việc từ lúc nào" ---------------------------
-- Hồ Ly đo được (REV-0019): chuyển một việc đang trễ sang người khác thì
-- NGƯỜI MỚI bị máy réo "trễ 9 ngày" ngay hôm đầu. Đúng họ nhân của lỗi mà
-- `nop_luc` sinh ra để tránh: ĐỔ LỖI SAI NGƯỜI. Sếp Ngọc quản theo MBOs —
-- báo sai người là hỏng lòng tin vào cả hệ thống, và Q3/2026 đang là lúc
-- chuyển nhân sự HKĐ lên công ty nên việc bị chuyền tay nhiều nhất.
--
-- Cột này KHÔNG suy ra được từ cột nào đang có: `cap_nhat_luc` đổi theo MỌI
-- lần sửa trạng thái, `tao_luc` là lúc giao cho NGƯỜI ĐẦU TIÊN.
ALTER TABLE cong_viec ADD COLUMN nhan_viec_luc TEXT;

-- KHÔNG backfill: việc chưa từng đổi người thì cột này NULL và mã nguồn rơi
-- về `tao_luc` (đúng nghĩa "cầm việc từ lúc được giao"). Không UPDATE = không
-- đụng dữ liệu cũ = lùi được bằng revert code.

-- TRIGGER thay vì sửa một endpoint: hôm nay ERP KHÔNG có đường nào đổi
-- `nguoi_nhan_id` (chỉ `trang_thai`/`ket_qua`), nên việc chuyển tay hiện được
-- làm bằng `wrangler d1 execute` chạy tay. Vá ở tầng code sẽ trượt đúng con
-- đường thật đang dùng. Trigger đứng ở DB nên AI đổi người cũng bị đóng dấu:
-- app, lệnh chạy tay, hay nhập liệu hàng loạt.
-- Không đệ quy: `AFTER UPDATE OF nguoi_nhan_id` chỉ nổ khi cột đó nằm trong
-- mệnh đề SET, mà câu UPDATE bên trong trigger không đụng tới nó.
CREATE TRIGGER IF NOT EXISTS trg_cong_viec_doi_nguoi_nhan
AFTER UPDATE OF nguoi_nhan_id ON cong_viec
FOR EACH ROW WHEN OLD.nguoi_nhan_id <> NEW.nguoi_nhan_id
BEGIN
  UPDATE cong_viec SET nhan_viec_luc = datetime('now', '+7 hours') WHERE id = NEW.id;
END;

-- ---- ② L6: hai lượt cron CHỒNG NHAU nhân đôi tin --------------------------
-- Chống trùng đang là "đọc bảng thong_bao rồi mới ghi" — không có khoá. Hai
-- lượt cron chồng nhau cùng đọc thấy "hôm nay chưa nhắc" rồi cùng ghi → 2 tin
-- cho một người trong một ngày. Đo được 4 tin/người với 4 lượt song song.
-- Vá ĐÚNG CHỖ: để DB giữ ràng buộc thay vì để mã nguồn tự giữ. Lượt thứ hai
-- INSERT trượt, `guiThongBao` nuốt lỗi êm và trả về false → không tin thừa,
-- không dòng đếm sai.
-- Dọn trùng cũ trước khi tạo chỉ mục DUY NHẤT — chỉ đụng 3 loại tin nhắc việc
-- của chính SPEC-0004, giữ lại bản ghi ĐẦU TIÊN của mỗi (loại, người, ngày).
DELETE FROM thong_bao
 WHERE loai IN ('cv_ban_tin', 'cv_leo_cap', 'cv_ban_tin_tuan')
   AND id NOT IN (
     SELECT MIN(id) FROM thong_bao
      WHERE loai IN ('cv_ban_tin', 'cv_leo_cap', 'cv_ban_tin_tuan')
      GROUP BY loai, nguoi_nhan_id, substr(tao_luc, 1, 10)
   );

-- `substr(tao_luc,1,10)` chứ không `date(tao_luc)`: biểu thức trong chỉ mục
-- bắt buộc phải TẤT ĐỊNH, `substr` chắc chắn tất định.
CREATE UNIQUE INDEX IF NOT EXISTS ux_thong_bao_nhac_viec_ngay
  ON thong_bao (loai, nguoi_nhan_id, substr(tao_luc, 1, 10))
  WHERE loai IN ('cv_ban_tin', 'cv_leo_cap', 'cv_ban_tin_tuan');

-- ---- ③ L3: tin "hạn chót gõ nhầm" chỉ được gửi ĐÚNG MỘT LẦN --------------
-- Khác 3 loại trên: khoá chống trùng KHÔNG theo ngày mà theo CHÍNH VIỆC ĐÓ.
-- Theo ngày thì mai lại réo tiếp, đúng thứ L3 đang phàn nàn.
CREATE UNIQUE INDEX IF NOT EXISTS ux_thong_bao_han_chot_sai
  ON thong_bao (loai, nguoi_nhan_id, lien_ket)
  WHERE loai = 'cv_han_chot_sai';
