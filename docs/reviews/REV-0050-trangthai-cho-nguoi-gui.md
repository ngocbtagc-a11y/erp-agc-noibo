# REV-0050 — Người gửi góp ý không nhìn thấy trạng thái của chính mình

- **Người báo**: ERP Owner — Sếp Bùi Thị Ngọc, 29/08/2026
- **Nguyên văn**: *"cái danh mục góp ý erp, của tao thì đã hiện trạng thái hoàn
  thành rồi, sao của nhân viên mày không cho người ta nhìn thấy trạng thái,
  tư duy lên chứ"*
- **Bàn đo**: `npm run do-trangthai-nguoigui` — 80 ĐẠT / 0 TRƯỢT
- **Ảnh**: `docs/reviews/anh-trangthai-nguoigui/`

---

## 1. Giả thuyết ban đầu SAI — và đây là bằng chứng

Nghi vấn ban đầu: bảng góp ý ẩn cột "Người gửi" cho người thường trong thân
bảng nhưng tiêu đề ẩn/hiện lệch một nhịp → **lệch cột toàn bảng**.

Đo bằng Chrome thật, phiên đăng nhập thật của ba vai, sáu bề ngang. Trên cây
`7c4c5c7` (TRƯỚC bản vá):

| Vai | Ô tiêu đề HIỆN | Ô thân | Lệch? |
|---|---|---|---|
| Nhân viên kho (Nguyễn Văn An) | 7 | 7 | không |
| Quản lý cấp 1 (Phạm Khương Duy) | 7 | 7 | không |
| Sếp Ngọc (admin) | 8 | 8 | không |

`[hidden] { display:none !important }` đã có chốt toàn cục ở CSS dòng 31, nên
`<th hidden>` ẩn đúng. **Không lệch một ô nào.** Ghi lại ở đây để lần sau
không ai đi lại con đường này.

## 2. Nguyên nhân THẬT — cột Trạng thái nằm NGOÀI khung nhìn

Đo trên máy **900px** (máy tính xách tay nhỏ / máy bảng / cửa sổ không mở hết),
tài khoản nhân viên thường:

```
khung .table-wrap  =  594px      (thanh bên ăn 232px + đệm)
bảng góp ý         =  932px      → CUỘN NGANG
cột "Trạng thái"   mép phải 681px → NẰM NGOÀI 594px, KHÔNG THẤY
```

Và thứ người gửi nhìn thấy ngay trước mép phải lại là cột **"Rủi ro" toàn dấu
gạch**: máy chủ đã cắt `risk`/`de_xuat_risk` của người gửi (REV-0020), nên với
họ đó là một cột CHẾT chiếm 82px — và chính nó đẩy Trạng thái ra ngoài.

Mốc chuyển sang thẻ khi ấy là **720px**, tức là khoảng **720–1100px không có
thẻ mà bảng cũng chưa vừa**. Không ai kéo ngang một bảng để đi tìm thứ mình
không biết là có ở đó.

**Vì sao Sếp không gặp**: Sếp là admin nên màn Góp ý của Sếp có panel
*"Chờ tôi duyệt"* và *"Quá hạn duyệt"* dạng **THẺ** — thẻ không có mép phải để
rơi ra ngoài, nên Sếp luôn đọc được trạng thái. Người gửi chỉ có mỗi cái bảng.
Đúng cái bất đối xứng Sếp chỉ ra.

## 3. Đã sửa

1. **Thứ tự cột**: `Trạng thái` + `Đang chờ ai` dời lên NGAY SAU `Tiêu đề`.
2. **Hai cột phụ chỉ hiện khi có dữ liệu thật** — `Người gửi` (khi danh sách có
   dòng không phải của mình) và `Rủi ro` (khi có ít nhất một dòng thật sự có
   mức rủi ro). **Cùng một biểu thức quyết định cả `<th>` lẫn `<td>`**, nên
   tiêu đề và thân không thể lệch nhau nữa.
   *Phụ thu*: quản lý cấp 1 nay THẤY tên người gửi trong danh sách của mình —
   trước đây anh Duy xem góp ý của nhân viên mình mà không biết của ai.
3. **Mốc chuyển thẻ 720px → 1100px**, cộng chốt bề ngang cột Tiêu đề
   (`max-width: 280px`) để bảng không tự phình rồi đẩy Trạng thái ra lần nữa.
4. **Người gửi thấy đủ 4 thứ** (đều là trường máy chủ ĐÃ trả sẵn mà giao diện
   chưa dùng): trạng thái · ai đang giữ · **đã chờ N ngày** (`so_ngay_cho`, quá
   3 ngày đổi màu) · **lý do khi bị dừng** (`ly_do_tu_choi`) — ngay trên danh
   sách, không bắt mở modal mới biết. Thẻ điện thoại 375px cũng đủ cả 4.

**Ranh giới REV-0020 giữ nguyên**: mức rủi ro nội bộ, link PR/commit, ghi chú
riêng của quản lý vẫn KHÔNG gửi cho người gửi. Bàn đo arm D gọi `/api/gop-y`
bằng phiên người gửi và soi thẳng JSON: **0 khoá nhạy cảm, 0 chuỗi bí mật**.

## 4. Quét cả lớp — bảng nào cùng bệnh?

Quét toàn bộ `app.js` tìm chỗ vẽ `<td>` CÓ ĐIỀU KIỆN (cột ẩn/hiện theo vai trò
hoặc theo dữ liệu):

| # | Bảng | Cột ẩn/hiện | Có `<th>` đi kèm? | Lệch? |
|---|---|---|---|---|
| 1 | `#ns-bang` | Lương | `#ns-thLuong` (.remove) | không |
| 2 | `#gy-bang` | Người gửi | `#gy-cot-nguoigui` | không |
| 3 | `#gy-bang` | Rủi ro | `#gy-cot-ruiro` *(mới)* | không |
| 4 | `#kd-dhh-bang` | Mã vận đơn | `#kd-dhh-th-mavandon` | không |
| 5 | `#kv-ton-bang` | Giá trị tồn | `#kv-thGiaTri` (.remove) | không |
| 6 | `#dh-bang` | ô "kho nhận" | hai nhánh, đều 1 ô | không |

**Tìm 6 · lệch cột 0 · sửa 1** (bảng góp ý — sửa vì cột nằm ngoài khung nhìn,
không phải vì lệch ô). Bàn đo chốt cứng con số 6: thêm chỗ thứ bảy mà không
khai thì bàn đo ĐỎ.

## 5. Ca đối chứng (BH-16)

| Lệnh | Kết quả | Bắt được gì |
|---|---|---|
| `npm run do-trangthai-nguoigui` | **80 ĐẠT / 0 TRƯỢT** | — |
| `... -truoc` (cây `7c4c5c7`) | **68 / 12 ĐỎ** | Trạng thái ngoài khung ở 900px (681 > 594), thiếu "đã bao lâu", thiếu lý do |
| `... -tu-kiem` (chèn thêm 1 `<td>`) | **62 / 18 ĐỎ** | đúng bệnh "lệch cột" — bàn đo bắt được |

Cổng khói: `npm run cong-khoi` XANH · `cong-khoi-dienthoai` XANH ·
`do-chu-dai` XANH. 0 lỗi console, 0 ngoại lệ ở cả 18 lượt đo.
