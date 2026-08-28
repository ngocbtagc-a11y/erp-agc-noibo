# REV-0028 — CTL-0014 Đợt 1: thông báo tin nhắn lên điện thoại

- **Vòng**: CTL-0014 · yêu cầu gốc của **Phạm Thị Lan** ("Không hiện thông báo khi có tin nhắn đến")
- **Nhánh**: `feature/ctl-0014-thongbao-tinnhan` · **HEAD thật = `f453a65`** (Gạo được báo `b1f2331`; có thêm 1 commit vá nút 44px)
- **Người soát**: HỒ LY · 28/08/2026 · **Rủi ro**: HIGH (mã hoá tự viết + chạm chuông đang gánh cảnh báo đơn hoàn)
- **Kết luận**: **FIX_REQUIRED** — mã hoá **ĐÚNG CHUẨN, chứng minh bằng vector RFC**; lỗi nằm ở **xử lý hỏng** và ở **sự im lặng**.

---

## Câu 1 — Mã hoá tự viết: ĐẠT, chứng minh bằng công cụ độc lập

Không tin bàn thử của Khỉ Đột: nó giải mã bằng **cùng WebCrypto, cùng cách hiểu** → hiểu sai giống nhau thì vẫn "đạt". Hồ Ly dựng hai nguồn đối chứng **bên ngoài**:

| Phép đo độc lập | Kết quả |
|---|---|
| **Vector thử chính thức RFC 8291 §5** (khoá, muối, khoá tạm cố định của RFC) | Gói ra **trùng TỪNG BYTE 144/144** với gói mẫu in trong RFC |
| IKM · CEK · NONCE so với **RFC 8291 Phụ lục A** | Trùng cả 3 |
| Giải mã bằng **`node:crypto`** (ECDH + `hkdfSync` + `aes-128-gcm`, **không** WebCrypto) | **8/8 ca** ra đúng bản rõ: 1 ký tự · JSON thật · tiếng Việt có dấu · emoji 4 byte · 1.000/3.000/4.090 ký tự |
| Chữ ký VAPID thẩm định bằng `crypto.verify` (`ieee-p1363`) | Hợp lệ · `aud` = gốc endpoint · `exp` 12h ≤ 24h · r‖s 64 byte, không bọc DER |
| **Ca đối chứng**: lật 1 bit chữ ký | Thẩm định **trượt** → phép đo có nhạy thật |

→ **24/24 đạt.** Không phải "tự nghĩ ra cách chạy được" — khớp đúng chữ RFC 8291/8188/8292. **Khoá riêng VAPID không rò**: không có trong JSON trả về, `console.error`, hay thông báo lỗi (đo bằng cách bắt log rồi so với chuỗi khoá thật).

### ⛔ H1 — khoá VAPID đặt sai thì **XOÁ SẠCH đăng ký của toàn công ty**
`webpush.js:guiMotDangKy` gộp lỗi *của đăng ký* và lỗi *khoá VAPID của ta* vào cùng một
`catch` rồi trả `chet:true`; `dayToiNguoi` thấy `chet` là `DELETE`. Đo thật (dán nhầm chuỗi vào `VAPID_KHOA_BI_MAT`): **3/3 đăng ký của chị Lan bị xoá ngay tin đầu tiên** — `{"gui":0,"hong":0,"xoa":3}`. Cùng lỗi áp cho **401/403** (khoá lệch) và **429** (bị chặn tốc độ): 10 lượt là xoá. Nhân viên phải tự bật lại **từng máy**, **không ai được báo**. **Vá**: chỉ `chet` khi lỗi thuộc *đăng ký* (`p256dh`/`auth` sai độ dài) hoặc mã **404/410**;
lỗi khoá VAPID và 401/403/429 → **không xoá**, ghi log + báo Telegram.

Đường lùi khác đã đo đạt: 410 → xoá đúng · 500 lặp 12 lượt → dọn sau 10 lượt, **không kẹt vòng lặp**. Điểm nhỏ **M5**: `rs` khai 4096 nhưng không chặn độ dài — 4.090 ký tự ra thân bản ghi 4.107 byte, vượt `rs`, máy nhận từ chối. Nội dung thật ~230 byte nên chưa chạm.

## Câu 2 — "12 thông báo/ngày": THẬT, đo lại bằng kịch bản khác

Kịch bản riêng của Hồ Ly: **Thứ Hai ở kho, 9 người nhắn riêng cho chị Lan, 6 tin/lượt, 24 lượt rải 8h–18h = 1.296 tin**, chị Lan có **3 máy** → **ĐO ĐƯỢC 12 thông báo/máy (12/12/12)**. Sang ngày mới trần mở lại (12→13). 23:58 giờ VN → 0.

**7 chốt chặn — gỡ từng chốt.** Bàn thử của Khỉ Đột chỉ có ca đối chứng cho **6**. Hồ Ly bổ sung 2 chốt nó bỏ sót, gỡ bằng regex rồi nạp lại: ④ cửa giờ `duocGuiNhac()` → `day` đổi `false→true` ✔ · ⑧ chưa bật máy nào → đổi ✔. Cả 8 chốt đều có phép đo **nhạy thật**.

