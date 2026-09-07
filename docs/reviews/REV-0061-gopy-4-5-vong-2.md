# REV-0061 vòng 2 · GY-0004 (ô nhập ngày) + GY-0005 (nhận xét một việc)

> **KẾT LUẬN: FAIL** — 0 CHẶN · **1 CAO** · 2 VỪA · 3 THẤP.
> Nhánh `fix/gopy-4-5-namsinh-muctieu` @ `a7c8f7f` · nền `main` @ `f1ac70b`.
> Soi bởi **HỒ LY** ngày 07/09/2026. Không commit, không sửa mã sản phẩm.
>
> **Bản vá vòng 1 đúng và tốt.** CHẶN-1 đã chữa ở tầng bệnh chứ không tầng
> lưới; cả 3 CAO đã hết; 3/4 VỪA đã hết, VỪA-4 đẩy lên Sếp đúng chỗ.
> Và **5/5 phép kiểm tôi với người xây bất đồng thì tôi sai cả 5** — chi tiết
> ở mục ⓪, tôi nhận hết.
>
> Cái làm nó trượt là **một chỗ duy nhất, và là chỗ chính người xây đã viết
> luật ra rồi chỉ áp một lần**: *"PHẢI BẮN `input` SAU MỖI LẦN GÁN `.value`"*
> — trong ERP có **9 lệnh gán `.value` trên 6 ô ngày**, bản vá bắn `input` ở
> **đúng 1 ô**. Sáu ô kia giữ nguyên câu đỏ của bản ghi TRƯỚC dưới một giá trị
> HỢP LỆ của bản ghi SAU. Đúng lớp lỗi CAO-3 của vòng 1: biết cả lớp mà vá một.

## Bàn đo

| Tệp | Đo gì | Kết quả |
|---|---|---|
| `scripts/holy-soi-gy45.mjs` (vòng 1, **không sửa một dòng**) | 9 nhóm chỗ bàn đo người xây không chạm | **33 ĐẠT · 6 TRƯỢT** (vòng 1: 28/11) |
| `scripts/holy-soi-gy45-vong3.mjs` **MỚI** | sửa lại đúng 5 chỗ tôi đo sai + soi phần vòng 2 mới đẻ | **55 ĐẠT · 3 TRƯỢT** @375px · 54/4 @1440px |
| `scripts/holy-quet-cat-vong3.mjs` **MỚI** | đếm ĐỘC LẬP lớp "nhận `cat` rồi vứt" + dò điểm mù máy quét ②b | 6 chỗ / vá 4 / miễn trừ 2 — **khớp lời khai**; ②b lọt 3/3 mẫu cách-thứ-ba |
| `scripts/holy-quet-neo-vong3.mjs` **MỚI** | quét neo chết cả repo, không dùng máy quét của họ | **0 neo chết** — khớp lời khai ⑤ |

Xác minh lời khai *"không sửa một dòng nào của ba bàn đo Hồ Ly"*:
`git show --numstat a7c8f7f` → `holy-soi-gy45.mjs` **378 thêm / 0 xoá**,
`holy-soi-gy45-vong2.mjs` **116/0**, `holy-dem-html-chet.mjs` **37/0**.
Ba tệp vào repo **nguyên văn**. Lời khai ĐÚNG.

---

## ⓪ PHÁN XỬ 5 PHÉP KIỂM BẤT ĐỒNG — **tôi sai cả 5**

### H1 — *"gõ 25011990 vào 9 ô, ô nào cũng ra `1990-01-25`"* → **BÀN ĐO TÔI SAI**

Đo lại: Chrome của bàn đo khai `Thứ tự trên máy này: tháng / ngày / năm`.
Gõ `2·5·0·1·1·9·9·0` vào `mm/dd/yyyy`: `2`→tháng 02 (nhảy ô, vì không tháng
nào bắt đầu bằng 2 mà có hai chữ số), `5`→ngày 05 (nhảy ô, 5x > 31), `011990`
→ năm `1990`. Ra `1990-02-05` ở **9/9 ô**. Không mã nào của ERP đứng giữa
đường đó cả: `<input type="date">` **không cho đổi thứ tự ô con**, và đường
duy nhất đổi được là viết lại ô thành `type=text` — **phương án đã bị loại**,
chính tôi viết *"đừng viết lại ô ở vòng này"*.

