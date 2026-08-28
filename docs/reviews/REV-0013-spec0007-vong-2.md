# REV-0013 · SPEC-0007 vòng 2 — soi **hai** commit trong một lượt

- **A · `bdfefeb`** (`feature/spec-0007-dot1-hop-dong`) — vòng sửa 1 cho `REV-0009`. Soi lần đầu.
- **B · `874b399`** (`feature/spec-0007-dot234-hoso`) — vòng sửa 1 cho `REV-0010`.
- **Người soi:** HỒ LY · 2026-08-27 · đọc bằng `git archive`/`git show`, không `checkout` (BH-18).
- **Kết luận: A `PASS_CO_DIEU_KIEN` · B `PASS`.** Không còn lỗi chặn phát hành.
  Toàn bộ 3 lỗi `REV-0009` và 5 lỗi `REV-0010` **đã hết ở tầng máy chủ**.
  Phần còn thiếu của A nằm ở **giao diện**, và nó làm hỏng đúng lời khai
  "không xoá âm thầm".

---

## A · `bdfefeb`

### ISSUE-1 · ca mồ côi — **ĐÃ VÁ** (máy chủ)

| Điểm | Trạng thái |
|---|---|
| Đăng ký `cho_duyet`/`cho_xep` khi chuyển khoán | `donCaKhiChuyenKhoan` (`src/ca.js:288`) huỷ + ghi `ca_lich_su`, có lý do đọc được |
| Sức chứa được giải phóng | **CÓ** — `caDangMo` (`ca.js:213`) và `chayPhanBo` (`ca.js:485`) đều `JOIN nhan_su … loai_lao_dong <> 'khoan_viec'` |
| **`chotLich` còn khoá lịch cho người ký khoán không** | **KHÔNG.** `chotLichTuan` (`ca.js:678`) lọc ở cả `SELECT` lẫn `UPDATE`. Tôi `git grep 'da_xac_nhan' bdfefeb -- src/` — **chỉ có một chỗ ghi** trạng thái này, không còn đường vòng nào |
| `loai_lao_dong` có thể NULL làm hỏng phép `<>`? | Không — `them-dangky-ca.sql:19` khai `TEXT NOT NULL DEFAULT 'toan_thoi_gian'` |

> ⚠️ **N-1 (TB — làm hỏng chính lời khai, nên sửa trước khi ghép).**
> Máy chủ trả `bo_qua_khoan` + `bo_qua_ai` (tên + số ca). **Giao diện không đọc.**
> `public/assets/js/app.js:5597` chỉ chạy `alert('Đã chốt ${kq.da_khoa} ca…')`.
> Anh Duy bấm Chốt lịch tuần → thấy "Đã chốt 12 ca", **không một chữ** về mấy bạn
> ký khoán bị bỏ qua. Đúng cái im lặng mà ISSUE-1 sinh ra để dẹp. Sửa: một dòng.

> ⚠️ **N-2 (TB).** Dấu vết dọn ca cũng vô hình.
> `qtSuaNhanSu` trả `don_ca` — giao diện không đọc (`git grep don_ca bdfefeb -- public` = rỗng).
> Câu giải thích đầy đủ ("Còn N đăng ký ĐÃ DUYỆT và M lịch…") nằm ở cột `ghi_chu`
> của `nhan_su_lich_su`; API `nsLichSu` (`src/index.js:260`) **có** trả `ghi_chu`,
> nhưng `veLichSuHoSo` (`app.js:3112-3115`) chỉ vẽ `luc / loai_su_kien / gia_tri_cu→moi /
> người thực hiện` — **`ghi_chu` không bao giờ hiện**.
> Kèm theo: từ điển `NHAN_SU_KIEN` (`app.js:3076`) thiếu `doi_loai_lao_dong` và
> `don_ca_khoan_viec` ⇒ hồ sơ hiện mã thô, và `ban_thoi_gian → khoan_viec` cũng
> là mã thô vì `dichGiaTri` chỉ dịch `doi_trang_thai`.

