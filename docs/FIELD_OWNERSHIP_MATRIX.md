# Field Ownership Matrix — ERP Alpha Green Commerce

Tài liệu tham chiếu, đi kèm [DATA_OWNERSHIP_MATRIX.md](./DATA_OWNERSHIP_MATRIX.md).
Matrix kia phân theo **bảng** (ai sở hữu cả bảng `nhan_su`, `san_pham`...);
file này đi sâu hơn 1 cấp — phân theo **từng trường (field)** trong các
bảng có nhiều phòng ban cùng đụng vào, vì cùng 1 bảng có thể có trường A
do phòng X nhập, trường B do phòng Y nhập, trường C chỉ đọc.

Không xây UI/code riêng để "thực thi" bảng này — quyền thật vẫn ở
`src/quyen.js` và các hàm `duoc*()` kiểm tra ở backend như hiện tại. Đây
là tài liệu để khi thêm/sửa 1 trường, tự tra "trường này ai được đụng vào".

---

## `nhan_su` (Hồ sơ nhân sự)

| Trường | Ai được nhập/sửa | Ai chỉ xem | Ghi chú |
|---|---|---|---|
| `ho_ten`, `sdt`, `email`, `dia_chi` | HCNS, Admin | Mọi vai trò có quyền xem Nhân sự/Danh bạ | Thông tin liên hệ cơ bản |
| `phong_ban_id`, `chuc_danh_id` | HCNS, Admin | Mọi vai trò | Chọn từ danh mục Ban Giám đốc quản lý |
| `quan_ly_truc_tiep` | HCNS, Admin | Mọi vai trò | — |
| `trang_thai_hd` (đang làm/nghỉ việc...) | HCNS, Admin | Mọi vai trò | — |
| `luong` | **Chỉ Admin** | Không ai khác xem/sửa được, kể cả HCNS | Ranh giới cứng, chặn ở backend, không phải ẩn ở UI |
| `trang_thai_dl` (Data Lock) | HCNS tạo/khoá; chỉ Admin sửa khi đã khoá | Owner gốc chỉ xem sau khi khoá | Theo cơ chế Data Lock chung |

## `san_pham` (Sản phẩm/SKU)

| Trường | Ai được nhập/sửa | Ai chỉ xem | Ghi chú |
|---|---|---|---|
| `ten`, `sku`, `danh_muc`, `don_vi_id` | Kinh doanh (van_hanh_san), Kho vận (quan_ly_kho), Admin | Ai có quyền xem tab Kho vận/Kinh doanh | 2 phòng cùng sửa ngày thường — Kinh doanh quyết định bán gì, Kho vận là người vận hành |
| `ton_toi_thieu`, `theo_doi_hsd` | Kho vận, Kinh doanh, Admin | — | Cấu hình vận hành, không cần khoá riêng |
| `trang_thai_dl` (khoá/duyệt) | **Chỉ Kinh doanh (van_hanh_san) + Admin** | Kho vận chỉ xem trạng thái khoá | Kho vận KHÔNG khoá được — quyền `khoa_san_pham` tách riêng khỏi `sua_san_pham` |

## `don_hoan` (Đơn hoàn) — luồng 3 chặng

| Trường | Ai được nhập/sửa | Ai chỉ xem | Ghi chú |
|---|---|---|---|
| Thông tin đơn hoàn gốc (mã đơn, lý do, sản phẩm hoàn) | **AUTO** — đồng bộ từ sàn | Tất cả | Không ai nhập tay |
| `da_nhan_hang`, `tinh_trang_hang` (chặng Kho) | Kho vận | Vận hành sàn, Kế toán, Admin | Kho xác nhận đã nhận hàng hoàn về kho |
| `huong_xu_ly`, `ghi_chu_xu_ly` (chặng Vận hành sàn) | Vận hành sàn | Kho vận, Kế toán, Admin | Quyết định hoàn tiền/đổi/từ chối |
| `da_doi_soat`, `so_tien_thuc_nhan` (chặng Kế toán) | Kế toán | Vận hành sàn, Kho vận, Admin | Kế toán ĐỌC dữ liệu 2 chặng trên, chỉ nhập phần đối soát tiền của mình |

## `tai_khoan` (Tài khoản đăng nhập)

| Trường | Ai được nhập/sửa | Ai chỉ xem | Ghi chú |
|---|---|---|---|
| `ten_dang_nhap`, `mat_khau`, `vai_tro` | **Chỉ Admin** | HCNS xem có/chưa có tài khoản (không xem mật khẩu) | Tách hẳn khỏi hồ sơ `nhan_su` |
| `trang_thai` (khoá/mở tài khoản) | Chỉ Admin | — | — |

## `muc_tieu` / `cong_viec` (MBO, Trạm Mục Tiêu)

| Trường | Ai được nhập/sửa | Ai chỉ xem | Ghi chú |
|---|---|---|---|
| Nội dung mục tiêu/công việc | Người tạo (cấp cá nhân: chính người/quản lý; cấp phòng: HCNS; cấp công ty: Admin) | Toàn công ty (minh bạch) | — |
| `tien_do` (% hoàn thành) | **AUTO tính** từ việc đã hoàn thành | Toàn công ty | Không ai nhập tay số % |

---

## Nguyên tắc áp dụng khi thêm trường mới

Khi thêm 1 trường mới vào bảng đã có nhiều phòng dùng chung, tự hỏi:
1. Trường này do phòng nào là người biết chính xác giá trị đúng?
2. Trường này có nên khoá riêng (cần Data Lock) hay chỉ cấu hình vận hành thường?
3. Có phòng nào chỉ cần đọc trường này để làm việc khác không — nếu có, đảm bảo họ có quyền xem dù không có quyền sửa cả bảng.
4. Nếu trường nhạy cảm (lương, mật khẩu...), chặn ở backend — không chỉ ẩn ở giao diện.
