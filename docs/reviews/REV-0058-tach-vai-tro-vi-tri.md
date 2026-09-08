# REV-0058 — Tách vai trò hệ thống khỏi vị trí công việc

> Hồ Ly soi nhánh `fix/tach-vai-tro-vi-tri` @ `1031de1` (từ `origin/main`).
> Ngày 04/09/2026. Không commit, không push, không sửa mã sản phẩm.

## KẾT LUẬN

### An toàn phân quyền: **PASS** — kèm 3 việc một dòng phải sửa trước khi gộp

### Mô hình "một vị trí": **KHÔNG CHẶN** — đo được bán kính thiệt hại là **1 người, 2 tab**

*(Mục riêng ở cuối: "⑧ Một vị trí hay nhiều vị trí". Tôi bất đồng với Gạo ở
chỗ này, và bất đồng dựa trên số đo, không phải cảm tính.)*

---

Câu hỏi nặng nhất của việc này là **phân quyền có hở không** và **có ai mất
tab đang dùng không**. Cả hai đều đã đo, không phải suy luận:

- **Không tổ hợp nào tự nâng quyền.** 24 tổ hợp × 12 mũi tấn công gọi thẳng
  API = **288 phép, sạch**. Đo bằng định nghĩa "nguy hiểm" CỦA HỒ LY, không
  dùng định nghĩa của Khỉ Đột.
- **Không ai trong 8 tài khoản thật mất hay thêm một khoá nào**, trên **cả
  ba** trạng thái deploy. **792 phép gọi API thật**, 0 lệch, 0 mã 500.
- **Bàn đo cũ KHÔNG bị nới.** Tôi tiêm lại đúng khiếm khuyết cũ theo ngữ
  nghĩa — bàn đo vẫn đỏ.

**Không có lỗi CHẶN.** Ba lỗi CAO/VỪA dưới đây đều là sửa một dòng, và
**không lỗi nào cấp thêm quyền cho ai** — tất cả đều hỏng theo chiều an toàn.

| Mức | Lỗi | Ở đâu |
|---|---|---|
| CAO | Nuốt lỗi D1 tạm thời thành "chưa có cột" ⇒ ô 2 rơi âm thầm, vẫn trả 200 | `src/auth.js:143` |
| CAO | Dấu thời gian ghi vết lệch 7 tiếng so với 9 chỗ ghi khác cùng sổ | `src/index.js:1280` |
| VỪA | Từ điển sự kiện thiếu `doi_vai_tro` + `cap_tai_khoan` ⇒ hồ sơ hiện mã thô | `public/assets/js/app.js:5005` |

---

## ⓪ Khỉ Đột có nới bàn đo canh phân quyền không? — **KHÔNG.**

Nó sửa 2 chuỗi neo trong `scripts/do-quyen-duyet-gopy.mjs`. Tôi không tin lời
khai, tôi **tiêm lại khiếm khuyết cũ** rồi xem bàn đo còn đỏ không.

**Chỗ 1 — `C-cat-thua-quyen-xem`** (`do-quyen-duyet-gopy.mjs:1641`).
Chỉ đổi `laAdmin(phien.vai_tro)` → `laAdmin(phien)`. **Phần bị xoá y hệt**
(`laAdmin(...) || `), **điều kiện bắt lỗi nguyên văn từng ký tự**. Đây là đổi
tên tham số, không phải nới.

**Chỗ 2 — `H-doc-khong-phong-thu`** (`do-quyen-duyet-gopy.mjs:1688`).
Chỗ này khiếm khuyết tiêm vào **có đổi thật** — lời khai "khiếm khuyết tiêm
vào giữ nguyên văn" là **nói quá**. Cũ: câu SQL đường lui đọc cột thật. Mới:
bỏ hẳn nhánh bắt lỗi. Nên tôi đo lại bằng **ba mũi tiêm của riêng tôi** vào
mã hiện tại:

| Mũi tiêm | Bàn đo |
|---|---|
| `P1` đường lui vẫn đọc `t.duyet_gopy` — **đúng ngữ nghĩa neo CŨ** | ✅ BẮT ĐƯỢC |
| `P2` thiếu cột mà cờ duyệt về `TRUE` (hỏng theo chiều MỞ) | ✅ BẮT ĐƯỢC |
| `P3` vòng lặp chỉ chạy 1 vòng | ✅ BẮT ĐƯỢC |

Chạy đủ: **ĐẠT 195 · TRƯỢT 0** (192 gốc + 3 mũi của tôi).
Thêm nữa, `banSrcHong()` (`:334`) ghi ra bản `src` đã sửa rồi mới chạy — nên
một `.replace()` **không khớp** sẽ để `src` nguyên lành và ca đối chứng sẽ
**trượt**. Neo hỏng không thể im lặng lọt qua. Kết luận: **bàn đo không bị nới.**

---

## ① 24 tổ hợp — kết luận ĐỘC LẬP, bằng định nghĩa của Hồ Ly

Định nghĩa của Khỉ Đột ("phép hợp đẻ quyền từ hư không") là **định nghĩa dễ**
và nó tự đặt. Tôi bỏ, dùng định nghĩa nghiệp vụ:

> Nguy hiểm = tổ hợp tạo ra **một con người mà Sếp không muốn tồn tại**, kể cả
> khi mọi quyền của người đó đều đến hợp lệ từ một trong hai ô.

Bàn đo: `scripts/holy-do-24-tohop.mjs`.

### N1 — vừa cấp được danh tính vừa xem được lương

**Chỉ MỘT tổ hợp ngoài Admin: `admin_backup + ke_toan_truong`** (15 tab,
CÓ lương, CÓ tạo tài khoản, CÓ thêm nhân sự).

Đây là **tổ hợp MỚI** — trước bản này một cột không chứa được hai giá trị,
nên không ai có thể vừa là Admin backup vừa là Kế toán trưởng.

**Đo thật, không tin lời khai** — người đó làm được gì:

| Mũi | Kết quả |
|---|---|
| Tạo tài khoản mới **kèm** vị trí có lương | **403** |
| Tạo tài khoản thường rồi **gán** vị trí có lương ở bước 2 | **403** — *"Chỉ Admin mới đặt được vị trí "Kế toán trưởng" — vị trí này xem được lương"* |
| Nâng tài khoản vừa tạo lên `admin_backup` | **403** |
| Tự nâng ô 1 lên `admin` | **403** |
| Nhét `admin` vào ô 2 (mình hoặc người khác) | **400** |
| Dòng ghi ra DB sau cả chuỗi | `{"vai_tro":"nguoi_dung","vi_tri_cong_viec":null}` |

**Đường leo thang ĐÓNG.** Người này cấp được tài khoản, nhưng **tài khoản đó
không bao giờ có lương** — chỉ Admin thật trao được. Thêm nhân sự thì được,
nhưng lương gửi lên **bị máy chủ ép NULL** (`src/index.js:952`).

