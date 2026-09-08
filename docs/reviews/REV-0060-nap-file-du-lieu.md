# REV-0060 — Nạp file số liệu vào ERP

**KẾT LUẬN: FAIL** — không cho lên bản chạy thật ở dạng hiện tại.

| | |
|---|---|
| Nhánh soi | `feature/nap-file-du-lieu` @ `ea3c81b` (đã gộp `origin/main` = `f1ac70b`) |
| Người soi | HỒ LY (Review Gate) |
| Ngày | 07/09/2026 |
| Bàn đo tự viết | `scripts/ho-ly-rev0060.mjs` (81 đạt · 12 trượt) · `scripts/ho-ly-rev0060-b.mjs` (dựng lại 4 cảnh gây hại) |

**2 lỗi CHẶN · 4 lỗi CAO · 4 lỗi VỪA · 4 lỗi THẤP.**

Cả hai lỗi CHẶN nằm ở **một gốc duy nhất**: đường nạp **tồn kho đầu kỳ** không
có bất kỳ khoá nào chống nạp lại. Đây đúng là đường ghi thẳng vào sổ cái kho
mà anh Phạm Khương Duy sắp mở ra dùng, và sai số ở đây là sai tồn kho thật.

Phần **đọc file** (CSV/TSV/UTF-16/.xlsx) thì tốt thật — đo trên **17 file
`.xlsx` thật của Sếp**, đọc trót lọt cả 17. Nhưng "đọc được byte" khác với
"lấy đúng bảng cần lấy", và chỗ thứ hai đang hỏng trên chính file thật của Sếp
(lỗi CAO-③).

---

## ⓪ Có nới bàn đo cũ không — KHÔNG

```
git diff origin/main...HEAD --name-status -- scripts/
A  scripts/do-nap-file.mjs      (520 dòng, MỚI)
A  scripts/do-nap-ghi-d1.mjs    (486 dòng, MỚI)
```

**Không một dòng nào của bàn đo cũ bị sửa.** Hai file đều là file mới. Đây là
điểm sạch, nói thẳng là đúng.

`package.json`: đúng **6 dòng thêm**, toàn bộ là lệnh `npm run`, **không thêm
một gói phụ thuộc nào** → luật "chi phí 0" giữ được.

**Hai bàn đo do chính người xây viết có tự chấm bài mình không?** Đã kiểm:

- Cả hai đều có chế độ tự kiểm (`--tu-kiem`) **gài lỗi vào mã thật rồi chạy lại**:
  `do-nap-file` bắt 7/7 lỗi gài, `do-nap-ghi` bắt 4/4. Đây là hình thức tự chứng
  minh có mắt đủ mạnh, không phải đồ trang trí.
- `do-nap-ghi-d1.mjs` **canh ngược con số dự tính** (`duTinhGhi`) và **canh
  thẳng hằng số `CO_LO_HOI` trong mã** để chặn ca "quá 100 tham số của D1" mà
  bàn thử ở máy không tự vấp được. Đây là chỗ viết bàn đo có nghề.
- **Nhưng có một chỗ tự chấm rộng tay** — xem THẤP-④ về mục "file thật".

⚠️ **`do-bang-that` đang chỉ đo 3 mức rộng**: `scripts/do-bang-that.mjs:69`
→ `const RONGS = [1440, 1280, 375];`. **Không có 1024px.** Tôi không tự thêm
theo dặn dò. Nhưng phải nói rõ: bàn đo này đang **không đo mức 1024px**, và
nhánh này có sửa `.kd-sku-cot` từ `minmax(320px)` lên `minmax(560px)` — tức là
đúng cái mức 1024px là mức quyết định hai bảng SKU đứng cạnh hay xếp chồng.

---

## CHẶN-① — Nạp lại đúng file tồn kho làm **TỒN GẤP ĐÔI**, không một chữ cảnh báo, không hoàn tác được

**File:dòng:** `src/nap-du-lieu.js:487-507` (`doiChieuTonKho`) và `:672-684` (ghi phiếu nhập)

**Tái hiện** (`node scripts/ho-ly-rev0060.mjs`, mục C1):

```
tổng tồn sau lần 1/2/3:  5.000 → 10.000 → 15.000
xem trước lần 2 nói gì:  so_them=50 · cảnh báo=[]
```

Nạp đúng một file, đúng 50 mã, mỗi mã 100 cái, ba lần liên tiếp → sổ cái kho
có **15.000** đơn vị thay vì 5.000. Màn **xem trước lần 2 và lần 3 hiện y hệt
lần 1** — "Ghi vào sổ: 50 · Dòng nhập vào sổ cái kho" — và trường `canh_bao`
trả về **mảng rỗng**.

