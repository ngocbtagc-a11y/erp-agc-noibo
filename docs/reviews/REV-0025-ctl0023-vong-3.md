# REV-0025 — Soi CTL-0023 vòng 3 (hẹp: chỉ cái đổi từ `19c9a0b` → `d1673dc`)

**HỒ LY** · 2026-08-28 · nhánh `feature/ctl-0023-nen-sang` · **KẾT LUẬN: PASS — đẩy được hôm nay.**
Một việc bắt buộc sửa kèm, là **văn bản, không phải CSS**: số bài học (mục 6). Không dùng bộ 204
cặp của Khỉ Đột — phép đo mới **dựng cây DOM thật từ `app.html`** (2.231 phần tử), leo tổ tiên tìm
**nền hiệu lực**, rồi so **cùng một phần tử** ở hai bản.

## 1. F1 — Sếp CÓ thấy khác. Cái giá của nó **không** chặn phát hành.

**ΔL\* nền `.main` ↔ thẻ `.panel`: trước CTL-0023 = 4.86 · `19c9a0b` = 2.69 · `d1673dc` = 6.34.**
Khớp lời khai từng chữ số (`--bg` #f3ece1 L\*93.66, thẻ trắng L\*100). Thêm một điểm cộng nó
**không** khai: `.mt-the` (thẻ mục tiêu) nền `--surface`, ở `19c9a0b` nằm trên `.main` cũng
`--surface` → **ΔL\* = 0, thẻ tàng hình hoàn toàn**. Sau F1: 3.65. F1 vá luôn chỗ này.

**Cái giá, bằng số:** `.main` **tối đi 3.65 L\*** (97.31→93.66) nên mọi chữ ngồi thẳng trên nó đều
tụt tương phản. Trên DOM thật: **đúng 11 phần tử**, **không cái nào rớt qua ngưỡng** — `h2#tieuDe`
· `.burger` · `h3` tiêu đề màn 14.88→**13.56**; chuông `.tb-nut` 11.23→**10.23**; `#ngayHomNay` ·
`.view-head p` · `#nsMoTa` · `#qtMoTa` · 3 khối `.empty` Xếp Ca 5.22→**4.75**. Mỏng nhất **4.75 —
vẫn trên 4.5**. Chỗ duy nhất từng dựa vào `--surface` làm nền mà bị lệch là `.topbar` — đã vá (mục 3).

## 2. Nó bác lại tôi hai lần — **ĐÚNG CẢ HAI. Tôi sai, ghi nhận.**

**a) `font-weight` không cứu được xanh logo — ĐÚNG.** Trắng/#6ca839 = **2.878:1**; ngưỡng **dễ nhất**
WCAG cho phép (chữ lớn/đậm, và thành phần đồ hoạ) là **3.00**. 2.878 < 3.00 → đậm tới đâu cũng
trượt; độ dày nét không nằm trong công thức tỉ số tương phản. **Gạo sai.**

**b) Còn 5 chỗ `#9aab86` viết dạng `rgba` — ĐÚNG.** Đếm lại sau khi **gỡ chú thích**, cả hai dạng:

| màu cũ | `main` | `19c9a0b` | `d1673dc` |
|---|---|---|---|
| `#9aab86` | 2 hex + **5 rgb** | 1 hex + **5 rgb** | **0 + 0** |
| `#3f4d33` | 1 hex + 6 rgb | 0 + **3 rgb** | **0 + 0** |
| `#f2f1ee` | 1 hex + 1 rgb | 0 + **1 rgb** | **0 + 0** |

Đúng 5 chỗ `rgba(154,171,134,…)`; vòng 2 tôi grep hex nên **mù hoàn toàn**. `d1673dc` **quét sạch
bảng màu cũ khỏi code**, chỉ còn 1 lần trong chú thích — đó là tài liệu. **Dạng viết nào cả hai đều
chưa quét?** Quét hết: `hsl()/hsla()` **0** · `color-mix()` **0** · hex 4/8 ký tự có alpha **0** ·
`lab()/lch()/oklch()` **0** · **tên màu CSS 0**; hex 3 ký tự 13 lần nhưng chỉ `#fff #000 #333`.
**Không còn dạng nào bị bỏ sót.**

## 3. Phần làm ngoài phạm vi — **cần thiết 4/4. Không chỗ nào lấn sân.**

- **Hạ loé `::after` .22→.10 VÀ `.hero-foot` .82→.90 — BẮT BUỘC CẢ HAI.** Tự thử 4 tổ hợp trên
  gradient mới: `.22/.82` = **3.31** · `.22/.90` = **3.64** · `.10/.82` = **4.25** · `.10/.90` =
  **4.74**. Bỏ **bất kỳ** cái nào là F2 trượt. (Hero cũ `.hero-foot` **1.77:1** — còn tệ hơn con số
  2.15 nó khai; `.hero-word` nay 5.12.) REV-0024 §6 đã yêu cầu đo lại đúng hai chữ này.
- **`.topbar` — hệ quả trực tiếp của F1.** Để nguyên `rgba(242,241,238,.88)` thì trên nền kem mới ra
  L\*94.85, chênh nền **1.19 L\*** và lạnh màu → vệt xám vắt ngang mọi màn. Mới: L\*96.94 ≈
  `--surface` 97.31; `--ink` 14.74, `--text-mute` 5.17. Đạt.
- **`.canh-bao-chu` — không phải "chỗ thứ 4 nó thêm".** REV-0024 §3 tôi liệt kê **4** chỗ và đây
  là chỗ thứ tư. Số đo: #c0392b→#92221a, nền hàng **4.76 → 7.45**, di chuột **4.20 → 6.57**.
