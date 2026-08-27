-- ==========================================================================
-- MIGRATION — Mô tả công việc theo MBOs (mo_ta_cong_viec) · SPEC-0007 Đợt 3
-- --------------------------------------------------------------------------
-- GẮN THEO CHỨC DANH, KHÔNG GẮN THEO NGƯỜI. 24 người nhưng chỉ ~8 chức danh
-- → giảm khối lượng nhập 3 lần, và JD vốn thuộc về VỊ TRÍ chứ không thuộc về
-- cá nhân: người nghỉ thì JD phải ở lại cho người kế nhiệm.
--
-- CHỖ ÉP OUTCOME NẰM Ở ĐÂY, KHÔNG NẰM Ở GIAO DIỆN:
--   dau_ra  TEXT NOT NULL — thứ BÀN GIAO ĐƯỢC (danh từ)
--   do_bang TEXT NOT NULL — đo thế nào là ĐẠT
-- `do_bang NOT NULL` là toàn bộ cơ chế. Không thể gõ "quản lý kho" rồi bấm
-- Lưu, vì phải điền tiếp "đo bằng gì" — và đúng lúc đó người viết tự thấy câu
-- mình vừa viết không đo được. Hiến pháp bắt outcome-based, không
-- activity-based; ràng buộc phải nằm ở TẦNG DỮ LIỆU thì mới không lách được
-- bằng cách gọi thẳng API.
--
-- KHÔNG đụng `cong_viec` (Rule 13 — vùng người khác đang sửa). Cột nối JD vào
-- Trạm Mục Tiêu (`cong_viec.jd_dau_ra_id`) KHAI TRƯỚC Ở ĐÂY BẰNG CHÚ THÍCH để
-- sau không ai thiết kế lại, nhưng TUYỆT ĐỐI không thêm trong đợt này.
--
--   Nạp máy:  node scripts/chay-migration.mjs migrations/them-mota-congviec.sql
--   Nạp mây:  node scripts/chay-migration.mjs migrations/them-mota-congviec.sql --remote
--
-- LÙI LẠI (rollback): hai bảng độc lập, chưa có gì trỏ vào:
--   DROP TABLE mo_ta_cong_viec;
--   DROP TABLE jd_mau;
--   DELETE FROM schema_migrations WHERE filename = 'them-mota-congviec.sql';
-- Không DROP cột nào, không UPDATE một dòng dữ liệu cũ nào.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS mo_ta_cong_viec (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  chuc_danh_id INTEGER NOT NULL REFERENCES chuc_danh(id),
  -- Chỉ dùng cho phần KIÊM NHIỆM riêng của một người (NULL = JD của cả vị
  -- trí). Kiêm nhiệm là có thật ở công ty này (Hương làm HCNS + CSKH), giấu
  -- đi thì JD không khớp việc người ta thực sự phải giao nộp.
  nhan_su_id   TEXT REFERENCES nhan_su(id),
  dau_ra       TEXT NOT NULL,       -- DANH TỪ: thứ bàn giao được
  do_bang      TEXT NOT NULL,       -- đo thế nào là đạt  ← chỗ ép outcome
  nhip         TEXT NOT NULL DEFAULT 'thang',   -- ngay|tuan|thang|quy
  thu_tu       INTEGER NOT NULL DEFAULT 0,
  hieu_luc     INTEGER NOT NULL DEFAULT 1,      -- 0 = ẩn, KHÔNG xoá (Rule 10)
  nguoi_tao_id TEXT REFERENCES nhan_su(id),
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  sua_luc      TEXT
);