**Vì sao hại.**
Người xây tự khai lỗi này rồi tự xử bằng câu *"dặn Sếp chỉ nạp một lần"*.
**Dặn miệng không phải cơ chế**, và ba lý do:

1. Người ta SẼ nạp lại — mạng lỗi, tưởng chưa xong, hoặc file thêm vài dòng
   mới. Chính người xây viết luật ③ ở đầu `nap-du-lieu.js`: *"TẢI LẠI CÙNG
   FILE KHÔNG ĐƯỢC NHÂN ĐÔI. Người ta SẼ tải lại"*. Luật đó được giữ cho
   `san_pham` (đã đo: 3 lần → vẫn 500 dòng, 0 lượt ghi) và **bị bỏ cho
   `ton_kho`** — đúng cái đích nguy hiểm hơn.
2. ERP **có sẵn** thứ để nhận ra: `vanTayCot` đã băm danh sách tên cột, và
   `lich_su_thay_doi_nen` đã lưu tên file của mọi lần nạp. Một câu `SELECT`
   là biết "file tên này đã nạp lúc 14:03 hôm nay". Không làm, không phải
   không làm được.
3. **Không có đường lùi.** `grep -c "DELETE FROM" src/kho.js` = **0**. Không
   có nút huỷ phiếu, không có hoàn tác. Nạp nhầm là phải mở CSDL sửa tay.

Tồn ảo gấp đôi thì Kinh doanh thấy còn hàng, bán ra, kho không có hàng giao —
đó là mất tiền thật và mất điểm với khách.

**Phải làm gì:** trước khi ghi, đối chiếu (vân tay cột + tên file + số dòng)
với các lần nạp `ton_kho` gần đây; trùng thì **chặn** hoặc ít nhất bắt Sếp gõ
xác nhận, và nói rõ *"file này đã được <ai> nạp lúc <giờ>, nạp tiếp sẽ CỘNG
THÊM vào tồn hiện có"*. Kèm theo là một đường huỷ phiếu nhập theo `phieu_id`.

---

## CHẶN-② — Nạp tồn NGÃ GIỮA CHỪNG để lại dữ liệu nửa vời; Sếp nạp lại là tồn sai

**File:dòng:** `src/nap-du-lieu.js:689-696` (vòng ghi theo lô 50 lệnh)

**Tái hiện** (`node scripts/ho-ly-rev0060-b.mjs`, mục ②):

```
lần 1 NGÃ: D1 network error
sau khi ngã: sổ cái đã có 15.000 đơn vị (file có 30.000)
Sếp thấy báo lỗi nên nạp LẠI ⇒ tồn = 45.000
⇒ tồn ẢO thừa 15.000 đơn vị · ❌ SAI TỒN
sổ ngày (hạn mức) = 3.603 — lượt ghi của lần NGÃ KHÔNG vào sổ
```

**Vì sao hại.** `env.DB.batch()` chỉ bao một giao dịch cho **một lô 50 lệnh**,
không bao cả lần nạp. File 300 dòng = 300 lệnh = 6 lô. Lô 4 ngã thì 3 lô đầu
**đã ghi xong và nằm lại trong sổ cái**, còn hàm thì ném lỗi lên. Giao diện
hiện đúng một câu: *"Không nạp được, thử lại nhé."*

Sếp đọc câu đó, hiểu là chưa ghi gì, bấm nạp lại → cộng thêm lần nữa lên trên
phần đã ghi dở. Với `san_pham` thì vô hại (khớp theo `ma_sku`, nạp lại nhận ra
"y hệt" nên bỏ qua). Với `ton_kho` thì **tồn sai và không ai biết sai bao
nhiêu** — sổ cái không có dấu nào phân biệt dòng của lần ngã với dòng của lần
nạp lại, vì cả hai đều là phiếu nhập hợp lệ.

Kèm theo, cùng ca này còn hụt luôn kế toán hạn mức: `chotNgayLuon` nằm SAU
vòng ghi (`:706`) nên khi ngã thì **lượt ghi đã tiêu không vào sổ ngày**.

**Phải làm gì:** câu lỗi phải nói thật *"đã ghi được N/M dòng rồi mới ngã —
ĐỪNG nạp lại, xem sổ cái trước"*, và trả về `phieu_id` để huỷ. Tốt hơn nữa:
gom cả lần nạp `ton_kho` vào một giao dịch, hoặc đánh dấu phiếu là "đang ghi"
rồi mới chuyển sang "xong".

---

## CAO-① — Chốt chặn hạn mức: hai/ba người nạp CÙNG LÚC thì **cả ba đều lọt**, D1 chặn ghi cả hệ thống

