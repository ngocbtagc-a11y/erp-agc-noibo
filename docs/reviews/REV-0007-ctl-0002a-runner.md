# REV-0007 — CTL-0002a · Runner vòng lặp (Đợt A)

- **Người review**: HỒ LY (Agent A) — vai QA / Red Team / Release Gate
- **Ngày**: 2026-08-27
- **Neo vào SHA**: `baa178765a372985dd8bd554dc6b9c42ea6d43b4` (nhánh `feature/ctl-0002a-runner`,
  2 commit, tách từ `5d6b3a1`). Đọc bằng `git archive` ra thư mục riêng — **không**
  `checkout` đè lên cây làm việc của agent khác (BH-18).
- **Nguồn đối chiếu**: `docs/specs/SPEC-0003-runner-vong-lap.md` · `ADR-0006` A4 ·
  `ADR-0007` · `ADR-0010` · `ADR-0012`
- **Phạm vi**: 12 file (11 file mới + `.gitignore`), 2.634 dòng thêm, 0 dòng xoá.

---

## REVIEW RESULT

- **Request ID**: CTL-0002a
- **Kết luận**: **FIX_REQUIRED**
- **Chi phí 0**: **XÁC NHẬN — nhưng mỏng hơn lời khai một lớp rưỡi** (cách thử phá ở §1)
- **AI không chạm được `main`**: **BÁC BỎ** — không một dòng code nào trong đợt này
  bảo đảm điều đó (§3)
- **Khuyến nghị**: **CHƯA ghép vào `main`** — sửa 4 lỗi chặn phát hành ở §Issues,
  và Sếp phải bật branch protection trước, không phải sau.

**Ghi công trước khi bắt lỗi.** Đây là bản build cẩn thận nhất từ trước tới nay của
Khỉ Đột: tự khai đủ 4 điều chưa kiểm được (không giấu), tự tìm ra và sửa lỗi cổng
chặn BH-23, ghép chuỗi nhận diện từ mảnh đúng tinh thần BH-24, và viết `tu-kiem.mjs`
để khỏi đốt phút Actions đúng tinh thần BH-25. `src/runner.js` được để **thật sự
chưa nối dây** — tôi đã kiểm, `src/index.js` không import nó, không hàm nào gọi nó.
Bốn lỗi dưới đây là lỗi của **chốt chặn**, không phải của thái độ.

---

## Cách tôi kiểm — nói trước phương pháp (BH-03)

Không đọc code rồi kết luận. Ba bàn thử độc lập, mỗi bàn đều có **ca đối chứng cố ý
sai** (BH-16), và mỗi ca đối chứng đều tự chứng minh được **vì sao nó bắt buộc phải
hỏng** (BH-26):

| Bàn thử | Làm gì | Ca đối chứng |
|---|---|---|
| **A · 28 mutant** | Chép nguyên mã nguồn ra 28 bản, mỗi bản **cố ý gỡ đúng một chốt chặn**, rồi chạy `tu-kiem.mjs` của Khỉ Đột trên từng bản | Mutant nào tự kiểm **không** bắt được = phép đo mù chỗ đó |
| **B · cổng diff trên git thật** | Dựng repo git thật, tạo 12 ca sửa/xoá/đổi tên/thêm file, chạy `kiemDayDu()` trên diff thật — **không** dùng mảng giả như tự kiểm đang làm | 3 ca "phải cho qua" (sửa file nghiệp vụ, thêm tài liệu tên tiếng Việt) + 9 ca "phải chặn". Cả 3 ca cho qua đều qua, 7/9 ca chặn đều chặn → bàn thử đủ nhạy, 2 ca lọt là lỗi thật |
| **C · soi phép đo** | Kiểm chính mấy dòng `tu-kiem.mjs` xem có dòng nào **luôn đạt bất kể code đúng sai** | Xoá hẳn khối `permissions` khỏi workflow rồi chạy lại |

---

## 1. CHI PHÍ = 0 — tôi đã thử phá từng lớp

**Kết luận: XÁC NHẬN.** Tôi không tìm được đường nào phát sinh tiền qua đúng mã nguồn
này. Nhưng ba lớp Khỉ Đột khai thì **một lớp đúng như khai, một lớp mỏng hơn khai,
một lớp gọi sai chỗ nên nửa đầu không chạy**.

### Lớp 1 — workflow chỉ có `workflow_dispatch`: **ĐÚNG NHƯ KHAI**

Tôi thử phá bằng 2 mutant thêm cò tự bóp:

| Cách phá | Tự kiểm bắt được? |
|---|---|
| Thêm `schedule: cron */5` | ✅ bắt |
| Thêm `repository_dispatch:` | ❌ **lọt** |

`agent-runner.yml` như đang commit thì sạch: không `push`, không `schedule`, không
`pull_request`. **0 phút Actions cho tới khi có người bấm.** Đúng.
Nhưng phép kiểm chỉ dò đúng 2 chữ `push` và `schedule` — cò thứ ba (`repository_dispatch`)
lọt thẳng. Xem Issue #5.

*Lưu ý về thời điểm*: workflow chỉ dispatch được khi file đã nằm trên `main`. Hôm nay
nó còn trên nhánh → hiện tại **không tiêu được một phút nào**, kể cả bấm tay.

### Lớp 2 — từ chối chạy nếu môi trường có khoá tính tiền: **MỎNG HƠN KHAI**

`goi-agent.mjs:79` chỉ soi **đúng một** tên biến (biến khoá API tính tiền cổ điển),
và `goi-agent.mjs:158` cũng chỉ xoá đúng biến đó khỏi môi trường con.