CREATE INDEX IF NOT EXISTS idx_mtcv_cd ON mo_ta_cong_viec (chuc_danh_id, thu_tu);
CREATE INDEX IF NOT EXISTS idx_mtcv_ns ON mo_ta_cong_viec (nhan_su_id) WHERE nhan_su_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- MẪU ĐIỀN SẴN — BẮT BUỘC PHẢI CÓ.
-- Hồ Ly kết luận thẳng: KHÔNG CÓ MẪU THÌ TÍNH NĂNG CHẾT NGAY TUẦN ĐẦU. Người
-- ta mở ô trống ra, không biết "đầu ra đo được" trông như thế nào, gõ đại một
-- câu hoạt động rồi bỏ đó.
--
-- Bốn nhóm mẫu = bốn mảng thật của Alpha Green Commerce, viết đúng nghiệp vụ
-- TMĐT thực phẩm nhập khẩu (Shopee/TikTok, hàng có hạn sử dụng, đơn hoàn),
-- KHÔNG viết chung chung.
--
-- ⚠️ Mẫu là GỢI Ý, không phải JD đã duyệt. Quản lý mảng phải sửa lại cho đúng
-- vị trí của mình rồi mới lưu — Agent không được bịa đầu ra thay người sẽ đi
-- đòi đầu ra đó (SPEC-0007 §6, câu 3 Mục 13: quản lý mảng viết, HCNS nhập).
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jd_mau (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  nhom     TEXT NOT NULL,          -- kho|ke_toan|hcns|van_hanh_san
  dau_ra   TEXT NOT NULL,
  do_bang  TEXT NOT NULL,
  nhip     TEXT NOT NULL,
  thu_tu   INTEGER NOT NULL DEFAULT 0
);

-- ---- KHO VẬN (anh Phạm Khương Duy) ---------------------------------------
INSERT INTO jd_mau (nhom, dau_ra, do_bang, nhip, thu_tu) VALUES
 ('kho', 'Số liệu tồn kho khớp giữa ERP và đếm thực tế',
         'Chênh lệch sau kiểm kê tháng ≤ 0,5% số lượng và = 0 với hàng giá trị cao', 'thang', 1),
 ('kho', 'Đơn đóng xong trong ngày, không tồn sang hôm sau',
         'Số đơn quá 24h chưa bàn giao vận chuyển = 0 vào cuối mỗi ngày làm việc', 'ngay', 2),
 ('kho', 'Không có lô hàng nào hết hạn nằm trong kho',
         'Danh sách lô còn dưới 90 ngày hạn sử dụng được xử lý (đẩy bán/trả NCC) trước khi còn 60 ngày; số lô quá hạn tồn kho = 0', 'tuan', 3),
 ('kho', 'Ca kho được xếp đủ người trước khi tuần bắt đầu',
         'Lịch tuần chốt trước 17h thứ Bảy, không có ca nào thiếu người vào giờ chạy', 'tuan', 4),
 ('kho', 'Hàng hoàn được nhập lại kho đúng tình trạng',
         'Đơn hoàn về quá 48h chưa phân loại = 0; tỉ lệ phân loại sai bị kế toán trả lại < 2%', 'tuan', 5),
 ('kho', 'Không ai trong kho làm việc mà thiếu hướng dẫn an toàn',
         '100% người vận hành xe nâng/máy có xác nhận của quản lý trong hồ sơ năng lực', 'quy', 6);

-- ---- KẾ TOÁN & TÀI CHÍNH (chị Phan Thị Hằng) -----------------------------
INSERT INTO jd_mau (nhom, dau_ra, do_bang, nhip, thu_tu) VALUES
 ('ke_toan', 'Sổ sách tháng đã khoá, số liệu không phải sửa lại sau khi chốt',
             'Chốt sổ xong trước ngày 10 tháng sau; số bút toán điều chỉnh sau chốt = 0', 'thang', 1),
 ('ke_toan', 'Đối soát sàn khớp với tiền thực nhận',
             'Chênh lệch giữa báo cáo Shopee/TikTok và sao kê ngân hàng được giải trình 100%, phần chưa rõ ≤ 0,3% doanh thu tháng', 'thang', 2),
 ('ke_toan', 'Nghĩa vụ thuế và BHXH nộp đúng hạn, không phát sinh tiền chậm nộp',
             'Số tiền phạt/chậm nộp trong kỳ = 0 (NĐ 274/2025: chậm đóng BHXH tính 0,03%/ngày)', 'thang', 3),
 ('ke_toan', 'Báo cáo lãi lỗ theo từng sàn gửi Ban giám đốc',
             'Gửi trước ngày 15 hàng tháng, có số liệu tới từng nhóm hàng, không phải hỏi lại để bổ sung', 'thang', 4),
 ('ke_toan', 'Công nợ nhà cung cấp và công nợ sàn không quá hạn',
             'Số khoản phải trả quá hạn = 0; số khoản phải thu từ sàn quá 45 ngày = 0', 'thang', 5),
 ('ke_toan', 'Hồ sơ chuyển đổi HKD → Công ty đủ chứng từ',
             '100% giao dịch tồn dư của hộ kinh doanh cũ có chứng từ khớp trước hạn Sếp chốt', 'quy', 6);

