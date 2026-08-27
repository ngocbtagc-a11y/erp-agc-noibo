# REV-0004 — Soi lại CTL-0008 "Cửa sổ Trạng thái của tôi không tự đóng"

- **Request**: CTL-0008
- **Người soi**: HỒ LY (Agent A — QA / Red Team / Review Gate)
- **Ngày**: 2026-08-27
- **Nhánh soi**: `feature/dong-cua-so` @ `515f135` (tách từ `feature/gopy-paste-anh` @ `3af0c23`)
- **Đối tượng soi**: 3 file, +282/−1 — trong đó code thật chỉ 2 chỗ:
  `public/assets/css/style.css` (+8), `public/assets/js/app.js` (+16/−1),
  còn lại là `docs/reviews/REV-0003-ra-soat-dong-cua-so.md` (+259).
- **Bản rà bị soi**: `docs/reviews/REV-0003-ra-soat-dong-cua-so.md` (Khỉ Đột nộp)

> **Kết luận ngắn**: Code sửa CTL-0008 **đúng gốc, đúng tầng, không hồi quy**.
> Nhưng **Đề xuất A trong REV-0003 có một khẳng định SAI về an toàn** — nếu Sếp
> duyệt theo đúng như Khỉ Đột viết thì **tem tài sản 60×40mm sẽ in ra giấy trắng**.
> Phải sửa bản đề xuất trước khi trình Sếp.

---

## 1. XÁC MINH NGUYÊN NHÂN GỐC — **XÁC NHẬN ĐÚNG**

Không tin lời khai. Đo lại độc lập trên Chrome thật qua `wrangler dev`
(`127.0.0.1:8787`), nạp đúng `style.css` thật.

### Cách đo của Hồ Ly (khác cách Khỉ Đột, để không lặp lại sai lầm giống nhau)

Khỉ Đột đo bằng cách nhét `app.html` vào **trang đang mở**. Cách đó có lỗ hổng:
trang login **đã nạp sẵn `style.css`**, nên CSS "bản trước sửa" mà Khỉ Đột dựng
lên bị CSS thật của trang đè lên — phép so sánh trước/sau có nguy cơ vô nghĩa.
(Hồ Ly đã dính đúng cái bẫy này ở lần đo đầu: cả "trước sửa" lẫn "sau sửa" đều
ra `none`, tức là phép đo hỏng chứ không phải code đúng.)

Hồ Ly đo lại trong **`<iframe srcdoc>` cách ly hoàn toàn**, chỉ có đúng một
`<style>` là bản CSS cần thử, không có gì khác lẫn vào.

### Số đo — bản TRƯỚC sửa so với bản SAU sửa

| Class (mang thuộc tính `hidden`) | Trước sửa | Sau sửa | |
|---|---|---|---|
| **`.thd-panel`** | **`flex`** | **`none`** | ✅ đã sửa xong |
| `.tb-badge` | `flex` | `flex` | ❌ còn lỗi |
| `.stats` | `grid` | `grid` | ❌ còn lỗi |
| `.mt-daxong-toggle` | `flex` | `flex` | ❌ còn lỗi |
| `.chat-file-dinhkem` | `flex` | `flex` | ❌ còn lỗi |
| `.kd-thanh-chon` | `flex` | `flex` | ❌ còn lỗi |
| `.form-luoi` | `grid` | `grid` | ❌ còn lỗi |
| `.cnb-popup` · `.modal-nen` · `.view` · `.combo1-panel` · `.kv-pane` · `.form-ok` · `.empty` · `.btn-phu` · `.panel` · `.tb-panel` | `none` | `none` | ✅ vốn đã đúng |

**Kết luận: nguyên nhân gốc Khỉ Đột khai là ĐÚNG, đã được đo lại độc lập.**
`.thd-panel { display: flex }` (style.css:624) đè mất luật mặc định của trình
duyệt `[hidden] { display: none }`, nên `$('#thdPanel').hidden = true` trong
`app.js` **chạy thành công nhưng không ẩn được gì**. Đây là lỗi CSS, không phải
lỗi JS. Bốn giả thuyết ban đầu của GẠO đều bị loại đúng.

