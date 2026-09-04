# REV-0057 vòng 5 — Màn hình tự làm mới

**Kết luận: PASS** (0 CHẶN · 0 CAO · 2 VỪA · 2 THẤP — **không việc nào chặn đẩy**)

**Sản phẩm sạch.** Tôi không tìm được khối hiển thị nào còn nói dối. Lỗi CAO của vòng 4 —
ô chọn Phòng ban ở Xếp ca — nay **chạy thật**, tôi đo bằng chữ trong ô chọn với bàn soi của
chính mình. Cả bốn lỗi VỪA của vòng 4 đều đóng, và mỗi cái tôi đều thử phá lại bằng một cách
khác.

**Và một chuyện tôi phải nói trước.** Ở VỪA-1, **Khỉ Đột đúng, tôi sai.** Vòng 4 tôi kết luận
"danh sách Lịch sử làm việc khai đã nối dây nhưng KHÔNG" — bằng chứng là `0 lượt gọi`. Đo lại
bằng **chữ trong bảng**, chữ **có đổi**, và 0 lượt ở đó là **tiết kiệm chứ không phải bỏ sót**.
Tôi đã vi phạm đúng bài học tôi tự viết ra trong chính báo cáo đó: *"đếm lượt gọi mạng là phép
đo gián tiếp"*.

Hồ Ly soi `a39c920`. Không commit, không sửa một dòng mã sản phẩm nào.

| | |
|---|---|
| CHẶN · CAO | **0 · 0** |
| VỪA | 2 (đều là "lưới chưa canh", không phải lỗi đang sống) |
| THẤP | 2 |
| Vòng 4: CAO · VỪA-1 · VỪA-2 · VỪA-3 · VỪA-4 · THẤP×2 | **ĐÓNG hết** (VỪA-1 đóng vì **tôi sai**) |
| Cổng đo | **18/18 đúng lời khai** |
| Khối hiển thị còn nói dối | **0** |

⚠️ **`origin/main` nay là `c221fd0`; nhánh đang đứng sau 1 commit** (merge-base `c55e9ce`).
Phải gộp lại trước khi đẩy — chỉ 1 commit, và tôi đã soi nó (mục ⑦).

---

## ① AI ĐÚNG Ở VỪA-1 — **Khỉ Đột đúng, tôi sai**

Vòng 4 tôi đo `/api/cong-viec/lich-su` = **0 lượt** rồi kết luận "chưa nối dây". Vòng này tôi
dựng bàn soi mới chấm bằng **CHỮ TRONG BẢNG `#ls-cv-bang`** (`scripts/soi-lichsu-bang-chu.mjs`):

```
trước: Việc thử 1 | … | Chờ duyệt | …  ||  Việc thử 2 | … | Chờ duyệt | …
sau  : Việc thử 1 | … | Hoàn thành| …  ||  Việc thử 2 | … | Đang làm  | …
lượt gọi: cap-nhat×1 · danh-sach×1 · tong-quan-congty×1 · hom-nay×1 · thong-bao×1
  ✅ A1 CHỮ trong bảng ĐÃ ĐỔI (không cần F5)
  ✅ A2 không tốn thêm lượt gọi cvLichSu — 0 lượt
```

Đường đi có thật trong mã, không phải may: `lamMoiCacManLienQuanCv` (`app.js:3496`) gọi
`await window.LAM_MOI_LICHSU_VIEC()`, và hàm đó (`app.js:3999`) vẽ lại bằng `veBangLsCv()` từ
`window.CV_DU_LIEU_CUA_TOI` vừa được `taiLai()` nạp mới ngay trên. **Màn hình đúng, và đúng
mà không tốn thêm một lượt đọc D1 nào** — tốt hơn cả nối dây thẳng.

**Kết luận VỪA-1 vòng 4 của tôi bị rút.** Bàn soi `soi-hai-man-contro.mjs` (bàn đã in kết luận
sai đó) tôi đã sửa lại tại chỗ, ghi rõ vì sao sai, để nó không tiếp tục khẳng định điều sai.

