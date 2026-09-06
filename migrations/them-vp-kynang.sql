-- ===========================================================================
-- KỸ NĂNG DẠY THÊM CHO TRỢ LÝ ẢO
-- ---------------------------------------------------------------------------
-- Sếp Ngọc chốt 06/09/2026: nói với Mây "cần học soạn thảo văn bản", Mây tự
-- nghĩ xem kỹ năng đó thuộc phòng nào rồi cho trợ lý phòng đó học.
--
-- VÌ SAO LƯU DATABASE CHỨ KHÔNG SỬA FILE:
-- Hồ sơ gốc của chín trợ lý nằm trong src/vp-role-profile.js — sửa nó là sửa
-- code, phải deploy, Sếp không tự làm được. Còn thứ dạy thêm hằng ngày thì
-- phải nói một câu là xong. Hai loại khác nhau nên để hai chỗ: hồ sơ gốc ổn
-- định và có lịch sử git, kiến thức dạy thêm thì sống động và tự sửa được.
--
-- CHỈ CHỨA CÁCH LÀM, KHÔNG CHỨA SỐ:
-- Kỹ năng ở đây là phương pháp và quy tắc nghề — "công văn phải có số hiệu và
-- nơi nhận", "hợp đồng nhà cung cấp phải có điều khoản đổi trả". KHÔNG bao giờ
-- là dữ liệu ("tồn kho hiện tại 412 thùng"), vì dữ liệu thì tra ERP mới đúng,
-- còn dạy suông thì hôm sau đã sai mà trợ lý vẫn nói chắc nịch.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS vp_ky_nang (
  id           TEXT PRIMARY KEY,
  agent_id     TEXT NOT NULL,                     -- trợ lý nào học, xem src/agents-vp.js
  tieu_de      TEXT NOT NULL,                     -- tên kỹ năng, hiện ở hồ sơ
  noi_dung     TEXT NOT NULL,                     -- cách làm, chèn vào prompt của trợ lý đó
  yeu_cau_goc  TEXT,                              -- nguyên văn câu Sếp dạy, để đối chiếu khi nghi ngờ
  nguoi_day_id TEXT REFERENCES nhan_su(id),
  dang_dung    INTEGER NOT NULL DEFAULT 1,        -- 0 = tắt tạm, giữ lại để xem lịch sử
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);

-- Lấy kỹ năng đang bật của một trợ lý — truy vấn chạy ở MỌI câu hỏi gửi tới
-- trợ lý đó, nên phải có chỉ mục. Chỉ mục một phần: kỹ năng đã tắt không nằm
-- trong đó, nên chỉ mục luôn nhỏ dù bảng có dài ra theo năm tháng.
CREATE INDEX IF NOT EXISTS idx_vp_kynang_dung
  ON vp_ky_nang(agent_id, tao_luc) WHERE dang_dung = 1;
