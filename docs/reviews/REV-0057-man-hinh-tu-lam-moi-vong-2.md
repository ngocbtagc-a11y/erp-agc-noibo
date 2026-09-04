# REV-0057 vòng 2 — Màn hình tự làm mới

**Kết luận: FAIL** (2 lỗi CAO — cả hai nằm ở phần VIỆC MỚI của vòng 2, không phải ở bản vá gốc)

**Hai lỗi CAO của vòng 1 đã ĐÓNG THẬT**, tôi đo lại bằng phép đo sạch trên cả hai commit.
Bàn đo từ chỗ mù 2/3 lỗi tôi gài nay bắt **6/6** (ba lỗi cũ + ba lỗi mới tôi gài lần này),
và ba chốt tự kiểm đều có răng thật. Đó là công việc tốt, tôi nói thẳng là tốt.

Hai lỗi CAO mới đều nằm ở phần Khỉ Đột **tự làm thêm** trong vòng 2: tính năng nhiều tab,
và bản kiểm kê 26 khối.

Hồ Ly soi `67cb0b1` (nhánh `fix/man-hinh-tu-lam-moi`). Không commit, không sửa một dòng mã
sản phẩm nào. Bàn soi: `scripts/soi-tu-lam-moi{,-2,-3}.mjs` (đã sửa lỗi của chính nó, xem ⓪)
· `scripts/soi-nhieu-tab.mjs` · `scripts/soi-gia-nhieu-tab.mjs` · `scripts/soi-khoi-bo-sot.mjs`
— đều mới, chi phí 0, không thêm gói nào.

| | |
|---|---|
| CHẶN | 0 |
| CAO | 2 (đều là việc mới của vòng 2) |
| VỪA | 3 |
| THẤP | 3 |
| Vòng 1: L1 · L2 · L3 · L4 · L5 · L10 | **ĐÓNG** — kiểm từng cái, ghi ở mục ① |
| Cổng đo | **11/11 XANH đúng lời khai** |

---

## ⓪ Lỗi cắt chuỗi trong bàn soi của tôi — Khỉ Đột nói ĐÚNG, đó là lỗi của tôi

**Kiểm vế thứ nhất — bàn soi của tôi có bị đụng không: KHÔNG.**
`git log -- scripts/soi-tu-lam-moi*.mjs` chỉ có một commit (`67cb0b1`) và nó **thêm mới**
cả ba tệp (112 / 89 / 289 dòng, 0 dòng xoá). Dòng regex hỏng vẫn còn nguyên si khi tôi
mở ra. Khỉ Đột khai "không sửa bàn soi của bạn" — **đúng**.

**Kiểm vế thứ hai — lời giải thích có đúng không: ĐÚNG HOÀN TOÀN.**
`veThe()` (`app.js:1757`) vẽ mỗi thẻ thành **ba** ô con:

```js
`<div class="k">${esc(s.k)}</div>` +   // nhãn
`<div class="v">${esc(s.v)}</div>` +   // GIÁ TRỊ
`<div class="d ${s.dir || ''}">${esc(s.d)}</div>`   // mô tả
```

`textContent` gộp cả ba, nên "chờ duyệt" + "**0**" + "**2** việc đang giao" ra chuỗi
`…chờ duyệt02 việc đang giao`. Regex `(\d+)` của tôi **nuốt luôn chữ số đầu của mô tả**
và đọc ra `"02"`, rồi in ❌ trên một bản LÀNH. Lỗi của tôi, và là **lần thứ tư** trong hai
vòng mà một phép đo của tôi suýt báo sai — ba lần trước tôi tự bắt, lần này bên bị chấm bắt.

**Đã sửa** — nay đọc thẳng ô `.v` của đúng thẻ (`soi-tu-lam-moi-2.mjs:68-92`,
`soi-tu-lam-moi-3.mjs:58-67`), không cắt chuỗi nữa.

**Nhưng kết luận L1 của vòng 1 KHÔNG đổi, và đây là bằng chứng.** Tôi thêm cờ
`AGC_COMMIT` để chạy **cùng một phép đọc mới** trên **hai** commit:

| Phép đọc | Commit | Thẻ "Việc tôi giao — chờ duyệt" sau khi đánh thức |
|---|---|---|
| MỚI (đọc `.stat > .v`) | `a1e5671` (vòng 1) | **2** ❌ máy chủ đã 0 — **L1 là lỗi THẬT** |
| MỚI (đọc `.stat > .v`) | `67cb0b1` (vòng 2) | **0** ✔ **L1 đã đóng** |

```
$ AGC_COMMIT=a1e5671 node scripts/soi-tu-lam-moi-2.mjs
   ⇒ Thẻ "Việc tôi giao — chờ duyệt" = 2   ❌ NÓI DỐI
$ node scripts/soi-tu-lam-moi-2.mjs
   ⇒ Thẻ "Việc tôi giao — chờ duyệt" = 0   ✔ ĐÚNG (đã bắt kịp)
```

Nói cho sòng phẳng: **dòng ❌ mà bàn soi tôi in ra ở ca "SAU" là oan** — nó đọc "02" thay
vì "0". Trong *báo cáo* vòng 1 tôi đã đọc lại chuỗi thô và kết luận đúng ("2 → 0 ✔"), nhưng
một bàn đo in ❌ trên bản lành là một bàn đo hỏng, mà tôi lại đang dùng chính nó để chấm bài
người khác. Nhận, sửa, đo lại trước khi kết luận bất cứ điều gì khác.

