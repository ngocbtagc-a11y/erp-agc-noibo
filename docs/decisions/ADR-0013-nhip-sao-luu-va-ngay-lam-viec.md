# ADR-0013 — Nhịp sao lưu dữ liệu và ngày làm việc trong tuần

- **Ngày**: 2026-08-27
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc (ngày làm việc) + GẠO (nhịp sao lưu)
- **Trạng thái**: ĐÃ QUYẾT
- **Liên quan**: [SPEC-0005](../specs/SPEC-0005-kho-tai-lieu-va-sao-luu.md) ·
  [SPEC-0003](../specs/SPEC-0003-runner-vong-lap.md) · [ADR-0007](ADR-0007-gao-quyet-4-cau-runner-va-nhac-viec.md) M1

---

## A. Ngày làm việc: **thứ 7 VẪN LÀM**

Sếp xác nhận. Chỉ **Chủ nhật** là ngày nghỉ.

Áp vào:
- **Runner** (SPEC-0003): chạy 18h–8h các ngày trong tuần **và cả ngày Chủ nhật**.
  Thứ 7 tính là ngày làm việc → giờ hành chính thứ 7 hạn mức thuộc về người thật.
  Sửa mặc định `NGAY_NGHI_TRONG_TUAN` = chỉ Chủ nhật.
- **Nhắc việc** (SPEC-0004): không nhắc ngoài 8h–18h và **không nhắc Chủ nhật**.
  Thứ 7 nhắc bình thường.

## B. Nhịp sao lưu — Sếp hỏi "1 tháng 1 lần có được không?"

### Trả lời: **KHÔNG đủ an toàn.** Làm cả hai nhịp.

| Nhịp | Ai giữ | Giữ bao lâu | Mục đích |
|---|---|---|---|
| **Hằng ngày** | Máy tự chạy, để trên Drive công ty | 30 ngày gần nhất | Cứu khi hỏng dữ liệu |
| **Hằng tháng** | **Đưa tận tay Sếp** | Sếp tự cất, vĩnh viễn | Bản của riêng Sếp, độc lập mọi công cụ |

### Vì sao 1 tháng/lần là nguy hiểm

Sao lưu tháng nghĩa là: hỏng vào **ngày 29** thì mất **29 ngày dữ liệu**.

Không phải thứ gì mất cũng như nhau:

| Dữ liệu | Mất 29 ngày thì sao |
|---|---|
| Đơn hàng Shopee/TikTok | **Lấy lại được** — sàn là nguồn thật, máy tự kéo về |
| **Xuất nhập kho** (`giao_dich_kho`) | **KHÔNG lấy lại được.** Sổ cái từng lần nhập/xuất. Mất là **tồn kho sai và không dựng lại nổi** |
| **Chấm công / phân ca** | **KHÔNG lấy lại được.** Không ai nhớ 29 ngày trước ai làm ca nào. **Rơi đúng kỳ lương là không tính được lương** |
| Công việc · mục tiêu · góp ý | Mất, phải nhập lại tay |
| Hồ sơ nhân sự | Mất phần thay đổi trong tháng, nhập lại được |

Công ty bán **thực phẩm nhập khẩu** — tồn kho sai là mất tiền thật, và hàng có
hạn sử dụng. Chấm công sai là không trả lương đúng cho 12 người fulltime +
17 parttime ở kho.

### Vì sao hằng ngày KHÔNG tốn thêm gì

Đây là chỗ quyết định. Sếp hỏi vì sợ phức tạp và tốn kém — **nhưng không tốn**:

1. **Cùng một đoạn code.** Chạy ngày hay tháng chỉ khác một dòng cấu hình.
2. **Lịch chạy nền đã có sẵn**, đang chạy mỗi 5 phút cho việc khác. Không dựng thêm.
3. **Dung lượng không đáng kể**: một bản ngày ~22 MB. Giữ 30 ngày = **660 MB**.
   Drive còn khoảng 12 GB. Không nhích được bao nhiêu.
4. **Chi phí tiền: 0.**

→ Không có lý do nào để chọn tháng thay vì ngày. **Nhịp tháng chỉ đúng ở chỗ
Sếp thật sự cần: một bản Sếp tự giữ.**

### Bản hằng tháng đưa tận tay Sếp

Đây là ý hay của Sếp, và nó có giá trị mà bản hằng ngày **không thay thế được**:
bản hằng ngày nằm trên Drive công ty — mất tài khoản Google là mất luôn cả kho
lẫn bản sao lưu.

Bản Sếp tự giữ nằm ngoài mọi công cụ. Đúng tinh thần *"đổi công cụ là dùng được ngay"*.

**Yêu cầu cho bản tháng:**
- Ngày **mùng 1** hằng tháng, tự tạo.
- Một file nén duy nhất, tên rõ ràng: `sao-luu-AGC-2026-08.zip`.
- Bên trong: các file **CSV mở bằng Excel được**, có BOM để không lỗi tiếng Việt.
- Kèm **`DOC-CACH-DOC.txt`** viết tiếng Việt đời thường: file nào là gì, mở thế nào.
- Báo Sếp qua **Telegram** kèm đường dẫn tải + dung lượng.
- Sếp tải về, cất vào chỗ Sếp giữ. **Không** phụ thuộc ERP, Google, hay Claude.

## C. Ràng buộc giữ nguyên

- **Loại khoá Shopee/TikTok ra khỏi mọi bản sao lưu.**
- **Bản sao lưu chưa từng thử phục hồi = không phải bản sao lưu.** Giữ nguyên
  kiểm tra 3 lớp trong SPEC-0005, gồm ca **cố ý xoá một file CSV — nó PHẢI báo hỏng**.
- **Báo động 2 lớp**: lỗi khi chạy + kiểm mỗi ngày "hôm qua có bản không".
  Lớp một im lặng khi hệ thống chết hẳn (BH-21).
- Chi phí **0**. Chạm tiền là dừng, hỏi Sếp.
