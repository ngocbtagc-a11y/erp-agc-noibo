-- ==========================================================================
-- MIGRATION — Canh hạn mức GHI của D1 (REV-0031 · Việc 1)
-- --------------------------------------------------------------------------
-- Vì sao: `wrangler d1 info crm-agc` ngày 28/08/2026 cho rows_written_24h =
-- 346.688 trên hạn mức 100.000 dòng/ngày của gói miễn phí — vượt 3,47 lần,
-- kéo dài nhiều tuần mà KHÔNG AI ĐƯỢC BÁO. Vượt hạn mức là D1 chặn ghi: đơn
-- hoàn ngừng cập nhật và kho vận không còn thấy đơn quá hạn.
--
-- Bảng này giữ ĐÚNG MỘT DÒNG MỖI NGÀY: tổng số dòng mà luồng đồng bộ sàn đã
-- ghi (lấy từ `meta.rows_written` của chính D1, đã gồm dòng chỉ mục) và cờ
-- "đã kêu Telegram chưa" để không nhắn lặp. Xem src/canh-bao-ghi.js.
--
--   Nạp máy:  npm run nap-canhbaoghi-may
--   Nạp mây:  npm run nap-canhbaoghi
-- ==========================================================================

CREATE TABLE IF NOT EXISTS d1_ghi_ngay (
  ngay     TEXT PRIMARY KEY,                  -- YYYY-MM-DD theo giờ VN
  so_dong  INTEGER NOT NULL DEFAULT 0,        -- tổng dòng đã ghi trong ngày
  da_bao   INTEGER NOT NULL DEFAULT 0         -- 1 = đã bắn Telegram cảnh báo hôm nay
);
