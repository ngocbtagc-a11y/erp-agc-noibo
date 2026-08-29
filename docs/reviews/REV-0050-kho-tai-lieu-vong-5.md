# REV-0050 — Kho tài liệu, vòng 5 (soi hẹp)

`feature/ctl-0026-kho-tai-lieu` · HEAD `876cb8a` (vòng 4 soi `4fb1257`)
**PASS** — nhánh này phát hành được. Có **1 lỗi chặn phát hành cho nhánh `feature/tu-nap-db`** (Câu 2).

## Câu 1 — Nó vá khác cách tôi đề. Lập luận của nó ĐÚNG, cách của tôi SAI.
Tôi rút lại đề xuất "giữ cột ở cả hai chỗ". SQLite không có `ADD COLUMN IF NOT EXISTS`, và
`wrangler d1 execute --file` dừng ngay ở câu lỗi — để hai chỗ thì máy TRẮNG vấp ở file thứ hai và dừng
giữa chừng: vá một đường hỏng bằng cách đẻ một đường hỏng mới. Tôi tự dựng lại **cả hai đường** bằng
`node:sqlite` thật: máy CŨ nạp lại `them-kho-tai-lieu.sql` → cột KHÔNG sinh ra (đúng bản chất lỗi cũ), nạp
file cột → cột CÓ, đúng một lần; máy TRẮNG nạp cả bộ đúng thứ tự → cột CÓ, không câu nào vấp; đối chứng bỏ
file mới → cột MẤT trở lại (phép đo đo thật). Không nhánh nào phải "coi lỗi là bình thường". **Đúng.**
**Thứ tự tên file — ĐÚNG, ca nó nêu CÓ THẬT.** Chạy đúng hàm `thuTuMigration` của `tu-nap-db` (bỏ đuôi
`.sql` rồi so chữ): `[them-kho-tai-lieu, them-kho-tai-lieu-cot-ocr-neo]` — bảng trước, cột sau. Với tên
nháp cũ: `[them-cot-ocr-neo, them-kho-tai-lieu]` → ALTER trước CREATE → máy trắng chết `no such table`.
**Không tạo `lui-*.sql` — ĐỒNG Ý**, Câu 2 chứng minh nó đúng gấp đôi: `kiem-tra-migration.mjs` đang liệt kê
thẳng 4 file `lui-*` vào mục "CHƯA CHẠY" rồi thoát 1. Thêm file `lui-` thứ 5 là thêm rác vĩnh viễn.

## ⚠️ Câu 2 — HAI CẢNH BÁO CHO `tu-nap-db`: cả hai ĐÚNG. Một cái là chặn phát hành.
Đo bằng chính `scripts/tu-nap-db.mjs --soi-het` của nhánh đó, chạy trên `migrations/` của nhánh này (bản
sao ở scratch, không đụng worktree nào): **67 file · tự nạp được 52 · bị hàng rào chặn 15.**

