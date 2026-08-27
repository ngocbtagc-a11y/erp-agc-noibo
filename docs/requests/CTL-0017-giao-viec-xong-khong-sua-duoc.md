# CTL-0017 — Giao việc xong không sửa được nội dung

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `BUG` (thiếu chức năng cơ bản) + `PROCESS_IMPROVEMENT`
- **Module**: `cong_viec` — Trạm Mục Tiêu
- **Priority**: **P2** — Sếp là người giao việc nhiều nhất, vướng hằng ngày
- **Risk**: MEDIUM (đụng cam kết đầu ra của MBOs)
- **Status**: `READY_QUEUE` · **Next Owner**: HỒ LY *(cần chốt luật trước khi code)*

---

## 1. Yêu cầu gốc

> *"việc giao xong không sửa được"*

Sếp giao việc *"Bàn giao Con Dấu, Công việc gọi VPP, Bảng lương"* cho Vũ Lan
Hương. Dòng việc chỉ có trạng thái **"Mới giao"** và đúng một nút: **"Huỷ"**.

Muốn sửa một chữ trong đầu ra, thêm một ý, dời hạn chót → **không có đường nào**.
Chỉ còn cách huỷ rồi giao lại từ đầu — mất lịch sử, người nhận nhận hai thông báo.

## 2. Gạo đã soi — đúng là chưa có, không phải ẩn nút

`src/index.js:1933` `cvCapNhat()` chỉ nhận **hai** trường:

```js
const trangThaiMoi = String(b.trang_thai || '').trim();
const ketQua = b.ket_qua != null ? String(b.ket_qua)... : null;
```

Toàn bộ API `cong_viec` chỉ có: `danh-sach` · `tao` · `cap-nhat` *(trạng thái +
kết quả)* · `lich-su` · 2 màn tổng quan.

→ **Không có đường sửa nội dung.** Giao xong là **đóng băng**: tiêu đề, đầu ra,
mô tả, hạn chót, người nhận, người phối hợp — không sửa được cái nào.

## 3. Đây KHÔNG phải "thêm cái nút Sửa"

Sửa nội dung một việc đã giao là **đổi cam kết giữa chừng**. Công ty chạy theo
**MBOs** — `dau_ra` là cam kết đầu ra, không phải ghi chú. Hồ Ly phải chốt luật
trước, đừng cho code ngay.

### Bốn câu phải trả lời

**a) Ai được sửa?**
Người giao — chắc chắn. **Người nhận thì không**, ít nhất là với `dau_ra` và
`han_chot`: cho người nhận tự sửa đầu ra là cho họ tự hạ chuẩn nghiệm thu.
Quản lý trực tiếp của người nhận có được sửa không?

**b) Sửa được tới bước nào?**
Đề xuất khởi điểm — phản biện nếu thấy sai:
- **`moi` (Mới giao)**: sửa tự do, người nhận chưa đụng vào.
- **`dang_lam`**: sửa được **nhưng phải ghi lịch sử + báo người nhận**. Đổi đầu
  ra khi người ta đang làm là đổi luật giữa trận — phải để lại vết.
- **`cho_duyet` trở đi**: **KHÔNG cho sửa** `dau_ra`. Người ta đã nộp kết quả
  theo đầu ra cũ; sửa lúc này là đổi thước đo sau khi đã đo xong.
- **`hoan_thanh` / `huy`**: khoá hẳn.

**c) Ghi vết thế nào?** (Hiến pháp Rule 10 — History Must Survive Change)
Đổi `dau_ra` hoặc `han_chot` **bắt buộc** lưu giá trị cũ + ai sửa + lúc nào.
`cong_viec` hiện **chưa có** bảng lịch sử riêng — nhưng `nhan_su_lich_su` và
`gop_y_lich_su` đã có khuôn sẵn. **Tái dùng khuôn, đừng bịa kiểu mới** (Rule 5).

**d) Báo người nhận.**
Sửa nội dung mà người nhận không biết thì họ làm theo bản cũ — tệ hơn không sửa.
Tái dùng `guiThongBao()` sẵn có. Gộp vào bộ chống làm phiền của SPEC-0004,
**không dựng cơ chế thứ hai**.

### Câu riêng: đổi người nhận

Đổi `nguoi_nhan_id` **không phải sửa nội dung** — đó là **giao việc cho người
khác**. Hồ Ly cân nhắc: cho đổi thẳng, hay bắt huỷ rồi giao mới? Nếu cho đổi thì
lịch sử phải thể hiện rõ người cũ đã từng nhận việc này.

## 4. Ràng buộc

- Chi phí **0**.
- **Giữ nguyên luật chuyển trạng thái** đang chạy tốt ở `src/index.js:1956`.
- **Không** thêm trạng thái mới.
- Tái dùng `guiThongBao()`, khuôn `*_lich_su`, bộ chống làm phiền SPEC-0004.
- Backend phải **enforce thật**, không chỉ ẩn nút ở giao diện — đã có tiền lệ
  test gọi thẳng API bị chặn 403, giữ đúng mức đó.
- Vùng `cong_viec` **đụng nhau với SPEC-0004** (nhắc việc). Hai việc này nên
  **gộp một đợt build** hoặc làm nối tiếp, không song song (Rule 13 · BH-14).

## 5. Vì sao xếp hàng

Hàng đợi đang có **3 việc P1** trước nó: sao lưu dữ liệu · vá 4 lỗ runner ·
cổng duyệt góp ý. Và cả 2 Agent đang bận (trần cứng 2).

Nhưng việc này **nhỏ và Sếp vướng hằng ngày** → chen lên ngay khi một việc P1
bị chặn hoặc chờ Sếp.

## 6. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Giao việc xong không sửa được |
| `NEW` | `READY_QUEUE` | GẠO | 2026-08-27 | Soi code: `cvCapNhat()` chỉ nhận `trang_thai` + `ket_qua`, **không có đường sửa nội dung**. Không phải ẩn nút. Mở rộng: đây là chuyện **đổi cam kết đầu ra giữa chừng** trong hệ MBOs → phải chốt luật ai-sửa-được-đến-bước-nào trước khi code |