**Mức: VỪA — và là việc của Sếp, không phải lỗi mã.** Rủi ro còn lại là *một
người vừa mint được tài khoản vừa đọc bảng lương*. Lệnh gán trong CHANGELOG
đặt chị Hằng là `nguoi_dung + ke_toan_truong` (12 tab, có lương, **KHÔNG** tạo
được tài khoản) — nên **hiện chưa ai rơi vào tổ hợp này**. Sếp chỉ cần biết
form mới cho phép nó, và đừng bấm.

### N2 — ôm cả ba chặng luồng tiền đơn hoàn (Kho → Vận hành sàn → Kế toán)

`admin_backup + nv_test` · `nguoi_dung + nv_test` · và mọi `admin + *`.

Cần nói rõ hai điều:

1. **`admin_backup + nv_test` = 16 tab, BẰNG Admin về SỐ TAB nhưng KHÔNG
   NGANG Admin về QUYỀN.** Đo được: `admin=false`, `xem_luong=false`, **không**
   mở được nhóm tài liệu nhân sự. Lo ngại "ngang Admin" là **quá lời**.
2. **Vai trò `nv_test` một mình đã ôm cả ba chặng từ TRƯỚC bản này** —
   `nguoi_dung ∪ nv_test = nv_test`, nên bản vá **không tạo ra** vấn đề này.

**Mức: VỪA, có sẵn từ trước, không phải lỗi của bản vá.** Nhưng đây là chỗ
tiền thật đi qua và Sếp nên hỏi: **ai đang cần `nv_test`?** Trên CSDL thật nó
là tài khoản "Tài khoản thử". Nếu không còn dùng thì **khoá nó** — một tài
khoản test ôm trọn luồng tiền là bề mặt tấn công không cần thiết.

### N3 — HCNS chạm được lương không? — **KHÔNG, mọi đường vòng đều đóng**

`hcns` có `them_nhan_su: true` mà `xem_luong: false` — ranh giới cứng. Đo thật:

| Đường vòng | Kết quả |
|---|---|
| HCNS cấp tài khoản mới rồi nhờ người đó | **403** — HCNS không cấp được tài khoản |
| HCNS tự đặt mình thành Kế toán trưởng | **403** |
| HCNS trao vị trí có lương cho người khác | **403** |
| HCNS đọc `/api/nhan-su` | 200, **cột `luong` không có trong câu SQL** |
| HCNS thêm nhân sự kèm `luong: 99000000` | 200, nhưng **DB ghi `luong = NULL`** |
| HCNS đọc `/api/nhan-su/lich-su` · `/api/danh-ba` | không rò |
| `hcns` ở ô 2 kết với 3 ô 1 — có tổ hợp nào ra lương? | **không** (`admin + hcns` có lương là do **ô 1 = Admin**, tức Sếp, đúng thiết kế) |

**Sạch.** Cột lương không được `SELECT` ra khỏi máy chủ chứ không phải "lấy ra
rồi ẩn đi" (`src/index.js:355-362`) — đúng cách.

### N4 — kho tài liệu nhân sự (hợp đồng lao động, CCCD)

Mở được nhóm `nhan_su`: **đúng 10 tổ hợp — 8 cái `admin + *`, cộng
`admin_backup + hcns` và `nguoi_dung + hcns`.** Không tổ hợp nào lọt.
Quản lý kho + `nguoi_dung` ra đúng `['nhap_khau','attp','noi_bo']`, **không có
`nhan_su`** — ranh giới CTL-0025 Mục 4 còn nguyên. Danh sách LƯU trùng khít
danh sách XEM. **Lời khai đúng.**

---

## ② "Không ai mất quyền" — đo trên 8 TÀI KHOẢN THẬT, không phải 10 vai trò

Lập luận tập-con của Khỉ Đột nghe đúng nhưng đó là **lập luận**. Tôi dựng CSDL
có **đúng 8 dòng của bản thật**, gọi **33 đường API + `/api/toi-la-ai`** cho
từng người, trên **cả ba trạng thái deploy**, rồi so từng khoá.

Bàn đo: `scripts/holy-do-8-nguoi-that.mjs`.

| So | Kết quả |
|---|---|
| **T1** mã cũ + DB cũ → **T2** mã mới + DB **CHƯA có cột** | **8/8 người khớp từng khoá** |
| **T1** → **T3** mã mới + DB đã nạp migration | **8/8 người khớp từng khoá** |
| Mã 500 ở bất kỳ trạng thái nào | **0 / 792 phép gọi** |

**Không ai mất một tab. Không ai được thêm một tab.** Cả chiều xuôi lẫn chiều
ngược đều đo, vì "được thêm quyền không ai định trao" nguy hiểm ngang "mất
quyền".

### Nhưng: **bản vá này MỘT MÌNH chưa chữa được cho anh Duy**

Đo được, T3 (đã nạp migration, chưa chạy lệnh gán của Sếp):

```
Phạm Khương Duy    9 tab · khovan = KHÔNG CÓ
Phan Thị Hằng      9 tab · ketoan = KHÔNG CÓ
```

Đúng như tài liệu khai và **đúng thiết kế** — 5 người đó đang là `nguoi_dung`
thật, migration cố ý không đụng, vì gán vị trí là **business policy chỉ Sếp
quyết**. Lệnh chép–dán đã sẵn trong `docs/CHANGELOG.md`. Chạy xong thì đo được:

```
Phạm Khương Duy   12 tab · CÓ khovan     ✅
Phan Thị Hằng     12 tab · CÓ ketoan · lương=true
Nguyễn Thị Huyền  11 tab · CÓ kinhdoanh + donhoan
Đinh Mạnh Linh    10 tab · CÓ khovan
```

**Việc chưa xong khi mới gộp nhánh.** Phải: ① nạp migration → ② deploy →
③ Sếp chạy lệnh gán. Bỏ bước ③ là anh Duy vẫn kẹt y như hôm nay.

---

## ③ Ca "code mới, DB chưa nạp migration" — bản sửa có tạo lỗ mới không?

Khỉ Đột cho ô 1 **dung thứ** mã vị trí, lập luận "không vị trí nào mang cờ
admin". **Kiểm bằng máy**, quét toàn bộ `QUYEN_THEO_VAI_TRO`:

| | mang `admin` | mang `xem_luong` | mang `them_nhan_su` |
|---|---|---|---|
| 7 vị trí công việc | **không ai** | `ke_toan_truong` | `hcns` |

Vậy **để mã vị trí ở ô 1 CÓ kéo theo `xem_luong`/`them_nhan_su`** — câu hỏi
đúng không phải "có cờ gì" mà "**có cấp gì KHÔNG ĐÁNG CẤP không**". Đo:

> `boVaiTro({vai_tro: <vị trí>})` cho ra bộ quyền **giống hệt** đường cũ
> `boVaiTro('<vị trí>')` — **7/7 vị trí khớp tuyệt đối trên 14 bảng quyền.**

Tức là dung thứ ô 1 **giữ đúng hành vi bản cũ, không thêm một khoá nào**. Và
`ke_toan_truong`/`hcns` ở ô 1 chỉ tồn tại được với **dữ liệu cũ** — *ghi* mã
vị trí vào ô 1 vẫn bị cửa API chặn (đo: **400** trên cả 24 tổ hợp).
Mã lạ (`giam_doc` cũ) ở ô 1 → **không quyền gì**, chặn nhầm hơn mở nhầm. ✅

