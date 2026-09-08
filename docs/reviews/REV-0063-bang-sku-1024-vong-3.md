# REV-0063 vòng 3 — Bảng SKU tràn @1024px · Hồ Ly

# KẾT LUẬN

**Lúc tôi chốt số đo (cây `1cc83b7b`): FAIL — 0 CHẶN · 1 CAO · 4 VỪA · 6 THẤP.**

**Trong lúc tôi viết báo cáo, người xây vá tiếp ba lượt. Trên cây tôi đã đo lại
và xác nhận lần cuối (`style.css b4f2cdd8` · `do-nut-dai-cat-44px.mjs fbf41b21`):**

# **CAO-1 và CẢ BỐN VỪA ĐÃ ĐÓNG — tôi đo lại từng cái.**
# Còn đúng MỘT việc: `app.js` khai chốt canh `npm run do-nut-noi-doi`, mà cổng ấy CHƯA TỒN TẠI. Dựng nó (hoặc bỏ câu ấy) là tôi PASS.

Chi tiết ở "TÌNH TRẠNG CUỐI" ngay dưới. Các mục CAO/VỪA/THẤP bên dưới giữ nguyên
văn lúc phát hiện, để vòng sau còn đọc được đường đi.

> ## ⚠️ CÓ NGƯỜI SỬA `style.css` GIỮA LÚC TÔI ĐANG SOI — ĐỌC MỤC NÀY TRƯỚC
>
> Tôi đo xong, viết xong báo cáo, rồi kiểm lại cây làm việc lần cuối thì thấy
> `public/assets/css/style.css` **vừa đổi lúc 00:10:09**, sau khi tôi đã chốt số
> đo. **Không phải tôi sửa** — tôi không đụng mã sản phẩm trong cả vòng này.
> Thay đổi ấy **CHƯA COMMIT** (`git log` vẫn dừng ở `3283b48`).
>
> | | |
> |---|---|
> | tôi soi và đo trên | `style.css` sha256 `1cc83b7b8c310122` |
> | cây hiện tại | `style.css` sha256 `b4f2cdd802e94f8c` (+58 / −8) |
>
> **Nội dung: đúng phương án ④ tôi đề xuất ở CAO-1** — `position: relative;
> z-index: 1`, giữ nguyên lề âm, kèm bình luận chép lại bảng số đo của tôi.
>
> **Tôi đã đo lại trên cây mới, và phần CSS ĐÃ ĐÓNG:**
> ```
> vùng chạm .dai-gon-btn (quét từng pixel, elementFromPoint):
>   1440 · 1024 · 414 · 390 · 375 · 360 · 320  →  75 × 45px  ✅ TẤT CẢ
>   (trước: 37–38px ở năm bề ngang điện thoại)
> do-luat-css-chet 0/196 ✅ · do-bang-that ĐẠT 134 · TRƯỢT 0 ✅ — không hồi quy.
> ```
>
> **NHƯNG CAO-1 CHƯA ĐÓNG, và phần còn lại nay TỆ HƠN LÚC ĐẦU.** Bình luận mới
> viết:
> > *"Chốt canh: `npm run do-nut-dai-cat` đo CHIỀU CAO HỘP, **VÙNG CHẠM THẬT
> > (`elementFromPoint` quét từng pixel)** và CHIỀU CAO DÒNG … ở **CẢ chế độ
> > bảng LẪN chế độ thẻ**"*
>
> `scripts/do-nut-dai-cat-44px.mjs` **KHÔNG hề được sửa** (mtime vẫn 22:36:20,
> `git diff` không có nó). Đo lại chính tệp ấy, ngay bây giờ:
> ```
> số lời gọi `elementFromPoint`            : 0
> dòng 203  const chamO = oNutO.height     ← "vùng chạm" vẫn là CHIỀU CAO HỘP
> số khung ở chế độ thẻ (≤980px)           : 0
> ```
> Tức bình luận **chứng nhận một cổng không làm cái nó nói**. Trước đây cổng chỉ
> mù; giờ có thêm một dòng chữ bảo người sau đừng kiểm. Luật 44px vẫn không có
> ai canh: đổi lề âm hay bỏ `z-index` một ngày nào đó thì cổng vẫn xanh y nguyên.
>
> **Vì vậy kết luận giữ nguyên FAIL.** CAO-1 nay thu hẹp còn hai việc — sửa cổng
> cho thật, và sửa câu khai vừa viết. Xem CAO-1 điểm ② và ③.
>
> Cảnh báo về quy trình: sửa mã sản phẩm trong lúc người soi đang đo làm mọi con
> số trong báo cáo thành số của một cây không còn tồn tại. Mọi số đo dưới đây
> gắn với `1cc83b7b8c310122` trừ khi ghi khác.

---

# TÌNH TRẠNG CUỐI — đo lúc 00:25, cây `style.css b4f2cdd8` · `do-nut-dai-cat fbf41b21`

Cây đổi **ba lượt** trong lúc tôi viết (00:10 · 00:20 · 00:24). Tôi đo lại từ đầu
trên bản cuối, và bản ấy **đứng yên suốt lượt chạy** (sha256 trước và sau giống
nhau) nên số dưới đây có nghĩa.

| mục | trạng thái | bằng chứng tôi tự đo |
|---|---|---|
| **CAO-1 ①** CSS | **ĐÓNG** | `position: relative; z-index: 1` thêm vào, giữ lề âm. Quét từng pixel: chạm **45px** ở cả 7 bề ngang 320→1440 (trước: 37–38 ở năm mức điện thoại). Chiều cao dòng KHÔNG đổi. |
| **CAO-1 ②** cổng đo thật | **ĐÓNG** | `do-nut-dai-cat-44px.mjs` viết lại: **13** lời gọi `elementFromPoint`; `nut_o_bang_cham` nay **45** ≠ `nut_o_bang_hop` **44** (trước hai số bằng nhau ở cả 5 bộ); có khung **chế độ THẺ**; `nut_o_bang_ai_che` chỉ đích danh `TD.num`. |
| **CAO-1 ②′** cổng có RĂNG | **ĐÓNG** | Đối chứng mới `doi_chung_xep_lop` (gỡ `z-index`) đo ra **`cham: 38`** trong khi `hop` vẫn 44 — **tái lập CHÍNH XÁC con số 38px tôi tìm ra**. Cổng sẽ đỏ nếu ai gỡ bản vá. |
| **CAO-1 ③** lời khai | **ĐÓNG** | Bình luận `style.css` khai cổng đo `elementFromPoint` ở cả hai chế độ — lúc 00:10 câu ấy còn SAI; sau 00:24 thì ĐÚNG. Cổng đã đuổi kịp lời khai. |
| **VỪA-2** thò 1px dòng sau | **ĐÓNG** | Bình luận mới ghi thẳng *"nó **vẫn ăn 1px** của dòng sau … 1px chứ không phải 0px"*, kèm phạm vi. |
| **VỪA-3** nhãn lỗi thời | **ĐÓNG** | Tôi tự dán, như đã hứa. |
| **VỪA-4** không phải cổng tự chấm | **ĐÓNG** | Cổng mạng lấy `0`/`CONG_DO_NUT`, tự lái Chrome, in `KET_QUA_JSON=` ra stdout, `process.exit(dat_het ? 0 : 1)`. Tôi chạy: **EXIT=0**, `dat_het: true`. Thêm `arm2` đo trên **ứng dụng THẬT** ở **9 bề ngang, cả hai chế độ**: chạm nhỏ nhất **45px**. |
| **VỪA-1** trần `GO_TOI_DA` | **CÒN MỞ** | `app.js` chưa đụng tới (sha `921b8e71`, mtime 21:32). Câu *"2 là đủ để dọn sạch mọi ca kéo co / xoay máy đo được"* vẫn đó, và tôi đã đo được ca nó KHÔNG đủ (lượt nới thứ 3 → 4 nút nói dối). |
| **THẤP-3** cổng chưa đo ứng dụng thật | **ĐÓNG** | `arm2`, 9 mức. |
| THẤP-1 · 2 · 4 · 5 · 6 | CÒN MỞ | đều là chữ nghĩa/sổ nợ, không chặn. |

