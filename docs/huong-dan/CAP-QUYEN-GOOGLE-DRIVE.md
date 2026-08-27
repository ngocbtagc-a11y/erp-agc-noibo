# Cấp quyền Google Drive cho ERP — làm một lần, xong là quên

> **Cho ai đọc:** Sếp Ngọc hoặc Sếp Phong. **Không cần biết kỹ thuật.**
> **Mất bao lâu:** khoảng 30–40 phút, làm một lần duy nhất.
> **Vì sao phải làm:** máy không tự cấp quyền cho chính nó được. Phải có người
> đăng nhập bằng tài khoản Google của công ty và bấm "Đồng ý". Đó là việc chỉ
> Sếp làm được — Agent bị cấm chạm vào thông tin đăng nhập.

**Chưa làm xong 12 bước này thì chưa có bản sao lưu nào.** Phần mềm đã cài sẵn,
nó chỉ đang đứng chờ chìa khoá.

---

## Chuẩn bị

Mở sẵn hai thứ:

- Trình duyệt Chrome, **đã đăng nhập `alphagreen.commerce@gmail.com`**
  (nếu đang đăng nhập tài khoản khác thì đăng xuất hết cho chắc)
- Một cửa sổ **PowerShell** mở sẵn ở thư mục mã nguồn ERP

> ⚠️ **PHẢI LÀ PowerShell**, không phải "Command Prompt" / `cmd`. Máy của Sếp
> mặc định mở PowerShell — bấm chuột phải vào nút Start → **Terminal** là đúng.
> Hai loại cửa sổ này gõ lệnh khác nhau ở Bước 9, và gõ nhầm thì **nó không báo
> lỗi gì cả**, chỉ lặng lẽ chạy sai. Cách nhận biết: dòng nhắc của PowerShell
> bắt đầu bằng `PS C:\…>`, còn `cmd` chỉ có `C:\…>`.

---

## PHẦN 1 — Xin phép Google (bước 1 → 8)

### Bước 1. Mở Google Cloud

Vào **https://console.cloud.google.com** — đăng nhập bằng
`alphagreen.commerce@gmail.com`.

Lần đầu vào nó hỏi đồng ý điều khoản, chọn Việt Nam, bấm đồng ý. **Miễn phí,
không hỏi thẻ.**

### Bước 2. Tạo một "dự án"

Góc trên bên trái, cạnh chữ *Google Cloud*, có ô chọn dự án → bấm vào →
**NEW PROJECT**.

- **Project name**: `ERP-AGC`
- Bấm **CREATE**, chờ khoảng 30 giây.

Xong nhớ bấm lại ô chọn dự án và **chọn đúng `ERP-AGC`** (nó hay để nguyên dự
án cũ).

### Bước 3. Bật Google Drive

Ô tìm kiếm trên cùng, gõ **Google Drive API** → bấm vào kết quả đầu →
bấm nút **ENABLE**. Chờ vài giây.

### Bước 4. Khai báo ứng dụng

Menu trái → **APIs & Services** → **OAuth consent screen**.

> Google đã đổi tên khu này thành **Google Auth Platform**, và tách ra hai mục
> **Branding** (tên ứng dụng, email liên hệ) và **Audience** (External /
> Internal, nút Publish). Nếu không thấy đúng chữ *OAuth consent screen* thì
> tìm **Google Auth Platform** — nội dung cần điền vẫn y hệt dưới đây, chỉ nằm
> ở hai trang thay vì một.

- **User type** (hoặc **Audience**): chọn **External** → **CREATE**
- **App name**: `ERP Alpha Green Commerce`
- **User support email**: `alphagreen.commerce@gmail.com`
- **Developer contact information**: `alphagreen.commerce@gmail.com`
- Bấm **SAVE AND CONTINUE** qua các trang tiếp theo, không cần điền gì thêm.

### Bước 5. ⚠️ BƯỚC QUAN TRỌNG NHẤT — bấm "PUBLISH APP"

Vẫn ở trang **OAuth consent screen** (giao diện mới: **Google Auth Platform** →
**Audience**), tìm nút **PUBLISH APP** → bấm → xác nhận. Trạng thái phải đổi từ
**Testing** thành **In production**.

> **Nếu bỏ qua bước này thì đúng 7 ngày sau chìa khoá tự hết hạn, sao lưu chết,
> và KHÔNG AI ĐƯỢC BÁO GÌ CẢ.** Đây là cái bẫy nguy hiểm nhất trong cả quy
> trình, vì mọi thứ chạy tốt suốt một tuần rồi mới im lặng chết.
>
> Google **không** bắt thẩm định gì cả — ERP chỉ xin quyền hẹp nhất, thuộc loại
> Google xếp là "không nhạy cảm". Bấm là xong.

