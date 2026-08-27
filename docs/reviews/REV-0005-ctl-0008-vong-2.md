# REV-0005 — CTL-0008 vòng 2: quyết định đẩy lên hệ thống thật

- **Request**: CTL-0008 (vòng 2)
- **Người soi**: HỒ LY (Agent A — QA / Red Team / Release Gate)
- **Ngày**: 2026-08-27
- **Đối tượng soi**: commit `7b3e6c0` trên nhánh `feature/dong-cua-so`
  (xếp trên `515f135` → `3af0c23`)
- **Vòng 1**: [REV-0004](REV-0004-ctl-0008-dong-cua-so.md) — trả `FIX_REQUIRED`, 4 lỗi
- **Quyết định đang áp**: [ADR-0008](../decisions/ADR-0008-sua-13-loi-cua-so-khong-lam-hong-in-tem.md)
- **Điều kiện phát hành**: [ADR-0009](../decisions/ADR-0009-dieu-kien-dua-dot-nay-len-he-thong-that.md)

> # ✅ KẾT LUẬN: **PASS**
>
> **In tem tài sản: TỰ ĐO LẠI — ĐẠT.** In ra chữ thật, khổ đúng 60×40mm, cả
> khi in 1 tem lẫn in hàng loạt.
>
> **Con số 14 → 0: XÁC NHẬN.** Đo độc lập trong iframe cách ly.
>
> **Khuyến nghị phát hành: NÊN ĐẨY.**
>
> Không còn lỗi mức CAO hay TRUNG BÌNH. Ba mục còn lại đều mức THẤP/thông tin,
> nêu rõ ở mục 9, **không mục nào chặn phát hành**.

---

## 0. Neo bản soi — đọc trước

Trong lúc soi, **một agent khác đã `checkout` sang nhánh khác** (`feature/dan-anh-dung-chung`,
CTL-0011) và đang chạy `git rebase` lên chính `7b3e6c0`. Cây làm việc của repo
dùng chung **đổi liên tục dưới tay tôi**.

Vì vậy tôi **không checkout đè lên việc của người khác**. Toàn bộ phép đo dưới
đây chạy trên bản trích xuất byte-đúng bằng `git archive 7b3e6c0` và
`git archive 3af0c23` ra thư mục riêng, phục vụ qua một server tĩnh cục bộ.

**Bản soi này chỉ nói về commit `7b3e6c0`** — một commit bất biến. Trạng thái dở
dang của cây làm việc không thuộc phạm vi bản này (xem mục 10).

---

## 1. IN TEM TÀI SẢN — **TỰ ĐO LẠI, ĐẠT**

Đây là mục quan trọng nhất. Vòng 1 chính tôi phát hiện `#tsInTemVung` sẽ in ra
giấy trắng. Khỉ Đột khai đã sửa. **Tôi không tin lời khai, tự đo lại.**

### 1.1 Cách đo — in RA PDF THẬT, không mô phỏng

Vòng 1 tôi mô phỏng lúc in bằng cách đổi `@media print` thành `@media all`.
Vòng này tôi làm mạnh hơn: **cho Chrome in thật ra PDF** (`chrome --headless
--print-to-pdf`), tức là đi đúng đường in mà máy in tem sẽ đi.

Trang thử dựng từ **`app.html` thật + `style.css` thật** của commit cần soi, đã
gỡ hết `<script>`, rồi chèn **đúng 3 dòng đang được soi**, chép thẳng từ
`app.js` chứ không gõ lại:

```js
const vungTem = $('#tsInTemVung');
window.addEventListener('afterprint', () => { vungTem.hidden = true; }, { once: true });
vungTem.hidden = false;
```

### 1.2 Có ca ĐỐI CHỨNG — để phép đo tự chứng minh là nó nhạy

Một phép đo lúc nào cũng ra "đạt" thì vô giá trị. Nên tôi in **4 bản**, trong đó
2 bản đối chứng phải ra kết quả KHÁC:

| # | Bản | Kỳ vọng |
|---|---|---|
| 1 | `7b3e6c0` + có bản vá A1, **2 tem** | In ra được |
| 2 | `7b3e6c0` + có bản vá A1, **1 tem** | In ra được |
| 3 | **ĐỐI CHỨNG** `7b3e6c0` nhưng **bỏ bản vá A1** | **Giấy trắng** |
| 4 | **ĐỐI CHỨNG** `3af0c23` (bản cũ, chưa có `!important`) | In ra được |

