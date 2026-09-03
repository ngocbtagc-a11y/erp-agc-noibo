# REV-0032 — Góp ý ERP chỉ Sếp Ngọc duyệt · VÒNG 3

- **Soi:** worktree `agc-spec0002`, `feature/gopy-chi-sep-ngoc`, `53c77ef` · **Hồ Ly** · 28/08/2026
- **Kết luận: FIX_REQUIRED** — đúng **một** lỗi chặn phát hành, vá hết ~10 dòng. Mọi thứ khác đạt.
- Lời khai đã tự chạy lại, không tin chữ: bàn đo 146 phép, chấm lại cây cũ, và **2 bàn đo tôi tự viết**.

---

## Đúng thì nói thẳng là đúng — những gì tôi tự đo lại và XÁC NHẬN

| Lời khai | Tự chạy ra | |
|---|---|---|
| Bàn đo lên 146 phép, cây mới 146/0 | `ĐẠT 146 · TRƯỢT 0` | ✅ |
| Đối chứng 16/16 | `16/16`, nhạy cả chiều cắt quá tay | ✅ |
| Cây cũ `d06446a` chấm ra 124/22 | `ĐẠT 124 · TRƯỢT 22`, 22 dòng trượt đúng 6 lỗi REV-0030 | ✅ |
| Script đặt lại mật khẩu: 1 bảng · 0 dòng mất · 1 dòng · 2 cột | đúng, và đối chứng `DELETE FROM nhan_su` **bắt được** | ✅ |
| Hash script sinh ra mở được tài khoản thật | `kiemTraMatKhau()` của `src/auth.js` = true | ✅ |
| 5 đường rò (a)–(e) đều 0 | 0 | ✅ |
| Telegram hỏng → 502, hash cũ nguyên vẹn | HTTP 502 · mật khẩu nguyên vẹn | ✅ |
| Chưa có `TELEGRAM_CHAT_ID_SEP` → 403, không đụng mật khẩu | HTTP 403 · nguyên vẹn | ✅ |
| Cửa 14 vá đúng, bịt cả nhánh chặn-rồi-gỡ-chặn | `!raVaoBiChan` ở dòng 4634 — đo bằng mốc riêng, đúng | ✅ |
| Cửa 15/16 | `chờ OWNER` + dòng *"Nguyễn Duy Phong gửi lại hộ Nguyễn Văn An (lần 1)"* — **đọc hiểu được** | ✅ |
| L4 console ≥1 + đúng 1 tin/ngày | 4 dòng console · 1 tin · lượt 2 vẫn 1 tin | ✅ |
| "Không còn ai giữ cờ" + **không báo oan** | 1 tin khi cờ về 0 · **0 tin** khi còn người giữ | ✅ |
| Triage chấm góp ý của Sếp, không chấm lại lượt 2 | MEDIUM + `de_xuat_spec`, `tu_dong_xu_luc` chặn lượt 2 | ✅ |
| Thiếu cột `cho_duyet_tu_luc` → tự lùi, không 500 | **tự dựng lại**: gửi góp ý `HTTP 200`, cron chạy xong không ném, SLA vẫn đẩy lên OWNER | ✅ |
| Hai migration + file lùi | thứ tự đúng; file lùi **cất** `cho_duyet_tu_luc` sang `gopy_cho_duyet_luu_lui` **trước** khi DROP, và gỡ chốt `schema_migrations` nên tiến lại được | ✅ |
| Đính chính "89→90", "64→65" | đã sửa ở `docs/BAI-HOC.md` và header bàn đo | ✅ |

Vòng này Khỉ Đột làm tốt. Không hồi quy. Chỉ còn **một** thứ đứng giữa nhánh này và chỗ đẩy được.

---

## ⛔ L1 — CỬA THỨ 17: hoàn tác trả lại việc, KHÔNG trả lại đồng hồ

**Khỉ Đột tự khai là "mất tối đa 15 phút". Đo ra thì KHÔNG PHẢI — mất TOÀN BỘ tuổi hàng chờ.**

Tôi dựng lại (probe riêng, mốc riêng, không dùng bàn đo của nó): một góp ý của anh An chờ
cổng 1 từ **23/08**, tức đã 5 ngày.