Vậy H1 đang đòi thứ **đã bị loại**. Người xây nói đúng. Phép kiểm đúng cho
hướng đã chốt (dòng đọc lại) là **D1** trong bàn đo mới, và nó **XANH**:

| D1 @375px và @1440px | Kết quả |
|---|---|
| 9/9 ô hiện DÒNG ĐỌC LẠI sau khi gõ (không ô nào ẩn, không ô nào rỗng) | ✅ |
| Dòng đọc lại nói **đúng giá trị đang có trong ô** (`= 05/02/1990`), không phải câu chung | ✅ 9/9 |
| Ô ngày sinh kèm số tuổi — `= 05/02/1990 · 36 tuổi` | ✅ |

*(H1 cũng cho thấy `giuTieuDiem = true` ở **9/9 ô** — lỗi gốc GY-0004 sạch cả
lớp. Đó là con số của họ, tôi xác nhận.)*

Còn phép kiểm `H1 · số ô gõ thử được >= 10` (ra 9/15): ngưỡng `10` là con số
tôi tự đặt, 6 ô kia nằm sau panel bàn đo không mở được. **Ngưỡng tôi đặt sai**,
không phải sản phẩm thiếu ô.

### H6 — *"câu đỏ dính lại"* → **BÀN ĐO TÔI SAI, nhưng SẢN PHẨM VẪN HỎNG chỗ khác**

Probe của tôi để nguyên `2020-01-01` trong ô rồi chỉ bật/tắt `modal.hidden`.
Ô **thật sự đang chứa ngày sai** ⇒ đỏ là **đúng**. Người xây nói đúng: *"giấu
đỏ mà giữ giá trị sai còn tệ hơn"*.

Đi ĐÚNG đường thật (`datNgay` = gán `.value` **rồi bắn `input`**, đúng như
`app.js:5357` nay làm) — **E2 XANH**: đỏ biến mất, dòng đọc lại theo kịp giá
trị mới. Ca *"câu đỏ của A dưới một ô RỖNG của B"* trên `#nsSua-ngaysinh`
**đã vá thật**.

**Nhưng** đó là 1 trong 7 ô. Xem CAO-1.

### H9 — thông báo nhận xét → **BÀN ĐO TÔI SAI (ba lỗi, không phải một)**

1. Fixture `/api/thong-bao` của tôi **thiếu `lien_ket`** — máy chủ thật CÓ
   (`src/index.js:2783` `SELECT id, nhom, noi_dung, loai, lien_ket, tao_luc`).
   Người xây nói đúng.
2. Bộ chọn `.tab-nut.chon` **không khớp app này** — `moTab()` gắn class
   `.active` lên `.sb-item[data-tab]`. Người xây nói đúng.
3. **Lỗi thứ ba người xây chưa chỉ ra, và nó mới là lỗi quyết định**:
   `TOI.quyen` mặc định của bàn đo chung **không có `congviec`**, mà
   `app.js:2368` bọc cả `khoiDongCongViec()` trong
   `if (TOI.quyen.includes('congviec'))` ⇒ `window.MO_HOP_NHANXET` không bao
   giờ được gán ⇒ cú bấm rơi xuống nhánh dự phòng `MO_DEN_LICHSU_TIM`.

Sửa cả ba → **H9 XANH**: biểu tượng 💬 riêng, bấm vào **mở đúng hộp nhận xét
của đúng việc**, tiêu đề việc hiện đủ. Nhánh dự phòng khi thiếu `lien_ket`
cũng có thật và đi tới chỗ có thật.

### H10 + T2 — dải cắt sổ nhận xét → **BÀN ĐO TÔI SAI**

Fixture của tôi trả khoá `danh_sach`; `cvLichSu` thật trả **`viec`**
(`src/index.js:3858`). Người xây nói đúng. **Cộng thêm** lỗi `congviec` ở trên
— hai lỗi chồng nhau nên hộp chưa bao giờ mở, chứ không phải dải cắt không vẽ.

Sửa fixture, đo lại **cả 5 mép** — **XANH hết**:

