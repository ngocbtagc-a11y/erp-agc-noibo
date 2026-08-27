# ADR-0008 — Sửa 13 lỗi cửa sổ mà không làm hỏng in tem tài sản

- **Ngày**: 2026-08-27
- **Người quyết định**: **GẠO — Team Lead** ([TEAM-LEAD-PROTOCOL.md](../TEAM-LEAD-PROTOCOL.md) mục 0)
- **Trạng thái**: ĐÃ QUYẾT
- **Nguồn**: [REV-0004](../reviews/REV-0004-ctl-0008-dong-cua-so.md) — Hồ Ly soi CTL-0008

---

## Chuyện gì đã xảy ra

Khỉ Đột tìm ra nguyên nhân gốc đúng: `.thd-panel { display: flex }` đè mất luật
mặc định `[hidden] { display: none }` của trình duyệt, nên lệnh đóng chạy mà
không ẩn được gì. **Hồ Ly đo lại độc lập, xác nhận ĐÚNG.**

Khỉ Đột đề xuất kèm theo: thêm một dòng `[hidden] { display: none !important }`
để dập sạch 13 lỗi cùng loại còn lại, và **khẳng định đã quét, không có chỗ nào
bị ảnh hưởng.**

**Khẳng định đó SAI.** Hồ Ly quét lại đầy đủ — đọc `document.styleSheets`, duyệt
đệ quy cả khối `@media`, lọc toàn bộ **130 luật CSS có đặt `display`** — và tìm
ra đúng **một** thủ phạm:

> **`#tsInTemVung` — Tem in tài sản 60×40mm** (Sếp chốt 23/08/2026).
>
> Nó mang `hidden` cố định và **chỉ** hiện ra nhờ `@media print`. Hàm
> `inTemNhieu()` gọi `window.print()` mà **không gỡ `hidden`**. Tức là tem in
> được **chính nhờ cái cơ chế mà CTL-0008 đang gọi là lỗi.**
>
> Thêm dòng `!important` → lúc in đo được `none` thay vì `block` →
> **máy in nhả giấy trắng, hỏng im lặng**, không báo lỗi, không ghi log.
> Kho dễ dán tem trắng lên tài sản rồi mới phát hiện.

## Quyết định

### 1. BÁC Đề xuất A nguyên văn. Làm theo A1.

Thứ tự bắt buộc, **không được đảo**:

1. Sửa `inTemNhieu()` (`app.js:4419-4431`): gỡ `hidden` **trước** `window.print()`,
   đặt lại sau khi in xong.
2. Kiểm in tem chạy đúng.
3. **Xong bước 2 mới** thêm `[hidden] { display: none !important }`.
4. Kiểm lại in tem lần nữa sau khi thêm.

Đảo thứ tự là hỏng in tem trong khoảng thời gian giữa hai bước.

### 2. DUYỆT NGAY Đề xuất B — tách khỏi cổng duyệt của A

Đề xuất B (6 dòng CSS phạm vi hẹp) **không phải `CORE_CHANGE`** — Hồ Ly nói
đúng, gộp nó chung cổng với A là **chặn quá tay**.

Trong khi chờ, ba lỗi mức CAO đang cho 20 người thấy **số sai mỗi ngày**:
- Số đỏ tin chưa đọc ở chuông thông báo (`#tbBadge`) — xem rồi vẫn còn số
- Số đỏ ở chuông chat (`#cnbBadge`) — như trên
- Khung file đính kèm chat — gửi xong vẫn nằm lại, dễ gửi nhầm lần hai

**Làm B trước, ngay trong đợt này.** Không chờ A1.

### 3. Sửa 4 lỗi REV-0004

| Mã | Mức | Việc |
|---|---|---|
| FIX-01 | **CAO** | Sửa `REV-0003` mục 4 Đề xuất A — câu *"không tìm thấy chỗ nào như vậy"* là SAI. Ghi rõ `#tsInTemVung` và thay bằng A1. **Bắt buộc**: đây là tài liệu Sếp đọc để duyệt |
| FIX-02 | THẤP | `app.js:1024-1029` — Esc đang giật con trỏ về Sidebar dù đang gõ chỗ khác. Chỉ trả focus khi `$('#thdWrap').contains(document.activeElement)` |
| FIX-03 | THẤP | `REV-0003` mục 2.3 — số dòng lệch +14 (trộn bản trước/sau sửa). Rẻ, sửa luôn |
| FIX-04 | THẤP | `app.js:983, 992` — `e.stopPropagation()` giờ là code chết nhưng vẫn âm thầm chặn click tới listener `document` khác. Bẫy cho người sau. Sửa luôn |

Gạo quyết làm **cả 4**, không để FIX-03/04 thành "tuỳ chọn" rồi quên.

### 4. Bài học về cách đo — ghi lại để không lặp

Cách đo của Khỉ Đột (nhét trang vào trang đang mở) **có lỗ hổng**: trang đăng
nhập đã nạp sẵn `style.css` đè lên. Hồ Ly dính đúng bẫy đó ở lần đo đầu, phải
làm lại bằng `<iframe srcdoc>` cách ly hoàn toàn.

**Từ nay, đo hành vi CSS phải dựng trong môi trường cách ly.** Kết luận của
Khỉ Đột may mà vẫn đúng, nhưng đúng do may chứ không do phương pháp.

## Vì sao Gạo tự quyết, không đưa Sếp

Không câu nào chạm tiền, dữ liệu thật, hay luật nghiệp vụ. Đây là đánh đổi kỹ
thuật thuần tuý. Sếp lật lại bất cứ lúc nào.

**Ghi nhận**: quyết định **DỪNG LẠI** của Khỉ Đột ở ranh giới `CORE_CHANGE` —
thay vì tự làm cho nhanh — chính là thứ đã cứu bàn thua này. Đúng luật, và
luật đã chứng minh giá trị của nó ngay trong ngày đầu.
