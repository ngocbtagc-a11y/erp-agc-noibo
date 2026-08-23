# Third-party thư viện đã vendor

ERP này ưu tiên tự viết, không thêm framework/dependency ngoài nếu không
thật sự cần (Rule 5, `ERP-CONSTITUTION.md`). Khi PHẢI dùng 1 thư viện
ngoài (thuật toán phức tạp, rủi ro tự viết sai cao hơn giá trị mang lại),
vendor thẳng file nguồn vào `public/assets/js/`, không CDN (ERP là PWA
offline-first) — ghi lại ở đây để không ai tưởng nhầm là code tự viết.

| File | Thư viện | Nguồn | License | Lý do dùng |
|---|---|---|---|---|
| `public/assets/js/qrcode-lib.js` | QR Code Generator for JavaScript (Kazuhiko Arase) | https://github.com/kazuhikoarase/qrcode-generator (`js/dist/qrcode.js`, tải 23/08/2026, không sửa nội dung) | MIT | Sinh mã QR cho tem tài sản (module Tài sản, xem `docs/audit/AUDIT-TAISAN-MODULE.md`). Thuật toán QR (Reed-Solomon error correction, BCH format info) rủi ro cao nếu tự viết lại từ đầu mà không có cách kiểm chứng bằng máy quét thật trong môi trường dev — dùng thư viện đã kiểm chứng rộng rãi thay vì tự viết. Global var `qrcode`, API: `qrcode(0,'M').addData(str).make()` rồi `.createSvgTag()`/`.renderTo2dContext()`. |

Không vendor thư viện DECODE (quét) — dùng `BarcodeDetector` (Web API có
sẵn trong trình duyệt hỗ trợ, không cần thư viện ngoài); nơi trình duyệt
chưa hỗ trợ thì cho nhập tay Mã tài sản (không chặn luồng).