**Ba trạng thái deploy** — đã đo ở mục ② phía trên: T1 = T2 = T3, 0 lệch,
0 mã 500. **Cửa sổ nguy hiểm an toàn.**

### 🔴 CAO — `coCotViTri()` nuốt LỖI D1 TẠM THỜI thành "chưa có cột"

**File:dòng:** `src/auth.js:143`

```js
} catch {
  _nhoCotViTri.set(db, { co: false, hetHan: Date.now() + 60000 });
  return false;
}
```

`catch` trần — **mọi** lỗi đều bị hiểu là "cột chưa tồn tại", kể cả
`D1_ERROR: Network connection lost`.

**Cách tái hiện** (`scripts/holy-do-weakmap-va-o1.mjs`, khối cuối): chèn một
lỗi D1 **một lần duy nhất** đúng vào câu thăm dò, rồi gọi
`POST /api/quan-tri/tao-tai-khoan` với `vi_tri_cong_viec: 'nhan_vien_kho'`:

```
HTTP 200 · dòng ghi ra: {"vai_tro":"nguoi_dung","vi_tri_cong_viec":null}
```

**Vì sao hại:** Sếp bấm "Tạo tài khoản", chọn "Nhân viên kho", **màn hình báo
thành công**, mật khẩu tạm hiện ra — mà **ô 2 rơi mất**. Nhân viên mới đăng
nhập được nhưng không mở được tab nào của việc mình. Ghi vết còn ghi thêm câu
**sai sự thật**: *"CSDL chưa có cột vị trí công việc"*. Và câu trả lời sai
được **nhớ 60 giây**, nên trong phút đó `qtSuaVaiTro` trả **409 "CSDL chưa có
ô Vị trí công việc — cần nạp migration"** — Sếp đi tìm một migration đã nạp
xong từ lâu.

Đây đúng cái bẫy "im lặng" mà chú thích của chính bản vá này cấm (BH-21 ·
REV-0030 lỗi 5). Và **`docPhien()` ngay phía trên trong CÙNG file làm ĐÚNG** —
nó lọc `/no such column/i` rồi mới nuốt, sai thì `throw`. Hai hàm cạnh nhau,
hai chuẩn khác nhau.

**Sửa (một dòng):**
```js
} catch (e) {
  if (!/no such column/i.test(String(e && e.message))) throw e;
  _nhoCotViTri.set(db, { co: false, hetHan: Date.now() + 60000 });
  return false;
}
```

*(Ghi chú: `src/shopee.js:53` `coCotTinhTrangHang` có **cùng** khuôn `catch`
trần **và** dùng biến nhớ chung cả module — đúng hai lỗi Khỉ Đột vừa sửa ở
đây. Ngoài phạm vi bản này, nhưng bài học chưa được lan sang.)*

### ✅ WeakMap — ĐÚNG

Đây là chỗ mã tinh tế nhất, tôi kiểm riêng bằng hai CSDL trong **cùng tiến
trình**:

| Phép | Kết quả |
|---|---|
| CSDL **chưa** có cột → `false` (hỏi 2 lần) | ✅ |
| CSDL **đã** có cột → `true`, **không bị CSDL kia đầu độc** | ✅ |
| Hai CSDL **không** dùng chung câu trả lời | ✅ |

`WeakMap` khoá theo binding, không giữ binding sống. Logic
`nho.co || Date.now() < nho.hetHan` đúng: nhớ "có" vĩnh viễn (0 lượt đọc
thêm), nhớ "chưa có" 60 giây rồi hỏi lại. **Lời khai đúng, mã đúng.**

Cái giá đo được: nạp migration xong, ERP còn "mù" **tối đa 60 giây mỗi
isolate** — trong đó `qtSuaVaiTro` trả 409. Có chủ ý, chấp nhận được. **THẤP.**

---

## ④ Migration

| Câu hỏi | Kết luận |
|---|---|
| Chạy hai lần? | **AN TOÀN.** Dừng ở chốt `schema_migrations` (PRIMARY KEY), **0 câu chạy trước khi hỏng** — kể cả khi bỏ hẳn giao dịch. Chốt là **câu số 1** trong file nên không có gì để nửa vời. |
| Chạy trong một giao dịch? | **CÓ**, cả `--local` (Miniflare `transactionSync`) lẫn `--remote` (D1 import API). |
| Vai trò lạ `giam_doc`/`pho_giam_doc`? | **KHÔNG ĐỔI QUYỀN.** Migration không đụng (không nằm trong `WHERE`). Cả đường cũ lẫn đường mới đều ra `KHONG_QUYEN` — hai đường, cùng số không. Chúng đã chết từ lần gộp 23/08/2026. |
| File lùi có chạy được? | **CÓ.** Vòng lặp xuôi–ngược khớp chính xác cho các dòng migration thật sự đụng tới. |
| Ca lùi mất dữ liệu có thật? | **CÓ**, và tài liệu **không nói giảm**. `vi_tri_cong_viec_luu_lui` cất đủ cả hai giá trị + cờ `gop_nguoc_duoc`. Chạy lại file xuôi sau khi lùi **không** vấp "duplicate column name". |
| File lùi đặt đúng chỗ? | **ĐÚNG** — `migrations/lui/lui-*.sql`, có băng cảnh báo, có ghi thứ tự "deploy mã cũ trước". |
| `deploy.yml` có tự chạy migration? | **KHÔNG** — `.github/workflows/deploy.yml:22-30` chỉ có `command: deploy`. Phải chạy tay trước khi gộp, đúng như tài liệu ghi. |
| Danh sách vị trí trong SQL khớp `VI_TRI_CONG_VIEC`? | **KHỚP** 7/7, và bàn đo tự canh chuyện này. |

**Bẫy tiềm ẩn đáng nhớ (chưa phải lỗi):** chốt buộc "cột tồn tại" vào "có dòng
trong `schema_migrations`". Ai lỡ chèn tên file mà chưa chạy file là migration
bị khoá vĩnh viễn, cột không bao giờ được thêm.

**Chưa làm được:** tôi **không** chạy `SELECT` trên CSDL production để soi vai
trò lạ — worktree không có khoá Cloudflare, và tôi không tự đi lấy khoá. **Sếp
hoặc Gạo chạy giúp một lệnh CHỈ ĐỌC trước khi nạp migration:**

```
npx wrangler d1 execute crm-agc --remote --command "SELECT vai_tro, COUNT(*) FROM tai_khoan GROUP BY vai_tro"
```

Nếu ra mã ngoài 10 mã hợp lệ → dòng đó **hiện đã không có quyền gì** (không
phải lỗi mới), nhưng migration sẽ để nguyên nó ở ô 1 và màn Quản trị sẽ xếp
nhầm nó vào ô **Vị trí công việc** (`nhomVaiTro()` `src/quyen.js:529` không có
nhánh "không rõ") — nơi không lưu lại được. Nên biết trước.

---

## ⑤ Ghi vết

