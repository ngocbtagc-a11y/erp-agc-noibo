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

- ~~**22 bảng còn tràn @375px**~~ — **XONG 04/09/2026** (nhánh
  `fix/bang-vua-man-het-keo-ngang`). Đo lại bằng DỮ LIỆU THẬT thì con số còn
  tệ hơn sổ nợ ghi: **17/26 bảng tràn ngay ở 1440px**, 17/26 ở 1280px, 22/24 ở
  375px. Sau bản vá: **0 · 0 · 0**, trừ Đối soát sàn cố ý giữ kéo ngang ở màn
  rộng (lý do viết trong `BANG_GIU_CUON`, app.js). Không phải hỏi Sếp chọn cột:
  luật chọn là *"nhìn một dòng, người dùng cần quyết định điều gì?"* — cột
  không tham gia câu trả lời thì xuống mục "Chi tiết". Bàn đo:
  `npm run do-bang-that`.
- **`MOC_TRAN` từng là giấy phép tràn** — bài học 04/09/2026, ghi lại để đừng
  lặp: chốt kiểu *"đừng tệ hơn hôm qua"* là đúng ngay sau khi vá một lỗi, nhưng
  **nó phải có hạn dùng**. Để lâu là nó đổi vai từ cái SÀN thành cái MÁI: bàn đo
  in "42 ĐẠT · 0 TRƯỢT" trong khi ERP còn thanh kéo ngang, và người duy nhất
  phát hiện ra là Sếp — bằng ảnh chụp màn hình, lần thứ hai. Từ nay muốn miễn
  trừ thì phải viết LÝ DO bằng chữ, không được thêm một con số.
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

## NỢ MỚI GHI 04/09/2026 — cuối ngày

- **Không cổng nào đo 1024px** (máy tính bảng nằm ngang), trong khi luật CSS
  `@media (max-width:1100px)` lại **sinh ra từ chính số đo 1024** của bàn dò
  Hồ Ly. Đo được: bench xanh 75/0 mà thật ra tràn **+12px @1024**. Cây hôm nay
  sạch ở 1024. **Sửa: thêm `1024` vào `RONGS` — một dòng.** *(REV-0059 vòng 3)*
- `veTinhTrang` / `veBangDoiSoat` thiếu lớp chắn kiểu `co_bang` khi máy chủ trả
  thiếu khoá *(REV-0059 vòng 3, VỪA-2)*
- `do-bang-that --tu-kiem` khai 67/2, **đo được 73/2** — số ĐẠT là số cũ
- Trên thẻ, giá trị có thể **gãy đôi qua hai dòng** *(số tiền tách khỏi đơn vị)*
- **Chìa khoá Shopee gia hạn SÁT NÚT**: `src/shopee.js:184` dùng
  `nowSec() >= token_het_han` — chỉ gia hạn **sau khi hết hạn hẳn**, không gia
  hạn sớm vài phút. Lệnh đang bay đúng khoảnh khắc giao thời sẽ hỏng một lần
  rồi mới lấy chìa mới. Tự gia hạn **CÓ chạy thật** — đo được: làm mới lúc
  14:46 ngày 04/09/2026, hạn 4 tiếng.
- Cờ "đã bấm Tải thêm" chỉ giữ trang cũ ở phạm vi **Toàn công ty**; ba phạm vi
  "của tôi" vẫn bị cuốn — đã ghi vào mã cạnh `daBamThemLSCV`
- **`do-nut-sua-44px` treo** trên máy này *(có sẵn trên `main`, không phải do
  bản vá nào)*, và **dùng chung cổng 8903 với `do-tai-tep`** nên hai bàn đo
  không chạy song song được

## NỢ MỚI GHI 07/09/2026 — REV-0062 (GY-0006 · GY-0007)

### Ba cổng ĐỎ — nợ của `f1ac70b` (Dashboard Marketplace), KHÔNG phải của nhánh `fix/gopy-6-7`

Hồ Ly xác minh trên cây `origin/main` tự dựng: **y hệt từng chữ**, nên nhánh vá
không làm hỏng thêm gì. Nhưng "chạy hết cổng" mà bỏ cổng đỏ ra ngoài báo cáo thì
lần sau **không ai biết nợ có tăng hay không** — nên ghi cả ba ra đây.

