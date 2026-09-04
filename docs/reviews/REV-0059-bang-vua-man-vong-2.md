# REV-0059 vòng 2 — Bảng vừa một màn

**Kết luận: PASS** — 0 lỗi CHẶN. Còn **2 lỗi CAO** phải đóng trước lần đụng vào bảng kế tiếp.

Nhánh `fix/bang-vua-man-het-keo-ngang` · `b8f6747` (đã gộp `origin/main c55e9ce`)
· soi ngày 04/09/2026 · người soi: Hồ Ly.

> Ba lỗi vòng 1 đã vá **thật**, tôi đo lại bằng chính bàn dò của mình chứ không
> đọc lời khai. Cửa quyền của nút "Chi tiết" **không rò**, kể cả khi tôi ép đúng
> cái ca nó sinh ra để chặn. Bốn chỗ khai lệch đều đã sửa.
>
> Hai lỗi CAO còn lại **không phải lỗi người dùng gặp** — chúng là lỗ hổng của
> phép đo và một chức năng mất đường bấm trên điện thoại.

---

## Nói ngắn cho Sếp

| Câu hỏi | Trả lời |
|---|---|
| Bảng Nhân sự còn kéo ngang trên điện thoại không? | **Hết.** 341/341px, vừa khít. Tôi tự đo. |
| Nút "Chi tiết" có làm rò lương không? | **Không.** Tôi ép đúng ca nguy hiểm nhất, bí mật vẫn không lọt. |
| Ô tick của chị Hằng đã bấm được chưa? | **Rồi** — 44×44px, có nhãn "Chọn dòng". Nhưng **"Chọn tất cả" thì mất trên điện thoại** (CAO-2). |
| Nó có sửa bàn dò của tôi để lấy điểm không? | **Không.** Năm tệp còn nguyên từng dòng. |
| Bàn đo mới có canh được bảng của Sếp không? | **Chưa** — arm R bỏ sót đúng bảng "Lịch sử làm việc" (CAO-1). |

---

## ⓪ Năm bàn dò của tôi — còn nguyên

`git log -- <tệp>` cho thấy mỗi tệp chỉ xuất hiện trong **đúng một** commit
(`f699272`), tức thêm vào rồi không sửa lần nào. Tôi kiểm cả nội dung, không chỉ
lịch sử — mọi chốt quyết định đỏ/xanh đều y nguyên:

| Bàn dò | Chốt tôi đặt | Hiện tại |
|---|---|---|
| `ho-ly-duong-that.mjs` | vai `quan_ly_kho`, `xem_luong:false`, tên **80 ký tự** | y nguyên |
| `ho-ly-soi-luoi.mjs` | 7 bề ngang `[1440,1280,1024,980,979,414,375]`, chữ **2000 ký tự** | y nguyên |
| `ho-ly-the-va-tick.mjs` | ngưỡng **44px**, đếm cả hai kiểu (`kieuDoGopViec` · `theThat`) | y nguyên |
| `ho-ly-chan-doan.mjs` · `ho-ly-200-the.mjs` | — | y nguyên |

Không có chốt nào bị nới, không có bề ngang nào bị bỏ. ✔

---

## ① CHẶN-1 đã vá THẬT — đo lại bằng bàn dò của tôi

Chạy `node scripts/ho-ly-duong-that.mjs`, **không sửa gì**:

| | vòng 1 | vòng 2 |
|---|---|---|
| 375px bảng/khung | **711/341 CÒN KÉO** | **341/341 vừa** |
| `luoiBang` xử lý dòng | false | **true** |
| ô có `data-nhan` | false | **true** |
| nút "Chi tiết" | false | **true** |
| cột `.cot-phu` được ẩn | false | **true** |
| `white-space` của `.nm` | nowrap | **normal** |

Đúng y số nó khai. Và bản vá này **có hai lớp độc lập**, tôi kiểm bằng cách tiêm
lại lỗi cũ vào `luoiBang()`: bề ngang vẫn 341/341 vì luật CSS mới
(`style.css` — `.luoi-bang tbody .nm { white-space: normal }`) tự nó đã đủ cứu
thanh kéo ngang. Lớp khớp cột lo phần nhãn/nút/cột phụ. Hỏng một lớp thì lớp kia
vẫn giữ — đúng cách nên làm.

