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
| Fix UX gây hiểu lầm: modal "+ Giao Mục Tiêu" tạo Mục tiêu | Domain (MBO/Task) | Sếp Ngọc phản ánh tự giao "mục tiêu" cho mình nhưng không thấy ở Trạm Mục Tiêu cấp cá nhân — root cause: field "Thuộc mục tiêu" (nơi tạo/gắn `muc_tieu`) bị ẩn mặc định trong khối "+ Thêm tuỳ chọn" đã gấp lại, nên bấm "+ Giao Mục Tiêu" và điền các ô hiện có chỉ tạo `cong_viec` (Task), không tạo `muc_tieu`. Fix: đưa "Thuộc mục tiêu" ra luôn hiện sẵn trong form chính, chỉ giữ Người phối hợp/Ghi chú trong "+ Thêm tuỳ chọn". Cũng thêm chip "🎯 Thuộc mục tiêu: ..." trên các dòng Việc đã gắn mục tiêu, và gộp mục tiêu Đã xong vào khối gấp lại riêng trên Trạm Mục Tiêu (không đụng `cvLichSu` — Việc/Mục tiêu vẫn 2 khái niệm tách biệt hoàn toàn ở tầng dữ liệu, không chồng chéo) | Không | Không (chỉ đổi vị trí field trong DOM + text, giữ nguyên id/logic JS) | OFFICIAL |
| Fix UI State Consistency: "Lịch sử làm việc" và "Tổng quan công ty" (Admin) không cập nhật ngay sau khi tạo/hoàn thành/huỷ Việc, phải F5 mới đúng | Domain (Task) + Core UI pattern | Root cause: `khoiDongLichSuViec()`/`taiLaiTongQuanCongTy()` chỉ fetch dữ liệu 1 lần lúc tải trang, `moTab()` chuyển tab không tự fetch lại — mutation ở module Việc không có đường nào báo cho 2 màn này biết cần tải lại. Tái hiện thật bằng test data trên local D1, xác nhận trước fix: đã tạo/hoàn thành việc nhưng cả 2 màn vẫn hiện `0`/dữ liệu cũ tới khi F5. Fix: gộp `lamMoiCacManLienQuanCv()` trong `khoiDongCongViec` (tải lại Việc cần làm/giao/phối hợp + Tổng quan công ty + gọi `window.LAM_MOI_LICHSU_VIEC` nếu có) dùng ở cả 3 nơi tạo/nộp/đổi trạng thái Việc; export `window.LAM_MOI_LICHSU_VIEC` từ `khoiDongLichSuViec`. Verify lại bằng test data: cả 2 màn cập nhật đúng ngay không cần F5, đã xoá test data sau khi verify. Ban hành rule chung **UI State Consistency** trong `ERP-CONSTITUTION.md` Rule 7 + `UX_ENGINEERING_STANDARD.md` (naming convention `window.LAM_MOI_*`) + thêm mục vào `DEFINITION-OF-DONE.md`. Audit nhanh các module khác: phát hiện `khoiDongLichSuHoan` (Lịch sử hoàn, dưới Đơn hoàn) có cùng pattern rủi ro (fetch 1 lần, không có `LAM_MOI_*`) nhưng CHƯA sửa trong đợt này — nguyên nhân: mutation nguồn nằm rải ở 3 module (Đơn hoàn/Kế toán trả soát/Kế toán hàng hỏng), sửa đúng cần đụng cả 3 chỗ nên không còn là fix "rủi ro thấp" — để dành làm riêng khi có nhu cầu thật | Không | Không (chỉ đổi thời điểm gọi API refetch, không đổi API/schema) | OFFICIAL |

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
