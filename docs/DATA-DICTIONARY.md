# Data Dictionary — ERP Alpha Green Commerce

Dựa trực tiếp trên `schema.sql` + `migrations/*.sql` thật (không bịa). Gộp
và chuẩn hoá lại từ 3 tài liệu đã có —
[DATA_OWNERSHIP_MATRIX.md](./DATA_OWNERSHIP_MATRIX.md) (owner theo bảng),
[FIELD_OWNERSHIP_MATRIX.md](./FIELD_OWNERSHIP_MATRIX.md) (owner theo field),
[ENTITY_IDENTITY.md](./ENTITY_IDENTITY.md) (định danh) — 3 file đó vẫn là
nguồn chi tiết hơn, file này là bảng tra cứu nhanh. Entity nào công ty
**chưa có thật** thì ghi rõ, không suy đoán schema.

Field chia 3 loại: **IMMUTABLE** (không đổi sau khi tạo) · **CONTROLLED**
(chỉ role cụ thể sửa được, có thể có Data Lock) · **NORMAL_EDIT** (sửa tự
do trong quyền xem tab đó).

---

| Entity | Ý nghĩa | Owner | Source of Truth | Table | Primary ID | External ID | Domain dùng | Duplicate? | Immutable | Controlled | Normal Edit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Company** | Công ty (chỉ 1) | ERP Owner | Không phải bảng riêng — `phap_nhan='Công ty'` cố định trên `nhan_su` | — | — | — | Toàn công ty | Không áp dụng (1 công ty) | — | — | — |
| **Department** | Phòng ban (4 phòng thật) | Ban Giám đốc | ERP | `phong_ban` | `id` (int) | — | Toàn công ty | KHÔNG được duplicate | `id` | `ten`, `truong_phong_id` (Admin) | `hoat_dong` |
| **Position** | Chức danh | Ban Giám đốc | ERP | `chuc_danh` | `id` (int) | — | Toàn công ty | KHÔNG | `id` | — | `ten`, `hoat_dong` |
| **Employee** | Nhân sự | HCNS, Admin | ERP | `nhan_su` | `id` (`ns_xxx`) | — | Toàn công ty | **KHÔNG — 1 nguồn duy nhất, không tạo bảng nhân sự thứ 2 cho bất kỳ domain nào (Rule 1)** | `id`, `ma_nv` | `luong` (chỉ Admin), `trang_thai_dl` | `ho_ten`, `sdt`, `email`, `phong_ban_id`, `chuc_danh_id`, `quan_ly_id`, `trang_thai`, `loai_lao_dong` |
| **Account** | Tài khoản đăng nhập | Admin | ERP | `tai_khoan` | `id` (int), 1:1 với `nhan_su` | — | Toàn công ty | KHÔNG | `id` | `ten_dang_nhap`, `mat_khau_hash`, `vai_tro`, `kich_hoat` (chỉ Admin) | `phai_doi_mk` |
| **Role** | Vai trò hệ thống + vị trí công việc | ERP Owner (chỉ Admin gán) | ERP — **hard-code trong `src/quyen.js`, không phải bảng DB** | (không có bảng) | mã vai trò (string) | — | Toàn công ty | KHÔNG | mã vai trò cố định trong code | gán vai trò (chỉ Admin/Admin backup, có chặn leo thang) | — |
| **Permission** | Quyền theo vai trò | ERP Owner | `src/quyen.js` (hard-code) | (không có bảng) | — | — | Toàn công ty | KHÔNG | logic quyền (đổi = sửa code, qua CORE-CHANGE-POLICY) | — | — |
| **Employment Type** | Loại lao động (Toàn TG/Part-time/Thời vụ) | HCNS, Admin | ERP | field `nhan_su.loai_lao_dong` | — | — | Nhân sự, Xếp ca | KHÔNG | prefix mã NV theo loại lúc tạo | — | giá trị field (HCNS/Admin sửa) |
| **Work Pattern** | Mẫu ca làm việc | Trưởng phòng, Admin | ERP | `mau_ca` | `id` | — | Xếp ca | KHÔNG | — | — | toàn bộ (Trưởng phòng/Admin) |
| **Shift** | Ca cụ thể đã mở/đã xếp | Trưởng phòng | ERP | `ca_mo`, `dang_ky_ca`, `lich_lam_viec` | `id` | — | Xếp ca | KHÔNG | `lich_lam_viec` đã khoá (`khoa_luc`) | trạng thái sau khi chốt lịch | trước khi chốt |
| **Product** | Sản phẩm (chỉ 1 tầng, chưa tách Product/SKU cha-con — xem ENTITY_IDENTITY.md §4) | Kinh doanh khoá/duyệt; Kho vận sửa | ERP | `san_pham` | `id` (`sp_xxx`) | — | Kho vận, Kinh doanh | KHÔNG | `id`, `ma_sku` | `trang_thai_dl` (khoá — chỉ Kinh doanh + Admin) | `ten`, `danh_muc`, `don_vi`, `ton_toi_thieu` |
| **SKU** | = Product ở ERP này hiện tại (1 tầng) | như Product | ERP | `san_pham.ma_sku` | — | Có thể map từ mã sàn qua `sku_map` | Kho vận, Kinh doanh, Marketplace | — | `ma_sku` | — | — |
| **Unit** | Đơn vị tính | Quản lý kho, Admin | ERP | `don_vi_tinh` | `id` | — | Kho vận, Sản phẩm | KHÔNG | `id` | — | `ten`, `hoat_dong` |
| **Supplier** | Nhà cung cấp | Quản lý kho, Admin | ERP | `nha_cung_cap` | `id` | — | Kho vận | KHÔNG | `id` | — | toàn bộ — **hiện 0 NCC thật đã nhập** |
| **Warehouse** | Kho vật lý (hiện 1 kho) | Admin | ERP | `kho` | `id` | — | Kho vận | KHÔNG | `id` | — | toàn bộ |
| **Order** | Đơn hàng | **AUTO** — đồng bộ Shopee/TikTok | **Sàn (Shopee/TikTok)**, ERP chỉ lưu bản sao đồng bộ | `don_hang` | `order_sn` (dùng luôn làm khoá chính — External ID đội lốt Internal ID, chấp nhận được vì ERP không tự sinh đơn — xem ENTITY_IDENTITY.md §10) | `order_sn` (mã sàn) | Kinh doanh, Kho vận, Kế toán | KHÔNG | mọi field gốc từ sàn | — | field nội bộ ERP thêm (nếu có) |
| **Return** | Đơn hoàn | **AUTO** tạo từ sàn; Kho/Vận hành sàn/Kế toán xử lý theo chặng | Sàn (dữ liệu gốc) + ERP (trạng thái xử lý nội bộ) | `don_hoan` | `return_sn` | `return_sn`, liên kết `order_sn` qua TEXT (chưa FK thật — xem AUDIT-KIEN-TRUC.md §E Silo #2) | Kho vận, Kinh doanh, Kế toán | KHÔNG | dữ liệu gốc từ sàn | field theo đúng chặng (xem FIELD_OWNERSHIP_MATRIX.md) | ghi chú xử lý trong chặng của mình |
| **Task** | Công việc (Trạm Mục Tiêu) | Người giao việc | ERP | `cong_viec` | `id` | — | Toàn công ty (Core) | KHÔNG | — | `trang_thai` theo luồng cố định | `tieu_de`, `dau_ra`, `han_chot` |
| **Notification** | Thông báo | Hệ thống tự tạo | ERP | `thong_bao` | `id` | — | Toàn công ty (Core) | KHÔNG | nội dung | — | `da_doc` (người nhận) |
| **Document** | Tài liệu/chứng từ có template | — | — | **CHƯA TỒN TẠI** — không có Document Template Core (xem `docs/audit/AUDIT-IMPORT-DOCUMENT-CORE.md`) | — | — | — | — | — | — | — |
| **Process** | Quy trình xuyên phòng ban tổng quát | — | — | **CHƯA TỒN TẠI dạng generic** — hiện chỉ có 1 quy trình viết tay (Đơn hoàn 3 chặng) nhúng trong `don_hoan`, chưa tách Process Core | — | — | — | — | — | — | — |
| **External Mapping** | Ánh xạ định danh sàn ↔ nội bộ | Hệ thống (tự động khi đồng bộ) | ERP | `sku_map`, `shopee_ket_noi`, `tiktok_ket_noi` | `id` | mã/tên sàn | Marketplace | Đây LÀ pattern đúng, không phải duplicate | — | token/kết nối (Admin) | mapping table |
| **Asset** *(bổ sung ngoài danh sách gốc — module mới nhất, 22/08/2026)* | Tài sản công ty cấp cho nhân sự | P. Support (Hành chính), Admin | ERP | `tai_san`, `tai_san_lich_su` | `id` (`ts_xxx`), `ma_ts` | — | Tài sản | KHÔNG | `id`, `ma_ts` | `trang_thai` (qua transaction, không sửa trực tiếp) | `ten`, `danh_muc`, `vi_tri` |

---

## Entity company CHƯA quyết định Source of Truth

Xem chi tiết + cách quyết định ở [SOURCE-OF-TRUTH.md](./SOURCE-OF-TRUTH.md).
Không tự suy luận field/mapping cho các hệ thống này khi chưa kết nối thật:
**MISA eShop, MISA AMIS**.

## Nguyên tắc khi thêm entity mới vào Data Dictionary

1. Chỉ thêm khi entity đã có schema thật trong `schema.sql`/migrations —
   không thêm entity "dự kiến sẽ có".
2. Trước khi thêm bảng mới cho 1 khái niệm, kiểm tra bảng này trước xem có
   entity gần giống chưa (Rule 5, ERP-CONSTITUTION.md).
3. Cập nhật đồng thời `DATA_OWNERSHIP_MATRIX.md`/`FIELD_OWNERSHIP_MATRIX.md`
   nếu owner ở cấp field khác owner ở cấp bảng.
