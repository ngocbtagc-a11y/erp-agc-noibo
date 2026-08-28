# REV-0033 — Hạn mức ghi D1 · soi commit `0724511`

Nhánh `fix/nut-lui-dong-44px` · worktree `agc-day` · Hồ Ly · 28/08/2026 · không push, không đụng `main`.

## Kết luận: **FIX_REQUIRED** — 1 lỗi chặn, sửa đúng **1 dòng**

Lõi Việc 1 **đúng, tôi dựng lại được**. Lỗi chặn duy nhất: một chỗ đọc `dong_bo_luc` bị **bỏ sót** khi đổi nghĩa cột — đúng loại "màn hình nói dối", rơi vào màn **kho vận**.

**Số thật lúc soi** (`wrangler d1 info`, chỉ đọc): `rows_written_24h` = **358.604** = **3,59 lần** hạn mức 100.000 ❗· `rows_read_24h` = 2.390.674 = **48%** của 5 triệu · `read_queries_24h` = 46.597 · `write_queries_24h` = 117.239. Prod **chưa** nạp vá và số còn **tăng** (Khỉ Đột đo 346.688). Chẩn đoán gốc: **đúng**.

## Câu 1 — CÓ MẤT CẬP NHẬT KHÔNG? → **KHÔNG**

**Số cột.** `don_hoan` có **39 cột** (11 gốc + 28 `ALTER`). Nhưng mốc phải đối chiếu **không phải 39** — mà là **số cột lệnh `SET` ghi**: Shopee ghi **13**, bộ lọc so **12** = đúng 13 trừ `dong_bo_luc`. Bỏ `dong_bo_luc` là **bắt buộc đúng** (nó là `datetime('now')`, luôn khác → đưa vào thì lọc luôn bật, không tiết kiệm gì). TikTok ghi thêm `nguon`, đã phủ bằng vế `don_hoan.nguon IS NOT 'tiktok'`. → **0/13 cột bị hở.** 26 cột còn lại (`kho_nhan_luc`, `doi_soat_luc`, `dang_cho`, `tinh_trang_hang`…) là cột quy trình do **người bấm tay** ghi bằng `UPDATE` riêng — lệnh cron không chạm tới, bộ lọc **không thể** làm mất chúng.

**`IS NOT` vs `!=`** — dựng độc lập (`node:sqlite`, bảng từ `migrations/` thật):

| Ca | `IS NOT` (bản vá) | `!=` (nếu dùng) |
|---|---|---|
| `ma_van_don` NULL → `SPX123` | **GHI** ✅ | **BỎ QUA** ❌ mất mã vận đơn |
| `ma_van_don` `SPX123` → NULL | **GHI** ✅ | **BỎ QUA** ❌ |

Lý do Khỉ Đột nêu **đúng**, và trúng đúng cột kho vận cần nhất. Dùng `!=` là mất tiền thật.

**`du_lieu_json` so chuỗi.** Không có ca nuốt cập nhật: chuỗi giống hệt ⟺ byte giống hệt ⟺ JSON không đổi. Đổi thứ tự khoá → **ghi thừa** (an toàn, đúng khai); đổi giá trị thật → **ghi**. Thêm nữa `du_lieu_json` là payload nguyên bản nên đóng vai **lưới bao trùm**: sàn đổi bất kỳ thứ gì là lọc bật — điểm tôi yên tâm nhất. ⚠️ Mặt trái: nếu payload sàn có trường **dao động** (nonce, "còn N giờ") thì **không tiết kiệm được gì**, nhưng **không mất cập nhật** (hỏng về hướng an toàn). Con số "230 dòng/ngày" là **dự phóng phòng thí nghiệm**, chưa đo thật → xem "Kiểm sau 24h".

Bàn thử `do-ghi-dongbo.mjs` **thật**: `node:sqlite`, bóc SQL thẳng từ `src/`, bóc hụt là `exit 2`. 31/31 đạt, tôi chạy lại đúng vậy.

