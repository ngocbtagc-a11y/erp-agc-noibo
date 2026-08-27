# REV-0003 — Rà soát "cửa sổ có tự đóng không" toàn ERP

- **Request**: CTL-0008 — Cửa sổ bung ra không tự đóng
- **Người rà**: KHỈ ĐỘT (Agent B — Main Builder)
- **Ngày**: 2026-08-27
- **Nhánh**: `feature/dong-cua-so` (tách từ `feature/gopy-paste-anh`)
- **Cách rà**: KHÔNG đọc lướt. Nạp thật `public/app.html` vào trình duyệt
  (Chrome, wrangler dev `127.0.0.1:8787`), áp đúng `style.css` thật, rồi đo
  `getComputedStyle().display` của **toàn bộ 205 phần tử** dùng thuộc tính
  `[hidden]`. Số liệu dưới đây là **đo được**, không phải suy đoán.

> ## 📌 TRẠNG THÁI HIỆN TẠI — đọc trước
>
> Đây là bản rà của **vòng 1**. Sau khi Hồ Ly soi (REV-0004) và Gạo quyết
> (ADR-0008), **vòng 2 đã làm xong** những việc mà bản này còn để ở dạng
> "đề xuất, chờ duyệt":
>
> | Việc | Trạng thái |
> |---|---|
> | Popover Trạng thái (`.thd-panel`) | ✅ đã sửa vòng 1 |
> | **13 phần tử cùng lỗi còn lại (Đề xuất B)** | ✅ **đã sửa vòng 2** — đo lại còn **0** |
> | **Đề xuất A nguyên văn** | ❌ **BỊ BÁC** — hỏng in tem, xem đính chính mục 4 |
> | **Đề xuất A1** (sửa `inTemNhieu()` trước, rồi mới thêm `!important`) | ✅ **đã làm vòng 2**, đúng thứ tự, có kiểm hồi quy in tem |
> | Đề xuất C (hàm dùng chung) | ⏸ chưa làm — chờ GY-0001 merge, tách request riêng |
>
> **Mục 2.1 dưới đây là ảnh chụp lúc CHƯA sửa**, giữ nguyên để tra cứu lịch sử.
> Đừng đọc nó như tình trạng hôm nay.

---

## 1. NGUYÊN NHÂN GỐC (đã chứng minh, không phải giả thuyết)

**Không phải "quên viết lệnh đóng".** Lệnh đóng đã có và vẫn chạy đúng.
Vấn đề nằm ở CSS: **`display` do mình viết đè mất `display: none` mặc định
của thuộc tính `hidden`.**

`public/assets/css/style.css:624`

```css
.thd-panel {
  position: absolute; left: 0; bottom: calc(100% + 6px); z-index: 40;
  ...
  display: flex; flex-direction: column; gap: 3px;   /* ← thủ phạm */
}
```

Trình duyệt ẩn phần tử có `hidden` bằng một luật mặc định `[hidden] { display: none }`.
Nhưng **CSS của trang luôn thắng CSS mặc định của trình duyệt** (khác gốc
cascade, không liên quan độ ưu tiên selector). Nên `.thd-panel { display: flex }`
đè lên, và câu lệnh `$('#thdPanel').hidden = true` trong `app.js` **chạy
thành công nhưng không ẩn được gì**.

Hệ quả: popover "Trạng thái của tôi" **hiện ra ngay từ lúc mở ERP** và
không bao giờ tắt — dù bấm Lưu, dù bấm ra ngoài, dù bấm lại chính cái pill.
Đúng như Sếp mô tả "cứ bung ra như này".

### Bằng chứng đo trong trình duyệt

Tạo đúng phần tử `<div class="thd-panel" hidden>` trên trang thật có nạp
`style.css` thật:

| Trước sửa | Sau sửa |
|---|---|
| `display: "flex"` (đáng lẽ phải là `none`) | `display: "none"` ✅ |

Đo lại ở khổ điện thoại 375×812: đóng → `none`, mở → `flex`. Đúng.

### Repo ĐÃ BIẾT cái bẫy này từ trước

`style.css:1268` có sẵn dòng chú thích y hệt cho một popup khác:

> `.cnb-popup[hidden] { display: none; }   /* display:flex ở trên đè mất [hidden] mặc định nếu không khai rõ thế này */`