**File:dòng:** `src/nap-du-lieu.js:606-613` (đọc rồi mới quyết, không có đặt chỗ)

**Tái hiện** (`node scripts/ho-ly-rev0060-b.mjs`, mục ①):

```
sổ ngày trước khi nạp: 35.000 / 100.000 (đồng bộ sàn buổi sáng)
Sếp  : 35.000 lượt
Duy  : 35.000 lượt
Hương: 35.000 lượt
sổ ngày sau: 140.000 / 100.000  ⇒ ❌ VƯỢT HẠN MỨC — D1 CHẶN GHI CẢ HỆ THỐNG
```

**Vì sao hại.** `conLaiTrongNgay()` **đọc** sổ ngày, so sánh, rồi mới ghi. Ba
lời gọi song song đều đọc thấy "còn 65.000, ngưỡng chặn 45.000", đều thấy file
mình cần 45.000, đều đi qua. Cộng dồn của `chotNgayLuon` thì đúng (câu
`ON CONFLICT DO UPDATE SET so_dong = so_dong + excluded.so_dong` là nguyên tử,
đã đo: **bộ đếm KHÔNG bị đè**), nhưng nó cộng **sau khi đã ghi rồi** — lúc đó
thì muộn.

Ngay hai người thôi cũng đủ ăn sạch phần chừa 20.000 cho đồng bộ sàn (đo được
82.000 và 100.000 ở hai ca khác nhau). Vượt 100.000 là **D1 chặn ghi cả hệ
thống**: đơn hoàn ngừng cập nhật, kho vận không thấy đơn quá hạn — đúng cái
mà chốt chặn này sinh ra để tránh.

Đây **KHÔNG** phải ca hiếm: giai đoạn lấp kho là lúc nhiều người cùng nạp
nhất, mà `nap-ghi` là cửa mở cho `admin` · `quan_ly_kho` · `nhan_vien_kho` ·
`van_hanh_san`.

**Phải làm gì:** đặt chỗ TRƯỚC khi ghi — cộng phần dự tính vào sổ ngày bằng
đúng câu nguyên tử đang có, đọc số trả về, vượt thì hoàn lại phần đã đặt và
trả 429; không vượt thì ghi rồi chỉnh lại chênh lệch giữa dự tính và số thật.

---

## CAO-② — Cron chốt sổ chạy CÙNG isolate thì **đếm lượt ghi hai lần**

**File:dòng:** `src/nap-du-lieu.js:691` (`demGhi(kq)`) + `:706` (`chotNgayLuon`) ·
`src/canh-bao-ghi.js:99-120` (`chotVaCanhBao`) · `src/index.js:7363` (gọi từ `scheduled()`)

**Tái hiện** (`node scripts/ho-ly-rev0060.mjs`, mục A2):

```
ghi thật 700 · sổ ngày 700 · bộ đếm treo trong bộ nhớ = 700
sau khi cron chốt sổ (cùng isolate): sổ ngày = 1.400
✗ CỘNG ĐÔI: 700 → 1.400 (+700)
```

**Vì sao hại.** `ghiThat` làm **hai việc cùng lúc** với một con số: gọi
`demGhi(kq)` (cộng vào biến `donCho` trong bộ nhớ) **và** gọi `chotNgayLuon`
(ghi thẳng vào sổ ngày). Sau đó **không ai xoá `donCho`**. Cloudflare Workers
cho `scheduled()` và `fetch()` **dùng chung isolate** — không phải luôn luôn,
nhưng có. Lúc đó cron flush `donCho` lần nữa và sổ ngày cộng đôi.

Chính người xây viết trong mã: *"số này **gần như** KHÔNG BAO GIỜ tới được chỗ
cron"*. **"Gần như" là chỗ hỏng.** Hậu quả không mất dữ liệu nhưng đủ khó
chịu: sổ ngày phồng lên gấp đôi ⇒ 429 chặn oan Sếp giữa lúc lấp kho, và
Telegram kêu "chạm 80% hạn mức" khi thật ra mới 40%. Nguy hơn: một khi con số
trong sổ không tin được nữa thì lần nổ hạn mức THẬT sau này lại không ai tin.

**Phải làm gì:** một dòng. Trong `ghiThat`, hoặc bỏ hẳn `demGhi(kq)` (vì đã
chốt ngay), hoặc gọi `datLai(dangCho() - ghiThuc)` sau khi chốt.

---

## CAO-③ — `.xlsx` nhiều bảng: ERP lấy bảng ĐẦU TIÊN và **không nói một chữ** — hỏng ngay trên file thật của Sếp

**File:dòng:** `src/doc-bang.js:327-343` (chọn `duongBang`), không đẩy gì vào `canhBao`

