# REV-0060 vòng 2 — Nạp file dữ liệu · soi bản vá

# ❌ FAIL — 2 CHẶN · 5 CAO · 3 THẤP

**Soi:** Hồ Ly · 07/09/2026 · nhánh `feature/nap-file-du-lieu` @ `239f983`
(worktree `agc-napfile`, không commit, không đụng mã sản phẩm)

**Sáu lỗi vòng 1 (2 CHẶN + 4 CAO) đã vá THẬT, đo lại đủ.** Lưới chống nạp lại
đứng vững trước cả bảy đường tấn công. Nhưng bản vá đẻ ra **mã mới xoá dữ liệu
thật** (`huyLuotNap`) và chính chỗ đó là chỗ hỏng nặng nhất: gỡ một lượt nạp
làm **tồn kho ÂM**, và **bất kỳ ai có quyền thao tác kho cũng gỡ được lượt nạp
của người khác**. Đây không phải "câu chờ Sếp" — đây là quyền năng MỚI mà người
xây tự trao, không ai hỏi Sếp.

Bàn đo vòng 2: `scripts/ho-ly-rev0060-c.mjs` (22 đạt / 8 trượt) ·
`-d.mjs` `-e.mjs` `-f.mjs` `-g.mjs` (đo từng ca riêng, có file thật).

---

## ⓪ Bàn đo vòng 1 còn nguyên không — CÓ

| Kiểm | Kết quả |
|---|---|
| `git diff --name-status ea3c81b..239f983 -- scripts/` | `ho-ly-rev0060.mjs` và `-b.mjs` là **A (thêm mới)** — người xây *commit* bàn đo của tôi vào bản vá, chúng chưa từng nằm trong `ea3c81b`, nên không có bản gốc trong repo để đối chiếu md5 |
| Chạy lại `ho-ly-rev0060` | **92 đạt / 1 trượt** — đúng con số vòng 1 |
| Chạy lại `ho-ly-rev0060-b` | ca ④ vẫn in ❌ — đúng vòng 1 |
| Đọc lại từng câu khẳng định | Không câu nào bị nới. Riêng ca ④ của `-b` **không thể** bị nới: câu kết chốt cứng `!coTab && duocSuaSanPham(p)`, không đọc mã sản phẩm, nên nó đỏ vĩnh viễn dù vá hay không |

**Hai bàn đo cũ bị sửa trong bản vá — cả hai đều SIẾT, không nới:**

- `scripts/do-nap-file.mjs` mục ⑨: bỏ lối *quét 3 thư mục, lấy 4 file, đạt khi
  ≥ 2* → thay bằng **danh sách file khoá cứng, đạt khi đọc trót lọt ĐỦ danh
  sách**, file nào mất thì **nói ra là ca đó mù** thay vì lặng lẽ vẫn xanh.
  Đúng lý do người xây khai: con số "9/9 file" cũ không bàn đo nào giữ.
- `scripts/do-nap-ghi-d1.mjs`: đổi chuỗi gài lỗi cho khớp mã mới
  (`if (dat.so_dong > HAN_MUC_NGAY - CHUA_LAI)`). Không đổi thì ca đó **mù** —
  và bàn đo báo "KHÔNG gài được" chứ không âm thầm tính là đạt. Siết.

---

## ① Ca đỏ còn lại của `ho-ly-rev0060` — **đúng là câu chờ Sếp, KHÔNG phải né lỗi**

Ca: `nhan_vien_kho` vẫn nạp hàng loạt được tồn kho.

Tôi chấp nhận đây là **chính sách**, không phải lỗi kỹ thuật, vì ba lẽ:
`quyen.js` cho `nhan_vien_kho` cờ `thao_tac: true` từ trước bản này; đường nạp
cắt theo đúng cờ đó nên **nhất quán**, không lệch giao diện/máy chủ; và
CHANGELOG đã nêu thẳng câu hỏi + khuyến nghị thay vì giấu.

