# REV-0057 — Màn hình tự làm mới sau khi ghi

**Kết luận: FAIL** (2 lỗi CAO phải sửa trước khi gộp — cả hai đều nhỏ, không phải làm lại kiến trúc)

Hồ Ly soi `a1e5671` trên nhánh `fix/man-hinh-tu-lam-moi` (2 commit từ `origin/main`).
Không commit, không push, không sửa một dòng mã sản phẩm nào.
Mọi con số dưới đây **tôi tự đo bằng bàn đo riêng**, không dùng lại số của Khỉ Đột.
Bàn soi của tôi: `scripts/soi-tu-lam-moi.mjs` · `scripts/soi-tu-lam-moi-2.mjs` ·
`scripts/soi-tu-lam-moi-3.mjs` (chạy được, chi phí 0, không thêm gói nào).

**Hướng đi ĐÚNG.** Vá ở tầng `api.js` — một chỗ phát tín hiệu cho cả lớp — là đúng
kiến trúc, đúng luật `LUAT-GOP-Y-LA-TRIEU-CHUNG.md`, và tôi đã tự xác minh nó phủ
**100%** chỗ gọi (không phải 51/115): giao diện **không có một lời gọi `fetch` nào
nằm ngoài `api.js`**, và 13 chỗ *truyền* `API.x` làm tham số cũng được phủ vì đoạn
bọc chạy lúc nạp mô-đun, trước khi `app.js` chạm tới. Hai lỗi CAO dưới đây là **vá
chưa xong**, không phải vá sai hướng.

---

## Tóm tắt

| | |
|---|---|
| CHẶN | 0 |
| CAO | 2 |
| VỪA | 3 |
| THẤP | 3 |
| Cổng đo | **8/8 XANH đúng như lời khai** — tôi tự chạy lại hết |
| Chi phí | **0** — `package.json` chỉ thêm 2 dòng `scripts`, **không thêm gói nào** |

---

## L1 · CAO — Thẻ tóm tắt Trạm Mục Tiêu VẪN NÓI DỐI ở đường "đánh thức" và đường "gõ dở"

**Đây đúng bằng bệnh Sếp Ngọc kể, chỉ đổi đường vào.**

`public/assets/js/lam-moi.js:268` — `lamMoiManVuaMo()` gọi `chay(n)` **không có
`await`**, trong khi `xa()` ở dòng **308** gọi `await chay(n)`. Cùng lỗi ở dòng
**374** (`thuLaiNguoiHoan`, đường "rời ô là nạp nốt").

Chính `lam-moi.js:283-287` khai thứ tự chạy là **RÀNG BUỘC**, không phải tuỳ thích:

> *"Thứ tự đăng ký quyết định thứ tự chạy, nên màn nào NẠP dữ liệu chạy trước, màn
> nào chỉ ĐỌC LẠI dữ liệu đó (thẻ tóm tắt) chạy sau"*

Và `app.js:2717` (`veTongQuanTheoVaiTro`) đọc `window.CV_DU_LIEU_CUA_TOI` **ngay dòng
đầu, đồng bộ, trước mọi `await`**. Bỏ `await` = hai người nghe chạy song song = thẻ
tóm tắt đọc biến CŨ.

**Tái hiện** (`node scripts/soi-tu-lam-moi-2.mjs`, Chrome thật):

1. Vai nhân viên (không admin, không trưởng phòng), đứng ở **Tổng quan** —
   thẻ *"Việc tôi giao — chờ duyệt"* = **2**.
2. Sang tab **Tài sản**.
3. Duyệt xong cả 2 việc (máy chủ đổi sang **0**). Cả hai người nghe của Tổng quan
   đang ngủ, đúng thiết kế.
4. Quay lại tab **Tổng quan**.

```
③ Quay lại tab Tổng quan — thẻ phải nói 0
   Lượt gọi khi đánh thức: muc-tieu/danh-sach×1 · cong-viec/danh-sach×1 · cong-viec/hom-nay×1
   ⇒ Thẻ "Việc tôi giao — chờ duyệt" = 2   ❌ NÓI DỐI

④ Ca đối chiếu: KHÔNG rời tab (đường `xa()` có await)
   ⇒ 0   ✔ ĐÚNG
```