**Không hồi quy trên cây mới:** `do-luat-css-chet` **0 / 196** ✅ ·
`do-bang-that` **ĐẠT 134 · TRƯỢT 0** ✅ · `do-nut-dai-cat` **EXIT 0** ✅.

### VỪA-1 cũng đã được vá — lượt thứ TƯ, lúc 00:27 (`app.js 3024f307`)

Không phải sửa câu khai, mà **đổi cách đếm**: `GO_TOI_DA = 2` theo cả đời DOM →
`GO_TOI_DA = 6` **theo CHÙM** với `CHUM_MS = 250`. Lý lẽ viết ra bác thẳng đề
nghị của tôi ("đặt lại bộ đếm khi số lần GẮN cũng tăng") bằng chính số đo của
tôi — mỗi lượt THU cũng gắn lại đúng 4 nút, nên kéo co CŨNG xen kẽ gắn/gỡ và
phép đếm không tách được hai cảnh; thứ tách được là NHỊP (vòng lặp tự nuôi ~16–35ms,
kéo co ~1200–1500ms, cách nhau một bậc độ lớn). Bác đúng, và bác bằng số đo.

**Tôi chạy lại ĐÚNG ca đã bắt lỗi** (`holy-rev63c-nut.mjs`, nới/thu 5 vòng):
```
TRƯỚC (app.js 921b8e71): vòng 3·4·5 → NÓI DỐI 4   soGo={"0":7,"2":4}
SAU   (app.js 3024f307): vòng 1→5   → NÓI DỐI 0   soGo={"0":7,"1":4}
                         ở cả 1440 · 1280 · 1024 · 375
```
**Trần không còn chạm được. VỪA-1 ĐÓNG.**

### ⚠️ CÒN ĐÚNG MỘT VIỆC — và nó lại là lỗi CÙNG HỌ với CAO-1 ③

Bình luận mới trong `app.js` kết bằng:
> *"CHỐT CANH: `npm run do-nut-noi-doi` — chạy cả ca kéo co lẫn ca vòng lặp gài
> sẵn, đòi 0 nút nói dối ở ca đầu và vòng lặp phải DỪNG ở ca sau."*

**Cổng ấy KHÔNG TỒN TẠI** (đo lúc 00:28:51):
```
grep -c "do-nut-noi-doi" package.json   →  0
ls scripts/do-nut-noi-doi*.mjs          →  không có tệp
```
Đây đúng lớp CAO-1 ③ mà vòng này vừa đóng cách đó 18 phút: **một câu chứng nhận
một cổng không có thật.** Hệ quả cụ thể: nhánh "vòng lặp tự nuôi phải DỪNG sau 6
nhịp" hiện **chưa ai đo** — nó vẫn là giả thuyết, y như `GO_TOI_DA = 2` từng là.
Ca kéo co thì tôi đã tự đo và nó đạt; ca vòng lặp thì không.

**Phải làm — một trong hai:** dựng `do-nut-noi-doi` thật (có ca vòng lặp gài sẵn,
đòi nó dừng), hoặc bỏ câu ấy đi và khai thẳng rằng nhánh vòng-lặp chưa có cổng.
Đừng để nguyên.

### Chốt
`CHẶN 0 · CAO 0 · VỪA 0 · THẤP 6` (thêm THẤP-7: cổng `do-nut-noi-doi` được khai
mà chưa dựng — nhưng vì nó lặp lại đúng lớp lỗi vừa chữa, tôi xếp nó là **việc
phải làm trước khi đẩy**, không phải nợ).

> Và xin nhắc lại chuyện quy trình, vì nó sẽ còn lặp: ba lượt sửa mã sản phẩm
> rơi vào giữa lượt soi. Lần này may — tôi bắt kịp và bản cuối đứng yên đủ lâu
> để đo. Lần sau, nếu tệp đổi *trong khi* bàn đo đang chạy, con số in ra sẽ là
> con số của hai cây khác nhau trộn lại, và **không ai biết** vì bàn đo không
> ghi sha256 của thứ nó vừa đo. Đề nghị: mọi cổng in kèm sha256 của tệp nó chấm.

Nhánh `fix/bang-sku-tran-1024` @ `3283b48` · `origin/main af951b8` đã là TỔ TIÊN
của HEAD (gộp sạch) · đo 07/09/2026, Chrome thật, `scripts/lib/ban-do-chrome.mjs`.

**Vòng 2 tôi FAIL với 1 CHẶN + 2 CAO + 3 VỪA + 5 THẤP. Cả 11 chỗ đã vá, và tôi
đã đo lại từng chỗ — xem mục "Vá vòng 2: đã kiểm" ở cuối. Mọi con số người xây
khai đều ĐÚNG, không lệch một chỗ nào.** Đây là vòng đầu tiên của nhánh này mà
lời khai và số đo khớp hoàn toàn.

Cái làm vòng này vẫn FAIL là **một chỗ MỚI**, và nó là **lần thứ BA liên tiếp
cùng một hình dạng lỗi**: đo ở một phía của cái vạch rồi kết luận cho cả hai phía.

| vòng | đo ở đâu | bỏ sót phía nào |
|---|---|---|
| 1 | 1440 | 1024 → chữ bị cắt âm thầm |
| 2 | 1280 · 1440 | 1101–1245 → dải tràn tự tạo |
| **3** | **1200 · 1280 · 1440** (ghi thẳng trong `style.css`) | **chế độ THẺ ≤980px → vùng chạm 37–38px** |

Mọi con số dưới đây tôi tự đo lại, không lấy lại của người xây.

---

# CAO-1 · Nút "Xem thêm" ĐO RA 44px NHƯNG NGÓN TAY CHỈ BẤM ĐƯỢC 37–38px TRÊN ĐIỆN THOẠI — và cổng mới dựng ra để canh nó đang đo một con số giả

Luật nhà: **chạm ≥44px, đo bằng CẢ HAI cách.** Vòng này vá `.dai-gon-btn` từ
60×15 lên 74×44 và dựng chốt canh trong `do-nut-dai-cat`. Hộp thì đúng. Vùng
chạm thì không.

**Quét từng pixel bằng `elementFromPoint` giữa hộp, trên đường vẽ thật, bảng SKU
màn Kinh doanh, tên hàng nhập khẩu 96 ký tự (`holy-rev63c-cham375.mjs`):**

| bề ngang | hộp `getBoundingClientRect` | **VÙNG CHẠM thật** | hụt |
|---|---|---|---|
| 1440 | 74.3 × 44 | 75 × **45** ✅ | — |
| 1024 | 74.3 × 44 | 75 × **45** ✅ | — |
| **414** | 74.3 × 44 | 75 × **37** ❌ | **9px đáy** |
| **390** | 74.3 × 44 | 75 × **37** ❌ | **9px đáy** |
| **375** | 74.3 × 44 | 75 × **38** ❌ | **8px đáy** |
| **360** | 74.3 × 44 | 75 × **38** ❌ | **8px đáy** |
| **320** | 74.3 × 44 | 75 × **37–38** ❌ | **8–9px đáy** |

**Ai che.** `elementFromPoint` ở dải đáy trả về **`TD.num`** — ô "Số lượng" đứng
ngay sau. Ở ≤980px bảng đổi sang chế độ THẺ (`tr`/`td` thành `display: block`),
các ô XẾP CHỒNG dọc; `margin-bottom: -10px` của nút kéo ô kế tiếp trùm lên đáy
nút, và `TD.num` đứng SAU trong cây nên nó thắng phép chấm điểm. Ở chế độ BẢNG
các ô nằm CẠNH nhau nên không ai trùm — đó là lý do 1440/1024 vẫn đủ 44px.

