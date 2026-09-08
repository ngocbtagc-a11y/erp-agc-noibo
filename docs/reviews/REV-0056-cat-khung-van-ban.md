# REV-0056 — Soi "Cắt khung văn bản" (kéo 4 góc · duỗi phẳng · máy đoán góc)

- **Người soi**: HỒ LY (Review Gate) · 03/09/2026
- **Nhánh**: `feature/cat-khung-van-ban` @ `1468f33` (2 commit trên `origin/main` = `f1c3d80`)
- **Kết luận**: ❌ **FAIL** — **1 lỗi CHẶN PHÁT HÀNH**, 1 lỗi CAO, 3 VỪA, 4 THẤP.
  Phần toán và phần đo **đúng**; lỗi chặn nằm ở chỗ **mất ảnh gốc**, đúng thứ
  Sếp Ngọc hỏi thẳng: *"cắt xong không ưng thì quay lại được không"*.
- **Cách soi**: chạy lại **toàn bộ 9 bàn đo Khỉ Đột khai**, cộng **một bàn đo
  độc lập của riêng tôi** (`scripts/soi-cat-khung.mjs` + `.html`, giữ lại
  trong nhánh để Khỉ Đột chạy lại được — `node scripts/soi-cat-khung.mjs --tu-dong`).
- **Không sửa một dòng mã sản phẩm nào. Không commit, không push.**

---

## Tóm tắt cho người vội

| Câu hỏi Gạo đặt | Trả lời đo được |
|---|---|
| Khỉ Đột có **nới lỏng bàn đo** để mã lọt không? | **Không.** 3/4 chỗ sửa `do-boc-chu` là vá lỗi thật. Chỗ thứ 4 có nới đầu vào, nhưng bàn đó **không chặn phát hành** nên không lọt được gì. |
| Bảng **2/8 → 8/8** có phải tự chấm bài không? | **Không.** Tôi chạy lại độc lập, ra **đúng con số**: 2/8 → 8/8. AI **đọc thật** (Workers AI, llama-4-scout), không so chuỗi. **Nhưng** ảnh là ảnh **vẽ bằng canvas**, không phải ảnh chụp thật — xem giới hạn ở Mục 2. |
| Ca **nguyên ảnh** có bị dựng cho xấu đi không? | **Ngược lại** — nhánh "nguyên ảnh" đi đường **ít nén hơn** đường sản phẩm thật. Phép đo **thiên vị chống lại** kết luận của chính Khỉ Đột. |
| Toán duỗi phẳng có ra NaN / ảnh đen / treo máy không? | **Không.** 10 ca suy biến, chậm nhất **67 ms**, không ca nào NaN, đen, hay treo. |
| **Mất ảnh** được không? | **ĐƯỢC — và đây là lỗi CHẶN.** Xem Lỗi #1. |
| "Dùng nguyên ảnh" có thật là nguyên không? | **Thật.** Băm SHA-256 byte trước/sau: **giống hệt**. |
| Có phá đường quét đang chạy không? | **Không.** `do-quet-375`, `do-tai-tep`, `do-kho-tai-lieu` đều ĐẠT; ảnh đã cắt đi **đúng** `nenAnhChung()` + `ANH_TRANG` cũ. |
| Chi phí 0? | **Đúng.** `package.json` chỉ thêm **2 dòng script**, `devDependencies` không đổi một gói, `package-lock.json` không đụng. Mã chỉ dùng canvas + `Uint8ClampedArray`. |

---

## Mục 0 — Chỗ Khỉ Đột tự sửa bàn đo (ưu tiên số 1)

`git diff origin/main...HEAD -- scripts/` đụng đúng **một** bàn đo cũ:
`scripts/do-boc-chu.mjs`. Bốn chỗ sửa, soi từng chỗ:

| Chỗ sửa | dòng | Vá lỗi thật hay nới phép đo? |
|---|---|---|
| `dungWorker()` — `taskkill /T /F` cả cây tiến trình thay cho `wr.kill()` | `do-boc-chu.mjs:174-190` | **Vá lỗi thật.** `spawn(shell:true)` đẻ cmd.exe → npx → wrangler; `wr.kill()` chỉ hạ tầng đầu, wrangler con giữ cổng 8903 làm `do-tai-tep` báo **đỏ oan**. Đây là sửa một **báo đỏ giả**, không phải giấu một báo đỏ thật. |
| `AbortSignal.timeout(4000)` ở vòng thăm dò | `:198-201` | **Vá lỗi thật.** `wrangler dev` mở cổng trước khi Worker sẵn sàng → `fetch` chờ vô hạn. Trần này biến "treo im lặng" thành "hết giờ, đo tiếp". |
| `AbortSignal.timeout(120000)` mỗi tấm ảnh | `:223-231` | **Vá lỗi thật, và làm phép đo CHẶT HƠN**: hết giờ thì ghi `HỎNG` kèm lý do và in ra, trước đây là đứng im. |
| `process.exit(0)` cuối tệp | `:365` | **Vá lỗi thật.** Ba đường ống stdio giữ vòng lặp sự kiện sống → chạy qua đường ống không thấy một chữ. Mã thoát **không đổi** (trước đó cũng là 0; các nhánh `exit(1)/exit(2)/exit(3)` giữ nguyên). |

