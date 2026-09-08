# REV-0055 — Đọc chữ trong PDF scan · Sửa số hiệu & tên tài liệu

> **KẾT LUẬN: FAIL** — 1 lỗi **CHẶN**, 3 lỗi **CAO**.
>
> Nhánh `feature/doc-chu-pdf-scan` @ `c6fc43c` (1 commit trên `origin/main` = `f1c3d80`).
> Người soi: **HỒ LY** (Review Gate) · 03/09/2026.
>
> Phần lớn lời khai của Khỉ Đột **đúng và đo lại được**. Nhưng con số đắt nhất của
> vòng này — *"100,0% ký tự đúng"* — là **tự chấm bài của chính mình**, và khi đo
> trên PDF thật do máy khác sinh ra thì **một nửa số file có lớp chữ ra chữ tách
> rời từng ký tự, tra cứu bằng nội dung trả về 0 kết quả — trong khi ERP dán cho
> chúng nhãn tin cậy CAO NHẤT là "ĐÃ ĐỐI CHIẾU"**. Đó là lỗi chặn phát hành.

---

## ⓪ Chỗ Khỉ Đột tự sửa bàn đo — SẠCH

`git diff origin/main...HEAD -- scripts/` đụng 3 file. Soi từng chỗ:

| Chỗ sửa | Nới lỏng hay cập nhật chuỗi? |
|---|---|
| `ban-tai-tep.html:23` — ghi lại `confirm` thay vì nuốt | **Thêm quan sát**, không nới |
| `ban-tai-tep.html:305-315` — ④ đổi câu phải nói trước khi gửi | **Cập nhật chuỗi** (câu cũ "ERP CHƯA bóc được chữ trong PDF" nay SAI thật) + **thêm** chốt cấm lộ ruột kỹ thuật |
| `ban-tai-tep.html:371-378` — ⑤ **đảo ngược** chốt "128 MB/Cloudflare" | Đây là chỗ **DUY NHẤT mất đi một phép đo**: bản cũ đòi câu chặn *giải thích VÌ SAO* trần là 25 MB, bản mới chỉ cấm chữ kỹ thuật. Nhưng chính REV-0054 #3 ra lệnh gỡ, và hai chốt còn lại (nêu **cả hai con số** + nêu **ba cách xử**) vẫn nguyên. **Hợp lệ.** |
| `ban-tai-tep.html:427-437` — ⑥ chọn 2 PDF: từ "phải CHẶN" thành "phải CHẠY" | Hành vi đổi thật. Chốt mới **mạnh hơn** (đòi câu `confirm` nói rõ "2 tài liệu RIÊNG" + "không ghép làm một" + thẻ file phải hiện ra) |
| `ban-tai-tep.html:339-345`, `:453-511` — thêm `khuon === 'byte_thang'`, thêm cả mục ⑥b (26 chốt mới) | **Mạnh hơn** |
| `ban-tai-tep.mjs:51-70` — máy chủ giả học khuôn byte thẳng | **Bắt buộc**, và **giữ nguyên phép so byte-với-byte** (quy về base64 để so, base64 là song ánh với khối byte). Không nới |
| `do-kho-tai-lieu.mjs` — thêm `pdf-chu` vào 3 chỗ viết lại đường `import` | Máy móc, bắt buộc |
| `do-kho-tai-lieu.mjs:507-514` — thêm migration mới vào `MIGRATION_KHO`, **đúng thứ tự** | Bắt buộc, và có ghi chú đúng về bẫy thứ tự |
| `do-kho-tai-lieu.mjs:555-577` — nạp `lich_su_thay_doi_nen` + `them-ly-do-sua.sql`, **ném lỗi nếu thiếu TRIGGER** | **Mạnh hơn** |
| `do-kho-tai-lieu.mjs:1010-1017` — ⑧d1c dời mỏ neo của ca đối chứng BH-16 sang chỗ **gọi** `gopChuDaBoc` | Tái neo sau khi gộp hàm. **Đã chạy lại: ca đối chứng vẫn bắt được** (`ĐỐI CHỨNG: gộp trang lại → 1 trang thật BẢO LÃNH cả xấp → neo 3/3`) |
| `do-kho-tai-lieu.mjs:1956-1985` — ⑬a đổi hằng số so sánh sang `pdfChu.CAU_LOAI.chi_anh` | Cập nhật chuỗi + **thêm 2 chốt** (`chu_nguon` phải có trong INSERT, câu không lộ ruột) |
| `do-kho-tai-lieu.mjs:2074-2079` — ⑬d `%PDF-` thành "không phải PDF" | Đảo theo REV-0054 #3, **vẫn giữ** `status===400 && so.ghi===0 && Drive không đổi`. Ngang sức |
| `do-kho-tai-lieu.mjs:474-481` — thêm 44px cho `.tl-sua-o input` | **Mạnh hơn** |
| `do-kho-tai-lieu.mjs:2187-2384` — cả mục ⑭ (27 chốt mới) | **Mạnh hơn** |

