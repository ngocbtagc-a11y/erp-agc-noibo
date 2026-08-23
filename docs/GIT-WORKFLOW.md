# Git Workflow — ERP Alpha Green Commerce

Hiện trạng trước 23/08/2026: 1 branch `main` duy nhất, mọi commit đẩy
thẳng, GitHub Actions tự deploy khi push `main` (xem
`.github/workflows/deploy.yml`). Phù hợp khi chỉ 1 người code. **Không còn
phù hợp khi có ≥2 Claude/developer cùng lúc** — hai bên cùng push thẳng
`main` sẽ tự động deploy đè lên nhau, không ai kịp review.

## Quy tắc mới

- `main` = production-ready. **Không code trực tiếp trên `main` khi có
  ≥2 người/Claude đang làm cùng lúc.**
- Nhánh tính năng: `feature/<domain>-<mo-ta-ngan>` (VD `feature/hr-import`,
  `feature/warehouse-scan`), `fix/<mo-ta-ngan>`, `integration/<ten>`.
- Mỗi Claude/developer dùng **branch hoặc `git worktree` riêng** — không
  2 Claude cùng checkout `main` rồi sửa trực tiếp.
- Chỉ merge vào `main` = chỉ đó mới auto-deploy. Nhánh feature không tự
  deploy (workflow chỉ trigger trên `push: branches: [main]`).

## Trước khi bắt đầu 1 task

1. `git pull origin main` — cập nhật mới nhất.
2. Đọc [ACTIVE-WORK.md](./ACTIVE-WORK.md) — tránh trùng vùng.
3. Đọc [CHANGELOG.md](./CHANGELOG.md) — nắm quyết định gần đây.
4. Kiểm tra không có việc đang conflict (cùng file, cùng bảng DB).
5. Tạo branch/worktree, ghi dòng vào `ACTIVE-WORK.md`, rồi mới code.

## Trước khi merge vào `main`

1. `git pull origin main` lần nữa — lấy thay đổi mới nhất từ người khác.
2. Merge/rebase theo convention thường của repo (merge commit rõ ràng,
   không cần rebase phức tạp ở quy mô team này).
3. Test tay theo [DEFINITION-OF-DONE.md](./DEFINITION-OF-DONE.md).
4. Chạy qua Architecture Gate (xem `ERP-CONSTITUTION.md`) — xác nhận đúng
   là LOCAL_DOMAIN hay cần review thêm.
5. Kiểm tra migration: nếu có file `.sql` mới trong `migrations/`, đã
   chạy `node scripts/chay-migration.mjs <file>` (local) trước khi merge,
   và **chạy `--remote` NGAY sau khi merge/deploy** (code deploy trước DB
   migrate là nguồn gốc 2 sự cố đã xảy ra — xem
   `docs/audit/AUDIT-KIEN-TRUC.md`).
6. Regression check: đăng nhập → tab liên quan trực tiếp → 1-2 tab khác
   có dùng chung entity vừa sửa.
7. Review (tự review nếu làm 1 mình, nhờ Claude khác/ERP Owner review nếu
   đổi CROSS_DOMAIN/CORE_CHANGE).
8. Merge vào `main` → tự deploy qua GitHub Actions.
9. Xoá dòng tương ứng khỏi `ACTIVE-WORK.md`.
10. Ghi 1 dòng vào `CHANGELOG.md` nếu là thay đổi đáng kể (không ghi typo).

## Không sửa production trực tiếp

Không `wrangler deploy` tay từ máy cá nhân cho code nghiệp vụ (chỉ dùng
tay cho migration DB qua `chay-migration.mjs`, đúng quy trình đã có).
Production chỉ nhận code qua đúng 1 cửa: merge vào `main` → GitHub Actions.

## Production Safety (không ai được tự làm nếu chưa ERP Owner duyệt)

`DROP`/`TRUNCATE`/mass `DELETE`/destructive migration/reset dữ liệu
production/xoay secret/đổi integration production — bất kỳ Agent nào
(Claude hay người) đều **dừng lại hỏi trước**, không tự thực hiện. Việc
xoá test data tự tạo trong CÙNG phiên làm việc (xem Test Data Policy,
`ERP-CONSTITUTION.md`) không thuộc diện này — đó là dọn dẹp của chính
mình, không phải xoá dữ liệu người khác.
