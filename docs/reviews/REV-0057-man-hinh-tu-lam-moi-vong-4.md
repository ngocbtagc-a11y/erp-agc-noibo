# REV-0057 vòng 4 — Màn hình tự làm mới

**Kết luận: FAIL** (0 CHẶN · **1 CAO** · 4 VỪA · 2 THẤP)

**Việc quan trọng nhất của vòng này — cổng khói — đã hết mù THẬT, và tôi chứng minh
được bằng ba loại lỗi KHÁC loại nó đã biết.** Đó là kết quả tốt nhất trong bốn vòng.

Lỗi CAO: **một bản vá không vá được thứ nó khai đã vá.** Ô chọn Phòng ban ở màn Xếp ca
nay CÓ đăng ký nghe, người nghe CÓ chạy, máy chủ CÓ trả dữ liệu mới — nhưng nó vẽ lại từ
một mảng **không bao giờ được nạp lại**, nên chữ trên màn hình vẫn là tên cũ. Tôi đo bằng
chữ trong ô chọn, không đo bằng lượt gọi mạng.

Hồ Ly soi `3c970a3`. Không commit, không sửa một dòng mã sản phẩm nào.
`git fetch`: `origin/main` = `ad4bc95`, **không đi tiếp**; nhánh **bằng đúng** main (0 lệch).

| | |
|---|---|
| CHẶN | 0 |
| CAO | 1 |
| VỪA | 4 |
| THẤP | 2 |
| Vòng 3: CAO · VỪA-1 · VỪA-2 · VỪA-3 · VỪA-4 · THẤP | **5/6 ĐÓNG**, VỪA-3 đóng hụt (→ CAO) |
| Cổng đo | **16/16 đúng lời khai** |
| Khối hiển thị còn nói dối | **3** — ô chọn Phòng ban (Xếp ca) · Lịch sử hoàn · Lịch sử làm việc |

> **Và hai lần suýt báo sai nữa của tôi** (mục ⑧). Cộng bốn vòng là **tám lần**. Lần này
> nặng hơn mọi lần trước: một trong hai lỗi đã làm **báo cáo vòng 3 của tôi đưa ra bằng
> chứng sai** cho một kết luận. Kết luận vẫn đúng, bằng chứng thì không.

---

## ⓪ "Không đụng ba bàn soi của Hồ Ly" — ĐÚNG

`git show 3c970a3 --stat | grep soi-` → **không có tệp `soi-*` nào**. Công của tôi nằm ở
commit riêng `e46237a`, tiêu đề ghi thẳng *"KHÔNG phải mã của Khỉ Đột"*. Tôi đọc toàn bộ
phần nó sửa vào hai bàn soi cũ của tôi: `Page.bringToFront` + kiểm điều kiện `document.hidden`,
ba ca "VÒNG 3", thêm quyền `dulieunen`/`quantri` — **từng dòng đều là chữ tôi viết ở vòng 3**,
kể cả câu tôi tự nhận *"(Khỉ Đột báo đúng chỗ này ở ca ⑪ của nó; tôi vấp đúng cái hố đó.)"*

---

## ① CỔNG KHÓI ĐÃ HẾT MÙ THẬT — chứng minh bằng ba loại lỗi KHÁC

Nó khai đúng: hai lượt vai, **không** sửa `TOI` dùng chung. Tôi kiểm lý do đó và **lý do
đúng** — `TOI` ở `lib/ban-do-chrome.mjs:28` đang được sáu bàn đo khác dùng chung, đổi nó là
lặng lẽ đổi bài của người khác. Nó chọn cách thêm lượt, không sửa nền.

**Tôi tự gài ba loại lỗi KHÁC lỗi TDZ, vào ba mô-đun khác nhau trong tám mô-đun vừa mở:**

| Lỗi tôi gài | Cổng CŨ (`d65b9ea`) | Cổng MỚI |
|---|---|---|
| gọi hàm không tồn tại — trong `khoiDongXepCa` | **✅ XANH (mù)** | **❌ ĐỎ** — `Xếp ca: ReferenceError: hamNayKhongHeTonTai is not defined` |
| đọc thuộc tính của `undefined` — trong `khoiDongTaiSan` | **✅ XANH (mù)** | **❌ ĐỎ** — `Tài sản: TypeError: Cannot read properties of undefined` |
| lỗi cú pháp — trong `khoiDongDuLieuNen` | (cả trang chết) | **❌ ĐỎ** — 6 nút cửa ngõ hỏng |
| **ĐỐI CHỨNG ÂM**: lỗi bị `try{}catch{}` nuốt | — | **✅ XANH** — đúng, đó không phải lỗi cổng phải bắt |