**Lời khai "tắt riêng tin nhắn thì cảnh báo đơn hoàn không tắt theo" — đo thật, ĐÚNG.** `push_chat_tat=1` → 0 gói đẩy chat, cảnh báo đơn hoàn **vẫn vào chuông ERP (1 tin)**. Bổ sung một sự thật cho Sếp: **cảnh báo đơn hoàn hôm nay KHÔNG đi qua Web Push** (nó vào bảng `thong_bao` + Telegram). Rủi ro "tắt ở tầng hệ điều hành là mất tiền" **chưa xảy ra hôm nay**, nhưng sẽ xảy ra ngay khi Đợt 2 đẩy đơn hoàn qua kênh này — trần 12 là đúng chỗ.

### ⛔ M1 — `sw.js` gộp **mọi người gửi** vào một `tag`, làm hỏng chốt gộp theo-người-gửi
`public/sw.js`: `tag: d.loai === 'chat' ? 'chat' : ...` — hằng số `'chat'`, **không theo người gửi**, kèm `renotify:false`. Máy chủ cố ý cho 2 người khác nhau = 2 thông báo (đo được 2), nhưng trên màn hình khoá tin anh Duy **thay thế** tin chị Hằng và **không kêu lại lần nào**. Chị Lan thấy 1 dòng, tưởng 1 người nhắn. Chú thích trong file ghi "cùng một người" — **sai với code**. **Vá**: `tag: 'chat:' + <id người gửi>`.

### M2 — nhịp tim `dang_mo` ghi D1 mỗi 6 giây, ăn hạn mức ghi (free 100.000 dòng/ngày)
`src/index.js:chatDanhSach` chạy `UPDATE tai_khoan SET xem_chat_voi...` mỗi lượt hỏi lại. 1 người mở cửa sổ chat 10 tiếng = **6.000 lượt ghi/ngày**; 20 người = **120.000 > hạn mức free**. "Chi phí 0" hỏng ở đây trước. **Vá rẻ**: chỉ đóng dấu tối đa 30 giây/lần.

## Câu 3 — Riêng tư: ĐẠT, không tìm ra đường lọt nội dung

`loiThongBao()` chỉ có `💬 <tên người gửi>` + "Gửi bạn một tin nhắn mới". Soi 4 đường — tiêu đề · thân · `data` · log máy chủ — **không đường nào mang chữ của tin nhắn**. Gói luôn `aes128gcm` (đã chứng minh ở Câu 1) nên Google chỉ chuyển hộ. Nhánh dự phòng của `sw.js` cũng chỉ "Bạn có thông báo mới"; thông báo tầng tab-nền còn kín hơn (không nêu cả tên).

**Nhưng cắt quá tay ở chỗ bấm vào (M3)**: `duong_dan: '/app.html#chat'` **không kèm id người gửi**, và `sw.js` → `postMessage` → `moPopup()` chỉ **mở kênh chung**. Đã cố ý giấu nội dung thì cú bấm **bắt buộc** phải mở đúng đoạn chat, không thì chị Lan biết "anh Duy nhắn" rồi vẫn phải tự đi tìm. Chú thích code khai "mở ĐÚNG đoạn chat đó" — **sai với code**.

## Câu 4 — iPhone và người bị bỏ lại im lặng: **CÓ khoảng trống thật (H2)**

`hoiQuyenDuoc()` chặn hỏi quyền trên iPhone chưa "Thêm vào màn hình chính" — đúng. Câu chữ
hướng dẫn iPhone **có**, câu chữ cho người lỡ bấm **Chặn** cũng **có**. Vấn đề: **cả hai chỉ nằm
trong `#tbdCaiDat`, mà bảng đó `hidden` cho tới khi người dùng tự bấm nút 🔔.** `veTrangThaiTB()`
chỉ ghi chữ vào ô đang ẩn; nút 🔔 chỉ mờ khi `chatTat`, **không đổi hình khi "chưa bật / bị chặn /
iPhone chưa cài"**. → Chị Lan trên iPhone chưa cài PWA, hoặc bất kỳ ai lỡ bấm Chặn, **không nhận
được gì và không có một dấu hiệu nào cho biết mình không nhận được**. Lớp ① (âm + rung) chỉ sống
khi ERP **đang mở**, mà iOS không có `navigator.vibrate` — iPhone đóng app là im tuyệt đối.
**Vá rẻ**: cho nút 🔔 trạng thái nhìn-là-biết (🔕 + chấm cam) khi chưa thật sự nhận được, và hiện
dải `#tbdMoi` (đổi chữ, ẩn nút "Bật") cho hai ca iPhone-chưa-cài và đã-bị-Chặn, thay vì `return`
im lặng trong `moiBatNeuNen()`. Thời điểm hỏi quyền thì **đúng bài**: chỉ sau khi vừa gửi hoặc
vừa mở một cuộc chat riêng; "Để sau" hoãn 7 ngày, bị Chặn hoãn 30 ngày; không hỏi lúc đăng nhập.

## Câu 5 — Ba lệnh triển khai: **hiện KHÔNG có cách tự phát hiện (H3)**

