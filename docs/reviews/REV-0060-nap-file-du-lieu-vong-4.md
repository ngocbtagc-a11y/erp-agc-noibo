# REV-0060 · vòng 4 — Nạp file dữ liệu vào ERP

# ❌ FAIL — 3 CHẶN · 4 CAO · 5 THẤP

Soi bởi **HỒ LY** · 07/09/2026 · nhánh `feature/nap-file-du-lieu` @ `ba70d68`
(`main` = `3e0db1f`).

Vòng 3 vá đúng **cả hai CHẶN và cả bốn CAO** tôi nêu — tôi dựng lại từng cảnh,
đo qua đúng cửa ERP, và **mọi con số cổng người xây khai đều khớp tuyệt đối,
không một chỗ lệch**. Nhưng bản vá CHẶN-ⓑ đẻ ra một tính năng mới ghi thẳng
vào sổ cái kho, và chính tính năng ấy **mở lại đúng cái lỗ thủng mà CHẶN-ⓐ
sinh ra để bịt**. Cộng thêm một lỗ có từ đầu nhánh mà chưa vòng nào bắt.

Ba CHẶN đều **đo được qua đường ngón tay thật trên trình duyệt @375px**, đều
trả **HTTP 200 kèm một câu báo THÀNH CÔNG**, và đều để lại một con số SAI trong
sổ cái. Không cái nào là suy đoán.

Bàn đo của vòng này: `scripts/ho-ly-rev0060-h.mjs` (số học · hai luật cứng ·
quyền · ghi vết · đồng thời), `-i.mjs` (dựng lại ⓐ + soi ③ ④ hai chiều),
`-k.mjs` (màn Điều chỉnh trên trình duyệt @375px). **Chưa đăng ký vào
`package.json`** — người xây đăng ký sau khi vá, để chúng thành cổng thật.

---

## 0. Trả lời ba câu được hỏi thẳng

### A. `dieuChinhKho` có an toàn để ghi sổ cái thật không? → **CHƯA. Còn ba chỗ.**

**Đã đúng, đo được:**

| Soi | Số đo |
|---|---|
| Quyền, gọi **thẳng** API 11 vai | `admin` 200 · `quan_ly_kho` 200 · `nhan_vien_kho` **403** · `van_hanh_san` **403** · `ke_toan_truong` **403** · `nguoi_dung` **403** · `admin_backup` **403** · `hcns` **403** · `cskh` **403** · `nv_test` **403** · không vai/vai lạ **403**. Vai kép `nguoi_dung + quan_ly_kho` 200; `+ nhan_vien_kho` 403. Chặn kép (cửa ngoài `batBuocXemKho`, ruột `duocQuanLyKho`) — kín. |
| Dấu trừ | `ton_thuc: -5` (chuỗi **và** số) → **400**, câu từ chối nói đúng cách làm. Lỗi bàn đo vòng 3 tự bắt đã vá thật. |
| Số học | lô âm −100 → 0 ✅ · tồn 0 → 12 ✅ · lô HSD `NULL` 40 → 7 ✅ · mã không lô 30 → 25 ✅ · bằng đúng số đang ghi → 400 "không có gì để điều chỉnh" ✅ |
| Bắt buộc lý do | < 5 ký tự → 400 · toàn dấu cách → 400 |
| Ghi vết | `nguoi_id` · `luc` · `ghi_chu` có trước/sau + lý do · đọc lại được qua `lichSu()` (trả `nguoi: "Bùi Thị Ngọc"`) · báo cáo XNT hiện `dieu_chinh: -12` **ngay, không cần migration** |
| Lượt ghi D1 | Lời khai **ĐÚNG** — xem mục C-④ |

**Chưa an toàn vì:** CHẶN-① (mất luật "bắt chọn lô"), CHẶN-② (không có khoá
đồng thời), CAO-① (ô số không có bờ). **Cả ba cùng một hình dạng: ghi một con
số SAI vào sổ cái, trả HTTP 200, in ra một câu chúc mừng.** Vá ba chỗ đó thì
hàm này an toàn — kiến trúc của nó (nhập tồn thật, máy tính chênh) là đúng.

### B. Làm THẬT phiếu điều chỉnh thay vì hạ câu báo — đúng hay lấn phạm vi? → **ĐÚNG. Không lấn.**

Ba lý do người xây đưa, tôi đo lại và cả ba đứng vững:

1. **Hạ câu báo thì Sếp kẹt thật.** `grep -c "DELETE FROM" src/kho.js` = 0 —
   ERP không gỡ được một phiếu xuất. Nạp nhầm + đã bán = không còn cửa nào
   ngoài mở D1 sửa tay, đúng cái việc REV-0060 sinh ra để xoá bỏ.
