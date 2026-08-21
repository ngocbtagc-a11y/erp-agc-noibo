# Audit hiệu năng & lưu trữ ERP Alpha Green Commerce
**Ngày:** 2026-08-20 · **Phạm vi:** hiệu năng, lưu trữ, khả năng mở rộng dữ liệu · **Trạng thái:** chỉ phân tích, chưa sửa gì

---

## Lưu ý quan trọng trước khi đọc: stack thật khác với stack trong đề bài

Bản brief của Sếp viết theo mô hình **PostgreSQL + Redis + Object Storage riêng + background worker riêng** — đó là mô hình chuẩn cho VPS/server tự quản. Nhưng ERP này chạy trên **Cloudflare Workers + D1** (đã audit ở báo cáo trước), một nền tảng **serverless khác hẳn về bản chất**. Tin tốt: Cloudflare có sẵn đúng từng mảnh tương đương, miễn phí/rẻ, không cần thêm hạ tầng:

| Khái niệm trong đề bài | Tương đương trên Cloudflare (đang có sẵn hoặc dùng ngay được) |
|---|---|
| PostgreSQL | **D1** (SQLite) — đang dùng, phù hợp quy mô này nhiều năm nữa |
| Redis / Cache | **Workers KV** hoặc **Cache API** — chưa dùng, chưa cần |
| Object Storage (S3) | **R2** — chưa dùng, cần cho ảnh/file (mục E) |
| Background Job / Queue | **Cron Trigger** (đang dùng, chạy mỗi 5 phút) + **Cloudflare Queues** khi cần việc nặng hơn |
| Connection Pool | **Không áp dụng** — D1 là binding serverless, Cloudflare tự quản lý, không có khái niệm pool phía code |
| EXPLAIN ANALYZE | `EXPLAIN QUERY PLAN` (cú pháp SQLite) qua `wrangler d1 execute` |
| Materialized View | Không có sẵn trong SQLite/D1 — phải tự làm bằng 1 bảng summary + cron refresh (mục G) |
| Table/DB size monitoring | **Đã có sẵn miễn phí** — mỗi lệnh `wrangler d1 execute` tự in ra "Database size (MB)"; Cloudflare Dashboard cũng có |
| Point-in-time backup | **D1 Time Travel** — tự động, phục hồi về bất kỳ thời điểm nào trong 30 ngày, không cần cấu hình (đã nói với Sếp ở phần trước cuộc trò chuyện) |

Toàn bộ báo cáo dưới đây dịch các nguyên tắc trong đề bài sang đúng ngôn ngữ Cloudflare, không đề xuất đổi sang PostgreSQL/VPS — **không có lý do để đổi**, và đổi sẽ là over-engineer đúng nghĩa mà Sếp dặn tránh.

---

## A. CURRENT PERFORMANCE RISKS

**Tin tốt trước:** dung lượng database thật hiện tại (lúc audit) — **1.97 MB**. Với 15-20 người dùng, đây gần như bằng 0. **Không có nguy cơ hiệu năng nào đang xảy ra thật ngay lúc này.** Toàn bộ mục dưới đây là "sẽ đau nếu không chuẩn bị", không phải "đang đau".

Rủi ro thật, xếp theo khả năng xảy ra sớm nhất:

1. **Chat nội bộ lưu file đính kèm base64 thẳng trong D1, không giới hạn tổng số tin nhắn** — đây là bảng duy nhất *đang* nhận dữ liệu tăng nhanh và không có chính sách dọn dẹp (mục C, E).
2. **Danh sách "Việc tôi giao" / Mục tiêu không có LIMIT/pagination** — hiện vô hại vì số dòng ít, nhưng là API kiểu "trả hết" đúng thứ đề bài cấm ở mục 12. *(Đã sửa trong Phase 1 — xem cập nhật cuối file.)*
3. **Dashboard Kinh doanh (doanh thu) chạy SUM/COUNT trực tiếp trên bảng `don_hang` mỗi lần tải trang** — đúng nguyên tắc mục 8 của đề bài, đây là ứng viên đầu tiên cần "aggregate table" khi dữ liệu đủ lớn, nhưng **chưa cần làm ngay** ở quy mô hiện tại.
4. **`du_lieu_json` (raw payload Shopee/TikTok) lưu vô thời hạn trên các đơn KHÔNG bị xoá** (đơn hàng `don_hang` không có luật dọn dẹp như đơn hoàn `don_hoan` đã có). *(Đã sửa trong Phase 1 — xem cập nhật cuối file.)*

---

## B. STORAGE MAP — dữ liệu hiện đang nằm ở đâu

```
D1 (SQLite, 1 database "crm-agc", ~2-10 MB tuỳ thời điểm đo)
 ├─ Dữ liệu nghiệp vụ (đúng chỗ)
 │   nhan_su, tai_khoan, san_pham, lo_hang, giao_dich_kho,
 │   don_hoan, don_hang, cong_viec, muc_tieu, thong_bao...
 │
 ├─ File nhị phân dạng base64 TEXT  ⚠️ SAI CHỖ theo nguyên tắc mục 2
 │   nhan_su.anh_cccd, nhan_su.anh_chan_dung   (ảnh CCCD, ảnh đại diện)
 │   tin_nhan_chat.tep_du_lieu                  (file đính kèm chat, tối đa 4MB/file)
 │   khieu_nai_minh_chung.du_lieu                (ảnh minh chứng khiếu nại — VIDEO đã tách sang R2)
 │
 └─ Raw integration payload (JSON nguyên văn)   — chấp nhận được, nhưng chưa có retention
     don_hoan.du_lieu_json, don_hang.du_lieu_json

R2 (Object Storage của Cloudflare)
 └─ Đội đã CHUẨN BỊ SẴN (bucket "MINH_CHUNG" cho video minh chứng khiếu nại,
    tạm khoá vì R2 chưa bật ở tài khoản Cloudflare) — đúng hướng, chỉ chờ bật

KV / Cache
 └─ CHƯA DÙNG

Application log
 └─ console.error() rải rác trong code → chỉ xem được qua `wrangler tail`
    hoặc Cloudflare Dashboard logs, KHÔNG lưu trong D1 (đây là điểm ĐÚNG,
    không phạm nguyên tắc mục 21 — application log không lẫn vào DB nghiệp vụ)

Backup
 └─ D1 Time Travel (tự động, 30 ngày) — đã có sẵn, chưa có lớp export ra R2
```

---

## C. LARGEST GROWTH RISKS — bảng/dữ liệu nào tăng nhanh nhất

| Xếp hạng | Bảng | Vì sao tăng nhanh | Đã có chặn chưa |
|---|---|---|---|
| 🔴 #1 | `tin_nhan_chat` | Kênh chat toàn công ty, file đính kèm base64 tới 4MB/file, không giới hạn tổng số tin nhắn giữ lại | **Chưa** |
| 🟡 #2 | `don_hang` (đơn hàng) | Đồng bộ tự động từ Shopee/TikTok, kèm `du_lieu_json` raw | **Đã có (Phase 1)** — dọn payload thô sau 90 ngày, giữ số liệu vĩnh viễn |
| 🟡 #3 | `thong_bao` | Mỗi thao tác quan trọng (giao việc, đối soát, cảnh báo...) đều bắn 1 dòng | **Chưa** |
| 🟢 #4 | `don_hoan` | Nhiều cột nhất nhưng ĐÃ có luật tự xoá ngoài tháng làm việc hiện tại + gộp số liệu vào `khach_hang_hoan_thang` trước khi xoá | **Có rồi — mẫu tốt để áp dụng cho 2 bảng trên** |
| 🟢 #5 | `giao_dich_kho` (sổ cái kho) | Tăng đều theo số phiếu nhập/xuất, nhưng đây là **business record phải giữ vĩnh viễn** (đúng mục 4 đề bài) — không phải rủi ro, là dữ liệu cần giữ | Không cần chặn, chỉ cần index tốt (mục D) |

