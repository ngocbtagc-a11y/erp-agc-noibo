# REV-0040 · Kho tài liệu quản trị — VÒNG 2 (CTL-0026 Đợt 1)
Hồ Ly soi `843475a` (vòng 1: `82f5e8b`, REV-0036), nhánh `feature/ctl-0026-kho-tai-lieu`. Không push, không đụng `main`. Soi HẸP theo 4 câu Gạo giao. Mọi con số dưới đây **Hồ Ly tự đo bằng bàn đo riêng và bộ ảnh riêng**, không dùng lại 3 ảnh của Khỉ Đột. Chi phí 0.

## KẾT LUẬN: **FIX_REQUIRED** — 1 lỗi chặn phát hành. Lời khai về AI bịa chữ **ĐÚNG TOÀN BỘ**, và còn nhẹ hơn sự thật.

## ⚠️ CÂU 1 — AI BỊA CHỮ → **LỜI KHAI ĐÚNG. Chốt chặn thì CHƯA ĐỦ.**

**Bộ ảnh riêng của Hồ Ly** (vẽ bằng GDI+, không đụng bàn đo của Khỉ Đột): Giấy CN ĐKKD chữ dày đặc + dấu tròn đỏ · Hợp đồng lao động có **bảng lương 4 dòng số** + số TK 14 chữ số · Hoá đơn GTGT **toàn số** (6 cột, 4 dòng hàng) — mỗi tờ 8 mốc sự thật, thêm 3 biến thể: **mờ · photocopy nhạt · chụp nghiêng 3,2°**. Tất cả đi qua đúng thông số sản phẩm (1100px · 0.65).

**Gọi thật cả hai khuôn trên tài khoản Cloudflare công ty, 6 ảnh × 2 khuôn = 12 lượt:**

| Khuôn | Kết quả | Chữ nó trả về |
|---|---|---|
| `{image, prompt}` (bản cũ 82f5e8b) | **1/48 mốc** | **Y HỆT NHAU cả 6 ảnh:** *"Số: 2345/KH-UBND … Sở Tài nguyên tỉnh Đồng Tháp…"* |
| `messages` (bản 843475a) | **48/48 mốc = 100%** | đúng tờ giấy, 8,3–12,3 giây/trang |

Khuôn cũ trả **cùng một công văn tưởng tượng** cho cả tấm ĐKKD lẫn tấm hoá đơn — bằng chứng cứng là nó **không hề nhìn ảnh**. Con số 8/8 của Khỉ Đột **có thật**, và trên bộ ảnh khó hơn nó vẫn 100%.

**Phép đo kịch trần là phép đo mù — Khỉ Đột thành thật, nhưng Hồ Ly đi tiếp.** Dựng thang tụt tới lúc GÃY (10 bậc nữa):

| Bậc | Đúng mốc | Nó làm gì khi sai |
|---|---|---|
| 900px · 750px | 8/8 · 8/8 | — |
| **620px** | **7/8** | **KHÔNG tự nhận mờ.** MST `0110938472` → **`0110934872`**, bên mua bịa tên khác, địa chỉ bịa |
| 500px · 400px | 3/8 · 1/8 | có ghi `[không rõ]` nhưng **vẫn bịa** dòng hàng, đổi năm 2026→2020 |
| 320px | 0/8 | đọc sang **một hoá đơn khác hẳn** |
| mờ nặng @1100px | **0/8** | bịa cả tờ **dù vẫn đúng độ phân giải sản phẩm** |
| hợp đồng 550px / 420px | 2/8 · 0/8 | 420px bịa ra **"PHẠM KIẾN ĐỨC"** thay cho Phạm Khương Duy |

→ **Ngưỡng gãy thật: 620–750px cho giấy nhiều số; sản phẩm ở 1100px, cách ~1,6×.** Nhưng **MỜ mới là thứ giết, không phải nhỏ**: mờ nặng ở đúng 1100px vẫn ra 0/8. Ảnh mờ 6px của Khỉ Đột chưa đủ mờ để thấy chuyện đó.

**Điều nguy nhất, không có trong lời khai của ai: mô hình KHÔNG hỏng gọn.** Có một dải giữa (620–500px) nó **giữ đúng danh tính tờ giấy** nhưng **thay lặng lẽ vài con số** — MST lệch 2 chữ số, tên đối tác bịa. Không cảnh báo, không `[không rõ]`. Đó là kiểu sai khó phát hiện nhất trong kho pháp lý.

**CHỐT CHỐNG BỊA — thử bằng CHÍNH chữ mô hình thật đã trả về:**