| Cổng | Nhánh vá | `origin/main` sạch | Gốc |
|---|---|---|---|
| `do-tu-lam-moi` | **52 / 2 ĐỎ** | 52 / 2 ĐỎ, y hệt | `kdTachDongHang` chưa khai nhóm dữ liệu |
| `do-bang-vua-man` | **36 / 3 ĐỎ** | 36 / 3 ĐỎ, y hệt | 3 bảng `kd-tq-bang` / `kd-sku-chay` / `kd-sku-kem` tràn cột |
| `do-bang-that` | **73 / 2 ĐỎ** | 73 / 2 ĐỎ, y hệt | 2 bảng Dashboard Marketplace tràn ở 1440 và 1280, cột "Doanh thu" rơi |

- ⚠️ Hai cổng đầu (`do-tu-lam-moi` · `do-bang-vua-man`) **đã KHÔNG được khai** ở
  vòng báo cáo trước — đó là cái sai của người xây, không phải của bàn đo.
- `do-bang-that` **không đo 1024px** — cùng họ với nợ 1024px ghi ngày 04/09.

### Đồng hồ chết — 37 bàn đo còn lại

- **38/40 bàn đo dùng Chrome KHÔNG có hạn giờ nào.** `moChrome` chỉ đặt hạn 30s
  cho lúc Chrome mở cổng gỡ lỗi; `chay()` (CDP `Runtime.evaluate`) **không có
  hạn** — trang treo là bàn đo treo vô hạn, không đỏ không xanh, không một dòng
  chữ. Đã trả giá đúng chuyện này trong đợt GY-0007: một bàn đo đứng im 20 phút.
  **Một bàn đo treo còn tệ hơn một bàn đo đỏ — người ta không đọc nó, người ta
  TẮT nó.**
- **Đã làm 07/09:** `cong-khoi` có đồng hồ chết 4 phút *(cổng bắt buộc thì không
  được phép treo)*. Chứng minh có chạy: hạ hạn xuống 3s → cổng báo
  `❌ ĐỎ — TREO quá 3s ở bước "lượt 1 — dựng máy giả + mở Chrome"`, dọn Chrome,
  thoát 1.
- **CÒN NỢ:** 37 bàn đo kia. **Cách đúng là nâng đồng hồ chết lên
  `lib/ban-do-chrome.mjs`** (gói `goi()` / `chay()` bằng một hạn giờ) thay vì
  chép tay vào từng bàn đo. Chưa làm ở vòng này vì `lib/` là tệp DÙNG CHUNG —
  đổi hành vi của nó là lặng lẽ đổi bài của mọi bàn đo, kể cả hai worktree đang
  có người làm (`agc-gy45`, `agc-napfile`). Xếp thành một việc riêng, làm khi
  không ai đang đụng `lib/`.

### Việc nhỏ còn lại

- **Thêm `768px` vào `BE_NGANG` của `do-man-mo-ra-xem-duoc`** — gần như miễn phí.
  Chú thích của chính bản vá `.cnb-popup` nói `dvh` cần cho **dải 641–820px**
  (máy tính bảng, điện thoại nằm ngang), mà đó đúng là dải **không đo**.
  *(REV-0062 mục ④.2 — tự mâu thuẫn)*
- **Bộ ảnh `gy0007-*` chụp bằng ổ giả ĐỜI CŨ** (5 nút lọc, 4 nhóm bịa) chứ không
  phải ổ 7 nhóm đúng mã hiện tại → **ảnh không tái hiện được bằng lệnh trong
  `package.json` hôm nay**. Chụp lại khi có dịp.
- **Lợi ích của `dvh` chưa ai chứng minh**: chưa đo trên điện thoại thật, chưa đo
  trong PWA đã cài. Riêng PWA chạy standalone **không có thanh địa chỉ** nên ở đó
  `dvh` = `vh` và bản vá vô tác dụng — lợi ích chỉ nằm ở tab trình duyệt trên
  điện thoại. Rủi ro thì đã đo và đã chặn (cặp `vh`+`dvh`, BH-64).
## NỢ MỚI GHI 07/09/2026 — REV-0061 vòng 2

