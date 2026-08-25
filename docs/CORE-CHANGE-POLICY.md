# Core Change Policy — ERP Alpha Green Commerce

Core = phần dùng chung toàn công ty, đổi sai ảnh hưởng mọi domain cùng
lúc. Danh sách Core hiện tại xem [MODULE-MAP.md](./MODULE-MAP.md) (mục
CORE). Ngắn gọn:

- Employee Core (`nhan_su`, `ma_nv`)
- Product/SKU Core (`san_pham`)
- Auth (`src/auth.js`, `mat-khau.js`)
- Role/Permission (`src/quyen.js`)
- Shared Task (`cong_viec`)
- Shared Notification (`thong_bao`)
- Shared Audit (chưa có — khi tạo cũng thuộc Core ngay từ đầu)
- Shared Process primitives (chưa có)
- Shared Document primitives (chưa có)
- Integration contracts (`shopee.js`, `tiktok.js` — hình dạng dữ liệu
  đồng bộ ra `don_hang`/`don_hoan`)
- Shared Master Data architecture (`bo_dem_ma`, `sinhMa()`, Data Lock
  pattern `trang_thai_dl`)

---

## Nếu task cần sửa Core: Developer Agent PHẢI DỪNG

Không tự ý sửa các file/bảng trên. Thay vào đó tạo **CORE_CHANGE_PROPOSAL**
(dùng đúng khung dưới đây, có thể viết thẳng trong PR/commit message hoặc
1 file tạm `docs/decisions/proposal-<ten>.md`) và **chờ ERP Owner duyệt**
trước khi code.

### Khung CORE_CHANGE_PROPOSAL

```
## Problem
(Vấn đề thật đang gặp — không phải "sẽ tiện hơn nếu...")

## Why existing Core cannot solve it
(Đã thử reuse/extend Core hiện có chưa? Vì sao không đủ?)

## Alternatives considered
(Ít nhất 1 phương án KHÔNG đụng Core — kể cả khi phương án đó chậm hơn)

## Affected modules
(Domain nào dùng Core này sẽ bị ảnh hưởng)

## Schema impact
(Bảng/cột nào thêm/đổi/xoá — ưu tiên THÊM, tránh đổi/xoá field đang dùng)

## Migration
(File migration cụ thể, chạy local trước, có ghi vào schema_migrations)

## Backward compatibility
(Code/dữ liệu cũ có còn chạy đúng sau khi đổi không)

## Human impact
(Ai phải đổi thói quen thao tác, ảnh hưởng bao nhiêu người/lần)

## Risk
(Rủi ro thật, không phải liệt kê hình thức)

## Rollback
(Nếu sai thì lùi lại bằng cách nào — cụ thể, đã nghĩ trước, không phải "sẽ tính sau")
```

### Sau khi có Proposal

1. Gửi ERP Owner (Sếp) — có thể qua chat trực tiếp, không cần quy trình
   nặng.
2. Chờ duyệt rõ ràng (đồng ý/từ chối/đổi hướng) trước khi viết code Core.
3. Domain phụ thuộc Core đó tạm dùng workaround cục bộ nếu cần gấp, không
   tự sửa Core để "làm cho xong".

---

## Vì sao cần cửa này (không phải thủ tục cho vui)

Từ `docs/audit/AUDIT-KIEN-TRUC.md`: 2 sự cố thật đã xảy ra trong 1 phiên
làm việc vì đổi Core (thiếu cột, thiếu bảng) không qua kiểm tra migration
trước khi deploy. Cửa này rẻ hơn nhiều so với sự cố production — nhưng chỉ
áp dụng cho đúng phạm vi Core liệt kê ở trên, **không áp dụng cho
LOCAL_DOMAIN** (xem `ERP-CONSTITUTION.md` phần Boundary/Architecture
Gates — LOCAL_DOMAIN được tự triển khai không cần duyệt từng chi tiết).

## Không phải Core dù trông giống

- Thêm 1 field vào `don_hoan` cho đúng nghiệp vụ chặng xử lý của 1 phòng
  → LOCAL_DOMAIN, không phải Core change (miễn không đổi field đã có
  người khác đang đọc).
- Thêm bảng mới thuộc hẳn 1 domain (VD báo cáo riêng của Kho) → LOCAL_
  DOMAIN, miễn không duplicate entity Core đã có (Rule 1/5).
- Sửa UI/UX trong phạm vi 1 tab của 1 domain → LOCAL_DOMAIN.
