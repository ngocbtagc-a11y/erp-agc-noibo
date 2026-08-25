# Audit UX/UI ERP Alpha Green Commerce
**Ngày:** 2026-08-21 · **Phạm vi:** giao diện, thao tác, mobile · **Trạng thái:** chỉ phân tích, chưa sửa gì

---

## Tóm tắt

**Tin bất ngờ tốt:** frontend hiện tại đã tự phát triển đúng khá nhiều nguyên tắc Sếp liệt kê — không phải làm từ 0. Đây là audit **KEEP/IMPROVE/REFACTOR/REPLACE**, không phải thiết kế lại từ đầu (đúng mục 43 brief).

| Đã ĐÚNG sẵn, không cần sửa | Đang SAI theo đúng nguyên tắc brief cảnh báo |
|---|---|
| Design token thật (`--sage`, `--r-pill`, `--shadow-sm`...) — mục 30 | **Bảng desktop chỉ co lại cuộn ngang trên mobile, KHÔNG chuyển Card** — đúng thứ mục 5 brief cấm |
| Navigation ẩn hẳn (không chỉ mờ) mục không có quyền — mục 12 | **Home (Tổng quan) giống nhau cho mọi vai trò** — chưa role-based thật — mục 2 |
| Status = chữ + màu, không chỉ màu — mục 14, 38 | **Không có Global Search** — mục 13 |
| Chống double-submit (`disabled` khi đang gửi) hầu hết mọi form — mục 16 | **Kho Nhập/Xuất chưa có quét mã** (Đơn hoàn thì đã có) — mục 28 |
| Empty state có ở hầu hết mọi danh sách, có gợi ý hành động — mục 21 | **Chưa phân biệt Primary/Secondary/Danger action rõ ràng bằng thị giác** ở vài màn — mục 15 |
| Bulk action đã có (Đơn hoàn, Kế toán tra soát) — mục 27 | Lỗi kỹ thuật đôi lúc lộ ra ngoài (vd "Máy chủ gặp sự cố" chung chung — chấp nhận được, nhưng chưa phân biệt loại lỗi) |
| Ngôn ngữ nghiệp vụ tiếng Việt thuần, không jargon — mục 40 | |

---

## 1. HOME SCREEN — role-based (mục 2-3)

**Hiện tại:** "Trạm Mục Tiêu" (Tổng quan) là **1 trang giống hệt cho mọi vai trò** — mọi người thấy: Vinh danh → Mục tiêu (công ty/phòng ban/cá nhân) → Giao việc/Việc tôi nhận-giao → thẻ số liệu → biểu đồ doanh thu (mẫu) → việc cần chú ý. Dữ liệu bên trong đã đúng người (mỗi người chỉ thấy việc của mình), nhưng **bố cục/thứ tự thông tin không đổi theo vai trò**.

**Đánh giá:** Đây KHÔNG sai — với 15-20 người, 1 trang chung dễ bảo trì hơn 8 trang riêng. Nhưng nhân viên kho đang phải lướt qua "Mục tiêu công ty", "Doanh thu 6 tháng" (không liên quan việc hàng ngày của họ) trước khi thấy việc cần làm.

→ **REFACTOR, không REPLACE.** Đề xuất: giữ 1 trang, nhưng **sắp xếp lại thứ tự khối theo vai trò** (không cần trang riêng) — ví dụ nhân viên kho/nhân viên vận hành thấy "Việc tôi nhận" lên đầu, Giám đốc thấy "Mục tiêu công ty" + "Việc cần chú ý" lên đầu. Đây là thay đổi CSS/JS thứ tự hiển thị, không phải kiến trúc mới.

---

## 2. RESPONSIVE TABLE — vi phạm rõ nhất (mục 5)

Xác nhận qua code thật (`style.css`):
```css
table { width: 100%; border-collapse: collapse; min-width: 560px; }
.table-wrap { overflow-x: auto; ... }
```
Mọi bảng (Đơn hoàn, Kho, Kế toán tra soát, Lịch sử) đều là `<table>` HTML thật, ép `min-width: 560px` rồi cho **cuộn ngang** trên màn hẹp — kèm cả thanh cuộn to, cột đầu "dính" (`sticky`) để dễ theo dõi khi cuộn. Đội đã làm rất kỹ phần này (đáng khen về mặt kỹ thuật), nhưng **đây chính xác là kiểu "co bảng desktop xuống mobile" mà brief nói KHÔNG nên làm**, thay vì chuyển thành Card.

→ **REFACTOR** — đây là hạng mục UI đáng làm nhất trong toàn bộ audit này, vì ảnh hưởng **mọi module vận hành hàng ngày** (Kho, Đơn hoàn, Kế toán) trên mobile — đúng nhóm "màn hình dùng thường xuyên nhất + mobile khó dùng nhất" mà mục 43 nói nên ưu tiên sửa trước.

