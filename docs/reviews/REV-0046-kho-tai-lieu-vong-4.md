# REV-0046 — Kho tài liệu, vòng 4 (soi hẹp)

**Nhánh** `feature/ctl-0026-kho-tai-lieu` · **HEAD** `4fb1257` · Hồ Ly, 29/08/2026
Soi hẹp: mỏ neo (`4fb1257`) · cửa hồ sơ nhân sự (`ede9899`) · L1/L3/L4 · không hồi quy.
Phần đã kiểm sạch vòng 3 (gộp `main` · `chatGanDay` · hai đường rò · cổng khói): **không soi lại**.

## KẾT LUẬN: **FIX_REQUIRED** — đúng **1 lỗi chặn phát hành**, nằm ở migration, không nằm ở mã.
Phần Khỉ Đột làm ở vòng này **đúng**. Nó nói tôi đúng rồi đổi hướng — và hướng mới đúng thật,
đo được, không phải lời khai. Tôi không bới thêm.

## Câu 1 — MỎ NEO: dựng lại 49 ca + 20 ca mới → **ĐÚNG**
Bóc `docTinChu` / `cumNeoTuTen` / `chuChoOTim` ra chạy độc lập. **40/40 đạt.**

| Bộ ca | Vòng 3 | Vòng 4 (tôi tự đo) |
|---|---|---|
| 3 tờ giấy THẬT (hoá đơn NCC · sao kê Techcombank · trang mờ) | 3/3 bị vứt chữ | **0/3** — chữ luôn lưu |
| 9 cặp tên gần nhau | 9/9 trúng oan | **0/9** lên "ĐÃ ĐỐI CHIẾU" |
| 12 tên tài liệu thật sinh được mỏ neo | 3/12 | **12/12** |
| 5 cặp KHÓ HƠN tôi tự nghĩ (`quyết định bổ nhiệm` ↔ `quyết định bổ sung`…) | — | **0/5** trúng oan |
| Xấp 1 thật + 2 bịa | 1 trang bảo lãnh cả xấp | neo **1/3** |
| **Xấp 10 trang, 1 thật 9 bịa** *(Gạo yêu cầu)*; trang thật nằm CUỐI; xấp toàn bịa | — | **1/10** · **1/10** · **0/9**, ô tìm chỉ có chữ trang thật |
| Trang bịa "Bộ Giáo dục" khi gõ "Quyết định" | nhận là thật | **`neo_yeu`, không vào ô tìm** ✅ |

**Ranh giới MẠNH/YẾU đặt ĐÚNG** — chỗ này tôi soi kỹ nhất. **Số hiệu là neo MẠNH có cơ sở:**
ca xấu nhất là trang BỊA chép đúng số hiệu người gõ → `da_neo`; nhưng `bocChu()` gửi lên AI
**một lời nhắc CỐ ĐỊNH** (`src/tai-lieu.js:499`), **không truyền `soHieu`/`tieuDe`/tên công ty**
vào — mô hình không có đường nào biết chuỗi đó. **Tên công ty MẠNH nhưng chỉ để TRÚNG, không
để ĐÒI** — hoá đơn NCC không nhắc tên công ty mình vẫn không bị vứt. **Cụm từ tên người gõ là
YẾU**, và `neo_yeu` không được vào `tim_kiem`.

**Có giấy THẬT nào bị hạ oan không? — CÓ, hai ca, tôi chấp nhận:** `Giấy khám sức khoẻ`
bệnh viện và `Quyết định bổ nhiệm Phạm Khương Duy` (không số hiệu, không nhắc tên công ty)
cùng rơi xuống `neo_yeu`. **Thiệt hại gần bằng 0**: cả hai thuộc nhóm `nhan_su` — nhóm nhạy
cảm vốn **không bao giờ** được đưa ruột vào ô tìm, nên `da_neo` hay `neo_yeu` cũng không đổi
gì ngoài cái nhãn; ảnh vẫn lưu, gõ số hiệu vào là lên `da_neo` ngay (đo được). **Không cần sửa.**

**Cắt theo cặp âm tiết:** `thong bao` ≠ `thong tu`, `quyet dinh` ≠ `quyet toan`, mà `giay attp`
vẫn sinh được; ngưỡng tổng ≥6 chữ chặn cặp rác (`do an`, `ky so`). Tên 1 âm tiết ("CCCD") nói
thẳng là **không có mỏ neo** thay vì bịa một cái yếu — đúng.

