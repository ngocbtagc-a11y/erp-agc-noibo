-- Bảng tổng hợp số đơn hoàn/hủy theo KHÁCH HÀNG + THÁNG, tồn tại LÂU DÀI
-- (không bị cron donDepDuLieuNgoaiThang xoá theo tháng như đơn_hoan gốc).
-- Được cộng dồn NGAY TRƯỚC khi mỗi tháng cũ bị xoá khỏi don_hoan — xem
-- donDepDuLieuNgoaiThang() trong src/index.js. Dùng để CSKH xem xếp hạng
-- khách hoàn/hủy nhiều trong nhiều tháng mà không phá luật "đơn hoàn chỉ
-- giữ trong tháng làm việc" (Sếp Ngọc chốt 19/08/2026).
CREATE TABLE IF NOT EXISTS khach_hang_hoan_thang (
  nguoi_mua TEXT NOT NULL,
  thang     TEXT NOT NULL,   -- 'YYYY-MM' (giờ VN)
  nguon     TEXT NOT NULL,   -- 'shopee' | 'tiktok'
  so_don    INTEGER NOT NULL DEFAULT 0,
  so_huy    INTEGER NOT NULL DEFAULT 0,
  gan_nhat  INTEGER,         -- unix giây, đơn mới nhất được cộng vào tháng này
  PRIMARY KEY (nguoi_mua, thang, nguon)
);
