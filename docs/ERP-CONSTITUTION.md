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
| **ERP Owner** | **Nguyễn Duy Phong** và **Bùi Thị Ngọc** — **NGANG QUYỀN** (chốt 27/08/2026) | Source of Truth, Shared Core, kiến trúc cross-domain/integration/permission, go-live, thay đổi ảnh hưởng toàn công ty | — |
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

**UI State Consistency** (bổ sung 23/08/2026): mọi mutation thành công
(Create/Update/Complete/Approve/Reject/Assign/Archive/Cancel/Delete) phải
làm mới ngay mọi vùng UI đang hiển thị dữ liệu bị ảnh hưởng — không bắt
user F5 để thấy đúng trạng thái, không dùng `window.location.reload()` làm
mặc định. Feature chưa tính DONE nếu còn chỗ nào chỉ đúng sau khi F5. Cách
làm cụ thể (naming convention `window.LAM_MOI_*`, Mutation Impact Map, khi
nào cần double-submit guard): xem
[UX_ENGINEERING_STANDARD.md § UI State Consistency](./UX_ENGINEERING_STANDARD.md#ui-state-consistency--sau-mutation-không-được-bắt-f5).

**Cross-User Freshness** (bổ sung 27/08/2026 — Sếp Ngọc):

> *"những trạng thái này sẽ tự động cập nhật sang màn hình của cấp trên khi
> nhân viên đã nhận việc, ko cứ là phải load lại"*

Điều bổ sung 23/08 chỉ lo **màn hình của chính người vừa bấm**. Chưa đủ.

**Người A đổi trạng thái thì màn hình người B đang mở phải tự đúng theo, không
bắt B bấm F5.** Áp cho mọi dữ liệu dùng chung nhiều người: công việc, mục tiêu,
góp ý, đơn hoàn, tồn kho, phân ca, thông báo.

Câu hỏi bắt buộc khi thiết kế **mọi** tính năng có dữ liệu nhiều người cùng xem:

> *"Người khác đổi cái này thì màn hình tôi đang mở có tự đúng theo không,
> hay tôi phải F5?"*

Trả lời "phải F5" là **chưa xong**, kể cả khi mọi thứ khác đã chạy.

**Cách làm — rẻ trước, không đánh đổi bằng tiền:**

1. Dùng cách **rẻ nhất còn đủ tươi**. Với ERP 20 người, hỏi lại theo nhịp là đủ:
   một đường gọi cực nhẹ trả về **dấu mốc thay đổi**, chỉ tải lại dữ liệu thật
   khi dấu mốc đổi.
2. **Chỉ hỏi khi tab đang hiện** — tab ẩn thì dừng hẳn. Đây là chốt tiết kiệm
   lớn nhất.
3. **Không** dùng kết nối thường trực (WebSocket/Durable Objects) khi hỏi theo
   nhịp còn đủ — đó là đường dẫn thẳng ra khỏi hạn mức miễn phí.
4. Tính trước số lượt gọi mỗi ngày, đối chiếu hạn mức miễn phí, ghi con số vào
   Feature Spec. Không ước lượng bằng cảm tính.
5. Người dùng phải **thấy dữ liệu vừa đổi**, không được lặng lẽ thay số dưới
   tay họ khi đang thao tác dở.

**Information Design — cột nào được lên màn** (bổ sung 27/08/2026 — Sếp Ngọc):

> *"khi thiết kế layout thì luôn ưu tiên trải nghiệm người dùng thật, các tab
> nên hiển thị được các thông tin cơ bản nhất."*

**Luật: một cột chỉ được lên màn nếu nó trả lời một câu hỏi người dùng mang tới
TRƯỚC khi bấm vào.** Phải bấm mở ra mới biết thì cột đó là trang trí.

Cách chọn cột — 4 bước, làm theo thứ tự:

1. **Ai mở màn này, để làm gì?** Khác vai trò thì khác cột. HCNS mở tab Nhân sự
   khác hẳn nhân viên mở tab Nhân sự.
2. **Họ mang câu hỏi gì tới?** Viết ra 3–5 câu hỏi thật, bằng lời người dùng.
3. **Mỗi cột = câu trả lời cho một câu hỏi.** Không có câu hỏi tương ứng →
   **không có cột**.
4. **Một dòng phải đủ để quyết định có cần mở ra không.** Nếu ai cũng phải mở
   từng dòng mới biết gì, danh sách đó thất bại.

**Ngân sách cột — chọn cho điện thoại TRƯỚC:**
ERP là PWA, kho và HCNS dùng điện thoại. Màn nhỏ chứa được **3–4 trường**.
Chọn 3–4 cột sống còn trước, rồi mới thêm cột cho màn to — **không** làm ngược
lại rồi cắt bớt.

**Exception-First**: cái bất thường phải **thấy được ngay mà không cần lọc** —
hợp đồng quá hạn, việc trễ, tài sản mất. Người dùng không phải đi tìm vấn đề.

**Cấm**: đưa cột lên chỉ vì "dữ liệu có sẵn" hoặc "cho đầy đủ". Mỗi cột thừa
làm ba cột quan trọng khó thấy hơn.

Cơ chế danh sách *(tìm kiếm, lọc, sắp xếp, phân trang, trạng thái rỗng)*:
xem [LIST_UX_AUDIT.md](./LIST_UX_AUDIT.md) — **hai thứ khác nhau, đừng trộn**.

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

## Dashboard Rules

Chốt 23/08/2026 (audit [docs/audit/AUDIT-HOME-DASHBOARD.md](./audit/AUDIT-HOME-DASHBOARD.md)):
Home không phải nơi trưng bày dữ liệu — Home là nơi bắt đầu công việc,
Dashboard là nơi hỗ trợ quyết định. Metric không dẫn tới quyết định hoặc
hành động thì không nên xuất hiện. ERP càng dùng lâu càng phải ít nhiễu
hơn, không nhiều biểu đồ hơn.

- **D1 — Actionable over informative.** Mỗi card/metric phải trả lời:
  có vấn đề gì, mức độ, ai chịu trách nhiệm, có cần hành động, click vào
  đâu để xử lý. Không đưa số lên chỉ vì có dữ liệu.
- **D2 — Role-based, not one-size-fits-all.** Employee = Action First
  (việc cần làm của mình). Manager = Exception First (ngoại lệ/backlog/
  SLA của phòng mình quản lý — xác định qua `phong_ban.truong_phong_id`,
  KHÔNG qua vai_tro hệ thống, vì trưởng phòng thật có thể không giữ vai
  trò hệ thống cao). CEO/Admin = Decision First (vấn đề cần quyết định
  trước, không phải chart đẹp trước).
- **D3 — Exception first.** Bình thường phải "yên" — ưu tiên hiển thị
  quá hạn/blocked/thiếu dữ liệu/chênh lệch/lỗi/chờ duyệt, không biến mọi
  card thành đỏ/vàng.
- **D4 — One metric, one definition.** Một metric chỉ một định nghĩa —
  khác định nghĩa thì khác tên. Xem [METRIC-DEFINITIONS.md](./METRIC-DEFINITIONS.md).
  Không copy logic tính toán ở nhiều nơi — dùng lại đúng 1 nguồn/hàm.
- **D5 — Drill down to action.** Counter/cảnh báo quan trọng phải bấm
  được: Metric → Filtered List/Lịch sử → Record → Action, giữ context
  khi quay lại. Không để dashboard là ngõ cụt.
- **D6 — No dashboard without a decision.** Trước khi đưa 1 KPI lên
  dashboard: Ai xem? Xem bao lâu 1 lần? Số xấu thì làm gì? Số tốt thì làm
  gì? Không trả lời được thì không đưa lên. Không phải phòng ban nào
  cũng cần Dashboard — domain ít giao dịch/backlog/SLA thì Work
  Queue/List là đủ (xem MODULE-MAP.md).

## Contextual Creation Rule (Quick Create Policy)

Chốt 23/08/2026, chuẩn hoá lại 23/08/2026 (audit đầy đủ + phân loại từng
entity theo template mới: [docs/audit/AUDIT-QUICK-CREATE-POLICY.md](./audit/AUDIT-QUICK-CREATE-POLICY.md)).

> Every reference dropdown must help the user resolve a missing value
> without leaving the current workflow. Low-risk Master Data may be
> created inline. Controlled Master Data may be created inline subject
> to permission, validation and verification. High-risk Master Data
> must use Request Create. Fixed enums and system states are never
> user-extensible through Quick Create.

**Make common things fast, but make dangerous things deliberate** —
không phải dropdown nào cũng nên cho "+ Tạo mới" ngay tại chỗ, và "mọi
dropdown có action" KHÔNG có nghĩa "mọi user được tạo mọi loại dữ liệu".

Mỗi entity tham chiếu qua dropdown phải xếp vào đúng 1 trong 4 mode,
đánh giá theo: đây là enum hay Master Data? ai là Data Owner? tạo sai có
ảnh hưởng tiền/tồn/quyền không? có Source of Truth ngoài không? duplicate
nguy hiểm mức nào? user có thường phát hiện thiếu record ngay trong flow
này không? mini-form có thể ≤5 field không?

- **CREATE_DIRECT** (= "ALLOWED" ở audit gốc) — rủi ro thấp, tần suất
  cao, người bấm vào dropdown vốn đã đúng là Data Owner của entity đó.
  VD: Danh mục/Vị trí tài sản, Chức danh — **đã triển khai**.
- **CREATE_CONTROLLED** (= "CONTROLLED") — cho tạo ngay trong dropdown
  nhưng cần thêm permission/duplicate validation, có thể ở trạng thái
  nháp/chờ xác nhận thay vì Active ngay. VD: Phòng ban, Đơn vị tính, Nhà
  cung cấp — **chưa triển khai, Phase 2**.
- **REQUEST_ONLY** (= "FORBIDDEN" nhưng có action, không phải ngõ cụt) —
  entity nhạy cảm (lương/tài khoản/quyền/giá vốn/kế toán) — không tạo
  trực tiếp từ dropdown; ưu tiên route user tới đúng màn tạo đầy đủ (đã
  có sẵn cho Nhân sự/SKU) thay vì thêm nút "+ Đề xuất" chưa có nhu cầu
  thật. VD: Nhân sự, Vai trò, Sản phẩm/SKU chính thức — **chưa cần xây
  hạ tầng request/approve, thiết kế đã ghi lại trong audit khi cần**.
- **NO_CREATE_NEEDED** — enum cố định/system state (Trạng thái, Tình
  trạng, Loại lao động, Giới tính, Ưu tiên...) — KHÔNG phải Master Data,
  không bao giờ Quick Create dù dropdown đó searchable. Nhầm enum thành
  Master Data là lỗi thiết kế, không phải thiếu tính năng.

**Không free-text fallback**: field tham chiếu Master Data mà user không
tìm thấy thì phải tạo đúng Master record (CREATE_DIRECT/CONTROLLED) hoặc
route tới đúng nơi (REQUEST_ONLY) — không lưu chuỗi tự do vào field đáng
lẽ là reference (đã phát hiện vi phạm thật: `kvNhapNCC`, `tsThemNCC`/
`tsSuaNCC` — Nhà cung cấp đang là ô nhập tay, chưa sửa, xem audit mục I).

**Component dùng chung**: `ganCombo()` hỗ trợ tham số `taoMoi` tuỳ chọn
(`{xuLyTao, capNhatDs}`) — không tạo component Quick Create riêng từng
màn, không xây bảng config tập trung khi lời gọi tại chỗ đã đủ rẻ (xem
audit mục H). Chỉ bật cho entity đã phân loại CREATE_DIRECT/CONTROLLED —
mặc định KHÔNG có quick create, phải tự quyết định bật, và KHÔNG BAO GIỜ
bật cho dropdown enum/system state (mục NO_CREATE_NEEDED ở trên).

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

## Data Input Rule

Người nhập liệu phải biết mình đang nhập loại gì — form không được để họ
tự đoán:

| Loại | Ví dụ trong ERP này | Yêu cầu tối thiểu |
|---|---|---|
| **Master** | Nhân sự, Sản phẩm, Phòng ban, Chức danh, Tài sản | Validation + search khi danh sách dài (`ganCombo()`) + controlled dropdown khi đã có Master khác liên quan + smart default + không nhập lại dữ liệu đã có (Rule 2) |
| **Transaction** | Nhập/xuất kho, Đơn hàng (auto), Việc/Task | Không sửa lịch sử cũ tự do — dùng ledger/lịch sử (Rule 10) |
| **Configuration** | Đơn vị tính, vai trò/quyền | Chỉ Admin/Owner đúng vai trò sửa — xem DATA-DICTIONARY.md cột Controlled |
| **Document** | Chưa có Document Core (xem MODULE-MAP.md) | Chưa áp dụng — không tạo trước khi có nhu cầu thật |
| **Test Data** | Xem Test Data Policy ngay dưới đây | Prefix/dải số riêng, xoá sau khi dùng |

Trước khi thêm 1 màn nhập liệu mới, xác nhận đúng loại ở trên rồi mới
thiết kế form — không đưa hết field database lên 1 form phẳng (Rule 7).

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

---

# PHẦN BỔ SUNG — ban hành 2026-08-27

> Gộp từ `C:\Users\Admin\ERP\docs\ERP-CONSTITUTION.md` theo ADR-0004.
> **Không đánh số lại 12 Rule ở trên** — nhiều tài liệu và commit đang trích
> dẫn "Rule 5", "Rule 9". Phần này bổ sung, không thay thế.

## Rule 13 — One Writer Per Area

Mỗi vùng code, mỗi trường dữ liệu, mỗi bước quy trình chỉ có **một** người
hoặc một Agent được ghi tại một thời điểm. Người khác đọc thoải mái, muốn
sửa thì hỏi người đang giữ.

Bảng ghi danh: [ACTIVE-WORK.md](ACTIVE-WORK.md).
Áp dụng cho cả Agent: Gạo không dispatch hai việc đụng cùng vùng chạy song song.

## Rule 14 — Core Stable, Edge Evolves Fast

Lõi (Core, Source of Truth, phân quyền, schema chung) đổi chậm và phải có cổng.
Rìa (một màn hình, một báo cáo, một bộ lọc) được đổi nhanh, tự triển khai
trong guardrail. Đừng bắt việc rìa đi qua thủ tục của việc lõi.

## Rule 15 — Ship → Use → Measure → Improve

Ra bản dùng được, cho người dùng thật dùng, đo, rồi mới cải tiến.
Không thiết kế hoàn hảo trên giấy rồi mới ship.

## Điều cấm

16. Repo / docs / database là shared memory. **Hội thoại AI KHÔNG phải
    Source of Truth.** Business rule quan trọng không được chỉ nằm trong chat.
17. Không tạo feature chỉ vì "có thể làm".
18. **Không tự động hoá một process chưa hiểu đủ.** Tự động hoá một quy trình
    đang hỏng chỉ làm nó hỏng nhanh hơn.
19. Không bắt nhân viên nhập lại dữ liệu ERP đã biết.
20. Không tạo KPI chỉ vì có data.

## Quy chiếu quản trị — MBOs

Công ty vận hành theo **MBOs** (Management by Objectives). Mọi tính năng liên
quan tới giao việc, đánh giá hiệu suất, báo cáo nhân sự phải theo tư duy
**outcome-based** (đầu ra cụ thể), không activity-based (mô tả hoạt động).

Khi thiết kế tính năng quản lý con người, luôn hỏi **"đầu ra cụ thể là gì?"**
thay vì "nhân viên phải làm gì?".

## Khi hai nguyên tắc mâu thuẫn — thứ tự ưu tiên

1. **An toàn dữ liệu và khả năng phục hồi** (Rule 8, 9, 10)
2. **Source of Truth** (Rule 1)
3. **Chi phí thời gian của người thật** (Rule 12 — Human Cost)
4. **Tốc độ ra tính năng** (Rule 15)

Vẫn không giải được → `NEEDS_OWNER_DECISION`, đưa ERP Owner quyết.
Không tự chọn giúp.
