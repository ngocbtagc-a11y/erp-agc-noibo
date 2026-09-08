# Audit — Dashboard Marketplace (Shopee/TikTok)

Phase 3 của lộ trình Home/Dashboard (xem
[AUDIT-HOME-DASHBOARD.md](./AUDIT-HOME-DASHBOARD.md) mục L: "Không làm
trong Phase 1: Kho vận/Marketplace/CEO Trạm điều hành riêng (Phase 2-4)").

Ngày audit: 06/09/2026 · Trạng thái: **CHƯA CODE FEATURE — chờ ERP Owner
chốt định nghĩa metric (Rule D4/D6)**.

---

## A. Vì sao làm — nhu cầu kinh doanh thật

Nỗi đau ERP Owner đã nêu: *"chưa biết theo dõi các chỉ số trên 2 sàn;
không rõ nguyên nhân khi doanh số tăng hoặc giảm"*. Mục tiêu 12 tháng:
Shopee 120 tỷ/năm, TikTok Shop 20 tỷ/năm.

Đây là nhu cầu **Decision First** đúng Rule D2 (CEO/Admin) — nhưng Rule
D6 ("No dashboard without a decision") bắt buộc trả lời được *số xấu thì
làm gì* trước khi đưa KPI lên. Xem mục F.

## B. Dữ liệu marketplace ĐANG CÓ thật

| Nguồn | Bảng | Cột dùng được | Ghi bởi |
|---|---|---|---|
| Shopee Order API | `don_hang` | `order_sn, nguon, trang_thai, tong_tien, tien_te, nguoi_mua, so_sp, tao_luc_san, cap_nhat_san, san_pham_ten, san_pham_sku, huy_ly_do, huy_boi, huy_ly_do_khach, ma_van_don, du_lieu_json` | `shopee.js > dongBoDonHangNen()` |
| TikTok Order API | `don_hang` | như trên, **trừ** nhóm cột `huy_*` và `ma_van_don` (chưa map) | `tiktok.js > dongBoDonHangNen()` |
| Shopee/TikTok Return API | `don_hoan` | đơn hoàn/trả hàng — đã có quy trình 3 chặng riêng | `shopee.js`/`tiktok.js > dongBoNen()` |

Đồng bộ nền mỗi 5 phút (`wrangler.toml > crons`), mốc tăng dần theo
`update_time` — không quét lại toàn bộ.

**Quy ước tiền**: `tong_tien` là **số nguyên = số tiền × 100000**. Mọi
chỗ hiển thị phải chia lại 100000. Đây là nguồn của lỗi #1 mục D.

## C. Dữ liệu KHÔNG có — giới hạn thật, không lấp bằng phỏng đoán

1. **Không có bảng dòng hàng (line item).** `don_hang` mỗi đơn 1 dòng;
   nhiều SKU trong 1 đơn bị **nối chuỗi** vào `san_pham_sku` dạng
   `"SKU-A | SKU-B"` (`shopee.js > cauLenhDonHang`, `skuArr.join(' | ')`).
   → **Không tính đúng được doanh số theo từng SKU** khi đơn có nhiều
   mặt hàng. Đây chính là chỗ chặn câu hỏi *"vì sao doanh số tăng/giảm"*,
   vì nguyên nhân gần như luôn nằm ở cấp SKU/nhóm hàng.
   Tin tốt: `du_lieu_json` đã lưu **nguyên vẹn** payload đơn (có
   `item_list`/`line_items`) → tách bảng dòng hàng **backfill được từ dữ
   liệu đã có, KHÔNG cần gọi lại API sàn, không mất lịch sử**.
2. **Không có phí sàn / voucher / phí vận chuyển / tiền thực nhận.**
   `tong_tien` là giá đơn **chưa trừ** gì (ghi rõ trong
   `migrations/them-donhang.sql`). Nhóm API escrow của Shopee chưa gọi
   (`shopee.js:383` ghi nhận "để làm sau nếu cần").
   → Chưa trả lời được "thật sự về túi bao nhiêu".
3. **Không có giá vốn gắn theo đơn.** `san_pham`/`kho.js` có `gia_von`
   nhưng chưa nối được với `don_hang` (thiếu mục 1 ở trên).
   → Chưa tính được lợi nhuận gộp theo SKU.
4. **Không có traffic/lượt xem/tỉ lệ chuyển đổi/quảng cáo.** Không nguồn
   nào trong ERP đang kéo dữ liệu này.
   → Chưa trả lời được nguyên nhân dạng "giảm vì ít khách vào" hay
   "giảm vì quảng cáo tắt".
5. **TikTok chưa có lý do hủy** (`huy_ly_do`/`huy_boi`) — cột đã có trên
   bảng nhưng chỉ `shopee.js` ghi. Đã ghi nhận sẵn trong
   `src/index.js` khối `donHangHuy`: *"Chỉ có Shopee ... TikTok làm sau"*.

## D. Lỗi phát hiện trong lúc audit

### 🔴 Lỗi #1 — thẻ "Doanh thu hôm nay" trên Home CEO CHƯA TỪNG hiện lên

- **Chỗ**: `public/assets/js/app.js` > `veTongQuanTheoVaiTro()`, nhánh
  `TOI.la_admin`.
- **Root cause**: code gọi `await API.kdTongQuanDoanhThu()` nhưng
  `public/assets/js/api.js` **không hề định nghĩa hàm đó** (chỉ có
  `cvTongQuanCongTy`/`cvTongQuanPhongBan`). Lời gọi ném
  `TypeError` ngay lập tức, rơi vào `catch { }` rỗng ngay bên dưới với chú
  thích "chưa nạp migration đơn hàng — im lặng bỏ qua". Backend
  (`GET /api/kinh-doanh/tong-quan-doanh-thu`) vẫn chạy tốt, chưa từng có ai gọi.
- **Hệ quả**: Home của Sếp **chưa bao giờ hiển thị một con số tiền nào**, và
  không có lấy một dòng lỗi trên màn hình lẫn trong log để ai đó nhận ra.
  Đây là một phần lý do rất thật của câu "chưa biết theo dõi các chỉ số".
- **Lỗi ngầm thứ hai nằm ngay dưới**: cùng dòng đó còn thiếu phép chia
  100000 (`tong_tien` lưu dạng ×100000, xem `migrations/them-donhang.sql`;
  mọi chỗ hiển thị khác đều đã chia). Nghĩa là kể cả khi ai đó sửa đúng tên
  hàm, con số hiện ra vẫn sẽ sai gấp 100.000 lần.
- **Bài học rút ra (đã ban hành vào code)**: `catch` rỗng nuốt im lặng là
  thứ đã che lỗi này suốt nhiều tuần. Chỗ đó nay bắt buộc `console.error`.
- **Trạng thái**: **ĐÃ SỬA** — thẻ nay gọi API mới (`kdTongQuanKenh`), đúng
  đơn vị tiền, có thêm mức chênh so với hôm qua, bấm được sang tab Kinh doanh.

### 🟠 Lỗi #2 — `doanh_thu_hom_nay` tính cả đơn HỦY và đơn chưa thanh toán

- **Chỗ**: `src/index.js > kdTongQuanDoanhThu()`.
- **Root cause**: truy vấn chỉ lọc theo thời gian
  (`WHERE CAST(tao_luc_san AS INTEGER) >= ?`), **không lọc `trang_thai`**.
  Nghĩa là đơn `CANCELLED`, đơn chưa trả tiền... vẫn được cộng vào doanh thu.
- **Vi phạm Rule D4** (một metric một định nghĩa):
  `docs/METRIC-DEFINITIONS.md` ghi định nghĩa `doanh_thu_hom_nay` là
  *"Tổng tiền đơn hàng **thành công** trong ngày"* — code không khớp tài liệu.
- **Trạng thái**: **CHƯA SỬA — cần ERP Owner chốt định nghĩa trước**
  (mục F câu 1). Sửa mò sẽ đổi con số Sếp đang nhìn mà không ai chốt
  thước đo mới là gì.

## E. Blocker kiểm chứng dữ liệu thật

Không đọc được D1 production: token OAuth wrangler
(`ngocbt.agc@gmail.com`) bị từ chối — `code 7403, account not authorized`.
D1 local có bảng nhưng **0 dòng**.

Vì vậy các con số sau **chưa kiểm chứng được**, không được đưa vào thiết
kế như thể đã biết (AI Rules — không coi assumption là Production Data):

- Có bao nhiêu đơn thật, từ ngày nào (đồng bộ đã chạy được bao lâu).
- Tập giá trị `trang_thai` thật mà mỗi sàn trả về — **bắt buộc phải biết
  trước khi viết bộ lọc "đơn thành công"**, vì Shopee và TikTok dùng bộ
  trạng thái khác nhau.
- `san_pham_sku` thực tế điền được bao nhiêu %, bao nhiêu đơn nhiều SKU.

**Cần**: ERP Owner chạy `npx wrangler login` để mở lại quyền đọc.

## F. Rule D6 — câu hỏi phải trả lời trước khi code

1. **"Doanh thu" đo bằng thước nào?** Ba thước khác nhau, không được
   dùng chung 1 tên (Rule D4):
   - `gmv_dat_hang` — tổng giá trị đơn ĐẶT trong kỳ (kể cả sau này hủy/hoàn).
     Phản ánh sức bán, biết sớm nhất.
   - `doanh_thu_giao_thanh_cong` — chỉ đơn giao xong, trừ hủy và hoàn.
     Sát tiền thật hơn, nhưng trễ 1-2 tuần.
   - `tien_thuc_nhan` — sau phí sàn/voucher/ship. **Hiện chưa có dữ liệu**
     (mục C.2), cần gọi thêm API escrow mới làm được.
2. **Mục tiêu Shopee 120 tỷ/năm đang đếm bằng thước nào trong 3 cái trên?**
   Chốt sai thước thì cả dashboard lẫn KPI lệch nhau.
3. **Ai xem, bao lâu một lần, số xấu thì làm gì?** (Rule D6 nguyên văn.)
   Nếu câu trả lời là "Sếp xem mỗi sáng, thấy tụt thì hỏi ai đó" — cần
   biết *hỏi ai*, để thẻ cảnh báo gắn đúng người chịu trách nhiệm (Rule D1).
4. **So sánh với cái gì mới gọi là "giảm"?** Hôm qua / cùng kỳ tuần
   trước / trung bình 7 ngày. Không có mốc so sánh thì không có "bất
   thường", chỉ có số.

## G. Đề xuất triển khai theo giai đoạn

Không làm hết một lần, đúng tinh thần Constitution.

### Phase 3a — Nền dữ liệu (chặn trước, không có UI)
Tách bảng dòng hàng `don_hang_item` (order_sn, sku, tên, số lượng, đơn
giá), **backfill từ `du_lieu_json` đã có**. Không gọi lại API sàn, không
đụng `don_hang` cũ, không phá dữ liệu. Đây là điều kiện cần cho mọi phân
tích theo SKU.
→ Boundary: `CORE_CHANGE` (thêm entity vào vùng Order) — **cần ERP Owner duyệt**.

### Phase 3b — Sửa metric + chốt định nghĩa
Sửa `kdTongQuanDoanhThu` theo thước đo Sếp chốt ở mục F, cập nhật
`docs/METRIC-DEFINITIONS.md` TRƯỚC khi đổi code (đúng thứ tự Rule D4).

### Phase 3c — Tổng quan 2 sàn (UI)
Chỉ sau khi 3a+3b xong. Nội dung bám Rule D1/D3 (Exception First):
so sánh kỳ, tách theo sàn, top SKU tăng/giảm mạnh nhất, tỉ lệ hủy theo
lý do — mỗi thẻ bấm được về danh sách đơn lọc sẵn (Rule D5).

### Chưa đưa vào phạm vi
Lợi nhuận gộp (thiếu giá vốn theo đơn), tiền thực nhận (thiếu escrow),
traffic/quảng cáo (không có nguồn). Ghi rõ để không hứa nhầm.

## H. Kết luận

Chưa đủ điều kiện code Phase 3c. Có **2 việc làm được ngay không cần chờ
ai**: lỗi #1 (đã sửa) và viết tài liệu này. Hai việc còn lại chờ ERP
Owner: mở lại quyền đọc production (mục E) và chốt định nghĩa doanh thu
(mục F).

---

## CẬP NHẬT SAU KHI ERP OWNER CHỐT + TRIỂN KHAI (06/09/2026)

ERP Owner đã trả lời 2 câu chốt của mục F và giao thêm yêu cầu "hiển thị cả
10 SKU bán chạy và 10 SKU bán kém nhất toàn công ty".

**Thước đo doanh thu — chốt (nguyên văn):** *"Tổng đơn đặt sau khi trừ hoàn
hủy, khi nào phát sinh hoàn hủy thực thì trừ, nếu đơn đã đặt đang trên đường
giao vẫn ghi nhận doanh thu tạm tính trong kỳ."* → metric
`doanh_thu_tam_tinh`, xem `docs/METRIC-DEFINITIONS.md`.

**Mục đích (Rule D6) — chốt:** xem tổng tình hình kinh doanh toàn công ty,
phát hiện sụt giảm bất thường theo kênh, và biết kênh nào hiệu quả.

### Đã triển khai

| Hạng mục | Trạng thái |
|---|---|
| Metric `doanh_thu_tam_tinh` / `gmv_dat_hang` / `tien_huy` / `tien_hoan` / `ty_le_huy_hoan` / `doanh_thu_sku` | Ghi định nghĩa TRƯỚC khi code (đúng thứ tự Rule D4) |
| API `GET /api/kinh-doanh/tong-quan-kenh` | Mới — tách theo sàn, so kỳ trước, kèm khối chẩn đoán trạng thái |
| API `GET /api/kinh-doanh/xep-hang-sku` | Mới — 10 SKU bán chạy + 10 bán kém |
| API `POST /api/kinh-doanh/tach-dong-hang` | Mới — bóc bù dòng hàng, chỉ Admin |
| Bảng `don_hang_item` + migration `them-donhang-dong.sql` | Phase 3a — bóc từ `du_lieu_json` sẵn có, KHÔNG gọi lại API sàn |
| Bộ tách dòng hàng `src/don-hang-item.js` | Dùng chung cho cả đồng bộ mới lẫn bóc bù (Rule 5) |
| Ghi dòng hàng khi đồng bộ | `shopee.js` + `tiktok.js` — đơn mới về là có SKU ngay |
| Giao diện Tổng quan 2 sàn + xếp hạng SKU | Tab Kinh doanh, đặt ngoài thanh chuyển màn (toàn công ty) |
| Home CEO | Thẻ doanh thu sống lại, đúng đơn vị, có % so hôm qua, bấm được |
| API cũ `kdTongQuanDoanhThu` | **Đã xoá** — định nghĩa lệch tài liệu, thay bằng API mới |

### Lỗi bắt được nhờ chạy thử (chưa từng lên production)

1. **So sánh "kỳ trước" tính sai.** Cách đầu tiên tôi viết là "cửa sổ liền
   trước cùng độ dài" — lúc 9h sáng thì "kỳ trước" của hôm nay hoá ra là 9
   tiếng CUỐI ngày hôm qua, khung giờ mua hàng khác hẳn. Đã đổi sang dịch lùi
   1 bước tự nhiên của kỳ (hôm qua đúng giờ này / 7 ngày liền trước / cùng kỳ
   tháng trước). Ghi vào METRIC-DEFINITIONS.md kèm lý do để không ai sửa ngược.
2. **Xếp hạng SKU đang tính cả đơn đã hủy** trong khi doanh thu tạm tính thì
   trừ — cùng màn hình, hai cách tính khác nhau (vi phạm D4). Test cho thấy
   một mã tụt từ hạng 2 xuống hạng 3 sau khi loại đơn hủy — đúng loại sai lệch
   dẫn tới quyết định đẩy/cắt hàng sai. Đã sửa bằng JOIN sang `don_hang`.

### Đã kiểm chứng thế nào

Trên **D1 local** với bộ dữ liệu mẫu dựng đúng các tình huống khó, đã xoá sạch
sau khi verify (Test Data Policy):

- Đơn Shopee nhiều mặt hàng → bóc đúng 2 dòng, tổng dòng khớp `tong_tien`.
- Đơn TikTok 3 `line_items` trong đó 2 cái cùng SKU → gộp đúng thành 2 dòng,
  số lượng 2 (khác biệt Shopee/TikTok dễ tính sai nhất).
- Đơn `CANCELLED` → bị trừ khỏi doanh thu VÀ bị loại khỏi xếp hạng SKU.
- Đơn hoàn `ACCEPTED` → trừ; `REQUESTED` → KHÔNG trừ (đúng chữ "hoàn thực").
- Trạng thái hoàn lạ `TRANG_THAI_LA` → không trừ âm thầm, đẩy lên cảnh báo.
- Mã hàng bán 0 cái → vẫn hiện trong "bán kém nhất" (đúng yêu cầu).
- SKU có trên sàn nhưng không có trong kho → tách riêng, không gộp vào bảng.
- Đối chiếu tổng dòng hàng với tổng tiền đơn: 6/6 đơn khớp, 0 đơn lệch.

### 7. Mở bằng trình duyệt thật (06/09/2026) — bắt thêm 2 lỗi

Dựng lại nhánh trên nền `origin/main` mới nhất, chạy `wrangler dev`, nạp 400
đơn thật (bản sao chỉ-đọc) vào D1 local, đăng nhập bằng tài khoản thử rồi mở
tab Kinh doanh. Đã xoá sạch tài khoản thử + dữ liệu sau khi xem.

1. 🔴 **Cả khối Tổng quan chết câm.** `SUT_TONG_PCT`/`SUT_SAN_PCT`/`TEN_SAN`
   khai báo `const` ở phạm vi module, nhưng khối bootstrap tab Kinh doanh nằm
   TRƯỚC chúng trong `app.js` → `ReferenceError: Cannot access 'TEN_SAN'
   before initialization`. Thẻ vẫn hiện (vẽ trước), nhưng bảng theo sàn TRỐNG
   và mọi cảnh báo im lặng. Đây là loại lỗi chỉ trình duyệt mới lộ —
   `node --check` không bắt được. Sửa: đưa cả 3 hằng số vào TRONG hàm.
2. 🟠 **Nút chọn kỳ chỉ cao 36px** ở 375px — dưới ngưỡng 44px mà dự án vừa
   chuẩn hoá (xem CHANGELOG 04/09: `.combo1-hienthi` và `.ql-goiy-item` đều
   đã nống lên 44px). Nống trong phạm vi `#kd-tq-ky`, KHÔNG sửa `.seg-nut`
   dùng chung.
   **Ghi nhận cho ERP Owner**: `.seg-nut` dùng chung (Kho vận · Công việc ·
   Kinh doanh…) vẫn đang 36px ở mọi nơi khác — sửa toàn cục là Core UI, cần
   duyệt riêng, không tự làm trong đợt này.

**Đã xác nhận bằng mắt trên trình duyệt:**

- 2 panel hiện đúng vị trí, ngoài thanh chuyển màn của tab Kinh doanh.
- Bảng theo sàn ra đúng 2 dòng Shopee / TikTok Shop.
- Đổi kỳ (Hôm nay → 30 ngày) thì CẢ HAI khối tải lại đồng bộ, không lệch kỳ.
- Cảnh báo "Mất 10% giá trị đơn vì hủy và hoàn" bật đúng.
- Cảnh báo "Danh mục sản phẩm trong Kho vận đang trống" bật đúng — khớp hiện
  trạng production thật.
- Cột "So kỳ trước" hiện "—" kèm lý do khi thiếu dữ liệu, không bịa %.
- Nút bóc bù chạy 4 lô × 100 đơn → 614 dòng hàng, 1 dòng thiếu SKU, 0 dòng
  không đọc được.
- **375px (điện thoại): trang KHÔNG tràn ngang**, bảng tự cuộn trong khung,
  2 bảng SKU xếp chồng, nút chọn kỳ 44px.

### CÒN LẠI — chưa làm được, cần ERP Owner

1. **Chưa đối chiếu với dữ liệu production** (token Cloudflare bị từ chối,
   mục E). Hai thứ phải xác nhận bằng dữ liệu thật trước khi coi là OFFICIAL:
   - Tập trạng thái đơn hoàn thật của mỗi sàn, so với hằng số `HOAN_THAT` /
     `HOAN_CHUA_TINH` trong `src/index.js`. Màn hình tự cảnh báo nếu gặp
     trạng thái lạ — cứ mở lên xem có cảnh báo không là biết.
   - Cấu trúc `item_list`/`line_items` thật, qua chỉ số "đơn lệch tổng tiền"
     mà bước bóc bù trả về.
2. **Phải chạy migration trên production** sau khi deploy:
   `node scripts/chay-migration.mjs them-donhang-dong.sql --remote`
   rồi bấm nút bóc bù trong cảnh báo ở khối Sản phẩm bán chạy/bán kém.
3. **Chưa có**: tiền thực nhận sau phí sàn (cần API escrow), lợi nhuận gộp
   (cần giá vốn theo đơn), traffic/quảng cáo (không có nguồn). Không hứa.

**Go-Live Level: PILOT** — chạy được, logic đã test, nhưng chưa soi bằng dữ
liệu thật lần nào.

---

## ĐỐI CHIẾU VỚI DỮ LIỆU PRODUCTION (06/09/2026) — mục E đã gỡ chặn

ERP Owner đã `wrangler login`. Toàn bộ phần dưới đọc trực tiếp từ D1
production, **chỉ SELECT, không ghi gì**. Bản sao dữ liệu lấy về máy đã xoá
sau khi verify.

### Quy mô dữ liệu thật

| | Số đơn | Từ ngày | Tới |
|---|---|---|---|
| Shopee | 20.818 | 03/08/2026 | 06/09/2026 |
| TikTok | 3.103 | 12/02/2026 | 06/09/2026 |

`don_hoan`: 69 đơn Shopee + 4 TikTok.

### 1. Tập trạng thái thật — `HOAN_THAT` đúng, phát hiện 1 trạng thái lạ

Đơn hàng: Shopee dùng `COMPLETED · TO_CONFIRM_RECEIVE · SHIPPED · CANCELLED ·
READY_TO_SHIP · UNPAID · TO_RETURN · PROCESSED · RETRY_SHIP`; TikTok dùng
`COMPLETED · DELIVERED · IN_TRANSIT · CANCELLED · AWAITING_SHIPMENT`.
→ Bộ lọc `trang_thai = 'CANCELLED'` **đúng cho cả hai sàn**.

Đơn hoàn: Shopee `ACCEPTED (35) · PROCESSING (24) · CANCELLED (8) ·
REQUESTED (2)` — khớp đúng phân loại đã đặt. TikTok có
**`BUYER_SHIPPED_ITEM` (4 đơn)** chưa nằm trong tập nào → đúng như thiết kế,
nó sẽ nổi lên cảnh báo thay vì bị bỏ qua âm thầm. Đã xếp vào `HOAN_CHUA_TINH`
(khách đã gửi hàng về nhưng chưa hoàn tất hoàn tiền — chưa phải "hoàn thực").

### 2. 🔴 Bộ tách dòng hàng ban đầu SAI — chỉ 30/150 đơn Shopee khớp

Giả định "lấy thẳng giá từng mặt hàng làm doanh thu SKU" sai với thực tế:

- **Shopee**: `model_discounted_price` mới chỉ trừ giảm giá của NGƯỜI BÁN.
  Voucher sàn nằm ở cấp ĐƠN, không chia về dòng. Đo trên 150 đơn thật: tổng
  giá dòng **cao hơn `total_amount` 16,4%**, 119/150 đơn lệch.
- **TikTok**: `sale_price` cộng lại khớp `sub_total`, nhưng `total_amount`
  (thứ đang lưu vào `tong_tien`) còn **cộng cả phí ship** — đo thật: ship
  chiếm 0,9% tổng.

→ Nếu giữ nguyên, tổng doanh thu theo SKU sẽ đá nhau với "Doanh thu tạm tính"
ngay trên cùng màn hình (vi phạm D4).

**Đã sửa**: chia `tong_tien` của đơn về các dòng **theo tỷ lệ giá trị dòng**.
Kết quả đối chiếu lại trên chính 300 đơn thật: **300/300 khớp TUYỆT ĐỐI**
(không phải "sai số dưới 1%" — bằng đúng từng đồng, dòng cuối nhận phần dư).
Giá niêm yết sau giảm của người bán vẫn giữ ở `don_gia` để tra khi cần.

Số liệu phụ đáng chú ý: **~22% đơn có nhiều hơn 1 mặt hàng** (39/150 Shopee,
26/150 TikTok). Đây chính là phần trước đây không quy được về SKU nào — xác
nhận bảng dòng hàng là cần thật, không phải làm cho đủ.

### 3. 🔴 `san_pham` trên production ĐANG TRỐNG — 0 dòng

`san_pham`, `giao_dich_kho`, `lo_hang`, `sku_map` đều 0 dòng: module Kho vận
chưa nhập liệu. Thiết kế ban đầu xếp hạng trên danh mục kho sẽ ra **bảng rỗng**.

**Đã sửa**: tự chuyển sang xếp hạng trên chính các SKU đã bán khi danh mục
trống, và **hiện cảnh báo rõ** là đang ở chế độ hạn chế. Hệ quả còn lại phải
nói thẳng với ERP Owner: **"10 SKU bán kém nhất" hiện chưa đúng nghĩa** — nó
chỉ xếp được trong số mã ĐÃ bán, còn mã đang kinh doanh mà bán được 0 cái
(nhóm cần xử lý nhất) thì không có gì để hiện. Muốn đủ phải nhập danh mục
sản phẩm vào Kho vận.

### 4. 🟠 So sánh "kỳ trước" rơi vào khoảng chưa đồng bộ

Xem "Tháng này", cùng kỳ tháng trước của Shopee chỉ có **1 đơn** — vì đồng bộ
Shopee mới chạy từ 03/08. Chia ra sẽ thành "+335.000%".

**Đã sửa**: API trả `truoc_du_du_lieu` theo từng sàn (so mốc đơn sớm nhất với
đầu kỳ trước). Không đủ dữ liệu thì hiện "—" kèm lý do, và **tắt luôn mọi
cảnh báo sụt giảm** của sàn đó — báo động giả còn tệ hơn không báo.

### 5. Chạy thử công thức doanh thu trên production

| Kỳ | Sàn | Đơn | GMV | Hủy | Hoàn | **Doanh thu tạm tính** |
|---|---|---|---|---|---|---|
| Hôm nay | Shopee | 185 | 28.461.306 | 2.945.727 | 0 | **25.515.579** |
| Hôm nay | TikTok | 19 | 2.393.036 | 145.636 | 0 | **2.247.400** |
| Hôm qua cùng giờ | Shopee | 174 | 28.880.896 | 2.638.550 | 0 | **26.242.346** |
| Hôm qua cùng giờ | TikTok | 21 | 1.996.129 | 229.920 | 0 | **1.766.209** |
| Tháng này (1-6/9) | Shopee | 5.760 | 884.410.410 | 91.664.822 | 1.331.740 | **791.413.848** |
| Tháng này (1-6/9) | TikTok | 372 | 46.526.926 | 3.566.350 | 0 | **42.960.576** |

**Kiểm tra tính hợp lý**: 834 triệu trong 6 ngày → ~139 triệu/ngày → ~4,2
tỷ/tháng → **~50 tỷ/năm**, khớp đúng quy mô doanh thu ERP Owner đã khai
(50–70 tỷ/năm). Công thức không cho ra số vô lý.

**Phát hiện nghiệp vụ đáng chú ý**: tỷ lệ hủy Shopee tháng này là
**91,7tr/884tr = 10,4% giá trị đơn đặt**. Ngưỡng cảnh báo đang để 10% nên
khối này sẽ bật cảnh báo ngay khi mở — đúng ý đồ, nhưng ERP Owner nên xác
nhận 10% có phải mức bình thường của ngành không, để chỉnh `SUT_*`/ngưỡng.

### 6. Xếp hạng SKU chạy thật (300 đơn thật, nạp vào D1 local rồi xoá)

Top 3: `OF-GAO-LUTDEN-1KG-TUI` (38 sp, 2.394.355đ) ·
`8936079561963` Dầu dừa Vietcoco (6 sp, 1.350.070đ) ·
`OF-BUN-GLDO-500G-TUI` (16 sp, 1.016.050đ). Ra đúng tên hàng thật của công ty.

### CÒN LẠI

1. **Chưa mở bằng trình duyệt thật** — logic + SQL đã chạy trên dữ liệu thật,
   nhưng giao diện chưa được nhìn tận mắt lần nào. Cần deploy rồi mở xem.
2. **`tong_tien` của TikTok gồm phí ship, Shopee thì không** (đo được: ship
   chiếm 0,9%). Hai sàn đang không hoàn toàn cùng thước. TikTok có sẵn
   `payment.sub_total` (tiền hàng thuần) để sửa cho đồng nhất, backfill được
   từ `du_lieu_json`. Đây là `INTEGRATION_CHANGE` + đổi ý nghĩa số đã lưu của
   3.103 đơn → **chờ ERP Owner quyết**, chưa tự sửa.
3. **Nhập danh mục sản phẩm** vào Kho vận để "bán kém nhất" đúng nghĩa (mục 3).
