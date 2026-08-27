# CTL-0019 — Tài sản: gộp theo bộ + kiểm kê

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `NEW_FEATURE` + `PROCESS_IMPROVEMENT`
- **Module**: `tai_san` · tab Tài sản
- **Priority**: **P2**
- **Risk**: **MEDIUM–HIGH** — gộp bộ **đổi phân loại kế toán**, không chỉ đổi giao diện
- **Status**: `READY_QUEUE` — xếp sau [CTL-0018](CTL-0018-chuyen-repo-sang-o-D.md) (chuyển ổ)
- **Next Owner**: HỒ LY

---

## 1. Yêu cầu gốc

> *"Xem tab Tài sản, dựa trên việc quản lý tài sản, xây dựng 1 tab tài sản đầy
> đủ, bảo chúng nó làm sao cho chi tiết, tài sản có thể gộp theo bộ ví dụ như bộ
> máy tính và bên trong đó có các tài sản con, nghĩ kỹ và thiết kế tối ưu vào,
> thuận tiện cho việc kiểm kê nữa"*

## 2. GẠO ĐÃ AUDIT — có sẵn nhiều, thiếu đúng 2 thứ

**ĐÃ CÓ — không làm lại (Rule 5):**

| Nhóm | Chi tiết |
|---|---|
| Bảng `tai_san` | `danh_muc_id` · `vi_tri_id` · `tinh_trang` · `hang_sx` · `model` · `serial` · `ngay_mua` · `nha_cung_cap` · `gia_mua` · `het_bao_hanh` · `phong_ban_id` · `anh` · `tao_boi`/`cap_nhat_boi` |
| Danh mục | `tai_san_danh_muc` — có Data Lock |
| **Vị trí có cấu trúc CHA–CON** | `tai_san_vi_tri.vi_tri_cha_id` — **khuôn cha-con đã có sẵn trong repo, tái dùng đúng khuôn này** |
| 11 tuyến API | `danh-sach` · `lich-su` · `chi-tiet` · `tra-cuu` · `them` · `sua` · `cap-phat` · `thu-hoi` · `bao-hong` · `bao-tri-xong` · `thanh-ly` |
| Tem dán | **60×40mm có mã QR**, in một cái hoặc in hàng loạt *(Sếp chốt 23/08)* |
| Lịch sử | `tsLichSu` — truy được vòng đời |

**Nền tảng rất tốt. Thiếu đúng hai thứ:**
1. **Gộp theo bộ** — `tai_san` **chưa có** cha–con *(chỉ vị trí mới có)*
2. **Kiểm kê** — **chưa có gì cả**, không bảng, không API, không màn hình

---

## 3. ⚠️ ĐIỂM QUAN TRỌNG NHẤT: gộp bộ ĐỔI PHÂN LOẠI KẾ TOÁN

Đây không phải chuyện giao diện. Hồ Ly **bắt buộc** tra luật, dẫn nguồn
*(luật thường trực — `TEAM-LEAD-PROTOCOL.md` mục 0c)*.

**Thông tư 45/2013/BTC** *(và các văn bản sửa đổi — tra bản mới nhất còn hiệu lực)*:
tài sản cố định hữu hình phải đủ **3 tiêu chuẩn**, trong đó **nguyên giá từ
30 triệu đồng trở lên**.

Ví dụ đúng trường hợp Sếp nêu:

| | Nguyên giá | Phân loại |
|---|---|---|
| Màn hình | 5 triệu | **Công cụ dụng cụ** — phân bổ ngắn hạn |
| Case | 15 triệu | Công cụ dụng cụ |
| Bàn phím + chuột | 1 triệu | Công cụ dụng cụ |
| **Gộp thành "Bộ máy tính"** | **21 triệu** | vẫn dưới 30tr → **vẫn CCDC** |
| Nhưng bộ máy chủ / máy in công nghiệp | **≥ 30 triệu** | **→ TSCĐ, khấu hao nhiều năm** |

**TT 45 còn có quy định riêng cho hệ thống nhiều bộ phận liên kết**: nếu thiếu
một bộ phận thì cả hệ thống **không hoạt động được** → tính là **MỘT** tài sản
cố định. Đó chính xác là tình huống "bộ máy tính".

→ **Gộp bộ có thể biến nhiều món CCDC thành một TSCĐ**, đổi cách hạch toán,
đổi khấu hao, đổi số liệu thuế.

**Hồ Ly phải:**
1. Tra và dẫn nguồn: TT 45/2013/BTC + văn bản sửa đổi mới nhất
2. Nêu rõ **ngưỡng hiện hành** *(30 triệu là con số cũ — kiểm xem đã đổi chưa)*
3. Thiết kế sao cho ERP **hiện rõ** một bộ đang được xếp loại gì, và **cảnh báo**
   khi gộp làm vượt ngưỡng
4. **Không tự quyết hạch toán** — đó là việc của **chị Phan Thị Hằng (Kế toán
   trưởng)**. ERP chỉ đưa số liệu và cảnh báo, không thay kế toán quyết.

---

## 4. Gộp bộ — bảy câu phải chốt trước khi code

Đừng chỉ thêm một cột `tai_san_cha_id` rồi xong. Phải trả lời:

1. **Cấp phát**: cấp cả bộ, hay cấp từng món? Cấp bộ cho anh A thì con có tự
   theo anh A không?
2. **Thu hồi**: thu bộ thì con theo? Thu riêng một con ra khỏi bộ được không?
3. **Thanh lý**: thanh lý màn hình trong bộ → bộ còn tồn tại không? Nguyên giá
   bộ có bị trừ đi không?