**Kết luận ⓪: không có bàn đo nào bị nới để mã mới đi lọt.** Khỉ Đột khai thật
chuyện đã sửa bàn đo, và sửa đúng cách. Ghi nhận.

---

## ① Chạy lại toàn bộ bàn đo — tự mắt thấy

| Bàn đo | Khỉ Đột khai | Hồ Ly đo được | |
|---|---|---|---|
| `do-pdf-scan` | 51 / 0 | **49 / 0** | ✗ lệch — xem THẤP-3 |
| `do-kho-tai-lieu` | 298 / 0 | 298 / 0 | ✓ |
| `do-tai-tep` | ĐẠT @1440 và @375 | ĐẠT cả hai bề ngang | ✓ |
| `cong-khoi` | XANH @1440 | XANH, 0 lỗi console, 0 ngoại lệ | ✓ |
| `cong-khoi-dienthoai` | XANH @375 | XANH | ✓ |
| `do-quet-375` | ĐẠT | ĐẠT | ✓ |
| `do-ba-mau` | 12 / 12 | 12 / 12, không họ màu thứ tư | ✓ |
| `do-cat-im-lang` | SẠCH | SẠCH | ✓ |
| `do-chu-dai` | XANH | XANH | ✓ |
| `do-moc-noi` | 9 / 0 | 9 / 0 | ✓ |

Chín trên mười khớp. Không bịa.

---

# LỖI CHẶN

## CHẶN-1 · Chữ bóc từ PDF tách rời TỪNG KÝ TỰ trên một nửa số PDF có lớp chữ thật — mà ERP vẫn khai "ĐÃ ĐỐI CHIẾU · tìm được theo nội dung"

**Mức: CHẶN** · `src/pdf-chu.js:438`

```js
if (tk === 'Td' || tk === 'TD' || tk === 'T*' || tk === 'ET') { ra += '\n'; ngan.length = 0; continue; }
```

### Bệnh
`Td` **không phải lúc nào cũng là xuống dòng**. `tx ty Td` dời gốc dòng đi
`(tx, ty)`; khi `ty = 0` thì nó dời **ngang, trên CÙNG một dòng**. Chrome/Skia và
nhiều bộ sinh PDF đặt **từng con chữ một** bằng đúng khuôn đó. Dòng mã trên bỏ
qua hẳn hai toán hạng và **luôn** chèn xuống dòng ⇒ mỗi con chữ thành một dòng.

Nội dung thật trong file `Invoice-S3Y0AXD0-0001.pdf` (`Downloads`):
```
BT /F4 7.5 Tf 1 0 0 -1 543.57813 754 Tm
<0176> Tj  4.7621155 0 Td <01F8> Tj  4.2294312 0 Td <028A> Tj  …
```
`ty = 0` ở mọi chỗ. Không có một lần xuống dòng nào.

### Tái hiện
```
node scripts/ho-ly-do-pdf-that.mjs "C:/Users/Admin/Downloads" \
     "C:/Users/Admin/Desktop/AI/CamNang_HanhViToChuc.pdf"
```
(bàn đo mới, đối chiếu với `pdftotext` — bộ bóc chữ **độc lập**, có sẵn ở
`/mingw64/bin`, không phải mã của ERP)

```
FILE                                | LOẠI       | ty_le_doc | %TỪ thu hồi | %KÝ TỰ
Invoice-S3Y0AXD0-0001.pdf           | co_lop_chu | 100.0%    |  5.0%       | 74.8%
Invoice-S3Y0AXD0-0002.pdf           | co_lop_chu | 100.0%    |  5.0%       | 88.1%
Receipt-2020-9768-4075.pdf          | co_lop_chu | 100.0%    |  5.3%       | 85.1%
Receipt-2588-0119-3244.pdf          | co_lop_chu | 100.0%    |  5.3%       | 84.9%

   pdftotext : "Invoice Invoice number S3Y0AXD0-0001 Date of issue July 7, 2026 …"
   pdf-chu.js: "P a g e 1 o f 1 I n v o i c e I n v o i c e n u m b e r S 3 Y 0 …"
```

