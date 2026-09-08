# REV-0059 — Bảng vừa một màn, bỏ thanh kéo ngang

**Kết luận: FAIL** — 1 lỗi CHẶN, 2 lỗi CAO.

Nhánh `fix/bang-vua-man-het-keo-ngang` · commit `bfbe853` · soi ngày 04/09/2026
· người soi: Hồ Ly.

> Việc đã làm được rất nhiều và phần lớn là làm ĐÚNG. Nhưng có một lỗi khiến
> chính cái Sếp Ngọc phàn nàn — **thanh kéo ngang trên điện thoại** — vẫn còn
> nguyên trên bảng Nhân sự khi anh Phạm Khương Duy mở nó. Bàn đo mới không
> thấy vì nó không đi qua đường mà ứng dụng thật đi qua.

---

## Nói ngắn cho Sếp

| Câu hỏi | Trả lời |
|---|---|
| Ba con số 17/17/22 → 0 có thật không? | **Có, nhưng chưa đủ.** Số đúng với dữ liệu bàn đo tự chèn. Với dữ liệu ứng dụng tự vẽ ra thì còn bảng tràn. |
| Nút "Chi tiết" có làm rò lương / giá vốn không? | **KHÔNG.** Máy chủ không gửi lương xuống máy người không có quyền. Đã kiểm tận câu lệnh SQL. |
| Có phải nới lỏng trá hình không? | Chốt `do-gop-viec` **có nới thật** ở màn hẹp (9 → 4). Hướng nới có lý, nhưng con số 4 lại đo bằng dữ liệu ngắn — đúng cái lỗi mà lần này đang đi sửa. |
| Chi phí | **0 đồng.** `package.json` chỉ thêm 3 dòng lệnh chạy, không thêm gói nào. |

---

## CHẶN-1 · Bảng Nhân sự vẫn kéo ngang trên điện thoại, và mất hết nhãn cột

**Mức: CHẶN** · `public/assets/js/app.js:10345` (trong `luoiBang()`) ·
`public/assets/js/app.js:431` · `public/assets/css/style.css:1757`

### Chuyện gì xảy ra

`luoiBang()` bỏ qua **nguyên cả dòng** khi số ô `<td>` khác số tiêu đề `<th>`:

```js
if (tr.cells.length !== ths.length) continue;   // dòng gộp ô (trống/tổng) — không phải dòng dữ liệu
```

Ý định là bỏ qua dòng "tổng cộng". Nhưng ERP có ít nhất **bốn** bảng vẽ số ô
**theo điều kiện**, trong khi `<th>` tương ứng chỉ bị `hidden` chứ không bị bỏ
khỏi trang:

| Bảng | Chỗ vẽ ô theo điều kiện | `<th>` |
|---|---|---|
| Nhân sự `#ns-bang` | `app.js:431` `NS_XEM_LUONG_DOC ? <td> : ''` | `ns-thHopDong`, `ns-thThaoTac` mang `hidden` (`app.html:1059,1062`) |
| Góp ý `#gy-bang` | `app.js:6261,6263` (`coCotNguoiGui`, `coCotRuiRo`) | `gy-cot-nguoigui`, `gy-cot-ruiro` mang `hidden` (`app.html:574-576`) |
| Đơn hoàn huỷ `#kd-dhh-bang` | `app.js:6718` `co_van_don ? <td> : ''` | — |
| Tồn kho `#kv-ton-bang` | `app.js:8515` `xemGiaVon ? <td> : ''` | `<th>` bị `remove()` nên **cân bằng** — bảng này không dính |

Khi lệch số ô, cả bảng mất sạch phần xử lý: không `data-nhan`, không `.cot-phu`,
không `.o-dau`, không nút "Chi tiết". Nhưng lớp `.luoi-bang` **vẫn được gắn**
(nó gắn TRƯỚC vòng lặp dòng), nên dưới 980px bảng vẫn đổi sang thẻ — thẻ
**không có nhãn**.

