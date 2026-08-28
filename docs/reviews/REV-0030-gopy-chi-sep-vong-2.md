# REV-0030 — Góp ý chỉ Sếp Ngọc duyệt · VÒNG 2

- **Soi:** worktree `agc-spec0002`, `feature/gopy-chi-sep-ngoc`, `d06446a` · **Hồ Ly** · 28/08/2026
- **Vòng 1:** REV-0027 (`2e5084d`). Câu 3 (anh Phong 40/40 khoá) và Câu 5 (5 điểm chạm) **không soi lại**.
- **Kết luận: FIX_REQUIRED** — 1 vì Sếp đổi yêu cầu (Câu 2 làm lại), 1 cửa mới tự tìm được, 1 trùng số BH.
- Đã tự chạy: bàn đo 90 phép, bàn đo tương phản trên **cả hai cây**, 3 bàn đo tự viết. Lời khai không được tin, số dưới đây là số chạy ra.

## Câu 1 — Có cửa thứ 14 không? **CÓ. Thủng 3/16.**

Không liệt kê endpoint. Đếm từ **phía dữ liệu**:

**Bao nhiêu đường ghi được `gop_y.trang_thai`/`next_owner`? — 8.** `gopYGui` (INSERT) · `gopYDuyet` (2 nhánh) · `gopYDoiTrangThai` · `gopYHoanTac` · cron `gopYNhacSla` · `hoLyTriageMot` (chỉ `de_xuat_*`, không đụng) · **script khôi phục sao lưu** (`src/khoi-phuc-kem.js` sinh `khoi-phuc.mjs` chạy `INSERT INTO` thẳng, không qua cổng nào). **Trigger: KHÔNG CÓ** — `grep CREATE TRIGGER migrations/ schema.sql` ra 3 file, không file nào đụng `gop_y`. **Nhập liệu hàng loạt: không có đường nào.**

**Bao nhiêu đường làm `tai_khoan.duyet_gopy` mất hiệu lực? — 8.** 1–7 đã bịt hoặc đã có tự kiểm (thu cờ · khoá TK · xoá TK · xoá nhân sự · đặt lại mật khẩu · thiếu cột · backfill hụt). **Đường 8 chưa ai nói tới:** khôi phục một bản sao lưu chụp **TRƯỚC** migration → `duyet_gopy` không có trong CSV → mọi dòng về mặc định `0` → **không ai duyệt được, và không ai bật lại được từ trong ERP**. Chỉ còn lệnh `wrangler` cứu. Phải ghi vào ADR-0015.

**Danh tính — còn đường nào trở thành Sếp? Đo 9 đường (E1–E9), TẤT CẢ ĐÓNG:** đặt lại mật khẩu 403 · khoá TK 409 · xoá TK 409 · xoá nhân sự 409 · tạo tài khoản **thứ hai** cho hồ sơ Sếp bị chặn (`nhan_su_id UNIQUE`) · anh Phong tự bật cờ 403 · **không có endpoint đổi `ten_dang_nhap` hay `nhan_su_id`** · hạ vai trò Sếp xuống nhân viên thì Sếp **vẫn** duyệt và **vẫn** cấp cờ (cờ không đi theo vai trò — đúng ADR) · khoá hồ sơ / gán "đã nghỉ" không đụng cờ · **phiên đang mở mất quyền NGAY khi thu cờ** (đọc live, không cache).

### 🔴 CỬA THỨ 14 — `cap_nhat_luc`: đẩy lùi được đồng hồ SLA (cùng họ với L2)

Khỉ Đột vá `next_owner` mà bỏ quên **đồng hồ**. `gopYNhacSla` đo bằng `julianday(now) − julianday(COALESCE(g.cap_nhat_luc, g.tao_luc))`, mà **mọi** câu UPDATE trong `gopYDoiTrangThai` đều ghi `cap_nhat_luc = now` — kể cả nhánh "lưu tại chỗ" không đổi trạng thái.