## Câu 2 — `dong_bo_luc` đổi nghĩa → **BỎ SÓT 1 CHỖ (CHẶN)**

Quét toàn repo, `dong_bo_luc` chỉ được đọc ở **4 chỗ**:

| Chỗ | `LIMIT` | Đánh giá |
|---|---|---|
| `index.js:1701` `hoanLichSu` | 500/523 | ✅ **đã sửa** sang `tao_luc_shopee` |
| `index.js:2966 / 2989 / 3131` | không | ✅ chỉ đổi thứ tự, không mất dòng |
| **`shopee.js:369` `apiDanhSach`** | **300** ❗ | ❌ **BỎ SÓT — màn KHO VẬN** |

`shopee.js:369` là **hàng đợi việc của kho**: `ORDER BY d.dong_bo_luc DESC LIMIT 300`. Trước vá mọi dòng cùng giá trị nên cắt là **ngẫu nhiên**. Sau vá `dong_bo_luc` = "lần cuối đơn ĐỔI", nên 300 dòng giữ lại là 300 đơn **đổi gần nhất**, còn đơn **rơi** là đơn **lâu nhất không đổi** — đúng những **đơn tồn quá hạn** mà kho cần thấy nhất. Cắt từ ngẫu nhiên thành **thiên vị có hệ thống chống lại đơn quá hạn**. Chỉ nổ khi hàng đợi > 300 → **bẫy chờ**, chưa nổ hôm nay, nhưng sửa mất 1 dòng.

**Không** chỗ nào dùng `dong_bo_luc` để biết "hệ thống còn đồng bộ không" (không `MAX(dong_bo_luc)`, frontend không đọc) → **không báo oan**. Chuông đơn hoàn quá hạn chạy bằng `cho_kho_nhan_tu`, không đụng `dong_bo_luc` → đường tiền an toàn ✅.

## Câu 3 — Chuông 80%

- `meta.rows_written` **chính xác**: tài liệu Cloudflare xác nhận tính cả dòng chỉ mục ("1 dòng bảng + 1 dòng chỉ mục"), khớp hệ số 3,07 đo được.
- Chạm 80.000 → **đúng 1 tin/ngày** (cờ `da_bao`); dưới ngưỡng → **0 tin**. Chạy lại: đúng cả hai chiều.
- Hạn mức **100.000 ghi / 5 triệu đọc mỗi ngày**: xác minh bằng tài liệu, không nhớ. Vượt → D1 trả lỗi, ngừng chạy truy vấn → câu "D1 CHẶN GHI" **đúng**.
- ❗ **"Chưa nạp migration thì im lặng bỏ qua"** — chỉ `console.error`, không ai đọc log Worker; đúng cái bệnh cả ngày đang chống. **Không chặn** vì thứ tự triển khai dưới đây nạp migration **trước**, nhưng nên nâng thành **1 tin Telegram** (chi phí 0).
- ❗ Chuông chỉ đếm **luồng đồng bộ sàn** — sau vá luồng đó còn ~230 dòng/ngày nên gần như **không bao giờ kêu** kể cả khi tổng vượt vì nguồn khác; và **không canh lượt ĐỌC** (đang 48%). Kiểm tổng vẫn phải bằng `d1 info` — đưa vào việc định kỳ.

## Câu 4 — Nhịp tim

`do-nhiptim-chat.mjs` 20/20 đạt, chạy lại đúng. Chặn 30 giây nằm ở **SQL máy chủ** (client sửa không lách được) — đúng chỗ.

**Không tắt `hoiChuaDocToanCuc` — đúng, nhưng lập luận chỉ đúng một nửa.** Đúng: nó là `SELECT` thuần (khoá chính, ~0 dòng đọc) **và là chỗ dựng thông báo khi tab ẩn** — tắt là giết lớp ② của CTL-0014, đúng nỗi đau chị Lan. Nửa còn lại: nó **không có `clearInterval`, không nghe `visibilitychange`** → mỗi tab mở tốn **14.400 lượt/ngày vĩnh viễn**. Nên **"43.200 → 0" chỉ đúng cho lượt GHI D1**; máy bàn bỏ quên 3 ngày vẫn tốn 43.200 lượt gọi + ~86.400 lượt đọc. Phải nói đúng phạm vi, đừng khoe "0". → Đề xuất (không chặn): tab ẩn thì **giãn 6s → 30s** thay vì tắt — vẫn báo được, cắt 5 lần.

