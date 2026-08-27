# REV-0009 — CTL-0015 · SPEC-0007 Đợt 1 (Hợp đồng lao động)

**Commit:** `4f91cd2` · nhánh `feature/spec-0007-dot1-hop-dong` (tách `origin/main` @ `b673d0e`)
**Người review:** Hồ Ly · **Ngày:** 2026-08-27 · **Phạm vi:** 9 file, +841/−10

## KẾT LUẬN: `FIX_REQUIRED`

Phần Khỉ Đột tự khai đều **đúng và đo lại được**. Chặn phát hành nằm ở hai chỗ
Khỉ Đột **chưa nghĩ tới**, cả hai đều bật lên đúng ngày đầu vận hành thật.

---

## 1. Chốt chặn `src/ca.js` — **ĐÚNG**

Đo lại bằng SQLite thật, không đọc bằng mắt (`node:sqlite`, dựng lại đúng
schema + đúng 2 câu truy vấn của `ca.js`).

| Đo | Kết quả |
|---|---|
| `dangKyCa` (`ca.js:228`) với `khoan_viec` | **403 CHẶN** |
| Đối chứng: `ban_thoi_gian` / `thoi_vu` | **cho qua** |
| Đối chứng ngược: `toan_thoi_gian` | 403 (vốn đã chặn từ trước) |
| `maTranTuan` (`ca.js:311`) — ma trận Xếp ca | chỉ trả `02-0001/ban_thoi_gian`; **`04-0001/khoan_viec` không có mặt** |
| Đối chứng (BH-16): đổi đúng 1 giá trị sang `ban_thoi_gian` | **lọt vào ngay** → chốt chặn nằm đúng ở `loai_lao_dong` |

**Báo lỗi có rõ ràng không: CÓ.** Máy chủ trả 403 *"Chỉ nhân sự Part-time/Thời vụ
mới tự đăng ký ca — liên hệ HCNS nếu cần hỗ trợ"*. Giao diện `app.js:5225` bật
dải `#xc-khongduockyy` (`app.html:1777`) với đúng câu đó — **không im lặng biến
mất**. Dải này có sẵn từ trước, commit này không đụng vào.

### ⛔ ISSUE-1 · CHẶN PHÁT HÀNH — ca ĐÃ XẾP của người chuyển sang khoán thành **ca mồ côi**

`src/ca.js:308-311` · `public/assets/js/app.js:5421`

Chốt chặn chỉ chặn **đăng ký mới**. Nó **không đụng** tới dòng đã có. Đo được:

```
hàng nhân sự ma trận trả về:   ["u1"]              ← u2 (khoán) đã bị lọc
đăng ký ma trận trả về:        ["dk1:u2","dk2:u1"] ← dk1 của u2 VẪN trả về
lịch làm ma trận trả về:       ["llv1:u2"]         ← llv1 của u2 VẪN trả về
>>> ĐK mồ côi (không có hàng để vẽ):  ["dk1"]
>>> Lịch làm mồ côi:                  ["llv1"]
```

`app.js:5421` vẽ ma trận bằng `nhan_su.forEach` — không có hàng thì **không vẽ
được ô nào**. Hậu quả dây chuyền, tất cả đều **im lặng**:

1. Đăng ký `cho_duyet` của người đó **kẹt vĩnh viễn** — trưởng phòng không thấy
   để duyệt/từ chối, chính người đó cũng không huỷ được (`huyDangKyCa` chỉ cho
   huỷ `cho_duyet`/`cho_xep`, mà màn Đăng ký ca đã bị dải chặn che mất).
2. Ca `da_duyet` mồ côi **vẫn tính vào sức chứa** (`ca.js:214` đếm `da_duyet`
   không lọc `loai_lao_dong`) → ca trông như đã đủ người mà không ai nhận.
3. **Nặng nhất về pháp lý:** `lich_lam_viec` cũ vẫn còn `da_xep`, và `chotLich`
   (`ca.js:631`) khoá **theo phòng ban, không lọc `loai_lao_dong`** → ERP vẫn
   chốt lịch làm việc chính thức cho một người ký khoán. Đây **đúng bằng** thứ
   BH-33 cảnh báo: hệ thống tự sản xuất bằng chứng ngược tờ hợp đồng.

Đây không phải giả định: **~10 bạn kho đang ký khoán** hiện là `ban_thoi_gian`
có đăng ký/lịch thật. Chuyển loại là 10 người rơi vào đúng trạng thái trên.

