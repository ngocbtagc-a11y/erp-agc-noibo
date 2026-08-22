# ERP V2 — Information Architecture (theo 4 phòng ban thật)

Tài liệu thiết kế, chưa code. Cấu trúc dưới đây bám theo **4 phòng ban thật
Sếp đã tự nhập và khoá trong Dữ liệu nền** (không phải mô hình doanh nghiệp
lớn lý thuyết):

1. **Ban Giám đốc**
2. **P. Kho Vận - Sản Xuất**
3. **P. Kinh Doanh - MKT**
4. **P. Support** (gộp Kế toán - Nhân sự - Admin — 1 phòng, không tách 3)

Nếu sau này công ty lớn lên và tách P. Support thành Kế toán/Nhân sự/IT
riêng, cấu trúc dưới đây tách tiếp dễ dàng (mỗi domain đã độc lập ở tầng
code), nhưng **không tách trước khi có người phụ trách riêng thật**.

---

## 1. Cấu trúc menu hiện tại

Sidebar hiện có 11 tab, không phân nhóm cấp cao — phẳng, cùng 1 cấp:

`Trạm Mục Tiêu · Danh bạ · Chat · Nhân sự · Kinh doanh · Kho vận · Kết nối sàn · Kế toán · Dữ liệu nền · Quản trị`

(Lịch sử làm việc là view phụ, không phải nav chính)

## 2. Module đang bị gom sai

| Hiện tại | Vấn đề |
|---|---|
| **Dữ liệu nền** | Gom cả danh mục cấp CÔNG TY (Phòng ban, Chức danh — thuộc Ban Giám đốc) LẪN danh mục nghiệp vụ (Đơn vị tính, Nhà cung cấp, Kho — thuộc Kho Vận-Sản Xuất) vào 1 tab chung. Đây đúng là điều mục 11 trong yêu cầu Sếp cảnh báo. |
| **Quản trị** | Đã sửa 1 phần hôm nay (chuyển hồ sơ nhân sự ra) — hiện chỉ còn tài khoản đăng nhập, đúng vị trí (Support/Admin). |
| **Sản phẩm/SKU** | Đã sửa hôm nay — giờ Kinh Doanh-MKT sở hữu, Kho Vận-Sản Xuất vẫn sửa được. |
| **Kinh doanh** | Đang gộp cả Vận hành sàn + Sản phẩm + CSKH + R&D trong 1 tab — hợp lý vì đều thuộc P. Kinh Doanh-MKT (1 phòng thật), KHÔNG cần tách thêm. |
| **Kế toán, Nhân sự, Quản trị (tài khoản)** | 3 tab riêng nhưng cùng 1 phòng thật (Support) phụ trách — về mặt UI có thể giữ tách (mỗi tab 1 nghiệp vụ rõ ràng dễ dùng hơn dồn 1 màn), nhưng nên NHÓM chung dưới 1 mục cha trên sidebar để phản ánh đúng "đây là việc của Support". |

## 3. Dữ liệu nền đang gom chung không hợp lý

| Danh mục | Cấp đúng | Vì sao |
|---|---|---|
| Phòng ban, Chức danh | **Cấp công ty** (Ban Giám đốc) | Cơ cấu tổ chức — quyết định của lãnh đạo, không phải nghiệp vụ 1 phòng |
| Đơn vị tính | **Kho Vận-Sản Xuất** | Gắn trực tiếp vào Sản phẩm/tồn kho — dùng hằng ngày ở kho |
| Nhà cung cấp | **Kho Vận-Sản Xuất** | Công ty chưa có phòng Mua hàng riêng — NCC hiện gắn với nghiệp vụ nhập hàng của Kho |
| Kho (danh sách kho vật lý) | **Kho Vận-Sản Xuất** | Cấu hình vận hành kho |

## 4. Đề xuất cấu trúc phòng ban ERP V2

