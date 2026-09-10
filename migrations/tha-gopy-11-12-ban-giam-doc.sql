-- ===========================================================================
-- THẢ HAI PHIẾU GÓP Ý CỦA SẾP NGỌC RA KHỎI HÀNG CHỜ DUYỆT
-- ---------------------------------------------------------------------------
-- ⚠️ FILE NÀY SỬA DỮ LIỆU THẬT. Sếp Ngọc đọc từng dòng rồi mới bấm chạy.
--    Mỗi phiếu MỘT câu lệnh, có tên phiếu trong chú thích. KHÔNG có vòng lặp,
--    KHÔNG có câu nào quét theo nhóm — một câu quét nhóm là một câu không ai
--    kiểm được bằng mắt.
--
-- Chạy:
--   node scripts/chay-migration.mjs tha-gopy-11-12-ban-giam-doc.sql --remote
--
-- ---------------------------------------------------------------------------
-- VÌ SAO CÓ FILE NÀY
-- ---------------------------------------------------------------------------
-- Sếp Bùi Thị Ngọc chốt 10/09/2026: "Các yêu cầu của ban giám đốc thì không
-- cần duyệt đâu."
--
-- Lỗi đã vá bằng mã nguồn (src/gopy-cua-duyet.js): có HAI đường tạo phiếu góp
-- ý, và chỉ MỘT đường biết luật miễn duyệt. Đường Mây bóc câu nói trong Văn
-- phòng ảo viết cứng trang_thai = 'moi' + next_owner = 'QL_CAP1', không hề hỏi
-- người gửi có được miễn hay không.
--
-- Bản vá chỉ chữa các phiếu TỪ NAY VỀ SAU. Hai phiếu đã lỡ rơi vào hàng chờ
-- trước khi vá thì phải thả bằng tay — đó là file này.
--
-- ---------------------------------------------------------------------------
-- BA PHIẾU ĐANG Ở 'moi', CHỈ THẢ HAI
-- ---------------------------------------------------------------------------
--   id 11  "Kéo đơn hàng về ERP"  — Bùi Thị Ngọc      → THẢ
--   id 12  "Kết nối API"          — Bùi Thị Ngọc      → THẢ
--   id 10  "Phần mềm"             — Nguyễn Thị Huyền  → GIỮ NGUYÊN
--
-- 🔴 KHÔNG ĐỘNG VÀO PHIẾU 10. Chị Nguyễn Thị Huyền KHÔNG thuộc Ban Giám đốc,
--    phiếu của chị phải đi qua cổng duyệt cấp 1 như mọi nhân viên khác. Thả
--    nhầm phiếu đó là cắt quá tay, và là đúng loại lỗi mà bản vá phải tránh.
--    File này không có câu lệnh nào chạm tới id 10 — kiểm bằng cách tìm chuỗi
--    "= 10" trong file, phải KHÔNG có kết quả nào.
--
-- ---------------------------------------------------------------------------
-- ĐẶT LẠI ĐÚNG NHỮNG GÌ MÃ NGUỒN ĐÃ VÁ SẼ TỰ ĐẶT
-- ---------------------------------------------------------------------------
-- Không tự nghĩ ra giá trị mới. Từng ô dưới đây là ô mà `taoPhieuGopYChung()`
-- ghi cho một người gửi được miễn duyệt:
--   trang_thai      = 'cho_phan_tich'   -- vào thẳng, không qua cổng nào
--   current_owner   = 'HOLY'            -- GOPY_OWNER_THEO_TT.cho_phan_tich
--   next_owner      = 'HOLY'            -- ⚠️ cột NOT NULL. Quy ước trong kho
--                                       --    này là 'NONE' khi không còn ai
--                                       --    cầm việc, KHÔNG BAO GIỜ là NULL.
--                                       --    Ở đây việc đang có người cầm nên
--                                       --    là 'HOLY', không phải 'NONE'.
--   risk            = 'MEDIUM'          -- sàn an toàn; không có ô này thì
--                                       --    phiếu kẹt ở bước 'da_duyet' vì
--                                       --    `canRisk` mà không còn cổng nào
--                                       --    để chốt rủi ro nữa
--   duyet_cap1_nguon = 'TU_DUYET_OWNER' -- Sếp Ngọc ĐANG GIỮ cờ `duyet_gopy`,
--                                       --    mà mã nguồn xét vế cờ TRƯỚC vế
--                                       --    cơ cấu. Ghi 'BAN_GIAM_DOC' ở đây
--                                       --    là chép sai đường đi thật.
--
-- Ba ô "ai đóng dấu" đều lấy THẲNG từ `nguoi_gui_id` của chính phiếu, không gõ
-- id người vào file: id gõ tay là một chỗ để sai, mà cột đó đã có sẵn câu trả
-- lời đúng.
--
-- ---------------------------------------------------------------------------
-- HAI CHỐT CHẶN TRONG MỖI CÂU `WHERE`
-- ---------------------------------------------------------------------------
--   AND nguoi_gui_id = 'ns_admin1'   -- đúng người (Bùi Thị Ngọc)
--   AND trang_thai   = 'moi'         -- đúng chỗ, chưa ai chạm vào
-- Lệch một trong hai thì câu lệnh đổi 0 dòng và không hỏng gì. Thà không chạy
-- còn hơn ghi đè nhầm một phiếu có thật.
-- ===========================================================================


