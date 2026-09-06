-- ==========================================================================
-- MIGRATION — VĂN PHÒNG ẢO: nơi làm việc của 9 trợ lý AI
-- --------------------------------------------------------------------------
--   Nạp máy:  node scripts/chay-migration.mjs them-vanphong.sql
--   Nạp mây:  node scripts/chay-migration.mjs them-vanphong.sql --remote
--
-- VĂN PHÒNG ẢO LÀ GÌ: một tầng văn phòng vẽ sẵn trong ERP, mỗi phòng có một
-- trợ lý AI trực. Nhân sự thật bước vào hỏi việc, nhờ tra số liệu, xin tư vấn;
-- trợ lý tra dữ liệu thật trong ERP để trả lời và giao lại đầu việc cho người.
-- Chín trợ lý: 7 trưởng phòng (Kinh doanh · MKT · Kế toán-Tài chính · Pháp chế
-- · Kho vận · HCNS · IT) + Trợ lý Giám đốc + Trợ lý Phó Giám đốc. Hai trợ lý
-- cấp trên không trực nghiệp vụ mà để PHẢN BIỆN kế hoạch (Sếp Ngọc 06/09/2026).
--
-- ⚠️ KHÔNG CÓ BẢNG VIỆC RIÊNG — CÓ CHỦ Ý (Rule 1: không nhân đôi dữ liệu).
-- Trợ lý giao việc thì ghi thẳng vào `cong_viec` sẵn có, để việc do trợ lý
-- giao nằm chung một hàng đợi với việc do người giao. Dựng bảng việc thứ hai
-- thì nhân viên phải mở hai chỗ mới biết hết việc của mình — và chắc chắn sẽ
-- có một chỗ không ai mở.
--
-- Hồ sơ 9 trợ lý (tên, tính cách, quyền, công cụ) nằm trong `src/agents-vp.js`
-- chứ không nằm ở đây: đó là luật chơi của hệ thống, phải đi kèm mã nguồn để
-- còn tra được lịch sử sửa đổi. Database chỉ giữ thứ phát sinh hằng ngày.
--
-- Giờ giấc lưu theo giờ Việt Nam (+7), thống nhất với toàn hệ thống.
-- ==========================================================================

-- ---- Hội thoại: mỗi người × mỗi trợ lý một mạch riêng ---------------------
-- Không trộn chung để trợ lý nhớ đúng việc đã bàn với đúng người đó. Trí nhớ
-- nằm ở đây, trong database của công ty — KHÔNG gửi gắm ở nhà cung cấp AI, nên
-- đổi nhà cung cấp hay đổi khoá thì trợ lý vẫn nhớ nguyên chuyện cũ.
CREATE TABLE IF NOT EXISTS vp_hoi_thoai (
  id           TEXT PRIMARY KEY,
  agent_id     TEXT NOT NULL,                     -- xem src/agents-vp.js
  nhan_su_id   TEXT NOT NULL,
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  cap_nhat_luc TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_vp_ht_nguoi ON vp_hoi_thoai(nhan_su_id, agent_id);

-- ---- Tin nhắn ------------------------------------------------------------
-- vai: 'nguoi' = người gõ, 'agent' = trợ lý trả lời.
-- cong_cu: JSON ghi lại trợ lý đã tra những gì để ra câu trả lời đó. Giữ lại
-- để sau còn đối chiếu "con số này ở đâu ra" — không phải tin suông.
CREATE TABLE IF NOT EXISTS vp_tin_nhan (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  hoi_thoai_id TEXT NOT NULL,
  vai          TEXT NOT NULL,
  noi_dung     TEXT NOT NULL,
  cong_cu      TEXT,
  luc          TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_vp_tn_hoi_thoai ON vp_tin_nhan(hoi_thoai_id, id);

-- ---- Ai đang ở trong văn phòng -------------------------------------------
-- Giao diện báo về mỗi 20 giây. Quá 60 giây không thấy thì coi như đã rời đi,
-- chibi mờ dần. Bảng chỉ một dòng mỗi người, ghi đè liên tục — cố ý không giữ
-- lịch sử ra vào, vì đó là giám sát nhân viên chứ không phải việc của ERP.
CREATE TABLE IF NOT EXISTS vp_co_mat (
  nhan_su_id TEXT PRIMARY KEY,
  luc        TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  dang_o     TEXT                                 -- id trợ lý đang gặp, NULL = ở sảnh
);
