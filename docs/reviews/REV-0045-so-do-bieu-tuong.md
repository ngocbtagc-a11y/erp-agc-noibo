# REV-0045 — Số đỏ trên biểu tượng ERP (thanh tác vụ, kiểu Zalo)

Nhánh `feature/so-do-bieu-tuong` · commit `9f344ed` (nền `main` `cbea4d9`) · Hồ Ly · 29/08/2026

## KẾT LUẬN: **PASS**

Việc này nhỏ và làm đúng. Lời khai của Khỉ Đột **đúng ở mọi điểm tôi đo lại được**. Không có lỗi chặn phát hành.

## Câu 1 — Đường nhận tin đẩy có bị phá không? **KHÔNG**

`src/day-thong-bao.js` (mã hoá RFC 8291) **không đổi một byte** — diff chỉ chạm 7 tệp, không có tệp đó. Chỉ handler `push` trong `sw.js` đổi. Tôi dựng bàn đo riêng (không dùng bàn của Khỉ Đột), nạp chính `public/sw.js`:

| Ca tôi tự dựng | Kết quả |
|---|---|
| `datSoDoBieuTuong()` **ném lỗi** (mạng chết) | Thông báo **vẫn hiện** "💬 Anh Duy" · `waitUntil` không reject |
| `navigator` **không tồn tại** trong SW | Thông báo vẫn hiện · không ném |
| `datSoDoBieuTuong()` **treo** (fetch không trả) | Thông báo hiện **ngay**, không chờ số đỏ |
| Máy chủ **500** / JSON rác | Không đặt số bừa (`[]` — 0 lệnh phát ra) |
| Nội dung tin | Đúng tên người gửi · thân là câu chung, **không lộ nội dung** · `tag: chat:nsduy` nguyên vẹn |

Lý do an toàn: `showNotification` gọi **trước** trong `Promise.all`, và `datSoDoBieuTuong` bọc `try/catch` toàn thân nên không bao giờ reject. **Số đỏ hỏng thì thôi, tin nhắn không mất.**

## Câu 2 — Hai con số có lệch không? **Không lệch có hại**

`/api/chat/chua-doc` trả `{so_luong}` (`src/index.js:556`) — đúng API huy hiệu ERP đang dùng. `app.js` **0 lần** gọi thẳng `setAppBadge`.

| Ca | Kết quả đo |
|---|---|
| Đọc trên điện thoại, máy tính đóng ERP | Số cũ giữ tới lượt đẩy sau **hoặc** tới khi mở ERP — `hoiChuaDocToanCuc` chạy 6 giây/lần gọi `veBadge()` nên **tự sửa trong 6 giây**. Đúng như khai. |
| Hai tab cùng mở | Cùng một `so_luong` từ máy chủ → cùng một số |
| Mất mạng | `catch` im, đợt sau tự thử lại, không đổi số |
| Hết phiên (401) · máy chủ 500 | `!res.ok` → **không đoán bừa** |
| Tab mở ở trang đăng nhập (không phải `/app.html`) | SW **vẫn gọi** — đúng, lúc đó `app.js` không lo số |

**Hạn mức: xác minh ĐÚNG.** `GOP_GIAY = 60`, `TRAN_NGAY = 12` (`src/day-thong-bao.js:40,45`); chốt trần đếm `khoa LIKE 'chat:%'` mà **mọi** lượt đẩy đều là `chat:${gui}` — không có loại push nào khác. SW chỉ gọi khi **đóng ERP** và **có Badging API** → trần thật **≤ 12 lượt SELECT/người/ngày**, so với 14.400 lượt/ngày của một tab đang mở thì bằng 0. Không đụng hạn mức vừa vá.

## Câu 3 — Hỏng êm thật không? **CÓ**

Tự chạy: `cong-khoi` (1440) **XANH**, `cong-khoi-dienthoai` (375) **XANH**, cả hai `"loi_console": []`, `"ngoai_le": []`, `"canh_bao_so": 0`. Firefox/Safari/chưa cài/hệ điều hành từ chối → `{lam:false}`, 0 `console.error`, 0 promise văng ra. Ca đối chứng ②b (gỡ `p?.catch`) thật sự trượt → phép đo nhạy, không phải đồ trang trí.

## Câu 4 — Dải nhắc cài có làm phiền không? **Không, ở mức chấp nhận được**

Câu chữ **nói đúng cái được lợi**: *"Cài ERP lên máy để thấy số tin mới ngay trên biểu tượng, không phải mở ERP ra xem."* — không phải "cài ứng dụng" chung chung. Đây là điểm làm tốt: 20 nhân sự đọc câu này sẽ hiểu vì sao nên bấm.

**Chiều cao đo ở 1440px: 66px** (nút `.tbd-nut` 44px + đệm 20px + viền 2px), cộng `margin-top: 12px` → chiếm **78px**, một dòng, không xuống dòng. Bấm "Bỏ qua" ghi `localStorage` → tải lại trang không hỏi lại. Điện thoại không hiện.

## Câu 5 — Hồi quy: **sạch**

`do-trangthai-thongbao` **79/0** · `do-nhiptim` **20/0** · `do-chat-noibo` **thoát 0** · `do-so-do` **42/0** (tôi chạy lại, đúng như khai) · bàn đo riêng của tôi **10/0**.

## Bảng lỗi

| # | Mức | Chặn phát hành? | Vấn đề |
|---|---|---|---|
| 1 | Thấp | **Không** | `laDienThoai` dùng `maxTouchPoints > 0` → **laptop Windows màn cảm ứng** bị coi là điện thoại, không bao giờ thấy dải mời. Sai theo hướng an toàn, nhưng đúng người cần lại không được mời. Nên đổi sang `matchMedia('(pointer: coarse)')`. |
| 2 | Thấp | **Không** | Bấm "Cài lên máy" rồi **huỷ** ở hộp thoại trình duyệt → không ghi `localStorage` → tải lại trang dải hiện lại. Đúng chữ spec ("Bỏ qua" mới thôi hẳn), nhưng hơi lì. |
| 3 | Thấp | **Không** | Hai tab, một tab **đang mở cửa sổ chat** + có tin mới → số đỏ dao động 0↔N mỗi 6 giây. Kế thừa trạng thái `dangMo` theo từng tab **đã có từ trước**, không phải lỗi mới của đợt này. |
| 4 | Ghi chú | **Không** | Chú thích ở lượt gọi `veDaiNhacCai()` cuối mô-đun nói *"ca trình duyệt đã bắn `beforeinstallprompt` TRƯỚC khi app.js chạy"* — **không đúng**: listener đăng ký trong chính `app.js` nên không bắt được sự kiện đã bắn trước đó; lượt gọi này luôn ra `{hien:false}`. Vô hại, nhưng chú thích sai làm người sau hiểu nhầm. |

## Bước triển khai

**Không cần migration.** Không đụng D1, không đụng bảng, không đụng biến môi trường. Toàn bộ thay đổi nằm ở `public/` + một dòng script trong `package.json`.

1. Ghép nhánh vào `main` → GitHub Actions đẩy như thường lệ.
2. `sw.js` đổi byte → trình duyệt tự cài SW mới; `install` đã `skipWaiting()` và `activate` đã `clients.claim()` nên **có hiệu lực ngay lượt tải trang sau**, người dùng không phải làm gì.
3. Số đỏ chỉ hiện trên máy đã **cài ERP như ứng dụng** (Chrome/Edge Windows) — dải nhắc cài lo phần đó. Máy chưa cài vẫn chạy như cũ, không lỗi.