Cả ba đều gọi **đúng tên mô-đun và đúng tên lỗi**. Đối chứng âm xanh nên cổng không đỏ bừa.
**Không phải canh một ca đã biết — nó canh cả lớp.**

**Hai ca ngược của tôi:**
- **Chậm gấp đôi không? KHÔNG.** Đo lại (cùng máy, cùng lúc): cổng cũ **16,1 giây** → cổng
  mới **20,3 giây** = **+26%**. Lượt hai chỉ nạp trang, không bấm 10 nút cửa ngõ.
- **Lỗi lượt này che lượt kia không? KHÔNG.** `kq.loi_console.concat(kq.du_quyen.loi_console)`
  — gộp một rổ, lỗi ở lượt nào cũng đỏ. Chứng minh: cả ba lỗi trên chỉ nổ ở lượt HAI mà cổng
  vẫn đỏ, và mẫu `--tu-kiem` (nổ ở cả hai lượt) vẫn đỏ đúng.
- **`cong-khoi.mjs` còn nguyên vẹn**: `node --check` sạch, 250 dòng, **đủ 19 khối cấp cao**
  (`QUYEN_DU` · `apiVaiDuQuyen` · `MAU_TDZ` · `gaiTDZ` · `CUA_NGO` · lượt ① ② ③ · kết luận ·
  tự kiểm). Không khối nào bị cắt sai chỗ.
- **"Phép quét TDZ tự chế" đã gỡ hẳn**: `grep -rn TDZ scripts/` chỉ còn chú thích trong
  `cong-khoi.mjs`. Không tệp nào, không script `package.json` nào gọi nó.

---

## ② CAO · Ô chọn Phòng ban ở Xếp ca — **vá rồi mà vẫn nói dối**

`app.js:8239` nay có `ngheDuLieu('du_lieu_nen', function doPhongBanXepCa() {…})`, và chú
thích khai *"chi phí sửa đúng bằng một lời đăng ký"*. `lam-moi.js:26-28` xếp nó vào nhóm
**"5 khối bệnh thật NAY ĐÃ NỐI DÂY"**.

**Nhưng nó vẽ lại từ một mảng chết:**

```js
let dsPhongBanQuanLy = TOI.phong_ban_quan_ly || [];      // app.js:8214  ← gán MỘT lần
…                                                         // app.js:8223  ← gán MỘT lần nữa (chỉ admin, lúc khởi động)
const doPhongBanXepCa = ngheDuLieu('du_lieu_nen', function doPhongBanXepCa() {
  const dangChon = $('#xcPhongBan').value;
  $('#xcPhongBan').innerHTML = dsPhongBanQuanLy.map(…)    // ← vẽ lại từ CHÍNH mảng cũ đó
  if (dangChon) $('#xcPhongBan').value = dangChon;
}, { ten: 'Ô chọn Phòng ban (Xếp ca)', goc: oTab('xepca') });
```

`grep -n dsPhongBanQuanLy` → chỉ **8214 · 8218 · 8223 · 8227 · 8241**. Không dòng nào nạp
lại nó, và mô-đun Xếp ca **không hề đọc** `DS_PHONG_BAN` — cái kho mà `taiDanhMucNen` vừa
làm mới. Người nghe chạy, vẽ lại, **vẽ đúng dữ liệu cũ**.

**Đo bằng thứ người dùng nhìn** (`scripts/soi-dropdown-xepca.mjs` — đọc CHỮ trong ô chọn,
không đếm lượt gọi mạng):

```
── TRƯỚC (merge-base)
   trước: {"chu":["Kho vận"],"dangChon":"1"}
   sau  : {"chu":["Kho vận"],"dangChon":"1"}
   ⇒ ✘ ô chọn VẪN GIỮ TÊN CŨ · gọi /api/dulieunen/phong-ban: 0 lượt

── SAU (bản vá vòng 4)
   trước: {"chu":["Kho vận"],"dangChon":"1"}
   sau  : {"chu":["Kho vận"],"dangChon":"1"}
   ⇒ ✘ ô chọn VẪN GIỮ TÊN CŨ · gọi /api/dulieunen/phong-ban: 1 lượt
```