-- ---- HÀNH CHÍNH NHÂN SỰ (bạn Vũ Lan Hương) -------------------------------
-- Đây đúng chỗ Sếp Ngọc đang vướng: không biết giao việc thế nào để bạn cam
-- kết được đầu ra rõ. Ba dòng đầu lấy thẳng từ SPEC-0007 §6.
INSERT INTO jd_mau (nhom, dau_ra, do_bang, nhip, thu_tu) VALUES
 ('hcns', 'Bảng công tháng đã chốt',
          'Gửi kế toán trước ngày 3, không phải sửa lại sau khi đã gửi', 'thang', 1),
 ('hcns', 'Hồ sơ nhân sự đầy đủ',
          '100% người đang làm có hợp đồng còn hiệu lực trong ERP', 'thang', 2),
 ('hcns', 'Nhân sự mới đủ giấy tờ trong 7 ngày',
          'Số người quá 7 ngày kể từ ngày vào mà còn thiếu giấy tờ = 0', 'tuan', 3),
 ('hcns', 'Không hợp đồng nào hết hạn mà chưa ký lại',
          'Số hợp đồng quá hạn trên dải cảnh báo tab Nhân sự = 0 (quá 30 ngày là luật tự đổi loại hợp đồng, BLLĐ 2019 Đ.20)', 'tuan', 4),
 ('hcns', 'Khách hỏi qua Shopee/TikTok được trả lời trong giờ cam kết',
          'Tỉ lệ trả lời trong 1 giờ ≥ 90% trong khung 8h–18h (phần kiêm nhiệm CSKH)', 'tuan', 5),
 ('hcns', 'Buổi check-in tuần có biên bản chốt việc',
          'Mỗi thứ Tư 15h có 1 biên bản ghi việc đã xong / việc tuần tới, gửi trong ngày', 'tuan', 6);

-- ---- VẬN HÀNH SÀN TMĐT (bạn Nguyễn Thị Huyền) ----------------------------
INSERT INTO jd_mau (nhom, dau_ra, do_bang, nhip, thu_tu) VALUES
 ('van_hanh_san', 'Đơn mới được đẩy sang kho trong giờ cam kết',
                  'Không đơn nào quá 2 giờ trong giờ làm việc mà chưa chuyển kho', 'ngay', 1),
 ('van_hanh_san', 'Sức khoẻ gian hàng giữ trong ngưỡng an toàn của sàn',
                  'Tỉ lệ huỷ do shop và tỉ lệ giao trễ đều dưới ngưỡng cảnh báo của Shopee/TikTok suốt tháng', 'thang', 2),
 ('van_hanh_san', 'Thông tin sản phẩm trên sàn khớp hàng thật',
                  'Số khiếu nại vì sai mô tả/hạn dùng/quy cách = 0; 100% SKU đang bán có ảnh và hạn dùng đúng lô hiện hành', 'tuan', 3),
 ('van_hanh_san', 'Hàng hết tồn không còn hiển thị đang bán',
                  'Số SKU hết hàng mà vẫn mở bán = 0 tại thời điểm kiểm mỗi ngày', 'ngay', 4),
 ('van_hanh_san', 'Chương trình khuyến mãi chạy đúng giá đã duyệt',
                  'Số lần sai giá/sai thời gian chạy = 0; mỗi campaign có bản duyệt trước khi lên sàn', 'thang', 5),
 ('van_hanh_san', 'Đơn hoàn được xử lý xong trước hạn sàn',
                  'Số đơn hoàn quá hạn phản hồi của sàn = 0', 'tuan', 6);