> ℹ️ **N-3 (nhẹ).** `chotLichTuan` lấy `ds` bằng `JOIN nhan_su` nhưng `UPDATE` lọc
> bằng `NOT IN (SELECT id FROM nhan_su …)`. Dòng `lich_lam_viec` trỏ tới người đã bị
> xoá hẳn sẽ **bị khoá mà không có `ca_lich_su`**, và không được đếm vào `da_khoa`.
> Chỉ xảy ra với dữ liệu mồ côi; ghi lại để không quên.

### ISSUE-2 · đếm lần ký — **ĐÃ VÁ**, đo lại đủ 10 ca

Bóc nguyên văn `xepChuoiLanThu` + `soNgay` ra chạy độc lập:

| Ca | Kết quả | Đạt |
|---|---|---|
| Ký tuần tự (đối chứng, phải không đổi) | `1:1 2:2` | ✅ |
| Nhập bù ngược ngày (2024 nhập sau 2025/2026) | `2024:1 2025:2 2026:3` | ✅ |
| Đứt quãng nhiều năm (2018 → 2024 → 2025) | `1 · 1 · 2` | ✅ |
| **Đúng 30 ngày** (phải vẫn liên tiếp) | `1:1 2:2` | ✅ |
| **31 ngày** (phải đứt) | `1:1 2:1` | ✅ |
| Chồng lấn ngày (số ngày âm) | `1:1 2:2` | ✅ |
| Cùng `ngay_bat_dau` (phá hoà bằng id) | `1:1 2:2` | ✅ |
| Ẩn bản lần 1 → `tinhLaiLanThu` | `2:1 3:2` | ✅ |
| Bản đang lưu (`id = null`) xếp cuối | `1:1 MOI:2` | ✅ |
| `ngay_het_han` trống (dữ liệu bẩn) | `1:1 2:2` | ✅ |

`tinhLaiLanThu` được gọi sau `luu()` (`hopdong.js:244`) và sau `an()` (`hopdong.js:271`) — đúng.

> ⚠️ **N-4 (TB — pháp lý, KHÔNG chặn).** Đứt quãng > 30 ngày **reset im lặng về 1**.
> Nhưng BLLĐ 2019 Đ.20 k.2**b** chỉ cho hợp đồng cũ tự thành *không xác định thời hạn*
> **khi người lao động vẫn tiếp tục làm việc**. Nếu bạn đó **làm liên tục** mà HCNS ký
> hợp đồng xác định thời hạn mới sau 45 ngày, thì bản thân việc ký đó đã sai luật —
> ERP lại ghi "lần 1", **không cảnh báo gì**. Nên: vẫn reset, nhưng bật thêm một dòng
> nhắc "đứt quãng N ngày — nếu người này làm liên tục thì HĐ cũ đã thành KXĐTH".

> ⚠️ **N-5 (TB).** `tinhLaiLanThu` **đánh số lại** các bản sau nhưng **không bật lại
> cảnh báo Đ.20** cho chúng. Nhập bù một hợp đồng cũ có thể đẩy một hợp đồng đã lưu
> lên "lần 3" — vi phạm giới hạn 2 lần — mà **không ai được báo**. `canhBao` trong
> `luu()` chỉ tính cho đúng bản đang lưu.

> ℹ️ **N-6 (nhẹ, chính tả pháp lý).** Chú thích `src/hopdong.js` ghi mốc 30 ngày là
> "Đ.20 k.2c". Sai điểm: mốc 30 ngày là **k.2b**; **k.2c** là quy tắc "chỉ được ký
> thêm 01 lần". Cả hai đều có thật, chỉ ghi nhầm chữ cái — nhưng đây là chú thích
> biện minh cho cả quy tắc reset, nên sửa cho sạch.

### ISSUE-3 · rò lý do giữa 2 hồ sơ — **ĐÃ VÁ**

`app.js:3217-3218` xoá `#nsHd-lydo` + ẩn `#nsHd-fieldlydo` ở nhánh `bSua`; cùng cặp
lệnh đã có sẵn ở nhánh "làm mới" (`3135-3136`) nên hai nhánh nay đối xứng. Cố ý không
đụng `#nsHd-nhac` là **đúng** — `capNhatNhacLoaiHd()` gọi ngay trên đó đã ghi đè.
Cảnh báo Đ.20 dựng lại ở `3260-3266` sau mỗi lần máy chủ trả `canh_bao` ⇒ **không còn
im lặng biến mất**.