2. **Không phải mã đầu cơ.** `giao_dich_kho.loai` là `TEXT NOT NULL` **không
   CHECK constraint** (`migrations/them-kho.sql:39`), và `baoCaoXNT` đã có sẵn
   cột `dieu_chinh` từ ngày đầu. Đo: phiếu đầu tiên vào sổ, báo cáo hiện
   `dieu_chinh: -12` ngay — **0 migration mới** là thật.
3. **Nó là thứ duy nhất sửa được lô âm dữ liệu cũ.** Đo: lô −100 → 0, HTTP 200.

Phạm vi cũng đúng mực: một hàm, một tuyến, một màn, 0 gói mới, không đụng
nghiệp vụ khác. Cái giá phải trả là **mã mới chưa ai dùng thật** — và đúng
chỗ đó là nơi cả ba lỗi CHẶN/CAO nằm. **Giữ quyết định, vá ba chỗ. Đừng lùi
về hạ câu báo.**

### C. Lời khai lệch số đo

| # | Lời khai | Số đo |
|---|---|---|
| ① | `kho.js:448-450` "với hàng có lô thì **BẮT** chọn lô" | **KHÔNG có dòng nào bắt.** `sp.theo_doi_hsd` được `SELECT` ở dòng 423 rồi không dùng lần nào. Client cũng không: `<select id="kvDcLo">` không có `required`. → CHẶN-① |
| ② | `kho.js:405-406` luật cứng "tồn của MÃ **và** của LÔ đều phải ≥ 0" | Chỉ kiểm khi có `lo_hang_id`. Không lô ⇒ không kiểm lô nào. Và **hai người bấm cùng lúc thì phá sạch**: lô = −100. → CHẶN-①/② |
| ③ | `nap-du-lieu.js:1450` "Hỏng về phía AN TOÀN… ai bấm lại một mình cũng gỡ được" | ĐÚNG ở nhánh `DELETE` ngã (đo: 503 · dấu trả về · bấm lại gỡ được). **SAI** ở nhánh chính lệnh trả-dấu ngã: dấu kẹt "đã gỡ" vĩnh viễn, bấm lại → 409, dòng vẫn nằm trong sổ cái. → CAO-② |
| ④ | "Phiếu điều chỉnh không đi qua bộ đếm hạn mức, giống hệt `nhapKho`/`xuatKho`, **không đẻ thêm nợ mới**" | **ĐÚNG — không phải nợ cũ nhân bản.** `canh-bao-ghi.js:19-21` khai thẳng "lượt ghi do người dùng bấm tay KHÔNG nằm trong con số này"; `demGhi` chỉ được gọi ở luồng đồng bộ sàn + nhịp tim chat; nạp file dùng đường `datChoGhi`/`traLaiCho` riêng. Phiếu điều chỉnh = **1 dòng cho mỗi lần một người bấm nút** — cùng bậc với `nhapKho`, dưới xa mức đáng quan tâm của hạn mức 100.000/ngày. Không vá. |
| ⑤ | Toàn bộ con số cổng | **Khớp tuyệt đối, 0 chỗ lệch.** Bảng ở mục 4. |

---

## 1. CHẶN

### CHẶN-① `dieuChinhKho` cho sửa ở MỨC MÃ trên hàng theo lô — mở lại đúng lỗ thủng CHẶN-ⓐ, qua chính cái cửa dựng ra để vá nó

**Ba lớp cùng hứa, không lớp nào giữ.**

* Máy chủ: `kho.js:448-450` viết *"với hàng có lô thì BẮT chọn lô"*. Không có
  câu lệnh nào bắt. `sp.theo_doi_hsd` lấy ra ở dòng 423 rồi bỏ không dùng.
* HTML: `<label for="kvDcLo">Lô hàng *</label>` — dấu sao = bắt buộc. `<select>`
  **không** có `required`.
* Lời nhắc ngay dưới ô, nguyên văn: *"Mã theo dõi hạn sử dụng thì tồn nằm ở
  từng lô — sửa ở mức mã sẽ để lại lô âm mà màn Xuất kho không nhìn thấy."*
  Nói đúng hậu quả rồi để nó xảy ra.
* `app.js`: `lo_hang_id: $('#kvDcLo').value || null` — bỏ trống là gửi `null`.

**Đo trên trình duyệt @375px, đúng đường ngón tay anh Duy** (`ho-ly-rev0060-k.mjs`):

```
dựng (di chứng CHẶN-ⓐ): lô A = −100 · lô B = 200 · tồn mã = 100
bấm tab Điều chỉnh → chọn “Hạnh nhân Mỹ 500g” → ô lô hiện ra, ĐỂ NGUYÊN ""
gõ 200 · lý do "kiểm kê 07/09: đếm ngoài kho được 200 túi" · bấm Lập phiếu

  màn báo : ✓ Đã lập phiếu điều chỉnh pd_e98a26cb-ff8: “Hạnh nhân Mỹ 500g”
            từ 100 về 200 túi (+100). Lý do đã ghi vào sổ cái.
  sổ cái  : lô A = −100  ·  lô B = 200  ·  tồn mã = 200
  xuatKho(200) ngay sau đó → HTTP 200 ⇒ tồn mã = 0 · LÔ A VẪN −100
```

