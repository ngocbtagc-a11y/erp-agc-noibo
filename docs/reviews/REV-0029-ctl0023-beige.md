# REV-0029 — Soi CTL-0023 Đợt 2c (thanh bên NÂU BEIGE + luật ba màu)

**HỒ LY** · 2026-08-28 · `328331a → 499e60e` · nhánh `feature/ctl-0023-dot2-cam`
**KẾT LUẬN: FIX_REQUIRED — nhưng KHÔNG phải lỗi nhìn thấy.** Beige **đẹp thật**, mọi con số nó khai **tôi tính lại khớp**, mật độ 0 pixel, tem in 0 byte. Chặn ở đúng một chỗ: nó dán **giấy chứng nhận "ĐẠT LUẬT BA MÀU"** lên một bản còn **4 mã trắng tuyền đang chạy**, và **phép kiểm của nó mù hẳn loại mã đó** — tôi tiêm `rgba(255,255,255,1)` vào, nó vẫn báo ĐẠT. Sửa **4 giá trị + 2 dòng phép kiểm**, đẩy luôn trong cùng vòng, **không cần soi lại**.

## 1. Luật ba màu — cụm sắc ĐẠT, luật ① CHƯA

**Phép đếm của tôi, không dùng script của nó**: bóc chú thích đúng cách rồi quét 6 file → **109 mã đang chạy**. Gom theo khe hở 22°, **không áp ranh giới nào**: **2 cụm — 4–47° (87 mã) · 85–120° (13 mã)**. Cụm đầu là nâu–cam–đỏ dính liền (đỏ `--danger` 12,2° nằm trong), cụm sau là xanh lá. Tức **đúng 3 họ + đỏ, KHÔNG có họ thứ tư**.

**`--tim #6b5b95` chết thật** — chỉ còn trong chú thích d.2727, `.tag.tim` nay là `--cam-text`. Nó tự khai lỗi của mình và tự vá: **đúng, không phải khoe**.

**Nhưng luật ① thì chưa.** Còn **4 mã trắng tuyền ĐANG CHẠY** trong `style.css`: d.359 `rgba(255,255,255,.96)` — **chữ** "Alpha" cỡ 132px màn đăng nhập · d.370 `.90` — **chữ** `.hero-foot` · **d.1177 `.92` — nền nút `#mt-nut-mo-form`** trên Trạm Mục Tiêu · d.338 `.10` lớp loé sáng hero.

Chỗ 1177 là bằng chứng nặng nhất: **cách nó 380 dòng, anh em sinh đôi `#vd-nut-mo` (d.806) nó viết `rgba(255,252,244,.92)`** — đúng kem. Nó **biết** giá trị đúng, dùng đúng ở nút mới, mà **không quay lại sửa nút cũ** — vì phép kiểm không bắt.

**Ba mã `#000` miễn trừ: lý do CHÍNH ĐÁNG, nhưng cách miễn thì CHỪA CỬA.** Nội dung miễn đúng (tem in mực đen trên giấy, letterbox camera). Nhưng đếm lại thật: **5 mã `#000` đang chạy + 1 mã `#333`**, không phải 3 — hai mã kia ở `app.html` d.1902 (khung video quét) và d.2978 (khung QR). Chúng lọt **không phải vì được miễn** mà vì §⑤ lọc theo **GIÁ TRỊ**: `#000` có trong `style.css` nên `#000` dán ở **bất kỳ đâu** trong HTML/JS đều qua. §② miễn theo VÙNG (chặt), §⑤ miễn theo MÃ (hở). Hai chuẩn khác nhau trong cùng một file.

**§⑤ "mã màu ngoài `style.css`" — nó KHÔNG tự khen, mục này đúng là thứ bắt được H1.** Tôi xác nhận bằng cơ chế: `#3f4d33` là **xanh lá**, nằm gọn trong ba họ, nên §① không đời nào bắt được; chỉ câu hỏi *"mã này có phải giá trị đang dùng trong style.css không"* mới bắt. Ca đối chứng BH-26 của nó chạy thật và BẮT ĐƯỢC. Đây là mục **có giá trị nhất** nó thêm vòng này.

## 2. Phép kiểm luật ① HỎNG — tôi chứng minh bằng ca đối chứng

