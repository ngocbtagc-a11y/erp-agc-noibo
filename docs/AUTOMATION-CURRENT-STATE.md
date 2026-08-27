# MỨC TỰ ĐỘNG THẬT — ERP AGC

> Kiểm kê ngày **2026-08-27** bởi GẠO, đọc trực tiếp code tại
> `C:\Users\Admin\Desktop\AI\crm-agc`. Không suy đoán.
>
> **AUTOMATION LEVEL TỔNG THỂ = `SEMI_AUTOMATED`**
> **GẠO WORK MODE = `MANUAL`** (chưa có runner tự gọi Agent)

## Cập nhật 2026-08-27 — CTL-0002a đã build xong, MỨC TỰ ĐỘNG **KHÔNG ĐỔI**

Khỉ Đột đã dựng xong Đợt A của SPEC-0003 trên nhánh `feature/ctl-0002a-runner`.
Phải nói thẳng để không ai đọc nhầm:

**Ba khoảng trống `AUTOMATION_GAP #1/#2/#3` dưới đây VẪN CÒN NGUYÊN.**
Code runner đã tồn tại nhưng **chưa có một dòng nào chạy thật**:

| Thứ | Trạng thái thật |
|---|---|
| `src/runner.js` | Đã viết, **chưa được `src/index.js` import** → không nằm trong bản deploy |
| `scheduled()` cron `*/5` | **Chưa** gọi `runner.quetViec()` |
| Route `/api/runner/ket-qua` | **Chưa tồn tại** |
| `.github/workflows/agent-runner.yml` | Đã có, **chỉ chạy khi người bấm tay** (không `push`, không `schedule`) → 0 phút Actions |
| 2 bảng mới (`cau_hinh_he_thong`, `agent_run`) | Migration đã viết, **chưa chạy** trên bản thật |
| `AUTOMATION_MODE` | Khi chạy migration sẽ là **`PAUSED`**. Không có đường code nào tự bật |
| 11 cột trên `gop_y` | **Chưa có** → `quetViec()` tự kiểm lược đồ và nằm im nếu thiếu |

Nói cách khác: **nhánh này chưa merge thì hệ thống y như cũ; merge rồi thì
vẫn y như cũ cho tới khi Đợt B nối dây và Sếp tự tay bật.**

Điều kiện nghiệm thu Đợt A: bấm chạy tay `agent-runner.yml` ở chế độ `kho`,
Agent chạy thật, sinh spec thật, in số đo thật — **không ghi DB, không mở PR**.
Việc này **chưa làm** (cần `CLAUDE_CODE_OAUTH_TOKEN` trong GitHub Secrets).

## Bảng kiểm kê

| Bước trong luồng | Mức thật | Bằng chứng | Ghi chú |
|---|---|---|---|
| Nhân viên gửi góp ý | `AUTOMATED` | `POST /api/gop-y` (`src/index.js`) | Box "Góp ý & Cải tiến ERP", mở cho mọi vai trò |
| Hồ Ly TRIAGE Tier 1 (phân loại + risk + nháp spec) | `AUTOMATED` | `hoLyTuDongTriage()` chạy trong cron `*/5 * * * *`, model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | **Shadow mode** — chỉ ghi cột `de_xuat_*`, KHÔNG đổi `trang_thai` thật |
| Áp dụng kết quả triage | `MANUAL` | Admin bấm "Áp dụng đề xuất" → chỉ điền sẵn form → phải bấm "Lưu" | Đúng Owner Gate, cố ý giữ |
| Hồ Ly phân tích sâu / viết Feature Spec đầy đủ | `MANUAL` | Người mở một phiên Claude Code riêng | Không có runner |
| Giao việc cho Khỉ Đột | `MANUAL` | `scripts/lenh-khidot.mjs <id>` chỉ **in ra** đoạn lệnh, Sếp tự dán vào phiên mới | **AUTOMATION_GAP #1** |
| Khỉ Đột code / build / test | `MANUAL` | Phiên Claude Code do người mở | |
| Hồ Ly review sau build | `MANUAL` | Sếp tự đưa handoff cho Hồ Ly | **AUTOMATION_GAP #2** |
| Fix loop (FIX_REQUIRED → build lại) | `MANUAL` | Không có bộ đếm vòng lặp | **AUTOMATION_GAP #3** — chưa có `MAX_FIX_LOOPS` |
| Cập nhật trạng thái yêu cầu | `MANUAL` | Admin đổi tay trên UI (`gopYDoiTrangThai`) | Có ghi lịch sử `gop_y_lich_su` |
| Báo Telegram 6 mốc milestone | `AUTOMATED` (**UNVERIFIED**) | `guiTelegram()` — `src/index.js` | Chỉ chạy nếu secret `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` đã đặt; thiếu thì **im lặng trả false**, không báo lỗi. Cần xác minh. |
| Đồng bộ đơn hoàn Shopee/TikTok | `AUTOMATED` | cron `*/5 * * * *` | Không liên quan orchestration |
| Deploy | `SEMI_AUTOMATED` | merge `main` → GitHub Actions | Migration DB vẫn chạy tay |

## Điều KHÔNG được nói

Không được gọi hệ thống hiện tại là `AUTOMATED`. Cụ thể:

- Gạo **không** có khả năng tự khởi chạy một phiên Hồ Ly hay Khỉ Đột.
- Không có Request Queue, không có Agent Job/Runner, không có Agent Run log.
- Trạng thái không tự chuyển sau khi Agent làm xong — người phải bấm.
- Không có `KILL_SWITCH`, không có `AUTOMATION_MODE` lưu trong DB.
- Không có kiểm soát `MAX_COST_PER_REQUEST` / `MAX_RUNTIME_PER_JOB`.

## Hạ tầng đã sẵn có (dùng lại được, đừng xây mới)

- Cloudflare Workers + D1, cron `*/5 phút` **đã chạy**.
- Workers AI binding `[ai]` **đã bật**, 0 credential mới, đang dùng thật.
- Bảng `gop_y` + `gop_y_lich_su` + 12 trạng thái **đã trùng khớp** state
  machine mà Control Tower cần (xem [REQUEST-WORKFLOW.md](REQUEST-WORKFLOW.md)).
- `guiThongBao()` (chuông trong app) + `guiTelegram()` (kênh ops).
- Cột `nguoi_phu_trach_id`, `spec_reference` **đã có sẵn** trong `gop_y`.

→ Kết luận theo Hiến pháp điều 3 và 4: Control Tower phải là **EXTEND `gop_y`**,
tuyệt đối **không tạo hệ thống request thứ hai**.
