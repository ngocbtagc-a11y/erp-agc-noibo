# REV-0055 vòng 2 — Đọc chữ trong PDF scan · bản vá bốn lỗi

> **KẾT LUẬN: FAIL** — 0 lỗi CHẶN, **2 lỗi CAO**. Sát cửa, nhưng chưa qua.
>
> Nhánh `feature/doc-chu-pdf-scan` @ `3fbfff3` (trên `c6fc43c`).
> Người soi: **HỒ LY** (Review Gate) · 03/09/2026.
>
> **Bốn lỗi vòng 1 đã đóng THẬT** — tôi tái hiện lại đúng cách đã bắt được
> chúng, không ca nào tái hiện được nữa. Bản vá làm đúng chỗ, không vá quá tay,
> không làm hỏng file nào. Nói thẳng: đây là bản vá tốt.
>
> Hai lỗi CAO còn lại đều là **cùng một bệnh cũ nhưng ở đường khác**: ERP vẫn
> nói về khả năng tra cứu của mình không đúng sự thật — một chỗ **thổi lên**
> (dải đếm), một chỗ **hạ oan** (bảng chấm công, tờ khai). Cả hai đều đo được,
> và cả hai đều là bản vá nhỏ.

---

## ⓪ Bàn đo của Hồ Ly có bị đụng không — KHÔNG

Đây là điều kiện tiên quyết: `scripts/ho-ly-do-pdf-that.mjs` là trọng tài duy
nhất của vòng này.

```
$ git log --oneline --all -- scripts/ho-ly-do-pdf-that.mjs
3fbfff3 Vá REV-0055: chữ PDF vỡ vụn, nhãn nguồn chữ, file mồ côi, số đo thật

$ diff -u <bản Hồ Ly viết ra vòng 1> scripts/ho-ly-do-pdf-that.mjs
(không một dòng khác biệt)
```

File **trùng khít từng byte** với bản tôi viết. Khỉ Đột chỉ **commit** nó (vòng 1
nó nằm ngoài git, `?? untracked`), không sửa một ký tự. Lời khai *"diff rỗng"*
**đúng**. Ghi nhận: đây là chỗ dễ ăn gian nhất và nó không đụng vào.

---

## ① Bốn lỗi vòng 1 — tái hiện lại từng cái

### CHẶN-1 (chữ vỡ vụn) — ĐÓNG

Chạy **chính bàn đo của tôi**, 19 file PDF thật, đối chiếu `pdftotext`:

| | vòng 1 | vòng 2 |
|---|---|---|
| % TỪ thu hồi (TB 9 file) | 44,1% | **85,8%** |
| Invoice-0001 / 0002 | 5,0% | **96,0%** |
| Receipt-2020 / 2588 | 5,3% | **94,7%** |
| Gmail-Apple | 85,1% | **99,4%** |

Khớp **từng con số** với lời khai. Chữ ra khỏi máy nay là
`"Page 1 of 1 Invoice Invoice number S3Y0AXD00001 Date of issue July 7, 2026…"`.

### CAO-1 (tự chấm bài) — ĐÓNG
`do-pdf-scan` mục ⑧ nay gọi `pdftotext` đối chiếu trên file thật, chốt thu hồi
≥80% + chốt chữ không vỡ vụn, và **nói ra** khi không có `pdftotext` thay vì im
lặng cho qua. CHANGELOG đã thay "100% ký tự đúng" bằng dải số thật kèm cả 3 file
0%. Ca đối chứng chống vá quá tay có thật (`do-pdf-scan.mjs:66, 286` —
`tdXuong`: `Td` với `ty ≠ 0` **vẫn phải** xuống dòng).

