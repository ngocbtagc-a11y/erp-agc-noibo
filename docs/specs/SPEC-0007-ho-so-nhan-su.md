# SPEC-0007 — Hồ sơ nhân sự: hợp đồng · sinh nhật · JD · skill

- **Nguồn**: [CTL-0015](../requests/CTL-0015-ho-so-nhan-su-chuyen-nghiep.md) · ERP Owner 2026-08-27 · **Tác giả**: HỒ LY
- **Status**: `READY_FOR_OWNER` (4 câu ở Mục 13) · **Risk**: **MEDIUM–HIGH** — chạm nghĩa vụ BHXH. Không đổi bảng vai trò.

## 1. Ba điều Gạo chưa thấy lúc audit

**1.1 `nhan_su.loai_lao_dong` ĐÃ CÓ** (`migrations/them-dangky-ca.sql:19`): `toan_thoi_gian|ban_thoi_gian|thoi_vu`, `src/ca.js` dùng thật. Hệ thống có **hai** trục, thiếu **trục thứ ba** — ba thứ khác hẳn nhau, UI phải để **ba nhãn riêng**:

| Trục | Cột | Trả lời | |
|---|---|---|---|
| Tình trạng ký | `nhan_su.trang_thai` | Đã ký chưa? | ✅ |
| Hình thức làm | `nhan_su.loai_lao_dong` | Toàn/bán thời gian/thời vụ? | ✅ |
| **Loại hợp đồng** | — | Xác định hay không xác định thời hạn? Hết hạn ngày nào? Lần thứ mấy? | ❌ |

**1.2 `so_cccd`, `so_bhxh`, `anh_cccd` là cột GHI-MỘT-CHIỀU.** `src/nhansu.js:130` ghi lúc thêm người; quét `src/`+`public/` **không có một `SELECT` nào** đọc ra, không endpoint xem ảnh. `anh_cccd` khai "khoá ảnh R2" mà R2 **không bật** (ADR-0011 B1) → giá trị vô nghĩa. Spec này **cố ý không mở đường đọc**: mở là tăng bề mặt rủi ro cho việc không ai xin. Mở phiếu riêng, không im lặng bỏ qua (BH-29).

**1.3 Bẫy thứ hai của `ngay_sinh`**: người sinh **29/02** chỉ khớp `strftime('%m-%d')` vào năm nhuận → **4 năm mới được chúc một lần**. Xử ở Mục 5.

## 2. Chiếu theo luật *(tra 27/08/2026, dẫn nguồn — không viết theo trí nhớ)*

