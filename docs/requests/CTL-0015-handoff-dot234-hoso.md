# Handoff — SPEC-0007 Đợt 2 · 3 · 4

**Request:** CTL-0015 · **Spec:** SPEC-0007 §5 · §6 · §7 · §8 · **Agent:** KHỈ ĐỘT
**Nhánh:** `feature/spec-0007-dot234-hoso`, tách từ `feature/spec-0007-dot1-hop-dong` @ `4f91cd2` — **KHÔNG** tách từ `main` (BH-11/BH-14: cùng đụng tab Nhân sự thì phải nối tiếp).
**Trạng thái:** `READY_FOR_REVIEW` — chưa merge, chưa push, chưa deploy, **chưa chạy migration lên mây**.

| Commit | Nội dung |
|---|---|
| `daa129b` | Đợt 2 — nhắc sinh nhật |
| `43f0ea8` | Đợt 3 — mô tả công việc theo MBOs + 24 mẫu điền sẵn |
| `f83f7eb` | Đợt 4 — bộ năng lực **+ vá lỗ hổng `ngay_sinh` của Đợt 2** |

> ⚠️ **Một chỗ lệch với yêu cầu "commit riêng từng đợt":** phần vá `ngay_sinh`
> (thuộc Đợt 2) nằm trong commit Đợt 4, vì nó sửa cùng các file `src/index.js`,
> `public/app.html`, `app.js`, `api.js` mà Đợt 4 đang sửa — tách ra phải cắt
> theo hunk, dễ tạo ra một commit không chạy được. Nội dung của nó tách bạch
> hoàn toàn trong thông điệp commit; review nó như một mục của Đợt 2.

---

## ĐỢT 2 — Nhắc sinh nhật

**Bỏ hẳn con số 30 của yêu cầu gốc.** Tháng 2 không có ngày 30 → sinh nhật
tháng 3 sẽ **không bao giờ** được báo. Cũng không dùng "ngày cuối tháng": rơi
vào Chủ nhật ~1/7 số tháng, mà ADR-0013 cấm gửi Chủ nhật → mất trắng tháng đó.
Dùng **cửa sổ 5 ngày cuối tháng**, bắn ở ngày đầu tiên đủ điều kiện →
**đúng 1 lần/tháng, mọi tháng**, tháng 2 chạy y hệt tháng 31 ngày.

Chống trùng bằng **chính bảng `thong_bao`** (`loai` + `date(tao_luc)` cho lời
chúc, `loai` + `strftime('%Y-%m')` cho bản tin tháng) — **không thêm một cột
cờ nào**. Cron chạy lại, deploy giữa chừng, lỡ một lượt đều vẫn đúng.

| Điều | Xử thế nào |
|---|---|
| Bẫy 29/02 | Năm không nhuận thì **28/02 nhận thêm `'02-29'`** → được chúc hằng năm, không phải 4 năm/lần |
| Người đã nghỉ | `dang_lam = 1` là điều kiện **cứng** trong câu SQL — không bao giờ chúc người đã nghỉ |
| Riêng tư | `cong_khai_sinh_nhat`, **mặc định BẬT** (câu 1 Mục 13). Chính chủ tự tắt ở panel "Trạng thái của tôi", **không phải đi xin HCNS** |
| Cơ chế nhắc | Cùng cron 5 phút, cùng `guiThongBao()` **truyền từ ngoài vào**, khung 8h–18h, không gửi Chủ nhật (thứ Bảy **vẫn** làm — ADR-0013). **Không dựng cơ chế thứ hai** |
| Gộp tin | Quản lý có 2 người sinh nhật cùng ngày → **một** tin, không hai |

Bản tin tháng: HCNS nhận **danh sách đầy đủ** (không chịu công tắc — dữ liệu
vận hành, và bản tin chỉ nêu ngày/tháng, **không nêu năm sinh**); quản lý trực
tiếp nhận **chỉ người trong nhóm mình** và **có** chịu công tắc — quản lý không
xem được hồ sơ như HCNS. Đó là ADR-0011 A2 áp nguyên xi, **không đẻ luật thứ hai**.

### ⚠️ Lỗ hổng đã vá — `ngay_sinh` là cột CHỈ CÓ CHIỀU GHI

Audit CTL-0015 §2 chốt *"`ngay_sinh` ĐÃ CÓ SẴN → chỉ cần cron đọc. Đây là việc
rẻ nhất trong cả bản giao việc"*. **Cột có thật, nhưng kết luận đó thiếu một nửa.**

Đo, không đoán:
- D1 local (bản sao, 46 bảng, đủ schema hiện hành): **0 người đang làm có `ngay_sinh`**.
- Quét `src/` + `public/`: cột này được **GHI đúng một chỗ** — `src/nhansu.js:130`,
  luồng nhận hồ sơ mới / đọc CCCD. Người **đã ở trong hệ thống** thì không có
  đường nào sửa. Và trước đợt này **không một `SELECT` nào** đọc nó ra.

Phát hành Đợt 2 mà thiếu đường nhập thì cron chạy đủ, log sạch, không lỗi, và
**im lặng mãi mãi**. Đã thêm `GET /api/nhan-su/sinh-nhat` · `POST /api/nhan-su/ngay-sinh`
(cửa `them_nhan_su`, ghi `nhan_su_lich_su`) + ô nhập trong hộp Hồ sơ. Chỉ nhận
`YYYY-MM-DD`: lọt `"31/12/1990"` là mọi `strftime` trả NULL im lặng.

