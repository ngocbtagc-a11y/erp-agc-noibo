# REV-0011 — CTL-0013 Đợt 1 Phần B: Sao lưu dữ liệu

Hồ Ly · 2026-08-27 · `26c4e95` · `feature/ctl-0013-sao-luu-dot1` ·
đối chiếu SPEC-0005 Phần B · ADR-0011 · ADR-0013

## Kết luận: **FIX_REQUIRED** — 2 lỗi chặn, cộng lại vá dưới 15 dòng

Phần máy móc (zip, chia lô, tự chữa, giữ khoá) chắc hơn mong đợi. Chỗ hỏng nằm ở
**phép kiểm**: nó bắt được file mất, không bắt được file *đổi ruột*. Và bản sao
lưu tự nó mở một đường chạy mã trên máy Sếp khi bấm đúp vào Excel.

## 1. `src/zip.js` — TIN ĐƯỢC

Tôi dựng lại 5 file `.zip` bằng chính `zip.js`, đẩy nội dung theo mẩu 7 byte để
ép CRC32 phải cộng dồn qua nhiều lượt như cron thật, rồi giải nén bằng **ba bộ
mã khác nhau**: Info-ZIP `unzip`, .NET `Expand-Archive`, libarchive `bsdtar
3.8.4`. Cả ba OK trên: 3 file thường · **file rỗng** (2 file 0 byte) · **tên
tiếng Việt** `nhân_sự_lương_tháng_8.csv`, giải ra đúng dấu · **zip 1 file duy
nhất** · 1 MB một file · bản tháng thật 18,25 MB / 23 file. So thêm **SHA256
từng file sau giải nén** với nội dung gốc trên hai công cụ Windows: **khớp
byte-for-byte.** Header / data descriptor / central directory / EOCD đọc tay
đúng offset APPNOTE; cờ `0x0808` (bit 3 + bit 11 UTF-8) đúng cả hai nơi. Một hở
chưa chạm tới nhưng không có rào: `ghi()` viết số 4 byte bằng `>>>`, quá 4 GB
tràn im lặng — đo `cuoiTep(crc, 5_000_000_000)` ra **705.032.704**. (M4)

## 2. Ca đối chứng — 4/4 ĐÚNG, thiếu một ca sống còn

`npm run sao-luu-thu` chạy lại: 4/4 đúng như khai, số đo trùng khít (4,34 ms ·
18,25 MB · 103.135 dòng). Ca Gạo hỏi — **sửa đúng 1 ký tự giữa file, không đổi
kích thước** (`nhan_su.csv` byte 5606, `'2'` → `'3'`):

```
Nguyên vẹn → ĐẠT      Sau khi sửa → ĐẠT   ⇒ KHÔNG BẮT ĐƯỢC
```

**Lỗi chặn số 1.** `KIEM-TRA.csv` chỉ kê *tên · số dòng · số byte*. Đổi ruột mà
giữ nguyên cỡ thì phép kiểm mù hoàn toàn — đúng dạng hỏng của bit rot, của lỗi
ghi Drive, của người sửa lén. Vẫn báo "✅ ĐẠT" trong khi số lương đã sai. Vá:
thêm cột `crc32` vào `KIEM-TRA.csv`. Hàm `crc32()` **đã có sẵn**, và số đo của
chính Khỉ Đột cho biết bật CRC tốn thêm 0,56 ms/lô (4,34 → 4,90) — trong tầm.

## 3. CPU — không chặn phát hành, nhưng `LO_KHI_TRE = 2` là ảo tưởng

Trần 10 ms/lượt cron gói miễn phí là **có thật** (tài liệu Cloudflare: Free 10 ms
cho mọi loại trigger, Paid mới lên 30 giây) — ràng buộc gốc không phải bịa.
Nhưng 4,34 ms đo trên Node desktop, **không phải `workerd`**, và cùng lượt cron
còn 5 việc chạy TRƯỚC (`shopee.dongBoNen`, `tiktok.dongBoNen`,
`kiemTraCanhBaoHoan`, `kiemTraLyDoNghiemTrong`, `hoLyTuDongTriage`) mà **không có
số đo nào**, nên câu "còn dư 0,3 ms cho phần cron khác" không đứng vững. Không
chặn, vì hỏng ở đây **kêu chứ không im**: Cloudflare cắt lượt → chưa kịp
`luuPhien` → lượt sau làm lại đúng lô ấy; không xong trong đêm thì
`boPhienQuaHan` bắn Telegram đỏ. Nhưng để `LO_KHI_TRE = 1` tới khi có số đo
thật, và tuần đầu soi log Cloudflare tìm "Exceeded CPU". (M3)

