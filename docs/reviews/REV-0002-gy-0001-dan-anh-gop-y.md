# REV-0002 — Review GY-0001: Dán ảnh vào ô Góp ý

| | |
|---|---|
| **Request ID** | GY-0001 |
| **Nhánh** | `feature/gopy-paste-anh` — commit `3af0c23` (trên `main` = `5d6b3a1`) |
| **Người build** | KHỈ ĐỘT (Agent B) |
| **Reviewer** | HỒ LY (Agent A) — vai QA / Red Team / Release Gate |
| **Ngày** | 2026-08-27 |
| **Khỉ Đột tự khai** | READY_FOR_REVIEW · Risk LOW · 4 file · +280/−13 |
| **Kết luận Hồ Ly** | **FIX_REQUIRED** — 3 lỗi MEDIUM + 5 lỗi LOW. Không có lỗi phá dữ liệu, không có lỗ hổng bảo mật mới. |

---

## 1. Xác minh lời khai bằng diff (không tin lời, chỉ tin diff)

Chạy `git diff --stat main..feature/gopy-paste-anh`:

```
 docs/ACTIVE-WORK.md         |   5 +-
 public/app.html             |  26 +++++-
 public/assets/css/style.css |  64 ++++++++++++++
 public/assets/js/app.js     | 198 +++++++++++++++++++++++++++++++++++++++++---
 4 files changed, 280 insertions(+), 13 deletions(-)
```

| Khỉ Đột khai | Hồ Ly xác minh | Kết quả |
|---|---|---|
| Không đụng `src/index.js` | Không có trong diffstat | ✅ ĐÚNG |
| Không đụng DB / migration | Không có `migrations/` trong diffstat | ✅ ĐÚNG |
| Không đụng `docs/specs/` | Không có trong diffstat | ✅ ĐÚNG |
| Không đụng `gopYDoiTrangThai` / `gopYDanhSach` / `gopYLichSu` | 3 hàm này nằm trong `src/index.js` — không đổi 1 ký tự. `veDongGopY()` và `moChiTiet()` ở frontend cũng không đổi (diff chỉ chèn code phía **trên** `veDongGopY`) | ✅ ĐÚNG — **Rule 13 PASS** |
| 4 file, +280/−13 | Khớp chính xác | ✅ ĐÚNG |
| "Form đóng thì xoá ảnh xem trước" | **SAI** — xem Lỗi #3 | ❌ KHAI SAI |

**Kết luận scope:** Không tràn scope. Nhánh này chạy song song với SPEC-0002/SPEC-0003 được, hai vùng không giao nhau. Đây là điểm Khỉ Đột làm tốt.

---

## 2. Những chỗ Khỉ Đột làm ĐÚNG (ghi nhận, không phải khen xã giao)

Red Team vẫn phải ghi nhận cái đúng, nếu không lần sau người build sẽ bỏ luôn những chỗ này.

