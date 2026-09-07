# REV-0063 vòng 2 — Bảng SKU tràn @1024px · Hồ Ly

# KẾT LUẬN: **FAIL** — 1 CHẶN · 2 CAO · 3 VỪA · 5 THẤP

Nhánh `fix/bang-sku-tran-1024` @ `1b255d9` · đối chiếu `origin/main` @ `af951b8`
· đo 07/09/2026, Chrome thật, `scripts/lib/ban-do-chrome.mjs`.

Vòng 1 tôi FAIL với 2 CAO + 4 VỪA + 2 THẤP. **Cả 8 chỗ ấy đã vá đúng và tôi đã
đo lại từng chỗ** — xem mục "Vá vòng 1: đã kiểm" ở cuối. Cái làm vòng này vẫn
FAIL là ba chỗ MỚI, và cả ba đều là **cùng một lớp lỗi mà vòng này tự tuyên bố
đã đóng**: một luật CSS chết mà cổng mới không thấy, một dải bề ngang mà bàn đo
mới không đo, và một cuộc gộp không sạch.

Mọi con số dưới đây tôi tự đo lại, không lấy lại của người xây.

---

## CHẶN-1 · Gộp với `main` KHÔNG SẠCH — hai nhánh chữa CÙNG một lỗi theo hai cách ngược nhau

`git merge-tree --write-tree origin/main HEAD` → **CONFLICT trong
`public/assets/css/style.css`**, đúng khối `.kd-sku-cot`:

| | `origin/main af951b8` | nhánh này |
|---|---|---|
| cách chữa | `minmax(**560px**, 1fr)` — nâng sàn của LƯỚI | `minmax(**360px**, 1fr)` + `table { min-width: min(560px, 100%) }` — chữa gốc ở BẢNG |

Hai bên vá cùng một triệu chứng (`kd-sku-chay`/`kd-sku-kem` tràn +23px @1440),
không biết nhau. **Không có cách gộp tự động nào đúng ở đây** — phải chọn tay.

Tôi đã dựng cây gộp thật (lấy phía nhánh) và chạy lại:
`do-bang-that` **109 ĐẠT / 0 TRƯỢT** · `do-luat-css-chet` **0 / 193** ·
`do-cat-im-lang` **SẠCH**. Tức phía nhánh gộp vào là an toàn.

**Phán xử: phải lấy phía NHÁNH.** Lý do đo được, không phải sở thích: với sàn
560px của `main`, ở màn 1440px lưới chỉ rộng 1094px < 560×2+20 = 1140 → **hai
bảng SKU XẾP CHỒNG ngay trên màn Sếp đang ngồi**. Nhánh này giữ hai bảng cạnh
nhau (khung 537px mỗi bảng) và vẫn 0 tràn. Chọn nhầm phía là mất bố cục hai cột
ở đúng màn rộng nhất.

Không được đẩy trước khi Sếp/người gộp chốt chỗ này bằng tay.

---

## CAO-1 · Luật CSS chết THỨ TƯ — nằm cách luật vừa vá đúng 2 dòng, và cổng mới báo SẠCH

Vòng này dựng `npm run do-luat-css-chet` để "lần sau không phải tìm bằng tay
nữa", và nó xanh: `✅ ĐẠT — 0 luật chết đổi hành vi / 191 khai báo trong @media`.

**Đo bằng Chrome thật, luật này CHẾT:**

```css
/* style.css dòng 1544 */
@media (max-width: 1100px) {
  thead th, tbody td { padding-left: 10px; padding-right: 10px; }
```
bị đè bởi luật nền đứng SAU, cùng độ ưu tiên:
```css
/* dòng 1965 */ thead th { padding: 11px 16px; }
/* dòng 1978 */ tbody td { padding: 13px 16px; }
/* dòng 2825 */ .table-wrap-cuon thead th { padding: 9px 16px; }   ← ưu tiên CAO HƠN
/* dòng 2827 */ .table-wrap-cuon tbody td { padding: 8px 16px; }   ← ưu tiên CAO HƠN
```

Số đo `getComputedStyle` trên `kd-tq-bang`, đường vẽ thật:

| bề ngang | đệm `thead th` | đệm `tbody td` |
|---|---|---|
| @1100px | **16px / 16px** | **16px / 16px** |
| @1099px | **16px / 16px** | **16px / 16px** |
| @1024px | **16px / 16px** | **16px / 16px** |
| @981px  | **16px / 16px** | **16px / 16px** |