- **`--warn-dark` cần, và `--warn` KHÔNG bị đụng.** `--warn` = `#b8863b` ở **cả ba** bản — **giống
  nhau từng byte**. `--warn-dark` #7e5a15 sắc **39.4°** so với **36.0°**, lệch 3.4°: mắt vẫn đọc ra
  vàng hổ phách, **không đổi nghĩa trạng thái**. Dùng **đúng 2 chỗ** (3.02→5.84 · 4.92→6.25);
  `--sage-logo` dùng **đúng 1 chỗ** (`.sb-item.active`, `--ink`/#6ca839 = **5.53** so với 3.40).
  Khớp lời khai. **Chỉ trách: làm chưa hết** (mục 7).

## 4. Hồi quy — **0 cặp chặn phát hành.**

Bộ cặp tự dựng từ DOM thật: **377 cặp chữ–nền**. **Tệ đi: 11** — toàn bộ là hệ quả F1 ở mục 1,
thấp nhất **4.75**. **Tốt lên: 175. Rớt qua ngưỡng: 0.** Loại hai bẫy báo động giả: `.thd-ok/-sage/
-warn/-danger` **không** ở nền sáng mà gắn vào `#thdNut` **trong thanh bên tối**; `.mt-panel
.panel-head` có gradient cam riêng. **Không chữ tàng hình.**

## 5. Tem in + số luật CSS — **hai chốt cuối đều chắc.**

Tự băm khối `.ts-tem*` (24 dòng): `sha256 4648b7497020d1d4…` — **giống hệt ở cả `main`, `19c9a0b`,
`d1673dc`**. Băm cả vùng từ đầu mục TÀI SẢN tới hết file (281 dòng): `bad0099b55a0a51e…` ở **cả hai
bản**. Dòng sửa cuối của diff = **2030**, tem bắt đầu **2245** → **0 byte**. `@media print` vẫn
dùng `visibility` → **ADR-0008 nguyên vẹn**; trong vùng tem không có `var(--…)` màu nào ngoài `--sans`.
**Số luật:** `{` = **605** · `}` = **605** · luật lá = **589** · khối `@` = **16** — **giống hệt ở
cả hai bản**; **0 selector mới, 0 selector mất**. (Nó khai 607 ngoặc — lệch 2 vì đếm cả ngoặc trong
chú thích; bất biến "hai bản bằng nhau" vẫn đúng.)

## 6. ⚠️ BH-43 — trùng số THẬT, nhưng trùng với cái khác Gạo tưởng. **Phải sửa.**

`crm-agc/docs/BAI-HOC.md` (kho nguồn thật theo `CLAUDE.md`) **đã có BH-43 và BH-44**; nhánh
`fix/khoi-dong-vinh-danh-muc-tieu` **cũng** đang giữ BH-43. Bài học Gạo nhắc ("Khỉ Đột bác Hồ Ly
bằng số đo") là **BH-42**, đã trên `main`. → **Đổi BH-43 trong `d1673dc` thành `BH-45`**, và báo
Gạo: nhánh `fix/khoi-dong…` cũng phải đổi số trước khi gộp, không thì sổ có **ba** BH-43.

## 7. Cặp còn trượt — **hai cặp đọc hằng ngày. Nêu tên, không chặn.**

- `.cv-nhom-dau.warn` — dòng "🟡 N việc đến hạn hôm nay" — **3.23:1**, **mọi người đọc mỗi lần mở
  ERP**; vẫn để `var(--warn)` trong khi `--warn-dark` đã có sẵn: đổi **1 dòng** là xong.
- `.form-ok` — chữ "Đã lưu" ở **Kho nhập/Kho xuất** (`#kvOkNhap`, `#kvOkXuat`) — **3.15:1**,
  **kho đọc mỗi lần nhập/xuất**; cần thêm token `--ok-dark`.
- Còn lại: `.mt-chip.warn`·`.tag.warn` 2.82 · `.hd-o .hd-han.sap-het` 3.23 · `.form-loi` 4.33 (×30).
  Tất cả là **màu mang nghĩa**, **trượt từ trước CTL-0023**, **không cái nào tệ đi** vòng này —
  đúng phạm vi "để riêng một phiếu".

## 8. Bảng lỗi
| # | Lỗi | Mức | Chặn phát hành? |
|---|---|---|---|
| G1 | `BH-43` trùng 2 chỗ khác → đổi thành **BH-45** | **CAO** | **Không chặn CSS** — sửa kèm ngay, 1 dòng |
| G2 | `--warn-dark` mới vá 2/6 chỗ (`.cv-nhom-dau.warn` 3.23:1) và chưa có `--ok-dark` (`.form-ok` 3.15:1 ở Kho nhập/xuất) — hai chỗ đọc hằng ngày | TRUNG | Không — phiếu sau |
| G3 | `var(--panel)` (d.2392, d.2438) trỏ token **không tồn tại** — cùng loại `--bg2` (REV-0024 F7), có sẵn từ `main`. Cùng nhóm: `.sb-user .meta b` đặt chữ trắng mà popup trắng `.thd-panel` nằm trong `.meta` → bẫy cho `<b>` thêm sau này | THẤP | Không |

**Chốt: PASS.** CSS thuần, không đụng CSDL, tem in 0 byte, 0 selector đổi, 0 cặp tệ đi qua ngưỡng,
bảng màu cũ sạch hết. Sửa số bài học rồi đẩy. Sếp chê đúng — lần này Sếp sẽ thấy khác.