- **Dải cắt sổ nhận xét không có đường đi tiếp** *(REV-0061 vòng 2 · THẤP-2)*.
  `xem_them: null` — dải nói *"còn 23 nhận xét chưa tải về máy"* mà không có
  nút nào lấy tiếp. **Cố ý để lại vòng này**, hai lẽ: ① giống hệt
  `#cv-sua-lichsu-cat` ngay cạnh nên **nhất quán** — vá một cái thành hai kiểu
  còn tệ hơn; ② 100 nhận xét cho **một việc** là con số không đời nào chạm tới
  (ca thật đang là 3). Vá thì vá **cả lớp dải cắt** trong một vòng riêng, đừng
  vá lẻ đúng cái ô này.
- **`holy-quet-neo-vong3.mjs` báo 1 neo chết** ở `scripts/do-kho-tai-lieu.mjs:486`
  (neo `.tlq-nut-nhi { display: block; …`). **Nợ có sẵn của `a7c8f7f`** — đã
  kiểm bằng cách cất hết bản vá đi rồi chạy lại, vẫn đúng 1. Hồ Ly khai 0;
  khác nhau ở luật đếm/xuống dòng chứ không phải ở mã.
- **Ca đối chứng E của `holy-soi-gy45-vong3.mjs` nay không thoả được nữa.** Nó
  bẻ bằng cách *"gán `.value` mà không bắn `input`"* rồi đòi dòng đỏ phải dính
  lại — mà đó chính là **thứ bản vá CAO-1 đã xoá bỏ ở tầng lớp**. Muốn làm mù
  bản vá nay thì phải **giết cái bẫy trên `value`** trong `o-ngay.js` (xem
  `DC-H` của `do-o-ngay`). Không sửa bàn đo của Hồ Ly — ghi lại để chị đổi ca
  đối chứng ở vòng sau.
- **Điểm mù còn lại của máy quét ②b**: nay hỏi tại **chỗ gọi**, nhưng khuôn gọi
  nào không truy được đường đi (`API.x().then(…)`, lời gọi lồng làm đối số) thì
  rơi về lưới cũ. Hiện **0 chỗ** như thế; máy quét tự kê ra dòng "ĐIỂM MÙ" mỗi
  lần chạy, ai thêm khuôn mới thì thêm nhánh vào `tenBienNhanKetQua()`.

## CHỜ SẾP — ghi 04/09/2026

- **15/24 nhân viên kho vận CHƯA CÓ tài khoản ERP.** Anh Duy quản 12 fulltime
  + 17 parttime, mà báo cáo kho vẫn đi qua miệng và tin nhắn. Cố ý *(đang lọc
  nhân sự)* hay chưa ai làm?
- **Chị Vũ Lan Hương** làm cả HCNS lẫn CSKH — chờ nhánh nhiều-vị-trí
- **Chị Dương Thị Hồng Khánh** · **chị Nguyễn Thị Bích Trâm**: hồ sơ **trống ô
  chức vụ**, không đề xuất được vị trí công việc
- **"Tạm kiêm" hết hạn thì quyền tự rụng hay giữ nguyên?** Gạo nghiêng về
  **giữ nguyên + ERP nhắc Sếp** — mất quyền giữa ca làm là phá việc thật
- **Eshop (MShopKeeper) — tài liệu ghi ngừng hỗ trợ OpenAPI từ 30/06/2026**,
  đã qua hơn 2 tháng. Cần Sếp thử bấm "TẠO MÃ KẾT NỐI" xem còn không.

## NỢ GHI 07/09/2026 — từ REV-0062 vòng 2

- **Lưới Ⓕ đo "bộ vẽ chạy xong chưa", KHÔNG đo "nội dung có thật và đúng vai
  không".** Hồ Ly gài lọt hai đường: đúng số thẻ nhưng **thẻ rỗng** (88 phép,
  0 hỏng); và **vai hạn chế vẽ ra ô số của vai khác** (62 phép, 0 hỏng).
  Ngưỡng theo vai là **sàn dưới**, nên thêm vai mới thì nó **lỏng dần trong im
  lặng**, không bao giờ kêu. Vá: đòi một mẩu chữ đã gieo nằm TRONG mỏ neo, và
  dùng `===` thay cho `≥` ở chỗ số cố định theo vai.
- **Lưới Ⓔ so TÊN KHOÁ với một hằng số chép tay, không so với gói dữ liệu
  thật.** Gài lại đúng lỗi CAO-3 (`co_chu_chua_tra_duoc` → `co_chu_chua_neo`)
  thì nó **xanh nguyên** (17 phép, 0 hỏng), vì `app.js` đỡ khoá đó bằng `|| 0`.
  Phép có răng thật là phép thứ tư (tổng hữu hạn); phép so tên **đang so hằng
  số với hằng số**. Giá trị kiểu boolean cũng lọt.