---

## ① Sáu lỗi vòng 1 — đóng thật hay đóng miệng

### L1 (CAO) — thiếu `await` ở ba đường đánh thức → **ĐÓNG**

`lam-moi.js:287` (`lamMoiManVuaMo` nay `async`, `await chay(n)` ở **292**) và `:449`
(`thuLaiNguoiHoan` nay `async`, `await chay(n)` ở **458**), khớp với `xa()` ở **380**.

**Đo hành vi** (`soi-tu-lam-moi-2.mjs`, Chrome thật): đứng Tổng quan (thẻ 2) → sang Tài
sản → duyệt xong (máy chủ về 0) → quay lại Tổng quan → thẻ = **0**. Ca "gõ dở → rời ô"
cũng đúng (`soi-tu-lam-moi.mjs` mục E: hoãn **0 lượt**, chữ còn nguyên, rời ô là nạp nốt).

**Phép soi tĩnh ③c có răng thật — tôi thử hai cách:**

| Tôi gài | ③c |
|---|---|
| Gỡ `await` ở `xa()` — **chỗ thứ ba, không phải hai dòng đã biết** | ❌ "THIẾU AWAIT ở dòng 380" |
| **Thêm một đường đánh thức MỚI** (`duongMoiAiDoThemNgayMai`) rồi quên `await` | ❌ "cả 4 chỗ gọi chay(n)… THIẾU AWAIT ở dòng 288" |

Nó đếm **mọi** dòng gọi `chay(n)`, không canh hai dòng cứng. Đổi tên tham số (`chay(nguoi)`)
cũng đỏ, vì có chốt `goiChay.length >= 3`. **Đúng cách một phép soi tĩnh phải làm.**

### L2 (CAO) — hai tuỳ chọn `goc` lạc chỗ → **ĐÓNG, kiểm đủ 14 nhóm**

`{goc:…}` đã về đúng hai lời đăng ký (`app.js:181` và `:283`), hai đối số chết đã xoá.
Lời khai vòng 1 là "sai với **3/14** nhóm", nên tôi mở rộng bàn soi lên **đủ 14 nhóm**
(vòng 2 khai 6):

```
tai_san 0 (ngủ✔) · kho 0 (ngủ✔) · hoan 0 (ngủ✔) · nhan_su 0 (ngủ✔) · ho_so 0 (ngủ✔)
du_lieu_nen 0 (ngủ✔) · ca 0 (ngủ✔) · gop_y 0 (ngủ✔) · tai_khoan 0 (ngủ✔) · tai_lieu 0 (ngủ✔)
muc_tieu 1 · viec 1 · vinh_danh 2 · thong_bao 1
```

Bốn nhóm còn gọi đều **ĐÚNG**: `muc_tieu` · `viec` · `vinh_danh` là những khối nằm ngay
trên tab Tổng quan — tab đang mở, phải nạp; `thong_bao` (chuông) **cố ý không khai `goc`**
để luôn thức. **Không nhóm nào gọi oan.** Vòng 1 hai nhóm `nhan_su`/`ho_so` ra 1 lượt, nay
ra 0.

Gõ dở ở `#ns-tim`: vòng 1 **1 lượt** (không hoãn) → vòng 2 **0 lượt** (có hoãn), đài
`{"hoan":1}`. Đóng.

### L3 (VỪA) — bàn đo mù → **ĐÓNG, và tôi gài thêm ba lỗi KHÁC nữa**

Tôi dựng phòng gài lỗi riêng (bản sao `public/`+`scripts/`, không đụng cây làm việc):

| Lỗi tôi gài | Vòng 1 | Vòng 2 |
|---|---|---|
| ① Gỡ đăng ký nghe của chuông | BẮT | BẮT |
| ② Bỏ chống-chạy-hai-lần (`lam-moi.js:301`) | **MÙ** | **BẮT** (⑩b, ❌ ×2) |
| ③ Ghi HỎNG cũng bắn tín hiệu (`api.js`) | **MÙ** | **BẮT** (⑩c, ❌ ×2) |
| ④ **MỚI** — bắn SAI TÊN NHÓM (`cvCapNhat: 'viec' → 'viec_go_nham'`) | — | **BẮT — ❌ ×7** |
| ⑤ **MỚI** — gỡ phép gộp 60ms | — | **BẮT — ❌ ×2** (`muc-tieu×2`, tổng 7≠6) |
| ⑥ **MỚI** — một màn đăng ký nghe HAI LẦN | — | **BẮT — ❌ ×4** |

**Chốt tự kiểm "gài được lỗi chưa" có thật.** Tôi làm cả ba chuỗi thay thế trượt (đổi
thành chuỗi không tồn tại) — bàn đo **đỏ 4 chỗ**, không hề lặng lẽ xanh:

```
❌ ⑩b0 gài được lỗi vào bản tạm  — CHUỖI THAY THẾ TRƯỢT — sửa bàn đo
❌ ⑩b BỎ CHỐNG CHẠY HAI LẦN → …  — KHÔNG thấy nhân đôi — BÀN ĐO MÙ, sửa bàn đo trước
❌ ⑩c0 gài được lỗi vào bản tạm  — CHUỖI THAY THẾ TRƯỢT — sửa bàn đo
❌ ⑩c GHI HỎNG CŨNG BẮN → …      — 0 lượt thêm — BÀN ĐO MÙ, sửa bàn đo trước
```

