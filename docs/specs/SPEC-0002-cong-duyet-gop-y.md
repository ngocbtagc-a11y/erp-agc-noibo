# SPEC-0002 — Cổng duyệt phân cấp & tái cấu trúc "Góp ý & Cải tiến ERP"

- **Yêu cầu gốc**: [CTL-0003](../requests/CTL-0003-cong-duyet-va-tai-cau-truc-gop-y.md)
- **Quyết định đã chốt**: [ADR-0006](../decisions/ADR-0006-cong-duyet-va-chi-phi-token.md)
  — Sếp quyết A1, A2, A3; Gạo quyết B1–B6
- **Người viết**: HỒ LY (Agent A — Business Analyst / Product Analyst / UX / QA)
- **Ngày viết**: 2026-08-27 · **Chốt lại**: 2026-08-27 sau ADR-0006
- **Risk**: **HIGH** (đụng phân quyền + đổi luồng nghiệp vụ đang chạy thật)
- **Boundary Classification**: `CROSS_DOMAIN` + `CORE_CHANGE`
  (đụng `src/quyen.js`-adjacent logic, đụng quan hệ `nhan_su.quan_ly_id`,
  đổi luật nghiệp vụ dùng chung toàn công ty)
- **Status**: **`READY_FOR_BUILD`** — **9/9 câu đã có đáp án** trong ADR-0006.
  Xem [Chín câu — đã chốt](#chín-câu--đã-chốt).
  **Kèm một điều kiện chặn**: Đợt 2 (bật cổng duyệt) **không được bắt đầu**
  khi `nhan_su.quan_ly_id` còn trống — xem [Điều kiện tiên quyết](#điều-kiện-tiên-quyết--dữ-liệu-quản-lý-trực-tiếp).
- **Spec kế tiếp cùng vùng**: [SPEC-0003](./SPEC-0003-runner-vong-lap.md) —
  thiết kế cột DB chung một lần, triển khai hai đợt.

---

## Problem

Module `gop_y` (`src/index.js:3010-3330`) là hàng đợi yêu cầu duy nhất của ERP,
nhưng **không có luật chuyển trạng thái nào**. `gopYDoiTrangThai()` chỉ kiểm tra
hai điều: `laAdmin(phien.vai_tro)` và `GOPY_TRANG_THAI_HOP_LE.includes(trangThaiMoi)`.

Hệ quả thật, đã xảy ra:

### Bằng chứng: 12 giây

Góp ý **#1** của chính Sếp Ngọc (Gạo đọc trực tiếp DB production 27/08/2026):

| Thời điểm | Việc xảy ra |
|---|---|
| 16:10:05 | Sếp gửi góp ý |
| 17:26:47 | Hồ Ly AI chấm `LOW`, đề xuất `da_duyet` (shadow mode, đúng thiết kế) |
| 19:51:19 | `moi → da_duyet` |
| 19:54:47 | `da_duyet → dang_lam` |
| **19:54:59** | **`dang_lam → hoan_thanh`** ← **12 giây sau khi bắt đầu làm** |

`nguoi_phu_trach_id = NULL`. `spec_reference = NULL`. Commit cuối của repo là
26/08 17:26 — **trước đó 2 tiếng rưỡi**, và nội dung không liên quan.

Một tính năng được "hoàn thành" trong 12 giây, không người phụ trách, không
spec, không một dòng code. Hệ thống không nói dối vì ai đó cố tình — nó nói
dối vì **không có gì ngăn nó nói dối**.

1. **Trạng thái nói dối.** `moi → hoan_thanh` một cú bấm là hợp lệ, và trên
   thực tế đã xảy ra đúng như vậy (bảng trên). Vi phạm Rule 9 (No Unverified
   Data Becomes Truth) và Rule 8 (Traceable & Recoverable).
2. **Không có phân cấp duyệt.** Ai có vai trò `admin` là đổi được mọi thứ,
   không qua quản lý trực tiếp. Sếp yêu cầu: nhân viên đề xuất → quản lý trực
   tiếp duyệt → ERP Owner duyệt → mới được làm.
3. **Danh sách quá sơ sài.** 4 cột (Tiêu đề · Người gửi · Trạng thái · Cập nhật).
   Nhìn vào không biết ai đang giữ, đã qua cấp nào, rủi ro ra sao, gửi từ bao giờ.
   Cột `de_xuat_risk` do Hồ Ly AI chấm mỗi 5 phút **đang không hiện ra màn hình**.

Đối chiếu trong cùng repo: module `cong_viec` (`src/index.js:1956`) **đã có**
khuôn đúng — mỗi trạng thái khai rõ `tu:` (đi từ đâu) và `ai:` (ai được bấm).
Module `gop_y` mới hơn nhưng thiếu hoàn toàn. Spec này bê nguyên khuôn đó sang,
không bịa kiểu mới.

### Ngoài phạm vi — vùng của Khỉ Đột (Rule 13)

**Nội dung nghiệp vụ của góp ý #1 là chuyện khác**, không phải cổng duyệt.
Nguyên văn trong DB: *"đoạn chat ko tiếp nhận ảnh chụp màn hình"* / *"Muốn có
thể paste nhanh chụp màn hình như chat trong zalo"* — tức là **dán ảnh vào ô
gửi góp ý**. Bản giao việc CTL-0003 mô tả lệch tên; đính chính tại đây.

Khỉ Đột **đang build** việc đó trên nhánh `feature/gopy-paste-anh`, đụng
`#gy-form` / `nenAnhVuaKhung` / cột `gop_y.dinh_kem` / hàm `gopYGui()`.

→ SPEC-0002 **không thiết kế, không sửa, không nhắc tới** form gửi góp ý,
ô đính kèm, `dinh_kem`, `gopYGui()`. Toàn bộ spec này chỉ đụng
`gopYDoiTrangThai()`, `gopYDanhSach()`, `gop_y_lich_su` và phần **danh sách**
của giao diện. Hai vùng không giao nhau, chạy song song được.

Góp ý #1 vẫn xuất hiện trong spec này ở đúng một vai trò: **bằng chứng** cho
việc trạng thái đang nói dối, và **ca kiểm thử đầu tiên** của luật mới
(xem [Q7](#q7--dữ-liệu-cũ)).

---

## Current flow

```
Nhân viên gửi (POST /api/gop-y)  →  trang_thai = 'moi'
        ↓ cron */5 phút
hoLyTuDongTriage()  →  ghi de_xuat_loai/de_xuat_risk/de_xuat_spec  (shadow, KHÔNG đổi trạng thái)
        ↓
Bất kỳ ai có vai_tro='admin' bấm  →  đổi sang BẤT KỲ trạng thái nào trong 12 giá trị
        ↓
Ghi gop_y_lich_su + bắn chuông/Telegram nếu chạm 1 trong 6 mốc
```

Không có: cổng duyệt, luật chuyển, bằng chứng, khái niệm "đang chờ ai".

---

## Proposed flow

```
Nhân viên gửi                     trang_thai='moi'    next_owner='QL_CAP1'
        ↓ cron (đã có) — Hồ Ly AI chấm de_xuat_risk (giữ nguyên, vẫn shadow)
CỔNG 1 — QUẢN LÝ TRỰC TIẾP duyệt/từ chối
   ├─ Từ chối → 'bi_tu_choi' (bắt buộc lý do) → người gửi sửa, gửi lại
   └─ Duyệt   → chốt `risk` (chỉ được NÂNG so với AI, không được hạ)
        ├─ risk=LOW    → 'cho_phan_tich', next_owner='HOLY'   (KHÔNG qua Sếp)
        └─ risk≥MEDIUM → next_owner='OWNER'
                ↓
        CỔNG 2 — ERP OWNER duyệt
           ├─ Từ chối → 'bi_tu_choi'
           ├─ risk=HIGH → bắt buộc qua 'cho_quyet_dinh' (ghi quyết định bằng văn bản)
           └─ Duyệt    → 'cho_phan_tich' → 'dang_phan_tich' → 'da_duyet'
                ↓
        BUILD: 'dang_lam' → 'dang_kiem_tra' (bắt buộc handoff_reference)
                ↓
        'cho_nghiem_thu' (bắt buộc review_reference)
                ↓
        CỔNG 3 — NGHIỆM THU → 'san_sang_phat_hanh'
                ↓
        'hoan_thanh'  ⟵ CHẶN CỨNG: bắt buộc `bang_chung_url` (link PR/commit đã merge)
```

**Điểm quan trọng nhất**: `hoan_thanh` **chỉ đến được từ `san_sang_phat_hanh`**.
Đường tắt `moi → hoan_thanh` biến mất ở tầng backend, không phải ẩn nút.

---

## Actors

Không tạo vai trò hệ thống mới (ràng buộc CTL-0003). Bốn "tư cách" dưới đây được
tính **theo quan hệ với bản ghi**, đúng cách `cong_viec` đang làm
(`laNguoiNhan` / `laNguoiGiao`), không phải theo `vai_tro` đăng nhập:

| Tư cách | Cách tính (backend) | Nguồn |
|---|---|---|
| `laNguoiGui` | `gop_y.nguoi_gui_id === phien.nhan_su_id` | đã có |
| `laQuanLyCap1` | `phien.nhan_su_id === nguoiDuyetCap1(nguoi_gui_id)` | `nhan_su.quan_ly_id`, fallback `phong_ban.truong_phong_id` |
| `laOwner` | `laAdmin(phien.vai_tro)` | `src/quyen.js` — đã có, không đổi |
| `laRunner` | token HMAC của runner | SPEC-0003, Đợt B — **chưa có ở spec này** |

Hàm mới cần viết (backend, `src/index.js` vùng `gop_y`):

```
nguoiDuyetCap1(env, nhanSuId) → { id, nguon }
   nguon ∈ 'QUAN_LY_ID' | 'TRUONG_PHONG_ID' | 'KHONG_CO_QUAN_LY'
```

Quy tắc (**đã chốt** — ADR-0006 B1):
1. `nhan_su.quan_ly_id` khác NULL và người đó `dang_lam=1` → lấy người đó, `nguon='QUAN_LY_ID'`.
2. Không có → tra `phong_ban.truong_phong_id` theo `nhan_su.phong_ban_id`,
   `nguon='TRUONG_PHONG_ID'`.
3. Vẫn không có, hoặc quản lý cấp 1 chính là người gửi → `nguon='KHONG_CO_QUAN_LY'`,
   cổng 1 tự vượt qua (xem [Q2](#q2--người-không-có-quản-lý-trực-tiếp)).

---

## Data

### Bảng dùng — EXTEND, không tạo bảng mới

`gop_y` và `gop_y_lich_su` (`migrations/them-gopy.sql`) là hàng đợi yêu cầu
**duy nhất** của toàn hệ thống. Đây là lỗi đã làm `SPEC-0001` phải rút:
tạo hệ thống request thứ hai. Spec này **chỉ `ALTER TABLE ADD COLUMN`**.

### Cột thêm — Đợt A (`migrations/them-gopy-congduyet.sql`)

Thiết kế một lần cho **cả SPEC-0002 lẫn SPEC-0003** để không sửa hai lần
cùng vùng (ràng buộc chung, CTL-0003 mục 5).

| Cột | Kiểu | Mặc định | Dùng cho | Ghi chú |
|---|---|---|---|---|
| `risk` | TEXT | NULL | 0002 | `LOW`/`MEDIUM`/`HIGH` — **do người chốt**, khác hẳn `de_xuat_risk` (AI đề xuất, đã có) |
| `risk_chot_boi_id` | TEXT | NULL | 0002 | FK `nhan_su(id)` — ai chốt mức rủi ro |
| `risk_chot_luc` | TEXT | NULL | 0002 | |
| `duyet_cap1_boi_id` | TEXT | NULL | 0002 | FK `nhan_su(id)` |
| `duyet_cap1_luc` | TEXT | NULL | 0002 | |
| `duyet_cap1_nguon` | TEXT | NULL | 0002 | `QUAN_LY_ID`/`TRUONG_PHONG_ID`/`KHONG_CO_QUAN_LY`/`OWNER_VUOT_CAP`/`TU_DUYET_OWNER` — **đóng băng tại thời điểm duyệt** để sau này `quan_ly_id` đổi thì lịch sử vẫn đúng (Rule 10) |
| `duyet_owner_boi_id` | TEXT | NULL | 0002 | |
| `duyet_owner_luc` | TEXT | NULL | 0002 | |
| `bang_chung_url` | TEXT | NULL | 0002 + 0003 | Link PR/commit đã merge — điều kiện cứng vào `hoan_thanh` |
| `ly_do_tu_choi` | TEXT | NULL | 0002 | |
| `so_lan_gui_lai` | INTEGER | 0 | 0002 | Đếm, **không** để đánh giá cá nhân |
| `can_xac_minh_lai` | INTEGER | 0 | 0002 | Cờ cho dữ liệu cũ — xem [Q7](#q7--dữ-liệu-cũ) |
| `nhac_duyet_luc` | TEXT | NULL | 0002 | Lần nhắc SLA gần nhất, chống spam chuông |
| **`current_owner`** | TEXT | `'NGUOI_GUI'` | 0002 + **0003** | Ai đang cầm việc |
| **`next_owner`** | TEXT | `'QL_CAP1'` | 0002 + **0003** | Ai sẽ nhận tiếp — chính là cột "Đang chờ ai" trên danh sách |

Tập giá trị đóng của `current_owner`/`next_owner` (validate ở backend):
`NGUOI_GUI` · `QL_CAP1` · `OWNER` · `GAO` · `HOLY` · `KHIDOT` · `RUNNER` · `NONE`.

> **Vì sao không tái dùng `nguoi_phu_trach_id`** cho việc này: cột đó là
> `TEXT REFERENCES nhan_su(id)` — trỏ tới một **nhân sự thật**. Nhồi `HOLY`/
> `KHIDOT` vào sẽ buộc phải tạo bản ghi nhân sự giả cho Agent, vi phạm Rule 9
> và làm hỏng Headcount. Giữ nguyên ý nghĩa cũ của cột, thêm cột mới cho khái
> niệm mới. Đây đúng là đề xuất Gạo đã ghi ở `REQUEST-WORKFLOW.md` mục 5.

Index thêm:
```sql
CREATE INDEX IF NOT EXISTS idx_gopy_nextowner ON gop_y (next_owner, trang_thai, tao_luc);
CREATE INDEX IF NOT EXISTS idx_gopy_xacminh   ON gop_y (can_xac_minh_lai);
```

### Trạng thái thêm vào `GOPY_TRANG_THAI_HOP_LE`

Chỉ thêm giá trị vào mảng hằng trong `src/index.js` — **không** ALTER, không
phá dữ liệu cũ:

| Giá trị mới | Control Tower | Nhãn người dùng | Vì sao cần |
|---|---|---|---|
| `cho_phan_tich` | `READY_FOR_ANALYSIS` | Đã duyệt — chờ phân tích | Khoảng trống Gạo đã nêu (`REQUEST-WORKFLOW.md` mục 5) |
| `bi_tu_choi` | `REJECTED` | Chưa được duyệt | Cổng 1/2 từ chối — hiện chưa có nơi để đi |
| `da_huy` | `CANCELLED` | Đã huỷ | Người gửi tự rút, hoặc trùng lặp |

Tổng: 12 → 15 trạng thái. Không thêm trạng thái riêng cho từng cổng duyệt —
"đang chờ ai" đọc từ `next_owner`, rẻ hơn và tái dùng được cho SPEC-0003.

---

## BLOCKER — `gop_y_lich_su` không ghi được hành động của máy

> Gạo phát hiện 27/08/2026 khi đọc `migrations/them-gopy.sql`.
> **Ảnh hưởng cả SPEC-0002 lẫn SPEC-0003 → thiết kế một lần tại đây.**

```sql
nguoi_doi_id  TEXT NOT NULL REFERENCES nhan_su(id)
```

Cột này **NOT NULL** và trỏ tới một **nhân sự thật**. Hệ quả: mọi hành động
không do người bấm đều **không ghi được lịch sử** nếu không mạo danh ai đó.
Các trường hợp bị chặn:

| Hành động | Ai bấm? |
|---|---|
| SLA tự đẩy `next_owner` lên Owner sau 5 ngày (SPEC-0002) | không ai |
| Runner ghi `dang_kiem_tra` sau khi Khỉ Đột build xong (SPEC-0003) | không ai |
| Watchdog đặt `bi_chan` khi job chết (SPEC-0003) | không ai |
| Tự `PAUSED` khi vượt trần tiền (SPEC-0003) | không ai |

Đây cũng chính là lý do Gạo **không tự sửa** nhãn "Hoàn thành" sai của góp ý
#1: ghi vào sẽ phải mạo danh Sếp Ngọc — làm hỏng đúng cái audit trail đang
cần chữa. Không giải được cái này thì SPEC-0003 mâu thuẫn với chính nó
("runner là One Writer duy nhất của trạng thái" nhưng runner không ghi được).

### Ba phương án — phản biện

| | Cách làm | Vì sao **không** chọn |
|---|---|---|
| **A** | Cho `nguoi_doi_id` NULL + thêm cột phân loại | Đúng hướng, **nhưng** SQLite/D1 **không** đổi được `NOT NULL` bằng `ALTER TABLE`. Bắt buộc dựng lại bảng — nên A ở dạng ngây thơ là không chạy được |
| **B** | Tạo bản ghi `nhan_su` kỹ thuật cho từng Agent | **Bác bỏ.** Nhân sự giả sẽ lọt vào Danh bạ, Quản trị, Xếp ca, Chấm công, Headcount, dropdown "Người phụ trách", báo cáo nhân sự. Có thể thêm cờ loại trừ, nhưng phải vá **mọi** truy vấn `nhan_su` — bỏ sót một chỗ là một người giả xuất hiện trong bảng lương. Vi phạm Rule 9 (dữ liệu chưa xác minh không được thành Production Master Data) và Rule 1. Đồng ý với Gạo |
| **C** | Dựng lại bảng bằng **rename-swap**, **không `DROP`** | ✅ **Chọn C** |

### Phương án C — dựng lại không DROP, lùi được bằng 2 lệnh

`gop_y_lich_su` mới ra đời **25/08/2026** — hai ngày tuổi, rất ít dòng. Đây là
lúc rẻ nhất để sửa; càng để lâu càng đắt. Bảng này là **lá** (không bảng nào
tham chiếu tới nó), nên đổi tên an toàn.

`migrations/them-gopy-lichsu-tacnhan.sql`:

```sql
CREATE TABLE gop_y_lich_su_v2 (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  gop_y_id              INTEGER NOT NULL REFERENCES gop_y(id),
  tu_trang_thai         TEXT,
  den_trang_thai        TEXT NOT NULL,
  nguoi_doi_id          TEXT REFERENCES nhan_su(id),   -- NULL = KHÔNG PHẢI người
  nguoi_thuc_hien_loai  TEXT NOT NULL DEFAULT 'nguoi', -- nguoi|he_thong|ho_ly|khi_dot
  tac_nhan              TEXT,        -- nhãn hiển thị khi không phải người
  uy_quyen_boi_id       TEXT REFERENCES nhan_su(id),   -- ai đã cho phép chuỗi tự động này
  job_id                TEXT,        -- nối sang agent_run (SPEC-0003)
  ghi_chu               TEXT,
  luc                   TEXT NOT NULL,
  CHECK (
    (nguoi_thuc_hien_loai = 'nguoi'  AND nguoi_doi_id IS NOT NULL) OR
    (nguoi_thuc_hien_loai <> 'nguoi' AND nguoi_doi_id IS NULL AND tac_nhan IS NOT NULL)
  )
);

INSERT INTO gop_y_lich_su_v2
  (id, gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, nguoi_thuc_hien_loai, ghi_chu, luc)
SELECT id, gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, 'nguoi', ghi_chu, luc
  FROM gop_y_lich_su;

ALTER TABLE gop_y_lich_su    RENAME TO gop_y_lich_su_luu_20260827;  -- GIỮ, không DROP
ALTER TABLE gop_y_lich_su_v2 RENAME TO gop_y_lich_su;
CREATE INDEX IF NOT EXISTS idx_gopylichsu_gopy ON gop_y_lich_su (gop_y_id, luc);
```

- **Không `DROP` dòng nào.** Bảng cũ còn nguyên dưới tên có ngày tháng, đóng
  băng làm bản sao lưu. Xoá hay không là quyết định riêng của Sếp, vài tháng sau.
- **Rollback = 2 lệnh rename ngược lại.** `lui-gopy-lichsu-tacnhan.sql`.
- Dòng cũ đều nhận `nguoi_thuc_hien_loai='nguoi'` → **đọc y hệt trước đây**,
  không diễn giải lại lịch sử (Rule 10).
- `CHECK` ép ở tầng DB: là người thì phải có id; là máy thì **cấm** có id và
  **bắt buộc** có nhãn. Không thể mạo danh, kể cả khi code viết sai.

### Ba trường thay vì một — vì đây là ba sự thật khác nhau

| Trường | Trả lời câu hỏi | Ví dụ |
|---|---|---|
| `nguoi_doi_id` | **Ai bấm?** | `ns_007` (anh Duy) — NULL nếu máy |
| `tac_nhan` | **Cái gì chạy?** | `KHỈ ĐỘT` · `HỒ LY` · `RUNNER` · `SLA` |
| `uy_quyen_boi_id` | **Ai chịu trách nhiệm?** | `ns_001` (Sếp Ngọc — người đã duyệt và bật tự động) |

Gộp ba thứ này vào một cột chính là gốc của vấn đề. Tách ra thì truy trách
nhiệm được mà không ai bị mạo danh: *"Khỉ Đột chuyển sang Đang kiểm tra —
chạy theo uỷ quyền của Sếp Ngọc, job `a3f...`"*.

Hiển thị: `nguoi_thuc_hien_loai='nguoi'` → tên người như cũ. Khác `nguoi` →
biểu tượng máy + `tac_nhan` + *"(uỷ quyền: <tên>)"*. Người dùng **không bao
giờ** thấy tên một người cho hành động người đó không làm (Rule 7, Rule 9).

**Đây là thay đổi cấu trúc một bảng audit → Owner Gate.**
**Sếp ĐÃ DUYỆT** — ADR-0006 A3, xem [câu 9](#chín-câu--đã-chốt).

---

## Source of Truth

| Sự thật | Nguồn duy nhất | Ghi chú |
|---|---|---|
| Trạng thái một yêu cầu | `gop_y.trang_thai` | Không có nguồn thứ hai. Runner (SPEC-0003) cũng ghi qua đây |
| Ai đang cầm việc | `gop_y.current_owner` / `next_owner` | Mới |
| Quan hệ báo cáo cá nhân | `nhan_su.quan_ly_id` | **Chốt: đây là Source of Truth cho "quản lý cấp 1"** |
| Trưởng phòng của phòng ban | `phong_ban.truong_phong_id` | Chỉ là **fallback**, không đồng thời quyết định |
| Mức rủi ro đã chốt | `gop_y.risk` | `de_xuat_risk` chỉ là ĐỀ XUẤT của AI, không phải sự thật |
| Lịch sử duyệt | `gop_y_lich_su` | Append-only, đã có, đủ dùng — không tạo bảng audit mới |

**Xung đột hai nguồn (Rule 1)**: một nhân sự có thể có `quan_ly_id` = anh Duy
trong khi `phong_ban.truong_phong_id` của phòng đó là người khác. Nếu để cả hai
cùng duyệt được thì "một sự thật, hai chủ" → FAIL. Luật cứng: **`quan_ly_id`
thắng; `truong_phong_id` chỉ dùng khi `quan_ly_id` NULL**. Đây là business
policy, **đã chốt** ở ADR-0006 B1.

Đúng ngữ cảnh thật của Sếp: kênh báo cáo chuẩn của kho là *Nhân sự kho →
anh Phạm Khương Duy → Sếp Ngọc*. Kênh đó nằm ở `quan_ly_id`, không nằm ở
`truong_phong_id`. Nếu chọn `truong_phong_id` làm chính, nhân sự kho có thể
rơi vào tay người không phải anh Duy — phá đúng kênh báo cáo Sếp vừa dựng.

---

## Core reuse

Đã kiểm tra trước khi đề xuất bất cứ thứ gì mới (Rule 5):

| Cần | Đã có | Dùng lại thế nào |
|---|---|---|
| Mã góp ý | `gop_y.id` AUTOINCREMENT | Hiển thị `GY-0007` bằng format phía client — **không thêm cột** |
| Khuôn luật chuyển trạng thái | `CHUYEN_HOP_LE` trong `cvCapNhat()` (`src/index.js:1956`) | Bê nguyên hình dạng `{ tu: [...], ai: <bool>, batBuoc... }` |
| Quyền Admin | `laAdmin()` (`src/quyen.js`) | Không sửa `quyen.js`, không thêm vai trò |
| Quản lý trực tiếp | `nhan_su.quan_ly_id` (`schema.sql:24`) | Đã có từ đầu, chưa ai dùng cho việc này |
| Trưởng phòng | `phong_ban.truong_phong_id` (`them-dangky-ca.sql:24`) | Fallback |
| Phòng ban người gửi | `nhan_su.bo_phan`, `nhan_su.phong_ban_id` | JOIN thêm vào `gopYDanhSach()` |
| Lịch sử | `gop_y_lich_su` | Đã đủ 5 trường `from/to/by/at/reason` |
| Báo người duyệt | `guiThongBao()` + `guiTelegram()` | Đã chạy thật ở 6 mốc, thêm mốc mới vào `GOPY_MOC_THONG_BAO` |
| Risk do AI chấm | `de_xuat_risk`, `de_xuat_ly_do` | Chỉ cần **hiện ra màn hình** — đã nằm sẵn trong response `gopYDanhSach()` |
| Link spec | `gop_y.spec_reference` | Đã có, chưa dùng — nay dùng thật |
| Nhắc SLA | cron `*/5 * * * *` (`scheduled()`) | Thêm 1 hàm vào chuỗi đã có, không tạo cron mới |

**Không tạo mới**: không bảng mới, không vai trò mới, không cron mới, không
component UI mới ngoài card mobile.

---

## New Domain data

Không có bảng mới. Chỉ 15 cột `ADD COLUMN` liệt kê ở mục [Data](#data).

---

## Permissions

Toàn bộ enforce ở **backend** (`src/index.js`), giao diện chỉ ẩn nút cho đỡ rối.
Giữ đúng mức đã có tiền lệ: nhân viên gọi thẳng API bị chặn 403.

| Hành động | API | Ai được | Kiểm ở đâu |
|---|---|---|---|
| Gửi góp ý | `POST /api/gop-y` | mọi vai trò (đã có tab `gopy`) | không đổi |
| Xem danh sách | `GET /api/gop-y` | người gửi thấy của mình; **quản lý cấp 1 thấy thêm của cấp dưới**; Admin thấy tất | mở rộng `gopYDanhSach()` |
| Duyệt/từ chối cấp 1 | `POST /api/gop-y/duyet` | `laQuanLyCap1` hoặc `laOwner` | mới |
| Duyệt/từ chối Owner | `POST /api/gop-y/duyet` | `laOwner` | mới |
| Đổi trạng thái vận hành | `POST /api/gop-y/trang-thai` | theo ma trận dưới | sửa `gopYDoiTrangThai()` |
| Bấm `hoan_thanh` | `POST /api/gop-y/trang-thai` | chỉ `laOwner` + bắt buộc `bang_chung_url` | mới |
| Báo nghiệm thu chưa đạt | `POST /api/gop-y/trang-thai` | `laNguoiGui` hoặc `laOwner` | mới |
| Xem chi tiết/lịch sử/ảnh | đã có | chủ sở hữu hoặc Admin | **mở rộng thêm quản lý cấp 1** |

> **Mở rộng quyền xem cho quản lý cấp 1** là thay đổi phân quyền thật →
> nằm trong Owner Gate. Đã đưa vào danh sách Sếp chốt (câu 1 bao trùm).

### Ma trận chuyển trạng thái (Q3 — viết theo đúng khuôn `cong_viec`)

Ký hiệu: `NG`=người gửi · `QL1`=quản lý cấp 1 · `OWN`=ERP Owner ·
`RUN`=runner (SPEC-0003, Đợt B — chưa bật ở spec này).

> **CẬP NHẬT 28/08/2026 (ADR-0015 — Sếp Ngọc chốt).** `OWN` **không còn là
> `laAdmin(vai_tro)`**, mà là **cờ `tai_khoan.duyet_gopy`** (hàm
> `duocDuyetGopY(phien)` trong `src/quyen.js`). Sau migration
> `them-quyen-duyet-gopy.sql` chỉ tài khoản của **Sếp Bùi Thị Ngọc** mang cờ.
>
> Anh Nguyễn Duy Phong (Giám đốc, `admin`) **vẫn XEM đầy đủ** mọi góp ý, mọi
> trạng thái, lịch sử, ghi chú nội bộ, mức rủi ro, link PR — và **vẫn làm
> được mọi bước vận hành** (phân loại, giao người phụ trách, gỡ chặn, mở lại,
> đẩy việc qua làm–kiểm–nghiệm thu). Anh **chỉ mất nút duyệt/từ chối ở cấp
> cuối**. Cấp 1 của quản lý phòng **giữ nguyên**, không đổi một chữ.
>
> Hai đường vòng ra đúng cổng này ở `POST /api/gop-y/trang-thai` đã bịt cùng
> lúc, vì bịt cửa trước mà bỏ ngỏ cửa sau thì không phải là chặn:
> `cho_quyet_dinh → cho_phan_tich` (chính là quyết định cấp cuối cho việc rủi
> ro CAO) và `da_huy` khi góp ý **còn đang ở cổng duyệt** (từ chối trá hình).
>
> Thêm **hoàn tác 15 phút** (`POST /api/gop-y/hoan-tac`): Sếp duyệt một mình
> trên điện thoại, bấm nhầm thì không ai sửa hộ. Chỉ chính người vừa bấm,
> chỉ khi việc **chưa đi tiếp**, và lịch sử **ghi thêm** dòng hoàn tác chứ
> không xoá dòng nào.
>
> Đo: `node scripts/do-quyen-duyet-gopy.mjs` — 45 mốc, gồm 4 ca đối chứng
> BH-16 (2 ca rò rỉ + 2 ca **cắt quá tay**). Ngưỡng ngón tay:
> `node scripts/do-nut-gopy-44px.mjs`.

| Đích | `tu:` (đi từ) | `ai:` | Điều kiện bắt buộc |
|---|---|---|---|
| `bi_tu_choi` | `moi`, `cho_phan_tich`, `cho_quyet_dinh` | QL1, OWN | `ly_do_tu_choi` không rỗng |
| `moi` (gửi lại) | `bi_tu_choi` | NG | reset `duyet_cap1_*`, `duyet_owner_*`, `risk`; `so_lan_gui_lai += 1` |
| `da_huy` | `moi`, `bi_tu_choi`, `cho_phan_tich`, `cho_quyet_dinh` | NG, OWN | |
| `cho_quyet_dinh` | `moi` | QL1, OWN | chỉ khi `risk='HIGH'`; `duyet_cap1_*` đã ghi |
| `cho_phan_tich` | `moi` | QL1 | **chỉ khi `risk='LOW'`** (ngưỡng bỏ qua cổng Sếp — **đã chốt** ADR-0006 A1) |
| `cho_phan_tich` | `moi`, `cho_quyet_dinh` | OWN | `duyet_cap1_*` đã ghi (hoặc `OWNER_VUOT_CAP`); `risk` khác NULL |
| `dang_phan_tich` | `cho_phan_tich` | OWN, RUN | |
| `da_duyet` | `cho_phan_tich`, `dang_phan_tich` | OWN | `risk` khác NULL **và** đủ cổng theo ngưỡng |
| `dang_lam` | `da_duyet`, `can_chinh_sua` | OWN, RUN | |
| `dang_kiem_tra` | `dang_lam` | OWN, RUN | `handoff_reference` khác rỗng (Đợt B) |
| `can_chinh_sua` | `dang_kiem_tra`, `nghiem_thu_chua_dat` | OWN, RUN | `ghi_chu` không rỗng; `so_vong_sua += 1` (Đợt B) |
| `cho_nghiem_thu` | `dang_kiem_tra` | OWN, RUN | `review_reference` khác rỗng (Đợt B) |
| `nghiem_thu_chua_dat` | `cho_nghiem_thu` | NG, OWN | `ghi_chu` không rỗng |
| `san_sang_phat_hanh` | `cho_nghiem_thu` | OWN | |
| **`hoan_thanh`** | **`san_sang_phat_hanh`** | **OWN, NG** *(ADR-0006 A2)* | **`bang_chung_url` khác rỗng — CHẶN CỨNG 400.** `NG` = **đúng người đã gửi góp ý này** (`gop_y.nguoi_gui_id = phien.nhan_su_id`), không phải "người gửi" chung chung. **`RUN` và người build KHÔNG có trong cột `ai:`** — chốt chặn cho đúng lỗi 12 giây |
| `bi_chan` | mọi trạng thái đang chạy | OWN, RUN | `ghi_chu` không rỗng |
| (thoát chặn) | `bi_chan` → trạng thái ngay trước đó | OWN | đọc từ `gop_y_lich_su` |
| **(mở lại)** | `hoan_thanh` → `da_duyet` hoặc `dang_lam` | **chỉ OWN** | **chỉ khi `can_xac_minh_lai=1`**; `ghi_chu` không rỗng; đặt lại `can_xac_minh_lai=0` sau khi mở |

Mọi cặp `(tu, den)` **không** có trong bảng → HTTP 400
`Không thể chuyển từ "X" sang "Y"` (đúng thông điệp `cong_viec` đang dùng).

Mỗi lần chuyển, backend tự tính lại `current_owner`/`next_owner` — **không**
cho client gửi lên hai cột này.

---

## Happy path

**Nhân viên kho gửi góp ý nhỏ về màn Kho vận (risk LOW)** — Rule 4, phải cực nhanh:

1. NV gửi (form đã có, không đổi).
2. Cron Hồ Ly AI chấm `de_xuat_risk = LOW` (đã chạy sẵn, ~5 phút).
3. Anh Duy mở tab Góp ý trên điện thoại → panel **"Chờ tôi duyệt (1)"** ngay
   đầu màn → bấm **Duyệt** → xong. **1 thao tác.**
4. Vào thẳng `cho_phan_tich`, `next_owner='HOLY'`. **Sếp không phải bấm gì.**
5. NV nhận chuông: *"Anh Duy đã duyệt góp ý của bạn — cảm ơn bạn đã báo."*

**Góp ý MEDIUM/HIGH**: thêm đúng 1 bước — Sếp bấm Duyệt trong panel
"Chờ tôi duyệt". Duyệt hàng loạt được với MEDIUM (chọn nhiều, 3 thao tác cho
cả lô). HIGH bắt buộc mở từng cái và ghi quyết định.

---

## Exception path

| Ngoại lệ | Xử lý |
|---|---|
| Người gửi không có `quan_ly_id` và phòng chưa có trưởng phòng | Cổng 1 tự vượt, ghi `duyet_cap1_nguon='KHONG_CO_QUAN_LY'`, `next_owner='OWNER'`. Đồng thời gắn cảnh báo dữ liệu cho HCNS: *"N nhân sự chưa gán quản lý trực tiếp"*. **Không** chặn người gửi vì lỗi master data. |
| Người gửi chính là quản lý cấp 1 của mình (dữ liệu vòng) | Coi như `KHONG_CO_QUAN_LY`, đẩy thẳng lên Owner |
| Sếp tự gửi góp ý | `duyet_cap1_nguon='TU_DUYET_OWNER'`, cả hai cổng tự qua, vẫn ghi 2 dòng lịch sử để truy được |
| Quản lý cấp 1 nghỉ/không duyệt | SLA: ngày thứ 3 nhắc chuông + Telegram; ngày thứ 5 **tự đổi `next_owner='OWNER'`** (chỉ đổi người chờ, **không** tự duyệt). Ghi dòng lịch sử `nguoi_doi_id` = người gửi + `ghi_chu='Quá hạn duyệt cấp 1, chuyển lên ERP Owner'` |
| Quản lý cấp 1 muốn hạ `risk` xuống dưới mức AI chấm | **Chặn 403** — chỉ được nâng. Muốn hạ phải Owner. Chống lách cổng Sếp bằng cách tự hạ rủi ro |
| Từ chối rồi gửi lại nhiều lần | Cho phép, đếm `so_lan_gui_lai`. Từ lần thứ 3, `next_owner='OWNER'` luôn (tránh giằng co giữa NV và quản lý) |
| Bấm `hoan_thanh` thiếu bằng chứng | HTTP 400: *"Cần dán link Pull Request hoặc commit đã merge trước khi đánh dấu Hoàn thành"* |

---

## SLA

| Chặng | Ngưỡng | Việc hệ thống làm |
|---|---|---|
| Chờ duyệt cấp 1 | 3 ngày | nhắc chuông + Telegram cho quản lý |
| Chờ duyệt cấp 1 | 5 ngày | tự chuyển `next_owner='OWNER'` |
| Chờ duyệt Owner | 5 ngày | nhắc Telegram (không tự chuyển đi đâu — Owner là cuối) |
| Chờ nghiệm thu | 7 ngày | nhắc người gửi |

Tính theo ngày lịch, kiểm trong cron `*/5` đã có; `nhac_duyet_luc` chống nhắc lặp.
Ngưỡng lưu trong `cau_hinh_he_thong` (SPEC-0003) để đổi không cần deploy —
Đợt A tạm hardcode hằng số, Đợt B chuyển sang config.

---

## Audit

- Mọi chuyển trạng thái → 1 dòng `gop_y_lich_su` (**cấu trúc mở rộng**, xem
  [BLOCKER](#blocker--gop_y_lich_su-không-ghi-được-hành-động-của-máy)).
- Hành động của máy (SLA tự đẩy cấp, runner ở SPEC-0003) ghi với
  `nguoi_doi_id = NULL`, `tac_nhan='SLA'/'RUNNER'/...` — **không mạo danh ai**.
- Duyệt cấp 1 / duyệt Owner cũng ghi 1 dòng lịch sử **kèm `ghi_chu`**, ngoài
  việc đóng dấu vào cột `duyet_*` — cột để truy vấn nhanh, lịch sử để kể chuyện.
- `duyet_cap1_nguon` đóng băng tại thời điểm duyệt. Sau này HCNS đổi
  `nhan_su.quan_ly_id` thì hồ sơ duyệt cũ **vẫn đọc đúng** ai đã duyệt và với
  tư cách gì (Rule 10 — History Must Survive Change).
- Vượt cấp của Sếp ghi rõ `OWNER_VUOT_CAP` + bắt buộc `ghi_chu` — không có
  đường duyệt im lặng.

---

## UX

### Danh sách — desktop (7 cột, không phải 8)

`Mã · Tiêu đề (+khu vực) · Người gửi (+phòng ban) · Ngày gửi · Rủi ro · Trạng thái · Đang chờ ai`

Phản biện đề xuất khởi điểm của Gạo: cột **"Cấp duyệt hiện tại"** và
**"Đang chờ ai"** nói **cùng một điều** — bỏ cột "Cấp duyệt", thay bằng hai dấu
tick nhỏ ngay trong ô Trạng thái: `✓QL ✓Sếp`. Tiết kiệm 1 cột, không mất thông tin.

- **Rủi ro**: chip màu. Hiện `risk` nếu đã chốt; chưa chốt thì hiện `de_xuat_risk`
  mờ + biểu tượng 🦊 (đã có tiền lệ trong `veDongGopY`) với chú thích
  *"Hồ Ly đề xuất, chưa ai chốt"*. **Đây là lần đầu `de_xuat_risk` hiện ra màn hình.**
- **Đang chờ ai**: dịch `next_owner` sang tên người thật
  (`QL_CAP1` → *"Anh Duy"*, `OWNER` → *"Sếp Ngọc"*, `HOLY`/`KHIDOT` → *"Máy đang xử lý"*).
  Người dùng không bao giờ nhìn thấy mã kỹ thuật (Rule 7 — Users See Work, Not Software).

### Danh sách — mobile (<720px): **bỏ bảng ngang, chuyển card**

ERP là PWA, anh Duy và nhân viên kho duyệt trên điện thoại. 7 cột × ~360–430px
là không đọc được — bảng sẽ tràn ngang, đúng loại UX smell mà
`UX_ENGINEERING_STANDARD.md` cấm. Thiết kế card 2–3 dòng:

```
┌──────────────────────────────────────────┐
│ GY-0012   [Rủi ro: Thấp]                 │
│ Nút Lưu ở màn Nhập kho bị che khi bàn    │
│ phím bật lên                             │
│ [Chờ duyệt] · Chờ: Anh Duy · 2 ngày trước│
│ (dòng 3 chỉ hiện với quản lý/Admin:)     │
│ Nguyễn Văn A — Kho Vận                   │
└──────────────────────────────────────────┘
```

Trong panel **"Chờ tôi duyệt"**, card có 2 nút to chạm được bằng ngón cái:
**Duyệt** / **Từ chối**. Không bắt mở modal mới duyệt được việc rủi ro thấp.

### Exception-First (Q10)

Màn hình mở ra hiện theo thứ tự, panel rỗng thì **ẩn hẳn** (đã có tiền lệ
`gy-canxuly-panel`):

1. **Chờ tôi duyệt (n)** — `next_owner` khớp tư cách người xem. Mặc định mở.
2. **Quá hạn duyệt (n)** — quá 3 ngày. Chỉ hiện khi có.
3. **Việc của tôi đang chạy** — mình là người gửi hoặc `nguoi_phu_trach_id`.
4. **Cần xác minh lại (n)** — `can_xac_minh_lai=1`, chỉ Admin (xem [Q7](#q7--dữ-liệu-cũ)).
5. **Tất cả góp ý** — thu gọn, phải bấm mới mở. Chỉ Admin.

Bộ lọc tối thiểu: trạng thái · rủi ro · phòng ban. Không thêm chart, không
thêm KPI (điều cấm 20 — không tạo KPI chỉ vì có data).

### Ghi nhận người gửi

Khi duyệt, ô **"Lời nhắn cho người gửi"** (tuỳ chọn) và thông báo mặc định
*"Cảm ơn {tên}, góp ý của bạn đã được duyệt"* thay vì thông báo khô
*"Góp ý X: Đã duyệt làm"*. Đây là cách gắn thói quen ghi nhận vào quy trình
thay vì trông chờ nhớ ra — đúng điểm Sếp Ngọc đang muốn cải thiện.

**Không** đo năng suất cá nhân người gửi (ràng buộc CTL-0003). Thống kê nếu có
chỉ theo **phòng ban** và chỉ để biết chỗ nào đang đau, không xếp hạng người.

---

## Human Cost

> **Đây là mục quan trọng nhất của spec này.** Thêm cổng duyệt mà không cân
> nhắc sẽ biến Sếp thành nút cổ chai — đúng thứ ERP sinh ra để tránh (Rule 12).

### Đo lượng việc

Chưa có số thật (không truy vấn được DB production từ phiên phân tích).
Ước lượng theo quy mô: 20 nhân sự, box mở 25/08/2026, giả định 5–15 góp ý/tuần
khi dùng đều.

### Nếu KHÔNG có ngưỡng (Sếp duyệt tất) — phương án bị loại

| Chỉ số | Con số |
|---|---|
| Số lần Sếp bấm | 5–15 lần/tuần |
| Thời gian đọc-hiểu-quyết mỗi cái | 2–5 phút |
| **Tổng gánh nặng của Sếp** | **30–75 phút/tuần** |
| Rủi ro thật | Sếp đi công tác 3 ngày → toàn bộ góp ý đứng. Nhân viên gửi 2 lần không thấy gì → **ngừng gửi**. Box góp ý chết. |

Đây chính là kịch bản REJECT theo Rule 12: tăng human effort mà không giảm
lỗi tương ứng, vì phần lớn góp ý là chuyện một màn hình.

### Phương án đề xuất — ngưỡng theo rủi ro

| `risk` | Cổng 1 (quản lý) | Cổng 2 (Sếp) | Ước lượng tỷ lệ |
|---|---|---|---|
| `LOW` | bắt buộc | **bỏ qua** | ~60% |
| `MEDIUM` | bắt buộc | bắt buộc | ~30% |
| `HIGH` | bắt buộc | bắt buộc + ghi quyết định văn bản (`cho_quyet_dinh`) | ~10% |
| chưa chốt | bắt buộc | bắt buộc (coi như MEDIUM — an toàn hơn) | — |

**Kết quả**: Sếp bấm còn **2–6 lần/tuần**, tương đương **10–25 phút/tuần**.
Việc quan trọng vẫn qua tay Sếp; việc vặt không.

### Guardrail chống lách ngưỡng

Rủi ro hiển nhiên: quản lý cấp 1 hạ `risk` xuống `LOW` để khỏi phiền Sếp.
Chặn ở backend: **quản lý cấp 1 chỉ được NÂNG `risk`, không được hạ dưới mức
`de_xuat_risk` mà AI đã chấm.** Muốn hạ → phải Owner, và ghi lịch sử.
Enforce bằng code, không bằng lời dặn.

### Duyệt hàng loạt

Panel "Chờ tôi duyệt" cho chọn nhiều → 1 nút **Duyệt các mục đã chọn**.
- Cho phép với `LOW` và `MEDIUM`.
- **Không** cho phép với `HIGH` — buộc mở từng cái vì phải ghi quyết định.

Human Cost với lô 15 việc: **3 thao tác** (mở tab → chọn tất → duyệt),
so với 45 thao tác nếu bấm từng cái. Đạt ngân sách nhóm "5–20 lần/ngày ≤ 7".

### Ngân sách thao tác (UX Performance Budget)

| Việc | Tần suất | Thao tác | Ngân sách | Đạt? |
|---|---|---|---|---|
| Quản lý duyệt 1 góp ý LOW | 5–20 lần/tuần | 1 (nút trên card) | ≤7 | ✅ |
| Sếp duyệt 1 lô MEDIUM | 1–2 lần/tuần | 3 | ≤7 | ✅ |
| Sếp xử lý 1 góp ý HIGH | ~1 lần/tuần | 5 (mở → đọc → chốt risk → ghi quyết định → duyệt) | ≤7 (hiếm dùng) | ✅ |
| Nhân viên gửi góp ý | vài lần/tháng | không đổi | — | ✅ |
| Bấm Hoàn thành | vài lần/tháng | +1 (dán link PR) | hiếm dùng | ✅ — chi phí đúng chỗ |

Chỗ **tăng** human cost duy nhất là bắt dán bằng chứng khi Hoàn thành. Chấp nhận:
đó chính là chi phí để trạng thái ngừng nói dối, và chỉ rơi vào Sếp vài lần/tháng.

---

## Acceptance Criteria

Key User (Sếp Ngọc + anh Duy) dùng đúng danh sách này để nghiệm thu:

1. Gọi thẳng API `POST /api/gop-y/trang-thai` với `{id, trang_thai:'hoan_thanh'}`
   trên một góp ý đang `moi` → **HTTP 400**, không phải chỉ ẩn nút.
2. Bấm Hoàn thành từ `san_sang_phat_hanh` mà bỏ trống link bằng chứng →
   **HTTP 400** với thông điệp tiếng Việt rõ nghĩa.
3. Nhân viên kho gửi góp ý → anh Duy (là `quan_ly_id` của người đó) thấy nó
   trong "Chờ tôi duyệt"; một nhân sự khác cùng phòng **không** thấy.
4. Anh Duy duyệt một góp ý `risk=LOW` → vào thẳng `cho_phan_tich`,
   Sếp **không** nhận yêu cầu duyệt.
5. Anh Duy duyệt một góp ý `risk=MEDIUM` → `next_owner='OWNER'`, Sếp thấy
   trong "Chờ tôi duyệt".
6. Anh Duy thử hạ `risk` từ `MEDIUM` (AI chấm) xuống `LOW` → **HTTP 403**.
7. Từ chối bỏ trống lý do → **HTTP 400**. Từ chối có lý do → người gửi nhận
   chuông và **đọc được lý do** trong chi tiết.
8. Người gửi sửa và gửi lại từ `bi_tu_choi` → về `moi`, các cột `duyet_*` reset,
   `gop_y_lich_su` **vẫn giữ đủ** dòng của lần từ chối trước.
9. Sếp duyệt vượt cấp một góp ý chưa qua quản lý → được, và chi tiết hiển thị
   rõ *"Sếp Ngọc duyệt vượt cấp"* kèm lý do.
10. Mở tab Góp ý trên điện thoại (≤430px) → **không có thanh cuộn ngang**,
    thấy card, có nút Duyệt/Từ chối chạm được.
11. Danh sách hiện mã `GY-0007`, ngày gửi, chip rủi ro, "Đang chờ: <tên người thật>".
12. Chạy migration rồi `rollback` (`lui-gopy-lichsu-tacnhan.sql` +
    `lui-gopy-congduyet.sql`) → dữ liệu góp ý và lịch sử còn nguyên,
    **đếm số dòng trước và sau bằng nhau**.
13. Sau khi dựng lại `gop_y_lich_su`: `SELECT COUNT(*)` của bảng mới **bằng**
    `gop_y_lich_su_luu_20260827`, và mọi dòng cũ có `nguoi_thuc_hien_loai='nguoi'`.
14. Thử `INSERT` một dòng lịch sử với `nguoi_thuc_hien_loai='he_thong'` **kèm**
    `nguoi_doi_id` → **`CHECK` chặn ở tầng DB**, không phải ở code.
15. SLA tự đẩy cấp sau 5 ngày → dòng lịch sử có `nguoi_doi_id IS NULL`,
    `tac_nhan='SLA'`; màn hình hiển thị *"Hệ thống tự chuyển"*, **không** hiện
    tên bất kỳ ai.
16. Góp ý #1 sau khi Sếp bấm "Mở lại" → không còn nhãn Hoàn thành, lịch sử giữ
    **cả** dòng `dang_lam → hoan_thanh` lúc 19:54:59 **lẫn** dòng mở lại.
17. Không màn hình nào cần F5 sau khi duyệt (Rule 7 — UI State Consistency).

---

## Migration

Hai file, chạy theo thứ tự:

| # | File | Nội dung | Lùi bằng |
|---|---|---|---|
| 1 | `migrations/them-gopy-lichsu-tacnhan.sql` | Dựng lại `gop_y_lich_su` bằng rename-swap (xem [BLOCKER](#blocker--gop_y_lich_su-không-ghi-được-hành-động-của-máy)) | `lui-gopy-lichsu-tacnhan.sql` — 2 lệnh rename ngược |
| 2 | `migrations/them-gopy-congduyet.sql` | 15 `ADD COLUMN` + 2 index + backfill cột mới | `lui-gopy-congduyet.sql` |

**File 1** không `DROP` gì — bảng cũ giữ nguyên dưới tên `gop_y_lich_su_luu_20260827`.
**File 2** toàn bộ là `ALTER TABLE ADD COLUMN`
+ `CREATE INDEX IF NOT EXISTS`. Không `DROP`, không `UPDATE` dữ liệu nghiệp vụ cũ.

Backfill **chỉ trên cột mới** (cột chưa từng có giá trị → không phải "sửa dữ liệu cũ"):

```sql
-- Bản ghi đang chạy dở: đặt người chờ mặc định theo trạng thái hiện tại
UPDATE gop_y SET next_owner = 'QL_CAP1',  current_owner = 'NGUOI_GUI' WHERE next_owner IS NULL AND trang_thai = 'moi';
UPDATE gop_y SET next_owner = 'OWNER',    current_owner = 'OWNER'     WHERE next_owner IS NULL AND trang_thai <> 'moi';
UPDATE gop_y SET next_owner = 'NONE',     current_owner = 'NONE'      WHERE trang_thai IN ('hoan_thanh','bi_chan');

-- Dữ liệu cũ "Hoàn thành" mà không có bằng chứng → GẮN CỜ, KHÔNG đổi trạng thái
UPDATE gop_y SET can_xac_minh_lai = 1
 WHERE trang_thai = 'hoan_thanh' AND (bang_chung_url IS NULL OR bang_chung_url = '');
```

**Rollback**: `migrations/lui/lui-gopy-congduyet.sql`. SQLite/D1 hỗ trợ
`ALTER TABLE ... DROP COLUMN` từ 3.35, nhưng an toàn hơn là **không drop**:
lùi bằng cách deploy lại code cũ (cột thừa nằm im, code cũ không đọc tới) —
đúng nguyên tắc "migration phải lùi được, không phá dữ liệu".
File `lui-` chỉ chứa lệnh reset cờ `can_xac_minh_lai = 0` và ghi chú hướng dẫn.

### Thứ tự triển khai — **DB TRƯỚC, CODE SAU** (đã ĐO, REV-0018 mục 6)

Bản trước của mục này khai "nạp `--remote` **ngay sau khi deploy code**".
**Khai ngược.** Hồ Ly dựng cả hai chiều trên SQLite thật và đo được:

| chiều làm | kết quả đo |
|---|---|
| **Nạp DB trước, deploy code sau** | Code CŨ vẫn ghi nhật ký bình thường trong khoảng giữa — không khai `nguoi_thuc_hien_loai` thì `DEFAULT 'nguoi'` + có `nguoi_doi_id` → vẫn qua `CHECK`. **Không có cửa sổ hỏng.** |
| Deploy code trước, nạp DB sau | Code mới `SELECT g.risk, g.bang_chung_url, …` trên bảng chưa có cột → `no such column: risk` → **màn hình Góp ý lỗi 500** suốt từ lúc deploy tới lúc nạp xong DB. |

**Chiều TIẾN (bắt buộc theo đúng thứ tự này):**

1. `node scripts/chay-migration.mjs them-gopy-lichsu-tacnhan.sql` — local trước, rồi `--remote`.
2. `node scripts/chay-migration.mjs them-gopy-congduyet.sql` — local trước, rồi `--remote`.
3. Xác nhận cả hai file đã có dòng trong `schema_migrations`.
4. **Rồi mới** `npm run dua-len` (deploy code).

**Chiều LÙI thì ngược lại** — code cũ trước, DB sau: deploy lại bản code cũ
(bản mới đã tắt, không còn ai đọc cột mới), **sau đó** mới chạy `lui-…`.
Deploy code cũ mà DB đã lùi trước thì mất khoảng giữa an toàn. Hai file `lui-`
đã ghi đúng chiều này — giữ nguyên.

---

## Q1–Q10 — trả lời đủ 10 câu của CTL-0003 mục 3

### Q1 — Ai là người duyệt cấp 1?
**`nhan_su.quan_ly_id` là Source of Truth**, `phong_ban.truong_phong_id` chỉ là
fallback khi cột kia NULL. Hai nguồn **có thể mâu thuẫn** (người có quản lý
trực tiếp là A nhưng trưởng phòng là B). Không được để cả hai cùng duyệt được —
vi phạm Rule 1. Chọn `quan_ly_id` vì đó chính là kênh báo cáo Sếp vừa dựng cho
kho (NV kho → anh Duy → Sếp). **Cần Sếp chốt** (câu 1).

### Q2 — Người không có quản lý trực tiếp
Cổng 1 **tự vượt qua**, ghi `duyet_cap1_nguon='KHONG_CO_QUAN_LY'`, đẩy thẳng
`next_owner='OWNER'`. **Không** chặn người gửi vì thiếu master data — nhân viên
không có lỗi. Song song gắn cảnh báo dữ liệu cho HCNS để đi gán dần.
Trường hợp chính Sếp gửi: `TU_DUYET_OWNER`, cả hai cổng tự qua, vẫn ghi 2 dòng
lịch sử để truy được.

### Q3 — Ma trận chuyển trạng thái đầy đủ
Xem bảng đầy đủ ở mục [Permissions](#permissions). Viết đúng khuôn
`CHUYEN_HOP_LE` của `cong_viec` (`src/index.js:1956`): mỗi đích khai `tu:` và
`ai:`, cộng thêm cột "điều kiện bắt buộc" cho các trạng thái cần bằng chứng.

### Q4 — Điều kiện vào `hoan_thanh`
- **Bằng chứng bắt buộc**: `bang_chung_url` = link Pull Request hoặc commit **đã merge**.
  Cột riêng, **không** dùng chung `spec_reference` (spec là "sẽ làm gì",
  bằng chứng là "đã làm xong" — hai sự thật khác nhau, Rule 1).
- **Chặn cứng ở backend**, HTTP 400, không phải cảnh báo. *(ADR-0006 B2 chốt:
  bắt buộc, thiếu link là không bấm được. "Nhắc suông sẽ bị bỏ qua".)*
- **Ai bấm** *(ADR-0006 A2 — Sếp đã chốt)*: **ERP Owner hoặc chính người đã
  gửi góp ý đó**. Người gửi là người dùng thử và biết rõ nhất đã hết vướng chưa.
- **Người làm KHÔNG được tự bấm "Hoàn thành"** — kể cả khi người làm tình cờ
  cũng là người gửi ở một góp ý khác. Kiểm bằng `gop_y.nguoi_gui_id`, không
  kiểm bằng vai trò. Đây là chốt chặn cho đúng lỗi đã xảy ra: góp ý #1 đi từ
  "đang làm" sang "hoàn thành" trong **12 giây**.
- **Trường hợp người gửi đã nghỉ việc** (`nhan_su.trang_thai` khác đang làm):
  chỉ còn ERP Owner bấm được. Không tự chuyển quyền xác nhận cho người khác —
  người không dùng thử thì không xác nhận thay được (Rule 9).

### Q5 — Từ chối ở cấp 1
Về `bi_tu_choi` (trạng thái mới), bắt buộc `ly_do_tu_choi`. Người gửi:
nhận chuông, mở chi tiết **đọc được lý do bằng lời**, có nút **"Sửa và gửi lại"**
→ về `moi`, reset các cột duyệt, `so_lan_gui_lai += 1`, lịch sử giữ nguyên
dòng từ chối cũ. Từ lần gửi lại thứ 3 trở đi thì `next_owner='OWNER'` để cắt
giằng co giữa nhân viên và quản lý.

### Q6 — Sếp vượt cấp
**Có.** Thực tế quản lý nghỉ/đi vắng mà việc gấp thì phải đi tiếp được.
Ghi vết: `duyet_cap1_boi_id` = id Sếp, `duyet_cap1_nguon='OWNER_VUOT_CAP'`,
**bắt buộc `ghi_chu`**, cộng 1 dòng `gop_y_lich_su`. Chi tiết góp ý hiển thị
rõ dòng *"Sếp Ngọc duyệt vượt cấp — lý do: ..."*. Không có đường duyệt im lặng.

### Q7 — Dữ liệu cũ
**Nguyên tắc: migration KHÔNG tự sửa trạng thái nghiệp vụ cũ.** Thay vào đó:

- Mọi bản ghi `hoan_thanh` không có `bang_chung_url` → gắn cờ `can_xac_minh_lai=1`.
- UI hiện nhãn **"Hoàn thành (chưa có bằng chứng — cần xác minh lại)"**, màu xám
  chứ không phải xanh. Trạng thái thôi nói dối ngay cả trước khi Sếp soát xong.
- Panel **"Cần xác minh lại"** cho Admin, mỗi dòng 2 nút:
  **"Đúng là đã xong"** (dán bằng chứng, gỡ cờ) / **"Mở lại"** (về `da_duyet`).
- Bản ghi ở trạng thái không hợp lệ theo luật mới (nếu có) → **giữ nguyên**,
  luật mới chỉ áp cho các lần chuyển **từ nay trở đi**. Không hồi tố.

**Riêng góp ý #1** — cái mang nhãn "Hoàn thành" sau 12 giây:

Nội dung thật của nó là **dán ảnh vào ô góp ý**, và Khỉ Đột **đang build thật**
trên nhánh `feature/gopy-paste-anh`. Nghĩa là: yêu cầu có thật, đúng đắn,
chỉ có **nhãn trạng thái** là sai. Xử lý:

1. Gắn `can_xac_minh_lai=1` như mọi bản ghi khác — không tạo ngoại lệ thủ công,
   không ai phải nhớ ra nó.
2. Sếp bấm **"Mở lại"** → `hoan_thanh → dang_lam` (không phải `da_duyet`, vì
   thực tế đang có người làm), ghi `gop_y_lich_su` với `ghi_chu` nguyên văn:
   *"Nhãn Hoàn thành lúc 19:54:59 ngày 26/08 là sai sự thật — 12 giây sau khi
   chuyển sang Đang làm, chưa có commit nào. Mở lại theo CTL-0003."*
3. Đặt `nguoi_phu_trach_id` = Khỉ Đột đang build thay ai, và
   `handoff_reference` = nhánh `feature/gopy-paste-anh`.
4. Khi PR dán ảnh được Sếp merge thật → đi đúng đường
   `dang_kiem_tra → cho_nghiem_thu → san_sang_phat_hanh → hoan_thanh`
   với `bang_chung_url` = link PR đó.

Kết quả: bản ghi từng nói dối trở thành **ca kiểm thử đầu tiên** của chính luật
mới — và lần này nó sẽ mất đúng số ngày mà một tính năng thật cần, không phải
12 giây. Lịch sử giữ đủ cả dòng sai lẫn dòng sửa.

> **Không đụng vùng code của việc dán ảnh.** Ở đây chỉ đổi *trạng thái* của
> bản ghi #1, không đổi form, không đổi `dinh_kem`, không đổi `gopYGui()`.

Đường `hoan_thanh → dang_lam`/`da_duyet` là ngoại lệ **chỉ Owner** được đi,
và **chỉ khi** `can_xac_minh_lai=1`. **Cần Sếp chốt** (câu 7).

### Q8 — Human Cost
Xem đầy đủ ở mục [Human Cost](#human-cost). Tóm tắt: có ngưỡng theo rủi ro
(LOW bỏ qua cổng Sếp), có duyệt hàng loạt, có SLA tự đẩy lên khi quản lý im
lặng, có guardrail chặn hạ risk để lách cổng. Sếp bấm **2–6 lần/tuần**
(~10–25 phút) thay vì 5–15 lần (~30–75 phút).

### Q9 — Thiết kế lại danh sách
Xem [UX](#ux). Desktop **7 cột** (bỏ "Cấp duyệt hiện tại" vì trùng nghĩa với
"Đang chờ ai", thay bằng tick `✓QL ✓Sếp` trong ô Trạng thái).
Mobile **bỏ bảng, dùng card** — 7 cột không vừa 430px, và người duyệt chính
(anh Duy) duyệt trên điện thoại.

### Q10 — Exception-First
Màn hình mở ra mặc định là **"Chờ tôi duyệt"**, không phải toàn bộ danh sách.
Panel rỗng thì ẩn hẳn. Thứ tự panel và bộ lọc: xem [UX](#ux).

---

## Risk

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Sếp thành nút cổ chai, box góp ý chết | **CAO** | Ngưỡng risk LOW bỏ qua cổng Sếp; duyệt hàng loạt; SLA tự đẩy |
| Quản lý hạ `risk` để lách cổng Sếp | TRUNG BÌNH | Backend chỉ cho nâng, không cho hạ |
| Góp ý mắc kẹt ở quản lý không bao giờ duyệt | TRUNG BÌNH | SLA 3 ngày nhắc, 5 ngày tự đẩy lên Owner |
| `quan_ly_id` chưa gán đủ trong dữ liệu thật | **CAO** | Fallback `truong_phong_id` → fallback Owner; cảnh báo cho HCNS; **cần kiểm kê trước khi bật** |
| Nhân viên thấy thêm cổng thì ngại gửi | TRUNG BÌNH | Form gửi **không đổi một chữ**; thêm thông báo cảm ơn khi được duyệt |
| SPEC-0003 đụng cùng hàm `gopYDoiTrangThai` | **CAO** | Đã đặt trước vùng trong `ACTIVE-WORK.md`; cột DB thiết kế một lần; SPEC-0003 Đợt A không chạm `gop_y` |
| Dựng lại bảng audit `gop_y_lich_su` | TRUNG BÌNH | Bảng 2 ngày tuổi, rất ít dòng, là bảng lá; rename-swap **không `DROP`**; bản cũ giữ nguyên; lùi bằng 2 lệnh; `CHECK` ép đúng ở tầng DB |
| Khỉ Đột đang sửa form góp ý song song | TRUNG BÌNH | Hai vùng tách bạch (form/`dinh_kem` vs danh sách/trạng thái); đã ghi rõ ranh giới trong `ACTIVE-WORK.md` và mục Ngoài phạm vi |
| Đổi luồng đang chạy thật cho 20 người | **CAO** | Rollout PILOT (xem dưới) |

---

## Rollback

1. **Code**: revert commit → deploy lại. Cột thừa nằm im, code cũ không đọc tới.
2. **DB — cột**: không cần drop cột. Nếu buộc phải, `lui-gopy-congduyet.sql` chỉ
   reset `can_xac_minh_lai = 0`.
3. **DB — bảng lịch sử**: `lui-gopy-lichsu-tacnhan.sql` đổi tên ngược hai bảng
   (`gop_y_lich_su` → `gop_y_lich_su_v2`, `gop_y_lich_su_luu_20260827` →
   `gop_y_lich_su`). Bản cũ chưa từng bị xoá nên lùi là **mất 0 dòng dữ liệu**.
   Các dòng máy ghi trong thời gian chạy bản mới vẫn nằm trong `_v2`, không mất.
4. **Dữ liệu nghiệp vụ**: không mất gì — migration không `UPDATE` cột cũ nào.
5. **Van xả nhanh** (không cần revert): thêm hằng `CONG_DUYET_BAT = true/false`
   trong `src/index.js`; đặt `false` → ma trận chuyển vẫn chạy (chống nói dối
   trạng thái) nhưng **hai cổng duyệt tự vượt**. Tách được "chống nói dối" khỏi
   "phân cấp duyệt", lùi từng nửa một.

---

## Rollout

**Go-Live Level: `PILOT` trước, không `OFFICIAL` ngay.**

| Đợt | Nội dung | Điều kiện qua đợt sau |
|---|---|---|
| 0 — Chuẩn bị dữ liệu | HCNS rà `nhan_su.quan_ly_id` + `phong_ban.truong_phong_id`. **Không bật cổng khi còn nhiều NULL** | ≥90% nhân sự đang làm có quản lý cấp 1 xác định được |
| 1 — Chống nói dối | Dựng lại `gop_y_lich_su` (rename-swap) + ma trận chuyển + bằng chứng vào `hoan_thanh` + cờ `can_xac_minh_lai`. `CONG_DUYET_BAT=false`. Sếp soát danh sách "Cần xác minh lại", mở lại góp ý #1 | Chạy 1 tuần, không ai kêu bị chặn oan; số dòng lịch sử khớp trước/sau |
| 2 — PILOT cổng duyệt | Bật `CONG_DUYET_BAT=true` cho **riêng phòng Kho Vận** (anh Duy duyệt) | Anh Duy duyệt trên điện thoại được, ≤2 phút/việc, không việc nào kẹt >3 ngày |
| 3 — OFFICIAL | Bật toàn công ty | |
| 4 | Bàn giao vùng `gop_y` cho SPEC-0003 Đợt B | SPEC-0002 đã merge vào `main` |

Đợt 2 chọn Kho Vận vì đó chính là ví dụ Sếp nêu (*"nv kho đề xuất sửa, quản lý
kho duyệt"*) và là phòng đông nhất — thử ở chỗ đau nhất, không thử ở chỗ dễ.

---

## Boundary Classification

`CROSS_DOMAIN` + `CORE_CHANGE` → **STOP FOR ERP OWNER**. Không tự triển khai.

Lý do là `CORE_CHANGE`: đổi ngữ nghĩa quyền (`laAdmin` không còn là "làm được
mọi thứ" với `gop_y`), mở quyền xem dữ liệu cho một nhóm mới (quản lý cấp 1),
và biến `nhan_su.quan_ly_id` từ trường tham khảo thành trường **có hiệu lực
phân quyền** — thay đổi đó ảnh hưởng mọi phòng ban.

---

## Chín câu — đã chốt

> **Không còn câu nào chờ Sếp.** Cả 9 câu đã có đáp án trong
> [ADR-0006](../decisions/ADR-0006-cong-duyet-va-chi-phi-token.md):
> Sếp quyết 4 câu (3 câu thuộc spec này + 1 câu chi phí thuộc SPEC-0003),
> Gạo quyết 10 câu theo `TEAM-LEAD-PROTOCOL.md` mục 5.
>
> **Cả 9 đáp án đều trùng khuyến nghị của tôi.** Ghi lại ở đây để Khỉ Đột
> không phải mở ADR ra tra, và để không ai mở lại tranh luận.

| # | Câu hỏi | **Đã chốt** | Ai quyết | Ràng buộc kèm theo |
|---|---|---|---|---|
| 1 | Ai là người duyệt "cấp 1"? | Quản lý trực tiếp (`nhan_su.quan_ly_id`); ai chưa có thì lấy trưởng phòng (`phong_ban.truong_phong_id`) | Gạo **B1** | Có đường lui, không chết khi dữ liệu trống. Cả hai đều NULL → `next_owner='OWNER'`, không được im lặng nuốt việc |
| 2 | Góp ý nhỏ có cần Sếp duyệt? | **Không.** `LOW` chỉ cần quản lý trực tiếp gật. `MEDIUM` và `HIGH` mới lên Sếp | **Sếp — A1** | Sếp vẫn xem được tất cả và can thiệp bất cứ lúc nào. Lý do: Rule 12 (Human Cost) — tránh biến Sếp thành nút cổ chai |
| 3 | Ai được bấm "Hoàn thành"? | **Sếp hoặc chính người gửi góp ý đó.** Người làm **KHÔNG** được tự bấm | **Sếp — A2** | Kiểm bằng `gop_y.nguoi_gui_id`, không kiểm bằng vai trò. Xem [Q4](#q4--điều-kiện-vào-hoan_thanh) |
| 4 | Bắt buộc link bằng chứng khi bấm Hoàn thành? | **Bắt buộc.** Thiếu link thì không bấm được | Gạo **B2** | Chặn cứng backend HTTP 400. *"Nhắc suông sẽ bị bỏ qua"* |
| 5 | Quản lý im lặng bao lâu thì tự lên Sếp? | **5 ngày**, nhắc lại ở ngày thứ **3** | Gạo **B3** | Đủ để quản lý bận vẫn kịp; không để việc chết chìm |
| 6 | Sếp duyệt vượt cấp? | **Được**, phải ghi lý do | Gạo **B4** | `duyet_cap1_nguon='OWNER_VUOT_CAP'` + bắt buộc `ghi_chu`. Không có đường duyệt im lặng |
| 7 | Góp ý cũ mang nhãn "Hoàn thành" đáng ngờ? | Gắn cờ **"cần xác minh"**, Sếp soát | Gạo **B5** | Cả hệ thống mới có **1** góp ý và đã biết rõ sự thật — rẻ. Không tự động mở lại hàng loạt |
| 8 | Quản lý được hạ mức rủi ro máy chấm? | **Không.** Chỉ được **nâng** | Gạo **B6** | Hạ mức là đường tắt lách cổng duyệt của Sếp |
| 9 | Nhật ký góp ý ghi tên ai khi **máy** làm? | **Dựng lại sổ nhật ký** bằng rename-swap, **không `DROP`**. Bảng cũ giữ nguyên tên `gop_y_lich_su_luu_20260827` làm bản lưu | **Sếp — A3** | Bác bỏ phương án "nhân viên ảo": hồ sơ giả sẽ lọt vào Danh bạ, Chấm công, đếm đầu người, bảng lương — Rule 9. Xem [Phương án C](#phương-án-c--dựng-lại-không-drop-lùi-được-bằng-2-lệnh) |

**Câu 9 đã hết chặn SPEC-0003.** Migration `them-gopy-lichsu-tacnhan.sql` là
việc **làm trước tiên** trong toàn bộ chuỗi (ADR-0006 mục D.1) vì nó chặn mọi
thứ khác.

---

## Điều kiện tiên quyết — dữ liệu quản lý trực tiếp

> ADR-0006 mục C. **Đây là việc chặn, không phải việc phụ.**

Cổng duyệt cấp 1 dựa **hoàn toàn** vào `nhan_su.quan_ly_id`. Trống thì cổng
không chạy — và tệ hơn: nó chạy nhưng dồn hết về Sếp, đúng thứ A1 muốn tránh.

Giao **HCNS (Vũ Lan Hương)**. Đầu ra cụ thể theo tinh thần MBOs — đây là đầu ra,
không phải mô tả hoạt động:

> **"100% nhân sự đang làm việc có trường quản lý trực tiếp được điền và
> trưởng bộ phận xác nhận đúng."**

Không phải *"rà soát hồ sơ nhân sự"* — câu đó không nghiệm thu được.

**Cách kiểm, chạy được ngay, không cần chờ code:**

```sql
SELECT COUNT(*) FROM nhan_su
 WHERE trang_thai = 'dang_lam' AND (quan_ly_id IS NULL OR quan_ly_id = '');
```

Bằng **0** là đạt. Đợt 0 của [Rollout](#rollout) cho qua ở mức ≥90%, nhưng
đích cuối là 0.

**Gợi ý cho Sếp khi giao việc này** (Sếp Ngọc đang rèn thói quen ghi nhận):
Lan Hương chưa có kinh nghiệm và đây đúng là kiểu việc Sếp hay vướng ở khâu
giao cho rõ đầu ra. Việc này **có sẵn thước đo là một con số** — hiếm khi có
việc HCNS nào dễ nghiệm thu như vậy. Chốt con số đó ở buổi check-in
**thứ 4, 15h**, và khi về 0 thì **nói ra lời khen** — có thể dùng luôn
chức năng Vinh danh trong ERP. Một việc chặn cả hệ thống mà làm xong đúng hạn
thì xứng đáng được nêu tên, không nên trôi đi im lặng.
