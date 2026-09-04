# REV-0058 vòng 2 — Tách vai trò hệ thống khỏi vị trí công việc

> Hồ Ly soi nhánh `fix/tach-vai-tro-vi-tri` @ `094b1e6`. Ngày 04/09/2026.
> Chỉ soi PHẦN VÁ và phần bị động vào — vòng 1 đã PASS.
> Không commit, không sửa mã sản phẩm.

## KẾT LUẬN: **PASS**

**Bốn lỗi vòng 1 đều đã vá thật, và tôi đo lại bằng chính bộ dò của vòng 1.**
Không có lỗi CHẶN. Không có lỗi CAO.

Quan trọng nhất: **bản vá `src/auth.js` KHÔNG phá lại cửa sổ "mã mới, DB chưa
migration"** mà vòng 1 đã chứng minh sạch. Chạy lại đủ **792 phép gọi API trên
3 trạng thái deploy: 0 lệch, 0 mã 500.**

| Vá | Trạng thái | Bằng chứng |
|---|---|---|
| ① `src/auth.js` nuốt lỗi D1 | ✅ **VÁ ĐÚNG** | bộ dò vòng 1 đi từ **7/1 → 8/0** |
| ② dấu thời gian ghi vết | ✅ **VÁ ĐÚNG** | ghi `10:00:00` = đúng đồng hồ băng +7h |
| ③ từ điển nhãn (6 khoá) | ✅ **VÁ ĐÚNG** | 6/6 khoá có mặt, không màu đỏ |
| ④ `.ql-goiy-item` 44px | ✅ **VÁ ĐÚNG** | *(mục ④)* |

**Ba việc nên sửa — không cái nào chặn gộp, cả ba đều một dòng:**

| Mức | Việc | Ở đâu |
|---|---|---|
| VỪA | **DC-J là phép đo RỖNG** ngoài khung 09:00–11:00 giờ VN — bắt "được" cả mã lành | `do-tach-vai-tro.mjs:169` |
| VỪA | Chốt từ điển nhãn **mù đúng chỗ dễ mắc nhất** — thêm lời gọi `ghiVetVaiTro()` là lọt | `do-tach-vai-tro.mjs:220` |
| THẤP | Vế `\|\| !/vi_tri_cong_viec/i.test(tin)` là **thừa**, chỉ thêm giòn | `src/auth.js:153` |

---

## Việc dọn của Gạo — tách commit ĐÚNG, bốn bàn đo KHÔNG bị đụng

- `094b1e6` chứa **đúng 5 tệp của tôi** (1 báo cáo + 4 bàn đo), 1525 dòng thêm,
  **0 dòng xoá**. `92ac305` chứa **đúng 8 tệp của Khỉ Đột**. **Không chồng lấn
  một tệp nào.** Tách sạch.
- Nội dung 4 bàn đo **nguyên vẹn**: số khẳng định `ok(` = 16 / 9 / 8 / 8 đúng
  như tôi viết, và **mọi điều kiện bắt lỗi cốt lõi còn nguyên văn** —
  `xau.length === 0` · `l12.length === 0` · `l13.length === 0` ·
  `cuaSai(...) === 200 && cuaDung(...) === 403` ·
  `!(r.status === 200 && dong && dong.vi_tri_cong_viec == null)`.
  Cây làm việc sạch.
- ⚠️ **`git fetch` xong: `origin/main` VẪN ở `ad4bc95`** — đúng mốc gốc của
  vòng 1, **chưa đi bước nào**. `git rev-list --count HEAD..origin/main` = **0**.
  Không cần rebase. *(Tin "main đã đi 5 lần hôm nay" không khớp với remote.)*

---

## ① `src/auth.js` — soi như mã mới

Bản vá (`src/auth.js:152-153`):

```js
const tin = String(e && e.message);
if (!/no such column/i.test(tin) || !/vi_tri_cong_viec/i.test(tin)) throw e;
```

Đây **là** chốt bằng so chuỗi thông báo lỗi. Gạo hỏi đúng hai câu; tôi trả lời
bằng cách bơm **7 cách ghi thông báo** khác nhau vào đúng câu thăm dò, rồi đo
mã HTTP ở **cả 4 cửa gọi `coCotViTri`** cộng cửa đăng nhập.
Bàn đo: `scripts/holy-vong2-auth.mjs`.