### 1.3 Số đo

| Bản in | Cỡ file PDF | Byte nội dung | **Lệnh vẽ chữ (`Tj`/`TJ`)** | Khổ giấy |
|---|---|---|---|---|
| 1. Có A1 — 2 tem | 48.731 | 101.821 | **1.587** | 227×151px = **59,9×39,9mm** |
| 2. Có A1 — 1 tem | 38.407 | 64.922 | **847** | 227×151px = **59,9×39,9mm** |
| 3. ĐỐI CHỨNG bỏ A1 | 5.492 | 1.452 | **0** ❌ | 227×151px |
| 4. ĐỐI CHỨNG bản cũ | 48.731 | 101.821 | **1.587** | 227×151px |

### 1.4 Đọc số đo

- **Bản 1 và bản 4 giống nhau đến từng byte nội dung (101.821) và từng lệnh vẽ
  chữ (1.587).** Nghĩa là sau bản vá, tem in ra **y hệt như hệ thống đang chạy
  hôm nay**. Không mất gì, không thêm gì.
- **Bản 3 có 0 lệnh vẽ chữ** — giấy trắng thật. Đây là bằng chứng kép: vừa
  chứng minh phép đo của tôi đủ nhạy để bắt lỗi, vừa xác nhận cảnh báo vòng 1
  là đúng — **nếu Khỉ Đột thêm `!important` mà quên sửa `inTemNhieu()` thì kho
  đã dán tem trắng lên tài sản thật.**
- **Khổ giấy 227×151px @96dpi = 59,9×39,9mm** — đúng khổ Sếp chốt 23/08/2026,
  khớp con số Khỉ Đột khai.
- **In 1 tem: 847 lệnh vẽ chữ ≈ một nửa của 1.587.** Cả hai lối gọi đều chạy.

### 1.5 Kiểm cả in 1 tem và in hàng loạt — chỉ có MỘT đường in

Tôi soát toàn repo: `window.print()` xuất hiện **đúng 1 lần**, trong
`inTemNhieu()` (`app.js:4427`). Cả 3 lối gọi đều đi qua nó:

| Lối gọi | Dòng | Trường hợp |
|---|---|---|
| `if (ds.length) inTemNhieu(ds)` | `app.js:4090` | In **hàng loạt** |
| `if (inTemSauKhiLuu) inTemNhieu([...])` | `app.js:4233` | In **1 tem** sau khi lưu |
| `$('#tsCtNutInTem')...inTemNhieu([tsDangXem])` | `app.js:4370` | In **1 tem** từ chi tiết |

**Không có đường in thứ hai bị bỏ sót.** Vá một chỗ là che hết.

### 1.6 Kiểm thêm: khối tem có tổ tiên nào mang `hidden` không?

Nếu `#tsInTemVung` nằm trong một `<section class="view" hidden>` thì luật mới sẽ
giết cả nhánh, gỡ `hidden` cho riêng nó cũng vô ích. **Không phải vậy**: trước
dòng 1734 của `app.html` có 9 thẻ `<section>` mở và 9 thẻ đóng — khối tem nằm ở
cấp cao nhất, không có tổ tiên nào mang `hidden`. Bản in thật ở mục 1.3 xác nhận.

> **Phán quyết mục 1: ĐẠT.** Đường in tem đã hết phụ thuộc vào việc CSS đè
> `[hidden]`. Lời khai của Khỉ Đột (227×151, mã tài sản hiện, 2 tem) là **đúng**.

---

## 2. `afterprint` CÓ ĐÁNG TIN KHÔNG? — **KHÔNG CẦN nó đáng tin**

Câu hỏi: người dùng bấm Huỷ hộp thoại in, hoặc Safari/iOS không bắn
`afterprint` — thì `hidden` có kẹt ở trạng thái đã gỡ không, và khối tem có lòi
ra giữa màn hình ERP không?

**Đo thật, kịch bản xấu nhất: cho `afterprint` KHÔNG BAO GIỜ bắn.**