---

## ĐỢT 3 — Mô tả công việc theo MBOs

**Chỗ ép outcome nằm ở tầng DỮ LIỆU, không nằm ở giao diện:** `do_bang TEXT NOT NULL`.
Không thể gõ *"quản lý kho"* rồi bấm Lưu, vì phải điền tiếp "đo bằng gì" — và
đúng lúc đó người viết tự thấy câu mình vừa viết không đo được. Ràng buộc ở DB
nên **gọi thẳng API cũng không lách được**.

Thêm **cảnh báo mềm** khi đầu ra mở đầu bằng *quản lý · theo dõi · hỗ trợ ·
phối hợp · thực hiện · đảm bảo*. **Chỉ nhắc, không chặn** — tiếng Việt không đủ
tin cậy để chặn cứng: *"Sổ quản lý tồn kho đã khoá"* là một đầu ra **đúng**.

**Gắn theo CHỨC DANH**, không theo người: 24 người nhưng ~8 chức danh, và JD
thuộc về **vị trí** — người nghỉ thì JD ở lại cho người kế nhiệm. `nhan_su_id`
chỉ dùng cho phần **kiêm nhiệm**, và chỉ nhận nếu người đó **thật sự giữ chức
danh đó** (không thì JD của vị trí người ta không giữ sẽ mọc một dòng treo).

**24 mẫu điền sẵn cho 4 vị trí thật** — kho vận · kế toán · HCNS · vận hành sàn.
Viết đúng nghiệp vụ TMĐT thực phẩm nhập khẩu: hạn sử dụng theo lô, FEFO, đơn
hoàn, sức khoẻ gian hàng Shopee/TikTok, tiền chậm nộp BHXH 0,03%/ngày. Bàn thử
quét lại cả 24 mẫu bằng **chính hàm cảnh báo của máy chủ** — không mẫu nào mở
đầu bằng động từ hoạt động, vì mẫu dạy sai thì người ta viết sai theo.

> Mẫu là **gợi ý**, không phải JD đã duyệt. Cố ý **không có** nút "nhập cả bộ":
> một tập JD nhập hàng loạt mà chưa ai đọc lại thì không ai coi đó là cam kết
> của mình. Đúng luồng câu 3 Mục 13 — **quản lý mảng viết, HCNS nhập**.

### Nối Trạm Mục Tiêu — làm bước TỐI THIỂU, và đây là ranh giới

`cong_viec` là vùng cấm Rule 13, nên **không đụng một dòng nào**. Bước tối
thiểu đã làm: `GET /api/mo-ta-cong-viec?nhan_su_id=X` trả đúng bộ đầu ra đã cam
kết của người đó, **mở cho mọi người đã đăng nhập**. Khi Rule 13 hết hiệu lực,
form giao việc chỉ cần gọi đúng đường này để đổ vào ô `dau_ra` **đã có sẵn**
trong `cong_viec` — **không cần thêm cột, không cần sửa máy chủ**.
Cột `cong_viec.jd_dau_ra_id` mà spec §6 khai trước: **chưa thêm**, đúng như dặn.

---

## ĐỢT 4 — Bộ năng lực

Làm theo đúng cách Gạo chốt: **xây cho MỌI người, không cắt xén**, nhưng
**không ép nhập hàng loạt** — danh mục chia 5 nhóm, **kho nhập trước**.

**Hai màn hình là lý do tồn tại của bảng này.** Không có chúng thì đây là bảng
chữ chết, và sau 2 tuần không ai cập nhật:

| Màn | Trả lời | Ca khó đã xử |
|---|---|---|
| ① Ai làm được việc này? | Xếp ca: ai lái được xe nâng, ai vận hành máy | **Không ai đạt mức này** → nói thẳng *"việc này hôm nay không xếp ca được"*, không trả rỗng im lặng |
| ② Ai thay được khi nghỉ? | Phủ được mấy kỹ năng, **phần nào sẽ đứng lại** | Người **chưa được chấm** → báo *"chưa chấm"*, **không** báo *"không ai thay được"* — hai kết luận dẫn tới hai hành động khác hẳn nhau |

Cộng cảnh báo ngược: **kỹ năng chỉ MỘT người biết** → vào dải Exception-First,
việc có rủi ro an toàn tô đỏ và xếp trước. Đó là điểm chết của kho — thứ hôm
nay chỉ nằm trong đầu anh Duy.

**Màn "Chấm năng lực" đặt ở tab Nhân sự, không chỉ trong hộp Hồ sơ.** Anh Duy
là `quan_ly_kho`, **không có `them_nhan_su`**, nên **không mở được hộp hồ sơ** —
mà anh mới đúng là người chấm cho 29 bạn kho. Đặt màn chấm chỉ trong hộp hồ sơ
là đúng người duy nhất cần nó lại không vào được. Chấm cả tổ trong một màn ≈ 40
phút; bấm vào ra 29 hồ sơ thì không ai làm hết.

- **Danh mục cố định 27 kỹ năng**, khuôn Data Lock (`hoat_dong` + `trang_thai`
  mặc định `'nhap'`), `ten` **UNIQUE** ngay ở DB. **Không một ô gõ tự do nào**
  trong cả module — đó là thứ duy nhất ngăn `Excel`/`excel`/`MS Excel`.
