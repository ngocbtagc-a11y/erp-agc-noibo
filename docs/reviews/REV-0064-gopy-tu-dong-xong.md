# REV-0064 — Đẩy code lên xong thì phiếu góp ý tự chuyển trạng thái

# ❌ FAIL — KHÔNG ĐƯỢC ĐẨY

Nhánh `feature/gopy-tu-dong-xong` · soi vòng 3 · 09/09/2026 · Hồ Ly

*(Vòng soi này bị dừng giữa chừng hôm 08/09 rồi chạy tiếp hôm nay. Mọi con số
dưới đây đã được **đo lại** trên cây làm việc hiện tại, không chép lại lượt cũ.
Hai chỗ đổi kết quả vì `main` chạy tiếp một ngày — xem §Con số và §H5.)*

**Kết luận một câu:** máy tự chốt **CHƯA an toàn để ghi vào sổ thật**. Nó không
đọc *"commit này sửa phiếu nào"* — nó đọc *"commit này có nhắc tên phiếu nào
không"*. Hai thứ đó khác nhau, và **repo này đã có sẵn một commit thật chứng
minh chúng khác nhau**.

Ba chỗ CHẶN. Cả ba đều đo được, đều dựng lại được, và không cái nào là chuyện
suy đoán. Cả ba đã được **đo lại hôm nay**, vẫn nguyên.

---

## Con số

| Việc | Kết quả (đo lại 09/09) |
|---|---|
| Gộp `origin/main` **hôm nay** | ⚠️ **ĐỤNG NHAU THẬT** — `src/index.js`. Nhánh đã lùi lại **29 commit sau main** *(xem H5)* |
| Cổng của người xây (`do-chot-gopy`) | **146 / 0** — đúng như khai |
| Bàn đo độc lập của Hồ Ly (ca 7, ca 8, ngược chiều, xác thực, migration) | **42 đạt / 3 trượt** |
| Số trạng thái mở bị đổi chỉ vì mã bị **nhắc tên** | **7 / 15** — chạy lại hôm nay, y nguyên |
| Số trạng thái mở **nhắn người gửi** chỉ vì mã bị nhắc tên | **12 / 15** — chạy lại hôm nay, y nguyên |
| Commit thật trên `origin/main` nhắc ≥2 mã (284 commit gần nhất) | **2 / 7** — 29% |
| Cột `gop_y` ra đời sau nhánh này mà máy **quên đụng** | **0** *(xem §C)* |
| Cột `gop_y` **ra đời sau** nhánh này, tính đến hôm nay | **2** — `ke_hoach_thi_cong`, `ke_hoach_luc` *(hôm qua là 0)* |

---

# CHẶN

## ❌ C1 — Nhắc tên một phiếu = đóng phiếu đó. Có commit thật chứng minh.

Máy đọc **mọi** mã `GY-…` trong tiêu đề + thân commit. Chốt bằng chứng REV-0042
C1 chỉ hỏi *"commit này có đụng file thật nào không"* — nó **không hỏi file đó
liên quan gì đến phiếu được nhắc**. Nên **một** thay đổi `src/` cấp phép cho
**mọi** mã xuất hiện ở bất kỳ đâu trong thông điệp, kể cả trong một đường link
trỏ sang repo khác.

**Bằng chứng không cãi được — commit `f1ab6c9` đang nằm trên `origin/main`:**

> `GY-0007: Kho tài liệu chết vì TDZ — dời khai báo lên trước khối khởi động`
> thân: *"**GY-0006 (chat máy tính): ĐO LẠI THẤY ĐÃ HẾT LỖI, không vá gì.**"*

Commit đó đụng `public/assets/js/app.js` → `co_code`. Dựng lại đúng hình commit
đó cho máy chạy:

```
→ GY-6 (commit tự khai "không vá gì"): hoan_thanh
→ tin gửi người báo: "Góp ý "Chat máy tính" của bạn đã được sửa xong và đã lên
   hệ thống — Kho tài liệu chết vì TDZ — dời khai báo lên trước khối khởi động."
```

Máy đóng **Hoàn thành** một phiếu mà chính commit nói thẳng bằng tiếng Việt là
**không ai đụng vào**, rồi gửi cho người báo một câu sai — kèm tóm tắt của một
phiếu **khác**.