**Vì sao cổng mới không thấy.** `do-nut-dai-cat-44px.mjs` dòng 201–212:

```js
const oNutO = nutO && nutO.getBoundingClientRect();
const chamO = oNutO ? oNutO.height : null;          // ← "chạm" = CHÍNH CHIỀU CAO HỘP
...
  nut_o_bang_hop:  oNutO ? Math.round(oNutO.height * 10) / 10 : null,
  nut_o_bang_cham: chamO === null ? null : Math.round(chamO * 10) / 10,
```

`nut_o_bang_hop` và `nut_o_bang_cham` là **cùng một biểu thức**. Bình luận ngay
trên nó viết *"Đo HAI số khác nhau, và đó là cả điểm của phép đo này"* và gọi
`_cham` là *"vùng ngón tay bấm trúng"* — nhưng trong cả tệp **không có một lời
gọi `elementFromPoint` nào**. Đây đúng họ `MOC_CAO_DONG` mà chính vòng 1 của
nhánh này đã bắt và gọi tên là **chốt giả**: một con số đứng đó để được cộng vào
dấu tick, không đo cái nó hứa đo.

Thêm nữa cổng ấy chấm trên **trang giấy tự dựng** (`#tbKep`, bảng viết tay),
không phải chế độ thẻ của ứng dụng — nên kể cả có `elementFromPoint` thì nó cũng
không bao giờ gặp hình dạng gây lỗi.

**Tôi đã tự đọc lại kết quả của chính cổng ấy** (nó không tự in ra — xem VỪA-4).
`dat_het: true`, và JSON của nó tự tố cáo:
```json
"nay":{"375":{ … "nut_o_bang_hop":44, "nut_o_bang_cham":44, …}},
"nay":{"320":{ … "nut_o_bang_hop":44, "nut_o_bang_cham":44, …}},
"doi_chung":{ … "nut_o_bang_hop":16, "nut_o_bang_cham":16, …}
```
`_hop` và `_cham` bằng nhau ở **cả 5 bộ số**, không sót bộ nào. Cổng in ra dòng
chữ *"vung CHAM 375px: 44px"* trong khi ứng dụng thật ở 375px cho **38px**.

**Bình luận trong `style.css` (dòng 2136–2141) tự khai phạm vi đo:**
> *"HÌNH HỌC ĐO ĐƯỢC trên đường vẽ thật (**1440 · 1280 · 1200px**, 6 nút) …
> `elementFromPoint` giữa hộp trả về CHÍNH NÓ → không bị gì che."*

Ba bề ngang, cả ba đều ở chế độ BẢNG. Câu kết luận thì viết cho mọi bề ngang.
**Đây là đúng cái lỗi vòng 2 đã bắt** (CAO-2: chốt 1101 từ hai số đo 1280/1440),
lặp lại lần thứ ba, trong chính bản vá của nó.

**CHỮA — một dòng, giá 0 pixel.** Tôi thử 5 phương án, tiêm CSS tại chỗ, đo lại
cả vùng chạm lẫn chiều cao dòng (`holy-rev63c-nhandinh2.mjs`):

| phương án | @375 chạm | @375 chiều cao dòng | @1440 chạm |
|---|---|---|---|
| ① nguyên bản | **38** ❌ | 137 | 45 ✅ |
| ② bỏ lề âm DƯỚI | 45 ✅ | **147 (+10)** ❌ ăn mất dòng | 45 ✅ |
| ③ bỏ HẲN lề âm | 45 ✅ | **157 (+20)** ❌ ăn mất dòng | 45 ✅ |
| **④ `position: relative; z-index: 1`** | **45** ✅ | **137 (không đổi)** ✅ | **45** ✅ |
| ⑤ nút thành block riêng dòng | 27 ❌ tệ hơn | 137 | 32 ❌ |

**Phương án ④ đạt cả hai điều kiện cùng lúc**: vùng chạm đủ 44px ở mọi bề ngang,
chiều cao dòng KHÔNG đổi một pixel nào — tức không phạm vào chốt "đừng ăn mất số
dòng thấy được" mà chính khối ấy dựng ra để tự bảo vệ. Lề âm giữ nguyên.

**Phải làm:**
1. ~~`td .dai-gon-btn { position: relative; z-index: 1; }`~~ — **ĐÃ LÀM lúc
   00:10, ngoài vòng soi. Tôi đo lại: chạm 45px ở cả 7 bề ngang. ĐÓNG.**
2. **CÒN NGUYÊN.** `do-nut-dai-cat`: `nut_o_bang_cham` phải **thật sự** quét
   `elementFromPoint`, và phải có một khung ở chế độ THẺ (≤980px), không chỉ
   bảng. Tệp chưa được đụng tới (0 lời gọi `elementFromPoint`).
3. **CÒN NGUYÊN, và nay gấp hơn.** Bình luận mới trong `style.css` đã khai rằng
   cổng làm cả hai việc trên. Hoặc sửa cổng cho khớp lời khai, hoặc sửa lời khai
   cho khớp cổng — **không được để nguyên**, vì một câu chứng nhận sai còn nguy
   hơn một cổng mù im lặng.

> **Không phải hồi quy** — trước vòng này nút cao 15px, tức chạm 15px. 38px là
> tốt hơn nhiều. Nhưng luật nhà nói 44 và nói "đo bằng cả hai cách"; cổng vừa
> dựng ra để canh đúng chỗ này đang xanh bằng một con số không đo cái gì; và
> 375px là bề ngang Sếp nhắc **hai lần**. Ba thứ đó cộng lại là CAO.

---

# VỪA-1 · Trần `GO_TOI_DA = 2` CHẠM ĐƯỢC TRONG THỰC TẾ — nút nói dối quay lại từ lượt nới thứ BA

Vòng 2 tôi đo được 11 nút nói dối và đề nghị gỡ cả nút thật. Vòng này gỡ thật,
và chặn dao động bằng `GO_TOI_DA = 2` với lời khai:

> *"2 là đủ để dọn sạch mọi ca kéo co / xoay máy **đo được**, và vẫn chặn cứng
> cái vòng lặp giả định."* (`app.js` dòng 12136)

**Tôi đo lại — câu ấy sai.** Nới rồi thu 5 vòng liên tiếp trên bảng SKU, không
vẽ lại bảng giữa chừng (`holy-rev63c-nut.mjs`):

```
@1440px và @1280px, giống hệt nhau:
  vòng 1: NỚI → nói dối 0 ‖ THU → thật 4   soGo={"0":7,"1":4}
  vòng 2: NỚI → nói dối 0 ‖ THU → thật 4   soGo={"0":7,"2":4}
  vòng 3: NỚI → nói dối 4 ‖ THU → thật 4   soGo={"0":7,"2":4}   ← CHẠM TRẦN
  vòng 4: NỚI → nói dối 4 ‖ THU → thật 4
  vòng 5: NỚI → nói dối 4 ‖ THU → thật 4
@1024px: soGo đứng nguyên {"0":11} suốt 5 vòng — không ô nào chạm trần.
```

Từ lượt nới thứ ba trở đi, **4 cái nút "Xem thêm" ở lại trên ô đã hết kẹp** —
đúng trạng thái "nút nói dối" mà VỪA-2 vòng 2 đi chữa, chỉ là 4 thay vì 11.

**Đường thật để tới đó có tồn tại**: `luoiBang()` chỉ chạy lại khi `childList`
đổi; `resize` chỉ gọi `quetHet` (dải cuộn ngang), **không vẽ lại bảng**. Nên ba
lần xoay máy tính bảng / kéo co cửa sổ mà không có lượt tải dữ liệu nào xen vào
là đủ. Bộ đếm chỉ được xoá khi bảng vẽ lại thật.