```
A. Không ai đụng   → next_owner: OWNER    (cron ĐẨY LÊN SẾP — mốc đúng)
B1. anh Duy "duyệt"→ 200 · cho_duyet_tu_luc: 2026-08-23 → 2026-08-28
B2. anh Duy "hoàn tác" (trong 15 phút)
                   → 200 · next_owner về QL_CAP1 · cho_duyet_tu_luc VẪN 2026-08-28
B3. chạy cron      → next_owner: QL_CAP1  ·  Telegram: 0 tin
C. lặp 3 vòng      → vẫn QL_CAP1
```

Việc **5 ngày tuổi tụt về 0 ngày** sau đúng một cặp bấm. `GOPY_COT_HOAN_TAC` không có
`cho_duyet_tu_luc`, nên `gopYHoanTac()` trả lại 12 cột và bỏ lại cái đồng hồ vừa bị đóng dấu.

Vì sao đây là lỗi chặn, không phải chuyện nhỏ:
- Nó **đúng bằng cửa 14**, chỉ khác cần cẩu. Cửa 14 bị gọi là lỗi CAO vì *"nổ cả khi không ai
  cố ý"* — cửa 17 cũng thế: **một cú bấm nhầm rồi hoàn tác** là mất sạch tuổi hàng chờ. Không
  cần ai xấu bụng.
- Nó phá đúng **một trong ba chỗ đỡ** ADR-0015 hứa với Sếp cho rủi ro "một người duyệt"
  (SLA ngày thứ 5). Cấp 1 giữ việc không cho lên Sếp — chính cái SLA sinh ra để chặn.
- Lặp được, và **0 dòng cảnh báo**.

**Lập luận "không vá vì phải đưa cột mới vào `SELECT` nóng của `gopYDuyet` = đúng rủi ro L4"
là NÉ.** Không cần đụng câu SELECT nóng một chữ. Dùng đúng khuôn phòng thủ mà chính nó vừa
viết ra ở `gopYDongDauChoDuyet()`:

1. Lúc chụp ảnh hoàn tác: một câu `SELECT cho_duyet_tu_luc FROM gop_y WHERE id = ?` **riêng**,
   bọc `try/catch` nuốt đúng `no such column` → thiếu cột thì trả `undefined`, y như hiện nay.
2. Thêm `'cho_duyet_tu_luc'` vào `GOPY_COT_HOAN_TAC`.
3. `gopYHoanTac()` đã tự map `truoc[k] === undefined ? null : truoc[k]` — nhưng ở đây **đừng
   ghi NULL**: thiếu cột thì bỏ khoá đó ra khỏi `gan`, để COALESCE hai bậc lo tiếp.

~10 dòng, cùng một khuôn, không mở mặt hỏng mới. Và **thêm một phép đo + một ca đối chứng
DC-R** (duyệt→hoàn tác→cron phải vẫn đẩy lên Sếp) — thiếu ca đối chứng thì bàn đo lại xanh
trong khi lỗi còn nguyên (BH-47).

---

## Bảng lỗi

| # | Lỗi | Mức | Chặn phát hành |
|---|---|---|---|
| L1 | **Cửa 17** — hoàn tác không trả lại `cho_duyet_tu_luc`; việc 5 ngày tụt về 0 ngày, lặp được, 0 cảnh báo. Lời khai "mất tối đa 15 phút" sai | **CAO** | **CÓ** |
| M1 | **Đường rò thứ 6** — không có chốt `TELEGRAM_CHAT_ID_SEP !== TELEGRAM_CHAT_ID`. Đặt nhầm secret bằng chat id **nhóm chung** thì mật khẩu tạm của Sếp phát cho cả công ty, 200 êm ru, không một dòng cảnh báo. Người đặt secret lại chính là người bị giữ bí mật | TRUNG BÌNH | Không |
| M2 | **Bấm liên tục** — `qtDatLaiMatKhau` không có chốt nhịp. Mỗi cú bấm sinh mật khẩu mới **và** `DELETE FROM phien` của Sếp → admin bấm lặp là khoá Sếp ra khỏi ERP không giới hạn, kèm spam chat riêng của Sếp. Bản 403 của REV-0027 không có mặt hỏng này | TRUNG BÌNH | Không |
| L2 | `rl.question` trong `dat-lai-mat-khau.mjs` gặp **EOF thì TREO**, không ném (tôi đo riêng: 3s không trả về). Chú thích viết *"CI/cron → EOF → cũng DỪNG"* — **nói sai** (Rule 10). Chưa ghi gì nên không hỏng dữ liệu | THẤP | Không |
| L3 | Script **không bật lại `kich_hoat`**. Tài khoản đang khoá thì đặt xong mật khẩu vẫn không vào được. Script có in cảnh báo, nhưng `HUONG-DAN-DEPLOY.md` **Nấc 2 không nói** — người làm theo từng chữ sẽ kẹt | THẤP | Không |
| L4 | Lời khai **"1/48 bảng"**; bàn đo in ra **57 bảng**. Đúng loại lệch số của BH-47 (89→90) | THẤP | Không |
| L5 | "Gửi trước ghi sau" — ca ngược: Telegram **gửi xong** mà `UPDATE` hỏng → Sếp cầm mật khẩu không dùng được, và **không** có `thong_bao` / `nhan_su_lich_su` / tin nhóm nào (mọi dấu vết đều ghi SAU `UPDATE`) → lần thử hỏng đó **vô hình** với công ty | THẤP | Không |
| L6 | `docs/BAI-HOC.md`: tiêu đề **BH-28 và BH-29 vẫn trùng** (có từ `2e5084d`, không phải hồi quy vòng này), và **BH-45 · BH-46 bỏ trống** | THẤP | Không |