### Kiểm chéo một điểm Khỉ Đột suýt bỏ sót — nhưng hoá ra đúng

`app.html` có **3 phần tử** vừa mang `hidden` vừa mang `.mt-the-grid`
(`display: grid`, style.css:755) — dòng 183, 192, 201. Thoạt nhìn là 3 lỗi
REV-0003 bỏ quên. **Đo lại: `none` — không phải lỗi.** Vì 3 phần tử đó mang
kèm class `.mt-daxong-list`, mà `.mt-daxong-list[hidden]` (style.css:772) có
độ ưu tiên (0,2,0) thắng `.mt-the-grid` (0,1,0). **REV-0003 loại đúng.**

---

## 2. ĐÁNH GIÁ RIÊNG — `[hidden] { display: none !important }`

# ⚠️ **CÓ RỦI RO — KHÔNG ĐƯỢC ÁP DỤNG NGUYÊN VĂN**

Đây là câu quan trọng nhất của bản soi này.

REV-0003 mục "Đề xuất A" viết:

> *"Rủi ro: `!important` là toàn cục — nếu đâu đó đang **cố tình** vừa đặt
> `hidden` vừa muốn phần tử hiện (**không tìm thấy chỗ nào như vậy**, nhưng
> phải soát lại 211 phần tử một lượt nữa)."*

**Khẳng định "không tìm thấy chỗ nào như vậy" là SAI. CÓ đúng một chỗ như vậy,
và nó là tính năng Sếp đã chốt.**

### Phần tử sẽ hỏng: `#tsInTemVung` — Tem in tài sản 60×40mm

| Nơi | Nội dung |
|---|---|
| `public/app.html:1734` | `<div id="tsInTemVung" class="ts-in-tem-vung" hidden>` ← **mang `hidden` cố định trong HTML** |
| `public/assets/css/style.css:2078` | `.ts-in-tem-vung { display: none; }` (ẩn lúc xem thường) |
| `public/assets/css/style.css:2101-2103` | `@media print { .ts-in-tem-vung { display: block; ... } }` ← **chỉ có dòng này làm tem hiện ra lúc in** |
| `public/assets/js/app.js:4419-4431` | `inTemNhieu()` đổ HTML tem vào `#tsTemMauDon` rồi gọi `window.print()` — **KHÔNG hề gỡ `hidden`** |

Nghĩa là hiện nay tem in được **chính nhờ cái cơ chế mà CTL-0008 gọi là bug**:
luật CSS của trang (`@media print { display: block }`) thắng luật mặc định
`[hidden] { display: none }` của trình duyệt.

Thêm `!important` toàn cục → luật `display: block` trong `@media print`
(không có `!important`) **thua** → tem biến mất khỏi bản in.

### Số đo trong Chrome thật

Dựng `#tsInTemVung` với đúng `style.css` thật trong iframe cách ly, rồi áp các
luật trong khối `@media print` để mô phỏng lúc in:

| | Lúc xem trên màn hình | **Lúc in** |
|---|---|---|
| **Hiện tại (chưa có `!important`)** | `none` | **`block`** ✅ tem in ra |
| **Nếu thêm `[hidden]{display:none!important}`** | `none` | **`none`** ❌ **tem KHÔNG in ra** |

**Hậu quả thực tế**: bấm "In tem" → máy in tem nhả ra **giấy trắng khổ 60×40mm**,
không có mã tài sản, không có QR. Và **không ai báo lỗi** — không có thông báo,
không có log, JS chạy thành công. Kho sẽ dán tem trắng lên tài sản, hoặc in đi
in lại tưởng máy hỏng. Đây đúng là loại lỗi tệ nhất: **hỏng im lặng**.

### Hồ Ly đã quét thật, không suy đoán

Không đếm tay 211 phần tử. Cách làm: đọc `document.styleSheets` của `style.css`
thật trong trình duyệt, duyệt **đệ quy cả các khối `@media`**, lọc ra
**toàn bộ 130 luật CSS có đặt `display`**, rồi giữ lại những luật có thể **LÀM
HIỆN** một phần tử (`display` khác `none`). Kết quả:

