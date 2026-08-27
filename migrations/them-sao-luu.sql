-- ==========================================================================
-- SPEC-0005 Phần B — SAO LƯU DỮ LIỆU (Đợt 1)
-- ADR-0011 (Drive tài khoản công ty, KHÔNG R2) · ADR-0013 (hai nhịp ngày+tháng)
--
-- Ba bảng, tất cả đều NHỎ (vài dòng/ngày). Chúng chỉ giữ "đang làm tới đâu"
-- và "đã làm xong cái gì" — dữ liệu thật nằm trên Google Drive.
-- ==========================================================================

-- Thư mục trên Drive. Tạo một lần rồi nhớ id, lần sau không tạo lại.
-- khoa: 'goc' | 'SAO-LUU' | 'SAO-LUU/2026-08-27' | 'BAN-THANG'
CREATE TABLE IF NOT EXISTS sao_luu_thu_muc (
  khoa      TEXT PRIMARY KEY,
  drive_id  TEXT NOT NULL,
  tao_luc   TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- Một dòng cho mỗi bản sao lưu (mỗi ngày một dòng cho bản ngày, mỗi tháng
-- một dòng cho bản tháng). Đây là chỗ lớp báo động B tra "hôm qua có bản không".
CREATE TABLE IF NOT EXISTS sao_luu_ban (
  id            TEXT PRIMARY KEY,      -- 'ngay-2026-08-27' | 'thang-2026-08'
  loai          TEXT NOT NULL,         -- 'ngay' | 'thang'
  moc           TEXT NOT NULL,         -- '2026-08-27' | '2026-08'  (giờ VN)
  trang_thai    TEXT NOT NULL DEFAULT 'dang_chay',  -- dang_chay|xong|hong
  thu_muc_id    TEXT,                  -- id thư mục Drive (bản ngày)
  tep_id        TEXT,                  -- id file .zip trên Drive (bản tháng)
  duong_dan     TEXT,                  -- link Sếp bấm vào mở được
  so_bang       INTEGER NOT NULL DEFAULT 0,
  so_dong       INTEGER NOT NULL DEFAULT 0,
  co_byte       INTEGER NOT NULL DEFAULT 0,
  loi           TEXT,
  bat_dau_luc   TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  xong_luc      TEXT
);
CREATE INDEX IF NOT EXISTS ix_slb_moc ON sao_luu_ban(loai, moc);

-- Trạng thái đang chạy dở: đang ở bảng nào, đã đọc tới dòng thứ mấy, đã đẩy
-- lên Drive bao nhiêu byte, và phần đuôi chưa đủ 256 KiB để gửi.
-- Mỗi bản sao lưu chỉ có TỐI ĐA 1 dòng ở đây; xong thì xoá.
CREATE TABLE IF NOT EXISTS sao_luu_phien (
  ban_id        TEXT PRIMARY KEY,
  danh_sach     TEXT NOT NULL,         -- JSON mảng tên bảng phải làm
  chi_so_bang   INTEGER NOT NULL DEFAULT 0,
  rid_cuoi      INTEGER NOT NULL DEFAULT 0,  -- rowid đã đọc tới (phân trang theo khoá,
                                             -- KHÔNG dùng OFFSET: OFFSET lớn bắt SQLite
                                             -- quét lại từ đầu, đốt hạn mức đọc của D1)
  upload_url    TEXT,                  -- phiên tải lên resumable của Drive
  byte_da_gui   INTEGER NOT NULL DEFAULT 0,
  du_byte       BLOB,                   -- phần đuôi CHƯA đủ 256 KiB để gửi.
                                        -- Kiểu BLOB, KHÔNG phải TEXT: (1) cắt một
                                        -- chuỗi chữ đúng giữa một ký tự tiếng Việt
                                        -- (2–3 byte) là hỏng dấu; (2) đổi qua lại
                                        -- byte ↔ chuỗi tốn 2,2 ms CPU mỗi lô — đo
                                        -- được, và đó là 1/5 trần 10 ms của cả lượt.
  ke_khai       TEXT NOT NULL DEFAULT '[]', -- JSON: [{bang,so_dong,co_byte,tep_id}]
  -- Trạng thái của MỤC đang mở (một file .csv, hoặc một mục trong file .zip)
  muc_dang_mo   INTEGER NOT NULL DEFAULT 0,
  muc_bat_dau   INTEGER NOT NULL DEFAULT 0,  -- vị trí byte mục này bắt đầu (trong zip)
  muc_so_dong   INTEGER NOT NULL DEFAULT 0,
  muc_co_byte   INTEGER NOT NULL DEFAULT 0,
  muc_crc       INTEGER NOT NULL DEFAULT 0,  -- CRC32 cộng dồn (chỉ bản tháng/zip)
  zip_muc       TEXT NOT NULL DEFAULT '[]',  -- JSON mục lục zip (chỉ bản tháng)
  da_bao_loi    INTEGER NOT NULL DEFAULT 0,
  cap_nhat_luc  TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- Nhật ký cảnh báo đã bắn, để không bắn lại cùng một cảnh báo nhiều lần/ngày.
CREATE TABLE IF NOT EXISTS sao_luu_canh_bao (
  khoa     TEXT PRIMARY KEY,           -- 'thieu-ban-2026-08-27' | 'dung-luong-2026-08-27'
  luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
