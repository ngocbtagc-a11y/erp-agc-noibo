# CTL-0022 — Khung lưu trữ sao lưu theo năm/tháng

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `PROCESS_IMPROVEMENT` — sửa thiết kế CTL-0013 đã lên hệ thống thật
- **Priority**: **P1** — sửa trước khi Sếp cấp quyền Google, không thì phải dọn lại
- **Risk**: LOW *(chỉ đổi cách sắp xếp thư mục, không đổi nội dung dữ liệu)*
- **Status**: `READY_FOR_BUILD` · **Next Owner**: KHỈ ĐỘT

---

## 1. Yêu cầu gốc

> *"tạo 1 thư mục lưu trữ trên driver, khung lưu trữ theo tháng, dữ liệu cập nhật
> theo ngày vào file tháng đó, 1 năm chia thành 12 tháng sau khi hết 1 năm thì nén lại"*

## 2. Vì sao Sếp đúng hơn thiết kế cũ

**Thiết kế cũ (đã lên hệ thống thật):** 30 bản ngày cuộn vòng — **bản thứ 31 đè
lên bản cũ nhất**. Cộng một gói tháng gửi Telegram.

**Hai chỗ hỏng:**

1. **Mất lịch sử.** Quá 30 ngày là không truy được. Kế toán cần đối chiếu số liệu
   của quý trước, của năm trước — **luật kế toán bắt lưu chứng từ nhiều năm**,
   30 ngày là không đủ.
2. **Khó tìm.** Muốn xem dữ liệu tháng 3 thì phải mò trong một đống file phẳng
   đặt tên theo ngày.

**Khung của Sếp giải cả hai:** giữ được lịch sử dài, và **mở đúng thư mục tháng
là thấy**.

## 3. Cấu trúc — như Sếp mô tả

```
Google Drive
└── Sao-luu-ERP-AGC/
    ├── 2026/
    │   ├── 08/                    ← tháng đang chạy, để nguyên file ngày
    │   │   ├── 2026-08-27.zip
    │   │   ├── 2026-08-28.zip
    │   │   └── …
    │   ├── 07/  →  2026-07.zip    ← tháng đã đóng: gộp lại thành MỘT file
    │   └── 06/  →  2026-06.zip
    └── 2025/  →  2025.zip         ← hết năm: gộp 12 file tháng thành một
```

**Không xoá gì cả.** Chỉ gộp lại cho gọn.

## 4. ⚠️ ĐIỀU CHỈNH GẠO ĐỀ XUẤT — nén theo THÁNG, không đợi hết năm

Sếp nói *"hết 1 năm thì nén lại"*. **Đợi tới cuối năm là hết chỗ trước khi kịp nén.**

Tính bằng số đo thật *(một bản ngày = **18,25 MB**, Drive còn ~12 GB)*:

| Cách làm | Một năm tốn | Drive đầy sau |
|---|---|---|
| Giữ file ngày cả năm, cuối năm mới nén | **6,7 GB** | **~1,8 năm** ⚠️ |
| **Đóng tháng nào nén tháng đó** | **~0,9 GB** | **~13 năm** ✅ |

Các bản sao lưu ngày **gần giống hệt nhau** nên nén rất tốt — ước khoảng **7 lần**.

→ **Đề xuất: hết mỗi tháng thì gộp ngay tháng đó.** Vẫn đúng tinh thần Sếp
*(khung theo tháng, năm chia 12)*, chỉ dời thời điểm nén sớm hơn.

→ **Cuối năm** thì gộp 12 file tháng vào một thư mục năm. Lưu ý thật thà: **gộp
lần hai gần như không tiết kiệm thêm** *(nén cái đã nén)* — giá trị là **gọn gàng**,
không phải tiết kiệm chỗ. Vẫn nên làm vì dễ tải cả năm về một lần.

**Khỉ Đột phải ĐO tỉ lệ nén thật** rồi báo số, đừng tin ước lượng 7 lần của Gạo.

## 5. Việc cần làm

1. **Đổi cấu trúc thư mục** trên Drive theo sơ đồ Mục 3.
2. **Bỏ luật xoá 30 bản cuộn vòng.** Không xoá gì nữa.
3. **Đóng tháng**: ngày 15 *(cùng lượt đã có — ADR-0013)*, gộp tháng trước thành
   `YYYY-MM.zip`, xoá thư mục ngày **sau khi đã kiểm mã CRC32 của file gộp**.
   ⚠️ **Kiểm trước, xoá sau.** Ngược lại là mất trắng tháng đó.
4. **Đóng năm**: ngày 15/01, gộp 12 file tháng của năm trước.
5. **Cảnh báo khi Drive còn dưới 3 GB** *(đã có, giữ nguyên)* + thêm **báo trước
   6 tháng** khi đà tăng cho thấy sắp đầy.
6. Bản gửi Telegram ngày 15 **giữ nguyên** — đó là bản Sếp cất riêng.
7. **Dữ liệu cũ**: chưa có bản nào trên Drive *(Sếp chưa cấp quyền)* → **không
   cần chuyển đổi gì**. Đây là lý do phải sửa **trước** khi Sếp cấp quyền.

## 6. Ràng buộc

- Chi phí **0**.
- **KHÔNG xoá thư mục ngày trước khi xác minh file gộp đọc được và đúng mã kiểm.**
- Gộp tháng/năm phải **chạy lại được** — đứt giữa chừng thì chạy lại không hỏng,
  không mất, không nhân đôi.
- Giữ nguyên phần đã PASS: `zip.js` · `oCsv` · CRC32 · script khôi phục nhúng.
- `DOC-CACH-DOC.txt` và `SO-DO-DU-LIEU.txt` **phải có trong mọi gói** — kể cả
  gói tháng và gói năm, không chỉ gói ngày.
- CPU mỗi lượt cron vẫn trong trần **10 ms** *(hiện 6,24 ms xấu nhất)*. Gộp tháng
  là việc nặng → **chia lô**, đừng làm một phát.

## 7. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Khung lưu trữ theo năm/tháng, hết năm thì nén |
| `NEW` | `READY_FOR_BUILD` | GẠO | 2026-08-27 | Thiết kế của Sếp **tốt hơn** bản đã lên: bỏ được luật xoá 30 bản cuộn vòng *(mất lịch sử, không đủ cho kế toán)* và dễ tra cứu. Một điều chỉnh: **nén theo tháng thay vì đợi hết năm** — đo được đợi hết năm thì Drive đầy sau ~1,8 năm, nén theo tháng thì ~13 năm |