### Cửa quyền của nút "Chi tiết" — kết luận độc lập

Đây là chỗ tôi soi kỹ nhất, vì đổi cách khớp cột dễ đổi một lỗi hiển thị lấy một
lỗ rò.

**Cách kiểm:** không tin cách khớp của ứng dụng chút nào — tôi **nhét tên cột
vào chính giá trị** của ô (`«Bộ phận»`). Ô nào đội nhãn khác cái tên nằm trong
giá trị của nó là lệch. `node scripts/ho-ly-cua-quyen-v2.mjs`, **8 ca**:

| Ca | ô / th hiện / th tổng | Nhãn khớp giá trị? |
|---|---|---|
| Nhân sự · `quan_ly_kho` (không lương) | 4 / 4 / 6 | ✅ |
| Nhân sự · `admin` (có lương) | 5 / 5 / 7 | ✅ |
| Góp ý · 4 tổ hợp (người gửi × rủi ro) | 7/7/8 và 8/8/8 | ✅ cả bốn |
| Đơn huỷ · có / không "Mã vận đơn" | 8/8/9 và 9/9/9 | ✅ cả hai |
| Góp ý · **tải lại** (lần 1 không cột → lần 2 có) | 7 / 7 / 8 | ✅ |

Không ca nào lệch. Với vai `quan_ly_kho`, ô lương **không tồn tại** (máy chủ
không gửi) nên không có gì để lộ. Với `admin`, lương hiện đúng ở cột "Lương" và
dòng "Chi tiết" **chỉ mở ra "Vào làm"** — lương không đi qua đường đó (nó là
`.num`, không phải `.cot-phu`).

**Ép đúng ca cửa quyền sinh ra để chặn** (`node scripts/ho-ly-cua-quyen-ep.mjs`):
vẽ đủ ô kèm dữ liệu rồi mới ẩn `<th>` — mô phỏng "máy chủ vẫn gửi, giao diện mới
khoá":

```
trước khi ép:  ô=7 · thHien=7 · nhánh="thHien"    → bí mật nằm trong "Chi tiết" (đúng, cột này không bị khoá)
sau khi ép:    ô=7 · thHien=6 · nhánh="KHÔNG-KHỚP" → dòng chi tiết RỖNG, bí mật KHÔNG lọt ✅
```

Cơ chế: số ô không khớp danh sách nào thì bộ xử lý lùi về danh sách **đầy đủ**,
`ths[i].hidden` thành true, ô bị lọc bỏ. **Cửa quyền giữ được.**

**Một điểm cần nói thẳng, tuy không phải lỗi:** khi số ô khớp danh sách cột đang
hiện thì `ths` là danh sách **đã lọc bỏ th ẩn**, nên `ths[i].hidden` **luôn
false** — cửa quyền ở nhánh đó là vô hiệu. Nó vẫn an toàn, nhưng an toàn nhờ
**bất biến** (cùng một cờ điều khiển cả `<th>` lẫn `<td>`, nên cột bị khoá thì ô
cũng không được vẽ), chứ không nhờ chính câu lệnh lọc đó. Ai sau này vẽ ô mà
quên khoá `<th>` sẽ phá bất biến ấy. Ghi chú trong mã nên nói rõ: *lớp chặn thật
nằm ở máy chủ và ở việc không vẽ ô, câu `ths[i].hidden` chỉ là lớp thứ ba.*

**Kết luận: không có lỗ rò dữ liệu theo quyền.** Hai cột thật sự nhạy cảm (lương
`src/index.js`, giá vốn `src/kho.js`) vẫn bị chặn ở **câu lệnh SQL**, và `<th>`
của chúng bị `remove()` hẳn nên không bao giờ vào tới logic này.

---

## CAO-1 · Arm R chỉ soi 4 trong 27 bảng — và bỏ sót đúng bảng của Sếp

**Mức: CAO** · `scripts/do-bang-that.mjs` (khối `API_THAT` và vòng `TAB_SOI`)

Arm R **là thật, không mượn tên** — tôi kiểm bằng cách tiêm lại đúng lỗi CHẶN-1
gốc vào `luoiBang()`:

```
ĐẠT 47 · TRƯỢT 7
❌ R  @1440px — ns-bang (2/2 dòng · 6 th/4 td) · kd-dhh-bang (2/2 dòng · 9 th/8 td)
❌ R2 @1440px — ns-bang (2 dòng mất nhãn) · kd-dhh-bang (2 dòng mất nhãn)
```

Nó nạp API giả, để ứng dụng tự vẽ, không chèn dòng, và bắt đúng hai bảng hỏng.
**Có răng thật.**

**Nhưng răng chỉ cắn được 4 bảng.** Arm R in ra "soi 4 lượt bảng" (@1440) và
"soi 3" (@375). Bốn bảng đó là `db-bang` · `ns-bang` · `gy-bang` ·
`kd-dhh-bang` — đúng bốn endpoint mà `API_THAT` có mock. Thiếu:

- **`ls-cv-bang` — bảng "Lịch sử làm việc", chính cái Sếp chụp ảnh gửi hai lần.**
  Màn này gọi `/api/cong-viec/lich-su` (`api.js:162` `cvLichSu`), mà `API_THAT`
  **không mock endpoint đó** — chỉ mock `/api/cong-viec/danh-sach`. Bảng vẽ ra 0
  dòng, arm R bỏ qua.
- Cả bốn bảng có ô tick của chị Hằng và anh Duy (`kd-ds-bang`, `kt-ts-bang`,
  `kt-hh-bang`, `ts-bang`).

### Cách tái hiện — lỗ hổng đo được, không phải suy đoán

Cùng **một** lỗi, tiêm vào **hai** bảng khác nhau:

| Tiêm | Bảng | Arm R có soi? | Kết quả |
|---|---|---|---|
| Bỏ `<th class="cot-phu">Vào làm</th>` | `ns-bang` | có | **ĐẠT 47 · TRƯỢT 7** — bắt được |
| Bỏ `<th class="cot-phu">Mục tiêu</th>` | `ls-cv-bang` | **không** | **ĐẠT 54 · TRƯỢT 0** — *lọt* |

Nghĩa là: **phép kiểm thì đúng, vùng phủ mới là lỗ hổng.** Đúng lớp lỗi đã tới
tay Sếp hai lần, nếu quay lại trên bảng "Lịch sử làm việc" thì bàn đo vẫn in
xanh.

Cộng thêm: chốt duy nhất canh vùng phủ là `soSoi > 0`. Một tên trường trong mock
đổi đi (chuyện đã xảy ra: mock đơn huỷ dùng `ma_don_hang`/`san_pham`/`ly_do_huy`
trong khi `veBangDonHuy` đọc `order_sn`/`san_pham_ten`/`huy_ly_do_khach`, nên
bảng đó vẽ ra toàn dấu "—") thì vùng phủ tụt âm thầm mà arm vẫn xanh.

**Hướng sửa (Khỉ Đột tự quyết):** mock thêm `/api/cong-viec/lich-su` và các
endpoint của bốn bảng ô tick; đổi `soSoi > 0` thành một **mẫu số cứng** giống
arm D (`soSoi >= N`, sửa N là lời nhắc "bảng mới đã vào arm R chưa?"); và sửa tên
trường mock đơn huỷ cho khớp mã thật.

---

## CAO-2 · "Chọn tất cả" mất đường bấm trên điện thoại — lỗi mới do chế độ thẻ

**Mức: CAO** (hồi quy do bản vá này) · `public/app.html:1125, 1729, 1767, 1929`

Bốn ô "Chọn tất cả" đều nằm trong `<thead>`. Mà chế độ thẻ có
`.luoi-bang thead { display: none }`. Tự đo
(`node scripts/ho-ly-nguong-60-va-tick.mjs`):

| | 1440px | 375px |
|---|---|---|
| ô tick từng dòng | 44×44 ✅ | 44×44 ✅ |
| ô **"Chọn tất cả"** | 44×44 ✅ | **0×0 — không bấm được** |

Trước bản vá, ở 375px bảng vẫn là bảng nên `<thead>` hiện và ô này bấm được.
**Đây là chức năng mất đi, không phải chức năng chưa từng có.**

