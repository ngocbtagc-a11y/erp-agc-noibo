# BẢNG VIỆC — GẠO TEAM LEAD

> Cập nhật: 2026-08-27 09:40. Cách điều hành: [TEAM-LEAD-PROTOCOL.md](TEAM-LEAD-PROTOCOL.md).
> Vùng code ai đang giữ: [ACTIVE-WORK.md](ACTIVE-WORK.md) — file khác, không chép lẫn.
> Yêu cầu từ nhân viên sống trong DB (`gop_y`), không ghi ở đây.

**Chế độ**: `ASSISTED` · **Mức tự động**: `SEMI_AUTOMATED` (chưa có runner chạy không cần người)

## WIP hiện tại

| Agent | Đang giữ | Giới hạn | Còn nhận được |
|---|---|---|---|
| HỒ LY | 3 | 2–3 | **0 — đã kịch trần** |
| KHỈ ĐỘT | 1 | 1–2 | 1 (chỉ P0/P1) |

`STOP STARTING — START FINISHING`. Không giao Hồ Ly thêm việc cho tới khi có việc đóng.

## Đang chạy

### GY-0001 · Dán ảnh vào ô Góp ý bằng Ctrl+V · **P3**

| | |
|---|---|
| Current Owner | **HỒ LY** (review) |
| Status | `READY_FOR_REVIEW` |
| Next Owner | OWNER (nghiệm thu) → merge |
| Build | Nhánh `feature/gopy-paste-anh`, commit `3af0c23`, 4 file, +280/−13 |
| Blocker | NONE |
| Risk | LOW — chỉ frontend, không đụng backend/DB/phân quyền, không migration |

Khỉ Đột nộp 27/08. Ba đường vào: Ctrl+V ở bất kỳ đâu trong form · kéo-thả ·
nút chọn tệp (giữ lại). Ảnh 12,8 MB tự nén còn 759 KB. Lời nhắc tự đổi theo
thiết bị — điện thoại hiện "Chạm để chụp ảnh". Chưa merge, chưa deploy.

**Khỉ Đột không được tự nhận `DONE`** — chờ Hồ Ly PASS rồi Sếp nghiệm thu.

### CTL-0008 · Cửa sổ bung ra không tự đóng · **P2**

| | |
|---|---|
| Current Owner | **KHỈ ĐỘT** |
| Status | `IN_BUILD` (điều tra nguyên nhân trước, chưa được sửa) |
| Next Owner | HỒ LY (verify) |
| Nhánh | `feature/dong-cua-so`, tách TỪ `feature/gopy-paste-anh` (cùng đụng `app.js`) |
| Risk | MEDIUM — nếu phải làm hàm dùng chung thì thành `CORE_CHANGE`, phải Sếp duyệt |

Bản giao việc: [CTL-0008](requests/CTL-0008-cua-so-khong-tu-dong.md).
Gạo đã loại giả thuyết "quên viết lệnh đóng" — code đã có lệnh đóng. 4 giả thuyết
còn lại phải kiểm bằng trình duyệt thật, không đoán.

### CTL-0007 · Trạm Mục Tiêu chủ động nhắc việc · **P2**

| | |
|---|---|
| Current Owner | **HỒ LY** |
| Status | `IN_ANALYSIS` |
| Next action | Viết `docs/specs/SPEC-0004-tram-muc-tieu-nhac-viec.md` |

Bản giao việc: [CTL-0007](requests/CTL-0007-tram-muc-tieu-chu-dong-nhac-viec.md).
Gạo đã audit: **5 trạng thái + luật chuyển + quá hạn ĐÃ CÓ**. Vấn đề thật là
cron không nhắc việc — hệ thống chỉ ngồi chờ người mở ra xem.

### CTL-0009 · Xác minh mô hình chi phí, sửa SPEC-0002/0003 · **P1**

| | |
|---|---|
| Current Owner | **HỒ LY** |
| Status | `IN_ANALYSIS` |
| Blocker cho | CTL-0002 |

Sếp chốt 27/08: **cấm dùng khoá API tính tiền theo lượng dùng**, chạy bằng gói
Claude Max đã trả. Bãi bỏ giả định ~2 triệu/tháng trong ADR-0005.
Hồ Ly đang xác minh GitHub Actions có chạy được bằng gói thuê bao không —
**nếu không, kiến trúc quay về phương án chạy trên máy Sếp.**
Xem [ADR-0006](decisions/ADR-0006-cong-duyet-va-chi-phi-token.md) mục A4.

### CTL-0003 · Cổng duyệt phân cấp & tái cấu trúc Góp ý ERP · **P1**

