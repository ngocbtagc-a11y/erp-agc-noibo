# ERP nội bộ — Công ty TNHH Alpha Green Commerce

Hệ thống quản trị nội bộ: **Tổng quan · Danh bạ · Nhân sự · Kinh doanh · Kho vận · Kế toán · Xếp ca · Tài sản · Quản trị**.
Dùng được trên cả máy tính và điện thoại.

Chạy trên Cloudflare Workers + D1 (gói miễn phí).

**Người mới vào dự án đọc [docs/START-HERE.md](docs/START-HERE.md) trước** (10 phút, không cần biết kỹ thuật). Claude Code đọc [CLAUDE.md](CLAUDE.md).

---

## Trạng thái từng phần

⚠️ Bảng dưới đây đã lỗi thời tính đến 22/08/2026 — Đơn hàng/Đơn hoàn đã
chạy dữ liệu thật (Shopee/TikTok đồng bộ sống), Sản phẩm/Kho vận vẫn chưa
có dữ liệu thật. Trạng thái đúng và chi tiết từng bảng xem
[docs/MODULE-MAP.md](docs/MODULE-MAP.md) và
[docs/audit/AUDIT-GOLIVE-MASTERDATA.md](docs/audit/AUDIT-GOLIVE-MASTERDATA.md).

| Phần | Trạng thái | Được dùng dữ liệu thật? |
|---|---|---|
| Đăng nhập, phân quyền | ✅ Máy chủ thật | Có |
| **Danh bạ** | ✅ Máy chủ thật (D1) | Có |
| **Nhân sự** (gồm lương) | ✅ Máy chủ thật (D1) | Có |
| Tổng quan | ⚠️ Dữ liệu mẫu | **Chưa** |
| Kinh doanh | ⚠️ Dữ liệu mẫu | **Chưa** |
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

**Trước hết**, mở `scripts/tao-tai-khoan.mjs`, sửa khối `ADMIN` ở đầu file —
đổi `so_dien_thoai` thành **số điện thoại thật** của người làm admin (số này
chính là tên đăng nhập).

```bash
npm install
npx wrangler login          # mở trình duyệt, đăng nhập Cloudflare

npm run cai-dat             # tạo database D1 + tự điền mã vào wrangler.toml
npm run tao-tai-khoan       # tạo 1 tài khoản admin + in mật khẩu (một lần)
npm run nap-db              # nạp database lên Cloudflare
npm run dua-len             # đưa web lên mạng
```

Xong sẽ hiện địa chỉ dạng `crm-agc.<tài-khoản>.workers.dev` — vào được từ mọi
máy tính và điện thoại, có sẵn HTTPS, không cần mua tên miền.

**Chỉ có 1 tài khoản admin lúc đầu.** Đăng nhập bằng số điện thoại + mật khẩu
vừa in, đổi mật khẩu, rồi vào tab **Quản trị** để thêm mọi nhân sự khác và tạo
tài khoản cho họ (tên đăng nhập = số điện thoại của từng người). Không cần chạy
lại lệnh nào — thêm người bằng vài cú bấm trên web.

Chạy thử ở máy trước khi đưa lên mạng:

```bash
npm run nap-db-may          # nạp database ở máy
npm run chay                # → http://localhost:4400
```

### ⚠ Về mật khẩu

`npm run tao-tai-khoan` in mật khẩu admin ra màn hình **một lần duy nhất**, không
ghi vào file nào. Chép ra, cất kỹ, rồi đóng cửa sổ. Admin bị bắt đổi mật khẩu ở
lần đăng nhập đầu. Mật khẩu tối thiểu 6 ký tự (web nội bộ nên không khắt khe,
xem `src/mat-khau.js`).

Khi admin tạo tài khoản cho nhân viên trong tab Quản trị, hệ thống cũng sinh mật
khẩu tạm hiện **một lần** — chép gửi riêng cho nhân viên, họ sẽ đổi khi đăng nhập.

Lệnh này phải do **người quản trị tự chạy trên máy mình** — không chạy qua trợ
lý AI hay công cụ nào ghi lại màn hình, vì mật khẩu sẽ nằm lại trong lịch sử đó.

`seed.sql` chứa hash mật khẩu nên **đã bị chặn không cho lên GitHub**
(xem `.gitignore`). Cần thì chạy lại `npm run tao-tai-khoan`.

### Về tên miền

Không bắt buộc. Địa chỉ `workers.dev` dùng được ngay, miễn phí, vào từ mọi nơi.

Nhưng tài liệu Cloudflare ghi rõ `workers.dev` "dành cho dự án cá nhân hoặc
nghiệp dư, không phải việc quan trọng của doanh nghiệp", và khuyến nghị chạy
thật nên dùng tên miền riêng. Khi công ty có tên miền, gắn vào **không tốn thêm
phí Cloudflare** — chỉ cần trỏ tên miền về Cloudflare rồi thêm Custom Domain.

---

## Dùng trên điện thoại + cài như một app

Sau khi `npm run dua-len`, web chạy ở địa chỉ `workers.dev`. Vào được từ mọi
điện thoại — chỉ cần mở trình duyệt và gõ địa chỉ đó. Không cần tải gì từ chợ ứng dụng.

Muốn nó thành **app có icon trên màn hình chính** (PWA — không qua CH Play/App Store):

- **iPhone (Safari):** mở địa chỉ → nút Chia sẻ ⬆️ → "Thêm vào MH chính".
- **Android (Chrome):** mở địa chỉ → menu ⋮ → "Cài đặt ứng dụng" / "Thêm vào MH chính".

Sau đó mở từ icon: chạy toàn màn hình như app thật, có logo lá, mở nhanh vì phần
giao diện đã lưu sẵn trong máy.

> **Bảo mật:** phần lưu trong máy (service worker) **chỉ lưu giao diện tĩnh**,
> tuyệt đối không lưu dữ liệu lương/công nợ. Mỗi lần mở app vẫn phải hỏi máy chủ,
> vẫn cần đăng nhập. Xem `public/sw.js`.

---

## Cấu trúc

```
crm-agc/
├── wrangler.toml              Cấu hình Cloudflare
├── schema.sql                 Cấu trúc database
├── src/                       ⬅ CHẠY TRÊN MÁY CHỦ (trình duyệt không đọc được)
│   ├── index.js               Định tuyến API + kiểm tra quyền từng đầu việc
│   ├── auth.js                Băm mật khẩu, phiên, chặn dò mật khẩu
│   ├── mat-khau.js            Chặn mật khẩu dễ đoán
│   └── quyen.js               Bảng phân quyền — nơi duy nhất quyết định ai xem gì
├── scripts/
│   ├── tao-tai-khoan.mjs      Sinh mật khẩu ban đầu
│   └── tao-icon-app.ps1       Tạo icon cho app điện thoại
└── public/                    ⬅ TRÌNH DUYỆT TẢI VỀ ĐƯỢC (coi như công khai)
    ├── index.html             Đăng nhập + đổi mật khẩu lần đầu
    ├── app.html               Trang ERP chính
    ├── manifest.webmanifest   Khai báo app điện thoại (PWA)
    ├── sw.js                  Service worker — CHỈ lưu giao diện, không lưu dữ liệu
    └── assets/
        ├── css/style.css
        ├── img/               Logo + icon app
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