| Luật có thể làm hiện phần tử | Bối cảnh | Phần tử có mang `hidden` không? |
|---|---|---|
| `.ts-in-tem-vung` | `@media print` | **CÓ** ← **thủ phạm duy nhất** |
| `.gy-anh-dienthoai` | `@media (hover:none) and (pointer:coarse)` | Không |
| `.kv-card-list` | `@media (max-width:780px)` | Không |
| `.burger` | `@media (max-width:780px)` | Không |
| `.qt-thaotac button` | `@media (max-width:780px)` | Không |
| `.login-error.show` | mặc định | Không |
| `.overlay.show` | mặc định | Không |
| `.form-loi.show` | mặc định | Không |

Kiểm thêm 3 đường khác có thể sinh rủi ro, **đều sạch**:

1. **`element.style.display` trong JS** (inline style **thua** `!important`):
   `public/assets/js/app.js` có **0 chỗ** dùng `style.display`.
2. **Thư viện ngoài**: `html5-qrcode.min.js` và `qrcode-lib.js` **không hề dùng**
   thuộc tính `hidden` (0 chỗ đặt/gỡ). Chúng chỉ dùng `style.display` trên DOM
   tự tạo — không giao với `[hidden]`.
3. **JS đặt `hidden` lên các phần tử được media query làm hiện**: 0 chỗ.
   Và không có template `innerHTML` nào sinh ra phần tử vừa có `hidden` vừa có
   các class trên.

### Kết luận về Đề xuất A

**Đề xuất A KHÔNG an toàn như REV-0003 mô tả**, nhưng **vẫn cứu được** — chỉ cần
thêm một bước mà REV-0003 chưa nêu. Ba đường, xếp theo mức khuyến nghị:

| | Cách | Đánh giá |
|---|---|---|
| **A1** ✅ **nên chọn** | Sửa `inTemNhieu()` (`app.js:4430`) gỡ `hidden` trước khi in rồi đặt lại sau: `const v = $('#tsInTemVung'); v.hidden = false; window.print(); v.hidden = true;` — **rồi mới** thêm `[hidden]{display:none!important}` | Chữa đúng gốc: tem không còn phụ thuộc vào việc CSS đè `[hidden]`. Sau đó A an toàn thật. |
| A2 | Chừa ngoại lệ: `[hidden]:not(.ts-in-tem-vung) { display: none !important }` | Chạy được nhưng để lại đúng cái bẫy cho người sau. Không khuyến nghị. |
| A3 ❌ | Áp A nguyên văn như REV-0003 viết | **Hỏng tính năng in tem.** Cấm. |

---

## 3. CÁCH SỬA CÓ ĐÚNG TẦNG KHÔNG? — **ĐÚNG TẦNG**

Câu hỏi: sửa CSS phạm vi hẹp cho `.thd-panel` là **vá triệu chứng** hay **chữa gốc**?

**Chữa gốc.** Triệu chứng là "popover không đóng"; gốc là "`display: flex` đè
`[hidden]`". Dòng `.thd-panel[hidden] { display: none; }` xử lý đúng cái gốc đó,
không phải thêm lệnh đóng ở đâu cả. Số đo mục 1 xác nhận: `flex` → `none`.

**Còn 13 chỗ cùng bệnh thì vá lẻ có đúng không?** Có, trong phạm vi CTL-0008.
Bản giao việc (mục 5, Ràng buộc) yêu cầu rõ: chỉ sửa cái Sếp báo, phần còn lại
**báo cáo**, và hàm dùng chung là `CORE_CHANGE` phải Sếp duyệt trước.

**Quyết định DỪNG ở CORE_CHANGE: HỢP LÝ — và mục 2 đã chứng minh là đúng đắn.**
Nếu Khỉ Đột tự duyệt Đề xuất A rồi code luôn, tính năng in tem tài sản sẽ hỏng
im lặng mà không ai biết. Cổng CORE_CHANGE đã làm đúng việc của nó. Ghi nhận.

