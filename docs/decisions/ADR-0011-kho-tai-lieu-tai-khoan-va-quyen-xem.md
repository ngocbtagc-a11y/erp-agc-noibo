# ADR-0011 — Kho tài liệu: tài khoản lưu trữ và quyền xem giấy tờ nhạy cảm

- **Ngày**: 2026-08-27
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc (2 câu) + GẠO (16 câu)
- **Trạng thái**: ĐÃ DUYỆT
- **Nguồn**: [SPEC-0005](../specs/SPEC-0005-kho-tai-lieu-va-sao-luu.md) ·
  [CTL-0013](../requests/CTL-0013-kho-tai-lieu-va-sao-luu.md)

---

## A. Hai quyết định của ERP Owner

### A1. Kho để trên tài khoản Google công ty đang dùng

`alphagreen.commerce@gmail.com`. Không lập tài khoản mới.

**Hệ quả phải xử lý — Khỉ Đột bắt buộc làm:**

1. **15 GB dùng chung với Gmail và Google Photos.** Hồ Ly ước tính đầy vào năm
   thứ 8–9, xấu nhất năm thứ 3 — nhưng đó là tính trên 12 GB còn trống. Mail và
   ảnh vẫn đang lớn dần.
   → **Phải có cảnh báo khi còn dưới 3 GB**, đừng để đầy rồi mới biết.
2. **Ai vào được mail là vào được toàn bộ giấy tờ công ty.** Đây là rủi ro Sếp
   chấp nhận khi chọn phương án này.
   → **BẮT BUỘC bật xác thực 2 lớp** cho tài khoản này. Không phải tuỳ chọn.
3. Kho tài liệu để trong **một thư mục riêng**, không trộn lẫn với thư mục khác.

### A2. Quyền xem giấy tờ nhạy cảm — chia theo việc

| Loại giấy tờ | Ai xem được |
|---|---|
| Hợp đồng lao động | Hai Sếp · **Vũ Lan Hương** (HCNS) |
| Quyết định lương | Hai Sếp · **Phan Thị Hằng** (Kế toán trưởng). **Hương KHÔNG** |
| CCCD nhân viên | Hai Sếp · HCNS. **Anh Duy KHÔNG** xem của nhân viên kho |
| Giấy tờ của chính mình | **Luôn xem được**, không cần xin ai |

Nguyên tắc: **xem được bản ghi VÀ đủ mức nhạy cảm** — hai điều kiện, không phải
một. Dùng `quyen.js` sẵn có, **không bịa vai trò mới**.

**Không cho xoá hẳn tài liệu** — chỉ ẩn đi, bắt buộc ghi lý do (Rule 10).
Giấy tờ pháp lý xoá nhầm là không lấy lại được.

## B. Quyết định của Gạo

### B1. KHÔNG bật Cloudflare R2

R2 có hạn mức tốt hơn Drive (10 GB, không mất phí lấy dữ liệu ra) **nhưng bắt
buộc gắn thẻ tín dụng** — tài liệu Cloudflare ghi rõ cần "R2 subscription" và
"valid payment method".

Google Drive hết chỗ thì **báo lỗi**, không trừ tiền. R2 hết hạn mức thì **trừ tiền**.

→ Theo luật chi phí 0 của Sếp: **chọn thứ hết thì báo lỗi, không chọn thứ hết
thì trừ tiền.** Đây là bài học BH-20.

Vẫn giữ lớp trừu tượng `src/kho-file.js` để sau muốn thêm R2 chỉ mất ~40 dòng.

### B2–B16

14 quyết định kỹ thuật còn lại giữ nguyên theo đề xuất Hồ Ly trong SPEC-0005
Mục 13. Đáng chú ý:

- **Không dùng Service Account của Google** — không có dung lượng riêng, hỏng
  ngay lần tải đầu. Dùng OAuth refresh token, scope hẹp nhất `drive.file`.
- ⚠️ **Bẫy chết âm thầm**: màn hình OAuth để nguyên chế độ *"Testing"* thì khoá
  **hết hạn sau 7 ngày**. Phải chuyển sang *"In production"*. Đưa vào checklist
  Đợt 1, không được quên.
- **Sao lưu ra CSV có BOM** — thiếu BOM thì Excel hiện `Nguyá»…n` thay vì `Nguyễn`.
- **Loại khoá Shopee/TikTok ra khỏi bản sao lưu.**
- **Kiểm tra phục hồi 3 lớp**, gồm một ca **cố ý xoá một file CSV — nó PHẢI báo
  hỏng**. Bản sao lưu chưa từng thử phục hồi không phải bản sao lưu.
- **Báo động 2 lớp**: lỗi khi chạy + kiểm mỗi ngày "hôm qua có bản không".
  Lớp một im lặng khi hệ thống chết hẳn (BH-21).
- **Ngày hết hạn giấy tờ** tạo bản ghi trong `cong_viec` sẵn có, `han_chot` =
  ngày hết hạn trừ 30 → **SPEC-0004 lo toàn bộ việc nhắc**, không viết cơ chế
  nhắc thứ hai.
- **Đưa tài liệu vào chỉ 3 lần bấm, không gõ chữ nào**: mở camera điện thoại →
  chọn loại giấy tờ (đã lọc theo bản ghi đang mở) → Lưu. Quá 3 bước là không ai
  làm, kho rỗng sau 2 tuần.

## C. Ràng buộc còn nguyên

- **Chi phí 0.** Chạm tiền là dừng, hỏi Sếp.
- File thật để ngoài, ERP chỉ giữ mục lục — để đổi công cụ vẫn dùng được.
- Sao lưu ra định dạng mở, mở bằng Excel, không cần ERP.
- `fileId` của Drive **không bao giờ rời máy chủ**. ERP làm cổng, không có link
  công khai đoán được.
