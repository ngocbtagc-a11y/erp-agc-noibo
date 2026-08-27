# CTL-0015 — Hồ sơ nhân sự chuyên nghiệp: skill · mô tả công việc · nhắc sinh nhật

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `NEW_FEATURE` + `UX_IMPROVEMENT`
- **Module**: `nhan_su` · tab Nhân sự
- **Priority**: **P2**
- **Risk**: **MEDIUM–HIGH** — dữ liệu nhân sự nhạy cảm + chạm phân quyền
- **Status**: `READY_FOR_ANALYSIS` · **Next Owner**: HỒ LY

---

## 1. Yêu cầu gốc

> *"thiết kế tab nhân sự cho chuyên nghiệp và đầy đủ, yêu cầu mỗi nhân viên có
> 1 hồ sơ nhân sự và bộ skill cá nhân, mô tả công việc... để nv nhân sự dễ dàng
> quản lý nhân sự hơn, hiển thị cơ bản các thông tin như loại hình hợp đồng,
> ngày vào... và thêm 1 chức năng đó là khi nhân sự đó đến ngày sinh nhật thì
> gửi tin nhắn chúc mừng và thông báo cho nhân viên phụ trách vào ngày 30 tháng
> trước đó để nhân viên nhân sự có thể bao quát được"*

## 2. GẠO ĐÃ AUDIT — đã có gì, thiếu gì

Đọc `schema.sql` + toàn bộ `ALTER TABLE nhan_su` trong `migrations/`.

**ĐÃ CÓ trong `nhan_su` — không thêm lại (Rule 5):**

`ho_ten` · `viet_tat` · `ma_nv` · `chuc_vu` · `bo_phan` · `phong_ban_id` ·
`sdt` · `email` · `quan_ly_id` · `phap_nhan` · `trang_thai`
(`da_ky|thu_viec|cho_ky|can_trao_doi|parttime`) · **`ngay_vao`** · `luong` ·
`dang_lam` · `so_cccd` · **`ngay_sinh`** · `gioi_tinh` · `que_quan` ·
`noi_thuong_tru` · `so_bhxh` · `anh_cccd` · `anh_chan_dung` · `sao`

Cộng: bảng **`nhan_su_lich_su`** (vào làm · đổi phòng ban · đổi chức danh…),
cơ chế **Vinh danh/Sao**, và Employee Profile Phase 1 đã gộp
Tài khoản/Vai trò/Lịch sử vào hồ sơ (commit `ddf06e9`).

> **`ngay_sinh` ĐÃ CÓ SẴN.** Tính năng sinh nhật **không cần thêm cột nào** —
> chỉ cần cron đọc. Đây là việc rẻ nhất trong cả bản giao việc này.

**CHƯA CÓ — đây mới là phần phải làm:**
bộ skill cá nhân · mô tả công việc · **loại hình hợp đồng** · **ngày hết hạn
hợp đồng** · nhắc sinh nhật.

## 3. Hai chỗ Gạo bổ sung — yêu cầu gốc chưa nêu nhưng đáng tiền

### 3.1 ⚠️ RỦI RO PHÁP LÝ: `trang_thai` KHÔNG PHẢI loại hình hợp đồng

Sếp xin *"hiển thị loại hình hợp đồng"*. Hệ thống hiện chỉ có `trang_thai`
(`da_ky` / `thu_viec` / `cho_ky` / `parttime`) — đó là **đã ký hay chưa**,
**không phải** ký loại gì.

**Thiếu hẳn:** hợp đồng **xác định thời hạn** hay **không xác định thời hạn**,
**ngày hết hạn**, và **đây là hợp đồng thứ mấy** với cùng người đó.

Vì sao quan trọng — **Bộ luật Lao động 2019**:
- Hợp đồng xác định thời hạn tối đa **36 tháng**.
- Chỉ được ký **2 lần liên tiếp**. Lần thứ ba **bắt buộc** phải là hợp đồng
  không xác định thời hạn.
- Hết hạn mà vẫn để người ta đi làm quá **30 ngày** không ký lại → luật tự coi
  là **hợp đồng không xác định thời hạn**.

Công ty đang **chuyển toàn bộ nhân sự từ HKĐ cũ lên Công ty TNHH** (mục tiêu
Q3/2026) — tức là **ký lại hàng loạt hợp đồng ngay lúc này**. Không có chỗ lưu
ngày hết hạn và số lần ký thì **rất dễ vi phạm mà không ai biết**, và chỉ phát
hiện khi có tranh chấp.