**→ Không có chỗ nào nới lỏng để mã mới đi lọt.** Ba trần thời gian đều làm
phép đo *nhạy hơn*, không phải dễ hơn.

### Lỗi #7 (THẤP) — chỗ duy nhất CÓ nới, và tại sao nó không nguy hiểm

`scripts/do-boc-chu.mjs:47-64`. Trước: thiếu **bất kỳ** tấm nào trong
`anh-thu-net/mo/te` là `exit(2)`. Nay: `filter(coTep)` — chỉ dừng khi **không
có tấm nào**. Hệ quả thật: ai chỉ chạy `npm run do-cat-khung` rồi chạy
`do-boc-chu` sẽ có bảng cắt khung mà **mất hẳn ca đối chứng BH-16**
(khối `if (net && te …)` ở `:305` im lặng biến mất).

**Vì sao vẫn chỉ là THẤP**: `do-boc-chu` là bàn **báo cáo**, không phải cổng
chặn — nó không nằm trong danh sách cổng bắt buộc và **không bao giờ trả mã
thoát khác 0 vì độ chính xác thấp**. Không có gì "đi lọt" qua nó được.

**Đề nghị**: in một dòng cảnh báo khi thiếu bộ ba đối chứng, thay vì bỏ qua
lặng lẽ. ~3 dòng.

---

## Mục 1 — Đo lại HẾT bàn đo Khỉ Đột khai (tự mắt thấy)

Chạy sạch trên máy tôi, không dùng lại kết quả nào của Khỉ Đột:

| Bàn đo | Khỉ Đột khai | Tôi đo | |
|---|---|---|---|
| `cong-khoi` @1440 | XANH | **XANH** | ✅ |
| `cong-khoi-dienthoai` @375 | XANH | **XANH** | ✅ |
| `do-quet-375` | ĐẠT | **ĐẠT** | ✅ |
| `do-tai-tep` | ĐẠT | **ĐẠT** (cả hai bề ngang) | ✅ |
| `do-kho-tai-lieu` | ĐẠT | **ĐẠT toàn bộ** | ✅ |
| `do-ba-mau` | ĐẠT | **ĐẠT** — không họ màu thứ tư, đỏ 14,3% (ngưỡng ≤15%) | ✅ |
| `do-cat-im-lang` | — | **ĐẠT** | ✅ |
| `do-chu-dai` | — | **XANH** | ✅ |
| `do-cat-khung` (mới) | ĐẠT | **ĐẠT**, `doan_dung=4/6 tu_tin_sai=1 cham_44=true keo_4_goc=true` | ✅ |

**Lời khai đúng ở mọi cổng.** Ảnh `.do-tam/man-cat-375.png` tôi xem trực tiếp:
nâu nền · cam cho 4 chấm góc và nút chính · không màu thứ tư · **hai nút nằm
trọn trong màn 375×812** (mép dưới 803px/812px).

### Lệch số nhỏ giữa lời khai và số đo (THẤP, không ảnh hưởng kết luận)

| Số | Khỉ Đột khai | Tôi đo |
|---|---|---|
| Nén lại sau cắt | 28 ms | **74 ms** |
| Tổng một lượt cắt | **0,08 s** | **0,12 s** (0,15 s có làm rõ chữ) |
| Cỡ file sau cắt | 171 KB | 171–175 KB |
| Dò góc, ảnh đã nén | 19 ms | 18 ms |

Chênh do máy bận/rảnh, **không đổi kết luận nào** — ngưỡng là 4 giây, đo được
0,15 s. Nhưng con số **0,08 s** là con số đẹp nhất trong nhiều lượt chạy chứ
không phải con số điển hình; báo cáo nên nêu **0,12–0,15 s**.

---

## Mục 2 — Bảng 2/8 → 8/8: đây là chỗ tôi soi kỹ nhất

### Có tự chấm bài không? — KHÔNG.

Tôi chạy `npm run do-boc-chu` độc lập sau khi tự sinh lại ảnh thử. Kết quả
**tái hiện gần như y hệt**:

| Ca XA + thiếu sáng (giấy ~21% khung) | Khỉ Đột khai | **Tôi đo** |
|---|---|---|
| Nguyên ảnh | 2/8 · 50,9% | **2/8 · 47,4%** |
| Đã cắt + duỗi phẳng | 8/8 · 71,7% | **8/8 · 71,3%** |
| + làm rõ chữ | 8/8 · 73,5% | **8/8 · 72,8%** |

**Ba bằng chứng phép đo KHÔNG khép kín:**

1. **Có gọi AI thật.** `do-boc-chu.mjs:141-170` dựng một Worker tạm, gọi
   `env.AI.run(@cf/meta/llama-4-scout-17b-16e-instruct, …)` qua `wrangler dev`.
   Mô hình **và** khuôn đầu vào lấy thẳng từ sản phẩm (`src/tai-lieu.js` →
   `MO_HINH_DOC_ANH`, `khuonDocAnh`), không phải bản chép tay.
2. **Mô hình đọc thật, không đoán.** Bản nguyên-ảnh-chụp-xa bịa ra
   `Số: 14/2020/GCN ATTP`, `quận Gia Lâm`, `phố Yên Sinh` — sai **có cấu trúc**,
   đúng dạng một mô hình đang cố đọc chữ mờ. So chuỗi thì không ra được thứ này.
3. **Nhánh "nguyên ảnh" KHÔNG bị dựng cho xấu đi** — tôi đọc mã sinh ảnh
   (`do-cat-khung.html:231-245`):
   - `cat-xa-truoc` = `nenAnhChung(cảnh, ANH_BOC_CHU)` → **một lượt nén**.
   - `cat-xa-sau` = cảnh → `ANH_TRANG` → `duoiPhang` → `canvasThanhTep(0.92)`
     → `ANH_BOC_CHU` → **ba lượt nén**.
   Trong sản phẩm thật, trang **chưa cắt** cũng đi hai lượt nén
   (`quet-tai-lieu.js:1546`), chứ không phải một. Nghĩa là bàn đo cho nhánh
   "nguyên ảnh" **chất lượng tốt hơn** sản phẩm thật, và bắt nhánh "đã cắt"
   chịu **thêm một lượt nén**. Thiên vị **chống lại** kết luận của Khỉ Đột.

### Nhưng ba giới hạn phải ghi vào báo cáo, không được im

**⚠️ Giới hạn 1 — ảnh là ảnh VẼ, không phải ảnh CHỤP.**
`scripts/lib/trang-giay-thu.js` vẽ tờ giấy bằng canvas (Times New Roman, nét
sạch), rồi thêm nhiễu hạt + bóng đổ + vân bàn gỗ. Ảnh chụp thật còn có: nhiễu
cảm biến không đều, nhoè do rung tay, nét chữ mực in không đều, phản quang.
**Con số 2/8 và 8/8 KHÔNG chuyển thẳng sang giấy tờ thật.** Cái chuyển được là
**chiều** của kết luận, và chiều đó là một lập luận về **độ phân giải**: giấy
chiếm 21% diện tích khung thì sau khi thu về 1100px, chữ chỉ còn ~46% số điểm
ảnh mỗi chiều so với bản đã cắt. Lập luận đó đúng với mọi ảnh, vẽ hay chụp.

**⚠️ Giới hạn 2 — nhánh "đã cắt" dùng 4 góc THẬT, không dùng góc máy đoán.**
`do-cat-khung.html:236` gọi `duoiPhang(imXa, cXa.goc, …)` — `cXa.goc` là đáp
án. Nghĩa là **8/8 là TRẦN**, đạt được khi người dùng kéo đúng (hoặc máy đoán
đúng). Máy đoán chỉ đúng 4/6 ca. Bảng này đo **"cắt đúng khung thì tốt lên bao
nhiêu"**, KHÔNG đo **"tính năng này tự nó tốt lên bao nhiêu"**.

**⚠️ Giới hạn 3 — Khỉ Đột báo cáo thiếu một nửa bảng của chính nó.**
Bàn đo in **hai** ca. Ca GẦN (giấy chiếm 62% khung) ra:
`Nguyên ảnh 8/8 · 78,9% | Đã cắt 8/8 · 73,4%` → **cắt khung KHÔNG thêm trường
nào, và làm tụt 5,6 điểm ký tự**. Bàn đo tự nói thẳng ra điều đó
(`do-boc-chu.mjs:340-343`), Khỉ Đột **không nêu lại khi báo cáo lên Gạo**.