**4 trên 8** file PDF có lớp chữ thật trên máy này (50%) rơi vào bệnh này.

### Chứng minh đúng nguyên nhân
Chép `src/pdf-chu.js` ra bản vá, chỉ đổi đúng một điều — `Td` với `ty === 0`
thì **không** xuống dòng — rồi chạy lại chính hai file đó:
```
BẢN ĐANG XIN PHÁT HÀNH : "P a g e 1 o f 1 I n v o i c e I n v o i c e n u m b e r …"
BẢN VÁ  (Td ty=0)      : "Page 1 of 1 Invoice Invoice number S3Y0AXD0…0001 Date of issue July 7, 2026 …"
```

### Vì sao HẠI — chạy trọn đường từ lúc tải đến lúc tra
Tải chính file `Invoice-S3Y0AXD0-0001.pdf` qua `luuTaiLieu` thật, CSDL thật:

```
Lưu: HTTP 200 · chu_nguon=pdf_lop_chu · ocr_so_trang=1 · ocr_so_trang_neo=1
ERP nói với Sếp: "Đã lấy chữ có sẵn trong file PDF (1 trang, 515 ký tự) — không phải AI đọc ảnh."

noi_dung : "--- Trang 1 · ĐÃ ĐỐI CHIẾU · Chữ có sẵn trong file PDF — CHƯA KIỂM ---\nP\na\ng\ne\n …"
tim_kiem : "hoa don openai thang 7 s3y0axd0-0001 … p a g e o f i n v o i c e i n v o i c e n u m b e r …"

── TRA CỨU THEO NỘI DUNG ──
  gõ "invoice"    → 0 kết quả
  gõ "francisco"  → 0 kết quả
  gõ "california" → 0 kết quả
  gõ "issue"      → 0 kết quả
```

Ba tầng nói dối chồng lên nhau, tầng sau nặng hơn tầng trước:

1. **`ocr_so_trang_neo = 1`** ⇒ danh sách hiện nhãn xanh **"đã đối chiếu"**
   (`app.js:9999`). Mỏ neo trúng vì `docTinChu` bỏ hết dấu câu và khoảng trắng
   trước khi so, nên `s3y0axd00001` vẫn khớp — **chốt mỏ neo mù trước đúng cái
   bệnh này**, và trao nhãn tin cậy CAO NHẤT cho một mớ chữ vô dụng.
2. **`chu_nguon = 'pdf_lop_chu'`** ⇒ tài liệu này được đếm vào vế **"N tìm được
   theo nội dung"** của dải `#tl-dem-chu` (`app.html:2312`). Tỉ lệ Sếp Ngọc
   dùng để **quyết định có phải đi chỉnh máy scan hay không** bị thổi lên.
3. Màn quét in ra: *"Tài liệu này **TÌM ĐƯỢC theo nội dung** bên trong."*
   (`app.js:9714-9716`). Câu này **sai sự thật, kiểm được bằng một lần gõ**.

Luật nhà là *"con số AI đọc = CHƯA KIỂM, không bao giờ tự điền"*. Bản này không
vi phạm chữ của luật (không tự điền ô nào) nhưng **vi phạm tinh thần của nó theo
chiều nguy nhất**: nó **nâng** một tài liệu lên bậc tin cậy cao hơn sự thật.

### Vì sao bàn đo hiện tại KHÔNG THỂ bắt được
`scripts/do-pdf-scan.mjs:57` — PDF thử của mục ② sinh ra bằng
```js
const nd = `BT /F1 12 Tf 40 700 Td <${hex}> Tj ET`;
```
Đúng **một** `Tj`, **không** có `TJ`, **không** có `Td` giữa các con chữ. Đường
mã hỏng **không bao giờ chạy tới**. Mục ⑧ (`--pdf`) có file thật nhưng chỉ chốt
`loai ∈ {co_lop_chu, chi_anh}` và `ms < 5000` — **không đo một ký tự nào**.