### CAO-2 (nhãn không ra tới mắt người dùng) — ĐÓNG
```
app.js đọc `nhan_so_ai` máy chủ trả về?  CÓ
Số chỗ còn dán cứng "AI đọc — CHƯA KIỂM": 4
   · app.js:9722  → nhánh `else` = chữ AI đọc từ ảnh — NÓI ĐÚNG, không phải lỗi
   · app.js:9740, 9749 → chú thích, không ra màn hình
   · app.js:9758  → `NHAN_MAY_DOC_LUI`, đúng MỘT hằng số đường lui đã khai
```
Nhánh `pdf_lop_chu` nay nói *"Máy scan đã nhận dạng chữ sẵn trong file này"*,
không còn nói "AI đọc". Khai *"0 chỗ dán cứng"* là đúng trong phạm vi nó đo
(đường nhãn của `veChuCoSo`).

### CAO-3 (file mồ côi + câu "undefined") — ĐÓNG
Tái hiện y hệt vòng 1 (CSDL **thiếu** cột `chu_nguon`, tải 1 PDF hợp lệ):
```
vòng 1: NGOẠI LỆ KHÔNG BẮT ĐƯỢC → HTTP 500 · câu người dùng = "undefined"
        · file đã lên Drive, 0 dòng CSDL, KHÔNG dọn

vòng 2: HTTP 500
        Câu người dùng: "Chưa lưu được tài liệu vào kho — máy chủ đang trục trặc
        ở bước ghi dữ liệu. File trên máy bạn vẫn còn nguyên: chọn lại rồi gửi
        lần nữa…"
        Lộ ruột kỹ thuật? không
        File đẩy lên Drive: 1 · đã DỌN: 1  → KHÔNG còn file mồ côi
```
Hai ca đối chứng tôi tự dựng, cả hai đều sạch:
- **Ghi CSDL THÀNH CÔNG** → đẩy 1, xoá **0** → không mất file thật.
- **Gửi trùng `ma_gui`** (bấm "Gửi lại") → đẩy 0, xoá 0, 1 dòng CSDL — có chốt
  đọc trước nên không đẻ bản thừa ngay từ đầu.

**Đường xoá có bị đầu độc được không: KHÔNG.** `xoaFile(env, {nha: luuXong.nha,
khoa: luuXong.khoa})` — `luuXong` là kết quả lượt đẩy của **chính yêu cầu này**,
không lấy một mẩu nào từ thân gửi lên. Không có đường cho người ngoài trỏ vào
file của người khác. Dọn hụt thì `console.error` có kèm `kho_khoa` để dọn tay
(đã thấy chạy thật trong ca đo).

CHANGELOG đã đổi Breaking impact **"Không" → "CÓ — PHẢI CHẠY MIGRATION TRƯỚC KHI
GỘP"**. `deploy.yml` không đụng — chấp nhận được, vì nay hỏng cũng không mất dữ
liệu và câu báo đọc hiểu được.

### Ba lỗi VỪA/THẤP vòng 1 — ĐÓNG
- **VỪA-1** ký tự điều khiển: `boKyTuDieuKhien()` (`pdf-chu.js:361`) có chặn cả
  `undefined`/`null` nên không đẻ chuỗi `"undefined"` vào chữ. Invoice
  `ty_le_doc_duoc` **100,0% → 99,3%** — thước nay nói thật.
- **THẤP-1** `Array.isArray(b)` đã vào chốt khung byte (`index.js:6425`).
- **THẤP-2** câu 502 hết ghép `e.message`; chi tiết đi vào `console.error`.
- **THẤP-3** nó thừa nhận 51/0 là sai, 49/0 mới đúng.

---

## ② Chạy lại hết bàn đo — khớp lời khai

| Bàn đo | Khai | Hồ Ly đo | |
|---|---|---|---|
| `do-pdf-scan` | 59/0 (63 với `--pdf`) | **59/0 · 63/0** | ✓ |
| `do-kho-tai-lieu` | 326/0 | **326** | ✓ |
| `do-tai-tep` | ĐẠT @1440 & @375 | ĐẠT cả hai | ✓ |
| `cong-khoi` / `cong-khoi-dienthoai` | XANH | XANH · XANH | ✓ |
| `do-quet-375` | ĐẠT | ĐẠT | ✓ |
| `do-ba-mau` | 12/12 | 12/12 | ✓ |
| `do-cat-im-lang` | SẠCH | SẠCH | ✓ |
| `do-chu-dai` | XANH | XANH | ✓ |
| `do-moc-noi` | 9/0 | 9/0 | ✓ |

