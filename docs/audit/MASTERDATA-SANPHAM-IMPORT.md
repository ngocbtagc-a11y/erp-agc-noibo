# Master Data Sản phẩm/SKU — Schema thật + Template Import đề xuất
**Ngày:** 2026-08-21 · Đã xác minh trực tiếp trên D1 production (không đoán) · Chưa code, chưa tạo dữ liệu nào

---

## A. SCHEMA SẢN PHẨM HIỆN TẠI (xác nhận trực tiếp trên D1 thật)

```sql
CREATE TABLE san_pham (
  id            TEXT PRIMARY KEY,                  -- ERP tự sinh: 'sp_' + uuid
  ma_sku        TEXT NOT NULL UNIQUE,               -- mã hàng, vd HN-MY-1000
  ten           TEXT NOT NULL,
  danh_muc      TEXT,                               -- nhóm hàng, tự do
  don_vi        TEXT NOT NULL DEFAULT 'sản phẩm',
  theo_doi_hsd  INTEGER NOT NULL DEFAULT 1,         -- 1 = quản theo lô + FEFO
  ton_toi_thieu INTEGER NOT NULL DEFAULT 0,
  dang_ban      INTEGER NOT NULL DEFAULT 1,         -- 0 = ngừng kinh doanh
  tao_luc       TEXT NOT NULL DEFAULT (datetime('now','+7 hours'))
);

CREATE TABLE lo_hang (                              -- Lô hàng — KHÔNG thuộc Product Master,
  id, san_pham_id, so_lo, han_su_dung, tao_luc       -- phát sinh khi NHẬP KHO thật (phase Opening Inventory)
);

CREATE TABLE giao_dich_kho (                        -- Sổ cái kho — KHÔNG thuộc Product Master,
  id, phieu_id, san_pham_id, lo_hang_id, loai,       -- phát sinh khi có giao dịch thật
  so_luong, don_gia, doi_tac, ghi_chu, nguoi_id, luc
);

CREATE TABLE sku_map (                              -- Ghép TÊN sản phẩm trên sàn → SKU kho,
  ten_san_pham TEXT PRIMARY KEY,                     -- CHỈ dùng cho ĐƠN HOÀN (don_hoan.san_pham_ten),
  ma_sku, cap_nhat_luc, cap_nhat_boi                  -- KHÔNG phải mapping SKU sàn cho Đơn hàng
);
```

**Xác nhận số dòng thật hiện tại:** `san_pham` = 0, `lo_hang` = 0, `giao_dich_kho` = 0, `sku_map` = 0. Hoàn toàn trống — không có gì để dọn, chỉ có việc nhập mới.

**Lưu ý quan trọng về mục 3 yêu cầu ("Mapping SKU Shopee/TikTok"):** `don_hang` (bảng đơn hàng, đang có 2.321 dòng thật) hiện lưu **theo ĐƠN, không lưu theo từng dòng sản phẩm trong đơn** (không có bảng "chi tiết đơn hàng" liệt kê SKU nào, số lượng bao nhiêu trong mỗi đơn). Vì vậy **chưa có chỗ nào trong hệ thống thực sự cần "mapping mã SKU sàn ↔ SKU nội bộ" ở mức Product Master** — nhu cầu mapping SKU hiện tại CHỈ có ở luồng Đơn hoàn (đã có `sku_map`, đúng mục đích, không cần thêm). Đề xuất: **KHÔNG thêm cột mapping Shopee/TikTok vào Product Master import lần này** — đúng nguyên tắc "không thêm field nếu chưa có nhu cầu thật tương ứng". Nếu sau này cần theo dõi doanh thu theo từng SKU, đó là một nhu cầu lớn hơn (cần bảng "chi tiết đơn hàng" mới) — để riêng, không lẫn vào việc nhập Product Master lần này.

---

## B. TEMPLATE IMPORT ĐỀ XUẤT

| Cột trong file Excel | Bắt buộc? | Map vào cột DB | Định dạng hợp lệ | Ví dụ minh hoạ (KHÔNG phải dữ liệu thật) |
|---|---|---|---|---|
| **Mã SKU** | ✅ Bắt buộc | `ma_sku` | Chữ+số+gạch ngang, không dấu cách, không trùng trong file lẫn trong hệ thống | `HN-MY-1000` |
| **Tên sản phẩm** | ✅ Bắt buộc | `ten` | Văn bản, ≤200 ký tự | `Hạnh nhân Mỹ tách vỏ 1kg` |
| **Nhóm hàng** | ⬜ Tuỳ chọn | `danh_muc` | Văn bản ngắn — nên dùng ĐÚNG 1 trong các nhóm đã thống nhất (xem câu hỏi ở mục G) | `Hạt dinh dưỡng` |
| **Đơn vị tính** | ✅ Bắt buộc | `don_vi` | **PHẢI khớp đúng 1 giá trị trong danh mục chuẩn** (mục D) — không tự do | `túi` |
| **Theo dõi hạn sử dụng?** | ✅ Bắt buộc | `theo_doi_hsd` | Chỉ nhận `Có` hoặc `Không` | `Có` |
| **Tồn tối thiểu** | ⬜ Tuỳ chọn (mặc định 0) | `ton_toi_thieu` | Số nguyên ≥ 0 | `20` |
| **Đang kinh doanh?** | ⬜ Tuỳ chọn (mặc định Có) | `dang_ban` | Chỉ nhận `Có` hoặc `Không` | `Có` |

