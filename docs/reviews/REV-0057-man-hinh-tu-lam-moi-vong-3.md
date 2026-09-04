# REV-0057 vòng 3 — Màn hình tự làm mới

**Kết luận: FAIL** (0 CHẶN · **1 CAO**, và lỗi CAO đó nằm ở **dụng cụ đo**, không ở sản phẩm)

**Hai lỗi CAO của vòng 2 đã đóng thật**, tôi đo lại bằng trình duyệt với điều kiện đo được
kiểm chứng, không tin lời khai. **Sản phẩm gần như sạch**: tôi chỉ còn tìm được **một** khối
hiển thị nói dối, và nó là chỗ Khỉ Đột đã tự khai và tự cân nhắc để lại.

Lỗi CAO còn lại: **bản kiểm kê tự dò đã THOÁT vòng tròn thật** — tôi giấu một khối vào mã và
nó tìm ra — **nhưng nó đổi lấy một vùng mù có hình dạng khác**, và vùng mù đó che đúng khuôn
viết mã phổ biến nhất của chính ERP này. Tôi có phản ví dụ chạy được.

Hồ Ly soi `d65b9ea`. Không commit, không sửa một dòng mã sản phẩm nào.

| | |
|---|---|
| CHẶN | 0 |
| CAO | 1 (bản kiểm kê — không phải sản phẩm) |
| VỪA | 4 |
| THẤP | 2 |
| Vòng 2: CAO-1 · CAO-2 · VỪA-1 · VỪA-2 · VỪA-3 · THẤP | **ĐÓNG hết** |
| Cổng đo | **11/11 XANH đúng lời khai** |
| Khối hiển thị còn nói dối | **1** (ô chọn Phòng ban ở màn Xếp ca — cố ý để lại) |

> **Và một chuyện về chính tôi.** Vòng này phép đo của tôi suýt báo sai **ba lần nữa**
> (mục ⑧). Cộng cả ba vòng là **sáu lần**. Ba lần đầu tôi tự bắt, lần thứ tư Khỉ Đột bắt,
> ba lần này tôi tự bắt trước khi viết. Tôi ghi ra hết — một người soi giấu lỗi phép đo của
> mình thì mọi con số phía sau đều vô giá trị.

---

## ⓪ "Không đụng ba bàn soi của Hồ Ly" — ĐÚNG, kiểm được từng dòng

`git log -- scripts/soi-tu-lam-moi*.mjs` chỉ có hai commit, và commit vòng 3 (`d65b9ea`)
**không đụng tệp `soi-*` nào** (nó sửa `lib/soi-doi-so-thua.mjs`, khác tệp).

`git show b9cf1bd` — commit tách riêng, tiêu đề ghi thẳng *"KHÔNG phải mã của Khỉ Đột"*.
Tôi đọc **toàn bộ** phần thay đổi trong ba tệp đó: `+13 / −? ` ở `soi-tu-lam-moi.mjs`,
`+47/−?` ở `-2`, `+9/−?` ở `-3` — và **từng dòng một đều là chữ tôi viết**: khối đọc
`.stat > .v`, cờ `AGC_COMMIT`, mở mục A từ 6 lên 14 nhóm, kèm nguyên văn chú thích tôi tự
nhận lỗi ("Hồ Ly tự nhận (vòng 2, 03/09/2026); người bắt được là bên bị chấm"). **Không một
dòng nào là của Khỉ Đột.** Lời khai đúng.

---

## ① CAO-1 vòng 2 (tab nền) — **ĐÓNG**, và đóng kỹ hơn tôi yêu cầu

`hienThi()` (`lam-moi.js:432`) nay hỏi `document.hidden` trước; `visibilitychange` đánh thức
(`:448-452`) — đúng khuôn mô-đun chat đã dùng (`app.js:4303`).