| Ca | Chốt xử |
|---|---|
| bịa hoàn toàn (công văn UBND) · 320px · mờ nặng | **VỨT ĐÚNG** — 4/4 ca thảm hoạ đều chặn |
| **620px & 400px** (số hiệu đọc đúng, MST + bên mua bịa) | **LỌT** — chữ bịa một phần vào thẳng `noi_dung` |
| **ô số hiệu để trống** | **LỌT — chốt không chạy, công văn bịa vào kho** |
| số hiệu < 4 ký tự ("12") | **LỌT** |

→ **Chốt đúng hướng, mức che phủ thì hở đúng chỗ người quét vội.** Người quét một xấp giấy tờ **sẽ** bỏ trống ô số hiệu — đó không phải ca hiếm, đó là ca thường.

**Có cách chặn khác không? CÓ, và Hồ Ly đã đo.** Thêm **mỏ neo thứ hai**: chữ bóc được phải chứa **số hiệu ĐÃ GÕ *hoặc* tên công ty *hoặc* tên loại giấy tờ vừa chọn**. Đo trên 16 mẫu chữ thật: mỏ neo *tên công ty* **bắt 7/7 ca bịa toàn trang** kể cả khi ô số hiệu trống. Không mỏ neo nào bắt được dải giữa — cái đó chỉ chặn được bằng **không cho ảnh xấu vào** và **nói rõ chữ này do máy đọc**.

**⚠️ ĐƯỜNG CCCD — lời khai đúng, chỗ hở còn NẶNG HƠN Khỉ Đột nói.** Dựng thẻ thử riêng (có dấu nước *"ẢNH THỬ NGHIỆM — KHÔNG PHẢI GIẤY TỜ THẬT"*), gọi thật bằng **đúng câu nhắc của `docCCCD`**:

| Ảnh thẻ | Khuôn CŨ | Khuôn MỚI |
|---|---|---|
| nét (1100px) | bỏ trống | họ tên **ĐÚNG** · số **ĐÚNG** |
| mờ vừa | bỏ trống | **ĐÚNG** cả hai |
| **mờ nặng** | bỏ trống | bỏ trống *(an toàn)* |
| **nhỏ 420px** | bịa **"NGUYỄN VĂN A · 1234567890123"** | họ tên đúng · **số CCCD `03691004271` — SAI, mất 1 chữ số** |

→ Khỉ Đột **đúng** khi nói khuôn cũ điền tên và số không có thật. Nhưng: **`docCCCD` KHÔNG hề gọi `chuCoThatKhong()`** — chốt chống bịa chỉ nằm trong `bocChu()` của kho tài liệu. Đường CCCD **không có chốt nào cả**, và Hồ Ly đo được đúng ca nguy nhất: **họ tên đúng đứng cạnh một số CCCD sai** — cái tên đúng làm người ta tin luôn con số. CCCD Việt Nam **luôn đủ 12 chữ số**; ba dòng `/^\d{12}$/` là bắt được đúng ca này.
**Cân mức:** panel *"Đón nhân sự mới — từ ảnh CCCD"* trong `app.html` đang `hidden` và `app.js` **không gọi** `API.nsDocCCCD` → cửa đang đóng, nên **chưa chặn Đợt 1**. Nhưng đây là **điều kiện bắt buộc trước CTL-0025 Đợt 2**: một số CCCD bịa trong hồ sơ lao động không phải lỗi phần mềm, là **giấy tờ sai sự thật**.

## CÂU 2 — NHẬT KÝ VÀ RÒ `trich` → **hai lời khai ĐÚNG. Còn hai đường rò khác chưa ai nhắc.**
Bàn đo riêng, D1 giả có bảng nhật ký thật: **mở 10 lần = 1 lượt ghi + 20 lượt đọc, 1 dòng** ✔ · nhóm thường 10 lần = **0 ghi** ✔ · `trich` của nhóm nhạy cảm = **NULL**, cắt bằng `CASE` trong SQL ✔ · đối chứng bỏ `CASE` → **số CCCD lọt ra danh sách** ✔.

**Đủ cho Luật BVDLCN 91/2025/QH15 chưa? — Về nghĩa vụ thì tạm đủ; về mục đích thì KHÔNG.** Mốc NGÀY trả lời được *"ai đã tiếp cận dữ liệu cá nhân này, ngày nào"* — đủ cho một yêu cầu của chủ thể dữ liệu và một lượt thanh tra. Nó **không** trả lời được *"tối qua có ai kéo hồ sơ này 40 lần không"* — tức là nhật ký này **chứng minh được tuân thủ nhưng không phát hiện được lạm dụng**. Với hạn mức ghi D1 hiện tại, Hồ Ly **đồng ý** đánh đổi này. *(Hồ Ly không phải luật sư — trước khi cam kết với cơ quan quản lý, nhờ luật sư của công ty xác nhận mốc NGÀY là đủ.)*

