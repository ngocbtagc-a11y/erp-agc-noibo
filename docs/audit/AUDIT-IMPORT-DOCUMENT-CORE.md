# Audit Data Intake Core & Document Template Core — ERP Alpha Green Commerce
**Ngày:** 2026-08-21 · **Trạng thái:** chỉ phân tích, chưa code

---

## A. CURRENT STATE — code hiện có gì

| Năng lực | Hiện trạng | Bằng chứng |
|---|---|---|
| **Excel/CSV Import** | **KHÔNG CÓ** — 0 endpoint, 0 form upload file dữ liệu hàng loạt | Đã rà toàn bộ route table (`DUONG_DAN` trong `index.js`) |
| **Excel Export** | **CÓ, dạng nhỏ gọn** — hàm dùng chung `xuatCSV(tenFile, cotTieuDe, dsHang)` (CSV + BOM UTF-8, Excel mở đúng dấu tiếng Việt), đang dùng ở Kế toán tra soát + Hàng hỏng chờ huỷ | `public/assets/js/app.js:69-` |
| **File Upload** | **CÓ, 3 chỗ** — CCCD/ảnh đại diện, file đính kèm Chat, ảnh minh chứng khiếu nại | `nhansu.js`, `tin_nhan_chat`, `khieu_nai_minh_chung` |
| **File Storage** | base64 TEXT thẳng trong D1 cho ảnh (đã audit hiệu năng lần trước — chấp nhận được ở quy mô này); **R2 đã chuẩn bị sẵn cho video minh chứng, tạm khoá chờ bật** | `wrangler.toml` (bucket "MINH_CHUNG" comment sẵn) |
| **Print/PDF** | **KHÔNG CÓ** — 0 `@media print`, 0 `window.print()`, 0 thư viện PDF trong `package.json` | Đã grep toàn repo |
| **Document Template** | **KHÔNG CÓ khái niệm nào** | — |
| **"Lập biên bản" (Kế toán, hàng hỏng)** | Chỉ là **1 cờ trạng thái** (`bien_ban_luc`/`bien_ban_boi`) đánh dấu "đã đưa vào biên bản tháng này" — **KHÔNG sinh ra file/tài liệu nào**, chỉ đổi dữ liệu | `ktLapBienBan()` trong `index.js` |
| **API Intake (Shopee/TikTok)** | Đã audit kỹ ở lần trước — ghi thẳng vào bảng nghiệp vụ, **giữ nguyên payload gốc** trong `du_lieu_json`, có idempotency đúng chuẩn (PRIMARY KEY + upsert) | `shopee.js`, `tiktok.js` |
| **AI-assisted intake** | **ĐÃ CÓ 1 trường hợp hay** — đọc ảnh CCCD bằng Workers AI, tự điền sẵn form hồ sơ nhân sự mới, HR xác nhận lại | `nhansu.js: docCCCD()` |
| **Permission** | Hard-code trong `quyen.js`, theo tab/hành động — chưa ở dạng `resource.action` như đề bài mong muốn, nhưng nhất quán (đã audit) | — |
| **Audit** | Chưa có Audit Log chung (đã ghi nhận, nằm trong roadmap Phase 3 kiến trúc) | — |
| **Mobile UX form** | Đã audit UI lần trước — form ngắn, ít trường thừa, đã tốt | — |

**Phân loại:**
- **KEEP**: `xuatCSV()` — nền tảng export tốt, style nhất quán, không cần thay.
- **KEEP**: cơ chế upload ảnh nén-ở-trình-duyệt + base64 D1 cho ảnh nhỏ, cơ chế R2-sẵn-sàng cho file lớn.
- **CREATE NEW**: Import Center (chưa tồn tại gì để cải tiến).
- **CREATE NEW**: Document Template Core (chưa tồn tại gì để cải tiến).
- **KEEP** (không đổi): API Intake Shopee/TikTok — kiến trúc idempotent đã đúng, chỉ thiếu bước "Data Inbox" khi SKU không map được (mục 16 đề bài) — đây là **cải tiến nhỏ, không phải xây lại**.