Chưa bao giờ là 10px. Bình luận ngay trên nó viết: *"Bảng Lịch sử đơn hoàn 12
cột đang tiêu 480px chỉ để làm đệm — nhiều hơn cả một khung nhìn điện thoại"*.
Đó là 12px/cột × 12 cột = **144px chưa từng được lấy về ở 1024px** — đúng bề
ngang mà cả vòng này đi tìm.

**Vì sao cổng mới không thấy.** Nó chỉ so **cùng tên thuộc tính**. `padding`
(viết gộp) đè `padding-left`/`padding-right` (viết rời) không nằm trong phép so
đó — mà phần "PHẠM VI" của chính nó **chỉ khai đúng MỘT chỗ mù**: "selector
KHÁC mà khớp cùng phần tử". Chỗ mù viết-gộp-đè-viết-rời **không được khai**, và
đó lại là chỗ có lỗi thật.

Tôi quét lại `style.css` bằng máy của tôi (`holy-rev63b-quet-rong.mjs`):
- ① selector khác mà khớp cùng phần tử (chỗ mù ĐÃ khai): **0 ca** — con số này
  đúng, khai đúng.
- ② **viết gộp đè viết rời: 9 khai báo chết**, trong đó ngoài 8 dòng đệm bảng
  trên còn:
  ```
  dòng 2591 @media(max-width:640px) .chat-nhap { padding-bottom: calc(10px + env(safe-area-inset-bottom,0px)) }
       ← bị dòng 2722 .chat-nhap { padding: 10px 12px } đè
  ```
  Tức **lề an toàn tai thỏ/thanh vuốt iPhone cho ô nhập chat CHƯA BAO GIỜ chạy**
  — đúng chỗ bình luận viết *"thiếu nó thì nút Gửi nằm đúng chỗ thanh vuốt, bấm
  ra… về màn hình chính"*. ERP là PWA, kho vận đọc chat một tay giữa ca.
- ③ cùng phần tử mà chuỗi selector viết khác: 0 ca.

**Tôi cũng gài lỗi vào cổng mới theo cách của tôi** (15 ca, khác hẳn 2 mẫu bẩn
của người xây). Kết quả — 5 ca ĐÁNG RA phải bắt mà **lọt**:

| ca | kết quả | có khai trong "PHẠM VI" không |
|---|---|---|
| `td.a.b` (media) ← `td.b.a` (nền) — đảo thứ tự lớp | **lọt** | KHÔNG |
| `padding-right` (media) ← `padding` (nền) — gộp đè rời | **lọt** | KHÔNG ← **có lỗi thật** |
| `td.a>b` ← `td.a > b` — khoảng trắng quanh combinator | **lọt** | KHÔNG |
| `td.a` ← `TD.a` — hoa/thường tên thẻ | **lọt** | KHÔNG |
| `.q` ← `td.q` — selector khác, cùng phần tử | lọt | CÓ (khai đúng) |

Và 10 ca cổng xử lý ĐÚNG: danh sách selector `.foo, thead th` (bắt), `!important`
(không bắt), ưu tiên thấp hơn (không bắt), cùng giá trị → chỉ cảnh báo "thừa"
(không đỏ), bình luận chứa `}{` (không lừa được), `@media` lồng trong `@supports`
(bắt). **Bộ khung cổng đúng; phạm vi khai thiếu.**

**Phải làm:** ① thêm lớp so viết-gộp-đè-viết-rời vào cổng; ② vá luật đệm 1544 và
`.chat-nhap` (thêm một tên thẻ là đủ thắng, đúng cách đã dùng 3 lần trong vòng
này); ③ sửa lại phần "PHẠM VI" cho khớp cái nó thật sự soi.

> Ghi thêm: con số nền tôi xác nhận được — `origin/main af951b8` = **3 luật chết /
> 189 khai báo**, `merge-base 407d2df` = **3 / 187**, nhánh này = **0 / 191**.
> Lời khai "main 3/187" là lấy số của merge-base, không phải của `main` hôm nay.

---

## CAO-2 · Vạch 1101px mở ra một dải TRÀN MỚI mà bàn đo mới không nhìn tới

