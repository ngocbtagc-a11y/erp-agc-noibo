-- ==========================================================================
-- MIGRATION — Nhớ bảng GHÉP CỘT của mỗi dạng file nạp
-- --------------------------------------------------------------------------
-- Vì sao có bảng này: file xuất từ Shopee, từ phần mềm kế toán, từ Excel tự
-- làm đều đặt tên cột khác nhau. ERP KHÔNG được đoán cột nào là cột nào —
-- đoán sai một cột là cả bảng sai, mà sai êm (số vẫn vào, chỉ vào nhầm ô).
-- Nên người chọn, máy NHỚ. Lần sau tải file cùng dạng thì tự điền sẵn, Sếp
-- chỉ việc xác nhận.
--
-- "Dạng file" nhận diện bằng `van_tay`: lấy danh sách tên cột, bỏ dấu, sắp
-- xếp rồi băm SHA-256 (12 byte đầu). Cùng một loại báo cáo xuất ra thì tên
-- cột giống nhau nên vân tay giống nhau, kể cả khi số dòng khác.
--
-- Bảng này ĐÚNG MỘT DÒNG cho mỗi (dạng file + đích nạp) — cả đời vài chục
-- dòng, không phải nguồn ghi đáng lo.
--
-- ⚠️ GHI VẾT ai nạp file gì KHÔNG nằm ở đây — dùng bảng `lich_su_thay_doi_nen`
--    sẵn có (xem src/nap-du-lieu.js, hàm ghiThat). Không đẻ bảng mới cho việc
--    đã có chỗ.
--
--   Nạp máy:  npm run nap-ghepcot-may
--   Nạp mây:  npm run nap-ghepcot
-- ==========================================================================

CREATE TABLE IF NOT EXISTS nap_ghep_cot (
  van_tay    TEXT NOT NULL,                    -- băm của danh sách tên cột
  ma_dich    TEXT NOT NULL,                    -- 'san_pham' | 'ton_kho'
  ghep_json  TEXT NOT NULL,                    -- { ma_truong: chi_so_cot }
  nguoi_id   TEXT REFERENCES nhan_su(id),      -- ai ghép lần gần nhất
  luc        TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')),
  PRIMARY KEY (van_tay, ma_dich)
);