Máy chủ đã đổi tên, `taiDanhMucNen` đã nạp lại (1 lượt), người nghe đã chạy — **chữ không
đổi**. Phần "giữ nguyên lựa chọn đang chọn" thì **đúng** (`dangChon` giữ nguyên `"1"`).

**Vì sao là CAO dù hậu quả nhỏ.** Hậu quả thật đúng là nhỏ: một cái tên phòng ban cũ, thao
tác vài tháng một lần. Nhưng đây là **một bản vá không chạy, kèm một chú thích trong mã nói
rằng nó chạy** — và một con số kiểm kê chính thức đếm nó là "đã nối dây". Người sau đọc
`lam-moi.js` sẽ tin. Đó đúng là lớp bệnh mà cả bốn vòng này tồn tại để giết.

**Cách sửa** (vẫn nhỏ): cho `doPhongBanXepCa` lấy từ kho dùng chung `DS_PHONG_BAN` (thứ
`taiDanhMucNen` vừa làm mới) thay vì `dsPhongBanQuanLy`, lọc theo phòng ban người này quản
lý. Kèm một ca bàn đo đọc **chữ trong ô chọn**, không đọc lượt gọi.

---

## ③ VỪA-1 · "Danh sách Lịch sử làm việc — đã nối dây" — **KHÔNG**

`lam-moi.js:26-28` liệt "danh sách Lịch sử làm việc" vào nhóm 5 khối đã nối dây. Đo thẳng
(`scripts/soi-hai-man-contro.mjs`, có đối chứng dương):

```
① Lịch sử làm việc (taiLaiLichSuCv) · ghi cvCapNhat → /api/cong-viec/lich-su: 0 lượt  ✘
② Lịch sử hoàn     (veLichSu)       · ghi kdDaDoiSoat → /api/hoan/lich-su:    0 lượt  ✘
③ ĐỐI CHỨNG: Đơn hoàn (CÓ nghe)     · ghi kdDaDoiSoat → /api/hoan/danh-sach:  1 lượt  ✔
```

`taiLaiLichSuCv` (`app.js:3914`) **không** có `ngheDuLieu`, và nó có **đúng cùng hình dạng**
con trỏ tải tiếp như `veLichSu`: `TRUOC_LSCV` / `{ them: true }` nối thêm trang cũ hơn.
Hai màn giống hệt nhau mà bị xếp hai nhóm khác nhau — **ít nhất một chỗ khai sai, và đó là
chỗ này**.

**Kết luận đúng thì vẫn giữ được** (để lại là hợp lý — tự nạp lại sẽ vứt hết những trang
người dùng đã bấm tải), nhưng **cách đọc 13 khối rổ A phải là 4 / 4 / 3 / 2**, không phải
5 / 4 / 3 / 1.

---

## ④ Kết luận độc lập về **44 · A 13 · B 26 · C 5 · 136**

**136 = 123 gọi + 13 truyền: ĐÚNG CHÍNH XÁC** — tôi đếm độc lập ở vòng 3 bằng danh sách tệp
hỏi thẳng `git ls-tree` và ra đúng con số này; mốc không đổi (`ad4bc95`) nên số không đổi.

**44 khối: đúng theo luật nó khai, nhưng vẫn THIẾU ít nhất 2 khối thật** (xem VỪA-2).

**13 khối rổ A: bốn nhóm CỘNG ĐÚNG (5+4+3+1 = 13), nhưng phân nhóm SAI ở một chỗ.** Tôi soi
tay từng khối, và đo trên trình duyệt những khối còn nghi:

| Nhóm nó khai | Tôi kiểm |
|---|---|
| **5 đã nối dây** — thẻ tóm tắt · chuông · CSKH · ô chọn Phòng ban Xếp ca · Lịch sử làm việc | **chỉ 3 đúng**. Ô chọn Phòng ban: vá không chạy (CAO). Lịch sử làm việc: **chưa nối dây** (VỪA-1) |
| **4 hộp mở theo yêu cầu** — chi tiết Mục tiêu · "ai làm được" · giấy tờ hồ sơ · quét QR | **ĐÚNG cả 4** — khớp đúng kết luận tôi tự soi ở vòng 3 |
| **3 nhiễu** — `veLaiBangNs` · `khoiDongKho` · `khoiDongKhoTaiLieu` | **ĐÚNG cả 3**. Đo lại: `qtSuaNhanSu` → 1 lượt ✔ · `khoSuaSanPham` → 1 lượt ✔ · khối thật `nap` nằm rổ C 3/3 ✔. Và nó **tự đính chính** vòng 2 đã khai nhầm ba khối này thành "hộp mở theo yêu cầu" — đúng, tôi xác nhận |
| **1 cố ý không nghe** — Lịch sử hoàn | **ĐÚNG về lý do**, nhưng phải là **2** (kèm Lịch sử làm việc) |

