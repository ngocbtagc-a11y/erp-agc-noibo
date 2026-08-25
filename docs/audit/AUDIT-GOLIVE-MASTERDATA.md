# Audit Go-Live Foundation & Master Data — ERP Alpha Green Commerce
**Ngày:** 2026-08-21 · **Phương pháp:** đọc code + **truy vấn trực tiếp dữ liệu thật trên D1 production** (chỉ đọc, không sửa) · **Trạng thái:** chỉ phân tích, chưa code/sửa dữ liệu

---

## ⚠️ PHÁT HIỆN QUAN TRỌNG NHẤT — đọc trước khi đọc phần còn lại

Sau khi truy vấn thật, bức tranh khác với giả định ban đầu ("Kho là pilot đầu tiên"):

| Mảng | Dữ liệu thật hiện có | Thực trạng |
|---|---|---|
| **Đơn hàng (`don_hang`)** | **2.321 đơn**, 2.250 khách khác nhau | **Đã chạy thật, không còn là pilot** — Shopee/TikTok đang đồng bộ sống |
| **Đơn hoàn (`don_hoan`)** | **405 đơn** | **Đã chạy thật** — quy trình 3 chặng Kho→Vận hành sàn→Kế toán đang hoạt động |
| **Sản phẩm (`san_pham`)** | **0 dòng** | **CHƯA HỀ CÓ dữ liệu** |
| **Sổ cái kho (`giao_dich_kho`)** | **0 dòng** | **CHƯA HỀ dùng — 0 lần nhập/xuất nào được ghi** |
| **Lô hàng (`lo_hang`)** | **0 dòng** | **Chưa dùng** |
| **Ánh xạ SKU (`sku_map`)** | **0 dòng** | Chưa dùng (vì chưa có SKU để map) |

**Kết luận ngược với đề xuất "pilot ở Kho" trong các trao đổi trước:** mảng **Kinh doanh/Marketplace đã VƯỢT QUA giai đoạn pilot rồi** (đang chạy thật với ~2.700 bản ghi), còn **mảng Kho — nơi định chọn làm pilot đầu tiên — thực ra CHƯA CÓ MỘT DÒNG DỮ LIỆU NÀO**, kể cả danh mục sản phẩm. Module `kho.js` code đã sẵn sàng (ledger đúng chuẩn, đã audit ở lần trước), nhưng **chưa ai từng nhập 1 mã hàng nào vào hệ thống**.

→ Đây không phải lỗi — là điều bình thường trước go-live. Nhưng nó đổi hẳn thứ tự việc cần làm: **trước khi "pilot Kho" có ý nghĩa gì, phải nhập Master Data sản phẩm trước tiên.** Không có bước nào có thể bỏ qua bước này.

---

## A. MASTER DATA INVENTORY

