# REV-0062 — GY-0006 (chat trên máy tính) · GY-0007 (Kho tài liệu)

**KẾT LUẬN: FAIL** — 2 CHẶN · 5 CAO.

Bản vá gốc (dời `let TL_NHOM_LUU_DUOC` lên trước dãy `await khoiDong…()`) là
**đúng bệnh, đúng thuốc, đo được**. Cái trượt nằm ở hai chỗ khác: ① bàn đo mới —
thứ được dựng ra để đóng "cách hỏng thứ SÁU" — **mù đúng hai dạng hỏng khó nhất
của chính cách hỏng đó** (tôi gài và chứng minh được); ② đổi `vh` → `dvh` **không
có đường lui**, và tôi đo được rằng trình duyệt không hiểu `dvh` sẽ bỏ luôn cả
dòng luật, tức là mất sạch trần chiều cao — đúng cái hỏng đang đi vá, nay dựng
lại cho máy cũ.

Ngoài ra: câu **"chết hoàn toàn ở mọi bề ngang, mọi vai trò"** đã ghi vào
`CHANGELOG.md` và `BAI-HOC.md` là **nói quá**, và tôi đo được đường hồi phục.

- Nhánh: `fix/gopy-6-7-khong-xem-duoc` @ `f1ab6c9` · mốc `origin/main` @ `f1ac70b`
- Cây làm việc soi: `C:\Users\Admin\AppData\Local\Temp\claude\agc-gy67`
- Cây `origin/main` SẠCH tôi tự dựng để đối chiếu nợ:
  `C:\Users\Admin\AppData\Local\Temp\claude\holy-main-sach` (`git archive origin/main`)
- Không commit, không push, không sửa một dòng mã sản phẩm nào.

---

## ⓪ GIẢI MÂU THUẪN — người xây khai "chết hoàn toàn", Sếp chụp màn "đang chạy"

**Cả hai đều nhìn thấy thật. Lời khai mới là chỗ sai.**

### Đo được gì

Tôi dựng lại `origin/main` (bản CHƯA vá) trên máy giả + Chrome, ổ `/api/tai-lieu`
trả **đúng 3 tài liệu như ảnh Sếp** và **đúng hình dạng `dem_chu` của máy chủ
thật** (`src/tai-lieu.js:1267-1269`). Kết quả, giống nhau ở `admin @1440px` và
`nguoi_dung @375px`:

| Thời điểm | Số thẻ | Dải đếm | Nút lọc | Nút quét |
|---|---|---|---|---|
| ① Ngay sau khi nạp trang, mở tab | **0** — chỉ một dòng `Không tải được kho tài liệu: Cannot access 'TL_NHOM_LUU_DUOC' before initialization` | ẩn | **8 nút, đủ và bấm được** | ẩn |
| ② Sau khi **bấm một nút lọc bất kỳ** (kể cả "Tất cả") | **3** | **hiện: "0 tài liệu tìm được theo nội dung · 3 chỉ xem được"** | 8 | hiện |
| ③ Nạp lại trang → **gõ một phát vào ô tìm** | 0 → **3** | hiện | 8 | hiện |

### Vì sao hồi phục được

`napKhoTaiLieu()` gọi `veLoc()` — vẽ và **nối dây** cho 8 nút lọc — **TRƯỚC** dòng
`TL_NHOM_LUU_DUOC = nhomLuuDuoc;` là chỗ nổ TDZ. Nên lúc tab chết, mọi nút lọc và ô
tìm vẫn nằm đó, vẫn gọi `nap()` được. Đến lúc người dùng bấm, mô-đun đã chạy hết
tệp, dòng khai ở `10334` đã thi hành, `TL_NHOM_LUU_DUOC` đã là `[]` — `nap()` chạy
trọn vẹn. **Một cú bấm là tab sống lại cho tới hết phiên.** Có thêm một đường hồi
phục thứ hai: bất kỳ lượt ghi nào bắn nhóm `tai_lieu`/`ho_so` sẽ đánh dấu người
nghe "ngủ", và `moTab()` gọi `lamMoiManVuaMo()` sẽ nạp lại.

### Chốt

