# ADR-0015 — Góp ý ERP: chỉ Sếp Bùi Thị Ngọc duyệt ở cấp cuối

- **Ngày:** 2026-08-28 · **Người quyết:** Sếp Bùi Thị Ngọc (ERP Owner)
- **Trạng thái:** Đã chốt, đã dựng (nhánh `feature/gopy-chi-sep-ngoc`)
- **Thay đổi:** ADR-0006 B4/B6 và SPEC-0002 — chỉ đổi *ai* là ERP Owner,
  không đổi luồng duyệt.

## Nguyên văn của Sếp

> "riêng cái góp ý ERP **đừng để sếp Phong duyệt, 1 mình tao duyệt hết** nhé"

Khi được nêu rủi ro "Sếp vắng thì góp ý đọng":

> "cứ để tao duyệt 1 mình, **tao duyệt đt cũng được**"

## Bối cảnh

Anh **Nguyễn Duy Phong** là Giám đốc, tài khoản vai trò `admin`, **toàn quyền
mọi thứ khác** trong ERP. Cổng duyệt SPEC-0002 xác định ERP Owner bằng
`laAdmin(vai_tro)` — nên anh Phong duyệt được góp ý y như Sếp. Sếp muốn giữ
riêng quyết định "công ty sẽ sửa cái gì trong ERP" cho một người.

## Quyết định

1. **Cấp cuối chỉ Sếp Ngọc.** Xác định bằng **cờ `tai_khoan.duyet_gopy`**,
   không phải vai trò, không phải id viết cứng trong code.
2. **Anh Phong VẪN XEM ĐẦY ĐỦ** — mọi góp ý, mọi trạng thái, mọi lịch sử,
   ghi chú nội bộ, mức rủi ro, link PR. Mất **đúng** nút duyệt/từ chối ở cấp
   cuối. Cắt rộng hơn thế là cắt quá tay.
3. **Cấp 1 của quản lý phòng GIỮ NGUYÊN.** Sếp là người duy nhất duyệt cấp
   cuối nên lớp lọc cấp 1 càng quan trọng — bỏ đi là dồn hết lên một người.
4. **Chặn ở MÁY CHỦ.** Anh Phong là admin, biết đường thì gọi thẳng API.
   Ẩn nút ở giao diện là hàng rào giấy (đúng lỗi đã làm vòng 2 hỏng, REV-0018).
5. **Điện thoại là đường chính**, không phải đường phụ. Duyệt 1 chạm từ danh
   sách, nút ≥ 44px, danh sách tự cập nhật, có **hoàn tác 15 phút**.

## Vì sao là CỜ QUYỀN, không phải tên người trong code

- Sếp đổi ý cho ai đó duyệt → **bật cờ, không sửa code, không deploy**.
- Sếp đi vắng muốn tạm uỷ quyền → đã có sẵn đường, bật rồi tắt.
- Viết cứng `id`/tên vào code là nợ kỹ thuật: người sau đọc không hiểu vì sao.

Cấp/thu cờ **chỉ người đang giữ cờ** làm được (`POST
/api/quan-tri/quyen-duyet-gopy`) — nếu để admin bật được thì anh Phong tự bật
cho mình trong 5 giây và cả quyết định này thành vô nghĩa. Không tắt được cái
cờ cuối cùng: muốn chuyển giao thì bật cho người mới trước, rồi mới tắt.

## Rủi ro đã nêu với Sếp và Sếp đã chấp nhận

**Một người duyệt = một điểm nghẽn.** Sếp vắng dài ngày thì góp ý đọng ở cổng
2. Ba thứ đỡ sẵn trong hệ thống: (a) rủi ro **LOW không lên Sếp**, quản lý
trực tiếp gật là đủ (~60% số góp ý — ADR-0006 A1); (b) **SLA nhắc** ngày thứ
3 và **tự đẩy lên Sếp** ngày thứ 5; (c) **cờ uỷ quyền** bật/tắt trong 2 chạm.

## Hệ quả

- `tai_khoan.duyet_gopy` là **quyền duy nhất trong hệ thống không đi theo vai
  trò**. Đã ghi rõ lý do ngay tại `duocDuyetGopY()` trong `src/quyen.js` để
  người sau không tưởng là làm ẩu.
