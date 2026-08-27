# SPEC-0004 — Trạm Mục Tiêu chủ động nhắc việc

- **Yêu cầu gốc**: [CTL-0007](../requests/CTL-0007-tram-muc-tieu-chu-dong-nhac-viec.md)
- **Người viết**: HỒ LY (Agent A — Business Analyst / Product Analyst / UX / QA)
- **Ngày viết**: 2026-08-27
- **Module**: `cong_viec` — `src/index.js:1815-2300`, tab Trạm Mục Tiêu
- **Risk**: **MEDIUM** (đổi luồng nghiệp vụ đang dùng thật hằng ngày; thêm
  kênh thông báo chủ động — làm sai là 20 người tắt chuông)
- **Boundary Classification**: `PROCESS_IMPROVEMENT` + `UX_IMPROVEMENT`.
  **Không** phải `CORE_CHANGE`: không đổi luật chuyển trạng thái, không đổi
  phân quyền, không đổi Source of Truth.
- **Status**: `READY_FOR_BUILD` cho **Đợt 1–2**; Đợt 3 chờ SPEC-0003 Đợt A merge.
  **Không có câu nào chặn chờ Sếp** — 2 câu nêu ở cuối là câu *xác nhận chính
  sách*, có mặc định an toàn chạy được ngay nếu Sếp bận.

---

## Đã chốt trước khi viết — spec này KHÔNG bàn lại

Gạo đã audit code trước khi giao việc (CTL-0007 mục 2). Ghi lại để không ai
thiết kế lại cái đang chạy tốt:

1. **Sếp KHÔNG thiếu trạng thái.** 5 trạng thái `moi · dang_lam · cho_duyet ·
   hoan_thanh · huy` là đủ. **Spec này không thêm trạng thái nào.**
2. **Luật chuyển trạng thái ở `src/index.js:1956` giữ nguyên 100%.**
   `CHUYEN_HOP_LE` đang chặt hơn hẳn `gop_y` — không đụng vào.
3. **Không tạo bảng nhắc việc mới.** Tái dùng `thong_bao` + `guiThongBao()` +
   `guiTelegram()` + cron `scheduled()` đã chạy.
4. **Không đo năng suất cá nhân để chấm KPI** (Hiến pháp điều cấm 20).
   Mục tiêu là **không quên việc**, không phải xếp hạng nhân viên.

---

## Problem

Trạm Mục Tiêu có đủ mọi thứ để *tra cứu*, nhưng **không có gì để đi tìm người**.

`scheduled()` (`src/index.js:3465`) chạy mỗi 5 phút với 5 đầu việc — đồng bộ
Shopee, TikTok, cảnh báo đơn hoàn quá 12h, cảnh báo lý do nghiêm trọng, Hồ Ly
triage góp ý — và **không có một dòng nào chạm tới `cong_viec`**.

Hệ quả: mọi cảnh báo quá hạn (`app.js:1531`, `1549`, `2222`, `2234`) chỉ hiện
**khi có người mở ERP ra xem**. Người hay quên việc chính là người không mở ERP.
Cảnh báo nằm đúng chỗ người cần nó không bao giờ nhìn tới.

Năm lỗ hổng CTL-0007 nêu, sắp lại theo mức thiệt hại thật:

| # | Lỗ hổng | Vì sao đau nhất |
|---|---|---|
| **4** | Việc ở **"Chờ duyệt"** không ai duyệt | **Đau nhất.** Nhân viên đã làm xong, nộp lên, rồi người giao quên duyệt. Nhân viên tưởng xong · người giao tưởng chưa làm · việc chết ở giữa. **Đây là lỗi của người quản lý, nhưng người chịu tiếng là nhân viên.** Không sửa cái này thì mọi thứ khác vô nghĩa |
| 1 | Không nhắc khi **quá hạn** | Ai chủ động mở ERP mới biết |
| 2 | Không cảnh báo **sắp đến hạn** | Chỉ báo khi ĐÃ trễ — nhắc lúc đó là muộn rồi |
| 3 | Việc ở **"Mới"** nhiều ngày không ai đụng | Nhận việc rồi để đó |
| 5 | Không đẩy ra **Telegram** | `guiTelegram()` đã có, chưa dùng cho công việc |

**Vấn đề thứ sáu, CTL-0007 chưa nêu, tôi phát hiện khi đọc code — và nó chặn
câu 7 (ghi nhận):**

Hiện **không có cách nào biết nhân viên nộp việc lúc nào**. `cong_viec` chỉ có
`cap_nhat_luc` — thời điểm **cuối cùng** bản ghi bị sửa. Khi việc thành
`hoan_thanh`, `cap_nhat_luc` là lúc **người giao bấm duyệt**, không phải lúc
người làm nộp.

Nghĩa là nếu chấm "đúng hạn" bằng `cap_nhat_luc`:

> Nhân viên nộp đúng hạn ngày 20. Quản lý bận, ngày 25 mới duyệt.
> Hệ thống ghi nhận: **nhân viên trễ 5 ngày.**

**Ghi nhận sai người, đổ lỗi sai người.** Không sửa chỗ này thì câu 7 không
làm được, và tệ hơn — lỗ hổng #4 vừa gây ra việc chết chìm, vừa đổ tiếng xấu
lên đúng người đã làm xong việc.

---

## Current flow

```
Sếp giao việc  →  guiThongBao() bắn 1 chuông "có việc mới"  →  ...im lặng mãi mãi
                                                                    ↓
                                              (không ai mở ERP → không ai biết)
                                                                    ↓
                                                          việc quá hạn, đỏ trên màn
                                                          hình mà không ai nhìn
```

Mọi thứ sau chuông đầu tiên đều **thụ động**: chờ người mở ERP.

## Proposed flow

```
┌─ 8h00 SÁNG mỗi ngày (giờ VN), trong cron scheduled() đã có ────────────┐
│                                                                        │
│  quetNhacViec(env)                                                     │
│    1. Gom việc cần nhắc của TỪNG NGƯỜI                                 │
│    2. Gộp thành ĐÚNG MỘT tin cho mỗi người                             │
│    3. Không có gì cần nhắc  →  KHÔNG GỬI GÌ CẢ                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
         ↓ chuông ERP (thong_bao, nguoi_nhan_id)
   NGƯỜI NHẬN VIỆC: "Hôm nay bạn có 2 việc quá hạn, 1 việc đến hạn"
   NGƯỜI GIAO VIỆC: "3 việc bạn giao đang chờ bạn duyệt"      ← lỗ hổng #4
         ↓ chỉ khi quá hạn > 7 ngày
   QUẢN LÝ TRỰC TIẾP: việc đọng của team mình
         ↓ 8h00 thứ Hai, Telegram nhóm
   SẾP: bản tin tuần — ai đang đọng · và AI LÀM XONG ĐÚNG HẠN  ← câu 7
```

Ba nguyên tắc chi phối toàn bộ thiết kế:

1. **Một người, một tin, một ngày.** Không bao giờ N việc = N tin.
2. **Không có gì bất thường thì im lặng.** Tin "hôm nay bạn không có việc gì
   trễ" là loại tin làm người ta tắt chuông.
3. **Nhắc đúng người có quyền hành động.** Việc kẹt ở "Chờ duyệt" là lỗi của
   người giao — nhắc người giao, không nhắc nhân viên.

---

## Actors

| Ai | Nhận gì | Qua kênh nào |
|---|---|---|
| **Người nhận việc** | Việc của mình: quá hạn · đến hạn hôm nay · đến hạn ngày mai · ở "Mới" quá lâu | Chuông ERP |
| **Người giao việc** | Việc mình giao đang **kẹt ở "Chờ duyệt"** · việc mình giao đã quá hạn | Chuông ERP |
| **Quản lý trực tiếp** (`nhan_su.quan_ly_id`) | Chỉ việc quá hạn **> 7 ngày** của người mình quản lý | Chuông ERP |
| **ERP Owner (Sếp)** | Bản tin tuần: ai đang đọng · **ai làm xong đúng hạn** | Telegram nhóm + màn hình trong ERP |
| **Cron** `quetNhacViec()` | — | Ghi `thong_bao`, gọi `guiTelegram` |