| Entity | Bảng hiện có | Status | Thiếu trường | Chất lượng dữ liệu | Bắt buộc trước pilot? |
|---|---|---|---|---|---|
| Company | *(không có bảng riêng)* | **NOT_REQUIRED_YET** | — | Chỉ 1 công ty, tên hard-code "Alpha Green Commerce" trong giao diện | Không — 1 record không cần bảng |
| Department | `nhan_su.bo_phan` (TEXT tự do) | **EXISTS_NEEDS_CLEANUP** | Không có bảng chuẩn hoá | 4 giá trị thật: "Ban giám đốc", "Kho vận", "Kinh Doanh" (chữ hoa không nhất quán so với 2 tên kia), "Test" (rác) | Có — dọn "Test", thống nhất chính tả |
| Position | `nhan_su.chuc_vu` (TEXT tự do) | **EXISTS_NEEDS_CLEANUP** | Không có danh mục chuẩn | 8 chức danh thật, có "Reviewer"/"Test lương" (rác) | Có — dọn rác |
| Employee | `nhan_su` | **EXISTS_AND_OK** (nhưng RẤT ít dữ liệu) | — | **Chỉ 8 nhân sự active, 0 đã nghỉ** — 2 trong 8 là tài khoản Test/Reviewer, không phải người thật | Có — cần nhập đủ nhân sự thật trước go-live |
| Employment Type | *(không có, đang lẫn trong `trang_thai`)* | **MISSING_BUT_REQUIRED** cho Workforce sau này, **NOT_REQUIRED_YET** cho go-live cơ bản | FULL_TIME/PART_TIME riêng | `trang_thai` hiện có giá trị `parttime` lẫn với `da_ky`/`thu_viec` — đang trộn 2 khái niệm khác nhau (trạng thái hợp đồng vs loại hình làm việc) | Không bắt buộc ngay, nhưng nên tách trước khi thêm PT thật |
| User Account | `tai_khoan` | **EXISTS_AND_OK** | — | **8/8 tài khoản khớp đúng 1-1 với nhân sự, không có tài khoản mồ côi, không có tài khoản active của nhân sự đã nghỉ** — sạch | Đạt |
| Role | Hard-code trong `quyen.js` | **EXISTS_AND_OK** | — | 7/9 role đang thực sự có người giữ (`ke_toan_truong`, `hcns` khai báo sẵn nhưng **chưa ai giữ**) | Đạt cho pilot Kho/Marketplace, thiếu người cho Kế toán/HCNS |
| Permission | Hard-code trong `quyen.js` | **EXISTS_AND_OK** | Chưa ở dạng DB (không bắt buộc trước pilot theo đúng đề bài) | Đã audit kiến trúc lần trước — nhất quán, không rải rác | Đạt |
| Product/SKU | `san_pham` | **MISSING_BUT_REQUIRED** | — | **0 DÒNG** | **CÓ — BLOCKER lớn nhất** |
| Unit of Measure | `san_pham.don_vi` (TEXT tự do, cột đã có sẵn) | Chưa đánh giá được (bảng rỗng) | — | N/A | Sẽ lộ ra khi nhập sản phẩm — cần thống nhất ngay lúc nhập, đừng để tự do |
| Warehouse | *(không có bảng — code giả định 1 kho duy nhất)* | **NOT_REQUIRED_YET** | — | Đúng thực tế hiện tại (1 kho) | Không, trừ khi Sếp xác nhận có >1 kho thật |
| Supplier | *(không có bảng — `giao_dich_kho.doi_tac` TEXT tự do)* | **NOT_REQUIRED_YET** | — | Chưa có dữ liệu (vì sổ cái kho rỗng) | Không bắt buộc ngay — TEXT tự do đủ dùng ở quy mô này, chuẩn hoá sau nếu số nhà cung cấp tăng |
| Sales Channel | Hard-code `'shopee'`/`'tiktok'` trong code | **EXISTS_AND_OK** | — | Chỉ 2 giá trị cố định, không rủi ro duplicate | Đạt |
| External ID Mapping | `sku_map` | **EXISTS_AND_OK** (kiến trúc đúng) nhưng **rỗng** | — | 0 dòng — chưa có gì để map | Sẽ cần ngay khi có SKU thật + đơn hoàn cũ cần khớp lại |
| Task Type | *(chưa có danh mục — `cong_viec` là tiêu đề tự do)* | **NOT_REQUIRED_YET** | — | Chỉ 3 công việc đã tạo — chưa đủ để thấy pattern | Không bắt buộc, Trạm Mục Tiêu đang hoạt động tốt ở dạng tự do |
| Skill | *(chưa có)* | **NOT_REQUIRED_YET** | — | — | Không |
| Process Definition | *(chưa có — quy trình đơn hoàn viết tay trong code)* | **NOT_REQUIRED_YET** (đã hoạt động tốt ở dạng hiện tại) | — | 405 đơn hoàn đã chạy qua quy trình viết tay, không lỗi lớn | Không cần chuẩn hoá trước go-live |
| Audit Log | *(chưa có bảng chung — đã ghi nhận ở audit kiến trúc)* | **MISSING_BUT_REQUIRED** dần | — | — | Nên có trước khi mở thêm quyền Kế toán/điều chỉnh tồn kho thật |

---

## B. DATABASE READINESS SCORE

| Mảng | Điểm | Vì sao |
|---|---|---|
| Organization (Company/Dept/Position) | **PARTIAL** | Có dữ liệu nhưng lẫn rác ("Test"), chưa chuẩn hoá chính tả |
| People (Employee) | **PARTIAL** | Cấu trúc sạch, nhưng chỉ 8 người — thiếu nhân sự thật cho go-live toàn công ty |
| Auth (User Account) | **READY** | Đối chiếu thật: 0 lỗi mồ côi/lệch trạng thái |
| Permission | **READY** | Cho pilot Kho/Marketplace. **PARTIAL** cho Kế toán/HCNS (chưa ai giữ role) |
| Product/Master Data hàng hoá | **NOT_READY** | 0 dòng — blocker |
| Warehouse | **READY** | Đúng với thực tế 1 kho, không cần thêm |
| Orders/Marketplace | **READY** (đã vượt pilot, đang chạy thật) | 2.321 đơn, 405 đơn hoàn, dữ liệu đa dạng khách hàng hợp lý |
| Workforce (Schedule/Shift/PT) | **NOT_READY** | Chưa tồn tại — đúng roadmap đã thống nhất, chưa tới lượt |
| Task | **PARTIAL** | Kiến trúc sẵn sàng, dữ liệu thật còn rất ít (3 việc) |
| Audit | **NOT_READY** | Chưa có Audit Log chung — nên có trước khi mở quyền điều chỉnh tồn kho/tài chính rộng hơn |