**Không trạng thái mở nào an toàn.** Đo hết 15 trạng thái với một commit chỉ
*nhắc tên*:

- **7/15** bị đổi trạng thái (`cho_phan_tich` · `da_duyet` · `dang_lam` ·
  `dang_kiem_tra` · `can_chinh_sua` · `nghiem_thu_chua_dat` → `cho_nghiem_thu`;
  `san_sang_phat_hanh` → **`hoan_thanh`**)
- **12/15** nhắn người gửi. **Rổ an toàn cũng nhắn** — `moi`,
  `dang_phan_tich`, `cho_quyet_dinh`, `bi_chan` không đổi trạng thái nhưng vẫn
  gửi *"Đã có bản sửa cho góp ý của bạn lên hệ thống"*. Chỉ 3 trạng thái ĐÃ ĐÓNG
  là im.

**Tần suất thật, không phải giả định:** trong 284 commit gần nhất của `main`,
7 commit nhắc mã góp ý thì **2 nhắc từ 2 mã trở lên (29%)**. Đây không phải ca
hiếm — đây là cách repo này viết commit.

**Vì sao đây đúng là nỗi đau gốc, không phải chuyện nhỏ:** REV-0042 ca 8 đã bắt
đúng lớp này (`"REV-0042: soi lại GY-1, chưa sửa gì"`). Bản vá C1 chỉ bịt nhánh
*"commit chỉ sửa tài liệu"*. Nhánh *"commit vá phiếu A, nhắc tên phiếu B"* còn
mở nguyên — và đó mới là nhánh hay xảy ra.

**Đề xuất sửa:** chỉ mã ở **tiêu đề** (dòng đầu) mới được đổi trạng thái. Mã
trong **thân** chỉ được dựng cờ cho Sếp, không đổi, không nhắn. Muốn giữ nhiều
mã một commit thì đòi tiền tố tường minh (`Đóng: GY-4 GY-5`) và chỉ đọc dãy sau
tiền tố đó — cùng một luật, nhưng luật do người viết chọn ra chứ không phải máy
đoán.

## ❌ C2 — Vá rồi gỡ trong CÙNG một lượt đẩy vẫn được báo "đã sửa xong"

Chốt lùi C2 (`laCommitLui`) chỉ đúng khi commit gỡ đi **một mình**. Bảng xếp
hạng "giữ bằng chứng mạnh nhất" của C6 (`HANG_HANH_DONG`) cho `dong` = 5 và
`canh_bao_lui` = 3, nên trong cùng một lượt đẩy **bản vá luôn thắng bản gỡ**:

```
commit ①  GY-1: vá nút lưu                       (src/index.js)
commit ②  Revert "GY-1: vá nút lưu"              (src/index.js)
→ trạng thái sau: cho_nghiem_thu · da_doi=1
→ "Góp ý "Nút lưu không bấm được" của bạn đã được sửa xong và đã lên hệ thống"
```

Code trên hệ thống thật **không có bản vá**. Người báo nhận tin là có.

Đúng thứ C2 sinh ra để chặn, bị chính C6 mở lại. Hai bản vá REV-0042 chưa được
đo cùng nhau.

**Đề xuất sửa:** commit gỡ phải **phủ quyết**, không phải xếp hạng — nếu trong
lượt đẩy có bất kỳ commit nào revert một commit khác cũng nhắc mã đó, thì mã đó
không đổi trạng thái, không nhắn, chỉ dựng cờ.

## ❌ C3 — `scripts/dong-lui-gop-y.mjs` KHÔNG CHẠY ĐƯỢC trên Windows. BH-55 đã ghi đúng lỗi này.

Chạy thật trên chính máy này, chế độ chỉ-đọc *(chạy lại 09/09 — vẫn chết y hệt)*:

```
$ node scripts/dong-lui-gop-y.mjs --tim "thong bao"
X [ERROR] Unknown arguments: g.id,, g.trang_thai,, g.tieu_de,, n.ho_ten,, g.deploy_sha
💥 Error: Command failed: npx wrangler d1 execute crm-agc --local --json --command SELECT g.id, …
```

Nguyên nhân, dòng 108–110:

```js
execFileSync('npx', ['wrangler','d1','execute', …, '--command', sql],
             { shell: process.platform === 'win32' });
```