`QUYEN` đã thêm `dulieunen` (`do-tu-lam-moi.mjs:129`) — bốn người nghe trước nay chưa từng
được nạp lần nào, nay có nạp.

### L4 (VỪA) — ba con số đếm lại được → đóng một nửa, xem mục ②
### L5 (VỪA) — lời khai lệch số → xem bảng ở mục ⑦
### L10 (THẤP) — bộ đếm trôi · hai lượt xả chồng · `can_ly_do` → **ĐÓNG cả ba**

`lam-moi.js:376` (`if (!n.hoan) dem.hoan++`), `batDauXa()` xếp hàng thay vì chạy chồng
(`:337-347`), và `CHUA_LUU_DU` ở `api.js:16-24`. Ca ⑨b của bàn đo chứng minh: mã 200 kèm
`can_ly_do` → **0 lượt gọi thêm**.

> **Vì sao có ca "trả 200 mà chưa lưu"** — tôi hỏi cho ra: `api.js:63-67` ghi rõ,
> `/api/nhan-su/hop-dong/luu` trả `{can_ly_do:true}` khi bản hợp đồng sắp ghi **vi phạm
> BLLĐ Đ.20**. Máy chủ **chặn mềm**: chưa ghi, đợi người nhập gõ một dòng lý do rồi bấm
> lại. Đây là ca THẬT của nghiệp vụ, không phải mã lạ — và đúng là không được bắn tín hiệu
> ở nước đó. Chỉ tiếc bảng `CHUA_LUU_DU` là **danh sách viết tay**: cửa thứ hai kiểu này
> thêm vào ngày mai sẽ lại bị quên, y hệt lớp bệnh đang vá. Không chặn, nhưng nên có một
> phép soi (thí dụ: mọi hàm ghi trả về khoá bắt đầu bằng `can_`/`chua_` phải có mặt ở đây).

---

## ② CAO-1 · Nhiều tab: "tab ẩn vẫn ngủ, không tốn thêm lượt đọc" — **SAI với tab TRÌNH DUYỆT**

`hienThi()` (`lam-moi.js:426`) quyết định ngủ/thức bằng `offsetParent` + `getClientRects()`.
Tôi hỏi thẳng một tab đang nằm nền:

```
tab2 (đang ở nền): {"hidden":true, "visibility":"hidden",
                    "offsetParent_conNull":false, "soHinhChuNhat":1}
```

**Hai thứ đó không biết tab trình duyệt đang ẩn.** Tab nền vẫn được bố cục đầy đủ, nên
`hienThi()` trả `true` và **tab không ngủ**. Giá thật (`scripts/soi-gia-nhieu-tab.mjs`,
Chrome thật, mọi tab đứng ở Tổng quan — đúng thói quen làm việc):

| Số tab ERP mở | `origin/main` | Bản vá | Chênh |
|---|---|---|---|
| 1 | 4 lệnh gọi | 5 | **+1** ✔ đúng lời khai |
| 2 | 4 | 9 | **+5** |
| 3 | 4 | 13 | **+9** |
| 4 | 4 | 17 | **+13** |

Mỗi tab ERP mở thêm tốn **+4 lệnh gọi cho MỖI cú bấm** — và đó là những tab **không ai
đang nhìn**. Lời khai "**+1 mỗi cú bấm**" chỉ đúng khi mở **đúng một** tab; "**tab ẩn: 0
lệnh gọi**" chỉ đúng với tab **trong ứng dụng** (cái đó thì đúng thật — mục D của
`soi-nhieu-tab.mjs`: tab4 chuyển sang màn Tài sản thì `cong-viec/danh-sach` còn ×3, không ×4).

**Chính ERP này đã có sẵn cách làm đúng**: mô-đun chat nghe `visibilitychange` và tắt nhịp
tim khi tab ẩn (`app.js:4303-4304`). Đài làm mới không dùng. Và dòng
`do-luot-doc-lam-moi.mjs:105` in "Tab đang ẩn : 0 lệnh gọi" là **chuỗi viết cứng**, không
phải số đo — nó in ra bất kể sự thật.

**Có chạm trần không: CHƯA.** Số nền `REV-0033`: `read_queries_24h = 46.597` / trần Workers
**100.000 request/ngày**; `rows_read_24h = 2,39M` / trần **5 triệu**.

| Kịch bản | Request thêm/ngày | Tổng | Chạm trần? |
|---|---|---|---|
| 2.000 lượt ghi, ai cũng 1 tab | +2.000 | 48,6k | không |
| 2.000 lượt ghi, trung bình 2 tab | +10.000 | 56,6k | không |
| 3.000 lượt ghi, Sếp + kho hay mở 3 tab | +27.000 | 73,6k | **còn 26%** |

An toàn hôm nay, nhưng biên đã mỏng đi thấy rõ, và đây là ERP **đã một lần vượt hạn mức**.

**Còn lại thì tính năng nhiều tab làm ĐÚNG** — tôi soi kỹ vì đây là mã mới:

- **Ba, bốn tab**: cả 4 tab cùng về đúng số. Không tab nào sót.
- **Không dội qua dội lại**: mỗi tab nhận **đúng 1 tin** cho một cú bấm (`onmessage` gọi
  `xepHang`, **không** gọi `baoDuLieuDoi`, nên không phát tiếp — `lam-moi.js:313-315`).
  Nếu là vòng lặp thì con số này phải tăng vô hạn; nó đứng yên ở 1.
