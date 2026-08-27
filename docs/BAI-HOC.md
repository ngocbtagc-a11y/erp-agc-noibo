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
