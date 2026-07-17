# CRM nội bộ — Công ty TNHH Alpha Green Commerce

Hệ thống quản trị nội bộ: **Tổng quan · Danh bạ · Nhân sự · Kinh doanh · Kho vận · Kế toán**.
Dùng được trên cả máy tính và điện thoại.

Chạy trên Cloudflare Workers + D1 (gói miễn phí).

---

## Trạng thái từng phần

| Phần | Trạng thái | Được dùng dữ liệu thật? |
|---|---|---|
| Đăng nhập, phân quyền | ✅ Máy chủ thật | Có |
| **Danh bạ** | ✅ Máy chủ thật (D1) | Có |
| **Nhân sự** (gồm lương) | ✅ Máy chủ thật (D1) | Có |
| Tổng quan | ⚠️ Dữ liệu mẫu | **Chưa** |
| Kinh doanh | ⚠️ Dữ liệu mẫu — chờ nối Shopee API | **Chưa** |
| Kho vận | ⚠️ Dữ liệu mẫu | **Chưa** |
| Kế toán | ⚠️ Dữ liệu mẫu | **Chưa** |

⚠️ Bốn tab còn lại vẫn đọc từ `public/assets/js/data.js` — file này trình duyệt tải
về được nên **ai đăng nhập cũng đọc hết**. Đừng thay doanh thu, công nợ hay giá vốn
thật vào đó. Muốn dùng số thật thì phải chuyển tab đó sang máy chủ trước.

---

## Bảo mật đang có

| Thứ | Cách làm |
|---|---|
| Mật khẩu | PBKDF2-SHA256, 210.000 vòng, mỗi người một salt riêng. Không ai đọc được mật khẩu nhân viên — kể cả Giám đốc, chỉ đặt lại được. |
| Phiên đăng nhập | Cookie HttpOnly + Secure + SameSite=Lax, hạn 12 tiếng. JavaScript trong trang không đọc được cookie. Database chỉ lưu **hash** của token. |
| Dò mật khẩu | Sai 5 lần → khoá 15 phút. |
| Dò tên đăng nhập | Sai tên và sai mật khẩu trả về cùng một câu, thời gian trả lời như nhau. |
| Phân quyền | Máy chủ kiểm tra (`src/quyen.js`). Gõ thẳng API không có quyền → 403. |
| **Lương** | Người không có quyền thì câu `SELECT` **không lấy cột lương ra khỏi database** — không phải "lấy ra rồi ẩn đi". |

Ai xem được gì:

| Chức vụ | Tab | Lương |
|---|---|---|
| Giám đốc — Nguyễn Duy Phong | Toàn bộ | ✅ |
| Phó Giám đốc — Bùi Thị Ngọc | Toàn bộ | ✅ |
| Kế toán trưởng — Phan Thị Hằng | Tổng quan, Danh bạ, Kế toán | ✅ |
| Quản lý kho — Phạm Khương Duy | Tổng quan, Danh bạ, Kho vận, Nhân sự | ❌ |
| Hành chính nhân sự — Vũ Lan Hương | Tổng quan, Danh bạ, Nhân sự | ❌ |
| Vận hành sàn — Nguyễn Thị Huyền | Tổng quan, Danh bạ, Kinh doanh | ❌ |

Danh bạ mở cho tất cả — chỉ có thông tin liên lạc phục vụ công việc, không lương,
không địa chỉ nhà, không căn cước, không ngày sinh.

---

## Cài lần đầu

```bash
npm install
npx wrangler login          # mở trình duyệt, đăng nhập Cloudflare

npm run tao-db              # tạo database D1
# → chép database_id Cloudflare in ra, dán vào wrangler.toml

npm run tao-tai-khoan       # sinh mật khẩu ngẫu nhiên + ghi seed.sql
# → mật khẩu CHỈ HIỆN MỘT LẦN. Chép ra, gửi riêng từng người, rồi đóng cửa sổ.

npm run nap-db-may          # nạp database ở máy (để chạy thử)
npm run chay                # chạy thử → http://localhost:4400
```

Đưa lên mạng:

```bash
npm run nap-db              # nạp database thật trên Cloudflare
npm run dua-len             # deploy
```

> `seed.sql` chứa hash mật khẩu nên **đã bị chặn không cho lên GitHub**
> (xem `.gitignore`). Cần thì chạy lại `npm run tao-tai-khoan`.

Ai cũng bị bắt đổi mật khẩu ở lần đăng nhập đầu tiên, tối thiểu 10 ký tự.

---

## Cấu trúc

```
crm-agc/
├── wrangler.toml              Cấu hình Cloudflare
├── schema.sql                 Cấu trúc database
├── src/                       ⬅ CHẠY TRÊN MÁY CHỦ (trình duyệt không đọc được)
│   ├── index.js               Định tuyến API + kiểm tra quyền từng đầu việc
│   ├── auth.js                Băm mật khẩu, phiên, chặn dò mật khẩu
│   └── quyen.js               Bảng phân quyền — nơi duy nhất quyết định ai xem gì
├── scripts/
│   └── tao-tai-khoan.mjs      Sinh mật khẩu ban đầu
└── public/                    ⬅ TRÌNH DUYỆT TẢI VỀ ĐƯỢC (coi như công khai)
    ├── index.html             Đăng nhập + đổi mật khẩu lần đầu
    ├── app.html               Trang CRM chính
    └── assets/
        ├── css/style.css
        └── js/
            ├── api.js         Gọi máy chủ
            ├── app.js         Dựng giao diện
            └── data.js        Dữ liệu mẫu của 4 tab chưa nối máy chủ
```

Ranh giới quan trọng nhất: **`src/` là bí mật, `public/` là công khai.**
Đừng bao giờ đặt dữ liệu nhạy cảm hay chìa khoá vào `public/`.

---

## Bước tiếp theo

1. Chuyển tab Kinh doanh sang máy chủ, nối **Shopee Open Platform API**.
   Sếp cần đăng ký tại `open.shopee.com` trước — Shopee duyệt 3–5 ngày làm việc
   (có nguồn nói tối đa 2 tuần).
   - `partner_key` là chìa khoá bí mật → lưu bằng `wrangler secret put`,
     **không bao giờ** để trong `public/` hay commit lên GitHub.
   - `access_token` hết hạn 4 tiếng, `refresh_token` 30 ngày → cần Cron Trigger
     tự làm mới. Ngừng chạy quá 30 ngày là phải cấp quyền lại bằng tay.
   - Doanh thu thật phải lấy từ nhóm API thanh toán/đối soát (escrow), không
     phải tổng giá đơn — tổng giá đơn chưa trừ phí sàn, voucher, phí vận chuyển.
   - Hai pháp nhân (Công ty + HKD) = hai shop → cấp quyền riêng, lưu token riêng.
2. Chuyển Kho vận và Kế toán sang máy chủ.
3. Thêm chức năng nhập liệu (thêm/sửa nhân sự, cập nhật lương).
4. TikTok Shop có cổng API riêng, làm sau.