Cùng khuôn với `.combo1-panel[hidden]` (1189), `.modal-nen[hidden]` (1849),
`.view[hidden]` (713). Nghĩa là **đây là lỗi bỏ sót một dòng bảo vệ đã thành
thông lệ trong chính repo này**, không phải kiến trúc sai.

### 4 giả thuyết GẠO nêu — kết quả loại trừ

| # | Giả thuyết | Kết luận | Bằng chứng |
|---|---|---|---|
| 1 | API `nsTrangThaiHD` lỗi → rơi vào `catch` | **LOẠI** | Handler `src/index.js:2987` lành: validate → 1 câu `INSERT ... ON CONFLICT` → `{ok:true}`. Không có đường nào ném lỗi thường xuyên. Và kể cả lưu **thành công**, popover vẫn không đóng — vì lệnh đóng bất lực. |
| 2 | Cảm ứng: `click` trên `document` không bắn | **KHÔNG PHẢI nguyên nhân**, nhưng là **rủi ro thật** → đã xử lý | Trên máy tính (chuột, `click` bắn chuẩn) popover vẫn không đóng ⇒ không phải nguyên nhân gốc. Nhưng kho dùng điện thoại là chính nên vẫn đổi sang `pointerdown`. |
| 3 | Bản chạy thật khác repo / Service Worker cache | **LOẠI** | `public/sw.js` **không cache gì cả** — nó chỉ `caches.delete()` sạch mọi cache cũ rồi để trình duyệt tự lo (`sw.js:14, 22`). Không có bản cũ nào đọng lại. Lỗi có sẵn trong `HEAD`, nên bản deploy cũng dính. |
| 4 | Click "ra ngoài" rơi trúng panel nên bị `stopPropagation` chặn | **LOẠI** | Panel rộng 220px nằm gọn trong Sidebar; click giữa màn hình không thể trúng. Và dù trúng hay không cũng vô nghĩa — `hidden = true` không ẩn được. |

---

## 2. KẾT QUẢ RÀ TOÀN ERP

### 2.1 Nhóm A — Cửa sổ **không ẩn được** (lỗi cùng loại với CTL-0008)

> ⚠️ **ẢNH CHỤP LÚC CHƯA SỬA.** Cả 14 phần tử dưới đây **đã được sửa xong ở
> vòng 2** (mục 1 sửa ở vòng 1, 13 mục còn lại theo Đề xuất B). Đo lại bằng
> iframe cách ly: **0 phần tử còn lỗi**. Giữ bảng để tra cứu lịch sử.

Đo thật: **205 phần tử** dùng `[hidden]`, **14 phần tử KHÔNG ẩn được**,
gom về **7 class CSS** thiếu dòng `[hidden] { display: none }`.