**Đúng:** ghi **cũ → mới → ai → lúc nào** vào sổ `nhan_su_lich_su` **đã có** —
**không đẻ bảng mới** ✅. Một cú bấm = **một dòng** (cả hai ô), đọc lại đúng
như Sếp nhìn trên màn hình ✅. Ghi hỏng thì kêu lên console rồi đi tiếp — đúng,
sổ này không phải nguồn sự thật của quyền.

### 🔴 CAO — dấu thời gian lệch 7 tiếng

**File:dòng:** `src/index.js:1280`

```js
VALUES (?, ?, ?, ?, ?, ?, datetime('now'))     // ← UTC
```

**Cả 9 chỗ ghi khác vào CÙNG sổ này đều dùng `datetime('now','+7 hours')`:**
`src/index.js:982, 1115, 1126, 1578, 6368` · `src/hopdong.js:182` ·
`src/ky-nang.js:136, 158` · `src/mota-cv.js:120`.

**Cách tái hiện:** đổi vai trò một người, mở hồ sơ nhân sự của họ. Dòng
"đổi vai trò" hiện **sớm hơn 7 tiếng** thực tế, và vì màn đọc sắp
`ORDER BY h.luc DESC` (`src/index.js:388`) nên nó **xếp sai chỗ** giữa các sự
kiện khác của chính người đó.

**Vì sao hại:** đây là **sổ ghi ai trao quyền xem lương cho ai**. Một dấu thời
gian sai làm nó mất giá trị làm bằng chứng — mà đó là lý do duy nhất nó tồn
tại. Sửa **một ký tự**.

### 🟠 VỪA — từ điển sự kiện thiếu hai mã mới ⇒ hồ sơ hiện MÃ THÔ

**File:dòng:** `public/assets/js/app.js:5005-5012`

`NHAN_SU_KIEN` không có `doi_vai_tro` lẫn `cap_tai_khoan`. Grep xác nhận: hai
chuỗi này **không xuất hiện ở đâu trong `public/`**. Bộ vẽ lùi về
`|| h.loai_su_kien` (`:5056`), nên Sếp mở hồ sơ sẽ thấy chữ **`doi_vai_tro`**
thay vì "Đổi vai trò".

**Đáng nói:** chú thích ngay **phía trên chính từ điển đó** (`:5008-5010`) mô
tả **đúng lỗi này** từ vòng trước — *"backend ĐÃ ghi từ vòng trước nhưng từ
điển thiếu ⇒ hồ sơ hiện mã thô (N-2 · REV-0013)"*. Lỗi lặp lại ở đúng chỗ đã
từng vá. Sửa: thêm hai dòng vào từ điển.

### 🟠 VỪA — người bị đổi KHÔNG được báo, và KHÔNG tự đọc lại được

Không có thông báo nào — không `guiThongBao`, không Telegram, không push. Trong
khi ERP báo cho những việc nhẹ hơn nhiều (giao việc, trả việc, sửa mục tiêu,
vinh danh).

Nặng hơn: **người bị đổi không tự tra được.** `nsLichSu` chặn bằng
`duocXemTab(phien,'nhansu')` (`src/index.js:376`) — chỉ admin/admin_backup/
quan_ly_kho/hcns. Một `nhan_vien_kho` bị đổi vị trí thì **không có đường nào**
biết ai đổi, đổi lúc nào.

Mà HCNS được sửa ô 2 của bất kỳ ai như việc hành chính hằng ngày.

**Đây là chính sách, Sếp quyết, không phải lỗi mã.** Nhưng theo hướng MBOs
Sếp đang đi: một dòng thông báo "Chị Hương vừa đặt vị trí của bạn thành *Nhân
viên kho*" biến một cú sửa CSDL âm thầm thành **một lời bổ nhiệm** — đúng thói
quen ghi nhận Sếp đang muốn xây. Rẻ, và đúng lúc.

*(Đúng và không cần sửa: không phải huỷ phiên. `docPhien` đọc lại `tai_khoan`
mỗi request, nên đổi vai trò có hiệu lực tức thì.)*

---

## ⑥ Giao diện

| Lời khai | Đo lại |
|---|---|
| `.combo1` 38px → 44px ở **cả 20 chỗ** | **ĐÚNG CHÍNH XÁC.** `style.css:1740` `min-height:44px` (đúng `min-height`, không phải `height`). `class="combo1"` xuất hiện **đúng 20 lần** trong `app.html` (18 cũ + 2 mới). Đo thật trong Chrome ở 375px: **cả 20 = 44.0px**; ở `HEAD~1` cả 20 = 38.0px. |
| Sửa lớp dùng chung có vỡ chỗ khác không? | **KHÔNG.** Cả 20 nằm trong `.form-luoi` (grid `auto-fit`, `align-items:end`, không giả định 38px). Ba tổ tiên `overflow:hidden` đều `height:auto; max-height:none` — cắt để bo góc, không cắt nội dung. 5 hộp cuộn nội bộ ở **cả hai** bản, **không hộp nào mới cuộn**. Tác dụng phụ là **tốt hơn**: combo 38px cạnh ô nhập 45px nay thành 44 cạnh 45. |
| Form hai ô ở 375px có bắt cuộn không? | **KHÔNG.** `taoTkModalNen` 403px → **508px**, `hopPhaiCuon: false` (màn 812, chỗ trống 772). `doiVaiTroModalNen` 304 → 408. **Vừa một màn.** |
| Bàn đo tự đo `scrollHeight` cả trang (lỗi nó tự nêu) | **ĐÃ SỬA THẬT.** `do-hai-o-tren-man.mjs:113-121` đo `modal.scrollHeight > modal.clientHeight`, tức **đúng phần tử** — `.modal` mới là cái cuộn (`style.css:2846`, `max-height:calc(100vh - 40px); overflow-y:auto`). |
| Ba màu | **SẠCH.** Quét mọi `color`/`background`/4 `border*`/`outline` của mọi phần tử trong hộp Tạo tài khoản (đã bung danh sách) tìm sắc 340–18° bão hoà ≥35%: **0 kết quả**. `#taoTkLoi` là ô đỏ duy nhất và nó là ô báo lỗi. `do-ba-mau` 12/12. |

### 🟠 VỪA — chạm 44px: nút combo ĐẠT, nhưng **thứ người ta bấm thật** thì KHÔNG

**File:dòng:** `public/assets/css/style.css:1757` (`.ql-goiy-item`)

Đo cả 9 phần tử bấm được trong hộp Tạo tài khoản ở 375px:

| Phần tử | Cao |
|---|---|
| `#taoTkVaiTroHienThi` / `#taoTkViTriHienThi` | 44px ✅ |
| ô nhập tên, ô tìm, nút Lưu | 45px ✅ |
| **`.ql-goiy-item` ×3 — DÒNG CHỌN vai trò / vị trí** | **36.9px** ❌ |
| `#taoTkHuy.btn-phu` | **38px** ❌ (`style.css:2805`) |

`.ql-goiy-item` là **cú chạm chính của cả luồng mới** — bấm nút combo chỉ để
mở danh sách, *chọn vai trò* mới là việc. Thiếu 7px.