Anh Duy vừa "sửa" xong, ERP chúc mừng, và cái lô âm vẫn nằm nguyên — đúng
trạng thái mà CHẶN-ⓐ tồn tại để cấm, chỉ khác là nay nó đến **sau một cái nút
có tên là "Điều chỉnh"**, nên còn khó truy hơn.

**Chiều ngược lại còn dựng ra tồn ma:**

```
lô duy nhất = 10 · điều chỉnh MỨC MÃ 10 → 500 · HTTP 200
  màn Kho vận hiện tồn : 500
  báo cáo XNT tồn cuối : 500
  xuatKho(100)         : HTTP 400 “Tồn không đủ để xuất. chỉ còn 10 túi.”
```

490 túi tồn ma trên màn, trên báo cáo, trong giá trị tồn kho — không lấy ra
được một cái nào.

**Cách vá.** Trong `dieuChinhKho`: `if (sp.theo_doi_hsd && !loId) return loi(…)`
— câu từ chối kê ra danh sách lô để chọn, kèm số dư từng lô (kể cả lô âm).
Và thêm `required` cho `#kvDcLo` để người dùng không phải ăn 400 mới biết.

### CHẶN-② Hai phiếu điều chỉnh cùng lúc trên MỘT lô → lô âm

`dieuChinhKho` đọc số dư (`kho.js:462`) rồi mới `INSERT` (`kho.js:488`) ở một
lượt `await` khác. Không giao dịch, không khoá, không kiểm lại sau khi ghi.

```
dựng: lô A = 100
hai lượt dieuChinhKho(lo_hang_id: 'lo_a', ton_thuc: 0) chạy song song
  → HTTP 200 / HTTP 200 · hai dòng loai='dieu_chinh', mỗi dòng −100
  → LÔ A = −100 · TỒN MÃ = −100        ❗
```

Đây là **cùng một lớp lỗi mà CAO-④ vừa vá ở `huyLuotNap` trong chính đợt này**
— người xây biết cách làm (`UPDATE … AND gia_tri_moi <> 'đã gỡ'`, so-và-đặt
nguyên tử của D1) nhưng không đem sang cái cửa nguy hiểm hơn.

Kho chỉ có anh Duy + Admin nên xác suất không cao — **nhưng kiểm kê cuối tháng
chính là lúc hai người cùng ngồi sửa cùng một mã**, và bất biến `TỒN ≥ 0` là
thứ không được phép hỏng theo xác suất.

**Cách vá.** Không cần khoá: ghi bằng một câu có điều kiện, kiểu
`INSERT … SELECT … WHERE (SELECT COALESCE(SUM(so_luong),0) FROM giao_dich_kho
WHERE lo_hang_id = ?) = ?` (số dư đọc lúc nãy) rồi soi `meta.changes`; 0 dòng
= có người vừa sửa trước ⇒ 409 "số dư vừa đổi, xin xem lại rồi lập lại".

### CHẶN-③ Nạp TỒN ĐẦU KỲ bằng file không có cột "Số lô" ⇒ toàn bộ tồn vừa nạp là TỒN CHẾT

Không thuộc bản vá vòng 3 — **lỗi có từ đầu nhánh** (`670b236`) và chưa vòng
nào bắt. Nhưng "xong thì đẩy" nghĩa là nó lên bản thật, nên nó là CHẶN của
vòng này.

Hai mắt xích:

* `nap-du-lieu.js:1064` — nạp danh mục mà file **không có** cột "Theo dõi hạn
  dùng" ⇒ `theo_doi_hsd = 1` (mặc định).
* `nap-du-lieu.js:1102` — nạp tồn chỉ tạo lô khi file **có** `so_lo` hoặc
  `han_su_dung`. Không có ⇒ dòng sổ cái `lo_hang_id = NULL`.

Nhưng `xuatKho` với `theo_doi_hsd = 1` **chỉ xuất theo LÔ** (`kho.js:341-354`).
Tồn không gắn lô thì nó không nhìn thấy.

**Đo, đúng đường Sếp đi** (file `Mã SKU,Số lượng tồn` — dạng file khả dĩ nhất):

```
nạp danh mục 3 mã (không có cột Theo dõi hạn dùng) ⇒ theo_doi_hsd = 1,1,1
màn XEM TRƯỚC cảnh báo   : []            ← không một chữ nào
nạp tồn 500/mã           : ok, phiếu pn_1f78df09-b5a
sổ cái                   : 3 dòng lo_hang_id NULL · 0 lô

MÀN KHO VẬN hiện tồn     : SP-00001=500 · SP-00002=500 · SP-00003=500
báo cáo XNT tồn cuối     : 500 · 500 · 500
ô chọn lô ở màn Xuất kho : []
anh Duy XUẤT 1 túi       : HTTP 400 “Tồn không đủ để xuất. chỉ còn 0 túi.”
```