| # | Cửa sổ / phần tử | Nơi khai (app.html) | Class thiếu chốt (style.css) | Đo được | Hậu quả người dùng thấy | Mức |
|---|---|---|---|---|---|---|
| 1 | **Popover "Trạng thái của tôi"** `#thdPanel` | 48 | `.thd-panel` — 624 | `flex` | Bung ra từ lúc mở ERP, che chỗ làm việc, không đóng được bằng cách nào | **CAO** — ĐÃ SỬA |
| 2 | Badge số thông báo chưa đọc `#tbBadge` | 87 | `.tb-badge` — 1206 | `flex` | Đọc thông báo rồi, `badge.hidden = true` (app.js:3667, 3680) vẫn để số đỏ nằm đó → tưởng còn việc chưa xem | **CAO** — số liệu sai |
| 3 | Badge chat nội bộ `#cnbBadge` | 588 | `.tb-badge` — 1206 | `flex` | Y hệt mục 2, ở chuông chat | **CAO** — số liệu sai |
| 4 | Khối tóm tắt Tổng quan `#tq-tomtat` | 109 | `.stats` — 871 | `grid` | Khi chưa có số liệu, đáng lẽ giấu đi thì vẫn chiếm chỗ, hiện khung rỗng (app.js:1580) | TRUNG BÌNH |
| 5-7 | 3 nút "Đã xong" Mục tiêu `#mt-congty/phongban/canhan-daxong-toggle` | 179, 188, 197 | `.mt-daxong-toggle` — 756 | `flex` | Không có mục tiêu đã xong nào vẫn hiện nút "Đã xong (0)" bấm vào trống trơn | THẤP |
| 8 | Khung file đính kèm chat `#chat-file-dinhkem` | 566 | `.chat-file-dinhkem` — 1387 | `flex` | Gửi/huỷ file xong khung vẫn nằm lại (app.js:2549, 2555, 2572) — tưởng file còn treo, gửi nhầm lần nữa | **CAO** |
| 9 | Thanh chọn hàng loạt Đối soát `#kd-ds-thanhchon` | 783 | `.kd-thanh-chon` — 1460 | `flex` | Bỏ chọn hết rồi thanh "Đã chọn N dòng" vẫn hiện (app.js:3516) | TRUNG BÌNH |
| 10 | Thanh chọn Kế toán–Tài sản `#kt-ts-thanhchon` | 1387 | `.kd-thanh-chon` — 1460 | `flex` | Y hệt (app.js:5922) | TRUNG BÌNH |
| 11 | Thanh chọn Kế toán–Hàng hoá `#kt-hh-thanhchon` | 1425 | `.kd-thanh-chon` — 1460 | `flex` | Y hệt (app.js:6033) | TRUNG BÌNH |
| 12 | Thanh chọn Tài sản `#ts-thanhchon` | 1587 | `.kd-thanh-chon` — 1460 | `flex` | Y hệt (app.js:4062) | TRUNG BÌNH |
| 13 | Form kho trong Đơn hoàn `#dln-kho-form` | 1347 | `.form-luoi` — 1787 | `grid` | Chuyển sang trạng thái không cần nhập kho, form vẫn hiện (app.js:3896-3918) | TRUNG BÌNH |
| 14 | Form sửa Kho vận `#kvSuaForm` | 2494 | `.form-luoi` — 1787 | `grid` | Đóng form sửa xong form vẫn nằm đó (app.js:5191-5272) | TRUNG BÌNH |

**Đã chạy lại phép đo sau khi sửa: còn 13/14 — đúng bằng số chưa sửa. Mục 1 sạch.**

### 2.2 Nhóm B — Cửa sổ ẩn ĐÚNG (197 phần tử còn lại)

Đo được `display: none`. Gồm toàn bộ 18 modal `.modal-nen`, `.view`,
`.cnb-popup`, `.combo1-panel`, `.tb-panel`, `.empty`, `.gy-anh-xem`,
`.mt-daxong-list`, `.ts-in-tem-vung`… Các class này **đã có** dòng
`[hidden] { display: none }` hoặc vốn không đặt `display`.

### 2.3 Bảng 5 tiêu chí — 18 modal `.modal-nen`

Modal đều ẩn/hiện được (mục 1), nên chấm 4 tiêu chí còn lại.

> **Số dòng tính theo bản `feature/dong-cua-so` SAU vòng sửa 2** (commit cuối
> của CTL-0008). Bản đầu của bảng này trộn lẫn số dòng trước/sau khi vá nên
> lệch +14 ở một số mục — đã soát lại toàn bộ (REV-0004 `FIX-03`).

