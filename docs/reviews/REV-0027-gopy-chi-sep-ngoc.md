# REV-0027 — Góp ý ERP: chỉ Sếp Ngọc duyệt cấp cuối

HỒ LY · 2026-08-28 · `feature/gopy-chi-sep-ngoc` `2e5084d` (tách từ `main` `f53c568`). Đo bằng bàn thử D1 thật + 2
script tự viết, không dùng lại phép đo của Khỉ Đột. Chi phí 0.

## **FIX_REQUIRED** — 5 lỗi chặn phát hành

| # | Lỗi | Mức | Chặn |
|---|---|---|---|
| L1 | Cửa sau `bi_chan` từ `moi`/`cho_quyet_dinh` — admin đóng băng việc đang chờ Sếp (từ chối trá hình) | CAO | **CÓ** |
| L2 | "Lưu tại chỗ" đặt lại `next_owner` → huỷ SLA đẩy-lên-Sếp và gửi-lại-lần-3, không có đường về `OWNER` | CAO | **CÓ** |
| L3 | `khoa-tai-khoan`/`xoa-tai-khoan` đi vòng guard "không tắt cờ cuối cùng" → 0 người duyệt | CAO | **CÓ** |
| L4 | `docPhien()` đọc `t.duyet_gopy` không phòng thủ → thiếu cột = 500 toàn hệ thống (cả chiều lùi) | CAO | **CÓ** |
| L5 | Backfill không có chốt tự kiểm "đúng 1 tài khoản"; `0911994696` không có nguồn đối chiếu trong repo | CAO | **CÓ** |
| L6 | Đường cứu tầng DB chỉ nằm trong chú thích migration, không có trong ADR-0015 | T.BÌNH | không |
| L7 | `--ok/--warn/--danger` toàn cục vẫn <4.5:1 ở ~28 chỗ (bảng góp ý trên máy tính) | THẤP | không |
| L8 | Cổng duyệt SPEC-0002 chưa từng được đo trên lược đồ thật trước hôm nay | GHI NHẬN | không |

## CÂU 0 — Lời khai "bàn thử hỏng" ĐÚNG, và nặng hơn nó tự khai

So với **oracle tĩnh** (đọc thẳng `CREATE TABLE`/`ADD COLUMN` trong văn bản SQL, không phụ thuộc thứ tự sắp xếp nào):

| Bản dựng | Bảng thiếu | Bảng thừa | Cột `gop_y` thiếu | Câu SQL còn lỗi |
|---|---|---|---|---|
| `dungDB()` CŨ trên cây `f53c568` | 2 (`gop_y_lich_su`, `..._luu_20260827`) | 2 | **13** | 8 |
| `dungDB()` CŨ trên cây `2e5084d` | 2 | 4 | **16** | 9 |
| `dungDB()` MỚI (đã vá) | **0** | **0** | **0** | **0** |

Nó khai "15 cột" — thật ra **13** trên nền cũ, **16** khi có migration của chính nó; và mất **2 bảng**, đẻ thêm **2–4
bảng lưu-lùi** không có trên bản thật. Gốc đúng như nó nói: `'lui' < 'them'`, câu file lùi rơi vào hàng đợi gỡ phụ
thuộc rồi **chạy lại sau** khi file xuôi đã tạo bảng → `DROP COLUMN` chạy thật. **Vá thật hay chỉ vá ca của nó?** Vá
thật: áp logic mới lên **cây cũ `f53c568`** (không có migration mới) cũng ra 0/0/0 — vá đúng gốc.

**Bản soi nào lung lay?** Hư hỏng chỉ chạm `gop_y` + 2 bảng `gop_y_lich_su*`;
`cong_viec`/`thong_bao`/`nhan_su`/`tai_khoan` dựng ra **đủ 100% cột** → **REV-0019 và REV-0022 (nhắc việc) KHÔNG lung
lay, không phải đo lại**, hai script của chúng chỉ đọc các bảng còn nguyên. Nhưng **không bàn đo nào chạm `gop_y`
trước hôm nay**: 16 cột cổng duyệt + bảng nhật ký góp ý của **SPEC-0002 (REV-0018) chưa bao giờ chạy qua SQLite thật**
— không phải kết luận sai, là kết luận **chưa có bằng chứng** (L8).

## CÂU 1 — **THỦNG 2/16 đường**