Sếp nạp xong, mở màn ra thấy đủ 500, báo cáo đủ 500, rồi kho không xuất được
một túi nào và câu lỗi bảo "chỉ còn 0". Đây đúng là việc mà REV-0060 sinh ra
để làm — chuyển tồn từ HKĐ lên công ty.

Và **`dieuChinhKho` cũng không cứu được**: sửa ở mức mã không sinh ra lô nào
(CHẶN-①), nên tồn vẫn chết.

**Cách vá — chọn một, đừng làm cả hai nửa vời:**
* (a) Mã `theo_doi_hsd = 1` mà dòng tồn không có `so_lo`/`han_su_dung` thì
  `ghiThat` vẫn **tạo một lô** (như `nhapKho` vẫn làm: `kho.js:300-305` luôn
  tạo lô), `so_lo = NULL`, `han_su_dung = NULL`. Rẻ nhất, khớp với cửa nhập tay.
* (b) Hoặc `xemTruoc` **chặn** và nói ra: "N mã trong file này theo dõi hạn
  dùng nhưng file không có cột Số lô / Hạn sử dụng — nạp vào là tồn không xuất
  được. Xin bổ sung cột, hoặc bỏ theo dõi hạn dùng cho các mã đó."

Tôi nghiêng về **(a) + một câu cảnh báo ở xem trước**: nó khớp đúng hành vi của
`nhapKho` bên cạnh, và không bắt Sếp sửa file.

---

## 2. CAO

### CAO-① Ô "Số tồn THẬT đếm được" nuốt dấu chấm/phẩy, và không có bờ trên

`kho.js:432` — `.replace(/[.\s,]/g, '')`. Định để nhận "1.000" kiểu Việt Nam,
nhưng nó nuốt luôn dấu thập phân.

**Đo trên trình duyệt, mã bán theo KG** (Alpha Green bán nông sản khô — hạt
điều xá, hạnh nhân xá đều tính kg):

```
sổ đang ghi 20 kg · anh Duy cân lại được 12,5 kg · gõ "12.5" · bấm
  → ✓ Đã lập phiếu điều chỉnh pd_3ec10f4a-01f: “Hạt điều rang muối (xá)”
    từ 20 về 125 kg (+105). Lý do đã ghi vào sổ cái.
  → SỔ CÁI GHI: 125 kg                              ❗ sai gấp 10
```

Cả họ: `5.7` → 57 · `0,5` → 5 · `5.7` (kiểu số) → 57 · `["7"]` → 7.

**Và không có trần trên:**

```
ton_thuc "99999999999999999999" → HTTP 200
  cột so_luong (khai INTEGER) lưu 1e20, typeof(SQLite) = 'real'
  màn Kho vận: ton = 100000000000000000000 · trạng thái = binh_thuong
ton_thuc "9007199254740993"     → lưu 9007199254740992   (lệch 1, quá MAX_SAFE_INTEGER)
```

**Chính lời bình ngay trên đoạn mã ấy** (`kho.js:428-431`) giải thích rằng lý
do KHÔNG strip là để `-5` không lặng lẽ thành `5` — *"ra một con số hoàn toàn
khác mà không ai nhìn ra"*. Dấu trừ đã vá thật ✅. Dấu chấm và trần trên thì
chưa, dù hậu quả y hệt.

**Trung thực về phạm vi:** `soNguyenDuong` của `nhapKho`/`xuatKho` có đúng lỗ
này (`12.5` → 125, không trần) — lỗi cũ của cả module kho, **không tính vào
đợt này**. Nhưng `dieuChinhKho` là cửa **duy nhất** ghi thẳng một con số vào sổ
cái mà không có chứng từ mua/bán đứng sau, nên nó phải chặt **hơn**, không
phải bằng.

