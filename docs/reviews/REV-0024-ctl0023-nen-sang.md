# REV-0024 — Soi CTL-0023 Đợt 1 (nền sáng, xanh lá + cam thương hiệu)

**HỒ LY** · 2026-08-28 · commit `19c9a0b` · nhánh `feature/ctl-0023-nen-sang`
**Kết luận: FIX_REQUIRED** — sửa 2 dòng rồi đẩy ngay; phần kỹ thuật **sạch, chắc tay**. Tự dựng
phép đo riêng, **không** dùng bộ 28 cặp của Khỉ Đột; chạy `wrangler dev` thật, đọc màu **đã render**.

## 1. ⚠️ CHỮ TRẮNG TRÊN NỀN TRẮNG? — **KHÔNG. Không sót cặp nào.**

Quét lại `style.css`: **589 luật**, bắt **55 cặp chữ–nền tự chứa** (một luật đặt cả `color` lẫn
`background`) — gần **gấp đôi** bộ 28 của nó; mọi luật chỉ đặt `color` được thử trên **cả 4 tầng
nền**; **81 chỗ dán cứng** ngoài `:root` liệt kê riêng. Mọi chữ trắng đều truy về nền **tối thật**
(`.sidebar`=`--ink` · `.login-hero` · `.panel-head` gradient · `rgba(0,0,0,.6)`). **Không chỗ nào
tàng hình.**

Nó khai còn **3** chỗ dán cứng; thực tế **81** — khai thiếu theo hướng *nhẹ hơn*, không giấu lỗi.
Hai chỗ nó **không** nêu (đều không chặn): `.topbar` d.773 `rgba(242,241,238,.88)` = `--surface`
**CŨ** đóng băng, trên **mọi màn**; `.overlay` d.1850 `rgba(63,77,51,.42)` = `--ink` cũ.

## 2. Bốn chỗ nó phản biện — **ĐÚNG CẢ BỐN. Gạo sai, ghi nhận.**

| Phản biện | Phán quyết |
|---|---|
| `--card` vốn đã trắng, `--surface` là mặt chìm | **ĐÚNG.** `--card:#ffffff` có sẵn bản cũ; bảng mục 2 bản giao việc **gán nhầm token** (`#f2f1ee` là `--surface`). 15 `var(--surface)` + 14 `var(--surface-2)` = **29**, khớp. |
| Nền gần trắng thì thẻ **ÍT** nổi | **ĐÚNG**: ΔL\* nền↔thẻ 13.07 → 6.34. |
| 4 tầng 92.2<93.7<97.3<100.0 | **Số ĐÚNG** (92.23·93.66·97.31·100.00). Nhưng nó ghi vào CSS như luật *sẵn có* — **không phải**: bản cũ là `--bg`(86.93) < `--surface-2`(91.67). Chính nó **đảo** hai tầng mà không khai (Δ1.4 L\*, nhẹ). |
| Không dùng thẳng `#6ca839` | **ĐÚNG.** Tự đo: trắng/`#6ca839`=**2.88:1**, trắng/`#4e8122`=**4.68:1**. |

**Màu logo — tự đo bằng `sharp`: KHỚP.** Lá xanh `#6da93a`/`#6ca63a` (nó nói `#6ca839`), lá cam
`#eb7b16`/`#ea7d1a` (nó nói `#eb7c17`). **Không bịa.**

**`#4e8122` còn là màu thương hiệu không? Nửa vời.** Sắc giữ đúng (92.2° vs 92.4°) — nó đúng ở điểm
này. Nhưng **sáng tụt 44%→32%**, bão hoà 49%→58%: mắt đọc ra **xanh rừng sẫm**, không phải xanh lá
tươi — mà **logo thật nằm ngay trên thanh bên**, sẽ thấy hai màu xanh cạnh nhau. **Đường thoát nó
không xét**: `--ink` trên `#6ca839` đạt **5.53:1** — dùng **đúng xanh logo** làm nền, đổi chữ trắng
thành chữ đậm là vừa đạt tương phản vừa giữ đúng thương hiệu. Cân nhắc **Đợt 2**.

## 3. Số đo tương phản — **CÓ THẬT**, cải thiện mạnh.

