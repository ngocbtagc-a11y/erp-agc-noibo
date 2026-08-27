# REV-0003 — Rà soát "cửa sổ có tự đóng không" toàn ERP

- **Request**: CTL-0008 — Cửa sổ bung ra không tự đóng
- **Người rà**: KHỈ ĐỘT (Agent B — Main Builder)
- **Ngày**: 2026-08-27
- **Nhánh**: `feature/dong-cua-so` (tách từ `feature/gopy-paste-anh`)
- **Cách rà**: KHÔNG đọc lướt. Nạp thật `public/app.html` vào trình duyệt
  (Chrome, wrangler dev `127.0.0.1:8787`), áp đúng `style.css` thật, rồi đo
  `getComputedStyle().display` của **toàn bộ 211 phần tử** dùng thuộc tính
  `[hidden]`. Số liệu dưới đây là **đo được**, không phải suy đoán.

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

Đo thật: **211 phần tử** dùng `[hidden]`, **14 phần tử KHÔNG ẩn được**,
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

| # | Modal | app.html | 1. Lưu OK → đóng | 2. Lưu lỗi → báo + giữ liệu | 3. Bấm ra ngoài | 4. Esc | 5. Điện thoại |
|---|---|---|---|---|---|---|---|
| 1 | `#gyChiTietModalNen` Chi tiết góp ý | 484 | ✅ | ✅ | ❌ *(app.js:3154)* | ❌ | ⚠️ |
| 2 | `#tsChiTietModalNen` Chi tiết tài sản | 1615 | ✅ (4318-4359) | ✅ | ❌ | ❌ | ⚠️ |
| 3 | `#tsSuaModalNen` Sửa tài sản | 1649 | ✅ (4396) | ✅ | ❌ | ❌ | ⚠️ |
| 4 | `#tsQuetModalNen` Quét QR tài sản | 1716 | — | — | ❌ | ❌ | ⚠️ |
| 5 | `#hopNhapModalNen` Nhập hàng loạt | 2147 | ✅ | ✅ | ✅ (629) | ❌ | ✅ |
| 6 | `#nsSuaModalNen` Sửa nhân sự | 2177 | ✅ | ✅ | ✅ (2639) | ❌ | ✅ |
| 7 | `#mkModalNen` Đổi mật khẩu | 2289 | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| 8 | `#mtFormModalNen` Form mục tiêu | 2320 | ✅ | ✅ | ✅ (1610) | ❌ | ✅ |
| 9 | `#cvFormModalNen` Form công việc | 2346 | ✅ | ✅ | ✅ (1908) | ❌ | ✅ |
| 10 | `#mtModalNen` Chi tiết mục tiêu | 2435 | ✅ | ✅ | ✅ (1751) | ❌ | ✅ |
| 11 | `#kvModalNen` Kho vận | 2471 | ✅ | ✅ | ✅ (5179) | ❌ | ✅ |
| 12 | `#knModalNen` Khiếu nại | 2532 | ✅ | ✅ | ✅ (5620) | ❌ | ✅ |
| 13 | `#knXemModalNen` Xem khiếu nại | 2562 | — | — | ✅ (3560) | ❌ | ✅ |
| 14 | `#qrModalNen` Quét QR | 2582 | — | — | ✅ (5729) | ❌ | ✅ |
| 15 | `#tsCapPhatModalNen` Cấp phát tài sản | 2594 | ✅ (4247) | ✅ | ❌ | ❌ | ⚠️ |
| 16 | `#xcOModalNen` Xếp ca | 2632 | ✅ | ✅ | ✅ (4854) | ❌ | ✅ |
| 17 | `#taoTkModalNen` Tạo tài khoản | 2665 | ✅ | ✅ | ✅ (6155) | ❌ | ✅ |
| 18 | `#doiVaiTroModalNen` Đổi vai trò | 2698 | ✅ | ✅ | ✅ (6177) | ❌ | ✅ |

Chú giải: ✅ đạt · ❌ không đạt · ⚠️ chỉ đóng được bằng nút X/Huỷ ·
"—" modal chỉ để xem, không có nút Lưu.

**Ba kết luận:**

- **Tiêu chí 2 (lưu lỗi phải giữ dữ liệu): 18/18 ĐẠT.** Đã soi từng khối
  `catch`/`finally` trong `app.js` — **không có** chỗ nào đặt `hidden = true`
  trong `catch` hay `finally`. Lưu hỏng là cửa sổ ở lại, dữ liệu còn nguyên.
  Chỗ này code hiện tại làm đúng, không cần đụng vào.
