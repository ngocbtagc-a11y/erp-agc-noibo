# SPEC-0003 — Runner khép kín vòng lặp trên GitHub Actions

- **Yêu cầu gốc**: [CTL-0002](../requests/CTL-0002-vong-lap-khep-kin.md)
- **Quyết định kiến trúc đã chốt**: [ADR-0005](../decisions/ADR-0005-vong-lap-khep-kin-github-actions.md)
  (**mục 1 và mục "Hệ quả" đã bị ADR-0006 A4 sửa** — xem dưới) ·
  [ADR-0006](../decisions/ADR-0006-cong-duyet-va-chi-phi-token.md)
- **Người viết**: HỒ LY (Agent A)
- **Ngày viết**: 2026-08-27 · **Sửa lần 2**: 2026-08-27 sau ADR-0006
- **Risk**: **HIGH** (AI sinh code vào repo đang chạy production)
- **Boundary Classification**: `CORE_CHANGE` + `INTEGRATION_CHANGE`
- **Status**: `NEEDS_OWNER_DECISION` — **KHÔNG được chuyển `READY_FOR_BUILD`**
  cho tới khi Sếp chốt **2 câu còn lại** ở mục [Cần ERP Owner quyết](#cần-erp-owner-quyết).
  (5 câu bản cũ: 4 câu đã có đáp án trong ADR-0006 B7–B10, 1 câu đã bị bãi bỏ.)
- **Phụ thuộc**: Đợt B chờ [SPEC-0002](./SPEC-0002-cong-duyet-gop-y.md) merge xong.

---

## Đã chốt sẵn, spec này KHÔNG bàn lại

Sếp đã quyết trong ADR-0005 và ADR-0006. Ghi lại để không ai mở lại tranh luận:

1. Chạy trên **GitHub Actions**, không phải máy Sếp. *(ADR-0005 mục 1 — giữ
   nguyên; chỉ **cách xác thực** đổi, xem mục 6 dưới đây.)*
2. Model **`claude-opus-5`** cho cả Hồ Ly và Khỉ Đột.
3. **AI không bao giờ tự merge vào `main`.** Pull Request là ranh giới cứng
   (`main` nối thẳng deploy production qua `.github/workflows/deploy.yml`).
4. Việc rủi ro `HIGH` **không bao giờ** vào vòng tự động — chặn ở tầng code,
   không dựa vào Agent tự giác.
5. Runner ra đời với `AUTOMATION_MODE = PAUSED`, chỉ bật sau khi SPEC-0002
   đã chạy thật (Hiến pháp điều 18: không tự động hoá một process chưa hiểu đủ).
6. **CẤM `ANTHROPIC_API_KEY` tính tiền theo lượng dùng.** Runner xác thực bằng
   gói Claude Max công ty **đã trả rồi**. Hết token → dừng, chờ phiên kế tiếp,
   tự chạy lại. Không mua thêm, không tự nâng gói, không đổi sang khoá tính tiền.
   *(ADR-0006 A4 — nguyên văn Sếp: "tài khoản này đã mua max rồi, nếu dùng hết
   token thì dừng chờ phiên tiếp theo, ko tự ý mua thêm".)*
7. Mở tự động **từng bước**: `ASSISTED` → `BUG_FIX_ONLY` → `AUTOMATIC`.
   Không nhảy cóc. *(ADR-0006 B7.)*
8. Chỉ rủi ro `LOW` vào vòng tự động cho 3 việc đầu. *(ADR-0006 B8.)*
9. Được tạo 2 bảng mới `cau_hinh_he_thong` + `agent_run`. *(ADR-0006 B9.)*
10. Nút **DỪNG TOÀN BỘ**: Sếp + Admin dự phòng. *(ADR-0006 B10.)*

---

## Xác thực bằng gói thuê bao — kết quả xác minh

> Đây là mục quan trọng nhất của bản sửa lần 2. ADR-0006 A4 yêu cầu:
> *"phải xác minh GitHub Actions chạy được bằng thông tin gói thuê bao.
> Xác minh trước, đừng đoán."* Dưới đây là bằng chứng, không phải phỏng đoán.

### Kết luận: **CHẠY ĐƯỢC — kèm 5 điều kiện**

Anthropic hỗ trợ chính thức việc chạy Claude trên GitHub Actions bằng
**thông tin đăng nhập của gói thuê bao**, không cần khoá API tính tiền.

**Bằng chứng (tài liệu chính thức của Anthropic):**

| Nguồn | Nội dung dẫn |
|---|---|
| [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) — mục *Manual setup* | `CLAUDE_CODE_OAUTH_TOKEN` là *"an OAuth token that authenticates with your Claude subscription, available on Pro, Max, Team, and Enterprise plans"*. Truyền vào workflow qua input `claude_code_oauth_token`, thay cho `anthropic_api_key` |
| [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) — mục *Manage costs* | *"If you authenticate with an OAuth token, runs use your Claude subscription instead of API billing."* — câu này chính là thứ Sếp yêu cầu |
| [Authentication — Generate a long-lived token](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token) | *"generate a one-year OAuth token with `claude setup-token`"*; *"This token authenticates with your Claude subscription and requires a Pro, Max, Team, or Enterprise plan."* |

**Vì kết luận là CÓ, kiến trúc GIỮ NGUYÊN Cách A (GitHub Actions).
KHÔNG quay lại Cách B (máy Sếp chạy nền).**

Lý do: tiêu chí "không tốn thêm tiền" nay đã **thoả bằng Cách A**. Khi hai cách
ngang nhau về tiền, Cách A thắng tuyệt đối ở tiêu chí còn lại — máy Sếp không
cần bật, mất điện/đi công tác vòng lặp vẫn chạy. Đề xuất sửa ADR-0005 nằm ở
mục [Đề xuất sửa ADR-0005](#đề-xuất-sửa-adr-0005).

### Năm điều kiện — Khỉ Đột phải làm đúng, không được bỏ qua cái nào

| # | Điều kiện | Hệ quả nếu làm sai |
|---|---|---|
| **Đk1** | Phải **cài Claude Code CLI một lần trên máy Sếp** để chạy `claude setup-token` (ADR-0005 đã kiểm chứng CLI **chưa cài**). Đây là việc **một lần**, xong rồi máy tắt cũng được | Không có CLI thì không sinh được token. Đây là bước duy nhất còn cần máy Sếp |
| **Đk2** | Token sống **1 năm** → hết hạn khoảng **08/2027**. Phải có nhắc hạn | Token chết giữa chừng, runner đứng im mà không ai biết vì sao |
| **Đk3** | Token gắn với **tài khoản của người chạy `claude setup-token`**. Runner sẽ **ăn chung hạn mức Max với chính người đó** | Runner chạy nặng lúc Sếp đang làm việc → Sếp bị hết token oan. Xem [Câu 1 cần Sếp quyết](#cần-erp-owner-quyết) |
| **Đk4** | Runner phải gọi Claude qua `anthropics/claude-code-action@v1` (input `claude_code_oauth_token`) **hoặc** Claude Code CLI với biến môi trường `CLAUDE_CODE_OAUTH_TOKEN`. **KHÔNG được** gọi thẳng `POST https://api.anthropic.com/v1/messages` | Gọi thẳng API là quay lại mô hình tính tiền — đúng thứ Sếp cấm |
| **Đk5** | **KHÔNG được truyền cờ `--bare`.** Tài liệu ghi rõ: *"Bare mode does not read `CLAUDE_CODE_OAUTH_TOKEN`"* | `--bare` là cờ Anthropic khuyến nghị cho CI — nhưng ở đây dùng nó sẽ **âm thầm rơi về đòi `ANTHROPIC_API_KEY`**. Cái bẫy dễ mắc nhất của cả spec này |

> **Đk4 bãi bỏ thiết kế cũ của `scripts/runner/goi-agent.mjs`.** Bản trước ghi
> "mỗi lần gọi Anthropic API, đọc `usage.input_tokens` từ response". Không còn
> response thô để đọc. Cách đo mới ở mục [Đo mức tiêu thụ](#7-đo-mức-tiêu-thụ-và-báo-sếp).

### Thứ DUY NHẤT còn tốn tiền thật: phút chạy GitHub Actions

Phải nói thẳng để Sếp không bị bất ngờ. Token Claude hết tốn tiền, nhưng
[tài liệu Anthropic](https://code.claude.com/docs/en/github-actions) ghi rõ mỗi
lượt chạy tiêu **hai** loại tài nguyên, loại thứ hai là *"GitHub Actions
minutes: the Claude Code GitHub Action runs on GitHub-hosted runners"*.

Repo `erp-agc-noibo` là repo **riêng tư** → phút chạy tính vào hạn mức của tài
khoản GitHub. Ước lượng trần xấu nhất theo chính các ngưỡng trong spec này:

```
20 việc/tháng × 3 bước (spec + build + review) × 30 phút trần = 1.800 phút/tháng
```

Con số này **nằm trong hạn mức miễn phí 2.000 phút/tháng của gói GitHub Free
cho repo riêng tư** — nhưng biên an toàn mỏng, và đây mới là **trần lý thuyết**
(thực tế mỗi bước hiếm khi chạy hết 30 phút).

Ba chốt chặn bắt buộc, để phút chạy không bao giờ thành hoá đơn:

1. `timeout-minutes: 30` trên mọi job — đã có, giữ nguyên.
2. `concurrency` giới hạn **1 job tại một thời điểm** — đã có, giữ nguyên.
3. **Thêm mới**: `cau_hinh_he_thong.MAX_PHUT_ACTIONS_THANG` (mặc định `1200`).
   Runner cộng dồn `giay_chay` từ `agent_run`; vượt trần → tự `PAUSED` với
   `PAUSED_LY_DO='VUOT_PHUT_ACTIONS'` + Telegram. **Không tự nới, không tự mua.**

**Hành động cho Sếp trước Đợt 0**: vào GitHub → Settings → Billing, xác nhận
hạn mức phút Actions còn lại và **đặt spending limit = 0** để GitHub không bao
giờ tự tính tiền vượt hạn mức. Một lần bấm, chặn cứng đường chảy máu tiền
cuối cùng.

---

## Hết token thì làm gì — ADR-0006 A4 mục 2 và 3

> Yêu cầu của Sếp, dịch sang ngôn ngữ máy:
> **(a)** hết token → dừng, chờ phiên kế tiếp, **tự chạy lại**;
> **(b)** **không mất việc nào**, việc đang dở giữ nguyên trạng thái và ghi rõ
> *"đang chờ phiên token kế tiếp"*.

### Phát hiện hết token thế nào

Runner chạy Claude với `--output-format stream-json`. Tài liệu Anthropic
([Run Claude Code programmatically](https://code.claude.com/docs/en/headless))
định nghĩa sự kiện `system` / `subtype: "api_retry"` có trường `error` nhận
**đúng một** trong các giá trị:
`authentication_failed` · `oauth_org_not_allowed` · `billing_error` ·
`rate_limit` · `overloaded` · `invalid_request` · `model_not_found` ·
`server_error` · `max_output_tokens` · `unknown`.

**Đây là tín hiệu máy đọc được, không phải dò chuỗi trong log.** Phân loại:

| `error` bắt được | Nghĩa | Runner làm gì |
|---|---|---|
| `rate_limit` | **Hết token phiên** | → `CHO_TOKEN` (xem dưới). Đúng ca Sếp mô tả |
| `authentication_failed` · `oauth_org_not_allowed` | Token hết hạn 1 năm, bị thu hồi, hoặc sai tổ chức | → `PAUSED` + Telegram **"cần Sếp cấp lại token"**. **Không** tự chạy lại — chạy lại cũng hỏng |
| `billing_error` | Gói có vấn đề thanh toán | → `PAUSED` + Telegram cho Sếp. **Tuyệt đối không** tự xử lý — đây là việc chạm tiền |
| `overloaded` · `server_error` | Anthropic tạm quá tải | → thử lại theo `MAX_AGENT_RETRIES`. Không phải hết token |
| còn lại | Lỗi kỹ thuật | → `THAT_BAI`, đếm `so_lan_thu_lai` như cũ |

Lớp chặn thứ hai (phòng khi `stream-json` không bắt được): job thoát với mã
khác 0 **và** stdout/kết quả có dấu hiệu hạn mức → cũng xử như `rate_limit`.
Thà nhận nhầm thành "chờ token" (chỉ chậm) còn hơn nhận nhầm thành "lỗi kỹ
thuật" (đốt `so_lan_thu_lai` rồi `bi_chan` oan một việc không có lỗi gì).

### `CHO_TOKEN` — trạng thái mới, và vì sao KHÔNG dùng lại `THAT_BAI`

Thêm **một** giá trị vào `agent_run.trang_thai`: `CHO_TOKEN`.

**Đây là chỗ dễ làm hỏng nhất của cả spec.** Nếu Khỉ Đột tiện tay ghi
`THAT_BAI`, hệ thống sẽ `so_lan_thu_lai += 1`; hết token 2 lần liên tiếp là
việc đó bị `bi_chan` **dù nó không sai gì cả** — vi phạm thẳng yêu cầu
"không mất việc nào". Vì thế:

> **`CHO_TOKEN` KHÔNG BAO GIỜ tăng `so_lan_thu_lai`.** Ràng buộc cứng,
> có Acceptance Criteria số 20 kiểm.

Việc runner làm khi bắt được hết token, đúng thứ tự:

1. `agent_run.trang_thai = 'CHO_TOKEN'`, ghi `ket_thuc_luc`.
2. **Nhả khoá**: `gop_y.job_id_hien_tai = NULL`, `job_bat_dau_luc = NULL`.
   Nhả khoá để vùng code không bị kẹt vĩnh viễn — nhưng **giữ nguyên
   `gop_y.trang_thai`**, không lùi, không đổi.
3. `so_lan_thu_lai` **giữ nguyên**. `so_vong_sua` **giữ nguyên**.
4. Ghi 1 dòng `gop_y_lich_su`: `tac_nhan='RUNNER'`, `nguoi_doi_id=NULL`,
   `ghi_chu='[RUNNER] Hết token phiên — việc giữ nguyên, chờ phiên token kế tiếp'`.
5. Đặt `cau_hinh_he_thong`:
   - `AUTOMATION_MODE = 'PAUSED'`
   - `PAUSED_LY_DO = 'HET_TOKEN'`
   - `PAUSED_TU_LUC = <giờ VN hiện tại>`
   - `THU_LAI_SAU_LUC = <giờ VN + THU_LAI_MOI_PHUT>`
6. Telegram **một tin ngắn**: *"Hết token phiên. Đã dừng, giữ nguyên N việc
   đang chờ. Tự chạy lại khi có phiên mới."* — không log, không code.

Branch và công đã làm dở của Agent **vẫn nằm trên GitHub**, không xoá gì.

### Biết khi nào phiên mới bắt đầu — nói thật về giới hạn

**Tôi KHÔNG tìm được tài liệu chính thức nào của Anthropic công bố một trường
máy đọc được kiểu "phiên mới bắt đầu lúc mấy giờ".** Không bịa ra một API
không tồn tại. Thứ xác minh được:

- Hạn mức gồm **phiên trượt 5 giờ** cộng thêm **trần tuần** đặt lại vào một
  mốc cố định mà Anthropic gán cho từng tài khoản.
- Khi chạm hạn mức, Claude Code **hiển thị cho người dùng** còn bao lâu nữa
  mới dùng tiếp được — nhưng đó là chữ hiện trên màn hình, **không phải hợp
  đồng dữ liệu** để code bám vào. Bám vào là code sẽ vỡ khi Anthropic đổi câu chữ.

Vì vậy dùng **cách dò, không dùng cách đoán** — chắc chắn đúng dù Anthropic
đổi gì:

> **Chính lần chạy thành công là bằng chứng phiên mới đã bắt đầu.**

Cơ chế `thuLaiKhiCoToken(env)`, chạy đầu mỗi lượt cron 5 phút:

1. Chỉ chạy khi `AUTOMATION_MODE='PAUSED'` **và** `PAUSED_LY_DO='HET_TOKEN'`.
   Mọi lý do dừng khác → bỏ qua.
2. Chưa tới `THU_LAI_SAU_LUC` → return.
3. Tới giờ → chạy **một phép thử cực rẻ**: dispatch workflow ở chế độ
   `--tham-do` (prompt một dòng, `--max-turns 1`, không checkout, không ghi DB,
   không mở PR). Vài giây, tốn không đáng kể.
4. Thử **thành công** → `AUTOMATION_MODE` về **đúng mức trước khi dừng**
   (lưu ở `MODE_TRUOC_KHI_DUNG`), xoá `PAUSED_LY_DO`, Telegram
   *"Đã có phiên token mới, chạy tiếp N việc."* Lượt cron sau tự nhặt việc —
   **không cần ai bấm gì.**
5. Thử **vẫn `rate_limit`** → `THU_LAI_SAU_LUC += THU_LAI_MOI_PHUT`, im lặng
   chờ tiếp. **Không** bắn Telegram lần hai (chống làm phiền — Rule 12).

Cấu hình dò: `THU_LAI_MOI_PHUT` mặc định **30**. Trong xấu nhất — trần tuần
cạn — hệ thống dò 48 lần/ngày, mỗi lần vài giây. Rẻ hơn nhiều so với việc
đoán sai rồi nằm chờ 5 tiếng khi thật ra token đã có lại sau 40 phút.

### Ba lằn ranh không được vượt

1. **Tự chạy lại CHỈ áp dụng cho `PAUSED_LY_DO='HET_TOKEN'`.**
   Sếp bấm dừng (`PAUSED_LY_DO='OWNER'`) → **không bao giờ** tự bật lại.
   Máy không được lật quyết định của người.
2. **`KILL_SWITCH=1` chặn tất cả**, kể cả phép thử dò token.
3. **Không có bất kỳ đường code nào** dẫn tới mua thêm, nâng gói, hay đổi sang
   `ANTHROPIC_API_KEY`. Acceptance Criteria số 21 kiểm bằng `grep` trên repo.

---

## Problem

`scripts/lenh-khidot.mjs` chỉ **in ra màn hình** một đoạn lệnh; Sếp tự copy
sang một phiên Claude Code khác. Sếp đang làm bưu tá giữa hai Agent.
`docs/AUTOMATION-CURRENT-STATE.md` ghi rõ ba khoảng trống:

- `AUTOMATION_GAP #1` — giao việc cho Khỉ Đột: MANUAL
- `AUTOMATION_GAP #2` — Hồ Ly review sau build: MANUAL
- `AUTOMATION_GAP #3` — fix loop: không có bộ đếm, không có `MAX_FIX_LOOPS`

Ngoài ra chưa có: `AUTOMATION_MODE`, `KILL_SWITCH`, trần ngân sách tiêu thụ,
`MAX_RUNTIME_PER_JOB`, không có Agent Run log, không có cơ chế xếp hàng khi
hai việc đụng cùng vùng code, và **không có cách nào để hệ thống tự dừng rồi
tự chạy lại khi hết token** — yêu cầu mới của Sếp ở ADR-0006 A4.

---

## Current flow

```
gop_y.trang_thai = 'da_duyet'
        ↓  ⟵ NGƯỜI: chạy tay `node scripts/lenh-khidot.mjs <id>`
Đoạn lệnh in ra console
        ↓  ⟵ NGƯỜI: bôi đen, copy
Phiên Claude Code mới (Khỉ Đột)
        ↓  ⟵ NGƯỜI: đọc handoff, copy sang phiên Hồ Ly
Phiên Claude Code khác (Hồ Ly review)
        ↓  ⟵ NGƯỜI: đổi trạng thái tay trên UI
gop_y.trang_thai = 'cho_nghiem_thu'
```

---

## Proposed flow

```
gop_y đã qua CỔNG 1 + CỔNG 2 (SPEC-0002), risk ≠ HIGH, tu_dong = 1
        ↓
Worker cron */5 (ĐÃ CÓ) → runnerQuetViec(env)
   ├─ KILL_SWITCH bật / AUTOMATION_MODE=PAUSED  → dừng, không tạo job mới
   ├─ vung_code đang bị khoá bởi job khác        → bỏ qua, thử lượt sau
   └─ Nhận khoá (UPDATE ... WHERE job_id_hien_tai IS NULL)
        ↓  POST https://api.github.com/.../workflows/agent-runner.yml/dispatches
╔════ GITHUB ACTIONS — agent-runner.yml ═════════════════════════════╗
║  buoc = HOLY_SPEC   → gọi claude-opus-5, sinh docs/specs/SPEC-XXXX ║
║  buoc = KHIDOT_BUILD→ gọi claude-opus-5, sửa code, tạo branch + PR ║
║  buoc = HOLY_REVIEW → gọi claude-opus-5, đọc diff PR, chấm đạt/sửa ║
║  MỌI BƯỚC: đo token → USD, kiểm trần, timeout-minutes              ║
╚════════════════════════════════════════════════════════════════════╝
        ↓  POST /api/runner/ket-qua  (HMAC, idempotent theo job_id)
Worker = ONE WRITER: validate → chạy đúng ma trận SPEC-0002 → ghi gop_y
        ↓
Cần sửa → quay lại KHIDOT_BUILD (tối đa 3 vòng)
Đạt     → 'cho_nghiem_thu', next_owner='OWNER', Telegram: "có bản chờ nghiệm thu"
        ↓
CỔNG NGƯỜI #3: Sếp xem PR → merge → deploy.yml tự chạy (ĐÃ CÓ)
```

---

## Actors

| Tư cách | Là gì | Được làm |
|---|---|---|
| Worker cron | `scheduled()` trong `src/index.js` | Chọn việc, nhận khoá, gọi GitHub API, chạy watchdog |
| GitHub Actions job | `agent-runner.yml` | Chạy Agent, tạo branch + PR, báo kết quả về |
| Hồ Ly | `claude-opus-5` qua **Claude Code Action + token gói thuê bao** | **Trả JSON kết quả.** Không có tool ghi DB |
| Khỉ Đột | `claude-opus-5` qua **Claude Code Action + token gói thuê bao** | Sửa file trong workspace của Actions. Không có credential DB |
| Runner (endpoint Worker) | `POST /api/runner/ket-qua` | **One Writer DUY NHẤT của `trang_thai`** |
| ERP Owner | Sếp | Merge PR, bật/tắt `AUTOMATION_MODE`, bấm `KILL_SWITCH` |

**Ranh giới cứng**: Agent **không bao giờ** nhận `CLOUDFLARE_API_TOKEN`,
`D1` binding, hay khoá ghi DB. Agent trả JSON; runner mới ghi.

---

## Data

### Bảng mới — 2 bảng, đã kiểm chứng KHÔNG có bảng tương đương

Đã liệt kê toàn bộ 47 bảng trong `schema.sql` + `migrations/`. **Không có
bảng cấu hình/cài đặt nào.** Thứ gần nhất là `bo_dem_ma(loai TEXT PK,
tiep_theo INTEGER)` — chỉ chứa **số nguyên** cho bộ đếm mã nhân sự/tài sản,
không lưu được chuỗi `PAUSED`/`AUTOMATIC`. Nhồi vào là bóp méo ý nghĩa bảng.

#### 1. `cau_hinh_he_thong` — `migrations/them-cau-hinh-he-thong.sql`

```sql
CREATE TABLE IF NOT EXISTS cau_hinh_he_thong (
  khoa            TEXT PRIMARY KEY,
  gia_tri         TEXT NOT NULL,
  mo_ta           TEXT,
  cap_nhat_boi_id TEXT REFERENCES nhan_su(id),
  cap_nhat_luc    TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
```

**Vì sao phải là bảng DB, không phải biến môi trường Cloudflare**: yêu cầu của
Sếp là *"Gạo, dừng toàn bộ"* → phải dừng **ngay**. Biến môi trường muốn đổi
phải deploy lại (vài phút, và cần người biết wrangler). Bảng DB đổi trong 1 giây
bằng một nút đỏ trên tab Góp ý.

Khoá khởi tạo:

| `khoa` | Giá trị đầu | Ý nghĩa |
|---|---|---|
| `AUTOMATION_MODE` | **`PAUSED`** | `MANUAL`/`ASSISTED`/`BUG_FIX_ONLY`/`AUTOMATIC`/`PAUSED` |
| `KILL_SWITCH` | `0` | `1` = dừng tạo job mới, mọi mode |
| `MAX_FIX_LOOPS` | `3` | Số vòng sửa tối đa |
| `MAX_AGENT_RETRIES` | `2` | Số lần thử lại khi job lỗi kỹ thuật |
| `MAX_RUNTIME_PHUT` | `30` | Trần thời gian một job |
| `RISK_TU_DONG_TOI_DA` | `LOW` | Mức rủi ro cao nhất được vào vòng tự động (ADR-0006 B8) |
| `VUNG_CAM_TU_DONG` | `core,quantri,ketoan` | Vùng code không bao giờ tự động |
| **`PAUSED_LY_DO`** | `''` | `OWNER` · `HET_TOKEN` · `TOKEN_HONG` · `VUOT_PHUT_ACTIONS` · `VUOT_NGAN_SACH`. **Chỉ `HET_TOKEN` mới được tự chạy lại** |
| **`MODE_TRUOC_KHI_DUNG`** | `''` | Mức tự động trước khi máy tự dừng — để trả về đúng chỗ cũ, không tự nâng cấp |
| **`PAUSED_TU_LUC`** | `''` | Giờ VN bắt đầu dừng |
| **`THU_LAI_SAU_LUC`** | `''` | Giờ VN sớm nhất được dò lại token |
| **`THU_LAI_MOI_PHUT`** | `30` | Khoảng cách giữa hai lần dò token |
| **`MAX_LUOT_CHAY_NGAY`** | `12` | Trần **lượt chạy/ngày** — ngân sách tiêu thụ hạn mức Max, thay cho trần tiền cũ |
| **`LUOT_CHAY_HOM_NAY` / `LUOT_CHAY_NGAY_MA`** | `0` / `2026-08-27` | Bộ đếm lượt/ngày, tự reset khi sang ngày mới (giờ VN) |
| **`MAX_PHUT_ACTIONS_THANG`** | `1200` | Trần phút chạy GitHub Actions/tháng — **thứ duy nhất còn tốn tiền thật** |
| **`PHUT_ACTIONS_THANG` / `PHUT_ACTIONS_THANG_MA`** | `0` / `2026-08` | Bộ đếm phút Actions, tự reset theo tháng |
| **`TOKEN_HET_HAN_NGAY`** | `2027-08-27` | Hạn 1 năm của `CLAUDE_CODE_OAUTH_TOKEN`; nhắc Sếp trước 30 ngày |

**Đã bỏ khỏi bảng (ADR-0006 A4 bãi bỏ):** `MAX_COST_PER_REQUEST_USD`,
`MAX_COST_PER_MONTH_USD`, `GIA_INPUT_USD_1M`, `GIA_OUTPUT_USD_1M`,
`TY_GIA_VND`, `CHI_PHI_THANG_HIEN_TAI`, `CHI_PHI_THANG_MA`.
Chạy bằng gói đã trả rồi thì **không có đồng nào để đếm** — giữ mấy khoá này
lại chỉ tạo ảo giác đang kiểm soát chi tiêu. Thứ thật sự cần chặn là **mức
tiêu thụ hạn mức** (`MAX_LUOT_CHAY_NGAY`) và **phút Actions**
(`MAX_PHUT_ACTIONS_THANG`).

Ý nghĩa từng `AUTOMATION_MODE`:

| Mode | Runner làm gì |
|---|---|
| `MANUAL` | Không làm gì. Đúng hiện trạng hôm nay |
| `ASSISTED` | Chỉ chạy `HOLY_SPEC`, dừng trước build. Người xem spec rồi bấm tiếp |
| `BUG_FIX_ONLY` | Chỉ tự động với `loai='loi'` **và** `risk='LOW'` |
| `AUTOMATIC` | Chạy đủ vòng tới Pull Request |
| `PAUSED` | Dừng hẳn nhưng **giữ nguyên hàng đợi**. Khác `MANUAL` ở chỗ đây là trạng thái tạm và có báo Telegram khi vào/ra. Đọc kèm `PAUSED_LY_DO` — chỉ `HET_TOKEN` mới tự chạy lại |

**Không thêm mode mới cho việc hết token** (Rule 5 — tái dùng trước khi tạo mới).
`PAUSED` đã diễn tả đúng *"dừng, giữ nguyên hàng đợi"*; thứ còn thiếu chỉ là
**lý do** dừng — thêm một khoá `PAUSED_LY_DO` là đủ, không cần đẻ thêm trạng thái.

#### 2. `agent_run` — `migrations/them-agent-run.sql`

```sql
CREATE TABLE IF NOT EXISTS agent_run (
  job_id          TEXT PRIMARY KEY,        -- uuid Worker sinh trước khi dispatch
  gop_y_id        INTEGER NOT NULL REFERENCES gop_y(id),
  buoc            TEXT NOT NULL,           -- HOLY_SPEC | KHIDOT_BUILD | HOLY_REVIEW
  agent           TEXT NOT NULL,           -- HOLY | KHIDOT
  model           TEXT NOT NULL,           -- claude-opus-5
  trang_thai      TEXT NOT NULL,           -- DA_GUI | DANG_CHAY | XONG | THAT_BAI | CHET | HUY | CHO_TOKEN
  bat_dau_luc     TEXT NOT NULL,
  ket_thuc_luc    TEXT,
  token_vao       INTEGER DEFAULT 0,
  token_ra        INTEGER DEFAULT 0,
  token_cache     INTEGER DEFAULT 0,
  uoc_tinh_usd    REAL    DEFAULT 0,       -- ƯỚC TÍNH client-side, KHÔNG phải tiền phải trả
  so_luot         INTEGER DEFAULT 0,       -- num_turns — thước đo tiêu thụ hạn mức
  giay_chay       INTEGER DEFAULT 0,       -- cộng dồn thành phút Actions của tháng
  actions_run_url TEXT,
  pr_url          TEXT,
  tom_tat         TEXT,                    -- ≤1000 ký tự, KHÔNG chứa log dài
  loi             TEXT
);
CREATE INDEX IF NOT EXISTS idx_agentrun_gopy ON agent_run (gop_y_id, bat_dau_luc);
```

> **`agent_run` KHÔNG phải hàng đợi yêu cầu thứ hai** — đây là điểm SPEC-0001
> đã chết. Ràng buộc tự áp: bảng này **không có cột `trang_thai` của yêu cầu**,
> **không bao giờ được đọc để quyết định định tuyến** ngoài các bộ đếm
> (`so_lan_thu_lai`, chi phí). `gop_y` vẫn là Source of Truth duy nhất của
> trạng thái. Vai trò của `agent_run` giống `giao_dich_kho` với tồn kho:
> sổ cái thi hành, không phải nơi quyết định. Không có bảng này thì không đo
> được chi phí thật — mà đo chi phí là yêu cầu trực tiếp của Sếp trong ADR-0005.

### Cột thêm trên `gop_y` — Đợt B (`migrations/them-gopy-runner.sql`)

`current_owner` và `next_owner` **đã nằm ở Đợt A của SPEC-0002** — không thêm lại.

| Cột | Kiểu | Mặc định | Dùng cho |
|---|---|---|---|
| `tu_dong` | INTEGER | 0 | Bản ghi này có được vào vòng tự động không |
| `vung_code` | TEXT | NULL | Khoá xếp hàng One Writer Per Area |
| `job_id_hien_tai` | TEXT | NULL | Khoá đang chạy; NULL = rảnh |
| `job_bat_dau_luc` | TEXT | NULL | Watchdog dùng để phát hiện job chết |
| `so_vong_sua` | INTEGER | 0 | `MAX_FIX_LOOPS` |
| `so_lan_thu_lai` | INTEGER | 0 | `MAX_AGENT_RETRIES` |
| `so_luot_chay` | INTEGER | 0 | Tổng lượt máy đã chạy cho yêu cầu này — thay `chi_phi_usd` của bản cũ |
| `handoff_reference` | TEXT | NULL | Điều kiện vào `dang_kiem_tra` (SPEC-0002 ma trận) |
| `review_reference` | TEXT | NULL | Điều kiện vào `cho_nghiem_thu` |
| `decision_reference` | TEXT | NULL | Link quyết định của Sếp khi `cho_quyet_dinh` |
| `pr_so` | INTEGER | NULL | Số PR; link đầy đủ dùng chung `bang_chung_url` (Đợt A) |

```sql
CREATE INDEX IF NOT EXISTS idx_gopy_job   ON gop_y (job_id_hien_tai);
CREATE INDEX IF NOT EXISTS idx_gopy_vung  ON gop_y (vung_code, job_id_hien_tai);
```

---

## Source of Truth

| Sự thật | Nguồn duy nhất |
|---|---|
| Trạng thái yêu cầu | `gop_y.trang_thai` — **chỉ Worker ghi**, qua đúng ma trận SPEC-0002 |
| Ai đang cầm việc | `gop_y.current_owner` / `next_owner` |
| Khoá vùng code (máy) | `gop_y.vung_code` + `job_id_hien_tai` |
| Khoá vùng code (người) | `docs/ACTIVE-WORK.md` |
| Cấu hình tự động | `cau_hinh_he_thong` |
| Mức tiêu thụ hạn mức | `agent_run.so_luot` + `giay_chay` (chi tiết) → `gop_y.so_luot_chay` (một yêu cầu) → `cau_hinh_he_thong.LUOT_CHAY_HOM_NAY` (ngày) |
| Phút GitHub Actions đã dùng | `agent_run.giay_chay` → `cau_hinh_he_thong.PHUT_ACTIONS_THANG`. **Sự thật cuối cùng vẫn là trang Billing của GitHub** — bộ đếm này chỉ để tự chặn sớm |
| Tiền phải trả cho Claude | **Không có.** Chạy bằng gói Max đã trả. `agent_run.uoc_tinh_usd` là ước tính client-side, **không phải hoá đơn** |
| Code | `origin/main` trên GitHub |

**Hai lớp khoá vùng code, cố ý tách**: người dùng `ACTIVE-WORK.md`, máy dùng DB.
Runner **không** được tự sửa `ACTIVE-WORK.md` — file nằm trong repo, sửa từ
Actions sẽ đẻ conflict với chính PR nó đang mở. Thay vào đó mỗi PR do runner
tạo phải in bảng khoá máy vào phần mô tả PR để người đối chiếu bằng mắt.

---

## Core reuse

| Cần | Đã có | Dùng lại |
|---|---|---|
| Hàng đợi yêu cầu | `gop_y` | EXTEND, không tạo cái thứ hai |
| Lịch sử chuyển trạng thái | `gop_y_lich_su` | Runner ghi vào đây, nhưng **với tư cách máy** — cần bản dựng lại ở SPEC-0002 |
| Bộ hẹn giờ | cron `*/5 * * * *` (`wrangler.toml`) | Thêm 1 hàm vào `scheduled()` đã có |
| Báo Sếp | `guiTelegram()` + `guiThongBao()` | Không viết kênh mới |
| Deploy | `.github/workflows/deploy.yml` | **Không đụng.** `agent-runner.yml` là file riêng |
| Khuôn workflow | `deploy.yml` | Bê nguyên cách khai secrets, `actions/checkout@v4`, `setup-node@v4`, `npm ci` |
| Nội dung prompt giao Khỉ Đột | `scripts/lenh-khidot.mjs` | **Tái sử dụng nguyên văn phần dựng prompt**, chỉ đổi đầu ra: thay `console.log` bằng gọi API |
| Luật chuyển trạng thái | `kiemTraChuyenTrangThai()` (SPEC-0002 tách ra) | Runner gọi **đúng hàm đó**, không có đường tắt |

**`scripts/lenh-khidot.mjs` không xoá** — giữ làm đường lùi thủ công khi runner
bị tắt hoặc `KILL_SWITCH` đang bật.

---

## New Domain data

2 bảng mới (`cau_hinh_he_thong`, `agent_run`) + 11 cột trên `gop_y` — liệt kê
đầy đủ ở mục [Data](#data). Không đụng bảng nghiệp vụ nào khác.

---

## Permissions

| Hành động | Ai | Kiểm |
|---|---|---|
| Xem `AUTOMATION_MODE` / chi phí tháng | Admin | `laAdmin()` |
| Đổi `AUTOMATION_MODE` | **chỉ Admin** | `laAdmin()` |
| Bấm `KILL_SWITCH` | Admin (+ `admin_backup` nếu Sếp đồng ý — câu 4) | `laAdmin()` / `duocTaoTaiKhoan()` |
| Đổi trần tiền | **chỉ Admin** | `laAdmin()` |
| `POST /api/runner/ket-qua` | không phải người — HMAC | xem dưới |
| Bật `tu_dong` cho một góp ý | Admin, lúc duyệt cổng 2 | `laAdmin()` |

### Xác thực endpoint runner

`POST /api/runner/ket-qua`, **không dùng phiên đăng nhập**:

- Header `X-Runner-Timestamp` + `X-Runner-Signature` =
  `HMAC-SHA256(RUNNER_SECRET, timestamp + "." + rawBody)`.
- `RUNNER_SECRET`: đặt bằng `npx wrangler secret put RUNNER_SECRET` (phía Worker)
  và GitHub Secrets `RUNNER_SECRET` (phía Actions). **Không nằm trong file nào.**
- Lệch giờ >5 phút → 401 (chống replay).
- `job_id` phải khớp `gop_y.job_id_hien_tai` → nếu không, 409 (job cũ/lạc).
- **Whitelist trạng thái runner được đặt**: `dang_phan_tich`, `dang_lam`,
  `dang_kiem_tra`, `can_chinh_sua`, `cho_nghiem_thu`, `bi_chan`.
  **Cấm tuyệt đối**: `da_duyet`, `san_sang_phat_hanh`, `hoan_thanh`, và mọi
  cột `duyet_*`. Chặn bằng danh sách trắng ở code, không bằng lời dặn Agent.

### Quyền của GitHub Actions job

```yaml
permissions:
  contents: write        # tạo branch, push commit
  pull-requests: write   # mở PR
```
**Không** có quyền nào cho phép merge. Cộng thêm **branch protection trên `main`**
(bật ở Settings GitHub, Sếp làm 1 lần): bắt buộc PR, cấm push thẳng,
cấm `GITHUB_TOKEN` tự phê duyệt.

---

## Happy path

Một góp ý `risk=LOW`, `loai='loi'`, khu vực `khovan`, đã qua 2 cổng:

1. `cron */5` → `runnerQuetViec()` chọn được, đặt khoá, dispatch `HOLY_SPEC`.
2. Actions: Hồ Ly đọc `gop_y` + module liên quan → sinh
   `docs/specs/SPEC-XXXX-....md` → commit vào branch `agent/gy-0012`.
   Báo về: `spec_reference`, chi phí, `trang_thai='dang_lam'`, `next_owner='KHIDOT'`.
3. `cron */5` tiếp → dispatch `KHIDOT_BUILD` cùng branch.
4. Actions: Khỉ Đột sửa code + migration + test → mở PR **draft** →
   báo về `handoff_reference` (mô tả PR), `pr_so`, `trang_thai='dang_kiem_tra'`,
   `next_owner='HOLY'`.
5. `cron */5` tiếp → dispatch `HOLY_REVIEW`. Hồ Ly đọc diff của PR.
   - Đạt → `review_reference`, PR chuyển ready-for-review,
     `trang_thai='cho_nghiem_thu'`, `next_owner='OWNER'`,
     Telegram: *"GY-0012 có bản chờ nghiệm thu — PR #41"*.
   - Chưa đạt → `trang_thai='can_chinh_sua'`, `so_vong_sua += 1`, quay bước 4.
6. Sếp mở PR trên điện thoại, xem, merge → `deploy.yml` (đã có) tự deploy.
7. Sếp bấm Hoàn thành trên ERP, dán link PR vào `bang_chung_url` (SPEC-0002).

**Số lần người phải chạm vào**: 1 (merge PR) + 1 (bấm Hoàn thành). Không còn
lần dán tay nào.

---

## Exception path

| Tình huống | Xử lý |
|---|---|
| `KILL_SWITCH=1` | Không dispatch job mới. Job đang chạy **chạy nốt và ghi kết quả** (không mất công đã tiêu tiền). Hàng đợi giữ nguyên |
| `AUTOMATION_MODE=PAUSED` | Như trên, thêm 1 tin Telegram khi vào/ra chế độ |
| `risk='HIGH'` hoặc chưa chốt `risk` | **Không bao giờ** được chọn. Điều kiện `WHERE` của truy vấn chọn việc, không phải lời dặn Agent |
| `vung_code` nằm trong `VUNG_CAM_TU_DONG` | Không chọn |
| Vùng code đang bị job khác khoá | Bỏ qua, cron sau thử lại. Không chạy song song (Rule 13) |
| Agent trả JSON hỏng | `so_lan_thu_lai += 1`, thử lại; quá `MAX_AGENT_RETRIES` → `bi_chan` |
| Job vượt `MAX_RUNTIME_PHUT` | Actions tự kill (`timeout-minutes`); step `if: always()` báo `THAT_BAI` về |
| Job chết không kịp báo | Watchdog (xem [Phục hồi](#phục-hồi-khi-một-job-chết-giữa-chừng)) |
| `so_vong_sua` đạt `MAX_FIX_LOOPS=3` | `bi_chan`, `next_owner='OWNER'`, Telegram: *"GY-0012 sửa 3 vòng chưa đạt — cần người xem"*. **Branch và PR giữ nguyên**, không xoá công đã làm |
| Vượt `MAX_LUOT_CHAY_NGAY` | Tự `PAUSED` + `PAUSED_LY_DO='VUOT_NGAN_SACH'`, Telegram. **Tự mở lại sáng hôm sau** |
| Vượt `MAX_PHUT_ACTIONS_THANG` | Tự `PAUSED` + `PAUSED_LY_DO='VUOT_PHUT_ACTIONS'`, Telegram. **Không tự bật lại** — chạm tiền thật, Sếp phải bấm |
| **Hết token gói Max** (`api_retry` với `error='rate_limit'`) | `CHO_TOKEN` — nhả khoá, **giữ nguyên trạng thái việc**, **không tăng bộ đếm nào**, chờ phiên kế tiếp rồi tự chạy lại. Xem [Hết token thì làm gì](#hết-token-thì-làm-gì--adr-0006-a4-mục-2-và-3) |
| **Token hết hạn / bị thu hồi** (`authentication_failed`) | `PAUSED` + `PAUSED_LY_DO='TOKEN_HONG'` + Telegram *"cần Sếp cấp lại token"*. **Không** dò lại |
| Agent sửa file ngoài phạm vi (VD `.github/workflows/deploy.yml`, `wrangler.toml`, `src/quyen.js`) | Step kiểm diff **trước khi mở PR**: có file cấm → huỷ push, `bi_chan`, báo Sếp |
| Anthropic tạm quá tải (`overloaded` / `server_error`) | `THAT_BAI` + retry; hết retry → `bi_chan`. **Khác hẳn hết token** — đừng gộp |
| Hai cron Worker chạy chồng | Nhận khoá bằng `UPDATE ... WHERE job_id_hien_tai IS NULL` rồi kiểm `meta.changes === 1`. Thua thì bỏ qua |

---

## Cơ chế chi tiết

### 1. Worker kích hoạt Actions thế nào

Trong `scheduled()` đã có, thêm một dòng vào chuỗi hiện tại
(**không** tạo cron mới, `wrangler.toml` không đổi):

```js
try { await runner.quetViec(env); } catch (e) { console.error('Cron runner:', e.message); }
```

`runner.quetViec(env)` (file mới `src/runner.js`):

1. Đọc `cau_hinh_he_thong`. `KILL_SWITCH=1` → return ngay (chặn cả phép dò token).
   `AUTOMATION_MODE='PAUSED'` **và** `PAUSED_LY_DO='HET_TOKEN'` → chạy
   `thuLaiKhiCoToken(env)` rồi return. `AUTOMATION_MODE` ∈ `{PAUSED, MANUAL}`
   vì lý do khác → return.
2. Vượt `MAX_LUOT_CHAY_NGAY` hoặc `MAX_PHUT_ACTIONS_THANG` → tự `PAUSED` với
   `PAUSED_LY_DO` tương ứng + Telegram, return. **Không tự nới trần.**
3. Chạy `donDepJobChet(env)` (watchdog) **trước** khi chọn việc mới.
3. Chọn **đúng 1** ứng viên:
   ```sql
   SELECT * FROM gop_y
    WHERE tu_dong = 1
      AND job_id_hien_tai IS NULL
      AND trang_thai IN ('cho_phan_tich','da_duyet','dang_kiem_tra','can_chinh_sua')
      AND next_owner IN ('HOLY','KHIDOT')
      AND risk = 'LOW'                          -- theo RISK_TU_DONG_TOI_DA
      AND duyet_cap1_luc IS NOT NULL
      AND (risk = 'LOW' OR duyet_owner_luc IS NOT NULL)
      AND COALESCE(vung_code,'') NOT IN (<VUNG_CAM_TU_DONG>)
      AND vung_code NOT IN (SELECT vung_code FROM gop_y WHERE job_id_hien_tai IS NOT NULL AND vung_code IS NOT NULL)
      AND COALESCE(so_vong_sua,0) < <MAX_FIX_LOOPS>
      AND COALESCE(so_lan_thu_lai,0) < <MAX_AGENT_RETRIES>
    ORDER BY tao_luc ASC LIMIT 1
   ```
4. Sinh `job_id` (`crypto.randomUUID()`), nhận khoá:
   ```sql
   UPDATE gop_y SET job_id_hien_tai = ?, job_bat_dau_luc = datetime('now','+7 hours')
    WHERE id = ? AND job_id_hien_tai IS NULL
   ```
   `meta.changes !== 1` → có kẻ khác giành trước, return.
5. `INSERT INTO agent_run (... trang_thai='DA_GUI')`.
6. Gọi GitHub:
   ```
   POST https://api.github.com/repos/ngocbtagc-a11y/erp-agc-noibo/actions/workflows/agent-runner.yml/dispatches
   Authorization: Bearer <GITHUB_DISPATCH_TOKEN>
   { "ref": "main", "inputs": { "gop_y_id": "12", "buoc": "KHIDOT_BUILD", "job_id": "..." } }
   ```
   - `GITHUB_DISPATCH_TOKEN`: fine-grained PAT, **chỉ** quyền `Actions: write`
     trên **đúng repo này**, đặt bằng `npx wrangler secret put`. Không vào file.
   - Gọi hỏng (≠204) → nhả khoá ngay, `agent_run.trang_thai='THAT_BAI'`.
7. Mỗi lượt cron chỉ dispatch **1 job** — thoả "chỉ một tiến trình điều phối
   chạy tại một thời điểm".

### 2. `current_owner` / `next_owner` lưu thế nào

Hai cột TEXT trên `gop_y`, **đã thêm ở Đợt A của SPEC-0002**. Tập giá trị đóng:
`NGUOI_GUI` · `QL_CAP1` · `OWNER` · `GAO` · `HOLY` · `KHIDOT` · `RUNNER` · `NONE`.

- `current_owner` = ai đang thực sự cầm việc **lúc này**. Khi job chạy thì =
  `HOLY` hoặc `KHIDOT`.
- `next_owner` = ai nhận tiếp sau khi bước hiện tại xong. Đây cũng chính là
  cột "Đang chờ ai" mà SPEC-0002 hiển thị trên danh sách — **một cột phục vụ
  cả hai mục đích, không tách hai khái niệm giống nhau** (Rule 1).
- Backend tự tính từ `(trang_thai, risk, cấu hình)`. **Client không bao giờ
  gửi lên hai cột này.**
- Không tái dùng `nguoi_phu_trach_id`: cột đó FK sang `nhan_su`, Agent không
  phải nhân sự thật — nhồi vào là tạo nhân sự giả, vi phạm Rule 9 và hỏng
  Headcount. Lý do đầy đủ ghi trong SPEC-0002 mục Data.

### 3. Các ngưỡng và cách xử khi vượt

| Ngưỡng | Đếm ở đâu | Tăng khi nào | Vượt thì làm gì |
|---|---|---|---|
| `MAX_FIX_LOOPS = 3` | `gop_y.so_vong_sua` | Mỗi lần vào `can_chinh_sua` | `bi_chan`, `next_owner='OWNER'`, Telegram. Giữ nguyên branch/PR |
| `MAX_AGENT_RETRIES = 2` | `gop_y.so_lan_thu_lai` | Job `THAT_BAI`/`CHET` (lỗi kỹ thuật, **không** phải "code chưa đạt") | `bi_chan` + Telegram |
| `MAX_RUNTIME_PHUT = 30` | `timeout-minutes` của Actions | — | Actions kill; watchdog dọn ở phút 45 |
| `MAX_LUOT_CHAY_NGAY = 12` | `cau_hinh_he_thong.LUOT_CHAY_HOM_NAY` | Sau mỗi job | Tự `PAUSED` + `PAUSED_LY_DO='VUOT_NGAN_SACH'` + Telegram. **Tự mở lại lúc 00:00 giờ VN hôm sau** — đây là ngân sách ngày, không phải sự cố |
| `MAX_PHUT_ACTIONS_THANG = 1200` | `cau_hinh_he_thong.PHUT_ACTIONS_THANG` | Sau mỗi job | Tự `PAUSED` + `PAUSED_LY_DO='VUOT_PHUT_ACTIONS'` + Telegram. **KHÔNG tự bật lại** — đây là thứ chạm tiền thật, chỉ Sếp mở |
| **Hết token phiên** | không đếm | — | `CHO_TOKEN` — **không** tính là vượt ngưỡng, **không** tăng bộ đếm nào. Xem [Hết token thì làm gì](#hết-token-thì-làm-gì--adr-0006-a4-mục-2-và-3) |

Nguyên tắc chung khi vượt: **dừng an toàn, giữ nguyên công đã làm, báo Sếp
một câu ngắn, không bao giờ tự nới ngưỡng.**

Phân biệt cứng, đừng gộp:
**hết token** = tài nguyên tạm cạn, không ai sai → tự chờ rồi chạy tiếp;
**vượt ngưỡng** = hệ thống chạm trần người đặt → dừng và báo;
**thất bại** = có cái gì đó hỏng → đếm và thử lại.
Gộp ba cái này là mất hết khả năng chẩn đoán, và là cách nhanh nhất để một
việc bị `bi_chan` oan.

Phân biệt quan trọng: `so_vong_sua` đếm **chất lượng** (Hồ Ly bảo code chưa
đạt); `so_lan_thu_lai` đếm **sự cố kỹ thuật** (API timeout, runner chết).
Gộp hai cái là mất khả năng chẩn đoán.

### 4. `AUTOMATION_MODE` và `KILL_SWITCH` lưu ở đâu

Bảng `cau_hinh_he_thong` — xem [Data](#data), kèm lý do đã kiểm chứng không
có bảng cấu hình sẵn có để tái dùng.

Giao diện: một khối nhỏ ở đầu tab **Góp ý**, chỉ Admin thấy:

```
Tự động hoá: [ TẠM DỪNG ▾ ]
Lý do dừng: Hết token phiên — đang giữ 3 việc, tự chạy lại khi có phiên mới
Hôm nay: 5/12 lượt        Phút GitHub tháng 8: 340/1200
                                          [ ⛔ DỪNG TOÀN BỘ ]
```

Dòng **"Lý do dừng"** chỉ hiện khi đang `PAUSED`, và phải viết bằng tiếng
người — Sếp nhìn một dòng là biết *máy đang chờ* hay *máy đang hỏng*:

| `PAUSED_LY_DO` | Chữ hiện cho người |
|---|---|
| `HET_TOKEN` | *"Hết token phiên — đang giữ N việc, tự chạy lại khi có phiên mới"* |
| `TOKEN_HONG` | *"Token đã hết hạn hoặc bị thu hồi — cần Sếp cấp lại"* |
| `VUOT_NGAN_SACH` | *"Đã dùng hết N lượt của hôm nay — tự chạy lại sáng mai"* |
| `VUOT_PHUT_ACTIONS` | *"Đã chạm trần phút GitHub tháng này — cần Sếp bấm mở lại"* |
| `OWNER` | *"Sếp đã tạm dừng"* |

**Không hiện số USD ở khối này.** Sếp không trả USD cho Claude nữa; hiện con
số đó chỉ gây hiểu nhầm là đang mất tiền. Số USD ước tính chỉ nằm trong báo
cáo kỹ thuật của 3 việc đầu, kèm chú thích rõ.

Nút **DỪNG TOÀN BỘ** = `KILL_SWITCH=1`. Một lần chạm trên điện thoại.
Bấm lại để mở, có hộp xác nhận. Mỗi lần đổi ghi `cap_nhat_boi_id` + Telegram.

Đúng yêu cầu của Sếp: *"Gạo, dừng toàn bộ"* → không job mới nào được tạo,
job đang chạy dừng an toàn, **không mất yêu cầu nào đang chờ** (hàng đợi là
`gop_y`, không nằm trong bộ nhớ tiến trình nào).

### 5. Xếp hàng khi hai góp ý đụng cùng vùng code (Rule 13)

- Cột `gop_y.vung_code`, tập giá trị đóng lấy từ `docs/MODULE-MAP.md` và
  danh sách tab: `gopy` · `khovan` · `nhansu` · `donhoan` · `kinhdoanh` ·
  `ketoan` · `taisan` · `xepca` · `congviec` · `chat` · `core` · `quantri`.
- Gán khi nào: mặc định suy từ `gop_y.khu_vuc` (người gửi đã chọn); Hồ Ly
  xác nhận/sửa lại ở bước `HOLY_SPEC`; Admin sửa được tay.
- Trước dispatch: nếu tồn tại bản ghi khác **cùng `vung_code`** đang có
  `job_id_hien_tai IS NOT NULL` → bỏ qua, cron sau thử lại. **Không** xây hàng
  đợi riêng — cron 5 phút chính là hàng đợi, `ORDER BY tao_luc ASC` chính là
  thứ tự FIFO.
- `vung_code='core'` (và mọi vùng trong `VUNG_CAM_TU_DONG`) → không bao giờ
  tự động, dù risk gì.
- Nếu một góp ý **không xác định được vùng** (`vung_code IS NULL`) → coi như
  đụng mọi vùng: chỉ chạy khi **không có job nào khác đang chạy**. Thà chậm
  còn hơn hai Agent ghi đè nhau.

### 6. Runner là One Writer DUY NHẤT của trạng thái

- Agent chạy trong Actions **không có** binding D1, không có
  `CLOUDFLARE_API_TOKEN`, không có công cụ ghi DB. Nó chỉ trả về JSON:
  ```json
  {
    "job_id": "...", "ket_qua": "XONG|CAN_SUA|THAT_BAI",
    "tom_tat": "≤1000 ký tự",
    "spec_reference": null, "handoff_reference": null, "review_reference": null,
    "pr_so": 41, "pr_url": "...", "files_changed": ["src/index.js"],
    "risk_phat_hien": "LOW", "token_vao": 0, "token_ra": 0
  }
  ```
- Script runner POST JSON đó lên `/api/runner/ket-qua`.
- Worker: xác thực HMAC → khớp `job_id` → **gọi đúng
  `kiemTraChuyenTrangThai()` mà SPEC-0002 đã tách ra** → ghi `gop_y` +
  `gop_y_lich_su` + `agent_run`.
- Agent **đề xuất** trạng thái kế tiếp; Worker **quyết định**. Đề xuất nằm
  ngoài whitelist → bỏ qua đề xuất, ghi `bi_chan` + báo Sếp.
### Ghi lịch sử — phụ thuộc cứng vào SPEC-0002

> **Blocker Gạo phát hiện 27/08/2026.** `gop_y_lich_su.nguoi_doi_id` hiện là
> `TEXT NOT NULL REFERENCES nhan_su(id)` → runner **không ghi được một dòng
> lịch sử nào** mà không mạo danh một người thật. Mâu thuẫn trực tiếp với
> "runner là One Writer duy nhất của trạng thái".

Giải pháp đã thiết kế **một lần cho cả hai spec**, nằm ở
[SPEC-0002 § BLOCKER](./SPEC-0002-cong-duyet-gop-y.md#blocker--gop_y_lich_su-không-ghi-được-hành-động-của-máy):
dựng lại `gop_y_lich_su` bằng rename-swap (không `DROP`), cho `nguoi_doi_id`
nhận NULL, thêm `nguoi_thuc_hien_loai` / `tac_nhan` / `uy_quyen_boi_id` /
`job_id`, kèm `CHECK` ép ở tầng DB.

Runner ghi như sau:

| Trường | Giá trị |
|---|---|
| `nguoi_doi_id` | **NULL** — không có người nào bấm |
| `nguoi_thuc_hien_loai` | `ho_ly` · `khi_dot` · `he_thong` |
| `tac_nhan` | `HỒ LY` · `KHỈ ĐỘT` · `RUNNER` · `WATCHDOG` |
| `uy_quyen_boi_id` | `duyet_owner_boi_id` (hoặc `duyet_cap1_boi_id` nếu risk LOW) — **ai chịu trách nhiệm**, không phải ai bấm |
| `job_id` | nối sang `agent_run` để tra token/chi phí/log Actions |

Hiển thị cho người dùng: *"Khỉ Đột chuyển sang Đang kiểm tra — chạy theo uỷ
quyền của Sếp Ngọc"*. **Không bao giờ** hiện tên một người cho hành động
người đó không làm (Rule 7, Rule 9).

**Hệ quả về thứ tự triển khai**: SPEC-0003 Đợt B **không thể bắt đầu** nếu
migration dựng lại `gop_y_lich_su` chưa chạy. Đây là phụ thuộc cứng, không
phải ưu tiên mềm. **Sếp đã duyệt phương án** (ADR-0006 A3) → không còn chờ
quyết định, chỉ còn chờ migration chạy xong. ADR-0006 mục D xếp việc này
**làm trước tiên** vì nó chặn mọi thứ khác.
Đợt A **không** bị chặn (chạy khô, chưa ghi DB).

### 7. Đo mức tiêu thụ và báo Sếp

> **Bản cũ của mục này đã sai và đã bị thay.** Nó giả định runner gọi thẳng
> Anthropic API rồi đọc `usage.input_tokens` từ response. Theo **Đk4**, runner
> không còn gọi API thô nữa, nên không có response nào để đọc. Quan trọng hơn:
> **không còn tiền để đo.** Thứ cần đo bây giờ là *"ngốn bao nhiêu phần hạn
> mức Max của công ty"* và *"ngốn bao nhiêu phút GitHub Actions"*.

Nguồn số liệu là JSON của chính Claude Code. Tài liệu
[Run Claude Code programmatically](https://code.claude.com/docs/en/headless) ghi:
với `--output-format json`, *"the response payload includes `total_cost_usd` and
a per-model cost breakdown"* — và nói rõ luôn rằng đây là
*"[client-side estimates](https://code.claude.com/docs/en/agent-sdk/cost-tracking)
and can differ from your actual bill"*.

**Cách đọc con số `total_cost_usd` cho đúng — quan trọng, dễ hiểu nhầm:**

Chạy bằng gói thuê bao thì **công ty KHÔNG bị trừ số USD đó**. Nó là câu trả
lời cho câu hỏi *"nếu trả theo lượng dùng thì hết bấy nhiêu"* — tức là một
**thước đo mức nặng nhẹ**, không phải hoá đơn. Vì thế:

- Lưu vào cột tên là `uoc_tinh_usd`, **không** đặt tên `chi_phi_usd`. Tên cột
  sai sẽ khiến người đọc báo cáo tưởng công ty đang mất tiền (Rule 7).
- Trên màn hình **luôn** hiện kèm chữ *"ước tính — đã nằm trong gói Max,
  không phát sinh thêm"*. Không bao giờ hiện số USD trần trụi.
- **Không** quy ra VND. Quy ra tiền Việt một con số không phải tiền là cách
  chắc chắn nhất để Sếp hiểu nhầm.

Ghi nhận sau mỗi job:

| Lấy từ | Ghi vào | Dùng để |
|---|---|---|
| `usage` trong JSON kết quả | `agent_run.token_vao/token_ra/token_cache` | Xem việc nào nặng bất thường |
| `num_turns` | `agent_run.so_luot` | Thước đo tiêu thụ hạn mức |
| `total_cost_usd` | `agent_run.uoc_tinh_usd` | So sánh tương đối giữa các việc |
| Thời lượng job | `agent_run.giay_chay` → `PHUT_ACTIONS_THANG` | **Trần tiền thật duy nhất** |
| Số job đã chạy | `LUOT_CHAY_HOM_NAY` | Ngân sách ngày |

`scripts/runner/bao-cao-chi-phi.mjs` (giữ tên file, đổi nội dung) in cho 3 việc đầu:

| Góp ý | Bước | Token vào | Token ra | Lượt | Phút Actions | Ước tính USD | Vòng sửa | Kết quả |
|---|---|---|---|---|---|---|---|---|

kèm hai dòng tổng: **phút Actions đã dùng / trần tháng** và
**lượt chạy trung bình mỗi việc**. Gạo gửi Sếp **một tin Telegram ngắn**,
không kèm log, không kèm code (Hiến pháp: không gửi code/log dài cho Owner).

**Điều kiện để nâng `AUTOMATION_MODE` sau 3 việc đầu** — chốt trước, không
chấm điểm cảm tính:

1. ≥2/3 việc vào được PR với ≤1 vòng sửa.
2. Trung bình **≤ 4 lượt chạy/việc** và **≤ 45 phút Actions/việc** — nếu vượt,
   20 việc/tháng sẽ đụng trần phút, tức là chạm tiền thật.
3. **0 lần** Agent chạm file ngoài phạm vi.
4. **0 lần** phải dùng `KILL_SWITCH`.
5. **0 lần** một việc bị `bi_chan` chỉ vì hết token — chứng minh cơ chế
   `CHO_TOKEN` chạy đúng, đây là yêu cầu trực tiếp của Sếp trong ADR-0006 A4.
6. Sếp xác nhận **hạn mức Max dùng riêng của Sếp không bị runner làm cạn**
   trong 3 việc đó (xem Đk3).

Không đạt → giữ nguyên mức hiện tại, viết lại prompt, đo lại. Không nới ngưỡng
để cho qua.

### 8. Phục hồi khi một job chết giữa chừng

**Không yêu cầu nào bị mất**, vì hàng đợi là bảng `gop_y` bền trong D1; job chỉ
là *khoá tạm* (`job_id_hien_tai`). Mất job = mất khoá, không mất việc.

Watchdog `donDepJobChet(env)`, chạy đầu mỗi lượt cron:

```sql
SELECT g.id, g.job_id_hien_tai FROM gop_y g
  JOIN agent_run r ON r.job_id = g.job_id_hien_tai
 WHERE g.job_id_hien_tai IS NOT NULL
   AND r.trang_thai IN ('DA_GUI','DANG_CHAY')
   AND g.job_bat_dau_luc < datetime('now','+7 hours', '-45 minutes')
```

Với mỗi dòng: `agent_run.trang_thai='CHET'` → `job_id_hien_tai=NULL`,
`so_lan_thu_lai += 1` → ghi `gop_y_lich_su`. Vượt `MAX_AGENT_RETRIES` →
`bi_chan` + Telegram. Ngưỡng 45 phút = `MAX_RUNTIME_PHUT` × 1,5.

Các lớp bảo vệ khác:

- **Idempotency**: `POST /api/runner/ket-qua` lần thứ hai cùng `job_id` đã
  `XONG` → trả `{ok:true, da_ghi:true}`, **không ghi lại**. Chống double khi
  Actions retry hoặc mạng đứt giữa chừng.
- **Step `if: always()`** ở cuối workflow báo `THAT_BAI` khi job bị huỷ/timeout —
  phục hồi trong vài giây thay vì chờ watchdog 45 phút.
- **`concurrency`** trong workflow chống hai job cùng một `gop_y_id` chạy chồng.
- **Không bước nào xoá dữ liệu.** Branch của Agent vẫn nằm trên GitHub, người
  mở ra xem được công đã làm dở.
- **Worker chết giữa `INSERT agent_run` và gọi GitHub**: khoá đã đặt nhưng job
  không bao giờ chạy → watchdog dọn sau 45 phút. Chậm, không mất.

---

## SLA

| Việc | Ngưỡng | Hành động |
|---|---|---|
| Việc đủ điều kiện nằm chờ | 30 phút (6 lượt cron) | Telegram cho Sếp: nghẽn vùng code hoặc cấu hình sai |
| Job `DA_GUI` chưa thành `DANG_CHAY` | 15 phút | Nghi Actions không nhận dispatch → báo |
| Job chạy quá `MAX_RUNTIME_PHUT` | 30 phút | Actions kill |
| Job không báo kết quả | 45 phút | Watchdog dọn |
| PR chờ Sếp nghiệm thu | 3 ngày | Nhắc Telegram 1 lần/ngày, tối đa 3 lần |

---

## Audit

- Mỗi lần chuyển trạng thái → 1 dòng `gop_y_lich_su`, `ghi_chu` mở đầu bằng
  `[HỒ LY]` / `[KHỈ ĐỘT]` / `[RUNNER]`.
- Mỗi job → 1 dòng `agent_run` với model, token, USD, thời lượng, link Actions run,
  link PR, tóm tắt ≤1000 ký tự.
- Mỗi lần đổi `AUTOMATION_MODE`/`KILL_SWITCH`/trần tiền → ghi
  `cau_hinh_he_thong.cap_nhat_boi_id` + Telegram.
- Toàn bộ code do AI viết nằm trên Pull Request — GitHub đã lưu diff, người
  review, thời điểm merge. Không cần audit trail riêng cho code.
- `agent_run.tom_tat` **không được** chứa log dài hay đoạn code; chỗ đó là PR.

---

## UX

Runner gần như vô hình. Người chỉ thấy 4 chỗ:

1. **Khối điều khiển** đầu tab Góp ý (Admin): mode, chi tiêu tháng, nút DỪNG TOÀN BỘ.
2. **Cột "Đang chờ ai"** hiện *"Máy đang xử lý"* khi `current_owner` ∈
   `{HOLY, KHIDOT}` — người dùng không bao giờ thấy mã kỹ thuật (Rule 7).
3. **Chi tiết góp ý**: dòng thời gian các bước máy đã chạy + link PR + chi phí
   (chỉ Admin thấy chi phí).
4. **Telegram**: đúng 6 loại tin, mỗi tin ≤2 dòng —
   *có bản chờ nghiệm thu* · *bị chặn* · *chạm trần (lượt ngày / phút Actions)* ·
   *đổi chế độ tự động* · **_hết token, đang giữ N việc_** ·
   **_đã có phiên token mới, chạy tiếp_**.

   Hai tin token bắn **đúng một lần mỗi lượt vào/ra**, không nhắc lại trong
   lúc đang chờ. Dò lại 48 lần/ngày mà bắn 48 tin thì Sếp sẽ tắt Telegram —
   và lúc đó mọi cảnh báo khác cũng chết theo (Rule 12).

Mobile: khối điều khiển xếp dọc, nút DỪNG TOÀN BỘ chiếm hết chiều ngang,
chạm được bằng ngón cái. Sếp phải dừng được hệ thống từ điện thoại lúc đang
ở ngoài — đó là toàn bộ mục đích của nút này.

---

## Human Cost

| Người | Trước | Sau |
|---|---|---|
| Sếp — giao việc Khỉ Đột | chạy script + copy + dán sang phiên mới (~5 phút/việc) | **0** |
| Sếp — chuyển handoff sang Hồ Ly | copy + dán (~5 phút/việc) | **0** |
| Sếp — đổi trạng thái tay | ~4 lần bấm/việc | **0** (runner ghi) |
| Sếp — nghiệm thu | (chưa có quy củ) | mở PR, xem, merge — ~5 phút/việc |
| Sếp — theo dõi | mở 2 phiên Claude Code | 1 tin Telegram khi có bản chờ |

Tiết kiệm ~14 phút/việc; 20 việc/tháng ≈ **4,7 giờ/tháng** của Sếp.
Đổi lại là một lần dựng hạ tầng — **không còn khoản tiền API hàng tháng nào**
(ADR-0006 A4). Khoản duy nhất còn chạm tiền là phút GitHub Actions, đã có trần
`MAX_PHUT_ACTIONS_THANG` chặn.

**Chi phí ẩn thứ hai, phải nói thẳng (Đk3)**: runner ăn **chung hạn mức Max**
với người đã cấp token. Nếu đó là tài khoản Sếp đang dùng hằng ngày, sẽ có
những lúc **Sếp mở Claude ra làm việc riêng thì hết token vì runner vừa chạy
xong 3 job**. Đây không phải rủi ro giả định — nó là hệ quả trực tiếp của
việc dùng một gói cho hai mục đích. Ba cách xử, xem
[Câu 1 cần Sếp quyết](#cần-erp-owner-quyết). `MAX_LUOT_CHAY_NGAY = 12` là lớp
giảm thiểu tạm thời, **không** phải lời giải.

**Chi phí ẩn phải nói thẳng**: Sếp giờ phải đọc Pull Request. Nếu Sếp merge mà
không đọc, hệ thống này biến thành đường ống đẩy code AI thẳng vào production —
tệ hơn hiện trạng. Vì thế mới có `RISK_TU_DONG_TOI_DA='LOW'` và
`VUNG_CAM_TU_DONG` cho 3 việc đầu: PR đủ nhỏ để đọc hết trong 5 phút.

---

## Acceptance Criteria

1. `AUTOMATION_MODE='PAUSED'` (mặc định sau migration) → chạy cron 30 phút,
   **không job nào được tạo**, `agent_run` rỗng.
2. Đặt `AUTOMATION_MODE='ASSISTED'` với 1 góp ý test `risk='LOW'`,
   `tu_dong=1` → đúng **1** job `HOLY_SPEC` được tạo, dừng lại, không build.
3. Góp ý `risk='HIGH'` `tu_dong=1` → **không bao giờ** được chọn (kiểm bằng
   truy vấn, không bằng quan sát).
4. Hai góp ý cùng `vung_code='khovan'`, cả hai đủ điều kiện → chỉ **1** job
   chạy; cái kia chờ tới khi khoá được nhả.
5. Bấm **DỪNG TOÀN BỘ** khi 1 job đang chạy → job đó vẫn ghi được kết quả;
   **không** job mới nào được tạo; hàng đợi còn nguyên số việc.
6. Gọi `POST /api/runner/ket-qua` **không có** chữ ký HMAC → **401**.
   Chữ ký đúng nhưng `job_id` sai → **409**.
7. Gọi `/api/runner/ket-qua` xin `trang_thai='hoan_thanh'` → **bị từ chối**,
   `gop_y` không đổi, ghi `bi_chan` + báo Sếp.
8. Giả lập job chết (đặt `job_bat_dau_luc` lùi 60 phút) → lượt cron sau
   nhả khoá, `so_lan_thu_lai=1`, `agent_run.trang_thai='CHET'`.
9. Gửi cùng một payload kết quả **hai lần** → lần hai trả `da_ghi:true`,
   `gop_y_lich_su` **chỉ có 1 dòng**.
10. Đặt `so_vong_sua=3` rồi cho review trả `CAN_SUA` → `bi_chan`, Telegram,
    **không** dispatch job build nữa.
11. Đặt `MAX_LUOT_CHAY_NGAY=1` → job thứ hai trong ngày **không** được tạo;
    `AUTOMATION_MODE='PAUSED'`, `PAUSED_LY_DO='VUOT_NGAN_SACH'`; sang ngày mới
    (giờ VN) tự mở lại, hàng đợi còn nguyên số việc.
12. Kiểm quyền workflow: `permissions` không có gì cho phép merge; thử push
    thẳng `main` từ Actions → **bị branch protection chặn**.
13. Agent cố sửa `src/quyen.js` hoặc `.github/workflows/deploy.yml` → step
    kiểm diff chặn trước khi mở PR, `bi_chan`, báo Sếp.
14. Sau 3 việc đầu, `bao-cao-chi-phi.mjs` in đủ bảng: token, lượt, phút Actions,
    ước tính USD **có chú thích "đã nằm trong gói Max"**. Không có cột VND.
15. `grep -rn "sk-ant" .` trên toàn repo → **không kết quả**.

**Nhóm mới — mô hình chạy bằng gói thuê bao (ADR-0006 A4):**

18. **Không có `ANTHROPIC_API_KEY` ở bất kỳ đâu.**
    `grep -rn "ANTHROPIC_API_KEY\|anthropic_api_key" .github/ scripts/ src/`
    → **không kết quả**. Workflow chỉ dùng
    `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}`.
19. **Không có cờ `--bare`** trong `.github/` và `scripts/runner/`
    (`grep -rn -- "--bare"` → không kết quả). Đây là Đk5 — dùng `--bare` là
    token gói thuê bao **bị bỏ qua** và hệ thống âm thầm rơi về đòi khoá API.
20. **Hết token không đốt bộ đếm nào.** Giả lập `api_retry` với
    `error='rate_limit'` → `agent_run.trang_thai='CHO_TOKEN'`;
    `gop_y.so_lan_thu_lai` và `so_vong_sua` **không đổi**;
    `gop_y.trang_thai` **không đổi**; `job_id_hien_tai` được nhả;
    `PAUSED_LY_DO='HET_TOKEN'`. **Không việc nào bị `bi_chan`.**
21. **Không có đường nào dẫn tới tiêu tiền.**
    `grep -rni "billing\|upgrade\|purchase\|mua thêm\|nâng gói" scripts/runner/ src/runner.js`
    → không có đoạn code nào **thực thi**; chỉ được phép xuất hiện trong chuỗi
    thông báo gửi Sếp.
22. **Tự chạy lại đúng và chỉ đúng một trường hợp.**
    Đặt `PAUSED_LY_DO='OWNER'` rồi chạy cron 1 giờ → **không** tự bật lại.
    Đổi thành `HET_TOKEN`, cho phép dò thành công → tự về **đúng
    `MODE_TRUOC_KHI_DUNG`** (không nhảy lên mức cao hơn), Telegram 1 tin.
23. **`KILL_SWITCH=1` chặn cả phép dò token** — `PAUSED_LY_DO='HET_TOKEN'`
    nhưng `KILL_SWITCH=1` → không có workflow dispatch nào, kể cả `--tham-do`.
24. **Chống spam khi chờ token**: giữ `rate_limit` trong 3 giờ →
    đúng **1** tin Telegram lúc vào, **1** tin lúc ra. Không có tin nào ở giữa.
25. Giả lập `error='authentication_failed'` → `PAUSED_LY_DO='TOKEN_HONG'`,
    Telegram **"cần Sếp cấp lại token"**, và **không** có phép dò lại nào
    (dò cũng vô ích, chỉ tổ ồn).
16. Mọi dòng `gop_y_lich_su` do runner ghi có `nguoi_doi_id IS NULL`,
    `tac_nhan` khác rỗng, `uy_quyen_boi_id` trỏ đúng người đã duyệt.
    Truy vấn `SELECT COUNT(*) FROM gop_y_lich_su WHERE nguoi_thuc_hien_loai<>'nguoi'
    AND nguoi_doi_id IS NOT NULL` → **0**.
17. Màn hình chi tiết góp ý hiển thị *"Khỉ Đột — uỷ quyền: Sếp Ngọc"*,
    **không** hiện tên Sếp Ngọc như thể Sếp tự bấm.

---

## Migration

Hai file, chạy ở hai đợt khác nhau:

| File | Đợt | Nội dung |
|---|---|---|
| `migrations/them-cau-hinh-he-thong.sql` | **A** | `CREATE TABLE` + `INSERT OR IGNORE` các khoá mặc định (`AUTOMATION_MODE='PAUSED'`) |
| `migrations/them-agent-run.sql` | **A** | `CREATE TABLE` + index |
| `migrations/them-gopy-runner.sql` | **B** | 11 `ALTER TABLE gop_y ADD COLUMN` + 2 index |
| `migrations/them-gopy-lichsu-tacnhan.sql` | **thuộc SPEC-0002** | Dựng lại `gop_y_lich_su` — **điều kiện tiên quyết của Đợt B**, không nằm trong spec này |

Toàn bộ `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN` — không `DROP`, không
`UPDATE` dữ liệu nghiệp vụ cũ. Chạy bằng
`node scripts/chay-migration.mjs <file>` (local trước), `--remote` **ngay sau
khi deploy code**.

**Rollback**: đặt `AUTOMATION_MODE='PAUSED'` là hệ thống về đúng hiện trạng
hôm nay ngay lập tức, không cần revert gì. Muốn gỡ hẳn: revert commit, hai
bảng mới nằm im (không bảng nghiệp vụ nào tham chiếu tới chúng theo chiều
ngược lại), 11 cột trên `gop_y` cũng nằm im.

---

## Chia hai đợt triển khai

Bắt buộc, vì SPEC-0002 và SPEC-0003 **đụng cùng một hàm** (`gopYDoiTrangThai`).

### CTL-0002a — File mới, KHÔNG đụng `gop_y` (build song song với SPEC-0002)

| File | Loại |
|---|---|
| `.github/workflows/agent-runner.yml` | mới |
| `scripts/runner/chay-buoc.mjs` | mới |
| `scripts/runner/goi-agent.mjs` | mới — gọi qua Claude Code Action / CLI với `CLAUDE_CODE_OAUTH_TOKEN`, **không** gọi API thô, **không** dùng `--bare` (Đk4, Đk5) |
| `scripts/runner/doc-ket-qua-token.mjs` | mới — đọc `stream-json`, phân loại `api_retry.error` thành `CHO_TOKEN` / `TOKEN_HONG` / `THAT_BAI` |
| `scripts/runner/kiem-dien-tich-diff.mjs` | mới — chặn file ngoài phạm vi |
| `scripts/runner/bao-cao-chi-phi.mjs` | mới |
| `migrations/them-cau-hinh-he-thong.sql` | mới |
| `migrations/them-agent-run.sql` | mới |
| `src/runner.js` | mới — **chưa nối** vào `scheduled()` và router |
| `docs/AUTOMATION-CURRENT-STATE.md` | cập nhật mức thật |

Nghiệm thu Đợt A: chạy `workflow_dispatch` **tay** trên GitHub với chế độ khô
(`--kho`), Agent chạy thật, sinh spec thật, in chi phí thật, **không ghi DB**,
**không mở PR**. Đủ để đo chi phí một bước trước khi cam kết gì thêm.

Đợt A **không chạm** `src/index.js` vùng `gop_y`, `public/app.html`,
`public/assets/js/app.js` → Khỉ Đột chạy song song với SPEC-0002 mà không
conflict. Đúng Rule 13.

### CTL-0002b — Cột DB + nối dây (CHỜ SPEC-0002 merge)

| File | Loại |
|---|---|
| `migrations/them-gopy-runner.sql` | mới |
| `src/index.js` | sửa — thêm `runner.quetViec()` vào `scheduled()`, thêm route `/api/runner/*` |
| `src/runner.js` | sửa — nối vào `kiemTraChuyenTrangThai()` của SPEC-0002 |
| `public/app.html` + `app.js` | sửa — khối điều khiển + nút DỪNG TOÀN BỘ |
| `docs/ACTIVE-WORK.md` | nhận vùng `gop_y` từ SPEC-0002 |

**Điều kiện vào Đợt B** (cả 5 phải đạt):
1. SPEC-0002 đã merge vào `main` và chạy thật ≥1 tuần.
2. **`gop_y_lich_su` đã dựng lại xong** (Sếp đã duyệt — ADR-0006 A3) —
   không có bước này runner **không ghi được lịch sử**, xem
   [Ghi lịch sử](#ghi-lịch-sử--phụ-thuộc-cứng-vào-spec-0002).
3. `kiemTraChuyenTrangThai()` đã tách thành hàm dùng chung.
4. Cổng duyệt đã có ít nhất 5 lượt duyệt thật, 0 sự cố.
5. Sếp đã chốt **M1 + M2**, và `CLAUDE_CODE_OAUTH_TOKEN` đã nằm trong GitHub
   Secrets, đã chạy khô thành công một lần bằng chính token đó.
   **Xác nhận `ANTHROPIC_API_KEY` KHÔNG tồn tại trong Secrets.**

Sau Đợt B, `AUTOMATION_MODE` **vẫn là `PAUSED`**. Bật là một quyết định riêng
của Sếp, không phải hệ quả tự động của việc merge code (ADR-0005 mục 4).

---

## Risk

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| AI đẩy code hỏng lên production | **CAO** | Không quyền merge; branch protection; PR bắt buộc; Sếp là cổng #3 |
| AI sửa file ngoài phạm vi (quyền, deploy, wrangler) | **CAO** | Step kiểm diff chặn **trước** khi mở PR — cơ chế máy, không phải lời dặn |
| ~~Chảy máu tiền API~~ | **ĐÃ TRIỆT** | ADR-0006 A4: chạy bằng gói Max đã trả. Không có khoá tính tiền nào tồn tại → không có gì để chảy |
| **Vẫn tốn tiền qua phút GitHub Actions** | TRUNG BÌNH | `MAX_PHUT_ACTIONS_THANG=1200` + `timeout-minutes: 30` + `concurrency: 1` + **Sếp đặt spending limit = 0 trên GitHub** |
| **Runner làm cạn hạn mức Max của chính Sếp** (Đk3) | **CAO** | `MAX_LUOT_CHAY_NGAY=12`; chạy ngoài giờ nếu Sếp chọn; lời giải triệt để là tài khoản riêng — [Câu 1](#cần-erp-owner-quyết) |
| **Khỉ Đột lỡ dùng `--bare`** → token gói thuê bao bị bỏ qua, hệ thống rơi về đòi khoá tính tiền | **CAO** | Đk5 + Acceptance 19 (`grep -- "--bare"`). Cái bẫy dễ mắc nhất vì `--bare` chính là cờ Anthropic khuyến nghị cho CI |
| **Hết token bị xử nhầm thành lỗi kỹ thuật** → việc vô tội bị `bi_chan`, mất việc — đúng thứ Sếp cấm | **CAO** | `CHO_TOKEN` tách hẳn khỏi `THAT_BAI`; không tăng bộ đếm nào; Acceptance 20 |
| **Token OAuth hết hạn sau 1 năm**, runner đứng im không rõ lý do | TRUNG BÌNH | `TOKEN_HET_HAN_NGAY` + nhắc trước 30 ngày; `authentication_failed` → `TOKEN_HONG` + Telegram nói rõ việc cần làm |
| Máy tự bật lại sau khi **Sếp** bấm dừng | **CAO** | Tự chạy lại **chỉ** khi `PAUSED_LY_DO='HET_TOKEN'`; Acceptance 22 |
| Hai Agent ghi đè nhau cùng vùng code | TRUNG BÌNH | Khoá `vung_code` ở DB; `vung_code` NULL → độc chiếm |
| Rò `CLAUDE_CODE_OAUTH_TOKEN` — **nguy hơn khoá API**: lộ là lộ quyền vào **cả tài khoản Claude của Sếp**, không chỉ một khoá tính tiền tách biệt | **CAO** | GitHub Secrets, không vào file, không in ra log; Acceptance 15 + 18; lộ thì `claude setup-token` cấp lại là token cũ chết |
| PAT GitHub trong Cloudflare bị lộ | TRUNG BÌNH | Fine-grained, chỉ `Actions: write`, chỉ 1 repo; xoay được ngay |
| Sếp merge PR mà không đọc | **CAO** | Giữ PR nhỏ (chỉ risk LOW); ghi rõ trong ADR; đây là **rủi ro con người**, code không chặn được |
| Runner ghi sai trạng thái | TRUNG BÌNH | Whitelist trạng thái; dùng chung ma trận SPEC-0002; idempotent |
| **Runner không ghi được lịch sử** (`nguoi_doi_id NOT NULL`) | **CHẶN** | Phụ thuộc cứng vào bản dựng lại `gop_y_lich_su` ở SPEC-0002 câu 9. Đợt B **không khởi động** trước khi việc đó xong |
| Tự động hoá một quy trình đang hỏng | **CAO** | Đã xử: `PAUSED` mặc định + SPEC-0002 phải chạy thật trước (điều 18) |
| Cột `gop_y` sửa hai lần | TRUNG BÌNH | Thiết kế một lần ở SPEC-0002 Đợt A; chia hai đợt triển khai |

---

## Rollback

1. **Tức thì (giây)**: `KILL_SWITCH=1` hoặc `AUTOMATION_MODE='PAUSED'`.
   Không deploy, không revert. Đây là đường lùi chính.
2. **Ngắn (phút)**: xoá `agent-runner.yml` khỏi `main` → không workflow nào
   dispatch được.
3. **Đầy đủ**: revert commit Đợt B → `scheduled()` về như cũ, cột thừa nằm im.
4. **Về hoàn toàn thủ công**: `scripts/lenh-khidot.mjs` vẫn còn nguyên, dùng
   lại được ngay — đây là lý do không xoá nó.
5. **Dọn PR do AI mở**: đóng PR, xoá branch `agent/*`. Không có gì trong `main`.

---

## Rollout

| Đợt | Việc | Điều kiện qua đợt sau |
|---|---|---|
| 0 | Cài Claude Code CLI trên máy Sếp (**một lần**) → `claude setup-token` → dán vào GitHub Secrets `CLAUDE_CODE_OAUTH_TOKEN`; tạo PAT GitHub; bật branch protection cho `main`; **đặt spending limit Actions = 0** | Đủ 3 secret, `main` không push thẳng được, spending limit = 0 |
| 1 | **CTL-0002a**, chạy khô bằng tay | 1 lần chạy khô thành công **bằng token gói thuê bao** (log xác nhận không dùng khoá API), có số lượt + phút thật của bước `HOLY_SPEC` |
| 2 | **CTL-0002b** (sau khi SPEC-0002 merge + chạy 1 tuần) | Migration xong, `PAUSED`, Acceptance 1–25 đạt |
| 3 | `AUTOMATION_MODE='ASSISTED'`, **3 việc rủi ro THẤP** | Đạt 6 điều kiện ở mục [Đo mức tiêu thụ](#7-đo-mức-tiêu-thụ-và-báo-sếp); Sếp xem báo cáo thật |
| 4 | `BUG_FIX_ONLY` | 1 tháng không sự cố |
| 5 | `AUTOMATIC` | Sếp quyết riêng, không tự động lên |

Không bao giờ nhảy cóc. Mỗi đợt Sếp bấm một lần — không có mức nào tự nâng.

---

## Boundary Classification

`CORE_CHANGE` + `INTEGRATION_CHANGE` → **STOP FOR ERP OWNER**.

`CORE_CHANGE` vì thêm một tác nhân ghi mới vào Source of Truth trạng thái.
`INTEGRATION_CHANGE` vì thêm hai tích hợp ngoài mới: GitHub Actions API và
Claude Code Action (xác thực bằng token gói thuê bao), kèm ba secret mới.

---

## Đề xuất sửa ADR-0005

ADR-0006 A4 ghi *"Đây là thay đổi kiến trúc, không phải chỉnh con số"*.
Sau khi xác minh, thay đổi **hẹp hơn** lo ngại ban đầu: **cách chạy giữ nguyên,
chỉ cách xác thực đổi.** Đề xuất Gạo sửa ADR-0005 đúng 4 chỗ:

| Mục ADR-0005 | Hiện ghi | Đề xuất sửa thành |
|---|---|---|
| **Mục 1** | *"Cần thêm `ANTHROPIC_API_KEY` vào GitHub Secrets — phát sinh chi phí API thật, tách khỏi gói Claude Code hàng tháng."* | *"Cần thêm `CLAUDE_CODE_OAUTH_TOKEN` (sinh bằng `claude setup-token`) vào GitHub Secrets. **Chạy bằng gói Claude Max công ty đã trả — không phát sinh chi phí API.** Cấm dùng `ANTHROPIC_API_KEY`."* |
| **Mục 2** | *"Ước tính ban đầu ~2 triệu đồng/tháng... Bắt buộc đo bằng 3 việc đầu tiên rồi báo Sếp con số thật."* | *"**Không còn chi phí API.** 3 việc đầu vẫn bắt buộc đo, nhưng đo **mức tiêu thụ hạn mức Max** và **phút GitHub Actions**, không đo tiền."* |
| **Hệ quả** | *"Chi phí hàng tháng phát sinh; phải có `MAX_COST_PER_REQUEST` chặn cứng."* | *"Không có chi phí Claude hàng tháng. Khoản duy nhất chạm tiền là **phút GitHub Actions** → `MAX_PHUT_ACTIONS_THANG` + spending limit = 0 trên GitHub. Thêm ràng buộc: hết token → `PAUSED`, chờ phiên kế tiếp, tự chạy lại, **không mất việc nào**."* |
| **Phương án đã loại** | Cách B bị loại vì *"máy phải bật 24/7"* | **Giữ nguyên quyết định loại Cách B.** Lý do loại nay còn mạnh hơn: tiêu chí "không tốn tiền" đã thoả bằng Cách A, nên Cách B **không còn ưu điểm nào** mà vẫn giữ nguyên nhược điểm máy phải bật. Bổ sung: Cách A vẫn cần máy Sếp **đúng một lần** để chạy `claude setup-token` |

---

## Cần ERP Owner quyết

> Bản đầu có **5 câu**. Sau ADR-0006: **4 câu đã có đáp án**, **1 câu bị bãi bỏ**,
> **2 câu mới phát sinh** từ mô hình chạy bằng gói thuê bao.
> Chỉ 2 câu mới còn cần Sếp.
>
> **Cộng thêm câu 9 của SPEC-0002** — Sếp **đã chốt** ở ADR-0006 A3. Không còn chặn.

### Đã có đáp án — KHÔNG hỏi lại

| Câu cũ | Đáp án | Nguồn |
|---|---|---|
| 1. Trần tiền mỗi việc / mỗi tháng | **BÃI BỎ.** Không còn tiền API để đặt trần. Thay bằng `MAX_LUOT_CHAY_NGAY` và `MAX_PHUT_ACTIONS_THANG` — Gạo tự đặt được, không phải quyết định chi tiêu | ADR-0006 **A4** |
| 2. Mở tự động ở mức nào trước | `ASSISTED` → `BUG_FIX_ONLY` → `AUTOMATIC`. Không nhảy cóc | ADR-0006 **B7** |
| 3. Rủi ro "vừa" có vào vòng tự động | **Chưa.** Chỉ `LOW` cho 3 việc đầu | ADR-0006 **B8** |
| 4. Ai bấm "Dừng toàn bộ" | Sếp + Admin dự phòng | ADR-0006 **B10** |
| 5. Tạo 2 bảng mới | **Đồng ý** | ADR-0006 **B9** |

### Hai câu MỚI — cần Sếp

| # | Câu hỏi | A | B | C | Hồ Ly khuyến nghị |
|---|---|---|---|---|---|
| **M1** | Máy sẽ dùng **chung hạn mức Claude Max với chính tài khoản Sếp đang dùng hằng ngày**. Nghĩa là có lúc Sếp mở Claude ra làm việc riêng thì báo hết token, vì máy vừa chạy xong mấy việc. Sếp muốn xử thế nào? | Dùng chung, chấp nhận. Máy chỉ được chạy **tối đa 12 lượt/ngày** để chừa phần cho Sếp | Dùng chung nhưng **máy chỉ chạy ngoài giờ làm** (18h–8h và ngày nghỉ) — ban ngày hạn mức thuộc về Sếp | Mua **một gói riêng cho máy** để không đụng gì tới Sếp — *(cái này chạm tiền, Sếp quyết)* | **B** — không tốn thêm đồng nào, mà giờ hành chính hạn mức thuộc trọn về Sếp. Việc của máy vốn không gấp: góp ý duyệt buổi chiều, sáng hôm sau có bản chờ nghiệm thu là quá nhanh so với hiện nay. Nếu sau 1 tháng thấy chậm quá thì đổi sang A |
| **M2** | Token này **gắn với tài khoản của người bấm tạo ra nó**, và sống **1 năm**. Ai đứng tên? | **Sếp Ngọc** đứng tên | Giám đốc **Nguyễn Duy Phong** đứng tên | Người khác Sếp chỉ định | **A** — Sếp là ERP Owner, đây là hạ tầng của Sếp. Nhưng phải biết trước hệ quả: token đó **mở được vào tài khoản Claude của người đứng tên**, nên nếu chọn A thì câu M1 đang nói về hạn mức của chính Sếp. Chọn B thì máy ăn hạn mức của anh Phong — cần anh Phong đồng ý trước, không phải việc tôi hay Gạo quyết thay |

**Việc Sếp cần làm (không phải câu hỏi, là hành động trước Đợt 1):**

1. **Cài Claude Code CLI một lần** trên máy → chạy `claude setup-token` → dán
   chuỗi nhận được vào GitHub Secrets tên `CLAUDE_CODE_OAUTH_TOKEN`.
   *(Tôi không xử lý khoá. Đây là bước duy nhất còn cần máy Sếp; xong rồi tắt
   máy vòng lặp vẫn chạy.)*
   **Ghi vào lịch: cấp lại token trước 08/2027** — token sống đúng 1 năm.
2. **TUYỆT ĐỐI KHÔNG tạo `ANTHROPIC_API_KEY`.** Nếu vô tình đã có sẵn trong
   GitHub Secrets, **xoá đi** — để đó là có ngày hệ thống lặng lẽ dùng nó và
   phát sinh tiền đúng thứ Sếp cấm.
3. Tạo PAT GitHub fine-grained, chỉ quyền `Actions: write` trên repo
   `ngocbtagc-a11y/erp-agc-noibo` → `npx wrangler secret put GITHUB_DISPATCH_TOKEN`.
4. Sinh một chuỗi ngẫu nhiên làm `RUNNER_SECRET` → đặt ở **cả hai** nơi
   (Cloudflare secret + GitHub Secrets).
5. Bật **branch protection** cho `main`: bắt buộc Pull Request, cấm push thẳng.
   Đây là thứ duy nhất thực sự ngăn AI chạm production — mọi thứ khác trong
   spec này chỉ là lớp bảo vệ phụ.
6. Vào GitHub → Settings → Billing → **đặt spending limit cho Actions = 0**.
   Chặn cứng đường chảy máu tiền cuối cùng còn lại.
