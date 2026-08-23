# ERP Constitution — Alpha Green Commerce

Có hiệu lực từ 23/08/2026. Đây là luật chơi chung khi ERP chuyển từ "1 người
code" sang "nhiều người + nhiều Claude Code cùng phát triển". Đọc cùng
[START-HERE.md](./START-HERE.md) (dành cho người mới/trưởng phòng) và
[/CLAUDE.md](../CLAUDE.md) (dành cho AI agent).

**Nguyên tắc cuối cùng của toàn bộ tài liệu này** (đọc trước khi đọc 12 rule):
ERP phát triển theo mô hình **Central Architecture + Distributed Business
Ownership**. ERP Owner giữ luật chơi. Domain Owner (trưởng phòng) giữ
nghiệp vụ. Developer/Claude xây giải pháp. Key User xác nhận thực tế. Core
dùng chung, Domain phát triển nhanh, Production có một cửa kiểm soát. Mục
tiêu: **80% thay đổi nghiệp vụ cục bộ team tự triển khai trong guardrail,
chỉ 20% (đụng Core/Cross-domain/Integration) mới cần ERP Owner**. Governance
này phải làm ERP **dễ phát triển hơn** khi thêm người, không phải khó hơn.

---

## Mô hình tổ chức

| Vai trò | Là ai | Sở hữu | Không sở hữu |
|---|---|---|---|
| **ERP Owner** | Sếp (Nguyễn Duy Phong) — duy nhất | Source of Truth, Shared Core, kiến trúc cross-domain/integration/permission, go-live, thay đổi ảnh hưởng toàn công ty | — |
| **Domain Owner** | Trưởng phòng (4 phòng: Ban Giám đốc / Kho Vận-Sản Xuất / Kinh Doanh-MKT / Support) | business rules, nghiệp vụ thực tế, trạng thái nghiệp vụ, SLA, yêu cầu form, báo cáo phòng, acceptance criteria | architecture chung |
| **Developer Agent** | Claude Code A/B, developer khác | đọc toàn repo, phát triển Domain, reuse Core, viết test, đề xuất migration, refactor cục bộ | Source of Truth, Core, Auth, Permission architecture, integration contract, destructive migration production, deploy chưa qua gate |
| **Key User** | Nhân viên nghiệp vụ thật | test, phản hồi, xác nhận flow/dữ liệu/UX | kiến trúc/code |

Domain Owner tương ứng đúng cơ chế `phong_ban.truong_phong_id` đã có trong
hệ thống (xem [DATA_OWNERSHIP_MATRIX.md](./DATA_OWNERSHIP_MATRIX.md)) — không
cần bảng quyền mới, chỉ cần quy ước ai được coi là Domain Owner của domain nào
(xem [MODULE-MAP.md](./MODULE-MAP.md)).

---

## 12 nguyên tắc

### Rule 1 — One Fact, One Owner
Một dữ liệu chỉ có một nơi sở hữu; nơi khác chỉ reference. Nếu sửa 1 thông
tin mà phải sửa thêm nơi thứ hai để khớp → **FAIL**. Đã áp dụng tốt: `nhan_su`
là nguồn duy nhất cho nhân sự (không có `warehouse_employee`/`hr_employee`
thứ hai) — xem [DATA_OWNERSHIP_MATRIX.md](./DATA_OWNERSHIP_MATRIX.md).

### Rule 2 — Enter Once, Reuse Everywhere
ERP đã biết thì không hỏi nhập lại. Ưu tiên reference/auto-fill/mapping/
default/automation. Ví dụ đã áp dụng: dropdown "Quản lý trực tiếp" tự ưu
tiên người cùng phòng ban thay vì bắt chọn lại từ đầu toàn công ty.

### Rule 3 — Delete Before Automate
Trước khi tối ưu 1 bước, hỏi "bước này có cần tồn tại không?". Thứ tự:
**DELETE → AUTOMATE → DEFAULT → SIMPLIFY**.

### Rule 4 — Normal Flow Fast, Exception Flow Detailed
Trường hợp bình thường phải cực nhanh. Ngoại lệ mới mở thêm field/lý do/
bằng chứng/duyệt. Ví dụ đã áp dụng: luồng Đơn hoàn 3 chặng — nhận đủ hàng
là xong ngay, chỉ "Cần khiếu nại" mới mở thêm bước.

### Rule 5 — Reuse → Extend → Create
Trước khi tạo table/entity/API/component/workflow/permission mới, PHẢI
search xem đã có equivalent chưa. Xem [DATA-DICTIONARY.md](./DATA-DICTIONARY.md)
trước khi tạo entity mới, xem `ganCombo()`/`veBang()`/`moHopNhap()` trong
`app.js` trước khi tự viết component mới (Rule này đã áp dụng suốt phiên
23/08/2026 khi làm searchable combobox).

### Rule 6 — Domain Owns Business Rules, Core Owns Shared Structure
Phòng ban quyết nghiệp vụ. Core quyết cấu trúc dùng chung. Domain Owner
không cần hiểu schema DB để yêu cầu tính năng — dùng
[templates/BUSINESS-REQUEST.md](./templates/BUSINESS-REQUEST.md).