- `src/auth.js` `docPhien()` đọc thêm `t.duyet_gopy` → **thứ tự triển khai:
  DB TRƯỚC, CODE SAU**. Deploy code trước khi nạp migration là **mất đăng
  nhập toàn hệ thống**, không riêng màn Góp ý.
- Lùi: `migrations/lui-quyen-duyet-gopy.sql`, và phải **deploy code cũ trước**
  rồi mới lùi DB. Lùi xong quyền quay về "admin nào cũng duyệt được".
- **Ba cửa quản trị không được phép tắt người duyệt** (REV-0027 L3):
  `khoa-tai-khoan`, `xoa-tai-khoan`, `xoa-nhan-su` trả **409** khi đối tượng
  là người **duy nhất** còn `duyet_gopy = 1 AND kich_hoat = 1`. Cửa thứ tư
  `dat-lai-mat-khau` (cửa 5b) **nay đi đường khác** vì Sếp đổi ý 28/08 — xem
  mục "Đường khôi phục đăng nhập cho ERP Owner" bên dưới.
- **Đồng hồ SLA có cột riêng `gop_y.cho_duyet_tu_luc`** (REV-0030 lỗi 1 — cửa
  thứ 14). Trước đó SLA đo tuổi hàng chờ bằng `cap_nhat_luc`, mà **mọi** lần
  lưu đều ghi cột đó — kể cả nhánh "lưu tại chỗ" không đổi trạng thái và cặp
  vào/ra `bi_chan`. Đo được: việc chờ cổng 1 từ 23/08, admin bấm "giao người
  phụ trách" → `200` → cron **không** đẩy lên Sếp nữa; lặp lại được vô hạn,
  không một dòng cảnh báo, **nổ cả khi không ai cố ý**. Tức là **phá đúng chỗ
  đỡ (b)** mà ADR này hứa với Sếp cho rủi ro "một người duyệt". Nay
  `cho_duyet_tu_luc` chỉ đóng dấu khi việc THẬT SỰ sang một hàng chờ mới (gửi
  mới · qua một cổng duyệt · đổi trạng thái); "bị chặn" là **đóng băng**, giữ
  nguyên mốc cũ. Migration `them-gopy-cho-duyet-tu-luc.sql` (lùi:
  `lui-gopy-cho-duyet-tu-luc.sql`); thiếu cột thì code tự lùi về đo bằng
  `cap_nhat_luc` kèm `console.warn`, không 500.
- **Hỏng an toàn nhưng KHÔNG im lặng nữa** (REV-0030 lỗi 5): thiếu cột
  `duyet_gopy` nay ghi một dòng `console.warn` (đọc được trên Workers Logs vì
  `[observability]` đang bật) **và** bắn **một** tin Telegram/ngày, chống lặp
  bằng `sao_luu_canh_bao`. Thêm chốt tự phát hiện trong cron 5 phút đã có:
  còn tài khoản hoạt động mà **không ai giữ cờ** → báo Telegram kèm câu lệnh
  sửa.
- 🔴 **LỖ DỮ LIỆU — khôi phục bản sao lưu chụp TRƯỚC migration.** Cột
  `duyet_gopy` không có trong file CSV cũ → mọi dòng về mặc định `0` → **không
  ai duyệt được, và không ai bật lại được từ trong ERP** (cấp cờ chỉ người
  đang giữ cờ làm được). Đây là **đường thứ 8** làm cờ mất hiệu lực, không nằm
  trong bảy đường REV-0027 đã bịt. Chốt tự phát hiện ở trên sẽ kêu trong vòng
  5 phút; sửa bằng lệnh `wrangler` ở mục Đường cứu.
- **Góp ý của chính Sếp cũng được Hồ Ly chấm** (REV-0030 lỗi 6):
  `hoLyTuDongTriage` quét cả `cho_phan_tich`, không chỉ `moi` — vì từ Việc 7,
  góp ý của người giữ cờ vào thẳng `cho_phan_tich` nên trước đó **không bao
  giờ** được máy chấm, Sếp mất bản nháp `de_xuat_spec` cho đúng những việc
  mình quan tâm nhất.
