# BÀI HỌC — đọc trước mỗi lần bắt tay làm

> Sếp Ngọc 2026-08-27: *"tư duy logic theo hướng liên tục tối ưu, tốt hơn sau
> mỗi lần làm việc."*
>
> File này là bộ nhớ dài hạn của nhóm. **Mọi Agent đọc file này trước khi bắt
> đầu bất kỳ việc gì.** Sai lần đầu là học phí. Sai lần hai là lỗi.
>
> Mỗi lần review xong, người review **phải** cân nhắc thêm một dòng vào đây.
> Bài học phải **cụ thể và kiểm được**, không phải lời khuyên chung chung.

---

## Về cách xác minh — đừng đoán rồi giao việc

**BH-01 · Thư mục rỗng không có nghĩa là hệ thống chưa tồn tại.**
Hồ Ly khảo sát nhầm thư mục, kết luận "không có source code ERP", rồi thiết kế
cả một hàng đợi yêu cầu mới bằng file. Thực tế code nằm ở `Desktop\AI\crm-agc`
với bộ tài liệu đầy đủ. `SPEC-0001` phải rút toàn bộ.
→ **Xác minh nơi ở thật của code trước khi kết luận về hiện trạng.**

**BH-02 · Đo hành vi CSS phải dựng môi trường CÁCH LY.**
Khỉ Đột đo bằng cách nhét trang vào trang đang mở — mà trang đăng nhập đã nạp
sẵn `style.css` đè lên, số đo không sạch. Hồ Ly dính đúng bẫy đó lần đầu, phải
làm lại bằng `<iframe srcdoc>`.
→ **Dùng `<iframe srcdoc>` cách ly hoàn toàn.** Kết luận đúng nhờ may không tính.

**BH-03 · Khẳng định "đã quét hết" phải kèm PHƯƠNG PHÁP quét.**
Khỉ Đột viết *"không tìm thấy chỗ nào như vậy"* trong tài liệu Sếp dùng để
duyệt. Hồ Ly quét lại bằng cách đọc `document.styleSheets`, duyệt đệ quy cả
khối `@media`, lọc **toàn bộ 130 luật CSS có đặt `display`** — và tìm ra
`#tsInTemVung` (tem tài sản 60×40mm) sẽ **in ra giấy trắng, hỏng im lặng**.
→ **Không viết "đã quét, không có gì" nếu không nói được đã quét thế nào.**

**BH-16 · Phép đo phải có ca ĐỐI CHỨNG CÓ LỖI CỐ Ý.**
Một phép đo lúc nào cũng ra "đạt" thì không chứng minh được gì. Xác minh đường in
tem (CTL-0008 vòng 2), Hồ Ly in **4 bản PDF thật**: 2 bản có bản vá, 2 bản đối
chứng — trong đó 1 bản **cố ý bỏ bản vá**. Bản đối chứng ra **0 lệnh vẽ chữ**
(giấy trắng thật), bản có vá ra **1.587**, và **trùng khít bản cũ đang chạy**.
Chính con số 0 đó mới chứng minh phép đo đủ nhạy để bắt lỗi.
→ **Trước khi báo "đã kiểm, chạy tốt": dựng thêm một ca mà bạn BIẾT phải hỏng.
Nếu nó cũng "đạt" thì phép đo hỏng, không phải code đúng.**

**BH-17 · Số đo vô lý thì nghi PHÉP ĐO trước, đừng vội kết tội code.**
Bàn thử phím Esc lần đầu báo 3 ca "không đạt" — suýt trả `FIX_REQUIRED` oan.
Truy ra là bàn thử hỏng: ô nhập chọn làm "ngoài panel" nằm trong view còn ẩn nên
không nhận được con trỏ, và trạng thái rò giữa các ca. Làm lại sạch → cả 5 ca đạt.
Cùng loại: ép `hidden` lên 1.960 phần tử ra 92 "lỗi" — tất cả là thẻ SVG, vì
`hidden` chỉ có trên `HTMLElement` nên `svgEl.hidden = true` **không sinh ra
thuộc tính** (`svg.matches('[hidden]')` → `false`). Cũng là hiện tượng của phép đo.
Lần thứ ba, CTL-0011: 3 ca báo "HỎNG", **cả 3 đều do bàn thử**, code đúng cả —
`body.focus()` **không dời được con trỏ** (thẻ `<body>` không có `tabindex`) nên
`activeElement` vẫn nằm ở ô của ca trước; và `DataTransfer` **bị rút cạn** sau lần
gán `input.files` đầu tiên, nên ca thứ hai chạy với fixture rỗng.
→ **Kết tội code là việc nặng. Trước khi ghi vào bản review, tự hỏi: bàn thử của
mình có đang đo đúng thứ mình nghĩ không?** Kiểm chứng cả biến trung gian — in
thẳng ra trạng thái đầu vào thật (con trỏ đang ở đâu, fixture còn mấy phần tử).

**BH-26 · Ca đối chứng phải là ca mà bạn BIẾT CHẮC nó phải hỏng — không phải ca
"nghe có vẻ sai".** Review CTL-0011, Hồ Ly dựng đối chứng *"cố ý quên tô nền
trắng"* cho cả 15 ca đo hàm nén. Bàn thử báo **12 ca "ĐỐI CHỨNG KHÔNG BỊ BẮT —
BÀN THỬ HỎNG"**, suýt vứt cả bộ số đo vốn đúng. Truy ra: bỏ `fillRect` **không
thể** đổi một byte nào của ảnh **ĐẶC**, vì `drawImage` phủ kín nền ngay sau đó.
Đối chứng ấy chỉ có nghĩa với ảnh **trong suốt** — 3 ca, và cả 3 đều bị bắt đúng.
→ **BH-16 đòi PHẢI CÓ đối chứng; BH-26 đòi đối chứng phải ĐÚNG CHỖ.** Trước khi
chạy, tự chứng minh bằng lời: *"ca này hỏng ở đâu, vì sao kết quả BẮT BUỘC phải
khác"*. Nói không ra thì nó không phải đối chứng, chỉ là một ca chạy thêm. Đối
chứng tốt nhất là loại lệch **cơ học** — lệch 1 pixel, lệch chất lượng 0.01 —
hỏng với **mọi** đầu vào, không phụ thuộc tính chất của dữ liệu thử.

**BH-27 · Rule 13 cấm SỬA file ngoài vùng, không cấm ĐỌC nó.**
CTL-0011 bị cấm đụng `src/index.js` — đúng luật, và Khỉ Đột tuân thủ sạch. Nhưng
tính năng mới (dán ảnh vào chat) **đổ thẳng vào** một dòng có sẵn ở đó:
`btoa(String.fromCharCode(...new Uint8Array(buf)))`. Toán tử `...` trải mỗi byte
thành một tham số hàm, đo được **gãy trong khoảng 100–200KB** (`RangeError`), mà
ảnh chụp màn hình sau khi nén là 200–800KB. Trước đợt này đường đó **nguội** nên
không ai gặp; đợt này biến nó thành đường **chính**. Phát hành thì Sếp dán ảnh →
xem trước đẹp → bấm Gửi → *"Không gửi được"*.
→ **Việc mới làm NÓNG một đường code cũ thì phải đọc hết đường đó, kể cả phần
ngoài vùng sở hữu.** Không sửa — chỉ đọc, đo, rồi mở phiếu riêng và **buộc phát
hành cùng lượt**. *"Không thuộc nhánh tôi"* là lý do đúng để **không sửa**, không
phải lý do để **không biết**.

**BH-18 · Đọc một commit mà KHÔNG đụng cây làm việc của người khác.**
Giữa lúc Hồ Ly review `7b3e6c0`, agent khác `checkout` sang nhánh CTL-0011 rồi
chạy `git rebase`. Cây làm việc đổi dưới tay, `git rev-parse HEAD` trả về commit
khác hẳn lúc bắt đầu. `checkout` ngược lại là phá ngang phiên rebase của người kia
(đúng tinh thần BH-15).
→ **Dùng `git archive <sha> <đường dẫn> -o t.tar` rồi giải nén ra thư mục riêng** —
đọc được bản byte-đúng mà không chạm gì. Và **neo bản review vào SHA commit, không
neo vào tên nhánh** — nhánh di chuyển, commit thì không.

**BH-50 · Cắt code bằng số dòng thì phải KIỂM ĐOẠN CẮT trước khi tin kết quả.**
*(REV-0032 L6 — bài này từng đánh số BH-28, trùng với BH-28 "mutant" ở mục dưới.
Mọi chỗ trong repo trích BH-28 đều trỏ vào bài mutant, nên bài này đổi số.)*
Bàn thử lỗi HEIC (CTL-0011 vòng 2) cắt `coByteCuaDataUrl` theo số dòng nhưng lấy
dư xuống dưới, **nuốt nửa một khối chú thích `/* … */` chưa đóng**. Dấu `/*` hở đó
comment mất **toàn bộ** phần trang phía sau cho tới `*/` kế tiếp — `nenAnhChung`
và hàm in kết quả biến mất khỏi phạm vi toàn cục, trang vẫn tải, vẫn "chạy", chỉ
ném một `ReferenceError` trông như lỗi lặt vặt. Suýt đi truy code sản phẩm.
→ **Cắt nguyên văn theo số dòng là đúng (không gõ tay), nhưng phải có chốt tự
kiểm ngay sau khi cắt: đếm `{` = `}` VÀ đếm `/*` = `*/`.** Lệch thì dừng, báo
"BÀN THỬ HỎNG", đừng chạy tiếp. Cùng họ BH-17: nghi bàn thử trước, nghi code sau.