**Đánh giá:** vẫn tốt hơn hẳn bản trước (0 nút nói dối trong 2 lượt đầu, thay vì
11 nút ngay lượt đầu), và cái trần đã được khai đích danh — không giấu. Nhưng
lời khai "đủ để dọn sạch MỌI ca đo được" là **một giả thuyết trình bày như số
đo**, đúng cái lỗi mà chính đoạn bình luận ấy đang lên án ở dòng ngay trên
(*"Đó là một GIẢ THUYẾT được trình bày như một SỐ ĐO"*).

**Đề nghị:** vì cả tôi (vòng 2, 40 mẫu) và người xây đều **không tái lập được
dao động** ở bố cục nào, cái trần đang bảo vệ một thứ chưa ai thấy bằng cách
tạo ra một thứ đã thấy. Hoặc bỏ trần, hoặc nâng lên và **đặt lại bộ đếm khi số
lần GẮN cũng tăng** (dao động thật thì gắn/gỡ xen kẽ, còn kéo co thì không).
Tối thiểu: sửa câu khai cho đúng, kèm con số "trần chạm ở lượt nới thứ 3".

---

# VỪA-2 · `.dai-gon-btn` thò 1px sang DÒNG KẾ TIẾP và ĂN cú bấm ở đó — đúng thứ bình luận nói là đã tránh

`style.css` dòng 2142:
> *"ĐỪNG dồn lề âm về một phía. Dồn xuống dưới thì nút thò sang vùng DÒNG KẾ
> TIẾP và **ăn cú bấm của dòng người ta đang nhắm** — tệ hơn hẳn."*

Đo trên đường vẽ thật (`holy-rev63c-nut2.mjs`), chấm đúng 0.5px dưới mép trên
của `<tr>` kế tiếp:

```
@1440 · @1280 · @1024 : elementFromPoint(giữa X, mép trên dòng sau) → NÚT
                        (thò đáy ô 1px · chồng lấn dòng sau 1px)
@375                  : không chạm dòng sau (chế độ thẻ)
```

Tức bản đối xứng -10/-10 **vẫn** ăn 1px của dòng sau, chỉ là ít. 1px là vô hại
trên thực tế (đó là viền/đệm trên của dòng sau, không có nút nào ở đó) — nhưng
câu khai viết như thể đã tránh hẳn. Sửa câu khai, hoặc thêm số đo "1px" vào đó.
Phương án ④ của CAO-1 (`z-index: 1`) sẽ làm chỗ này rõ hơn chứ không tệ đi.

---

# VỪA-3 · `holy-rev63-quet-min560.mjs` vẫn chưa mang nhãn "đã lỗi thời"

Người xây cố ý không dán nhãn vì *"đó là tài liệu của Hồ Ly"*. Tôn trọng đúng
chỗ, nhưng để một bàn đo TRƯỢT 2 nằm trong `scripts/` mà không có nhãn thì người
sau sẽ chạy nó và đi tìm một cái hồi quy không tồn tại (tôi đã tự mắc ở vòng 2).
**Tôi tự dán, ngay trong vòng này** — xem mục "Tệp soi của Hồ Ly". Không phải
việc của người xây; ghi ra để nó không rơi.

---

# VỪA-4 · `do-nut-dai-cat` KHÔNG PHẢI MỘT CỔNG TỰ CHẤM — nó là một trang cho người nhìn

`npm run do-nut-dai-cat` chạy `scripts/do-nut-dai-cat-44px.mjs`, và tệp ấy kết
thúc bằng:
```js
}).listen(8919, '127.0.0.1', () => {
  console.log('Đo dải phạm vi — mở http://127.0.0.1:8919');
});
```
**Nó dựng máy chủ rồi đứng đó.** Không tự mở trình duyệt, không in kết luận ra
màn hình, không bao giờ thoát, **không có mã thoát**. Kết luận `dat_het` được
`ve()` ghi vào DOM của trang — chỉ NGƯỜI mở trình duyệt mới đọc được.

Hệ quả:
- Con số `dat_het=true` trong lời khai **không tái lập được từ dòng lệnh**. Tôi
  phải tự viết `holy-rev63c-doc-nutdaicat.mjs` lái Chrome vào đọc hộ mới xác
  nhận được. (Xác nhận: **`dat_het: true`** — đúng như khai.)
- Cổng này **không thể nằm trong bất kỳ lượt chạy cổng tự động nào**, kể cả
  GitHub Actions. Nó là bàn nhìn bằng mắt mang tên cổng.
- **Cổng 8919 viết cứng, không có đường đổi.** Lúc tôi chạy, cổng đang bị một
  tiến trình `node` mồ côi **khởi động 22:36:49** giữ (tức chính lượt chạy của
  người xây, 22 phút trước commit — nó chưa bao giờ thoát). `npm run
  do-nut-dai-cat` khi ấy chết bằng `EADDRINUSE` — **đỏ vì cổng mạng bận, không
  vì luật 44px hỏng**, đúng lớp "đỏ nhầm lý do" mà kho mã này chống. Tôi không
  giết tiến trình của người khác; tôi chép bàn đo sang cổng 8929 để đo.

**Phải làm:** cho nó tự lái Chrome, in `KET_QUA_JSON` ra `stdout` và trả mã
thoát 0/1 (mọi cổng khác trong kho đã làm thế); cổng mạng lấy 0 để hệ điều hành
tự cấp, hoặc cho phép đổi bằng biến môi trường.

---

# THẤP

1. **`chuanHoaSel()` không gộp ba dạng viết mà PHẠM VI không nhắc:**
   `.a:hover` vs `.a:HOVER` (giả lớp phân biệt hoa/thường — CSS thì không),
   `.a::before` vs `.a:before`, `[data-x="1"]` vs `[data-x='1']`. Cả ba lệch về
   phía **BỎ SÓT**, không phải đỏ oan, nên vô hại. Kiểm trong `style.css`:
   `:before/:after` một dấu hai chấm **0 chỗ**, selector thuộc tính có nháy
   **26 chỗ** (đều cùng kiểu nháy nên chưa cắn). Mục "KHÔNG soi" ⑤ nên kể thêm.
2. **Ca `--tu-kiem` của R7 không gài được gì ở 1024px và 375px** và nói thẳng
   *"không gài được ca nào ở bề ngang này — KHÔNG KẾT LUẬN GÌ"*. Khai đúng, đây
   là cách khai tôi muốn thấy. Nhưng nghĩa là chốt R7 chỉ có răng ở 3/5 mức
   (1440 · 1280 · 1200). Ghi vào chỗ khai để đừng đọc "132/7" thành "R7 được
   chứng minh ở mọi bề ngang".
3. **`do-nut-dai-cat` chưa đo `.dai-gon-btn` trên ứng dụng thật**, chỉ trên
   trang giấy tự dựng — xem CAO-1 điểm ②. Tách riêng vì nó đúng cả khi CAO-1
   được chữa bằng cách khác.
4. **Bình luận `capNutDongPhu()` khai "K xanh ở mọi mức, R7 đỏ ở 1440 và 1280"**
   — số thật của `--tu-kiem` hôm nay là **R7 đỏ ở 1440 · 1280 · 1200** (ba mức,
   vì 1200 đã vào `RONGS`). Lệch một mức, theo chiều khiêm tốn.
5. **Cột "TRƯỚC vs SAU" của `do-nut-dai-cat` KHÔNG có tín hiệu cho nút trong ô
   bảng.** JSON: `truoc.375.nut_o_bang_hop = 44` — bằng đúng `nay.375`. Vì
   `CSS_TRUOC` không gỡ khối `td .dai-gon-btn`, nên hai khung "bản trước" vẫn ăn
   luật 44px của hôm nay. Chỉ cột `doi_chung` (16px) có tín hiệu. Không sai kết
   luận, nhưng hai con số ấy đang trông như một phép so mà không so gì cả.
