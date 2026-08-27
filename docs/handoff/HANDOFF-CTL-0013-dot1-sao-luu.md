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
5. Mùng 1 tháng sau: kiểm Telegram có tin nhắn kèm file `.zip` không.

## 10. Còn nợ của Đợt 1 (Phần A — chưa làm, đúng phạm vi được giao)

Kho tài liệu scan: bảng `tai_lieu` · luồng 3 lần bấm · `duocXemTaiLieu()` trong
`quyen.js` · xem lại/tải về/ẩn. `src/kho-file.js` đã dựng sẵn đúng để Phần A
dùng lại — `luuFile`/`layFile`/`xoaFile` đã có và đã chạy.