### Phải làm gì
1. Sửa `src/pdf-chu.js:438`: `Td`/`TD` chỉ xuống dòng khi `ty !== 0`.
2. Thêm vào `do-pdf-scan.mjs` một PDF thử đặt **từng con chữ bằng `Td` với
   `ty = 0`** — nếu không có ca này thì lỗi sẽ quay lại.
3. Thêm chốt **cuối đường**: sau khi lưu, gõ một từ có thật trong tài liệu phải
   ra được tài liệu đó. Không có chốt này thì mọi con số bóc chữ đều là lời khai.

---

# LỖI CAO

## CAO-1 · "100,0% ký tự đúng" là tự chấm bài của chính mình

**Mức: CAO** · `scripts/do-pdf-scan.mjs:47-80` và `:466-484` · `docs/CHANGELOG.md`

`dungPDFCoChu(CAU_VN)` **dựng file PDF từ đúng chuỗi mà nó sẽ đem ra đối chiếu**,
bằng đúng khuôn `/ToUnicode` + Identity-H mà `pdf-chu.js` biết đọc. Bản đối
chiếu và bản đo cùng một tay làm. Con số `122/122 = 100,0%` chỉ nói *"bộ bóc chữ
đọc được đúng khuôn PDF mà bàn đo biết viết"* — nó **không nói gì** về file máy
khác sinh ra.

Mục ⑧ (`--pdf`, file thật) in ra `ty_le_doc_duoc=100.0%`. Đó là **"% mã tra được
bảng đổi mã"**, KHÔNG phải "% ký tự đúng" — hai đại lượng khác hẳn nhau. Lời khai
*"100,0% ký tự đúng, đủ dấu, 13 ms trên `CamNang_HanhViToChuc.pdf`"* **ghép**
con số chính xác của hàng dựng với con số thời gian của hàng thật. **Không một
bàn đo nào trong repo đo độ chính xác ký tự trên file thật.**

### Số đo thật (19 file PDF có sẵn trên máy, đối chiếu `pdftotext`)
```
TỔNG: 19 file · co_lop_chu=8 · chi_anh=11
TRUNG BÌNH trên 9 file mà pdftotext ĐỌC RA CHỮ:
  · % TỪ thu hồi được : 44,1%
  · % KÝ TỰ (LCS)     : 77,6%
```
Riêng `CamNang_HanhViToChuc.pdf` đúng là **100,0%** — nhưng đó là file **thuận
lợi nhất trên cả máy**, và là bản in ra từ một trang HTML do chính trợ lý AI
soạn, không phải bản scan. Lấy nó làm đại diện cho *"PDF tiếng Việt thật"* trong
CHANGELOG là **chọn mẫu có lợi**.

**Sửa CHANGELOG dòng 2026-09-03**: bỏ *"Đo trên PDF tiếng Việt thật: 100% ký tự
đúng"*, thay bằng dải số thật kèm điều kiện. Sếp Ngọc đọc CHANGELOG để quyết
định, không đọc mã.

---

## CAO-2 · Nhãn `NHAN_CHU_PDF` KHÔNG BAO GIỜ hiện ra cho người dùng — màn xem chữ dán cứng "AI đọc" cho chữ mà AI chưa từng chạm vào

**Mức: CAO** · `src/tai-lieu.js:603, 1286` · `public/assets/js/app.js:9754, 9899`

Máy chủ **có** trả nhãn riêng:
```js
// src/tai-lieu.js:1286
nhan_so_ai: tl.chu_nguon === NGUON_CHU.pdf_lop_chu ? NHAN_CHU_PDF : NHAN_SO_AI,
```
Nhưng:
```
$ grep -rn "nhan_so_ai" public/
(không có kết quả)
```
**Không một dòng giao diện nào đọc trường đó.** Thay vào đó màn *"Xem chữ đã
bóc"* dán cứng:
```js
// public/assets/js/app.js:9899
'<p class="tl-so-ai-nhac">⚠️ <b>AI đọc — CHƯA KIỂM.</b> Con số được bôi ' +
'là do AI đọc từ ảnh. AI có thể đọc đúng tờ giấy mà vẫn chép sai vài chữ số…'
```
và `app.js:9754` dán cứng `title="AI đọc — CHƯA KIỂM"` cho mọi con số được bôi.

