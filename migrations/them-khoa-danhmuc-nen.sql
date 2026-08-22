-- ==========================================================================
-- MIGRATION — Data Lock / Master Data Protection
-- --------------------------------------------------------------------------
-- Thêm trạng thái 'nhap' (sửa tự do) / 'da_khoa' (chỉ Admin sửa) cho 5 bảng
-- dữ liệu nền đã có UI thật. Mặc định 'nhap' cho MỌI dòng — kể cả dòng đã
-- có sẵn từ trước — KHÔNG tự khoá gì cả (không đoán, không auto-lock).
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file migrations/them-khoa-danhmuc-nen.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file migrations/them-khoa-danhmuc-nen.sql
-- ==========================================================================

ALTER TABLE phong_ban    ADD COLUMN trang_thai TEXT NOT NULL DEFAULT 'nhap';
ALTER TABLE chuc_danh    ADD COLUMN trang_thai TEXT NOT NULL DEFAULT 'nhap';
ALTER TABLE don_vi_tinh  ADD COLUMN trang_thai TEXT NOT NULL DEFAULT 'nhap';
ALTER TABLE san_pham     ADD COLUMN trang_thai TEXT NOT NULL DEFAULT 'nhap';
ALTER TABLE nhan_su      ADD COLUMN trang_thai_dl TEXT NOT NULL DEFAULT 'nhap';
-- (đặt tên trang_thai_dl cho nhan_su vì cột "trang_thai" đã dùng cho trạng
--  thái hợp đồng thử việc/đã ký — không được trùng tên, khác ý nghĩa hẳn)

-- Nhật ký sửa dữ liệu nền ĐÃ KHOÁ — chỉ ghi khi sửa record da_khoa (không
-- ghi lúc còn nháp, tránh log rác trong lúc đang nhập/thử lần đầu).
CREATE TABLE IF NOT EXISTS lich_su_thay_doi_nen (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bang        TEXT NOT NULL,        -- 'phong_ban' | 'chuc_danh' | 'don_vi_tinh' | 'san_pham' | 'nhan_su'
  ban_ghi_id  TEXT NOT NULL,
  truong      TEXT NOT NULL,        -- tên cột bị đổi
  gia_tri_cu  TEXT,
  gia_tri_moi TEXT,
  nguoi_id    TEXT REFERENCES nhan_su(id),
  nguoi_ten   TEXT,
  luc         TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_lstdn_bang_banghi ON lich_su_thay_doi_nen(bang, ban_ghi_id);
