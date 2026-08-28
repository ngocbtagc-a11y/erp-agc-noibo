# HANDOFF — CTL-0013 Đợt 1, Phần B: SAO LƯU DỮ LIỆU

- **Người build**: KHỈ ĐỘT · **Ngày**: 2026-08-27
- **Nhánh**: `feature/ctl-0013-sao-luu-dot1` (tách từ `origin/main`, worktree riêng)
- **Nguồn**: [SPEC-0005](../specs/SPEC-0005-kho-tai-lieu-va-sao-luu.md) Phần B ·
  [ADR-0011](../decisions/ADR-0011-kho-tai-lieu-tai-khoan-va-quyen-xem.md) ·
  [ADR-0013](../decisions/ADR-0013-nhip-sao-luu-va-ngay-lam-viec.md)
- **Trạng thái**: code xong, đã đo, đã có ca đối chứng. **CHƯA deploy, CHƯA
  chạy migration remote.** Đang chờ Sếp cấp quyền Google.
- **Phạm vi**: CHỈ phần sao lưu. **Chưa làm kho tài liệu scan.**

---

## 1. Đã làm gì

| File | Việc |
|---|---|
| `src/sao-luu.js` (mới, ~700 dòng) | Toàn bộ máy sao lưu: chia lô, xuất CSV, canary, retention, hai lớp báo động |
| `src/kho-file.js` (mới) | Một cửa duy nhất ra kho ngoài. Ba cài đặt `drive`/`r2`/`d1_tam` |
| `src/zip.js` (mới) | Máy nén ZIP "vừa chảy vừa gói" cho bản tháng — tự viết, không thêm thư viện |
| `migrations/them-sao-luu.sql` (mới) | 4 bảng nhỏ: `sao_luu_thu_muc`, `sao_luu_ban`, `sao_luu_phien`, `sao_luu_canh_bao` |
| `scripts/lay-khoa-google.mjs` (mới) | Lấy khoá Google một lần, ở máy Sếp |
| `scripts/thu-sao-luu.mjs` (mới) | Đo CPU + dung lượng thật, chạy 4 ca đối chứng |
| `scripts/kiem-tra-ban-sao-luu.mjs` (mới) | Kiểm bản đã tải về, có cờ `--bo-file` cho ca đối chứng |
| `docs/huong-dan/CAP-QUYEN-GOOGLE-DRIVE.md` (mới) | 12 bước cho Sếp, tiếng Việt đời thường |
| `src/index.js` | **+7 dòng**: 1 dòng `import`, 1 dòng gọi trong `scheduled()`, 5 dòng chú thích |
| `package.json` | +5 lệnh npm |

**Không đụng** `chatGui()`, vùng `gop_y`, tab Nhân sự, `wrangler.toml`,
`public/`. Không thêm thư viện, không thêm cron, không thêm kênh thông báo,
không thêm vai trò.

---

## 2. Số đo THẬT (`npm run sao-luu-thu`) — không phải ước lượng

| Đo cái gì | Số thật | Đối chiếu | Kết luận |
|---|---|---|---|
| **CPU một lô 2.000 dòng** | **4,34 ms** (bản ngày) · 4,75 ms (bản tháng) | trần **10 ms**/lượt cron | ĐẠT, còn 5,7 ms cho phần cron khác |
| **Dung lượng một bản ngày** | **18,25 MB** · 103.135 dòng · 21 bảng | Hồ Ly ước **22 MB** | **Hồ Ly ước dư 17%** — an toàn, không phải sửa spec |
| Giữ 30 bản ngày | **0,53 GB** | dự toán 0,66 GB | dưới dự toán |
| Số lô cần / sức chứa một đêm | **69 / 110** | — | xong trong một đêm, xong ~6h10 |
| Mẩu 256 KiB đẩy lên Drive | 73 → ~1,1 yêu cầu mạng/lượt | trần 50/lượt | thừa sức |
| **File .zip bản tháng** | 18,25 MB, **Windows giải nén ra 23/23 file, SHA256 khớp 100%** | — | máy nén tự viết chạy đúng |

> ⚠️ **Số CPU đo bằng V8 trên Node ở máy này, không phải workerd trên máy
> Cloudflare.** Cùng động cơ, cùng phép toán, nên sai khác là hằng số nhỏ chứ
> không phải bậc độ lớn — nhưng **vẫn phải xem lại nhật ký Cloudflare sau đêm
> chạy thật đầu tiên**. Máy này không cài `wrangler` nên không chạy thử được
> workerd cục bộ.

