# REV-0060 · Nạp file dữ liệu — VÒNG 3 (soi bản vá vòng 2)

# ❌ FAIL — 2 CHẶN · 4 CAO · 5 THẤP

Nhánh `feature/nap-file-du-lieu` @ `3148124` · Hồ Ly · 07/09/2026
Worktree `agc-napfile`. Không commit, không push, không sửa một dòng mã sản phẩm.

> **Hai lỗi CHẶN của vòng 2 đã vá đúng.** `huyLuotNap` không còn xoá mù, không
> còn ai cũng gỡ được. Nhưng **`huyLuotNap` vẫn CHƯA an toàn**: cùng một hậu quả
> (tồn kho ÂM) vẫn đến được, chỉ đi bằng đường khác — đường **LÔ HÀNG**. Và cái
> giá của "không có cờ `force`" là **Sếp kẹt vĩnh viễn**, vì hai lối thoát mà
> chính câu từ chối hứa hẹn **không tồn tại trong ERP này**.
>
> Chưa đẩy được.

---

## 0. Bàn đo của tôi có bị đụng không — KHÔNG

Soi cả ba vòng (`924b4fc..HEAD`, tức từ trước khi có tính năng này):

```
git diff --stat 924b4fc HEAD -- scripts/ho-ly-*
  → 7 file, 1585 dòng THÊM, 0 dòng XOÁ, 0 dòng SỬA
```

`ho-ly-rev0060.mjs` (752 dòng) và `ho-ly-rev0060-b.mjs` (128 dòng) chỉ có ở dạng
"thêm mới", chưa từng bị sửa hay xoá dòng nào. **Lời khai đúng.**

**Nhưng có một chỗ lệch cần nói:** `ho-ly-rev0060-f.mjs` mà người xây dẫn ra
**không phải bàn đo của tôi** — nó là một mẩu dò 13 dòng, không đăng ký trong
`package.json`, không có `ok()`/không có tổng kết, và chạy xong thì **ném ngoại
lệ chưa bắt rồi chết**. Cái nó dò (CSV 25.000 dòng) thì mã sản phẩm **xử lý
đúng**: `docBang` ném `LoiDocBang` với câu tiếng người *"File có nhiều hơn
20.000 dòng — vượt sức xử lý một lần. Xin chia nhỏ file…"*, tức là **dừng và nói
ra**, không cắt im lặng. Kết luận "không phải do bản vá" là đúng, nhưng lý do
đúng không phải "HEAD~1 cũng ném" mà là **file đó không phải bàn đo, và hành vi
nó dò là hành vi ĐÚNG**.

Tương tự, `ho-ly-rev0060-c/d/e/g.mjs` là mẩu dò vòng 2, không đăng ký trong
`package.json`. Con số **`ho-ly-rev0060-c` 30/0** trong lời khai vì thế **không
phải một cổng**, nó là một lần chạy tay. Cổng thật của tôi là
`ho-ly-rev0060` — và nó **92/1**, đúng như khai.

---

## 1. CHẶN ①ⓐ — Gỡ lượt nạp VẪN làm tồn kho ÂM, đi bằng đường LÔ HÀNG

`src/nap-du-lieu.js:1281-1296` · `src/kho.js:340-348`

`huyLuotNap` chỉ soi số dư **theo MÃ** (`GROUP BY g.san_pham_id`). Nhưng
`xuatKho` với hàng có theo dõi hạn dùng **không xuất theo mã, nó xuất theo LÔ**:

```js
// src/kho.js:340-348 — chọn lô còn hàng, cận hạn trước
HAVING ton > 0
...
const tongCo = los.reduce((s, l) => s + l.ton, 0);   // chỉ cộng lô ton > 0
```

Một lô có `ton < 0` **bị `HAVING ton > 0` loại khỏi phép cộng**, nên `tongCo`
cao hơn tồn thật của mã. Gỡ lượt nạp có thể để lại đúng một cái lô như thế.