**Cần làm:** khi `loai_lao_dong` đổi sang `khoan_viec` (`src/index.js` nhánh sửa
nhân sự), phải xử lý dòng cũ — tối thiểu huỷ `dang_ky_ca` còn `cho_duyet`/`cho_xep`
và cảnh báo số `lich_lam_viec` `da_xep` còn treo, có ghi `nhan_su_lich_su`.
Không được xoá lịch đã `da_xac_nhan` (Rule 10) — nhưng phải **cho Sếp thấy**.

---

## 2. Bảng `hop_dong_lao_dong` — thiết kế **ĐẠT**, migration lùi được **THẬT**

Bảng riêng là đúng: một người nhiều hợp đồng nối tiếp, truy được lịch sử
(`danhSach` trả cả bản `hieu_luc=0`, Rule 10). Không FK nào trỏ vào bảng này,
không `ALTER` cột cũ, không `UPDATE` dữ liệu cũ → `DROP TABLE` + xoá dòng
`schema_migrations` là về đúng trạng thái cũ. Đã đối chiếu `scripts/chay-migration.mjs:38`:
ghi nhận bằng cột `filename` = tên file — câu lùi trong migration **viết đúng cột**.

> ⚠️ **Lưu ý (THẤP):** lùi *migration* thì sạch, nhưng nếu lùi **cả code**, các
> dòng `nhan_su.loai_lao_dong = 'khoan_viec'` vẫn nằm lại; `loaiLaoDongTuBody`
> (`src/index.js:553`) sẽ **âm thầm ép về `toan_thoi_gian`** ở lần sửa hồ sơ kế
> tiếp. Lùi code thì phải kiểm lại 10 hồ sơ đó.

---

## 3. Đếm "lần ký thứ mấy" — **SAI ở 2 tình huống có thật**

`src/hopdong.js:tinhLanThu` đếm `COUNT(*)` mọi `xac_dinh_th` còn hiệu lực, **không
xét thứ tự ngày, không xét đứt quãng**. Đo được:

| Ca đo | Mong đợi | Thực tế |
|---|---|---|
| Ký lần lượt 2024 → 2025 → 2026 | 1, 2, 3 | 1, 2, 3 ✅ |
| **Nhập bù HĐ 2023 sau khi đã nhập 2024–2026** | lần **1** | **lần 3** ❌ |
| **Nghỉ 5 năm rồi quay lại, 2 HĐ cũ 2019–2021** | lần **1** | **lần 3** ❌ |
| Ẩn HĐ lần 1 → `lan_thu` của HĐ 2, 3 đã lưu | 1, 2 | vẫn **2, 3** ⚠️ |

### ⛔ ISSUE-2 · CHẶN PHÁT HÀNH — nhập bù không theo thứ tự ra số lần ký sai

`src/hopdong.js` (`tinhLanThu`) — **đúng bước 2 của kế hoạch triển khai**: handoff
ghi *"HCNS nhập hợp đồng song song đợt ký lại đang diễn ra"*. Nhập bù hợp đồng cũ
sau hợp đồng mới là chuyện chắc chắn xảy ra, và khi đó bảng hiện **hai hợp đồng
cùng ghi "lần 3"**. Đếm sai là **cảnh báo pháp lý sai** — nguy hiểm hơn không cảnh báo.

**Cần làm:** đếm số HĐ `xac_dinh_th` hiệu lực có `ngay_bat_dau < ngay_bat_dau` của
bản đang lưu (thay vì `COUNT(*)` toàn bộ), và **tính lại `lan_thu` cho các bản sau
nó** mỗi lần thêm/sửa/ẩn. Kèm mốc đứt quãng: hai HĐ cách nhau **> 30 ngày** thì
theo BLLĐ Đ.20 chuỗi "liên tiếp" đã đứt — hỏi Sếp chốt cách xử lý trước khi code.

⚠️ **Mức TRUNG BÌNH (không chặn):** `lan_thu` là **ảnh chụp lúc lưu**, ẩn bản cũ
không tính lại bản sau → bảng hiển thị lệch với chính quy tắc của nó. Sửa chung
với ISSUE-2 là gọn nhất.

---

## 4. Chặn mềm `{can_ly_do:true}` kèm HTTP 200 — cơ chế **ĐÚNG**, có **1 lỗ**

Quyết định trả 200 là đúng: `goi()` (`api.js`) ném Error cho mọi mã != 2xx và chỉ
đọc trường `loi` — trả 4xx là mất sạch danh sách cảnh báo.