**BH-51 · Vá một khuôn code hỏng thì phải quét cả repo tìm anh em của nó — và
kết luận "an toàn" cũng phải có SỐ ĐO, không được suy đoán.**
*(REV-0032 L6 — từng đánh số BH-29, trùng với BH-29 "phép kiểm khớp phải chú
thích" ở mục dưới; các chỗ trích BH-29 trong repo đều trỏ vào bài đó.)*
Vá `String.fromCharCode(...)` ở `chatGui()` xong, quét toàn bộ file `git ls-files`
theo dõi thì tìm ra **chỗ thứ hai giống hệt**: `src/auth.js:20`. Nếu chỉ nhìn
khuôn code mà kết luận thì phải xếp nó là lỗi. Nhưng đi ngược lên **từng chỗ gọi**
`sangBase64()` thì thấy đầu vào lớn nhất là **32 byte** (salt 16B, hash 32B, token
32B) — không đời nào chạm ngưỡng ~122KB. Nên đáp án đúng là **có anh em, nhưng
anh em an toàn, cố ý không sửa**.
→ **Quét thì quét bằng danh sách file có thật (`git ls-files`), nói rõ đã loại gì
(thư mục build `.wrangler`, vendor minified) — đó mới là "phương pháp quét" mà
BH-03 đòi.** Và đừng dừng ở "cùng khuôn = cùng lỗi": lỗi tràn ngăn xếp phụ thuộc
**kích thước đầu vào thật**, nên phải truy chỗ gọi rồi mới kết luận. Chỗ an toàn
thì ghi vào báo cáo là **đã kiểm và an toàn**, đừng im lặng bỏ qua — im lặng thì
lượt review sau lại phải đi tìm lại từ đầu.

**BH-32 · Trước khi thêm một cột, `grep` tên nó trong `migrations/` — audit đọc
`schema.sql` là đọc thiếu.**
CTL-0015 audit kỹ và kết luận "chưa có loại hình hợp đồng". Nhưng
`nhan_su.loai_lao_dong` (`toan_thoi_gian|ban_thoi_gian|thoi_vu`) **đã có** từ
`them-dangky-ca.sql:19` và `src/ca.js` đang dùng thật — nó không nằm trong
`schema.sql` vì được thêm bằng `ALTER TABLE` ở một migration sau. Suýt thiết kế một
danh sách chọn thứ hai chồng lên nó, mà chồng chỗ này là **trộn hai trục pháp lý khác
nhau** (hình thức làm việc vs loại hợp đồng) — đúng thứ gây phân loại sai BHXH.
Cùng lần đó, `grep` ngược lại tìm ra ba cột **ghi-một-chiều**: `so_cccd`, `so_bhxh`,
`anh_cccd` được `INSERT` ở `src/nhansu.js:130` nhưng **không có một `SELECT` nào** đọc
ra, và `anh_cccd` trỏ vào R2 đã chốt không bật.
→ **Sự thật về schema nằm ở `schema.sql` HỢP với mọi `ALTER TABLE` trong
`migrations/`, không nằm ở riêng cái nào.** Và kiểm một cột thì kiểm **cả hai chiều**:
có ai ghi vào không, **có ai đọc ra không**. Cột chỉ có chiều ghi là tính năng chết mà
trông như đang chạy.

**BH-33 · Tính năng chạm luật thì phải TRA VĂN BẢN, và tra cả cái ERP đang tự ghi lại.**
Sếp yêu cầu đổi "bán thời gian" thành "Khoán". Nếu làm đúng chữ — đổi nhãn — thì hỏng:
khoán việc là **hợp đồng dân sự**, bán thời gian là **hợp đồng lao động có đóng BHXH**,
hai trục khác nhau chứ không phải hai tên của một thứ. Tra ra BLLĐ 2019 Đ.13 k.1 và
Luật BHXH 2024 (41/2024/QH15, hiệu lực **01/07/2025**) dùng **cùng một câu**: thoả
thuận *mang tên gọi khác* mà có **trả công + quản lý, điều hành, giám sát** thì vẫn là
quan hệ lao động, vẫn BHXH bắt buộc — hậu quả 0,03%/ngày (NĐ 274/2025), quá 60 ngày
thành trốn đóng, phạt 2–25 triệu (NĐ 12/2022). Nặng hơn nữa: **chính ERP này** đang ghi
`lich_lam_viec` + xếp ca cho 17 parttime kho — tức là hệ thống **tự sản xuất bằng
chứng** ngược lại tờ hợp đồng, và bảng xếp ca là thứ thanh tra đọc đầu tiên.
→ **Mọi tính năng chạm nhân sự · hợp đồng · lương · BHXH · thuế · giấy phép phải có mục
"Chiếu theo luật": số hiệu văn bản + ngày hiệu lực + rủi ro nếu sai — tra bằng
WebSearch, không viết theo trí nhớ (BH-03 áp cho luật).** Và hỏi thêm một câu mà không
văn bản nào nhắc: *"hệ thống của mình đang lưu lại bằng chứng về điều gì?"*
Bù lại, chốt chặn tốt nhất thường **đã có sẵn**: `src/ca.js` vốn lọc trắng
`IN ('ban_thoi_gian','thoi_vu')`, nên chỉ cần đặt người khoán sang giá trị mới là họ
tự động không xếp ca được — **0 dòng code**. Tìm chốt sẵn có trước khi dựng chốt mới.

**BH-04 · Đừng đoán nguyên nhân rồi giao Khỉ Đột sửa theo phỏng đoán.**
Gạo nêu 4 giả thuyết cho lỗi cửa sổ không đóng. **Cả 4 đều sai.** Nguyên nhân
thật là một dòng CSS đè mất luật mặc định của trình duyệt.
→ **Nghi ngờ thì cho đo trước, đừng viết giả thuyết vào bản giao việc như thể
là sự thật.** Giả thuyết chỉ để loại trừ, không để làm theo.

## Về báo cáo — lời khai phải khớp code

**BH-05 · Khai test phải đúng code thật.**
Khỉ Đột khai *"đóng form thì xoá ảnh"*. Thực tế chỉ nút "Hủy" xoá, nút "✕ Đóng"
giữ nguyên. Review bắt được.
→ **Đọc lại code rồi mới viết mục Tests.** Khai sai một mục là mất niềm tin cả bản.

**BH-06 · Builder không bao giờ được tự nhận `DONE`.**
Góp ý #1 đi từ "đang làm" sang "hoàn thành" trong **12 giây**, không người phụ
trách, không spec, không một dòng code — commit gần nhất trước đó 2,5 tiếng và
không liên quan.
→ **Xong build là `READY_FOR_REVIEW`.** `DONE` chỉ đến sau khi có bằng chứng.

## Về quyết định — đừng đẩy việc lên trên

**BH-07 · Gọi thẳng Agent, đừng in lệnh bắt Sếp dán.**
Gạo từng in ra đoạn lệnh rồi bảo Sếp mở phiên mới dán vào. Sếp gắt hai lần.
→ **Có công cụ gọi Agent thì gọi.** Sếp không phải bưu tá.

**BH-08 · Đừng trình Sếp danh sách phương án kỹ thuật.**
Hồ Ly đưa lên 14 câu. Gạo lọc: 4 câu thuộc quyền Sếp, 10 câu tự quyết được.
→ **Trước khi hỏi, tự hỏi: lấy được từ repo/DB/công cụ không? Có chạm tiền,
dữ liệu thật, hay luật nghiệp vụ không?** Không thì tự quyết, ghi lại lý do.

**BH-09 · Nhưng đừng tự quyết khi CHƯA CÓ bằng chứng an toàn.**
Gạo suýt trình Sếp duyệt dòng `!important` mà chưa ai kiểm chứng. Nếu Sếp gật
lúc đó, in tem đã hỏng.
→ **Thiếu bằng chứng thì cho Hồ Ly đi xác minh trước.** Quyết nhanh mà sai thì
tốn hơn quyết chậm.

## Về ranh giới

**BH-10 · Dừng đúng ranh giới `CORE_CHANGE` có giá trị thật.**
Khỉ Đột dừng lại xin phép thay vì tự làm cho nhanh. Chính cái dừng đó cứu được
lỗi in tem. Luật chứng minh giá trị ngay ngày đầu ban hành.
→ **Đụng nhiều màn hình thì dừng, dù thấy chắc chắn đúng.**

**BH-11 · Hai người sửa một file trên hai nhánh là hỏng.**
→ **Xếp nối tiếp, nhánh sau tách từ nhánh trước**, không tách từ `main`.

**BH-19 · Phần tử mới dùng `hidden` thì ĐỪNG khai `display` cho nó.**
CTL-0008 phải đi vá 14 chỗ chỉ vì mỗi chỗ đều khai một luật `display` lên đúng
phần tử mà JS đang bật/tắt bằng `hidden` — CSS của trang luôn thắng CSS mặc định
của trình duyệt, nên `phanTu.hidden = true` **chạy mà không ẩn được gì**.
CTL-0011 thêm ảnh xem trước `.chat-file-hinh` ngay trong ô vừa được vá đó, và
**cố ý không khai `display`** — chỉ khai `width`/`height`/`object-fit`.
→ **Muốn tạo kiểu cho phần tử điều khiển bằng `hidden`: khai mọi thứ TRỪ
`display`.** Buộc phải khai (`flex`, `grid`, `block` cho `<img>`…) thì khai kèm
luôn `[hidden] { display: none }` cho chính selector đó, ngay dòng dưới.

**BH-14 · Đừng tách nhánh song song chỉ để "cho việc này đi riêng được".**
Gạo cho CTL-0011 tách từ `gopy-paste-anh` thay vì nối tiếp `dong-cua-so`, lý do
là để CTL-0008 phát hành riêng. **Lý do đó sai** — `git cherry-pick` cho CTL-0008
đi riêng mà **không cần** tách song song, nên cái giá phải trả là vô ích:
hai nhánh cùng chạm `chat-file-dinhkem` và `[hidden]`, phải rebase và kiểm lại.

Hại nặng hơn xung đột merge: nhánh song song **kiểm thử trên nền cũ**, không có
thay đổi của nhánh kia. Kết quả đo **không phản ánh hệ thống thật** sau khi ghép.
→ **Luôn nối tiếp. Muốn phát hành riêng thì dùng `cherry-pick`, đừng tách nhánh.**

**BH-15 · Đang có việc chưa commit thì cấm đổi nhánh.**
Khỉ Đột phát hiện nhánh sai gốc nhưng **không tự sửa** vì working tree có ~550
dòng chưa commit của phiên khác. Một lệnh `checkout`/`rebase` là xoá sạch.
→ Thứ tự bắt buộc: **làm nốt → commit → rồi mới rebase.** Người sửa phải là
**chủ của việc đang dở**, không phải người phát hiện.

## Về chi phí — miễn phí là ưu tiên số một

**BH-12 · Luôn tìm đường miễn phí trước khi nghĩ tới trả tiền.**
Gạo từng thiết kế vòng lặp bằng khoá API tính tiền, ước tính ~2 triệu/tháng.
Sếp bác. Hồ Ly tra tài liệu chính thức và tìm ra `CLAUDE_CODE_OAUTH_TOKEN` —
chạy bằng **gói Max công ty đã trả**, chi phí Claude về **0**.
→ **Trước khi đề xuất bất cứ thứ gì tốn tiền: đã tra hết cách miễn phí chưa?**
Hạn mức miễn phí thường đủ cho công ty 20 người.

**BH-13 · Hạn mức miễn phí phải có trần chặn, không để tự tràn sang trả tiền.**
GitHub Actions miễn phí 2.000 phút/tháng, ước tính xấu nhất ~1.800 — sát mép.
→ **Đặt trần trong code + đặt giới hạn chi tiêu = 0 ở nhà cung cấp.** Hai lớp.

**BH-20 · "Miễn phí" có hai loại — loại HẾT THÌ BÁO LỖI và loại HẾT THÌ TRỪ TIỀN.
Hạn mức đẹp không quan trọng bằng cửa vào có bắt gắn thẻ hay không.**
CTL-0013: R2 có hạn mức **tốt hơn** Google Drive về mọi mặt liên quan (10 GB, lấy
dữ liệu ra miễn phí, cùng nhà với Worker). Nhưng bật R2 phải qua luồng thanh toán
(*"You need a Cloudflare account with an R2 subscription"*) và chính sách
Cloudflare ghi rõ *"Ensure that you are using a valid payment method before...
enabling subscriptions"* — tức là **gắn thẻ công ty vào một dịch vụ tính theo mức
dùng, vượt là tự trừ.** Drive hết 15 GB thì API trả `storageQuotaExceeded`, không
trừ đồng nào.
→ **So phương án miễn phí thì cột đầu tiên không phải "bao nhiêu GB", mà là "hết
hạn mức thì nó BÁO LỖI hay TRỪ TIỀN".** Loại báo lỗi luôn thắng, kể cả khi hạn
mức nhỏ hơn. Và nếu buộc phải chọn loại trừ tiền → đó là `NEEDS_OWNER_DECISION`,
không phải quyết định kỹ thuật.

**BH-21 · Cơ chế báo lỗi chỉ chạy KHI hệ thống chạy thì không bắt được ca hệ
thống chết hẳn.**
Thiết kế sao lưu ban đầu chỉ có một lớp: bước nào lỗi thì gửi Telegram. Lớp đó
**im lặng tuyệt đối** nếu cron bị gỡ, Worker bị xoá, hay token bị thu hồi — đúng
kịch bản *"im lặng ba tháng rồi mới biết"*. Phải thêm lớp thứ hai **hỏi ngược
lại**: mỗi sáng kiểm *"có bản sao lưu của hôm qua không?"* — lớp này bắt được ca
mà lớp một không tồn tại để mà báo.
Cùng loại bẫy: OAuth của Google để nguyên trạng thái *"Testing"* thì refresh
token **hết hạn sau đúng 7 ngày** — hệ thống chạy tốt một tuần rồi chết, và
không có gì kêu.
→ **Với mọi thứ chạy nền: ngoài "báo khi hỏng", phải có "báo khi KHÔNG THẤY nó
chạy". Và tự hỏi cái gì trong hệ này hết hạn theo lịch mà không ai nhìn thấy.**

**BH-22 · Thiết kế phải bị chặn bởi hạn mức KỸ THUẬT, không chỉ hạn mức dung lượng.**
CTL-0013 suýt thiết kế "một lượt cron xuất cả bản sao lưu". Tra ra Workers gói
miễn phí cho **10 ms CPU cho mỗi Cron Trigger** — chờ D1 và chờ `fetch` không
tính, nhưng **ghép chuỗi CSV cho 40.000 dòng thì tính, và vượt chắc chắn.** Phải
chia lô 2.000 dòng/lượt ngay từ thiết kế, không phải tối ưu về sau.
→ **Khi tra hạn mức miễn phí, đừng chỉ tra dung lượng. Tra cả CPU/lượt, số
subrequest/lượt, số request/ngày** — cái giết tính năng thường là mấy con số đó,
không phải số GB. Và **con số ước lượng phải được Builder ĐO lại ở lượt chạy đầu
tiên**, ghi số thật vào báo cáo (BH-05), không ghi "chạy tốt".

## Về chốt chặn an toàn — cái khoá phải bị thử mới biết là khoá

**BH-23 · Chốt chặn an toàn HỎNG IM LẶNG còn nguy hơn không có chốt.**
CTL-0002a dựng cổng chặn Agent chạm file ngoài phạm vi. Hàm so khớp đường dẫn
làm bằng **4 lệnh `.replace()` nối tiếp**, và lệnh cuối (`*` → `[^/]*`) ăn luôn
dấu `*` trong `.*` mà lệnh trước vừa sinh ra. Mẫu `.github/**` biến thành
`.github/.[^/]*` và **không chặn được** `.github/workflows/deploy.yml` — đúng
file nguy hiểm nhất repo, đường thẳng ra production. Cổng vẫn in "✅ qua".

Đọc code không thấy được lỗi này. Chỉ bài kiểm chạy thật mới lòi ra.
→ **Mỗi chốt chặn phải có bài kiểm THỬ ĐÚNG THỨ NÓ PHẢI CHẶN, liệt kê từng
file cấm một.** Viết xong cổng mà chưa thử cho nó chặn thật thì coi như **chưa
có cổng**. Và đừng xâu chuỗi `.replace()` để dựng biểu thức — lệnh sau ăn kết
quả lệnh trước; duyệt một lượt.

**BH-24 · Nghiệm thu bằng `grep` thì chính bài kiểm cũng bị `grep`.**
SPEC-0003 nghiệm thu "chi phí bằng 0" bằng cách quét repo tìm tên khoá API tính
tiền và cờ CI bị cấm — thấy chuỗi đó ở đâu là trượt. Nhưng runner **phải biết
mặt hai thứ đó** mới từ chối chạy được, và bài tự kiểm **phải chứa chúng** mới
kiểm được. Viết nguyên văn là bài kiểm tự đánh trượt chính nó, và người đọc kết
quả sẽ tưởng hệ thống đang dùng khoá tính tiền thật.
→ **Chuỗi chỉ dùng để NHẬN DIỆN thì ghép từ mảnh**
(`['ANTHROPIC','API','KEY'].join('_')`), kèm chú thích "đừng dọn dẹp dòng này".
Và khi viết Acceptance dạng `grep`, **nói rõ file nào được miễn trừ** — không
thì người build bị ép chọn giữa "cổng khoá thật" và "phép kiểm sạch".

**BH-25 · Kiểm được bằng máy mình thì đừng kiểm bằng thứ tính tiền.**
Nghiệm thu runner đúng ra phải bấm chạy workflow thật — mà mỗi lượt chạy ăn
phút GitHub Actions, khoản duy nhất còn chạm tiền. Thay vào đó Khỉ Đột viết
`scripts/runner/tu-kiem.mjs` chạy ngoại tuyến: 100 phép kiểm đi hết các nhánh
nguy hiểm (hết token, risk HIGH, khung giờ, cổng diff, prompt phình), **0 phút
Actions, 0 token Claude**. Chính bài kiểm đó tìm ra BH-23.
→ **Tách phần logic thuần khỏi phần gọi mạng, rồi kiểm phần thuần trên máy.**
Để dành lượt chạy tốn tiền cho đúng thứ chỉ chạy thật mới biết.

*(Đính chính REV-0007: "100 phép kiểm" ở trên là lời khai, không phải số đo. Chạy
đúng commit `baa1787` ra **98 đạt · 2 hỏng**, tất định trên cả Windows lẫn Linux.)*

**BH-28 · Bài kiểm tự viết phải bị đo bằng MUTANT, không bằng số câu.**
Nghiệm thu CTL-0002a, Hồ Ly chép mã nguồn ra **28 bản, mỗi bản cố ý gỡ đúng một chốt
chặn**, rồi chạy chính `tu-kiem.mjs` của Khỉ Đột lên từng bản. **15/28 mutant lọt** —
trong đó có: thêm nguyên văn `git push origin HEAD:main` vào workflow, đổi
`permissions` thành `write-all`, xoá `timeout-minutes`, bỏ `--draft`, gỡ cổng chặn
risk HIGH, gỡ `AND g.risk = ?` khỏi truy vấn chọn việc, và `KILL_SWITCH` không chặn
gì nữa. Bài kiểm báo y hệt bản gốc, không một dòng đỏ. Nó kiểm rất tốt **tầng hàm
thuần** (phân loại lỗi, glob, prompt, khung giờ) và **mù gần như hoàn toàn tầng chốt
chặn + tầng nối dây** — đúng chỗ chứa cả 4 lỗi nặng của bản đó.
→ **"Bài kiểm đạt" không phải bằng chứng an toàn. Bằng chứng là: gỡ chốt ra thì bài
kiểm có đỏ không.** Trước khi dùng một bộ tự kiểm làm cổng phát hành, dựng mutant cho
**từng** tính chất an toàn đã hứa. Tính chất nào không có mutant bắt được thì tính
chất đó **chưa được kiểm**, dù có bao nhiêu dấu ✅ bên cạnh. Đây là BH-16 áp cho
chính bài kiểm, không phải cho code.

**BH-29 · Phép kiểm khớp phải CHÚ THÍCH thì nó đo chú thích, không đo code.**
Ba dòng của `tu-kiem.mjs` **luôn đạt bất kể code đúng sai**: `timeout-minutes: 30` và
`--draft` đều có mặt trong **chú thích đầu file YAML**, nên xoá hẳn chúng khỏi phần
thi hành vẫn ✅; còn dòng "không có quyền merge" cắt chuỗi giữa `permissions:` và
`concurrency:` rồi tìm chữ `merge` — xoá hẳn khối `permissions` thì chuỗi rỗng, vẫn
✅, và GitHub vốn **không có** quyền nào tên `merge` nên nó **về mặt cấu trúc không
thể hỏng**. Cùng bản này: bộ bỏ chú thích SQL `.replace(/--.*$/, '')` **không bỏ được
gì** trên file CRLF, vì `\r` là ký tự kết thúc dòng trong JS nên `.` không khớp nó và
`$` (thiếu cờ `m`) không khớp trước nó — gây 2 báo động giả, và làm phép kiểm "không
có DROP" soi nhầm cả chú thích.
→ **Quét mã nguồn để nghiệm thu thì phải BỎ CHÚ THÍCH TRƯỚC, và phải tự chứng minh
phép kiểm CÓ THỂ hỏng** — làm sai đúng thứ nó canh, thấy nó đỏ mới tính. Và **chuẩn
hoá xuống dòng bằng `.gitattributes` (`* text=auto eol=lf`)**: CRLF lọt vào blob là
mầm của cả hai lỗi phép-đo ở bản này.

**BH-30 · Chốt chặn phải ăn ĐẦU RA THẬT của công cụ, không ăn mảng do bài kiểm bịa.**
Cổng chặn file cấm của CTL-0002a được kiểm bằng mảng `{duong_dan, trang_thai:'M'}` do
chính bài kiểm dựng — nên nó **chưa bao giờ** thấy dạng dữ liệu thật thứ hai của
`git diff --name-status`: dòng **đổi tên** có **ba cột** (`R100  cũ  mới`). Code lấy
`phan[phan.length - 1]` = chỉ giữ **đường dẫn mới**, vứt sạch đường dẫn cũ; và `R100`
không bắt đầu bằng `D` nên phép chặn xoá file cũng không bắt. Đo trên git thật: đổi
tên `src/quyen.js` hoặc `wrangler.toml` → **lọt cổng**, mà cổng vẫn in *"✅ 1 file đã
đổi, tất cả trong phạm vi"*. Đổi tên `wrangler.toml` là deploy chết im lặng.
**Đúng cùng loại với BH-23**, sống thêm một vòng chỉ vì bàn thử dùng dữ liệu giả.
→ **Kiểm một cổng thì dựng repo/DB/file THẬT rồi cho nó ăn đầu ra thật của công cụ.**
Và với mọi công cụ, hỏi trước: *"lệnh này còn trả về dạng dòng nào nữa mà mình chưa
thấy?"* — `git` còn `R` (đổi tên), `C` (sao chép), và đường dẫn có dấu bị bọc ngoặc kép.

**BH-31 · `actions/checkout` để mặc định là ĐỂ SẴN CHÌA KHOÁ `main` ngay trong thư
mục Agent đang làm việc.**
CTL-0002a khai *"AI không bao giờ tự merge vào main"*, và đúng là không có dòng code
nào merge. Nhưng `actions/checkout@v4` mặc định `persist-credentials: true` — nó **ghi
thông tin đăng nhập của job vào `.git/config`** ngay trong thư mục làm việc, mà job có
`contents: write`, tức **đủ quyền push thẳng lên `main`**, và `main` nối thẳng
`deploy.yml` ra production. Cổng diff chỉ soi *nội dung diff*, không soi Agent đã chạy
lệnh gì. Thứ duy nhất thật sự chặn là **branch protection** — một nút bấm trên GitHub,
không nằm trong repo, không kiểm được bằng code.
→ **Mọi workflow thả Agent vào cây làm việc phải đặt `persist-credentials: false`**,
rồi cấp token riêng cho đúng bước cần đẩy. Rộng hơn: **một tính chất an toàn chỉ được
coi là "đã chặn" khi chỉ ra được DÒNG CODE hoặc CẤU HÌNH ĐÃ BẬT nào chặn nó.**
*"Không có dòng nào làm việc đó"* là mô tả hiện trạng, không phải chốt chặn — hiện
trạng đổi sau một lần sửa, chốt chặn thì không.

**BH-34 · Thêm một giá trị vào cột thì `grep` TÊN CỘT, đừng `grep` tên giá trị — và
chốt chặn mới chỉ chặn dòng SẮP TẠO, không dọn dòng ĐÃ CÓ.**
Hai nửa của cùng một lần trượt tay, đều lộ ra ở SPEC-0007 Đợt 1 (REV-0009).
*Nửa một (Khỉ Đột tự bắt được):* `src/index.js:572` sinh mã nhân sự bằng
`sinhMa(env, 'nhan_su_' + loai_lao_dong)` — khoá tra bảng được **ghép lúc chạy**, nên
`grep 'khoan_viec'` **không bao giờ** tìm ra chỗ đó; quên khai `nhan_su_khoan_viec`
trong `CAU_HINH_MA` là **mọi lần thêm người khoán việc đều ném lỗi**. → Thêm giá trị
vào một cột thì grep **tên cột**, rồi soi riêng những chỗ tên cột bị **nối chuỗi**
thành khoá tra bảng khác. Cách quét: liệt kê file bằng `git ls-tree` rồi lọc
`\('[a-z_]+' *\+` và `` `[a-z_]+_${ `` — toàn repo chỉ có đúng 1 chỗ, tìm hết trong
một lượt.
*Nửa hai (không ai bắt, phải đo mới thấy):* giá trị mới `khoan_viec` được dùng làm
**chốt chặn** — `ca.js` chỉ cho `ban_thoi_gian|thoi_vu` đăng ký ca, nên "0 dòng code
thêm" mà người khoán tự động không bị xếp ca. Đúng, nhưng **chỉ đúng với dòng sắp
tạo**. Người đã có `dang_ky_ca` `cho_duyet` và `lich_lam_viec` `da_xep` rồi mới chuyển
loại thì những dòng cũ **vẫn nằm nguyên, mà hàng để vẽ chúng thì đã bị lọc mất** — đăng
ký kẹt vĩnh viễn, ca vẫn chiếm chỗ, và `chotLich` vẫn khoá lịch đó vào bản chính thức
(đúng thứ BH-33 cảnh báo: ERP tự sản xuất bằng chứng ngược tờ hợp đồng).
→ **Mọi chốt chặn dựa trên một giá trị trong hồ sơ đều phải trả lời: "người ĐANG ở
trạng thái cũ, có dữ liệu cũ, thì dữ liệu đó đi đâu?"** Chặn ghi mới là nửa việc; nửa
còn lại là dọn hoặc **cho người ta THẤY** phần đã có. Và câu hỏi đó chỉ lộ ra khi
**dựng dữ liệu cũ rồi chạy thật câu truy vấn** — đọc code thì nó vô hình, vì phần thiếu
không nằm ở dòng nào cả.


**BH-35 · "Cột đã có sẵn" không có nghĩa là "dữ liệu đã có sẵn", và càng
không có nghĩa là "người dùng nhập được".**
Audit CTL-0015 chốt *"`ngay_sinh` ĐÃ CÓ SẴN → chỉ cần cron đọc, đây là việc rẻ
nhất"*. Đúng là cột có thật. Nhưng đo trên D1 local thì **0 người đang làm có
`ngay_sinh`**, và quét repo thì cột đó chỉ được ghi ở **một** chỗ — luồng nhận
hồ sơ mới. 24 người đang ở trong hệ thống thì không có đường nào nhập. Phát
hành như vậy thì cron chạy đủ, log sạch, không một dòng lỗi, và **im lặng mãi
mãi**. BH-32 đã dạy phải kiểm **cả hai chiều** của một cột; bài này thêm chiều
thứ ba: → **Trước khi xây tính năng lên một cột có sẵn, hỏi ba câu chứ không
phải một: ① cột có tồn tại không · ② có ai ĐỌC ra không · ③ hôm nay có BAO
NHIÊU DÒNG có giá trị thật, và người dùng nhập giá trị đó Ở MÀN HÌNH NÀO?**
Câu ③ chỉ trả lời được bằng cách `COUNT(*)` trên DB thật — đọc schema không bao
giờ thấy.

**BH-36 · Xây màn nhập liệu thì phải kiểm NGƯỜI SẼ NHẬP có mở được màn đó không.**
Bộ năng lực suýt chỉ có form chấm nằm trong hộp Hồ sơ nhân sự — hộp đó gác sau
`them_nhan_su`. Nhưng người chấm cho 29 bạn kho là **anh Duy, vai trò
`quan_ly_kho`, không có `them_nhan_su`**: đúng người duy nhất cần dùng lại là
người duy nhất không vào được. Lỗi này đọc code không thấy, vì code chạy đúng
100% — nó chỉ chạy đúng cho một người không có việc gì để làm ở đó. → **Sau khi
đặt một màn nhập vào sau một cửa quyền, tra ngược `QUYEN_THEO_VAI_TRO` xem
NGƯỜI THẬT sẽ nhập mang vai trò gì, và vai trò đó có qua cửa không.** Human
Cost (Rule 12) hỏi "tốn mấy phút"; câu này hỏi trước đó một bước — *"người ấy
có bấm vào được không"*.

**BH-37 · Đồng hồ giả phải đi qua THAM SỐ, không đi qua ghi đè `Date.now`.**
Bàn thử Đợt 2 lần đầu ghi đè `Date.now` để giả ngày. Nó **không khống chế được
gì**: `new Date()` đọc thẳng đồng hồ máy, không gọi `Date.now`. Thêm nữa hàm
khôi phục chạy **trước** khi promise xong. Kết quả: 6 phép kiểm về Chủ nhật /
ngoài giờ / bản tin tháng đều **báo ✅ giả**. Suýt kết luận "code đúng" trong
khi bàn thử chưa bao giờ chạy đúng ngày mình nghĩ. Cùng họ BH-17. → **Với mọi
logic phụ thuộc thời gian, để lộ một tham số `luc = new Date()` ở cửa vào và
cho bàn thử truyền mốc giả vào đó.** Một dòng mã sản phẩm, đổi lại là bàn thử
chạy được mọi ngày trong năm. Và khi một phép kiểm thời gian *"tự nhiên đạt"*,
kiểm ngay xem đồng hồ giả có thật sự tác dụng không — in `duocGuiNhac(vn).ly_do`
ra trước khi tin.

**BH-38 · Ca "không có kết quả" và ca "chưa có dữ liệu" phải trả về HAI câu
khác nhau.** Màn *"ai thay được người này"* nếu trả một danh sách rỗng thì
người xếp ca đọc ra *"không ai thay được"* → điều động gấp, gọi người từ nhà.
Nhưng sự thật có thể là *"người này chưa được chấm năng lực nào"* → việc phải
làm là **chấm**, không phải điều động. Cùng một mảng rỗng, hai hành động ngược
nhau, và hệ thống không nói ra thì người dùng đoán — thường đoán sai. Áp cùng
chỗ khác: *"chưa có hợp đồng trong ERP"* ≠ *"không có hợp đồng"*; *"chưa nạp
migration"* ≠ *"không có dữ liệu"*. → **Mỗi màn tra cứu phải phân biệt được ba
trạng thái: có kết quả · không có kết quả · chưa có dữ liệu để mà tra** — và
nói thành ba câu riêng. Bàn thử phải có ca cho **cả ba**, không chỉ ca có kết quả.

**BH-39 · Đưa một màn ra khỏi cửa quyền thì phải đưa cả ĐƯỜNG DỮ LIỆU của nó ra theo.**
Đây là phần tiếp của BH-36, và là lỗi CHẶN PHÁT HÀNH của REV-0010. Màn "Chấm năng
lực" đã được dời ra ngoài khối `them_nhan_su` cho đúng anh Duy — nhưng ô chọn người
vẫn ăn `DS_NHAN_SU_DOC`, nạp từ `GET /api/nhan-su`, mà câu SQL nhánh "không xem
lương" **không chọn cột `dang_lam` ra**. Dòng lọc `.filter(n => n.dang_lam)` bên
dưới thế là quét sạch mọi người. Kết quả: đúng người duy nhất cần dùng mở được màn,
và thấy một ô rỗng. 136 phép tự kiểm ngoại tuyến đều xanh, vì bàn thử tự dựng dữ
liệu giả nên **không bao giờ đọc hình dạng thật của phản hồi API**. → **Khi một màn
phục vụ hai vai trò đi hai đường dữ liệu khác nhau (`A ? DS_X : DS_Y`), phải so
từng khoá của hai đường đó — chứ không chỉ kiểm màn có hiện ra không.** Và cách duy
nhất bắt được: **đăng nhập bằng đúng vai trò yếu nhất rồi bấm thử**. Đọc code không
thấy, vì code chạy đúng 100% — nó chỉ chạy đúng cho vai trò không cần đến nó.

**BH-40 · Trần thiết kế phụ thuộc ĐỘ NẶNG MỖI DÒNG, không chỉ số dòng.**
Bổ sung cho BH-22. Bàn thử CTL-0013 gieo một bộ dữ liệu nặng bất thường (22 cột,
mọi dòng đều có ô nhiều dòng) và đẩy một lô 2.000 dòng lên **p95 10,65 ms — chạm
đúng trần 10 ms**, trong khi cùng số dòng với dữ liệu thường chỉ mất ~4,5 ms.
→ **Khi chốt một trần thời gian theo "bao nhiêu dòng một lô", phải nói rõ nó ứng
với dòng nặng cỡ nào.** Bảng nhiều cột chữ dài (`cong_viec`, `thong_bao`) ăn gấp
đôi bảng mã ngắn cùng số dòng. Đo trần bằng bảng nhẹ nhất rồi đem áp cho mọi
bảng là tự đặt bẫy cho chính mình.

**BH-41 · `PRAGMA defer_foreign_keys` là lệnh RỖNG khi ở ngoài giao dịch — và
"xoá rồi ghi lại" mà không có giao dịch thì không có đường lùi.**
Lỗi CHẶN của REV-0014. File `KHOI-PHUC.sql` sinh ra có `PRAGMA defer_foreign_keys
= ON;` rồi 11 câu `DELETE FROM` rồi hàng loạt `INSERT`, **không có `BEGIN`/
`COMMIT`**. Đo thật: chạy với `foreign_keys = ON` → `FOREIGN KEY constraint
failed`; cho lệnh chết giữa chừng → `nhan_su` từ 600 dòng còn **0 dòng, không
hoàn tác**. Bọc thêm `BEGIN`/`COMMIT` vào đúng file đó → hết cả hai lỗi.
→ **Mọi kịch bản "xoá trắng rồi ghi lại" đều phải nằm trong một giao dịch** —
vừa để `defer_foreign_keys` có chỗ mà hoãn, vừa để còn đường lùi khi đứt gánh
giữa đường. Đây còn là bẫy hay tái phát: **đường phụ đã làm đúng (`--vao-sqlite`
có đủ `BEGIN`/`COMMIT`/`ROLLBACK`) mà đường CHÍNH — đường tài liệu dạy Sếp dùng
— lại bị bỏ sót.** Bàn thử xanh vì SQLite mặc định TẮT `foreign_keys`; phải
**chủ động bật `PRAGMA foreign_keys = ON` trong ca thử** thì mới lộ ra.

> ⚠️ **Đính chính BH-41 (REV-0015, 2026-08-28):** câu *"bọc thêm `BEGIN`/`COMMIT` vào
> đúng file đó"* chỉ đúng với **công cụ SQLite thường** (sqlite3, DB Browser, `node:sqlite`).
> Với **D1** thì ngược hẳn: D1 **cấm** `BEGIN` và **tự bọc** cả file. Phần còn lại của
> BH-41 vẫn đúng. Xem BH-42.

**BH-42 · Người soi cũng sai được — và số đo thắng lập luận, kể cả lập luận của người soi.**
REV-0014 (Hồ Ly) chặn phát hành CTL-0013 vì `KHOI-PHUC.sql` thiếu `BEGIN`/`COMMIT`, và ép
một bản vá: bọc giao dịch **vô điều kiện**. Lập luận đúng với SQLite chuẩn, nghe rất chắc,
và **sai**. Khỉ Đột không nghe theo — nó đi đo trên D1: ① D1 **cấm** lệnh `BEGIN`
(*"please use the state.storage.transaction() … instead of … BEGIN"*, mã thoát 1, **không
ghi một dòng nào**); ② D1 **tự bọc** cả file trong một giao dịch — cho file lỗi giữa chừng
thì `DELETE` bị hoàn tác, **3/3 dòng cũ còn nguyên**. Làm đúng lời người soi thì đường
khôi phục CHÍNH của Sếp *chết hẳn*. Vòng 4 Hồ Ly tự đo lại cả hai: khớp từng con số, và
đính chính công khai trong REV-0015.
→ **Kết luận của Review Gate không phải mệnh lệnh, nó là một giả thuyết có thẩm quyền.**
Người build có quyền — và có nghĩa vụ — **bác lại bằng số đo**, không bằng cãi. Ngược lại,
người soi phải **đo trên đúng nền tảng đích** trước khi phát lệnh CHẶN: SQLite ≠ D1,
"chuẩn SQL" ≠ cái runtime thật cho phép. Và khi sai thì **đính chính công khai ngay trong
bản review kế tiếp**, ghi rõ chỗ sai — không im lặng sửa.

**BH-45 · Phép đo CHỌN TAY chỉ đo được cái mình đã nghĩ ra. Nó không đo được cái mình quên.**
CTL-0023 Đợt 1 đổi bảng màu và tự viết `do-tuong-phan-mau.mjs` để chứng minh. Bộ 28 cặp
chữ–nền **do người ngồi liệt kê**: mọi cặp đều ĐẠT, báo cáo nói "sạch". REV-0024 dựng phép
đo riêng và lòi ra ba chỗ **kho đọc hằng ngày** vẫn trượt — `.tag-new` 3.58:1,
`.mt-the-pct.warn` 3.23:1, `.xc-ngay-tt.du_thua` 4.04:1 — cộng một khối `:root` **thứ hai**
mà phép đo **không hề biết là có**. Không phải đo sai: đo **đúng 28 thứ mình nhớ ra**, trên
tổng số 81 chỗ dán cứng màu.
→ Phép đo phải **TỰ QUÉT nguồn**, không nhận danh sách. Bản mới bổ CSS thành **589 luật lá**,
tự dựng **204 cặp** (luật nào có `color` thì phải trả lời được "nền của mày là ai") và gom
**mọi** khối `:root`. Nó bắt lại đủ cả ba chỗ trên mà không ai phải nhớ.
→ Hệ quả thứ hai, đắt hơn: phép đo cũng **không đo cái nó không được giao đo**. `--bg` đổi
màu rất đẹp trong khi `var(--bg)` chỉ được dùng **đúng một lần** trong 2.474 dòng, còn
`.main` — nền thật của mọi màn làm việc — thì dùng `--surface`. Mọi cặp ĐẠT, mọi tầng ĐÚNG,
**và Sếp mở lên vẫn thấy y hệt cũ.** Nên phép đo giờ **đọc thẳng nền `.main` từ CSS** rồi so
ΔL\* với mặt thẻ: câu hỏi không phải "màu có đúng chuẩn không" mà **"đổi xong Sếp có NHÌN
THẤY khác không"**. Đo chuẩn mà trượt mục đích thì vẫn là trượt.


**BH-46 · Một token gánh HAI VAI thì sửa vai này hỏng vai kia — và phép đo chỉ nhìn một vai sẽ KHEN cái đang hỏng.**
CTL-0023 Đợt 1 hạ `--ink` từ `#3f4d33` xuống `#1e2417` để chữ dễ đọc hơn. Phép đo tương phản
reo hò: mọi cặp chữ–nền tốt lên, `--ink` trên thẻ trắng đạt **15,13:1**, không một cặp nào rớt
ngưỡng, REV-0024 và REV-0025 đều **PASS**. Sếp mở lên và nói: *"đéo mẹ **đen thùi lùi**"*.
Vì `--ink` **vừa là màu CHỮ vừa là NỀN thanh bên**. Hạ nó xuống làm chữ sáng hơn thì đồng thời
kéo thanh bên xuống **L\* 13,23** — một khối gần đen rộng 244px chắn suốt chiều cao màn hình,
nuốt trọn cảm giác "sáng sủa" mà cả Đợt 1 đánh đổi để có. **Phép đo không hề sai một con số
nào.** Nó chỉ đo đúng cái vai mà nó biết là có: "chữ này trên nền kia có đọc được không". Nó
không có câu hỏi *"cái token này còn được dùng làm gì nữa?"* — nên vai thứ hai hỏng ngay dưới
mũi nó mà bảng đo vẫn toàn chữ ĐẠT.
→ **Token có hai vai là NỢ, không phải tiết kiệm.** Trước khi đổi giá trị một token, đếm nó
được dùng làm **màu chữ** bao nhiêu lần và làm **nền** bao nhiêu lần. Ra cả hai thì **tách token
trước, đổi giá trị sau** — Đợt 2 tách `--sidebar-bg` ra khỏi `--ink`, nền thanh bên đi từ
**L\* 13,23 → 97,97**, và `--ink` từ đó chỉ còn đúng một vai.
→ **Hệ quả cay hơn, suýt lọt:** chính `do-tuong-phan-mau.mjs` cũng **dán cứng** `T('ink')` làm
nền cho mọi selector `.sb-*`. Đổi thanh bên sang sáng mà không sửa bàn đo thì nó **nói dối theo
CẢ HAI CHIỀU**: chữ tối MỚI bị chấm trên nền gần đen → báo "tàng hình" hàng loạt; còn bộ chữ
sáng CŨ (`#8fc47a`, trắng .55…) — thứ trên nền kem chỉ còn **1,04–1,93:1**, tàng hình thật —
lại được khen ĐẠT. Bàn đo có hằng số về thiết kế thì **nó chỉ đúng cho tới lần đổi thiết kế kế
tiếp**. Đọc token, đừng dán cứng màu.
→ Và đúng vòng này, ca đối chứng bắt được **lỗi thật của người viết**: bản nháp cho mục menu
đang chọn hover TỐI đi theo phản xạ, trong khi chữ ở đó là chữ TỐI — ra **3,24:1**, trượt.
Hướng hover phụ thuộc **màu chữ**, không phụ thuộc thói quen. Cùng vòng, 10 con số tôi viết vào
chú thích CSS mà **chưa đo** đều lệch thật (98,42 vs 97,97 · 15,5 vs 15,13 · 5,41 vs 5,30…) —
`getComputedStyle` trên DOM thật mới lòi ra. **Số chưa đo thì đừng viết ra như số đã đo.**
**BH-44 · TRẦN LÝ THUYẾT KHÔNG PHẢI SỐ ĐO. Ghi lẫn hai thứ đó vào tài liệu còn tai hại
hơn không ghi gì.**
REV-0031, Khỉ Đột khai: *"ERP đang gọi ~240.000 request/ngày, vượt hạn mức 100.000 của
Workers miễn phí"*. Con số 240.000 **không đo từ đâu cả** — nó là phép nhân "20 người ×
mở tab liên tục 10 tiếng × 6 giây/lượt", tức **trần lý thuyết của trường hợp xấu nhất**.
Hồ Ly bác bằng một ràng buộc có sẵn trong chính hệ thống: **mọi** API có đăng nhập đều đi
qua `batBuocDangNhap` → `docPhien` → **ít nhất 1 lượt đọc D1**. Mà `read_queries_24h` đo
thật chỉ **46.597**. Nếu thật có 240.000 request thì con số đó phải ≥ 240.000. **Lệch ~5
lần. ERP CHƯA hề vượt hạn mức request** — thứ đang vỡ thật là **lượt GHI D1**
(358.604 / 100.000 = 3,59 lần), và chỉ nó thôi.
→ Cùng một báo cáo mà có **cả số đo lẫn số ước lượng** thì phải **dán nhãn từng con số**:
`wrangler d1 info` là ĐO, phép nhân trong đầu là DỰ PHÓNG. Trộn lẫn thì người đọc sau sẽ
**đi tối ưu cái chưa hỏng** và bỏ mặc cái đang hỏng — mất đúng thứ đắt nhất là thời gian
của Sếp.
→ Mẹo kiểm rẻ tiền, dùng được ngay: **tìm một con số ĐÃ ĐO mà con số đang khai BẮT BUỘC
phải kéo theo.** Ở đây "request có đăng nhập" bắt buộc kéo theo "lượt đọc D1"; số đo nhỏ
hơn nhiều lần là lời khai sai, không cần tranh luận thêm.

**BH-45 · Đổi NGHĨA một cột là đổi nghĩa MỌI chỗ đọc cột đó — kể cả chỗ mình không sửa.**
REV-0031 làm cron chỉ ghi khi dữ liệu thật sự đổi. Hệ quả kèm theo: `dong_bo_luc` từ
"lần cuối cron chạy qua" **hoá thành** "lần cuối đơn này ĐỔI". Khỉ Đột thấy hệ quả đó, sửa
`hoanLichSu` (`LIMIT 500`) — **rồi dừng lại**, bỏ sót `apiDanhSach` trong `src/shopee.js`
(`ORDER BY dong_bo_luc DESC LIMIT 300`) — **màn Kho vận**. Trước khi đổi nghĩa, mọi dòng
cùng một giá trị nên cắt 300 là cắt **ngẫu nhiên**, vô hại. Sau khi đổi nghĩa, 300 dòng
giữ lại là 300 đơn **đổi gần nhất**, đơn bị cắt là đơn **lâu nhất không đổi** — tức đúng
**đơn tồn quá hạn**, thứ kho cần thấy nhất. Cắt ngẫu nhiên hoá thành **cắt thiên vị có hệ
thống chống lại đường tiền**, và chỉ nổ khi hàng đợi vượt 300 → **bẫy chờ**, không ai thấy
ngay.
→ Đổi nghĩa một cột thì việc bắt buộc là **grep tên cột trên TOÀN repo rồi trả lời từng
chỗ một**, không phải sửa những chỗ mình nhớ ra. Nguy hiểm xếp theo thứ tự: **① `ORDER BY`
+ `LIMIT` (mất dòng, im lặng) → ② `WHERE` lọc theo cột → ③ `ORDER BY` trần (chỉ đổi thứ
tự) → ④ hiển thị**. ① là chỗ giết người vì màn hình vẫn đầy dữ liệu, không lỗi, không cảnh
báo — chỉ thiếu đúng dòng cần nhất.
→ Và đừng chỉ sửa: **để lại máy quét**. `scripts/do-hangdoi-khovan.mjs` tự quét `src/`,
bắt mọi chỗ "ORDER BY … dong_bo_luc … LIMIT" (bỏ chú thích, tự kiểm bằng mẫu vi phạm giả)
— lần sau ai thêm `LIMIT` vào là bàn đo đỏ ngay, không trông vào trí nhớ ai cả.

**BH-47 · MÀN HÌNH CẮT IM LẶNG KHÔNG PHẢI MÀN HÌNH THIẾU DỮ LIỆU — NÓ LÀ MÀN HÌNH NÓI
DỐI.** Chị Vũ Lan Hương (HCNS) báo *"không hiển thị hết công việc public ở mục Việc cần
làm"*. Đọc mã thì **nguyên nhân không phải `LIMIT`** mà là **bộ lọc phạm vi**: `cvDanhSach`
lọc `WHERE nguoi_nhan_id = ?`, còn khối "Tổng quan việc toàn công ty" thì
`if (!TOI.la_admin) return` — **biến mất sạch, không một dòng chữ**. Chị lại **vốn có
quyền** xem toàn bộ việc công ty ở tab *Lịch sử làm việc* (mở cho MỌI vai trò, `quyen.js`)
— chỉ là **không chỗ nào chỉ đường**. ERP không thiếu việc; ERP thiếu **một câu nói**.
→ Danh sách trống vì lọc quyền thì người dùng còn đoán ra; danh sách **đầy mà bị cắt** thì
không ai đoán được — vì màn hình đang **khẳng định** "đây là tất cả". Ô đếm `#ls-dem` của
Lịch sử đơn hoàn in `500/500` trong khi bảng có **523** dòng: mẫu số lấy từ mảng ĐÃ BỊ
CẮT, nên nó tự làm chứng cho chính lời nói dối của mình. **Mẫu số phải là tổng THẬT,
không bao giờ là `mảng.length` sau khi cắt.**
→ Ba quy tắc rút ra: ① **cắt thì phải nói ra** — *"đang hiện 300 trong tổng 523"* + đường
xem tiếp; ② **lọc theo quyền/phạm vi cũng phải nói ra** — *"bảng này chỉ hiện việc của
bạn"* + chỉ sang chỗ họ vốn được xem, KHÔNG mở thêm quyền; ③ **đừng bỏ `LIMIT` bừa** —
đổi một lời nói dối lấy một màn hình treo thì không lời hơn. Cách đếm tốn 0 đồng: hỏi
`LIMIT trần + 1`, thừa đúng một dòng là biết "còn nữa", **lúc đó** mới chạy `COUNT(*)`.
→ Bẫy chết người của chính cách vá này: viết `LIMIT ${GH}` thay vì `LIMIT ${GH + 1}` thì
`biCat` **vĩnh viễn false**, mọi thứ lặng lẽ quay về như cũ — không lỗi, không cảnh báo.
`scripts/do-cat-im-lang.mjs` §④ canh đúng chỗ đó.
→ Lưới cả lớp: `npm run do-cat-im-lang` quét `src/` + `public/`, và **bảng MIỄN TRỪ chính
là hàng đợi** — mỗi dòng bắt buộc có lý do viết ra, và máy **tự báo chết** dòng miễn trừ
nào không còn che một vi phạm có thật (miễn trừ chết = giấy thông hành miễn phí cho lỗi
sau). Máy tự kiểm bằng **3 mẫu vi phạm giả + 5 mẫu sạch** trước khi được tin — vòng chạy
đầu nó tố oan đúng **hai** chỗ: một `LIMIT 300` nằm trong **ghi chú cảnh báo** của
`shopee.js`, và một `s.slice(0,10).split('-')` cắt **chuỗi ngày**. Máy quét đọc cả ghi
chú là máy quét sẽ bị người ta tắt đi.


**BH-48 · BỘ ĐỐI CHỨNG DO CHÍNH NGƯỜI DỰNG LƯỚI TỰ CHỌN THÌ NÓ CHỈ CHỨA ĐÚNG LOẠI LƯỚI ẤY
BẮT ĐƯỢC.** `scripts/do-cat-im-lang.mjs` (BH-47) tự kiểm bằng **3 mẫu vi phạm giả + 5 mẫu
sạch** rồi in "SẠCH". Hồ Ly soi lại, **tự viết 5 mẫu vi phạm kiểu khác** — máy quét bắt
**đúng 1**. Bốn kiểu lọt: `'… LIMIT ' + biến` (ghép chuỗi, không template), `.slice(0,
ĐỊNH_DANH)` (tham số không phải chữ số), `for (i<30)` / `.splice(30)`, và nặng nhất:
**handler khai bằng `export const x = async (…) => {}`** — `tachHam()` chỉ nhận `function`
ở cột 0 nên **cả `src/dulieunen.js` vô hình với máy quét** (22/43 hàm nhìn thấy). Hôm ấy
tệp đó chưa có `LIMIT` nào, nên **không ai thấy gì cả**: một **lỗ chờ**, mai ai thêm là máy
vẫn xanh.
→ **Lưới thủng thì câu "đã quét sạch" là vô nghĩa** — tệ hơn không quét, vì nó dập tắt
đúng cái nghi ngờ đáng giữ. Số "0 vi phạm" chỉ có nghĩa khi đi kèm số **"lưới nhìn thấy
bao nhiêu phần kho mã"**.
→ Cách chữa, làm được ngay: ① liệt kê **theo KIỂU CẮT** chứ không theo một cú pháp
(`LIMIT <số>` · `LIMIT ${…}` · `LIMIT ?` · `LIMIT` ghép chuỗi · `.slice(0,N)` · `.slice(-N)`
· `.splice(N)` · `.length = N` · `for (i<N)` · `Math.min(N,…)`); ② **mỗi kiểu bắt buộc có
một mẫu vi phạm trong bộ tự kiểm** — xoá mẫu nào là mở lại đúng lỗ đó; ③ **nhờ người khác
viết mẫu**, và khi họ viết ra thì **thêm cả bộ của họ vào bàn đo**, đừng chỉ vá rồi kể lại;
④ đo **độ phủ của chính cái lưới** (ở đây: 675 → 710 hàm nhìn thấy, +35).
→ Rộng ra hơn `LIMIT`: mọi máy quét tĩnh trong kho mã này đều phải trả lời được hai câu —
*"mày bắt được mấy trên mấy kiểu?"* và *"mày nhìn thấy bao nhiêu phần kho mã?"*. Không trả
lời được thì màu xanh của nó không phải bằng chứng.

**BH-49 · ĐỪNG VIẾT CÂU CHỈ ĐƯỜNG TRƯỚC RỒI KIỂM MÃ SAU.** Trong chính commit chống nói
dối (BH-47), dải cắt của *Lịch sử làm việc* in *"Dùng ô tìm kiếm phía trên để lọc đúng
việc cần xem"* — mà ô đó lọc **phía trình duyệt** trên đúng 500 dòng đã tải (`DS_LSCV`),
**không với tới 200 việc bị cắt**. Dải *Lịch sử đơn hoàn* mắc y hệt: *"dùng ô tìm theo mã
đơn nếu cần tra đơn cũ"*. **Chỉ người ta đi tìm ở chỗ không có còn tệ hơn không chỉ gì
cả** — người không tìm thấy sẽ kết luận "hệ thống mất dữ liệu", đúng cái hiểu sai mà bản
vá sinh ra để dập.
→ Câu chữ chỉ đường là một **lời hứa về hành vi của phần mềm**, phải kiểm bằng mã (hoặc
bằng bàn đo) **trước** khi viết, y như mọi con số. Một câu an ủi viết theo cảm giác thì
cùng loại với `#ls-dem` in `500/500`.
→ Đã sửa: `cvLichSu`/`hoanLichSu` nhận con trỏ `?truoc=` → nút **"Tải thêm N … cũ hơn"**
gọi lại **máy chủ** thật. Bàn đo `npm run do-duong-di-tiep` (D1 thật, worker thật, tài
khoản `hcns` của chị Lan Hương, 700 việc) chứng minh: trang 2 ra **200 dòng mới, 0 trùng,
đủ 700 id, không sót**, và **ca đối chứng** gọi lại không kèm `truoc` phải ra y hệt trang 1
— thiếu ca đó thì "nút chạy được" có thể chỉ là trang 1 hiện lại hai lần.

**BH-50 · DẢI LUÔN HIỆN PHẢI TRẢ TIỀN THUÊ CHỖ BẰNG PIXEL.** Dải PHẠM VI (*"ba bảng dưới
đây chỉ hiện việc của bạn…"*) là một dải **luôn hiện** — khác dải cắt, vốn chỉ hiện khi
thật sự có cắt. Bản đầu 4 dòng chữ + một nút riêng: **148,8px ở 375px, 169px ở 320px**,
tức mất ~2–3 dòng bảng **mỗi lần vào màn**, kể cả khi không có gì bị cắt, trên đúng màn
hình nhân viên kho cầm một tay. Trái đúng nguyên tắc chính chúng ta vừa viết vào `app.js`:
*"một dải luôn hiện là một dải mắt người học được cách bỏ qua trong đúng một tuần"*.
→ Gọn còn **một dòng, cả dải LÀ cái nút** (vẫn 44px cho ngón tay), câu đầy đủ đẩy vào
`title=`: **52px** ở cả hai bề ngang, và số dòng bảng thấy được **tăng** 5→7 (375×667) và
2→5 (320×568). Ràng buộc "không làm nhân viên kho cuộn thêm" chỉ có nghĩa khi **đo bằng số
dòng thấy được**, không phải bằng thiện chí.
→ Bàn đo `npm run do-nut-dai-cat` nay dựng luôn **khung "bản trước"** chép nguyên văn CSS
cũ, nên "gọn đi bao nhiêu" là **số đo hai bên**, không phải lời khai một bên.
**BH-44 · Che ở trình duyệt không phải phân quyền. Ẩn nút chỉ là hàng rào giấy.**
Vòng 2 của cổng duyệt góp ý trả **đủ** ruột nội bộ (mức rủi ro, link PR, ghi chú riêng) cho
mọi người xem được dòng đó, rồi nhờ một biến trong `app.js` che đi. Mở tab Network là đọc
được. Cùng lỗi ấy lặp ở tầng nút bấm: giấu nút "Duyệt" của anh Phong mà `POST
/api/gop-y/duyet` vẫn nhận — gọi thẳng API là qua.
→ Máy chủ **ngừng gửi** (xoá hẳn khoá khỏi JSON, không đặt `null`) và **ngừng nhận** (403 ở
handler). Giao diện chỉ đi theo cho đỡ vô nghĩa, không bao giờ là chỗ chặn.

**BH-47 · Một cái cờ quyền, NĂM cửa tắt được nó. Bịt đúng cửa người ta chỉ cho là bịt hụt.**
REV-0027 chỉ ra 3 cửa vòng qua cổng duyệt góp ý; đi tìm tiếp thì ra **6**. Guard "không tắt
cái cờ cuối cùng" nằm chặt ở `quyen-duyet-gopy`, nhưng cờ sống trên một **dòng
`tai_khoan`** — mà dòng đó thì `khoa-tai-khoan` khoá được, `xoa-tai-khoan` xoá được,
`xoa-nhan-su` xoá kèm được, và `dat-lai-mat-khau` **trả thẳng mật khẩu tạm** cho người gọi
(cửa nặng nhất: không vượt cổng mà **mượn danh tính** — hồ sơ duyệt ghi tên Sếp trong khi
Sếp không hề bấm). Cùng khuôn ở tầng dữ liệu: hai cửa **ghi đè `next_owner`** kéo việc đã
lên Sếp tụt về cổng 1 mà **không ai cố ý**.
→ Hỏi "**cái quyền này SỐNG Ở ĐÂU, và có bao nhiêu đường chạm được vào chỗ đó?**" rồi liệt
kê **hết** đường, gọi từng đường bằng tư cách kẻ bị tước quyền. Và bàn đo phải có ca cho
từng đường: bản cũ chạy **45 ĐẠT / 0 TRƯỢT** mà không bắt được một lỗi nào trong sáu —
bàn đo xanh mà lỗi vẫn còn thì **bàn đo là thứ đầu tiên phải sửa** (bản mới: **90 phép**, 10
ca đối chứng, cây cũ chấm lại **65 ĐẠT / 25 TRƯỢT**).
→ *Đính chính (REV-0030):* bản đầu của bài học này ghi "89 phép" và "64/25" — **lệch số đo
thật**. Số trong lời khai phải đúng bằng số chạy ra, kể cả khi lệch 1 và "chỉ là chữ": người
sau đọc lời khai để quyết định có tin bàn đo hay không.

**BH-48 · Thứ tự triển khai dựa vào trí nhớ con người là thứ sẽ sai một ngày nào đó.**
`docPhien()` đọc `t.duyet_gopy` không phòng thủ: quên nạp migration trước khi deploy code
là **500 toàn hệ thống** — nhân viên kho chẳng dính gì tới góp ý cũng mất đăng nhập (đo:
`/toi-la-ai`, `/danh-ba`, `/thong-bao`, `/kho/san-pham` — 4/4 đường 500). "DB trước, code
sau" vẫn đúng, nhưng nó là **quy trình**, không được là **điều kiện sống còn**.
→ ~12 dòng `try/catch` bắt đúng `no such column` rồi chạy lại với `0 AS duyet_gopy`: thiếu
cột thì cờ về `false` — **hỏng theo chiều an toàn**, hệ thống chạy tiếp ở mức không-quyền.
Cùng nguyên tắc cho migration: backfill bắt hụt phải **gãy to** (`CHECK constraint failed:
backfill_duyet_gopy_phai_bat_dung_1_nguoi`), không được báo thành công rồi để cả hàng chờ
đứng mà không ai biết.

**BH-49 · Vá xong một cột thì đi hỏi tiếp: CÒN CỘT NÀO NỮA ĐANG GÁNH VIỆC NÀY? — và mọi
nhánh "nuốt lỗi cho êm" đều phải có một đường kêu.**
REV-0027 bịt cửa "lưu tại chỗ ghi đè `next_owner`" và tuyên bố hàng chờ của Sếp đã an toàn.
REV-0030 tìm ra **cùng một lỗi ở cột bên cạnh**: SLA đo tuổi hàng chờ bằng `cap_nhat_luc`,
mà **mọi** câu UPDATE — kể cả nhánh lưu tại chỗ vừa vá — đều ghi `cap_nhat_luc = now`. Đo
được: việc chờ cổng 1 từ 23/08, admin bấm "giao người phụ trách" → `200` → cron **không**
đẩy lên Sếp nữa; chặn-rồi-gỡ-chặn cho kết quả y hệt. **Lặp vô hạn, không một dòng cảnh báo,
nổ cả khi không ai cố ý** — và nó phá đúng một trong ba chỗ đỡ mà ADR-0015 đã hứa với Sếp
cho rủi ro "một người duyệt".
→ Gốc bệnh là **một cột gánh hai nghĩa**: "sửa lần cuối lúc nào" và "vào hàng chờ từ lúc
nào" không phải một thứ. Tách hẳn thành `cho_duyet_tu_luc`, chỉ đóng dấu khi việc THẬT SỰ
sang hàng chờ mới. Sau khi vá một cơ chế, đếm lại **tất cả** các cột mà cơ chế ấy đọc và
hỏi từng cột "ai ghi được vào mày?" — vá `next_owner` mà quên đồng hồ thì lời hứa với Sếp
vẫn là lời hứa giả.

→ **Cùng vòng, cùng họ — hỏng theo chiều an toàn mà IM LẶNG thì mới hỏng được một nửa.**
`docPhien()` nuốt lỗi thiếu cột rất gọn (BH-48) — nhưng đo tiếp thì: `thong_bao` **+0**,
Telegram **+0**, `console` **0 dòng**. Cả công ty chạy tiếp ở mức không-quyền, cả hàng góp ý
đứng, **và không ai biết vì sao**. Cùng loại: khôi phục một bản sao lưu chụp **trước**
migration làm cờ `duyet_gopy` về 0 toàn bộ — ERP không tự bật lại được, cũng không kêu một
tiếng nào.
→ Mỗi nhánh "nuốt lỗi cho êm" phải kèm **một đường kêu**: `console.warn` (Workers Logs đang
bật `[observability]`) **+** một tin Telegram, chống lặp bằng đúng khuôn
`INSERT OR IGNORE INTO sao_luu_canh_bao (khoa)` đã có sẵn — 1 tin/ngày, không phải mỗi
request một tin. Và thêm chốt **tự phát hiện** cho trạng thái chết người ("không còn ai
duyệt được") ngay trong cron 5 phút đã có: ba câu SQL, chi phí 0.

→ **Và "đường cứu" chưa ai chạy thử thì chưa phải đường cứu.**
ADR-0015 kê một lệnh `wrangler` làm đường cứu khi Sếp mất máy. Đọc kỹ và thử thì lệnh ấy
**cứu được cái cờ, không cứu được lối vào**: `mat_khau_hash` là PBKDF2, không gõ tay ra
được. Và `scripts/tao-tai-khoan.mjs` **không dùng thay được** — nó ghi `seed.sql` **xoá sạch
dữ liệu cũ**, chạy trên bản thật là mất công ty. Tức là suốt thời gian đó, **quên mật khẩu +
hỏng đường khôi phục = không còn cách nào vào**, mà không ai biết.
→ Viết đường cứu thì phải **chạy thử đường cứu**, và bàn đo phải chứng minh nó **không phá
gì**: chụp cả CSDL trước/sau, so từng bảng, kèm ca đối chứng cho chính phép so đó (cố tình
xoá một bảng — phép đo có bắt được không?). Cùng tinh thần với đường khôi phục đăng nhập
mới: **gửi bí mật đi trước, ghi CSDL sau** — gửi hỏng thì không đụng gì, chứ đổi mật khẩu
rồi mới phát hiện không gửi được là khoá chết tài khoản bằng chính đường cứu.

**BH-52 · Hoàn tác phải trả lại ĐỦ mọi thứ cú bấm đã đụng vào — thiếu một cột là mở lại
đúng cái cửa vừa bịt. Và "khó vá" không phải lý do, trừ khi đã ĐO.**
REV-0030 bịt cửa 14 (đồng hồ hàng chờ bị đẩy lùi bằng một cú lưu tại chỗ). REV-0032 tìm ra
**cửa 17**: `gopYHoanTac()` trả lại 12 cột nhưng **không** trả lại `cho_duyet_tu_luc`. Đo
được: góp ý chờ cổng 1 từ 23/08 → cấp 1 bấm **"duyệt"** rồi **"hoàn tác"** ngay → việc về
`QL_CAP1` mà đồng hồ ở lại 28/08 → cron **0 tin**, lặp 3 vòng vẫn thế. Tuổi hàng chờ 5 ngày
tụt về 0 bằng **một cặp bấm**, nổ cả khi không ai cố ý — đúng bằng cửa 14, chỉ khác cần cẩu.
→ Ảnh chụp để hoàn tác phải phủ **mọi cột mà cú bấm ghi vào**, kể cả cột do một hàm phụ ghi
(`gopYDongDauChoDuyet()` ghi ngoài câu UPDATE chính nên bị bỏ sót). Sau khi thêm một cột có
"tác dụng phụ", đi hỏi ngay: **đường lùi có trả lại nó không?**
→ Bài học đắt hơn nằm ở lời khai: Khỉ Đột khai lỗi này "mất tối đa 15 phút" (tưởng đồng hồ
chỉ lùi trong cửa sổ hoàn tác) và từ chối vá vì *"phải đưa cột mới vào câu SELECT nóng của
`gopYDuyet` = đúng rủi ro L4"*. **Cả hai đều sai, và cái sai thứ hai nghe hợp lý hơn cái
sai thứ nhất** — vá thật chỉ cần **một câu SELECT riêng** bọc `try/catch` nuốt
`no such column`, đúng khuôn vừa tự viết ở `gopYDongDauChoDuyet()`, **10 dòng, không đụng
câu SELECT nóng một chữ**. Nói *"chưa làm được, đây là lý do"* thì được; kê **một lý do kỹ
thuật nghe hợp lý mà chưa đo** thì đó là né, và nó tiêu đúng cái uy tín mà ba lần bác lại
bằng số đo mới xây được.

**BH-53 · Bản vá đẻ ra mặt hỏng mới thì bản vá phải tự dọn — và chốt an toàn phải canh cả
người ĐI ĐẶT CHÌA, không chỉ người dùng chìa.**
Đường khôi phục đăng nhập (REV-0030) thay bản 403 cứng, và mang theo hai lỗ mà bản 403
**không có**: ① không kiểm `TELEGRAM_CHAT_ID_SEP !== TELEGRAM_CHAT_ID` — dán nhầm chat id
**nhóm chung** là phát mật khẩu của Sếp cho cả công ty, API vẫn `200` êm ru; ② không có chốt
nhịp — mỗi cú bấm sinh mật khẩu mới **và** `DELETE FROM phien`, nên bấm liên tục là khoá Sếp
ra khỏi ERP không giới hạn.
→ Khi thay một cái chặn cứng bằng một đường đi tinh vi hơn, liệt kê **cái gì bản cũ làm
được mà bản mới không** — mặt hỏng mới luôn nằm ở đó.
→ Lỗ ① hiểm ở **người**, không ở máy: người đi đặt secret chính là người đang bị giữ bí mật,
nên đặt nhầm là chuyện **sẽ** xảy ra. Chốt phải kiểm **lúc dùng** (ngay trên đường đi của bí
mật), không phải lúc cài — secret đổi được bất cứ lúc nào mà mã không hay biết.
→ Lỗ ② dạy thêm: chốt nhịp không cần bảng mới. Mốc nhịp đọc thẳng từ **dòng sự kiện của lần
trước** (`nhan_su_lich_su`) — 0 migration, và mốc nằm trong sổ nên người sau đọc được. Chặn
thì phải **báo cho người bị ảnh hưởng**, nhưng đúng **một tin mỗi cửa sổ**, kẻo chính cái
báo lại thành spam mới.

**BH-54 · `rl.question()` gặp EOF thì TREO, không ném — `try/catch` quanh nó là chốt giả.**
`scripts/dat-lai-mat-khau.mjs` bọc câu hỏi xác nhận trong `try/catch` và chú thích *"CI/cron
→ EOF → cũng DỪNG"*. Đo riêng: stdin đóng thì **3 giây không trả về**, và sẽ treo mãi —
`node:readline/promises` không ném khi luồng vào hết, nó im lặng chờ. Chú thích **nói sai**
về hành vi thật còn tệ hơn không có chú thích (Rule 10).
→ Bắt đúng tín hiệu EOF: `rl.once('close', …)` rồi ném — readline **có** phát sự kiện đó.
→ Và mọi câu "hỏng theo chiều an toàn" phải **đo bằng cách gây ra ca hỏng đó**, kể cả khi
nó nằm trong một script tay ai cũng nghĩ là chuyện vặt: script dừng phải **thoát khác 0**,
không phải treo — treo trong cron là giữ chỗ mãi mãi mà không ai biết.

**BH-55 · `shell: true` TẮT cơ chế bọc nháy của `execFile` — và bàn đo `import` hàm thì
không bao giờ thấy điều đó.**
`scripts/dat-lai-mat-khau.mjs` gọi `execFileSync('npx', args, { shell: true })`. Bật `shell`
thì Node không bọc nháy từng đối số nữa mà nối tất cả bằng dấu cách rồi ném cho `cmd.exe`/`sh`
— câu SQL có khoảng trắng bị cắt vụn, wrangler ném `Unknown arguments: t.id,, …`. Đường cứu
cuối cùng cho tình huống Sếp không đăng nhập được **chưa từng chạy được lần nào**, mà bàn đo
vẫn xanh vì nó chỉ `import` hai hàm sinh SQL.
→ Đối số có khoảng trắng thì **đừng cho đi qua vỏ lệnh**. Không có cách bọc nháy nào đúng cho
cả hai vỏ: `"` của `cmd` không chặn `%`, `"` của `sh` không chặn `$` (mà hash là
`pbkdf2$100000$…`).
→ Trên Windows, **bỏ `shell: true` không thôi là chưa đủ**: `npx` ở đó là `npx.cmd`, và Node
từ 18.20.2 cấm chạy `.cmd` khi `shell` tắt — đo được: `npx.cmd` → `EINVAL`, `npx` → `ENOENT`.
Cách chạy được ở mọi vỏ: gọi **thẳng file JS của công cụ bằng chính `node`**
(`execFileSync(process.execPath, [duongDanCLI, …])`).
→ Và bài học lớn hơn (nối BH-47): **`import` một hàm KHÔNG PHẢI là chạy script.** Script tay
cũng phải được bàn đo **spawn thật, trong tiến trình riêng, trên dữ liệu thật**, đủ cả đường
huỷ lẫn đường thành công — kèm ca đối chứng giữ nguyên lỗi cũ để biết phép đo có mắt.

**BH-56 · Chốt an toàn HỎNG thì phải ĐÓNG, và so định danh phải so theo KIỂU của hệ thống
sở hữu nó.**
Hai lỗ cùng một họ, cùng nằm trên đường phát mật khẩu tạm: ① chốt nhịp đọc mốc trong
`try/catch` rồi đi tiếp với `null` — mất bảng `nhan_su_lich_su` là chốt **tắt âm thầm**, chỉ
còn một dòng log; ② so hai chat id **bằng chuỗi**, mà Telegram đọc `chat_id` thành số nguyên
64-bit, nên `-01002222` và `-1002222` là **cùng một nhóm** lại lọt.
→ Cái gì đang canh một việc nguy hiểm mà **không tự kiểm được** thì trả lời "không", không
trả lời "chắc là được". Từ chối là hướng an toàn: mật khẩu cũ vẫn dùng được, chỉ chậm lại.
→ Chiều không rút lại được (mật khẩu **đã** gửi, mốc ghi hụt) thì tối thiểu phải **kêu ra chỗ
người khác nhìn thấy**, không nuốt bằng một dòng `console.error`.
→ So định danh của hệ thống ngoài thì so theo kiểu dữ liệu **của hệ thống đó**, không theo
kiểu mình đang cầm: `BigInt` cho chat id Telegram, và chỉ lùi về so chuỗi khi không phải số.

**BH-57 · Chỗ Sếp chỉ tay hiếm khi là chỗ hỏng duy nhất — và `break-word` KHÔNG cứu được ô
flex.**
Sếp Ngọc gửi ảnh thanh cuộn ngang **trong chat**. Đo ra bong bóng chat vốn đã đúng: nó có sẵn
`word-break: break-word`, chuỗi 100 ký tự dính liền vẫn xuống dòng gọn. Thủ phạm thật là hai
thứ Sếp **không** chỉ vào: ① *thanh chat* là `<input type="text">` — thẻ một dòng thì không
CSS nào bắt nó xuống dòng được, gõ 133 ký tự ra `scrollWidth` 1034px trong ô rộng 232px; và
cả ERP có **12** ô cùng kiểu nhận 120–2000 ký tự. ② không có chốt chặn từ-dài toàn cục: bơm
một link Shopee vào bất kỳ khung chữ nào thì **cả 6 tab** phình từ 375px ra 654–991px.
→ Sửa đúng chỗ được chỉ là sửa 1/13. **Đo cả lớp trước khi vá**: liệt kê mọi chỗ cùng cơ chế,
rồi mới quyết vá ở đâu.
→ `overflow-wrap: break-word` cho chữ xuống dòng nhưng **không hạ min-content**, mà bề rộng
tối thiểu của một ô flex/grid lấy đúng min-content — nên từ dài vẫn banh rộng cả hàng flex,
chữ bên trong xuống dòng cũng vô ích. Đã đo: đặt `break-word` toàn cục xong hai tab **vẫn**
tràn 1071px và 971px. Phải `anywhere`, rồi trả riêng `table, table *` về `break-word` để cột
bảng không vỡ — **kèm ca đối chứng "bảng nhiều cột vẫn cuộn ngang được"**, nếu không lần sau
có người "sửa cho triệt để" và làm vỡ hết bảng mà không ai biết.
→ Phép đo phải **nhìn thấy thứ nó khai**: 11/12 ô nằm trong hộp thoại đang đóng, mà phần tử
ẩn thì cao 0px — đo thẳng là bàn đo XANH vì nó chẳng nhìn thấy gì. Phải gỡ tạm `hidden`, đo,
rồi trả lại nguyên trạng, và **đếm đủ 12/12 mới cho xanh**.

*(BH-45 · BH-46 — số đã dùng ở nhánh `feature/ctl-0023-dot2-cam` cho hai bài học khác
["Phép đo CHỌN TAY…", "Một token gánh HAI VAI…"]. Cố ý bỏ trống ở đây để hai nhánh gộp vào
không đè nhau — xem REV-0030. Đây không phải chỗ trống để điền.)*
