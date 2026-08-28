# CTL-0023 — Vai trò `giam_doc` / `pho_giam_doc` không có trong bảng quyền

- **Requester**: KHỈ ĐỘT (phát hiện khi làm CTL-0003 / SPEC-0002), 2026-08-28
- **Category**: `FIX_REQUIRED` — nghi mất quyền trên bản thật
- **Priority**: **P1** nếu bản thật dính, **P3** nếu chỉ có ở seed cục bộ
- **Risk**: **HIGH** — chạm `src/quyen.js`, là vùng phân quyền
- **Status**: `NEEDS_TRIAGE` — **chưa ai kiểm bản thật**
- **Current Owner**: GẠO (định tuyến)
- **Ghi nhận, KHÔNG sửa trong nhánh `feature/spec-0002-cong-duyet`** — không
  thuộc phạm vi cổng duyệt, và sửa phân quyền phải đi phiếu riêng.

---

## 1. Chuyện gì

`QUYEN_THEO_VAI_TRO` (`src/quyen.js:32`) khai đúng 12 vai trò:

```
admin · admin_backup · nguoi_dung · ke_toan_truong · quan_ly_kho ·
nhan_vien_kho · hcns · van_hanh_san · cskh · nv_test  (…)
```

**Không có `giam_doc`, không có `pho_giam_doc`.**

`layQuyen()` (`src/quyen.js:203`) trả `QUYEN_THEO_VAI_TRO[vaiTro] || KHONG_QUYEN`.
Nên tài khoản mang vai trò không khai ở đó thì **rơi thẳng vào `KHONG_QUYEN`**:
không tab nào, không quyền gì. Không phải "quyền hạn chế" — là **trắng quyền**.

Hỏng theo hướng an toàn (đóng chứ không mở), nên đây **không phải lỗ bảo mật**.
Nhưng nếu tài khoản thật của Sếp Ngọc hay anh Phong mang vai trò đó thì
**đang đăng nhập vào một ERP trống rỗng**.

## 2. Vì sao nghi có thật

`scripts/tao-tai-khoan.mjs` ghi `chuc_vu: 'Phó Giám đốc'` cho Sếp Ngọc.
`chuc_vu` (chức danh, chỉ để hiển thị) **khác** `vai_tro` (khoá tra bảng quyền)
— nhưng hai thứ na ná nhau nên rất dễ có chỗ nào đó điền nhầm `vai_tro` thành
`pho_giam_doc`/`giam_doc`. Seed cục bộ trong máy Khỉ Đột chỉ có
`admin` / `quan_ly_kho` / `nhan_vien_kho`, nên **không kết luận được từ đây**.

## 3. Việc phải làm — đúng một câu lệnh, chạy trên BẢN THẬT

```
npx wrangler d1 execute crm-agc --remote \
  --command "SELECT ten_dang_nhap, vai_tro FROM tai_khoan WHERE vai_tro NOT IN
   ('admin','admin_backup','nguoi_dung','ke_toan_truong','quan_ly_kho',
    'nhan_vien_kho','hcns','van_hanh_san','cskh','nv_test')"
```

- **Trả về 0 dòng** → không có ai dính, hạ xuống P3, đóng phiếu.
- **Trả về có dòng** → những người đó **đang mất sạch quyền**. Sửa bằng cách
  đổi `vai_tro` về một khoá có thật (nhiều khả năng là `admin`), **không** phải
  bằng cách thêm vai trò mới vào bảng quyền cho xong.

## 4. Đề nghị chặn tái diễn

`VAI_TRO_HOP_LE` (`src/quyen.js:237`) đã sinh sẵn từ `QUYEN_THEO_VAI_TRO`.
Chỗ nào ghi `tai_khoan.vai_tro` mà chưa đối chiếu với danh sách này thì nên
chặn ngay lúc ghi — sai khoá vai trò phải báo lỗi ở form, không được im lặng
tạo ra một tài khoản trắng quyền.
