# Handoff — SPEC-0007 Đợt 1 · Loại hình hợp đồng

**Request:** CTL-0015 · **Spec:** SPEC-0007 §3 và §4 · **Agent:** Khỉ Đột
**Nhánh:** `feature/spec-0007-dot1-hop-dong` (tách từ `origin/main` @ `b673d0e`)
**Trạng thái:** `READY_FOR_REVIEW` — chưa merge, chưa push, chưa deploy, chưa
chạy migration lên mây.

---

## Task

Chỉ Đợt 1: loại hình hợp đồng. **Không** làm sinh nhật (Đợt 2), **không** làm
JD (Đợt 3), **không** làm skill (Đợt 4), **không** dựng cơ chế nhắc hạn — nhắc
nối vào SPEC-0004, để đợt sau.

## What changed

1. **`khoan_viec` thêm vào `nhan_su.loai_lao_dong`** — `ban_thoi_gian`
   **giữ nguyên**. Hai thứ khác nhau về bản chất pháp lý: bán thời gian là
   hợp đồng lao động có đóng BHXH, khoán việc là hợp đồng dân sự không đóng.
   Xoá `ban_thoi_gian` là mất khả năng phân loại đúng (BH-32, BH-33).
2. **Bảng mới `hop_dong_lao_dong`** — loại · số HĐ · pháp nhân · ngày bắt đầu ·
   ngày hết hạn · `lan_thu` · `hieu_luc` · lý do ẩn · người tạo · thời điểm.
   Bảng riêng chứ không nhồi cột vào `nhan_su`: một người ký nhiều hợp đồng
   nối tiếp, mà thứ luật đòi chính là "đây là hợp đồng thứ mấy".
3. **Form nhập hợp đồng** trong hộp Hồ sơ nhân sự + bảng liệt kê các bản đã có.
4. **Một cột "Hợp đồng"** trên Danh sách nhân sự (loại + ngày hết hạn, tô màu
   khi còn ≤ 45 ngày / đã quá hạn). Ngày vào làm đã có sẵn cột bên cạnh.
5. **Lời nhắc tại chỗ khi chọn "Khoán"** — 4 điều kiện phải thoả, đặt ngay dưới
   ô vừa chọn, tông warn chứ không phải đỏ. Mục đích là chọn đúng, không doạ.
6. **Dải Exception-First** trên Danh sách nhân sự: "N/M người đang làm chưa có
   thông tin hợp đồng" + nút lọc ra đúng N người đó. Đủ 100% thì dải tự biến mất.

## Files

| File | Việc |
|---|---|
| `migrations/them-hopdong-laodong.sql` | **mới** — 1 bảng + 2 index, không đụng bảng nào đang có |
| `src/hopdong.js` | **mới** — danh sách · lưu · ẩn, kèm chặn cứng/mềm |
| `src/index.js` | `khoan_viec` vào `LOAI_LAO_DONG_HOP_LE` · `qtDanhSach` gắn HĐ mới nhất · 3 tuyến API |
| `src/dinh-danh.js` | tiền tố mã `04-` cho khoán việc |
| `public/assets/js/api.js` | 3 hàm gọi API |
| `public/app.html` | 3 ô chọn + cột + dải Exception + form hợp đồng |
| `public/assets/js/app.js` | nhãn dùng chung · lời nhắc · form · cột · bộ lọc |
| `public/assets/css/style.css` | `.hd-nhac` · `.ns-thieuhd` · `.hd-o` |

## Migrations

`migrations/them-hopdong-laodong.sql` — **CHƯA chạy máy, CHƯA chạy mây.**
Chạy mây bằng `node scripts/chay-migration.mjs migrations/them-hopdong-laodong.sql --remote`
**sau khi** review xong. Deploy code trước migration cũng không vỡ: mọi truy
vấn chạm bảng mới đều bọc `try/catch`, chưa có bảng thì cột hợp đồng để trống.

**Lùi được:** `DROP TABLE hop_dong_lao_dong;` + xoá dòng tương ứng trong
`schema_migrations`. Không `DROP` cột nào, không `UPDATE` một dòng dữ liệu cũ nào.

## ⚠️ Xác minh chốt chặn cơ học `src/ca.js` — Hồ Ly nói ĐÚNG

Đo bằng code thật, không đọc bằng mắt:

- `src/ca.js:228` (`dangKyCa`) — `loai_lao_dong='khoan_viec'` → **403** *"Chỉ nhân
  sự Part-time/Thời vụ mới tự đăng ký ca"*.
- `src/ca.js:311` (`maTranTuan`) — người khoán việc **không xuất hiện** trong ma
  trận Xếp ca của trưởng phòng.