`shell: true` tắt cơ chế bọc nháy của `execFile`; câu SQL bị cắt vụn theo dấu
cách. **Mọi chế độ đều chết ở lệnh đầu tiên** — `--tim`, xem trước, `--ghi`.

Ba lý do đây là CHẶN chứ không phải "một script tay hỏng":

1. **`docs/BAI-HOC.md` BH-55 ghi đúng lỗi này**, đúng câu lỗi
   (`Unknown arguments: t.id,, …`), đo trên đúng máy này, kèm cách chữa
   (`timWrangler()` + `execFileSync(process.execPath, …)`, không `shell`).
   `scripts/dat-lai-mat-khau.mjs` đã chữa xong và có 20 dòng chú thích giải
   thích. Nhánh này đẻ file mới và **chép lại đúng lỗi đã ghi sổ**.
2. **Đây là đường lùi duy nhất** cho phiếu có bản vá lên trước hôm nay — đúng lý
   do file này tồn tại. Và nó là **cách chữa được nêu tên trong 3 tin Telegram**
   của chính nhánh này (cắt >200 commit · cắt >30 phiếu · cắt >200 mã): *"Đẩy
   thêm một lượt nữa hoặc chạy scripts/dong-lui-gop-y.mjs"*. Nhánh trả lời rủi ro
   cắt im lặng bằng một dụng cụ không chạy được.
3. **Cổng 146/0 xanh mà không thấy gì**, vì nó `import` hàm thuần `lenhDongLui()`
   rồi chạy SQL thẳng trên SQLite — không bao giờ đi qua `d1()`. BH-55 nói đúng
   câu này: *"`import` một hàm KHÔNG PHẢI là chạy script."*

**Đề xuất sửa:** dùng lại `timWrangler()` của `dat-lai-mat-khau.mjs` (Rule 1,
đừng viết bản thứ hai), bỏ `shell`, và cổng phải **spawn thật** file này ở tiến
trình riêng — ít nhất đường `--tim` và đường huỷ.

---

# CAO

## ⚠️ H1 — `fetch-depth: 50` nuốt im lặng đúng cái mà cổng cắt vừa dựng để chặn

`.github/workflows/deploy.yml` lấy `fetch-depth: 50`. Máy chủ có trần 200 commit
và **kêu Telegram khi cắt** — bản vá tốt. Nhưng lượt đẩy mang **hơn ~50 commit**
thì `git cat-file -e $DEPLOY_TRUOC` hỏng ngay ở bước gom, `phamVi()` lùi về
**đúng một commit cuối**, và nó chỉ in:

```js
console.log('Không đọc được commit trước lượt đẩy — chỉ xét đúng commit cuối.');
```

Không `::warning::`, không Telegram, không vào thân trả về. Trần server (200)
không bao giờ chạm tới vì dữ liệu đã bị cắt còn 1 từ trước đó, ở ngưỡng **thấp
hơn bốn lần**.

Nhánh này vừa gộp **102 commit** của main — đúng cỡ lượt đẩy sẽ kích hoạt.
Hỏng theo chiều an toàn (bỏ sót, không đóng nhầm), nhưng **im lặng** — mà im
lặng chính là chuyện làm Sếp phải hỏi lần thứ ba.

**Sửa:** `fetch-depth: 0`, hoặc để nhánh lùi in `::warning::` **và** gõ cửa ERP
để Telegram kêu, đúng khuôn đã làm cho khoá lệch.

## ⚠️ H2 — `do-quyen-duyet-gopy` 183/9: một cổng bắt buộc mà không bản tải nào chạy đủ được

Xác nhận lời khai, và nặng hơn một bậc.

9 phép đo đòi tài khoản `ttb` trong D1 bản máy tên `crm-agc`. **`seed.sql` chỉ
tạo `0911994696` và `0945923368`** — không có `ttb`, không có script nào trong
repo tạo nó. Câu báo lỗi *"nạp schema.sql + seed.sql trước"* **chỉ sai đường**:
làm đúng như nó bảo vẫn không có `ttb`.

**Trả lời câu hỏi "nó còn là cổng không": không.** Một cổng đỏ vĩnh viễn với mọi
người trừ một máy là một cổng sẽ bị bỏ qua — và ngày nó đỏ vì lý do THẬT thì
không ai phân biệt được. 9 phép này hiện đang bảo vệ **0 người**.