Tự tính lại WCAG 2.1 **21 cặp**, khớp đến 2 chữ số: `--text`/`--card` 12.01 · `--ink`/`--card` 15.91
· `--text-mute`/`--card` **5.58** · trắng/`--sage` **4.68** · `--ink`/`--sage` **3.40** ·
`--cam-dark`/`--card` 4.91. Trên bộ **55 cặp của riêng tôi**: **24 → 11 trượt**, **0 cặp trượt mới**.

**5 cặp nó nêu**: 4/5 là `--warn`·`--ok`·`--danger` trên wash — **màu mang nghĩa, bản giao việc
CẤM đổi** → hoãn đúng, và **không màu mang nghĩa nào bị đổi nhầm**. Cặp 5 `.sb-item.active` là
**menu đang mở, mọi màn**, nên làm sớm — nhưng **đã trượt từ trước** (3.68→3.40). **Cặp NÓ SÓT mà
kho đọc hằng ngày** (dán cứng nên bộ 28 token không với tới): `.tag-new` `#fff`/`#e8590c` =
**3.58:1** (nhãn "đơn mới", vận hành sàn đọc **mỗi ngày**) · `.mt-the-pct.warn` = **3.23:1** (**số
% tiến độ** Trạm Mục Tiêu) · `.xc-ngay-tt.du_thua` = **4.04:1** (Xếp Ca — **kho**) ·
`.canh-bao-chu` trên `#fbdbd6` = **4.20:1** (đơn hoàn quá 12h — **kho**). Không cái nào chặn phát
hành (≥3:1, **không tệ đi** so bản cũ), nhưng lộ lỗ hổng: bộ 28 cặp **chọn tay**, đo **0/81** chỗ
dán cứng. Thêm **lỗi phép đo (BH-29)**: `do-tuong-phan-mau.mjs` chỉ đọc `:root` **ĐẦU TIÊN**, nên
**mù hoàn toàn** khối `:root` **thứ hai** ở **d.2415** (`--tim`,`--tim-wash`) — nay 5.06:1 nên chưa
lỗi thật, nhưng ai sửa sau sẽ không bị chặn. **Đối chứng tôi tự dựng**: ép `--text`=`#fdfdfc` → đo
ra **1.02:1** (bản thật 12.01); ép `--surface` tối hơn `--bg` → bắt được đảo tầng.

## 4. Tem in giấy — **AN TOÀN**. Layout — **KHÔNG VỠ**.

Bằng chứng mạnh nhất cho tem: **diff không sửa một byte nào dưới dòng 113** → khối tem (d.2205–2238)
và `@media print` **giống hệt** bản trên `main`. Đọc trực tiếp: `.ts-tem{color:#000}` ·
`.ts-tem-ten{color:#000}` · `.ts-tem-phu{color:#333}` — **không một `var(--…)` màu nào** trong cả
vùng tem (token duy nhất `var(--sans)`). `@media print` dùng `visibility` chứ không `display` →
**cơ chế ADR-0008 nguyên vẹn**. Phủ mực khi bật "in cả nền": tự tính **13.07% → 6.34%**. **Khớp.**

**Diff CHỈ đổi giá trị trong `:root`**: lọc mọi dòng `+` không phải chú thích hay khai `--token` →
**rỗng**; không thêm/xoá dòng `{` selector nào. **552 luật — ĐÚNG CHÍNH XÁC**: đếm trên trình duyệt
thật; phân tích tĩnh ra **589 luật ở CẢ hai bản**. **375px**: `scrollWidth`=375=`clientWidth`, **0
phần tử tràn biên**.

## 5. Ảnh 5 màn — **TÔI CŨNG KHÔNG CHỤP ĐƯỢC.**

Đã **thử thật**: `wrangler dev` chạy, `127.0.0.1:8787` trả **200**, mở được màn Đăng nhập. Nhưng
công cụ chụp báo *"the Browser pane is not displayed, so the page is not compositing frames"* —
**không lấy được pixel**, nên **không có ảnh trước/sau nào**. Bù bằng thứ chắc hơn: đọc
`getComputedStyle` trên trang thật. Không nhập mật khẩu, không tạo tài khoản.

