# REV-0035 — Góp ý ERP chỉ Sếp Ngọc duyệt · VÒNG 4

- **Soi:** worktree `agc-spec0002`, `feature/gopy-chi-sep-ngoc`, `5f84d6d` · **Hồ Ly** · 29/08/2026
- **Kết luận: PASS.** Cửa 17 vá thật; tôi tìm cửa 18 bằng 6 đường — **không có**. Một lỗi MỚI
  nằm ngoài bản vá này (script cứu hộ không chạy được, có từ `53c77ef`): **không chặn phát hành
  tính năng**, vá một dòng đẩy chung. Không cần vòng soi thứ 5.

## Lời khai — tôi tự chạy lại từng con số, không tin chữ

| Khai | Tôi chạy ra | |
|---|---|---|
| Bàn đo 146 → 175 phép (175/0), đối chứng 16 → 20 (20/20) | `ĐẠT 175 · TRƯỢT 0` · `20/20`, DC-R/S/T/U đều bắt được | ✅ |
| Chấm lại `53c77ef` ra 164/11 | `ĐẠT 164 · TRƯỢT 11` — đúng 4 lỗi (cửa 17 · M1 · M2 · L5), không thừa | ✅ |
| Không hồi quy: 35/0 · 85/0 · 53/0 · 31 trượt | `do-va-rev0019` 35/0 · `tu-kiem-nhac-cong-viec` 85/0 · `tu-kiem-nhac-nhan-su` 53/0 · `do-tuong-phan-mau` 31 trượt, không đổi | ✅ |
| — | Ngoài bàn đo của nó, tôi viết **probe riêng, mốc riêng: 55 phép ĐẠT** | |

## Câu 1 — Cửa 17 vá thật. Không có cửa 18.

Mốc của tôi là **18/08 (10 ngày)**, không dùng 23/08 của nó:
```
"duyệt"    → 200 · đồng hồ 2026-08-18 → 2026-08-28
"hoàn tác" → 200 · next_owner QL_CAP1 · đồng hồ VỀ LẠI 2026-08-18
cron       → next_owner OWNER · Telegram "quá hạn duyệt cấp quản lý"
```

**DC-R bắt thật:** chấm cây `53c77ef` ra `đồng hồ … phải về 2026-08-23` + `cron VẪN đẩy —
#15 chờ QL_CAP1`. Ca đối chứng nhạy, không phải ca lúc nào cũng xanh.

**Sáu đường tôi tự dựng để tìm cửa 18 — tất cả đều kín:**

| Đường | Kết quả |
|---|---|
| Lặp duyệt→hoàn tác **5 vòng** | đồng hồ vẫn 18/08 · cron vẫn đẩy lên Sếp |
| **Từ chối** rồi hoàn tác (nhánh `gopYDuyet` thứ hai) | đồng hồ về 18/08 · cron vẫn đẩy |
| **Chặn rồi gỡ chặn** qua `/trang-thai` | đồng hồ giữ 18/08 · `next_owner` giữ QL_CAP1 |
| SLA đã đẩy lên OWNER → Sếp duyệt→hoàn tác | trả về **OWNER**, không tụt về QL_CAP1 |
| **Drop cột** `cho_duyet_tu_luc` · **ảnh chụp cũ** (chụp trước bản vá) | gửi/duyệt/hoàn tác đều 200 · cron **không ném** · **không ghi NULL đè mốc** |

Tôi cũng soi câu `SELECT` nóng của `gopYDuyet`: nó lấy **đủ cả 12 cột** của
`GOPY_COT_HOAN_TAC`, nên đổi `gopYAnhChup()` từ "ghi null" sang "bỏ khoá thiếu" **không** làm
hoàn tác quên trả cột nào. Chỗ dễ đẻ hồi quy nhất của bản vá — nó sạch.

## Câu 2 — M1: hai chat id trùng nhau

7 ca, đo bằng `chatId` thật của từng tin, không đếm tổng. Mọi ca hiểm anh nêu đều **bị bắt**:

| Ca | Kết quả |
|---|---|
| Y hệt · **khoảng trắng hai đầu** · **tab/newline** · **kiểu số vs chuỗi** | **409** · hash không đụng · **0 tin** vào nhóm |
| Khác thật (chat riêng) | 200 · mật khẩu vào **đúng** chat riêng · 0 tin mật khẩu vào nhóm |
| `-01002222` (số 0 thừa đầu) | **200 — LỌT** (xem L2 dưới) |

## Câu 3 — M2: chốt nhịp

