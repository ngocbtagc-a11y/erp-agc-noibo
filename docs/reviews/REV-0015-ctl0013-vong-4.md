# REV-0015 — CTL-0013 vòng 4 · Review Gate (HỒ LY)

`eaccf4c` · nhánh `feature/ctl-0013-sao-luu-dot1` · so với `5ca1504` (REV-0014 FIX_REQUIRED) · 2026-08-28

## Kết luận: PASS — và REV-0014 của tôi SAI. Đính chính ở mục 0.

Vòng 3 đã PASS (khôi phục 56.287 ô · script đứng ngoài repo · lịch ngày 15 · 669 ô
NULL↔rỗng) — không soi lại. Dưới đây chỉ là phần vòng 4 đụng vào.

---

## 0. ĐÍNH CHÍNH REV-0014 — bản vá tôi ép là SAI, Khỉ Đột bác đúng

> **Đính chính:** REV-0014 kết luận file `KHOI-PHUC.sql` phải bọc `BEGIN`/`COMMIT`
> **vô điều kiện**. Kết luận đó **SAI**. Nếu Khỉ Đột làm đúng lời tôi, đường khôi
> phục chính của Sếp (nạp vào ERP) sẽ **hỏng hoàn toàn** — D1 từ chối chạy dòng nào.
> Tôi lập luận từ SQLite chuẩn mà **không đo trên D1**.

Tôi tự đo lại cả hai khẳng định của Khỉ Đột trên D1 cục bộ (`wrangler d1 execute --local`),
không dùng số nó khai:

**① D1 có thật sự từ chối `BEGIN` không → XÁC NHẬN.**

| File thử | Kết quả |
|---|---|
| `BEGIN; CREATE TABLE thu_begin…; COMMIT;` | **mã thoát 1**, lỗi *"please use the state.storage.transaction() … instead of the SQL BEGIN TRANSACTION"* |
| y hệt, **bỏ `BEGIN`/`COMMIT`** | **mã thoát 0** — `2 commands executed successfully` |

Soi `sqlite_master` sau đó: chỉ có `thu_nobegin`, **không có** `thu_begin`.
→ Bản vá tôi ép ở REV-0014 khiến Bước 5a **không ghi được một dòng nào**. Đúng như nó khai.

**② D1 có thật sự tự bọc cả file trong một giao dịch không → XÁC NHẬN.**

Dựng bảng 3 dòng cũ (`cu1/cu2/cu3`), rồi nạp một file **không có `BEGIN`** cố tình
lỗi giữa chừng: `DELETE FROM thu_tx;` → `INSERT 'moi1'` → `INSERT INTO bang_khong_ton_tai`
(nổ) → `INSERT 'moi2'`.

```
mã thoát 1 · lỗi "no such table: bang_khong_ton_tai"
đếm SAU: 3 dòng — cu1, cu2, cu3
```

`DELETE` **bị hoàn tác sạch**, 3/3 dòng cũ còn nguyên, `moi1` không lọt vào.
D1 tự bọc thật. Số đo của Khỉ Đột khớp từng con số.

**Vậy hai bản là đúng:** mặc định (→ ERP) không phát `BEGIN`; `--sql-cho-sqlite`
tự bọc cho sqlite3/DB Browser. `PRAGMA defer_foreign_keys` đặt **sau** `BEGIN`
cũng đúng — ngoài giao dịch nó là lệnh rỗng.

---

## 2. Ca ngắt giữa chừng — ĐẠT, và đối chứng đủ nhạy

Chạy `scripts/thu-khoi-phuc.mjs` từ cây `eaccf4c` (trích bằng `git archive`, không checkout):

```
🔴 NGẮT GIỮA CHỪNG: dữ liệu cũ CÒN NGUYÊN — tổng 4.356/4.356 ô dòng · nhan_su 600/600
ĐỐI CHỨNG (bỏ đúng 1 dòng BEGIN): còn 4/4.356 dòng
```

Cách dựng ca đúng: cắt đúng ranh giới câu lệnh ngay sau lô `INSERT` đầu (bản cắt
có đủ mọi `DELETE`, chưa tới `COMMIT`), rồi **đóng kết nối** — không phải bắt lỗi giả.
Đối chứng của đối chứng (BH-26) lệch **đúng một dòng `BEGIN`** và rơi từ 4.356 → 4:
phép đo có nhạy thật, không phải xanh vì may.

