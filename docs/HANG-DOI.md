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
  vẫn còn nguyên.
- **CẦN SẾP / HỒ LY XÁC NHẬN MỘT QUYẾT ĐỊNH HIỂN THỊ.** Bảng "Tổng quan 2 sàn"
  (`kd-tq-bang`) có 7 cột tiền, không thể vừa khung 678px ở 1024px. Đã cho hai
  cột **"Hủy"** và **"Hoàn"** xuống `.cot-phu` — vẫn xem được bằng nút "Chi
  tiết" của từng dòng, và thẻ số ngay trên bảng đã báo "Hủy + Hoàn" kèm % trên
  GMV. Lý do chọn đúng hai cột đó: câu hỏi khi nhìn một dòng là *"sàn nào mang
  về bao nhiêu, có tụt không"* — Hủy/Hoàn là phần RÒ RỈ, không phải câu trả
  lời. **Đây là quyết định hiển thị, không phải business rule** — nhưng nó đổi
  cái Sếp nhìn thấy trên màn 1440px, nên khai ra để lật lại được: muốn giữ đủ
  7 cột thì phải cho `kd-tq-bang` vào `BANG_GIU_CUON` kèm lý do viết bằng chữ.

---

## TÀI LIỆU LUẬT

`docs/BANG-MAU.md` *(luật ba màu)* · `docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md`
*(góp ý là triệu chứng)* · **`docs/HANG-DOI.md` (file này)** — 03/09 đã đưa vào
repo, trước đó nằm ngoài repo mà vẫn được trích dẫn khắp nơi.
