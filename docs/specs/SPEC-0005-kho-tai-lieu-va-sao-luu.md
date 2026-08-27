# SPEC-0005 — Kho tài liệu scan + Sao lưu toàn bộ dữ liệu

- **Yêu cầu gốc**: [CTL-0013](../requests/CTL-0013-kho-tai-lieu-va-sao-luu.md)
- **Người viết**: HỒ LY (Agent A — BA / Product / UX / QA)
- **Ngày viết**: 2026-08-27
- **Module**: bảng mới `tai_lieu` + `tai_lieu_lich_su` · lớp lưu file `src/kho-file.js`
  (mới) · sao lưu `src/sao-luu.js` (mới) · nối vào `scheduled()` `src/index.js:3465`
  · tái dùng `src/quyen.js`, `thong_bao`, `nenAnhChung()` (`public/assets/js/app.js:897`)
- **Risk**: **HIGH** — dữ liệu nhạy cảm (CCCD, hợp đồng lao động, lương, chứng từ
  thuế) rời khỏi Cloudflare sang kho ngoài; sai là chuyện pháp lý
- **Boundary Classification**: `NEW_FEATURE` + `CORE_CHANGE`
  (thêm entity mới vào Data Dictionary, thêm quy tắc phân quyền mới trong `quyen.js`)
- **Status**: `NEEDS_OWNER_DECISION` — **4 câu ở Mục 12 phải có trả lời trước khi
  Khỉ Đột chạm code.** Phần thiết kế còn lại đã xong, không chờ gì thêm.

---

## 0. Kết luận chi phí — trả lời trước, vì đây là ràng buộc số một

> Sếp 27/08: *"cực kỳ quan trọng, ko đc dùng linh tinh tốn tiền của tao...
> nhớ là chi phí 0 cho tao"*

### **CHI PHÍ = 0 — với điều kiện KHÔNG bật R2.**

Bảng xác minh dưới đây tra từ tài liệu chính thức, có dẫn nguồn (BH-03).