Bốn bảng dính: **Đối soát sàn · Kế toán tra soát · Kế toán hàng hoàn** (việc hằng
ngày của **chị Phan Thị Hằng**, vừa nhận Kế toán trưởng) và **Tài sản** (anh
**Phạm Khương Duy**).

**Nhẹ đi ở ba chỗ** — nên là CAO chứ không phải CHẶN:

- Tick **từng dòng** vẫn chạy tốt: 44×44px, có nhãn "Chọn dòng".
- Nút **"Bỏ chọn"** vẫn bấm được — nó nằm ở thanh `#kt-ts-thanhchon`, một `<div>`
  **ngoài** bảng (`app.html:1719`), không bị `thead{display:none}` đụng tới.
- Trên máy tính không ảnh hưởng gì.

Nhưng thanh đó chỉ hiện khi đã chọn ≥1 dòng, và trong đó **không có nút "Chọn tất
cả"**. Nên trên điện thoại, muốn tra soát 30 đơn hoàn là phải tick 30 lần.

**Hướng sửa:** thêm nút "Chọn tất cả" vào chính thanh `kd-thanh-chon` (nó đã nằm
ngoài bảng, đã có "Bỏ chọn" làm hàng xóm), hoặc cho thanh đó hiện sẵn ở chế độ
thẻ. Không nên chữa bằng cách hiện lại `thead` — thế là mất luôn chế độ thẻ.

---

## ② CAO-1 vòng 1 — chốt 4 → 3: hạ vì ĐO ĐƯỢC, không phải hạ cho qua

Đây là chỗ tôi soi kỹ nhất sau cửa quyền, vì "hạ mốc" đúng là cách `MOC_TRAN` ra
đời. **Kết luận: hạ đúng.** Ba lý do, đều đo được:

**1. Dữ liệu đã khó hơn, không phải chốt dễ đi.** `do-gop-viec-lichsu.mjs` nay
dựng tiêu đề **đúng 200 ký tự** và đầu ra **đúng 1000 ký tự** cho *mọi* dòng
(`toiTran`, trần máy chủ `src/index.js`). `MOC_TRAN` hạ mốc để khớp hiện trạng
hỏng đo bằng dữ liệu dễ; đây là mốc tụt xuống **vì phép đo trung thực hơn**. Hai
việc ngược nhau.

**2. Ở màn rộng số dòng KHÔNG giảm, còn tăng:** 1440px `8/7 → 8/8`.

**3. Số 3 là sàn thật, thậm chí còn dè dặt.** Tôi đếm độc lập ở ba độ dài tiêu
đề (`node scripts/ho-ly-dem-the-3-muc.mjs`, 375px):

| Tiêu đề | Số thẻ một màn | Chiều cao thẻ |
|---|---|---|
| 30 ký tự (ca thường) | **4** | 163px |
| 100 ký tự | **4** | 184px |
| 200 ký tự (trần) | **4** | 184px |

Kẹp 2 dòng ăn hết phần dôi ra — quá ~100 ký tự thì thẻ **thôi cao thêm**. Bàn đo
của nó báo 3 (dòng của nó còn chở thêm đầu ra 1000 ký tự), tôi đo được 4. Tức
mốc 3 **thấp hơn** cả số xấu nhất tôi đo được. Không có chỗ nào ép cho đẹp.

**Còn dùng được không (câu ⑦)?** Được, và tôi cho là đổi có lời. Ở 375px, thứ
người dùng thấy **ngay, không phải bấm gì**:

> Việc · Đầu ra cần đạt · Người nhận · Hạn chót · Trạng thái · nút hành động

Năm trường + nút, trên 3–4 thẻ. So với trước bản vá: 9 dòng nhưng phải kéo ngang
mới thấy người nhận và hạn chót — tức 9 dòng × 2 trường đọc được. **3 thẻ × 5
trường đọc được ăn đứt 9 dòng × 2 trường.** Lập luận của Khỉ Đột đứng vững, và
lần này nó có số đo ở cả hai đầu chứ không chỉ một.

---

## ③ Ô tick — vá đúng, tự đo bằng bàn dò của tôi

`node scripts/ho-ly-the-va-tick.mjs`, **không sửa gì**:

| Bảng | 1440px | 414px | 375px | Nhãn trong thẻ |
|---|---|---|---|---|
| `kd-ds-bang` Đối soát sàn | 44×44 | 44×44 | 44×44 | **Chọn dòng** |
| `kt-ts-bang` Kế toán tra soát | 44×44 | 44×44 | 44×44 | **Chọn dòng** |
| `kt-hh-bang` Kế toán hàng hoàn | 44×44 | 44×44 | 44×44 | **Chọn dòng** |
| `ts-bang` Tài sản | 44×44 | 44×44 | 44×44 | **Chọn dòng** |

Chiều cao dòng không đổi (lề âm 13px bù đúng phần vùng chạm nở ra), màu xanh lá
cho ô đã chọn — đúng `docs/BANG-MAU.md`, không dùng đỏ. Ảnh
`375-taisan-otick-sau.png` cho thấy nhãn "CHỌN DÒNG" nằm riêng một hàng đầu thẻ,
ô đã chọn hiện rõ.

**Tick còn dùng được thật:** chọn 3 dòng → 3, bỏ 1 → 2 (bấm thật, không gán
`.checked`). Chỉ "Chọn tất cả" là hỏng đường bấm ở ≤980px — đã ghi ở CAO-2.

> *Đọc ảnh cẩn thận:* trong `375-taisan-otick-sau.png` có dòng "Chưa có tài sản
> nào." nằm dưới ba thẻ. **Đó là hiện tượng của bàn chụp, không phải lỗi ứng
> dụng** — `app.js:7457` đặt `#ts-trong.hidden` theo **mảng dữ liệu**, mà bàn
> chụp chèn dòng thẳng vào DOM trong khi API trả mảng rỗng.

---

## ④ Bốn chỗ khai lệch vòng 1 — xác nhận sửa cả bốn

| Chỗ lệch | Vòng 2 |
|---|---|
| Chỉ khai "9 → 5", giấu con số thứ hai | ✅ ghi cả hai (`3` và `4`), và cả số 1440px |
| "chừa đúng một thẻ dung sai" (sai với `gop.congty`) | ✅ đã bỏ câu đó |
| "ma trận Xếp ca giữ kéo ngang ở mọi bề ngang" — chưa chứng minh ở 375px | ✅ arm X **dựng thật** tiêu đề 7 ngày + hàng ca rồi mới chấm |
| Arm C mang tên "đủ dài để cãi được" trong khi chỉ đếm ký tự | ✅ đổi tên đúng việc nó làm |

**Đánh giá cách xử arm C — nên giữ, không nên bỏ.** Tên mới nói thẳng
*"ĐẾM KÝ TỰ — máy không đọc được nghĩa, người soi mới là cửa chặn"*. Đó là cách
xử đúng, vì arm C vẫn làm được ba việc mà bỏ đi thì mất:

1. Bắt buộc **có** một lý do — không thêm khoá suông được như `MOC_TRAN`.
2. Bắt lý do **lọt vào diff**, nơi người soi đọc được (chính là cách tôi bắt được
   nó ở vòng 1).
3. Ràng danh sách miễn trừ về **một nguồn** trong `app.js`, không có bản sao.

Cái nó *không* làm được thì nay đã ghi ngay trên tên. Một phép đo yếu mà **khai
đúng độ yếu của mình** thì dùng được; nguy hiểm chỉ đến khi nó đội tên to hơn
sức. Giữ.

---

## ⑤ Hai lỗi nó tự bắt thêm

### (a) Lưới chặn cuối — đúng như khai, và tôi tìm được mép của nó

Chạy lại `node scripts/ho-ly-soi-luoi.mjs` (chữ 2000 ký tự nhồi **mọi** cột):

| Bề ngang | vòng 1 | vòng 2 |
|---|---|---|
| 1440 · 1280 · 1024 | 22 · 22 · 22 tràn | **1 · 1 · 1** |
| 980 · 979 · 414 · 375 | 0 | **0** |

Và "1" đó là `kd-ds-bang` — đúng bảng miễn trừ có lý do. Khai chính xác.

