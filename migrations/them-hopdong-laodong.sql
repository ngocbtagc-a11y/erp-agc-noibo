-- ==========================================================================
-- MIGRATION — Hợp đồng lao động (hop_dong_lao_dong) · SPEC-0007 Đợt 1
-- --------------------------------------------------------------------------
-- Vì sao BẢNG RIÊNG chứ không nhồi cột vào `nhan_su`: một người có NHIỀU hợp
-- đồng nối tiếp nhau, mà thứ luật đòi lại chính là "đây là hợp đồng thứ mấy"
-- (BLLĐ 2019 Đ.20: hợp đồng xác định thời hạn chỉ được ký 2 lần liên tiếp,
-- tối đa 36 tháng/lần; quá 30 ngày không ký lại thì luật tự coi là không xác
-- định thời hạn). Nhồi cột vào `nhan_su` là mất lịch sử → mất luôn căn cứ.
--
-- KHÔNG đụng bảng nào đang có. KHÔNG sửa dữ liệu cũ. KHÔNG DROP.
-- `nhan_su.loai_lao_dong` GIỮ NGUYÊN — giá trị mới `khoan_viec` chỉ là một
-- giá trị TEXT thêm vào, cột không có CHECK nên không cần ALTER (BH-32:
-- cột này đã có sẵn từ them-dangky-ca.sql:19, tuyệt đối không tạo cột thứ hai
-- chồng lên nó).
--
--   Nạp máy:  node scripts/chay-migration.mjs migrations/them-hopdong-laodong.sql
--   Nạp mây:  node scripts/chay-migration.mjs migrations/them-hopdong-laodong.sql --remote
--
-- LÙI LẠI (rollback): bảng này hoàn toàn độc lập, chưa có gì trỏ vào nó —
--   DROP TABLE hop_dong_lao_dong;
--   DELETE FROM schema_migrations WHERE filename = 'them-hopdong-laodong.sql';
-- là về đúng trạng thái trước migration, không mất một dòng dữ liệu cũ nào.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS hop_dong_lao_dong (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_su_id   TEXT NOT NULL REFERENCES nhan_su(id),
  loai         TEXT NOT NULL,          -- thu_viec|xac_dinh_th|khong_xac_dinh_th|khoan_viec
  so_hd        TEXT,
  phap_nhan    TEXT,                   -- 'cong_ty' | 'hkd' — đang song song 2 pháp nhân
  ngay_bat_dau TEXT NOT NULL,          -- YYYY-MM-DD
  ngay_het_han TEXT,                   -- NULL khi không xác định thời hạn
  lan_thu      INTEGER NOT NULL DEFAULT 1,  -- MÁY tính lúc lưu, ô nhập chỉ đọc
  hieu_luc     INTEGER NOT NULL DEFAULT 1,  -- 0 = ẩn, KHÔNG xoá (Rule 10)
  ly_do_an     TEXT,
  nguoi_tao_id TEXT REFERENCES nhan_su(id),
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_hdld_ns  ON hop_dong_lao_dong (nhan_su_id, ngay_bat_dau DESC);
CREATE INDEX IF NOT EXISTS idx_hdld_han ON hop_dong_lao_dong (ngay_het_han) WHERE hieu_luc = 1;
