# Triển khai — Góp ý ERP chỉ Sếp Ngọc duyệt (nhánh `feature/gopy-chi-sep-ngoc`)

> Cho Gạo. Chép–dán từng khối, **theo đúng thứ tự**, mỗi bước chạy xong thì chạy
> luôn lệnh kiểm ngay dưới nó. **Không tin sổ ghi, chỉ tin lệnh kiểm** — hôm nay
> đã dính đúng chuyện đó: `schema_migrations` nói "đã chạy" không chứng minh
> được cột có thật, và bàn đo xanh không chứng minh được script chạy được.
>
> **DB TRƯỚC, CODE SAU.** Code mới chịu được thiếu cột (đo rồi: 200 hết, cron
> không ném); DB mới thì code cũ không đụng tới. Nạp code trước là mở cửa 14/17
> suốt khoảng chờ.
>
> ⚠️ **Khoảng chờ giữa bước 2 và bước 5 là CỬA SỔ HỞ** (REV-0035 L4): chừng nào
> `gop_y.cho_duyet_tu_luc` chưa có, đồng hồ SLA lùi về `cap_nhat_luc`, và một cú
> duyệt→hoàn tác là xoá tuổi hàng chờ → cron thôi đẩy việc lên Sếp. Không vá
> được ở tầng code. **Làm liền một mạch 0→6, đừng nạp DB hôm nay rồi mai mới
> deploy.** Chọn giờ vắng, khoảng 15 phút là xong.

Chạy ở thư mục `crm-agc`. Đã `npm install` (wrangler nằm trong
`devDependencies` — thiếu nó là bước 0 và các lệnh kiểm đều không chạy được).

---

## Bước 0 — Bàn đo phải xanh trước khi đụng vào bản thật

```bash
node scripts/do-quyen-duyet-gopy.mjs
```

**Kiểm:** dòng cuối in `ĐẠT 192 · TRƯỢT 0` và có dòng
`Phép đo nhạy cả hai chiều (rò rỉ VÀ cắt thừa) — 22/22`.
Trượt một phép nào thì **dừng ở đây**, đừng đi tiếp.

## Bước 1 — Script cứu hộ có chạy được không (làm TRƯỚC, không phải làm sau)

Đây là đường về nhà nếu các bước sau hỏng. Thử trên **bản máy**, không phải bản
thật — dùng một tài khoản thử, đừng dùng tài khoản Sếp:

```bash
node scripts/dat-lai-mat-khau.mjs <tên-đăng-nhập-thử>
```

**Kiểm:** in ra được khối `Họ tên / Chức vụ / Tên đăng nhập / Vai trò` rồi mới
hỏi xác nhận. Thấy `Unknown arguments: t.id,, t.ten_dang_nhap,, …` là script
**chưa vá** — dừng, kiểm lại `scripts/dat-lai-mat-khau.mjs` (phải là
`execFileSync(process.execPath, …)`, **không** có `shell: true`).
Không muốn đổi mật khẩu ai thì Enter trống → `Đã HUỶ — không ghi gì cả.`

## Bước 2 — Nạp cột cờ quyền `duyet_gopy` (BẢN THẬT)

```bash
node scripts/chay-migration.mjs them-quyen-duyet-gopy.sql --remote
```

**Kiểm:** không có dòng đỏ
`CHECK constraint failed: backfill_duyet_gopy_phai_bat_dung_1_nguoi`. Rồi:

```bash
npx wrangler d1 execute crm-agc --remote --command "SELECT t.ten_dang_nhap, n.ho_ten FROM tai_khoan t JOIN nhan_su n ON n.id = t.nhan_su_id WHERE t.duyet_gopy = 1"
```

Phải ra **đúng 1 dòng, đúng tên Bùi Thị Ngọc**. Ra 0 dòng hoặc ra tên người
khác (số điện thoại cũ của Sếp nay là của người khác) thì bật tay:
`UPDATE tai_khoan SET duyet_gopy = 1 WHERE ten_dang_nhap = '<số của Sếp>'`.

## Bước 3 — Nạp cột đồng hồ `cho_duyet_tu_luc` (BẢN THẬT)

```bash
node scripts/chay-migration.mjs them-gopy-cho-duyet-tu-luc.sql --remote
```