| Số nhận xét | Dải cắt | Câu hiện ra |
|---|---|---|
| 0 (thật) | KHÔNG hiện | "Chưa có nhận xét nào cho việc này." — đúng, và **không** hiện nhầm dải cắt |
| 99 | KHÔNG hiện | 99 câu |
| 100 (đúng trần) | KHÔNG hiện | 100 câu, không báo cắt oan |
| 101 | **CÓ** | `✂️ Đã tải 100 trong tổng 101 nhận xét — còn 1 nhận xét chưa tải về máy.` |
| 123 | **CÓ** | `… trong tổng 123 nhận xét — còn 23 nhận xét chưa tải về máy.` |

Đơn vị **"nhận xét"** đúng như khai. Máy chủ cũng khớp: 99→`cat=null`,
100→`cat=null`, 101→`{gioi_han:100, tong:101}`, 123→`{…, tong:123}`.

### S5 / T1 — *"gọi `/api/sua/lich-su` không kèm `?truong=`"* → **BÀN ĐO TÔI SAI**

Hai lẽ, cả hai đều là lỗi của tôi:
1. S5 hỏi **rổ chung** — mà giao diện nay **không đọc nhận xét bằng rổ chung
   nữa**. Đo lại rổ chung: đúng là 0/3 (người xây khai thật); hỏi riêng
   `?truong=nhan_xet`: **3/3, câu cũ nhất còn nguyên**. Kỳ vọng của S5 lỗi thời.
2. Con số `3` trong S5 là **số cứng**, mà một trong ba nhận xét ấy do lời gọi
   1500 ký tự tạo ra — lời gọi đó **nay bị từ chối HTTP 400 cho đúng** (vá
   VỪA-3). Nên còn 2, và phép kiểm đỏ vì **chính bản vá đúng**.

---

## CAO

### CAO-1 · Luật *"gán `.value` thì phải bắn `input`"* viết ra rồi áp đúng 1 trong 7 ô

**Ở đâu** — `public/assets/js/o-ngay.js` chỉ vẽ lại dòng dưới ô ở
`focus` / `blur` / `input` / `change`. Gán `.value` bằng mã **không bắn sự
kiện nào**. Bản vá tự viết luật này, nguyên văn ở `app.js:5350`:

> *"PHẢI BẮN `input` SAU MỖI LẦN GÁN `.value` (REV-0061 · VỪA-2)."*

Rồi áp ở **đúng một chỗ** (`datNgay`, `#nsSua-ngaysinh`). Chín lệnh gán còn lại
trên sáu ô khác **giữ nguyên**:

| Chỗ gán | Ô | Màn |
|---|---|---|
| `app.js:8462` | `#tsSuaNgayMua` | Sửa tài sản |
| `app.js:8465` | `#tsSuaHetBaoHanh` | Sửa tài sản |
| `app.js:3637` | `#cv-sua-han-chot` | **Sửa việc — dùng hằng ngày** |
| `app.js:5697` · `5779` | `#nsHd-batdau` | Hợp đồng nhân sự |
| `app.js:5698` · `5780` | `#nsHd-hethan` | Hợp đồng nhân sự |
| `app.js:9561` · `9562` | `#kvBcTu` · `#kvBcDen` | Báo cáo kho (đổ sẵn kỳ hiện tại) |

**Cách tái hiện** (`node scripts/holy-soi-gy45-vong3.mjs`, phần E — đã chạy ở
cả 375px và 1440px, đỏ như nhau). Ví dụ ô Sửa việc:

1. Mở *Sửa việc* của việc A, gõ nhầm hạn chót `01/01/2200`
   → dòng đỏ **"Ngày muộn nhất nhận được là 31/12/2100 — bạn đang nhập
   01/01/2200."** + viền đỏ.
2. Đóng hộp. Mở *Sửa việc* của việc B (hạn chót `30/09/2026`, hoàn toàn hợp lệ).
   `app.js:3637` gán thẳng `.value`.
3. Màn hình việc B: ô hiện **30/09/2026**, dưới ô vẫn là **câu đỏ + viền đỏ
   nói "bạn đang nhập 01/01/2200"**.