**Đo được trên mã chạy thật** (D1 giả lập bọc `node:sqlite`, CSDL dựng từ đúng
`migrations/`):

```
nạp file  : SP-00001 · 100 túi · lô "LO-A"        → lô A = 100
nhập tay  : SP-00001 · 100 túi · lô "LO-M"        → lô M = 100, tồn mã = 200
xuất kho  : 100 túi, FIFO ăn vào lô A             → lô A = 0,  tồn mã = 100
gỡ lượt nạp                                       → ✅ CHO QUA (100−100 = 0 ≥ 0)
                                                     lô A = −100 · lô M = 100 · tồn mã = 0
xuatKho(SP-00001, 100)  ← qua ĐÚNG cửa của ERP    → HTTP 200, cho xuất
                                                     ⇒ TỒN MÃ = −100
```

`xuatKho` nhìn thấy lô M còn 100 nên cho xuất; lô A âm 100 thì nó không thấy.
Kết quả là **đúng cái trạng thái mà CHẶN-① vòng 2 sinh ra để cấm**, chỉ khác là
nó đến sau một nhịp thay vì ngay lập tức — nên còn khó truy hơn.

Đây **không phải ca giả định**. `ghiThat` đặt `theo_doi_hsd = 1` làm **mặc
định** cho mã mới (`nap-du-lieu.js:1021`), và Alpha Green bán thực phẩm nhập
khẩu — gần như mọi mã đều theo dõi lô/hạn. Cảnh "nạp tồn đầu kỳ có lô → kho bán
một ít → có nhập tay lô mới → nhìn lại thấy nạp nhầm → bấm gỡ" là một tuần bình
thường của anh Duy.

Bản gỡ cũng **giữ lại cái lô âm ấy**: `nap-du-lieu.js:1371-1374` chỉ xoá lô nào
không còn dòng sổ cái nào trỏ vào — lô A vẫn còn dòng XUẤT nên được giữ. Đúng
theo luật của chính nó, nhưng hệ quả là để lại một lô âm mồ côi.

**Đường vá:** chốt chặn phải soi **cả hai mức**. Thêm một câu cùng khuôn
`CAU_SO_DU` nhưng `GROUP BY g.lo_hang_id`, chạy trên các lô mà lượt nạp này có
đụng tới (`SELECT DISTINCT lo_hang_id FROM giao_dich_kho WHERE phieu_id = ?`),
`HAVING con < 0`. Câu từ chối kê tên lô thay vì mã. Rẻ như câu đang có.

---

## 2. CHẶN ②ⓑ — Câu từ chối chỉ vào hai cánh cửa KHÔNG TỒN TẠI

`src/nap-du-lieu.js:1312-1316`

Không có cờ `force` là **quyết định đúng** — tôi đồng ý với người xây. Nhưng
"không có `force`" chỉ đứng vững khi **có đường ra khác**. Câu từ chối hứa hai
đường:

> *"Xin **lập phiếu điều chỉnh ở màn Kho vận** cho đúng số thật, hoặc **gỡ các
> phiếu XUẤT liên quan** trước rồi gỡ lại lượt nạp này."*

Đo cả hai:

| Đường ra được hứa | Có thật? | Bằng chứng |
|---|---|---|
| Lập phiếu điều chỉnh ở màn Kho vận | **KHÔNG** | `src/kho.js` không có một câu `INSERT` nào ghi `loai='dieu_chinh'`; chữ `dieu_chinh` chỉ xuất hiện **3 lần**, cả 3 đều trong câu `SUM(...)` của báo cáo XNT (`kho.js:428,439`). `src/index.js`: **0 lần**. `public/app.html`: **0 lần**. `public/assets/js/app.js`: **0 lần**. Không có API, không có nút, không có màn. |
| Gỡ các phiếu XUẤT liên quan | **KHÔNG** | `grep -c "DELETE FROM" src/kho.js` = **0**. Vẫn đúng con số mà chính REV-0060 đã dẫn ra ở đầu mục 5b để giải thích vì sao phải có `huyLuotNap`. |