- **Đối chứng (BH-16):** cùng đường code, đổi mỗi `loai_lao_dong` sang
  `ban_thoi_gian` → **qua được** cửa chặn đó (ngã ở bước sau: *"Thiếu ca muốn
  đăng ký"*), và **vẫn có mặt** trong ma trận. Chứng minh chốt chặn nằm đúng ở
  giá trị `loai_lao_dong`, không phải trùng hợp.

**Không sửa một dòng nào trong `src/ca.js`.** Chốt chặn vốn đã đúng.
Ý nghĩa pháp lý: đặt một người sang Khoán thì ERP **tự thôi sản xuất bằng
chứng** ngược lại tờ hợp đồng — không còn dòng xếp ca, không còn chấm công.
Đây là điều kiện ② trong 4 dòng nhắc, và hệ thống tự thoả nó.

## Decisions

1. **Trả 200 kèm `{ can_ly_do: true }` thay vì 4xx** khi chặn mềm — `goi()` ở
   `api.js` ném Error cho mọi mã != 2xx và chỉ đọc trường `loi`, trả 4xx là mất
   sạch danh sách cảnh báo trên giao diện. Nơi gọi kiểm `can_ly_do` **trước** `ok`.
2. **Một cột "Hợp đồng" gộp loại + hạn**, không tách hai cột — ERP chạy trên
   điện thoại, mỗi cột thêm là một lần phải kéo ngang.
3. **Cột và bộ lọc Hợp đồng chỉ mở cho Admin/HCNS** (`them_nhan_su`), đúng một
   cửa quyền với hồ sơ nhân sự. Không đổi `quyen.js`, không thêm bề mặt quyền.
4. **`lan_thu` chỉ đếm `xac_dinh_th` còn hiệu lực** — thử việc, không xác định
   thời hạn và khoán việc không nằm trong giới hạn 2 lần của Đ.20.
5. **Chặn cứng đúng một chỗ**: `xac_dinh_th` mà trống ngày hết hạn. Đó là thiếu
   dữ liệu, không phải bất đồng nghiệp vụ. Mọi thứ khác chặn mềm — hệ thống
   không được phủ quyết một văn bản Sếp đã ký ngoài đời.
6. **`nhan_su_khoan_viec` phải có trong `CAU_HINH_MA`** — xem Bài học đề xuất.

## Open questions

- **Câu 4 Mục 13 của spec vẫn chưa có lời đáp** (17 bạn part-time kho ký Khoán
  hay HĐLĐ bán thời gian). Đợt 1 chỉ dựng chỗ để ghi lại quyết định đó; quyết
  định vẫn là của Sếp.
- Chưa quyết mốc "sắp hết hạn" hiển thị (đang tạm 45 ngày, khớp mốc T-45 mà
  spec đặt cho phần nhắc ở đợt sau).

## Known bugs

Chưa phát hiện. Chưa chạy thử trên trình duyệt thật (chưa `wrangler dev`) —
mới kiểm ở mức mã và truy vấn.

## Tests

`22/22 đạt`, chạy code thật trên sqlite trong bộ nhớ (`node:sqlite`), không
đụng D1 máy/mây của ai. Mỗi nhóm đều có **ca đối chứng cố ý sai** (BH-16):
chốt chặn ca (4) · chặn cứng (3) · `lan_thu` + lần 3 (6) · mốc 36 tháng (2) ·
khoán việc & không xác định thời hạn (3) · ẩn không xoá + câu lấy HĐ mới nhất (4).
Thêm: `sinhMa` sinh mã cho cả 4 hình thức làm việc.

**Chưa test tay**: mở trình duyệt thật, dựng lại bảng trên điện thoại thật.

## Bài học đề xuất (chưa ghi vào `docs/BAI-HOC.md` — xem ghi chú cuối)

**Thêm một giá trị vào danh sách chọn không phải là thêm một dòng — grep xem
giá trị đó còn bị GHÉP vào khoá ở đâu.**
`src/index.js` sinh mã nhân sự bằng `sinhMa(env, 'nhan_su_' + loai_lao_dong)`.
Thêm `khoan_viec` vào ô chọn mà quên khai `nhan_su_khoan_viec` trong
`CAU_HINH_MA` (`src/dinh-danh.js`) thì **mọi lần Thêm nhân sự khoán việc đều
ném lỗi** — mà `grep 'khoan_viec'` **không bao giờ tìm ra chỗ đó**, vì khoá là
một chuỗi được ghép lúc chạy. → Thêm giá trị vào một cột thì grep **tên cột**,
không grep tên giá trị; và soi riêng những chỗ tên cột bị **nối chuỗi** thành
khoá tra bảng khác.

> Chưa ghi thẳng vào `docs/BAI-HOC.md`: file đó **đang có thay đổi chưa commit**
> ở cây làm việc chính (BH-32/BH-33 của Hồ Ly). Sửa từ nhánh này là chắc chắn
> đụng nhau (BH-15/BH-18, Rule 13). Người giữ file đó ghép vào làm BH-34.

## Next recommended step

1. Hồ Ly review (`REV-`), đặc biệt phần chặn mềm/cứng và ranh giới quyền.
2. Merge → deploy → chạy migration mây → HCNS nhập hợp đồng **song song** đợt
   ký lại đang diễn ra (đây là lý do Đợt 1 đứng trước Đợt 2).
3. Đợt 2 (sinh nhật + nhắc hạn hợp đồng nối vào SPEC-0004) — chỉ mở sau khi
   Đợt 1 có dữ liệu thật chảy vào.
