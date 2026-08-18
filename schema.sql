-- ==========================================================================
-- ERP Alpha Green Commerce — Cấu trúc database (Cloudflare D1 / SQLite)
-- ==========================================================================

-- Xoá theo thứ tự con trước cha (khoá ngoại) để không vướng ràng buộc.
DROP TABLE IF EXISTS giao_dich_kho;
DROP TABLE IF EXISTS lo_hang;
DROP TABLE IF EXISTS san_pham;
DROP TABLE IF EXISTS phien;
DROP TABLE IF EXISTS lan_dang_nhap_hong;
DROP TABLE IF EXISTS tai_khoan;
DROP TABLE IF EXISTS nhan_su;

-- ---- Nhân sự -------------------------------------------------------------
-- Lương để ở đây nhưng máy chủ CHỈ trả về cho người có quyền.
CREATE TABLE nhan_su (
  id            TEXT PRIMARY KEY,
  ho_ten        TEXT NOT NULL,
  viet_tat      TEXT NOT NULL,
  chuc_vu       TEXT NOT NULL,
  bo_phan       TEXT NOT NULL,
  sdt           TEXT,
  email         TEXT,
  quan_ly_id    TEXT REFERENCES nhan_su(id),
  phap_nhan     TEXT NOT NULL DEFAULT 'Công ty',  -- luôn 'Công ty' (đã bỏ HKD khỏi giao diện)
  trang_thai    TEXT NOT NULL DEFAULT 'cho_ky',   -- da_ky | thu_viec | cho_ky | can_trao_doi | parttime
  ngay_vao      TEXT,
  luong         INTEGER,                          -- đồng/tháng; NULL = chưa có
  dang_lam      INTEGER NOT NULL DEFAULT 1,
  -- Hồ sơ mở rộng (đón nhân sự mới bằng ảnh CCCD). CCCD/BHXH nhạy cảm —
  -- máy chủ chỉ trả cho người có quyền, giống cột lương. Ảnh để ở R2.
  so_cccd        TEXT,
  ngay_sinh      TEXT,
  gioi_tinh      TEXT,
  que_quan       TEXT,
  noi_thuong_tru TEXT,
  so_bhxh        TEXT,
  anh_cccd       TEXT,
  anh_chan_dung  TEXT
);

CREATE INDEX idx_nhan_su_bo_phan ON nhan_su(bo_phan);

