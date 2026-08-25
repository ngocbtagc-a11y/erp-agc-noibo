# Definition of Done — ERP Alpha Green Commerce

Code chạy không có nghĩa là DONE. Một feature/thay đổi chỉ tính DONE khi
đủ các mục dưới đây (bỏ mục nào không áp dụng thì ghi rõ lý do, không im
lặng bỏ qua).

- [ ] **Business owner confirm** — Domain Owner (trưởng phòng) hoặc ERP
      Owner đã xác nhận đúng ý, không chỉ "code chạy được".
- [ ] **Permission đúng** — kiểm tra qua `src/quyen.js`, không hiện action
      ngoài quyền của vai trò đang test (xem ERP-CONSTITUTION.md Rule 23
      trong CLAUDE.md — permission-aware UX).
- [ ] **Data ownership rõ** — đã cập nhật `DATA_OWNERSHIP_MATRIX.md`/
      `FIELD_OWNERSHIP_MATRIX.md`/`DATA-DICTIONARY.md` nếu thêm entity/field
      mới có nhiều phòng đụng vào.
- [ ] **Không duplicate Core** — đã search Core hiện có trước khi tạo mới
      (Rule 5).
- [ ] **Validation** — input sai bị chặn có thông báo rõ, không crash/lưu
      dữ liệu rác.
- [ ] **Empty / Loading / Error states** — đủ cả 3, không riêng happy path
      (xem `UX_ENGINEERING_STANDARD.md`).
- [ ] **UI State Consistency** — sau mutation thành công, mọi vùng UI liên
      quan tự cập nhật, không cần F5 (xem `UX_ENGINEERING_STANDARD.md` §
      UI State Consistency, `ERP-CONSTITUTION.md` Rule 7).
- [ ] **Mobile** nếu user thực tế dùng mobile cho màn hình này (ERP là
      PWA, phần lớn thao tác vận hành dùng điện thoại).
- [ ] **Audit** nếu nghiệp vụ cần biết "ai/khi nào" — dùng pattern
      `_luc`/`_boi` đã có hoặc Audit Log chung khi có (Rule 8).
- [ ] **Migration safe** — chạy local trước, có ghi `schema_migrations`,
      không xoá/đổi kiểu dữ liệu cột đang có người dùng mà không có kế
      hoạch chuyển đổi.
- [ ] **Test** — ít nhất test tay theo đúng flow thật (đăng nhập đúng vai
      trò → thao tác → kiểm tra kết quả); viết test tự động nếu đụng Core.
- [ ] **Human Cost đạt** — đúng ngân sách thao tác theo tần suất dùng
      (xem UX Performance Budget, `ERP-CONSTITUTION.md`); nếu vượt, đã
      giải thích lý do trong Feature Spec.
- [ ] **Fallback** nếu feature quan trọng (VD tích hợp Shopee lỗi thì
      luồng nội bộ vẫn dùng được, không đứng hình toàn hệ thống).
- [ ] **Docs cập nhật** — `MODULE-MAP.md`/`DATA-DICTIONARY.md`/
      `CHANGELOG.md` nếu thay đổi đáng kể; `ACTIVE-WORK.md` đã xoá dòng.

## Go-Live Level

Mỗi feature/module đi qua vòng đời:

```
DEVELOPMENT → INTERNAL_TEST → PILOT → OFFICIAL → SOURCE_OF_TRUTH (nếu phù hợp)
```

**Không mặc định OFFICIAL = SOURCE_OF_TRUTH.** Ví dụ: ERP có thể OFFICIAL
cho luồng vận hành Kho vận, nhưng MISA vẫn là Source of Truth cho sổ sách
kế toán chính thức cho tới khi ERP Owner quyết định khác (xem
[SOURCE-OF-TRUTH.md](./SOURCE-OF-TRUTH.md)).

Status hiện tại từng module xem [MODULE-MAP.md](./MODULE-MAP.md).

## Module Retirement

ERP không phình mãi — mỗi module/feature có thể chuyển sang:

```
PRODUCTION → INACTIVE (tạm ẩn, còn dữ liệu) → ARCHIVED (không dùng, giữ để tra cứu) → RETIRED (gỡ khỏi code)
```

Retire khi: không còn ai dùng, bị duplicate bởi module mới thay thế, hoặc
quy trình nghiệp vụ đã đổi khiến module cũ vô nghĩa. **Không giữ feature
chỉ vì đã từng code.** Trước khi RETIRED (gỡ code thật), cập nhật Status
trong [MODULE-MAP.md](./MODULE-MAP.md) và ghi 1 dòng
[CHANGELOG.md](./CHANGELOG.md) — dữ liệu liên quan xử lý theo Rule 10
(History Must Survive Change), không xoá thẳng nếu còn giá trị tra cứu
lịch sử.
