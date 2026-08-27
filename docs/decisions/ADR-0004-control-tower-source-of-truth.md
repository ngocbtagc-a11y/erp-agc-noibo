# ADR-0004 — Nơi đặt tài liệu điều phối & mức tự động của GẠO

- **Ngày**: 2026-08-27
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc
- **Trạng thái**: ĐÃ DUYỆT

## Bối cảnh

Ngày 27/08/2026 xuất hiện thư mục thứ hai `C:\Users\Admin\ERP` chứa
`CLAUDE.md` + `docs/` riêng, trong khi source code ERP và bộ `docs/` đầy đủ
đã nằm ở `C:\Users\Admin\Desktop\AI\crm-agc`. Hai nơi cùng mô tả hiến pháp,
vai trò Agent và quy trình → vi phạm Hiến pháp điều 1 (One Fact, One Owner).

Đồng thời cần chốt Gạo — Central Control Agent mới — được tự động tới đâu,
vì hiện chưa có runner nào tự khởi chạy phiên Hồ Ly / Khỉ Đột.

## Quyết định

### 1. Source of Truth = `crm-agc`

Toàn bộ tài liệu điều phối chuyển về `crm-agc/docs/`.
`C:\Users\Admin\ERP` rút xuống thành biển chỉ đường, không chứa nội dung.

Lý do: repo `crm-agc` có git, có GitHub Actions deploy, có code thật, có
20 file docs đã dùng ổn định. Kéo docs về đó rẻ hơn kéo code sang chỗ mới.

### 2. Mức tự động của Gạo = `ASSISTED`

- Việc `LOW-RISK` (một màn hình, không đụng Core / Source of Truth /
  phân quyền / tài chính / tồn kho): Gạo tự dispatch.
- Việc `MEDIUM` và `HIGH`: dừng ở Owner Gate, chờ Sếp.
- Cho tới khi có runner thật, `AUTOMATION LEVEL` vẫn phải khai là
  `SEMI_AUTOMATED`, không được gọi là `AUTOMATED`.

## Hệ quả

- Mọi phiên Agent đọc `crm-agc/CLAUDE.md`, không đọc `C:\Users\Admin\ERP`.
- Cần build runner để `ASSISTED` có hiệu lực thật → yêu cầu CTL-0002.
- Ràng buộc trạng thái `gop_y` phải chặt trước khi mở tự động → CTL-0003
  làm trước CTL-0002.

## Phương án đã cân nhắc và loại

- **Giữ hai repo, tách vai trò**: Agent phải đọc hai nơi, tài liệu sẽ trôi lệch.
- **Gộp về `C:\Users\Admin\ERP`**: phải sửa git remote, GitHub Actions,
  đường dẫn trong `scripts/lenh-khidot.mjs` và nhiều tài liệu — rủi ro cao,
  không đổi lại lợi ích gì.
