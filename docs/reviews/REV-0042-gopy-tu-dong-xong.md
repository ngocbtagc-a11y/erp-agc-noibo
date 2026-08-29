# REV-0042 — Deploy xong thì góp ý tự chuyển "đã xong"

HỒ LY · 29/08/2026 · nhánh `feature/gopy-tu-dong-xong` @ `be93220` (tách từ `a9dc0f1`) · chi phí 0

**Kết luận: FIX_REQUIRED** — 6 ca đóng nhầm thủng trên 9 ca dựng.

Bàn thử của Khỉ Đột chạy lại đúng **59 đạt · 0 trượt** — nhưng 59 ca đó không có một ca
gõ nhầm mã nào. Bàn đối kháng của tôi (gọi thẳng cửa HTTP thật + SQLite từ migrations
thật): **22 đạt · 10 trượt**, cộng 7/9 ở đường sửa tay và 6/6 ở file lùi.

## CÂU 1 — CA ĐÓNG NHẦM: **thủng 6 / 9**

| # | Ca dựng | Kết quả đo |
|---|---|---|
| 1 | Commit ghi `GY-1` mà định `GY-2` | **THỦNG.** GY-1 (đang `da_duyet`, chả liên quan) bị đẩy sang `cho_nghiem_thu` + chị Lan nhận tin "đã được sửa xong và đã lên hệ thống" |
| 2 | Lượt đẩy CHỈ chứa commit `Revert "GY-1 sửa lỗi X"` | **THỦNG.** Bản vá vừa bị GỠ, máy vẫn đẩy sang `cho_nghiem_thu` + gửi 1 tin |
| 3 | Revert sau khi góp ý đã `hoan_thanh` | **THỦNG.** Ở lại "Hoàn thành" vĩnh viễn, không ai được báo. Nhãn nói dối |
| 4 | Gộp nhánh cũ bỏ dở (góp ý đang `can_chinh_sua`) | **THỦNG.** Đẩy sang `cho_nghiem_thu` + gửi tin |
| 5 | Gộp nhánh chứa mã của góp ý ĐÃ ĐÓNG | kín — bỏ qua, 0 tin |
| 6 | Deploy hỏng giữa chừng, bước chốt còn chạy? | kín — bước không có `if:`, Actions bỏ qua khi bước trước đỏ |
| 7 | Hai mã trong một commit (một ở thân) | kín — mỗi mã xử đúng rổ riêng |
| 8 | Commit CHỈ sửa tài liệu: `"REV-0042: soi lại GY-1, chưa sửa gì"` | **THỦNG.** Đóng luôn + gửi tin. Máy đọc *thông điệp*, không đọc *file nào bị đổi* |
| 9 | Đường phụ `bang_chung_url`, KHÔNG có mã `GY-` nào | **THỦNG.** Người gửi dán link commit **gây ra lỗi** làm bằng chứng → commit đó lên thật → góp ý bị đẩy đi |

**Và không có đường lùi.** Đo với phiên Sếp Ngọc thật (`duyet_gopy=1`):
`POST /api/gop-y/xac-nhan-da-len {dong_y:false}` trả **400 "Góp ý này không có gì đang
chờ xác nhận"** — vì `deploy_cho_xac_nhan` chỉ dựng cho rổ an toàn. Đúng những ca máy
đẩy nhầm thì **không nút nào gỡ được**, và panel của Sếp cũng không hiện chúng.
**Tệ hơn:** ca gõ nhầm đốt luôn `bao_da_len_luc`. Đo: sau khi Sếp sửa tay trạng thái
về, lần deploy sửa THẬT sau đó gửi **0 tin** — chốt "đúng một tin" là vĩnh viễn cho
mỗi góp ý, không phải mỗi vòng. Cùng lỗi này làm **vòng nghiệm thu thứ 2 câm**:
`da_duyet → deploy → 1 tin → nghiệm thu chưa đạt → sửa lại → deploy → 0 tin`.

## CÂU 2 — RỔ AN TOÀN CÓ ĐÚNG KHÔNG, VÀ CÓ QUÁ RỘNG KHÔNG

Rổ đúng: 5 trạng thái chưa qua cổng đều đứng lại, dựng cờ, 0 tin. Có đối chứng cơ học.
**Nhưng đây là câu quan trọng nhất, và câu trả lời là: KHÔNG, tính năng này không làm
Sếp bớt việc.** Đọc DB thật (chỉ đọc, `--remote`) sáng 29/08:

```
cho_phan_tich  4     ← toàn bộ góp ý đang mở
hoan_thanh     1
```

**4/4 góp ý đang mở nằm trong rổ an toàn. Đường tự động sẽ đóng đúng 0 góp ý.**
Cả 4 đều là thứ Sếp nhìn thấy hôm 28/08 (`Không hiện thông báo khi có tin nhắn đến`,
`Lỗi số năm chỗ ngày sinh`, …) — việc đã sửa xong và lên thật, nhãn vẫn "Đã duyệt —
chờ phân tích".

Nguyên nhân gốc **không phải** chỗ nào thiếu tự động, mà là **không ai đẩy góp ý qua
các trạng thái giữa**: nó nhảy thẳng từ `cho_phan_tich` sang "Khỉ Đột build xong, Gạo
deploy". Chừng nào quy trình còn thế, máy sẽ mãi mãi chỉ dựng cờ.

Tính năng biến *"góp ý treo, không ai biết"* thành *"góp ý treo + 1 tin Telegram cho
Sếp + 1 nút Sếp phải bấm cho từng cái"*. **Đó là dời việc, không phải bớt việc** — dù
dời sang chỗ tốt hơn (Sếp *biết*, và một cú bấm thì người báo được báo).

→ Hai việc làm cho tính năng có tác dụng thật, xếp theo giá trị:
1. **Gạo/Khỉ Đột đẩy `cho_phan_tich → da_duyet` ngay lúc nhận việc.** Một dòng trong
   quy trình, không phải một dòng code. Không có bước này thì cả đợt này chỉ là bộ chuông.
2. `dong-lui-gop-y.mjs` xử 4 góp ý tồn đọng hôm nay (dụng cụ đã có, đã đo, chạy tốt).

## CÂU 3 — ĐƯỜNG SỬA TAY · SCRIPT ĐÓNG LÙI

Đo độc lập, có phiên Sếp thật — **7 đạt / 9**, 2 trượt đúng là ca gõ nhầm ở Câu 1.
Chặn `ghi_chu` < 20 ký tự → 400 ✔ · đóng bằng hướng dẫn → `hoan_thanh` ✔ · **đúng câu
Sếp viết** đến thẳng người gửi ✔ · `dong_kieu='huong_dan'` ✔ · đóng lần 2 → 400, vẫn
**đúng 1 tin** ✔ · admin **không** có cờ `duyet_gopy` → 403 cả hai đường ✔.
Script đóng lùi (chạy lại bàn thử tác giả): 2 dòng đổi · 3 dòng ngoài cuộc nguyên vẹn ·
chạy lại 0 dòng · "dòng đã đổi từ lúc in" → **0 dòng bị ghi** ✔.
Deploy lại 3 lượt → đúng 1 tin ✔ (nhưng xem T3: rổ an toàn thì 3 lượt = 3 dòng lịch sử).

## CÂU 4 — CHI PHÍ VÀ AN TOÀN

- 0 mã → script `return` trước khi gọi → **0 lượt gọi, 0 câu ghi** ✔
- Có mã → 1 UPDATE + 1 lịch sử + tối đa 1 tin · trần 30/lượt **có hiệu lực** (30/40) ✔
- Lịch sử: `nguoi_doi_id = NULL`, `tac_nhan = 'DEPLOY'` — **không mạo danh ai** ✔
- **4 tổ hợp khoá × migration đo đủ**: chỉ (đủ khoá + đủ cột) mới đổi; 3 tổ hợp còn lại
  → 503, **0 góp ý bị đổi**, và **danh sách góp ý không 500** ở cả 4 ✔
- **Khoá lệch giữa GitHub và Cloudflare**: máy chủ trả 401, script in `::warning::`, nhưng
  `continue-on-error: true` giữ job XANH; **thiếu khoá phía GitHub chỉ in `console.log`
  thường** → không dấu hiệu nào. Nặng hơn: lượt đẩy **không có mã nào** thì script không
  gọi ERP → khoá lệch **không bao giờ lộ ra** cho tới hôm có góp ý thật bị bỏ rơi.
