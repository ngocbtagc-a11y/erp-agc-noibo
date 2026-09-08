# REV-0063 — Vá 2 bảng SKU tràn ở 1440px + bật mức đo 1024px

**KẾT LUẬN: ❌ FAIL — 0 CHẶN · 2 CAO · 4 VỪA · 2 THẤP.**

Bản vá **đúng bệnh, đúng gốc, và mọi con số người xây khai đều tái lập được
chính xác** — tôi chạy lại toàn bộ 12 cổng, không lệch một con số nào. Nhánh
này **tốt hơn `origin/main` ở mọi mức đo**. Nhưng nó **tự tay tạo ra một chỗ
cắt chữ âm thầm ở đúng màn 1440px của Sếp** (CAO-1) trong khi khai ngược lại,
và **lớp "luật CSS chết vì bị đè" mà nó tuyên bố đã chữa thì mới chữa 1 trong
3 chỗ** (CAO-2). Hai chỗ này sửa mất khoảng 15 phút. Vá xong là đẩy.

- Nhánh soi: `fix/bang-sku-tran-1024` @ `25ed816` (gốc `origin/main` = `407d2df`)
- Bàn soi tôi tự dựng (giữ lại làm chứng, **chưa commit**):
  - `scripts/holy-rev63-quet-min560.mjs` — bản sao `do-bang-that` có thêm mức **768px**
  - `scripts/holy-rev63-thu-nbsp.mjs` — đo ô tiền / ô tên hàng, có công tắc `BO_NBSP=1`
  - `scripts/holy-rev63-soi-luat-chet.mjs` — máy quét luật CSS bị đè chết

---

## 0. Bảng đối chiếu LỜI KHAI ↔ SỐ TÔI ĐO ĐƯỢC

| Cổng | Người xây khai | Tôi đo | Khớp |
|---|---|---|---|
| `do-bang-that` | 97 · 0 | **97 · 0** | ✅ |
| `do-bang-that --tu-kiem` | 94 · 3 (ĐỎ) | **94 · 3** | ✅ |
| `do-bang-vua-man` | 39 · 0 | **39 · 0** | ✅ |
| `do-mo-ra-xem-duoc` | 725 · 0 | **725 · 0** | ✅ |
| `cong-khoi` @1440 · @375 | XANH ×2 | **XANH ×2** | ✅ |
| `do-ba-mau` | 12/12 | **12/12 · ĐẠT** | ✅ |
| `do-cat-im-lang` | SẠCH | **SẠCH** | ✅ |
| `do-chu-dai` | XANH | **XANH** | ✅ |
| `do-moc-noi` | 9 · 0 | **9 · 0** | ✅ |
| `do-o-ngay` | 107 · 0 | **107 · 0** | ✅ |
| `do-tach-vai-tro` | 61 · 0 | **61 · 0** | ✅ |
| `do-tu-lam-moi` | 52 · 2 (nợ `f1ac70b`) | **52 · 2** | ✅ |

**Không một con số nào lệch.** Ba chỗ lời khai lệch với thực tế đều là lời khai
bằng CHỮ, không phải bằng SỐ — xem VỪA-1, VỪA-2 và CAO-1.

---

## ① `min-width: min(560px, 100%)` — CÓ AN TOÀN TOÀN CỤC KHÔNG?

**CÓ. Đây là kết luận chắc chắn, đo bằng máy, không phải suy luận.**

Tôi chép `do-bang-that` ra bản riêng, **thêm mức 768px mà người xây không đo**,
rồi quét **cả 30 bảng ở 5 bề ngang** hai lượt — một lượt cây làm việc, một lượt
`--commit 407d2df` — và so từng bảng một (bề ngang khung · bề ngang bảng · số
cột · tràn hay vừa):

| Bề ngang | Số bảng soi | Số bảng ĐỔI bề ngang |
|---|---|---|
| 1440px | 29 hiện | **3** (đúng 3 bảng Kinh doanh) |
| 1280px | 29 hiện | **3** |
| **768px** *(chưa ai đo)* | 28 hiện | **3** |
| 375px | 28 hiện | **3** |

**26 bảng còn lại giữ NGUYÊN từng pixel** ở cả 4 mức. Không bảng nào co lại,
không bảng nào tràn thêm, không bảng nào trong cửa sổ bật lên bị đụng
(`nsSua-*`, `mtModalViec`, `kvModal*` giữ đúng 562/588px như cũ — chúng đã có
`.modal table { min-width: 0 }` từ trước).