---

## B. DATA INTAKE MAP — dữ liệu hiện vào ERP qua đâu

| Dữ liệu | Nguồn hiện tại | Ghi chú |
|---|---|---|
| Nhân viên mới | FORM (+ AI-OCR gợi ý từ ảnh CCCD) | Đã có smart-intake tốt nhất trong hệ thống |
| Sản phẩm/SKU | FORM (nhập từng mã) | **0 dữ liệu hiện tại** (đã audit Go-live) — sẽ là nơi Import Center có giá trị cao nhất |
| Đơn hàng, Đơn hoàn | API (Shopee/TikTok, tự động) | Đã chạy thật, 2.321 + 405 bản ghi |
| Giao dịch kho (nhập/xuất) | FORM (từng phiếu) | 0 dữ liệu hiện tại — chưa dùng |
| Công việc/Mục tiêu | FORM | Dữ liệu ít, mới |
| Chat, minh chứng khiếu nại | FORM + FILE UPLOAD | Hoạt động tốt |

---

## C. IMPORT PRIORITY

Dựa trên audit Go-live vừa xong (không đoán):

1. **Product/SKU** — **ưu tiên #1 tuyệt đối**. Đây là blocker duy nhất chặn pilot Kho, hiện 0 dòng. Nếu Sếp có sẵn danh mục sản phẩm dạng Excel (nhiều khả năng có, vì đang bán trên Shopee/TikTok), import hàng loạt tiết kiệm rất nhiều so với gõ tay từng mã.
2. **Opening Inventory (tồn kho đầu kỳ)** — ngay sau khi có SKU, cần nạp số tồn ban đầu để `giao_dich_kho` phản ánh đúng thực tế thay vì bắt đầu từ 0.
3. **SKU Mapping** (`sku_map`) — cần ngay sau đó để khớp lại 405 đơn hoàn cũ đang thiếu SKU (nhiều đơn hoàn hiện lưu `san_pham_ten` tự do, chưa có mã).
4. **Employee** — **KHÔNG cần Import Excel** ở quy mô 8 người — form "Thêm nhân sự" hiện tại đủ nhanh, làm Import Center cho 8 dòng là over-engineer.
5. **Supplier** — chưa cần, `giao_dich_kho` rỗng, chưa có nhu cầu thật.

---

## D. IMPORT ARCHITECTURE (đề xuất tối thiểu, đúng stack D1)

Đề bài mục 8 hỏi "phương án cân bằng" giữa 1 bảng JSON chung và nhiều bảng staging riêng — với D1/SQLite và quy mô SME, đề xuất:

```sql
-- 1 bảng Job dùng chung cho MỌI loại import
CREATE TABLE import_job (
  id             TEXT PRIMARY KEY,
  loai           TEXT NOT NULL,        -- 'san_pham' | 'ton_dau_ky' | 'sku_map' (mở rộng dần)
  ten_file       TEXT,
  trang_thai     TEXT NOT NULL DEFAULT 'da_tai_len',
                 -- da_tai_len | dang_doc | cho_xac_nhan | dang_ghi | xong | loi | huy
  tong_dong      INTEGER, dong_hop_le INTEGER, dong_loi INTEGER, dong_canh_bao INTEGER,
  nguoi_tao_id   TEXT NOT NULL, tao_luc TEXT NOT NULL,
  xac_nhan_luc   TEXT, hoan_tat_luc TEXT
);

-- 1 bảng dòng staging dùng chung — normalized_data ở dạng JSON vì MỖI loại
-- import có shape khác nhau (Product ≠ Opening Inventory ≠ SKU Mapping), nhưng
-- các cột kiểm soát (trạng thái/lỗi) tách RIÊNG để lọc/đếm nhanh, không chôn
-- trong JSON — đúng "phương án cân bằng" đề bài yêu cầu.
CREATE TABLE import_dong (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  import_job_id    TEXT NOT NULL REFERENCES import_job(id),
  so_dong          INTEGER NOT NULL,
  du_lieu_tho      TEXT NOT NULL,     -- JSON: đúng như đọc từ Excel
  du_lieu_chuan    TEXT,              -- JSON: sau khi chuẩn hoá (trim, ép kiểu...)
  trang_thai       TEXT NOT NULL,     -- hop_le | loi | canh_bao | da_ghi | bo_qua
  loi              TEXT,              -- chữ dễ hiểu, KHÔNG lộ lỗi kỹ thuật
  entity_khop_id   TEXT               -- id sản phẩm đã khớp nếu là UPDATE
);
```

