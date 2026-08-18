-- ==========================================================================
-- DỮ LIỆU MẪU CHO MODULE KHO — chỉ để xem thử báo cáo có số
-- --------------------------------------------------------------------------
-- Toàn bộ số dưới đây là GIẢ, chỉ để Sếp thấy giao diện chạy thật.
--   Nạp vào máy để thử:   npm run nap-kho-mau-may
-- Muốn bắt đầu sạch từ số 0 thì KHÔNG nạp file này, hoặc chạy lại nó khi cần
-- (file tự xoá dữ liệu kho cũ trước khi nạp lại).
--
-- nguoi_id dùng 'ns_admin1' (Sếp Ngọc) — đã có sẵn trong seed.sql.
-- ==========================================================================

DELETE FROM giao_dich_kho;
DELETE FROM lo_hang;
DELETE FROM san_pham;

-- ---- Danh mục sản phẩm ---------------------------------------------------
INSERT INTO san_pham (id, ma_sku, ten, danh_muc, don_vi, theo_doi_hsd, ton_toi_thieu) VALUES
  ('sp_hanhnhan', 'HN-MY-1000', 'Hạnh nhân Mỹ tách vỏ 1kg',    'Hạt dinh dưỡng', 'túi', 1, 60),
  ('sp_macca',    'MC-UC-500',  'Macca Úc nứt vỏ 500g',        'Hạt dinh dưỡng', 'túi', 1, 80),
  ('sp_occho',    'OC-CL-1000', 'Óc chó Chile 1kg',            'Hạt dinh dưỡng', 'túi', 1, 50),
  ('sp_taodo',    'TD-TC-500',  'Táo đỏ Tân Cương 500g',       'Nông sản khô',   'túi', 1, 100),
  ('sp_nhokho',   'NK-CL-1000', 'Nho khô Chile không hạt 1kg', 'Trái cây sấy',   'túi', 1, 40),
  ('sp_vietquat', 'VQ-MY-200',  'Việt quất sấy Mỹ 200g',       'Trái cây sấy',   'hộp', 1, 50);

-- ---- Lô hàng (kèm hạn sử dụng để minh hoạ cảnh báo cận hạn) ---------------
INSERT INTO lo_hang (id, san_pham_id, so_lo, han_su_dung, tao_luc) VALUES
  ('lo_hn_01', 'sp_hanhnhan', 'HN2608', '2026-09-12', '2026-08-05 09:00:00'),
  ('lo_mc_01', 'sp_macca',    'MC2608', '2027-02-20', '2026-08-06 09:00:00'),
  ('lo_oc_01', 'sp_occho',    'OC2607', '2027-01-15', '2026-08-02 09:00:00'),
  ('lo_td_01', 'sp_taodo',    'TD2607', '2027-06-30', '2026-08-03 09:00:00'),
  ('lo_nk_01', 'sp_nhokho',   'NK2605', '2027-05-10', '2026-08-01 09:00:00'),
  ('lo_vq_01', 'sp_vietquat', 'VQ2606', '2026-08-30', '2026-08-04 09:00:00');

-- ---- Sổ cái kho: nhập (dương) rồi xuất (âm) ------------------------------
-- Hạnh nhân: nhập 200, xuất 165 → tồn 35 (dưới tối thiểu 60) + lô cận hạn
INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, don_gia, doi_tac, ghi_chu, nguoi_id, luc) VALUES
  ('pn_mau_hn', 'sp_hanhnhan', 'lo_hn_01', 'nhap',  200, 285000, 'California Nuts Co.', 'Nhập lô đầu tháng',  'ns_admin1', '2026-08-05 09:10:00'),
  ('px_mau_hn1','sp_hanhnhan', 'lo_hn_01', 'xuat', -120, NULL,   'Shopee',              'Đơn sàn tuần 1',     'ns_admin1', '2026-08-09 16:00:00'),
  ('px_mau_hn2','sp_hanhnhan', 'lo_hn_01', 'xuat',  -45, NULL,   'Shopee',              'Đơn sàn tuần 2',     'ns_admin1', '2026-08-14 16:00:00');

-- Macca: nhập 300, xuất 210 → tồn 90
INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, don_gia, doi_tac, ghi_chu, nguoi_id, luc) VALUES
  ('pn_mau_mc', 'sp_macca', 'lo_mc_01', 'nhap',  300, 172000, 'Australian Harvest', 'Nhập tháng 8', 'ns_admin1', '2026-08-06 09:10:00'),
  ('px_mau_mc1','sp_macca', 'lo_mc_01', 'xuat', -210, NULL,    'Shopee',             'Đơn sàn',      'ns_admin1', '2026-08-12 16:00:00');

-- Óc chó: nhập 500, xuất 120 → tồn 380
INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, don_gia, doi_tac, ghi_chu, nguoi_id, luc) VALUES
  ('pn_mau_oc', 'sp_occho', 'lo_oc_01', 'nhap',  500, 198000, 'Chile Walnut', 'Nhập tháng 8', 'ns_admin1', '2026-08-02 09:10:00'),
  ('px_mau_oc1','sp_occho', 'lo_oc_01', 'xuat', -120, NULL,    'TikTok Shop',  'Đơn sàn',      'ns_admin1', '2026-08-11 16:00:00');

-- Táo đỏ: nhập 700, xuất 40 → tồn 660
INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, don_gia, doi_tac, ghi_chu, nguoi_id, luc) VALUES
  ('pn_mau_td', 'sp_taodo', 'lo_td_01', 'nhap',  700, 58000, 'Tân Cương Import', 'Nhập tháng 8', 'ns_admin1', '2026-08-03 09:10:00'),
  ('px_mau_td1','sp_taodo', 'lo_td_01', 'xuat',  -40, NULL,   'Shopee',           'Đơn sàn',      'ns_admin1', '2026-08-13 16:00:00');

-- Nho khô: nhập 2400, xuất 30 → tồn 2370 (tồn nhiều)
INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, don_gia, doi_tac, ghi_chu, nguoi_id, luc) VALUES
  ('pn_mau_nk', 'sp_nhokho', 'lo_nk_01', 'nhap', 2400, 55000, 'Chile Dried', 'Nhập lô lớn', 'ns_admin1', '2026-08-01 09:10:00'),
  ('px_mau_nk1','sp_nhokho', 'lo_nk_01', 'xuat',  -30, NULL,   'Shopee',      'Đơn sàn',     'ns_admin1', '2026-08-10 16:00:00');

-- Việt quất: nhập 300, xuất 190 → tồn 110, lô CẬN HẠN 30/08
INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, don_gia, doi_tac, ghi_chu, nguoi_id, luc) VALUES
  ('pn_mau_vq', 'sp_vietquat', 'lo_vq_01', 'nhap',  300, 92000, 'US Dried Fruit', 'Nhập tháng 8', 'ns_admin1', '2026-08-04 09:10:00'),
  ('px_mau_vq1','sp_vietquat', 'lo_vq_01', 'xuat', -190, NULL,   'Shopee',         'Đơn sàn',      'ns_admin1', '2026-08-12 16:00:00');