**Kết luận Mục 2 (nói thẳng):** kết luận *"cắt khung đáng làm"* **được chứng
minh cho ca chụp xa/giấy nhỏ trong khung** — đúng ca Sếp mô tả (*"chụp rộng"*).
Nó **không được chứng minh, và thực ra bị bác**, cho ca chụp gần: ở đó cắt
khung chỉ được **file nhẹ 22%** và ảnh ngay ngắn, chứ không giúp AI đọc.
Kết luận *"làm rõ chữ KHÔNG đáng, mặc định TẮT"* — **tôi xác nhận đúng**
(0 trường thêm ở cả hai ca), và quyết định để mặc định TẮT là quyết định đúng.

---

## Mục 3 — Toán duỗi phẳng: kiểm bằng toán, không bằng mắt

10 tứ giác bệnh hoạn, gọi thẳng `duoiPhang()` trên ảnh 1275×1700
(`soi-cat-khung.mjs`, mục ①). **Không ca nào NaN, không ca nào ảnh đen, không
ca nào treo** (chậm nhất 67 ms):

| Ca | Kết quả | Giao diện có chặn trước không |
|---|---|---|
| 4 góc **chụm về một điểm** | ném lỗi `Khung cắt quá nhỏ` (1 ms) | không chặn, nhưng lỗi được bắt |
| 2 góc **trùng nhau** | ra ảnh 1020×1700, không đen | không chặn |
| 3 góc **thẳng hàng** | ra ảnh 1700×1360, không đen | không chặn |
| 4 góc **thẳng hàng** | ném lỗi `Bốn góc này không dựng được khung` (6 ms) | không chặn, lỗi được bắt |
| **Nơ bướm** (tự cắt) | ra ảnh trắng 100% (20 ms) | ✅ **`tuGiacLoi` CHẶN**, viền chuyển đỏ |
| **Lát mỏng** 0,1% ảnh (cả hai chiều) | ném lỗi `Khung cắt quá nhỏ` (0 ms) | không chặn, lỗi được bắt |
| **Tròn khung** (đúng mép ảnh) | ra ảnh y nguyên | ✅ `laTronKhung` → bỏ qua, **không nén lại** |
| **Lật ngược chiều** (gương) | ra ảnh **lật gương**, không lỗi | ❌ không chặn — xem Lỗi #8 |

Mọi lỗi ném ra đều rơi vào `catch` ở `quet-tai-lieu.js:531-538`, hiện đúng câu
*"Ảnh gốc vẫn nguyên — bấm 'Dùng nguyên ảnh' để đi tiếp"*, và **không đụng vào
`hs.trang[i]`**. Kéo 4 góc chụm một điểm **không mất ảnh**.

**Bộ nhớ**: một lượt duỗi + làm rõ cấp phát **2 canvas**, cái to nhất
**2,2 triệu điểm ≈ 8 MB**. Nỗi lo "48 MB mỗi bản sao" **không xảy ra**, vì
`moCatTuDong()` chạy **sau** `nenAnhChung()` — đầu vào luôn là ảnh đã nén
1700px, không bao giờ là 12MP thô. Trần Safari iOS (16,7 triệu điểm) **không
chạm tới**. Đây là chỗ Khỉ Đột làm đúng mà không khoe.

---

## LỖI #1 — CHẶN PHÁT HÀNH · Cắt xong là **mất ảnh gốc**, không có đường về

**Mức: CHẶN** · `public/assets/js/quet-tai-lieu.js:516-527` và `:449-451`