Vòng này thêm `@media (min-width: 1101px) { #kd-tq-wrap ... display: table-cell }`
và giải trình bằng đúng hai số đo: *"@1280 và @1440 bảng vừa khít (khung 1094 ·
bảng 1094)"*. Hai số ấy đúng. Nhưng **giữa 1101 và 1280 không ai đo**.

Tôi quét cả dải, đường vẽ thật (`holy-rev63b-vach-1101.mjs`):

| bề ngang | khung | bảng | | cột rơi khỏi mép phải | nút "Chi tiết" |
|---|---|---|---|---|---|
| 1440 | 1094 | 1094 | vừa | — | ẩn (đúng) |
| 1280 | 934 | 934 | vừa | — | ẩn (đúng) |
| 1246 | 900 | 900 | vừa | — | ẩn (đúng) |
| **1200** | 854 | 900 | **TRÀN +46** | So kỳ trước | **ẩn** |
| **1152** | 806 | 900 | **TRÀN +94** | So kỳ trước | **ẩn** |
| **1101** | 755 | 900 | **TRÀN +145** | Doanh thu tạm tính, So kỳ trước | **ẩn** |
| 1100 | 754 | 754 | vừa | — | HIỆN |
| 1024 | 678 | 678 | vừa | — | HIỆN |

**Dải tràn = 1101px … 1245px.** Trong đó nút "Chi tiết" bị chính khối CSS mới ẩn
đi, nên đường duy nhất tới hai cột rơi mất là **kéo ngang** — đúng thứ Sếp gửi
ảnh bảo bỏ, nhắc hai lần. Câu viết trong `style.css` — *"đường tới dữ liệu có
sẵn ở MỌI bề ngang"* — **sai ở dải này**.

**Chốt bằng chính bàn đo của kho mã.** Tôi chép nguyên cây nhánh, đổi đúng một
dòng `RONGS = [1200, 1150, 1101, 1090]`, chạy `do-bang-that` không sửa gì khác:

```
ĐẠT 104 · TRƯỢT 5
❌ A  @1150px · kd-tq-bang +13px  [rơi: So kỳ trước]
❌ A  @1101px · kd-tq-bang +62px  [rơi: So kỳ trước]
❌ R4 @1200px · kd-tq-bang +46px
❌ R4 @1150px · kd-tq-bang +96px
❌ R4 @1101px · kd-tq-bang +145px
```

Cổng ĐỎ ngay khi được cho nhìn. Nó xanh 109/0 chỉ vì `RONGS = [1440, 1280, 1024,
375]` **nhảy qua 1101–1279**.

Đây là **đúng lỗi mà vòng này viết cả một trang để lên án**: *"luật CSS
`@media(max-width:1100px)` sinh ra từ số đo 1024px — mà KHÔNG CỔNG NÀO đo ở 1024.
Bench xanh trong khi thật ra tràn."* Vòng này vá dải 981–1100 rồi tự tạo dải mù
mới ở 1101–1279, ngay bên kia cái vạch mình vừa vẽ.

**Không phải hồi quy** — tôi đo `origin/main af951b8` ở đúng các mức đó: main
cũng tràn +46/+94/+145 ở 1200/1152/1101, và **còn tràn nặng hơn ở dưới**
(+146 @1100, +222 @1024, không có nút Chi tiết nào). Nhánh này chữa được nửa
dưới. Nhưng nửa trên thì vừa được khẳng định là "vừa khít" bằng hai số đo không
phủ nó.

**Cách chữa rẻ nhất:** đổi `min-width: 1101px` → `min-width: 1246px` (bề ngang
đầu tiên mà 7 cột thật sự đủ chỗ — đo được: khung 900 = bảng 900), và **thêm
1200 (hoặc 1152) vào `RONGS`**. Đừng chữa bằng cách cho nút "Chi tiết" hiện lại
ở ≥1101 — xem phán xử ⑤ bên dưới.

---

## VỪA-1 · Arm K không phải "chốt giả", nhưng nó KHÔNG có phạm vi riêng — lời khai "hai phạm vi, không chồng lấn" là sai

`do-cat-im-lang.mjs` viết: *"Hai cổng, hai phạm vi, không chồng lấn — phải chạy
cả hai."* Tôi đo hai lần, hai kiểu gài lỗi khác nhau:

**Thí nghiệm 1 — gài lại đúng lỗi CAO-1** (bỏ lời gọi `capNutDongPhu()`):
```
❌ R7 @1440px — kd-sku-chay · sm · hiện 34px / thật 50px
❌ R7 @1280px — kd-sku-chay + kd-sku-kem · hiện 34px / thật 50px
K @1440 · @1280 · @1024 · @375 : XANH CẢ BỐN
```
Đúng như người xây tự khai. Khai thật, không giấu.

**Thí nghiệm 2 — gài một cái kẹp CSS phổ quát** (`tbody td > * { max-height:12px;
overflow-y:hidden }`), để xem K có mắt không:
```
K  bắt được:  db-bang                                        (1 bảng)
R7 bắt được:  db-bang, ns-bang, qtBang, dh-bang, gy-bang,
              cskh-bang, kd-ds-bang, kd-dhh-bang, kdsp-bang,
              kt-ts-bang, kt-hh-bang, kv-ton-bang, ls-bang,
              ls-cv-bang, ts-bang                            (15 bảng)
CHỈ K thấy (phạm vi riêng của K): KHÔNG CÓ
```

**Phán xử: K CÓ mắt — nó không phải chốt giả kiểu `MOC_CAO_DONG` (thứ chưa arm
nào dùng). Nhưng tập bắt của K là TẬP CON THỰC SỰ của R7 trong cả hai thí
nghiệm, và nó trượt đúng cái lỗi nó sinh ra để bắt.** Lý do có thật: vòng K chấm
dòng do bàn đo chèn, mà dòng chèn là chữ phẳng — chữ phẳng trong cột chữ luôn
được `luoiBang()` đường ① bọc `.dai-gon` kèm nút, nên chỗ kẹp-thiếu-nút không
bao giờ sinh ra ở đó.

Giữ K thì được (nó rẻ, ~0.1ms), nhưng **phải sửa câu khai**: K là tập con của
R7, không phải một phạm vi thứ hai. Nếu R7 bị bỏ thì K không đỡ được gì.

---

## VỪA-2 · "Gỡ nút thật là mở cửa dao động vô hạn" — tôi không tái lập được, và cái giá của việc KHÔNG gỡ thì đo được

Người xây giữ lại nút "Xem thêm" đặt bằng phép đo thật, không bao giờ gỡ, với lý
do: *"gỡ nó là mở cửa cho vòng lặp gỡ nút → cột hẹp lại → kẹp → gắn nút → cột
rộng ra → gỡ nút… mà MutationObserver sẽ chạy mãi không dừng."*

**Tôi dựng bản CÓ GỠ** (`} else if (nutCu && nutCu.dataset.doan) {` →
`} else if (nutCu) {`), chạy ở 1440px, lấy 40 mẫu × 50ms:
```
6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6
→ KHÔNG dao động.
```
Lời khai là một **giả thuyết được trình bày như một số đo**. Có thể nó đúng ở
một bố cục nào đó; ở bố cục hôm nay thì không tái lập được.

**Cái giá của việc không gỡ thì tái lập được ngay.** Mở ở 1440 (khung 537 → kẹp
→ nút thật), rồi nới khung ra (bỏ lưới hai cột — mô phỏng xoay máy / kéo co cửa
sổ) rồi ép vẽ lại:
```
TRƯỚC:  10/15 ô  34/50 · KẸP · nút-THẬT
SAU  :  11 ô     17/17 hoặc 34/34 — HẾT KẸP, mà NÚT VẪN CÒN
→ nút ở lại trên ô KHÔNG còn bị kẹp: 11
```
Mười một cái nút "Xem thêm" **mở ra đúng thứ đang bày sẵn** — chính là *"một lời
nói dối nhỏ, cùng họ với chính lỗi đang vá"* mà bình luận ngay phía trên nó lên
án, và là lý do người xây dựng cờ `data-doan` cho nhánh đoán.

Đề nghị: gỡ cả nút thật khi hết kẹp, và nếu sợ dao động thì chặn bằng một cờ
"đã gỡ một lần rồi thì thôi" trên chính phần tử — rẻ hơn nhiều so với việc để
lại một cái nút nói dối. (Ưu tiên thấp hơn CAO-1/CAO-2: ca này cần người kéo co
cửa sổ / xoay máy tính bảng, không phải đường dùng thường ngày.)

---

## VỪA-3 · Đường thoát khỏi "cắt chữ âm thầm" là một mục tiêu chạm **60×15px** — luật nhà là ≥44px

