# AUDIT — VĂN PHÒNG ẢO AGC (Phase 1)

**Ngày:** 06/09/2026 · **Người làm:** Claude (phiên Sếp Ngọc) · **Nhánh:** `feature/van-phong-ao`
**Yêu cầu gốc:** Sếp Ngọc — "Dựng Văn phòng ảo AGC tích hợp trực tiếp vào ERP", một cửa duy nhất *Hỏi Mây*.
**Trạng thái:** Phase 1 xong. **CHƯA bắt đầu Phase 2** — chờ Owner duyệt.

---

## 0. Kết luận trước, chi tiết sau

Ba điều quan trọng nhất tìm được:

**1. Hạ tầng AI đã có sẵn và đang chạy thật.** Không phải xây từ đầu, và **không vướng chính sách cấm `ANTHROPIC_API_KEY`** — ERP đang gọi AI qua `env.AI` (Workers AI, model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) ở ba chỗ trong production. Đây là lời giải cho vướng mắc "lấy AI ở đâu" mà tôi tưởng phải chờ Sếp quyết.

**2. Bảng `gop_y` gần như chính là `virtual_office_request` Sếp mô tả.** Nó đã có `current_owner`, `next_owner`, `risk`, `spec_reference`, hai tầng duyệt (`duyet_cap1_*`, `duyet_owner_*`), cột AI đề xuất (`de_xuat_*`), và cả `hoan_tac_json` để lùi. Tạo bảng request mới là nhân đôi dữ liệu (vi phạm Rule 1).

**3. Không có hạ tầng chạy nền cho agent.** Không Queue, không job runner, không `agent_run`. SPEC-0003 Runner **chưa merge và nhánh không còn tồn tại** ở máy này. Chỉ có đúng một cron 5 phút. Đây là ràng buộc quyết định mức tự động thật sự đạt được ở V1.

---

## 1. Kiến trúc hiện tại

| Lớp | Thực tế |
|---|---|
| Chạy trên | Cloudflare Workers + D1 (`crm-agc`), 1 Worker duy nhất `erp-agc` |
| Nền chạy | **1 cron `*/5 * * * *`** — mọi việc nền dồn vào đây, không có lịch thứ hai |
| Queue | **Không có** Cloudflare Queues |
| AI | `env.AI` (Workers AI) — đã bật, đang dùng thật |
| Lưu trữ | D1 (~56 bảng), R2 cho minh chứng (`MINH_CHUNG`, đang tắt) |
| Giao diện | 1 trang `app.html` + `app.js`, PWA dùng được trên điện thoại |

## 2. Mây — trạng thái hiện tại

**Chưa tồn tại.** Không có agent điều phối nào trong hệ thống. "Gạo" cũng không xuất hiện trong code đang chạy — chỉ còn dấu vết trong tài liệu.

## 3. Agent đã cấu hình

| Agent | Trạng thái thật |
|---|---|
| **Hồ Ly** | **Đang chạy thật** — `hoLyTuDongTriage()` trong cron: đọc góp ý mới, chấm mức rủi ro, đề xuất phân loại, viết nháp spec. Chỉ ghi cột `de_xuat_*`, **không có đường nào tự đổi `trang_thai`** — Owner Gate đúng tinh thần Sếp yêu cầu |
| **Khỉ Đột** | Không có trong code đang chạy. Chỉ là vai người/phiên Claude |
| **9 trợ lý ảo** | Đã dựng ở nhánh này nhưng **chưa nối AI**: hồ sơ, hiến pháp, ROLE PROFILE, bộ công cụ, hàng rào quyền — xem mục 5 |
| **Mây** | Chưa có |

## 4. Thành phần tái dùng được (REUSE)

| Concept Sếp nêu | Đã có sẵn | Ghi chú |
|---|---|---|
| `virtual_office_request` | **`gop_y`** | Có `current_owner`, `next_owner`, `risk`, `spec_reference`, 2 tầng duyệt, `de_xuat_*`, `hoan_tac_json`, `so_lan_gui_lai` |
| `request_history` | **`gop_y_lich_su`** | Đã ghi tác nhân |
| `ai_conversation` / `ai_message` | **`vp_hoi_thoai` / `vp_tin_nhan`** | Vừa dựng ở nhánh này |
| `decision` (Owner Gate) | **`duyet_cap1_*` + `duyet_owner_*` trong `gop_y`** | Đã có cơ chế, chưa có bảng riêng |
| Task | **`cong_viec`** | `nguoi_giao`/`nguoi_nhan`/`dau_ra`/`han_chot`/trạng thái có luật chuyển |
| Thông báo | **`guiThongBao` + `guiTelegram` + `webpush` + `day-thong-bao.js`** | Đủ 3 kênh |
| Phân quyền | **`src/quyen.js`** | Hai ô: vai trò hệ thống + vị trí công việc, hợp lại; enforce ở máy chủ |
| Nhân sự / cơ cấu | **`nhan_su` + `phong_ban` + `chuc_danh`** | Cơ cấu thật: 4 phòng, 10 chức danh |
| Tài liệu / tri thức | **`kho_tai_lieu`** + OCR | Có sẵn, chưa có `verification_status` kiểu Sếp mô tả |
| Chat nội bộ | `tin_nhan_chat` | Chat người–người, **không hợp** để làm hội thoại AI |

## 5. Thành phần mới đã dựng ở nhánh này

