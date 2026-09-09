-- ===========================================================================
-- XẾP LẠI CƠ CẤU TỔ CHỨC THEO BẢN SẾP BAN HÀNH 09/09/2026
-- ---------------------------------------------------------------------------
-- ⚠️ FILE NÀY ĐỔI HỒ SƠ NHÂN SỰ THẬT CỦA 24 NGƯỜI ĐANG LÀM.
--    Sếp Ngọc ĐỌC TỪNG DÒNG rồi mới chạy. Mỗi người MỘT dòng, có tên đầy đủ
--    trong chú thích. KHÔNG có vòng lặp, KHÔNG có `WHERE phong_ban_id = 4`
--    quét cả nhóm — một câu quét nhóm là một câu không ai kiểm được.
--
-- CHẠY SAU `them-phongban-ba-tang.sql`. Chạy trước là hỏng ngay ở dòng đầu
-- (chưa có cột `cap`).
--
-- ---------------------------------------------------------------------------
-- KHÔNG XOÁ HÀNG NÀO. CẢ 4 PHÒNG CŨ ĐỀU ĐƯỢC DÙNG LẠI
-- ---------------------------------------------------------------------------
-- Đã quét toàn bộ tham chiếu tới `phong_ban.id` trong lược đồ (09/09/2026):
--     nhan_su.phong_ban_id        — 22 hàng ĐANG TRỎ
--     tai_san.phong_ban_id        — 0 hàng
--     ca_mo.phong_ban_id          — 0 hàng
--     lich_lam_viec.phong_ban_id  — 0 hàng
--     allocation_runs.phong_ban_id— 0 hàng
-- Xoá một hàng `phong_ban` là bỏ bom hẹn giờ vào 22 hồ sơ nhân sự và vào mọi
-- bảng sinh sau. Nên bốn hàng cũ được ĐỔI TÊN + XẾP LẠI, giữ nguyên id:
--
--   id 1  "Ban Giám đốc"                        → giữ tên, thành cấp CÔNG TY
--   id 2  "P. Support (Kế toán - Nhân sự…)"     → "Phòng Vận hành và Hỗ trợ"
--   id 3  "P. Kinh Doanh - MKT"                 → "Phòng Kinh doanh và Phát
--                                                  triển thị trường"
--   id 4  "P. Kho Vận - Sản Xuất"               → "Nhóm Kho vận – Sản xuất",
--                                                  HẠ xuống cấp NHÓM dưới id 2
--
-- id 4 hạ cấp thay vì lập nhóm mới là chỗ ĐẮT NHẤT của file này: 17 người kho
-- vận GIỮ NGUYÊN `phong_ban_id = 4`, nên không một hồ sơ nào phải chuyển, và
-- mọi dữ liệu lịch sử trỏ vào id 4 vẫn trỏ đúng chỗ nó vẫn luôn trỏ.
--
-- Bốn hàng THÊM MỚI (id 5–8) đặt id ĐÍCH DANH, không để SQLite tự sinh: các
-- câu lệnh xếp người bên dưới phải gọi tên được số phòng, mà `last_insert_id`
-- thì không đọc được bằng mắt. id lớn nhất đang có là 4 — nếu ai đó đã chèn
-- tay id 5 thì câu INSERT này BÁO LỖI VÀ DỪNG, đúng ý muốn: thà dừng còn hơn
-- ghi đè nhầm một phòng có thật.
-- ===========================================================================


-- ═══ PHẦN 1 — BỐN HÀNG CŨ: ĐỔI TÊN, XẾP LẠI CẤP ═══════════════════════════

-- id 1 · Cấp CÔNG TY. Hộp trên cùng của sơ đồ.
--        Người trực tiếp phụ trách = Giám đốc Nguyễn Duy Phong (ns_admin2).
UPDATE phong_ban SET
  ten          = 'Ban Giám đốc',
  cap          = 'cong_ty',
  cha_id       = NULL,
  thu_tu       = 1,
  phu_trach_id = 'ns_admin2',
  truong_phong_id = 'ns_admin2',
  mo_ta        = 'Điều hành hoạt động kinh doanh hằng ngày của Công ty'
WHERE id = 1;

-- id 3 · PHÒNG KINH DOANH VÀ PHÁT TRIỂN THỊ TRƯỜNG.
--        "Giám đốc trực tiếp phụ trách" → `phu_trach_id` = ns_admin2.
--        `truong_phong_id` về NULL: phòng này KHÔNG có trưởng phòng, chính
--        Giám đốc lo. Để nguyên ns_admin2 ở ô trưởng phòng là in sai chức
--        danh lên sơ đồ và làm ô đếm "phòng chưa có trưởng" nói dối.
UPDATE phong_ban SET
  ten          = 'Phòng Kinh doanh và Phát triển thị trường',
  cap          = 'phong',
  cha_id       = 1,
  thu_tu       = 1,
  phu_trach_id = 'ns_admin2',
  truong_phong_id = NULL,
  mo_ta        = NULL
WHERE id = 3;

