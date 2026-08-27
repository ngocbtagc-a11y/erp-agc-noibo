# ADR-0012 — Gạo tự đẩy lên hệ thống thật khi đã kiểm kỹ, không chờ Sếp bảo

- **Ngày**: 2026-08-27
- **Người quyết định**: ERP Owner — Sếp Bùi Thị Ngọc
- **Trạng thái**: ĐÃ DUYỆT — **luật thường trực**, thay thế phạm vi hẹp của
  [ADR-0009](ADR-0009-dieu-kien-dua-dot-nay-len-he-thong-that.md)

---

## Quyết định

> Sếp: *"lần sau đã kiểm kỹ lưỡng thì đẩy lên, ko chờ tao bảo nữa"*

ADR-0009 chỉ cho phép đẩy **đúng một đợt** ngày 27/08. Nay thành **luật thường
trực**: Gạo tự đẩy, không hỏi lại từng lần.

## "ĐÃ KIỂM KỸ LƯỠNG" — định nghĩa cứng, đây là phần thay cho cổng đã gỡ

Thiếu **bất kỳ** điều nào thì **KHÔNG** đẩy. Không co giãn, không "gần đủ".

1. **Hồ Ly review trả `PASS`.** Không phải `FIX_REQUIRED`, không phải "PASS
   nhưng còn vài chỗ nhỏ". Khỉ Đột tự khai xong **không tính** — Builder không
   bao giờ được tự nhận `DONE` (BH-06).
2. **Không còn lỗi mức CAO hay TRUNG BÌNH nào chưa sửa.** Lỗi THẤP thì Hồ Ly
   phải nêu rõ là THẤP và khẳng định không chặn phát hành.
3. **Đã kiểm hồi quy** đúng những chỗ bản review chỉ ra là có rủi ro — và phép
   kiểm phải có **ca đối chứng cố ý sai** (BH-16). Phép đo lúc nào cũng "đạt"
   thì không chứng minh được gì.
4. **Không có migration phá dữ liệu**, không sửa/xoá dữ liệu thật.
5. **Không đổi phân quyền, không đổi hợp đồng tích hợp ngoài** (Shopee/TikTok/MISA).
6. **Đẩy xong Gạo phải TỰ KIỂM trên hệ thống thật** — tải file thật từ
   production về đối chiếu, không tin build là xong.
7. **Báo Sếp ngay sau khi lên**: đã lên cái gì, và **câu lệnh lùi lại** viết sẵn.

## Vẫn phải hỏi Sếp — không đổi

- Business policy · nhân sự · lương · pháp lý
- **Mọi khoản chi tiêu** ([ADR-0006](ADR-0006-cong-duyet-va-chi-phi-token.md) A4)
- Migration phá dữ liệu · sửa/xoá dữ liệu production
- Đổi phân quyền · đổi tích hợp ngoài
- Việc Hồ Ly gắn `OWNER_DECISION_REQUIRED`

## Quan hệ với ADR-0010 (một cửa duy nhất)

Hai luật này khớp nhau, không mâu thuẫn:

- **ADR-0010** quy định việc **bắt đầu** từ đâu: một Góp ý ERP. Sếp duyệt
  **ở đầu vào**, trên màn hình Sếp hiểu.
- **ADR-0012** quy định việc **kết thúc** thế nào: đã qua cổng review thì Gạo
  đẩy, không hỏi lại.

Sếp gật **một lần ở đầu**, không phải gật lại ở cuối.

## Nguyên tắc lùi

`git revert <commit>` → đẩy lên `main` → GitHub Actions tự deploy lại. Vài phút.

**Thấy hỏng thì LÙI TRƯỚC, điều tra sau.** Không sửa nóng trên hệ thống đang có
20 người dùng.

## Lần đầu áp dụng — 27/08/2026

Đợt CTL-0008 (`c51a759`). Đã qua đủ 7 điều:
Hồ Ly `PASS` · 0 lỗi CAO/TRUNG BÌNH · in thử tem ra **4 bản PDF thật, có 2 ca
đối chứng, 1 ca cố ý bỏ bản vá ra giấy trắng** · không migration · không đổi
phân quyền · Gạo tải file từ production đối chiếu · báo Sếp kèm lệnh lùi.
