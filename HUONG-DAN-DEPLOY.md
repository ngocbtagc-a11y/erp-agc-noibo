# Quy trình deploy ERP (dành cho nhân viên)

> "Deploy" = đưa thay đổi code lên **bản thật** mà mọi người đang dùng
> (`https://erp-agc.noiboagc.workers.dev`).

Có **2 cách**. Ưu tiên **Cách 1** vì đơn giản và an toàn nhất.

---

## Cách 1 — Tự động (KHUYẾN NGHỊ): đẩy code lên GitHub là xong

Sau khi đã thiết lập 1 lần (xem mục "Thiết lập" bên dưới), quy trình deploy chỉ còn:

1. Sửa code (tự làm hoặc nhờ AI Agent sửa).
2. Đẩy thay đổi lên nhánh `main` trên GitHub:
   ```
   git add -A
   git commit -m "Mô tả ngắn thay đổi"
   git push origin main
   ```
3. **Xong.** GitHub tự động chạy deploy. Vào repo trên GitHub → tab **Actions** để xem:
   - Dấu ✅ xanh = đã lên bản thật thành công.
   - Dấu ❌ đỏ = deploy lỗi, bấm vào xem dòng đỏ để biết lý do (chưa lên bản thật, bản cũ vẫn chạy an toàn).

**Ưu điểm:** nhân viên KHÔNG cần cài wrangler, KHÔNG cần khóa Cloudflare trên máy. Chỉ cần quyền đẩy code lên GitHub.

### Thiết lập 1 lần (Sếp Ngọc làm — vì có khóa bí mật)

1. **Tạo khóa Cloudflare (API Token):**
   - Vào Cloudflare → góc phải trên → **My Profile** → **API Tokens** → **Create Token**.
   - Chọn mẫu **"Edit Cloudflare Workers"** → Continue.
   - Mục Account Resources chọn tài khoản **Ngocbt.agc@gmail.com's Account**.
   - Create Token → **sao chép** chuỗi token (chỉ hiện 1 lần).
2. **Cất khóa vào GitHub (an toàn, không ai thấy):**
   - Vào repo `erp-agc-noibo` trên GitHub → **Settings** → **Secrets and variables** → **Actions**.
   - Bấm **New repository secret**:
     - Name: `CLOUDFLARE_API_TOKEN`
     - Secret: dán chuỗi token vừa sao chép → **Add secret**.
3. Xong. Từ lần đẩy code tiếp theo lên `main`, hệ thống tự deploy.

> ⚠️ Token này cho phép deploy — coi như chìa khóa. Chỉ dán vào ô GitHub Secret,
> **tuyệt đối không** dán vào chat, không viết vào file code.

---

## Cách 2 — Thủ công (dự phòng, khi cần deploy từ máy có cài sẵn)

Dùng khi Cách 1 chưa thiết lập, hoặc cần deploy gấp từ máy đã cấu hình. Người deploy cần **quyền vào tài khoản Cloudflare của công ty**.

1. Cài **Node.js** (nodejs.org) — 1 lần cho máy.
2. Lấy code về (nếu chưa có):
   ```
   git clone https://github.com/ngocbtagc-a11y/erp-agc-noibo.git
   cd erp-agc-noibo
   npm install
   ```
3. Đăng nhập Cloudflare (1 lần cho máy):
   ```
   npx wrangler login
   ```
   → đăng nhập bằng **ngocbt.agc@gmail.com**.
4. Deploy:
   ```
   npm run dua-len
   ```
   Thấy dòng `Deployed erp-agc` + link là đã lên bản thật.

---

## Lưu ý quan trọng (cả 2 cách)

- **Khóa bí mật đang chạy** (partner_key Shopee, App Secret TikTok, token Telegram…) nằm sẵn trên Cloudflare, **deploy không đụng tới** — không cần khai lại mỗi lần deploy.
- **Đổi cấu trúc cơ sở dữ liệu KHÔNG tự chạy khi deploy.** Nếu thay đổi có kèm file trong thư mục `migrations/`, phải chạy tay 1 lần:
  ```
  npx wrangler d1 execute crm-agc --remote --file migrations/<tên-file>.sql
  ```