-- id 2 · PHÒNG VẬN HÀNH VÀ HỖ TRỢ.
--        "Phó Giám đốc trực tiếp phụ trách" → `phu_trach_id` = ns_admin1
--        (Bùi Thị Ngọc). Cũng bỏ `truong_phong_id`, cùng lý do với id 3.
UPDATE phong_ban SET
  ten          = 'Phòng Vận hành và Hỗ trợ',
  cap          = 'phong',
  cha_id       = 1,
  thu_tu       = 2,
  phu_trach_id = 'ns_admin1',
  truong_phong_id = NULL,
  mo_ta        = NULL
WHERE id = 2;

-- id 4 · NHÓM KHO VẬN – SẢN XUẤT. Hạ từ cấp Phòng xuống cấp Nhóm, về dưới
--        Phòng Vận hành và Hỗ trợ. Trưởng nhóm Phạm Khương Duy giữ nguyên.
UPDATE phong_ban SET
  ten          = 'Nhóm Kho vận – Sản xuất',
  cap          = 'nhom',
  cha_id       = 2,
  thu_tu       = 3,
  phu_trach_id = NULL,
  truong_phong_id = 'ns_b8e66305-845',
  mo_ta        = 'Kho - Đơn hàng · Đóng gói - Vận chuyển'
WHERE id = 4;


-- ═══ PHẦN 2 — BỐN NHÓM MỚI ════════════════════════════════════════════════
-- `mo_ta` chép ĐÚNG NGUYÊN VĂN hai dòng chức năng trong bản Sếp ban hành.
-- `truong_phong_id` chỉ điền chỗ Sếp đã chỉ đích danh người; ba nhóm còn lại
-- để NULL và sơ đồ sẽ đếm chúng vào ô "chưa có trưởng nhóm" — đó là việc chờ
-- Sếp quyết, không phải chỗ để đoán.

INSERT INTO phong_ban (id, ten, hoat_dong, trang_thai, cap, cha_id, thu_tu, truong_phong_id, phu_trach_id, mo_ta) VALUES
  (5, 'Nhóm Marketing – Bán hàng',              1, 'nhap', 'nhom', 3, 1, NULL,            NULL, 'Marketing - Booking · Kênh bán'),
  (6, 'Nhóm CSKH và Phát triển nguồn cung ứng', 1, 'nhap', 'nhom', 3, 2, NULL,            NULL, 'CSKH - Sản phẩm · Nhà cung cấp'),
  (7, 'Nhóm Kế toán – Tài chính',               1, 'nhap', 'nhom', 2, 1, 'ns_nv010014',   NULL, 'Kế toán - Thuế · Tài chính - Dòng tiền'),
  (8, 'Nhóm HCNS – Admin',                      1, 'nhap', 'nhom', 2, 2, NULL,            NULL, 'Nhân sự - Hành chính · Văn thư');


-- ═══ PHẦN 3 — XẾP 24 NGƯỜI ĐANG LÀM ═══════════════════════════════════════
-- Mỗi người MỘT dòng, ghi rõ tên. Dòng nào không đổi gì cũng vẫn viết ra: file
-- này là BẢN GHI ĐẦY ĐỦ của cơ cấu mới, đọc hết 24 dòng là biết chắc không ai
-- bị bỏ quên. Đây cũng là lý do không dùng vòng lặp: vòng lặp giấu mất người.
--
-- Số phòng dùng ở đây:
--   1 = Ban Giám đốc (công ty)          5 = Nhóm Marketing – Bán hàng
--   2 = Phòng Vận hành và Hỗ trợ        6 = Nhóm CSKH và PT nguồn cung ứng
--   3 = Phòng Kinh doanh và PT thị trường
--   4 = Nhóm Kho vận – Sản xuất         7 = Nhóm Kế toán – Tài chính
--                                       8 = Nhóm HCNS – Admin

-- ── Ban Giám đốc ──────────────────────────────────────────────────────────
-- Nguyễn Duy Phong — Giám đốc. Không có ai quản lý bên trên: `quan_ly_id`
-- NULL là ĐÚNG, đây là đỉnh cây.
UPDATE nhan_su SET phong_ban_id = 1, quan_ly_id = NULL          WHERE id = 'ns_admin2';

-- Bùi Thị Ngọc — Phó Giám đốc, trực tiếp phụ trách Phòng Vận hành và Hỗ trợ,
-- nên hồ sơ của Sếp nằm ở CHÍNH phòng đó (id 2), không nằm ở Ban Giám đốc.
UPDATE nhan_su SET phong_ban_id = 2, quan_ly_id = 'ns_admin2'   WHERE id = 'ns_admin1';

-- ── Phòng Kinh doanh và Phát triển thị trường ─────────────────────────────
-- Nguyễn Thị Huyền — NV Vận hành TMĐT (Shopee/TikTok = kênh bán).
-- TRƯỚC BẢN NÀY chị KHÔNG thuộc phòng nào và rơi hẳn khỏi sơ đồ cũ.
UPDATE nhan_su SET phong_ban_id = 5, quan_ly_id = 'ns_admin2'   WHERE id = 'ns_6222e61d-6a0';