`catXong()` ghi đè `hs.trang[i].anh` bằng ảnh đã cắt. **Không chỗ nào giữ lại
ảnh trước khi cắt.** Trường `co_truoc_cat` chỉ là **một con số byte**, không
phải ảnh — và nó cũng chẳng được hiển thị ở đâu (Lỗi #9).

Tệ hơn: `moCatTay()` (`:449`) đọc `tr.anh`, tức là **bản ĐÃ CẮT**. Nút trên
thẻ trang ghi *"✂ Cắt lại"* — người dùng đọc là "cắt lại từ ảnh gốc", nhưng nó
**cắt chồng lên bản đã cắt**.

**Cách tái hiện (đo được, `soi-cat-khung.mjs` mục ③b):** chụp 1 trang → bấm
"✂ Cắt" → kéo góc trên-trái vào trong 12% → "Cắt & duỗi". Lặp lại 3 lần:

```
Cỡ trang:  219 KB → 173 KB → 138 KB → 48 KB
Kích thước: 1275×1700 → 980×1367 → 967×1197 → 558×590
Khoá của trang sau 3 lần cắt:
  anh, co_goc, co_nen, ms_nen, ms_doan, co_truoc_cat, da_cat,
  lam_ro, ms_duoi, ms_lam_ro, ms_cat        ← KHÔNG có khoá nào giữ ảnh gốc
```

Ba lần bấm nhầm là tờ hợp đồng còn **558×590 điểm ảnh** — chữ thân bài không
đọc nổi nữa, và **không có nút Hoàn tác**.

**Vì sao hại (đây là chỗ nặng nhất của lượt này):**
- Đường vào là `<input capture="environment">` (`quet-tai-lieu.js:377`). Trên
  **iPhone/Safari**, ảnh chụp kiểu này **không lưu vào Cuộn camera**. Ảnh gốc
  mất là **mất thật**, không lấy lại được từ máy.
- Lối thoát duy nhất là nút "Thay" → **chụp lại**. Nhưng nhân sự kho quét xong
  là trả giấy về kẹp/trả người mang tới. Lúc phát hiện ảnh hỏng thì tờ giấy đã
  không còn trên bàn.
- Đây **đúng câu Sếp Ngọc hỏi**. Câu trả lời hiện tại là **"không, gốc bị đè"**.
- Cộng với Lỗi #2 (máy đoán sai mà vẫn tự tin, màn cắt **tự bày**, một chạm là
  xong) thì đường từ "chụp đúng" tới "trang hỏng vĩnh viễn" chỉ dài **một cú
  chạm nhầm**.

**Cách sửa (nhỏ, không tốn localStorage):** giữ ảnh trước khi cắt trong **bộ
nhớ phiên**, không ghi vào bản nháp — bản nháp đã sát trần localStorage với 12
trang × 450 KB.
1. Trong `moQuetTaiLieu`, thêm `const anhTruocCat = new Map();`
2. `catXong()`: trước khi ghi đè, `if (!anhTruocCat.has(i)) anhTruocCat.set(i, cu.anh);`
3. `moCatTay(i)`: `taiAnh(anhTruocCat.get(i) || tr.anh)` — **cắt lại từ gốc, hết
   cắt chồng.**
4. Thẻ trang khi `da_cat`: thêm nút **"↩ Bỏ cắt"** trả `anh` về `anhTruocCat.get(i)`.

Bốn thay đổi, đều trong `quet-tai-lieu.js`, không đụng `cat-khung.js`.

---

## LỖI #2 — CAO · Máy đoán SAI mà vẫn **tự tin**, và màn cắt **tự bày** trên khung sai đó

**Mức: CAO** · `cat-khung.js:415` (`tuTin = yeuNhat >= 0.30`) ·
`quet-tai-lieu.js:437-444` (`moCatTuDong`)

Ca "hai tờ giấy trong một ảnh": máy dựng **một** khung ôm cả hai tờ, lệch
**36,4%** đường chéo — nhưng `yeuNhat = 0,65–0,66`, **gấp đôi ngưỡng tự tin**.
Vì `d.tuTin === true`, `moCatTuDong()` **tự mở màn cắt** với khung sai đó.

Màn hình lúc đó nói **nguyên văn** (tôi đọc thẳng từ DOM):

> "Bốn góc máy đặt sẵn chỉ là **gợi ý**."
> "Dò 4 góc hết 50 ms · **4 mép rõ (mép yếu nhất có biên trên 65% chiều dài)**."

Không một chữ nào báo là máy đang **đoán sai**. Câu "4 mép rõ … 65%" đọc lên
là câu **khoe**, không phải câu cảnh báo.

**Cách tái hiện**: `node scripts/soi-cat-khung.mjs --tu-dong`, mục ④ — dựng
cảnh hai tờ giấy, đo khoảng cách từ chấm máy đặt tới góc đúng.

**Vì sao hại**: người quét một xấp giấy sẽ bấm nút chính đầu tiên nhìn thấy
("✂ Cắt & duỗi"). Trang ra sẽ là **hai tờ dán vào nhau, kéo giãn**, tệ hơn hẳn
ảnh gốc — và theo Lỗi #1, **không lùi lại được**. Trước lượt sửa này họ đã có
một tấm ảnh dùng được.

**Điểm sáng đo được**: khung sai **kéo về đúng được thật** — tôi kéo và cắt
thành công, ảnh ra đúng tỉ lệ tứ giác (0,592 so với 0,591). **Nhưng phải kéo
3/4 góc** (50px · 112px · 87px), không phải *"kéo 2 góc là xong"* như Khỉ Đột
khai. Cả 4 đích đều nằm trong vùng chạm được — chỗ này Khỉ Đột nói đúng.

