# ADR-0016 — Một vị trí công việc mỗi tài khoản (và những gì cần biết khi mở lên nhiều)

- **Ngày:** 2026-09-04
- **Trạng thái:** ĐÃ CHỐT cho bản hiện tại — mở lên nhiều vị trí là nhánh kế tiếp
- **Liên quan:** REV-0058, `src/quyen.js` (khối "HAI Ô"),
  `migrations/them-vi-tri-cong-viec.sql`, `scripts/do-tach-vai-tro.mjs`

## Bối cảnh

Sếp Bùi Thị Ngọc chốt 04/09/2026: *"gộp 2 vai trò như này ko biết phân quyền
kiểu gì nhé, tách ra 2 vai trò đi"*. Đã tách `tai_khoan.vai_tro` (ô 1 — vai trò
hệ thống) khỏi `tai_khoan.vi_tri_cong_viec` (ô 2 — vị trí công việc), quyền
cuối cùng = HỢP hai ô.

Ô 2 chứa **đúng một** vị trí. Câu hỏi đặt ra ngay trong lúc soi: có nên làm
nhiều vị trí (bảng nối `tai_khoan_vi_tri`) **ngay trong bản này** không?

## Quyết định

**Không. Giữ một vị trí, gộp bản này. Nhiều vị trí làm ở nhánh kế tiếp.**

Lý do là **số đo**, không phải cảm tính — Hồ Ly đo bán kính thiệt hại thật của
việc chỉ có một ô:

- **1 người, 2 tab.** Chỉ chị **Vũ Lan Hương** thiếu `kinhdoanh` + `donhoan`.
- Chị **Nguyễn Thị Huyền** *không mất gì*: `cskh` có bộ tab **y hệt**
  `van_hanh_san`, nên chọn vị trí nào cũng ra cùng một bộ quyền.
- Lập luận "làm hai lần thì hai lần rủi ro mất quyền" **không đứng được**:
  bảng nối là phép **cộng thuần** (~6 dòng backfill, **0 dòng `tai_khoan` bị
  sửa**), khác hẳn migration lần này *có* `UPDATE tai_khoan`.

Đổi lại, gộp sớm thì bốn người (Duy · Hằng · Huyền · Linh) mở được tab của
nghề mình ngay, thay vì chờ thêm một vòng.

## BA THỨ PHẢI MANG THEO KHI LÀM NHIỀU VỊ TRÍ

Ghi ở đây chứ không để trong báo cáo — báo cáo không ai đọc lại, tài liệu thì có.

### 1. Chốt "chỉ Admin trao vị trí có lương" CHỈ SỐNG NẾU KIỂM TỪNG PHẦN TỬ

Hôm nay `qtSuaVaiTro` kiểm một giá trị vô hướng:

```js
if (viTriMoi && !laAdmin(phien) && viTriCoXemLuong(viTriMoi)) return loi(..., 403);
```

Khi ô 2 thành **danh sách**, cách kiểm "lấy phần tử đầu" **lọt** — đo được:
HCNS gán `["cskh", "ke_toan_truong"]` thì
- cửa kiểm **phần tử đầu** → **200 (LỌT, HCNS lấy được quyền xem lương)**
- cửa kiểm **từng phần tử** → **403 (đúng)**

Phải là `viTriMoi.some(viTriCoXemLuong)`, và **mọi** chốt khác trong
`qtSuaVaiTro`/`qtTaoTaiKhoan` cũng vậy (`laViTriCongViec`, chốt tự-sửa-chính-mình).

⚠️ Nhãn **chính thức / tạm kiêm** làm lỗi này **DỄ MẮC HƠN**: lúc đó rất tự
nhiên viết `viTri.find(v => v.chinh_thuc)` rồi kiểm mỗi cái đó — và vị trí "tạm
kiêm" đi thẳng qua cổng. Nếu có nhãn thì chốt lương phải quét **cả hai loại**.

### 2. BA CHỖ SO VÔ HƯỚNG SẼ VỠ IM LẶNG

Ba chỗ này so `=== 'hcns'` / `!= 'nv_test'` với một giá trị đơn. Cột thành danh
sách thì chúng **không ném lỗi** — chúng chỉ lặng lẽ trả sai:

| Chỗ | Câu | Vỡ thành |
|---|---|---|
| `src/index.js:319` | `t.vi_tri_cong_viec != 'nv_test'` | tài khoản thử **lòi ra danh bạ chung** |
| `src/nhac-nhan-su.js:135` | `OR t.vi_tri_cong_viec = 'hcns'` | HCNS **không nhận** tin nhắc nhân sự nào |
| `src/nhac-nhan-su.js:145` | `x.vi_tri_cong_viec === 'hcns'` | như trên, ở tầng JS |

**Đã có sẵn hai ca đối chứng canh đúng hai chỗ này** trong
`scripts/do-tach-vai-tro.mjs` — **DC-G** (danh bạ) và **DC-H** (cron nhắc HCNS).
Quên sửa là bàn đo đỏ ngay, không phải phát hiện bằng mắt.

### 3. BỀ MẶT KIỂM THỬ ×16 — "LIỆT KÊ HẾT TỔ HỢP" KHÔNG CÒN KHẢ THI

Hôm nay: 3 vai trò hệ thống × 8 vị trí = **24 tổ hợp**, liệt kê hết được và bàn
đo đang làm đúng thế.

Với nhiều vị trí (tập con của 7 vị trí): 3 × 2⁷ = **384 tổ hợp**. Liệt kê hết là
hết đường.

Phải chuyển sang **soi theo TÍNH CHẤT**, không theo tổ hợp. Ba tính chất đủ mạnh
để thay cả 384 phép, và cả ba đã có sẵn dạng vô hướng trong bàn đo hiện tại:

1. **Đơn điệu** — thêm một vị trí thì bộ quyền chỉ **lớn lên hoặc giữ nguyên**,
   không bao giờ nhỏ đi (phép hợp chỉ CỘNG).
2. **Không đẻ ra quyền** — mọi quyền trong bộ hợp phải đến **từ ít nhất một**
   phần tử. Đây chính là phép "0/24 tổ hợp nguy hiểm" hôm nay, viết lại cho tập
   hợp bất kỳ.
3. **Ranh giới cứng bất biến** — với **mọi** tập con không chứa `admin`:
   HCNS không xem lương · quản lý kho không xem giấy nhân sự (CCCD) · nhân viên
   kho không xem giá vốn.

Ba tính chất này kiểm được bằng cách sinh tập con ngẫu nhiên (property-based),
không cần bảng 384 dòng.

## Hệ quả đã chấp nhận

- Chị **Vũ Lan Hương** tạm thời chỉ có **một** vị trí. Sếp chọn `hcns` hay
  `cskh`; chị **chờ nhánh nhiều-vị-trí** để có cả hai.
- File lùi `migrations/lui/lui-vi-tri-cong-viec.sql` đã ghi rõ ca không gộp
  ngược được (ô 1 mạnh hơn `nguoi_dung` thì mất ô 2) — nhánh sau đọc lại chỗ đó
  trước khi thiết kế bảng nối.