Ba bảng đổi, và đổi đúng chiều:

```
1440  kd-sku-chay/kem   khung 537 · bảng 560 → 537   TRÀN → vừa   (đúng 23px như khai)
1280  kd-sku-chay/kem   khung 457 · bảng 560 → 457   TRÀN → vừa   (103px)
 768  kd-sku-chay/kem   khung 341 → 702              vừa → vừa    (lưới 360px xuống 1 cột)
 375  kd-sku-chay/kem   khung 320 → 360              vừa → vừa
```

Chẩn đoán gốc bệnh của người xây **đúng**: sàn `560px` đo bằng bề ngang MÀN
HÌNH trong khi thứ làm tràn là bề ngang KHUNG; `min()` chữa cả lớp chứ không
chữa một chỗ. `min()` là hàm CSS đã phổ cập từ 2020, Chrome/Edge/Safari/Firefox
đều chạy — chi phí 0, không thêm gói.

**Một cảnh báo nhỏ đi kèm (THẤP-1):** `min-width: 100%` không giải được khi
khối chứa có bề ngang "co theo nội dung" (`inline-block`, `position:absolute`
không đặt bề ngang, `width:max-content`). Hôm nay ERP không có bảng nào nằm
trong khối như thế — tôi đã quét đủ 30 bảng ở 5 mức và không chỗ nào lệch. Ghi
ra đây để mai ai đặt bảng vào một khối co-theo-nội-dung thì biết chỗ mà nhìn.

---

## ② CỘT 4 → 3 — **CAO-1: CẮT CHỮ ÂM THẦM Ở ĐÚNG MÀN 1440px CỦA SẾP**

Người xây khai: *"`title` giữ trọn tên khi CSS kẹp dòng phụ 2 dòng — **không
cắt chữ âm thầm**"* và *"**KHÔNG trường nào bị giấu sau nút**"*.

**Nửa sau đúng. Nửa đầu SAI, và tôi đo được bằng máy.**

