# BẢNG VIỆC — GẠO TEAM LEAD

> Cập nhật: 2026-08-27. Cách điều hành: [TEAM-LEAD-PROTOCOL.md](TEAM-LEAD-PROTOCOL.md).
> Bài học: [BAI-HOC.md](BAI-HOC.md). Vùng code ai giữ: [ACTIVE-WORK.md](ACTIVE-WORK.md).

**Chế độ**: `ASSISTED` · **Mức tự động**: `SEMI_AUTOMATED` · **Chi phí**: `0`

## LUẬT GIAO VIỆC LIÊN TỤC — Sếp chốt 27/08

> *"tự động rà list việc nếu có việc thì giao liên tục cho 2 đứa nó nhé"*

Gạo **không chờ Sếp nhắc**. Mỗi lần một Agent trả kết quả:
1. Xử lý kết quả đó *(soi đạt → đẩy · chưa đạt → giao sửa)*
2. **Ngay lập tức lấy việc kế tiếp trong hàng đợi giao xuống**
3. Không để Agent nằm không khi hàng đợi còn việc

**Trần cứng: 2 Agent cùng lúc** — mở 4 đứa là đã làm cháy hạn mức phiên
(27/08 sáng). Đầy 2 chỗ thì việc mới xếp hàng, không mở thêm.

**Ưu tiên khi chọn việc kế tiếp:**
`P0 sập/bảo mật/toàn vẹn dữ liệu` → `P1 chặn vận hành, mất dữ liệu` →
`việc đang dở gần xong` → `P2` → `P3`.
Việc **đụng cùng file** với việc đang chạy thì **xếp sau**, không giao song song
(Rule 13 · BH-14).

---

## ĐANG CHẠY — 2/2, đầy

| Việc | Agent | Ghi chú |
|---|---|---|
| CTL-0015 Đợt 1 **vòng sửa 1/3** — vá 3 lỗi REV-0009 | KHỈ ĐỘT | Ca mồ côi · đếm lần ký sai · rò lý do giữa 2 hồ sơ |
| CTL-0015 Đợt 2+3+4 — sinh nhật · mô tả công việc · năng lực | KHỈ ĐỘT | Nhánh nối tiếp Đợt 1 |

---

## ⚠️ BA VIỆC CHẾT LÚC CHÁY HẠN MỨC — CHƯA KHỞI ĐỘNG LẠI

Lỗi điều phối của Gạo: đã báo Sếp nhưng **không giao lại**. Ưu tiên cao nhất.

| Việc | Ưu tiên | Vì sao gấp |
|---|---|---|
| **CTL-0013 — Sao lưu dữ liệu** | **P1** | **Mất dữ liệu là không cứu được.** Hiện chưa có bản sao lưu nào. Xuất nhập kho và chấm công mất là không dựng lại nổi |
| **CTL-0002a — vá 4 lỗ runner** | **P1** | Hồ Ly bác bỏ lằn ranh "AI không chạm được `main`". 4 lỗ CAO: chìa khoá bỏ quên · đổi tên file là lọt cổng · hết token thành thất bại · **Sếp bấm dừng máy tự bật lại**. Chưa merge nên chưa nguy hiểm, nhưng chặn toàn bộ tự động hoá |
| **CTL-0014 — Thông báo lên điện thoại** | P2 | Hồ Ly phân tích dở dang. Chặn giá trị của cả nhắc việc lẫn nhắc hạn giấy tờ |

---

## HÀNG ĐỢI — thứ tự giao

| # | Việc | Ưu tiên | Trạng thái | Đụng file |
|---|---|---|---|---|
| 1 | CTL-0013 Sao lưu dữ liệu | **P1** | `READY_FOR_BUILD` | file mới + `src/index.js` cron |
| 2 | CTL-0002a vá 4 lỗ runner | **P1** | `FIX_REQUIRED` 1/3 | `scripts/runner/*` · workflow |
| 3 | CTL-0003 / SPEC-0002 Cổng duyệt góp ý | **P1** | `READY_FOR_BUILD` | `src/index.js` vùng `gop_y` |
| 4 | CTL-0014 Thông báo điện thoại | P2 | `IN_ANALYSIS` dở | `sw.js` · `src/index.js` |
| 5 | CTL-0007 / SPEC-0004 Nhắc việc Trạm Mục Tiêu | P2 | `SPEC_READY` | `src/index.js` vùng `cong_viec` |
| 6 | CTL-0012 Tự cập nhật không cần F5 | P2 | `READY_QUEUE` | `app.js` nhiều màn |
| 7 | CTL-0010B 2 lỗ bảo mật đính kèm | P2 | `READY_QUEUE` | `src/index.js` |
| 8 | CTL-0016 Trình xem ảnh dùng chung | P3 | `READY_QUEUE` | `app.js` · `style.css` |
| 9 | Đề xuất C — Esc cho 18 cửa sổ | P3 | `READY_QUEUE` | `app.js` — **gộp với #8** |
| 10 | CTL-0010A Gộp 3 hàm nén ảnh | P3 | `READY_QUEUE` | `app.js` |
| 11 | CTL-0015 Đợt 5 — kho tài liệu scan | P2 | chờ Đợt 1–4 xong | file mới |

**Ghi chú xếp hàng:** #8 và #9 **gộp một đợt** — cùng vùng `app.js`, cùng chuyện
đóng cửa sổ. #1 và #2 **chạy song song được** — khác file hoàn toàn.

---

## CẦN SẾP — 2 việc, chưa làm

| Việc | Vì sao |
|---|---|
| **Khoá nhánh `main` trên GitHub** | Lớp khoá cuối. Không có nó thì mọi lớp Gạo làm đều là khoá giấy — Hồ Ly đã chứng minh AI lách được |
| **Đặt giới hạn chi tiêu GitHub Actions = 0** | Khoản duy nhất còn có thể tràn ra tiền |

---

## ĐÃ LÊN HỆ THỐNG THẬT — 27/08

| Giờ | Việc |
|---|---|
| Sáng | CTL-0008 — 13 lỗi cửa sổ · số đỏ tin nhắn · phím Esc · cứu đường in tem |
| Trưa | CTL-0011 — dán ảnh Ctrl+V vào Góp ý và Chat nội bộ · gộp 3 hàm nén · vá lỗi nghẹn 123KB |

## QUYẾT ĐỊNH ĐÃ CHỐT

ADR-0004 → ADR-0013. Đáng nhớ nhất:
**chi phí 0** (A-0006) · **Gạo tự quyết kỹ thuật** (A-0007) ·
**một cửa duy nhất Góp ý ERP** (A-0010) · **Gạo tự đẩy khi đã kiểm kỹ** (A-0012) ·
**thứ 7 vẫn làm, sao lưu ngày + tháng** (A-0013)