Người xây **không dựng tài khoản giả để lấy màu xanh** — đúng, và đó là lựa
chọn đúng. Nhưng để nguyên cũng không phải lựa chọn.

Thêm một chỗ nữa cổng này tự gây ra: khối đo **sửa D1 bản máy của người chạy**
(`ALTER TABLE`, đổi `mat_khau_hash`, đặt `kich_hoat = 0` ở ca ⑤). Câu trả nguyên
trạng nằm **cuối** khối `try`; ca ⑥ ném lỗi là nhảy thẳng vào `catch` và **không
trả lại** — để lại `ttb` bị khoá, mật khẩu đã đổi.

**Sửa:** cổng tự dựng lấy fixture của mình — tạo một tài khoản dùng-một-lần rồi
xoá, đúng cách nó đã tự thêm cột `duyet_gopy` và **nói ra là đã thêm**; hoặc trỏ
sang một D1 tạm thay vì `crm-agc --local` của người chạy. Và đưa câu trả nguyên
trạng vào `finally`.

## ⚠️ H3 — `da_doi` đếm cả ca không đổi một cột nào

`da_doi: chiTiet.filter(q => q.hanh_dong !== 'bo_qua').length` tính luôn
`canh_bao_lui`. Ca đó **cố ý không đụng một cột nào** của `gop_y` — chỉ ghi lịch
sử và kêu Telegram. Đo được trên 4 phiếu đã đóng tay: **0 cột đổi, `da_doi = 1`**.

Cổng ⑮ của người xây khẳng định `da_doi: 0` — đúng, nhưng chỉ vì lượt dựng lại
của họ **không có commit gỡ nào**. Thêm một commit revert là con số nói sai.

Số này in vào nhật ký Actions và là thứ người đọc tin. Không hại dữ liệu, nhưng
là một con số nói dối.

## ⚠️ H4 — Thêm ô `.o-nhieu-dong` thứ 34 mà không nhích sàn 32

`scripts/do-chu-dai-xuong-dong.mjs` giữ `SO_O_NHIEU_DONG = 32` kèm đúng câu dặn:

> *"Sàn này phải nhích theo mỗi ô mới, nếu không thì thêm ô mà quên gắn
> `.o-nhieu-dong` sẽ lọt im lặng."*

Đếm thật hôm nay: `origin/main` có **33** ô `class="o-nhieu-dong"`, nhánh này có
**34** — nhánh thêm `#gyCtKhongCodeGhiChu` (`public/app.html:726`) và **không
nhích sàn**. Cổng vẫn xanh (34 ≥ 32), nhưng từ nay ai thêm **hai** ô chữ dài mà
quên gắn lớp thì vẫn đếm được 32 — **vẫn xanh**. Một khe hở, đúng khe hở mà câu
dặn kia viết ra để bịt.

*(Lượt soi hôm 08/09 ghi "ô thứ 33" — sai một ô, main đã tự lên 33 trong lúc
nhánh nằm im. Kết luận không đổi: sàn phải là **34**.)*

## ⚠️ H5 — Nhánh lại tụt sau `main` 29 commit, và bây giờ gộp là **ĐỤNG NHAU THẬT**

Đây là chỗ **đổi so với lượt soi hôm qua**, nên ghi riêng.

Người xây khai gộp 102 commit *"chỉ vướng 2 chỗ, đều là hai bên cùng thêm"* —
đúng, **tại thời điểm họ gộp** (`115655d`, mốc `9bf41af`). Nhưng nhánh nằm im
thêm một ngày nữa, và `main` đi tiếp **29 commit**. Thử gộp lại hôm nay:

```
$ git merge-tree --write-tree origin/main HEAD
CONFLICT (content): Merge conflict in src/index.js
```

**Không còn là "hai bên cùng thêm dòng `import`" nữa** — đây là đụng nội dung
thật trong `src/index.js`, đúng file chứa toàn bộ cửa `/api/deploy/chot-gop-y`
(nhánh sửa 462 dòng ở file này). Ai gộp sẽ phải tự tay quyết giữ bên nào — và
đó là lúc dễ đánh rơi một nhánh `if` mà không cổng nào bắt được.

**Đây không phải lỗi mã, đây là lỗi để lâu.** Nhưng nó là một con số biết tăng:
10 ngày → 102 commit → gộp sạch; 11 ngày → thêm 29 commit → gộp đụng nhau. Vá
xong C1–C3 thì **gộp `main` lại trước khi đo lần cuối**, đừng đo trên nền cũ.

