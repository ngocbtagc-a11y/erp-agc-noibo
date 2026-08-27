-- ==========================================================================
-- MIGRATION — Bộ năng lực (ky_nang · nhan_su_ky_nang) · SPEC-0007 Đợt 4
-- --------------------------------------------------------------------------
-- Tính năng dùng được cho MỌI người (Sếp yêu cầu hồ sơ đầy đủ cho mỗi nhân
-- viên), nhưng KHÔNG ép nhập hàng loạt: danh mục chia theo nhóm, bắt đầu
-- nhập ở KHO trước — nơi có ích ngay và là ~40 phút của anh Duy.
--
-- MỤC ĐÍCH PHẢI THẤY ĐƯỢC NGAY, bám vào đúng hai việc thật:
--   ① Xếp ca kho    — ai lái được xe nâng, ai vận hành được máy dán màng
--   ② Nghỉ đột xuất — ai thay được, và kỹ năng nào CHỈ MỘT NGƯỜI biết
-- Không có hai màn hình đó thì bảng này là bảng chữ chết.
--
-- DANH MỤC CỐ ĐỊNH, tái dùng khuôn Data Lock của danh mục nền
-- (`them-danhmuc-nen.sql` + `them-khoa-danhmuc-nen.sql`): cùng cặp cột
-- `hoat_dong` + `trang_thai` ('nhap' sửa tự do / 'da_khoa' chỉ Admin sửa).
-- KHÔNG có ô nhập tự do ở màn chấm năng lực — đó là thứ DUY NHẤT ngăn kho dữ
-- liệu biến thành "Excel" / "excel" / "MS Excel" và hỏng khả năng tra cứu.
--
-- BỐN MỨC (Gạo chốt): biet | lam_duoc | thanh_thao | day_duoc.
-- Ràng buộc CHECK ngay dưới DB, không để tầng ứng dụng tự giữ lời hứa.
--
--   Nạp máy:  node scripts/chay-migration.mjs migrations/them-ky-nang.sql
--   Nạp mây:  node scripts/chay-migration.mjs migrations/them-ky-nang.sql --remote
--
-- LÙI LẠI (rollback): hai bảng độc lập, chưa có gì trỏ vào:
--   DROP TABLE nhan_su_ky_nang;
--   DROP TABLE ky_nang;
--   DELETE FROM schema_migrations WHERE filename = 'them-ky-nang.sql';
-- Không DROP cột nào, không UPDATE một dòng dữ liệu cũ nào.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS ky_nang (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ten        TEXT NOT NULL UNIQUE,   -- UNIQUE: chống trùng ngay ở DB
  nhom       TEXT NOT NULL,          -- kho|van_hanh|ke_toan|hcns|chung
  mo_ta      TEXT,                   -- "thế nào là làm được" — chấm mới nhất quán
  an_toan    INTEGER NOT NULL DEFAULT 0,  -- 1 = việc có rủi ro an toàn/tiền
  hoat_dong  INTEGER NOT NULL DEFAULT 1,
  trang_thai TEXT NOT NULL DEFAULT 'nhap',   -- 'nhap' | 'da_khoa'  (Data Lock)
  tao_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE TABLE IF NOT EXISTS nhan_su_ky_nang (
  nhan_su_id    TEXT NOT NULL REFERENCES nhan_su(id),
  ky_nang_id    INTEGER NOT NULL REFERENCES ky_nang(id),
  -- 4 mức. CHECK để một bản ghi sai mức KHÔNG vào được bảng, kể cả khi gọi
  -- thẳng API — màn "ai thay được" xếp hạng theo cột này, rác vào là xếp sai
  -- người vào xe nâng.
  muc           TEXT NOT NULL CHECK (muc IN ('biet','lam_duoc','thanh_thao','day_duoc')),
  ghi_chu       TEXT,
  -- QUẢN LÝ TRỰC TIẾP XÁC NHẬN (Rule 9) — không để tự khai không ai kiểm.
  -- Cột NOT NULL: không có người chấm thì không có dòng.
  nguoi_cham_id TEXT NOT NULL REFERENCES nhan_su(id),
  luc           TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  PRIMARY KEY (nhan_su_id, ky_nang_id)
);

CREATE INDEX IF NOT EXISTS idx_nskn_kn ON nhan_su_ky_nang (ky_nang_id, muc);

-- --------------------------------------------------------------------------
-- DANH MỤC NỀN — cố định, nhóm KHO đứng trước vì đó là nơi nhập đầu tiên.
-- Mỗi dòng có `mo_ta` trả lời "thế nào là làm được": hai quản lý chấm cùng
-- một người mà ra hai kết quả thì bảng này vô dụng.
-- `an_toan = 1` cho những việc mà chấm sai là có người bị thương hoặc mất
-- tiền — màn tra cứu tô riêng nhóm này.
-- --------------------------------------------------------------------------

INSERT OR IGNORE INTO ky_nang (ten, nhom, an_toan, mo_ta) VALUES
 -- ---- KHO (nhập trước, anh Phạm Khương Duy chấm) ----
 ('Lái xe nâng',                 'kho', 1, 'Tự lấy/hạ pallet ở kệ cao mà không cần người kèm; có chứng chỉ vận hành nếu luật đòi'),
 ('Vận hành máy dán màng co',    'kho', 1, 'Tự chỉnh nhiệt, chạy hết một lô và xử lý được khi máy kẹt'),
 ('Vận hành máy hút chân không', 'kho', 1, 'Tự chỉnh thời gian hút theo loại bao bì, không làm rách/hở túi'),
 ('Kiểm đếm và kiểm kê tồn',     'kho', 0, 'Đếm một khu kệ ra số khớp với ERP, biết cách xử lý khi lệch'),
 ('Soạn đơn và đóng gói',        'kho', 0, 'Soạn đúng SKU, đúng số lượng, đóng đủ chống sốc cho hàng dễ vỡ'),
 ('Quản lý hạn sử dụng theo lô', 'kho', 1, 'Đọc được mã lô, xuất theo FEFO, phát hiện lô sắp hết hạn trước 90 ngày'),
 ('Nhập hàng và đối chiếu NCC',  'kho', 0, 'Nhận hàng, đối chiếu với đơn đặt, lập biên bản khi thiếu/hỏng'),
 ('Xử lý hàng hoàn',             'kho', 0, 'Phân loại được hàng hoàn: bán lại / giảm giá / huỷ, đúng tiêu chuẩn thực phẩm'),
 ('In tem và mã vạch',           'kho', 0, 'Tự in tem SKU/tem tài sản đúng khổ, xử lý được khi máy in lệch'),
 ('Xếp ca và phân công tổ',      'kho', 0, 'Lên lịch tuần đủ người cho mọi ca, cân được tải giữa các bạn'),

 -- ---- VẬN HÀNH SÀN ----
 ('Vận hành gian hàng Shopee',   'van_hanh', 0, 'Tự đăng/sửa sản phẩm, xử lý đơn, đọc được chỉ số sức khoẻ gian hàng'),
 ('Vận hành gian hàng TikTok Shop','van_hanh', 0, 'Tự đăng/sửa sản phẩm, xử lý đơn và đơn hoàn trên TikTok Shop'),
 ('Chạy khuyến mãi và campaign', 'van_hanh', 1, 'Lên chương trình đúng giá đã duyệt, không để sai giá/sai thời gian'),
 ('Chăm sóc khách và xử lý khiếu nại','van_hanh', 0, 'Trả lời trong giờ cam kết, xử lý được ca khách phàn nàn mà không cần chuyển lên'),
 ('Chụp và sửa ảnh sản phẩm',    'van_hanh', 0, 'Ra được bộ ảnh dùng đăng bán ngay, không cần thuê ngoài'),

 -- ---- KẾ TOÁN & TÀI CHÍNH ----
 ('Đối soát sàn TMĐT',           'ke_toan', 1, 'Khớp báo cáo sàn với sao kê ngân hàng, giải trình được chênh lệch'),
 ('Kê khai thuế',                'ke_toan', 1, 'Tự lập và nộp tờ khai đúng hạn, không phát sinh tiền chậm nộp'),
 ('Nghiệp vụ BHXH',              'ke_toan', 1, 'Tăng/giảm lao động, chốt sổ đúng hạn theo Luật BHXH 2024'),
 ('Tính lương và bảng công',     'ke_toan', 1, 'Ra bảng lương đúng, khớp bảng công, không phải sửa lại sau khi gửi'),
 ('Quản lý công nợ',             'ke_toan', 0, 'Theo được công nợ NCC và công nợ sàn, cảnh báo trước khi quá hạn'),

 -- ---- HÀNH CHÍNH NHÂN SỰ ----
 ('Chấm công và bảng công',      'hcns', 0, 'Chốt bảng công tháng đúng hạn, xử lý được ca nghỉ/tăng ca bất thường'),
 ('Hồ sơ lao động và hợp đồng',  'hcns', 1, 'Soạn/lưu hợp đồng đúng loại, theo dõi hạn, không để hợp đồng quá hạn'),
 ('Tuyển dụng và onboarding',    'hcns', 0, 'Chạy được một vòng tuyển từ đăng tin tới ngày đầu đi làm'),

 -- ---- CHUNG (ai cũng có thể có) ----
 ('Dùng ERP nội bộ',             'chung', 0, 'Tự làm được phần việc của mình trên ERP mà không cần hỏi lại'),
 ('Excel / Google Sheets',       'chung', 0, 'Tự dựng bảng tính có công thức và pivot, không chỉ nhập tay'),
 ('Soạn quy trình bằng văn bản', 'chung', 0, 'Viết được quy trình mà người mới đọc là làm theo được'),
 ('Lái xe máy giao hàng gấp',    'chung', 1, 'Có bằng lái hợp lệ, đi giao gấp trong nội thành được');