Dữ liệu mới **đã về** (`cong-viec/danh-sach×1` có gọi) — thẻ vẫn vẽ bằng biến cũ.
Đường `xa()` (có `await`) đúng; hai đường kia sai. Đường **"gõ dở"** (dòng 374) còn
đời thường hơn: gõ ghi chú trong Tổng quan → có người ghi việc → rời ô → thẻ lệch.

**Vì sao hại.** Dữ liệu cũ mà trông như mới tệ hơn bắt bấm F5: Sếp không có cách nào
biết mình đang nhìn số của mười phút trước. Đây đúng câu *"đã duyệt hoàn thành mà nó
vẫn hiện ở đây"*.

**Cách sửa** (nhỏ): `lamMoiManVuaMo` thành `async` + `await chay(n)`; `thuLaiNguoiHoan`
tương tự. Và thêm ca này vào `do-tu-lam-moi` — hiện **không bàn đo nào đi qua đường
đánh thức có hai người nghe cùng tab**.

---

## L2 · CAO — Hai tuỳ chọn `goc` rơi nhầm chỗ; lời khai "tab đang ẩn: 0 lệnh gọi" SAI với 3 nhóm

**`public/assets/js/app.js:223`**

```js
  }, { goc: oTab('nhansu', 'quantri') });   // ← đối số THỨ HAI của Array.prototype.filter
}
```

Đó là `ds.filter(hàm, thisArg)`. `{ goc: … }` bị nuốt làm `thisArg` của một hàm mũi
tên — **không có tác dụng gì cả**, và `oTab(…)` bị gọi lại mỗi lần lọc.

**`public/assets/js/app.js:444`** — y hệt: `veBang(dich, ds, hang)` chỉ nhận **3** tham
số (`app.js:1923`), tham số thứ tư bị bỏ.

Chỗ **đáng lẽ** nhận hai tuỳ chọn đó là hai lời đăng ký ngay trên:
`app.js:133` (`taiLaiNhanSuQuanTri`, nhóm `nhan_su`+`tai_khoan`) và `app.js:279`
(`taiViecCanLam`, nhóm `ho_so`) — **cả hai hiện KHÔNG khai `goc`**.

Hệ quả đo được (`node scripts/soi-tu-lam-moi.mjs`, đứng ở tab **Tổng quan**):

```
tai_san    (taiSanSua)      → /api/tai-san                  0 lượt   (ngủ ✔)
kho        (khoSuaSanPham)  → /api/kho/san-pham             0 lượt   (ngủ ✔)
hoan       (kdDaDoiSoat)    → /api/hoan/danh-sach           0 lượt   (ngủ ✔)
nhan_su    (qtSuaNhanSu)    → /api/quan-tri/danh-sach       1 lượt   ⚠ VẪN GỌI DÙ TAB ĐANG ẨN
ho_so      (nsHopDongLuu)   → /api/nhan-su/viec-can-lam     1 lượt   ⚠ VẪN GỌI DÙ TAB ĐANG ẨN
```

Mỗi cú ghi hồ sơ / tài khoản / hợp đồng tốn **+2 lệnh gọi vẽ vào tab không ai nhìn**.
Và bảo vệ *"đang gõ dở"* cũng mất theo — `dangGoTrong()` trả `false` khi không có `goc`
(`lam-moi.js:360`):

```
E · Gõ dở ở ô tìm kiếm Nhân sự (#ns-tim) khi có ghi nhóm nhan_su
  gọi máy chủ ngay lúc đang gõ: 1 lượt   (0 = có hoãn, 1 = KHÔNG hoãn)
  chữ còn lại: "Duy đang gõ dở" · con trỏ ở: "ns-tim"
```

