# REV-0008 — CTL-0011 vòng 3 (cổng cuối) · commit `b673d0e`

- **Người soi:** HỒ LY (Review Gate) · 2026-08-27
- **Phạm vi:** đúng 2 hunk vòng 3 + 2 điểm truy vết. Vòng 2 đã PASS — không soi lại.
- **Kết luận: PASS — NÊN ĐẨY.**

---

## 1. Vá base64 `src/index.js:389-404` — ĐẠT

Tôi tự dựng lại cả hai bản hàm và đo trên Node v24.16.0 (cùng V8 với `workerd`),
ngăn xếp mặc định, không dùng số của Khỉ Đột.

| Cỡ (byte) | Bản CŨ | Bản MỚI vs `Buffer.from().toString('base64')` |
|---|---|---|
| 1 | OK | KHỚP |
| 255 | OK | KHỚP |
| **32.767** (mép lô −1) | OK | **KHỚP** |
| **32.768** (đúng mép lô) | OK | **KHỚP** |
| **32.769** (mép lô +1) | OK | **KHỚP** |
| 65.536 | OK | KHỚP |
| 122.880 | OK | KHỚP |
| 125.952 | **RangeError** | KHỚP |
| **512.000** | **RangeError** | **KHỚP** |
| 1.048.576 | RangeError | KHỚP |
| **4.194.304** (trần backend) | RangeError | **KHỚP** |

**Ca đối chứng bắt buộc — ĐẠT.** Bản cũ ở 500KB gãy đúng
`RangeError: Maximum call stack size exceeded`. Nếu nó không gãy thì phép đo vô
nghĩa; nó gãy, nên phép đo có nghĩa.

**Ngưỡng gãy thật của bản cũ** (dò nhị phân): **125.163 B (~122KB)** — khớp con
số Khỉ Đột khai (~123KB), sai lệch dưới 1%. Lời khai trung thực.

Ba cỡ mép lô đều khớp từng byte → vòng lặp `i += 0x8000` không sinh lỗi lệch một
đơn vị ở ranh giới lô.

**Rủi ro tồn dư — chấp nhận được.** Số đo là trên Node, không phải `workerd` thật;
nhưng `src/index.js:387` chặn `tep.size > 4MB` **trước** khi vào base64, mà tôi đã
đo đúng 4.194.304 B vẫn khớp — tức mọi đầu vào có thể xảy ra đều nằm trong vùng đã
đo. Chuỗi tạm cỡ 4MB tốn ~8MB UTF-16 + ~5,6MB base64, xa trần 128MB của Worker.

---

## 2. `git rebase --skip` commit `515f135` — **KHÔNG MẤT CODE**

Đây là chỗ tôi lo nhất: `--skip` là bỏ hẳn một commit, nhận định sai là mất code
âm thầm.

**Cách đo:** trích toàn bộ **22 dòng thêm** về mã nguồn của `515f135`
(`public/assets/css/style.css` + `public/assets/js/app.js`), rồi tìm từng dòng
trong cây `b673d0e`.

- **Thiếu 3/22.** Kiểm tay cả 3 → đều là **chú thích bị ngắt dòng ở vị trí khác**,
  nội dung có mặt nguyên vẹn:
  - `.cnb-popup[hidden]`, `.combo1-panel[hidden]` — có tại `style.css:663-664`
  - `// Esc đóng popover…` — logic có tại `app.js:1213-1220`
- **Ca đối chứng độ nhạy:** cùng phép đo chạy trên `515f135^` (bản **trước** khi
  sửa) → **thiếu 18/22**. Phép đo bắt được chênh lệch thật, không phải luôn báo
  "đủ".

**5 thứ Gạo yêu cầu xác nhận — có đủ cả 5 trên `b673d0e`, y hệt `origin/main`
(`c51a759`):**

| Hạng mục | `b673d0e` | `c51a759` |
|---|---|---|
| `.thd-panel[hidden]` (style.css) | 7 chỗ | 7 chỗ |
| handler `pointerdown` (app.js) | 5 chỗ | 5 chỗ |
| handler `Escape` (app.js) | 2 chỗ | 2 chỗ |
| `[hidden] { display: none !important; }` | `style.css:23` | có |
| `vungTem.hidden = false` | 1 chỗ | 1 chỗ |

