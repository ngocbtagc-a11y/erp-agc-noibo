-- ==========================================================================
-- KHU QUẢN TRỊ ĐÀO TẠO & NĂNG LỰC — THỨ BẬC LUẬT + SỔ GHI ĐÚNG NGƯỜI ĐÚNG MÁY
-- --------------------------------------------------------------------------
-- Sếp Ngọc chốt 09/09/2026, bốn mục D1–D4 (xem docs/audit/AUDIT-KY-NANG-DAY-THEM.md).
--
-- FILE NÀY LÀM ĐÚNG BA VIỆC:
--   ① Thêm 4 cột thứ bậc luật:  tang · pham_vi_id · het_han_luc · cap_nhat_luc
--   ② Thêm 3 cột phân biệt NGƯỜI với MÁY (D4): nguoi_thuc_hien_loai ·
--      tac_nhan · uy_quyen_boi_id
--   ③ Kẹp cả hai bằng CHECK ở TẦNG DB, và thay chỉ mục cũ bằng chỉ mục có `tang`.
--
-- VÌ SAO PHẢI DỰNG LẠI BẢNG CHỨ KHÔNG CHỈ `ALTER TABLE ADD COLUMN`:
-- SQLite/D1 thêm được CỘT nhưng KHÔNG thêm được RÀNG BUỘC `CHECK` cấp bảng.
-- Mà chú thích ở cột KHÔNG phải ràng buộc — DB nhận bất kỳ chuỗi nào (bài học
-- them-gopy-lichsu-tacnhan.sql:50). Không có CHECK thì `tang = 'system_safety'`
-- ghi vào được, và tầng an toàn hệ thống lập tức có một đường ghi — đúng thứ
-- mục D1 cấm. Nên: RENAME-SWAP, KHÔNG `DROP`.
--
-- KHÔNG MỘT CÂU `UPDATE` NÀO TRÊN DỮ LIỆU CŨ (Sếp Ngọc, kỷ luật số 3).
-- Sáu bài học đang chạy trên bản thật được chép sang NGUYÊN VĂN. Cột mới của
-- chúng nhận đúng giá trị mặc định, và `nguoi_thuc_hien_loai` của chúng là
-- 'khong_ro' — KHÔNG phải 'may', KHÔNG phải 'nguoi'.
--
-- VÌ SAO 'khong_ro' MÀ KHÔNG PHẢI 'may' (Rule 10 — không diễn giải lại lịch sử):
-- Cả 6 dòng cũ đều có `nguoi_day_id` = NULL. Ta BIẾT nội dung do Llama soạn
-- (đường ghi duy nhất là dayNghe), nhưng ta KHÔNG BIẾT ai đã bảo nó soạn — mà
-- đó mới là người chịu trách nhiệm. Gán 'may' + một tác nhân bịa ra là in một
-- cái tên vào chỗ vốn trống. Gán 'nguoi' + nguoi_day_id NULL là mạo danh.
-- 'khong_ro' nói đúng thứ đang có: không truy được ai uỷ quyền.
-- Từ dòng thứ 7 trở đi thì CHECK không cho phép mập mờ nữa.
--
-- Chạy:  node scripts/chay-migration.mjs them-vp-kynang-tang.sql
-- (thêm --remote khi lên bản thật — CHẠY TRƯỚC deploy, deploy KHÔNG tự chạy
--  migration; xem thứ tự đầy đủ ở cuối file)
-- ==========================================================================

-- ---- CHỐT CHẶN CHẠY LẠI --------------------------------------------------
-- schema_migrations.filename là PRIMARY KEY. Chạy lần 2, dòng này báo lỗi
-- UNIQUE constraint và file DỪNG NGAY TẠI ĐÂY — trước mọi lệnh đổi cấu trúc.
-- Thấy "UNIQUE constraint failed: schema_migrations" tức là ĐÃ CHẠY RỒI,
-- không phải hỏng.
INSERT INTO schema_migrations (filename) VALUES ('them-vp-kynang-tang.sql');

