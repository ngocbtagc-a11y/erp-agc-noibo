# ADR-0003: Chiến lược tích hợp MISA

**Date:** 2026-08-23

**Decision:** **UNDECIDED.** Chưa kết nối MISA eShop/MISA AMIS với ERP,
chưa xác định Source of Truth. Ghi ADR này để không phải hỏi lại từ đầu
mỗi khi chủ đề này xuất hiện — trạng thái "chưa quyết" bản thân nó là
thông tin cần giữ lại.

**Context:** Nhiều doanh nghiệp Việt Nam song song dùng MISA (eShop cho
bán hàng, AMIS cho kế toán) với 1 ERP nội bộ tự xây. Chưa rõ:
1. Công ty có đang dùng MISA eShop/AMIS song song với ERP này không.
2. Nếu có, MISA là Source of Truth cho đơn hàng/sổ sách, hay ERP là
   nguồn thật và xuất báo cáo sang MISA.
3. Có cần đồng bộ tự động hay xuất Excel/CSV tay theo kỳ là đủ.

**Alternatives (chưa chọn cái nào):**
1. ERP là Source of Truth, MISA chỉ dùng cho khai thuế — xuất báo cáo
   định kỳ từ ERP sang.
2. MISA AMIS là Source of Truth cho sổ sách kế toán chính thức, ERP chỉ
   hỗ trợ vận hành nội bộ (Kho, Kế toán tra soát) rồi đối chiếu qua MISA.
3. Đồng bộ 2 chiều tự động qua API MISA.

**Chosen approach:** Chưa chọn. Không code integration MISA cho tới khi
ERP Owner xác nhận công ty có dùng MISA thật hay không, và chọn 1 trong
các phương án trên (hoặc phương án khác).

**Reason:** Đúng Rule 5 (Reuse → Extend → Create) và nguyên tắc "không
xây trước khi có nhu cầu thật" áp dụng xuyên suốt dự án — xây integration
MISA khi chưa xác nhận công ty có dùng không là đoán mò. Khi có câu trả
lời, cập nhật ADR này (không tạo ADR mới) và
[SOURCE-OF-TRUTH.md](../SOURCE-OF-TRUTH.md).
