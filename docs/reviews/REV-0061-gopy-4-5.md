# REV-0061 · GY-0004 (ô nhập ngày) + GY-0005 (sửa mục tiêu / nhận xét)

> **KẾT LUẬN: FAIL** — 1 CHẶN · 3 CAO · 4 VỪA · 3 THẤP.
> Nhánh `fix/gopy-4-5-namsinh-muctieu` @ `d21a356` · nền `main` @ `f1ac70b`.
> Soi bởi **HỒ LY** ngày 07/09/2026. Không commit, không sửa mã sản phẩm.
>
> Phần lớn bản vá là **đúng và tốt** — đặc biệt hướng "vá cả lớp ở một chỗ" và
> việc khớp `min`/`max` với chốt máy chủ. Cái làm nó trượt là **một chỗ duy
> nhất**: sổ nhận xét mất sạch câu cũ mà màn hình vẫn nói "Chưa có nhận xét
> nào" — đúng cái lỗi mà chính `suaLichSu` đã viết "KHÔNG XIN MIỄN TRỪ".

## Bàn đo Hồ Ly tự dựng

| Tệp | Đo gì | Kết quả |
|---|---|---|
| `scripts/holy-soi-gy45.mjs` | 9 nhóm chỗ bàn đo người xây không chạm | ĐẠT 28 · TRƯỢT 11 |
| `scripts/holy-soi-gy45-vong2.mjs` | nhận xét cũ bị đè ra khỏi trần 100 | ĐẠT 2 · TRƯỢT 3 |
| `scripts/holy-dem-html-chet.mjs` | đếm mảnh HTML chết | 1 panel · 24 id |

---

## CHẶN

### CHẶN-1 · Sổ nhận xét mất sạch câu cũ, màn hình nói "Chưa có nhận xét nào"

**Ở đâu**
- `public/assets/js/app.js:3672-3689` — `veSoNhanXet()` gọi `API.suaLichSu('cong_viec', id)` rồi `(ls.ds || []).filter(d => d.truong === 'nhan_xet')`. **`ls.cat` không được đọc một lần nào.**
- `public/app.html:3219` — `<div class="empty" id="cv-nx-trong" hidden>Chưa có nhận xét nào cho việc này.</div>`
- `src/index.js` · `suaLichSu()` — `const GH = 100;` … `LIMIT ${GH + 1}` rồi `catBot` / `nhanCat`. **Máy chủ NÓI ĐÚNG** là đã cắt; giao diện vứt câu đó đi.

**Cách tái hiện** (`node scripts/holy-soi-gy45-vong2.mjs`, ca T1 — đã chạy)
1. Việc #1 có **3 nhận xét** ghi tháng 6/2026 (trong đó có câu *"Chỗ cần sửa: lô 12 thiếu số lô — đây là lần thứ ba"*).
2. Việc đó chạy dài, tháng 8 có **110 dòng sửa** bình thường (`truong='tieu_de'`).
3. `GET /api/sua/lich-su?bang=cong_viec&id=1` → trả **100 dòng**, `cat = {"gioi_han":100,"tong":113}`.
4. Giao diện lọc `truong==='nhan_xet'` trên 100 dòng đó → **còn 0/3**.
5. Hộp Nhận xét hiện: **"Chưa có nhận xét nào cho việc này."**

**Vì sao hại**
`suaLichSu` tự viết, nguyên văn: *"Một sổ bằng chứng cắt im lặng thì lời hứa đó
thành lời nói dối theo đúng cách nguy hiểm nhất… VÌ THẾ KHÔNG XIN MIỄN TRỪ."*
Cửa đọc đã giữ đúng lời hứa đó. Màn mới thì không. Và nó không im lặng theo kiểu
để trống — nó **khẳng định sai**: "Chưa có nhận xét nào". Đúng ca "chỗ ai cũng
muốn giấu rơi khỏi màn hình mà màn hình vẫn nói đây là tất cả".

