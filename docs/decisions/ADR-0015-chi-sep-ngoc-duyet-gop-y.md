# ADR-0015 — Góp ý ERP: chỉ Sếp Bùi Thị Ngọc duyệt ở cấp cuối

- **Ngày:** 2026-08-28 · **Người quyết:** Sếp Bùi Thị Ngọc (ERP Owner)
- **Trạng thái:** Đã chốt, đã dựng (nhánh `feature/gopy-chi-sep-ngoc`)
- **Thay đổi:** ADR-0006 B4/B6 và SPEC-0002 — chỉ đổi *ai* là ERP Owner,
  không đổi luồng duyệt.

## Nguyên văn của Sếp

> "riêng cái góp ý ERP **đừng để sếp Phong duyệt, 1 mình tao duyệt hết** nhé"

Khi được nêu rủi ro "Sếp vắng thì góp ý đọng":

> "cứ để tao duyệt 1 mình, **tao duyệt đt cũng được**"

## Bối cảnh

Anh **Nguyễn Duy Phong** là Giám đốc, tài khoản vai trò `admin`, **toàn quyền
mọi thứ khác** trong ERP. Cổng duyệt SPEC-0002 xác định ERP Owner bằng
`laAdmin(vai_tro)` — nên anh Phong duyệt được góp ý y như Sếp. Sếp muốn giữ
riêng quyết định "công ty sẽ sửa cái gì trong ERP" cho một người.

## Quyết định

1. **Cấp cuối chỉ Sếp Ngọc.** Xác định bằng **cờ `tai_khoan.duyet_gopy`**,
   không phải vai trò, không phải id viết cứng trong code.
2. **Anh Phong VẪN XEM ĐẦY ĐỦ** — mọi góp ý, mọi trạng thái, mọi lịch sử,
   ghi chú nội bộ, mức rủi ro, link PR. Mất **đúng** nút duyệt/từ chối ở cấp
   cuối. Cắt rộng hơn thế là cắt quá tay.
3. **Cấp 1 của quản lý phòng GIỮ NGUYÊN.** Sếp là người duy nhất duyệt cấp
   cuối nên lớp lọc cấp 1 càng quan trọng — bỏ đi là dồn hết lên một người.
4. **Chặn ở MÁY CHỦ.** Anh Phong là admin, biết đường thì gọi thẳng API.
   Ẩn nút ở giao diện là hàng rào giấy (đúng lỗi đã làm vòng 2 hỏng, REV-0018).
5. **Điện thoại là đường chính**, không phải đường phụ. Duyệt 1 chạm từ danh
   sách, nút ≥ 44px, danh sách tự cập nhật, có **hoàn tác 15 phút**.

## Vì sao là CỜ QUYỀN, không phải tên người trong code

- Sếp đổi ý cho ai đó duyệt → **bật cờ, không sửa code, không deploy**.
- Sếp đi vắng muốn tạm uỷ quyền → đã có sẵn đường, bật rồi tắt.
- Viết cứng `id`/tên vào code là nợ kỹ thuật: người sau đọc không hiểu vì sao.

Cấp/thu cờ **chỉ người đang giữ cờ** làm được (`POST
/api/quan-tri/quyen-duyet-gopy`) — nếu để admin bật được thì anh Phong tự bật
cho mình trong 5 giây và cả quyết định này thành vô nghĩa. Không tắt được cái
cờ cuối cùng: muốn chuyển giao thì bật cho người mới trước, rồi mới tắt.

## Rủi ro đã nêu với Sếp và Sếp đã chấp nhận

**Một người duyệt = một điểm nghẽn.** Sếp vắng dài ngày thì góp ý đọng ở cổng
2. Ba thứ đỡ sẵn trong hệ thống: (a) rủi ro **LOW không lên Sếp**, quản lý
trực tiếp gật là đủ (~60% số góp ý — ADR-0006 A1); (b) **SLA nhắc** ngày thứ
3 và **tự đẩy lên Sếp** ngày thứ 5; (c) **cờ uỷ quyền** bật/tắt trong 2 chạm.

## Hệ quả

- `tai_khoan.duyet_gopy` là **quyền duy nhất trong hệ thống không đi theo vai
  trò**. Đã ghi rõ lý do ngay tại `duocDuyetGopY()` trong `src/quyen.js` để
  người sau không tưởng là làm ẩu.
- `src/auth.js` `docPhien()` đọc thêm `t.duyet_gopy` → **thứ tự triển khai:
  DB TRƯỚC, CODE SAU**. Deploy code trước khi nạp migration là **mất đăng
  nhập toàn hệ thống**, không riêng màn Góp ý.
- Lùi: `migrations/lui-quyen-duyet-gopy.sql`, và phải **deploy code cũ trước**
  rồi mới lùi DB. Lùi xong quyền quay về "admin nào cũng duyệt được".
- **Bốn cửa quản trị không được phép tắt người duyệt** (REV-0027 L3 + cửa thứ
  năm): `khoa-tai-khoan`, `xoa-tai-khoan`, `xoa-nhan-su` trả **409** khi đối
  tượng là người **duy nhất** còn `duyet_gopy = 1 AND kich_hoat = 1`; và
  `dat-lai-mat-khau` trả **403** với **mọi** tài khoản đang giữ cờ (trừ chính
  chủ) — mật khẩu tạm được trả thẳng cho người gọi, nên đặt lại mật khẩu của
  Sếp là mượn được danh tính Sếp mà duyệt, và hồ sơ duyệt sẽ nói dối.
- **Thiếu cột `duyet_gopy` không còn làm sập đăng nhập:** `docPhien()` bắt
  đúng lỗi `no such column` rồi lùi về `0 AS duyet_gopy` → cờ về `false`, hệ
  thống chạy tiếp ở mức không-quyền. Thứ tự "DB trước, code sau" **vẫn giữ**,
  nhưng nay nó là quy trình chứ không còn là điều kiện sống còn.
- **Migration tự kiểm:** `them-quyen-duyet-gopy.sql` gãy bằng `CHECK
  constraint failed: kiem_backfill_duyet_gopy` nếu backfill bật cờ cho khác 1
  tài khoản. Không còn ca "migration báo thành công mà không ai duyệt được".
- **Không ai duyệt góp ý của chính mình** (Sếp chốt 28/08/2026, sau khi dùng
  thật): người **giữ cờ** gửi góp ý thì vào thẳng `cho_phan_tich`; người
  **không có ai ở cấp 1** (quản lý phòng/trưởng phòng) bỏ qua cổng 1, lên
  thẳng Sếp; nhân viên thường vẫn đi đủ hai cổng. Mỗi ca bỏ qua ghi **một
  dòng lịch sử** nói rõ lý do — bỏ qua âm thầm là sai.

## Đường cứu tầng DB — mất điện thoại, quên mật khẩu, nghỉ dài (REV-0027 L6)

Cờ duyệt chỉ đi ra từ tay người đang giữ nó, nên nếu Sếp **không đăng nhập
được** thì không còn ai bật cờ cho ai. Đây là đường cứu chính thức, chạy thẳng
ở tầng DB — cố ý **không** đi vòng qua tài khoản admin:

```
npx wrangler d1 execute crm-agc --remote \
  --command "UPDATE tai_khoan SET duyet_gopy = 1, kich_hoat = 1 WHERE ten_dang_nhap = '<số mới của Sếp>'"
```

Trước đây câu này chỉ nằm ở chú thích cuối `migrations/them-quyen-duyet-gopy.sql`
— đường cứu giấu trong comment migration thì coi như không có.
