# Audit — Module Quản lý Tài sản nội bộ (23/08/2026)

Yêu cầu: audit trước khi code, output A-R, sau đó (nếu không blocker)
triển khai PHASE 1 — Asset Core MVP, dừng lại chờ xác nhận trước Phase 2.

## A. Existing code/schema reuse audit

**Phát hiện quan trọng: module Tài sản KHÔNG phải xây mới — đã tồn tại
từ trước, kiến trúc phần lớn đã đúng, nhưng CHƯA có dữ liệu thật
(0 dòng trên production).** Đây là MỞ RỘNG (Extend), không phải tạo mới
(Create).

| Cần | Đã có? | Ở đâu |
|---|---|---|
| Asset Master (current state) | **Có** | bảng `tai_san` (`ma_ts`, `ten`, `danh_muc`, `trang_thai`, `nguoi_giu_id` FK, `vi_tri`, `ghi_chu`, `hoat_dong`) |
| Asset Event/History | **Có, đúng kiến trúc WHAT/WHEN/WHO/FROM/TO** | bảng `tai_san_lich_su` (`loai_su_kien`, `nguoi_giu_cu/moi`, `vi_tri_cu/moi`, `nguoi_thuc_hien`, `luc`) — KHÔNG phải God Table, tách đúng khỏi Master |
| Asset ID generation (ổn định, bất biến) | **Có** | `sinhMa(env,'tai_san')` trong `src/dinh-danh.js` — sinh `TS0001` kiểu counter `RETURNING`, chống trùng khi 2 người tạo cùng lúc, 1 dòng cấu hình cho toàn hệ thống |
| Permission/Data Owner | **Có** | `duocQuanLyTaiSan()` (`src/quyen.js`) — admin/admin_backup/hcns quản lý; mọi vai trò có tab `taisan` để xem; người đang giữ tự báo hỏng được |
| Employee Core | **Có** | `nhan_su` — Custodian reference qua `nguoi_giu_id`, JOIN lấy tên mỗi lần đọc, KHÔNG copy (đúng One Fact One Owner) |
| Department Core | **Có** | `phong_ban` (+ `truong_phong_id` cho Manager, vừa dùng ở Home Phase 1) |
| Task Core | **Có** | `cong_viec` — dùng được cho "Báo sửa chữa" nếu cần tạo việc theo dõi |
| Notification Core | **Có** | `thong_bao` — chuông 🔔 đã hoạt động |
| Ledger/audit pattern | **Có tiền lệ** | `tai_san_lich_su` tự thân + `giao_dich_kho` (Kho vận) — cùng khuôn mẫu sổ cái bất biến |
| File/Image storage nhỏ | **Có tiền lệ** | `nhan_su.anh_chan_dung`/`anh_cccd` — base64 thẳng trong D1, giới hạn 4MB/file, ghi rõ "quy mô công ty nhỏ, chưa cần R2" |
| UI component dùng chung | **Có** | `veThe`/`veDanhSach`/`veBang`/`moHopNhap`/`ganCombo` (searchable combobox) — dùng lại 100% |
| Asset Category Master | **CHƯA** | `danh_muc` hiện là TEXT tự do, không phải bảng master |
| Location Master | **CHƯA** | `vi_tri` hiện là TEXT tự do |
| Condition (tách khỏi Status) | **CHƯA** | chỉ có 1 field `trang_thai`, đang trộn Status+Condition |
| Barcode/QR generation | **CHƯA** | chưa từng có trong ERP này |
| Print label | **CHƯA** | chưa từng có, nhưng browser print (`window.print()` + `@media print`) là pattern chuẩn, không cần thư viện ngoài |
| Asset Count Session (kiểm kê) | **CHƯA** | không có bảng/flow |
| Employee Offboarding flow | **CHƯA TỒN TẠI** | Nhân sự CHƯA có nút "nghỉ việc/Hoàn tất" nào (đã audit `src/index.js`/`nhansu.js` — không có chỗ nào set `dang_lam = 0`). Message lỗi ở `index.js:620` có nhắc "tài sản" khi chặn xoá nhân sự nhưng đó là guard chung, không phải offboarding flow thật |

