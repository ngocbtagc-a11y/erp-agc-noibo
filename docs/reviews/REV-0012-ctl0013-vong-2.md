# REV-0012 — CTL-0013 sao lưu, vòng 2

**Người soi:** Hồ Ly (Review Gate) · **Ngày:** 2026-08-27
**Đối tượng:** commit `218f036`, nhánh `feature/ctl-0013-sao-luu-dot1`
**Bản chặn vòng 1:** `docs/reviews/REV-0011-ctl0013-sao-luu.md`
**Kết luận:** ✅ **PASS — NÊN ĐẨY.** 4 lỗi nhỏ, không lỗi nào chặn.

Vòng 1 đã PASS và không soi lại: `src/zip.js` (phần CRC32/ZIP gốc), bản sao lưu
không lọt khoá sàn, không hardcode khoá. M1 đã xong.

---

## 1. ⚠️ B2 — HOÀN NGUYÊN DỮ LIỆU: **KHỚP TỪNG BYTE**

Hồ Ly **tự đo lại bằng bộ ca độc lập**, không dùng bộ ca của Khỉ Đột:
`scratchpad/ho-ly-vong.mjs` — gốc → `oCsv` → `phanTichCsv` → `docO` → so hex
từng byte. **59/59 ca đạt, 0 sai.** Chạy lại bộ 15 ca của Khỉ Đột: 15/15 đạt.

Các ca độc được yêu cầu — **tất cả đều khớp từng byte**:

| Ca độc | Gốc (hex) | Trong CSV | Về (hex) |
|---|---|---|---|
| chỉ một dấu `'` | `27` | `22 27 27 22` | `27` ✅ |
| `''` | `27 27` | `22 27 27 27 22` | `27 27` ✅ |
| `'''` | `27 27 27` | 5 byte trong nháy | `27 27 27` ✅ |
| chuỗi rỗng | `` | `` (rỗng) | `` ✅ |
| `'` + xuống dòng + phẩy + nháy kép | 37 byte | rào `''`, `""` nhân đôi | 37 byte ✅ |
| tiếng Việt có dấu bắt đầu bằng `=` | 51 byte | rào `'`, giữ `\n` trong nháy | 51 byte ✅ |
| chuỗi gốc đúng là `="0123"` | `3d 22 30…` | `"'=""0123"""` | `3d 22 30…` ✅ |
| `'="0123"` (nháy + mẹo) | `27 3d 22…` | `"''=""0123"""` | `27 3d 22…` ✅ |
| emoji + dấu tiếng Việt | 4-byte UTF-8 | nguyên | ✅ |
| Tab / `\n` / `\r` đứng đầu | `09/0a/0d` | rào `'`, bọc nháy | ✅ |

**Vòng tròn cả bảng** (4 dòng × 5 cột, trộn NULL + công thức + xuống dòng):
`demDongCsv` = 4 (đúng), 20/20 ô về đúng từng byte, tiêu đề về đúng tên cột.

**Cột `="0…"` (`sdt`/`ma_nv`/`ma_sku`) vẫn giữ số 0 đầu:** đo lại —
`0987654321` → `"=""0987654321"""` → về `0987654321` ✅; `007` ✅; `00` ✅;
`NV001` (không khớp `^0\d+$`) đi thẳng, không mất gì ✅. `sdt` gốc là `'0912`
hoặc `=0987` rơi đúng vào luật rào `'`, không nhập nhằng ✅.

Không có nhập nhằng nào giữa hai luật: mọi giá trị bắt đầu bằng `=` đều bị luật
① rào trước, nên luật ② (`^="(0\d+)"$`) chỉ bắt đúng ô do chính ta sinh ra.

**CRC32 cộng dồn qua nhiều lô (chỗ dễ sai nhất, chưa ai soi):** Hồ Ly đo riêng —
`crc32(lô2, crc32(lô1,0)) === crc32(lô1+lô2, 0)` ✅, kể cả khi cắt **giữa một ký
tự UTF-8 nhiều byte** ✅. `themNoiDung` đặt `muc_crc=0` **trước** khi nạp BOM +
tiêu đề, nên CRC phủ đúng từng byte có trên đĩa, khớp với `kiem-tra-ban-sao-luu`
đọc byte thô. Xác nhận bằng bản sao lưu giả dựng tay → chấm ✅ ĐẠT.

