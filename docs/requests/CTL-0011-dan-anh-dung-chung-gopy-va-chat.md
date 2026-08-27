# CTL-0011 — Dán ảnh dùng chung: sửa lỗi GY-0001 + mở cho Chat nội bộ

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `FIX_REQUIRED` (GY-0001) + `NEW_FEATURE` (Chat) + `TECHNICAL_DEBT`
- **Priority**: **P2**
- **Risk**: **MEDIUM–HIGH** — tách hàm dùng chung = `CORE_CHANGE`
- **Status**: `READY_FOR_BUILD`
- **Current Owner**: KHỈ ĐỘT (làm ngay sau khi xong CTL-0008)
- **Fix loop**: 1/3 (đếm cho phần GY-0001)

---

## 1. Sếp quyết

> *"làm luôn đi, sau cái gì mà sau"*

Gạo đề xuất hoãn phần Chat nội bộ để làm sau. **Sếp bác.** Làm luôn trong đợt này.

**Sếp đã đồng thời duyệt `CORE_CHANGE`** — vì làm luôn nghĩa là phải tách hàm
dùng chung, đụng nhiều màn hình. Ghi lại ở đây thay cho `CORE_CHANGE_PROPOSAL`
riêng (Sếp là người duyệt, đã duyệt bằng câu trên).

## 2. Vì sao làm luôn lại ĐÚNG hơn hoãn

Lỗi **#4** trong [REV-0002](../reviews/REV-0002-gy-0001-dan-anh-gop-y.md):
listener `paste` của form góp ý gắn trên `document` và chỉ gác `#v-gopy`.
Chat nội bộ là bong bóng nổi **ngoài mọi màn hình** → **Ctrl+V trong ô chat
đang bị form góp ý cướp mất.**

Lỗi này **không sửa tử tế được nếu chỉ vá riêng form góp ý.** Nó cần một
người trọng tài duy nhất quyết định "cú dán này thuộc về ai" — tức là đúng
cái hàm dùng chung. Vậy làm cả hai một lượt là cách sửa đúng, không phải
gộp việc cho nhanh.

## 3. Phạm vi — ba phần, một nhánh

### Phần A — Sửa 8 lỗi Hồ Ly bắt trong GY-0001

Nguồn: [REV-0002](../reviews/REV-0002-gy-0001-dan-anh-gop-y.md). Sửa đủ cả 8.
Ba lỗi `MEDIUM` bắt buộc phải hết:

| # | Chỗ | Phải thành |
|---|---|---|
| 1 | `app.js:3040` | Clipboard có **cả chữ lẫn ảnh** vẫn phải dán được ảnh. Xét `document.activeElement` thay vì xét nội dung clipboard |
| 2 | `app.js:2992-3020` | Cả 3 nhánh lỗi của `nhanAnh()` phải gọi `xoaAnhDinhKem()` **trước** khi báo lỗi — không để ảnh cũ lén gửi đi |
| 3 | `app.js:2950-2954` | Sửa **lời khai** cho đúng: chỉ nút "Hủy" xoá ảnh, nút "✕ Đóng" giữ nháp. Nếu giữ hành vi này thì nói rõ trong Handoff |
| 5 | `app.js:2969…` | `dangXuLyAnh` boolean → dùng bộ đếm hoặc số thứ tự lượt |
| 6 | `app.js:3060-3062` | `dragleave` không được để viền xanh kẹt vĩnh viễn |
| 7 | `app.js:3082-3085` | Reset `oChonFile.value` sau khi đọc |
| 8 | `app.js:3076-3079` | Bấm vào chữ "Ctrl+V" không nên mở hộp thoại duyệt tệp trên máy tính |
| DoD | — | Cập nhật `docs/CHANGELOG.md` |

### Phần B — Tách thành tiện ích dùng chung

Hiện logic dán/kéo-thả bị khoá trong closure của `khoiDongGopY()`, không dùng
lại được. Tách ra thành một tiện ích nhận **vùng đích** và trả về ảnh đã nén.

Đồng thời gộp **3 hàm nén ảnh gần trùng** — `nenAnhVuong()` · `nenAnhVuaKhung()` ·
`nenAnh()` — về một hàm có tham số (Hiến pháp Rule 5). Nhánh GY-0001 đang làm
chúng lệch xa thêm, sửa bây giờ là rẻ nhất.

**Trọng tài Ctrl+V**: một handler duy nhất, quyết định theo chỗ con trỏ đang
đứng (`document.activeElement`) — chat đang mở và con trỏ trong ô chat thì ảnh
về chat; đang ở form góp ý thì về góp ý. **Không có chuyện cướp của nhau.**

### Phần C — Áp cho Chat nội bộ

Bong bóng Chat nội bộ dán được ảnh y như ô góp ý: Ctrl+V · kéo-thả · chọn tệp ·
xem trước · xoá · tự nén.

**Trước khi code phần này, PHẢI kiểm:**
- Chat nội bộ hiện lưu ảnh thế nào? Có cột/bảng sẵn không, hay chưa hề có
  đường gửi ảnh? Nếu backend chat **chưa nhận ảnh** thì đây là việc backend,
  không chỉ giao diện — báo lại Gạo trước khi làm.
- Giới hạn dung lượng của chat là bao nhiêu? Có thể khác 800KB của góp ý.
- Chat có phải bảng riêng không — nếu cần đổi schema thì **STOP, báo Gạo**.

## 4. Ràng buộc

- Nhánh: tiếp tục chuỗi hiện có. Xong CTL-0008 (`feature/dong-cua-so`) rồi
  tách tiếp từ đó, **không tách từ `main`**.
- **KHÔNG merge vào `main`, KHÔNG push, KHÔNG deploy.**
- Không đổi schema DB khi chưa báo Gạo.
- Backend vẫn phải chặn dung lượng độc lập — nén ở giao diện **không** thay thế
  được chặn ở máy chủ.
- Hai lỗ bảo mật B1/B2 trong [CTL-0010](CTL-0010-no-ky-thuat-anh-va-bao-mat-dinh-kem.md)
  (magic bytes, `nosniff`) **KHÔNG** làm trong nhánh này — đụng `src/index.js`,
  để đợt riêng.
- Sau khi gộp hàm nén: **kiểm hồi quy** mọi chỗ đang dùng 3 hàm cũ — ảnh đại
  diện nhân sự, CCCD, minh chứng khiếu nại. Gộp sai là hỏng nhiều màn hình.

## 5. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `FIX_REQUIRED` | HỒ LY | 2026-08-27 | REV-0002, 8 lỗi, 3 mức MEDIUM |
| `FIX_REQUIRED` | `READY_QUEUE` | GẠO | 2026-08-27 | Xếp sau CTL-0008 — cùng file `app.js` |
| `READY_QUEUE` | `READY_FOR_BUILD` | ERP Owner | 2026-08-27 | Sếp bác việc hoãn phần Chat, duyệt luôn `CORE_CHANGE` |
