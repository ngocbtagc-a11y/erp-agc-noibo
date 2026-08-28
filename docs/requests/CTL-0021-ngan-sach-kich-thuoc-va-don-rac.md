# CTL-0021 — Ngân sách kích thước + cơ chế dọn rác code

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `TECHNICAL_DEBT` + hạ tầng chất lượng
- **Priority**: **P2** — chưa đơ, nhưng đà tăng là thật
- **Risk**: LOW *(chỉ thêm chốt chặn, không đổi tính năng)*
- **Status**: `READY_QUEUE` · **Next Owner**: HỒ LY

---

## 1. Yêu cầu gốc

> *"Khi có 1 code mới lên thì phần code cũ lỗi thời có được dọn bớt không nhỉ?
> hay là mày dùng biện pháp nào để tránh rác? nhớ là đừng có làm cho erp nó đơ
> đơ ra đấy nhé"*

## 2. SỐ ĐO THẬT — đo trên hệ thống production

**`public/assets/js/app.js` — file giao diện mọi người tải về:**

| Mốc | Kích thước |
|---|---|
| Hôm qua 26/08 17:26 | 291 KB |
| Sáng nay 10:43 *(sau CTL-0008)* | 294 KB |
| Trưa nay 11:53 *(sau dán ảnh)* | **315 KB** |
| Nếu ghép nốt hồ sơ nhân sự | **362 KB** |

**+71 KB trong một ngày = +24%.**

**Tải về thực tế** *(đã nén gzip)*: `app.js` **89 KB** · `style.css` **19 KB**
→ tổng **~108 KB**.

## 3. Kết luận trung thực

**Hiện tại KHÔNG đơ.** 108 KB là nhẹ — bằng một tấm ảnh chụp màn hình. Trên 3G
mất khoảng 1 giây, và PWA **lưu lại sau lần đầu** nên các lần sau gần như tức thì.

**Nhưng hai điều đáng lo:**

1. **Đà tăng.** +24%/ngày mà giữ nguyên nhịp thì vài tháng nữa thành vấn đề thật.
2. **Ai cũng tải hết mọi thứ.** `app.js` là **một file duy nhất** — nhân viên kho
   chỉ dùng Xếp ca vẫn phải tải cả code nhân sự, kế toán, tài sản, góp ý.
   Cùng bệnh với `src/index.js` *(một file ~3.500 dòng chứa toàn bộ backend)*.

## 4. Cơ chế dọn rác HIỆN CÓ — và điểm yếu của nó

**Có ba lớp, và cả ba đều hoạt động thật trong ngày hôm nay:**

| Lớp | Bằng chứng hôm nay |
|---|---|
| Hiến pháp Rule 3 · `DELETE → REUSE → SIMPLIFY → AUTOMATE → BUILD` | Nhiều lần Gạo bác đề xuất xây mới, bắt tái dùng |
| Hiến pháp Rule 5 · `REUSE → EXTEND → CREATE` | Gộp **3 hàm nén ảnh** trùng nhau thành `nenAnhChung()` |
| Cổng review bắt code chết | `FIX-04` — 2 lệnh `stopPropagation()` thành code chết sau khi sửa, Hồ Ly bắt, đã xoá |

**Điểm yếu: cả ba đều BỊ ĐỘNG.** Phụ thuộc người soi có để ý hay không. Không
có phép đo nào tự kêu khi file phình ra. Hôm nay tăng 24% mà **không có chốt nào
báo** — Sếp hỏi thì mới đo.

## 5. Việc cần làm

### 5.1 Ngân sách kích thước — chốt tự động, ưu tiên cao nhất

Đặt trần cho `app.js` · `style.css` · `app.html`. Vượt trần thì **cổng review
kêu**, không cho lặng lẽ đi qua.

- Trần đề xuất: **mức hiện tại + 15%**, tính trên bản đã nén gzip *(vì đó mới là
  thứ người dùng thật tải về)*.
- Vượt trần **không cấm phát hành** — nhưng người build **phải giải trình**:
  thêm gì, có gì xoá được không.
- Chạy trong bàn tự kiểm sẵn có, **0 phút GitHub Actions, 0 token**.

### 5.2 Săn code chết — chủ động, định kỳ

Hàm không ai gọi · CSS không selector nào khớp · endpoint không giao diện nào
dùng · cột DB ghi-một-chiều.

> **Đã có bằng chứng loại cuối:** Hồ Ly tìm ra **7 cột ghi-một-chiều** trong
> `nhan_su` — `ngay_sinh` *(đã vá)* + `so_cccd` `so_bhxh` `gioi_tinh` `que_quan`
> `noi_thuong_tru` `anh_cccd` *(còn nguyên)*. Ghi vào nhưng **không đường nào
> đọc ra**. Đó chính là rác.

Hồ Ly đề xuất cách quét **chạy được không cần thư viện mới**, và nêu rõ phương
pháp *(BH-03)*.

### 5.3 Tách file — chỉ khi có số chứng minh

**Chưa làm ngay.** `app.js` một file 362 KB và `src/index.js` một file 3.500
dòng là cùng một bệnh: mọi việc đều đụng một chỗ nên **không chạy song song
được** *(đúng nút thắt Sếp than "làm lâu thế")*.

Nhưng tách file là `CORE_CHANGE` lớn, rủi ro cao. **Hồ Ly đo trước, đề xuất sau**:
bao nhiêu % người dùng thật sự cần mỗi phần? Tách ra tiết kiệm được bao nhiêu KB
cho nhân viên kho? Chi phí có xứng không?

## 6. Ràng buộc

- Chi phí **0**. Không thêm công cụ build, không thêm thư viện.
- **Không tự xoá code** dựa trên phỏng đoán "chắc không ai dùng" — phải chứng
  minh bằng phép quét có phương pháp *(BH-03)*, rồi mới đề xuất.
- Xoá nhầm code đang chạy còn tệ hơn để rác.
- Đo trên bản **đã nén gzip** — số thô không phản ánh thứ người dùng tải.

## 7. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Hỏi cơ chế tránh rác code, lo ERP đơ |
| `NEW` | `READY_QUEUE` | GẠO | 2026-08-27 | Đo production: `app.js` **291 → 362 KB trong một ngày (+24%)**, tải về thực tế 108 KB gzip — **chưa đơ nhưng đà tăng là thật**. Ba lớp dọn rác hiện có đều **bị động**, không có phép đo tự kêu. Đề xuất ngân sách kích thước tự động + săn code chết định kỳ |