Đo thật, cả ba ô:

| Ô | Ô đang chứa | Dòng dưới ô |
|---|---|---|
| `tsSuaNgayMua` | `2024-03-15` (hợp lệ) | 🔴 "Ngày này đã xảy ra rồi nên không được quá hôm nay (07/09/2026)" |
| `nsHd-batdau` | `2026-01-01` (hợp lệ) | 🔴 "Ngày sớm nhất nhận được là 01/01/1900 — bạn đang nhập 01/01/1800." |
| `cv-sua-han-chot` | `2026-09-30` (hợp lệ) | 🔴 "Ngày muộn nhất nhận được là 31/12/2100 — bạn đang nhập 01/01/2200." |

Ca đối chứng trong cùng bàn đo: gán `.value` **không** bắn `input` trên chính
ô đã vá (`nsSua-ngaysinh`) cũng đỏ ⇒ **phép đo có mắt**, ba ca trên không phải
báo oan. Và đi đúng đường `datNgay` thì sạch (E2) ⇒ **bản vá đúng, chỉ thiếu
diện**.

**Vì sao hại — hai tầng, tầng hai mới là tầng đắt**

① *Nói dối về cái người dùng vừa gõ.* Câu đỏ khẳng định *"bạn đang nhập
01/01/2200"* trong khi ô đang là `30/09/2026`. Cùng đúng một họ với CHẶN-1
của vòng 1: **màn hình khẳng định sai**. Ở đây nó còn dán nhãn "sai" lên một
giá trị **đúng** — người dùng hoặc mất công đi sửa cái không hỏng, hoặc học
được cách bỏ qua màu đỏ. Cái thứ hai tệ hơn nhiều.

② *Bản vá THẬT của GY-0004 vắng mặt đúng trên đường tải dữ liệu.* Dòng
`= 30/09/2026` là **cách duy nhất** người dùng thấy ERP đang hiểu ngày ấy là
ngày nào (`min`/`max` không chặn được lỗi đảo thứ tự — chính hai bên đã đồng
ý như vậy). Mở *Sửa việc*, *Sửa tài sản*, *Hợp đồng*, *Báo cáo kho* thì ô CÓ
giá trị mà **không có dòng đọc lại**, vì `veNhac()` chỉ chạy một lần lúc nâng
cấp ô, khi ô còn rỗng. Trên máy để tiếng Anh, ô hiển thị `09/30/2026` — đúng
cái mơ hồ mà cả vòng này dựng lên để xoá.

**Đây là hồi quy do nhánh này đẻ ra, không phải nợ cũ** — `public/assets/js/o-ngay.js`
xuất hiện **0 lần** trong `f1ac70b` (đã kiểm `git ls-tree`). Trước nhánh này
không có dòng nhắc nào để mà dính lại.

**Bàn đo của người xây đã có sẵn ca đối chứng cho đúng lỗi này** — `do-o-ngay`
DC-H: *"gán `.value` không bắn `input` → câu đỏ + viền đỏ của người TRƯỚC dính
lại trên form người SAU"* — nhưng nó chỉ canh **một ô**. Có mắt rồi mà chỉ mở
mắt về một phía.

**Gợi ý (không phải mã, người xây tự chốt)**: vá 9 chỗ gọi là vá 9 lần và lần
sau ai thêm chỗ gán thứ 10 lại thủng. Chỗ vá **một lần cho cả lớp** nằm trong
`o-ngay.js` — chính `nangCapMot()` đã sở hữu ô đó, nó đặt được cái bẫy trên
`value` (hoặc vẽ lại lúc ô được hiện ra) để mọi lệnh gán ở mọi màn, kể cả màn
chưa viết, đều đi qua. Đúng tinh thần *"vá cả lớp ở một chỗ"* mà chính nhánh
này làm rất tốt ở chỗ khác.

---

## VỪA

### VỪA-1 · Máy quét ②b mù **cách thứ ba** — vị ngữ hỏi một lần cho cả thân hàm

