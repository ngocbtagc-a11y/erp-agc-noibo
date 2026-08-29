# Module Map — ERP Alpha Green Commerce

Tổng hợp từ [docs/audit/AUDIT-KIEN-TRUC.md](./audit/AUDIT-KIEN-TRUC.md)
(20-21/08/2026, đã duyệt) + xác nhận lại 23/08/2026. Cập nhật file này khi
module đổi Owner/Status — không cần đợi audit lớn mới sửa.

Status dùng chung: `EXPERIMENTAL` (đang thử, có thể bỏ) · `PILOT` (1 nhóm
dùng thật, chưa chính thức) · `PRODUCTION` (đang chạy thật, tin cậy) ·
`LEGACY` (còn chạy nhưng nên thay/nghỉ hưu).

---

## CORE — dùng chung toàn công ty, đổi phải qua [CORE-CHANGE-POLICY.md](./CORE-CHANGE-POLICY.md)

| Module | Owner | File | Public API | Bảng chính | Status | Dependencies |
|---|---|---|---|---|---|---|
| Auth & Session | ERP Owner | `src/auth.js` | `/api/dang-nhap`, `/api/dang-xuat`, `/api/doi-mat-khau`, `/api/toi-la-ai` | `tai_khoan`, `phien`, `lan_dang_nhap_hong` | PRODUCTION | — |
| Permission | ERP Owner | `src/quyen.js` | Không có route riêng — hàm `duoc*()`/`laAdmin()` gọi từ mọi handler khác | (hard-code, không ở DB) | PRODUCTION | Auth |
| Employee Core | HCNS, Admin | `src/nhansu.js` + phần trong `index.js` | `/api/nhan-su/*`, `/api/quan-tri/*` (tài khoản) | `nhan_su` | PRODUCTION | Auth |
| Notification | Hệ thống (tự tạo) | phần trong `index.js` | `/api/thong-bao/*` | `thong_bao` | PRODUCTION | Employee Core |
| Task (Trạm Việc) | Người giao việc | phần trong `index.js` | `/api/cong-viec/*` | `cong_viec` | PRODUCTION | Employee Core |
| Goal/OKR | Người tạo mục tiêu | phần trong `index.js` | `/api/muc-tieu/*` | `muc_tieu` | PRODUCTION | Employee Core, Task |
| Product/SKU Master | Kinh doanh (khoá), Kho vận (sửa) | phần trong `index.js` + `kho.js` đọc | Nằm trong `/api/kho/*`, `/api/kinh-doanh/*` | `san_pham` | PRODUCTION (schema) / **0 dòng dữ liệu thật** | Employee Core |
| Định danh tập trung | ERP Owner (hạ tầng nội bộ) | `src/dinh-danh.js` | Không có route riêng — gọi nội bộ qua `sinhMa()` | `bo_dem_ma` | PRODUCTION | — |

**Core còn thiếu hẳn** (chưa có, không tạo trước khi có nhu cầu thật —
Rule 5): Audit Log dùng chung, Permission dạng dữ liệu (đang hard-code
trong `quyen.js`), Approval Core, Process/Workflow Core tổng quát.

---

## DOMAIN — Trưởng phòng (Domain Owner) sở hữu nghiệp vụ

| Domain | Owner (phòng thật) | File | Public API | Bảng chính | Status | Dependencies | Shared entities dùng |
|---|---|---|---|---|---|---|---|
| Kho vận (Xuất/Nhập/Tồn) | P. Kho Vận-Sản Xuất | `src/kho.js` | `/api/kho/*` | `lo_hang`, `giao_dich_kho` | PRODUCTION (schema, ledger chuẩn) / **0 giao dịch thật** | Product/SKU Master, Employee Core | `san_pham`, `nhan_su` |
| Tài sản | P. Support (Hành chính) | `src/taisan.js` | `/api/tai-san/*` | `tai_san`, `tai_san_lich_su` | PRODUCTION (mới, ít dữ liệu) | Employee Core | `nhan_su` |
| Đơn hoàn + đối soát 3 chặng | P. Kho Vận-Sản Xuất + P. Kinh Doanh-MKT + P. Support | trong `index.js` | `/api/hoan/*` | `don_hoan` | PRODUCTION — **405+ đơn thật, đang chạy sống** | Integration Shopee/TikTok, Product/SKU Master | `san_pham`, `nhan_su` |
| Đơn hàng/doanh thu | P. Kinh Doanh-MKT | trong `index.js` | `/api/kinh-doanh/*` | `don_hang` | PRODUCTION — **2.300+ đơn thật** | Integration Shopee/TikTok | — |
| Kế toán tra soát | P. Support | trong `index.js` | `/api/ke-toan/*` | field trong `don_hoan` | PRODUCTION | Đơn hoàn domain | `don_hoan` |
| Xếp ca / Đăng ký ca | P. Kho Vận-Sản Xuất (Part-time/Thời vụ) | `src/ca.js` | `/api/ca/*` | `mau_ca`, `ca_mo`, `dang_ky_ca`, `lich_lam_viec`, `allocation_runs` | PRODUCTION | Employee Core | `nhan_su`, `phong_ban` |
| Danh mục nền (Phòng ban/Chức danh/Đơn vị tính/NCC/Kho) | Ban Giám đốc (Phòng ban, Chức danh) / P. Kho Vận-Sản Xuất (còn lại) | `src/dulieunen.js` | `/api/dulieunen/*` | `phong_ban`, `chuc_danh`, `don_vi_tinh`, `nha_cung_cap`, `kho` | PRODUCTION | — | — |
| Chat nội bộ | Toàn công ty | trong `index.js` | `/api/chat/*` | `tin_nhan_chat` | PRODUCTION | Employee Core | `nhan_su` |
| Vinh danh | Toàn công ty | trong `index.js` | `/api/vinh-danh/*` | (bảng vinh danh) | PRODUCTION | Employee Core | `nhan_su` |
| Góp ý & Cải tiến ERP | Toàn công ty (Admin triage) | trong `index.js` | `/api/gop-y/*` | `gop_y`, `gop_y_lich_su` | PILOT (25/08/2026, mới) | Employee Core, Notification, Telegram (tuỳ chọn) | `nhan_su`, `thong_bao` |

