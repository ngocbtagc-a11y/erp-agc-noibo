# REV-0034 — Lớp "danh sách bị cắt mà không nói là đã cắt"

**Soi:** `feature/gopy-lan-huong-quet-lop` `ab92afc` (nền `main` `7bf0e58`) · **Góp ý
gốc:** chị Vũ Lan Hương (HCNS) · **Người soi:** HỒ LY · 29/08/2026
**Kết luận: PASS** — chẩn đoán ĐÚNG, đã tự chạy lại chứ không tin lời khai. 6 chỗ phải
sửa, **0 chỗ chặn phát hành**.

## ① Chẩn đoán có đúng không — gọi API bằng tư cách `hcns` THẬT

Không đọc suông. Dựng bàn đo riêng: `node:sqlite` làm D1, nạp `schema.sql` + 62
migration, tạo tài khoản `vai_tro='hcns'`, `taoPhien()` thật, gọi thẳng
`worker.fetch()`. 700 việc toàn công ty, 320 việc giao cho chị.

| Gọi thật (cookie `agc_phien` của chị Hương) | Kết quả |
|---|---|
| `GET /api/cong-viec/danh-sach` | **200** · `nhan`=300/320 · `cat_nhan={300,320}` · `cat_phoi_hop={300,700}` |
| `GET /api/cong-viec/lich-su` | **200** · `viec`=**500 / tổng 700** · `cat={500,700}` |
| `GET /api/cong-viec/tong-quan-congty` | **403** — chặn ở MÁY CHỦ, không chỉ ẩn nút |
| `GET /api/hoan/lich-su` | **403** — không phải tab của chị |

**Ba bằng chứng Khỉ Đột nêu — cả ba ĐÚNG:** ① `cvDanhSach` lọc
`WHERE c.nguoi_nhan_id = ?`; ② `app.js:2969 if (!TOI.la_admin) return;` — khối
"Tổng quan toàn công ty" biến mất không một dòng chữ, máy chủ trả 403 khớp (không
phải lỗ quyền); ③ `quyen.js`: `hcns.tab` **có** `lichsuviec`, `cvLichSu` **không có**
bộ lọc theo người. → **Chị Lan Hương THẬT SỰ xem được việc toàn công ty ở
`lichsuviec`.** Nút mới dẫn tới chỗ có thật; `moTab('lichsuviec')` chạy được vì **mọi**
vai trò đều có tab này. ERP không thiếu việc — đúng là thiếu một câu nói.

**Nhưng cửa đó chỉ mở tới 500,** và ô tìm kiếm ở đó **lọc phía trình duyệt trên đúng
500 dòng đã tải** (`DS_LSCV`) → gợi ý *"dùng ô tìm kiếm phía trên"* là **câu sai**. Xem L2.

## ② Con số 14 chỗ — tự quét lại độc lập

Quét tay `LIMIT` toàn `src/`: 13 hàm trả JSON có trần cỡ danh sách (4 đã vá + 9 miễn
trừ), cộng dải PHẠM VI = 14. **Con số đứng.** `gopYNhacSla` (LIMIT 20 ×3) và `banTinTuan`
(LIMIT 50) là cron, không có `json(` — loại đúng, không ai đang nhìn màn hình.

**523 dòng đơn hoàn / trần 500:** không truy D1 thật (không đụng `--remote`), nhưng
con số được chứng thực độc lập ở `scripts/do-ghi-dongbo.mjs:161` và
`src/chi-ghi-khi-doi.js:12` từ vòng 28/08 → **`hoanLichSu` đúng là đang mất 23 đơn**,
sửa ngay là đúng ưu tiên; `#ls-dem` in `500/500` cũng đúng là đang nói dối, nay đã vá.

**Hàng đợi 9 chỗ:** chỉ `layThongBao` có **lý do miễn trừ sai** (L3); 8 chỗ còn lại còn
xa trần theo `LIST_UX_AUDIT.md` (nhân sự 23, SKU 0 dòng) — để hàng đợi là đúng.
Đồng ý với Khỉ Đột: **`chatDanhSach` đáng làm nhất** — chat thay Zalo, 50 tin là vài
ngày, và vá bằng một dải chữ thì vô nghĩa vì người ta cần **cuộn ngược thật**. Ước
lượng cho Gạo: **~1 buổi** (API nhận `truoc_id`, nút "xem tin cũ hơn", giữ vị trí cuộn).

