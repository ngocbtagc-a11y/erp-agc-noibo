-- ==========================================================================
-- MIGRATION — HỒ SƠ (BỘ) CHO KHO TÀI LIỆU  ·  PHASE 2 (Sếp Ngọc chốt 09/09/2026)
-- --------------------------------------------------------------------------
--   Nạp máy:  node scripts/chay-migration.mjs them-kho-tai-lieu-ho-so-bo.sql
--   Nạp mây:  node scripts/chay-migration.mjs them-kho-tai-lieu-ho-so-bo.sql --remote
--
-- ⚠️ CHẠY TRƯỚC KHI DEPLOY MÃ MỚI. KHÔNG PHẢI SAU.
--    REV-0055 CAO-3 đã trả giá đúng chỗ này: deploy mã mới trước migration thì
--    câu `INSERT`/`SELECT` liệt kê cột chưa có sẽ nổ SAU KHI file đã nằm trên
--    Drive ⇒ mỗi lần người dùng bấm "Gửi lại" là thêm một file mồ côi.
--
-- ⚠️ PHẢI CHẠY SAU `them-kho-tai-lieu.sql` (bảng `tai_lieu` phải có trước đã).
--    TÊN FILE ĐẶT RA ĐỂ ÉP ĐÚNG THỨ TỰ ẤY, không phải để đọc cho xuôi: công cụ
--    kiểm migration sắp file theo tên ĐÃ BỎ ĐUÔI `.sql`, nên
--      them-kho-tai-lieu  <  them-kho-tai-lieu-cot-chu-nguon
--                         <  them-kho-tai-lieu-cot-ocr-neo
--                         <  them-kho-tai-lieu-ho-so-bo      ← file này
--    ĐỔI TÊN FILE NÀY LÀ ĐỔI THỨ TỰ NẠP. Đừng đổi.
--
-- ==========================================================================
-- VÌ SAO CÓ BẢNG NÀY — VÀ VÌ SAO NÓ KHÔNG PHẢI LÀ `nhom`
-- --------------------------------------------------------------------------
-- `nhom` (7 giá trị viết cứng trong src/quyen.js) quyết định BA thứ mà hồ sơ
-- KHÔNG được đụng vào: ai xem được · cờ nhạy cảm · hạn lưu theo luật. Nó là
-- một phân loại PHẲNG, cố định, là khoá của bảng phân quyền 10 vai trò.
--
-- Hồ sơ là thứ khác hẳn: Sếp tự lập bao nhiêu bộ tuỳ ý, không deploy, và mục
-- đích duy nhất của nó là *"gom giấy cùng một việc lại để nhìn cho đủ"*.
-- Ví dụ thật: bộ *Hồ sơ pháp lý doanh nghiệp* gồm GCN ĐKKD, Điều lệ, Quyết
-- định bổ nhiệm, Biên bản họp, **CCCD người đại diện**, Giấy uỷ quyền. Sáu tờ
-- đó là MỘT BỘ trong đời thật — nhưng CCCD bắt buộc phải ở nhóm `nhan_su`, vì
-- chính cờ nhóm đó mới bật hai thứ Luật BVDLCN 91/2025/QH15 đòi (ghi nhận
-- đồng ý lúc lưu + nhật ký mỗi lượt mở). Bắt bộ và nhóm là một thứ thì hoặc
-- CCCD rơi ra khỏi bộ, hoặc nó mất hai lớp bảo vệ pháp lý.
--
-- ⚠️⚠️ HỒ SƠ KHÔNG CÓ QUYỀN RIÊNG — Sếp Ngọc chốt 09/09/2026.
-- Bảng này CỐ Ý KHÔNG có cột nào về quyền xem. Quyền vẫn CHỈ do `nhom` của
-- từng tờ giấy quyết định, y như hôm nay. Một tờ giấy có HAI ông chủ quyền là
-- cách hỏng ÂM THẦM: kéo một tờ vào bộ rồi đột nhiên thêm người đọc được nó.
-- Hệ quả đã chấp nhận: người không đủ quyền mở một bộ thì màn hình NÓI THẲNG
-- *"bộ này có N giấy tờ bạn không được xem"* — không giấu im, không trả danh
-- sách rỗng (danh sách rỗng làm người ta tưởng bộ chưa có giấy rồi đi quét lại).
--
-- ==========================================================================
-- VÌ SAO KHÔNG DÙNG LẠI CẶP `cua_vao` + `gan_id` (đã có sẵn, đã có chỉ mục)
-- --------------------------------------------------------------------------
-- Bản soát PHASE 1 nói đúng rằng cặp đó CHÍNH LÀ cơ chế gom bộ, và SPEC-0005
-- Mục 5.3 đã khai sẵn 7 loại gắn trong khi mã chỉ bật 2. Nhưng dùng lại nó cho
-- hồ sơ thì VỠ ở đúng ca Sếp cần nhất:
--   `gan_id` là MỘT ô đơn, và nhóm `nhan_su` đã chiếm ô đó để trỏ về NGƯỜI
--   (ràng buộc cứng REV-0046 #2: giấy nhân sự LUÔN có `gan_id` là nhan_su.id).
--   Tờ CCCD người đại diện trong bộ *Hồ sơ pháp lý doanh nghiệp* phải giữ
--   `gan_id` = người, nên nó KHÔNG còn ô nào để trỏ về bộ.
-- ⇒ Một cột riêng `ho_so_id`, đi cạnh chứ không tranh chỗ. Vẫn là MỞ RỘNG:
--   không bảng nối, không khoá ngoại thứ hai, không đường đọc thứ hai — cửa
--   `?ho_so_id=` dùng lại nguyên khuôn `?gan_id=` đã có trong `danhSachTaiLieu`.
--
-- ==========================================================================
-- LÙI LẠI (rollback) — chạy TAY, KHÔNG có file `lui-*.sql` riêng:
--   DROP INDEX IF EXISTS idx_tai_lieu_thay_the;
--   DROP INDEX IF EXISTS idx_tai_lieu_ho_so;
--   ALTER TABLE tai_lieu DROP COLUMN thay_the_boi_id;
--   ALTER TABLE tai_lieu DROP COLUMN ho_so_id;
--   DROP TABLE IF EXISTS ho_so;
--   DELETE FROM schema_migrations WHERE filename = 'them-kho-tai-lieu-ho-so-bo.sql';
--   (lùi mã nguồn CÙNG LÚC — mã mới đọc hai cột này ở đường danh sách.)
--
-- Chạy lần hai báo "duplicate column name: ho_so_id" tức là ĐÃ CHẠY RỒI,
-- không phải hỏng.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. BẢNG `ho_so` — MỘT BỘ GIẤY TỜ
-- --------------------------------------------------------------------------
-- ⚠️ CHÚ THÍCH KHÔNG PHẢI RÀNG BUỘC — bài học `them-gopy-lichsu-tacnhan.sql:50`.
-- Muốn ép tập giá trị thì phải viết `CHECK`, viết `-- 'a'|'b'` trong chú thích
-- thì SQLite nhận tuốt. Nên `loai` và `trang_thai` có CHECK thật ở dưới.
CREATE TABLE IF NOT EXISTS ho_so (
  id          TEXT PRIMARY KEY,          -- 'hs_' + 12 ký tự UUID

  -- ⚠️ TÊN BỘ LÀ DỮ LIỆU CÁ NHÂN. Sếp Ngọc chốt 09/09/2026.
  -- Tên bộ hoàn toàn có thể là "Hồ sơ kỷ luật Nguyễn Văn A". Bản sao lưu CSV
  -- chọn bảng bằng DANH SÁCH LOẠI TRỪ (src/sao-luu.js:148), nên bảng mới này
  -- TỰ ĐỘNG được gói ra Drive hằng tháng — REV-0040 #5 đã bắt được đúng lỗi
  -- này một lần với `tai_lieu.noi_dung`. Nên `ten` đi vào `CHE_DONG_NHAY_CAM`
  -- của src/sao-luu.js. Đổi cột này thì phải đổi ở đó cùng lúc.
  ten         TEXT NOT NULL,

  -- Loại bộ — quyết định BẢNG KIỂM "bộ này còn thiếu giấy gì" (viết cứng vòng
  -- đầu trong `LOAI_HO_SO`, src/tai-lieu.js). KHÔNG quyết định quyền, không
  -- quyết định hạn lưu, không quyết định cờ nhạy cảm.
  loai        TEXT NOT NULL DEFAULT 'khac',

  -- 'dang_dung' | 'da_dong'. Mục tiêu 2026 của Sếp là *"đóng lại các hộ kinh
  -- doanh cũ"*: đóng xong thì đánh dấu CẢ MỘT BỘ là đã đóng, gọn hơn nhiều so
  -- với lọc từng tờ. Đóng KHÔNG phải xoá, không phải ẩn — bộ vẫn mở ra xem được.
  trang_thai  TEXT NOT NULL DEFAULT 'dang_dung',

  ghi_chu     TEXT,                      -- cũng bị che trong bản sao lưu, xem trên
  nguoi_tao   TEXT,
  tao_luc     TEXT,
  an          INTEGER NOT NULL DEFAULT 0,-- ẩn, KHÔNG xoá (SPEC-0005 Mục 7.5)

  CHECK (loai IN ('phap_ly_dn', 'nhan_su', 'ncc', 'nhap_khau', 'khac')),
  CHECK (trang_thai IN ('dang_dung', 'da_dong')),
  CHECK (an IN (0, 1)),
  CHECK (length(trim(ten)) >= 3)
);

-- Hai bộ trùng tên là hai bộ không ai phân biệt được. Chặn ở CSDL chứ không
-- chỉ ở mã: hai tab mở cùng lúc thì chốt trong mã không thấy nhau.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ho_so_ten  ON ho_so (ten);
CREATE INDEX IF NOT EXISTS        idx_ho_so_dung ON ho_so (an, trang_thai, tao_luc DESC);

-- --------------------------------------------------------------------------
-- 2. HAI CỘT MỚI TRÊN `tai_lieu` — ĐI BẰNG `ALTER TABLE`, MẶC ĐỊNH NULL
-- --------------------------------------------------------------------------
-- ⚠️ KHÔNG MỘT CÂU `UPDATE` NÀO CHẠY TRÊN DỮ LIỆU CŨ.
-- Mọi tài liệu đã có phải chạy tiếp BÌNH THƯỜNG với hai cột này = NULL:
--   ho_so_id = NULL        → "chưa thuộc bộ nào", hiện ở mục *Chưa vào bộ nào*
--   thay_the_boi_id = NULL → "chưa ai đánh dấu tờ này bị thay thế"
-- NULL ở đây nói THẬT là *chưa từng đặt*, còn một giá trị mặc định là một lời
-- khai bịa cho toàn bộ dòng cũ (đúng lý do `chu_nguon` cũng không có DEFAULT).

-- Một tờ chỉ thuộc MỘT bộ (Gạo chốt 09/09/2026): một ô đơn là đủ, không bảng
-- nối. Hai bộ cùng đòi một tờ thì câu hỏi "bộ này còn thiếu gì" mất nghĩa.
ALTER TABLE tai_lieu ADD COLUMN ho_so_id TEXT;

-- ⚠️ RỦI RO ĐANG NẰM TRÊN HỆ THỐNG THẬT — đây là lý do cột này ra đời.
-- Kho đang có GCN đăng ký doanh nghiệp `02/2026/PLDN` và bản Sửa đổi lần 1
-- `03/2026/PLDN` nằm HAI DÒNG RỜI NHAU, không chỗ nào nói tờ 02 đã bị sửa đổi.
-- Ai mở tờ 02 đi kê khai, đi nộp hồ sơ, đi mở gian hàng — KHÔNG CÓ GÌ CẢN.
-- Đây không phải thiếu tiện nghi, đây là rủi ro DÙNG NHẦM GIẤY HẾT HIỆU LỰC.
--
-- Cột này giữ id của tờ MỚI. Chiều ngược lại (tờ mới thay tờ nào) KHÔNG có cột
-- thứ hai — nó là một câu hỏi ngược trên đúng chỉ mục dưới đây. Hai cột cho
-- một sự thật là hai chỗ để lệch nhau.
--
-- ⚠️ CẤM ẨN TỜ CŨ ĐI. SPEC-0005 Mục 7.5 cấm làm mất dấu tài liệu gốc, và bản
-- sửa đổi KHÔNG làm bản gốc vô giá trị (vẫn cần để chứng minh lịch sử pháp
-- nhân). Tờ cũ vẫn mở được, vẫn tra được — chỉ đeo dải cảnh báo và một đường
-- dẫn sang tờ mới.
ALTER TABLE tai_lieu ADD COLUMN thay_the_boi_id TEXT;

-- Chỉ mục CÓ ĐIỀU KIỆN: tuyệt đại đa số dòng mang NULL ở hai cột này, nên chỉ
-- mục đầy đủ chỉ tốn chỗ. Cùng khuôn `idx_tai_lieu_het_han` đã có.
CREATE INDEX IF NOT EXISTS idx_tai_lieu_ho_so    ON tai_lieu (ho_so_id, an)      WHERE ho_so_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tai_lieu_thay_the ON tai_lieu (thay_the_boi_id)   WHERE thay_the_boi_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 3. DỰNG SẴN HAI BỘ CHO SẾP KÉO GIẤY VÀO
-- --------------------------------------------------------------------------
-- Sếp Ngọc chốt: dựng sẵn bộ "Hồ sơ pháp lý doanh nghiệp" để Sếp kéo 3 tờ hiện
-- có vào bằng tay. Hai pháp nhân đang chạy song song (Công ty TNHH + HKD Onfod
-- tiền thân) = HAI BỘ RIÊNG — vì mục tiêu 2026 là *"đóng lại các hộ kinh doanh
-- cũ"*, và đóng xong thì đánh dấu cả một bộ là `da_dong` gọn hơn lọc từng tờ.
--
-- ⚠️ ĐÂY LÀ `INSERT` HAI DÒNG MỚI, KHÔNG PHẢI `UPDATE` DỮ LIỆU CŨ. Không một
-- tờ giấy nào bị đụng tới; ba tờ đang có vẫn ở nguyên trạng thái "chưa vào bộ
-- nào" cho tới khi Sếp tự kéo vào. `INSERT OR IGNORE` + id cố định nên chạy
-- lại bao nhiêu lần cũng ra đúng hai dòng.
INSERT OR IGNORE INTO ho_so (id, ten, loai, trang_thai, ghi_chu, nguoi_tao, tao_luc)
VALUES
  ('hs_phaply_agc',
   'Hồ sơ pháp lý doanh nghiệp — Công ty TNHH Alpha Green Commerce',
   'phap_ly_dn', 'dang_dung',
   'Bộ dựng sẵn theo yêu cầu 09/09/2026. Kéo GCN đăng ký doanh nghiệp, Điều lệ và các giấy pháp lý của pháp nhân công ty vào đây.',
   NULL, '2026-09-09 00:00:00'),
  ('hs_phaply_onfod',
   'Hồ sơ pháp lý doanh nghiệp — HKD Onfod (tiền thân)',
   'phap_ly_dn', 'dang_dung',
   'Pháp nhân cũ, đang trong quá trình đóng lại (mục tiêu 2026). Đóng xong thì đổi trạng thái bộ này thành "Đã đóng" — không xoá, không ẩn.',
   NULL, '2026-09-09 00:00:00');