- **Gửi lại sau khi bị từ chối cũng theo Việc 7** (REV-0030 cửa 15): người
  không có ai ở cấp 1 gửi lại thì lên thẳng Sếp, kèm một dòng lịch sử nói rõ
  lý do — không tụt về `QL_CAP1` để rồi SLA ghi "quá 5 ngày chưa có ai duyệt ở
  cấp quản lý" trong khi **không có quản lý nào**. Và admin gửi lại **hộ**
  người khác thì sổ ghi đúng "X gửi lại hộ Y", không ghi "Người gửi đã sửa"
  (cửa 16).
- **Thiếu cột `duyet_gopy` không còn làm sập đăng nhập:** `docPhien()` bắt
  đúng lỗi `no such column` rồi lùi về `0 AS duyet_gopy` → cờ về `false`, hệ
  thống chạy tiếp ở mức không-quyền. Thứ tự "DB trước, code sau" **vẫn giữ**,
  nhưng nay nó là quy trình chứ không còn là điều kiện sống còn.
- **Migration tự kiểm:** `them-quyen-duyet-gopy.sql` gãy bằng `CHECK
  constraint failed: kiem_backfill_duyet_gopy` nếu backfill bật cờ cho khác 1
  tài khoản. Không còn ca "migration báo thành công mà không ai duyệt được".
- **Không ai duyệt góp ý của chính mình** (Sếp chốt 28/08/2026, sau khi dùng
  thật): người **giữ cờ** gửi góp ý thì vào thẳng `cho_phan_tich`; người
  **không có ai ở cấp 1** (quản lý phòng/trưởng phòng) bỏ qua cổng 1, lên
  thẳng Sếp; nhân viên thường vẫn đi đủ hai cổng. Mỗi ca bỏ qua ghi **một
  dòng lịch sử** nói rõ lý do — bỏ qua âm thầm là sai.

## Đường khôi phục đăng nhập cho ERP Owner (Sếp chốt 28/08/2026 — REV-0030 lỗi 2)

Nguyên văn của Sếp, sau khi nghe REV-0027 khoá cửa `dat-lai-mat-khau` bằng 403:

> "**cho a ấy duyệt khôi phục cho tôi đi chứ**"

**Quyết định: tách "ai được bấm" khỏi "ai nhận được mật khẩu".**

- Anh Phong (admin) **bấm được** → `200`. Không còn 403.
- Mật khẩu tạm **không hiện ra cho anh**: JSON trả về **bỏ hẳn** trường
  `mat_khau_tam` (bỏ khoá, không phải để rỗng — BH-44), trả
  `{ok:true, da_gui_kenh_rieng:true}`.
- Mật khẩu tạm đi vào **chat Telegram 1-1 giữa Sếp và chính con bot đang
  chạy**: `guiTelegram(env, text, env.TELEGRAM_CHAT_ID_SEP)`. Đây là **mở
  rộng một tham số** của hàm đã chạy thật, không đẻ cơ chế thứ hai — ERP chưa
  từng gửi mail (`grep smtp|resend|mailgun|MailChannels` ra 0 kết quả) và
  `guiThongBao` thì nằm **trong** ERP, vô dụng đúng lúc Sếp không vào được.
  **Chi phí 0.**
- **Chưa cấu hình `TELEGRAM_CHAT_ID_SEP` → 403 như cũ.** Không có đường giao
  an toàn thì không mở cửa.
- **Gửi trước, ghi sau.** Telegram không nhận → `502` và **không đụng** mật
  khẩu hiện tại. Đổi hash rồi mới phát hiện không gửi được là khoá chết tài
  khoản Sếp bằng chính đường cứu.
- Anh bấm xong **tự đăng nhập ngay thì không vào được** — cái chặn thật nằm ở
  đường đi của bí mật, không nằm ở một câu `if`.
- **Phát hiện được, không làm lén được:** Telegram **nhóm chung** nhận một
  dòng `[Bảo mật] X vừa khôi phục tài khoản Y lúc Z` (không kèm mật khẩu),
  Sếp nhận một tin trong ERP nói rõ ai bấm và lúc nào, và ghi **một dòng
  `nhan_su_lich_su`** (`loai_su_kien = 'khoi_phuc_dang_nhap'`) — không phải
  chỉ một dòng log.
- `phai_doi_mk = 1` + `DELETE FROM phien` giữ nguyên: Sếp buộc đổi mật khẩu
  ngay lần đăng nhập đầu.
- **Không siết oan:** khôi phục cho **người thường** vẫn `200 + mat_khau_tam`
  như cũ; chính chủ tự đặt lại mật khẩu của mình cũng vậy.