---

# Đã kiểm — lời khai ĐÚNG

- **6 cách đóng nhầm REV-0042: cả 6 vẫn chặn.** Dựng lại độc lập, không dùng ca
  của người xây. Chỉ có điều bảng phân loại **chưa đủ** — xem C1, C2.
- **Không đụng 4 phiếu đã đóng tay.** Kiểm bằng cách khác hẳn: 4 phiếu đóng sẵn
  đủ cột, rồi bắn 4 **kiểu commit khác nhau** (vá thật · revert · chỉ tài liệu ·
  đúng commit đã đóng dấu), so **toàn bộ bảng `gop_y` từng cột** trước/sau →
  **0 cột đổi**, 0 tin nhắn mới, đúng 1 dòng lịch sử cảnh báo của ca revert
  (đúng thiết kế). Chỉ `da_doi` đếm sai (H3).
- **Ngược chiều — phiếu đang mở.** Bảng 15 trạng thái: 7 đổi đúng bảng luật,
  8 giữ nguyên đúng. `hoan_thanh` → `next_owner = NONE`, `can_xac_minh_lai = 0`,
  `dong_kieu = 'code'`. `cho_nghiem_thu` → `next_owner = NGUOI_GUI`.
- **Bất biến bộ ba** (`trang_thai` ↔ `current_owner`/`next_owner`): chạy 15
  trạng thái qua máy → **0 lệch**. Máy luôn ghi cả ba cột cùng lúc.
- **Cửa xác thực.** Thiếu khoá Cloudflare → 503, không đổi gì. Ký bằng khoá khác
  → 401. Bản tin cũ 45 phút → 401. Bản tin ở tương lai 45 phút → 401. Phát lại
  nguyên văn 3 lần → 0 đổi thêm, 0 tin thêm, 0 dòng lịch sử thêm.
  *Ai giả được:* ai có quyền ghi vào repo (chạy được workflow) thì ký được bản
  tin và **khai bừa `cac_tep`** — biên giới tin cậy là quyền ghi repo, không hơn.
  Chấp nhận được, nhưng nên ghi ra thành lời trong tài liệu.
- **Migration chưa chạy → lớp đỡ có thật.** Thiếu cột → **503**, `ly_do:
  "thieu_cot"`, **0 cột đổi**, có `console.warn` chỉ đúng file cần nạp. Tính
  năng đang nằm im an toàn — khai đúng.
- **Ca nửa vời** (migration đã chạy, `DEPLOY_CHOT_KHOA` chưa đặt) → **503**,
  0 cột đổi, đúng **1** dòng cảnh báo Telegram/ngày. Cửa **không** mở toang.
- **Đồng hồ `cho_duyet_tu_luc` — bản vá đúng cả hai chiều.** Đổi trạng thái thật
  → bấm lại hôm nay. Chỉ đóng dấu (`cho_nghiem_thu`) → **giữ nguyên 19 ngày đã
  chờ**. Chỉ dựng cờ (`moi`) → giữ nguyên. Đang `bi_chan` → giữ nguyên (đúng
  luật đóng băng của cửa 14).
- **Số phiếu bậy.** `GY-0` · `GY--5` · `GY-99999999` (8 chữ số) · `GY12` ·
  `LEGY-1` → đều **không** thành mã. `GY_0000002` → đọc đúng thành 2 (đúng, repo
  viết `GY-0007`). Mã không tồn tại → `bo_qua`, không nổ, 200.
- **50 mã một lượt đẩy.** `tong_nhac_toi=50`, xử 30, `bi_cat=20` **nói ra trong
  thân trả về** + Telegram; 20 phiếu còn lại không bị đụng, không bị báo nhầm.
- **Lượt đẩy gộp.** Bộ gom dùng `git log --no-merges`, nên commit gộp không tự
  nó đóng gì; các commit của cả hai nhánh vẫn được đọc bình thường và commit đã
  đóng dấu trước đó bị `da_dong_dau` chặn đúng.
