> **Xem thêm:** `docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md` — một góp ý là triệu chứng,
> phải sửa cả lớp vấn đề chứ không sửa đúng chỗ được chỉ.

# BẢNG MÀU ERP — LUẬT BA MÀU

> **Sếp Ngọc chốt 28/08/2026:** *"dùng tư duy của người làm nghệ thuật để chốt
> nhé, làm sao **không quá 3 màu chính: Nâu, Xanh lá, Cam** là được."*

Đây là **ràng buộc thiết kế**, không phải gợi ý. Mọi thay đổi giao diện đều phải
chứng minh mình không phá luật này.

---

## 1. Ba màu, ba vai KHÁC HẲN NHAU

Cái làm một bảng màu trông rẻ tiền **không phải** số lượng màu — mà là **nhiều
màu cùng đòi được chú ý**. Ba màu này phải ở ba vai khác nhau, không tranh nhau.

| Màu | Vai | Chiếm bao nhiêu màn hình |
|---|---|---|
| **NÂU** *(beige → nâu đậm)* | **Nền và chữ.** Cái sân khấu. | **~80%** |
| **XANH LÁ** | **Nhận diện.** Logo, trạng thái tốt. | **~12%** |
| **CAM** | **Hành động và chú ý.** Nút chính, mục đang chọn, số cần nhìn. | **~8%** |

**Cam ít nhất nhưng nổi nhất.** Đó là lý do nó hiệu quả. Rắc cam khắp nơi là
giết chính nó — không còn chỗ nào nổi nữa.

## 2. Bốn luật nghề

**① Không có màu đen. Không có màu trắng.**
Chữ đậm nhất là **nâu rất đậm**, không phải `#000`. Nền sáng nhất là **kem ấm**,
không phải `#fff`. Đen tuyền và trắng tuyền là thứ làm giao diện trông như bản
nháp. Ám một chút nâu vào là lên "đắt" ngay — **đây là mẹo rẻ nhất và hiệu quả
nhất trong cả tài liệu này.**

**② Tạo chiều sâu bằng ĐẬM–NHẠT, không bằng thêm màu.**
Cần phân tầng thì lấy **nhiều sắc độ của nâu**, đừng đi tìm màu mới. Một màu mười
sắc độ nhìn sang; ba màu mỗi màu một sắc độ nhìn loạn.

**③ Một điểm nhấn cho một khung nhìn.**
Trên một màn hình, **chỉ MỘT thứ** được là cam đậm nhất. Có hai nút cùng cam đậm
thì người dùng không biết bấm cái nào — và mất luôn cảm giác dẫn dắt.

**④ Đường kẻ mảnh thay mảng màu.**
Phân tách bằng nét 1px nâu nhạt, không bằng ô nền xám. Mảng màu để tách khối là
thói quen làm giao diện rẻ tiền.

## 3. Ngoại lệ DUY NHẤT: màu đỏ báo lỗi

**Đỏ được giữ, và chỉ được dùng cho lỗi / nguy hiểm / quá hạn.**

Đây **không phải** quyết định thẩm mỹ mà là **an toàn**: nếu cảnh báo lỗi trông
giống mọi thứ khác thì người ta bỏ qua nó. Kho vận đang dựa vào màu đỏ để bắt đơn
hoàn quá hạn — đổi là **mất tiền thật**, không phải mất đẹp.

Ràng buộc bù lại: **đỏ phải hiếm**. Không dùng đỏ để trang trí, để nhấn mạnh, hay
để "cho nổi". Thấy đỏ = có việc hỏng.

`--warn` *(vàng nâu)* nằm trong họ nâu–cam nên **không tính là màu thứ tư**.
`--ok` là xanh lá, cũng vậy.

## 4. Cách kiểm — không nói "nhìn ổn"

Trước khi đẩy bất kỳ thay đổi giao diện nào:

1. **Đếm sắc màu.** Trích mọi mã màu trong `style.css`, quy về góc sắc. Phải rơi
   vào đúng **3 cụm** *(nâu/cam là hai cụm gần nhau, xanh lá là cụm thứ ba)* +
   **đỏ báo lỗi**. Có cụm thứ tư → **hỏng luật, dừng lại**.
2. **Đo tương phản** mọi cặp chữ–nền. Chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1. Nhân
   viên kho đọc điện thoại **ngoài nắng**.
3. **Đếm điểm nhấn cam** trên một màn — nhiều hơn một chỗ cam đậm là sai luật ③.
4. **Ca đối chứng (BH-16)**: cố ý thêm một màu ngoài họ → phép đếm sắc màu **phải
   bắt được**. Không bắt được thì phép đếm hỏng.

## 5. Nguồn của màu thương hiệu

Xanh lá và cam **đo từ file logo thật** (`public/assets/img/logo.png`), không bịa:
**`#6ca839` lá xanh · `#eb7c17` lá cam**. Logo là chuẩn — mã nào lệch logo thì
logo đúng, mã sai.

Nâu không có trong logo nên **chọn theo nghề**: cùng nhiệt độ ấm với cam, đủ nhạt
để làm nền, đủ đậm để làm chữ.

---

## Lịch sử

| Ngày | Ai | Việc |
|---|---|---|
| 28/08/2026 | Sếp Ngọc | Chốt luật ba màu: Nâu · Xanh lá · Cam |
| 28/08/2026 | GẠO | Viết thành luật, thêm ngoại lệ đỏ báo lỗi và cách kiểm |
