# REV-0036 · Kho tài liệu quản trị (CTL-0026 Đợt 1)
Hồ Ly soi `82f5e8b` (nền `a9dc0f1`), nhánh `feature/ctl-0026-kho-tai-lieu`. Không push, không đụng `main`. Mọi số dưới đây **Hồ Ly tự đo lại**, không dùng bàn đo của Khỉ Đột. Chi phí 0, không cài thư viện nào.

## KẾT LUẬN: **FIX_REQUIRED** — 1 lỗi chặn phát hành (câu chỉ đường sai cho Sếp). Phần lõi **ĐẠT**.
Ba lời khai lớn nhất đều **đúng**: ảnh nén xong **vẫn đọc được**, cổng Workers AI **thật sự đang đóng**, phân quyền **cắt ở máy chủ**. Phải sửa là mấy câu chữ nói với Sếp và một lỗ hở khi bấm gửi hai lần.

## ⚠️ CÂU 1 — ẢNH NÉN XONG CÒN ĐỌC ĐƯỢC KHÔNG? → **CÒN. Không chặn phát hành.**
Hồ Ly dựng riêng một trang **Hợp đồng lao động A4 ở 300 dpi (2480×3508)** — thân bài 11pt, bảng lương 9pt, chân trang 7pt, số tài khoản `19036842571014`, dấu tròn đỏ — cho qua **đúng `nenAnhChung()` của sản phẩm**, **đúng `ANH_TRANG` (1700px · 0.72 · trần 450 KB)**:

| Ca | Gốc | Sau nén | Điểm ảnh | Độ nét |
|---|---|---|---|---|
| Scan sạch | 1,02 MB | **190 KB** | 1202×1700 | **≈145 dpi** |
| Chụp điện thoại (nhiễu + hơi mờ) | 3,34 MB | **185 KB** | 1202×1700 | **≈145 dpi** |
| Ảnh cho AI bóc chữ (1100 · 0.65) | — | 91–99 KB | 778×1100 | ≈94 dpi |

**Nhìn tận mắt ở đúng điểm ảnh thật** (cắt native, không phóng to): thân bài 11pt đọc trơn, đủ dấu (`Sở Kế hoạch và Đầu tư`, `Phạm Khương Duy`); bảng lương 9pt và **số tài khoản 14 chữ số đọc rành từng số**; chân trang **7pt — cỡ nhỏ nhất trên giấy tờ thật — vẫn đọc được cả câu**; dấu đỏ giữ nét, `MST 0110938472` đọc được. **Giấy chữ dày đặc không khác giấy chữ to**: cả trang cùng một tỉ lệ 145 dpi.

**Ngưỡng an toàn — số cụ thể.** Đo thang tụt của chính `nenAnhChung()` (1700 rồi ×0,8): 1700px ≈145dpi **rõ** · 1360px ≈116dpi rõ · 1088px ≈93dpi đọc được · **870px ≈74dpi bắt đầu nhoè dấu** · 696px ≈60dpi **mất chữ** · 557/446px vô dụng → **ranh giới ở 870–1088px (74–93 dpi); sản phẩm ở 1700px, cách gần gấp đôi.**

**Thang tụt đó có bao giờ nổ không? KHÔNG — đây mới là con số đáng giá.** Ép ba ca ngày càng ác (giấy trên nền bàn gỗ, nhiễu 40/80/120) → **416 / 437 / 391 KB**, vẫn 1700px. Ca cực đoan tuyệt đối (**nhiễu ngẫu nhiên từng điểm ảnh**, thứ JPEG ghét nhất, gốc 8,42 MB) → **385 KB**. Ở 1700px/0.72 **không đầu vào nào chạm nổi trần 450 KB** → nhánh hạ chất lượng và nhánh thu nhỏ là **đường chết** trên lối quét này: ảnh **luôn** ở đúng mức đã đo là đọc được. Số Khỉ Đột khớp — 3 trang ra **554 KB ảnh · PDF 556 KB** (khai 572/574 KB).

