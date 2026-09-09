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

## ⛔ TRƯỚC KHI DEPLOY TAY: KIỂM NHÁNH — nếu không sẽ XOÁ việc của người khác

Worker `erp-agc` chỉ có **MỘT** bản chạy. `wrangler deploy` đẩy **nguyên trạng
thái thư mục bạn đang đứng**, nó KHÔNG gộp gì cả. Máy này có nhiều worktree cùng
một repo, mỗi worktree một nhánh — deploy từ nhánh chưa gộp là **xoá sạch** việc
của nhánh khác trên bản thật.

Ngày 08/09/2026 chuyện này đã xảy ra thật: nhánh văn phòng ảo chưa gộp lên main,
một lượt deploy từ nhánh nạp-file đã xoá toàn bộ văn phòng ảo khỏi bản thật —
`chibi.js` 404, `/api/van-phong/*` 404. Không ai biết cho tới khi Sếp mở ERP ở
máy công ty và không thấy văn phòng ảo đâu.

Vì vậy, trước MỌI lần deploy tay:

```
git fetch origin
git log --oneline HEAD..origin/main     # PHẢI TRỐNG
```

Còn dòng nào in ra là nhánh bạn **thiếu** việc của người khác. Gộp trước rồi mới
deploy:

```
git merge origin/main
```

Deploy xong, kiểm chéo bằng `curl` chính những đường của **CẢ HAI** mảng việc.
Nhớ: **404 = bị ghi đè** (đường không tồn tại), **401 = sống, chỉ cần đăng nhập**.

> Cách an toàn nhất vẫn là **Cách 1**: đẩy lên `main` rồi để GitHub tự deploy.
> Một cửa duy nhất thì không ai đè lên ai.

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

## ⛔ BƯỚC BẮT BUỘC TRƯỚC MỌI LẦN ĐẨY — CỔNG KHÓI

```
npm run cong-khoi              # phải in ✅ XANH, mã thoát 0
npm run cong-khoi-dienthoai    # lặp lại ở bề ngang 375px
```

**ĐỎ là KHÔNG ĐẨY.** Không có ngoại lệ "chỉ sửa CSS", không có ngoại lệ "đang
cứu hoả" — đẩy một bản vá hỏng lên trên bản đang hỏng là hỏng hai lần.

Cổng khói nạp `app.html` **thật** trong Chrome headless và **TRƯỢT nếu**:
- có **bất kỳ** dòng `console.error` hay ngoại lệ chưa bắt nào, **hoặc**
- một **nút cửa ngõ** (mỗi tab một nút chính) bấm vào **không có phản ứng**.

Vì sao phải có: ngày 29/08/2026 Sếp Ngọc báo *"ấn Chat ngay không được"* — chat
đã **chết hoàn toàn** trên bản thật nhiều tuần, qua **hai vòng soi** mà không
vòng nào thấy: không vòng nào nạp `app.js` trong trình duyệt, không ai bấm
thử, và `console.error` chưa từng bị tính là trượt. Chạy cổng khói lên đúng
bản `main` hôm đó: **1 dòng `console.error` · 4/10 nút cửa ngõ chết**.

Đừng tin cổng khói suông — bắt nó tự chứng minh:
```
npm run cong-khoi-tu-kiem      # chèn một lỗi console giả -> cổng khói PHẢI đỏ
```
Lệnh này chèn `console.error` vào **bản tạm** của `app.js` (không đụng repo).
Nó mà vẫn xanh thì cổng khói là **đồ trang trí**, phải sửa cổng trước đã.

Thêm tab mới thì thêm **một dòng** vào `CUA_NGO` trong `scripts/cong-khoi.mjs`.
⚠️ Cổng khói chạy trên **API giả**: thiếu một khoá trong ổ trả lời chung là
**đỏ oan**. Đỏ thì đọc dòng lỗi trước đã — sửa bàn đo hay sửa mã, đọc là biết.
`lint no-use-before-define` **không** thay được cổng này (nó không bắt được ca
`TBDay` vì chỗ dùng nằm trong hàm).

---