---

## 3. Ca đối chứng có lỗi cố ý (BH-16) — 4 ca, đều đúng

| Ca | Kỳ vọng | Kết quả |
|---|---|---|
| Bản nguyên vẹn | ĐẠT | ✅ ĐẠT |
| **Xoá hẳn `nhan_su.csv`** | **PHẢI báo hỏng** | ✅ `thieu_tep` |
| Cắt cụt `thong_bao.csv` 100 byte | PHẢI báo hỏng | ✅ `lech_byte` |
| Mất 1 dòng trong `giao_dich_kho.csv` | PHẢI báo hỏng | ✅ `lech_dong` |

Chạy tay ca đối chứng chính:
`npm run sao-luu-kiemtra -- "<thư mục>" --bo-file=nhan_su.csv` → in `❌ HỎNG`.
Nếu ngày nào nó in `✅ ĐẠT` với cờ đó thì **phép kiểm hỏng**, script tự báo và
trả mã lỗi.

**Tiếng Việt và số 0 đứng đầu** — kiểm ở mức byte: ✅ BOM UTF-8 · ✅ chữ có dấu
· ✅ `sdt`/`ma_nv`/`ma_sku` bọc `="0..."`.
⚠️ **CHƯA mở được bằng Excel thật — máy này không cài Excel.** Đây là việc còn
lại: mở thư mục `.thu-sao-luu/<ngày>/` bằng Excel và nhìn bằng mắt.

---

## 4. Ba quyết định kỹ thuật lệch với SPEC-0005 — và lý do

**① Cửa sổ chạy 0h–8h, không phải 1h–4h.** Spec ước một lượt cron làm được
2.000 dòng "nhẹ nhàng". Đo thật ra 4,34 ms cho một lô — tức **một lô đã ăn gần
nửa trần 10 ms**, và 10 ms đó còn phải chia với đồng bộ Shopee/TikTok chạy
trước. 36 lượt của cửa sổ 1h–4h không đủ cho 69 lô. Mở rộng 0h–8h (kho vào làm
8h), chạy 1 lô/lượt.

**② Bỏ lượt cron đầu mỗi giờ.** Phút 0–4 là lúc `dongBoDonHangNen()` kéo hàng
nghìn đơn về — lượt nặng nhất trong ngày. Nhồi thêm sao lưu vào đúng lượt đó là
cách chắc chắn nhất để vượt CPU.

**③ Chọn bảng bằng DANH SÁCH LOẠI TRỪ, không phải liệt kê.** Spec liệt kê 21
bảng. Liệt kê thì bảng mới (`tai_lieu`, hồ sơ nhân sự…) **bị bỏ quên âm thầm** —
đúng loại lỗi không ai phát hiện cho tới ngày cần phục hồi. Nay bảng mới tự
động được sao lưu; muốn bỏ ra phải cố ý viết tên vào `BANG_KHONG_SAO_LUU`.

---

## 5. Bài học rút ra (Gạo tự chép sang `docs/BAI-HOC.md`, tôi không sửa file đó)

**① "Chia lô" chưa phải là giải pháp — phải ĐO xem một lô tốn bao nhiêu.**
Spec chốt đúng hướng (chia lô) nhưng con số kèm theo (3 lô/lượt) lệch **4,7
lần** so với thực tế. Nếu build theo đúng con số trong spec thì mọi lượt cron
đều bị Cloudflare cắt ngang, và bản sao lưu sẽ **không bao giờ xong mà cũng
không báo lỗi gì** — vì bị cắt vì CPU thì không có exception nào để bắt.
→ **Ràng buộc hạn mức kỹ thuật phải được ĐO trước khi chốt hằng số, không phải
ước lượng rồi sửa sau.** (nối tiếp BH-22)

**② 2,2 ms trong 10 ms bị đốt cho việc KHÔNG PHẢI việc chính.** Bản đầu tôi
cất phần đệm dở dang dưới dạng chuỗi ký tự (vì cột D1 là TEXT). Đổi cột sang
BLOB thì cùng một việc chỉ còn 0,14 ms. **Một phần năm trần CPU nằm ở chỗ chọn
kiểu cột** — không nằm trong thuật toán nào cả.
→ Khi đụng trần hạn mức, tìm phần "chuyển đổi qua lại cho vừa cái hộp" trước,
đừng tối ưu thuật toán trước.