Theo chính tài liệu xác thực của Anthropic, **một biến khoá chưa đặt KHÔNG có nghĩa
là không có thông tin đăng nhập nào**. Thứ tự lấy thông tin đăng nhập còn có ít nhất
ba đường nữa (một biến token xác thực thay thế, bộ biến liên kết danh tính khối lượng
công việc, và biến đổi địa chỉ máy chủ) — **không đường nào được kiểm, không đường
nào bị xoá khỏi môi trường con.**

**Hôm nay chưa rò tiền**, vì workflow chỉ đẩy đúng danh sách `env:` khai tường minh
vào bước chạy, và trong danh sách đó không có biến nào thuộc mấy đường trên. Đúng như
Khỉ Đột viết ở đầu file YAML. Nhưng lời khai *"cổng từ chối chạy nếu môi trường có
khoá API tính tiền"* rộng hơn thứ code làm được: nó chặn **một** cửa, không phải
**cửa tính tiền**. Xem Issue #3.

### Lớp 3 — danh sách cờ CI bị cấm: **CÓ CHẶN, NHƯNG CỔNG 1 GỌI RỖNG**

`chay-buoc.mjs:68`:

```js
const loiCong = kiemMoiTruongAnToan(process.env, []);
```

Tham số thứ hai là **mảng rỗng**. Hàm này duyệt mảng đó để tìm cờ cấm
(`goi-agent.mjs:95`) — truyền mảng rỗng thì **vế kiểm cờ không bao giờ chạy**.
Chú thích ngay trên nó ghi *"CỔNG 1: chi phí. Chặn TRƯỚC mọi thứ khác."* — nửa cổng
đó là hình vẽ.

Chỗ kiểm thật nằm ở `goi-agent.mjs:142`, gọi lại cùng hàm với đúng mảng tham số vừa
dựng. Nên **cửa vẫn khoá** — chỉ là khoá ở tầng dưới, không phải tầng Khỉ Đột nói.

---

## 2. Cờ CI bị cấm (`--bare`) — danh sách chặn có bịt đủ mọi cách truyền không?

**Có, vì thực ra chỉ có đúng một đường truyền.** Danh sách tham số gọi Claude được
dựng **cứng** trong `goi-agent.mjs:125-131`; không có chỗ nào nối thêm tham số từ
biến môi trường hay từ input workflow. Cửa duy nhất còn hở là
`RUNNER_PERMISSION_MODE` (`goi-agent.mjs:139`), được đẩy thẳng vào danh sách tham số.

Tôi thử phá bằng cách đặt `RUNNER_PERMISSION_MODE` = đúng cờ bị cấm → **bị chặn**,
vì phép kiểm so từng phần tử của mảng chứ không nối chuỗi. Gỡ dòng chặn đó ra
(mutant `M6c`) → tự kiểm **bắt được**. Chốt này đứng vững.

**Nhưng**: cờ đó cũng nằm trong `CHUOI_CAM` của cổng diff (`kiem-dien-tich-diff.mjs:57`),
nghĩa là **bất kỳ tài liệu nào Agent viết ra mà nhắc tới tên cờ đó sẽ bị chặn PR**.
Ví dụ: Hồ Ly viết spec cảnh báo về chính cái cờ này → PR bị cổng chặn với lý do
"nội dung chứa chuỗi bị cấm". Đây là cái bẫy BH-24 nhắc, chưa gỡ hết. Mức LOW,
không chặn phát hành, nhưng sẽ làm mất một buổi truy lỗi khi nó nổ.

---

## 3. AI KHÔNG BAO GIỜ TỰ MERGE VÀO `main` — **BÁC BỎ**

Đây là lỗi nghiêm trọng nhất của bản này. Không phải vì có dòng code nào merge —
**không có** — mà vì **không có gì ngăn được**.

Tôi xác nhận trước cái đúng: `deploy.yml` đúng là nối thẳng production
(`on: push: branches: [main]` → `wrangler deploy`). Trong `agent-runner.yml` không có
`gh pr merge`, không có `git push` nào trỏ `main`, `gh pr create` có `--draft`,
`permissions` chỉ `contents: write` + `pull-requests: write`. Tới đây thì đạt.

**Chỗ vỡ**: `agent-runner.yml:86-89`

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

Không có `persist-credentials: false`. Mặc định của `actions/checkout` là **ghi thông
tin đăng nhập của job vào `.git/config`** của chính thư mục làm việc. Mà `contents:
write` **đủ quyền push thẳng lên `main`**. Nghĩa là: **cái chìa khoá mở `main` được
đặt sẵn trong đúng thư mục mà Agent đang được thả vào sửa file.** Một lệnh
`git push origin HEAD:main` là xong — không cần lách cổng nào, vì cổng diff chỉ chạy
*sau* khi Agent xong, và nó chỉ soi **nội dung diff**, không soi Agent đã chạy lệnh gì.

Thứ duy nhất thật sự chặn là **branch protection trên `main`** — một nút bấm trên
GitHub, nằm ở `SPEC-0003 § Rollout` Đợt 0, **chưa có bằng chứng nào là đã bật**.
Chính spec cũng viết: *"Đây là thứ duy nhất thực sự ngăn AI chạm production"*.

Và tự kiểm **mù hoàn toàn** với chuyện này: tôi thêm nguyên văn `git push origin HEAD:main`
vào workflow (mutant `M11`) → `tu-kiem.mjs` báo **y hệt bản gốc**, không một dòng đỏ.

> **Phán định**: tính chất *"AI không chạm được `main`"* hôm nay được bảo đảm bởi
> **sự ngoan ngoãn của Agent**, không phải bởi cơ chế máy. Đúng thứ SPEC-0003 mục 4
> cấm: *"chặn ở tầng code, không dựa vào Agent tự giác."*