Lần 1 **200** → Sếp đăng nhập lại (**1 phiên**) → lần 2 **429**, hash **giữ nguyên**, phiên Sếp
**còn 1**, **0** tin mật khẩu mới vào chat riêng, **đúng 1** tin `chan_khoi_phuc`. Lần 3 **429**,
vẫn **đúng 1** tin. **Ca ngược:** đẩy mốc lùi 6 phút → **200 lại**, hash đổi, **đúng 1** tin mới
vào chat riêng — không cắt quá tay.

**Mốc `nhan_su_lich_su` có chắc không:** quét cả `src/` `scripts/` `migrations/` `schema.sql` —
**không một `DELETE`/`DROP`/dọn định kỳ nào** chạm bảng đó, nó append-only theo thiết kế. Mốc
vững; chỉ còn L3 dưới đây.

## Câu 4 — 5 lỗi nhẹ

| | Đo được |
|---|---|
| `rl.question` EOF | khuôn cũ **TREO 2007ms**; `hoiMotLan` **NÉM sau 1ms**; chạy thật stdin đóng → **thoát 1**, không ghi gì ✅ |
| Bật lại `kich_hoat` | đang khoá: **3 cột · 1 UPDATE · 1 WHERE · 1 bảng**; đang hoạt động: **2 cột**, không có `kich_hoat` ✅ |
| 57 bảng | bàn đo in `ĐÚNG MỘT bảng đổi trong **57 bảng**` — lời khai khớp ✅ |
| L5 đường rò | 500 · `console.error` · tin cho chủ tài khoản · tin nhóm. Mật khẩu tạm **không** vào thân trả về / console / nhóm chung / **bất kỳ bảng nào**; nó **chỉ** nằm ở đúng chat riêng ✅ |
| BH-50/51 · BH-52/53/54 | **0 số trùng, 0 tiêu đề trùng**. Mọi chỗ trích BH-28/29 ngoài file đều trỏ vào cặp còn lại. BH-45/46 có ghi rõ *"số đã dùng ở nhánh khác… đây không phải chỗ trống để điền"* ✅ |

## Câu 5 — Giao diện

Khai đúng: `api.js` có `throw new Error(duLieu.loi || 'Máy chủ gặp sự cố')` cho **mọi** mã ≠ 2xx,
và `app.js:7963` `catch (err) { alert(err.message) }` — nên 409/429/500 hiện **nguyên câu tiếng
Việt** máy chủ viết, đều đủ nghĩa và nói rõ làm gì tiếp. Không đụng giao diện là **đúng**, không
phải bỏ sót; `git show --stat` xác nhận **0 file `public/` thay đổi**.

## Bảng lỗi

| # | Lỗi | Mức | Chặn phát hành |
|---|---|---|---|
| L1 | **`scripts/dat-lai-mat-khau.mjs` KHÔNG CHẠY ĐƯỢC.** `execFileSync('npx', args, { shell: true })` (dòng 139): bật `shell` thì Node **không tự bọc nháy** đối số có khoảng trắng, nên câu SQL bị cắt thành từng chữ. Tôi chạy thật cả Bash lẫn PowerShell: chết ngay `[1/3]`, `Unknown arguments: t.id,, t.ten_dang_nhap,, …`, thoát 1. **Có từ `53c77ef`, không phải hồi quy vòng này** — REV-0032 sót vì bàn đo chỉ `import` hai hàm sinh SQL, **chưa bao giờ chạy script** (đúng BH-47). Hỏng theo chiều an toàn: chết trước khi ghi, không đụng dữ liệu. Vá: bỏ `shell: true` (`execFileSync` gọi thẳng `npx.cmd`), hoặc bọc `"` quanh `sql`. `chay-migration.mjs` dùng `execSync` + có nháy nên **không dính**; `cai-dat.mjs` chỉ truyền đối số không khoảng trắng | **CAO** | **Không** chặn phát hành tính năng — nhưng **chặn** việc coi đường cứu là dùng được. Vá 1 dòng, đẩy chung, chạy thử `--local` một lần là xong |
| L2 | So chat id **chỉ so chuỗi**. `-01002222` vs `-1002222` khác chuỗi nhưng Telegram đọc `chat_id` thành int64 nên **cùng một nhóm** → lọt, 200. Vá: khi cả hai vế parse ra số nguyên thì so cả bằng số | THẤP | Không |
| L3 | Chốt nhịp **hỏng-mở**: câu đọc mốc bọc `try/catch` trả `null`, và câu `INSERT` dòng mốc cũng bọc `try/catch`. Mất bảng `nhan_su_lich_su` (hoặc INSERT hỏng) là chốt nhịp **tắt âm thầm**, chỉ có một dòng `console.error`. Tôi đo: xoá sạch bảng → bấm lại **200**. Bảng không bị dọn ở đâu cả nên rủi ro thấp, nhưng nên nói rõ trong ADR | THẤP | Không |
| L4 | **Chưa nạp migration** thì cửa 17 **vẫn hở**: đồng hồ lùi về `cap_nhat_luc`, mà duyệt→hoàn tác đều ghi lại cột đó. Giống hệt cửa 14 ở trạng thái tiền-migration, đã biết và chấp nhận — chính là lý do **DB chạy TRƯỚC code** | THẤP | Không |
| L5 | `hoiMotLan` từ chối luôn khi stdin là **ống dẫn** → coi như huỷ. Hướng dẫn ghi "hỏi bằng bàn phím" nên đúng đường dùng, và hỏng theo chiều an toàn. Ghi nhận, không phải lỗi | THẤP | Không |