---

## D. DATABASE REVIEW

**Index:** Các bảng lõi (`giao_dich_kho`, `lo_hang`, `san_pham`, `don_hoan`, `phien`, `lan_dang_nhap_hong`) đều có index trên đúng cột hay filter/join. Đây là thói quen tốt đã có sẵn.

**Query pattern — N+1:** Đã rà toàn bộ `src/*.js`. **Không phát hiện N+1 thật sự.** Cách viết hiện tại nhất quán dùng JOIN 1 câu hoặc `Promise.all()` cho vài câu độc lập.

**SELECT \*:** Vài chỗ dùng cho tra 1 dòng theo khoá chính (không phải list) — rủi ro gần như bằng 0.

**Duplicate data:** `don_hoan.san_pham` (chuỗi gộp cũ) tồn tại song song `san_pham_ten`/`san_pham_sku` (tách mới) — có chủ đích trong giai đoạn chuyển tiếp, không phải lỗi.

**Denormalize tên người** (`cong_viec.nguoi_giao_ten`, `don_hoan.kho_nhan_boi`...): denormalize có chủ đích, đúng — giữ tên tại thời điểm hành động, không nên "sửa ngược" lịch sử khi nhân viên đổi tên sau này.

---

## E. FILE STORAGE REVIEW

Ba chỗ đang/sắp lưu file nhị phân:
1. `nhan_su.anh_cccd`, `nhan_su.anh_chan_dung` — đã nén/resize ở trình duyệt trước khi gửi, có giới hạn kích thước, cache hợp lý.
2. `tin_nhan_chat.tep_du_lieu` — tới 4MB/file, có ghi chú chủ đích "chưa cần R2".
3. `khieu_nai_minh_chung` — ảnh lưu D1 (nén nhỏ), **video đã tách sang R2** (bucket chuẩn bị sẵn, tạm khoá chờ bật R2) — đây chính xác là kiến trúc "phân theo loại file" mà mục 2 đề bài mong muốn, đội đã tự làm đúng.

**Đánh giá:** Không phải lỗi kiến trúc — là đánh đổi có ý thức, hợp lý cho quy mô hiện tại.

---

## F. INTEGRATION STORAGE REVIEW — Shopee/TikTok raw data

Rút gọn 1 tầng so với mô hình đề bài (`External API → Raw → Normalize → Core` gộp Raw+Normalize làm 1 bước), nhưng `du_lieu_json` giữ nguyên văn JSON gốc trên mỗi dòng nên dữ liệu thô không mất — cách rút gọn hợp lý cho quy mô SME.

**Idempotency:** Đã làm đúng — `return_sn`/`order_sn` là PRIMARY KEY, mọi lần ghi là `ON CONFLICT DO UPDATE` — tương đương `UNIQUE + upsert` đề bài yêu cầu.

**Retention:** `don_hoan` đã có (xoá theo tháng + gộp trước khi xoá). `don_hang` **đã bổ sung ở Phase 1** — dọn `du_lieu_json` sau 90 ngày, giữ số liệu vĩnh viễn.

---

## G. PROPOSED ARCHITECTURE

```
Trình duyệt / PWA
        │
        ▼
Cloudflare Worker (erp-agc)  ← Backend API + Router
        │
        ├──► D1 (SQLite)            Dữ liệu nghiệp vụ — GIỮ NGUYÊN
        ├──► R2 (Object Storage)    Đã chuẩn bị sẵn (video minh chứng), bật khi cần thêm
        ├──► Cache API / KV         CHƯA CẦN
        ├──► Cron Trigger (có sẵn) ← đồng bộ Shopee/TikTok, dọn dữ liệu, cảnh báo
        └──► Cloudflare Queues      CHƯA CẦN
```