**Ngoài giờ:** vẫn **hỏi tin**, chỉ **không đóng dấu** → ca đêm / thứ Bảy **không mất thông báo**; thứ Bảy vẫn tính ngày làm ✅ đúng ADR-0013.

## Câu 5 — Hạn mức thứ hai: **CHƯA VƯỢT.** 240.000 là trần, không phải số đo

- **Workers miễn phí = 100.000 request/ngày**, reset 00:00 UTC (07:00 VN), vượt → **Error 1027**, Worker ngừng phục vụ, **không bị tính tiền**. Con số Khỉ Đột nêu **đúng**. *(Tài sản tĩnh **không** tính vào hạn mức — trang vẫn tải, nhưng mọi lệnh API chết.)*
- **Đã vượt chưa? Gần như chắc chắn CHƯA** — bằng chứng, không phỏng đoán: **mọi** API có đăng nhập đều gọi `batBuocDangNhap` → `docPhien` → **ít nhất 1 lượt đọc D1**. Mà `read_queries_24h = 46.597`. Vậy số request API có đăng nhập **≤ 46.597/ngày**, tức **dưới 50% hạn mức**. Nếu thật có 240.000 request thì `read_queries` phải ≥ 240.000.
- Lệch ~5 lần vì 240.000 giả định **20 người mở tab liên tục 10 tiếng** — thực tế không vậy. Nếu ERP đang dính 1027 thì cả công ty đã kêu từ lâu.
- **Việc 2 cắt được bao nhiêu request?** Ít — nó cắt **lượt GHI**, không cắt `hoiChuaDocToanCuc`. Nhưng **không cần**, vì chưa gần hạn mức.
- **Cách rẻ nhất: đừng tối ưu cái chưa hỏng.** Việc đúng là **đo**: `[observability]` đã bật sẵn → xem Workers Analytics trên Dashboard (chi phí 0). Chỉ khi tiến gần 100.000 mới làm việc giãn 30s. **Ràng buộc đang thật sự vỡ là D1 GHI (3,59 lần), không phải request.**

## Câu 6 — H2 · M1 · Việc 4

- **H2 sửa THẬT** — tự dựng lại cây DOM `public/app.html`: `#cnbPopup` mở dòng 671 và **đóng dòng 732**; `#cnbNut` dòng 735, `#cnbDauTB` dòng 745 **nằm trong nút, ngoài popup** → thấy được mà **không bấm gì** ✅. 9/9 trạng thái: 79/79 đạt, có ca đối chứng (gỡ vá ra thì 9/9 lọt) → phép đo **nhạy thật**. `aria-hidden` trên emoji là **đúng** (tránh máy đọc màn hình đọc "🔕"), câu chữ đặt ở `aria-label` của `#cnbNut`.
- **M1** — bản trước khai "KHÔNG cần bấm gì" là **sai**; nay đã tự đính chính đúng ("vẫn phải MỞ cửa sổ chat") và nêu rõ `#cnbDauTB` là phần tử duy nhất ngoài popup ✅.
- **Việc 4 — không báo oan khi mạng chập chờn**: `docKhoa` lỗi → `return null`, **không** đụng `soMayTrenMayChu`; khởi tạo `null` = "chưa hỏi được, không kết luận". Chỉ số **0 thật** từ máy chủ mới đổi trạng thái ✅. Nhỏ: `so_may` đếm đăng ký của **người dùng trên mọi máy**, nên chữ "**Máy này** đã MẤT đăng ký" hơi lệch — chỉ nổ khi người đó không còn máy nào, tức vẫn đúng nghĩa "không nhận được ở đâu cả". Cosmetic.