### Thông báo lỗi THẬT khi thiếu cột

```
"no such column: vi_tri_cong_viec"
```
Khớp **cả hai** vế của chốt. ✅

### Bảng đo — 7 cách ghi × 5 cửa

| cách ghi | danh bạ | qt/danh-sách | tôi-là-ai | tạo TK | sửa vai trò | ô 2 ghi ra |
|---|---|---|---|---|---|---|
| W1 SQLite địa phương (thật) | 200 | 200 | 200 | 200 | 409 | null |
| W2 D1 từ xa (thật) | 200 | 200 | 200 | 200 | 409 | null |
| W3 D1 chập tạm thời | 500 | 500 | **200** | **500** | 500 | *(không tạo)* |
| W4 D1 quá tải | 500 | 500 | **200** | **500** | 500 | *(không tạo)* |
| W5 Cloudflare đổi câu chữ | 500 | 500 | **200** | 500 | 500 | *(không tạo)* |
| W6 thiếu cả BẢNG | 500 | 500 | **200** | 500 | 500 | *(không tạo)* |
| W7 không kèm tên cột | 500 | 500 | **200** | 500 | 500 | *(không tạo)* |

### Câu ① — lỗi tạm thời có hỏng TO thay vì âm thầm ghi thiếu không? **CÓ**

W3/W4 → cửa tạo tài khoản **500**, **không tạo tài khoản nào**. Đúng ý bản vá.
Bộ dò vòng 1 của tôi (`holy-do-weakmap-va-o1.mjs`) đi từ **ĐẠT 7 · TRƯỢT 1**
sang **ĐẠT 8 · TRƯỢT 0** — chính cái khẳng định đỏ ở vòng 1 nay xanh, với
chứng cứ `HTTP 500 · dòng ghi ra: undefined`. **Vá đúng, đo được.**

### Câu ② — có lỗi THIẾU CỘT nào nay bị ném ra 500 không? **KHÔNG, với cách ghi thật**

W1 và W2 — hai cách ghi **thật sự xảy ra** (SQLite địa phương và D1 từ xa) —
**không cửa nào sập**. Cửa sổ nguy hiểm còn nguyên vẹn. Xác nhận bằng phép đo
lớn: **792 phép gọi trên 3 trạng thái deploy, 0 lệch, 0 mã 500** (mục dưới).

### Điều đáng khen: ĐĂNG NHẬP sống độc lập ở CẢ 7 cách ghi

`/api/toi-la-ai` trả **200 ở tất cả 7 dòng**, kể cả W6 "thiếu cả bảng".
`docPhien()` có đường phòng thủ **riêng**, không gọi `coCotViTri()`. Nghĩa là
**hàm vừa vá KHÔNG BAO GIỜ khoá được ai ra ngoài** — thuộc tính quan trọng
nhất của mã đọc phiên, và nó đúng.

### 🔵 THẤP — vế thứ hai của chốt là THỪA, chỉ làm giòn thêm

**File:dòng:** `src/auth.js:153`

Câu thăm dò là `SELECT vi_tri_cong_viec FROM tai_khoan LIMIT 1` — **tham chiếu
đúng MỘT cột**. Nên mọi lỗi "no such column" phát ra từ nó **tất yếu** nói về
`vi_tri_cong_viec`. Vế `|| !/vi_tri_cong_viec/i.test(tin)` **không phân biệt
thêm được gì**, mà nhân đôi bề mặt so chuỗi.

Đo được (W7): thông báo `"D1_ERROR: no such column"` **không kèm tên cột** →
chốt ném lỗi → **4/5 cửa sập 500** trong quãng chưa nạp migration.

*(`docPhien()` **cần** cả hai vế vì nó phải phân biệt **hai** cột tuỳ chọn.
`coCotViTri()` chỉ có một. Chép khuôn mà không xét bối cảnh.)*

**Sửa:** bỏ vế thứ hai → `if (!/no such column/i.test(tin)) throw e;`
Xoá hẳn W7 khỏi danh sách cách hỏng, mọi thứ khác giữ nguyên.