1. **Đo byte đúng cách backend đo.** `coByteCuaDataUrl()` (`app.js:878-885`) tính đúng độ dài sau khi giải base64 — trùng khớp với `atob(raw).length` mà `gopYGui()` dùng ở `src/index.js:3165`. Ngưỡng frontend 780KB < backend 800KB, có biên an toàn. Đây là cách chặn 413 bất ngờ đúng chuẩn, nhiều người build sẽ đo `dataUrl.length` rồi lệch 33%.
2. **Nền trắng cho ảnh PNG trong suốt** (`app.js:914-917`). Không có `fillRect` này thì ảnh chụp màn hình có vùng trong suốt sẽ ra nền ĐEN, người dùng tưởng ảnh hỏng. Bắt được lỗi này là kinh nghiệm thật.
3. **Media query mobile viết ĐÚNG.** Khỉ Đột khai "dùng `pointer: coarse`" nhưng code thật là `@media (hover: none) and (pointer: coarse)` (`style.css:534`). Có thêm `hover: none` nên **laptop màn hình cảm ứng vẫn dùng chuột + bàn phím sẽ báo cáo `hover: hover` / `pointer: fine` → vẫn thấy lời nhắc Ctrl+V.** Đúng như Sếp lo. Lời khai kém hơn code thật.
4. **Không chồng event listener.** `khoiDongGopY()` chỉ được gọi **một lần duy nhất** ở `app.js:1388`, trong khối khởi động, có gác quyền `TOI.quyen.includes('gopy')`. Không có đường nào gọi lại → không rò rỉ listener, không "dán một lần ra hai ảnh". Lo ngại này KHÔNG xảy ra.
5. **Không có lỗ XSS mới.** Ảnh gửi đi luôn đi qua `canvas.toDataURL('image/jpeg', …)` → tái mã hoá thành JPEG thật, mọi nội dung lạ nhét trong file gốc bị huỷ. Ảnh hiển thị lại đi qua `/api/gop-y/anh?id=` + `encodeURIComponent(g.id)` (`app.js:3172`), không nhét data URL từ DB vào DOM. Endpoint `gopYAnh()` có kiểm quyền: không phải Admin thì chỉ xem được ảnh của chính mình (`src/index.js:3290`).
6. **Backend vẫn chặn độc lập.** Trả lời trực tiếp câu hỏi của Sếp: gọi thẳng API với ảnh 5MB → `gopYGui()` `src/index.js:3166` trả **413 "Ảnh quá lớn, thử ảnh khác nhé (tối đa 800KB)"**. Frontend nén chỉ là tiện lợi, không phải hàng rào duy nhất. ✅ AN TOÀN.
7. **Rò rỉ trạng thái giữa 2 lần gửi: ĐÃ XỬ LÝ.** Sau submit thành công có gọi `xoaAnhDinhKem()` (`app.js:3142`), không chỉ `form.reset()`. Góp ý thứ hai **không** dính ảnh của góp ý thứ nhất. ✅ (Ngoại lệ: xem Lỗi #3.)

---

## 3. LỖI PHẢI SỬA

### 🟠 MEDIUM · Lỗi #1 — Dán bị NUỐT IM LẶNG khi clipboard có cả chữ lẫn ảnh

**Vị trí:** `public/assets/js/app.js:3040`

```js
if ((e.clipboardData && e.clipboardData.getData('text/plain') || '').trim()) return;
```

**Mô tả:** Handler bỏ qua toàn bộ sự kiện dán nếu clipboard có bất kỳ chữ nào, kể cả khi trong clipboard **cũng có ảnh**.

**Vì sao sai:** Rất nhiều nguồn copy đặt CẢ HAI vào clipboard cùng lúc — copy ảnh từ trang web (kèm URL), copy ô có ảnh trong Excel/Word, một số công cụ chụp màn hình (ShareX, Snagit) đặt kèm đường dẫn tệp. Khi đó người dùng bấm Ctrl+V và **không có gì xảy ra, không có một dòng báo nào**. Đúng thứ Rule 7 (Users See Work) cấm: hệ thống làm gì đó (từ chối) mà người dùng không thấy. Sếp sẽ kết luận "vẫn không dán được" và gửi lại đúng góp ý cũ.

Tệ hơn: nếu con trỏ đang **không** nằm trong ô chữ nào, đoạn chữ kia cũng chẳng dán vào đâu → người dùng thấy màn hình hoàn toàn bất động.

**Sửa thế nào:** Đảo ngược điều kiện — chỉ nhường sự kiện khi con trỏ đang ở trong ô nhập liệu, chứ không xét theo nội dung clipboard:

```js
const dangGoChu = document.activeElement &&
  /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
const file = timAnhTrongClipboard(e.clipboardData);
if (!file) return;                       // không có ảnh → để trình duyệt lo
const coChu = (e.clipboardData.getData('text/plain') || '').trim();
if (dangGoChu && coChu) return;          // đang gõ mô tả + dán chữ → không cướp
e.preventDefault();
nhanAnh(file);
```

---

### 🟠 MEDIUM · Lỗi #2 — Ảnh CŨ vẫn được gửi kèm dù màn hình đang báo lỗi ảnh mới

**Vị trí:** `public/assets/js/app.js:2992-3020` (hàm `nhanAnh`)

**Mô tả:** Cả ba nhánh thoát lỗi của `nhanAnh()` đều chỉ gọi `baoAnh(..., true)` rồi `return`, **không hề đụng tới biến `anhDinhKem`**:
- `app.js:2993-2996` — thứ vừa dán không phải ảnh;
- `app.js:3003-3007` — nén hết cỡ vẫn quá nặng;
- `app.js:3014-3016` — `catch` khi ảnh hỏng / không giải mã được.

**Kịch bản hỏng:** Người dùng dán ảnh A (thành công) → thấy A quá to/không đúng chỗ, dán tiếp ảnh B nhưng B là file PDF hoặc ảnh hỏng → màn hình báo đỏ *"Cái vừa dán/thả không phải ảnh"* → người dùng nghĩ "chưa có ảnh nào cả", bấm Gửi → **ảnh A vẫn được gửi đi**. Khung xem trước lúc này vẫn hiện A nhưng nằm ngay dưới dòng báo lỗi đỏ, cực dễ đọc nhầm thành "ảnh này bị lỗi".

**Vì sao sai:** Vi phạm nguyên tắc "thấy sao gửi vậy" mà chính comment của Khỉ Đột ở `app.js:2963-2965` tuyên bố. Trạng thái hiển thị và trạng thái thật lệch nhau.

**Sửa thế nào:** Trong cả 3 nhánh lỗi, gọi `xoaAnhDinhKem()` **trước** rồi mới `baoAnh(...)` (vì `xoaAnhDinhKem()` có `baoAnh('')` sẽ xoá mất thông báo nếu gọi ngược thứ tự). Hoặc tách một hàm `loiAnh(chu)` làm cả hai việc.

---

### 🟠 MEDIUM · Lỗi #3 — Khai sai: nút "✕ Đóng" KHÔNG xoá ảnh

**Vị trí:** `public/assets/js/app.js:2950-2954`

```js
function dongMoForm(hien) {
  $('#gy-form-body').hidden = !hien;
  nutMo.textContent = hien ? '✕ Đóng' : '+ Gửi góp ý';
}
nutMo.addEventListener('click', () => dongMoForm($('#gy-form-body').hidden));
```

**Mô tả:** Khỉ Đột khai *"form đóng thì xoá ảnh xem trước"*. Thực tế **chỉ nút "Hủy" (`#gy-nut-huy`, `app.js:2955`) mới gọi `xoaAnhDinhKem()`**. Nút "✕ Đóng" — chính là cái nút to nhất, nằm ngay đầu panel, người dùng bấm nhiều nhất — chỉ ẩn form đi, giữ nguyên cả chữ đã gõ lẫn ảnh đã dán.

**Vì sao phải bắt:** Hai chuyện.
1. **Lời khai sai thì cả bảng test tay còn lại mất độ tin cậy.** Đây là điểm Release Gate phải chặn, không phải chuyện code.
2. Về hành vi thì giữ nguyên ảnh khi đóng form **có thể là đúng** (giữ bản nháp, đồng bộ với việc chữ cũng được giữ). Nhưng nó chưa được quyết định — nó chỉ tình cờ như vậy.

**Sửa thế nào:** Khỉ Đột chọn MỘT trong hai và ghi rõ lý do:
- (a) Giữ nguyên hành vi (bản nháp sống sót khi đóng/mở) → **sửa lại lời khai**, và bổ sung ghi chú vào `ACTIVE-WORK.md` để Sếp biết ảnh sẽ còn đó khi mở lại.
- (b) Xoá sạch khi đóng → `dongMoForm(false)` phải gọi cả `$('#gy-form').reset()` lẫn `xoaAnhDinhKem()`. **Không khuyến nghị** — sẽ làm mất luôn chữ đang gõ dở, vi phạm Rule 12 (Human Cost) nặng hơn.

Hồ Ly nghiêng về (a).

---

### 🟡 LOW · Lỗi #4 — Handler `paste` gắn trên `document` cướp Ctrl+V của Chat nội bộ

**Vị trí:** `public/assets/js/app.js:3038-3049`

**Mô tả:** Điều kiện gác là `if ($('#v-gopy').hidden || $('#gy-form-body').hidden) return;`. Nhưng **Chat nội bộ (`#cnbWidget`, `app.html:552`) là bong bóng nổi, nằm NGOÀI mọi `<section class="view">` và hiển thị chồng lên bất kỳ tab nào.**

**Kịch bản:** Người dùng đang ở tab Góp ý, form góp ý đang mở, mở luôn bong bóng chat để hỏi đồng nghiệp → copy một ảnh → Ctrl+V trong ô `#chat-noidung` → **ảnh chui vào form góp ý** thay vì chat, và nếu người dùng không cuộn xuống thì không biết. Sau đó gửi góp ý kèm một tấm ảnh không định gửi.

Mức độ thấp vì hiện nay Chat nội bộ vốn cũng chưa dán được ảnh, nên không mất chức năng nào. Nhưng đây là bẫy sẽ nổ đúng lúc ai đó thêm dán ảnh cho Chat nội bộ (rất có thể là việc kế tiếp — xem mục 6).

**Sửa thế nào:** Thêm điều kiện loại trừ: `if ($('#cnbPopup') && !$('#cnbPopup').hidden) return;` hoặc tốt hơn — chỉ nhận khi `document.activeElement` nằm trong `#gy-form-body` hoặc là `document.body`:
```js
const oDangDung = document.activeElement;
if (oDangDung && oDangDung !== document.body && !$('#gy-form-body').contains(oDangDung)) return;
```

---

### 🟡 LOW · Lỗi #5 — Cờ `dangXuLyAnh` là boolean, hai lần dán liên tiếp làm nó tắt sớm

**Vị trí:** `public/assets/js/app.js:2969`, `2997`, `3017-3019`

**Mô tả:** `nhanAnh()` là hàm bất đồng bộ. Dán ảnh A rồi dán ngay ảnh B (dưới 1 giây, rất thường gặp khi chụp nhầm rồi chụp lại): hai lần chạy chồng nhau. Lần A xong trước → khối `finally` đặt `dangXuLyAnh = false` **trong khi B vẫn đang nén**. Lúc đó bấm Gửi thì chốt chặn ở `app.js:3122` không hoạt động → gửi đi với ảnh A trong khi người dùng đang chờ B.

Ngoài ra kết quả cuối cùng phụ thuộc vào lần nén nào xong sau, không xác định trước được.

**Sửa thế nào:** Đổi boolean thành bộ đếm (`dangXuLyAnh++` / `dangXuLyAnh--`, chốt chặn kiểm `> 0`), hoặc gắn số thứ tự lượt và bỏ kết quả của lượt cũ:
```js
let luotAnh = 0;
async function nhanAnh(file) {
  const luot = ++luotAnh;
  ...
  if (luot !== luotAnh) return;   // đã có ảnh mới hơn, bỏ kết quả này
```

---

### 🟡 LOW · Lỗi #6 — Viền "đang kéo" kẹt lại khi kéo tệp ra ngoài cửa sổ

**Vị trí:** `public/assets/js/app.js:3060-3062`

```js
thanForm.addEventListener('dragleave', (e) => {
  if (e.target === thanForm) thanForm.classList.remove('dang-keo');
});
```

**Mô tả:** `dragleave` chỉ gỡ class khi mục tiêu là chính `#gy-form-body`. Nếu người dùng kéo tệp qua một ô con (textarea, vùng đính kèm) rồi kéo thẳng ra khỏi cửa sổ trình duyệt, `dragleave` cuối cùng bắn ra từ ô con → class `dang-keo` **kẹt lại vĩnh viễn**, form giữ viền xanh "sẵn sàng nhận thả" trong khi chẳng còn gì để thả. Người dùng bối rối, phải F5.

**Sửa thế nào:** Thêm `window.addEventListener('dragend', …)` và `document.addEventListener('drop', …)` để dọn class, hoặc dùng bộ đếm `dragenter`/`dragleave`.

---

### 🟡 LOW · Lỗi #7 — Chọn lại đúng tệp vừa chọn thì không có gì xảy ra

**Vị trí:** `public/assets/js/app.js:3082-3085`

**Mô tả:** `nhanAnh()` thành công không xoá `oChonFile.value`. Nếu người dùng chọn tệp A, rồi mở hộp thoại chọn lại đúng tệp A (ví dụ sau khi vừa chỉnh sửa tệp đó), sự kiện `change` **không bắn** vì giá trị không đổi → im lặng, không có báo gì. Rule 7.

**Sửa thế nào:** Trong `nhanAnh()` (hoặc cuối handler `change`), đặt `oChonFile.value = ''` sau khi đã đọc xong file.

---

### 🟡 LOW/UX · Lỗi #8 — Bấm vào bất kỳ đâu trong vùng đính kèm đều mở hộp thoại chọn tệp

**Vị trí:** `public/assets/js/app.js:3076-3079` + `style.css:513` (`cursor: pointer`)

**Mô tả:** Trên máy tính, toàn bộ vùng `.gy-anh-dan` — kể cả dòng chữ "Dán ảnh bằng Ctrl+V" — là một nút mở hộp thoại chọn tệp. Trong khi bên trong vùng đó **đã có sẵn nút "Chọn tệp ảnh"** riêng.

**Vì sao đáng nói:** Đây đúng là thứ Sếp Ngọc chê: *"ctrl C, ctrl V cái là được luôn chứ k cần tìm file"*. Người dùng bấm vào vùng đó với ý định "đặt con trỏ vào đây để dán" thì bị đẩy ngay vào hộp thoại duyệt tệp của Windows — đúng cái thao tác họ muốn tránh. Không phải lỗi chức năng, nhưng ngược với ý muốn gốc.

**Sửa thế nào:** Chỉ để cả vùng bấm được trên thiết bị cảm ứng (nơi không có Ctrl+V), máy tính thì để nút "Chọn tệp ảnh" lo:
```js
vungDan.addEventListener('click', (e) => {
  if (e.target === oChonFile) return;
  const caoThapCamUng = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!caoThapCamUng && e.target !== $('#gy-anh-chon')) return;
  oChonFile.click();
});
```

---

## 4. Ghi nhận nhỏ, không chặn merge

| # | Vị trí | Nội dung |
|---|---|---|
| N1 | `app.html:437` | `id="gy-anh-goiy"` không được JS nào tham chiếu — id thừa. |
| N2 | `style.css:566-570` | Comment ghi *"Điện thoại: không có Ctrl+V, chạm vào vùng này để mở thư viện ảnh"* nhưng khối `@media (max-width: 640px)` chỉ đổi `padding` và `max-height`. Comment lạc chỗ, gây hiểu nhầm cho người đọc code sau. |
| N3 | `app.js:3050-3052` | Comment tuyên bố việc bắt kéo–thả trên cả form ngăn được chuyện *"thả trượt ra ngoài thì trình duyệt tự mở ảnh và nuốt mất form"*. Chỉ đúng trong phạm vi `#gy-form-body`. Thả ra vùng khác của trang thì trình duyệt vẫn điều hướng đi mất. Khai quá lời — nên sửa comment, hoặc bắt `dragover`/`drop` ở cấp `window` để chặn hẳn. |
| N4 | `app.html:433` | `accept="image/*"` cho phép cả SVG. SVG được vẽ qua canvas nên vô hại về bảo mật, nhưng SVG không khai `width`/`height` sẽ ra ảnh 300×150 mờ tịt. Nếu muốn sạch: `accept="image/png,image/jpeg,image/webp"`. |
| N5 | `app.js:958-960` (điện thoại) | `file.type = 'image/heic'` (ảnh iPhone) lọt qua bộ lọc `/^image\//` nhưng `<img>` trên Chrome/Android không giải mã được → rơi vào `catch` và báo *"Không đọc được ảnh này"*. Có báo, không im lặng → chấp nhận được, chỉ cần biết trước để đỡ hoảng khi Sếp gặp. |

---

## 5. Bảo mật — trả lời từng câu hỏi

| Câu hỏi | Trả lời |
|---|---|
| Giới hạn 800KB có lách được không? | **Không.** Backend `gopYGui()` (`src/index.js:3162-3167`) tự giải base64 và tự đo, độc lập hoàn toàn với frontend. Gọi thẳng API với ảnh 5MB → 413. |
| Frontend nén có thay thế backend chặn không? | Không, và ở đây **không** thay thế. Hai lớp riêng biệt, đúng chuẩn. ✅ |
| Nhận file không phải ảnh trá hình được không? | **Qua giao diện: không.** Mọi tệp đều bị vẽ lại qua canvas thành JPEG thật; PDF/EXE/HTML không vẽ được → `img.onerror` → báo lỗi. **Gọi thẳng API: CÓ** — xem mục dưới. |
| Data URL có chèn nội dung lạ được không? | Không có đường nào từ giao diện. Chuỗi gửi lên luôn là đầu ra của `canvas.toDataURL()`. |
| Ảnh hiển thị lại có thoát ký tự đúng không? | Có. `app.js:3172` dựng URL bằng `encodeURIComponent(g.id)`, ảnh lấy qua endpoint nhị phân chứ không nhét chuỗi từ DB vào DOM. Không phát sinh XSS. |

### ⚠️ Khoảng trống backend — CÓ TỪ TRƯỚC, ngoài phạm vi nhánh này

Ghi lại để mở phiếu riêng, **không** tính vào FIX_REQUIRED của GY-0001 (Rule 13 — vùng `src/index.js` không thuộc nhánh này):

1. `gopYGui()` (`src/index.js:3162-3168`) **không kiểm tra nội dung có thật sự là ảnh không**. Dòng `String(b.dinh_kem).replace(/^data:[^,]*,/, '')` bóc bỏ tiền tố kiểu tệp rồi vứt đi, chỉ giữ phần base64. Một nhân sự đã đăng nhập có thể gọi thẳng API và nhét bất kỳ khối dữ liệu ≤800KB nào vào cột `dinh_kem`.
2. `gopYAnh()` (`src/index.js:3293`) trả về **cứng** `Content-Type: image/jpeg` cho bất kỳ nội dung nào, **không có** `X-Content-Type-Options: nosniff`, không có `Content-Disposition`.

Rủi ro thực tế THẤP (trình duyệt hiện đại không tự suy diễn `image/*` thành HTML, và endpoint có kiểm quyền). Nhưng đây là ổ chứa dữ liệu tuỳ ý do người dùng nộp, phục vụ lại từ chính tên miền ERP. Đề nghị mở phiếu: kiểm 3 byte đầu (`FF D8 FF` cho JPEG, `89 50 4E 47` cho PNG) khi ghi, và thêm `nosniff` khi đọc. Áp dụng chung cho cả `nsAnhXem()` và ảnh minh chứng khiếu nại.

---

## 6. Rule 5 — Reuse → Extend → Create

**Kết luận: KHÔNG chặn merge, nhưng phải ghi nợ kỹ thuật.**

Khỉ Đột tạo **14 class CSS mới** (`.gy-anh-*`). Đối chiếu `CHANGELOG.md` mục 2026-08-26, chính module Góp ý khi ra đời đã tự hào ghi *"toàn bộ CSS/component dùng lại — 0 class CSS mới"*. Lần này phá lệ đó.

Hồ Ly xác minh và **đồng ý là cần thiết**: ERP hiện **không có** component vùng thả tệp nào để dùng lại. Chỗ gần nhất là lưới ảnh minh chứng khiếu nại (`#knAnhLuoi`, `app.js:5588-5637`) — lưới nhiều ảnh trong hộp thoại, không có dán, không có kéo–thả, cấu trúc khác hẳn. Ép dùng lại sẽ tệ hơn. Khỉ Đột cũng dùng đúng `.btn-phu` / `.btn-nho` chung, không đẻ kiểu nút riêng, và chỉ dựng bằng biến màu/bo góc sẵn có — tất cả 13 biến CSS được dùng đều đã tồn tại trong `:root`. Đây là "Create" hợp lệ.

**Nợ kỹ thuật phải ghi ngay, kẻo lần sau lại làm bản thứ ba:**

Hàm nén ảnh trong repo giờ có **BA** bản gần trùng nhau:

| Hàm | Vị trí | Dùng cho | Cạnh dài | Chất lượng | Tự lọt giới hạn |
|---|---|---|---|---|---|
| `nenAnhVuong()` | `app.js:858` | Ảnh đại diện nhân sự | 200, cắt vuông | 0.8 | không |
| `nenAnhVuaKhung()` | `app.js:895` | Góp ý (nhánh này) | 1600 | 0.8→0.5 | **có** |
| `nenAnh()` | `app.js:5424` | Minh chứng khiếu nại | 1280 | 0.72 | không |

Ba bản này đã lệch nhau **từ trước** nhánh này, nhưng lần này Khỉ Đột thêm vòng lặp "nén cho tới khi lọt giới hạn" **chỉ vào một bản**, làm chúng lệch xa thêm. Khiếu nại vẫn có thể ăn 413 vì không có vòng lặp đó.

Quan trọng hơn: **toàn bộ logic dán/kéo–thả nằm trong closure của `khoiDongGopY()`**, không có cách nào dùng lại. Mà Chat nội bộ (`#chat-form`, `app.html:570-578`) cũng chỉ có nút kẹp giấy trần, cũng chưa dán được ảnh — nghĩa là **đúng yêu cầu này sẽ quay lại lần nữa**.

→ Đề nghị mở phiếu riêng (KHÔNG làm trong nhánh này, tránh phình scope): gộp ba hàm nén thành một `nenAnhChung(file, {canhToiDa, chatLuong, gioiHanByte})`, và tách phần dán/kéo–thả thành helper dùng chung `ganDanAnh(vungDom, khiCoAnh)` với CSS đặt tên chung (`.o-tha-anh`) thay vì gắn cứng tiền tố `gy-`.

---

## 7. Định nghĩa Hoàn thành (DEFINITION-OF-DONE.md) — đối chiếu

| Mục | Kết quả |
|---|---|
| Business owner confirm | ⏳ Chưa — chờ Sếp Ngọc nghiệm thu |
| Permission đúng | ✅ Không thêm hành động nào ngoài quyền; `gopYAnh()` đã kiểm quyền sẵn |
| Data ownership | ✅ Không thêm entity/field |
| Không duplicate Core | ⚠️ Xem mục 6 — chấp nhận có điều kiện, ghi nợ |
| Validation | ⚠️ Có chặn, có báo, nhưng **Lỗi #2** làm trạng thái sai sau khi báo lỗi |
| Empty / Loading / Error | ⚠️ Loading có (`"Đang xử lý ảnh…"`), Error có, nhưng **Lỗi #1 và #7 là hai đường thoát im lặng** |
| UI State Consistency | ✅ Sau khi gửi có `taiLai()`, không cần F5 |
| Mobile | ✅ Media query đúng; ⚠️ chưa test thật trên điện thoại kho |
| Audit | — Không áp dụng |
| Migration safe | ✅ Không có migration |
| Test | ⚠️ Khỉ Đột khai test tay khá đầy đủ nhưng **có một mục khai sai** (Lỗi #3) |
| Human Cost | ✅ Dán một phát xong, không phải mở phần mềm khác nén ảnh |
| Fallback | ✅ Đường "Chọn tệp ảnh" cũ còn nguyên |
| Docs | ❌ **`CHANGELOG.md` chưa cập nhật.** `ACTIVE-WORK.md` đã ghi. |

---

## 8. Vấn đề cần ERP Owner xác nhận (không phải lỗi code)

**Nguyên văn góp ý #1: *"đoạn chat ko tiếp nhận ảnh chụp màn hình"* / *"muốn paste nhanh chụp màn hình như chat trong zalo"*.**

Từ *"đoạn chat"* và so sánh với *"chat trong zalo"* hoàn toàn có thể hiểu là **Chat nội bộ** (`#cnbWidget` — bong bóng chat kiểu Messenger góc phải dưới), chứ không phải form gửi góp ý. Chat nội bộ hiện có nút kẹp giấy chọn tệp nhưng **chưa dán được ảnh**.

Một phiên Hồ Ly khác đã diễn giải trong `SPEC-0002` mục "Ngoài phạm vi" rằng đây là ô gửi góp ý, và Khỉ Đột build theo hướng đó. **Hồ Ly không lật lại quyết định đó** — nhưng ghi nhận đây là điểm rủi ro diễn giải, cần Sếp xác nhận **trước khi merge**, kẻo nghiệm thu xong Sếp vẫn nói "chỗ chat vẫn không dán được".

Nếu Sếp trả lời "ý tôi là cái chat" → nhánh này vẫn giữ (tự nó có giá trị), nhưng phải mở tiếp phiếu cho Chat nội bộ. Đây chính là lý do nên tách helper dùng chung ở mục 6.

**Ghi chú quy trình (nhỏ):** Trong `docs/ACTIVE-WORK.md`, Khỉ Đột ghi thêm cả **ba dòng thuộc vùng của Hồ Ly** (SPEC-0002, SPEC-0003, dòng phân tích). Chỉ nên ghi dòng của chính mình — có một phiên Hồ Ly đang chạy song song, dễ đụng độ khi gộp nhánh. Không nghiêm trọng, nhắc để lần sau.

---

## 9. Kết luận

**FIX_REQUIRED** — trả về KHỈ ĐỘT.

Phải sửa trước khi review lại: **Lỗi #1, #2, #3** (bắt buộc) và **#4, #5, #6, #7, #8** (nên sửa luôn, đều là sửa vài dòng), cộng thêm cập nhật `CHANGELOG.md`.

Không được làm trong nhánh này (mở phiếu riêng): gộp ba hàm nén ảnh, tách helper dán/thả dùng chung, vá hai khoảng trống backend ở mục 5.

Sau khi Khỉ Đột sửa xong → `READY_FOR_REVIEW` lượt 2. Vòng tự sửa hiện tại: **1/3** (MAX_AUTO_FIX_LOOPS = 3).

**Không merge, không deploy** cho tới khi Sếp Ngọc trả lời câu hỏi ở mục 8.