**Chốt "nghe có điều kiện"** — đo được ở `soi-hai-man-contro.mjs` ②, có đối chứng dương ③:
```
② Lịch sử hoàn · CHƯA bấm "Tải thêm" · ghi kdDaDoiSoat → /api/hoan/lich-su: 1 lượt ✔
③ ĐỐI CHỨNG: bảng Đơn hoàn (có nghe) → 1 lượt ✔
```
và ở `soi-lichsu-bang-chu.mjs` D1: chữ đổi `RS-1` → `RS-MOI`. **Chưa bấm thì nghe — đúng.**

**"Bấm rồi rời tab quay lại thì sao?"** — bàn soi của tôi **không dựng được nút "Tải thêm"**
(nút chỉ hiện ở phạm vi *Toàn công ty* và chỉ khi máy chủ trả `cat.tong`, `app.js:3926-3947`),
nên tôi **không đo được** ca đó và **không báo nó là lỗi**. Trả lời bằng đọc mã, và nói rõ đây
là đọc mã chứ không phải phép đo:

- `daBamThemLSCV` / `daBamThemLS` là biến trong closure, **đặt một lần khi bấm và không ai đặt
  lại**. Rời tab quay lại **không** reset (mô-đun không khởi động lại). → đúng như thiết kế:
  bấm rồi thì thôi, vĩnh viễn trong phiên đó.
- **"Bấm rồi mà dữ liệu đổi thì người dùng biết bằng cách nào?"** Hai màn khác nhau:
  · **Lịch sử làm việc**: nhánh `daBamThemLSCV` vẫn gọi `veBangLsCv()` → các dòng thuộc ba
    phạm vi *của tôi* **vẫn cập nhật**; chỉ phạm vi *Toàn công ty* (dòng do máy chủ phân trang)
    là đứng yên.
  · **Lịch sử hoàn**: `lamMoiLichSuHoan` `return` sớm → **không vẽ lại gì cả**, và **không có
    dấu hiệu nào** báo cho người dùng biết bảng đã cũ.
  → Xem THẤP-1.

---

## ② CAO vòng 4 — ô chọn Phòng ban: **ĐÓNG**, đo bằng chữ

`scripts/soi-dropdown-xepca.mjs` (bàn soi của tôi, chấm bằng chữ trong ô chọn):

```
── TRƯỚC (merge-base)      "Kho vận" → "Kho vận"            ✘  · gọi phong-ban 0 lượt
── SAU  (bản vá vòng 5)    "Kho vận" → "Kho vận ĐỔI TÊN"    ✔  · gọi phong-ban 1 lượt
                            giữ nguyên lựa chọn đang chọn:  ✔
```

Khớp đúng lời khai. Bản vá đọc `DS_PHONG_BAN` — kho danh mục nền — thay vì mảng đông cứng
`dsPhongBanQuanLy`, và xử cả hai đường (admin dựng từ danh mục · trưởng phòng chỉ đổi tên).

---

## ③ VỪA-1 · Thứ tự phụ thuộc **có thật, và KHÔNG có gì canh nó**

Bản vá dựa vào một câu trong chú thích: *"`taiDanhMucNen` nạp lại và đăng ký nghe TRƯỚC người
nghe này nên khi tới lượt đây thì kho đã mới"*. Câu đó **đúng hôm nay** — `taiDanhMucNen` đăng
ký ở `app.js:122` (đầu tệp), `doPhongBanXepCa` đăng ký trong `khoiDongXepCa` chạy sau — và đài
chạy lần lượt theo thứ tự đăng ký. Nhưng **không có gì bảo đảm nó**.

Tôi thử bằng **một refactor có thật ai cũng có thể làm**: bỏ lời `ngheDuLieu` ở đầu tệp, khai
`taiDanhMucNen` thành hàm thường, rồi **đăng ký nó ở CUỐI `app.js`**. Không đổi gì khác:

```
ô chọn Phòng ban : "Kho vận" → "Kho vận"   ✘ NÓI DỐI TRỞ LẠI  (vẫn gọi phong-ban 1 lượt)
do-tu-lam-moi    : ĐẠT 50 · TRƯỢT 0        ← KHÔNG bàn đo nào kêu
cong-khoi        : ✅ XANH
```

Để so sánh, tôi cũng thử **đảo toàn bộ** thứ tự chạy người nghe (`xa()` duyệt ngược):
`do-tu-lam-moi` **đỏ 2 chỗ** (⑧b, ⑪c) — nhưng đó là do **thẻ tóm tắt**, không phải ô chọn.
Nghĩa là: thứ tự *nói chung* có lưới canh; **riêng ô chọn Phòng ban thì không**.

**Không phải lỗi đang sống** — hôm nay ô chọn chạy đúng. Nhưng đây đúng loại phụ thuộc ngầm
đã làm bản vá vòng 3 chết im lặng, và lần này nó lại không có ca đo nào.
→ **Thêm một ca vào `do-tu-lam-moi`: đổi tên phòng ban → đọc CHỮ trong `#xcPhongBan`.**
Một ca, và nó khoá luôn cả giả định thứ tự.

---

## ④ VỪA-2 · Kiểm kê: ba dạng cũ đã vá, tôi tìm được **dạng thứ tư**

**Dạng đã vá (xác nhận):** regex tiền tố nay nhận cả chuỗi mẫu → `taiMaTran` và
`taiLichCuaToi` đã vào bảng, **44 → 46 khối**. Tôi đếm độc lập: **46 · 123 gọi + 13 truyền =
136**, khớp từng con.

**Hai dạng còn mù ĐÃ GHI VÀO MÃ** — xác nhận thật, không chỉ trong báo cáo
(`do-kiem-ke-lam-moi.mjs:356-366`, ngay trên `veGianTiep`): *"① MƯỢN HAI CẤP … ② VẼ QUA THAM
SỐ … Ai gặp một khối nói dối mà bảng này không kể tên, hãy ngờ hai dạng đó trước."* Ghi đúng
chỗ, đúng giọng.

**Tôi giấu tiếp hai dạng MỚI** (`lab` riêng, không đụng repo thật), kèm hai đối chứng dương:

| Hình dạng | Kết quả |
|---|---|
| ① một hàm *(đối chứng dương)* | ✅ TÌM RA, rổ A — 46→47 |
| ② hai hàm, mượn một cấp *(đối chứng dương)* | ✅ TÌM RA, rổ A — 46→47 |
| **⑥ MỚI — vẽ trong callback `setTimeout`** | ✅ **TÌM RA**, rổ A — 46→47 |
| **⑦ MỚI — vẽ qua MÓC NỐI `window.LAM_MOI_*` (`goiMocNoi`)** | ❌ **KHÔNG TÌM RA** — 46→46 |

Dạng ⑦ **không phải ca bịa**: `goiMocNoi` + `window.LAM_MOI_*` là khuôn liên-mô-đun mà chính
ERP này đang dùng thật (`app.js:3496` gọi `window.LAM_MOI_LICHSU_VIEC`, và đó chính là đường
làm cho VỪA-1 ở trên đúng). Một khối tương lai viết theo đúng khuôn nhà mà chưa nối dây thì
bảng kiểm kê sẽ không kể tên nó.

Về bản chất ⑦ là biến thể của dạng ② đã khai (gọi qua một cái tên khác), nhưng nó có **tên
riêng, có khuôn riêng, và máy đã có sẵn bảng `biDanhWindow`** — nên vá được rẻ.
→ **Đề nghị: cho `veGianTiep` tra thêm `biDanhWindow` — máy đã dựng bảng đó rồi
(`do-kiem-ke-lam-moi.mjs:246`), chỉ chưa dùng ở đây.** Và bổ sung dạng ⑦ vào chú thích.

---

## ⑤ Ba con số cuối — **46 · A 13 · B 28 · C 5 · 136**: đếm lại ĐÚNG

Tôi đếm độc lập lần cuối trên mốc `c55e9ce`: **46 khối · rổ A 13 · rổ B 28 · rổ C 5**, và
**123 chỗ gọi + 13 chỗ truyền = 136**. Khớp từng con với lời khai.