**Đề xuất kỹ thuật cụ thể** (không đổi API, chỉ đổi cách hiển thị dữ liệu ĐÃ CÓ):
- Thêm 1 hàm dùng chung trong `app.js`: `veBangHoacCard(selector, ds, hangFn, cardFn)` — dưới 780px tự chuyển sang render Card thay vì `<tr>`.
- Card mẫu (đúng ví dụ brief đưa ra cho Đơn hoàn):
  ```
  #RETURN12345          [Shopee]
  Đang xử lý
  Nguyễn A · Còn 12 phút
  [Đã nhận]
  ```
- Làm trước ở **1 bảng dùng nhiều nhất** (đề xuất: "Cần đối soát" trong Kinh doanh, hoặc Tồn kho) để đo hiệu quả trước khi lan ra bảng khác — đúng tinh thần pilot, không sửa hết 1 lần.

---

## 3. FORM & SMART DEFAULTS (mục 7-8)

**Đã tốt:** Form "Giao việc mới", "Nhập/Xuất kho" đều ngắn, dùng `<select>`/search-filter cho danh sách người (ô lọc "Người phối hợp" tôi vừa thêm), ngày mặc định hôm nay ở Báo cáo kho.

**Còn thiếu:** Chưa có "smart default" theo ngữ cảnh vì **Assignment/Work Pattern core chưa tồn tại** (đúng như audit kiến trúc đã nói) — ví dụ nhân viên kho không có "kho đang đứng" để tự điền sẵn Warehouse. **Đây phụ thuộc Phase 3 (Workforce Core), không sửa được ở tầng UI đơn thuần.**

---

## 4. MINIMUM CLICKS / ACTION BUTTONS (mục 9, 15)

**Đã tốt, đáng khen:** Luồng đơn hoàn 3 chặng (Kho → Vận hành sàn → Kế toán) đúng tinh thần "nút trực tiếp" — "Đã nhận", "Đẩy sang Kho vận", "Đã tra soát" đều là 1 nút bấm thẳng, không qua Detail→Edit→Save. Mục tiêu (MBOs) cũng vậy: "Hoàn thành"/"Huỷ" là nút trực tiếp trên card.

**Chưa rõ ràng:** Primary/Secondary/Danger chưa tách biệt bằng style nhất quán — hiện dùng `btn-primary`/`btn-phu`/`btn-nho` (3 cấp độ kích thước/nổi bật) nhưng **"Huỷ" và "Hoàn thành" nhiều nơi dùng cùng class `btn-nho`**, không có biến thể "danger" (đỏ) riêng cho hành động khó hoàn tác.

→ **IMPROVE nhỏ:** thêm 1 class `.btn-danger` vào design system, áp cho các nút Huỷ/Xoá — vài dòng CSS, không đổi cấu trúc.

---

## 5. ERROR PREVENTION & CONFIRMATION (mục 16, 18)

**Đã đúng gần hết:** `confirm()` chỉ xuất hiện ở hành động khó hoàn tác (Huỷ mục tiêu, Chốt mục tiêu — đã tự thêm "Sau khi chốt sẽ KHOÁ, không sửa/huỷ được nữa" ngay trong hộp thoại, rất tốt). Các thao tác thường xuyên (Bắt đầu làm, Nộp kết quả) không bị hỏi xác nhận thừa.

**Về ngăn lỗi trước khi xảy ra (mục 16):** hiện tại validate chủ yếu ở tầng server SAU khi bấm (vd "Tồn không đủ để xuất"), chưa cảnh báo TRƯỚC khi user bấm (vd chưa hiện sẵn "chỉ còn 5" ngay trong ô nhập trước khi họ gõ số 10). Phần Xuất kho ĐÃ có nhắc tồn hiện tại ngay khi chọn sản phẩm (`kvXuatTonNhac`) — đây đúng hướng, chỉ cần nhân rộng.

---

## 6. NAVIGATION (mục 11-12)

**Đã đúng hoàn toàn:** tên tab tiếng Việt nghiệp vụ (Kho vận, Kế toán, Trạm Mục Tiêu...), ẩn hẳn (không disable) mục không có quyền — code `TAB.filter(...)` + server-side check kép. Không cần sửa gì ở đây.

---

## 7. GLOBAL SEARCH (mục 13)

**Chưa có** — mỗi màn hình có ô tìm riêng (Danh bạ, Đơn hoàn, Kho đều tự search cục bộ, không liên thông). Đúng như brief cho phép: **chưa cần làm ngay**, nhưng nên tránh đặt tên biến/API theo kiểu chỉ phục vụ 1 màn (hiện các API tìm kiếm đều xử lý phía client bằng JS filter trên dữ liệu đã tải về — nếu sau này thêm Global Search thật sẽ cần 1 API tìm kiếm phía server riêng, không tái dùng được các hàm lọc hiện tại. Ghi nhận, không cần sửa bây giờ).

