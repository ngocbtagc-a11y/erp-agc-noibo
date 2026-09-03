# HÀNG ĐỢI — làm theo đúng thứ tự này

> Sếp Ngọc: *"công việc xếp theo thứ tự, làm theo thứ tự, làm xong việc này sang
> việc kia, đừng có mà nghỉ giữa chừng."* · *"làm việc nào xong việc đấy đi,
> đừng có ôm 1 đống xong lại chả cái gì xong."* · *"xong hết thì tự đẩy đừng chờ."*

**Cập nhật 03/09/2026.**

---

## LUẬT

1. **Một việc xong HẲN mới sang việc sau.** "Xong hẳn" = **đã lên hệ thống thật
   + Gạo đã tự kiểm + đã báo Sếp**. "Code xong" chưa phải xong. "Soi xong" cũng chưa.
2. **Tối đa 3 Agent cùng lúc.** Mở 4 đã làm cháy hạn mức phiên (27/08).
3. **KHÔNG viết bản giao việc dài cho việc chưa tới lượt.**
4. **Không nghỉ giữa chừng.** Agent trả kết quả → xử ngay → giao việc kế tiếp ngay.
   **Chờ Agent không phải là nghỉ.**
5. Việc **đụng cùng file** thì xếp nối tiếp. ⚠️ **Kiểm worktree có ai đang làm
   trước khi giao** — 28/08 đã giao nhầm 2 phiên vào một thư mục.
6. **Nhờ Sếp thì vẫn nhờ, nhưng KHÔNG đứng chờ.** Quá 15 phút không trả lời →
   chuyển việc khác, nhắc lại **một lần** khi Sếp quay lại.
7. **Trước mỗi lần đẩy: chạy `npm run cong-khoi`. ĐỎ là KHÔNG ĐẨY.**
8. **Việc tay TRƯỚC, xây công cụ SAU.** Cái Sếp nhìn thấy phải đổi ngay hôm nay,
   dù cách làm có thô. Công cụ để lần sau khỏi làm tay.
9. **Sếp nhắc lần 2 → việc đó lên ĐẦU hàng đợi**, trên mọi thứ khác.

---

## ĐANG CHẠY — 03/09

| Việc | Nhánh · trạng thái |
|---|---|
| **Đọc chữ trong PDF scan + sửa được số hiệu & tên** | `feature/doc-chu-pdf-scan` @ `c6fc43c` · **đang soi** (REV-0055) |
| **Cắt khung văn bản kiểu CamScanner** | `feature/cat-khung-van-ban` @ `1468f33` · **đang soi** (REV-0056) |
| **Màn hình tự làm mới sau khi bấm** *(việc A Sếp giao)* | `fix/man-hinh-tu-lam-moi` · đang xây |

## ĐÃ LÊN HỆ THỐNG THẬT — 03/09

| Việc | Commit |
|---|---|
| **Đưa 4 file lùi ra `migrations/lui/`** — chặn máy nạp tự động chạy lệnh xoá | `175034e` |

Việc này **nặng hơn ghi chép cũ**. Sổ cũ ghi là "kẹt deploy vĩnh viễn"; đo lại
thì đó là **mất dữ liệu thật**: máy nạp tự động sẽ `DROP TABLE gop_y_lich_su`,
gỡ cột `duyet_gopy` của `tai_khoan`, gỡ 15 cột cổng duyệt của `gop_y`.
Sau khi dời: file `.sql` thẳng trong `migrations/` = 64, **file lùi = 0**.

## NHÁNH CHƯA ĐẨY CÒN TREO

| Nhánh | Còn vướng gì |
|---|---|
| `feature/tu-nap-db` | ✅ **Rào cản đã gỡ** (`175034e`). Còn: chạy tay `them-kho-tai-lieu.sql` trước khi gộp |
| `feature/gopy-tu-dong-xong` @ `292dddf` | Vá xong REV-0043, **chưa soi lại vòng 3** |
| `feature/ctl-0026-kho-tai-lieu` | Đã bị `doc-chu-pdf-scan` đi trước — cần rà xem còn gì chưa gộp |

## SẾP GIAO 29/08 — còn lại