Đo trên đường vẽ thật, cả 1440 và 1280:
```
cỡ nút "Xem thêm": 60 × 15 px
```
`.dai-gon-btn` (style.css dòng 2045) có `padding: 0`, `font-size: 12px`, không
`min-height`. Không cổng nào đo nó — `grep dai-gon-btn scripts/` chỉ ra
`do-bang-that` (dùng nó làm *điều kiện thoát*, không đo cỡ) và hai tệp của tôi.

Lớp `.dai-gon-btn` có từ trước, nên đây **không phải hồi quy**. Nhưng vòng này
biến nó thành **đường thoát DUY NHẤT** của một lỗi CAO, ở một chỗ mới (bảng SKU
màn Kinh doanh), trên một ứng dụng mà chính bình luận trong mã lấy làm lý do bác
`title`: *"ERP là PWA Sếp mở trên cả điện thoại lẫn máy tính bảng"*. Một đường
thoát cao 15px trên máy tính bảng thì gần bằng không có.

Sửa: `min-height: 44px; padding: 0 4px;` trong khối `.dai-gon-btn` khi nó nằm
trong ô bảng, và thêm nó vào `do-nut-dai-cat-44px`.

---

## THẤP

1. **`do-luat-css-chet` đầu tệp khai "bốn MẪU… hai BẨN và hai SẠCH"; `MAU` có
   NĂM** (2 bẩn + 3 sạch). Cả 5 đều chạy và đều đạt — chỉ con số trong bình luận
   sai.
2. **"Từ ~1230px trở lên mới quay lại hai cột cạnh nhau"** (`style.css`, khối
   `.kd-sku-cot`). Đo được: **1086px** (lưới 740 → 2 cột) · 1080px → 1 cột.
   Lệch ~145px. Số đo không đổi kết luận (0 tràn ở mọi mức 375→1440), chỉ là lời
   khai sai.
3. **"main 3/187"** — `origin/main af951b8` là **3/189**; 187 là số của
   merge-base `407d2df`.
4. **Mắt của arm R7 chỉ được chứng minh bằng LỜI, không bằng ca đối chứng đứng
   sẵn.** `--tu-kiem` đỏ 3 chỗ, cả 3 đều là arm A trên `bang-gai-tu-kiem`; không
   có ca nào bắt K/R7 phải đỏ. Tôi đã tự gài và R7 đỏ đúng — nhưng lần sau ai sẽ
   làm lại? BH-16 nói bàn đo phải tự chứng minh, không phải người soi chứng minh
   hộ. Thêm một ca `--tu-kiem` gỡ `capNutDongPhu()` là đủ.
5. **Ô `.sm` chỉ chứa ẢNH được cấp nút "Xem thêm"** (đo: hiện 34px / thật 45px,
   `chu: 0`), trong khi arm K/R7 lại **bỏ qua** nó (`if (!chu) continue`). Hai
   bên lệch phạm vi. Hôm nay vô hại (không ô `.sm` nào chở ảnh), ghi ra để đừng
   ngạc nhiên.

---

## ⑤ PHÁN XỬ `holy-rev63-quet-min560.mjs` — bàn đo của TÔI sai, người xây đúng

Tôi chạy lại: **117 ĐẠT · 2 TRƯỢT**, đúng con số người xây khai.
```
❌ G2 @1440px · nút "Chi tiết" ≥44px — kd-tq-bang 0x0
❌ G2 @1280px · nút "Chi tiết" ≥44px — kd-tq-bang 0x0
```
Đọc lại mã của chính tôi, dòng 212:
```js
const oPhu = [...tr.cells].filter(td => td.classList.contains('cot-phu') && td.textContent.trim());
```
Chấm theo **LỚP**. `do-bang-that` hiện hành đã sửa nghĩa thành:
```js
... && getComputedStyle(td).display === 'none'
```
Chấm theo **cái người dùng THẤY**. Ở 1440/1280 hai cột "Hủy/Hoàn" **đang nằm
trên bảng**, nút bị ẩn có chủ ý, nên bàn của tôi đòi một cái nút không nên tồn
tại và đo nó ra 0×0.

**Bàn đo của tôi SAI. Hai dòng đỏ đó không phải hồi quy.** Bản chép ấy đóng băng
trước khi arm G được sửa nghĩa; tôi để nó lại làm tài liệu soi, và nó phải mang
nhãn "đã lỗi thời — chấm theo lớp, không theo `display`".