Cả hai đều **có sẵn từ trước** (diff CSS không đụng). Nhưng đó đúng là lập
luận mà chú thích CSS của chính bản vá này **bác bỏ**: nó khăng khăng vá luật
44px "ở ĐÚNG MỘT CHỖ" cho lớp dùng chung thay vì vá triệu chứng — rồi bỏ lại
dòng chọn ngay một lớp bên dưới ở 36.9px.

Và bàn đo **mù chỗ này**: phép ④ (`do-hai-o-tren-man.mjs:184-185`) chỉ khẳng
định trên `caoO1`/`caoO2` — hai cái nút, không phải các dòng bên trong.

### 🔵 THẤP — chú thích sai ở 375px

`public/app.html:3437-3441` khai hai ô nằm **cạnh nhau** nên "form KHÔNG cao
thêm một hàng". Ở 375px hộp rộng 295px, `.form-luoi` là
`repeat(auto-fit, minmax(210px,1fr))` → **rơi về 1 cột**, hai ô **xếp chồng**,
form cao thêm 105px. Vẫn vừa màn nên không cổng nào đỏ — nhưng lý do nêu trong
chú thích không đúng ở đúng cái bề rộng mà luật nhà nói tới.

### 🔵 THẤP — nửa câu khẳng định chết

`do-hai-o-tren-man.mjs:151` và `:182`: vế `k.caoHop > k.caoMan - 40` không bao
giờ đúng vì `max-height` chặn trước. Phép còn sống là `hopPhaiCuon` — và đó
là phép đúng, nên khẳng định vẫn vững, chỉ thừa một nửa.

---

## ⑦ Ca xấu Khỉ Đột tự nêu — xác nhận từng cái

| Nó khai | Hồ Ly |
|---|---|
| Bàn đo của nó sai 2 chỗ (đo `scrollHeight` cả trang; stub thiếu khoá) | **ĐÚNG, đã sửa thật** — xem ⑥. Tự tìm ra và tự sửa, ghi nhận. |
| Bàn đo bắt được lỗi bộ nhớ đệm dùng biến chung → đổi sang WeakMap | **ĐÚNG, và WeakMap viết ĐÚNG** — tôi kiểm riêng bằng 2 CSDL cùng tiến trình, xem ③. Đây là ca bàn đo **bắt được lỗi thật của người viết**, đúng tinh thần BH-16. |
| (a) HCNS vẫn không cấp được tài khoản | **CHẤP NHẬN ĐƯỢC.** Cấp danh tính nặng hơn đặt vị trí. Cắt phạm vi hợp lý, đúng hướng "thà chặn nhầm". |
| (b) Nút "Đổi vai trò" vẫn hiện trên dòng của chính mình | **NÊN SỬA — THẤP.** `app.js:528` chỉ xét `TOI.la_admin \|\| TOI.duoc_dat_vi_tri`, không xét dòng-của-mình. Chị Hương bấm nút trên dòng mình, mở hộp, chọn vị trí, bấm Lưu → **403**. Chặn ở máy chủ là **đúng** và phải giữ; nhưng hiện nút rồi mới báo lỗi là **dạy người ta rằng ERP hay hỏng**. Câu lỗi thì viết tốt (*"Bạn không tự đổi được vai trò hay vị trí của chính mình — nhờ Admin"*). Ẩn nút **và** giữ chốt máy chủ mới là đủ hai lớp — đúng chuẩn nhà đã dùng ở chỗ khác. Không nguy hiểm, chỉ gây bực. |
| (c) admin_backup vẫn hạ được một Admin không-phải-cuối-cùng | **CHẤP NHẬN ĐƯỢC** — luật cũ, không phải bản này mở ra, và chốt "Admin cuối cùng" vẫn nguyên (`src/index.js:1717-1722`). |
| 9 phép đỏ ban đầu là **do môi trường** | **XÁC NHẬN** — tôi chạy lại `do-quyen-duyet-gopy` sạch **192/0**. Bàn đo tự dựng CSDL bằng `dungDB()`, không phụ thuộc `seed.sql`. |

---

## ⑧ MỘT VỊ TRÍ HAY NHIỀU VỊ TRÍ — có phải lỗi thiết kế phải sửa TRƯỚC KHI GỘP?

> Bối cảnh Sếp Ngọc bổ sung: *"nó đang lỗi chồng chéo vì tao đang chưa làm
> được nhân sự cho sạch về chức năng nhiệm vụ và phân quyền, đang tái cấu
> trúc"*. Q3/2026 đang hợp nhất hai pháp nhân, sơ đồ tổ chức chưa chốt.
> Kiêm nhiệm là **hình dạng của cả giai đoạn**, không phải dữ liệu bẩn.
>
> Gạo chốt thiết kế: ô vị trí phải chứa **nhiều** vị trí, mỗi cái mang nhãn
> *chính thức* / *tạm kiêm*, "tạm kiêm" có ngày rà lại. Và nghiêng về **phải
> sửa trước khi gộp**, vì đẩy bản một-vị-trí lên rồi tháng sau đổi là **hai
> lần sửa cấu trúc CSDL thật, hai lần rủi ro mất quyền của 8 người**.

**Tôi đồng ý mô hình đúng là NHIỀU vị trí. Tôi KHÔNG đồng ý là phải sửa trước
khi gộp.** Bất đồng dựa trên bốn phép đo dưới đây.

Bàn đo: `scripts/holy-do-nhieu-vi-tri.mjs`.

### Đo 1 — Bán kính thiệt hại thật của mô hình một-vị-trí: **1 người, 2 tab**

Đây là số đo quyết định, và nó **ngược với trực giác**:

```
van_hanh_san tab: chat,congviec,danhba,donhoan,gopy,khotailieu,kinhdoanh,lichsuviec,taisan,tongquan,xepca
cskh         tab: chat,congviec,danhba,donhoan,gopy,khotailieu,kinhdoanh,lichsuviec,taisan,tongquan,xepca

cskh là TẬP CON của van_hanh_san?  → true
cskh thiếu gì so với van_hanh_san? → (không thiếu gì)
```

**`cskh` và `van_hanh_san` có BỘ TAB Y HỆT NHAU**; `van_hanh_san` chỉ hơn ở cờ
thao tác chặng Vận hành sàn. Hệ quả trên 8 người thật:

| Người | Việc thật | Gán | Mất gì vì chỉ chứa 1 vị trí |
|---|---|---|---|
| Phạm Khương Duy | TP. Kho vận | `quan_ly_kho` | **không mất gì** (một việc) |
| Phan Thị Hằng | Kế toán trưởng | `ke_toan_truong` | **không mất gì** |
| **Nguyễn Thị Huyền** | **Vận hành sàn + CSKH** | `van_hanh_san` | **KHÔNG MẤT GÌ** — `cskh` là tập con |
| Đinh Mạnh Linh | NV Kho | `nhan_vien_kho` | **không mất gì** |
| **Vũ Lan Hương** | **HCNS + CSKH** | `hcns` | **`kinhdoanh` + `donhoan`** — đúng 2 tab |

Trong hai người kiêm nhiệm, **chỉ chị Hương thật sự kẹt**, vì `cskh` ⊄ `hcns`.
Chị Huyền — người tôi tưởng cũng kẹt — **không mất một tab nào**.

