# ADR-0014 — Khung lưu trữ sao lưu theo năm/tháng, và nén thật khi đóng tháng

- **Ngày**: 2026-08-28
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc (khung lưu trữ) + GẠO (giữ đủ
  file ngày) + KHỈ ĐỘT (cách nén, sau khi đo)
- **Trạng thái**: ĐÃ QUYẾT
- **Thay thế**: [ADR-0013](ADR-0013-nhip-sao-luu-va-ngay-lam-viec.md) phần *"giữ 30
  ngày gần nhất"* — luật cuộn vòng bị **bỏ hẳn**
- **Liên quan**: [CTL-0022](../requests/CTL-0022-khung-luu-tru-sao-luu-theo-nam-thang.md) ·
  [ADR-0011](ADR-0011-kho-tai-lieu-tai-khoan-va-quyen-xem.md) · `src/gop-sao-luu.js`

---

## 1. Quyết định

**A. Khung lưu trữ trên Drive — đúng như Sếp mô tả**

```
Sao-luu-ERP-AGC/
├── 2026/
│   ├── 08/                    ← tháng đang chạy: để nguyên thư mục ngày,
│   │   ├── 2026-08-27/           mỗi ngày ~25 file .csv, bấm đúp là Excel mở
│   │   └── 2026-08-28/
│   ├── 2026-07.zip            ← tháng đã đóng: MỘT file, nén 7,4 lần
│   └── 2026-06.zip
├── 2025.zip                   ← hết năm: 12 file tháng gom thành một
└── BAN-THANG-CUA-SEP/         ← gói Telegram ngày 15 (ADR-0013, GIỮ NGUYÊN)
```

**B. BỎ HẲN luật xoá 30 bản cuộn vòng.** Không xoá gì nữa. Thư mục ngày chỉ bị
xoá **sau khi** đã gộp vào file tháng **và** đã đọc ngược cả file tháng từ Drive
về đối chiếu mã kiểm CRC32 từng byte.

**C. Giữ ĐỦ file ngày bên trong file tháng** — không rút gọn còn một bản cuối
tháng, dù cách đó tiết kiệm hơn 30 lần. (GẠO quyết, xem Mục 4.)

**D. Đóng tháng thì NÉN THẬT, không phải gộp suông** (KHỈ ĐỘT quyết sau khi đo,
xem Mục 3 — đây là chỗ khác với giả định ban đầu).

---

## 2. Vì sao khung của Sếp đúng hơn thiết kế cũ

Thiết kế cũ (CTL-0013, đã lên `main`): 30 bản ngày phẳng, bản thứ 31 **đè lên**
bản cũ nhất.

1. **Mất lịch sử.** Quá 30 ngày là không truy được. Luật kế toán bắt lưu chứng
   từ nhiều năm — 30 ngày không đủ để đối chiếu quý trước, năm trước.
2. **Khó tìm.** Muốn xem tháng 3 thì phải mò trong một đống file đặt tên theo ngày.

Khung năm/tháng giải cả hai: giữ được lịch sử dài, và **mở đúng thư mục tháng là thấy**.

---

## 3. ⚠️ SỐ ĐO BÁC MỘT GIẢ ĐỊNH: "gộp" KHÔNG lãi gì, "nén" mới lãi

Bản giao việc ước tính gộp 30 file ngày thành một file tháng sẽ nhỏ đi ~7 lần, và
bắt **đo lại thay vì tin**. Đo rồi (`npm run gop-thang-thu`, một bản ngày thật
17,93 MB / 102.985 dòng / 15 bảng):

| Cách làm | Một tháng | Một năm | Drive 12 GB dùng được |
|---|---|---|---|
| **Gộp suông (STORE, kiểu file .zip tháng đang dùng)** | 537,9 MB | 6,30 GB | **1,9 năm** ⚠️ |
| **Gộp CÓ NÉN (cách chốt ở đây)** | **72,7 MB** | **0,85 GB** | **14,1 năm** ✅ |

