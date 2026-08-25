# ADR-0002: Employee Core — 1 nguồn duy nhất, có Business Code

**Date:** 2026-08-23 (ghi nhận lại quyết định đã áp dụng — xem
[ENTITY_IDENTITY.md](../ENTITY_IDENTITY.md) §5)

**Decision:** `nhan_su` là nguồn duy nhất cho dữ liệu nhân sự toàn công
ty. Không tạo bảng nhân sự thứ hai cho bất kỳ domain nào (Kho vận, Kế
toán...). Có `ma_nv` (Business Code, bất biến, sinh tự động theo Loại lao
động) tách biệt với `id` nội bộ và `ho_ten` (có thể trùng/đổi).

**Context:** Nhiều domain (Kho vận, Xếp ca, Tài sản, Kế toán) đều cần
tham chiếu tới "ai làm việc này". Rủi ro thường gặp ở ERP tự phát triển:
mỗi domain tự lưu 1 bản sao thông tin nhân viên (`warehouse_employee`,
`hr_employee`...) rồi lệch nhau dần.

**Alternatives:**
1. Mỗi domain tự quản danh sách nhân sự riêng theo nhu cầu — bị loại vì vi
   phạm Rule 1 (One Fact, One Owner) ngay từ đầu.
2. 1 bảng `nhan_su` dùng chung, mọi domain reference qua `id` (đã chọn).

**Chosen approach:** Phương án 2. Domain chỉ được thêm bảng phụ tham
chiếu `nhan_su(id)` (VD `tai_san.nguoi_giu_id`, `giao_dich_kho.nguoi_thuc_hien`),
không được copy field nhân sự (tên/SĐT/phòng ban) vào bảng riêng.

**Reason:** Đây là điểm mạnh nhất đã kiểm chứng của codebase hiện tại
(xem `docs/audit/AUDIT-KIEN-TRUC.md` §E — "không có silo Employee/Product,
kỷ luật dùng chung được giữ tốt suốt quá trình phát triển nhanh"). Ghi
thành ADR để quyết định này KHÔNG bị phá vỡ khi có thêm người/Claude tham
gia code không biết lịch sử — mọi module mới PHẢI reference `nhan_su`,
không tạo bản sao.