Cộng thêm: `td .nm { white-space: nowrap }` (`style.css:1757`) chỉ được gỡ
trong cột `.cot-chu` (`style.css:1578`). Cột đầu bảng Nhân sự là
`<th>Nhân sự</th>` — **không** `.cot-chu`. Nên tên người trong `.nm` không
xuống dòng và kéo thẻ rộng ra.

### Cách tái hiện

```
node scripts/ho-ly-duong-that.mjs
```

Bàn đo này nạp dữ liệu qua API giả với vai trò **`quan_ly_kho`** — đúng vai của
anh Phạm Khương Duy, người có tab `nhansu` nhưng `xem_luong: false`
(`src/quyen.js:49`) — và một họ tên **80 ký tự**, đúng trần ô nhập
(`app.html:818 maxlength="80"`).

Kết quả đo được:

| | 1440px | 375px |
|---|---|---|
| số `<th>` / số `<td>` | 6 / 4 | 6 / 4 |
| `luoiBang` đã xử lý dòng? | **false** | **false** |
| ô có `data-nhan` (nhãn trên thẻ)? | **false** | **false** |
| có nút "Chi tiết"? | **false** | **false** |
| cột `.cot-phu` "Vào làm" có được ẩn? | **false** | **false** |
| `white-space` của `.nm` | `nowrap` | `nowrap` |
| bề ngang bảng / khung | 1134 / 1134 | **711 / 341** |
| **còn kéo ngang?** | không | **CÓ** |

### Vì sao hại

Đây đúng là thứ Sếp Ngọc nhắc **hai lần**. Trên điện thoại, anh Duy mở tab Nhân
sự vẫn phải kéo ngang, và cái thẻ anh thấy là một dãy giá trị **không có tên
trường** — "Kinh doanh", "Đang làm", "05/01/2025" nằm cạnh nhau, không biết cái
nào là gì. So với trước bản vá thì đây là **tệ hơn**: trước còn có hàng tiêu đề
để đối chiếu.

### Vì sao bàn đo mới không thấy

`scripts/do-bang-that.mjs:96` — `CHEN_DONG_THAT` chỉ chèn dòng vào bảng có
`tbody` **rỗng**, và dòng nó chèn có **đúng một `<td>` cho mỗi `<th>`**:

```js
const tb = t.tBodies[0]; if (!tb || tb.rows.length) return;
...
ths.forEach(th => { const td = document.createElement('td'); ... tr.appendChild(td); });
```

Nên nó **không bao giờ** tạo ra tình trạng lệch ô, và cũng không bao giờ tạo ra
ô có thẻ con `<div class="nm">`. Hai nhánh mà ứng dụng thật luôn đi qua thì bàn
đo không đi qua lần nào. Đó là lý do nó in 37 ĐẠT · 0 TRƯỢT.

### Hướng sửa (gợi ý, Khỉ Đột tự quyết)

Ba việc, độc lập nhau:

1. `luoiBang()` đừng so số ô với số `<th>`. Dòng gộp ô nhận ra bằng `colSpan > 1`
   là đủ, không cần đếm.
2. Cột nào ẩn theo quyền thì **`remove()`** cái `<th>`, đừng `hidden` — bảng
   Nhân sự (`app.js:126`) và Tồn kho (`app.js:8485`) đã làm đúng như vậy rồi;
   Góp ý thì chưa.
3. Trong khối `@media (max-width: 980px)`, cho `.luoi-bang tbody .nm` xuống dòng
   — hoặc đánh dấu `.cot-chu` cho cột đầu của bảng Nhân sự.

---

## CAO-1 · Chốt mới của `do-gop-viec` đo bằng dữ liệu ngắn — đúng lỗi đang đi sửa

**Mức: CAO** · `scripts/do-gop-viec-lichsu.mjs:461-490`