1. **`them-kho-tai-lieu.sql` bị chặn — ĐÚNG**, đúng câu `UPDATE tai_lieu SET tim_kiem = …` ở đuôi
   (vá REV-0040 #4). `UPDATE` không có trong `CHO_PHEP`, có tên trong `TEN_NGUY_HIEM`.
   **Nhưng KHÔNG kẹt vĩnh viễn:** `tu-nap-db` chỉ soi file *chưa ghi nhận*, mà `chay-migration.mjs`
   (chạy tay, KHÔNG có hàng rào) tự ghi vào `schema_migrations`. **Rẻ nhất: 0 dòng mã — chỉ là THỨ TỰ.**
   Chạy tay đợt này *trước khi* gộp `tu-nap-db`. Đúng luôn cho 6 file `them-gopy-*`/`va-*` cùng cảnh.
2. **4 file `lui-*.sql` — ĐÚNG, và đây là CHẶN PHÁT HÀNH cho `tu-nap-db`.** Cả 4 bị chặn (`DROP TABLE`,
   `DROP`, `INSERT INTO` trần). Chúng **không bao giờ được chạy** ⇒ **không bao giờ được ghi nhận** ⇒
   mãi mãi nằm trong `conThieu` ⇒ `tu-nap-db.mjs` thoát 1 ở **mọi** lần đẩy `main`, mà `deploy.yml` của
   nhánh đó đặt bước này **TRƯỚC** bước deploy → **không lần deploy nào đi qua được.** Nhánh đó rẽ ra ở
   `a73f538`, trước khi 4 file `lui-*` ra đời (`343ce05`), nên chưa từng gặp: tree nó 52 file, `main` 66.
   **Rẻ nhất: `git mv migrations/lui-*.sql migrations/lui/` — 0 dòng mã.** Cả ba công cụ đều dùng
   `readdirSync('migrations')` (KHÔNG đệ quy) rồi lọc `.sql`, nên thư mục con biến mất khỏi cả ba cùng lúc;
   gỡ luôn exit-1 vĩnh viễn của `kiem-tra-migration`. Lọc `lui-*` đắt hơn: sửa **hai** script + đẻ một quy
   ước đặt tên mới ai cũng quên được.

## Câu 3 — "Thành 1 bộ" bằng BẮT CHỌN NGƯỜI: đúng, và 3 phép sửa là chính đáng.
Nó bác "gắn vào hồ sơ sau" — đúng: giấy mồ côi một quãng vô hạn, mà đường gắn sau cần một lượt `UPDATE`
mới trên `tai_lieu`, phá đúng ràng buộc "MỘT lượt quét = ĐÚNG 1 dòng INSERT". Tôi đo lại:

- Kho chung + nhóm Nhân sự + chọn người → vào **đúng bộ người đó** (1) **và vẫn hiện ở kho chung** (1);
  `danhSachTaiLieu` không lọc `cua_vao` khi thiếu `gan_id` → "một kho hai cửa nhìn" giữ nguyên.
- **Không chọn người → 400, 0 dòng** (đo bằng `COUNT(*)`). **Nhóm khác kèm `gan_id` → vẫn vứt**
  (`cua_vao=kho_chung, gan_id=null`) — ranh giới không bị nới.
- **Cửa hồ sơ vẫn 12 chạm** (7 ERP + 4 máy ảnh + 1 mở hồ sơ), `do-quet-375` in nguyên văn. Không tăng chạm.
- Bản nháp CŨ trong `localStorage` (đủ trang, chưa có người) không kẹt: `gui()` đá về màn chọn người
  trước khi gọi máy chủ — chỗ dễ sót, nó không sót.
**Ba phép sửa — KHÔNG phải sửa cho dễ qua.** Mục ⑥ chỉ *thêm điều kiện đủ* (cửa "chọn người" nay đứng
trước cửa "đồng ý"); ý phép đo giữ nguyên. Hai phép ở ⑨d **đảo ngược thật** (`=== 0` → `=== 1`), nhưng đảo
vì **yêu cầu Sếp đổi**, và bất biến cũ *"không có dòng mồ côi"* không bị bỏ — nó được **thay bằng 4 phép
mới** khoá đúng ranh giới đó (k3 không-chọn-người, k4 nhóm-khác). Mẫu đúng: đổi phép đo thì phải để lại
phép đo khác giữ chỗ. Không tìm được chỗ nới lỏng nào.

## Câu 4 — `do-ba-mau` ĐỎ→XANH: gốc nó tìm ra ĐÚNG, và nặng hơn nó nói.
`--vien` · `--nen-2` · `--chu` · `--chu-mo`: **cả 4 KHÔNG được khai ở đâu** trong `style.css` (0 lần).
Cả khối `.gy-*` vẽ bằng dự phòng của bảng màu **trước CTL-0023**. Chạy `do-ba-mau` trên `style.css` ở `4fb1257`:
① **HỎNG** `#26261f` (60.0°, ngoài ba họ) d.3189 = `var(--chu, #26261f)` → **đúng khối `.gy-*`**;
② **HỎNG** 4 mã trắng/đen, **3/4** là `#fff` d.3120/3176 = `var(--nen-2, #fff)` → **cũng khối đó**;
③ **CẢNH BÁO** đỏ 18.7% (ngưỡng 15%) do 4 lần `var(--danger, #c0392b)` đếm dư — nay 14.6%.
Tức màn **Góp ý** — màn Sếp nhìn hằng ngày — mang tông xám lạnh cũ **im lặng từ CTL-0023**, và nó là
nguyên nhân chính của **cả ba** mục đỏ, không phải hai mã lẻ. Sâu hơn chẩn đoán vòng 4.
**Còn khối khác dùng token không tồn tại — CÓ: 4 token, 5 chỗ dùng** (đã trừ 2 lần trong ghi chú):
`--bg2` (d.653) · `--panel-2` (d.3009) · `--brand` (d.3051) đều **có dự phòng**; **`--panel` d.3048
`.jd-mau-nut` và d.3094 `.kn-nguoi` KHÔNG có dự phòng → nền trong suốt**, mà `do-ba-mau` **không bắt được**
(không có mã màu nào để đếm). Điểm mù bàn đo, không phải lỗi nhánh này.

## Câu 5 — Không hồi quy (chạy lại từ đầu, không đọc kết quả cũ)
`do-kho-tai-lieu` **242/242** · `cong-khoi` @1440 **XANH** + @375 **XANH** · `do-quet-375` **ĐẠT**
(hồ sơ 12 chạm, kho chung 14) · `do-cat-im-lang` **SẠCH** · `do-moc-noi` **6/0** · `do-duong-di-tiep` **21/0**
· `do-ba-mau` **ĐẠT** (đối chứng 12/12).
**`do-boc-chu`: BỎ QUA ĐƯỢC.** Diff `src/` vòng này không đụng `bocChu()`/`docTinChu()` một dòng nào.
Ca ⑫E còn khoá chặt hơn: 26 cột trong `INSERT INTO tai_lieu` phải có thật trong lược đồ migration — bắt
lỗi này và cả lần sau, không cần gọi Workers AI 400s. Nó chạy trên D1 máy nên phải nạp migration thứ hai
trước, không thì chết `no such column` — tín hiệu ĐÚNG, không phải hồi quy.

## Bảng lỗi
| # | Mức | Chặn phát hành? | Việc |
|---|---|---|---|
| 1 | **L1** | **CÓ — cho `feature/tu-nap-db`**; KHÔNG cho nhánh này | 4 file `lui-*.sql` kẹt mọi lần deploy vĩnh viễn → `git mv migrations/lui-*.sql migrations/lui/` |
| 2 | L2 | Không (chỉ là thứ tự thao tác) | Chạy tay 2 migration đợt này **trước khi** gộp `tu-nap-db`, để câu `UPDATE` ở đuôi được ghi nhận |
| 3 | L2 | Không | `kiem-tra-migration.mjs` dùng `.sort()` trần → in **sai thứ tự** (`…-cot-ocr-neo` trước `…-tai-lieu`); người máy trắng làm theo sẽ chết `no such table`. Sửa 1 dòng: bỏ đuôi `.sql` rồi mới so |
| 4 | L3 | Không | Dòng `nhom='nhan_su'` cũ trên bản thật (nếu có) vẫn mồ côi — chặn dòng mới, bỏ mặc dòng cũ. Đếm trước; có thì vá tay, ĐỪNG thêm `UPDATE` vào `migrations/` |
| 5 | L3 | Không | `--panel` ×2 không dự phòng → nền trong suốt; `do-ba-mau` mù với token không tồn tại mà không có dự phòng |
| 6 | L4 | Không | `do-quet-375` ⑦ không đếm chạm cho đường kho-chung + Nhân sự (đường duy nhất có thêm màn) |
| 7 | L4 | Không | Thân xử lý `chon-nguoi` chép hai bản (uỷ nhiệm + gắn lại sau khi lọc) — dễ lệch khi sửa |

## Bước triển khai — HAI migration, ĐÚNG THỨ TỰ
```
1) npm run nap-khotailieu-may   → kiểm: có bảng tai_lieu; table_info CHƯA có ocr_so_trang_neo (đúng)
2) npm run nap-cotocrneo-may    → kiểm: table_info CÓ ocr_so_trang_neo INTEGER NOT NULL DEFAULT 0
3) npm run do-kho-tai-lieu (242/242) · do-quet-375 · cong-khoi · cong-khoi-dienthoai (XANH)
4) npm run nap-khotailieu       → kiểm: migration-kiemtra, them-kho-tai-lieu.sql biến khỏi "chưa chạy"
5) npm run nap-cotocrneo        → kiểm: migration-kiemtra, CẢ HAI biến mất (4 dòng lui-* là rác đã biết)
6) Quét thử 1 tờ ở kho chung nhóm Nhân sự → phải HIỆN màn chọn người; lưu xong: hồ sơ người đó thấy
   tờ giấy VÀ kho chung cũng thấy. Không chọn người → 400.
7) Chỉ SAU bước 5 mới gộp feature/tu-nap-db, gộp kèm việc dời 4 file lui-*.
```
⚠️ Đừng đảo 1↔2 hay 4↔5: `ALTER TABLE` trước `CREATE TABLE` là `no such table: tai_lieu`. Tên file đã ép
sẵn thứ tự đó cho máy; hai người duy nhất còn gõ tay là Sếp và tôi.