---

## 4. Cổng chặn file cấm — lỗi BH-23 đã sửa thật, nhưng **còn một lỗ cùng loại**

### Phần đã sửa: **XÁC NHẬN ĐÚNG**

Hàm `hopVoiMau()` (`kiem-dien-tich-diff.mjs:68-94`) nay duyệt **một lượt**, không xâu
chuỗi `.replace()`. Tôi dựng lại đúng bản 4 lệnh `.replace()` cũ (mutant `M1`) → tự
kiểm **bắt ngay 3 mục**, trong đó có `Chặn .github/workflows/deploy.yml`. Ca đối chứng
này chứng minh phép đo đủ nhạy. Trên git thật, sửa `deploy.yml` → **bị chặn**. Đạt.

### Lỗ còn lại: **ĐỔI TÊN FILE thì lọt sạch** — hỏng im lặng, y hệt BH-23

`layFileDaDoi()` (`kiem-dien-tich-diff.mjs:170-182`) đọc `git diff --name-status` rồi
lấy **phần tử cuối cùng** của dòng:

```js
const phan = d.split('\t');
return { trang_thai: phan[0], duong_dan: phan[phan.length - 1] };
```

Git báo một lần đổi tên bằng **ba cột**: `R100 <đường-dẫn-cũ> <đường-dẫn-mới>`.
Lấy phần tử cuối = chỉ giữ **đường dẫn mới**. **Đường dẫn cũ bị vứt đi hoàn toàn.**
Và `trang_thai` là `R100`, không bắt đầu bằng `D`, nên phép chặn xoá file
(`:118`) cũng không bắt.

Đo trên git thật:

| Ca | Mong đợi | Thực tế | |
|---|---|---|---|
| Sửa `.github/workflows/deploy.yml` | chặn | chặn | ✅ |
| Sửa `src/quyen.js` | chặn | chặn | ✅ |
| Xoá `src/kho.js` | chặn | chặn | ✅ |
| **Đổi tên `src/quyen.js` → `src/quyen-moi.js`** | **chặn** | **CHO QUA** | ❌ |
| **Đổi tên `wrangler.toml` → `wrangler.toml.bak`** | **chặn** | **CHO QUA** | ❌ |
| Thêm `.github/workflows/xau.yml` | chặn | chặn | ✅ |
| Thêm `.claude/settings.json` | chặn | chặn | ✅ |
| Thêm `src/.env.production` | chặn | chặn | ✅ |
| Thêm `scripts/runner/phu/them.mjs` | chặn | chặn | ✅ |
| Sửa `src/kho.js` (bình thường) | cho qua | cho qua | ✅ |
| Thêm `docs/quy-trình-kho.md` (tên có dấu) | cho qua | cho qua | ✅ |

Git thấy đúng một dòng: `{"trang_thai":"R100","duong_dan":"src/quyen-moi.js"}`.
Cổng in **"✅ Cổng diff: 1 file đã đổi, tất cả trong phạm vi."**

Hậu quả đời thường: đổi tên `wrangler.toml` là **deploy chết im lặng**; đổi tên
`src/quyen.js` là **phân quyền bốc hơi** — mà cổng vẫn xanh và PR vẫn mở.

Đây **đúng cùng một loại lỗi với BH-23**: đọc code không thấy, chỉ bài kiểm chạy trên
**dữ liệu thật** mới lòi ra. Và lý do nó sống sót là vì `tu-kiem.mjs` kiểm cổng bằng
**mảng do chính nó bịa ra** (`{duong_dan, trang_thai:'M'}`), chưa bao giờ cho cổng
ăn đầu ra thật của `git diff`.

### Còn chỗ nào cùng kiểu hỏng-im-lặng nữa không? — **Có, một chỗ nữa**

`tu-kiem.mjs:313`, bộ bỏ chú thích SQL:

```js
const boChuThichSql = (s) => s.split('\n').map((d) => d.replace(/--.*$/, '')).join('\n');
```

Hai file migration trong commit này là **CRLF** (tôi kiểm bằng `git cat-file` — CRLF
nằm trong chính blob, repo không có `.gitattributes`, nên máy Linux của Actions cũng
nhận đúng CRLF đó). Tách theo `\n` xong, mỗi dòng còn dư ký tự `\r` ở cuối. Trong
JavaScript, `\r` **là ký tự kết thúc dòng**, nên `.` không khớp nó, và `$` (không có
cờ `m`) không khớp trước nó → **toàn bộ hàm bỏ chú thích không bỏ được gì**.

Đo thẳng: file CRLF → còn nguyên chuỗi trong chú thích; cùng nội dung dạng LF → sạch.

Đây chính là lý do của phát hiện tiếp theo.

---

## 5. Việc rủi ro HIGH không vào vòng tự động — **code ĐẠT, phép kiểm KHÔNG CÓ**

Hai lớp chặn đều tồn tại thật và tôi đã đọc tận nơi:

- `src/runner.js:256` — `AND g.risk = ?` buộc bằng `RISK_TU_DONG_TOI_DA` (`'LOW'`).
  So bằng tuyệt đối: `HIGH` không khớp, `MEDIUM` không khớp, `NULL` cũng không khớp
  (SQL `NULL = 'LOW'` không đúng). Nằm trong `WHERE`, không phải lời dặn Agent. **Đạt.**
- `chay-buoc.mjs:79` — lớp thứ hai, cố ý trùng lặp, chặn cả người bấm tay trên GitHub
  với `risk=HIGH`. **Đạt.**

**Nhưng cả hai lớp đều không có một dòng kiểm nào.** Tôi gỡ hẳn lớp thứ hai
(mutant `M21`) và gỡ hẳn mệnh đề `AND g.risk = ?` khỏi truy vấn (mutant `M22`) →
`tu-kiem.mjs` báo **y hệt bản gốc**. Không đỏ một dòng.

