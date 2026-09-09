# Điều hướng ERP theo cơ cấu tổ chức

Chốt 06/09/2026 bởi ERP Owner, bám **Phụ lục 01 — Sơ đồ cơ cấu tổ chức**
(kèm Quyết định QĐ-AGC năm 2026).

Tài liệu này **thay thế** phần "Đề xuất cấu trúc phòng ban ERP V2" trong
[ERP_V2_INFORMATION_ARCHITECTURE.md](./ERP_V2_INFORMATION_ARCHITECTURE.md) —
tài liệu đó dựng theo mô hình **4 phòng cũ** (Ban Giám đốc · Kho Vận-Sản Xuất
· Kinh Doanh-MKT · Support), không còn khớp sơ đồ tổ chức chính thức.

## 1. Sơ đồ tổ chức chính thức

```
GIÁM ĐỐC — điều hành chung Công ty
│
├── PHÒNG KINH DOANH VÀ PHÁT TRIỂN THỊ TRƯỜNG   (Giám đốc trực tiếp phụ trách)
│     ├── Nhóm MARKETING – BÁN HÀNG         (Marketing · Booking · Kênh bán Online/Offline)
│     └── Nhóm CSKH VÀ PHÁT TRIỂN CUNG ỨNG  (CSKH · Nguồn hàng · Sản phẩm · Nhà cung cấp)
│
└── PHÒNG VẬN HÀNH VÀ HỖ TRỢ                     (Phó Giám đốc trực tiếp phụ trách)
      ├── Nhóm KẾ TOÁN – TÀI CHÍNH          (Kế toán · Tài chính · Thuế · Công nợ)
      ├── Nhóm HCNS – ADMIN                 (Nhân sự · Hành chính · Văn thư)
      └── Nhóm KHO VẬN – SẢN XUẤT           (Kho · Sản xuất · Đơn hàng · Đóng gói · Hàng hoàn)
```

Khác biệt lớn so với mô hình cũ: **Kho vận không còn là phòng ngang cấp** —
nay là một nhóm thuộc Phòng Vận hành và Hỗ trợ.

## 2. Vấn đề của điều hướng cũ

Yêu cầu nguyên văn của ERP Owner: *"đừng ngồi nhét quá nhiều dữ liệu vào cùng
1 tab, ưu tiên trải nghiệm người dùng, dễ tìm, dễ làm"*.

| Vấn đề | Cụ thể |
|---|---|
| Nhét 4 màn vào 1 tab | Tab **Kinh doanh** chứa Vận hành sàn · Sản phẩm · R&D · CSKH, giấu sau một dải nút nhỏ. Ai không biết có dải đó thì **không bao giờ tìm ra 3 màn còn lại**. |
| Nhóm cha sai thực tế | Sidebar nhóm theo 4 phòng cũ, không khớp sơ đồ tổ chức. |
| Không có tổng quan cấp phòng | Chỉ có Home cá nhân. Trưởng phòng không có chỗ nào nhìn được tình hình phòng mình. |

## 3. Điều hướng mới

```
(dùng chung — mọi vai trò)
  Trạm Mục Tiêu · Lịch sử làm việc · Danh bạ · Góp ý ERP

── Điều hành chung ──
  Tổng quan công ty                    [chỉ Admin]

── Kinh doanh & Phát triển thị trường ──
  Tổng quan phòng                      [ai xem được tab Kinh doanh]
  Vận hành sàn            → Marketing – Bán hàng
  Kết nối sàn             → Marketing – Bán hàng
  Chăm sóc khách hàng     → CSKH và Phát triển cung ứng
  Sản phẩm & Nguồn cung   → CSKH và Phát triển cung ứng
  R&D sản phẩm            → CSKH và Phát triển cung ứng

── Vận hành & Hỗ trợ ──
  Tổng quan phòng                      [ai xem được Kế toán/Kho vận/Nhân sự/Tài sản, hoặc là trưởng phòng thật]
  Kế toán – Tài chính     → Nhóm Kế toán – Tài chính
  Kho vận – Sản xuất      → Nhóm Kho vận – Sản xuất
  Nhân sự                 → Nhóm HCNS – Admin
  Xếp ca                  → Nhóm HCNS – Admin
  Tài sản                 → Nhóm HCNS – Admin
  Kho tài liệu            → Nhóm HCNS – Admin

── Quản trị hệ thống ──
  Tài khoản & Phân quyền
```

## 4. Cách hoạt động (đọc trước khi sửa `TAB` trong `app.js`)

Mỗi mục trên thanh bên là một object:

| Trường | Nghĩa |
|---|---|
| `id` | mã mục, DUY NHẤT. **Không nhất thiết trùng tên màn.** |
| `man` | id màn thật `#v-<man>` sẽ bật. Bỏ trống → lấy luôn `id`. |
| `pane` | mở đúng màn con bên trong dải `#kdSeg`. Bỏ trống → không đụng. |
| `quyen` | khoá quyền cần có. Bỏ trống → lấy luôn `man`. |
| `hien` | hàm tự quyết hiện/ẩn — chỉ dùng cho 3 màn Tổng quan. |

