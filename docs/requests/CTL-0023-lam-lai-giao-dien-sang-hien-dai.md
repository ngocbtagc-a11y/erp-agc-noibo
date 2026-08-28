# CTL-0023 — Làm lại giao diện: nền sáng, hiện đại, giữ xanh lá + cam thương hiệu

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-28
- **Category**: `UX_IMPROVEMENT` — **`CORE_CHANGE`** *(đụng mọi màn hình)*
- **Priority**: **P2**
- **Risk**: MEDIUM *(chỉ đổi hình thức, không đổi dữ liệu — nhưng đụng toàn bộ)*
- **Status**: `READY_QUEUE` · **Next Owner**: HỒ LY
- **Sếp đã duyệt `CORE_CHANGE`** bằng chính yêu cầu này

---

## 1. Yêu cầu gốc

> *"xem giao diện và layout của web này, xây dựng như thế cho tao đi, cho hiện
> đại và dễ nhìn chứ giao diện chúng mày làm **xấu và ngu quá** — màu thì vẫn là
> màu **xanh lá, cam thương hiệu**, nhưng **nền thì sáng sủa** như này"*

Mẫu tham chiếu: `https://baikosi.netlify.app/`

## 2. GẠO ĐÃ ĐO — vấn đề nằm gần như trọn trong 5 dòng

Đọc thẳng biến CSS của cả hai bên.

| | ERP hiện tại | Trang mẫu |
|---|---|---|
| **Nền** | `#ded9d3` — **xám nâu đục** | `#FFF8F1` — **kem ấm, sáng** |
| **Mặt thẻ** | `#f2f1ee` — trắng ngà xỉn | `#FFFFFF` — **trắng thật** |
| **Đường kẻ** | `#dcdad4` — xám lạnh | `#F0E4D8` — kem ấm |
| **Chữ đậm** | `#3f4d33` — xanh ô liu tối | `#1A1714` — **gần đen, ấm** |
| **Cam** | **KHÔNG CÓ** | `#FF7A18` |

**Kết luận: cái làm ERP trông "xấu và đục" chủ yếu là MỘT giá trị — nền `#ded9d3`.**

Nền xám nâu đục + thẻ trắng ngà `#f2f1ee` → **hai lớp gần bằng nhau về độ sáng**
→ thẻ **không nổi lên khỏi nền**, cả màn phẳng lì và tối.

Trang mẫu: nền kem sáng + thẻ **trắng thật** → tương phản rõ, thẻ nổi hẳn lên,
nhìn sạch và hiện đại.

**Và ERP hiện KHÔNG có màu cam nào** — Sếp nói thương hiệu là **xanh lá + cam**,
tức là đang thiếu hẳn một nửa bộ nhận diện.

## 3. Cách làm — ĐỔI TOKEN TRƯỚC, đừng viết lại CSS

⚠️ **Đây là phần quan trọng nhất của bản giao việc này.**

`style.css` có hơn 2.000 dòng đang chạy đúng trên mọi màn. **Viết lại là chắc
chắn vỡ layout ở đâu đó**, và vỡ ở màn Sếp ít mở nhất thì **không ai phát hiện**.

**Làm ba đợt, đo sau mỗi đợt:**

**Đợt 1 — chỉ đổi ~10 giá trị trong `:root`.** Không đụng một selector nào.
Đổi nền, mặt thẻ, đường kẻ, màu chữ, thêm bộ cam. **80% cảm giác "sáng và hiện
đại" đến từ đây**, với gần như 0 rủi ro vỡ layout.
→ **Đẩy lên, để Sếp nhìn thật, rồi mới quyết có làm tiếp không.**

**Đợt 2** — bo góc, đổ bóng, khoảng cách, cỡ chữ. Vẫn chỉ sửa token.

**Đợt 3** — chỉ những thành phần cụ thể Sếp còn chê sau khi nhìn Đợt 1–2.
**Có thể không cần làm.**

## 4. Bộ màu — Hồ Ly chốt, có ràng buộc

**Bắt buộc giữ**: xanh lá + cam là **màu thương hiệu**.