14 đường chặn đúng (`/duyet` cổng OWNER, duyệt/từ chối vượt cấp, duyệt hàng loạt, `cho_quyet_dinh→cho_phan_tich`,
`da_huy` ở cổng, `→da_duyet`, hoàn tác hộ, tự bật cờ, thu cờ của Sếp, nhồi `next_owner` từ client, gán người phụ
trách…). **CỬA 3 — `bi_chan` ngay tại cổng duyệt (HTTP 200):** `CHUYEN_HOP_LE.bi_chan = { tu: dangChay, ai: laOwner
}`, mà `dangChay` chứa cả `'moi'` lẫn `'cho_quyet_dinh'`. Anh Phong bấm "Chặn" trên việc đang chờ Sếp → biến khỏi
panel "Chờ tôi duyệt" vô thời hạn (đo: 2 cú bấm rút 2/5 việc khỏi hàng chờ). **Cùng loại với `da_huy` mà Khỉ Đột đã
bịt, chỉ khác tên.** Nhẹ hơn vì có ghi chú bắt buộc + dòng lịch sử, Sếp gỡ lại được (200) — nhưng Sếp phải **biết**
mới gỡ.

**CỬA 4 — "lưu tại chỗ" đặt lại `next_owner`.** Nhánh `trangThaiMoi === g.trang_thai` (giao người phụ trách / dán bằng
chứng) vẫn ghi `current_owner`/`next_owner` lấy từ `GOPY_OWNER_THEO_TT`; với `'moi'` là `['NGUOI_GUI','QL_CAP1']`. Đo
được: việc đã **SLA tự đẩy lên Sếp ngày thứ 5** và việc **gửi lại lần 3** đều tụt về `QL_CAP1` khi anh Phong chỉ giao
người phụ trách — **200, không cảnh báo gì**, và **không có đường nào trong giao diện đưa lại về `OWNER`**. Lỗi có sẵn
từ trước, nhưng quyết định 28/08 làm nó thành lỗ hổng quyền: nó vô hiệu hoá đúng cơ chế ADR-0015 kê làm chỗ đỡ cho
"một người duyệt", và nổ **cả khi không ai cố ý**.

## CÂU 2 — Guard đúng, nhưng **đi vòng được**

"Chỉ người giữ cờ mới cấp/thu cờ" chạy đúng; "không tắt cờ cuối cùng" trả 409 đúng. Nhưng `khoa-tai-khoan` — anh Phong
khoá tài khoản Sếp: **200**, `duyet_gopy` vẫn `=1` nhưng `kich_hoat=0` → còn **0** tài khoản hoạt-động giữ cờ; Sếp gọi
API **401**, không uỷ quyền cho ai được nữa, **cả hàng góp ý đứng**. `xoa-tai-khoan`: **200**, còn **0** dòng mang cờ
trong toàn DB. Người bị lấy quyền duyệt vẫn tắt được người duyệt. **Mất điện thoại / nghỉ dài:** có đường cứu tầng DB,
nhưng chỉ ở chú thích cuối `migrations/them-quyen-duyet-gopy.sql` (`UPDATE tai_khoan SET duyet_gopy = 1 WHERE
ten_dang_nhap = '<số của Sếp>'`). **ADR-0015 không nhắc một chữ** — đường cứu giấu trong comment migration = coi như
không có (L6).

## CÂU 3 — Không cắt quá tay: **ĐẠT, sạch**

Cùng một góp ý (id 3, rủi ro CAO), `GET /api/gop-y`: **40/40 khoá**, không thiếu, không thừa, **giá trị giống hệt ở cả
40 khoá** (kể cả `risk`, `bang_chung_url`, `de_xuat_*`). 6/6 góp ý; `la_admin: true`, `duyet_gopy: false`;
`/api/gop-y/lich-su` → 200; `/api/toi-la-ai` **24/24 khoá**, chỉ khác đúng `duyet_gopy` (+ danh tính). Panel "Quá hạn
duyệt" cố ý giữ cho admin (`laAd`, không phải `coDuyet`) — đúng. Đối chứng ngược: HCNS vẫn **không** thấy ruột nội bộ.

## CÂU 4 — Rủi ro có thật, và **vá được**

Thiếu cột `duyet_gopy`, gọi bằng phiên **nhân viên kho** (chẳng dính góp ý): `/api/toi-la-ai` · `/api/danh-ba` ·
`/api/thong-bao` · `/api/kho/san-pham` — **cả bốn 500**. Lời khai "MẤT ĐĂNG NHẬP TOÀN HỆ THỐNG" **đúng nguyên văn**.
Chiều an toàn (DB trước, code sau) → 200; **chiều lùi nổ y hệt**. Bản vá đã dựng và đo: gói SELECT của `docPhien()`
vào `try/catch`, bắt đúng `no such column: t.duyet_gopy` thì chạy lại với `0 AS duyet_gopy` — bản hiện tại `nv 500/Sếp
500` khi thiếu cột, **bản vá `nv 200/Sếp 200`, cờ `false`**: hỏng theo chiều **an toàn** (đúng khuôn `KHONG_QUYEN`)
thay vì sập cả công ty. ~12 dòng, và là bản vá đáng giá nhất của cả vòng — thứ tự triển khai dựa vào trí nhớ người là
thứ sẽ sai một ngày nào đó.

