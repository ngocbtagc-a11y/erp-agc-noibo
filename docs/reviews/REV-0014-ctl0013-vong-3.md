# REV-0014 — CTL-0013 vòng 3 · Review Gate (HỒ LY)

`5ca1504` · nhánh `feature/ctl-0013-sao-luu-dot1` · so với `ee5c489` (REV-0012 PASS) · 2026-08-28

## Kết luận: FIX_REQUIRED — 1 lỗi CHẶN, sửa mất ~2 dòng.

**Xác minh vùng vòng 2 (không soi lại, chỉ đối chiếu):** `src/zip.js` giống hệt từng byte (`diff -q` → IDENTICAL). `oCsv` dời 185→211 nhưng thân hàm giống hệt (diff rỗng). CRC32 không mất dòng nào. Khỉ Đột khai đúng.

## 1. 669 ô rỗng ↔ NULL — **KHÔNG CHẶN**, và lo sai chiều

Tôi tự đối chiếu `goc.db` với `dich-rong.db`, tách riêng hai chiều:

```
Tổng ô 56.287 · khớp thật 55.618 · lệch thật 0
NULL gốc → ""  đích:   0    ⬅ KHÔNG CÓ Ô NÀO
""   gốc → NULL đích: 669   (= đúng số ô "" trong DB gốc)
  cong_viec.ket_qua 133 · giao_dich_kho.doi_tac 416 · nhan_su.email 120
```

**Không một ô NULL nào bị đổi thành chuỗi rỗng.** `docO` quy ô trống về `NULL` (`khoi-phuc-kem.js:306`), nên `quan_ly_id IS NULL`, `han_chot IS NULL`, `luong IS NULL` **về đúng NULL, truy vấn không hụt dòng nào** — nỗi lo trong đề bài không xảy ra.

Chiều thật thì ngược lại: ô vốn giữ `''` về thành `NULL`, nên `WHERE email = ''` hụt và `WHERE email IS NULL` dôi. Nhưng cả 11 bảng **không cột `NOT NULL` nào đang giữ `''`** (đã tra bằng `pragma_table_info`), và ba cột trên thì `''` với `NULL` mang **cùng một nghĩa** trong ERP: "chưa điền". → **KHÔNG CHẶN.** Đúng là giới hạn CSV, khai riêng là đúng cách; có cờ `rongLaChuoi` để đảo chiều khi cần. Muốn phân biệt thật thì phải bỏ CSV — đắt hơn nhiều so với cái được.

## 2. ⛔ CHẶN — `KHOI-PHUC.sql` KHÔNG NẰM TRONG GIAO DỊCH

`khoi-phuc-kem.js:391` chỉ phát `PRAGMA defer_foreign_keys = ON;`, rồi 11 câu `DELETE FROM`, rồi các `INSERT`. **Không có `BEGIN`/`COMMIT`.** Tôi đo:

| Ca | Kết quả |
|---|---|
| Chạy nguyên `KHOI-PHUC.sql` với `PRAGMA foreign_keys = ON` | ⛔ `FOREIGN KEY constraint failed` |
| Lệnh chết giữa chừng | ⛔ `nhan_su` 600 → **0 dòng, không hoàn tác** |
| Cùng file đó, **bọc thêm `BEGIN`/`COMMIT`** | ✅ không vỡ, `defer_foreign_keys` ăn |

Lý do: `PRAGMA defer_foreign_keys` **là lệnh rỗng khi ở ngoài giao dịch** — nó chỉ hoãn kiểm tra *trong* một giao dịch. Không có giao dịch thì nó không làm gì, và cũng không có gì để hoàn tác: `DELETE` đã ăn, dữ liệu mất, DB nằm dở dang.

Đây là **đường mặc định**, đường `DOC-CACH-DOC.txt` Bước 5a dạy Sếp dùng; đường phụ `--vao-sqlite` lại làm **đúng** (`khoi-phuc-kem.js:343-371`) — chứng tỏ đường chính bị bỏ sót chứ không cố ý. Trên D1, `wrangler d1 execute --file` có thể tự bọc giao dịch ngầm nhưng **chưa ai xác minh**, mà chính doc khuyên chạy thử `--local` trước — đường đó tôi đã đo là vỡ thật.

**Sửa:** `BEGIN;` ngay sau dòng `PRAGMA`, `COMMIT;` ở cuối chuỗi. Nếu D1 từ chối `BEGIN` thì phải chứng minh D1 tự bọc, không được để trống.

## 3. Khôi phục thật — **XÁC NHẬN**

Tôi tự chạy `npm run khoi-phuc-thu` từ bản `git archive` của `5ca1504`: 11 bảng · 4.356 dòng · 56.287 ô · **0 ô lệch**. Đối chiếu lại bằng script riêng của tôi: **55.618 khớp thật + 669 mơ hồ + 0 lệch** — khớp số Khỉ Đột khai.

**11 bảng ít hơn 21 bảng bản thật:** không phải thiếu sót thiết kế — `sao-luu.js` dùng **danh sách loại trừ** (`BANG_KHONG_SAO_LUU`, 7 bảng) nên bảng mới tự vào; bàn thử chỉ gieo dữ liệu cho 11 bảng nên chỉ 11 bảng có gì để so. Chưa thử: `tai_khoan`, `don_hang`, `tai_san`, `nha_cung_cap`, `kho` — không bảng nào có kiểu cột lạ so với 11 bảng đã thử, rủi ro thấp, nhưng nên gieo thêm.