Chữ **không mất** (ô tìm nằm ngoài vùng vẽ lại) nên chưa phải CHẶN — nhưng lời khai
**"Tab đang ẩn: 0 lệnh gọi"** là **sai với 3 trong 14 nhóm**, và hai dòng đối số chết
nằm trong mã sản phẩm là dấu vết của một lượt sửa bằng máy mà không ai đọc lại.

**Cách sửa**: chuyển `{ goc: oTab('nhansu','quantri') }` về `ngheDuLieu` ở dòng 133,
`{ goc: oTab('nhansu') }` về dòng 279, xoá hai đối số thừa.

---

## L3 · VỪA — Bàn đo mới CÓ mắt, nhưng mù đúng hai chỗ nó tự nhận là rủi ro nhất

Tôi dựng lại phòng gài lỗi (bản sao `public/` + `scripts/`, không đụng cây làm việc)
và gài **ba lỗi theo cách khác** ca đối chứng của nó:

| Lỗi gài | `do-tu-lam-moi` | Thật sự có hại không |
|---|---|---|
| Gỡ đăng ký nghe của **chuông** (`app.js:7115`) | **BẮT ĐƯỢC** — ② đỏ 2 dòng | có |
| Bỏ chống-chạy-hai-lần (`lam-moi.js:301`) | **KHÔNG BẮT — vẫn 22/0** | **có, gấp đôi lượt đọc** |
| Ghi **HỎNG** cũng bắn tín hiệu (`api.js:492`) | **KHÔNG BẮT — vẫn 22/0** | có |

Lỗi thứ hai là nặng nhất, vì **ca ⑤ của bàn đo tên là "KHÔNG NẠP CHỒNG CHÉO"**. Nó mù
vì nó gọi thẳng `window.__API.cvCapNhat(…)` rồi đo — mà đường nút THẬT là *"ghi xong
rồi **gọi tay** hàm làm mới"* (`app.js:3646`, `app.js:6366`, `app.js:6982`…). Chống
chồng chéo chỉ ăn ở đường gọi tay, mà bàn đo không đi qua đường đó. Tôi đo bằng bàn
riêng, đúng đường nút thật:

```
BẢN LÀNH          : cap-nhat×1 · danh-sach×1 · tong-quan-congty×1 · hom-nay×1 · muc-tieu×1 · thong-bao×1   =  6
GÀI LỖI (bỏ chống): cap-nhat×1 · danh-sach×2 · tong-quan-congty×2 · hom-nay×2 · muc-tieu×2 · thong-bao×1   = 10
                                             ↑ mà bàn đo vẫn 22/0
```

**Lỗ thứ ba**: `scripts/do-tu-lam-moi.mjs:125` và `do-luot-doc-lam-moi.mjs:19` thiếu
quyền `dulieunen` trong danh sách `QUYEN`, nên `khoiDongDuLieuNen()` (`app.js:7072`,
điều kiện `TOI.quyen.includes('dulieunen')`) **không bao giờ chạy trong trình duyệt**.
Tức **4 người nghe** (`lamMoiTatCa`, `veNCC`, `veKhoList`, và nhánh Cơ cấu tổ chức)
chưa từng được nạp một lần nào trong bất kỳ bàn đo nào — kể cả chỗ Khỉ Đột tự khai là
"tải hai lượt".

**Đề nghị**: thêm 3 ca vào `do-tu-lam-moi` — ① đường nút thật (ghi + gọi tay) phải ra
đúng 6 lượt; ② ghi trả 500 thì tổng lượt gọi thêm = 0; ③ thêm `dulieunen` vào `QUYEN`.

---

## L4 · VỪA — Ba con số 1 / 50 / 64: đúng hướng, KHÔNG lặp lại được, và chia sai độ hạt

**Kết luận độc lập của tôi:**

1. **Mẫu số không phải 115.** Tôi đếm máy trên `origin/main`, đã lọc chú thích:
   **112 chỗ gọi thẳng `API.<hàm ghi>(…)` + 13 chỗ truyền `API.<hàm ghi>` làm tham số
   = 125**. Không có `fetch` nào ngoài `api.js` (đã quét cả `public/*.html`), nên
   không sót đường nào — nhưng **115 không tái lập được**.
