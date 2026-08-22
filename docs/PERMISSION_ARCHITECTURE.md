# Permission Architecture — ERP Alpha Green Commerce

Tài liệu tham chiếu nhẹ, KHÔNG phải bộ máy IAM đầy đủ. Ghi lại nguyên tắc
đã áp dụng và LÝ DO không xây thêm — quy mô thật hiện tại (8 nhân sự, 4
phòng ban, 1 kho) chưa cần Permission Resolver/scope engine/delegation có
thời hạn/workflow phê duyệt quyền nhạy cảm. Cập nhật file này khi có quyết
định mới về phân quyền — không cần bảng/service mới nếu chưa có nhu cầu
thật (đúng nguyên tắc đã áp dụng xuyên suốt, xem [ENTITY_IDENTITY.md](./ENTITY_IDENTITY.md)).

## Nguyên tắc đã áp dụng (23/08/2026, cập nhật vai trò 22/08/2026)

**System Permission ≠ Business Permission** — quản trị nền tảng (tài
khoản, mật khẩu, mở khoá dữ liệu, xem lương) không tự động kéo theo quyền
làm nghiệp vụ (chỉnh tồn kho, khoá sản phẩm, cấp phát tài sản, kết nối
Shopee, xếp ca).

**Vai trò hệ thống (`nhomVaiTro='he_thong'`) — 3 cấp, thay cho
`giam_doc`/`pho_giam_doc`/`admin_he_thong` cũ:**
- **`admin`** — Toàn quyền mọi quyền (System + Business). Gộp cả 2 tài
  khoản lãnh đạo thật (Giám đốc Nguyễn Duy Phong, Phó Giám đốc Bùi Thị
  Ngọc) vào đúng 1 vai trò này.
- **`admin_backup`** — chỉ System Permission hẹp: tạo tài khoản, phân vai
  trò (`duocTaoTaiKhoan`), thêm nhân sự, xem tab quản trị/tài sản/xếp ca —
  **không** xem lương, **không** phải `laAdmin()`, **không** có mặt ở bất
  kỳ bảng Business Permission nào (Kho/Sản phẩm/Shopee). Sinh ra để HR
  hoặc trưởng bộ phận backup việc tạo tài khoản giúp Admin, không phải
  admin thứ 2.
- **`nguoi_dung`** — tài khoản thường, chỉ các tab phổ quát (tổng quan,
  danh bạ, chat, công việc, lịch sử việc, tài sản, xếp ca), không quyền
  đặc biệt nào.

Cụ thể trong `src/quyen.js`:
- `laAdmin(vaiTro)` (System Permission cao nhất) — chỉ đúng vai trò
  `admin` mới trả `true`.
- `duocTaoTaiKhoan(vaiTro)` — `admin` hoặc `admin_backup`. Có **chặn leo
  thang quyền**: tài khoản `admin_backup` không tự gán vai trò
  `admin`/`admin_backup` cho ai (kể cả chính mình) — chỉ `admin` thật mới
  làm được, enforce ở cả `qtTaoTaiKhoan` và `qtSuaVaiTro`
  (`src/index.js`).
- Quyền nghiệp vụ (Business Permission) nằm ở các bảng riêng —
  `QUYEN_KHO`, `QUYEN_SAN_PHAM`, `QUYEN_SHOPEE`, `CO_QUAN_LY_TAI_SAN`,
  `CO_QUAN_LY_CHINH_SACH_CA`, `CO_THAO_TAC_VAN_HANH` — mỗi vai trò phải
  **có mặt tường minh** ở đúng bảng đó mới thao tác được, không suy ra từ
  `laAdmin()`.

**`admin` KHÔNG áp dụng nguyên tắc tách System/Business** — đây là ngoại
lệ có chủ đích, không phải sai sót: ở quy mô 8 người, người giữ vai trò
`admin` (Giám đốc/Phó Giám đốc) là người trực tiếp vận hành nhiều mảng
hằng ngày (không có đủ nhân sự chuyên trách mọi vị trí), tước quyền
nghiệp vụ mặc định của họ sẽ gây gián đoạn vận hành thật mà không có lợi
ích tương xứng ở quy mô này. `admin_backup` thì NGƯỢC LẠI — tuân thủ đúng
nguyên tắc tách (chỉ System, không Business) vì đây đúng là vai trò hẹp,
không phải lãnh đạo vận hành.

## Scope theo phòng ban — chỉ có ở nơi thật sự cần

Duy nhất module **Đăng ký ca / Xếp ca** có scope theo phòng ban thật
(`laTruongPhong()` trong `src/ca.js`, so `phong_ban.truong_phong_id` với
người đăng nhập) — vì đây là nơi có nhu cầu thật (mỗi phòng tự quản lý
nhân lực phòng mình).

**Tài sản, Sản phẩm/SKU, Kho — CỐ Ý chưa có scope phòng ban.** Bất kỳ ai
có tab tương ứng đều xem được toàn bộ — đây là quyết định minh bạch có
chủ đích (Sếp Ngọc: "mọi người xem được ai đang giữ gì"), không phải lỗ
hổng. Nếu sau này có nhu cầu giới hạn theo phòng ban thật, làm theo đúng
khuôn `laTruongPhong()` đã có, không cần xây scope engine tổng quát trước.

## Việc CỐ Ý chưa làm (và vì sao)

Theo đúng tinh thần "không xây trước khi có nhu cầu thật":

- **Permission Resolver / Effective Permission engine tổng quát** — 9 vai
  trò, ~6 bảng quyền nghiệp vụ là đủ nhìn bao quát bằng mắt; 1 service
  tổng hợp sẽ là tầng trừu tượng thừa ở quy mô này.
- **Explicit Grant/Deny cá nhân, Delegation có thời hạn** — chưa ai từng
  cần "1 người nghỉ phép, uỷ quyền tạm 1 tuần". Khi có nhu cầu thật, thêm
  bảng `permission_overrides` (nhan_su_id, quyen, het_han) là đủ, không
  cần trước.
- **Permission Request Workflow (phê duyệt quyền nhạy cảm)** — công ty
  8 người, Giám đốc/Phó Giám đốc đã trực tiếp cấp mọi quyền, thêm 1 lớp
  phê duyệt là quan liêu hoá không cần thiết ở quy mô này.
- **UI tách 2 khu vực (System Admin / Trưởng phòng)** — hiện chỉ có
  `laTruongPhong()` (Xếp ca) là scope theo phòng ban thật; chưa đủ nhiều
  màn hình phân quyền để cần tách UI riêng.

Khi công ty lớn hơn (nhiều kho, nhiều người quản lý ngang cấp, cần uỷ
quyền tạm thời thật) — quay lại bản thiết kế đầy đủ đã trao đổi ngày
23/08/2026, áp dụng đúng phần đang thật sự cần thay vì làm lại từ đầu.