**Tái hiện**: tải một PDF có lớp chữ (`chu_nguon = 'pdf_lop_chu'`) → mở tài liệu
→ bấm **"Xem chữ đã bóc"** → ERP nói *"AI đọc từ ảnh"* cho một đoạn chữ mà
**Workers AI chưa được gọi lấy một lượt** (`do-kho-tai-lieu` ⑬a đã tự chứng minh:
`KHÔNG gọi Workers AI cho PDF → gọi thêm 0 lượt`).

**Hại**: ERP nói sai về nguồn gốc dữ liệu của chính nó. Cả cơ chế "CHƯA KIỂM"
sống bằng việc người đọc TIN vào nhãn; một nhãn nói sai nguồn là một nhãn bắt
đầu bị bỏ qua. Và hằng số `NHAN_CHU_PDF` cùng cột `chu_nguon` mất một nửa lý do
tồn tại. Không xếp CHẶN vì chiều sai là **thận trọng** (vẫn ghi CHƯA KIỂM, không
nâng bậc tin cậy) — khác hẳn CHẶN-1.

---

## CAO-3 · Deploy mã mới TRƯỚC khi chạy migration → mọi lượt tải tài liệu nổ 500 và đẻ file mồ côi trên Drive; CHANGELOG khai "Breaking impact: Không"

**Mức: CAO** · `.github/workflows/deploy.yml` · `src/tai-lieu.js:922-930, 993`

`.github/workflows/deploy.yml` chạy **đúng một việc** khi đẩy lên `main`:
```yaml
uses: cloudflare/wrangler-action@v3
with:
  command: deploy
```
**Không có bước chạy migration.** `them-kho-tai-lieu-cot-chu-nguon.sql` phải do
Sếp Ngọc gõ tay (`npm run nap-cotchunguon`). Giữa lúc gộp nhánh và lúc Sếp gõ
lệnh đó, mã mới đã chạy trên CSDL chưa có cột.

**Tái hiện đo được** (CSDL có `them-kho-tai-lieu.sql` + `…-cot-ocr-neo.sql`,
**thiếu** `…-cot-chu-nguon.sql`, tải 1 file PDF hợp lệ):
```
NGOẠI LỆ KHÔNG BẮT ĐƯỢC: table tai_lieu has no column named chu_nguon
   ném ra từ src/tai-lieu.js:993 (câu INSERT)
Tải 1 PDF → HTTP 500
Câu người dùng thấy: "undefined"          ← KHÔNG có câu tiếng người nào
Số dòng trong tai_lieu: 0
```

Nặng hơn: `try/catch` ở `src/tai-lieu.js:925` **chỉ bọc lượt đẩy file lên Drive**
(dòng 920-930), còn `INSERT` nằm ở dòng 993 — **ngoài** vùng bắt. Nên trình tự
thật là: **file đã lên Drive thành công → INSERT nổ → 500**. Mỗi lần Sếp bấm
"Gửi lại" là thêm **một file mồ côi** trên Drive, không dòng nào trong CSDL trỏ
tới, không đường nào dọn.

CHANGELOG dòng 2026-09-03 khai `Breaking impact: **Không**`. **Sai** cho cửa sổ
giữa deploy và migration.

**Phải làm gì** (chọn một):
- Thêm bước chạy migration vào `deploy.yml` **trước** `command: deploy`; hoặc
- Bọc `INSERT` bằng `try/catch` trả câu tiếng người + **xoá file vừa đẩy lên
  Drive** khi ghi CSDL hỏng; hoặc tối thiểu
- Ghi vào CHANGELOG đúng sự thật: **"phải chạy `npm run nap-cotchunguon` TRƯỚC
  khi gộp lên `main`"**, và sửa ô Breaking impact.

---

# LỖI VỪA

## VỪA-1 · `ty_le_doc_duoc` đếm ký tự NUL là "đọc được" ⇒ khai 100% trong khi chữ có ký tự rác, và ký tự rác đó vào thẳng CSDL

**Mức: VỪA** · `src/pdf-chu.js:369-370`

```js
const u = phong.bf.get(ma);
dem.tong++;
if (u === undefined) { dem.hut++; } else { dem.duoc++; ra += u; }
```
Bảng `/ToUnicode` của Skia hay ánh xạ con chữ nó không tra được sang `<0000>`.
`bf.get(ma)` trả về `"\u0000"` — **không phải `undefined`** — nên nó được tính là
**đọc được**, và `\u0000` đi thẳng vào chuỗi chữ.