- **KHÔNG rò dữ liệu** — đây là chỗ tôi soi kỹ nhất. Nguyên văn tin nhắn:
  `{"nhom":["viec","muc_tieu","thong_bao"]}`. **Chỉ tên nhóm, không một byte dữ liệu.**
  Tab nhận tự gọi máy chủ bằng **cookie phiên của chính nó**, nên máy chủ vẫn là chỗ quyết
  ai xem được gì. Đây là thiết kế đúng, không phải may.
- **Đóng tab đột ngột**: 4 tab → đóng 1 → bấm tiếp ra đúng 3 lượt, **0 lỗi console mới**.
- **Hết phiên (401)**: tab bị 401 tự đá về `index.html`; không tab nào treo, không vòng lặp.
  (Ca này bàn soi của tôi đo *không sạch* — máy giả vẫn trả 200 cho `/api/toi-la-ai` nên
  màn đăng nhập đẩy ngược về `app.html`. Tôi nói ra chỗ phép đo của mình yếu, không kết luận
  quá lời: chỉ khẳng định **không treo, không vòng lặp**.)
- **Hai tài khoản cùng máy**: không dựng được ca thật (phiên nằm trong cookie HttpOnly dùng
  chung cho cả hồ sơ trình duyệt, nên hai tab **không thể** là hai tài khoản khác nhau).
  Và kể cả có thì tin nhắn không chở dữ liệu, nên không rò được gì.

**Cách sửa** (nhỏ): trong `hienThi()` thêm `if (document.hidden) return false;`, và nghe
`visibilitychange` để đánh thức khi người dùng quay lại — đúng khuôn `app.js:4303` đã có.
Kèm một ca bàn đo: 3 tab, 2 tab ẩn → chỉ 1 tab gọi máy chủ.

---

## ③ CAO-2 · Bản kiểm kê 26 khối là ĐỊNH NGHĨA VÒNG TRÒN — và nó bỏ sót một khối rổ A thật

`do-kiem-ke-lam-moi.mjs:64-90` — bảng `KHOI` là **26 dòng viết tay**, và tệp tự khai
(dòng 20): *"Lấy danh sách khối hiển thị = **những khối bản vá đăng ký nghe**"*.

Đó là vòng tròn: **một khối không ai nối dây thì không bao giờ lọt vào bảng, nên không bao
giờ bị xếp vào rổ A** — đúng thứ bản kiểm kê sinh ra để bắt.

Tôi đi tìm bằng trình duyệt thật (`scripts/soi-khoi-bo-sot.mjs`), có ca đối chứng:

```
① Bảng "Khách hoàn nhiều" (CSKH, tab Kinh doanh) — app.js:6796
   đứng ở tab kinhdoanh, ghi kdDaDoiSoat → /api/kinh-doanh/khach-hoan-nhieu: 0 lượt
   ❌ KHÔNG tự nạp lại — khối này vẫn kể số cũ

② Ma trận Xếp ca tuần — app.js:8220
   đứng ở tab xepca, ghi caDangKy → /api/ca/ma-tran-tuan: 0 lượt   ❌

③ ĐỐI CHỨNG: bảng Đối soát sàn (CÓ đăng ký nghe), cùng cú ghi
   → /api/kinh-doanh/can-doi-soat: 1 lượt   ✔ CÓ tự nạp lại
```

Đối chứng ③ xanh nên khác biệt nằm ở **chỗ đăng ký nghe**, không nằm ở phép đo.

**① là lỗi thật và vẫn còn sống.** `khoiDongCSKH()` gọi `API.kdKhachHoanNhieu()` **đúng
một lần lúc mở trang** (`app.js:5970`) rồi thôi. Bảng đó hiển thị dữ liệu **đơn hoàn** —
nhóm `hoan`, nhóm ĐÃ được phủ. Chị Huyền phân loại đơn hoàn cả ngày trên đúng tab đó, và
bảng "Khách hoàn nhiều" bên cạnh vẫn kể số của lúc chị mở máy. **Đó chính xác là câu
"đã duyệt hoàn thành mà nó vẫn hiện ở đây", chỉ đổi màn.**

② nhẹ hơn: trên `main` **mọi** nút trong khối đó đều nhớ gọi tay `taiMaTran()` (6 chỗ:
`app.js:8430 · 8441 · 8448 · 8465 · 8481 · 8514`) nên hôm nay nó đúng — nhưng nó vẫn đang
sống bằng **trí nhớ**, đúng thứ bản vá này tồn tại để bỏ đi. Nút thứ 7 thêm ngày mai sẽ quên.

**Không phải lỗi mới** (cả hai đã hỏng sẵn trên `main`) — nhưng lời khai "quét cả lớp,
26 khối, 4-20-2" **khẳng định lớp đã được liệt kê hết**, và nó chưa. Theo luật
`LUAT-GOP-Y-LA-TRIEU-CHUNG.md` thì chính lời khẳng định đó là thứ phải đúng.

**Cách sửa** (nhỏ): `ngheDuLieu('hoan', khoiDongCSKH, { goc: oTab('kinhdoanh') })` và
`ngheDuLieu('ca', taiMaTran, { goc: oTab('xepca') })`; rồi đổi bảng `KHOI` từ "khối nào
đăng ký nghe" sang **"khối nào gọi một API ĐỌC rồi vẽ"** — máy dò được, và lúc đó rổ A
mới có nghĩa.