## ③ `LIMIT trần + 1` có đúng không

8 ca biên **của tôi** (không dùng mẫu Khỉ Đột) — `catBot` **đạt 8/8**: rỗng · 1 dòng ·
**đúng bằng trần → không báo oan** · **trần+1 → báo** · mảng thuần · `null` không nổ ·
trần 0 · thừa 2 dòng vẫn cắt đúng.
**Bẫy `LIMIT ${GH}`:** máy quét §④ bắt buộc mọi `LIMIT ${GH…}` phải là `GH + 1` — thử
sửa thành `${GH}` thì bàn đo **đỏ thật**. Lưới này có hiệu lực.
**`COUNT(*)` chậm không:** 50.000 dòng = **0,2 ms**; bản `COUNT(*) … LIKE '%,x,%'` (cho
`phoi_hop_ids`) = **4,4 ms, quét TOÀN BẢNG, không dùng được index**. Thời gian không phải
vấn đề — **`rows_read` của D1 mới là**; chỉ chạy khi đã cắt nên chấp nhận được, nhưng ghi
vào sổ theo dõi hạn mức (REV-0031).

## ④ Máy quét có tự lừa không — **bắt 1/5**

Tôi viết 5 mẫu vi phạm kiểu khác. Kết quả thật:

| Mẫu | Bắt? |
|---|---|
| ① `LIMIT 50 OFFSET 100`, giao diện không nút trang sau | ✅ bắt |
| ② `'… LIMIT ' + tran` (ghép chuỗi bằng `+`, không template) | ❌ **lọt** |
| ③ `.slice(0, TRAN_HIEN)` — N là định danh, không phải chữ số | ❌ **lọt** |
| ④ handler khai bằng `export const x = async (…) => {}` | ❌ **lọt** |
| ⑤ cắt bằng `for (i<30)` hoặc `.splice(30)` | ❌ **lọt** |

④ **là lỗ hổng SỐNG**: `src/dulieunen.js` viết toàn bộ handler danh mục theo kiểu
`export const … = async (env) =>` (dòng 156–215); `tachHam()` chỉ nhận `function` ở cột 0
→ **cả tệp đó vô hình**. Hôm nay chưa có `LIMIT` nào ở đó; mai ai thêm, **máy vẫn xanh**.
**Miễn trừ chết:** dựng thử một hàm miễn trừ đã được vá — `kiemMienTru()` báo chết và
thoát mã 2 đúng như khai. 9/9 dòng miễn trừ đều đang che vi phạm thật. ✅

## ⑤ Không hồi quy — đo lại, không tin khai

- **44px:** tự mở bàn đo trong trình duyệt thật — cả hai nút **44,0px ở 375px VÀ 320px**;
  đối chứng (gỡ luật) ra **24px** → phép đo còn nhạy; `[hidden]` vẫn ẩn; không tràn ngang. ✅
- **Tương phản:** `do-mat-do-va-hoi-quy` CŨ(`7bf0e58`) vs MỚI → **2/196 → 2/199 · tệ đi
  0 · rớt qua ngưỡng 0**. Hai chỗ trượt (`.gy-td-ten`) là **lỗi có sẵn, KHÔNG phải hồi
  quy** — `style.css` chỉ THÊM 56 dòng, không sửa dòng nào. ✅
- **`do-hangdoi-khovan`: 18 đạt / 0 trượt.** Dấu nhận dạng đổi sang `LIMIT ${GH + 1}`
  **không phải nới lỏng**: vẫn bắt bóc ra **đúng một** câu, bóc hụt là thoát mã 2, và
  bốn ca đối chứng D vẫn bắt được lỗi cố ý gắn lại. ✅
- **`do-cat-im-lang`: sạch, thoát 0**, tự kiểm 3/3 bẩn + 5/5 sạch. ✅
- **BH-47 không trùng số.** (Trùng có sẵn: BH-28, BH-29, BH-45 — việc khác.)

