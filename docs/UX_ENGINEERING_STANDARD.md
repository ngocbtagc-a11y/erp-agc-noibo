# UX Engineering Standard — ERP Alpha Green Commerce

Sếp chốt 22/08/2026: đây là chuẩn UX mặc định cho **mọi module mới hoặc
module được refactor** từ nay về sau — không chờ Sếp chỉ ra từng chi tiết
nhỏ (dropdown quá dài, thiếu search, dấu `—` rỗng, action dư...). Khi làm
1 chức năng, tự kiểm tra và sửa luôn UX smell liên quan **trong phạm vi
module đang đụng tới** — không tự ý mở rộng audit toàn ERP nếu Sếp không
yêu cầu (xem thêm nguyên tắc "làm nhẹ đúng quy mô" đã áp dụng xuyên suốt,
[LIST_UX_AUDIT.md](./LIST_UX_AUDIT.md)).

## Tư duy cốt lõi

Trước khi chọn component, luôn hỏi theo thứ tự:
**Context → Business Rule → Candidate → UX Component.**

- Người dùng đang muốn hoàn thành việc gì (không phải "chọn 1 ID")?
- Hệ thống đã biết gì rồi (department, position, dữ liệu đã nhập) để giảm
  bớt lựa chọn phải đưa ra?
- Nếu suy ra được duy nhất 1 giá trị → auto-fill, có nút "Thay đổi" nếu
  cần override, không bắt chọn lại.
- Một nhiệm vụ chỉ nên có **một** control (không tách ô tìm + ô chọn
  riêng nếu gộp được).

## Ngưỡng chọn component cho field lựa chọn — "Long List = Searchable"

| Số lựa chọn hợp lệ | Component |
|---|---|
| 1 | Auto-fill (có thể cho "Thay đổi") |
| 2–6, cố định (enum) | Simple `<select>` |
| ≥7, hoặc danh mục có khả năng tăng dù hiện tại <7 | Searchable Combobox (`ganCombo()` trong `app.js` — 1 control, bấm mở mới hiện ô tìm + kết quả, không tách ô tìm riêng bên ngoài) |
| Hàng trăm/nghìn dòng (Nhân sự/SKU/Đơn hàng ở quy mô lớn hơn hiện tại) | Search server-side, không load hết ra frontend |

Không chờ nhắc từng màn hình — mọi danh sách Entity/danh mục động (Nhân
sự, Chức danh, Phòng ban, Tài sản...) đủ ngưỡng trên thì tự chuyển sang
`ganCombo()` khi đụng tới module đó. Enum cố định thật sự nhỏ (Trạng
thái, Loại lao động, Giới tính...) luôn dùng Simple Select, **không**
biến thành combobox tìm kiếm dù có vẻ áp dụng được — over-engineer cho
enum là smell (xem danh sách dưới). Danh sách các entity/module **chưa
tồn tại** trong ERP này (SKU riêng, Nhà cung cấp dạng picker, Khách
hàng, Skill, Role UI...) thì không tạo trước — xem
[LIST_UX_AUDIT.md](./LIST_UX_AUDIT.md).

## Parent lọc Child

Field phụ thuộc field khác thì phải lọc theo, và khi Parent đổi mà Child
hiện tại không còn hợp lệ thì **clear Child**, không để lại dữ liệu mâu
thuẫn âm thầm (VD Phòng ban đổi mà Quản lý trực tiếp cũ không còn hợp
lý — hiện tại hệ thống mới chỉ *ưu tiên sắp xếp lại*, chưa ép buộc clear,
vì chưa có business rule đủ chắc để coi 1 lựa chọn là "không hợp lệ" —
xem `uuTienCungPhongBan()`).

## Danh sách UX smell — tự sửa khi thấy, không chờ nhắc

- Dropdown >10–20 lựa chọn mà không có search.
- Cùng một việc có 2 control (ô tìm tách rời dropdown).
- Option hiển thị dấu nối (`—`, `·`) dù phần sau rỗng.
- List có khả năng tăng dữ liệu mà không có Search/Filter.
- Placeholder quá dài.
- Button dùng thuật ngữ backend (`LOCK_RECORD`, `WAITLISTED`...) thay vì
  ngôn ngữ nghiệp vụ (`Hoàn tất`, `Chờ chỗ`...).
