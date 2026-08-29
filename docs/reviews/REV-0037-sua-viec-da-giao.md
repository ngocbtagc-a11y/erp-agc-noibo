# REV-0037 — Sửa được thứ đã tạo ra (việc đã giao + mục tiêu)

**Soi:** `feature/ctl-0017-sua-viec-da-giao` `4ba2517` (nền `main` `a9dc0f1`) · **Yêu cầu
gốc:** Sếp Ngọc, nhắc **hai lần** · **Người soi:** HỒ LY · 29/08/2026
**Kết luận: FIX_REQUIRED** — **luật chia nhóm trường là ĐÚNG, không sửa lại một chữ.**
Ba chỗ phải vá đều là việc vặt (~20 phút), **0 chỗ đụng vào thiết kế**. Không tin lời
khai: chạy lại toàn bộ bàn đo của Khỉ Đột **và** dựng bàn đo riêng (15 ca) hỏi chỗ tôi nghi.

## ① CÂU 1 — Bốn nhóm trường chia đúng chưa? **ĐÚNG.**

**(a) `tieu_de`/`mo_ta` "sửa thoải mái" — có thật là không thước đo nào lệch không?**
Truy hết đường: không bảng nào **chụp ảnh** `tieu_de` (mọi màn đọc live qua `CV_TU`);
báo cáo đếm theo `muc_tieu_id`/`trang_thai`, không theo tên; ô tìm kiếm lọc phía trình
duyệt trên giá trị hiện tại; và `hoan_thanh`/`huy` **đã khoá** nên không sửa ngược được
bản ghi đang làm bằng chứng. Thông báo cũ giữ tên cũ — đúng, đó là nhật ký tin nhắn.
→ **Không có chỗ nào lệch.**

**(b) Bắt buộc lý do cho `han_chot` — cân đúng chưa? Đúng.** Không cắt quá tay vì ba
điểm tựa: nhóm ① vẫn mở suốt `moi`/`dang_lam`/`cho_duyet`; cửa lý do chốt **sau** khi đã
biết đổi gì, nên gửi lại y hệt = **0 dòng ghi, không bị đòi lý do** (đo được); và ca
DC-B đo đúng chiều **chặt quá tay**.
⚠️ Nhưng nói thẳng: **ngưỡng 5 ký tự KHÔNG lọc được lý do cho-có.** Tôi đo: `"aaaaa"`
**lọt cả hai lớp** — lọt cửa máy chủ (200) và lọt luôn trigger CSDL, rồi vào sổ nguyên
văn *"…đổi hạn chót 30/08/2026 → 09/09/2026 — lý do: aaaaa"*.
→ Đó **không phải chỗ nó phải lọc**. Ngưỡng 5 chỉ chặn `"x"`, `"."`, `"   "` — đúng việc
của nó. Răn đe thật nằm ở chỗ lý do **bị gán tên người** và **bắn thẳng cho người giao**.
**Đừng siết thêm độ dài** — chỉ đẻ ra `"aaaaaaaaaa"` và làm phiền người dùng thật.

**(c) "Người nhận việc của người khác không sửa được GÌ" — kể cả gõ nhầm chính tả?**
Đo: **đúng, chặn 403** kể cả sửa mỗi chính tả tiêu đề. **Tôi giữ nguyên** — tiêu đề là
**tên của cam kết**, không phải nhãn trang trí; cho người nhận đổi tên việc là cho họ đổi
việc mình đang bị đo. Nhưng **họ không có đường xin sửa**: câu lỗi bảo *"báo người giao
việc"* mà trong app không có nút nào làm việc đó → phải nhắn tay. Xem L6.

## ② CÂU 2 — Chốt hạn chót có thủng không? **KHÔNG.**

| Tôi tự đo (bàn đo riêng) | Kết quả |
|---|---|
| Đi vòng qua máy chủ — **chèn thẳng SQL** dời hạn không lý do | **Trigger CSDL ABORT** ✔ |
| Đối chứng: chèn thẳng SQL sửa `dau_ra` không lý do | **Cho qua** ✔ (trigger không cắt quá tay) |
| Lý do rác `"aaaaa"` | **Lọt cả hai lớp** — xem §①(b) |
| Quản lý dời hạn → người giao nhận mấy tin? | **ĐÚNG 1 tin**; người nhận **đúng 1 tin** (gộp, không mỗi trường một tin) ✔ |

Hai lớp là **thật**, không phải khai suông — nhưng cùng một luật nên cùng một lỗ.

## ③ CÂU 3 — Con số 22: **không kiểm chứng được, vì chưa ai viết nó ra**