- **Nếu deploy xong mà bị lỗi / muốn quay lại bản cũ (rollback):**
  - Nhanh nhất: Cloudflare → Workers & Pages → **erp-agc** → tab **Deployments** → chọn bản chạy tốt trước đó → **Rollback**.
  - Hoặc: `git revert` commit gây lỗi rồi `git push origin main` (Cách 1 sẽ tự deploy lại bản đã sửa).
- **Sau khi deploy, nhớ tải lại trang bằng `Ctrl + Shift + R`** (tải mới hoàn toàn) để chắc chắn trình duyệt lấy bản mới nhất, tránh lỗi hiển thị do bộ nhớ đệm cũ.

---

## Bật thông báo tin nhắn lên điện thoại (CTL-0014) — làm 3 bước, MỘT LẦN

Chi phí 0 đồng, không đăng ký dịch vụ nào.

```
1) npm run nap-daythongbao      # tạo bảng push_dangky + push_nhat_ky trên bản thật
2) npm run khoa-vapid           # tự sinh cặp khoá, in ra 2 lệnh cần chạy tiếp
3) npx wrangler secret put VAPID_KHOA_CONG_KHAI
   npx wrangler secret put VAPID_KHOA_BI_MAT
```

Bước 1 đi qua `scripts/chay-migration.mjs` nên **tự ghi vào `schema_migrations`**.
Đừng gọi thẳng `wrangler d1 execute --file`: nạp thì vẫn nạp, nhưng sổ không ghi
và `npm run migration-kiemtra` sẽ báo *"them-day-thongbao.sql chưa chạy"* mãi mãi
— đúng kiểu "sổ ghi lệch thực tế" (REV-0028 M4).

**Thiếu bước nào cũng KHÔNG còn im lặng nữa** (REV-0028 H3): 9h sáng giờ VN mỗi
ngày, cron sẵn có tự hỏi lại đủ ba bước — thiếu bảng, thiếu khoá, hay có khoá mà
**ký không được** (dán nhầm / hai khoá không cùng một cặp) — rồi bắn **Telegram**
nói rõ thiếu bước nào, chạy lệnh gì. Trước bản vá thì hỏng hoàn toàn im: giao
diện tự ẩn phần thông báo và không ai biết.

**Dán nhầm khoá KHÔNG làm mất đăng ký của nhân viên** (REV-0028 H1): máy chủ đẩy
trả 401/403/429 hoặc 5xx thì ERP **giữ nguyên** mọi đăng ký, chỉ dừng đẩy và kêu
lên Telegram. Chỉ 404/410 (đã gỡ app / xoá dữ liệu trang) mới bị dọn. Sửa khoá
xong là chạy lại ngay, **không ai phải bật lại trên máy mình**.

- Khoá **bí mật** chỉ dán vào lệnh `secret put`, **không lưu vào file nào**.
- Nhân viên phải tự bấm **"Bật thông báo"** trong cửa sổ chat. ERP cố ý KHÔNG
  hỏi quyền lúc vừa đăng nhập: hỏi sai lúc là bị bấm Chặn, mà **trình duyệt
  không cho hỏi lại lần thứ hai**.
- **iPhone**: chỉ nhận được khi đã mở bằng Safari → Chia sẻ → *Thêm vào màn hình
  chính*, rồi mở ERP từ biểu tượng đó. Chưa làm thì vẫn nghe tiếng kêu lúc đang
  mở ERP. Cửa sổ chat **tự hiện dải hướng dẫn này ngay khi mở**, và nút chuông
  đổi thành 🔕 kèm chấm cam — không phải bấm vào đâu mới thấy (REV-0028 H2).

Kiểm lại bất cứ lúc nào:
- `npm run tu-kiem-thongbao` — chính sách + mã hoá + xử lý hỏng, có ca đối chứng.
- `npm run do-trangthai-thongbao` — mọi trạng thái người dùng có nhìn thấy được không.
- `npm run do-nut-thongbao` — ngưỡng ngón tay 44px (mở trình duyệt để đọc số).

---

## Ai nên có quyền deploy?

Quyền đẩy code lên `main` = quyền đưa thay đổi lên bản thật cho cả công ty dùng.
Nên **giới hạn số người** có quyền này (Sếp Ngọc + tối đa 1–2 người tin cậy).
Luôn có thể **rollback 1 chạm** trên Cloudflare nếu có sự cố, nên rủi ro được kiểm soát.