**Bảng giá đo lại** (`scripts/soi-gia-nhieu-tab.mjs`, có kiểm **điều kiện** `document.hidden`
của từng tab phụ trước khi kết luận):

| Số tab ERP | `merge-base` | Vòng 2 (tôi đo) | **Vòng 3 (tôi đo lại)** |
|---|---|---|---|
| 1 | 4 | 5 (+1) | **5 (+1)** |
| 2 | 4 | 9 (+5) | **5 (+1)** |
| 3 | 4 | 13 (+9) | **5 (+1)** |
| 4 | 4 | 17 (+13) | **5 (+1)** |

```
SAU (bản vá)  4 tab →   5 lệnh gọi [tab phụ đều ở NỀN ✔]
```

**"Ngủ" có thành "quên" không — tôi soi riêng, 6 ca, khắt khe hơn ca ⑪f của nó**
(`scripts/soi-tab-nen-bat-kip.mjs` — **ĐẠT 12 · TRƯỢT 0**):

- **A.** 6 cú ghi rải trong lúc tab 2 nằm nền → đài **của chính tab 2** báo `chay=0 · ngu=12`.
  Bằng chứng ở phía tab ngủ, không phải suy từ tổng lượt gọi.
- **B.** Ngủ **3 giây** (nhiều vòng gộp 60ms đã trôi) rồi mở → thẻ **bắt kịp, nói 0**, và
  6 cú ghi gộp thành **1 lượt nạp** (4 lệnh gọi), không nạp 6 lần.
- **C.** **Chuông** — người nghe KHÔNG khai `goc`, nay cũng ngủ theo tab → mở ra huy hiệu
  nhảy đúng lên **"7"**.
- **D.** **Hai tầng ngủ** (tab nền + màn trong ứng dụng cũng ẩn): mở tab → chuông đúng "9";
  chuyển về màn Tổng quan → thẻ đúng "2".
- **E.** Ghi rồi **ẩn ngay** (không kịp chờ) → mở lại vẫn đúng, không mất lượt nạp.
- **F.** Ẩn → mở → ẩn → mở mà **không ghi gì** → **0 lệnh gọi**. Không nạp thừa.

Dòng `"Tab đang ẩn : 0"` viết cứng đã thay bằng **số đo thật theo từng mức tab**
(`do-luot-doc-lam-moi`: `1 tab 5 · 2 tab 5 · 3 tab 5 · 4 tab 5 ✔ không đội thêm`).

---

## ② CAO-2 vòng 2 (định nghĩa vòng tròn) — **ĐÓNG phần cốt lõi**

Hai khối tôi chỉ ở vòng 2 nay đều nối dây và **sống thật trên trình duyệt**
(`scripts/soi-khoi-bo-sot.mjs`, có ca đối chứng):

```
① Bảng "Khách hoàn nhiều" (CSKH)  → /api/kinh-doanh/khach-hoan-nhieu: 1 lượt  ✔
② Ma trận Xếp ca tuần             → /api/ca/ma-tran-tuan:            1 lượt  ✔
③ ĐỐI CHỨNG: Đối soát sàn          → /api/kinh-doanh/can-doi-soat:    1 lượt  ✔
```

**Và bản kiểm kê THOÁT VÒNG TRÒN THẬT.** Tôi kiểm bằng cách bảo nó tìm một thứ nó chưa từng
được mách: dựng một bản sao repo trong thư mục tạm (không đụng repo của Sếp), **giấu một khối
mới vào `app.js` ở đúng mốc `ad4bc95`** — vừa gọi API đọc (`hoanDanhSach`, nhóm `hoan`) vừa
vẽ (`innerHTML =`), **không ai nối dây, không ai gọi lại sau một cú ghi** — rồi chạy kiểm kê
trên cả hai mốc:

| | Khối dò được | Rổ A |
|---|---|---|
| mốc gốc `ad4bc95` | 37 | 10 |
| mốc gốc **+ khối giấu** | **38** | **11** |