## Câu 2 — CỬA HỒ SƠ NHÂN SỰ → **ĐÚNG** (1 lỗ nhỏ, không chặn)
Đo bằng JSON qua `danhSachTaiLieu`/`luuTaiLieu` với D1 giả, **không nhìn màn hình**. **36/36 đạt.**

- **Quyền:** `hcns`+`admin` → 200. `quan_ly_kho` · `ke_toan_truong` · `admin_backup` ·
  `nhan_vien_kho` · `cskh` · **vai trò lạ** → **403 nói thẳng**, không trả danh sách rỗng.
  Đường LƯU cũng 403 ở máy chủ. Cửa `nhan_su` khoá cứng nhóm: gửi `nhom=attp` không lách được.
  `gan_id` trỏ người không có thật → 404. Kho chung gửi kèm `gan_id` → vứt, không sinh dòng mồ côi.
- **Hai chiều nhìn — đúng cả hai chiều:** giấy quét ở hồ sơ **có** hiện ở kho chung (kèm
  `gan_ten`); giấy kho chung **không** lẫn vào bộ của một người. Bỏ lọc `cua_vao='kho_chung'`
  **không nới quyền chút nào** — quyền vẫn cắt bằng NHÓM trong SQL.
- **Không cắt quá tay:** HCNS xem `nhan_su`+`noi_bo`+`phap_ly`, lưu `nhan_su`+`noi_bo`; admin
  đủ 7/7; quản lý kho mất giấy nhân sự nhưng **vẫn thấy ATTP/nhập khẩu**.
- **Cắt nút "Nhật ký truy cập" khỏi khối hồ sơ — TÔI ĐỒNG Ý.** Chỉ Admin dùng; Admin xem được
  `*` nên tờ nào cũng với tới từ tab Kho tài liệu; chép bản hai là chép cả hàm vẽ lẫn hàm bắt
  sự kiện. Khối hồ sơ đã nói rõ "mỗi lượt mở đều ghi nhật ký". **"Thành 1 bộ" — gần trọn**, xem lỗi #2.

## Câu 3 — L1 / L3 / L4 → **ĐÚNG cả ba**
- **L1 — cách đo CÓ THẬT.** Bàn đo bóc thân hàm `cauSauKhiQuet` bằng đếm ngoặc, dựng lại bằng
  `new Function` rồi **chạy** (`do-kho-tai-lieu.mjs:1619`) — không khớp chuỗi. Có **ca đối chứng
  đột biến**: gỡ dòng in `ocr_ghi_chu` → bóc lại → câu phải biến mất. `soLanGoi === 2` chứng
  minh hai cửa quét dùng chung một câu báo.
- **L3** `chuChoOTim()` gọt sạch cụm số máy đọc (đo: không còn một chữ số), giữ nguyên chữ.
  Nhãn CHƯA KIỂM nằm trong chính `noi_dung` nên **sống qua CSV** — đo trên `cheDongNhayCam`
  thật; dòng nhạy cảm vẫn bị che nguyên. **L4** `chuoiTimKiem` nhóm lạ → fail-closed; số hiệu
  người gõ vẫn vào ô tìm.

## Câu 4 — Không hồi quy
`do-kho-tai-lieu` **229/229 ĐẠT · 0 HỎNG** · `cong-khoi` @1440 và @375 **XANH/XANH**, 0 lỗi
console · `do-cat-im-lang` SẠCH · `do-moc-noi` 6/6 · `do-duong-di-tiep` 21/21 ·
`do-trangthai-thongbao` 79/79 · `tu-kiem-thongbao-tinnhan` 74/74 · **`sao-luu-thu` SẠCH, thoát 0**
(15/15 ca chống công thức, BOM UTF-8, tiếng Việt đủ dấu — **chạy thật đêm nay được**) ·
`do-ba-mau` **ĐỎ**, xem lỗi #3.

## BẢNG LỖI