**Còn đường nào đọc được ruột mà không ghi nhật ký? CÓ HAI, cả hai chưa ai nhắc:**
- **Ô TÌM KIẾM.** Cột `tim_kiem` chứa **toàn bộ chữ đã bóc, kể cả nhóm nhạy cảm** (đo: chuỗi sinh ra có nguyên `001091027384` và `18.500.000`). Đường danh sách quét `tim_kiem LIKE ?` và **ghi 0 lượt nhật ký**. HCNS gõ thẳng một số CCCD vào ô tìm → máy chủ dò trong ruột hồ sơ, dòng hiện lên là **đã xác nhận số đó có trong hồ sơ nào** — đọc được ruột, không để lại vết.
- **SAO LƯU TỰ ĐỘNG.** `src/sao-luu.js` liệt kê bảng bằng `sqlite_master` **trừ** danh sách loại trừ; `tai_lieu` **không** nằm trong danh sách đó, `noi_dung`/`tim_kiem` **không** khớp `MAU_TEN_COT_NGUY`. Nghĩa là **toàn văn chữ bóc của CCCD và hợp đồng lao động được gói ra CSV đưa lên Drive mỗi tháng, 0 dòng nhật ký.** Chú thích trong chính file đó đã tiên liệu *"bảng mới sẽ còn thêm (tai_lieu…)"* — nó thêm thật, và mang theo dữ liệu cá nhân.
- **Không có màn hình nào đọc nhật ký.** `API.tlNhatKy` có trong `api.js` nhưng **không chỗ nào gọi**; chú thích trong `nhatKyTaiLieu()` nhắc tới "màn nhật ký" — màn đó chưa tồn tại. Nhật ký ghi đủ mà không ai đọc được thì chưa dùng được để chứng minh gì.

## CÂU 3 — GỬI LẠI KHI ĐANG BAY → **ĐẠT TOÀN BỘ**, gồm cả ba ca hiểm.
Bàn đo riêng, Drive giả đếm được file mồ côi, D1 giả ép `UNIQUE(ma_gui)` thật:

| Ca | Kết quả |
|---|---|
| hai tab cùng gửi | **1 dòng · 1 file · 0 mồ côi · 0 lỗi ném ra** · lượt thua trả `da_co_san` + `da_don_ban_thua` |
| **bấm Gửi lại 3 lần liên tiếp** | **1 dòng · 1 file · 0 mồ côi** · 2 lượt thua đều dọn xong |
| **mất mạng GIỮA LÚC DỌN** | 1 dòng · Drive còn 2 file (mồ côi) · **vẫn 200, và log in đúng `kho_khoa=f6`** để dọn tay — đúng như mã nguồn khai |
| **hai người cùng quét MỘT tờ giấy** | ra **2 bản ghi · 2 file** — `ma_gui` khác nhau nên `UNIQUE` không bắt |

Ca cuối **không phải lỗi của chốt `ma_gui`** (chốt đó chỉ chống *một người gửi lại*), nhưng kho pháp lý có hai bản cùng một tờ ĐKKD thì sau này không ai biết bản nào là bản đang dùng. Mức THẤP, ghi vào nợ.

## CÂU 4 — HAI FILE LUẬT → **CÓ THẬT, ĐỦ NỘI DUNG.** `docs/BANG-MAU.md` **91 dòng** (3 màu · 3 vai · tỉ trọng 80/12/8 · bốn luật nghề · trích nguyên câu Sếp Ngọc chốt 28/08) · `docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md` **64 dòng** (vì sao · ba bước bắt buộc · bảng ví dụ góp ý → LỚP vấn đề). Cả hai đều nằm trong nhánh này, không phải chỉ trong bảng đo.