Đo được: góp ý #1 chờ cổng 1 từ 24/08 (4 ngày). Anh Phong bấm **giao người phụ trách** → `200` → `cap_nhat_luc: 2026-08-24 10:00 → 2026-08-28 10:00` → chạy cron → `next_owner` **vẫn `QL_CAP1`**, SLA **không** đẩy lên Sếp. Chặn-rồi-gỡ-chặn cho kết quả y hệt. Lặp vô hạn, 200, không một dòng cảnh báo, **nổ cả khi không ai cố ý**. Đây là **một trong ba chỗ đỡ ADR-0015 hứa với Sếp** cho rủi ro "một người duyệt"; rút được nó ra là rút việc khỏi hàng chờ của Sếp vô thời hạn — đúng loại lỗi L1/L2, chỉ khác cột.
→ **Vá:** SLA đo bằng cột riêng `cho_duyet_tu_luc` (đóng dấu đúng lúc vào hàng chờ), không đo bằng `cap_nhat_luc`. Một cột + một câu WHERE.

### Cửa 15 · 16 (nhẹ, cùng chỗ)

- **15** — `bi_tu_choi → moi` **bỏ quên Việc 7**: người không có ai ở cấp 1 gửi lại thì `next_owner` tụt về `QL_CAP1` (đo: 200, `next=QL_CAP1`). Sếp vẫn thấy trong panel (`app.js gyDangChoToi` có `|| coDuyet`) nên không mất việc, **nhưng** SLA sẽ ghi "quá 5 ngày chưa có ai duyệt ở cấp quản lý" trong khi **không có quản lý nào** — hồ sơ nói sai. Và ca này **không ghi dòng lịch sử bỏ qua**, khác hẳn lúc gửi mới.
- **16** — admin gửi lại hộ góp ý của **người khác** được (đo: 200), dòng lịch sử ghi "Người gửi đã sửa và gửi lại (lần 1)" trong khi người bấm là anh Phong. Truy được nhờ `nguoi_doi_ten`, nhưng chữ sai.

## Câu 2 — **PHẢI LÀM LẠI.** Khỉ Đột chưa làm phần này.

Đo hiện trạng: `dat-lai-mat-khau` tài khoản Sếp → **403** (cửa 5 đã bịt); ca ngược người thường → **200 + `mat_khau_tam`** (không siết oan). Theo ý mới của Sếp thì 403 là **quá tay**.

**Kênh gửi — đây là chỗ phương án vướng, phải nói thẳng:**

- `guiThongBao` → bảng `thong_bao`, **trong ERP**. Sếp không đăng nhập được thì vô dụng.
- `guiTelegram(env, text)` → gửi vào **MỘT chat dùng chung** `env.TELEGRAM_CHAT_ID`. Bỏ mật khẩu tạm vào đây là **phát cho cả nhóm, có cả anh Phong**.
- `nhan_su.email` **có cột** nhưng `grep -i "smtp|resend|mailgun|MailChannels|sendMail" src/` → **0 kết quả**. ERP **chưa từng gửi mail**.

→ **Hiện KHÔNG có kênh riêng ngoài ERP nào dùng được.** Không đẻ cơ chế thứ hai, nhưng phải **mở rộng cơ chế đã có**: `guiTelegram(env, text, chatId = env.TELEGRAM_CHAT_ID)` + secret mới `TELEGRAM_CHAT_ID_SEP` (chat 1-1 giữa Sếp và **chính con bot đang chạy**; Sếp nhắn `/start` một lần là xong). Chi phí 0, cùng một hàm, cùng một bot.

**Thông số giao Khỉ Đột:**