**Con số 7 lần là thật, nhưng nó đến từ phép NÉN chứ không phải phép GỘP.** Gộp
30 file lại mà không nén thì lãi đúng 0% — chỉ tiết kiệm được vài KB tiêu đề.
Nếu làm đúng chữ "gộp" mà bỏ chữ "nén" thì Drive đầy sau chưa đầy 2 năm, tức là
đổi một vấn đề (mất lịch sử) lấy một vấn đề khác (hết chỗ).

### Vì sao phải nén theo mẩu 256 KiB, không nén cả file

Cloudflare gói miễn phí cho **10 ms CPU mỗi lượt cron**. Đo được:

- Nén cả một bản ngày 17,9 MB trong một lượt: **156 ms** — gấp 15 lần trần.
- Bộ nén **không cất được trạng thái giữa hai lượt cron** (cửa sổ từ điển 32 KB
  nằm trong bộ nhớ isolate; isolate bị thu hồi là mất). Nên không thể "nén dở
  rồi mai nén tiếp".

Cách giải, và là cách **duy nhất** vừa nén được vừa chạy lại được:
**định dạng gzip cho phép nối nhiều thân gzip lại với nhau**, mọi công cụ giải nén
chuẩn bung ra thành một luồng liền mạch (RFC 1952 §2.2). Mỗi lượt cron nén trọn
vẹn **một** mẩu 256 KiB thành một thân gzip hoàn chỉnh rồi nối đuôi nhau.

Số đo (252 mẩu thật): trung vị **2,54 ms** · trung bình 2,36 ms · p95 3,17 ms ·
**xấu nhất 6,00 ms**. Cộng ~0,6 ms cho 5 việc cron chạy trước → **6,60 ms**, trong
trần 10 ms.

> ⚠️ **Tính trần theo mẩu XẤU NHẤT, không theo trung bình.** Đã thử 2 mẩu/lượt:
> 14,7 ms — vượt trần, bác. Cái đuôi 6 ms là thật và nó sẽ rơi vào một lượt cron
> nào đó; lấy trung bình mà tính thì đúng 99% số lượt và vỡ ở 1% còn lại.

Sức chở: một tháng cần **2.152 lượt** cron; cửa sổ ngày 15→28 có **3.432 lượt**
(việc gộp chạy 24/24 vì nó đọc Drive ghi Drive, gần như không đụng D1 — khác bản
ngày phải nằm trong 0h–8h vì nó đọc cả database). Dư 1,6 lần.

### Giá phải trả, nói thẳng

File trong gói tháng mang đuôi `.csv.gz` nên **không bấm đúp mở bằng Excel được
ngay**. Bù lại:

- **Tháng đang chạy vẫn để nguyên `.csv`** — thứ người ta hay mở xem nhất thì
  vẫn bấm đúp là xong, đúng ý Sếp.
- Gói tháng mang sẵn **`BUNG-NEN.mjs`**: chạy `node BUNG-NEN.mjs` là mọi
  `.csv.gz` trở lại `.csv`, và nó **đối chiếu mã kiểm từng file trong lúc bung**.
- Không cài Node thì 7-Zip bung được từng file.

---

## 4. GẠO BÁC phương án tiết kiệm hơn 30 lần

Có phương án giữ mỗi tháng cũ **một bản cuối tháng** thay vì đủ 30 ngày
(~30 MB/năm thay vì ~860 MB/năm). **Bác.**

Lý do: mất khả năng quay về **một ngày cụ thể**. Ai đó xoá nhầm hàng loạt ngày
17, hai tháng sau kế toán mới phát hiện → chỉ còn bản cuối tháng, mà bản đó **đã
chứa sẵn lỗi**. Cách giữ đủ ngày vẫn dùng được **~14 năm** trên chỗ trống hiện có.

**Tiết kiệm chỗ không thiếu để đổi lấy rủi ro mất dữ liệu là tối ưu sai chỗ.**

---

## 5. KIỂM TRƯỚC, XOÁ SAU — bốn giai đoạn, thứ tự cứng

Việc này xoá 30 thư mục ngày. Sai thứ tự là mất trắng một tháng, không có đường lùi.