## 4. Excel — CHƯA AI MỞ, kể cả tôi

Máy này **không có Excel, không có LibreOffice**; tôi chỉ kiểm được tới mức byte
y như Khỉ Đột (BOM đúng, tiếng Việt đúng dấu, `sdt`/`ma_nv`/`ma_sku` bọc
`"=""0900000000"""` đúng dạng). **Việc này Sếp phải tự làm.** (L4) Hai điều nói
thẳng: mẹo `="0..."` sống được vì Excel *chạy công thức*, mà **LibreOffice Calc
mặc định KHÔNG chạy công thức khi nhập CSV** → hiện nguyên chữ `="0900000000"`,
trong khi `DOC-CACH-DOC.txt` lại mời Sếp dùng LibreOffice. Và cột bọc `="0..."`
làm CSV hết là định dạng mở sạch — nạp sang phần mềm khác ra chuỗi chứ không ra
số, ngược chỗ với yêu cầu gốc "không khoá chân công cụ".

## 5. Ba chỗ lệch SPEC-0005 — chấp nhận cả ba

Cửa sổ 0h–8h thay 1h–4h · bỏ lượt đầu mỗi giờ · chọn bảng bằng loại trừ: cả ba
có số đo đỡ lưng, đều tốt hơn bản SPEC. Riêng **loại trừ** soi kỹ nhất vì nó tự
động kéo bảng mới vào. Quét toàn bộ 48 bảng trong `migrations/` + `schema.sql`:
**chỉ 2 bảng chứa khoá sàn** — `shopee_ket_noi` (`access_token`,
`refresh_token`) và `tiktok_ket_noi` (thêm `shop_cipher`). Cả 5 cột nằm trong
`COT_KHONG_SAO_LUU` **và** trúng lưới `MAU_TEN_COT_NGUY` — chặn hai lớp. Không
bảng nào khác giữ khoá. Đúng ADR-0013. Sót nhỏ: `sao_luu_ban` **không** nằm
trong `BANG_KHONG_SAO_LUU` trong khi 3 bảng anh em của nó thì có. (L1)
⚠️ Và `ADR-0013` **chưa được commit** — đang là file chưa theo dõi trong thư mục
làm việc, không có trên nhánh nào, trong khi `26c4e95` viện dẫn nó hơn 10 lần
làm căn cứ. Một lệnh `git clean` là mất quyết định của Sếp. (M1)

## 6. Bảo mật — **XÁC NHẬN SẠCH**

**Quét khoá cứng** (BH-03): `grep -rnE` các mẫu `AIza…`, `ya29.…`, `GOCSPX-…`,
`1//…`, `*.apps.googleusercontent.com`, `sk-…`, cộng mọi chuỗi literal ≥28 ký tự
base64, trên `src/sao-luu.js`, `src/kho-file.js`, `src/zip.js`, `scripts/*`,
migration và cả hai file tài liệu — **không có gì**. 3 secret Google đi qua
`wrangler secret` → `env.*`, **không bao giờ vào D1**, nên không thể lọt vào bản
sao lưu; không `console.log` nào chạm token; `upload_url` (capability ghi của
Google) chỉ nằm trong `sao_luu_phien`, mà bảng đó đã bị loại khỏi sao lưu.
`permissions`/`anyone`/`webViewLink` không xuất hiện trong `kho-file.js`; scope
`drive.file` hẹp nhất có thể; link Drive gửi Telegram chỉ mở được bằng tài khoản
công ty, id 33 ký tự không đoán. Có trong bản sao lưu (đúng, đã khai trong
`DOC-CACH-DOC.txt`): `tai_khoan.mat_khau_hash`, lương, CCCD — và file `.zip` gửi
Telegram **không đặt mật khẩu**, Telegram của Sếp là biên giới duy nhất.

### ⛔ Lỗi chặn số 2 — bản sao lưu tự mở đường chạy mã trên máy Sếp

`oCsv()` chỉ rào ô khi có dấu phẩy / nháy / xuống dòng. Ô bắt đầu bằng
`=` `+` `-` `@` đi thẳng ra file. Chạy thử:

```
"=1+1"                          → =1+1            (nguyên si)
"=HYPERLINK(""http://…""&A1,…)" → "=HYPERLINK(…)" (rào rồi vẫn là công thức)
```