| Bước | `hidden` | `display` | Kích thước | Nhìn thấy được? |
|---|---|---|---|---|
| 0. Lúc nạp trang | có | `none` | 0×0 | **Không** |
| 1. Đã gỡ `hidden`, hộp thoại in đang mở | **không** | `none` | 0×0 | **Không** |
| 2. `afterprint` **không bắn** — kẹt ở trạng thái đã gỡ | **không** | `none` | 0×0 | **Không** |
| 3. Sau khi `afterprint` bắn | có | `none` | 0×0 | Không |

Con tem bên trong đo được `display: flex` nhưng **chiều cao 0** vì tổ tiên đã
`display:none`.

**Vì sao an toàn**: `hidden` **không phải** thứ giữ khối tem ẩn lúc xem thường.
Thứ giữ nó ẩn là `.ts-in-tem-vung { display: none; }` (`style.css:2122`) — luật
này áp cho màn hình, **không quan tâm** có `hidden` hay không. `hidden` chỉ là
lớp thứ hai. Nên `afterprint` có bắn hay không **cũng không ai thấy gì**.

Chú thích trong code đã nói đúng điều này. **Lời khai khớp hành vi đo được.**

**Kiểm thêm — in 5 lần liên tiếp mà `afterprint` không bắn**: các listener có
cộng dồn (6 cái sau 6 lần in), nhưng tất cả làm đúng một việc giống hệt nhau và
`{ once: true }` sẽ dọn sạch khi có một lần `afterprint` bắn. **Vô hại.** Ghi ở
mục 9 là lỗi mức THẤP, không chặn phát hành.

---

## 3. `[hidden] { display: none !important }` — QUÉT LẠI ĐỘC LẬP

### 3.1 Cách quét — và cái bẫy tôi phải tự tránh

Khỉ Đột tự khai đã dính bẫy **CSS Nesting**: duyệt đệ quy kiểu
`if (r.cssRules) {…} else {…}` sẽ nuốt sạch mọi luật thường, vì trình duyệt đời
mới cho **mọi** `CSSStyleRule` một `cssRules` rỗng.

Tôi viết bộ duyệt riêng, tránh đúng bẫy đó: **đọc `r.style` trước cho mọi luật**,
chỉ đệ quy khi `r.cssRules.length` thật sự `> 0`, và duyệt cả `CSSMediaRule`,
`CSSSupportsRule`, `CSSContainerRule`, `CSSLayerBlockRule` lẫn luật lồng trong
`CSSStyleRule`.

### 3.2 Số đo của tôi — trùng khít số Khỉ Đột khai

| Chỉ số | Khỉ Đột khai | **Hồ Ly đo lại** |
|---|---|---|
| Tổng số luật CSS duyệt được | — | 520 |
| Luật có đặt `display` | 137 | **137** ✅ |
| Luật có thể **làm hiện** phần tử | 104 | **104** ✅ |
| Trong đó nằm trong media query | 5 | **5** ✅ |
| Trúng phần tử đang mang `hidden` | 1 | **1** ✅ |

Năm luật trong media query, liệt kê đầy đủ:

| Điều kiện | Luật | Trúng phần tử mang `hidden`? |
|---|---|---|
| `print` | `.ts-in-tem-vung → block` | **CÓ** ← thủ phạm duy nhất, đã xử lý ở mục 1 |
| `(hover:none) and (pointer:coarse)` | `.gy-anh-dienthoai → block` | Không |
| `(max-width:780px)` | `.kv-card-list → flex` | Không |
| `(max-width:780px)` | `.burger → grid` | Không |
| `(max-width:780px)` | `.qt-thaotac button → block` | Không |

**Khỉ Đột nói còn đúng 1 chỗ và đã xử lý — xác nhận ĐÚNG. Không có chỗ nào khác.**

### 3.3 Kiểm ba đường rò khác mà luật `!important` có thể phá

`!important` trong stylesheet **thắng cả inline style**. Nên tôi soát thêm:

1. **`style.display` trong JS**: 0 chỗ trong toàn bộ `app.js`, `api.js`, `data.js`,
   `qrcode-lib.js`, `sw.js`.
2. **`style.cssText` có chứa `display`**: **3 chỗ** (`app.js:1210, 3799, 3892`).
   Cả 3 đều là `<div>` **vừa được tạo mới** rồi `appendChild` vào danh sách —
   **không bao giờ mang `hidden`**. An toàn. *(Xem mục 9 `G-01`: câu "0 chỗ"
   trong REV-0003 nói về `style.display`, không kể `style.cssText` — nên chỉnh
   câu chữ.)*