- **Đồng hồ chết mới có ở 3/40 bàn đo.** Đã có ở `cong-khoi`, `do-mo-ra-xem-duoc`
  và một bàn nữa. 37 bàn còn lại vẫn treo được — mà bàn đo treo thì người ta
  **tắt nó chứ không sửa nó**. Không nâng lên `lib/` dùng chung được ngay vì
  **43 script import nó**; chờ lúc hàng đợi trống worktree.
- ~~**`do-bang-that` chưa đo 1024px.** Bật lên thì lòi ra **5 chỗ tràn**, trong
  đó **2 chỗ là của `f1ac70b`** (`kd-sku-chay` / `kd-sku-kem`, cột "Doanh thu"
  rơi khỏi màn ở 1440 và 1280). **Vá 2 bảng đó TRƯỚC, rồi mới bật mức đo** —
  đừng bật để cổng đỏ sẵn.~~
  ✅ **XONG 07/09/2026** — nhánh `fix/bang-sku-tran-1024`. Hai bảng SKU vá
  xong, mức 1024px đã bật kèm lời cấm bỏ nó, cả 5 chỗ tràn đã xử.
  `do-bang-that` **73 ĐẠT · 2 TRƯỢT → 97 ĐẠT · 0 TRƯỢT** ở bốn mức
  1440 · 1280 · 1024 · 375.

---

## NỢ MỚI GHI 07/09/2026 — từ việc vá bảng SKU và bật mức đo 1024px

- **`do-gop-viec` ĐANG ĐỎ SẴN TRÊN `origin/main`** (`407d2df`), không phải do
  nhánh nào gây ra: `❌ 1440px: số dòng bị giảm` — `truoc` 9 dòng, `sau`
  `gop.toi` 8 · `gop.congty` 8. Đã kiểm bằng cách stash sạch cây làm việc rồi
  chạy lại: **ra đúng cùng con số**. Đây là chốt chính Sếp dặn — *"không được
  làm giảm số dòng thấy được"* — đang bị vi phạm trên hệ thống thật mà chưa ai
  khai. Phải xử trước khi nó thành cái mái như `MOC_TRAN` cũ.
- **`do-tu-lam-moi` 52 ĐẠT · 2 TRƯỢT** — nợ của `f1ac70b`, đã biết từ trước,
  vẫn còn nguyên. ⚠️ **Con số này đã CŨ. Từ lượt gộp `aa6245f` (07/09/2026) nó
  là 51 / 3** — xem mục "NỢ MỞ ②" ở cuối tệp.
- ~~**CẦN SẾP / HỒ LY XÁC NHẬN MỘT QUYẾT ĐỊNH HIỂN THỊ.** Bảng "Tổng quan 2 sàn"
  (`kd-tq-bang`) — đã cho hai cột "Hủy"/"Hoàn" xuống `.cot-phu`, vì thẻ số trên
  bảng đã báo "Hủy + Hoàn" kèm % trên GMV.~~
  ✅ **ĐÃ SỬA 07/09/2026 (vòng vá REV-0063 · VỪA-3).** Hồ Ly bác, và bác đúng
  bằng số — cả hai điểm đều tái lập được:
  1. `.cot-phu` là `display:none` ở **MỌI** bề ngang, nên hai cột biến mất cả
     trên màn 1440px của Sếp — nơi bảng này **không hề tràn** (đo lại: khung
     1094 · bảng 1094 · vừa). Trả giá ở màn rộng để chữa +26px ở màn hẹp.
  2. **Lý do cũ SAI VỀ DỮ LIỆU:** thẻ "Hủy + Hoàn" đọc `dt.tong` — **tổng toàn
     công ty, KHÔNG tách sàn** — nên nó không trả lời được đúng câu mà hai cột
     ấy trả lời: *Shopee đang rò rỉ hay TikTok đang rò rỉ*. Với AGC đó là số
     quyết định có đẩy ngân sách sang TikTok hay không: thông tin cấp một.
  **Nay:** hai cột **ở lại trên bảng từ 1101px trở lên**, chỉ rời bảng từ
  **≤1100px** — một khối `@media (min-width: 1101px)` trên `#kd-tq-wrap`
  (style.css). `.cot-phu` vẫn giữ trên `<th>` để `luoiBang()` luôn cấp nút
  "Chi tiết": đường tới dữ liệu có ở mọi bề ngang, không JS nào phải đo màn
  hình, nên không hỏng khi người ta kéo co cửa sổ qua mốc 1100px.
  Đo lại: `kd-tq-bang` **vừa khít ở 1440 · 1280 · 1024**, `do-bang-that` arm
  A/B/B2/G/G2/G3 xanh cả 4 mức.
  ⚠️ **Còn một chỗ cần NGƯỜI SOI sửa, không phải kho mã:**
  `scripts/holy-rev63-quet-min560.mjs` là bản CHÉP của `do-bang-that`, đóng
  băng TRƯỚC khi arm G được sửa nghĩa (nay chỉ đòi nút "Chi tiết" cho ô cột
  phụ **đang thật sự `display:none`**, chứ không theo cái tên lớp). Bản chép
  ấy vẫn chấm theo LỚP nên báo `G2 · kd-tq-bang 0x0` ở 1440 và 1280 — cái nút
  ở đó bị ẩn **có chủ ý**, vì hai cột đã nằm trên bảng rồi. Bàn đo hiện hành
  xanh cả G/G2/G3 ở cả 4 bề ngang.