**Và tôi tán thành việc bỏ lối tắt** *"để nút hiện luôn ở ≥1101px cho bàn nào
cũng xanh"*. Ở ≥1246px hai cột đã bày sẵn, một cái nút hứa mở ra thứ đang bày
sẵn là đúng cái lời-nói-dối-nhỏ mà cả vòng này đi chữa. Sửa bàn đo cho khớp thực
tế là đúng chiều; sửa thực tế cho khớp bàn đo là sai chiều. Quyết định đó đúng.

**Nhưng nó chỉ đúng ở nơi hai cột THẬT SỰ vừa.** Ở 1101–1245px (CAO-2) hai cột
nằm trên bảng mà bảng **tràn**, và nút thì bị ẩn — ở đó việc ẩn nút không còn là
"đừng hứa thứ đang bày sẵn" nữa, mà là "lấy mất đường xem ở đúng chỗ cột rơi
khỏi màn". Cách chữa vẫn KHÔNG phải là hiện nút lại, mà là dời vạch lên 1246px.

---

## ① `capNutDongPhu()` soi như mã nền — ĐẠT

Đo bằng dữ liệu ngành thật (tên hàng 96 ký tự, GMV 10 chữ số).

**Đúng/sai của phép đo — 0 chỗ lệch ở cả 4 bề ngang.**
Bảng dưới: `chữ N | clientHeight/scrollHeight | có kẹp | có nút`

| @1440 | @1280 | @1024 | @375 |
|---|---|---|---|
| 96 ký tự · 34/50 KẸP · **nút THẬT** | 34/50 KẸP · nút THẬT | 34/50 KẸP · nút THẬT | 34/34 · không nút |
| 23 ký tự · 17/17 · không nút | 17/17 · không nút | 17/17 · không nút | 17/17 · không nút |
| ô rỗng · không dòng phụ · không nút | " | " | " |
| 53 ký tự · 34/34 · không nút | 34/50 KẸP · nút THẬT | 34/34 · không nút | 34/34 · không nút |
| 70 ký tự · 34/34 · không nút | 34/50 KẸP · nút THẬT | 34/34 · không nút | 34/34 · không nút |

**lệch (kẹp mà không nút, hoặc nút mà không kẹp): 0 / 0 / 0 / 0.**
Không còn nút thừa ở 375 và 1024 — lỗi vòng-1-của-bản-vá đã hết. Cờ `data-doan`
làm đúng việc của nó.

**TỐC ĐỘ — không giật.** Nhồi 300 dòng vào `kd-sku-kem`:
```
308 phần tử .sm · 300 bị kẹp · 300 nút
vẽ lại + dập lưới toàn bộ: 228.8 ms
riêng vòng ĐO-VÀ-GẮN (đọc scrollHeight rồi chèn nút, xen kẽ):  2.0 ms
```
Trên bảng thật (19 phần tử): 0.09–0.12ms/lượt. **Chi phí của
`capNutDongPhu()` là nhiễu** so với chính phép vẽ lại. Không phản đối việc để nó
chạy mỗi lượt.

**DAO ĐỘNG — không có.** Ép vẽ lại 30 lần liên tiếp:
```
@1440: 30 lượt / 523.8ms · nút chạy=1 · nút kém=10/10 dòng  (đúng 1 nút/dòng, không nhân đôi)
@1280: nút kém=10/10 · @1024: 10 dòng 0 nút (đúng, không kẹp) · @375: 0 nút (đúng)
```

**KÉO CO CỬA SỔ 1440 → 1000** (không vẽ lại DOM — đúng ca người xây nói
`luoiBang()` không chạy):
```
TRƯỚC @1440: cột phụ [Hủy, Hoàn] trên bảng · nút Chi tiết ẩn · SKU 34/50 có nút
SAU   @1000: cột phụ []            rời bảng · nút Chi tiết HIỆN · SKU 34/50 có nút
→ CSS lo được, nút Chi tiết quay lại. Câu khai ĐÚNG.
```
Đây là chỗ quyết định `.cot-phu` giữ trên `<th>` thay vì gắn bằng JS-đo-màn —
quyết định ấy đúng và tôi đã kiểm.

