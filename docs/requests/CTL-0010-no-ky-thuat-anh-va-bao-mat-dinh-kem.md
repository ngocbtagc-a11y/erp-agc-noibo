# CTL-0010 — Nợ kỹ thuật: 3 hàm nén ảnh trùng + 2 lỗ bảo mật đính kèm

- **Nguồn**: Hồ Ly phát hiện khi review GY-0001 ([REV-0002](../reviews/REV-0002-gy-0001-dan-anh-gop-y.md))
- **Ngày ghi**: 2026-08-27
- **Category**: `TECHNICAL_DEBT` + `SECURITY`
- **Status**: `READY_QUEUE`
- **Current Owner**: GẠO → **Next Owner**: chưa giao

> Ghi lại để **không bị bỏ quên**. Đây là việc NGOÀI phạm vi GY-0001 —
> cấm nhét vào nhánh `feature/gopy-paste-anh`.

## A. Ba hàm nén ảnh gần trùng nhau · P3

Repo hiện có `nenAnhVuong()` · `nenAnhVuaKhung()` · `nenAnh()` — logic gần giống,
nhánh GY-0001 làm chúng **lệch xa thêm**. Vi phạm Hiến pháp Rule 5 (Reuse).

Kèm theo: logic dán/kéo-thả ảnh của GY-0001 bị khoá trong closure của
`khoiDongGopY()`, **không dùng lại được** cho Chat nội bộ hay chỗ khác.

Việc cần làm: gộp về một hàm nén dùng chung + tách logic dán/thả thành tiện ích
dùng lại được. **Đây là `CORE_CHANGE`** — đụng nhiều màn hình đang chạy thật,
phải Sếp duyệt trước theo [CORE-CHANGE-POLICY.md](../CORE-CHANGE-POLICY.md).

**Làm SAU khi** GY-0001 và CTL-0008 merge xong — cả ba đụng `public/assets/js/app.js`
(Rule 13).

## B. Hai lỗ bảo mật ở đường đính kèm · P2

Cả hai **có từ trước**, không phải do GY-0001 sinh ra. Rủi ro thấp nhưng thật.

| # | Chỗ | Vấn đề |
|---|---|---|
| B1 | `gopYGui()` — `src/index.js` | Không kiểm **magic bytes**. Chỉ tin phần khai báo kiểu trong data URL → file không phải ảnh vẫn lọt vào DB nếu gọi thẳng API |
| B2 | `gopYAnh()` — `src/index.js` | Trả cứng `Content-Type: image/jpeg`, **không có** `X-Content-Type-Options: nosniff` → trình duyệt có thể tự đoán lại kiểu nội dung |

Ghi nhận: **giao diện an toàn** — mọi ảnh đều qua canvas nên không dán được file
trá hình qua đường bình thường. Và **backend vẫn chặn 800KB độc lập** — gọi thẳng
API với ảnh 5MB vẫn ăn 413. Đây chỉ là bịt nốt đường vòng.

Việc này đụng `src/index.js` (backend), **không** đụng `app.js` → có thể làm
song song với A, không xung đột.

## C. Chat nội bộ chưa dán được ảnh · chờ Sếp xác nhận

Góp ý gốc của Sếp viết *"đoạn chat ko tiếp nhận ảnh chụp màn hình"*. Sau đó Sếp
gửi ảnh chụp chỉ vào **ô gửi góp ý** — GY-0001 đã làm đúng chỗ đó.

Nhưng ERP còn một chỗ nữa: **bong bóng Chat nội bộ** ở góc màn hình — chỗ này
vẫn **chưa** dán ảnh được.

Chờ Sếp xác nhận có muốn làm luôn không. Nếu có → tách thành yêu cầu riêng,
và nên làm **sau** mục A (để dùng lại tiện ích dán/thả thay vì chép code lần hai).

Liên quan: lỗi #4 trong REV-0002 — listener dán của form góp ý gắn trên
`document`, mà Chat nội bộ là bong bóng nổi ngoài mọi màn hình → **Ctrl+V trong
ô chat đang bị form góp ý cướp mất**. Lỗi này Khỉ Đột phải sửa ngay trong
GY-0001, không đợi.
