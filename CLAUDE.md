# CLAUDE.md — erp-agc-noibo

ERP nội bộ Alpha Green Commerce (Cloudflare Workers + D1). Dự án này dùng
mô hình **nhiều người + nhiều Claude Code cùng phát triển, 1 hệ thống
thống nhất** — đọc đủ trước khi code, đừng bỏ qua vì "chỉ là 1 task nhỏ".

## Đọc trước khi code (Session Start Protocol)

Mỗi phiên mới, đọc tối thiểu theo thứ tự:

1. File này (`/CLAUDE.md`)
2. [docs/ERP-CONSTITUTION.md](docs/ERP-CONSTITUTION.md) — 12 nguyên tắc, mô hình vai trò, Architecture Gates
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — sơ đồ hệ thống, trỏ tới audit kiến trúc đầy đủ
4. [docs/DATA-DICTIONARY.md](docs/DATA-DICTIONARY.md) — entity nào đã có, ai sở hữu
5. [docs/SOURCE-OF-TRUTH.md](docs/SOURCE-OF-TRUTH.md) — dữ liệu nào nguồn thật ở đâu
6. [docs/MODULE-MAP.md](docs/MODULE-MAP.md) — Core/Domain/Integration, file nào thuộc đâu
7. [docs/ACTIVE-WORK.md](docs/ACTIVE-WORK.md) — ai đang đụng vùng nào (tránh conflict)
8. [docs/CHANGELOG.md](docs/CHANGELOG.md) — quyết định gần đây

Sau đó trả lời ngắn gọn trước khi code: **Current task · Classification
(LOCAL_DOMAIN/CROSS_DOMAIN/CORE_CHANGE/INTEGRATION_CHANGE) · Affected
domain · Core impact · Conflicts (có trùng ACTIVE-WORK không) · Plan.**

Nếu tiếp quản việc từ Claude khác, đọc
[docs/templates/HANDOFF.md](docs/templates/HANDOFF.md) đã điền (nếu có)
thay vì đọc lại toàn bộ lịch sử chat cũ.

## 6 Architecture Gate — chạy trước khi viết code feature mới

1. **DATA** — dữ liệu này thuộc entity nào? Owner là ai? (tra Data Dictionary)
2. **SOURCE** — Source of Truth ở đâu? (tra Source of Truth, nếu UNDECIDED thì STOP, hỏi trước)
3. **REUSE** — có Core/entity/API/component sẵn dùng được không? (Rule 5 — không tự viết lại nếu đã có, VD `ganCombo()`/`veBang()`/`moHopNhap()` trong `app.js`)
4. **BOUNDARY** — phân loại: `LOCAL_DOMAIN` / `CROSS_DOMAIN` / `CORE_CHANGE` / `INTEGRATION_CHANGE`
5. **HUMAN COST** — làm 100 lần/ngày thì UX thế nào? (xem UX Performance Budget trong Constitution)
6. **HISTORY** — sau khi đổi, lịch sử cũ còn đúng không?

**Quyền tự triển khai theo Boundary** (chi tiết: `docs/ERP-CONSTITUTION.md`):
- `LOCAL_DOMAIN` (không sửa Core, không đổi Source of Truth, không tạo
  duplicate shared data, không ảnh hưởng domain khác, không đổi integration
  contract, không destructive migration) → **tự triển khai, không cần
  ERP Owner duyệt từng chi tiết.**
- `CROSS_DOMAIN` / `CORE_CHANGE` / `INTEGRATION_CHANGE` → **STOP.** Core
  change dùng khung `CORE_CHANGE_PROPOSAL` trong
  [docs/CORE-CHANGE-POLICY.md](docs/CORE-CHANGE-POLICY.md), chờ ERP Owner
  (Sếp) duyệt trước khi code.

### Pre-Code Checklist (bản đầy đủ — 6 Gate ở trên là bản rút gọn)

```
[ ] Business Owner? (ai yêu cầu — Sếp/trưởng phòng/tự phát hiện)
[ ] Problem rõ chưa? (không code khi còn mơ hồ "chắc sẽ tiện hơn")
[ ] Data Owner? (tra DATA-DICTIONARY.md)
[ ] Source of Truth? (tra SOURCE-OF-TRUTH.md, UNDECIDED thì hỏi trước)
[ ] Đã kiểm tra Core/component dùng lại được chưa? (Rule 5)
[ ] Có nguy cơ tạo duplicate data không? (Rule 1)
[ ] Boundary Classification? (LOCAL_DOMAIN/CROSS_DOMAIN/CORE_CHANGE/INTEGRATION_CHANGE)
[ ] Có phải Cross-domain không? (ảnh hưởng domain khác ngoài domain đang sửa)
[ ] Permission đúng vai trò chưa? (src/quyen.js)
[ ] Có cần Audit/lịch sử không?
[ ] Human Cost đạt ngân sách chưa? (UX Performance Budget)
[ ] Có dùng trên mobile không? (ERP là PWA, nhiều thao tác dùng điện thoại)
[ ] Migration cần không, đã viết file chưa?
[ ] Rollback nếu sai — biết cách lùi lại chưa?
[ ] Test plan — test tay flow nào?
[ ] Go-Live Level bắt đầu ở đâu? (DEVELOPMENT/INTERNAL_TEST/PILOT/OFFICIAL)
```

