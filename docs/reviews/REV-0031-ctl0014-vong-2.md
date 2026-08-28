# REV-0031 — CTL-0014 vòng 2 (soi hẹp)
HỒ LY · 28/08/2026 · worktree `agc-day`, commit `93da7e1`. Vòng 1: REV-0028 (`f453a65`).

## KẾT LUẬN: **FIX_REQUIRED** — đúng **một** việc chặn, sửa ~5 phút
Bốn lỗi vòng 1 **đã vá thật**, đo lại bằng mốc riêng của tôi. Chị Phạm Thị Lan chờ hơn 8 tiếng và **bản này đáng phát hành**. Chỉ vướng một dòng SQL (§0.4) — vá xong đẩy ngay.

**Nhánh:** chuỗi liền mạch `f53c568` → `b1f2331` → `f453a65` → `93da7e1`, **không mất commit nào**. **Gộp `fix/nut-lui-dong-44px`.** `feature/ctl-0014-thongbao-tinnhan` đứng yên ở `b1f2331` — **nhánh chết, đừng gộp**; tên nhánh lệch nội dung là bẫy cho người sau.

**"Không đụng phần mã hoá" — ĐÚNG.** `git diff b1f2331..93da7e1 -- src/webpush.js`: cả 2 khối đều **từ dòng 160 trở xuống**, tức **sau** `maHoaNoiDung()` và `chuKyVAPID()`; thân hai hàm mã hoá không đổi một byte. Kết quả 144/144 khớp RFC 8291 của vòng 1 vẫn còn giá trị.

---
# CÂU 0 — CHI PHÍ
Hạn mức thật (tài liệu Cloudflare, tra 28/08/2026): Free = **100.000 dòng ghi/ngày**, **5.000.000 dòng đọc/ngày**, 500 MB/CSDL. Dòng ghi tính cả chỉ mục.

**0.1 · "120.000 lượt ghi/ngày" — ĐÚNG SỐ, SAI HÀM, và là TRẦN không phải mức thường.** Khỉ Đột khai thủ phạm là `setInterval(hoiChuaDocToanCuc, 6000)`. **Không phải** — `chatChuaDoc` (`index.js:389`) là **SELECT thuần**. Thủ phạm là hàm kia: `hoiTinMoi` → `chatDanhSach` → **`src/index.js:352`** `UPDATE tai_khoan SET xem_chat_voi=?, xem_chat_luc=datetime('now')`, và nó **chỉ chạy khi `dang_mo=1`** tức khi cửa sổ chat đang mở (`app.js:3582/3590`). Tính lại theo quy mô thật (20 người, 8h–18h): mở chat cả 10 tiếng = **120.000 (VƯỢT)**; 3 tiếng = 36.000; 1 tiếng = 12.000.

**Nguy hiểm Khỉ Đột không khai:** `app.js` **không có `clearInterval`, không `visibilitychange`, không dừng ngoài giờ làm** → cửa sổ chat để mở trên máy bàn ở kho **ghi suốt đêm và cuối tuần**: một máy bỏ quên qua 3 ngày nghỉ = **43.200 lượt ghi**. Mô hình "8h–18h" là lạc quan; đây mới là đường vượt hạn mức có thật.

**0.2 · Nhịp tim là MỚI; phần ĐỌC KHÔNG có vấn đề.** Vòng lặp 6 giây có sẵn từ trước nhưng **chỉ ĐỌC**; lệnh **GHI** là mới (Đợt 1). Rà 12 lệnh ghi mới của CTL-0014: 11 lệnh theo sự kiện, đã bị trần 12 thông báo/ngày chặn — **chỉ dòng 352 không có trần**. Tôi ngờ `chatChuaDoc` quét toàn bảng (nếu vậy: 2,4 tỷ dòng đọc/ngày); **dựng lại đúng lược đồ + đúng chỉ mục rồi đo:** cả hai câu đều `SEARCH … USING INTEGER PRIMARY KEY (rowid>?)`, thời gian **phẳng 1,5µs** từ 1.000 đến 200.000 tin → người đọc hết thì mỗi lượt đọc ~0 dòng. **Phần đọc an toàn.**

**0.3 · SỐ THẬT PRODUCTION — PHÁT HIỆN LỚN NHẤT VÒNG NÀY.** `npx wrangler d1 info crm-agc` (chỉ đọc): **rows_written_24h = 357.167** (hạn mức 100.000 → **VƯỢT 3,57 LẦN**) · rows_read = 2.300.120 (46%) · size = 52,4 MB (10%). **ERP ĐANG VƯỢT HẠN MỨC GHI GÓI MIỄN PHÍ 3,5 LẦN, TỪ TRƯỚC KHI CTL-0014 LÊN SÓNG.** Ràng buộc "chi phí 0" (ADR-0006) **đã hỏng từ lâu mà không ai biết** — và **không phải do CTL-0014**.