## 6. ⛔ VÌ SAO FIX_REQUIRED — Đợt 1 **chưa làm Sếp thấy "nền sáng sủa"**

Phát hiện quan trọng nhất, Khỉ Đột **không** khai. **`var(--bg)` dùng ĐÚNG MỘT LẦN trong 2.474
dòng: `body` (d.127).** Mà `.main` — cả vùng nội dung — là **`background: var(--surface)`** (d.765),
`.app` phủ kín 100vh. **Đăng nhập xong, `--bg` KHÔNG HIỆN RA ĐÂU CẢ.** Nên "thủ phạm `#ded9d3`" của
bản giao việc **và** cả màn phản biện 4 tầng đều xoay quanh token **chỉ thấy ở màn Đăng nhập**.

Nền thật của mọi màn làm việc là `--surface`: `#f2f1ee → #faf7f1`, **chỉ +2.17 L\***. Tệ hơn:
**thẻ trắng nay nổi ÍT hơn trước** — ΔL\* `.main`↔`.panel` **4.86 → 2.69**, đúng bằng lập luận nó
dùng để bác Gạo, chỉ là nó **không soi lại tầng của chính mình**. Cộng thêm hai vùng màu lớn nhất
đều **TỐI ĐI** (thanh bên `#3f4d33→#1e2417`, nút `#9aab86→#4e8122`), Sếp mở lên rất dễ nói **"vẫn
thế"** — mà Đợt 1 sinh ra chính là để *"đẩy lên, để Sếp nhìn thật"*. **Hai dòng sửa trước khi
đẩy**, đều **chỉ đổi giá trị màu**, **không thể** vỡ layout — đề nghị Gạo nới phạm vi **đúng hai
dòng này**:

- **F1 · `.main` d.765: `var(--surface)` → `var(--bg)`.** Vùng nội dung nhận nền kem `#f3ece1`, thẻ
  trắng nổi lại **ΔL\* 6.34**; `--surface` về đúng vai mặt chìm. **Chính là mô hình trang mẫu**
  (nền kem + thẻ trắng), và là **cách duy nhất** để việc đổi `--bg` hiện ra trên màn làm việc.
- **F2 · `.login-hero` d.163**: gradient `#4a5a3c→#6b7d55→#9aab86` → dựng từ token xanh mới. Chiếm
  **52,5%** thẻ đăng nhập, hiện cả trên 375px — **màn Sếp nhìn ĐẦU TIÊN**, và là **nơi duy nhất
  còn sót `#9aab86`**, nằm ngay cạnh nút `#4e8122`.

Cả hai sửa xong phải **chạy lại phép đo tầng** và đo lại chữ trắng `.hero-word` .96/.82 trên nền mới.

## 7. Bảng lỗi

| # | Lỗi | Mức | Chặn phát hành? |
|---|---|---|---|
| F1 | `.main` dùng `--surface` → đổi `--bg` không hiện trên màn làm việc; thẻ nổi kém đi (4.86→2.69) | **CAO** | **CÓ** — trượt mục đích Đợt 1 |
| F2 | `.login-hero` còn gradient ô liu cũ, lệch tông ngay màn đầu tiên | **CAO** | **CÓ** — bản giao việc đã cảnh báo |
| F3 | `.topbar` d.773 đóng băng `--surface` CŨ; L\* 95.5 vs nền 97.3 — xám hơn, **mọi màn** | TRUNG | Không |
| F4 | Phép đo mù khối `:root` thứ hai (d.2415) + đo 0/81 chỗ dán cứng | TRUNG | Không |
| F5 | `.tag-new` 3.58:1 · `.mt-the-pct.warn` 3.23:1 — đọc hằng ngày, ngoài bộ 28 cặp | TRUNG | Không |
| F6 | `.sb-item.active` 3.40:1 (trước 3.68) — menu đang mở, mọi màn | TRUNG | Không — **trượt từ trước** |
| F7 | `.overlay` d.1850 `--ink` cũ (nó **không khai**) · `--bg2` không tồn tại → `.xc-matrix thead th` rơi về `#f3f4f0` xám lạnh | THẤP | Không |