**Vì sao 4 mục Kinh doanh trỏ chung 1 màn:** để tách 4 màn con thành 4 mục
điều hướng riêng mà **không phải di chuyển hàng nghìn dòng DOM**. Bấm mục là
`moTab` bật màn `kinhdoanh` rồi bấm hộ nút dải màn con — dùng lại đúng bộ
chuyển màn đã có (Rule 5). Rủi ro đụng độ với nhánh khác gần như bằng không.

⚠️ **Bẫy đã vấp:** `moTab` phải ẩn màn theo danh sách **MÀN** (`MOI_MAN`),
KHÔNG theo id mục. Duyệt theo id mục sẽ tự ẩn mất chính màn vừa bật, vì 4 mục
cùng trỏ về màn `kinhdoanh`.

## 5. Ba màn Tổng quan

| Màn | Ai thấy | Nội dung |
|---|---|---|
| Tổng quan công ty | Admin | Doanh thu tạm tính tháng này + tách theo sàn · việc quá hạn/chờ duyệt toàn công ty · mục tiêu công ty chưa chốt · giá trị tồn kho (nếu có quyền giá vốn) · lối tắt sang 2 phòng |
| Tổng quan phòng Kinh doanh | ai xem được tab Kinh doanh | Doanh thu tạm tính · đơn đặt · hủy+hoàn · đơn chờ đối soát · đơn bị hủy · lối tắt 5 màn của phòng |
| Tổng quan phòng Vận hành | ai xem được Kế toán/Kho vận/Nhân sự/Tài sản, hoặc trưởng phòng thật | Tồn kho (mã hàng, dưới tối thiểu, sắp hết hạn, giá trị) · chờ tra soát tiền · hàng hỏng chờ biên bản · tài sản báo hỏng/mất · lối tắt các màn |

**Ba quyết định thiết kế, đừng đảo ngược nếu không có lý do mới:**

1. **KHÔNG viết API mới.** Mọi con số ghép từ đúng API nghiệp vụ đang chạy.
   Nhờ vậy số trên tổng quan không bao giờ lệch số trong tab gốc — cùng một
   nguồn, không phải hai đường tính (Rule D4).
2. **KHÔNG thêm khoá quyền mới vào `src/quyen.js`.** Hiện hay ẩn suy ra từ
   quyền chức năng người đó đã có. Tránh đụng vào mô hình phân quyền hai ô
   vừa làm lại 04/09. Ép mở được màn cũng vô ích: mọi API vẫn tự chặn ở máy
   chủ, thẻ chỉ trống chứ không rò dữ liệu.
3. **Thiếu quyền mảng nào thì BỎ HẲN thẻ đó**, không hiện thẻ rỗng — người
   xem chỉ thấy đúng phần mình phụ trách (Rule D1: không đưa số lên chỉ vì
   có dữ liệu).

Trưởng phòng thật (`TOI.phong_ban_quan_ly`) cũng thấy Tổng quan phòng dù vai
trò hệ thống chỉ là `nguoi_dung` — đúng bài học Rule D2 đã ghi trong
Constitution (trưởng phòng thật thường không có vai trò hệ thống cao).

## 6. Đã kiểm chứng

Chạy `wrangler dev` với dữ liệu thử trên D1 local, đăng nhập thật, xoá sạch
sau khi verify:

- Thanh bên ra đúng 23 mục theo đúng 4 nhóm của sơ đồ tổ chức.
- Cả 4 mục Kinh doanh mở đúng màn con tương ứng, tiêu đề đổi đúng.
- 3 màn Tổng quan ra số đúng và **khớp nhau**: doanh thu 800.000đ hiện giống
  hệt ở cả Tổng quan công ty lẫn Tổng quan Kinh doanh (đúng ý đồ mục 5.1).
- Cảnh báo "Mất 36% giá trị đơn vì hủy và hoàn" bật đúng ngưỡng.
- **375px: không màn nào tràn ngang**, thanh bên mở/đóng đúng, bấm mục thì
  thanh bên tự đóng.

## 7. Chưa làm

- Chưa gộp nhóm con (Marketing – Bán hàng · CSKH – Cung ứng · Kế toán – Tài
  chính · HCNS – Admin · Kho vận – Sản xuất) thành cấp thứ 3 trên thanh bên.
  Cân nhắc: 3 cấp trên sidebar dễ rối hơn là dễ tìm. Tên nhóm hiện đang ghi
  ở cột trái các lối tắt trong màn Tổng quan phòng — đủ để biết mảng nào
  thuộc nhóm nào mà không làm nặng thanh bên.
- Chưa đụng `src/quyen.js`: vai trò hệ thống và vị trí công việc giữ nguyên.
  Nếu sau này công ty muốn "Trưởng phòng Kinh doanh" là một vị trí công việc
  riêng có bộ tab riêng, thêm vào `VI_TRI_CONG_VIEC` là xong, điều hướng
  không phải sửa.