| Thiếu | Chuyện gì xảy ra | Ai biết |
|---|---|---|
| Bước 1 (migration) | `xetDayChat` ném "no such column", bị `try/catch` nuốt; `/api/push/khoa` lỗi → `TBDay.nap()` `catch` → **giao diện tự ẩn phần thông báo** | **Không ai** |
| Bước 2–3 (khoá VAPID) | `khoaVAPID()` trả `null`, `dayToiNguoi` thoát êm, không log | **Không ai** |

Đúng kiểu hỏng hôm nay đang chống. **Cách rẻ nhất (0 đồng, không thêm cron)**: trong
`scheduled()` sẵn có, thêm ~8 dòng chạy **một lần mỗi ngày lúc 9h VN**:
`SELECT 1 FROM push_dangky LIMIT 1` (bắt lỗi = chưa nạp migration) và `if (!khoaVAPID(env))`
→ `guiTelegram()` một dòng cho Gạo. Dùng lại đúng cron của ADR-0013.

**M4 — sổ ghi migration lệch thực tế.** `HUONG-DAN-DEPLOY.md` bảo chạy `npm run nap-daythongbao`
(= `wrangler d1 execute --file` trần), **không ghi vào `schema_migrations`**. Kho mã có sẵn
`scripts/chay-migration.mjs` sinh ra đúng để tránh chuyện này, nên `npm run migration-kiemtra`
sẽ **mãi mãi báo "them-day-thongbao.sql chưa chạy"**. **Vá**: đổi lệnh sang
`node scripts/chay-migration.mjs them-day-thongbao.sql --remote`.

## Các mục còn lại

- **42 phép kiểm**: chạy lại toàn bộ → **ĐẠT 42 · TRƯỢT 0**. Dựng lại độc lập L4 (gộp 60s), L8 (trần ngày), L9 (dọn 410) → ra cùng số. Bàn thử chạy **D1 thật + router thật**, không khớp chuỗi.
- **Nút 44px**: tự đo bằng trình duyệt ở **375px và 320px** — 7/7 nút đúng **44px**; bản đối chứng gỡ luật ra 20–25px → phép đo nhạy thật; thanh tiêu đề 73px, **không tràn ngang**.
- **2 nút cũ 24px (`←`, `✕`)**: **KHÔNG né** — commit `f453a65` đã vá, đo lại **44×44px**. Lời khai "còn nợ" đã cũ.
- **Cron mới**: KHÔNG có. `wrangler.toml` không đổi một chữ; `donNhatKyCu()` bám cron sẵn có; cửa giờ dùng nguyên `duocGuiNhac()` của ADR-0013, không có khung giờ thứ hai ✔ đúng CTL-0014 §6.
- **Đụng cảnh báo đơn hoàn**: KHÔNG — 0 dòng thêm vào `thong_bao`; `push_chat_tat` là cột riêng.
- **L4 (LOW)**: `pushDangKy` có `ON CONFLICT(endpoint) DO UPDATE SET nhan_su_id = excluded.nhan_su_id` — người trong nhà biết endpoint của người khác thì giành được máy đó. Nên chặn khi `nhan_su_id` đang khác.

---

## Bảng lỗi

| Mã | Lỗi | Mức | Chặn phát hành |
|---|---|---|---|
| **H1** | Khoá VAPID sai / 401 / 403 / 429 → **xoá sạch đăng ký của mọi nhân viên**, im lặng (đo: 3/3 bị xoá) | **HIGH** | **CÓ** |
| **H2** | iPhone chưa cài PWA & người lỡ bấm Chặn: **không nhận được gì, cũng không có dấu hiệu nào báo** | **HIGH** | **CÓ** |
| **H3** | Thiếu 1 trong 3 bước triển khai → **im lặng tuyệt đối**: không log, không Telegram, giao diện tự ẩn | **HIGH** | **CÓ** |
| **M1** | `sw.js` dùng `tag:'chat'` chung mọi người gửi + `renotify:false` → tin người sau **thay tin người trước, không kêu lại** | MEDIUM | **CÓ** |
| **M2** | Nhịp tim `dang_mo` ghi D1 mỗi 6 giây — tới **120.000 lượt ghi/ngày**, vượt hạn mức free | MEDIUM | Không |
| **M3** | Bấm thông báo chỉ mở kênh chung, **không mở đúng đoạn chat** (chú thích khai ngược) | MEDIUM | Không |
| **M4** | Migration nạp bằng lệnh trần → `schema_migrations` không ghi nhận, `migration-kiemtra` báo sai mãi | MEDIUM | Không |
| **M5** | Không chặn độ dài: > ~4.070 byte thì thân bản ghi vượt `rs=4096`, máy nhận từ chối | LOW | Không |
| **L4** | `pushDangKy` cho phép giành `endpoint` của người khác | LOW | Không |

**Phần mã hoá — chỗ Gạo lo nhất — lại là phần chắc nhất của bản này.** Bốn chỗ chặn phát hành
đều nằm ở *xử lý hỏng* và ở *sự im lặng*, không ở phép toán. Vá H1·H2·H3·M1 rồi soi lại vòng 2.