---

## C. DATA CLEANUP REPORT (đã chạy thật, không tự sửa)

1. **2 tài khoản "Test"/"Reviewer"** đang nằm trong `nhan_su` với `bo_phan = 'Test'`, `dang_lam = 1` — cùng loại tài khoản `nv_test` đã ẩn khỏi Danh bạ/bộ chọn người ở phiên trước, nhưng **bản thân record `nhan_su` vẫn còn đó**, vẫn tính vào số "8 nhân sự". Đề xuất: giữ tài khoản để test (đúng mục đích ban đầu) nhưng **không tính vào báo cáo headcount thật** khi Sếp xem số liệu HCNS.
2. **"Kinh Doanh"** (viết hoa 2 chữ) không nhất quán với **"Ban giám đốc"**, **"Kho vận"** (chỉ viết hoa chữ đầu). Không gây lỗi chức năng (vì đang là TEXT tự do, không so sánh chuẩn hoá ở đâu), nhưng nên thống nhất trước khi Department trở thành danh mục cứng.
3. **Employee Status vs Employment Type đang trộn lẫn**: `trang_thai` có cả `da_ky`/`thu_viec`/`cho_ky` (trạng thái hợp đồng) lẫn `parttime` (loại hình làm việc) trong CÙNG một cột. Đây đúng silo nhỏ mà brief Workforce trước đã cảnh báo (mục 8: "Employment Type khác Position") — ở đây là "Employment Type đang lẫn vào Trạng thái hợp đồng". Không cần sửa gấp (chưa có PT thật), nhưng nên tách trước khi tuyển PT đầu tiên.
4. **`san_pham`/`giao_dich_kho`/`lo_hang`/`sku_map` đều rỗng** — không phải vấn đề "dọn dữ liệu bẩn", mà là "chưa từng có dữ liệu". Việc cần làm là NHẬP, không phải LÀM SẠCH.
5. **Không phát hiện**: trùng `employee_code` (không có cột này, dùng `id` uuid nên không trùng), tài khoản mồ côi, tài khoản active của nhân sự nghỉ việc, đơn hàng thiếu `nguon`/`channel`.

---

## D. REQUIRED SEED DATA — chính xác Sếp cần cung cấp

**Để chuẩn hoá Organization (làm ngay, rẻ):**
- Xác nhận danh sách phòng ban chính thức (tên chuẩn, viết hoa nhất quán) — hiện đoán có: Ban Giám đốc, Kho vận, Kinh Doanh (Vận hành sàn + CSKH?), và cần thêm Kế toán, HCNS nếu đã có người.
- Xác nhận 2 tài khoản "Test"/"Reviewer" có giữ nguyên trong `nhan_su` hay chuyển hẳn ra khỏi bảng này (đề xuất giữ, chỉ cần biết để loại khỏi báo cáo headcount).

**Để pilot Kho có ý nghĩa (BẮT BUỘC, đây là việc lớn nhất):**
- **Danh mục sản phẩm/SKU thật** — tối thiểu: mã SKU, tên, nhóm hàng, đơn vị tính, có theo dõi hạn sử dụng hay không, mức tồn tối thiểu. Đây là input duy nhất tôi không thể tự suy ra hay bịa — phải lấy từ Sếp/kho thật.
- **Tồn kho hiện tại** (nếu có, để nhập 1 "phiếu nhập đầu kỳ" cho mỗi SKU) — nếu kho đang quản lý bằng Excel/sổ tay, cần bảng đối chiếu số dư hiện tại trước khi chuyển hẳn ERP thành nguồn sự thật.

**Để Permission đủ cho go-live (nếu mở rộng ngoài Kho/Marketplace):**
- Ai sẽ giữ vai trò `ke_toan_truong` và `hcns` — hiện chưa ai có 2 role này dù đã định nghĩa sẵn trong code.

---

## E. DATABASE CHANGES — thực sự cần thêm gì

