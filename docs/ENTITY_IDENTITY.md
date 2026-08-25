# Entity Identity — Nguyên tắc định danh & Audit hiện trạng

Bổ sung cho [ERP_V2_INFORMATION_ARCHITECTURE.md](./ERP_V2_INFORMATION_ARCHITECTURE.md).
Tài liệu thiết kế — phần 2 (audit) đã soi vào schema thật của ERP (`schema.sql`
+ `migrations/*.sql` + `src/*.js`), không suy đoán.

## Phần 1 — Nguyên tắc: Entity Identity First

Mọi đối tượng nghiệp vụ quan trọng phải có danh tính rõ ràng, không chỉ là
1 dòng dữ liệu. Trước khi thêm bảng/module mới, tự hỏi: đối tượng này có
cần được **nhận diện, tìm kiếm, theo dõi lịch sử, liên kết module khác,
hoặc tồn tại lâu dài** không? Nếu có, nó cần định danh rõ ràng.

**3 lớp định danh** (không phải entity nào cũng cần đủ cả 3):
| Lớp | Dùng cho | Ai thấy | Ví dụ trong ERP này |
|---|---|---|---|
| Internal ID | Database, liên kết kỹ thuật | Không hiện với người dùng | `san_pham.id = 'sp_xxxxxxxxxxxx'` |
| Business Code | Vận hành nội bộ — tra cứu, in chứng từ, nói qua điện thoại | Người dùng | `san_pham.ma_sku = 'HN-MY-1000'` |
| External ID | Mã từ hệ thống ngoài, PHẢI mapping vào entity nội bộ, không thay thế danh tính ERP | Tuỳ nơi | `don_hang.order_sn` (mã đơn Shopee/TikTok) |

**Quy tắc cứng:**
1. Business Code không phụ thuộc thuộc tính có thể đổi (phòng ban, vị trí, trạng thái).
2. Code bất biến sau khi entity đã dùng trong nghiệp vụ — đổi tên/phòng ban được, đổi mã thì không.
3. Không tái sử dụng mã của entity đã ngừng hoạt động.
4. Code chỉ để NHẬN DIỆN — không nhét phòng ban/năm/trạng thái vào code nếu đã có field riêng lưu việc đó.
5. Code do hệ thống tự sinh (prefix + số chạy), người dùng không tự nghĩ mã.
6. Một entity — một Identity — nhiều Business Profile theo từng phòng (đã áp dụng đúng với `san_pham`: Kinh doanh khoá, Kho vận sửa, cùng 1 `san_pham.id`).
7. **Không tạo mã cho entity chưa có nhu cầu thật** (tìm kiếm/in ấn/scan/tích hợp) — đây cũng là 1 nguyên tắc, không kém quan trọng hơn việc tạo mã. Danh mục cấu hình nhỏ, ổn định, không giao tiếp ngoài thì tên + UNIQUE constraint là đủ.

## Phần 2 — Audit hiện trạng (đã soi schema thật)

### 1. Entity CẦN Business Code

| Entity | Hiện trạng | Việc cần làm |
|---|---|---|
| Sản phẩm/SKU (`san_pham`) | **ĐÃ CÓ** — `ma_sku TEXT UNIQUE` (VD `HN-MY-1000`), tách biệt với `id` nội bộ (`sp_xxx`) | Không cần sửa gì — đây chính là mô hình chuẩn, dùng làm khuôn mẫu cho các entity khác |
| Nhân sự (`nhan_su`) | **CHƯA CÓ** — chỉ có `id` nội bộ (`ns_xxx`, không hiện cho người dùng) + `ho_ten`. Không có cách nào phân biệt 2 người trùng tên | Thêm `ma_nv` (Employee Code) — xem mục 5 |
| Đơn hàng (`don_hang.order_sn`) | Có, nhưng là External ID (mã Shopee/TikTok) dùng luôn làm khoá chính | Chấp nhận được — xem mục 10 |
| Đơn hoàn (`don_hoan.return_sn`) | Tương tự đơn hàng | Chấp nhận được |
| Tài sản | **CHƯA TỒN TẠI TRONG HỆ THỐNG** | Module mới — xem mục 6-7 |

### 2. Entity KHÔNG cần Business Code — và lý do