Không đề xuất thêm thành phần nào khác — đúng nguyên tắc tránh premature optimization.

---

## H. RETENTION MATRIX

| Loại dữ liệu | Nơi lưu | Đề xuất giữ bao lâu | Trạng thái |
|---|---|---|---|
| `nhan_su`, `tai_khoan`, `giao_dich_kho` | D1 | **Vĩnh viễn** | Đúng, giữ nguyên |
| `don_hoan` | D1 | Tháng làm việc hiện tại, gộp trước khi xoá | **Đã làm đúng** |
| `don_hang` | D1 | Payload thô 90 ngày, số liệu tổng hợp vĩnh viễn | **Đã làm — Phase 1** |
| `thong_bao` | D1 | Đề xuất 60-90 ngày | Chưa làm — P1 |
| `tin_nhan_chat` (nội dung) | D1 | Giữ lâu dài | Không xoá |
| `tin_nhan_chat.tep_du_lieu` | D1 → R2 khi cần | Lifecycle 12 tháng cho file không quan trọng | P2 |
| `phien` hết hạn | D1 | Tự dọn mỗi lần đăng nhập | **Đã có** |
| Ảnh CCCD/đại diện | D1 → R2 khi cần | Vĩnh viễn | P2 |

---

## I. PERFORMANCE ROADMAP

### P0 *(đã triển khai trong Phase 1 — 21/08/2026)*
1. ~~Thêm LIMIT vào `mtDanhSach`/`cvDanhSach`~~ ✅ Đã làm.
2. ~~Retention cho `don_hang` (dọn `du_lieu_json` > 90 ngày)~~ ✅ Đã làm.

### P1 — còn lại
3. Retention cho `thong_bao` (xoá > 90 ngày).
4. Composite index `don_hang(nguon, tao_luc_san)` nếu dashboard lọc theo cả 2 tiêu chí thường xuyên.
5. Dọn cột `don_hoan.san_pham` (chuỗi cũ) sau khi xác nhận giao diện không còn dùng.

### P2 — chỉ làm khi có bằng chứng cần
6. Bật R2 thật cho ảnh CCCD + file chat (khung đã sẵn sàng cho video minh chứng).
7. Bảng `tong_hop_doanh_thu_ngay` cho Dashboard.
8. Cache API/KV cho permission + master data.
9. Cloudflare Queues cho export/import nặng.

---

## J. ESTIMATED COMPLEXITY

| Hạng mục | Độ phức tạp |
|---|---|
| LIMIT vào API list | **LOW** *(đã xong)* |
| Retention `don_hang` | **LOW** *(đã xong)* |
| Retention `thong_bao` | **LOW** |
| Composite index | **LOW** |
| Bật R2 (ảnh/file) | **MEDIUM** |
| Bảng aggregate Dashboard | **MEDIUM** |
| Cache API/KV | **MEDIUM** |
| Cloudflare Queues | **HIGH** (chưa cần) |

---

## K. MIGRATION RISK

| Thay đổi | Rủi ro | Giảm rủi ro |
|---|---|---|
| LIMIT vào API | Không có | Chỉ giới hạn số dòng trả về |
| Retention `don_hang` | Thấp | Chỉ NULL `du_lieu_json`, giữ nguyên số liệu — không xoá dòng |
| Retention `thong_bao` | Thấp | Thông báo cũ không ai xem lại |
| Bật R2 | Trung bình | Chạy song song 2 đường khi migrate, không xoá base64 cũ tới khi xác nhận xong |

---

## Tổng kết

Hệ thống chưa có vấn đề hiệu năng thật nào. Phase 1 đã xử lý xong 2 việc P0 (LIMIT + retention `don_hang`). Còn lại để dành tới khi có bằng chứng thật cần.