- Mỗi kỹ năng có **`mo_ta` = "thế nào là làm được"**, hiện ngay dưới ô chọn.
  Hai quản lý chấm cùng một người mà ra hai kết quả thì cả bảng vô dụng; cách
  rẻ nhất để họ chấm giống nhau là cho họ đọc **cùng một câu**.
- **4 mức** `biet | lam_duoc | thanh_thao | day_duoc`, ràng buộc bằng `CHECK`
  ngay dưới DB. Ngưỡng xếp ca mặc định là **`lam_duoc`**: *biết* xe nâng chạy
  thế nào khác hẳn *tự lấy được pallet trên kệ cao*.
- **Quản lý trực tiếp / trưởng phòng / HCNS xác nhận. Tự khai bị chặn (Rule 9)**,
  và `nguoi_cham_id NOT NULL` → không có người chấm thì không có dòng.
- **Cố ý KHÔNG làm** "gợi ý người khi giao việc": chạm `cong_viec` (Rule 13) và
  dễ trượt thành đo năng suất cá nhân (điều cấm 20). Cùng lý do, ứng viên xếp
  theo **số kỹ năng phủ được**, không theo tổng điểm — câu cần trả lời là *"ca
  này có chạy được không"*, không phải *"ai giỏi hơn ai"*.

---

## Files

| File | Việc |
|---|---|
| `migrations/them-sinhnhat-congkhai.sql` | **mới** — 1 cột `cong_khai_sinh_nhat` mặc định 1 |
| `migrations/them-mota-congviec.sql` | **mới** — `mo_ta_cong_viec` + `jd_mau` (24 mẫu) |
| `migrations/them-ky-nang.sql` | **mới** — `ky_nang` (27 dòng) + `nhan_su_ky_nang` |
| `src/nhac-nhan-su.js` | **mới** — cửa 8h–18h/Chủ nhật · cửa sổ cuối tháng · bẫy 29/02 · chống trùng |
| `src/mota-cv.js` | **mới** — JD: chặn cứng `do_bang`, cảnh báo mềm động từ hoạt động |
| `src/ky-nang.js` | **mới** — danh mục · chấm · 2 màn tra cứu · điểm chết · kiểm quyền chấm |
| `src/index.js` | cron gọi `quetNhacNhanSu` · `cong_khai_sinh_nhat` vào `toiLaAi`/`qtDanhSach` · `nsViecCanLam` · **đường đọc/sửa `ngay_sinh`** · 13 tuyến API mới |
| `public/app.html` | công tắc sinh nhật ×2 · ô ngày sinh · dải việc cần làm · panel Tra năng lực (3 màn) · nhóm gập JD · nhóm gập Năng lực |
| `public/assets/js/app.js` | dải Exception-First mở rộng · JD · năng lực (dùng chung 1 hàm cho 2 chỗ) |
| `public/assets/js/api.js` | 15 hàm gọi API |
| `public/assets/css/style.css` | `.sn-congkhai` · `.ns-vieccanlam` · `.jd-*` · `.kn-*` |
| `scripts/tu-kiem-nhac-nhan-su.mjs` | **mới** — bàn thử Đợt 2 |
| `scripts/tu-kiem-jd.mjs` | **mới** — bàn thử Đợt 3 |
| `scripts/tu-kiem-ky-nang.mjs` | **mới** — bàn thử Đợt 4 |
| `scripts/tu-kiem-giao-dien-0007.mjs` | **mới** — id trùng · BH-19 · ràng buộc bản giao việc |

**KHÔNG đụng:** `src/quyen.js` · `src/ca.js` · `gop_y` · `cong_viec`.
Bàn thử `tu-kiem-giao-dien-0007.mjs` **đo lại** điều này bằng `git diff`, và có
ca đối chứng chứng minh danh sách file không rỗng — nếu rỗng thì ba phép kiểm
đó vô nghĩa.

## Migrations — CHƯA chạy máy, CHƯA chạy mây

Thứ tự (sau `them-hopdong-laodong.sql` của Đợt 1):

```
node scripts/chay-migration.mjs migrations/them-sinhnhat-congkhai.sql --remote
node scripts/chay-migration.mjs migrations/them-mota-congviec.sql    --remote
node scripts/chay-migration.mjs migrations/them-ky-nang.sql          --remote
```

Deploy code **trước** migration cũng không vỡ: mọi truy vấn chạm bảng/cột mới
đều bọc `try/catch`, chưa nạp thì phần đó im lặng để trống.

**Lùi được** — mỗi file có mục "LÙI LẠI" ghi sẵn câu lệnh. Không `DROP` cột nào
đang có, không `UPDATE` một dòng dữ liệu cũ nào. Bàn thử giao diện đo lại điều
này bằng cách **bỏ chú thích trước rồi mới quét** (BH-29 — file có hẳn một khối
chú thích nói về `DROP TABLE`, quét không bỏ chú thích là báo động giả).

⚠️ `them-sinhnhat-congkhai.sql` **không chạy lại được lần hai** (`duplicate
column name`) — SQLite không có `ADD COLUMN IF NOT EXISTS`. Đúng khuôn mọi
migration `ALTER TABLE` đang có trong repo; `schema_migrations` +
`chay-migration.mjs` là thứ chặn chạy trùng. Ba file kia chạy lại được.