-- ---- Bảng mới ------------------------------------------------------------
CREATE TABLE vp_ky_nang_v2 (
  id           TEXT PRIMARY KEY,
  agent_id     TEXT NOT NULL,
  tieu_de      TEXT NOT NULL,
  noi_dung     TEXT NOT NULL,
  yeu_cau_goc  TEXT,
  nguoi_day_id TEXT REFERENCES nhan_su(id),
  dang_dung    INTEGER NOT NULL DEFAULT 1,
  tao_luc      TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),

  -- ---- ① THỨ BẬC LUẬT ---------------------------------------------------
  -- Thứ tự Sếp ban hành 09/09/2026:
  --   SYSTEM SAFETY > COMPANY > DEPARTMENT > ROLE > AGENT-SPECIFIC > USER TEMPORARY
  -- ⚠️ 'system_safety' CỐ Ý KHÔNG NẰM TRONG TẬP GIÁ TRỊ NÀY (mục D1).
  -- Tầng an toàn hệ thống ở lại MÃ NGUỒN (hằng HIEN_PHAP, src/agents-vp.js).
  -- Lý do đo được: bảng này có đúng một câu `UPDATE ... SET dang_dung = 0` bật
  -- tắt được mọi dòng. Cho luật an toàn vào chung bảng là cho nó chung luôn
  -- cái công tắc ấy. Không có đường ghi thì không có đường lách.
  tang         TEXT NOT NULL DEFAULT 'agent',

  -- Tầng nào thì trỏ vào đâu:
  --   company    → NULL (áp cho cả công ty)
  --   department → mã phòng ban (agents-vp.js: agent.phong_ban_id)
  --   role       → mã vai trò / vị trí công việc (quyen.js: VI_TRI_CONG_VIEC)
  --   agent      → NULL (đã có agent_id)
  --   user_tmp   → nhan_su.id của người đặt hướng dẫn tạm
  pham_vi_id   TEXT,

  -- USER TEMPORARY phải hết hạn THẬT. Không có cột này thì "tạm thời" chỉ là
  -- lời hứa, và mọi lượt hỏi về sau đều trả tiền token cho một lời hứa.
  -- Lọc ở SQL (src/vp-luat.js), KHÔNG lọc ở JS sau khi đã đọc lên.
  het_han_luc  TEXT,

  -- Không có cột này thì không biết bài học bị đụng vào lúc nào.
  cap_nhat_luc TEXT,

  -- ---- ② AI SOẠN, AI CHỊU TRÁCH NHIỆM (D4) ------------------------------
  -- Trước bản này `nguoi_day_id` lưu nhan_su_id của Sếp (vp-may.js:663) trong
  -- khi 400 chữ `noi_dung` do Llama soạn (vp-may.js:634). Sếp chỉ nói một câu
  -- "cần học soạn thảo văn bản"; phần còn lại là của mô hình. Sổ ghi tên người
  -- cho một dòng chữ của máy — đúng ca them-gopy-lichsu-tacnhan.sql:56 đã đi vá
  -- một lần, lần này ngược chiều.
  --
  -- BA SỰ THẬT KHÁC NHAU, BA CỘT KHÁC NHAU (gộp làm một chính là gốc của lỗi):
  --   nguoi_thuc_hien_loai — AI SOẠN ra 400 chữ này?   may | nguoi | khong_ro
  --   tac_nhan             — MÁY NÀO soạn?             'may/llama-3.3-70b-fp8-fast'
  --   uy_quyen_boi_id      — AI CHỊU TRÁCH NHIỆM?      người đã bảo máy soạn
  nguoi_thuc_hien_loai TEXT NOT NULL DEFAULT 'khong_ro',
  tac_nhan             TEXT,
  uy_quyen_boi_id      TEXT REFERENCES nhan_su(id),

  -- ---- ③ KẸP Ở TẦNG DB --------------------------------------------------
  -- Kẹp tập giá trị ở TẦNG NGOÀI rồi mới chia nhánh — kẹp bên trong từng nhánh
  -- là vô nghĩa (ở đó nó luôn đúng), bài học REV-0016 mục 5.
  CHECK (
    tang IN ('company', 'department', 'role', 'agent', 'user_tmp')
    AND nguoi_thuc_hien_loai IN ('may', 'nguoi', 'khong_ro')
    AND (
      -- MÁY soạn: bắt buộc có nhãn máy VÀ có người chịu trách nhiệm.
      -- Không còn dòng nào của máy đứng một mình không ai bảo lãnh.
      (nguoi_thuc_hien_loai =  'may'      AND tac_nhan IS NOT NULL AND uy_quyen_boi_id IS NOT NULL) OR
      -- NGƯỜI gõ thẳng: cấm mang nhãn máy, bắt buộc có tên người.
      -- Không dòng nào của người còn in được tên một con máy cạnh chữ của mình.
      (nguoi_thuc_hien_loai =  'nguoi'    AND tac_nhan IS NULL     AND uy_quyen_boi_id IS NOT NULL) OR
      -- 6 dòng cũ, và CHỈ chúng: không truy được ai uỷ quyền. Cấm mang cả
      -- nhãn máy lẫn tên người — nói đúng thứ đang có là "không rõ".
      (nguoi_thuc_hien_loai = 'khong_ro'  AND tac_nhan IS NULL     AND uy_quyen_boi_id IS NULL)
    )
  )
);