**Cách vá.** Nhận `^\d+$`, hoặc nhóm nghìn chuẩn `^\d{1,3}(\.\d{3})+$`. Mọi
thứ còn có `,` hay `.` lẻ → **từ chối và nói ra** ("ERP ghi tồn theo số
nguyên; 12,5 kg xin quy về đơn vị nhỏ hơn hoặc làm tròn rồi ghi lý do"). Thêm
trần trên và nói ra khi chạm.

### CAO-② Dấu "đã gỡ" kẹt vĩnh viễn khi chính lệnh TRẢ DẤU ngã

`huyLuotNap` đặt dấu **trước** phép kiểm số dư (đúng, đó là cách khoá của
CAO-④), số dư âm thì gọi `traDauVe()`. Nếu **`traDauVe` ngã**, dấu ở lại.

```
dựng lượt B rồi xuất hết · gỡ (phải 409 ⇒ phải trả dấu)
  chặn đúng lệnh UPDATE lich_su_thay_doi_nen thứ hai
  → dấu còn “đã gỡ” · dòng VẪN nằm nguyên trong giao_dich_kho
  → bấm lại khi D1 đã lành: HTTP 409 “Lượt nạp này đã được gỡ khỏi sổ cái rồi.”  ❗
```

Ba hậu quả: (a) lượt nạp **không gỡ được nữa, không có đường ra từ giao diện**;
(b) sổ vết ghi "đã gỡ" cho những dòng còn nguyên — Sếp đọc lịch sử ra một câu
sai; (c) `CAU_SO_DU`/`CAU_SO_DU_LO` coi mọi lượt mang dấu "đã gỡ" là đã biến
mất, nên **các lượt nạp khác trên cùng mã bị từ chối oan vĩnh viễn** vì số dư
tính thiếu đi phần của lượt kẹt.

Nhánh `DELETE` ngã thì **đúng như khai** ✅ — 503, câu báo tiếng người, dấu trả
về, bấm lại gỡ được. Chỉ nhánh trả-dấu là hở.

**Cách vá.** `traDauVe` hỏng thì câu 409 phải nói ra ("ERP không trả được
trạng thái lượt nạp về như cũ — xin báo người quản trị, mã phiếu pn_xxx"), và
cho `huyLuotNap` nhận lại một lượt đang mang dấu "đã gỡ" **mà sổ cái vẫn còn
dòng** (đếm được: `SELECT COUNT(*) FROM giao_dich_kho WHERE phieu_id = ?`).

### CAO-③ `dieuChinhKho` không kiểm `dang_ban`, và cho gán lô cho hàng không theo dõi HSD

```
mã đã NGỪNG BÁN (dang_ban = 0)                        → HTTP 200
   (nhapKho cùng file thì 400 “Sản phẩm này đã ngừng kinh doanh”)
theo_doi_hsd = 0 mà gửi lo_hang_id                    → HTTP 200
   ⇒ tồn mã 17 / tồn lô 7 lệch nhau; xuatKho đi đường mã nên dòng lô là rác câm
ton_thuc = ["7"]  (mảng)                              → HTTP 200, nhận 7
```

Ca `dang_ban = 0` **có thể là cố ý** (phải sửa được tồn của mã đã ngừng bán) —
nhưng không một dòng ghi chú nào nói thế, nó lệch với cửa ngay bên cạnh, và
`danhSachSanPham` chỉ lấy `dang_ban = 1` nên sửa xong không nhìn thấy ở đâu.
Chọn đường nào cũng được, nhưng phải viết ra.

### CAO-④ Sổ vết của phiếu điều chỉnh chỉ là một chuỗi chữ trong `ghi_chu`

Đọc lại được ✅, có đủ ai/lúc nào/lý do/trước-sau ✅, XNT có cột riêng ✅.
Nhưng `ton_truoc` · `ton_sau` · `ly_do` bị nhồi chung vào một câu tiếng Việt:

```
"Điều chỉnh tồn: sổ ghi 50 → đếm thật 38. Lý do: hàng vỡ 12 cái khi bốc xếp 07/09"
```

Không truy vấn được, không lọc được, không thống kê được "tháng này điều chỉnh
mất bao nhiêu vì hàng vỡ" — mà đó chính là câu hỏi Sếp sẽ hỏi. Đổi câu chữ một
lần là mọi phiếu cũ đọc máy không ra. Và **không** ghi vào
`lich_su_thay_doi_nen` như mọi cửa sửa dữ liệu nền khác.

Với cửa duy nhất ghi số vào sổ cái không có chứng từ, xin ghi thêm **một dòng
`lich_su_thay_doi_nen`** (`bang='giao_dich_kho'`, `truong='dieu_chinh'`,
`gia_tri_cu` = tồn trước, `gia_tri_moi` = tồn sau, `ly_do` = lý do người viết)
— 1 lượt ghi, dùng lại đúng bảng đã có, 0 migration.

*(Ghi nhận: `ly_do` chỉ kiểm độ dài ≥ 5 nên "aaaaa" qua được. Máy không kiểm
được ý nghĩa — chấp nhận, nhưng anh Duy nên biết là sổ đọc lại được và Sếp
sẽ đọc.)*

---

## 3. THẤP

1. **Màn Điều chỉnh @375px phải cuộn 480px** (trang 1292 / màn 812). Không tràn
   ngang (body 0 · pane 0) ✅, chạm đều ≥ 44px ✅, 0 mã màu cứng ✅, 0 lỗi
   console ✅. Sếp dặn "vừa một màn ở 375px" **hai lần** — thu gọn đoạn giới
   thiệu 3 dòng và xếp "Số tồn thật" cạnh ô lô là vừa.
2. **`#kvSeg` nay 9 nút** (Tồn/Nhập/Xuất/Điều chỉnh/Báo cáo/Đơn hoàn/Lịch sử
   đơn hoàn/Danh mục/Nạp từ file). Không tràn ngang @375px, nhưng đã thành một
   bức tường nút — đến nút thứ mười thì phải nghĩ lại cách xếp.
3. **Hai lượt nạp cùng "Số lô LO-A" tạo HAI dòng `lo_hang` khác nhau**, cùng
   tên, cùng HSD. Ô chọn lô ở màn Điều chỉnh hiện hai dòng **giống hệt nhau** —
   người đi sửa không phân biệt được mình đang sửa cái nào.
4. **FEFO không xác định khi hai lô cùng HSD.** `ORDER BY … tao_luc ASC` mà
   `tao_luc` cùng giây thì thứ tự do D1 quyết; đo được lô nhập **sau** bị ăn
   trước. Không sai tồn, nhưng "cận hạn xuất trước" thành lời hứa suông. Thêm
   `, l.id ASC` là xong.
5. **Deploy:** "0 migration mới" đúng cho commit `ba70d68`, **không đúng cho cả
   nhánh** — so với `main` nhánh này thêm `migrations/them-nap-ghep-cot.sql`.
   Trước khi đẩy phải chạy `npm run nap-ghepcot`.

---

## 4. Cổng — chạy lại HẾT, không lệch một số nào

| Cổng | Người xây khai | Hồ Ly đo | |
|---|---|---|---|
| `do-nap-lai` | 190/0 | **190 · 0** | ✅ |
| `do-nap-lai-tu-kiem` | 32/32 | **32/32 · 190/0** | ✅ |
| `ho-ly-rev0060` | 92/1 | **92 · 1** | ✅ |
| `ban-dieu-chinh` @1440 | 11/0 | **11 · 0** | ✅ |
| `ban-dieu-chinh-dienthoai` @375 | 11/0 | **11 · 0** | ✅ |
| `ban-dieu-chinh-parttime` | 4/0 | **4 · 0** | ✅ |
| `ban-nap-file` ×4 | 26/26/15/15 | **26 · 26 · 15 · 15** | ✅ |
| `cong-khoi` @1440 · @375 | XANH | **XANH · XANH** | ✅ |
| `do-nap-file` | 89/0 | **89 · 0** | ✅ |
| `do-nap-ghi` | 42/0 | **42 · 0** | ✅ |
| `do-bang-that` | 75/0 | **75 · 0** | ✅ |
| `do-ba-mau` | ĐẠT | **ĐẠT** | ✅ |
| `do-cat-im-lang` | SẠCH | **SẠCH** | ✅ |
| `do-chu-dai` | XANH | **XANH** | ✅ |
| `do-moc-noi` | 9/0 | **9 · 0** | ✅ |
| `do-tach-vai-tro` | 61/0 | **61 · 0** | ✅ |
| `do-ghi-dongbo` | 31/0 | **31 · 0** | ✅ |

Trượt duy nhất của `ho-ly-rev0060` vẫn là câu **chờ Sếp ①**: *"nhan_vien_kho
KHÔNG nạp hàng loạt được tồn kho — NẠP ĐƯỢC — 17 bạn part-time ở kho đều ghi
được thẳng vào sổ cái."* Đây là câu hỏi chính sách, không phải lỗi mã. Vẫn treo.

**0 gói mới** ✅ (`package.json` chỉ thêm 7 dòng `scripts`, không đụng
`dependencies`). **Nợ của `f1ac70b` không nhận.**

---

## 5. Dựng lại từng bản vá — không tin lời khai

### ⓐ Tồn âm đường LÔ HÀNG — **VÁ ĐÚNG** ✅

Dựng lại đúng cảnh, HSD đặt lệch cho FEFO xác định, đo qua đúng cửa ERP:

```
nạp lô A 100 · nhập tay lô M 100 (HSD sau) · xuất 100 → FEFO ăn LO-A
GỠ lượt nạp → HTTP 409
  “…1 LÔ HÀNG đã xuất hàng dựa trên số vừa nạp, gỡ đi là tồn của lô ÂM —
   SP-00001 lô “LO-A” (HSD 01/10/2026) sẽ âm 100 túi…”
xuatKho(100) → HTTP 200 (ăn lô M) · xuatKho(1) → HTTP 400 · TỒN MÃ CUỐI = 0
```

Khớp từng con số với lời khai.

**Không chặn oan** ✅ — có lô mà chưa xuất gì thì vẫn gỡ được, và **lô mồ côi
LO-A đã dọn** khỏi bảng `lo_hang`.

**Bốn ca người xây chưa dựng, tôi gài thêm — đều đúng:**

| Ca | Kết quả |
|---|---|
| **Ba lô** (A 100 · M 50 · N 70, xuất 120 ăn hết A + 20 của M) | 409, kê đích danh lô A ✅ |
| **Hai lô HSD bằng nhau** | gỡ được, tồn cuối 0, `xuatKho(100)` sau đó 400 ✅ (nhưng thứ tự FEFO không xác định → THẤP-④) |
| **Gỡ hai lượt chồng lên cùng một số lô** | 409/409, sổ cái không suy chuyển ✅ (và lộ THẤP-③: hai dòng `lo_hang` cùng tên) |
| **`theo_doi_hsd = 0`** | không dựng được qua cửa nạp file: ô "Theo dõi hạn dùng" để trống ⇒ ERP vẫn ghi `1`. Khai *"`theo_doi_hsd = 1` là mặc định"* **đúng, và còn dính hơn khai** — chính chỗ này đẻ ra CHẶN-③ |

### ⓑ Đường ra — quyết định đúng, mã còn ba lỗ

Xem mục 0-B và CHẶN-①/②, CAO-①/③/④.

### ③ Cửa "gõ lại tên file" — **VÁ ĐÚNG, hai chiều** ✅

```
nạp lần 1 “TonThang9.csv” ⇒ tồn 1000
gọi THẲNG API, cả hai vế = "x"    → HTTP 409 CHẶN · tồn 1000 → 1000   ✅
câu báo chỉ đúng tên phải gõ      → “TonThang9.csv”                    ✅
```

**Chặn oan?** Đổi tên file thành `DoiTenRoi.csv` rồi gõ **tên mới** → 409, và
câu báo chỉ thẳng phải gõ `TonThang9.csv`. **Đây là đúng, không phải chặn oan**:
vế cần khớp là tên file của *lượt nạp trước* — thứ chỉ máy chủ biết — và màn
hình in ra đúng chuỗi ấy. Gõ đúng tên lượt trước → qua, tồn 1000 → 2000 ✅.

### ④ Khoá gỡ lượt nạp — **VÁ ĐÚNG** ✅ (nhưng xem CAO-②)

```
nạp A 100 (lô A) · nạp B 100 (lô B) · xuất 50 ⇒ tồn 150
anh Duy gỡ A ─┐ song song
chị Hằng gỡ B ─┘   → HTTP 409 / HTTP 409 · tồn giữ nguyên 150      ✅
bấm lại MỘT MÌNH lượt B → gỡ được, tồn 50                          ✅
rồi lượt A              → 409 đúng (gỡ nữa là âm)                  ✅
```

Khớp lời khai. **Hỏng về phía an toàn — xác nhận**, và **không** thành khoá
chết ở nhánh `DELETE` ngã. Chỉ nhánh trả-dấu-ngã là hở → CAO-②.

### ⑤ ⑥ Bộ đọc bảng · `keBangRong`

Cổng `do-nap-lai` mục ⑧e/⑧f xanh, tự kiểm gài lại từng lỗi đều bắt được. Không
soi thêm.

---

## 6. Ba chỗ người xây tự cắt — và hai lỗi bàn đo nó tự bắt

### `ho-ly-rev0060-f.mjs` — **file của tôi, tôi đã tự sửa** (chưa commit)

Lý do người xây đưa **đúng**: bộ đọc bảng ném `LoiDocBang` *"File có nhiều hơn
20.000 dòng — vượt sức xử lý một lần. Xin chia nhỏ file rồi nạp làm nhiều
lần."* — cái "chết" ấy **chính là hành vi ĐÚNG**, và đăng ký nguyên bản đó vào
`package.json` là biến mẩu dò thành một cổng có tên mà chạy là đỏ.

Nhưng vứt đi thì mất một chốt thật: lớp lỗi đáng sợ ở đây không phải "từ chối"
mà là **"cắt im lặng"** — đọc 20.000 dòng đầu, bỏ 5.000 dòng cuối, báo thành
công. Nên tôi đảo lại mẩu dò: bắt lấy câu từ chối và **đòi nó phải to tiếng +
có con số + chỉ đường đi tiếp**; chỉ đỏ khi có cắt im lặng. Nay **3/0 XANH**,
đăng ký được.

→ Người xây: `"ho-ly-rev0060-f": "node scripts/ho-ly-rev0060-f.mjs"`.

### `ho-ly-rev0060-b.mjs` mục ④ — **kết luận lỗi thời, tôi đã tự sửa** (chưa commit)

Người xây chỉ ra đúng. Bản cũ kết luận "Kinh doanh không có đường vào màn nạp"
bằng hai phép đọc chữ đã hết hiệu lực: nó soi `khoiDongNapFile` có nằm trong
`khoiDongKho` không, và khối màn có nằm trong `<section id="v-khovan">` không
— trong khi vòng 2 đã **dời lời gọi ra khối khởi động chung** và
`khoiDongNapFile` **tự dời khối màn** sang `#kd-pane-napfile` lúc chạy. Vế thứ
hai vẫn "true" trong HTML tĩnh mà kết luận thì sai. Nó thoát 0 nên không làm
đỏ cổng nào — **một mẩu dò in ra câu sai còn tệ hơn không in gì**.

Nay soi bốn mắt xích thật, đo lại: **✅ Kinh doanh CÓ đường vào màn nạp.**

### `noiVetCat` giữ nguyên · `cay.length === 4` không đụng — **đồng ý** ✅

Không có số đo nào chống lại, và đụng vào là mở rủi ro không đổi lấy gì.

### Hai lỗi bàn đo tự bắt — **xác nhận cả hai** ✅

* `ton_thuc: -5` lọt HTTP 200 vì strip mất dấu trừ — **đã vá thật**, đo lại:
  `-5` (chuỗi và số) → **400**, câu từ chối nói đúng cách làm. *(Nhưng dấu chấm
  và trần trên thì chưa — CAO-①.)*
* Chốt tự kiểm mù vì viết chính chuỗi cần soi vào lời bình trong đoạn được soi
  — cơ chế gài dùng `String.replace` (thay **lần xuất hiện đầu tiên**), nên
  đúng là gài nhầm vào ghi chú được. Xác nhận đã hết: **32/32**. Ghi nhận thêm
  một điểm an tâm: ca gài nhầm vào ghi chú **hỏng to tiếng** (mã không đổi ⇒
  bàn đo vẫn xanh ⇒ tự kiểm in `✗` và tụt số), không âm thầm.

---

## 7. Gộp `main` (`3e0db1f`)

Gộp khô: **một xung đột duy nhất — `docs/CHANGELOG.md`** (hai bên cùng nối
thêm vào đầu file). Tầm thường.

Vùng chồng lấn với nhánh `gy67` vừa lên (`8f0ff1b` + `06fb08c`):

* `public/assets/js/app.js` — `main` dời `TL_NHOM_LUU_DUOC` lên đầu tệp (vá
  TDZ) và thêm `|| 0` cho ba ô Trạm Mục Tiêu. Nhánh này thêm khối
  `khoiDongNapFile` và khối Điều chỉnh, **ở vùng khác hẳn**. `git merge-tree`
  gộp sạch.
* `package.json` — hai bên thêm `scripts` khác nhau, gộp sạch.
* `public/assets/css/style.css` · `scripts/cong-khoi.mjs` — chỉ `main` đụng.

**Một việc phải làm sau khi gộp:** `main` mang theo cổng mới
`scripts/do-man-mo-ra-xem-duoc.mjs`, canh đúng lớp *"tab mở ra phải xem được
nội dung"*. **Màn Điều chỉnh là một pane MỚI chưa từng đi qua cổng đó** — chạy
lại nó sau khi gộp trước khi đẩy.

---

## 8. Việc phải làm trước khi đẩy

1. **CHẶN-①** — `dieuChinhKho`: `theo_doi_hsd = 1` mà không có `lo_hang_id`
   thì từ chối, kê ra danh sách lô. Thêm `required` cho `#kvDcLo`.
2. **CHẶN-②** — ghi phiếu điều chỉnh bằng một câu có điều kiện số dư, soi
   `meta.changes`, 0 dòng ⇒ 409.
3. **CHẶN-③** — nạp tồn cho mã theo dõi HSD mà file không có cột lô: tạo lô
   (như `nhapKho` vẫn làm) **và** nói ra ở màn xem trước.
4. **CAO-①** — ô số tồn thật: chỉ nhận số nguyên hoặc nhóm nghìn chuẩn, từ
   chối và nói ra khi có dấu thập phân; thêm trần trên.
5. **CAO-②** — `traDauVe` hỏng thì nói ra; cho gỡ lại lượt mang dấu "đã gỡ"
   mà sổ cái còn dòng.
6. **CAO-③** — quyết một đường cho `dang_ban = 0` và viết ra; chặn `lo_hang_id`
   với mã `theo_doi_hsd = 0`; siết ép kiểu của `ton_thuc`.
7. **CAO-④** — ghi thêm một dòng `lich_su_thay_doi_nen` cho phiếu điều chỉnh.
8. **THẤP ①–⑤.**
9. Đăng ký `ho-ly-rev0060-f/h/i/k` vào `package.json`; chạy
   `do-man-mo-ra-xem-duoc` sau khi gộp `main`; chạy `npm run nap-ghepcot`
   trước khi đẩy.

Vòng sau sạch ba CHẶN + bốn CAO thì PASS. Kiến trúc không phải làm lại — cả ba
CHẶN đều là **một mệnh đề `if` còn thiếu**, không phải một quyết định sai.
