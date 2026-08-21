-- ==========================================================================
-- MIGRATION — Theo dõi migration đã chạy (Phase 1: Migration Safety)
-- --------------------------------------------------------------------------
-- Mục tiêu DUY NHẤT: từ giờ luôn biết chắc migration nào đã lên bản thật,
-- migration nào chưa — chặn đứng kiểu sự cố "code đã deploy nhưng thiếu
-- bảng/cột" đã xảy ra vài lần (Trạm Mục Tiêu trắng trơn, vỡ bảng Đơn hoàn).
--
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file=migrations/them-schema-migrations.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file=migrations/them-schema-migrations.sql
--
-- KHÔNG đổi nghiệp vụ, KHÔNG đổi API, KHÔNG đụng bảng nào khác. Chỉ thêm
-- 1 bảng mới rồi tự ghi nhận (baseline) toàn bộ 31 file migration đang có
-- trong thư mục migrations/ tại thời điểm này (21/08/2026) là ĐÃ CHẠY —
-- đã xác minh qua sqlite_master trên D1 thật (bảng/cột tương ứng đều có),
-- không phải đoán.
--
-- TỪ FILE NÀY TRỞ ĐI: dùng `node scripts/chay-migration.mjs <ten-file.sql>
-- --remote` để chạy migration MỚI thay vì gọi wrangler trực tiếp — script tự
-- ghi nhận vào bảng này sau khi chạy xong, khỏi quên. Xem HUONG-DAN-NGUOI-MOI.md.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename    TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

INSERT OR IGNORE INTO schema_migrations (filename) VALUES
  ('kho-mau.sql'),
  ('them-canhbao-kho.sql'),
  ('them-canhbao-nghiemtrong.sql'),
  ('them-chat-daxem.sql'),
  ('them-chat-dm.sql'),
  ('them-chat.sql'),
  ('them-congviec.sql'),
  ('them-cot-sanpham.sql'),
  ('them-doisoat.sql'),
  ('them-donhang-huy.sql'),
  ('them-donhang-mavandon.sql'),
  ('them-donhang.sql'),
  ('them-hanghong.sql'),
  ('them-hoso-nhansu.sql'),
  ('them-ketoan-trasoat.sql'),
  ('them-khachhang-hoan-thang.sql'),
  ('them-khieunai-lydo.sql'),
  ('them-khieunai-minhchung.sql'),
  ('them-kho.sql'),
  ('them-luong-tra-soat.sql'),
  ('them-mavandon.sql'),
  ('them-muctieu.sql'),
  ('them-phoihop-congviec.sql'),
  ('them-sao-nhansu.sql'),
  ('them-shopee.sql'),
  ('them-sku-map.sql'),
  ('them-thong-bao.sql'),
  ('them-thongbao-canhan.sql'),
  ('them-tiktok.sql'),
  ('them-tinhtrang-hang.sql'),
  ('them-vinhdanh-sosao.sql'),
  ('them-vinhdanh.sql'),
  ('them-schema-migrations.sql');