**Chỉ 2 bảng** cho toàn bộ Import Core (không phải 1 bảng/loại import, không phải 1 bảng JSON khổng lồ không lọc được) — đúng tinh thần "generic nhưng vẫn validate/report được".

**API tối thiểu:**
- `POST /api/import/tai-len` — nhận file, tạo `import_job`, parse, ghi `import_dong`, validate, trả tổng kết (không ghi vào bảng chính).
- `GET /api/import/:id/xem-truoc` — trả danh sách dòng + lỗi để hiển thị Preview.
- `POST /api/import/:id/xac-nhan` — chỉ ghi các dòng `hop_le` vào bảng chính thật (`san_pham`...), theo lô (`env.DB.batch`, đúng bài học "Too many subrequests" đã gặp).
- `POST /api/import/:id/huy`.

---

## E. VALIDATION RULES (cho import pilot: Product/SKU)

| Kiểm tra | Hành động khi sai |
|---|---|
| Mã SKU trống | Lỗi — bắt buộc |
| Mã SKU trùng trong CHÍNH file đang import | Lỗi, chỉ dòng đầu hợp lệ |
| Mã SKU đã có trong `san_pham` | KHÔNG tự tạo mới — hỏi rõ: bỏ qua hay UPDATE (chỉ update `ten`, `danh_muc`, `ton_toi_thieu` — **không cho sửa `ma_sku`**) |
| Tên sản phẩm trống | Lỗi |
| Đơn vị tính không nằm trong danh sách đã dùng trước đó | Cảnh báo (không chặn — đơn vị tính hiện là TEXT tự do, đúng quyết định ở audit trước) |
| `ton_toi_thieu` không phải số nguyên ≥ 0 | Lỗi |

---

## F. DOCUMENT PRIORITY — 3 mẫu nên làm trước

Dựa trên nghiệp vụ **đang thật sự chạy** (không đoán):

1. **Biên bản hàng hỏng/hủy hàng** — nghiệp vụ NÀY ĐÃ TỒN TẠI trong code (`ktLapBienBan`) nhưng hiện **chỉ là 1 cờ trạng thái, không sinh ra tài liệu thật nào**. Đây là ứng viên tốt nhất để làm Document Instance đầu tiên vì: dữ liệu đã có sẵn 100% trong `don_hoan` (SKU, số lượng, kho, người phân loại, lý do) — đúng ví dụ "Document from Process" ở mục 31 đề bài, user chỉ cần nhập thêm "Nguyên nhân/Đề xuất xử lý".
2. **Phiếu nhập kho / Phiếu xuất kho** — mỗi lần nhập/xuất hiện tại chỉ lưu 1 dòng `giao_dich_kho`, chưa in được phiếu giấy. Cần khi có hàng thật để đối chiếu với NCC/người giao nhận.
3. **Đơn nghỉ phép** — **CHƯA CÓ nghiệp vụ này trong hệ thống ở bất kỳ dạng nào** (không có bảng, không có UI). Trước khi làm template, cần hỏi nghiệp vụ thật (đúng mục 50 đề bài) — KHÔNG code dựa trên giả định.