**Một điểm góp ý về cách trình đề xuất**: REV-0003 xếp **Đề xuất B** (thêm 6 dòng
`[hidden]` cho 6 class) vào cùng một cổng chờ duyệt với A và C. B **không phải**
CORE_CHANGE: nó đúng bằng thông lệ repo đang dùng, phạm vi hẹp, rủi ro gần bằng 0,
và **3 trong 13 lỗi còn lại đang cho người dùng thấy SỐ SAI** (badge thông báo,
badge chat, khung file đính kèm chat). Gộp B vào cùng cổng với A là **chặn quá tay** —
làm 3 lỗi mức CAO nằm chờ vô ích. Đề nghị tách: **duyệt B ngay, bác A3, cân nhắc A1.**

---

## 4. ĐỔI `click` → `pointerdown` — **KHÔNG HỒI QUY**

Dựng lại đúng DOM `#thdWrap` từ `app.html`, gắn đúng đoạn handler sau khi sửa,
bắn sự kiện thật trong Chrome. Đây là phép đo **độc lập** với 11 ca của Khỉ Đột.

| # | Tình huống | Mong đợi | Đo được |
|---|---|---|---|
| 0 | Lúc nạp trang | Đóng | Đóng ✅ |
| 1 | Chuột bấm pill | Mở | Mở ✅ |
| 2 | Chuột bấm pill lần 2 (bật/tắt) | Đóng | Đóng ✅ |
| 3 | Bấm vào ô bên trong panel | Vẫn mở | Mở ✅ |
| 4 | Bấm ra ngoài | Đóng | Đóng ✅ |
| 5 | **Bàn phím: Tab tới nút rồi Enter/Space** | Mở | **Mở ✅** |
| 6 | **Bàn phím: Enter lần 2** | Đóng | **Đóng ✅** |
| 7 | Esc khi đang trong panel | Đóng | Đóng ✅ |
| 8 | **Kéo-thả: bấm giữ trong panel, nhả chuột ra ngoài** | Vẫn mở | **Mở ✅** |

Trả lời từng câu hỏi Red Team:

- **Bàn phím có còn mở/đóng được không?** CÓ (ca 5, 6). Bàn phím kích hoạt
  `<button>` chỉ sinh sự kiện `click`, **không** sinh `pointerdown`, nên listener
  `pointerdown` trên `document` không bắn — nút bật/tắt nguyên vẹn.
- **`pointerdown` bắn trước `click`, có nuốt thao tác nào không?** KHÔNG. Handler
  chỉ đọc `e.target.closest('#thdWrap')` và đặt `hidden`, không gọi
  `preventDefault()` cũng không `stopPropagation()`. Ca 2 chứng minh chuỗi
  `pointerdown` → `click` không phá bật/tắt.
- **Kéo-thả bắt đầu trong panel, nhả ngoài → đóng nhầm?** KHÔNG (ca 8). Đây thực
  ra là **cải thiện** so với `click`: với `click` cũ, sự kiện bắn ở tổ tiên chung
  và sẽ đóng nhầm panel; `pointerdown` chỉ nhìn nơi **bắt đầu** bấm nên bôi đen
  chữ trong panel rồi nhả ra ngoài không còn làm mất panel nữa.
- **Trình duyệt cũ / iOS Safari có đủ `pointerdown` không?** CÓ. Pointer Events
  được Safari hỗ trợ từ **iOS 13 (2019)**, Chrome/Edge/Firefox từ lâu hơn. Với
  một PWA năm 2026 đây không phải rủi ro. Ngược lại, lý do đổi là **có thật**:
  trên iOS, `click` gắn ở `document` nổi tiếng là không bắn khi chạm vào vùng
  trống không phải phần tử tương tác — đúng giả thuyết 2 của GẠO.

---

## 5. PHÍM ESC — **CÓ 1 LỖI NHỎ**

- **Gắn listener trùng lặp mỗi lần mở?** KHÔNG. Cả hai listener
  (`pointerdown` và `keydown`) nằm ở **cấp cao nhất của `app.js`** (cột 0,
  ngay trước `const d = new Date();`), không nằm trong hàm mở panel nào cả →
  đăng ký **đúng một lần** cho cả phiên. Sạch.