## 3. Bàn thử BẬT khoá ngoại — ĐẠT, và tự chấm chính nó

`dungDich()` chỉ `PRAGMA foreign_keys = OFF` lúc dựng schema/migrations, rồi
**bật lại `= ON`** trước khi chạy bản khôi phục. Có ca tự chấm bàn thử:

```
✅ ⚠️ bàn thử ĐANG BẬT PRAGMA foreign_keys = ON (không bật thì ca này lọt)
```

Nó đọc `PRAGMA foreign_keys` ra và so `=== 1` — chấm trạng thái thật, không phải chấm chuỗi.
Đây đúng chỗ vòng 3 để OFF nên lỗi lọt. Toàn bàn: **tất cả đạt, mã thoát 0.**

## 4. Đường thật đã chạy — ĐẠT, khớp từng con số

Dựng D1 cục bộ sạch (`schema.sql` + 47 migrations, 50 bảng), nạp **file mặc định**:

```
🚣 61 commands executed successfully   ·   mã thoát 0
nhan_su 600 · cong_viec 400
không lỗi BEGIN · không lỗi FOREIGN KEY
```

Khớp đúng lời khai. (Lần dựng hụt trước đó còn cho thêm bằng chứng cho ②: nạp
vào đích thiếu bảng thì cả file bật ra, không để lại nửa vời.)

## Cộng — `DOC-CACH-DOC.txt`, đọc bằng mắt người không rành kỹ thuật

Ba lối thoát đều **thật**, không phải mô tả lỗi rồi bỏ đó: `.zip` hỏng có 4 nước
đánh số, dừng được ở bất kỳ nước nào (tải lại → 7-Zip → **lấy bản sao lưu ngày khác**
→ báo kỹ thuật); thiếu `KHOI-PHUC.mjs` nói rõ **dữ liệu vẫn còn nguyên trong .csv**
rồi mới chỉ cách chép file từ bản khác; lỗi `BEGIN` chỉ đúng một lệnh sinh lại.
Mục mất điện nay nói thẳng "**DỮ LIỆU KHÔNG MẤT**" ngay câu đầu — đúng cái người
đang hoảng cần đọc trước.

## Issues còn lại

| Mức | Chỗ | Việc | Chặn? |
|---|---|---|---|
| TRUNG BÌNH | `src/sao-luu.js:240,253` (bản sinh ra: `DOC-CACH-DOC.txt`) | Hai lối thoát dạy Sếp gõ `node KHOI-PHUC.mjs --dong-y`, trong khi chính đầu file `KHOI-PHUC.mjs` ghi *"Người thật thì ĐỪNG dùng cờ này"*, và Bước 3 dạy gõ **không** cờ. Cờ này nuốt cảnh báo "sẽ ghi đè, dữ liệu mới mất vĩnh viễn". Bỏ `--dong-y` khỏi cả hai dòng là xong. | **KHÔNG** — lệnh đó chỉ *sinh file .sql*, chưa ghi vào ERP |
| THẤP | `scripts/thu-khoi-phuc.mjs` | Tính nguyên khối mới đo ở mức 61 lệnh / 0,67 MB. Dữ liệu thật lớn dần, nếu wrangler phải cắt thành nhiều lô thì tính "hoặc vào hết hoặc không vào gì" không còn chắc. Nên có mốc theo dõi kích thước file. | KHÔNG |

## Rủi ro Khỉ Đột tự khai: chưa đo trên D1 remote — **KHÔNG chặn phát hành**

Nó không được phép đụng remote, đó là đúng luật. Và hai hành vi đo được đều là hành
vi của **lõi runtime** (thông báo lỗi `BEGIN` nhắc thẳng `state.storage.transaction()`
của Durable Objects — chính lõi mà D1 remote chạy trên đó), không phải mẹo của bản
giả lập. Rủi ro còn lại nhỏ và **lệch về phía an toàn**: nếu remote khác local thì
khả năng cao là ở chỗ chia lô file lớn (issue THẤP ở trên), không phải ở chỗ mất dữ liệu.

## Khuyến nghị: **NÊN ĐẨY.**

Sửa `--dong-y` ở hai dòng tài liệu thì đẩy luôn cùng; không sửa cũng không chặn.
