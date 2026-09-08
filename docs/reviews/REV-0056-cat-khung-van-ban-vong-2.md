# REV-0056 vòng 2 — Soi bản vá "Cắt khung văn bản"

- **Người soi**: HỒ LY (Review Gate) · 03/09/2026
- **Nhánh**: `feature/cat-khung-van-ban` @ `2e6d2f6` (thêm 1 commit trên bản vòng 1 `1468f33`)
- **Kết luận**: ❌ **FAIL** — **0 lỗi CHẶN**, **1 lỗi CAO**, 2 VỪA, 3 THẤP.
  Lỗi CHẶN của vòng 1 **đã vá đúng và tôi đã đo tận tay**. Cái chặn lượt này là
  **lỗi MỚI do chính bản vá đẻ ra**: máy dò "nhiều hơn một tờ" **báo nhầm trên
  đúng ca Sếp Ngọc mô tả** ("chụp rộng"), và nói với Sếp một câu **sai** — tức
  là lặp lại đúng loại lỗi mà lỗi #2 vòng 1 đã nêu.
- **Hai chỗ Khỉ Đột cãi lại tôi: NÓ ĐÚNG CẢ HAI.** Chi tiết ở Mục 0.
- **Không sửa một dòng mã sản phẩm nào. Không commit, không push.**
  (`git diff HEAD -- public/ src/ package.json` — rỗng.)

---

## Mục 0 — HAI CHỖ KHỈ ĐỘT CÃI LẠI TÔI

### 0.1 — Phép thử của tôi có ĐẢO CHIỀU không → **CÓ. Nó đúng, tôi sai.**

Nguyên văn dòng tôi viết ở vòng 1:

```js
dat(bang[1].anh !== bang[2].anh && bang[2].anh !== bang[3].anh,
    'Mỗi lần "Cắt lại" tạo ra ảnh KHÁC — tức là cắt CHỒNG lên bản đã cắt')
```

`dat(dk, nhan)` in **"ĐẠT"** khi `dk` đúng. Nhãn thì mô tả **một cái lỗi**.
Đo bằng logic thuần (`soi-cat-khung-vong2.html` mục ①):

```
Trên mã CÒN LỖI  → điều kiện true  → dat() in "ĐẠT"
Trên mã ĐÃ VÁ    → điều kiện false → dat() in "HỎNG"
→ ĐẢO CHIỀU: xanh đúng lúc lỗi còn nguyên, đỏ đúng lúc lỗi đã vá
```

Và đây là dòng **thật** trong bản in vòng 1 của tôi, trên mã còn nguyên lỗi #1:

> `ĐẠT   Mỗi lần "Cắt lại" tạo ra ảnh KHÁC — tức là cắt CHỒNG lên bản đã cắt`

**Bàn đo của tôi chứng nhận cái sai.** Nó không kéo `soHong` (tôi không cộng
điểm cho dòng đó), nên không làm hỏng kết luận vòng 1 — nhưng một dòng như thế
nằm trong bàn đo là mối nguy thật, và Khỉ Đột gỡ nó là đúng.

**Phép thử thay thế có nghiêm hơn thật không → CÓ.** Bản cũ chỉ hỏi "ba ảnh có
khác nhau không" — một câu hỏi mà **cả mã đúng lẫn mã sai đều trả lời được**.
Bản mới hỏi cắt có phải **hàm thuần của (ảnh gốc, khung)** không, ba vế:

| Vế | Đo được (tôi chạy lại) |
|---|---|
| ① cắt 3 lần **cùng** khung → byte y hệt | ĐẠT |
| ② **đổi** khung → ảnh khác (không phải nút chết) | ĐẠT |
| ③ **quay lại** khung cũ → ĐÚNG byte lần đầu | ĐẠT |

Vế ③ là vế bản cũ không có và **không thể có**: nó bắt được cả tích luỹ lẫn
"nút chết", hai lỗi ngược dấu mà vế ① một mình không phân biệt nổi.

### 0.2 — Bàn đo của tôi có MÙ không → **CÓ. Nó đúng, tôi sai.**

Tôi dựng một trang **cố ý chết ngay lúc nạp** (`import` một module không tồn
tại) rồi chấm bằng đúng hai bộ luật (`soi-cat-khung-vong2.mjs` mục ⓪):