Nếu Google hiện cảnh báo "unverified app", cứ tiếp tục — đó là bình thường với
ứng dụng nội bộ chỉ mình công ty dùng.

### Bước 6. Tạo chìa khoá

Menu trái → **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**.

- **Application type**: chọn **Web application**
- **Name**: `ERP-AGC Worker`
- Kéo xuống mục **Authorized redirect URIs** → bấm **+ ADD URI** → dán đúng
  dòng này (chép nguyên, đừng gõ tay):

  ```
  http://localhost:8731/xong
  ```

- Bấm **CREATE**.

### Bước 7. Chép hai chuỗi ra

Google hiện một bảng có hai chuỗi:

- **Client ID** — dạng `1234-abcd.apps.googleusercontent.com`
- **Client secret** — dạng `GOCSPX-...`

Bấm nút chép của từng chuỗi, dán tạm vào Notepad.

> ⚠️ Hai chuỗi này là **chìa khoá nhà**. Không gửi Zalo, không dán vào khung
> chat với Agent, không lưu vào thư mục mã nguồn. Lát nữa cất vào két xong thì
> **xoá file Notepad đi**.

### Bước 8. Bật xác thực 2 lớp cho tài khoản Google

Vào **https://myaccount.google.com/security** → **Xác minh 2 bước** → bật.

> **Bắt buộc, không phải khuyến nghị** (ADR-0011 A1). Toàn bộ giấy tờ, lương và
> căn cước nhân viên sẽ nằm trong Drive của tài khoản này. Ai đăng nhập được là
> đọc được hết.

Và chốt luôn: **chỉ hai Sếp giữ mật khẩu tài khoản này.** Nhân viên không cần —
họ vào bằng ERP.

---

## PHẦN 2 — Trao chìa khoá cho phần mềm (bước 9 → 12)

### Bước 9. Chạy lệnh lấy khoá

Trong cửa sổ **PowerShell**, ở thư mục mã nguồn ERP, gõ 3 lệnh sau (thay `...`
bằng hai chuỗi đã chép ở Bước 7 — **giữ nguyên dấu nháy kép**):

```powershell
$env:GOOGLE_CLIENT_ID = "...apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET = "GOCSPX-..."
npm run lay-khoa-google
```

> ⚠️ Nếu thấy hướng dẫn nào (kể cả bản cũ của chính file này) viết
> `set GOOGLE_CLIENT_ID=...` thì **đừng gõ theo** — đó là kiểu của `cmd`, gõ
> trong PowerShell nó **không báo lỗi** mà chỉ im lặng không đặt được gì, rồi
> lệnh sau báo "thiếu khoá" mà không ai hiểu vì sao.

Kiểm nhanh xem đã đặt đúng chưa (phải hiện lại đúng Client ID, không phải dòng
trống):

```powershell
echo $env:GOOGLE_CLIENT_ID
```

Trình duyệt tự mở. Đăng nhập `alphagreen.commerce@gmail.com` → bấm **Continue**
→ bấm **Continue** lần nữa để cho phép.

Xong, trình duyệt hiện *"✅ Xong"*. Quay lại cửa sổ PowerShell sẽ thấy một chuỗi
dài — đó là **refresh token**.

### Bước 10. Cất ba chuỗi vào két Cloudflare

**Đăng nhập Cloudflare trước** (lần đầu sẽ mở trình duyệt để bấm đồng ý; nếu đã
đăng nhập rồi thì nó báo luôn là xong):

```powershell
npx wrangler login
```

