# Changelog — ERP Alpha Green Commerce

Chỉ ghi thay đổi đáng kể (feature mới, quyết định kiến trúc, migration,
breaking change). **Không ghi từng typo/CSS nhỏ** — xem `git log` cho chi
tiết từng commit.

Format: `Date | Feature | Domain | Decision | Migration | Breaking impact | Status`

---

## 2026-08-23

| Feature | Domain | Decision | Migration | Breaking impact | Status |
|---|---|---|---|---|---|
| Governance layer (Constitution, Data Dictionary, Source of Truth, Module Map, templates, CLAUDE.md) | Core (process, không phải code) | Chuyển từ 1 người code sang mô hình ERP Owner / Domain Owner / Developer Agent / Key User — Central Architecture + Distributed Business Ownership | Không | Không — chỉ thêm tài liệu, không đổi code/schema | OFFICIAL |
| Rà soát hoàn chỉnh governance layer so với yêu cầu gốc (38 phần) | Core (process) | Bổ sung ARCHITECTURE.md, cột Owner/Dependencies/Public API còn thiếu trong MODULE-MAP.md, Data Input Rule, Module Retirement lifecycle, UI Consistency catalog, Pre-Code Checklist đầy đủ trong CLAUDE.md; sửa 1 tên hàm đã lỗi thời (`ganComboNhanSu` → `ganCombo`) sót lại trong UX_ENGINEERING_STANDARD.md | Không | Không | OFFICIAL |
| Đổi vai trò hệ thống: Giám đốc/Phó Giám đốc/Admin hệ thống → Admin/Admin backup/Người dùng | Core (Permission) | Sếp chốt — gộp lãnh đạo thành 1 vai trò Admin, thêm Admin backup cho HR/trưởng phòng tạo tài khoản hộ, có chặn leo thang quyền | Không (đổi dữ liệu `tai_khoan.vai_tro`, không đổi schema) | Có — role key cũ (`giam_doc`, `pho_giam_doc`, `admin_he_thong`) không còn hợp lệ, đã cập nhật 2 tài khoản thật trước khi deploy | OFFICIAL |
| Search + Filter cho Nhân sự/Tài sản/Tài khoản, thay `prompt()` bằng modal | Domain (HR, Tài sản, Quản trị) | Chuẩn hoá theo `UX_ENGINEERING_STANDARD.md`, client-side vì dữ liệu nhỏ | Không | Không | OFFICIAL |
| Searchable Combobox (`ganCombo()`) thay native `<select>` dài cho mọi chỗ chọn nhân sự/sản phẩm/vai trò/chức danh/phòng ban | Core UI component | 1 control duy nhất, search tích hợp trong dropdown, ngưỡng ≥7 lựa chọn hoặc danh mục có thể tăng | Không | Không (giữ nguyên `.value` semantics qua `<input type="hidden">` + `change` event) | OFFICIAL |

## Trước 23/08/2026

Xem `docs/audit/AUDIT-KIEN-TRUC.md` §K (roadmap Phase 0-5) và `git log`
cho lịch sử chi tiết ~90 commit trước ngày này — không chép lại ở đây,
tránh trùng lặp.

**Mốc lớn đã có trước đó** (tóm tắt, không chi tiết từng commit):
- Migration safety: `schema_migrations` + `chay-migration.mjs` +
  `kiem-tra-migration.mjs` (Phase 1, đã hoàn thành, xem AUDIT-KIEN-TRUC.md).
- Mã nhân sự (`ma_nv`) theo Loại lao động, sinh tập trung qua
  `src/dinh-danh.js`.
- Data Ownership / Data Lock pattern áp dụng cho 7 bảng danh mục nền.
- Module Tài sản (Asset Management) — mới hoàn toàn.
- Auto Allocation engine cho Đăng ký ca (Xếp ca).
- Bulk import 21 nhân sự thật từ bảng tính.
