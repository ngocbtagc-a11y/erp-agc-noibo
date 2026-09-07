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
| `gmv_dat_hang` | GMV đơn đặt | Tổng giá trị mọi đơn ĐẶT trong kỳ, chưa trừ hủy/hoàn. Theo ngày đặt (`tao_luc_san`), giờ VN | `don_hang` | `SUM(tong_tien)/100000` mọi trạng thái | Kinh doanh | Mỗi lần mở tab (đồng bộ nền 5 phút/lần) |
| `tien_huy` | Tiền đơn hủy | Giá trị các đơn đặt trong kỳ về sau bị HỦY trước khi giao | `don_hang` | `SUM(tong_tien)/100000 WHERE trang_thai='CANCELLED'` | Kinh doanh | như trên |
| `tien_hoan` | Tiền hoàn thực tế | Tiền hoàn ĐÃ PHÁT SINH THẬT của các đơn đặt trong kỳ (không tính đơn mới chỉ yêu cầu hoàn, chưa được duyệt) | `don_hoan` JOIN `don_hang` theo `order_sn` | `SUM(so_tien)/100000` với `trang_thai` thuộc nhóm đã hoàn thật — xem mục "Trạng thái tính là hoàn thật" bên dưới | Kinh doanh | như trên |
| `doanh_thu_tam_tinh` | Doanh thu tạm tính | **Thước đo chính thức của công ty** (ERP Owner chốt 06/09/2026): tổng đơn ĐẶT trong kỳ, trừ đi hủy và hoàn khi chúng thực sự phát sinh. Đơn đang trên đường giao VẪN tính doanh thu | `don_hang` + `don_hoan` | `gmv_dat_hang − tien_huy − tien_hoan` | Kinh doanh | như trên |
| `ty_le_huy_hoan` | Tỷ lệ hủy/hoàn | Phần trăm giá trị đơn đặt bị mất vì hủy hoặc hoàn | `don_hang` + `don_hoan` | `(tien_huy + tien_hoan) / gmv_dat_hang` | Kinh doanh | như trên |
| `doanh_thu_sku` | Doanh thu theo mã hàng | Doanh thu của TỪNG SKU trong kỳ. **Khác `doanh_thu_tam_tinh`**: đã loại đơn hủy nhưng CHƯA trừ tiền hoàn (sàn trả tiền hoàn theo ĐƠN, không tách được về từng dòng hàng mà không bịa số) | `don_hang_item` JOIN `don_hang` | `SUM(thanh_tien)/100000` với `don_hang.trang_thai <> 'CANCELLED'`, gộp theo SKU | Kinh doanh | Mỗi lần mở tab |
| `kho_gia_tri_ton` | Giá trị tồn kho | Tổng giá trị tồn theo giá nhập gần nhất, mọi mã hàng đang kinh doanh | bảng `san_pham`/sổ kho | `SUM(ton * gia_nhap_gan_nhat)`, chỉ hiện nếu người xem có quyền `gia_von` | Kho vận | Real-time (mở tab Kho vận) |
| `kho_so_ma_hang` | Số mã hàng | Số SKU đang kinh doanh | bảng `san_pham` | `COUNT(*)` sản phẩm chưa ẩn | Kho vận | Real-time |


## `doanh_thu_tam_tinh` — thước đo doanh thu chính thức

ERP Owner chốt 06/09/2026, nguyên văn: *"Tổng đơn đặt sau khi trừ hoàn hủy,
khi nào phát sinh hoàn hủy thực thì trừ, nếu đơn đã đặt đang trên đường giao
vẫn ghi nhận doanh thu tạm tính trong kỳ."*

Đây cũng là thước đếm **mục tiêu Shopee 120 tỷ/năm và TikTok Shop 20 tỷ/năm**
— không dùng thước khác cho KPI đó.

**Quy về công thức:**

