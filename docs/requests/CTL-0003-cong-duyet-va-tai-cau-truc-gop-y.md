# CTL-0003 — Cổng duyệt phân cấp & tái cấu trúc "Góp ý & Cải tiến ERP"

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc
- **Ngày nhận**: 2026-08-27
- **Category**: `PROCESS_IMPROVEMENT` + `PERMISSION_ISSUE` + `UX_IMPROVEMENT`
- **Module**: `gop_y` — `src/index.js:3010-3330`, tab `gopy` trong `public/`
- **Risk**: **HIGH** (đụng phân quyền + đổi luồng nghiệp vụ đang dùng thật)
- **Status**: `READY_FOR_ANALYSIS`
- **Current Owner**: GẠO → **Next Owner**: HỒ LY
- **Spec reference**: (chưa có — Hồ Ly viết)

---

## 1. Ba việc Sếp nêu — gộp làm một

Sếp nêu ba điều trong cùng một buổi. Cả ba đụng **cùng một hàm**
(`gopYDoiTrangThai`, `src/index.js:3215`) và **cùng một màn hình**
(danh sách góp ý). Theo Rule 11 — One Writer Per Area — phải làm chung
một spec, không tách ba người sửa song song.

### 1.1 Trạng thái đang nói dối

> *"sao tao xem cái yêu cầu này vẫn chưa được thực hiện? đã thế tao lại
> còn tự chọn được trạng thái về hoàn thành"*

**Bằng chứng code.** `gopYDoiTrangThai()` chỉ kiểm tra hai điều:
`laAdmin(phien.vai_tro)` và `GOPY_TRANG_THAI_HOP_LE.includes(trangThaiMoi)`.
**Không có luật chuyển trạng thái.** Nên `moi → hoan_thanh` một cú bấm là
hợp lệ, không cần commit, không cần review, không cần ai xác nhận.

Đã xảy ra thật: góp ý *"Sửa chỗ góp ý erp"* của chính Sếp Ngọc đang hiển
thị **"Hoàn thành"** trong khi chưa có dòng code nào được viết.

**Đối chiếu trong cùng repo.** Module `cong_viec` **có** luật chuyển
(`src/index.js:1956`): mỗi trạng thái khai rõ `tu:` (được đi từ đâu) và
`ai:` (ai được bấm). Module `gop_y` mới hơn nhưng thiếu hoàn toàn.

**Vi phạm Hiến pháp**: Rule 9 (No Unverified Data Becomes Truth),
Rule 8 (Traceable & Recoverable).

### 1.2 Chưa có phân cấp duyệt

> *"nv kho đề xuất sửa, quản lý kho duyệt, tao cũng duyệt, xong thì mới
> làm, ko thì sẽ gây xáo trộn hệ thống erp của tao"*

Hiện chỉ cần vai trò Admin là đổi được mọi thứ, không qua quản lý trực tiếp.
Chính sách Sếp yêu cầu:

```
Nhân viên đề xuất
   → Quản lý trực tiếp duyệt
      → ERP Owner duyệt
         → mới được chuyển sang làm
```

### 1.3 Danh sách quá sơ sài

> *"tái cấu trúc lại cái mục góp ý erp đó chi tiết hơn ví dụ như có mã góp
> ý, ai góp ý, đã duyệt cấp trưởng phòng chưa, ngày góp ý, đánh giá rủi ro"*

Màn hình hiện chỉ có 4 cột: **Tiêu đề · Người gửi · Trạng thái · Cập nhật**.
Nhìn vào không biết ai đang giữ, đã qua cấp nào, rủi ro ra sao, gửi từ bao giờ.

---

## 2. Reuse — dữ liệu đã có sẵn, KHÔNG tạo bảng mới

Rule 5 (Reuse → Extend → Create). Kiểm chứng trực tiếp trong repo:

| Cần gì | Đã có sẵn ở đâu | Ghi chú |
|---|---|---|
| Mã góp ý | `gop_y.id` (INTEGER autoincrement) | Hiển thị `GY-0001`, **không thêm cột** |
| Ai góp ý | `gop_y.nguoi_gui_id` → `nhan_su.ho_ten` | Đã join sẵn trong `gopYDanhSach()` |
| Phòng ban người gửi | `nhan_su.bo_phan`, `nhan_su.phong_ban_id` | `schema.sql:21`, `them-danhmuc-nen.sql:34` |
| **Quản lý trực tiếp** | `nhan_su.quan_ly_id` | `schema.sql:24` — đã có, chưa ai dùng cho việc này |
| **Trưởng phòng** | `phong_ban.truong_phong_id` | `them-dangky-ca.sql:24` |
| Ngày góp ý | `gop_y.tao_luc` | Đã có, chỉ chưa hiển thị |
| Đánh giá rủi ro | `gop_y.de_xuat_risk` (LOW/MEDIUM/HIGH) | Hồ Ly AI đã tự chấm mỗi 5 phút, **đang không hiện ra màn hình** |
| Lý do chấm risk | `gop_y.de_xuat_ly_do` | Đã có |
| Lịch sử duyệt | `gop_y_lich_su` (`tu_trang_thai`, `den_trang_thai`, `nguoi_doi_id`, `ghi_chu`, `luc`) | Đủ để truy vết, không cần bảng audit mới |
| Báo người duyệt | `guiThongBao()` + `guiTelegram()` | Đã chạy thật ở 6 mốc |
| Người phụ trách | `gop_y.nguoi_phu_trach_id` | Đã có |
| Link spec | `gop_y.spec_reference` | Đã có, chưa dùng |