```
· veBangHangHoanTheoThang — dòng 6742  [hoan]  0/10 chỗ ghi có vẽ lại
```

**Nó gọi đúng tên khối tôi giấu và xếp đúng rổ A.** Định nghĩa vòng tròn của vòng 2 đã hết.

---

## ③ CAO (còn lại) · Vòng tròn hết, nhưng đổi lấy một VÙNG MÙ hình dạng khác

Luật dò khối là: *"khối = hàm **vừa** gọi API đọc **vừa** vẽ ra màn hình"* — và
`hamTrongCung()` bắt mỗi dòng thuộc về hàm **trong cùng**. Nghĩa là **cả hai việc phải nằm
trong CÙNG MỘT hàm**. Mà khuôn viết phổ biến nhất của chính ERP này là **tách đôi**:
`taiX()` nạp rồi gọi `veX()` vẽ.

**Phản ví dụ chạy được.** Tôi giấu khối thứ hai, giống hệt khối thứ nhất về tác dụng, chỉ
khác **hình dạng** — nạp một hàm, vẽ một hàm:

```js
let HL_DS_HOAN2 = [];
function veBangHoan2()  { …  o.innerHTML = HL_DS_HOAN2.map(…)  }
async function taiBangHoan2() { const kq = await API.hoanDanhSach(); HL_DS_HOAN2 = …; veBangHoan2(); }
taiBangHoan2();
```

| Khối giấu | Hình dạng | Kiểm kê |
|---|---|---|
| ① | nạp + vẽ trong MỘT hàm | **TÌM RA** — 37 → 38, rổ A |
| ② | nạp một hàm, vẽ một hàm | **KHÔNG TÌM RA** — 37 → **37** |

**Và vùng mù đó lớn.** Tôi đối chiếu **27 người nghe mà chính bản vá đã nối dây** với 37 khối
kiểm kê dò được: **18 được nhận ra, 9 KHÔNG** —

```
taiDanhMucNen · taiViecCanLam · lamMoiCacManLienQuanCv · veDoiSoat ·
lamMoiTatCaDuLieuNen · taiDanhMucViTri · taiMauCaDungChung · taiLichCuaToi · taiMaTran
```

Trong đó có **`veDoiSoat`** (chính màn Đối soát sàn của lỗi CAO vòng 1) và
**`lamMoiCacManLienQuanCv`** (Trạm Việc — khối trung tâm của cả góp ý gốc).

**Vì sao là CAO.** Ba con số `37 / 10-22-5` được viết vào **đầu `lam-moi.js`** như một bản
kiểm kê chính thức, và tệp kiểm kê tự khai *"khối chưa ai nối dây vẫn hiện ra"*. Câu đó
**không đúng trong trường hợp tổng quát**, và tôi có phản ví dụ. Hôm nay chưa gây hại thật
(cả 9 khối vô hình đều đã được nối dây) — nhưng **lời bảo đảm quét-cả-lớp thì chưa thành**,
mà theo `LUAT-GOP-Y-LA-TRIEU-CHUNG.md` chính lời bảo đảm đó mới là thứ phải đúng.

**Nhẹ hơn CAO-2 vòng 2 thấy rõ** (vòng 2 không tìm được khối chưa nối dây nào; vòng 3 tìm
được, chỉ trượt một hình dạng) và **cách sửa nhỏ**: coi `taiX()` và `veX()` là **một khối**
khi `taiX` gọi thẳng `veX` — gộp nét vẽ của hàm con cấp một vào hàm cha, thay vì cấm tuyệt
đối. Kèm hai ca đối chứng: giấu một khối MỘT-HÀM và một khối HAI-HÀM, cả hai phải hiện ra.

---

## ④ Kết luận độc lập về **37 · A 10 · B 22 · C 5 · 123+13=136**

