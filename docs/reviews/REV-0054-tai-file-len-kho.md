# REV-0054 — Tải file có sẵn lên Kho tài liệu (CTL-0026 vòng 6)

`feature/tai-file-len-kho` · HEAD `091435e` (nền `origin/main` `66f06f1`)
**PASS — phát hành được.** 4 lỗi ghi ở bảng cuối, **không cái nào chặn phát hành**.

Tôi chạy lại toàn bộ, không đọc lời khai: `do-tai-tep` · `do-kho-tai-lieu` · `do-quet-375` · `cong-khoi`
@1440 + @375 · `do-ba-mau` · `do-cat-im-lang` · `do-chu-dai` · `do-moc-noi`, cộng bàn đo riêng của tôi
(scratch) gọi thẳng `laByteCuaPDF` / `demTrangPDF` / `Intl.Collator`.

## ⚠️ Câu 1 — ĐƯỜNG CHỤP KHÔNG BỊ PHÁ. Đo lại toàn bộ, không sót mục nào.
`do-kho-tai-lieu`: **267 dòng ĐẠT · 0 HỎNG** — mỏ neo (12/12 tên thật sinh được neo, đối chứng gỡ neo
→ 7/7 lọt), *"con số AI đọc = CHƯA KIỂM"*, phân quyền theo nhóm (kế toán vào nhóm Nhân sự vẫn **403**),
nhật ký (mở 10 lần = **1** lượt ghi D1), câu pháp lý, che dòng nhạy cảm ra CSV: **y nguyên**.
`do-quet-375`: **cham_erp=8** ở cửa kho, **7** ở cửa hồ sơ, **tổng 12 chạm ở cửa hồ sơ** — đúng số cũ,
không đội thêm một chạm nào. `chup_lai=true`, `gui_lai_cung_ma=true`, `nut_44=true`.
`cong-khoi` **XANH ở CẢ 1440 và 375**, `loi_console: []`, `ngoai_le: []`.

**Trần 6 MB của đường máy ảnh: GIỮ NGUYÊN, tôi kiểm ca đối chứng nó khai.** Ảnh 8 MB qua `anh_gop` →
`HTTP 400 "vượt trần 6 MB"`. **Thiếu `dinh_dang` → rơi về trần CHẶT 6 MB**; **bịa `dinh_dang` → cũng
rơi về 6 MB**. Đọc mã xác nhận: `DINH_DANG_HOP_LE.includes(...) ? ... : 'anh_gop'` — mặc định là đường
chặt, không phải đường rộng. Trình duyệt bản cũ chạy y như trước. **Trần 12 trang cũng không bị nới lây**
(đường ảnh vẫn 400 ở trang thứ 13; PDF khai 500 trang vẫn bị chặn ở 200).

**0 migration, 0 cột mới — XÁC MINH THẬT.** `git diff --stat 66f06f1 HEAD -- migrations/` **rỗng**;
`INSERT INTO tai_lieu` vẫn đúng **26 cột** cũ. `nguon` được gửi lên nhưng **máy chủ không đọc** (`grep
"body.nguon" src/tai-lieu.js` → 0 dòng) — vô hại, xem lỗi #4.

## Câu 2 — Chốt `%PDF-` đúng. Trần 25 MB đúng cho MỘT lượt, **hụt cho HAI lượt cùng lúc**.
**File rác đổi đuôi `.pdf` → CHẶN**, cả hai đường (`pdf_goc` và `anh_gop`), **0 ghi D1 · 0 file lên
Drive · 0 lượt gọi Google**. Đối chứng BH-16 (bỏ chốt) → file rác **LỌT 200** ⇒ phép đo có mắt thật.

**Chặn oan: CÓ — xem lỗi #1.** Tôi dựng PDF chuẩn rồi chèn **BOM UTF-8 (3 byte)** và **4 byte xuống
dòng** ở đầu: **cả hai bị chặn**, ở CẢ máy và máy chủ, kèm câu *"có thể file hỏng, hoặc bị đổi tên"* —
câu đó **chẩn đoán sai bệnh**. Trình đọc PDF thật tìm `%PDF-` trong **1024 byte đầu**, không đòi byte 0.

