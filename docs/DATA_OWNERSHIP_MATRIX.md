# Data Ownership Matrix — ERP Alpha Green Commerce

Tài liệu tham chiếu, KHÔNG phải hệ thống phân quyền mới. Ghi lại ai chịu
trách nhiệm nhập/sửa từng nhóm dữ liệu, đúc kết từ các quyết định đã chốt
trong quá trình xây ERP. Cập nhật file này khi có quyết định ownership mới
— không cần xây UI/code riêng để "thực thi" bảng này, quyền thật vẫn nằm ở
`src/quyen.js` và kiểm tra ở backend như hiện tại.

Nguyên tắc nền: **Employee (con người) và User Account (tài khoản đăng
nhập) là 2 thứ khác nhau** — 1 người có thể chưa/đã/từng có tài khoản,
nhưng hồ sơ nhân sự luôn tồn tại độc lập. **Người hiểu dữ liệu nhất là
người nhập** — không để 1 phòng ban nhập thay phòng ban khác nếu tránh
được.

Cột **Phòng ban thật** đối chiếu theo đúng 4 phòng ban Sếp đã tự nhập
trong Dữ liệu nền (Ban Giám đốc / P. Kho Vận-Sản Xuất / P. Kinh Doanh-MKT
/ P. Support [Kế toán-Nhân sự-Admin]) — xem
[docs/ERP_V2_INFORMATION_ARCHITECTURE.md](./ERP_V2_INFORMATION_ARCHITECTURE.md).

| Dữ liệu | Bảng | Owner tạo/sửa (vai trò) | Phòng ban thật | Chỉ xem (không sửa) | Ghi chú |
|---|---|---|---|---|---|
| Hồ sơ nhân sự (tên, SĐT, email, phòng ban, chức danh, quản lý trực tiếp, trạng thái HĐ) | `nhan_su` | HCNS, Admin | P. Support | Mọi vai trò (qua Nhân sự/Danh bạ, không thấy lương nếu không có quyền) | Nhập ở tab **Nhân sự** (không phải Quản trị) |
| Lương | `nhan_su.luong` | Admin | Ban Giám đốc | HCNS không xem/sửa được | Ranh giới cứng, máy chủ tự chặn |
| Tài khoản đăng nhập (username/mật khẩu/vai trò) | `tai_khoan` | Admin | P. Support | HCNS xem trạng thái (có/chưa có tài khoản) | Tab **Quản trị** — tách hẳn khỏi hồ sơ nhân sự |
| Phòng ban / Chức danh (danh mục) | `phong_ban`, `chuc_danh` | HCNS, Admin | **Ban Giám đốc** | Ai cũng chọn được khi thêm nhân sự | Cấp công ty — đề xuất MOVE khỏi Dữ liệu nền → Quản trị doanh nghiệp |
| Đơn vị tính | `don_vi_tinh` | Quản lý kho, Admin | **P. Kho Vận-Sản Xuất** | Ai cũng chọn được khi thêm sản phẩm | Đề xuất MOVE khỏi Dữ liệu nền → Kho vận & Sản xuất |
| Sản phẩm/SKU (tên, danh mục, đơn vị, mức tồn tối thiểu) | `san_pham` | Kinh doanh (van_hanh_san) khoá/duyệt; Kho vận sửa ngày thường; Admin luôn sửa được | **P. Kinh Doanh-MKT** (khoá) / P. Kho Vận-Sản Xuất (sửa) | Ai có quyền xem tab liên quan | Đã chuyển xong 22/08/2026 — Kinh doanh quyết định bán gì, Kho vận là người nhập/xuất thực tế |
| Nhà cung cấp | `nha_cung_cap` | Quản lý kho, Admin | **P. Kho Vận-Sản Xuất** | — | Công ty chưa có phòng Mua hàng riêng — đề xuất MOVE khỏi Dữ liệu nền → Kho vận & Sản xuất |
| Kho (danh sách kho vật lý) | `kho` | Admin | P. Kho Vận-Sản Xuất | — | Cấu hình vận hành kho — đề xuất MOVE khỏi Dữ liệu nền → Kho vận & Sản xuất |
| Tồn kho (nhập/xuất/điều chỉnh) | `giao_dich_kho`, `lo_hang` | Kho vận (Quản lý kho + Nhân viên kho) | P. Kho Vận-Sản Xuất | Kế toán trưởng xem giá vốn | Sổ cái bất biến, không sửa trực tiếp |
| Đơn hàng | `don_hang` | **AUTO** — đồng bộ tự động từ Shopee/TikTok (sàn là nguồn thật) | P. Kinh Doanh-MKT | Vận hành sàn, Kế toán, Admin | Không ai nhập tay |
| Đơn hoàn | `don_hoan` | **AUTO** tạo từ sàn; Kho xác nhận nhận hàng; Vận hành sàn xử lý; Kế toán tra soát tiền | P. Kinh Doanh-MKT + P. Kho Vận-Sản Xuất + P. Support | — | Luồng 3 chặng, mỗi bên chỉ sửa đúng chặng của mình |
| Đối soát / tra soát tiền | (field trong `don_hoan`) | Kế toán | P. Support | Vận hành sàn, Admin | Kế toán ĐỌC dữ liệu đơn hoàn có sẵn, không nhập lại đơn |
| Mục tiêu (MBO) | `muc_tieu` | Người tạo mục tiêu (cấp cá nhân: chính người/quản lý; cấp phòng ban: HCNS; cấp công ty: Admin) | Tất cả phòng (phân theo cấp) | Toàn công ty (minh bạch) | Tiến độ % **AUTO tính** từ việc đã hoàn thành, không nhập tay |
| Công việc (Trạm Mục Tiêu) | `cong_viec` | Người giao việc (bất kỳ ai có quyền) | Tất cả phòng | Người liên quan + toàn công ty (Lịch sử làm việc) | — |
| Dữ liệu đã khoá (Data Lock) | `trang_thai`/`trang_thai_dl` trên 7 bảng nền | Chỉ Admin sửa được khi đã khoá | Ban Giám đốc (mở khoá) | Owner gốc chỉ xem, không sửa | Xem thêm lịch sử tại `lich_su_thay_doi_nen` |

## Nguyên tắc áp dụng khi thêm dữ liệu mới

Trước khi thêm 1 trường/module mới, tự hỏi:
1. Phòng ban nào hiểu dữ liệu này nhất?
2. Dữ liệu đã có ở nguồn khác chưa (API sàn, danh mục đã có)?
3. Có cần nhập tay không, hay hệ thống tự tính/tự lấy được?
4. Ai chỉ cần ĐỌC, không cần sửa?

Không tạo "màn hình tổng hợp" để 1 người/1 phòng nhập thay cho nhiều phòng.