```
doanh_thu_tam_tinh(kỳ) = Σ tong_tien   (đơn có tao_luc_san trong kỳ, trang_thai ≠ 'CANCELLED')
                       − Σ so_tien     (đơn hoàn ĐÃ HOÀN THẬT, thuộc chính các đơn trên)
```

**Ba điều phải hiểu đúng, nếu không sẽ đọc sai số:**

1. **Quy về NGÀY ĐẶT, không phải ngày hủy/hoàn.** Đơn đặt 01/09 mà 20/09 mới
   hoàn thì tiền hoàn bị trừ vào **tháng 9 (kỳ đặt)**, không phải kỳ hoàn.
   Đây là hệ quả trực tiếp của "tổng đơn đặt sau khi trừ hoàn hủy".
2. **Số của kỳ cũ SẼ ĐỔI khi có hoàn phát sinh về sau.** Doanh thu tháng 8
   xem hôm nay có thể thấp hơn xem tuần trước, vì hoàn mới trừ thêm vào. Đây
   là hành vi ĐÚNG theo định nghĩa, không phải lỗi. Màn hình phải nói rõ chữ
   "tạm tính" để không ai tưởng số đã chốt cứng.
3. **Chưa trừ phí sàn, voucher, phí vận chuyển.** Đây KHÔNG phải tiền thực
   nhận về tài khoản. Muốn có con số đó cần gọi thêm nhóm API escrow của
   Shopee — xem `audit/AUDIT-DASHBOARD-MARKETPLACE.md` mục C.2. Khi làm,
   đặt tên riêng `tien_thuc_nhan`, KHÔNG sửa định nghĩa metric này.

### Cách chia doanh thu về từng SKU (`doanh_thu_sku`)

Doanh thu mỗi dòng hàng là **PHÂN BỔ** từ `don_hang.tong_tien` theo tỷ lệ giá
trị dòng, KHÔNG phải lấy thẳng giá mặt hàng. Lý do — đo trên 300 đơn thật
(06/09/2026, xem `audit/AUDIT-DASHBOARD-MARKETPLACE.md` mục 2):

- Shopee: `model_discounted_price` mới trừ giảm giá của NGƯỜI BÁN; voucher sàn
  nằm ở cấp ĐƠN, không chia về dòng. Tổng giá dòng **cao hơn `total_amount`
  16,4%** (119/150 đơn lệch).
- TikTok: `sale_price` cộng lại khớp `sub_total`, nhưng `total_amount` (thứ
  đang lưu vào `tong_tien`) còn cộng cả phí ship — ship chiếm 0,9% tổng.

Lấy thẳng giá dòng thì tổng doanh thu theo SKU sẽ vống hơn `doanh_thu_tam_tinh`
ngay trên cùng màn hình — đúng thứ Rule D4 cấm. Cách phân bổ bảo đảm **cộng
mọi SKU trong 1 đơn = đúng doanh thu đơn đó**; đã đối chiếu 300/300 đơn thật
khớp tuyệt đối từng đồng (dòng cuối nhận phần dư làm tròn). Giá niêm yết sau
giảm của người bán vẫn giữ nguyên ở `don_hang_item.don_gia` để tra khi cần.

⚠️ `tong_tien` của TikTok gồm phí ship, của Shopee thì không — hai sàn chưa
hoàn toàn cùng thước (lệch ~0,9% phía TikTok). TikTok có sẵn
`payment.sub_total` (tiền hàng thuần) để chuẩn hoá, backfill được từ
`du_lieu_json`. Chờ ERP Owner quyết, chưa tự đổi.

### Khi danh mục sản phẩm còn trống

"10 SKU bán kém nhất" chỉ đúng nghĩa khi `san_pham` có dữ liệu. Hiện trạng
production 06/09/2026: `san_pham` **0 dòng** (Kho vận chưa nhập liệu). Lúc đó
API tự chuyển sang xếp hạng trên các SKU ĐÃ bán (`nguon_xep_hang = 'da_ban'`)
và giao diện hiện cảnh báo — **nhóm mã bán được 0 cái sẽ không xuất hiện**,
tức là thiếu đúng nửa quan trọng nhất. Nhập danh mục sản phẩm là bảng tự đủ.

