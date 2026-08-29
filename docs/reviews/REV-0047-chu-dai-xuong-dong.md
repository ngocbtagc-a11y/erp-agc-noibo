# REV-0047 — Chữ dài tự xuống dòng, không bắt kéo ngang

**Soi:** Hồ Ly · 29/08/2026 · worktree `agc-bongbong`, nhánh `fix/chu-dai-xuong-dong`, commit `a5ce73a` (nền `cbea4d9`).
**Cách soi:** không dùng lại kết luận của Khỉ Đột. Chạy lại bàn đo của nó (3 chế độ), rồi dựng **3 bàn đo riêng**: ① A/B chụp mọi phần tử ở 375 + 320px trước/sau, ② bơm 7 loại **mã nguyên khối** của ERP rồi dùng `Range.getClientRects()` bắt chỗ ngắt GIỮA mã, ③ bơm 200 ký tự vào **mọi** `<input>` một dòng. Bấm phím bằng `Input.dispatchKeyEvent` thật, dán bằng `Input.insertText` thật.

## KẾT LUẬN: **FIX_REQUIRED** — 1 việc chặn, ~10 phút, rồi phát hành

Bản vá **không làm hỏng gì** — tôi đo và không tìm ra một hồi quy nào. `anywhere` toàn cục **không đáng sợ như tên nó**. Việc chặn nằm ở chỗ khác: **con số 13 sai**, và bàn đo mới **mù cấu trúc** với 99 ô còn bệnh, nên nó sẽ báo XANH mãi mãi. Sai số đó đang được ghi vào `BAI-HOC.md` như một bài học về *đếm cho đủ*.

| # | Lỗi | Mức | Chặn phát hành |
|---|---|---|---|
| **L1** | Arm C lọc `i.maxLength >= 100`. Input **không có** `maxlength` thì `maxLength === -1` → bị loại sạch. Đo thật: **99/99** ô một dòng còn lại đều kéo ngang với 200 ký tự, **99/99 không có `maxlength`**. Bàn đo mù hết. Kéo theo: BH-57 + chú thích trong 3 tệp đều khai "cả ERP có 12 ô", thực tế 12 **trong khoảng 28** ô chữ dài thật. | **Cao** | **CÓ** |
| L2 | `cv-sua-tieu-de` (sửa việc) đã vá, `cv-tieu-de` (**tạo** việc) thì không — cùng một trường "Tên việc". Tương tự `cv-sua-ly-do` vá rồi mà `nsHd-lydo` chưa. Người dùng gặp hai hành vi khác nhau cho cùng một ô. | Vừa | Không — vé riêng |
| L3 | Chú thích arm E trong `do-chu-dai-xuong-dong.mjs` vẫn viết *"chốt chặn cố ý KHÔNG dùng `anywhere`"* — trái ngược CSS thật đang dùng `anywhere`. Người sau đọc sẽ hiểu ngược. | Thấp | Không |
| L4 | `scripts/do-chat-noibo.mjs` **không có `process.exit`** — luôn thoát 0. Chạy nó như cổng hồi quy là tự lừa. Có từ trước, không phải lỗi bản vá. | Thấp | Không — vé riêng |

---

## Câu 1 — `anywhere` toàn cục: tôi đi tìm chỗ nó làm hỏng, và **tìm được 27 chỗ, tất cả cùng một loại chuỗi**

**A/B không bơm gì** — chụp mọi phần tử app dựng ra, 6 tab, hai bề ngang:

| Bề ngang | Phần tử so được | Đổi bề rộng/cao | Nút đổi | Trang tràn |
|---|---|---|---|---|
| 375px | 765 | **0** | **0/22** | 375→375 |
| 320px | 765 | **0** | **0/22** | 320→320 |

**Bơm 7 loại mã nguyên khối** (51 khung × 6 tab × 7 mã = 2.142 phép đo mỗi bề ngang), bắt ngắt-giữa-mã bằng `Range`:

| Mã | 375px trước→sau | 320px trước→sau |
|---|---|---|
| **mã vận đơn** `SPXVN04123456789` | 0 → **0** | 0 → **0** |
| **tiền** `1.250.000₫` · **ngày** `29/08/2026` · **mã NV** `01-0002` · **SĐT** · **mã SP** | 0 → **0** | 0 → **0** |
| mã đơn hàng `2408290001122334455667788` (27 số) | 0 → **2** | 0 → **25** |

**27 chỗ ngắt xấu, cả 27 đều là chuỗi 27 chữ số.** Không một chỗ nào rơi vào mã vận đơn, tiền, ngày, mã nhân sự, nút, hay tiêu đề cột. Và chuỗi 27 số đó **trước bản vá không ngắt nhưng làm cả trang mọc thanh cuộn ngang** (đo được 991px trên khung 375px) — ngắt 2 dòng đổi lấy hết kéo ngang là lời, không phải lỗ.

**Ca Sếp lo nhất — kho vận đọc mã vận đơn trên điện thoại — tôi dựng bảng thật** (mã vận đơn · mã đơn · tiền · ngày · mã NV · trạng thái) ở 375px với CSS trước và sau:

```
TRƯỚC → ô vỡ: 0 · khung 777px/375px còn cuộn ngang · trang không tràn
SAU   → ô vỡ: 0 · khung 777px/375px còn cuộn ngang · trang không tràn   ← GIỐNG HỆT
```
Dòng `table, table * { overflow-wrap: break-word }` làm đúng việc của nó: `break-word` **không hạ min-content**, nên cột bảng tính bề rộng y như cũ và mã vận đơn không bao giờ bị cắt. **Không có rủi ro đọc nhầm số.**

**Có cách hẹp hơn không?** Có — bó `anywhere` vào `#v-*, .modal` thay vì `body`. Nhưng tôi không đòi: (a) tác động đo được của bản rộng là **0 phần tử đổi**, (b) `overflow-wrap: anywhere` **đã có sẵn trong repo từ trước bản vá** — `cbea4d9` dòng 1488, 1494, 3203. Đây là mở rộng một tiền lệ đã được nhận, không phải nước đi liều. Bản hẹp lại bỏ sót mọi khung viết sau này, đúng thứ chốt chặn sinh ra để tránh.

## Câu 2 — 12 ô đổi sang `textarea`: không mất gì

Bấm thật, không đọc code.

- **Enter vẫn gửi/lưu: 11/12** gọi `requestSubmit`, cả 11 đều `preventDefault`. Ô thứ 12 `gyCtGhiChuDuyet` nằm **ngoài** `<form>` (nút của nó là `type="button"`) — bản cũ là `<input>` ngoài form nên Enter cũng **chưa từng** làm gì. **Không hồi quy.**
- **Shift+Enter: 0/12 gửi.** **Bộ gõ tiếng Việt** (`isComposing`): **0/12 gửi** — không nuốt chữ đang dựng dấu.
- **Bàn phím THẬT ở thanh chat** (CDP): Enter → gửi 1 lần, ô xoá sạch. Shift+Enter → thêm `\n`, **không** gửi.
- **`maxlength` còn nguyên** ở cả 12. Dán 5000 ký tự bằng `Input.insertText` vào ô 2000 → cắt còn **đúng 2000**, không kéo ngang.
- **Ô cao kịch trần 132px (6 dòng):** nút Gửi 51×45px, nút 📎 44px — **còn trong màn** ở 375×812. **Bàn phím bật lên** (giả lập màn còn 420px): Gửi vẫn trong màn ở y=365. Vùng đọc co còn **121px** — chật, nhưng chỉ trong lúc đang gõ 6 dòng, và nhả chữ là bung lại.
- **Ô dưới 44px: 1 ô** — `thdGhiChu` cao 34px. Nhưng bản cũ là `<input>` cao **32px**: có sẵn từ trước, bản vá làm **tốt hơn 2px**. Không phải lỗi mới, không chặn.

## Câu 3 — con số 13: **đúng 13 chỗ đã sửa, sai về cả lớp**