| File | Việc |
|---|---|
| `src/agents-vp.js` | 9 trợ lý + Hiến pháp nhân sự ảo (Sếp ban hành) + hồ sơ năng lực đọc được |
| `src/vp-role-profile.js` | 9 ROLE PROFILE **nguyên văn của Sếp** |
| `src/vp-cong-cu.js` | 12 công cụ tra số thật + hàng rào quyền 3 lớp |
| `src/vp-may.js` | Mây điều phối: phân loại → định tuyến → họp 3 vòng → Owner Gate. Chạy trên Workers AI (`env.AI`) |
| `src/vanphong.js` | API + trợ lý tự nhắc việc bằng **luật SQL, không cần AI** |
| `migrations/them-vanphong.sql` | 3 bảng: hội thoại, tin nhắn, có mặt |
| `public/assets/js/chibi.js`, `css/vanphong.css` | Mặt bằng 9 phòng — **cần bỏ**, xem mục 13 |

## 6. Thay đổi database

Đã dựng (chưa nạp lên bản thật): `vp_hoi_thoai`, `vp_tin_nhan`, `vp_co_mat`.
**Không** tạo bảng việc riêng — trợ lý giao việc ghi thẳng vào `cong_viec`.

## 7. Mô hình quyền

Đã thêm khoá tab `vanphong` vào `src/quyen.js`, mở cho cả 10 vai trò. Cửa từng phòng kiểm riêng theo `vao_duoc` trong `agents-vp.js`. Ba lớp chặn dữ liệu nhạy cảm: agent không được cấp công cụ → công cụ tự lọc theo quyền người dùng → câu SQL không chọn cột lương/CCCD/BHXH ra khỏi database.

## 8. Workflow request

Chưa dựng. Đề xuất **mở rộng `gop_y`** thay vì tạo mới — 15 trạng thái Sếp nêu là superset của workflow hiện có.

## 9. Mức tự động THẬT SỰ đạt được

> **AUTOMATION LEVEL = SEMI_AUTOMATED**

Nói thẳng theo yêu cầu mục XXVII của Sếp — không gọi là AUTOMATED:

**Tự chạy được:** việc nền theo cron 5 phút (đồng bộ sàn, cảnh báo, nhắc việc, Hồ Ly triage). Trợ lý tự nhắc việc mỗi sáng bằng luật SQL.

**Chưa tự chạy được:** không có queue/job runner nên **không thể** làm chuỗi Mây → Hồ Ly → Khỉ Đột → Hồ Ly → Mây một cách tự động. Không có agent nào tự viết code, tự build, tự deploy.

**Chặn kỹ thuật:** Worker chỉ chạy khi có request hoặc khi cron nổ; không có tiến trình nền dài. Việc chạy lâu (phân tích nhiều bước) phải cắt thành nhiều nhịp cron và tự giữ trạng thái.

## 10. Cái gì vẫn là thủ công

Viết code, build, deploy, review kỹ thuật, quyết định nghiệp vụ, duyệt Owner Gate, merge nhánh.

## 11. Quyết định cần Owner

| # | Việc cần Sếp quyết | Vì sao |
|---|---|---|
| 1 | **Mây chạy bằng Workers AI (Llama 3.3) hay chờ nguồn khác?** | Workers AI đã bật, không tốn thêm tiền, không vi phạm chính sách. Đổi lại: yếu hơn Claude/GPT ở suy luận nhiều bước và phản biện — mà phản biện chính là thứ Sếp cần nhất ở Trợ lý GĐ/PGĐ |
| 2 | **Mở rộng `gop_y` hay tạo bảng request mới?** | Tôi đề xuất mở rộng. Nhưng `gop_y` đang có 2 phiên khác giữ (ACTIVE-WORK) → phải hẹn giờ |
| 3 | **Bỏ mặt bằng 9 phòng?** | Nó ngược nguyên tắc "một cửa duy nhất". Tôi đề xuất bỏ, giữ lại như màn phụ *Hồ sơ đội trợ lý* để xem năng lực |
| 4 | **Phạm vi V1** | 17 mục trong Definition of Done là rất lớn. Đề xuất cắt V1 còn: Hỏi Mây + phân loại + route + Owner Gate + theo dõi yêu cầu |

## 12. Kiểm chứng đã làm

- 9/9 trợ lý ghép prompt đúng 4 tầng (hiến pháp → role profile → bối cảnh → người hỏi), không còn chỗ trống `[ROLE PROFILE]`
- Cú pháp toàn bộ file mới: đạt
- Quyền: 10/10 vai trò mở được tab, cửa phòng lọc đúng theo vai trò
- Chưa chạy thử end-to-end vì chưa nối AI

## 13. Giới hạn đã biết

- **Mặt bằng 9 phòng mâu thuẫn với thiết kế mới** — phải bỏ hoặc hạ xuống màn phụ
- **Không có queue** → chuỗi nhiều agent không tự chạy được
- `tin_nhan_chat` không dùng lại được cho hội thoại AI
- Vùng `app.js`, `app.html`, `gop_y` đang có phiên khác giữ → nguy cơ đụng nhau
- Workers AI yếu hơn hẳn ở phần phản biện — rủi ro lớn nhất về chất lượng

## 14. Phase tiếp theo đề xuất

**Phase 2 — REUSE PLAN** (chưa bắt đầu, chờ Sếp):
lập bảng đối chiếu từng concept Sếp nêu → tái dùng / mở rộng / tạo mới, kèm ước lượng và thứ tự làm; chốt 4 quyết định ở mục 11 trước khi viết dòng code nào.
