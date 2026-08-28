-- ==========================================================================
-- CỜ QUYỀN `duyet_gopy` — AI ĐƯỢC DUYỆT GÓP Ý Ở CẤP CUỐI
-- --------------------------------------------------------------------------
-- Sếp Bùi Thị Ngọc chốt 28/08/2026:
--   "riêng cái góp ý ERP đừng để sếp Phong duyệt, 1 mình tao duyệt hết"
--   "cứ để tao duyệt 1 mình, tao duyệt đt cũng được"
--
-- Anh Nguyễn Duy Phong (Giám đốc, tài khoản vai trò `admin`) GIỮ NGUYÊN toàn
-- quyền mọi thứ khác, XEM đầy đủ mọi góp ý — chỉ mất đúng nút duyệt/từ chối
-- ở CẤP CUỐI. Cấp 1 (quản lý trực tiếp của người gửi) KHÔNG đổi một chữ.
--
-- VÌ SAO LÀ CỜ TRÊN TÀI KHOẢN, KHÔNG PHẢI TÊN NGƯỜI VIẾT CỨNG TRONG CODE:
--   · Sếp đổi ý cho ai đó duyệt → BẬT CỜ, không sửa code, không deploy.
--   · Sếp đi vắng muốn tạm uỷ quyền → đã có sẵn đường, bật rồi tắt.
--   · Viết cứng id/tên người vào code là nợ kỹ thuật: người sau đọc code
--     không hiểu vì sao, và mỗi lần đổi ý là một lần deploy.
-- Bật/tắt cờ làm ngay trên tab Quản trị (POST /api/quan-tri/quyen-duyet-gopy),
-- và CHỈ người đang giữ cờ mới cấp/thu được cờ — anh Phong không tự bật cho
-- mình được.
--
-- TOÀN BỘ FILE LÀ ADD COLUMN + CREATE INDEX + backfill CHỈ TRÊN CỘT MỚI.
-- Không DROP, không UPDATE cột nghiệp vụ cũ, không đổi trạng thái bản ghi nào.
--
-- Chạy:  node scripts/chay-migration.mjs them-quyen-duyet-gopy.sql
-- THỨ TỰ TRIỂN KHAI: DB TRƯỚC, CODE SAU (REV-0018 mục 6). src/auth.js đọc
-- t.duyet_gopy ngay trong docPhien() — deploy code trước khi có cột này thì
-- MỌI người mất đăng nhập, không riêng gì màn Góp ý.
-- ==========================================================================

-- Chốt chặn chạy lại — schema_migrations.filename là PRIMARY KEY, chạy lần 2
-- dừng ngay tại đây, trước khi chạm vào bảng nào.
INSERT INTO schema_migrations (filename) VALUES ('them-quyen-duyet-gopy.sql');

-- ---- 1. Cờ quyền ---------------------------------------------------------
-- 0 = không duyệt được cấp cuối (mặc định cho MỌI tài khoản, kể cả admin).
-- Mặc định 0 là cố ý: thà chặn nhầm còn hơn mở nhầm (đúng khuôn KHONG_QUYEN
-- trong src/quyen.js). Sau migration này chỉ có đúng 1 tài khoản mang cờ.
ALTER TABLE tai_khoan ADD COLUMN duyet_gopy INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_taikhoan_duyetgopy ON tai_khoan (duyet_gopy);

-- ---- 2. Ảnh chụp để HOÀN TÁC một cú duyệt/từ chối lỡ tay -----------------
-- Sếp là NGƯỜI DUY NHẤT duyệt cấp cuối → bấm nhầm thì không ai sửa hộ được.
-- hoan_tac_json giữ ảnh chụp các cột duyệt NGAY TRƯỚC cú bấm gần nhất; hàm
-- gopYHoanTac() trả lại nguyên trạng trong cửa sổ 15 phút, và CHỈ khi việc
-- chưa đi tiếp. Lịch sử KHÔNG bị xoá — hoàn tác ghi thêm một dòng mới
-- (append-only, Rule 10). Một cột JSON thay vì 12 cột trống: hoàn tác chỉ
-- cần chụp-và-trả nguyên khối, tách cột ra không tra cứu thêm được gì.
ALTER TABLE gop_y ADD COLUMN hoan_tac_json   TEXT;
ALTER TABLE gop_y ADD COLUMN hoan_tac_boi_id TEXT REFERENCES nhan_su(id);
ALTER TABLE gop_y ADD COLUMN hoan_tac_luc    TEXT;

-- ==========================================================================
-- BACKFILL — CHỈ trên cột vừa thêm.
-- ==========================================================================