### Rule 7 — Users See Work, Not Software
UI tổ chức theo công việc người dùng cần làm, không bắt hiểu database/
entity/module/technical workflow. Xem
[UX_ENGINEERING_STANDARD.md](./UX_ENGINEERING_STANDARD.md).

### Rule 8 — Traceable & Recoverable
Mọi thay đổi production quan trọng phải traceable, auditable, recoverable.
Hiện tại: git log (message chi tiết, có ngày/người chốt), `lich_su_thay_doi_nen`
(Data Lock), ledger bất biến (`giao_dich_kho`, `*_lich_su`). Core còn thiếu
Audit Log dùng chung — xem `AUDIT-KIEN-TRUC.md` Phase 3 (chưa làm, không gấp).

### Rule 9 — No Unverified Data Becomes Truth
AI memory, chat, ví dụ, test, demo, import chưa xác minh **không được tự
trở thành Production Master Data**. Xem thêm mục "AI Rules" trong
[/CLAUDE.md](../CLAUDE.md) và [Test Data Policy](#test-data-policy) dưới đây.

### Rule 10 — History Must Survive Change
Process/Document/Rule/Configuration/KPI/Master Data quan trọng khi đổi
phải giữ lịch sử cần thiết — không overwrite mù quáng. Đã áp dụng: mã nhân
sự bất biến kể cả khi đổi phòng ban (xem
[ENTITY_IDENTITY.md](./ENTITY_IDENTITY.md)), Data Lock ghi
`lich_su_thay_doi_nen` khi sửa dữ liệu đã khoá.

### Rule 11 — Cross-Department = One End-to-End Process
1 case xuyên nhiều phòng ban phải có 1 Process Instance xuyên suốt, không
để mỗi phòng tự tạo workflow riêng cho cùng 1 case. Đã áp dụng đúng: Đơn
hoàn 3 chặng (Kho → Vận hành sàn → Kế toán) là 1 bản ghi `don_hoan` xuyên
suốt, không phải 3 bảng riêng — dù `AUDIT-KIEN-TRUC.md` đã chỉ ra bảng này
đang gánh hơi nhiều vai trò trong 1 bảng (Phase 2 tương lai mới tách).

### Rule 12 — Human Cost Test
Trước go-live 1 feature: nếu user làm thao tác này 100 lần/ngày thì sao?
Tính: click, gõ, tìm, scan, điều hướng, chờ, copy/paste, sức nghĩ. Feature
làm tăng human effort mà không giảm lỗi/rủi ro tương ứng → **REJECT hoặc
REDESIGN**. Xem ngân sách cụ thể ngay dưới đây.

---

## UX Performance Budget (Frequent Action Budget)

| Tần suất | Mục tiêu số thao tác chính |
|---|---|
| 100 lần/ngày | ≤ 3 |
| 20–100 lần/ngày | ≤ 5 |
| 5–20 lần/ngày | ≤ 7 |
| Hiếm dùng | có thể chi tiết hơn |

Không phải luật cứng toán học — vượt ngân sách thì Developer phải giải
thích lý do trong Feature Spec (mục Human Cost). Đã ban hành song song ở
[UX_ENGINEERING_STANDARD.md](./UX_ENGINEERING_STANDARD.md) (ngưỡng dropdown,
danh sách UX smell) — 2 tài liệu bổ sung nhau, không mâu thuẫn.

---

## Test Data Policy

Chưa cần hạ tầng tách môi trường phức tạp (Cloudflare/D1 ở quy mô này chưa
cần). Quy ước tối thiểu, đã dùng thực tế trong phiên phát triển:

- Test account/nhân sự dùng SĐT dải `090000xxxx` (không trùng SĐT thật) và
  `id` prefix `ns_test*`/`ns_uxtest*` — dễ lọc, dễ xoá.
- Test data tạo trên **local D1** (`--local`, không `--remote`) khi có thể.
  Chỉ tạo trên remote khi cần verify hành vi thật, và **phải xoá ngay sau
  khi verify xong** trong cùng phiên (đã là thói quen áp dụng suốt phiên
  23/08/2026).
- Test data KHÔNG được tính vào Headcount/Inventory/Revenue/KPI/Report —
  vì tách bằng quy ước prefix/dải số nên các báo cáo lọc theo điều kiện
  thật (VD SĐT không thuộc dải test) khi cần loại trừ.
- Nếu về sau cần tách mạnh hơn (nhiều người test đồng thời), cân nhắc thêm
  cột `la_du_lieu_test INTEGER DEFAULT 0` — chưa tạo trước khi có nhu cầu
  thật (đúng Rule 5).

---

## Feature Flags (đề xuất nhẹ, chưa xây)

Không xây platform feature-flag doanh nghiệp. Khi cần bật/tắt 1 feature
theo role/user trong lúc PILOT, dùng đúng cơ chế quyền đã có
(`src/quyen.js`, `duocXemTab`) — thêm 1 điều kiện nhỏ thay vì hệ thống mới.
Ví dụ: module đang PILOT chỉ thêm vào tab-list của vai trò đang test, các
vai trò khác không thấy tab — không cần bảng `feature_flags` cho tới khi
có ≥2 feature cần bật/tắt độc lập với vai trò (lúc đó mới đáng 1 bảng
`feature_flags(ten, bat, doi_tuong)` đơn giản).