-- ═══ XEM TRƯỚC KHI BẤM — dán riêng câu này lên D1, đọc rồi mới chạy file ═══
-- SELECT id, tieu_de, trang_thai, current_owner, next_owner, nguoi_gui_id
--   FROM gop_y WHERE id IN (10, 11, 12) ORDER BY id;
-- Phải thấy đúng: 10 Phần mềm / 11 Kéo đơn hàng về ERP / 12 Kết nối API,
-- cả ba đang 'moi' và chờ 'QL_CAP1'.


-- ═══ PHIẾU 11 · "Kéo đơn hàng về ERP" · Bùi Thị Ngọc ══════════════════════
UPDATE gop_y SET
  trang_thai        = 'cho_phan_tich',
  current_owner     = 'HOLY',
  next_owner        = 'HOLY',
  risk              = 'MEDIUM',
  risk_chot_boi_id  = nguoi_gui_id,
  risk_chot_luc     = datetime('now', '+7 hours'),
  duyet_cap1_boi_id = nguoi_gui_id,
  duyet_cap1_luc    = datetime('now', '+7 hours'),
  duyet_cap1_nguon  = 'TU_DUYET_OWNER',
  duyet_owner_boi_id = nguoi_gui_id,
  duyet_owner_luc   = datetime('now', '+7 hours'),
  cho_duyet_tu_luc  = datetime('now', '+7 hours'),
  cap_nhat_luc      = datetime('now', '+7 hours')
WHERE id = 11 AND nguoi_gui_id = 'ns_admin1' AND trang_thai = 'moi';

-- Dòng nhật ký cho phiếu 11. MIỄN DUYỆT KHÔNG PHẢI MIỄN GHI VẾT: phiếu không
-- có dấu duyệt của ai thì sổ phải nói rõ vì sao, để sau này không ai phải đoán.
--
-- Ghi dưới danh nghĩa MÁY, không mạo danh người: không có ai ngồi bấm nút này,
-- đây là một lượt vá chạy bằng tay. `nguoi_thuc_hien_loai = 'he_thong'` +
-- `tac_nhan` có giá trị + `nguoi_doi_id` NULL là đúng nhánh máy mà CHECK ở tầng
-- DB đòi (them-gopy-lichsu-tacnhan.sql). `uy_quyen_boi_id` = Sếp Ngọc: người
-- chịu trách nhiệm cho lượt vá này.
--
-- `WHERE EXISTS` là chốt chặn thứ ba: câu UPDATE ở trên không đổi được dòng nào
-- (sai id, sai người, ai đó vừa chạm vào phiếu) thì cũng KHÔNG có dòng nhật ký
-- nào được ghi. Sổ không bao giờ kể một việc chưa xảy ra.
--
-- `AND NOT EXISTS` là chốt chặn thứ tư — CHẠY LẠI FILE KHÔNG ĐƯỢC ĐẺ THÊM DÒNG.
-- Câu UPDATE tự nó đã an toàn khi chạy lần hai (chốt `trang_thai = 'moi'` không
-- còn đúng nữa nên đổi 0 dòng), nhưng câu INSERT thì `WHERE EXISTS` lại ĐÚNG ở
-- lần hai — phiếu bấy giờ đang ở 'cho_phan_tich' thật. Thiếu vế này thì mỗi lần
-- lỡ bấm lại là thêm một dòng nhật ký kể cùng một việc.
INSERT INTO gop_y_lich_su
  (gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id,
   nguoi_thuc_hien_loai, tac_nhan, uy_quyen_boi_id, ghi_chu, luc)