`TRANG_DEN = /^(#fff|#ffffff|white|#000|#000000|black)$/i` khớp **chuỗi nguyên**, nên `rgba(255,255,255,…)` không khớp; mà sắc độ = 0 nên nó cũng bị `KHONG_SAC` loại khỏi §① luôn. **Trắng dạng rgba rơi vào khe giữa hai mục, không mục nào soi.**

Tôi tiêm `.hl-doi-chung{color:rgba(255,255,255,1);background:rgba(0,0,0,1)}` — **trắng tuyền và đen tuyền, đục 100%** — rồi chạy `do-ba-mau.mjs`:

> `ĐẠT  Không còn mã trắng tuyền / đen tuyền ngoài vùng được miễn.`

**Bốn ca BH-16 của nó bắt được cả 4 — vì cả 4 đều là dạng `#hex`.** Bộ đối chứng tự chọn đúng loại mình bắt được. Đây là lỗi BH-17: **số ra 0 thì nghi phép đo trước.**

## 3. Beige có "sang" không — CÓ, và số liệu nó khai đúng từng chữ số

Tôi tính lại độc lập: `--sidebar-bg #ebdcca` **L\* 88,50 · sắc độ 33 · góc sắc 32,7°** (nó ghi 34° — lệch 1,3°, cùng kết luận: cách `--cam` 28,6° chỉ 4°, **cùng một ánh nắng**, không bẩn). **33/255 là beige thật**, không còn trắng ngà — bản 2b sắc độ 6, mắt đọc ra trắng trơn.

**ΔL\* với `.main` = 5,27 — đủ.** Không phải vì 5,27 lớn, mà vì nó **cộng với** sợi `--line` `#e2d0ba` L\* 84,39 (chênh 4,11 với chính thanh bên). Hai bậc chồng nhau: mặt phẳng lệch 5,27 + đường viền lệch 4,11 → ranh giới đọc được mà **không cần bức tường màu**, đúng luật ④. Nếu chỉ có ΔL\* 5,27 trần thì hơi mỏng; `--line` đậm thêm một bậc là quyết định đúng, không phải trang trí.

**Hai chỗ nó bảo "giữ mã cũ thì tàng hình" — ĐÚNG CẢ HAI.** `--text-mute` cũ `#6e675e` trên beige = **4,16:1**, trượt ngay ở **dòng chức danh dưới tên Sếp**; `#695c50` kéo lên **4,81**. `--line` cũ `#e5dccd` chênh thanh bên **0,41 bậc L\*** — đường kẻ nhóm biến mất thật. Nền tối thêm 9,5 bậc thì chữ và kẻ **buộc** phải đậm thêm; nó không có đường khác.

**Bốn tầng "ấm lên mà không tối đi" — đúng.** L\*: card 98,99 · surface 96,67 · bg 93,77 · surface-2 92,09 — thứ tự nguyên, độ sáng gần như nguyên, sắc độ tăng (0→11 · 9→15 · 18→22 · 19→23). Không tầng nào đánh đổi tương phản. Và `--ink #2c2117` góc sắc **28,6°** trùng đúng `--cam`: chữ và nút cùng một họ nâu-cam — đây mới là chi tiết khiến nó "sang", không phải độ đậm.

## 4. Số đo — tự chạy lại, khớp; nhưng "0 trượt" phủ tới đâu thì phải nói rõ

Tôi chạy lại cả hai bàn đo trên máy mình: **bàn tĩnh 193/193 đạt · 0 trượt · 20/20 ca đối chứng bắt được**. **Luật CSS: `{`=`}`=606 ở CẢ HAI commit, khối `@` 16, luật lá 590 → 606→606 ĐÚNG.** **Tem in: `sha256` khối `.ts-tem*` = `b389187a681ea4d5…` và `@page`+`@media print` = `568c21de3b17cecf…` — GIỐNG HỆT hai bản, 0 byte.**

**Mật độ — tôi đo bằng pixel, không tin bảng.** Chồng ảnh trước/sau, dò vị trí đường kẻ ngang trong **vùng nội dung**: Kho vận `69,70,144,145,146,152,291,292,347,348,368,369,410,411,431,470,471,475` **trùng khít**, chỉ **thêm** một cạnh ở 476 (viền đáy thẻ nay đủ tương phản để hiện ra). Trạm Mục Tiêu: 25 cạnh, lệch ≤1px. **Không dòng nào bị đẩy đi đâu.** Khai "741→741, 0 byte đổi" — nhất quán với đo pixel của tôi.