**Không cần thêm bảng mới nào để go-live Kho/Marketplace.** Toàn bộ hạ tầng (san_pham, lo_hang, giao_dich_kho, don_hang, don_hoan) đã tồn tại đúng chuẩn — chỉ thiếu **dữ liệu**, không thiếu **cấu trúc**.

Việc nhỏ, làm được luôn nếu Sếp muốn (không bắt buộc):
- Thêm 1 bảng `department` chuẩn hoá thay `nhan_su.bo_phan` TEXT — **CHỈ đáng làm nếu Sếp xác nhận sẽ có nhiều phòng ban/nhân sự tăng nhanh**; với 8 người, TEXT tự do vẫn quản lý được bằng mắt.

---

## F. DON'T BUILD YET

- Employment Type / Work Pattern / Shift / Schedule / Shift Registration — đúng roadmap đã thống nhất, chưa tới Phase 3.
- Warehouse Location (Zone/Shelf/Bin) — 1 kho, chưa có nhu cầu.
- Supplier master table — dữ liệu chưa đủ lớn để cần chuẩn hoá.
- Task Type danh mục — 3 công việc chưa đủ để biết pattern thật.
- Skill Core — chưa có nhu cầu thật.
- QR/Barcode scan cho Kho Nhập/Xuất — **đã hoãn theo đúng yêu cầu "không ưu tiên feature mới" của Sếp lượt trước.**

---

## G. PILOT READINESS — còn blocker nào trước khi Kho chạy thử

🔴 **BLOCKER DUY NHẤT NHƯNG LỚN: chưa có 1 sản phẩm/SKU nào trong hệ thống.** Không thể "pilot Kho" theo bất kỳ nghĩa nào (nhập/xuất/tồn/picking/packing) cho tới khi có danh mục sản phẩm thật. Đây là việc CHỈ Sếp/bộ phận kho mới cung cấp được — tôi không tự tạo được.

Sau khi có danh mục sản phẩm:
- Không còn blocker kỹ thuật nào khác — code Kho đã sẵn sàng, đã audit kiến trúc TỐT ở lần trước, Mobile Card vừa xong.
- 2 nhân sự Kho thật đã có tài khoản sẵn sàng (`quan_ly_kho`, `nhan_vien_kho`).

---

## H. GO-LIVE CHECKLIST

**Infrastructure**
- [x] Migration status theo dõi được (Phase 1 đã xong)
- [x] Backup: D1 Time Travel tự động 30 ngày
- [x] Secrets không nằm ở frontend (đã audit)
- [ ] Backup export định kỳ ra R2 — chưa làm (không bắt buộc, D1 Time Travel đã đủ cho pilot)

**Database**
- [ ] **Master Data sản phẩm — CHƯA CÓ, việc cần làm trước tiên**
- [x] Không phát hiện tài khoản mồ côi/lệch trạng thái
- [ ] Chuẩn hoá tên phòng ban (nhỏ, không chặn pilot)

**Permission**
- [x] Role matrix đã audit (kiến trúc lần trước)
- [ ] Test account theo đúng vai trò (`ERP_ADMIN_TEST` v.v.) — hiện có 1 tài khoản `nv_test` dùng chung, chưa tách riêng từng vai trò để test permission — **cân nhắc, không bắt buộc cho pilot Kho quy mô 2 người**

**Process**
- [x] Quy trình đơn hoàn 3 chặng đã chạy thật 405 đơn, ổn định
- [ ] Quy trình Kho (nhập/xuất/picking) — chưa test được vì chưa có dữ liệu

**UI**
- [x] Mobile Card Tồn kho đã pilot xong (lượt trước)
- [x] Empty/loading/error state đã có ở màn Kho

**Operations**
- [ ] Người hỗ trợ ERP trong lúc pilot Kho — cần Sếp chỉ định
- [ ] SOP dự phòng nếu ERP lỗi lúc đang nhập/xuất kho — chưa có, nên soạn 1 trang ngắn trước ngày pilot

---

## Tổng kết 1 câu

**Marketplace/Đơn hàng đã live thật (2.321 đơn) — không còn là pilot nữa. Kho — nơi định pilot — có code sẵn sàng nhưng 0 dữ liệu sản phẩm, đây là việc DUY NHẤT cần làm trước khi bắt đầu, và chỉ Sếp/bộ phận kho cung cấp được.**

*Chờ Sếp xác nhận danh mục sản phẩm thật (mục D) trước khi bàn bước tiếp theo.*