**Ngưỡng 60 ký tự ở đâu ra?** Tôi đo bằng cách nhồi chính xác 55/60/61 ký tự vào
mọi cột (`node scripts/ho-ly-nguong-60-va-tick.mjs`):

| Độ dài | 1440px | 1024px |
|---|---|---|
| 55 ký tự | **20 bảng tràn** | 22 bảng tràn |
| 60 ký tự | **20 bảng tràn** | 22 bảng tràn |
| **61 ký tự** | **1 bảng** | **1 bảng** |
| 68 ký tự | 1 bảng | 1 bảng |

Có một **vách đứng ngay tại 60**: chữ 40–60 ký tự không được cấp trần, vẫn
`nowrap`, và một cột như thế rộng tới 380px.

**Nhưng đo bằng dữ liệu THẬT thì chưa cắn.** Tôi thử lại trên **đường vẽ thật**
với chữ thật của ngành (`node scripts/ho-ly-chu-vua-vua.mjs`) — tên nông sản kèm
quy cách, họ tên kèm chức danh:

```
'Nguyễn Thị Huyền — Vận hành sàn Shopee & TikTok'     47 ký tự
'Chuyên viên Vận hành sàn kiêm Chăm sóc khách hàng'   49 ký tự
'Hạt điều rang muối Bình Phước loại A túi 500g'       45 ký tự
```

→ `ns-bang` 1134/1134 **vừa**, `kd-dhh-bang` 1134/1134 **vừa** ở cả
1440/1280/1024.

Lý do: phải **nhiều cột cùng lúc** mang 45–60 ký tự mới đủ đẩy bảng ra; dữ liệu
thật thì chỉ một hai cột như thế. Ô "Bộ phận" 38 ký tự chiếm 534px (47% khung)
mà bảng vẫn vừa vì các cột khác hẹp.

**Nên tôi xếp đây là VỪA, không phải CAO:** cơ chế có lỗ, hôm nay chưa ai rơi vào,
nhưng thêm **một** cột chữ vừa vừa vào `ns-bang` là lật. Đề nghị ghi con số 60
kèm câu "đây là mép, không phải mốc an toàn" ngay tại chỗ, để người sau biết.

### (b) Bàn đo tự kiểm mất răng — sửa thật

Ca này đáng đọc: **một bản vá tốt làm hỏng chính phép đo canh nó.** Lưới chặn
cuối cứu luôn cả mẫu hỏng giả, nên `--tu-kiem` in "54 ĐẠT · 0 TRƯỢT" — thôi
chứng minh được mình còn mắt. Nó gài lại vào chỗ lưới không nuốt được (14 cột
chữ ngắn). Tôi chạy lại:

```
do-bang-that --tu-kiem     → ĐẠT 52 · TRƯỢT 2   (bang-gai-tu-kiem +991px @1440, +1151px @1280)
do-bang-vua-man --tu-kiem  → ĐẠT 36 · TRƯỢT 3   (db-bang +73px @1440, +413px @1100)
```

Đỏ đúng, đúng số khai. ✔

**Bài học nên ghi thành luật:** mỗi lần thêm một lớp chống-hỏng tự động, phải
chạy lại `--tu-kiem` — vì lớp mới có thể cứu luôn mẫu hỏng giả và biến bàn đo
thành đồ trang trí mà không ai thấy.

### Tôi tự gài cách thứ ba — và nó LỌT

Xem **CAO-1**: bỏ một `<th>` khỏi `ls-cv-bang` (số ô **nhiều hơn** số tiêu đề —
chiều ngược của CHẶN-1) → **54/0, không bắt được**. Cùng lỗi đó trên `ns-bang` →
**47/7, bắt được**. Vùng phủ, không phải phép kiểm.

---

## ⑥ Bảng thứ 27 — đếm độc lập, khớp

```
grep -c "<table" public/app.html            → 26
+ #cv-tqct-phongban (app.js:3684, dựng bằng innerHTML)  → 1
                                            = 27
SO_BANG_PHAI_SOI = 27  ✔   arm D in "đã soi 27 bảng"  ✔
```

`qrcode-lib.js:462` cũng có chuỗi `<table>`, nhưng đó là `createTableTag()` —
**mã chết**: ứng dụng gọi `createSvgTag` (`app.js:7718`), không bao giờ chèn bảng
QR vào trang. Đã kiểm, không tính vào mẫu số. **27 là đủ.**