| | |
|---|---|
| Current Owner | **HỒ LY** |
| Status | `IN_ANALYSIS` |
| Next Owner | OWNER (chốt các câu Hồ Ly nêu) → KHỈ ĐỘT |
| Next action | Viết `docs/specs/SPEC-0002-cong-duyet-gop-y.md`, trả `ANALYSIS RESULT` |
| Vùng code | `gopYDoiTrangThai()` (`src/index.js:3215`), danh sách góp ý |
| Blocker | **CTL-0006** (cùng người xử lý, không tách) |
| Risk | HIGH — đụng phân quyền + đổi luồng nghiệp vụ đang chạy thật |

Bản giao việc: [CTL-0003](requests/CTL-0003-cong-duyet-va-tai-cau-truc-gop-y.md).

**Xếp P1 vì đây là lỗi toàn vẹn dữ liệu, không phải cải tiến.** Hệ thống báo
"Hoàn thành" khi chưa ai làm gì — mọi báo cáo dựa trên trạng thái góp ý đều
không tin được cho tới khi vá xong.

### CTL-0002 · Runner khép kín vòng lặp trên GitHub Actions · **P2**

| | |
|---|---|
| Current Owner | **HỒ LY** |
| Status | `IN_ANALYSIS` |
| Next Owner | OWNER → KHỈ ĐỘT |
| Next action | Viết `docs/specs/SPEC-0003-runner-vong-lap.md` |
| Blocker | **CTL-0006** — chặn thật, xem bên dưới |
| depends_on | CTL-0003 (phần cột DB) |
| Risk | HIGH — AI sinh code vào repo production + phát sinh chi phí |

Kiến trúc Sếp đã chốt: [ADR-0005](decisions/ADR-0005-vong-lap-khep-kin-github-actions.md).
Chia hai đợt: **CTL-0002a** (file mới, không đụng `gop_y` — chạy song song được)
và **CTL-0002b** (cột DB — chờ CTL-0003 xong, Rule 13).

### CTL-0006 · Runner không ghi được lịch sử · **P1** · `TECHNICAL`

| | |
|---|---|
| Current Owner | **HỒ LY** (gộp vào SPEC-0002 + SPEC-0003, không tách task) |
| Status | `IN_ANALYSIS` |
| Blocker cho | CTL-0002, CTL-0003 |

`gop_y_lich_su.nguoi_doi_id` khai `NOT NULL REFERENCES nhan_su(id)`
(`migrations/them-gopy.sql`). Nghĩa là **runner/Agent không có id hợp lệ nào để
ghi lịch sử chuyển trạng thái** — trong khi SPEC-0003 lại quy định runner là
One Writer duy nhất của trạng thái. Mâu thuẫn trực tiếp.

Đây cũng là lý do Gạo **không tự sửa** nhãn "Hoàn thành" sai của GY-0001: ghi
vào sẽ phải mạo danh một người thật, làm hỏng đúng cái audit trail đang cần chữa.

## Cần Sếp quyết

NONE ngay lúc này. Hồ Ly đang gom các câu cần Sếp chốt, sẽ trình một lần.

## Đã xong

| Ngày | Việc |
|---|---|
| 27/08 | CTL-0005 — gộp 5 nguyên tắc còn thiếu vào Hiến pháp (Rule 13–15, điều cấm 16–20, MBOs, thứ tự ưu tiên khi mâu thuẫn) |
| 27/08 | Gộp tài liệu về một repo `crm-agc` — [ADR-0004](decisions/ADR-0004-control-tower-source-of-truth.md) |
| 27/08 | Kiểm kê mức tự động thật → [AUTOMATION-CURRENT-STATE.md](AUTOMATION-CURRENT-STATE.md) |
| 27/08 | Khoá vai trò 4 bên → [AGENT-ROLES.md](AGENT-ROLES.md) |
| 27/08 | Ánh xạ state machine vào `gop_y` → [REQUEST-WORKFLOW.md](REQUEST-WORKFLOW.md) |
| 27/08 | Ban hành [TEAM-LEAD-PROTOCOL.md](TEAM-LEAD-PROTOCOL.md) |

## Quyết định đã chốt

| ID | Việc | Kết quả |
|---|---|---|
| CTL-0001 | Source of Truth tài liệu | Gộp về `crm-agc` — ADR-0004 |
| CTL-0001b | Mức tự động của Gạo | `ASSISTED` |
| CTL-0002x | Cách chạy vòng lặp | GitHub Actions + `claude-opus-5` cả hai Agent — ADR-0005 |

## Bất thường đang theo dõi

| Việc | Tình trạng |
|---|---|
| GY-0001 trong DB ghi `hoan_thanh` nhưng thực tế đang `IN_BUILD` | Chưa sửa được — chặn bởi CTL-0006. Bảng này giữ trạng thái đúng. |
| Cả Hồ Ly và Khỉ Đột đều được dặn ghi vào `ACTIVE-WORK.md` | Rủi ro mất dòng khi ghi cùng lúc. Gạo đối chiếu lại sau khi cả hai xong. |
| Chưa có gì tự chạy khi Sếp không ngồi máy | Đúng bản chất `SEMI_AUTOMATED`. CTL-0002 là việc gỡ. |