**Kiểm:** không có `CHECK constraint failed: backfill_cho_duyet_tu_luc_khong_duoc_sot_dong`. Rồi:

```bash
npx wrangler d1 execute crm-agc --remote --command "SELECT COUNT(*) AS con_sot FROM gop_y WHERE cho_duyet_tu_luc IS NULL"
```

Phải ra **`con_sot = 0`**.

## Bước 4 — Đặt kênh riêng của Sếp

Sếp nhắn `/start` cho bot trong **chat 1-1** (không phải nhóm) → lấy chat id →

```bash
npx wrangler secret put TELEGRAM_CHAT_ID_SEP
```

**Kiểm:**

```bash
npx wrangler secret list
```

Phải thấy **cả hai** tên `TELEGRAM_CHAT_ID` và `TELEGRAM_CHAT_ID_SEP`. Giá trị
thì `secret list` không in ra được — đối chiếu bằng mắt lúc dán: chat riêng
thường là số **dương**, nhóm là số **âm**, và hai số phải khác nhau **thật sự**
(ERP so bằng số nên `-01002222` và `-1002222` bị bắt là **một**). Dán trùng thì
ERP trả 409 chứ không phát mật khẩu — nhưng đừng dựa vào cái chốt đó.

## Bước 5 — Deploy code (làm NGAY sau bước 3, đừng để qua đêm)

```bash
git push origin main
```

**Kiểm:** GitHub Actions xanh, rồi `Ctrl+Shift+R` ở trình duyệt và **đăng nhập
được bằng CẢ hai tài khoản**: Sếp Ngọc và anh Phong. Anh Phong vẫn **xem** được
mọi góp ý, chỉ **mất nút duyệt/từ chối ở cấp cuối**.

## Bước 6 — Thử đường khôi phục trên bản thật, ĐÚNG MỘT LẦN

Anh Phong bấm **"Đặt lại mật khẩu"** ở tài khoản Sếp.

**Kiểm:** (a) hộp thoại trả **200** và nói *"mật khẩu tạm không hiện ở đây"*;
(b) **Sếp** nhận mật khẩu ở **chat riêng**; (c) **nhóm chung** có dòng
`[Bảo mật] … vừa khôi phục đăng nhập cho …` **không kèm mật khẩu**. Bấm **lần
hai ngay** → phải ra **429** kèm câu *"trong 5 phút chỉ làm được một lần"*.
Sếp đăng nhập bằng mật khẩu tạm → hệ thống bắt đổi mật khẩu ngay.

## Bước 7 — Thử đồng hồ SLA trên một góp ý đang chờ cổng 1

```bash
npx wrangler d1 execute crm-agc --remote --command "SELECT id, trang_thai, next_owner, cho_duyet_tu_luc FROM gop_y WHERE next_owner = 'QL_CAP1' ORDER BY id DESC LIMIT 3"
```

Chọn một `id`, bấm **"giao người phụ trách"** trên giao diện rồi chạy lại câu
trên: `cho_duyet_tu_luc` **không được đổi**. Rồi **duyệt** → **hoàn tác** → chạy
lại: `cho_duyet_tu_luc` phải **về đúng giá trị cũ**.

---

## Đường lui

```bash
npx wrangler d1 execute crm-agc --remote --file=migrations/lui/lui-gopy-cho-duyet-tu-luc.sql
npx wrangler d1 execute crm-agc --remote --file=migrations/lui/lui-quyen-duyet-gopy.sql
```

Giá trị cũ của đồng hồ cất ở bảng `gopy_cho_duyet_luu_lui`. **Lùi là mở lại cửa
14 và 17** — biết rồi hãy lùi, và lùi thì phải lùi cả code.

## Nếu Sếp không đăng nhập được sau khi triển khai

```bash
node scripts/dat-lai-mat-khau.mjs <số điện thoại của Sếp> --remote
```

Nó in ra đang đổi cho ai rồi mới hỏi; gõ lại số điện thoại để xác nhận. Tài
khoản đang bị khoá thì cùng câu lệnh đó bật lại `kich_hoat = 1`. Mất luôn cả cờ
duyệt thì:

```bash
npx wrangler d1 execute crm-agc --remote --command "UPDATE tai_khoan SET duyet_gopy = 1, kich_hoat = 1 WHERE ten_dang_nhap = '<số của Sếp>'"
```