- **Lỗi CÓ THẬT.** Mọi lần mở ERP, mọi vai trò có quyền `khotailieu`, mọi bề
  ngang: **lần vẽ đầu tiên là 0 tài liệu + một câu lỗi máy trên màn.** Với người
  không biết bấm thử, tab coi như hỏng. Đáng vá, đã vá đúng.
- **Câu "chết hoàn toàn" là NÓI QUÁ.** Tab không chết — nó chết **một lần lúc
  nạp** rồi tự sống lại khi người ta chạm vào. Ảnh của Sếp được giải thích trọn
  vẹn: Sếp đã bấm một nút lọc, hoặc gõ vào ô tìm, hoặc vừa lưu một giấy tờ.
- Nói quá theo hướng an toàn vẫn là khai sai số đo, và câu này **đã nằm vĩnh viễn
  trong `docs/CHANGELOG.md` và `docs/BAI-HOC.md` (BH-62)**. → **CAO-1**.
- Môi trường đo của người xây **không** khác hệ thống thật, `origin/main` **không**
  khác bản đang chạy. Mâu thuẫn nằm gọn ở chữ "hoàn toàn".

---

## CHẶN

### CHẶN-1 · Bàn đo 541 phép MÙ đúng hai dạng hỏng mà nó sinh ra để bắt

Người xây tự kiểm bằng cách gài lại **đúng lỗi cũ** — cùng biến, cùng câu lỗi.
Tôi gài **bốn kiểu khác**, chạy đúng bộ phép chấm Ⓐ/Ⓑ/Ⓒ của bàn đo:

| Gài | Sự thật trên màn | Bàn đo |
|---|---|---|
| **A** — vẫn chết TDZ y hệt, nhưng `catch` in câu khác: *"Kho tài liệu đang bảo trì, Sếp quay lại sau giúp em."* | **0 thẻ** | **XANH — MÙ** |
| **B** — nạp xong, không lỗi, chỉ **không vẽ gì cả** (im lặng) | **0 thẻ**, không một câu báo | **XANH — MÙ** |
| **C** — ném ngoại lệ **không** bị `catch` | — | ĐỎ (Ⓑ bắt) |
| **D** — đóng chat **quên gỡ** khoá cuộn `cnb-mo` | — | ĐỎ (Ⓒ bắt) |

Ⓐ chỉ là một danh sách **sáu câu tiếng Việt chép tay** (`Không tải được` · `Không
mở được` · `Không đọc được` · `Không xem được` · `Không dựng được` · `Không nạp
được`) cộng 8 mẫu chữ máy. Viết câu lỗi thứ bảy là cổng mù trở lại. Và Ⓐ **không
hề khẳng định màn có nội dung**: biến `coChu` được đọc về rồi chỉ dùng để in ra,
không có phép chấm nào. Một tab trống trơn đi qua Ⓐ **và** qua Ⓒ (`vừa một màn`
— vì rỗng thì lấy gì mà cuộn).

Đây đúng là lớp bệnh BH-62 mô tả: *"lỗi được bắt tử tế rồi in ra màn hình"*. Bàn
đo mới đóng được **đúng một câu**, không đóng được **cách hỏng**. Mà bàn đo này
chính là sản phẩm chính của nhánh ngoài 3 dòng vá.

**Phải làm:** ① thêm phép chấm "tab này có nội dung thật" (ví dụ: mỗi tab khai
một mỏ neo bắt buộc — `#tl-danh-sach` phải có ≥1 `.tl-the`, `#tbDanhSach` phải có
dòng…) — rỗng bất ngờ là ĐỎ; ② đảo luật Ⓐ: thay vì liệt kê câu **xấu**, bắt mọi
chỗ mã gọi `oTrong.textContent = …e.message` phải đăng ký với bàn đo, hoặc quét
chính `app.js` tìm mọi `catch` có ghi chữ ra DOM rồi bắt bàn đo phải có một phép
chấm cho từng chỗ; ③ chạy lại **bốn ca A·B·C·D** làm đối chứng, không chỉ ca A
của chính mình.

Bằng chứng chạy lại được:
`…\scratchpad\holy-gai-loi.mjs` (`node holy-gai-loi.mjs A|B|C|D|lanh`).

### CHẶN-2 · `vh` → `dvh` KHÔNG có đường lui — máy cũ mất sạch trần chiều cao