## CÂU 2 — CỔNG WORKERS AI → **LỜI KHAI ĐÚNG.** Nhưng câu chỉ đường cho Sếp thì **SAI**.
Hồ Ly gọi thật bằng chính tài khoản Cloudflare của công ty (Worker tạm riêng, không đụng ERP):
- `@cf/meta/llama-3.2-11b-vision-instruct` → **`5016: Prior to using this model, you must submit the prompt 'agree'`** — **đúng y lời khai. Gạo KHÔNG phải đính chính lần nữa về việc này.**
- `src/nhansu.js:69` dùng **đúng chuỗi mô hình đó** (= `src/tai-lieu.js:66`) → **đường đọc ảnh CCCD cũng đang chết**, đúng như Khỉ Đột nói. Vào từ `e2ecb43` ngày **18/08/2026 — hỏng âm thầm 11 ngày**. Chưa ai dùng thành công: `docs/MODULE-MAP.md` ghi đường đó **`EXPERIMENTAL — tạm ẩn UI`**.
- Bóc chữ hỏng **KHÔNG chặn lưu** — đúng. Và **người dùng CÓ biết**, ba chỗ: thẻ danh sách ghi *"chưa bóc được chữ — tra bằng tên"*, hộp báo sau khi lưu, và bấm "Xem chữ đã bóc" hiện cả `ocr_ghi_chu` (lý do). **Không im lặng.** ĐẠT.

