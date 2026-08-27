# CTL-0013 — Kho tài liệu ("bộ não doanh nghiệp") + Sao lưu toàn bộ dữ liệu

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `NEW_FEATURE` (2 phần liên quan nhau)
- **Priority**: **P2** — nhưng phần Sao lưu là **P1** (mất dữ liệu là không cứu được)
- **Risk**: **HIGH** — dữ liệu nhạy cảm, lưu trữ ngoài, rủi ro phát sinh chi phí
- **Status**: `READY_FOR_ANALYSIS`
- **Current Owner**: GẠO → **Next Owner**: HỒ LY

---

## 1. Yêu cầu gốc

> *"Xây cho tao 1 kho lưu trữ tài liệu bản scan, như 1 bộ não doanh nghiệp.
> Sau đó hãy cho tao thêm 1 cái gì đó để lưu trữ backup toàn bộ dữ liệu của công
> ty, an toàn, dễ dùng, nếu AI là các công cụ thì tao cần 1 chỗ lưu chung để sau
> này thay đổi công cụ là dùng được ngay."*

Tách rõ hai phần:

- **Phần A — Kho tài liệu**: nơi cất bản scan giấy tờ, tra ra được khi cần.
- **Phần B — Sao lưu**: bản chụp toàn bộ dữ liệu công ty, để nơi khác, **đọc
  được mà không cần ERP**.

## 2. Câu quan trọng nhất Sếp nói

> *"nếu AI là các công cụ thì tao cần 1 chỗ lưu chung để sau này **thay đổi công
> cụ là dùng được ngay**"*

Sếp đang nói về **không bị khoá chân vào công cụ**. ERP, Claude, Cloudflare —
đều là công cụ, đều có thể thay. Dữ liệu thì không được thay.

**Đây là ràng buộc kiến trúc, không phải mong muốn.** Nó quyết định thiết kế:

### Quyết định kiến trúc của Gạo: ERP làm MỤC LỤC, kho file để NGOÀI

```
   ERP (D1)                       KHO NGOÀI
   ┌──────────────────┐          ┌────────────────────┐
   │ Mục lục          │          │ File thật          │
   │ • tên tài liệu   │ ───────► │ • PDF, ảnh scan    │
   │ • loại giấy tờ   │  đường   │ • CSV, JSON        │
   │ • ngày cấp/hết   │   dẫn    │                    │
   │ • gắn với ai/gì  │          │ Sếp mở được bằng   │
   │ • ai tải lên     │          │ điện thoại, không  │
   └──────────────────┘          │ cần ERP            │
                                 └────────────────────┘
```

**Vì sao không nhét file vào ERP:** nhét vào là khoá chân. Bỏ ERP là mất tài
liệu. Để ngoài thì đổi ERP, đổi AI, đổi gì cũng được — **file vẫn nằm đó, mở
bằng điện thoại là ra.**

Hiện ERP đang nhét ảnh base64 thẳng vào D1 (giới hạn 800KB — ảnh đại diện, CCCD,
minh chứng khiếu nại). Cách đó **không dùng lại được** cho tài liệu scan.

## 3. Bộ não doanh nghiệp gồm giấy tờ gì

Alpha Green Commerce là **TMĐT thực phẩm nhập khẩu**. Bộ giấy tờ là **tài sản
cạnh tranh thật** — Sếp tự xác định lợi thế là *"sản phẩm có đầy đủ giấy tờ
pháp lý thực phẩm"*. Mất hoặc hết hạn là mất lợi thế.

