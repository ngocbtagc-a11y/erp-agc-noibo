# REV-0038 — Vá "ấn Chat ngay không được" + thiết kế lại chat nội bộ

**Soi:** Hồ Ly · 29/08/2026 · worktree `agc-bongbong`, nhánh `fix/bong-bong-che-nut`, commit `239aba7` (nền `a9dc0f1`).
**Cách soi:** tự dựng bàn đo riêng (`holy-do.mjs`, không dùng lại `scripts/do-chat-noibo.mjs`) — Chrome thật qua CDP, **bấm bằng `Input.dispatchMouseEvent`** chứ không phải `.click()` của JS, thu `console` + `Runtime.exceptionThrown`.

## KẾT LUẬN: **FIX_REQUIRED** — 2 việc, ước chừng 10 phút, rồi phát hành ngay

Bản vá **vá đúng gốc** và mọi lời khai kỹ thuật đều **tái lập được**. Nhưng còn 1 lệnh của Gạo chưa thi hành và 1 lỗi màu bản vá tự đẻ ra. Chat đang chết trên bản thật là cứu hoả thật — nhưng hai việc dưới đều là sửa CSS một dòng, không có cớ để bỏ qua.


## Tự vấn — vì sao REV-0028 và REV-0031 bỏ lọt một tính năng CHẾT HOÀN TOÀN

Lỗi này ở trong **quy trình soi**, không ở mã. Năm nguyên nhân, xếp theo sức nặng:

1. **Không vòng nào nạp `app.js` trong trình duyệt.** Cả hai vòng đo bằng *bàn thử hàm thuần* (`tbd-trangthai.js`, `day-thong-bao.js`, `nhip-tim-chat.js`) — logic tách rời, đúng 100%, và mù tuyệt đối với TDZ. TDZ chỉ nổ lúc **nạp**.
2. **Không ai bấm thử.** `do-nut-thongbao-44px.mjs` đo *kích thước*, `do-trangthai-thongbao.mjs` đo *trạng thái*. Không bàn đo nào hỏi "bấm vào có ăn không".
3. **`console.error` không phải là TRƯỢT.** Bản gốc in ra đúng dòng `Cannot access 'TBDay' before initialization` mỗi lần mở ERP — suốt từ `7bf0e58`. Không bàn đo nào đọc console, nên nó thành tiếng động trong phòng trống.
4. **`?.` xoá mất bằng chứng cuối cùng.** `window.moChatVoi?.()` biến "hàm không tồn tại" thành "không làm gì". Người dùng thấy nút chết, màn hình im, console không ai đọc.
5. **Phạm vi soi bám theo việc vừa làm, không theo thứ mã đó chạm vào.** `TBDay` chèn vào giữa `app.js` — file dùng chung với chat. Cả hai vòng soi phần thông báo, không ai hỏi "mã này nằm cạnh cái gì đang chạy".

### Đề xuất chặn — chi phí 0, dùng lại thứ đã có

- **A · Cổng khói** — mọi vòng soi phải nạp `app.html` trong Chrome headless và **TRƯỢT nếu có bất kỳ `console.error` / uncaught nào**. `do-chat-noibo.mjs` đã thu console rồi, chỉ thiếu `process.exit(1)`.
- **B · Danh sách nút cửa ngõ** — bấm THẬT vào N nút vào-cửa (Chat ngay · nút chat nổi · Gửi góp ý · Lưu hồ sơ), đòi một phản ứng nhìn thấy được. Mở rộng vòng lặp `bam/mo` đã có.
- **C · Cấm `?.` khi gọi hàm toàn cục bắt buộc** — thay bằng `typeof !== 'function'` + `console.error` (xem L3).
- **D · Lint `no-use-before-define`** (ESLint, miễn phí) — thứ yếu: nó **không** bắt được ca này khi chỗ dùng nằm trong hàm. A mới là chốt thật.

**Luật rút ra:** *Bàn thử hàm thuần chứng minh logic đúng. Chỉ trình duyệt mới chứng minh tính năng còn sống.*


## Câu 1 — Vá đúng gốc

