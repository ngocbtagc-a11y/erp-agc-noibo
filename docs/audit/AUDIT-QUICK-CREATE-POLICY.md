# Audit — Contextual Creation / Quick Create Policy (23/08/2026, cập nhật)

Audit toàn bộ dropdown/searchable-select thật trong ERP (grep
`.combo1`/`<select` trong `public/app.html`, đối chiếu quyền tạo ở
`src/dulieunen.js`/`src/quyen.js`), phân loại theo 3 mode chính thức +
1 mức "không cần" — thay cho tên gọi ALLOWED/CONTROLLED/FORBIDDEN dùng ở
bản audit đầu (map 1-1, không đổi ý nghĩa, chỉ chuẩn hoá tên cho khớp
[Contextual Creation Rule](../ERP-CONSTITUTION.md#contextual-creation-rule)):

| Mode mới | = Mode cũ | Ý nghĩa |
|---|---|---|
| `CREATE_DIRECT` | `QUICK_CREATE_ALLOWED` | Tạo ngay, Active ngay (nhưng vẫn ở trạng thái `nhap` của Data Lock — sửa được, chưa khoá cứng) |
| `CREATE_CONTROLLED` | `QUICK_CREATE_CONTROLLED` | Tạo ngay nhưng cần thêm permission/duplicate-review, có thể để "nhap" chờ xác nhận |
| `REQUEST_ONLY` | `QUICK_CREATE_FORBIDDEN` (entity thật sự tạo được, chỉ không nên tạo tắt) | Không tạo tắt qua dropdown — có action rõ ràng khác (đề xuất/đi đúng màn) |
| `NO_CREATE_NEEDED` | (chưa đặt tên) | Enum cố định/system option — không phải Master Data, không bao giờ Quick Create |

## A-G/17. Bảng phân loại đầy đủ (dropdown thật + entity + mode)

| Màn hình | Field/dropdown | Entity | Master hay Enum? | Searchable? | Tần suất | Risk | Mode | Owner |
|---|---|---|---|---|---|---|---|---|
| Vinh danh, Thêm NS nhanh (Quản lý), Sửa hồ sơ (Quản lý), Giao việc, Cấp phát tài sản, Gán trưởng phòng | `vd-nguoicombo`, `qtQuanLyCombo`, `nsSua-quanlycombo`, `cv-nguoi-nhancombo`, `tsCapPhatNguoiCombo`, `hopNhap-select` (gán trưởng phòng) | **Nhân sự/Employee** | Master | Có (`ganCombo`) | Rất cao | Cao — lương/tài khoản/CCCD | **REQUEST_ONLY** — nhưng UI hiện tại đã đúng: không hề có action tạo nào ở đây, luồng thật là "Thêm nhân sự nhanh" (form đầy đủ riêng, có sẵn) — coi như tự thoả `+ Đề xuất` bằng cách route đúng chỗ, không cần thêm nút | HCNS/Admin |
| Quản trị → Tài khoản | `taoTkVaiTroCombo`, `doiVaiTroMoiCombo` | **Vai trò/Role** | Enum cố định (10 giá trị trong `QUYEN_THEO_VAI_TRO`) | Có (đúng chuẩn "≥7 lựa chọn") | Thấp | Cao — quyết định quyền hệ thống | **NO_CREATE_NEEDED** (thực ra không phải Master Data mở rộng được — thêm 1 "vai trò" mới nghĩa là viết code phân quyền mới, không phải data) | ERP Owner |
| Kho vận → Nhập/Xuất | `kvNhapSPCombo`, `kvXuatSPCombo` | **Sản phẩm/SKU** | Master | Có | Rất cao | Cao — giá vốn/tồn kho/kế toán | **REQUEST_ONLY** — chưa có nút đề xuất, xem mục I | Kinh doanh/Kho vận |
| Thêm NS nhanh, Sửa hồ sơ | `qtChucDanhCombo`, `nsSua-chucdanhcombo` | **Chức danh/Position** | Master | Có | Trung bình | Thấp — chỉ mô tả, người mở form đã đúng Data Owner | **CREATE_DIRECT** ✅ ĐÃ LÀM | HCNS/Admin |
| Thêm NS nhanh, Sửa hồ sơ | `qtPhongBanCombo`, `nsSua-phongbancombo` | **Phòng ban/Department** | Master | Có | Trung bình | Vừa — ảnh hưởng Xếp ca + Manager tier ở Home | **CREATE_CONTROLLED** — chưa làm, Phase 2 | HCNS |
| Kho vận → Thêm/Sửa mã hàng | `kdsp-donvi`, `kvDonVi`, `kvSua-donvi` | **Đơn vị tính/UoM** | Master | **Chưa** (native `<select>`, <7 lựa chọn nên đúng chuẩn hiện tại là simple select) | Trung bình | Vừa | **CREATE_CONTROLLED** — chưa làm, Phase 2 (cũng cần lên `ganCombo` trước nếu số lượng tăng) | Kho vận |
| Tài sản → Thêm/Sửa | `tsThemDanhMucCombo`, `tsSuaDanhMucCombo` | **Danh mục tài sản/Asset Category** | Master | Có | Cao | Thấp | **CREATE_DIRECT** ✅ ĐÃ LÀM | HCNS/Admin (`duocQuanLyTaiSan`) |
| Tài sản → Thêm/Sửa | `tsThemViTriCombo`, `tsSuaViTriCombo` | **Vị trí tài sản/Location** | Master | Có | Cao | Thấp | **CREATE_DIRECT** ✅ ĐÃ LÀM | HCNS/Admin (`duocQuanLyTaiSan`) |
| Kho vận → Nhập kho; Tài sản → Thêm/Sửa | `kvNhapNCC`, `tsThemNCC`/`tsSuaNCC` | **Nhà cung cấp/Supplier** | Master (bảng `nha_cung_cap` đã có) | **KHÔNG — đang là input text tự do** | Cao | Vừa/Cao | **CREATE_CONTROLLED** — VI PHẠM "No Free Text Fallback" hiện tại, xem mục I. Chưa làm, Phase 2 | Kho vận |
| Trạm Mục Tiêu → Giao việc | `cv-muc-tieu` | **Mục tiêu/Goal** | Không phải Master Data dùng chung — dữ liệu tác nghiệp theo quý/người | Có (native select, đã có "+ Tạo mục tiêu mới…") | Cao | Thấp | Đã đúng kiểu **CREATE_DIRECT** từ trước, giữ nguyên | Người tạo tự sở hữu |
| ~16 dropdown filter/enum (`ts-loctrangthai`, `tsSuaTinhTrang`, `qtTrangThai`, `qtLoaiLaoDong`, `dmGioiTinh`, `dmTrangThai`, `qt-locvaitro`, `nsSua-trangthai`, `nsSua-loailaodong`, `ns-loc*`, `kd-ds-locnguon`, `cv-mtm-cap`...) | — | **Enum cố định** (Trạng thái, Tình trạng, Loại LĐ, Giới tính, Ưu tiên...) | Enum | Không cần (≤6 lựa chọn) | — | — | **NO_CREATE_NEEDED** — xác nhận KHÔNG có/không được thêm Quick Create ở đây (mục 18/19 trong yêu cầu) | — |

## H. Shared component — đã có, không xây thêm

`ganCombo(..., taoMoi: {xuLyTao, capNhatDs})` trong `public/assets/js/app.js`
CHÍNH LÀ `SearchableSelectWithQuickCreate` theo convention hiện tại (đặt
tên hàm tiếng Việt nhất quán với toàn bộ codebase, không đặt tên tiếng
Anh riêng — Rule "Users See Work, Not Software" áp cả cho code, không chỉ
UI). Đã hỗ trợ: search (debounce qua `oninput`), empty state, keyboard
(Enter/Escape), quick create, duplicate check (exact + gần giống qua
`themCoCanhBaoTrung`), auto-select sau tạo, giữ nguyên form context,
không reload. **"Config" là chính lời gọi `ganCombo()` tại từng field**
(entity nào dùng API nào, quyền nào) — KHÔNG xây bảng
`entity_type/quick_create_mode/...` tập trung riêng, vì:
- Chỉ 3 entity đang dùng thật (Danh mục/Vị trí tài sản, Chức danh) —
  chưa đủ số lượng để 1 bảng config tập trung rẻ hơn việc đọc thẳng code
  (Rule 5: không dựng framework trước khi có nhu cầu thật lần 2 trở lên
  — ở đây đã lần 2 rồi và pattern đã đủ rẻ khi lặp lại bằng cách copy 2
  dòng `taoMoi: {...}`, chưa đến ngưỡng cần trừu tượng hoá thêm).
- Bảng này chính là "config" ở dạng đọc được — dùng làm nguồn tham chiếu
  khi thêm entity mới, tự nhất quán hơn 1 bảng DB không ai đọc.

**Domain override** (mục 13 yêu cầu): đã tự nhiên đúng — `taoMoi` khai
báo tại ĐÚNG context gọi `ganCombo()`, không phải thuộc tính cố định của
entity. VD nếu sau này Nhà cung cấp cần `CREATE_CONTROLLED` ở Kho vận
nhưng `REQUEST_ONLY` ở 1 màn Kế toán nhạy cảm hơn, chỉ cần 2 lời gọi
`ganCombo()` khác nhau, không đụng entity/API gốc.

## I. Nơi đang bắt user rời flow / vi phạm chính sách (chưa sửa)

1. **Nhà cung cấp** (`kvNhapNCC`, `tsThemNCC`/`tsSuaNCC`) — input text tự
   do, vi phạm "No Free Text Fallback" — Phase 2.
2. **Phòng ban** (Thêm NS nhanh) — chưa có Quick Create, phải rời form
   sang Quản trị — Phase 2 (`CREATE_CONTROLLED`, cần thêm bước xác nhận
   vì ảnh hưởng Xếp ca + Manager tier).
3. **Sản phẩm/SKU, Nhân sự** — đúng là chưa có action "+ Đề xuất" tại
   dropdown (chỉ có "Không tìm thấy") — vi phạm mục 4 ("không được để
   ngõ cụt") theo nghĩa CHẶT, nhưng 2 entity này đã có form tạo đầy đủ
   RIÊNG, dễ tìm (Thêm nhân sự nhanh / Thêm mã hàng), và rủi ro tạo sai
   quá cao để khuyến khích tạo tắt dù chỉ là "đề xuất" — xem quyết định
   ở mục dưới, KHÔNG thêm nút đề xuất cho 2 entity này trong Phase này.

## Phase 3 (REQUEST_ONLY) — chưa xây, ghi lại thiết kế để làm sau

Chưa có hạ tầng "request/approve" nào trong ERP này. Nếu làm Phase 3,
cần tối thiểu 1 bảng `yeu_cau_tao_moi` (`entity_type, gia_tri_de_xuat,
boi_canh, nguoi_de_xuat_id, tao_luc, trang_thai, xu_ly_boi_id,
xu_ly_luc`) + route tới đúng Owner (bảng H ở trên) + hiện trong chuông
🔔 đã có sẵn (`thong_bao`) — KHÔNG cần workflow engine. **Không xây trong
đợt này** — chưa có yêu cầu nghiệp vụ thật nào cần "đề xuất tạo Nhân
sự/SKU" phát sinh (2 entity đó vốn đã có quy trình tạo đầy đủ, nhanh,
không qua dropdown).

## J. Priority / trạng thái hiện tại

| # | Việc | Trạng thái |
|---|---|---|
| 1 | Danh mục tài sản + Vị trí tài sản (`CREATE_DIRECT`) | ✅ Đã xong, đã test, đã push |
| 2 | Chức danh (`CREATE_DIRECT`) | ✅ Đã xong, đã test, đã push |
| 3 | Phòng ban (`CREATE_CONTROLLED`) | Chưa làm — Phase 2 |
| 4 | Đơn vị tính (`CREATE_CONTROLLED`) | Chưa làm — Phase 2 |
| 5 | Nhà cung cấp free-text → reference thật (`CREATE_CONTROLLED`) | Chưa làm — Phase 2, ưu tiên cao vì đang vi phạm free-text |
| 6 | REQUEST_ONLY cho Nhân sự/SKU | Chưa làm — Phase 3, chưa có nhu cầu thật, có sẵn hạ tầng thiết kế ở trên khi cần |

**Kết luận: Phase 1 đã hoàn thành đúng phạm vi (2 turn trước). Không có
code mới trong đợt rà soát này — chỉ chuẩn hoá lại audit theo template
mới + xác nhận enum/system dropdown KHÔNG bị đụng tới (mục 18/19). Phase
2-3 giữ nguyên chưa làm, đúng chỉ đạo "không refactor toàn bộ 100
dropdown trong 1 commit".**