| Entity | Lý do không cần |
|---|---|
| Phòng ban, Chức danh, Đơn vị tính | Danh mục cấu hình nội bộ, số dòng nhỏ (dưới vài chục), không in chứng từ/không giao tiếp bên ngoài, tên đã `UNIQUE` — thêm mã là làm phức tạp hoá không cần thiết (đi ngược nguyên tắc 4 & 7 ở Phần 1) |
| Nhà cung cấp | Hiện **0 nhà cung cấp thật** đã nhập (theo bảng Tình trạng dữ liệu nền) — chưa có nhu cầu tra cứu/in ấn thật. Ghi nhận là "điều kiện kích hoạt tương lai" (mục 8), không tạo mã trước |
| Kho (kho vật lý) | Công ty hiện vận hành **1 kho** — mã kho chỉ có ý nghĩa khi có ≥2 kho cần phân biệt trên chứng từ |
| Vị trí kho (zone/kệ) | Chưa tồn tại — kho chưa chia khu vực. Đúng nguyên tắc "không tạo tab/entity rỗng" đã thống nhất từ đầu phiên |
| Khách hàng | ERP không lưu khách hàng như 1 entity riêng — bán qua sàn, định danh khách thuộc về Shopee/TikTok (`don_hang.nguoi_mua` chỉ là tên hiển thị từ sàn). Không có nhu cầu CRM riêng ở giai đoạn này |
| Mục tiêu (MBO) / Công việc | Vòng đời ngắn trong nội bộ ERP, không in chứng từ, không tích hợp ngoài — `id` tự tăng là đủ |
| Lệnh sản xuất | Chưa tồn tại — công ty chưa có BOM/lệnh sản xuất thật (đã ghi trong ERP_V2_INFORMATION_ARCHITECTURE.md mục 7: "CREATE khi cần thật") |

### 3. Code Generation Architecture

Đề xuất module mới `src/dinh-danh.js`, tập trung 1 nơi duy nhất — không
hardcode format rải rác từng file:

```js
// Bảng đếm tập trung (migration mới):
// CREATE TABLE bo_dem_ma (loai TEXT PRIMARY KEY, tiep_theo INTEGER NOT NULL);

const CAU_HINH_MA = {
  nhan_su: { prefix: 'NV', so_chu_so: 4 },   // NV0001
  tai_san: { prefix: 'TS', so_chu_so: 4 }    // TS0001
  // Thêm loại mới chỉ cần thêm 1 dòng ở đây — không sửa nơi khác.
};

export async function sinhMa(env, loai) {
  const cfg = CAU_HINH_MA[loai];
  if (!cfg) throw new Error('Chưa cấu hình mã cho loại: ' + loai);
  // D1 hỗ trợ RETURNING — tăng và đọc trong 1 câu, tránh đụng độ khi 2
  // người tạo cùng lúc (khác với cách random UUID hiện dùng cho id nội bộ).
  const r = await env.DB.prepare(
    `INSERT INTO bo_dem_ma (loai, tiep_theo) VALUES (?, 1)
     ON CONFLICT(loai) DO UPDATE SET tiep_theo = tiep_theo + 1
     RETURNING tiep_theo`
  ).bind(loai).first();
  return cfg.prefix + String(r.tiep_theo).padStart(cfg.so_chu_so, '0');
}
```

Nguyên tắc: **KHÔNG** nhét phòng ban/năm/loại lao động vào code (đã có field
riêng lưu — `phong_ban_id`, `trang_thai`...). Mã chỉ để nhận diện.

### 4. Product/SKU Identity Model

Nguyên tắc gốc phân biệt Product (gốc) và SKU (biến thể đóng gói — VD Yến
mạch 500g/750g/1kg là 3 SKU của 1 Product). **Hiện trạng ERP chỉ có 1 tầng**
(`san_pham` = SKU, không có bảng Product cha).

**Đề xuất: GIỮ NGUYÊN 1 tầng**, chưa tách. Lý do: tình trạng dữ liệu nền cho
thấy **0/0 sản phẩm đã nhập thật** — tách 2 tầng trước khi biết pattern thật
(có bao nhiêu sản phẩm thật sự có nhiều quy cách đóng gói) là đoán mò, đúng
điều bị cấm ở nguyên tắc 7 Phần 1. `ma_sku` hiện tại đã là Business Code
chuẩn, đủ dùng.

**Điều kiện kích hoạt tách Product/SKU trong tương lai:** khi nhập liệu
thật lộ ra nhiều dòng `san_pham` chỉ khác nhau ở khối lượng/quy cách của
cùng 1 tên gốc (VD thấy "Yến mạch 500g", "Yến mạch 750g", "Yến mạch 1kg"
lặp lại mẫu này ở nhiều sản phẩm khác) — lúc đó thêm bảng `san_pham_goc`
và `san_pham.san_pham_goc_id`, không phá `ma_sku` đang có.