**Cột KHÔNG có trong template (ERP tự tạo, người dùng không sửa):**
- `id` — ERP tự sinh khi ghi vào DB, không hiển thị cho người nhập.
- `tao_luc` — ERP tự ghi thời điểm import.

**Cột KHÔNG đưa vào lần import này** (thuộc phase sau, không phải Product Master):
- Số lô, Hạn sử dụng cụ thể, Số lượng tồn — đây là **Opening Inventory** (mục F), một bước RIÊNG sau khi Product Master sạch.

---

## C. VALIDATION RULES

| Kiểm tra | Khi sai |
|---|---|
| Mã SKU trống | ❌ Lỗi — bỏ qua dòng |
| Mã SKU trùng trong CHÍNH file | ❌ Lỗi cả 2 dòng — bắt sửa file, không tự chọn 1 dòng |
| Mã SKU đã tồn tại trong `san_pham` | ⚠️ Không tự tạo mới — đánh dấu **CẬP NHẬT**, chỉ cho phép ghi đè `ten`, `danh_muc`, `don_vi`, `theo_doi_hsd`, `ton_toi_thieu`, `dang_ban`. `ma_sku` (khoá) không bao giờ đổi qua import. |
| Tên sản phẩm trống | ❌ Lỗi |
| Đơn vị tính không khớp danh mục chuẩn (mục D) | ❌ Lỗi — **không tự đoán/tự sửa chính tả** |
| "Theo dõi HSD?"/"Đang kinh doanh?" không phải đúng `Có`/`Không` | ❌ Lỗi |
| Tồn tối thiểu không phải số nguyên ≥ 0 | ❌ Lỗi |

Không có dòng nào được ghi thẳng vào `san_pham` trước khi qua đủ các bước ở mục 5 (Parse → Validate → Preview → Xác nhận).

---

## D. DANH MỤC ĐƠN VỊ TÍNH — đề xuất (chờ Sếp xác nhận/chỉnh, KHÔNG tự suy đoán là quyết định cuối)

Dựa trên đặc thù thực phẩm sạch/eat clean/mẹ&bé (theo hồ sơ công ty), đề xuất **danh sách khởi điểm** — Sếp bớt/thêm trước khi tôi khoá thành validation:

`túi`, `hộp`, `gói`, `chai`, `lọ`, `thùng`, `kg`, `g`, `lít`, `ml`, `bộ`, `cái`

**Nguyên tắc chống bẩn dữ liệu (đúng mục 4 yêu cầu):** validation **so khớp CHÍNH XÁC** với danh sách này (phân biệt hoa/thường ở tầng nhập liệu, nhưng lưu chuẩn hoá 1 dạng duy nhất, vd luôn lưu `kg` chữ thường) — không nhận `Kg`, `KG`, `Kilogram`. Nếu Sếp có đơn vị nào ngoài danh sách trên, báo tôi thêm vào danh mục TRƯỚC khi import, không thêm ngẫu hứng lúc đang chạy import.

---

## E. MAPPING SKU SHOPEE/TIKTOK

Như đã giải thích ở mục A: **không cần cho lần import Product Master này.** `sku_map` hiện có (name→SKU cho Đơn hoàn) giữ nguyên, không đổi. Nếu sau này cần "doanh thu theo từng SKU" từ đơn hàng thật, đó là một tính năng riêng (cần bảng chi tiết dòng đơn hàng) — không lẫn vào việc nhập danh mục sản phẩm lần này.

---

## F. QUY TRÌNH OPENING INVENTORY (sau khi Product Master sạch)

```
1. Product Master đã import xong, đã Sếp xác nhận đúng.
2. Kho đếm thực tế (Physical Count) — TỰ LÀM NGOÀI ERP, không phải việc của tôi.
3. Đối chiếu (mục 7 yêu cầu):
   SKU | Tên | Đếm thực tế | Ghi chú
   → Không có cột "ERP Master" ở bước này vì ERP CHƯA có tồn nào (đang là 0) —
     việc đối chiếu thật sự xảy ra ở LẦN NHẬP TIẾP THEO (sau khi có tồn đầu kỳ),
     không phải lần này.
4. Xác nhận NGÀY CHUYỂN ĐỔI (cutover date) — mốc mà từ đó ERP là nguồn sự thật
   duy nhất cho tồn kho.
5. Với mỗi SKU có hàng, tạo 1 dòng NHẬP KHO (loại 'nhap') vào giao_dich_kho,
   doi_tac = 'Tồn đầu kỳ chuyển đổi ERP', ghi_chu = ngày cutover, số lượng =
   số đếm thực tế. Có HSD/lô → tạo lo_hang tương ứng.
6. KHÔNG bịa lịch sử nhập/xuất trước đó — chỉ 1 dòng "tồn đầu kỳ" duy nhất mỗi
   SKU, đúng nguyên tắc "không giả lập lịch sử cũ".
```