SELECT 11, 'moi', 'cho_phan_tich', NULL,
       'he_thong', 'VA_HAI_DUONG_MOT_LUAT', 'ns_admin1',
       'Thả khỏi hàng chờ duyệt. Phiếu này do Mây tạo từ Văn phòng ảo lúc 01:43 ngày 10/09/2026, '
       || 'lẽ ra đã phải đi thẳng vì người gửi giữ quyền duyệt cấp cuối — nhưng đường tạo phiếu của '
       || 'Văn phòng ảo lúc đó chưa biết luật miễn duyệt nên phiếu rơi vào hàng chờ của quản lý cấp 1. '
       || 'Lỗi đã vá ở src/gopy-cua-duyet.js (một nhánh quyết định dùng chung cho mọi đường tạo phiếu). '
       || 'Sếp Bùi Thị Ngọc chốt 10/09/2026: "Các yêu cầu của ban giám đốc thì không cần duyệt đâu". '
       || 'Rủi ro tạm ghi Trung bình.',
       datetime('now', '+7 hours')
 WHERE EXISTS (SELECT 1 FROM gop_y
                WHERE id = 11 AND nguoi_gui_id = 'ns_admin1'
                  AND trang_thai = 'cho_phan_tich')
   AND NOT EXISTS (SELECT 1 FROM gop_y_lich_su
                    WHERE gop_y_id = 11 AND tac_nhan = 'VA_HAI_DUONG_MOT_LUAT');


-- ═══ PHIẾU 12 · "Kết nối API" · Bùi Thị Ngọc ══════════════════════════════
UPDATE gop_y SET
  trang_thai        = 'cho_phan_tich',
  current_owner     = 'HOLY',
  next_owner        = 'HOLY',
  risk              = 'MEDIUM',
  risk_chot_boi_id  = nguoi_gui_id,
  risk_chot_luc     = datetime('now', '+7 hours'),
  duyet_cap1_boi_id = nguoi_gui_id,
  duyet_cap1_luc    = datetime('now', '+7 hours'),
  duyet_cap1_nguon  = 'TU_DUYET_OWNER',
  duyet_owner_boi_id = nguoi_gui_id,
  duyet_owner_luc   = datetime('now', '+7 hours'),
  cho_duyet_tu_luc  = datetime('now', '+7 hours'),
  cap_nhat_luc      = datetime('now', '+7 hours')
WHERE id = 12 AND nguoi_gui_id = 'ns_admin1' AND trang_thai = 'moi';

-- Dòng nhật ký cho phiếu 12 — cùng khuôn với phiếu 11, chỉ khác giờ tạo.
INSERT INTO gop_y_lich_su
  (gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id,
   nguoi_thuc_hien_loai, tac_nhan, uy_quyen_boi_id, ghi_chu, luc)
SELECT 12, 'moi', 'cho_phan_tich', NULL,
       'he_thong', 'VA_HAI_DUONG_MOT_LUAT', 'ns_admin1',
       'Thả khỏi hàng chờ duyệt. Phiếu này do Mây tạo từ Văn phòng ảo lúc 01:45 ngày 10/09/2026, '
       || 'lẽ ra đã phải đi thẳng vì người gửi giữ quyền duyệt cấp cuối — nhưng đường tạo phiếu của '
       || 'Văn phòng ảo lúc đó chưa biết luật miễn duyệt nên phiếu rơi vào hàng chờ của quản lý cấp 1. '
       || 'Lỗi đã vá ở src/gopy-cua-duyet.js (một nhánh quyết định dùng chung cho mọi đường tạo phiếu). '
       || 'Sếp Bùi Thị Ngọc chốt 10/09/2026: "Các yêu cầu của ban giám đốc thì không cần duyệt đâu". '
       || 'Rủi ro tạm ghi Trung bình.',
       datetime('now', '+7 hours')
 WHERE EXISTS (SELECT 1 FROM gop_y
                WHERE id = 12 AND nguoi_gui_id = 'ns_admin1'
                  AND trang_thai = 'cho_phan_tich')
   AND NOT EXISTS (SELECT 1 FROM gop_y_lich_su
                    WHERE gop_y_id = 12 AND tac_nhan = 'VA_HAI_DUONG_MOT_LUAT');


-- ═══ ĐẾM LẠI CHO CHẮC ══════════════════════════════════════════════════════
-- Chạy xong, dán câu này lên D1 để đối chiếu:
--
--   SELECT id, tieu_de, trang_thai, current_owner, next_owner, duyet_cap1_nguon
--     FROM gop_y WHERE id IN (10, 11, 12) ORDER BY id;
--
-- Phải ra ĐÚNG thế này:
--   10 · Phần mềm             · moi           · NGUOI_GUI · QL_CAP1 · (trống)
--   11 · Kéo đơn hàng về ERP  · cho_phan_tich · HOLY      · HOLY    · TU_DUYET_OWNER
--   12 · Kết nối API          · cho_phan_tich · HOLY      · HOLY    · TU_DUYET_OWNER
--
-- Dòng 10 mà đổi bất cứ ô nào là SAI — báo lại ngay, đừng chạy tiếp gì nữa.
--
--   SELECT gop_y_id, tac_nhan, uy_quyen_boi_id, substr(ghi_chu, 1, 60)
--     FROM gop_y_lich_su WHERE gop_y_id IN (11, 12) ORDER BY gop_y_id;
-- Phải có ĐÚNG hai dòng, mỗi phiếu một dòng.