| # | Modal | app.html | 1. Lưu OK → đóng | 2. Lưu lỗi → báo + giữ liệu | 3. Bấm ra ngoài | 4. Esc | 5. Điện thoại |
|---|---|---|---|---|---|---|---|
| 1 | `#gyChiTietModalNen` Chi tiết góp ý | 484 | ✅ | ✅ | ❌ *(app.js:3176)* | ❌ | ⚠️ |
| 2 | `#tsChiTietModalNen` Chi tiết tài sản | 1615 | ✅ (4340-4367) | ✅ | ❌ | ❌ | ⚠️ |
| 3 | `#tsSuaModalNen` Sửa tài sản | 1649 | ✅ (4418) | ✅ | ❌ | ❌ | ⚠️ |
| 4 | `#tsQuetModalNen` Quét QR tài sản | 1716 | — | — | ❌ | ❌ | ⚠️ |
| 5 | `#hopNhapModalNen` Nhập hàng loạt | 2147 | ✅ | ✅ | ✅ (629) | ❌ | ✅ |
| 6 | `#nsSuaModalNen` Sửa nhân sự | 2177 | ✅ | ✅ | ✅ (2661) | ❌ | ✅ |
| 7 | `#mkModalNen` Đổi mật khẩu | 2289 | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| 8 | `#mtFormModalNen` Form mục tiêu | 2320 | ✅ | ✅ | ✅ (1632) | ❌ | ✅ |
| 9 | `#cvFormModalNen` Form công việc | 2346 | ✅ | ✅ | ✅ (1930) | ❌ | ✅ |
| 10 | `#mtModalNen` Chi tiết mục tiêu | 2435 | ✅ | ✅ | ✅ (1773) | ❌ | ✅ |
| 11 | `#kvModalNen` Kho vận | 2471 | ✅ | ✅ | ✅ (5219) | ❌ | ✅ |
| 12 | `#knModalNen` Khiếu nại | 2532 | ✅ | ✅ | ✅ (5660) | ❌ | ✅ |
| 13 | `#knXemModalNen` Xem khiếu nại | 2562 | — | — | ✅ (3582) | ❌ | ✅ |
| 14 | `#qrModalNen` Quét QR | 2582 | — | — | ✅ (5769) | ❌ | ✅ |
| 15 | `#tsCapPhatModalNen` Cấp phát tài sản | 2594 | ✅ (4269) | ✅ | ❌ | ❌ | ⚠️ |
| 16 | `#xcOModalNen` Xếp ca | 2632 | ✅ | ✅ | ✅ (4894) | ❌ | ✅ |
| 17 | `#taoTkModalNen` Tạo tài khoản | 2665 | ✅ | ✅ | ✅ (6195) | ❌ | ✅ |
| 18 | `#doiVaiTroModalNen` Đổi vai trò | 2698 | ✅ | ✅ | ✅ (6217) | ❌ | ✅ |

Chú giải: ✅ đạt · ❌ không đạt · ⚠️ chỉ đóng được bằng nút X/Huỷ ·
"—" modal chỉ để xem, không có nút Lưu.

**Ba kết luận:**

- **Tiêu chí 2 (lưu lỗi phải giữ dữ liệu): 18/18 ĐẠT.** Đã soi từng khối
  `catch`/`finally` trong `app.js` — **không có** chỗ nào đặt `hidden = true`
  trong `catch` hay `finally`. Lưu hỏng là cửa sổ ở lại, dữ liệu còn nguyên.
  Chỗ này code hiện tại làm đúng, không cần đụng vào.
- **Tiêu chí 4 (phím Esc): 0/18 ĐẠT.** Trước CTL-0008, toàn bộ `app.js` chỉ có
  **đúng 1** chỗ bắt phím Escape — ô gợi ý combobox (`app.js:549`). Không modal
  nào đóng được bằng Esc. *(Sau CTL-0008 có thêm 1 chỗ nữa — `app.js:1032` cho
  popover Trạng thái. 18 modal vẫn chưa có, xem Đề xuất C.)*
- **Tiêu chí 3 (bấm ra ngoài): 12/18 ĐẠT.** Thiếu ở 6 modal: `gyChiTiet`,
  `tsChiTiet`, `tsSua`, `tsQuet`, `mk`, `tsCapPhat`.

---

## 3. ĐÃ SỬA GÌ TRONG CTL-0008

### Vòng 1 — chỉ đúng popover Trạng thái

Bám ràng buộc bản giao việc: **chỉ sửa cái Sếp báo, còn lại chỉ báo cáo.**

| File | Dòng | Sửa gì |
|---|---|---|
| `public/assets/css/style.css` | 655 | Thêm `.thd-panel[hidden] { display: none; }` + chú thích cái bẫy, để lần sau không ai giẫm lại |
| `public/assets/js/app.js` | 1015-1035 | `document.addEventListener('click', …)` → **`pointerdown`** + chặn bằng `closest('#thdWrap')`; thêm **phím Esc** |

Vì sao đổi `click` → `pointerdown`: `pointerdown` bắn đều cho chuột, cảm
ứng và bút — kho dùng điện thoại là chính. Dùng `closest('#thdWrap')` thay
vì trông vào `stopPropagation` nên thứ tự sự kiện không thể làm hỏng nút
bật/tắt.

**KHÔNG đụng** `#gy-form` / `khoiDongGopY()` / `.gy-anh-*` (vùng GY-0001
đang chờ Hồ Ly review — Rule 13 One Writer Per Area).

### Kiểm thử — 11/11 đạt