| Ca đo | `window.moChatVoi` | Bấm | Mở | Console |
|---|---|---|---|---|
| `a9dc0f1` @1440 **và** @375 | `undefined` | 4 | **0** | `ReferenceError: Cannot access 'TBDay' before initialization` |
| vá @1440 · @375 · @320 | `function` | 4 | **4** | sạch |
| vá + `/api/chat/tin-nhan` **500 lượt đầu** | `function` | 4 | **4** | chỉ dòng 500, chat vẫn sống |

Khai `0 → 4` **đúng**. Tiêu đề mở ra đúng tên từng người, không đổ về Kênh chung. Ca API 500 giết chat vĩnh viễn **đã vá thật** — "dây nối trước, mạng sau" tái lập được.

### Quét cả lớp `?.` nuốt lỗi — **15 lời gọi, 3 chỗ còn nuốt thật**

- Dò tính năng trình duyệt (`matchMedia` · `vibrate` · `serviceWorker`): **4** — chính đáng.
- Gọi lại tuỳ chọn `xuLyLamMoi?.()`: **5** — chính đáng (tham số có thể vắng).
- `veNhapSP?.()` `veXuatSP?.()` `:7777-7778`: **2** — chính đáng, `const` gán có điều kiện.
- **Nuốt lỗi thật: 3** — `window.LAM_MOI_HOSO_NHANSU?.()` `:116` · `window.LAM_MOI_TRANGTHAI_DANHBA?.()` `:1518` · **`window.moChatVoi?.()` `:3891`**.

**`:3891` là điểm đau.** Nó gọi **đúng cái hàm vừa vá**, nhưng từ đường **bấm thông báo đẩy** (`moChatTheoId`). Chỗ Danh bạ (`:2212`) đã đổi sang kiểm tra tường minh + `console.error`; chỗ này thì không. Nếu `khoiDongChat()` chết lần nữa, đường "bấm thông báo → mở chat" **vẫn im lặng y như cũ**. Vá nửa lớp.

### `const`/`let` khai sau chỗ dùng — còn 2 ca cùng lớp

Quét 37 khai báo cấp cao nhất: sau khi lọc dương tính giả còn **`let TOI` (khai `:1165`, chạm `:70`)** và **`const TRANG_THAI` (khai `:497`, chạm `:371`)**. Cả hai **an toàn hôm nay** vì chỗ chạm nằm trong hàm chỉ chạy khi người dùng vào tab. Nhưng đó đúng là điều người ta cũng đã nói về `TBDay`. Chốt A ở trên là thứ bắt được.

## Câu 2 — Chat toàn màn hình trên điện thoại

Vùng đọc tin `#chat-khung`: **375px → 592.3px = 72.9% màn** · 320px → 573.5px = 70.6%. Cửa sổ chiếm trọn 812px. Khai "278 → 592px (34% → 73%)" **đúng** (278.3px là số đo ở desktop 1440 — mốc so hợp lệ vì bản cũ dùng chung ô nổi 360px ở mọi bề ngang).

**Bàn phím bật lên** — ép khung nhìn xuống 476px (bàn phím iOS ~336px): cửa sổ co đúng còn **476px**, `#chat-form` nằm ở 402–476, **ô nhập THẤY**, **nút Gửi THẤY**. `100dvh` làm đúng việc của nó. ✅

**Nút "←" một tay:** ở 375×812 nó nằm **x=16, y=14** — góc **trên trái**, đúng vùng ngón cái phải với khó nhất trên màn 812px. Không có cử chỉ vuốt thay thế. Không chặn phát hành (nút vẫn 44×44px, vẫn bấm được bằng cách trượt máy), nhưng là việc đợt 2: thêm vuốt-phải-về-danh-sách.

## Câu 3 — Xem tin cũ hơn (bộ dữ liệu riêng, 4 ca biên)