```
#kq đứng ở: "đang soi…"
dòng HỎNG=0 · console.error=0 · ngoại lệ=0 · thấy KET_LUAN=false
LUẬT CŨ  (của tôi, vòng 1) → "KHÔNG BẮT ĐƯỢC LỖI", thoát 0  ← MÙ
LUẬT MỚI (Khỉ Đột thêm)   → BẮT ĐƯỢC, thoát 1
```

Bàn soi vòng 1 của tôi **chứng nhận một trang đã chết là sạch**. Lỗi cú pháp
không đi qua `console.error` — nó đi qua `Runtime.exceptionThrown`, mà bản của
tôi không đọc. Ba chỗ Khỉ Đột thêm (bắt buộc thấy `KET_LUAN` · đọc ngoại lệ ·
mã thoát theo kết quả) đều **siết vào**, không nới ra. Tôi đã đọc kỹ cả hai tệp
nó sửa của tôi: **không có chỗ nào nới lỏng.**

### 0.3 — Tôi khuyên `Map` bộ nhớ phiên: **lời khuyên đó SAI, và tự mâu thuẫn**

Nó nói đúng cả hai vế:

1. **`Map` chết theo tab.** Ca cần lùi nhất là *tắt máy / hết pin rồi mở lại* —
   đúng cái mà bản nháp sinh ra để chống. `Map` không cứu được ca đó.
2. **Văn bản và bàn đo của tôi đá nhau.** Bàn đo vòng 1 của tôi khẳng định trên
   `localStorage`:
   ```js
   const tr = nhap().trang[0];      // đọc localStorage
   const coGocCu = Object.entries(tr).some(([k,v]) => … v.startsWith('data:image'));
   ```
   Tức là nếu Khỉ Đột làm **đúng theo lời tôi khuyên** (`Map`), bàn đo của
   chính tôi vẫn đỏ. Lời khuyên và phép đo của tôi đòi hai thứ khác nhau.

**Tôi rút lời khuyên `Map`.** Chọn `localStorage` là chọn đúng. Nhưng nó đẻ ra
một đường mất dữ liệu mới, và đó mới là chỗ tôi phải soi — Mục 1.

---

## Mục 1 — RỦI RO MỚI: `localStorage` hết chỗ

`anh_goc` tôi đo được tốn thêm **299 KB/trang** (Khỉ Đột khai 293 KB — khớp).
12 trang đã cắt ≈ **3,5 MB chỉ riêng ảnh gốc**, cộng ~2,8 MB ảnh đang dùng là
**vượt trần 5 MB**. Nên `ghiNhap()` phải nhường. Tôi ép quota bằng cách chặn
`Storage.prototype.setItem` theo cỡ — cách duy nhất ép được **cả hai** lượt thử
một cách xác định.

| Ca ép | Đo được | |
|---|---|---|
| Trần lọt bản gọn, chặn bản đủ (384 KB) | 2 lượt ghi, 1 bị chặn | |
| → bản nháp còn không | **CÒN**, 1/1 trang | ✅ |
| → **`anh` (ảnh đang dùng) có giữ được không** | **GIỮ ĐƯỢC** | ✅ |
| → **`anh_goc` có phải thứ bị nhường không** | **ĐÚNG, chỉ nhường ảnh gốc** | ✅ |
| → câu báo có **hiện ra màn** không | **HIỆN**: *"Máy hết chỗ nên không giữ được ảnh gốc…"* | ✅ |
| **Cả hai lượt hỏng** (trần 1 KB) | 2 lượt ghi, 2 bị chặn | |
| → giao diện có nổ không | **KHÔNG** | ✅ |
| → bản nháp cũ trên đĩa | **còn nguyên** (setItem hỏng không xoá bản cũ) | ✅ |
| → trang còn trong bộ nhớ, còn lưu lên máy chủ được | **còn** | ✅ |
| → câu *"máy không lưu được bản nháp"* | **hiện** | ✅ |
| **Trần bằng 0 ngay từ đầu** (chế độ riêng tư) | chụp + cắt vẫn chạy, không nổ | ✅ |
| **Đang cắt trang thứ 12 thì hết chỗ** | | |
| → 12 trang còn đủ không | **CÒN ĐỦ 12** | ✅ |
| → trang 1–11 có hỏng lây không | **KHÔNG**, cả 12 còn ảnh dùng được | ✅ |

