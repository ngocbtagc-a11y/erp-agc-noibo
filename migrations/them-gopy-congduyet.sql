-- ==========================================================================
-- SPEC-0002 — CỔNG DUYỆT PHÂN CẤP cho "Góp ý & Cải tiến ERP"
-- --------------------------------------------------------------------------
-- EXTEND bảng gop_y đang chạy thật. KHÔNG tạo hàng đợi yêu cầu thứ hai —
-- đó đúng là lỗi đã làm SPEC-0001 phải rút. Toàn bộ file là ADD COLUMN +
-- CREATE INDEX + backfill CHỈ TRÊN CỘT MỚI. Không DROP, không UPDATE cột
-- nghiệp vụ cũ, không đổi trạng thái của bản ghi nào.
--
-- Cột thiết kế MỘT LẦN cho cả SPEC-0002 lẫn SPEC-0003 để không phải sửa
-- hai lần cùng một vùng.
--
-- Chạy:  node scripts/chay-migration.mjs them-gopy-congduyet.sql
-- Thứ tự: chạy them-gopy-lichsu-tacnhan.sql TRƯỚC file này.
-- ==========================================================================

-- Chốt chặn chạy lại — xem giải thích ở them-gopy-lichsu-tacnhan.sql.
-- ALTER TABLE ADD COLUMN không có IF NOT EXISTS, chạy lần 2 sẽ báo trùng cột;
-- dòng này dừng file lại trước khi chạm vào bảng.
INSERT INTO schema_migrations (filename) VALUES ('them-gopy-congduyet.sql');

-- ---- Mức rủi ro ĐÃ CHỐT (khác hẳn de_xuat_risk — cái đó chỉ là AI đề xuất)
ALTER TABLE gop_y ADD COLUMN risk              TEXT;     -- LOW | MEDIUM | HIGH
ALTER TABLE gop_y ADD COLUMN risk_chot_boi_id  TEXT REFERENCES nhan_su(id);
ALTER TABLE gop_y ADD COLUMN risk_chot_luc     TEXT;

-- ---- Dấu của hai cổng duyệt ---------------------------------------------
ALTER TABLE gop_y ADD COLUMN duyet_cap1_boi_id TEXT REFERENCES nhan_su(id);
ALTER TABLE gop_y ADD COLUMN duyet_cap1_luc    TEXT;
-- QUAN_LY_ID | TRUONG_PHONG_ID | KHONG_CO_QUAN_LY | OWNER_VUOT_CAP |
-- TU_DUYET_OWNER | QUA_HAN_LEN_OWNER (SLA đã đẩy lên Sếp, không ai vượt mặt ai)
-- ĐÓNG BĂNG tại thời điểm duyệt: sau này HCNS đổi nhan_su.quan_ly_id thì hồ
-- sơ duyệt cũ vẫn đọc đúng ai duyệt và với tư cách gì (Rule 10).
ALTER TABLE gop_y ADD COLUMN duyet_cap1_nguon  TEXT;
ALTER TABLE gop_y ADD COLUMN duyet_owner_boi_id TEXT REFERENCES nhan_su(id);
ALTER TABLE gop_y ADD COLUMN duyet_owner_luc   TEXT;

-- ---- Bằng chứng & từ chối ------------------------------------------------
-- bang_chung_url: link PR/commit ĐÃ MERGE. Điều kiện CỨNG để vào hoan_thanh.
-- KHÔNG dùng chung spec_reference: spec là "sẽ làm gì", bằng chứng là "đã làm
-- xong" — hai sự thật khác nhau (Rule 1).
ALTER TABLE gop_y ADD COLUMN bang_chung_url    TEXT;
ALTER TABLE gop_y ADD COLUMN ly_do_tu_choi     TEXT;
ALTER TABLE gop_y ADD COLUMN so_lan_gui_lai    INTEGER NOT NULL DEFAULT 0;

-- ---- Cờ dữ liệu cũ & nhắc SLA -------------------------------------------
ALTER TABLE gop_y ADD COLUMN can_xac_minh_lai  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gop_y ADD COLUMN nhac_duyet_luc    TEXT;    -- chống nhắc lặp mỗi 5 phút

-- ---- Ai đang cầm việc (dùng chung với SPEC-0003) -------------------------
-- Tập giá trị đóng, validate ở backend:
--   NGUOI_GUI | QL_CAP1 | OWNER | GAO | HOLY | KHIDOT | RUNNER | NONE
-- KHÔNG tái dùng nguoi_phu_trach_id: cột đó trỏ tới NHÂN SỰ THẬT, nhồi
-- 'HOLY'/'KHIDOT' vào sẽ buộc tạo hồ sơ nhân sự giả — hỏng Danh bạ, Chấm
-- công, đếm đầu người, bảng lương (Rule 9).
ALTER TABLE gop_y ADD COLUMN current_owner     TEXT NOT NULL DEFAULT 'NGUOI_GUI';
ALTER TABLE gop_y ADD COLUMN next_owner        TEXT NOT NULL DEFAULT 'QL_CAP1';

CREATE INDEX IF NOT EXISTS idx_gopy_nextowner ON gop_y (next_owner, trang_thai, tao_luc);
CREATE INDEX IF NOT EXISTS idx_gopy_xacminh   ON gop_y (can_xac_minh_lai);

-- ==========================================================================
-- BACKFILL — CHỈ trên cột vừa thêm (cột chưa từng có giá trị, nên đây không
-- phải "sửa dữ liệu cũ"). KHÔNG đụng gop_y.trang_thai của bất kỳ dòng nào.
-- ==========================================================================

-- Bản ghi đang chạy dở: đặt người đang chờ theo trạng thái hiện tại.
UPDATE gop_y SET next_owner = 'QL_CAP1', current_owner = 'NGUOI_GUI'
 WHERE trang_thai = 'moi';
UPDATE gop_y SET next_owner = 'OWNER',   current_owner = 'OWNER'
 WHERE trang_thai NOT IN ('moi', 'hoan_thanh', 'bi_chan');
UPDATE gop_y SET next_owner = 'NONE',    current_owner = 'NONE'
 WHERE trang_thai IN ('hoan_thanh', 'bi_chan');

-- Dữ liệu cũ mang nhãn "Hoàn thành" mà KHÔNG có bằng chứng → GẮN CỜ, không
-- đổi trạng thái. Giao diện sẽ hiện "Hoàn thành (chưa có bằng chứng — cần
-- xác minh lại)" màu xám. Trạng thái thôi nói dối ngay cả trước khi Sếp soát
-- xong. Sếp tự bấm "Mở lại" hoặc "Đúng là đã xong" từng cái.
UPDATE gop_y SET can_xac_minh_lai = 1
 WHERE trang_thai = 'hoan_thanh' AND (bang_chung_url IS NULL OR bang_chung_url = '');

-- Góp ý đã hoàn tất hợp lệ thì risk coi như đã chốt theo đề xuất AI, để danh
-- sách không hiện "chưa ai chốt" với việc đã xong từ lâu.
UPDATE gop_y SET risk = de_xuat_risk
 WHERE risk IS NULL AND de_xuat_risk IN ('LOW', 'MEDIUM', 'HIGH')
   AND trang_thai IN ('hoan_thanh', 'bi_chan');
