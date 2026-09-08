# LUẬT: MỘT GÓP Ý LÀ TRIỆU CHỨNG, KHÔNG PHẢI MỘT CHỖ HỎNG

> **Sếp Ngọc chốt 28/08/2026:** *"cái góp ý ERP, nó là **cá nhân gửi** nhưng hãy
> **cải tiến trên toàn bộ ERP**."*

---

## 1. Vì sao

Người gửi góp ý chỉ nói được về **chỗ họ vừa đụng vào**. Chị Lan Hương dùng vài
tab, nên chị chỉ ra được lỗi ở vài tab. Những tab khác **có thể hỏng y hệt** —
chỉ là **chưa ai đụng tới nên chưa ai kêu**.

**Sửa đúng chỗ được chỉ = ngồi chờ người tiếp theo kêu.** Cùng một lỗi sẽ quay
lại nhiều lần dưới nhiều cái tên khác nhau, mỗi lần tốn một vòng làm việc, và
nhân viên bắt đầu nghĩ *"báo cũng thế thôi"* — mất luôn nguồn góp ý.

## 2. Cách làm — ba bước, bắt buộc

**① Đọc góp ý xong, hỏi: "đây là LOẠI lỗi gì?"**
Không hỏi *"sửa chỗ này thế nào"*. Đặt tên cho **lớp vấn đề**, không đặt tên cho
chỗ hỏng.

| Góp ý thật | Chỗ được chỉ | LỚP vấn đề |
|---|---|---|
| *"Việc cần làm không hiện hết việc public"* | Trạm Mục Tiêu | **Danh sách bị cắt mà không nói là đã cắt** |
| *"Không hiện thông báo khi có tin nhắn"* | Danh bạ | **Có việc cần biết mà hệ thống im lặng** |
| *"Cửa sổ đổi trạng thái xong không đóng"* | một cửa sổ | **Cửa sổ không tự đóng sau khi xong việc** |

**② Đi quét CẢ ERP theo lớp đó.** Nêu **tìm được bao nhiêu chỗ / xử bao nhiêu**.
Không quét thì không được nói là đã xử lý góp ý.

**③ Đặt lưới chống tái phát.** Một phép kiểm tự động bắt được **cả lớp**, để lần
sau ai đó vô tình tạo lại là máy đỏ ngay — **không trông vào trí nhớ ai cả**.

## 3. Bằng chứng luật này đúng — chính lịch sử ERP

- **13 lỗi cửa sổ**: Sếp báo **một** cửa sổ không tự đóng. Quét cả ERP ra **13 chỗ**
  cùng lỗi. Sửa một chỗ thì 12 chỗ kia vẫn chờ người khác kêu.
- **Nút dưới 44px**: chị báo hai nút. Quét ra hàng loạt, và commit trước đó **tự
  khai đã đạt 44px** trong khi đo thật là 28px.
- **Màu trắng tuyền**: bắt được 4 chỗ chỉ vì đi quét theo *lớp*, không theo *chỗ*.

## 4. Ranh giới — đừng biến thành cái cớ để phình việc

- **Quét cả lớp là bắt buộc. Sửa cả lớp thì tuỳ mức.** Chỗ nào **nguy hiểm hoặc
  người dùng gặp hằng ngày** thì sửa ngay; chỗ hiếm thì **ghi vào hàng đợi** —
  nhưng **phải ghi ra**, không được im.
- **Người gửi vẫn phải được trả lời trước.** Sửa cả lớp không được làm chậm việc
  trả lời cho đúng người đã bỏ công báo.
- **Nêu số.** *"Đã quét cả ERP"* mà không có con số thì coi như chưa quét.

## 5. Áp vào quy trình

Trong bản giao việc cho mỗi góp ý, **bắt buộc có mục "LỚP VẤN ĐỀ"** đặt ngay sau
yêu cầu gốc. Báo cáo trả về **bắt buộc có dòng "quét được N chỗ / xử M chỗ"**.
Thiếu hai thứ đó thì Review Gate trả lại.

---

| Ngày | Ai | Việc |
|---|---|---|
| 28/08/2026 | Sếp Ngọc | Chốt luật: góp ý cá nhân → cải tiến toàn ERP |
| 28/08/2026 | GẠO | Viết thành luật, thêm ba bước bắt buộc và ranh giới chống phình việc |