Nghĩa là: hôm nay code đúng, nhưng **không có gì giữ cho nó đúng ở lần sửa sau**.
Theo BH-23: *"viết xong cổng mà chưa thử cho nó chặn thật thì coi như chưa có cổng"*.

---

## 6. `CHO_TOKEN` tách khỏi `THAT_BAI` — **tầng phân loại ĐẠT, tầng workflow LÀM HỎNG LẠI**

### Tầng phân loại: **ĐẠT, và có đối chứng**

`doc-ket-qua-token.mjs` tách ba khái niệm rất sạch. Tôi thử phá hai kiểu:

| Mutant | Tự kiểm bắt? |
|---|---|
| `rate_limit` → xếp thành `THAT_BAI` | ✅ bắt (2 mục) |
| Giữ `CHO_TOKEN` nhưng bật `tang_bo_dem: true` | ✅ bắt (3 mục) |

Lớp chặn thứ hai (dò chữ trong stdout) cũng nghiêng đúng phía an toàn. **Trả lời thẳng
câu hỏi của Sếp: hết token 2 lần liên tiếp — ở tầng này — KHÔNG mất việc.** Đúng.

### Tầng workflow: **có đường làm mất việc**

`chay-buoc.mjs:229` cho `CHO_TOKEN` thoát mã **0** — cố ý, để Actions không hiện đỏ
cho một việc không sai gì. Hợp lý. Nhưng thoát 0 nghĩa là **workflow chạy tiếp**:
hai bước sau (`agent-runner.yml:133` cổng diff và `:137` đẩy nhánh + mở PR) chỉ xét
`che_do == 'that' && buoc == 'KHIDOT_BUILD'`, **không xét bước trước đã ra kết quả gì**.

Hệ quả:

1. Hết token giữa chừng → runner vẫn **đẩy nhánh và mở Pull Request** từ một lượt
   làm dở. PR nháp, không merge được, nhưng là rác và gây hiểu nhầm "đã xong".
2. Nặng hơn: nếu một trong hai bước đó **hỏng** (ví dụ `git push --force-with-lease`
   trượt, hoặc cổng diff chặn vì Agent đã kịp chạm file cấm trước khi hết token),
   job thành `failure()` → bước cuối (`:166`) chạy
   `chay-buoc.mjs --bao-that-bai`, gửi về Worker một báo cáo **`THAT_BAI` với
   `tang_bo_dem: true`**, **đè lên** báo cáo `CHO_TOKEN` vừa gửi.

Tức là: **`CHO_TOKEN` bị biến ngược thành `THAT_BAI` có đốt bộ đếm.** Lặp hai lần là
`bi_chan` một việc không có lỗi gì — **đúng thứ ADR-0006 A4 và Acceptance 20 cấm**.

Cùng cơ chế đó còn đè hai kết quả khác vốn cố ý **không** đốt bộ đếm: chặn vì
`risk != LOW` (`:82`) và chặn vì ngoài khung giờ (`:89`) — cả hai đều thoát mã 1,
nên đều kích `failure()` rồi bị báo lại thành `THAT_BAI` đốt bộ đếm.

---

## 7. `KILL_SWITCH` và `AUTOMATION_MODE` — dừng được, nhưng **có một đường máy lật quyết định của Sếp**

### Phần đạt

- `KILL_SWITCH=1` chặn ở dòng **đầu tiên** của `quetViec` (`src/runner.js:198`),
  trước cả phép dò token — đúng Acceptance 23. `thuLaiKhiCoToken` kiểm lại lần nữa
  (`:439`). **Đạt.**
- Không mất yêu cầu nào đang chờ: hàng đợi là bảng `gop_y` trong D1, job chỉ là khoá
  tạm. `KILL_SWITCH` chỉ chặn **tạo job mới**; job đang chạy chạy nốt và ghi kết quả.
  Watchdog nhả khoá sau 45 phút. **Đạt** — thiết kế này đúng.
- Migration ra đời `AUTOMATION_MODE='PAUSED'`, `KILL_SWITCH='0'`, `INSERT OR IGNORE`
  nên chạy lại không đè giá trị Sếp đã đổi. **Đạt.**

### Lỗi: Sếp bấm dừng, máy tự bật lại

`tuDongDung()` (`src/runner.js:160-180`) ghi đè `PAUSED_LY_DO` **vô điều kiện**, và
chỉ lưu `MODE_TRUOC_KHI_DUNG` khi hệ thống **chưa** ở `PAUSED`.

Kịch bản đời thường, không hề hiếm:

1. Sếp thấy máy làm gì đó lạ → **bấm tạm dừng** → `AUTOMATION_MODE='PAUSED'`,
   `PAUSED_LY_DO='OWNER'`.
2. Job đang chạy dở (đúng thiết kế: chạy nốt) gặp hết token → báo về →
   `ghiNhanChoToken()` gọi `tuDongDung(env, 'HET_TOKEN', ...)`.
3. Vì đang `PAUSED` rồi nên `MODE_TRUOC_KHI_DUNG` **không** được lưu, còn
   `PAUSED_LY_DO` **bị ghi đè** từ `OWNER` thành `HET_TOKEN`.
4. Lượt cron sau: `quetViec` thấy `PAUSED_LY_DO='HET_TOKEN'` → đi dò token
   (`:202`). Dò thành công → `thuLaiKhiCoToken:463`:

```js
const veMuc = ch.MODE_TRUOC_KHI_DUNG || 'ASSISTED';
await datCauHinh(env, 'AUTOMATION_MODE', veMuc);
```