-- ---- Chép nguyên dữ liệu cũ ---------------------------------------------
-- Liệt kê ĐÍCH DANH từng cột, không dùng `SELECT *`: bảng cũ và bảng mới khác
-- số cột, `*` sẽ lệch cột mà SQLite vẫn nhận nếu số lượng tình cờ khớp.
-- Cột mới KHÔNG được nêu ở đây → chúng nhận đúng giá trị DEFAULT. Đó là chủ ý:
-- không một câu UPDATE nào chạm vào dữ liệu cũ.
INSERT INTO vp_ky_nang_v2
  (id, agent_id, tieu_de, noi_dung, yeu_cau_goc, nguoi_day_id, dang_dung, tao_luc,
   tang, nguoi_thuc_hien_loai)
SELECT
   id, agent_id, tieu_de, noi_dung, yeu_cau_goc, nguoi_day_id, dang_dung, tao_luc,
   'agent', 'khong_ro'
  FROM vp_ky_nang;

-- ---- Đổi tên: bảng cũ thành BẢN LƯU, bảng mới lên thay ------------------
-- KHÔNG có lệnh DROP nào trong file này. Xoá bản lưu hay không là quyết định
-- riêng của Sếp, vài tháng sau, khi đã yên tâm. Lùi = 2 lệnh rename ngược
-- (lui-vp-kynang-tang.sql), mất 0 dòng.
ALTER TABLE vp_ky_nang    RENAME TO vp_ky_nang_luu_20260909;
ALTER TABLE vp_ky_nang_v2 RENAME TO vp_ky_nang;

-- ---- Chỉ mục ------------------------------------------------------------
-- TÊN PHẢI KHÁC idx_vp_kynang_dung: tên đó đã theo bảng cũ sang
-- vp_ky_nang_luu_20260909 sau lệnh rename (chỉ mục đi cùng bảng của nó). Dùng
-- lại đúng tên đó kèm IF NOT EXISTS thì SQLite lặng lẽ BỎ QUA, và bảng thật
-- chạy không có chỉ mục nào mà không ai biết — đúng cái bẫy
-- them-gopy-lichsu-tacnhan.sql:78 đã ghi lại.
--
-- Chỉ mục MỘT PHẦN, thêm `tang` vào giữa: câu đọc nóng nay là
--   WHERE agent_id = ? AND tang = ? AND dang_dung = 1 ORDER BY tao_luc DESC
-- chạy ở MỌI câu hỏi gửi tới trợ lý đó. Bài đã tắt không nằm trong chỉ mục nên
-- chỉ mục luôn nhỏ dù bảng dài ra theo năm tháng.
CREATE INDEX IF NOT EXISTS idx_vp_kynang_tang
  ON vp_ky_nang(agent_id, tang, tao_luc) WHERE dang_dung = 1;

-- Tầng COMPANY/DEPARTMENT/ROLE không lọc theo agent_id — chúng áp cho nhiều
-- trợ lý. Chỉ mục riêng để câu đọc tầng chung không phải quét cả bảng.
CREATE INDEX IF NOT EXISTS idx_vp_kynang_pham_vi
  ON vp_ky_nang(tang, pham_vi_id, tao_luc) WHERE dang_dung = 1;

-- ---- Tự đối chiếu --------------------------------------------------------
-- Chạy tay sau migration, hai số PHẢI bằng nhau (bản thật 09/09/2026: 6 = 6):
--   SELECT (SELECT COUNT(*) FROM vp_ky_nang) AS moi,
--          (SELECT COUNT(*) FROM vp_ky_nang_luu_20260909) AS luu;
-- Và số này PHẢI bằng 6, không phải 0:
--   SELECT COUNT(*) FROM vp_ky_nang WHERE nguoi_thuc_hien_loai = 'khong_ro';
--
-- ---- THỨ TỰ TRIỂN KHAI — KHÔNG ĐƯỢC ĐẢO ---------------------------------
--   1. node scripts/chay-migration.mjs them-vp-kynang-tang.sql --remote
--   2. deploy code
-- Đảo thứ tự thì trong quãng giữa, code mới đọc cột `tang` trên bảng chưa có
-- cột đó → mọi câu hỏi gửi tới trợ lý đều rơi vào nhánh catch và trợ lý chạy
-- không có bài học nào. Chiều đúng thì trong quãng giữa code CŨ đọc bảng MỚI:
-- nó chỉ SELECT các cột cũ, tất cả vẫn còn nguyên → không gãy.