**Con số chỗ ghi: ĐÚNG CHÍNH XÁC.** Tôi đếm độc lập trên `merge-base`, danh sách tệp **hỏi
thẳng `git ls-tree`** (14 tệp) chứ không chép tay:

```
Chỗ GỌI   API.<hàm ghi>( : 123      (app.js 118 · quet-tai-lieu.js 2 · index.html 3)
Chỗ TRUYỀN API.<hàm ghi> :  13      (app.js 13)
TỔNG                     : 136
```

Khớp **từng con một**. Vòng 1 tôi ra 125, vòng 2 ra 123+13 — **cả hai vòng lệch là vì máy
bóc chú thích của tôi và của nó đều còn hỏng**; nay cả hai dùng máy bóc đã sửa và ra cùng số.

**Ba rổ: đúng hướng, còn nhiễu ở 2/10 khối rổ A.** Tôi soi từng khối rổ A **trên trình duyệt**,
không đọc mã đoán:

| Khối rổ A (mốc) | Tôi kiểm | Bằng chứng |
|---|---|---|
| `veTongQuanTheoVaiTro` | **rổ A thật** → nay ĐÃ nối dây | vòng 1 tôi đo trên Chrome: thẻ 2→2 trên `main`, nay 2→0 |
| `khoiDongCSKH` | **rổ A thật** → nay ĐÃ nối dây | `khach-hoan-nhieu` 0 lượt → **1 lượt** |
| `taiThongBao` (chuông) | **rổ A thật** → nay ĐÃ nối dây | `main` chỉ gọi ở 3 chỗ: mở chuông · lúc nạp · `setInterval` 5 phút |
| `moChiTietMucTieu` · `knVeAiLamDuoc` · `veGiayToHoSo` · `xuLyMaQuet` | **hộp mở theo yêu cầu — đúng như nó khai** | cả bốn là modal/panel mở ra mới đọc; `xuLyMaQuet` là tay xử lý quét QR |
| `khoiDongXepCa` | **rổ A THẬT, còn sống** | đo: `dlnSuaPhongBan` → `/api/du-lieu-nen/phong-ban` **0 lượt** |
| `veLaiBangNs` | **NHIỄU** — không phải khối | là `const veLaiBangNs = () => (… ? veBangNsQuanTri() : veBangNsDoc())`, một dòng điều phối. Đo: `qtSuaNhanSu` → `quan-tri/danh-sach` **1 lượt ✔** |
| `khoiDongKho` | **NHIỄU** — là hàm khởi động, không phải khối | Đo: `khoSuaSanPham` → `kho/san-pham` **1 lượt ✔** (khối thật là `taiLaiKho`, đã nối dây) |

**Số của tôi: rổ A thật ≈ 8 trong 37** (10 trừ 2 nhiễu), trong đó **3 đã nối dây** ·
**4 là hộp mở theo yêu cầu** · **1 còn sống** (ô chọn Phòng ban ở Xếp ca).
Cộng vùng mù ở mục ③ thì con số thật **không thể chốt** bằng bản kiểm kê hiện tại.

**Lời khai "6 khối còn lại là hộp mở theo yêu cầu": đúng 4, sai 2** — `veLaiBangNs` và
`khoiDongKho` không phải hộp mở theo yêu cầu, chúng **không phải khối**. Kết quả cuối giống
nhau (không khối nào nói dối), nhưng lý do đưa ra sai ở 2 trong 6.

**Hai chỗ nó tự sửa — tôi kiểm, cả hai ĐÚNG:**
- `const k = (KN_DANH_MUC || []).find(…)` **không còn** bị đếm thành hàm: `laHamMuiTen()`
  đòi có `=>` ngay sau cặp ngoặc, mà `.find(` thì không khớp. ✔
- `khoiDong*` **không còn "thừa hưởng"** nét vẽ của hàm con: `hamTrongCung()` gán mỗi dòng
  cho hàm **trong cùng**. Thấy rõ trong kết quả — hàm con hiện ra thành khối riêng. ✔