---

## VÒNG VÁ REV-0063 — 07/09/2026, đã xử hết 2 CAO · 4 VỪA · 2 THẤP

- **CAO-1 · cắt chữ âm thầm ở ô "Mã SKU · Tên hàng"** (đo: hiện 34px / thật
  50px, cả 3 dòng `#kd-sku-chay` @1440px, KHÔNG có nút "Xem thêm"). Vá bằng
  `capNutDongPhu()` trong `app.js`: đo `scrollHeight` vs `clientHeight` rồi
  gắn/gỡ nút. Đo lại sau vá: @1440 bảng bán chạy **có nút**, bảng bán kém
  không kẹp nên **không có nút thừa**; @1024 và @375 không kẹp, không nút.
- **CAO-2 · luật CSS chết.** Có cổng mới canh: `npm run do-luat-css-chet`
  (tự đối chứng bằng các mẫu dựng sẵn trước khi chấm tệp thật).
  ⚠️ Con số nền ở đây từng viết là "`main` 3/187". SAI: 187 là số của
  **merge-base `407d2df`**, còn `origin/main af951b8` là **3/189**
  (REV-0063 vòng 2, THẤP-3). Đo lại rồi mới ghi, đừng lấy số của cây khác.
- **VỪA-1** arm D đổi `>=` → `===` (báo cả hai chiều). **VỪA-2** sửa lời khai
  nbsp cho khớp số đo (dựng lại bằng `BO_NBSP=1`: giống hệt từng pixel).
  **VỪA-3** xem ở trên. **VỪA-4** `MOC_CAO_DONG` nay có arm E4 dùng thật, và
  arm A đỏ khi bảng đo ra `khung 0px` thay vì chấm là "vừa".
- **THẤP-1** ghi mép của `min(560px, 100%)` vào ngay chỗ luật. **THẤP-2**
  `do-bang-vua-man` thêm mức 1024px (39 → **46 ĐẠT · 0 TRƯỢT**).
- Cổng mới đều **tự chứng minh bắt được**: gài lại đúng 3 lỗi rồi chạy —
  arm R7 đỏ ở 1440/1280 ("hiện 34px / thật 50px"), arm D đỏ cả 4 mức, arm A
  đỏ với "KHÔNG ĐO ĐƯỢC (khung 0px)"; `do-luat-css-chet` đỏ đúng 2 dòng.

## VÒNG VÁ REV-0063 VÒNG 2 — 07/09/2026, đã xử 1 CHẶN · 2 CAO · 3 VỪA · 5 THẤP

- **CHẶN-1 · gộp `main af951b8` không sạch.** Xung đột đúng khối `.kd-sku-cot`:
  `main` chữa bằng `minmax(560px)`, nhánh này bằng `minmax(360px)` +
  `min(560px,100%)` ở chính `<table>`. Chốt tay **lấy phía NHÁNH**, lý do ghi
  ngay tại chỗ trong `style.css`: sàn 560px của `main` làm **hai bảng SKU xếp
  chồng ở 1440px** (lưới chỉ rộng 1094 < 560×2+20).
