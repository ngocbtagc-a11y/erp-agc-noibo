# Feature Spec — dành cho Developer/Claude

Chuyển 1 [BUSINESS-REQUEST.md](./BUSINESS-REQUEST.md) đã nhận thành spec
kỹ thuật trước khi code. Điền đủ trước khi bắt đầu — đây chính là nơi
Architecture Gate (`docs/ERP-CONSTITUTION.md`) được trả lời bằng văn bản.

---

## Problem
(Từ Business Request — diễn đạt lại bằng ngôn ngữ kỹ thuật nếu cần)

## Current flow
(Đang làm thế nào — kể cả nếu đang làm tay ngoài ERP)

## Proposed flow
(Sau khi có feature, làm thế nào)

## Actors
(Vai trò nào thao tác — theo đúng `src/quyen.js`, không tự đặt vai trò mới)

## Data
(Entity nào liên quan — tra `docs/DATA-DICTIONARY.md` trước khi viết)

## Source of Truth
(Tra `docs/SOURCE-OF-TRUTH.md` — nếu UNDECIDED, đây là điểm STOP, hỏi
trước khi code phần phụ thuộc)

## Core reuse
(Đã kiểm tra Core hiện có chưa — API/component/bảng nào tái dùng được,
xem `docs/MODULE-MAP.md` mục CORE)

## New Domain data
(Bảng/field mới thuộc riêng domain này — không đụng Core)

## Permissions
(Vai trò nào xem/sửa được — cập nhật `src/quyen.js` nếu cần, ghi rõ ở đây)

## Happy path
(Luồng bình thường — phải NHANH, đúng Rule 4)

## Exception path
(Ngoại lệ — mới mở thêm field/lý do/duyệt, đúng Rule 4)

## SLA
(Nếu có — thời hạn xử lý)

## Audit
(Có cần biết "ai/khi nào" không — dùng pattern nào)

## UX
(Search/Filter/Sort có cần không — xem ngưỡng ở
`docs/UX_ENGINEERING_STANDARD.md`)

## Human Cost
(Tần suất dùng × số thao tác — so với UX Performance Budget trong
`docs/ERP-CONSTITUTION.md`. Nếu vượt ngân sách, giải thích lý do ở đây)

## Acceptance Criteria
(Cụ thể, đo được — Key User dùng cái này để xác nhận DONE)

## Migration
(File `.sql` cụ thể nếu có, chạy local trước)

## Risk
(Rủi ro thật — không liệt kê hình thức)

## Rollback
(Nếu sai thì lùi lại bằng cách nào)

## Rollout
(PILOT trước hay OFFICIAL ngay — xem Go-Live Level,
`docs/DEFINITION-OF-DONE.md`)

## Boundary Classification
`LOCAL_DOMAIN` / `CROSS_DOMAIN` / `CORE_CHANGE` / `INTEGRATION_CHANGE`
— xem `docs/ERP-CONSTITUTION.md` để biết cần ERP Owner duyệt trước hay
được tự triển khai.
