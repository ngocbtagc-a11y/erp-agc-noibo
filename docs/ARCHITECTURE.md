# Architecture — ERP Alpha Green Commerce

Trang tổng hợp ngắn, trỏ tới đúng tài liệu chi tiết — không chép lại nội
dung đã có ở nơi khác (tránh 2 nguồn dễ lệch nhau).

## Đọc theo thứ tự

1. **[MODULE-MAP.md](./MODULE-MAP.md)** — bản đồ Core/Domain/Integration
   hiện tại: module nào, file nào, API nào, ai sở hữu, phụ thuộc gì.
2. **[docs/audit/AUDIT-KIEN-TRUC.md](./audit/AUDIT-KIEN-TRUC.md)** —
   audit kiến trúc đầy đủ (20-21/08/2026, đã duyệt): sơ đồ hệ thống, silo
   đã phát hiện, target architecture đề xuất (`src/core/` `src/domain/`
   `src/integration/`), roadmap Phase 0-5. Đây là nguồn chi tiết nhất —
   MODULE-MAP.md chỉ là bản tóm tắt cập nhật nhanh từ tài liệu này.
3. **[DATA-DICTIONARY.md](./DATA-DICTIONARY.md)** — entity nào đã có,
   owner, identifier.
4. **[SOURCE-OF-TRUTH.md](./SOURCE-OF-TRUTH.md)** — dữ liệu nào nguồn
   thật ở hệ thống nào.

## Tóm tắt cực ngắn (chi tiết xem MODULE-MAP.md)

Cloudflare Workers (1 Worker) + D1 (SQLite). `src/index.js` là router +
phần lớn business logic (chưa tách module vật lý — rủi ro đã ghi nhận,
xem AUDIT-KIEN-TRUC.md). Các domain đã tách file riêng (`kho.js`,
`taisan.js`, `ca.js`, `shopee.js`, `tiktok.js`, `nhansu.js`, `dulieunen.js`,
`auth.js`, `quyen.js`) là hình mẫu tốt để tách nốt phần còn lại (Phase 2,
chưa bắt đầu, không gấp — xem roadmap trong audit).

Deploy: push `main` → GitHub Actions → `wrangler deploy` (chỉ code).
Migration DB chạy tay riêng — xem
[GIT-WORKFLOW.md](./GIT-WORKFLOW.md).

**Không rewrite architecture trong quá trình dùng governance layer này**
— mọi thay đổi cấu trúc lớn (tách `index.js`, đổi Core) đi qua
[CORE-CHANGE-POLICY.md](./CORE-CHANGE-POLICY.md) như bình thường.