**Thủ phạm trong mã** (116.748 lệnh → 357.167 dòng = ~3 dòng/lệnh, đúng dạng khuếch đại chỉ mục): 4 lệnh `INSERT … ON CONFLICT DO UPDATE` ở `shopee.js:289,425` và `tiktok.js:250,381`. Cron **mỗi 5 phút (288 lượt/ngày)** **ghi đè lại mọi đơn lấy về, kể cả đơn KHÔNG ĐỔI** — luôn có `dong_bo_luc=datetime('now')` nên dòng nào cũng "khác"; grep `WHERE excluded`: **không có chặn nào**. → **Phiếu riêng, GẤP, tách khỏi CTL-0014** — đụng ràng buộc chi phí gốc nên **Sếp Ngọc quyết**. Vá mẫu: `WHERE don_hang.cap_nhat_san IS NOT excluded.cap_nhat_san`.

**0.4 · VIỆC CHẶN DUY NHẤT.** Chặn ở **SQL**, `src/index.js:352` (chặn ở máy chủ thì client sửa cũng không lách). `CON_DANG_XEM_GIAY = 45` nên đóng dấu mỗi 30 giây vẫn đúng, dư 15 giây an toàn:
```sql
UPDATE tai_khoan SET xem_chat_voi = ?, xem_chat_luc = datetime('now')
 WHERE nhan_su_id = ?
   AND (xem_chat_luc IS NULL
        OR xem_chat_voi IS NOT ?                    -- đổi người đang chat thì đóng dấu NGAY
        OR xem_chat_luc < datetime('now','-30 seconds'))
```
Đo thật: `100 dòng ghi/100 lượt hỏi` → **`1 dòng ghi/100 lượt hỏi`**; đổi người chat vẫn đóng dấu ngay → **không hỏng tính năng**. Trần 120.000 → **24.000/ngày**; máy bỏ quên qua đêm hết tốn.

---
# CÂU 1 — Bốn lỗi có vá thật không (mốc riêng, không dùng bàn thử của họ)
**H1 — ĐÚNG.** Gọi `dayToiNguoi()` thật, D1 giả trên `node:sqlite`, khoá VAPID + `p256dh` **sinh thật bằng WebCrypto**. 401/403/429/500/503/400/413/đứt mạng → **3/3 đăng ký còn nguyên**; 404/410 → xoá; 1/3 máy trả 410 → xoá đúng máy đó; 500 lặp **30 lượt** → vẫn 1/1. *Khai thiếu đường xoá thứ ba:* `DANG_KY_MEO` (`webpush.js:203`) xoá khi `p256dh/auth` sai độ dài, chưa hề gọi `fetch` (THẤP).

**Bỏ luật "xoá sau 10 lượt": ĐÚNG, lập luận VỮNG** — đếm lượt hỏng không phân biệt "máy này chết" với "Google đang sự cố"; đo được 3 đăng ký + 500 liên tục 10 lượt = mất 3/3 theo luật cũ. **Có để lại rác không?** Có — không TTL, `donNhatKyCu` chỉ xoá `push_nhat_ky`, `dung_luc` có mà không ai đọc, xoá nhân sự không cascade, `sw.js` thiếu `pushsubscriptionchange`. **Nhưng rủi ro THẤP:** FCM/Apple/Mozilla đều trả 410 khi gỡ app (hành vi chuẩn), 20 người × 2-3 máy = trần ~60 dòng. Và luật cũ không bị vứt — nó **đổi từ XOÁ sang BÁO** (`NGUONG_KEU_HONG=10` → Telegram, `day-thong-bao.js:257`), thiết kế đúng. *Rẻ nhất:* thêm vào `donNhatKyCu`: `DELETE FROM push_dangky WHERE dung_luc < date('now','-90 days')`.

**H2 — 8 trạng thái CÓ ĐỦ** (quét thật 256 tổ hợp, không nhánh chết) **nhưng khai "không cần bấm" SAI**: `#tbdMoi` (`app.html:692`) và `#cnbChuong` (`:678`) **đều nằm trong `#cnbPopup hidden`** (`:671`), chỉ mở khi bấm bong bóng `#cnbNut` — thứ duy nhất luôn nhìn thấy, mà nó **chỉ có huy hiệu số đỏ, không một dấu hiệu điếc nào**. Đúng phải là *"không cần bấm nút 🔔 nữa, nhưng vẫn phải MỞ cửa sổ chat"*. Câu sai này cũng nằm trong `tbd-trangthai.js:19-21`.

**H3 — ĐÚNG, 8/8 tổ hợp 2³** (bước 1 "thiếu" dựng bằng `ALTER TABLE RENAME` thật): thiếu bước nào cũng kêu và **chỉ tên đúng bước thiếu**; đủ 3 bước chạy 5 lượt → **0 báo oan**.