1. `dat-lai-mat-khau` với tài khoản **đang giữ cờ** → **200**, nhưng JSON trả về **KHÔNG có trường `mat_khau_tam`** (bỏ hẳn khỏi body, không phải để rỗng). Trả `{ok:true, da_gui_kenh_rieng:true}`.
2. Mật khẩu tạm đi bằng `guiTelegram(env, ..., env.TELEGRAM_CHAT_ID_SEP)`. **Chưa cấu hình secret đó thì trả 403 như hiện nay** — không có đường giao thì không mở cửa.
3. **Chống rò — soi đủ 5 đường:** (a) JSON: bỏ field; (b) **không `console.log/error` mật khẩu** — `wrangler.toml` bật `[observability]`, log vào Workers Logs mà admin Cloudflare đọc được; (c) **không đưa vào `thong_bao`** — bảng này **nằm trong bản sao lưu CSV** (`MO_TA_BANG.thong_bao`), mật khẩu sẽ trôi lên Google Drive; (d) không đưa vào Telegram nhóm chung; (e) `tai_khoan` trong sao lưu chỉ có hash — đường này sạch, giữ nguyên.
4. **Sếp được báo:** `guiThongBao` cho Sếp "**ai** bấm khôi phục, **lúc nào**" (không kèm mật khẩu) + **một dòng `nhan_su_lich_su`** (bảng đã có, `migrations/them-nhansu-lichsu.sql`) — không phải chỉ log.
5. **Phát hiện được, không cần chặn:** anh Phong bấm rồi tự đăng nhập ngay là **không vào được**, vì mật khẩu không đi qua tay anh — đó mới là cái chặn thật. Thêm một dòng Telegram **nhóm chung** "[Bảo mật] X vừa khôi phục tài khoản Y lúc Z" (không kèm mật khẩu) → cả công ty thấy, không làm lén được.
6. `phai_doi_mk = 1` và `DELETE FROM phien` giữ nguyên → Sếp buộc đổi ngay lần đăng nhập đầu.
7. **Ca ngược bắt buộc đo:** khôi phục cho **người thường** vẫn `200 + mat_khau_tam` như cũ.

**Ca bí thật, phải nói ra:** mất điện thoại **và** quên mật khẩu **và** chưa cấu hình `TELEGRAM_CHAT_ID_SEP` → chỉ còn lệnh `wrangler` ở ADR-0015. Tôi đã đọc và thử theo ADR-0015: lệnh `UPDATE tai_khoan SET duyet_gopy=1, kich_hoat=1 WHERE ten_dang_nhap=…` **viết đúng, chạy được** — nhưng nó **không đặt lại được mật khẩu** (`mat_khau_hash` là PBKDF2, không gõ tay được). Đường cứu hiện tại **cứu được cái cờ, không cứu được lối vào**. Và `scripts/tao-tai-khoan.mjs` **KHÔNG dùng thay được**: nó ghi `seed.sql` **xoá sạch dữ liệu cũ** rồi INSERT lại — chạy trên DB thật là mất công ty. Vậy **hiện chưa có đường nào đặt lại mật khẩu ở tầng DB**. Phải làm thêm `scripts/dat-lai-mat-khau.mjs` (dùng lại `bamMatKhau` của `src/auth.js`, ra đúng một câu `UPDATE tai_khoan SET mat_khau_hash=?, phai_doi_mk=1 WHERE ten_dang_nhap=?`) và chép vào ADR-0015. **Đừng để phát hiện lúc đang kẹt.**

## Câu 3 — Việc 7: **ĐẠT 7/7**, gồm cả ca ngược

| Tư cách | Đo được | Đúng? |
|---|---|---|
| Sếp (giữ cờ) gửi | `cho_phan_tich`, `duyet_cap1_nguon='TU_DUYET_OWNER'`, đủ 2 dấu duyệt | ✅ |
| Trưởng phòng **có** cấp 1 (Hằng → Sếp) | `moi` / `QL_CAP1` — **vẫn qua cổng 1** | ✅ |
| Người **không có ai** ở cấp 1 (anh Phong) | `moi` / `OWNER` | ✅ |
| **CA NGƯỢC** — nhân viên thường (An) | `moi` / `QL_CAP1`, đủ 2 cổng | ✅ |
| **Vòng lặp** — Sếp là quản lý cấp 1 của chính mình | vẫn 1 nhánh, `cho_phan_tich` | ✅ |