**Kết luận A**: REUSE gần như toàn bộ kiến trúc lõi (Master/History/ID/
Permission/Custodian-reference). Phase 1 CHỈ cần EXTEND (thêm cột/bảng
master nhỏ) + CREATE đúng 2 thứ chưa từng tồn tại: QR generation + Print
label UI.

## B. Proposed Asset entity

Giữ bảng `tai_san` làm Asset Master, KHÔNG tạo bảng mới song song (Rule 1
— One Fact One Owner). Thêm cột (ALTER TABLE, không phá dữ liệu vì hiện
0 dòng):

`danh_muc_id` (FK → `tai_san_danh_muc`, thay dần `danh_muc` text cũ),
`vi_tri_id` (FK → `tai_san_vi_tri`, thay dần `vi_tri` text cũ),
`tinh_trang` (TEXT — Condition, tách khỏi `trang_thai`),
`hang_sx`, `model`, `serial`, `ngay_mua`, `nha_cung_cap`, `gia_mua`,
`het_bao_hanh`, `phong_ban_id` (FK — Department Owner, khác `nguoi_giu_id`
là người đang giữ), `anh` (base64, tiền lệ như `anh_chan_dung`),
`ma_qr` (giá trị encode — mặc định = `ma_ts`, tách riêng để dự phòng đổi
sau), `tao_boi`, `cap_nhat_boi`, `cap_nhat_luc`.

## C. Required vs Optional vs Auto vs System

| Field | Loại |
|---|---|
| Tên tài sản | REQUIRED |
| Danh mục | REQUIRED (chọn từ Master, ≥7 lựa chọn nên `ganCombo()`) |
| Mã tài sản (`ma_ts`) | AUTO (sinh bằng `sinhMa`) |
| Vị trí, Phòng ban, Người giữ, Hãng SX, Model, Serial, Ngày mua, NCC, Giá mua, Hết bảo hành, Ghi chú, Ảnh | OPTIONAL |
| Trạng thái | AUTO (mặc định `san_sang`) |
| Tình trạng | OPTIONAL (mặc định `tot`) |
| `id`, `tao_boi`, `tao_luc`, `cap_nhat_boi`, `cap_nhat_luc`, `ma_qr` | SYSTEM |

Form "Thêm tài sản" (Normal Flow) chỉ hiện Tên + Danh mục — đúng ít field
nhất, các field còn lại gấp trong "+ Thêm chi tiết" (giống pattern
"+ Thêm tuỳ chọn" đã dùng ở Việc).

## D. Asset status model

**Giữ nguyên 4 trạng thái hiện có** — đã đúng tinh thần "không dùng
status quá nhiều, nghiệp vụ thực tế không cần thì không tạo":
`san_sang` (AVAILABLE) → `da_cap_phat` (ASSIGNED/IN_USE) → `bao_hong`
(cần sửa) → `da_thanh_ly` (RETIRED, kết thúc).

Không thêm DRAFT (tài sản tạo xong là dùng được ngay, không cần bước
nháp) và không thêm IN_USE tách khỏi ASSIGNED (công ty 15 người, 1 tài
sản cấp cho 1 người là coi như đang dùng luôn — tách 2 trạng thái này
chưa có giá trị quản trị thật).

**Cần Sếp xác nhận**: có cần trạng thái riêng **LOST (Mất)** khác
`bao_hong` không? Hiện `bao_hong` đang gộp chung "hỏng cần sửa" và "mất"
— về nghiệp vụ 2 cái khác hẳn nhau (1 cái còn sửa được, 1 cái không).
Xem câu hỏi ở mục R.

## E. Asset condition model

Thêm field mới `tinh_trang`, tách khỏi Status:
`tot` (GOOD) / `binh_thuong` (NORMAL) / `can_sua` (NEED_REPAIR) /
`hong` (DAMAGED). Mặc định `tot` khi tạo mới.

## F. Asset ID strategy

Giữ nguyên `sinhMa(env, 'tai_san')` đã có — sinh `TS0001` kiểu tiền tố +
4 chữ số, tăng dần qua bộ đếm `bo_dem_ma`, KHÔNG đổi được sau khi tạo
(đúng yêu cầu Immutable). Không đổi sang tiền tố `AST` — giữ nguyên
`TS` đã cấu hình sẵn (Rule 1 One Fact One Owner: không có lý do nghiệp
vụ để đổi, đổi chỉ tốn công không thêm giá trị).