2. **Không bàn đo nào sinh ra 1/50/64.** `do-tu-lam-moi` chỉ kiểm *khai báo* và
   *hành vi*, không hề tính ba rổ. Nghĩa là ba con số này **không kiểm lại được sau
   này** — đúng thứ mà luật "phải dựng lưới tự động" đòi phải tránh.
3. **"Rổ A = 1" là đếm theo NÚT, và cách đếm đó giấu mất mức nặng.** Tôi tìm ra đúng
   cái nút Sếp bấm và chạy nó trên cả hai bản (`node scripts/soi-tu-lam-moi-3.mjs`):

   Nút **"Duyệt xong"** ở Trạm Mục Tiêu (`app.js:3419` → `xuLyNut` → `API.cvCapNhat` →
   `lamMoiCacManLienQuanCv()`) — trên `origin/main` nó **CÓ** gọi hàm nạp lại, nên nó
   nằm **rổ B**, không phải rổ A. Nhưng đo bằng mắt trên Chrome thì:

   ```
   ── TRƯỚC (origin/main)
      thẻ "Việc tôi giao — chờ duyệt": 2  →  sau khi bấm: 2   ❌ vẫn hiện số cũ
   ── SAU  (bản vá)
      thẻ: 2  →  sau khi bấm: 0            ✔ đúng
   ```

   **Chẩn đoán của Khỉ Đột đúng, bản vá chữa đúng chỗ Sếp đau.** Chỉ là cách chia rổ
   *theo nút* xếp cái bệnh Sếp nhìn thấy vào "rổ B — nhẹ", trong khi *theo khối hiển
   thị* thì thẻ tóm tắt là **rổ A tuyệt đối**: trên `main` nó chạy đúng **một lần** lúc
   mở trang và không bao giờ vẽ lại nữa. Đó là lý do Sếp vấp trúng ngay ngày đầu chứ
   không phải xác suất 1/115.
4. Đếm lại rổ A theo máy (heuristic, có ghi rõ là heuristic): 7 ứng viên, soi tay còn
   **2 chỗ gọi thật** — `nsSinhNhatCongKhai` ở `main:1570` **và** `main:5076`. Khỉ Đột
   khai "1"; đúng nếu tính theo **công tắc**, thiếu 1 nếu tính theo **chỗ bấm** — mà
   mẫu số 115 lại đang tính theo chỗ bấm. **Không nhất quán đơn vị.**

**Điều này KHÔNG làm bản vá sai** — vì vá ở tầng `api.js` nên rổ nào cũng được phủ.
Nó làm **lời khai không kiểm lại được**, và lần sau sẽ không ai biết số đã trôi.

---

## L5 · VỪA — Lời khai lệch số đo thật (ngoài L2, L4)

| Khai | Tôi đo | Ghi chú |
|---|---|---|
| "**24 màn** đăng ký nghe" | **25** (`grep -c "ngheDuLieu("` = 26, trừ 1 dòng chú thích) | commit thứ hai `a1e5671` thêm `taiLichCuaToi` (`app.js:8168`) mà quên cập nhật lời khai |
| "quét **115** chỗ bấm" | **125** (112 gọi + 13 truyền tham số) | xem L4 |
| "**Tab đang ẩn: 0 lệnh gọi**" | **sai với `nhan_su` · `tai_khoan` · `ho_so`** | xem L2 |
| "108 hàm ghi đều đã khai — 97 + 11 miễn trừ" | **đúng chính xác** | tôi đối chiếu độc lập mọi khoá `API` có `method: POST/PUT/DELETE`: **0 hàm ghi bị sót**, **0 khai thừa** |
| "18 đường ghi bắn tin vào chuông" | **đúng** — 18 hàm khai `thong_bao` (máy chủ có 30 chỗ gọi `guiThongBao(`) | |
| "+1 / −2 / 0 lượt đọc" | **+1 / −2 / 0 — đúng** | tự chạy `npm run do-luot-doc-lam-moi`, xem L6 |
| "Cơ cấu tổ chức tải hai lượt, +3 lệnh gọi" | **đúng chính xác** | đo được: tab `quantri`, `dlnSuaPhongBan` → `phong-ban×2 · chuc-danh×2 · don-vi×2` = +3. Có ghi lý do trong mã (`app.js:7196-7203`). Chấp nhận được |
| "vá 2 chỗ ở Đối soát sàn" | **đúng, và quét hết lớp** | xem L7 |