Bốn dòng đổi thành `max-height: 62dvh` / `calc(100dvh - 40px)` / `92dvh` /
`calc(100dvh - 140px)` là **khai báo duy nhất**, không có dòng `vh` đứng trước
làm nền.

Tôi đo trong chính Chrome của bàn đo: đặt `max-height` bằng một đơn vị trình
duyệt không biết → `getComputedStyle` trả về **`none`**. Đó là luật CSS: khai báo
có đơn vị lạ là khai báo **không hợp lệ và bị vứt cả dòng** — không phải "lùi về
`vh`", mà là **không còn trần nào**.

`dvh` chỉ có từ Chrome 108 / Safari 15.4 / Firefox 101 (cuối 2022). Trên máy dưới
mốc đó:

- `.modal` mất `max-height` → hộp thoại dài tràn khỏi màn, mà `.modal-nen` là
  `fixed` + căn giữa nên phần dư bị đẩy đều hai đầu: **mất tiêu đề ở trên, mất
  hàng nút "Lưu / Huỷ" ở dưới, `overflow-y:auto` của chính hộp không kéo tới
  được.** Đây là **nguyên văn** cái hỏng mà chú thích ngay trên dòng đó nói mình
  đang đi vá.
- `.tlq-tam` mất trần → màn quét giấy tờ **mất nút ✕**, đúng câu chú thích ở
  dòng 3993.
- `.tb-panel`, `.cnb-popup` tương tự.

Nhân sự kho quét giấy tờ bằng điện thoại cũ chính là nhóm dễ dính nhất. Trước bản
vá họ hỏng vì `vh` cao hơn vùng nhìn ~60-90px; sau bản vá họ hỏng vì **không còn
trần nào cả** — nặng hơn.

**Phải làm:** viết hai dòng cho mỗi chỗ, tốn 0đ, không thêm gói:

```css
max-height: calc(100vh - 40px);   /* nền cho trình duyệt chưa biết dvh */
max-height: calc(100dvh - 40px);  /* trình duyệt biết dvh thì đè lên */
```

Và sửa lưới Ⓓ cho khớp: **cặp `vh` + `dvh` liền nhau là ĐẠT**, chỉ `vh` một mình
mới ĐỎ. Bản lưới hiện tại sẽ đỏ oan với cách viết đúng này.

---

## CAO

### CAO-1 · Mức nghiêm trọng khai sai, đã commit vào tài liệu vĩnh viễn

`CHANGELOG.md` và `BAI-HOC.md` (BH-62) đều chép *"chết hoàn toàn ở mọi bề ngang,
mọi vai trò, mỗi lần mở ERP"*. Đo được (mục ⓪): chết **ở lần vẽ đầu tiên**, sống
lại sau **một** cú bấm nút lọc hoặc một phím trong ô tìm. Sửa cả hai chỗ thành:
*"mỗi lần mở ERP tab hiện 0 tài liệu + một câu lỗi máy; chỉ hồi phục nếu người
dùng tình cờ bấm một nút lọc hoặc gõ vào ô tìm"*. Cũng nên ghi luôn **vì sao** nó
hồi phục (`veLoc()` chạy trước dòng nổ) — đó mới là bài học dùng lại được.

### CAO-2 · `CHANGELOG.md` ghi **453 phép chấm**, chạy thật ra **541**

Tôi chạy `npm run do-mo-ra-xem-duoc` trên đúng cây này: `Chấm 541 phép · HỎNG 0`,
13 đầu mục (Ⓓ + 12 lượt). Người xây khai với tôi là 541 — đúng; nhưng dòng đã
commit vào `CHANGELOG.md` vẫn là 453. Con số trôi, nằm ngay trong commit mà bài
học là chuyện con số trôi.

### CAO-3 · Ổ giả trả `dem_chu` SAI HỢP ĐỒNG máy chủ → bàn đo đo một màn nhỏ hơn màn thật

Bàn đo trả `dem_chu: { tra_cuu_duoc, co_chu_chua_neo, khong_chu }`.
Máy chủ thật trả `{ tra_cuu_duoc, co_chu_chua_tra_duoc, chi_xem_duoc }`
(`src/tai-lieu.js:1267-1269`).

Hậu quả trong `app.js`: `tong = tra_cuu_duoc + 0 + undefined` → **`NaN`** →
`oDem.hidden = !tong` → **dải đếm bị ẩn hoàn toàn**. Nên:

- **Cả dải "0 tài liệu tìm được theo nội dung · 3 chỉ xem được" mà Sếp chụp được
  thì bàn đo chưa bao giờ nhìn thấy** — kiểm lại được bằng chính ảnh `SAU` của
  người xây (`.anh-tam/gy0007-1440-SAU.png`): không có dải đếm; ổ giả của tôi trả
  đúng hình dạng thì dải hiện ra ngay.
- Nếu điều kiện `hidden` khác đi một chút, chỗ đó sẽ **in chữ `NaN` ra màn** —
  đúng thứ Ⓐ đi tìm, mà chính ổ giả lại là nơi tạo ra nó.

Ổ giả lệch hợp đồng là bàn đo tự bịt mắt mình. Sửa `dem_chu` cho khớp, và cân
nhắc một phép chấm ngược: "ổ giả trả khoá nào mà `app.js` không đọc thì ĐỎ".

### CAO-4 · Hai cổng ĐỎ mà không nằm trong lời khai

Người xây chỉ khai một khoản nợ có sẵn (`do-bang-that` 73/2). Tôi chạy rộng hơn:

| Cổng | Nhánh vá | `origin/main` sạch | Kết luận |
|---|---|---|---|
| `do-tu-lam-moi` | **52/2 ĐỎ** | **52/2 ĐỎ, y hệt từng chữ** | nợ có sẵn — **không khai** |
| `do-bang-vua-man` | **36/3 ĐỎ** | **36/3 ĐỎ, y hệt từng chữ** | nợ có sẵn — **không khai** |
| `do-bang-that` | 73/2 ĐỎ | 73/2 ĐỎ, y hệt | nợ có sẵn — **đã khai đúng** |

Cả ba đều đến từ `f1ac70b` (Dashboard Marketplace): `kdTachDongHang` chưa khai
nhóm dữ liệu, và ba bảng `kd-tq-bang`/`kd-sku-chay`/`kd-sku-kem` tràn cột. **Nhánh
này không làm hỏng thêm gì** — nhưng "chạy hết cổng" mà bỏ hai cổng đỏ ra ngoài
báo cáo thì lần sau không ai biết nợ có tăng hay không. Ghi cả ba vào sổ hàng đợi.

### CAO-5 · 38/40 bàn đo dùng Chrome KHÔNG có đồng hồ chết

Câu hỏi "còn bàn đo nào cùng cảnh treo được không" — có, gần như tất cả. Chỉ
`do-man-mo-ra-xem-duoc.mjs` và `do-quyen-duyet-gopy.mjs` có `Promise.race`;
**38 tệp còn lại dùng `moChrome` mà không có hạn giờ nào**, trong đó có
`cong-khoi.mjs` — cổng bắt buộc trước mọi lần đẩy. `moChrome` chỉ đặt hạn 30s cho
lúc Chrome mở cổng gỡ lỗi; `chay()` (CDP `Runtime.evaluate`) **không có hạn** —
trang treo là bàn đo treo vô hạn. Nên nâng đồng hồ chết lên `lib/ban-do-chrome.mjs`
(gói `goi()`/`chay()` bằng một hạn giờ) thay vì chép tay vào từng bàn đo.

---

## ĐÃ KIỂM ĐÚNG — lời khai khớp số đo

### Bản vá gốc

- Trên nhánh vá, mở ERP là Kho tài liệu **hiện đủ 3 thẻ ngay lần vẽ đầu**, không
  một câu lỗi. Đúng.
- `do-mo-ra-xem-duoc`: **541 phép · HỎNG 0**. Tôi chạy lại, ra đúng con số.
- Tự kiểm `--tu-kiem`: **ĐỎ 12/12 tổ hợp**, đúng biến, đúng câu. Đúng.
  *(Ghi chú: lượt tự kiểm chỉ chấm **478** phép chứ không phải 541 — lỗi gài làm
  ẩn nút quét nên cả khối "màn quét" bị bỏ, mất 63 phép. Bàn đo không nói ra
  chuyện đó. Không phải lỗi, nhưng hai con số không so trực tiếp được.)*

### Quét lại lớp TDZ — độc lập với con số người xây khai