- >2 action ngang hàng trong 1 dòng bảng — nên gộp bớt vào `⋯`.
- Entity có lịch sử/giao dịch mà action mặc định là Xoá cứng thay vì
  Ngừng hoạt động/Lưu trữ.
- Empty state không phân biệt "chưa có dữ liệu" vs "lọc không ra kết quả".
- Form dài hiển thị hết field cùng lúc thay vì "Thông tin thêm" gấp lại.

## Tự review trước khi báo hoàn thành 1 task frontend

Context (đã tận dụng dữ liệu biết trước chưa?) · Selection (dropdown có
cần search/auto-fill không?) · Action (có dư thao tác lặp không?) ·
Naming (có lẫn thuật ngữ kỹ thuật không?) · State (Loading/Empty/Error đủ
chưa?) · Permission (có hiện action ngoài quyền không?) · Performance (có
load dư dữ liệu không?) · Consistency (có component dùng chung sẵn có mà
chưa tái dùng không?).

## Shared UI Pattern — Domain không tự sáng tạo cái khác nếu Core đã có

Cùng 1 việc phải cùng tên/component/interaction/status/layout ở mọi màn.
Danh sách pattern dùng chung hiện có trong `public/assets/js/app.js` —
kiểm tra trước khi tự viết cái mới:

| Việc | Dùng | Không tự viết lại |
|---|---|---|
| Chọn 1 entity từ danh sách dài/có thể tăng | `ganCombo()` | select riêng, ô tìm tách rời |
| Search không dấu/không phân biệt hoa-thường | `boDau()` | logic so khớp tự viết |
| Render bảng từ mảng dữ liệu | `veBang()` | vòng lặp `innerHTML +=` thủ công |
| Modal nhập nhanh (text/select/textarea) | `moHopNhap()` | `prompt()`/`confirm()` trình duyệt |
| Nhãn trạng thái (chữ + màu) | `TRANG_THAI`/`CV_TRANG_THAI` (map `{chu, mau}`) + class `.tag` | tự đặt màu/chữ riêng từng nơi |
| Thẻ thống kê tổng quan | `veThe()` (class `.stats`/`.stat`) | tự dựng khối số liệu riêng |
| Danh sách cảnh báo/tin cần chú ý | `veDanhSach()` (class `.list-item`) | tự dựng list riêng |
| Nút hành động | `.btn-primary` (chính) / `.btn-phu` (phụ) / `.btn-nho` (nhỏ trong bảng) | tự đặt style nút mới |
| Thông báo lỗi form | `.form-loi` | `alert()` cho lỗi validate thường xuyên |
| Ô tìm kiếm danh sách | class `.dh-timkiem` + `.search` (icon kính lúp) | ô input tìm kiếm tự style riêng |
| Empty state | class `.empty`, phân biệt "chưa có dữ liệu" vs "không tìm thấy" (xem UX smell) | text tự do không nhất quán |

Table/Card, Quick Action, Bulk Action: chưa có pattern dùng chung chính
thức (mỗi domain đang tự làm phù hợp dữ liệu của mình) — nếu thấy pattern
lặp lại lần 2 trở lên ở domain khác, cân nhắc rút thành hàm dùng chung như
các dòng trên, không bắt buộc trước khi có nhu cầu thật thứ 2.

## Giới hạn — tránh làm quá tay

- Không tự ý mở rộng sang module/entity chưa tồn tại trong ERP này chỉ vì
  nguyên tắc "có thể áp dụng được" — xem [LIST_UX_AUDIT.md](./LIST_UX_AUDIT.md)
  và [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) về cách đã
  từ chối over-engineer tương tự trước đây.
- Sửa UX smell trong phạm vi đang làm thì tự sửa luôn; nếu phát hiện smell
  ở module KHÁC không liên quan việc đang làm, hoặc thay đổi có thể ảnh
  hưởng business logic/workflow, thì báo trước cho Sếp thay vì tự sửa.
- Component dùng chung (`ganCombo()`, `boDau()`, `veBang()`, `moHopNhap()`)
  được thêm khi pattern lặp lại lần 2 trở lên — không dựng framework
  trước khi có nhu cầu thật thứ 2.