**Trần 25 MB — tôi tự tính lại, con số nó khai ĐÚNG:** base64 của 25 MB = **33,3 MB** (dưới trần thân
100 MB của Workers, đúng như nó nói — không phải chốt chặt nhất); đỉnh **3,7 × 25 MB = 92,5 MB** / 128 MB.
Chuỗi base64 và chuỗi `atob` đều là ASCII/Latin-1 nên V8 giữ **1 byte/ký tự** — hệ số 3,7 không bị nhân đôi.
**NHƯNG 128 MB là của cả isolate, không phải của một yêu cầu:** **hai lượt tải 25 MB trùng giờ = 185 MB**
→ chết isolate, kéo theo mọi yêu cầu đang bay của người khác. Lời khai *"còn chỗ thở"* chỉ đúng khi
một mình. Xem lỗi #2. **Ca biên:** `> tranByte` ⇒ **đúng 25 MB LỌT**, **25 MB + 1 byte CHẶN**; máy đọc
`f.size`, máy chủ đọc `bytes.length` — **cùng một con số, không lệch một byte**. **0 byte CHẶN** ở cả hai
(`length > 5` ở máy, `< 200` ở máy chủ). Đối chứng: 20 MB lọt bình thường.
**Chứng minh 0 byte lên mạng khi vượt trần:** bàn đo có sổ ghi mọi lượt POST — file 30 MB → **0 lượt gửi**,
câu báo hiện **ngay lúc chọn**, nêu cả hai con số và ba cách xử.

## Câu 3 — Đường mặc định theo thiết bị: ĐÚNG, không dính lại REV-0045.
`(pointer: coarse) && maxTouchPoints > 0`, **không đụng `userAgent`** — đọc mã, xác nhận.
**Laptop Windows màn cảm ứng → `chon-tep`** (đúng): có chuột thì con trỏ CHÍNH là `fine`, vế đầu sai.
Bàn đo có đúng ca đó và ca *"máy lạ: coarse nhưng không cảm ứng"* → cũng `chon-tep`. Đây là **hai** dấu
hiệu bắt buộc cùng đúng, chứ không phải một — chính là chỗ REV-0045 sập.
**Hai nút:** ở cả 1440 và 375, đo thật `getBoundingClientRect` → **lệch 0px** (cùng một hàng), **52px ·
52px**, và **đúng MỘT nút cam** trên khung nhìn ở cả hai bề ngang. `do-ba-mau` **12/12 đối chứng**, không
họ màu thứ tư.

## Câu 4 — Thứ tự trang: đúng cả với bộ tên tôi tự dựng khó hơn.
`trang-10, trang-2, trang-1, trang-11, trang-3` → **1·2·3·10·11**; đối chứng `.sort()` trần cho thứ tự
SAI (1·10·11·2·3) ⇒ phép đo nhạy. Bộ khó của tôi: `a1 < A2` (không phân biệt hoa thường),
`scan0009 < scan0010`, `trang-2 < trang-10`, tên tiếng Việt có dấu (`đơn xin nghỉ 2` / `Đơn xin nghỉ`)
xếp cạnh nhau đúng cụm — **không ca nào sai**. `trang 1 (bản sao)` xếp trước `trang-2`, hợp lý, mà kéo tay sửa được.
**Kéo đổi: CHÈN đúng chỗ, không hoán đổi** — kéo thẻ cuối lên đầu → `11·1·2·3·10` (hoán đổi thì phải là
`11·2·3·10·1`). Nút ↑↓ dời **một nấc**, giữ tiêu điểm ở đúng trang vừa dời. **Thẻ 112px** (4 nút, lưới
2×2 — không cao thêm một pixel), **4 nút đều 44px**, đo thật.