**Thứ tự nhường Khỉ Đột khai là thứ tự nó làm thật**, tôi đo tận tay chứ không
đọc chú thích: `ghiNhap()` lượt hai chỉ bóc `anh_goc`
(`trang.map(({anh_goc, ...t}) => t)`), không đụng `anh`. Đúng thứ tự phải có —
`anh` mất là **mất trắng**, `anh_goc` mất chỉ là **mất đường lùi**.

**Đây là phần làm tốt nhất của bản vá.** Không có lỗi nào ở đường quota.

### Lỗi #4 (THẤP) — nhường ảnh gốc là nhường **cả nắm**, không nhường từng cái

Đo được ở ca 12 trang: sau khi trang 12 làm tràn, số trang còn giữ ảnh gốc là
**0/12** — không phải 11/12. Lượt ghi thứ hai bóc `anh_goc` của **mọi** trang.
Người đã cắt trang 3 từ nửa tiếng trước mất đường lùi của trang 3 chỉ vì trang
12 không vừa.

**Vì sao vẫn chỉ THẤP**: màn hình **có** nói ra (câu báo hiện đúng), và cách
làm đúng hơn (nhường ảnh gốc **cũ nhất trước**, bỏ dần tới khi vừa) tốn thêm
một vòng lặp — không đáng chặn phát hành. Ghi để xếp hàng đợi.

---

## LỖI #1 — CAO · Máy dò "nhiều hơn một tờ" **báo nhầm trên đúng ca Sếp mô tả**

**Mức: CAO** · `public/assets/js/cat-khung.js:449-461` (`nhieuTo`, ngưỡng 0,40)

Bản vá bỏ câu khoe *"4 mép rõ, 65% chiều dài"* — **đúng và tôi ủng hộ**. Nhưng
nó thay bằng một câu mới, và câu mới **sai** ở ca thường gặp nhất.

Máy dò một **mép giấy dọc nằm ở khoảng giữa ảnh** rồi kết luận "có tờ thứ hai".
Nhưng mép giấy nằm giữa ảnh **không có nghĩa là có hai tờ** — nó cũng là thứ
xảy ra khi **một** tờ giấy nằm lệch, hoặc nhỏ trong khung.

### Đo được — 6 cảnh tờ ĐƠN, 4 cảnh nhiều tờ (`soi-cat-khung-vong2.html` mục ③)

```
TỜ ĐƠN (phải KHÔNG báo "nhiều tờ"):
  ok         tờ đơn, ngay giữa, chiếm 62%       phuGiua   8%
  ✗ BÁO NHẦM tờ đơn LỆCH HẲN SANG TRÁI          phuGiua 100%
  ✗ BÁO NHẦM tờ đơn NHỎ giữa khung (chụp xa)    phuGiua  65%
  ok         tờ đơn GẤP ĐÔI, nếp hằn giữa       phuGiua  37%
  ok         tờ đơn có KHUNG VIỀN dọc           phuGiua  12%
  ok         tờ đơn chụp NGHIÊNG                phuGiua   9%
NHIỀU TỜ (phải báo "nhiều tờ"):
  ok         hai tờ RỜI cạnh nhau               phuGiua  80%
  ✗ LỌT      hai tờ CHỒNG MÉP nhau              phuGiua   9%
  ok         hai tờ KHÁC CỠ                     phuGiua 100%
  ✗ LỌT      SÁCH MỞ (hai trang, gáy giữa)      phuGiua   8%
```

**2/6 tờ đơn báo nhầm · 2/4 nhiều tờ lọt.**

### Con số "gần 7 lần" **không sống nổi khi thêm cảnh**

| | Trên 5 cảnh của Khỉ Đột | Trên 10 cảnh của tôi |
|---|---|---|
| Tờ đơn cao nhất | 12% | **100%** |
| Nhiều tờ thấp nhất | 80% | **8%** |
| Khoảng cách | 6,7 lần | **0,1 lần** |

Khoảng cách "gần 7 lần" là **tính chất của 5 cảnh đã chọn**, không phải tính
chất của máy dò. Cả 5 cảnh tờ đơn trong `do-cat-khung` đều có tờ giấy **nằm
giữa và chiếm gần hết khung**, nên không cảnh nào có mép giấy rơi vào dải giữa.
Thêm **một** cảnh tờ đơn lệch là khoảng cách sập.