**Bằng chứng là bản vá đi lệch khỏi khuôn của chính nhà**: hộp *Sửa việc* — ngay
cạnh, cùng một cửa đọc — **có** dải cắt `public/app.html:3181`
`<div class="dai-cat" id="cv-sua-lichsu-cat" hidden>` và `app.js:3644`
`veDaiCat('#cv-sua-lichsu-cat', ls.cat, { don_vi: 'lần sửa' })`.
Hộp *Nhận xét* không có ô dải-cắt nào, và `veSoNhanXet` không gọi `veDaiCat`.

**`do-cat-im-lang` không bắt được** — và đó là điểm mù, không phải chứng nhận:
bàn đo quét `.slice(0, N)` trong `public/` (xem `do-cat-im-lang.mjs:22, 553`),
nó không biết hỏi *"có màn nào nhận `cat` rồi vứt đi không"*.

---

## CAO

### CAO-1 · Báo cáo kho: "Đến ngày" không đặt được quá hôm nay — hồi quy MỚI

**Ở đâu** — `public/app.html:1569`
`<input type="date" id="kvBcDen" data-ngay-kieu="qua-khu" required>`
→ `public/assets/js/o-ngay.js` · `khoangCuaKieu('qua-khu')` → `max = homNayVN()`.

**Cách tái hiện** (`holy-soi-gy45.mjs`, ca H7 — đã chạy)

| gõ vào `kvBcDen` | `checkValidity()` | min / max thực tế |
|---|---|---|
| `2026-09-08` (ngày mai — để lấy trọn hôm nay) | **false** | `1990-01-01` / `2026-09-07` |
| `2026-12-31` (cuối năm — kiểu người ta hay gõ cho chắc) | **false** | như trên |

Ô này **`required`** và nằm trong `<form id="kvFormBaoCao">` có nút submit
(`app.js:9487`). Giá trị ngoài khoảng ⇒ **trình duyệt chặn cả form**, bằng bong
bóng tiếng Anh của chính Chrome, không phải câu tiếng Việt của ERP.

**Vì sao hại** — trước nhánh này ô không có `min`/`max`, mọi giá trị đều chạy.
Đây là một luật nghiệp vụ mới ("không được xem báo cáo tới ngày trong tương lai")
mà **không ai chốt**, gắn vào một màn đang dùng thật.

### CAO-2 · Câu lỗi của `qua-khu` nói sai sự thật

**Ở đâu** — `public/assets/js/o-ngay.js` · `khoangCuaKieu()`:
`if (kieu === 'qua-khu') return { min: '1990-01-01', max: homNay, chu: 'không quá hôm nay' };`
và `cauSaiONgay()` dựng **một câu chung** cho cả `rangeUnderflow` lẫn `rangeOverflow`:
`` `Ngày phải ${kh.chu} — kiểm lại giúp tôi.` ``

**Cách tái hiện** (H7) — `tsThemNgayMua = 1988-05-20` (máy in mua năm 1988):
ô đỏ, câu hiện lên là **"Ngày phải không quá hôm nay — kiểm lại giúp tôi."**
cho một ngày cách đây 38 năm.

**Vì sao hại** — luật nhà: *câu lỗi bằng tiếng người*. Câu này không sai ngữ pháp,
nó **sai sự thật**: người dùng đọc xong không biết mình vướng cái gì, sửa kiểu gì
cũng không qua. Ngưỡng sàn `1990` cũng không được giải thích ở đâu, trong khi
khoảng mặc định của chính file là `1900`.

### CAO-3 · `do-quyen-man-viec` chết giữa chừng — cùng lớp lỗi vừa tự vá, mà chỉ vá một