| # | Việc | Nguyên văn Sếp |
|---|---|---|
| ~~A~~ | ~~Màn hình tự vẽ lại sau khi bấm~~ → **đang xây** | *"đã duyệt hoàn thành mà nó vẫn hiện ở đây"* |
| **B** | **Gộp "Việc cần làm / Việc phối hợp" vào Lịch sử làm việc** — một màn có bộ lọc *(Việc của tôi · Tôi phối hợp · Tôi giao · Toàn công ty)*. **GIỮ** bảng "Việc của tôi hôm nay". Nhánh có sẵn: `feature/gop-viec-vao-lichsu` | *"đoạn này bị thừa, tích hợp chung vào chỗ lịch sử làm việc là được"* |
| **C** | **56 loại thông báo còn im lặng** — ERP có **58 chỗ** tạo thông báo, **chỉ 2 chỗ** đẩy được lên điện thoại. Nhắc việc quá hạn · cảnh báo đơn hoàn · sắp hết hạn giấy tờ đều **chỉ nằm trong ERP**. Hạ tầng đẩy đã có, chỉ cần nối vào | *"2 yêu cầu này của cá nhân gửi nhưng đã check cho toàn bộ erp chưa"* |

## CHỜ ĐẾN LƯỢT — theo thứ tự

| # | Việc | Ghi chú |
|---|---|---|
| 1 | **Chuông đơn hoàn cho Shopee** | Chờ Sếp chốt trạng thái. **Ưu tiên cao nhất — tiền thật** |
| 2 | **Nhắc sắp hết hạn hợp đồng lao động** | Gạo đã hứa, chưa nối |
| 3 | **GY-0004 "Lỗi số năm chỗ ngày sinh"** | **Góp ý của chính Sếp**, chưa đụng tới |
| 4 | **Runner tự động** — 4 lỗ CAO chưa vá | Có lỗ *Sếp bấm dừng mà máy tự bật lại* |
| 5 | Vinh danh: mở lại sửa **chính tả** sau 24h | Gõ sai tên = lời khen sai nằm vĩnh viễn |
| 6 | Chat: tìm kiếm · nhóm · ghim tin · vuốt về danh sách | Đợt 2 |
| 7 | Tài sản gộp bộ + kiểm kê *(CTL-0019)* | Việc lớn |
| 8 | Cột hiển thị cho mọi tab *(CTL-0020)* | |
| 9 | Săn code chết, ngân sách kích thước *(CTL-0021)* | |
| 10 | 2 lỗ bảo mật đính kèm *(CTL-0010B)* | |
| 11 | Chuyển repo sang ổ D *(CTL-0018)* | Cần hàng đợi trống |
| 12 | Gộp 3 hàm nén ảnh *(CTL-0010A)* | Nợ kỹ thuật |

## CHỜ SẾP QUYẾT — không chặn việc nào

| Câu hỏi | Vì sao cần |
|---|---|
| **Trạng thái Shopee nào là "khách đã gửi hàng về"?** | Chuông đơn hoàn quá hạn **CHƯA TỪNG kêu cho đơn Shopee** — kênh bán chính. **Tiền thật.** |
| **Nâng vai trò anh Duy + chị Hương** | Hai người **không mở được tab mình phụ trách**; tính năng xây xong mà người cần dùng đứng ngoài cửa |
| **Mở kênh Telegram riêng** *(2 phút)* | Mở đường khôi phục tài khoản khi Sếp quên mật khẩu |

## NỢ ĐÃ BIẾT, CHƯA XẾP LỊCH

- **22 bảng còn tràn @375px** — cần Sếp chốt một lượt: mỗi bảng chọn 3–4 trường
  lên thẻ *(~2–3 ngày)*
- **Quản lý cấp trên không thấy nút Sửa mục tiêu** — máy chủ cho, giao diện chặn
  *(REV-0053 #1)*
- `do-quyen-duyet-gopy` **183/9** — 9 lỗi môi trường: bàn đo thêm cột đã có sẵn
  trong D1 máy. Có sẵn trên `main`, không phải lỗi mã sản phẩm.
- `do-cat-im-lang` đỏ ở nhánh kho tài liệu — `nhatKyTaiLieu()` `LIMIT 200`
- `chatDanhSach` 50 tin, chưa cuộn ngược thật *(~1 buổi)*
- Sổ của mục tiêu (L9) ghi được nhưng **giao diện chưa gọi** → mã chết
- `do-nut-thongbao-44px.mjs` cần chuyển sang khuôn `ban-do-chrome.mjs`
- Worktree mới **thiếu `node_modules`** → nhiều bàn đo báo đỏ oan. Cách vá:
  `cmd /c "mklink /J node_modules C:\Users\Admin\Desktop\AI\crm-agc\node_modules"`

---

## TÀI LIỆU LUẬT

`docs/BANG-MAU.md` *(luật ba màu)* · `docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md`
*(góp ý là triệu chứng)* · **`docs/HANG-DOI.md` (file này)** — 03/09 đã đưa vào
repo, trước đó nằm ngoài repo mà vẫn được trích dẫn khắp nơi.