**③ Trần của thiết kế phải là một con số viết ra được, và phải tự kêu.**
Thiết kế này chết ở **~220.000 dòng/ngày** (nay dùng 63% sức). Con số đó nằm
trong chú thích đầu `src/sao-luu.js`, và `boPhienQuaHan()` **tự nhắn Telegram**
khi chạm — kèm hai đường đi tiếp. Không để tương lai phải đoán vì sao nó hỏng.

**④ Cron bị cắt ngang là chuyện BÌNH THƯỜNG, phải thiết kế cho nó.** Ban đầu
tôi bỏ sót: nếu lượt cron chết đúng giữa "Google đã nhận byte" và "ghi vào D1
là đã gửi", thì mọi lượt sau đều gửi sai vị trí và **bản sao lưu đêm đó chết
câm**. Nay `guiMau()` hỏi thẳng Google *"anh nhận tới đâu rồi"* rồi đi tiếp.
→ Với việc chạy nhiều lượt, câu hỏi phải là *"chết ở đúng giữa hai bước thì
sao"*, không phải *"có chạy được không"*.

---

## 6. Rủi ro còn lại

| Rủi ro | Mức | Đã chặn thế nào |
|---|---|---|
| Màn OAuth để nguyên "Testing" → khoá chết sau 7 ngày, **im lặng** | **CAO** | Bước 5 của hướng dẫn viết in đậm; lỗi `invalid_grant` được dịch thẳng thành câu "nhiều khả năng còn ở chế độ Testing"; **lớp báo động B bắt được trong vòng 1 ngày** |
| Chưa từng chạy thật với Google Drive | **CAO** | Chỉ hết sau đêm chạy đầu tiên. **Sáng hôm sau bắt buộc mở Drive nhìn bằng mắt.** |
| CPU thật trên workerd khác Node | TRUNG BÌNH | Chạy 1 lô/lượt (43% trần) nên có chỗ hụt. Xem nhật ký Cloudflare sau đêm đầu |
| Mất tài khoản Google = mất cả kho lẫn bản sao lưu | TRUNG BÌNH | Đúng lý do bản tháng tồn tại. **Chỉ hết rủi ro khi Sếp thật sự tải file .zip về và cất ra ngoài** |
| Dữ liệu bị đọc ở các thời điểm khác nhau trong đêm (ảnh chụp bị "nhoè") | THẤP | Vốn có trong thiết kế chia lô. Không ảnh hưởng việc phục hồi |
| Excel cảnh báo công thức khi mở CSV (ô bắt đầu bằng `=`) | THẤP | Cố ý — giữ nguyên dữ liệu gốc quan trọng hơn. Đã ghi trong `DOC-CACH-DOC.txt` |

---

## 7. Rollback

Sạch, không có bước nào không hoàn tác được:

1. `git revert` nhánh này (index.js chỉ +7 dòng, gỡ ra là cron về nguyên trạng).
2. 4 bảng mới **không** ai khác dùng → `DROP TABLE sao_luu_phien, sao_luu_ban,
   sao_luu_thu_muc, sao_luu_canh_bao;` (hoặc để nguyên, chúng chỉ nằm đó).
3. Xoá 3 secret Google: `npx wrangler secret delete GOOGLE_REFRESH_TOKEN` (và 2 cái kia).
4. Thư mục `ERP-AGC/` trên Drive xoá tay nếu muốn.

**Không có migration nào sửa bảng cũ. Không có dữ liệu cũ nào bị đụng vào.**

---

## 8. Việc Sếp phải tự làm — Agent bị cấm chạm

👉 **[docs/huong-dan/CAP-QUYEN-GOOGLE-DRIVE.md](../huong-dan/CAP-QUYEN-GOOGLE-DRIVE.md)** — 12 bước, tiếng Việt
đời thường, ~35 phút, làm một lần.

Tóm tắt cho Gạo: (1–3) tạo dự án Google Cloud, bật Drive API · (4–5) khai báo
ứng dụng và **bấm PUBLISH APP** ⚠️ · (6–7) tạo OAuth client, chép 2 chuỗi ·
(8) **bật xác thực 2 lớp** ⚠️ · (9) `npm run lay-khoa-google` · (10) 3 lệnh
`wrangler secret put` · (11) `npm run nap-saoluu` + `npm run dua-len` ·
(12) xoá Notepad.