**Ở đâu** — `scripts/do-quyen-man-viec-gop.mjs:183`, neo:
`"if (!laAdmin(phien.vai_tro)) return loi('Bạn không có quyền', 403);"`
Chuỗi `laAdmin(phien.vai_tro)` xuất hiện **0 lần** trong `src/index.js` (cả main
lẫn nhánh — `laAdmin(phien)` 27 lần).

**Cách tái hiện** — `npm run do-quyen-man-viec` →
`Error: dc2: KHÔNG bẻ được gì — ca đối chứng vô nghĩa, phép đo hỏng` → exit 1.
DC-2 (*"bỏ cửa laAdmin → nhân viên xem được số liệu toàn công ty"*) **ngừng canh**,
và mọi phép kiểm sau nó không chạy.

**Vì sao hại** — đây **đúng lớp lỗi** người xây vừa tự phát hiện và viết hẳn một
đoạn ghi chú cho `do-sua-muc-tieu-day-du`. Có hai bàn đo dính, quét đúng một.
Bàn đo còn lại **không nằm trong danh sách cổng khai** nên không ai chạy.
Nợ này có sẵn trên `main` (đã xác minh trên worktree sạch), nhưng thời điểm biết
được cả lớp là thời điểm phải quét cả lớp.
(`scripts/do-quyen-duyet-gopy.mjs:1628,1633` cũng còn chuỗi đó — ở đó nó là **giá
trị tiêm vào**, vô hại; ghi chú dòng 1638 cho thấy việc đổi tên đã được biết.)

---

## VỪA

