# Active Work — ai đang đụng vùng nào

Khi có ≥2 Claude/developer cùng làm: **1 vùng code tại 1 thời điểm chỉ có
1 active writer**. Ghi vào bảng dưới đây TRƯỚC khi bắt đầu code, xoá dòng
khi xong (merge vào `main`) hoặc dừng việc.

Claude khác được ĐỌC toàn bộ, nhưng tránh sửa cùng lúc vùng đã có người
khác đang là Owner ở đây — nếu thật sự cần, hỏi trực tiếp người đang giữ
hoặc ERP Owner trước khi cùng sửa.

| Area | Owner/Agent | Branch | Task | Started | Status | Affected files/modules |
|---|---|---|---|---|---|---|
| Góp ý ERP — PHÂN TÍCH (không code) | HỒ LY (Agent A) | — (chỉ ghi `docs/`) | Chốt lại SPEC-0002 + SPEC-0003 theo ADR-0006 (A1–A4, B1–B10) + xác minh mô hình chi phí chạy bằng gói thuê bao | 2026-08-27 | waiting_review | docs/specs/SPEC-0002-cong-duyet-gop-y.md, docs/specs/SPEC-0003-runner-vong-lap.md |
| Trạm Mục Tiêu — PHÂN TÍCH (không code) | HỒ LY (Agent A) | — (chỉ ghi `docs/`) | Viết SPEC-0004 (nhắc việc chủ động) theo CTL-0007 | 2026-08-27 | waiting_review | docs/specs/SPEC-0004-tram-muc-tieu-nhac-viec.md |
| `cong_viec` — NHẮC VIỆC (đặt trước) | (chưa giao) KHỈ ĐỘT | — | SPEC-0004: `src/index.js` (`quetNhacViec()` mới + 1 dòng trong `scheduled()` + ghi `nop_luc` trong `cvCapNhat`), `public/app.html` + `app.js` tab `congviec` (khối "Việc của tôi hôm nay", bảng "Ai đang đọng", bảng "Đáng ghi nhận"), `migrations/them-congviec-nhacviec.sql` | 2026-08-27 | ready | Đợt 0–2 làm được ngay, 2 câu N1/N2 có mặc định an toàn. **KHÔNG đụng** `CHUYEN_HOP_LE` (`src/index.js:1956`) · vùng `gop_y` · `public/assets/js/app.js` dòng ~960-1015 (popover Trạng thái hiện diện — vùng của CTL-0008). Chỉ ĐỌC `cong_viec`, chỉ GHI `thong_bao`. |
| `gop_y` — TRẠNG THÁI & DANH SÁCH (đặt trước) | (chưa giao) KHỈ ĐỘT | — | SPEC-0002: `src/index.js:3010-3330` (`gopYDoiTrangThai`, `gopYDanhSach`, `gopYLichSu`), phần **danh sách** trong `public/app.html` + `app.js` tab `gopy`, `migrations/them-gopy-lichsu-tacnhan.sql`, `migrations/them-gopy-congduyet.sql` | 2026-08-27 | ready | **Hết chặn** — ADR-0006 đã chốt 9/9 câu, SPEC-0002 nay `READY_FOR_BUILD`. Làm `them-gopy-lichsu-tacnhan.sql` **TRƯỚC TIÊN** (ADR-0006 mục D.1 — chặn mọi thứ khác). **KHÔNG đụng** `#gy-form`/`gopYGui`/`dinh_kem` — vùng của nhánh `feature/gopy-paste-anh`. |
| Runner vòng lặp — FILE MỚI | **KHỈ ĐỘT (Agent B)** | `feature/ctl-0002a-runner` — worktree `%TEMP%\claude\agc-ctl0002a`, tách từ `main` | SPEC-0003 Đợt A (CTL-0002a): `.github/workflows/agent-runner.yml`, `scripts/runner/*.mjs`, `src/runner.js`, `migrations/them-cau-hinh-he-thong.sql`, `migrations/them-agent-run.sql` | 2026-08-27 | waiting_review | **Sếp duyệt 27/08, đã build xong, chưa merge/chưa push.** Toàn file **MỚI** → **KHÔNG đụng** `src/index.js`, `public/app.html`, `public/assets/js/app.js`, `public/assets/css/style.css` (Rule 13 — vùng của `feature/gopy-paste-anh`, `feature/dan-anh-dung-chung`, SPEC-0002/0004). `src/runner.js` **chưa nối** vào `scheduled()`/router → production không đổi một dòng nào. `AUTOMATION_MODE` ra đời = `PAUSED`. Đợt B (11 cột `gop_y` + nối dây) chờ SPEC-0002 merge. ~~Chờ Sếp chốt **2 câu M1/M2**~~ (4 câu cũ đã có đáp án ADR-0006 B7–B10, 1 câu bị bãi bỏ). **Xác thực bằng `CLAUDE_CODE_OAUTH_TOKEN`, CẤM `ANTHROPIC_API_KEY`, CẤM cờ `--bare`** — xem SPEC-0003 mục "Xác thực bằng gói thuê bao". Toàn file MỚI, **không đụng** `src/index.js` vùng `gop_y` → chạy song song với SPEC-0002 được. Đợt B chờ SPEC-0002 merge. |
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
