-- ===========================================================================
-- CƠ CẤU TỔ CHỨC BA TẦNG — THÊM CỘT, KHÔNG THÊM BẢNG
-- ---------------------------------------------------------------------------
-- Sếp Bùi Thị Ngọc ban hành cơ cấu mới 09/09/2026:
--
--                       GIÁM ĐỐC
--         ┌────────────────┴────────────────┐
--   P. KINH DOANH VÀ                  P. VẬN HÀNH VÀ HỖ TRỢ
--   PHÁT TRIỂN THỊ TRƯỜNG             (Phó Giám đốc trực tiếp phụ trách)
--   (Giám đốc trực tiếp phụ trách)
--         │                                 │
--    ┌────┴────┐               ┌────────────┼────────────┐
--   Nhóm      Nhóm CSKH và    Nhóm Kế     Nhóm HCNS    Nhóm Kho vận
--   Marketing  PT nguồn        toán -      - Admin      - Sản xuất
--   - Bán hàng cung ứng        Tài chính
--
-- BẢNG `phong_ban` ĐÃ CÓ `cha_id` (them-phongban-socap.sql, 06/09/2026) nên
-- cây ba tầng dựng được ngay — KHÔNG cần bảng mới. Còn thiếu đúng ba thứ:
--
--   ① `cap`          — hộp này là Công ty, Phòng, hay Nhóm. Không có nó thì
--                      sơ đồ phải ĐOÁN cấp theo độ sâu của cây, mà độ sâu là
--                      thứ người dùng kéo thả đổi được trong một giây.
--   ② `phu_trach_id` — "ai TRỰC TIẾP PHỤ TRÁCH". Đây KHÔNG phải trưởng phòng:
--                      trong cơ cấu mới, Phòng Kinh doanh do chính GIÁM ĐỐC
--                      phụ trách và KHÔNG có trưởng phòng. Nhét chung vào
--                      `truong_phong_id` là nói dối hai lần: sơ đồ in "Trưởng
--                      phòng: Nguyễn Duy Phong" (sai chức danh), và ô đếm
--                      "phòng chưa có trưởng" thành vô nghĩa.
--   ③ `mo_ta`        — hai dòng chức năng dưới mỗi hộp Nhóm, đúng nguyên văn
--                      bản Sếp ban hành ("Marketing - Booking · Kênh bán"…).
--
-- ---------------------------------------------------------------------------
-- VÌ SAO `cap` PHẢI CÓ `CHECK`, KHÔNG PHẢI CHÚ THÍCH
-- ---------------------------------------------------------------------------
-- Bài học `them-gopy-lichsu-tacnhan.sql` d.50 (REV-0016 mục 5): một cột TEXT
-- có chú thích `-- nguoi | he_thong | ho_ly | khi_dot` vẫn nhận MỌI chuỗi, và
-- mọi chuỗi lạ đều rơi vào nhánh mặc định của mã nguồn — bản trước để lọt
-- `'sep_gia_mao'` đi thẳng. Chú thích KHÔNG phải ràng buộc. Ở đây cũng vậy:
-- một hàng `cap = 'phòng'` (có dấu) hay `cap = 'nhóm'` sẽ không khớp nhánh
-- nào trong hàm vẽ, và hộp đó BIẾN MẤT khỏi sơ đồ mà không ai báo.
--
-- `NOT NULL DEFAULT 'phong'` — cố ý:
--   · `ALTER TABLE ADD COLUMN` của SQLite chỉ cho `NOT NULL` khi có DEFAULT
--     khác NULL. Không có DEFAULT thì cột buộc phải cho NULL, mà `NULL IN (…)`
--     trong SQLite trả về NULL và CHECK coi NULL là ĐẠT — tức ràng buộc thủng
--     đúng ở ca hay xảy ra nhất (hàng cũ, hàng mới quên điền).
--   · `'phong'` là giá trị ĐÚNG cho 3 trong 4 hàng đang có. Hàng còn lại
--     (id 1 Ban Giám đốc → 'cong_ty', id 4 Kho Vận → 'nhom') được đặt lại
--     ĐÍCH DANH ở file dữ liệu `xep-lai-co-cau-2026-09.sql`, mỗi hàng một câu
--     lệnh có tên. Không câu nào chạy mù.
-- ===========================================================================

ALTER TABLE phong_ban ADD COLUMN cap TEXT NOT NULL DEFAULT 'phong'
  CHECK (cap IN ('cong_ty', 'phong', 'nhom'));

-- Ai TRỰC TIẾP PHỤ TRÁCH hộp này (Giám đốc / Phó Giám đốc). Khác hẳn
-- `truong_phong_id`. Để NULL = không có ai được chỉ định phụ trách riêng, cấp
-- trên trực tiếp lo — sơ đồ hiện "—", KHÔNG bịa ra một cái tên.
-- SQLite bắt buộc cột thêm sau mà có `REFERENCES` thì mặc định phải là NULL;
-- ở đây đúng ý muốn nên không vướng.
ALTER TABLE phong_ban ADD COLUMN phu_trach_id TEXT REFERENCES nhan_su(id);

-- Hai dòng chức năng in dưới hộp Nhóm. Một ô TEXT tự do vì đây là câu chữ
-- Sếp ban hành, không phải danh mục có tập giá trị đóng — kẹp `CHECK` vào đây
-- là kẹp nhầm chỗ, mỗi lần Sếp đổi chữ lại phải sửa lược đồ.
ALTER TABLE phong_ban ADD COLUMN mo_ta TEXT;

-- Sơ đồ luôn hỏi "các hộp cấp X trực thuộc hộp Y, sắp theo thứ tự nào" —
-- chỉ mục theo đúng bộ ba đó. `ix_pb_cay(cha_id, thu_tu)` cũ vẫn giữ nguyên,
-- đây là chỉ mục THÊM, không thay.
CREATE INDEX IF NOT EXISTS ix_pb_cap_cay ON phong_ban(cap, cha_id, thu_tu);
