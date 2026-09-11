# Active Work — ai đang đụng vùng nào

Khi có ≥2 Claude/developer cùng làm: **1 vùng code tại 1 thời điểm chỉ có
1 active writer**. Ghi vào bảng dưới đây TRƯỚC khi bắt đầu code, xoá dòng
khi xong (merge vào `main`) hoặc dừng việc.

Claude khác được ĐỌC toàn bộ, nhưng tránh sửa cùng lúc vùng đã có người
khác đang là Owner ở đây — nếu thật sự cần, hỏi trực tiếp người đang giữ
hoặc ERP Owner trước khi cùng sửa.

| Area | Owner/Agent | Branch | Task | Started | Status | Affected files/modules |
|---|---|---|---|---|---|---|
| Văn phòng ảo — DỌN BIÊN CHẾ | Claude (phiên Sếp Ngọc) | `don-bien-che-vpa` | Lệnh C1 (bảng kiểm kê VAN-PHONG-AO-ALPHAGREEN, chốt 11/09/2026): giữ Doanh, Tuấn sang đội xây dựng, tạm tắt Nhã/Khang/Toán, cho nghỉ Nhân/Minh/Hà/Luật/Mây — bảng `BIEN_CHE` trong agents-vp.js, chỉ ẩn không xoá. Chờ Sếp nói "đẩy" (lệnh C0: không commit thẳng vào main). | 2026-09-11 | waiting_review | `src/agents-vp.js` · `src/vanphong.js` · `src/vp-may.js` · `public/assets/js/app.js` · `public/app.html` · `scripts/do-bien-che-vp.mjs` MỚI. **KHÔNG đụng** `quetNhacViec` (nhắc việc tự động giữ nguyên), vùng `gop_y`, R&D |
| Core — Thanh bên gập nhóm | Claude (phiên Sếp Ngọc 06/09) | `fix/menu-thu-gon` | Nhóm trong thanh điều hướng gập/mở được, nhớ trạng thái theo máy — thanh bên đang xổ hết 15 mục một lượt, Sếp báo khó dùng | 2026-09-06 | waiting_review | `public/assets/js/app.js` (bộ dựng thanh bên + `moTab`) · `public/assets/css/style.css` (`.sb-nhom`, `.sb-nhom-con`, `.sb-mui`). ⚠️ **Trùng vùng** với dòng "Core — Điều hướng toàn ERP" của phiên Dashboard (cùng bộ dựng thanh bên). Sửa thêm chứ không sửa lại thiết kế của phiên đó; nếu phiên Dashboard còn làm dở thì gộp tay khi merge |
| Core — Điều hướng toàn ERP | Claude (phiên Dashboard) | `feature/dieu-huong-phong-ban` | Thiết kế lại thanh điều hướng theo sơ đồ cơ cấu tổ chức (2 phòng) + 3 màn Tổng quan (công ty · Kinh doanh · Vận hành) | 2026-09-06 | waiting_review | `public/assets/js/app.js` (mảng `TAB`, bộ dựng thanh bên, `moTab`, khối `khoiDongTongQuan`) · `public/app.html` (3 section `v-tqcongty`/`v-tqkinhdoanh`/`v-tqvanhanh`) · `docs/IA-DIEU-HUONG-THEO-PHONG-BAN.md` MỚI. **KHÔNG đụng** `src/quyen.js`, không đụng API, không đụng vùng `kd-pane-rnd` (nhánh R&D đang làm) |
| Kinh doanh — Dashboard Marketplace | Claude (phiên Dashboard) | `feature/dashboard-marketplace` | Tổng quan 2 sàn (doanh thu tạm tính, hủy/hoàn, so kỳ trước) + 10 SKU bán chạy/bán kém + bảng dòng hàng `don_hang_item` | 2026-09-06 | waiting_review | `src/don-hang-item.js` MỚI · `src/index.js` (khối TỔNG QUAN 2 SÀN, bỏ `kdTongQuanDoanhThu`) · `src/shopee.js`/`src/tiktok.js` (ghi dòng hàng khi đồng bộ) · `public/app.html` (2 panel trong tab Kinh doanh) · `public/assets/js/app.js` (`khoiDongTongQuanSan`, thẻ doanh thu Home CEO) · `api.js` · `style.css` · `migrations/them-donhang-dong.sql` MỚI |
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