## Tests

| Bàn thử | Kết quả | Chạy bằng gì |
|---|---|---|
| `tu-kiem-nhac-nhan-su.mjs` | **53 đạt · 0 hỏng** | Hàm thuần + luồng quét thật trên D1 giả |
| `tu-kiem-jd.mjs` | **38 đạt · 0 hỏng** | **SQLite thật** (`node:sqlite`), SQL đọc nguyên văn từ file migration |
| `tu-kiem-ky-nang.mjs` | **45 đạt · 0 hỏng** | **SQLite thật**, dựng 6 nhân sự + 7 dòng năng lực |
| `tu-kiem-giao-dien-0007.mjs` | **24 đạt · 0 hỏng** | Quét HTML/CSS/JS + `git diff` |

**0 phút GitHub Actions, 0 token Claude, không chạm D1 thật** (BH-25).

### Ca đối chứng cố ý sai (BH-16 · BH-26)

Mỗi tính chất đều có một ca **biết trước là phải hỏng**, và nói được **vì sao
kết quả BẮT BUỘC phải khác**:

| Tính chất | Ca đối chứng | Kết quả |
|---|---|---|
| Cửa sổ cuối tháng | Bản viết cứng **"ngày 30"**, cùng dữ liệu | Tháng 2 → **không gửi** ở cả 5 ngày; tháng 1 → gửi được ⇒ hỏng **đúng chỗ**, không phải hỏng mọi nơi |
| Bẫy 29/02 | Bản chỉ khớp `MM-DD` | `'02-29'` **không** có trong kết quả ⇒ người sinh 29/02 lọt lưới |
| `dang_lam = 1` | Bật `dang_lam` của người đã nghỉ lên | Người đó **lọt vào** ⇒ bàn thử đủ nhạy |
| Khung giờ / Chủ nhật | Cửa "luôn mở" | Gửi cả Chủ nhật lẫn 3h sáng |
| `do_bang NOT NULL` | Bảng y hệt, **gỡ `NOT NULL`** | Câu `INSERT` y hệt **lọt qua** ⇒ phép kiểm đang đo đúng cột đó |
| `CHECK` 4 mức | Bảng y hệt, **gỡ `CHECK`** | Mức lạ `'gioi_lam'` **lọt qua** |
| Ngưỡng mức xếp ca | Hạ ngưỡng xuống `biet` | Người mức `biet` **xuất hiện** ⇒ bộ lọc mức thật sự chạy |
| Rule 9 (tự khai) | Quản lý trực tiếp chấm **cùng dòng đó** | `403` → `200` ⇒ chặn nằm ở **quan hệ**, không phải trùng hợp |
| Cảnh báo động từ | Bản dùng `includes` thay `startsWith` | Kêu nhầm trên *"Sổ quản lý tồn kho đã khoá"* |
| Mẫu đúng ngành | Tìm chữ *"lò hơi công nghiệp"* | **Không thấy** ⇒ phép kiểm không phải luôn-đạt |
| Quét `DROP` | Quét **không bỏ chú thích** | Báo động giả ⇒ chứng minh bước bỏ chú thích là cần |

### Mutant — chứng minh cổng chặn THẬT SỰ chặn (BH-23 · BH-28)

*"Bài kiểm đạt" không phải bằng chứng. Bằng chứng là: gỡ chốt ra thì bài kiểm
có đỏ không.* Hai mutant chạy trên cây làm việc thật:

| Mutant | Kết quả |
|---|---|
| Thêm `UPDATE <bảng cấm> SET x = 1` vào `src/ky-nang.js` | **bắt được** — 24 đạt · **1 hỏng** |
| Thêm một dòng bất kỳ vào `src/quyen.js` | **bắt được** — 24 đạt · **1 hỏng** |
| Gỡ cả hai mutant | 25 đạt · 0 hỏng |

**Chính lượt mutant này lòi ra hai lỗi của bàn thử**, không phải của code:

1. **BH-24 sống lại nguyên xi.** Ca đối chứng ban đầu viết **nguyên văn** câu
   `UPDATE <bảng cấm>` trong `tu-kiem-giao-dien-0007.mjs`. Lượt chạy kế tiếp
   nó **tự bắt chính mình**: dòng đó nằm trong diff. Sửa theo đúng BH-24 —
   mẫu nhận diện **ghép từ mảnh**, và miễn trừ **đúng một tệp** (tệp bàn thử),
   nói rõ đã miễn trừ gì.
2. **`git diff A..HEAD` chỉ nhìn phần ĐÃ COMMIT.** Mutant chưa commit thì lọt
   sạch, mà cổng vẫn in *"25 đạt · 0 hỏng"* — đúng loại hỏng-im-lặng của BH-23.
   Đổi sang `git diff <gốc nhánh>` (so với **cây làm việc**) thì mới bắt được.

### Migration áp lên D1 THẬT

Không chỉ dựng SQLite mới — copy **bản sao D1 local thật** (46 bảng, đủ schema
hiện hành) rồi áp cả 4 migration:

```
DB thật: 46 bảng, 2 nhân sự
  OK  them-hopdong-laodong.sql / them-sinhnhat-congkhai.sql
  OK  them-mota-congviec.sql   / them-ky-nang.sql
Sau: 51 bảng, 2 nhân sự · không mất dòng nào
cong_khai_sinh_nhat = 1 cho 2/2 người (mặc định BẬT, không ai bị tắt oan)
Mẫu JD: 24 · Danh mục kỹ năng: 27
```

