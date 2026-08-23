# Audit — ERP-wide Quick Create Policy (23/08/2026)

Audit toàn bộ dropdown/searchable-select thật đang có trong ERP (grep
`.combo1`/`<select` trong `public/app.html`, đối chiếu quyền tạo ở
`src/dulieunen.js`/`src/quyen.js`), phân loại từng entity theo
ALLOWED/CONTROLLED/FORBIDDEN trước khi code, đúng yêu cầu.

## A-G. Bảng phân loại

| A. Dropdown (id) | B. Entity | C. Tần suất | D. Risk | E. Phân loại | F. Permission cần | G. Duplicate rule |
|---|---|---|---|---|---|---|
| `vd-nguoicombo`, `qtQuanLyCombo`, `nsSua-quanlycombo`, `cv-nguoi-nhancombo`, `tsCapPhatNguoiCombo`, gán trưởng phòng (`hopNhap-select`) | **Nhân sự/Employee** | Rất cao | **Cao** — có lương/tài khoản/CCCD, 1 nhân sự chạm hầu hết module | **FORBIDDEN** | — | — |
| `taoTkVaiTroCombo`, `doiVaiTroMoiCombo` | **Vai trò/Role** | Thấp | **Cao** — quyết định quyền hệ thống | **FORBIDDEN** | — | — |
| `kvNhapSPCombo`, `kvXuatSPCombo` | **Sản phẩm/SKU** | Rất cao | **Cao** — giá vốn, tồn kho, kế toán | **FORBIDDEN** | — | — |
| `qtChucDanhCombo`, `nsSua-chucdanhcombo` | **Chức danh/Position** | Trung bình | **Thấp** — chỉ mô tả, người tạo dropdown này (HCNS/Admin) ĐÃ đúng là Data Owner của Chức danh | **ALLOWED** | `duocThemNhanSu` (đã đúng người) | Exact + gần giống (đã có `timTrungTen`) |
| `qtPhongBanCombo`, `nsSua-phongbancombo` | **Phòng ban/Department** | Trung bình | **Vừa** — ảnh hưởng rộng hơn Chức danh (Xếp ca, Manager tier ở Home, `truong_phong_id`) dù cùng Data Owner | **CONTROLLED** | `duocThemNhanSu` | Exact + gần giống |
| `kdsp-donvi`, `kvDonVi`, `kvSua-donvi` (hiện là `<select>` thường) | **Đơn vị tính/UoM** | Trung bình | **Vừa** — chủ sở hữu khác người thêm SKU trong vài trường hợp | **CONTROLLED** | `duocQuanLyKho` | Exact + gần giống |
| `tsThemDanhMucCombo`, `tsSuaDanhMucCombo` | **Danh mục tài sản/Asset Category** | Cao (mỗi lần thêm/sửa Tài sản) | **Thấp** — chỉ tên, không tiền/quyền/tồn | **ALLOWED** | `duocQuanLyTaiSan` (đã đúng người) | Exact + gần giống |
| `tsThemViTriCombo`, `tsSuaViTriCombo` | **Vị trí tài sản/Location** | Cao | **Thấp** — chỉ tên, không tiền/quyền/tồn | **ALLOWED** | `duocQuanLyTaiSan` (đã đúng người) | Exact + gần giống |
| `tsThemPhongBan`/`tsSuaPhongBan` (chọn phòng sở hữu tài sản) | **Phòng ban** (đọc lại, không tạo mới ở đây) | Trung bình | — | Dùng danh sách Phòng ban có sẵn — không quick-create riêng (đã có ở Quản trị/Nhân sự) | — | — |
| `kvNhapNCC` (input text), `tsThemNCC`/`tsSuaNCC` (input text) | **Nhà cung cấp/Supplier** | Cao | **Vừa/Cao — ĐANG VI PHẠM NO FREE TEXT FALLBACK** (xem mục I) | **CONTROLLED** (theo đúng ví dụ Sếp đưa) | `duocQuanLyKho` (chủ sở hữu hiện tại của `nha_cung_cap`) | Exact + gần giống — **nhưng hiện KHÔNG chạy vì đây là ô nhập tay tự do, không phải reference** |
| `cv-muc-tieu` (native `<select>`) | **Mục tiêu/Goal** | Cao | Thấp — nhưng đây là dữ liệu TÁC NGHIỆP (working record theo quý/người), không phải Master Data dùng lại toàn công ty | Đã có Quick Create riêng, đúng đắn — **giữ nguyên, không đổi** | đã đúng (mọi người tạo mục tiêu của mình) | không cần (không phải danh mục dùng chung) |