**Cách đọc đúng: 3 đã nối dây · 4 hộp mở theo yêu cầu · 3 nhiễu · 2 cố ý không nghe ·
1 vá không chạy.**

**Đánh giá "Lịch sử hoàn — cố ý không nghe" (màn anh Duy và chị Huyền dùng).**
Lý do **có thật, kiểm được**: `app.js` khai `let TRUOC_LS = null; // con trỏ … để tải tiếp
đơn cũ hơn`, và nút "xem tiếp" gọi `veLichSu({ them: true })` **nối thêm** vào `DS_LS`. Tự
nạp lại là `them = false` → vứt sạch mọi trang đã tải. Đánh đổi đúng.

**Nhưng "bao lâu": tới lần TẢI LẠI TRANG.** Không có gì đánh thức nó — không phải "tới khi
chuyển tab". Chị Huyền phân loại đơn cả ngày thì màn Lịch sử hoàn giữ ảnh chụp lúc chị mở
máy suốt cả ngày. Hậu quả nhẹ hơn hẳn hàng đợi đang làm việc (Đơn hoàn · Đối soát · Tra
soát · Hàng hỏng đều đã nghe), vì đây là màn TRA CỨU LỊCH SỬ chứ không phải màn ra quyết
định. **Để lại được**, nhưng có cách rẻ giữ cả hai: **chỉ tự nạp lại khi người dùng CHƯA
bấm "xem tiếp" lần nào** (`TRUOC_LS` còn nguyên trạng thái đầu) — lúc đó không có trang nào
để mất. Áp dụng chung cho cả Lịch sử làm việc.

---

## ⑤ VỪA-2 · Kiểm kê nhìn thêm được một dạng, còn mù hai dạng — và mù vì một lý do thứ ba

**Tiến bộ có thật.** `veDoiSoat` — khối tôi chỉ ra ở vòng 3 — **nay hiện ra** (rổ B, 1/10).
Tỉ lệ nhận ra người nghe của chính bản vá: **21/28** (vòng 3: 18/27). Chốt tự kiểm
`do-kiem-ke-tu-kiem` **ĐẠT 2/2** và có răng thật (quay lại luật cũ thì TRƯỢT 1/2).

**Tôi giấu NĂM hình dạng** (`scripts/soi-kiem-ke-dang-3.mjs` chạy trong bản sao repo, không
đụng repo thật; mỗi mẩu đều đọc `hoanDanhSach` rồi vẽ, không ai nối dây → phải ra rổ A):

| Hình dạng | Kết quả |
|---|---|
| ① một hàm *(đối chứng dương)* | **✅ TÌM RA, rổ A** — 44→45, A 13→14 |
| ② hai hàm, mượn MỘT cấp *(đối chứng dương)* | **✅ TÌM RA, rổ A** — 44→45, A 13→14 |
| ③ **BA hàm, mượn HAI cấp** (A→B→C) | **❌ KHÔNG TÌM RA** — 44→44 |
| ④ **vẽ qua hàm TRUYỀN LÀM THAM SỐ** | **❌ KHÔNG TÌM RA** — 44→44 |
| ⑤ đọc trong `Promise.all`, vẽ ở `.then` | **✅ TÌM RA, rổ A** — 44→45 |

**BẮT 3/5.** Giới hạn "một cấp" nó tự khai là **chỗ dừng có lý** (mượn sâu hơn thì mọi
`khoiDong*` lại thừa hưởng cả màn hình — đúng lỗi đã sửa ở vòng 2), nhưng **không phải chỗ
dừng đúng**: dạng ③ và ④ là mã hợp lệ, viết ra hằng ngày.

