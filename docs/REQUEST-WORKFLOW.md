# VÒNG ĐỜI MỘT YÊU CẦU — ERP AGC

> Ban hành 2026-08-27. Chỉ có **một** state machine cho toàn hệ thống.
> Bảng thật: `gop_y` + `gop_y_lich_su` trong D1 (`crm-agc`).

## 1. Ánh xạ trạng thái

Trạng thái trong DB **đã có sẵn từ 25/08/2026** và trùng khớp state machine
Control Tower. Không đổi tên cột, không thêm bảng.

| Trạng thái DB (`gop_y.trang_thai`) | Tên Control Tower | Nhãn cho người dùng |
|---|---|---|
| `moi` | `NEW` / `TRIAGE` | Mới gửi |
| `dang_phan_tich` | `IN_ANALYSIS` | Đang phân tích |
| `cho_quyet_dinh` | `NEEDS_OWNER_DECISION` | Chờ Sếp quyết định |
| `da_duyet` | `READY_FOR_BUILD` | Đã duyệt làm |
| `dang_lam` | `IN_BUILD` | Đang code |
| `dang_kiem_tra` | `READY_FOR_REVIEW` | Đang review |
| `can_chinh_sua` | `FIX_REQUIRED` | Cần chỉnh sửa |
| `cho_nghiem_thu` | `READY_FOR_UAT` | Chờ nghiệm thu |
| `nghiem_thu_chua_dat` | `UAT_FAILED` | Nghiệm thu chưa đạt |
| `san_sang_phat_hanh` | `READY_FOR_RELEASE` | Sẵn sàng phát hành |
| `hoan_thanh` | `DONE` | Hoàn thành |
| `bi_chan` | `BLOCKED` | Đang bị chặn |

**Còn thiếu**: `READY_FOR_ANALYSIS` và `CANCELLED`. Xem mục 5.

## 2. Ba luồng chuẩn

### Luồng A — Bug rõ, scope nhỏ (rẻ, nhanh)
```
moi → da_duyet → dang_lam (KHỈ ĐỘT) → dang_kiem_tra (HỒ LY verify) → hoan_thanh
```
Không bắt Hồ Ly phân tích dài. Điều kiện: vấn đề đã rõ, một màn hình,
không đụng Core / Source of Truth / phân quyền.

### Luồng B — UX / Quy trình / Tính năng / Dữ liệu / Phân quyền / Tích hợp
```
moi → dang_phan_tich (HỒ LY) → da_duyet → dang_lam (KHỈ ĐỘT)
    → dang_kiem_tra (HỒ LY) → cho_nghiem_thu → san_sang_phat_hanh → hoan_thanh
```

### Luồng C — HIGH-RISK / cần business policy
```
moi → cho_quyet_dinh → [DỪNG, chờ Sếp] → quyết định được lưu → về luồng A hoặc B
```
**Không dispatch build trước khi Sếp quyết.**

## 3. Fix loop

```
dang_kiem_tra → can_chinh_sua → dang_lam → dang_kiem_tra
```
`MAX_FIX_LOOPS = 3`. Quá 3 vòng → `bi_chan` + báo Sếp.
**Hiện chưa có bộ đếm trong DB** — Gạo phải đếm tay từ `gop_y_lich_su`.

## 4. Mỗi lần đổi trạng thái phải ghi

`gop_y_lich_su` đã lưu: `tu_trang_thai`, `den_trang_thai`, `nguoi_doi_id`,
`ghi_chu`, `luc`. Đủ để truy vết.

Điều **chưa** ghi được: `current_owner` / `next_owner` (đang ở Gạo, Hồ Ly,
Khỉ Đột hay Sếp). Cột `nguoi_phu_trach_id` chỉ trỏ tới một nhân sự thật,
không biểu diễn được Agent.

## 5. Khoảng trống cần EXTEND (không tạo bảng mới)

| Thiếu | Đề xuất | Rủi ro |
|---|---|---|
| `current_owner` / `next_owner` | thêm 2 cột TEXT: `GAO`/`HOLY`/`KHIDOT`/`OWNER`/`NONE` | LOW |
| Đếm fix loop | thêm cột `so_vong_sua` INTEGER DEFAULT 0 | LOW |
| `READY_FOR_ANALYSIS`, `CANCELLED` | thêm 2 giá trị vào `GOPY_TRANG_THAI_HOP_LE` | LOW |
| `handoff_reference`, `review_reference`, `decision_reference` | thêm 3 cột TEXT (đã có sẵn `spec_reference`) | LOW |
| `AUTOMATION_MODE`, `KILL_SWITCH` | bảng cấu hình 1 dòng, hoặc reuse bảng cài đặt sẵn có | LOW |

Toàn bộ là `ALTER TABLE ADD COLUMN` — không phá dữ liệu, có thể lùi.

## 6. Nguyên tắc chi phí

- Bug đơn giản **không** đi qua chu trình BA đầy đủ.
- Không audit toàn repo cho mỗi yêu cầu — chỉ đọc module liên quan.
- Không gọi Agent khi câu trả lời đã nằm trong `docs/` hoặc DB.
