-- ==========================================================================
-- MIGRATION — KHO TÀI LIỆU QUẢN TRỊ  ·  CTL-0026 (lõi dùng chung với CTL-0025)
-- --------------------------------------------------------------------------
--   Nạp máy:  node scripts/chay-migration.mjs them-kho-tai-lieu.sql
--   Nạp mây:  node scripts/chay-migration.mjs them-kho-tai-lieu.sql --remote
--
-- ⚠️ HẠN MỨC GHI D1 VỪA VÁ XONG (REV-0031) — thiết kế ở đây bám đúng ràng
-- buộc CTL-0026 Mục 6: "ảnh lưu Drive, D1 chỉ giữ thông tin mô tả".
--   · KHÔNG có cột nào chứa ảnh. File PDF nằm trên Google Drive, D1 giữ đúng
--     một chuỗi `kho_khoa` là mã file.
--   · MỘT lượt quét = ĐÚNG 1 dòng INSERT vào `tai_lieu`. Không bảng trang,
--     không bảng tiến độ tải lên — bản nháp nằm ở ĐIỆN THOẠI (localStorage),
--     nên gửi hụt lúc sóng yếu vẫn gửi lại được mà D1 không ghi gì thêm.
--   · Nhật ký truy cập chỉ ghi cho giấy tờ NHẠY CẢM, khoá chính gộp theo NGÀY:
--     mở lại 10 lần trong ngày = 1 dòng VÀ 1 lượt ghi (mã nguồn ĐỌC TRƯỚC rồi
--     mới ghi — xem `ghiNhatKy()` trong src/tai-lieu.js). Chú thích cũ ở đây
--     ghi "INSERT OR IGNORE" trong khi mã nguồn làm "DO UPDATE SET so_lan+1",
--     tức 10 lượt GHI: hai bản lệch nhau đúng chỗ tốn hạn mức (REV-0036 #3).
--
-- ⚠️ LUẬT — xây vào sản phẩm, không nhắc miệng:
--   · Luật Giao dịch điện tử 2023 (hiệu lực 01/7/2024): bản số hoá chỉ có giá
--     trị pháp lý khi đủ điều kiện ký số + toàn vẹn. Quét bằng điện thoại
--     KHÔNG đạt → kho này là BẢN DỰ PHÒNG, không thay bản giấy. Cột
--     `han_luu` giữ nguyên hạn lưu của bản GIẤY để không ai tưởng quét xong
--     là hết trách nhiệm.
--   · Luật BVDLCN 91/2025/QH15 + NĐ 356/2025 (hiệu lực 01/01/2026): giấy tờ
--     cá nhân phải ghi nhận ĐỒNG Ý (ai, lúc nào, mục đích) → ba cột
--     `dong_y_*`; và phải có NHẬT KÝ AI ĐÃ MỞ → bảng `tai_lieu_nhat_ky`.
--
-- LÙI LẠI (rollback) — hai bảng này chưa có gì trỏ vào, gỡ ra ERP vẫn chạy
-- (chỉ mất tab Kho tài liệu, các tab khác không đọc bảng này):
--   DROP TABLE IF EXISTS tai_lieu_nhat_ky;
--   DROP TABLE IF EXISTS tai_lieu;
--   DELETE FROM schema_migrations WHERE filename = 'them-kho-tai-lieu.sql';
-- ==========================================================================

CREATE TABLE IF NOT EXISTS tai_lieu (
  id             TEXT PRIMARY KEY,

  -- MÃ GỬI — chống nhân đôi khi sóng yếu. Điện thoại sinh mã này MỘT lần cho
  -- mỗi bộ giấy tờ và giữ nguyên qua mọi lần gửi lại. Máy chủ thấy mã đã có
  -- thì trả về bản cũ, KHÔNG tải lên Drive lần nữa. Không có nó thì mỗi lần
  -- mạng đứt giữa chừng là kho có thêm một bản trùng mà không ai biết.
  ma_gui         TEXT UNIQUE,

  nhom           TEXT NOT NULL,          -- khớp NHOM_TAI_LIEU trong src/quyen.js
  loai           TEXT,                   -- người dùng tự gõ: "Hợp đồng lao động"...
  tieu_de        TEXT NOT NULL,
  so_hieu        TEXT,

  -- Ô TÌM KIẾM GỘP — tiêu đề + số hiệu + loại + chữ bóc từ ảnh, ĐÃ BỎ DẤU và
  -- hạ chữ thường. Sếp gõ "giay attp" phải ra "Giấy ATTP", gõ "hợp đồng" cũng
  -- phải ra. Một cột LIKE là đủ cho quy mô vài nghìn tài liệu và KHÔNG tốn
  -- thêm lượt ghi nào (ghi cùng lượt INSERT).
  tim_kiem       TEXT NOT NULL DEFAULT '',

  ngay_ban_hanh  TEXT,                   -- YYYY-MM-DD
  ngay_het_han   TEXT,                   -- YYYY-MM-DD — nhập NGAY lúc quét
  han_luu        TEXT,                   -- hạn lưu bản GIẤY, chép từ nhóm

  -- HAI CỬA VÀO, MỘT KHO (CTL-0026 Mục 5). 'kho_chung' = kho công ty (Đợt 1).
  -- 'nhan_su' = gắn vào hồ sơ một người (Đợt 2, CTL-0025) — cột đã có sẵn từ
  -- bây giờ để Đợt 2 KHÔNG phải viết lại migration hay đổi lược đồ.
  cua_vao        TEXT NOT NULL DEFAULT 'kho_chung',
  gan_id         TEXT,                   -- nhan_su.id khi cua_vao='nhan_su'

  so_trang       INTEGER NOT NULL DEFAULT 1,
  kho_nha        TEXT NOT NULL DEFAULT 'drive',   -- khớp src/kho-file.js
  kho_khoa       TEXT,                            -- mã file trên Drive
  co_byte        INTEGER NOT NULL DEFAULT 0,

  noi_dung       TEXT,                   -- chữ AI bóc được, CÓ dấu — để đọc
  ocr_so_trang   INTEGER NOT NULL DEFAULT 0,      -- đã bóc chữ mấy trang
  ocr_ghi_chu    TEXT,                   -- vì sao không bóc được, nếu hỏng

  -- Luật BVDLCN: ghi nhận đồng ý. Bắt buộc với nhóm nhạy cảm (nhan_su).
  nhay_cam       INTEGER NOT NULL DEFAULT 0,
  dong_y_boi     TEXT,
  dong_y_luc     TEXT,
  dong_y_muc_dich TEXT,

  nguoi_tao      TEXT,
  tao_luc        TEXT,
  an             INTEGER NOT NULL DEFAULT 0
);

-- Lọc chính của mọi màn: nhóm (phân quyền) + còn hiện + mới nhất trước.
CREATE INDEX IF NOT EXISTS idx_tai_lieu_nhom     ON tai_lieu (nhom, an, tao_luc DESC);
-- Cửa vào hồ sơ nhân sự (Đợt 2) — đánh chỉ mục sẵn, không phải sửa lại sau.
CREATE INDEX IF NOT EXISTS idx_tai_lieu_gan      ON tai_lieu (cua_vao, gan_id, an);
-- Đường quét nhắc hạn chạy 5 phút/lần: phải tra bằng chỉ mục, không quét bảng.
CREATE INDEX IF NOT EXISTS idx_tai_lieu_het_han  ON tai_lieu (ngay_het_han) WHERE ngay_het_han IS NOT NULL AND an = 0;

-- --------------------------------------------------------------------------
-- NHẬT KÝ TRUY CẬP — chỉ cho giấy tờ NHẠY CẢM
-- --------------------------------------------------------------------------
-- Khoá chính là `<tài liệu>|<người>|<ngày VN>|<hành động>`, và `ghiNhatKy()`
-- ĐỌC TRƯỚC KHI GHI nên 10 lượt mở trong cùng một ngày tốn ĐÚNG 1 lượt ghi
-- (+9 lượt đọc, rẻ hơn một bậc). Đây là cùng một mẹo `push_nhat_ky` đang dùng
-- (src/day-thong-bao.js) — không phát minh cơ chế thứ hai.
--
-- NHẬT KÝ NÀY TRẢ LỜI ĐƯỢC GÌ: "NGÀY NÀO ai đã mở tài liệu nào" — đủ cho
-- nghĩa vụ chứng minh tiếp cận dữ liệu cá nhân của Luật BVDLCN 91/2025/QH15.
-- Nó KHÔNG trả lời "mở bao nhiêu lần trong ngày": đếm từng lượt thì mỗi lượt
-- mở là một lượt ghi D1, đúng thứ REV-0031/0033 vừa phải đi vá.
CREATE TABLE IF NOT EXISTS tai_lieu_nhat_ky (
  khoa        TEXT PRIMARY KEY,
  tai_lieu_id TEXT NOT NULL,
  nhan_su_id  TEXT NOT NULL,
  ngay        TEXT NOT NULL,
  hanh_dong   TEXT NOT NULL,        -- 'mo' | 'tai'
  so_lan      INTEGER NOT NULL DEFAULT 1,   -- LUÔN = 1 (gộp theo ngày). Giữ cột
                                            -- để ngày nào cần đếm từng lượt thì
                                            -- có sẵn chỗ, không phải đổi lược đồ.
  luc         TEXT NOT NULL         -- giờ mở ĐẦU TIÊN trong ngày, không phải gần nhất
);

CREATE INDEX IF NOT EXISTS idx_tai_lieu_nhat_ky_tl ON tai_lieu_nhat_ky (tai_lieu_id, ngay DESC);

-- ==========================================================================
-- VÁ REV-0040 · LỖI #4 — DỌN RUỘT GIẤY TỜ NHẠY CẢM RA KHỎI Ô TÌM KIẾM
-- --------------------------------------------------------------------------
-- `chuoiTimKiem()` nay KHÔNG đưa `noi_dung` của nhóm nhạy cảm vào cột
-- `tim_kiem` nữa: cột đó chứa nguyên số CCCD và mức lương, mà đường tìm kiếm
-- quét `tim_kiem LIKE ?` và GHI 0 LƯỢT NHẬT KÝ — gõ mò một số CCCD, thấy dòng
-- hiện lên là đã xác nhận số đó nằm trong hồ sơ nào, đọc được ruột mà không để
-- lại vết. Đúng thứ Luật BVDLCN 91/2025/QH15 bắt phải ghi lại.
--
-- Nhưng bản vá ở mã nguồn chỉ tác động lúc LƯU. Dòng nào đã lưu TRƯỚC bản vá
-- vẫn còn nguyên ruột trong ô tìm — một bản vá chỉ chặn dòng mới mà bỏ mặc
-- dòng cũ thì lỗ vẫn còn nguyên, chỉ là ngừng lớn thêm.
--
-- Dựng lại `tim_kiem` từ đúng ba mảnh được phép tra: tiêu đề · số hiệu · loại.
-- SQLite không có hàm bỏ dấu, nên dòng CŨ chỉ tra được đúng chữ đã lưu cho tới
-- lượt quét lại — chấp nhận: thà tra khó còn hơn để dò ra số CCCD.
-- Câu này chạy lại bao nhiêu lần cũng cho cùng kết quả.
UPDATE tai_lieu
   SET tim_kiem = LOWER(TRIM(
         COALESCE(tieu_de, '') || ' ' ||
         COALESCE(so_hieu, '') || ' ' ||
         COALESCE(loai, '')))
 WHERE nhay_cam = 1;