3. **Thẻ vừa có inline `display` vừa có `hidden`**: 0 chỗ trong `app.html`,
   0 chỗ trong mọi template `innerHTML` của `app.js`.
4. **Thư viện ngoài**: `qrcode-lib.js` dùng `hidden` 0 chỗ, `style.display` 0 chỗ.
   `html5-qrcode.min.js` **thậm chí không được nạp** trong `app.html`.
5. **Code đo kích thước phần tử lúc đang `hidden`** (giờ sẽ ra 0): toàn `app.js`
   chỉ có 3 chỗ đo (`app.js:471, 2428, 2462`). Chỗ 471 đặt `panel.hidden = false`
   **trước** khi đo, và đo trigger luôn hiện. Hai chỗ kia là khung cuộn chat, nằm
   trong `.cnb-popup` vốn **đã có** `.cnb-popup[hidden]` từ trước — hành vi không đổi.

### 3.4 Quét cả `reset.html`, trang đăng nhập và mọi HTML khác trong `public/`

`public/` có đúng 3 file HTML: `app.html`, `index.html` (đăng nhập + đổi mật
khẩu), `reset.html`. Đã đo cả 3 (xem mục 4 và 6).

---

## 4. CON SỐ 14 → 0 — **XÁC NHẬN**

### 4.1 Cách đo (BH-02)

`<iframe srcdoc>` cách ly hoàn toàn: nạp nguyên `app.html`, gỡ hết `<script>`,
chèn `<base>` trỏ về đúng cây cần đo để **chỉ có đúng một** `style.css` được nạp.
CSS của trang chủ không lọt vào được vì iframe là tài liệu riêng. Chờ tới khi
`style.css` thật sự nạp xong (`cssRules.length > 50`) rồi mới đọc
`getComputedStyle().display` của **mọi** phần tử `[hidden]`.

### 4.2 Số đo

| Cây | File | Phần tử mang `hidden` | **Còn lỗi** |
|---|---|---|---|
| `3af0c23` (trước CTL-0008) | `app.html` | 201 | **13** |
| `3af0c23` | `index.html` | 1 | 0 |
| `3af0c23` | `reset.html` | 0 | 0 |
| **`7b3e6c0` (sau vòng 2)** | `app.html` | 201 | **0** ✅ |
| **`7b3e6c0`** | `index.html` | 1 | **0** ✅ |
| **`7b3e6c0`** | `reset.html` | 0 | **0** ✅ |

### 4.3 Vì sao tôi ra 13 mà Khỉ Đột ra 14 — và **Khỉ Đột đúng**

Phép đo tĩnh của tôi chỉ thấy phần tử mang `hidden` **sẵn trong HTML**. Tôi quét
tiếp **97 id mà `app.js` có đặt `.hidden`**, bật `hidden` cho từng cái rồi đo lại
trên cây `3af0c23`. Kết quả: 9 phần tử lỗi, trong đó **đúng 1 phần tử không có
`hidden` sẵn trong HTML**:

> **`#dln-kho-form`** (`.form-luoi`) — `app.js:3904` đặt `hidden = true` lúc chạy
> cho người **không phải admin**. Đo được `display: grid`, tức là form kho vẫn
> hiện với người không có quyền.

**13 tĩnh + 1 lúc chạy = 14.** Con số của Khỉ Đột **đầy đủ hơn** phép đo tĩnh của
tôi. Ghi nhận — bảng "14" trong REV-0003 là đúng.

### 4.4 Phép đo tận cùng trên bản sau sửa

Bật `hidden` cho **toàn bộ 97 id mà JS thật sự đụng tới**: **0 phần tử còn lỗi.**

Tôi còn thử ép `hidden` lên **cả 1.960 phần tử** trong tài liệu. Ra 92 phần tử
"còn lỗi" — nhưng **tất cả đều là thẻ SVG** (`<svg>`, `<path>`, `<circle>`), và
đây là **hiện tượng của phép đo, không phải lỗi sản phẩm**: thuộc tính `hidden`
chỉ có trên `HTMLElement`, nên `svgEl.hidden = true` **không sinh ra thuộc tính**
(tôi kiểm riêng: `svg.hasAttribute('hidden')` → `false`, `svg.matches('[hidden]')`
→ `false`). Code thật không bao giờ đặt `.hidden` lên thẻ SVG. **Không phải lỗi,
không liên quan bản vá này.**