Chốt dưới 980px đổi từ "số dòng không được giảm" sang "≥4 thẻ đọc được một màn".
Ghi chú tại chỗ viết rất kỹ và câu cấm hạ tiếp là đúng tinh thần. **Hướng nới là
có lý**: 9 dòng cũ là 9 dòng của bảng rộng 4.462px, muốn đọc người nhận thì phải
kéo ngang — lập luận đó đứng vững, tôi đồng ý.

Nhưng **con số 4 lấy từ một phép đo dùng dữ liệu ngắn**. Dữ liệu mẫu của
`do-gop-viec-lichsu.mjs:63-76` là:

- `tieu_de: 'Đối soát đơn hoàn Shopee T8'` — 27 ký tự
- `tieu_de: 'Việc tôi nhận số 3'` — 18 ký tự
- `dau_ra: 'Bảng khớp 100%, có biên bản'` — 27 ký tự

Trong khi máy chủ cho phép `tieu_de` **200 ký tự** (`src/index.js:2890`) và
`dau_ra` **1000 ký tự** (`src/index.js:2891`).

Tôi đo lại với tên việc ~100 ký tự (`node scripts/ho-ly-the-va-tick.mjs`):

| Bề ngang | Số thẻ một màn, dữ liệu ngắn (bàn đo hiện tại) | Số thẻ một màn, tên việc 100 ký tự |
|---|---|---|
| 414px | 5 | **3** |
| 375px | 5 | **3** |

**3 < 4** — chốt mới sẽ đỏ khi gặp dữ liệu thật, hoặc (tệ hơn) không bao giờ
gặp vì bàn đo không dùng dữ liệu thật. Đây chính là lỗi mà `do-bang-that.mjs`
được viết ra để chữa, viết hẳn thành bài học ở đầu tệp — nhưng `do-gop-viec`
thì chưa được chữa theo.

**Hai chỗ lời khai lệch số đo:**

1. Khỉ Đột báo cái giá là "9 → 5". Số thật trong `KET_QUA_JSON` của
   `npm run do-gop-viec` là **hai** con số: `gop.toi` 9 → 5 **và**
   `gop.congty` 11 → **6**. Con số thứ hai (giảm 45%) không được nhắc.
2. Ghi chú viết "chừa đúng một thẻ dung sai, không hơn". Đúng với `gop.toi`
   (5 so với mốc 4), **sai** với `gop.congty` (6 so với mốc 4 — hai thẻ dung sai).

**Điểm cần nói rõ với Sếp:** "5 thẻ một màn" là số đo **sau khi đã cuộn bảng lên
đầu màn** (`DEM_DONG` gọi `scrollIntoView({block:'start'})` trước khi đếm). Ảnh
`375-lichsuviec-sau.png` là màn hình lúc mới mở — đếm được **2 thẻ trọn vẹn + 1
thẻ hụt**, vì phần mô tả đầu trang và bộ lọc ăn mất nửa màn trên.

---

## CAO-2 · Ô tick chọn dòng 13×13px — dưới chuẩn chạm, và trong thẻ thì không có nhãn

**Mức: CAO** (kích thước là lỗi **có sẵn từ trước**, việc mất nhãn là **mới**)
· `public/app.html:1729` và ba chỗ tương tự

Tự đo (`node scripts/ho-ly-the-va-tick.mjs`), ở **cả 1440px, 414px và 375px**:

| Bảng | Việc của ai | Kích thước ô tick | Nhãn trên thẻ |
|---|---|---|---|
| `kd-ds-bang` Đối soát sàn | chị Phan Thị Hằng | **13×13px** | *(không có)* |
| `kt-ts-bang` Kế toán tra soát | chị Phan Thị Hằng | **13×13px** | *(không có)* |
| `kt-hh-bang` Kế toán hàng hoàn | chị Phan Thị Hằng | **13×13px** | *(không có)* |
| `ts-bang` Tài sản | anh Phạm Khương Duy | **13×13px** | *(không có)* |