Rồi vẫn cửa sổ đó, chạy lần lượt 3 lệnh. Mỗi lệnh sẽ hỏi, dán chuỗi tương ứng
vào rồi Enter:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
```

> Két Cloudflare là chỗ duy nhất được cất mấy chuỗi này. Chúng **không** nằm
> trong mã nguồn, **không** lên GitHub, và **không** có trong bản sao lưu.

### Bước 11. Tạo bảng ghi chép và đưa phần mềm lên

```powershell
npm run nap-saoluu
npm run dua-len
```

### Bước 12. Dọn sạch dấu vết của chìa khoá

Ba việc, làm đủ cả ba:

1. **Xoá file Notepad** đã dán ở Bước 7 (xoá luôn trong Thùng rác).
2. **Xoá chữ trên màn hình PowerShell** — refresh token ở Bước 9 vừa được *in
   ra màn hình*, nó còn nằm nguyên đó cuộn lên là đọc được:

   ```powershell
   Clear-Host
   ```

   Chắc nhất: **đóng hẳn cửa sổ PowerShell đó đi**. Đóng là mất sạch cả phần
   cuộn lẫn hai biến `$env:` vừa đặt.
3. Nếu có lỡ dán chuỗi nào vào Zalo/chat để "lưu tạm" — **thu hồi ngay**: vào
   lại Google Cloud → **Credentials**, xoá chìa khoá cũ và làm lại Bước 6–10.

Xong.

---

## Từ giờ chuyện gì xảy ra

| Khi nào | Máy làm gì |
|---|---|
| **Đêm nay, 0h–8h sáng** | Xuất toàn bộ dữ liệu ra file Excel, đẩy lên Drive, thư mục `ERP-AGC/SAO-LUU/<ngày>/` |
| **9h sáng mỗi ngày** | Tự hỏi *"hôm qua có bản sao lưu không?"* — không có thì **nhắn Telegram báo động đỏ** |
| **Mỗi ngày** | Giữ 30 bản gần nhất, tự xoá bản cũ hơn |
| **Mùng 1 hằng tháng** | Gói cả tháng thành một file `.zip`, **nhắn Telegram cho Sếp kèm đường dẫn tải** |
| **Thứ Hai hằng tuần** | Nếu Drive còn dưới 3 GB thì nhắn nhắc dọn |

**Sếp không phải làm gì thêm.** Trừ đúng một việc mỗi tháng: khi Telegram báo
có bản `.zip`, **tải về và chép ra ổ cứng rời**.

> Vì sao phải chép ra ngoài: bản chạy hằng đêm nằm trên Drive công ty. Mất tài
> khoản Google là mất luôn cả kho tài liệu lẫn bản sao lưu. Bản `.zip` Sếp tự
> giữ là thứ duy nhất nằm ngoài mọi công cụ.

---

## Mỗi quý một lần — kiểm xem bản sao lưu có thật không

Bản sao lưu chưa từng thử mở lại thì chưa chắc là bản sao lưu. Ba tháng một
lần, làm 3 phút:

1. Vào Drive, tải một thư mục `SAO-LUU/<ngày>` bất kỳ về máy, giải nén.
2. Chạy trong PowerShell:
   ```powershell
   npm run sao-luu-kiemtra -- "C:\Users\...\Downloads\2026-08-27"
   ```
   Phải hiện **✅ ĐẠT**.
3. **Hai phép thử ngược** — bắt máy chứng minh là nó thật sự kiểm, chứ không
   phải lúc nào cũng gật:
   ```powershell
   npm run sao-luu-kiemtra -- "C:\Users\...\Downloads\2026-08-27" --bo-file=nhan_su.csv
   npm run sao-luu-kiemtra -- "C:\Users\...\Downloads\2026-08-27" --sua-byte=nhan_su.csv
   ```
   Lệnh đầu giả vờ **mất một file**. Lệnh sau giả vờ có ai đó **sửa đúng một ký
   tự giữa file mà không đổi kích thước** — dạng hỏng khó thấy nhất, số dòng và
   số byte vẫn khớp y nguyên. **Cả hai đều PHẢI báo ❌ HỎNG.** (Hai lệnh này
   chỉ giả lập trong bộ nhớ, không đụng vào file thật của Sếp.)

   Nếu có lệnh nào vẫn báo ĐẠT thì cái đang hỏng là **phép kiểm**, không phải
   bản sao lưu — báo kỹ thuật ngay, và đừng tin kết quả ✅ nào nữa cho tới khi
   sửa xong.
4. Mở thử vài file `.csv` bằng Excel: tên người phải có dấu đầy đủ, số điện
   thoại phải còn số 0 đứng đầu. Ô ghi chú nào thấy có **một dấu nháy đơn `'`
   đứng ở đầu** là bình thường — đó là cái chặn để Excel không chạy thứ nhân
   viên gõ vào ô đó (xem `DOC-CACH-DOC.txt` trong bản sao lưu).

---

## Khi có trục trặc

| Telegram báo | Nghĩa là gì | Làm gì |
|---|---|---|
| 🔴 *KHÔNG CÓ BẢN SAO LƯU CỦA NGÀY…* | Đêm qua máy không chạy, hoặc chìa khoá hết hạn | Kiểm lại **Bước 5** đã bấm PUBLISH APP chưa. Chưa thì bấm rồi làm lại **Bước 9–10** |
| 🔴 *SAO LƯU HỎNG* | Chạy được nửa chừng thì lỗi | Xem dòng lỗi trong tin nhắn, báo kỹ thuật |
| 🔴 *KHÔNG CHẠY XONG TRONG ĐÊM* | Dữ liệu đã lớn hơn sức của gói miễn phí | Báo kỹ thuật — cần nâng gói Cloudflare hoặc đổi cách sao lưu |
| ⚠️ *GOOGLE DRIVE SẮP ĐẦY* | Còn dưới 3 GB | Dọn thùng rác Gmail, dọn Google Photos, xoá bản sao lưu cũ hơn 2 năm |

**Nếu 6 tháng liền không chạy sao lưu rồi mới bật lại:** chìa khoá tự hết hạn
theo quy định của Google. Làm lại **Bước 9–10** là xong.
