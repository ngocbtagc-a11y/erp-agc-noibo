# CTL-0020 — Thiết kế lại cột hiển thị cho mọi tab

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `UX_IMPROVEMENT` — áp cho **toàn ERP**
- **Priority**: **P2**
- **Risk**: LOW–MEDIUM *(chỉ đổi hiển thị, không đổi dữ liệu)*
- **Status**: `READY_QUEUE` · **Next Owner**: HỒ LY
- **Nguyên tắc nền**: [ERP-CONSTITUTION.md](../ERP-CONSTITUTION.md) Rule 7 → *Information Design*

---

## 1. Yêu cầu gốc

> *"khi thiết kế layout thì luôn ưu tiên trải nghiệm người dùng thật, các tab
> nên hiển thị được các thông tin cơ bản nhất ví dụ nhân sự thì có tên, chức vụ
> phòng ban, ngày gia nhập; tài sản thì có tên tài sản, ngày mua, trạng thái sử
> dụng.... tự nghiên cứu, thu thập thông tin và tối ưu nhất có thể, suy nghĩ
> thông minh lên"*

## 2. Repo đã có gì — đừng ghi chồng

`docs/LIST_UX_AUDIT.md` **đã** có bảng audit đầy đủ về **cơ chế** danh sách:
tìm kiếm · lọc · sắp xếp · phân trang · trạng thái rỗng, cho 13 màn.

**Nhưng không có một dòng nào về việc HIỂN THỊ CỘT NÀO.** Đó đúng chỗ trống Sếp chỉ.

→ **Mở rộng `LIST_UX_AUDIT.md`**, thêm một cột "Cột hiển thị" vào bảng audit sẵn
có. **Không tạo tài liệu thứ hai** (Rule 5).

## 3. Phương pháp bắt buộc — không chọn cột theo cảm tính

Theo Hiến pháp Rule 7 → *Information Design*. Với **mỗi** màn:

1. **Ai mở màn này, để làm gì?** Khác vai trò thì khác cột.
2. **Viết ra 3–5 câu hỏi thật** người dùng mang tới, **bằng lời của họ**.
3. **Mỗi cột = câu trả lời cho một câu hỏi.** Không câu hỏi → không cột.
4. **Một dòng phải đủ để quyết định có cần mở ra không.**
5. **Chọn 3–4 cột sống còn cho ĐIỆN THOẠI trước**, rồi mới thêm cho màn to.

## 4. Gạo đề xuất — Hồ Ly PHẢN BIỆN, đừng nhận bừa

Sếp đưa ví dụ, không phải mệnh lệnh. Nghĩ lại cho kỹ.

### Nhân sự

Sếp gợi ý: tên · chức vụ · phòng ban · ngày gia nhập.

Câu hỏi HCNS thật sự mang tới khi mở tab Nhân sự:
*"Ai đang thử việc?"* · *"Hợp đồng ai sắp hết hạn?"* · *"Hồ sơ ai còn thiếu?"* ·
*"Bạn này thuộc phòng nào, báo cáo ai?"*

→ **`ngày gia nhập` ít khi là câu hỏi hằng ngày** — nó là dữ liệu tra cứu, không
phải dữ liệu quyết định. Trong khi **loại hợp đồng + hạn hợp đồng** (vừa xây ở
CTL-0015) đúng là thứ HCNS cần thấy ngay.

Đề xuất cân nhắc: **tên · chức vụ/phòng ban · trạng thái *(đang làm / thử việc)*
· hợp đồng + hạn**. Hồ Ly cãi lại nếu thấy sai.

### Tài sản

Sếp gợi ý: tên tài sản · ngày mua · trạng thái sử dụng.

Câu hỏi thật khi mở tab Tài sản:
*"Cái này đang ở đâu?"* · *"Ai đang giữ?"* · *"Còn dùng được không?"* ·
*"Hết bảo hành chưa?"*

→ **`ngày mua` phục vụ kế toán và khấu hao, không phải tra cứu hằng ngày.**
Còn **vị trí** và **người đang giữ** mới là câu hỏi số một — mà cả hai đều
**chưa lên màn**.

Đề xuất cân nhắc: **tên · vị trí · người giữ · trạng thái**, đẩy `ngày mua` và
`giá mua` vào màn kế toán/khấu hao. Hồ Ly cãi lại nếu thấy sai.

> Hai chỗ trên là **ví dụ về cách nghĩ**, không phải kết luận. Làm đủ 5 bước
> phương pháp cho **mọi** màn rồi mới chốt.

## 5. Phạm vi — 13 màn trong `LIST_UX_AUDIT.md`

Đơn hoàn về kho · Lịch sử đơn hoàn · Đối soát đơn hoàn · Sản phẩm ·
Lịch sử làm việc · Danh bạ · **Nhân sự** · Tài khoản · **Tài sản** ·
Cơ cấu tổ chức · Kế toán · Xếp ca · Trạm Mục Tiêu.

**Ưu tiên 3 màn dùng nhiều nhất trước**, đừng làm dàn trải 13 màn một lượt.
Hồ Ly chọn 3 màn nào và nói rõ vì sao.

## 6. Ràng buộc

- Chi phí **0**. Chỉ đổi hiển thị, **không đổi dữ liệu, không migration**.
- **KHÔNG** thêm cột chỉ vì "dữ liệu có sẵn". Mỗi cột thừa làm ba cột quan
  trọng khó thấy hơn.
- Tái dùng `veBang()` và component sẵn có — **không dựng framework bảng mới**.
- **Điện thoại trước.** Bảng vốn đã phải cuộn ngang — thêm cột là làm tệ hơn.
- Không đụng vùng người khác đang sửa (Rule 13). Màn **Nhân sự** đang có
  CTL-0015 chạy, màn **Tài sản** có CTL-0019 xếp hàng → **nối vào hai việc đó**,
  đừng sửa song song.

## 7. Quan hệ với việc khác

- **CTL-0015** (hồ sơ nhân sự) — đang soi. Kết quả CTL-0020 áp vào đó, **không
  mở nhánh riêng cho màn Nhân sự**.
- **CTL-0019** (tài sản gộp bộ + kiểm kê) — xếp hàng. Gộp phần cột vào cùng đợt.
- **CTL-0012** (tự cập nhật không cần F5) — cùng đụng các màn danh sách, cân
  nhắc gộp đợt.

## 8. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Layout ưu tiên người dùng thật, tab hiển thị thông tin cơ bản nhất |
| `NEW` | `READY_QUEUE` | GẠO | 2026-08-27 | Đã nâng thành nguyên tắc nền *(Hiến pháp Rule 7 — Information Design)*. Audit: `LIST_UX_AUDIT.md` đã có **cơ chế** danh sách cho 13 màn nhưng **không có gì về chọn cột** → mở rộng file đó, không tạo file thứ hai. Nêu 2 điểm phản biện ví dụ của Sếp: `ngày gia nhập` và `ngày mua` là dữ liệu tra cứu, không phải dữ liệu quyết định hằng ngày |