Luật nhà là **≥44px**. 13px là chưa tới một phần ba. Ô tick vẫn **bấm được** và
vẫn hiện ở chế độ thẻ — chức năng không mất, nên không phải CHẶN. Nhưng:

- Kích thước 13px có từ trước bản vá này. **Không phải lỗi mới.**
- Cái **mới** là: bản vá đưa bốn bảng này sang chế độ thẻ trên điện thoại, và
  trong thẻ mọi trường đều có nhãn IN HOA đi kèm — **trừ ô tick**, vì
  `<th>` của nó không có chữ (`data-nhan` rỗng). Chị Hằng nhìn thẻ sẽ thấy một
  ô vuông nhỏ không tên, không biết tick để làm gì.

Đây đúng là công việc hằng ngày của chị Hằng: tick từng dòng đơn hoàn rồi đối
chiếu tiền với sàn. Đề nghị xử lý trong cùng đợt.

---

## VỪA-1 · Arm C chỉ đếm ký tự, không đọc được nghĩa

**Mức: VỪA** · `scripts/do-bang-that.mjs:331`

```js
ok(`C · "${ma}" được kéo ngang có lý do đủ dài để cãi được`, ly.length > 60, ly);
```

Lời khai nói arm C "đọc lại lý do đó và trượt nếu nó quá ngắn để cãi". Đúng
nguyên văn — nó có kiểm độ dài. Nhưng cái tên "đủ dài để cãi được" hứa nhiều hơn
thế.

**Tái hiện:** đổi lý do của `xc-kehoach-tbody` trong `BANG_GIU_CUON` thành 80 ký
tự vô nghĩa rồi chạy `npm run do-bang-that`:

```
✅ C · "xc-kehoach-tbody" được kéo ngang có lý do đủ dài để cãi được
     — aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll mmmm nnnn oooo
ĐẠT 37 · TRƯỢT 0
```

Không có máy nào đọc được nghĩa. Cửa chặn thật ở đây là **người soi**, không
phải bàn đo — nên hãy đặt tên đúng như vậy (`lý do dài ≥60 ký tự`), để người sau
không tưởng là đã có máy canh. Đây vẫn **tốt hơn hẳn** `MOC_TRAN` cũ: thêm một
con số thì không ai đọc, còn thêm một câu thì lọt vào diff và người soi đọc được.

---

## THẤP-1 · Có bảng thứ 27 mà bàn đo về cấu trúc không thể thấy

**Mức: THẤP** · `public/assets/js/app.js:3655` · `scripts/do-bang-that.mjs:78`

`SO_BANG_PHAI_SOI = 26` và `app.html` có đúng 26 thẻ `<table>` — **mẫu số này
đúng**, tôi đếm độc lập và khớp.

Nhưng có một bảng thứ 27 dựng bằng JS: `#cv-tqct-phongban` ("Tổng quan công ty
theo phòng ban", chỉ admin), tạo bằng `innerHTML` khi có dữ liệu. Bàn đo dùng API
giả trả mảng rỗng → bảng không được tạo → không bao giờ bị soi. Và arm D dùng
`>=` nên thêm bảng cũng không làm nó đỏ.

Rủi ro thật thấp (4 cột: một cột chữ ngắn + ba cột số). Nhưng đây đúng là kiểu mù
mà bàn đo này được viết ra để chặn, nên nên ghi vào tệp.

## THẤP-2 · Hai chỗ ghi chú lệch với mã

**Mức: THẤP** · `public/assets/css/style.css:1651` và `:1697`

1. Tiêu đề khối viết `--- LỚP 3: ≤780px BẢNG THÀNH THẺ ---` nhưng media query
   là `@media (max-width: 980px)`, và phần giải thích ngay dưới nói đúng 980px.
   Số 780 là dấu vết bản nháp.
2. Còn một ghi chú mồ côi: *"Dấu chấm giữa ngăn hai trường chạy nối nhau — không
   có nó thì..."* mà **không có luật CSS nào theo sau** — dấu chấm đã bị bỏ (một
   ghi chú khác nói rõ là đã bỏ). Ghi chú này nói ngược lại, nên xoá.