⚠️ **Lấy màu thật từ logo công ty**, đừng bịa: xem `scripts/lam-logo.mjs`,
`scripts/tao-logo.ps1`, và file logo trong `public/`. Nếu logo có mã màu khác
`--sage: #9aab86` đang dùng thì **logo là chuẩn**.

Hướng đề xuất *(Hồ Ly phản biện, đừng nhận bừa)*:

| Vai trò | Hiện tại | Đề xuất |
|---|---|---|
| Nền | `#ded9d3` | **`#FBF8F3`** — kem sáng, trung tính giữa xanh và cam |
| Mặt thẻ | `#f2f1ee` | **`#FFFFFF`** — trắng thật, để thẻ nổi khỏi nền |
| Đường kẻ | `#dcdad4` | **`#EDE7DD`** — ấm, nhạt hơn |
| Chữ chính | `#3f4d33` | **`#1F1D1A`** — gần đen ấm, dễ đọc hơn nhiều |
| Chữ phụ | `#8a8a81` | **`#857D74`** |
| **Xanh lá** | `#9aab86` *(xỉn)* | **lấy từ logo**, tăng độ tươi |
| **Cam** | *(không có)* | **thêm bộ 3**: đậm · thường · nhạt |

**Cam dùng vào đâu — phải nói rõ, đừng rắc bừa:**
nút hành động chính · số liệu cần chú ý · nhãn "đang chờ bạn". **Không** dùng cam
cho cảnh báo lỗi *(đã có màu đỏ riêng)*.

**Giữ nguyên**: `--warn` · `--danger` · `--ok` — đó là **màu mang nghĩa**, đổi là
người dùng đọc sai trạng thái.

## 5. Ràng buộc

- Chi phí **0**. Chữ dùng `Be Vietnam Pro` **đã có sẵn** — hợp tiếng Việt hơn
  `Inter` của trang mẫu *(Inter thiếu dấu tiếng Việt đẹp)*. **Không đổi phông.**
- **Đợt 1 chỉ được sửa khối `:root`.** Sửa selector nào khác là ngoài phạm vi.
- **Kiểm tương phản chữ/nền** — nhân viên kho đọc điện thoại ngoài sáng, dưới
  đèn kho. Nền sáng mà chữ nhạt là **không đọc được**, đẹp mà vô dụng.
- Kiểm **mọi màn** sau khi đổi token — đặc biệt chỗ đang dựa vào nền tối:
  Sidebar · thẻ trạng thái · bảng có sọc xen kẽ · popover · modal.
- **Tem tài sản 60×40mm** in ra giấy — đổi màu **không được** làm tem in mờ hoặc
  tốn mực. Kiểm lại `@media print` *(đã suýt hỏng một lần — ADR-0008)*.
- Không đụng vùng người khác đang sửa (Rule 13).

## 6. Kiểm chứng

- **Ảnh trước/sau** ít nhất 5 màn: Trang chủ · Nhân sự · Trạm Mục Tiêu · Góp ý ·
  Kho vận. Cả **máy tính và điện thoại 375px**.
- **Đo tương phản** chữ trên nền mới — nêu con số, không nói "nhìn ổn".
- **In thử tem tài sản** sau khi đổi màu.
- **Ca đối chứng (BH-16)**: cố ý đặt một màu chữ quá nhạt → phép đo tương phản
  **phải bắt được**. Không bắt được thì phép đo hỏng.

## 7. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-28 | Giao diện xấu, muốn sáng và hiện đại như baikosi.netlify.app, giữ xanh lá + cam |
| `NEW` | `READY_QUEUE` | GẠO | 2026-08-28 | Đọc biến CSS cả hai bên: **thủ phạm chính là nền `#ded9d3` xám đục** — gần bằng độ sáng của thẻ `#f2f1ee` nên thẻ không nổi lên, cả màn phẳng và tối. Và ERP **thiếu hẳn màu cam** dù thương hiệu là xanh + cam. Chốt cách làm: **đổi ~10 token trước, không viết lại CSS** — 80% hiệu quả, gần 0 rủi ro vỡ layout |
