# CRM nội bộ — Công ty TNHH Alpha Green Commerce

Hệ thống quản trị nội bộ: **Nhân sự · Kinh doanh · Kho vận · Kế toán**.
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

**Không được đưa dữ liệu thật của công ty vào bản này.** Phần ẩn/hiện theo vai trò
hiện chỉ là ẩn trên giao diện — người biết kỹ thuật vẫn mở được mã nguồn trang và
đọc toàn bộ nội dung trong `data.js`. Bảo mật thật chỉ có khi máy chủ tự kiểm tra quyền.

---

## Chạy thử trên máy

```bash
npx serve -p 4400 .
```

Mở trình duyệt vào `http://localhost:4400`.

Tài khoản dùng thử — mật khẩu đều là `demo`:

| Tài khoản | Chức vụ | Xem được |
|---|---|---|
| Nguyễn Duy Phong | Giám đốc | Toàn bộ + lương |
| Bùi Thị Ngọc | Phó Giám đốc | Toàn bộ + lương |
| Phạm Khương Duy | Quản lý kho | Tổng quan, Kho vận, Nhân sự (không lương) |
| Phan Thị Hằng | Kế toán trưởng | Tổng quan, Kế toán + lương |
| Vũ Lan Hương | Hành chính nhân sự | Tổng quan, Nhân sự (không lương) |
| Nguyễn Thị Huyền | Vận hành sàn | Tổng quan, Kinh doanh |

---

## Cấu trúc

```
crm-agc/
├── index.html              Màn hình đăng nhập
├── app.html                Trang CRM chính (4 tab)
└── assets/
    ├── css/style.css       Toàn bộ giao diện
    └── js/
        ├── data.js         Dữ liệu giả — sau này thay bằng gọi API
        └── app.js          Dựng giao diện + chuyển tab + phân quyền
```

---

## Sửa nội dung

Mọi số liệu nằm trong `assets/js/data.js`, đã chia sẵn theo từng tab
(`tongQuan`, `nhanSu`, `kinhDoanh`, `khoVan`, `keToan`). Sửa file này là
giao diện đổi theo, không cần đụng vào chỗ khác.

---

## Bước tiếp theo

1. Sếp duyệt giao diện, góp ý bố cục và các chỉ số cần thêm/bớt.
2. Chọn hosting có chạy được máy chủ (Hostinger shared PHP hoặc VPS).
3. Dựng database + đăng nhập thật + phân quyền phía máy chủ.
4. Thêm chức năng nhập liệu, rồi mới đưa dữ liệu thật vào.