## Lưu ý quan trọng (cả 2 cách)

- **Khóa bí mật đang chạy** (partner_key Shopee, App Secret TikTok, token Telegram…) nằm sẵn trên Cloudflare, **deploy không đụng tới** — không cần khai lại mỗi lần deploy.
- **Đổi cấu trúc cơ sở dữ liệu KHÔNG tự chạy khi deploy.** Nếu thay đổi có kèm file trong thư mục `migrations/`, phải chạy tay 1 lần:
  ```
  npx wrangler d1 execute crm-agc --remote --file migrations/<tên-file>.sql
  ```
- 🔴 **MIGRATION CHẠY TRƯỚC DEPLOY, KHÔNG PHẢI SAU.** Đây là bài học đã trả giá
  (REV-0055 CAO-3): deploy mã mới trước rồi mới nạp CSDL thì câu `INSERT` liệt kê
  cột chưa có sẽ nổ **SAU KHI file đã nằm trên Google Drive** — mỗi lần người dùng
  bấm "Gửi lại" là thêm một file mồ côi không ai dọn được. Thứ tự đúng, mỗi lần:
  ```
  npm run migration-kiemtra        # xem còn file nào chưa chạy trên bản thật
  npm run <lệnh nạp của file đó>   # nạp CSDL — CHẠY TRƯỚC
  npm run dua-len                  # rồi mới deploy mã
  ```
  Ví dụ vòng hồ sơ (bộ) — PHASE 2, 09/09/2026:
  ```
  1) npm run migration-kiemtra     # phải thấy them-kho-tai-lieu-ho-so-bo.sql chưa chạy
  2) npm run nap-hosobo            # tạo bảng ho_so + 2 cột trên tai_lieu (bản thật)
  3) npm run migration-kiemtra     # phải báo "không còn migration nào chưa chạy"
  4) npm run dua-len               # bây giờ mới deploy
  ```
  Nạp lại lần hai báo `duplicate column name: ho_so_id` nghĩa là **đã chạy rồi**,
  không phải hỏng. Migration này **không chạy một câu `UPDATE` nào trên dữ liệu
  cũ** — mọi tài liệu đã có chạy tiếp bình thường với hai cột mới = `NULL`.
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

---

## Deploy xong thì góp ý tự chuyển sang "đã xong" — bật 2 bước, MỘT LẦN

Sếp Ngọc 28/08/2026: *"lỗi nào đã làm xong thì hiện đã xong đi chứ"*.
Trước bản này, quy trình là góp ý → duyệt → xây → soi → đẩy lên… **rồi hết**.
Không ai quay lại đổi trạng thái, nên người báo lỗi không bao giờ biết lỗi của
mình đã được sửa. Nay máy tự làm khâu cuối đó.

**Bước 1 — nạp cột mới vào DB thật** (chạy TRƯỚC khi đẩy code):

```bash
npm run nap-dalenthat
```

**Bước 2 — đặt cùng một khoá ở hai nơi** (tự nghĩ ra một chuỗi dài, ngẫu nhiên):

| Đặt ở đâu | Cách đặt |
|---|---|
| GitHub | Settings → Secrets and variables → Actions → New secret, tên `DEPLOY_CHOT_KHOA` |
| Cloudflare | `npx wrangler secret put DEPLOY_CHOT_KHOA` |

Hai bên phải **giống hệt nhau**. Thiếu hoặc lệch một bên thì **không góp ý nào
bị đổi** — deploy vẫn chạy bình thường, nhưng **Sếp nhận Telegram** báo đường
này đang hỏng (tối đa 1 tin/ngày) và tab Actions in `::warning::`.
Mỗi lượt deploy đều gõ cửa ERP một tiếng, **kể cả khi không commit nào nhắc mã
góp ý** — nên khoá lệch lộ ra ngay hôm nó lệch, không đợi tới hôm có góp ý
thật bị bỏ rơi (REV-0042 mục 3).

### Từ đó về sau: viết `Vá GY-…` vào thông điệp commit

```
git commit -m "Vá GY-12: gộp thông báo tin nhắn, không rung 5 lần nữa"
```