**CỜ `data-doan` — vẽ trong bóng tối rồi hiện ra:**
```
trong bóng tối : có nút, doan="1"                (đoán, đánh dấu — đúng)
vừa hiện ra    : 34/50 KẸP, có nút, doan đã XOÁ  (đoán đúng → thành nút thật)
sau 1 giây     : có nút, doan đã xoá             (ổn định)
```
Không kẹt ở trạng thái đoán trong đường này.

**MÉP:**
```
1 dòng ngắn (13 ký tự)  : 17/17 · không kẹp · không nút        ✅
ô rỗng                  : 0/0   · không kẹp · không nút        ✅
chỉ có ảnh              : 34/45 · KẸP · CÓ nút                 (xem THẤP-5)
ĐÚNG 2 dòng (93 ký tự)  : 34/34 · dòng 2.02 · không kẹp · KHÔNG nút   ✅ mép chuẩn
98 ký tự                : 34/50 · KẸP · có nút                 ✅
```
Mép "đúng 2 dòng" xử lý chính xác — không cấp nút thừa ở ranh giới.

---

## ⑥ Sự cố `cot-phu` rơi khỏi `app.html` — cây hiện tại KHÔNG còn dấu vết

`git diff origin/main...HEAD -- public/app.html` = 55 thêm / **6 xoá**, đọc từng
dòng: cả 6 dòng xoá đều là dòng được viết lại ngay bên dưới (2 `<th class="num">
Hủy/Hoàn`, 2 `<thead>` bảng SKU, 1 `<th>Kho nhận`, 1 `<div class="table-wrap-cuon">`
→ thêm `id`).

So cấu trúc, bỏ hết bình luận, đếm từng thẻ mang lớp:
```
main  tổng 65 thẻ th/td mang cot-phu|cot-chu | HEAD tổng 70
LỆCH  th.cot-chu        main 29 → HEAD 32   (+3: 2 bảng SKU + Kho nhận)
LỆCH  th."num cot-phu"  main  2 → HEAD  4   (+2: Hủy, Hoàn)
```
**Chỉ có thêm, không mất một thẻ nào.** Sự cố đã được truy và sửa sạch.

---

## ⑦ Gộp `main af951b8` — xem CHẶN-1

Ngoài khối xung đột, mọi thứ tự gộp sạch: `package.json`, `public/app.html`,
`public/assets/js/app.js`, `scripts/do-cat-im-lang.mjs`.
Đính chính một tiền đề: **`main` KHÔNG đụng `scripts/do-bang-that.mjs`** (chỉ
nhánh này sửa) — nên vùng chồng lấn thật chỉ có `do-cat-im-lang.mjs`, và nó gộp
sạch, chạy lại trên cây gộp vẫn **SẠCH**.

Cây gộp (lấy phía nhánh) chạy lại:
`do-bang-that` **109/0** · `do-luat-css-chet` **0/193** · `do-cat-im-lang` SẠCH.

---

## ⑧ Chạy lại HẾT cổng — mọi con số người xây khai đều ĐÚNG

| cổng | người xây khai | tôi đo | |
|---|---|---|---|
| `do-bang-that` | 109 / 0 | **109 ĐẠT · 0 TRƯỢT** | khớp |
| `do-bang-that --tu-kiem` | 106 / 3 (đỏ đúng) | **106 / 3**, cả 3 là arm A trên `bang-gai-tu-kiem` @1440·1280·1024 | khớp |
| `do-bang-vua-man` | 46 / 0 | **46 / 0** | khớp |
| `do-mo-ra-xem-duoc` | 725 / 0 | **Chấm 725 phép · HỎNG 0** | khớp |
| `do-o-ngay` | 107 / 0 | **107 / 0** | khớp |
| `cong-khoi` | XANH | XANH | khớp |
| `cong-khoi --rong 375` | XANH | XANH | khớp |
| `do-cat-im-lang` | SẠCH | **SẠCH** | khớp |
| `do-luat-css-chet` | 0 / 191 | **0 / 191** (5/5 mẫu đối chứng đạt) | khớp — nhưng xem CAO-1 |
| `do-luat-css-chet` trên `main` | 3 / 187 | **3 / 189** (187 là merge-base) | lệch nhẹ, THẤP-3 |

Không nhận nợ cũ: `do-tu-lam-moi` 52/2 và `do-gop-viec` đỏ (nợ `f699272`) không
tính vào vòng này.

