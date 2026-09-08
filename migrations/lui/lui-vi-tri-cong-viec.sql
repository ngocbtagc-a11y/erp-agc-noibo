-- ==========================================================================
-- LÙI them-vi-tri-cong-viec.sql
-- --------------------------------------------------------------------------
-- ⚠️ FILE LÙI — KHÔNG BAO GIỜ CHẠY TỰ ĐỘNG. Xem migrations/lui/README.md.
--
-- GỘP NGƯỢC TRƯỚC, BỎ CỘT SAU — không ai mất quyền. Bước 1 đẩy ô 2 trở lại ô
-- 1 cho những dòng đang là `nguoi_dung` (đúng ca mà file xuôi đã tách ra),
-- bước 3 mới bỏ cột. Cả file chạy trong MỘT giao dịch nên bước 1 hỏng là bước
-- 3 không bao giờ chạy.
--
-- CA KHÔNG GỘP NGƯỢC ĐƯỢC — NÓI THẲNG RA:
-- Sau khi tách, Sếp có thể đặt một người vừa là `admin_backup` (ô 1) vừa là
-- `ke_toan_truong` (ô 2) — chị Phan Thị Hằng đúng là ca đó. MỘT CỘT KHÔNG
-- CHỨA ĐƯỢC HAI GIÁ TRỊ. Bước 1 vì vậy CHỈ gộp ngược khi ô 1 đang là
-- `nguoi_dung`; các dòng có ô 1 mạnh hơn thì GIỮ ô 1 và MẤT ô 2 (người đó
-- quay về đúng quyền của `admin_backup`, tức là hẹp hơn trước khi lùi).
-- Bảng `vi_tri_cong_viec_luu_lui` cất lại đủ cả hai giá trị để dựng lại
-- được bằng tay. Đây là cái giá thật của việc lùi, không phải chi tiết nhỏ.
--
-- THỨ TỰ NGƯỢC: DEPLOY CODE CŨ TRƯỚC, RỒI MỚI LÙI DB.
--
-- Chạy:
--   npx wrangler d1 execute crm-agc --remote --file=migrations/lui/lui-vi-tri-cong-viec.sql
--
-- Xem lại giá trị đã cất:
--   SELECT * FROM vi_tri_cong_viec_luu_lui ORDER BY lui_luc DESC;
-- ==========================================================================

-- ---- 1. Cất cả hai ô ------------------------------------------------------
CREATE TABLE IF NOT EXISTS vi_tri_cong_viec_luu_lui (
  tai_khoan_id     INTEGER,
  ten_dang_nhap    TEXT,
  vai_tro          TEXT,
  vi_tri_cong_viec TEXT,
  gop_nguoc_duoc   INTEGER,   -- 1 = ô 1 là 'nguoi_dung' nên gộp ngược trọn vẹn
  lui_luc          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO vi_tri_cong_viec_luu_lui
       (tai_khoan_id, ten_dang_nhap, vai_tro, vi_tri_cong_viec, gop_nguoc_duoc)
SELECT id, ten_dang_nhap, vai_tro, vi_tri_cong_viec,
       CASE WHEN vai_tro = 'nguoi_dung' THEN 1 ELSE 0 END
  FROM tai_khoan
 WHERE vi_tri_cong_viec IS NOT NULL;

-- ---- 2. Gộp ngược về một cột ---------------------------------------------
UPDATE tai_khoan
   SET vai_tro = vi_tri_cong_viec
 WHERE vi_tri_cong_viec IS NOT NULL
   AND vai_tro = 'nguoi_dung';

-- ---- 3. Bỏ cột + gỡ chốt trong sổ ----------------------------------------
-- Gỡ chốt để chạy lại file xuôi không vấp "duplicate column name" (đúng bài
-- học của lui-gopy-congduyet.sql).
DROP INDEX IF EXISTS idx_taikhoan_vitri;
ALTER TABLE tai_khoan DROP COLUMN vi_tri_cong_viec;
DELETE FROM schema_migrations WHERE filename = 'them-vi-tri-cong-viec.sql';