6. **`do-tu-lam-moi` nay là 51 / 3, không phải 52 / 2** — thêm một dòng đỏ so
   với lời khai. Xem mục ⑦: **không phải nợ của vòng này**, nhưng con số trong
   lời khai đã cũ và nên sửa.

---

## ① `do-nap-lai` ĐỎ VÌ MÔI TRƯỜNG — lời khai ĐÚNG, và tôi đã đo cả LỚP

**Tiền đề: đúng, từng byte.**
```
core.autocrlf = true   (file:C:/Program Files/Git/etc/gitconfig)   · không có .gitattributes
cây làm việc: src/doc-bang.js  CR=768 = LF=768  → CRLF 100% số dòng
125 / 126 tệp chữ trong kho mang CRLF
git show origin/main:src/doc-bang.js | tr -d '\r'  ==  tr -d '\r' < src/doc-bang.js
  → GIỐNG HỆT TỪNG KÝ TỰ. Mã không đổi, chỉ ký tự xuống dòng đổi.
```
`docNguon()` đặt đúng một chỗ, dòng 1465 dùng nó. **`do-nap-lai` 191 ĐẠT · 0
TRƯỢT** — khớp lời khai.

### CON SỐ CỦA LỚP "bàn đo so chuỗi `\n` trên kho mã CRLF"

Đo VI SAI, không đoán: rút mọi regex/chuỗi-kim trong từng bàn đo, chạy trên HAI
bản của đúng những tệp nó đọc (CRLF thật và LF), đếm cái **khớp trên LF mà trượt
trên CRLF** (`holy-rev63c-crlf-v4.mjs`).

> Tiền đề kỹ thuật tôi tự kiểm 9/9 trước khi tin con số: trong JavaScript `$`
> và `^` với cờ `/m` **nhận cả `\r`**, `[\s\S]*?` và `\s*` **nuốt `\r`**, `\n`
> đi TRƯỚC ký tự cụ thể vẫn sống. Chỉ `X\n` với `X` là ký tự cụ thể mới chết.
> Bỏ qua bước này là ra một con số to gấp năm lần và vô nghĩa.

| tầng | số bàn đo | |
|---|---|---|
| tổng `.mjs` trong `scripts/` + `scripts/lib` | **129** | |
| trong đó **ĐỌC mã kho từ đĩa** | **49** | mẫu số thật của lớp này |
| **T3 · ĐÃ PHÒNG** (`replace(/\r\n/g)` hoặc `\r?\n`) | **10** | `do-kho-tai-lieu` · `do-kiem-ke-lam-moi` · `do-lo-va-dieu-chinh` · `do-man-mo-ra-xem-duoc` · `do-nap-lai` · `do-pdf-scan` · `do-so-do-bieu-tuong` · `do-tach-vai-tro` · `do-tu-lam-moi` · `tu-kiem-giao-dien-0007` |
| **T1 · CHẾT HÔM NAY** | **0** | ✅ `do-nap-lai` là cái cuối cùng, và đã đóng |
| **T2 · SỐNG NHỜ MAY** | **9** | biểu thức có vắt qua ranh dòng, sống được **chỉ vì** `\s*`/`[\s\S]` nuốt hộ `\r` |
| T0 · đọc thô, không vắt ranh dòng | 30 | không dính được |

**Trả lời thẳng câu hỏi: 0 bàn đo còn CHẾT vì lớp này. Vá đúng và vá hết.**

**Nhưng lớp chưa đóng, và đây mới là con số đáng lo: 9 bàn đo đang sống nhờ
may.** Chúng dùng `[\s\S]*?` hoặc `\s*` bắc qua ranh dòng — đổi đúng một ký tự
trong biểu thức là chết, im lặng, trên máy Windows nào cũng chết:

```
do-ba-mau · do-cat-im-lang · do-nut-dai-cat-44px · do-quyen-duyet-gopy
do-sua-viec-da-giao · ho-ly-rev0060-b · ho-ly-rev0060 · holy-do-8-nguoi-that
holy-quet-cat-vong3
```
Ví dụ `do-nut-dai-cat-44px.mjs` dòng 89 — chính cổng của CAO-1:
`/td \.dai-gon-btn \{[\s\S]*?\n\}/`. Nó gỡ được luật 44px hôm nay chỉ vì
`[\s\S]` nuốt `\r`. Đổi thành `[^}]*?\n\}` là ca đối chứng câm, và tệp có sẵn
lời chặn `HỎNG: không gỡ được luật` nên nó sẽ kêu — nhưng 8 tệp kia thì không.

**Lịch sử của lớp**: đã bị bắt và vá **3 lần** — `do-so-do-bieu-tuong`
(29/08/2026, có bình luận dài đúng nội dung này), `do-kho-tai-lieu` và
`do-quyen-man-viec-gop` (tuần trước, REV của tôi), `do-nap-lai` (vòng này). Bốn
lần cùng một lỗi ở bốn tệp khác nhau nghĩa là **chỗ chữa không phải từng tệp**.

**Đề nghị (không thuộc vòng này — mở nợ):** thêm `* text=auto eol=lf` vào
`.gitattributes` (kho chưa có tệp này) để cây làm việc thôi mang CRLF; hoặc đưa
`docNguon()` vào `scripts/lib/` và bắt mọi bàn đo dùng nó. Chi phí 0, chặn cả
lớp thay vì chặn từng con.

---

## ② `capNutDongPhu()` nay GỠ nút — hồi quy: SẠCH, trừ cái trần

**TỐC ĐỘ — không có hồi quy.** A/B trên cùng một cây, chỉ khác đúng một dòng
(`} else if (nutCu) {` ↔ `} else if (nutCu && nutCu.dataset.doan) {`), sửa trong
BẢN TẠM của bàn đo qua `suaTep` (`assets/js/app.js` nằm trong danh sách nhận
`suaTep` — tôi đã kiểm), 303 dòng trong `kd-sku-kem`, 5 lượt vẽ lại:

```
NAY (có gỡ nút thật) : 10.3 · 34.1 · 33.0 · 33.1 · 33.7 ms
CŨ  (chỉ gỡ nút đoán): 17.6 · 33.7 · 32.5 · 33.6 · 34.4 ms
→ vòng gỡ nút KHÔNG tốn gì đo được.
```

**HAI BẢNG CÙNG VẼ LẠI** — `capNutDongPhu()` quét toàn tài liệu mỗi lượt, nên
vẽ lại `kd-sku-kem` cũng chấm lại ô của `kd-sku-chay`. Đo `soGo` của cả 11 ô
`.sm` qua 5 vòng: bộ đếm **chỉ nhích ở đúng những ô có nút thật bị gỡ**
(`{"0":7,"2":4}`), không có ô nào bị cộng oan. Không lây chéo.

**CHẠM TRẦN** — xem VỪA-1.

---

## ③ Ba lớp mới của `do-luat-css-chet` — KHÔNG báo oan, và ERP có **0 ca đỏ oan**

`npm run do-luat-css-chet` → **✅ 0 luật chết đổi hành vi / 196 khai báo**,
đối chứng **21/21**, mục PHẠM VI khai đủ **7 chỗ mù** (①–⑦). Khớp lời khai.

**Tôi gài theo CÁCH 17, nhắm thẳng vào lớp mới "@media bị @media phủ đứng sau
đè"** — 13 ca, trong đó 6 ca dựng riêng để BẪY nó báo oan
(`holy-rev63c-css.mjs`):