`do-cat-im-lang.mjs` · `quetVutCat()` hỏi: *"thân hàm BAO QUANH lời gọi có
nhắc tới `cat` không"* — **một lần cho cả thân hàm**. Ca đối chứng của họ có
2 mẫu bẩn, cả hai đều là "hàm này không nhắc chữ `cat` ở đâu cả". Cách thứ ba
thì lọt: **chỉ cần một chữ `cat` ở bất kỳ đâu trong hàm là mọi lời gọi khác
trong cùng hàm được tha.**

Dựng lại **nguyên văn** vị ngữ ấy (`thanHamQuanh` + `CO_NGHE_CAT`) rồi cho ăn
ba mẫu bẩn cách-thứ-ba — `node scripts/holy-quet-cat-vong3.mjs`:

```
❌ LỌT  a · một hàm: nghe `cat` cửa NÀY, vứt `cat` cửa KIA   (hàm bao quanh: veMotMan)
❌ LỌT  b · vứt `cat`, trong hàm có một biến tên `cat` dùng việc khác (veManKhac)
❌ LỌT  c · lời gọi trong hàm-con, hàm-cha có veDaiCat cho danh sách khác (moMan)
=> 3/3 mẫu bẩn cách-thứ-ba LỌT qua lưới ②b
```

Mẫu (a) đặc biệt đáng lo trong `app.js`: hàm khởi động ở đây rất dài và
thường gọi nhiều cửa. `veTongQuanTheoVaiTro` — hàm **vừa được vá** — gọi cả
`cvDanhSach` lẫn `mtDanhSach`; từ nay ai thêm lời gọi thứ ba vào đó rồi vứt
`cat` thì lưới **không bắt**.

**Đây là lỗi bàn đo, không phải lỗi sản phẩm** — tôi đã đếm độc lập và hiện
tại **không chỗ nào** trong `public/assets/js/**` mắc cách thứ ba (xem dưới).

### VỪA-2 · Con số "6 chỗ, vá 4, miễn trừ 2" — **ĐẾM ĐỘC LẬP: KHỚP**

Tôi tự dựng lại chuỗi máy-chủ → tuyến → `API.*` → chỗ gọi, không dùng máy quét
của họ, rồi soi tay từng chỗ so với `d21a356`:

| Chỗ gọi | Trước bản vá | Nay |
|---|---|---|
| `app.js:2757` `API.cvDanhSach` (thẻ Home) | **vứt** | ✅ vá |
| `app.js:2758` `API.mtDanhSach` (thẻ Home) | **vứt** | ✅ vá |
| `app.js:3713` `API.suaLichSu` (`veSoNhanXet`) | **vứt** — chính CHẶN-1 | ✅ vá |
| `app.js:10620` `API.tlLichSu` (sổ sửa tài liệu) | **vứt** | ✅ vá |
| `app.js:3526` `API.cvDanhSach` (`taiLai`) | trao tay | ⚪ miễn trừ |
| `app.js:4732` `API.chatGanDay` (`moChatTheoId`) | tra một tên | ⚪ miễn trừ |

**6 = 4 vá + 2 miễn trừ. Lời khai đúng.**
Tám chỗ gọi còn lại (`3117 mtDanhSach`, `2959`/`3661 suaLichSu`, `4150 cvLichSu`,
`4616 chatGanDay`, `7707 thongBao`, `10062 hoanLichSu`, `10930 tlNhatKy`) đều
đã đọc `cat` từ trước — không có chỗ nào bị bỏ sót.

**Hai miễn trừ đứng vững — kiểm tận nơi, không tin lời:**
· `taiLai()` — cất nguyên gói vào `window.CV_DU_LIEU_CUA_TOI`, và `nguonLoc()`
  (`app.js:3984-3990`) **có** đọc lại `cat_nhan`/`cat_giao`/`cat_phoi_hop`
  rồi đưa cho `veDaiCatLsCv`. **Trao tay thật, không phải vứt.**
· `moChatTheoId()` — chỉ tìm ĐÚNG một người trong `gan_day`; không thấy thì
  `moPopup(); veDs();` mở hẳn danh sách hội thoại. **Không khẳng định sai câu
  nào.**

---

## THẤP