---

## ⑤ VỪA-1 · Nhãn `trong` sai ở 7 khối — và nó ăn vào phép xếp rổ

Bản kiểm kê in `veLaiBangNs (trong khoiDongChat)`, `taiLaiSp (trong khoiDongChat)`,
`veGiayToHoSo (trong khoiDongChat)`, `veLichSuHoSo` · `veJdHoSo` · `veHopDongHoSo` ·
`knVeAiLamDuoc` — **bảy khối, không cái nào nằm trong `khoiDongChat`**.

Truy ra: phép dò hàm bao ngoài chỉ nhận `^function X(` và `^(function X(`. Mà thực tế:

```
veLaiBangNs (4725) → thật sự nằm trong  if (TOI.quyen.includes('nhansu')) { …
taiLaiSp   (5844) → thật sự nằm trong  (async function khoiDongSanPhamKinhDoanh() {   ← thụt lề + `async`
```

Cả hai khuôn đều không khớp, nên nó lùi tiếp lên tới `async function khoiDongChat()` ở mức 0.

**Không chỉ là nhãn xấu.** `duongToi()` dùng `k.trong` để giới hạn phạm vi tìm hàm gọi
(`if (v.trong !== k.trong && k.trong !== '') continue;`) — nhãn sai thì tìm sai chỗ, và đó
chính là một nguồn của rổ A giả (`veLaiBangNs`). Sửa: nhận thêm khuôn `(async function X(`
và khối `if (TOI.quyen…) {` ở mức 0.

---

## ⑥ VỪA-2 · `cong-khoi` — cổng BẮT BUỘC — chạy với người dùng 7 quyền, mù 8 mô-đun

Tôi kiểm lời khai *"phép quét TDZ của chính nó bắt được"* bằng cách **gài lại đúng lỗi đó**:
đổi `khoiDongCSKH` sang `const` và bỏ lambda chuyển tiếp.

| Cổng | Kết quả |
|---|---|
| `cong-khoi` (cổng **bắt buộc trước mọi lần đẩy**) | ✅ **XANH** — `ngoai_le: []` ❗ |
| `do-tu-lam-moi` | ❌ `trang nạp xong không ngoại lệ — ReferenceError: Cannot access 'khoiDongCSKH' before initialization` |

Nguyên nhân: người dùng giả của `cong-khoi` (`lib/ban-do-chrome.mjs:28`) chỉ có **7 quyền**
`tongquan · lichsuviec · danhba · chat · gopy · nhansu · khovan`. Tám mô-đun **không bao giờ
chạy** dưới cổng khói:

```
khoiDongCongViec · khoiDongDoiSoatSan · khoiDongDuLieuNen · khoiDongTaiSan ·
khoiDongXepCa · khoiDongKhoTaiLieu · khoiDongDonHoan · khoiDongLichSuHoan
```

**Không phải lỗi của vòng này** (nợ cũ), nhưng nay đo được và nó giải thích vì sao lỗi Đối
soát sàn của chị Hằng sống được lâu đến thế. Cũng cần nói cho đúng: **không có "phép quét
TDZ"** riêng nào trong `scripts/` — thứ bắt được là ca ④ của `do-tu-lam-moi` (nạp `app.js`
trong Chrome thật với đủ 17 quyền). Lời khai đúng về **kết quả**, sai về **tên dụng cụ**.

→ Đề nghị: nâng `TOI.quyen` của `cong-khoi` lên đủ 17, hoặc chạy cổng khói hai lượt (một vai
đủ quyền, một vai nhân viên trơn).

---

## ⑦ VỪA-3 · Ô chọn Phòng ban ở màn Xếp ca — để lại có được không?

Đo thẳng: đứng ở tab Xếp ca, đổi tên phòng ban → `/api/du-lieu-nen/phong-ban` **0 lượt**.
Khối này **thật sự còn nói dối**.

