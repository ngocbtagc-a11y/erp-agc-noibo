# CTL-0016 — Mở ảnh đính kèm ra không có chỗ tắt

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `BUG` + `UX_IMPROVEMENT`
- **Priority**: **P3** (khó chịu hằng ngày, không chặn việc)
- **Risk**: LOW
- **Status**: `READY_QUEUE` — chờ slot, cả 2 Agent đang ở `app.js`
- **Next Owner**: KHỈ ĐỘT

---

## 1. Yêu cầu gốc

> *"mở ảnh lên không có chỗ tắt à? ảo thế nhỉ"*

Sếp mở ảnh đính kèm trong Góp ý ERP → ảnh chiếm hết màn hình trên nền đen,
**không có nút tắt nào**. Phải bấm quay lại hoặc đóng tab.

Trớ trêu: ảnh Sếp gửi kèm là **ảnh chụp chính màn Góp ý**, trong đó **có** nút
"✕ Đóng" — nhưng đó là nút nằm trong bức ảnh, bấm không được.

## 2. Gạo đã soi

`public/app.html:496`
```html
<img id="gyCtAnh" style="max-width:100%; border-radius:var(--r-md); margin-top:10px" hidden>
```

`public/assets/js/app.js:3471-3473` — chỉ gán `src`, **không có** trình xem ảnh.

**Không có lightbox nào trong toàn ERP** — grep `lightbox` / `xemAnh` / `phongTo`
đều không ra kết quả.

Nghĩa là ảnh chỉ hiển thị thẳng trong khung chi tiết. Ảnh chụp màn hình thường
rất to → **đẩy nút "✕ Đóng" của khung chi tiết ra ngoài tầm nhìn**, hoặc người
dùng bấm vào ảnh và trình duyệt mở ảnh gốc ở tab/khung riêng — chỗ đó **không có
giao diện gì cả**.

## 3. Việc cần làm

Dựng **một trình xem ảnh dùng chung** cho toàn ERP, tối thiểu:

1. **Nút ✕ rõ ràng**, luôn nhìn thấy — kể cả ảnh rất cao, rất rộng.
2. **Phím Esc** đóng được. *(Cả ERP hiện chỉ có 2 chỗ nhận Esc — xem REV-0003.)*
3. **Bấm ra ngoài** ảnh thì đóng.
4. **Ảnh vừa màn hình**, không tràn. Ảnh nhỏ không bị kéo giãn vỡ nét.
5. **Trên điện thoại**: chạm ra ngoài đóng được, ảnh vừa màn hình dọc.
6. Nếu rẻ thì thêm phóng to / thu nhỏ — **không bắt buộc**, đừng vì nó mà chậm.

## 4. Dùng chung — đừng làm riêng cho Góp ý

Ảnh có ở nhiều chỗ: **góp ý** (`gyCtAnh`) · **chat nội bộ** (`.chat-anh`) ·
**ảnh đại diện nhân sự** · **minh chứng khiếu nại** · **tem tài sản**.

Làm riêng cho góp ý là lát nữa lại phải làm thêm 4 lần (Rule 5).
→ Một hàm dùng chung, gắn được vào mọi thẻ ảnh.

⚠️ Đây là `CORE_CHANGE` (đụng nhiều màn hình) → **Gạo đã duyệt trước**, căn cứ
[ADR-0012](../decisions/ADR-0012-gao-tu-day-len-khi-da-kiem-ky.md) mục 0:
việc dọn dẹp nội bộ, có bằng chứng an toàn từ review thì Gạo tự quyết.
Vẫn phải qua cổng review đầy đủ trước khi lên hệ thống thật.

## 5. Vì sao xếp hàng chứ không làm ngay

Cả hai Agent đang ở `public/assets/js/app.js`:
- vá 3 lỗi hợp đồng (CTL-0015 Đợt 1 vòng 2)
- xây năng lực + mô tả công việc + sinh nhật (Đợt 2–4)

Thêm người thứ ba vào cùng file là **chắc chắn đụng nhau** (BH-14, Rule 13), và
mở 3 Agent cùng lúc là đúng cái đã làm cháy hạn mức phiên sáng nay.

→ Xong một trong hai việc trên thì làm ngay việc này.

## 6. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Mở ảnh đính kèm không có nút tắt |
| `NEW` | `READY_QUEUE` | GẠO | 2026-08-27 | Soi code: **toàn ERP không có trình xem ảnh nào**, `gyCtAnh` chỉ là thẻ `<img>` trần. Mở rộng phạm vi thành **trình xem dùng chung** cho 5 chỗ đang có ảnh, tránh làm lại 4 lần |