**Và có một lý do mù THỨ BA, nhỏ mà chính xác, nó chưa biết.** Phép suy nhóm đọc tiền tố
đường bằng regex `/'(\/api\/[a-z0-9-]+)/` — **chỉ nhận dấu nháy đơn**. Ba hàm API viết đường
bằng **chuỗi mẫu** nên không đọc được tiền tố, và khối nào đọc chúng thì bị loại khỏi kiểm kê:

```
suaLichSu · caLichCuaToi · caMaTranTuan          (3 / 177 hàm API)
```

Hậu quả đo được: **`taiMaTran` và `taiLichCuaToi` — hai khối hiển thị THẬT, đã nối dây, viết
đúng khuôn hai-hàm mà vòng này vừa hỗ trợ — vẫn KHÔNG có trong 44.** Tôi truy tận nơi bằng
cách chèn một dòng soi vào bản sao bàn đo:

```
[SOI] khoiDongXepCa::taiMaTran  doc=caMaTranTuan  ve=false  veGianTiep=true  ← qua được cửa khối
                                                            ↓ rồi bị loại ở `nhomCuaHamDoc` vì tiền tố = null
```

Sửa: `/['\`](\/api\/[a-z0-9-]+)/`. Một ký tự.

---

## ⑥ VỪA-3 · `③g` yếu hơn tên gọi của nó

Tên phép soi: *"mọi khoá `can_…` của máy chủ đều được khai ở CHUA_LUU_DU"*.
Phép thật (`do-tu-lam-moi.mjs:237`): `const chuaKhai = [...khoaChanMem].filter(k => !apiSrc.includes(k));`
— nó chỉ hỏi *"chuỗi này có xuất hiện đâu đó trong `api.js` không"*.

**Có răng cho ca thẳng**: tôi thêm `can_chu_ky_sep: true` vào `src/index.js` →
`❌ ③g … CHƯA KHAI: can_chu_ky_sep`.
**Nhưng qua được bằng một dòng chú thích**: tôi giữ nguyên khoá đó và chỉ thêm
`/* ghi chu vu vo co nhac can_chu_ky_sep nhung khong khai gi ca */` phía trên `CHUA_LUU_DU`
→ **`✅ ③g … đều có mặt`, ĐẠT 50 · TRƯỢT 0.**

Một người sau viết `// TODO: xử lý can_chu_ky_sep` là cổng im. Sửa: bóc đúng khối
`CHUA_LUU_DU = { … }` rồi hỏi khoá có nằm trong đó không.

**Lý do loại `chua_…` thì ĐÚNG** — tôi kiểm cả 11 khoá `chua_…` trong `src/`:
`chua_bat_dau` (rổ việc), `chua_nap` (migration), `chua_doc` (đếm tin), `chua_cau_hinh`
(sao lưu), `chua_co_bang`, `chua_cham`… **không khoá nào là tín hiệu "ghi trượt"**. Đều nằm
ở đường đọc, đúng như nó nói.

---

## ⑦ VỪA-4 · `cong-khoi-tu-kiem-tdz` — không có chốt tự kiểm, và ĐẢO NGƯỢC quy ước mã thoát

| Lệnh | Mã thoát khi "tự kiểm thành công" |
|---|---|
| `npm run cong-khoi-tu-kiem` | **0** — có khối chấm riêng, kiểm đúng dòng `MẪU HỎNG GIẢ` mới cho đạt |
| `npm run cong-khoi-tu-kiem-tdz` | **1** — không có khối chấm nào, chỉ chạy rồi đỏ |

Hai chế độ tự kiểm của cùng một cổng, hai quy ước ngược nhau. Ai xâu vào CI theo khuôn
`npm run … && npm run …` sẽ hiểu ngược. Và `--tu-kiem-tdz` **không kiểm** vết đỏ có phải do
lỗi TDZ vừa gài hay không — đỏ vì bất cứ lý do gì cũng "đạt".

Có một chốt: `gaiTDZ()` ném lỗi nếu mẫu thay thế trượt. Nhưng câu báo lỗi hỏng:

```js
// cong-khoi.mjs:112
if (!ma.includes(cu)) throw new Error('Mẫu TDZ trượt, sửa bàn đo: ${cu.trim().slice(0, 60)}');
```

**Dấu nháy ĐƠN** — `${…}` in ra nguyên văn, không nói được mẫu nào trượt. Đúng lớp lỗi
"Bash nuốt dấu nháy" mà nó tự khai đã vấp ba lần; lần này lọt vào tệp đã commit. Vô hại về
hành vi (vẫn ném), nhưng người sau sẽ mất thời gian.