`MODE_TRUOC_KHI_DUNG` rỗng → **mặc định `ASSISTED`** → **máy tự bật lại**.

Vi phạm thẳng hai câu chính spec viết ra: *"Sếp bấm dừng → **không bao giờ** tự bật
lại. Máy không được lật quyết định của người"* (Ba lằn ranh #1) và *"trả về **đúng**
mức trước khi dừng, **không tự nâng**"*. Ở đây cái `|| 'ASSISTED'` biến một giá trị
rỗng thành một lệnh bật máy.

*(`KILL_SWITCH` không dính lỗi này — nó chặn ở tầng trên. Nhưng nút Sếp dùng hằng
ngày theo đúng thiết kế UX là ô chọn chế độ, không phải nút đỏ.)*

### Lỗi kèm: trần tiền thật không bao giờ chạy

`congPhutActions()` (`src/runner.js:390`) là hàm **duy nhất** cộng dồn phút Actions vào
`PHUT_ACTIONS_THANG`. Tôi quét toàn bộ `src/`, `scripts/`, `.github/`:
**không một chỗ nào gọi nó.**

Mà `PHUT_ACTIONS_THANG` chính là thứ `kiemNganSach()` (`:369`) so với
`MAX_PHUT_ACTIONS_THANG` để tự dừng. Bộ đếm không ai tăng thì nó vĩnh viễn bằng `0`,
nên **trần 1.200 phút không bao giờ chạm** — mà đây đúng là **khoản duy nhất còn chạm
tiền thật** của cả hệ thống. Đợt A chưa nối dây nên chưa hại; nối dây ở Đợt B mà quên
thì lớp chặn tiền cuối cùng chỉ còn là spending limit = 0 bên GitHub.

---

## 8. `tu-kiem.mjs` — **KHÔNG phải 100/100, và không đáng tin làm cổng phát hành**

### Con số thật là **98 đạt · 2 hỏng**

Chạy đúng mã nguồn của commit `baa1787`, không sửa gì:

```
KẾT QUẢ TỰ KIỂM: 98 đạt · 2 hỏng
  - Migration không lưu trần tiền USD nào
  - agent_run đặt tên cột là uoc_tinh_usd, KHÔNG phải chi_phi_usd
```

Nguyên nhân là bộ bỏ chú thích SQL vỡ vì CRLF (đã dựng lại ở §4). Hai chuỗi bị bắt
đều nằm trong **chú thích giải thích**, không phải câu lệnh thi hành — nên đây là
**báo động giả**, code migration không sai. Nhưng:

> Khỉ Đột khai **100/100**. Con số thật là **98/2**, và nó tất định — CRLF nằm trong
> chính blob của commit (kiểm bằng `git cat-file`, repo không có `.gitattributes`),
> nên máy Linux của GitHub Actions cũng ra đúng 98/2. Đây là **BH-05**: khai test phải
> đúng code thật. Sai một mục là mất niềm tin cả bản khai.

### Chọn ngẫu nhiên và kiểm lại độc lập — có ca nào luôn đạt bất kể đúng sai không?

**Có ba ca luôn đạt.** Đo trực tiếp:

| Phép kiểm trong `tu-kiem.mjs` | Vì sao nó không bao giờ hỏng được |
|---|---|
| `Workflow runner KHÔNG có quyền merge` (`:305`) | Cắt chuỗi giữa `permissions:` và `concurrency:` rồi tìm chữ `merge`. **Xoá hẳn khối `permissions`** → chuỗi rỗng → vẫn ĐẠT (mutant `M3`). Đổi thành `permissions: write-all` → vẫn ĐẠT (`M15`). Mà GitHub **không có** quyền nào tên là `merge`, nên phép kiểm này **về mặt cấu trúc không thể hỏng** |
| `Workflow runner CÓ timeout-minutes: 30` (`:303`) | Chuỗi đó có mặt trong **chú thích đầu file**. Xoá hẳn `timeout-minutes: 30` khỏi job (`M9`) → vẫn ĐẠT |
| `Workflow runner mở PR ở dạng draft` (`:306`) | `--draft` cũng có trong chú thích. Bỏ `--draft` khỏi lệnh `gh pr create` (`M12`) → vẫn ĐẠT |

Ba dòng này in dấu ✅ mà không đo gì cả — **đúng loại "hỏng im lặng" mà BH-16 sinh ra
để bắt**, chỉ khác là lần này nạn nhân là chính bài kiểm.

### Bảng mù đầy đủ — 28 mutant

Mỗi mutant gỡ đúng một chốt chặn. "LỌT" = tự kiểm không thấy gì khác bản gốc.