**Cách sửa (rẻ)**: đừng **tự bày** khi khung đoán ra chiếm quá phần lớn khung
ảnh — thêm một phép thử tỉnh táo thứ năm vào `doanBonGoc`: `tiDienTich > 0.75`
thì trả `tuTin: false` (vẫn trả góc đó, người dùng vẫn vào bằng nút "✂ Cắt").
Và đổi câu `viSao` khi không tự tin thành câu cảnh báo thay vì câu khoe.
Không sửa thì ít nhất **đừng auto-mở** khi `tiDienTich > 0.75`.

---

## LỖI #3 — VỪA · Đổi cỡ màn khi đang ở màn cắt → 4 chấm **rời khỏi 4 góc ảnh**

**Mức: VỪA** · `quet-tai-lieu.js:1069-1170` (`noiCat`) — **không có trình bắt
`resize`/`orientationchange` nào trong cả tệp.**

`noiCat()` tính cỡ canvas và đặt `style.left/top` cho 4 chấm **một lần lúc vẽ**.
Canvas có `margin: 0 auto` (`style.css`, khối `.tlq-cat-khung canvas`) nên vị
trí thật của nó phụ thuộc bề ngang khung chứa. Khung hẹp lại mà không vẽ lại
thì canvas dịch, **chấm thì không**.

**Cách tái hiện** (`soi-cat-khung.mjs` mục ③d):

```
Lệch chấm ↔ góc ảnh, trạng thái tĩnh:        0.5 / 0.5 / 0.5 / 0.5 px   ✅
Sau khi khung chứa hẹp lại 375 → 320px:     28.0 / 28.0 / 28.0 / 28.0 px  ❌
Sau khi khung chứa rộng ra 375 → 700px:      0.5 / 0.5 / 0.5 / 0.5 px   (max-width chặn)
```

**Vì sao hại**: chấm rộng 44px mà lệch 28px thì người ta chạm vào **mép** chấm
hoặc trượt hẳn; lớp phủ tối (vẽ **bên trong** canvas) vẫn đúng chỗ, nên **hai
thứ nói hai đằng**. Xảy ra khi xoay máy, khi bật chế độ chia đôi màn hình, khi
đổi mức phóng của trình duyệt. Không mất ảnh: chạm vào một chấm là `veLai()`
chạy và mọi thứ tự về đúng — nhưng khung nhảy một cái.

**Cách sửa**: một dòng trong `noiCat()` —
`window.addEventListener('resize', ve)`, gỡ trong `boKeoGoc` cùng chỗ đã gỡ
`pointermove` (`:1163-1168`). Chỗ gỡ đã có sẵn, chỉ thêm vào.

---

## LỖI #4 — VỪA · Duỗi phẳng **không trả lại đúng tỉ lệ tờ giấy**

**Mức: VỪA** · `cat-khung.js:167-175`

Cỡ ảnh ra lấy từ **độ dài cạnh của tứ giác trong ảnh chụp**
(`rongTho`/`caoTho`), không giải tỉ lệ thật từ ma trận phối cảnh. Ảnh chụp
nghiêng thì cạnh xa đã bị phối cảnh làm ngắn, nên trang ra **bị bóp**.

**Đo được** (`soi-cat-khung.mjs` mục ④b): tờ giấy 1500×2000 (tỉ lệ 0,750),
chụp nghiêng ~7°, duỗi ra **1016×1126 = 0,902 — lệch 20%**.

*(Nói cho công bằng: cảnh thử kéo tờ giấy vào tứ giác bằng phép affine từng
dải, nên con số 20% là minh hoạ chứ không phải hằng số. Điều **chắc chắn** là
mã KHÔNG có bước khôi phục tỉ lệ, đọc thẳng từ `:167-175`.)*

**Vì sao hại**: màn hình hứa *"duỗi phẳng thành hình chữ nhật **ngay ngắn**"*.
Ngay ngắn thì đúng (thước đo độ nghiêng ra 0,00°), nhưng **sai tỉ lệ** — một
bản chụp hợp đồng bị bóp 20% nhìn ra là bị chỉnh sửa. Với giấy tờ pháp lý,
"trông đã bị sửa" là một vấn đề thật, không phải chuyện thẩm mỹ.

**Cách sửa (chọn một)**: (a) nói thật trong câu hướng dẫn — bỏ chữ "ngay ngắn",
ghi "cắt gọn và làm thẳng"; hoặc (b) thêm một nút chọn **A4 (1:√2)** ép tỉ lệ
ảnh ra. (a) tốn 1 dòng; (b) tốn ~10 dòng. **Không chặn phát hành**, nhưng phải
chọn một — hứa "ngay ngắn" rồi trả về ảnh bóp là hứa sai.

---