- **THẤP-1 · `?truong=nhan_xet` nhận cả `bang=muc_tieu`** — trả rỗng, HTTP 200.
  Hiện vô hại (mục tiêu chưa có nhận xét). Ngày ai thêm nhận xét cho mục tiêu
  mà quên nối, màn sẽ in "chưa có nhận xét nào" **đúng kiểu CHẶN-1**. Rẻ nhất
  là chốt cặp `bang × truong` hợp lệ thay vì hai danh sách trắng rời.
- **THẤP-2 · Dải cắt nhận xét không có đường đi tiếp** — `xem_them: null`, dải
  nói *"còn 23 nhận xét chưa tải về máy"* mà không có nút nào lấy tiếp. Giống
  hệt `#cv-sua-lichsu-cat` nên **nhất quán**, và 100 nhận xét/một việc là con
  số không đời nào chạm — ghi lại để đừng quên, không phải để vá bây giờ.
- **THẤP-3 · `docNgay` nhánh ISO vẫn không neo cuối chuỗi** — nhận
  `1990-01-25rác`. Nợ THẤP-3 vòng 1, chưa vá, vẫn cosmetic.

---

## Soi thêm — phần vòng 2 mới đẻ ra

### ① Cửa `?truong=` — soi như mã mới. **SẠCH, 12/12 ca bẩn**

| Gửi vào `?truong=` | Kết quả | |
|---|---|---|
| (rỗng) | 200, không lọc | ✅ |
| `nhan_xet&truong=tieu_de` | 200, lấy cái ĐẦU (`nhan_xet`) | ✅ |
| `tieu_de&truong=nhan_xet` | **400** — cái đầu là hàng cấm | ✅ |
| `NHAN_XET` · `Nhan_Xet` | **400** | ✅ |
| `%20nhan_xet%20` | 200 (đã `trim`) | ✅ chấp nhận được |
| `nhan_xet%00` | **400** | ✅ |
| `nhan_xet' OR 1=1` | **400** | ✅ |
| `nhan_xet; DROP TABLE cong_viec` | **400** | ✅ |
| `tieu_de` (trường có thật, ngoài danh sách trắng) | **400** | ✅ |
| `*` · `1 OR 1=1` | **400** | ✅ |

Sau 12 phát bẩn, bảng `cong_viec` còn nguyên 1 dòng. Danh sách trắng **kín**,
và tham số hoá là lớp thứ hai — đúng kỷ luật "đóng cả hai lớp" họ tự viết.

