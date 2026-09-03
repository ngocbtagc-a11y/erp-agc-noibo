/* ==========================================================================
   BÀN ĐO CẮT KHUNG VĂN BẢN — CTL-0026 · lượt "chụp rộng, chỉnh khung"
   ---------------------------------------------------------------------------
   Chạy tay:   node scripts/do-cat-khung.mjs        → mở http://127.0.0.1:8904
   Chạy cổng:  npm run do-cat-khung                 → Chrome headless @375px

   VÌ SAO BÀN ĐO RIÊNG, KHÔNG NHÉT VÀO `ban-quet-tai-lieu.mjs`:
     ① Bàn đo đó đang có nhánh khác sửa (đường PDF). Gộp hai lượt sửa vào một
        tệp là tự tạo xung đột không cần thiết.
     ② Sáu phép đo dưới đây cần DỰNG CẢNH (giấy trên bàn gỗ, giấy trắng nền
        trắng, chụp nghiêng, che một góc, hai tờ trong một ảnh) — cả một bộ
        đồ nghề mà bàn đo kia không cần.

   SÁU PHÉP ĐO:
     ① THỜI GIAN từng bước trên ảnh 12MP thật (3024×4032) — nêu mili-giây.
     ② CỠ FILE trước / sau cắt.
     ③ DÒ GÓC ĐÚNG mấy trên 6 ca thật.
     ④ ĐỐI CHỨNG BH-16: bỏ phép duỗi phẳng → thước đo độ nghiêng PHẢI bắt
        được (ảnh nghiêng ra nghiêng).
     ⑤ CHẤM GÓC ≥44px đo thật ở 375px, và kéo được ở CẢ BỐN góc kể cả khi góc
        nằm sát mép ảnh.
     ⑥ CA BỎ QUA: bấm "Dùng nguyên ảnh" → byte của trang KHÔNG đổi một chữ.
        CA KÍN KHUNG: chụp sát giấy → màn cắt KHÔNG tự bày (không bấm thừa).

   Bàn đo còn ghi 3 ảnh vào `.do-tam/` cho `do-boc-chu.mjs` chấm độ chính xác
   bóc chữ TRƯỚC và SAU khi cắt — con số quan trọng nhất của lượt này.
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const GOC = path.resolve(THU_MUC, '..');
const CONG = 8904;

const KIEU = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8'
};

const docTrang = () => readFileSync(path.join(THU_MUC, 'do-cat-khung.html'), 'utf8');

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');

  /* Ghi ảnh thử ra đĩa cho `do-boc-chu.mjs`. Ảnh đi qua ĐÚNG đường nén của
     sản phẩm, không phải ảnh dựng riêng cho phép đo OCR. */
  if (u.pathname === '/luu-anh-thu' && req.method === 'POST') {
    const manh = [];
    req.on('data', c => manh.push(c));
    req.on('end', () => {
      let n = 0;
      try {
        const j = JSON.parse(Buffer.concat(manh).toString('utf8'));
        mkdirSync(path.join(GOC, '.do-tam'), { recursive: true });
        for (const [ten, b64] of Object.entries(j)) {
          writeFileSync(path.join(GOC, '.do-tam', ten + '.jpg'),
            Buffer.from(String(b64).replace(/^data:[^,]*,/, ''), 'base64'));
          n++;
        }
      } catch { /* thân hỏng — báo 0 tệp, đừng làm sập bàn đo */ }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, so_tep: n }));
    });
    return;
  }

  /* API lưu giả — màn quét gọi tới khi bấm Lưu. Bàn đo này không đo đường
     gửi (bàn đo kia đã đo), chỉ cần nó không ném lỗi. */
  if (u.pathname === '/api/tai-lieu/luu' && req.method === 'POST') {
    let co = 0;
    req.on('data', c => { co += c.length; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, id: 'tl_ban_cat', co_byte_than: co }));
    });
    return;
  }

  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': KIEU['.html'] });
    return res.end(docTrang());
  }

  /* Đồ nghề dựng cảnh nằm ở `scripts/lib/`, mã sản phẩm nằm ở `public/`.
     Phục vụ thẳng tệp THẬT của cả hai — bàn đo chạy trên đúng mã phát hành. */
  const thu = [path.join(GOC, 'public'), THU_MUC];
  for (const goc of thu) {
    const tep = path.join(goc, u.pathname.replace(/^\/+/, ''));
    if (tep.startsWith(goc) && existsSync(tep) && !tep.endsWith('.mjs')) {
      res.writeHead(200, { 'Content-Type': KIEU[path.extname(tep)] || 'application/octet-stream' });
      return res.end(readFileSync(tep));
    }
  }

  res.writeHead(404); res.end('Không có');
}).listen(CONG, '127.0.0.1', async () => {
  console.log(`Bàn đo Cắt khung: http://127.0.0.1:${CONG}`);
  if (!process.argv.includes('--tu-dong')) return;

  const { moChrome } = await import('./lib/ban-do-chrome.mjs');
  const cr = await moChrome({ url: `http://127.0.0.1:${CONG}/index.html`, rong: 375, cao: 812, doiMs: 3000 });
  let chu = '';
  let anhCat = null;
  const han = Date.now() + 240000;
  while (Date.now() < han) {
    /* Trang tự giơ tay khi màn cắt đang mở ở đúng 375px — chụp NGAY LÚC ĐÓ,
       không hẹn giờ. Hẹn giờ là phép đo phụ thuộc máy đang bận hay rảnh. */
    if (!anhCat && await cr.chay('window.__moiChup === "man-cat"')) {
      mkdirSync(path.join(GOC, '.do-tam'), { recursive: true });
      anhCat = path.join(GOC, '.do-tam', 'man-cat-375.png');
      await cr.chup(anhCat);
      await cr.chay('window.__daChup = true; 1');
    }
    chu = await cr.chay(`document.querySelector('#kq')?.textContent || ''`);
    if (/KET_LUAN /.test(chu) || /BÀN ĐO HỎNG/.test(chu)) break;
    await cr.doi(700);
  }
  /* Lọc tiếng động của chính bàn đo (404 favicon), không lọc lỗi thật. */
  const loiCon = cr.loiConsole.filter(l => !/^\[log\] Failed to load resource.*404/.test(String(l)));
  cr.dong();
  console.log(chu);
  if (anhCat) console.log(`\nẢnh màn cắt ở 375px: ${anhCat}`);
  const soHong = (chu.match(/✗ HỎNG|BÀN ĐO HỎNG/g) || []).length;
  console.error('\nBÀN CẮT KHUNG [375px]: ' +
    (soHong === 0 && loiCon.length === 0 ? '✅ ĐẠT' : `❌ ${soHong} dòng HỎNG, ${loiCon.length} console.error`));
  for (const l of loiCon.slice(0, 8)) console.error('  console.error: ' + l);
  process.exit(soHong === 0 && loiCon.length === 0 ? 0 : 1);
});