**Hệ quả thật:** Sếp nạp nhầm file tồn → kho bán mất vài món → bấm gỡ → 409 →
đọc câu báo → đi tìm nút "phiếu điều chỉnh" → **không có** → hết đường. Lượt nạp
sai nằm lại sổ cái vĩnh viễn, và lối duy nhất là **mở D1 sửa tay** — đúng cái
việc mà REV-0060 sinh ra để xoá bỏ.

Nặng gấp đôi vì đây là **câu lỗi tiếng người trong đường xoá dữ liệu**, chỗ mà
luật của nhà đòi cao nhất. Một câu chỉ sai đường còn tệ hơn một câu cụt: cụt thì
người ta đi hỏi, sai đường thì người ta đi tìm cả buổi rồi mới hỏi.

**Đường vá — chọn một, đừng chọn cả hai:**
- **(a)** Làm thật cái phiếu điều chỉnh: `kho.js` đã có sẵn khuôn `nhapKho`,
  bảng đã có `loai='dieu_chinh'`, báo cáo XNT đã có cột cho nó. Thêm một hàm
  `dieuChinhKho()` + một route + một nút. Đây là việc nhỏ nhất trong ba việc và
  nó **đóng luôn cả CHẶN-ⓐ** (có phiếu điều chỉnh thì lô âm cũng sửa được).
- **(b)** Nếu chưa làm kịp: **đổi câu báo cho đúng sự thật** — nói rõ *"ERP chưa
  có màn lập phiếu điều chỉnh; xin báo Sếp Ngọc hoặc anh Duy kèm mã phiếu
  `pn_xxx`"*. Không được hứa một cửa không có.

---

## 3. CAO ③ — Cửa "gõ lại tên file" **không phải cửa của máy chủ**, chỉ là cửa của màn hình

`src/nap-du-lieu.js:967` · `src/index.js:2090,2109`

Ghi chú trong mã khẳng định:

> *"Giao diện có thể bị bỏ qua (gọi thẳng API) … Nên cửa chặn thật nằm ở đây."*

Không đúng. **Cả hai vế của phép so đều do khách gửi lên**, trong cùng một gói:

```js
// index.js:2090   const tenTep = String(r.moTa.ten_tep || 'file');
// index.js:2111   xacNhanTenTep: String(r.moTa.xac_nhan_ten_tep || '')
// nap-du-lieu.js:967   khopTenTep(xacNhanTenTep, tenTep)
```

Đo được — gọi thẳng `ghiThat` với `ten_tep: 'x'` + `xac_nhan_ten_tep: 'x'`:

```
tồn SP-00001: 100 → 200      ⇒ CHO QUA, tồn CỘNG ĐÔI
```

Không phải hồi quy (vòng 2 cái tick cũng thế), và với người dùng thật qua trình
duyệt thì cửa **có tác dụng đúng như thiết kế** (`ban-nap-file` đo được: tick
không mở, gõ sai không mở, gõ đúng mới mở). Nhưng lời khai trong mã đang nói quá
so với thứ đo được — mà đây là chốt chặn tồn kho, chỗ không được nói quá.

**Đường vá (rẻ, và mạnh hơn hẳn):** máy chủ **biết** tên file của lượt nạp
trước — nó nằm trong `trung.trung_noi_dung.ly_do`. Bắt gõ lại **tên file của
lượt nạp trước** thay vì tên file khách vừa khai. Lúc đó vế cần khớp là thứ **chỉ
máy chủ biết**, và cửa thành cửa thật.

---

## 4. CAO ④ — Kiểm số dư và XOÁ không nằm trong một giao dịch (TOCTOU)

`src/nap-du-lieu.js:1295-1370`

`huyLuotNap` đọc số dư, rồi ở một lượt `await` khác mới `UPDATE` + `DELETE`.
Giữa hai chỗ đó không có khoá, không có giao dịch, không có so lại.