### L1 (thấp, không chặn) — NULL và chuỗi rỗng KHÔNG phân biệt được
`oCsv(null)` và `oCsv('')` cùng ra `''`. Phục hồi xong, ô vốn `NULL` thành `''`
và ngược lại. **Không phải lỗi mất dữ liệu**, nhưng nếu sau này nạp ngược vào D1
mà cột có `NOT NULL` / ràng buộc khác nhau thì lệch. Nên ghi một dòng vào
`DOC-CACH-DOC.txt`: *"ô trống trong file có thể là NULL hoặc chuỗi rỗng"*.

---

## 2. B1 — MÃ KIỂM CRC32: **ĐẠT**

Hồ Ly dựng bản sao lưu giả rồi tự chạy `scripts/kiem-tra-ban-sao-luu.mjs`:

| Ca | Kết quả |
|---|---|
| bản nguyên vẹn | ✅ ĐẠT |
| **sửa 1 byte, giữ nguyên cỡ và số dòng** | ❌ HỎNG — `lech_ma_kiem` ✅ **BẮT ĐƯỢC** |
| bỏ hẳn 1 file | ❌ HỎNG — `thieu_tep` ✅ |
| **hoán vị 2 byte kề nhau** (cùng cỡ, cùng số dòng, cùng tổng byte) | ❌ HỎNG — `lech_ma_kiem` ✅ **BẮT ĐƯỢC** |
| kê khai có cột `crc32` nhưng **để rỗng** | ❌ HỎNG — `thieu_ma_kiem` ✅ |
| kê khai **đời cũ, thiếu hẳn cột `crc32`** | ❌ HỎNG — nhưng **báo sai loại lỗi**, xem L2 |

CRC32 nhạy với thứ tự byte (nó là phép chia đa thức, không phải phép cộng) —
đã chứng minh bằng ca hoán vị, không suy đoán.

### L2 (thấp, không chặn) — kê khai đời cũ báo nhầm `lech_ma_kiem`
`scripts/kiem-tra-ban-sao-luu.mjs:52` — với kê khai 4 cột cũ
(`bang,so_dong,co_byte,ten_tep`), `crc32Ke` nhận nhầm giá trị `"nhan_su.csv"`,
`Number(...)>>>0` ra **0**, nên báo *"kê khai crc32 0, thật …— RUỘT ĐÃ KHÁC"*
thay vì `thieu_ma_kiem`. **Vẫn báo hỏng, vẫn chặn** — chỉ là câu chữ dẫn người
kỹ thuật đi sai hướng (tưởng file hỏng, thật ra là kê khai đời cũ). Sửa 1 dòng:
kiểm số cột hoặc `Number.isFinite`.

---

## 3. `donTepTrungTen()` — **KHÔNG xoá nhầm bản tốt**

Ba lớp chặn, đã lần từng lớp:

1. **Bản ngày nằm trong thư mục riêng từng ngày** (`SAO-LUU/<ngày>`,
   `src/sao-luu.js:618`). Truy vấn có `'<thuMucId>' in parents`, nên
   `nhan_su.csv` của hôm qua **nằm thư mục khác, không bị đụng tới**.
2. **Bản tháng dùng chung một thư mục** nhưng tên file gắn tháng
   (`sao-luu-AGC-2026-08.zip`), mà truy vấn khớp **tên chính xác** → tháng khác
   không trúng. Và `coBan()` trả `true` khi `trang_thai='xong'`, nên bản tháng
   **đã xong thì không bao giờ được dựng lại** → không có đường xoá nó.
3. **Scope `drive.file`** — ERP chỉ nhìn thấy file do chính ERP tạo. Kể cả có
   sai truy vấn thì cũng **không chạm được vào file của Sếp**.

**Câu "hỏi không được thì bỏ qua chứ không chặn sao lưu": ĐÚNG MỘT NỬA.**