Chạy thật trên Chrome, dựng đúng DOM `#thdWrap` lấy từ `app.html`, gắn
đúng đoạn handler sau khi sửa, bắn sự kiện thật:

| # | Tình huống | Kết quả |
|---|---|---|
| 0 | Lúc mở trang | Đóng ✅ *(trước đây: mở toang)* |
| 1 | Bấm pill trạng thái | Mở ✅ |
| 2 | Bấm pill lần 2 | Đóng ✅ (`pointerdown` không phá bật/tắt) |
| 3 | Bấm vào ô bên trong panel | Vẫn mở ✅ |
| 4 | Chạm/bấm ra ngoài | Đóng ✅ |
| 5 | Phím Esc | Đóng ✅ |
| 6 | **Lưu thành công** | Đóng ✅ |
| 7 | **Lưu thất bại** | Vẫn mở ✅ |
| 8 | **Lưu thất bại** | Giữ nguyên chữ vừa gõ ✅ |
| 9 | **Lưu thất bại** | Có báo lỗi ✅ |
| 10 | Nút Lưu bấm lại được sau lỗi | ✅ |

Kiểm thêm ở khổ điện thoại 375×812: đóng → `none`, mở → `flex` ✅.
`node --check public/assets/js/app.js` ✅.

### Vòng 2 — sau REV-0004 + ADR-0008

| File | Dòng | Sửa gì | Theo |
|---|---|---|---|
| `style.css` | 23 | `[hidden] { display: none !important; }` — chốt chặn toàn cục, kèm cảnh báo cho người sau | A1 bước 3 |
| `style.css` | 791, 911, 1246, 1438, 1515, 1844 | 6 dòng `.X[hidden] { display: none; }` cho `.mt-daxong-toggle`, `.stats`, `.tb-badge`, `.chat-file-dinhkem`, `.kd-thanh-chon`, `.form-luoi` | Đề xuất B |
| `app.js` | 4427-4460 | `inTemNhieu()` **gỡ `hidden` trước** `window.print()`, đặt lại qua `afterprint` | A1 bước 1 |
| `app.js` | 1032-1036 | Esc chỉ trả focus khi con trỏ đang ở trong popover | `FIX-02` |
| `app.js` | 982-995 | Bỏ 2 lệnh `e.stopPropagation()` đã thành code chết | `FIX-04` |

**Kết quả đo lại (iframe cách ly): 14 → 0 phần tử còn lỗi.**

Riêng `#tsInTemVung` không đếm là lỗi ở cả hai vòng — nó **cố tình** mang
`hidden` và trước đây dựa vào CSS đè để in ra. Vòng 2 đã cắt sự phụ thuộc đó.

---

## 4. ĐỀ XUẤT — CẦN SẾP DUYỆT TRƯỚC KHI CODE (`CORE_CHANGE`)

> ### ⚠️ ĐÍNH CHÍNH 27/08/2026 — ĐỌC TRƯỚC KHI DUYỆT
>
> Bản đầu của mục này viết rằng Đề xuất A đã được quét và **"không tìm thấy
> chỗ nào như vậy"**. **CÂU ĐÓ SAI.** Hồ Ly quét lại đầy đủ (REV-0004 mục 2)
> và tìm ra **đúng một chỗ**: **tem in tài sản 60×40mm (`#tsInTemVung`)**.
>
> Nếu Sếp duyệt Đề xuất A **theo đúng chữ bản cũ**, **máy in tem sẽ nhả ra
> giấy trắng** — không báo lỗi, không ghi log, kho dễ dán tem trắng lên tài
> sản rồi mới phát hiện.
>
> Đề xuất A nguyên văn **ĐÃ BỊ BÁC** (ADR-0008). Thay bằng **A1** dưới đây.
> Lỗi này do Khỉ Đột quét thiếu ở vòng 1 — quét bằng phương pháp có lỗ hổng,
> xem mục 6.

**Trả lời câu hỏi "có cần hàm dùng chung không": CÓ — và theo
`docs/CORE-CHANGE-POLICY.md`, Khỉ Đột DỪNG ở đây, không tự code.**

### ❌ Đề xuất A (nguyên văn) — **BỊ BÁC, KHÔNG ĐƯỢC LÀM**

```css
[hidden] { display: none !important; }      /* thêm MỘT MÌNH dòng này = hỏng in tem */
```