**Đánh giá của tôi: để lại ĐƯỢC, nhưng lý do nó đưa ra chưa đủ.** Nó xếp là "thao tác hiếm
của Admin" — đúng: đổi tên phòng ban là việc vài tháng một lần, và hậu quả là một cái tên cũ
trong ô chọn cho tới lần tải trang sau, không phải một con số sai dẫn tới quyết định sai.
Nhưng **chi phí sửa gần bằng không**: `khoiDongXepCa` đã ở trong tệp, thêm một lời
`ngheDuLieu('du_lieu_nen', …, { goc: oTab('xepca') })` là xong — đúng bằng hai khối nó vừa
nối ở vòng này. Để lại thì phải **ghi vào mã**, không để trong báo cáo: người sau đọc
`lam-moi.js` phải thấy được "khối này cố ý không nghe, vì sao".

---

## ⑧ VỪA-4 · Máy bóc viết lại: SẠCH — và ba lần suýt báo sai của chính tôi

**Máy bóc: `scripts/soi-may-boc.mjs` — ĐẠT 18 · TRƯỢT 0.** Tôi gài đủ ba dạng:

| Dạng | Ca | Kết quả |
|---|---|---|
| ① regex literal | chứa cả hai loại nháy (đúng ca `quet-tai-lieu.js:281`) · chứa dấu huyền · có `/` trong `[…]` · **phép chia trông giống regex** · phép chia rồi tới chuỗi có nháy lẻ | **5/5 sạch** |
| ② chuỗi mẫu lồng nhau | hai tầng · **ba tầng** + ngoặc nhọn trong chuỗi · regex bên trong `${…}` · **lời gọi hàm trong `${…}` phải GIỮ NGUYÊN** | **4/4 sạch** |
| ③ **dạng của tôi** | chú thích chứa ngoặc mở lẻ · chú thích chứa nháy lẻ · chuỗi chứa ngoặc lệch và **dấu chú thích giả** · chuỗi thường chứa dấu huyền · regex sau `return`/`typeof` · chuỗi có ký tự thoát ngay trước dấu đóng | **6/6 sạch** |

**Chốt tự kiểm ③f có răng thật:** tôi tắt phép nhận regex trong máy bóc → `soiDongBiXoaOan`
báo **4.559 dòng bóc oan** ở `app.js`. Bản lành: **0 dòng trên cả 10 tệp**.
Và `soiDoiSoThua` nay **nhìn thấy** hàm nằm sau một regex — ca ④c bắt được
`BiNuot(1,2,3) truyền 3/nhận 2`, đúng thứ nó mù ở vòng 2.

**Ba lần phép đo của tôi suýt báo sai vòng này — tôi ghi hết:**

1. Mẩu thử chuỗi mẫu của tôi viết dấu huyền thẳng vào một chuỗi mẫu → ra mã **không hợp lệ**
   (`\` + dấu huyền`), bàn soi báo **đỏ 4 chỗ** trong khi máy bóc chẳng sai gì. Sửa: dựng dấu
   huyền bằng `String.fromCharCode(96)`.
2. Bàn đo giá nhiều tab của tôi **bấm nút trong một tab đang nằm nền** (vì
   `Target.createTarget` đưa tab mới ra trước) → ra **8** thay vì **5**, tức tôi suýt báo
   CAO-1 chưa đóng. **Đúng cái hố Khỉ Đột đã tự khai ở ca ⑪ của nó** — tôi vấp lại y hệt.
   Sửa: `Page.bringToFront` cho tab 1, và **kiểm điều kiện** `document.hidden` của mọi tab
   phụ trước khi kết luận.
