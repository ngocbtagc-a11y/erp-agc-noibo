# Metric Definitions — ERP Alpha Green Commerce

Rule D4 (Dashboard Rules, `ERP-CONSTITUTION.md`): **một metric chỉ một
định nghĩa.** Trước khi thêm 1 metric mới lên bất kỳ Home/Tổng quan nào,
kiểm tra bảng dưới trước — nếu đã có metric gần giống nhưng tính khác
(nguồn khác/lọc khác/thời điểm khác), đặt TÊN KHÁC, không dùng chung tên.
Không cần bảng DB riêng ở quy mô hiện tại — file này là nguồn tham chiếu.

| metric_code | Tên hiển thị | Định nghĩa | Nguồn (source) | Cách tính (calculation) | Owner | Refresh |
|---|---|---|---|---|---|---|
| `viec_dang_mo` | Việc đang mở | Số `cong_viec` chưa xong, thuộc phạm vi đang xem (Tôi/Phòng/Công ty) | bảng `cong_viec` | `trang_thai NOT IN ('hoan_thanh','huy')` | Core (Task) | Real-time (LAM_MOI_CONGVIEC) |
| `viec_qua_han` | Việc quá hạn | Trong `viec_dang_mo`, còn có `han_chot` đã qua hôm nay | bảng `cong_viec` | trên + `han_chot IS NOT NULL AND han_chot < hôm nay` (giờ VN, UTC+7) | Core (Task) | Real-time |
| `viec_cho_duyet` | Chờ duyệt | Việc ở trạng thái chờ người giao duyệt kết quả | bảng `cong_viec` | `trang_thai = 'cho_duyet'` | Core (Task) | Real-time |
| `doanh_thu_hom_nay` | Doanh thu hôm nay | Tổng tiền đơn hàng thành công trong ngày hôm nay (giờ VN) | bảng đơn hàng (`kdTongQuanDoanhThu`) | Xem `src/index.js` hàm `kdTongQuanDoanhThu` — CHỈ hiện khi `co_bang=true` (đã nạp migration đơn hàng) | Kinh doanh | Real-time khi mở Home |
| `kho_gia_tri_ton` | Giá trị tồn kho | Tổng giá trị tồn theo giá nhập gần nhất, mọi mã hàng đang kinh doanh | bảng `san_pham`/sổ kho | `SUM(ton * gia_nhap_gan_nhat)`, chỉ hiện nếu người xem có quyền `gia_von` | Kho vận | Real-time (mở tab Kho vận) |
| `kho_so_ma_hang` | Số mã hàng | Số SKU đang kinh doanh | bảng `san_pham` | `COUNT(*)` sản phẩm chưa ẩn | Kho vận | Real-time |

## Nguyên tắc đặt tên

- KHÔNG dùng chung 1 tên cho các định nghĩa "Doanh thu" khác nhau (GMV,
  doanh thu giao thành công, doanh thu kế toán, doanh thu chưa thuế,
  tiền thực nhận...) — hiện tại ERP chỉ có `doanh_thu_hom_nay` (đơn hàng
  giao thành công trong ngày); khi thêm định nghĩa khác, đặt
  `metric_code` khác (VD `doanh_thu_ke_toan_thang`) và ghi rõ khác gì.
- Metric có SCOPE (Tôi/Team/Phòng ban/Công ty) thì code/label phải thể
  hiện rõ scope đang xem — không mặc định hiểu ngầm company-wide (Rule
  D2, `ERP-CONSTITUTION.md`).
- Thêm 1 dòng vào bảng trên **trước khi** đưa metric lên bất kỳ
  Home/Tổng quan nào — không chỉ code rồi quên ghi lại.