- **0 bàn đo neo vào chuỗi mã sẽ âm thầm xanh.** Có **2** chỗ đọc mã nguồn rồi so
  chuỗi (`src/chot-gop-y-deploy.js` ở ca đối chứng; `.gy-the-nut > button` trong
  CSS). Kiểm cả hai: đổi tên/đổi định dạng thì chúng **đỏ**, không bao giờ xanh
  nhầm — đúng chiều an toàn. Lời khai đứng vững.
- **CRLF.** Bộ đọc mã của nhánh (`docMaGopY`, `laCommitLui`, bộ gom `\x00/\x01`)
  không phụ thuộc `\n`; không có màu đỏ nào do CRLF gây ra.
- **`bang_chung_url = <sha>`** máy tự dán vẫn **hợp lệ** với đúng hàm người dùng
  (`gopYBangChungHopLe` nhận cả `^[0-9a-f]{7,40}$`), và giao diện in ra dạng chữ
  đã `esc`, không dựng link hỏng.
- **CSS: nhánh thêm 0 dòng.** Dùng lại `.o-nhieu-dong` và `.gy-the-nut` có sẵn
  trên main. Nút mới không tự bịa màu (chỉ `btn-primary` / `btn-phu`), nằm trong
  khung có `min-height: 44px`.

---

# Lời khai LỆCH SỐ ĐO

### ✖ `cho_duyet_tu_luc` **KHÔNG** "ra đời SAU nhánh này"

| | |
|---|---|
| Cột thêm ở | `53c77ef` — **28/08/2026** |
| Nhánh cắt ra từ | `a9dc0f1` — **29/08/2026** |

Cột đã **có sẵn từ hôm trước** khi nhánh được cắt. Đây **không phải** trôi dạt
do gộp main — đây là **một luật đã ghi trên sổ (cửa 14, REV-0030) mà đường ghi
mới không áp**. Bản vá đúng, nhưng chẩn đoán sai, và chẩn đoán sai làm hỏng câu
hỏi tiếp theo.

### Con số cho lớp "cột ra đời sau mà máy quên đụng": **0 quên · 2 mới**

Quét mọi migration thêm vào `main` sau `a9dc0f1` **cho tới mốc nhánh đã gộp**
(`9bf41af`): 9 file, **không file nào** `ALTER TABLE gop_y`.

**Nhưng lớp này KHÔNG rỗng — nó chỉ rỗng trong đúng một ngày.** Quét lại hôm nay
trên 29 commit `main` mới: `migrations/them-gopy-kehoach.sql` (commit `53df5ab`,
Sếp chốt 06/09) thêm **2 cột `gop_y`**:

```sql
ALTER TABLE gop_y ADD COLUMN ke_hoach_thi_cong TEXT;
ALTER TABLE gop_y ADD COLUMN ke_hoach_luc TEXT;
```

**Máy tự chốt có phải đụng hai cột này không? — Không, và lần này là đúng.** Đã
truy đường đọc: `src/vp-kehoach.js:71` chỉ soạn kế hoạch cho
`trang_thai IN ('da_duyet','dang_lam') AND ke_hoach_thi_cong IS NULL`. Máy tự
chốt đẩy `da_duyet`/`dang_lam` → `cho_nghiem_thu`, tức là phiếu **rơi ra khỏi
hàng đợi soạn kế hoạch** — đúng, việc đã lên hệ thống rồi thì không cần soạn kế
hoạch làm nó nữa. Kế hoạch cũ giữ nguyên làm sổ sách, cũng đúng.

**→ Con số Sếp hỏi: 0 cột bị bỏ quên. Nhưng lớp thì có 2 cột mới trong 3 ngày.**
Đó mới là câu trả lời thật: **lớp này tự đầy lại mỗi lần nhánh nằm im**. Không
đo một lần rồi ghi "0" là xong được — phải đo **ngay trước khi đẩy**, sau khi
gộp `main` lần cuối (H5). Hôm qua lớp này là 0; hôm nay là 2; ngày mai chưa
biết.

**Lớp đúng phải quét là "luật đã có sẵn mà đường ghi mới không áp".** Đã quét
hết: so từng cột `gop_y` mà đường của NGƯỜI (`gopYDoiTrangThai`) đụng khi chuyển
trạng thái với đường của MÁY.

- `nhac_duyet_luc` · `risk` · `duyet_*` · `so_lan_gui_lai` · `ly_do_tu_choi` —
  người chỉ đặt lại ở đường "gửi lại", máy không đi đường đó → **không phải lỗi**.