| Ca | Trang 1 | Sau khi bấm | Trùng | Sót | Nút "Xem tin cũ hơn" |
|---|---|---|---|---|---|
| 120 tin | 50 (id 71–120) | 100 (id 21–120) | **0** | **0** | hiện, còn hiện sau |
| **đúng 50 tin** | 50 (id 1–50) | — | — | — | **ẨN** — không báo oan ✅ |
| **0 tin** | 0 | — | — | — | ẩn; hiện "Chưa có tin nhắn nào" ✅ |
| **120 tin cùng một mốc giây** | 50 (71–120) | 100 (21–120) | **0** | **0** | đúng thứ tự ✅ |

Khai **đúng cả bốn**. Ca cùng mốc thời gian an toàn vì con trỏ lùi bám `id`, không bám `tao_luc` — chọn đúng.

## Câu 4 — "Chat ngay" 44px bằng `::after`

Cách này **đúng, không phải mẹo**. Đo bằng `elementFromPoint` chứ không đo `getBoundingClientRect`:

| Bề ngang | Chạm mép **trên** | **giữa** | mép **dưới** | Cặp vùng chạm **chồng nhau** | Khe hở nhỏ nhất | Dòng lọt màn |
|---|---|---|---|---|---|---|
| 375 (gốc) | ✗ trượt sang `<td>` | ✓ | ✗ trượt | 0 | 18.5px | 7 |
| **375 (vá)** | **✓ trúng đúng nút** | ✓ | **✓ trúng đúng nút** | **0** | 18.5px | **7** |
| **320 (vá)** | ✓ | ✓ | ✓ | **0** | 18.5px | 7 |
| 1440 (vá) | ✓ | ✓ | ✓ | 0 | 22.5px | 6 |

**Không đè lên dòng bên cạnh** — 0 cặp chồng lấn ở mọi bề ngang, còn chừa khe 18.5px giữa hai vùng chạm kề nhau. Rủi ro "bấm nhầm người → gửi nhầm chuyện lương/kỷ luật" **không tồn tại**. Vẫn **7 dòng** ở 375px (cao dòng đứng yên 62.5px) — ràng buộc cứng giữ được.

## Câu 5 — Hồi quy

- **`src/day-thong-bao.js` và `public/sw.js`: KHÔNG đụng một chữ** (`git diff --name-only a9dc0f1..HEAD`) ✅
- `tu-kiem-thongbao` **74/0** · `do-trangthai-thongbao` **79/0** · `do-nhiptim` **20/0** ✅
- Nút ≥44px ở 375 **và** 320: `←` 44×44 · `✕` 44×44 · Gửi 50.7×45 · 📎 50×44 · ô nhập 44 · "Xem tin cũ hơn" 44 · dòng hội thoại 65 ✅
- **Bỏ `taiLanDau()` lúc mở trang — KHÔNG mất gì**: `hoiChuaDocToanCuc()` (số chưa đọc) và `veGanDay()` vẫn chạy lúc khởi động; danh sách hội thoại vẽ khi mở cửa sổ. ✅
- ⚠️ **Khai "bớt 1 lượt đọc D1" chưa đúng sổ sách:** `chatGanDay()` nay chạy **2 câu lệnh đọc** thay vì 1 (thêm truy vấn Kênh chung), và `veDs()` gọi `veGanDay()` **mỗi lần mở cửa sổ chat**. Kho vận mở chat hàng chục lần/ca → tổng lượt đọc nhiều khả năng **tăng**. Chú thích `src/index.js` *"không thêm lượt D1 nào so với bản cũ"* — **sai**. (Đọc, không ghi — không đụng hạn mức ghi.)
- **Màu:** bản vá đẻ thêm 1 cặp trượt tương phản (gốc 2 → vá 3), xem L1. `do-ba-mau` không đổi.

## Câu 6 — Cột bong bóng: **lệnh của Gạo CHƯA thi hành**

Gạo chốt **BỎ HẲN**. Bản vá mới chỉ **giấu lúc cửa sổ mở** (`body.cnb-mo .cnb-ganday{display:none}`) — đóng cửa sổ là cột về chỗ cũ và tiếp tục che nút.

Đo @375 lúc cửa sổ **đóng**: `239aba7` nguyên trạng → **1 nút bị đè**; ép `.cnb-ganday{display:none}` → **0** ✅