Tôi viết lưới riêng (`holy-quet-tdz.mjs`), lấy mốc là lời gọi khởi động top-level
**đầu tiên**, giao cắt với mọi biến `let`/`const` top-level khai sau mốc đó và bị
hàm chạy-lúc-khởi-động đụng tới:

- **`origin/main`: 6 nghi vấn — trong đó có đúng `TL_NHOM_LUU_DUOC`.**
- **Nhánh vá: 5 nghi vấn, `TL_NHOM_LUU_DUOC` đã biến mất.**
- 5 cái còn lại (`NHAN_MAY_DOC_LUI` · `BANG_GIU_CUON` · `BANG_KHONG_THANH_THE` ·
  `MAN_HEP` · `DK_THEAD`) soi tay đều **chết lâm sàng, không sống**: chỗ dùng nằm
  trong hàm chỉ chạy về sau, hoặc nằm dưới chính dòng khai. Khớp với chạy thật —
  Ⓑ sạch ở cả 12 lượt, kể cả hai vai có `shopee.xem` nên `khoiDongLichSuHoan` có
  chạy.

→ **"1 sống thật" là đúng.** Không có ca TDZ nào khác bị bỏ sót.

### GY-0006 "không vá gì" — kiểm từng con số

Đọc thẳng nhật ký `do-mo-ra-xem-duoc`:

- `chat — cửa sổ MỞ RA sau khi bấm`: **12/12** · `chat — nút nổi MỞ được cửa sổ`:
  **12/12** → **hai đường vào × 4 vai × 3 bề ngang, có thật.**
- `chat — có tin nhắn hiện ra`: **12 lượt, đều "50 tin"**.
- `chat — gửi tin thì có tin mới hiện lên`: **12 lượt, đều "50 → 51 tin"**.
- `chat — vùng đọc tin cuộn ngược được`: **2233px ×4 · 2462px ×4 · 2631px ×4** —
  đúng dải đã khai, và chia đều theo bề ngang.
- Diff `app.js` chỉ có **3 khối**: khối khai biến đầu tệp, ba chỗ `|| 0` ở
  `khoiDongCongViec`, và chỗ gỡ dòng khai cũ. **Không một dòng mã chat nào bị
  đụng.** Đúng.
- **Một điểm phải nói cho đủ:** `.cnb-popup` — cửa sổ chat — **có** bị đổi CSS
  (`calc(100vh - 140px)` → `dvh`) trong chính nhánh này. Trên máy tính `dvh` bằng
  `vh` nên không đổi gì; trên điện thoại thì có. Câu "GY-0006 không vá gì" đúng
  với JS, không đúng tuyệt đối với CSS. `CHANGELOG` có khai ở dòng riêng nên
  không phải giấu — nhưng hai dòng đọc rời nhau thì ra kết luận sai.

### Mục Ⓓ — "lưới đọc CSS chứ không phải phép đo"

**Cách xử này ĐÚNG và nên giữ.** Nói thẳng "máy này không đo được cái bẫy này"
rồi chuyển sang canh bằng luật, có gắn nhãn đúng tên, tốt hơn hẳn một phép đo
hình học luôn xanh. Tôi kiểm lời khai:

- Chạy đúng lưới đó lên `style.css` của `origin/main`: **ra đủ 4 chỗ**
  (`.modal` `calc(100vh - 40px)` · `.tlq-tam` `92vh` · `.tb-panel` `62vh` ·
  `.cnb-popup` `calc(100vh - 140px)`). Khai đúng.
- Chạy lưới **cũ** `\bvh\b` lên cùng tệp đó: **bắt được 0/4**. Bài học có thật,
  và lý do nêu ra (chữ số cũng là ký tự từ nên `100vh` không có ranh giới `\b`)
  là đúng.
- Quét cả tệp tìm **mọi** luật đặt chiều cao bằng `vh`: trên nhánh vá chỉ còn
  `.login-page` và `.app` `min-height: 100vh` — đúng hai chỗ đã cố ý chừa. Lưới
  4 tên **hiện đang phủ đủ**.
- Sai vặt: chú thích trong `do-man-mo-ra-xem-duoc.mjs` viết *"bỏ lọt sạch cả **ba**
  chỗ hỏng thật"* trong khi là **bốn**. Sửa.

### `vh` → `dvh` có gây hồi quy chiều cao không (375 · 414 · 1440)