- `hoan_tac_json` — máy để nguyên, nhưng `hoanTacConDung()` so
  `sau_next_owner === g.next_owner` nên bản hoàn tác cũ **tự hết hiệu lực** đúng
  chiều an toàn → **không phải lỗi**.
- `can_xac_minh_lai` — máy đặt 0 đúng khi sang `hoan_thanh`, khớp người.
- `cho_duyet_tu_luc` — **đã vá, đúng cả hai chiều.**

→ **Sau bản vá: còn 0 cột bị bỏ quên.** Con số Sếp hỏi là **0**, nhưng vì lý do
khác với lý do người xây nghĩ.

### ✖ "GY-2 / GY-3 mâu thuẫn **có sẵn từ trước**" — nhiều khả năng là **do lượt đóng tay vừa rồi**

`next_owner = 'HOLY'` là **đúng cặp chủ của `cho_phan_tich`**
(`GOPY_OWNER_THEO_TT.cho_phan_tich = ['HOLY','HOLY']`) — đúng chỗ 4 phiếu đó
đang nằm trước khi được đóng. Hình dạng này khớp với *"câu UPDATE tay đổi
`trang_thai` mà không đổi `next_owner`"*, không khớp với hỏng ngẫu nhiên có sẵn.

**Mức nguy hôm nay: THẤP.** Đã kiểm hết đường đọc:
- Cả 3 nhánh `gopYNhacSla()` đều lọc `trang_thai IN ('moi','cho_nghiem_thu')` →
  cron **không** đụng phiếu `hoan_thanh`. Không có ai bị nhắc nhầm.
- `veTienDo()` xử `hoan_thanh` **trước** nhánh đọc `next_owner`, nên màn hình
  không in "Đang được xử lý tự động" cạnh nhãn Hoàn thành.
- `gyDaCho()` loại thẳng `hoan_thanh`.

**Nhưng nó là bẫy đang cài.** `app.js:6604` sẽ lộ ngay nếu ai đảo thứ tự nhánh,
và `hoanTacConDung()` so `next_owner` để quyết định bản hoàn tác còn hiệu lực
hay không.

**Và đây mới là chỗ đáng nói:** máy tự chốt **không tạo ra được** kiểu hỏng này
— đo 15 trạng thái, **0 lệch**, vì nó luôn ghi
`trang_thai`/`current_owner`/`next_owner` trong **cùng một câu UPDATE**. Lượt
sửa tay thì có. Việc cần làm là **nắn lại 4 dòng đó cho khớp bảng**
(`current_owner = 'NONE', next_owner = 'NONE'`) và từ nay đóng tay bằng
`dong-lui-gop-y.mjs` (sau khi C3 được vá) chứ không bằng `UPDATE` viết tay.

### Ca xấu khác — xác nhận

- **GY-1 mang cờ "Hoàn thành nhưng chưa có bằng chứng"** — đúng, và giao diện
  nói đúng sự thật: `gyNhanTrangThai()` in nhãn xám *"Hoàn thành (cần xác minh
  lại)"* chứ không cho màu xanh. Không phải lỗi của nhánh này.
- **Trần 200 commit nay có kêu, nhưng kêu qua Telegram** — đúng. Telegram hỏng
  thì lại im. Nhưng `bi_cat` / `cat_commit` / `cat_ma` **có nằm trong thân trả
  về**, và bước Actions in nguyên thân đó, nên còn một đường thứ hai. Chấp nhận
  được. *(Cái thật sự im là H1 — nó không có đường nào cả.)*
- **Ô nhắn 500 ký tự cao trần 132px rồi cuộn dọc** — đúng. `.o-nhieu-dong` đặt
  `max-height: 132px; overflow-y: auto; overflow-x: hidden`, có tự cao theo chữ
  (`caoTheoChu`), và `.field textarea.o-nhieu-dong { min-height: 0 }` gỡ sàn 90px
  nên **không** ăn bớt dòng ở 375px. Hợp luật một màn.

---

# Cổng đã chạy lại