- **CAO-1 · luật CSS chết thứ tư và thứ năm** — `@media(≤1100px) thead th,
  tbody td { padding-left/right: 10px }` và `@media(≤640px) .chat-nhap
  { padding-bottom: calc(… env(safe-area-inset-bottom)) }`, cả hai chết vì bị
  **viết GỘP `padding` đè viết RỜI**. Đo Chrome trước vá: đệm 16px ở
  1100·1099·1024·981 (chưa bao giờ 10px). Sau vá: **10px ở cả bốn**, và lề an
  toàn tai thỏ thắng được luật nền. Cổng `do-luat-css-chet` nay soi thêm lớp
  gộp-đè-rời, chuẩn hoá selector (đảo lớp · khoảng trắng quanh `> + ~` ·
  hoa/thường tên thẻ), và lớp "@media bị @media phủ đứng sau đè" — lớp cuối
  lòi ra thêm một luật chết thật (`.login-panel` @980px). Mục PHẠM VI của cổng
  nay khai **đủ 8 chỗ mù** (vòng 3 THẤP-1 thêm chỗ thứ ⑧: `chuanHoaSel()`
  không gộp `:hover`/`:HOVER`, `::before`/`:before`, nháy đơn/kép trong `[]` —
  cả ba lệch về phía bỏ sót, ERP hôm nay 0 ca), không phải một chỗ tiện nói.
- **CAO-2 · vạch `min-width: 1101px` mở ra dải tràn mới 1101–1245px**
  (`kd-tq-bang` +145 → +46, nút "Chi tiết" bị chính khối đó ẩn ⇒ chỉ còn kéo
  ngang). Dời vạch lên **1246px** và thêm **1200** vào `RONGS` của
  `do-bang-that`. Quét lại **cả dải 1090–1440px, 40 mức: 0 tràn, 0 chỗ mất
  đường xem**.
- **VỪA-1** sửa lời khai sai trong `do-cat-im-lang.mjs`: tập bắt của arm K là
  **tập con thực sự** của R7, không phải "hai phạm vi không chồng lấn".
- **VỪA-2** `capNutDongPhu()` nay **gỡ cả nút THẬT** khi ô hết kẹp (trước để
  lại 11 nút "mở ra thứ đang bày sẵn"). Chốt chặn dao động bằng `GO_TOI_DA`
  chứ không bằng cách từ chối dọn. Đo: 40 mẫu × 50ms **không dao động**, sau
  khi nới khung còn **0 nút nói dối / 0 ô kẹp thiếu nút**.
- **VỪA-3** `.dai-gon-btn` trong ô bảng: hộp **15px → 44px** bằng HỘP THẬT +
  lề âm -10/-10 (KHÔNG dùng `::after` — bản đầu định thế, nhưng `::after`
  không hiện trong `getBoundingClientRect()` nên mọi bàn đo đọc hộp sẽ báo
  24px). Dòng chỉ cao thêm ~3px. Đưa vào `do-nut-dai-cat-44px` kèm ca đối
  chứng (gỡ luật → đo ra 16px).
- **THẤP-1** bỏ con số viết cứng "bốn mẫu" trong `do-luat-css-chet`, in thẳng
  `MAU.length`. **THẤP-2** "từ ~1230px mới hai cột" → đo được **1086px**.
  **THẤP-3** xem ghi chú ở mục CAO-2 vòng 1 phía trên. **THẤP-4** thêm ca
  `--tu-kiem` đứng sẵn bắt **arm R7 phải đỏ**. **THẤP-5** ghi rõ chỗ lệch
  phạm vi giữa `capNutDongPhu()` và arm K/R7 với ô chỉ chứa ảnh.

### REV-0063 vòng 3 → vá vòng 4 (07–08/09/2026)

Hồ Ly vòng 3: **FAIL — 0 CHẶN · 1 CAO · 4 VỪA · 6 THẤP**. Cả 11 chỗ của vòng 2
đã kiểm lại và ĐẠT hết; cái làm FAIL là **một chỗ MỚI**, và nó là **lần thứ BA
liên tiếp cùng một hình dạng lỗi**: đo ở một phía của cái vạch rồi kết luận cho
cả hai phía (vòng 1 đo 1440 sót 1024 · vòng 2 đo 1280/1440 sót 1101–1245 ·
vòng 3 đo 1200/1280/1440 sót **chế độ THẺ ≤980px**).