- **Esc có nuốt thao tác của modal khác đang mở chồng lên không?** Thực tế KHÔNG.
  Handler có chốt `!$('#thdPanel').hidden` nên chỉ chạy khi popover đang mở; mà
  muốn mở một modal thì phải bấm chuột → `pointerdown` → popover đã đóng trước
  đó rồi. Không dựng được kịch bản chồng lấn bằng thao tác thường.
  Trước khi sửa, toàn `app.js` chỉ có **đúng 1** chỗ bắt Escape (`app.js:549`,
  ô gợi ý combobox) — nó là `tim.onkeydown` ở cấp phần tử, không giao tranh.
- **Lỗi tìm được**: xem `FIX-02` mục 7.

---

## 6. RULE 13 (One Writer Per Area) — **ĐẠT, ĐÃ XÁC MINH BẰNG DIFF**

`git diff 3af0c23..515f135` chỉ chạm **3 file**, trong đó code thật đúng 2 khối:

| File | Vùng | Có đụng GY-0001 không |
|---|---|---|
| `style.css` | 630-636 (kề `.thd-panel`) | Không |
| `app.js` | 1015-1029 (kề handler `#thd*`) | Không |
| `docs/reviews/REV-0003-…md` | file mới | Không |

Grep xác nhận diff **không chứa** `#gy-form`, `khoiDongGopY`, `.gy-anh-*`.
Vùng GY-0001 nguyên vẹn. ✅

---

## 7. RULE 5 (dùng lại thông lệ sẵn có) — **ĐẠT**

Repo đã có **8 chỗ** dùng đúng một khuôn `.X[hidden] { display: none; }`:

`.gy-anh-xem` (546) · `.gy-anh-tt` (562) · `.view` (721) · `.mt-daxong-list` (772) ·
`.combo1-panel` (1197) · **`.cnb-popup` (1276)** · `.modal-nen` (1857) ·
`.kv-pane` (1957) · `.form-ok` (1985)

Trong đó `.cnb-popup` (1276) có sẵn chú thích cảnh báo **đúng cái bẫy này**.
Dòng mới `.thd-panel[hidden] { display: none; }` (636) là **cùng khuôn, cùng chỗ
đặt (ngay dưới rule gốc), cùng kiểu chú thích**. **Không đẻ ra kiểu thứ hai.** ✅

Chú thích lần này dài 6 dòng so với 1 dòng của `.cnb-popup` — hơi rườm nhưng có
lý do (ghi lại mã request + ngày Sếp báo, tra ngược được). Không phải lỗi.

---

## 8. BẢNG RÀ SOÁT REV-0003 CÓ ĐÁNG TIN KHÔNG? — **NỘI DUNG ĐÁNG TIN, SỐ DÒNG THÌ KHÔNG**

Chọn ngẫu nhiên và kiểm lại 7 mục:

| # | Khỉ Đột khai | Hồ Ly kiểm | Kết quả |
|---|---|---|---|
| 1 | 14 phần tử lỗi, gom về 7 class; sau sửa còn 13 | Đo lại trong iframe cách ly: đúng 6 class còn lỗi (`tb-badge`, `stats`, `mt-daxong-toggle`, `chat-file-dinhkem`, `kd-thanh-chon`, `form-luoi`) + `.thd-panel` đã sạch | ✅ **ĐÚNG** |
| 2 | **Esc: 0/18 modal** | Grep toàn `app.js`: trước sửa chỉ có **1** chỗ bắt `Escape` — `app.js:549`, ô gợi ý combobox, không phải modal | ✅ **ĐÚNG** |
| 3 | **Bấm ra ngoài: 12/18**, thiếu ở `gyChiTiet`, `tsChiTiet`, `tsSua`, `tsQuet`, `mk`, `tsCapPhat` | Liệt kê độc lập cả 18 id `*ModalNen` trong `app.html` rồi dò handler `e.target === X` của từng cái: **12 có, 6 thiếu — trùng khớp từng cái một** | ✅ **ĐÚNG** |
| 4 | `sw.js` không cache gì | Đọc `public/sw.js`: `activate` xoá sạch `caches.keys()`, `fetch` handler rỗng không gọi `respondWith` | ✅ **ĐÚNG** |
| 5 | Badge thông báo `app.js:3667, 3680` | `3666-3667` là `badge.hidden = false/true`, `3680` là `badge.hidden = true` | ✅ **ĐÚNG** |
| 6 | `#tq-tomtat` tại `app.js:1580` | Đúng dòng 1580: `$('#tq-tomtat').hidden = false` | ✅ **ĐÚNG** |
| 7 | Bấm ra ngoài của `nsSuaModalNen` tại `app.js:2639`; của `kvModalNen` tại `app.js:5179` | Handler **có thật** nhưng ở dòng **2653** và **5193** — lệch đúng **+14** | ⚠️ **SỐ DÒNG SAI** |