**Cổng ĐỎ khi được cho nhìn đúng chỗ:** `do-bang-that` với
`RONGS = [1200,1150,1101,1090]` → **104 ĐẠT · 5 TRƯỢT** (xem CAO-2).

---

## Vá vòng 1: đã kiểm, ĐẠT cả 8

| vòng 1 | trạng thái |
|---|---|
| CAO-1 cắt chữ âm thầm ở ô SKU | **ĐẠT** — 0 chỗ lệch ở 4 bề ngang, mép 2 dòng chuẩn (mục ①) |
| CAO-2 luật CSS chết (3 ca) | **ĐẠT về 3 ca đã nêu** — nhưng lớp chưa đóng, xem CAO-1 vòng này |
| VỪA-1 arm D `>=` → `===` | **ĐẠT** — báo cả hai chiều, `--tu-kiem` cộng đúng 1 |
| VỪA-2 lời khai nbsp | **ĐẠT** — tự dựng lại, tự bác, ghi lại thành "phòng xa, không phải lỗi đã bắt được". Đây là cách khai đúng |
| VỪA-3 `kd-tq-bang` hai cột | **ĐẠT ở ≤1100 và ≥1246**, hở ở 1101–1245 (CAO-2) |
| VỪA-4 `MOC_CAO_DONG` chốt giả | **ĐẠT** — arm E4 dùng thật, thêm `MOC_CAO_THE` cho chế độ thẻ; tự tìm ra con số 50 của `do-bang-vua-man` cũng chưa từng chạy |
| THẤP-1 mép `min(560px,100%)` | **ĐẠT** — ghi rõ ca `width:max-content` sẽ lật; quét lại 0 tràn từ 375→1440 |
| THẤP-2 thêm 1024 vào `do-bang-vua-man` | **ĐẠT** — 39 → 46 phép |

---

## Việc phải làm trước khi đẩy

1. **CHẶN-1** — quyết tay cách gộp `.kd-sku-cot` (đề nghị: lấy phía nhánh, 360px
   + `min(560px,100%)`; phía `main` 560px làm hai bảng SKU xếp chồng ngay ở 1440px).
2. **CAO-1** — vá luật đệm `@media(≤1100px) thead th, tbody td` và
   `.chat-nhap { padding-bottom: … env() }`; thêm lớp "viết gộp đè viết rời" vào
   `do-luat-css-chet` và sửa lại phần PHẠM VI.
3. **CAO-2** — `#kd-tq-wrap` từ `min-width: 1101px` → `1246px`; thêm 1200 (hoặc
   1152) vào `RONGS` của `do-bang-that`.
4. VỪA-1 — sửa câu khai trong `do-cat-im-lang.mjs`: K là tập con của R7.
5. VỪA-2 — gỡ cả nút thật khi hết kẹp (11 nút nói dối đo được), hoặc ghi lại lời
   khai cho đúng là giả thuyết chưa tái lập được.
6. VỪA-3 — `.dai-gon-btn` ≥44px trong ô bảng + đưa vào `do-nut-dai-cat-44px`.
7. THẤP 1–5.

## Tệp soi của Hồ Ly (không phải cổng của kho mã)

Nằm ở scratchpad phiên soi, chạy được độc lập:
`holy-rev63b-gai-luat-chet.mjs` (15 ca gài vào cổng CSS) ·
`holy-rev63b-quet-rong.mjs` (3 lớp đè ngoài phạm vi cổng) ·
`holy-rev63b-soi-nut-dongphu.mjs` (tốc độ · dao động · cột nới · `data-doan` · mép) ·
`holy-rev63b-soi-2.mjs` (vạch 1101/1100 · kéo co · đệm chết · thử bản có-gỡ-nút) ·
`holy-rev63b-vach-1101.mjs` (quét dải 1101–1440, nhánh vs `main`) ·
`holy-rev63b-vach-sku.mjs` (vạch lưới `.kd-sku-cot`).

`scripts/holy-rev63-quet-min560.mjs` (vòng 1) **đã lỗi thời** — chấm cột phụ
theo LỚP chứ không theo `display`; hai dòng đỏ G2 của nó không phải hồi quy.

**Không commit, không push, không sửa mã sản phẩm.** Cây làm việc đã kiểm lại:
`git status` sạch, `sha256(public/assets/js/app.js)` trước và sau hai thí nghiệm
gài lỗi giống hệt nhau (`4eda1049…50aa`).