Đo trực tiếp trên nhánh vá: `dvh` và `vh` cho **đúng cùng một số pixel** ở cả ba
bề ngang (`62dvh` = `62vh` = 503.44px; `calc(100dvh-40px)` = 772px…), vì Chrome
không đầu không có thanh địa chỉ co giãn. Bảng thông báo mở ra cao 503px, đáy ở
563/812 — **không tràn**, cuộn được 1141px. Tấm quét `.tlq-tam` nằm gọn trong
khung nhìn ở cả ba. **Không có hồi quy cao/thấp bất thường.** Rủi ro nằm hết ở
trình duyệt cũ — xem CHẶN-2.

### Đồng hồ chết 4 phút

Có thật và chạy thật. Tôi hạ hạn xuống 6 giây trên một bản chép: **12/12 lượt
báo `quá 6s — lượt này TREO`**, chấm ĐỎ, dọn Chrome, **đi tiếp lượt sau**, thoát
mã 1. Không treo, không nuốt. Cách gọi tên "một bàn đo treo còn tệ hơn một bàn đo
đỏ" là đúng. (Diện phủ thì thiếu — CAO-5.)

### Ảnh trước / sau

`.anh-tam/gy0007-{375,414,1440}-{TRUOC,SAU}.png` — **thật, không phải ảnh sau chụp
hai lần.** Ảnh `TRUOC` in ra đúng dòng `Không tải được kho tài liệu: Cannot access
'TL_NHOM_LUU_DUOC' before initialization` với danh sách rỗng; ảnh `SAU` có đủ thẻ
tài liệu và hàng nút "Mở bản quét · Xem chữ đã bóc · Sửa số & tên". Bản `TRUOC`
**chỉ có thể** sinh ra từ `app.js` của `origin/main`, nên việc hoàn nguyên là thật.
Hai điểm nhỏ: ① `gy0006` **chỉ có ảnh SAU**, không có ảnh TRƯỚC (hợp lý vì không
vá, nhưng "ảnh trước/sau" là khai thừa cho GY-0006); ② bộ ảnh chụp bằng ổ giả
**đời cũ** (5 nút lọc, 4 nhóm bịa) chứ không phải ổ 7 nhóm đúng mã hiện tại — nên
ảnh không tái hiện được bằng lệnh trong `package.json` hôm nay.

### Ca xấu thứ ba — "gửi tin có ăn không" từng ĐỎ OAN

Đúng: ổ chat chung trong `lib/ban-do-chrome.mjs` trả 120 tin **cố định**, nên
`?sau_id=120` sau khi gửi luôn trả rỗng. `oChatCoTriNho()` trong bàn đo mới sửa
đúng chỗ đó và nay ra `50 → 51` ở cả 12 lượt. Chẩn đoán đúng, xử đúng.

### Luật của nhà

| Luật | Kết quả |
|---|---|
| Ba màu | `do-ba-mau` XANH |
| Vừa một màn ở 375px | `cong-khoi --rong 375` XANH · Ⓒ 375px cuộn được ở mọi tab · ảnh 375 sạch |
| **Chi phí 0** | **Xác nhận: 0 gói mới.** `package.json` chỉ thêm 3 dòng `scripts`; `devDependencies` không đổi; `package-lock.json` **không đổi một byte** |
| Tiếng Việt có dấu | Đủ dấu trong toàn bộ mã và tài liệu mới |
| Câu lỗi tiếng người | Đạt — nhưng xem CHẶN-1: chính vì câu lỗi tiếng người quá tử tế mà cổng mù |
| Chạm ≥44px | Không thêm nút mới; `do-bang-that` chấm ô tick 44×44 ĐẠT |

---

## Đánh giá 5 chỗ tự cắt phạm vi (mục ④)

1. **Không đụng `min-height: 100vh` ở `.app` và màn đăng nhập** — **ĐÚNG, giữ
   nguyên.** `min-height` trên một khối cuộn được là ca an toàn của `vh`; đổi sang
   `dvh` mới là chỗ sinh giật khi thanh địa chỉ ẩn/hiện. Lý do nêu ra chính xác.