**Tái hiện** — đây không phải ca dựng, đây là file đang nằm trên Desktop của Sếp:

```
C:\Users\Admin\Desktop\Nhap_khau_hang_hoa.xlsx  (225 KB, 7 bảng)
  bảng trong file: Hướng dẫn nhập khẩu | Tep nhap khau | Danh mục |
                   StockCodes | UnitNames | Attributes | Categories

ERP đọc ra:
  TÊN CỘT: ["HƯỚNG DẪN NHẬP KHẨU HÀNG HÓA VÀO PHẦN MỀM MISA ESHOP",
            "(cột 2 không có tiêu đề)", "(cột 3 không có tiêu đề)", …]
  DÒNG 1 : ["Các bước để nhập khẩu thêm mới hàng hóa vào phần mềm MISA eShop"]
  CẢNH BÁO: []            ⇐ im lặng hoàn toàn
```

ERP đọc **trang hướng dẫn** và đưa nó cho Sếp như thể đó là bảng số liệu.
Dữ liệu thật nằm ở bảng 2 (`Tep nhap khau`) và bảng 3 (`Danh mục`) — **không
có cách nào chọn**.

Không phải một file lẻ:

| File thật của Sếp | Số bảng | Bảng ERP sẽ lấy |
|---|---|---|
| `Desktop\Nhap_khau_hang_hoa.xlsx` | **7** | "Hướng dẫn nhập khẩu" (sai) |
| `Desktop\1. Nghiên cứu Marketing Form.xlsx` | **5** | bảng 1 |
| `Desktop\AI\TongHop_SanPham_Theo_SKU.xlsx` | **2** | "Tổng hợp theo SKU" (đúng, may) |

Kể cả file danh mục 797 dòng mà người xây lấy ra khoe cũng có **2 bảng** —
nó ra đúng là do **may**, không do luật.

**Vì sao hại.** Đây là kiểu hỏng khó thấy nhất: không lỗi, không cảnh báo,
chỉ là **số liệu của bảng khác**. Lần này thì ô bắt buộc không ghép được nên
dừng lại được, nhưng chỉ cần bảng đầu tiên tình cờ có cột tên giống là số vào
sổ êm ru.

**Phải làm gì:** đọc tên tất cả các bảng từ `xl/workbook.xml` (mã đã đọc file
đó rồi, `:328`), trả về danh sách, cho Sếp **chọn bảng** ở bước 1, và mặc định
thì ÍT NHẤT phải nói *"File có 7 bảng, đang đọc bảng «Hướng dẫn nhập khẩu»"*.

---

## CAO-④ — Kinh doanh VẪN không có đường vào màn nạp (lời khai ③ mới xong một nửa)

**File:dòng:** `public/assets/js/app.js:7441-7443` · `public/app.html:1366` và `:1392`

Người xây khai đã vá: *"Giao diện cắt quyền theo luật KHÁC máy chủ → Kinh
doanh, chủ sở hữu danh mục SKU, không thấy nút nạp… đã cho hai bên dùng chung
một luật."* Phần đổi luật thì **đúng thật** (đã đo: `qSanPham.sua || qKho.thao_tac`
trùng khít `duocSuaSanPham` / `duocThaoTacKho`, không vai trò nào lệch).

Nhưng **kết quả cuối cùng vẫn không đạt** (`node scripts/ho-ly-rev0060-b.mjs`, mục ④):

```
van_hanh_san có tab 'khovan'?           false
máy chủ cho van_hanh_san nạp danh mục?  true
khoiDongNapFile chỉ chạy trong khoiDongKho,
  mà khoiDongKho chỉ chạy khi có tab 'khovan'?   true
màn "Nạp từ file" nằm TRONG <section id="v-khovan">? true
⇒ ❌ Kinh doanh VẪN KHÔNG có đường vào màn nạp, dù máy chủ cho phép
```

Màn "Nạp từ file" là một `kv-pane` **nằm trong tab Kho vận**, mà `van_hanh_san`
**không có tab Kho vận** (`src/quyen.js:51`). Nút được sửa cho hiện đúng người
— nhưng nó nằm trong căn phòng người đó không mở được cửa.

**Vì sao hại.** Đúng cái nỗi đau ban đầu: chủ sở hữu danh mục SKU vẫn phải đi
nhờ Kho vận nạp hộ danh mục của mình. Và máy chủ vẫn mở cửa (`batBuocNapDuLieu`
nhận cả tab `kinhdoanh`) → một cửa API mở mà không có màn nào dùng tới.

