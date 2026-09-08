/* ==========================================================================
   BÀN SOI CẮT KHUNG — REV-0056 · Hồ Ly (Review Gate)
   ---------------------------------------------------------------------------
   KHÔNG phải bàn đo của người xây. Bàn này chỉ đi tìm chỗ mã MỚI làm hỏng
   việc, đúng bốn câu hỏi mà `do-cat-khung` KHÔNG hỏi:

     ① Tứ giác SUY BIẾN (4 góc chụm, 3 góc thẳng hàng, nơ bướm, lát mỏng)
        có ra NaN / ảnh đen / treo trình duyệt không.
     ② Giao diện có CHẶN các ca đó trước khi gọi `duoiPhang` không.
     ③ MẤT ẢNH: cắt xong có quay lại ảnh gốc được không · cắt lại có cắt
        CHỒNG lên bản đã cắt không · "Dùng nguyên ảnh" băm SHA-256 có đổi
        không · đổi cỡ màn lúc đang kéo góc thì bốn chấm còn đúng chỗ không.
     ④ Ca hai tờ giấy: từ khung máy đoán SAI, kéo về đúng có khả thi không.
     ⑤ Bộ nhớ: một lượt cắt cấp phát mấy canvas, canvas to nhất bao nhiêu.

   Chạy tay:  node scripts/soi-cat-khung.mjs        → http://127.0.0.1:8905
   Chạy cổng: node scripts/soi-cat-khung.mjs --tu-dong
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const GOC = path.resolve(THU_MUC, '..');
const CONG = 8905;

const KIEU = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8'
};

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');

  if (u.pathname === '/api/tai-lieu/luu' && req.method === 'POST') {
    let co = 0;
    req.on('data', c => { co += c.length; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, id: 'tl_soi', co_byte_than: co }));
    });
    return;
  }

  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': KIEU['.html'] });
    return res.end(readFileSync(path.join(THU_MUC, 'soi-cat-khung.html'), 'utf8'));
  }

  for (const goc of [path.join(GOC, 'public'), THU_MUC]) {
    const tep = path.join(goc, u.pathname.replace(/^\/+/, ''));
    if (tep.startsWith(goc) && existsSync(tep) && !tep.endsWith('.mjs')) {
      res.writeHead(200, { 'Content-Type': KIEU[path.extname(tep)] || 'application/octet-stream' });
      return res.end(readFileSync(tep));
    }
  }
  res.writeHead(404); res.end('Không có');
}).listen(CONG, '127.0.0.1', async () => {
  console.log(`Bàn soi Cắt khung: http://127.0.0.1:${CONG}`);
  if (!process.argv.includes('--tu-dong')) return;

  const { moChrome } = await import('./lib/ban-do-chrome.mjs');
  const cr = await moChrome({ url: `http://127.0.0.1:${CONG}/index.html`, rong: 375, cao: 812, doiMs: 3000 });
  let chu = '';
  const han = Date.now() + 300000;
  while (Date.now() < han) {
    chu = await cr.chay(`document.querySelector('#kq')?.textContent || ''`);
    if (/KET_LUAN /.test(chu) || /BÀN ĐO HỎNG/.test(chu)) break;
    await cr.doi(700);
  }
  const loiCon = cr.loiConsole.filter(l => !/^\[log\] Failed to load resource.*404/.test(String(l)));
  const ngoaiLe = cr.ngoaiLe.slice();
  cr.dong();
  console.log(chu);

  /* ⚠️ BỊT LỖ "XANH GIẢ" — Khỉ Đột thêm 03/09/2026, NÓI RA chứ không lặng lẽ.
     ------------------------------------------------------------------------
     Bản gốc kết luận chỉ bằng số dòng "✗ HỎNG" đếm trong `#kq`. Nhưng khi
     TRANG CHẾT NGAY LÚC NẠP (tôi vá dở, để lọt một lỗi cú pháp trong
     `quet-tai-lieu.js`), `#kq` đứng nguyên ở "đang soi…": không dòng HỎNG nào,
     không `console.error` nào — và bàn soi in "KHÔNG BẮT ĐƯỢC LỖI" rồi thoát
     0. Sản phẩm chết câm, bàn soi báo sạch. Tôi gặp đúng cảnh đó thật.

     Đúng cái bẫy `cong-khoi.mjs` sinh ra để chặn (im lặng ≠ tốt), nên bịt:
       ① Không thấy `KET_LUAN` = bàn soi CHƯA CHẠY XONG → tính là HỎNG.
       ② Ngoại lệ chưa bắt (`Runtime.exceptionThrown`, gồm cả lỗi nạp module)
          cũng tính là HỎNG — bản gốc chỉ đọc `console.error`, mà lỗi cú pháp
          KHÔNG đi qua đường đó.
       ③ Mã thoát theo kết quả, để cắm được vào cổng.
     Sửa theo hướng NGHIÊM HƠN, không phải dễ hơn. */
  const chayXong = /KET_LUAN /.test(chu);
  const soHong = (chu.match(/✗ HỎNG|BÀN ĐO HỎNG/g) || []).length;
  const sach = chayXong && soHong === 0 && loiCon.length === 0 && ngoaiLe.length === 0;
  if (!chayXong) {
    console.log('\n✗ BÀN SOI CHẠY DỞ — không thấy dòng KET_LUAN. Trang có thể đã chết ' +
      'lúc nạp; "không có dòng HỎNG" ở đây KHÔNG có nghĩa là sạch.');
  }
  console.log('\nBÀN SOI [375px]: ' + (sach ? 'KHÔNG BẮT ĐƯỢC LỖI'
    : `${soHong} dòng HỎNG, ${loiCon.length} console.error, ${ngoaiLe.length} ngoại lệ` +
      (chayXong ? '' : ', CHẠY DỞ')));
  for (const l of loiCon.slice(0, 10)) console.log('  console.error: ' + l);
  for (const l of ngoaiLe.slice(0, 10)) console.log('  ngoại lệ: ' + String(l).slice(0, 300));
  process.exit(sach ? 0 : 1);
});
