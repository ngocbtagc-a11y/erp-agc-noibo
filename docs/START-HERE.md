# Bắt đầu từ đây — ERP Alpha Green Commerce

Đọc trong 10 phút, không cần biết kỹ thuật.

## ERP là gì

Hệ thống quản trị nội bộ chạy trên web (dùng được cả điện thoại):
Trạm Mục Tiêu, Danh bạ, Nhân sự, Kinh doanh, Kho vận, Kế toán, Xếp ca,
Tài sản, Quản trị. Chạy trên Cloudflare, tự động deploy khi có thay đổi
được duyệt.

## Ai quyết gì

| Vai trò | Là ai | Quyết gì |
|---|---|---|
| **ERP Owner** | Sếp (CEO) | Kiến trúc chung, dữ liệu nguồn thật ở đâu, go-live, mọi thay đổi ảnh hưởng toàn công ty |
| **Domain Owner** | Trưởng phòng (Kho vận, Kinh doanh, Support, Ban Giám đốc) | Nghiệp vụ thật của phòng mình — quy trình, biểu mẫu, tiêu chí "xong" |
| **Developer/Claude** | Người viết code | Biến yêu cầu thành tính năng chạy được, trong khuôn khổ đã có |
| **Key User** | Nhân viên dùng ERP hằng ngày | Test, phản hồi, xác nhận đúng thực tế |

Chi tiết đầy đủ xem [ERP-CONSTITUTION.md](./ERP-CONSTITUTION.md).

## Muốn đề xuất 1 tính năng mới → làm thế nào

Điền [templates/BUSINESS-REQUEST.md](./templates/BUSINESS-REQUEST.md) —
12 câu hỏi đơn giản (vấn đề gì, ai làm, hiện làm sao, cần gì, xong khi
nào...). **Không cần biết database/API/code.** Gửi cho Sếp hoặc trực tiếp
nói với Claude Code.

Luồng xử lý sau khi gửi:

```
Ý TƯỞNG → Business Request → Claude phân tích (Feature Spec)
        → Architecture Gate → Phát triển → Key User test
        → Trưởng phòng xác nhận → Go-live
```

Nếu việc chỉ ảnh hưởng riêng phòng mình (không đụng dữ liệu chung, không
đụng phòng khác) → làm luôn, không cần chờ Sếp duyệt từng chi tiết. Nếu
đụng dữ liệu chung/nhiều phòng/kết nối sàn → Sếp review trước khi làm.

## Muốn báo lỗi → làm thế nào

Điền [templates/BUG-REPORT.md](./templates/BUG-REPORT.md) (rất ngắn: xảy
ra gì, lẽ ra thế nào, ai bị, hay bị không, các bước, ảnh chụp, mức độ
nghiêm trọng) — gửi trực tiếp cho Claude Code hoặc Sếp.

## Muốn test 1 tính năng → làm thế nào

Được báo khi có tính năng cần test (thường ở giai đoạn PILOT — dùng thử
trước khi chính thức). Chỉ cần: thử dùng như công việc thật hằng ngày,
báo lại chỗ nào khó dùng/sai/thiếu — không cần hiểu vì sao nó chạy như
vậy.

## Developer/Claude bắt đầu từ đâu

Đọc [/CLAUDE.md](../CLAUDE.md) — có checklist đọc bắt buộc trước khi code.
Tóm tắt: `ERP-CONSTITUTION.md` → `DATA-DICTIONARY.md` →
`SOURCE-OF-TRUTH.md` → `MODULE-MAP.md` → `ACTIVE-WORK.md` →
`CHANGELOG.md`, rồi mới code.

## Không được làm gì

- Không tự sửa Core (Nhân sự, Đăng nhập, Phân quyền, Task/Notification
  dùng chung, kết nối Shopee/TikTok) mà không qua
  [CORE-CHANGE-POLICY.md](./CORE-CHANGE-POLICY.md).
- Không tạo bảng nhân sự/sản phẩm thứ hai cho riêng 1 phòng ban — luôn
  dùng lại bảng gốc đã có.
- Không code trực tiếp trên `main` khi có ≥2 người cùng làm — xem
  [GIT-WORKFLOW.md](./GIT-WORKFLOW.md).
- Không chạy migration/xoá dữ liệu production mà chưa được Sếp xác nhận.
- Không để AI tự coi ví dụ/chat/dữ liệu test là dữ liệu thật.

## Production được deploy thế nào

Merge code vào nhánh `main` trên GitHub → GitHub Actions tự động deploy
lên Cloudflare (~1-2 phút). Nếu có thay đổi database (migration), phải
chạy tay 1 lệnh riêng ngay sau khi deploy — xem
[GIT-WORKFLOW.md](./GIT-WORKFLOW.md). Không ai deploy tay từ máy cá nhân
cho code nghiệp vụ.

---

Muốn hiểu sâu hơn về kiến trúc/dữ liệu, xem thêm:
[MODULE-MAP.md](./MODULE-MAP.md) ·
[DATA-DICTIONARY.md](./DATA-DICTIONARY.md) ·
[DATA_OWNERSHIP_MATRIX.md](./DATA_OWNERSHIP_MATRIX.md) ·
[docs/audit/](./audit/) (các báo cáo audit kiến trúc/UX/hiệu năng đã làm).