| Cổng | Kết quả | Khớp lời khai |
|---|---|---|
| `do-chot-gopy` | **146 / 0** *(chạy lại 09/09)* | ✔ |
| `do-cat-im-lang` | **SẠCH** *(chạy lại 09/09)* | ✔ |
| `do-tach-vai-tro` | **61 / 0** *(chạy lại 09/09)* | ✔ |
| `do-o-ngay` | **107 / 0** *(chạy lại 09/09)* | ✔ |
| `do-bang-that` | sạch, 0 đỏ | ✔ |
| `do-chu-dai` @375px | **XANH** | ✔ |
| `do-duong-di-tiep` | **21 / 0** *(chạy lại 09/09)* | — |
| `do-quyen-duyet-gopy` | **183 / 9** | ✔ *(H2)* |
| `do-tu-lam-moi` | **51 / 3** | ✔ — nợ của main |
| `do-trangthai-nguoigui` | **62 / 18** | ✖ **không khai** — xem dưới |
| Bàn đo độc lập Hồ Ly | **42 đạt / 3 trượt** | C1 ×2 · C2 ×1 |

### `do-trangthai-nguoigui` 62/18 — đỏ, nhưng KHÔNG phải của nhánh này

18 phép trượt đều là **một lỗi duy nhất**, phép A ("ô tiêu đề = ô thân"), nhân
lên 3 vai × 6 bề ngang: bảng góp ý có **6 ô tiêu đề nhưng 8 ô thân**
(vai AN: 5 vs 6). Chính chú thích cổng ghi mốc cũ là *"7 = 7 · 7 = 7 · 8 = 8,
không lệch một ô nào"* — nên số ô tiêu đề đã tụt đi ở đâu đó.

**Đã dựng worktree riêng tại `origin/main` (9bf41af) và chạy lại cổng này:
kết quả GIỐNG HỆT — 62 / 18.** Vậy đây là **nợ của `main`**, không phải nhánh
này gây ra. Nhánh chỉ thêm một panel thẻ (`veTheDaLen` / `.gy-the-ds`), không
đụng một dòng `<th>` / `<td>` nào — đã soi diff để xác nhận.

⚠️ Nhưng đây là một cổng **đỏ mà không ai khai** — nó nằm đúng trên màn Góp ý,
đúng màn nhánh này sửa. Cần vào danh sách nợ của main để không lẫn với đỏ thật
lần sau.

# Nợ KHÔNG tính vào nhánh này

- `do-tu-lam-moi` **51 / 3** — nợ của `main` (đã khai).
- `do-trangthai-nguoigui` **62 / 18** — nợ của `main` (**chưa ai khai**, Hồ Ly
  đã chứng minh bằng worktree `origin/main`).
- `do-gop-viec` đỏ — chờ Sếp chốt.

---

# Việc phải làm trước khi đẩy

1. **C1** — chỉ mã ở tiêu đề mới được đổi trạng thái; mã trong thân chỉ dựng cờ.
   Thêm ca đối chứng dựng lại nguyên văn `f1ab6c9`.
2. **C2** — commit gỡ phải **phủ quyết**, không xếp hạng.
3. **C3** — bỏ `shell`, dùng `timWrangler()`; cổng phải **spawn thật**
   `dong-lui-gop-y.mjs`, không `import` hàm.
4. **H1** — `fetch-depth: 0`, hoặc nhánh lùi phải kêu.
5. **H2** — cổng tự dựng fixture của mình; sửa câu chỉ dẫn sai; trả nguyên trạng
   trong `finally`.
6. **H3** — `da_doi` không đếm `canh_bao_lui`.
7. **H4** — nhích `SO_O_NHIEU_DONG` lên **34**.
8. **H5** — gộp `origin/main` **lại** (đang đụng nhau ở `src/index.js`), rồi
   **đo lại từ đầu** trên nền mới, gồm cả lượt quét cột `gop_y` mới sinh.
9. **Dọn dữ liệu** — nắn `current_owner`/`next_owner` của GY-2, GY-3 (và soát
   nốt 2 phiếu còn lại trong 4 phiếu đóng tay) về `NONE`.

Sếp dặn *"xong thì đẩy"* — nhưng cái này **chưa xong**. Máy đang được phép viết
chữ "Hoàn thành" vào sổ thật dựa trên một mã số bị nhắc tên đi ngang qua, và
repo đã có sẵn commit chứng minh chuyện đó xảy ra. Đóng nhầm một phiếu là mất
lòng tin của người báo — đúng thứ chính file `chot-gop-y-deploy.js` viết ở đầu
là "mất mát lớn nhất".