### 5. Employee Identity Model

```
nhan_su.id       -- Internal ID, đã có (ns_xxxxxxxxxxxx) — giữ nguyên
nhan_su.ma_nv    -- Business Code, MỚI — TEXT UNIQUE, sinh tự động (NV0001...)
nhan_su.ho_ten   -- Tên hiển thị — có thể đổi, không dùng để nhận diện
```

- `ma_nv` sinh 1 lần khi tạo hồ sơ (qua `sinhMa(env, 'nhan_su')`), hiển thị
  ở Nhân sự/Danh bạ/Quản trị cạnh tên — hữu ích ngay cả ở quy mô 15 người vì
  tên tiếng Việt dễ trùng.
- KHÔNG đổi khi nhân sự chuyển phòng ban/chức danh (đúng nguyên tắc 1&2).
- Khi nghỉ việc, mã KHÔNG cấp lại cho người mới — tự nhiên đúng vì sinh
  tuần tự tăng dần, không tái chế (nguyên tắc 3).
- HR/Admin vẫn là Data Owner (đã chốt ở [DATA_OWNERSHIP_MATRIX.md](./DATA_OWNERSHIP_MATRIX.md)) — `ma_nv` chỉ là 1 cột thêm vào cùng bảng, không đổi ownership.

### 6. Asset Management Domain (module hoàn toàn mới)

Chưa tồn tại trong ERP — thiết kế nhưng **chưa tạo trước khi có nhu cầu
thật** (xem lưu ý cuối tài liệu).

```sql
CREATE TABLE tai_san (
  id            TEXT PRIMARY KEY,          -- Internal ID (ts_ + uuid, giống san_pham)
  ma_ts         TEXT NOT NULL UNIQUE,      -- Business Code, sinh tự động (TS0001)
  ten           TEXT NOT NULL,
  danh_muc      TEXT,                       -- Laptop, Máy in, Xe nâng...
  trang_thai    TEXT NOT NULL DEFAULT 'san_sang',  -- xem lifecycle mục 7
  nguoi_giu_id  TEXT REFERENCES nhan_su(id),
  vi_tri        TEXT,
  tao_luc       TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
```

- **Data Owner**: P. Support (Hành chính) — đúng 4 phòng ban thật, không
  tách "Hành chính" riêng khỏi Support ngay (chưa có ai phụ trách riêng).
- Phòng khác chỉ **thao tác qua transaction** (nhận/trả/báo hỏng) — không
  sửa trực tiếp `tai_san` — cùng khuôn mẫu đã áp dụng cho `san_pham`
  (Kinh doanh khoá, Kho vận sửa ngày thường qua API riêng, không đụng bảng gốc tuỳ ý).