Ca vượt được (đọc mã, **chưa dựng lại được trên bàn đo vì `node:sqlite` chạy
đồng bộ nên hai lời gọi không thật sự chen nhau — D1 thì có**):

```
nạp A: SP-1 100 · nạp B: SP-1 100 · xuất 50   → tồn 150
anh Duy bấm gỡ A  ─┐ cả hai cùng đọc tồn 150
chị Hằng bấm gỡ B ─┘ mỗi người tính 150−100 = 50 ≥ 0 ⇒ CẢ HAI CHO QUA
                                              ⇒ tồn = −50
```

Chạy tuần tự thì chặn đúng (đo được: gỡ A qua, gỡ B bị 409). Chỉ chen nhau mới
lọt. Cùng lớp với ca "gỡ trong lúc có người đang xuất kho".

**Đường vá:** đánh dấu `đã gỡ` **trước** phép kiểm số dư (đã có sẵn câu `UPDATE`
điều kiện ở dòng 1354 — chỉ cần thêm `AND gia_tri_moi <> 'đã gỡ'` và coi
`changes = 0` là "người khác đang gỡ"), rồi kiểm số dư, âm thì trả dấu về như
đường `sot` đã làm. Một dòng `WHERE` biến nó thành khoá.

---

## 5. CAO ⑤ — Vòng "đi tiếp sang bảng có số liệu" bung không giới hạn

`src/doc-bang.js:537-542`

```js
if (!nguoiChon && coDong(luoi) < 2 && dsBang.length > 1) {
  for (let i = 0; i < dsBang.length; i++) {
    thu = await bungLuoi(dsBang[i].duong, dsBang[i].ten);   // ← không chốt gì
```

Đường đếm dòng ngay bên dưới (`doc-bang.js:570`) có chốt an toàn
`if (!m || m.coThat > 8 * 1024 * 1024) continue;`. Đường mới **không có**. Nó
bung **cả XML lẫn lưới ô đầy đủ** của tối đa 30 bảng, mỗi lưới tới
20.000 × 200 ô, trong isolate 128 MB — và bảng ẩn thì bung xong mới `continue`,
tức là trả tiền rồi vứt đi.

Nguy: một workbook 8 MB nén, bảng đầu rỗng, nhiều bảng nặng ⇒ isolate chết ở
bước **mở file**, câu lỗi ra là câu chung chung.

**Đường vá:** chép đúng cái chốt 8 MB đã có ở dòng 570, bỏ qua bảng ẩn **trước
khi** bung, và dừng sau 3-5 bảng đã thử.

---

## 6. CAO ⑥ — `keBangRong` khẳng định một điều nó không biết

`src/doc-bang.js:595-603`

```js
const con = dsBang.filter(b => b.ten !== tenBang && Number(b.so_dong) > 0);
...
: `Không bảng nào có dòng dữ liệu — mở lại bằng Excel xem có đúng file cần nạp không.`
```

`Number(null)` = 0. Ở bước 2 và bước 3 (`nap-xem`, `nap-ghi`) `demDong` **tắt**,
nên `so_dong` của mọi bảng khác đều `null` ⇒ `con` rỗng ⇒ ERP nói **"Không bảng
nào có dòng dữ liệu"**.

Ca thật: Sếp nhìn ô chọn bảng ở bước 1 thấy `Sheet1 · 0 dòng` / `Data · 812
dòng`, lỡ chọn `Sheet1`, bấm Xem trước → ERP trả *"Không bảng nào có dòng dữ
liệu — mở lại bằng Excel xem có đúng file cần nạp không"*, trong khi chính nó
vừa in ra `Data · 812 dòng` một phút trước. Đây là cùng cái lớp lỗi mà CAO-⑦b
đang vá: **câu lỗi chỉ sai đường**.

**Đường vá:** một chữ — phân biệt `so_dong === null` ("chưa đếm") với
`so_dong === 0` ("đếm rồi, rỗng thật"), và khi chưa đếm thì nói *"chưa đếm số
dòng các bảng khác — xin quay lại bước ghép cột để chọn bảng"*.