Tôi quét lại độc lập theo bảng định tuyến: **29 cửa TẠO do người dùng bấm**, trong đó
**9 chỗ không có đường sửa nào** (2 chỗ đúng khi bất biến: sổ nhập/xuất kho, đơn đồng bộ
từ sàn). Con số của tôi ≠ 22 — **và không đối chiếu được**, vì trong nhánh này **không có
một dòng nào** ghi 22 chỗ ấy là chỗ nào, 6 chỗ hàng đợi là chỗ nào. `docs/CHANGELOG.md`
là file docs duy nhất được sửa và **không có dòng "quét N chỗ / xử M chỗ"**.
→ `LUAT-GOP-Y-LA-TRIEU-CHUNG.md` §4 (*"phải ghi ra, không được im"*) và §5 (*"thiếu hai
thứ đó thì Review Gate trả lại"*). **Trả lại — xem L3.**

**Vinh danh — tôi nâng mức, không để trong hàng đợi.** Xác minh: `vdGui()` là cửa DUY
NHẤT; **0 đường sửa, 0 đường xoá**, và `UPDATE nhan_su SET sao = sao + ?` **không lùi
được**, thông báo thì đã bắn cho người được khen ngay lúc gửi. Sếp Ngọc đang **tập thói
quen ghi nhận nhân viên** — chọn nhầm tên trong danh sách hoặc gõ nhầm là lời khen đóng
băng vĩnh viễn vào hồ sơ người khác, cộng sai sao, và người đó đã nhận tin. **Đây là chỗ
lời khen quay ra phản tác dụng** → xem L5.

**`độ ưu tiên`:** xác minh xong — `migrations/them-congviec.sql` + 5 file `ALTER TABLE
cong_viec` **không có cột nào tên đó**. Khỉ Đột **không bịa thêm cột.** ✔

## ④ CÂU 4 — Hai lỗi bàn đo nó tự bắt: **đã vá thật, cả hai**

- **`ban_ghi_id` bind số:** đo lại — mọi dòng trong bảng đều `typeof = text`, đọc lịch sử
  việc `#1` ra **5 dòng** (không rỗng) ✔. Quét chỗ tương tự: `dulieunen.ghiLichSuThayDoi`
  đã `String(banGhiId)` từ trước, `mtCapNhat`/`suaLichSu` đều ép kiểu. **Không còn chỗ nào.**
- **`batch()` không giao dịch:** tôi tự bẻ — `batch([UPDATE hợp lệ, INSERT hỏng])` →
  **nổ VÀ câu UPDATE bị lùi**, tiêu đề giữ nguyên ✔. Đúng D1 thật.
  **Bản vá làm bàn đo NGHIÊM hơn, không lỏng hơn**, nên nó chỉ có thể **lật ngược** kết
  luận cũ chứ không thể tạo kết luận đạt giả. Tôi chạy lại mọi bàn đo còn dùng
  `ban-thu-d1.mjs`: `do-trangthai-thongbao` **79/0** · `tu-kiem-nhac-cong-viec` **85/0** ·
  `do-va-rev0019` **35/0** · `do-ghi-dongbo` **31/0** · `do-duong-di-tiep` **21/0**.
  → **Không kết luận nào đảo chiều.**

## ⑤ CÂU 5 — Hồi quy

`do-sua-viec-da-giao` **55/0** (tôi chạy lại, khớp) · `do-quyen-duyet-gopy` **183/9** —
tôi bung `main` `a9dc0f1` ra thư mục riêng và chạy: **183/9 y hệt**, cả 9 dòng đều là
*"KHÔNG ĐO ĐƯỢC: D1 bản máy chưa có tài khoản ttb"* → **môi trường, không phải hồi quy** ✔
`do-ba-mau` và `do-tuong-phan-mau`: **cùng số trượt trên nền** (2 cặp tương phản `.gy-td-*`
có sẵn); nhánh này **thêm 4 cặp mới, cả 4 đều đạt**, không thêm màu họ thứ tư → **luật ba
màu giữ nguyên** ✔ (`--warn` nằm trong họ nâu–cam; cố ý không dùng đỏ — đúng §3 BẢNG MÀU).
**44px tôi tự đo lại**, không dùng script của nó, thêm bề ngang **320px**:

| | Sửa (bảng) | Lưu | Hủy | Ô lý do | Tràn ngang |
|---|---|---|---|---|---|
| **375px** | 28 → **44** | 46 | 38 → **44** | 46 | không |
| **320px** | 28 → **44** | 46 | 38 → **44** | 46 | không |

Đối chứng gỡ CSS bắt được ở cả hai bề ngang ✔

## ⑥ Bảng lỗi

| # | Mức | Lỗi | Chặn phát hành |
|---|---|---|---|
| **L1** | **CAO** | `node scripts/do-cat-im-lang.mjs` **chuyển ĐỎ vì chính nhánh này**: `suaLichSu()` `LIMIT 100` cắt mà không gọi `catBot/nhanCat`, cũng không có trong bảng miễn trừ. Lưới chống tái phát dựng cho góp ý chị Lan Hương bị bản này làm đỏ ngay vòng đầu. **Nền `a9dc0f1` chạy ra SẠCH.** Vá: thêm 1 dòng `MIEN_TRU` có **lý do viết ra** trong `scripts/do-cat-im-lang.mjs:53` | **CÓ** |
| **L2** | **CAO** | **Thứ tự phát hành.** `deploy.yml` tự deploy khi đẩy `main` nhưng **không chạy migration**. Deploy trước migration → `mtCapNhat` (**tính năng ĐANG chạy**, không phải tính năng mới) nổ 500 vì `INSERT … ly_do` không có cột. Vá rẻ: **bỏ hẳn cột `ly_do` khỏi câu INSERT của `mtCapNhat`** (`src/index.js:3585`) — ở đó nó luôn `NULL` — thì mục tiêu sống độc lập với migration | **CÓ** |
| **L3** | **TB** | Thiếu dòng **"quét N chỗ / xử M chỗ"** và **6 chỗ hàng đợi không được ghi ra chỗ nào**. Đây là điều `LUAT-GOP-Y` §5 nói thẳng là *Review Gate trả lại* | **CÓ** |
| **L4** | **TB** | **Yêu cầu lần hai của Sếp chưa được đụng tới.** `mtCapNhat` **đã sửa được `tieu_de`/`mo_ta` từ commit `28976b6`** — chính CHANGELOG mục (G) thừa nhận. Nhánh này chỉ **thêm ghi vết**, không mở thêm trường nào. Thứ vẫn **không sửa được** là `cap`, `bo_phan`, `nam`, `quy` (đặt lúc tạo, vĩnh viễn). Nếu đó là chỗ Sếp vướng thì sẽ có **lần nhắc thứ ba** → Gạo hỏi lại Sếp **đúng ô nào** trước khi đóng CTL-0017 | Không (nhưng **chặn việc báo "đã xong"**) |
| **L5** | **TB** | **Vinh danh** không đáng nằm hàng đợi — xem §③. Đề nghị **P1 đợt kế**: cho người gửi sửa/thu hồi trong 24h, `sao` trừ lại theo đúng số đã cộng, có ghi vết vào **đúng sổ chung** vừa dựng (`bang='vinh_danh'`) | Không |
| **L6** | **THẤP** | Người nhận bị 403 kèm câu *"báo người giao việc"* nhưng **không có nút nào** làm việc đó. Đề nghị nút **"Xin sửa"** gửi 1 `guiThongBao` cho người giao — rẻ, dùng lại đường có sẵn | Không |
| **L7** | **THẤP** | Quyền **quản lý cấp trên** (`laCapTrenCua`) chỉ tồn tại ở máy chủ: nút "Sửa" chỉ vẽ ở bảng *Việc tôi giao* và todo cá nhân, nên **anh Duy không có đường nào trên màn hình** để dời hạn cho team kho — đúng kênh báo cáo Sếp đã chốt lại đi qua API tay | Không |
| **L8** | **THẤP** | Hộp Sửa chỉ mở **4/7 trường** API nhận: thiếu `muc_tieu_id`, `nguoi_nhan_id`, `phoi_hop`. Đổi mục tiêu/người nhận đã cắt luật xong ở máy chủ nhưng người dùng không với tới | Không |
| **L9** | **THẤP** | Đổi `muc_tieu_id` → mục tiêu **vừa mất một việc** và mục tiêu **vừa nhận** đều có **sổ sửa rỗng** (đo được). Vết ghi vào `bang='cong_viec'` nên **không hiện ở chỗ người ta sẽ đi tìm** — đúng cái rủi ro Khỉ Đột tự nêu để biện minh cho ghi vết | Không |
| **L10** | **THẤP** | Ở bước `cho_duyet`, gửi kèm `han_chot` **y hệt giá trị cũ** vẫn bị **409 oan** (`chan()` chạy trước phép so sánh). Giao diện đang giấu ô nên chưa với tới, nhưng L8 mở ra là gặp | Không |

## ⑦ Vá xong L1–L3 thì phát hành thế nào

1. **Vá L2 trước** (bỏ `ly_do` khỏi INSERT của `mtCapNhat`) → `node scripts/do-sua-viec-da-giao.mjs` phải vẫn **55/0**.
2. **Vá L1** → `node scripts/do-cat-im-lang.mjs` phải in **`KẾT QUẢ: SẠCH`**.
3. **Vá L3** → CHANGELOG có dòng *quét 29 / xử 2*, `docs/HANG-DOI.md` có đủ 6 chỗ **kèm lý do từng chỗ**.
4. **Nạp migration TRƯỚC khi merge:** `node scripts/chay-migration.mjs migrations/them-ly-do-sua.sql --remote`
   → kiểm: `node scripts/kiem-tra-migration.mjs --remote` không còn báo thiếu file này.
5. Merge `main` → Actions tự deploy. **Kiểm sau deploy, đúng 3 phát trên điện thoại:**
   sửa chính tả một việc *(phải xong, không hỏi lý do)* · dời hạn **bỏ trống lý do** *(phải bị từ chối, có câu giải thích)* · dời hạn **có lý do** *(phải xong, và tài khoản người giao thấy đúng 1 thông báo)*.
6. Mở "Đã sửa những gì" trong hộp Sửa — phải ra **câu tiếng Việt, ngày kiểu 30/08/2026**, không phải mã máy.