**Tôi đồng ý với khuyến nghị siết về `duocQuanLyKho`.** Lý do thêm: tồn đầu kỳ
là việc làm **một lần** khi lấp kho, không phải việc hằng ngày; và nó đúng kênh
báo cáo Sếp đã chốt (nhân sự kho → anh Duy → Sếp Ngọc).

**⚠️ NHƯNG người xây đã lấy câu chờ này che cho một thứ khác.** `huyLuotNap` —
mã **XOÁ** dữ liệu, mới hoàn toàn (chính người xây ghi: trước bản này
`grep -c "DELETE FROM" src/kho.js` = **0**) — cũng chỉ kiểm `duocThaoTacKho`.
Chưa ai hỏi Sếp *"một bạn part-time có được xoá trắng 5.000 dòng sổ cái do Sếp
nạp không?"*. Đó là câu khác hẳn, và nó là CHẶN-② dưới đây.

---

## ② KẾT LUẬN VỀ LƯỚI CHỐNG NẠP LẠI — **LƯỚI ĐỨNG VỮNG**

### Chiều "lọt" — 7/7 đường tấn công đều bị chặn 409, tồn giữ nguyên 5.000

| Đường tấn công | Kết quả |
|---|---|
| Đổi **thứ tự dòng** (đảo ngược 50 dòng) | ✅ 409 |
| Đổi **hoa/thường** mã hàng (`SP-` → `sp-`) | ✅ 409 |
| Thêm **dòng trắng** khắp file | ✅ 409 |
| Đổi **tên file** (`Ton_goc (bản sao).csv`) | ✅ 409 |
| **Sửa một con số** rồi nạp lại cả file | ✅ 409 |
| Nạp **file con** (25/50 dòng cũ) | ✅ 409 |
| **Hai file khác hẳn** chung đúng 1 mã | ✅ 409 |

Lớp (a) vân tay nội dung có **sort** nên miễn nhiễm thứ tự; lớp (b) khớp theo
`san_pham_id` nên bắt được mọi ca vân tay đổi. Hai lớp bù nhau đúng như khai.

### Chiều "chặn oan" — không khoá chết

| Ca | Kết quả |
|---|---|
| Kho nhập **thật** cùng mã, Sếp tick xác nhận | ✅ nạp được, cộng **đúng** 5.000 → 6.500 |
| Nạp lại **sau khi đã gỡ** lượt cũ | ✅ không chặn oan, tồn ra đúng 5.000 |
| Hai nhóm mã khác hẳn nhau | ✅ nạp thẳng |
| Hai đợt hàng **cùng mã khác lô** (`LO-A` → `LO-B`, hạn khác) | ⚠️ vẫn 409 — xem CAO-⑤ |

### Nhưng có hai chỗ phải sửa (CAO-④ và CAO-⑤ bên dưới)

---

## ③ KẾT LUẬN VỀ ĐƯỜNG LÙI `huyLuotNap` — **KHÔNG AN TOÀN**

Ba cái đúng: **không** đụng phiếu nhập tay cùng ngày cùng mã (140 → 140); gỡ
lần hai → 409; gỡ phiếu tay → 404; vai không quyền kho → 403; lô dùng chung
được giữ lại. Nhưng ba cái sai dưới đây nặng hơn.

---

# 🔴 CHẶN

## CHẶN-① · Gỡ lượt nạp làm **TỒN KHO ÂM** — mà câu báo vẫn nói "đã tính lại theo sổ"

**Đo được** (`scripts/ho-ly-rev0060-d.mjs`, dùng đúng quy ước `so_luong` âm của `src/kho.js`):

```
tồn sau khi nạp file       : 2000
tồn sau khi xuất bán 80/mã : 400
tồn SAU KHI GỠ lượt nạp    : -1600      ← 20/20 mã âm
ERP nói với Sếp            : "Đã gỡ 20 dòng (2.000 đơn vị) ... Tồn kho đã tính lại theo sổ."
```