- **CAO-1 · nút "Xem thêm" đo ra 44px mà ngón tay chỉ bấm được 37–38px trên
  điện thoại.** Ở chế độ THẺ các ô xếp chồng, `margin-bottom:-10px` kéo
  `td.num` trùm 8–9px đáy nút. Vá bằng **`position: relative; z-index: 1`** —
  chạm 45px ở cả 9 bề ngang, chiều cao dòng KHÔNG đổi (95.5 bảng / 137 thẻ).
  Bỏ lề âm cũng chữa được nhưng ăn thêm 10–20px mỗi dòng, nên không.
- **CAO-1 phần cổng · `nut_o_bang_cham` là CHỐT GIẢ.** Nó là *cùng một biểu
  thức* với `nut_o_bang_hop` (`oNutO.height`), cả tệp không có một
  `elementFromPoint` nào, và JSON tự tố cáo `_hop:44 _cham:44` ở cả 5 bộ số.
  Nay cổng quét từng pixel bằng `elementFromPoint`, có khung ở **cả** chế độ
  thẻ lẫn chế độ bảng, thêm **arm ② đo trên ỨNG DỤNG THẬT ở 9 bề ngang**, và
  một ca đối chứng gỡ đúng `position/z-index` (hộp phải vẫn ≥44 mà chạm phải
  <44) chạy **mặc định**, không nấp sau cờ.
- **VỪA-1 · `GO_TOI_DA = 2` không đủ** — trần chạm ở lượt nới thứ BA, trả lại
  4 nút nói dối. Nay đếm **theo CHÙM** (`GO_TOI_DA = 6`, `CHUM_MS = 250`), có
  cổng mới `npm run do-nut-noi-doi` chạy CẢ ca kéo co lẫn **ca vòng lặp tự
  nuôi dựng thật bằng `:has()`**, mỗi ca một đối chứng đỏ.
- **VỪA-2** lời khai "đừng dồn lề âm… nút sẽ ăn cú bấm dòng sau" nay ghi thêm
  số thật: bản đối xứng **vẫn ăn 1px** của dòng sau ở 1440·1280·1024.
- **VỪA-4 · `do-nut-dai-cat` không phải cổng tự chấm** — nó `listen(8919)` rồi
  đứng chờ người mở trình duyệt, không in kết luận, không mã thoát, cổng mạng
  viết cứng. Nay tự lái Chrome, in `KET_QUA_JSON` ra stdout, trả mã thoát 0/1,
  cổng mạng lấy 0 (đổi được bằng `CONG_DO_NUT`).
- **THẤP-1** `do-luat-css-chet` khai thêm chỗ mù ⑧ (ba dạng viết
  `chuanHoaSel()` không gộp). **THẤP-2** ghi rõ arm R7 mới chứng minh ở **3/5
  mức**. **THẤP-3** arm ② đo nút trên ứng dụng thật. **THẤP-4** sửa "R7 đỏ ở
  1440 và 1280" → **ba mức** (thêm 1200). **THẤP-5** khung "TRƯỚC" nay gỡ hẳn
  khối `td .dai-gon-btn` nên cột TRƯỚC/SAU có tín hiệu thật (16 vs 44).

---

## NỢ MỞ — chưa làm, đợi hàng đợi trống

### ① `.gitattributes` · lớp "bàn đo so chuỗi `\n` trên kho mã CRLF"

Kho để `core.autocrlf = true` và **chưa có `.gitattributes`**, nên cây làm việc
mang CRLF: **125/126 tệp chữ**. Mọi bàn đo dựng biểu thức `X\n` (với `X` là ký
tự cụ thể) trên mã đọc từ đĩa sẽ **trượt IM LẶNG**.

Hồ Ly đo vi sai (chạy mọi regex của từng bàn đo trên hai bản CRLF/LF của đúng
những tệp nó đọc), REV-0063 vòng 3:

| tầng | số bàn đo |
|---|---|
| tổng `.mjs` trong `scripts/` + `scripts/lib` | **129** |
| trong đó **ĐỌC mã kho từ đĩa** — mẫu số thật | **49** |
| **ĐÃ PHÒNG** (`replace(/\r\n/g)` hoặc `\r?\n`) | **10** |
| **CHẾT HÔM NAY** | **0** ✅ |
| **SỐNG NHỜ MAY** — biểu thức vắt qua ranh dòng, sống chỉ vì `\s*`/`[\s\S]` nuốt hộ `\r` | **9** |
| đọc thô, không vắt ranh dòng | 30 |