*(Ghi thêm: hai con số khác nhau cho cùng một khoảng cách — "gần 7 lần" báo lên
Gạo, "năm lần" trong chú thích `cat-khung.js:459`. Không con số nào sống sót.)*

### Vì sao là CAO chứ không phải VỪA — câu sai **đập thẳng vào mắt**, trên **ca chính**

Ca `chụp xa` là **cảnh của chính Khỉ Đột** (`do-cat-khung.html:256`, dùng làm ca
chủ lực chứng minh "cắt khung đáng làm"), và là **đúng cảnh Sếp Ngọc mô tả**:
*"chụp rộng nhưng tao chỉnh được khung văn bản"*. Chạy thật qua màn quét ở
375×812 (`soi-nhieuto.html`), **một tờ giấy duy nhất**:

```
phuGiua=65% · nhieuTo=true · tuTin=true
→ màn cắt TỰ BÀY: CÓ
→ Câu .tlq-canh hiện trên màn:
  "Trong ảnh hình như có NHIỀU HƠN MỘT tờ giấy, và khung máy đoán đang ôm cả
   hai. Sếp kéo khung về đúng MỘT tờ — hoặc chụp lại từng tờ một, mỗi tờ một
   trang, sẽ nhanh và rõ hơn."
```

Ba lý do nâng lên CAO:

1. **Nó bảo Sếp làm việc thừa.** Câu khuyên *"chụp lại từng tờ một"* — trong khi
   chỉ có một tờ và ảnh đang hoàn toàn dùng được. Nhân sự kho làm theo là **đi
   chụp lại một tấm ảnh vốn đã đúng**.
2. **Nó ĐÈ mất lời khuyên đúng.**
   `loiKhuyen: nhieuTo ? KHUYEN_NHIEU_TO : (tuTin ? '' : KHUYEN_KHONG_CHAC)`
   — ca tờ đơn lệch mà máy **không** chắc (đo được: `nhieuTo=true, tuTin=false`)
   thì người dùng nhận câu "có hai tờ, chụp lại đi" **thay cho** câu đúng là
   "kéo 4 chấm vào 4 góc". Kéo thì xong ngay; chụp lại thì mất công vô ích.
3. **Đây đúng loại lỗi mà lỗi #2 vòng 1 đã nêu**: *màn hình nói sai về chính nó*.
   Bản vá gỡ một câu nói dối và cắm vào một câu nói dối khác, ở ca thường gặp
   hơn hẳn.

**Không mất dữ liệu** — đường lùi chạy tốt (Mục 2), nên không phải CHẶN.

### Cách sửa (nhỏ)

Mép giấy nằm giữa ảnh chỉ đáng nghi khi nó **không phải mép của chính tứ giác
vừa dựng**. Thêm một điều kiện vào `nhieuTo`: bỏ qua `mepGiua` nếu nó nằm sát
cạnh trái/phải của `gocChuan` (sai số vài phần trăm bề ngang). Ca hai tờ rời thì
mép giữa nằm **trong lòng** tứ giác đang ôm cả hai → vẫn bắt được; ca một tờ
lệch thì mép giữa **chính là** cạnh tứ giác → im lặng. Ước ~5 dòng.

Không muốn sửa thì **bỏ hẳn `nhieuTo`** và giữ nguyên hai câu `KHUYEN_KHONG_CHAC`
/ im lặng — vẫn tốt hơn hẳn bản trước vá, và không nói câu nào sai.

**Và phải sửa cả bàn đo**: `do-cat-khung` mục ③ cần ít nhất **hai** cảnh tờ đơn
có mép rơi vào dải giữa (lệch trái · nhỏ giữa khung), cùng ca **hai tờ chồng
mép** và **sách mở**. Ngưỡng chốt trên 5 cảnh cùng bố cục thì không phải là
ngưỡng, chỉ là số khớp với 5 cảnh đó.

---

## Mục 2 — Bản vá lỗi #1 (ảnh gốc): **đúng, và tôi đã đo tận tay**