### 🔵 THẤP — hai cửa ĐỌC nay 500 ở chỗ trước kia còn chạy

W3/W4 làm `/api/danh-ba` và `/api/quan-tri/danh-sach` trả **500**; trước bản vá
chúng vẫn trả 200 (dù sai: danh bạ **để lọt tài khoản thử** vì mất bộ lọc
`!= 'nv_test'`).

Đánh giá: **đổi đúng chiều.** Sai âm thầm đổi lấy hỏng thành thật, và người
dùng bấm lại là xong. Nhưng đây **là** một kiểu hỏng mới trên hai đường ĐỌC —
ghi ra để không ai ngạc nhiên khi D1 chập. Không cần sửa.

---

## ② Dấu thời gian ghi vết — VÁ ĐÚNG

```
Đồng hồ bàn đo đóng băng : 2026-09-04T03:00:00Z (UTC)
Giờ VN mong đợi (+7h)    : 2026-09-04 10:00:00
Dòng ghi vết đo được     : 2026-09-04 10:00:00   ✅ KHỚP
```

Dòng ghi vết đầy đủ, đúng khuôn cũ → mới → ai → lúc nào:

```json
{"loai_su_kien":"doi_vai_tro","gia_tri_cu":"Người dùng",
 "gia_tri_moi":"Người dùng · Nhân viên kho","nguoi_thuc_hien_id":"SEP",
 "luc":"2026-09-04 10:00:00"}
```

*(Ở một vòng chạy trước tôi báo đỏ chỗ này — **lỗi bàn đo của tôi**: tôi so với
`datetime('now')` SỐNG của SQLite thay vì với đồng hồ đã đóng băng. Bản vá
đúng.)*

### 🟠 VỪA — DC-J, ca đối chứng canh chính bản vá ②, là PHÉP ĐO RỖNG

**File:dòng:** `scripts/do-tach-vai-tro.mjs:169`

Gạo hỏi thẳng: *"kiểm xem DC-J có mắc bẫy tương tự không"*. **Có.**

Bộ dò của DC-J so hai vế **dùng HAI ĐỒNG HỒ KHÁC NHAU**:

| vế | đọc qua | đồng hồ |
|---|---|---|
| `vet.luc` (dòng ghi vết) | **vỏ D1** → `thayDongHo()` thay `'now'` | **ĐÓNG BĂNG** = 10:00 VN |
| `mocVN` (mốc so sánh) | `db.prepare` **RAW** của `node:sqlite` | **THẬT** = giờ chạy bàn đo |

Ngưỡng "lệch > 1 tiếng" vì thế **chỉ đúng khi bàn đo được chạy trong khoảng
09:00–11:00 giờ VN**. Ngoài khoảng đó, bộ dò trả `true` **dù mã đúng hay sai**.

**Cách tái hiện** (`scripts/holy-vong2-dcj.mjs`) — chạy CHÍNH bộ dò của DC-J
trên bản `src` **LÀNH LẶN, không tiêm gì**:

```
Đồng hồ băng 03:00Z (= 10:00 VN)   lệch   38 phút → bộ dò trả false   ✅ đúng
Đồng hồ băng 20:00Z (= 03:00 VN)   lệch  982 phút → bộ dò trả TRUE    ⚠ RỖNG
```

Dòng thứ hai là **mã lành mà bộ dò vẫn kêu "BẮT ĐƯỢC"**. `chayDC()` đếm
"bộ dò trả true" là "bắt được", nên **DC-J xanh vĩnh viễn** — kể cả khi có
người bỏ `+7 hours` đi lần nữa.

**Vì sao hại:** DC-J tồn tại để canh đúng cái lỗi vòng 1 tìm ra. CI chạy lúc
3 giờ sáng thì nó xanh vì lý do sai, báo cáo vẫn ghi 10/10, và lần lệch giờ
tiếp theo **không ai bắt được**. Đây đúng cái bẫy DC-I vừa thoát — nguyên văn
Khỉ Đột: *"phép đo bắt được lỗi bằng lý do sai thì cũng vô dụng như phép đo
không bắt được."* Câu đó đúng, và nó áp cho DC-J.