**Phán quyết**: mọi **kết luận** của REV-0003 đều kiểm lại được và đều đúng —
bảng này **dùng để ra quyết định được**. Riêng cột số dòng thì trộn lẫn: một số
mục ghi theo file **trước** khi sửa, một số theo file **sau** khi sửa (bản vá
`app.js` cộng thêm đúng 14 dòng từ vị trí 1015 trở đi). Ai đọc bảng rồi nhảy
thẳng tới số dòng sẽ nhảy trượt. Xem `FIX-03`.

---

## 9. DANH SÁCH LỖI PHẢI SỬA

### `FIX-01` · **CAO** · `docs/reviews/REV-0003-ra-soat-dong-cua-so.md` mục 4, Đề xuất A

**Sai chỗ nào**: câu *"không tìm thấy chỗ nào như vậy"* là sai — có đúng một chỗ:
`#tsInTemVung` (`public/app.html:1734`) mang `hidden` cố định và **chỉ** hiện ra
nhờ `@media print { .ts-in-tem-vung { display: block } }`
(`public/assets/css/style.css:2101-2103`), trong khi `inTemNhieu()`
(`public/assets/js/app.js:4419-4431`) gọi `window.print()` mà **không gỡ `hidden`**.

**Vì sao nghiêm trọng**: đây là tài liệu Sếp sẽ đọc để **ra quyết định duyệt**.
Duyệt theo đúng như đang viết → tem tài sản 60×40mm in ra giấy trắng, **hỏng im
lặng**, không thông báo, không log. Tính năng này Sếp đã chốt 23/08/2026.

**Sửa thế nào**: cập nhật Đề xuất A — nêu rõ phần tử `#tsInTemVung` sẽ hỏng, kèm
số đo `block → none`, và đổi đề xuất thành **A1**: sửa `inTemNhieu()` gỡ `hidden`
trước khi in rồi đặt lại sau, **xong mới** thêm dòng `!important`. Ghi rõ áp A
nguyên văn là phương án bị **BÁC**.

### `FIX-02` · **THẤP** · `public/assets/js/app.js:1024-1029`

**Sai chỗ nào**: handler Esc luôn gọi `$('#thdNut').focus()`, không kiểm tra con
trỏ đang ở đâu.

**Vì sao sai**: panel không khoá focus. Người dùng mở panel rồi bấm `Tab` đi chỗ
khác thì panel **vẫn mở** (`Tab` không sinh `pointerdown`). Lúc đó bấm Esc ở bất
kỳ đâu — kể cả đang gõ dở một ô nhập liệu giữa màn hình — con trỏ **bị giật ngược
về nút trạng thái ở Sidebar**. Đã đo được trong Chrome: focus nhảy từ `#oKhac`
về `#thdNut`.

**Sửa thế nào**: chỉ trả focus khi con trỏ thật sự đang ở trong popover:

```js
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#thdPanel').hidden) {
    const dangOTrong = $('#thdWrap').contains(document.activeElement);
    $('#thdPanel').hidden = true;
    if (dangOTrong) $('#thdNut').focus();
  }
});
```

### `FIX-03` · **THẤP** · `docs/reviews/REV-0003-ra-soat-dong-cua-so.md` mục 2.3