**Cắt quá tay: không có** — bàn đo cũng có ca đối chứng riêng cho chiều này (DC-K) và bắt được. **Dòng lịch sử đọc hiểu được**, không phải mã máy — nguyên văn: *"Bỏ qua cả hai cổng duyệt vì người gửi cũng là người duyệt cấp cuối — không ai duyệt góp ý của chính mình. Rủi ro tạm ghi Trung bình."*

**Nhưng có một cái mất, mức TRUNG BÌNH:** `hoLyTuDongTriage` chỉ quét `trang_thai='moi'`. Góp ý của Sếp vào thẳng `cho_phan_tich` → **không bao giờ được Hồ Ly chấm tự động** (đo: `de_xuat_risk=null`, `tu_dong_xu_luc=null`). Sếp mất bản nháp `de_xuat_spec` cho chính góp ý của mình. Sửa: cho triage quét thêm `cho_phan_tich` khi `tu_dong_xu_luc IS NULL`.

## Câu 4 — Đọc phòng thủ L4: **ĐẠT 6/6 — nhưng im lặng vĩnh viễn**

4 đường sống còn (`/toi-la-ai`, `/danh-ba`, `/thong-bao`, `/kho/san-pham`) đều **200** với phiên nhân viên kho khi thiếu cột; cờ về `false`; Sếp cũng **403** ở cấp cuối. Đúng như khai.

**Nhưng đo thêm — không ai được báo:** `thong_bao +0` · `Telegram +0` · `console.error 0 dòng`. Cột thiếu vì migration chưa chạy thì im lặng cho qua là **đúng lúc này** (khỏi sập), nhưng **không có lối ra**: cả công ty chạy tiếp ở mức không-quyền, cả hàng góp ý đứng, và **không ai biết vì sao**.
→ **Vá 1 dòng:** trong nhánh `catch` của `docPhien`, `console.warn` + `guiTelegram` cảnh báo, chống lặp bằng đúng khuôn `INSERT OR IGNORE INTO sao_luu_canh_bao (khoa)` đã có sẵn trong `src/sao-luu.js`.

## Câu 5 — Tự kiểm backfill L5: **ĐẠT 5/5**, đủ cả ca ngược

`0 người → GÃY` đúng tên `CHECK constraint failed: backfill_duyet_gopy_phai_bat_dung_1_nguoi` ✅ · `đúng sđt → 1 người, không gãy` ✅ · `sđt đã đổi nhưng họ tên khớp → câu backfill 2 cứu` ✅ · `DB trắng → không gãy` ✅ · `đã có sẵn 1 người giữ cờ → chạy lại không gãy oan` ✅. **Ghi thêm vào file:** nếu Sếp **đang uỷ quyền** (2 người giữ cờ) mà ai đó chạy lại chính file này thì **gãy oan** — thực tế `chay-migration.mjs` bỏ qua file đã chạy nên không xảy ra, nhưng người sau phải biết.

## Ngoài ra

- **Bàn đo 90 phép — tự chạy lại: `ĐẠT 90 · TRƯỢT 0`, ca đối chứng `10/10`**, gồm cả chiều **cắt quá tay** (DC-C cắt quyền xem, DC-K bỏ qua cổng nhầm cho nhân viên) — bắt được cả hai. Bàn đo này thật.
- **Chấm cây cũ `2e5084d` bằng bàn đo mới: `65 ĐẠT / 25 TRƯỢT`** — Khỉ Đột khai **64**/25, và header script viết "89 phép" trong khi chạy ra 90. Lệch 1, chỉ là chữ, nhưng số trong lời khai phải đúng bằng số chạy ra. Sửa 2 chỗ.
- **`do-tuong-phan-mau` — KHÔNG hồi quy, xác minh bằng cách đo cả hai cây:** main `5106ec6` = 176 đạt / **31 trượt** trên 207 cặp; nhánh này = 180 đạt / **31 trượt** trên 211 cặp. `diff` 31 dòng TRƯỢT của hai cây: **giống hệt**, chỉ lệch số dòng CSS. Nhánh này thêm 4 cặp mới và **cả 4 đều đạt**. Địa phận CTL-0023.
- 🔴 **BH-45/46 — TRÙNG SỐ, lần thứ ba trong ngày.** `feature/ctl-0023-dot2-cam` đã dùng **BH-45** ("Phép đo CHỌN TAY…") và **BH-46** ("Một token gánh HAI VAI…") cho hai bài học **khác hẳn**. Hai nhánh gộp vào là đè nhau. → Nhánh này đánh lại **BH-47/48/49**, và Gạo phải cấp số BH tập trung.

