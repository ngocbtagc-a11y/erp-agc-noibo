# ADR-0010 — Một cửa duy nhất: mọi thay đổi ERP đi qua "Góp ý ERP"

- **Ngày**: 2026-08-27
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc
- **Trạng thái**: ĐÃ DUYỆT — **chính sách, áp dụng cho tất cả mọi người**
- **Nguồn**: anh Phạm Khương Duy tự sửa và đẩy thẳng lên hệ thống thật
  (`a4d3272`, 27/08/2026 10:22), không qua cổng duyệt nào

---

## Chuyện gì đã xảy ra

Anh Phạm Khương Duy — **quản lý kho**, không phải lập trình viên — phát hiện lỗi
popover "Trạng thái của tôi" không đóng được, dùng Claude tự sửa, tự đẩy thẳng
lên nhánh `main`.

`main` **nối thẳng vào deploy production** (`.github/workflows/deploy.yml`).
Nghĩa là code đó lên hệ thống 20 người đang dùng **ngay lập tức**, không ai soi.

**Lần này anh Duy làm đúng.** Chẩn đoán trùng khít với Hồ Ly, và anh chọn cách
vá hẹp — **không dính cái bẫy in tem tài sản** mà Khỉ Đột suýt mắc. Đây không
phải lỗi của anh Duy, anh làm việc tốt.

Nhưng đúng ngày công ty dựng xong cổng duyệt thì có người đi cửa sau — và lần
sau chưa chắc may như lần này.

## Quyết định

> Sếp Ngọc: *"đóng lại và sẽ đẩy qua 1 luồng duy nhất là góp ý erp, lần sau anh
> ấy làm thì hãy biến thành 1 góp ý trên đó sau đó tao sẽ duyệt trên đó nhé"*

**Mọi thay đổi ERP — của bất kỳ ai — đều bắt đầu bằng một Góp ý trong ERP.**

```
Bất kỳ ai phát hiện vấn đề  (nhân viên · quản lý · Sếp · AI)
        │
        ▼
   GÓP Ý ERP        ← CỬA DUY NHẤT. Không có cửa nào khác.
        │
   Quản lý duyệt  →  Sếp duyệt (theo mức rủi ro)
        │
   Làm · Soi · Sửa
        │
   Sếp nghiệm thu ngay trên màn Góp ý
        │
        ▼
   Lên hệ thống thật
```

**Cấm** đẩy thẳng vào `main` mà không có Góp ý tương ứng — kể cả khi chắc chắn
đúng, kể cả khi việc rất nhỏ, kể cả người đẩy là quản lý.

**Vì sao Góp ý ERP chứ không phải GitHub:** Sếp duyệt ở nơi Sếp hiểu và dùng
hằng ngày, không phải học một công cụ lập trình. Người báo lỗi cũng vậy — anh
Duy mô tả vấn đề bằng tiếng Việt, không cần biết `main` hay `commit` là gì.

## Áp dụng cho ai

| Ai | Làm gì |
|---|---|
| Nhân viên · quản lý (anh Duy, chị Hằng, Hương, Huyền) | Gửi Góp ý. Không tự sửa, không tự đẩy |
| Hồ Ly · Khỉ Đột | Chỉ làm việc đã có Góp ý và đã được duyệt |
| Gạo | Không dispatch việc chưa có Góp ý |
| Sếp Ngọc · Sếp Phong | Duyệt ngay trên màn Góp ý |

Ngoại lệ duy nhất: **sự cố production đang gây thiệt hại thật** (`P0`) — được
sửa trước, nhưng **phải tạo Góp ý ngay sau đó** ghi lại đã làm gì, vì sao.

## Việc phải làm để luật này có RĂNG

Hiện luật này chỉ là chữ. Ai vẫn đẩy thẳng vào `main` được.

| # | Việc | Ai làm | Trạng thái |
|---|---|---|---|
| 1 | **Khoá nhánh `main`** trên GitHub — bắt buộc qua Pull Request, cấm đẩy thẳng | Sếp (cần quyền admin repo) | **CHƯA LÀM** |
| 2 | Cổng duyệt phân cấp trong Góp ý — SPEC-0002 | Khỉ Đột | Chờ build |
| 3 | Runner tự nhận Góp ý đã duyệt rồi mở Pull Request — SPEC-0003 | Khỉ Đột | Đang dựng |
| 4 | Nói với anh Duy và cả nhóm về luật mới | Sếp | **CHƯA LÀM** |

**Không có mục 1 thì ba mục còn lại vô nghĩa** — cửa sau vẫn mở.

⚠️ Lưu ý: khoá `main` xong thì **Gạo cũng không đẩy thẳng được nữa**, phải đi
qua Pull Request. Đó là ý đồ, không phải tác dụng phụ.

## Cách nói với anh Duy — đề xuất

Anh Duy **làm đúng và làm tốt**. Nói kiểu "cấm anh sửa" là dập một người chủ
động, và anh là quản lý trực tiếp 12 nhân sự fulltime + 17 parttime tại kho.

Đề xuất: **ghi nhận trước, đổi đường sau.**

> *"Anh Duy tìm ra đúng nguyên nhân và sửa gọn, việc đó tốt. Từ giờ anh cứ báo
> vào ô Góp ý ERP — vẫn là anh phát hiện, vẫn ghi tên anh, nhưng có người soi
> lại trước khi lên, để lỡ có sót gì thì bắt được trước khi 20 người dính."*

Ghi nhận công khai còn có tác dụng phụ tốt: **cho cả công ty thấy báo lỗi thì
được ghi nhận**, không phải bị phiền — thứ quyết định hộp Góp ý sống hay chết.

## Ghi chú

Chính sách này khớp với việc đang xây dở (SPEC-0002 cổng duyệt, SPEC-0003
runner). Không phải đổi hướng — là **lý do để làm cho xong**.