---

## Những chỗ Khỉ Đột làm ĐÚNG — đã kiểm, không phải khen suông

### Nút "Chi tiết" KHÔNG rò dữ liệu theo quyền — kết luận độc lập

Lời khai đáng nghi ở chỗ "đọc thẳng ô đang ẩn trong DOM". Tôi soi tới máy chủ,
không dừng ở màn hình:

- **Lương** — `src/index.js:319-333`: hai câu SQL khác nhau theo vai trò. Người
  không có quyền thì cột `luong` **không được chọn ra khỏi CSDL**. Ở giao diện,
  `<th id="ns-thLuong">` bị **`remove()`** hẳn (`app.js:126`) và `<td>` không
  được vẽ (`app.js:431`). Không có gì trong DOM để mở ra.
- **Giá vốn** — `src/kho.js:111`: `const giaVon = xemGiaVon ? (giaTheo[sp.id] ?? null) : null;`
  Máy chủ trả `null`. `<th id="kv-thGiaTri">` cũng bị `remove()` (`app.js:8485`).
- **Lớp thứ ba** — "cửa quyền" trong bộ xử lý click lọc bỏ ô có `ths[i].hidden`,
  đọc trạng thái `<th>` ngay lúc bấm.

**Kết luận: không có lỗ rò dữ liệu theo quyền.** Ba lớp chồng nhau, và lớp
quyết định nằm ở SQL chứ không ở CSS. Đây là chỗ làm rất chắc.

*(Ghi chú: cột "Người gửi" của bảng Góp ý dùng `hidden` — nhưng đó là cửa **hiển
thị** ("chỉ hiện khi có dữ liệu của người khác", `app.js:6328`), không phải cửa
**quyền**, nên không phải chuyện bảo mật.)*

### Ba con số 17/17/22 → 0 — đếm độc lập

- **Mẫu số đúng.** `app.html` có đúng 26 `<table>`; bàn đo soi 26. Khớp.
- **Chạy lại thì đúng số.** `npm run do-bang-that` → **37 ĐẠT · 0 TRƯỢT**;
  `npm run do-bang-vua-man` → **39 ĐẠT · 0 TRƯỢT**. Đúng như khai.
- **Nhưng con số 0 chỉ đúng trong phạm vi bàn đo tự chèn dòng.** Với đường vẽ
  thật của ứng dụng thì vẫn còn bảng tràn ở 375px (xem CHẶN-1).
- **Hai bề ngang bị bỏ, tôi đo thêm:** 1024px và 414px. Với dòng do bàn đo tự
  chèn thì **cả hai đều 0 bảng tràn**, kể cả sát mốc 979/980px. Ranh giới 980px
  không có chỗ hở.

### `MOC_TRAN` — 24 khoá đã đi thật, nhưng cái hộp thì còn

Khai là "`MOC_TRAN` đã bị XOÁ HẲN (24 khoá), không phải hạ số". Đo lại:

**Đúng phần quan trọng.** Toàn bộ 24 khoá giấy phép tràn đã biến mất — không có
khoá nào bị hạ xuống số nhỏ hơn, chúng bị bỏ hẳn:

```js
// scripts/do-bang-vua-man.mjs:93
const MOC_TRAN = { 1440: {}, 1100: {}, 900: {}, 375: {}, 320: {} };
```

**Nhưng biến thì vẫn còn**, và arm C vẫn đọc nó (`:274`). Nói "xoá hẳn" là hơi
quá — chính xác phải là "đã rỗng". Khác nhau ở chỗ: thêm lại một giấy phép tràn
giờ chỉ cách đúng **một dòng**.