**Phải làm gì:** hoặc đặt màn nạp danh mục sang tab Kinh doanh, hoặc gọi
`khoiDongNapFile` độc lập khi `TOI.san_pham.sua` dù không có tab Kho vận —
nhưng lúc đó phải có chỗ đặt màn. Đây là **quyết định của Sếp** về việc màn
này thuộc tab nào; tôi chỉ nói nó chưa xong.

---

## VỪA-① — `nhan_vien_kho` **nạp hàng loạt được tồn kho** (câu chờ Sếp)

**File:dòng:** `src/quyen.js:169` (`nhan_vien_kho: { thao_tac: true }`) → `src/nap-du-lieu.js:593`

Bảng quyền đo được (`node scripts/ho-ly-rev0060.mjs`, mục D):

| vai trò | nạp danh mục | nạp tồn kho |
|---|---|---|
| `admin` | ✅ | ✅ |
| `quan_ly_kho` (anh Duy) | ✅ | ✅ |
| `van_hanh_san` (Kinh doanh) | ✅ | ❌ (đúng) |
| `ke_toan_truong` (chị Hằng) | ❌ | ❌ (đúng) |
| `nhan_vien_kho` | ❌ (đúng) | **✅ ⇐ chờ Sếp chốt** |
| `nguoi_dung` · `hcns` · `admin_backup` | ❌ | ❌ (đúng) |

Gọi thẳng API, không qua giao diện: `ke_toan_truong` → 403 ✅ ·
`nhan_vien_kho` nạp danh mục → 403 ✅ · `nhan_vien_kho` nạp **tồn kho** →
**cho qua**.

Về mặt logic thì nhất quán (`nhan_vien_kho` vốn đã lập được phiếu nhập/xuất
lẻ). Nhưng **nạp file khác về CHẤT với lập một phiếu**: một lần bấm là **20.000
dòng vào sổ cái**, và cộng với CHẶN-① (nạp lại là cộng dồn) thì 17 bạn
part-time ở kho đều có nút làm hỏng tồn của cả công ty mà không có đường lùi.

**Đây là quyết định nghiệp vụ, không phải quyết định kỹ thuật — xin ý Sếp
Ngọc.** Khuyến nghị của tôi: siết về `duocQuanLyKho` (chỉ anh Duy + admin) cho
đúng kênh báo cáo Nhân sự kho → anh Duy → Sếp.

---

## VỪA-② — File Excel dùng **hệ ngày 1904** đọc lệch **4 năm 1 ngày**, im lặng

**File:dòng:** `src/nap-du-lieu.js:138-150` (`docNgay`, mốc cứng 1899-12-30)

```
file khai <workbookPr date1904="1"/>, ô hạn dùng = 31/12/2026
ERP đọc ra: 2022-12-30      · cảnh báo: []
```

Excel có hai hệ mốc ngày. `src/doc-bang.js` đọc `xl/workbook.xml` rồi (`:328`)
nhưng **không đọc cờ `date1904`**. File xuất từ Excel bản Mac cũ, hoặc file do
đối tác gửi, rơi đúng vào ca này. Hạn sử dụng lô hàng lệch 4 năm với công ty
bán **thực phẩm** là kiểu sai đắt nhất — mà nó **không báo gì cả**.

Xác suất thấp (máy Sếp là Windows), hại thì cao. Vá rẻ: đọc thêm một cờ.

## VỪA-③ — Ô ngày Excel hiện ra **con số thô** ở bước Sếp đối chiếu bằng mắt

**File:dòng:** `src/nap-du-lieu.js:789` (`mau_dong`) · `public/assets/js/app.js` hàm `veMau`

Excel lưu `31/12/2026` thành số `46387`. `docNgay` **đổi đúng** (đã đo, ra
`2026-12-31` ✅ — chỗ này người xây làm chuẩn). Nhưng cái **mẫu dữ liệu** hiện
lên ở bước ghép cột — thứ mà cả màn hình được thiết kế quanh nó, để Sếp
*"phát hiện ghép nhầm NGAY TẠI CHỖ"* — lại in ra `"46387"`.

Sếp nhìn `Đọc thử: "46387"` ở dòng "Hạn sử dụng" thì không xác nhận được gì.
Cửa chặn bằng mắt người mất tác dụng đúng ở cột dễ sai nhất.

**Phải làm gì:** ở bước hiện mẫu, chạy giá trị qua đúng hàm đọc của kiểu ô
đang ghép rồi in ra cái người đọc hiểu: `Đọc thử: "46387" → 31/12/2026`.

## VỪA-④ — `.xlsx` quá 200 cột bị **cắt âm thầm**

**File:dòng:** `src/doc-bang.js:376` — `if (ci >= 0 && ci < TRAN_COT) { … }`