---

## 7. THẤP

1. **`khopTenTep` thiếu `.normalize()`** (`nap-du-lieu.js:216`). Tên file có dấu
   tiếng Việt từ máy Mac lưu dạng NFD (`"Tồn đầu kỳ.csv"` = 19 ký tự); Sếp gõ
   trên Windows ra NFC (14 ký tự). Đo được: **không khớp**. Hai chuỗi nhìn y hệt
   trên màn hình, Sếp gõ mãi không vào được và không có cách nào biết vì sao.
   Sửa: `.normalize('NFC')` cả hai vế. Hỏng theo hướng an toàn nên chỉ là THẤP,
   nhưng nó là một cái bẫy im lặng.

2. **Lời khai lệch — "client cũ trong service worker".** `public/sw.js` **không
   cache gì cả** (dòng 4-7 nói rõ: *"KHÔNG cache/lưu bất cứ thứ gì"*, dòng 27
   `fetch` handler rỗng). Cửa sổ "client cũ" chỉ còn là **một tab đang mở lúc
   đẩy bản mới** — nhỏ hơn nhiều so với lời khai, và nó hỏng theo hướng an toàn
   (về lại hành vi trước khi vá: đọc bảng 1). Đánh giá của tôi: **không phải
   nguy**, nhưng con số trong lời khai sai.

3. **`so_dong` đếm hai kiểu.** Bảng đang đọc dùng `luoi.length - 1` (dòng thô);
   bảng đi tiếp dùng `coDong(thu.luoi) - 1` (dòng có nội dung). Cùng một ô chọn
   bảng hiện hai loại số. Nhỏ, nhưng ô đó chính là cửa chặn bằng mắt.

4. **Hai công thức tồn lệch nhau.** `CONG_DON_TON` (`nap-du-lieu.js:1219`) dùng
   `CASE WHEN loai='xuat' THEN -ABS(so_luong)`; cả phần còn lại của ERP dùng
   `SUM(so_luong)` thẳng (`kho.js:76,369,425-429`). Với dữ liệu đúng quy ước
   (xuất lưu số âm) hai cách **bằng nhau**. Với một dòng xuất lỡ lưu số dương
   thì đo được: `huyLuotNap` tính tồn 20, `kho.js` tính 180 — lệch 160. Lệch
   theo **hướng an toàn** (chặn chứ không cho qua) nên tôi không tính là lỗi;
   nhưng nên ghi vào ghi chú rằng đây là chủ ý, để lần sau không ai "sửa cho
   giống nhau" theo chiều ngược.

5. **Rác bàn đo.** 5 tệp `ho-ly-rev0060-c/d/e/f/g.mjs` được commit nhưng không
   đăng ký trong `package.json`; `-f` chạy là **chết bằng ngoại lệ chưa bắt**.
   Xoá hoặc đăng ký đàng hoàng — mã trong `scripts/` mà chạy là chết thì lần sau
   có người tưởng cổng hỏng.

---

## 8. Bàn đo của tôi CÓ ép người ta chép mã — **đây là lỗi của tôi**

Người xây khai đúng, và tôi nhận.

`scripts/ho-ly-rev0060.mjs:690`:

```js
ok('Cây phụ thuộc đúng 4 file (nap-du-lieu · doc-bang · canh-bao-ghi · quyen)',
   cay.length === 4, String(cay.length));
```

Điều tôi **thật sự** muốn canh nằm ở câu ngay trên (dòng 687): *"không một lời
gọi AI / mạng nào trong CẢ cây phụ thuộc"*. Câu đó **đã đi hết cây theo chiều
sâu**, nên nếu `nap-du-lieu.js` `import` thêm `cat-danh-sach.js` thì nó vẫn soi
tới nơi. `src/cat-danh-sach.js` **không `import` gì cả** và **không có một lời
gọi mạng nào** — thêm nó vào cây là hoàn toàn an toàn.