**Từ khoá đóng là đúng một chữ: `Vá`** (có dấu sắc), đặt **ở ĐẦU một dòng** —
dòng tiêu đề, hoặc một dòng bất kỳ trong thân commit. Không phân biệt hoa
thường. Không có cách viết thứ hai: `Fix`, `Close`, `Đóng`, `Sửa`, `Va` (không
dấu) đều **không** tính.

Một `Vá` phủ được **một dãy mã liền nhau**:

```
Vá GY-12 GY-13: bỏ LIMIT làm cắt mất việc public
```

Dãy **dừng ngay** khi gặp chữ khác, nên câu dưới đây chỉ đóng GY-7:

```
Vá GY-7, và GY-6 thì đo lại thấy hết lỗi
```

#### Vì sao phải có từ khoá — chuyện đã xảy ra thật

Bản trước chỉ đọc *"commit này có NHẮC TÊN mã nào không"* rồi coi đó là *"commit
này VÁ mã nào"*. Repo này có sẵn một commit chứng minh hai thứ đó khác nhau —
`f1ab6c9`, đang nằm trên `main`:

> tiêu đề: `GY-0007: Kho tài liệu chết vì TDZ — dời khai báo lên trước khối khởi động`
> thân: *"GY-0006 (chat máy tính): **ĐO LẠI THẤY ĐÃ HẾT LỖI, không vá gì.**"*

Bản trước **đóng GY-6** và nhắn người báo *"đã được sửa xong"* — trong khi
chính commit đó nói thẳng bằng tiếng Việt là **không ai đụng vào**. Đo trên 15
trạng thái mở: **7/15 bị đổi trạng thái, 12/15 bị nhắn**, chỉ vì mã bị nhắc
tên. Và trong 284 commit gần nhất của `main`, **29% commit nhắc mã là nhắc từ
2 mã trở lên** — đây là cách repo này viết commit, không phải ca hiếm.

**Nhắc tên mà không có `Vá` thì máy vẫn ghi nhận, chỉ là không đóng:** nó đính
commit đó làm bằng chứng và dựng cờ cho Sếp trên panel *"Đã lên hệ thống — chờ
xác nhận"*, nhưng **không đổi trạng thái và không nhắn người gửi**. Quên viết
`Vá` thì cùng lắm phiếu chậm được đóng vài hôm; đóng nhầm thì mất lòng tin của
người báo, và họ thôi báo.

Về khuôn mã: chấp nhận `GY-12`, `gy 12`, `GY_12`. **Không** chấp nhận `GY12`
(dính liền) — cố ý chặt tay để không bắt nhầm một con số trong câu tiếng Anh.

**Có `Vá` cũng chưa đủ.** Máy còn đọc **commit đó đổi những file nào**, và chỉ
tin khi có file trong `src/` · `public/` · `migrations/`. Một commit chỉ sửa
tài liệu (`docs/`, `*.md`) thì **không đóng gì cả** — thông điệp commit là lời
khai, danh sách file mới là bằng chứng.

**Commit gỡ (`Revert`) PHỦ QUYẾT.** Cùng một lượt đẩy mà vừa có bản vá vừa có
bản gỡ trên cùng một phiếu thì **bản gỡ thắng**: máy không đổi trạng thái,
không nhắn người báo, chỉ kêu cho Sếp — vì code trên hệ thống thật lúc đó
**không có** bản vá. Nguyên tắc: *nghi ngờ thì không đóng*.

### Máy làm gì với góp ý đó

Bảng dưới đây chỉ áp dụng khi commit có **`Vá GY-…`**. Nhắc tên không có `Vá`
thì mọi dòng đều thành: *không đổi trạng thái, không nhắn người gửi, chỉ đính
bằng chứng + dựng cờ cho Sếp*.