---

## B · `874b399`

| Lỗi | Trạng thái | Căn cứ |
|---|---|---|
| **ISSUE-1** ô chấm trống | ✅ vá **hai tầng** thật | `src/index.js:249,253` thêm `dang_lam` ở **cả hai** nhánh SQL; `app.js:3197` đổi sang `.filter(n => n.dang_lam !== 0)`. `DS_NHAN_SU_DOC` lấy từ `/api/nhan-su` vốn đã `WHERE dang_lam = 1` |
| **ISSUE-2** cron spam | ✅ | `nhac-nhan-su.js:203-205` tách `ns_sinhnhat_thang` / `ns_sinhnhat_thang_ql`; cột mốc = **có dòng `thong_bao` cùng `loai` trong tháng**, mà vòng gửi cho quản lý tự sinh dòng `…_ql` ⇒ lượt sau `xongQL = true`. Không HCNS cũng không kẹt |
| **ISSUE-3** ngày không có thật | ✅ | `index.js:3450-3453` dựng `Date.UTC` so đủ 3 thành phần. `02-31`·`04-31`·`02-29(1995)` → 400 · `13-01` chặn từ vòng trên → 400 · `1996-02-29`·`1995-02-28` → 200. **Ngày tương lai**: chặn bởi `y > namNay - 14` (mọi năm ≥ 2013 đều trượt) |
| **ISSUE-4** migration chạy lại | ✅ | `UNIQUE (nhom, dau_ra)` + `CREATE UNIQUE INDEX IF NOT EXISTS` + `INSERT OR IGNORE` ở cả 4 khối |
| **ISSUE-5** trích dẫn pháp lý | ✅ **ĐÚNG — tôi kiểm chéo độc lập** | xem dưới |

### Trích dẫn pháp lý — kiểm chéo độc lập: **ĐÚNG cả hai**

- **NĐ 274/2025/NĐ-CP** — có thật, ban hành **16/10/2025**, **hiệu lực 30/11/2025**,
  quy định chi tiết Luật BHXH về chậm đóng/trốn đóng BHXH bắt buộc + BHTN, **0,03%/ngày**
  trên số tiền và số ngày. (Công báo Chính phủ · baohiemxahoi.gov.vn · luatvietnam.vn)
- **BLLĐ 2019 Điều 20 khoản 2** — có thật. **Điểm b**: quá 30 ngày kể từ ngày hết hạn
  mà hai bên không ký HĐ mới thì HĐ đã giao kết **trở thành không xác định thời hạn**.
  Câu trong mẫu JD `hcns` số 4 trích **"khoản 2"** ⇒ bao trùm điểm b ⇒ **không sai**.

### Bẫy "phải mở Tra năng lực trước" — **KHÔNG có bẫy. Không sửa, không cần ghi hướng dẫn.**

Khỉ Đột tự khai nhầm. `public/app.html`: `<details id="knTra">` mở ở **dòng 771**, đóng
ở **dòng 856**; ô `#knChonNguoiCham` nằm ở **dòng 812** — tức **bên trong**. Người dùng
**không thể** với tới ô Chấm năng lực mà chưa mở Tra năng lực, nên `doNguoiVao()` trong
`toggle` luôn chạy trước. Đây là mô tả sai hiện tượng, không phải lỗi.

> ⚠️ **N-7 (TB — cùng họ với ISSUE-1, nên vá luôn).** `KN_MO_ROI` (`app.js:3207`) **chốt
> `true` ngay khi mở**, trước khi biết danh sách có ai không. Hai đường chết:
> (a) `await knNapDanhMuc()` ném lỗi ⇒ hai lệnh `doNguoiVao` phía sau **không bao giờ chạy**;
> (b) `#knTra` mở trước khi `taiLaiNhanSuQuanTri()` xong ⇒ `DS_NHAN_SU_DOC` còn `[]`.
> Cả hai đều để lại ô trống **vĩnh viễn trong phiên**, im lặng — đúng hình dạng ISSUE-1.
> Sửa: bọc `try/catch`, và **đổ lại người mỗi lần mở** (không tốn API nào).