| Giai đoạn | Làm gì | Hỏng thì sao |
|---|---|---|
| ① `liet_ke` | Lấy danh sách thư mục ngày của tháng | Dừng, chưa ghi gì |
| ② `gop` | Đọc từng byte về, nén, ghi vào file gộp. **Vừa đọc vừa tính lại CRC32 của byte GỐC và đối chiếu với KIEM-TRA.csv của chính ngày đó** | Lệch → DỪNG. Thư mục ngày đã hỏng sẵn; gộp vào rồi xoá là nhân cái hỏng lên |
| ③ `kiem` | **Đọc ngược TOÀN BỘ file gộp từ Drive về**, tính CRC32 lại từ đầu, so với con số cộng dồn lúc ghi. Không lấy mẫu, không tin lời Drive | Lệch → **TỪ CHỐI XOÁ**, báo động. Thư mục ngày giữ nguyên |
| ④ `xoa` | Tới đây mới được xoá thư mục ngày | — |

**Ca đối chứng (BH-16)** trong `npm run gop-thang-thu`, cả 5 kiểu hỏng đều bị bắt:
đổi một byte ở giữa / ở đuôi / ở đầu · cắt cụt 1 KB cuối (tải dở) · thêm rác vào
đuôi. Cộng ca nguồn hỏng sẵn và ca `BUNG-NEN.mjs` gặp file `.gz` bị sửa ruột.

**Đứt giữa chừng**: mọi giai đoạn chạy lại được — chỉ nhớ "đang ở tệp nào, byte
nào". Đã kiểm: chạy lại ra **đúng cỡ, đúng mã kiểm, không mục nào nhân đôi, không
thiếu ngày nào**.

---

## 6. Đóng năm — nói thật là gần như không tiết kiệm thêm

Ngày 15/01 gom 12 file tháng của năm trước thành `YYYY.zip`, **không nén lại**
(nén cái đã nén thì không nhỏ thêm được — nên chỉ chép thẳng, rẻ CPU hơn nhiều).

Giá trị là **gọn và tải một lần được cả năm**, không phải tiết kiệm chỗ. Câu này
được ghi thẳng vào `DOC-CACH-DOC.txt` của gói năm và vào tin Telegram báo Sếp, để
sau này không ai tưởng nhầm.

⚠️ Ca 15/01/2027: phải đóng **tháng 12/2026 trước**, rồi mới đóng **năm 2026** —
sai thứ tự thì gói năm thiếu mất tháng 12. Có ca thử riêng.

---

## 7. Cảnh báo dung lượng — hai mức

| Mức | Khi nào | Vì sao |
|---|---|---|
| Còn dưới **3 GB** | ADR-0011 A1, giữ nguyên | Sát nút, phải xử lý ngay |
| **Sẽ đầy trong 6 tháng** | MỚI | Mức trên chỉ kêu khi đã sát nút. Lúc đó Sếp còn mấy tuần để quyết mua thêm chỗ hay dọn bớt — cả hai đều cần thời gian và tiền |

Đà tăng đo bằng **số thật**: mỗi thứ Hai ghi dung lượng Drive vào
`sao_luu_dung_luong`, so mẫu mới nhất với mẫu cũ nhất cách ít nhất **28 ngày**.
Dưới 28 ngày thì **im lặng** — dự báo bậy vài lần là không ai tin cảnh báo nữa.

---

## 8. Thời điểm — vì sao phải làm NGAY

Sếp **chưa cấp quyền Google Drive** nên **chưa có bản nào trên Drive**. Sửa bây
giờ là **không phải chuyển đổi gì**. Để sau khi đã chạy thật thì phải viết thêm
một lượt di chuyển 30 thư mục sang khung mới — thêm mã, thêm rủi ro, không đổi
lại được gì.

---

## 9. Còn giữ nguyên

- Gói Telegram ngày 15 (ADR-0013) — **không đổi một chữ**.
- `zip.js` · `oCsv` · CRC32 · `KHOI-PHUC.mjs` nhúng — không đụng, đã PASS.
- `DOC-CACH-DOC.txt` + `SO-DO-DU-LIEU.txt` nay có trong **mọi** gói: gói ngày,
  gói tháng, gói năm.