---

## L6 · Lượt đọc D1 — KHÔNG có rủi ro hạn mức. Tôi tự tính, không lấy lời

Tự chạy `npm run do-luot-doc-lam-moi`:

```
TRƯỚC (origin/main) : mở trang 41 · nút cũ 4 lệnh gọi (thiếu chuông + thẻ tóm tắt)
SAU  (bản 03/09)    : mở trang 39 · tự làm mới 5 lệnh gọi (đủ cả chuông)
  Mỗi cú bấm : +1 · Lúc mở trang: −2
```

**Ca xấu, tôi tự dựng** (`soi-tu-lam-moi.mjs`, mục F):

- 10 cú bấm cách nhau 250ms → **10 vòng làm mới** (62 lệnh gọi). Gộp 60ms **không** gộp
  được nhịp bấm của người. Đúng — mỗi lần ghi thật thì phải làm mới thật.
- 10 cú bấm **trong cùng một khoảnh khắc** → gộp còn **1 vòng** (15 lệnh gọi, trong đó
  10 là lệnh ghi). Ràng buộc "một cú bấm đụng 3 nhóm chỉ một lượt mỗi đường" **đúng**.

**Tính ra tiền thật.** Số nền lấy từ `REV-0033`: `read_queries_24h = 46.597`,
`rows_read_24h = 2.390.674 / 5 triệu (48%)`. Trần **Workers 100.000 request/ngày** mới
là trần chặt, không phải D1. `/api/thong-bao` đọc tối đa 51+1 dòng (`src/index.js:2606`).

| Kịch bản | Request thêm/ngày | Dòng đọc thêm/ngày | Chạm trần? |
|---|---|---|---|
| 20 người × 50 lượt ghi = 1.000 | +1.000 (46,6k → 47,6k) | +~52.000 (2,39M → 2,44M) | không |
| ngày bận: 20 người × 150 = 3.000 | +3.000 (→ 49,6k) | +~156.000 (→ 2,55M) | không |
| ca cực đoan 20.000 lượt ghi | +20.000 (→ 66,6k) | +~1,04M (→ 3,43M) | **vẫn không** |

Cộng thêm **−2 mỗi lần mở trang** thì phần lớn tự bù. **Kết luận: an toàn, còn xa trần.**
Riêng L2 làm mỗi lượt ghi hồ sơ/tài khoản tốn thêm 2 request vô ích — nhỏ (HCNS ghi ít),
nhưng vẫn phải sửa vì nó làm sai lời khai.

---

## L7 · Hai lỗi tự bắt được — TÁI HIỆN ĐƯỢC, và quét hết lớp

**Đúng vai chị Phan Thị Hằng** (kế toán trưởng, `thao_tac_van_hanh = 0`), mở tab
Kinh doanh (`soi-tu-lam-moi.mjs`, mục G):

```
── TRƯỚC (origin/main)
   #kd-ds-dem = "(rỗng)" · gọi can-doi-soat 0 lượt
   Ngoại lệ: "Đối soát sàn: TypeError: Cannot read properties of null (reading 'addEventListener')
              at khoiDongDoiSoatSan (app.js:6895)"
── SAU (bản vá)
   #kd-ds-dem = "0 đơn cần đối soát" · gọi can-doi-soat 1 lượt · Ngoại lệ: 0
```

**Chết thật, sống thật.** Lời khai chính xác.

**Còn vai trò nào chết kiểu đó không** — tôi quét cả lớp hai đường:

*Đo thật* (mục H): 5 vai trò (Kho–anh Duy · Kế toán–chị Hằng · HCNS–Lan Hương · Vận
hành sàn–Huyền · nhân viên trơn), mở **hết** tab của từng vai, trên **cả hai bản**:

```
main : 1 · 2 · 1 · 1 · 1 ngoại lệ   (mọi vai đều dính 1 ngoại lệ do bàn soi tự tạo;
                                     chị Hằng dính THÊM 1 — đúng lỗi Đối soát sàn)
vá   : 0 · 0 · 0 · 0 · 0            ✔ sạch tuyệt đối
```

*Quét mã*: cả ERP chỉ có **một** chỗ xoá phần tử theo quyền rồi vẫn gắn sự kiện vào —
`th.dinh-tick` ở `app.js:6822`, chứa đúng `#kd-ds-chontatca`. Ba ô "chọn tất cả" còn lại
(`#kt-ts-chontatca`, `#kt-hh-chontatca`, `#ts-chontatca`) nằm trong `<th>` **không** bị
xoá. Hai chỗ gắn sự kiện vào id sinh động (`#ns-thieuhd-loc:262`, `#vd-goiy-nut:2614`)
đều gắn ngay sau khi tự tay vẽ ra id đó — an toàn.

**Kết luận: vá 2 chỗ là ĐỦ cả lớp.** Không phải "quét không hết".

---

## L8 · THẤP — Không có vòng lặp, không rò rỉ đăng ký. Tôi đã thử

- **Vòng lặp vô tận: KHÔNG.** Sau một cú ghi, hệ thống đứng yên; 4 giây sau chỉ thêm
  `chat/tin-nhan` + `chat/chua-doc` — đó là **nhịp tim chat 6 giây có sẵn từ trước**,
  không phải vòng lặp. Xác minh bằng mã: không người nghe nào gọi một hàm ghi.
- **Rò rỉ đăng ký: KHÔNG.** Mở/đóng tab **20 lần** rồi bấm một nút:
  `6 lệnh gọi` trước và `6 lệnh gọi` sau — y hệt. Lý do kiến trúc: mọi lời
  `ngheDuLieu` nằm trong các `khoiDong*()` chạy **đúng một lần** lúc nạp mô-đun
  (tôi đã kiểm từng chỗ gọi), không nằm trong đường mở/đóng màn.
- **Ghi HỎNG (500): KHÔNG bắn tín hiệu.** `goi()` (`api.js:37`) `throw` khi `!res.ok`,
  đoạn bọc chỉ móc vào nhánh thành công. Đo: sau một cú ghi 500 → **0 lệnh gọi thêm**,
  đài `{ban:0, chay:0}`. Đúng.
- Hết phiên (401) → `window.location.replace` rồi mới `throw` → không bắn. Đúng.

---

## L9 · THẤP — Hai tab ERP mở cùng lúc thì tab kia vẫn cũ

Tín hiệu chỉ chạy **trong một trang**. Sếp bấm Duyệt ở tab 1 thì tab 2 không biết gì.
**Không phải lỗi mới** — `origin/main` cũng vậy — và chữa nó cần `BroadcastChannel`
(chi phí 0) hoặc hỏi máy chủ (tốn lượt đọc). **Không chặn.** Ghi ra đây để lần sau
không ai tưởng đã xong.

---

## L10 · THẤP — Vài chỗ nhỏ trong `lam-moi.js`

- `lam-moi.js:307` cộng `dem.hoan++` mỗi lần hoãn lại, nhưng `dòng 373` chỉ trừ một
  lần khi chạy → nếu cùng một người nghe bị hoãn hai lượt tín hiệu liên tiếp, bộ đếm
  `hoan` trôi. Chỉ là **số để đọc**, không đổi hành vi.
- `xa()` là `async` và `await` từng người nghe. Nếu một người nghe chạy lâu hơn 60ms
  và có tín hiệu mới tới, hai lượt `xa()` chạy chồng. Trong đo thật chưa gặp (mọi
  người nghe đều xong dưới 60ms với máy giả), nhưng mạng chậm thì có thể.