**Đo được**:
```
Invoice-S3Y0AXD0-0001.pdf   ty_le=100.0%  ky_tu=515  NUL=4
Receipt-2020-9768-4075.pdf  ty_le=100.0%  ky_tu=618  NUL=8
```
Chỗ mất là **dấu gạch nối**: `S3Y0AXD0-0001` bóc ra thành `S3Y0AXD0\u00000001`.
Số hiệu giấy tờ Việt Nam gần như tờ nào cũng có gạch nối (`124/2026/GCN-ATTP`).

**Chưa gây hại tới mỏ neo** — đã kiểm: `docTinChu` bỏ dấu câu trước khi so nên
vẫn khớp. Nhưng `\u0000` **có** nằm trong cột `noi_dung` và `tim_kiem` của D1,
đi vào bản sao lưu CSV, và làm `ty_le_doc_duoc` khai cao hơn sự thật.

**Sửa**: coi `u === '\u0000'` (và mọi ký tự điều khiển) là `hut`, không phải
`duoc`; đừng nối nó vào chuỗi ra.

---

# LỖI THẤP

## THẤP-1 · Khung byte thẳng cho MẢNG lọt qua chốt kiểu
`src/index.js` (`tlLuu`, chốt `if (!b || typeof b !== 'object')`) — `typeof [] === 'object'`
nên một mảng JSON lọt qua rồi mới chết ở chốt nghiệp vụ (`"Chưa chọn nhóm giấy tờ"`,
HTTP 400, 0 lượt ghi). Vô hại, nhưng chốt nên viết đúng ý: thêm `|| Array.isArray(b)`.

## THẤP-2 · Câu 502 phun nguyên văn JSON lỗi của Google cho bạn kho
`src/tai-lieu.js:928` ghép thẳng `e.message` (200 ký tự) vào câu ra người dùng;
`src/kho-file.js:75` nhét cả thân JSON của Google vào `e.message`. Bạn kho nhận:
```
Chưa gửi được lên kho: Google từ chối cấp vé (401). {
  "error": "inva… — ảnh vẫn giữ trên máy, bấm "Gửi lại" khi có sóng.
```
**CÓ TRƯỚC bản này**, không phải lỗi mới (`origin/main:src/tai-lieu.js:824` y hệt).
Nêu ra vì phạm vi quét của lời khai ⑤ chỉ gồm `src/tai-lieu.js` · `src/pdf-chu.js`
· `quet-tai-lieu.js` — không chạm `src/kho-file.js`, tức là **câu xấu nhất trên
đường đang phát hành nằm ngoài vùng đã quét**. Khai "còn 0 câu lộ ruột" hẹp hơn
thực tế.

## THẤP-3 · `do-pdf-scan` cho 49/0, không phải 51/0
`npm run do-pdf-scan` (đúng như lời khai) → **49 ĐẠT · 0 HỎNG**.
Đủ 51 chỉ khi thêm cờ: `npm run do-pdf-scan -- --pdf "<file>"` — mục ⑧ thêm 2
chốt, mà cả hai đều không đo độ chính xác (chỉ `loai` rõ ràng + dưới 5 giây).

---

# ĐÚNG NHƯ KHAI — đã tự đo lại, không phải tin lời

Không bịa lỗi cho đủ số. Những chỗ sau Khỉ Đột **nói đúng**:

**Khung byte thẳng (`API.tlLuuTep` → `tlLuu`) — CỨNG.** Tôi bắn 19 thân độc vào
thẳng `tlLuu` của `src/index.js`: độ dài khai `0xFFFFFFFF`, `0x80000000`, `0`,
`1`, lớn hơn thân thật, **nhỏ hơn** thân thật; JSON là mảng / số / `null` /
chuỗi; byte file dài 0; khung dài 0 và dài 4; `Content-Type` có tham số đuôi và
viết HOA; mô tả mang sẵn `tep_byte` giả và `tep` base64 rác để đè cửa sổ byte;
`__proto__` trong JSON.
**Kết quả: 0 lần nổ · 0 lần lọt · `Object.prototype` không bị bẩn.** Mọi khung
hỏng đều dừng ở `Dữ liệu gửi lên không hợp lệ` HTTP 400. `dai >>> 0` chặn đúng
số âm, `4 + dai > khung.length` chặn đúng khai vống, JSON cắt hụt thì `JSON.parse`
ném và bị bắt. **Đường mới ăn dữ liệu ngoài vào này an toàn.**