**Vì sao hỏng**: `#tsInTemVung` (`public/app.html:1734`) mang `hidden` **cố
định** trong HTML và **chỉ** hiện ra nhờ
`@media print { .ts-in-tem-vung { display: block } }`
(`public/assets/css/style.css`, khối `@media print` cuối file), trong khi
`inTemNhieu()` gọi `window.print()` mà **không gỡ `hidden`**.

Nghĩa là tem in được **chính nhờ cái cơ chế mà CTL-0008 gọi là lỗi**. Thêm
`!important` toàn cục → luật `display: block` trong `@media print` (không có
`!important`) **thua** → tem biến mất khỏi bản in.

Số đo trong iframe cách ly, mô phỏng đúng lúc in:

| | Lúc xem màn hình | **Lúc in** |
|---|---|---|
| Chưa có `!important` | `none` | **`block`** ✅ tem in ra |
| Thêm `!important` mà **chưa** sửa `inTemNhieu()` | `none` | **`none`** ❌ **giấy trắng** |

### ✅ Đề xuất A1 — cách đúng, **thứ tự bắt buộc, không được đảo**

1. Sửa `inTemNhieu()`: **gỡ `hidden` trước** `window.print()`, đặt lại sau khi
   in xong (qua `afterprint`).
2. **Kiểm in tem chạy đúng.**
3. **Xong bước 2 mới** thêm `[hidden] { display: none !important; }`.
4. **Kiểm lại in tem lần nữa.**

Đảo thứ tự là hỏng in tem trong khoảng giữa hai bước.

- **Được**: xoá sổ toàn bộ nhóm lỗi này, kể cả code viết sau này. Và chữa luôn
  nợ kỹ thuật: tem không còn phụ thuộc vào việc CSS đè `[hidden]`.
- **Vì sao là CORE_CHANGE**: chạm mọi màn hình ERP cùng lúc.
- **Công**: ~1 giờ gồm cả kiểm hồi quy in tem.

> **A2** (chừa ngoại lệ `[hidden]:not(.ts-in-tem-vung)`) chạy được nhưng để lại
> đúng cái bẫy cho người sau — **không khuyến nghị**.

### ✅ Đề xuất B — Vá đúng 6 class, không dùng `!important`

Thêm 6 dòng: `.tb-badge[hidden]`, `.stats[hidden]`, `.mt-daxong-toggle[hidden]`,
`.chat-file-dinhkem[hidden]`, `.kd-thanh-chon[hidden]`, `.form-luoi[hidden]`.

- **Được**: rủi ro gần bằng 0, đúng thông lệ repo đang dùng. **Không đụng in tem.**
- **Mất**: không chặn được người sau viết class mới lại quên. Lỗi sẽ mọc lại.
- **Công**: ~30 phút.
- **B KHÔNG phải `CORE_CHANGE`** — bản đầu xếp B chung cổng duyệt với A là
  **chặn quá tay**, làm 3 lỗi mức CAO nằm chờ vô ích (REV-0004 mục 3).

> Gợi ý của Khỉ Đột: **làm B trước** (rẻ, an toàn, chữa ngay 3 lỗi CAO), rồi
> mới làm A1 để chặn tái phát về sau.

### Đề xuất C — Hàm dùng chung `moCuaSo()` / `dongCuaSo()`

Một cặp hàm lo trọn: mở/đóng, Esc, bấm ra ngoài, khoá cuộn nền, trả focus
về chỗ cũ, và khuôn xử lý lỗi "báo lỗi + giữ dữ liệu".

- **Giải quyết**: Esc 0/18 → 18/18; bấm ra ngoài 12/18 → 18/18.
- **Rủi ro**: **CAO**. Đụng cả 18 modal + mọi popover, **gồm cả `#gy-form`
  Hồ Ly đang review** (GY-0001). Đây đúng là điều bản giao việc CTL-0008
  cảnh báo.
- **Đề nghị**: **chưa làm bây giờ.** Chờ GY-0001 merge xong, tách thành
  request riêng, làm một mình một nhánh.
- **Công**: 1-2 ngày kể cả kiểm thử lại 18 modal.

---

## 5. Việc còn treo, không nằm trong CTL-0008