Bản trên `main` còn **nhỉnh hơn** bản bị skip: `app.js:1216-1220` chỉ trả focus khi
`activeElement` đang nằm trong `#thdWrap` (FIX-02 của REV-0004) — bản `515f135` trả
focus vô điều kiện. Bỏ `515f135` là bỏ đúng bản cũ hơn.

Chênh lệch duy nhất còn lại nằm ở `docs/reviews/REV-0003` (259 dòng ở `515f135` vs
234 ở `main`) — **tài liệu, không phải mã**, không ảnh hưởng phát hành.

---

## 3. Nhánh `catch` của `nhanTepChat()` `app.js:2807-2827` — ĐẠT

- **HEIC 6MB có nghẹn im lặng không?** Không. `f.size (6MB) > CHAT_ANH_TOI_DA
  (3,8MB)` → rơi vào nhánh `else`: xoá tệp, dựng lại giao diện, và báo nguyên văn
  cỡ tệp kèm giới hạn 4MB. Báo lỗi rõ, đúng người đọc là Sếp.
- **Tệp gốc gửi đi có bị 4MB chặn không?** Có, và chặn hai lớp: client chỉ giữ tệp
  khi `≤ 3,8MB` (chừa dư), backend `src/index.js:387` chặn độc lập ở 4MB, trả 413
  **trước** khi base64.
- **Có sinh đường gửi tệp KHÔNG PHẢI ảnh nào lọt qua không?** **Không.** Nhánh
  `catch` chỉ với tới sau khi `app.js:2789` đã lọc `/^image\//`. Đường cho tệp
  không phải ảnh (`app.js:2789-2793`) là **code cũ, hunk này không đụng vào**.

---

## 4. `src/auth.js:19` `sangBase64()` — **XÁC NHẬN AN TOÀN**

Truy hết chỗ gọi (`git grep sangBase64 -- src/`), chỉ có 3:

| Dòng | Đầu vào | Cỡ |
|---|---|---|
| `auth.js:59` | `salt` = `new Uint8Array(16)` · `hash` = `deriveBits(…, 256)` | 16 B · 32 B |
| `auth.js:77` | `crypto.subtle.digest('SHA-256', …)` | 32 B (cố định) |
| `auth.js:82` | `crypto.getRandomValues(new Uint8Array(32))` | 32 B |

Cả 3 đều **cố định theo hằng số trong mã**, không có đường nào cho dữ liệu người
dùng đổi cỡ. Đầu vào lớn nhất **32 byte**, trong khi phép đo ở mục 1 cho thấy bản
cũ chịu được tới 122.880 byte — biên độ **~3.800 lần**. Lời khai của Khỉ Đột đúng.
Không sửa là quyết định đúng: sửa `auth.js` ngoài phạm vi mà rủi ro là gãy đăng nhập.

---

## 5. Danh sách issue

| Mức | Vị trí | Nội dung | Chặn phát hành? |
|---|---|---|---|
| Thấp | `public/assets/js/app.js:2789-2793` | Tệp không phải ảnh không kiểm cỡ ở client → tệp 10MB tải lên xong mới nhận 413. Tốn băng thông, báo lỗi kém thân thiện. **Code cũ, không do vòng 3.** | Không |
| Ghi chú | `src/auth.js:19` | Cùng khuôn lỗi nhưng đầu vào cố định ≤32 B. Nếu sau này có ai truyền dữ liệu người dùng vào đây thì phải vá cùng cách. | Không |

Không có issue mức Cao/Trung.

---

## 6. Kết luận

**PASS.** Cả 4 điểm soi đều đứng vững dưới phép đo tự dựng, và **hai ca đối chứng
đều bắt được lỗi cố ý** (bản cũ 500KB gãy · bản trước-khi-sửa thiếu 18/22 dòng) nên
phép đo đủ nhạy để tin.

**Khuyến nghị: NÊN ĐẨY.**