-- Vũ Lan Hương — NV Chăm sóc Khách hàng. ⚠️ CHỜ SẾP CHỐT: chị đang làm CẢ
-- CSKH (Phòng Kinh doanh) LẪN Hành chính nhân sự (Phòng Vận hành). Một ô
-- `phong_ban_id` chỉ chứa được một phòng. Bản này xếp theo chức vụ đang ghi
-- trong hồ sơ ("NV Chăm sóc Khách hàng") → Nhóm CSKH. Cũng TRƯỚC BẢN NÀY chị
-- không thuộc phòng nào và biến mất khỏi sơ đồ cũ.
UPDATE nhan_su SET phong_ban_id = 6, quan_ly_id = 'ns_admin2'   WHERE id = 'ns_a81898a3-f7b';

-- ── Phòng Vận hành và Hỗ trợ · Nhóm Kế toán – Tài chính ───────────────────
-- 🔴 Phan Thị Hằng — Trưởng nhóm Kế toán - Tài chính. SỬA LỖI: `quan_ly_id`
--    đang là 'ns_b8e66305-845' (Phạm Khương Duy, Kho Vận) — Kế toán trưởng
--    báo cáo cho Quản lý kho. Cơ cấu mới đặt Nhóm Kế toán dưới Phòng Vận hành
--    và Hỗ trợ do Phó Giám đốc phụ trách → quản lý đúng là ns_admin1.
UPDATE nhan_su SET phong_ban_id = 7, quan_ly_id = 'ns_admin1'   WHERE id = 'ns_nv010014';

-- Dương Thị Hồng Khánh — ⚠️ CHỜ SẾP CHỐT: hồ sơ TRỐNG `chuc_vu`. Xếp vào Nhóm
-- Kế toán vì `quan_ly_id` hiện tại đang trỏ tới chị Hằng; nếu chị làm việc
-- khác thì dòng này SAI.
UPDATE nhan_su SET phong_ban_id = 7, quan_ly_id = 'ns_nv010014' WHERE id = 'ns_nv010015';

-- ── Phòng Vận hành và Hỗ trợ · Nhóm HCNS – Admin ──────────────────────────
-- Phạm Thị Lan — NV HCNS kiêm Admin.
UPDATE nhan_su SET phong_ban_id = 8, quan_ly_id = 'ns_admin1'   WHERE id = 'ns_fcc63fda-0cd';

-- ── Phòng Vận hành và Hỗ trợ · Nhóm Kho vận – Sản xuất ────────────────────
-- Phạm Khương Duy — Trưởng nhóm Kho vận – Sản xuất.
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_admin1'      WHERE id = 'ns_b8e66305-845';

-- 15 nhân viên Kho Vận. Kênh báo cáo chuẩn: nhân sự kho → anh Duy → Sếp Ngọc.
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv010010';   -- Hoàng Văn Tế
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020004';   -- Nguyễn Thị Ngọc Anh
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv010013';   -- Nguyễn Thị Đào
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020001';   -- Nguyễn Xuân Khoa An
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv010009';   -- Phạm Thị Hải
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020007';   -- Phạm Thị Thu Uyên
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020006';   -- Trần Minh Hằng
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020002';   -- Vũ Thị Trà Mi
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv010012';   -- Vương Thị Huyền
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_ef6ebbe1-c4d'; -- Đinh Mạnh Linh
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020009';   -- Đào Thị Hồng Vy
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020008';   -- Đặng Lê Hà
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020010';   -- Đỗ Duy Khánh
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv010011';   -- Đỗ Thị Hường
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020005';   -- Đỗ Thị Như Quỳnh

-- Nguyễn Thị Bích Trâm — ⚠️ CHỜ SẾP CHỐT: hồ sơ TRỐNG `chuc_vu`. Giữ ở Nhóm
-- Kho vận vì `quan_ly_id` hiện tại đang trỏ tới anh Duy; nếu chị làm việc
-- khác thì dòng này SAI.
UPDATE nhan_su SET phong_ban_id = 4, quan_ly_id = 'ns_b8e66305-845' WHERE id = 'ns_nv020003';

-- ═══ ĐẾM LẠI CHO CHẮC ══════════════════════════════════════════════════════
-- Chạy xong, dán câu này lên D1 để đối chiếu. Phải ra ĐÚNG 24 người, và cột
-- `khong_phong` phải bằng 0 — không ai còn rơi ra ngoài sơ đồ:
--
--   SELECT (SELECT COUNT(*) FROM nhan_su WHERE dang_lam = 1) AS dang_lam,
--          (SELECT COUNT(*) FROM nhan_su WHERE dang_lam = 1
--            AND phong_ban_id IS NULL) AS khong_phong,
--          (SELECT COUNT(*) FROM nhan_su WHERE dang_lam = 1
--            AND quan_ly_id IS NULL) AS khong_quan_ly;
--
-- `khong_quan_ly` ra 1 là ĐÚNG — đó là Giám đốc, đỉnh cây.