> **Đính chính con số (REV-0010 §6).** Ba migration **của riêng Đợt 2+3+4** thêm
> đúng **4 bảng**: 46 → **50** (`mo_ta_cong_viec`, `jd_mau`, `ky_nang`,
> `nhan_su_ky_nang`) — `them-sinhnhat-congkhai.sql` chỉ `ALTER`, không thêm bảng.
> Con số **51** ở khối trên là vì lượt đo áp **cả 4** migration, tức có thêm
> `hop_dong_lao_dong` vốn thuộc **Đợt 1**. Hồ Ly đo 50 là đúng với phạm vi nhánh
> này; 51 đúng với trạng thái sau khi gộp cả Đợt 1. Ghi rõ để sau này không ai
> đi tìm một cái bảng không tồn tại.

Chính lượt đo này lòi ra lỗ hổng `ngay_sinh` (0 người có ngày sinh).

### ~~Chưa chạy được `wrangler dev`~~ → ĐÃ CHẠY ĐƯỢC (vòng sửa 1 · 27/08/2026)

Bản giao trước khai `workerd` crash (`*** std::terminate()`). **Không còn đúng.**
Hồ Ly dựng được, và tôi dựng lại được theo đúng cách đó:

1. Worktree riêng của nhánh (BH-15/18 — không `checkout` đè cây chính), nối
   `node_modules` bằng junction, **sao chép** `.wrangler/state` từ repo chính.
2. `node scripts/chay-migration.mjs` cho cả 4 migration trên **bản sao** D1.
3. Dựng tài khoản thử `duykho` (`quan_ly_kho`) + `hcnstest` (`hcns`), kèm 3
   nhân viên kho có `quan_ly_id = t_duy` và 1 kế toán **ngoài** nhóm để đối chứng.
4. `npx wrangler dev --port 8801 --local` → **chạy, `/api/*` trả 200**.

**Cái bẫy làm tôi tưởng nó crash:** khởi `wrangler dev` từ một lượt gọi đồng bộ
rồi để lượt gọi đó hết giờ — tiến trình con **bị giết theo**, còn log vẫn đứng ở
dòng `Ready on http://127.0.0.1:8801`, nên nhìn như server sống mà cổng đã đóng.
Phải chạy nền thật sự. Đây là lỗi **bàn thử**, không phải lỗi `workerd`.

**Khoảng trống "chưa bấm trình duyệt" đã lấp bằng lượt bấm thật** — và chính nó
lòi ra thêm một tầng của ISSUE-1 mà đọc code không thấy (mục dưới).

---

## Human Cost (Rule 12) — mỗi hồ sơ tốn mấy phút

| Phần | Ai nhập | Tốn mỗi hồ sơ | Cả công ty | Nhập lại không |
|---|---|---|---|---|
| **Ngày sinh** | HCNS | **~15 giây** (một ô ngày) | **~6 phút / 24 người** | Không bao giờ |
| **Công tắc sinh nhật** | Tự người đó | 0 — mặc định BẬT | 0 | Không |
| **JD** | Quản lý mảng **viết**, HCNS **gõ** | **~12 phút / chức danh** (6 đầu ra × 2 phút, có mẫu) | **~1,5 giờ / 8 chức danh**, chia 3 người | Xem lại theo quý |
| **Năng lực — kho** | Anh Duy | **~1,5 phút / người** (8 kỹ năng, tick trong 1 màn) | **~45 phút / 29 người** | Khi có người mới hoặc học thêm việc |
| **Năng lực — ngoài kho** | Quản lý từng mảng | ~1 phút / người | ~15 phút / phần còn lại | Như trên |

**Tổng để có hồ sơ đầy đủ cho một người: khoảng 3–4 phút**, trong đó phần của
HCNS chỉ ~1,5 phút (ngày sinh + hợp đồng), phần còn lại là của quản lý mảng.

Con số JD giảm được **chỉ vì có 24 mẫu điền sẵn** — không có mẫu thì ô trống
đầu tiên là chỗ người ta bỏ cuộc, và ước lượng phải nhân 3.

> **Ghi nhận công khai (điểm Sếp Ngọc đang cần rèn):** khi Hương điền xong hồ
> sơ đầy đủ đầu tiên, và khi anh Duy chấm xong năng lực cả tổ kho — nói ra một
> câu ở **buổi check-in thứ Tư 15h**, đích danh, trước mặt người khác. Gắn vào
> lịch có sẵn để không phải nhớ.

## Thứ tự nên nhập (đừng nhập song song 3 thứ)

1. **Hợp đồng** (Đợt 1) — cửa sổ cơ hội đang mở, công ty **đang** ký lại hàng loạt.
2. **Ngày sinh** — 6 phút, làm cùng lúc với hợp đồng vì cùng mở một hồ sơ.
3. **Năng lực kho** — anh Duy, một buổi.
4. **JD** — chậm nhất, vì phải chờ quản lý mảng viết nội dung thật.

---

## Bài học rút ra (Sếp/Gạo cân nhắc đưa vào `docs/BAI-HOC.md` — **tôi không sửa file đó, đang có người giữ**)