→ Hồ Ly phải thiết kế: loại hợp đồng · ngày bắt đầu · **ngày hết hạn** ·
lần ký thứ mấy. Và **nhắc trước khi hết hạn** — nối vào SPEC-0004, **không**
dựng cơ chế nhắc thứ hai.

### 3.2 ⚠️ Bẫy ngày 30: **tháng 2 không có ngày 30**

Sếp yêu cầu báo HCNS vào **ngày 30 tháng trước**. Nhưng:
- Tháng 2 chỉ có 28 hoặc 29 ngày → **không bao giờ tới ngày 30**
- → Danh sách sinh nhật **tháng 3 sẽ không bao giờ được báo**
- Tháng 4/6/9/11 có 30 ngày — chạy đúng nhưng là ngày cuối tháng

→ Dùng **ngày cuối cùng của tháng**, hoặc chốt một ngày an toàn như **28**.
Hồ Ly chọn và nói rõ lý do. **Không được viết cứng số 30.**

## 4. Hồ Ly phải trả lời

### A. Bộ skill — câu quyết định tính năng sống hay chết

**Skill để LÀM GÌ?** Nếu chỉ để lưu cho đẹp thì sau 2 tuần không ai cập nhật,
kho rỗng. Phải nối vào việc thật:

- Giao việc → gợi ý người có skill phù hợp?
- Xếp ca kho → biết ai biết lái xe nâng, ai được vận hành máy?
- Người nghỉ đột xuất → tìm ai thay được?
- Thấy khoảng trống skill của cả đội → biết cần đào tạo gì?

Chọn **1–2 mục đích cụ thể**, thiết kế theo đó. Đừng làm bảng skill chung chung.

**Ai chấm skill?** Tự khai hay quản lý xác nhận? Tự khai không ai kiểm là dữ
liệu rác. Có mức độ (biết / làm được / thành thạo / dạy được người khác) không?

**Skill lấy từ đâu?** Danh mục cố định hay ai muốn thêm gì cũng được? Tự do là
sẽ có "Excel", "excel", "EXCEL", "MS Excel" — hỏng khả năng tra cứu.
Repo đã có khuôn **Data Lock cho danh mục nền** (`them-danhmuc-nen.sql`,
`them-khoa-danhmuc-nen.sql`) — **tái dùng**.

### B. Mô tả công việc — phải theo MBOs

Công ty vận hành theo **MBOs**. Hiến pháp bắt: **outcome-based, không
activity-based**. Mô tả công việc phải trả lời **"đầu ra cụ thể là gì?"**,
không phải *"hằng ngày làm những gì"*.

Đây không phải chuyện hình thức — Sếp **đang vướng đúng chỗ này** với bạn
Vũ Lan Hương (HCNS): không biết giao việc thế nào để bạn cam kết được đầu ra rõ.

→ Thiết kế mẫu mô tả công việc **ép người viết phải nêu đầu ra đo được**.
Có ví dụ mẫu điền sẵn cho vài vị trí thật của công ty (kho, kế toán, HCNS,
vận hành sàn) để người ta biết viết thế nào là đúng.

→ Mô tả công việc có nối được vào **Trạm Mục Tiêu** không? Giao việc mà đối
chiếu được với đầu ra đã cam kết trong JD thì mới là MBOs thật.

### C. Nhắc sinh nhật

1. **Ngày 30 → xem mục 3.2**, đừng viết cứng.
2. **"Nhân viên phụ trách"** là ai? HCNS (Vũ Lan Hương)? Quản lý trực tiếp?
   Cả hai? Dùng `quan_ly_id` sẵn có, **không bịa vai trò mới**.
3. **Chúc mừng gửi qua đâu?** Chuông ERP · Telegram · thông báo điện thoại
   (CTL-0014 đang làm). Tái dùng `guiThongBao()` / `guiTelegram()`.
4. **Ai nhận lời chúc?** Chỉ người có sinh nhật, hay cả phòng biết để chúc?
   Có người **không muốn công khai tuổi** — có cho tắt không? (`gioi_tinh`,
   `ngay_sinh` là dữ liệu cá nhân.)
