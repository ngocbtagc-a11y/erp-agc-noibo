# Hướng dẫn cho người mới — ERP Alpha Green Commerce

Chào mừng bạn vào dự án! File này giúp bạn cài đặt và bắt đầu làm việc trong ~15 phút.

## 1. Đây là hệ thống gì?

ERP nội bộ của **Công ty TNHH Alpha Green Commerce** (bán thực phẩm hữu cơ trên Shopee/TikTok).

- Chạy trên **Cloudflare Workers + D1** (database SQLite trên mây, không cần server riêng).
- Giao diện web thuần **HTML/CSS/JS** (không dùng framework nặng) — dễ đọc, dễ sửa.
- Đã là **PWA** (cài được lên điện thoại như app).

**Các module đang có:** Kho (Xuất–Nhập–Tồn + FEFO theo hạn sử dụng), Đơn hoàn (Shopee + TikTok), Nhân sự (+ AI đọc ảnh CCCD), Danh bạ, và phân quyền theo vai trò (Giám đốc, Kế toán, Kho…).

## 2. Cần cài gì trên máy

- **Git** — https://git-scm.com
- **Node.js** (bản LTS mới nhất) — https://nodejs.org
- *(Tùy chọn)* **Claude Code** — nếu muốn AI hỗ trợ viết code.
- *(Chỉ khi cần deploy)* Tài khoản **Cloudflare** — hỏi Sếp Ngọc để được mời vào.

## 3. Lấy code về + cài đặt

```
git clone https://github.com/ngocbtagc-a11y/erp-agc-noibo.git
cd erp-agc-noibo
npm install
```

## 4. Cấu trúc thư mục

```
src/                  Code máy chủ (Cloudflare Worker)
  index.js            Định tuyến toàn bộ API
  auth.js             Đăng nhập, phiên, băm mật khẩu
  quyen.js            Phân quyền theo vai trò (nơi DUY NHẤT quyết ai xem gì)
  kho.js              Nghiệp vụ Kho (sổ cái Xuất-Nhập-Tồn, FEFO)
  shopee.js / tiktok.js   Kéo đơn hoàn từ sàn về
  nhansu.js           Hồ sơ nhân sự mở rộng + AI đọc CCCD
public/               Giao diện (trình duyệt tải về được)
  index.html          Màn đăng nhập / đổi mật khẩu
  app.html            App chính (các tab)
  assets/js/app.js    Điều khiển giao diện
  assets/js/api.js    Lớp gọi API
  assets/css/style.css
migrations/           Các file SQL thêm bảng cho từng module
schema.sql            Cấu trúc database đầy đủ (dùng khi cài mới)
wrangler.toml         Cấu hình Cloudflare (KHÔNG chứa bí mật)
```

## 5. Chạy thử ở máy

```
npm run cai-dat        # LẦN ĐẦU: tạo database D1 (nếu chưa có)
npm run nap-db-may     # nạp cấu trúc + tài khoản admin mẫu vào DB ở máy
npm run chay           # chạy thử → mở http://localhost:8787
```

Xem thêm các lệnh nạp module trong `package.json` (`nap-kho-may`, `nap-shopee-may`, `nap-tiktok-may`, `nap-hoso-may`…). Muốn có dữ liệu kho mẫu: `npm run nap-kho-mau-may`.

## 6. Sửa code + đẩy lên (làm chung không đè nhau)

```
git pull                       # TRƯỚC khi làm: lấy bản mới nhất
# ... sửa code ...
git add -A
git commit -m "mô tả ngắn thay đổi"
git push                       # đẩy lên GitHub
```

Người khác chỉ cần `git pull` là có bản của bạn. Git tự gộp; hiếm khi đụng nhau.

## 7. Deploy (đưa lên bản thật)

> ⚠️ **Mặc định CHỈ Sếp Ngọc deploy.** Bạn thường chỉ cần đẩy code lên GitHub, Sếp xem rồi mới đưa lên production.

Nếu bạn được cấp quyền Cloudflare:
```
npx wrangler login     # đăng nhập tài khoản Cloudflare được mời
npm run dua-len        # đưa code lên production
```

## 8. ⚠️ NHỮNG ĐIỀU TỐI QUAN TRỌNG (đọc kỹ kẻo hỏng bản thật)

1. **Bí mật KHÔNG BAO GIỜ để trong code/GitHub.** App Secret, khóa sàn… nằm trong *Cloudflare Secrets*. File `.env`, `.dev.vars`, `seed.sql` đã bị `.gitignore` che. Đừng commit bí mật.
2. **Cloudflare giới hạn PBKDF2 = 100.000 vòng.** Đặt `SO_VONG` trong `src/auth.js` cao hơn (vd 210.000) sẽ làm **HỎNG TOÀN BỘ đăng nhập trên production** (local vẫn chạy nên rất khó phát hiện). ĐỪNG tăng quá 100k.
3. **Database là DUY NHẤT trên mây — mọi người dùng chung dữ liệu thật.** Cẩn thận: `npm run nap-db` (không có `-may`) chạy lên bản THẬT và **XÓA + tạo lại bảng**. Chỉ dùng khi thật sự hiểu.
4. **Giờ giấc** ở module kho/đơn hoàn lưu theo **+7 (giờ Việt Nam)** để báo cáo khớp ngày.
5. **Đơn hoàn TikTok:** lấy `shop_cipher` qua `/authorization/**202407**/shops` — bản `202309` báo lỗi scope 105005. Ký chữ ký TikTok: `app_secret + path + (params sort key+value) + body + app_secret`, HMAC-SHA256 hex.

## 9. Cần giúp?

Hỏi **Sếp Ngọc**, hoặc mở thư mục dự án bằng **Claude Code** để AI hỗ trợ trực tiếp.