**Chỉ thiếu vài cột** — dự kiến toàn bộ là `ALTER TABLE ADD COLUMN`,
không phá dữ liệu, lùi được:

- `risk` — mức rủi ro **do người chốt** (khác `de_xuat_risk` là AI đề xuất).
- `duyet_cap1_boi_id` + `duyet_cap1_luc` — quản lý trực tiếp đã duyệt chưa.
- `duyet_owner_boi_id` + `duyet_owner_luc` — Sếp đã duyệt chưa.
- `bang_chung` hoặc tái dùng `spec_reference` — điều kiện để vào `hoan_thanh`.

---

## 3. Hồ Ly phải trả lời trong Feature Spec

Đây là phần Gạo **không** làm thay. Hồ Ly phân tích rồi trình Sếp chốt.

1. **Ai là người duyệt cấp 1?** Dùng `nhan_su.quan_ly_id` hay
   `phong_ban.truong_phong_id`? Hai nguồn này có mâu thuẫn nhau không —
   nếu có thì cái nào là Source of Truth? (Rule 1)
2. **Người không có quản lý** (chính Sếp, quản lý cấp cao) thì bỏ qua cấp 1
   hay tự động coi như đã duyệt?
3. **Ma trận chuyển trạng thái đầy đủ**: mỗi trạng thái — đi từ đâu được,
   ai được bấm. Viết theo đúng khuôn `cong_viec` (`src/index.js:1956`) để
   hai module nhất quán, đừng bịa kiểu mới.
4. **Điều kiện vào `hoan_thanh`**: bắt buộc bằng chứng gì (commit /
   handoff / `spec_reference`)? Chặn cứng ở backend hay chỉ cảnh báo?
   Ai được bấm — người build, người review, hay Sếp?
5. **Từ chối ở cấp 1** thì góp ý về trạng thái nào? Người gửi nhìn thấy gì?
   Có được sửa rồi gửi lại không?
6. **Sếp có quyền vượt cấp** (bỏ qua cấp 1) không? Nếu có thì ghi vết ra sao
   để sau này còn truy được?
7. **Dữ liệu cũ**: các góp ý đang ở trạng thái không hợp lệ theo luật mới —
   gồm cả góp ý *"Sửa chỗ góp ý erp"* đang mang nhãn "Hoàn thành" sai —
   xử lý thế nào? Migration đưa về đâu? (Rule 10 — History Must Survive Change)
8. **Human Cost** (Rule 12): Sếp phải bấm duyệt bao nhiêu lần một tuần?
   Có duyệt hàng loạt được không? Có ngưỡng nào tự bỏ qua cấp Sếp
   (ví dụ risk LOW chỉ cần quản lý duyệt)? — đây là câu quan trọng nhất,
   vì thêm cổng duyệt mà không cân nhắc sẽ biến Sếp thành nút cổ chai.
9. **Thiết kế lại danh sách**: cột nào lên bảng chính, cột nào vào chi tiết.
   Đề xuất khởi điểm — Hồ Ly phản biện tiếp:
   `Mã · Tiêu đề · Người gửi (+ phòng ban) · Ngày gửi · Rủi ro · Cấp duyệt hiện tại · Trạng thái · Đang chờ ai`
   ERP là PWA, nhiều thao tác trên điện thoại — 8 cột có vừa màn hình không?
10. **Exception-First**: mặc định màn hình mở ra nên hiện "việc đang chờ TÔI
    duyệt", không phải toàn bộ danh sách.

---

## 4. Ràng buộc bắt buộc

- **Không** tạo bảng yêu cầu thứ hai. EXTEND `gop_y`. (Hiến pháp 1, 3, 4, 15 —
  đây chính là lỗi mà `SPEC-0001` đã phải rút.)
- **Không** bịa role hệ thống mới. Dùng `quyen.js` + `quan_ly_id` sẵn có.
- Luật duyệt phải enforce ở **backend**, không chỉ ẩn nút ở giao diện —
  đã có tiền lệ test nhân viên gọi thẳng API triage bị chặn 403, giữ đúng mức đó.
- Migration phải **lùi được**. Không `DROP`, không sửa dữ liệu cũ khi chưa Sếp duyệt.
- Không đo năng suất cá nhân của người gửi góp ý.

## 5. Quan hệ với việc khác

- **Làm trước `CTL-0002`** (Control Tower V1). CTL-0002 đụng đúng hàm này;
  làm sau để khỏi sửa hai lần cùng vùng.
- Cột `current_owner`/`next_owner` của CTL-0002 và cột `duyet_cap1_*` ở đây
  liên quan nhau — Hồ Ly cân nhắc thiết kế một lần cho cả hai, nhưng
  **triển khai theo hai đợt**.

## 6. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Sếp phát hiện trạng thái "Hoàn thành" sai sự thật |
| `NEW` | `TRIAGE` | GẠO | 2026-08-27 | Xác minh code, gộp thêm 2 yêu cầu cùng vùng của Sếp |
| `TRIAGE` | `READY_FOR_ANALYSIS` | GẠO | 2026-08-27 | Chuyển Hồ Ly viết Feature Spec |