| Góp ý đang ở | Máy làm | Ai nhận tin |
|---|---|---|
| Sẵn sàng phát hành | → **Hoàn thành** | người gửi: *"đã sửa xong"* |
| Đang làm / kiểm tra / cần chỉnh sửa | → **Chờ nghiệm thu** | người gửi: *"đã sửa xong"* |
| **Đã duyệt — chờ phân tích** | → **Chờ nghiệm thu** | người gửi + Sếp (Telegram) |
| Mới / đang phân tích / chờ quyết định / bị chặn | **KHÔNG đổi gì** — dựng cờ chờ Sếp | người gửi: *"đã có bản sửa, đang chờ Sếp xác nhận"* + Sếp |
| Đã hoàn thành / huỷ / từ chối | không đụng | không ai (trừ commit `Revert` → kêu cho Sếp) |

Máy **không bao giờ** tự đưa một góp ý sang "đã xong" khi chưa ai nghiệm thu —
xa nhất nó đẩy tới **Chờ nghiệm thu**. Báo xong mà chưa xong là mất lòng tin
của người báo, họ sẽ thôi báo, và đó là mất mát lớn nhất.

Nhưng **im cũng là hỏng**: nỗi đau gốc là *người báo không biết*. Nên góp ý
chưa qua cổng vẫn được báo — báo đúng thứ máy biết chắc: *đã có bản sửa lên hệ
thống, đang chờ Sếp xác nhận*. Không bao giờ là "đã xong".

Cái Sếp cần bấm nằm ở panel **"Đã lên hệ thống — chờ xác nhận"** trên màn Góp
ý: *Đúng, đã xong* / *Không phải góp ý này*. Panel hiện **cả** những góp ý máy
đã tự đẩy đi, không chỉ những cái nó dựng cờ — nên **mọi thứ máy đụng vào đều
gỡ lại được**, và *Không phải góp ý này* trả trạng thái về **đúng chỗ cũ**.

### Góp ý không sửa bằng code thì đóng thế nào

Mở góp ý → khối **"Đóng mà không sửa code"** → chọn *đã trả lời bằng hướng dẫn*
hoặc *quyết định không làm*, viết một câu cho người gửi (bắt buộc, từ 20 ký tự —
họ đọc đúng câu đó). Trước bản này những góp ý loại này **kẹt**: "Hoàn thành"
đòi link Pull Request mà không có PR nào tồn tại.

### Đóng lùi những góp ý đã sửa xong TỪ TRƯỚC

Bản vá lên trước hôm nay thì commit không có `Vá GY-…` nào, máy không đọc ra
được. Dùng dụng cụ chạy tay — nó **in rõ sẽ đổi những gì rồi mới hỏi**:

```bash
node scripts/dong-lui-gop-y.mjs --remote --tim "thông báo khi có tin nhắn"
node scripts/dong-lui-gop-y.mjs --remote 12=7bf0e58 15=cc13f89        # xem trước
node scripts/dong-lui-gop-y.mjs --remote --ghi 12=7bf0e58 15=cc13f89  # ghi thật
```

Không có cờ `--ghi` thì nó **không ghi một chữ nào**. Có `--ghi` thì vẫn phải
gõ đúng hai chữ `ĐỒNG Ý`. Chạy xong nó in ra bằng chứng: đã đổi mấy dòng, có
dòng nào ngoài danh sách không (phải là 0).

> **REV-0064:** dụng cụ này trước đó **chưa từng chạy được một lần nào trên
> Windows** — `shell: true` cắt vụn câu SQL, chết ngay lệnh đầu ở cả ba chế độ
> (BH-55). Đã vá. Chạy thật lần đầu còn lộ tiếp một lỗi thứ hai: nó tin
> `meta.changes` mà `wrangler --local --json` không trả trường đó, nên nó bỏ
> qua dòng lịch sử và **tin báo cho người gửi** — đóng phiếu trong im lặng.
> Cũng đã vá. Cổng `npm run do-chot-gopy` nay **spawn thật** file này trên một
> D1 tạm, đủ bốn đường (tìm · xem trước · huỷ · ghi).

**Kiểm lại bất cứ lúc nào:** `npm run do-chot-gopy` — mỗi phép đo đều có ca đối
chứng, và bộ này chạy thật cả cửa HTTP của Worker lẫn script đóng lùi.