**Sửa (một dòng):** lấy mốc so sánh **qua vỏ D1** (`d1.prepare`) để hai vế
cùng một đồng hồ — hoặc so thẳng `vet.luc` với mốc đóng băng + 7 tiếng.

### ✅ DC-I thì ĐÃ SỬA THẬT

`do-tach-vai-tro.mjs:145` xoá tài khoản của anh Linh **trước** khi gọi cửa
tạo mới, kèm chú thích nói rõ vì sao. Không còn dừng ở *"đã có tài khoản rồi"
(400)*. Bơm lỗi D1 **đúng một lần**, mọi câu khác chạy thật, nên 200 trả về
chỉ có thể do nuốt lỗi. **Ca đối chứng đúng, bắt đúng lý do.** Ghi nhận: nó tự
tìm ra và tự nói ra.

---

## ③ Từ điển nhãn sự kiện

**Vá đúng:** 6 khoá đã có mặt (`app.js:5013-5018`), đủ dấu tiếng Việt, dựng
bằng text đã escape trong `<td class="sm">` — **không màu, không đỏ**. Hai emoji
🔑 theo đúng lệ 🙋/⚠️ có sẵn.

**Lời khai "4 khoá đã hỏng từ TRƯỚC bản này": XÁC NHẬN.** Từ điển trên
`origin/main` có đúng 9 khoá; `ky_nang` · `doi_ngay_sinh` · `mo_ta_cong_viec` ·
`khoi_phuc_dang_nhap` đều đã được máy chủ ghi mà không có nhãn. Chỉ
`cap_tai_khoan` và `doi_vai_tro` là của bản này. Nó nói đúng — lỗi rộng hơn
tôi báo ở vòng 1, và nó tự mở rộng phạm vi để vá hết.

### 🔵 THẤP — con số là **14**, không phải 15

Đếm độc lập mọi chuỗi thật sự vào `loai_su_kien`: **14**. Con số 15 tính cả
`nghi_viec`, thứ **chưa có chỗ nào ghi** — nó chỉ sống trong một chú thích SQL
(`migrations/them-nhansu-lichsu.sql:17`), và chính danh sách trong bàn đo cũng
thừa nhận (`do-tach-vai-tro.mjs:212`). Vô hại (thừa một nhãn không tốn gì),
nhưng câu "phủ HẾT 15 loại **máy chủ ghi**" ở dòng xanh và ở chú thích
`app.js:5006` **đếm thừa một**.

### 🟠 VỪA — chốt mới MÙ ĐÚNG CHỖ DỄ MẮC NHẤT

**File:dòng:** `scripts/do-tach-vai-tro.mjs:220`

Chốt quét mã nguồn bằng regex
`/INSERT INTO nhan_su_lich_su[\s\S]{0,400}?VALUES\s*\(([\s\S]{0,200}?)\)/g`,
phần ghi qua biến thì **khai tay** trong `LOAI_QUA_BIEN` (`:207-214`).

Nó **có** bắt được ca thẳng: thêm một `INSERT` kiểu nhà, không khai nhãn →
`❌ THIẾU NHÃN … thu_nghiem_ho_ly` · **ĐẠT 57 · TRƯỢT 1**. ✅

Nhưng **hai đường né, cả hai đã thử thật, cả hai LỌT**:

| Đường né | Kết quả |
|---|---|
| **A.** Thêm một lời gọi `ghiVetVaiTro(env, phien, id, 'go_tai_khoan', …)` cạnh lời gọi có sẵn ở `src/index.js:1255` | **ĐẠT 58 · TRƯỢT 0 — LỌT** |
| **B.** `INSERT` hợp lệ nhưng đặt cột `luc` **trước** `loai_su_kien` | **ĐẠT 58 · TRƯỢT 0 — LỌT** |

Đường A là **cách tự nhiên nhất** để thêm sự kiện mới, vì `ghiVetVaiTro()`
chính là hàm **bản này vừa tạo ra** — thêm một lời gọi là một dòng, và không ai
nghĩ phải đi khai thêm vào `LOAI_QUA_BIEN`. Đường B vỡ vì
`.replace(/datetime\([\s\S]*$/, '')` (`:224`) cắt hết phần sau `datetime(`, và
chú thích `:221-223` **tự nhận** là đang cược vào lệ "cột `luc` luôn đứng cuối"
— một lệ, không phải bất biến.