**Chưa làm ngay** (đúng "không xây 50 mẫu"): Hợp đồng lao động, Quyết định nhân sự — quy mô 8 người, hiện đang làm tay/ngoài ERP, chưa có tín hiệu đau đủ mạnh để ưu tiên trước Product Import.

---

## G. DOCUMENT ARCHITECTURE (đề xuất tối thiểu)

```sql
CREATE TABLE document_template (
  id             TEXT PRIMARY KEY,
  ma             TEXT NOT NULL,          -- 'BBHH' (biên bản hàng hỏng), 'PNK', 'PXK'...
  ten            TEXT NOT NULL,
  loai           TEXT NOT NULL,          -- 'kho' | 'nhan_su' | 'ke_toan'...
  phien_ban      INTEGER NOT NULL DEFAULT 1,
  noi_dung_html  TEXT NOT NULL,          -- HTML + {{bien}}, KHÔNG cho chạy SQL/JS tự do
  trang_thai     TEXT NOT NULL DEFAULT 'active',  -- draft | active | archived
  hieu_luc_tu    TEXT, hieu_luc_den TEXT,
  tao_boi        TEXT, tao_luc TEXT NOT NULL
);

CREATE TABLE document_instance (
  id               TEXT PRIMARY KEY,
  so_van_ban       TEXT,                 -- 'BBHH/2026/0012' — xem mục đánh số dưới
  template_id      TEXT NOT NULL REFERENCES document_template(id),
  template_phien_ban INTEGER NOT NULL,   -- ĐÓNG BĂNG version lúc phát hành
  loai_tham_chieu  TEXT, id_tham_chieu   TEXT,  -- vd 'don_hoan', return_sn
  du_lieu_snapshot TEXT NOT NULL,        -- JSON: TOÀN BỘ dữ liệu đã điền, đóng băng lúc ISSUED
  trang_thai       TEXT NOT NULL DEFAULT 'draft',  -- draft | issued | void
  tao_boi TEXT, tao_luc TEXT NOT NULL,
  phat_hanh_boi TEXT, phat_hanh_luc TEXT,
  huy_boi TEXT, huy_luc TEXT, ly_do_huy TEXT
);
```

**Trả lời trực tiếp mục 26 (Snapshot khi phát hành) — đây là điểm quan trọng nhất, đề xuất cách ĐƠN GIẢN NHẤT cho stack D1:** không cần lưu file PDF nhị phân làm "snapshot" — chỉ cần lưu `du_lieu_snapshot` dạng JSON (toàn bộ biến đã điền vào template tại thời điểm ISSUED) + `template_phien_ban`. Khi cần xem lại, render lại HTML từ JSON đã đóng băng + đúng bản template version đó — không bao giờ lệch, không tốn dung lượng file nhị phân, đúng nguyên tắc "không biến biểu mẫu thành database thứ hai".

**Đánh số văn bản (mục 29):** 1 bảng nhỏ `document_counter(prefix TEXT, nam INTEGER, so_hien_tai INTEGER, PRIMARY KEY(prefix, nam))`, tăng dần khi ISSUE — đủ dùng, không cần engine phức tạp.

---

## H. STORAGE — D1 vs R2

| Loại | Nơi lưu | Vì sao |
|---|---|---|
| `import_dong.du_lieu_tho/chuan` | D1 | Nhỏ (JSON text từng dòng Excel), tạm thời, đúng nguyên tắc mục 39 (Temporary ≠ Issued) |
| File Excel gốc user tải lên | **R2** (khi bật) — tạm thời D1 base64 chấp nhận được nếu <5MB/file vì chỉ dùng lúc import, xoá sau 7-30 ngày | Đề xuất retention riêng, KHÔNG giữ vĩnh viễn như document đã phát hành |
| `document_instance.du_lieu_snapshot` | D1 (JSON, nhỏ) | Không phải file nhị phân, không cần R2 |
| Bản scan chữ ký tay (nếu có sau này) | **R2** | File ảnh/PDF thật, cần giữ dài hạn — không lặp lại pattern base64-trong-D1 cho use case MỚI này (khác CCCD/chat đã có lý do lịch sử) |