**Quyền — CHẶT.** `nhan_vien_kho` · `cskh` · `nguoi_dung` chỉ xem được `noi_bo`;
`quan_ly_kho` (anh Duy) **không** có `nhan_su` — đúng ranh giới CTL-0025 Mục 4;
`admin_backup` cũng không. Cả `suaTaiLieu` (`src/tai-lieu.js:1338`) lẫn
`lichSuTaiLieu` (`:1461`) đều đi qua `layVaKiemQuyen` → `duocXemNhomTaiLieu`, rồi
`suaTaiLieu` cắt lần hai bằng `duocLuuNhomTaiLieu`. Gọi thẳng API bằng phiên
`nhan_vien_kho` → **403, 0 lượt ghi** (đo lại được). Hợp đồng lao động / lương
trong hồ sơ nhân sự: nhân viên thường **không mò tới được**.

**Lượt ghi D1 — khớp từng con số** (đếm trên CSDL thật, `INSERT|UPDATE|DELETE`):

| Việc | Khỉ Đột khai | Hồ Ly đo |
|---|---|---|
| Tải 1 PDF | 1 | **1** (3 lượt đọc) |
| Tải 10 PDF | 10 | **10** (30 lượt đọc) |
| Sửa tên | 2 | **2** |
| Bấm Lưu, không đổi gì | 0 | **0** |
| Sửa cả số hiệu lẫn tên | 3 | **3** |

`tai_lieu` có 3 chỉ mục, `lich_su_thay_doi_nen` có 2 ⇒ khuếch đại ~3–4×. Tải 10
file ≈ 30–40 dòng ghi. **Xa ngưỡng 347.000/ngày**, không có lượt ghi ẩn nào.

**Migration.** Chạy lần hai ném `duplicate column name: chu_nguon` — đúng như
file `.sql` đã ghi trước ở phần chú thích. Thứ tự nạp an toàn nhờ
`scripts/kiem-tra-migration.mjs:25` sắp theo tên **đã bỏ đuôi `.sql`** (bẫy
`-` 0x2D < `.` 0x2E đã được biết và xử). Cột không đặt `DEFAULT` — dòng cũ giữ
`NULL`, và danh sách hiển thị đúng "chỉ xem được" cho chúng.

**Chữ bóc từ PDF KHÔNG tự điền vào ô nào.** Kiểm bằng mã: tiêu đề gợi ý lấy từ
**TÊN FILE** (`quet-tai-lieu.js:575`), không lấy từ nội dung. `so_hieu`, ngày,
loại giấy đều chỉ nhận từ người gõ. `docTinChu` **chỉ so**, không ghi. Luật
*"không bao giờ tự điền vào ô chính thức"* **được giữ**.

**Sửa số hiệu — nhãn "đã đối chiếu" KHÔNG SÓT chỗ nào.** Đo cả bốn chỗ:
cột `ocr_so_trang_neo` → 0; chuỗi trong `noi_dung` → đổi sang `CHƯA KIỂM`;
`tim_kiem` → chữ đã rút ra; JSON trả về → `ocr_so_trang_neo: 0`. Bộ nhớ đệm
trình duyệt: cả hai cửa (`app.js:5618` kho chung, `app.js:10092` hồ sơ nhân sự)
đều truyền `khiXong` và nạp lại danh sách sau khi lưu. **Không CHẶN ở đây.**

**Ba lỗi PDF của REV-0054 đã sửa thật.** `%PDF-` dò trong 1024 byte đầu — PDF có
BOM hết bị chặn oan, ca đối chứng chứng minh chốt CŨ trượt. `demTrangPDF` đếm
đúng 1 ở **cả 81 vị trí** quanh mốc 1 MB, chốt cũ sai 27/81. Nhiều PDF một lượt:
5 file → 5 tài liệu riêng, đúng số trang từng file, byte trùng khít bản gốc, quá
10 file thì chặn và nói con số.

**Câu `chi_anh` viết đúng và phân biệt được hai bệnh.** Đo trên giấy tờ thật:
`Certificate ALPHA GREEN 1st.pdf` (phông cũ không Unicode) và
`Phiếu yêu cầu sửa đổi_signed.pdf` (43% mã tra được) **không** bị dán câu "đây là
ảnh chụp" mà nhận đúng câu *"File này có chữ bên trong nhưng ERP đọc ra không đủ
rõ để tra cứu (0% / 43% ký tự đọc được)"*. Ngưỡng 80% làm đúng việc: **không trả
chữ rác vào ô tìm.** Đây là chỗ làm tốt, ghi nhận.