## THẤP-1 · `.luoi-bang` được gắn TRƯỚC khi kiểm có `<thead>` hay không

**Mức: THẤP** · `public/assets/js/app.js` trong `luoiBang()`

```js
if (!BANG_KHONG_THANH_THE.has(ma)) t.classList.add('luoi-bang');
if (!hangTieuDe) return;                  // ← thoát SAU khi đã gắn lớp
```

Bảng nào không có `<thead>` vẫn nhận `.luoi-bang`, tức vẫn đổi sang thẻ ở
≤980px, mà lại **không** được dập `data-nhan` — thẻ không nhãn. Hôm nay chưa
bảng nào rơi vào (bảng QR là mã chết), nên chỉ là THẤP. Đảo hai dòng là xong.

---

## ⑦ Hai chỗ nó tự cắt phạm vi — đánh giá

- **375px vẫn 3 thẻ ở ca xấu nhất, không ép lên 4.** *Đồng ý, và đây là chỗ nên
  khen.* Nó ghi đúng số đo được và nói cách đúng là bỏ bớt **trường** trên thẻ
  chứ không hạ mốc. Tôi đo lại còn ra 4 — mốc nó đặt thậm chí còn dè dặt hơn
  thực tế.
- **Đối soát sàn vẫn kéo ngang ở ≥1024px, ≤980px thành thẻ.** *Đồng ý.* 12 cột,
  4 cột ghim trái, việc là tick từng dòng rồi đọc ngang cả hàng so tiền với sàn —
  lý do đứng vững, có chứng cứ trong mã (ô tick + cột "Đã tra soát" + nút theo
  dòng). Trên điện thoại vẫn thành thẻ nên Sếp không gặp thanh kéo. **Nhưng** đây
  đúng là bảng dính CAO-2 (mất "Chọn tất cả" ở chế độ thẻ) — hai chuyện phải đọc
  cùng nhau.

---

## ⑧ Chạy lại hết — không số nào lệch

| Cổng | Khai | Tôi đo |
|---|---|---|
| `do-bang-that` | 54/0 | **ĐẠT 54 · TRƯỢT 0** ✔ |
| `do-bang-vua-man` | 39/0 | **ĐẠT 39 · TRƯỢT 0** ✔ |
| `do-gop-viec` | ĐẠT | **ĐẠT TẤT CẢ** ✔ |
| `cong-khoi` @1440 | XANH | **XANH** ✔ |
| `cong-khoi-dienthoai` @375 | XANH | **XANH** ✔ |
| `do-cat-im-lang` | SẠCH | **SẠCH** ✔ |
| `do-chu-dai` | XANH | **XANH** ✔ |
| `do-ba-mau` | ĐẠT | **ĐẠT — đối chứng 12/12** ✔ |
| `do-moc-noi` | 9/0 | **ĐẠT 9 · TRƯỢT 0** ✔ |
| `do-quet-375` | ĐẠT | **ĐẠT** ✔ |
| `do-tai-tep` | ĐẠT | **ĐẠT cả hai bề ngang** ✔ |
| `do-tach-vai-tro` | 61/0 | **ĐẠT 61 · TRƯỢT 0** ✔ |
| `do-hai-o-tren-man` | 14/0 | **ĐẠT 14 · TRƯỢT 0** ✔ |
| `do-bang-that --tu-kiem` | 52/2 đỏ đúng | **ĐẠT 52 · TRƯỢT 2** ✔ |
| `do-bang-vua-man --tu-kiem` | 36/3 đỏ đúng | **ĐẠT 36 · TRƯỢT 3** ✔ |

**Ảnh:** 28 tệp trong `docs/reviews/anh-bang-vua-man/` (26 + 2 ảnh ô tick) —
đúng số khai. Đã xem cặp `1440-lichsuviec-truoc/sau` và hai ảnh ô tick.

### Luật nhà

- **Ba màu** — ĐẠT, đối chứng bắt 12/12. Ô tick dùng xanh lá cho trạng thái đã
  chọn, không dùng đỏ. ✔