Nếu Boundary là `CORE_CHANGE`/`CROSS_DOMAIN`/`INTEGRATION_CHANGE` →
**STOP FOR ERP OWNER**, không tự code tiếp.

## AI Rules — dữ liệu

- **Không coi chat memory, ví dụ, sample, assumption, hội thoại trước đó
  là Production Data.** Nếu thiếu dữ liệu thật → HỎI, hoặc đánh dấu rõ
  `UNVERIFIED`/`TEST` — không tự chèn vào bảng nghiệp vụ thật.
- Test data theo quy ước [Test Data Policy trong ERP-CONSTITUTION.md](docs/ERP-CONSTITUTION.md#test-data-policy)
  (SĐT dải `090000xxxx`, id prefix `ns_test*`) — tạo trên local trước, nếu
  buộc phải verify trên remote thì **xoá ngay trong cùng phiên**.
- Không tự sinh URL/dữ liệu khách hàng/số liệu tài chính khi không có
  nguồn thật — kể cả để demo.

## Production Safety

Không AI/người nào được tự ý: `DROP`/`TRUNCATE`/mass `DELETE`/destructive
migration/reset dữ liệu production/xoay secret/đổi integration production
khi chưa ERP Owner duyệt. Deploy chỉ qua 1 cửa: merge `main` → GitHub
Actions (xem [docs/GIT-WORKFLOW.md](docs/GIT-WORKFLOW.md)). Migration DB
chạy tay qua `node scripts/chay-migration.mjs <file> [--remote]` — **luôn
chạy `--remote` ngay sau khi deploy code có đổi schema**, đây từng gây sự
cố thật (xem `docs/audit/AUDIT-KIEN-TRUC.md`).

## Trước khi báo hoàn thành 1 task frontend/feature

Xem đủ [docs/DEFINITION-OF-DONE.md](docs/DEFINITION-OF-DONE.md) và
[docs/UX_ENGINEERING_STANDARD.md](docs/UX_ENGINEERING_STANDARD.md) (UX
smell checklist — tự sửa khi thấy, không chờ nhắc, trong phạm vi module
đang đụng tới).

## Bản đồ tài liệu

Governance: [ERP-CONSTITUTION.md](docs/ERP-CONSTITUTION.md) ·
[CORE-CHANGE-POLICY.md](docs/CORE-CHANGE-POLICY.md) ·
[GIT-WORKFLOW.md](docs/GIT-WORKFLOW.md) ·
[DEFINITION-OF-DONE.md](docs/DEFINITION-OF-DONE.md) ·
[ACTIVE-WORK.md](docs/ACTIVE-WORK.md) ·
[CHANGELOG.md](docs/CHANGELOG.md) ·
[decisions/](docs/decisions/)

Kiến trúc/dữ liệu: [MODULE-MAP.md](docs/MODULE-MAP.md) ·
[DATA-DICTIONARY.md](docs/DATA-DICTIONARY.md) ·
[METRIC-DEFINITIONS.md](docs/METRIC-DEFINITIONS.md) ·
[SOURCE-OF-TRUTH.md](docs/SOURCE-OF-TRUTH.md) ·
[DATA_OWNERSHIP_MATRIX.md](docs/DATA_OWNERSHIP_MATRIX.md) ·
[FIELD_OWNERSHIP_MATRIX.md](docs/FIELD_OWNERSHIP_MATRIX.md) ·
[ENTITY_IDENTITY.md](docs/ENTITY_IDENTITY.md) ·
[PERMISSION_ARCHITECTURE.md](docs/PERMISSION_ARCHITECTURE.md)

UX: [UX_ENGINEERING_STANDARD.md](docs/UX_ENGINEERING_STANDARD.md) ·
[LIST_UX_AUDIT.md](docs/LIST_UX_AUDIT.md)

Templates: [BUSINESS-REQUEST.md](docs/templates/BUSINESS-REQUEST.md) ·
[FEATURE-SPEC.md](docs/templates/FEATURE-SPEC.md) ·
[CHANGE-REQUEST.md](docs/templates/CHANGE-REQUEST.md) ·
[BUG-REPORT.md](docs/templates/BUG-REPORT.md) ·
[HANDOFF.md](docs/templates/HANDOFF.md)

Người mới/trưởng phòng bắt đầu từ [docs/START-HERE.md](docs/START-HERE.md)
(không kỹ thuật, 10 phút).

Audit gốc (2026-08-20/21, đã duyệt, vẫn là nguồn chi tiết nhất cho từng
mảng): [docs/audit/](docs/audit/) — kiến trúc, go-live/master data,
UX/UI, import/document, hiệu năng/lưu trữ.

## Nguyên tắc cuối cùng

Không mặc định tạo bureaucracy nặng. Mục tiêu là **tăng tốc**, không phải
thêm thủ tục — 80% thay đổi nghiệp vụ cục bộ nên tự triển khai được trong
guardrail, chỉ 20% đụng Core/Cross-domain/Integration mới cần ERP Owner.
Khi không chắc 1 việc thuộc nhóm nào, đọc kỹ hơn là đoán — nhưng cũng đừng
biến việc nhỏ thành quy trình lớn.
