# REV-0051 — Bảng phải vừa màn, đừng bắt kéo ngang

- **Người báo**: ERP Owner — Sếp Bùi Thị Ngọc, 29/08/2026
- **Nguyên văn**: *"ưu tiên hiển thị trên 1 trang, hạn chế kéo trang như này"*
  (kèm ảnh thanh cuộn ngang)
- **Bàn đo**: `npm run do-bang-vua-man` — **42 ĐẠT / 0 TRƯỢT**
- **Ảnh**: `docs/reviews/anh-bang-vua-man/`
- **Nền tảng**: ERP-CONSTITUTION Rule 7 — Information Design

---

## 1. Đo trước: 26 bảng × 5 bề ngang

Chrome thật, app.js thật, mỗi bảng được mở đủ tổ tiên và chèn MỘT dòng mẫu
nội dung ngắn (giống nhau ở lượt trước và lượt sau). Cây `755d556`:

| Bề ngang | Bảng đang hiện | Bảng TRÀN | Tổng px tràn |
|---|---|---|---|
| 1440px | 26 | **7** | 1.156 |
| 1100px | 25 | **12** | 3.548 |
| 900px | 25 | **16** | 5.679 |
| 375px | 24 | **24** | 10.963 |
| 320px | 24 | **24** | 12.283 |

Ví dụ cụ thể ở 900px (khung bảng 594px):
`ls-bang` 1.593px (**rơi**: Số tiền · Người mua · Trạng thái xử lý · Người
thực hiện) · `dh-bang` 1.428px · `db-bang` 1.010px (**rơi**: Điện thoại ·
Email · Quản lý trực tiếp · nút).

**Và không một bảng nào nói cho người dùng biết là còn cột bên phải.**

## 2. Ba nguyên nhân gốc — đều là luật TOÀN CỤC, không phải lỗi từng bảng

1. **`table { min-width: 560px }`** — sàn cứng bắt MỌI bảng rộng ít nhất
   560px. Trên điện thoại 375px khung chỉ còn 341px → kéo ngang là chắc chắn,
   **kể cả bảng 3 cột**: `kvModalLo` tràn +265px chỉ vì cái sàn này, không
   phải vì nội dung.
2. **Đệm ngang 20px × 2 mỗi cột.** Bảng Lịch sử đơn hoàn 12 cột tiêu 480px
   chỉ để làm đệm — nhiều hơn cả một khung nhìn điện thoại.
3. **`thead th { white-space: nowrap }`** — "Trạng thái trên sàn", "Quản lý
   trực tiếp" không được xuống dòng, nên bề ngang tối thiểu của cột bằng cả
   câu tiêu đề.

## 3. Đã sửa — đúng thứ tự ưu tiên Sếp dặn

| # | Cách chữa Sếp nêu | Đã làm |
|---|---|---|
| 1 | Bỏ cột chết | Cột "Rủi ro" của người gửi góp ý (REV-0050) |
| 2 | Đưa cột quan trọng lên trước | Trạng thái + Đang chờ ai lên ngay sau Tiêu đề (REV-0050) |
| 3 | Gộp cột phụ xuống dòng phụ | Bảng hợp đồng: **6 cột → 4** ("Lần", "Số HĐ" xuống dòng phụ dưới "Loại", viết rõ chữ "lần thứ 2 · số HĐ-01") |
| 4 | Hạ mốc chuyển sang thẻ | Góp ý 720px → 1100px (REV-0050) |
| 5 | Bảng nhiều cột giữ cuộn nhưng phải NÓI RÕ | `ganBaoCuonNgang()` — dải "**Còn cột bên phải** — kéo ngang để xem tiếp →" cho **mọi** `.table-wrap` trong ERP |

Cộng ba chốt toàn cục: bỏ sàn 560px dưới 900px · đệm ngang 20→16px (≤1100px:
10px, ≤780px: 8px) · tiêu đề cột được xuống dòng ở màn hẹp và trong mọi cửa sổ
bật lên.

**Dải "còn cột bên phải" là phép đo tại chỗ, không phải nhãn dán sẵn**: chỉ
hiện khi `scrollWidth > clientWidth`, và tự tắt khi đã kéo tới mép phải.

## 4. Đo sau