```
Tổng quan                         (chung — Trạm Mục Tiêu, mọi vai trò)
Quản trị doanh nghiệp             (Ban Giám đốc)
  ├─ Cơ cấu tổ chức (Phòng ban, Chức danh)
  ├─ Nhân sự — tổng quan toàn công ty (đọc)
  └─ Phân quyền hệ thống
Kinh doanh & MKT                  (P. Kinh Doanh - MKT)
  ├─ Vận hành sàn (đối soát, đơn hủy)
  ├─ Sản phẩm/SKU                 (đã chuyển hôm nay)
  ├─ Chăm sóc khách hàng
  └─ R&D
Kho vận & Sản xuất                (P. Kho Vận - Sản Xuất)
  ├─ Tồn kho / Nhập / Xuất
  ├─ Đơn hoàn (xử lý kho)
  ├─ Báo cáo XNT
  └─ Danh mục: Đơn vị tính, Nhà cung cấp, Kho
Support                           (P. Support)
  ├─ Kế toán (đối soát tiền, hàng hỏng)
  ├─ Nhân sự (hồ sơ, MBO cá nhân)
  └─ Quản trị hệ thống (tài khoản đăng nhập)
```

**Không tạo thêm "Mua hàng", "Sản xuất", "Marketing" riêng** — công ty
chưa có ai phụ trách các mảng này tách biệt; khi nào có, tách module đã
sẵn (Nhà cung cấp/Kho đã là entity riêng, chỉ cần đổi owner + vị trí menu).

## 5. Navigation Tree V2

| Department → Function → Sub-function | Owner | Trạng thái |
|---|---|---|
| Tổng quan | Mọi người | ✅ Có (không đổi) |
| Quản trị doanh nghiệp → Cơ cấu tổ chức → Phòng ban | Ban Giám đốc | ✅ Có (đang nằm ở Dữ liệu nền — **MOVE**) |
| Quản trị doanh nghiệp → Cơ cấu tổ chức → Chức danh | Ban Giám đốc | ✅ Có (**MOVE**) |
| Quản trị doanh nghiệp → Phân quyền hệ thống | Ban Giám đốc | ✅ Có (tab Quản trị hiện tại — giữ vị trí, đổi nhóm cha) |
| Kinh doanh & MKT → Vận hành sàn | P. Kinh Doanh-MKT | ✅ Có |
| Kinh doanh & MKT → Sản phẩm/SKU | P. Kinh Doanh-MKT | ✅ Có (mới xong hôm nay) |
| Kinh doanh & MKT → Chăm sóc KH | P. Kinh Doanh-MKT | ✅ Có |
| Kinh doanh & MKT → R&D | P. Kinh Doanh-MKT | ⚠️ Khung rỗng, chờ nội dung |
| Kho vận & Sản xuất → Tồn/Nhập/Xuất | P. Kho Vận-Sản Xuất | ✅ Có |
| Kho vận & Sản xuất → Đơn hoàn | P. Kho Vận-Sản Xuất | ✅ Có |
| Kho vận & Sản xuất → Danh mục (Đơn vị tính/NCC/Kho) | P. Kho Vận-Sản Xuất | ✅ Có (**MOVE** từ Dữ liệu nền) |
| Kho vận & Sản xuất → Sản xuất | P. Kho Vận-Sản Xuất | ❌ Chưa có — công ty chưa có lệnh sản xuất/BOM, **CREATE khi cần thật** |
| Support → Kế toán | P. Support | ✅ Có |
| Support → Nhân sự | P. Support | ✅ Có |
| Support → Quản trị hệ thống (tài khoản) | P. Support | ✅ Có |
| Kết nối sàn (Shopee/TikTok) | P. Kinh Doanh-MKT hoặc dùng chung | ✅ Có — giữ nguyên vị trí, là tích hợp kỹ thuật dùng chung nhiều nơi |

## 6. Data Ownership Matrix