## Câu 5 — Chỗ nó tự cắt: cắt ĐÚNG, nhưng câu nói ra thì lộ ruột kỹ thuật.
Trộn ảnh + PDF → **nói thẳng**, không im lặng lấy file đầu. Chọn 2 PDF → **nói rõ mỗi PDF là một tài
liệu riêng**. Chọn 15 ảnh khi trần 12 → **hỏi trước rồi mới cắt**. File sai loại → **gọi đích danh tên
file**. Không ca nào cắt im lặng. `do-cat-im-lang` **SẠCH**.
**Người dùng có hiểu không: một nửa.** Việc-phải-làm thì rõ (*"Làm hai lượt"*, *"Chọn từng file PDF
một"*). Nhưng lý do lại là ruột nhà mình: *"cần thư viện đọc PDF mà ERP không có (ràng buộc chi phí 0)"*,
và ô 25 MB giảng cả *"bộ nhớ 128 MB của Cloudflare Workers"*. Bạn kho đọc câu đó **sẽ tưởng ERP đang
hỏng**. Xem lỗi #3 — sửa chữ, không sửa mã.
**HEIC: KHÔNG phải lỗ thật, nhưng phải dặn người.** Đường thường gặp — nhân viên chụp bằng iPhone rồi
mở ERP **ngay trên iPhone** — chạy bình thường (Safari giải mã được HEIC, và bộ chọn file của iOS
thường tự đổi sang JPG). Đường gãy là **bê file sang máy tính Windows rồi tải lên**: Chrome không giải
mã HEIC, `nenAnhChung()` ném lỗi, ERP **gọi đích danh từng file** kèm ba cách xử (đổi iPhone sang
"Tương thích nhất" · gửi PDF · chụp thẳng tại đây). Xử vậy là đủ. Việc còn lại là **của người, không
phải của mã**: dặn nhân sự kho đổi iPhone sang chụp JPG một lần cho xong.

## Câu 6 — Không hồi quy
`do-kho-tai-lieu` 267/0 · `do-tai-tep` **ĐẠT cả 1440 và 375** · `do-quet-375` ĐẠT (7 và 8 chạm, đúng số đã
khai) · `cong-khoi` XANH @1440 + @375 · `do-ba-mau` 12/12 · `do-cat-im-lang` SẠCH · `do-chu-dai` XANH ·
`do-moc-noi` 9/0. Không bàn đo nào đỏ.

## Bảng lỗi

| # | Lỗi | Mức | Chặn phát hành? |
|---|---|---|---|
| 1 | **Chặn oan PDF có byte thừa ở đầu.** `laByteCuaPDF` đòi `%PDF-` **đúng byte 0**; PDF chuẩn chèn BOM UTF-8 hoặc vài byte xuống dòng bị **chặn ở cả hai lớp**, kèm câu chẩn đoán sai (*"file hỏng hoặc bị đổi tên"*). Sửa: tìm `%PDF-` trong **1024 byte đầu** (đúng cách trình đọc PDF làm) — vẫn chặn được khối byte rác. | Trung bình | **Không** — hiếm gặp, và chặn nhầm còn hơn cho rác vào kho pháp lý |
| 2 | **Trần 25 MB chỉ đủ cho MỘT lượt.** Hai người tải 25 MB trùng giờ = 185 MB > 128 MB → chết isolate, kéo theo yêu cầu của người khác. Sửa: hạ trần xuống ~15 MB, HOẶC ghi thẳng vào chú thích rằng chốt này là chốt **một-lượt** và chấp nhận rủi ro. | Trung bình | **Không** — công ty 20 người, trùng giờ hiếm; hỏng thì báo lỗi rõ, file vẫn nằm trên máy, chọn lại là gửi được |
| 3 | **Câu báo lỗi lộ ruột kỹ thuật.** *"thư viện đọc PDF"*, *"ràng buộc chi phí 0"*, *"bộ nhớ 128 MB Cloudflare Workers"* — bạn kho đọc sẽ tưởng ERP hỏng. Bỏ phần lý do nội bộ, giữ nguyên phần việc-phải-làm. | Thấp | **Không** |
| 4 | **Hai vết nhỏ.** (a) `demTrangPDF` chồng lấn 64 byte ở mỗi mốc 1 MB → trang rơi đúng mép **đếm hai lần** (tôi dựng được ca thật: đếm 2 khi đúng là 1) — sai `so_trang` của file > 1 MB, xác suất ~4% với bản scan 30 trang; sửa: bỏ qua khớp bắt đầu trong vùng chồng lấn. (b) `nguon` gửi lên nhưng máy chủ **không đọc** ⇒ sau này không truy được tài liệu vào kho bằng đường nào. | Thấp | **Không** |

## Bước triển khai
1. Gộp `feature/tai-file-len-kho` vào `main` — **`main` là mục tiêu di động, gộp lại lần cuối trước khi đẩy.**
2. Chạy lại **`npm run cong-khoi` + `cong-khoi-dienthoai`** trên cây đã gộp (luật bắt buộc từ 29/08),
   kèm `do-kho-tai-lieu` và `do-tai-tep`. Đỏ thì dừng.
3. Không có migration ⇒ **không phải chạy `migration-chay`**, không đụng D1 thật; đẩy qua GitHub Actions
   như thường lệ. Không có cột mới nên **lùi bản = lùi mã, không phải lùi dữ liệu**.
4. Việc vòng sau (gộp vào một lượt, không cần phiếu riêng): lỗi #1 · #3 · #4a.