## H. Shared component đề xuất

**Không tạo component mới** — mở rộng `ganCombo()` (đã dùng ở toàn bộ 20
chỗ trong bảng trên) thêm 1 tham số tuỳ chọn `taoMoi: { xuLyTao, capNhatDs }`:

- Không tìm thấy kết quả khớp + có chữ đang gõ → hiện dòng
  `+ Tạo "<đang gõ>"` cuối danh sách gợi ý (không phải xoá goiY, thêm vào).
- Bấm vào → gọi `xuLyTao(tenGoTa)` (POST tới đúng API `themXyz` đã có sẵn
  — dùng lại, không tạo API mới), rồi `capNhatDs()` để nạp lại danh sách
  gốc + tự chọn record mới (`chon(id)`), đóng panel — không rời modal,
  không reload, không mất field khác đang nhập trong CÙNG form.
- Field bắt buộc duy nhất của cả 2 entity ALLOWED (Danh mục/Vị trí tài
  sản) là `tên` — đã chính là chữ user gõ để tìm, nên KHÔNG cần mini-form
  riêng, tạo thẳng — đơn giản hơn yêu cầu gốc mà vẫn đúng tinh thần
  "Search → Not Found → + Create → Auto-select → Continue".
- Backend `themDanhMuc()` (dùng chung ở `dulieunen.js`) đã có sẵn Search
  Before Create (exact + gần giống, trả `canh_bao` nếu gần giống) —
  QUICK_CREATE chỉ gọi lại, không viết logic duplicate mới.

## I. Nơi đang bắt user rời flow / vi phạm chính sách

1. **`kvNhapNCC` (Nhập kho) và `tsThemNCC`/`tsSuaNCC` (Tài sản, vừa xây
   tuần này) là Ô NHẬP TỰ DO**, không phải reference tới bảng
   `nha_cung_cap` đã có sẵn — vi phạm trực tiếp **NO FREE TEXT
   FALLBACK**. Đây KHÔNG phải "bắt rời flow" (ngược lại — quá dễ, không
   qua Master Data nào cả) nhưng cùng gốc vấn đề: Nhà cung cấp gõ
   "Cty ABC" và "Công ty ABC" ở 2 phiếu sẽ thành 2 "nhà cung cấp" khác
   nhau trong dữ liệu báo cáo dù cùng 1 đối tác thật.
2. **Phòng ban** (Chức năng "Thêm nhân sự nhanh") hiện KHÔNG có
   Quick Create — muốn thêm phòng ban mới phải rời form, qua
   Quản trị → Cơ cấu tổ chức, thêm xong quay lại tự tìm — đúng kiểu
   "bắt rời flow" mà chính sách muốn sửa, nhưng xếp CONTROLLED (không
   làm ở đợt đầu).

## J. Priority fix theo Human Cost

1. **Danh mục tài sản + Vị trí tài sản** (ALLOWED, tần suất cao, rủi ro
   thấp, hạ tầng đã sẵn 90%) — **làm ngay đợt này**.
2. **Chức danh** (ALLOWED, tần suất trung bình) — làm cùng đợt vì cùng
   pattern, chi phí thêm gần như 0.
3. **Nhà cung cấp free-text → reference thật** — ưu tiên cao về CHẤT
   LƯỢNG DỮ LIỆU nhưng KHÔNG làm ở đợt này (đổi từ input text sang
   reference đụng tới cấu trúc `giao_dich_kho`/`tai_san` hiện tại, cần
   xác nhận nghiệp vụ trước — treo lại làm CORE_CHANGE riêng).
4. **Phòng ban Quick Create (CONTROLLED)** — để dành, cần thêm bước xác
   nhận/duyệt trước khi bật, không phải ưu tiên đợt đầu.
5. **Đơn vị tính** — để dành, tần suất thêm mới thấp (đơn vị tính gần
   như cố định, ít phát sinh).

**Kết luận: không có blocker cho Phase 1 của chính sách này — tiến hành
triển khai Quick Create cho Danh mục tài sản + Vị trí tài sản + Chức
danh (3 entity ALLOWED có sẵn hạ tầng combobox + API).**