| Nhóm | Ví dụ | Gắn với |
|---|---|---|
| Pháp lý doanh nghiệp | ĐKKD, con dấu, giấy phép | Công ty |
| An toàn thực phẩm | Giấy phép ATTP, tự công bố sản phẩm, HACCP/ISO của NCC | Sản phẩm · NCC |
| Nhập khẩu | Tờ khai hải quan, C/O, chứng thư kiểm dịch, COA | Lô hàng · Sản phẩm |
| Nhà cung cấp | Hợp đồng, phụ lục, báo giá | NCC |
| Nhân sự | Hợp đồng LĐ, CCCD, bằng cấp, quyết định | Nhân sự |
| Kế toán | Hoá đơn, chứng từ, tờ khai thuế, BHXH | Kỳ kế toán |
| Vận hành | Hợp đồng thuê kho, bảo hiểm, hợp đồng vận chuyển | Công ty |
| Sàn TMĐT | Hồ sơ đăng ký gian hàng, giấy tờ nộp Shopee/TikTok | Kênh bán |

### Điểm Gạo thấy mà Sếp chưa nêu: **NGÀY HẾT HẠN**

Giấy phép ATTP hết hạn · tự công bố sản phẩm hết hiệu lực · hợp đồng NCC đến hạn
tái ký · CCCD nhân viên hết hạn · bảo hiểm kho hết hạn.

**Một kho tài liệu chỉ để cất là tủ hồ sơ. Biết nhắc trước khi hết hạn mới là
bộ não.** Sàn TMĐT khoá gian hàng vì giấy tờ hết hạn là mất doanh thu thật.

→ Trường **ngày hết hạn** là bắt buộc, và **nối thẳng vào cơ chế nhắc việc
SPEC-0004** đang xây. Không dựng cơ chế nhắc thứ hai (Rule 5).

## 4. RÀNG BUỘC SỐ MỘT: CHI PHÍ = 0

> Sếp 27/08: *"cực kỳ quan trọng, ko đc dùng linh tinh tốn tiền của tao...
> nhớ là chi phí 0 cho tao"*

**Hồ Ly phải XÁC MINH bằng tài liệu chính thức, dẫn nguồn, không đoán** (BH-03):

| Cần biết | Vì sao |
|---|---|
| Cloudflare **R2** — bật có cần thẻ tín dụng không? Hạn mức miễn phí bao nhiêu GB, có phí lấy dữ liệu ra không? | `wrangler.toml` ghi R2 **chưa bật** trên tài khoản (21/08/2026). Nếu bật phải gắn thẻ → **rủi ro tiền, cân nhắc kỹ** |
| **Google Drive** — 15GB miễn phí. Truy cập được từ Cloudflare Worker không? Cần loại xác thực nào? | Công ty đã có tài khoản Google. Sếp mở được bằng điện thoại — hợp tiêu chí "dễ dùng" |
| Hạn mức **D1** miễn phí | Mục lục nằm ở D1, cần biết trần |
| Ước lượng dung lượng thật | Bao nhiêu tài liệu/tháng × dung lượng trung bình? Bao lâu thì đầy 10GB / 15GB? **Tính con số, đừng đoán** |

**Không có con số → không được duyệt.**

## 5. Phần B — Sao lưu: yêu cầu cứng

1. **Định dạng mở.** CSV hoặc JSON. Mở bằng Excel được. **Không** dùng định dạng
   riêng của ERP hay của bất kỳ công cụ AI nào.
2. **Tự chạy**, không phụ thuộc ai nhớ bấm. Tái dùng cron 5 phút đã có, chạy
   ngày một lần.
3. **Giữ nhiều bản theo ngày.** Ghi đè một bản duy nhất là vô dụng — hỏng dữ
   liệu hôm nay thì bản sao lưu hôm nay cũng hỏng theo.
4. **Sếp tự phục hồi được**, hoặc ít nhất tự mở ra xem được, không cần lập trình viên.
5. **KIỂM TRA PHỤC HỒI.** Bản sao lưu chưa từng thử phục hồi = **không phải bản
   sao lưu**, chỉ là file rác cho yên tâm. Phải có quy trình thử định kỳ.
6. **Báo khi hỏng.** Sao lưu thất bại phải báo ngay, không im lặng. Im lặng ba
   tháng rồi mới biết là thảm hoạ.

## 6. Bảo mật — đây là chỗ nguy hiểm nhất

