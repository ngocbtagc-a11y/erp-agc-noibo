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

## Sếp Ngọc không đăng nhập được — làm gì?

Đây là **đường cứu**, không phải việc hằng ngày. Ba nấc, đi từ trên xuống.
Chi tiết và lý do: `docs/decisions/ADR-0015-chi-sep-ngoc-duyet-gop-y.md`.

**Nấc 1 — nhờ anh Phong khôi phục hộ (đường thường dùng).**
Anh Phong vào tab **Quản trị** → tài khoản của Sếp → **Đặt lại mật khẩu**.
Máy trả `200` nhưng **không hiện mật khẩu cho anh** — mật khẩu tạm được gửi
thẳng vào **chat Telegram riêng giữa Sếp và bot ERP**. Cả nhóm Telegram chung
sẽ thấy một dòng `[Bảo mật] ... vừa khôi phục tài khoản ...` (không kèm mật
khẩu), nên không ai làm lén được.

> Cài đặt **một lần** để nấc này chạy được: Sếp nhắn `/start` cho bot ERP, lấy
> chat id, rồi chạy `npx wrangler secret put TELEGRAM_CHAT_ID_SEP`.
> Chưa cài thì nút này trả **403** — cố ý: không có đường giao an toàn thì
> không mở cửa.
>
> ⚠️ Chat id này phải là **chat RIÊNG của Sếp với bot**, **KHÁC** hẳn
> `TELEGRAM_CHAT_ID` của nhóm chung. Dán nhầm chat id nhóm vào đây là **phát
> mật khẩu của Sếp cho cả công ty**. ERP tự chặn ca này (trả **409** kèm lời
> nhắc, không đụng mật khẩu), nhưng vẫn nên đối chiếu bằng mắt trước khi dán —
> chat riêng thường là số **dương**, chat nhóm là số **âm**.
>
> Bấm dồn không giải quyết được gì: mỗi lần bấm là **đá hết phiên** của Sếp,
> nên trong **5 phút** ERP chỉ cho khôi phục **một lần** (lần sau trả **429**
> và báo cho Sếp). Mật khẩu tạm vừa gửi vẫn còn dùng được — cứ dùng nó.
>
> Gặp **503** *"không kiểm được chốt nhịp"*: ERP không đọc được sổ
> `nhan_su_lich_su` nên **từ chối** thay vì phát mật khẩu mù. Mật khẩu hiện tại
> **không bị đụng**. Đây là lỗi kỹ thuật của DB — báo người phụ trách, hoặc đi
> thẳng **Nấc 2**.

**Nấc 2 — mất luôn Telegram: đặt lại mật khẩu ở tầng dữ liệu.**

```
node scripts/dat-lai-mat-khau.mjs <số điện thoại của Sếp> --remote
```

Script in rõ đang đổi cho ai rồi **bắt gõ lại số điện thoại** mới ghi. Nó chỉ
đổi **đúng một tài khoản**, **không xoá gì**, **không đụng bảng nào khác**.

> Màn hình có dòng `Đang hoạt động:`. Nếu là **KHÔNG (tài khoản đang bị khoá)**
> thì script **tự bật lại** (`kich_hoat = 1`) trong đúng câu lệnh đó và nói rõ
> trước khi hỏi xác nhận — vì đặt xong mật khẩu mà tài khoản vẫn khoá thì vẫn
> **không đăng nhập được**. Tài khoản đang hoạt động thì không đụng cột này.
>
> Script **hỏi bằng bàn phím**. Chạy trong CI/cron (không có bàn phím) thì nó
> **dừng ngay với mã thoát khác 0**, không ghi gì — không treo. Trả lời sẵn
> bằng **ống dẫn** cũng được: `echo <số> | node scripts/dat-lai-mat-khau.mjs <số> --remote`.
>
> Cần đã chạy **`npm install`** ở thư mục dự án (script gọi wrangler trong
> `node_modules`). Nếu thấy `Unknown arguments: t.id,, t.ten_dang_nhap,, …` thì
> đang chạy bản **trước REV-0035** — bản đó chưa bao giờ chạy được, cập nhật code
> rồi làm lại.

> ⚠️ **TUYỆT ĐỐI KHÔNG** dùng `scripts/tao-tai-khoan.mjs` thay cho việc này.
> File đó ghi `seed.sql` **xoá sạch dữ liệu cũ** — chạy trên bản thật là **mất
> công ty**. Nó chỉ dành cho lần dựng đầu tiên trên DB trắng.

**Nấc 3 — vào được rồi mà không ai duyệt được góp ý** (hay gặp sau khi khôi
phục một bản sao lưu chụp **trước** khi nạp `them-quyen-duyet-gopy.sql`):

```
npx wrangler d1 execute crm-agc --remote \
  --command "UPDATE tai_khoan SET duyet_gopy = 1, kich_hoat = 1 WHERE ten_dang_nhap = '<số của Sếp>'"
```

ERP tự phát hiện ca này và bắn Telegram trong vòng 5 phút, nên thường Sếp sẽ
được báo trước khi kịp thắc mắc.

---

## Ai nên có quyền deploy?

Quyền đẩy code lên `main` = quyền đưa thay đổi lên bản thật cho cả công ty dùng.
Nên **giới hạn số người** có quyền này (Sếp Ngọc + tối đa 1–2 người tin cậy).
Luôn có thể **rollback 1 chạm** trên Cloudflare nếu có sự cố, nên rủi ro được kiểm soát.
