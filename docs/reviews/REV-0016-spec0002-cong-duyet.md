# REV-0016 — SPEC-0002 Cổng duyệt góp ý

- **Vòng**: CTL-0003 / SPEC-0002 · ADR-0006 A1–A3, B1–B6
- **Commit**: `343ce05` · nhánh `feature/spec-0002-cong-duyet`
- **Người soát**: HỒ LY · 28/08/2026
- **Rủi ro**: HIGH (đổi phân quyền + đổi luồng đang chạy thật)
- **Kết luận**: **FIX_REQUIRED** — 1 lỗi thật ở đường lui trưởng phòng, 1 lỗi
  ở kịch bản lùi-rồi-chạy-lại. Phần chống nói dối thì chắc.

---

## 1. Khỉ Đột khai SAI về `nhan_su.phong_ban_id` — BH-32 lặp lại

Khỉ Đột ghi thẳng vào code (`src/index.js:3089-3091`):

> `nhan_su` KHÔNG có cột `phong_ban_id` (đã kiểm schema 28/08) — cầu nối duy
> nhất giữa nhân sự và phòng ban là `nhan_su.bo_phan` khớp `phong_ban.ten`

**Sai.** Ba bằng chứng độc lập:

| Nguồn | Bằng chứng |
|---|---|
| Migration | `migrations/them-danhmuc-nen.sql:34` — `ALTER TABLE nhan_su ADD COLUMN phong_ban_id INTEGER REFERENCES phong_ban(id);` |
| Chính file đó | `src/index.js:493` `SELECT ... n.phong_ban_id`; `:554` `INSERT INTO nhan_su (... phong_ban_id ...)` — cùng file vừa dùng cột vừa khai là không có |
| D1 bản thật (đọc) | 24 nhân sự đang làm · **22 có `phong_ban_id`** · 23 có `quan_ly_id` |

Đúng khuôn **BH-32**: đọc `schema.sql` là đọc thiếu, phải grep `migrations/`.
Bài học đã ghi trong Sổ nhưng vòng này vẫn vấp lại.

### Lỗi có thật không, hay chỉ là chú thích sai?

Có thật, nhưng **đang ngủ**. Hôm nay so tên vẫn ra đúng người, vì
`src/index.js:560` và `:608` chép `phong_ban.ten` vào `nhan_su.bo_phan` lúc
tạo/sửa nhân sự — nên chuỗi trùng khớp một cách tình cờ.

**Ngòi nổ**: `src/dulieunen.js:117` đổi tên phòng ban chỉ chạy
`UPDATE phong_ban SET ten = ?` — **không** cập nhật ngược `nhan_su.bo_phan`
của người đang trong phòng. Đổi tên một phòng ban là mọi nhân sự cũ giữ chuỗi
cũ → `LOWER(TRIM(pb.ten)) = LOWER(TRIM(n.bo_phan))` (`src/index.js:3097`) trả
NULL cho cả phòng → `nguon = 'KHONG_CO_QUAN_LY'` → **rơi hết về Sếp duyệt**.
Đúng thứ cổng này sinh ra để tránh.

Đã thấy sẵn một ca lệch: **Vũ Lan Hương**, `bo_phan = "Kinh Doanh"`,
`phong_ban_id = NULL`, không khớp phòng ban nào. Nay chưa vỡ vì chị có
`quan_ly_id`; mất `quan_ly_id` là rơi lên Sếp.

**Sửa**: nối `phong_ban.id = n.phong_ban_id`, giữ so tên làm lớp lui thứ hai
cho 2 người còn `phong_ban_id` NULL. Xoá chú thích sai ở `:3089-3091`.

---

## 2. Migration — 0 `DROP`, nhưng lùi rồi chạy lại thì HỎNG

`grep -i drop` trên cả hai migration: chỉ khớp **dòng chú thích**, không có
lệnh `DROP` nào. Rename-swap giữ nguyên `gop_y_lich_su_luu_20260827`. Chốt
chặn chạy lại (`INSERT INTO schema_migrations` đặt TRƯỚC mọi `ALTER`) là đúng
cách — chạy lần 2 dừng ngay tại dòng đầu.

**Nhưng khai "lùi rồi chạy lại" là sai ở vế *chạy lại*.** Cả hai file lùi đều
`DELETE FROM schema_migrations` (gỡ chốt chặn) mà **để nguyên thay đổi cấu
trúc**:

- `lui-gopy-lichsu-tacnhan.sql` đổi tên ngược nhưng bảng `gop_y_lich_su_v2`
  vẫn còn → chạy lại vấp `CREATE TABLE gop_y_lich_su_v2` (đã tồn tại).
- `lui-gopy-congduyet.sql` chỉ `UPDATE` lại giá trị, không bỏ cột → chạy lại
  vấp `ALTER TABLE gop_y ADD COLUMN risk` (trùng cột).

Hệ quả **không mất dữ liệu** (lùi vẫn an toàn, đó là điều quan trọng nhất),
nhưng lùi xong là kẹt: muốn chạy lại phải dọn tay. Nhẹ hơn lỗi 1, vẫn phải ghi
rõ trong file lùi.

---

## 3. Chống mạo danh & ma trận trạng thái — phần này CHẮC