---

# NHỮNG CHỖ LỜI KHAI LỆCH VỚI SỐ ĐO THẬT

| Khỉ Đột khai | Sự thật đo được |
|---|---|
| *"100,0% ký tự đúng, đủ dấu, 13 ms"* trên PDF thật | Con số 100,0% đến từ **PDF do chính bàn đo dựng ra từ chuỗi nó đã biết**. Trên 9 file thật có chữ: **44,1% từ thu hồi · 77,6% ký tự**. Riêng file được nêu đúng là 100% — nhưng nó là file thuận lợi nhất trên máy |
| *"dấu cách suy từ số âm trong `TJ`"* đã xử xong chuyện chữ dính liền | Đúng cho `TJ`, nhưng **`Td` mới là đường chính của Chrome/Skia**, và đường đó chèn xuống dòng sau **từng con chữ** ⇒ 4/8 file thật ra `"I n v o i c e"` |
| *"danh sách hiện tỉ lệ N tìm được theo nội dung"* | Tỉ lệ đó **đếm cả những file tra ra 0 kết quả** (CHẶN-1) ⇒ số Sếp dùng để quyết định chỉnh máy scan bị thổi lên |
| *"nhãn riêng `NHAN_CHU_PDF`"* | Nhãn có trong máy chủ, **không một dòng giao diện nào đọc**. Người dùng luôn thấy *"AI đọc — CHƯA KIỂM"* (CAO-2) |
| CHANGELOG: `Breaking impact: **Không**` | Deploy tự động **không chạy migration** ⇒ cửa sổ mọi lượt tải nổ **HTTP 500 câu rỗng** + đẻ file mồ côi trên Drive (CAO-3) |
| *"còn 0 câu dính thư viện / Workers / base64 / `%PDF-` / render"* | Đúng **trong 3 file đã quét**. Nhưng câu xấu nhất trên đường này (`Google từ chối cấp vé (401). {"error":…`) nằm ở `src/kho-file.js` — ngoài vùng quét (THẤP-2, có sẵn từ trước) |
| *"`do-pdf-scan` 51/0"* | `npm run do-pdf-scan` → **49/0**. 51 cần thêm cờ `-- --pdf <file>` |
| `ty_le_doc_duoc = 100%` | Đếm cả ký tự `\u0000`. Hai file khai 100% trong khi mang 4 và 8 ký tự NUL thay cho dấu gạch nối (VỪA-1) |

---

## Chốt lại

Vòng này **xây tốt hơn khai**. Khung byte thẳng cứng, phân quyền chặt, lượt ghi
D1 đúng từng con số, mỏ neo hai chiều chạy thật, bàn đo không bị nới một dòng
nào, và ba lỗi REV-0054 sửa đúng chỗ.

Nhưng thứ đắt nhất của vòng — *đọc được chữ trong PDF* — **chưa từng được đo
trên hàng thật**, và khi đo thì **một nửa số PDF có lớp chữ trên chính máy Sếp
trả về chữ không tra cứu được, trong khi ERP dán cho chúng nhãn tin cậy cao nhất
và đếm chúng vào tỉ lệ Sếp dùng để ra quyết định**.

**FAIL.** Mở lại sau khi:
1. Sửa `src/pdf-chu.js:438` (`Td` với `ty = 0` không xuống dòng) — **CHẶN-1**
2. Thêm ca `Td ty=0` vào `do-pdf-scan.mjs`, và một chốt **cuối đường**: lưu xong,
   gõ một từ có thật trong tài liệu phải ra được tài liệu đó
3. Nối `nhan_so_ai` vào giao diện, bỏ câu "AI đọc" dán cứng — **CAO-2**
4. Chạy migration trước deploy (hoặc bọc `INSERT` + dọn file Drive), sửa ô
   Breaking impact trong CHANGELOG — **CAO-3**
5. Sửa CHANGELOG: thay "100% ký tự đúng" bằng dải số thật — **CAO-1**

Bàn đo mới dùng cho vòng soi này để lại tại `scripts/ho-ly-do-pdf-that.mjs`
(đối chiếu với `pdftotext` — có sẵn ở `/mingw64/bin`, chi phí 0, không thêm thư
viện). Chạy lại bất cứ lúc nào để kiểm bản vá.