- **Tiêu chí 4 (phím Esc): 0/18 ĐẠT.** Toàn bộ `app.js` chỉ có **đúng 1**
  chỗ bắt phím Escape — ô gợi ý combobox (`app.js:549`). Không modal nào
  đóng được bằng Esc.
- **Tiêu chí 3 (bấm ra ngoài): 12/18 ĐẠT.** Thiếu ở 6 modal: `gyChiTiet`,
  `tsChiTiet`, `tsSua`, `tsQuet`, `mk`, `tsCapPhat`.

---

## 3. ĐÃ SỬA GÌ TRONG CTL-0008 (chỉ đúng popover Trạng thái)

Bám ràng buộc bản giao việc: **chỉ sửa cái Sếp báo, còn lại chỉ báo cáo.**

| File | Dòng | Sửa gì |
|---|---|---|
| `public/assets/css/style.css` | 630-636 | Thêm `.thd-panel[hidden] { display: none; }` + chú thích cái bẫy, để lần sau không ai giẫm lại |
| `public/assets/js/app.js` | 1015-1029 | `document.addEventListener('click', …)` → **`pointerdown`** + chặn bằng `closest('#thdWrap')`; thêm **phím Esc** |

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

---

## 4. ĐỀ XUẤT — CẦN SẾP DUYỆT TRƯỚC KHI CODE (`CORE_CHANGE`)

**Trả lời câu hỏi "có cần hàm dùng chung không": CÓ — và theo
`docs/CORE-CHANGE-POLICY.md`, Khỉ Đột DỪNG ở đây, không tự code.**

Ba đề xuất, xếp theo tỉ lệ ăn thua. Đề xuất A rẻ và đáng làm nhất.

### Đề xuất A — Một dòng CSS, dập sạch cả 13 lỗi còn lại

```css
/* đặt ở đầu style.css */
[hidden] { display: none !important; }
```

- **Được**: xoá sổ toàn bộ nhóm lỗi này, kể cả những chỗ chưa ai viết.
  Không đụng một dòng JS nào.
- **Rủi ro**: `!important` là toàn cục — nếu đâu đó đang **cố tình** vừa
  đặt `hidden` vừa muốn phần tử hiện (không tìm thấy chỗ nào như vậy,
  nhưng phải soát lại 211 phần tử một lượt nữa).
- **Vì sao là CORE_CHANGE**: chạm mọi màn hình ERP cùng lúc.
- **Công**: ~1 giờ gồm cả soát lại.

### Đề xuất B — Vá đúng 7 class, không dùng `!important`

Thêm 7 dòng `.tb-badge[hidden]`, `.stats[hidden]`, `.mt-daxong-toggle[hidden]`,
`.chat-file-dinhkem[hidden]`, `.kd-thanh-chon[hidden]`, `.form-luoi[hidden]`.

- **Được**: rủi ro gần bằng 0, đúng thông lệ repo đang dùng.
- **Mất**: không chặn được người sau viết class mới lại quên. Lỗi sẽ mọc lại.
- **Công**: ~30 phút. Đây là phương án **không đụng Core**, bắt buộc phải
  nêu theo khung CORE_CHANGE_PROPOSAL.

> Gợi ý của Khỉ Đột: **làm A và B cùng lúc** — B để đúng thông lệ và đọc
> hiểu được, A để chặn tái phát về sau.

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

| Mã tạm | Việc | Mức |
|---|---|---|
| — | 13 phần tử nhóm A còn lại (đề xuất A hoặc B) | **CAO** — 3 chỗ đang hiện số/khung sai cho người dùng |
| — | Phím Esc cho 18 modal (đề xuất C) | TRUNG BÌNH |
| — | Bấm ra ngoài cho 6 modal còn thiếu | TRUNG BÌNH |
| — | Chưa kiểm được trên máy iOS/Android thật (chỉ giả lập 375×812 trong Chrome) | THẤP |

---

## 6. Ghi chú cách rà, để lần sau làm lại được

Không đọc code bằng mắt. Cách làm:

1. `wrangler dev` chạy `127.0.0.1:8787`.
2. Mở trang có nạp `style.css` thật.
3. `fetch('/app.html')` → `DOMParser` → nhét cả `body` vào trang đang mở
   (giữ nguyên quan hệ cha–con nên selector lồng nhau vẫn đúng).
4. Bật `hidden` cho 10 phần tử chỉ bị JS bật/tắt lúc chạy.
5. Duyệt hết `[hidden]`, đọc `getComputedStyle().display` — khác `none` là lỗi.

Chạy trước và sau khi sửa: **14 → 13**. Chính xác một phần tử được sửa,
không phần tử nào bị vạ lây.