- `nsHopDongLuu` trả **200 kèm `can_ly_do: true` = CHƯA lưu** (`api.js:63-67`) nhưng
  vẫn bắn tín hiệu → một lượt nạp lại vô ích. Rất nhỏ.

---

## Cổng đo — tôi tự chạy lại HẾT, tự mắt thấy

| Cổng | Khai | Tôi đo |
|---|---|---|
| `cong-khoi` (1440px) | XANH | ✅ **XANH** · `loi_console: []` · `ngoai_le: []` |
| `cong-khoi-dienthoai` (375px) | XANH | ✅ **XANH** |
| `do-ba-mau` | 12/12 | ✅ **12/12** — không họ thứ tư, không trắng/đen tuyền |
| `do-cat-im-lang` | SẠCH | ✅ **SẠCH** |
| `do-chu-dai` | XANH | ✅ **XANH** |
| `do-moc-noi` | 9/0 | ✅ **ĐẠT 9 · TRƯỢT 0** |
| `do-chat-noibo` | XANH | ✅ **XANH** |
| `do-tu-lam-moi` (mới) | 22/0 | ✅ **ĐẠT 22 · TRƯỢT 0** (nhưng xem L3 — có lỗ) |
| `do-luot-doc-lam-moi` (mới) | +1/−2/0 | ✅ **+1 / −2 / 0** |

**Luật ba màu · 44px · 375px**: bản vá **không thêm một phần tử giao diện nào** (0 dòng
HTML/CSS đổi — `git diff --stat` chỉ có `api.js`, `app.js`, `lam-moi.js`, `package.json`,
2 tệp `scripts/`). Cổng khói 375px và `do-ba-mau` xanh xác nhận không có hồi quy.

**Có nới lỏng bàn đo cũ không: KHÔNG.**
`git diff origin/main...HEAD -- scripts/` = 3 tệp, **384 thêm / 1 xoá**. Hai tệp mới
hoàn toàn. Tệp cũ duy nhất bị đụng là `scripts/lib/ban-do-chrome.mjs` — **+5 / −1 dòng**,
và thay đổi thật chỉ là **danh sách tệp cho `suaTep` từ 2 lên 4** (thêm `api.js`,
`lam-moi.js`), 4 dòng còn lại là chú thích. Tôi đã đọc **cả 6** bàn đo cũ có dùng
`suaTep` (`cong-khoi`, `do-chu-dai-xuong-dong`, `do-gop-viec-lichsu`, `do-hop-sua-muctieu`,
`do-moc-noi`, `do-trangthai-nguoigui`): **tất cả đều tự lọc theo tên tệp** (`if (ten !== …) return s`),
nên không bàn nào đổi hành vi. **Không phải nới lỏng, không phải sửa chuỗi cho vừa.**
(Một chú thích thành cũ: `do-hop-sua-muctieu.mjs:119` vẫn viết *"chỉ chạy `suaTep` cho
app.html + app.js"*. Không hại, nên sửa cho khỏi lừa người sau.)

---

## Việc phải làm trước khi gộp

1. **L1** — `lam-moi.js:268` và `:374`: thêm `await` (và `async` cho `lamMoiManVuaMo`).
   Kèm một ca bàn đo: đánh thức hai người nghe cùng tab thì thẻ tóm tắt phải đúng số.
2. **L2** — chuyển `{ goc: … }` từ `app.js:223` về `app.js:133`, từ `app.js:444` về
   `app.js:279`; xoá hai đối số chết.
3. **L3** — thêm 3 ca vào `do-tu-lam-moi`: đường nút thật (ghi + gọi tay = đúng 6 lượt),
   ghi 500 → 0 lượt gọi thêm, và thêm `dulieunen` vào `QUYEN`.
4. **L5** — sửa lời khai: **25** màn nghe, không phải 24; nói rõ ba con số 1/50/64 đếm
   theo đơn vị nào và **không có bàn nào tái lập được**.

Bốn việc, không việc nào đụng kiến trúc. **Vá đúng hướng, chỉ chưa xong.**