> **Phán quyết mục 4: 14 → 0 XÁC NHẬN.**

---

## 5. FIX-02 (phím Esc) — **SỬA ĐÚNG, KHÔNG SINH LỖI MỚI**

Dựng DOM thật từ `app.html` + CSS thật, rồi **nạp nguyên văn** khối listener
(`app.js` dòng 987–1037) trích theo số dòng — **không gõ lại**, để không có sai
lệch chép tay.

| Ca | `dangOTrong` | Panel sau khi Esc | Con trỏ trước → sau | Đạt |
|---|---|---|---|---|
| **E1** Con trỏ **trong** panel (ô ghi chú) | `true` | **ĐÓNG** | `thdGhiChu` → **`thdNut`** | ✅ |
| **E2** Con trỏ **ngoài** panel (ô nhập giữa màn hình) | `false` | **ĐÓNG** | `oThuGiuaManHinh` → **giữ nguyên** | ✅ |
| **E3** Con trỏ trong ô nhập của **modal khác đang mở** | `false` | **ĐÓNG** | `tsSuaTen` → **giữ nguyên** | ✅ |
| **E3b** Modal khác có bị Esc đóng lây không | — | — | **Vẫn mở** | ✅ |
| **E0** Esc khi panel **đang đóng** | — | vẫn đóng | **không bị cướp con trỏ** | ✅ |

**Đúng lỗi vòng 1 đã nêu**: trước đây Esc giật con trỏ về Sidebar dù đang gõ dở
ở giữa màn hình. Nay E2 và E3 giữ nguyên con trỏ. **Sửa đúng, không sinh lỗi mới.**

> **Ghi chú về phương pháp — tôi suýt báo sai.** Lần chạy đầu, 3 ca Esc báo
> "không đạt". Truy ra là **bàn thử của tôi hỏng**, không phải code hỏng: ô nhập
> tôi chọn làm "ngoài panel" nằm trong một view còn ẩn nên không nhận được con
> trỏ, và trạng thái rò giữa các ca. Làm lại, đặt lại trạng thái sạch từng ca và
> đo thẳng biến `dangOTrong` thì cả 5 ca đều đạt. **Số đo vô lý thì nghi phép đo
> trước, đừng vội kết tội code** (xem `BH-17` mới thêm).

---

## 6. FIX-04 (bỏ `stopPropagation`) — **KHÔNG HẬU QUẢ, CÒN SỬA ĐƯỢC LỖI NGẦM**

Bỏ 2 lệnh `stopPropagation` nghĩa là click bên trong popover **giờ rò ra** các
listener cấp `document`. Tôi liệt kê **toàn bộ** listener cấp `document`/`window`
trong `app.js` rồi xét từng cái:

| Dòng | Listener làm gì | Ảnh hưởng khi click trong popover |
|---|---|---|
| `563` | Đóng mọi combobox `.combo1` đang mở | **Đóng combobox** — đúng hành vi mong muốn |
| `2529` | Đóng popup chat khi click ra ngoài | **Đóng popup chat** — đúng hành vi |
| `3242` | Chỉ phản ứng với `[data-gyxem]` | **Không ảnh hưởng** — popover không có nút đó |
| `3716` | Đóng panel thông báo | **Đóng panel thông báo** — đúng hành vi |

**Không listener nào đóng chính `#thdPanel`** — việc đó do `pointerdown` +
`closest('#thdWrap')` lo (`app.js:1023`).

Ngược lại, đây là **cải thiện**: trước kia `stopPropagation` chặn oan, nên bấm
vào popover Trạng thái thì combobox / popup chat / panel thông báo **kẹt mở**.
Nay chúng đóng đúng.

Đo lại hành vi bật/tắt sau khi bỏ `stopPropagation` — **không hồi quy**:

| Ca | Kỳ vọng | Đo được |
|---|---|---|
| Lúc nạp trang | Đóng | Đóng ✅ |
| Bấm nút lần 1 | Mở | Mở ✅ |
| Bấm nút lần 2 (bật/tắt) | Đóng | Đóng ✅ |
| Bấm vào ô trong panel | Vẫn mở | Mở ✅ |
| Bấm ra ngoài | Đóng | Đóng ✅ |
| Click trong panel có tới được `document` | Có | **Có** ✅ |

