# ADR-0007 — Bốn quyết định của Gạo: hạn mức token, danh tính runner, chính sách nhắc việc

- **Ngày**: 2026-08-27
- **Người quyết định**: **GẠO — Team Lead** (theo quyền Sếp Ngọc trao cùng ngày)
- **Trạng thái**: ĐÃ QUYẾT — Sếp lật lại bất cứ lúc nào
- **Nguồn**: Hồ Ly nêu 4 câu M1/M2/N1/N2 sau khi viết SPEC-0003 và SPEC-0004
- **Thẩm quyền**: [TEAM-LEAD-PROTOCOL.md](../TEAM-LEAD-PROTOCOL.md) mục 0

> Sếp: *"Từ sau mày tự đánh giá và lựa chọn phương án tối ưu nhất, nghĩ cho kỹ
> vào sau đó bảo 2 đứa kia nó làm."*
>
> Bốn câu này **không** thuộc nhóm phải đưa Sếp: không câu nào phát sinh chi tiêu
> (phương án C của M1 có, và đã bị loại), không câu nào đụng dữ liệu thật hay
> pháp lý. Gạo quyết, ghi lại đầy đủ lý do và phương án đã loại.

---

## M1 — Máy chạy vào lúc nào · **QUYẾT: chỉ chạy NGOÀI GIỜ LÀM**

Runner ăn chung hạn mức Claude Max với tài khoản người đứng tên token. Nếu chạy
giờ hành chính, có lúc Sếp mở Claude ra làm việc riêng thì báo hết token vì máy
vừa chạy xong mấy việc.

**Quyết định:** runner chỉ chạy **18h–8h hôm sau, và cả ngày nghỉ**.
Giờ hành chính (8h–18h) hạn mức thuộc trọn về người thật.

**Lý do:** không tốn thêm đồng nào, mà xoá sạch xung đột. Việc của máy vốn không
gấp — góp ý duyệt buổi chiều, sáng hôm sau đã có bản chờ nghiệm thu, vẫn nhanh
hơn hiện trạng rất nhiều lần.

**Đã loại:**
- *Chạy cả ngày, giới hạn 12 lượt/ngày* — vẫn tranh hạn mức với Sếp đúng lúc Sếp
  cần nhất; con số 12 là đoán mò, không dựa trên dữ liệu nào.
- *Mua gói riêng cho máy* — **chạm tiền**. Sếp đã cấm phát sinh chi tiêu
  ([ADR-0006](ADR-0006-cong-duyet-va-chi-phi-token.md) A4). Không xét.

**Ngoại lệ:** việc `P0` (sập production · bảo mật · toàn vẹn dữ liệu) được chạy
bất kể giờ. Sập hệ thống thì không chờ tới 18h.

## M2 — Token đứng tên ai · **QUYẾT: Sếp Bùi Thị Ngọc**

**Lý do:** tài khoản của Sếp, máy của Sếp, Sếp là ERP Owner. Chọn người khác là
kéo thêm một người vào chịu ràng buộc mà họ chưa đồng ý.

**Đã loại:** *Giám đốc Nguyễn Duy Phong* — runner sẽ ăn hạn mức Claude của anh
Phong, và anh Phong đang học thêm Marketing nên dùng Claude nhiều. **Cần anh
Phong đồng ý trước**, mà đó không phải việc Gạo hay Hồ Ly quyết thay.
Nếu Sếp muốn đổi sang phương án này, nói một câu là đổi.

**Việc chỉ Sếp làm được** (Gạo bị cấm đụng vào thông tin đăng nhập):
1. Cài Claude Code CLI một lần: `npm i -g @anthropic-ai/claude-code`
2. Chạy `claude setup-token` → sinh token sống 1 năm
3. Dán vào GitHub Secrets tên `CLAUDE_CODE_OAUTH_TOKEN`

