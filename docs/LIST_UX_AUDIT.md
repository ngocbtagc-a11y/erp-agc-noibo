# List UX Audit — ERP Alpha Green Commerce

Ghi lại đúng hiện trạng Search/Filter/Sort/Pagination của các màn danh
sách/danh mục THẬT đang có trong hệ thống (22/08/2026), theo yêu cầu chuẩn
hoá UX của Sếp. **Không phải mọi màn trong checklist gốc đều tồn tại** — chỉ
audit cái có thật, không bịa ra module mới để lấp chỗ trống.

## Nguyên tắc áp dụng ở đây (đã thống nhất với Sếp — chọn "làm nhẹ")

Dữ liệu ERP hiện lệch quy mô rất lớn giữa các bảng:

| Bảng | Số dòng thật (22/08/2026) |
|---|---|
| Đơn hàng (Shopee/TikTok) | 3.263 |
| Đơn hoàn | 408 |
| Nhân sự | 23 |
| Tài khoản đăng nhập | 6 |
| Phòng ban | 4 |
| Chức danh | 8 |
| Sản phẩm/SKU | 0 (chưa dùng) |
| Tài sản | 1 |

→ Đơn hàng/Đơn hoàn cần xử lý phía **server** (search/filter thật, có
LIMIT/OFFSET). Nhân sự/Tài sản/Tài khoản/danh mục nền chỉ vài chục dòng trở
xuống → lọc phía **client** là đủ, không cần debounce/pagination/URL-state —
thêm những thứ đó vào lúc này là dựng hạ tầng cho dữ liệu chưa tồn tại.

## Bảng audit

| Màn | Search | Filter | Sort | Pagination | Empty-state phân biệt | Ghi chú |
|---|---|---|---|---|---|---|
| **Đơn hoàn về kho** (Kho vận) | ✅ đa-field (mã đơn hoàn/đơn gốc/vận đơn/SP/SKU/người mua) | ✅ Nguồn (Shopee/TikTok) | — | Backend có LIMIT/OFFSET (`src/kho.js`) | — | Đã tốt từ trước, không đụng vào |
| **Lịch sử đơn hoàn** (Kho vận) | ✅ như trên | ✅ Nguồn | — | Backend có LIMIT/OFFSET | — | Đã tốt từ trước |
| **Đối soát đơn hoàn** (Kinh doanh) | ✅ đa-field | ✅ Nguồn | Tự sắp: chưa tra soát/khiếu nại lên đầu | — | — | Đã tốt từ trước |
| **Sản phẩm** (Kinh doanh, Kho vận) | ✅ tên/mã/nhóm hàng | — | — | — | — | 0 dòng hiện tại, search sẵn sàng khi có SKU |
| **Lịch sử làm việc** (MBOs) | ✅ đa-field | ✅ Trạng thái | — | — | — | Đã tốt từ trước |
| **Danh bạ** | ✅ tên/bộ phận/chức vụ | — | — | — | — | Đã tốt từ trước |
| **Nhân sự** | ✅ **mới** — mã/họ tên/SĐT/email | ✅ **mới** — Bộ phận, Trạng thái, Loại LĐ | — (23 dòng, chưa cần) | Client-side, đủ ở quy mô này | ✅ **mới** — "Chưa có nhân sự" vs "Không tìm thấy" | Áp dụng đợt này |
| **Quản trị · Tài khoản** | ✅ **mới** — mã/họ tên/tên đăng nhập | ✅ **mới** — Vai trò | — | Client-side | ✅ **mới** | Dùng chung dữ liệu với Nhân sự |
| **Tài sản** | ✅ **mới** — mã/tên/danh mục | ✅ **mới** — Trạng thái | — | Client-side | ✅ **mới** | 1 dòng hiện tại, sẵn sàng khi tăng |
| **Quản trị · Cơ cấu tổ chức** (Phòng ban/Chức danh/Đơn vị tính/Nhà cung cấp/Kho) | ❌ chưa có | ❌ chưa có | — | — | ❌ | 4–8 dòng/danh mục, quá nhỏ để cần lọc — **không thêm**, tránh over-engineer |
| **Kế toán · Đơn hoàn cần tra soát / Hàng hỏng chờ lập biên bản** | ❌ chưa có | ❌ chưa có | — | — | ✅ (có sẵn) | Hàng đợi việc cần xử lý (item rời khỏi danh sách khi xử lý xong), không phải danh mục tích luỹ — search ít giá trị, **không thêm** |
| **Xếp ca** (đăng ký ca, ma trận tuần) | — | ✅ theo tuần/phòng ban (đã có) | — | — | — | Dạng lưới/lịch, không phải danh sách để tìm — không áp dụng pattern này |
| **Tổng quan / Trạm Mục Tiêu** | — | — | — | — | — | Dashboard tổng hợp, không phải list page |

## Việc CHƯA làm vì entity chưa tồn tại trong hệ thống

Các mục sau nằm trong checklist gốc nhưng **không có màn danh sách riêng**
trong ERP hiện tại — không tạo module mới chỉ để có chỗ gắn Search/Filter:
SKU riêng biệt (khác Sản phẩm), Vị trí kho (khác Kho), Khách hàng (chỉ có
trong Đơn hàng, không có màn Khách hàng riêng), Phiếu nhập/Phiếu xuất riêng
(nằm trong sổ cái `giao_dich_kho`), Skill/Skill Level, Role/Permission dạng
UI riêng (đang quản lý qua code `src/quyen.js`), MBO dạng danh sách phẳng
(đang là cây Công ty→Phòng ban→Cá nhân, không phải table), Ticket, Hóa đơn
riêng biệt.

## Component dùng chung đã có (không xây thêm framework mới)

- `boDau()` (`public/assets/js/app.js`) — bỏ dấu + hạ chữ thường, dùng chung
  toàn app cho mọi ô search, giải quyết luôn yêu cầu "không phân biệt hoa
  thường / có dấu-không dấu".
- `veBang()` — render 1 bảng từ mảng dữ liệu, dùng chung mọi danh sách.
- `moHopNhap()` (mới, đợt này) — modal nhập nhanh dùng chung (text/select/
  textarea), thay `prompt()` gốc của trình duyệt cho: Gán trưởng phòng, Sửa
  tên danh mục nền, Báo hỏng tài sản, Nộp kết quả công việc.
- Class `.dh-timkiem` + `.search` (CSS có sẵn) — khung toolbar Search+Filter
  tái dùng ở mọi màn đã liệt kê, không tạo thêm class mới.

Không xây `ListToolbar`/`FilterDrawer`/`ActiveFilterChips`/`SortableHeader`
dạng component framework riêng — ở quy mô dữ liệu hiện tại (client-side,
vài chục dòng) thì các hàm `veBangX()` lặp lại đơn giản dễ đọc hơn một tầng
trừu tượng generic, và Đơn hàng/Đơn hoàn (chỗ thật sự lớn) đã có pattern
search+filter+pagination riêng phù hợp với nghiệp vụ, không dùng chung được
với danh mục nhỏ.

## Khi nào quay lại làm đầy đủ hơn

Nếu Sản phẩm/SKU bắt đầu có dữ liệu thật (hiện 0 dòng) hoặc Nhân sự vượt
quá ~100 dòng, cân nhắc thêm Sort cho các cột chính (mã, tên, ngày) và
chuyển Nhân sự/Tài sản sang lọc server-side như Đơn hoàn đã làm — lúc đó
mới cần bàn tới URL query state / pagination thật.
