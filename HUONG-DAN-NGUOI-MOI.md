# Hướng dẫn cho người mới — ERP Alpha Green Commerce

Chào mừng bạn vào dự án! File này giúp bạn cài đặt và bắt đầu làm việc trong ~15 phút.

## 1. Đây là hệ thống gì?

ERP nội bộ của **Công ty TNHH Alpha Green Commerce** (bán thực phẩm hữu cơ trên Shopee/TikTok).

- Chạy trên **Cloudflare Workers + D1** (database SQLite trên mây, không cần server riêng).
- Giao diện web thuần **HTML/CSS/JS** (không dùng framework nặng) — dễ đọc, dễ sửa.
- Đã là **PWA** (cài được lên điện thoại như app).

**Các module đang có:**

- **Kho** — sổ cái Xuất–Nhập–Tồn, xuất theo **FEFO** (hết hạn trước xuất trước).
- **Đơn hoàn** (Shopee + TikTok) theo luồng 3 chặng: **Vận hành sàn** (cửa vào, phân loại) → đẩy sang **Kho vận** (nhận hàng về) hoặc **Kế toán** (tra soát tiền hoàn / lập biên bản hàng hỏng).
- **Mục tiêu (MBOs)** — mục tiêu công ty → phòng ban theo quý, tự tính tiến độ.
- **Trạm Mục Tiêu** — giao việc rõ **đầu ra cụ thể**, có **người phối hợp**, gắn vào mục tiêu.
- **Chat nội bộ** — kênh chung toàn công ty + chat riêng từng người.
- **Vinh danh** + **Chuông thông báo** trong app.
- **Nhân sự** (có AI đọc ảnh CCCD để tạo hồ sơ) + **Danh bạ**.
- **Phân quyền theo vai trò** (Giám đốc, Phó Giám đốc, Kế toán trưởng, Quản lý kho, Nhân viên kho, HCNS, Vận hành sàn, CSKH…).

## 2. Cần cài gì trên máy

- **Git** — https://git-scm.com
- **Node.js** (bản LTS mới nhất) — https://nodejs.org
- *(Tùy chọn)* **Claude Code** — nếu muốn AI hỗ trợ viết code.
- *(Chỉ khi cần chạy DB/deploy tay)* Tài khoản **Cloudflare** — hỏi Sếp Ngọc để được mời vào. **Nhân viên bình thường KHÔNG cần** (xem mục 7 — deploy đã tự động).

## 3. Lấy code về + cài đặt

```
git clone https://github.com/ngocbtagc-a11y/erp-agc-noibo.git
cd erp-agc-noibo
npm install
```

## 4. Cấu trúc thư mục

```
src/                  Code máy chủ (Cloudflare Worker)
  index.js            Định tuyến toàn bộ API + cron (đồng bộ nền theo lịch)
  auth.js             Đăng nhập, phiên, băm mật khẩu
  mat-khau.js         Kiểm tra mật khẩu đặt (bản nhẹ cho web nội bộ)
  quyen.js            Phân quyền theo vai trò (nơi DUY NHẤT quyết ai xem gì)
  kho.js              Nghiệp vụ Kho (sổ cái Xuất-Nhập-Tồn, FEFO)
  shopee.js / tiktok.js   Kéo đơn hoàn + đơn hàng từ sàn về
  nhansu.js           Hồ sơ nhân sự mở rộng + AI đọc CCCD
public/               Giao diện (trình duyệt tải về được)
  index.html          Màn đăng nhập / đổi mật khẩu
  app.html            App chính (các tab)
  assets/js/app.js    Điều khiển giao diện
  assets/js/api.js    Lớp gọi API
  assets/css/style.css
  sw.js               Service worker (chỉ để cài PWA — KHÔNG cache, tránh kẹt bản)
  reset.html          Trang "gỡ kẹt": mở là tự dọn service worker + cache cũ
migrations/           Mỗi file SQL = thêm bảng/cột cho 1 module (chạy tay lên DB)
schema.sql            Cấu trúc database đầy đủ (dùng khi cài mới)
wrangler.toml         Cấu hình Cloudflare (KHÔNG chứa bí mật)
.github/workflows/deploy.yml   Tự động deploy khi đẩy lên nhánh main
```

## 5. Chạy thử ở máy

```
npm run cai-dat        # LẦN ĐẦU: tạo database D1 (nếu chưa có)
npm run nap-db-may     # nạp cấu trúc + tài khoản admin mẫu vào DB ở máy
npm run chay           # chạy thử → mở http://localhost:8787
```