**Cách đọc rổ A nó ghi vào mã: 6 đã nối dây (2 nghe có điều kiện) · 4 hộp mở theo yêu cầu ·
3 nhiễu.** 6+4+3 = 13 ✔. Tôi soi từng nhóm:

| Nhóm | Tôi kiểm |
|---|---|
| **6 đã nối dây** — thẻ tóm tắt · chuông · CSKH · ô chọn Phòng ban Xếp ca · Lịch sử làm việc · Lịch sử hoàn | **ĐÚNG cả 6**. Ô chọn: đo bằng chữ ✔ (mục ②). Lịch sử làm việc: chữ đổi, 0 lượt ✔ (mục ①). Lịch sử hoàn: 1 lượt + chữ đổi ✔ |
| **4 hộp mở theo yêu cầu** — chi tiết Mục tiêu · "ai làm được" · giấy tờ hồ sơ · quét QR | **ĐÚNG cả 4** (khớp kết luận tôi tự soi từ vòng 3) |
| **3 nhiễu** — `veLaiBangNs` · `khoiDongKho` · `khoiDongKhoTaiLieu` | **ĐÚNG cả 3** — `soi-khoi-bo-sot` đo lại: `qtSuaNhanSu` → 1 lượt ✔ · `khoSuaSanPham` → 1 lượt ✔ |

**Không còn nhóm "cố ý không nghe"** — cả hai màn có con trỏ nay đều nghe có điều kiện. Đó là
sửa đúng: nó tự nhận vòng 4 để cả hai không nghe hẳn là **quá tay**, và tôi đồng ý.

---

## ⑥ Bốn lỗi VỪA của vòng 4 — thử phá lại từng cái

| Vòng 4 | Tôi thử phá lại | Kết quả |
|---|---|---|
| **③g lách được bằng chú thích** | Lách **cách thứ hai**: đặt tên khoá trong một **CHUỖI** (`const _ghiChu = "chua xu ly can_chu_ky_sep"`) | **❌ ③g vẫn ĐỎ**, gọi đúng tên `can_chu_ky_sep`. Nay nó bóc chú thích + chuỗi rồi mới hỏi **đúng khối `CHUA_LUU_DU`**, và dùng lại máy bóc đã có thay vì chế cái thứ hai. **ĐÓNG** |
| **`--tu-kiem-tdz` không có khối chấm, đảo quy ước mã thoát** | Chạy thẳng | `✅ TỰ KIỂM TDZ ĐẠT — lỗi ở mô-đun chỉ vai đủ quyền mới nạp tới đã làm cổng khói đỏ`, **exit=0** — cùng quy ước với `--tu-kiem`. **ĐÓNG** |
| **`cong-khoi.mjs:112` dấu nháy đơn nuốt `${…}`** | Đọc mã | Đã dùng dấu huyền, in ra giá trị thật. **ĐÓNG** |
| **Nhãn `trong` sai** (vòng 3) | `grep "trong khoiDongChat"` | không còn. **ĐÓNG** |

---

## ⑦ Ca xấu nó tự nêu — xác nhận từng cái

- **`do-kho-tai-lieu` đỏ 2 mục, nó không sửa bàn đo người khác cho mình xanh.** Xác nhận đúng
  kỷ luật. Và **tôi soi bản vá `c221fd0` trên `main`**: đúng **8 dòng, 2 dòng đổi + 4 dòng chú
  thích**, và cả hai dòng đổi chỉ **neo lại chuỗi mỏ neo** cho khớp chữ ký mới
  (`duocXemNhomTaiLieu(phien.vai_tro, …)` → `duocXemNhomTaiLieu(phien, …)` sau khi nhánh tách
  vai trò đổi hàm). **Khiếm khuyết gài vào giữ nguyên, phép chấm giữ nguyên — neo lại, KHÔNG
  nới lỏng.** Chạy lại: `do-kho-tai-lieu` **ĐẠT** (5 ca đối chứng đều đạt), `do-pdf-scan`
  **59 ĐẠT · 0 HỎNG**.