Tôi đo `scrollHeight` vs `clientHeight` của từng ô `.sm` trong hai bảng SKU,
trên Chrome thật, bằng đúng tên hàng 92 ký tự mà chính bàn đo của người xây
dùng ("Hạt điều rang muối Bình Phước loại A nguyên hạt túi zip 500g — lô nhập
khẩu quý 3" — tên thật cỡ này AGC gõ hằng ngày):

| Bề ngang | Bảng | Bị cắt? | Hiện / Thật | Có nút "Xem thêm"? | Có `title`? |
|---|---|---|---|---|---|
| **1440px** | `kd-sku-chay` (3/3 dòng) | **CÓ** | **34px / 50px** | **KHÔNG** | có |
| 1440px | `kd-sku-kem` | không | 34/34 | không | có |
| 1024px | cả hai | không | 34/34 | không | có |
| 375px | cả hai | không | 34/34 | không | có |

Tức là **ở đúng màn 1440px Sếp đang ngồi, bảng "10 SKU bán chạy nhất" cắt cụt
tên hàng ở dòng thứ 2 và không có một dấu hiệu nào cho biết còn chữ phía sau.**
Ảnh `1440-kinhdoanh-sau.png` do chính người xây commit cũng bày ra chuyện này:
tên hàng bảng trái dừng ở *"— lô nhập khẩu"*, mất hai chữ *"quý 3"*, trong khi
bảng phải hiện đủ.

**Vì sao lọt:** `luoiBang()` có đúng hai đường cấp nút "Xem thêm"
(`public/assets/js/app.js` ~11270–11295):

```js
if (td.classList.contains('cot-chu') && !td.children.length) { ... dg(chu) ... }   // ① ô CHỈ CÓ CHỮ
const nm = td.classList.contains('cot-chu') ? td.querySelector('.nm') : null;      // ② chỉ .nm
if (nm && ... nm.textContent.trim().length > 55) { ...thêm nút "Xem thêm"... }
```

Ô SKU mới có **hai lớp con** (`.nm` + `.sm`) nên trượt đường ①; và chữ dài nằm
ở **`.sm`** chứ không phải `.nm` (mã SKU chỉ 24 ký tự) nên trượt luôn đường ②.
Trong khi đó CSS `td.cot-chu .sm { max-height: 2.8em; overflow: hidden }` vẫn
kẹp và **giấu** phần thừa. Kết quả: kẹp mà không có đường đọc tiếp — đúng cái
lỗi mà `dg()` sinh ra để chặn.

`title` **không phải đường thoát hợp lệ** theo luật nhà: nó chỉ hiện khi rê
chuột, mà ERP là PWA Sếp mở cả trên điện thoại lẫn máy tính bảng. Hôm nay ở
375/1024 chưa cắn vì thẻ rộng hơn — nhưng tên hàng AGC dài hơn 92 ký tự là
chuyện thường, và lúc đó điện thoại cắn trước.

**`npm run do-cat-im-lang` báo SẠCH và điều đó KHÔNG mâu thuẫn** — cổng ấy soi
việc máy chủ cắt danh sách rồi màn hình có nói ra hay không, nó **không hề nhìn
vào cái kẹp 2 dòng của CSS**. Đây là một điểm mù của cổng, không phải một lời
bào chữa.

**Cách chữa (nhỏ, đúng lớp, không đẻ cách thứ hai):** trong `luoiBang()`, nới
đường ② để nó xét cả `.sm` trong `.cot-chu`, không chỉ `.nm` — hoặc gọn hơn:
xét `sm.scrollHeight > sm.clientHeight` rồi gắn cùng cái nút `.dai-gon-btn`.
Một chỗ sửa, chữa cả lớp: mai ai làm cột danh tính hai dòng khác cũng có nút.

**Luật ba màu / chạm ≥44px:** `do-ba-mau` 12/12 ĐẠT, `do-bang-that` arm G2/T2
(nút ≥44px) ĐẠT ở cả 4 mức. Không có gì để nói thêm.

---

## ③ LỚP "LUẬT CSS CHẾT VÌ BỊ ĐÈ" — **CON SỐ: 3 TRÊN `main`, CÒN 2 SAU BẢN VÁ (CAO-2)**

Tôi viết máy quét (`scripts/holy-rev63-soi-luat-chet.mjs`): tách toàn bộ
`style.css` thành luật, tính độ ưu tiên, rồi tìm mọi khai báo nằm trong `@media`
mà có một luật NỀN **cùng selector, đứng SAU trong tệp, độ ưu tiên ≥** — tức là
đè chết. Máy quét tự chứng minh có mắt: chạy trên `407d2df` nó **bắt đúng cái
`thead th` mà người xây tìm ra bằng tay**.

**Trên `origin/main` (`407d2df`): 3 khai báo chết / 187 khai báo trong `@media`.**
**Trên `25ed816` (bản vá): còn 2.**

| # | Luật chết | Bị đè bởi | Trạng thái |
|---|---|---|---|
| 1 | `@media(≤1100px) thead th { white-space: normal }` — dòng 1518 | `thead th { white-space: nowrap }` dòng 1860 (0,0,2 vs 0,0,2) | ✅ **đã chữa** |
| 2 | `@media(≤1100px) td.cot-chu.co-chitiet { min-width: 150px }` — dòng **1622** | `td.cot-chu.co-chitiet { min-width: 190px }` dòng **1640** (0,2,1 vs 0,2,1) | ❌ **CÒN CHẾT** |
| 3 | `@media(≤640px) .chat-tin { max-width: 86% }` — dòng **2521** | `.chat-tin { max-width: 72% }` dòng **2523** (0,1,0 vs 0,1,0) | ❌ **CÒN CHẾT** |

**CAO-2 = số 2.** Chỗ này nặng hơn số 3 vì ba lý do:

1. Nó nằm **trong đúng khối `@media (max-width: 1100px)`** mà người xây vừa mở
   ra sửa, cách luật vừa chữa **7 dòng**.
2. Ghi chú ngay cạnh nó nói thẳng: *"Chỗ THẬT SỰ chặn ở bề ngang này là
   `min-width`, không phải `max-width`… **Hạ sàn mới cứu được**"* — nghĩa là
   đây chính là luật sinh ra để cứu tràn ở 1024px, **và nó chưa bao giờ chạy**.
   Sàn thật ở 1024px vẫn là 190px chứ không phải 150px.
3. Người xây tuyên bố *"Đây có thể là MỘT LỚP, không phải một chỗ"* rồi **chỉ
   chữa một chỗ**, không quét lại tệp. Đúng là một lớp — và lớp đó chưa hết.

Chữa: y hệt cách đã dùng cho `thead th` — thêm một tên thẻ để thắng độ ưu tiên
(`table td.cot-chu.co-chitiet`), hoặc dời luật nền lên trên khối `@media`.

*Ghi rõ phạm vi máy quét:* nó bắt lớp **cùng selector** — đúng lớp của cả 3 ca
trên. Ca "selector khác nhưng khớp cùng phần tử" (ví dụ `.cot-chu` bị `td.cot-chu`
đè) máy này không bắt được, nên **3 và 2 là SÀN DƯỚI, không phải trần**.

---

## ④ `SO_BANG_PHAI_SOI` 27 → 30 và cái `>=` — **VỪA-1: SỬA SỐ, KHÔNG SỬA BỆNH**

Người xây chẩn đoán đúng: *"Arm D dùng `>=` nên nó im lặng tụt lại"*. Rồi
người xây **sửa con số 27 → 30 và để nguyên cái `>=`**:

```
scripts/do-bang-that.mjs:100   const SO_BANG_PHAI_SOI = 30;
scripts/do-bang-that.mjs:375   ds.length >= SO_BANG_PHAI_SOI && soChen > 0,
```

Đây đúng dạng lỗi tuần này gặp nhiều lần: **sàn dưới lỏng dần trong im lặng**.
Lần sau ai thêm bảng thứ 31 mà quên sửa mẫu số, arm D vẫn xanh y như lần này —
cái bẫy còn nguyên, chỉ được nạp lại đạn. Ghi chú ngay trên dòng đó tự viết
*"việc phải sửa chính là lời nhắc"* — nhưng `>=` làm cho **không bao giờ phải
sửa**. Đổi thành `===` (hoặc `!==` thì báo cả hai chiều: thiếu bảng = mất bảng,
thừa bảng = có bảng mới chưa đo) là hết cửa.

**Quét cả 40 bàn đo xem còn arm nào dùng `>=` kiểu "mẫu số cứng":** chỉ còn một
chỗ đáng nói, và nó **không phải cùng loại**:
`do-gop-viec-lichsu.mjs:522` `>= THE_TOI_THIEU` — chỗ này `3` **cố ý là sàn**
(ghi rõ *"mốc phải là SÀN của ca xấu nhất"*), `>=` đúng nghĩa. Các chỗ `>=`
khác (`do-hai-o-tren-man` ≥7, `do-kho-tai-lieu` ≥9/≥20, `holy-soi-gy45` ≥10)
đều là ngưỡng tối thiểu thật, không phải mẫu số đếm đủ.
`do-bang-vua-man` và `do-mo-ra-xem-duoc` **không có mẫu số cứng** — chúng tự
tìm bảng, kiến trúc đó miễn nhiễm. Vậy **`do-bang-that` arm D là chỗ duy nhất
còn bệnh.**

**VỪA-2 kèm theo — một chốt được khai là có mà thật ra KHÔNG TỒN TẠI:**
`do-bang-that.mjs:106` khai `const MOC_CAO_DONG = { 1440: 55, 1280: 55, 375: 50 }`
với ghi chú *"hai chốt chống sửa quá tay"*. Tôi grep cả tệp: **hằng số này chỉ
xuất hiện đúng một lần, ở chính dòng khai báo — không arm nào dùng nó.** Chốt
"chiều cao dòng không tăng / số dòng thấy được không giảm" mà `do-bang-that`
tự nhận là có, thật ra **nằm ở `do-bang-vua-man` arm G**, và bàn ấy đo
1440·1100·900·375·320 — **không có 1024**. Nên bản vá này vừa cho `dh-bang`
xuống dòng bằng `.cot-chu` và vừa bật `thead th{white-space:normal}` ở dải
981–1100 (hai thứ đều làm dòng CAO LÊN) mà **ở 1024px không có gì canh số dòng
thấy được**. Ở 1100px arm G có chạy và ĐẠT, nên hôm nay chưa cắn — nhưng chốt
này đang là chốt giả.

---

## ⑤ `kd-tq-bang` — HỦY / HOÀN XUỐNG `.cot-phu`: **VỪA-3, ĐÁNH GIÁ LÀ NÊN GIỮ TRÊN BẢNG**

Người xây khai ra đàng hoàng trong `HANG-DOI.md` và xin xác nhận — **đúng
luật, ghi nhận điều đó**. Nhưng xét về nội dung thì tôi **không đồng ý**, vì ba
điểm đo được:

1. **`.cot-phu` là `display: none` ở MỌI bề ngang.** `style.css:1694`
   `th.cot-phu, td.cot-phu { display: none }` — không nằm trong `@media` nào.
   Nên hai cột không phải "ẩn ở 1024px cho vừa", mà **biến mất cả trên màn
   1440px của Sếp** — nơi bảng này **không hề tràn** (tôi đo: khung 1094 · bảng
   1094 · vừa, cả trước lẫn sau). Trả giá ở màn rộng để chữa +26px ở màn hẹp.
2. **Lý do đưa ra sai về mặt dữ liệu.** Người xây viết *"thẻ số ngay trên bảng
   đã báo 'Hủy + Hoàn' kèm % trên GMV rồi"*. Thẻ đó đọc từ `dt.tong`
   (`app.js:7190`) — **tổng toàn công ty**, không tách sàn. Đúng cái mà hai cột
   vừa bị bỏ đang trả lời (**Shopee rò rỉ hay TikTok rò rỉ**) thì thẻ số
   **không** trả lời. Nói cách khác: thông tin bị mất khỏi tầm nhìn thật, chỉ
   còn sau nút "Chi tiết" từng dòng.
3. **Bảng này chỉ có 2–3 dòng** (Shopee · TikTok). Giấu 2/7 cột sau nút "Chi
   tiết" trên một bảng ba dòng là đổi một cái liếc mắt lấy hai cú bấm, để đổi
   lấy chỗ mà ở 1440/1280 vốn đang thừa.

**Câu hỏi Sếp thật sự hỏi ở bảng này không chỉ là "sàn nào mang về bao nhiêu"
mà là "sàn nào mang về bao nhiêu và mất bao nhiêu vào rò rỉ"** — với AGC, tỷ lệ
hủy/hoàn theo từng sàn là số quyết định có đẩy ngân sách sang TikTok hay không.
Đó là thông tin cấp một, không phải chú thích.

**Đề nghị:** giữ đủ 7 cột ở ≥1280px, chỉ cho `.cot-phu` từ 1100px xuống (một
luật `@media`, đúng chỗ hẹp mới thắt). Nếu vẫn muốn bỏ hẳn thì đây là **quyết
định hiển thị của Sếp Ngọc**, không phải của người xây — và đường lùi đã có
sẵn: `BANG_GIU_CUON` kèm lý do viết bằng chữ.

Đường tới dữ liệu thì đúng là còn nguyên: `do-bang-that` arm G/G2/G3 xác nhận
mọi dòng có cột giấu đều có nút "Chi tiết" ≥44px và bấm ra **đủ** trường bị
giấu (19/19 @1440, 18/18 @1024·375).

---

## ⑥ `do-gop-viec` ĐỎ SẴN TRÊN `main` — **XÁC MINH ĐỘC LẬP: ĐÚNG. VÀ TÔI TRUY RA THỦ PHẠM.**

Tôi **không** tin lời khai "đã stash rồi chạy lại". Tôi dựng hẳn một worktree
sạch mới từ `origin/main`:

```
git worktree add .../agc-holy-rev63main 407d2df --detach     # cây sạch, không stash, không dính nhánh
npm run do-gop-viec
```

Kết quả, nguyên văn:

```
--- 1440px ------------------------------------------------
  SỐ DÒNG THẤY ĐƯỢC — TRƯỚC: tab "Việc cần làm" 9 dòng · Lịch sử 7 dòng
                       SAU: "Việc của tôi" 8 dòng · "Toàn công ty" 8 dòng
  Số dòng KHÔNG giảm : ❌ HỎNG
❌ TRƯỢT — 1440px: số dòng bị giảm
exit 1
```

**Lời khai ĐÚNG. `origin/main` đang đỏ, và mã thoát là 1 — không phải cảnh báo
mềm.** Chốt chính Sếp Ngọc dặn — *"không được làm giảm số dòng thấy được"* —
đang bị vi phạm trên hệ thống thật.

### Commit nào gây ra

Tôi chạy lại chính cổng đó trên 5 mốc lịch sử, mỗi mốc một lượt Chrome sạch:

| Commit | Ngày | 1440px: TRƯỚC → SAU | Kết quả |
|---|---|---|---|
| `bfbe853` Bảng vừa một màn | 04/09 | 8 → 12 / 13 | ✅ ĐẠT |
| **`f699272` Vá REV-0059 (CHẶN + 2 CAO)** | **04/09** | **9 → 8 / 8** | ❌ **ĐỎ — LẬT Ở ĐÂY** |
| `da9393f` Vá REV-0059 vòng 2 | 04/09 | 9 → 8 / 8 | ❌ ĐỎ |
| `e9bee04` Gộp: bảng phải vừa màn | 04/09 | 9 → 8 / 8 | ❌ ĐỎ |
| `f1ac70b` Dashboard Marketplace | 05/09 | 9 → 8 / 8 | ❌ ĐỎ |
| `407d2df` = `origin/main` | 06/09 | 9 → 8 / 8 | ❌ ĐỎ |

**Thủ phạm: `f699272`.** Cổng đỏ từ **04/09/2026**, tức **4 ngày và ~15 commit**,
đi xuyên qua **REV-0061, REV-0062 và cả hai vòng vá của chúng**, mà không vòng
soi nào kêu.

### Hậu quả THẬT

- **Mất 1 dòng**, ở phạm vi **"Việc của tôi"** của màn **Lịch sử làm việc**,
  **chỉ ở màn rộng (≥980px)**: 9 dòng → **8 dòng**. Phạm vi "Toàn công ty"
  không bị (8 ≥ 7). Ở 375px không bị (chế độ thẻ, chốt khác).
- **Ai dùng màn đó:** đúng Sếp Ngọc — 1440px là màn Sếp đang ngồi, và "Lịch sử
  làm việc" là màn Sếp mở nhiều nhất để nhìn việc của mình.
- **Vì sao mất:** `f699272` là commit chữa REV-0059 CAO-1 — cho tiêu đề việc
  200 ký tự **kẹp 2 dòng + nút "Xem thêm"** thay vì `nowrap` chạy ra ngoài màn.
  Dòng cao lên một nhịp, nên một màn chứa ít hơn một dòng.
- **Đây là một ĐÁNH ĐỔI có lý, không phải một lỗi ngu ngốc:** 9 dòng cũ là 9
  dòng phải **kéo ngang mới đọc được tiêu đề**; 8 dòng mới đọc được ngay. Chính
  bàn đo đã dùng đúng lập luận đó để đổi chốt ở ≤980px — nhưng **quên áp cùng
  lập luận cho màn rộng**, nên luật ở 1440px vẫn là luật cũ và nó đỏ.
- **Nên xử thế nào:** đây là **quyết định của Sếp**, không phải của người xây.
  Hoặc (a) Sếp chấp nhận đánh đổi → sửa chốt ở màn rộng cho đúng ý định, ghi lý
  do vào bàn đo giống hệt cách đã ghi cho ≤980px; hoặc (b) Sếp không chấp nhận
  → phải lấy lại dòng đó bằng cách bỏ bớt TRƯỜNG trên dòng, **không** bằng cách
  hạ mốc và **không** bằng cách bóp chữ.

**Không phải nợ của nhánh này** — nhánh này không đụng vào màn Lịch sử làm
việc. Người xây đã ghi vào `HANG-DOI.md`. Tôi xác nhận và bổ sung thủ phạm +
hậu quả để `HANG-DOI.md` có đủ dữ kiện mà xử.

---

## ⑦ CHẠY LẠI HẾT CỔNG — xem bảng ở mục 0. **0/12 lệch.**

Thêm hai điều bàn đo tự bày ra trong lúc tôi quét:

**VỪA-4 — `do-bang-that` chấm bảng bề ngang 0px là "vừa".**
Trong lượt quét `--commit 407d2df` ở mức 1024px, 23 bảng chính đo ra
`khung 0 · bảng 0`, và bàn đo in ra:

```
--- 1024px · soi 30 bảng · hiện 29 · thẻ 1 · tràn 0 ---
  ns-bang   5 cột · khung 0 · bảng 0 · vừa
  ...
```

Arm D xanh (30 ≥ 30), arm A xanh (0 tràn) — **trong khi thật ra không bảng nào
được vẽ ra để mà đo**. Vì `tran = rong > khung + 1`, và `0 > 1` là sai. Arm R
mới là chốt bắt được (nó đòi 19 bảng bắt buộc có dòng THẬT). Ghi ra đây vì đúng
họ với ④: **một phép đo không phân biệt được "vừa" với "không có gì để đo"**.
Chữa rẻ: arm A báo đỏ nếu `khung === 0` trên bảng không bị CSS ẩn.

**THẤP-2 — mức 1024px chỉ được thêm vào 2 bàn.** `do-bang-that` và bàn chụp ảnh
nay có 1024. `do-bang-vua-man` vẫn 1440·1100·900·375·320. Lời cấm viết ở `RONGS`
rất tốt nhưng nó chỉ cấm trong một tệp; bàn kia vẫn nhảy qua 981–1100.

---

## ⑧ 40 TẤM ẢNH — hai điều xác nhận, một điều KHÔNG xác nhận được

**Xác nhận ①: bàn chụp biết cuộn tới chỗ đang chấm.** Đúng và quan trọng.
`1440-kinhdoanh-truoc.png` bày ra nguyên hình cái bệnh: tiêu đề cụt thành
*"DOANH T…"*, con số cụt thành *"9.876.543.21"* — mất đúng chữ số cuối và chữ
"đ". `1440-kinhdoanh-sau.png` hiện đủ *"DOANH THU"* và *"9.876.543.210 đ"*, dòng
từ 7 xuống 2, ba dòng gọn trong chỗ trước kia chứa một. `1024-kinhdoanh-truoc`
còn nặng hơn: mất hẳn **hai** cột "SL BÁN" và "DOANH THU". Không có `cuonToi`
thì không tấm nào trong số này tồn tại. Đây là cải tiến bàn đo tốt nhất của
vòng này.

**Xác nhận ②: ảnh bắt được thứ bàn đo số không thấy** — đúng, nhưng **thứ nó
bắt được là CAO-1 ở trên**, không phải cái người xây kể.

**KHÔNG xác nhận được (VỪA-2): chuyện chữ "đ" rơi xuống dòng riêng ở 375px.**
Ghi chú vĩnh viễn trong `app.js` viết: *"một số tiền 13 chữ số bị ngắt và chữ
'đ' rơi xuống một dòng RIÊNG — ảnh `375-kinhdoanh-sau.png` bắt được"*. Tôi kiểm
ba đường, cả ba đều không ra:

1. **Mở chính tấm ảnh được dẫn.** `375-kinhdoanh-sau.png` hiện
   `9.876.543.210 đ` **trên một dòng**. Tấm này là bản ĐÃ VÁ — nó không thể
   "bắt được" cái lỗi mà nó đã chữa xong.
2. **Mở tấm "trước".** `375-kinhdoanh-truoc.png` cũng hiện
   `9.876.543.210 đ` **trên một dòng**. Lỗi không có ở đó.
3. **Dựng lại ca xấu bằng máy.** Tôi chạy bản vá với công tắc `BO_NBSP=1` —
   thay mọi dấu cách không ngắt trở lại thành dấu cách thường, tức dựng lại
   đúng trạng thái trước khi vá — rồi đo chiều cao ô tiền ở 375 · 1024 · 1440:

   | | có nbsp (bản vá) | bỏ nbsp (trước khi vá) |
   |---|---|---|
   | 375px | cao 60px · **2 dòng** | cao 60px · **2 dòng** |
   | 1024px | cao 72px · 3 dòng | cao 72px · 3 dòng |
   | 1440px | cao 72px · 3 dòng | cao 72px · 3 dòng |

   **Giống hệt nhau từng pixel.** Dấu cách không ngắt **không đổi gì cả** ở bố
   cục hiện tại.

Bản thân chỗ sửa **vô hại và đúng về mặt chữ nghĩa** — đơn vị tiền dính với con
số là chuẩn, giữ lại. Vấn đề là **lời khai**: một ghi chú vĩnh viễn trong mã
sản phẩm đang khẳng định một số đo và dẫn một tấm ảnh làm chứng, mà **tấm ảnh
đó không chứa điều được khẳng định**. Đúng cái nhà này gọi là *"khai không phải
là đo"*, chỉ khác là lần này người khai là người xây chứ không phải bàn đo. Sửa
ghi chú cho khớp thực tế, hoặc dẫn đúng tấm ảnh có chứa nó.

*(Ảnh `dangnhap` và `khovan` trước/sau trùng byte ở cả 4 mức — đúng, hai màn
này không bị bản vá đụng tới. `trammuctieu`/`lichsuviec` lệch nhẹ là do bàn
chụp thêm mock Dashboard, không phải do CSS.)*

---

## DANH SÁCH PHẢI VÁ

### CHẶN — 0
Không có. Nhánh này tốt hơn `origin/main` ở mọi mức đo.

### CAO — 2

- **CAO-1 · Cắt chữ âm thầm ở cột "Mã SKU · Tên hàng", màn 1440px.**
  Đo được: `.sm` hiện 34px / thật 50px, **không có nút "Xem thêm"**, chỉ có
  `title`. Trái luật nhà *"không cắt chữ âm thầm"* và trái chính lời khai của
  bản vá. Chữa ở `luoiBang()` (`app.js` ~11286): cho đường cấp nút "Xem thêm"
  xét cả `.sm` trong `.cot-chu`, không chỉ `.nm`. Chữa một chỗ, được cả lớp.

- **CAO-2 · Còn 2 luật CSS chết trong `@media`, 1 chỗ nằm ngay cạnh chỗ vừa sửa.**
  `td.cot-chu.co-chitiet { min-width: 150px }` (dòng 1622, khối ≤1100px) bị
  dòng 1640 đè — **đúng luật sinh ra để cứu tràn ở 1024px và nó chưa từng chạy**.
  Cộng `.chat-tin { max-width: 86% }` (dòng 2521) bị dòng 2523 đè. Người xây
  tuyên bố "đây là một LỚP" rồi chữa một chỗ.

### VỪA — 4

- **VỪA-1 · `do-bang-that` arm D vẫn `>=`.** Sửa mẫu số 27→30, không sửa cơ chế.
  Bẫy "mẫu số im lặng tụt lại" còn nguyên cho bảng thứ 31. Đổi sang `===`.
- **VỪA-2 · Ghi chú vĩnh viễn khai một số đo không tái lập được** (chữ "đ" ở
  375px) và dẫn một tấm ảnh không chứa điều được khai.
- **VỪA-3 · `kd-tq-bang` bỏ 2 cột ở MỌI bề ngang** để chữa +26px chỉ có ở
  1024px, kèm một lý do sai dữ liệu (thẻ số là tổng công ty, không tách sàn).
  Đề nghị chỉ `.cot-phu` từ ≤1100px, và để Sếp chốt.
- **VỪA-4 · `MOC_CAO_DONG` trong `do-bang-that` là chốt giả** (khai báo, không
  ai dùng); và bảng đo ra bề ngang 0px được chấm là "vừa". Ở 1024px hiện không
  có gì canh "số dòng thấy được".

### THẤP — 2

- **THẤP-1 · `min-width: min(560px, 100%)`** không giải được trong khối chứa
  co-theo-nội-dung. Hôm nay ERP không có ca nào; ghi ra để sau này biết chỗ nhìn.
- **THẤP-2 · Mức 1024px mới có ở 2 bàn.** `do-bang-vua-man` vẫn nhảy qua dải
  981–1100px.

### NỢ ĐÃ BIẾT — không tính vào vòng này
`do-tu-lam-moi` 52 · 2 (của `f1ac70b`) · `do-gop-viec` đỏ trên `origin/main`
(của `f699272`, xem mục ⑥).

---

## GHI NHẬN

Bốn việc người xây làm rất tốt và tôi muốn nói thẳng ra:

1. **Không đi tìm cột để bỏ mà đi tìm gốc bệnh.** `560 − 537 = 23` khớp đúng
   con số tràn — đó là chẩn đoán, không phải mò. Và cách chữa `min(560px, 100%)`
   chữa cả lớp: tôi quét 30 bảng × 5 bề ngang, **26 bảng không xê dịch một
   pixel**. Đây là kiểu sửa hiếm — đụng vào luật toàn cục mà không gây một
   hồi quy nào.
2. **Tìm ra một luật CSS đã chết nhiều vòng mà không ai biết**, bằng cách đọc
   độ ưu tiên chứ không bằng cách thử. Máy quét của tôi xác nhận nó có thật.
3. **Bật mức 1024px kèm lời cấm viết ngay tại chỗ dễ bị xoá nhất**, và bật xong
   thì dọn sạch 5 chỗ tràn lòi ra thay vì để cổng đỏ sẵn.
4. **Tự khai ra ca xấu của mình** — cả `do-gop-viec` đỏ trên `main` lẫn quyết
   định bỏ 2 cột — vào `HANG-DOI.md`, xin xác nhận thay vì im. Tôi kiểm cả hai
   lời khai đó: **cả hai đều thật**. Trong một vòng soi, người xây tự nộp bằng
   chứng chống lại mình là thứ đáng ghi nhận nhất.

Vá xong CAO-1 và CAO-2 thì tôi mở cổng ngay.