**Không mất đường vào nhanh nào.** Cùng bộ dữ liệu 8 đối tác, danh sách hội thoại trong cửa sổ hiện **9 dòng** (8 người + Kênh chung) — kèm tên đầy đủ, tin cuối, giờ, số chưa đọc; cột bong bóng bị `BONG_TOI_DA = 3` cắt còn **3 chữ viết tắt**. Thứ bị bỏ nghèo hơn hẳn thứ thay thế. **Bỏ hẳn, số nút bị đè về 0.**

(Ghi chú: khai "4 → 1" tôi **không tái lập được con số 4** — đo bản gốc ra 1. Kết luận thì không đổi.)


## Bảng lỗi

| Mã | Lỗi | Mức | Chặn phát hành |
|---|---|---|---|
| **L1** | `.cnb-ds-dem` (huy hiệu **số chưa đọc**) — `#fffcf4` trên `var(--cam)` = **2.76:1**, cần 4.5. Chính `style.css:161-174` đã ghi luật *"nền cam + chữ trắng → `--cam-dark` (4.91:1)"*. Số chưa đọc là thứ **duy nhất** báo "có người đang cần mình" — đọc không ra là mất chức năng. Vá: `--cam` → `--cam-dark`, **một dòng**. | **CAO** | **CÓ** |
| **L2** | Lệnh Gạo **BỎ HẲN cột bong bóng** chưa thi hành — mới giấu lúc mở cửa sổ; đóng lại vẫn đè 1 nút. Vá: đổi `body.cnb-mo .cnb-ganday{display:none}` thành `.cnb-ganday{display:none}` (hoặc gỡ hẳn khối). Đo lại ra **0**. | **CAO** | **CÓ** |
| **L3** | `window.moChatVoi?.()` `:3891` — đường **bấm thông báo đẩy** vẫn nuốt lỗi im lặng, đúng lớp lỗi vừa vá ở `:2212`. Cùng nhóm: `:116`, `:1518`. | TRUNG | Không — đợt 2 |
| **L4** | Chú thích `src/index.js` khai *"không thêm lượt D1 nào so với bản cũ"* — thực tế `chatGanDay()` chạy 2 câu lệnh, và nay gọi mỗi lần mở cửa sổ. Chú thích nói dối là lớp lỗi repo này đã dính nhiều lần. | TRUNG | Không — sửa câu chữ |
| **L5** | Nút "←" ở góc **trên trái** màn 812px — ngón cái một tay với khó; không có cử chỉ vuốt thay thế. | THẤP | Không — đợt 2 |
| **L6** | `docs/BANG-MAU.md` **không tồn tại** nhưng `style.css` trích 3 chỗ (2 chỗ cũ, bản vá thêm chỗ thứ 3 ở `:1951`). Và `let TOI` `:1165` / `const TRANG_THAI` `:497` khai sau chỗ chạm — an toàn hôm nay, cùng lớp rủi ro với `TBDay`. | THẤP | Không |

## Bước triển khai (sau khi vá L1 + L2)

1. Sửa 2 dòng CSS, chạy lại `node scripts/do-chat-noibo.mjs --rong 375` và `node scripts/do-tuong-phan-mau.mjs` — đòi **3 trượt → 2** (về đúng mức nền `a9dc0f1`) và **nút bị đè = 0**.
2. **KHÔNG cần migration.** `truoc_id` chỉ là tham số truy vấn; `chatGanDay()` đọc `tai_khoan.chat_xem_id` — cột đã có. Không đụng schema, không đụng `sw.js` / `day-thong-bao.js`.
3. Gộp vào `main`, deploy bằng GitHub Actions như thường lệ.
4. **Thử tay sau khi lên**: mở ERP trên điện thoại → Danh bạ → bấm "Chat ngay" một người → phải mở đúng tên người đó; mở nút chat nổi → phải ra **danh sách hội thoại**, không nhảy thẳng Kênh chung.
5. Dựng chốt A (cổng khói `console.error` = TRƯỢT) **trước vòng soi kế tiếp**, không để sang tháng.
