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
- Cửa sổ dòng lệnh ở thư mục mã nguồn ERP

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

- **User type**: chọn **External** → **CREATE**
- **App name**: `ERP Alpha Green Commerce`
- **User support email**: `alphagreen.commerce@gmail.com`
- **Developer contact information**: `alphagreen.commerce@gmail.com`
- Bấm **SAVE AND CONTINUE** qua các trang tiếp theo, không cần điền gì thêm.

### Bước 5. ⚠️ BƯỚC QUAN TRỌNG NHẤT — bấm "PUBLISH APP"

Vẫn ở trang **OAuth consent screen**, tìm nút **PUBLISH APP** → bấm →
xác nhận. Trạng thái phải đổi từ **Testing** thành **In production**.

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

Trong cửa sổ dòng lệnh, ở thư mục mã nguồn ERP, gõ 3 lệnh sau (thay `...` bằng
hai chuỗi đã chép ở Bước 7):

```
set GOOGLE_CLIENT_ID=...apps.googleusercontent.com
set GOOGLE_CLIENT_SECRET=GOCSPX-...
npm run lay-khoa-google
```

Trình duyệt tự mở. Đăng nhập `alphagreen.commerce@gmail.com` → bấm **Continue**
→ bấm **Continue** lần nữa để cho phép.

Xong, trình duyệt hiện *"✅ Xong"*. Quay lại cửa sổ dòng lệnh sẽ thấy một chuỗi
dài — đó là **refresh token**.

### Bước 10. Cất ba chuỗi vào két Cloudflare

Vẫn cửa sổ đó, chạy lần lượt 3 lệnh. Mỗi lệnh sẽ hỏi, dán chuỗi tương ứng vào
rồi Enter:

```
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
```

> Két Cloudflare là chỗ duy nhất được cất mấy chuỗi này. Chúng **không** nằm
> trong mã nguồn, **không** lên GitHub, và **không** có trong bản sao lưu.

### Bước 11. Tạo bảng ghi chép và đưa phần mềm lên

```
npm run nap-saoluu
npm run dua-len
```

### Bước 12. Xoá file Notepad ở Bước 7. Xong.

---

## Từ giờ chuyện gì xảy ra

| Khi nào | Máy làm gì |
|---|---|
| **Đêm nay, 0h–7h sáng** | Xuất toàn bộ dữ liệu ra file Excel, đẩy lên Drive, thư mục `ERP-AGC/SAO-LUU/<ngày>/` |
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
2. Chạy:
   ```
   npm run sao-luu-kiemtra -- "C:\Users\...\Downloads\2026-08-27"
   ```
   Phải hiện **✅ ĐẠT**.
3. Rồi cố tình xoá một file `.csv` trong thư mục đó và chạy lại. **Nó phải báo
   ❌ HỎNG.** Nếu vẫn báo ĐẠT thì cái đang hỏng là phép kiểm, không phải bản
   sao lưu — báo kỹ thuật ngay.
4. Mở thử vài file `.csv` bằng Excel: tên người phải có dấu đầy đủ, số điện
   thoại phải còn số 0 đứng đầu.

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