Chín cái sống nhờ may: ~~`do-nut-dai-cat-44px`~~ *(vòng 4 đã đóng: nó chuẩn
hoá CRLF→LF ngay khi đọc `style.css`)* · `do-ba-mau` · `do-cat-im-lang` ·
`do-quyen-duyet-gopy` · `do-sua-viec-da-giao` · `ho-ly-rev0060-b` ·
`ho-ly-rev0060` · `holy-do-8-nguoi-that` · `holy-quet-cat-vong3` — **còn TÁM**.
Đổi đúng một ký tự trong biểu thức là chết, im lặng, trên máy Windows nào cũng
chết. Trớ trêu: cái vừa đóng chính là cổng của CAO-1 vòng này, dòng 89 —
`/td \.dai-gon-btn \{[\s\S]*?\n\}/` gỡ được luật 44px chỉ vì `[\s\S]` nuốt hộ
`\r`.

**Lớp này đã bị bắt và vá 4 LẦN ở 4 TỆP KHÁC NHAU** (`do-so-do-bieu-tuong`
29/08 · `do-kho-tai-lieu` · `do-quyen-man-viec-gop` · `do-nap-lai` vòng này).
Bốn lần cùng một lỗi ở bốn tệp nghĩa là **chỗ chữa không phải từng tệp**.

**Việc phải làm:** thêm `* text=auto eol=lf` vào `.gitattributes`, hoặc đưa
`docNguon()` lên `scripts/lib/` và bắt mọi bàn đo dùng nó. Chi phí 0.
**KHÔNG làm trong vòng vá REV-0063** — đổi cách kho lưu ký tự xuống dòng đụng
cả 126 tệp, phải có hàng đợi trống và một lượt chạy hết cổng riêng cho nó.
*(Vòng 4 đã tự chuẩn hoá CRLF→LF trong `do-nut-dai-cat-44px` và dùng `\r?\n`
trong `do-nut-noi-doi` — hai con, không phải cả lớp.)*

### ② `do-tu-lam-moi` nay **51 / 3**, không phải 52 / 2 — nợ của `main`

Con số trong sổ đã cũ. Hôm nay:

```
❌ 117 hàm ghi đều đã khai — CHƯA KHAI: khoDieuChinh, kdTachDongHang
❌ không khai thừa tên hàm không tồn tại — THỪA: napLuot
❌ ⑤b tổng đúng 6 lượt (1 ghi + 5 nạp lại) — 7 lượt
```

⚠️ **Dòng đỏ thứ BA (`⑤b … 7 lượt`) chưa được khai ở đâu cả** — báo cáo vòng 3
chỉ trích hai dòng đầu. Nó là **51 ĐẠT / 3 TRƯỢT**, không phải 51/2.

`khoDieuChinh` và `napLuot` là hàm của **đường nạp file + phiếu điều chỉnh tồn
kho**, tức phần việc của `main af951b8` (`napLuot` vào từ `239f983`). Và
`git diff --stat af951b8 HEAD -- public/assets/js/lam-moi.js
public/assets/js/api.js` → **RỖNG**: nhánh `fix/bang-sku-tran-1024` chưa từng
chạm hai tệp quyết định cổng ấy. Con số đổi ở lượt gộp `aa6245f`, không ở lượt
vá. **Không phải nợ của nhánh này, nhưng là nợ THẬT của `main`** — khai
`khoDieuChinh` và bỏ `napLuot` thừa trong `lam-moi.js`, và truy dòng ⑤b.

Kiểm bằng cách stash sạch `style.css` + `app.js` của nhánh rồi chạy lại:
**ra đúng 51 / 3, đúng cả ba dòng đỏ** — nên không dòng nào là của vòng vá này.

### ③ `do-gop-viec` đỏ — nợ `f699272`, chờ Sếp chốt

Giữ nguyên, xem mục cùng tên phía trên.

---

## TÀI LIỆU LUẬT

`docs/BANG-MAU.md` *(luật ba màu)* · `docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md`
*(góp ý là triệu chứng)* · **`docs/HANG-DOI.md` (file này)** — 03/09 đã đưa vào
repo, trước đó nằm ngoài repo mà vẫn được trích dẫn khắp nơi.
