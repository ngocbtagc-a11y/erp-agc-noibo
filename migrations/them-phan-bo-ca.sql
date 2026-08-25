-- ==========================================================================
-- MIGRATION — Auto Allocation cho Đăng ký ca / Xếp ca
-- --------------------------------------------------------------------------
-- Đổi mô hình từ approval-first (nhân viên đăng ký -> trưởng phòng duyệt
-- từng cái) sang matching engine (nhân viên khai báo khả năng làm -> ERP tự
-- phân bổ theo rule công bằng -> trưởng phòng chỉ xử lý ngoại lệ -> chốt).
--
-- KHÔNG đổi tên/schema dang_ky_ca, ca_mo, lich_lam_viec (production đang 0
-- dòng dữ liệu — không có migration rủi ro, nhưng vẫn giữ tên bảng cũ để
-- tối thiểu thay đổi). Ý nghĩa mới:
--   ca_mo          = Staffing Demand (đã đúng sẵn, không đổi)
--   dang_ky_ca     = Employee Availability ("tôi CÓ THỂ làm ca này", không
--                    còn nghĩa "đăng ký = có quyền được nhận")
--   lich_lam_viec (chưa khoá) = Allocation Proposal — ĐÃ có sẵn từ trước,
--                    không cần bảng đề xuất riêng.
--   lich_lam_viec (đã khoá)   = Final Work Schedule.
--
-- Bảng MỚI — chỉ để audit + giải thích ("vì sao chọn A không chọn B"),
-- KHÔNG thêm staffing_plans (trạng thái tuần suy ra từ ca_mo, thêm 1 bảng
-- nữa là over-engineering ở quy mô hiện tại).
--   Nạp máy:  npx wrangler d1 execute crm-agc --local  --file=migrations/them-phan-bo-ca.sql
--   Nạp mây:  npx wrangler d1 execute crm-agc --remote --file=migrations/them-phan-bo-ca.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS allocation_runs (
  id              TEXT PRIMARY KEY,
  phong_ban_id    INTEGER NOT NULL REFERENCES phong_ban(id),
  tu_ngay         TEXT NOT NULL,
  den_ngay        TEXT NOT NULL,
  phien_ban_rule  TEXT NOT NULL,    -- 'v1' — đổi khi sửa thuật toán, để biết đề xuất cũ chạy bằng luật nào
  nguoi_chay_id   TEXT NOT NULL REFERENCES nhan_su(id),
  chay_luc        TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_ar_phongban ON allocation_runs(phong_ban_id, tu_ngay);

CREATE TABLE IF NOT EXISTS allocation_proposals (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  allocation_run_id TEXT NOT NULL REFERENCES allocation_runs(id),
  dang_ky_ca_id     TEXT NOT NULL REFERENCES dang_ky_ca(id),
  nhan_su_id        TEXT NOT NULL REFERENCES nhan_su(id),
  ca_mo_id          TEXT NOT NULL REFERENCES ca_mo(id),
  ket_qua           TEXT NOT NULL,     -- 'chon' | 'khong_chon'
  ly_do             TEXT,              -- câu giải thích ngắn, hiển thị thẳng cho trưởng phòng
  tao_luc           TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_ap_run    ON allocation_proposals(allocation_run_id);
CREATE INDEX IF NOT EXISTS idx_ap_dangky ON allocation_proposals(dang_ky_ca_id);
