-- ==========================================================================
-- CTL-0022 — KHUNG LƯU TRỮ SAO LƯU THEO NĂM / THÁNG
-- Sếp Ngọc chốt 2026-08-27: "khung lưu trữ theo tháng, dữ liệu cập nhật theo
-- ngày vào file tháng đó, 1 năm chia thành 12 tháng" · "sau 1 tháng thì nén luôn"
--
-- Thay cho luật cũ "giữ 30 bản ngày rồi cuộn vòng đè lên bản cũ nhất".
-- KHÔNG XOÁ GÌ NỮA — chỉ GỘP LẠI cho gọn, và chỉ xoá thư mục ngày SAU KHI đã
-- đọc lại file gộp trên Drive và đối chiếu mã kiểm CRC32 từng byte.
-- ==========================================================================

-- Một dòng cho mỗi lượt GỘP đang chạy dở hoặc đã xong.
--   'thang-2026-07' → gộp 30 thư mục ngày của tháng 07 thành 2026-07.zip
--   'nam-2026'      → gộp 12 file tháng của năm 2026 thành 2026.zip
--
-- Vì sao phải có bảng riêng chứ không dùng lại sao_luu_phien: việc gộp đi qua
-- BỐN GIAI ĐOẠN có thứ tự bắt buộc (liệt kê → gộp → KIỂM → xoá), còn phiên sao
-- lưu thường chỉ có một. Trộn hai thứ vào một bảng là mở đường cho ca "đang ở
-- giai đoạn kiểm mà bị hiểu nhầm thành đã xong" — tức xoá thư mục ngày trước
-- khi kiểm. Ca đó mất trắng cả tháng dữ liệu.
CREATE TABLE IF NOT EXISTS sao_luu_gop (
  id            TEXT PRIMARY KEY,      -- 'thang-2026-07' | 'nam-2026'
  loai          TEXT NOT NULL,         -- 'thang' | 'nam'
  moc           TEXT NOT NULL,         -- '2026-07' | '2026'

  -- ⚠️ THỨ TỰ NÀY LÀ THỨ TỰ AN TOÀN, KHÔNG ĐƯỢC ĐẢO:
  --    liet_ke → gop → kiem → xoa → xong
  -- 'xoa' chỉ tới được sau khi 'kiem' ĐẠT. Đảo lại là xoá trước khi kiểm.
  giai_doan     TEXT NOT NULL DEFAULT 'liet_ke',

  nguon         TEXT NOT NULL DEFAULT '[]',  -- JSON: [{ngay,thuMucId}] hoặc [{thang,tepId,coByte}]
  chi_so_nguon  INTEGER NOT NULL DEFAULT 0,
  tep_hien      TEXT,                        -- JSON danh sách tệp của nguồn đang làm
  chi_so_tep    INTEGER NOT NULL DEFAULT 0,
  vi_tri_doc    INTEGER NOT NULL DEFAULT 0,  -- đã đọc tới byte nào của tệp nguồn hiện tại

  upload_url    TEXT,                        -- phiên tải lên resumable của Drive
  byte_da_gui   INTEGER NOT NULL DEFAULT 0,
  du_byte       BLOB,                        -- đuôi chưa đủ 256 KiB (BLOB, xem them-sao-luu.sql)
  zip_muc       TEXT NOT NULL DEFAULT '[]',  -- JSON mục lục trung tâm của file zip

  -- Mã kiểm của TOÀN BỘ file gộp, cộng dồn qua từng byte ta ghi ra. Giai đoạn
  -- 'kiem' đọc ngược cả file từ Drive về và phải ra ĐÚNG con số này.
  crc_tep       INTEGER NOT NULL DEFAULT 0,

  -- Trạng thái của MỘT mục đang mở trong file zip
  muc_dang_mo   INTEGER NOT NULL DEFAULT 0,
  muc_bat_dau   INTEGER NOT NULL DEFAULT 0,
  muc_crc       INTEGER NOT NULL DEFAULT 0,  -- CRC32 của byte ĐÃ NÉN (zip cần)
  muc_co_byte   INTEGER NOT NULL DEFAULT 0,
  muc_crc_goc   INTEGER NOT NULL DEFAULT 0,  -- CRC32 của byte GỐC, để đối chiếu KIEM-TRA.csv của ngày đó
  muc_ten       TEXT,                        -- tên mục đang mở trong file zip
  muc_luc       INTEGER NOT NULL DEFAULT 0,  -- giờ ghi vào mục đó (nhớ lại, xem moMuc)
  goi_id        TEXT,                        -- gói NĂM đã nuốt gói tháng này

  ke_khai       TEXT NOT NULL DEFAULT '[]',  -- JSON: kê khai từng mục trong gói

  tep_id        TEXT,                        -- id file .zip trên Drive
  duong_dan     TEXT,
  co_byte       INTEGER NOT NULL DEFAULT 0,
  co_byte_goc   INTEGER NOT NULL DEFAULT 0,  -- tổng cỡ trước khi nén — để báo tỉ lệ nén THẬT

  kiem_vi_tri   INTEGER NOT NULL DEFAULT 0,  -- giai đoạn kiểm: đọc lại tới byte nào
  kiem_crc      INTEGER NOT NULL DEFAULT 0,

  loi           TEXT,
  da_bao_loi    INTEGER NOT NULL DEFAULT 0,
  bat_dau_luc   TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  cap_nhat_luc  TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS ix_slg_giai_doan ON sao_luu_gop(giai_doan);

-- Nhật ký dung lượng Drive, mỗi tuần một dòng. Chỉ để trả lời MỘT câu hỏi:
-- "với đà tăng hiện tại thì bao lâu nữa đầy?" — CTL-0022 Mục 5 bắt phải BÁO
-- TRƯỚC 6 THÁNG, chứ không đợi còn 3 GB mới kêu (3 GB là lúc đã sát nút).
-- Bảng cực nhỏ: 52 dòng/năm.
CREATE TABLE IF NOT EXISTS sao_luu_dung_luong (
  ngay     TEXT PRIMARY KEY,             -- '2026-08-27' (giờ VN)
  tong     INTEGER NOT NULL DEFAULT 0,
  da_dung  INTEGER NOT NULL DEFAULT 0,
  con_lai  INTEGER NOT NULL DEFAULT 0
);

-- Bản ngày đã nằm trong gói tháng nào (hoặc bản tháng nằm trong gói năm nào).
-- Giữ nguyên trang_thai='xong' để lớp báo động B và coBan() không đổi cách hiểu.
ALTER TABLE sao_luu_ban ADD COLUMN goi_id TEXT;