Đã có sẵn, cập nhật gắn đúng phòng ban thật thay vì tên vai trò kỹ thuật —
xem **[docs/DATA_OWNERSHIP_MATRIX.md](./DATA_OWNERSHIP_MATRIX.md)** (đã cập
nhật cột "Phòng ban thật" trong lần sửa này).

## 7. Module KEEP / MOVE / SPLIT / MERGE / REMOVE / CREATE

| Module | Action | Chi tiết |
|---|---|---|
| Trạm Mục Tiêu | **KEEP** | Đã đúng, dùng chung mọi vai trò |
| Kinh doanh (Vận hành sàn/Sản phẩm/CSKH/R&D) | **KEEP** | Đúng 1 phòng thật, không tách thêm |
| Kho vận | **KEEP** | Đúng 1 phòng thật |
| Kế toán | **KEEP** (nhóm lại dưới "Support") | Không tách domain, chỉ đổi vị trí sidebar |
| Nhân sự | **KEEP** (nhóm lại dưới "Support") | Tương tự |
| Quản trị (tài khoản) | **KEEP** (nhóm lại dưới "Support") | Tương tự |
| Dữ liệu nền (Phòng ban, Chức danh) | **MOVE** → Quản trị doanh nghiệp | Cấp công ty, không phải nghiệp vụ |
| Dữ liệu nền (Đơn vị tính, NCC, Kho) | **MOVE** → Kho vận & Sản xuất | Nghiệp vụ kho |
| Mua hàng, Sản xuất, Marketing riêng | **KHÔNG TẠO** | Chưa có người phụ trách thật — tránh tạo tab rỗng |
| Hệ thống & Tích hợp (API/webhook/audit log riêng) | **KHÔNG TẠO NGAY** | Quy mô 8 người chưa cần màn riêng; audit log kỹ thuật đã có ở `lich_su_thay_doi_nen`, đủ dùng |

## 8. Bảng database — giữ chung vs tách theo domain

**Giữ 1 nguồn duy nhất (Core), tham chiếu bằng ID — KHÔNG tách bản sao:**
`nhan_su`, `tai_khoan`, `san_pham`, `phong_ban`, `chuc_danh`, `don_vi_tinh`,
`nha_cung_cap`, `kho`, `don_hang`, `don_hoan`, `cong_viec`, `muc_tieu`.

**Chưa cần tách "profile theo domain"** (kiểu `warehouse_profile`,
`accounting_profile`) — ở quy mô hiện tại, các cột đặc thù domain (VD
`san_pham.don_vi_id` cho Kho, `nhan_su.phong_ban_id` cho tổ chức) đã đủ
gắn thẳng vào bảng gốc mà không gây xung đột ai sửa. Chỉ tách profile
riêng khi 1 bảng bắt đầu có >15-20 cột đặc thù domain khác nhau — chưa
xảy ra ở đây.

---

## Việc tiếp theo (chờ Sếp duyệt riêng — CHƯA code)

1. Đổi sidebar: nhóm 11 tab hiện tại thành 5 nhóm cha (Tổng quan / Quản
   trị doanh nghiệp / Kinh doanh-MKT / Kho vận-Sản xuất / Support).
2. MOVE Phòng ban+Chức danh từ Dữ liệu nền → Quản trị doanh nghiệp.
3. MOVE Đơn vị tính+NCC+Kho từ Dữ liệu nền → Kho vận & Sản xuất.
4. Sau khi 2+3 xong, tab "Dữ liệu nền" không còn gì — xoá hẳn, không để
   tab rỗng.

Đây là thay đổi layout/navigation lớn (đổi sidebar) — nên làm thành 1 đợt
riêng, test kỹ trên máy trước khi đẩy lên (đúng nguyên tắc "mỗi refactor
nhỏ, không đổi nhiều domain cùng lúc" đã thống nhất từ đầu phiên).