## LỖI #5 — VỪA · Ca *"giấy trắng nền trắng"* lùi về mép ảnh, nhưng **màn cắt không bày**

**Mức: VỪA** · `quet-tai-lieu.js:441`

`if (!d.tuTin || laTronKhung(d.goc, 0.04)) return;` — không tự tin thì
`doanBonGoc` trả **đúng 4 góc mép ảnh**, nên `laTronKhung` cũng đúng luôn, và
màn cắt **không bày**. Ca này đo được: lệch 13,2%, `KHÔNG tự tin → mép ảnh`.

Đây là **ca chính Sếp mô tả**: giấy trắng đặt trên bàn trắng, chụp rộng — đúng
lúc người ta cần kéo khung nhất thì máy **im lặng không mời**. Đường vào vẫn
còn (nút "✂ Cắt" trên thẻ trang, tôi kiểm: có), nên **không mất chức năng** —
nhưng người dùng phải **tự biết** mà đi tìm.

**Vì sao chỉ VỪA, không CAO**: luật ③ của chính Khỉ Đột ("không bày khi không
có gì để cắt") là luật **đúng** và tôi ủng hộ; bày thừa mỗi trang một lần là
thứ giết tính năng trong tuần đầu. Đây là cái giá phải trả, không phải lỗi ẩu.

**Đề nghị**: khi `!d.tuTin` (khác với `laTronKhung` vì ảnh thật kín giấy), thêm
**một dòng chữ nhỏ** trên thẻ trang: *"Máy không nhận ra mép giấy — bấm ✂ Cắt
nếu muốn chỉnh khung"*. Không bày màn, chỉ chỉ đường. ~4 dòng.

---

## LỖI #6 — THẤP · Khỉ Đột báo cáo **thiếu** ca GẦN của chính bàn đo mình

Xem Mục 2, Giới hạn 3. Bàn đo in ra *"CẮT KHUNG: KHÔNG đổi số trường đúng
(ký tự **−5,6** điểm)"* cho ca giấy chiếm 62% khung. Lời khai lên Gạo chỉ có ca
XA. Bàn đo trung thực; **bản tóm tắt thì không đủ**.

## LỖI #7 — THẤP · `do-boc-chu` nới đầu vào, mất ca đối chứng lặng lẽ
Xem Mục 0.

## LỖI #8 — THẤP · Tứ giác **lật gương** lọt `tuGiacLoi`, ra ảnh lật ngược

`cat-khung.js:119-127`. `tuGiacLoi` chỉ kiểm **dấu tích có chéo đồng nhất**, không
kiểm **chiều**. Bộ góc `[[1,0],[0,0],[0,1],[1,1]]` (đảo trái-phải cả 4 góc) là
"lồi" theo phép thử này → `catXong` cho đi → ra **ảnh lật gương, im lặng**.
Cần 4 thao tác kéo cố ý, gần như không xảy ra vô tình. Sửa: đổi
`return am === 0 || duong === 0` thành `return duong === 4` (chỉ nhận chiều
kim đồng hồ). **1 dòng.**

## LỖI #9 — THẤP · `co_truoc_cat` là trường chết

`quet-tai-lieu.js:521` ghi `co_truoc_cat` mỗi lần cắt. `grep -rn` toàn
`public/` + `src/`: **không nơi nào đọc nó** — không hiện trên thẻ trang, không
gửi lên máy chủ, không vào bản sao lưu. Nó chỉ làm bản nháp localStorage nặng
thêm, đúng chỗ đang sát trần. Hiến pháp Rule 5. Sửa: hoặc hiện nó ra
(*"219 KB → 173 KB sau cắt"* là con số người dùng thích thấy), hoặc xoá.

---

## Chỗ Khỉ Đột làm ĐÚNG — nói thẳng, không bịa lỗi cho đủ số

1. **"Dùng nguyên ảnh" nguyên thật.** Tôi băm **SHA-256** byte ảnh trang trước
   và sau khi bấm: `b0cb29ea4af36dbc…` / `b0cb29ea4af36dbc…` — **giống hệt**.
   `catBoQua()` (`:461-465`) chỉ đặt `cat = null`, không đụng `hs.trang`.
   Nút đó **luôn có mặt**, kể cả ở màn cắt mở bằng tay; chỉ `disabled` trong
   lúc đang xử (và vẫn còn nút ✕ đóng bộ quét làm lối thoát).
2. **Đi đúng đường cũ.** Ảnh đã cắt quay về **đúng** `canvasThanhTep(0.92)` →
   `nenAnhChung(ANH_TRANG)` → cùng `gopTrangThanhPDF` → cùng `anh_boc_chu`.
   Không đi tắt một bước nào. Ba cổng đường quét cũ vẫn ĐẠT.
3. **Không treo, không NaN, không mất ảnh khi toán hỏng.** 10 ca suy biến,
   mọi lỗi đều bắt được và **giữ nguyên ảnh gốc**.
4. **Bộ nhớ đúng chỗ**: cắt chạy **sau** khi nén, nên đỉnh 8 MB chứ không 48 MB.
5. **44px là 44px thật** — tôi đo lại `getBoundingClientRect`, cả 4 chấm
   44×44px, kéo được từ **sát mép ảnh** (lệch đích 0,5px), và có **ca đối
   chứng** ép xuống 40px để chứng minh phép đo bắt được.
6. **Nhiều trang vẫn chạy**: tôi thử 3 trang liên tiếp, màn cắt **tự bày cho
   cả 3** — không có rò biến `cat` như tôi nghi lúc đầu.
7. **Ba màu sạch**, `do-ba-mau` ĐẠT, đỏ chỉ dùng cho viền khung lõm — đúng vai.
8. **Chi phí 0 thật**: 0 gói mới, 0 lượt gọi mạng trong `cat-khung.js`.
9. **Ba chỗ vá `do-boc-chu` là vá thật**, và hai trần thời gian làm bàn đo
   **nhạy hơn** chứ không dễ hơn.

---

## Việc phải làm trước khi phát hành

| # | Mức | Việc | Ước lượng |
|---|---|---|---|
| 1 | **CHẶN** | Giữ ảnh trước khi cắt trong bộ nhớ phiên · `moCatTay` cắt từ gốc · thêm nút "↩ Bỏ cắt" | ~20 dòng, 1 tệp |
| 2 | CAO | `tiDienTich > 0.75` → `tuTin: false` (đừng tự bày khung ôm cả ảnh) · đổi câu `viSao` khi không tự tin | ~6 dòng |
| 3 | VỪA | `window.addEventListener('resize', ve)` + gỡ trong `boKeoGoc` | 2 dòng |
| 4 | VỪA | Bỏ chữ "ngay ngắn" **hoặc** thêm nút ép tỉ lệ A4 | 1–10 dòng |
| 5 | VỪA | Ca không tự tin: một dòng chỉ đường trên thẻ trang | ~4 dòng |
| 6 | THẤP | Báo cáo nêu **cả hai** ca (gần + xa), và nêu 0,12–0,15 s thay vì 0,08 s | — |
| 7 | THẤP | `do-boc-chu`: cảnh báo khi thiếu bộ ba đối chứng | ~3 dòng |
| 8 | THẤP | `tuGiacLoi`: `return duong === 4` | 1 dòng |
| 9 | THẤP | `co_truoc_cat`: hiện ra hoặc xoá | 1–3 dòng |

**Sửa xong #1 thì lượt này PASS.** Phần toán, phần đo, phần đi-đúng-đường-cũ
đều chắc; chỗ hỏng là chỗ **người dùng bấm nhầm rồi không lùi được** — mà đó
lại đúng câu Sếp Ngọc hỏi ngay từ đầu.

---

## Phụ lục — bàn đo của tôi

`scripts/soi-cat-khung.mjs` + `scripts/soi-cat-khung.html`, cổng 8905, chạy
trên **đúng mã sản phẩm** trong `public/`. Sáu mục: tứ giác suy biến · cửa
chặn giao diện · mất ảnh & băm byte & cắt chồng & đổi cỡ màn · ca hai tờ ·
tỉ lệ khi chụp nghiêng · bộ nhớ.

```
node scripts/soi-cat-khung.mjs --tu-dong
```

Giữ lại trong nhánh để Khỉ Đột chạy lại sau khi sửa — ba dòng `✗ HỎNG` phải
về 0. **Không** thêm vào `package.json` (tôi không sửa mã sản phẩm).

⚠️ Một bài học cho chính bàn đo của tôi, ghi lại để không ai lặp: lượt chạy
đầu tôi báo **31,1px lệch chấm góc** ở **cả trước lẫn sau** khi đổi cỡ màn —
sai, vì tôi giữ tham chiếu DOM **từ trước** một lượt `ve()` (dựng lại toàn bộ
`innerHTML`), rồi đo trên **nút đã rụng**: `getBoundingClientRect()` trả về
toàn số 0, và `hypot(22,22) = 31,1`. Số đo trông rất thuyết phục mà hoàn toàn
vô nghĩa. Đã hỏi lại DOM sau mỗi lần vẽ; con số thật là **0,5px tĩnh · 28px
sau khi màn hẹp lại**.