Dù vậy tôi **không tính đây là lỗi**, vì chính tệp đó đã tự nói ra điều này
(`:88-95`) và cấm trước:

> *"Khoá còn nằm đây là còn giấy phép tràn. MUỐN THÊM KHOÁ VÀO ĐÂY: đừng."*

Ghi chú còn chỉ đường sang `BANG_GIU_CUON` — nơi bắt buộc kèm lý do bằng chữ.
Đây là tự khai đầy đủ, không phải giấu. Kết quả thực tế: **không bảng nào còn
giấy phép tràn**, và bàn đo cũ nay đọc `BANG_GIU_CUON` thẳng từ `app.js`, một
nguồn sự thật. Sửa đúng gốc.

### Bàn đo mới bắt được lỗi khi tôi tự gài

Tôi gài bốn kiểu, không dùng `--tu-kiem` của nó:

| Cách gài | Kết quả |
|---|---|
| Thêm một cột chữ tự do (`<th>Ghi chú thêm của quản lý</th>`) vào `ls-cv-bang` | **ĐỎ** — arm A, `+860px @1440`, `+1013px @1280` |
| Bỏ `.cot-phu` khỏi cột "Người giao" | **ĐỎ** — arm A, `+77px @1440`, `+137px @1280` |
| `--tu-kiem` của chính nó (dựng bảng mới) | **ĐỎ** — ĐẠT 35 · TRƯỢT 2 |
| Lý do miễn trừ dài nhưng vô nghĩa | **XANH** — không bắt được (VỪA-1) |

Ba trên bốn. Bàn đo này có răng thật.

### Ba lỗi tự gây tự bắt — đã sạch

1. **`display:-webkit-box` trên `<td>`** — sạch. Hai chỗ còn dùng `-webkit-box`
   là `.dai-gon` (`style.css:1785`) và `.ts-tem-ten` (`:3314`), cả hai đều là
   `<div>`, không phải ô bảng. Chiều cao dòng đo được **55px @1440, 54px @1100**
   — đúng mốc, không phình.
2. **`cancelAnimationFrame` làm phép đo bị bỏ đói** — sạch.
   `grep -n "cancelAnimationFrame" public/assets/js/app.js` chỉ còn **trong ghi
   chú**, không còn trong mã. Tôi kiểm cả ba bộ lập lịch trong tệp: `app.js:813`
   (pre-existing) không dùng kiểu huỷ-rồi-hẹn-lại nên không thể bị bỏ đói;
   `:10277` và `:10456` đều đã đổi sang "đã hẹn thì thôi". **Không còn bộ nào
   cùng cảnh.** Arm B2 canh đúng triệu chứng này và xanh ở cả ba bề ngang.
3. **Cột "Đầu ra" hiện hai lần** — xác nhận đã sạch qua ảnh
   `1440-lichsuviec-sau.png`: cột "ĐẦU RA CẦN ĐẠT" chỉ xuất hiện một lần.

**Rút ra — bàn đo số còn mù chỗ nào mà chỉ mắt mới thấy?** Lỗi "hiện hai lần"
không phải lỗi *bề ngang*, *cỡ chữ* hay *chiều cao* — ba thứ duy nhất bàn đo
biết đo. Nó là lỗi **cùng một thông tin xuất hiện hai lần**. Cùng họ với nó, và
hiện chưa có arm nào canh:

- một trường hiện hai lần ở hai chỗ khác nhau;
- thẻ ở chế độ thẻ mất nhãn (**đúng là CHẶN-1 — và đúng là ảnh chụp sẽ thấy
  ngay, còn bàn đo số thì không**);
- thứ tự cột đổi ngầm;
- ô tick không có nhãn (CAO-2).

Đề nghị: giữ nguyên nếp chụp 24 ảnh mỗi lần đụng vào bảng. Bộ ảnh lần này là thứ
duy nhất bắt được lỗi số 3.

### Danh sách miễn trừ — bỏ 3, giữ 3