Vậy `cay.length === 4` **không canh thêm được gì**. Nó chỉ đóng đinh HÌNH DẠNG
cây. Và cái đinh ấy đã đẩy người xây tới chỗ **chép 10 dòng `catBot`/`nhanCat`
thành `noiVetCat` tại chỗ** (`nap-du-lieu.js:647-654`) thay vì dùng chỗ chuẩn —
tức là bàn đo của tôi đã đẻ ra một bản sao của mã, đúng cái mà mọi luật trong
repo này chống lại. Lý do người xây viết ra ("phá cái chốt ấy") là **đọc đúng
bàn đo, chỉ hiểu sai mục đích** — vì bàn đo tôi viết không nói rõ mục đích.

**Việc của tôi phải làm (không phải của người xây):** đổi dòng 690 từ đếm số
file thành **danh sách trắng theo tên**:

```js
const CHO_PHEP = new Set(['nap-du-lieu.js','doc-bang.js','canh-bao-ghi.js',
                          'quyen.js','cat-danh-sach.js']);
ok('Cây phụ thuộc không lôi thêm mô-đun lạ nào vào đường nạp',
   cay.every(f => CHO_PHEP.has(path.basename(f))), ...);
```

Giữ nguyên tính chất muốn canh, bỏ cái đinh vô ích. **Cho tới khi tôi sửa xong,
`noiVetCat` cứ để nguyên** — nó đúng việc, `do-cat-im-lang` đã nhận nó là một
cửa "đã nói ra", và bắt người xây gỡ ra lúc này là bắt họ trả giá cho lỗi của
tôi.

**Hai dòng miễn trừ mới trong `do-cat-im-lang`: đứng vững, không có ý kiến.**
- `huyLuotNap` — cắt ở `LIMIT 5` là để **câu từ chối đọc được**, và nó chạy hẳn
  một câu `COUNT(*)` thật rồi nói *"…và N mã nữa"*. Đúng định nghĩa "cắt có chủ
  ý + đã nói ra".
- `dsLuotNap` — nhãn trên màn là "Lượt nạp gần đây", trần do người gọi truyền
  (≤50). Cùng khuôn với các miễn trừ hàng đợi đã có.

**Mặt trận ③ "cửa mô-đun" là một bổ sung TỐT.** Nó có ca đối chứng đúng lối:
mẫu bẩn phải **lọt** lưới ① (chứng minh lỗ thủng có thật) và **bị** lưới ③ bắt,
mẫu sạch không bị bắt oan. Đây là chỗ đáng khen nhất của bản vá vòng này.

---

## 9. Câu chờ Sếp ① — cách chia ĐÚNG, xác nhận

Người xây tách:
- **Ai được XOÁ** → vá thẳng, không hỏi. **Đúng.** Xoá là hành vi bất đối xứng:
  nạp sai thì thấy số lạ, xoá sạch thì không còn gì để thấy. Luật "chính người
  đã nạp **hoặc** `duocQuanLyKho`" bám đúng kênh báo cáo Sếp đã chốt (nhân sự
  kho → anh Duy → Sếp Ngọc) và không cần Sếp quyết gì thêm.
- **Ai được NẠP hàng loạt** → để thành câu chờ Sếp. **Đúng.** Hôm nay 17 bạn
  part-time có `thao_tac_kho` đều nạp thẳng vào sổ cái được. Đó là **chính sách
  kinh doanh**, không phải quyết định kỹ thuật — Khỉ Đột không được tự đổi, Hồ
  Ly không được tự chốt.

**Câu để Sếp trả lời (một câu, một lần):**
> *Nạp file tồn kho hàng loạt — 17 bạn part-time ở kho có được tự nạp không, hay
> chỉ anh Duy + chị Hằng + Sếp? (Gỡ thì đã chốt rồi: chỉ người đã nạp hoặc anh
> Duy.)*

---

## 10. Chạy lại HẾT cổng — số khớp lời khai, không lệch chỗ nào