**BH-35 · "Cột đã có sẵn" không có nghĩa là "dữ liệu đã có sẵn", và càng
không có nghĩa là "người dùng nhập được".**
Audit CTL-0015 chốt *"`ngay_sinh` ĐÃ CÓ SẴN → chỉ cần cron đọc, đây là việc rẻ
nhất"*. Đúng là cột có thật. Nhưng đo trên D1 local thì **0 người đang làm có
`ngay_sinh`**, và quét repo thì cột đó chỉ được ghi ở **một** chỗ — luồng nhận
hồ sơ mới. 24 người đang ở trong hệ thống thì không có đường nào nhập. Phát
hành như vậy thì cron chạy đủ, log sạch, không một dòng lỗi, và **im lặng mãi
mãi**. BH-32 đã dạy phải kiểm **cả hai chiều** của một cột; bài này thêm chiều
thứ ba: → **Trước khi xây tính năng lên một cột có sẵn, hỏi ba câu chứ không
phải một: ① cột có tồn tại không · ② có ai ĐỌC ra không · ③ hôm nay có BAO
NHIÊU DÒNG có giá trị thật, và người dùng nhập giá trị đó Ở MÀN HÌNH NÀO?**
Câu ③ chỉ trả lời được bằng cách `COUNT(*)` trên DB thật — đọc schema không bao
giờ thấy.

**BH-36 · Xây màn nhập liệu thì phải kiểm NGƯỜI SẼ NHẬP có mở được màn đó không.**
Bộ năng lực suýt chỉ có form chấm nằm trong hộp Hồ sơ nhân sự — hộp đó gác sau
`them_nhan_su`. Nhưng người chấm cho 29 bạn kho là **anh Duy, vai trò
`quan_ly_kho`, không có `them_nhan_su`**: đúng người duy nhất cần dùng lại là
người duy nhất không vào được. Lỗi này đọc code không thấy, vì code chạy đúng
100% — nó chỉ chạy đúng cho một người không có việc gì để làm ở đó. → **Sau khi
đặt một màn nhập vào sau một cửa quyền, tra ngược `QUYEN_THEO_VAI_TRO` xem
NGƯỜI THẬT sẽ nhập mang vai trò gì, và vai trò đó có qua cửa không.** Human
Cost (Rule 12) hỏi "tốn mấy phút"; câu này hỏi trước đó một bước — *"người ấy
có bấm vào được không"*.

**BH-37 · Đồng hồ giả phải đi qua THAM SỐ, không đi qua ghi đè `Date.now`.**
Bàn thử Đợt 2 lần đầu ghi đè `Date.now` để giả ngày. Nó **không khống chế được
gì**: `new Date()` đọc thẳng đồng hồ máy, không gọi `Date.now`. Thêm nữa hàm
khôi phục chạy **trước** khi promise xong. Kết quả: 6 phép kiểm về Chủ nhật /
ngoài giờ / bản tin tháng đều **báo ✅ giả**. Suýt kết luận "code đúng" trong
khi bàn thử chưa bao giờ chạy đúng ngày mình nghĩ. Cùng họ BH-17. → **Với mọi
logic phụ thuộc thời gian, để lộ một tham số `luc = new Date()` ở cửa vào và
cho bàn thử truyền mốc giả vào đó.** Một dòng mã sản phẩm, đổi lại là bàn thử
chạy được mọi ngày trong năm. Và khi một phép kiểm thời gian *"tự nhiên đạt"*,
kiểm ngay xem đồng hồ giả có thật sự tác dụng không — in `duocGuiNhac(vn).ly_do`
ra trước khi tin.

**BH-38 · Ca "không có kết quả" và ca "chưa có dữ liệu" phải trả về HAI câu
khác nhau.** Màn *"ai thay được người này"* nếu trả một danh sách rỗng thì
người xếp ca đọc ra *"không ai thay được"* → điều động gấp, gọi người từ nhà.
Nhưng sự thật có thể là *"người này chưa được chấm năng lực nào"* → việc phải
làm là **chấm**, không phải điều động. Cùng một mảng rỗng, hai hành động ngược
nhau, và hệ thống không nói ra thì người dùng đoán — thường đoán sai. Áp cùng
chỗ khác: *"chưa có hợp đồng trong ERP"* ≠ *"không có hợp đồng"*; *"chưa nạp
migration"* ≠ *"không có dữ liệu"*. → **Mỗi màn tra cứu phải phân biệt được ba
trạng thái: có kết quả · không có kết quả · chưa có dữ liệu để mà tra** — và
nói thành ba câu riêng. Bàn thử phải có ca cho **cả ba**, không chỉ ca có kết quả.

---

## VÒNG SỬA 1 (REV-0010) — 27/08/2026 · Khỉ Đột

Năm lỗi Hồ Ly nêu đã vá hết. **Mỗi lỗi có một ca đối chứng cố ý sai (BH-16)** —
làm hỏng lại đúng chỗ vừa vá, đo thấy lỗi tái hiện, rồi trả nguyên. Bàn đo nào
không đỏ được ở bước đó thì không dùng để chứng minh gì.

### ISSUE-1 (CHẶN) — ô "Chọn người để chấm" trống với anh Duy

Vá **hai tầng**, cố ý:
- `src/index.js` `layNhanSu()` — thêm `dang_lam` vào **cả hai** nhánh SQL. Cột
  này không nhạy cảm (câu lệnh đã `WHERE dang_lam = 1`), không mở bề mặt quyền.