| ca | cần | được |
|---|---|---|
| 17a media hẹp ← media rộng hơn đứng sau (phủ thật) | BẮT | ✅ BẮT |
| 17b media rộng ← media hẹp hơn (chỉ đè một phần dải) | không | ✅ không |
| 17c `max` ← `min` (không so được) | không | ✅ không |
| 17d `min` hẹp ← `min` rộng hơn (đối xứng) | BẮT | ✅ BẮT |
| 17e `min` rộng ← `min` hẹp hơn | không | ✅ không |
| 17f `min`+`max` cùng lúc ← `max` rộng hơn | không | ✅ không |
| 17g cùng điều kiện, khác chính tả khoảng trắng | BẮT | ✅ BẮT |
| **17h ⚠️ kẻ đè ưu tiên THẤP hơn** | không | ✅ không |
| **17i ⚠️ kẻ đè đứng TRƯỚC trong tệp** | không | ✅ không |
| **17j ⚠️ kẻ bị đè có `!important`** | không | ✅ không |
| 17k media ← media rộng hơn + viết gộp nuốt (hai lớp cùng lúc) | BẮT | ✅ BẮT |
| **17l ⚠️ `@media print` đứng sau** | không | ✅ không |
| **17m ⚠️ selector khác nghĩa** | không | ✅ không |

**13/13 đúng. Lớp mới KHÔNG báo oan** trong bất kỳ ca bẫy nào tôi dựng được.
`phuMedia()` trả `false` ở mọi điều kiện nó không dám khẳng định, đúng như khai.

**CÁCH 16 — đếm ca ĐỎ OAN của nhóm viết-gộp-không-tính-được-giá-trị.**
Người xây tự khai nhóm này *"bị kêu ĐỎ, có thể đỏ oan"*. Tôi xác nhận **rủi ro
là CÓ THẬT** — dựng 4 ca, 3 ca đỏ mà hành vi KHÔNG đổi:

```
16a  @media .z{background-color:#fff}  ←  .z{background:#fff}      → ĐỎ, oan
16b  @media .z{border-color:red}       ←  .z{border:1px solid blue} → ĐỎ, ĐÚNG
16c  @media .z{font-size:12px}         ←  .z{font:12px/1.4 sans}    → ĐỎ, oan
16d  @media .z{transition-duration:.2s}←  .z{transition:all .2s ease}→ ĐỎ, oan
```

**Nhưng trong ERP hôm nay con số là 0:**
```
tổng khai báo trong @media                                     : 196
ĐỎ (đổi hành vi)                                               : 0
VÀNG (thừa, cùng giá trị)                                      : 0
ĐỎ vì KHÔNG TÍNH ĐƯỢC giá trị viết gộp (nhóm có thể đỏ oan)    : 0
tổng ca bắt QUA đường viết-gộp                                 : 0
```

**Kết luận về câu hỏi "cổng có báo oan không": KHÔNG, không một ca nào trong
ERP.** Lựa chọn *"chọn ồn hơn là im"* là đúng và hôm nay không tốn gì cả. Khi
nào `style.css` có một `background-color`/`font-size`/`transition-duration`
trong `@media` bị viết gộp nền đè thì mới phải trả giá — chưa có.

---

## ④ Quét dải — TÔI TỰ QUÉT LẠI, và quét thêm cả phía DƯỚI

Chép nguyên cây, đổi đúng một dòng `RONGS`, không sửa gì khác
(`holy-rev63c-dai-tren.mjs` · `holy-rev63c-dai-duoi.mjs`).

**TRÊN — 39 mức, 1090 → 1440 bước 10, cộng 1100 · 1101 · 1245 · 1246:**
```
1440 1430 1420 1410 1400 1390 1380 1370 1360 1350 1340 1330 1320 1310 1300
1290 1280 1270 1260 1250 1246 1245 1240 1230 1220 1210 1200 1190 1180 1170
1160 1150 1140 1130 1120 1110 1101 1100 1090
TỔNG: ĐẠT 948 · TRƯỢT 36
→ arm A (bảng tràn)         : 0 trượt
→ arm R4 (tràn đường vẽ thật): 0 trượt
→ arm B2 (mất đường xem)     : 0 trượt
→ arm K · R7 (kẹp không lối) : 0 trượt
→ arm E4 : 36 ĐỎ — đúng 36 mức KHÔNG có trong `MOC_CAO_DONG` (39 − 3)
→ TRƯỢT vì bất kỳ lý do NÀO KHÁC arm E4 : 0
```
**Dải tràn 1101–1245 của vòng 2 đã ĐÓNG. Vạch 1246 đúng.**

**DƯỚI — 16 mức, xem vạch mới có mở dải hỏng nào bên dưới không:**
```
1089 1080 1024 1000 980 900 820 768 640 560 480 414 390 375 360 320
TỔNG: ĐẠT 395 · TRƯỢT 14
→ arm A · R4 · B2 · K · R7 : 0 trượt ở TẤT CẢ 16 mức
→ arm E4 : 14 ĐỎ — đúng 14 mức không có mốc (16 − 2)
→ TRƯỢT vì bất kỳ lý do NÀO KHÁC arm E4 : 0
```
**Không có dải hỏng mới ở phía dưới.** Kể cả 320px.

**Arm E4 có răng thật.** 36 + 14 = 50 lượt đỏ, khớp CHÍNH XÁC số mức chưa có
mốc. Chốt *"vẽ vạch mới thì phải thêm mức đo, thêm mức đo thì phải thêm mốc"*
không phải câu chữ — nó chặn ngay khi tôi bật mức mới. Đây là chỗ vòng này làm
tốt nhất.

> Lưu ý cho người đọc số: 50 dòng đỏ ấy là **do tôi bật thêm mức**, không phải
> lỗi của nhánh. Cổng thật (`RONGS` 5 mức) không có dòng nào.

---

## ⑤ Ba ca xấu người xây tự nêu — xác nhận từng cái

### ⓐ Ca `--tu-kiem` đầu tiên XANH GIẢ — XÁC NHẬN, và đã chữa ĐÚNG CHỖ

Gỡ nút ở một lượt `chay()` rồi quét ở lượt sau thì DOM đổi → đánh thức
`MutationObserver` → `luoiBang()` → `capNutDongPhu()` gắn nút về chỗ cũ trước
khi phép quét kịp nhìn. Ứng dụng TỰ CHỮA vết gài. Nay `GAI_GO_NUT_ROI_DO_R7`
gộp gài-và-đo vào **một biểu thức đồng bộ** (`do-bang-that.mjs` dòng 490–508,
`const xau = ${DO_KEP_IM_LANG}` nằm ngay trong cùng hàm). Đúng cách chữa.

**Chứng minh nó có răng:** `--tu-kiem` = **132 ĐẠT · 7 TRƯỢT**, trong đó
**4 arm A** trên `bang-gai-tu-kiem` + **3 arm R7** ở 1440 · 1280 · 1200 từ đúng
ca này. **Arm K: 0 đỏ** — đúng như dự đoán, K là tập con của R7.

**KIỂM CÒN BÀN ĐO NÀO CÙNG CẢNH KHÔNG — có, và đáp số là KHÔNG.**
Cảnh nguy hiểm rất hẹp: gài bằng cách **GỠ một thứ mà `app.js` tự dựng lại**
(`.dai-gon-btn` · `.o-chitiet` · `.cuon-bao` · `.co-chitiet` · `.cot-phu`), rồi
đo ở lượt `chay()` khác. Quét cả `scripts/`:
```
(dai-gon-btn|o-chitiet|cuon-bao|co-chitiet|cot-phu) … .remove()   →  0 khớp
```
Ngoài `GAI_GO_NUT_ROI_DO_R7` (đã chữa) **không bàn đo nào khác gỡ thứ ứng dụng
tự dựng lại**. Các lượt `chay()` "sửa DOM rồi đo lượt sau" còn lại — `MO_HET`
(bỏ `hidden`), `CHEN_DONG_THAT` (chèn dòng), `GAI_BANG_TRAN` (thêm bảng) — đều
là thứ ứng dụng **KHÔNG** hoàn tác, và `do-bang-that` còn cố ý `await cr.doi(800)`
để observer kịp chạy. Không có ca thứ hai.

