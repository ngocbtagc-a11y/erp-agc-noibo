-- ==========================================================================
-- ĐỒNG HỒ SLA CỦA GÓP Ý — CỘT RIÊNG `gop_y.cho_duyet_tu_luc`
-- --------------------------------------------------------------------------
-- REV-0030 lỗi 1 (CỬA THỨ 14). Trước bản vá, `gopYNhacSla()` đo tuổi hàng chờ
-- bằng `COALESCE(cap_nhat_luc, tao_luc)`. Mà MỌI câu UPDATE trong
-- `gopYDoiTrangThai()` đều ghi `cap_nhat_luc = now`, kể cả nhánh "lưu tại
-- chỗ" KHÔNG đổi trạng thái (giao người phụ trách, dán bằng chứng, gỡ cờ xác
-- minh) và cả cặp vào/ra 'bi_chan'.
--
-- ĐO ĐƯỢC TRÊN CÂY CŨ: góp ý chờ cổng 1 từ 24/08 (4 ngày) → admin bấm "giao
-- người phụ trách" → 200 → cap_nhat_luc 2026-08-24 10:00 → 2026-08-28 10:00 →
-- chạy cron → next_owner VẪN 'QL_CAP1', SLA KHÔNG đẩy lên Sếp. Lặp lại được
-- vô hạn, không một dòng cảnh báo, NỔ CẢ KHI KHÔNG AI CỐ Ý.
--
-- Đây là một trong BA CHỖ ĐỠ mà ADR-0015 hứa với Sếp cho rủi ro "một người
-- duyệt" (LOW không lên Sếp · SLA đẩy lên Sếp ngày thứ 5 · cờ uỷ quyền). Rút
-- được đồng hồ ra là rút việc khỏi hàng chờ của Sếp vô thời hạn.
--
-- CÁCH VÁ: tách hẳn hai khái niệm vốn không phải một.
--   cap_nhat_luc     — "bản ghi này sửa lần cuối lúc nào" (mọi lần lưu)
--   cho_duyet_tu_luc — "việc này vào hàng chờ HIỆN TẠI từ lúc nào"
-- Chỉ được đóng dấu khi việc THẬT SỰ sang một hàng chờ mới: gửi mới · qua một
-- cổng duyệt · đổi trạng thái. Không bao giờ vì một lần lưu tại chỗ.
--
-- TOÀN BỘ FILE LÀ ADD COLUMN + CREATE INDEX + backfill CHỈ TRÊN CỘT MỚI.
-- Không DROP, không UPDATE cột nghiệp vụ cũ, không đổi trạng thái bản ghi nào.
--
-- Chạy:  node scripts/chay-migration.mjs them-gopy-cho-duyet-tu-luc.sql
--        node scripts/chay-migration.mjs them-gopy-cho-duyet-tu-luc.sql --remote
--
-- THỨ TỰ TRIỂN KHAI: DB TRƯỚC, CODE SAU. Nhưng KHÔNG còn là điều kiện sống
-- còn (bài học BH-48): thiếu cột thì `gopYDongDauChoDuyet()` nuốt đúng lỗi
-- "no such column" và `gopYNhacSla()` tự lùi về đo bằng `cap_nhat_luc` — tức
-- là quay lại đúng hành vi cũ, kèm một dòng console.warn, chứ không 500.
-- ==========================================================================

-- Chốt chặn chạy lại — schema_migrations.filename là PRIMARY KEY.
INSERT INTO schema_migrations (filename) VALUES ('them-gopy-cho-duyet-tu-luc.sql');

ALTER TABLE gop_y ADD COLUMN cho_duyet_tu_luc TEXT;

-- Cron quét theo (trang_thai, next_owner) rồi mới so ngày — chỉ mục này để
-- câu SLA không phải quét cả bảng khi số góp ý lớn dần.
CREATE INDEX IF NOT EXISTS idx_gopy_cho_duyet_tu_luc ON gop_y (trang_thai, next_owner, cho_duyet_tu_luc);

-- ---- Backfill: CHỈ trên cột vừa thêm ------------------------------------
-- Dữ liệu cũ lấy đúng cái đồng hồ cũ đang dùng, để không có việc nào nhảy
-- vọt lên "quá hạn" hay bị lùi lại ngay sau khi nạp. NULL cũng chạy được
-- (code COALESCE hai bậc), nhưng để trống thì mọi việc cũ đổ dồn về tao_luc
-- và có thể đẩy một loạt lên Sếp cùng lúc.
UPDATE gop_y SET cho_duyet_tu_luc = COALESCE(cap_nhat_luc, tao_luc)
 WHERE cho_duyet_tu_luc IS NULL;

-- ==========================================================================
-- TỰ KIỂM BẮT BUỘC — cùng khuôn CHECK có tên của them-quyen-duyet-gopy.sql
-- (REV-0027 L5). Backfill sót một dòng nghĩa là việc đó mất đồng hồ; im lặng
-- đi qua thì đúng lúc bận nhất mới phát hiện.
-- SQLite in TÊN RÀNG BUỘC chứ không in tên bảng, nên tên phải tự nói ra
-- chuyện gì hỏng:
--     CHECK constraint failed: backfill_cho_duyet_tu_luc_khong_duoc_sot_dong
-- ==========================================================================
CREATE TABLE IF NOT EXISTS kiem_backfill_cho_duyet_tu_luc (
  ok INTEGER NOT NULL
    CONSTRAINT backfill_cho_duyet_tu_luc_khong_duoc_sot_dong CHECK (ok = 1)
);

INSERT INTO kiem_backfill_cho_duyet_tu_luc (ok)
SELECT CASE WHEN (SELECT COUNT(*) FROM gop_y WHERE cho_duyet_tu_luc IS NULL) = 0
            THEN 1 ELSE 0 END;

DROP TABLE kiem_backfill_cho_duyet_tu_luc;