`src/kho.js:353` (`xuatKho`) **chặn cứng** tồn âm:
`"Tồn không đủ để xuất. \"{tên}\" chỉ còn {n} {đơn vị}."` — tức bất biến của cả
module kho là **tồn ≥ 0**. `huyLuotNap` xoá thẳng
`DELETE FROM giao_dich_kho WHERE phieu_id = ?` mà **không nhìn** những phiếu
XUẤT đã dựa vào lượt nhập đó, nên nó phá bất biến ấy **hồi tố**. Anh Duy mở sổ
cái thấy một trạng thái không thể xảy ra; báo cáo tồn, chuông tồn tối thiểu,
và mọi phép xuất sau đó đều sai theo.

Cảnh thật rất dễ xảy ra: nạp tồn đầu kỳ sáng thứ Hai → kho xuất hàng cả tuần →
thứ Sáu phát hiện file nạp nhầm → bấm "Gỡ lượt nạp". Nút này nằm sẵn ở bước 4
và trong danh sách "Lượt nạp gần đây".

**Sửa:** trước khi xoá, tính số dư từng mã sau khi gỡ. Mã nào âm thì **từ chối**
bằng câu tiếng người kê đích danh mã và số (*"Không gỡ được: 12 mã đã xuất hàng
dựa trên lượt nạp này (SP-00003 sẽ âm 80 túi...). Xin lập phiếu điều chỉnh
thay vì gỡ, hoặc gỡ các phiếu xuất trước."*). Không được để một cờ `force` âm
thầm — hoặc chặn, hoặc bắt Sếp đọc đúng danh sách mã sẽ âm.

## CHẶN-② · **Ai cũng gỡ được lượt nạp của người khác**

**Đo được** (`ho-ly-rev0060-c.mjs`, mục C-14):

```
Sếp Ngọc nạp TonDauKy_Sep.csv (30 mã, 3.000 đơn vị)
phiên vai nhan_vien_kho (NS-PT) gọi huyLuotNap → GỠ ĐƯỢC 30 dòng · tồn về 0
```

`src/nap-du-lieu.js:1082` chỉ có `if (!duocThaoTacKho(phien)) return 403`.
Không kiểm người nạp, không kiểm cấp quản lý, không hỏi lại. Cửa API
`POST /api/kho/nap-huy` cũng chỉ soi tab. Nghĩa là **17 bạn part-time ở kho**
mỗi người có một nút xoá trắng bất kỳ lượt nạp nào của bất kỳ ai — kể cả lượt
tồn đầu kỳ của cả công ty.

Đây **không** nằm trong câu chờ Sếp ①: câu ① hỏi *ai được NẠP*; đây là *ai
được XOÁ*. Xoá là chiều nguy hiểm hơn, và nó là mã mới của chính bản vá này.

**Sửa (Khỉ Đột tự quyết được, không cần chờ Sếp):** chỉ người **đã nạp** lượt
đó, hoặc người có `duocQuanLyKho` (anh Duy + Admin), mới gỡ được. Ghi vết đã có
sẵn `nguoi_id`/`nguoi_ten` trong `lich_su_thay_doi_nen` — đủ dữ liệu để so, chỉ
thiếu câu `if`.

---

# 🟠 CAO

## CAO-③ · Gỡ ngã giữa chừng để **sổ cái và ghi vết lệch nhau**, và ném lỗi máy trần trụi ra người dùng

**Đo được** (chặn lệnh `UPDATE lich_su_thay_doi_nen`):

```
lỗi ném ra          : Error: D1 network error        ← không phải LoiGhiNua, không tiếng Việt
dòng sổ cái còn     : 0                              ← dữ liệu ĐÃ XOÁ
vết vẫn ghi         : "20 dòng"                      ← chưa đánh dấu "đã gỡ"
gỡ lại lần nữa      : ok, gỡ 0 dòng                  ← báo THÀNH CÔNG mà không gỡ gì
```

Hai bệnh trong một:

1. `chay()` trong `huyLuotNap` (dòng 1108) **không có try/catch**, khác hẳn
   `donLaiKhiNga` (dòng 785) vốn nuốt lỗi từng lệnh và trả `sot[]`. Lỗi D1 đi
   thẳng ra ngoài, `index.js` không có gì để trả nguyên văn nên Sếp nhận một
   câu chung chung hoặc chuỗi tiếng Anh.
2. **Thứ tự ngược với chính nguyên tắc bản vá vừa đặt ra.** `ghiThat` được sửa
   để *"ghi vết phiếu đi TRƯỚC dữ liệu"* — đúng. `huyLuotNap` thì xoá dữ liệu
   **trước**, đánh dấu vết **sau**. Ngã ở giữa là hết đường tra: danh sách
   "Lượt nạp gần đây" hiện một lượt ma (0 dòng nhưng chưa "đã gỡ"), và lần gỡ
   thứ hai trả `ok` giả.

**Sửa:** đánh dấu `đã gỡ` **trước** khi xoá (hoặc bọc cả hai trong `batch()`),
và bọc từng lệnh như `donLaiKhiNga` để câu báo nói được *đã gỡ sạch* hay *còn
sót*.

## CAO-④ · **Chỗ đặt hạn mức RÒ** khi ngã ở bước ghi vết — giữ suốt ngày mà không ghi được dòng nào

**Đo được** (chặn `INSERT INTO lich_su_thay_doi_nen`):

```
sổ ngày 350 → 860       ← rò 510 lượt
dòng sổ cái             : 0
lỗi ném ra              : Error: D1 network error   (không phải LoiGhiNua)
```

Nguyên nhân ở `src/nap-du-lieu.js` ~dòng 985: lệnh ghi vết phiếu nằm **NGOÀI**
khối `try` bảo vệ vòng ghi:

```js
if (maDich === 'ton_kho' && doiChieu.them.length) {
  dem(await ghiVet.bind(...).run());     // ← ngoài try
}
let daChay = 0;
try { ... }                             // ← try bắt đầu ở đây
```

`datChoGhi` đã cộng dự tính vào `d1_ghi_ngay` trước đó. Mọi lỗi ném ra giữa
`datChoGhi` và `try` — dòng ghi vết này, hay bất kỳ `.bind()` nào lúc dựng
`lenh` — đều **thoát khỏi hàm mà không trả chỗ**. Con số dự tính bị giam tới
hết ngày, kéo hạn mức của đồng bộ sàn xuống theo. Đúng bệnh mà chính bản vá
CAO-③ sinh ra để chữa.

Các đường khác **đúng**: 429 trả chỗ sạch (sổ về 95.000); ghi ít hơn dự tính
trả lại phần thừa (dự tính 510 · thật 256 · sổ +256).

**Sửa:** `try/finally` quanh cả đoạn từ `datChoGhi` tới hết, `finally` trả phần
chưa chốt; hoặc đơn giản nhất là **kéo dòng ghi vết vào trong `try`**.

## CAO-⑤ · **Một cái tick tắt CẢ HAI lớp**, mà lớp (b) kêu ở mọi lần nhập hàng lại

`ghiThat` dòng 848: `const trung = xacNhanTrung ? null : await doTrungNapTon(...)`.
Một cờ `xacNhanTrung` duy nhất tắt **cả** lớp (a) *"đúng file này đã nạp rồi"*
lẫn lớp (b) *"mã này từng nạp từ file"*.

Vấn đề là lớp (b) kêu **mọi lần**: đo được ở mục B-9, hai đợt hàng **cùng mã
khác lô, khác hạn sử dụng** (`LO-A` → `LO-B`) vẫn bị 409. Kho Alpha Green nhập
lại cùng SKU hằng tuần, nên từ lần nhập thứ hai trở đi, lần nào cũng phải tick.
Tick vài lần là thành phản xạ — và ngày người ta thật sự nạp nhầm đúng file cũ,
tín hiệu mạnh nhất (lớp (a): *"đúng từng dòng từng con số"*) bị chính cái phản
xạ đó gạt qua.

**Sửa:** tách hai lớp thành **hai xác nhận riêng**. Lớp (a) — trùng nguyên
file — phải bắt gõ lại tên file hoặc bấm một nút khác hẳn, không dùng chung ô
tick với lớp (b). Hoặc thu hẹp lớp (b) theo thời gian (chỉ soi các lượt nạp
trong N ngày), để việc nhập hàng bình thường không kêu.

## CAO-⑥ · `LIMIT 50000` trong lớp (b) là **cắt im lặng trên một chốt chặn** — và lời khai lệch

`src/nap-du-lieu.js:625`:

```sql
SELECT DISTINCT san_pham_id, phieu_id FROM giao_dich_kho
 WHERE loai = 'nhap' AND ghi_chu LIKE 'Nạp từ file%' LIMIT 50000
```

Người xây khai **"trần 50.000 mã"**. Câu lệnh đếm **CẶP (mã × phiếu)**, không
đếm mã. Đo được (`ho-ly-rev0060-e.mjs`): kho chỉ có **60 mã** mà số cặp đã là
**55.000**, vì mỗi lượt nạp sinh một `phieu_id` mới. Cặp tăng theo **số lần
nạp**, không theo số mã: file 2.000 mã nạp 25 lần là chạm trần.

Ba cái sai cộng lại:
- **không `ORDER BY`** → hàng nào sống sót qua vạch cắt là **không xác định**;
- **không đếm tổng, không câu nào nói ra** khi chạm trần — chốt chặn tự mù đi
  mà giao diện vẫn hiện "không có gì bất thường";
- `do-cat-im-lang` **không soi file này** (nó quét các hàm trả *danh sách* ra
  trình duyệt), nên luật nhà về cắt im lặng bị lách đúng ở chỗ đắt nhất.

Tôi **chưa dựng được ca lọt** trong bàn đo (SQLite trả hàng theo thứ tự thuận
lợi), nhưng D1 không hứa thứ tự nào cả — và một chốt chặn tồn kho không được
dựa vào may.

**Sửa:** hỏi ngược lại theo **mã** chứ không theo cặp
(`SELECT DISTINCT san_pham_id ...`, kho vài nghìn mã thì trần rộng thênh
thang), và khi số hàng trả về chạm trần thì **nói ra**, đúng lối
`src/cat-danh-sach.js`.

## CAO-⑦ · `.xlsx`: **bảng ẨN** đọc mặc định không đánh dấu · **bảng đầu rỗng** ném câu lỗi cụt đường

Phần chọn bảng làm đúng và tôi đã đo lại trên file thật của Sếp — số của người
xây **khớp**: `Nhap_khau_hang_hoa.xlsx` 7 bảng, bảng 2 ra 25 cột × 304 dòng;
`TongHop_SanPham_Theo_SKU.xlsx` 2 bảng (797 + 0). Trùng tên bảng cũng phân biệt
được bằng số dòng. File 1 bảng **không** bắt chọn thừa. Nhưng:

**(a) Bảng ẩn.** `src/doc-bang.js:391` chỉ đọc `name` và `r:id` của thẻ
`<sheet>`, **bỏ qua `state="hidden"`**. Đo được:

```
dsBang : [{"ten":"Nháp cũ","so_dong":1},{"ten":"Chính thức","so_dong":2}]
đang đọc: Nháp cũ          ← bảng người ta CỐ Ý ẩn trong Excel
cảnh báo: "File có 2 bảng. ERP đang đọc bảng “Nháp cũ”..."
```

Bảng bị ẩn đúng là bảng người ta không muốn ai đọc — thường là bản nháp cũ, số
sai. ERP đọc nó mặc định và không có một chữ nào nói nó đang ẩn.
**Sửa:** đọc `state`, không lấy bảng ẩn làm mặc định, và ghi `(đang ẩn)` cạnh
tên trong danh sách chọn.

**(b) Bảng đầu rỗng.** Đo được:

```
File có bảng 1 "Trống" (0 dòng) + bảng 2 "Số liệu" (có dữ liệu)
→ ném: "File không có dòng nào có dữ liệu — mở lại bằng Excel xem có đúng file cần nạp không."
```

Câu này **chỉ sai đường**: file đúng, chỉ là bảng khác. Đây không phải ca giả
định — `TongHop_SanPham_Theo_SKU.xlsx` của Sếp có `Sheet1` **0 dòng**; đảo thứ
tự bảng là cả lần nạp cụt đường.
**Sửa:** khi bảng đang đọc rỗng mà file còn bảng khác có dòng, câu lỗi phải kê
tên các bảng đó ra.

---

# 🟡 THẤP

**THẤP-⑧ · Gợi ý ghép cột sai một cách tự tin trên file Shopee thật.**
Đo trên `Order.cancelled.20260701_20260801_part_1_of_3.xlsx` (67 cột) —
`goiYGhep(..., 'san_pham')` trả `{"ten":16,"danh_muc":7,"don_vi":8}`, tức
`Nhóm hàng ← "Loại xử lý đơn hàng"` và `Đơn vị tính ← "Đơn Vị Vận Chuyển"`
(tên hãng vận chuyển!). Giao diện **chọn sẵn** các gợi ý này
(`app.js:9581 selected`), và `nhoGhep` sẽ **nhớ** lại nếu Sếp bấm qua. Cửa chặn
duy nhất là ô "đọc thử" bên cạnh — nó có chạy và hiện đúng giá trị, nên chưa
lên CAO. Nhưng nên **bỏ gợi ý khi độ khớp yếu** thay vì đoán bừa: `ma_sku` đã
đúng lối đó (không gợi ý gì), `don_vi` thì không.

**THẤP-⑨ · Chỉ `ban-nap-file.mjs` chặn `window.confirm`.** Không bàn đo trình
duyệt nào khác trong `scripts/` gắn bẫy hộp thoại, trong khi `app.js` có **37**
chỗ gọi `confirm(`. Bàn đo tương lai nào bấm trúng một nút như thế sẽ **treo
Chrome tới hết giờ chờ rồi mới đỏ**, chứ không đỏ ngay — đúng cảnh người xây tự
khai. Nên đưa `window.confirm = () => true` vào **lớp dùng chung** của các bàn
đo trình duyệt, không để mỗi bàn đo tự nhớ.

**THẤP-⑩ · Nút "Nạp từ file" cắm vào `#kdSeg` nhưng listener chỉ gắn khi có tab
`kinhdoanh`** (`app.js:5936`). Hôm nay không vai nào rơi vào (vai duy nhất
không có `khovan` mà có `san_pham.sua` là `van_hanh_san`, và nó có
`kinhdoanh`), nhưng thêm một vị trí công việc mới là có nút chết. Nên bỏ nút
nếu không tìm thấy `#kdSeg`.

---

## ⑥ Màn tự dời theo người dùng — **không sinh bệnh như tôi lo**

| Câu hỏi | Đo được |
|---|---|
| Người có **cả hai** tab thì màn nằm đâu? | Trong Kho vận. Nhánh dời chỉ chạy khi `!TOI.quyen.includes('khovan')` |
| Có **hai bản** không? | Không — `appendChild` là **DỜI** node, `#kd-pane-napfile` rỗng khi không dời |
| Đổi vai giữa phiên? | Không xảy ra — quyền lấy một lần từ `/api/toi-la-ai` lúc tải trang |
| Nút/liên kết trỏ vào màn còn đúng chỗ? | Còn. Listener uỷ quyền gắn trên **chính** `#kv-pane-napfile` (`app.js:9852`) nên đi theo node khi dời; `#kdSeg` đã kê sẵn khoá `napfile` |
| Đo thật trên trình duyệt | `ban-nap-file --kinh-doanh` **15/0 XANH** @1440 và @375 |

## ⑦ Ba ca người xây tự khai — xác nhận từng cái

**(1) Trần lời gọi con — đúng, nhưng khai lệch một chỗ.** Dò trùng nay là MỘT
câu, không còn 223 câu. Nhưng *"trần 50.000 mã"* là sai (xem CAO-⑥), và **file
trên 50.000 mã không tồn tại được**: `TRAN_DONG = 20.000`, đo thử file 25.000
dòng thì ERP từ chối bằng câu tiếng người *"File có nhiều hơn 20.000 dòng —
vượt sức xử lý một lần. Xin chia nhỏ file rồi nạp làm nhiều lần."* — không cắt
im lặng. Ở mức trần 20.000 dòng, một lần nạp vẫn tiêu **~850 lời gọi con**
(223 đối chiếu ở xem trước + 223 ở ghi thật + 400 lô ghi + ghi vết) — **85%**
trần 1.000, và **không bàn đo nào đo con số này**. Còn mỏng.

**(2) Bàn đo tự bắt lỗ thủng của chính nó — đúng, đã vá.** `do-nap-lai` mục ③c
nay khẳng định *sổ ngày = ĐÚNG tổng lượt ghi thật* (1.400 = 1.400), không còn
"> 0". `--tu-kiem` gài lại lỗi cũ và **bắt 11/11**.

**(3) `window.confirm` — đúng, và còn sót.** Xem THẤP-⑨.

## ⑧ Ca ④ của `ho-ly-rev0060-b.mjs` — **bàn đo CỦA TÔI sai, bản vá đã xong**

Người xây nói đúng. Ca ④ kết luận bằng `!coTab && q.duocSuaSanPham(p)` — hai
giá trị **không hề đọc bản vá**, nên nó đỏ vĩnh viễn. Hai dòng "bằng chứng" in
kèm cũng đã hỏng: `mMoi` khớp chuỗi
`if (TOI.quyen.includes('khovan')) { try { await khoiDongKho()` — khối đó vẫn
tồn tại và mãi tồn tại, mà nó **chưa từng nhắc `khoiDongNapFile`**;
`paneTrongKhovan` soi vị trí trong **mã nguồn HTML**, trong khi việc dời xảy ra
**lúc chạy**.

Sự thật đo được: `khoiDongNapFile` nay được gọi ở khối khởi động chung
(`app.js:7453-7460`), `khoiDongKho` **không còn** gọi nó, và
`ban-nap-file --kinh-doanh` đi trọn 4 bước với vai `van_hanh_san`.
**Ca ④ của `-b.mjs` nên bỏ đi** — nó đã được thay bằng 10 phép đo thật trong
`do-nap-lai` mục ⑥.

## ⑨ Chạy lại hết cổng — **mọi con số khai đều khớp**

| Cổng | Khai | Đo lại |
|---|---|---|
| `do-nap-file` | 89/0 | **89/0** ✅ |
| `do-nap-ghi` | 42/0 | **42/0** ✅ |
| `do-nap-lai` | 87/0 · tự kiểm 11/11 | **87/0 · 11/11** ✅ |
| `ban-nap-file` | XANH 4 lượt | **23/0 @1440 · 23/0 @375 · 15/0 KD@1440 · 15/0 KD@375** ✅ |
| `ho-ly-rev0060` | 92/1 | **92/1** ✅ |
| `ho-ly-rev0060-b` | ca ④ đỏ | ca ④ đỏ (bàn đo cũ sai — mục ⑧) |
| cổng khói | XANH ×2 | **XANH @1440 · XANH @375** ✅ |
| `do-bang-that` | 75/0 | **75/0** ✅ |
| `do-ba-mau` | ĐẠT | **ĐẠT** (đối chứng 12/12) ✅ |
| `do-cat-im-lang` | SẠCH | **SẠCH** ✅ *(nhưng không soi `nap-du-lieu.js` — CAO-⑥)* |
| `do-chu-dai` | XANH | **XANH** ✅ |
| `do-moc-noi` | 9/0 | **9/0** ✅ |
| `do-tach-vai-tro` | 61/0 | **61/0** ✅ |
| `do-ghi-dongbo` | 31/0 | **31/0** ✅ |
| **`ho-ly-rev0060-c` (mới, vòng 2)** | — | **22 đạt / 8 trượt** ❌ |

**Nợ có sẵn, KHÔNG nhận về bản này:** `do-bang-that` đo `[1440, 1280, 375]`
(`scripts/do-bang-that.mjs:69`) — **không có 1024px**. Nợ cũ, không phải nhánh này.

*Ghi chú kỹ thuật:* chạy `do-bang-that` **song song** với một bàn đo trình duyệt
khác thì nó ra **74/1** (một ca đo hụt do hai Chrome tranh nhau máy). Chạy một
mình thì **75/0**, lặp lại được. Không phải lỗi của mã, nhưng các bàn đo trình
duyệt **không chạy song song được** — nên ghi ra đây để lần sau khỏi mất công
truy một ca đỏ ma.

## Luật của nhà

| Luật | Kết quả |
|---|---|
| Ba màu | ✅ ĐẠT — không có họ màu thứ tư, không token ma |
| Vừa một màn @375px *(Sếp nhắc hai lần)* | ✅ cổng khói 375 XANH · `ban-nap-file` @375 ×2 XANH, `{"body":0,"pane":0}` — 0 thanh kéo ngang |
| Chạm ≥ 44px | ✅ `.nap-nut button` · `.nap-ghep-dong select` · `.nap-luot-dong button` đều `min-height: 44px` |
| Chi phí 0 | ✅ `package.json` `devDependencies` chỉ có `wrangler` — **0 gói mới** |
| 0 migration | ✅ **đúng cho bản vá** (`ea3c81b..239f983` không đụng `migrations/`). ⚠️ Nhưng **cả nhánh** vẫn ship 1 migration: `migrations/them-nap-ghep-cot.sql` (bảng `nap_ghep_cot`) từ commit trước — CHANGELOG có khai kèm lệnh `node scripts/chay-migration.mjs them-nap-ghep-cot.sql --remote`. **Không được quên khi deploy** |
| Tiếng Việt có dấu, câu lỗi tiếng người | ⚠️ đúng ở mọi đường thường, **sai ở hai đường ngã**: `Error: D1 network error` lọt ra ở CAO-③ và CAO-④ |

---

## Việc phải làm để PASS

1. **CHẶN-①** — `huyLuotNap` kiểm số dư từng mã trước khi xoá, từ chối nếu có mã sẽ âm, kê tên mã ra.
2. **CHẶN-②** — chỉ người đã nạp lượt đó, hoặc `duocQuanLyKho`, mới gỡ được.
3. **CAO-③** — đánh dấu `đã gỡ` trước khi xoá; bọc từng lệnh gỡ như `donLaiKhiNga`; ném `LoiGhiNua` tiếng Việt.
4. **CAO-④** — kéo dòng ghi vết vào trong `try`, hoặc `try/finally` trả chỗ đã đặt.
5. **CAO-⑤** — tách xác nhận lớp (a) khỏi lớp (b).
6. **CAO-⑥** — dò trùng theo **mã**, và nói ra khi chạm trần.
7. **CAO-⑦** — đọc `state="hidden"`; câu lỗi bảng rỗng phải chỉ sang bảng có số liệu.
8. Thêm ca cho các lỗi trên vào `do-nap-lai`, kèm `--tu-kiem` gài ngược.

Ba mục THẤP để sau cũng được, nhưng **THẤP-⑨** nên làm cùng lúc vì nó bảo vệ
mọi bàn đo trình duyệt về sau.

---

## Bàn đo vòng 2 (mới, chưa commit — nằm trong worktree `agc-napfile`)

| Tệp | Đo gì |
|---|---|
| `scripts/ho-ly-rev0060-c.mjs` | 30 ca: 7 đường lọt · 4 chặn oan · 5 ca đường lùi · 2 ca hạn mức · trần lớp (b) · 4 ca `.xlsx` xấu |
| `scripts/ho-ly-rev0060-d.mjs` | CHẶN-① với đúng quy ước `so_luong` âm của `kho.js`; bảng ẩn/rỗng/trùng tên với `demDong: true` |
| `scripts/ho-ly-rev0060-e.mjs` | Trần 50.000 của lớp (b): dựng 55.000 cặp trên kho 60 mã |
| `scripts/ho-ly-rev0060-f.mjs` | File 25.000 dòng — kiểm có cắt im lặng không (không) |
| `scripts/ho-ly-rev0060-g.mjs` | 6 file `.xlsx` **thật** trên máy Sếp mà bàn đo cũ chưa thử — **CHỈ ĐỌC** |
