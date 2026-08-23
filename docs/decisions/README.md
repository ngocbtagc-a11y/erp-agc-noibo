# Architecture Decision Records (ADR)

Chỉ dùng cho quyết định kiến trúc **quan trọng, khó đảo ngược, hoặc hay bị
hỏi lại**. Không dùng cho việc nhỏ (đặt tên biến, chọn màu UI...) — những
cái đó không cần ADR.

Ví dụ đáng ghi ADR: Source of Truth cho Tồn kho, mô hình Employee Core,
chiến lược tích hợp MISA, đổi cấu trúc vai trò hệ thống.

## Format (cực ngắn)

```
# ADR-000N: <tên quyết định>

**Date:** YYYY-MM-DD
**Decision:** (quyết định là gì, 1-2 câu)
**Context:** (bối cảnh, vì sao câu hỏi này phát sinh)
**Alternatives:** (các phương án đã cân nhắc, kể cả phương án không chọn)
**Chosen approach:** (đã chọn gì)
**Reason:** (vì sao chọn cái này, không chọn cái khác)
```

## Danh sách

- [ADR-0001: Source of Truth cho Tồn kho](./ADR-0001-inventory-source-of-truth.md)
- [ADR-0002: Employee Core — 1 nguồn duy nhất, có Business Code](./ADR-0002-employee-core-model.md)
- [ADR-0003: Chiến lược tích hợp MISA](./ADR-0003-misa-integration-strategy.md) — **UNDECIDED**, ghi lại để không hỏi lại từ đầu