- `public/assets/js/app.js:3197` — đổi `.filter(n => n.dang_lam)` thành
  `.filter(n => n.dang_lam !== 0)`: chỉ loại người **đã nghỉ**, thay vì loại sạch
  khi thiếu cột. Sau này ai lỡ bỏ cột lần nữa thì giao diện **vẫn sống**.

**Đo trên trình duyệt thật** (Chrome thật, bấm thật vào form đăng nhập → tab
Nhân sự → `<details>` "Tra năng lực"):

| Đăng nhập | Ô "Chọn người để chấm…" | Cột lương |
|---|---|---|
| `duykho` (`quan_ly_kho` — anh Duy) | **9 mục** (1 dòng gợi ý + **8 người**, đủ 3 bạn kho) | **không có** |
| `hcnstest` (`hcns`) — ca đối chứng | **9 mục**, y như trước, không hụt ai | có |

> **Tầng thứ hai của ISSUE-1, chỉ lượt bấm thật mới thấy.** Bấm nút "Chấm năng
> lực" xong ô vẫn trống — vì `doNguoiVao()` chỉ chạy trong sự kiện `toggle` của
> `<details id="knTra">`, tức **phải mở "Tra năng lực" trước**, và chỉ chạy đúng
> một lần (`KN_MO_ROI`). Đọc code không thấy khác biệt này; `curl` cũng không.
> Không phải lỗi, nhưng là thứ tự bấm mà **hướng dẫn cho Sếp phải nói đúng**.

**Ca đối chứng (bỏ lại cột `dang_lam` khỏi SQL, đo lại rồi trả nguyên):**

```
BẢN VÁ   : {"coCot":true,  "locCu":8, "locMoi":8}
CỐ Ý SAI : {"coCot":false, "locCu":0, "locMoi":8}   ← lỗi cũ tái hiện đúng
TRẢ VỀ   : {"coCot":true,  "locCu":8, "locMoi":8}
```

`locCu = 0` chính là lỗi Hồ Ly đo được; `locMoi = 8` chứng minh tầng đỡ thứ hai
giữ được kể cả khi tầng máy chủ hỏng lại.

### ISSUE-2 — bản tin tháng spam quản lý khi không còn tài khoản HCNS

`src/nhac-nhan-su.js` `quetBanTinThangSau()`: **mỗi đường gửi một cột mốc riêng**
(`ns_sinhnhat_thang` cho HCNS, `ns_sinhnhat_thang_ql` cho quản lý trực tiếp).
Đường này hỏng không kéo đường kia hỏng theo.

Bàn đo SQLite **thật** (`node:sqlite`, vỏ D1 mỏng — để chính SQLite tính
`strftime`), chạy trên bản sao riêng:

| Cảnh | Trước vá | Sau vá |
|---|---|---|
| Có HCNS · 6 lượt cron | `thang`=1 · `thang_ql`=1 | `thang`=1 · `thang_ql`=1 |
| **Xoá sạch HCNS/admin · 6 lượt** | **`thang_ql`=6** | **`thang_ql`=1** |
| Xoá sạch HCNS · **30 lượt** (ép mạnh) | **`thang_ql`=30** | **`thang_ql`=1** |

Cột "Trước vá" là ca đối chứng cố ý sai — dựng lại đúng cách chống trùng cũ, ra
đúng con số 6 của Hồ Ly, và 30 lượt thì 30 tin. Sau vá đứng yên ở 1.

### ISSUE-3 — `nsNgaySinhLuu` nhận ngày không có thật

Kiểm định dạng chưa đủ; nay dựng lại `Date.UTC(y, m-1, d)` rồi so **đủ ba thành
phần**. Đo bằng POST thật lên `wrangler dev`, vai HCNS:

| Gửi lên | Trước | Sau |
|---|---|---|
| `1995-02-31` | **200** → SQLite nắn `03-03` (chúc nhầm mãi mãi) | **400** "Ngày sinh không có thật" |
| `1995-04-31` | 200 → nắn `05-01` | **400** |
| `1995-02-29` (không nhuận) | 200 → nắn `03-01` | **400** |
| `1995-13-01` | 200 → `NULL` (không bao giờ được chúc) | **400** |
| `1995-00-10` | 400 | **400** |
| `2030-05-05` (tương lai) | 400 | **400** |
| `1800-05-05` (quá xa) | 400 | **400** |
| `1996-02-29` (nhuận, hợp lệ) | 200 | **200** ✔ vẫn nhận |
| `1995-02-28` (hợp lệ) | 200 | **200** ✔ vẫn nhận |

Hai dòng cuối là ca đối chứng ngược: siết chặt mà **không** chặn nhầm ngày thật.

### ISSUE-4 — seed JD nhân đôi khi chạy lại

`migrations/them-mota-congviec.sql`: `UNIQUE (nhom, dau_ra)` + `INSERT OR IGNORE`
ở cả 4 khối, **đúng khuôn `them-ky-nang.sql`**. Thêm
`CREATE UNIQUE INDEX IF NOT EXISTS` để ràng buộc áp được cho cả bảng đã trót tạo
trước đó (SQLite không `ALTER` được ràng buộc). Mục **LÙI LẠI** bổ sung `DROP INDEX`.