| Đo | Khỉ Đột khai | **Tôi đo** | |
|---|---|---|---|
| Cắt 3 lần cùng khung | 172 · 172 · 172 KB | **byte Y HỆT cả 3 lần** | ✅ |
| Kích thước qua 3 lần | 975×1367 cả ba | **không tụt** | ✅ |
| Đổi khung → ảnh khác | — | **khác** | ✅ |
| Quay lại khung cũ → byte lần đầu | — | **trùng khít** | ✅ |
| "↩ Ảnh gốc" → băm SHA-256 | trùng khít | **`c6159a0f8230…` = `c6159a0f8230…`** | ✅ |

**Ba ca Khỉ Đột CHƯA nêu, tôi đo thêm:**

| Ca | Kết quả |
|---|---|
| Cắt → lùi → cắt lại → **lùi lần nữa** | ĐẠT cả 2 vòng, băm trùng khít cả 2 lần |
| Sau khi lùi, trang có sạch dấu vết không | ĐẠT — `da_cat`·`anh_goc`·`goc_cat` đều rụng, nút "↩" tự ẩn |
| **Trang kiểu CŨ** (đã cắt, không có `anh_goc`) | ĐẠT — nút "↩ Ảnh gốc" **ẨN**, không hiện nút bấm không được; vẫn cắt lại được |

Ca cuối là ca thật sẽ xảy ra: bản nháp cũ còn trên máy Sếp sau khi nâng cấp, và
trang bị nhường ảnh gốc vì hết chỗ. **Không nói dối người dùng bằng một cái nút
chết** — chỗ này làm đúng.

---

## Mục 3 — Bản vá lỗi #3 (đổi cỡ màn): **đúng, và tôi đo bằng XOAY MÁY THẬT**

Cổng của Khỉ Đột chỉ đổi bề ngang hộp. Tôi đổi **khung nhìn thật** bằng CDP, và
**tự kiểm khung nhìn ra đúng số đã xin** trước mỗi phép đo:

| Khung nhìn | Lệch chấm ↔ góc ảnh |
|---|---|
| dọc 375×812 (gốc) | **0,5px** |
| máy hẹp 320×568 | **0,0px** |
| **XOAY NGANG 812×375** | **0,0px** |
| bàn phím ảo 375×480 | **0,5px** |
| xoay về dọc | **0,5px** |

Vòng 1 đo **28,0px**. Lỗi #3 **đã hết**, ở cả ca xoay ngang mà cổng không đo.

**Màn cắt ở cấu hình CAO NHẤT vẫn vừa một màn**: ca có thêm đoạn lời khuyên
(cao 99px) ở 375×812 → mép dưới hàng hai nút **803px / 812px** — đúng bằng ca
không có lời khuyên, vì `tuCoVuaMan()` co ảnh xem trước bù lại. Cấu hình này
cổng **không** đo (cổng chỉ đo ca máy chắc = im lặng); tôi đo và nó **đạt**.

### Lỗi #2 (VỪA) — màn cắt **không vừa một màn** khi khung nhìn thấp dưới ~570px

| Khung nhìn | Mép dưới hàng hai nút | |
|---|---|---|
| 375×812 | 803px / 812px | ✅ vừa (dư 9px) |
| **320×568** | **757px / 568px** | ❌ phải cuộn |
| **812×375 (nằm ngang)** | **622px / 375px** | ❌ phải cuộn |
| **375×480 (bàn phím ảo)** | **683px / 480px** | ❌ phải cuộn |