---

## 8. SCANNING (mục 28)

Đơn hoàn đã có quét QR/mã vạch (thư viện `html5-qrcode`, nút "Quẹt QR" ngay cạnh ô tìm). Kho (Nhập/Xuất) — **nơi cần nhất theo brief** — chưa có, phải gõ tay mã SKU/chọn từ dropdown. Đây là gap rõ ràng nhất về mobile-for-warehouse.

→ **REFACTOR ưu tiên P1**, vì thư viện quét đã có sẵn trong dự án (`html5-qrcode.min.js`), chỉ cần gắn thêm nút quét vào 2 form Nhập/Xuất kho để tự điền `san_pham_id` — chi phí thấp, giá trị cao.

---

## 9. DESIGN SYSTEM (mục 29-31)

**Đã có, chất lượng tốt:** Token màu/spacing/radius/shadow nhất quán; component dùng chung: `.panel`, `.stat`, `.tag` (badge trạng thái), `.seg`/`.seg-nut` (tab con), `.form-luoi` (grid form), `.empty`, `.form-loi`/`.form-ok`. Module mới (Kho, Đơn hoàn, Mục tiêu, Kế toán) đều tái dùng đúng các class này — **không có tình trạng "mỗi module 1 kiểu CSS riêng"** mà brief lo ngại ở mục 31.

**Thiếu 1 thành phần:** chưa có Toast/Snackbar dùng chung — feedback sau hành động hiện hiển thị bằng `<div class="form-ok">` cố định trong form (chỉ thấy khi form đang mở) thay vì thông báo nổi góc màn hình thấy được dù cuộn tới đâu (mục 22).

→ **IMPROVE nhỏ, giá trị cao:** thêm 1 component Toast dùng chung (`veToast(text)` — hiện 2-3 giây rồi tự ẩn), thay dần các chỗ đang dùng `alert()` (nhiều chỗ trong code hiện dùng `alert()` trình duyệt xấu, chặn thao tác) — đây là điểm cải thiện UX rẻ, dễ thấy nhất trong toàn bộ audit.

---

## 10. MANAGER / CEO EXCEPTION-BASED UI (mục 36-37)

**Chưa tồn tại đúng nghĩa** — hiện Giám đốc/Phó Giám đốc xem CÙNG 1 trang Trạm Mục Tiêu như mọi người, chưa có view riêng kiểu "department health/bottleneck". Panel "Việc cần chú ý" (`tq-canhbao`) là mầm mống đúng hướng nhưng vẫn đang dữ liệu mẫu.

→ Đây là việc LỚN, phụ thuộc nhiều Core chưa có (Audit Log, Workforce) — **không làm ở giai đoạn UI, để sau khi Phase 3-4 kiến trúc xong** (đúng roadmap đã thống nhất ở audit kiến trúc).

---

## KEEP / IMPROVE / REFACTOR / REPLACE — tổng hợp

| Hạng mục | Phân loại | Ưu tiên |
|---|---|---|
| Design tokens, component dùng chung | **KEEP** | — |
| Navigation ẩn theo quyền | **KEEP** | — |
| Empty state, chống double-submit | **KEEP** | — |
| Bulk action (Đơn hoàn, Kế toán) | **KEEP** | — |
| Bảng → Card trên mobile | **REFACTOR** | **P1** — ảnh hưởng nhiều nhất |
| Quét mã cho Kho Nhập/Xuất | **REFACTOR** | **P1** — rẻ, thư viện có sẵn |
| Toast thay `alert()`/form-ok cố định | **IMPROVE** | P1 — rẻ, dễ thấy |
| `.btn-danger` cho hành động huỷ | **IMPROVE** | P2 |
| Home sắp xếp lại theo vai trò | **REFACTOR** | P2 |
| Cảnh báo lỗi TRƯỚC khi bấm (không chỉ sau) | **IMPROVE** | P2, làm dần từng form |
| Global Search | Chưa làm | P3 — chờ có nhu cầu thật |
| Manager/CEO exception view | **REPLACE LATER** | P3 — chờ Audit Log + Workforce Core (Phase 3-4) |

---

## Câu hỏi (chỉ hỏi cái không suy ra được từ code)

1. Giữa 4 việc P1 (Card mobile, quét mã kho, Toast, sắp Home theo vai trò) — Sếp muốn làm theo thứ tự nào, hay làm cả 4 song song?
2. "Card mobile" nên pilot ở màn nào trước — Kho (Tồn kho) hay Kinh doanh (Cần đối soát)? Cả hai đều là ứng viên tốt, tuỳ Sếp thấy ai đang kêu ca nhiều hơn.

*Chờ Sếp duyệt trước khi sửa UI.*
