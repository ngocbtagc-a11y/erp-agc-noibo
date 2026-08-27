# CTL-0012 — Trạng thái tự cập nhật sang màn hình người khác, không cần F5

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `UX_IMPROVEMENT` + `PROCESS_IMPROVEMENT`
- **Priority**: **P2**
- **Risk**: MEDIUM (đụng nhiều màn hình; rủi ro chính là **vượt hạn mức miễn phí**)
- **Status**: `READY_QUEUE`
- **Current Owner**: GẠO → **Next Owner**: HỒ LY

---

## 1. Yêu cầu gốc

> *"những trạng thái này sẽ tự động cập nhật sang màn hình của cấp trên khi
> nhân viên đã nhận việc, ko cứ là phải load lại"*
>
> *"và hãy áp dụng cái đó vào nguyên tắc erp để đỡ bị phiền"*

Sếp gửi kèm ảnh cột **TRẠNG THÁI** của Trạm Mục Tiêu: *Mới giao · Đang làm ·
Đã huỷ*. Nhân viên bấm "Bắt đầu làm" thì màn hình quản lý đang mở phải tự đổi
theo, không bắt quản lý F5.

**Câu thứ hai quan trọng hơn câu thứ nhất.** Sếp không muốn phải nhắc lại chuyện
này ở từng tính năng — đã đưa thành nguyên tắc nền, xem
[ERP-CONSTITUTION.md](../ERP-CONSTITUTION.md) → Rule 7 → **Cross-User Freshness**.

## 2. Điều đã có và điều còn thiếu

Repo **đã có** quy ước `UI State Consistency` (bổ sung 23/08/2026): mọi mutation
thành công phải làm mới ngay UI, không bắt F5 — cơ chế `window.LAM_MOI_*`.

**Nhưng nó chỉ lo màn hình của chính người vừa bấm.** Không có gì lo màn hình
người khác đang mở. Đó đúng là chỗ Sếp chỉ ra.

## 3. Ràng buộc số một: KHÔNG ĐƯỢC TỐN TIỀN

Đây là điểm dễ chết nhất của loại tính năng này.

**Cấm** WebSocket / Durable Objects / kết nối thường trực nếu hỏi-lại-theo-nhịp
còn đủ dùng. Đó là đường dẫn thẳng ra khỏi hạn mức miễn phí.

**Cách làm bắt buộc:**

1. Một đường gọi **cực nhẹ** trả về **dấu mốc thay đổi** (ví dụ mốc thời gian
   sửa gần nhất của vùng dữ liệu). Chỉ khi dấu mốc đổi mới tải dữ liệu thật.
2. **Chỉ chạy khi tab đang hiện.** Tab ẩn → dừng hẳn. Chốt tiết kiệm lớn nhất.
3. **Chỉ chạy trên màn hình đang xem dữ liệu dùng chung.** Không chạy nền toàn app.
4. Nhịp hỏi thưa dần khi không có gì đổi.

**Hồ Ly phải tính và ghi con số vào Feature Spec:**
- Bao nhiêu lượt gọi/ngày với 20 người, giờ làm 8h–18h?
- Đối chiếu hạn mức miễn phí Cloudflare Workers (100.000 lượt/ngày) — **cộng cả
  lưu lượng ERP hiện tại**, không tính riêng.
- Còn dư bao nhiêu phần trăm? Dưới 50% dư thì thiết kế lại cho thưa hơn.

Không có con số → **không được duyệt**. Ước lượng bằng cảm tính không tính.

## 4. Hồ Ly phải trả lời

1. **Những màn hình nào cần?** Trạm Mục Tiêu là chỗ Sếp nêu. Còn: góp ý, đơn
   hoàn, tồn kho, phân ca, thông báo, chat. **Xếp thứ tự theo mức đau thật**,
   đừng làm hết một lượt.
2. **Dấu mốc thay đổi lấy từ đâu?** Có cột `cap_nhat_luc` sẵn không, hay phải
   thêm? Ưu tiên tái dùng (Rule 5).
3. **Nhịp hỏi bao lâu một lần?** Con số cụ thể, kèm lý do và phép tính hạn mức.
4. **Không được giật dữ liệu dưới tay người đang thao tác.** Đang mở form sửa,
   đang gõ dở, đang mở hộp thoại → xử lý thế nào? Đây là câu dễ làm hỏng
   trải nghiệm nhất.
5. **Người dùng phải THẤY có gì vừa đổi** — nhấp nháy dòng vừa đổi, hay hiện
   "có 2 việc vừa cập nhật"? Đổi lặng lẽ là người ta không tin số trên màn hình nữa.
6. **Mạng chập chờn / mất mạng**: dừng hỏi, hiện trạng thái mất kết nối, tự nối
   lại. Không để nó lặng lẽ hiện số cũ như thể là mới.
7. **Trên điện thoại**: PWA, kho dùng điện thoại là chính. Hỏi lại liên tục có
   tốn pin và 3G/4G của nhân viên không? Tính cả chi phí của **người dùng**,
   không chỉ chi phí máy chủ (Rule 12 — Human Cost).
8. **Tái dùng `window.LAM_MOI_*`** đã có, đừng đẻ cơ chế làm mới thứ hai.

## 5. Quan hệ với việc khác

- Cùng vùng với **CTL-0007 / SPEC-0004** (Trạm Mục Tiêu nhắc việc). Cả hai đụng
  `cong_viec` và màn Trạm Mục Tiêu → **gộp vào cùng một đợt build**, đừng tách
  hai người sửa song song (Rule 13).
- Không đụng `gop_y` — CTL-0011 đang ở đó.
- Không đụng vùng popover / `[hidden]` — CTL-0008 đang chờ phát hành.

## 6. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Trạng thái phải tự sang màn hình cấp trên, không cần F5 |
| `NEW` | `TRIAGE` | GẠO | 2026-08-27 | Đã nâng thành nguyên tắc nền **Cross-User Freshness** (Hiến pháp Rule 7) theo yêu cầu "áp dụng vào nguyên tắc ERP để đỡ bị phiền". Audit: quy ước `UI State Consistency` 23/08 đã có nhưng chỉ lo màn hình người vừa bấm |
| `TRIAGE` | `READY_QUEUE` | GẠO | 2026-08-27 | Gộp cùng đợt với SPEC-0004 — cùng vùng `cong_viec` |