Mỗi module có 1 lệnh nạp bảng riêng (đuôi `-may` = chạy ở máy). Xem đầy đủ trong
`package.json`: `nap-kho-may`, `nap-shopee-may`, `nap-tiktok-may`, `nap-hoso-may`,
`nap-doisoat-may`, `nap-donhang-may`, `nap-muctieu-may`… Muốn có dữ liệu kho mẫu:
`npm run nap-kho-mau-may`.

## 6. Sửa code + đẩy lên (làm chung không đè nhau)

```
git pull                       # TRƯỚC khi làm: lấy bản mới nhất
# ... sửa code ...
git add -A
git commit -m "mô tả ngắn thay đổi"
git push                       # đẩy lên GitHub nhánh main
```

Người khác chỉ cần `git pull` là có bản của bạn. Git tự gộp; hiếm khi đụng nhau.

> 💡 **Lưu ý:** đẩy lên `main` sẽ **tự deploy lên bản thật** (xem mục 7). Vì vậy hãy
> `git pull` + chạy thử ở máy cho chắc **trước khi** push.

## 7. Deploy (đưa lên bản thật) — GIỜ ĐÃ TỰ ĐỘNG

**Với nhân viên, "deploy" = chỉ cần `git push` lên nhánh `main`.** GitHub Actions
sẽ tự đưa code lên Cloudflare — **không cần cài wrangler, không cần khóa Cloudflare
trên máy bạn** (an toàn hơn). Xem tiến trình/kết quả ở tab **Actions** trên GitHub.

> ⚠️ **Chỉ có CODE là tự deploy. DATABASE thì KHÔNG.** Nếu thay đổi của bạn cần bảng/cột
> mới (thêm file trong `migrations/`), phải tự chạy lệnh nạp lên bản thật, ví dụ:
> `npm run nap-muctieu` (không có `-may` = chạy lên remote). Việc này cần quyền Cloudflare
> — nếu chưa có, nhờ Sếp Ngọc chạy.

Deploy tay (dự phòng, thường chỉ Sếp Ngọc dùng khi cần):
```
npx wrangler login     # đăng nhập tài khoản Cloudflare được mời
npm run dua-len        # đưa code lên production
```

## 8. ⚠️ NHỮNG ĐIỀU TỐI QUAN TRỌNG (đọc kỹ kẻo hỏng bản thật)

1. **Bí mật KHÔNG BAO GIỜ để trong code/GitHub.** App Secret, khóa sàn… nằm trong *Cloudflare Secrets*; khóa deploy nằm trong *GitHub Secrets* (`CLOUDFLARE_API_TOKEN`). File `.env`, `.dev.vars`, `seed.sql` đã bị `.gitignore` che. Đừng commit bí mật.
2. **Cloudflare giới hạn PBKDF2 = 100.000 vòng.** Đặt `SO_VONG` trong `src/auth.js` cao hơn (vd 210.000) sẽ làm **HỎNG TOÀN BỘ đăng nhập trên production** (local vẫn chạy nên rất khó phát hiện). ĐỪNG tăng quá 100k.
3. **Database là DUY NHẤT trên mây — mọi người dùng chung dữ liệu thật.** Cẩn thận: `npm run nap-db` (không có `-may`) chạy lên bản THẬT và **XÓA + tạo lại bảng**. Chỉ dùng khi thật sự hiểu.
4. **Ghi nhiều dòng vào D1 phải gộp lô (batch).** 1 lần Worker chạy bị giới hạn số lệnh gọi con — ghi từng dòng trong vòng lặp (vd đồng bộ vài trăm đơn) sẽ lỗi *"Too many API requests by single Worker invocation"*. Gom câu lệnh vào mảng rồi `env.DB.batch(...)` theo lô ~50.
5. **Service worker KHÔNG cache** (`public/sw.js`) — cố tình vậy để tránh kẹt "bản HTML mới + JS cũ". Nếu ai đó thấy app **kẹt/lệch/thiếu**, mở **`/reset.html`** một lần là tự dọn sạch bản cũ rồi vào lại. Đừng thêm cache vào service worker.
6. **Giờ giấc** ở các module lưu theo **+7 (giờ Việt Nam)** để báo cáo khớp ngày.
7. **Đơn hoàn TikTok:** lấy `shop_cipher` qua `/authorization/**202407**/shops` — bản `202309` báo lỗi scope 105005. Ký chữ ký TikTok: `app_secret + path + (params sort key+value) + body + app_secret`, HMAC-SHA256 hex.

## 9. Cần giúp?

Hỏi **Sếp Ngọc**, hoặc mở thư mục dự án bằng **Claude Code** để AI hỗ trợ trực tiếp.