## CÂU 5 — Điện thoại: **ĐẠT**

`getBoundingClientRect()` thật ở 375px (không khớp chuỗi CSS): Duyệt 40→**44×127.9** · Xem/Chưa duyệt 48→**52×196.1**
· Hoàn tác 40→**44×332** · Duyệt lô 28→**44×156.1** · Ô chọn 18→**44×44**. Không tràn ngang; ca đối chứng bắt được
4/5. Tương phản đúng số nó khai: `ok` 3.15→**5.46** · `warn` 2.82→**5.93** · `danger` 4.33→**6.44**, chữ chip 11.5px,
vượt 4.5:1. **Số chạm để duyệt xong một góp ý từ lúc mở app (đã đăng nhập): 3 chạm** — ☰ → "Góp ý ERP" → "Duyệt";
không hộp thoại, không cuộn bắt buộc, danh sách tự tải lại. **Hoàn tác: +1 chạm**, đúng người (người khác bấm hộ →
403, kể cả admin), đúng lúc (múi giờ `+7h` đúng cả hai đầu), **không xoá dòng lịch sử nào**. `hoan_tac_json` **không
rò ra JSON** — máy chủ `delete` hẳn 3 cột thô, chỉ trả boolean.

## Các mục còn lại

- **Migration chỉ THÊM VÀO:** đạt (4 `ADD COLUMN` + 1 index + 2 `UPDATE` **chỉ trên cột mới**).
  **File lùi cất giá trị cũ:** đạt — 2 bảng `*_luu_lui` kèm `lui_luc`, bỏ index trước rồi mới
  `DROP COLUMN`, gỡ chốt `schema_migrations` nên lùi-rồi-tiến-lại được (đo: 2 vòng, 0 lỗi).
- **Backfill hụt số (L5):** `'0911994696'` **không xuất hiện ở đâu khác trong repo**. Có đường
  lui theo `ho_ten`, nhưng **cả hai trượt** thì 0 tài khoản mang cờ → không ai duyệt được **và**
  không ai cấp cờ được, migration **không tự bắt**; nguy hơn nữa là số đó nay của **người khác**
  thì cờ rơi vào tay người khác mà không ai biết.
- **Đè màu chữ trong `.gy-the` (L7):** **đúng, không phải né việc** — ở ≤720px bảng bị ẩn
  (`.gy-chi-may`) nên **toàn bộ đường duyệt trên điện thoại của Sếp nằm trong `.gy-the`**, đã vá.
  Token toàn cục còn <4.5:1 ở ~28 chỗ khác, nhưng đó là địa phận CTL-0023.

## Việc phải làm trước khi phát hành

1. **L1** — `bi_chan` đòi `laDuyetCuoi` khi `dangOCongDuyet`, y hệt cách đã làm cho `da_huy`.
2. **L2** — nhánh "lưu tại chỗ" **không được** ghi `current_owner`/`next_owner`; giữ nguyên
   giá trị đang có thay vì tính lại từ `GOPY_OWNER_THEO_TT`.
3. **L3** — bê guard 409 sang `qtKhoaTaiKhoan`/`qtXoaTaiKhoan`: cấm khoá/xoá tài khoản là
   **người duy nhất** còn `duyet_gopy = 1 AND kich_hoat = 1`.
4. **L4** — vá đọc phòng thủ trong `docPhien()` (mẫu ở CÂU 4). Vẫn **giữ** DB-trước-code-sau.
5. **L5** — bước **bắt buộc** sau migration: `SELECT t.ten_dang_nhap, n.ho_ten FROM tai_khoan t
   JOIN nhan_su n ON n.id = t.nhan_su_id WHERE t.duyet_gopy = 1` **phải ra đúng 1 dòng đúng tên
   Sếp** mới được deploy code. **L6** — chép đường cứu tầng DB vào ADR-0015 mục "Hệ quả".
6. Bổ sung ca đối chứng cho L1/L2/L3 vào `do-quyen-duyet-gopy.mjs` — bàn đo hiện tại (45 ĐẠT /
   0 TRƯỢT, 4/4 đối chứng) **không bắt được** ba lỗi này.