- Không thêm trạng thái — vẫn đúng **15** ✔
- 6 cột `ADD COLUMN`, file lùi **6/6 đạt**: cất đủ 6 giá trị cũ + `lui_luc` vào
  `gopy_da_len_luu_lui`, không đụng cột nghiệp vụ, gỡ chốt `schema_migrations`, **tiến lại được** ✔

## CỔNG KHÓI

`npm run cong-khoi` **không tồn tại trên nhánh này** (dựng ở `e9170de`, sau `a9dc0f1`).
Chép tạm 2 file từ `main` vào worktree, chạy, rồi xoá (`git status` sạch).

```
cây làm việc be93220 : ĐỎ — 1 console.error · 4/10 nút cửa ngõ hỏng
gốc         a9dc0f1 : ĐỎ — 1 console.error · 4/10 nút cửa ngõ hỏng   (Y HỆT)
```
**Đỏ vì nợ cũ, không phải vì nhánh này** — đúng lỗi `TDZ TBDay` của chat, đã vá ở
`239aba7`/`e9170de` trên main. Nhánh này thêm **0 khói mới**; 6 nút tab (gồm Góp ý ERP) xanh.

## BẢNG LỖI

| # | Lỗi | Mức | Chặn phát hành |
|---|---|---|---|
| C1 | Gõ nhầm mã / commit tài liệu / gộp nhánh bỏ dở → đóng nhầm + nhắn nhầm người gửi. Cần: chỉ tin commit **có đổi file trong `src/` hoặc `public/`**, và với rổ `dang_xay` thì **dựng cờ cho Sếp** thay vì tự đẩy | CAO | **CÓ** |
| C2 | Commit `Revert` được tính là "đã lên". Cần: bỏ qua commit khớp `^Revert "` và cảnh báo Sếp nếu góp ý đó đang `hoan_thanh` | CAO | **CÓ** |
| C3 | Ca máy đẩy nhầm **không có đường gỡ**: `/xac-nhan-da-len` trả 400 vì `deploy_cho_xac_nhan=0`. Cần cho phép gỡ mọi góp ý có `deploy_sha` do máy gắn | CAO | **CÓ** |
| C4 | `bao_da_len_luc` là chốt **vĩnh viễn** → một lần nhắn nhầm (hoặc vòng nghiệm thu 2) làm người gửi **không bao giờ** được báo nữa. Cần đóng dấu theo `(góp ý, sha)` chứ không theo góp ý | CAO | **CÓ** |
| C5 | Đường phụ `bang_chung_url` đóng góp ý **không cần mã `GY-` nào** — link "commit gây ra lỗi" cũng khớp. Cần bỏ đường phụ, hoặc chỉ dựng cờ chứ không đổi trạng thái | CAO | **CÓ** |
| T1 | Trần 30/lượt cắt im lặng — thân trả về chỉ có `ok, da_doi, chi_tiet`, không nói đã cắt. Phạm đúng luật `ab92afc` ("danh sách bị cắt PHẢI NÓI RA") | TRUNG | không |
| T2 | Khoá lệch/thiếu ở GitHub im lặng trong Actions (`console.log`, job xanh). Cần `::warning::` cho cả ca thiếu khoá, và một lượt gọi "chào hỏi" cả khi 0 mã để lộ lệch khoá sớm | TRUNG | không |
| T3 | Phát lại bản tin trong 30 phút → góp ý rổ an toàn sinh **3 dòng lịch sử** cho 3 lượt (đo được). Nên chỉ ghi khi `deploy_sha` đổi | THẤP | không |

## HAI VIỆC SẾP PHẢI LÀM (sau khi vá xong C1–C5)

1. `npm run nap-dalenthat` — nạp 6 cột. **Kiểm:** mở tab Góp ý, danh sách vẫn hiện
   bình thường (không 500). Chưa nạp cũng không sập, chỉ mất tính năng.
2. Đặt khoá **`DEPLOY_CHOT_KHOA` GIỐNG HỆT ở CẢ HAI NƠI**: GitHub → Settings →
   Secrets, và `npx wrangler secret put DEPLOY_CHOT_KHOA`.
   **Kiểm:** đẩy một commit có mã góp ý thật, mở tab Actions → bước "Báo ERP…" phải in
   `ERP trả mã 200`. In `401` là hai khoá lệch nhau; in "Chưa đặt secret" là thiếu bên GitHub.