> ℹ️ **N-8 (vận hành, KHÔNG phải lỗi mã).** `CREATE UNIQUE INDEX` sẽ **báo lỗi và dừng**
> nếu `jd_mau` trên production **đã** có dòng trùng từ lần nạp nháp trước. Trước khi nạp:
> `SELECT nhom, dau_ra, COUNT(*) FROM jd_mau GROUP BY 1,2 HAVING COUNT(*) > 1;` — có kết
> quả thì dọn trùng rồi mới nạp. Chú thích trong migration đã nói, nhưng đây là việc
> phải làm bằng tay nên ghi ra đây.

---

## Đính chính đã tiếp thu

Tôi rút lại câu "chưa ai được gán quản lý trực tiếp, Sếp phải gán 29 bạn kho về anh Duy"
ở `REV-0010` §Ghi chú. Gạo tra thẳng D1 production: **anh Phạm Khương Duy đã có 17 người**,
`chua_co_quan_ly = 0` ở mọi phòng (trừ 1 người ở Ban Giám đốc — đúng). **Sơ đồ đã đầy đủ,
Sếp không phải làm gì.** Nguyên nhân anh Duy không thấy ai nằm đúng ở **ISSUE-1** (cột
`dang_lam` thiếu ở nhánh SQL không-xem-lương ⇒ `.filter(n => n.dang_lam)` quét sạch) — và
`874b399` đã vá.

---

## Thứ tự ghép vào `main`

Tôi đã chạy thử **read-only** bằng `git merge-tree --write-tree` (không `checkout`, không
`rebase` — có agent khác đang chạy, BH-18):

1. `main` (`b673d0e`) ← **A `bdfefeb`** — **SẠCH, không xung đột.**
2. `main` (sau bước 1) ← **B `874b399`** — nền chung là `4f91cd2`; `merge-tree bdfefeb 874b399`
   ⇒ **SẠCH, không xung đột.** (Hai bên cùng đụng `src/index.js` và `app.js` nhưng khác vùng
   — A ở `qtSuaNhanSu`/`bSua`, B ở `layNhanSu`/`nsNgaySinhLuu`/`dsNguoi`.)
3. Sau khi ghép, **nạp migration theo đúng thứ tự**: `them-dangky-ca.sql` (nếu chưa) →
   `them-hopdong-laodong.sql` → `them-mota-congviec.sql` (kiểm trùng `jd_mau` trước, xem N-8).
4. **Không lùi mã sau khi đã đổi dữ liệu** — cảnh báo của Khỉ Đột trong Handoff Đợt 1 là
   đúng: lùi mã mà không lùi dữ liệu thì `loaiLaoDongTuBody` âm thầm ép `khoan_viec` về
   `toan_thoi_gian` (giá trị lạ rơi về mặc định).

## Khuyến nghị

**NÊN ĐẨY CẢ HAI** — sau khi vá **N-1** (một dòng ở `app.js:5597`). N-1 là thứ duy nhất
trong danh sách làm sai một lời khai đã ghi trong commit. N-2, N-4, N-5, N-7 gộp vào một
phiếu "hiện cho người ta thấy" chạy ngay sau, không giữ hai nhánh này lại vì chúng.

### Ghi chú cho Sếp

Cả hai vòng sửa đều làm đúng việc: máy nay **không còn tự chốt lịch làm việc cho mấy bạn
ký khoán ở kho** nữa — đó là chỗ nguy nhất, giờ đã yên. Còn một chuyện nhỏ nhưng nên sửa
trước khi bật: khi anh Duy bấm "Chốt lịch tuần", máy có bỏ qua mấy bạn ký khoán nhưng
**không nói ra**, anh chỉ thấy "đã chốt 12 ca" — sửa một dòng là anh thấy đủ tên.