Ảnh xem trước **đã co hết cỡ** (128×170, chạm sàn 150–170px) ở cả ba ca — phần
cố định (đầu màn + đoạn pháp lý 130px + lời khuyên + chip + hai nút) tự nó đã
vượt 375px. Đây là **đánh đổi có chủ ý** đã ghi trong mã (*"thà để cuộn một
chút"*), và là lỗi **có từ vòng 1**, không phải do bản vá đẻ ra — nhưng đoạn
lời khuyên mới làm nó cao thêm đúng ở ca hay gặp. Ghi để Sếp biết: **xoay ngang
điện thoại lúc đang cắt thì phải cuộn mới thấy nút.**

### Lỗi #3 (VỪA) — thẻ trang đã cắt cao **421px** ở 320px

| Bề ngang | Thẻ trang **đã cắt** (6 nút) | |
|---|---|---|
| 375px | **112px** (trần 116px) · 6 nút · thấp nhất 44px · không tràn | ✅ |
| **320px** | **421px** · 6 nút · thấp nhất 44px · không tràn | ❌ |

Con số 112px của Khỉ Đột **đúng** — tôi đo lại đúng 112px, với **6 nút thật**
(`↑ | ↓ | ✂ Cắt lại | Thay | Xoá | ↩ Ảnh gốc`) trên một trang **đã cắt thật**.
Nhưng `do-tai-tep` chỉ đo ở **1440px và 375px**, và chỉ đo thẻ **5 nút** (đường
tải file không bao giờ cắt) — nên **không cổng nào** nhìn thấy con số 421px.

Ở 320px, 12 trang đã cắt ≈ **5.000px cuộn**, ngược hẳn luật *"ưu tiên vừa một
trang, hạn chế kéo trang"*. Không tràn thẻ, không mất nút, không đẻ thanh cuộn
ngang — nên VỪA, không CAO. Sửa: cho `.tlq-the-nut` xuống 2 cột ở `≤360px`.

---

## Mục 4 — Đo lại HẾT cổng bắt buộc (tự mắt thấy)

| Cổng | Kết quả |
|---|---|
| `do-cat-khung` | ✅ ĐẠT · `doan_dung=4/6` |
| `cong-khoi` @1440 | ✅ XANH |
| `cong-khoi-dienthoai` @375 | ✅ XANH |
| `do-quet-375` | ✅ ĐẠT |
| `do-tai-tep` | ✅ ĐẠT cả hai bề ngang |
| `do-kho-tai-lieu` | ✅ ĐẠT toàn bộ |
| `do-ba-mau` | ✅ ĐẠT |
| `do-cat-im-lang` | ✅ ĐẠT |
| `do-chu-dai` | ✅ XANH |
| `soi-cat-khung` (bàn của tôi, sau khi nó sửa) | chạy được, luật mới siết đúng |

**9/9 cổng xanh.** Không cổng nào bị phá.

### Hai con số Khỉ Đột tự sửa — xác nhận trên máy tôi

- **Tổng một lượt cắt**: cách đo mới (bấm giờ **một lượt**, gồm cả giải mã +
  mã hoá + vẽ lại) trên **máy tôi** ra **0,06 s** (không làm rõ chữ) ·
  **0,11 s** (có làm rõ chữ). Nó nói đúng: con số **0,08 s** cũ là **cộng ba
  bước rời**, bỏ mất giải mã và mã hoá — cách đo cũ sai, cách mới đúng. Con số
  0,12–0,15 s tôi nêu ở vòng 1 cũng là số cộng-bước-rời của tôi, nay **bỏ**.
- **Ca chụp GẦN, cắt khung KHÔNG cải thiện**: xác nhận. Vòng 1 tôi đo
  `8/8 → 8/8, ký tự −5,6 điểm`. Nó thừa nhận đã giấu ca này ở lượt báo cáo
  trước — **thừa nhận đúng**. Kết luận cuối cùng phải là: **cắt khung ăn điểm ở
  ca chụp xa / thiếu sáng; ca chụp gần đủ sáng thì không đổi gì** (chỉ được file
  nhẹ 22% và ảnh ngay ngắn).

---

## Mục 5 — Lỗi THẤP còn lại

**#5 (THẤP)** — Cảnh `chup-xa` được dùng làm **ca chủ lực** chứng minh giá trị
OCR (`do-cat-khung.html:256`), nhưng **không** nằm trong danh sách `CA` của mục
③, nên **độ chính xác dò góc trên chính ca chủ lực chưa bao giờ được đo**. Đó
cũng là lý do lỗi CAO ở trên lọt qua cổng. Thêm `'chup-xa'` vào `CA` là 1 dòng.

**#6 (THẤP)** — Hai con số khác nhau cho cùng một khoảng cách ("gần 7 lần" báo
lên Gạo · "năm lần" ở `cat-khung.js:459`). Sau khi sửa lỗi CAO thì phải đo lại
và ghi **một** con số, kèm **danh sách cảnh** đã dùng để chốt.

---

## Việc phải làm