---

## I. UI FLOW (tóm tắt, không mockup pixel-perfect)

**Import Center:** 1 màn mới trong Quản trị (hoặc Kho vận cho riêng Product) → chọn loại → tải template mẫu → upload → xem tổng kết (hợp lệ/lỗi/cảnh báo) → xem lỗi theo dòng → Xác nhận import → kết quả.

**Trung tâm Biểu mẫu:** 1 tab mới, nhóm theo phòng ban, mỗi mẫu có Preview + "Tạo tài liệu".

**Tạo tài liệu từ Process (ưu tiên hơn từ menu riêng):** nút "Lập biên bản" hiện có trong Kế toán → thay vì chỉ tick chọn, mở Preview biên bản đã tự điền sẵn từ `don_hoan`, chỉ cần gõ Nguyên nhân/Đề xuất → Phát hành → in.

---

## J. RISKS

| Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|
| Duplicate khi import lại cùng file | Trung bình | `ma_sku` đã là UNIQUE ở DB — tự chặn, chỉ cần UI báo rõ "đã tồn tại, chọn Update/Bỏ qua" |
| Dữ liệu bẩn lọt qua validation | Thấp nếu làm đúng mục E | Preview bắt buộc trước khi ghi, không auto-import |
| Document sai vì snapshot lệch | Thấp | Đóng băng `du_lieu_snapshot` + `template_phien_ban` lúc ISSUED (mục G) |
| Rò quyền xem template/document | Thấp | Tái dùng đúng pattern quyền theo tab đã có, thêm check theo `loai` template |
| Template mới phá document cũ | Thấp nếu tuân version | KHÔNG sửa `document_template` đang active — tạo bản ghi version mới |
| Phình dung lượng vì Excel gốc lưu mãi | Thấp | Retention riêng cho file import tạm (mục H) |

---

## K. ROADMAP

**P0 (làm trước, giá trị cao nhất):** Import Center MVP — chỉ 1 loại: **Product/SKU**. Đây trực tiếp gỡ blocker Go-live đã tìm thấy.

**P1:** Import Opening Inventory + SKU Mapping (nối tiếp P0, dùng lại đúng 2 bảng `import_job`/`import_dong`).

**P2:** Document Template Core MVP + pilot **Biên bản hàng hỏng** (dữ liệu đã có sẵn 100%, giá trị cao, rủi ro thấp).

**P3:** Mở rộng Phiếu nhập/xuất kho, rồi mới tới Đơn nghỉ phép (sau khi hỏi rõ nghiệp vụ — hiện chưa tồn tại).

**Không làm ở phase này:** Employee import, Supplier import, e-signature, Word/Office editor, BPMN.

---

## L. QUESTIONS FOR SẾP

1. **Product/SKU**: Sếp có sẵn file Excel/CSV danh mục sản phẩm đang dùng cho Shopee/TikTok không? Cột nào đang có sẵn (để tôi thiết kế đúng mẫu import, không bắt gõ lại)?
2. **Tồn kho đầu kỳ**: hiện kho có đang quản lý tồn bằng Excel/sổ tay không? Nếu có, số liệu đó đáng tin để nhập thẳng vào ERP làm mốc "đầu kỳ", hay cần kiểm kê lại trước?
3. **Đơn nghỉ phép** (nếu muốn làm sớm): hiện quy trình xin nghỉ đang làm thế nào (nhắn Zalo? giấy? ai duyệt)? Đúng nguyên tắc mục 50 — tôi cần hỏi trước khi thiết kế, không bịa.
4. **Biên bản hàng hỏng**: khi "lập biên bản" hiện tại, có đang in ra giấy ký tay không, hay chỉ lưu nội bộ để đối soát? (Quyết định có cần layout A4 chuẩn để in ngay từ đầu hay chưa.)

*Chờ Sếp xác nhận trước khi code.*