4. **Báo hỏng**: hỏng con chuột thì cả bộ mang trạng thái "hỏng"? *(Không nên —
   nhưng phải nói rõ hiển thị thế nào.)*
5. **Vị trí**: con có vị trí riêng hay bắt buộc theo cha? *(Thực tế: màn hình ở
   bàn A, case dưới gầm bàn A — cùng vị trí. Nhưng bộ máy chủ có thể tách phòng.)*
6. **Tách/gộp về sau**: bộ đã lập rồi có tách được không? Tách thì lịch sử ra sao?
   **Rule 10 — History Must Survive Change.**
7. **Lồng mấy tầng?** Bộ trong bộ có cho không? *(Khuyến nghị: **một tầng**.
   Nhiều tầng làm kiểm kê rối, lợi ích không tương xứng.)*

**Tái dùng khuôn cha–con của `tai_san_vi_tri.vi_tri_cha_id`** — đã có trong repo,
đừng đẻ kiểu thứ hai (Rule 5).

---

## 5. Kiểm kê — đây mới là mục đích chính

Sếp nói *"thuận tiện cho việc kiểm kê"*. Kiểm kê là lúc **cả công ty tốn nửa
ngày**, nên đây là chỗ Human Cost lớn nhất (Rule 12).

**Đã có sẵn vũ khí: tem 60×40mm có mã QR.** Chưa dùng để kiểm kê — đó là lãng phí.

Hồ Ly thiết kế và trả lời:

1. **Quét là chính, gõ là phụ.** Mở màn kiểm kê → quét QR → tự tick. Repo đã
   vendor sẵn `html5-qrcode` *(dùng cho chỗ khác)* — **tái dùng**.
2. **Kiểm theo VỊ TRÍ, không theo danh sách.** Người kiểm đi từng phòng, ERP
   hiện "phòng này phải có 12 món", quét được mấy, còn thiếu gì.
3. **Bốn kết quả phải phân biệt rõ**: khớp · **thiếu** *(có trong sổ, không thấy)*
   · **thừa** *(thấy vật, không có trong sổ)* · **sai vị trí** *(thấy ở phòng khác)*.
   Cái thứ tư hay bị bỏ qua nhất và là cái xảy ra nhiều nhất.
4. **Kiểm bộ thế nào?** Quét tem bộ là xong cả bộ, hay phải quét từng con?
   → Đề xuất: quét bộ = xác nhận bộ, **nhưng vẫn liệt kê con để tick nhanh** —
   vì thực tế mất con chuột chứ ít khi mất cả bộ.
5. **Kiểm dở dang**: đang kiểm nửa chừng hết giờ / mất mạng → lưu tạm được
   không? Kho dùng điện thoại, mạng chập chờn là bình thường.
6. **Biên bản kiểm kê** — kế toán cần văn bản: ai kiểm, ai chứng kiến, ngày nào,
   chênh lệch gì, ai ký. Xuất ra được không?
7. **Sau kiểm kê**: thiếu thì xử lý thế nào? Có trạng thái "**mất**" không?
   Ai được quyền chốt là mất? *(Đây là chuyện tiền — phải có người chịu trách nhiệm.)*
8. **Trên điện thoại một tay.** Người kiểm kê đứng trong kho, tay kia cầm hàng.

---

## 6. Trạng thái tài sản — hiện quá sơ sài

`tinh_trang` hiện mặc định `'tot'`. Cần phân biệt được:
**đang dùng · trong kho · đang sửa · hỏng · chờ thanh lý · đã thanh lý · mất**

Hồ Ly chốt danh sách và **luật chuyển trạng thái** — theo đúng khuôn
`cong_viec` (`src/index.js:1956`), khai rõ `tu:` đi từ đâu và `ai:` được bấm.
**Đừng để lỏng như `gop_y` từng bị** *(nhớ vụ 12 giây từ "đang làm" sang "hoàn thành")*.

## 7. Ràng buộc

- Chi phí **0**.
- **Tái dùng**: khuôn cha–con của `tai_san_vi_tri` · `html5-qrcode` đã vendor ·
  tem QR 60×40 đã có · `tsLichSu` · Data Lock danh mục · `quyen.js`.
- **KHÔNG** đụng `inTemNhieu()` — vừa vá xong, suýt in ra giấy trắng (ADR-0008).
- Migration **lùi được**, không `DROP`, không sửa dữ liệu cũ.
- ERP là PWA — kiểm kê phải dùng được **một tay trên điện thoại**.
- Không đụng vùng người khác đang sửa (Rule 13).

## 8. Chia đợt — đề xuất, Hồ Ly phản biện

1. **Trạng thái tài sản + luật chuyển** — nền cho mọi thứ sau
2. **Gộp bộ** *(một tầng)* + cảnh báo ngưỡng kế toán
3. **Kiểm kê bằng quét QR** — theo vị trí, 4 kết quả
4. Biên bản kiểm kê + xử lý chênh lệch

## 9. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Tab Tài sản đầy đủ, gộp bộ, thuận tiện kiểm kê |
| `NEW` | `READY_QUEUE` | GẠO | 2026-08-27 | Audit: nền tảng đã rất tốt *(11 API, danh mục, vị trí cha-con, tem QR, lịch sử)*. Thiếu đúng 2 thứ: **cha-con trên `tai_san`** và **kiểm kê**. Bổ sung điểm yêu cầu gốc chưa nêu: **gộp bộ đổi phân loại kế toán TSCĐ/CCDC theo TT 45/2013/BTC** — chuyện thuế, không phải chuyện giao diện |