| Chốt chặn bị gỡ | Tự kiểm |
|---|---|
| `hopVoiMau` quay về 4 lệnh `.replace()` (BH-23 tái phát) | ✅ bắt |
| `rate_limit` xếp thành `THAT_BAI` | ✅ bắt |
| `CHO_TOKEN` đốt bộ đếm | ✅ bắt |
| Cổng khoá tính tiền chỉ cảnh báo | ✅ bắt |
| Bỏ yêu cầu phải có token gói thuê bao | ✅ bắt |
| Bỏ chặn cờ CI bị cấm | ✅ bắt |
| Bỏ `.github/**` khỏi danh sách cấm | ✅ bắt |
| Runner được đặt `hoan_thanh` | ✅ bắt |
| Thêm `schedule:` vào workflow | ✅ bắt |
| Máy chạy 24/7 (bỏ khung giờ) | ✅ bắt |
| Mặc định chạy thật thay vì chạy khô | ✅ bắt |
| **Thêm `git push origin HEAD:main` vào workflow** | ❌ **LỌT** |
| **`permissions: write-all`** | ❌ **LỌT** |
| **Xoá hẳn khối `permissions`** | ❌ **LỌT** |
| **Bỏ `timeout-minutes: 30`** | ❌ **LỌT** |
| **Bỏ `--draft` (PR mở thẳng, không nháp)** | ❌ **LỌT** |
| **Thêm `repository_dispatch:`** | ❌ **LỌT** |
| **Bỏ cổng risk HIGH ở `chay-buoc.mjs`** | ❌ **LỌT** |
| **Bỏ `AND g.risk = ?` khỏi truy vấn chọn việc** | ❌ **LỌT** |
| **`KILL_SWITCH` không chặn gì nữa** | ❌ **LỌT** |
| **`AUTOMATION_MODE` ra đời là `AUTOMATIC`** | ❌ **LỌT** |
| **Bỏ cổng diff khỏi workflow** | ❌ **LỌT** |
| **Bỏ cổng diff khỏi `chay-buoc.mjs`** | ❌ **LỌT** |
| **`--permission-mode` đổi sang chế độ bỏ qua mọi xác nhận** | ❌ **LỌT** |
| **Bỏ `**/.env*` khỏi danh sách cấm** | ❌ **LỌT** |
| **Bỏ `.claude/**` khỏi danh sách cấm** | ❌ **LỌT** |

**Phán định**: `tu-kiem.mjs` là một bộ kiểm **tốt** cho **tầng hàm thuần** — phân loại
lỗi API, so khớp glob, dựng prompt, khung giờ. Ở tầng đó nó bắt đúng và bắt nhạy, và
nó đã tự tìm ra BH-23 — công đó có thật.

Nhưng nó **mù gần như hoàn toàn với tầng chốt chặn và tầng nối dây**: mọi cổng trong
`chay-buoc.mjs`, mệnh đề `WHERE` chọn việc, `KILL_SWITCH`, mức tự động mặc định trong
code, và **toàn bộ hành vi thật của workflow**. Đó lại đúng là chỗ chứa 4 lỗi nặng
của bản này.

> **Không được dùng "tự kiểm đạt" làm cổng phát hành cho CTL-0002a.** Nó chứng minh
> mấy hàm thuần chạy đúng — nó **không** chứng minh hệ thống an toàn.

---

## Bốn điều Khỉ Đột tự khai chưa kiểm được — đánh giá từng cái

| # | Điều tự khai | Phán định | Có chặn phát hành? |
|---|---|---|---|
| 1 | **Chưa chạy khô lần nào** (cần token + tốn phút Actions) | **Chấp nhận được, và là quyết định đúng** — BH-25: kiểm được bằng máy mình thì đừng kiểm bằng thứ tính tiền. Nhưng `SPEC-0003 § Rollout` Đợt 1 ghi rõ điều kiện qua đợt là *"1 lần chạy khô thành công"*. Nên đây **không** chặn việc ghép code, mà **chặn việc coi Đợt A là đã nghiệm thu** | **KHÔNG** chặn ghép · **CÓ** chặn nghiệm thu |
| 2 | **`--permission-mode acceptEdits` chưa xác minh** là cách cấp quyền đúng cho phiên không người ngồi máy | **Khai đúng, và tôi cũng không xác minh được ngoại tuyến** — không bịa (BH-03). Chọn mặc định hẹp (cho sửa file, không mở cửa chạy lệnh tuỳ ý) là **hướng an toàn đúng**, và để đổi bằng biến môi trường thay vì sửa cứng cũng đúng. Rủi ro là *chạy không được*, không phải *chạy mất kiểm soát* — trừ khi ai đó đổi biến đó sang chế độ bỏ qua xác nhận, mà tự kiểm **không bắt được** (mutant `M18` lọt) | **KHÔNG** — nhưng phải thêm phép kiểm chặn giá trị nguy hiểm |
| 3 | **`gop_y.uu_tien` không tồn tại → ngoại lệ P0 chưa chạy được** | **Khai đúng, tôi kiểm tận nơi**: `src/runner.js:238` kiểm cột có tồn tại không, không có thì ghi `AUTOMATION_GAP` rồi **nằm im hẳn** ngoài khung giờ, **không bịa tên cột** (Hiến pháp: không báo "đã tự động" khi chưa có). Hỏng về phía an toàn, không mất việc nào. **Xử lý đúng chuẩn.** Nhưng workflow **vẫn khai input `uu_tien`** (`agent-runner.yml:60`) như thể nó chạy được — dễ làm người đọc tưởng P0 đã có | **KHÔNG** — ghi vào `AUTOMATION-CURRENT-STATE.md` là đủ |
| 4 | **Mặc định coi thứ 7 là ngày làm việc (đoán)** | `ADR-0007` chỉ ghi *"và cả ngày nghỉ"*, **không định nghĩa ngày nghỉ là những ngày nào** → đây là **khoảng trống luật nghiệp vụ thật**, không phải lỗi của Khỉ Đột. Cái đoán này nghiêng phía **thận trọng** (máy chạy ít hơn), và đã đưa ra thành cấu hình `NGAY_NGHI_TRONG_TUAN` sửa được trong 1 giây, không phải hằng số chôn trong code. **Xử lý đúng** | **KHÔNG** — nhưng cần Sếp xác nhận một câu, xem §Cần Sếp |

---

## Hai file ngoài danh sách spec — **DUYỆT CẢ HAI**