**Sếp không phải dán chuỗi nào vào khung chat.** Script chạy ở máy Sếp, in khoá
ra màn hình dòng lệnh, Sếp dán thẳng vào két Cloudflare.

---

## 9. Việc còn lại sau khi Sếp cấp quyền

1. **Sáng hôm sau đêm đầu tiên**: mở Drive, vào `ERP-AGC/SAO-LUU/<ngày>/`,
   đếm đủ file, tải về chạy `npm run sao-luu-kiemtra`.
2. **Mở bằng Excel thật** — việc duy nhất chưa kiểm được ở đây.
3. **Xem nhật ký Cloudflare** đêm đầu: có lượt nào bị cắt vì CPU không.
4. **Thử ca đối chứng trên bản THẬT** (không phải bản giả của harness).
5. **Ngày 15 tháng sau**: kiểm Telegram có tin nhắn kèm `.zip` không, và kiểm
   tên file là `sao-luu-AGC-<THÁNG TRƯỚC>.zip` chứ không phải tháng đang chạy.
6. Giải nén bản `.zip` đó, chạy `node KHOI-PHUC.mjs` trong thư mục vừa giải nén
   — phải hiện dòng "ĐẠT". Đây là lần thử khôi phục trên dữ liệu THẬT.

## 10. Còn nợ của Đợt 1 (Phần A — chưa làm, đúng phạm vi được giao)

Kho tài liệu scan: bảng `tai_lieu` · luồng 3 lần bấm · `duocXemTaiLieu()` trong
`quyen.js` · xem lại/tải về/ẩn. `src/kho-file.js` đã dựng sẵn đúng để Phần A
dùng lại — `luuFile`/`layFile`/`xoaFile` đã có và đã chạy.

---

## 11. VÒNG SỬA 1 — vá REV-0011 (Hồ Ly, `26c4e95`)

### ⛔ B1 · Bản kê khai không bắt được file bị sửa ruột — ĐÃ VÁ

`KIEM-TRA.csv` thêm cột **`crc32`**: `bang,so_dong,co_byte,crc32,ten_tep`.
Bản NGÀY nay cũng cộng dồn CRC32 (trước chỉ bản tháng làm, vì zip cần) —
`themNoiDung()` bỏ tham số `laThang`, luôn tính. `kiemTraKeKhai()` thêm hai lỗi:
`lech_ma_kiem` (đúng cỡ, khác ruột) và `thieu_ma_kiem` (kê khai không có cột
crc32 → **KÊU**, không âm thầm chấm ĐẠT).

Ca vòng trước lọt lưới nay bị bắt — sửa 1 byte THẬT trên đĩa, cỡ 11.172 byte
không đổi, số dòng không đổi:
`lech_ma_kiem: nhan_su.csv kê khai crc32 480602698, thật 2211738341`.
Đối chứng ngược: trả lại nguyên trạng → ĐẠT lại.

### ⛔ B2 · Ô nhân viên tự gõ chạy được như công thức Excel — ĐÃ VÁ

**Cách vá đã chọn: rào bằng một dấu nháy đơn `'` đứng trước, và rào ĐẢO NGƯỢC
ĐƯỢC.** Ô bắt đầu bằng `=` `+` `-` `@` `Tab` `\n` `\r` — và bằng chính `'` —
được ghi ra thành `"'<nội dung>"`.

Vì sao **không** dùng lại mẹo `="…"` của cột số 0 đứng đầu: `="…"` không chứa
được ký tự xuống dòng (Excel báo lỗi công thức), mà `ghi_chu` thì đầy xuống
dòng. Dấu `'` chứa được mọi thứ, và cả ba công cụ (Excel · LibreOffice · Google
Trang tính) đều hiểu `'` đầu ô là "đây là chữ, đừng tính".

Vì sao rào cả `'`: để quy tắc đọc ngược chỉ có MỘT câu — *thấy `'` đứng đầu thì
bóc ĐÚNG MỘT dấu* — và không bao giờ nhập nhằng. Giá trị gốc `'abc` ghi ra
thành `''abc`, đọc về vẫn là `'abc`.

