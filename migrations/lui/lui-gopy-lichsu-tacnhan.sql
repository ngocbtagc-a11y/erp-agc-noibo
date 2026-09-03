-- ==========================================================================
-- LÙI them-gopy-lichsu-tacnhan.sql — trả bảng nhật ký về hình dạng cũ.
-- --------------------------------------------------------------------------
-- MẤT 0 DÒNG DỮ LIỆU. Bảng gốc chưa từng bị xoá, nó chỉ đang mang tên
-- gop_y_lich_su_luu_20260827. Lùi xong nó trở lại đúng tên cũ.
--
-- REV-0016 mục 2 — VÌ SAO BẢN TRƯỚC PHẢI VIẾT LẠI:
-- Bản trước chỉ đổi tên ngược rồi để bảng mới nằm lại dưới tên
-- gop_y_lich_su_v2. Lùi thì sạch, nhưng TIẾN LÊN LẠI THÌ KẸT: file xuôi vấp
-- ngay "table gop_y_lich_su_v2 already exists". Nút hoàn tác chỉ bấm được
-- một lần thì không phải nút hoàn tác. Nay lùi–tiến–lùi–tiến chạy bao nhiêu
-- vòng cũng được.
--
-- DÒNG SINH RA TRONG THỜI GIAN DÙNG BẢNG MỚI ĐI ĐÂU:
--   1. Mọi dòng mới → cất hết sang gop_y_lich_su_luu_lui (bảng lưu, cộng
--      dồn, không migration nào đụng tới, giữ đủ cả tac_nhan/uy_quyen_boi_id).
--   2. Dòng do NGƯỜI bấm → còn được TRẢ VỀ đúng bảng nhật ký cũ, nên lùi
--      xong giao diện vẫn đọc được. Dòng do MÁY ghi không trả về được: bảng
--      cũ có nguoi_doi_id NOT NULL, dưới lược đồ cũ dòng đó vốn không tồn
--      tại được. Nó nằm nguyên ở bảng lưu bước 1.
--   3. Xoá bảng mới — SAU khi bước 1 đã chép xong từng dòng. Cả file chạy
--      trong MỘT giao dịch (wrangler d1 execute --file), nên bước 1 hỏng là
--      bước 3 không bao giờ chạy.
--
-- Chạy:  npx wrangler d1 execute crm-agc --local --file=migrations/lui-gopy-lichsu-tacnhan.sql
-- (đổi --local thành --remote nếu phải lùi bản thật; nhớ deploy lại code cũ
--  TRƯỚC khi lùi DB, không thì code mới sẽ ghi vào bảng đã đổi tên)
--
-- Xem lại dòng đã cất:
--   SELECT * FROM gop_y_lich_su_luu_lui ORDER BY lui_luc DESC, luc DESC;
-- ==========================================================================

-- ---- 1. Bảng lưu cho dòng sinh ra trong thời gian dùng bảng mới ----------
-- Không khoá chính tự tăng, không CHECK: đây là bảng LƯU, nhiệm vụ duy nhất
-- là không đánh mất chữ nào. Lùi nhiều lần thì cộng dồn nhiều đợt.
CREATE TABLE IF NOT EXISTS gop_y_lich_su_luu_lui (
  id                    INTEGER,
  gop_y_id              INTEGER,
  tu_trang_thai         TEXT,
  den_trang_thai        TEXT,
  nguoi_doi_id          TEXT,
  nguoi_thuc_hien_loai  TEXT,
  tac_nhan              TEXT,
  uy_quyen_boi_id       TEXT,
  job_id                TEXT,
  ghi_chu               TEXT,
  luc                   TEXT,
  lui_luc               TEXT
);

INSERT INTO gop_y_lich_su_luu_lui
  (id, gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id,
   nguoi_thuc_hien_loai, tac_nhan, uy_quyen_boi_id, job_id, ghi_chu, luc, lui_luc)
SELECT id, gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id,
       nguoi_thuc_hien_loai, tac_nhan, uy_quyen_boi_id, job_id, ghi_chu, luc,
       datetime('now', '+7 hours')
  FROM gop_y_lich_su
 WHERE id NOT IN (SELECT id FROM gop_y_lich_su_luu_20260827);

-- ---- 2. Trả dòng do NGƯỜI bấm về đúng bảng nhật ký cũ --------------------
INSERT OR IGNORE INTO gop_y_lich_su_luu_20260827
  (id, gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, ghi_chu, luc)
SELECT id, gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, ghi_chu, luc
  FROM gop_y_lich_su
 WHERE nguoi_doi_id IS NOT NULL
   AND id NOT IN (SELECT id FROM gop_y_lich_su_luu_20260827);

-- ---- 3. Bỏ bảng mới, trả bản lưu gốc về đúng tên -------------------------
-- DROP này an toàn: mọi dòng của bảng vừa được chép sang gop_y_lich_su_luu_lui
-- ở bước 1, trong cùng một giao dịch.
DROP TABLE gop_y_lich_su;
ALTER TABLE gop_y_lich_su_luu_20260827 RENAME TO gop_y_lich_su;

DELETE FROM schema_migrations WHERE filename = 'them-gopy-lichsu-tacnhan.sql';