**Người phối hợp (`phoi_hop_ids`) KHÔNG nhận nhắc việc.** Giữ đúng luật đã có
ở `src/index.js` (Sếp Ngọc chốt 20/08/2026: *"cứ để người chính báo cáo đừng
để người phối hợp làm"*) — **một đầu mối chịu trách nhiệm cho mỗi việc**.
Nhắc người phối hợp là làm loãng trách nhiệm và nhân đôi lượng tin.

**Todo cá nhân (`nguoi_nhan_id = nguoi_giao_id`) vẫn được nhắc**, nhưng chỉ
một lần khi quá hạn, và **không bao giờ leo cấp lên quản lý**. Việc tự nhắc
mình thì không có ai để mách.

---

## Data

### Cột thêm — `migrations/them-congviec-nhacviec.sql`

**Đúng một cột nghiệp vụ mới.** Không bảng mới, không trạng thái mới.

```sql
ALTER TABLE cong_viec ADD COLUMN nop_luc TEXT;   -- lúc người LÀM nộp lên "Chờ duyệt" (giờ VN)

CREATE INDEX IF NOT EXISTS idx_cong_viec_nhac ON cong_viec (trang_thai, han_chot);
```

`nop_luc` là **một sự thật riêng**, không suy ra được từ cột nào đang có
(Rule 1). Nó trả lời **ba** câu hỏi khác nhau mà hôm nay không câu nào trả lời được:

| Câu hỏi | Tính bằng |
|---|---|
| Người làm có nộp **đúng hạn** không? | `nop_luc <= han_chot` — **không** dùng `cap_nhat_luc` |
| Việc kẹt ở "Chờ duyệt" bao lâu rồi? | `now - nop_luc` (lỗ hổng #4) |
| Người **duyệt** để đọng bao lâu? | `cap_nhat_luc(hoan_thanh) - nop_luc` |

Ghi vào đúng một chỗ: trong `cvCapNhat()`, nhánh `trangThaiMoi === 'cho_duyet'`.

**Việc trả lại làm tiếp** (`cho_duyet → dang_lam`): **xoá `nop_luc` về NULL**.
Việc chưa xong thì lần nộp cũ không còn là sự thật nữa. Nộp lại lần sau ghi
`nop_luc` mới — và đó mới là mốc tính đúng hạn. Không giữ lần nộp đầu để
"cho đẹp": nộp một bản chưa đạt rồi tính là đúng hạn thì cả cơ chế ghi nhận
thành trò đùa (Rule 9).

### Dữ liệu cũ

`nop_luc` của mọi việc cũ là **NULL**. Xử lý dứt khoát, không đoán ngược:

- Việc **đang** ở `cho_duyet` mà `nop_luc IS NULL` → coi mốc nộp là **ngày bật
  tính năng**, không phải `cap_nhat_luc`. Không đổ lỗi ngược cho quá khứ.
- Việc **đã** `hoan_thanh` mà `nop_luc IS NULL` → **không đưa vào bảng ghi
  nhận đúng hạn**, không tính là trễ. Không có dữ liệu thì không phán.
  Hiển thị *"—"*, không hiển thị *"trễ"* (Rule 9 — không biến dữ liệu chưa
  kiểm chứng thành sự thật).

### KHÔNG thêm cột "đã nhắc" — và vì sao

CTL-0007 gợi ý theo khuôn `da_canh_bao` của `kiemTraCanhBaoHoan()`. Tôi **cố ý
không làm vậy**, sau khi đọc kỹ cả hai chỗ. Lý do:

`don_hoan.da_canh_bao` hợp lý vì đó là cảnh báo **bắn một lần rồi thôi**.
Nhắc việc thì **lặp lại nhiều lần theo thời gian** — dùng cờ 0/1 sẽ phải đẻ
thêm `nhac_lan_1`, `nhac_lan_2`, `nhac_sap_han`, `nhac_dong`... mỗi loại nhắc
một cột. Đó là đường dẫn thẳng tới một bảng đầy cột cờ mà không ai dám sửa.

Thay vào đó dùng **hai cơ chế không cần state**:

1. **Lịch nhắc suy ra từ ngày**, không lưu ở đâu cả:
   quá hạn ngày thứ **1**, **3**, **7** thì có mặt trong bản tin; sau ngày 7
   thì thôi nhắc người làm, chuyển sang leo cấp. Tính bằng
   `julianday(now) - julianday(han_chot)` — luôn đúng, không bao giờ lệch.
2. **Chống gửi trùng trong ngày**: hỏi thẳng bảng `thong_bao`:

   ```sql
   SELECT 1 FROM thong_bao
    WHERE nguoi_nhan_id = ? AND loai = 'cv_ban_tin'
      AND date(tao_luc) = date('now','+7 hours') LIMIT 1
   ```

   Có rồi → bỏ qua. **`thong_bao` tự nó chính là sổ ghi "đã nhắc"** — không
   cần cột thứ hai nói lại điều bảng này đã biết (Rule 5, Rule 1).

Lợi ích thật, không phải sạch sẽ suông: cron chạy lại nhiều lần trong ngày,
deploy giữa chừng, hay cron lỡ một lượt — **kết quả vẫn đúng**, không gửi
trùng, không mất tin.

---

## Source of Truth

| Sự thật | Nguồn duy nhất |
|---|---|
| Trạng thái công việc | `cong_viec.trang_thai` — **spec này không ghi vào đây** |
| Hạn chót | `cong_viec.han_chot` |
| Lúc người làm nộp | `cong_viec.nop_luc` (mới) |
| Đã nhắc ai hôm nay chưa | `thong_bao` (`loai='cv_ban_tin'` + `date(tao_luc)`) |
| Quản lý trực tiếp | `nhan_su.quan_ly_id` — **dùng chung với SPEC-0002**, không tự định nghĩa lại |
| Lời ghi nhận | `vinh_danh` + `nhan_su.sao` — **do người gửi**, máy không tự cộng |

> **Ràng buộc cứng: `quetNhacViec()` KHÔNG BAO GIỜ ghi vào `cong_viec.trang_thai`.**
> Nó chỉ ĐỌC `cong_viec`, và CHỈ GHI vào `thong_bao`. Máy nhắc người làm, máy
> không làm thay người. Có Acceptance Criteria số 12 kiểm.

Về `quan_ly_id`: CTL-0007 mục 6 dặn dùng chung cách xác định quản lý với
CTL-0003. **Tuân thủ**: gọi đúng hàm `nguoiDuyetCap1()` mà SPEC-0002 tách ra
(quản lý trực tiếp → nếu trống thì trưởng phòng → nếu vẫn trống thì Sếp).
Nếu SPEC-0004 lên trước SPEC-0002, Khỉ Đột viết hàm đó **theo đúng chữ ký
SPEC-0002 đã khai**, để sau này SPEC-0002 dùng lại chứ không viết cái thứ hai.

---

## Core reuse

| Cần | Đã có sẵn | Cách dùng lại |
|---|---|---|
| Bộ hẹn giờ | cron `*/5 * * * *` trong `scheduled()` | Thêm **1 dòng**. Không tạo cron thứ hai, `wrangler.toml` **không đổi** |
| Chuông cá nhân | `guiThongBao(env, nhom, noiDung, loai, lienKet, nguoiNhanId)` | Dùng nguyên. Đã hỗ trợ gửi riêng từng người qua `nguoi_nhan_id` |
| Bảng thông báo | `thong_bao` | Dùng nguyên. **Kiêm luôn vai trò sổ "đã nhắc"** |
| Số chưa đọc | `tai_khoan.tb_xem_luc` | Dùng nguyên, không đụng |
| Telegram | `guiTelegram(env, text)` | Dùng nguyên — **chỉ cho bản tin tuần của Sếp**, xem giới hạn dưới |
| Khuôn cron quét | `kiemTraCanhBaoHoan()` | Bê nguyên cấu trúc: 1 query gom → vòng lặp → gửi |
| Ghi nhận / khen | `vdGui()` + `vinh_danh` + `nhan_su.sao` | Dùng nguyên API, **không** viết endpoint mới |
| Gợi ý người đáng khen | `goi_y` trong `vdDanhSach()` | **Sửa cách tính** (xem câu 7), không viết cái mới |
| Giờ VN | `datetime('now','+7 hours')` | Dùng nguyên toàn bộ |

**Không thêm thư viện. Không thêm bảng. Không thêm cron. Không thêm endpoint
gửi tin.** Đúng một cột DB, một hàm cron, một màn hình.

---

## New Domain data

Một cột: `cong_viec.nop_luc`. Một index. Hết.

---

## Permissions

Không đổi phân quyền. Nhắc việc **đi theo quan hệ nghiệp vụ có sẵn**, không
theo vai trò:

| Ai được nhắc về việc nào | Vì sao được |
|---|---|
| `nguoi_nhan_id` | Đang có tên trên việc đó |
| `nguoi_giao_id` | Đã giao việc đó |
| `nguoi_duyet_cap1(nguoi_nhan_id)` | Là quản lý trực tiếp — **chỉ khi quá hạn > 7 ngày** |
| Admin | Bản tin tuần toàn công ty |

**Không ai nhìn thấy việc mà hôm nay họ chưa nhìn thấy được.** Bản tin chỉ
gom lại thứ người đó vốn đã có quyền xem trong Trạm Mục Tiêu — nên spec này
**không mở rộng quyền xem dữ liệu** cho bất kỳ ai. Đây là lý do nó không phải
`CORE_CHANGE`.

Ngoại lệ duy nhất: **quản lý trực tiếp** thấy việc đọng của cấp dưới trong
bản tin của mình. Việc đó vốn đã công khai — tab `lichsuviec` hiện đã cho
**mọi vai trò** xem toàn bộ việc của cả công ty (`src/index.js`, Sếp Ngọc chốt
21/08/2026: minh bạch theo tinh thần MBOs). Nên đây là **gom lại**, không phải
**mở thêm**.

---

## Chín câu của CTL-0007 — trả lời đủ

### Câu 1 — Nhắc lúc nào? Con số cụ thể

Bảng này là **hợp đồng**, Khỉ Đột code đúng theo, không tự chế:

| Tình huống | Điều kiện | Nhắc ai | Lịch nhắc |
|---|---|---|---|
| **Đến hạn ngày mai** | `han_chot = ngày mai`, chưa `hoan_thanh`/`huy` | Người nhận | **1 lần duy nhất** |
| **Đến hạn hôm nay** | `han_chot = hôm nay` | Người nhận | **1 lần duy nhất** |
| **Quá hạn** | `han_chot < hôm nay` | Người nhận **+ người giao** | Ngày quá hạn thứ **1, 3, 7** — rồi **thôi** |
| **Đọng ở "Mới"** | `trang_thai='moi'` ≥ **3 ngày** kể từ `tao_luc` | Người nhận | Ngày thứ **3**, rồi mỗi **7 ngày** |
| **Đọng ở "Chờ duyệt"** | `trang_thai='cho_duyet'` ≥ **2 ngày** kể từ `nop_luc` | **Người giao** | Ngày thứ **2**, rồi mỗi **3 ngày** |
| **Leo cấp** | quá hạn > **7 ngày** | Quản lý trực tiếp | Mỗi **7 ngày** |
| **Bản tin tuần** | — | Sếp + Admin | **8h thứ Hai** |

**Lý do từng con số — không phải bốc:**

- **Đến hạn: báo trước đúng 1 ngày.** Báo trước 3 ngày thì lúc nhận tin người
  ta chưa định làm, tin trôi mất; đến hạn thì quên như cũ. Một ngày là khoảng
  còn kịp xoay mà vẫn đủ gần để hành động ngay.
- **Quá hạn: ngày 1, 3, 7 rồi thôi.** Nhắc mỗi ngày là quấy rối, và tới ngày
  thứ 5 người ta đã học được cách lướt qua nó. Sau ngày 7 mà vẫn chưa xong thì
  **nhắc thêm không giải quyết được gì** — vấn đề không còn là quên nữa, mà là
  việc đó bị kẹt hoặc không làm nổi. Lúc đó cần **người**, nên leo cấp.
- **"Mới" 3 ngày.** Dưới 3 ngày là bình thường (nhận việc thứ Sáu, thứ Hai mới
  bắt tay). Quá 3 ngày mà chưa bấm "Bắt đầu làm" thì hoặc quên, hoặc không
  hiểu việc — cả hai đều cần nhắc.
- **"Chờ duyệt" 2 ngày — ngắn nhất trong bảng, cố ý.** Đây là lỗ hổng #4, chỗ
  đau nhất. Nhân viên đã làm xong rồi, đang đứng chờ. Mỗi ngày trôi qua là một
  ngày người đó bị treo vô cớ. **Người quản lý phải là người bị nhắc gắt nhất,
  không phải nhân viên.**
- **Leo cấp mỗi 7 ngày**, không phải mỗi ngày — quản lý mà bị réo hằng ngày về
  việc của người khác thì sẽ tắt chuông trong một tuần.

**Việc không có hạn chót** (`han_chot IS NULL`): không nhắc quá hạn (không có
mốc nào để trễ), **nhưng vẫn nhắc đọng** ở "Mới" và "Chờ duyệt". Việc không hạn
mà nằm im 3 tháng vẫn là việc bị quên.

### Câu 2 — Nhắc ai? Có leo cấp không?

| Loại | Người nhận việc | Người giao việc | Quản lý trực tiếp |
|---|---|---|---|
| Sắp đến hạn / đến hạn | ✅ | — | — |
| Quá hạn 1–7 ngày | ✅ | ✅ | — |
| Quá hạn > 7 ngày | — *(thôi nhắc)* | ✅ | ✅ **leo cấp** |
| Đọng ở "Mới" | ✅ | — | — |
| **Đọng ở "Chờ duyệt"** | — | ✅ **chỉ người giao** | — |

**Có leo cấp, nhưng theo độ trễ, không theo số lần bỏ qua.** Ngưỡng duy nhất:
**7 ngày quá hạn**.

**Ba quyết định đáng giải thích:**

1. **Việc đọng ở "Chờ duyệt" KHÔNG nhắc nhân viên.** Nhân viên đã làm xong
   phần của mình. Nhắc họ về một việc họ không có quyền động vào
   (`hoan_thanh` chỉ `laNguoiGiao` bấm được) là **bắt người ta lo về việc
   ngoài tầm tay** — vừa vô ích vừa gây ức chế. Nhắc đúng người có nút bấm.

2. **Quá hạn > 7 ngày thì THÔI nhắc người làm.** Nghe ngược, nhưng: người đó
   đã bị nhắc 3 lần rồi. Lần thứ tư không tạo ra hành động, chỉ tạo ra cảm
   giác bị truy đuổi. Chuyển sang leo cấp — để **một người** hỏi han, không
   phải **một cái máy** réo tiếp.

3. **Kênh báo cáo của kho được tôn trọng đúng.** Nhân sự kho quá hạn > 7 ngày
   → leo lên **anh Phạm Khương Duy** (`quan_ly_id`), **không** nhảy thẳng lên
   Sếp. Đúng kênh chuẩn *Nhân sự kho → anh Duy → Sếp Ngọc*. Sếp thấy qua bản
   tin tuần, không thấy qua tin nhắc từng việc — đúng vai trò của Sếp.

### Câu 3 — Nhắc qua đâu?

| Kênh | Dùng cho | Trạng thái kỹ thuật |
|---|---|---|
| **Chuông ERP** (`guiThongBao` + `nguoi_nhan_id`) | **Toàn bộ** nhắc việc cá nhân | ✅ Đã có, đã gửi riêng từng người được |
| **Telegram nhóm** (`guiTelegram`) | **Chỉ** bản tin tuần cho Sếp/quản lý | ⚠️ Có giới hạn — đọc kỹ dưới |
| Web Push (điện thoại) | — | ❌ **Chưa có.** Đọc mục "Nói thẳng" |

**Giới hạn của Telegram — phải nói rõ để không ai hứa nhầm với Sếp:**

`guiTelegram(env, text)` (`src/index.js:2343`) gửi tới **đúng một**
`env.TELEGRAM_CHAT_ID` cố định — **một nhóm chat chung của công ty**.
Nó **không thể** nhắn riêng cho từng nhân viên.

Muốn nhắn riêng qua Telegram phải: mỗi nhân viên chủ động chat với bot trước,
lưu `chat_id` của từng người vào `nhan_su`, xử lý người đổi số/rời nhóm.
Đó là **một tích hợp mới** (`INTEGRATION_CHANGE`), không phải "dùng lại
`guiTelegram()`" như CTL-0007 mục 5 phác. **Ngoài phạm vi spec này.**

Vì vậy Telegram ở đây chỉ làm **một việc**: 8h thứ Hai bắn bản tin tuần vào
nhóm chung. Nhắc việc cá nhân **hoàn toàn** qua chuông ERP.

**Nói thẳng — chỗ này giải pháp CHƯA trọn vẹn:**

`public/sw.js` **không có** handler `push` hay `Notification` (đã kiểm). Nghĩa
là chuông ERP **chỉ hiện khi người ta mở app ra**. Với người luôn mở ERP để
làm việc (kho, vận hành sàn, kế toán) thì đủ. Với người **cả tuần không mở
ERP** — đúng nhóm hay quên nhất — thì **chuông vẫn không tới được họ**.

Spec này thu hẹp lỗ hổng đó **rất nhiều** (gom việc, hiện ngay khi mở, leo cấp
sang người khác), nhưng **không bịt kín được**. Bịt kín cần Web Push, là việc
riêng. Tôi không báo "đã xong" cho thứ chưa xong — ghi lại thành
`AUTOMATION_GAP` ở [Rollout](#rollout).

Lớp bù đắp trong lúc chưa có Web Push: **leo cấp lên người thật**. Người không
mở ERP thì cái đến được với họ là **anh Duy hỏi trực tiếp**, không phải cái
chuông. Đó là lý do ngưỡng leo cấp 7 ngày quan trọng hơn nó thoạt nhìn.

### Câu 4 — Chống làm phiền *(câu quan trọng nhất)*

> Rule 12 — Human Cost. Nhắc quá tay thì người ta tắt thông báo, và lúc đó
> **mọi cảnh báo khác cũng chết theo** — kể cả cảnh báo đơn hoàn đang chạy tốt.
> Đây là rủi ro lớn nhất của cả spec, lớn hơn mọi rủi ro kỹ thuật.

**Bảy chốt chặn, xếp theo sức mạnh:**

**1. Gộp — một người, một tin, một ngày.** Chốt mạnh nhất.

Không bao giờ "mỗi việc một tin". Một nhân viên có 5 việc quá hạn nhận **1**
tin, không phải 5:

```
📋 Việc của bạn hôm nay
🔴 Quá hạn 2: "Kiểm kê hàng khô Q3" (trễ 3 ngày) · "Gửi báo giá NCC" (trễ 1 ngày)
🟡 Đến hạn hôm nay 1: "Chốt tồn kho tuần"
⏳ Chưa bắt đầu 1: "Rà hạn sử dụng lô hạt điều" (giao 4 ngày trước)
```

Sức nặng thật: người có 5 việc trễ nhận **1** tin/ngày, tối đa **≈15** tin/tháng.
Nếu bắn mỗi việc một tin theo lịch 1-3-7 thì cùng người đó nhận **≈45** tin.
Chênh **ba lần**, và 45 tin/tháng là ngưỡng chắc chắn bị tắt chuông.

**2. Không có gì bất thường thì KHÔNG GỬI GÌ.** Exception-First.

Không có "bản tin sáng" cố định. Không có "hôm nay bạn không có việc trễ".
Người làm tốt **không bao giờ bị làm phiền**. Điều này quan trọng hơn nó có vẻ:
nó biến cái chuông thành **tín hiệu** thay vì **tiếng ồn nền** — chuông kêu là
có chuyện, nên người ta còn mở ra xem.

**3. Nhắc thưa dần rồi dừng hẳn.** Quá hạn: ngày 1, 3, 7 → hết.
**Không có nhắc vô hạn ở bất kỳ đâu trong spec này.** Mọi loại nhắc đều có
điểm dừng, hoặc chuyển sang người khác.

**4. Không nhắc ngoài giờ làm và ngày nghỉ.**

- Chỉ gửi trong khung **8h00–18h00 giờ VN**.
- **Không gửi Chủ nhật.**
- Thứ Bảy **có** gửi — kho vận vẫn làm thứ Bảy.
- Việc đến hạn Chủ nhật → nhắc vào **thứ Bảy**, không để trôi sang thứ Hai
  (lúc đó đã trễ rồi mới báo thì vô nghĩa).

> **Chưa có bảng ngày lễ trong hệ thống** (đã soát toàn bộ `migrations/`).
> Nghĩa là **Tết và nghỉ lễ vẫn bị nhắc**. Tôi **không** dựng bảng ngày lễ
> trong spec này — dựng một bảng mà mỗi năm phải có người nhớ đi điền là tạo
> ra một việc thủ công mới. Xử lý ở Đợt 3 bằng **một công tắc tạm tắt**, tái
> dùng `cau_hinh_he_thong` của SPEC-0003. Trước khi có nó: **cận Tết Sếp báo
> Gạo tắt tay.** Ghi vào `AUTOMATION_GAP`, không giấu.

**5. Nhắc đúng người có nút bấm.** Đã nói ở câu 2. Nhắc một người về việc họ
không động vào được là dạng làm phiền tệ nhất — nó vừa vô ích vừa gây bất lực.

**6. Trần cứng chống sự cố**: **tối đa 40 tin `cv_ban_tin`/lượt cron**.
Vượt → dừng, ghi log, báo Telegram cho Gạo. Công ty 20 người thì 40 là ngưỡng
không bao giờ chạm nếu code đúng — chạm nghĩa là **có bug**. Chốt chặn này tồn
tại để một vòng lặp sai không bao giờ bắn 500 tin vào chuông của mọi người.

**7. Người dùng tự tắt được.** Ô chọn *"Nhận nhắc việc hằng ngày"* trong hồ sơ
cá nhân, **mặc định BẬT**. Ai tắt thì thôi.

> Nghe như tự phá hệ thống, nhưng ngược lại: **cho người ta cái nút tắt trong
> ứng dụng là cách giữ họ không tắt chuông ở tầng hệ điều hành.** Tắt trong
> ERP thì Sếp còn nhìn thấy ai đã tắt (và hỏi vì sao); tắt ở điện thoại thì
> không ai biết gì cả. Tôi **thà** thấy 3 người tắt hơn là không biết 10 người
> đã tắt.
>
> Lưu ở `tai_khoan`, một cột `nhac_viec_tat INTEGER DEFAULT 0`. **Leo cấp lên
> quản lý và bản tin tuần của Sếp KHÔNG bị cột này tắt** — người tắt nhắc vẫn
> phải chịu trách nhiệm về việc đọng, chỉ là không bị máy nhắc nữa.

### Câu 5 — "Việc của tôi hôm nay"

**Có. Thấy ngay, không phải đi tìm.** Một khối duy nhất ở **đầu tab Trạm Mục
Tiêu**, trên mọi bộ lọc.

Thiết kế **Exception-First** — chỉ hiện thứ bất thường:

```
┌─────────────────────────────────────────────┐
│  🔴 2 việc quá hạn                          │
│     • Kiểm kê hàng khô Q3      trễ 3 ngày   │
│     • Gửi báo giá NCC mới      trễ 1 ngày   │
│  🟡 1 việc đến hạn hôm nay                  │
│     • Chốt tồn kho tuần                     │
│  🟣 3 việc bạn giao đang chờ BẠN duyệt      │
│     • Hương — "Hợp đồng thời vụ"  2 ngày    │
└─────────────────────────────────────────────┘
```

Không có việc nào bất thường → **khối biến mất hoàn toàn**. Không hiện
*"Bạn không có việc quá hạn 🎉"*. Một khối luôn có mặt là một khối mắt người
học được cách bỏ qua trong đúng một tuần.

Khối *"đang chờ BẠN duyệt"* (🟣) là thứ **hôm nay chưa có ở đâu cả**, và là
lời giải trực tiếp cho lỗ hổng #4. Chữ **BẠN** in đậm cố ý: người giao việc
thường không nghĩ mình đang là người làm chậm.

Bấm một dòng → nhảy thẳng vào việc đó, không qua danh sách trung gian.

### Câu 6 — Màn của Sếp

**Nhìn một chỗ, biết ngay ai đọng việc gì.** Gộp **theo người**, không theo
phòng ban — và có lý do:

Công ty 20 người, 10 fulltime. Gộp theo phòng ban cho ra **4–5 dòng**, mỗi dòng
một con số vô danh: *"Kho vận: 7 việc quá hạn"*. Sếp nhìn xong vẫn phải bấm
tiếp mới biết **ai**. Gộp theo người cho ra ngay cái Sếp hỏi:

```
AI ĐANG ĐỌNG VIỆC                          [Toàn công ty ▾]
┌──────────────────────────────────────────────────────────┐
│ Nguyễn Thị Huyền   🔴 3 quá hạn   trễ nhất 9 ngày   ⚠️   │
│ Vũ Lan Hương       🔴 1 quá hạn   trễ nhất 2 ngày        │
│ Phạm Khương Duy    🟣 4 chờ DUY duyệt  đọng nhất 5 ngày  │
└──────────────────────────────────────────────────────────┘
```

Ba điều cố ý:

1. **Người quản lý bị soi ngang hàng người làm.** Dòng của anh Duy không phải
   việc anh trễ, mà **4 việc của team đang chờ chính anh duyệt**. Nếu bảng này
   chỉ soi người làm thì nó là bảng đổ lỗi, không phải bảng quản trị.
2. **`⚠️` = quá 7 ngày**, tức là nhắc máy đã hết tác dụng, cần người vào cuộc.
   Đây chính là dòng Sếp nên nhắn tin hỏi han.
3. **Không có cột "tổng số việc đã làm", không xếp hạng ai giỏi hơn ai.**
   Bảng này trả lời *"việc nào đang kẹt"*, không trả lời *"ai chăm hơn"*
   (điều cấm 20).

**Anh Duy có màn riêng.** Cùng một màn hình, đổi bộ lọc:

- Sếp / Admin → thấy toàn công ty.
- Người có ít nhất một người dưới quyền (`quan_ly_id` trỏ tới mình) → thấy
  **đúng team mình**, mặc định.
- Không quản lý ai → không thấy khối này.

Anh Duy mở ERP thấy ngay 12 fulltime + 17 parttime của kho — đúng kênh
*Nhân sự kho → anh Duy → Sếp Ngọc*, và đúng thứ ADR-0006 vừa dựng cho `gop_y`.
**Một cách xác định quản lý dùng chung cho cả hai module**, không có hai định
nghĩa song song.

### Câu 7 — Ghi nhận, không chỉ bắt lỗi *(câu quan trọng thứ hai)*

> Hôm nay hệ thống **chỉ** làm nổi bật cái trễ: đỏ, cảnh báo, quá hạn.
> **Không có một chỗ nào** làm nổi bật người làm xong đúng hạn. Một hệ chỉ
> biết réo người trễ sẽ khiến nhân viên **sợ** Trạm Mục Tiêu thay vì dùng nó —
> và lúc đó họ sẽ tránh nhận việc có hạn chót rõ ràng. Cơ chế phản tác dụng
> ngay trên chính mục tiêu MBOs của công ty.

**Ba việc, cả ba đều tái dùng, không xây mới:**

**(a) Bảng "Đáng ghi nhận tuần này" — ngay cạnh bảng "Ai đang đọng việc"**

Hai bảng **nằm cạnh nhau, cùng kích thước**. Bố cục là thông điệp: hệ thống
này nhìn cả hai chiều, không phải chỉ đi bắt lỗi.

```
ĐÁNG GHI NHẬN TUẦN NÀY
┌──────────────────────────────────────────────────────────┐
│ Phan Thị Hằng   "Chốt sổ quỹ tháng 8"   nộp sớm 2 ngày   │
│                                            [ ⭐ Ghi nhận ]│
│ Vũ Lan Hương    "Rà quản lý trực tiếp"  đúng hạn         │
│                                            [ ⭐ Ghi nhận ]│
└──────────────────────────────────────────────────────────┘
```

Điều kiện vào bảng: `hoan_thanh` trong 7 ngày qua **và** `nop_luc <= han_chot`
**và** `nop_luc IS NOT NULL`. Chấm theo **`nop_luc`**, không phải `cap_nhat_luc`
— đây là chỗ cột mới trả công: **người làm không bị tính trễ vì quản lý duyệt
muộn** (xem [Problem](#problem)).

**Không xếp hạng, không đếm số việc, không có "quán quân tuần".** Đây là **danh
sách những lần làm tốt**, không phải bảng thi đua. Sắp xếp theo thời gian gần
nhất, không theo số lượng. Điều cấm 20 cấm dùng dữ liệu này để chấm KPI —
biến nó thành bảng xếp hạng là lách luật đó bằng cửa sau.

**(b) Nút `⭐ Ghi nhận` — một chạm, gọi thẳng Vinh danh có sẵn**

Bấm → mở đúng form Vinh danh đang chạy (`vdGui`), **điền sẵn**:
- người được vinh danh = người làm việc đó;
- lời khen nháp: *"Hoàn thành đúng hạn: [tên việc]"* — **sửa được**;
- số sao: mặc định **3**, Sếp đổi tuỳ ý.

**Không endpoint mới, không bảng mới.** Đúng `vdGui()` hiện có, chỉ khác là
form được mở từ một chỗ mới với dữ liệu điền sẵn.

Vì sao đáng làm: Sếp Ngọc đang rèn thói quen **ghi nhận và khen ngợi** — đó là
điểm Sếp tự nhận cần cải thiện. Rào cản thật không phải Sếp không muốn khen,
mà là **phải nhớ ai đã làm gì rồi tự đi tìm mà khen**. Bảng này bỏ khâu *nhớ*,
nút này bỏ khâu *đi tìm*. Còn lại đúng một chạm và một câu Sếp tự viết.
**Đưa thói quen vào đúng chỗ Sếp đang nhìn**, thay vì trông vào trí nhớ.

**(c) Bản tin tuần Telegram có ĐỦ HAI PHẦN**

8h thứ Hai, đúng một tin, ngắn:

```
📊 TRẠM MỤC TIÊU — TUẦN QUA

✅ Làm xong đúng hạn: 12 việc
   Nổi bật: Phan Thị Hằng · Nguyễn Thị Huyền

⚠️ Đang đọng: 5 việc
   Quá 7 ngày: 1 (Nguyễn Thị Huyền — "Đối soát TikTok T8")

🟣 Chờ duyệt quá 2 ngày: 3 việc
   Chờ: Phạm Khương Duy (2) · Sếp Ngọc (1)
```

**Phần khen đứng TRƯỚC phần chê.** Không phải để cho êm — mà vì một bản tin
tuần chỉ toàn tin xấu sẽ bị chính Sếp ngán đọc sau tháng thứ hai. Và dòng
*"Chờ: Phạm Khương Duy (2) · Sếp Ngọc (1)"* nói thẳng cả tên **Sếp** khi Sếp
là người đang giữ việc — nếu bản tin chỉ soi nhân viên thì nó mất uy tín ngay
lần đầu tiên Sếp là người chậm.

**(d) Một thứ tôi CỐ Ý KHÔNG làm: máy tự cộng sao**

Kỹ thuật thì dễ — xong đúng hạn thì `sao += 1`. **Không làm.**

Sao tự động biến ngay thành **điểm KPI**: nhân viên sẽ chọn việc dễ, xin hạn
chót dài, chia nhỏ việc để cộng nhiều sao. Vi phạm thẳng điều cấm 20, và phá
luôn ý nghĩa của Vinh danh — một lời khen từ **người** không thể thay bằng một
con số máy cộng.

**Máy chỉ chỉ chỗ. Người mới khen.**

### Câu 8 — Trên điện thoại

ERP là PWA, nhân sự kho dùng điện thoại là chính. Ràng buộc bắt buộc:

- Khối *"Việc của tôi hôm nay"*: **xếp dọc**, mỗi dòng là một khối chạm được
  cao **≥44px**, chạm đâu cũng mở việc đó — không có link chữ nhỏ.
- Toàn bộ khối lọt trong **một màn hình đầu**, không phải cuộn mới thấy.
  Việc quá hạn ở trên cùng.
- **Không có bảng ngang** ở màn hình <720px. Chuyển sang thẻ dọc, cùng khuôn
  SPEC-0002 đã dùng cho danh sách góp ý — **một quy ước cho cả hai module**.
- Bảng *"Ai đang đọng việc"* trên điện thoại: mỗi người một thẻ, tên trên,
  con số dưới. Cuộn dọc, không cuộn ngang.
- Nút `⭐ Ghi nhận`: **chiếm hết chiều ngang thẻ**, bấm được bằng ngón cái —
  Sếp hay bấm lúc đang di chuyển, không phải lúc ngồi trước máy tính.
- **Ngân sách thao tác**: từ lúc mở ERP tới lúc thấy việc quá hạn của mình =
  **0 lần bấm** (nó nằm sẵn ở màn đầu). Từ đó tới lúc mở đúng việc = **1 chạm**.

### Câu 9 — Dữ liệu cũ, ngày đầu bật

Nguy cơ thật: hệ thống đang có sẵn một đống việc quá hạn từ trước. Bật lên
là bắn một loạt.

**Ba lớp chặn, và lớp thứ nhất gần như đã đủ:**

**1. Cơ chế gộp tự nó đã chặn phần lớn.** Một người có 12 việc quá hạn tồn
đọng vẫn chỉ nhận **1** tin. Ngày đầu tệ nhất = **1 tin/người**, tối đa 20 tin
toàn công ty. Đây không phải may mắn — đây là lý do chọn gộp thay vì bắn từng
việc ngay từ câu 4.

**2. "Ân xá" 7 ngày cho việc quá hạn từ trước.**

Ghi ngày bật vào `cau_hinh_he_thong.NHAC_VIEC_BAT_DAU_TU` (hoặc hằng số trong
code nếu Đợt 1 lên trước SPEC-0003). Việc có `han_chot < NHAC_VIEC_BAT_DAU_TU`:

- **Có** trong bản tin cá nhân ngày đầu — người ta cần biết mình đang nợ gì.
- **KHÔNG leo cấp lên quản lý trong 7 ngày đầu.**
- **KHÔNG** vào bản tin tuần đầu tiên của Sếp.

Vì sao: nợ cũ là **nợ của cả hệ thống**, không phải lỗi của người đang cầm việc
lúc này. Bắn hết lên quản lý ngay ngày đầu sẽ tạo ra một buổi sáng thứ Hai đầy
tra hỏi về những việc mà chính người quản lý cũng đã quên. **Cách nhanh nhất
để cả công ty ghét tính năng này ngay ngày đầu tiên.** Cho 7 ngày để mọi người
tự dọn.

**3. Một màn dọn dẹp cho Sếp, chạy trước khi bật.**

Trước Đợt 2, Sếp mở *"Việc tồn đọng cần dọn"* — danh sách mọi việc quá hạn
> 14 ngày, mỗi dòng ba nút: **Huỷ** · **Đổi hạn** · **Vẫn làm**.

Đây là **việc của người, không phải của máy** — máy không được tự huỷ việc của
ai (Rule 9). Dọn xong thì thứ còn lại trong hệ thống là việc thật, và mọi lời
nhắc từ ngày đó đều đáng tin. **Bật nhắc việc trên một danh sách đầy rác là
cách chắc chắn nhất để dạy mọi người bỏ qua lời nhắc.**

---

## Happy path

**Chị Hằng (Kế toán trưởng) có việc "Chốt sổ quỹ tháng 8", hạn 30/08:**

```
29/08 8h00  cron → "Đến hạn ngày mai: Chốt sổ quỹ tháng 8"   (1 tin)
29/08       Chị Hằng mở ERP → khối đầu tab hiện 🟡 1 việc → chạm → làm
29/08 16h   Bấm "Nộp kết quả" → cho_duyet, nop_luc = 29/08 16:02
30/08 8h00  cron → chị Hằng KHÔNG nhận tin nào (việc đã nộp)   ✅ im lặng
31/08 8h00  cron → Sếp Ngọc nhận: "1 việc bạn giao đang chờ BẠN duyệt
                    (Hằng — Chốt sổ quỹ tháng 8, 2 ngày)"      ← lỗ hổng #4
31/08       Sếp duyệt → hoan_thanh
01/09 T2 8h Bản tin tuần: "✅ Nổi bật: Phan Thị Hằng"
            Sếp mở ERP → bảng "Đáng ghi nhận" có dòng chị Hằng
                       → bấm [⭐ Ghi nhận] → sửa lời khen → gửi
            Chị Hằng nhận chuông: "Sếp Ngọc vừa vinh danh bạn... (+3 ⭐)"
```

Điểm mấu chốt: chị Hằng nộp **đúng hạn 29/08** dù việc mãi 31/08 mới được duyệt.
`nop_luc` giữ đúng sự thật đó. Nếu chấm bằng `cap_nhat_luc`, chị Hằng bị ghi
nhận là **trễ 1 ngày** — vì Sếp duyệt muộn. Một cột, một sự công bằng.

## Exception path

| Tình huống | Hệ thống làm gì |
|---|---|
| Người nhận việc đã nghỉ (`nhan_su.trang_thai` khác đang làm) | **Không nhắc người đó.** Nhắc thẳng **người giao**: *"Việc đang giao cho người đã nghỉ — cần giao lại"*. Không để việc chết theo người |
| Không có `quan_ly_id` **và** không có `truong_phong_id` | Leo cấp lên **Sếp**, kèm ghi chú *"chưa có quản lý trực tiếp"*. **Không nuốt im lặng** |
| Quản lý trực tiếp chính là người nhận việc | Bỏ qua leo cấp cấp 1 → lên thẳng cấp trên nữa. Không tự nhắc mình về việc mình |
| `han_chot` sai định dạng / rỗng | Bỏ qua phần quá hạn, **vẫn xét đọng**. Không văng lỗi làm chết cả lượt cron |
| Cron chạy 2 lần trong ngày | Lần 2 thấy `thong_bao` hôm nay đã có → không gửi lại |
| Cron lỡ mất buổi sáng (deploy, sự cố) | Lượt cron kế tiếp **trong khung 8–18h** vẫn gửi. Quá 18h thì thôi, mai gửi |
| Vượt trần 40 tin/lượt | **Dừng ngay**, không gửi tiếp, Telegram báo Gạo. Nghi có bug |
| `guiThongBao` lỗi | `try/catch` nuốt êm như hàm gốc đang làm. **Một người lỗi không được làm chết cả lượt** |
| Người dùng đã tắt nhắc (`nhac_viec_tat=1`) | Không gửi tin cá nhân. **Vẫn** leo cấp lên quản lý và vẫn vào bản tin tuần |
| Việc `huy` hoặc `hoan_thanh` | Không bao giờ nhắc |

## SLA

| Việc | Ngưỡng |
|---|---|
| Nhắc việc chạy mỗi ngày | 1 lần, trong khung 8h00–18h00 giờ VN, trừ Chủ nhật |
| Bản tin tuần | 8h00 thứ Hai |
| Một người nhận tối đa | **1 tin `cv_ban_tin`/ngày** |
| Toàn hệ thống mỗi lượt cron | **≤40 tin** — vượt là dừng và báo bug |
| Thời gian chạy `quetNhacViec()` | <2 giây (≤3 truy vấn gom, không truy vấn trong vòng lặp) |

## Audit

- Mọi lời nhắc **đã là** một dòng `thong_bao` — có `nguoi_nhan_id`, `loai`,
  `noi_dung`, `tao_luc`. **Không cần sổ audit riêng.**
- `loai` dùng ba giá trị mới: `cv_ban_tin` · `cv_leo_cap` · `cv_ban_tin_tuan`.
  Tra được ngay: *"ngày X đã nhắc những ai, nội dung gì"*.
- `nop_luc` là một mốc thời gian **không sửa được bằng tay** từ giao diện — chỉ
  `cvCapNhat()` ghi khi chuyển sang `cho_duyet`, và xoá khi bị trả lại.
- **Spec này không ghi một dòng nào vào `cong_viec.trang_thai`**, nên không
  cần đụng tới sổ lịch sử trạng thái nào.

## UX

Đã mô tả đủ ở [câu 5](#câu-5--việc-của-tôi-hôm-nay), [câu 6](#câu-6--màn-của-sếp),
[câu 7](#câu-7--ghi-nhận-không-chỉ-bắt-lỗi-câu-quan-trọng-thứ-hai),
[câu 8](#câu-8--trên-điện-thoại). Ba quy tắc xuyên suốt:

1. **Exception-First** — không có gì bất thường thì không hiện gì.
2. **Không thuật ngữ máy.** Người dùng thấy *"trễ 3 ngày"*, không thấy
   `han_chot < date('now')`. Thấy *"đang chờ bạn duyệt"*, không thấy
   `trang_thai='cho_duyet'` (Rule 7).
3. **Màu giữ nguyên quy ước đang chạy**: đỏ = quá hạn (`app.js:1763`, `2031`,
   `2271`). Không đẻ bảng màu thứ hai. Thêm đúng một màu tím cho *"chờ bạn
   duyệt"* — vì đó là trạng thái mới được làm nổi, không phải trễ, và không
   được lẫn với đỏ.

## Human Cost

| Người | Trước | Sau |
|---|---|---|
| Nhân viên | Tự nhớ, hoặc mở ERP đi tìm | 0 thao tác. Mở ERP là thấy, tối đa 1 tin/ngày |
| Người giao việc | Tự nhớ mình còn nợ ai một chữ duyệt | 1 tin khi có việc kẹt >2 ngày |
| Anh Duy (QL kho) | Không biết team đọng gì tới khi Sếp hỏi | Màn riêng của team + leo cấp việc >7 ngày |
| **Sếp** — theo dõi | Mở ERP, bấm qua nhiều màn, tự cộng | 1 tin Telegram/tuần + 1 màn nhìn ra ngay |
| **Sếp** — ghi nhận | Phải **tự nhớ** ai làm tốt rồi **đi tìm** để khen | Bảng gợi ý sẵn + **1 chạm** mở form đã điền |

**Chi phí thật phải nói ra, không giấu:**

1. **Thêm ≈15 tin/tháng vào chuông của người hay trễ.** Đây là chi phí có
   chủ đích — nhưng nếu tính sai lịch nhắc thì nó thành 45 tin và cả hệ thống
   thông báo chết theo. Toàn bộ câu 4 tồn tại để canh đúng chỗ này.
2. **Người giao việc bị nhắc thứ mà trước nay không ai nhắc họ.** Sẽ có người
   khó chịu trong tuần đầu — đặc biệt là người quản lý. Đó là dấu hiệu tính
   năng chạy **đúng**: lỗ hổng #4 vốn là lỗi của người quản lý và trước giờ
   chưa từng bị chỉ ra.
3. **Một việc thủ công mới cho Sếp**: tạm tắt nhắc dịp Tết, cho tới khi có
   công tắc ở Đợt 3.
4. **Người không mở ERP vẫn không nhận được chuông** — chưa có Web Push.
   Lớp bù là leo cấp sang người thật.

## Acceptance Criteria

1. Việc `han_chot` = ngày mai, `trang_thai='moi'` → người nhận có **đúng 1**
   dòng `thong_bao` `loai='cv_ban_tin'` trong ngày. Chạy cron **3 lần liên
   tiếp** → vẫn **đúng 1** dòng.
2. Một người có **5** việc quá hạn → **1** tin, nội dung liệt kê đủ 5.
   **Không** phải 5 tin.
3. Người **không có** việc bất thường nào → **0** dòng `thong_bao`.
   *(Kiểm bằng `COUNT(*)`, không kiểm bằng mắt.)*
4. Việc quá hạn ngày thứ **2, 4, 5, 6** → **không** có tin. Ngày **1, 3, 7** →
   có tin. Ngày **8 trở đi** → người nhận **hết** nhận tin; quản lý trực tiếp
   bắt đầu nhận `cv_leo_cap`.
5. Việc `cho_duyet` đủ 2 ngày → **người giao** nhận tin; **người nhận KHÔNG**
   nhận tin nào về việc đó.
6. Chạy cron lúc **19h** hoặc **Chủ nhật** → **0** tin gửi đi.
7. Việc `hoan_thanh` hoặc `huy` → **không bao giờ** xuất hiện trong tin nào.
8. `nop_luc` được ghi đúng lúc chuyển `dang_lam → cho_duyet`, và **về NULL**
   khi bị trả lại `cho_duyet → dang_lam`.
9. Nộp **đúng hạn** ngày 29, người giao duyệt ngày 31 → việc **có** trong bảng
   *"Đáng ghi nhận"*. *(Kiểm bằng `cap_nhat_luc` thì sẽ trượt — đây là bài
   kiểm quan trọng nhất của cột `nop_luc`.)*
10. Việc cũ `nop_luc IS NULL` đã `hoan_thanh` → **không** vào bảng ghi nhận,
    và **không** bị đánh dấu trễ. Hiển thị `—`.
11. Bấm `⭐ Ghi nhận` → gọi đúng endpoint `vdGui` hiện có, tạo 1 dòng
    `vinh_danh`, cộng sao. **Không** có endpoint mới nào được thêm.
12. **Máy không tự cộng sao.** Chạy cron 30 ngày với nhiều việc hoàn thành
    đúng hạn → `SUM(nhan_su.sao)` **không đổi** nếu không ai bấm Vinh danh.
13. **`quetNhacViec()` không ghi vào `cong_viec`.**
    `grep -n "UPDATE cong_viec" ` trong hàm đó → **không kết quả**.
    Trạng thái trước/sau một lượt cron **giống hệt nhau**.
14. Đặt trần **40** rồi tạo 60 việc cần nhắc → dừng ở 40, có log, có tin
    Telegram báo Gạo, **không** gửi tin thứ 41.
15. Người nhận đã nghỉ việc → **người giao** nhận tin "cần giao lại";
    người đã nghỉ nhận **0** tin.
16. Nhân sự kho quá hạn 8 ngày → **anh Duy** nhận `cv_leo_cap`;
    **Sếp không** nhận tin riêng về việc đó (chỉ thấy ở bản tin tuần).
17. `nhac_viec_tat=1` → người đó nhận **0** tin cá nhân, **nhưng** việc của họ
    **vẫn** leo cấp lên quản lý và **vẫn** vào bản tin tuần.
18. Ngày đầu bật với 12 việc quá hạn sẵn của 1 người → **1** tin cho người đó;
    **0** tin leo cấp trong 7 ngày đầu.
19. Màn hình rộng **375px**: khối "Việc của tôi hôm nay" nằm trọn trong màn
    đầu, mỗi dòng chạm được ≥44px, **không** cuộn ngang ở bất kỳ đâu.
20. `quetNhacViec()` chạy **<2 giây** với 500 việc; **không** có truy vấn DB
    nào nằm trong vòng lặp người dùng.

## Migration

| File | Nội dung |
|---|---|
| `migrations/them-congviec-nhacviec.sql` | `ALTER TABLE cong_viec ADD COLUMN nop_luc TEXT;` · `ALTER TABLE tai_khoan ADD COLUMN nhac_viec_tat INTEGER NOT NULL DEFAULT 0;` · `CREATE INDEX idx_cong_viec_nhac ON cong_viec (trang_thai, han_chot);` |

**Chỉ `ADD COLUMN` và `CREATE INDEX`. Không `DROP`, không `UPDATE`, không đụng
một dòng dữ liệu nghiệp vụ nào.** Chạy `node scripts/chay-migration.mjs <file>`
(local trước), `--remote` ngay sau khi deploy code.

Dữ liệu cũ giữ `nop_luc = NULL` và được xử lý đúng theo mục
[Dữ liệu cũ](#dữ-liệu-cũ) — **không** backfill đoán ngược từ `cap_nhat_luc`.
Đoán ngược là bịa ra một sự thật chưa từng được ghi (Rule 9).

## Risk

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **Nhắc quá tay → cả công ty tắt chuông, kéo chết luôn cảnh báo đơn hoàn đang chạy tốt** | **CAO** | Toàn bộ [câu 4](#câu-4--chống-làm-phiền-câu-quan-trọng-nhất): gộp 1 tin/người/ngày · im lặng khi không có gì · nhắc thưa dần rồi dừng · trần 40 tin · cho tắt trong app |
| **Chấm "đúng hạn" bằng `cap_nhat_luc` → đổ lỗi trễ cho người nộp đúng hạn** | **CAO** | Cột `nop_luc` + Acceptance 9. Đây là lỗi **rất dễ mắc** vì `cap_nhat_luc` có sẵn và trông có vẻ dùng được |
| Bảng ghi nhận biến thành bảng xếp hạng năng suất | **CAO** | Không đếm, không sắp theo số lượng, không có "quán quân". Máy **không** tự cộng sao (Acceptance 12). Điều cấm 20 |
| Ngày đầu bật bắn dồn tin | TRUNG BÌNH | Gộp + ân xá 7 ngày + màn dọn dẹp trước khi bật (câu 9) |
| Nhắc vào ngày lễ/Tết | TRUNG BÌNH | Chưa có bảng ngày lễ → **`AUTOMATION_GAP`**, tắt tay tới Đợt 3 |
| **Người không mở ERP vẫn không nhận được gì** | TRUNG BÌNH | Chưa có Web Push → **`AUTOMATION_GAP`**. Lớp bù: leo cấp sang người thật |
| Cron `scheduled()` bị chậm thêm | THẤP | ≤3 truy vấn gom, không truy vấn trong vòng lặp, có index mới. Bọc `try/catch` riêng như 5 hàm cron hiện có |
| Định nghĩa "quản lý trực tiếp" lệch với SPEC-0002 | TRUNG BÌNH | Dùng chung hàm `nguoiDuyetCap1()`. Nếu spec này lên trước thì viết đúng chữ ký SPEC-0002 đã khai |
| Người quản lý khó chịu vì bị nhắc | THẤP | Có chủ đích. Cần Sếp nói trước một câu ở buổi giao ban — xem [Rollout](#rollout) |

## Rollback

1. **Tức thì (giây)**: đặt cờ tắt → `quetNhacViec()` return ngay. Không tin nào
   được gửi. Hệ thống về **đúng** hiện trạng hôm nay.
2. **Ngắn (phút)**: gỡ 1 dòng gọi trong `scheduled()`, deploy lại.
3. **Đầy đủ**: revert commit. Cột `nop_luc` và `nhac_viec_tat` **nằm im**,
   không bảng nào tham chiếu tới chúng — không cần gỡ cột.
4. **Dữ liệu**: các dòng `thong_bao` đã gửi vẫn còn, xoá theo
   `loai IN ('cv_ban_tin','cv_leo_cap','cv_ban_tin_tuan')` nếu Sếp muốn dọn.
   **Không có dữ liệu nghiệp vụ nào bị đổi** → không có gì để khôi phục.

Toàn bộ tính năng là **chỉ đọc `cong_viec` và chỉ ghi `thong_bao`** — đó là lý
do rollback rẻ như vậy.

## Rollout

**Go-Live Level: `PILOT` trước, không `OFFICIAL` ngay.**

| Đợt | Nội dung | Điều kiện qua đợt sau |
|---|---|---|
| **0 — Dọn dẹp** | Migration + màn *"Việc tồn đọng cần dọn"*. **Chưa bật nhắc.** Sếp dọn việc quá hạn >14 ngày | Danh sách tồn đọng đã được Sếp xử hết |
| **1 — Màn hình, chưa nhắc** | Khối *"Việc của tôi hôm nay"* + bảng *"Ai đang đọng"* + bảng *"Đáng ghi nhận"* + nút ⭐. **Cron CHƯA bật.** | Chạy 3 ngày, mọi người thấy đúng việc của mình, không ai báo sai số liệu |
| **2 — PILOT nhắc việc** | Bật cron **riêng phòng Kho Vận** (lọc theo `phong_ban_id`) | Chạy 1 tuần: không ai kêu bị làm phiền · anh Duy dùng được màn team trên điện thoại · **≥1 việc thật được cứu khỏi quên** |
| **3 — OFFICIAL** | Bật toàn công ty + bản tin tuần Telegram | |
| **4 — Bịt hai lỗ** | Công tắc tạm tắt dịp lễ (dùng `cau_hinh_he_thong` của SPEC-0003) · Web Push | Việc riêng, không chặn Đợt 3 |

**Chọn Kho Vận làm PILOT** vì đó là nơi đông người nhất (12 fulltime + 17
parttime), dùng điện thoại nhiều nhất, và có kênh báo cáo rõ nhất
(*NV kho → anh Duy → Sếp*). Thử ở chỗ khó nhất, không thử ở chỗ dễ.

**Việc của người, làm trước Đợt 2 — quan trọng ngang phần code:**

Sếp nói **một câu** ở buổi giao ban trước khi bật, đại ý:

> *"Từ tuần sau ERP sẽ tự nhắc việc. Nó nhắc cả tôi và các quản lý khi chúng
> tôi để việc chờ duyệt quá lâu — không phải chỉ nhắc nhân viên. Và nó sẽ chỉ
> ra ai làm xong đúng hạn để tôi ghi nhận."*

Không có câu này, tính năng sẽ bị hiểu là **công cụ giám sát nhân viên**, và
lúc đó cách phòng thủ tự nhiên của mọi người là **tránh nhận việc có hạn chót
rõ ràng** — đúng thứ phá hỏng MBOs. Có câu này, nó là **công cụ không quên
việc dùng chung**, và người quản lý bị soi ngang hàng người làm.

**AUTOMATION_GAP phải ghi vào `docs/AUTOMATION-CURRENT-STATE.md`, không được
báo "đã tự động" cho hai thứ này:**

- `AUTOMATION_GAP #4` — **Ngày lễ/Tết**: chưa có bảng ngày lễ. Cận Tết phải
  tắt tay. Đóng ở Đợt 4.
- `AUTOMATION_GAP #5` — **Người không mở ERP**: chưa có Web Push
  (`public/sw.js` không có handler `push`). Chuông chỉ tới được người có mở
  app. Đóng ở Đợt 4.

## Boundary Classification

`PROCESS_IMPROVEMENT` + `UX_IMPROVEMENT` → **KHÔNG phải Owner Gate.**

Lý do **không** phải `CORE_CHANGE`, kiểm từng tiêu chí:

- **Không** đổi luật chuyển trạng thái (`CHUYEN_HOP_LE` giữ nguyên 100%).
- **Không** đổi phân quyền — không ai xem được thứ hôm nay họ chưa xem được.
- **Không** thêm tác nhân ghi vào Source of Truth: chỉ **đọc** `cong_viec`,
  chỉ **ghi** `thong_bao`.
- **Không** đổi ngữ nghĩa cột nào đang có. `nop_luc` là sự thật mới, chưa từng
  được ghi ở đâu.
- **Không** tích hợp ngoài mới. `guiTelegram` đã đang chạy, đúng cách dùng cũ.

Thứ duy nhất chạm business policy là **chính sách nhắc việc** (nhắc ai, mấy
lần, ngưỡng leo cấp) — nên có [hai câu xác nhận](#hai-câu-xác-nhận-với-sếp)
dưới đây. Cả hai đều có mặc định an toàn, **không chặn build**.

---

## Hai câu xác nhận với Sếp

> **Không phải câu chặn.** Cả hai đã có mặc định chạy được ngay. Đưa lên vì
> chúng là **chính sách quản trị**, không phải kỹ thuật — tôi không tự quyết
> thay Sếp, nhưng cũng không để Khỉ Đột phải ngồi chờ.

| # | Câu hỏi | A | B | C | Mặc định nếu Sếp bận |
|---|---|---|---|---|---|
| **N1** | Máy sẽ nhắc **cả người quản lý** (gồm Sếp) khi để việc chờ duyệt quá 2 ngày — không chỉ nhắc nhân viên. Sếp đồng ý bị máy nhắc không? | **Đồng ý** — nhắc cả quản lý và Sếp, đúng người đang giữ việc | Chỉ nhắc quản lý cấp dưới, **không** nhắc Sếp | Không nhắc người quản lý, chỉ nhắc nhân viên | **A** — nếu hệ thống chỉ soi nhân viên thì nó là công cụ giám sát, và sẽ mất uy tín ngay lần đầu tiên Sếp là người chậm. Lỗ hổng đau nhất (#4) **là lỗi của người duyệt**, nên phải nhắc người duyệt |
| **N2** | Nhân viên có được **tự tắt** nhắc việc hằng ngày trong hồ sơ của mình không? | **Được tắt**, Sếp nhìn thấy ai đã tắt; leo cấp và bản tin tuần **vẫn chạy** | Không cho tắt | Chỉ Sếp mới tắt được cho từng người | **A** — không cho tắt trong app thì người ta tắt chuông ở điện thoại, và lúc đó **không ai biết**. Cho tắt trong app thì Sếp còn thấy và còn hỏi được vì sao. Quan trọng: tắt nhắc **không** tắt trách nhiệm — việc của họ vẫn leo cấp lên quản lý |

**Việc Sếp cần làm (không phải câu hỏi, là hành động):**

1. **Trước Đợt 0**: dành ~30 phút dọn màn *"Việc tồn đọng cần dọn"*.
   Bật nhắc trên một danh sách đầy rác là cách chắc chắn nhất để dạy cả công ty
   bỏ qua lời nhắc.
2. **Trước Đợt 2**: nói **một câu** ở buổi giao ban (nguyên văn gợi ý ở
   [Rollout](#rollout)). Đây là phần quan trọng nhất mà code không làm thay được.
3. **Sau Đợt 3, tuần đầu**: mỗi sáng thứ Hai, mở bảng *"Đáng ghi nhận"* và bấm
   `⭐ Ghi nhận` cho **ít nhất một người**.

   Việc số 3 nghe nhỏ nhưng nó quyết định tính năng này được nhớ đến như cái
   gì. Nếu tuần đầu chỉ có phần nhắc trễ chạy còn phần ghi nhận nằm im, mọi
   người sẽ kết luận Trạm Mục Tiêu là **máy bắt lỗi** — và kết luận đó rất khó
   gỡ về sau. Sếp Ngọc đang rèn đúng thói quen này; bảng gợi ý đã bỏ hộ khâu
   nhớ và khâu đi tìm, phần còn lại là một chạm và một câu Sếp tự viết.
