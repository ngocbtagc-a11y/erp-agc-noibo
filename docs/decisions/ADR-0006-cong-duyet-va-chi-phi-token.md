# ADR-0006 — Cổng duyệt góp ý, sổ nhật ký cho máy, và mô hình chi phí

- **Ngày**: 2026-08-27
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc (4 câu) + GẠO Team Lead (10 câu)
- **Trạng thái**: ĐÃ DUYỆT
- **Liên quan**: SPEC-0002 · SPEC-0003 · [ADR-0005](ADR-0005-vong-lap-khep-kin-github-actions.md) (**sửa một phần**)

Hồ Ly đưa lên 14 câu. Gạo lọc: 4 câu thuộc quyền Sếp (business policy · tiền ·
thay đổi sổ audit), 10 câu Gạo tự quyết theo `TEAM-LEAD-PROTOCOL.md` mục 5.

---

## A. Bốn quyết định của ERP Owner

### A1. Rủi ro THẤP — quản lý trực tiếp duyệt là đủ

Góp ý rủi ro `LOW` chỉ cần quản lý trực tiếp gật. `MEDIUM` và `HIGH` mới lên Sếp.
Sếp vẫn xem được tất cả và can thiệp bất cứ lúc nào.

*Lý do:* tránh biến Sếp thành nút cổ chai — Hiến pháp Rule 12 (Human Cost).

### A2. Bấm "Hoàn thành": Sếp **hoặc chính người gửi góp ý**

Người gửi dùng thử thấy được việc thì tự xác nhận xong — họ biết rõ nhất đã
giải quyết chưa. Sếp vẫn bấm được.

**Người làm KHÔNG được tự bấm "Hoàn thành".** Đây là chốt chặn cho đúng lỗi
đã xảy ra: góp ý #1 đi từ "đang làm" sang "hoàn thành" trong **12 giây**.

### A3. Sổ nhật ký góp ý — đồng ý dựng lại

Chấp thuận phương án Hồ Ly: rename-swap, **không `DROP`**. Bảng cũ đổi tên
thành `gop_y_lich_su_luu_20260827` giữ nguyên làm bản lưu, không mất dòng nào,
lùi lại bằng 2 lệnh rename ngược.

Bảng mới tách **ba sự thật** đang bị gộp làm một:
`nguoi_doi_id` (ai bấm — NULL nếu máy) · `tac_nhan` (cái gì chạy) ·
`uy_quyen_boi_id` (ai chịu trách nhiệm), có `CHECK` ép ở tầng DB nên
**không thể mạo danh kể cả khi code viết sai**.

*Bác bỏ phương án "nhân viên ảo"*: hồ sơ giả sẽ lọt vào Danh bạ, Chấm công,
đếm đầu người, bảng lương — Rule 9 (No Unverified Data Becomes Truth).

### A4. Chi phí — **KHÔNG mua thêm token. Sửa ADR-0005.**

> Nguyên văn Sếp: *"tài khoản này đã mua max rồi, nếu dùng hết token thì dừng
> chờ phiên tiếp theo, ko tự ý mua thêm"*

**Đây là thay đổi kiến trúc, không phải chỉnh con số.**

ADR-0005 giả định dùng `ANTHROPIC_API_KEY` trả tiền theo lượng dùng (~2 triệu/tháng).
**Giả định đó bị bãi bỏ.** Vòng lặp phải chạy bằng **gói Claude Max công ty đã
trả rồi**, không phát sinh thêm một đồng nào.

Ràng buộc bắt buộc:

1. **Cấm dùng khoá API tính tiền theo lượng dùng.** Runner xác thực bằng
   thông tin đăng nhập của gói thuê bao sẵn có.
2. **Hết token trong phiên → `PAUSED`, chờ phiên kế tiếp rồi chạy tiếp.**
   Không mua thêm. Không tự nâng gói. Không đổi sang khoá tính tiền.
3. **Không mất việc nào khi hết token.** Việc đang dở giữ nguyên trạng thái,
   ghi rõ "đang chờ phiên token kế tiếp", tự chạy lại khi có token.
4. Mọi việc chạm tới tiền đều là `NEEDS_OWNER_DECISION`. Không Agent nào —
   kể cả Gạo — được tự quyết chi tiêu.