### Trạng thái tính là "hoàn thật"

`tien_hoan` chỉ trừ đơn hoàn đã thực sự được chấp nhận — đơn khách mới bấm
yêu cầu, sàn đang xử lý thì CHƯA trừ (đúng chữ "hoàn hủy **thực**").

Danh sách trạng thái được tính nằm ở hằng số `HOAN_THAT` trong
`src/index.js` (một chỗ duy nhất, Rule D4 — không chép công thức đi nơi khác).

✅ **Đã đối chiếu với dữ liệu production 06/09/2026.** Giá trị thật gặp được:

| Sàn | Trạng thái | Số đơn | Xếp |
|---|---|---|---|
| Shopee | `ACCEPTED` | 35 | đã trừ |
| Shopee | `PROCESSING` | 24 | chưa trừ |
| Shopee | `CANCELLED` | 8 | chưa trừ |
| Shopee | `REQUESTED` | 2 | chưa trừ |
| TikTok | `BUYER_SHIPPED_ITEM` | 4 | chưa trừ — khách đã gửi hàng về nhưng chưa hoàn tất hoàn tiền |

`BUYER_SHIPPED_ITEM` ban đầu KHÔNG nằm trong tập nào và đã tự nổi lên cảnh báo
"trạng thái lạ" đúng như thiết kế — cơ chế đó vẫn giữ nguyên cho các giá trị
mới xuất hiện về sau. Gặp cảnh báo đó thì bổ sung vào đúng tập trong
`src/index.js` rồi cập nhật lại bảng này.

### Quy tắc so sánh "kỳ trước"

Mọi con số có chữ "so với kỳ trước" trên Tổng quan 2 sàn đều so bằng cách
**dịch lùi đúng 1 bước tự nhiên của kỳ**, giữ nguyên phần đã trôi qua:

| Kỳ đang xem | So với |
|---|---|
| Hôm nay (tới giờ này) | Hôm qua tới ĐÚNG giờ này |
| 7 ngày gần nhất | 7 ngày liền trước |
| 30 ngày gần nhất | 30 ngày liền trước |
| Tháng này (tới hôm nay) | Cùng kỳ tháng trước (tới đúng ngày đó) |

KHÔNG so với "cửa sổ liền trước cùng độ dài". Cách đó nghe hợp lý nhưng sai
thực tế: lúc 9h sáng, "kỳ trước" của hôm nay sẽ thành 9 tiếng CUỐI ngày hôm
qua — khung giờ mua hàng khác hẳn, ra số lệch. Đã vấp đúng lỗi này khi chạy
thử 06/09/2026, ghi lại để không ai "đơn giản hoá" ngược lại.

### Nguồn của bảng xếp hạng SKU

"10 SKU bán kém nhất" xếp trên **toàn bộ mã hàng đang kinh doanh**
(`san_pham.dang_ban = 1`), không phải trên danh sách SKU đã bán được. Nếu chỉ
xếp trong số mã CÓ đơn thì nhóm tệ nhất — mã bán được 0 cái — sẽ không có dòng
nào để mà xếp hạng, tức là bảng bỏ sót đúng thứ cần nhìn.

SKU bán trên sàn nhưng không khớp mã nào trong kho được tách riêng ở
`chua_khop`, KHÔNG gộp vào xếp hạng và không giấu đi — đó là việc cần người
sửa (gắn đúng mã SKU trên sàn hoặc thêm mã vào kho).

### Metric cũ đã thay thế

`doanh_thu_hom_nay` (định nghĩa cũ: "đơn hàng thành công trong ngày") **bỏ**.
Lý do: tài liệu ghi "thành công" nhưng code không hề lọc trạng thái nên đang
cộng cả đơn hủy — vi phạm chính Rule D4. Thay bằng
`doanh_thu_tam_tinh` scope "hôm nay", có định nghĩa khớp code.

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
