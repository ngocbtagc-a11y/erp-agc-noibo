-- ==========================================================================
-- Ô 2 — `tai_khoan.vi_tri_cong_viec` (TÁCH VAI TRÒ HỆ THỐNG KHỎI VỊ TRÍ)
-- --------------------------------------------------------------------------
-- Sếp Bùi Thị Ngọc chốt 04/09/2026, nguyên văn:
--   "gộp 2 vai trò như này ko biết phân quyền kiểu gì nhé, tách ra 2 vai trò đi"
--
-- Ô "Vai trò *" trên form Tạo tài khoản là MỘT danh sách thả xuống gộp hai
-- nhóm khác hẳn nhau — VAI TRÒ HỆ THỐNG (Admin · Admin backup · Người dùng)
-- và VỊ TRÍ CÔNG VIỆC (Kế toán trưởng · Quản lý kho · ...). Chọn được một,
-- nên ai cũng phải bỏ một nửa.
--
-- HẬU QUẢ THẬT, ĐO TRÊN CSDL BẢN THẬT NGÀY 04/09/2026 — 5/8 tài khoản đang
-- là `nguoi_dung`, tức là đã bỏ mất vị trí để giữ tài khoản thường:
--   Phạm Khương Duy   · TP. Kho Vận - Sản Xuất       → không mở được tab Kho vận
--   Phan Thị Hằng     · Trưởng nhóm Kế toán          → không mở được tab Kế toán
--   Nguyễn Thị Huyền  · NV Vận hành TMĐT             → không mở được tab Kinh doanh
--   Vũ Lan Hương      · NV Chăm sóc Khách hàng       → không mở được tab Kinh doanh
--   Đinh Mạnh Linh    · Nhân viên Kho Vận            → không mở được tab Kho vận
--
-- SAU MIGRATION NÀY: hai ô. `vai_tro` giữ ô 1, `vi_tri_cong_viec` là ô 2,
-- quyền cuối cùng = HỢP của hai ô (src/quyen.js, khối "HAI Ô").
--
-- ⚠️ FILE NÀY KHÔNG TỰ Ý MỞ THÊM QUYỀN CHO AI.
-- Bước 2 chỉ CHUYỂN CHỖ CẤT của các vai trò thuộc nhóm vị trí: một dòng đang
-- là `vai_tro='quan_ly_kho'` thành `vai_tro='nguoi_dung'` +
-- `vi_tri_cong_viec='quan_ly_kho'`. Vì bộ tab của `nguoi_dung` là TẬP CON bộ
-- tab của MỌI vị trí công việc, và cả ba cờ (xem_luong/admin/them_nhan_su)
-- của `nguoi_dung` đều false, nên `nguoi_dung ∪ <vị trí>` = ĐÚNG BẰNG
-- `<vị trí>` một mình. Không ai được thêm, không ai mất.
-- Bàn đo `node scripts/do-tach-vai-tro.mjs` chốt lại điều này cho cả 10 vai
-- trò và cho từng tài khoản đang có (mục "TRƯỚC = SAU").
--
-- 5 người ở bảng trên KHÔNG được đụng tới ở đây: họ đang là `nguoi_dung`
-- thật, migration để nguyên `nguoi_dung` + ô 2 trống. Gán vị trí cho họ là
-- BUSINESS POLICY — chỉ Sếp Ngọc quyết, lệnh riêng nằm trong CHANGELOG.
--
-- Chạy:  node scripts/chay-migration.mjs them-vi-tri-cong-viec.sql
--        node scripts/chay-migration.mjs them-vi-tri-cong-viec.sql --remote
--
-- THỨ TỰ TRIỂN KHAI: DB TRƯỚC, CODE SAU (REV-0018 mục 6). Mã mới VẪN SỐNG
-- được khi chưa có cột (src/auth.js docPhien bỏ cột thiếu rồi chạy lại, không
-- ném 500) — nhưng lúc đó ô 2 chưa có tác dụng, anh Duy vẫn chưa vào được
-- tab Kho vận. Nạp file này TRƯỚC khi gộp nhánh.
-- ==========================================================================

-- Chốt chặn chạy lại — schema_migrations.filename là PRIMARY KEY, chạy lần 2
-- dừng ngay tại đây, trước khi chạm vào bảng nào (ALTER TABLE ADD COLUMN lần
-- 2 sẽ ném "duplicate column name" và làm hỏng cả file).
INSERT INTO schema_migrations (filename) VALUES ('them-vi-tri-cong-viec.sql');

-- ---- 1. Ô 2 --------------------------------------------------------------
-- NULL = chưa gán vị trí công việc (hợp lệ, và là mặc định cố ý: thà chặn
-- nhầm còn hơn mở nhầm — đúng khuôn KHONG_QUYEN của src/quyen.js).
-- Không đặt NOT NULL: một tài khoản Admin thuần không cần vị trí nào.
ALTER TABLE tai_khoan ADD COLUMN vi_tri_cong_viec TEXT;

-- ---- 2. Chuyển chỗ cất cho các vai trò thuộc NHÓM VỊ TRÍ ------------------
-- Danh sách này phải khớp `VI_TRI_CONG_VIEC` trong src/quyen.js. Bàn đo
-- do-tach-vai-tro.mjs so hai danh sách và ĐỎ nếu lệch — thêm vị trí mới mà
-- quên sửa một trong hai chỗ là bị bắt ngay.
UPDATE tai_khoan
   SET vi_tri_cong_viec = vai_tro,
       vai_tro          = 'nguoi_dung'
 WHERE vai_tro IN ('ke_toan_truong', 'quan_ly_kho', 'nhan_vien_kho',
                   'hcns', 'van_hanh_san', 'cskh', 'nv_test');

-- ---- 3. Chỉ mục ----------------------------------------------------------
-- Màn Quản trị lọc theo vị trí, và src/nhac-nhan-su.js tìm người mang vị trí
-- `hcns` mỗi lần chạy cron nhắc việc.
CREATE INDEX IF NOT EXISTS idx_taikhoan_vitri ON tai_khoan (vi_tri_cong_viec);