**Ba bảng bỏ ra** (Đơn hoàn · Lịch sử đơn hoàn · Kế toán tra soát): đo lại thì ép
vừa được thật, và trên điện thoại chúng đổi sang thẻ có nhãn đầy đủ. Người dùng
**không mất khả năng đối chiếu**: các cột lùi xuống đều là cột phụ (Nguồn, Đơn
gốc, Về từ đâu) và mở lại được bằng nút "Chi tiết". Bỏ ra là **đúng** — lý do cũ
"phải đọc trên cùng một hàng" đã thành thói quen chứ không còn là ràng buộc.
**Nhưng** đây là ba bảng của chị Hằng, và cả ba đều dính CAO-2 (ô tick 13px
không nhãn) — nên phần "không mất việc" chỉ đúng sau khi sửa CAO-2.

**Ba bảng giữ lại:**

- **Đối soát sàn (`kd-ds-bang`)** — lý do đứng vững. 12 cột, đã có 4 cột ghim
  trái. Việc "tick từng dòng rồi đọc ngang cả hàng để so tiền với sàn" là việc
  thật, có thể kiểm chứng: bảng có ô tick, có cột "Đã tra soát", có nút hành
  động theo dòng — đủ chứng cứ trong mã, không phải suy đoán. Và lý do có nói rõ
  "trên điện thoại vẫn đổi sang thẻ", đúng như đo được.
- **Hai ma trận Xếp ca** — lý do đứng vững về nguyên tắc (một cột là một ngày,
  nhãn "Thứ Ba 09/09" đi kèm từng ô thì khó đọc hơn bảng). **Nhưng chưa được đo
  ở 375px**: arm A ở 375px báo "hiện 24 · miễn trừ có lý do **0**" — nghĩa là
  không có bảng miễn trừ nào hiện diện lúc đo. Lời khai "hai ma trận giữ kéo
  ngang ở MỌI bề ngang" là **chưa được chứng minh trên điện thoại**. Nên bổ sung
  một ca đo, hoặc bỏ chữ "mọi bề ngang" khỏi ghi chú.

### Các cổng khác — tự chạy, tự thấy

| Cổng | Khai | Tôi đo |
|---|---|---|
| `do-bang-that` | 37/0 | **37 ĐẠT · 0 TRƯỢT** ✔ |
| `do-bang-vua-man` | 39/0 | **39 ĐẠT · 0 TRƯỢT** ✔ |
| `cong-khoi` @1440 | XANH | **XANH** ✔ |
| `cong-khoi-dienthoai` @375 | XANH | **XANH** ✔ |
| `do-cat-im-lang` | SẠCH | **SẠCH** ✔ |
| `do-chu-dai` | XANH | **XANH** ✔ |
| `do-ba-mau` | ĐẠT | **ĐẠT — đối chứng bắt 12/12** ✔ |
| `do-moc-noi` | 9/0 | **9 ĐẠT · 0 TRƯỢT** ✔ |
| `do-gop-viec` | ĐẠT | **ĐẠT TẤT CẢ** ✔ (nhưng xem CAO-1) |
| `do-quet-375` | ĐẠT | **ĐẠT** ✔ |
| `do-tai-tep` | ĐẠT | **ĐẠT cả hai bề ngang** ✔ |
| `do-bang-that --tu-kiem` | phải đỏ | **35/2 — đỏ đúng** ✔ |

**Không có số nào lệch lời khai.**

### Luật nhà

- **Ba màu** — `do-ba-mau` ĐẠT, đối chứng bắt 12/12 ca gài. Ảnh
  `1440-lichsuviec-sau.png` đúng tỷ lệ nâu/xanh/cam; đỏ chỉ dùng cho hạn chót
  quá hạn (01/09, 02/09) — đúng luật.
- **Chi phí 0** — `git diff origin/main...HEAD -- package.json` chỉ thêm 3 dòng
  `scripts`. `devDependencies` không đổi. ✔