---

## INTEGRATION — kết nối hệ thống ngoài

| Integration | Owner | File | Public API | Bảng | Status | Sync direction | Ghi chú |
|---|---|---|---|---|---|---|---|
| Shopee | Vận hành sàn, Admin | `src/shopee.js` | `/api/shopee/*` | `shopee_ket_noi`, ghi vào `don_hang`/`don_hoan` | PRODUCTION | Shopee → ERP (một chiều, cron 5 phút) | Không có staging layer riêng, ghi thẳng vào bảng nghiệp vụ — chấp nhận được vì có lưu JSON gốc (xem AUDIT-KIEN-TRUC.md §E Silo #3) |
| TikTok | Vận hành sàn, Admin | `src/tiktok.js` | `/api/tiktok/*` | `tiktok_ket_noi`, ghi vào `don_hang`/`don_hoan` | PRODUCTION | TikTok → ERP (một chiều, cron 5 phút) | Tương tự Shopee |
| SKU mapping | Vận hành sàn | phần trong `shopee.js`/`tiktok.js` | Nằm trong `/api/shopee/*`, `/api/tiktok/*` | `sku_map` | PRODUCTION | — | Đúng pattern channel-mapping, không phải silo |
| MISA eShop | UNDECIDED | — | — | — | **UNDECIDED** | UNDECIDED | Chưa kết nối, chưa xác định Source of Truth — xem [SOURCE-OF-TRUTH.md](./SOURCE-OF-TRUTH.md) |
| MISA AMIS | UNDECIDED | — | — | — | **UNDECIDED** | UNDECIDED | Chưa kết nối |
| Cloudflare Workers AI (OCR CCCD) | ERP Owner | `src/nhansu.js` | Nằm trong `/api/nhan-su/*` | — | EXPERIMENTAL (đang hoàn thiện, tạm ẩn UI) | AI → ERP (đọc, không tự lưu) | `@cf/meta/llama-4-scout-17b-16e` (khai ở `src/tai-lieu.js`, dùng chung) |

---

## Public API / entry points

Router duy nhất: `src/index.js` (`DUONG_DAN` — bảng map URL → handler).
**Chưa tách theo module** — đây là rủi ro chính đã ghi trong
AUDIT-KIEN-TRUC.md (file 2800+ dòng, business logic của nhiều domain nằm
chung 1 file). Kế hoạch tách (Phase 2, chưa bắt đầu, không gấp) xem
AUDIT-KIEN-TRUC.md mục F. Cho tới khi tách xong: coi `index.js` như router
+ domain logic gộp, **Boundary Gate (xem ERP-CONSTITUTION.md)** vẫn áp
dụng bình thường dựa theo bảng dữ liệu đụng tới, không cần đợi tách file
vật lý mới phân loại được LOCAL_DOMAIN/CROSS_DOMAIN/CORE_CHANGE.

## Duplicate risk đã theo dõi

Không phát hiện silo Employee/Product thứ hai (điểm mạnh nhất hiện tại —
xem AUDIT-KIEN-TRUC.md §E). Rủi ro duplicate cần cảnh giác khi thêm
module mới: đừng tạo bảng nhân sự/sản phẩm riêng cho 1 domain — luôn
reference `nhan_su`/`san_pham` gốc (Rule 1).