**Đếm lại chỗ gọi: có 3 hàm API nhưng chỉ **1 chỗ gọi** hàm lưu** (`app.js:3238`),
và chỗ đó **kiểm `can_ly_do` TRƯỚC `ok`** (`app.js:3250`) — đúng. Hai hàm còn lại
(`nsHopDong` đọc `app.js:3173`, `nsHopDongAn` `app.js:3222`) không bao giờ trả
`can_ly_do`. **Không sót chỗ nào.**

### ⚠️ ISSUE-3 · TRUNG BÌNH — lý do cũ còn sót làm cảnh báo **im lặng biến mất**

`public/assets/js/app.js:3196-3210` (nhánh `bSua`)

`dongHoSoHopDongForm()` xoá `#nsHd-lydo` đúng, nhưng nhánh bấm **"Sửa"** thì
không: nó nạp lại mọi ô **trừ** `#nsHd-lydo` và **không ẩn** `#nsHd-fieldlydo`.
Đường đi có thật: bản A bật cảnh báo → người nhập gõ lý do → **chưa lưu**, bấm
"Sửa" bản B → gửi bản B kèm **lý do thừa của bản A** → `hopdong.js` thấy `lyDo`
khác rỗng nên **bỏ qua toàn bộ `canh_bao`**, trả `ok` ngay. Cảnh báo Đ.20 không
bao giờ hiện, và lý do sai bị ghi vào `nhan_su_lich_su` làm căn cứ.

**Cần làm:** thêm `$('#nsHd-lydo').value=''; $('#nsHd-fieldlydo').hidden=true;`
vào nhánh `bSua`. Một dòng.

---

## 5. Khoá ghép động `sinhMa(env, 'nhan_su_' + loai_lao_dong)` — **ĐÃ VÁ ĐÚNG**

`src/dinh-danh.js:22` khai `nhan_su_khoan_viec` → `04-0001`. Xác minh: `sinhMa`
(`dinh-danh.js:30`) ném `Error` khi thiếu cấu hình → thiếu dòng này là **mọi lần
thêm nhân sự khoán việc đều hỏng**. Khỉ Đột tự bắt được, đúng.

**Quét khoá ghép động còn sót — phương pháp (BH-03):** liệt kê file bằng
`git ls-tree -r --name-only 4f91cd2 -- src` rồi `git show` từng file (BH-18,
không `checkout`), lọc hai lưới: (a) mọi chỗ gọi `sinhMa(`; (b) regex bắt nối
chuỗi thành đối số tra bảng — `\('[a-z_]+' *\+`, `\+ *[a-z_]+\)`, `` `[a-z_]+_${ ``.
**Kết quả: toàn repo chỉ có đúng 1 khoá ghép động** (`index.js:572`), đã vá.
Chỗ còn lại là `sinhMa(env,'tai_san')` (`taisan.js:144`) — hằng chuỗi, an toàn.

---

## 6. Rule 13 + `quyen.js` — **SẠCH**

Diff không đụng `src/quyen.js`, không đụng `gop_y`, `cong_viec`, `chatGui()`, vùng
popover (`grep` trên toàn diff chỉ trúng **một dòng chú thích** nhắc tên `quyen.js`).
3 tuyến API mới đều đi qua `batBuocThemNhanSu` — **cùng một cửa quyền** với hồ sơ
nhân sự, không mở bề mặt quyền mới. Hunk trong `app.js` vùng Xếp ca (`@@ -5135`)
chỉ thay bảng nhãn cục bộ bằng bảng dùng chung. Đúng phạm vi.

---

## 7. "Chưa chạy trình duyệt thật" — **không tự nó chặn phát hành**

Module mới nằm sau `them_nhan_su`, mọi truy vấn chạm bảng mới đều bọc `try/catch`,
deploy trước migration không vỡ — rủi ro giới hạn. **Nhưng** ISSUE-1 và ISSUE-3 đều
là lỗi **luồng giao diện** mà chỉ kiểm mã thì không lộ ra. Vá xong 3 issue thì phải
mở trình duyệt thật chạy đúng 3 kịch bản: chuyển 1 người sang khoán khi đang có ca
`cho_duyet`; nhập bù 1 hợp đồng cũ; bật cảnh báo rồi bấm "Sửa" sang bản khác.

---

## Khuyến nghị

**KHÔNG NÊN ĐẨY.** Vá ISSUE-1 + ISSUE-2 + ISSUE-3 rồi review vòng 2 — ISSUE-1 bật
lên đúng ngày chuyển 10 bạn kho sang khoán, ISSUE-2 bật lên đúng lúc HCNS nhập bù.
