-- ==========================================================================
-- MIGRATION — R&D sản phẩm (New Product Development, Domain: Kinh doanh)
-- --------------------------------------------------------------------------
-- Spec: docs/FEATURE-SPEC-RND-SANPHAM.md — Boundary LOCAL_DOMAIN.
--
-- CHỈ CREATE. Không ALTER, không DROP, không đụng bảng nào đang chạy thật
-- (don_hang 2.300+ dòng, don_hoan 405+ dòng, san_pham, nhan_su...).
--
-- 3 bảng:
--   rnd_du_an    — Master: 1 dòng = 1 dự án phát triển sản phẩm mới
--   rnd_buoc     — Checklist từng bước của từng giai đoạn (sinh sẵn lúc tạo)
--   rnd_lich_su  — Sổ cái bất biến (chỉ INSERT), cùng khuôn tai_san_lich_su
--
-- KHÔNG có cột tên/SKU sản phẩm trong rnd_du_an ngoài san_pham_id tham
-- chiếu — dứt khoát không đẻ bảng sản phẩm thứ hai (Rule 1 One Fact One Owner).
--
--   Nạp máy:  node scripts/chay-migration.mjs them-rnd-sanpham.sql
--   Nạp mây:  node scripts/chay-migration.mjs them-rnd-sanpham.sql --remote
-- ==========================================================================

-- ---- Dự án R&D (Master) ---------------------------------------------------
CREATE TABLE IF NOT EXISTS rnd_du_an (
  id               TEXT PRIMARY KEY,                    -- rnd_xxxxxxxxxxxx
  ma_rnd           TEXT NOT NULL UNIQUE,                -- RD0001 — sinh qua sinhMa(), bất biến
  ten              TEXT NOT NULL,                       -- tên dự kiến của sản phẩm
  nhom_hang        TEXT,                                -- Hạt dinh dưỡng, Bột ăn dặm, Trái cây sấy...
  doi_tuong        TEXT NOT NULL DEFAULT 'nguoi_lon',   -- nguoi_lon | me_be | ca_hai
  kenh             TEXT NOT NULL DEFAULT 'ca_hai',      -- shopee | tiktok | ca_hai
  y_tuong          TEXT,                                -- mô tả ý tưởng + lý do làm
  giai_doan        TEXT NOT NULL DEFAULT 'y_tuong',     -- xem GIAI_DOAN trong src/rnd.js
  trang_thai       TEXT NOT NULL DEFAULT 'dang_lam',    -- dang_lam | tam_dung | huy | hoan_thanh
  uu_tien          TEXT NOT NULL DEFAULT 'trung_binh',  -- cao | trung_binh | thap
  phu_trach_id     TEXT REFERENCES nhan_su(id),
  han_ra_mat       TEXT,                                -- YYYY-MM-DD, hạn ra mắt dự kiến
  gia_ban_du_kien  INTEGER,                             -- đồng
  gia_von_du_kien  INTEGER,                             -- đồng
  -- Gắn vào SKU THẬT sau khi ra mắt. Sản phẩm vẫn do bảng san_pham sở hữu,
  -- đây chỉ là con trỏ — không copy tên/SKU sang đây.
  san_pham_id      TEXT REFERENCES san_pham(id),
  ghi_chu          TEXT,
  ly_do_dung       TEXT,                                -- lý do tạm dừng/huỷ (bắt buộc khi dừng)
  tao_boi          TEXT REFERENCES nhan_su(id),
  tao_luc          TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  cap_nhat_boi     TEXT REFERENCES nhan_su(id),
  cap_nhat_luc     TEXT,
  hoat_dong        INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_rnd_du_an_giai_doan  ON rnd_du_an(giai_doan);
CREATE INDEX IF NOT EXISTS idx_rnd_du_an_trang_thai ON rnd_du_an(trang_thai);

-- ---- Checklist từng bước --------------------------------------------------
-- Sinh sẵn toàn bộ lúc tạo dự án từ khuôn cứng KHUON_QUY_TRINH trong
-- src/rnd.js: quy trình là CODE, không phải dữ liệu người dùng tự sửa —
-- tránh mỗi dự án một quy trình khác nhau rồi hết so sánh được.
-- Dự án đã tạo giữ nguyên bộ bước của thời điểm bắt đầu kể cả khi khuôn
-- được sửa sau này (Rule 10 — lịch sử cũ phải còn đúng).
CREATE TABLE IF NOT EXISTS rnd_buoc (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  du_an_id      TEXT NOT NULL REFERENCES rnd_du_an(id),
  giai_doan     TEXT NOT NULL,
  thu_tu        INTEGER NOT NULL,
  ten           TEXT NOT NULL,
  bat_buoc      INTEGER NOT NULL DEFAULT 0,             -- 1 = chưa xong thì không qua cổng được
  trang_thai    TEXT NOT NULL DEFAULT 'chua_lam',       -- chua_lam | xong | khong_ap_dung
  ket_qua       TEXT,                                   -- kết quả/ghi chú của bước
  nguoi_lam_id  TEXT REFERENCES nhan_su(id),
  xong_luc      TEXT
);

CREATE INDEX IF NOT EXISTS idx_rnd_buoc_du_an ON rnd_buoc(du_an_id);

-- ---- Sổ cái lịch sử (bất biến, chỉ INSERT) --------------------------------
CREATE TABLE IF NOT EXISTS rnd_lich_su (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  du_an_id         TEXT NOT NULL REFERENCES rnd_du_an(id),
  loai_su_kien     TEXT NOT NULL,   -- tao|sua|buoc|chuyen_giai_doan|quay_lai|bo_qua_cong|tam_dung|tiep_tuc|huy|duyet_ra_mat|gan_sku|hoan_thanh
  giai_doan_cu     TEXT,
  giai_doan_moi    TEXT,
  ghi_chu          TEXT,
  nguoi_thuc_hien  TEXT REFERENCES nhan_su(id),
  luc              TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_rnd_lich_su_du_an ON rnd_lich_su(du_an_id);