5. **Người đã nghỉ việc** (`dang_lam = 0`) — **không được** gửi chúc mừng.
   Lỗi này rất dễ mắc và rất mất mặt.
6. **Chống trùng**: cron chạy 5 phút/lần → phải có dấu đã gửi, không bắn 288 lần
   một ngày. Theo khuôn `da_canh_bao` của `kiemTraCanhBaoHoan()`.

### D. Màn hình

1. **Danh sách nhân sự** hiện cột nào? Sếp xin *"loại hình hợp đồng, ngày vào"*.
   Còn gì nữa cho HCNS làm việc được? ERP là PWA — **bao nhiêu cột thì vừa
   màn hình điện thoại**?
2. **Hồ sơ một người** bố cục ra sao? Phase 1 đã gộp Tài khoản/Vai trò/Lịch sử.
   Giờ thêm skill + JD + hợp đồng — **đừng biến nó thành cái phễu 12 tab**.
3. **Exception-First**: HCNS mở tab Nhân sự ra thấy ngay việc cần làm chưa —
   hợp đồng sắp hết hạn, hồ sơ thiếu giấy tờ, sinh nhật tháng tới — hay phải
   tự đi tìm?
4. **Human Cost** (Rule 12): thêm skill và JD nghĩa là **thêm việc nhập liệu
   cho 20 người**. Mỗi hồ sơ tốn bao nhiêu phút? Ai nhập? Nhập một lần rồi
   thôi hay phải cập nhật? **Không trả lời được câu này thì tính năng sẽ chết.**

### E. Bảo mật

`ngay_sinh` · `so_cccd` · `so_bhxh` · `luong` · JD · skill — **mức nhạy cảm
khác nhau**. Ai xem được gì?

Đã có quyết định tại [ADR-0011](../decisions/ADR-0011-kho-tai-lieu-tai-khoan-va-quyen-xem.md)
A2 cho giấy tờ nhạy cảm — **áp cùng nguyên tắc**, đừng đẻ luật thứ hai.

Lưu ý: `anh_cccd` khai *"ảnh để ở R2"* nhưng **R2 chưa bật** (ADR-0011 B1 chốt
không bật). Kiểm xem đường ảnh CCCD hiện có chạy không, hay là code chết.

## 5. Ràng buộc

- **Chi phí 0.** Không bật R2.
- **KHÔNG thêm cột `ngay_sinh`** — đã có.
- **KHÔNG dựng cơ chế nhắc thứ hai** — nhắc sinh nhật và nhắc hạn hợp đồng đều
  nối vào SPEC-0004.
- Tái dùng `quyen.js`, `nhan_su_lich_su`, `thong_bao`, khuôn Data Lock danh mục.
- Đổi phân quyền là `CORE_CHANGE` → **STOP, trình Sếp**.
- Không đo năng suất cá nhân để chấm KPI (điều cấm 20).
- Không đụng `gop_y`, `cong_viec`, `src/index.js` vùng đang có người sửa (Rule 13).

## 6. Chia đợt

Đề xuất khởi điểm — Hồ Ly phản biện:

- **Đợt 1** *(rẻ nhất, dùng được ngay)*: nhắc sinh nhật + hiển thị loại hợp đồng
  và ngày vào trên danh sách. `ngay_sinh` đã có → gần như chỉ thêm cron.
- **Đợt 2**: loại hình hợp đồng + ngày hết hạn + nhắc trước hạn *(giá trị pháp
  lý cao nhất, đang cần ngay vì công ty ký lại hàng loạt)*.
- **Đợt 3**: mô tả công việc theo MBOs.
- **Đợt 4**: bộ skill — làm sau cùng vì tốn công nhập nhất và dễ chết nhất.

## 7. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Tab nhân sự chuyên nghiệp: hồ sơ, skill, JD, nhắc sinh nhật |
| `NEW` | `READY_FOR_ANALYSIS` | GẠO | 2026-08-27 | Audit: `ngay_sinh` ĐÃ CÓ → sinh nhật không cần cột mới. Bổ sung 2 điểm yêu cầu gốc chưa nêu: **`trang_thai` không phải loại hợp đồng** — thiếu ngày hết hạn + số lần ký, rủi ro vi phạm BLLĐ 2019 đúng lúc công ty ký lại hàng loạt; và **bẫy ngày 30 — tháng 2 không có ngày 30** nên sinh nhật tháng 3 sẽ không bao giờ được báo |