-- ---- Tài khoản đăng nhập -------------------------------------------------
-- mat_khau_hash: định dạng "pbkdf2$<số vòng>$<salt base64>$<hash base64>"
-- KHÔNG BAO GIỜ lưu mật khẩu dạng chữ thường.
CREATE TABLE tai_khoan (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_su_id     TEXT NOT NULL UNIQUE REFERENCES nhan_su(id),
  ten_dang_nhap  TEXT NOT NULL UNIQUE,
  mat_khau_hash  TEXT NOT NULL,
  vai_tro        TEXT NOT NULL,   -- xem src/quyen.js
  phai_doi_mk    INTEGER NOT NULL DEFAULT 1,
  kich_hoat      INTEGER NOT NULL DEFAULT 1,
  tao_luc        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Phiên đăng nhập -----------------------------------------------------
-- Chỉ lưu HASH của token. Nếu database lộ, kẻ lấy được cũng không mạo danh
-- được ai, vì token gốc không nằm ở đây.
CREATE TABLE phien (
  token_hash  TEXT PRIMARY KEY,
  tai_khoan_id INTEGER NOT NULL REFERENCES tai_khoan(id) ON DELETE CASCADE,
  tao_luc     TEXT NOT NULL DEFAULT (datetime('now')),
  het_han     TEXT NOT NULL
);

CREATE INDEX idx_phien_het_han ON phien(het_han);

-- ---- Chặn dò mật khẩu ----------------------------------------------------
CREATE TABLE lan_dang_nhap_hong (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_dang_nhap TEXT NOT NULL,
  luc           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dang_nhap_hong ON lan_dang_nhap_hong(ten_dang_nhap, luc);

-- ==========================================================================
-- MODULE KHO — Xuất / Nhập / Tồn
-- --------------------------------------------------------------------------
-- Nguyên tắc: TỒN KHO KHÔNG lưu thành một con số để rồi cộng trừ tay (dễ
-- lệch). Tồn LUÔN được tính lại bằng cách cộng dồn sổ cái giao_dich_kho.
-- Mỗi lần nhập/xuất/điều chỉnh là một dòng bất biến, không sửa — muốn sửa
-- thì ghi thêm một dòng điều chỉnh. Nhờ vậy số liệu luôn truy được nguồn gốc.
--
-- Giờ giấc (cột luc, tao_luc) lưu theo giờ Việt Nam (+7) để báo cáo theo
-- ngày khớp lịch thực tế, không lệch múi giờ như giờ UTC mặc định.
-- ==========================================================================

-- ---- Danh mục sản phẩm (SKU) ---------------------------------------------
CREATE TABLE san_pham (
  id            TEXT PRIMARY KEY,
  ma_sku        TEXT NOT NULL UNIQUE,              -- mã hàng, ví dụ HN-MY-1000
  ten           TEXT NOT NULL,
  danh_muc      TEXT,                              -- Hạt dinh dưỡng, Trái cây sấy...
  don_vi        TEXT NOT NULL DEFAULT 'sản phẩm',  -- hộp, gói, kg, túi...
  theo_doi_hsd  INTEGER NOT NULL DEFAULT 1,        -- 1 = quản theo lô + hạn sử dụng (FEFO)
  ton_toi_thieu INTEGER NOT NULL DEFAULT 0,        -- dưới mức này thì cảnh báo hết hàng
  dang_ban      INTEGER NOT NULL DEFAULT 1,        -- 0 = ngừng kinh doanh (ẩn khỏi danh sách)
  tao_luc       TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX idx_san_pham_danh_muc ON san_pham(danh_muc);

-- ---- Lô hàng (chỉ dùng cho SKU có theo dõi hạn sử dụng) -------------------
-- Mỗi lần nhập một mặt hàng có HSD sẽ tạo một lô. Xuất kho ưu tiên lô cận
-- hạn nhất trước (FEFO) — đúng đặc thù thực phẩm.
CREATE TABLE lo_hang (
  id           TEXT PRIMARY KEY,
  san_pham_id  TEXT NOT NULL REFERENCES san_pham(id),
  so_lo        TEXT,                               -- mã lô nhà cung cấp (có thể để trống)
  han_su_dung  TEXT,                               -- YYYY-MM-DD
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX idx_lo_hang_san_pham ON lo_hang(san_pham_id);

-- ---- Sổ cái kho: mọi lần nhập / xuất / điều chỉnh ------------------------
-- so_luong là MỨC THAY ĐỔI có dấu: nhập = dương, xuất = âm, điều chỉnh = ±.
-- Tồn của một SKU  = SUM(so_luong) theo san_pham_id.
-- Tồn của một lô   = SUM(so_luong) theo lo_hang_id.
CREATE TABLE giao_dich_kho (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  phieu_id     TEXT NOT NULL,                      -- gom các dòng cùng một phiếu nhập/xuất
  san_pham_id  TEXT NOT NULL REFERENCES san_pham(id),
  lo_hang_id   TEXT REFERENCES lo_hang(id),        -- NULL nếu SKU không theo dõi HSD
  loai         TEXT NOT NULL,                      -- 'nhap' | 'xuat' | 'dieu_chinh'
  so_luong     INTEGER NOT NULL,                   -- có dấu (xem trên)
  don_gia      INTEGER,                            -- đồng/đơn vị, dùng cho nhập (giá vốn)
  doi_tac      TEXT,                               -- NCC (nhập) hoặc kênh/đơn (xuất)
  ghi_chu      TEXT,
  nguoi_id     TEXT REFERENCES nhan_su(id),        -- ai thực hiện
  luc          TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX idx_gdk_san_pham ON giao_dich_kho(san_pham_id);
CREATE INDEX idx_gdk_lo       ON giao_dich_kho(lo_hang_id);
CREATE INDEX idx_gdk_luc      ON giao_dich_kho(luc);
CREATE INDEX idx_gdk_phieu    ON giao_dich_kho(phieu_id);