---

## 7. ĐỀ XUẤT B (6 dòng CSS) — **KHÔNG DÒNG NÀO QUÁ RỘNG**

| Dòng | Luật | Số phần tử khớp | Ăn nhầm gì không |
|---|---|---|---|
| `791` | `.mt-daxong-toggle[hidden]` | 3 | Không |
| `911` | `.stats[hidden]` | 4 (1 mang `hidden`) | Không |
| `1246` | `.tb-badge[hidden]` | 2 | Không |
| `1438` | `.chat-file-dinhkem[hidden]` | 1 | Không |
| `1515` | `.kd-thanh-chon[hidden]` | 4 | Không |
| `1844` | `.form-luoi[hidden]` | 22 (1 tĩnh + `#dln-kho-form` lúc chạy) | Không |

**Vì sao không thể ăn nhầm**: mọi luật đều có dạng `.X[hidden]` — chỉ áp cho phần
tử **đang tự khai báo là bị ẩn**. Ẩn một phần tử đã mang `hidden` chính là định
nghĩa của `hidden`. Rủi ro bằng 0. Phép đo mục 4 xác nhận: 201 phần tử `[hidden]`
đều `display:none`, **không phần tử nào bị ẩn oan**.

Lưu ý kỹ thuật (không phải lỗi): sau khi có chốt toàn cục ở `style.css:23`, 6 dòng
này **về mặt chức năng là thừa**. Giữ lại là **cố ý đúng** — hai lớp bảo vệ, và
chú thích tại chỗ giúp người sau hiểu vì sao. Đúng thông lệ repo (Rule 5).

---

## 8. HỒI QUY TRANG ĐĂNG NHẬP & ĐỔI MẬT KHẨU — **XÁC MINH, KHÔNG HỒI QUY**

Trang `index.html` chứa cả đăng nhập lẫn đổi mật khẩu. Đo **song song hai bản**
trong iframe cách ly:

| Phép đo | `3af0c23` (trước) | **`7b3e6c0` (sau)** |
|---|---|---|
| `#khoiDangNhap` lúc đầu | `block` | `block` |
| `#khoiDoiMatKhau` lúc ẩn | `none` | `none` |
| `#khoiDangNhap` sau khi ẩn | `none` | `none` |
| **`#khoiDoiMatKhau` sau khi hiện** | `block` | **`block`** ✅ |
| `#loi` lúc chưa báo | `none` | `none` |
| **`#loi` sau khi `.classList.add('show')`** | `block` | **`block`** ✅ |
| **`#loiDoi` sau khi báo** | `block` | **`block`** ✅ |

**Giống nhau từng chỉ số.** Lý do bản chất: hai ô báo lỗi (`#loi`, `#loiDoi`)
**không mang `hidden`** — chúng dùng class `.show`, nên luật mới không đụng tới.
Còn `#khoiDoiMatKhau` bật/tắt bằng `.hidden = false` — đúng cơ chế, luật mới
không cản.

`reset.html` **không dùng `hidden`, không dùng `.show`** — không thể bị ảnh hưởng.

**`sw.js` không cache gì** (xoá sạch `caches.keys()` lúc `activate`, `fetch`
handler rỗng) — người dùng sẽ nhận bản mới, không kẹt bản cũ.

---

## 9. DANH SÁCH LỖI — **KHÔNG MỤC NÀO CHẶN PHÁT HÀNH**

### `G-01` · **THẤP** · `docs/reviews/REV-0003-…md` mục 6

Câu *"`app.js` dùng `style.display` **0 chỗ**"* đúng theo nghĩa đen, nhưng có
**3 chỗ** dùng `style.cssText` chứa `display:flex` (`app.js:1210, 3799, 3892`)
mà câu đó không nhắc. **Tôi đã kiểm cả 3 — đều an toàn** (div tạo mới, không bao
giờ mang `hidden`).

*Vì sao vẫn nên chỉnh*: đây là tài liệu người sau tra cứu để biết luật `!important`
có an toàn không. Câu "0 chỗ" dễ ru ngủ người sau bỏ qua `style.cssText`.
**Đề nghị**: đổi thành *"`style.display` 0 chỗ; `style.cssText` có `display` 3 chỗ,
đều trên phần tử tạo mới không mang `hidden`"*.