Ca hiểm Câu 2 đã kiểm và **không có lỗi**: số không tồn tại → `KHÔNG ghi gì cả` + thoát 1;
hai tài khoản trùng số → `bất thường, KHÔNG ghi gì cả`; gõ nhầm xác nhận → `Đã HUỶ`; đứt giữa
chừng → chỉ có **một** câu ghi nên không có trạng thái nửa vời; `--local` là mặc định và màn
hình in rõ `bản máy` / `BẢN THẬT` trước khi hỏi. Mật khẩu mới **chỉ in ra màn hình**, không
ghi file, không ghi log — ai đứng sau lưng thì đọc được, đó là đánh đổi có chủ ý và đã ghi rõ.

---

## Bước triển khai — chạy SAU KHI vá L1 (và nên gộp M1 luôn)

| # | Việc | Kiểm ngay sau bước đó |
|---|---|---|
| 1 | `node scripts/chay-migration.mjs them-quyen-duyet-gopy.sql --remote` | Không thấy `CHECK constraint failed`. Rồi `SELECT t.ten_dang_nhap, n.ho_ten FROM tai_khoan t JOIN nhan_su n ON n.id=t.nhan_su_id WHERE t.duyet_gopy=1` → **đúng 1 dòng, đúng tên Sếp** |
| 2 | `node scripts/chay-migration.mjs them-gopy-cho-duyet-tu-luc.sql --remote` | Không thấy `backfill_cho_duyet_tu_luc_khong_duoc_sot_dong`. `SELECT COUNT(*) FROM gop_y WHERE cho_duyet_tu_luc IS NULL` → **0** |
| 3 | Sếp nhắn `/start` cho bot ERP, lấy chat id → `npx wrangler secret put TELEGRAM_CHAT_ID_SEP` | Chat id này **KHÁC** `TELEGRAM_CHAT_ID` của nhóm — đối chiếu bằng mắt trước khi dán (chừng nào M1 chưa vá, đây là chốt duy nhất) |
| 4 | Deploy code (`git push origin main` → Actions ✅) | `Ctrl+Shift+R`. Đăng nhập được bằng **cả** tài khoản Sếp và anh Phong — L4 đúng thứ tự thì bước 1 đã xong trước |
| 5 | Thử đường khôi phục **trên bản thật, một lần** | Anh Phong bấm "Đặt lại mật khẩu" ở tài khoản Sếp → **200**, hộp thoại nói *"không hiện mật khẩu ở đây"*; Sếp nhận mật khẩu ở **chat riêng**; nhóm chung có dòng `[Bảo mật]`; Sếp đăng nhập được và bị bắt đổi mật khẩu |
| 6 | Thử đồng hồ SLA | Một góp ý cũ đang chờ cổng 1: bấm "giao người phụ trách" → `SELECT cho_duyet_tu_luc` **không đổi** |

Lùi: `npx wrangler d1 execute crm-agc --remote --file=migrations/lui/lui-gopy-cho-duyet-tu-luc.sql`
(giá trị cũ nằm ở `gopy_cho_duyet_luu_lui`) — lùi là **mở lại cửa 14**, biết rồi hãy lùi.