| # | Lỗi | Chỗ | Mức | Chặn phát hành? |
|---|---|---|---|---|
| 1 | **Migration thêm `ocr_so_trang_neo` vào giữa `CREATE TABLE IF NOT EXISTS`, KHÔNG có `ALTER TABLE`.** Môi trường nào đã có bảng `tai_lieu` (bản 1 đã chạy `nap-khotailieu-may`) thì nạp lại **không thêm cột**, và **mọi lượt quét chết** vì `INSERT` liệt kê cột đó. Dựng lại bằng `node:sqlite`: nạp bản `570f7b5` rồi nạp bản `4fb1257` → `có ocr_so_trang_neo? **false**` | `migrations/them-kho-tai-lieu.sql:79` | **CAO** | **CÓ** |
| 2 | Giấy nhóm `nhan_su` quét ở **cửa kho chung** (HCNS chọn nhóm "Nhân sự" ở tab Kho tài liệu) có `gan_id` NULL ⇒ **không bao giờ nằm trong bộ của ai** — đúng thứ Sếp gọi là "thành 1 bộ" | `src/quyen.js` (`hcns.luu` có `nhan_su`) | TRUNG BÌNH | Không |
| 3 | `do-ba-mau` là bàn đo **mới thêm ở `4fb1257`** và **đang ĐỎ** (1 mã ngoài ba họ, 4 mã trắng/đen tuyền). Vi phạm là **nợ cũ** — CSS của `ede9899` chỉ dùng `var()`. Nhưng bàn đo đỏ mà không mắc vào cổng khói thì sẽ không ai nhìn | `style.css` d.1698/1821/3120/3176/3189 | THẤP | Không |
| 4 | Thẻ giấy tờ ở khối **hồ sơ nhân sự** không có nút "Xem chữ đã bóc" (kho chung thì có). Không mất gì — HCNS xem được nhóm `nhan_su` ở tab Kho tài liệu | `app.js:4943` | THẤP | Không |
| 5 | Lời khai "1 lượt ghi + **1** lượt đọc"; bàn đo in "1 lượt ghi, **3** lượt đọc". Con số cần bảo vệ (1 lượt GHI) vẫn đúng — chỉ lời khai lệch | thân commit `ede9899` | THẤP | Không |

### Cách vá lỗi #1 (an toàn cả hai chiều)
Giữ nguyên `CREATE TABLE IF NOT EXISTS` cho máy trắng; thêm **file riêng**
`migrations/them-cot-ocr-neo.sql` (đúng nếp `them-canhbao-kho.sql`) chứa
`ALTER TABLE tai_lieu ADD COLUMN ocr_so_trang_neo INTEGER NOT NULL DEFAULT 0;`, chạy sau.
SQLite không có `ADD COLUMN IF NOT EXISTS` ⇒ báo `duplicate column name` chính là câu "đã có
rồi", không phải sự cố. Bàn đo thêm ca: nạp bản cũ → nạp bản mới → `pragma_table_info` phải có
cột. **File lùi:** file cũ chưa có `lui-*.sql` riêng nhưng đầu migration đã ghi sẵn 3 câu lùi
(`DROP TABLE` ×2 + xoá `schema_migrations`), hai bảng chưa có gì trỏ vào — đủ; file mới cũng phải ghi.

## Bước triển khai (sau khi vá lỗi #1)
1. `npm run migration-kiemtra` → **kiểm:** không báo file lạ.
2. `npm run nap-khotailieu-may`, rồi nạp mây → **kiểm:** `npx wrangler d1 execute crm-agc
   --remote --command "SELECT name FROM pragma_table_info('tai_lieu')"` **phải** có
   `ocr_so_trang_neo`. Không có là **dừng**, đừng đẩy mã.
3. `npm run cong-khoi` + `npm run cong-khoi-dienthoai` → **kiểm:** cả hai XANH.
   `npm run do-kho-tai-lieu` → **kiểm:** 229/229, 0 HỎNG.
4. Đẩy mã, rồi **kiểm tay đúng 4 việc:** (a) HCNS mở hồ sơ Phạm Khương Duy, quét quyết định
   2 trang → đủ 12 chạm, câu "n trang CHƯA ĐỐI CHIẾU ĐƯỢC" **phải hiện**; (b) tờ vừa quét
   **phải** hiện ở tab Kho tài liệu kèm tên "Phạm Khương Duy"; (c) vai quản lý kho mở hồ sơ
   một người → **phải** thấy 403, không phải danh sách rỗng; (d) Sếp Ngọc bấm "Nhật ký truy
   cập" trên chính tờ đó ở tab Kho tài liệu → thấy tên HCNS + ngày.
5. Sáng hôm sau mở CSV sao lưu trên Drive → **kiểm:** dòng không nhạy cảm còn nguyên chữ
   "CHƯA KIỂM"; dòng `nhan_su` bị che.

**Nhắc Sếp Ngọc:** lỗi #1 là Khỉ Đột **tự tìm ra hướng đúng rồi vấp ở khâu cuối**. Bốn vòng
liền nó đều tự dựng ca đối chứng cho chính bản vá của mình, kể cả ca chứng minh phép đo của
nó đủ nhạy — chỗ đó đáng được nói ra khi giao việc vòng sau.