- **Tiếng Việt có dấu** — toàn bộ mã, ghi chú và câu ra người dùng đều đủ dấu. ✔
- **Chạm ≥44px** — nút "Chi tiết" tự đo: **44×44px @1440**, **81×44px @375 và
  @414**, 13/13 nút đạt. ✔ Ô tick thì không — xem CAO-2.
- **Không cắt chữ âm thầm** — `do-cat-im-lang` SẠCH; chữ bị kẹp 2 dòng đều có nút
  "Xem thêm" của `dg()`, không đẻ cơ chế thứ hai. ✔

### Hai câu hỏi phụ đã kiểm

- **200 thẻ trên điện thoại có treo máy không?** Không.
  `node scripts/ho-ly-200-the.mjs`: 200/200 dòng được xử lý, không sót dòng nào,
  chi phí một lượt bố cục lại **0,1ms**, không tràn ngang. Cuộn mượt.
- **Bảng rỗng / một dòng ở chế độ thẻ?** Không vỡ — bảng rỗng co về chiều cao 0
  và phần "chưa có dữ liệu" (`.empty`) hiện thay, đúng như trước.

### Gộp với `origin/main`

`git fetch origin` → `origin/main` đang ở `ad4bc95`, **không đổi**. Nhánh này
**1 commit ahead, 0 behind**, cắt thẳng từ đỉnh hiện tại.
`git merge-tree` không cho ra vùng chồng lấn nào. **Không có gì phải gộp.**

*(Lưu ý: lời giao việc nói "origin/main hôm nay đã đi 5 lần" — từ worktree này
thì không thấy vậy. Nếu có nhánh nào chưa đẩy lên thì phải đẩy trước rồi mới soi
lại được.)*

---

## Chốt lại

Bản vá này chữa đúng gốc: bỏ `MOC_TRAN` thay vì hạ số, viết bàn đo mới không có
cửa tha, và kết quả trên màn 1440px của Sếp là **thật** — ảnh trước/sau chứng
minh được. Ba lỗi tự gây ra đều đã tự bắt và đã sạch. Nút "Chi tiết" không rò dữ
liệu, kiểm tới tận câu SQL.

Cái còn thiếu là một chỗ: **bàn đo tự chèn dòng của mình rồi chấm dòng của mình**.
Ứng dụng thật vẽ ô theo điều kiện và lồng thẻ con — hai nhánh đó chưa lần nào bị
đo, và đúng ở đó thanh kéo ngang còn sót lại trên bảng Nhân sự ở điện thoại.

Sửa CHẶN-1 rồi soi lại. CAO-1 và CAO-2 nên đi cùng đợt: một cái làm chốt đo đúng
dữ liệu thật, một cái trả lại ngón tay cho chị Hằng.

---

### Bàn đo tôi viết để soi vòng này

Bốn tệp, để trong `scripts/`, chạy được ngay, **không** gắn vào cổng nào:

| Tệp | Trả lời câu gì |
|---|---|
| `scripts/ho-ly-duong-that.mjs` | CHẶN-1 — đo trên đường vẽ thật, vai `quan_ly_kho`, tên 80 ký tự |
| `scripts/ho-ly-the-va-tick.mjs` | CAO-1, CAO-2 — đếm thẻ, ô tick, tự đo 44px |
| `scripts/ho-ly-soi-luoi.mjs` | ① — 7 bề ngang kể cả 1024/414/979/980 |
| `scripts/ho-ly-chan-doan.mjs` | cột nào không có trần bề ngang |
| `scripts/ho-ly-200-the.mjs` | 200 thẻ, bảng rỗng, bảng một dòng |

Khỉ Đột nên lấy ý của `ho-ly-duong-that.mjs` (nạp dữ liệu qua API giả, đo đường
vẽ thật) gộp vào `do-bang-that.mjs` thành một arm mới — chứ đừng giữ năm tệp
rời của tôi.