*Hệ quả cần Hồ Ly xử lý trong SPEC-0003:* phải xác minh GitHub Actions chạy
được bằng thông tin gói thuê bao. **Nếu không được**, kiến trúc quay lại
phương án chạy trên máy Sếp (Cách B trong CTL-0002) — vì tiêu chí "không tốn
thêm tiền" nay cao hơn tiêu chí "máy không cần bật". Xác minh trước, đừng đoán.

---

## B. Mười quyết định của GẠO

Theo `TEAM-LEAD-PROTOCOL.md` mục 5 — Gạo tự gỡ blocker dạng định tuyến, thứ tự,
mặc định vận hành. Sếp lật lại bất cứ câu nào cũng được.

| # | Việc | Quyết định | Vì sao |
|---|---|---|---|
| B1 | Ai là người duyệt cấp 1 | Quản lý trực tiếp (`nhan_su.quan_ly_id`); ai chưa có thì lấy trưởng phòng (`phong_ban.truong_phong_id`) | Có đường lui, không chết khi dữ liệu trống |
| B2 | Bắt buộc bằng chứng khi bấm "Hoàn thành" | **Bắt buộc.** Thiếu link bằng chứng thì không bấm được | Chính là thứ Sếp đòi. Nhắc suông sẽ bị bỏ qua |
| B3 | Quản lý im lặng bao lâu thì tự lên Sếp | **5 ngày**, nhắc lại ngày thứ 3 | Đủ để quản lý bận vẫn kịp; không để việc chết chìm |
| B4 | Sếp duyệt vượt cấp | **Được**, phải ghi lý do | Sếp là Owner. Ghi lý do để sau còn truy được |
| B5 | Góp ý cũ mang nhãn "Hoàn thành" đáng ngờ | Gắn cờ "cần xác minh", Sếp soát | Cả hệ thống mới có **1** góp ý và đã biết rõ sự thật — rẻ |
| B6 | Quản lý có được hạ mức rủi ro máy chấm | **Không.** Chỉ được nâng | Hạ mức là đường tắt lách cổng duyệt |
| B7 | Mở tự động ở mức nào trước | Từng bước: viết đặc tả rồi dừng → lỗi nhỏ → đủ tới Pull Request. **Không nhảy cóc** | Hiến pháp điều 18 |
| B8 | Rủi ro "vừa" có vào vòng tự động | **Chưa.** Chỉ `LOW` cho 3 việc đầu | Đo thật rồi mới mở rộng |
| B9 | Tạo 2 bảng mới (cài đặt + nhật ký máy chạy) | **Đồng ý** | Hồ Ly đã soát 47 bảng, không có cái nào dùng lại được |
| B10 | Ai được bấm "Dừng toàn bộ" | Sếp + Admin dự phòng | Một người vắng thì vẫn dừng được hệ thống |

---

## C. Điều kiện tiên quyết — việc của người, không phải của máy

**Trường "quản lý trực tiếp" trong hồ sơ nhân sự phải được điền đủ** cho toàn bộ
nhân sự đang làm. Cổng duyệt cấp 1 dựa hoàn toàn vào dữ liệu này — trống thì
cổng không chạy.

Giao HCNS (Vũ Lan Hương). Đầu ra cụ thể theo tinh thần MBOs:
**"100% nhân sự đang làm việc có trường quản lý trực tiếp được điền và
trưởng bộ phận xác nhận đúng."** Không phải "rà soát hồ sơ nhân sự".

Đây là việc chặn, không phải việc phụ.

---

## D. Thứ tự triển khai

1. Dựng lại sổ nhật ký (A3) — chặn mọi thứ khác, làm trước.
2. HCNS điền `quan_ly_id` (mục C) — chạy song song, không cần chờ code.
3. SPEC-0002 Đợt 1: chống nói dối trạng thái, cổng duyệt **tắt** → chạy 1 tuần.
4. SPEC-0003 Đợt A (file mới, không chạm vùng `gop_y`) — chạy song song được.
5. SPEC-0002 Đợt 2: bật cổng duyệt **thử riêng phòng Kho Vận** → Đợt 3 toàn công ty.
6. SPEC-0003 Đợt B — sau khi Đợt 2 chạy ổn 1 tuần. Runner ra đời `PAUSED`;
   bật là quyết định riêng của Sếp.