**Chặn phát hành: KHÔNG.** Đây là câu chữ trong tài liệu, không phải code.

### `G-02` · **THẤP** · `public/assets/js/app.js:4455`

Mỗi lần in lại thêm một listener `afterprint`. Nếu `afterprint` không bắn (huỷ
hộp thoại, Safari/iOS), listener cộng dồn — đo được 6 cái sau 6 lần in.

*Vì sao không nghiêm trọng*: tất cả làm đúng một việc giống hệt nhau
(`vungTem.hidden = true`), chạy bao nhiêu lần cũng cho cùng kết quả, và
`{ once: true }` dọn sạch ngay khi có một lần `afterprint` bắn. Mục 2 đã chứng
minh trạng thái kẹt **không lộ gì ra màn hình**.

**Đề nghị (không bắt buộc)**: gỡ listener cũ trước khi gắn mới, hoặc dùng một
listener cấp phiên. Có thể để lại cho đợt sau.

**Chặn phát hành: KHÔNG.**

### `G-03` · **THÔNG TIN** · phát hành

`style.css` và `app.js` **không gắn tham số phiên bản**, và repo **không có
`public/_headers`**. Về lý thuyết có kịch bản xấu: trình duyệt lấy **CSS mới +
JS cũ** → tem in ra giấy trắng. Thực tế rủi ro thấp vì Cloudflare Assets mặc
định trả `must-revalidate` và `sw.js` không cache gì, nên hai file cùng được
kiểm mới mỗi lần nạp trang.

**Tôi không xác minh được header production trực tiếp** (chỉ chạy được ở máy).
Nói rõ ra để không khai suông (BH-03).

**Đã được bao bởi ADR-0009 điều 5** — deploy xong Gạo tự kiểm lại trên hệ thống
thật. Chỉ cần thêm một động tác: **kiểm bằng cách tải lại cứng (Ctrl+Shift+R)
rồi bấm In tem một lần.**

**Chặn phát hành: KHÔNG.**

---

## 10. RULE 13 (One Writer Per Area) — **ĐẠT, XÁC MINH BẰNG DIFF**

`git diff 3af0c23..7b3e6c0 -- public/` **không có một dòng thêm/bớt nào** chứa
`gy-form`, `khoiDongGopY`, `gy-anh`, `gyAnh`. Vùng GY-0001 nguyên vẹn.

Cả đợt chỉ chạm 3 file: `style.css`, `app.js`, `REV-0003-…md`. Các vùng sửa trong
`app.js`: `982-995`, `1018-1037`, `4439-4456` — không vùng nào thuộc GY-0001.

### Bối cảnh cần Gạo biết (KHÔNG thuộc CTL-0008, không chặn)

- **CTL-0011 đang được rebase lên đúng `7b3e6c0`** — tức là xếp nối tiếp đúng
  BH-11, không tách từ `main`. Đúng luật, ghi nhận.
- Trong lúc rebase có **một xung đột ở `style.css`** rơi đúng vùng
  `.chat-file-dinhkem`. Lúc tôi xem lại thì đã được giải theo hướng **giữ cả
  hai** — dòng `.chat-file-dinhkem[hidden]` của CTL-0008 còn nguyên, phần
  `.chat-file-hinh` của CTL-0011 thêm vào kèm chú thích nhắc lại đúng cái bẫy này.
  **Giải đúng.** Nhưng đó là việc của CTL-0011 và **phải được review riêng** —
  bản này không nghiệm thu thay.
- **Đẩy `7b3e6c0` lên `main` sẽ mang theo cả GY-0001** (`3af0c23`), vì `main`
  đang ở `5d6b3a1`. Đúng phạm vi ADR-0009, nhưng nói rõ để Gạo không bất ngờ.

---

## 11. ĐỐI CHIẾU ĐIỀU KIỆN ADR-0009

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Hồ Ly review trả `PASS` | ✅ **PASS** |
| 2 | Không còn lỗi **CAO** hay **TRUNG BÌNH** | ✅ Chỉ còn 2 lỗi THẤP + 1 thông tin |
| 3 | **In tem in ra thật, có bằng chứng**, trước và sau khi thêm `!important` | ✅ Mục 1 — PDF thật, có cả ca đối chứng |
| 4 | Không migration, không đụng dữ liệu | ✅ Chỉ 2 file giao diện |
| 5 | Deploy xong Gạo tự kiểm lại | ⏳ Việc của Gạo — thêm bước ở `G-03` |
| 6 | Báo Sếp: lên cái gì + câu lệnh lùi | ⏳ Việc của Gạo |

