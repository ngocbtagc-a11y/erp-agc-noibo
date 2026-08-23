# ADR-0001: Source of Truth cho Tồn kho

**Date:** 2026-08-23 (ghi nhận lại quyết định đã áp dụng từ khi xây `kho.js`)

**Decision:** ERP là Source of Truth cho tồn kho (`giao_dich_kho`, sổ cái
dạng ledger bất biến). Không có hệ thống ngoài nào ghi đè tồn kho ERP.

**Context:** Công ty cần biết chính xác tồn kho để vận hành Kho vận và
tính giá vốn. Chưa rõ có phần mềm kho/kế toán ngoài (MISA...) cũng theo
dõi tồn kho song song hay không.

**Alternatives:**
1. MISA AMIS là Source of Truth, ERP chỉ hiển thị lại (đồng bộ 1 chiều
   MISA → ERP).
2. ERP là Source of Truth, xuất báo cáo sang MISA khi cần (đã chọn).
3. Đồng bộ 2 chiều — bị loại ngay vì phức tạp, dễ xung đột, không có nhu
   cầu thật.

**Chosen approach:** Phương án 2 — ERP tự quản tồn kho bằng ledger
(`giao_dich_kho`, FEFO theo lô), không phụ thuộc hệ thống ngoài.

**Reason:** ERP đang là nơi Kho vận thao tác nhập/xuất hằng ngày thật —
đặt Source of Truth ở đúng nơi phát sinh giao dịch, tránh double-entry.
Nếu sau này xác nhận công ty cần MISA AMIS làm sổ sách kế toán chính thức,
đó là quyết định RIÊNG cho phạm vi kế toán/thuế (xem
[ADR chưa tạo — chờ xác nhận MISA AMIS]), không ảnh hưởng quyết định tồn
kho vận hành ở đây. Xem thêm
[SOURCE-OF-TRUTH.md](../SOURCE-OF-TRUTH.md).