**Còn "961 cặp" thì lý do nó đưa ĐÚNG, nhưng kết luận phải hẹp lại.** Ảnh chụp cho thấy bảng Kho vận **chỉ có dòng tiêu đề, không một dòng dữ liệu**, Trạm Mục Tiêu hiện *"Quý undefined/undefined"* — bàn đo dựng trang **không đăng nhập**, API không trả gì. Nên **961/961, thấp nhất 4,61 chỉ phủ PHẦN VỎ**: khung, menu, đầu bảng, panel rỗng. Vòng trước tôi đo 4.443 cặp là đếm theo luật×biến-thể — khác đơn vị, **nó không giấu gì**. Chỗ trám lại là **bàn TĨNH 193 cặp**, và bật `DAY_DU=1` soi thẳng thì nó có phủ đúng dòng dữ liệu tôi bắt vòng trước: `.form-loi` **4,33→5,26** · `.mt-chip.warn` **2,82→5,47** · `.hd-han.sap-het` **3,23→5,11** · `.canh-bao-chu` **6,97** · `.tag.*` 5,29–7,04. **Cả 15 cặp còn trượt ở REV-0026 nay sạch.** *Vỏ* đo bằng DOM, *ruột* đo bằng bàn tĩnh — cộng lại đủ phủ, nhưng đừng viết "961/961, 0 trượt" như thể nó phủ cả dữ liệu.

## 5. Hai thanh Vinh danh & Trạm Mục Tiêu — vá ĐÚNG, và không có cách khác

Chữ trắng trên dải cam cũ = **2,19 / 2,92:1**, phạm đúng **LUẬT BA DÒNG chính nó viết trong `:root`**. Đảo thành chữ `--ink` + kéo dải về phía sáng, tôi đo lại: `#ef8434` **6,00** · `#e2792e` **5,24** · `#de6a22` **4,63**; Vinh danh `#e3ae4a` **7,79** · `#cf9740` **6,10** · `#bc7e31` **4,61**. Khớp con số nó khai (7,71/6,13 — lệch 0,08, làm tròn).

**Có cách giữ chữ trắng không? Có, nhưng nó tệ hơn — tôi đo hết dải:** kem `--white` cần nền tối tới `#b45606` mới đạt **4,79**; `#c9600a` mới chỉ **3,97**. Mà `#b45606` **chính là `--cam-dark`, chính là màu `.btn-primary`** → hai mảng cam **cùng độ đậm** trên một màn = phạm thẳng luật ③; và thanh tụt từ L\* 58–66 xuống **47**, tức **TỐI ĐI**, mất đúng cái "rực rỡ". **Đảo chữ là lựa chọn duy nhất đúng.**

**Bằng mắt trên ảnh: thanh SÁNG HƠN thật, không nhạt đi.** Tôi lấy pixel: thanh Trạm Mục Tiêu **(208,103,36) → (230,124,48)**, Vinh danh **(189,139,58) → (215,160,68)** — sáng và rực hơn ở cả hai. Tinh thần Sếp chốt 21/08 còn nguyên.

## 6. ⚠️ MỘT ẢNH TRONG BỘ 12 ĐANG NÓI DỐI — đừng hoảng khi xem

`1440-trammuctieu-sau.png`: viên cam mục menu đang chọn trông **nhạt thếch**. Tôi lấy pixel = **(234,208,179)**, tức `--cam` mới **12,5% alpha** trên nền beige. Nhưng `1440-khovan-sau.png` cho **(235,124,23) — đúng `#eb7c17` đặc, 2.535 pixel, y hệt bản trước**. CSS d.731 không đổi một chữ.
→ **Ảnh chụp bắt đúng lúc `transition: background .14s` chưa chạy xong.** Là lỗi **máy chụp**, không phải lỗi màu. Nhưng nếu Sếp mở đúng ảnh đó thì kết luận sai ngay — `chup-anh-giao-dien.mjs` phải chờ transition xong mới bấm máy.

## 7. Ba câu hỏi lẻ

**`--danger-dark` KHÔNG phạm luật ba màu.** `#944c39` góc sắc **12,5°**, `--danger` **12,2°** — lệch 0,3°, cùng một sắc đỏ, chỉ khác độ sáng (L\* 46,13 → 40,83). Đúng **luật ②** *"chiều sâu bằng ĐẬM–NHẠT, không bằng thêm màu"*, cùng khuôn `--warn-dark`/`--ok-dark`. **`--r-sm` = `8px` — XÁC NHẬN**, đúng phép đếm REV-0026 §5 của tôi.