## Bảng lỗi

| # | Lỗi | Mức | Chặn phát hành? |
|---|---|---|---|
| L1 | **Máy quét bắt 1/5 kiểu vi phạm khác.** Lỗ sống: `src/dulieunen.js` khai handler bằng `const … = async () =>` → cả tệp vô hình với `tachHam()`. Luật §③ đòi lưới bắt **cả lớp**. | **CAO** | **Không** — lưới hiện bắt đúng kiểu mã đang có, và tự kiểm được |
| L2 | Dải cắt ở `cvLichSu` khuyên *"dùng ô tìm kiếm phía trên"*, nhưng ô đó **lọc phía trình duyệt trên đúng 500 dòng đã tải** — không với tới phần bị cắt. Câu sai, trong chính commit chống nói dối. | TRUNG BÌNH | Không — **sửa 1 dòng chữ trước khi deploy** |
| L3 | `layThongBao` miễn trừ với lý do *"chuông chỉ đếm chưa đọc nên chưa lệch nghĩa"* — **sai**: `chuaDoc` đếm trên mảng **đã bị trần 50 cắt** (`index.js:2067`), tức đúng lỗi `#ls-dem` vừa vá. Trên 50 tin chưa đọc là chuông đếm thiếu. | TRUNG BÌNH | Không — sửa lý do miễn trừ + đếm bằng `COUNT(*)` |
| L4 | Dải PHẠM VI **luôn hiện**, cao **137px ở 375px / 157px ở 320px**, trên màn Công việc mà cả nhân viên kho dùng — mất ~2 dòng bảng mỗi lần vào, kể cả khi không bị cắt. Trái đúng nguyên tắc chính họ viết trong `app.js`: *"một dải luôn hiện là một dải mắt người học được cách bỏ qua trong đúng một tuần"*. | TRUNG BÌNH | Không — gói còn 1 dòng, hoặc cho đóng lại và nhớ |
| L5 | `mtDanhSach`: dải in *"đang hiện 300 trong tổng N"* nhưng giao diện lọc tiếp `ca_nhan` theo `nguoi_tao_id` → **màn hình không hề hiện 300**. Tử số không mô tả cái đang nhìn — cùng lớp với `#ls-dem`. | THẤP | Không |
| L6 | `nhanCat` không chặn `tong < gioi_han` (cron đơn hoàn xoá/ghi mỗi 5 phút → có thật). Khi đó `veDaiCat` in *"còn **-50** việc chưa hiện"*. | THẤP | Không |

## Triển khai

**Không cần nạp migration** — commit không đụng `migrations/`, không đổi lược đồ. Chỉ
mã Worker + tài nguyên tĩnh.

1. Sửa **L2** trước (một dòng chữ trong `app.js`, `taiLaiLichSuCv`).
2. `npm run do-cat-im-lang` · `do-hangdoi-khovan` · `do-nut-dai-cat` (bàn đo 44px **cần
   mở trình duyệt tay**, chưa tự thoát mã — khác các bàn đo còn lại).
3. Gộp vào `main` → `npm run dua-len`.
4. **Báo lại chị Vũ Lan Hương** rằng góp ý của chị đã sửa xong, và **chỉ cho chị** nút
   "Xem việc toàn công ty" — chị vốn có quyền đó từ đầu, chỉ là chưa ai nói. *(Ghi nhận
   công người báo là một phần của việc, không phải phần thêm.)*
5. Hàng đợi: **L1** (mở `tachHam` cho arrow-function, thêm `OFFSET`/ghép chuỗi/
   `.slice(0, ĐỊNH_DANH)`) và **`chatDanhSach` cuộn ngược thật, ~1 buổi**.

**Đúng thì nói thẳng là đúng:** góp ý của chị Lan Hương được đọc tới gốc — không phải
`LIMIT`, mà là **một màn hình lọc theo phạm vi rồi không nói ra**. Bản vá không mở thêm
quyền, không bỏ trần bừa, tốn 0 đồng khi không cắt, và bắt thêm một lỗi ngoài dự kiến
(`#ls-dem` in `500/500` trên 523 dòng) mà không ai yêu cầu tìm. **PASS.**