**Năm đường rò đã soi và bịt** (mật khẩu tạm không được lọt đường nào):

| # | Đường | Cách bịt |
|---|---|---|
| a | JSON trả về | bỏ hẳn khoá `mat_khau_tam` |
| b | Workers Logs (`[observability]` đang bật) | không `console.log/error` mật khẩu ở bất kỳ nhánh nào |
| c | bảng `thong_bao` — **nằm trong bản sao lưu CSV đẩy lên Drive** | tin báo cho Sếp không kèm mật khẩu |
| d | Telegram **nhóm chung** | tin "[Bảo mật]" là tin khác, không kèm mật khẩu |
| e | `tai_khoan` trong bản sao lưu | vốn chỉ có hash — giữ nguyên |

**Cài đặt một lần:** Sếp nhắn `/start` cho bot → lấy chat id →
`npx wrangler secret put TELEGRAM_CHAT_ID_SEP`.

## Đường cứu tầng DB — mất điện thoại, quên mật khẩu, mất luôn Telegram

Cờ duyệt chỉ đi ra từ tay người đang giữ nó, nên nếu Sếp **không đăng nhập
được** thì không còn ai bật cờ cho ai. Đây là đường cứu chính thức, chạy thẳng
ở tầng DB — cố ý **không** đi vòng qua tài khoản admin.

**① Bật lại cờ duyệt** (dùng cả cho lỗ dữ liệu "sao lưu chụp trước migration"):

```
npx wrangler d1 execute crm-agc --remote \
  --command "UPDATE tai_khoan SET duyet_gopy = 1, kich_hoat = 1 WHERE ten_dang_nhap = '<số mới của Sếp>'"
```

Trước đây câu này chỉ nằm ở chú thích cuối `migrations/them-quyen-duyet-gopy.sql`
— đường cứu giấu trong comment migration thì coi như không có.

**② Đặt lại MẬT KHẨU** (REV-0030 lỗi 3 — **trước bản này KHÔNG CÓ đường nào**):

```
node scripts/dat-lai-mat-khau.mjs <số điện thoại> --remote
```

Tin xấu phải nói thẳng: câu `wrangler` ở ① **cứu được cái cờ, không cứu được
lối vào** — `mat_khau_hash` là PBKDF2, không ai gõ tay ra được. Và
`scripts/tao-tai-khoan.mjs` **KHÔNG dùng thay được**: nó ghi `seed.sql` với
`DELETE FROM ...` **xoá sạch dữ liệu cũ** rồi INSERT lại hai admin — chạy trên
bản thật là **mất công ty**. Nghĩa là suốt thời gian qua, *quên mật khẩu + hỏng
đường khôi phục = không còn cách nào vào*.

`scripts/dat-lai-mat-khau.mjs` đóng đúng lỗ đó, và tự trói mình bằng ba luật —
**có bàn đo chứng minh, không phải lời hứa**:

1. **Đúng một tài khoản**, tra theo tên đăng nhập. Không có `--tat-ca`.
2. **Không một câu xoá nào.** Cả file sinh ra đúng một câu ghi:
   `UPDATE tai_khoan SET mat_khau_hash = ?, phai_doi_mk = 1 WHERE ten_dang_nhap = ?`
   Không DELETE, không DROP, không ghi `seed.sql`, không đụng bảng nào khác —
   kể cả `phien` (muốn đá phiên cũ thì dùng nút trong tab Quản trị).
3. **In rõ đang đổi cho ai rồi mới hỏi.** Không gõ lại đúng số điện thoại thì
   DỪNG, không ghi gì. Chạy không có bàn phím (CI/cron) → đọc phải EOF → cũng
   DỪNG.

Bàn đo `scripts/do-quyen-duyet-gopy.mjs` chụp **toàn bộ** CSDL trước và sau khi
chạy câu ghi ấy rồi so từng bảng: đúng 1 bảng đổi, 0 dòng mất, đúng 1 dòng
trong `tai_khoan`, đúng 2 cột, cờ `duyet_gopy` không bị đụng, và hash sinh ra
đăng nhập được bằng chính `kiemTraMatKhau()` của `src/auth.js`. Kèm ca đối
chứng cho chính phép so đó (cố ý `DELETE FROM nhan_su` — phép đo bắt được).