**Mười trên mười khớp.** Vòng 1 lệch một, vòng này không lệch cái nào.

---

## ③ Gộp với `main` mới — SẠCH

`origin/main` đã đi tới `1be5c81`. Gộp khô: **không xung đột**.

Tôi soi riêng cái bẫy được chỉ đích danh — bàn đo còn trỏ vào `migrations/lui-*.sql`
cũ không. Có 5 chỗ trong `scripts/do-quyen-duyet-gopy.mjs`, **nhưng chính
`origin/main` đã sửa file đó** (`git diff HEAD origin/main -- scripts/do-quyen-duyet-gopy.mjs`
= 4 dòng thêm / 4 dòng bớt). Sau khi gộp, đường dẫn đúng. Các chỗ còn lại
(`ban-thu-d1.mjs`, `tu-kiem-thongbao-tinnhan.mjs`, `docs/`) chỉ nhắc trong chú
thích/tài liệu, không mở file. **Không có gì gãy.** Lời khai đúng.

---

# LỖI CAO

## CAO-A · Dải đếm "N tài liệu tìm được theo nội dung" THỔI LÊN — đo được 5 khi sự thật là 3

**Mức: CAO** · `src/tai-lieu.js:1230-1232`

```sql
SELECT SUM(CASE WHEN ocr_so_trang > 0 THEN 1 ELSE 0 END) AS tra,
       SUM(CASE WHEN ocr_so_trang > 0 THEN 0 ELSE 1 END) AS xem
```

Đếm bằng `ocr_so_trang` — *"có bóc ra được chữ không"*. Nhưng dòng chữ hiện trên
màn hình (`app.js:10103`) hứa một điều KHÁC:

> **N** tài liệu **tìm được theo nội dung bên trong**

Hai thứ đó không bằng nhau. Chữ có `ocr_so_trang_neo = 0` (mỏ neo chưa đối
chiếu được) bị **giữ lại khỏi ô tìm kiếm** — đúng luật ③, cố ý, đúng đắn. Nhưng
nó **vẫn được đếm vào vế "tìm được theo nội dung"**.

### Tái hiện (CSDL thật, 5 file PDF thật)
```
ERP khoe: 5 tìm được theo nội dung · 0 chỉ xem được

  Chung tu thang bay   ocr_trang=1 neo=1 → chữ trong ô tìm? CÓ
  Chung tu thang tam   ocr_trang=1 neo=1 → chữ trong ô tìm? CÓ
  Giay to so mot       ocr_trang=7 neo=1 → chữ trong ô tìm? CÓ
  Giay to so hai       ocr_trang=6 neo=0 → chữ trong ô tìm? KHÔNG
  Giay to so ba        ocr_trang=1 neo=0 → chữ trong ô tìm? KHÔNG

SỰ THẬT: 3/5   →   ERP khoe 5, thật 3 · THỔI LÊN 2 tài liệu (40%)
```
Kiểm chéo bằng ô tìm thật: gõ `"maslow"` — từ CÓ THẬT trong `Giay to so hai`
(pdftotext xác nhận) — trả về **0 kết quả**, đúng như cột `tim_kiem` dự báo.

### Vì sao HẠI
Đây **chính xác là cùng một bệnh** đã làm vòng 1 FAIL, chỉ đổi đường: ERP tuyên
bố khả năng tra cứu cao hơn sự thật. Và con số này không phải trang trí — chú
thích ngay trên câu SQL viết rõ nó sinh ra để *"Sếp Ngọc biết có phải đi chỉnh
máy scan hay không"*. Một kho mà 40% con số là ảo thì quyết định dựa trên nó là
quyết định mù. Tệ hơn: bệnh này **tự nặng thêm** — tài liệu càng nhiều chữ chưa
đối chiếu, số càng thổi.

