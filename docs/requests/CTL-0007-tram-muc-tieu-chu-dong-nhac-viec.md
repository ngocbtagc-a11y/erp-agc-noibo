# CTL-0007 — Trạm Mục Tiêu: chuyển từ bảng tra cứu sang hệ chủ động nhắc việc

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc
- **Ngày nhận**: 2026-08-27
- **Category**: `PROCESS_IMPROVEMENT` + `UX_IMPROVEMENT`
- **Module**: `cong_viec` — `src/index.js:1815-2300`, tab Trạm Mục Tiêu
- **Priority**: **P2** (tốn nhiều công người thật · lỗi lặp đi lặp lại)
- **Risk**: MEDIUM (đổi luồng nghiệp vụ đang dùng thật, nhiều người dùng hằng ngày)
- **Status**: `SPEC_READY` — [SPEC-0004](../specs/SPEC-0004-tram-muc-tieu-nhac-viec.md)
  đã viết xong, trả đủ 9 câu ở Mục 4
- **Current Owner**: GẠO → **Next Owner**: KHỈ ĐỘT (Đợt 0–2)

---

## 1. Yêu cầu gốc

> *"trong tab Trạm Mục tiêu, cũng thiết kế thông minh lên, để tao giao việc xong
> thì có các trạng thái ví dụ như: 'đang làm' 'đã xong'..... nói chung làm sao cho
> tiện lợi, dễ dùng mà vẫn biết được nhân viên còn việc gì, mục đích là tránh quên
> việc, nhân viên biết phải làm gì....."*

Ba mục tiêu Sếp nêu, tách rõ để không làm lệch:
1. **Tránh quên việc.**
2. **Nhân viên biết phải làm gì.**
3. **Sếp biết nhân viên còn đọng việc gì.**

## 2. GẠO ĐÃ AUDIT — phần lớn thứ Sếp xin ĐÃ CÓ

Đọc trực tiếp code trước khi giao việc, để Hồ Ly không thiết kế lại cái đang chạy
(Hiến pháp Rule 5 — Reuse → Extend → Create).

**Trạm Mục Tiêu hiện đã có:**

| Thứ | Ở đâu | Ghi chú |
|---|---|---|
| 5 trạng thái: Mới · Đang làm · Chờ duyệt · Hoàn thành · Huỷ | `CV_TRANG_THAI_HOP_LE`, `src/index.js:1919` | Đúng thứ Sếp xin |
| **Luật chuyển trạng thái chặt chẽ** | `src/index.js:1956` | Khai rõ đi từ đâu (`tu:`) và ai được bấm (`ai:`) — khác hẳn `gop_y` |
| Đầu ra bắt buộc (`dau_ra`) | `migrations/them-congviec.sql:8` | Đúng tinh thần MBOs, tách khỏi `mo_ta` |
| Hạn chót (`han_chot`) | cùng bảng | |
| Kết quả thực tế (`ket_qua`) | cùng bảng | Điền khi nộp "Chờ duyệt" |
| Người phối hợp | `phoi_hop_ids` | |
| Gắn vào mục tiêu MBOs | `muc_tieu_id` | Tự tính tiến độ mục tiêu |
| Hiện quá hạn màu đỏ | `app.js:1763`, `2031`, `2271` | |
| Thẻ "Việc quá hạn" trên bảng điều khiển | `app.js:1549`, `1560`, `2222` | |
| Cảnh báo "X việc đã giao đang quá hạn" | `app.js:1531` | |
| Thống kê quá hạn theo phòng ban | `app.js:2234` | |
| Thông báo khi được giao việc mới | `guiThongBao()`, `src/index.js:1911` | |

**Kết luận: Sếp KHÔNG thiếu trạng thái. Không cần thêm trạng thái mới.**

## 3. Vấn đề thật — hệ thống THỤ ĐỘNG

Toàn bộ cơ chế trên chỉ hoạt động **khi có người mở ERP ra xem**.
Không ai mở → không ai biết → việc bị quên. Đúng nỗi đau Sếp nêu.

Bằng chứng: hàm `scheduled()` (`src/index.js:3465`) chạy mỗi 5 phút và có
đủ thứ — đồng bộ Shopee, TikTok, cảnh báo đơn hoàn quá 12h, cảnh báo lý do
nghiêm trọng, Hồ Ly triage góp ý — **nhưng KHÔNG có một dòng nào nhắc việc
trong `cong_viec`.**

Năm lỗ hổng cụ thể:

| # | Lỗ hổng | Hậu quả thật |
|---|---|---|
| 1 | Không có nhắc tự động khi việc **quá hạn** | Chỉ ai chủ động mở ERP mới biết. Người hay quên chính là người không mở. |
| 2 | Không có cảnh báo **sắp đến hạn** | Chỉ báo khi ĐÃ trễ — lúc đó nhắc cũng muộn rồi. |
| 3 | Việc nằm ở **"Mới"** nhiều ngày không ai đụng | Nhận việc rồi để đó, không ai biết cho tới khi quá hạn. |
| 4 | Việc nằm ở **"Chờ duyệt"** không ai duyệt | **Bẫy quên việc kinh điển**: nhân viên làm xong, nộp lên, rồi người giao quên duyệt. Nhân viên tưởng xong, Sếp tưởng chưa làm. |
| 5 | Không đẩy ra **Telegram** | `guiTelegram()` đã có sẵn và đang dùng cho đơn hoàn — chưa dùng cho công việc. |

**Vậy việc cần làm không phải "thêm trạng thái", mà là "làm cho nó biết đi nhắc".**