**Cơ chế kỹ thuật:** dùng LẠI đúng API `POST /api/kho/nhap` đã có sẵn (không cần bảng/endpoint mới) — chỉ cần Import Center gọi lặp theo lô (batch) thay vì Sếp/kho gõ tay từng dòng. Không phải xây quy trình mới, chỉ là "nhập hàng loạt" cho 1 nghiệp vụ đã tồn tại.

---

## G. DỮ LIỆU TÔI CẦN SẾP/KHO CUNG CẤP

1. **File danh mục sản phẩm thật** (Excel/CSV hiện có, hoặc export từ Shopee Seller Center) — càng gần đúng 7 cột ở mục B càng tốt, không bắt buộc đúng thứ tự, tôi map lại.
2. **Xác nhận danh sách Nhóm hàng chính thức** (vd: Hạt dinh dưỡng, Trái cây sấy, Ăn dặm, Ăn kiêng...) — nếu chưa có danh sách chính thức, tôi vẫn nhập được nhưng để tự do, chuẩn hoá sau.
3. **Xác nhận/chỉnh danh mục Đơn vị tính** ở mục D.
4. **Ngày cutover dự kiến** cho Opening Inventory (mục F) — chỉ cần khi Product Master đã xong.
5. **File/số liệu đếm tồn kho thực tế** (khi tới bước F, chưa cần ngay).

---

## H. MIGRATION ĐỀ XUẤT — tách Employment Type khỏi trạng thái hợp đồng

**Hiện trạng xác nhận thật:** cột `nhan_su.trang_thai` đang nhận cả 2 loại giá trị khác bản chất — `da_ky`/`thu_viec`/`cho_ky`/`can_trao_doi` (trạng thái HỢP ĐỒNG) và `parttime` (loại hình LÀM VIỆC) trong CÙNG một cột. **Dữ liệu thật hiện tại: cả 8/8 nhân sự đang là `da_ky`, KHÔNG có ai đang mang giá trị `parttime`** — nghĩa là migration này **rủi ro gần bằng 0** vì chưa có dữ liệu thật nào cần dịch chuyển sai.

**Đề xuất migration (chỉ tạo cột, KHÔNG chạy chuyển dữ liệu ngay theo đúng yêu cầu Sếp):**
```sql
ALTER TABLE nhan_su ADD COLUMN loai_hinh_lam_viec TEXT;  -- 'FULL_TIME' | 'PART_TIME', NULL = chưa xác định
```
Giữ nguyên `trang_thai` như cũ (không đổi, không xoá `parttime` khỏi danh sách giá trị hợp lệ ngay) để không phá gì đang chạy. Khi Sếp xác nhận sẵn sàng, bước tiếp theo (KHÔNG làm trong migration này) sẽ là: với nhân sự có `trang_thai='parttime'`, gán `loai_hinh_lam_viec='PART_TIME'` + trả `trang_thai` về đúng trạng thái hợp đồng thật (`da_ky`/`thu_viec`...). Vì hiện chưa ai ở trạng thái đó, **an toàn để làm bất cứ lúc nào Sếp sẵn sàng**, không cần gấp.

---

## I. RISKS

| Rủi ro | Mức độ | Ghi chú |
|---|---|---|
| Đơn vị tính không khớp danh mục chuẩn | Thấp nếu chốt mục D trước | Validation chặn cứng, không tự sửa |
| Import lại đè nhầm dữ liệu đã sửa tay trên UI | Thấp | Preview luôn hiện rõ CREATE vs UPDATE trước khi xác nhận |
| Opening Inventory sai vì đếm thực tế sai | Không phải rủi ro kỹ thuật — trách nhiệm đối chiếu thuộc Kho, ERP chỉ ghi đúng số được xác nhận | Đã tách bước đối chiếu riêng (mục F) |
| Migration `loai_hinh_lam_viec` | Gần như 0 — chỉ thêm cột, không đụng dữ liệu hiện có | Đã xác minh trên dữ liệu thật |

---

## J. THỨ TỰ TRIỂN KHAI

1. Sếp xác nhận/chỉnh mục D (đơn vị tính) + cung cấp file sản phẩm thật (mục G.1).
2. Tôi dựng Import Center MVP (chỉ Product/SKU) theo đúng kiến trúc đã đề xuất ở audit trước (`import_job` + `import_dong`, 2 bảng, không hơn).
3. Import thật → Sếp xác nhận Product Master đúng.
4. Chạy migration cột `loai_hinh_lam_viec` (an toàn, có thể làm song song bước 2-3, không phụ thuộc).
5. Đến ngày cutover đã chốt → chạy Opening Inventory (mục F), dùng lại API Nhập kho có sẵn.

*Dừng ở đây — chờ Sếp cung cấp dữ liệu thật ở mục G trước khi tôi code Import Center.*
