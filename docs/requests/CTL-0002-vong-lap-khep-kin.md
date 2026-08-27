# CTL-0002 — Vòng lặp khép kín: từ góp ý đã duyệt tới bản chờ nghiệm thu

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc
- **Ngày nhận**: 2026-08-27
- **Category**: `NEW_FEATURE` (hạ tầng điều phối)
- **Risk**: **HIGH** (AI tự sinh code vào repo production)
- **Status**: `NEEDS_OWNER_DECISION` — **Cách A đã chốt** (ADR-0005 + xác minh
  lại sau ADR-0006 A4). Còn chờ Sếp **2 câu M1/M2** ở
  [SPEC-0003](../specs/SPEC-0003-runner-vong-lap.md#cần-erp-owner-quyết)
- **Current Owner**: OWNER → **Next Owner**: KHỈ ĐỘT (Đợt A)

> **Bảng so sánh chi phí ở Mục 3 dưới đây ĐÃ LỖI THỜI.** Cột *"Tiền phát sinh:
> Có (~800k–2tr/tháng)"* của Cách A **không còn đúng** — ADR-0006 A4 cấm dùng
> khoá API tính tiền, và đã xác minh được rằng GitHub Actions chạy được bằng
> **gói Claude Max công ty đã trả** (`CLAUDE_CODE_OAUTH_TOKEN`). Cách A nay
> **không phát sinh tiền Claude**; khoản duy nhất còn chạm tiền là phút chạy
> GitHub Actions. Giữ nguyên văn bản gốc bên dưới để đối chiếu lịch sử —
> số liệu đúng nằm ở SPEC-0003.

---

## 1. Yêu cầu gốc

> *"sao lại vẫn làm tay giao việc cho khỉ đột, chúng mày tự bàn bạc và làm
> sao cho giải quyết yêu cầu của nhân viên đi chứ, chỗ đó cần phải khép kín
> để có vòng lặp"*

Sếp đúng. `scripts/lenh-khidot.mjs` chỉ **in ra** đoạn lệnh rồi Sếp tự dán
sang phiên khác — đó là Sếp làm bưu tá, không phải vòng lặp.

## 2. Ranh giới an toàn — khép kín KHÔNG có nghĩa là AI tự do

Sếp vừa yêu cầu **thêm cổng duyệt** (CTL-0003) và **bỏ dán tay** (CTL-0002).
Hai việc này không mâu thuẫn — chúng ở hai đầu khác nhau của cùng một đường:

```
NHÂN VIÊN GỬI GÓP Ý
   ↓ (tự động) AI chấm phân loại + rủi ro + nháp spec
QUẢN LÝ TRỰC TIẾP DUYỆT        ← CỔNG NGƯỜI #1  (CTL-0003)
SẾP DUYỆT (theo ngưỡng rủi ro) ← CỔNG NGƯỜI #2  (CTL-0003)
   ↓
╔═══ TỪ ĐÂY MÁY TỰ CHẠY, KHÔNG AI PHẢI DÁN GÌ ═══╗
║  Hồ Ly viết Feature Spec                        ║
║  Khỉ Đột code + test + migration                ║
║  Khỉ Đột mở Pull Request                        ║
║  Hồ Ly review                                   ║
║  Cần sửa → quay lại Khỉ Đột (tối đa 3 vòng)     ║
╚═════════════════════════════════════════════════╝
   ↓
BÁO SẾP: "có bản chờ nghiệm thu"  ← CỔNG NGƯỜI #3
SẾP MERGE → GitHub Actions tự deploy
```

**Ba ràng buộc cứng, không thương lượng:**

1. **AI không bao giờ tự merge vào `main`.** Pull Request là ranh giới.
   `main` đã nối thẳng vào deploy production (`.github/workflows/deploy.yml`) —
   cho AI merge là cho AI deploy thẳng lên hệ thống đang chạy thật.
2. **Việc rủi ro `HIGH` không bao giờ được đưa vào vòng tự động.** Chặn ở
   tầng code, không dựa vào AI tự giác.
3. **Migration phá dữ liệu, đổi phân quyền, đổi tích hợp sàn** — chặn cứng,
   dù rủi ro được chấm là gì.

## 3. Hai cách làm — Sếp chọn một

### Cách A — GitHub Actions *(khuyến nghị)*

Chạy trên máy chủ của GitHub, không cần máy Sếp bật.

**Vì sao khuyến nghị:** repo đã ở GitHub
(`ngocbtagc-a11y/erp-agc-noibo`), Actions đã chạy deploy thật, secrets đã
có sẵn cơ chế. Xây thêm một workflow là việc quen thuộc, không phải hạ tầng mới.

**Cách chạy:** Worker gọi GitHub API khi một góp ý được duyệt đủ cấp →
Action khởi chạy → Hồ Ly viết spec → Khỉ Đột code → mở PR → Hồ Ly review →
ghi kết quả ngược về bảng `gop_y` → báo Telegram cho Sếp.

**Chi phí:** cần `ANTHROPIC_API_KEY` — trả theo lượng dùng, **khác** gói
Claude Code Sếp đang trả hàng tháng.

Ước tính một chu kỳ đầy đủ (spec + code + review) cho một việc nhỏ ERP:

| Model | Một việc | 20 việc/tháng |
|---|---|---|
| Sonnet 5 | ~1–2 USD | ~30 USD (~800 nghìn đồng) |
| Opus 5 | ~3–5 USD | ~80 USD (~2 triệu đồng) |

Đây là **ước tính**, chưa phải số thật. Tôi sẽ đo bằng 3 việc đầu tiên rồi
báo Sếp con số thực tế. Có thể đặt trần `MAX_COST_PER_REQUEST` để không
bao giờ vượt ngưỡng Sếp cho phép.

**Rủi ro:** phát sinh tiền thật hàng tháng; cần đẩy code lên GitHub thường xuyên.

### Cách B — Máy Sếp chạy nền

Cài Claude Code CLI (`npm i -g @anthropic-ai/claude-code`), viết runner Node,
đặt lịch bằng Windows Task Scheduler quét mỗi 5–10 phút.

**Ưu:** dùng gói Claude Code Sếp **đang trả rồi**, không phát sinh tiền API.

**Nhược:** máy Sếp phải bật. Tắt máy, mất điện, đi công tác → vòng lặp đứng.
Với ERP đang chạy thật cho 20 người, đây là điểm yếu đáng kể.
Ngoài ra chưa xác minh được Claude Code CLI chạy nền không cần người bấm
duyệt từng thao tác — phải thử mới biết chắc.

### So sánh nhanh

| | Cách A — GitHub Actions | Cách B — Máy Sếp |
|---|---|---|
| Máy phải bật | Không | **Có** |
| Tiền phát sinh | **Có** (~800k–2tr/tháng) | Không |
| Đã có sẵn hạ tầng | **Có** (Actions đang chạy) | Chưa (phải cài CLI) |
| Chắc chắn chạy được | **Cao** | Chưa xác minh |
| Nhìn tiến trình ở đâu | Tab Actions trên GitHub | Log trên máy |

## 4. Thứ tự làm

1. **CTL-0003 trước** (cổng duyệt + ràng buộc trạng thái). Không thể mở
   tự động khi trạng thái còn bấm được tuỳ ý — sẽ tự động hoá một quy trình
   đang hỏng. Hiến pháp điều 16: *không tự động hoá một process chưa hiểu đủ.*
2. **CTL-0002 sau**: runner + `current_owner`/`next_owner` + đếm vòng sửa
   (`MAX_FIX_LOOPS = 3`) + `AUTOMATION_MODE` + `KILL_SWITCH`.
3. Chạy thử **3 việc rủi ro THẤP** trước khi mở rộng. Đo chi phí thật.

## 5. Ràng buộc kỹ thuật cho spec

- Runner là **One Writer** duy nhất của trạng thái. Agent trả kết quả,
  runner mới ghi vào DB. Agent không tự ghi `trang_thai`.
- `MAX_FIX_LOOPS = 3` · `MAX_AGENT_RETRIES = 2` · `MAX_RUNTIME_PER_JOB` ·
  `MAX_COST_PER_REQUEST`. Vượt ngưỡng → `bi_chan` + báo Sếp, không chạy tiếp.
- `KILL_SWITCH`: Sếp nói *"Gạo, dừng toàn bộ"* → không job mới nào được tạo,
  job đang chạy dừng an toàn, **không mất yêu cầu nào đang chờ**.
- Chỉ một tiến trình điều phối chạy tại một thời điểm. Hai góp ý đụng cùng
  vùng code → xếp hàng, không chạy song song (Rule 11 — One Writer Per Area).
- Không hardcode khoá. `ANTHROPIC_API_KEY` vào GitHub Secrets, không vào file.
- EXTEND bảng `gop_y`. Không tạo hàng đợi thứ hai (`SPEC-0001` đã phải rút
  vì đúng lỗi này).

## 6. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Sếp yêu cầu bỏ dán tay, khép kín vòng lặp |
| `NEW` | `TRIAGE` | GẠO | 2026-08-27 | Xác minh: Claude Code CLI chưa cài trên máy; repo đã có GitHub Actions chạy thật |
| `TRIAGE` | `NEEDS_OWNER_DECISION` | GẠO | 2026-08-27 | Hai cách làm khác nhau về tiền và rủi ro — Owner Gate |
| — | (giữ `NEEDS_OWNER_DECISION`) | HỒ LY | 2026-08-27 | **Xác minh lại sau ADR-0006 A4.** Anthropic hỗ trợ chính thức chạy GitHub Actions bằng token gói thuê bao (`CLAUDE_CODE_OAUTH_TOKEN`, gói Pro/Max/Team/Enterprise) — [tài liệu chính thức](https://code.claude.com/docs/en/github-actions). **Cách A giữ nguyên, KHÔNG quay lại Cách B**: tiêu chí "không tốn thêm tiền" nay thoả bằng Cách A, nên Cách B không còn ưu điểm nào mà vẫn giữ nhược điểm máy phải bật. Đề xuất sửa ADR-0005 ghi trong SPEC-0003 |
