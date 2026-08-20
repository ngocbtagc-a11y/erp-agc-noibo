-- Sao tích luỹ — Sếp Ngọc yêu cầu 20/08/2026: mỗi lần được Vinh danh thì
-- cộng thêm sao, sau này dùng đổi quà (catalog/đổi quà CHƯA xây, đây mới chỉ
-- là phần tích luỹ điểm gắn liền với Vinh danh).
ALTER TABLE nhan_su ADD COLUMN sao INTEGER NOT NULL DEFAULT 0;
