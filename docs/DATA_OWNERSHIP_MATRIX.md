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

| Dữ liệu | Bảng | Owner tạo/sửa | Chỉ xem (không sửa) | Ghi chú |
|---|---|---|---|---|
| Hồ sơ nhân sự (tên, SĐT, email, phòng ban, chức danh, quản lý trực tiếp, trạng thái HĐ) | `nhan_su` | HCNS, Admin | Mọi vai trò (qua Nhân sự/Danh bạ, không thấy lương nếu không có quyền) | Nhập ở tab **Nhân sự** (không phải Quản trị) |
| Lương | `nhan_su.luong` | Admin | HCNS không xem/sửa được | Ranh giới cứng, máy chủ tự chặn |
| Tài khoản đăng nhập (username/mật khẩu/vai trò) | `tai_khoan` | Admin | HCNS xem trạng thái (có/chưa có tài khoản) | Tab **Quản trị** — tách hẳn khỏi hồ sơ nhân sự |
| Phòng ban / Chức danh (danh mục) | `phong_ban`, `chuc_danh` | HCNS, Admin | Ai cũng chọn được khi thêm nhân sự | Tab **Dữ liệu nền → Tổ chức** |
| Đơn vị tính | `don_vi_tinh` | Quản lý kho, Admin | Ai cũng chọn được khi thêm sản phẩm | Tab **Dữ liệu nền → Hàng hoá** |
| Sản phẩm/SKU (tên, danh mục, đơn vị, mức tồn tối thiểu) | `san_pham` | *(đang chuyển)* Kinh doanh khoá/duyệt; Kho vận vẫn sửa ngày thường; Admin luôn sửa được | Ai có quyền xem tab liên quan | Trước đây Kho vận sở hữu hoàn toàn — đổi vì Kinh doanh là người quyết định bán gì |
| Nhà cung cấp | `nha_cung_cap` | Quản lý kho, Admin | — | Tạm thời — công ty chưa có phòng Mua hàng riêng, sẽ đổi owner nếu lập phòng này |
| Kho (danh sách kho vật lý) | `kho` | Admin | — | Cấu hình cấp công ty, hiếm đổi |
| Tồn kho (nhập/xuất/điều chỉnh) | `giao_dich_kho`, `lo_hang` | Kho vận (Quản lý kho + Nhân viên kho) | Kế toán trưởng xem giá vốn | Sổ cái bất biến, không sửa trực tiếp |
| Đơn hàng | `don_hang` | **AUTO** — đồng bộ tự động từ Shopee/TikTok (sàn là nguồn thật) | Vận hành sàn, Kế toán, Admin | Không ai nhập tay |
| Đơn hoàn | `don_hoan` | **AUTO** tạo từ sàn; Kho xác nhận nhận hàng; Vận hành sàn xử lý; Kế toán tra soát tiền | — | Luồng 3 chặng, mỗi bên chỉ sửa đúng chặng của mình |
| Đối soát / tra soát tiền | (field trong `don_hoan`) | Kế toán | Vận hành sàn, Admin | Kế toán ĐỌC dữ liệu đơn hoàn có sẵn, không nhập lại đơn |
| Mục tiêu (MBO) | `muc_tieu` | Người tạo mục tiêu (cấp cá nhân: chính người/quản lý; cấp phòng ban: HCNS; cấp công ty: Admin) | Toàn công ty (minh bạch) | Tiến độ % **AUTO tính** từ việc đã hoàn thành, không nhập tay |
| Công việc (Trạm Mục Tiêu) | `cong_viec` | Người giao việc (bất kỳ ai có quyền) | Người liên quan + toàn công ty (Lịch sử làm việc) | — |
| Dữ liệu đã khoá (Data Lock) | `trang_thai`/`trang_thai_dl` trên 5 bảng nền | Chỉ Admin sửa được khi đã khoá | Owner gốc chỉ xem, không sửa | Xem thêm lịch sử tại `lich_su_thay_doi_nen` |

## Nguyên tắc áp dụng khi thêm dữ liệu mới

Trước khi thêm 1 trường/module mới, tự hỏi:
1. Phòng ban nào hiểu dữ liệu này nhất?
2. Dữ liệu đã có ở nguồn khác chưa (API sàn, danh mục đã có)?
3. Có cần nhập tay không, hay hệ thống tự tính/tự lấy được?
4. Ai chỉ cần ĐỌC, không cần sửa?

Không tạo "màn hình tổng hợp" để 1 người/1 phòng nhập thay cho nhiều phòng.