### Lời khai lệch
CHANGELOG và lời khai nói dải đếm dựa trên cột mới `chu_nguon`. Câu SQL thật
dùng `ocr_so_trang`. Cột `chu_nguon` **không xuất hiện** trong phép đếm.

### Phải làm gì
Đếm bằng đúng thứ ô tìm dùng: `ocr_so_trang_neo > 0`. Ba vế thì thật hơn nữa —
*tìm được theo nội dung* · *có chữ nhưng CHƯA KIỂM* · *chỉ xem được*.

---

## CAO-B · `laChuVun()` kết tội oan bảng chấm công và tờ khai — mất khả năng tra cứu đúng loại giấy hay phải tra nhất

**Mức: CAO** · `src/pdf-chu.js:535-547`, dùng ở `src/tai-lieu.js:537`

Ngưỡng do Khỉ Đột tự đặt: **≥50% mẩu chỉ một ký tự** và **≥20 mẩu**. Chú thích
ngay trên đó khẳng định:

> *"50% thì văn bản thật không bao giờ chạm tới"*

**Khẳng định này sai, và đo được là sai.**

### Tái hiện — gọi thẳng `docTinChu` (đường chữ AI đọc từ ảnh chụp)
```
✗✗  Bảng chấm công kho (AI đọc từ ảnh)          muc=chua_kiem
✗✗  Tờ khai ô vuông từng chữ số (AI đọc từ ảnh) muc=chua_kiem
ok  ĐỐI CHỨNG · văn bản thường                  muc=da_neo
```
Cả hai đều **trúng mỏ neo mạnh** (số hiệu `124/2026/BCC` có trong chữ), nhưng bị
`laChuVun` hạ xuống `chua_kiem` ⇒ **chữ rút khỏi ô tìm kiếm**.

Tỉ lệ mẩu một ký tự đo được:
- Bảng chấm công kho (ký hiệu X/P/K từng ô): **47/60 = 78%**
- Tờ khai thuế, MST + CCCD in ô vuông từng chữ số: **30/42 = 71%**
- Bảng quy cách đóng gói (cỡ S/M/L): **21/32 = 66%**

### Vì sao đây là giấy tờ THẬT của công ty
Bảng chấm công là tờ anh Phạm Khương Duy ký hằng tháng cho 12 fulltime + 17
parttime — đúng mảng Sếp Ngọc phụ trách. Tờ khai thuế/hải quan của Việt Nam in
mã số thuế và CCCD trong **ô vuông từng chữ số**; đó là khuôn mẫu chuẩn, không
phải ca hiếm. Chụp bằng điện thoại rồi để AI đọc là **đường chính** của ERP này.
Kết quả: đúng những tờ hay phải tra nhất lại là những tờ mất khả năng tra.

Chiều sai ở đây là **thận trọng** (hạ nhãn, không thổi nhãn) nên không xếp CHẶN
— nhưng nó là **suy giảm chức năng do chính bản vá này đẻ ra**, và lý do biện
minh cho ngưỡng thì đo được là sai.

### Phải làm gì
Đòi các mẩu một ký tự phải **liền dải** (`"I n v o i c e"` = 7 mẩu liên tiếp)
thay vì đếm rải rác toàn văn bản; hoặc bỏ chữ số và ký hiệu bảng ra khỏi phép
đếm; hoặc nâng ngưỡng lên ~80%. Ca nào cũng phải có ĐỐI CHỨNG bằng bảng chấm
công thật, nếu không lần sau lại kết tội oan.

---

# LỖI VỪA

## VỪA-A · Tầng 2 gần như không với tới được nữa — "hai tầng phòng thủ" thực chất là một

**Mức: VỪA** · `src/pdf-chu.js:541`

Sau khi tầng 1 sửa `Td`, chữ hỏng **không còn ra dạng RỜI RẠC** mà ra dạng
**DÍNH LIỀN** — mà `laChuVun` chỉ nhìn thấy dạng rời rạc. Tôi dựng PDF thật để
kiểm:

| Ca dựng bằng tay | chữ ERP bóc ra | `laChuVun` |
|---|---|---|
| `TJ` kern −100 (dưới ngưỡng 120) | `"HOADONGIATRIGIATANGSo124/2026/GCN-ATTP…"` | **false** |
| Từng con chữ bằng `Td` ty=0, một khối `BT…ET` | `"HOADONGIATRIGIATANGSo124…AlphaGreen"` | **false** |
| Bảng chấm công dựng đúng khuôn Chrome/Skia | `"Nguyen Van AnXXXPXXKXXXXX…"` | **false** |

Ba ca chữ hỏng, **không ca nào** tầng 2 bắt được.

**Giảm nhẹ — và đây là chỗ may hơn khôn:** ô tìm dùng `tim_kiem LIKE '%từ%'`, tức
**so chuỗi con**, nên chữ dính liền vẫn tra được. Tôi kiểm: gõ `"alpha"` trên ca
`TJ` kern −100 → **trúng**. Nên chữ dính liền không gây hại như chữ rời rạc.

Nhưng phải nói thẳng: lời khai *"chặn ở hai chỗ"* mô tả một hàng rào mà tầng 2
đang canh đúng cái bệnh tầng 1 đã chữa khỏi, và **mù** với dạng bệnh còn lại.
Cộng với CAO-B ở trên, tầng 2 hiện gây hại (kết tội oan) nhiều hơn là chặn được.

---

# LỜI KHAI LỆCH SỐ ĐO

| Khai | Số đo thật |
|---|---|
| *"% ký tự đứng yên (77,6% → 77,4%) vì **LCS phạt cả phần ERP đọc RA THÊM** so với pdftotext (header `Hotline:19008095`)"* | **Giải thích sai.** Phép đo là `LCS(đối_chiếu, ta) / len(đối_chiếu)` — chữ ta đọc ra THỪA **không thể** làm tụt tỉ lệ. Lý do thật, đo được: (a) bản vá **chỉ dời khoảng trắng, không đổi một ký tự nào** — bỏ khoảng trắng ra rồi so thì **trước và sau giống hệt nhau ở CẢ 9 file** (74,0→74,0 · 87,9→87,9 · 84,8→84,8 · 100,0→100,0…); (b) số trung bình bị `Certificate ALPHA GREEN 1st.pdf` kéo xuống — file mà **chính `pdftotext` cũng chỉ đọc ra rác**, nên "bản đối chiếu" ở đó vô nghĩa. Bỏ nó ra: **86,8% ký tự · 96,6% từ**. Con số nó báo đúng; lời giải thích thì không |
| *"danh sách hiện tỉ lệ … cột mới `chu_nguon`"* | Câu SQL đếm bằng `ocr_so_trang`, `chu_nguon` không có mặt (CAO-A) |
| *"Ngưỡng 50% thì văn bản thật không bao giờ chạm tới"* (chú thích `pdf-chu.js:531`) | Ba loại giấy tờ thật vượt ngưỡng: 78% · 71% · 66% (CAO-B) |
| *"chặn ở hai chỗ"* (hai tầng phòng thủ) | Tầng 2 không bắt được cả ba dạng chữ hỏng còn lại sau khi tầng 1 vá (VỪA-A) |
| *"`git diff scripts/ho-ly-do-pdf-that.mjs` rỗng"* | **ĐÚNG** — trùng khít từng byte |
| *"do-pdf-scan 59/0, 63 với `--pdf`; do-kho-tai-lieu 326/0"* | **ĐÚNG cả ba** |
| *"85,8% từ · 77,4% ký tự · Invoice 96,0% · Receipt 94,7% · Gmail 99,4%"* | **ĐÚNG từng con số** (đo bằng chính bàn đo của tôi) |
| *"3 file vẫn 0%"* | **ĐÚNG**, và tự nêu ra trước khi bị hỏi — trong đó `Certificate` là ca `pdftotext` cũng chịu thua |
| *"gộp `main` mới không xung đột"* | **ĐÚNG**, kể cả cái bẫy `migrations/lui/` |

---