Lỗ tiềm ẩn khác chưa thử: `INSERT OR IGNORE/REPLACE INTO` trượt tiền tố; danh
sách cột dài quá 400 ký tự vượt ngân sách regex; và ở phía từ điển, `:230` đếm
mọi `[a-z_]{3,}\s*:` trong khối — một chú thích chứa `foo:` sẽ đẻ ra nhãn ma và
làm chốt xanh oan (hôm nay chưa có).

⇒ Lời khai **"thêm loại mới mà quên khai là ĐỎ ngay / đây là lần vá cuối cho
lớp lỗi này": QUÁ LỜI.** Nó đỏ **chỉ** với `INSERT` viết đúng hình dạng hôm
nay. "Lần vá cuối" thật sự cần **một hằng số dùng chung** mà cả máy chủ lẫn
giao diện cùng import — không phải regex cộng danh sách khai tay.

Không chặn gộp: hậu quả xấu nhất là một dòng hồ sơ hiện mã thô, đúng mức phiền
chứ không hại.

---

## ⑤ Chạy lại 4 bàn đo của vòng 1 trên bản đã vá

| Bàn đo | Vòng 1 | Vòng 2 | |
|---|---|---|---|
| `holy-do-8-nguoi-that` — 8 người thật × 3 trạng thái × 33 đường | 9/0 | **9/0** | ✅ **792 phép gọi, 0 lệch, 0 mã 500** |
| `holy-do-24-tohop` — 288 mũi tấn công API | 15/1 | **15/1** | ✅ giữ nguyên *(1 đỏ là vị từ N3 của tôi quá rộng: `admin+hcns` có lương vì **ô 1 là Admin**, đúng thiết kế — đã ghi ở vòng 1)* |
| `holy-do-weakmap-va-o1` | 7/**1** | **8/0** | ✅ **khẳng định đỏ vòng 1 nay xanh** |
| `holy-do-nhieu-vi-tri` — 384 tổ hợp | 8/0 | **8/0** | ✅ giữ nguyên |

Không một kết luận nào của vòng 1 bị lật.

---

## ⑥ ADR-0016 — ba tính chất có đủ thay cho bảng 384 tổ hợp không?

**Trả lời ngắn: ĐỦ cho phần ĐẠI SỐ, THIẾU phần NGHIỆP VỤ.**

### Phần chúng làm được — và làm được trọn vẹn hơn ADR tự nhận

Tính chất **1 (đơn điệu)** và **2 (không đẻ ra quyền)** cộng lại **chứng minh
được đẳng thức**, không chỉ là hai phép kiểm rời:

- (1) `S ⊆ T ⇒ q(S) ⊆ q(T)`; lấy `S` là tập một phần tử ⇒ `∪ q({v}) ⊆ q(T)`
- (2) `q(T) ⊆ ∪ q({v})`
- ⇒ **`q(T) = ∪ q({v})` với MỌI tập T.**

Tức hai tính chất này **thay được toàn bộ 384 dòng** cho câu hỏi *"phép hợp có
đúng là phép hợp không"*. Đây là kết quả mạnh và ADR nói đúng.

### Phần chúng KHÔNG làm được — và đó đúng là phần tôi soi ở vòng 1

Tính chất 1+2 chứng minh phép hợp **đúng về toán**. Chúng **không** nói tổ hợp
sinh ra có phải **một con người Sếp muốn tồn tại** hay không. Đúng cái ranh
giới tôi đã vạch ở vòng 1: *"phép hợp hai bộ quyền hợp lệ vẫn có thể tạo ra
một con người mà Sếp không muốn tồn tại"*.

Tính chất **3** chỉ chốt **ba** ranh giới cứng cụ thể. Còn thiếu **đúng cái lớp
nở to nhất khi mở lên nhiều vị trí** — số đo của tôi:

| Lớp nguy hiểm | 1 vị trí | nhiều vị trí | tính chất 1–3 có phủ? |
|---|---|---|---|
| **N1** vừa cấp danh tính vừa xem lương | 1 tổ hợp | **64** | ❌ **KHÔNG** |
| **N2** ôm cả ba chặng luồng tiền đơn hoàn | 2 tổ hợp | **152** | ❌ **KHÔNG** |
| N4 giấy tờ nhân sự | 10 | 10 | ⚠️ chỉ phủ **một** ca (`quan_ly_kho`) |

Mỗi quyền trong N1/N2 đều đến hợp lệ từ một phần tử, nên **tính chất 2 xanh**;
thêm vị trí chỉ làm bộ quyền lớn lên, nên **tính chất 1 xanh**. Cả hai lớp đi
thẳng qua.

### Thiếu thứ ba: cả ba tính chất đều ở tầng BẢNG QUYỀN, không ở tầng CỬA API

Chúng kiểm hàm thuần `quyenCua()`. Nhưng **cái bẫy số 1 của chính ADR** — chốt
lương kiểm phần tử đầu thay vì từng phần tử — là lỗi ở **cửa API**, nơi không
tính chất nào trong ba chạm tới. ADR có nêu bẫy đó thành văn xuôi, nhưng nó
**không nằm trong danh sách tính chất**, nên người làm nhánh sau dễ tưởng
"chạy đủ ba tính chất là xong".

### Đề nghị: thêm hai tính chất + một dòng phạm vi

> **4.** Với mọi tập con **không** có `admin` ở ô 1: **không** đồng thời
> `duocTaoTaiKhoan` **và** `xem_luong`.
> **5.** Với mọi tập con **không** có `admin` ở ô 1: **không** ôm đủ cả ba
> chặng luồng đơn hoàn (`kho.thao_tac` + `duocThaoTacVanHanh` + tab `ketoan`).
> **Phạm vi:** cả năm tính chất phải kiểm **qua cửa API bằng phiên thật**, không
> chỉ trên `quyenCua()`.

⚠️ **Tính chất 5 hôm nay ĐỎ**: `nguoi_dung + nv_test` đã ôm đủ ba chặng (đo ở
vòng 1). Nên nó buộc phải trả lời câu Sếp còn treo — **`nv_test` còn dùng
không?** Không dùng thì **khoá**, và tính chất 5 xanh ngay. Đó là điểm cộng của
việc viết tính chất ra: nó biến một câu hỏi treo thành một cổng.

Còn lại, ADR-0016 viết tốt: ghi đủ ba cái bẫy, có số đo `["cskh",
"ke_toan_truong"]` → 200 / 403, chỉ đúng hai ca đối chứng DC-G/DC-H đang canh
sẵn ba chỗ so vô hướng, và nói thẳng hệ quả chị Hương phải chờ.

---

## ④ `.ql-goiy-item` 36,9px → 44px — VÁ ĐÚNG, và nó nhận xét đúng

Đo lại **độc lập** trong Chrome thật, mở **cả hai** ô combo:

| bề rộng | số dòng | chiều cao | thấp nhất | `display` |
|---|---|---|---|---|
| **375px** | 11 (3 vai trò + 8 vị trí) | tất cả 44px | **44px** | `flex` |
| **320px** | 11 | tất cả 44px | **44px** | `flex` |

Vá ở `public/assets/css/style.css:1765-1768`. **Khớp lời khai.**

**Phép đo có mắt thật:** tôi chép cả cây ra chỗ khác, xoá **đúng** ba dòng
`min-height / display / align-items`, chạy lại → **ĐẠT 13 · TRƯỢT 1, mã thoát
1**, đỏ ngay ở *"④ TỪNG DÒNG CHỌN … thấp nhất 36.9px"*. Bản vá là **thứ chịu
lực thật**, không phải trang trí.

**Sửa lớp DÙNG CHUNG có vỡ chỗ nào không? KHÔNG.** Cả 20 chỗ dùng `.ql-goiy`
trong `app.html` đều nằm trong `.combo1-panel` và do **một** hàm `ganCombo()`
(`app.js:894`) dựng. Ba nơi sinh `.ql-goiy-item` (`app.js:907, 915, 922`) đều
phát ra **đúng một chuỗi text**, không icon+chữ, không tên+phụ đề — nên
`display:flex` không thể xếp ngang cái gì. Thử nhãn dài thật
(`NV01-0003 · Phạm Khương Duy — Trưởng phòng Kho Vận…`): cao **78,8px**, xuống
dòng bình thường, `scrollWidth == clientWidth` ở cả 375 và 320px —
`min-height` cho dòng cao tự nở đúng như chú thích nói.

**Danh sách có phải cuộn thêm không? KHÔNG — số dòng thấy được Y HỆT:**

| | cao mỗi dòng | nội dung | thấy trọn |
|---|---|---|---|
| có vá | 44px | 352px trong 220px | **5 / 8** |
| bỏ vá | 36,9px | 295px trong 220px | **5 / 8** |

`floor(220/36.9) = floor(220/44) = 5` — ngưỡng cuộn không đổi. Danh sách 3 vai
trò không cuộn ở cả hai bản. **Không có hồi quy "vừa một màn".**

**Ba màu:** dòng thêm vào CSS **không có một khai báo màu nào** — chỉ ba khai
báo hình học. `do-ba-mau` 12/12. Không đỏ ở đâu trong thành phần này.

### Hai việc cho hàng đợi — không phải lỗi của nhánh này

- 🔵 **THẤP** — `suaTep` của `scripts/lib/ban-do-chrome.mjs:138-146` chỉ lặp qua
  `['app.html', 'assets/js/app.js']`, **không có đường sửa CSS**. Nên DC-4 phải
  tiêm một khối `<style>` vào `app.html` (`do-hai-o-tren-man.mjs:218-222`) thay
  vì hoàn nguyên luật thật. *Phân vai như vậy là đúng* — phép đo BẢN THẬT ④b
  mới là cái canh, và nó canh được (đã chứng minh ở trên). Ghi lại phòng khi
  sau này cần một ca đối chứng đụng thật vào CSS.
- 🔵 **THẤP, CÓ TỪ TRƯỚC** — ở 375px panel vị trí trải y=545→834 trên màn 812px,
  **thò 22px khỏi đáy**. Hình học **y hệt** khi bỏ vá (cũng 545→834), vì
  `.ql-goiy` bị chặn 220px ở cả hai bản. Nguyên nhân `app.js:939`:
  `panel.style.top = r.bottom + 4` không có nhánh lật lên khi hết chỗ dưới.
  **Không phải nhánh này gây ra** — nhưng đúng là chỗ ngón tay với tới, nên
  đáng một phiếu riêng.

- 🔵 **THẤP, tiềm ẩn** — tiêu đề nhóm `.ql-goiy-nhom` (29px) sẽ kéo số dòng
  thấy trọn từ 5 xuống 4 trong panel 220px. Hôm nay **đường có nhóm là mã
  chết** (không `layTuyChon()` nào trả `nhom`), nên chưa ảnh hưởng ai. Nhớ khi
  bật nhóm lên.

---

## ⑤ Hai chỗ Khỉ Đột nhận khai sai — GHI NHẬN, và nó sửa đủ

| Nó nhận | Hồ Ly |
|---|---|
| DC-H đổi hẳn cách tiêm, khiếm khuyết **tương đương** chứ không **nguyên văn** | **Đúng như vòng 1 tôi phát hiện.** Nhận thẳng, không vòng vo. Và vòng 1 tôi đã tự tiêm lại đúng ngữ nghĩa cũ — bàn đo vẫn đỏ, nên kết luận "không bị nới" vẫn đứng. |
| Lo ngại `admin_backup + nv_test` ngang Admin là **quá lời** — nó đọc SỐ TAB rồi suy ra mức nguy hiểm thay vì đọc BỘ CỜ | **Đúng.** Đo lại vòng 1: 16 tab nhưng `admin=false`, `xem_luong=false`, không mở được giấy tờ nhân sự. Bài học đáng giữ: **số tab không phải thước đo quyền lực.** |

---

## ⑧ Chạy lại HẾT cổng — tự mắt thấy

| Cổng | Nó khai | Tôi đo | |
|---|---|---|---|
| `do-tach-vai-tro` | 58/0 (10/10 đối chứng) | **ĐẠT 58 · TRƯỢT 0**, 10/10 | ✅ khớp |
| `do-hai-o-tren-man` | 14/0 (4/4 đối chứng) | **ĐẠT 14 · TRƯỢT 0**, 4/4 | ✅ khớp |
| `do-quyen-duyet-gopy` | 192/0 | **ĐẠT 192 · TRƯỢT 0** (22/22) | ✅ khớp |
| cổng khói @1440 | XANH | **XANH** | ✅ khớp |
| cổng khói @375 | XANH | **XANH** | ✅ khớp |
| `do-ba-mau` | 12/12 | **12/12** | ✅ khớp |
| `do-bang-vua-man` | 42/0 | **ĐẠT 42 · TRƯỢT 0** | ✅ khớp |
| `do-moc-noi` | 9/0 | **ĐẠT 9 · TRƯỢT 0** | ✅ khớp |
| `do-cat-im-lang` | SẠCH | **SẠCH** | ✅ khớp |
| `do-chu-dai` | XANH | **XANH** @375 và @320 | ✅ khớp |
| `do-quet-375` | ĐẠT | **ĐẠT** | ✅ khớp |

**Không một con số cổng nào lệch.**

**Một con số KHÁC thì lệch: `15 loại sự kiện` → thật ra là `14`** (mục ③).

**Chi phí 0:** `package.json` vẫn chỉ thêm **2 dòng `scripts`**, **0 gói mới**,
`devDependencies` không đổi.

---

## Bàn đo Hồ Ly viết thêm ở vòng 2

| File | Đo gì |
|---|---|
| `scripts/holy-vong2-auth.mjs` | 7 cách ghi thông báo lỗi × 5 cửa + cửa sổ thiếu cột thật + dấu thời gian |
| `scripts/holy-vong2-dcj.mjs` | Chứng minh DC-J là phép đo rỗng ngoài khung 09:00–11:00 VN |

*(4 bàn đo vòng 1 giữ nguyên, đã chạy lại hết.)*

---

## Việc nên làm — không cái nào chặn gộp

1. **`scripts/do-tach-vai-tro.mjs:169`** — DC-J lấy mốc so sánh **qua vỏ D1**
   thay vì `db.prepare` raw, để hai vế cùng một đồng hồ. *(VỪA, một dòng —
   không sửa thì bản vá ② coi như **không có ai canh**.)*
2. **`scripts/do-tach-vai-tro.mjs:207`** — thêm `go_tai_khoan`-kiểu vào
   `LOAI_QUA_BIEN` là vá triệu chứng; muốn "lần vá cuối" thật thì đưa danh sách
   loại sự kiện thành **một hằng số dùng chung** cho cả máy chủ lẫn giao diện.
   *(VỪA — có thể để nhánh sau, nhưng đừng khai là đã đóng lớp lỗi này.)*
3. **`src/auth.js:153`** — bỏ vế `|| !/vi_tri_cong_viec/i.test(tin)`. *(THẤP,
   một dòng, giảm giòn.)*

**Sửa lời khai trong CHANGELOG:** "15 loại sự kiện máy chủ ghi" → **14**
(`nghi_viec` chưa có chỗ nào ghi). Cùng chỗ ở `public/assets/js/app.js:5006`.

## Vẫn còn nguyên từ vòng 1 — Sếp quyết

- Chị **Vũ Lan Hương** lấy `hcns` hay `cskh` (thiếu đúng 2 tab đến khi có
  nhánh nhiều-vị-trí).
- Có **báo cho người bị đổi vai trò** không.
- **`nv_test` còn dùng không** — nay có thêm lý do kỹ thuật để trả lời: tính
  chất ⑤ đề nghị thêm vào ADR-0016 **không xanh được** chừng nào tài khoản này
  còn ôm cả ba chặng luồng tiền.
- Sau khi gộp vẫn **đủ ba bước**: nạp migration → deploy → chạy lệnh gán vị
  trí. Thiếu bước ba là anh Duy vẫn không mở được tab Kho vận.
- **Nhánh riêng:** tài sản báo hỏng biến mất khỏi bộ lọc "Đã cấp phát" (vòng 1
  mục ⑨b) — mất dữ liệu trước mắt người dùng.

*(Mục ④ vòng 1 — vai trò lạ trên CSDL thật — Gạo đã tự chạy `SELECT` chỉ-đọc:
`admin` 2 · `admin_backup` 1 · `nguoi_dung` 6, **sạch**. Đóng.)*