**Sai chỗ nào**: cột số dòng `app.js` trộn lẫn bản trước sửa và bản sau sửa.
`nsSuaModalNen` ghi 2639 (thật: **2653**), `kvModalNen` ghi 5179 (thật: **5193**) —
lệch đúng +14 dòng, bằng đúng số dòng bản vá thêm vào.

**Vì sao sai**: bảng này để người sau tra cứu. Số dòng sai thì nhảy trượt, mất
thời gian, và làm giảm lòng tin vào cả bảng dù nội dung đúng.

**Sửa thế nào**: soát lại toàn bộ cột số dòng theo file **sau khi sửa**
(`515f135`), hoặc ghi chú rõ ở đầu bảng là số dòng tính theo bản nào.

### `FIX-04` · **THẤP (gợi ý dọn dẹp)** · `public/assets/js/app.js:983, 992`

**Sai chỗ nào**: hai lệnh `e.stopPropagation()` — một trong handler click của
`#thdNut` (983), một là cả listener `$('#thdPanel').addEventListener('click',
e => e.stopPropagation())` (992) — sinh ra **chỉ để** chặn listener
`document click` cũ. Listener đó đã bị xoá trong bản vá này.

**Vì sao nên dọn**: giờ chúng không còn bảo vệ gì cho popover, nhưng vẫn **âm
thầm chặn mọi click bên trong panel** không cho tới bất kỳ listener cấp
`document` nào khác. Chưa gây lỗi hôm nay, nhưng là cái bẫy cho người sau: thêm
một tính năng nghe click ở `document` sẽ thấy nó "không chạy khi bấm trong
popover" mà không hiểu vì sao.

**Sửa thế nào**: xoá listener ở 992, và bỏ `e.stopPropagation()` ở 983 (bật/tắt
đã do `closest('#thdWrap')` lo). Nếu quyết định giữ, thêm chú thích nói rõ lý do.
**Không bắt buộc trong CTL-0008** — có thể tách việc riêng.

---

## 10. VIỆC CÒN TREO (không thuộc CTL-0008, ghi để không rơi)

| Việc | Mức | Ghi chú |
|---|---|---|
| 6 class còn thiếu chốt `[hidden]` (Đề xuất B) | **CAO** | 3 chỗ đang hiện **số sai** cho người dùng. B **không phải** CORE_CHANGE — đề nghị duyệt tách khỏi A và C |
| `#tsInTemVung` phụ thuộc CSS đè `[hidden]` để in được | **TRUNG BÌNH** | Bản thân nó đã là nợ kỹ thuật, dù có làm Đề xuất A hay không |
| Esc cho 18 modal (Đề xuất C) | TRUNG BÌNH | Chờ GY-0001 merge, tách request riêng — đồng ý với Khỉ Đột |
| Bấm ra ngoài cho 6 modal còn thiếu | TRUNG BÌNH | |
| Chưa kiểm trên máy iOS/Android thật | THẤP | Cả Khỉ Đột lẫn Hồ Ly đều mới chỉ đo trên Chrome máy tính |
| **In tem chưa từng được kiểm thử tự động** | THẤP | Lỗi `FIX-01` lọt được tới đây chính vì không ai kiểm đường in |

---

## 11. GHI NHẬN

Phần làm tốt của Khỉ Đột, nói rõ để giữ:

- **Không vá triệu chứng.** Bản giao việc đã cảnh báo "đừng sửa kiểu thêm dòng
  đóng lại", và Khỉ Đột đào tới tận tầng CSS — đúng gốc, kiểm lại xác nhận đúng.
- **Đo thật, không đoán.** Loại 4 giả thuyết bằng bằng chứng chứ không bằng suy luận.
- **Dừng đúng chỗ ở cổng CORE_CHANGE.** Mục 2 cho thấy nếu tự duyệt Đề xuất A thì
  đã làm hỏng tính năng in tem. Cổng đã cứu một bàn thua.
- **Theo đúng thông lệ repo** thay vì đẻ kiểu mới (Rule 5), và **không lấn vùng
  GY-0001** (Rule 13).

Bốn lỗi nêu ở mục 9 đều nhỏ về công sửa; riêng `FIX-01` quan trọng vì nó là
thông tin Sếp dùng để ra quyết định.
