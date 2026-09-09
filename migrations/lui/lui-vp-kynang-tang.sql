-- ==========================================================================
-- LÙI them-vp-kynang-tang.sql — 3 lệnh, mất 0 dòng
-- --------------------------------------------------------------------------
-- Chạy khi bản mới có chuyện và cần trả bảng về đúng hình dạng cũ ngay.
--
-- KHÔNG XOÁ BẢNG MỚI. Bảng mới được đổi tên thành vp_ky_nang_v2_hong_20260909
-- để còn đọc lại xem đã ghi được những gì trong quãng chạy bản mới — xoá đi là
-- mất luôn manh mối, và những dòng ghi trong quãng đó KHÔNG có ở bảng cũ.
--
-- LÙI RỒI TIẾN LẠI ĐƯỢC — bài học REV-0016 mục 2: nút hoàn tác chỉ bấm được
-- một lần thì không phải nút hoàn tác. File xuôi tạo bảng tên `vp_ky_nang_v2`
-- rồi đổi tên ngay, còn file này đổi bảng mới sang `vp_ky_nang_v2_hong_...`,
-- nên lần TIẾN sau KHÔNG vấp "table vp_ky_nang_v2 already exists".
-- Nói rõ giới hạn: lùi LẦN THỨ HAI thì dừng ở lệnh đổi tên vì tên hỏng cũ đã
-- có. Đó là hành vi ĐÚNG — nó từ chối chứ không đè lên bản lưu của lần trước.
-- Cần lùi lần hai thì đổi tay hậu tố ngày trong hai dòng dưới.
--
-- Nằm trong migrations/lui/ theo đúng luật ở README.md của thư mục này: máy nạp
-- tự động chỉ quét file .sql nằm THẲNG trong migrations/, nên để ở đây là hết
-- đường chạy nhầm — không cần thêm dòng mã chặn nào.
--
-- Chạy TAY khi thật sự cần lùi:
--   npx wrangler d1 execute crm-agc --remote --file=migrations/lui/lui-vp-kynang-tang.sql
--
-- ⚠️ PHẢI DEPLOY LẠI MÃ CŨ TRƯỚC KHI LÙI. Mã mới đọc cột `tang`; đổi bảng ra
-- trong khi mã mới đang chạy là mọi câu hỏi gửi tới trợ lý rơi vào nhánh catch
-- và trợ lý chạy không có bài học nào.
-- ==========================================================================

-- Gỡ dấu đã chạy, để sau này còn chạy lại được migration xuôi.
DELETE FROM schema_migrations WHERE filename = 'them-vp-kynang-tang.sql';

ALTER TABLE vp_ky_nang                RENAME TO vp_ky_nang_v2_hong_20260909;
ALTER TABLE vp_ky_nang_luu_20260909   RENAME TO vp_ky_nang;

-- Chỉ mục cũ idx_vp_kynang_dung đã đi theo bảng cũ suốt quá trình, nên sau hai
-- lệnh trên nó lại nằm đúng trên vp_ky_nang. Không phải tạo lại.
-- Hai chỉ mục mới (idx_vp_kynang_tang, idx_vp_kynang_pham_vi) đi theo bảng
-- vp_ky_nang_v2_hong_20260909 — để nguyên, chúng không cản gì.