**Đụng `app.js` · `index.html` · `manifest` · `reset.html`: CHÍNH ĐÁNG, không lấn.** Bốn file đó là **H1, H2, H7 của chính REV-0026** — tôi giao, nó làm. Riêng `app.js` d.6868 nó **tự tìm thêm** hai mã dán cứng ngoài bảng màu (`#3f6b3f` xanh cũ, `#b3462f` đỏ tự chế) ở báo cáo Kho vận và đổi sang `--ok-dark`/`--danger-dark` — **đúng loại lỗi H1**, tự tìm ra, không ai bảo. Ghi nhận.

## 8. Câu 5 — Sếp đã chốt, đây là THÔNG SỐ để Khỉ Đột làm (chưa làm)

Phương án chốt: giữ cam cho **mục menu đang chọn** + **nút chính**; hai thanh sang nền nhạt.

**① Ngưỡng để hai thanh không chìm.** Hai thanh nằm TRÊN mặt thẻ `--card` L\* 98,99, nên mốc phải tính với **card**, không phải với nền trang: **ΔL\* ≥ 5 mới đọc ra là một dải; ≥ 8 mới đủ "nhìn thấy ngay"** cho khối Sếp muốn người ta để ý.

| Ứng viên (token đã có) | L\* | ΔL\* vs `--card` | ΔL\* vs `--bg` | `--ink` | `--text-mute` | `--cam-text` |
|---|---|---|---|---|---|---|
| `--cam-wash` `#fef5ec` | 97,00 | **1,99 ✗ tan vào thẻ** | 3,23 | 14,57 | — | 5,21 |
| `--surface` `#faf5eb` | 96,67 | **2,32 ✗** | 2,90 | 14,45 | — | 5,16 |
| `--warn-wash` `#f7efe1` | 94,71 | 4,28 ~ | **0,95 ✗** | 13,75 | — | 4,91 |
| `--surface-2` `#f1e7da` | 92,09 | 6,90 ✔ | 1,67 | 12,85 | 5,29 | 4,59 |
| **`--sidebar-bg` `#ebdcca`** | 88,50 | **10,49 ✔✔** | **5,27 ✔** | **11,68** | **4,81** | 4,17 ✗ |

**② Chọn `--sidebar-bg #ebdcca`. KHÔNG đẻ token mới.** Lý do: (a) ΔL\* 10,49 với thẻ — dải hiện rõ không cần mảng cam; (b) góc sắc 32,7°, ấm đúng họ, cạnh nút cam không bẩn; (c) nó **buộc hai thanh vào cùng chất liệu với thanh bên**, cả màn thành một bộ. `--cam-wash` và `--surface` **loại thẳng** — chênh thẻ dưới 2,5 bậc, thanh biến mất.

**③ Chữ trên nền mới, đo sẵn:** `h4` `--ink` = **11,68:1** ✔ · `.hint` `--text-mute` = **4,81:1** ✔ · nút `#vd-nut-mo`/`#mt-nut-mo-form` giữ mặt kem `rgba(255,252,244,.92)`, chữ `--warn-dark` = **6,10:1** / `--cam-text` = **5,47:1** ✔. **⚠️ ĐỪNG đặt `--cam-text` thẳng lên `#ebdcca`: 4,17:1 — TRƯỢT.**

**④ Giữ hai thanh khác nhau mà không tốn mảng cam** — luật ④: `box-shadow: inset 0 3px 0 var(--warn)` cho Vinh danh, `inset 0 3px 0 var(--cam)` cho Trạm Mục Tiêu. **Inset không chiếm chỗ → 0 pixel mật độ.** Sợi 3px không phải "điểm nhấn", nó là nhãn.

**⑤ Đếm lại điểm cam trên Tổng quan sau khi làm: từ 3 mảng → còn ĐÚNG 1** (`.sb-item.active` `--cam`), cộng 2 sợi 3px. Ảnh `1440-trammuctieu` xác nhận màn Tổng quan **không có `.btn-primary`** — mọi nút ở đó đều là chip kem. **Luật ③ ĐẠT sạch: một khung nhìn, một điểm nhấn.**

