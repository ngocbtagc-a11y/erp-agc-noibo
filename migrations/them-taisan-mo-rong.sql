-- ==========================================================================
-- MIGRATION — Mở rộng module Tài sản (Asset Management Phase 1)
-- --------------------------------------------------------------------------
-- Theo docs/audit/AUDIT-TAISAN-MODULE.md (23/08/2026): module Tài sản đã có
-- sẵn (tai_san/tai_san_lich_su), 0 dòng dữ liệu thật trên production nên an
-- toàn để mở rộng schema. KHÔNG tạo bảng Asset song song — Extend, không
-- Create (Rule 1 One Fact One Owner, Rule 5 Reuse->Extend->Create).
--
-- Thêm: Danh mục tài sản + Vị trí tài sản (Master Data reusable, thay dần
-- 2 cột text tự do danh_muc/vi_tri cũ — VẪN GIỮ 2 cột cũ để không phá dữ
-- liệu/code hiện có, chỉ thêm cột *_id tham chiếu song song).
-- Thêm: tinh_trang (Condition, TÁCH khỏi trang_thai/Status theo đúng yêu
-- cầu không trộn 2 khái niệm). Thêm field tham chiếu vận hành (KHÔNG phải
-- sổ sách kế toán — xem N. MISA boundary trong audit): hãng SX/model/
-- serial/ngày mua/NCC/giá mua/hết bảo hành/ảnh/phòng ban sở hữu/audit cột.
--
--   Nạp máy:  node scripts/chay-migration.mjs them-taisan-mo-rong.sql
--   Nạp mây:  node scripts/chay-migration.mjs them-taisan-mo-rong.sql --remote
-- ==========================================================================

-- ---- Danh mục tài sản (Master Data, reusable — không gõ tự do) -----------
-- Cùng khuôn Data Lock đã dùng cho phong_ban/chuc_danh/don_vi_tinh (xem
-- src/dulieunen.js: id/ten/hoat_dong/trang_thai) — reuse thẳng danhSachDanhMuc/
-- themDanhMuc/suaDanhMuc/khoaDanhMuc chung, không viết lại logic khoá riêng.
CREATE TABLE IF NOT EXISTS tai_san_danh_muc (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ten        TEXT NOT NULL UNIQUE,
  hoat_dong  INTEGER NOT NULL DEFAULT 1,
  trang_thai TEXT NOT NULL DEFAULT 'nhap',
  tao_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- ---- Vị trí tài sản (Master Data — phase đầu phẳng, có parent nếu cần) ---
CREATE TABLE IF NOT EXISTS tai_san_vi_tri (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ten            TEXT NOT NULL UNIQUE,
  vi_tri_cha_id  INTEGER REFERENCES tai_san_vi_tri(id),
  hoat_dong      INTEGER NOT NULL DEFAULT 1,
  trang_thai     TEXT NOT NULL DEFAULT 'nhap',
  tao_luc        TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- ---- Mở rộng tai_san -------------------------------------------------------
-- Giữ nguyên cột danh_muc/vi_tri (text) cũ — không phá dữ liệu/code cũ.
ALTER TABLE tai_san ADD COLUMN danh_muc_id INTEGER REFERENCES tai_san_danh_muc(id);
ALTER TABLE tai_san ADD COLUMN vi_tri_id INTEGER REFERENCES tai_san_vi_tri(id);

-- Condition — TÁCH khỏi trang_thai (Status). tot|binh_thuong|can_sua|hong.
ALTER TABLE tai_san ADD COLUMN tinh_trang TEXT NOT NULL DEFAULT 'tot';

-- Tham chiếu vận hành/mua sắm — KHÔNG phải sổ sách kế toán (MISA vẫn là
-- nguồn chính thức nếu có), chỉ để biết đáng giá bao nhiêu khi quyết định
-- sửa hay thanh lý.
ALTER TABLE tai_san ADD COLUMN hang_sx TEXT;
ALTER TABLE tai_san ADD COLUMN model TEXT;
ALTER TABLE tai_san ADD COLUMN serial TEXT;
ALTER TABLE tai_san ADD COLUMN ngay_mua TEXT;
ALTER TABLE tai_san ADD COLUMN nha_cung_cap TEXT;
ALTER TABLE tai_san ADD COLUMN gia_mua INTEGER;
ALTER TABLE tai_san ADD COLUMN het_bao_hanh TEXT;

-- Phòng ban SỞ HỮU tài sản — KHÁC nguoi_giu_id (người đang giữ). 1 tài sản
-- có thể thuộc 1 phòng dù đang được 1 người ở phòng khác mượn tạm.
ALTER TABLE tai_san ADD COLUMN phong_ban_id INTEGER REFERENCES phong_ban(id);

-- Ảnh — base64 thẳng trong D1, cùng tiền lệ nhan_su.anh_chan_dung/anh_cccd
-- (quy mô công ty nhỏ, chưa cần R2 — xem docs/audit/AUDIT-TAISAN-MODULE.md).
ALTER TABLE tai_san ADD COLUMN anh TEXT;

ALTER TABLE tai_san ADD COLUMN tao_boi TEXT REFERENCES nhan_su(id);
ALTER TABLE tai_san ADD COLUMN cap_nhat_boi TEXT REFERENCES nhan_su(id);
ALTER TABLE tai_san ADD COLUMN cap_nhat_luc TEXT;

CREATE INDEX IF NOT EXISTS idx_tai_san_danh_muc ON tai_san(danh_muc_id);
CREATE INDEX IF NOT EXISTS idx_tai_san_vi_tri ON tai_san(vi_tri_id);
CREATE INDEX IF NOT EXISTS idx_tai_san_phong_ban ON tai_san(phong_ban_id);
CREATE INDEX IF NOT EXISTS idx_tai_san_serial ON tai_san(serial);

-- trang_thai KHÔNG có CHECK constraint (xem migrations/them-manv-taisan.sql)
-- nên thêm giá trị "mat" (LOST — tách khỏi "bao_hong", Sếp chốt 23/08/2026:
-- hỏng còn sửa được, mất thì không, khác hẳn nhau về nghiệp vụ) không cần
-- ALTER gì thêm — chỉ code (src/taisan.js) bắt đầu dùng giá trị mới.

-- ---- Seed Danh mục khởi điểm (ví dụ Sếp đưa trong yêu cầu gốc) — master
-- data cấu hình, không phải dữ liệu nghiệp vụ/khách hàng, INSERT OR IGNORE
-- nên chạy lại không trùng. Admin/HCNS sửa/thêm tiếp qua UI sau này. ------
INSERT OR IGNORE INTO tai_san_danh_muc (ten) VALUES
  ('Máy tính'), ('Màn hình'), ('Thiết bị văn phòng'), ('Thiết bị kho'),
  ('Máy móc sản xuất'), ('Điện thoại'), ('Camera'), ('Bàn ghế'), ('Khác');

INSERT OR IGNORE INTO tai_san_vi_tri (ten) VALUES
  ('Kho tầng 1'), ('Kho tầng 2'), ('Văn phòng'), ('Phòng kế toán'),
  ('Phòng CSKH'), ('Khu đóng hàng');