# NHỮNG CHỖ LÀM ĐÚNG — nói thẳng

Không bịa lỗi cho đủ số. Vòng này Khỉ Đột làm tốt:

- **Không đụng bàn đo của người soi**, dù nó nằm trong tay và không ai kiểm được
  ngay. Đây là chỗ dễ ăn gian nhất.
- **Tự khai đúng ba chỗ bất lợi cho mình**: 3 file vẫn 0%; con số 51/0 vòng 1 là
  sai; còn 2 câu lộ ruột kỹ thuật ở `index.js`/`app.js` (đổi mật khẩu, quẹt QR)
  thuộc tính năng khác mà nó **không** sửa — đúng, không nên sửa chung một
  commit.
- **Tự nêu cái bẫy trong phép đo của chính nó** (`chuoiTimKiem` nhét tên nhóm
  vào ô tìm nên gõ "thuc pham" trúng vì lý do khác). Tôi kiểm lại: bẫy đó **có
  thật** (gõ `"ke"`/`"toan"`/`"thue"` ra 5/5 tài liệu do trúng tên nhóm). Tôi đo
  đường cuối bằng từ khoá **chỉ có trong ruột file** — `california`, `francisco`,
  `opco`, `hotline`, `street`, `issue`, `paid` — **14/15 lượt tra đúng**, và lượt
  còn lại (`maslow` không ra) là **luật mỏ neo chạy đúng**, không phải lỗi.
- **Không vá quá tay.** Đo số dòng trước/sau trên 9 file: không file nào bị gộp
  dòng xuống dưới 1/3 số dòng của `pdftotext`; các file được chữa đi từ 515 dòng
  (mỗi con chữ một dòng) về 49 dòng, so với 26 của `pdftotext` — **nhiều hơn,
  không ít hơn**, tức không mất xuống dòng thật. `So_do_to_chuc` giữ nguyên
  14/14. Ca đối chứng `tdXuong` có mắt thật.
- **Không file nào TỆ ĐI** sau bản vá. Đo bằng % ký tự đã bỏ khoảng trắng: 9/9
  file giống hệt trước — bản vá không làm hỏng một ký tự nào ở đâu cả.
- **Đường xoá file mồ côi viết cẩn thận**: `kho_khoa` lấy từ kết quả đẩy của
  chính yêu cầu đó, không đầu độc được; chỉ chạy khi ghi CSDL hỏng; ghi thành
  công thì **xoá 0 file**; dọn hụt thì `console.error` kèm `kho_khoa` để dọn tay.

---

## Chốt lại

Vòng 1: 1 CHẶN + 3 CAO. Vòng 2: **0 CHẶN + 2 CAO**. Bốn lỗi cũ đóng thật, đóng
đúng chỗ, có ca đối chứng, và 10/10 bàn đo khớp lời khai.

Nhưng cả hai lỗi CAO còn lại đều là **cùng một câu hỏi ERP vẫn chưa trả lời
trung thực: "tài liệu này có tra được theo nội dung không?"** — một chỗ trả lời
CÓ khi thật ra KHÔNG (dải đếm), một chỗ trả lời KHÔNG khi thật ra CÓ (bảng chấm
công, tờ khai). Đó là chốt sống của cả tính năng, nên chưa thể PASS.

**FAIL.** Mở lại sau khi:
1. Dải đếm dùng `ocr_so_trang_neo > 0` (hoặc tách ba vế) — **CAO-A**
2. `laChuVun` đòi mẩu một ký tự phải LIỀN DẢI, kèm ca đối chứng bằng bảng chấm
   công + tờ khai ô vuông — **CAO-B**
3. Sửa chú thích `pdf-chu.js:531` ("văn bản thật không bao giờ chạm tới" — sai)
   và sửa lời giải thích về % ký tự trong CHANGELOG/commit — **VỪA/khai lệch**
4. Cân nhắc bỏ hẳn hoặc viết lại tầng 2 cho đúng dạng bệnh còn lại — **VỪA-A**

Cả bốn đều là bản vá nhỏ, không đụng kiến trúc.
