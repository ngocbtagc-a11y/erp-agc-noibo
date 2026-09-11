# Feature Spec — Màn R&D sản phẩm (Kinh doanh → R&D)

> Đây là "lệnh" tôi tự viết ra từ yêu cầu của Sếp ("tạo 1 màn hình R&D sản
> phẩm có các bước R&D cơ bản cho sản phẩm thực phẩm, từ khâu lên A–Z"),
> điền theo `docs/templates/FEATURE-SPEC.md` — trả lời Architecture Gate
> bằng văn bản TRƯỚC khi code, đúng CLAUDE.md.
>
> Ngày: 2026-09-06 · Business Owner: ERP Owner (Sếp) · Domain: P. Kinh Doanh-MKT

---

## Problem

Ô R&D trong tab Kinh doanh hiện là placeholder ("Khu vực R&D đang chờ nội
dung"). Công ty đang phát triển sản phẩm mới (thực phẩm sạch/healthy/ăn
dặm) nhưng toàn bộ tiến trình nằm ngoài ERP — trong đầu người phụ trách,
Zalo, file rời. Hệ quả thật của ngành thực phẩm: quên bước pháp lý (kiểm
nghiệm, tự công bố), quên nhãn thiếu thông tin bắt buộc, chốt giá bán
trước khi tính đủ giá vốn + phí sàn, không ai biết "sản phẩm A đang ở đâu,
tắc chỗ nào, bao giờ lên sàn".

## Current flow

Không có. Làm tay, không lưu vết, không ai tra được trạng thái.

## Proposed flow

Mỗi ý tưởng sản phẩm = 1 **Dự án R&D** chạy qua **12 giai đoạn cố định**
(quy trình phát triển sản phẩm thực phẩm chuẩn, rút gọn đúng quy mô công
ty). Mỗi giai đoạn có sẵn **checklist việc phải làm**, trong đó có việc
**bắt buộc** — chưa xong việc bắt buộc thì **không chuyển được sang giai
đoạn sau** (cổng chặn, không phải nhắc suông).

12 giai đoạn A–Z:

| # | Giai đoạn | Ý nghĩa nghiệp vụ |
|---|---|---|
| 1 | Ý tưởng | Ghi ý tưởng, nguồn ý tưởng, khách hàng nhắm tới |
| 2 | Thẩm định thị trường | Có ai mua không, đối thủ bán giá nào, sản lượng dự kiến |
| 3 | Nguồn hàng & nguyên liệu | ≥2 NCC so sánh, báo giá/MOQ, hồ sơ ATTP của NCC |
| 4 | Công thức & mẫu thử | Chốt công thức/quy cách, nhận mẫu, chỉnh mẫu |
| 5 | Thử nếm & cảm quan | Nếm nội bộ + gửi khách thân thiết, kết luận đạt/chỉnh |
| 6 | Kiểm nghiệm & pháp lý | Kiểm nghiệm tại lab, tự công bố (NĐ 15/2018), ATTP cơ sở |
| 7 | Bao bì & nhãn | Nhãn đúng NĐ 43/2017 + 111/2021, mã vạch, in thử |
| 8 | Giá thành & định giá | Giá vốn đủ + phí sàn/ship/ads → chốt giá bán, biên LN |
| 9 | Sản xuất thử (lô pilot) | Đặt lô nhỏ, kiểm lô nhận, theo dõi HSD/độ ổn định |
| 10 | Duyệt ra mắt (Go/No-Go) | Trình hồ sơ, Ban giám đốc chốt ra mắt/hoãn/dừng |
| 11 | Ra mắt & lên sàn | Tạo SKU trong ERP, nhập kho lô đầu, lên listing 2 sàn |
| 12 | Theo dõi sau ra mắt | Rà doanh số/tồn/đánh giá 30–90 ngày → giữ/cải tiến/ngừng |

Ngoài luồng chính: **Tạm dừng** (giữ nguyên giai đoạn, quay lại được),
**Huỷ** (kết thúc, giữ lịch sử để tra cứu — không xoá cứng, đúng Rule 10).

## Actors

Theo đúng `src/quyen.js` hiện có — **KHÔNG thêm vai trò mới, KHÔNG sửa
`quyen.js`**:

| Ai | Xem | Thao tác |
|---|---|---|
| `admin` | ✅ | ✅ đủ, kể cả cổng Duyệt ra mắt |
| `van_hanh_san` (Kinh doanh/Vận hành sàn) | ✅ | ✅ đủ, kể cả cổng Duyệt ra mắt |
| `cskh`, `nv_test` | ✅ chỉ đọc | ❌ |
| Vai trò không có tab `kinhdoanh` (kho, kế toán, HCNS…) | ❌ | ❌ |

Cách kiểm: XEM = `duocXemTab(vai_tro, 'kinhdoanh')`. SỬA = `duocSuaSanPham()`.
DUYỆT RA MẮT / BỎ QUA CỔNG = `duocKhoaSanPham()`.

Lý do tái dùng đúng 2 hàm quyền Sản phẩm/SKU thay vì đẻ quyền mới: R&D là
việc **quyết định sẽ bán gì** — cùng một Data Owner với Sản phẩm/SKU
(Kinh doanh khoá/duyệt), đã chốt 22/08/2026 trong `DATA_OWNERSHIP_MATRIX.md`.
`quan_ly_kho` tuy có `sua_san_pham` nhưng KHÔNG có tab `kinhdoanh` nên
không với tới được — không cần chặn thêm.

## Data

Tra `docs/DATA-DICTIONARY.md`: **chưa có** entity nào cho R&D/NPD (mục
"Process" ghi rõ ERP chưa có Process Core dạng generic). Không có bảng gần
giống để Extend → tạo mới 3 bảng thuộc riêng domain Kinh doanh.

Entity dùng lại (**reference, tuyệt đối không copy**):
- `nhan_su` — người phụ trách, người thực hiện bước, người tạo/sửa.
- `san_pham` — khi ra mắt thì **gắn** dự án vào SKU đã tạo
  (`rnd_du_an.san_pham_id`), KHÔNG đẻ bảng sản phẩm thứ hai (Rule 1).

## Source of Truth

**ERP.** Theo nguyên tắc đã ghi trong `SOURCE-OF-TRUTH.md`: "ERP là System
Owner cho MỌI dữ liệu vận hành nội bộ không đến từ hệ thống ngoài". Dữ
liệu R&D sinh ra hoàn toàn trong nội bộ, không đồng bộ với Shopee/TikTok/
MISA. Không có ô UNDECIDED nào chặn feature này.

## Core reuse

| Việc | Dùng lại | Không viết mới |
|---|---|---|
| Sinh mã dự án `RD0001` | `sinhMa()` — `src/dinh-danh.js` | Không tự nối prefix + đếm |
| Bảng dữ liệu | `veBang()` | Vòng lặp innerHTML |
| Chọn người phụ trách | `ganCombo()` | select dài / ô tìm rời |
| Nhập nhanh 1 ô (ghi kết quả bước, lý do dừng) | `moHopNhap()` | `prompt()` |
| Tìm không dấu | `boDau()` | So khớp tự viết |
| Nhãn trạng thái | `.tag` + map `{chu, mau}` | Màu tự chế |
| Thẻ số liệu | `.stats`/`.stat` | Khối số liệu riêng |
| Nút / lỗi form / empty | `.btn-primary` `.btn-phu` `.btn-nho` `.form-loi` `.empty` | Style mới |
| Sổ cái lịch sử bất biến | đúng khuôn `tai_san_lich_su` | Cách ghi vết khác |
| Làm mới sau mutation | `window.LAM_MOI_RND` + gọi `window.LAM_MOI_*` liên quan | `location.reload()` |

## New Domain data

3 bảng mới, migration `migrations/them-rnd-sanpham.sql` — **chỉ CREATE, không
ALTER bảng nào đang có**:

- `rnd_du_an` — 1 dòng = 1 dự án phát triển sản phẩm (Master).
- `rnd_buoc` — checklist từng bước của từng giai đoạn, sinh sẵn lúc tạo dự
  án từ khuôn cứng trong `src/rnd.js` (quy trình là **code**, không phải dữ
  liệu người dùng tự sửa — tránh mỗi dự án một quy trình khác nhau).
- `rnd_lich_su` — sổ cái bất biến: ai chuyển giai đoạn, ai tick bước, ai
  duyệt/huỷ, lúc nào.

Thêm 1 dòng vào `CAU_HINH_MA` trong `src/dinh-danh.js` (`rnd_du_an → RD####`) —
đây là điểm mở rộng file đó tự khai báo ("Thêm loại mã mới chỉ cần thêm 1
dòng"), không đổi hành vi mã đang có.

## Permissions

Đã ghi ở mục Actors. **Không sửa `src/quyen.js`.** Chặn kép giống Tài sản:
`index.js` chặn tab, `src/rnd.js` tự kiểm quyền sửa/duyệt trước mỗi mutation
— trình duyệt ẩn nút chỉ là lịch sự, máy chủ mới là chốt chặn.

## Happy path

1. Kinh doanh bấm **+ Dự án R&D mới** → nhập Tên + Nhóm hàng + Đối tượng
   (người lớn / mẹ&bé) + Hạn ra mắt dự kiến → Lưu.
   → Hệ thống sinh `RD0001`, dựng sẵn 12 giai đoạn + 57 bước checklist (43 bắt buộc, 14 tuỳ chọn).
2. Hằng ngày: mở dự án → **tick bước đã làm** (1 click), gõ kết quả nếu cần.
3. Xong hết bước bắt buộc → nút **"Sang giai đoạn sau →"** sáng lên, bấm 1
   phát là chuyển, tự ghi lịch sử.
4. Tới giai đoạn 10 → chỉ người có quyền khoá SKU mới bấm được **Duyệt ra mắt**.
5. Giai đoạn 11 → **Gắn mã hàng (SKU)** đã tạo bên tab Sản phẩm vào dự án.
6. Xong giai đoạn 12 → dự án tự chuyển `hoàn thành`, nằm ở nhóm "Đã ra mắt".

## Exception path

- **Bước không áp dụng** với dự án này (VD sản phẩm không cần mã vạch GS1)
  → đánh dấu "Không áp dụng" thay vì tick khống. Vẫn qua cổng được.
- **Bỏ qua cổng** khi thật sự cần đi trước (VD chờ phiếu lab nhưng phải làm
  bao bì song song) → chỉ người có `khoa_san_pham` bấm được, **bắt buộc nhập
  lý do**, lý do đi thẳng vào sổ lịch sử. Không có nút "bỏ qua im lặng".
- **Tạm dừng / Huỷ** → bắt buộc nhập lý do, giữ nguyên toàn bộ dữ liệu.
- **Quay lại giai đoạn trước** (mẫu bị loại phải làm lại công thức) → có
  nút riêng, bắt buộc lý do, ghi sổ.

## SLA

Không đặt SLA cứng ở phase này. Chỉ cảnh báo mềm: dự án **quá hạn ra mắt
dự kiến** hiện tag đỏ + đếm ở thẻ thống kê.

## Audit

Bảng `rnd_lich_su` (sổ cái, chỉ INSERT — không UPDATE/DELETE) + cột
`tao_boi`/`tao_luc`/`cap_nhat_boi`/`cap_nhat_luc` trên `rnd_du_an`, đúng
pattern `_luc`/`_boi` đã dùng toàn ERP.

## UX

- Danh sách dự án: có **Search** (tên/mã/nhóm hàng) + lọc **Giai đoạn** +
  lọc **Trạng thái** — danh sách chắc chắn tăng dần theo thời gian.
- Chọn Người phụ trách: `ganCombo()` (danh sách nhân sự dài, ngưỡng ≥7).
- Đối tượng / Kênh / Ưu tiên: enum nhỏ cố định → `<select>` thường, **không**
  biến thành combobox (over-engineer enum là smell).
- Bảng giai đoạn: thanh tiến độ `.bar` + nhãn "Bước 6/12" — người xem hiểu
  ngay đang tắc ở đâu mà không phải mở chi tiết.
- Empty state tách 2 loại: "chưa có dự án nào" vs "không tìm thấy dự án khớp".
- Không hiện nút Sửa/Chuyển/Duyệt cho vai trò chỉ-đọc (permission-aware UX).

## Human Cost

| Việc | Tần suất | Thao tác | Ngân sách |
|---|---|---|---|
| Tick 1 bước đã làm | nhiều lần/ngày | mở dự án (1) + tick (1) = **2** | đạt |
| Chuyển giai đoạn | ~1 lần/tuần/dự án | 1 click + xác nhận = **2** | đạt |
| Tạo dự án mới | vài lần/tháng | 1 form 6 ô | đạt |

Checklist sinh sẵn = 0 thao tác nhập tay cho 57 bước — đây chính là chỗ
tiết kiệm lớn nhất so với làm tay.

## Acceptance Criteria

1. Tab Kinh doanh → pill **R&D** không còn placeholder; hiện thống kê +
   danh sách dự án + nút tạo mới (đúng quyền).
2. Tạo dự án mới → sinh mã `RD0001`, tự có đủ **12 giai đoạn / 57 bước**.
3. Chưa xong bước **bắt buộc** → bấm "Sang giai đoạn sau" bị **máy chủ**
   từ chối kèm tên bước còn thiếu (không phải chỉ ẩn nút ở trình duyệt).
4. Có quyền khoá SKU → bỏ qua cổng được nhưng **buộc nhập lý do**, lý do
   hiện trong lịch sử.
5. Tick bước / chuyển giai đoạn / tạm dừng → danh sách + thống kê cập nhật
   **ngay, không cần F5**.
6. Đăng nhập bằng vai trò `cskh` → xem được, **không thấy nút thao tác nào**;
   gọi thẳng API mutation vẫn bị chặn 403.
7. Mở trên điện thoại: bảng cuộn ngang được, nút bấm không vỡ layout.

## Migration

`migrations/them-rnd-sanpham.sql` — 3 bảng mới + 4 index. Không `ALTER`,
không `DROP`, không đụng dữ liệu đang chạy thật (2.300+ đơn hàng, 405+ đơn
hoàn không liên quan).

```
Nạp máy:  node scripts/chay-migration.mjs them-rnd-sanpham.sql
Nạp mây:  node scripts/chay-migration.mjs them-rnd-sanpham.sql --remote
```

## Risk

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Quy trình 12 bước quá nặng, người dùng bỏ giữa chừng | **Thật, cao nhất** | Bước bắt buộc chiếm 43/57 (75%) — đã rà lại và nới 7 việc mang tính tình huống sau lần test đầu (bản đầu 50/57 quá nặng); có "Không áp dụng"; có "bỏ qua kèm lý do". Rollout **PILOT** 1 dự án thật trước |
| Đẻ bảng sản phẩm thứ 2 | Đã chặn | Không có cột tên/SKU sản phẩm trong `rnd_du_an` ngoài `san_pham_id` tham chiếu |
| Nội dung pháp lý trong checklist ghi sai/lỗi thời | Trung bình | Checklist là **lời nhắc vận hành**, không phải tư vấn pháp lý; Sếp rà lại tên bước, sửa 1 chỗ trong `src/rnd.js` là đổi cho dự án tạo mới |
| Dự án cũ không nhận bước mới khi sửa khuôn | Thấp | Chấp nhận có chủ đích — dự án đang chạy giữ nguyên quy trình lúc bắt đầu, đúng Rule 10 (lịch sử phải còn đúng) |

## Rollback

Feature nằm gọn trong 3 bảng mới + 1 file `src/rnd.js` + 1 pane HTML. Lùi
= gỡ 9 route khỏi `DUONG_DAN` + ẩn pane; dữ liệu 3 bảng giữ nguyên, không
ảnh hưởng bảng nào khác. Không cần migration ngược.

## Rollout

**PILOT** — chạy thử với 1–2 dự án thật của Sếp trước, chưa gọi OFFICIAL
cho tới khi đi trọn 1 vòng A→Z ít nhất 1 lần.

## Boundary Classification

**`LOCAL_DOMAIN`** — tự triển khai được, không cần ERP Owner duyệt từng chi
tiết. Căn cứ đủ 6 điều kiện trong `ERP-CONSTITUTION.md`:

- Không sửa Core: `quyen.js` **không đụng**; `dinh-danh.js` chỉ thêm 1 dòng
  cấu hình qua đúng điểm mở rộng file đó công bố.
- Không đổi Source of Truth của dữ liệu nào đang có.
- Không tạo duplicate shared data: `nhan_su`/`san_pham` chỉ tham chiếu.
- Không ảnh hưởng domain khác: không sửa file/bảng/API của Kho vận, Kế
  toán, Nhân sự, Đơn hoàn.
- Không đổi integration contract: không đụng Shopee/TikTok.
- Không destructive migration: chỉ `CREATE TABLE`/`CREATE INDEX`.