| Thành phần | Hạn mức miễn phí | Cần gắn thẻ? | Ta dùng bao nhiêu | Nguồn |
|---|---|---|---|---|
| **Google Drive** (kho file thật) | **15 GB**, dùng chung Drive + Gmail + Photos | **KHÔNG** | ~2,8 GB năm 1 (Mục 4) | [support.google.com/drive/answer/6374270](https://support.google.com/drive/answer/6374270) |
| **Google Drive API** (Worker đẩy file lên) | 400.000.000 đơn vị quota/ngày/project; 1 TB dữ liệu ra/ngày | **KHÔNG** — miễn phí trong ngưỡng | ~300 lượt gọi/ngày | [developers.google.com/workspace/drive/api/guides/limits](https://developers.google.com/workspace/drive/api/guides/limits) |
| **Cloudflare D1** (mục lục) | 5 GB tổng tài khoản · 500 MB/database · 5 triệu dòng đọc/ngày · 100.000 dòng ghi/ngày | **KHÔNG** (đã dùng) | mục lục ~150 dòng/tháng | [d1/platform/pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [d1/platform/limits](https://developers.cloudflare.com/d1/platform/limits/) |
| **Cloudflare Workers** (chạy cron) | 100.000 request/ngày · **10 ms CPU/lượt cron** · 50 subrequest/lượt | **KHÔNG** (đã dùng) | xem ràng buộc Mục 6 | [workers/platform/limits](https://developers.cloudflare.com/workers/platform/limits/) |
| **GitHub** repo riêng tư (bản sao thứ hai, tuỳ chọn) | Repo riêng tư không giới hạn số lượng; file ≤ 100 MiB; repo nên < 1 GB, **rất khuyến nghị < 5 GB** | **KHÔNG** (đã dùng) | ~20 MB/bản nén | [docs.github.com — about large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) |
| **Cloudflare R2** | 10 GB-tháng lưu trữ · 1 triệu thao tác Class A · 10 triệu Class B · **lấy dữ liệu ra MIỄN PHÍ** | ⚠️ **CÓ — bắt buộc** | **0 — đề xuất KHÔNG bật** | [r2/pricing](https://developers.cloudflare.com/r2/pricing/) · [billing policy](https://developers.cloudflare.com/billing/understand/billing-policy/) |

### Vì sao đề xuất KHÔNG bật R2

Hạn mức miễn phí của R2 **rất tốt** (10 GB, không mất phí lấy dữ liệu ra — điểm
mạnh nhất của R2 so với S3). Vấn đề không nằm ở hạn mức, mà ở **cửa vào**:

- Tài liệu R2 ghi: *"You need a Cloudflare account with an R2 subscription"* —
  phải qua luồng thanh toán trên Dashboard mới bật được
  ([r2/get-started](https://developers.cloudflare.com/r2/get-started/)).
- Chính sách thanh toán Cloudflare ghi: *"Ensure that you are using a valid
  payment method before changing your plan type or enabling subscriptions"*, và
  với sản phẩm tính theo mức dùng, Cloudflare **có thể tạm giữ tiền trên thẻ để
  xác minh** bất kỳ lúc nào trong kỳ
  ([billing policy](https://developers.cloudflare.com/billing/understand/billing-policy/)).

→ Bật R2 = **gắn thẻ tín dụng của công ty vào một dịch vụ tính tiền theo mức
dùng**. Vượt hạn mức là tự trừ tiền, không hỏi ai. Đó đúng là thứ Sếp cấm.

**Google Drive không cần thẻ, không có đường tự trừ tiền, và tài khoản công ty
đã có sẵn.** Nên chọn Drive.

> Ghi nhận theo BH-13 (hạn mức miễn phí phải có trần chặn): Drive **không có
> đường tràn sang trả tiền** — hết 15 GB thì API trả lỗi `storageQuotaExceeded`,
> không phải trừ tiền. Đây là loại trần an toàn hơn hẳn R2. Ta vẫn đặt lớp trần
> thứ hai trong code: **cảnh báo ở 80% (12 GB), chặn tải lên ở 95% (14,25 GB)**.

---

## 1. Đã chốt trước khi viết — spec này KHÔNG bàn lại

Gạo đã chốt kiến trúc ở CTL-0013 mục 2. Ghi lại để không ai thiết kế lại:

1. **ERP làm MỤC LỤC, file thật để NGOÀI.** Không nhét file scan vào D1.
2. **Sao lưu ra định dạng mở** (CSV), mở bằng Excel được.
3. **Giữ nhiều bản theo ngày**, không ghi đè một bản.
4. **Không dựng cơ chế nhắc hạn thứ hai** — ngày hết hạn nối vào SPEC-0004.
5. **Tái dùng** `quyen.js`, `thong_bao`, cron `scheduled()` đã chạy.
6. **Không đụng** `gop_y`, `cong_viec`, vùng `app.js` đang có người sửa (Rule 13).

---

## 2. Vấn đề

Hai vấn đề khác nhau, chung một gốc: **dữ liệu công ty đang không có đường ra.**

### 2.1 Không có kho tài liệu

Giấy tờ pháp lý của Alpha Green Commerce đang nằm ở: tủ hồ sơ văn phòng · Zalo ·
email · máy tính cá nhân của từng người. Sếp tự xác định lợi thế cạnh tranh là
*"sản phẩm có đầy đủ giấy tờ pháp lý thực phẩm"* — **lợi thế đó đang không có
chỗ ở chính thức.**

ERP hiện chỉ biết nhét ảnh base64 vào D1 (`src/index.js:283`, `:1643`, `:2934`,
trần 800 KB–1,5 MB). Cách đó **không dùng lại được** cho tài liệu scan: hợp đồng
10 trang không nhét vừa, và nhét vào là khoá chân đúng thứ Sếp cấm.

### 2.2 Không có bản sao lưu nào

Toàn bộ dữ liệu công ty nằm trong **một** database D1. Không có bản sao ở đâu
khác. D1 có Time Travel 7 ngày trên gói miễn phí
([d1/platform/limits](https://developers.cloudflare.com/d1/platform/limits/)) —
đó là phao cứu sinh của Cloudflare, **không phải bản sao lưu của công ty**: nó
nằm cùng nhà cung cấp, chỉ 7 ngày, và phải có Cloudflare + wrangler mới mở được.
Đúng thứ Sếp nói là không được: *"thay đổi công cụ là dùng được ngay"*.

### 2.3 Cái Sếp chưa nêu mà Gạo đã bắt: **ngày hết hạn**

Giấy phép ATTP hết hạn · tự công bố sản phẩm hết hiệu lực · hợp đồng NCC đến hạn
tái ký · CCCD nhân viên hết hạn. Sàn TMĐT khoá gian hàng vì giấy tờ hết hạn là
**mất doanh thu thật**, không phải phiền toái hành chính.

---

## 3. Chọn chỗ lưu file — so 5 phương án trước khi chốt

| Phương án | Chi phí | Cần thẻ | Sếp mở bằng điện thoại? | Đổi công cụ vẫn dùng được? | Kết luận |
|---|---|---|---|---|---|
| **Google Drive** (OAuth tài khoản công ty) | 0 | Không | **Có** — app Drive sẵn trên máy | **Có** — bỏ ERP thì file vẫn nằm trong Drive, mở tay được | ✅ **CHỌN** |
| Cloudflare R2 | 0 trong hạn mức | **Có** | Không — phải qua ERP | Có | ⚠️ Dự phòng, chỉ khi Sếp duyệt gắn thẻ |
| Nhét base64 vào D1 | 0 | Không | Không | **Không — khoá chân** | ❌ Trái ràng buộc gốc |
| Workers KV | 0 (1 GB, **1.000 lượt ghi/ngày**, tối đa 25 MiB/giá trị — [kv/platform/limits](https://developers.cloudflare.com/kv/platform/limits/)) | Không | Không | Không — phải có wrangler mới lấy ra | ❌ 1 GB quá nhỏ cho tài liệu scan |
| GitHub repo riêng tư | 0 | Không | Khó (app GitHub không phải chỗ xem ảnh) | Có | ⚠️ **Hợp cho bản sao lưu CSV**, không hợp cho kho scan |

### Chốt

- **Kho tài liệu scan → Google Drive.**
- **Sao lưu CSV → Google Drive** (bản chính) **+ GitHub repo riêng tư**
  (bản sao thứ hai, Đợt 3 — hai nhà cung cấp khác nhau, đúng tinh thần không
  phụ thuộc một chỗ).
- **R2 → không dùng.** Nếu sau này Sếp duyệt gắn thẻ thì thêm vào được mà không
  sửa gì ngoài một file — xem Mục 5.

### Cách Worker Cloudflare nói chuyện với Google Drive (đã xác minh)

**Không dùng Service Account.** Google ghi rõ: *service account* **không có dung
lượng lưu trữ riêng và không sở hữu được file** — muốn dùng phải có Shared Drive
(chỉ có ở Google Workspace trả tiền)
([support.google.com/drive/thread/164666886](https://support.google.com/drive/thread/164666886?hl=en)).
Tài khoản công ty là tài khoản Gmail thường → **service account sẽ hỏng ngay
lần tải lên đầu tiên** với lỗi `storageQuotaExceeded`.

**Dùng OAuth 2.0 refresh token của chính tài khoản công ty:**

```
  Cài đặt MỘT LẦN (thủ công, ~1 giờ):
   1. console.cloud.google.com → tạo project → bật Drive API
   2. Tạo OAuth Client ID loại "Desktop app"
   3. Đăng nhập bằng tài khoản công ty, xin đúng MỘT scope:
        https://www.googleapis.com/auth/drive.file
   4. Đổi authorization code → refresh_token (một lần, chạy ở máy)
   5. Cất vào KÉT Cloudflare, KHÔNG viết vào repo:
        npx wrangler secret put GOOGLE_CLIENT_ID
        npx wrangler secret put GOOGLE_CLIENT_SECRET
        npx wrangler secret put GOOGLE_REFRESH_TOKEN

  Mỗi lần Worker cần đẩy file (tự động, không ai phải làm gì):
   refresh_token ──POST oauth2.googleapis.com/token──► access_token (1 giờ)
   access_token  ──POST /upload/drive/v3/files?uploadType=multipart──► file lên Drive
```

**Hai cái bẫy phải tránh — cả hai đều làm hệ thống chết ÂM THẦM sau vài ngày:**

1. ⚠️ **Màn hình OAuth phải chuyển sang trạng thái "In production".**
   Google ghi: *"A Google Cloud Platform project with an OAuth consent screen
   configured for an external user type and a publishing status of 'Testing' is
   issued a refresh token expiring in **7 days**"*
   ([identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)).
   Để nguyên "Testing" thì **đúng 7 ngày sau, sao lưu chết và không ai biết.**
   → **Đây là bước bắt buộc trong checklist cài đặt, không phải khuyến nghị.**
   Tin tốt: scope `drive.file` được Google xếp loại **non-sensitive**
   ([api-specific-auth](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)),
   nên chuyển sang "In production" **không cần Google thẩm định**, bấm là xong.

2. ⚠️ **Refresh token hết hạn nếu 6 tháng không dùng.** Ta chạy hằng ngày nên
   không dính. Nhưng nếu tính năng bị tắt hơn 6 tháng rồi bật lại thì phải lấy
   token mới — ghi vào tài liệu vận hành.

**Vì sao chọn scope `drive.file` chứ không phải `drive`:** `drive.file` chỉ cho
ERP đụng vào **file do chính ERP tạo**. Toàn bộ email, ảnh, tài liệu riêng khác
trong tài khoản Google của công ty **ERP không nhìn thấy**. Đây là ranh giới
cứng, và nó cũng là lý do không cần Google thẩm định.

---

## 4. CON SỐ — bao lâu thì đầy 15 GB

> *"Không có con số → không được duyệt."*

### 4.1 Kho tài liệu scan

Ước lượng theo đúng hoạt động thật của Alpha Green Commerce (TMĐT thực phẩm
nhập khẩu, ~20 nhân sự, doanh thu 50 tỷ → mục tiêu 90 tỷ):

| Nhóm giấy tờ | Số/tháng | KB/tài liệu | MB/tháng |
|---|---:|---:|---:|
| Kế toán (hoá đơn, chứng từ, tờ khai thuế, BHXH) | 100 | 300 | 30,0 |
| Nhập khẩu (~4 lô/tháng × 5 chứng từ: tờ khai, C/O, kiểm dịch, COA, packing list) | 20 | 600 | 12,0 |
| ATTP + tự công bố sản phẩm | 5 | 800 | 4,0 |
| Nhân sự (HĐLĐ, phụ lục, quyết định — sau khi nạp xong lịch sử) | 5 | 300 | 1,5 |
| Nhà cung cấp (hợp đồng, phụ lục, báo giá) | 3 | 500 | 1,5 |
| Vận hành + Sàn TMĐT + Pháp lý DN | 5 | 500 | 2,5 |
| **CỘNG** | **138** | **~380 KB (bình quân)** | **51,5 MB** |

Làm tròn an toàn lên: **150 tài liệu/tháng × 500 KB = 75 MB/tháng = 0,9 GB/năm.**

**Nạp lịch sử ban đầu** (giấy tờ 2 năm cũ + hồ sơ 20 nhân sự × 4 loại):
~1.500 tài liệu × 500 KB = **0,75 GB**.

### 4.2 Sao lưu dữ liệu

**Không sao lưu đơn hàng hằng ngày — và đây là quyết định có căn cứ, không phải
cắt bớt cho gọn.** `docs/SOURCE-OF-TRUTH.md` ghi rõ: System Owner của đơn hàng
và đơn hoàn là **Shopee/TikTok**, ERP chỉ giữ bản sao đồng bộ. Mất thì cron 5
phút kéo lại được. Cái **mất là mất luôn** là dữ liệu ERP tự sinh ra.

| Nhóm | Ưu tiên | Lịch sao lưu |
|---|---|---|
| `nhan_su`, `tai_khoan`(chỉ hash), `phong_ban`, `chuc_danh`, `san_pham`, `nha_cung_cap`, `kho`, `don_vi_tinh`, `giao_dich_kho`, `cong_viec`, `tai_san`, `tai_san_lich_su`, `mau_ca`, `ca_mo`, `dang_ky_ca`, `lich_lam_viec`, `thong_bao`, `gop_y`, `gop_y_lich_su`, `sku_map`, **`tai_lieu`** | **ERP là nguồn thật — mất là mất hẳn** | **Hằng ngày** |
| `don_hang`, `don_hoan` | Sàn là nguồn thật, kéo lại được | **Hằng tháng** |

Ước lượng dung lượng CSV:

| Bảng | Dòng (năm 1) | Byte/dòng | MB |
|---|---:|---:|---:|
| `giao_dich_kho` | 30.000 | 200 | 6,0 |
| `thong_bao` | 40.000 | 250 | 10,0 |
| `lich_lam_viec` + `dang_ky_ca` + `ca_mo` | 25.000 | 150 | 3,8 |
| `cong_viec` + `tai_san` + `tai_lieu` + phần còn lại | 8.000 | 300 | 2,4 |
| **Bản sao lưu HẰNG NGÀY** | | | **~22 MB** |
| `don_hang` | 166.000 (50 tỷ ÷ AOV ~300k) | 400 | 66,4 |
| `don_hoan` (~5%) | 8.300 | 400 | 3,3 |
| **Bản sao lưu HẰNG THÁNG (thêm)** | | | **~70 MB** |

**Chính sách giữ bản** (retention) và dung lượng:

| Loại bản | Giữ bao nhiêu | MB/bản | Tổng MB |
|---|---:|---:|---:|
| Hằng ngày | 30 bản gần nhất | 22 | 660 |
| Đầu tháng (gồm cả đơn hàng) | 12 bản | 92 | 1.104 |
| Cuối năm | giữ **vĩnh viễn** | 92 | 92/năm |
| **CỘNG năm 1** | | | **~1,86 GB** |

### 4.3 Tổng — bao lâu đầy

Giả định tài khoản Google công ty hiện đã dùng ~3 GB cho Gmail/Photos
→ **còn ~12 GB.** (Con số này Sếp phải xác nhận — câu hỏi Ô1 ở Mục 12.)

| Mốc | Kho tài liệu | Sao lưu | Cộng dồn | Còn lại /12 GB |
|---|---:|---:|---:|---:|
| Ngay sau khi nạp lịch sử | 0,75 GB | 0,02 GB | **0,8 GB** | 11,2 GB |
| Hết năm 1 | 1,65 GB | 1,86 GB | **3,5 GB** | 8,5 GB |
| Hết năm 2 | 2,55 GB | 2,05 GB | **4,6 GB** | 7,4 GB |
| Hết năm 3 | 3,45 GB | 2,24 GB | **5,7 GB** | 6,3 GB |
| Hết năm 5 | 5,25 GB | 2,62 GB | **7,9 GB** | 4,1 GB |
| Hết năm 8 | 7,95 GB | 3,19 GB | **11,1 GB** | 0,9 GB |

**→ Đầy vào khoảng năm thứ 8–9.**

Sao lưu **không phình vô hạn** vì retention giữ số bản cố định (30 ngày + 12
tháng), chỉ tăng theo kích thước dữ liệu (~+0,19 GB/năm). Phần phình thật là kho
tài liệu, ~0,9 GB/năm.

**Kịch bản xấu nhất** (gấp đôi mọi ước lượng: 300 tài liệu/tháng × 1 MB, dữ liệu
tăng gấp đôi theo mục tiêu 90 tỷ): kho tài liệu 3,6 GB/năm, sao lưu ~3,7 GB
→ đầy 12 GB vào **khoảng năm thứ 3**.

**Kết luận: 15 GB miễn phí đủ tối thiểu 3 năm, thực tế nhiều khả năng 8 năm.**
Trước khi đầy, các đường đi tiếp — đều rẻ hoặc miễn phí: dọn bản sao lưu cũ hơn
2 năm · chuyển tài liệu cũ hơn 5 năm sang ổ cứng ngoài · Google One 100 GB
~45.000đ/tháng · hoặc lúc đó bật R2. **Không cần quyết bây giờ.**

---

## 5. Thiết kế — Phần A: Kho tài liệu

### 5.1 Lớp trừu tượng `kho-file.js` — đây là chỗ giữ lời hứa "đổi công cụ là dùng được ngay"

```
  src/kho-file.js  ── một cửa duy nhất, 3 hàm:
      luuFile(env, {duLieu, tenFile, kieu, duongDan}) → { nha, khoa }
      layFile(env, {nha, khoa})                       → ReadableStream
      xoaFile(env, {nha, khoa})                       → (chỉ dùng cho bản sao lưu quá hạn)

  Bên trong, chọn theo env.KHO_FILE_NHA:
      'drive'  → Google Drive  (mặc định)
      'r2'     → Cloudflare R2 (khi nào Sếp duyệt gắn thẻ — thêm ~40 dòng, KHÔNG sửa gì khác)
      'd1_tam' → base64 trong D1, trần 800 KB (PHAO CỨU SINH, xem 5.2)
```

Mục lục trong D1 lưu **cả hai cột `nha` và `khoa`** — chứ không chỉ `khoa`. Nhờ
vậy có thể chuyển nhà **từng phần**, tài liệu cũ ở nhà cũ vẫn mở được trong lúc
tài liệu mới đã sang nhà mới. Không có ngày "cắt băng" nào phải làm một phát.

> Đây chính là câu trả lời cho Mục 7.6 của bản giao việc — *"có làm được không
> nếu KHÔNG bật R2?"*. Không những làm được, mà **R2 còn không phải đường
> chính.** R2 chỉ là một giá trị của `KHO_FILE_NHA`.

### 5.2 Phao cứu sinh `d1_tam` — và luật dùng nó

Nếu tuần đầu chưa nối kịp Drive, đặt `KHO_FILE_NHA='d1_tam'` là tính năng vẫn
chạy — lưu base64 vào D1 trần 800 KB, y hệt cách CCCD đang làm.

**Luật cứng đi kèm:** khi đang ở `d1_tam`, màn hình Kho tài liệu phải hiện dải
băng vàng *"Đang lưu tạm trong ERP — chưa nối kho ngoài"*, và cron gửi `thong_bao`
cho Admin **mỗi tuần** cho tới khi chuyển xong. Không để chế độ tạm âm thầm
thành chế độ vĩnh viễn — đó là cách mọi món nợ kỹ thuật ra đời.

### 5.3 Bảng `tai_lieu` — mục lục

```sql
CREATE TABLE tai_lieu (
  id            TEXT PRIMARY KEY,         -- 'tl_xxxxx'
  ten           TEXT NOT NULL,            -- "Giấy phép ATTP - Hạnh nhân Mỹ 2026"
  loai          TEXT NOT NULL,            -- mã trong DANH_MUC_GIAY_TO (5.4)
  so_hieu       TEXT,                     -- số giấy phép / số hợp đồng / số hoá đơn
  loai_gan      TEXT NOT NULL,            -- 'nhan_su'|'san_pham'|'nha_cung_cap'|
                                          -- 'tai_san'|'don_hoan'|'cong_ty'|'ky_ke_toan'
  gan_id        TEXT NOT NULL,            -- id bản ghi; 'cong_ty' → 'AGC'; ky_ke_toan → '2026-08'
  ngay_cap      TEXT,                     -- YYYY-MM-DD
  ngay_het_han  TEXT,                     -- YYYY-MM-DD — NULL = không có hạn
  muc_nhay_cam  TEXT NOT NULL DEFAULT 'noi_bo',   -- 'chung'|'noi_bo'|'mat'
  nha           TEXT NOT NULL,            -- 'drive'|'r2'|'d1_tam'
  khoa          TEXT NOT NULL,            -- Drive fileId / R2 key / (d1_tam: id chính nó)
  du_lieu_tam   TEXT,                     -- CHỈ dùng khi nha='d1_tam' (base64)
  kieu_file     TEXT NOT NULL,            -- image/jpeg, application/pdf
  co_byte       INTEGER NOT NULL,
  so_trang      INTEGER NOT NULL DEFAULT 1,
  ghi_chu       TEXT,
  trang_thai    TEXT NOT NULL DEFAULT 'hien',     -- 'hien'|'an'   (KHÔNG có 'xoa')
  ly_do_an      TEXT,
  cv_nhac_id    INTEGER,                  -- id công việc SPEC-0004 đã tạo để nhắc hạn
  nguoi_tao_id  TEXT NOT NULL,
  tao_luc       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_tl_gan     ON tai_lieu(loai_gan, gan_id, trang_thai);
CREATE INDEX ix_tl_het_han ON tai_lieu(ngay_het_han) WHERE ngay_het_han IS NOT NULL;
CREATE INDEX ix_tl_loai    ON tai_lieu(loai, trang_thai);

CREATE TABLE tai_lieu_lich_su (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tai_lieu_id  TEXT NOT NULL,
  hanh_dong    TEXT NOT NULL,             -- 'tao'|'xem'|'tai_ve'|'sua'|'an'|'hien_lai'
  nguoi_id     TEXT NOT NULL,
  luc          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_tls_tl ON tai_lieu_lich_su(tai_lieu_id, luc);
```

**Vì sao dùng cặp `(loai_gan, gan_id)` thay vì 6 khoá ngoại:** ERP có 6+ loại
bản ghi cần gắn tài liệu và sẽ còn thêm. Một bảng với cặp cột này gắn được vào
tất cả, kể cả loại chưa có bảng riêng (`cong_ty`, `ky_ke_toan`). Sáu bảng
`tai_lieu_nhan_su`, `tai_lieu_san_pham`… là sáu lần cùng một đoạn code —
đúng thứ Rule 5 cấm.

**Vì sao `trang_thai` KHÔNG có giá trị `'xoa'`:** xem Mục 7.5.

### 5.4 Danh mục loại giấy tờ — hằng số trong code, không phải bảng

Đặt trong `src/kho-file.js`, cùng chỗ với logic, đúng tiền lệ `quyen.js` (vai
trò cũng hard-code chứ không phải bảng — xem `DATA-DICTIONARY.md`).

| Mã | Tên hiển thị | Gắn vào | Có hạn? | Mức nhạy cảm |
|---|---|---|---|---|
| `dkkd` | Đăng ký kinh doanh | công ty | không | chung |
| `giay_phep_attp` | Giấy phép ATTP | sản phẩm · NCC | **có** | chung |
| `tu_cong_bo` | Tự công bố sản phẩm | sản phẩm | **có** | chung |
| `haccp_iso` | HACCP/ISO của NCC | NCC | **có** | nội bộ |
| `to_khai_hq` | Tờ khai hải quan | sản phẩm | không | nội bộ |
| `co_cq` | C/O · C/Q | sản phẩm | không | nội bộ |
| `kiem_dich` | Chứng thư kiểm dịch | sản phẩm | không | nội bộ |
| `coa` | COA (phiếu kiểm nghiệm) | sản phẩm | **có** | nội bộ |
| `hd_ncc` | Hợp đồng nhà cung cấp | NCC | **có** | nội bộ |
| `bao_gia` | Báo giá | NCC | **có** | nội bộ |
| `hd_lao_dong` | **Hợp đồng lao động** | nhân sự | **có** | **mật** |
| `qd_luong` | **Quyết định lương** | nhân sự | không | **mật** |
| `cccd` | **CCCD/Căn cước** | nhân sự | **có** | **mật** |
| `bang_cap` | Bằng cấp · chứng chỉ | nhân sự | không | nội bộ |
| `chung_tu_ke_toan` | Hoá đơn · chứng từ | kỳ kế toán | không | nội bộ |
| `to_khai_thue` | Tờ khai thuế · BHXH | kỳ kế toán | không | **mật** |
| `hd_thue_kho` | Hợp đồng thuê kho | công ty | **có** | nội bộ |
| `bao_hiem` | Bảo hiểm | công ty · tài sản | **có** | nội bộ |
| `hd_van_chuyen` | Hợp đồng vận chuyển | công ty | **có** | nội bộ |
| `ho_so_san` | Hồ sơ gian hàng Shopee/TikTok | công ty | không | **mật** |
| `khac` | Khác | bất kỳ | không | nội bộ |

Loại nào đánh dấu **"có hạn"** thì ô *Ngày hết hạn* **bắt buộc điền hoặc bấm
"Không có hạn"** — chặn ở máy chủ, không chỉ ẩn nút.

---

## 6. Human Cost — câu quyết định tính năng sống hay chết

> Rule 12. *"Quá 3 bước là không ai làm, kho sẽ rỗng sau 2 tuần."*

Nhân viên kho **chụp bằng điện thoại**, đứng cạnh pallet, tay còn bẩn. Nếu luồng
nhập bắt gõ chữ thì tính năng chết. ERP đã là PWA (`public/manifest.webmanifest`,
`public/sw.js`) → cài lên màn hình chính điện thoại là mở như app.

### 6.1 Đường vào chính — 3 lần bấm

```
Đang mở hồ sơ nhân viên / sản phẩm / NCC / tài sản
  │
  ├─① Bấm "📎 Thêm tài liệu"
  │      → mở THẲNG camera:  <input type="file" accept="image/*"
  │                                 capture="environment" multiple>
  │      → chụp, bấm Dùng ảnh  (thao tác của camera, không tính là bước ERP)
  │      → ảnh tự nén bằng nenAnhChung() ĐÃ CÓ (app.js:897), cạnh dài 1600px, q=0.8
  │
  ├─② Bấm chọn LOẠI GIẤY TỜ  (lưới nút to, KHÔNG phải ô gõ, KHÔNG phải dropdown)
  │      → hệ thống LỌC SẴN chỉ hiện loại hợp với thứ đang mở:
  │         mở hồ sơ nhân viên → chỉ 4 nút: HĐLĐ · CCCD · Bằng cấp · Khác
  │         mở sản phẩm       → chỉ 6 nút: ATTP · Tự công bố · Tờ khai HQ · C/O · COA · Khác
  │      → loại "có hạn" → ô ngày hiện ngay dưới, kèm nút "Không có hạn"
  │
  └─③ Bấm "Lưu"
```

**Tự điền hết, không hỏi:** gắn vào bản ghi nào (đang mở) · người tải (đang đăng
nhập) · ngày tải · kiểu file · dung lượng · **tên tài liệu** (ghép tự động
`"<Tên loại> — <Tên bản ghi> — <tháng/năm>"`, sửa được nhưng không bắt sửa) ·
mức nhạy cảm (suy từ loại giấy tờ).

**→ 3 lần bấm. Không gõ một chữ nào** với luồng thường.

### 6.2 Đường vào phụ — nạp hàng loạt từ máy tính

Kế toán có 100 chứng từ/tháng, không ai chụp từng cái. Màn hình *Kho tài liệu →
Nạp hàng loạt*: kéo-thả 50 file → chọn **một** loại giấy tờ + **một** kỳ kế toán
áp cho cả lô → Lưu. **3 thao tác cho 50 tài liệu.**

### 6.3 Đợt 3 — 2 lần bấm nhờ Workers AI đã có sẵn

`wrangler.toml` đã khai `[ai] binding = "AI"`, và ERP **đã dùng nó để bóc thông
tin CCCD**. Dùng lại đúng cơ chế đó: sau khi chụp, cho AI đọc ảnh để **đoán loại
giấy tờ + số hiệu + ngày hết hạn**, điền sẵn vào ô. Nhân viên chỉ còn *xác nhận
→ Lưu* = **2 lần bấm**.

**Luật kèm theo:** giá trị AI đoán phải hiện với nhãn *"AI đoán — kiểm lại"* và
**không được tự lưu khi chưa có người xác nhận**. Đoán sai ngày hết hạn của giấy
phép ATTP là mất gian hàng — Hiến pháp không cho máy tự quyết việc đó.

### 6.4 Đối chứng: cách này có thật sự dễ hơn không

Không tự khen. Đo bằng ca đối chứng có lỗi cố ý (BH-16), **trước khi mở cho
20 người dùng**:

| Ca đo | Kỳ vọng | Ý nghĩa |
|---|---|---|
| Nhân viên kho chưa hướng dẫn, đưa điện thoại, bảo *"đưa hợp đồng NCC này vào ERP"* | **≤ 90 giây, không hỏi ai** | Đạt thì luồng đúng |
| **Ca đối chứng có lỗi cố ý**: bản dựng bỏ bộ lọc loại giấy tờ, để nguyên 21 nút | **Phải chậm rõ rệt hoặc chọn sai loại** | Nếu ca này cũng nhanh → **bộ lọc vô dụng**, phép đo hỏng, không phải thiết kế tốt |
| Kế toán nạp 20 chứng từ | **≤ 3 phút** | |

Kết quả ghi vào `docs/reviews/`. Ca đối chứng **không** nhanh bằng ca chính thì
mới chứng minh được thiết kế có tác dụng thật.

### 6.5 Kho có rỗng sau 2 tuần không — đo, đừng đoán

Đợt 2 thêm một dòng vào cron: **cuối mỗi tuần đếm số tài liệu mới**. Tuần nào
**< 10 tài liệu** → gửi `thong_bao` cho Admin: *"Kho tài liệu tuần này chỉ có N
tài liệu mới — kiểm tra xem có ai đang dùng không."*

Rule 15 là *Ship → Use → **Measure***. Không có đồng hồ này thì kho rỗng cũng
không ai biết, đúng như cảnh báo của bản giao việc.

---

## 7. Bảo mật — 5 câu ở Mục 6 bản giao việc

### 7.1 Ai được xem gì

**Luật nền, một câu:**

> **Xem được tài liệu = xem được bản ghi nó gắn vào **VÀ** đủ quyền theo mức
> nhạy cảm của loại giấy tờ.** Hai điều kiện, phải thoả cả hai (AND).

**Không bịa vai trò mới.** Dùng nguyên 11 vai trò trong `quyen.js`.

| Mức | Ai xem được | Kiểm bằng |
|---|---|---|
| `chung` | ai xem được bản ghi | quyền tab sẵn có |
| `noi_bo` | ai xem được bản ghi | quyền tab sẵn có |
| `mat` | theo bảng dưới, từng loại một | hàm mới `duocXemTaiLieu()` |

**Bảng quyền cho mức `mat`** — trả lời thẳng hai câu bản giao việc hỏi:

| Loại | admin | admin_backup | hcns | ke_toan_truong | quan_ly_kho | chính chủ |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `hd_lao_dong` (HĐLĐ) | ✅ | ❌ | ⬜ **hỏi Sếp (Ô3)** | ❌ | ❌ | ✅ |
| `qd_luong` (quyết định lương) | ✅ | ❌ | ❌ | ⬜ **hỏi Sếp (Ô3)** | ❌ | ✅ |
| `cccd` | ✅ | ❌ | ✅ | ❌ | ⬜ **hỏi Sếp (Ô4)** | ✅ |
| `to_khai_thue` | ✅ | ❌ | ❌ | ✅ | ❌ | — |
| `ho_so_san` | ✅ | ❌ | ❌ | ❌ | ❌ | — |

**Ba điểm phải nói rõ:**

1. **Kế toán trưởng KHÔNG xem được hợp đồng lao động của người khác.**
   Bản giao việc hỏi thẳng câu này. `quyen.js` cho `ke_toan_truong` tab
   `ketoan` nhưng **không** có tab `nhansu` — nên luật nền đã tự chặn: không xem
   được hồ sơ nhân sự thì không xem được tài liệu gắn vào đó. Chỉ có `qd_luong`
   là mập mờ vì kế toán trưởng có `xem_luong: true` → **để Sếp chốt (Ô3)**.

2. **Anh Duy (`quan_ly_kho`) mặc định KHÔNG xem được CCCD nhân viên kho.**
   `quan_ly_kho` **có** tab `nhansu` (xem được hồ sơ đội mình) nhưng
   `them_nhan_su: false` — ranh giới sẵn có của `quyen.js` đã tách đúng: quản lý
   đội thì xem hồ sơ, không có nghĩa được xem giấy tờ tuỳ thân. Đây là mặc định
   an toàn, **Sếp có thể mở ra nếu nghiệp vụ cần (Ô4)**.

3. **Chính chủ LUÔN xem được giấy tờ của mình.** Nhân viên phải mở được hợp đồng
   lao động và CCCD của chính mình mà không phải xin ai. Đây không phải câu hỏi
   — không cho là sai, cả về nghiệp vụ lẫn về Nghị định 13/2023 về bảo vệ dữ
   liệu cá nhân.

Toàn bộ kiểm ở **máy chủ**, trong `quyen.js`, trước khi dữ liệu rời máy chủ —
đúng nguyên tắc đã ghi ở đầu file đó.

### 7.2 Đường dẫn file có đoán được không

**KHÔNG. Và trình duyệt không bao giờ nhìn thấy đường dẫn Drive.**

```
   Trình duyệt                ERP Worker                    Google Drive
   ───────────                ──────────                    ────────────
   GET /api/tai-lieu/tl_x9/file
   (kèm cookie phiên) ──────► ① kiểm phiên đăng nhập
                              ② duocXemTaiLieu(vaiTro, tài liệu, nguoiId)
                              ③ ghi tai_lieu_lich_su ('xem')
                              ④ lấy access_token ─────────► GET /files/{id}?alt=media
                              ⑤ stream về ◄──────────────── nội dung file
   ◄───── nội dung file
          + Cache-Control: private, no-store
          + Content-Disposition: inline
          + X-Content-Type-Options: nosniff
```

- **File trên Drive KHÔNG chia sẻ cho ai** — không "bất kỳ ai có link", không
  "công khai". Chỉ tài khoản công ty sở hữu.
- **`fileId` của Drive không bao giờ gửi ra trình duyệt.** Trình duyệt chỉ biết
  `tl_x9` — mà biết cũng vô dụng nếu không có phiên đăng nhập đủ quyền.
- **Không có link ký sẵn, không có link hết hạn.** Mỗi lần xem là một lần kiểm
  quyền mới. Link bị chụp màn hình gửi ra ngoài thì người ngoài mở ra vẫn là
  màn hình đăng nhập.

**Vì sao không chọn cách dễ hơn — chia sẻ link Drive "ai có link cũng xem được":**
ID của Drive dài 33 ký tự, đoán mò thì không đoán ra. Nhưng link đó **sống mãi,
không ghi vết, và không thu hồi được sau khi đã bị chuyển tiếp**. Một link hợp
đồng lao động lọt vào nhóm Zalo là lọt vĩnh viễn. Không đánh đổi.

### 7.3 Ai chạm được vào bản sao lưu

Bản sao lưu có **lương, CCCD, chứng từ thuế** — nhạy cảm hơn cả kho tài liệu.

| Lớp | Ai vào được | Điều kiện bắt buộc |
|---|---|---|
| Thư mục `SAO-LUU/` trên Drive | Ai đăng nhập được tài khoản Google công ty | ⚠️ **BẮT BUỘC bật xác thực 2 bước.** Ô1 ở Mục 12 |
| `GOOGLE_REFRESH_TOKEN`, `CLIENT_SECRET` | Chỉ Worker khi chạy | Nằm trong **két Cloudflare** (`wrangler secret`), **KHÔNG** trong repo, **KHÔNG** trong `wrangler.toml`, **KHÔNG** in ra log |
| Tải bản sao lưu qua ERP | **Chỉ vai trò `admin`** | Ghi vết mọi lượt tải |
| Repo GitHub (bản sao thứ hai, Đợt 3) | Người có quyền repo | ⚠️ **Repo RIÊNG BIỆT**, không phải `erp-agc-noibo` — repo mã nguồn có thể cần thêm người vào sau này, repo sao lưu thì không |

**Cột `mat_khau_hash` được sao lưu, cột mật khẩu thô thì không tồn tại** — ERP
không lưu mật khẩu thô. Bản sao lưu **không** chứa `GOOGLE_REFRESH_TOKEN` hay
token Shopee/TikTok: chúng nằm ở két Cloudflare, không phải bảng D1. Riêng
`shopee_ket_noi`/`tiktok_ket_noi` **có** chứa token trong D1 → **loại 2 bảng này
khỏi bản sao lưu**, chỉ sao lưu cột định danh cửa hàng, không sao lưu cột token.
Mất token thì bấm kết nối lại mất 2 phút; token rò rỉ thì người ngoài đọc được
đơn hàng công ty.

### 7.4 Ghi vết — ai làm gì, lúc nào (Rule 8)

`tai_lieu_lich_su` ghi: `tao` · `sua` · `an` · `hien_lai` · `tai_ve` — **mọi tài
liệu, mọi lượt**.

Hành động `xem` **chỉ ghi với tài liệu mức `mat`.** Lý do có tính toán: ghi mọi
lượt xem của mọi tài liệu sẽ đẻ hàng chục nghìn dòng/tháng, ăn vào hạn mức
100.000 dòng ghi/ngày của D1 và làm bảng lịch sử to hơn cả mục lục. Mức `mat`
mới là thứ cần biết ai đã mở.

Màn hình *Kho tài liệu → Nhật ký* (chỉ `admin`) xem được toàn bộ.

### 7.5 Xoá tài liệu — **KHÔNG CHO XOÁ HẲN**

Rule 10 — History Must Survive Change. Giấy tờ pháp lý xoá nhầm là không lấy lại
được, và trong ngành thực phẩm nhập khẩu thì mất một tờ C/O có thể là mất cả lô
hàng khi bị hậu kiểm.

| Việc | Được không | Ai | Kết quả |
|---|---|---|---|
| Ẩn tài liệu (sai, trùng, hết hiệu lực) | ✅ | Chỉ `admin` | `trang_thai='an'` + **bắt buộc nhập `ly_do_an`**. File trên Drive **giữ nguyên**. Ghi vết. |
| Hiện lại | ✅ | Chỉ `admin` | Ghi vết |
| Xoá hẳn khỏi ERP + Drive | ❌ | **Không ai** | Không có endpoint. Không có nút. Không có cờ bí mật. |

Cần xoá thật (ví dụ nhân viên nghỉ yêu cầu xoá dữ liệu cá nhân theo Nghị định
13/2023) → **quy trình thủ công có hai người**: ERP Owner duyệt, Admin vào Drive
xoá tay, ghi một dòng vào `docs/decisions/`. Không tự động hoá việc xoá vĩnh
viễn — máy không được phép làm việc không hoàn tác được.

> Ghi nhận: trần lưu trữ ở 5.1 **không** kích hoạt xoá tự động. Đầy chỗ thì
> **chặn tải lên và báo Admin**, không bao giờ tự dọn tài liệu. Chỉ **bản sao
> lưu quá hạn retention** mới bị xoá tự động — đó là bản chụp, không phải bản gốc.

---

## 8. Ngày hết hạn → nối vào SPEC-0004, KHÔNG dựng cơ chế nhắc thứ hai

SPEC-0004 mục 3 đã chốt: *"Không tạo bảng nhắc việc mới. Tái dùng `thong_bao` +
`guiThongBao()` + `guiTelegram()` + cron `scheduled()` đã chạy."* Máy nhắc việc
của SPEC-0004 đọc `cong_viec` và nhắc theo `han_chot`.

**Cách nối — chỉ một chiều, không đụng gì vào SPEC-0004:**

```
 Mỗi ngày (trong cron scheduled() đã có, thêm 1 dòng):
   Tìm tài liệu có ngay_het_han, trang_thai='hien', cv_nhac_id IS NULL,
   và ngay_het_han ≤ hôm nay + 45 ngày
     └─► TẠO 1 công việc trong cong_viec (bảng ĐÃ CÓ, không đổi schema):
           tieu_de   = "Gia hạn: Giấy phép ATTP — Hạnh nhân Mỹ"
           dau_ra    = "Có bản scan giấy phép mới trong Kho tài liệu"
           han_chot  = ngay_het_han TRỪ 30 ngày
           nguoi_nhan = theo bảng dưới
     └─► ghi id công việc vào tai_lieu.cv_nhac_id  ← chống tạo trùng
```

Từ đó trở đi **SPEC-0004 lo hết**: nhắc trước hạn, nhắc quá hạn, leo cấp lên
quản lý, gom vào bản tin 8h sáng. **ERP không có dòng code nhắc hạn nào.**

Ai nhận việc gia hạn — suy từ loại giấy tờ, không hỏi:

| Loại giấy tờ | Người nhận việc |
|---|---|
| `giay_phep_attp`, `tu_cong_bo`, `coa`, `haccp_iso` | Vai trò `van_hanh_san` (chủ sở hữu Sản phẩm — `DATA-DICTIONARY.md`) |
| `hd_ncc`, `bao_gia` | Vai trò `quan_ly_kho` (chủ sở hữu Nhà cung cấp) |
| `hd_lao_dong`, `cccd` | Vai trò `hcns` |
| `hd_thue_kho`, `bao_hiem`, `hd_van_chuyen` | Vai trò `admin` |

**Vì sao 45 ngày để tìm nhưng hạn chốt trừ 30 ngày:** tạo việc sớm 15 ngày để
SPEC-0004 kịp nhắc "sắp đến hạn" trước khi việc thành quá hạn. Xin lại giấy phép
ATTP mất 3–4 tuần — nhắc trước 30 ngày là mức tối thiểu, không phải dư dả.

**`cv_nhac_id` chống trùng:** cron chạy lại nhiều lần trong ngày, deploy giữa
chừng, hay lỡ một lượt — kết quả vẫn đúng, không đẻ ra hai việc. Đúng khuôn
"suy ra từ dữ liệu, không lưu cờ đã-nhắc" mà SPEC-0004 đã dựng.

---

## 9. Thiết kế — Phần B: Sao lưu

### 9.1 Bản sao lưu trông như thế nào

```
Drive/ERP-AGC/SAO-LUU/2026-08-27/
   ├── DOC-CACH-DOC.txt          ← đọc file này trước
   ├── nhan_su.csv
   ├── san_pham.csv
   ├── giao_dich_kho.csv
   ├── tai_lieu.csv              ← mục lục kho tài liệu, có cả cột 'khoa'
   ├── ... (21 file .csv)
   └── KIEM-TRA.csv              ← tên bảng, số dòng, tổng byte
```

**`DOC-CACH-DOC.txt`** viết bằng tiếng Việt thường, cho người không biết lập
trình đọc — mở bằng ERP nào cũng được, hoặc không cần ERP nào:

> *Đây là bản sao toàn bộ dữ liệu ERP Alpha Green Commerce ngày 27/08/2026.
> Mỗi file .csv là một bảng dữ liệu. Bấm đúp là Excel mở ra.
> File nhan_su.csv là danh sách nhân sự, san_pham.csv là sản phẩm...
> Kho tài liệu scan nằm ở thư mục ERP-AGC/TAI-LIEU/ cùng Drive này; file
> tai_lieu.csv là mục lục, cột "khoa" là mã file trên Drive.
> Kiểm bản sao có đủ không: mở KIEM-TRA.csv, so số dòng với từng file.*

**Định dạng CSV — quy tắc cứng, vì Excel Việt Nam hay làm hỏng:**

- **UTF-8 CÓ BOM** (`﻿` đầu file). Không có BOM thì Excel mở ra
  *"Nguyá»…n VÄƒn A"*. Đây là lỗi kinh điển, phải chặn từ đầu.
- Ngăn cách bằng dấu **phẩy** `,`; trường có phẩy/xuống dòng/nháy kép thì bọc
  `"` và nhân đôi nháy trong.
- Xuống dòng `\r\n`.
- Dòng đầu là tên cột, **đúng tên cột trong database**, không đổi thành tên
  tiếng Việt cho đẹp — người phục hồi cần tên thật.
- **Số điện thoại và mã có số 0 đứng đầu**: Excel sẽ nuốt mất số 0. Ghi thành
  `="0987654321"` cho các cột `sdt`, `ma_nv`, `ma_sku`, `ma_ts`. Trông hơi lạ
  trong Notepad nhưng mở Excel là đúng — và đây là cách người ta sẽ mở nó.

### 9.2 Ràng buộc chí tử: **10 ms CPU mỗi lượt cron**

Workers gói miễn phí cho **10 ms CPU cho mỗi Cron Trigger**
([workers/platform/limits](https://developers.cloudflare.com/workers/platform/limits/)).
Chờ D1 và chờ `fetch` **không** tính vào CPU, nhưng **ghép chuỗi CSV cho 40.000
dòng thì tính, và sẽ vượt.**

Đây là lý do **không thể** làm "một lượt cron xuất cả bản sao lưu". Thiết kế
phải chia lô ngay từ đầu — không phải tối ưu về sau.

```
 Cron chạy sẵn mỗi 5 phút = 288 lượt/ngày. Sao lưu chỉ mượn các lượt từ 1h–4h sáng
 (36 lượt) — giờ thấp điểm, không tranh với đồng bộ Shopee/TikTok.

 Bảng trạng thái sao_luu_phien (bảng nhỏ, 1 dòng/ngày) giữ "đang làm tới đâu":
   ngay · bang_hien_tai · offset · so_dong_da_ghi · trang_thai

 Mỗi lượt cron:
   ① đọc trạng thái  ② lấy 2.000 dòng của bảng hiện tại  ③ ghép CSV
   ④ nối vào file trên Drive  ⑤ ghi lại trạng thái  → hết lượt

 21 bảng, bảng lớn nhất ~40.000 dòng → tổng ~60 lượt.
 Chạy 1h–4h sáng đủ 36 lượt/đêm → bản hằng ngày xong trong 1 đêm.
 Bản hằng tháng (thêm don_hang 166.000 dòng = ~83 lượt) → cho phép trải 3 đêm,
 chạy từ đêm mùng 1.
```

**Subrequest**: mỗi lượt cần 1 lần lấy `access_token` (bỏ qua nếu còn hạn, cache
trong biến toàn cục của isolate) + 1 lần ghi Drive = **2**, thừa sức trong trần
50/lượt.

**Nếu số liệu thực tế cho thấy 2.000 dòng/lượt vẫn vượt 10 ms** → hạ xuống 500
và tăng số đêm. Con số 2.000 là ước lượng, **Khỉ Đột phải đo CPU thật ở lượt cron
đầu tiên rồi mới chốt** — và ghi con số đo được vào bản báo cáo build, không viết
"chạy tốt" suông (BH-05).

### 9.3 Giữ nhiều bản — chính sách retention

| Loại | Giữ | Xoá tự động khi |
|---|---|---|
| Hằng ngày | **30 bản gần nhất** | quá 30 ngày |
| Đầu tháng (ngày 1, có cả `don_hang`/`don_hoan`) | **12 bản** | quá 12 tháng |
| Cuối năm (31/12) | **vĩnh viễn** | không bao giờ |

**Vì sao không ghi đè một bản:** dữ liệu hỏng thường không phát hiện ra ngay.
Nhân viên xoá nhầm mã hàng hôm thứ Hai, thứ Sáu mới có người thấy. Ghi đè một
bản thì đến thứ Sáu bản sao lưu cũng đã hỏng theo từ lâu. 30 ngày là khoảng thời
gian đủ để một sai sót âm thầm bị phát hiện.

### 9.4 Kiểm tra phục hồi — **bản chưa từng thử phục hồi không phải bản sao lưu**

**Ba lớp, mỗi lớp bắt một loại hỏng khác nhau:**

**Lớp 1 — Canary tự động, mỗi ngày.** Ngay sau khi ghi xong, Worker **đọc ngược
lại** từng file vừa đẩy lên Drive, đếm dòng, so với `KIEM-TRA.csv`. Lệch một dòng
→ báo động. Lớp này bắt: ghi thiếu, đứt giữa chừng, Drive nhận nhưng lưu hỏng.

**Lớp 2 — Thử phục hồi thật, mỗi quý.** Có người làm, có biên bản:

```
  1. Tải thư mục sao lưu mới nhất từ Drive về máy
  2. npm run phuc-hoi-thu            (lệnh mới, Đợt 3)
       → tạo database D1 CỤC BỘ TRỐNG (wrangler d1 execute --local)
       → nạp toàn bộ CSV vào
       → in bảng so sánh: số dòng từng bảng (bản phục hồi ↔ bản đang chạy)
  3. Mở ERP cục bộ, đăng nhập, kiểm 5 việc bằng MẮT:
       hồ sơ 1 nhân viên · tồn kho 1 mã hàng · 1 công việc ·
       1 tài liệu (bấm mở được file trên Drive không) · 1 tài sản
  4. Ghi kết quả vào docs/reviews/PHUC-HOI-<quý>.md
```

**Lớp 3 — Ca đối chứng có lỗi cố ý (BH-16), làm ngay lần thử đầu tiên.**
Cố tình **xoá một file CSV** khỏi thư mục rồi chạy `phuc-hoi-thu`. **Nó phải
báo hỏng.** Nếu vẫn báo "phục hồi thành công" thì **quy trình kiểm tra hỏng, chứ
không phải bản sao lưu tốt** — và ta vừa tránh được việc yên tâm nhầm suốt 3 năm.

### 9.5 Báo khi hỏng — **hai lớp, vì một lớp không đủ**

**Lớp A — báo lỗi khi chạy:** bất kỳ bước nào ném lỗi (Drive từ chối, token hết
hạn, hết dung lượng, canary lệch) → `guiThongBao()` cho `admin` + `guiTelegram()`
**ngay lượt cron đó**, kèm tên bảng và lỗi cụ thể.

**Lớp B — báo khi KHÔNG chạy.** Đây là lớp quan trọng hơn, và là lớp hầu hết hệ
thống quên:

```
  Mỗi ngày 9h sáng, một hàm ĐỘC LẬP kiểm đúng một câu:
     "Có bản sao lưu hoàn chỉnh của hôm qua không?"
  Không có → BÁO ĐỘNG ĐỎ cho admin + Telegram
```

**Vì sao bắt buộc phải có lớp B:** lớp A chỉ báo được **khi nó chạy**. Nếu cron
chết hẳn, Worker bị gỡ, token bị thu hồi, hay ai đó lỡ tay comment mất một dòng
— thì **lớp A im lặng tuyệt đối**, đúng như bản giao việc cảnh báo: *"Im lặng ba
tháng rồi mới biết là thảm hoạ."*

Lớp B còn tự bảo vệ mình: nó nằm trong đúng cron `scheduled()` đang chạy cho
Shopee/TikTok — cron đó chết thì đơn hoàn cũng ngừng đồng bộ và cả công ty biết
trong vài giờ. Hai thứ chết cùng nhau, không có góc mù.

**Thêm một lớp cảnh báo dung lượng:** vượt **80% (12 GB)** → nhắc Admin hằng
tuần. Vượt **95%** → chặn tải tài liệu mới (không chặn sao lưu — sao lưu ưu tiên
cao hơn) và báo động đỏ.

---

## 10. Chia đợt — Đợt 1 phải DÙNG ĐƯỢC TRONG TUẦN

> Rule 15 — Ship → Use → Measure. Không thiết kế hệ hoàn hảo 3 tháng nữa mới xong.

### Đợt 1 — "chụp được, tìm được, không mất" · mục tiêu **trong tuần**

| # | Việc | Vì sao ở Đợt 1 |
|---|---|---|
| 1 | Cài đặt Google OAuth (thủ công 1 lần, có checklist) — **gồm bước chuyển "In production"** | Không có cái này thì không có gì chạy |
| 2 | `src/kho-file.js` — `luuFile`/`layFile`, hai cài đặt `drive` + `d1_tam` | Cửa duy nhất ra kho ngoài |
| 3 | Bảng `tai_lieu` + `tai_lieu_lich_su` | Mục lục |
| 4 | Luồng 3 lần bấm, gắn vào **`nhan_su` · `san_pham` · `nha_cung_cap`** | Đúng ba thứ đang cần nhất |
| 5 | Xem lại · tải về · ẩn (có lý do) | Cất mà không lấy ra được thì vô nghĩa |
| 6 | Phân quyền `duocXemTaiLieu()` trong `quyen.js` | Không thể để dữ liệu mật chạy trần một ngày nào |
| 7 | **Sao lưu hằng ngày ra CSV lên Drive** + canary Lớp 1 + báo động Lớp A & B | Phần B là **P1** — mất dữ liệu không cứu được |

**Đợt 1 KHÔNG có:** nạp hàng loạt · nhiều trang một tài liệu · AI đọc ảnh · nhắc
hạn · tab Kho tài liệu riêng · sao lưu đơn hàng · GitHub bản sao thứ hai.

**Đợt 1 làm được gì thật:** nhân viên kho chụp hợp đồng NCC bằng điện thoại, mở
hồ sơ NCC ra là thấy, đúng người mới xem được, và toàn bộ dữ liệu công ty có bản
sao ngoài Cloudflare mỗi đêm. **Đó là đủ để tuần sau công ty khá hơn tuần này.**

### Đợt 2 — "kho tài liệu thành bộ não" · ~1 tuần sau

- Tab **Kho tài liệu** riêng: lọc theo loại · theo thứ gắn vào · ô tìm theo
  tên/số hiệu
- Gắn thêm vào `tai_san`, `cong_ty`, `ky_ke_toan`, `don_hoan`
- **Nối ngày hết hạn vào SPEC-0004** (Mục 8)
- **Nạp hàng loạt** từ máy tính (đường vào của kế toán)
- Nhiều ảnh = một tài liệu nhiều trang
- Nén bản sao lưu cũ hơn 7 ngày · bản hằng tháng có `don_hang`
- **Đồng hồ đo kho có rỗng không** (6.5)

### Đợt 3 — "bớt thao tác, chắc chắn phục hồi được"

- **AI đọc ảnh** đoán loại + số hiệu + ngày hết hạn (2 lần bấm) — dùng `env.AI` đã có
- `npm run phuc-hoi-thu` + **ca đối chứng có lỗi cố ý** + biên bản quý (9.4)
- **GitHub repo riêng tư** làm bản sao thứ hai
- Chuyển tài liệu từ `d1_tam` sang `drive` (nếu Đợt 1 phải dùng phao)

### Đợt 4 — chỉ khi số liệu thật cho thấy cần

Xem trước PDF trong ERP · ký số · phiên bản tài liệu · OCR tìm theo nội dung
trong file. **Không xây trước khi có ai kêu thiếu.**

---

## 11. Chỗ tái dùng — không xây lại cái đang chạy

| Cần | Dùng lại cái đã có | Ghi chú |
|---|---|---|
| Nén ảnh ở trình duyệt | `nenAnhChung()` — `public/assets/js/app.js:897` | **Không** viết hàm nén thứ tư. CTL-0011 vừa gộp 3 hàm về 1 |
| Bộ hẹn giờ | cron `*/5 * * * *`, `scheduled()` — `src/index.js:3465` | Thêm **2 dòng**. `wrangler.toml` **không đổi** |
| Báo cho người | `guiThongBao()` + bảng `thong_bao` + `guiTelegram()` | Không tạo kênh báo mới |
| Nhắc ngày hết hạn | **SPEC-0004** qua bảng `cong_viec` | Không có cơ chế nhắc thứ hai |
| Phân quyền | `src/quyen.js` | Thêm `duocXemTaiLieu()`. **Không thêm vai trò mới** |
| Chạy nền lâu, chia lô | khuôn của `dongBoDonHangNen()` | Cùng bài toán: nhiều dữ liệu, ít CPU |
| Cách bảo vệ khi thiếu binding | `if (!env.MINH_CHUNG)` — `src/index.js:1682` | Bê nguyên cho `if (!env.GOOGLE_REFRESH_TOKEN)` — thiếu cấu hình thì báo rõ, **không crash** |
| Cất bí mật | két Cloudflare `wrangler secret` | Đúng như `TIKTOK_APP_SECRET` đang làm |
| Đọc ảnh giấy tờ (Đợt 3) | `[ai] binding = "AI"` đã khai, đã dùng cho CCCD | Không thêm nhà cung cấp AI nào |

**Không thêm thư viện. Không thêm cron. Không thêm kênh thông báo. Không thêm
vai trò. `wrangler.toml` chỉ đổi khi nào bật R2 — mà ta đang đề xuất không bật.**

---

## 12. ⬜ CẦN SẾP QUYẾT — 4 câu, gom hết vào đây

> Hai ERP Owner **ngang quyền**: Sếp Bùi Thị Ngọc và Sếp Nguyễn Duy Phong
> (chốt 27/08/2026, `docs/AGENT-ROLES.md`). Một trong hai trả lời là đủ.
>
> Bốn câu này **chặn Đợt 1**. Mười câu kỹ thuật khác tôi đã tự quyết và ghi lý
> do trong spec (BH-08) — Sếp không phải đọc.

---

### Ô1 — Dùng tài khoản Google nào để làm kho? (chặn tất cả)

Toàn bộ giấy tờ scan và bản sao lưu sẽ nằm trong Google Drive của **một** tài
khoản Google. Ai đăng nhập được tài khoản đó là xem được hết — kể cả lương và
CCCD nhân viên.

- **A. Dùng `alphagreen.commerce@gmail.com`** (tài khoản công ty đang có) —
  không phải tạo gì mới, dùng được ngay. Nhưng tài khoản này đang dùng cho việc
  khác, và 15 GB chia chung với hòm thư.
- **B. Lập một tài khoản Gmail MỚI chỉ để làm kho**, ví dụ
  `luutru.agc@gmail.com` — trống nguyên 15 GB, không ai dùng vào việc khác, mất
  10 phút lập.
- **C. Mua Google Workspace** (~180.000đ/người/tháng) — **có tính tiền, tôi
  không đề xuất.**

**Tôi khuyến nghị B.** Lý do: 15 GB nguyên vẹn thay vì chia với hòm thư đang đầy
dần; và tài khoản chỉ làm một việc thì mật khẩu dễ giữ chặt hơn.

Chọn xong, hai việc bắt buộc — **không làm là hệ thống có lỗ hổng ngay ngày đầu**:
1. **Bật xác thực 2 bước** cho tài khoản đó.
2. **Chốt ai giữ mật khẩu.** Tôi đề xuất: cả hai Sếp, không ai khác. Nhân viên
   không cần mật khẩu — họ vào qua ERP.

Và Sếp cho tôi biết **tài khoản đó đang dùng hết bao nhiêu GB** (vào
`drive.google.com` nhìn góc dưới bên trái) — để tôi chốt lại con số ở Mục 4.

---

### Ô2 — Có bật Cloudflare R2 không? (tôi đề xuất: KHÔNG)

R2 là kho file của Cloudflare, cùng nhà với ERP nên chạy mượt hơn Drive một
chút. Miễn phí 10 GB.

**Nhưng bật R2 thì Cloudflare bắt gắn thẻ tín dụng của công ty vào** — và đó là
dịch vụ tính tiền theo mức dùng, vượt hạn mức là tự trừ, không hỏi ai.

- **A. KHÔNG bật R2, dùng Google Drive.** Không gắn thẻ, không có đường tự trừ
  tiền. Hết chỗ thì báo lỗi chứ không tính tiền.
- **B. Bật R2**, chấp nhận gắn thẻ, đặt giới hạn chi tiêu 0 trên Dashboard.

**Tôi khuyến nghị A.** Drive đáp ứng đủ, đủ ít nhất 3 năm, và **Sếp mở bằng điện
thoại được ngay cả khi không có ERP** — đúng câu Sếp nói về đổi công cụ. R2 thì
phải qua ERP mới xem được file, hơi ngược với điều Sếp muốn.

Nếu Sếp chọn A hôm nay, sau này đổi ý vẫn bật R2 được — tôi đã thiết kế sẵn chỗ
cắm, thêm khoảng 40 dòng code, không phải làm lại gì.

---

### Ô3 — Hợp đồng lao động và quyết định lương: ngoài Sếp ra ai được xem?

Đây là quy định nhân sự, không phải chuyện kỹ thuật, nên tôi không tự quyết.

**Ô3a — Hợp đồng lao động của nhân viên:**
- A. Chỉ Sếp (Admin). Chị Lan Hương (HCNS) **không** xem được.
- B. Sếp **và** chị Lan Hương — vì chị là người soạn và lưu hợp đồng.
- C. Sếp, chị Lan Hương, và chị Hằng (Kế toán trưởng).

**Tôi khuyến nghị B.** Chị Lan Hương là người trực tiếp làm hợp đồng; không cho
xem thì chị phải hỏi Sếp mỗi lần cần — thêm việc cho Sếp mà không an toàn hơn.

**Ô3b — Quyết định lương / phụ lục lương:**
- A. Chỉ Sếp.
- B. Sếp và chị Hằng (Kế toán trưởng) — chị cần để tính lương và làm BHXH.

**Tôi khuyến nghị B.** ERP hiện đã cho Kế toán trưởng xem cột lương rồi, nên cho
xem quyết định lương là nhất quán. Chị Lan Hương **không** xem — ERP đang tách
rõ HCNS không đụng lương, tôi giữ nguyên ranh giới đó.

*(Trong cả hai câu, **nhân viên luôn xem được hợp đồng và giấy tờ của chính
mình** — cái này tôi không hỏi, vì không cho là sai cả về nghiệp vụ lẫn luật bảo
vệ dữ liệu cá nhân.)*

---

### Ô4 — Anh Duy (Quản lý kho) có được xem CCCD của nhân viên kho không?

Anh Duy quản lý trực tiếp 12 nhân sự toàn thời gian + 17 thời vụ. ERP hiện cho
anh xem **hồ sơ** đội mình (tên, số điện thoại, ca làm) nhưng **không** cho xem
lương.

- **A. KHÔNG.** Anh xem hồ sơ nhưng không xem ảnh CCCD. Cần thì hỏi chị Lan Hương.
- **B. CÓ**, nhưng chỉ CCCD của **nhân viên trong đội anh**, và mỗi lượt xem đều
  bị ghi lại.

**Tôi khuyến nghị A**, trừ khi anh Duy thực sự cần CCCD để làm việc gì hằng ngày
(làm thẻ ra vào, đăng ký tạm trú cho nhân viên thời vụ, khai báo với chủ kho).
Nếu có việc như vậy thì chọn B — nhưng Sếp cho tôi biết là việc gì, để tôi mở
đúng phạm vi đó thay vì mở cả cụm.

> **Gợi ý nhỏ ngoài phạm vi kỹ thuật:** Kho tài liệu sẽ ghi lại ai đưa tài liệu
> vào. Đợt 2 có đồng hồ đếm số tài liệu mới mỗi tuần (mục 6.5) — Sếp có thể dùng
> đúng con số đó để **gọi tên và khen** người chăm nhập nhất trong buổi họp tuần.
> Ghi nhận công khai là thứ Sếp đang muốn luyện thành thói quen, và đây là một
> chỗ có sẵn số liệu để làm, không phải cảm tính.

---

## 13. Tôi đã tự quyết những gì (không cần Sếp đọc)

Ghi lại theo BH-08 — có lý do, kiểm được, không phải quyết cho nhanh:

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Google Drive thay vì R2 làm kho chính | Không cần thẻ; Sếp mở được bằng điện thoại (Mục 3) |
| 2 | OAuth refresh token, **không** dùng Service Account | Service Account không sở hữu được file trên tài khoản Gmail thường — sẽ hỏng ngay lần đầu (Mục 3) |
| 3 | Scope `drive.file`, không phải `drive` | ERP chỉ đụng file do chính nó tạo; không cần Google thẩm định |
| 4 | Một bảng `tai_lieu` với `(loai_gan, gan_id)` | Sáu bảng riêng là sáu lần cùng đoạn code (Rule 5) |
| 5 | Danh mục 21 loại giấy tờ hard-code, không phải bảng DB | Đúng tiền lệ `quyen.js`; danh mục này gần như không đổi |
| 6 | **Không cho xoá hẳn**, chỉ ẩn có lý do | Rule 10; giấy tờ pháp lý xoá nhầm không lấy lại được |
| 7 | Ghi vết lượt **xem** chỉ với tài liệu mức `mat` | Ghi hết sẽ đẻ hàng chục nghìn dòng/tháng, ăn hạn mức ghi của D1 |
| 8 | **Không** sao lưu `don_hang`/`don_hoan` hằng ngày, chỉ hằng tháng | `SOURCE-OF-TRUTH.md`: sàn là nguồn thật, kéo lại được. Giảm bản sao lưu từ 92 MB xuống 22 MB |
| 9 | **Loại token Shopee/TikTok khỏi bản sao lưu** | Token rò rỉ nguy hiểm hơn mất token nhiều lần |
| 10 | Retention 30 ngày + 12 tháng + vĩnh viễn cuối năm | Sai sót âm thầm thường mất vài tuần mới lộ (9.3) |
| 11 | CSV có BOM + bọc `="0..."` cho cột có số 0 đầu | Không có thì Excel Việt Nam hiện sai chữ và nuốt số 0 |
| 12 | Chia lô 2.000 dòng/lượt cron, chạy 1h–4h sáng | Trần 10 ms CPU/lượt cron của gói miễn phí (9.2) |
| 13 | Báo hỏng **hai lớp** (lỗi khi chạy + kiểm "hôm qua có bản không") | Lớp một không bắt được ca cron chết hẳn (9.5) |
| 14 | Phao `d1_tam` **kèm dải băng cảnh báo + nhắc hằng tuần** | Chế độ tạm không có đường thành vĩnh viễn (5.2) |

---

## 14. Cập nhật tài liệu kèm theo (Khỉ Đột làm cùng Đợt 1)

| File | Sửa gì |
|---|---|
| `docs/DATA-DICTIONARY.md` | Đổi dòng **Document** từ *"CHƯA TỒN TẠI"* → entity thật: bảng `tai_lieu`, Owner = người tải lên + Admin, SoT = ERP cho mục lục / Google Drive cho file |
| `docs/SOURCE-OF-TRUTH.md` | Thêm 2 dòng: *Tài liệu scan (file thật)* → System Owner **Google Drive**; *Bản sao lưu* → **Google Drive**, một chiều ERP → Drive |
| `docs/AUTOMATION-CURRENT-STATE.md` | Ghi **AUTOMATION_GAP**: bước lấy OAuth refresh token là **THỦ CÔNG một lần**, chưa có runner. Không được ghi "đã tự động hoàn toàn" |
| `docs/decisions/` | ADR ngắn: *"Google Drive là kho file, không bật R2"* — kèm lý do gắn thẻ |
| `wrangler.toml` | **Không đổi.** Khối R2 để nguyên trạng thái khoá, sửa lại phần chú thích trỏ sang ADR này |

---

## 15. Định nghĩa Xong cho Đợt 1

Khỉ Đột **không** được tự nhận `DONE` (BH-06). Xong build → `READY_FOR_REVIEW`,
kèm bằng chứng cho từng dòng dưới đây:

- [ ] Chụp hợp đồng NCC bằng điện thoại thật → lưu được → mở lại xem được.
      **Đo và ghi số giây thật**, kèm cả **ca đối chứng bỏ bộ lọc loại giấy tờ** (6.4)
- [ ] Đăng nhập bằng vai trò `nhan_vien_kho` → **không** mở được tài liệu mức
      `mat` của người khác. Ghi rõ đã thử vai trò nào, tài liệu nào, máy chủ trả
      mã lỗi gì
- [ ] Kiểm bằng công cụ mạng của trình duyệt: **`fileId` của Drive không xuất
      hiện** trong bất kỳ phản hồi nào gửi về trình duyệt
- [ ] Sao lưu chạy đủ một đêm → mở `nhan_su.csv` bằng Excel → **tiếng Việt có
      dấu hiện đúng, số điện thoại còn số 0 đứng đầu** (chụp màn hình)
- [ ] Canary khớp số dòng. **Và ca đối chứng: cố ý làm hỏng một file → canary
      PHẢI báo động.** Không báo thì canary vô dụng (BH-16)
- [ ] Ngắt `GOOGLE_REFRESH_TOKEN` → ERP **không crash**, báo rõ "chưa cấu hình
      kho tài liệu", các tab khác chạy bình thường
- [ ] **Đo và ghi CPU thật của lượt cron sao lưu** — phải dưới 10 ms. Ghi con số,
      không ghi "chạy tốt"
- [ ] Xác nhận màn hình OAuth đã ở trạng thái **"In production"** (chụp màn hình).
      Còn "Testing" là 7 ngày nữa chết
- [ ] `wrangler.toml` không có thay đổi nào ngoài chú thích

---

## 16. History

| from | to | by | at | note |
|---|---|---|---|---|
| `READY_FOR_ANALYSIS` | `NEEDS_OWNER_DECISION` | HỒ LY | 2026-08-27 | Xác minh chi phí = 0 với Google Drive, dẫn nguồn tài liệu chính thức. **Đề xuất KHÔNG bật R2** vì bắt gắn thẻ tín dụng. Tính ra 15 GB đủ 3–8 năm. Chốt luồng nhập **3 lần bấm** từ điện thoại. Ngày hết hạn nối vào SPEC-0004 qua `cong_viec`, không dựng cơ chế nhắc thứ hai. 4 câu chặn ở Mục 12 |