| Việc | Mức | Trạng thái |
|---|---|---|
| ~~13 phần tử nhóm A còn lại~~ | ~~CAO~~ | ✅ **xong vòng 2** (Đề xuất B) |
| ~~`#tsInTemVung` phụ thuộc CSS đè `[hidden]` để in được~~ | ~~TRUNG BÌNH~~ | ✅ **xong vòng 2** (A1 bước 1) |
| Phím Esc cho 18 modal (Đề xuất C) | TRUNG BÌNH | ⏸ chờ GY-0001 merge, tách request riêng |
| Bấm ra ngoài cho 6 modal còn thiếu | TRUNG BÌNH | ⏸ gộp vào Đề xuất C |
| Chưa kiểm trên máy iOS/Android thật (mới giả lập 375×812 trong Chrome) | THẤP | ⏸ |
| **In tem chưa có kiểm thử tự động** | THẤP | ⏸ lỗi `FIX-01` lọt được tới REV-0004 chính vì không ai kiểm đường in |

---

## 6. Ghi chú cách rà — VÀ MỘT BÀI HỌC PHẢI NHỚ

### ❌ Cách đo ở vòng 1 CÓ LỖ HỔNG — đừng lặp lại

Vòng 1 đo bằng cách `fetch('/app.html')` rồi **nhét `body` vào trang đang mở**.
Sai ở chỗ: **trang đăng nhập đã nạp sẵn `style.css`**, nên bản CSS "trước khi
sửa" mà mình dựng lên bị CSS thật của trang đè lên — phép so trước/sau có nguy
cơ vô nghĩa. Hồ Ly dính đúng bẫy này ở lần đo đầu (cả "trước" lẫn "sau" đều ra
`none`, tức là phép đo hỏng chứ không phải code đúng).

Kết luận vòng 1 **may mà vẫn đúng, nhưng đúng do may chứ không do phương pháp**
(ADR-0008 mục 4).

### ✅ Cách đo đúng — dựng trong `<iframe srcdoc>` cách ly

```
iframe.srcdoc = '<style>' + <nội dung style.css> + '</style>' + <body của app.html>
```

Chỉ có **đúng một** thẻ `<style>` trong tài liệu, không CSS nào khác lẫn vào.
Muốn thử một luật mới thì nối thêm vào cuối chuỗi CSS. Muốn mô phỏng **lúc in**
thì đổi `@media print {` thành `@media all {` — giữ nguyên thứ tự và độ ưu tiên
nên cascade y hệt lúc in thật.

Các bước:

1. `wrangler dev` chạy `127.0.0.1:8787`.
2. `fetch` cả `style.css` và `app.html`.
3. Dựng iframe cách ly như trên.
4. Bật `hidden` cho 10 phần tử chỉ bị JS bật/tắt lúc chạy.
5. Duyệt hết `[hidden]`, đọc `getComputedStyle().display` — khác `none` là lỗi.

### ⚠️ Cạm bẫy khi quét luật CSS bằng `document.styleSheets`

Trình duyệt đời mới cho **mọi `CSSStyleRule` một `cssRules` RỖNG** (vì CSS
Nesting). Viết `if (r.cssRules) { đệ quy } else { đọc r.style }` là **nuốt sạch
mọi luật thường** — quét ra 0 luật mà không báo lỗi gì. Phải:

- đọc `r.style` **trước**, cho mọi luật;
- chỉ đệ quy khi `r.cssRules && r.cssRules.length` **thật sự > 0**.

Đã dính đúng lỗi này lúc quét lại ở vòng 2: lần đầu ra "0 luật có `display`"
trong khi thực tế có **137**. Có kiểm lại số liệu vô lý nên bắt được.

### Số đo hai vòng

| | Phần tử `[hidden]` không ẩn được |
|---|---|
| Trước CTL-0008 | **14** |
| Sau vòng 1 (chỉ `.thd-panel`) | **13** |
| **Sau vòng 2 (Đề xuất B + A1)** | **0** |

Và quét đầy đủ 137 luật có đặt `display` (đệ quy cả `@media`): **104 luật có
thể làm hiện phần tử**, trong đó chỉ **5 luật nằm trong media query**, và chỉ
**1** luật trúng phần tử mang `hidden` — `.ts-in-tem-vung` trong `@media print`,
nay đã hết phụ thuộc. `app.js` dùng `style.display` **0 chỗ**, thư viện ngoài
(`html5-qrcode`, `qrcode-lib`) dùng thuộc tính `hidden` **0 chỗ**.