Sửa: dấu huyền cho câu lỗi, và thêm khối chấm cho `--tu-kiem-tdz` giống `--tu-kiem`
(đòi thấy đúng chữ `Cannot access 'khoiDongCSKH' before initialization`), thoát 0 khi đạt.

---

## ⑧ Về chính tôi — hai lần suýt báo sai nữa, một lần đã lỡ vào báo cáo vòng 3

**1. Tôi đo nhầm cổng khói CŨ mà tưởng là mới.** `git checkout d65b9ea -- scripts/cong-khoi.mjs`
**đưa bản cũ vào cả index**; lệnh khôi phục `git checkout -- scripts/cong-khoi.mjs` sau đó
lấy lại **từ index**, tức vẫn là bản cũ. Tôi suýt kết luận `--tu-kiem-tdz` thoát 0 (sai) và
"hai lượt vai không tốn thêm thời gian" (sai). Bắt được nhờ `git status` in `M`, và nhờ đếm
số dòng tệp (163 ≠ 250). Sửa: `git checkout HEAD -- …`, rồi đo lại — ra 1, và +26%.

**2. Bàn soi của tôi gõ SAI đường API, và cái sai đó đã lỡ vào báo cáo vòng 3.**
`soi-khoi-bo-sot.mjs` đếm `/api/du-lieu-nen/phong-ban`, đường thật là
`/api/dulieunen/phong-ban` (`api.js:308`) — **không có dấu gạch**. Đường sai thì luôn đếm
ra 0, nên ca đó **luôn in ❌ bất kể sản phẩm đúng hay sai**.

Vòng 3 tôi đã dùng đúng con số 0 đó làm bằng chứng cho VỪA-3, và Khỉ Đột đã tin, đã đi vá.
**Kết luận vòng 3 vẫn đúng** — ô chọn thật sự nói dối, và vòng này tôi chứng minh lại bằng
CHỮ TRONG Ô CHỌN (xem CAO) — nhưng **bằng chứng thì sai**, và tôi đã để nó lọt qua một vòng
soi. Đã sửa đường trong bàn soi; nay ca đó in `1 lượt ✔` cho phần mạng, còn phần chữ thì
bàn soi mới `soi-dropdown-xepca.mjs` lo.

**Bài học tôi rút:** đếm lượt gọi mạng là phép đo GIÁN TIẾP. Câu hỏi của Sếp là *"nó vẫn
hiện ở đây"* — thứ phải đo là **chữ trên màn hình**. Ba vòng liền tôi đo gián tiếp và ba
vòng liền phép đo gián tiếp phản tôi.

---

## ⑨ Cổng đo — tôi tự chạy lại HẾT

| Cổng | Khai | Tôi đo |
|---|---|---|
| `cong-khoi` | XANH | ✅ **XANH** · `hai lượt vai: 7 quyền (6 tab) + đủ 17 quyền (13 tab)` |
| `cong-khoi-dienthoai` | XANH | ✅ **XANH** (cũng hai lượt vai) |
| `cong-khoi-tu-kiem` | XANH | ✅ **TỰ KIỂM ĐẠT**, thoát 0 |
| `cong-khoi-tu-kiem-tdz` | ĐỎ đúng lúc | ✅ **ĐỎ**, gọi đúng tên `ReferenceError: Cannot access 'khoiDongCSKH' before initialization` (thoát 1 — xem VỪA-4) |
| `do-ba-mau` | 12/12 | ✅ **ĐẠT LUẬT BA MÀU** |
| `do-cat-im-lang` | SẠCH | ✅ **SẠCH** |
| `do-chu-dai` | XANH | ✅ **XANH** |
| `do-moc-noi` | 9/0 | ✅ **ĐẠT 9 · TRƯỢT 0** |
| `do-chat-noibo` | XANH | ✅ **XANH** |
| `do-hop-sua-muctieu` | XANH | ✅ **XANH** |
| `do-cat-khung` | XANH | ✅ **ĐẠT** |
| `do-tu-lam-moi` | **50/0** | ✅ **ĐẠT 50 · TRƯỢT 0** (gồm ③f · ③g · ⑪a–⑪f · ⑩a–⑩d) |
| `do-kiem-ke-lam-moi` | 44 · 13-26-5 · 136 | ✅ **khớp từng con** |
| `do-kiem-ke-tu-kiem` | 2/2 | ✅ **ĐẠT 2/2** |
| `do-luot-doc-lam-moi` | +1 / −2 / 1·2·3·4 tab đều 5 | ✅ **đúng cả bốn mức** |
| Năm bàn soi của tôi | sạch | ✅ `soi-tab-nen-bat-kip` **12/0** · `soi-may-boc` **18/0** · `soi-tu-lam-moi{,-2,-3}` kết luận không đổi |