Kho này chứa **CCCD nhân viên · hợp đồng lao động · lương · hợp đồng nhà cung
cấp · chứng từ thuế**. Rò rỉ là chuyện pháp lý, không phải chuyện kỹ thuật.

Hồ Ly phải trả lời:

1. **Ai được xem gì?** Kế toán trưởng xem chứng từ thuế được, nhưng có được xem
   hợp đồng lao động của người khác không? Anh Duy xem CCCD nhân viên kho được không?
   → Dùng `quyen.js` sẵn có, **không bịa vai trò mới**.
2. **Đường dẫn file có đoán được không?** Ai có link là mở được, hay phải đăng nhập?
   Link công khai đoán được = rò rỉ toàn bộ.
3. **Bản sao lưu có dữ liệu nhạy cảm.** Ai chạm được vào chỗ chứa nó?
4. **Ai tải cái gì, lúc nào** — có ghi vết không? (Rule 8)
5. **Xoá tài liệu** — cho xoá hẳn hay chỉ ẩn đi? Giấy tờ pháp lý xoá nhầm là
   không lấy lại được (Rule 10 — History Must Survive Change).

## 7. Hồ Ly phải trả lời thêm

1. **Tra tìm thế nào?** Sếp cần *"giấy phép ATTP của sản phẩm X"* thì tìm ra sau
   mấy thao tác? Tìm theo tên, theo loại, hay theo thứ nó gắn vào?
2. **Gắn tài liệu vào cái gì?** ERP đã có `nhan_su`, `san_pham`, `nha_cung_cap`,
   `tai_san`. Tài liệu nên **gắn thẳng vào các bản ghi đó** — mở hồ sơ nhân viên
   là thấy hợp đồng của họ luôn (Rule 2 — Enter Once, Reuse Everywhere).
3. **Ai tải lên?** Kho scan xong ai đưa vào? Từ điện thoại được không? Nhân viên
   kho chụp bằng điện thoại là đường vào chính, không phải máy quét ở văn phòng.
4. **Human Cost** (Rule 12): mỗi tài liệu tốn bao nhiêu thao tác để đưa vào?
   Quá 3 bước là không ai làm, kho sẽ rỗng sau 2 tuần. **Đây là câu quyết định
   tính năng này sống hay chết.**
5. **Chia đợt thế nào?** Đợt 1 làm gì để **dùng được ngay trong tuần**? Đừng
   thiết kế một hệ hoàn hảo 3 tháng nữa mới xong (Rule 15 — Ship → Use → Measure).
6. **Có làm được không nếu KHÔNG bật R2?** Phải có phương án dự phòng, không
   phụ thuộc một nhà cung cấp duy nhất — đúng tinh thần "đổi công cụ vẫn dùng được".

## 8. Ràng buộc

- **Chi phí 0.** Chạm tiền là `NEEDS_OWNER_DECISION`, dừng lại.
- **Định dạng mở**, không khoá chân công cụ. Đây là yêu cầu chính của Sếp.
- Tái dùng `quyen.js`, `thong_bao`, cron sẵn có, cơ chế nhắc của SPEC-0004.
- **Không** dựng cơ chế nhắc hạn thứ hai.
- Không đụng `gop_y`, `cong_viec`, `app.js` vùng đang có người sửa (Rule 13).
- Ngày hết hạn phải nối vào SPEC-0004, không tách riêng.

## 9. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Kho tài liệu scan + sao lưu toàn bộ, không khoá chân công cụ |
| `NEW` | `READY_FOR_ANALYSIS` | GẠO | 2026-08-27 | Chốt kiến trúc **ERP làm mục lục, file để ngoài** — đây là cách duy nhất thoả yêu cầu "đổi công cụ là dùng được ngay". Bổ sung **ngày hết hạn** (Sếp chưa nêu): giấy phép ATTP / tự công bố hết hạn là bị khoá gian hàng, mất doanh thu thật |