### ⓑ `::after` 44px là bẫy, bench của TÔI in "74×24" — XÁC NHẬN

Đúng: `getBoundingClientRect()` không thấy `::after`, nên bàn đo đọc hộp sẽ báo
24px trong khi ngón tay bấm đủ. Chọn hộp thật + lề âm là đúng chiều.

**Kiểm bench của tôi có còn đo nhầm kiểu đó ở đâu không:** tôi soi lại các tệp
soi của mình. Không tệp nào của tôi đo nút bằng `::after`. **Nhưng tôi tìm ra
một lỗi phép đo khác trong chính bản đầu của bàn đo tôi viết hôm nay**, và ghi
ra vì nó cùng họ:
- `holy-rev63c-nut.mjs` bản đầu gọi `elementFromPoint` mà **không cuộn nút vào
  khung nhìn** → mọi nút dưới nếp gấp trả `null`, tôi suýt đọc thành "có thứ
  che nút". Đã thêm `scrollIntoView({block:'center'})`.
- `holy-rev63c-nhandinh.mjs` bản đầu sửa `style.css` qua `suaTep` — mà
  `dungMayGia()` chỉ đưa `suaTep` cho `app.html` + 4 tệp `.js`, **CSS không nằm
  trong danh sách**. "Ba bản đối chứng" thật ra là ba lần chạy CÙNG MỘT BẢN, và
  số đo giống hệt nhau đã tố cáo điều đó. Bản 2 tiêm CSS tại chỗ và **tự in ra
  `margin-bottom` sau khi tiêm** để chứng minh đã đổi được gì. Đó là bài học tôi
  vẫn đòi người khác: ca đối chứng phải tự chứng minh nó đổi được cái gì.

### ⓒ Lề âm đè 10px cuối phần chữ — XÁC NHẬN, và đánh đổi ĐÚNG

Đo được: `đèChữ 10px` ở mọi bề ngang, `elementFromPoint` giữa hộp → **NÚT**.
Bấm vào 10px cuối của dòng chữ đang bị cắt thì trúng nút và chữ bung ra — đúng
thứ người dùng muốn, không mất gì.

**Đánh giá quyết định "không dồn lề âm xuống dưới": ĐÚNG.** Tôi thử dồn (ca ②
và ③ của CAO-1): chạm đủ 44px nhưng **dòng cao thêm 10–20px**, tức ăn mất số
dòng thấy được — phạm đúng điều Sếp cấm. Giữ đối xứng là đúng.
Chỉ có hai chỗ lời khai cần sửa: nó **vẫn** ăn 1px của dòng sau (VỪA-2), và ở
chế độ thẻ thì chiều ngược lại xảy ra — ô sau ăn 8–9px của nút (CAO-1).

**Tự bấm thử ở 375px:** `elementFromPoint` giữa hộp → NÚT ✅ · góc trên-trái,
trên-phải → NÚT ✅ · **góc dưới-trái, dưới-phải → `TD.num` ❌**. Hai trong bốn
góc trượt. Đây là chỗ tôi lấy làm CAO-1.

---

## ⑥ Năm chỗ tự cắt phạm vi — đánh giá từng chỗ

| chỗ tự cắt | phán xử |
|---|---|
| **Ca F vẫn lọt có chủ ý** (selector khác mà khớp cùng phần tử) | **ĐỒNG Ý.** Cần cây DOM thật mới quyết được; máy đọc một tệp CSS thì không có. Tôi đếm lại trong ERP: **0 ca**. Khai đúng, cắt đúng. |
| **Nhóm viết gộp có thể đỏ oan** (*"chọn ồn hơn là im"*) | **ĐỒNG Ý.** Rủi ro có thật (tôi dựng được 3 ca), nhưng ERP hôm nay **0 ca**. Im ở chỗ không biết thì đúng bằng không có cổng — chọn ồn là đúng. |
| **`phuMedia()` chỉ dám khẳng định với `max-width`/`min-width` đơn** | **ĐỒNG Ý, và đây là chỗ làm tốt.** 13/13 ca của tôi xác nhận nó trả `false` ở mọi điều kiện phức tạp thay vì đoán. Thà bỏ sót còn hơn đỏ oan — đúng thứ tự ưu tiên cho một cổng chặn đẩy. |
| **Arm R7 hỏi theo Ô chứ không theo TỪNG phần tử** (31 ô @1024 · 24 ô @375) | **ĐỒNG Ý VỚI VIỆC KHÔNG SIẾT**, nhưng xem THẤP-2: hệ quả là ca `--tu-kiem` của R7 **không gài được gì ở 1024 và 375**, và nó nói thẳng "KHÔNG KẾT LUẬN GÌ" thay vì in dấu tick. Khai như thế là đúng. Chỉ cần ghi rõ rằng R7 mới được chứng minh ở 3/5 mức. |
| **Chưa dán nhãn "lỗi thời" cho `holy-rev63-quet-min560.mjs`** | Xem VỪA-3 — tôi tự dán. |

---

## ⑦ Chạy lại HẾT cổng

| cổng | người xây khai | tôi đo | |
|---|---|---|---|
| `do-bang-that` | 134 / 0 | **ĐẠT 134 · TRƯỢT 0** | khớp |
| `do-bang-that --tu-kiem` | 132 / 7 | **ĐẠT 132 · TRƯỢT 7** (4×A + 3×R7, K xanh) | khớp |
| `do-bang-vua-man` | 46 / 0 | **46 / 0** | khớp |
| `do-luat-css-chet` | 0 / 196 | **0 / 196**, đối chứng **21/21**, 7 chỗ mù | khớp |
| `do-nap-lai` | 191 / 0 | **ĐẠT 191 · TRƯỢT 0 · ✅ XANH** | khớp |
| `do-mo-ra-xem-duoc` | 1292 / 0 | **Chấm 1292 phép · HỎNG 0** | khớp |
| `do-cat-im-lang` | SẠCH | **SẠCH** | khớp |
| `cong-khoi` @1440 | XANH | **✅ XANH** | khớp |
| `cong-khoi --rong 375` | XANH | **✅ XANH** | khớp |
| `do-nut-dai-cat` | `dat_het=true` | **`dat_het=true`** | khớp — nhưng phải tự lái Chrome vào đọc (VỪA-4), và `nut_o_bang_cham` không đo cái nó hứa (CAO-1) |

### Nợ cũ — không nhận, nhưng một con số đã đổi

| | lời khai | tôi đo hôm nay |
|---|---|---|
| `do-tu-lam-moi` | 52 / 2 | **51 / 3** ← đổi |
| `do-gop-viec` | đỏ (nợ `f699272`) | đỏ, y nguyên |

Dòng đỏ thứ ba là mới, nên tôi truy xem nó của ai:
```
vòng 2 (tại 1b255d9): ❌ 112 hàm ghi đều đã khai — CHƯA KHAI: kdTachDongHang
hôm nay (tại 3283b48): ❌ 117 hàm ghi đều đã khai — CHƯA KHAI: khoDieuChinh, kdTachDongHang
                       ❌ không khai thừa tên hàm không tồn tại — THỪA: napLuot
```
`khoDieuChinh` và `napLuot` là hàm của **đường nạp file + phiếu điều chỉnh tồn
kho**, tức phần việc của `main af951b8` (`napLuot` vào từ `239f983`). Và:
```
git diff --stat af951b8 HEAD -- public/assets/js/lam-moi.js public/assets/js/api.js
→ RỖNG
```
**Nhánh này chưa từng chạm vào hai tệp quyết định cổng ấy.** Con số đổi ở lượt
gộp `aa6245f`, không ở lượt vá `3283b48`. **Không phải nợ của vòng này** — nhưng
là nợ THẬT của `main`, và lời khai "52/2" đã cũ. Ghi vào sổ hàng đợi.

