#!/usr/bin/env node
/* ==========================================================================
   scripts/lay-khoa-google.mjs — LẤY KHOÁ GOOGLE MỘT LẦN DUY NHẤT
   ---------------------------------------------------------------------------
   Chạy ở MÁY CỦA SẾP, một lần, rồi thôi. Nó mở trình duyệt cho Sếp đăng nhập
   Google, rồi in ra một chuỗi gọi là "refresh token".

   ⚠️ CHUỖI ĐÓ LÀ CHÌA KHOÁ. Không dán vào chat, không gửi Zalo, không lưu vào
   thư mục mã nguồn. Chỉ dán đúng một lần vào lệnh `npx wrangler secret put`
   để cất vào két của Cloudflare. Script này CỐ Ý không tự ghi nó ra file nào.

   CÁCH DÙNG (xem bản hướng dẫn đầy đủ, có ảnh, ở
   docs/huong-dan/CAP-QUYEN-GOOGLE-DRIVE.md):

     set GOOGLE_CLIENT_ID=....apps.googleusercontent.com
     set GOOGLE_CLIENT_SECRET=....
     npm run lay-khoa-google
   ========================================================================== */

import http from 'node:http';
import { spawn } from 'node:child_process';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CONG = Number(process.env.CONG_TAM || 8731);

/* Chỉ xin ĐÚNG MỘT quyền, hẹp nhất có thể: drive.file cho phép ERP đụng vào
   file DO CHÍNH NÓ TẠO RA, và không nhìn thấy bất cứ thứ gì khác trong tài
   khoản Google — không email, không ảnh, không tài liệu riêng. */
const PHAM_VI = 'https://www.googleapis.com/auth/drive.file';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET.\n\n' +
    'Hai chuỗi này lấy ở console.cloud.google.com sau khi tạo "OAuth client ID"\n' +
    'loại "Web application". Đặt vào biến môi trường rồi chạy lại:\n\n' +
    '  Windows:  set GOOGLE_CLIENT_ID=...\n' +
    '            set GOOGLE_CLIENT_SECRET=...\n' +
    '            npm run lay-khoa-google\n\n' +
    'Xem từng bước ở docs/huong-dan/CAP-QUYEN-GOOGLE-DRIVE.md');
  process.exit(2);
}

const CHUYEN_VE = `http://localhost:${CONG}/xong`;
const chongGiaMao = Math.random().toString(36).slice(2) + Date.now().toString(36);

const duongDan = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: CHUYEN_VE,
  response_type: 'code',
  scope: PHAM_VI,
  access_type: 'offline',       // ← không có dòng này thì KHÔNG có refresh token
  prompt: 'consent',            // ← bắt Google cấp lại refresh token dù đã đồng ý trước đó
  state: chongGiaMao
});

const may = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${CONG}`);
  if (u.pathname !== '/xong') { res.writeHead(404).end(); return; }

  const traLoi = (chu) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<meta charset="utf-8"><body style="font:16px system-ui;padding:40px">${chu}</body>`);
  };

  if (u.searchParams.get('state') !== chongGiaMao) {
    traLoi('❌ Sai mã bảo vệ. Đóng cửa sổ này và chạy lại lệnh.');
    console.error('\n❌ state không khớp — có thể có ai đó chen ngang. Dừng lại cho an toàn.');
    may.close(); process.exit(1);
  }

  const loi = u.searchParams.get('error');
  if (loi) {
    traLoi(`❌ Google từ chối: ${loi}. Đóng cửa sổ này.`);
    console.error(`\n❌ Google từ chối: ${loi}`);
    may.close(); process.exit(1);
  }

  const ma = u.searchParams.get('code');
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: ma, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        redirect_uri: CHUYEN_VE, grant_type: 'authorization_code'
      }).toString()
    });
    const j = await r.json();
    if (!r.ok || !j.refresh_token) {
      traLoi('❌ Không lấy được khoá. Xem cửa sổ dòng lệnh.');
      console.error('\n❌ Không có refresh_token trong câu trả lời của Google:');
      console.error(JSON.stringify(j, null, 2));
      console.error('\nHay gặp nhất: thiếu prompt=consent, hoặc tài khoản này đã cấp quyền trước rồi.');
      may.close(); process.exit(1);
    }

    traLoi('✅ Xong. Quay lại cửa sổ dòng lệnh để lấy khoá. Đóng cửa sổ này được rồi.');
    console.log('\n============================================================');
    console.log('  ✅ ĐÃ CÓ KHOÁ. Chép nguyên chuỗi dưới đây (KHÔNG gửi cho ai):');
    console.log('============================================================\n');
    console.log(j.refresh_token);
    console.log('\n============================================================');
    console.log('  Ba lệnh cuối cùng — chạy lần lượt, mỗi lệnh dán một chuỗi:');
    console.log('============================================================');
    console.log('  npx wrangler secret put GOOGLE_CLIENT_ID');
    console.log('  npx wrangler secret put GOOGLE_CLIENT_SECRET');
    console.log('  npx wrangler secret put GOOGLE_REFRESH_TOKEN   ← dán chuỗi ở trên');
    console.log('\n  ⚠️ ĐỪNG QUÊN: vào lại console.cloud.google.com → OAuth consent');
    console.log('     screen → bấm "PUBLISH APP" cho trạng thái thành "In production".');
    console.log('     Để nguyên "Testing" thì khoá này CHẾT SAU ĐÚNG 7 NGÀY, và không');
    console.log('     ai được báo gì cả.\n');
    may.close(); process.exit(0);
  } catch (e) {
    traLoi('❌ Lỗi mạng. Xem cửa sổ dòng lệnh.');
    console.error('\n❌', e.message);
    may.close(); process.exit(1);
  }
});

may.listen(CONG, () => {
  console.log('\nĐang mở trình duyệt để Sếp đăng nhập Google...');
  console.log('Nếu trình duyệt không tự mở, chép đường dẫn này dán vào trình duyệt:\n');
  console.log(duongDan + '\n');
  console.log('⚠️ Nhớ đăng nhập bằng ĐÚNG tài khoản alphagreen.commerce@gmail.com.\n');
  try { spawn('cmd', ['/c', 'start', '', duongDan], { detached: true, stdio: 'ignore' }).unref(); } catch { }
});
