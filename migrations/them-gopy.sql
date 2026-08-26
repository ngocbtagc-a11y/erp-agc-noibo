-- ==========================================================================
-- Box "Góp ý & Cải tiến ERP" — nơi nhân viên báo vấn đề thực tế khi dùng
-- ERP, không cần viết yêu cầu kỹ thuật. Admin (Agent B/Reviewer trong quy
-- trình) phân tích + chuyển thành Feature Spec riêng khi cần.
--
-- KHÔNG dùng lại bảng cong_viec: cong_viec là "được giao việc" (bắt buộc
-- nguoi_giao_id/nguoi_nhan_id, trạng thái moi|dang_lam|cho_duyet|hoan_thanh|
-- huy cố định, dùng khắp Trạm Mục Tiêu) — góp ý là "tự gửi", vòng đời khác
-- hẳn (triage → business decision → build → UAT → release), đè lên
-- cong_viec sẽ phá mọi UI/filter đang giả định 5 trạng thái đó. Bảng riêng,
-- độc lập, không đụng Core.
--
-- trang_thai (11 mốc + BLOCKED, ánh xạ đúng theo flow spec):
--   moi | dang_phan_tich | cho_quyet_dinh | da_duyet | dang_lam |
--   dang_kiem_tra | can_chinh_sua | cho_nghiem_thu | nghiem_thu_chua_dat |
--   san_sang_phat_hanh | hoan_thanh | bi_chan
CREATE TABLE IF NOT EXISTS gop_y (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nguoi_gui_id        TEXT NOT NULL REFERENCES nhan_su(id),
  tieu_de             TEXT NOT NULL,
  boi_canh            TEXT NOT NULL,   -- "Đang làm việc gì?"
  vuong_o_dau         TEXT NOT NULL,   -- "Vướng ở đâu?"
  mong_muon           TEXT NOT NULL,   -- "Mong muốn kết quả gì?"
  tan_suat            TEXT,            -- lan_dau | thinh_thoang | thuong_xuyen | lien_tuc
  khu_vuc             TEXT,            -- id tab (nhansu/khovan/...) nếu biết, để trống nếu không rõ
  dinh_kem            TEXT,            -- 1 ảnh, base64 (giống ảnh đại diện/CCCD — không R2 Phase 1)
  loai                TEXT,            -- category — Reviewer gán: loi|cai_tien_trai_nghiem|
                                        -- cai_tien_quy_trinh|tinh_nang_moi|du_lieu_sai|
                                        -- loi_phan_quyen|loi_ket_noi. NULL = chưa triage.
  trang_thai          TEXT NOT NULL DEFAULT 'moi',
  nguoi_phu_trach_id  TEXT REFERENCES nhan_su(id),   -- Builder được giao, tuỳ chọn
  spec_reference      TEXT,            -- link/đường dẫn Feature Spec nếu đã tách riêng
  tao_luc             TEXT NOT NULL,
  cap_nhat_luc         TEXT
);
CREATE INDEX IF NOT EXISTS idx_gopy_nguoigui ON gop_y (nguoi_gui_id, tao_luc);
CREATE INDEX IF NOT EXISTS idx_gopy_trangthai ON gop_y (trang_thai, tao_luc);

-- Lịch sử đổi trạng thái — trace được ai đổi, khi nào, vì sao (History Must
-- Survive Change). Append-only, giống khuôn nhan_su_lich_su/tai_san_lich_su.
CREATE TABLE IF NOT EXISTS gop_y_lich_su (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  gop_y_id        INTEGER NOT NULL REFERENCES gop_y(id),
  tu_trang_thai   TEXT,
  den_trang_thai  TEXT NOT NULL,
  nguoi_doi_id    TEXT NOT NULL REFERENCES nhan_su(id),
  ghi_chu         TEXT,
  luc             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gopylichsu_gopy ON gop_y_lich_su (gop_y_id, luc);
