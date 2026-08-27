# ADR-0005 — Khép kín vòng lặp phát triển bằng GitHub Actions

- **Ngày**: 2026-08-27
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc
- **Trạng thái**: ĐÃ DUYỆT
- **Yêu cầu liên quan**: [CTL-0002](../requests/CTL-0002-vong-lap-khep-kin.md)

## Bối cảnh

Việc giao cho Khỉ Đột đang phải làm tay: `scripts/lenh-khidot.mjs` chỉ in ra
đoạn lệnh, Sếp tự dán sang phiên Claude Code khác. Sếp yêu cầu bỏ hẳn khâu này.

Đã kiểm chứng trên máy 2026-08-27:
- Claude Code CLI **chưa được cài** (`claude` không có trên PATH; npm global
  chỉ có `docx` và `wrangler`).
- Repo **đã ở GitHub**: `ngocbtagc-a11y/erp-agc-noibo`.
- GitHub Actions **đã chạy thật**: `.github/workflows/deploy.yml`, deploy
  Cloudflare bằng `CLOUDFLARE_API_TOKEN` trong GitHub Secrets.

## Quyết định

### 1. Chạy vòng lặp trên GitHub Actions

Không phụ thuộc máy Sếp bật hay tắt. Tận dụng hạ tầng CI đã chạy ổn định.
Cần thêm `ANTHROPIC_API_KEY` vào GitHub Secrets — phát sinh chi phí API thật,
tách khỏi gói Claude Code hàng tháng.

### 2. Dùng Claude Opus 5 cho cả Hồ Ly và Khỉ Đột

Model ID: `claude-opus-5`.
Lý do Sếp chọn: ERP đang chạy thật cho 20 người, sửa sai tốn hơn tiền tiết kiệm.

Ước tính ban đầu: **~2 triệu đồng/tháng** với ~20 việc/tháng. Đây là **ước tính,
chưa phải số đo**. Bắt buộc đo bằng 3 việc đầu tiên rồi báo Sếp con số thật.

### 3. Ba cổng người không được bỏ

1. Quản lý trực tiếp duyệt (CTL-0003).
2. Sếp duyệt theo ngưỡng rủi ro (CTL-0003).
3. Sếp nghiệm thu và merge Pull Request.

**AI không bao giờ tự merge vào `main`** — `main` nối thẳng vào deploy
production. Pull Request là ranh giới cứng.
Việc rủi ro `HIGH` không bao giờ vào vòng tự động.

### 4. Runner ra đời ở trạng thái PAUSED

Xây xong runner **không bật ngay**. `AUTOMATION_MODE` mặc định `PAUSED` cho
tới khi CTL-0003 (cổng duyệt) đã chạy thật. Hiến pháp điều 16: không tự động
hoá một process chưa hiểu đủ — hiện trạng thái góp ý còn bấm được tuỳ ý,
bật tự động lúc này là tự động hoá một quy trình đang hỏng.

## Hệ quả

- Cần `ANTHROPIC_API_KEY` trong GitHub Secrets (Sếp tự tạo, Gạo không xử lý khoá).
- Cần đẩy code lên GitHub thường xuyên hơn — runner đọc từ `origin/main`.
- Chi phí hàng tháng phát sinh; phải có `MAX_COST_PER_REQUEST` chặn cứng.
- Còn đúng **2 lần dán tay** để mồi hệ thống, sau đó không còn.

## Phương án đã loại

- **Máy Sếp chạy nền (Claude Code CLI + Task Scheduler)**: không tốn tiền API
  nhưng máy phải bật 24/7; tắt máy hay mất điện là vòng lặp đứng. Với ERP đang
  chạy thật cho 20 người, điểm yếu này không chấp nhận được. Ngoài ra chưa xác
  minh được CLI chạy nền không cần người bấm duyệt từng thao tác.
