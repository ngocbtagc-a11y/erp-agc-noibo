# REV-0044 — Kho tài liệu, VÒNG 3 (dạng cuối, đã gộp `main`)

**Soi:** `agc-day2` · `feature/ctl-0026-kho-tai-lieu` @ `570f7b5` · so `origin/main` @ `e9170de`.
**Bàn đo:** tự dựng, không dùng lại ca của Khỉ Đột — 3 tệp, 49 ca.
⚠️ *14:26, sau khi đo xong: có người đang sửa dở `so-ai.js`/`nhansu.js`/`tai-lieu.js` ngay trong
worktree này (bóc `soCCCD()` ra dùng chung, CHƯA commit) — thuần tái cấu trúc, không đụng
`chuCoThatKhong`/`viTriSoAI`/`tachSoChuaKiem`, **số đo dưới đây vẫn đúng**. Hồ Ly không chạm vào.*

## KẾT LUẬN: **FIX_REQUIRED** — 2 lỗi chặn, cả hai vá được trong một lượt ngắn
Ba lượt vá **đúng hướng và tốt hơn `843475a`**: gộp `main` **sạch**, `chatGanDay` **vá đúng**, hai
đường rò **bịt được**, cổng khói + toàn bộ hồi quy **xanh**. Chỗ hỏng gọn trong Câu 1.

| # | Mức | Chỗ | Đo được | Chặn |
|---|---|---|---|---|
| L1 | Chặn | `app.js` ~9057 `khiXong` | Câu *"chốt KHÔNG chạy"* **không tới mắt người quét** | **CÓ** |
| L2 | Chặn | `tai-lieu.js:305` | **Giấy THẬT bị vứt oan**: hoá đơn NCC, sao kê ngân hàng | **CÓ** |
| L2 | Cao | `DAI_TU_NEO = 5` | Bịa vẫn TRÚNG; **8/12 tên thật không sinh nổi mỏ neo** | không |
| L2 | Cao | `bocChu` (`:390`) | Chốt chạy 1 lần trên chuỗi **ĐÃ GỘP** → 1 trang thật bảo lãnh cả xấp bịa | không |
| L3 | TB | `so-ai.js`·`sao-luu.js` · `docCCCD` | Nhãn con số **chỉ sống trong MỘT màn** (ra CSV/ô tìm thì trần trụi); ba lớp chốt CCCD **không có lối vào giao diện** (`nsDocCCCD` 0 nơi gọi) | không |
| L4 | Thấp | `chuoiTimKiem`·`cheDongNhayCam` · commit `570f7b5` | Nhóm lạ → **mặc định KHÔNG che** (fail-open); khai `npm run do-ba-mau` — **script đó không có** | không |

## Câu 1 — Ba lớp chống bịa
### ⛔ L1 — Câu "chốt không chạy" bị giao diện nuốt
Trả lời thẳng *"người dùng có hiểu câu đó không"*: **họ không đọc được nó.** Bỏ trống mọi ô thì máy
chủ trả `ocr_so_trang > 0` **kèm** `ocr_ghi_chu` = câu giải thích; nhưng `khiXong` rẽ theo
`kq.ocr_so_trang` và **nhánh CÓ chữ không in `ocr_ghi_chu`** — chỉ nhánh *không* bóc được chữ mới in.
Người quét — người **duy nhất còn cầm tờ giấy** — thấy *"bóc chữ được 3 trang"* rồi bấm OK; câu kia
chỉ hiện về sau ở màn "Xem chữ đã bóc", cho người **không** cầm giấy. Cả thiết kế "không giả vờ đã
kiểm" nằm ở một dòng chữ không được in. **Vá:** nối `ocr_ghi_chu` vào **cả hai** nhánh.