⇒ Giá phải trả của việc gộp bản này ngay: **một người, hai tab, tạm thời.**
Giá phải trả của việc CHẶN nó: **năm người tiếp tục không mở được tab của
việc mình**, trong đó anh Duy là trưởng phòng kho không vào được tab Kho vận —
đúng cái nguyên nhân gốc mà việc này sinh ra để chữa.

### Đo 2 — Lần đổi thứ hai có thật sự "hai lần rủi ro mất quyền" không? — **KHÔNG**

Đây là chỗ tôi bất đồng thẳng với lập luận của Gạo. Bảng nối là **phép cộng
thuần**, không viết lại dòng nào của `tai_khoan`:

```sql
CREATE TABLE tai_khoan_vi_tri (tai_khoan_id, vi_tri, loai, ra_soat_ngay);
INSERT INTO tai_khoan_vi_tri SELECT id, vi_tri_cong_viec, 'chinh_thuc', NULL
  FROM tai_khoan WHERE vi_tri_cong_viec IS NOT NULL;
```

- **Số lượt ghi trên CSDL thật:** 1 `CREATE` + 1 `CREATE INDEX` + backfill
  **≈ 6 dòng** (sau lệnh gán của Sếp; **1 dòng** nếu chạy trước).
- **Số dòng `tai_khoan` bị sửa: 0.** Migration lần này (`them-vi-tri-cong-viec.sql`)
  **có** `UPDATE tai_khoan` — lần sau thì **không**.
- ⇒ Rủi ro mất quyền của lần 2 **nhỏ hơn hẳn** lần 1, không phải "hai lần
  ngang nhau". Lập luận "hai lần rủi ro như nhau" **không đứng được**.
- **`docPhien` vẫn 0 lượt đọc thêm mỗi request** — `LEFT JOIN` +
  `GROUP_CONCAT` gộp vào đúng câu đang có, không cần câu thứ hai.

### Đo 3 — Phần quyền đã sẵn sàng cho nhiều vị trí, và vẫn KÍN

Mô phỏng ô 2 mang nhiều vị trí, dùng **chính** phép hợp hiện có, quét
**cả 384 tổ hợp** (3 × 2⁷):

| Phép | Kết quả |
|---|---|
| Kiêm nhiều vị trí có **đẻ quyền từ hư không** không? | **0 khoá** trên 384 tổ hợp ✅ |
| Có đường nào chạm **giấy tờ nhân sự** ngoài `hcns` không? | **không**, sạch cả 384 ✅ |
| Chị Hương `hcns + cskh` | **14 tab · lương = false**, đúng bằng phép hợp hai bộ ✅ |

`boVaiTro()` **đã** trả về mảng và `quyenCua()` **đã** hợp mảng — phần khó
nhất đã làm xong trong bản này. Đây là điểm cộng thật cho Khỉ Đột: nó viết
tầng quyền **rộng hơn** cái ô nó đang có.

### Đo 4 — Ba chốt an toàn có sống sót không? Hai sống, **một chỉ sống nếu viết đúng**

| Chốt | Dưới mô hình nhiều vị trí |
|---|---|
| ② không tự sửa ô của chính mình | **SỐNG NGUYÊN VẸN** — xét theo **DÒNG** (`tk.nhan_su_id === phien.nhan_su_id`, `src/index.js:1712`), không xét giá trị. Không phụ thuộc số vị trí. |
| ① ô 2 chỉ nhận mã vị trí | **SỐNG**, nếu áp cho **từng phần tử**. Đo: nhét `admin` vào phần tử thứ 2 → 400 ✅ |
| ③ chỉ Admin trao vị trí có lương | ⚠️ **CHỈ SỐNG NẾU KIỂM TỪNG PHẦN TỬ** |

**Đây là cái bẫy phải ghi ra trước cho Khỉ Đột.** Đúng câu hỏi Gạo đặt: người
tự thêm cho mình một vị trí "tạm kiêm" có lương thì sao?

```
Mũi tiêm: HCNS gán ["cskh", "ke_toan_truong"] — lương giấu ở phần tử THỨ HAI
  Cửa viết SAI (chỉ kiểm phần tử đầu / chỉ kiểm vị trí "chính thức") → HTTP 200  ⚠ LỌT
  Cửa viết ĐÚNG (kiểm TỪNG phần tử)                                  → HTTP 403
```

Cách viết sai này **rất dễ mắc** khi đổi từ một giá trị sang danh sách, và
nhãn *chính thức / tạm kiêm* làm nó **dễ mắc hơn nữa** — người viết sẽ tự
nhiên nghĩ "kiểm cái chính thức là đủ".

Trả lời thẳng câu Gạo hỏi: **chốt ② CÓ phủ được ca tự thêm "tạm kiêm" có
lương** (vì nó chặn theo dòng, bất kể thêm gì). Nhưng **không được dựa vào
mình chốt ②** — chốt ③ phải chặn ca "gán cho NGƯỜI KHÁC", và chốt ③ là cái
vỡ nếu viết ẩu. **Cả hai đều phải lặp qua từng vị trí.**

### Đo 5 — Chỗ khó đổi nhất: **3 chỗ so VÔ HƯỚNG trên cột**

Cột này **không** chỉ đi qua `boVaiTro()`. Có 3 chỗ so bằng chuỗi thẳng trong
SQL/JS — **vỡ im lặng** nếu cột chứa danh sách:

```
src/index.js:319        AND (t.vi_tri_cong_viec IS NULL OR t.vi_tri_cong_viec != 'nv_test')
src/nhac-nhan-su.js:135 OR t.vi_tri_cong_viec = 'hcns'
src/nhac-nhan-su.js:145 const laHcns = (x) => x.vai_tro === 'hcns' || x.vi_tri_cong_viec === 'hcns';
```

Hậu quả nếu quên: tài khoản test **lòi ra danh bạ**, và chị Hương **mất sạch
tin nhắc HCNS**. **Tin tốt:** đó đúng là hai ca đối chứng **DC-G** và **DC-H**
mà Khỉ Đột đã dựng sẵn trong `do-tach-vai-tro.mjs` — quên là **bàn đo đỏ ngay**,
không lọt được ra sản xuất. Bảng nối biến ba chỗ này thành `EXISTS (...)`.

### Đo 6 — Cái giá THẬT của nhiều vị trí, phải nói ra: bề mặt kiểm thử ×16

| | Tổ hợp | N1 (cấp TK + xem lương) | N2 (ôm cả 3 chặng luồng tiền) |
|---|---|---|---|
| Một vị trí (hôm nay) | **24** | 1 | 2 |
| Nhiều vị trí | **384** | **64** | **152** |

Không phải lỗ hổng — mọi tổ hợp vẫn bị cửa API chặn, và phép hợp vẫn chỉ
cộng. Nhưng **"liệt kê hết mọi tổ hợp" thôi không còn là cách soi khả thi**.
Phải chuyển sang soi theo **tính chất** (kiểu bàn đo này: *"không đẻ quyền từ
hư không"*, *"không đường nào chạm giấy tờ nhân sự ngoài hcns"* — đo một lần,
đúng cho cả 384). Sếp và Gạo nên nhận cái giá này một cách có ý thức.

