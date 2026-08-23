# Source of Truth — ERP Alpha Green Commerce

Không tự suy luận Source of Truth cho hệ thống chưa kết nối — ghi
`UNDECIDED` thay vì đoán. ERP Owner là người duy nhất chốt cột "System
Owner" khi cần quyết định.

| Nhóm dữ liệu | System Owner (nguồn thật) | System Consumers | Sync direction | Conflict rule |
|---|---|---|---|---|
| Nhân sự (hồ sơ, lương, tài khoản) | **ERP** | Toàn công ty | Không đồng bộ ngoài — ERP là nguồn duy nhất | Không áp dụng |
| Đơn hàng Shopee | **Shopee** | ERP (Kinh doanh, Kho vận, Kế toán) | Shopee → ERP, một chiều, cron 5 phút | ERP không sửa ngược lại đơn hàng trên Shopee; sai lệch thì đối chiếu lại từ Shopee |
| Đơn hàng TikTok | **TikTok Shop** | ERP (Kinh doanh, Kho vận, Kế toán) | TikTok → ERP, một chiều, cron 5 phút | Tương tự Shopee |
| Đơn hoàn (dữ liệu gốc) | **Sàn (Shopee/TikTok)** | ERP | Sàn → ERP | ERP không sửa dữ liệu gốc, chỉ ghi thêm trạng thái xử lý nội bộ |
| Trạng thái xử lý đơn hoàn (đã nhận hàng / đã đối soát...) | **ERP** | Kho vận, Vận hành sàn, Kế toán | Nội bộ ERP, không đồng bộ ra sàn | Mỗi chặng chỉ 1 vai trò ghi — xem FIELD_OWNERSHIP_MATRIX.md |
| Tồn kho | **ERP** (`giao_dich_kho` — ledger) | Kho vận, Kế toán (giá vốn) | Không đồng bộ ngoài | Sổ cái bất biến, không sửa trực tiếp dòng cũ |
| Sản phẩm/SKU (tên, danh mục, đơn vị) | **ERP** | Kho vận, Kinh doanh, Marketplace (qua `sku_map`) | Không đồng bộ ngoài — ERP tự quản | Kinh doanh khoá, Kho vận sửa ngày thường |
| Kế toán tổng hợp (doanh thu, chi phí, thuế) | **UNDECIDED** | — | UNDECIDED | UNDECIDED — chưa xác nhận MISA AMIS hay ERP là nguồn thật cho báo cáo tài chính chính thức |
| Đơn hàng trên MISA eShop (nếu có dùng song song) | **UNDECIDED** | — | UNDECIDED | UNDECIDED — cần xác nhận công ty có đang dùng MISA eShop song song với ERP không, và nếu có thì ai là nguồn thật cho đơn hàng |
| Sổ sách kế toán chính thức | **UNDECIDED** | — | UNDECIDED | UNDECIDED — cần xác nhận MISA AMIS có phải sổ sách kế toán chính thức nộp thuế/kiểm toán không, ERP chỉ hỗ trợ vận hành nội bộ hay cũng phải khớp 100% |
| Chấm công / lương thực trả | **ERP** cho vận hành ca (Xếp ca); **UNDECIDED** cho bảng lương chính thức | Kho vận (ca), HCNS/Admin (lương) | Không đồng bộ ngoài hiện tại | UNDECIDED nếu công ty dùng phần mềm chấm công/lương riêng — cần xác nhận |

---

## Cách xử lý khi gặp UNDECIDED

1. Không code logic đồng bộ 2 chiều "phòng khi cần" — chỉ code khi
   Source of Truth đã chốt (Rule 5, tránh xây trước nhu cầu thật).
2. Nếu 1 feature cần biết Source of Truth mà dòng tương ứng ở đây còn
   UNDECIDED → đây là tín hiệu STOP, đưa vào Feature Spec mục "Open
   Question", hỏi ERP Owner trước khi code phần phụ thuộc vào đó.
3. Khi ERP Owner chốt xong, cập nhật dòng UNDECIDED thành quyết định thật
   + ghi 1 ADR ngắn vào [decisions/](./decisions/) nếu là quyết định lớn
   (VD "MISA AMIS là Source of Truth cho sổ sách kế toán").

## Nguyên tắc chung

- Chỉ 1 System Owner cho mỗi nhóm dữ liệu — nếu thấy 2 hệ thống cùng là
  "nguồn thật" cho cùng 1 dữ liệu, đó là silo cần dọn (xem
  `docs/audit/AUDIT-KIEN-TRUC.md` mục E), không phải trạng thái bình thường.
- ERP là System Owner cho MỌI dữ liệu vận hành nội bộ không đến từ hệ
  thống ngoài (nhân sự, tồn kho, tài sản, công việc, mục tiêu).
- Hệ thống ngoài (Shopee/TikTok/MISA...) luôn là System Owner cho đúng dữ
  liệu gốc của nó — ERP không bao giờ tự nhận là nguồn thật cho đơn hàng
  hay sổ sách mà mình chỉ đồng bộ về.
