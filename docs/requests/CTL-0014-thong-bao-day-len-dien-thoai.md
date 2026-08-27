# CTL-0014 — Thông báo đẩy thẳng lên điện thoại (chat + nhắc việc)

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `NEW_FEATURE` + vá `AUTOMATION_GAP #5`
- **Priority**: **P2** — nhưng nó **chặn giá trị thật của SPEC-0004**
- **Risk**: MEDIUM
- **Status**: `READY_QUEUE` — cả hai Agent đang kín việc
- **Current Owner**: GẠO → **Next Owner**: HỒ LY

---

## 1. Yêu cầu gốc

> *"chỗ này, hãy tích hợp thông báo cả trên điện thoại nhé"*

Sếp gửi kèm ảnh **bong bóng Chat nội bộ** (chat riêng với Phạm Thị Lan).
Có tin nhắn mới thì điện thoại phải **kêu**, không phải mở ERP ra mới thấy.

## 2. Việc này lớn hơn cái Sếp nêu

Hồ Ly đã phát hiện và ghi thành `AUTOMATION_GAP #5` khi viết SPEC-0004:

> `public/sw.js` **không có handler `push`** → chuông chỉ hiện khi **đang mở
> ERP**. Người cả tuần không mở ERP — **đúng nhóm hay quên việc nhất** — vẫn
> không nhận được gì.

Nghĩa là chuyện này **không chỉ là chat**. Nó chặn luôn giá trị của toàn bộ
hệ nhắc việc đang xây:

| Thứ đang xây | Không có đẩy điện thoại thì |
|---|---|
| Nhắc việc quá hạn (SPEC-0004) | Chỉ ai chủ động mở ERP mới biết. **Người hay quên chính là người không mở** |
| Nhắc việc chờ duyệt quá 2 ngày | Quản lý không mở thì việc vẫn nằm chết |
| Nhắc giấy tờ sắp hết hạn (SPEC-0005) | Giấy phép ATTP hết hạn mà không ai biết → **sàn khoá gian hàng** |
| Chat nội bộ | Nhắn xong không ai thấy, quay lại dùng Zalo |
| Góp ý được duyệt / cần sửa | Người gửi không biết việc của mình tới đâu |

**Xây xong hệ nhắc việc mà thông báo không tới điện thoại thì gần như xây không.**

## 3. Hướng Gạo chốt: Web Push — miễn phí, không app mới

**Web Push** đẩy thông báo thẳng vào điện thoại từ chính ERP (đã là PWA, nhân
viên đã cài). Không cần cài thêm app nào.

**Chi phí 0**: khoá VAPID tự sinh, miễn phí. Dịch vụ đẩy là của chính hãng
trình duyệt (Google/Apple/Mozilla), miễn phí. Lưu đăng ký trong D1 sẵn có.
**Không thuê dịch vụ ngoài.**

**Vì sao không dùng Telegram cho việc này:** `guiTelegram()` hiện bắn vào **một
nhóm chung cố định** — không nhắn riêng từng người được. Muốn nhắn riêng thì
mỗi nhân viên phải cài Telegram và tự bấm kết nối bot. Với nhân viên kho, đó là
rào cản thật. Telegram **giữ nguyên vai trò kênh báo cho vận hành và cho Sếp**,
không thay thế Web Push.

## 4. Hồ Ly phải xác minh — DẪN NGUỒN, KHÔNG ĐOÁN (BH-03)

1. **Cloudflare Worker có tự gửi Web Push được không?** Cần ký JWT bằng khoá
   VAPID và mã hoá nội dung (`aes128gcm`). WebCrypto của Worker có đủ hàm không,
   hay phải kèm thư viện? Nếu phải kèm thì thư viện nào chạy được trên Worker?
2. **iPhone** — Web Push chỉ chạy khi PWA **đã được thêm vào màn hình chính**
   (iOS 16.4 trở lên). Bao nhiêu nhân viên đang dùng iPhone? **Nếu không cài thì
   không nhận được gì** — phải nói thẳng, không được lờ đi.
3. **Android/Chrome** — có ràng buộc gì không?
4. **Hạn mức**: gửi push có tốn lượt Worker không? Tính con số cho 20 người ×
   số thông báo/ngày. Đối chiếu 100.000 lượt/ngày miễn phí.
5. Có **cách miễn phí nào khác** không? Liệt kê hết rồi mới chọn (BH-12).

## 5. Hồ Ly phải trả lời

1. **Xin quyền lúc nào?** Hỏi ngay khi đăng nhập là bị từ chối nhiều nhất. Nên
   hỏi lúc người dùng vừa làm việc gì đó có ích — và **giải thích trước khi hỏi**.
2. **Ai từ chối rồi thì sao?** Không nhận được gì mà không biết. Có hiện dấu
   hiệu nào trong ERP không? Có cho bật lại không?
3. **Nội dung thông báo lộ gì?** Tin nhắn hiện trên màn hình khoá — người khác
   cầm điện thoại là đọc được. Chat về lương, về kỷ luật thì sao? Có nên chỉ
   hiện *"Có tin nhắn mới từ chị Lan"* thay vì nội dung?
4. **Chống làm phiền** (Rule 12): tái dùng **nguyên** bộ 7 chốt chặn đã thiết kế
   ở SPEC-0004 — gộp một người một tin một ngày, im lặng khi không có gì bất
   thường, không gửi ngoài 8h–18h và Chủ nhật *(thứ 7 vẫn làm — ADR-0013)*.
   **Không** dựng bộ luật chống làm phiền thứ hai.
5. **Bấm vào thông báo thì đi đâu?** Phải mở đúng đoạn chat / đúng việc, không
   phải mở trang chủ rồi bắt tự tìm.
6. **Đổi điện thoại, đăng xuất, xoá app** — đăng ký cũ thành rác. Dọn thế nào?
7. **Đợt 1 làm gì để dùng được ngay?** Đề xuất: **chat riêng trước** (đúng chỗ
   Sếp chỉ), rồi mới tới nhắc việc. Ship → Use → Measure (Rule 15).

## 6. Ràng buộc

- **Chi phí 0.** Không thuê dịch vụ đẩy thông báo bên ngoài.
- Tái dùng `thong_bao`, `guiThongBao()`, `sw.js`, cron sẵn có.
- **Không** dựng cơ chế chống làm phiền thứ hai — dùng của SPEC-0004.
- Không hardcode khoá VAPID vào file. Vào secrets.
- Không đụng vùng đang có người sửa: `src/index.js:392`, `khoiDongGopY()`,
  popover Trạng thái hiện diện (Rule 13).

## 7. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Chat nội bộ phải kêu trên điện thoại |
| `NEW` | `READY_QUEUE` | GẠO | 2026-08-27 | Mở rộng phạm vi: đây chính là `AUTOMATION_GAP #5` Hồ Ly đã ghi — nó chặn giá trị của cả SPEC-0004 và phần nhắc hạn giấy tờ của SPEC-0005, không riêng chat. Chốt hướng **Web Push**, chi phí 0, không app mới |