File 260 cột → ERP giữ 200, vứt 60, `canhBao = []`. Với CSV thì có chặn đàng
hoàng (`:466`, ném lỗi nói rõ). Với `.xlsx` thì cột thứ 201 trở đi biến mất
không dấu vết — **trái với chính lời hứa ở đầu file** (`:42`): *"chạm là dừng
và nói ra, không âm thầm cắt"*.

File Shopee thật 67 cột nên chưa cắn ai, nhưng cắt im lặng là kiểu hỏng phải
vá trước khi nó gặp file đúng cỡ.

---

## THẤP-① — File `.xlsx` **đặt mật khẩu** bị chẩn đoán nhầm thành ".xls đời 2003"

`src/doc-bang.js:75-78` + `:410-414`. File `.xlsx` có mật khẩu được gói trong
kho OLE2, byte đầu `D0 CF 11 E0` **giống hệt** `.xls` 2003. ERP nói:
*"Đây là file Excel định dạng cũ (.xls đời 2003)"* — sai chẩn đoán. Lời khuyên
kèm theo ("mở bằng Excel rồi lưu thành CSV") thì vẫn dùng được, nên hại thấp.
Vá rẻ: dò chuỗi `EncryptedPackage` trong thân, đổi câu thành *"File này đang
đặt mật khẩu — xin bỏ mật khẩu rồi gửi lại."*

## THẤP-② — Ô gộp (merged cell): dòng dưới trống, không nói là do ô gộp

`src/doc-bang.js` (`docXlsx` không đọc `<mergeCells>`). Đã đo: dòng dưới ô gộp
ra rỗng, và luật `batBuoc` **bắt được** với câu đúng dòng đúng cột
(*"Dòng 3, cột Tên sản phẩm: để trống — chỗ này bắt buộc phải có."*) — nên
không có số nào chạy êm vào sổ. Chỉ thiếu một câu nói cho người dùng biết
nguyên nhân là ô gộp.

## THẤP-③ — Trần 8 MB chặn đúng file báo cáo thật của Sếp

`src/doc-bang.js:50`. Các file `Income(...).xlsx` trên Desktop của Sếp nặng
**13,2 MB** (một file 125 MB) → bị chặn với câu lỗi đàng hoàng, đúng thiết kế.
Nhưng nếu sau này Sếp muốn nạp doanh thu từ đúng những file đó thì trần này
phải bàn lại. Ghi lại để không quên.

## THẤP-④ — Ghi chú của bàn đo mâu thuẫn với chính nó + mục "file thật" tự chấm rộng tay

`scripts/do-nap-file.mjs` đầu file viết: *"`--tu-kiem` … bàn đo PHẢI đỏ. Không
đỏ thì bàn đo này là đồ trang trí"*. Chạy thật thì nó **XANH** (`ĐẠT 91 · TRƯỢT 0`,
"bắt được 7/7 lỗi gài"). Cách làm thật **mạnh hơn** cách ghi chú mô tả, nhưng
người sau đọc ghi chú rồi thấy xanh sẽ tưởng bàn đo hỏng. Sửa ghi chú.

Và mục ⑨ "file thật" (`:350-372`) chỉ duyệt **tối đa 4 file** trong 3 thư mục,
điều kiện đạt là `daDoThat >= 2`. **Con số "9/9 file Excel thật" người xây khai
KHÔNG có bàn đo nào trong repo bảo vệ** — lần chạy sau chỉ cần 2 file là xanh.

---

## Đối chiếu LỜI KHAI với SỐ ĐO