## Bảng lỗi

| # | Lỗi | Mức | Chặn |
|---|---|---|---|
| 1 | `shopee.js:369` màn kho vận `ORDER BY dong_bo_luc DESC LIMIT 300` — bỏ sót khi đổi nghĩa cột; cắt thiên vị chống lại đơn quá hạn | **Cao** | **CÓ** (1 dòng) |
| 2 | Chưa nạp migration → chỉ `console.error`, im lặng | Vừa | Không |
| 3 | `hoiChuaDocToanCuc` không bao giờ dừng; "43.200 → 0" chỉ đúng cho lượt GHI | Vừa | Không |
| 4 | Chuông không canh lượt ĐỌC (đang 48%), chỉ thấy luồng đồng bộ | Vừa | Không |
| 5 | `demGhi` trong `chatDanhSach` (đường request) cộng vào biến isolate mà chỉ cron xả → đếm hụt, thất thường; trái chính chú thích "chỉ đo luồng đồng bộ" | Thấp | Không |
| 6 | Chữ "Máy này đã MẤT đăng ký" trong khi `so_may` là mức người dùng | Thấp | Không |

**Sửa #1 (`src/shopee.js:369`):** bỏ `LIMIT 300` — `WHERE` đã chặn cứng hàng đợi, bảng lại dọn theo tháng nên không phình. *(Muốn giữ trần thì `LIMIT 1000`.)* Chọn cách này vì **không đổi thứ tự hiển thị** cho kho — đổi thứ tự là quyết định nghiệp vụ, phải hỏi Sếp Ngọc.

## Triển khai theo thứ tự (sau khi sửa #1)

1. **Nạp migration TRƯỚC** — `npm run nap-canhbaoghi`. Nạp sau khi deploy thì bộ đếm im lặng bỏ qua đúng lúc cần nó nhất.
2. Kiểm `wrangler d1 execute crm-agc --remote --command "SELECT * FROM d1_ghi_ngay"` → phải chạy được (rỗng là bình thường).
3. Ghi **mốc gốc**: `npx wrangler d1 info crm-agc` → lưu `rows_written_24h` (nay **358.604**).
4. Deploy Worker.
5. Đợi 1 lượt cron (5 phút) → `d1_ghi_ngay` phải có **1 dòng**.

## Kiểm sau 24h — làm **cả hai**

**A · Số ghi có tụt thật không.** `npx wrangler d1 info crm-agc` → `rows_written_24h` phải từ **358.604** xuống **~35.000–40.000** (≈37% hạn mức). Còn cao = payload sàn có trường dao động → loại trường đó khỏi payload trước khi lưu.

**B · KHÔNG được mất cập nhật (quan trọng hơn A).**
```sql
SELECT COUNT(*) FROM don_hoan WHERE dong_bo_luc >= datetime('now','+7 hours','-1 day');
```
Phải ra **~60** (đúng nhịp đổi thật đã đo). Ra **0** hoặc gần 0 = bộ lọc chặn oan → **lùi bản ngay**. Kèm: mở màn Kho vận, đối chiếu tay **3 đơn** trạng thái/mã vận đơn với Seller Centre.

> Chị Phạm Thị Lan: phần chị cần (H2 · Việc 3 · Việc 4) **đạt**, không bị #1 chặn — #1 sửa 1 dòng nên không làm chị chờ thêm đáng kể.

## Ngoài phạm vi — cần việc riêng

`cho_kho_nhan_tu` (mốc đếm 12h để bắn chuông đơn hoàn quá hạn) **chỉ được đặt cho đơn TikTok** (`tiktok.js:280`). **Không** lệnh nào đặt nó cho đơn **Shopee** — không ở `shopee.js`, không trigger, không migration. Nghĩa là **chuông quá hạn chưa từng kêu cho đơn Shopee**, mà Shopee là **kênh bán chính**. Lỗi **có sẵn từ trước**, không do commit này.
