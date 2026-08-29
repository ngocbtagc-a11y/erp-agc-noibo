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

## Đợt 29/08/2026 — quét lớp "danh sách bị cắt mà không nói là đã cắt"

Góp ý gốc: **chị Vũ Lan Hương (HCNS)** — *"không hiển thị hết công việc public
ở mục 'Việc cần làm' để dễ theo dõi"*. Áp `docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md`:
quét cả ERP theo LỚP, không chỉ sửa chỗ được chỉ.

**Số:** quét **27 tệp `src/` + 6 tệp `public/`** → **14 chỗ** thuộc lớp
→ **5 chỗ sửa ngay** · **9 chỗ vào hàng đợi có lý do** · **0 chỗ còn im lặng**.
Canh tái phát: `npm run do-cat-im-lang` (tự kiểm bằng 3 mẫu vi phạm giả +
5 mẫu sạch, và tự báo chết dòng miễn trừ đã hết hiệu lực).

### Đã sửa trong đợt này

| Chỗ | Trần | Vì sao sửa ngay |
|---|---|---|
| `cvDanhSach` — Việc cần làm · phối hợp · tôi giao | 300 ×3 | **Đúng chỗ chị Lan Hương báo**, dùng hằng ngày |
| `cvLichSu` — Lịch sử làm việc | 500 | Là chỗ các dải cắt khác CHỈ NGƯỜI SANG; nó cắt im lặng thì lời chỉ đường thành lời hứa suông |
| `mtDanhSach` — Trạm Mục Tiêu | 300 | Cùng màn hình chị báo |
| `hoanLichSu` — Lịch sử đơn hoàn | 500 | **ĐANG mất dữ liệu thật: 523 dòng / trần 500**, mà ô đếm `#ls-dem` in "500/500" — khẳng định sai |
| Dải **phạm vi** trên `#cvSeg` | — | Nguyên nhân gốc của góp ý: bảng chỉ lọc theo đúng người xem mà màn hình không nói ra |

### Hàng đợi — CÓ LÝ DO, KHÔNG IM LẶNG

Bảng dưới đây là bản người đọc của `MIEN_TRU` trong
`scripts/do-cat-im-lang.mjs`. Máy quét in đủ 8 dòng này mỗi lần chạy và **báo
lỗi nếu một dòng không còn che vi phạm thật** — miễn trừ chết là giấy thông
hành miễn phí cho lỗi sau.

`layThongBao` **đã ra khỏi bảng này** (REV-0034 · L3): lý do miễn trừ cũ —
*"chuông chỉ đếm chưa đọc nên chưa lệch nghĩa"* — là **sai**, vì `chuaDoc` đếm
trên mảng đã bị trần 50 cắt, tức đúng lỗi `#ls-dem` in `500/500`. Nay hàm đó
đếm bằng `COUNT(*)` (chỉ khi thật sự cắt) và có dải cắt riêng ở chuông.

| Chỗ | Trần | Loại | Ghi chú |
|---|---|---|---|
| `chatDanhSach` — Chat nội bộ | 50 | **Hàng đợi** | Chưa có nút "xem tin cũ hơn"; cần cuộn ngược thật, không vá bằng một dải chữ. Ước lượng ~1 buổi — nay đã có sẵn khuôn con trỏ `truoc` của `cvLichSu`/`hoanLichSu` để chép |
| `nsLichSu` — Lịch sử 1 hồ sơ nhân sự | 200 | **Hàng đợi** | 23 nhân sự, còn xa ngưỡng |
| `donHangHuy` — Đơn huỷ trong tháng | 300 | **Hàng đợi** | Chưa chạm trần theo số liệu 28/08/2026 |
| `danhSach` (`hopdong.js`) | 100 | **Hàng đợi** | Hợp đồng của MỘT người |
| `danhSach` (`mota-cv.js`) | 200 | **Hàng đợi** | Mô tả công việc của MỘT chức danh |
| `lichSu` (`kho.js`) | ≤200 | **Hàng đợi** | Giao dịch 1 sản phẩm; cần dải cắt khi kho chạy thật |
| `kdKhachHoanNhieu` — Chăm sóc KH | 30 | **Có chủ ý** | Bảng XẾP HẠNG, nhãn giao diện đã nói rõ |
| `vdDanhSach` — Vinh danh 48h | 20 | **Có chủ ý** | Bảng tin theo thời gian, không phải sổ tra cứu |

Ngưỡng soi là `LIMIT ≥ 20`. Dưới ngưỡng là tra một dòng, hoặc lấy vài mục
"gần đây/top" mà nhãn giao diện đã tự nói — chưa ai tin đó là "tất cả".
Cron/tác vụ nền cắt lô không tính: không ai đang nhìn một màn hình để mà bị
nói dối. Riêng `.slice()` cắt danh sách thì **cỡ nào cũng phải nói ra**: một
bảng "Top 5" im lặng vẫn là một bảng khẳng định sai "đây là tất cả".

### Vòng 29/08/2026 — vá lưới, sửa câu chữ, gọn dải (REV-0034)

| Việc | Trước | Sau |
|---|---|---|
| **Lưới bắt được mấy kiểu cắt** | 1/5 kiểu Hồ Ly viết ra | **9/9** (5 của Hồ Ly + 4 tự nghĩ: `.slice(-N)` · `.length = N` · `Math.min(N, …)` · `.slice()` ở máy chủ) |
| **Hàm máy quét nhìn thấy** | 675 | **710** (+35, mở cho `const x = async () =>`; riêng `dulieunen.js` 22 → 43) |
| **Vi phạm THẬT lòi thêm sau khi hết mù** | — | **0** — 35 hàm mới hiện ra hôm nay chưa hàm nào có `LIMIT`/`.slice` cỡ danh sách. Trước đây `dulieunen.js` là **lỗ chờ**: mai ai thêm, máy vẫn xanh |
| **Dải PHẠM VI cao** (kể cả margin) | 148,8px @375 · 169px @320 | **52px** ở cả hai |
| **Dòng bảng còn thấy được** | 5 dòng @375×667 · 2 dòng @320×568 | **7 dòng · 5 dòng** (tăng, không giảm) |
| **Đường đi tiếp của dải cắt** | câu chữ chỉ sang ô tìm kiếm — mà ô đó lọc phía trình duyệt | nút **"Tải thêm N việc/đơn cũ hơn"** gọi lại máy chủ với con trỏ `?truoc=` |

Đo bằng `npm run do-duong-di-tiep` (D1 thật, worker thật, tài khoản `hcns`,
700 việc) và `npm run do-nut-dai-cat` (trình duyệt thật, có khung "bản trước"
để so, có ca đối chứng gỡ luật 44px).

## Khi nào quay lại làm đầy đủ hơn

Nếu Sản phẩm/SKU bắt đầu có dữ liệu thật (hiện 0 dòng) hoặc Nhân sự vượt
quá ~100 dòng, cân nhắc thêm Sort cho các cột chính (mã, tên, ngày) và
chuyển Nhân sự/Tài sản sang lọc server-side như Đơn hoàn đã làm — lúc đó
mới cần bàn tới URL query state / pagination thật.