**Thứ tự khoá ngoại:** 16 mối nối từ bảng *ngoài* nhóm khôi phục trỏ *vào* bảng bị xoá trắng (`tai_khoan.nhan_su_id`, `tai_san.nguoi_giu_id`, `nhan_su_lich_su.nhan_su_id`, ...). Vì id được ghi lại y nguyên nên tới cuối giao dịch là lành — **nhưng chỉ khi có giao dịch**. Chính là lý do mục 2 CHẶN.

## 4. Ca đối chứng — **ĐẠT**

Đo lại đúng như khai: sửa lén 1 byte (vị trí 431730, cỡ file 616053 → 616053 y hệt) → mã thoát 1, khung "TỪ CHỐI KHÔI PHỤC", chỉ đúng `nhan_su.csv`, **600 dòng đang có không bị đụng**, không đẻ ra `.sql`.

Ba ca tôi thêm: **chưa gõ "GHI ĐÈ" mà cứ chạy** → mã thoát 3, in cảnh báo rồi dừng, không ghi ✅ · **`.zip` hỏng hẳn (cắt 5000 byte cuối)** → Windows từ chối giải nén, Sếp gặp lỗi của Windows chứ không phải lỗi có hướng dẫn (nhỏ) · **thiếu chính `KHOI-PHUC.mjs`** → còn CSV + doc nhưng hết công cụ, doc không có lối thoát cho ca này (nhỏ).

## 5. Script tự đứng — **CÓ**

Giải nén `.zip` ra thư mục trắng **ngoài repo**, chạy `node KHOI-PHUC.mjs`: chạy được. **Không đòi `node_modules`, không đòi file trong repo, không đòi mạng** — chỉ dùng `node:fs/path/readline/url`. Đúng điều kiện sống còn.

`DOC-CACH-DOC.txt` (17 KB) đọc bằng con mắt người không rành kỹ thuật: **đủ 3 phần**, bước đánh số 1→6, tiếng Việt thường, cảnh báo "sẽ xoá trắng", Bước 2 bắt sao lưu cái đang có trước, Bước 6 có **ba phép kiểm cụ thể** để biết mình đã làm đúng (đếm dòng so `KIEM-TRA.csv` · mở ERP xem · soi mốc thời gian). Lệnh viết đúng vỏ PowerShell. Đây là phần làm tốt nhất vòng này.

## 6. Lịch ngày 15 — **ĐÚNG**

15/09→`2026-08` · 15/10→`2026-09` · **15/01/2027→`2026-12` (đổi cả năm)** · **15/03/2027→`2027-02` (qua tháng 2)** · mùng 1 và ngày 14 không tạo · ngày 15 có · ngày 16–24 còn cửa sổ chạy nốt (**cron chết ngày 15, chạy lại ngày 16 vẫn gói được**) · ngày 25 báo động · **960 lượt cron/10 ngày → đúng 1 phiên**.

**Ca Chủ nhật: KHÔNG XUNG ĐỘT** — SPEC-0004 mục 4 cấm Chủ nhật là cấm **nhắc việc**, không cấm cảnh báo hệ thống; tin gửi bản tháng đi đường khác. Ngày 15 rơi Chủ nhật: **15/11/2026** (gần nhất), 15/08/2027, 15/10/2028. Muốn im lặng hẳn Chủ nhật là quyết định nghiệp vụ của Sếp, không phải lỗi mã.

## 7. Bốn rủi ro Khỉ Đột tự khai — **không cái nào chặn**

① **p95 10,65 ms:** bàn stress, không phải thước chính thức; phần mới thêm chỉ 0,36 ms, chạy 1 lần mỗi bản — nhưng phát hiện đáng ghi (BH-40). ② **Node 22+:** có `try/catch` quanh `import('node:sqlite')`, in ba dòng chỉ dẫn kèm đường lui (`khoi-phuc-kem.js:334-341`) — xử lý đẹp. ③ **`pragma_foreign_key_list`:** tôi xác minh chạy tốt trên SQLite; D1 từ chối thì chỉ mất `SO-DO-DU-LIEU.txt`, có nhánh "chịu" đỡ — vẫn nên đo trên D1 thật. ④ **`donBanQuaHan` giữ `xoaFile` ném lỗi:** đã bọc `try/catch` từng dòng (`sao-luu.js:1270-1276`), lỗi không bay lên `hoanTat` — cố ý và đúng.

## Danh sách lỗi

| Mức | Chỗ | Việc |
|---|---|---|
| ⛔ **CHẶN** | `src/khoi-phuc-kem.js:391` + cuối hàm sinh SQL | Bọc `BEGIN`/`COMMIT`. Đo thật: FK vỡ, chết giữa chừng mất 600 dòng không hoàn tác. |
| Nhỏ | `scripts/thu-khoi-phuc.mjs` | Gieo thêm `tai_khoan`, `don_hang`, `tai_san`. |
| Nhỏ | `DOC-CACH-DOC.txt` | Thiếu lối thoát ca `.zip` không giải nén được và ca thiếu `KHOI-PHUC.mjs`. |
| Nhỏ | D1 | Chưa đo `pragma_foreign_key_list` và hành vi giao dịch của `d1 execute --file` trên D1 thật. |

## Khuyến nghị: **KHÔNG NÊN ĐẨY**

Vá mục 2 rồi chạy lại `npm run khoi-phuc-thu` **có thêm ca `foreign_keys = ON`** là đẩy được ngay. Ba lỗi nhỏ không cần chặn.

**Ghi chú cho Sếp:** bản sao lưu ghi ra rồi đọc lại đúng từng ô, không mất một chữ nào — phần khó nhất đã xong và làm tốt. Còn đúng một chỗ phải vá: file lệnh khôi phục xoá dữ liệu cũ trước rồi mới ghi cái mới, mà không có "nút hoàn tác"; mạng rớt đúng lúc đang chạy là mất trắng. Vá xong là dùng thật được.