**Hai điều Khỉ Đột nói sai:** ① `dichLoiAI()` bảo Sếp *"chấp nhận điều khoản ở Dashboard → AI → Workers AI"* — chính câu lỗi nói cách khác: **gửi một lượt suy luận với `prompt: 'agree'`**, một cú gọi API, **không phải một cái nút trong Dashboard**. Sếp sẽ đi tìm nút không tồn tại. ② **Cổng khoá theo TỪNG MÔ HÌNH, không phải cả tài khoản**: cùng tài khoản đó, `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (Hồ Ly tự động triage) **chạy tốt** → mảng đó không hỏng. **Và có đường vòng miễn phí, không phải ký gì:** `@cf/meta/llama-4-scout-17b-16e-instruct` và `@cf/mistralai/mistral-small-3.1-24b-instruct` **gọi được ngay**, `@cf/llava-hf/llava-1.5-7b-hf` cũng **không** dính 5016 → "chờ Sếp mở cổng" là **một lựa chọn, không phải một bức tường**. Khỉ Đột **đúng khi không tự bấm 'agree'** (đó là ký thoả thuận pháp lý thay công ty) — nhưng phải bày cho Sếp cả hai đường, đừng đẩy nguyên việc lên bàn Sếp.

## CÂU 3 — QUYỀN VÀ NHẬT KÝ → **ĐẠT** (bộ tư cách riêng của Hồ Ly, 22/22 ca)
- Cấm đúng chỗ: anh **Duy (quản lý kho) KHÔNG** xem được `nhan_su`; chị **Hằng (kế toán) KHÔNG**; Huyền (sàn), CSKH, nhân viên kho, người dùng thường, **admin_backup**, vai trò gõ sai — **đều không**.
- **Không cắt quá tay**: kế toán **xem + lưu** `ke_toan`, `nhap_khau`, `ncc`; **xem** `phap_ly` (cần ĐKKD để kê khai) mà không sửa. Kho xem+lưu `nhap_khau`, `attp`. Huyền lưu `attp` (đi công bố sản phẩm). HCNS giữ `nhan_su`. Ai cũng xem được `noi_bo`. Không ai **lưu được vào nhóm mình không xem lại được** (vét toàn bảng).
- Cắt **ở máy chủ**: `luuTaiLieu` chặn trước mọi thứ; `layVaKiemQuyen` gác cả `mo`/`tep`/`an`; danh sách lọc **ngay trong câu SQL**, không lấy hết rồi lọc trong JS. Nhóm lạ → chặn, không đoán.
- **Nhật ký "1 lượt ghi/người/ngày" — KHAI SAI.** Câu SQL là `ON CONFLICT DO UPDATE SET so_lan = so_lan+1`, **không** phải `INSERT OR IGNORE` như chú thích migration → mở 20 lần = **1 DÒNG nhưng 20 LƯỢT GHI**, đúng cái hạn mức REV-0031/0033 vừa vá. **Có mất dấu**: `luc` không cập nhật khi trùng nên chỉ giữ **giờ mở lần đầu trong ngày** (vá gần như miễn phí: thêm `luc_cuoi = ?` vào chính câu `DO UPDATE`). **Lỗ hở thật hơn:** danh sách trả `trich` = 180 ký tự chữ đã bóc **cho cả tài liệu nhạy cảm**, mà đường đó **không ghi nhật ký**.

## CÂU 4 — GỘP PDF TỰ VIẾT → **ĐẠT.** Đo, không tin.
Soi **từng byte** 5 PDF thật, rồi mở bằng **bộ đọc PDF của Windows (`Windows.Data.Pdf`/PDFium — đúng thứ Edge và Reader dùng)** và vẽ ra ảnh để nhìn: **1 trang · 3 trang · 10 trang · ngang+dọc lẫn lộn · 1 ảnh rất lớn (gốc 3,34 MB nhúng thẳng)** — cả 5: xref trỏ đúng byte, `/Size` khớp, `/Length` khớp, `/Width /Height` khớp luồng JPEG, JPEG đủ SOI+EOI; **mở được hết, vẽ đúng, ảnh ngang không méo**. Đối chứng BH-16 (lệch **1 chữ số** trong bảng xref) → phép soi **bắt được**. *(BH-17: lần đầu đối chứng "đạt" — truy ra `lastIndexOf('xref')` bắt nhầm chữ trong `startxref`; **bàn đo hỏng, không phải code hỏng**. Sửa xong mới dám ghi.)* Bẫy Acrobat đã né sẵn: canvas chỉ sinh JPEG **baseline**, không progressive; bẫy `String.fromCharCode(...)` của BH-27 cũng né đúng. **Lỗi nhỏ:** `MediaBox` **luôn A4 dọc** → ảnh ngang chỉ chiếm ~50% mặt giấy khi in (điểm ảnh không mất).

## CÂU 5 — SÓNG YẾU, GỬI LẠI, KHÔNG TRÙNG → **Ca chính ĐẠT.** Ca hai yêu cầu chồng nhau thì hở.
Gọi **thẳng `luuTaiLieu()`** với D1 giả có ép đúng `UNIQUE(ma_gui)`, đếm số file thật sự đẩy lên Drive:
- **Ca Sếp hỏi** — lưu **thành công** rồi **mất mạng trước khi nhận trả lời**, bấm "Gửi lại": → **1 dòng trong kho, 1 file trên Drive**, lần 2 trả `da_co_san=true`. **KHÔNG có bản trùng.** ĐẠT.
- **Ca hiểm hơn** — bấm Gửi lại **khi lần 1 còn đang bay** (3G mất ~16 giây): D1 giữ **1 dòng** nhờ `UNIQUE`, **nhưng Drive có 2 file (1 mồ côi)** và lỗi `UNIQUE constraint failed` **ném ra ngoài không ai bắt** → người dùng thấy báo lỗi **dù đã lưu xong**. Giao diện khoá nút khi đang gửi nên phải mở hai tab hoặc tải lại trang mới dựng được — hiếm, nhưng có thật.
- Đóng trình duyệt giữa chừng → ảnh **còn**, mở lại có câu *"Đang mở lại bộ quét dở: N trang…"*. ĐẠT. Đối chứng: đổi `ma_gui` → ra **2 bản** thật, phép đo đủ nhạy.
- Bản nháp: Chrome máy này nhận **>26 MB** (12 trang kịch trần chỉ ~7,4 MB). Safari iOS trần ~5 MB thì gãy quanh **7 trang** — **không đo được iPhone ở đây**, nhưng sản phẩm đã bắt lỗi ghi và **nói thẳng trên màn hình** *"Máy không lưu được bản nháp… Đừng đóng trang này"*.

## CÁC MỤC CÒN LẠI
- **Câu về luật có hiện trên màn hình thật không? CÓ, cả ba nơi** — đo trên DOM thật: đầu tab (`app.html`), đầu màn quét (`.tlq-luat`, khớp từng chữ), và mọi câu trả lời máy chủ. Nhóm nhạy cảm hiện thêm *"trả giấy lại cho nhân viên ngay"*; nhóm thường **không** hiện — đúng.
- **14 chạm:** đếm bằng cách bắt `click` thật ở tầng document → **8 chạm trong ERP** (mở kho · chọn nhóm · "Chụp trang tiếp" ×2 · Xong · gõ tên · +3 năm · Lưu) **+ 6 chạm máy ảnh = 14. Khớp.** Bớt được **2**: sau mỗi tấm mở luôn máy ảnh lại (đúng mẹo "chọn nhóm xong máy ảnh bật luôn" đang dùng) + nút "Xong" để thoát.
- **1 lượt ghi D1/lần quét:** ĐÚNG — 1 `INSERT`; hai lượt tra thư mục là `SELECT`, chỉ lần quét **đầu tiên của mỗi nhóm** mới thêm 1 dòng `sao_luu_thu_muc` (≤8 dòng cả đời).
- **Nút ≥44px:** đo `getBoundingClientRect()` trên màn quét thật, cả ba màn. **375px và 320px đều 44,0–90,9px · 0 nút dưới 44px.** ĐẠT.
- **Luật ba màu:** chạy `do-ba-mau.mjs` trên **cả** `82f5e8b` **và** nền `a9dc0f1`. Đợt này thêm **đúng 1 mã màu** (`rgba(44,33,23,.55)` — nền mờ hộp quét), **nằm trong họ nâu–cam** (67→68). **0 mã ngoài ba họ do đợt này sinh ra.** ĐẠT. *(5 lỗi còn lại — `#26261f`, 3× `#fff`, `rgba(0,0,0,.18)` — có y nguyên ở bản nền, cùng số dòng: **nợ cũ, không phải của CTL-0026**.)*
- **Nút chết:** `#tl-nut-quet` hiện với **mọi** vai trò, nhưng `nhan_vien_kho`, `cskh`, `nguoi_dung` không lưu được nhóm nào → bấm vào chỉ ra `alert`. Nên ẩn hoặc khoá kèm lý do.