## G. Barcode vs QR — khuyến nghị QR

QR Code cho Phase 1: quét bằng camera điện thoại thường (không cần app
scanner riêng, iOS/Android đọc QR ngay trong Camera mặc định), chịu lỗi
tốt hơn Code128 khi tem cũ/xước, gọn hơn cho cùng độ dài chuỗi ở kích
thước tem nhỏ. Code128 phù hợp hơn khi có máy quét laser chuyên dụng
kiểu kho lớn — công ty hiện dùng điện thoại là chính (SCAN FIRST bằng
mobile) nên QR đúng hơn.

**Nội dung mã hoá**: CHỈ `ma_ts` (VD `TS0001`) — không encode URL, không
encode giá trị/người giữ/thông tin nhạy cảm. App tự tra cứu qua API sau
khi quét (có xác thực đăng nhập), tránh phải mở endpoint public không
xác thực chỉ để "quét ra URL".

## H. Label design strategy

HTML + `@media print` CSS — đúng chỉ đạo "ưu tiên browser print nếu đủ
tốt, không cần PDF engine". Khổ tem 50×30mm (phổ biến, in được trên máy
in văn phòng thường lẫn máy in tem nhiệt hỗ trợ khổ này), nhiều tem/trang
A4 khi in hàng loạt. Nội dung tem: Tên công ty (nhỏ) → Tên tài sản (rút
gọn 1 dòng) → Mã tài sản (to, dễ đọc) → QR → dòng nhỏ "Tài sản nội bộ –
Alpha Green Commerce". Chọn: in 1 tem (từ Asset Detail) hoặc in nhiều
(từ Asset List, tick chọn nhiều dòng → "In tem đã chọn").

## I. Assignment/Transfer/Return flows

Dùng lại đúng 3 API đã có (`capPhatTaiSan`/`thuHoiTaiSan`), chỉ đổi UX
theo hướng Scan First:
- **Bàn giao**: quét mã (hoặc gõ tay nếu không có máy quét) → tra được
  Asset ngay → chọn người nhận (`ganCombo`) → Xác nhận. Hỗ trợ quét
  liên tiếp nhiều Asset rồi chọn 1 người nhận, xác nhận 1 lần (batch) —
  cần API mới nhận mảng `id[]` thay vì `id` đơn (mở rộng `capPhatTaiSan`,
  không tạo API song song).
- **Thu hồi**: quét → Thu hồi ngay nếu `tinh_trang` vẫn `tot`/`binh_thuong`
  (Normal Flow Fast); nếu người dùng chọn "Hỏng/Mất" thì hiện thêm
  ghi chú bắt buộc + ảnh tuỳ chọn (Exception Flow Detailed).
- **Chuyển vị trí / Chuyển người dùng**: quét → chọn Location/Employee
  mới → Confirm, không mở Asset Detail đầy đủ (Quick Action, đúng Human
  Cost Test).

## J. Asset history architecture

Giữ nguyên `tai_san_lich_su`, KHÔNG tạo bảng history thứ 2. Bổ sung
`loai_su_kien` mới cho các hành động mới: `chuyen_vi_tri`, `doi_tinh_trang`,
`in_tem` (ghi lại việc đã in tem — phục vụ "đã dán tem chưa" nếu cần tra
sau này). Asset Detail đọc thẳng bảng này làm timeline, không cần
reconstruct current state từ history (Master đã giữ current state đúng
theo point 47).

## K. Count/Inventory flow (Phase 3 — CHƯA làm ở Phase 1)

Ghi nhận thiết kế để không code sai hướng Phase 1, nhưng KHÔNG tạo bảng
`tai_san_kiem_ke`/`tai_san_kiem_ke_dong` trong đợt này — đúng yêu cầu
"PHASE 1 dừng lại, không tự sang Phase 2/3".

## L. Permission model

