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

Chính lượt đo này lòi ra lỗ hổng `ngay_sinh` (0 người có ngày sinh).

### ⚠️ Chưa chạy được: `wrangler dev` trên máy này

`workerd` **crash khi khởi động** (`*** std::terminate() called with no
exception`) ở cả `wrangler d1 execute --local` lẫn `wrangler dev`. Nên **chưa
có lượt bấm thử trên trình duyệt thật**. Phần giao diện được kiểm bằng: id
trùng · mọi `$('#id')` có thật trong HTML · BH-19 (`hidden` vs `display`) ·
`node --check`. **Đây là khoảng trống có thật, nói ra chứ không giấu** — cần
một lượt bấm tay trước khi phát hành.

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

## Việc còn để lại

- **Cần một lượt bấm tay trên trình duyệt** trước khi phát hành (`workerd` không
  chạy được ở máy này).
- `cong_viec.jd_dau_ra_id` — nối JD vào Trạm Mục Tiêu, mở khi hết Rule 13.
- `so_cccd` / `so_bhxh` / `anh_cccd` — vẫn là cột ghi-một-chiều, **cố ý không
  đụng** (ngoài phạm vi bản giao việc). Phiếu riêng theo SPEC-0007 §14.
- Nhắc hạn hợp đồng (T-45/T-15/T-3, D+1…D+25) theo SPEC-0007 §4: **chưa làm**.
  Đợt 1 hoãn sang "đợt sau", bản giao việc Đợt 2 chỉ yêu cầu sinh nhật. Cơ chế
  đã sẵn: cắm thêm một hàm vào `quetNhacNhanSu()` là xong, dải Exception-First
  đã hiện sẵn số hợp đồng quá hạn / sắp hết hạn.
