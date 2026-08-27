# ADR-0009 — Điều kiện đưa đợt sửa giao diện 27/08 lên hệ thống thật

- **Ngày**: 2026-08-27
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc
- **Trạng thái**: ĐÃ DUYỆT — **chỉ áp cho đợt này**, không phải luật vĩnh viễn
- **Phạm vi**: GY-0001 (dán ảnh góp ý) · CTL-0008 (đóng cửa sổ + 13 lỗi) ·
  CTL-0011 (gộp hàm dán ảnh + Chat nội bộ)

---

## Sếp duyệt gì

> *"xong thì lên hệ thống thật đi"*

Sếp duyệt cho **đợt thay đổi giao diện này** được lên hệ thống thật khi xong,
không phải chờ Sếp bấm nghiệm thu từng nhánh.

**Không phải** giấy phép vĩnh viễn cho mọi thứ về sau. Đợt sau xin lại.

## "XONG" nghĩa là gì — thiếu một điều là KHÔNG lên

1. **Hồ Ly review trả `PASS`.** Không phải `FIX_REQUIRED`, không phải "PASS
   nhưng còn vài chỗ nhỏ". Khỉ Đột tự khai xong **không tính** — theo luật nó
   không bao giờ được tự nhận `DONE`.
2. Không còn lỗi mức **CAO** hay **MEDIUM** nào chưa sửa.
3. **Đã kiểm hồi quy** đúng chỗ bản review chỉ ra là có rủi ro.
   Bắt buộc của đợt này: **in tem tài sản 60×40mm phải in ra thật, có bằng
   chứng**, trước và sau khi thêm dòng `!important`
   ([ADR-0008](ADR-0008-sua-13-loi-cua-so-khong-lam-hong-in-tem.md)).
4. **Không có migration, không đụng dữ liệu.** Đợt này đúng ra là như vậy —
   nếu phát sinh thì dừng, hỏi Sếp.
5. Deploy xong **Gạo tự kiểm lại trên hệ thống thật**, không tin build là xong.
6. **Báo Sếp ngay**: đã lên cái gì, và câu lệnh lùi lại.

## Không nằm trong đợt này — vẫn phải hỏi Sếp

- **SPEC-0002** (cổng duyệt góp ý) — đổi phân quyền.
- **SPEC-0003** (runner tự động) — tích hợp ngoài, thông tin đăng nhập.
- **SPEC-0004** (nhắc việc) — đổi cách quản lý con người.
- Mọi migration phá dữ liệu · sửa/xoá dữ liệu thật · đổi phân quyền ·
  đổi tích hợp Shopee/TikTok/MISA · nhân sự · lương · pháp lý · chi tiêu.

## Lùi lại

`git revert <commit>` → đẩy lên `main` → GitHub Actions tự deploy lại. Vài phút.

Câu lệnh lùi phải ghi sẵn trong báo cáo gửi Sếp, không bắt Sếp đi tìm.

**Thấy hỏng thì LÙI TRƯỚC, điều tra sau.** Không sửa nóng trên hệ thống đang
có 20 người dùng.

## Rủi ro còn lại — nói thẳng

**Chưa ai dùng thử bằng mắt người thật trước khi lên.** Hồ Ly soi code, không
phải người dùng. Điều 5 ở trên là để bù cho chỗ này, nhưng không thay thế được
hoàn toàn.

Chấp nhận được vì: đợt này chỉ đụng giao diện, không đụng dữ liệu, lùi lại mất
2 phút, và cổng review đã chứng minh có răng thật — nó vừa chặn được lỗi in tem
mà Khỉ Đột khẳng định là an toàn.
