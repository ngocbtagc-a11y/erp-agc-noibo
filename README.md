# CRM nội bộ — Công ty TNHH Alpha Green Commerce

Hệ thống quản trị nội bộ: **Danh bạ · Nhân sự · Kinh doanh · Kho vận · Kế toán**.
Dùng được trên cả máy tính và điện thoại.

---

## ⚠️ Trạng thái hiện tại: BẢN XEM TRƯỚC GIAO DIỆN

Đây **chưa phải** hệ thống chạy thật. Cụ thể:

| Hạng mục | Hiện tại | Cần làm để chạy thật |
|---|---|---|
| Số liệu | Dữ liệu giả trong `assets/js/data.js` | Nối database (MySQL/PostgreSQL) |
| Đăng nhập | Kiểm tra trên trình duyệt, mật khẩu `demo` | Máy chủ kiểm tra, mật khẩu mã hoá một chiều |
| Phân quyền | Ẩn tab trên trình duyệt | Máy chủ kiểm tra quyền trước khi trả dữ liệu |
| Nhập liệu | Chưa có | Thêm/sửa/xoá qua biểu mẫu |

### Lương KHÔNG được bảo mật trong bản này

Việc ẩn cột lương với người không có quyền **chỉ là che trên màn hình, không phải khoá**.
Bất kỳ ai đăng nhập, bấm F12 và gõ `DB.nhanSu.luong` là đọc được lương của tất cả mọi
người — kể cả mật khẩu mọi tài khoản trong `DB.taiKhoan`. Đã kiểm chứng thực tế.

Lý do: đây là web tĩnh, **mọi thứ gửi xuống trình duyệt thì người dùng đọc được hết**.
Không có mẹo lập trình nào che được. Lương chỉ thật sự kín khi nằm ở máy chủ và máy chủ
tự kiểm tra người hỏi là ai trước khi trả về.

👉 **Vì vậy: tuyệt đối không thay số lương thật, mật khẩu thật hay công nợ thật vào
`data.js` chừng nào chưa có máy chủ.**

| Dữ liệu | Đưa vào bản tĩnh này? |
|---|---|
| Danh bạ (tên, SĐT, email công việc) | Được — vốn dĩ mọi nhân sự đều xem |
| Lương, đánh giá nhân sự | **Không** — phải chờ có máy chủ |
| Công nợ, giá vốn, doanh thu thật | **Không** — phải chờ có máy chủ |
| Địa chỉ nhà, căn cước, ngày sinh | **Không** — không cần cho công việc |

---

## Chạy thử trên máy

```bash
npx serve -p 4400 .
```

Mở trình duyệt vào `http://localhost:4400`.

Tài khoản dùng thử — mật khẩu đều là `demo`:

Danh bạ mở cho tất cả. Các tab còn lại theo chức vụ:

| Tài khoản | Chức vụ | Xem được | Lương |
|---|---|---|---|
| Nguyễn Duy Phong | Giám đốc | Toàn bộ | ✅ |
| Bùi Thị Ngọc | Phó Giám đốc | Toàn bộ | ✅ |
| Phan Thị Hằng | Kế toán trưởng | Danh bạ, Kế toán | ✅ |
| Phạm Khương Duy | Quản lý kho | Danh bạ, Kho vận, Nhân sự | ❌ |
| Vũ Lan Hương | Hành chính nhân sự | Danh bạ, Nhân sự | ❌ |
| Nguyễn Thị Huyền | Vận hành sàn | Danh bạ, Kinh doanh | ❌ |

---

## Cấu trúc

```
crm-agc/
├── index.html              Màn hình đăng nhập
├── app.html                Trang CRM chính (5 tab)
└── assets/
    ├── css/style.css       Toàn bộ giao diện
    └── js/
        ├── data.js         Dữ liệu giả — sau này thay bằng gọi API
        └── app.js          Dựng giao diện + chuyển tab + phân quyền
```

---

## Sửa nội dung

Mọi số liệu nằm trong `assets/js/data.js`, đã chia sẵn theo từng tab
(`danhBa`, `tongQuan`, `nhanSu`, `kinhDoanh`, `khoVan`, `keToan`). Sửa file này là
giao diện đổi theo, không cần đụng vào chỗ khác.

Riêng lương để tách ở `DB.nhanSu.luong`, tra theo `id` nhân sự — tách sẵn như vậy để
sau này nó thành một endpoint riêng có kiểm tra quyền ở máy chủ, không phải sửa lại
cấu trúc dữ liệu.

---

## Bước tiếp theo

1. Sếp duyệt giao diện, góp ý bố cục và các chỉ số cần thêm/bớt.
2. Chọn hosting có chạy được máy chủ (Hostinger shared PHP hoặc VPS).
3. Dựng database + đăng nhập thật + phân quyền phía máy chủ.
4. Thêm chức năng nhập liệu, rồi mới đưa dữ liệu thật vào.