3. Bàn soi tab nền của tôi dùng sai id huy hiệu chuông (`#tb-so`, thật ra là `#tbBadge`) và
   so tổng lượt gọi với `6` trong khi số đúng là `24` (6 cú ghi × 4 lượt của tab đang hiện).
   Ba dòng ❌ oan. Sửa: đọc `#tbBadge`, và lấy bằng chứng từ **bộ đếm của chính tab ngủ**
   (`chay=0 · ngu=12`) thay vì suy từ tổng.

---

## ⑨ Cổng đo — tôi tự chạy lại HẾT

| Cổng | Khai | Tôi đo |
|---|---|---|
| `cong-khoi` (1440px) | XANH | ✅ **XANH** |
| `cong-khoi-dienthoai` (375px) | XANH | ✅ **XANH** |
| `do-ba-mau` | 12/12 | ✅ **ĐẠT LUẬT BA MÀU** |
| `do-cat-im-lang` | SẠCH | ✅ **SẠCH** |
| `do-chu-dai` | XANH | ✅ **XANH** |
| `do-moc-noi` | 9/0 | ✅ **ĐẠT 9 · TRƯỢT 0** |
| `do-chat-noibo` | XANH | ✅ **XANH** |
| `do-hop-sua-muctieu` | XANH | ✅ **XANH** |
| `do-tu-lam-moi` | **49/0** | ✅ **ĐẠT 49 · TRƯỢT 0** (gồm ③f · ⑪a–⑪f · ⑩d) |
| `do-luot-doc-lam-moi` | +1 / −2 / 0 đội thêm | ✅ **+1 · −2 · 1-2-3-4 tab đều 5 lệnh gọi** |
| `do-kiem-ke-lam-moi` | 37 · 10-22-5 · 136 | ✅ **37 · 10-22-5 · 123+13=136** |
| Ba bàn soi của tôi | — | ✅ chạy sạch, kết luận không đổi |

**Ca đối chứng thứ tư (⑩d) có thật:** gỡ câu hỏi `document.hidden` → `❌ 8 lượt (bản lành: 4)`.

**Chi phí 0**: `package.json` vòng 3 **không thêm dòng nào**; không gói mới.
**Luật ba màu · 44px · 375px**: bản vá vòng 3 không thêm phần tử giao diện nào
(`app.js` +23/−8, toàn bộ là lời đăng ký nghe và chú thích).

**`scripts/` so với `merge-base`: đúng 2 dòng xoá** — lời khai chính xác:
```
-  /* `dungMayGia` chỉ chạy `suaTep` cho app.html + app.js. Ca DC-A cần bẻ CSS,
-    for (const f of ['app.html', 'assets/js/app.js']) {
```
Cả hai là chú thích cũ và danh sách tệp — **không nới lỏng bàn đo nào**.

**Cả hai bàn đo đã ghim `merge-base`** (`do-kiem-ke-lam-moi.mjs:47`) — THẤP-1 vòng 2 đóng.
Tôi kiểm bằng cách chạy trên cả `origin/main` lẫn `fc1b727`: cùng ra 37 / 123 / 10-22-5.

**`origin/main` không đi tiếp trong lúc tôi soi**: `git fetch` xong vẫn `ad4bc95`, và
`git rev-list --count HEAD..origin/main` = **0**. Nhánh **đã bắt kịp** — khác vòng 2 (lệch 5).

---

## ⑩ Ba ca xấu nó tự nêu — xác nhận từng cái