### M1 (trung bình, KHÔNG chặn phát hành) — xoá hỏng thì CHẾT cả đêm
`src/kho-file.js:321-327` — lệnh **hỏi** hỏng thì `return 0` êm (đúng như khai).
Nhưng lệnh **xoá** ở dòng 327 gọi `xoaFile()`, mà `xoaFile` **`throw`** với mọi
mã lỗi khác 404 (`kho-file.js:338`). Cú `throw` này chạy lên `motLo` →
`baoHong` → `trang_thai='hong'` → `coBan()` thấy `'hong'` nên **ngày đó vĩnh
viễn không có bản sao lưu**, chỉ vì một phép **dọn dẹp** thất bại.
→ Đề nghị bọc `try/catch` quanh vòng `xoaFile` và chỉ `console.error`, đúng
tinh thần câu chú thích ngay bên trên nó. Xác suất thấp (ta sở hữu file, scope
hẹp) nên **không chặn đẩy**, nhưng nên vá trong đợt sau.

*Nhỏ:* `pageSize=20`, không phân trang — trên 20 bản sót thì dọn không hết. Chỉ
là dọn dẹp nên bỏ qua được.

---

## 4. CPU — **KHÔNG chặn phát hành**, nhưng lập luận có chỗ sai

Hồ Ly chạy `npm run sao-luu-thu` **4 lần** trên bản `218f036` sạch:

| Lần | Có CRC32 (xấu nhất) | Không CRC32 (trung vị) | Giá của CRC32 |
|---|---|---|---|
| 1 (nguội) | 5,64 ms | 4,44 ms | **+1,13 ms** |
| 2 | 5,03 ms | 4,31 ms | +0,58 ms |
| 3 | 5,11 ms | 4,37 ms | +0,48 ms |
| 4 | 5,18 ms | 4,42 ms | +0,45 ms |

**Con số 5,60 ms xấu nhất là thật** — Hồ Ly đo được 5,64 ms, tái lập được.
Trần 10 ms không bị chạm ngay cả lần nguội nhất → **không chặn phát hành.**

### L3 (thấp, không chặn) — lập luận "CRC32 chỉ +0,24 ms, còn lại do máy bận" SAI
Số nền **không** trôi: không-CRC đo được 4,31–4,44 ms, gần đúng số cũ 4,34 ms.
Máy **không** bận hơn. Toàn bộ phần tăng 4,34 → 5,0/5,6 ms **là do CRC32**, và
giá thật là **0,45–1,13 ms**, tức gấp 2–5 lần con số 0,24 ms đã khai.
Chính mã nguồn cũng tự mâu thuẫn: `src/sao-luu.js:36` ghi *"+0,24 ms"* còn
`src/sao-luu.js:818` ghi *"+0,56 ms"*. Sửa cả hai về khoảng đo thật.

### L4 (thấp, không chặn) — chú thích `LO_KHI_TRE` đã cũ
`src/sao-luu.js:65-66` vẫn viết *"Bình thường 1 (4,3 ms)… thì lên 2 (8,6 ms)"*
trong khi `LO_KHI_TRE = 1` — không còn chế độ 2 lô nữa. Người đọc sau này sẽ
tưởng có đường tăng tốc mà thật ra không có.

### Đường băng còn lại — **Sếp cần biết: tính bằng tháng, không phải năm**
69/88 lô = **78%**. Còn 19 lô dư ≈ **28% chỗ cho dữ liệu tăng thêm**. Mục tiêu
2026 là 50 tỷ → 90 tỷ (+80% doanh số). Nếu số dòng tăng cùng nhịp thì **chạm
trần trong khoảng 4–6 tháng**. Không im lặng — `boPhienQuaHan` sẽ nhắn Telegram
*"KHÔNG CHẠY XONG TRONG ĐÊM"*. Nhưng nên đưa vào kế hoạch quý, đừng đợi báo động.

**Vẫn là số Node, không phải `workerd`.** Mã nguồn đã tự khai điều đó
(`sao-luu.js:56-59`) và đã hạ `LO_KHI_TRE` 2 → 1 để lấy biên. Đủ thận trọng để
đẩy, **với điều kiện tuần đầu soi log Cloudflare tìm dòng "Exceeded CPU"**.

---

## 5. Hướng dẫn 12 bước — **Sếp làm được**, còn 1 lỗ đáng vá

Đã đọc lại cả 12 bước bằng con mắt người không biết kỹ thuật, và **đối chiếu
từng lệnh với mã nguồn thật**:

- Mọi lệnh `npm run` được nhắc đều **có thật** trong `package.json`:
  `lay-khoa-google`, `nap-saoluu`, `dua-len`, `sao-luu-kiemtra` ✅