**`scripts/` so với `merge-base`: đúng 4 dòng xoá**, cả bốn là dòng **bị thay thế**:
```
-import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';      → thêm TOI, TOI_ID
-const suaTep = TU_KIEM ? … : null;                                    → thêm nhánh --tu-kiem-tdz
-  /* `dungMayGia` chỉ chạy `suaTep` cho app.html + app.js…            → chú thích đã cũ (vòng 2)
-    for (const f of ['app.html', 'assets/js/app.js']) {               → danh sách 4 tệp (vòng 1)
```
**Không nới lỏng bàn đo nào.** `package.json` thêm **2 dòng script**, không gói mới —
**chi phí vẫn 0**.

**`veTinhTrang`** (`app.js:7205`) có `|| []` kèm chú thích giải thích ✔ — và nó **vá chứ
không thu hẹp phạm vi soi**, đúng thứ cần làm khi cổng soi rộng ra làm lòi lỗi cũ. Xác nhận.

**Nhãn `trong`**: `grep "trong khoiDongChat"` → **không còn**. Phân bố nhãn hợp lý trên 17
hàm khởi động. Khuôn `(async function X(` và `if (TOI.…) {` đã nhận ✔.

---

## ⑩ THẤP

1. **Lượt vai đủ quyền chỉ hỏi "nạp trang có nổ không"** — nó không bấm 10 nút cửa ngõ như
   lượt một. Đã tự khai trong chú thích, và đó là đánh đổi hợp lý cho +26% thời gian. Nhưng
   nghĩa là **nút bấm trong tám mô-đun vừa mở vẫn chưa ai canh**. Ghi lại để lần sau không
   ai tưởng cổng đã canh cả.
2. **`src/` quét phẳng** trong ③g (`readdirSync`, không đệ quy). Hôm nay `src/` không có thư
   mục con nên tốn 0 khoá — rủi ro thuộc về tương lai, giống chuyện `quet-tai-lieu.js` ở
   vòng 3.

---

## Việc phải làm

1. **CAO** — `doPhongBanXepCa` lấy dữ liệu từ `DS_PHONG_BAN` (kho `taiDanhMucNen` vừa nạp)
   thay vì `dsPhongBanQuanLy` đông cứng. Ca bàn đo phải đọc **chữ trong ô chọn**.
2. **VỪA-1** — sửa `lam-moi.js:26-28`: Lịch sử làm việc **chưa** nối dây; cách đọc đúng là
   **3 đã nối dây · 4 hộp mở theo yêu cầu · 3 nhiễu · 2 cố ý không nghe · 1 vá không chạy**.
3. **VỪA-2** — regex tiền tố nhận cả chuỗi mẫu (`/['\`](\/api\/…)/`): lấy lại `taiMaTran` và
   `taiLichCuaToi`. Và ghi vào chú thích **hai dạng còn mù** (mượn hai cấp · vẽ qua tham số)
   để người sau biết con số 44 là sàn, không phải trần.
4. **VỪA-3** — ③g hỏi đúng khối `CHUA_LUU_DU`, không hỏi cả tệp.
5. **VỪA-4** — `--tu-kiem-tdz` thêm khối chấm + thoát 0 khi đạt; sửa dấu nháy ở
   `cong-khoi.mjs:112`.
6. **THẤP** — cân nhắc "chỉ tự nạp lại khi người dùng chưa bấm xem tiếp" cho hai màn có con
   trỏ (Lịch sử hoàn · Lịch sử làm việc).

**Việc quan trọng nhất của vòng này đã xong và xong tốt** — cổng khói bắt buộc của cả đội
nay nhìn được tám mô-đun từng mù, và tôi chứng minh bằng ba loại lỗi khác loại nó đã biết.
Sáu việc trên đều nhỏ; năm việc là dụng cụ đo và lời khai, một việc là mã sản phẩm.