- **Chi phí 0** — `git diff f50e9de..HEAD -- package.json` **rỗng**, không thêm
  gói, không thêm cả dòng lệnh nào. ✔
- **Chạm ≥44px** — tự đo: ô tick 44×44 ở cả ba bề ngang, nút "Chi tiết" 44×44
  @1440 và 81×44 @375/414. ✔ (trừ "Chọn tất cả" — CAO-2)
- **Tiếng Việt có dấu** — đủ dấu toàn bộ. ✔
- **Không cắt chữ âm thầm** — `do-cat-im-lang` SẠCH; tiêu đề bị kẹp 2 dòng đều
  kèm nút "Xem thêm" qua `dg()`, không đẻ cơ chế thứ hai. ✔
- **Hai ghi chú lệch của vòng 1** — sửa cả hai: tiêu đề khối đổi `≤780px` →
  `≤980px`, và ghi chú mồ côi về "dấu chấm giữa" đã thay bằng ghi chú thật. ✔

### Gộp với `origin/main`

`git fetch origin` → `origin/main` nay ở **`c221fd0`** (đã đi tiếp từ `c55e9ce`
như báo). Nhánh: **4 ahead, 1 behind**. Commit mới chỉ đụng `scripts/`
(`do-kho-tai-lieu`), không chồng lấn với các tệp của đợt này
(`public/`, `do-bang-that.mjs`, `do-gop-viec-lichsu.mjs`). Gộp khô sạch.

---

## Chốt lại

Vòng này vá đúng cả ba lỗi, và vá **đúng cách**: CHẶN-1 có hai lớp độc lập; ô
tick vẽ lại vùng chạm mà không đụng chiều cao dòng; chốt `do-gop-viec` hạ xuống
vì **dữ liệu khó hơn** chứ không vì muốn qua cửa. Cửa quyền tôi ép mọi cách vẫn
không rò. Bốn chỗ khai lệch sửa hết, và arm C được đổi tên cho đúng sức mình —
đó là thái độ đúng với một phép đo yếu.

Hai việc còn nợ, cả hai đều **không phải thứ người dùng gặp hôm nay**:

1. **CAO-1** — arm R mới soi 4/27 bảng và bỏ sót đúng bảng "Lịch sử làm việc" của
   Sếp. Tôi chứng minh được bằng cùng một lỗi tiêm vào hai bảng: bắt ở bảng có
   phủ, lọt ở bảng không phủ. Đây là lớp lỗi đã tới tay Sếp **hai lần** — canh nó
   bằng một tấm lưới thủng đúng chỗ đó thì không yên tâm được.
2. **CAO-2** — "Chọn tất cả" mất đường bấm ở ≤980px trên bốn bảng, trong đó ba là
   việc hằng ngày của chị Hằng.

Đề nghị: đóng CAO-2 ngay (thêm nút vào thanh đã có sẵn ngoài bảng), và đóng CAO-1
**trước lần đụng vào bảng kế tiếp** — chứ đừng để tới lúc cần nó.

---

### Bàn dò vòng 2

| Tệp | Trả lời câu gì |
|---|---|
| `scripts/ho-ly-cua-quyen-v2.mjs` | nhãn ↔ giá trị trên 8 ca (3 bảng × nhiều vai/cờ) + ca tải lại |
| `scripts/ho-ly-cua-quyen-ep.mjs` | ép đúng ca cửa quyền sinh ra để chặn |
| `scripts/ho-ly-nguong-60-va-tick.mjs` | vách 60 ký tự · ô tick có dùng được không |
| `scripts/ho-ly-chu-vua-vua.mjs` | chữ 38–49 ký tự trên đường vẽ thật — vách kia có cắn không |
| `scripts/ho-ly-dem-the-3-muc.mjs` | số thẻ một màn ở 30/100/200 ký tự |

Cộng 5 bàn dò vòng 1 vẫn chạy nguyên. Gợi ý: gộp `ho-ly-cua-quyen-v2` thành một
arm cạnh arm R (nó là phép kiểm nhãn↔giá trị mà arm R chưa có), và **mock thêm
`/api/cong-viec/lich-su` cho arm R** — đó là việc quan trọng nhất của vòng sau.