Reuse `duocQuanLyTaiSan()` — KHÔNG tạo hệ permission `asset.*` riêng
(ERP này dùng model theo NHÓM hành động, không theo permission string
từng cái — đổi sang model khác là CORE_CHANGE, ngoài phạm vi module này).
Giữ đúng 3 tầng đã có: mọi người XEM + tự báo hỏng tài sản mình giữ; Data
Owner (admin/admin_backup/hcns) tạo/cấp phát/thu hồi/thanh lý/in tem;
Admin thật cấu hình Master (Category/Location).

**Cần Sếp xác nhận**: Trưởng phòng (Manager, vừa làm ở Home Phase 1 tuần
này) có cần thấy riêng "tài sản phòng tôi quản lý" không, hay giữ nguyên
y như hiện tại (ai cũng xem được toàn bộ, chỉ Data Owner thao tác)? Xem
câu hỏi ở mục R.

## M. Mobile scan UX

Dùng `<input type="text" inputmode="none">` ẩn + camera quét qua thư
viện QR-decode chạy client-side (không gọi API ngoài, phù hợp PWA offline-
first hiện tại) — 1 nút to "QUÉT TÀI SẢN" ở Tài sản + có thể thêm shortcut
trên thanh điều hướng mobile. Quét xong mở thẳng Asset Detail với Quick
Actions ngay đầu trang (Bàn giao/Chuyển/Thu hồi/Báo sửa/In lại tem) —
không qua Menu → Tìm → Mở.

## N. MISA boundary

KHÔNG lưu khấu hao/bút toán kế toán. Trường `gia_mua`/`ngay_mua`/
`nha_cung_cap` chỉ để THAM CHIẾU vận hành (biết tài sản đáng giá bao
nhiêu để quyết định sửa hay thanh lý), KHÔNG phải sổ sách chính thức.
Chuẩn bị sẵn field rỗng cho tương lai (`ma_ke_toan_misa`) nhưng KHÔNG xây
mapping/sync trong Phase 1 — đúng `SOURCE-OF-TRUTH.md` (MISA vẫn
UNDECIDED/là nguồn kế toán chính thức, ERP chỉ vận hành nội bộ).

## O. Database changes

1 migration: `ALTER TABLE tai_san ADD COLUMN ...` (các cột ở mục B) +
`CREATE TABLE tai_san_danh_muc` (id, ten, hoat_dong) + `CREATE TABLE
tai_san_vi_tri` (id, ten, vi_tri_cha_id, hoat_dong). Không đổi
`tai_san_lich_su` (giữ nguyên, chỉ thêm giá trị `loai_su_kien` mới —
không phải thay đổi schema). An toàn vì 0 dòng dữ liệu thật hiện có —
không cần data backfill/migration phức tạp.

## P. Implementation phases

Đúng như Sếp đề: Phase 1 (Asset Core MVP: Category+Location Master, Asset
Master mở rộng, QR, In tem, List/Detail/Search, Custodian/Location hiện
tại, History cơ bản) → Phase 2 (Assign/Transfer/Return nhanh qua Scan,
Mobile Scan, Batch) → Phase 3 (Kiểm kê) → Phase 4 (Bảo trì/Thanh lý chi
tiết/Document). **Chỉ làm Phase 1 trong đợt này.**

## Q. Human Cost analysis

Thao tác hiện tại đã đúng ngân sách (Rule 12): Bàn giao/Thu hồi hiện tại
chỉ 2-3 bước (chọn Asset → chọn người → Confirm) qua `moHopNhap()`. Phase
1 KHÔNG đổi flow thao tác — chỉ thêm QR/tem, nên Human Cost không đổi
xấu đi. Phase 2 mới thực sự tối ưu xuống "Scan → Chọn → Confirm" mức 3
thao tác cho luồng 100 lần/ngày.

## R. Câu hỏi nghiệp vụ cần xác nhận trước khi code Phase 1

1. **LOST (Mất) có cần tách khỏi "Báo hỏng" không?** Ảnh hưởng trực tiếp
   thiết kế Status enum (mục D).
2. **Trưởng phòng có cần xem/thao tác tài sản phòng mình không**, hay
   giữ nguyên chỉ Data Owner (HCNS/Admin) thao tác như hiện tại?

Không có câu hỏi nào khác chặn Phase 1 — phần còn lại dùng đúng phán đoán
kỹ thuật dựa trên kiến trúc đã có.