-- Sếp Bùi Thị Ngọc. Tên đăng nhập = số điện thoại (xem scripts/tao-tai-khoan.mjs).
-- Đây là DỮ LIỆU seed một lần, KHÔNG phải luật trong code: đổi người duyệt
-- về sau làm bằng nút trên tab Quản trị, không phải bằng cách sửa file này.
UPDATE tai_khoan SET duyet_gopy = 1 WHERE ten_dang_nhap = '0911994696';

-- Đường lui CÓ KHAI BÁO: nếu số điện thoại đăng nhập đã đổi thì bắt theo hồ
-- sơ nhân sự. Chỉ chạy khi câu trên KHÔNG bắt được ai, và chỉ gắn cho ĐÚNG
-- MỘT tài khoản — không có đường nào file này bật cờ cho 2 người.
UPDATE tai_khoan SET duyet_gopy = 1
 WHERE NOT EXISTS (SELECT 1 FROM tai_khoan WHERE duyet_gopy = 1)
   AND nhan_su_id = (SELECT id FROM nhan_su WHERE ho_ten = 'Bùi Thị Ngọc' ORDER BY id LIMIT 1);

-- ==========================================================================
-- TỰ KIỂM BẮT BUỘC — MIGRATION PHẢI GÃY TO NẾU BACKFILL HỤT (REV-0027 L5)
-- --------------------------------------------------------------------------
-- Trước bản vá này, hai câu UPDATE trên có thể bắt trúng 0 tài khoản (số điện
-- thoại đăng nhập đã đổi VÀ họ tên trong hồ sơ lệch một dấu cách) mà migration
-- vẫn báo "thành công". Kết quả: KHÔNG AI duyệt được góp ý, KHÔNG AI cấp được
-- cờ cho ai, cả hàng chờ đứng — và không một dòng log nào nói ra điều đó.
-- "Nhớ chạy câu đối chiếu bằng tay" là thứ sẽ quên đúng vào hôm bận nhất, nên
-- nó phải là RÀNG BUỘC CỦA DB, không phải một dòng chú thích.
--
-- CÁCH LÀM: SQLite không có RAISE ngoài trigger, nên mượn CHECK. ok = 0 thì
-- INSERT gãy → cả file dừng, wrangler in đỏ:
--     CHECK constraint failed: backfill_duyet_gopy_phai_bat_dung_1_nguoi
-- Thấy dòng đó nghĩa là BACKFILL KHÔNG BẮT ĐÚNG 1 NGƯỜI — ĐỪNG deploy code;
-- tra lại số điện thoại đăng nhập của Sếp rồi bật tay:
--     UPDATE tai_khoan SET duyet_gopy = 1 WHERE ten_dang_nhap = '<số của Sếp>';
--
-- Ngoại lệ DUY NHẤT: DB chưa có tài khoản nào đang hoạt động (bàn thử dựng
-- lược đồ trắng) — ở đó không có gì để backfill, không phải lỗi.
-- Ràng buộc được ĐẶT TÊN: SQLite in tên ràng buộc chứ không in tên bảng, nên
-- tên phải tự nói ra chuyện gì hỏng khi nó gãy.
CREATE TABLE IF NOT EXISTS kiem_backfill_duyet_gopy (
  ok INTEGER NOT NULL
    CONSTRAINT backfill_duyet_gopy_phai_bat_dung_1_nguoi CHECK (ok = 1)
);

INSERT INTO kiem_backfill_duyet_gopy (ok)
SELECT CASE
         WHEN (SELECT COUNT(*) FROM tai_khoan WHERE kich_hoat = 1) = 0 THEN 1
         WHEN (SELECT COUNT(*) FROM tai_khoan WHERE duyet_gopy = 1 AND kich_hoat = 1) = 1 THEN 1
         ELSE 0
       END;

DROP TABLE kiem_backfill_duyet_gopy;

-- ---- Đối chiếu bằng mắt sau khi chạy (phải ra ĐÚNG 1 dòng, ĐÚNG TÊN Sếp) --
--   SELECT t.ten_dang_nhap, n.ho_ten FROM tai_khoan t
--     JOIN nhan_su n ON n.id = t.nhan_su_id WHERE t.duyet_gopy = 1;
-- Câu tự kiểm ở trên đã chặn ca "0 dòng". Câu này để nhìn tận mắt ĐÚNG TÊN:
-- số điện thoại cũ của Sếp nay có thể đã là của người khác — đếm vẫn ra 1 mà
-- cờ rơi vào tay người khác.