Excel bỏ nháy rồi **chạy công thức**. Mà `ghi_chu`, `gop_y`, `tin_nhan_chat` là
ô nhân viên tự gõ: một người gõ `=HYPERLINK(...)` vào ô góp ý, ba tuần sau Sếp
bấm đúp `gop_y.csv` theo đúng hướng dẫn — là chạy. Đây là mặt trái của chính mẹo
`="0..."`. Vá: cột **không** thuộc `COT_BOC_CHUOI`, giá trị bắt đầu bằng
`= + - @` thì rào và chèn `'` đứng trước.

## 7. Lỗ tự vá — vá đúng, che được một trong ba ca

`guiMau()` hỏi lại Google bằng `Content-Range: bytes */*` rồi đọc header `Range`
— **đúng chuẩn resumable của Google, cách vá chính xác**; có chặn đệ quy
(`dangChua`), và Google nhận ÍT hơn dự kiến thì `throw` chứ không giả vờ xong.
Hai ca cùng họ chưa che (M2): **(a)** đứt sau khi Google chốt xong một file CSV,
trước `luuPhien` (`sao-luu.js:635-651`) — `chi_so_bang++` chưa kịp ghi → lượt sau
làm lại cả bảng, mở phiên tải MỚI → **Drive có hai file trùng tên**; tải về thành
`thong_bao (1).csv` → lúc phục hồi `kiemTraKeKhai` báo `thua_tep`, báo động giả
đúng lúc hoảng nhất (`hoanTat` bản ngày cũng vậy với `DOC-CACH-DOC.txt`).
**(b)** đứt giữa hai INSERT trong `taoPhien()` (`sao-luu.js:479-485`) —
`sao_luu_ban` có dòng, `sao_luu_phien` không → `coBan()` trả TRUE → **ngày đó
vĩnh viễn không có bản sao lưu**; lớp B 9h sáng bắt được nên không im lặng,
nhưng mất trắng một đêm.

## 8. Hướng dẫn 12 bước — **làm được, nhưng sẽ tắc ở Bước 9**

Văn phong tốt thật: không từ chuyên môn nào không giải thích, cảnh báo bẫy
"Testing → 7 ngày chết" đặt đúng chỗ và đủ to. **Không bước nào bắt Sếp dán khoá
vào chỗ không an toàn** — Bước 7 còn dặn thẳng "không dán vào khung chat với
Agent". Điểm này đạt. **Bước dễ sai nhất — Bước 9**: dạy
`set GOOGLE_CLIENT_ID=...`, cú pháp `cmd.exe`; máy này dùng PowerShell nên gõ
`set` là hỏng, mà hỏng kiểu không báo lỗi rõ ràng — phải viết
`$env:GOOGLE_CLIENT_ID = "..."`. Ba chỗ nữa: Bước 10 không nói phải
`wrangler login` trước · Bước 4–5 Google đã đổi *OAuth consent screen* thành
*Google Auth Platform* (Branding / Audience), tên nút có thể không còn khớp ·
Bước 12 dặn xoá Notepad nhưng quên **refresh token vừa in ra màn hình dòng
lệnh**. Giờ chạy thì hướng dẫn "0h–7h", code 0h–8h, `index.js` và SPEC-0005
"1h–4h" — bốn chỗ ba con số. (L3, L2)

## Bảng lỗi

**CHẶN** — B1 `sao-luu.js:222-249` + `keKhaiCsv:268` (kê khai không có mã kiểm) ·
B2 `sao-luu.js:137-158` `oCsv` (ô `= + - @` chạy như công thức Excel).
**Vừa, không chặn** — M1 `ADR-0013` chưa commit · M2 `sao-luu.js:479-485`,
`635-651`, `698-717` (3 ca chết-nửa-chừng) · M3 `sao-luu.js:67` `LO_KHI_TRE = 2`
chưa đo trên `workerd` · M4 `zip.js:40-42` (quá 4 GB tràn im lặng).
**Nhẹ** — L1 `sao-luu.js:94-99` thiếu `sao_luu_ban` · L2 giờ chạy lệch 4 nơi ·
L3 hướng dẫn Bước 9/10/12 · L4 chưa ai mở bằng Excel.

## Khuyến nghị: **KHÔNG NÊN ĐẨY** — vá B1 + B2 rồi đẩy ngay trong ngày

Không phải vì code yếu. Vì `KIEM-TRA.csv` là **định dạng**: đẩy hôm nay thì 30
bản ngày đầu tiên sinh ra vĩnh viễn không có mã kiểm, vá sau không cứu được
chúng. Hai lỗi cộng lại dưới 15 dòng. Đừng để qua đêm — đêm nay công ty vẫn đang
không có bản sao lưu nào.
