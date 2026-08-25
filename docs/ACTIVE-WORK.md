# Active Work — ai đang đụng vùng nào

Khi có ≥2 Claude/developer cùng làm: **1 vùng code tại 1 thời điểm chỉ có
1 active writer**. Ghi vào bảng dưới đây TRƯỚC khi bắt đầu code, xoá dòng
khi xong (merge vào `main`) hoặc dừng việc.

Claude khác được ĐỌC toàn bộ, nhưng tránh sửa cùng lúc vùng đã có người
khác đang là Owner ở đây — nếu thật sự cần, hỏi trực tiếp người đang giữ
hoặc ERP Owner trước khi cùng sửa.

| Area | Owner/Agent | Branch | Task | Started | Status | Affected files/modules |
|---|---|---|---|---|---|---|
| HR | Claude (Sếp Ngọc) | main | Employee Profile Phase 1 — theo báo cáo CORE_CHANGE đã duyệt | 2026-08-25 | in_progress | src/nhansu.js, src/auth.js, src/quyen.js, public/app.html (Nhân sự + Quản trị), public/assets/js/app.js, migrations/them-nhansu-lichsu.sql |

**Status hợp lệ**: `in_progress` · `blocked` · `waiting_review` · `done`
(xoá dòng khi `done` và đã merge).

## Ví dụ cách ghi

```
| HR | Claude-A | feature/hr-import-nhansu | Import Excel danh sách nhân sự mới | 2026-08-23 09:10 | in_progress | src/nhansu.js, public/app.html (tab Nhân sự) |
| Warehouse | Claude-B | feature/warehouse-scan | Thêm quét mã vạch cho Nhập/Xuất kho | 2026-08-23 09:30 | in_progress | src/kho.js, public/assets/js/app.js (khoiDongKhoVan) |
```

## Trước khi bắt đầu code (checklist nhanh)

1. Cập nhật `main` mới nhất (`git pull`).
2. Đọc file này — có ai đang đụng đúng vùng/file mình sắp sửa không?
3. Đọc [CHANGELOG.md](./CHANGELOG.md) — có quyết định gần đây ảnh hưởng việc mình không?
4. Nếu trùng vùng với người khác đang `in_progress` → hỏi trước khi code,
   đừng code song song rồi merge conflict sau.
5. Ghi dòng của mình vào bảng trên, rồi mới code.
