# Audit — Home / Dashboard (23/08/2026)

Yêu cầu gốc: chuẩn hoá tư duy Home/Dashboard toàn ERP theo nguyên tắc
**Home theo người dùng + Tổng quan theo Domain + Dashboard chỉ khi có
quyết định**. Audit trước, chỉ triển khai Phase 1 nếu không có blocker.

## A. Current Home Audit

Home = tab "Trạm Mục Tiêu" (`tongquan`), DOM order thật trong
[public/app.html](../../public/app.html) dòng 77+:

| # | Section | Nguồn dữ liệu | Target hiện tại | Actionable? | Duplicate? |
|---|---|---|---|---|---|
| 1 | `tq-tomtat` (stat cards) | `cvDanhSach()`+`mtDanhSach()` thật, Admin thêm `kdTongQuanDoanhThu()` | Nhị phân: Admin thấy Doanh thu; 7 vai trò còn lại gộp chung thấy Việc đang mở/quá hạn/chờ duyệt | Không — card không click được | Không |
| 2 | `tq-canhbao-panel` ("Cần chú ý") | Thật, nhưng chỉ Admin được push vào `canhBao` | Chỉ Admin | List item không click-through | Không |
| 3 | Vinh danh | Thật (`vinh_danh`) | Mọi role | Có | Không |
| 4 | Trạm Mục Tiêu MBOs (3 cấp) | Thật (`muc_tieu`) | Mọi role | Có (bấm thẻ → chi tiết) | Không |
| 5 | `cv-tqct-panel` (Tổng quan công ty) | Thật (`cong_viec` JOIN `nhan_su`) | Chỉ Admin | Không — không click được tới list | Không |
| 6 | Việc cần làm/phối hợp/tôi giao | Thật, lọc đúng người xem | Mọi role; non-Admin đã được JS đẩy lên trước MBO (Action First có sẵn) | Có | Không |

Không có mock/demo, không nhồi >9 card. Vấn đề thật: **role model chỉ 2
mức (Admin/không-Admin)**, trong khi hệ thống đã có sẵn cơ chế Manager
thật qua `phong_ban.truong_phong_id`.

**Dữ liệu production thật** (`phong_ban` JOIN `tai_khoan`):

| Phòng ban | Trưởng phòng | vai_trò hệ thống |
|---|---|---|
| Ban Giám đốc | Nguyễn Duy Phong | admin |
| P. Support | Bùi Thị Ngọc | admin |
| P. Kinh Doanh - MKT | Nguyễn Duy Phong | admin |
| **P. Kho Vận - Sản Xuất** | **Phạm Khương Duy** | **nguoi_dung** |

Anh Duy là trưởng phòng Kho Vận thật nhưng `vai_tro` hệ thống chỉ là
"Người dùng" — nếu tiering theo `vai_tro` (sai) thì anh Duy sẽ KHÔNG BAO
GIỜ thấy view Manager. Xác nhận đúng nguyên tắc đã ghi trong
`ERP-CONSTITUTION.md`: Domain Owner theo `phong_ban.truong_phong_id`,
không theo vai trò hệ thống. `TOI.phong_ban_quan_ly` đã được backend trả
sẵn (`src/index.js` `toiLaAi()`) nhưng frontend chưa dùng cho Home.

## B. Real vs Demo Data

100% dữ liệu Home hiện tại là thật. Không có gì cần xoá.

## C. Home Employee Proposal

Giữ phần lớn nguyên trạng — đã đúng Action First. Điều kiện chính xác:
`!TOI.la_admin && TOI.phong_ban_quan_ly.length === 0`.

## D. Home Manager Proposal (gap thật, làm mới)

Điều kiện: `!TOI.la_admin && TOI.phong_ban_quan_ly.length > 0`. Thêm khối
"Cần chú ý — [tên phòng]" (Exception First): việc quá hạn của phòng, chờ
duyệt của phòng. API mới `GET /api/cong-viec/tong-quan-phongban`
(LOCAL_DOMAIN), mirror logic `cvTongQuanCongTy` nhưng scope theo
`phong_ban_quan_ly` của người gọi (đọc từ session, không nhận từ client).

## E. Home CEO Proposal

Giữ nguyên (đã Decision First: Doanh thu + cảnh báo mục tiêu/quá
hạn/chờ duyệt). Thêm: card/cảnh báo click được tới đúng list lọc sẵn.

## F. Domain cần Tổng quan

Không domain nào cần Tổng quan MỚI trong Phase 1. Kho vận đã có `kv-the`
(4 card tồn kho), đủ dùng.

## G. Domain KHÔNG cần Dashboard

Kinh doanh, Kế toán, Đơn hoàn (Kết nối sàn), Nhân sự, Xếp ca, Tài sản —
audit code xác nhận tất cả đã là Work Queue thuần, không card/chart nào.
Không cần hành động.

## H. Metric Definition Map (khởi tạo — xem docs/METRIC-DEFINITIONS.md)

| metric_code | Tên | Định nghĩa | Nguồn | Owner |
|---|---|---|---|---|
| `viec_dang_mo` | Việc đang mở | `cong_viec.trang_thai NOT IN (hoan_thanh,huy)` | `cong_viec` | Core (Task) |
| `viec_qua_han` | Việc quá hạn | trên + `han_chot < hôm nay` | `cong_viec` | Core (Task) |
| `doanh_thu_hom_nay` | Doanh thu hôm nay | Đơn thành công trong ngày | bảng đơn hàng | Kinh doanh |

Không có duplicate definition hiện tại.

## I. Duplicate Metric Risks

Khi làm Phase 2 (Kho vận Tổng quan), "Giá trị tồn kho" phải dùng lại
đúng công thức đang có ở `kv-the` (`gia_tri_ton`) — không tính lại kiểu
khác.

## J. Drill-down Map

Hiện KHÔNG có counter nào trên Home click được tới danh sách lọc sẵn.
Phase 1 thêm cho các counter Employee/Manager/CEO: click "Việc quá hạn"
→ chuyển đúng bảng Việc, lọc quá hạn, giữ context.

## K. Permission/Data Scope

Backend luôn tự check quyền, không dựa UI ẩn. API Manager mới tự đọc
`phong_ban_quan_ly` từ session — không nhận `phong_ban_id` từ client.

## L. Implementation Plan — Phase 1

1. `DASHBOARD RULES D1-D6` vào `ERP-CONSTITUTION.md`.
2. 3-tier Home: Employee / Manager / CEO dùng `TOI.la_admin` +
   `TOI.phong_ban_quan_ly`.
3. API mới `cvTongQuanPhongBan` (Manager).
4. Drill-down: counter → filtered list.
5. `docs/METRIC-DEFINITIONS.md` khởi tạo.

Không làm trong Phase 1: Kho vận/Marketplace/CEO Trạm điều hành riêng
(Phase 2-4) — dừng chờ pilot xác nhận Phase 1.

## M. Chưa đủ dữ liệu → tạm ẩn

`nhan_su.phong_ban_id` còn 2 dòng NULL (2 người "Kinh Doanh") — không
chặn Phase 1 vì Manager thật cần tính năng này (anh Duy, Kho Vận) có dữ
liệu đầy đủ. Known limitation, xử lý bằng bucket "Chưa gán phòng ban"
đã có sẵn (giống `cvTongQuanCongTy`).

**Kết luận**: không có blocker — tiến hành Phase 1.