## 4. Hồ Ly phải trả lời trong Feature Spec

1. **Nhắc lúc nào?** Sắp đến hạn nhắc trước mấy ngày? Quá hạn nhắc lại mấy lần
   rồi thôi? Việc nằm ở "Mới"/"Chờ duyệt" bao lâu thì coi là đọng?
   Đề xuất con số cụ thể, đừng để "tuỳ cấu hình".
2. **Nhắc ai?** Người nhận, người giao, hay quản lý trực tiếp (`nhan_su.quan_ly_id`)?
   Leo cấp theo mức độ trễ hay không?
3. **Nhắc qua đâu?** Chuông trong ERP (`guiThongBao`) · Telegram (`guiTelegram`) ·
   hay cả hai theo mức độ? Tái dùng cả hai, không xây kênh mới.
4. **Chống làm phiền** (Rule 12 — Human Cost). Đây là câu quan trọng nhất.
   Nhắc quá tay thì người ta tắt thông báo, hệ thống thành vô dụng. Gộp nhiều
   việc vào một tin? Mỗi việc chỉ nhắc một lần một ngày? Không nhắc ngoài giờ
   làm và ngày nghỉ? Tham chiếu `kiemTraCanhBaoHoan()` — đã có cột `da_canh_bao`
   để không bắn lại, dùng đúng khuôn đó.
5. **"Việc của tôi hôm nay"** — nhân viên mở ERP ra có thấy NGAY phải làm gì
   không, hay phải tự đi tìm? Thiết kế màn hình mở đầu theo Exception-First.
6. **Màn của Sếp** — nhìn một chỗ có biết ngay ai đang đọng việc gì không?
   Gộp theo người hay theo phòng ban? Anh Duy (quản lý kho) có màn riêng cho
   team kho của mình không — đúng kênh báo cáo Kho → anh Duy → Sếp?
7. **GHI NHẬN, không chỉ bắt lỗi.** Hiện hệ thống chỉ làm nổi bật cái TRỄ
   (đỏ, cảnh báo). Không có chỗ nào làm nổi bật người **làm xong đúng hạn**.
   Thiết kế chỗ để Sếp nhìn thấy và ghi nhận — công ty đã có sẵn cơ chế
   Vinh danh/Sao (`migrations/them-vinhdanh.sql`, `them-sao-nhansu.sql`),
   **tái dùng**, đừng xây mới. Một hệ chỉ biết réo người trễ sẽ khiến nhân
   viên sợ Trạm Mục Tiêu thay vì dùng nó.
8. **Trên điện thoại**: ERP là PWA, nhân viên kho dùng điện thoại là chính.
   Nhắc việc và "việc của tôi hôm nay" phải dùng được bằng một tay.
9. **Dữ liệu cũ**: việc đang quá hạn sẵn từ trước — bật nhắc lên có bắn một
   loạt tin dồn không? Xử lý thế nào cho khỏi spam ngày đầu.

## 5. Ràng buộc

- **KHÔNG thêm trạng thái mới** vào `cong_viec` trừ khi chứng minh được 5 cái
  hiện có không đủ. Nêu lý do rõ nếu muốn thêm.
- **KHÔNG tạo bảng nhắc việc mới** nếu tái dùng được `thong_bao` sẵn có.
- Tái dùng `guiThongBao()`, `guiTelegram()`, cron `scheduled()` đã chạy — không
  dựng lịch chạy thứ hai.
- Theo khuôn `kiemTraCanhBaoHoan()`: có cột đánh dấu đã bắn để không gửi lại.
- Giữ nguyên luật chuyển trạng thái đang chạy tốt ở `src/index.js:1956`.
- Không đo năng suất cá nhân để chấm KPI — mục tiêu là **không quên việc**,
  không phải xếp hạng nhân viên (Hiến pháp điều cấm 20).

## 6. Quan hệ với việc khác

- **Không đụng** `gop_y` — CTL-0003 và GY-0001 đang ở vùng đó (Rule 13).
- `cong_viec` và `gop_y` là hai bảng độc lập, hai vòng đời khác nhau.
  **Không gộp**, đã có quyết định từ 25/08 (xem `migrations/them-gopy.sql`).
- Cùng dùng `nhan_su.quan_ly_id` với CTL-0003 → nếu CTL-0003 chốt cách xác định
  quản lý trực tiếp, việc này dùng theo, không tự định nghĩa lại.

## 7. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Sếp yêu cầu Trạm Mục Tiêu thông minh hơn, tránh quên việc |
| `NEW` | `TRIAGE` | GẠO | 2026-08-27 | Audit code: 5 trạng thái + luật chuyển + quá hạn ĐÃ CÓ. Vấn đề thật là hệ thống thụ động, cron không nhắc việc. |
| `TRIAGE` | `READY_QUEUE` | GẠO | 2026-08-27 | P2, Hồ Ly đang giữ 2 việc — xếp hàng, không phá WIP limit |
| `READY_QUEUE` | `SPEC_READY` | HỒ LY | 2026-08-27 | SPEC-0004 xong. Trả đủ 9 câu. **1 cột DB duy nhất** (`nop_luc`), không bảng mới, không trạng thái mới, không cron mới. Phát hiện thêm lỗ hổng thứ 6 CTL-0007 chưa nêu: không có mốc "người làm nộp lúc nào" → chấm đúng hạn bằng `cap_nhat_luc` sẽ đổ lỗi trễ cho người nộp đúng hạn khi quản lý duyệt muộn. 2 câu N1/N2 có mặc định an toàn, **không chặn build** |