| # | Mức | Việc | Ước lượng |
|---|---|---|---|
| 1 | **CAO** | `nhieuTo`: bỏ qua mép giữa nếu nó **chính là cạnh của tứ giác vừa dựng** — hoặc bỏ hẳn tính năng | ~5 dòng |
| 1b | **CAO** | `do-cat-khung` mục ③: thêm cảnh tờ đơn **lệch trái** · **nhỏ giữa khung** · hai tờ **chồng mép** · **sách mở** | ~15 dòng |
| 2 | VỪA | Màn cắt khi khung nhìn thấp <570px: hoặc thu gọn đoạn pháp lý, hoặc chấp nhận và ghi vào tài liệu | — |
| 3 | VỪA | `.tlq-the-nut` xuống 2 cột ở ≤360px (thẻ 421px → ~160px) | 2 dòng |
| 4 | THẤP | Nhường ảnh gốc **cũ nhất trước** thay vì bóc cả nắm | ~8 dòng |
| 5 | THẤP | Thêm `'chup-xa'` vào `CA` của `do-cat-khung` mục ③ | 1 dòng |
| 6 | THẤP | Chốt lại **một** con số khoảng cách, kèm danh sách cảnh | — |

**Sửa xong #1 + #1b thì lượt này PASS.** Mọi thứ khác trong bản vá — ảnh gốc,
đường lùi, đường quota, đổi cỡ màn, thẻ trang ở 375px — tôi đã đo tận tay và
**đều đúng như Khỉ Đột khai**.

---

## Nói thẳng về vòng này

Khỉ Đột **cãi đúng cả hai chỗ**, và cả hai đều là lỗi trong bàn đo của tôi chứ
không phải trong sản phẩm: một phép thử đảo chiều chứng nhận cái sai, và một
runner mù chứng nhận trang chết là sạch. Nó sửa cả hai theo hướng **siết vào**.
Bản soi khuyên sai không phải chuyện xấu hổ — giấu mới là, nên tôi ghi rõ ở
Mục 0 và rút lời khuyên `Map`.

Đổi lại, chỗ nó chưa làm được là **chốt một ngưỡng trên năm cảnh cùng một bố
cục rồi gọi khoảng cách đó là "gần 7 lần"**. Khoảng cách ấy sập xuống 0,1 lần
khi tôi thêm một cảnh tờ giấy nằm lệch — và cảnh làm nó sập nặng nhất lại chính
là cảnh nó tự dựng để chứng minh giá trị của cả tính năng.

### Bài học tôi tự ghi cho vòng sau

Vòng này tôi **suýt báo sai ba lần**, cả ba đều do phép đo chứ không do sản phẩm:

1. "Xoay ngang" bằng cách nới hộp lên 700px trong khi khung nhìn vẫn 375px —
   một trạng thái không tồn tại, đẻ ra con số "nút rơi xuống 1352px".
2. Đo thẻ trang **5 nút** rồi gọi là thẻ 6 nút — vì tôi bấm Cắt lúc 4 góc còn ở
   mép ảnh, `catXong` coi là "không có gì để cắt" và lặng lẽ bỏ qua.
3. `Emulation.setDeviceMetricsOverride` với `mobile:true` mà thiếu `screen*`:
   **xin 375×812, Chrome cho 981×2123**. Ba phép đo chiều cao đầu tiên vô nghĩa.

Cả ba đều bị bắt bằng cùng một thói quen: **bắt phép đo tự khai số nó thật sự
đang đo** (in `innerWidth×innerHeight`, in tên 6 cái nút, in cỡ ảnh xem trước)
rồi so với số đã xin. Bàn đo nào không tự khai được thì không tin được — đúng
bài học Khỉ Đột vừa dạy tôi ở Mục 0.2.

---

## Phụ lục — bàn đo của tôi ở vòng này

Ba bàn, đều chạy trên **đúng mã sản phẩm** trong `public/`, không sửa mã sản phẩm:

```
node scripts/soi-cat-khung-vong2.mjs --tu-dong   # cổng 8906 — tự kiểm bàn đo mù ·
                                                 # quota 2 lượt · dò nhiều tờ 10 cảnh · đường lùi
node scripts/soi-nhieuto.mjs        --tu-dong    # cổng 8907 — câu sai có đập vào mắt không
node scripts/soi-xoaythe.mjs        --tu-dong    # cổng 8908 — xoay máy THẬT bằng CDP · thẻ trang 375/320
```

Cả ba **tự kiểm khung nhìn** trước khi đo chiều cao, và `soi-xoaythe` bỏ qua
phép đo nếu khung nhìn không ra đúng số đã xin — để không lặp lại lỗi 981×2123.