## Bảng lỗi

| # | Lỗi | Mức | Chặn phát hành? |
|---|---|---|---|
| 1 | **Câu 2 đổi yêu cầu** — `dat-lai-mat-khau` phải cho anh Phong khôi phục hộ, mật khẩu tạm không được về tay người bấm | CAO | **CÓ** — Sếp đã chốt |
| 2 | **Cửa 14** — `cap_nhat_luc` bị mọi lần lưu tại chỗ / chặn-gỡ chặn ghi đè → đẩy lùi đồng hồ SLA vô hạn, việc không lên Sếp | CAO | **CÓ** — phá đúng chỗ đỡ ADR-0015 hứa |
| 3 | **BH-45/46 trùng số** với `ctl-0023-dot2-cam` | TRUNG BÌNH | **CÓ** — gộp là đè |
| 4 | L4 hỏng an toàn nhưng **im lặng vĩnh viễn**, không ai được báo | TRUNG BÌNH | Không |
| 5 | Khôi phục bản sao lưu chụp **trước** migration → cờ về 0 toàn bộ, ERP không tự bật lại được | TRUNG BÌNH | Không — ghi ADR-0015 |
| 6 | Chưa có đường đặt lại mật khẩu ở tầng DB (đường cứu ADR-0015 cứu cờ, không cứu lối vào) | TRUNG BÌNH | Không — làm cùng lỗi 1 |
| 7 | Góp ý của Sếp không bao giờ được Hồ Ly chấm tự động (mất `de_xuat_spec`) | TRUNG BÌNH | Không |
| 8 | **Cửa 15** — gửi lại sau từ chối bỏ quên Việc 7: `next_owner` tụt về `QL_CAP1` không tồn tại, không ghi lịch sử | THẤP | Không |
| 9 | **Cửa 16** — admin gửi lại hộ người khác, lịch sử ghi "Người gửi đã sửa và gửi lại" | THẤP | Không |
| 10 | Lời khai `64/25` và "89 phép" lệch số đo thật (`65/25`, 90 phép) | THẤP | Không |

**Đúng thì nói thẳng:** Việc 7 làm đúng cả ba tư cách lẫn ca ngược; L4 và L5 đúng; bốn cửa quản trị và cửa 5 khoá chặt; chín đường trở thành Sếp đều đóng; bàn đo 90 phép là bàn đo **thật**, nhạy cả hai chiều. Vòng này Khỉ Đột làm tốt. Chỉ còn **lỗi 1–3** đứng giữa nhánh này và chỗ đẩy được.

## Thứ tự triển khai (sau khi vá xong 1–3)

**DB TRƯỚC, CODE SAU** — vẫn giữ, dù L4 đã làm nó hết là điều kiện sống còn.

1. `npx wrangler d1 execute crm-agc --remote --file migrations/them-quyen-duyet-gopy.sql` (+ migration cột `cho_duyet_tu_luc` của lỗi 2). Gãy `CHECK` thì **DỪNG**, đừng deploy code.
2. Mắt thường: `SELECT t.ten_dang_nhap, n.ho_ten FROM tai_khoan t JOIN nhan_su n ON n.id=t.nhan_su_id WHERE t.duyet_gopy=1` — phải ra **đúng 1 dòng, đúng tên Sếp**.
3. `npx wrangler secret put TELEGRAM_CHAT_ID_SEP` (Sếp `/start` cho bot trước).
4. Deploy code. 5. Sếp thử một góp ý thật trên điện thoại. 6. Anh Phong thử duyệt → phải **403**.