| Nó khai | Tôi kiểm |
|---|---|
| Ca nhiều tab **đỏ oan 3 chỗ** vì `Target.createTarget` đưa tab mới ra trước; **sửa bàn đo, không sửa sản phẩm** | **ĐÚNG, và tôi vấp lại y hệt** (mục ⑧-2). Ca ⑪ nay có `Page.bringToFront` + chốt điều kiện ⑪b kiểm `document.hidden` — đúng cách |
| Bản vá regex **đầu tiên làm TỆ HƠN** (675 dòng oan thay vì 351) vì nuốt cả dấu xuống dòng | **ĐÚNG về cơ chế** — chú thích ở `soi-doi-so-thua.mjs:104-106` ghi rõ *"Bản trước nuốt tới hết dòng rồi nuốt luôn dấu XUỐNG DÒNG — lệch số dòng, và mọi địa chỉ máy soi in ra đều sai"*, và bản cuối có `if (!dong) { r += c; i++; continue; }` xử đúng. Con số 675 tôi không dựng lại được (bản trung gian không có trong git) — **không xác nhận được, cũng không bác được** |
| **Suýt gây TDZ** khi đổi `khoiDongCSKH` sang `const` | **ĐÚNG** — tôi gài lại và nó nổ thật. Nhưng **`cong-khoi` KHÔNG bắt** (mục ⑥); `do-tu-lam-moi` mới bắt |
| Còn **một** khối rổ A chưa nối dây (dropdown Xếp ca) | **ĐÚNG** — đo được 0 lượt (mục ⑦) |
| Kiểm kê **chỉ dò khối trong `app.js`**, chưa dò `quet-tai-lieu.js` | **ĐÚNG, và tự cắt phạm vi này hôm nay tốn 0 khối**: tôi quét toàn bộ 14 tệp giao diện của mốc, **không có** hàm đọc-rồi-vẽ nào nằm ngoài `app.js`. Rủi ro chỉ thuộc về tương lai |

---

## ⑪ THẤP

1. **`veTinhTrang` đọc `kq.muc.map` không phòng thân** (`app.js:7205`). Máy chủ trả thiếu
   khoá là cả người nghe `lamMoiTatCaDuLieuNen` ném lỗi. **Nợ cũ, có sẵn trên `merge-base`,
   không phải của bản vá**, và `keu()` trong `lam-moi.js` chặn không cho lan sang màn khác —
   tôi gặp nó vì **máy giả của tôi** trả thiếu `muc`, không phải vì sản phẩm hỏng. Ghi ra để
   khỏi ai tưởng là lỗi mới.
2. **`CHUA_LUU_DU` vẫn là danh sách viết tay** (`api.js:22`). Cửa thứ hai kiểu "trả 200 mà
   chưa ghi" thêm vào ngày mai sẽ lại bị quên — đúng lớp bệnh đang vá. Nhắc lại từ vòng 2,
   chưa xử.

---

## Việc phải làm trước khi gộp

1. **CAO** — bản kiểm kê: coi `taiX()` + `veX()` là MỘT khối khi `taiX` gọi thẳng `veX`.
   Kèm hai ca đối chứng: giấu một khối **một hàm** và một khối **hai hàm**, cả hai phải hiện
   ra trong rổ A. (Hai mẩu mã tôi dùng nằm trong báo cáo này, dùng lại được.)
2. **VỪA-1** — sửa phép dò hàm bao ngoài: nhận `(async function X(` và khối
   `if (TOI.quyen…) {` ở mức 0. Bảy nhãn `trong khoiDongChat` phải đúng lại.
3. **VỪA-2** — nâng `TOI.quyen` của `cong-khoi` lên đủ 17 (hoặc chạy hai lượt vai): tám
   mô-đun đang không bao giờ chạy dưới cổng bắt buộc.
4. **VỪA-3** — hoặc nối dây ô chọn Phòng ban ở Xếp ca (một dòng), hoặc **ghi lý do vào mã**
   chứ không để trong báo cáo.
5. **VỪA-4 / THẤP** — sửa lời khai: rổ A **10 → 8 thật** (2 là nhiễu) · "6 khối là hộp mở
   theo yêu cầu" → **4** · "phép quét TDZ" → nói đúng tên là ca ④ của `do-tu-lam-moi`.

**Sản phẩm đã lành.** Năm việc trên đều nằm ở dụng cụ đo và ở lời khai — không việc nào đụng
kiến trúc, và không việc nào cần hơn một buổi.