- **Phá lệ gộp bốn bàn soi của tôi chung commit.** Xác nhận: bốn tệp
  (`soi-dropdown-xepca` · `soi-hai-man-contro` · `soi-kiem-ke-dang-3` · `soi-khoi-bo-sot`) nằm
  trong `afd4029` cùng mã của nó. **Nội dung nguyên vẹn**: `soi-khoi-bo-sot` chỉ có đúng bản
  sửa URL của **chính tôi** ở vòng 4; ba tệp còn lại là bản tôi viết, còn nguyên cả những câu
  tôi tự nhận lỗi. **Không một dòng nào của nó.** Việc gộp chung làm khó truy "ai viết gì" —
  ba vòng trước tách riêng tốt hơn — nhưng nó **có ghi rõ trong commit**, nên chỉ là THẤP-2.
- **Heredoc nuốt dấu gạch chéo ngược ba lần**: tôi vấp đúng thứ đó **hai lần** vòng này (mục ⑧).
  Xác nhận là lớp lỗi có thật của môi trường, không phải cớ.
- **`origin/main` đi tiếp 6 commit** giữa chừng: đúng, và **nay còn đi thêm 1 lần nữa**
  (`c221fd0`). Nhánh đang sau 1 commit.

---

## ⑧ Về chính tôi — hai lần nữa, tổng **mười** lần

**9.** Bàn soi mới của tôi đọc **sai bảng**: `#lscv-bang` không tồn tại, và tôi để nó rơi sang
`#ls-bang` — mà đó là bảng **Lịch sử hoàn**, không phải Lịch sử làm việc. Bảy dòng ❌ đầu tiên
đều oan. Bắt được vì nội dung in ra là `Shopee | RS-1 | … Đang chờ Kho nhận` — dữ liệu đơn
hoàn nằm trong một phép đo về công việc. Sửa: `#ls-cv-bang` (`app.html:61`), và quét nút "Tải
thêm" **trong đúng tab đang mở** thay vì cả trang.

**10.** Sau khi sửa selector, bảng **rỗng** — vì bộ lọc mặc định là "việc tôi NHẬN" mà máy giả
của tôi để `nhan: []`. Lại ba dòng ❌ oan nữa. Sửa: cho cả hai phía có việc.

Và **quan trọng nhất: lỗi thứ 8 (vòng 4) đã thành một kết luận SAI trong báo cáo** — VỪA-1.
Tôi rút nó ở mục ①. Ba ca `B/C/D2` của bàn soi vòng này tôi **không dựng được điều kiện đo**
(không tạo được nút "Tải thêm"), nên tôi **báo là không đo được**, không báo là lỗi.

Mười lần trong năm vòng. Khuôn chung của cả mười: **phép đo gián tiếp** (đếm lượt gọi, đọc
nhầm phần tử, sai đường API, sai chỉ mục tệp). Khuôn của mọi lần bắt được: **bắt phép đo tự
khai con số nó đang thật sự đo** — in ra chuỗi thô, in ra điều kiện, luôn có một đối chứng
dương.

---

## ⑨ Cổng đo — tôi tự chạy lại HẾT