### VỪA-1 · Bấm thông báo nhận xét không đi đâu cả
`src/index.js:3769` bắn `loai = 'cong_viec_nhan_xet'`.
`public/assets/js/app.js:7640` bảng `ICO` **không có** loại này (rơi về 🔔), và
`app.js:7677-7692` — chuỗi `if / else if` định tuyến cú bấm — **không có nhánh**
cho nó. Tái hiện (H9): bấm dòng thông báo → panel đóng, không đổi tab, không mở
hộp nhận xét. Trái với chính lập luận trụ cột của thiết kế (*"người bị nhận xét
PHẢI đọc được → thông báo"*). Thiếu đúng một `else if`.
(`cong_viec_sua` / `_xong` / `_tralai` / `_huy` cũng không được định tuyến — nợ
cũ; nhưng đây là mã mới.)

### VỪA-2 · Câu lỗi đỏ dính lại giữa hai lần mở hộp
`o-ngay.js` chỉ vẽ lại dòng nhắc ở `focus` / `blur` / `input`.
`app.js:5306-5312` · `veCongTacSinhNhat()` gán `oNg.value = ''` rồi
`oNg.value = kq.ngay_sinh` **mà không bắn `input`**.
Tái hiện (H6 — đã chạy): đặt `2020-01-01` → dòng đỏ *"Năm sinh phải từ năm 1930
đến năm 2012"* + viền đỏ; đóng hộp rồi mở lại, **không chạm vào ô** → dòng đỏ và
viền đỏ **còn nguyên**, giá trị sai còn nguyên.
Hệ quả: mở hồ sơ người A, gõ nhầm, đóng; mở hồ sơ người B → form của B hiện câu
đỏ của A dưới một ô rỗng.

### VỪA-3 · Máy chủ cắt nhận xét ở 1000 ký tự, im lặng
`src/index.js` · `cvNhanXet` — `String(b.noi_dung || '').trim().slice(0, 1000)`.
Tái hiện (S3): POST 1500 ký tự → **HTTP 200**, `{"ok":true,"id":2,...}`, D1 lưu
đúng 1000. Không một chữ nào nói là đã cắt.
`maxlength="1000"` trên `textarea` che chỗ này cho đường trình duyệt; gọi thẳng
API (hay một tích hợp sau này) mất 500 ký tự mà không có tín hiệu.

### VỪA-4 · "Chỉ hai người trong cuộc" trên giấy — cả công ty đọc được trên máy
`public/app.html:3212` và phần đầu `cvNhanXet` đều viết *"chỉ hai người trong
cuộc"*. Nhưng cửa **đọc** là `suaLichSu`, mà nó chỉ hỏi
`duocXemTab(phien, 'congviec')` — không hỏi có dính dây gì với việc này không.

Tái hiện (S1 — đã chạy): `HANG` (kế toán trưởng, khác phòng, không dính dây) và
`HUONG` (HCNS) đều `GET /api/sua/lich-su?bang=cong_viec&id=1` → **HTTP 200**, đọc
nguyên văn `Bùi Thị Ngọc nhận xét: "Chỗ cần sửa: em còn quên ghi số lô, lần sau bổ sung."`

Cửa **ghi** thì siết đúng (S2: `nhan_vien_kho` nhận xét việc của **quản lý mình**
→ **403**, câu chặn đọc hiểu được). Vấn đề nằm ở chiều đọc.

**Đây là câu CHỜ SẾP, không phải lỗi người xây tự quyết được.** Hai lối ra, cả hai
đều được, nhưng phải chọn: (a) giữ mở — thì **xoá câu "chỉ hai người trong cuộc"**
và ghi thẳng lên hộp *"cả công ty đọc được câu này"*, để người viết biết mình đang
viết cho ai; (b) siết — thì cửa đọc `suaLichSu` phải lọc riêng dòng `nhan_xet`.

---

## THẤP

- **THẤP-1 · Dòng gợi ý cao 70px ở 375px.** H5: bấm vào ô ngày → hộp dài thêm
  **75px**. Không tràn ngang (đã đo). Câu dài 3 dòng: *"Thứ tự trên máy này:
  tháng / ngày / năm. Dán được: 25/01/1990 · 1990-01-25 · 25011990. Nhận từ năm
  1930 đến năm 2012."* Trên điện thoại có bàn phím ảo che ~350px thì 70px là
  đáng kể. Đề xuất: chỉ giữ dòng **thứ tự**, đẩy phần "dán được" vào `title`.
- **THẤP-2 · `dmNgayVao` gắn `data-ngay-kieu="qua-khu"`** (`app.html:2540`).
  "Ngày vào làm" thường là **tương lai** (offer đã ký, thứ Hai tới bắt đầu) —
  `max = hôm nay` sẽ chặn. Hiện vô hại vì cả panel `#dmForm` là HTML chết, nhưng
  nó ship sẵn lỗi cho ngày người ta bật panel đó lên.
- **THẤP-3 · `docNgay` nhánh ISO không neo cuối chuỗi**
  (`o-ngay.js` · `/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/`) — nhận cả
  `1990-01-25rác`. Cosmetic.

---

## Ba ca xấu người xây tự nêu — xác nhận từng cái

**① "Thêm nhân sự nhanh" không có ô ngày sinh — XÁC NHẬN.**
`#qtFormThem` (`app.html:815-880`) có: Họ tên · Chức danh · Phòng ban · SĐT ·
Email · Quản lý trực tiếp · Trạng thái. **Không ô ngày sinh, cũng không ô Ngày vào làm.**
Đường duy nhất nhập ngày sinh là hộp *Sửa hồ sơ*, mở **sau khi** đã tạo người.
Với 15/24 nhân viên kho sắp lập tài khoản, chị Lan làm **hai bước mỗi người**.

**Đánh giá quyết định KHÔNG tự thêm: ĐÚNG.** `ngay_sinh` là dữ liệu mức 2
(ADR-0011 A2) đi qua cửa riêng `nsNgaySinhLuu` với `batBuocThemNhanSu`; nhét vào
form tạo là đổi cả luồng ghi lẫn cửa quyền. Đó là quyết định nghiệp vụ, không
phải chỉnh giao diện — đẩy lên Sếp là đúng.
**Nhưng chưa đủ**: phiếu này chưa được ghi thành một dòng nợ ở đâu. Phải vào **sổ
hàng đợi** thành câu chờ Sếp, kèm đúng con số "15 người × 2 bước".

**② `#dmForm` là HTML chết — XÁC NHẬN.**
`public/app.html:2464` — `<div class="panel" hidden>` · "Đón nhân sự mới — từ ảnh
CCCD". **24 id** (`dmXemCccd` … `dmOk`), trong đó **15 ô nhập**, và **không một
dòng JS nào** trong `public/assets/js/**` nhắc tới bất kỳ id nào trong đám đó.

*Còn bao nhiêu mảnh chết nữa?* Máy quét thô
(`scripts/holy-dem-html-chet.mjs`) đếm 1020 id, 120 id không thấy trong JS —
**nhưng con số đó không dùng được**: phần lớn là id combobox (`qtChucDanhCombo`,
`taoTkViTriPanel`…) mà tôi đã kiểm chéo và chúng **sống**. Cái xác nhận được
chắc chắn là **một panel, 24 id**. Muốn con số thật thì cần một vòng phân loại
riêng — đề xuất mở phiếu, đừng đoán.

**③ Máy để tiếng Anh vẫn hiện `mm/dd/yyyy` — XÁC NHẬN, và `min`/`max` KHÔNG chặn
được hậu quả tệ nhất.** Xem mục ngay dưới.

---

## Kết luận độc lập về 15 ô ngày

**Cái làm được — đã đo, không lấy từ lời khai:**

| Đo | Kết quả |
|---|---|
| 15/15 ô có `min`/`max`, 15/15 đã qua bộ nâng cấp | ✅ |
| Đúng 15 dòng nhắc / 15 ô — không đẻ rác DOM (H3) | ✅ |
| Mở/đóng hộp **20 lần** → vẫn 15 dòng nhắc, không chồng người nghe (H4) | ✅ |
| Vẽ lại một ô bằng `innerHTML` **30 lần** → mỗi lần đúng 1 dòng nhắc + có min/max (H4b) | ✅ |
| Lời khai *"không đổi id/type/value"* — gán/đọc `.value` cả 15 ô chạy y như cũ (H8) | ✅ |
| Dán 8 kiểu người Việt hay viết (kể cả `1990.01.25`, `25-01-1990`, khoảng trắng thừa, `1990/01/25`) | ✅ 8/8 |
| Dán rác (`31/02/1990`, `hôm nay`, `2026-13-45`) → từ chối **và nói ra** (H2) | ✅ 3/3 |
| Ngày sinh hai chiều: `2009-06-01` (kho 17 tuổi) NHẬN · `2012-12-31` (mép) NHẬN · `2013-01-01` CHẶN | ✅ khớp đúng chốt máy chủ `1930…nay−14`, **không chặn oan** |
| Chạm ≥44px (ô 47px, nút Gửi 45px) · 375px không tràn ngang | ✅ |

`MutationObserver` **không rò rỉ** — chỉ một người nghe duy nhất trên `body`, và
`nangCapMot` chốt bằng `dataset.ngayDaNang`. Đã ép 20 vòng mở/đóng + 30 vòng vẽ
lại; con số không nhích.

**Cái CÒN HỎNG — và bàn đo của người xây không thể thấy:**

Gõ thật `25011990` (25 tháng 01 năm 1990) vào **9/9 ô** tôi tới được, trên Chrome
tiếng Anh → ra **`1990-02-05`** ở tất cả:

```
kvBcDen · tsSuaNgayMua · tsSuaHetBaoHanh · dmNgayVao · nsSua-ngaysinh
nsHd-batdau · nsHd-hethan · cv-sua-han-chot · cv-han-chot   →  1990-02-05
```

Nằm trong `min`/`max`, tiêu điểm không mất, **không một câu lỗi nào**. Sai mà
trông như đã điền xong — đúng thứ nguy hiểm hơn cả ô chết.

**Vì sao `do-o-ngay` B1 không thấy**: nó gõ `01011990`. `01/01` đọc theo
ngày/tháng/năm hay tháng/ngày/năm đều ra `1990-01-01`. Đó là **một ngày đối
xứng** — phép kiểm đó **không thể** phát hiện lỗi đảo thứ tự, dù cả bàn đo đang
chạy trên đúng cái Chrome tiếng Anh làm lộ ra lỗi. Ca đo tự chọn dễ.

**Trả lời thẳng câu hỏi ③ của phiếu soi:** `min`/`max` chặn được `0001-01-01` và
`11990-…` — hai thứ tệ nhất *về hình thức*. Nó **không** chặn được thứ tệ nhất
*về hậu quả*: ngày/tháng đảo im lặng thành một ngày hợp lệ nhưng sai.
Thứ thật sự cứu được là **dòng "Thứ tự trên máy này: tháng / ngày / năm"** — tôi
đã đo, nó nói **đúng sự thật**. Nhưng nó **chỉ hiện lúc bấm vào ô**, mà người ta
bấm vào là gõ ngay, chưa kịp đọc. Đề xuất: với ô có `data-ngay-kieu`, hiện dòng
thứ tự **thường trực** (một dòng ngắn, không kèm phần "dán được") khi thứ tự của
trình duyệt **khác** ngày/tháng/năm — đó mới là lúc người dùng cần biết.

**Tổng: hướng vá đúng, thi công sạch, nhưng GY-0004 chưa đóng được.** Sếp Ngọc
báo *"nhập năm sinh ko đc"* — phần "không được" đã chữa xong và chữa cho cả lớp.
Phần "nhập vào ra sai ngày" thì vẫn còn, ở cả 15 ô.

---

## Kết luận về thiết kế nhận xét — có đúng tinh thần MBOs không?

**Đúng, ở ba chỗ khó nhất — và tôi tán thành cả ba.**

1. **Gắn vào MỘT VIỆC có `dau_ra` viết sẵn, không gắn vào con người.** Đúng luật
   "chấm đầu ra, không chấm hoạt động, không chấm người". Hộp còn in thẳng
   `đầu ra đã giao: …` lên đầu (`moHopNhanXet`), nên câu chấm luôn đứng cạnh
   đúng cam kết mà nó chấm — cãi lại được bằng bằng chứng, không cãi bằng cảm giác.
2. **Người bị nhận xét nói lại được** — đã đo, `laNguoiNhan` được cho ghi. Nhận
   xét một chiều không phải MBOs, đó là bảng điểm.
3. **Hai chip hai chiều** thay vì một ô mời chê, và **nút "⭐ Vinh danh luôn"**
   ngay trong hộp, dùng lại `vdGui`. Với Sếp Ngọc — người tự nhận điểm cần cải
   thiện là *ghi nhận và khen ngợi* — để đường đi tới lời khen **ngắn bằng**
   đường đi tới lời chê là quyết định đúng người, đúng lúc. Tán thành cả việc
   **không gộp** vào Vinh danh: một cái là lời khen công khai về một con người và
   tự trôi đi; một cái gắn một việc và ở lại. Hai vòng đời khác nhau thật.

**Chưa đúng, ở ba chỗ:**

- **"Ở lại vĩnh viễn" chỉ đúng trên giấy.** Trần 100 dùng chung xoá sạch nhận xét
  cũ (CHẶN-1). "Chấm được bằng bằng chứng" chỉ đúng khi bằng chứng còn đó — mà
  nhận xét bao giờ cũng là dòng **cũ nhất** của một việc chạy dài, tức là dòng
  rơi ra trước tiên.
- **"Chỉ hai người trong cuộc" là sai** (VỪA-4). Cả công ty đọc được. Nếu đó là
  chủ ý (minh bạch MBOs) thì phải nói ra trên hộp; nếu không thì phải siết cửa
  đọc. **Câu này chờ Sếp chốt**, người xây không tự quyết được.
- **Viết rồi không gỡ được, không sửa được, vĩnh viễn, gắn tên người.** Việc đã
  nghiệm thu vẫn nhận xét được là cố ý và có lý. Nhưng một sổ vĩnh viễn không có
  đường sửa một câu viết lúc nóng là chính sách nhân sự, không phải chi tiết kỹ
  thuật — cũng là câu chờ Sếp.

**Chi phí:** `S4` đo được **5 lượt chuẩn bị câu D1** cho một lần nhận xét (đọc
phiên · đọc việc · tra cấp trên · ghi vết · ghi thông báo). Không có bảng mới,
không cần migration — đúng như khai.

---

## Chỗ lời khai lệch số đo

| # | Khai | Đo được |
|---|---|---|
| 1 | "**15 ô** `input[type=date]`, cả lớp" | Đúng cho `public/app.html` (15). Còn **2 ô nữa** dựng bằng chuỗi trong `quet-tai-lieu.js` (`tlqBanHanh`, `tlqHetHan`) → **17**. Cả hai vẫn được `MutationObserver` bắt nên **không thành lỗi**, nhưng "cả lớp 15" là thiếu. |
| 2 | "**Không đổi `id`/`type`/`value`**" | Đúng ba thứ đó. Nhưng bản vá **có chèn một `<div class="o-ngay-nhac">` làm em kế** mọi ô ngày. Tôi đã quét: không bộ chọn CSS anh-em kề nào và không đoạn JS nào đi `nextElementSibling` từ ô ngày ⇒ **lần này không gãy**. Lời khai nên nói rõ "có thêm một thẻ em" — vòng soi sau sẽ đọc lời khai, không đọc lại mã. |
| 3 | "`do-cat-im-lang` **SẠCH**" | Đúng, nhưng đó là **điểm mù**: bàn đo quét `.slice(0, N)` trong `public/`, không hỏi "có màn nào nhận `cat` rồi vứt đi không". CHẶN-1 lọt qua đúng cái lưới dựng lên để bắt nó. |
| 4 | Danh sách cổng khai | **Thiếu `do-quyen-man-viec`** — bàn đo này ĐỎ (exit 1) trên cả nhánh lẫn main (CAO-3). |
| 5 | `SO_O_NHIEU_DONG` 31 → 32 | **Đúng, KHÔNG nới.** Nhánh thêm đúng một `textarea.o-nhieu-dong` (`#cv-nx-noi-dung`). Đây là **sàn dưới** (`if (… .length < SO_O_NHIEU_DONG) → đỏ`) nên nhích lên là **siết chặt hơn**, không phải nới. |
| 6 | DC-C "gãy sẵn trên main, neo lại không nới" | **Đúng từng chữ.** Worktree sạch từ `main` @ `f1ac70b`: `src/index.js` có **0** lần `laAdmin(phien.vai_tro)`; `npm run do-sua-muctieu` trên main chạy 77 phép kiểm (0 trượt) rồi **chết** ở đầu DC-C, exit 1, không in tổng kết. Trên nhánh: **87/0**, DC-C sống lại và **bắt được bản gãy** (`✅ BẢN GÃY: người thường tự phong mục tiêu cấp CÔNG TY — HTTP 200`). +10 phép kiểm, +3 ca đối chứng. **Chỗ làm tốt.** |
| 7 | Nợ có sẵn `do-tu-lam-moi` 52/2 · `do-bang-that` 73/2 | **Xác minh độc lập trên worktree sạch — khớp.** main: 52/2 và 73/2; nhánh: y hệt, nội dung lỗi trùng từng ký tự (`kdTachDongHang` chưa khai · `⑤b 7 lượt` · `kd-sku-chay`/`kd-sku-kem` tràn @1440 và @1280). **Không lỗi mới.** |

---

## Cổng đã chạy lại (Hồ Ly, worktree `agc-gy45`)

| Cổng | Kết quả |
|---|---|
| `do-o-ngay` @375 / `do-o-ngay-may` @1440 | 36/0 · 36/0 (5/5 ca đối chứng bắt được) |
| `cong-khoi` @1440 / @375 | XANH · XANH |
| `do-ba-mau` | ĐẠT (12/12 đối chứng) |
| `do-cat-im-lang` | SẠCH *(nhưng xem CHẶN-1 — điểm mù)* |
| `do-chu-dai` | XANH |
| `do-moc-noi` | 9/0 |
| `do-duong-di-tiep` | 21/0 |
| `do-sua-viec` | 88/0 |
| `do-sua-muctieu` | 87/0 |
| `do-hop-sua-muctieu` | XANH |
| `do-tach-vai-tro` | 61/0 |
| **`do-quyen-man-viec`** | **ĐỎ · exit 1** (CAO-3) |
| `do-tu-lam-moi` | 52/2 = main |
| `do-bang-that` | 73/2 = main |

`do-quyen-duyet-gopy` 183/9 — 9 lỗi đều là *"KHÔNG ĐO ĐƯỢC"* do D1 cục bộ
(`ALTER TABLE … duyet_gopy` đã tồn tại), **không liên quan nhánh này**.

**Luật nhà:** chi phí 0 ✅ (`package.json` chỉ thêm 2 dòng `scripts`,
`devDependencies` không đổi) · chạm ≥44px ✅ · 375px không tràn ngang ✅ ·
ba màu ✅ (đỏ chỉ dùng cho `.sai`) · tiếng Việt có dấu ✅.

---

## Việc phải làm trước khi gộp

1. **CHẶN-1** — thêm `<div class="dai-cat" id="cv-nx-cat" hidden>` vào hộp Nhận
   xét và gọi `veDaiCat` trong `veSoNhanXet`, đúng khuôn `#cv-sua-lichsu-cat`.
   Dải phải nói theo **số nhận xét**, không theo số dòng sổ. Kèm một phép kiểm
   mới trong `do-o-ngay-nhanxet` (dựng 3 nhận xét cũ + 110 dòng sửa mới, ca đối
   chứng: gỡ dải đi thì phép kiểm phải đỏ).
2. **CAO-1** — bỏ `data-ngay-kieu="qua-khu"` khỏi `#kvBcDen` (và cân nhắc
   `#kvBcTu`), hoặc chốt luật nghiệp vụ với Sếp trước.
3. **CAO-2** — `khoangCuaKieu('qua-khu')` phải trả câu nói đủ **cả hai đầu**, và
   `cauSaiONgay` phải phân biệt `rangeUnderflow` với `rangeOverflow`.
4. **CAO-3** — sửa neo `do-quyen-man-viec-gop.mjs:183` (chỉ neo, không đụng phép
   đo) và **quét nốt cả lớp** `laAdmin(phien.vai_tro)` trong `scripts/`.
5. **VỪA-1** — thêm nhánh `cong_viec_nhan_xet` vào `ICO` và vào định tuyến cú bấm.
6. **VỪA-2** — bắn `input` sau khi `veCongTacSinhNhat` gán `.value`.
7. **VỪA-4** — câu **chờ Sếp Ngọc**: nhận xét là *riêng hai người* hay *cả công ty
   đọc được*? Chốt xong mới sửa mã (hoặc sửa câu chữ trên hộp cho khớp sự thật).
8. **GY-0004** — đưa ca "gõ `25011990` trên máy tiếng Anh" vào bàn đo, rồi quyết
   xem dòng thứ tự có nên hiện thường trực khi trình duyệt không dùng
   ngày/tháng/năm không.
9. Ghi **câu chờ Sếp** về "Thêm nhân sự nhanh thiếu ô ngày sinh — 15 người × 2
   bước" vào sổ hàng đợi.