2. **Chỉ đo 3 bề ngang, bỏ 768/1024/1366** — **chấp nhận được, nhưng có một chỗ
   tự mâu thuẫn**: chú thích của chính bản vá nói `dvh` ở `.cnb-popup` cần cho
   **dải 641–820px** (máy tính bảng, điện thoại nằm ngang) — mà đó đúng là dải
   không đo. Thêm **768px** vào `BE_NGANG` là gần như miễn phí.
3. **Không đo trên điện thoại thật, không đo trong PWA đã cài** — **khai báo đúng
   và quan trọng**, nhưng nó có nghĩa: **toàn bộ lợi ích của việc đổi `dvh` chưa
   ai chứng minh**, trong khi rủi ro thì tôi đã chứng minh (CHẶN-2). Riêng PWA
   chạy chế độ standalone **không có thanh địa chỉ**, nên ở đó `dvh` = `vh` và bản
   vá là vô tác dụng — lợi ích chỉ nằm ở tab trình duyệt trên điện thoại.
4. **Chưa đụng D1 thật** — **đúng**, đây là lỗi thuần giao diện, không có đường
   nào chạm dữ liệu.
5. **Không vá GY-0006** — **đúng và đáng khen**: đo 12 tổ hợp rồi kết luận không
   có bệnh, thay vì vá bừa cho có việc.

---

## Việc phải làm trước khi gộp

1. **CHẶN-1** — thêm phép chấm "tab có nội dung thật" + đối chứng bốn ca A·B·C·D,
   không chỉ ca gài lại lỗi cũ của mình.
2. **CHẶN-2** — viết cặp `vh` + `dvh` cho cả 4 chỗ; sửa lưới Ⓓ để cặp đó là ĐẠT.
3. **CAO-1** — sửa câu "chết hoàn toàn" trong `CHANGELOG.md` + `BAI-HOC.md` BH-62,
   ghi thêm đường hồi phục và lý do.
4. **CAO-2** — sửa `453` → `541` trong `CHANGELOG.md`.
5. **CAO-3** — sửa `dem_chu` trong ổ giả cho khớp `src/tai-lieu.js`.
6. **CAO-4** — ghi `do-tu-lam-moi` 52/2 và `do-bang-vua-man` 36/3 vào sổ hàng đợi
   là nợ của `f1ac70b`.
7. **CAO-5** — đưa đồng hồ chết vào `lib/ban-do-chrome.mjs`.
8. Sửa "ba chỗ" → "bốn chỗ" trong chú thích lưới Ⓓ.

---

## Phụ lục — bảng cổng tôi tự chạy lại trên đúng cây này

| Cổng | Kết quả | Ghi chú |
|---|---|---|
| `cong-khoi` | ✅ XANH | 2 lượt vai (6 tab + 13 tab) |
| `cong-khoi-dienthoai` (375px) | ✅ XANH | |
| `do-chat-noibo` | ✅ XANH | |
| `do-kho-tai-lieu` | ✅ thoát 0 | |
| `do-quet-375` | ✅ thoát 0 | |
| `do-ba-mau` | ✅ thoát 0 | |
| `do-cat-im-lang` | ✅ thoát 0 | |
| `do-chu-dai` | ✅ thoát 0 | |
| `do-moc-noi` | ✅ **9 / 0** | khớp lời khai |
| `do-mo-ra-xem-duoc` | ✅ **541 / 0** | khớp lời khai (`CHANGELOG` ghi 453 — CAO-2) |
| `do-mo-ra-xem-duoc-tu-kiem` | ✅ ĐỎ **12/12** | 478 phép, không phải 541 |
| `do-bang-that` | ❌ **73 / 2** | nợ có sẵn — **tôi xác minh trên cây `origin/main` tự dựng: 73/2, y hệt** |
| `do-tu-lam-moi` | ❌ **52 / 2** | nợ có sẵn — **không khai** (CAO-4) |
| `do-bang-vua-man` | ❌ **36 / 3** | nợ có sẵn — **không khai** (CAO-4) |

Bàn đo tôi viết để soi nhánh này (chạy lại được, nằm ngoài repo):
`holy-0-mau-thuan.mjs` (mục ⓪) · `holy-gai-loi.mjs` (CHẶN-1) ·
`holy-luoi-D.mjs` (mục Ⓓ) · `holy-dvh.mjs` (CHẶN-2) · `holy-quet-tdz.mjs` (lớp TDZ).