**M1 — ĐẠT nhưng khai sai NGUYÊN NHÂN.** Nạp chính `public/sw.js`, mô phỏng đúng ngữ nghĩa Notification API: 3 người → **3 nhãn, 3 dòng, kêu 3 lần** ✅; 1 người 5 gói → **1 dòng** ✅ nhưng **kêu 5 lần** — `renotify:true` khiến mỗi lần thay thế cùng nhãn vẫn kêu lại. Thứ giữ cho nó kêu 1 lần là **lớp gộp 60 giây ở máy chủ** (`GOP_GIAY`), không phải `tag`. (THẤP)

**Trạng thái H2 BỊ BỎ SÓT** (ca tôi tự nghĩ thêm; mức xem bảng cuối): ① máy dùng chung cướp đăng ký → xem L4; ② **tắt thông báo ở cấp hệ điều hành** (`permission=granted` mà máy im, không API web nào đọc được) — cả hai rơi vào `dang_bat` 🔔, **điếc âm thầm mà UI nói dối**; ③ `localStorage` ném là **mất sạch dải trạng thái** — `app.js:3217`/`:3238` gọi `getItem` **không try/catch** trong khi `setItem` ở `:3221` **lại có** (chú thích "chế độ riêng tư"), rồi `dangHoan()` ném → `veTrangThaiTB` ném → `veGiaoDienTB` không chạy → chuông giữ `hidden` → **im lặng tuyệt đối**, lỗi bị nuốt vì `app.js:3567` `.then(…)` **không `.catch`** (lỗi H2 gốc quay lại nguyên vẹn); ④ `coNotification` không kiểm `PushManager` (`app.js:3229`) → máy cũ/ẩn danh vào `chua_bat` kèm nút "Bật" **bấm mãi không chạy**; ⑤ thiếu nút **"Gửi thử một thông báo"** — cách **duy nhất** bắt được ① và ②; ⑥ tài khoản đã khoá vẫn nhận push (`day-thong-bao.js:66` không kiểm `kich_hoat`); ⑦ `break` (`day-thong-bao.js:238,248`): 3 máy mà chỉ máy Apple trả 403 → đo được `{"gui":0,"xoa":0}`, **cả 2 máy khoẻ cũng không nhận** — nên `continue`.

---
# CÂU 2 — Món nợ tự khai (ngoài M2)
**M5 — KHÔNG PHẢI NỢ (THẤP).** Gói tin đẩy **cố ý không chứa lời tin nhắn** (`day-thong-bao.js:133`): chỉ `💬 <tên người gửi>` + "Gửi bạn một tin nhắn mới" → kích thước chặn bởi độ dài họ tên (~50 byte), **không bao giờ chạm 4.070**. Khai thừa một món nợ không thể xảy ra. Nếu có, 413 → `MAY_CHU_LOI` → giữ đăng ký, không mất dữ liệu.

**L4 — CAO, nhưng KHÔNG chặn phát hành: ĐÂY KHÔNG PHẢI LỖ LỘ NỘI DUNG.** `index.js:523-529`: `endpoint` là `UNIQUE`, `ON CONFLICT DO UPDATE SET nhan_su_id = excluded.nhan_su_id`. Endpoint push là **một cho mỗi trình duyệt**, không phải mỗi tài khoản → máy kho dùng chung, B đăng nhập là **đăng ký của A âm thầm chuyển sang B**. **Lộ gì:** chỉ **siêu dữ liệu** — thấy "💬 Phạm Khương Duy", biết *ai nhắn cho ai*, **không đọc được nội dung**; chuyện lương/kỷ luật **không lộ** (§5.3 đã cố ý giấu nội dung) → không đủ để chặn phát hành. **Hại thật:** A **điếc âm thầm** mà UI vẫn báo *"Đang bật. Đóng ERP rồi vẫn nhận được tin nhắn"* — **nói dối đúng nghĩa**, đúng lỗi gốc của chị Lan khoác nhãn xanh. Trạng thái ④ `dang_bat` chỉ tính từ `quyen==='granted'`, **không hỏi máy chủ còn giữ đăng ký của mình không** — dù `pushKhoa` đã trả sẵn `so_may` mà không ai dùng. Tự lành khi A mở lại ERP, nhưng cửa sổ điếc đúng là lúc A **không** ở trong ERP — tức đúng lúc cần thông báo nhất. **Vá rẻ:** đưa `so_may` vào `doTrangThai()` → trạng thái thứ 9 "máy này đã mất đăng ký, bấm Bật lại".

