# Active Work — ai đang đụng vùng nào

Khi có ≥2 Claude/developer cùng làm: **1 vùng code tại 1 thời điểm chỉ có
1 active writer**. Ghi vào bảng dưới đây TRƯỚC khi bắt đầu code, xoá dòng
khi xong (merge vào `main`) hoặc dừng việc.

Claude khác được ĐỌC toàn bộ, nhưng tránh sửa cùng lúc vùng đã có người
khác đang là Owner ở đây — nếu thật sự cần, hỏi trực tiếp người đang giữ
hoặc ERP Owner trước khi cùng sửa.

| Area | Owner/Agent | Branch | Task | Started | Status | Affected files/modules |
|---|---|---|---|---|---|---|
| Góp ý ERP — PHÂN TÍCH (không code) | HỒ LY (Agent A) | — (chỉ ghi `docs/`) | Viết SPEC-0002 (cổng duyệt góp ý) + SPEC-0003 (runner vòng lặp) | 2026-08-27 | waiting_review | docs/specs/SPEC-0002-cong-duyet-gop-y.md, docs/specs/SPEC-0003-runner-vong-lap.md |
| `gop_y` — TRẠNG THÁI & DANH SÁCH (đặt trước) | (chưa giao) KHỈ ĐỘT | — | SPEC-0002: `src/index.js:3010-3330` (`gopYDoiTrangThai`, `gopYDanhSach`, `gopYLichSu`), phần **danh sách** trong `public/app.html` + `app.js` tab `gopy`, `migrations/them-gopy-lichsu-tacnhan.sql`, `migrations/them-gopy-congduyet.sql` | 2026-08-27 | blocked | Chờ Sếp chốt **9 câu** ở SPEC-0002 mục "Cần ERP Owner quyết" (câu 9 chặn cả SPEC-0003). **KHÔNG đụng** `#gy-form`/`gopYGui`/`dinh_kem` — vùng của nhánh `feature/gopy-paste-anh`. |
| Runner vòng lặp — FILE MỚI (đặt trước) | (chưa giao) KHỈ ĐỘT | — | SPEC-0003 Đợt A (CTL-0002a): `.github/workflows/agent-runner.yml`, `scripts/runner/*.mjs`, `src/runner.js`, `migrations/them-cau-hinh-he-thong.sql`, `migrations/them-agent-run.sql` | 2026-08-27 | blocked | Chờ Sếp chốt 5 câu SPEC-0003. Toàn file MỚI, **không đụng** `src/index.js` vùng `gop_y` → chạy song song với SPEC-0002 được. Đợt B chờ SPEC-0002 merge. |
| `gop_y` — FORM GỬI GÓP Ý (chỉ ô đính kèm ảnh) | KHỈ ĐỘT (Agent B) | `feature/gopy-paste-anh` | Góp ý #1 của Sếp Ngọc: dán (Ctrl+V) / kéo thả ảnh chụp màn hình thẳng vào form gửi góp ý + thay ô "Chọn tệp" trần bằng vùng đính kèm có xem trước | 2026-08-27 | waiting_review | `public/app.html` (khối `#gy-anh` trong `#gy-form`), `public/assets/js/app.js` (`nenAnhVuaKhung`, `coByteCuaDataUrl`, phần đính kèm + submit `#gy-form` trong `khoiDongGopY`), `public/assets/css/style.css` (khối `.gy-anh-*`). **KHÔNG đụng** `gopYDoiTrangThai`/`gopYDanhSach`/`gopYLichSu`/`docs/specs/` — vùng của Hồ Ly. Backend `gopYGui` giữ nguyên, không migration. Chờ Sếp Ngọc nghiệm thu rồi mới merge. |

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