| Bề ngang | Bảng TRÀN (trước → sau) | Tổng px tràn (trước → sau) | Bảng còn tràn mà KHÔNG báo |
|---|---|---|---|
| 1440px | 7 → **3** (đều là bảng đã đăng ký) | 1.156 → **829** | **0** |
| 1100px | 12 → 8 | 3.548 → **2.896** | **0** |
| 900px | 16 → 12 | 5.679 → **4.827** | **0** |
| 375px | 24 → 22 | 10.963 → **7.307** | **0** |
| 320px | 24 → 22 | 12.283 → **8.517** | **0** |

**Ở 1440px — màn làm việc chính — 0 bảng tràn ngoài danh sách đã đăng ký.**
Đó là ràng buộc CỨNG trong bàn đo (arm A).

### Bảng CỐ Ý giữ cuộn ngang — và vì sao

| Bảng | Cột | Lý do |
|---|---|---|
| `kd-ds-bang` Đối soát sàn | 12 | đọc theo hàng ngang để so tiền với sàn; bỏ cột là mất nghĩa đối chiếu |
| `dh-bang` Đơn hoàn | 11 | kho đối chiếu mã vận đơn · sản phẩm · số tiền · kho nhận trên cùng một hàng |
| `ls-bang` Lịch sử đơn hoàn | 12 | sổ tra cứu, phải giữ đủ vết để đối chiếu với sàn |
| `kt-ts-bang` Kế toán tra soát | 10 | đối chiếu tiền hoàn với đơn gốc trên cùng một hàng |
| `xc-*` Ma trận xếp ca | theo lịch | một cột là một ngày, số cột do lịch quyết |

Cả năm đều đã có dải "còn cột bên phải".

### Còn nợ — nói thẳng

Ở 375/320px vẫn còn **22 bảng** tràn. Bảng 7–12 cột **không thể** vừa 341px
mà không đổi hẳn sang **thẻ** — đúng thứ đã làm cho bảng góp ý. Dựng thẻ cho
từng bảng là hạng mục riêng (mỗi bảng một bộ dữ liệu, một cách xếp), không
gộp vào lần vá này. Trong lúc chờ, **không bảng nào cuộn im lặng nữa**: 22/22
đều báo còn cột bên phải.

## 5. Hai chốt chống sửa quá tay — Sếp dặn thẳng

> *"Đừng ép mọi bảng vừa màn bằng cách bóp chữ nhỏ lại. Đừng làm giảm số dòng
> thấy được."*

| Phép đo | Trước (755d556) | Sau |
|---|---|---|
| Cỡ chữ thân trang | 15px | **15px** |
| Cỡ chữ trong ô bảng | 13.5px | **13.5px** |
| Cỡ chữ tiêu đề cột | 11px | **11px** |
| Chiều cao một dòng @1440 / 1100 / 900 / 375 / 320 | 55 / 55 / 54 / 50 / 50px | **55 / 55 / 54 / 50 / 50px** |

Đệm **DỌC** không bị đụng vào một pixel nào — chỉ đệm NGANG. Tiêu đề cột được
xuống dòng, ô thì KHÔNG (ô xuống dòng là mọi dòng cao lên, là mất số dòng).

## 6. Ca đối chứng (BH-16)

| Lệnh | Kết quả | Bắt được gì |
|---|---|---|
| `npm run do-bang-vua-man` | **42 ĐẠT / 0 TRƯỢT** | — |
| `... -truoc` (cây `755d556`) | **27 / 10 ĐỎ** | arm A đỏ @1440 · arm B đỏ ở CẢ 5 bề ngang (không bảng nào báo còn cột) |
| `... -tu-kiem` (chèn 4 cột thừa vào Danh bạ) | **31 / 6 ĐỎ** | `db-bang 0→333px` @1440 và tệ đi ở cả 5 bề ngang |

Bàn đo còn bị một bẫy trong chính nó và đã sửa: bản đầu ép `display` của thứ
bị CSS ẩn, tức là tự dựng lên một màn hình không ai nhìn thấy rồi báo lỗi trên
đó — nó "thấy" bảng góp ý tràn ở 900px trong khi ở 900px người dùng đang xem
THẺ. Nay chỉ gỡ thuộc tính `hidden`, không đụng CSS.

## 7. Cổng khói + hồi quy

`cong-khoi` @1440 **XANH** · `cong-khoi-dienthoai` @375 **XANH** ·
`do-trangthai-nguoigui` **80/0** · `do-chu-dai` **XANH** ·
`do-gop-viec` **XANH** (0 trượt, 8/8 ca đối chứng) · `do-kho-tai-lieu` **ĐẠT
toàn bộ**. 0 lỗi console, 0 ngoại lệ ở cả 5 bề ngang.
