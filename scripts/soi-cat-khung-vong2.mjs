/* ==========================================================================
   BÀN SOI CẮT KHUNG — VÒNG 2 · Hồ Ly (Review Gate)
   ---------------------------------------------------------------------------
   Vòng 1 đã soi phần toán. Vòng này chỉ soi ĐÚNG BA THỨ MỚI:

     ① Phép thử của chính tôi ở vòng 1 có ĐẢO CHIỀU không (Khỉ Đột tố).
     ② RỦI RO MỚI do bản vá đẻ ra: giữ `anh_goc` trong `localStorage` làm bản
        nháp phình lên, `ghiNhap()` phải nhường. Ép quota ở CẢ HAI lượt thử:
        thứ tự nhường có đúng không · lượt hai hỏng thì mất gì · trần bằng 0 ·
        đang cắt trang thứ 12 thì hết chỗ.
     ③ Máy dò "nhiều hơn một tờ" — tấn công CẢ HAI CHIỀU trên 10 cảnh, gồm 5
        cảnh tờ ĐƠN mà bàn đo của Khỉ Đột KHÔNG có (lệch trái · nhỏ giữa khung
        · gấp đôi có nếp · khung viền dọc · chụp xa).
     ④ Đường lùi ở những ca Khỉ Đột chưa nêu: lùi hai vòng · trang KIỂU CŨ.

   Chạy:  node scripts/soi-cat-khung-vong2.mjs --tu-dong
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const GOC = path.resolve(THU_MUC, '..');
const CONG = 8906;
const KIEU = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8'
};

/* Trang CỐ Ý CHẾT LÚC NẠP — dùng cho phép tự kiểm "bàn đo có mù không". */
const TRANG_CHET = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Trang chết</title></head><body><pre id="kq">đang soi…</pre>
<script type="module">
import { khongCoThat } from '/assets/js/khong-co-tep-nay.js';
document.getElementById('kq').textContent = 'không bao giờ tới đây';
</script></body></html>`;

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/api/tai-lieu/luu' && req.method === 'POST') {
    let co = 0;
    req.on('data', c => { co += c.length; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, id: 'tl_soi2', co_byte_than: co }));
    });
    return;
  }
  if (u.pathname === '/trang-chet.html') {
    res.writeHead(200, { 'Content-Type': KIEU['.html'] });
    return res.end(TRANG_CHET);
  }
  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': KIEU['.html'] });
    return res.end(readFileSync(path.join(THU_MUC, 'soi-cat-khung-vong2.html'), 'utf8'));
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
  console.log(`Bàn soi vòng 2: http://127.0.0.1:${CONG}`);
  if (!process.argv.includes('--tu-dong')) return;
  const { moChrome } = await import('./lib/ban-do-chrome.mjs');

  /* ---- PHÉP TỰ KIỂM: bàn soi vòng 1 của tôi có MÙ thật không -------------
     Nạp một trang CHẾT NGAY LÚC NẠP, rồi chấm bằng ĐÚNG hai bộ luật:
       · luật CŨ (của tôi): chỉ đếm "✗ HỎNG" trong #kq + console.error
       · luật MỚI (Khỉ Đột thêm): cộng thêm "phải thấy KET_LUAN" + ngoại lệ
     Nếu luật cũ báo sạch còn luật mới bắt được thì Khỉ Đột nói đúng. */
  {
    const cr = await moChrome({ url: `http://127.0.0.1:${CONG}/trang-chet.html`, rong: 375, cao: 812, doiMs: 2500 });
    await cr.doi(2500);
    const chu = await cr.chay(`document.querySelector('#kq')?.textContent || ''`);
    const loiCon = cr.loiConsole.filter(l => !/^\[log\] Failed to load resource.*404/.test(String(l)));
    const ngoaiLe = cr.ngoaiLe.slice();
    cr.dong();
    const soHong = (chu.match(/✗ HỎNG|BÀN ĐO HỎNG/g) || []).length;
    const chayXong = /KET_LUAN /.test(chu);
    const luatCu = soHong === 0 && loiCon.length === 0;
    const luatMoi = chayXong && soHong === 0 && loiCon.length === 0 && ngoaiLe.length === 0;
    console.log('─── ⓪ TỰ KIỂM: bàn soi vòng 1 có MÙ không (trang chết lúc nạp) ───');
    console.log(`  #kq đứng ở: "${chu.trim()}"`);
    console.log(`  dòng HỎNG=${soHong} · console.error=${loiCon.length} · ngoại lệ=${ngoaiLe.length} · thấy KET_LUAN=${chayXong}`);
    console.log(`  LUẬT CŨ  (của tôi, vòng 1) → ${luatCu ? '"KHÔNG BẮT ĐƯỢC LỖI", thoát 0  ← MÙ' : 'bắt được'}`);
    console.log(`  LUẬT MỚI (Khỉ Đột thêm)   → ${luatMoi ? 'báo sạch' : 'BẮT ĐƯỢC, thoát 1'}`);
    console.log(`  → Khỉ Đột nói ${luatCu && !luatMoi ? 'ĐÚNG' : 'SAI'}: bản cũ chứng nhận một trang đã chết là sạch.\n`);
  }

  const cr = await moChrome({ url: `http://127.0.0.1:${CONG}/index.html`, rong: 375, cao: 812, doiMs: 3000 });
  let chu = '';
  const han = Date.now() + 420000;
  while (Date.now() < han) {
    chu = await cr.chay(`document.querySelector('#kq')?.textContent || ''`);
    if (/KET_LUAN /.test(chu) || /BÀN ĐO HỎNG/.test(chu)) break;
    await cr.doi(800);
  }
  const loiCon = cr.loiConsole.filter(l => !/^\[log\] Failed to load resource.*404/.test(String(l)));
  const ngoaiLe = cr.ngoaiLe.slice();
  cr.dong();
  console.log(chu);
  const chayXong = /KET_LUAN /.test(chu);
  const soHong = (chu.match(/✗ HỎNG|BÀN ĐO HỎNG/g) || []).length;
  const sach = chayXong && soHong === 0 && loiCon.length === 0 && ngoaiLe.length === 0;
  if (!chayXong) console.log('\n✗ BÀN SOI CHẠY DỞ — không thấy KET_LUAN.');
  console.log('\nBÀN SOI VÒNG 2 [375px]: ' + (sach ? 'KHÔNG BẮT ĐƯỢC LỖI'
    : `${soHong} dòng HỎNG, ${loiCon.length} console.error, ${ngoaiLe.length} ngoại lệ`));
  for (const l of loiCon.slice(0, 10)) console.log('  console.error: ' + l);
  for (const l of ngoaiLe.slice(0, 6)) console.log('  ngoại lệ: ' + String(l).slice(0, 300));
  process.exit(sach ? 0 : 1);
});
