# CTL-0025 — Chuông "đơn hoàn quá 12h chưa nhận" CHƯA TỪNG KÊU cho đơn Shopee

- **Requester**: HỒ LY (phát hiện khi soi REV-0033), Khỉ Đột dựng phiếu 2026-08-28
- **Category**: `BUG` — mất tiền thật, im lặng
- **Priority**: **P1** — Shopee là **kênh bán chính** của công ty
- **Risk**: MEDIUM (đụng luồng đồng bộ Shopee + đường tiền của kho vận)
- **Status**: `READY_QUEUE` — Gạo xếp hàng đợi
- **Next Owner**: KHỈ ĐỘT
- **Ngoài phạm vi** nhánh `fix/nut-lui-dong-44px` — lỗi **có sẵn từ trước**,
  không do REV-0031/REV-0033 gây ra. **Cố ý KHÔNG vá trong bản này** để bản
  đang chờ đẩy không phình thêm rủi ro.

---

## 1. Hiện tượng

Chuông Telegram *"⚠️ ĐƠN HOÀN QUÁ 12H CHƯA NHẬN — CẦN KIỂM TRA/KHIẾU NẠI"*
**chưa từng kêu cho một đơn Shopee nào**. Nó chỉ kêu cho đơn TikTok.

Trớ trêu: chính đoạn dựng tin nhắn đã viết sẵn nhánh in ra `Sàn: Shopee`
(`src/index.js:2832`) — code được viết với giả định Shopee cũng chạy, nhưng
điều kiện bật chuông thì không bao giờ đúng với Shopee.

## 2. Bằng chứng

Toàn bộ mốc đếm nằm ở **một cột duy nhất**: `don_hoan.cho_kho_nhan_tu`
(`migrations/them-canhbao-kho.sql:4` — *"mốc bắt đầu đếm 12h khi sàn báo khách
đã gửi về"*).

**Chỉ có ĐÚNG MỘT lệnh trong toàn repo đặt cột đó** — và nó chốt cứng TikTok:

```
src/tiktok.js:280
  UPDATE don_hoan SET cho_kho_nhan_tu = datetime('now','+7 hours')
   WHERE nguon='tiktok' AND cho_kho_nhan_tu IS NULL AND kho_nhan_luc IS NULL
     AND trang_thai='BUYER_SHIPPED_ITEM'
```

Quét lại toàn repo (`grep -rn cho_kho_nhan_tu src/ migrations/ public/`):
không có lệnh nào khác ghi cột này — **không** ở `src/shopee.js`, **không** ở
trigger, **không** ở migration. Đơn Shopee vì vậy luôn có
`cho_kho_nhan_tu = NULL`.

## 3. Hai cơ chế cùng chết theo, không phải một

Cả hai đều đòi `cho_kho_nhan_tu IS NOT NULL`, nên với đơn Shopee cả hai đều
**không bao giờ chạy**:

| Cơ chế | Chỗ | Hậu quả với đơn Shopee |
|---|---|---|
| Chuông Telegram quá **12h** chưa nhận | `src/index.js:2827` `kiemTraCanhBaoHoan` | **Không ai được báo.** Kiện hàng mất/ shipper quẹt giao khống → quá hạn khiếu nại với sàn/ĐVVC → **mất trắng tiền hàng** |
| Tự đẩy sang Vận hành sàn sau **24h** | `src/index.js:2861` `kiemTraDayVanHanh` | Đơn nằm lại sân kho **vô thời hạn**, không ai chủ động tra soát (đúng thứ Sếp Ngọc chốt 19/08/2026 để tránh) |

Kèm theo, huy hiệu *"quá N giờ"* trên màn Kho vận (`public/assets/js/app.js:7755`)
cũng không bao giờ hiện cho đơn Shopee — **màn hình trông sạch trong khi tiền
đang chảy**, đúng loại lỗi đắt nhất.

## 4. Cách vá đề xuất

Thêm vào cuối `dongBoNen()` của `src/shopee.js` (ngay sau vòng ghi đơn) một
lệnh song sinh với `tiktok.js:280`, **chỉ khác ở tên trạng thái của Shopee**:

```js
demGhi(await env.DB.prepare(`
  UPDATE don_hoan SET cho_kho_nhan_tu = datetime('now','+7 hours')
   WHERE nguon IS NOT 'tiktok' AND cho_kho_nhan_tu IS NULL AND kho_nhan_luc IS NULL
     AND trang_thai IN (<trạng thái Shopee tương đương BUYER_SHIPPED_ITEM>)
`).run());
```

Ba việc phải làm cho đúng, **theo thứ tự**:

1. **Chốt danh sách trạng thái Shopee** nghĩa là "khách đã gửi hàng về".
   Shopee Returns v2 không dùng `BUYER_SHIPPED_ITEM`. **Phải đo trên dữ liệu
   thật, không đoán**: `SELECT trang_thai, COUNT(*) FROM don_hoan WHERE
   nguon IS NOT 'tiktok' GROUP BY trang_thai` rồi đối chiếu vài đơn với Seller
   Centre, và tra tài liệu Shopee. **Đây là business rule → cần Sếp Ngọc xác
   nhận** trước khi chốt (đơn nào tính là "đang trên đường về kho").
2. **`nguon IS NOT 'tiktok'`** chứ đừng `nguon = 'shopee'` — cột `nguon` được
   thêm sau (`them-tiktok.sql:23`, mặc định `'shopee'`) nhưng `IS NOT` an toàn
   với NULL, còn `=` thì nuốt dòng NULL (đúng bẫy đã ghi ở REV-0033 Câu 1).
3. **Vá lùi dữ liệu cũ**: đơn Shopee đang tồn sẵn cũng phải được đặt mốc, nếu
   không thì vá xong vẫn im lặng với chính đống hàng đang kẹt. ⚠️ Đặt mốc =
   `datetime('now')` cho đơn cũ sẽ **reset đồng hồ** — đơn kẹt 3 tuần bị coi là
   mới. Cân nhắc lấy `tao_luc_shopee`/`cap_nhat_shopee` làm mốc lùi, **và
   lường trước một loạt chuông nổ cùng lúc** ngay lượt cron đầu (nên chạy vá
   lùi trong giờ hành chính, có người trực).

## 5. Đo thế nào mới gọi là xong

- Bàn thử dựng đơn Shopee ở đúng trạng thái "khách đã gửi về" → sau 1 lượt
  đồng bộ phải có `cho_kho_nhan_tu`; quá 12h → chuông kêu **đúng 1 lần**.
- **Ca đối chứng bắt buộc**: bỏ vế mới ra thì bàn thử phải ĐỎ (BH-16).
- Đơn TikTok **không được đổi hành vi** — chạy lại `npm run do-ghi-dongbo`
  (31 phép) phải vẫn xanh, vì lệnh mới cũng là một nguồn ghi D1.
- Kiểm số ghi: lệnh này có `cho_kho_nhan_tu IS NULL` nên mỗi đơn chỉ ghi 1
  lần, không tái phát vụ ghi đè mỗi 5 phút của REV-0031.