**Bốn điều kiện thuộc quyền tôi kiểm: ĐỦ CẢ BỐN.**

---

## 12. GHI NHẬN KHỈ ĐỘT

- **Bốn lỗi vòng 1 đều sửa thật, không khai suông.** Tôi kiểm từng cái:
  FIX-01 câu sai đã gỡ khỏi tài liệu; FIX-02 đo đủ 5 ca đều đạt; FIX-04 bỏ đúng
  2 lệnh và không sinh hậu quả.
- **FIX-03 sửa tới nơi tới chốn.** Tôi đối chiếu **toàn bộ** cột số dòng mục 2.3
  với file thật: **18/18 dòng `app.html`** trúng chính xác thẻ modal,
  **11/11 dòng `app.js`** trúng chính xác handler bấm-ra-ngoài, và **8/8 số dòng
  vòng 2** (`style.css:23, 655, 791, 911, 1246, 1438, 1515, 1844`) đều chính xác
  tuyệt đối. Không còn lệch +14.
- **Làm A1 đúng thứ tự ADR-0008 bắt buộc** — sửa `inTemNhieu()` trước, thêm
  `!important` sau. Bản đối chứng ở mục 1.2 chứng minh nếu đảo thứ tự thì đã hỏng.
- **Tự khai 2 lỗi phương pháp của chính mình** (đo trên trang đã nạp CSS; đệ quy
  bị CSS Nesting nuốt) và ghi lại thành hướng dẫn cụ thể trong REV-0003 mục 6.
  Đây là hành vi đáng giữ: **tự tố cáo phương pháp của mình khó hơn nhiều so với
  giấu đi**, và nó vừa giúp tôi tránh đúng cái bẫy đó khi quét lại.

### Trả lời câu hỏi 10 — REV-0003 mục 6 có đủ rõ cho người sau không?

**ĐỦ RÕ.** Mục 6 không viết lời khuyên chung chung, mà nêu **mẫu code sai cụ thể**
(`if (r.cssRules) { đệ quy } else { đọc r.style }`), **hậu quả cụ thể** ("quét ra
0 luật mà không báo lỗi gì, trong khi thực tế có 137"), và **cách đúng cụ thể**
("đọc `r.style` trước cho mọi luật; chỉ đệ quy khi `length > 0` thật sự"), kèm
5 bước dựng iframe cách ly. Bằng chứng nó đủ rõ: **tôi làm theo và ra đúng
137/104/5/1 trùng khít.**

Một chỗ nên chỉnh nhỏ: xem `G-01`.

---

## 13. PHỤ LỤC — CÁCH ĐO, ĐỂ NGƯỜI SAU LẶP LẠI ĐƯỢC (BH-03)

1. **Trích bản cần đo mà không đụng cây làm việc của người khác**:
   `git archive 7b3e6c0 public -o t.tar` rồi giải nén ra thư mục riêng. Làm cả
   với `3af0c23` để có bản đối chiếu.
2. **Phục vụ qua server tĩnh cục bộ** (Node, cổng 8899) để `fetch` được cả hai cây.
3. **Đo cascade CSS**: `<iframe srcdoc>` chứa nguyên `app.html` đã gỡ hết
   `<script>` + `<base href>` trỏ về cây cần đo → chỉ đúng một `style.css` được
   nạp. Chờ `cssRules.length > 50` rồi mới đọc `getComputedStyle`.
4. **Đo hành vi JS**: cùng iframe đó, `eval` **nguyên văn** khối listener trích
   theo số dòng từ `app.js` thật — không gõ lại.
5. **Đo đường in**: `chrome --headless --print-to-pdf`, rồi giải nén stream trong
   PDF đếm **lệnh vẽ chữ `Tj`/`TJ`** và đọc `/MediaBox`. Số 0 = giấy trắng.
6. **Luôn in kèm ca ĐỐI CHỨNG có lỗi cố ý** — nếu ca đối chứng cũng "đạt" thì
   phép đo hỏng, không phải code đúng.