## BẢNG LỖI
| # | Lỗi | Mức | Chặn phát hành |
|---|---|---|---|
| 1 | `dichLoiAI()` + CHANGELOG chỉ Sếp đi tìm nút ở Dashboard; cách thật là gửi `prompt: 'agree'` tới mô hình | CAO | **CÓ** |
| 2 | Chưa nói cho Sếp biết có mô hình đọc ảnh **không cần ký gì** — biến một lựa chọn thành bức tường | CAO | Không |
| 3 | Khai "nhật ký 1 lượt ghi/người/ngày" trong khi `DO UPDATE` ghi mỗi lượt mở (chú thích migration ghi `OR IGNORE`, code thì không) | TRUNG BÌNH | Không |
| 4 | Gửi lại lúc yêu cầu cũ còn đang bay → **file mồ côi trên Drive** + lỗi `UNIQUE` ném ra ngoài | TRUNG BÌNH | Không |
| 5 | `trich` (180 ký tự đã bóc) của tài liệu **nhạy cảm** lọt ra danh sách mà **không ghi nhật ký** | TRUNG BÌNH | Không |
| 6 | Nhật ký chỉ giữ giờ mở **lần đầu** trong ngày (`luc` không cập nhật khi trùng) | THẤP | Không |
| 7 | `MediaBox` luôn A4 dọc → ảnh ngang chỉ chiếm ~50% mặt giấy khi in | THẤP | Không |
| 8 | Nút "Quét tài liệu" hiện cho 3 vai trò không lưu được nhóm nào → bấm ra `alert` | THẤP | Không |
| 9 | CTL-0026 và mã nguồn trích `docs/BANG-MAU.md` + `docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md` — **không có trong repo** | THẤP | Không |

Sửa xong **mục 1** (5 dòng chữ) là phát hành được. Mục 2–5 nên vào cùng lượt.

## SAU KHI SỬA — TRIỂN KHAI
1. `npm run migration-kiemtra` → `npm run nap-khotailieu-may` → **`npm run nap-khotailieu`** (mây). Tạo `tai_lieu` + `tai_lieu_nhat_ky` + 4 chỉ mục. Lùi lại: xem đầu `migrations/them-kho-tai-lieu.sql`.
2. `npm run dua-len`. `wrangler.toml` **không đổi** — nhắc hạn đi nhờ cron 5 phút của SPEC-0004.
3. Kiểm sau khi lên: đăng nhập bằng tài khoản **kế toán** → **không được** thấy nhóm *Nhân sự*; quét thử một tờ 2 trang bằng **điện thoại thật**, tắt wifi giữa chừng rồi bấm Gửi lại.

## VIỆC CỦA SẾP NGỌC — mở cổng AI đọc ảnh
**Quyết định của chủ tài khoản**, Agent không làm thay: bấm đồng ý là **ký Llama Community License + Acceptable Use Policy thay công ty**. Sếp chọn một trong hai:
- **(A) Không ký gì** — đổi `MO_HINH_DOC_ANH` sang `@cf/meta/llama-4-scout-17b-16e-instruct` (Hồ Ly đã gọi thử trên chính tài khoản công ty: **chạy được ngay**, vẫn miễn phí trong gói). **Nên chọn.**
- **(B) Chấp nhận điều khoản Meta** — gửi **một** lượt suy luận với `prompt: 'agree'` tới `@cf/meta/llama-3.2-11b-vision-instruct`. Mở lại **cả** đường đọc CCCD đang chết từ 18/08.

Chọn xong, chạy `node scripts/do-boc-chu.mjs` để có con số độ chính xác thật (hiện **chưa ai có**).