**Rò quyền: KHÔNG.** Cửa `?truong=` nằm **sau** đúng cái cổng cũ
(`duocXemTab(phien,'congviec')`), không thêm một nhánh quyền nào. Đo: ai đọc
được rổ chung thì đọc được rổ riêng, cùng mã HTTP. Việc *"kế toán trưởng đọc
được nhận xét của kho"* **vẫn mở** — nhưng đó là **VỪA-4 của vòng 1**, đã ghi
thành câu chờ Sếp trong CHANGELOG kèm hai lối ra, và lời trên hộp đã sửa cho
khớp sự thật (*"ai xem được tab Công việc cũng đọc được — viết như nói trước
mặt"*). **Đẩy lên Sếp là đúng, không phải né.**

### ② Dòng đọc lại ngày — 375px và 1440px

| Đo | 375px | 1440px |
|---|---|---|
| Riêng dòng đọc lại chiếm bao nhiêu (`#nsSua`, 3 ô ngày) | **51px** | 51px |
| (`#tsSua`, 2 ô) | 34px | 34px |
| (`#cvSua`, 1 ô) | **17px** | 17px |
| Có biến hộp vốn vừa màn thành hộp phải cuộn không | **KHÔNG** | **KHÔNG** |
| Tràn ngang | không | không |

**≈17px/ô, không phải 70px như dòng gợi ý vòng 1** — THẤP-1 vòng 1 (rút câu
gợi ý còn một dòng, đẩy phần "dán được" vào `title`) đã ăn đúng chỗ. Luật
*"vừa một màn"* Sếp nhắc hai lần: **giữ được**.

*(Một phép kiểm của tôi đỏ ở 1440px vì đo nhầm: `#cvSuaModalNen` dài thêm
234px, nhưng 234px đó là khối "lý do dời hạn" mà `capNhatHopLyDo` mở ra khi
`#cv-sua-han-chot` bắn `input` — hành vi có sẵn, không phải dòng đọc lại
(17px). **Bàn đo tôi nhập nhèm**, không tính là lỗi sản phẩm.)*

**Năm nhuận và tuổi — XANH hết:**
`29/02/2000` → đọc `29/02/2000`, tuổi 26 · sinh nhật **đúng hôm nay** → 30 ·
sinh nhật **ngày mai** → 29 · sinh nhật **hôm qua** → 30 · chuỗi rác/rỗng →
`null`, không bịa ra tuổi.

### ③ Ba ô vừa gỡ `qua-khu` — **đúng nghiệp vụ cả ba**, và không sót ô nào

Rà cả **17 ô** (15 khai trong `app.html` + 2 dựng bằng chuỗi trong
`quet-tai-lieu.js`):

- `kvBcTu` · `kvBcDen` — **khoảng ĐỌC của báo cáo**, không phải một ngày đã
  xảy ra. Gỡ đúng: `max = hôm nay` chặn cả form `required`.
- `dmNgayVao` — **ngày vào làm thường là tương lai** (offer đã ký, thứ Hai tới
  bắt đầu). Gỡ đúng.
- Còn `qua-khu` ở đúng ba ô nghĩa "đã xảy ra": `tsThemNgayMua`,
  `tsSuaNgayMua`, `tlqBanHanh` (ngày ban hành giấy tờ). **Đúng cả ba.**
- Mười một ô còn lại (`kvNhapHsd` hạn dùng · `tsThem/SuaHetBaoHanh` ·
  `xcKeHoachHan` · `nsHd-batdau/hethan` · `cv-han-chot` · `cv-sua-han-chot` ·
  `tlqHetHan` · `dmNgaySinh`/`nsSua-ngaysinh` là `ngay-sinh`) — **không ô nào
  gắn sai luật.**
- Sàn `qua-khu` hạ 1990 → **1900**: đúng, con số 1990 không luật nào chốt, và
  máy in mua năm 1988 nay nhận được.

---

## Chạy lại HẾT cổng — đối chiếu từng con số với lời khai

| Cổng | Lời khai | **Tôi đo** | |
|---|---|---|---|
| `cong-khoi` @1440 | XANH | **XANH** | ✅ |
| `cong-khoi` @375 | XANH | **XANH** | ✅ |
| `do-o-ngay` @375 | 68/0 | **68 ĐẠT / 0 TRƯỢT** | ✅ |
| `do-o-ngay` @1440 | 68/0 | **68 / 0** | ✅ |
| `do-sua-muctieu` | 87/0 | **87 / 0** | ✅ |
| `do-sua-viec` | 88/0 | **88 / 0** | ✅ |
| `do-quyen-man-viec` | 20/0 | **20 / 0**, DC-2 sống lại | ✅ |
| `do-ba-mau` | 12/12 | **12/12 đối chứng, ĐẠT LUẬT BA MÀU** | ✅ |
| `do-cat-im-lang` | SẠCH | **SẠCH** (②b: 2 chỗ, cả 2 có lý do) | ✅ |
| `do-kho-tai-lieu` | (không khai) | ĐẠT, đối chứng 44px bắt được | ✅ |
| `do-tu-lam-moi` | 52/2 — nợ `f1ac70b` | **52 / 2** | ✅ nợ cũ |
| `do-bang-that` | 73/2 — nợ `f1ac70b` | **73 / 2** | ✅ nợ cũ |

**Nợ cũ: KHÔNG NHẬN, đã truy nguồn chứ không tin lời.**
`git log -S kdTachDongHang` → `f1ac70b`. `git log -S kd-sku-chay` → `f1ac70b`.
Cả hai vết đỏ đều là Dashboard Marketplace, không phải nhánh này.
Và `do-bang-that` không đo 1024px — cũng là chuyện của `f1ac70b`.

*(`do-nut-dai-cat` là bàn đo TƯƠNG TÁC — nó mở một cổng rồi đợi người vào
xem, không chạy tự động được. Không nằm trong cổng bắt buộc; dải cắt mới dùng
lại nguyên `.dai-cat` sẵn có và không có nút, nên không đụng ngưỡng 44px.)*

### Luật của nhà

- **Chi phí 0** — `package.json` và `package-lock.json` **không nằm trong
  `a7c8f7f`**. Không gói mới. ✅
- **Ba màu** — `do-ba-mau` ĐẠT; `.tl-nk-cat` dùng `var(--text-mute)`, không đỏ
  (đúng: đây là lời báo, không phải lỗi của người xem). ✅
- **Vừa một màn @375px** — dòng đọc lại tốn ≈17px/ô, không biến hộp nào vốn
  vừa màn thành hộp phải cuộn. ✅
- **Tiếng Việt có dấu · câu lỗi tiếng người** — câu lỗi nay tách hai đầu và
  kèm ngày đang nhập (*"Ngày này đã xảy ra rồi nên không được quá hôm nay
  (07/09/2026) — bạn đang nhập 20/05/2030."*). ✅
  *Trớ trêu: chính những câu này là thứ đang dính lại sai chỗ ở CAO-1.*
- **Chạm ≥44px** — không đụng tới. ✅
- **0 lỗi console, 0 ngoại lệ** ở mọi lượt đo. ✅

---

## Chỗ lời khai lệch số đo — có ba, cả ba đều nhỏ

1. **"H7 của bạn nay 7/7 xanh"** — H7 có **8** phép kiểm, cả **8** xanh.
   Khai thiếu một, lệch về phía khiêm tốn.
2. **"105 tệp · 64 chuỗi neo · 1 neo chết"** — tôi quét lại bằng luật của
   mình: **116 tệp · 89 chuỗi neo · 0 neo chết** (sau khi sửa hai lỗi của
   chính máy quét tôi: regex tham nuốt cả hai đối số, và bỏ sót `scripts/`
   trong tập nguồn). Đếm khác vì luật đếm khác; **kết luận giống hệt: không
   còn neo chết nào**. Họ khai "2 chỗ nghi thêm, kiểm tay, cả hai còn sống";
   tôi ra **3** chỗ nghi, cùng hai nguyên nhân (CRLF · neo trỏ sang
   `scripts/`), kiểm tay cả ba đều sống. Không ai sai.
3. **"14 hàm máy chủ → 10 đường API → 9 hàm `API.*`"** — máy quét của tôi chỉ
   soi `src/index.js` nên ra 7/7; của họ đi cả `src/**` và xuyên lớp vỏ
   (`return tailieu.x(…)`) nên ra 14/10/9. **Số của họ đầy đủ hơn số của tôi.**
   Cái quan trọng — 6 chỗ giao diện / vá 4 / miễn trừ 2 — tôi đếm độc lập và
   **khớp từng chỗ một**.

Ngoài ba chỗ đó: **mọi con số trong lời khai đều đúng.** Kể cả chỗ tự khai
bất lợi (máy quét báo oan `o-ngay.js:142`, bàn đo bắt được lỗi trong chính bản
vá của nó, hai bàn đo còn nợ của `f1ac70b`).

---

## Tóm tắt cho Sếp

Bản vá này **làm đúng gần hết**, và làm theo đúng lối nhà: chữa CHẶN ở **tầng
bệnh** (`?truong=nhan_xet` lọc trong SQL) chứ không dán băng ở tầng lưới; thấy
một lỗi thì **quét cả lớp** và **đếm ra số**; ba câu không tự quyết được thì
**đẩy lên Sếp kèm con số** (15 người × 2 bước) thay vì im lặng.

Nó trượt vì **một chỗ**: bản vá tự viết ra luật *"gán `.value` thì phải bắn
`input`"* rồi áp đúng **1 trong 7 ô ngày**. Sáu ô còn lại — trong đó có ô hạn
chót ở hộp *Sửa việc* dùng hằng ngày — hiện **câu đỏ của bản ghi trước dưới
một giá trị đúng của bản ghi sau**, và mất luôn dòng `= 30/09/2026` vốn là bản
vá thật của GY-0004. Đây là hồi quy **do chính nhánh này đẻ ra** (`o-ngay.js`
chưa từng có trên `main`).

**Vá xong CAO-1 là PASS.** Không còn gì khác chặn đường.