| File | Phán định |
|---|---|
| `scripts/runner/dung-prompt.mjs` | **DUYỆT.** Không phải phình phạm vi — đây là hiện thực hoá yêu cầu trực tiếp của Sếp *"tối ưu câu lệnh để tiết kiệm chi phí"*, và tách ra khỏi `chay-buoc.mjs` là điều kiện để kiểm được nó ngoại tuyến. Trần 5.000 ký tự **ném lỗi** thay vì cắt âm thầm — đúng hướng: cắt âm thầm sẽ mất mấy dòng ranh giới an toàn ở cuối prompt. Tôi thử ném vào một góp ý 12.000 ký tự → prompt vẫn dưới trần. Danh sách tài liệu nạp là danh sách **đóng**, đúng luật "không audit toàn repo" |
| `scripts/runner/tu-kiem.mjs` | **DUYỆT sự tồn tại, KHÔNG duyệt kết luận của nó.** Viết bài kiểm ngoại tuyến để khỏi đốt phút Actions là **đúng BH-25** và chính nó đã tìm ra BH-23. Nhưng xem §8: nó không được dùng làm cổng phát hành, và phải vá 3 dòng luôn-đạt + bổ sung tầng chốt chặn |

---

## Issues

| # | Mức | File:dòng | Vấn đề | Chặn phát hành? |
|---|---|---|---|---|
| **1** | **CAO** | `.github/workflows/agent-runner.yml:86` | `actions/checkout@v4` thiếu `persist-credentials: false` → thông tin đăng nhập có quyền `contents: write` được ghi vào `.git/config` của đúng thư mục Agent đang làm việc. Không gì trong repo ngăn `git push origin HEAD:main`. Xem §3 | **CÓ** |
| **2** | **CAO** | `scripts/runner/kiem-dien-tich-diff.mjs:170-182` | Cổng chặn file cấm **lọt hoàn toàn khi Agent đổi tên file**. `git diff --name-status` trả 3 cột cho đổi tên, code chỉ giữ cột cuối → đường dẫn cũ bị vứt, `R100` cũng không bị bắt như xoá. Cổng vẫn in "✅ qua". Cùng loại BH-23. Xem §4 | **CÓ** |
| **3** | **CAO** | `.github/workflows/agent-runner.yml:166-175` + `scripts/runner/chay-buoc.mjs:229` | Bước `if: failure()` báo `THAT_BAI` với `tang_bo_dem: true` **đè lên** kết quả đã gửi trước đó → biến `CHO_TOKEN` / chặn-vì-risk / chặn-vì-khung-giờ thành thất bại **có đốt bộ đếm**. Hai lần là `bi_chan` oan. Vi phạm Acceptance 20. Thêm nữa: `CHO_TOKEN` thoát mã 0 nên workflow vẫn chạy tiếp tới bước đẩy nhánh + mở PR từ một lượt làm dở. Xem §6 | **CÓ** |
| **4** | **CAO** | `src/runner.js:463` (kèm `:164-168`) | `MODE_TRUOC_KHI_DUNG \|\| 'ASSISTED'` → **máy tự bật lại sau khi Sếp bấm dừng**, nếu có một job dở gặp hết token sau lúc Sếp dừng. Vi phạm Ba lằn ranh #1 và Acceptance 22. Xem §7 | **CÓ** |
| **5** | TRUNG BÌNH | `src/runner.js:390` | `congPhutActions()` **không có người gọi** → `PHUT_ACTIONS_THANG` vĩnh viễn `0` → trần `MAX_PHUT_ACTIONS_THANG` (lớp chặn khoản tiền thật duy nhất) không bao giờ chạm. Đợt A chưa hại; Đợt B mà quên là hỏng | **KHÔNG** (phải xong trước Đợt B) |
| **6** | TRUNG BÌNH | `scripts/runner/tu-kiem.mjs:303,305,306` | Ba phép kiểm **luôn đạt bất kể code đúng sai** (2 dòng khớp phải chú thích, 1 dòng về mặt cấu trúc không thể hỏng). In ✅ mà không đo gì. Xem §8 | **KHÔNG** |
| **7** | TRUNG BÌNH | `scripts/runner/tu-kiem.mjs` (toàn file) | Mù với **toàn bộ tầng chốt chặn**: cổng risk HIGH, cổng diff trong `chay-buoc.mjs`, `KILL_SWITCH`, `AUTOMATION_MODE` mặc định trong code, `--permission-mode`, và mọi hành vi thật của workflow. 15/28 mutant lọt. Kiểm cổng diff bằng **mảng bịa**, chưa bao giờ cho ăn đầu ra thật của `git diff` — đó là lý do Issue #2 sống sót | **KHÔNG** |
| **8** | TRUNG BÌNH | `scripts/runner/tu-kiem.mjs:313` | `boChuThichSql` **không bỏ được chú thích nào** trên file CRLF (`\r` là ký tự kết thúc dòng trong JS, `$` không có cờ `m`). Gây 2 báo động giả, và làm phép kiểm "không có DROP" soi nhầm cả chú thích | **KHÔNG** |
| **9** | THẤP | `scripts/runner/chay-buoc.mjs:68` | `kiemMoiTruongAnToan(process.env, [])` truyền mảng rỗng → vế kiểm cờ CI bị cấm của "CỔNG 1" **không bao giờ chạy**. Chỗ kiểm thật ở `goi-agent.mjs:142`, nên cửa vẫn khoá, nhưng chú thích *"chặn TRƯỚC mọi thứ khác"* không đúng sự thật | **KHÔNG** |
| **10** | THẤP | `scripts/runner/goi-agent.mjs:79,158` | Chỉ soi và xoá **một** tên biến khoá tính tiền. Còn ít nhất 3 đường xác thực tính tiền khác không kiểm, không xoá khỏi môi trường con. Hôm nay chưa rò vì workflow chỉ đẩy đúng danh sách `env:` khai tường minh. Xem §1 | **KHÔNG** |
| **11** | THẤP | `scripts/runner/kiem-dien-tich-diff.mjs:57` | Tên cờ CI bị cấm nằm trong `CHUOI_CAM` → **bất kỳ tài liệu nào Agent viết mà nhắc tới nó đều bị chặn PR**. Đúng cái bẫy BH-24, chưa gỡ hết | **KHÔNG** |
| **12** | THẤP | `migrations/them-agent-run.sql:31` | `trang_thai TEXT NOT NULL` **không có `CHECK`** ràng buộc tập giá trị. Tầng DB không giữ được ranh giới `CHO_TOKEN` ≠ `THAT_BAI` — ranh giới quan trọng nhất của spec chỉ được giữ bằng code ứng dụng | **KHÔNG** |
| **13** | THẤP | `.github/workflows/agent-runner.yml:60` | Khai input `uu_tien` như thể ngoại lệ P0 chạy được, trong khi `src/runner.js:238` xác nhận nó **chưa chạy được**. Ghi rõ vào `AUTOMATION-CURRENT-STATE.md` | **KHÔNG** |