| Cổng | Khai | Tôi đo |
|---|---|---|
| `cong-khoi` · `cong-khoi-dienthoai` | XANH | ✅ **XANH** cả hai · `hai lượt vai: 7 quyền (6 tab) + đủ 17 quyền (13 tab)` |
| `cong-khoi-tu-kiem` | ĐẠT | ✅ **TỰ KIỂM ĐẠT** |
| `cong-khoi-tu-kiem-tdz` | ĐẠT | ✅ **TỰ KIỂM TDZ ĐẠT**, exit **0** |
| `do-ba-mau` · `do-cat-im-lang` · `do-chu-dai` · `do-moc-noi` · `do-chat-noibo` · `do-hop-sua-muctieu` · `do-cat-khung` | XANH | ✅ **tất cả XANH** (`do-moc-noi` 9/0) |
| `do-kho-tai-lieu` | ĐẠT sau `c221fd0` | ✅ **ĐẠT** |
| `do-pdf-scan` | 59/0 | ✅ **59 ĐẠT · 0 HỎNG** |
| `do-tu-lam-moi` | 50/0 | ✅ **ĐẠT 50 · TRƯỢT 0** |
| `do-kiem-ke-lam-moi` | 46 · 13-28-5 · 136 | ✅ **khớp từng con** |
| `do-kiem-ke-tu-kiem` | 2/2 | ✅ **ĐẠT 2/2** |
| `do-luot-doc-lam-moi` | +1 / −2 / 1·2·3·4 tab đều 5 | ✅ **đúng cả bốn mức** |
| Bảy bàn soi của tôi | sạch | ✅ `soi-tab-nen-bat-kip` **12/0** · `soi-may-boc` **18/0** · `soi-dropdown-xepca` ✔ · `soi-khoi-bo-sot` ✔ · `soi-hai-man-contro` ✔ · `soi-lichsu-bang-chu` ca A ✔ · `soi-tu-lam-moi{,-2,-3}` không đổi |

**`scripts/` so với `merge-base`: đúng 4 dòng xoá**, cả bốn là dòng **bị thay thế** (import ·
`suaTep` một dòng · hai chú thích/danh sách tệp từ vòng 1-2). **Không nới lỏng bàn đo nào.**
`package.json` vòng này **không thêm dòng nào** — **chi phí vẫn 0**.

---

## ⑩ THẤP

1. **Bấm "Tải thêm" rồi thì màn hình im lặng ngừng cập nhật, và không nói cho ai biết.**
   Với Lịch sử hoàn thì **không vẽ lại gì cả**; với Lịch sử làm việc thì phạm vi *Toàn công ty*
   đứng yên. Đánh đổi đúng (không được vứt trang người ta đã tải), nhưng người dùng không có
   dấu hiệu nào. Rẻ: thêm một dòng vào dải cắt — *"Đang giữ N trang đã tải; bấm để làm mới"*.
2. **Bốn bàn soi của Hồ Ly gộp chung commit với mã sản phẩm.** Nội dung nguyên vẹn và có ghi
   rõ trong commit, nhưng ba vòng trước tách riêng dễ truy hơn. Giữ lệ cũ.

---

## Việc nên làm (không việc nào chặn đẩy)

1. **Gộp `c221fd0`** (nhánh đang sau 1 commit) rồi chạy lại cổng — tôi đã soi commit đó, sạch.
2. **VỪA-1** — thêm một ca `do-tu-lam-moi`: đổi tên phòng ban → đọc **chữ** trong `#xcPhongBan`.
   Khoá luôn giả định thứ tự đăng ký.
3. **VỪA-2** — `veGianTiep` tra thêm `biDanhWindow` (bảng đã dựng sẵn) để thấy khuôn
   `goiMocNoi`/`window.LAM_MOI_*`; ghi dạng đó vào chú thích "còn mù".
4. **THẤP-1** — một dòng chữ ở dải cắt cho hai màn có con trỏ.

---

## Nói thẳng

Năm vòng, năm lần nhận sai và vá đúng. Bản vá gốc — **một chỗ phát tín hiệu cho cả lớp** —
đã đứng vững qua mọi cách tôi phá: 14 nhóm dữ liệu, 4 tab, tab nền ngủ dậy, gõ dở không mất
chữ, ghi hỏng không bắn, 9 lỗi gài vào bàn đo, 9 khối giấu vào mã. Lượt đọc D1 **+1 mỗi cú
bấm, −2 lúc mở trang, không đội thêm dù mở 4 tab**. Cổng khói bắt buộc của cả đội từ chỗ mù
8 mô-đun nay bắt được cả ba loại lỗi tôi gài. Và câu Sếp Ngọc kêu ngày 03/09 —
*"đã duyệt hoàn thành mà nó vẫn hiện ở đây"* — tôi bấm lại trên Chrome thật: thẻ **2 → 0**,
không F5.

**Xong. Đẩy được.**