## Bước triển khai — **DB TRƯỚC, CODE SAU**

Vì sao: code mới **chịu được** thiếu cột (đo rồi: 200 hết, cron không ném), còn DB mới thì code cũ
**không đụng tới**. Nạp code trước sẽ mở đúng **L4** suốt khoảng chờ.

| # | Việc | Kiểm ngay sau bước đó |
|---|---|---|
| 0 | Vá **L1** (1 dòng, `scripts/dat-lai-mat-khau.mjs:139`) | `node scripts/dat-lai-mat-khau.mjs <sđt-thử>` → phải in ra được khối `Họ tên / Tên đăng nhập / Vai trò`, không còn `Unknown arguments` |
| 1 | `node scripts/chay-migration.mjs them-quyen-duyet-gopy.sql --remote` | Không có `CHECK constraint failed`. `SELECT t.ten_dang_nhap, n.ho_ten FROM tai_khoan t JOIN nhan_su n ON n.id=t.nhan_su_id WHERE t.duyet_gopy=1` → **đúng 1 dòng, đúng tên Sếp** |
| 2 | `node scripts/chay-migration.mjs them-gopy-cho-duyet-tu-luc.sql --remote` | Không có `backfill_cho_duyet_tu_luc_khong_duoc_sot_dong`. `SELECT COUNT(*) FROM gop_y WHERE cho_duyet_tu_luc IS NULL` → **0** |
| 3 | Sếp nhắn `/start` cho bot → lấy chat id → `npx wrangler secret put TELEGRAM_CHAT_ID_SEP` | Đối chiếu bằng mắt: **khác** `TELEGRAM_CHAT_ID`, chat riêng thường **dương**, nhóm **âm**. Dán trùng thì ERP trả 409 chứ không phát mật khẩu — nhưng đừng dựa vào đó |
| 4 | Deploy code (`git push origin main` → Actions ✅) | `Ctrl+Shift+R`. Đăng nhập được bằng **cả** tài khoản Sếp và anh Phong |
| 5 | Thử đường khôi phục **trên bản thật, một lần** | Anh Phong bấm "Đặt lại mật khẩu" ở tài khoản Sếp → **200**, hộp thoại nói *"không hiện mật khẩu ở đây"*; Sếp nhận mật khẩu ở **chat riêng**; nhóm chung có dòng `[Bảo mật]`. Bấm **lần 2 ngay** → phải ra **429** kèm câu "trong 5 phút chỉ làm được một lần" |
| 6 | Thử đồng hồ SLA | Góp ý cũ đang chờ cổng 1: bấm "giao người phụ trách" → `SELECT cho_duyet_tu_luc` **không đổi**. Rồi "duyệt" → "hoàn tác" → `cho_duyet_tu_luc` **về đúng giá trị cũ** |

Lùi: `npx wrangler d1 execute crm-agc --remote --file=migrations/lui/lui-gopy-cho-duyet-tu-luc.sql`
(giá trị cũ cất ở `gopy_cho_duyet_luu_lui`) — lùi là **mở lại cửa 14 và 17**, biết rồi hãy lùi.

**Vòng này Khỉ Đột làm đúng.** Nhận đã né, vá đúng khuôn đã chỉ, tự viết 4 ca đối chứng cho
chính 4 lỗi của mình, không đụng câu `SELECT` nóng một chữ. Lời khai **khớp từng con số**. Đẩy được.
