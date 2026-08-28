-- ==========================================================================
-- SPEC-0002 / ADR-0006 câu 9 (Sếp chốt A3) — DỰNG LẠI SỔ NHẬT KÝ GÓP Ý
-- --------------------------------------------------------------------------
-- VẤN ĐỀ: gop_y_lich_su.nguoi_doi_id đang NOT NULL REFERENCES nhan_su(id).
-- Nghĩa là MỌI hành động không do một con người bấm (SLA tự đẩy cấp, runner,
-- watchdog) đều KHÔNG ghi được lịch sử nếu không mạo danh một nhân sự thật.
-- Đây là thứ chặn cả hệ tự động, và cũng là lý do không ai dám sửa nhãn
-- "Hoàn thành" sai của góp ý #1 (sửa là phải mạo danh Sếp Ngọc).
--
-- SQLite/D1 KHÔNG bỏ được NOT NULL bằng ALTER TABLE → bắt buộc dựng lại bảng.
-- Phương án đã duyệt: RENAME-SWAP, KHÔNG `DROP`. Bảng cũ giữ nguyên toàn bộ
-- dòng dưới tên gop_y_lich_su_luu_20260827 làm bản lưu. Lùi = 2 lệnh rename
-- ngược (lui-gopy-lichsu-tacnhan.sql), mất 0 dòng.
--
-- BA SỰ THẬT KHÁC NHAU, ba cột khác nhau (gộp làm một chính là gốc của lỗi):
--   nguoi_doi_id     — AI BẤM?            NULL nếu không phải người
--   tac_nhan         — CÁI GÌ CHẠY?       'SLA' | 'RUNNER' | 'HỒ LY' | 'KHỈ ĐỘT'
--   uy_quyen_boi_id  — AI CHỊU TRÁCH NHIỆM? người đã duyệt/bật chuỗi tự động
--
-- CHECK ép ở TẦNG DB: là người thì bắt buộc có id; là máy thì CẤM có id và
-- BẮT BUỘC có nhãn tác nhân. Không mạo danh được kể cả khi code viết sai.
--
-- Chạy:  node scripts/chay-migration.mjs them-gopy-lichsu-tacnhan.sql
-- (thêm --remote khi lên bản thật, NGAY SAU khi deploy code)
-- ==========================================================================

-- ---- CHỐT CHẶN CHẠY LẠI --------------------------------------------------
-- schema_migrations.filename là PRIMARY KEY. Chạy lần 2, dòng này báo lỗi
-- UNIQUE constraint và file DỪNG NGAY TẠI ĐÂY — trước mọi lệnh đổi cấu trúc.
-- Nhờ vậy chạy 2 lần không nhân đôi dòng nào, không mất dòng nào, không đổi
-- tên nhầm bảng. Thấy lỗi "UNIQUE constraint failed: schema_migrations" tức
-- là migration này ĐÃ CHẠY RỒI, không phải hỏng.
INSERT INTO schema_migrations (filename) VALUES ('them-gopy-lichsu-tacnhan.sql');

-- ---- Bảng mới ------------------------------------------------------------
CREATE TABLE gop_y_lich_su_v2 (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  gop_y_id              INTEGER NOT NULL REFERENCES gop_y(id),
  tu_trang_thai         TEXT,
  den_trang_thai        TEXT NOT NULL,
  nguoi_doi_id          TEXT REFERENCES nhan_su(id),    -- NULL = KHÔNG PHẢI người
  nguoi_thuc_hien_loai  TEXT NOT NULL DEFAULT 'nguoi',  -- nguoi | he_thong | ho_ly | khi_dot
  tac_nhan              TEXT,          -- nhãn hiển thị khi không phải người
  uy_quyen_boi_id       TEXT REFERENCES nhan_su(id),    -- ai đã cho phép chuỗi tự động này
  job_id                TEXT,          -- nối sang agent_run (SPEC-0003), nay để trống
  ghi_chu               TEXT,
  luc                   TEXT NOT NULL,
  CHECK (
    (nguoi_thuc_hien_loai =  'nguoi' AND nguoi_doi_id IS NOT NULL) OR
    (nguoi_thuc_hien_loai <> 'nguoi' AND nguoi_doi_id IS NULL AND tac_nhan IS NOT NULL)
  )
);

-- ---- Chép nguyên dữ liệu cũ ---------------------------------------------
-- Giữ nguyên id để mọi tham chiếu (nếu có) không lệch. Mọi dòng cũ đều do
-- người bấm → nguoi_thuc_hien_loai = 'nguoi'. KHÔNG diễn giải lại lịch sử
-- (Rule 10): đọc y hệt trước đây.
INSERT INTO gop_y_lich_su_v2
  (id, gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, nguoi_thuc_hien_loai, ghi_chu, luc)
SELECT id, gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, 'nguoi', ghi_chu, luc
  FROM gop_y_lich_su;

-- ---- Đổi tên: bảng cũ thành BẢN LƯU, bảng mới lên thay ------------------
-- KHÔNG có lệnh DROP nào trong file này. Xoá bản lưu hay không là quyết định
-- riêng của Sếp, vài tháng sau, khi đã yên tâm.
ALTER TABLE gop_y_lich_su    RENAME TO gop_y_lich_su_luu_20260827;
ALTER TABLE gop_y_lich_su_v2 RENAME TO gop_y_lich_su;

CREATE INDEX IF NOT EXISTS idx_gopylichsu_gopy ON gop_y_lich_su (gop_y_id, luc);

-- ---- Tự đối chiếu --------------------------------------------------------
-- Chạy tay sau migration, hai số PHẢI bằng nhau:
--   SELECT (SELECT COUNT(*) FROM gop_y_lich_su) AS moi,
--          (SELECT COUNT(*) FROM gop_y_lich_su_luu_20260827) AS luu;