---

## Việc phải làm trước khi ghép vào `main`

**Bốn lỗi chặn phát hành:**

1. Thêm `persist-credentials: false` vào bước `actions/checkout`. Bước đẩy nhánh
   tự cấp `GH_TOKEN` riêng, nên nó vẫn chạy được.
2. Sửa `layFileDaDoi()` để **giữ cả hai đường dẫn** của dòng đổi tên (`R…`), và kiểm
   cả hai qua `FILE_CAM`; coi `R` chạm file cấm như vi phạm.
3. Cho bước `if: failure()` **không ghi đè** kết quả đã gửi: hoặc kiểm
   `runner-ket-qua.json` đã có `ket_qua` thì thôi, hoặc thêm điều kiện bước cho
   `CHO_TOKEN` dừng hẳn workflow (đừng chạy tiếp sang đẩy nhánh/mở PR).
4. Bỏ `|| 'ASSISTED'` ở `thuLaiKhiCoToken`: `MODE_TRUOC_KHI_DUNG` rỗng thì **giữ
   nguyên `PAUSED`** và báo Sếp. Và `tuDongDung` **không được ghi đè**
   `PAUSED_LY_DO='OWNER'` bằng bất kỳ lý do máy nào.

**Kèm theo (không chặn ghép nhưng phải xong trước Đợt B):**

5. Gọi `congPhutActions()` ở đường xử lý kết quả job.
6. Vá 3 dòng luôn-đạt của `tu-kiem.mjs`; sửa `boChuThichSql` (thêm cờ `m` hoặc bỏ
   `\r` trước khi tách).
7. **Bổ sung tầng chốt chặn vào `tu-kiem.mjs`** — mỗi mutant "LỌT" trong bảng §8 là
   một phép kiểm còn thiếu. Riêng cổng diff phải cho ăn **đầu ra thật của `git diff`**
   trên một repo tạm, không dùng mảng bịa nữa.
8. Chuẩn hoá xuống dòng: thêm `.gitattributes` (`* text=auto eol=lf`) rồi chuẩn hoá
   lại các file mới. CRLF trong blob là mầm của cả hai lỗi phép-đo ở bản này.

**Việc của Sếp, phải xong TRƯỚC khi ghép — không phải sau:**

9. Bật **branch protection** cho `main` (bắt buộc PR, cấm push thẳng). Chừng nào chưa
   bật thì mục #1 ở trên chỉ là lớp phụ, và câu *"AI không chạm được `main`"* vẫn sai.
10. Đặt **spending limit Actions = 0** trên GitHub.

---

## Cần Sếp quyết — đúng một câu

**Ngày nghỉ trong tuần của công ty là những ngày nào?** `ADR-0007` chốt máy chỉ chạy
18h–8h hôm sau **và ngày nghỉ**, nhưng không nói ngày nghỉ là ngày nào. Khỉ Đột đang
đoán: **chỉ Chủ nhật**, thứ 7 vẫn là ngày làm. Nếu đúng thì không cần đổi gì. Nếu công
ty nghỉ cả thứ 7 (hoặc nghỉ luân phiên) thì chỉ cần đổi một dòng cấu hình
`NGAY_NGHI_TRONG_TUAN`, không phải sửa code.

Đây là **luật nghiệp vụ**, không phải quyết định kỹ thuật, nên tôi không tự quyết
(Hiến pháp: thiếu business policy → hỏi, không đoán).

---

## Ghi chú cho Sếp — 3 câu đời thường

Khỉ Đột dựng bộ khung khá chắc và **tự khai thẳng 4 chỗ mình chưa kiểm được** — cái
đó đáng ghi nhận, vì giấu đi thì tôi đã không tìm ra nhanh thế. Nhưng tôi tìm thêm
được 4 lỗ nữa mà bài tự kiểm của bạn ấy không nhìn thấy, trong đó lỗ lớn nhất là:
**hôm nay chưa có gì thật sự chặn máy đẩy code thẳng lên nhánh chạy production** —
chỉ có sự ngoan ngoãn của máy, mà mình dựng cả hệ thống này chính là để không phải
tin vào sự ngoan ngoãn.

Việc Sếp cần làm: **vào GitHub bật khoá nhánh `main`** (bắt buộc qua Pull Request,
cấm đẩy thẳng) và **đặt hạn mức chi tiêu Actions = 0**. Hai nút bấm, làm **trước**
khi ghép code, không phải sau. Còn tiền thì Sếp yên tâm: tôi đã thử phá từng lớp và
**không tìm được đường nào phát sinh chi phí** — hiện tại workflow này còn nằm trên
nhánh riêng nên nó chưa tiêu được một phút nào của ai cả.