**Cổng ĐỎ khi được cho nhìn đúng chỗ:** không có. Lần này tôi bật thêm 55 bề
ngang và không moi ra được dòng đỏ nào ngoài `E4` báo thiếu mốc — tức đúng việc
của nó.

---

## Vá vòng 2: đã kiểm, ĐẠT cả 11

| vòng 2 | trạng thái |
|---|---|
| **CHẶN-1** gộp `main` không sạch | **ĐẠT.** `git merge-base --is-ancestor origin/main HEAD` → đúng. Khối `.kd-sku-cot` giữ `minmax(360px,1fr)` + `table { min-width: min(560px,100%) }` (phía NHÁNH, như tôi đo). Lý do ghi ngay tại chỗ (style.css 4865–4884) kèm đúng dòng **"NGƯỜI GỘP SAU: đừng 'khôi phục' 560px"**. |
| **CAO-1** luật CSS chết (viết gộp đè viết rời) | **ĐẠT.** Đệm bảng vá bằng `table thead th` + thêm dòng `.table-wrap-cuon` (0,1,3 thắng 0,1,2). `.chat-nhap` vá bằng `form.chat-nhap` (0,1,1 thắng 0,1,0) — `<form id="chat-form" class="chat-nhap">` có thật trong `app.html`, tôi đã kiểm. Cổng mở 3 lớp, lòi ra luật chết thứ ba `.login-panel` @980px. 0/196. |
| **CAO-2** vạch 1101 → dải tràn 1101–1245 | **ĐẠT.** Vạch lên 1246, `RONGS` thêm 1200. Tôi quét 39 mức trên + 16 mức dưới: **0 tràn, 0 mất đường xem**. |
| **VỪA-1** lời khai arm K | **ĐẠT.** `do-cat-im-lang.mjs` dòng 49–64 đính chính bằng đúng số đo của tôi (K bắt 1 bảng · R7 bắt 15 · "chỉ K thấy" = KHÔNG CÓ), kèm câu *"đừng bao giờ lấy 'vẫn còn K' làm lý do bỏ R7"*. |
| **VỪA-2** nút nói dối | **ĐẠT về việc gỡ** (0 nút nói dối ở nền và 2 lượt nới đầu, so với 11 trước đây) · **hở ở cái trần** — VỪA-1 vòng này. Tốc độ: không hồi quy. |
| **VỪA-3** `.dai-gon-btn` 44px | **ĐẠT VỀ HỘP** (74.3 × 44, `min-height: 44px`, lề -10/-10, `inline-flex`, dòng chỉ cao thêm ~3px) · **TRƯỢT VỀ VÙNG CHẠM ở điện thoại** — CAO-1 vòng này. |
| **THẤP-1** `MAU.length` | **ĐẠT** — in "21 mẫu", đếm được 21 dòng đối chứng. |
| **THẤP-2** "~1230px" → 1086px | **ĐẠT** — style.css 4881 ghi 1086px (1080px → 1 cột), đúng số tôi đo. |
| **THẤP-3** "main 3/187" → 3/189 | **ĐẠT.** |
| **THẤP-4** ca `--tu-kiem` cho R7 | **ĐẠT** — có ca đứng sẵn, R7 đỏ 3 mức, và nó tự khai "KHÔNG KẾT LUẬN GÌ" ở 2 mức không gài được. Cách khai đúng. |
| **THẤP-5** ô `.sm` chỉ chở ảnh | **ĐẠT** — ghi rõ chỗ lệch phạm vi và chiều lệch là AN TOÀN (thừa nút, không thiếu). |

---

## Việc phải làm trước khi đẩy

1. **CAO-1** — phần CSS **đã xong lúc 00:10** (tôi đo lại: chạm 45px ở cả 7 bề
   ngang, không hồi quy). **Còn hai việc:** `do-nut-dai-cat` phải thật sự quét
   `elementFromPoint` và phải có một khung ở chế độ THẺ; và **sửa bình luận vừa
   viết trong `style.css`**, vì nó đang khai cổng làm hai việc đó rồi.
2. **VỪA-1** — sửa câu khai `GO_TOI_DA`, hoặc bỏ/nới trần (trần chạm ở lượt nới
   thứ 3, trả lại 4 nút nói dối).
3. **VỪA-2** — thêm số "1px" vào câu khai về dòng kế tiếp.
4. **VỪA-4** — `do-nut-dai-cat` phải tự lái Chrome, in JSON ra `stdout`, trả mã
   thoát, và thôi viết cứng cổng 8919.
5. THẤP 1–6.
6. *(mở nợ, không thuộc vòng này)* `.gitattributes` `* text=auto eol=lf`, hoặc
   `docNguon()` lên `scripts/lib/` — 9 bàn đo đang sống nhờ may.
7. *(mở nợ của `main`)* `do-tu-lam-moi` 51/3 — khai `khoDieuChinh`, bỏ `napLuot`
   thừa trong `lam-moi.js`.

---

## Tệp soi của Hồ Ly (không phải cổng của kho mã)

Nằm trong `scripts/`, chạy được độc lập, **không tệp nào sửa mã sản phẩm**:
`holy-rev63c-dai-tren.mjs` (quét 39 mức 1090–1440) ·
`holy-rev63c-dai-duoi.mjs` (quét 16 mức 320–1089) ·
`holy-rev63c-nut.mjs` (trần `GO_TOI_DA` · nới-thu · hai bảng · hình học nút) ·
`holy-rev63c-nut2.mjs` (A/B tốc độ · chạm sạch, chỉ mở tab Kinh doanh) ·
`holy-rev63c-cham375.mjs` (quét từng pixel vùng chạm, 7 bề ngang) ·
`holy-rev63c-che375.mjs` (ai che đáy nút) ·
`holy-rev63c-nhandinh2.mjs` (5 phương án chữa, đo cả chạm lẫn chiều cao dòng) ·
`holy-rev63c-nutdaicat-8929.mjs` + `holy-rev63c-doc-nutdaicat.mjs` (chép
`do-nut-dai-cat` sang cổng rảnh rồi lái Chrome vào đọc `dat_het` hộ nó).
Trong scratchpad: `holy-rev63c-crlf-v4.mjs` (đo vi sai LF/CRLF, 3 tầng) ·
`holy-rev63c-css.mjs` (cách 16 và 17 gài cổng CSS) ·
`holy-rev63c-xanhgia.mjs` (tìm bàn đo cùng cảnh XANH GIẢ).

> ⚠️ **`scripts/holy-rev63-quet-min560.mjs` ĐÃ LỖI THỜI** (VỪA-3). Nó chấm cột
> phụ theo LỚP (`classList.contains('cot-phu')`) chứ không theo `display`, nên
> hai dòng đỏ `G2 @1440/@1280 — nút "Chi tiết" 0x0` của nó **KHÔNG phải hồi
> quy**: ở ≥1246px hai cột đã nằm trên bảng nên nút bị ẩn có chủ ý.
> `do-bang-that` hiện hành đã sửa nghĩa. Đừng chạy tệp này để tìm hồi quy.

**Không commit, không push, không sửa mã sản phẩm — về phía tôi.**
Kiểm lại lúc 00:05: `git diff HEAD` RỖNG, sha256 của `app.js` · `style.css` ·
`app.html` khớp `HEAD`. Tôi chỉ thêm tệp chưa theo dõi (`scripts/holy-rev63c-*.mjs`
và `docs/reviews/REV-0063-*`).

⚠️ **Lúc 00:10 có người khác sửa `public/assets/css/style.css`** (+58 / −8, chưa
commit) — xem khung cảnh báo đầu tệp. `git diff HEAD` bây giờ KHÔNG còn rỗng, và
đó **không phải việc của tôi**. `app.js` và `app.html` vẫn nguyên.