| Lời khai | Đo lại | Kết |
|---|---|---|
| `do-nap-file` 91/0 | 91/0 | ✅ khớp |
| `do-nap-ghi` 42/0 | 42/0 | ✅ khớp |
| `do-bang-that` 75/0 | 75/0 | ✅ khớp (nhưng **không đo 1024px**) |
| `cong-khoi` XANH ×2 | XANH @1440 và @375 | ✅ khớp |
| `do-ba-mau` ĐẠT · `do-cat-im-lang` SẠCH · `do-chu-dai` XANH | y hệt | ✅ khớp |
| `do-moc-noi` 9/0 · `do-tach-vai-tro` 61/0 · `do-ghi-dongbo` 31/0 | y hệt | ✅ khớp |
| Lỗi ② số âm đã chặn | chặn, câu lỗi đúng dòng+cột+cách xử | ✅ đúng |
| Lỗi ③ giao diện/máy chủ chung một luật | luật trùng khít, 0 vai trò lệch | ✅ đúng… |
| …nên Kinh doanh thấy nút | **vẫn không vào được màn** | ❌ **CAO-④** |
| Lỗi ① lượt ghi vào sổ ngày ngay | vào thật, 3 lần nạp cộng dồn đúng | ✅ đúng |
| …chốt chặn hạn mức đã dùng được | **song song thì lọt hết → 140.000/100.000** | ❌ **CAO-①** |
| | **cron cùng isolate → đếm đôi** | ❌ **CAO-②** |
| 100 → 800 · 1.000 → 8.000 · 5.000 → 40.000 lượt ghi | tôi đo **700 / 7.000 / 35.000** trên `node:sqlite` | ⚠️ xem ghi chú |
| Con số ERP báo trước cao hơn số thật | quét **10 hình dạng file**, chưa ca nào báo hụt | ✅ đúng |
| Tải 3 lần không nhân đôi (797 dòng, 0 lượt ghi) | tái hiện được với `san_pham` | ✅ đúng |
| | **`ton_kho` thì NHÂN ĐÔI** | ❌ **CHẶN-①** |
| 9/9 file Excel thật đọc được | tôi đọc **17 file thật**, trót lọt 17 | ✅ đúng, và hơn thế |
| Shopee 3.027 dòng × 67 cột trong 135 ms | đo 3.392 dòng × 67 cột trong **168 ms** | ✅ cùng cỡ |
| SKU giữ số 0 đầu, dấu tiếng Việt nguyên | đúng | ✅ |
| `.xls` 2003 và PDF nói thẳng không đọc được | đúng — và `.xls` Shopee (thật ra là zip) **vẫn đọc được** nhờ dò byte | ✅ làm khéo |
| Trên 8 MB bị chặn | đúng, câu lỗi tử tế | ✅ |
| Hai file trên đường nạp không gọi AI/mạng | quét **cả cây phụ thuộc** (4 file: `nap-du-lieu` → `doc-bang` → `canh-bao-ghi` → `quyen`): **0 lời gọi** `fetch`/`AI`/`WebSocket`/nhà cung cấp mô hình | ✅ đúng |
| 11 ca file xấu có câu tiếng người | thử **7 ca nó chưa thử** (file trắng, JSON đổi đuôi, HTML, nhị phân, TCVN3, tiêu đề rỗng, một ô): **7/7 có câu tiếng Việt có dấu, nói cách xử lý** | ✅ đúng |

**Ghi chú về con số lượt ghi.** Bàn thử của tôi (`node:sqlite`, dựng từ đúng
`migrations/`) đo **7 lượt/dòng** cho `san_pham`, khớp bàn thử của người xây;
người xây khai đo **8 lượt/dòng** trên Worker + D1 thật (CSDL thật có thêm chỉ
mục). **Tôi không có đường tới D1 thật nên không xác minh được con số 8.**
Con số ERP dùng để chặn là **9/dòng**, tức là cao hơn cả hai — **an toàn theo
đúng hướng**. Nhưng chỗ này đang đứng trên một số đo mà repo không giữ lại
được: đề nghị ghi số đo Worker thật (ngày, cách đo) vào ghi chú cạnh `GIA_GHI`.

---

## Chỗ làm ĐÚNG, nói thẳng là đúng

1. **Đọc file là phần chắc tay nhất.** 17 file `.xlsx` thật của Sếp — Shopee
   67 cột, bảng lương, sơ đồ tổ chức, phân quyền Drive, nhập khẩu — đọc trót
   lọt hết, nhanh (3.392 dòng trong 168 ms). Dò **byte đầu** thay vì tin đuôi
   tên là quyết định đúng: file Shopee tên `.xls` thật ra là zip, đọc được.
2. **Không đoán cột.** Máy gợi ý, người chọn, rồi nhớ lại bằng vân tay cột.
   Đây là luật đúng và được giữ nghiêm.
3. **Câu lỗi thật sự bằng tiếng người.** Không một câu nào lộ chữ kỹ thuật;
   mọi câu có **số dòng**, câu kiểu số có **tên cột**, và nói cả cách xử:
   *"Dòng 2, cột Số lượng tồn: ghi "-8" — số này không được âm. Nếu cần giảm
   tồn thì lập phiếu Xuất kho, đừng ghi số âm vào file."* Chị Hằng và anh Duy
   đọc là hiểu.
4. **Đọc số kiểu Việt Nam** (`25.000` → 25000, không thành 25) và **ngày kiểu
   Việt Nam** (`12/09/2026` = 12 tháng 9) — đúng, có đo.
5. **`san_pham` chống nạp lại chuẩn**: 3 lần cùng file → vẫn 500 dòng, **0
   lượt ghi**, 0 dòng ghi vết thừa.
6. **429 chặn TRƯỚC khi ghi dòng đầu** (không phải chặn giữa chừng): đo được
   `san_pham = 0`, ghi vết `= 0`, sổ ngày không đổi.