---

## ④ Kết luận độc lập về **26 khối / 4-20-2**

**Số chỗ gọi hàm ghi.** Tôi đếm độc lập trên `origin/main`, quét **13 tệp giao diện** (bàn
kiểm kê chỉ quét 3):

| | |
|---|---|
| Chỗ **gọi** `API.<hàm ghi>(` | **117** |
| Chỗ **truyền** `API.<hàm ghi>` làm tham số (không có ngoặc) | **13** |
| **Tổng** | **130** |
| Bàn kiểm kê khai | **121** |

Chênh **121 vs 117** đã truy tận nơi, và **cả hai bên đều sai một ít**:

- Bàn kiểm kê đếm **theo lần xuất hiện**, kể cả hai lời gọi cùng một hàm trên **cùng một
  dòng** (thí dụ `main:7130` có `API.dlnSuaPhongBan(...)` hai lần) — 5 chỗ như vậy. Cách
  đếm đó **hợp lý hơn** cách gộp của tôi.
- Nhưng nó **mất 2 chỗ** ở `quet-tai-lieu.js:1798-1799` (`tlLuuTep`, `tlLuu`) vì lỗi bóc
  chuỗi ở VỪA-1 dưới đây, và **bỏ hẳn** 13 chỗ truyền-làm-tham-số.

→ Con số đúng nhất tôi dựng được: **123 chỗ gọi + 13 chỗ truyền**. "121" lệch **2**, và
lệch vì một lỗi thật trong máy soi, không phải vì chọn đơn vị khác.

**Ba rổ 4 / 20 / 2 — tôi soi từng khối rổ A, và 2 trong 4 xếp SAI:**

| Khối | Bàn kiểm kê | Tôi kiểm | Bằng chứng |
|---|---|---|---|
| Thẻ tóm tắt Trạm Mục Tiêu | rổ A (0/9) | **A — ĐÚNG** | vòng 1 tôi đo trên Chrome: bấm đúng nút "Duyệt xong" trên `main`, thẻ **2 → 2** |
| Chuông thông báo 🔔 | rổ A (0/21) | **A — ĐÚNG** | `main` chỉ gọi `taiThongBao` ở 3 chỗ: mở chuông (7067), lúc nạp (7099), `setInterval` 5 phút (7100). Không chỗ ghi nào |
| Kho danh mục nền dùng chung | rổ A (0/24) | **SAI → rổ B** | `main:7128` `lamMoiTatCa()` **có** `await taiDanhMucNen()`, mà `lamMoiTatCa()` được gọi ở `main:7149 · 7157 · 7165` sau ba nút Thêm; cộng 2 đường `capNhatDs: window.LAM_MOI_DANHMUC_NEN` (`main:4928 · 5699`) |
| Kho tài liệu | rổ A (0/1) | **SAI → rổ C** | `main:9877` `if (typeof khiXong === 'function') khiXong();` ngay sau `API.tlSua`, và `main:10139` truyền `khiXong = nap` |

**Vì sao xếp sai — một nguyên nhân, hai biểu hiện.** `duongToi()`
(`do-kiem-ke-lam-moi.mjs:145-158`) không đi qua được hai thứ:
① hàm gọi nằm **trong một hàm khởi động khác** — bị chặn bởi
`if (v.trong !== k.trong && v.trong !== '') continue;` (ca "Kho danh mục nền");
② hàm **truyền làm tham số** rồi gọi qua tên khác (`khiXong`) (ca "Kho tài liệu") — đúng
cái điểm mù đã làm hỏng phép đếm vòng 1.

**Số của tôi, trên chính 26 khối đó: rổ A = 2 · rổ B = 21 · rổ C = 3.**
Cộng khối bị bỏ sót ở mục ③ (CSKH — rổ A thật): **A = 3**.

**Rổ C chỉ 2 có quá khắt khe không: CÓ, một ít.** Cửa sổ dò chỉ **34 dòng** sau lời gọi
(`:171`) và đồ thị gọi chỉ **2 mức** (`:148`) — cả hai đều làm phép phân loại nghiêng về
"tệ hơn thực tế". Sửa hai điểm mù ở trên đã đưa rổ C từ 2 lên 3. **Nhưng hướng lệch này là
hướng AN TOÀN** cho một bản tự kiểm, và nó **không làm sai kết luận nào** của bản vá: vá ở
tầng `api.js` nên rổ nào cũng được phủ. Ba con số này là để **mô tả bệnh cũ**, không phải
để nghiệm thu bản vá.

**Điều đáng ghi**: vòng 1 tôi đếm theo NÚT và ra A=1 (thiếu); vòng 2 đếm theo KHỐI và ra
A=4 (thừa 2). Hai vòng, hai chiều sai ngược nhau, cùng một nguyên nhân: **đồ thị gọi hàm
dựng bằng regex không đi hết được đường**. Con số nay **đếm lại được** — đó là tiến bộ thật
so với vòng 1 (không có máy nào sinh ra 1/50/64) — nhưng đừng khai nó như một sự thật đã chốt.

---

## ⑤ VỪA-1 · Máy bóc chú thích dùng chung không hiểu **regex literal** → mù 350+ dòng mã