### ⛔ L2 — Giấy thật bị vứt oan
Ba tờ **THẬT** bị vứt chữ: hoá đơn GTGT của NCC Sơn La *(số hiệu trống, gõ "Chứng từ mua nguyên
liệu")* · sao kê Techcombank T8 *(trống, "Chứng từ ngân hàng tháng 8")* · trang mờ AI trả
`[không rõ]` *(có số hiệu, "ATTP kho HN")*. Neo ③ đòi **từ người gõ** phải có mặt **trên giấy** —
nhưng người ta gõ tên để *phân loại*, không phải *chép lại*; neo ② không cứu vì giấy NCC/ngân hàng
**không nhắc tên công ty**. So `843475a`: trước, trống số hiệu = **không kiểm = giữ chữ**; nay trống
số hiệu + tiêu đề có một âm tiết ≥5 chữ = **kiểm và vứt** → **bề mặt vứt oan MỚI**, không phải nợ cũ.
**Vá:** neo ③ chỉ để **TRÚNG**, không để **ĐÒI** — y hệt cách đã làm đúng với tên công ty; chỉ
`so_hieu` và mỏ neo `cum` (CCCD) được nằm trong `coMoc`. → *"Tên công ty chỉ để TRÚNG, không để
ĐÒI"*: **đúng, đã làm đúng** — hoá đơn NCC có số hiệu vẫn được giữ.

### L2 — "Từ nguyên vẹn ≥5 chữ" cắt theo ÂM TIẾT, không theo TỪ
`"quyết định"` không trúng oan `"nghị định"` — **đúng**, nhưng vì may: `quyet` ≠ `nghi`/`dinh`(4 chữ).
Thử **9 cặp khác, 8 trúng oan** vì chia chung một âm tiết ≥5: `thông báo`↔`thông tư` · `quyết
định`↔`quyết toán` · `thanh toán`↔`thanh tra` · `chứng nhận`↔`chứng khoán` · `thương mại`↔`thương
binh` · `nguyên liệu`↔`nguyên đơn`… Chiều ngược lại nặng hơn: tiếng Việt là âm tiết ngắn, nên **8/12
tên tài liệu thật không sinh nổi MỘT mỏ neo** — *"Giấy ATTP kho Hà Nội"* · *"Hoá đơn nhập hàng"* ·
*"Hợp đồng lao động"* · *"Tờ khai thuế GTGT"* · *"CCCD anh Duy"*… Mà **Số hiệu** và **Loại giấy** đều
**không bắt buộc** (chỉ `Tên tài liệu` có `required`) → **đường nhanh nhất của người quét một xấp
giấy chính là đường tắt hết mỏ neo**: đúng lỗ vòng 2 bắt bịt, chỉ dời từ `so_hieu` sang ngưỡng 5 chữ.
Còn khi neo ③ **có** chạy thì nó **bảo lãnh cho chữ bịa** — mô hình bịa văn bản hành chính VN bằng
đúng bộ từ vựng ấy: gõ loại "Quyết định" → trang bịa *"QUYẾT ĐỊNH · Bộ Giáo dục và Đào tạo ·
2345/KH-UBND"* **được nhận là thật**. Khai *"7/7 bắt được khi số hiệu trống"* đúng với bộ ca đã chọn,
**không đúng với lớp**.

### L2 — Ghép trang: một trang thật bảo lãnh cả xấp
`bocChu()` nối mọi trang thành `chuGop` rồi gọi `chuCoThatKhong` **đúng một lần**. Đo: trang 1 thật
+ trang 2 bịa → **cùng lưu**. **Vá:** kiểm **từng trang**, nói rõ vứt trang nào.

### Dải giữa — "đeo nhãn" CHẶN hay chỉ TÔ?
**Chỉ TÔ — và ở đường tài liệu như thế là ĐÚNG.** Không có hàm chặn, nhưng cũng **không có ô chính
thức nào để chặn**: `so_hieu`/`tieu_de`/`loai`/`ngay_*` đều người gõ tay, `noi_dung` là chữ tự do —
con số AI **không vào trường có cấu trúc nào**; đường CCCD thì `tachSoChuaKiem` tách thật (đo được).
**Nhưng nhãn chỉ sống trong ĐÚNG MỘT màn:** cùng con số ấy ra trần trụi qua sao lưu CSV và cột
`tim_kiem` — gõ một MST sai vào ô tìm mà thấy tài liệu hiện lên là **đã tự xác nhận con số sai** → L3.

## Câu 2 — Lượt gộp `main`: **KHÔNG nuốt gì** ✅
- `git diff --diff-filter=D origin/main HEAD` → **rỗng**: không tệp nào của `main` bị xoá. `index.js`
  5 dòng của `main` mất — **tất cả** thuộc chính bản vá `chatGanDay` + `nsDonMoi` thiếu phẩy;
  `api.js` 1 dòng = **đúng dấu phẩy**; `app.html`/`style.css` **0**. `app.js` 82 dòng "mất" = **đúng
  khối** `coByteCuaDataUrl` + `nenAnhChung`: md5 thân hàm ở `main:app.js` và `nhánh:anh-chung.js`
  **trùng từng byte** (`bf5fa280…`), `app.js:18` import lại. *(Khỉ Đột đếm theo hunk ra 1/86/1.)*
- Bản vá chat **nguyên vẹn**: `const TBDay` **1895**, `khoiDongChat()` gọi **2201**, khai **3363** →
  TBDay **đứng trước**. `goiMocNoi` **4 chỗ**. Cột bong bóng **đã bỏ hẳn**. `truoc_id` đủ ba lớp.
  `package.json` **9/9** script của cả hai bên.

## Câu 3 — `chatGanDay()` `LIMIT 20` ✅
Vết cắt **có thật** (23 nhân sự > 20) và cắt đúng **danh sách hội thoại**. Vá đúng khuôn:
`LIMIT ${GH+1}` → `catBot` → `nhanCat` **chỉ đếm khi `biCat`**; câu đếm là `COUNT(DISTINCT đối tác)`
— **đúng thứ `LIMIT` đang cắt**; dải hiện tổng thật; `do-cat-im-lang` **SẠCH**, `do-danhsach-hoithoai`
**7/0**. Câu chỉ đường **đi tới được**: Danh bạ có "Chat ngay" cho mọi người (trừ mình) khi có quyền
`chat`, đã bỏ `?.` ở `e9170de`. *(Vụn: chuỗi `xemThem` máy chủ truyền cho `nhanCat` bị giao diện bỏ
qua — câu chỉ đường viết tay lần hai ở `app.js:3509`.)*

## Câu 4 — Hai đường rò + màn nhật ký ✅
- **Ô tìm kiếm**: `001091027384` **không lọt** với nhóm nhạy cảm, nhóm thường vẫn tra được ruột.
  Migration `UPDATE … WHERE nhay_cam=1` dựng lại từ `tieu_de|so_hieu|loai` → **nạp lại bao nhiêu lần cũng cùng kết quả**.
- **Sao lưu — KHÔNG hỏng, đêm nay chạy được.** Dựng CSV thật: dòng `nhay_cam=1` ra file với
  `noi_dung`/`tim_kiem` = `[đã loại khỏi bản sao lưu — dữ liệu cá nhân, Luật BVDLCN 91/2025/QH15]` —
  **ghi rõ lý do, không để trống**; hoá đơn thường **nguyên vẹn**; bảng khác **không che oan**; ô rỗng
  để nguyên; **không sửa tại chỗ**; `nhay_cam` chuỗi `"1"` **vẫn che**; `sao-luu-thu` mọi ca đúng.
  *(Vẫn ra CSV: `tieu_de` có họ tên, `dong_y_boi`, `kho_khoa`.)*
- **Màn nhật ký**: `nhatKyTaiLieu` chặn **403 ở máy chủ** cho mọi vai không phải Admin (giao diện chỉ
  không bày nút); dải cắt `GH=200` **có in ra**; không rò gì thêm.

## Câu 5 — Cổng khói + hồi quy: **toàn bộ XANH** ✅
`cong-khoi` XANH @1440 và @375 · `cong-khoi-tu-kiem` **ĐỎ đúng mẫu hỏng giả** · `do-kho-tai-lieu`
**143/143** · `do-cat-im-lang` **SẠCH** · `do-chat-noibo` 0 · `do-moc-noi` 6/0 ·`do-danhsach-hoithoai`
7/0 · `tu-kiem-thongbao` 74/0 · `do-trangthai-thongbao` 79/0 · `do-nhiptim` 20/0 · `do-duong-di-tiep`
21/0 · `do-ba-mau` 5 nợ cũ 0 mã mới ⚠️ **chỉ chạy được bằng `node scripts/do-ba-mau.mjs`** ·
`--dry-run` đóng gói được. **Gộp xong không hỏng thứ vừa cứu.**

## Sau khi vá hai lỗi chặn — bước triển khai
1. `npm run migration-kiemtra` → `them-kho-tai-lieu.sql` phải là **chưa nạp**; rồi
   `npm run nap-khotailieu-may` → `do-kho-tai-lieu` phải **143/143**.
2. `npm run nap-khotailieu` *(mây)* → `migration-kiemtra` lại, phải thấy **đã nạp**.
3. `cong-khoi` **và** `cong-khoi-dienthoai` cùng **XANH**, rồi mới `npm run dua-len`.
4. Nghiệm thu L1: quét **một** tờ giấy thật, **bỏ trống ô Số hiệu** — màn hình phải **nói ra** rằng
   chốt không chạy. Sáng mai `npm run sao-luu-kiemtra` + mở `tai_lieu.csv` bằng Excel: dòng nhóm Nhân
   sự phải hiện đúng câu `[đã loại khỏi bản sao lưu…]` chứ không phải ô trống.