7. **Tồn tính ra khớp tổng sổ cái**, mọi dòng cùng **một phiếu nhập**, có ghi
   vết phiếu — nghiệp vụ kho làm đúng lối "tồn luôn là tổng của sổ".
8. **Không đẻ bảng mới cho ghi vết** — dùng `lich_su_thay_doi_nen` sẵn có, và
   **mở luôn đường ĐỌC lại** (`SUA_BANG_HOP_LE` thêm `san_pham` ·
   `giao_dich_kho`, sửa `parseInt` cho mã chữ). Ghi vết có đủ: ai · file gì ·
   lúc nào. Bảng mới duy nhất là `nap_ghep_cot`, đúng mục đích, vài chục dòng
   cả đời.
9. **Ranh giới AI giữ sạch** trên cả cây phụ thuộc, không chỉ hai file.
10. **Chi phí 0** — không thêm gói nào; `.xlsx` bung bằng `DecompressionStream`
    có sẵn của Workers.
11. **Ba màu · 44px · vừa màn 375px**: màn nạp không viết cứng mã màu nào, đỏ
    chỉ dùng cho dòng lỗi, mọi nút/ô chọn `min-height: 44px`, **không thêm thẻ
    `<table>` nào** (cố ý, để khỏi đẻ thanh kéo ngang) — `do-bang-that` 75/0 và
    `cong-khoi @375px` XANH.

---

## Việc phải làm trước khi soi lại

| # | Mức | Việc |
|---|---|---|
| 1 | CHẶN | Chống nạp lại cho `ton_kho`: nhận ra file đã nạp (vân tay cột + tên file + số dòng) và **chặn/bắt xác nhận**, kèm đường **huỷ phiếu nhập** theo `phieu_id` |
| 2 | CHẶN | Nạp `ton_kho` ngã giữa chừng: câu lỗi phải nói đã ghi N/M dòng + đừng nạp lại + trả `phieu_id`; hoặc gom cả lần nạp vào một giao dịch |
| 3 | CAO | Đặt chỗ hạn mức ghi TRƯỚC khi ghi (nguyên tử), không đọc-rồi-quyết |
| 4 | CAO | `ghiThat`: bỏ `demGhi(kq)` hoặc `datLai(dangCho() - ghiThuc)` sau khi chốt sổ |
| 5 | CAO | `.xlsx` nhiều bảng: liệt kê tên bảng, cho Sếp CHỌN, tối thiểu là nói đang đọc bảng nào |
| 6 | CAO | Kinh doanh phải có đường vào màn nạp danh mục (**cần Sếp chốt màn này thuộc tab nào**) |
| 7 | VỪA | **Cần Sếp chốt**: `nhan_vien_kho` có được nạp hàng loạt tồn kho không? |
| 8 | VỪA | Đọc cờ `date1904` trong `xl/workbook.xml` |
| 9 | VỪA | Mẫu ở bước ghép cột phải hiện giá trị ĐÃ ĐỌC (`46387 → 31/12/2026`) |
| 10 | VỪA | `.xlsx` quá 200 cột: báo ra, đừng cắt im lặng |
| 11 | THẤP | Nhận ra `.xlsx` có mật khẩu, đừng gọi nó là ".xls 2003" |
| 12 | THẤP | Nói ra khi file có ô gộp |
| 13 | THẤP | Sửa ghi chú `--tu-kiem` ở đầu `do-nap-file.mjs`; mục "file thật" nên khoá danh sách file thay vì `>= 2` |
| 14 | THẤP | Ghi lại số đo lượt ghi trên Worker thật (ngày + cách đo) cạnh `GIA_GHI` |

---

## Bàn đo tôi để lại

- `scripts/ho-ly-rev0060.mjs` — 93 phép đo, 8 phần (hạn mức · `.xlsx` ·
  sổ cái kho · quyền · ghi vết · ranh giới AI · câu lỗi · giao diện).
  Đọc **11 file `.xlsx` thật** mà bàn đo của người xây chưa chạm.
  **CHỈ ĐỌC** file của Sếp — không sửa, không xoá, không di chuyển.
- `scripts/ho-ly-rev0060-b.mjs` — dựng lại bằng số 4 cảnh gây hại nhất:
  ba người nạp song song · tồn kho ngã giữa chừng rồi nạp lại · mã trùng ·
  Kinh doanh không có đường vào màn.

Cả hai chưa gắn vào `package.json` (tôi không sửa mã sản phẩm). Sau khi vá,
đề nghị đưa các ca A2/A3/C1/C4 vào `do-nap-ghi-d1.mjs` để không tái phát.