Chạy migration **3 lần liên tiếp** trên D1 thật: `jd_mau` = **24 · 24 · 24**
(trước vá: 24 → 48 → 72). `ky_nang` giữ 27 như cũ.

### ISSUE-5 — trích dẫn pháp lý trong mẫu JD

Quét **cả 24 mẫu**: chỉ **2 chỗ** viện dẫn văn bản, 22 mẫu còn lại là chỉ tiêu
vận hành nội bộ. **Tra lại cả hai bằng WebSearch — cả hai CÓ THẬT**, nên giữ và
ghi đủ số hiệu thay vì bỏ đi:

- **NĐ 274/2025/NĐ-CP** — có thật, hiệu lực **30/11/2025**: chậm/trốn đóng BHXH
  bắt buộc + BHTN phải nộp thêm **0,03%/ngày** trên số tiền và số ngày chậm.
  Nguồn: `baohiemxahoi.gov.vn`, `luatvietnam.vn`.
- **BLLĐ 2019 Điều 20 khoản 2** — có thật: hợp đồng hết hạn mà người lao động vẫn
  làm việc, quá **30 ngày** không ký hợp đồng mới thì hợp đồng đã giao kết **trở
  thành** hợp đồng không xác định thời hạn.

Đầu phần seed có thêm khối chú thích ghi rõ đã tra ngày nào, nguồn nào, và luật
cho mẫu mới: **có trích luật thì phải tra nguồn trước, không thì bỏ số hiệu.**

### Tests sau vá

`tu-kiem-nhac-nhan-su` **53/0** · `tu-kiem-jd` **38/0** · `tu-kiem-ky-nang`
**45/0** · `tu-kiem-giao-dien-0007` **25/0** — **161 đạt · 0 hỏng**, cộng lượt
bấm trình duyệt thật và 3 ca đối chứng cố ý sai ở trên.

### Bài học vòng này

- **BH-mới · "136 ca xanh" không thay được một lượt bấm.** Cả 3 bộ tự kiểm
  ngoại tuyến đều xanh mà vẫn lọt ISSUE-1, vì bàn thử **tự dựng dữ liệu giả** nên
  không bao giờ thấy **hình dạng thật** của phản hồi API. Tính năng nào đọc
  `Object.keys()` của một phản hồi thì phải có ít nhất một ca gọi API **thật**.
- **BH-mới · Bộ lọc phải loại thứ mình biết là xấu, đừng giữ thứ mình đoán là
  tốt.** `.filter(n => n.dang_lam)` là "giữ thứ trông đúng" — thiếu cột thì quét
  sạch, im lặng. `.filter(n => n.dang_lam !== 0)` là "loại thứ chắc chắn sai" —
  hỏng dữ liệu thì cùng lắm hiện thừa, chứ không hiện **rỗng**. Với danh sách
  người, rỗng là chế độ hỏng tệ nhất: không ai biết mình đang thiếu ai.
- **BH-mới · Chống trùng phải tự ghi cột mốc của chính mình.** Đường gửi A mượn
  cột mốc của đường gửi B thì B tắt là A spam vô hạn. Mỗi đường một `loai` riêng.
- **BH-mới · "Server crash" phải chứng minh bằng cổng, không bằng log.** Tôi
  khai `wrangler dev` crash trong khi thật ra tiến trình con bị giết theo lượt
  gọi hết giờ, log vẫn dừng ở dòng `Ready`. Trước khi khai một công cụ hỏng:
  chạy nền thật sự rồi gọi vào cổng một lần.

---

## Việc còn để lại

- ~~Cần một lượt bấm tay trên trình duyệt~~ — **đã bấm** (vòng sửa 1). Sếp vẫn
  nên bấm lại 4 màn theo REV-0010 §7 trước khi bật, **và lưu ý thứ tự**: mở
  "Tra năng lực" **trước**, rồi mới chọn "Chấm năng lực".
- **PHIẾU RIÊNG — 6 cột ghi-một-chiều còn lại** (REV-0010 §2, Hồ Ly đo:
  ĐỌC=0 · UI=0 · dữ liệu thật 0 dòng, y nguyên trên cả nhánh gốc):
  `so_cccd` · `so_bhxh` · `gioi_tinh` · `que_quan` · `noi_thuong_tru` · `anh_cccd`.
  **Không chặn đợt này** (không tính năng nào của Đợt 2/3/4 đọc chúng), nhưng
  tính năng nào sau này chạm vào là lặp lại đúng lỗi `ngay_sinh` vừa vá. Mở phiếu
  theo SPEC-0007 §14; `so_cccd`/`anh_cccd` còn ràng buộc ADR-0011 A2 nên phải hỏi
  Sếp trước, không tự quyết.
- `cong_viec.jd_dau_ra_id` — nối JD vào Trạm Mục Tiêu, mở khi hết Rule 13.
- Nhắc hạn hợp đồng (T-45/T-15/T-3, D+1…D+25) theo SPEC-0007 §4: **chưa làm**.
  Đợt 1 hoãn sang "đợt sau", bản giao việc Đợt 2 chỉ yêu cầu sinh nhật. Cơ chế
  đã sẵn: cắm thêm một hàm vào `quetNhacNhanSu()` là xong, dải Exception-First
  đã hiện sẵn số hợp đồng quá hạn / sắp hết hạn.