## NGOÀI RA
- **94/94 ĐẠT, 0 hỏng** — chạy lại đủ. **Chấm ngẫu nhiên 4 phép bằng bàn đo riêng: đúng cả 4** (khuôn không bọc `data:` hai lần · ảnh trần bọc đúng · ma trận quyền 8 vai trò mở nhóm `nhan_su` ra đúng 403/403/403/403/403/403/200/200 · `duocXemNhomTaiLieu` phân biệt thật).
- **`do-ba-mau` y hệt nền — XÁC MINH ĐÚNG:** 5 lỗi còn lại (`#26261f`, 3× `#fff`, `rgba(0,0,0,.18)`) đều là nợ cũ đúng số dòng; họ nâu–cam 68 mã (nền 67) → đợt này thêm **đúng 1 mã, trong họ**.
- **`do-cat-im-lang` KHÔNG y hệt nền — lời khai này SAI.** Nó ra **3 chỗ hỏng, cả 3 nằm trong file của CTL-0026** (các file này **không tồn tại** ở nền `a9dc0f1`, nên đây là nợ MỚI của nhánh, không phải nợ cũ). Soi từng chỗ: `quet-tai-lieu.js:144` là **báo oan** (`.slice(0,40)` trên UUID); `tai-lieu.js:504` **đúng bản chất** (có trả `bi_cat` và giao diện có hiện) nhưng tự viết lại thay vì dùng `src/cat-danh-sach.js`; **`tai-lieu.js:682` là cắt im lặng THẬT** — `nhatKyTaiLieu()` `LIMIT 200` mà không báo gì. Cắt im lặng **đúng màn nhật ký truy cập** là cắt đúng chỗ không được phép cắt im lặng.
- **`MediaBox` luôn A4 dọc — mức THẤP ĐÚNG.** Điểm ảnh không mất, chỉ hao giấy khi in. Bản quét vốn là bản dự phòng, không phải bản để in.
- **Nút "Quét tài liệu" hiện cho 3 vai trò không lưu được nhóm nào — THẤP nhưng nên sửa luôn.** Đúng là hứa suông với người dùng; nhưng nó không mất dữ liệu, không lộ gì, và sửa hết **3 dòng** (`nutQuet.hidden = !nhomLuuDuoc.length`). Hoãn một việc 3 dòng còn tốn hơn làm.

## BẢNG LỖI
| # | Lỗi | Mức | Chặn phát hành |
|---|---|---|---|
| 1 | Chốt chống bịa **không chạy khi ô số hiệu trống hoặc <4 ký tự** → chữ bịa toàn trang vào `noi_dung`+`tim_kiem` của kho pháp lý. Thêm mỏ neo *tên công ty / tên loại giấy tờ*: Hồ Ly đo bắt **7/7** ca bịa toàn trang | **CAO** | **CÓ** |
| 2 | `docCCCD` **không gọi chốt nào**; đo được **số CCCD sai 11 chữ số đứng cạnh họ tên đúng**. Cần `/^\d{12}$/` + mỏ neo | CAO | Không *(UI đang `hidden`)* — **bắt buộc xong trước CTL-0025 Đợt 2** |
| 3 | "Xem chữ đã bóc" hiện chữ máy đọc **không nhãn nào** → dải bịa một phần (MST lệch 2 số) đọc như nội dung thật | CAO | Không |
| 4 | Cột `tim_kiem` chứa ruột nhóm nhạy cảm; ô tìm dò được mà **0 lượt nhật ký** | TRUNG BÌNH | Không |
| 5 | **Sao lưu tự động gói `noi_dung`/`tim_kiem` của nhóm nhạy cảm ra CSV lên Drive, 0 nhật ký** | TRUNG BÌNH | Không |
| 6 | `nhatKyTaiLieu()` `LIMIT 200` **cắt im lặng** — đúng lớp lỗi trong `LUAT-GOP-Y-LA-TRIEU-CHUNG.md` | TRUNG BÌNH | Không |
| 7 | Không có màn hình nào đọc nhật ký (`API.tlNhatKy` không ai gọi) | TRUNG BÌNH | Không |
| 8 | Nút "Quét tài liệu" hiện cho 3 vai trò không lưu được nhóm nào | THẤP | Không |
| 9 | `MediaBox` luôn A4 dọc | THẤP | Không |
| 10 | Hai người quét cùng một tờ → 2 bản ghi, không chốt theo số hiệu | THẤP | Không |

Sửa **mục 1** (≈8 dòng trong `chuCoThatKhong`) là phát hành được. Mục 2–3 nên vào cùng lượt; mục 5 nên vào trước kỳ sao lưu tháng kế.

## SAU KHI SỬA — TRIỂN KHAI
1. `npm run migration-kiemtra` → `npm run nap-khotailieu-may`. **Kiểm:** `wrangler d1 execute crm-agc --local --command "SELECT name FROM sqlite_master WHERE name LIKE 'tai_lieu%'"` phải ra `tai_lieu` + `tai_lieu_nhat_ky` + 4 chỉ mục.
2. `npm run nap-khotailieu` (mây). **Kiểm:** cùng câu lệnh với `--remote`. Lùi lại: xem đầu `migrations/them-kho-tai-lieu.sql`.
3. `npm run do-kho-tai-lieu` phải **94/94** (thêm phép mới cho mục 1) → `npm run dua-len`. `wrangler.toml` **không đổi**.
4. **Kiểm sau khi lên, 4 việc:** ① đăng nhập tài khoản **kế toán** → không thấy nhóm *Nhân sự*; ② quét một tờ 2 trang bằng **điện thoại thật**, **bỏ trống ô số hiệu** → chữ bịa phải bị vứt; ③ tắt wifi giữa chừng rồi bấm Gửi lại → 1 bản; ④ `node scripts/do-boc-chu.mjs` để có số độ chính xác trên ảnh chụp thật của Sếp.