- Thiết kế `tai_san_id` độc lập ngay từ đầu để nếu sau này tách Hành chính
  thành domain riêng, KHÔNG phải đổi identity gì cả (đúng nguyên tắc "Identity
  khác Ownership").

### 7. Asset Lifecycle + Transaction Model

```
san_sang → da_cap_phat → dang_su_dung → da_thu_hoi → bao_hong/bao_tri → san_sang
                                                                        → da_thanh_ly (kết thúc)
```

Ledger bất biến — cùng khuôn mẫu `giao_dich_kho` (sổ cái, không sửa/xoá
dòng cũ) và `don_hang_lich_su`/`don_hoan_lich_su` (trigger AFTER UPDATE) đã
dùng trong ERP này:

```sql
CREATE TABLE tai_san_lich_su (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tai_san_id      TEXT NOT NULL REFERENCES tai_san(id),
  loai_su_kien    TEXT NOT NULL,   -- cap_phat|thu_hoi|dieu_chuyen|bao_hong|bao_tri|thanh_ly
  nguoi_giu_cu    TEXT, nguoi_giu_moi TEXT,
  vi_tri_cu       TEXT, vi_tri_moi    TEXT,
  nguoi_thuc_hien TEXT NOT NULL REFERENCES nhan_su(id),
  luc             TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
```

Trạng thái hiện tại của tài sản = suy ra từ dòng ledger mới nhất, không
overwrite trực tiếp `nguoi_giu_id`/`vi_tri` mà không ghi lịch sử.

**Kết nối với offboarding**: khi `nhan_su.trang_thai` chuyển sang nghỉ
việc, kiểm tra `SELECT COUNT(*) FROM tai_san WHERE nguoi_giu_id = ? AND
trang_thai NOT IN ('da_thu_hoi','da_thanh_ly')` — nếu còn tài sản chưa thu
hồi, cảnh báo/chặn hoàn tất offboarding (trừ khi Admin ghi đè có audit).

### 8. Module hiện tại cần bổ sung mã

| Module | Cần thêm | Ưu tiên |
|---|---|---|
| Nhân sự | `ma_nv` | Làm ngay — rẻ, rủi ro thấp, lợi ích rõ (phân biệt trùng tên) |
| Tài sản | Toàn bộ module + `ma_ts` | Chỉ làm khi công ty thật sự bắt đầu cấp phát/theo dõi tài sản qua ERP — hiện chưa ai yêu cầu tính năng này |
| Nhà cung cấp | `ma_ncc` | Hoãn — kích hoạt khi có ≥1 NCC thật cần in trên phiếu nhập |
| Phiếu nhập/xuất kho (`giao_dich_kho.phieu_id`) | Đổi từ uuid rút gọn sang mã dễ đọc (PN000123) | Hoãn — kích hoạt khi cần in chứng từ giấy thật cho NCC/đối tác |

### 9. Field & DB constraint cần bổ sung (khi triển khai mục 5+6)

- `ALTER TABLE nhan_su ADD COLUMN ma_nv TEXT UNIQUE;`
- `CREATE TABLE bo_dem_ma (loai TEXT PRIMARY KEY, tiep_theo INTEGER NOT NULL);`
- Bảng mới `tai_san`, `tai_san_lich_su` (mục 6-7) — CHƯA tạo cho tới khi có yêu cầu dùng thật.
- KHÔNG thêm cột mã cho `phong_ban`, `chuc_danh`, `don_vi_tinh`, `muc_tieu`, `cong_viec` (mục 2).

### 10. Nơi đang dùng tên/text thay cho ID — cần refactor

| Chỗ | Vấn đề | Mức ưu tiên |
|---|---|---|
| `nhan_su.bo_phan` / `nhan_su.chuc_vu` (text tự do) song song với `phong_ban_id`/`chuc_danh_id` (FK chuẩn đã có) | Đúng loại vi phạm nguyên tắc mới rõ nhất trong hệ thống — đây chính là việc "dọn cột trùng" đã pending từ trước (hiện 4/8 nhân sự thiếu `phong_ban_id`) | Đã có kế hoạch — chờ Sếp/HCNS nhập nốt 4 nhân sự còn thiếu, sau đó bỏ cột text |
| `giao_dich_kho.doi_tac` (TEXT tự do ghi tên NCC khi nhập kho) | Nên dùng `nha_cung_cap_id` khi nhập kho có chọn NCC thật | Đã tự ghi nhận trong migration `them-nhacungcap-kho.sql` là "bước sau" — chờ có NCC thật nhập vào hệ thống |
| `muc_tieu.bo_phan` (TEXT tự do, không FK tới `phong_ban`) | Mục tiêu cấp phòng ban lưu tên phòng dạng chữ | Thấp — tên phòng ban ổn định, ít đổi, chưa gây lỗi thật |
| `don_hang.order_sn` / `don_hoan.return_sn` dùng làm khoá chính | Về lý thuyết là External ID đội lốt Internal ID | **Chấp nhận được, không refactor** — đơn hàng luôn có đúng 1 nguồn gốc từ sàn, ERP không bao giờ tự sinh đơn hàng nội bộ, nên không có rủi ro đụng độ danh tính |

---

## Việc tiếp theo (chờ Sếp duyệt riêng — CHƯA code)

Theo đúng nguyên tắc 7 Phần 1 ("không tạo mã/entity khi chưa có nhu cầu
thật"), tài liệu này **cố tình tách 2 nhóm việc** thay vì code hết một lượt:

1. **Làm được ngay, rủi ro thấp**: thêm `ma_nv` cho Nhân sự + hạ tầng sinh
   mã tập trung (`src/dinh-danh.js` + bảng `bo_dem_ma`) — phục vụ đúng
   nhu cầu thật hiện có (15 người, tên dễ trùng khi công ty lớn lên).
2. **Thiết kế xong, chờ nhu cầu thật mới code**: toàn bộ module Tài sản
   (mục 6-7), mã Nhà cung cấp, mã phiếu nhập/xuất dễ đọc — chưa ai trong
   công ty đang cần dùng các tính năng này, tạo trước sẽ là tab/entity rỗng
   (đúng điều đã bị cấm trong ERP_V2_INFORMATION_ARCHITECTURE.md mục 7).