## 9. Bảng lỗi

| # | Lỗi | Mức | Chặn phát hành? |
|---|---|---|---|
| K1 | **Phép kiểm luật ① mù `rgba` trắng/đen** — tôi tiêm `rgba(255,255,255,1)` + `rgba(0,0,0,1)`, nó vẫn báo ĐẠT. Giấy chứng nhận "ĐẠT LUẬT BA MÀU" hiện **không có giá trị** | **CAO** | **Sửa kèm — nới `TRANG_DEN` + thêm 1 ca BH dạng rgba** |
| K2 | 4 mã trắng tuyền đang chạy: d.359 `.96`, d.370 `.90`, **d.1177 `.92`**, d.338 `.10`. Riêng d.1177 có sẵn bản đúng `rgba(255,252,244,.92)` ở d.806 | **CAO** | **Sửa kèm — đổi `255,255,255`→`255,252,244`, 4 chỗ, 0 rủi ro** |
| K3 | §⑤ miễn theo **GIÁ TRỊ** chứ không theo **VÙNG**: `#000`/`#333` dán bất kỳ đâu trong HTML/JS đều lọt. Đếm thật là **5 `#000` + 1 `#333`**, không phải 3 | TRUNG | Không — 2 chỗ hiện có (video, QR) đều chính đáng |
| K4 | `1440-trammuctieu-sau.png` chụp giữa `transition .14s` → viên cam mục menu trông nhạt thếch, **sai sự thật**. Máy chụp phải chờ transition | TRUNG | Không — nhưng **sửa trước khi đưa Sếp xem ảnh** |
| K5 | Khai "961/961, 0 trượt" mà không nói rõ **961 chỉ phủ phần VỎ** (trang không đăng nhập, 0 dòng dữ liệu). Ruột do bàn tĩnh 193 phủ — hai thứ phải viết tách | TRUNG | Không — cộng lại vẫn đủ phủ |
| K6 | Ảnh 375px cả **trước lẫn sau** đều tràn ngang (chữ cụt ở mép phải) — **không do vòng này**, nhưng chưa ai soi | THẤP | Không — phiếu riêng |
| K7 | Góc sắc `--sidebar-bg` khai 34°, tính lại **32,7°**; `--ink` trên `#bc7e31` khai 4,61 vs 4,61 ✔, `#e3ae4a` khai 7,71 vs **7,79** | THẤP | Không |

## 10. Bằng MẮT — mở ERP lên có "sang" không

**Có. Lần này là sang thật, không phải chỉ hết đen.** Ba thứ tôi nhìn ra ngay trên ảnh:

Thanh bên **không còn là giấy trắng dán cạnh giấy kem** — nó là một dải **beige ấm có chất**, đọc ra "vật liệu" chứ không đọc ra "chỗ trống". Đúng thứ Sếp gọi tên: bản 2b hết đen nhưng **lạnh và rỗng**; 2c có nhiệt độ. Cả màn giờ là **một dải nâu-kem liền mạch**, chỉ tách nhau bằng **sợi kẻ mảnh**, và **một viên cam duy nhất** ở mục đang mở — mắt biết ngay mình đang đứng đâu. Màn **đăng nhập** là chỗ đẹp nhất: chữ "Alpha" serif trên khối xanh đậm, khung kem, nút cam bo tròn có bóng cùng màu — nhìn không ra giao diện nội bộ tự làm. Màn **Kho vận**, màn nhân viên mở cả ngày, sạch và ấm, **không một mảng xám nào**.

**Chỗ chưa đã:** hai thanh Vinh danh + Trạm Mục Tiêu vẫn là **hai mảng màu to đùng chiếm nửa màn trên** — nhìn vào Tổng quan, mắt bị hai cái đó giữ, mục menu đang chọn thành thứ yếu. Đúng cái luật ③ Sếp chốt. **Việc §8 phải làm ngay sau vòng này**, làm xong màn Tổng quan mới thật sự có một điểm nhấn.

**Chốt:** sửa **K1 + K2 (4 giá trị màu + 2 dòng phép kiểm)** rồi **đẩy ngay trong cùng vòng, không soi lại**. Phần nhìn đã xong và đã đẹp — tôi chỉ không cho phép dán chứng nhận "đạt luật" lên một phép kiểm tôi vừa chứng minh là mù.