Nửa còn lại của phép vá nằm cùng file, để ai viết công cụ phục hồi dùng lại:
`docO()` (bóc rào một ô) và `phanTichCsv()` (tách CSV, hiểu nháy lồng và xuống
dòng trong ô).

**Bằng chứng hoàn nguyên đúng** (`npm run sao-luu-thu`, mục ④b) — đi trọn vòng
gốc → ô CSV → ghép file → `phanTichCsv` → `docO` → **so hex từng byte**:
**15/15 ca vừa CHẶN được vừa HOÀN NGUYÊN đúng**, gồm `=1+1` ·
`=HYPERLINK("http://…"&A1,…)` · `+84…` · `-2+3` · `@SUM(A1:A9)` ·
`Tab`/`\n`/`\r` đứng trước · `'=1+1` (vốn đã có nháy) · ghi chú thật có nháy +
phẩy + xuống dòng · `="0123"` (trông y hệt cái rào, không nhập nhằng) · ô rỗng.
Cột bọc `="0…"` cũng hoàn nguyên đúng.

### Bốn lỗi nhỏ

| | Vá gì |
|---|---|
| **M2** | `donTepTrungTen()` mới trong `kho-file.js` — xoá bản sót cùng tên trước khi mở file mới (ca (a) và (c): Drive đẻ hai file trùng tên → `thua_tep` giả lúc phục hồi). Ca (b): `coBan()` nay coi `dang_chay` mà KHÔNG có phiên là **chưa có** → làm lại được; `taoPhien()` đổi sang `INSERT OR REPLACE`. `xong`/`hong` vẫn tính là đã có, để không lặp vô tận. |
| **M3** | `LO_KHI_TRE` 2 → **1**. Trần thiết kế hạ 220k → **176k dòng/ngày**, nay dùng **78%** sức (trước 63%). Vẫn xong trong một đêm: 69 ≤ 88 lô, dư 19 lô cho bản tháng. |
| **M4** | `zip.js ghi()` chặn ồn ào ở mốc 4 GB. Đo: `cuoiTep(crc, 5.000.000.000)` nay **throw** thay vì ghi ra 705.032.704; đối chứng đúng trần `4.294.967.295` vẫn ghi được. |
| **L** | Bước 9 đổi `set X=…` → `$env:X = "…"`, thêm lệnh `echo` kiểm nhanh và cảnh báo gõ nhầm `cmd` thì **không báo lỗi**. Rà cả 12 bước: thêm `npx wrangler login` (Bước 10), Google đổi tên *OAuth consent screen* → *Google Auth Platform* (Bước 4–5), Bước 12 thêm `Clear-Host` + đóng cửa sổ vì refresh token vừa in ra màn hình. Phần Chuẩn bị nói rõ **phải là PowerShell**, kèm cách nhận biết. |
| **L1** | `sao_luu_ban` vào `BANG_KHONG_SAO_LUU` (3 bảng anh em đã có sẵn). |
| **L2** | Giờ chạy thống nhất **0h–8h** ở cả 3 nơi: `sao-luu.js` (2 chỗ), `index.js`, hướng dẫn. |

### Số đo CPU mới (`npm run sao-luu-thu`)

Một lô 2.000 dòng: **5,26 ms trung vị · 5,60 ms xấu nhất** (đã gồm CRC32).
Không CRC32: 5,02 / 5,11 ms → **giá của B1 là +0,24 ms mỗi lô**.
Một lượt cron = 1 lô ⇒ **5,60 ms xấu nhất trong trần 10 ms, dư 4,4 ms**.

⚠️ Số nền của máy đã trôi so với vòng trước (4,34 → 5,02 ms cho cùng phép đo
không CRC) — máy lúc đo bận hơn. **Không phải CRC32 làm chậm.** Và vẫn là Node
trên máy Sếp, không phải `workerd`: tuần đầu phải soi log Cloudflare tìm
"Exceeded CPU".

### Còn nợ, KHÔNG vá trong vòng này

- **M1** — `ADR-0013` vẫn là file chưa theo dõi trong thư mục làm việc của repo
  chính, không nằm trên nhánh nào, trong khi mã viện dẫn nó hơn 10 lần. Nằm
  ngoài worktree này. **Một lệnh `git clean` là mất quyết định của Sếp.**
- **L4** — chưa ai mở bằng Excel thật. Máy này không có Excel/LibreOffice.