Tôi quét lại độc lập. `app.html` có **99** `<input>` một dòng nhận chữ ngoài 13 chỗ đã vá. Bơm 200 ký tự tiếng Việt vào từng ô, đo trong Chrome:

```
input một dòng nhận chữ: 99 · CÒN PHẢI KÉO NGANG: 99 (vd cv-tieu-de rộng 307px → chữ 1507px)
trong đó KHÔNG giới hạn ký tự: 99   ← đây là chỗ arm C mù
```
Lọc bỏ ô tìm kiếm và ô số, nhóm **chữ dài thật sự** còn khoảng 15: `cv-tieu-de`, `mt-tieu-de`, `cv-mtm-tieude`, `nsHd-lydo`, `dln-ncc-diachi`, `dln-kho-diachi`, `dmQueQuan`, `dmThuongTru`, `kdsp-ten`, `kvTenSP`, `kvSua-ten`, `tsThemTen`, `tsSuaTen`, `dln-ncc-ten`, `tsCapPhatViTri`. **Ô không có `maxlength` nhận chữ VÔ HẠN — nặng hơn ô 120 ký tự đã vá, mà bị đếm bằng 0.**

**Ghi nhận sự thành thật:** nó tự khai bước sai `break-word` → `anywhere`, đúng cả cơ chế (min-content) lẫn số (1071px, 971px) — khai ra chỗ mình đi sai là thứ làm lời khai còn lại đáng tin. Nhưng chính bài học nó rút ra — *"đo cả lớp trước khi vá"* — lại hụt ở đúng bước đếm.

## Câu 4 — hồi quy: sạch

| Cổng | Kết quả |
|---|---|
| `cong-khoi` @1440 · `cong-khoi-dienthoai` @375 | ✅ XANH · XANH — 0 `console.error`, 0 ngoại lệ |
| `cong-khoi-tu-kiem` | ✅ ĐẠT — mẫu hỏng giả làm nó đỏ đúng như phải thế |
| `do-danhsach-hoithoai` | ✅ 7/7 ĐẠT |
| `do-chat-noibo` | thoát 0 — nhưng xem **L4**, script không có `process.exit`, nó không thể đỏ |
| **Bảng nhiều cột vẫn cuộn ngang** | ✅ arm E: 560px trong khung 341px · bảng dựng riêng: 777px trong 375px |
| Vùng đọc chat 592px · 4 tin · số dòng @375px | ✅ không đổi (lưu ý: "4 tin" là **tổng số tin máy giả trả về**, không phải sức chứa màn hình) |

**Bàn đo mới `do-chu-dai` có thật, không phải đồ trang trí:** `--tu-kiem` ĐỎ và bắt **đúng cả hai** vết thương giả; `--commit cbea4d9` ĐỎ với 8 lý do, đọc ra đúng 12 ô cũ và 991px tràn. Cách gỡ tạm `hidden` rồi trả lại **là thật** — F2 đếm đủ 12/12 ô, và đòi `< 12` là đỏ. Điểm yếu còn lại: máy giả trả mảng rỗng nên arm D chỉ bơm được **3–17 khung/tab** và arm E chỉ thấy **1 khung bảng**. Độ phủ mỏng, nhưng ba bàn đo riêng của tôi đã lấp phần đó.

## Việc phải làm trước khi gộp

1. **L1** — sửa arm C thành `i.maxLength >= 100 || i.maxLength === -1`, chạy lại, rồi sửa con số trong BH-57 + chú thích `style.css`/`app.js`/`app.html` từ *"cả ERP có 12 ô"* thành *"12 trong khoảng 28 ô chữ dài; 99 ô một dòng không giới hạn ký tự còn chờ vé riêng"*. Nhân tiện sửa luôn **L3**.
2. Mở vé cho **L2** (15 ô chữ dài còn sót, ưu tiên `cv-tieu-de` vì lệch với `cv-sua-tieu-de`) và **L4**.

**Triển khai khi PASS:** chỉ HTML/CSS/JS tĩnh — **không migration**, không đổi schema, không đổi API. Đẩy là xong; người dùng cần `Ctrl+F5` một lần nếu service worker giữ bản cũ.