| Cổng | Lời khai | Tôi đo | |
|---|---|---|---|
| `ho-ly-rev0060` | 92/1 | **92/1** | ✅ trượt duy nhất = câu chờ Sếp ① |
| `do-nap-lai` | 150/0 | **150/0** | ✅ |
| `do-nap-file` | 89/0 | **89/0** | ✅ |
| `do-nap-ghi` | 42/0 | **42/0** | ✅ |
| `do-cat-im-lang` | SẠCH | **SẠCH** | ✅ gồm mặt trận ③ mới |
| `do-moc-noi` | 9/0 | **9/0** | ✅ |
| `do-tach-vai-tro` | 61/0 | **61/0** | ✅ |
| `do-ghi-dongbo` | 31/0 | **31/0** | ✅ |
| `do-bang-that` | 75/0 | **75/0** | ✅ (nợ cũ: không đo 1024px — không nhận) |
| `ban-nap-file` | XANH | **26/0 XANH** | ✅ |
| `ban-nap-file-dienthoai` (375px) | XANH | **26/0 XANH** | ✅ 0 thanh kéo ngang |
| `ban-nap-file-kinhdoanh` | XANH | **15/0 XANH** | ✅ |
| `...-kinhdoanh-dienthoai` | XANH | **15/0 XANH** | ✅ |
| `cong-khoi` | XANH | **XANH** | ✅ 13 tab, 0 lỗi console |
| `cong-khoi-dienthoai` (375px) | XANH | **XANH** | ✅ |
| Gói mới / migration mới | 0 / 0 | **0 / 0** | ✅ |

**Không một con số nào lệch.** Chi phí vẫn 0 đồng. Ba màu, ≥44px, tiếng Việt có
dấu, vừa một màn ở 375px — bàn đo trình duyệt xác nhận cả bốn.

Nợ cũ **không nhận**: `do-bang-that` không đo 1024px · 2 bảng Dashboard
Marketplace (`f1ac70b`).

---

## 11. Trả lời thẳng ba câu Gạo hỏi

**`huyLuotNap` nay đã an toàn chưa?**
**CHƯA.** Vá vòng 2 đóng đúng cái cửa đã mở (xoá mù theo mã, ai cũng gỡ được) và
đóng chắc — tôi tấn công lại bằng 5 ca (nhập tay xen giữa · điều chỉnh âm · hai
lượt chồng mã · gọi thẳng API bỏ qua giao diện · quản lý kho vs part-time) thì
**cả 5 đều chặn đúng**, và không chặn oan (chưa xuất gì thì gỡ được). Nhưng
**cùng một hậu quả vẫn đến được bằng đường LÔ HÀNG** (CHẶN-ⓐ), và **cái giá của
"không có `force`" chưa trả được** vì hai lối thoát mà nó hứa không tồn tại
(CHẶN-ⓑ). Vá hai chỗ đó thì tôi ký.

**Bàn đo của tôi có ép chép mã không?**
**CÓ. Lỗi của tôi**, ở `ho-ly-rev0060.mjs:690`. Chi tiết + đường sửa ở mục 8.
`noiVetCat` để nguyên, đừng bắt người xây gỡ.

**Chỗ nào lời khai lệch số đo?**
Ba chỗ, không chỗ nào là gian:
1. `ho-ly-rev0060-f.mjs` **không phải bàn đo của tôi** (mục 0) — kết luận đúng,
   lý do sai.
2. `ho-ly-rev0060-c` **30/0 không phải một cổng** (không có trong
   `package.json`).
3. "Client cũ trong service worker" — `sw.js` **không cache gì cả** (THẤP-2),
   nguy nhỏ hơn khai.

Ngoài ra một chỗ **khai thiếu, không phải khai sai**: ghi chú ở
`nap-du-lieu.js:948-950` nói cửa gõ tên file chặn được "gọi thẳng API" — đo được
là **không** (CAO-③).

---

*Hồ Ly — Review Gate · REV-0060 vòng 3 · 07/09/2026*