## N1 — Máy có nhắc cả người quản lý (gồm Sếp) không · **QUYẾT: CÓ**

Việc nằm ở "Chờ duyệt" quá 2 ngày → máy nhắc **người duyệt**, kể cả khi người
đó là Sếp.

**Lý do:** lỗ hổng quên việc đau nhất là **lỗi của người duyệt** — nhân viên làm
xong, nộp lên, rồi người giao quên duyệt. Nhân viên tưởng xong, Sếp tưởng chưa
làm. Không nhắc người duyệt thì bỏ sót đúng chỗ hỏng nhất.

Quan trọng hơn: hệ thống chỉ soi nhân viên là **công cụ giám sát**, và sẽ mất
sạch uy tín ngay lần đầu tiên Sếp là người chậm. Công ty chạy theo MBOs —
cùng một thước đo cho mọi người, không có ngoại lệ theo chức vụ.

## N2 — Nhân viên có được tự tắt nhắc việc không · **QUYẾT: ĐƯỢC**

Được tắt nhắc hằng ngày. Nhưng: Sếp nhìn thấy ai đã tắt, và **leo cấp lên quản
lý vẫn chạy bình thường**.

**Lý do:** không cho tắt trong ERP thì họ tắt chuông ở điện thoại — lúc đó mất
sạch khả năng nhìn thấy, tệ hơn nhiều. Cho tắt trong app là giữ được quyền kiểm soát.

**Tắt nhắc không tắt trách nhiệm.** Việc vẫn trễ, vẫn hiện trên màn của quản lý,
vẫn leo cấp.

---

## Hai cảnh báo bảo mật — bắt buộc xử lý trước khi bật runner

**C1 — Token gói thuê bao NGUY HIỂM HƠN khoá API.**
`CLAUDE_CODE_OAUTH_TOKEN` lộ ra là lộ quyền vào **cả tài khoản Claude của người
đứng tên**, không chỉ một khoá tính tiền tách biệt. Chỉ để trong GitHub Secrets,
**không bao giờ** viết vào file, log, hay gửi qua chat/Telegram.

**C2 — Nếu GitHub Secrets đang có `ANTHROPIC_API_KEY` thì phải XOÁ.**
Để đó là có ngày hệ thống lặng lẽ dùng nó và phát sinh tiền — đúng thứ Sếp cấm.
Gạo **không kiểm được từ máy này** (chưa cài `gh` CLI). Sếp tự kiểm ở
`Settings → Secrets and variables → Actions` của repo `erp-agc-noibo`.

**C3 — Cấm cờ `--bare`.** Đây là bẫy: `--bare` là cờ Anthropic khuyến nghị cho
CI nhưng nó **không đọc** token gói thuê bao, hệ thống sẽ âm thầm rơi về đòi
khoá API. Ghi thành điều cấm cứng trong SPEC-0003.

## Khoản tiền duy nhất còn lại — phút chạy GitHub Actions

Repo riêng tư, hạn mức miễn phí 2.000 phút/tháng. Trần lý thuyết xấu nhất
~1.800 phút → sát mép. Hồ Ly đã đặt `MAX_PHUT_ACTIONS_THANG = 1200`.

**Việc Sếp làm:** đặt **spending limit = 0** cho GitHub Actions
(`Settings → Billing → Spending limits`). Hết phút thì dừng, không tự tính tiền.
Đây là chốt chặn cuối, không phải tuỳ chọn.

---

## Hệ quả cho Khỉ Đột

- SPEC-0003: thêm khung giờ chạy 18h–8h + ngày nghỉ, ngoại lệ `P0`.
- SPEC-0004: nhắc cả người duyệt (N1); có công tắc tắt nhắc cho từng người,
  hiển thị cho Sếp thấy ai tắt, leo cấp không bị ảnh hưởng (N2).
- Cả hai: đọc lại ADR này trước khi code, đừng hỏi lại những câu đã chốt ở đây.