`CHECK` ở `them-gopy-lichsu-tacnhan.sql:48-51` tách đúng ba sự thật. Máy chạy
mà kèm `nguoi_doi_id` là vi phạm cả hai vế → DB chặn, không phụ thuộc code.
`gopYGhiLichSu()` (`src/index.js:3270`) là cửa ghi duy nhất.
SLA (`:3669`) ghi `tacNhan: 'SLA'`, `nguoi_doi_id` NULL — hợp lệ, không mạo danh ai.

Ma trận `CHUYEN_HOP_LE` (`src/index.js:3573-3589`):
`hoan_thanh` **chỉ** đến từ `san_sang_phat_hanh`, **chỉ** Sếp hoặc chính người
gửi, **bắt buộc** link PR/commit. Admin **không** có đường tắt — `laOwner` vẫn
bị chặn bởi `tu:`. Đường `moi → hoan_thanh` biến mất thật ở backend.

Chặn vượt cấp (`:3365-3372`) enforce ở backend bằng 403, không phải ẩn nút.
Sếp vượt cấp bắt buộc ghi lý do (B4) — có.

**B5** (`them-gopy-congduyet.sql:74-78`): dữ liệu cũ "Hoàn thành" không bằng
chứng chỉ `can_xac_minh_lai = 1`, **không** đụng `trang_thai`. Đúng Rule 10.

---

## 4. Hai lỗi Khỉ Đột tự tìm — đã sửa thật

| Lỗi | Chỗ sửa | Kết quả |
|---|---|---|
| ① Thiếu nhánh "lưu tại chỗ" → Sếp không dán được bằng chứng | `src/index.js:3524-3533`, các nhánh sau đổi thành `else if` | Đã sửa. Nhánh `trangThaiMoi === g.trang_thai` gỡ cờ khi có PR hợp lệ |
| ② Chưa chấm rủi ro thì quản lý duyệt LOW được → lách cổng Sếp | `src/index.js:3395-3399` sàn MEDIUM | Đã sửa. `de_xuat_risk` NULL thì sàn MEDIUM, quản lý chỉ nâng |

**Sàn MEDIUM có làm Sếp duyệt nhiều hơn không?** Có, và không đo được từ đây.
Sàn chỉ bật khi Hồ Ly AI chưa kịp chấm. Hồ Ly chạy Llama trên cron 5 phút và
tự thừa nhận model hay trả sai JSON (`:3118`). Model trả rác một đợt là cả đợt
đó rơi lên Sếp. Cần đếm tỉ lệ chấm hụt sau 2 tuần chạy thật.

---

## 5. Human Cost "2–6 lần/tuần" — KHÔNG kiểm được, đừng tin vội

Bản thật có **đúng 2 góp ý** trong toàn bộ lịch sử (cả hai LOW, đều đã được AI
chấm). Không có nền số liệu nào đỡ con số 2–6 lần/tuần — đó là **ước đoán**,
không phải phép đo.

Hướng lệch nghiêng về phía nặng hơn: cổng này lần đầu mời **24 nhân sự** gửi
góp ý, cộng sàn MEDIUM ở mục 4. Giả định "LOW ~60% dừng ở anh Duy" cũng chưa
có gì đỡ. Nếu vỡ thì vỡ theo hướng Sếp thành nút cổ chai — đúng thứ làm cổng
chết.

**Đề nghị**: chạy thử 2 tuần, đếm thật số lần Sếp phải bấm, rồi mới chốt.

---

## 6. Hai chỗ chưa kiểm được

- **SLA chưa chạy qua cron thật** của `workerd`. Đọc code thì đúng: hàm mắc
  vào `scheduled()` sẵn có (`:3941`), bọc `try/catch` nên hỏng cũng không kéo
  đổ chuỗi cron. Nhưng logic ngày (`datetime('now','+7 hours')`) và chống nhắc
  lặp (`nhac_duyet_luc`) chỉ lộ ra khi chạy thật. **Không chặn phát hành** —
  hỏng thì hỏng theo hướng an toàn (không nhắc), không phải nuốt việc.
- **Giao diện**: xem mục "Đo trực tiếp" bên dưới.

---

## 7. Đo trực tiếp

_(kết quả chạy thật — điền ở lượt sau)_

---

## 8. Chốt

| Mức | Việc | Chỗ |
|---|---|---|
| **CAO** | Đường lui trưởng phòng nối bằng chuỗi tên; đổi tên phòng ban là rơi cả phòng lên Sếp. Nối bằng `phong_ban_id` | `src/index.js:3092-3098` |
| **CAO** | Chú thích sai sự thật về schema — xoá, nếu không vòng sau lại tin theo | `src/index.js:3089-3091` |
| TRUNG BÌNH | Lùi xong không chạy lại được (còn bảng `_v2` / còn cột) | `migrations/lui-gopy-*.sql` |
| THẤP | `CHECK` không cấm dòng `nguoi` mang nhãn `tac_nhan` | `them-gopy-lichsu-tacnhan.sql:48` |
| THẤP | Human Cost là ước đoán, cần đếm thật 2 tuần | — |

**Khuyến nghị: KHÔNG NÊN ĐẨY** cho tới khi sửa xong hai mục CAO. Cả hai đều
nhỏ và gọn trong một hàm.