`scripts/lib/soi-doi-so-thua.mjs:19` (`lamSachMa`) coi mọi dấu `'` `"` `` ` `` là mở chuỗi.
Nó **không biết regex literal**. Gặp `quet-tai-lieu.js:281`:

```js
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => …);
//                                            ↑↑ hai dấu này mở một "chuỗi" không bao giờ đóng
```

**Từ dòng 284 trở đi cả tệp bị xoá trắng.** Đo được:

| Tệp | Tổng dòng | Dòng **MÃ** bị xoá trắng oan |
|---|---|---|
| `quet-tai-lieu.js` | 1.354 | **244** (18%) |
| `app.js` | 10.350 | **107** (từ dòng 754 — gồm `dg`, `caoTheoChu`, `avHtml`, `tienVN`, `xuatCSV`, `ganCombo`, `moHopNhap`…) |

Hậu quả đo được:

1. **`soiDoiSoThua` mất 18/318 hàm** khỏi bảng số tham số của `app.js`:
   `dg caoTheoChu noiDayONhieuDong avHtml nhanNhanSu uuTienCungPhongBan ganCombo
   capNhatHienThi dongKhiCuon mo dong chon taoMoiVaChon moHopNhap onSubmit onNenClick
   tienVN xuatCSV`.
   Tôi gài `tienVN(1, {goc:2})` (hàm nằm trong vùng mù) → **KHÔNG BẮT ĐƯỢC**.
   Gài `veDaiViecCanLam(1,2,3)` (ngoài vùng mù) → **BẮT ĐƯỢC**. Cùng một lớp lỗi, khác
   nhau chỉ ở chỗ nó rơi vào đâu trong tệp.
2. **Bàn kiểm kê mất 2 chỗ ghi** `tai_lieu` ở `quet-tai-lieu.js` — nên in "Kho tài liệu
   (0/**1**)" thay vì 0/3.

**Máy soi bắt được bao nhiêu phần của lớp "truyền thừa đối số"?** Tôi dựng lại **đúng hai
lỗi CAO của vòng 1** rồi cho nó soi:

| Lỗi thật của vòng 1 | `soiDoiSoThua` (③e) | Bàn đo tổng thể |
|---|---|---|
| `{goc:…}` lạc vào `Array.prototype.filter` (`app.js:223`) | **KHÔNG** — `filter` là hàm dựng sẵn, không khai trong tệp nên không có trong bảng | bắt được, nhưng bằng ca **hành vi** ⑥b/⑥c |
| `{goc:…}` thành tham số thứ 4 của `veBang` (`app.js:444`) | **CÓ** — `veBang(…) truyền 4/nhận 3 (khai ở dòng 1923)` | ❌ ③e |

Dựng lại **nguyên vẹn cả hai** rồi chạy bàn đo đầy đủ: **ĐẠT 40 · TRƯỢT 3** (③e + ⑥b + ⑥c).
**Cái lưới đóng được lớp đó** — nhưng đóng bằng ca hành vi, không phải bằng máy soi tĩnh,
và máy soi tĩnh đang mù mất 5,7% số hàm.

**Cách sửa**: `lamSachMa` cần biết regex literal (dò ký tự trước `/`: nếu là
`( , = : [ ! & | ? { ; return` thì đó là regex, không phải phép chia). Kèm một chốt tự kiểm:
số dòng bị xoá trắng mà vẫn còn `function`/`const` ở bản gốc phải bằng 0.

---

## ⑥ VỪA-2 · ③d là phép dò theo KHOẢNG CÁCH — nó xanh trên đúng cái lỗi nó được viết ra để bắt

`do-tu-lam-moi.mjs:169-183`: một `{ goc: … }` bị coi là "gắn đúng" nếu **trong 400 dòng phía
trên** có bất kỳ dòng nào chứa `ngheDuLieu(`.

Tôi cắm lại `{goc: oTab('nhansu','quantri')}` vào `ds.filter(…)` ở **đúng `app.js:223`** —
cách lời `ngheDuLieu` ở dòng 133 chỉ 90 dòng:

```
✅ ③d không tuỳ chọn `{ goc: … }` nào lạc khỏi ngheDuLieu — mọi `{ goc: … }` đều gắn đúng
ĐẠT 43 · TRƯỢT 0
```

Nó **có thể** đỏ — tôi đặt một `{goc:…}` cách xa mọi `ngheDuLieu` hơn 400 dòng thì ra
`❌ LẠC ở dòng 742`. Nhưng trong tệp này mọi lời đăng ký đều nằm ngay cạnh mã của nó, nên
vùng ③d thật sự canh được là rất hẹp.

**Không chặn** — ③e và ⑥b/⑥c gánh được lớp đó (chứng minh ở mục ⑤). Nhưng một phép soi
xanh trên chính ca của mình là **sự yên tâm giả**, và lần sau sẽ có người tin nó.
Sửa: thay phép dò khoảng cách bằng phép dò cấu trúc — dòng `}, { goc: … });` phải khớp
đúng dấu ngoặc của một lời `ngheDuLieu(` đang mở.

---

## ⑦ VỪA-3 · Lời khai lệch số đo

| Khai | Tôi đo | |
|---|---|---|
| "26 khối hiển thị" | **≥ 28** — thiếu ít nhất bảng CSKH (`app.js:6796`) và ma trận Xếp ca (`:8220`) | mục ③ |
| "rổ A = 4" | **A = 2** trong 26 khối (2 xếp sai), **= 3** nếu tính khối bỏ sót | mục ④ |
| "rổ C = 2" | **3** sau khi sửa hai chỗ xếp sai | mục ④ |
| "121 chỗ gọi hàm ghi" | **123 gọi + 13 truyền tham số** | mục ④ |
| "+1 lệnh gọi mỗi cú bấm" | **+1 với 1 tab · +5 với 2 tab · +9 với 3 tab · +13 với 4 tab** | mục ② |
| "tab ẩn vẫn ngủ, không tốn thêm lượt đọc" | đúng với tab **trong ứng dụng**; **SAI** với tab **trình duyệt** | mục ② |
| "`soi-doi-so-thua`: bản lành 0 chỗ, gài thử bắt được" | đúng — **nhưng** nó không soi 107 dòng của `app.js` và 244 dòng của `quet-tai-lieu.js`, và không bắt được 1 trong 2 lỗi CAO của vòng 1 | mục ⑤ |
| "`git diff origin/main...HEAD -- scripts/` chỉ có **1** dòng xoá" | **2** dòng (`lib/ban-do-chrome.mjs` 1 · `do-hop-sua-muctieu.mjs` 1) | dưới đây |
| "bàn soi của Hồ Ly in ❌ là lỗi cắt chuỗi của nó" | **ĐÚNG** — lỗi của tôi | mục ⓪ |
| "43 phép, trượt 0" | **ĐÚNG** — tự chạy | mục ⑧ |
| "26/26 khối soi được" | **ĐÚNG** với bảng nó tự khai | |
| "gộp `main` mang vào `tlLuuTep`+`tlSua` chưa khai → bàn đo đỏ ngay" | **ĐÚNG** | dưới đây |
| "Cơ cấu tổ chức vẫn tải hai lượt, +3 lệnh gọi" | **ĐÚNG chính xác** | dưới đây |
| "+1 / −2 / 0" (1 tab) | **ĐÚNG** — 45→43 lúc mở trang, 4→5 mỗi cú bấm | |

**Cái lưới TỰ BẮT ĐƯỢC NGƯỜI KHÁC — xác nhận, và đây là bằng chứng đáng ghi.**
Tôi gỡ `tlLuuTep` + `tlSua` khỏi bảng nhóm (giả làm đúng lúc vừa gộp `main`):

```
❌ 110 hàm ghi đều đã khai — CHƯA KHAI: tlLuuTep, tlSua
   → thêm vào NHOM_DU_LIEU (hoặc MIEN_TRU kèm lý do) trong public/assets/js/lam-moi.js
```

Hai hàm ghi từ một nhánh **hoàn toàn khác** (đọc chữ PDF), do người khác viết, không ai
nghĩ tới chuyện làm mới màn hình — cái lưới **chặn ngay lúc gộp**, gọi đúng tên, chỉ đúng
tệp phải sửa. **Đây đúng là thứ kiến trúc này sinh ra để làm**, và nó đã làm thật, một lần,
với người thật. Ghi lại.

**Hai dòng xoá trong `scripts/` — KHÔNG phải nới lỏng.** Tôi đọc cả hai:
`lib/ban-do-chrome.mjs` nới danh sách tệp `suaTep` từ 2 lên 4 (đã kiểm vòng 1: cả 6 bàn đo
cũ đều tự lọc theo tên tệp, không bàn nào đổi hành vi); `do-hop-sua-muctieu.mjs:119` sửa
đúng cái chú thích đã thành cũ mà tôi nhắc ở vòng 1. Cả hai là **sửa cho đúng**, không phải
nới cho vừa.

**Màn Cơ cấu tổ chức vẫn tải hai lượt — chấp nhận được.** Đo lại:

```
tab tongquan → 4 lệnh gọi   (vòng 1 là 6 — phần rò nhan_su/ho_so đã hết)
tab khovan   → 6 lệnh gọi
tab quantri  → 10 lệnh gọi   ⚠ phong-ban×2 · chuc-danh×2 · don-vi×2   (đúng "+3")
```

Lý do trong mã (`app.js:7196-7203`) nói thật và nói đủ: bỏ lượt hai thì những chỗ gọi TAY
`lamMoiTatCa()` sẽ vẽ từ kho cũ — tức lại đúng cái bệnh đang vá. Chỉ rơi vào thao tác của
Admin trên một màn, không phải việc hằng ngày của ai. **Đánh đổi đúng, và đã khai ra.**

---

## ⑧ Cổng đo — tôi tự chạy lại HẾT

| Cổng | Khai | Tôi đo |
|---|---|---|
| `cong-khoi` (1440px) | XANH | ✅ **XANH** · `loi_console: []` · `ngoai_le: []` |
| `cong-khoi-dienthoai` (375px) | XANH | ✅ **XANH** |
| `do-ba-mau` | 12/12 | ✅ **12/12** |
| `do-cat-im-lang` | SẠCH | ✅ **SẠCH** |
| `do-chu-dai` | XANH | ✅ **XANH** |
| `do-moc-noi` | 9/0 | ✅ **ĐẠT 9 · TRƯỢT 0** |
| `do-chat-noibo` | XANH | ✅ **XANH** |
| `do-hop-sua-muctieu` | XANH | ✅ **XANH** |
| `do-tu-lam-moi` | 43/0 | ✅ **ĐẠT 43 · TRƯỢT 0** |
| `do-luot-doc-lam-moi` | +1/−2/0 | ✅ **+1 / −2 / 0** (1 tab — xem mục ②) |
| `do-kiem-ke-lam-moi` | 26/26 | ✅ **26/26** (bảng của nó — xem mục ③) |
| Ba bàn soi của tôi | — | ✅ chạy sạch, 0 ngoại lệ ở cả 5 vai trò |

**Luật ba màu · 44px · 375px**: cổng khói 375px và `do-ba-mau` xanh. **Chi phí 0**:
`package.json` vòng 2 chỉ thêm **1 dòng** `scripts` (`do-kiem-ke-lam-moi`), **không thêm gói
nào**; `BroadcastChannel` là thứ có sẵn trong trình duyệt.

---

## ⑨ Gộp `origin/main` — sạch, nhưng nhánh nay đã LẠC HẬU 5 commit

**Gộp `fc1b727` không mất mã.** `git merge-base HEAD origin/main` = `fc1b727` → nhánh chứa
**trọn vẹn** commit đó. Không còn dấu xung đột nào (`<<<<<<<` / `>>>>>>>`) trong
`public/assets/js/*.js` và `src/*.js`. Vùng chồng lấn (`app.js`) đọc tay: bốn khối
làm-mới (`goc` ở dòng 181 · 283, hai chỗ gỡ đối số thừa) nằm gọn, không đè lên phần đọc chữ
PDF; phần PDF (`nutSuaTaiLieu`, `noiNutSuaTaiLieu`, `veChuCoSo`, dải `#tl-dem-chu`) còn đủ.
Cổng khói **sau gộp** xanh ở cả hai bề ngang — mã sống thật, không chỉ hợp cú pháp.

**Nhưng `origin/main` đã đi tiếp trong lúc tôi soi.** Lúc tôi bắt đầu nó là `fc1b727`;
bây giờ là **`ad4bc95`** ("cắt khung văn bản kiểu CamScanner"), **hơn nhánh này 5 commit**:

```
$ git rev-list --count HEAD..origin/main   → 5
ad4bc95 · 861f463 · 2e6d2f6 · 1468f33 · c569450
```

Phải gộp lại trước khi đẩy. Và đó cũng là **THẤP-1**: `do-kiem-ke-lam-moi.mjs:33` ghim vào
`origin/main` — một cái mốc **biết đi**. Bàn đo sinh ra để con số đếm lại được mà lại đo
trên mốc trôi thì tháng sau hai người chạy sẽ ra hai kết quả. (Lần này số **không đổi** —
tôi chạy cả `origin/main` lẫn `fc1b727`, đều 121 / 26 / 4-20-2 — nhưng đó là may.)
Sửa: mặc định ghim vào `git merge-base HEAD origin/main`.

---

## ⑩ Những chỗ khác vẫn đúng (đo lại, không chép lời khai)

- **Không vòng lặp**: sau một cú ghi, hệ thống đứng yên; 4 giây sau chỉ thêm
  `chat/tin-nhan` + `chat/chua-doc` — nhịp tim chat có sẵn từ trước.
- **Không rò rỉ đăng ký**: mở/đóng tab **20 lần** rồi bấm → **6 lệnh gọi**, y hệt lần đầu.
- **Ghi hỏng (500)**: 0 lượt gọi thêm, đài `{ban:0, chay:0}`.
- **Gộp trong khoảnh khắc**: 10 cú bấm **cùng lúc** → **1 vòng** (15 lệnh gọi, 10 trong đó
  là lệnh ghi). 10 cú cách nhau 250ms → 10 vòng — đúng, mỗi lần ghi thật phải làm mới thật.
- **Lỗi Đối soát sàn của chị Hằng** vẫn đóng: `main` ném
  `TypeError: Cannot read properties of null (reading 'addEventListener')` tại
  `app.js:6903`, bản vá **0 ngoại lệ**, `#kd-ds-dem` = "0 đơn cần đối soát".
  Quét 5 vai trò × mở hết tab: `main` 1·2·1·1·1 ngoại lệ → bản vá **0·0·0·0·0**.

---

## Việc phải làm trước khi gộp

1. **CAO-1** — `hienThi()` thêm `document.hidden` + nghe `visibilitychange` (khuôn có sẵn
   ở `app.js:4303`). Kèm ca bàn đo: 3 tab, 2 tab ẩn → chỉ 1 tab gọi máy chủ. Và sửa dòng
   viết cứng `do-luot-doc-lam-moi.mjs:105` thành số **đo được**, kèm cột "theo số tab".
2. **CAO-2** — nối dây cho `khoiDongCSKH` (`app.js:6796`) và `taiMaTran` (`:8220`); đổi
   bảng `KHOI` từ "khối nào đăng ký nghe" sang "khối nào gọi API đọc rồi vẽ" để hết vòng tròn.
3. **VỪA-1** — `lamSachMa` phải hiểu regex literal; thêm chốt tự kiểm "0 dòng mã bị xoá oan".
4. **VỪA-2** — ③d dò theo cấu trúc ngoặc thay vì khoảng cách 400 dòng.
5. **VỪA-3** — sửa lời khai: 26→≥28 khối · rổ A 4→2 (+1 bỏ sót) · rổ C 2→3 · 121→123+13 ·
   "+1" ghi rõ *"khi mở một tab"* · "1 dòng xoá"→2.
6. **THẤP** — ghim kiểm kê vào `merge-base`; gộp lại 5 commit mới của `origin/main`;
   `CHUA_LUU_DU` nên có phép soi thay vì danh sách tay.

Sáu việc, không việc nào đụng kiến trúc. **Bản vá gốc đã lành; phần việc mới của vòng 2 thì
chưa xong.**