# CÂU 3 — Vá thêm ngoài phạm vi: CHÍNH ĐÁNG, không lấn sân
`hienTaiCho` đổi `tag:'chat'` → `'chat:trong-app'`: cùng họ lỗi M1, tránh đụng vùng nhãn `chat:<người gửi>` của `sw.js` — nhỏ và phòng thủ. **Phép ký thử** trong `kiemTraCaiDatDay()`: đáng giá nhất — bắt đúng nguyên nhân gốc H1 (dán nhầm khoá/lệch cặp) **trước khi** chạm đăng ký của ai, chạy tại chỗ, không gọi ra Internet, 1 lần/ngày.

# CÂU 4 — Số cuối
`tu-kiem-thongbao` **74/0** ✅ · `do-trangthai-thongbao` **49/0** ✅ · `do-nut-thongbao` **7/7 = 44.0px** (cả 375px lẫn 320px), **`.cnb-dau` = 73.0px**, không tràn ngang ✅ — khớp lời khai. **Ca đối chứng bắt được thật** (tự phá mã trong scratchpad, không đụng repo): `44px→30px` ⇒ 7/7 HỎNG · `renotify→false` ⇒ trượt 1 · `tag` về cố định `'chat'` ⇒ 2 phép ❌ rồi dừng hẳn · bỏ kiểm `VAPID_KHOA_CONG_KHAI` ⇒ trượt 1 · chuông không đổi ký tự ⇒ trượt 9. **Nhạy thật.** Soi ngẫu nhiên L4/L6/L7: đều so số đo thật với số mong đợi. *Ngoại lệ THẤP:* `tu-kiem-thongbao-tinnhan.mjs:788` vế `sw.hien.length === 3` là **tautology**, được cứu bởi vế `nhan.size === 3`.

---
# BẢNG LỖI
| # | Lỗi | Mức | Chặn phát hành? |
|---|---|---|---|
| 1 | Nhịp tim ghi D1 mỗi 6s, không trần, chạy cả đêm (`index.js:352`) | **CAO** | **CÓ — vá §0.4** |
| 2 | Production đã ghi 357k dòng/ngày (upsert Shopee/TikTok vô điều kiện) | **CAO** | Không — phiếu riêng GẤP → Sếp Ngọc |
| 3 | L4 máy dùng chung cướp endpoint → điếc âm thầm, UI báo "Đang bật" | CAO | Không |
| 4 | Tắt thông báo ở cấp hệ điều hành → không phát hiện được | CAO | Không |
| 5 | `localStorage` ném → mất sạch dải trạng thái, im lặng tuyệt đối | TRUNG | Không (vá 2 dòng `try/catch`) |
| 6 | `break` làm 1 endpoint hỏng giết thông báo cả người | TRUNG | Không |
| 7 | Tài khoản đã khoá vẫn nhận push (off-boarding) | TRUNG | Không |
| 8 | `coNotification` không kiểm `PushManager` → nút "Bật" chết | TRUNG | Không |
| 9 | Thiếu nút "Gửi thử" (bắt được #3 và #4) | TRUNG | Không — đề xuất giá trị nhất |
| 10 | Khai H2 "không cần bấm" sai + `tbd-trangthai.js:19-21` | TRUNG | Không (sửa câu chữ) |
| 11 | M1 khai sai nguyên nhân · M5 khai thừa · H1 thiếu đường xoá thứ 3 | THẤP | Không |
| 12 | Ghi chú `them-day-thongbao.sql:18` lạc hậu · tautology dòng 788 | THẤP | Không |

# TRIỂN KHAI (sau khi vá §0.4) — kiểm sau mỗi bước để biết nó THẬT SỰ sống
1. **Vá `index.js:352`** → `npm run tu-kiem-thongbao` phải vẫn **74/0**.
2. **Gộp `fix/nut-lui-dong-44px` vào `main`** → `git log --oneline -3` thấy đủ 3 commit.
3. **`npm run nap-daythongbao`** → `npm run migration-kiemtra` **không còn** báo thiếu `them-day-thongbao.sql`. (Đừng gọi thẳng `wrangler d1 execute --file` — sổ không ghi.)
4. **`npm run khoa-vapid` + 2 lệnh `wrangler secret put`** → `GET /api/push/khoa` trả `bat: true` kèm `khoa_cong_khai`; nút 🔔 hiện ra thay vì ẩn.
5. **Thử đầu-cuối:** một người bấm "Bật thông báo", **đóng hẳn ERP**, người thứ hai nhắn riêng → phải rung + hiện `💬 <tên>` trong ~5 giây; bấm vào mở **đúng** đoạn chat đó.
6. **Sau 24h:** `npx wrangler d1 info crm-agc` — `rows_written_24h` **không tăng quá ~25.000** so với hôm nay. Tăng hơn nghĩa là §0.4 chưa ăn.
7. **9h sáng hôm sau:** thiếu bước nào thì Telegram của Gạo phải tự kêu. Không kêu = đủ bước.