| Văn bản | Hiệu lực | Điều khoản dùng ở đây |
|---|---|---|
| [BLLĐ 2019 — 45/2019/QH14](https://thuvienphapluat.vn/lao-dong-tien-luong/hop-dong-lao-dong-co-ten-goi-khac-hay-khong-29394.html) | 01/01/2021 | Đ.13 k.1 · Đ.20 (2 loại HĐ, xác định ≤36 tháng, ký tối đa 2 lần) · Đ.32 (làm không trọn thời gian) |
| [Luật BHXH 2024 — 41/2024/QH15](https://xaydungchinhsach.chinhphu.vn/toan-van-luat-so-41-2024-qh15-bao-hiem-xa-hoi-119240723163650489.htm) | **01/07/2025** | Đ.2 — BHXH bắt buộc mở tới HĐ **từ đủ 1 tháng**, và tới **thoả thuận mang tên gọi khác** nếu có nội dung trả công + quản lý, điều hành, giám sát |
| [NĐ 158/2025/NĐ-CP](https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/luat-bao-hiem-xa-hoi-moi-nhat-2026-va-tong-hop-van-ban-huong-dan-20866.html) | 2025 | Hướng dẫn BHXH bắt buộc |
| [NĐ 274/2025/NĐ-CP](https://luatvietnam.vn/bao-hiem/diem-dang-chu-y-tai-nghi-dinh-274-2025-nd-cp-ve-cham-dong-tron-dong-bhxh-bat-buoc-563-104802-article.html) | **30/11/2025** | Chậm/trốn đóng: nộp thêm **0,03%/ngày**; quá **60 ngày** không khắc phục → chuyển thành **trốn đóng** |
| [NĐ 12/2022/NĐ-CP](https://easyhrm.vn/tin-tuc/hop-dong-khoan-viec/) | 2022 | Phạt hành chính 2–25 triệu tuỳ số người; trốn đóng đủ yếu tố → hình sự |

**Đang theo dõi, chưa thành luật**: dự án *Luật sửa đổi, bổ sung một số điều của Luật BHXH* dự kiến trình Quốc hội khoá XVI **năm 2026**. Không thiết kế theo dự thảo.

**Ba câu luật quyết định thiết kế này:**
1. HĐ xác định thời hạn **tối đa 36 tháng**, chỉ ký **2 lần liên tiếp**; lần 3 bắt buộc không xác định thời hạn. Hết hạn mà vẫn làm quá **30 ngày** không ký lại → luật tự coi là **không xác định thời hạn** (BLLĐ Đ.20).
2. **Tên hợp đồng không quyết định gì.** BLLĐ Đ.13 k.1 và Luật BHXH 2024 Đ.2 dùng cùng một câu: thoả thuận **mang tên gọi khác** nhưng có **trả công + quản lý, điều hành, giám sát** thì vẫn là **quan hệ lao động**, vẫn **BHXH bắt buộc**.
3. Từ 01/07/2025 ngưỡng BHXH bắt buộc xuống **1 tháng** — nhóm parttime/thời vụ trước đây nằm ngoài thì nay phần lớn nằm trong.

## 3. ⚠️ "Khoán" — không phải đổi tên, là đổi loại quan hệ

Sếp yêu cầu thay *"parttime / bán thời gian"* thành *"Khoán"*. Làm được, nhưng phải làm đúng chỗ, vì **hai thứ này nằm trên hai trục khác nhau** (Mục 1.1):

| | Bán thời gian | Khoán việc |
|---|---|---|
| Bản chất | **Hợp đồng lao động**, chỉ là ít giờ hơn (BLLĐ Đ.32) | **Hợp đồng dân sự** — không phải HĐLĐ |
| Luật điều chỉnh | Bộ luật Lao động | Bộ luật Dân sự |
| BHXH bắt buộc | **Có** | Không — **nếu thực chất đúng là khoán** |
| Chấm công, xếp ca, quản giờ | Có | **Không được** |
| Trả lương | Theo tháng/giờ | Theo **kết quả công việc bàn giao** |

→ **Không gộp hai thứ này vào một danh sách chọn** — gộp chính là nguyên nhân phân loại sai. Thiết kế: `loai_lao_dong` giữ nguyên `ban_thoi_gian` **và thêm** `khoan_viec`; `hop_dong_lao_dong.loai` có `khoan_viec` là một loại riêng.

**Điểm quan trọng nhất của cả spec — chính ERP đang tạo bằng chứng chống lại công ty:** 17 parttime kho làm **theo ca do công ty xếp**, tại kho công ty, dưới quản lý anh Duy. `them-dangky-ca.sql`, `them-phan-bo-ca.sql`, `lich_lam_viec` **đang ghi lại toàn bộ**. Đó đúng là ba dấu hiệu luật đòi: trả công · quản lý · giám sát. Nếu ký "khoán" cho những người này thì **bảng xếp ca là thứ thanh tra đọc đầu tiên**, và nó nói ngược lại tờ hợp đồng. Hậu quả: truy đóng + **0,03%/ngày** (NĐ 274/2025) · quá 60 ngày thành **trốn đóng** · phạt 2–25 triệu (NĐ 12/2022) · rủi ro hình sự · tranh chấp khi nghỉ việc.

**Chốt chặn cơ học, không tốn dòng code nào**: `src/ca.js:228` và `:311` đã lọc trắng `IN ('ban_thoi_gian','thoi_vu')`. Đặt người khoán thành `loai_lao_dong='khoan_viec'` thì họ **tự động không đăng ký ca được** — hệ thống tự nhất quán với hợp đồng. Đây là điểm (e) Gạo dặn, và nó **đã sẵn có**, chỉ cần không phá.

**Chọn "Khoán" thì hiện tại chỗ 4 dòng** (nhắc, không doạ, không cản):
> Khoán việc là hợp đồng dân sự, không đóng BHXH. Chỉ đúng khi: ① trả theo **kết quả bàn giao**, không theo tháng · ② **không xếp ca, không chấm công** người này · ③ họ tự quyết làm lúc nào, ở đâu · ④ công việc có **điểm kết thúc rõ**. Thiếu một trong bốn thì đây là **hợp đồng lao động**, dù đặt tên gì.

**Ai thuộc loại nào là quyết định của Sếp**, không phải của tôi và không phải của máy — câu 4 Mục 13. Bốn dòng trên là tiêu chí để Sếp tự soi từng người.

## 4. Hợp đồng lao động

Bảng riêng, không nhồi cột vào `nhan_su`: một người có **nhiều** hợp đồng nối tiếp, mà mất lịch sử là mất đúng thứ luật đòi — **đây là hợp đồng thứ mấy**.

```sql
CREATE TABLE IF NOT EXISTS hop_dong_lao_dong (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_su_id TEXT NOT NULL REFERENCES nhan_su(id),
  loai TEXT NOT NULL,           -- thu_viec|xac_dinh_th|khong_xac_dinh_th|khoan_viec
  so_hd TEXT, phap_nhan TEXT,   -- 'cong_ty'|'hkd' — đang song song 2 pháp nhân
  ngay_bat_dau TEXT NOT NULL,
  ngay_het_han TEXT,            -- NULL khi không xác định thời hạn
  lan_thu   INTEGER NOT NULL DEFAULT 1,  -- máy tính, ô nhập CHỈ ĐỌC
  hieu_luc  INTEGER NOT NULL DEFAULT 1,  -- 0 = ẩn, KHÔNG xoá (Rule 10)
  ly_do_an TEXT, nguoi_tao_id TEXT REFERENCES nhan_su(id),
  tao_luc TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_hdld_ns  ON hop_dong_lao_dong (nhan_su_id, ngay_bat_dau DESC);
CREATE INDEX IF NOT EXISTS idx_hdld_han ON hop_dong_lao_dong (ngay_het_han) WHERE hieu_luc = 1;
```

`lan_thu` = số HĐ `xac_dinh_th` hiệu lực trước đó + 1, **máy tính lúc lưu**; gõ tay được thì con số căn cứ pháp lý mất giá trị. Mọi thêm/sửa/ẩn ghi một dòng `nhan_su_lich_su` (`loai_su_kien='hop_dong'`) — bảng sẵn có, không dựng bảng log mới.

| Điều kiện | Hành vi |
|---|---|
| `xac_dinh_th` và `lan_thu ≥ 3` | Cảnh báo đỏ (BLLĐ Đ.20: lần 3 phải là không xác định thời hạn) · **vẫn lưu được nếu gõ lý do** |
| Thời hạn > **36 tháng** | Như trên |
| `xac_dinh_th` mà trống `ngay_het_han` | **Chặn cứng** |
| `khoan_viec` | Hiện 4 dòng ở Mục 3 · **vẫn lưu được** |

Chặn mềm chứ không cứng: hệ thống không được tự cho mình quyền phủ quyết một văn bản Sếp đã ký ngoài đời. Việc của nó là **không để ai vi phạm mà không biết** — bắt gõ lý do là đủ, và lý do đó vào `nhan_su_lich_su` làm bằng chứng.

**Nhắc trước hạn — nối SPEC-0004, không dựng cơ chế thứ hai.** Cùng cron `*/5`, cùng `guiThongBao()`, khung 8h–18h, **không gửi Chủ nhật** (ADR-0013), chống trùng bằng chính bảng `thong_bao` (`loai='ns_hopdong'` + `date(tao_luc)`), trần 40 tin/lượt, **không thêm cột cờ**. Mốc: **T-45 · T-15 · T-3** → HCNS + quản lý trực tiếp (`nguoiDuyetCap1()`); **D+1 · D+3 · D+7 · D+14 · D+21 · D+25** → HCNS, từ D+7 thêm Sếp.

D+25 là mốc cuối — hữu hạn, đúng chốt 3 SPEC-0004. Nhưng nhắc dày sau hạn là **ngoại lệ có chủ đích**: quá 30 ngày thì luật tự đổi loại hợp đồng và **không đảo ngược được**. Gộp theo chốt 1: HCNS nhận **một** tin/ngày cho mọi việc nhân sự, không mỗi HĐ một tin.

## 5. Nhắc sinh nhật

**Bỏ hẳn con số 30 — dùng "cửa sổ 5 ngày cuối tháng".** Điều kiện gửi bản tin *"Sinh nhật tháng sau"*: ① hôm nay trong **5 ngày cuối tháng** ② không Chủ nhật, trong 8h–18h ③ `thong_bao` chưa có dòng `loai='ns_sinhnhat_thang'` **trong tháng dương lịch này**. Bắn ở ngày đầu tiên đủ cả ba → đúng **một lần/tháng, mọi tháng**; tháng 2 chạy y hệt tháng 31 ngày. Không thêm cột trạng thái: `thong_bao` tự nó là sổ "đã gửi", đúng khuôn SPEC-0004. Cron chạy lại, deploy giữa chừng, lỡ một lượt — vẫn đúng.

*Vì sao không "ngày cuối tháng": rơi Chủ nhật ~1/7 số tháng → SPEC-0004 cấm gửi → mất trắng tháng đó. Vì sao không 28: tháng 2 thì 28 là ngày cuối, gửi trễ hơn các tháng khác.*

**Ngày sinh nhật thật**: khớp `strftime('%m-%d', ngay_sinh)`, **bắt buộc `dang_lam=1`** — người đã nghỉ không bao giờ nhận. **29/02**: năm không nhuận thì ngày 28/02 nhận cả `'02-28'` lẫn `'02-29'`. Gửi **hai người**: chính chủ + quản lý trực tiếp. **Không bắn cả công ty** — 20 người × 20 lần/năm là tiếng ồn nền, đúng thứ làm người ta tắt chuông. Chống trùng: `loai='ns_sinhnhat'` + `date(tao_luc)`. Công tắc riêng tư `nhan_su.cong_khai_sinh_nhat` — mặc định là **câu 1 Mục 13**. Bản tin tháng của HCNS **không** chịu công tắc này (dữ liệu vận hành, HCNS vốn xem được hồ sơ).

## 6. Mô tả công việc — gắn theo CHỨC DANH, không theo người

20 người nhưng ~8 chức danh → giảm khối lượng **2,5 lần**, và JD vốn thuộc về **vị trí**. Bảng `mo_ta_cong_viec`: `id` · `chuc_danh_id → chuc_danh(id)` · `nhan_su_id` *(chỉ cho phần kiêm nhiệm riêng)* · **`dau_ra TEXT NOT NULL`** *(danh từ: thứ bàn giao được)* · **`do_bang TEXT NOT NULL`** *(đo thế nào là đạt)* · `nhip` *(ngay|tuan|thang|quy)* · `thu_tu` · `hieu_luc` · `tao_luc`.

**Chỗ ép outcome nằm ở `do_bang NOT NULL`** — không lưu được nếu bỏ trống. Đó là toàn bộ cơ chế: không thể viết *"quản lý kho"* rồi bấm Lưu, vì phải điền "đo bằng gì", và lúc đó người viết tự thấy câu mình vừa viết không đo được. Thêm **cảnh báo mềm** khi `dau_ra` mở đầu bằng *quản lý · theo dõi · hỗ trợ · phối hợp · thực hiện · đảm bảo*: *"Đây là hoạt động, chưa phải đầu ra."* Chỉ nhắc — tiếng Việt không đủ tin cậy để chặn cứng.

**4 mẫu điền sẵn bắt buộc có** (kho · kế toán · HCNS · vận hành sàn); không có mẫu thì tính năng chết tuần đầu. Mẫu HCNS — dùng luôn cho Vũ Lan Hương, đúng chỗ Sếp đang vướng:

| Đầu ra | Đo bằng | Nhịp |
|---|---|---|
| Bảng công tháng đã chốt | Gửi kế toán trước ngày 3, không phải sửa lại sau khi gửi | tháng |
| Hồ sơ nhân sự đầy đủ | 100% người đang làm có hợp đồng hiệu lực trong ERP | tháng |
| Nhân sự mới đủ giấy tờ trong 7 ngày | Số người quá 7 ngày còn thiếu = 0 | tuần |

Bốn mẫu do Sếp và quản lý mảng duyệt trước khi vào hệ thống — **không** để Agent bịa đầu ra cho vị trí thật. **Nối Trạm Mục Tiêu**: có, nhưng đợt sau — một cột `cong_viec.jd_dau_ra_id`; `cong_viec` đang là vùng cấm Rule 13 → khai trước ở đây để sau không ai thiết kế lại, **không đụng vào đợt này**. JD **công khai toàn công ty** — MBOs mà giấu đầu ra của nhau thì không đối chiếu được.

## 7. Bộ skill — CHỈ CHO KHO, và chỉ khi qua cổng

**Đúng hai mục đích, cả hai đã có màn hình sẵn để cắm vào:** ① **xếp ca** (`src/ca.js`, tab `xepca` đang chạy) — vị trí ca có skill bắt buộc thì lọc ra ai đủ điều kiện ② **ai thay được khi có người nghỉ đột xuất**, và cảnh báo ngược: **skill chỉ một người biết** là điểm chết của kho — thứ anh Duy cần mà hôm nay chỉ nằm trong đầu anh ấy. **Cố ý loại**: "gợi ý người khi giao việc" — chạm `cong_viec` (Rule 13) và dễ trượt thành đo năng suất cá nhân (điều cấm 20).

**Quản lý trực tiếp tick**, một bước, không luồng duyệt. Nhân viên **không tự khai** — rác trong bảng xếp ca nghĩa là xếp nhầm người vào xe nâng. **Đúng hai mức**: `lam_duoc` / `day_duoc`. Không làm 4 mức: người chấm sẽ phân vân giữa "làm được" và "thành thạo", chấm không nhất quán giữa các quản lý, mà hai câu ta cần chỉ là *"xếp ca được không"* và *"có ai dạy lại được không"*.

**Danh mục cố định**, đúng khuôn Data Lock (`them-danhmuc-nen.sql` + `them-khoa-danhmuc-nen.sql`): `ky_nang(id, ten UNIQUE, nhom, hoat_dong, trang_thai DEFAULT 'nhap', tao_luc)` + `nhan_su_ky_nang(nhan_su_id, ky_nang_id, muc, nguoi_cham_id, luc, PRIMARY KEY(nhan_su_id, ky_nang_id))`. **Không có ô nhập tự do** — đó là thứ duy nhất ngăn `Excel`/`excel`/`MS Excel`.

**CỔNG MỞ ĐỢT 4**: sau Đợt 1 **30 ngày**, ≥ **90%** người `dang_lam=1` có hợp đồng hiệu lực trong ERP. Không đạt → **không làm skill**: hồ sơ chưa được duy trì thật thì kho skill sẽ rỗng y như Gạo dự đoán.

## 8. Màn hình

**Danh sách — đúng 4 cột**; ERP là PWA nên trên điện thoại là **thẻ 2 dòng**, không phải bảng cuộn ngang: ① Họ tên + mã NV ② Chức danh · Phòng ban ③ **Loại hợp đồng + ngày hết hạn** (badge: xám = không xác định thời hạn · **tím = khoán việc** · vàng = còn <45 ngày · đỏ = quá hạn · xám nhạt = *"chưa có hợp đồng trong ERP"*) ④ Ngày vào. Cột 5 trở đi để trong bộ lọc, không đưa lên mặt bảng.

**Hồ sơ một người — trần cứng 5 tab.** Phase 1 đã gộp Tài khoản/Vai trò/Lịch sử. Ba thứ mới **không đẻ thêm tab**: hợp đồng và skill vào **nhóm gập** trong tab hồ sơ; JD **chỉ đọc** theo chức danh (sửa ở Dữ liệu nền — sửa được ở đây thì mỗi người một bản JD, sai ngay mô hình Mục 6).

**Dải Exception-First đầu tab Nhân sự** — không có gì thì **dải biến mất**: HĐ quá hạn · sắp hết hạn <45 ngày · người đang làm chưa có HĐ trong ERP · **người ký khoán mà vẫn đang được xếp ca** *(mâu thuẫn Mục 3)* · sinh nhật tháng sau · (đợt 4) skill một người biết.

## 9. Human Cost (Rule 12) — trả lời dứt khoát

| Phần | Ai nhập | Tốn | Kết luận |
|---|---|---|---|
| **Hợp đồng** | HCNS (Vũ Lan Hương) | ~1 phút/người → **~20 phút một lần**, chỉ nhập lại khi ký mới | **KHẢ THI CAO** — công ty **đang** ký lại hàng loạt, giấy đang trên bàn |
| **JD** | Quản lý mảng **viết**, HCNS **gõ** | ~20 phút × 8 chức danh ≈ **3 giờ**, chia 3 người | **KHẢ THI CÓ ĐIỀU KIỆN** — chỉ khi có 4 mẫu điền sẵn |
| **Skill toàn công ty** | — | 20 người × ~15 skill = **300 ô**, phải cập nhật mãi | **KHÔNG KHẢ THI — không làm** |
| **Skill chỉ kho** | Anh Phạm Khương Duy | ~8 skill × 29 người, tick một buổi ≈ **40 phút** | **KHẢ THI** — anh Duy vốn đã biết ai làm được gì |

Cửa sổ cơ hội phần hợp đồng: nhập lúc đang ký tốn 20 phút; nhập ngược từ tủ hồ sơ sau khi ký xong hết thì tốn **hàng buổi** và sẽ có chỗ sai.
> Khi Hương điền xong hồ sơ đầu tiên, **ghi nhận công khai một câu ở buổi check-in thứ Tư 15h** — gắn vào quy trình để không phải nhớ.

## 10. Phân quyền — KHÔNG phải `CORE_CHANGE`

Không thêm vai trò, **không sửa `QUYEN_THEO_VAI_TRO`**. Chỉ thêm **một hàm mới** vào `src/quyen.js`: `duocXemHoSoNhanSu(vaiTro, muc, laChinhMinh)` — mở rộng, không đổi hành vi cũ. Áp nguyên tắc ADR-0011 A2 (**xem được bản ghi VÀ đủ mức nhạy cảm** — hai điều kiện):

| Mức | Trường | Ai xem |
|---|---|---|
| 1 · nội bộ | họ tên, chức danh, phòng ban, ngày vào, **JD**, skill | mọi vai trò |
| 2 · nhân sự | loại HĐ, ngày hết hạn, `lan_thu`, `ngay_sinh` | Hai Sếp · HCNS · quản lý trực tiếp |
| 3 · nhạy cảm | `so_cccd`, `so_bhxh` | Hai Sếp · HCNS — **đợt này không mở đường đọc** (Mục 1.2) |
| 3 · lương | `luong` | `duocXemLuong()` sẵn có — HCNS **KHÔNG**, ranh giới cứng |

**Giấy tờ của chính mình luôn xem được** (ADR-0011 A2). Anh Duy: mức 2 **chỉ với người trong phòng ban của anh**, không thấy CCCD/lương của ai.

## 11. Chia đợt — phản biện Mục 6 của Gạo: **đảo Đợt 1 và Đợt 2**

① Đợt 1 của Gạo có *"hiển thị loại hợp đồng"* nhưng **dữ liệu đó chưa tồn tại** — sẽ ra cột trống cho cả 20 người; người dùng mở ra thấy trống thì kết luận hệ thống hỏng, và niềm tin mất lần đầu là khó lấy lại nhất. ② "Rẻ nhất" không phải tiêu chí xếp thứ tự — tiêu chí là **cửa sổ cơ hội đóng lại lúc nào**. Sinh nhật tháng nào cũng như nhau; đợt ký lại Q3/2026 qua rồi là mất (Mục 9).

| Đợt | Nội dung |
|---|---|
| **1** | Bảng hợp đồng + form + 4 cảnh báo + cột danh sách + nhắc trước/quá hạn. Nhập **song song** đợt ký lại đang diễn ra |
| **2** | Sinh nhật + dải Exception-First. Rẻ, độc lập, không chờ dữ liệu ai |
| **3** | JD theo chức danh + 4 mẫu điền sẵn |
| **4** | Skill **chỉ kho** — **chỉ mở nếu qua cổng Mục 7** |

## 12. Acceptance Criteria *(rút gọn — bản đủ theo đợt)*

1. Ký `xac_dinh_th` lần 3 cho cùng người → cảnh báo đỏ, không lưu nếu trống lý do. **Đối chứng (BH-16)**: lần 2 → **không** cảnh báo.
2. Đồng hồ **26/02 năm không nhuận** → bản tin sinh nhật tháng 3 **có gửi**. **Đối chứng**: bản viết cứng ngày 30, cùng dữ liệu → **không** gửi.
3. `dang_lam=0` có sinh nhật hôm nay → **0 tin**. Đối chứng `dang_lam=1` → 1 tin.
4. Người sinh **29/02**, năm không nhuận → nhận lời chúc **28/02**.
5. Cron 12 lượt liên tiếp trong một giờ → đúng **1** tin/loại/người/ngày.
6. Đặt `loai_lao_dong='khoan_viec'` → người đó **không đăng ký ca được** (`src/ca.js`). Đối chứng: `ban_thoi_gian` → đăng ký được.
7. Vai trò `hcns` gọi API hồ sơ → **không** có `luong` trong JSON **trả về từ máy chủ** (không kiểm ở giao diện).
8. Lưu JD trống `do_bang` → **không lưu được**. Thêm skill: **không** ô nhập tự do nào.
9. Cron nhắc **không** ghi vào `nhan_su`/`cong_viec` — chỉ ghi `thong_bao`.
10. Chủ nhật + ngoài 8h–18h → **0 tin** (ADR-0013).

## 13. Bốn câu cần Sếp quyết

**Câu 1 — Lời chúc sinh nhật mặc định BẬT hay TẮT?** *(chỉ nhắn cho chính người đó và quản lý trực tiếp, không bắn cả công ty)* **A. Mặc định BẬT**, ai ngại thì tự tắt · B. Mặc định TẮT, ai muốn thì bật · C. Không gửi cho cá nhân, chỉ đưa danh sách cho HCNS tự đi chúc.
→ **Khuyến nghị A.** Chọn B thì gần như cả năm đầu không ai được chúc, tính năng trông như hỏng; rủi ro riêng tư thấp vì chỉ hai người biết.

**Câu 2 — Bảng "ai làm được việc gì": chỉ làm cho kho?** Cả công ty là 300 ô phải tick và cập nhật mãi; kho là ~40 phút của anh Duy và dùng được ngay vào xếp ca. **A. Chỉ kho, và chỉ làm sau khi hồ sơ hợp đồng đạt 90% (sau 30 ngày)** · B. Chỉ kho, làm luôn · C. Cả công ty.
→ **Khuyến nghị A.** Hợp đồng còn nhập không xong thì bảng skill chắc chắn bỏ hoang.

**Câu 3 — Ai viết mô tả công việc cho từng vị trí?** Máy không viết thay được. **A. Quản lý từng mảng viết (Sếp, anh Duy, chị Hằng), HCNS gõ vào** · B. HCNS viết hết rồi Sếp duyệt · C. Sếp viết hết.
→ **Khuyến nghị A.** Anh Duy là người duy nhất biết đầu ra thật của kho; và người viết ra đầu ra là người sẽ đi đòi đầu ra đó.

**Câu 4 — 17 bạn parttime ở kho: ký "Khoán" hay ký hợp đồng lao động bán thời gian?** Đây là câu tốn tiền nhất trong cả bản này, và **chỉ Sếp quyết được**, vì nó phụ thuộc công ty **thực tế** làm việc với các bạn thế nào. Soi theo 4 dòng ở Mục 3: nếu công ty xếp ca, chấm công, bảo có mặt lúc mấy giờ — thì đó **là** quan hệ lao động, dù tờ hợp đồng đề chữ gì, và phải đóng BHXH (Luật BHXH 2024 Đ.2, hiệu lực 01/07/2025).
**A. Giữ HĐLĐ bán thời gian cho cả 17 bạn** — đóng BHXH, tiếp tục xếp ca như hiện nay · **B. Chuyển sang Khoán** — thì phải **bỏ xếp ca và chấm công** với các bạn, trả theo kết quả bàn giao · **C. Soi từng người**: ai làm theo ca thì A, ai làm theo đầu việc rời (bốc dỡ chuyến hàng, đóng gói chiến dịch) thì B.
→ **Khuyến nghị C**, và trước khi ký nên hỏi một câu với luật sư/đại lý thuế: hiện trạng 17 bạn đang thuộc nhóm nào. Rủi ro nếu chọn B mà vẫn xếp ca: truy đóng BHXH + **0,03%/ngày** (NĐ 274/2025), quá 60 ngày thành **trốn đóng**, phạt 2–25 triệu (NĐ 12/2022) — và ERP **đang tự lưu bằng chứng** trong bảng xếp ca.

## 14. Boundary · phiếu con

`NEW_FEATURE` + `UX_IMPROVEMENT`. **Không** `CORE_CHANGE` (không đổi bảng vai trò), **không** `INTEGRATION_CHANGE` (không R2, không Telegram riêng, không Web Push). Chi phí **0** — dùng lại cron, `guiThongBao`, `thong_bao`, D1 sẵn có.

- **Phiếu riêng**: `so_cccd`/`so_bhxh`/`anh_cccd` là cột ghi-một-chiều, `anh_cccd` trỏ R2 đã chốt không bật (Mục 1.2) — mở đường đọc có kiểm quyền, hay bỏ cột?
- **Phiếu riêng**: `cong_viec.jd_dau_ra_id` — nối JD vào Trạm Mục Tiêu, mở khi hết Rule 13.