### Lý do MẠNH NHẤT để làm sớm — và nó không phải lý do Gạo nêu

Lập luận "hai lần rủi ro" đã bị Đo 2 bác bỏ. Nhưng có một lý do khác **mạnh
hơn**, và bằng chứng nằm ngay trong mục ⑨ của chính báo cáo này:

> ERP này đã có **BA** chỗ tách dở dang chưa ai dọn: `nhan_su.trang_thai` ·
> `tai_san.trang_thai` · `gop_y.loai`. Hai trong ba **đã tạo cột thứ hai** và
> **đã ghi đúng tên lỗi vào chú thích migration** — rồi để giá trị cũ nằm đó.
> Một cái **đang gây mất dữ liệu trước mắt người dùng ngay hôm nay** (⑨b).

Tần suất "cái tạm thành cái vĩnh viễn" trong repo này **đo được là 3/3**. Một
cột một-giá-trị "tạm thời" ở đây có cơ sở thực nghiệm rất cao để thành vĩnh
viễn. Đó mới là rủi ro thật của việc hoãn — không phải rủi ro migration.

### KHUYẾN NGHỊ

**GỘP BẢN NÀY.** Không chặn. Rồi làm nhiều-vị-trí ở **nhánh ngay kế tiếp, có
ngày ghi ra giấy**, không phải "vòng sau".

1. **Gộp + nạp migration + deploy** như kế hoạch.
2. **Chạy lệnh gán cho 4 người:** Duy, Hằng, Huyền, Linh — đo được là
   **không ai mất gì**. Bốn người được cởi trói ngay hôm nay.
3. **Chị Hương:** gán `hcns` (12 tab, hơn 9 tab hôm nay — **tiến, không
   lùi**), và ghi rõ chị còn thiếu đúng 2 tab `kinhdoanh` + `donhoan` cho tới
   khi nhiều-vị-trí xong. **Sếp quyết** nếu nửa CSKH mới là nửa lớn hơn — khi
   đó gán `cskh` trước, vì thêm quyền bao giờ cũng dễ hơn thu quyền về.
4. **Nhánh kế tiếp — nhiều vị trí**, với 4 điều đã đo sẵn ở trên:
   bảng nối (không sửa dòng `tai_khoan`) · `LEFT JOIN`+`GROUP_CONCAT` để giữ
   0 lượt đọc thêm · **chốt ① và ③ phải LẶP qua từng vị trí** · 3 chỗ so vô
   hướng thành `EXISTS`.

**Nếu Sếp/Gạo vẫn muốn làm ngay trên nhánh này** thì cũng làm được và tôi
không phản đối kịch liệt — chỉ cần biết đúng cái đang đánh đổi: **5 người
tiếp tục kẹt thêm một vòng việc, để tiết kiệm một migration cộng thuần ~6
dòng.** Theo số đo thì phép đổi đó không có lãi.

### Câu nghiệp vụ phải hỏi Sếp — tôi KHÔNG tự chọn hộ

**"Tạm kiêm" hết ngày rà lại thì quyền TỰ RỤNG hay GIỮ NGUYÊN?**

- **Tự rụng:** sạch về nguyên tắc, nhưng sẽ có ngày ai đó **mất tab giữa giờ
  làm việc** mà không hiểu vì sao — và ERP này hiện **không báo gì cho người
  bị đổi quyền** (xem ⑤), nên họ sẽ không có cách nào biết.
- **Giữ nguyên:** "tạm" thành "vĩnh viễn" — đúng cái bệnh 3/3 ở trên.

**Đường thứ ba, đề xuất để Sếp cân:** hết hạn thì **không rụng gì cả**, mà
**nhắc** — bắn cho Sếp và cho HCNS một dòng *"Vị trí tạm kiêm CSKH của chị Vũ
Lan Hương tới ngày rà lại — gia hạn hay chuyển thành chính thức?"*. Quyền chỉ
đổi khi **có người bấm**. Sổ nhắc thì `src/nhac-nhan-su.js` đã có sẵn cơ chế.
Không ai mất quyền giữa giờ làm, mà "tạm" cũng không lặng lẽ thành vĩnh viễn.
**Đây là chuyện nghiệp vụ — Sếp chốt, tôi chỉ bày ba đường.**

---

## ⑨ Quét cả lớp — 3 chỗ khác nhét hai khái niệm vào một ô

| # | Chỗ | Có thật? | Hậu quả nó mô tả có đúng? |
|---|---|---|---|
| (a) | `nhan_su.trang_thai` lẫn `parttime` | **CÓ THẬT** | **ĐÚNG, và nặng hơn nó nói** |
| (b) | `tai_san.trang_thai` lẫn `bao_hong`/`mat` | **CÓ THẬT** | **ĐÚNG — truy được từ đầu tới cuối** |
| (c) | `gop_y.loai` lẫn khu vực lỗi | **CÓ THẬT** (là lẫn khái niệm) | **CHƯA gây hậu quả nào hôm nay** |

**(a)** `schema.sql:26` — `trang_thai` chứa 4 trạng thái hợp đồng **+ một
LOẠI lao động** (`parttime`). Cột thứ hai `loai_lao_dong` **đã tạo**
(`them-dangky-ca.sql:19-23`) và **chú thích migration gọi đúng tên lỗi**:
*"2 khái niệm khác nhau, không được gộp (bài học từ chính cột trang_thai
đang bị lẫn parttime vào)"*. Giá trị cũ **chưa gỡ** — `parttime` vẫn còn
trong ô chọn ở 4 chỗ (`app.html:870, 2466, 2639, 917`), **ngay phía trên** ô
đúng. **Hậu quả thật:** HCNS chọn "Bán thời gian" ở ô **Trạng thái** (cách đọc
tự nhiên) rồi để **Hình thức làm việc** mặc định → nhân sự đó bị **403 khi tự
đăng ký ca** (`src/ca.js:234`) và **biến mất khỏi bảng xếp ca**
(`src/ca.js:366`), lại còn sai tiền tố mã nhân viên. **Nặng hơn mô tả.**

**(b) — ca đáng lo nhất, và ĐÚNG.** Truy đủ ba bước:

1. `src/taisan.js:281` — báo hỏng **ghi đè** `trang_thai` (`da_cap_phat` →
   `bao_hong`), **không** xoá `nguoi_giu_id` (máy vẫn ở tay anh Duy), và
   **không** đặt `tinh_trang='hong'` — dù cột `tinh_trang` **đã tồn tại**
   đúng cho việc này (`them-taisan-mo-rong.sql:48-49`).
2. `src/taisan.js:65-69` — máy chủ trả **mọi** tài sản, không lọc.
3. `public/assets/js/app.js:7428` — lọc phía trình duyệt bằng
   `t.trang_thai !== trangThai`, so bằng tuyệt đối.