- `http://localhost:8731/xong` ở Bước 6 **khớp đúng** cổng và đường dẫn trong
  `scripts/lay-khoa-google.mjs:25,44` ✅
- Bước 9 dùng đúng vỏ PowerShell `$env:X = "..."`, có cảnh báo `set` của `cmd`,
  có lệnh tự kiểm `echo $env:GOOGLE_CLIENT_ID` ✅ — **không còn lệnh sai vỏ nào.**
- `npx wrangler login` (B10), đổi tên *Google Auth Platform* (B4–5) ✅
- **Không có bước nào bắt Sếp dán khoá vào chỗ nguy hiểm.** Có cảnh báo rõ:
  không Zalo, không dán vào khung chat Agent, không để trong mã nguồn ✅

### M2 (trung bình, KHÔNG chặn) — bước dễ sai nhất còn lại: **B12 `Clear-Host`**
Chính hướng dẫn bảo Sếp mở *Start → Terminal* (tức **Windows Terminal**). Trong
Windows Terminal, `Clear-Host` **chỉ xoá phần đang nhìn thấy, phần cuộn lên vẫn
còn** — refresh token vừa in ở Bước 9 vẫn đọc được. Sếp làm xong sẽ **tưởng là
đã dọn**, mà chưa dọn.
→ Đảo thứ tự: **"đóng hẳn cửa sổ PowerShell"** phải là việc số 1 in đậm,
`Clear-Host` chỉ là phương án phụ. Sửa 3 dòng văn bản.
→ Nên thêm một dòng dặn kiểm file lịch sử lệnh
(`%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`).
PSReadLine mặc định lọc dòng có chữ *secret* nên gần như chắc là sạch, nhưng
"gần như chắc" thì đáng một dòng dặn.

### M3 (trung bình, KHÔNG chặn) — chỗ Sếp làm xong mà **không biết mình đã đúng**
Sau Bước 11 (`npm run dua-len`) **không có cách nào xác nhận ngay**. Sếp phải
chờ tới 9h sáng hôm sau, mà lúc đó **thành công trông y hệt không có gì xảy ra**
— chỉ thất bại mới có tin nhắn. Ba mươi phút làm việc kết thúc bằng im lặng.
→ Thêm **Bước 13 (2 phút, sáng hôm sau)**: *"Vào Drive, tìm thư mục
`ERP-AGC/SAO-LUU/<ngày hôm nay>`. Thấy có file `.csv` bên trong là XONG."*
→ Và ở Bước 10 thêm một lệnh tự kiểm an toàn (chỉ hiện **tên** khoá, không hiện
ruột): `npx wrangler secret list`. Phải thấy đủ 3 dòng `GOOGLE_*`.

*Nhỏ:* Bước 7 bảo dán khoá vào Notepad (file chữ trần trên đĩa). Bước 12 có dặn
xoá cả trong Thùng rác nên chấp nhận được — nhưng để nguyên trong clipboard /
tab trình duyệt còn sạch hơn.

---

## Tổng hợp lỗi

| Mã | Mức | Chỗ | Chặn? |
|---|---|---|---|
| M1 | Trung bình | `src/kho-file.js:327,338` — `xoaFile` throw làm chết cả đêm sao lưu | Không |
| M2 | Trung bình | `docs/huong-dan/CAP-QUYEN-GOOGLE-DRIVE.md` B12 — `Clear-Host` không dọn hết | Không |
| M3 | Trung bình | cùng file — thiếu bước xác nhận thành công | Không |
| L1 | Thấp | `src/sao-luu.js:oCsv` — NULL ≡ chuỗi rỗng | Không |
| L2 | Thấp | `scripts/kiem-tra-ban-sao-luu.mjs:52` — kê khai cũ báo nhầm loại lỗi | Không |
| L3 | Thấp | `src/sao-luu.js:36` vs `:818` — số CPU mâu thuẫn và khai thấp | Không |
| L4 | Thấp | `src/sao-luu.js:65-66` — chú thích `LO_KHI_TRE` đã cũ | Không |

**Khuyến nghị: NÊN ĐẨY.** Hai lỗi chặn của REV-0011 đã vá thật, đo lại được,
không lỗi mới nào chặn. 7 lỗi trên gộp thành một đợt vá nhỏ sau khi phát hành.
