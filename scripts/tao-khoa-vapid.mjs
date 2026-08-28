/* ==========================================================================
   SINH CẶP KHOÁ VAPID — chạy MỘT LẦN, trước khi bật thông báo đẩy.
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tao-khoa-vapid.mjs

   CHI PHÍ 0. Khoá do chính máy này sinh ra bằng WebCrypto chuẩn — không đăng ký
   dịch vụ nào, không Firebase, không trả tiền cho ai. Đây là toàn bộ "giấy tờ"
   mà Google/Apple/Mozilla cần để tin rằng gói tin đẩy đến từ ERP của mình.

   ⚠️ KHOÁ BÍ MẬT KHÔNG ĐƯỢC VIẾT VÀO BẤT KỲ FILE NÀO TRONG KHO MÃ.
   Nó đi thẳng vào "két" của Cloudflare bằng hai lệnh in ra ở cuối.
   Ai có khoá bí mật là gửi được thông báo giả mạo tới điện thoại nhân viên.
   ========================================================================== */

import { taoCapKhoaVAPID } from '../src/webpush.js';

const k = await taoCapKhoaVAPID();

console.log(`
================================================================================
CẶP KHOÁ VAPID ĐÃ SINH XONG
================================================================================

Khoá CÔNG KHAI (không bí mật, trình duyệt nào cũng thấy):

  ${k.congKhai}

Khoá BÍ MẬT — CHỈ dán vào lệnh dưới đây, KHÔNG lưu vào file, KHÔNG gửi qua chat:

  ${k.biMat}

--------------------------------------------------------------------------------
LÀM TIẾP HAI LỆNH NÀY (dán khi nó hỏi, không gõ khoá thẳng vào dòng lệnh —
dòng lệnh bị lưu lại trong lịch sử terminal):

  npx wrangler secret put VAPID_KHOA_CONG_KHAI
  npx wrangler secret put VAPID_KHOA_BI_MAT

Chạy thử ở máy (npm run chay) thì đặt trong file .dev.vars — file này đã nằm
trong .gitignore, KHÔNG bao giờ được commit:

  VAPID_KHOA_CONG_KHAI=${k.congKhai}
  VAPID_KHOA_BI_MAT=${k.biMat}

--------------------------------------------------------------------------------
ĐỔI KHOÁ VỀ SAU: mọi đăng ký cũ trên máy nhân viên sẽ chết im lặng. Giao diện
đã có sẵn phần tự phát hiện lệch khoá và đăng ký lại (xem \`dangKyDay\` trong
public/assets/js/app.js), nhưng chỉ chạy khi người ta MỞ ERP — nên đừng đổi
khoá nếu không có lý do bảo mật thật.
================================================================================
`);