⇒ **Tài sản đang cấp phát, người giữ vẫn ghi trong DB, mà BIẾN MẤT khỏi bộ lọc
"Đã cấp phát".** HCNS đối chiếu ai đang giữ gì sẽ **đếm thiếu**. Thêm nữa: vào
`bao_hong` rồi thì nút **Thu hồi** bị ẩn (`app.js:7717`), lối ra duy nhất là
"Bảo trì xong" — và nó **âm thầm** `nguoi_giu_id = NULL` (`src/taisan.js:305`),
kết thúc một lần cấp phát mà **không có sự kiện thu hồi**.
**Sửa đúng đã nằm sẵn trong lược đồ:** `baoHongTaiSan` phải đặt
`tinh_trang='hong'` và **để yên** `trang_thai='da_cap_phat'`.
→ **CAO, nhưng NGOÀI PHẠM VI bản này — mở nhánh riêng.**

**(c)** `gop_y.loai` (`them-gopy.sql:27`) trộn *loại yêu cầu* (`loi`,
`cai_tien_*`, `tinh_nang_moi`) với *khu vực lỗi* (`du_lieu_sai`,
`loi_phan_quyen`, `loi_ket_noi`) — cùng kiểu "chọn một mất một nửa". Nhưng
grep cả `src/` lẫn `public/`: **không có bộ lọc, không `GROUP BY`, không phép
đếm nào** trên cột này. **Chưa hại gì hôm nay**; giá phải trả là tiềm ẩn —
lần đầu ai hỏi "quý này có bao nhiêu lỗi", `WHERE loai='loi'` sẽ **đếm thiếu
ba nhóm**. Bảng đã có cột `khu_vuc` sẵn cho trục thứ hai. **THẤP.**

---

## ⑩ Chạy lại HẾT cổng — tự mắt thấy

| Cổng | Nó khai | Tôi đo | |
|---|---|---|---|
| `do-tach-vai-tro` | 55/0 (8/8 đối chứng) | **ĐẠT 55 · TRƯỢT 0**, 8/8 đối chứng bắt được | ✅ khớp |
| `do-quyen-duyet-gopy` | 192/0 | **ĐẠT 192 · TRƯỢT 0** | ✅ khớp |
| `do-hai-o-tren-man` | 12/0 | **ĐẠT 12 · TRƯỢT 0**, 3/3 đối chứng | ✅ khớp |
| cổng khói 1440 | XANH | **XANH**, 0 lỗi console | ✅ khớp |
| cổng khói 375 | XANH | **XANH** | ✅ khớp |
| `do-ba-mau` | 12/12 | **12/12** | ✅ khớp |
| `do-bang-vua-man` | 42/0 | **ĐẠT 42 · TRƯỢT 0** | ✅ khớp |
| `do-moc-noi` | 9/0 | **ĐẠT 9 · TRƯỢT 0** | ✅ khớp |
| `do-cat-im-lang` | SẠCH | **SẠCH** | ✅ khớp |
| `do-chu-dai` | XANH | **XANH** | ✅ khớp |
| `do-quet-375` | ĐẠT | **ĐẠT**, mã thoát 0 | ✅ khớp |

**Không một con số nào lệch.** Không cổng nào chạy không được.

**Chi phí 0 — xác nhận:** `package.json` chỉ thêm **2 dòng `scripts`**, **0 gói
mới**, `devDependencies` không đổi.

**Lượt D1** — lời khai đúng, với một chỗ cần nói chính xác hơn: "màn danh sách
tài khoản +0 đọc" và "mỗi request +0 đọc" **đúng sau khi cột đã tồn tại**
(`coCotViTri` nhớ "có" vĩnh viễn). **Lần gọi đầu tiên trong mỗi isolate vẫn
tốn 1 lượt đọc** để phát hiện ra cột. Chia đều thì gần bằng 0; nói "+0" là
làm tròn, không phải sai.

---

## Bàn đo Hồ Ly viết ra (giữ lại làm bằng chứng)

| File | Đo gì |
|---|---|
| `scripts/holy-do-24-tohop.mjs` | 24 tổ hợp bằng định nghĩa nghiệp vụ N1–N5 + 288 mũi tấn công API + chuỗi hai bước + mọi đường vòng của HCNS |
| `scripts/holy-do-8-nguoi-that.mjs` | 8 tài khoản thật × 3 trạng thái deploy × 33 đường API = 792 phép; và "bản vá này chữa được chưa" |
| `scripts/holy-do-weakmap-va-o1.mjs` | WeakMap 2 CSDL cùng tiến trình · ô 1 dung thứ có cấp gì thừa không · lỗi D1 tạm thời |
| `scripts/holy-do-nhieu-vi-tri.mjs` | 384 tổ hợp nhiều-vị-trí · ba chốt an toàn có sống sót không · đếm chỗ so vô hướng |

`holy-do-8-nguoi-that.mjs` cần bản `src` cũ làm mốc — dựng lại bằng một lệnh
ghi ở đầu file.

---

## Việc phải làm trước khi gộp

1. **`src/auth.js:143`** — lọc `/no such column/i` trước khi nuốt, sai thì
   `throw`. *(CAO, một dòng)*
2. **`src/index.js:1280`** — `datetime('now')` → `datetime('now','+7 hours')`.
   *(CAO, một ký tự)*
3. **`public/assets/js/app.js:5005`** — thêm `doi_vai_tro: 'Đổi vai trò'` và
   `cap_tai_khoan: 'Cấp tài khoản'` vào `NHAN_SU_KIEN`. *(VỪA, hai dòng)*

Nên làm, không chặn: ẩn nút "Đổi vai trò" trên dòng của chính mình
(`app.js:528`); nâng `.ql-goiy-item` lên 44px (`style.css:1757`).

Sau khi gộp, **đủ ba bước mới xong việc**: ① nạp migration → ② deploy →
③ Sếp chạy lệnh gán vị trí cho 5 người (có sẵn trong `docs/CHANGELOG.md`).
Thiếu bước ③ là anh Duy vẫn không mở được tab Kho vận.

**Cần Sếp quyết:**
- chị Hương lấy `hcns` hay `cskh` — đo được là chị mất **đúng 2 tab**
  (`kinhdoanh` + `donhoan`) nếu lấy `hcns`, và đó là người **duy nhất** trong
  8 người thật sự kẹt vì mô hình một-vị-trí (⑧);
- "tạm kiêm" hết hạn thì quyền **tự rụng · giữ nguyên · hay chỉ nhắc** (⑧);
- có **báo cho người bị đổi vai trò** không (⑤);
- tài khoản `nv_test` ôm cả ba chặng luồng tiền — còn dùng không, không thì
  **khoá** (①N2).

**Nhánh ngay kế tiếp, có ngày ghi ra giấy:** ô vị trí chứa **nhiều** vị trí
(⑧). Đã đo sẵn đường đi: bảng nối cộng thuần (~6 dòng, **0 dòng `tai_khoan`
bị sửa**) · `LEFT JOIN`+`GROUP_CONCAT` giữ 0 lượt đọc thêm · **chốt ① và ③
phải LẶP qua từng vị trí, không chỉ kiểm cái "chính thức"** · 3 chỗ so vô
hướng thành `EXISTS`.

**Mở nhánh riêng:** ca tài sản biến mất khỏi bộ lọc "Đã cấp phát" (⑨b) — mất
dữ liệu trước mắt người dùng, sửa đã nằm sẵn trong lược đồ.
