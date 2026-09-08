/* ==========================================================================
   SOI XOAY MÁY + THẺ TRANG — REV-0056 vòng 2 · Hồ Ly
   Đổi KHUNG NHÌN THẬT bằng CDP (`Emulation.setDeviceMetricsOverride`), không
   giả lập bằng cách nới hộp trong trang — giả lập kiểu đó ra số vô nghĩa.
   ========================================================================== */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const GOC = path.resolve(THU_MUC, '..');
const CONG = 8908;
const KIEU = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8' };

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/api/tai-lieu/luu' && req.method === 'POST') {
    req.on('data', () => {});
    req.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true,"id":"x"}'); });
    return;
  }
  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': KIEU['.html'] });
    return res.end(readFileSync(path.join(THU_MUC, 'soi-xoaythe.html'), 'utf8'));
  }
  for (const g of [path.join(GOC, 'public'), THU_MUC]) {
    const tep = path.join(g, u.pathname.replace(/^\/+/, ''));
    if (tep.startsWith(g) && existsSync(tep) && !tep.endsWith('.mjs')) {
      res.writeHead(200, { 'Content-Type': KIEU[path.extname(tep)] || 'application/octet-stream' });
      return res.end(readFileSync(tep));
    }
  }
  res.writeHead(404); res.end('Không có');
}).listen(CONG, '127.0.0.1', async () => {
  if (!process.argv.includes('--tu-dong')) { console.log(`http://127.0.0.1:${CONG}`); return; }
  const { moChrome } = await import('./lib/ban-do-chrome.mjs');
  const cr = await moChrome({ url: `http://127.0.0.1:${CONG}/index.html`, rong: 375, cao: 812, doiMs: 2500 });
  let hong = 0;
  const dat = (ok, t, p = '') => { if (!ok) hong++; console.log(`  ${ok ? 'ĐẠT ' : '✗ HỎNG'}  ${t}${p ? '   ' + p : ''}`); };
  /* ⚠️ `mobile: true` KHÔNG kèm `screenWidth/screenHeight` thì Chrome tự co
     giãn khung nhìn: xin 375×812 mà `innerWidth` báo 981. Phép đo im lặng nói
     dối đúng chỗ cần nó thật nhất — đã dính một lần ở bản đầu bàn này.
     `mobile: false` + nêu đủ `screen*` thì khung nhìn ra ĐÚNG số đã xin;
     mỗi lần đổi đều đọc lại `innerWidth/innerHeight` để tự kiểm. */
  const doiKhung = async (w, h) => {
    await cr.goi('Emulation.setDeviceMetricsOverride',
      { width: w, height: h, deviceScaleFactor: 1, mobile: false,
        screenWidth: w, screenHeight: h }, cr.sessionId);
    await cr.doi(800);
  };

  await cr.chay('window.__moCat()');
  console.log('─── ① XOAY MÁY / ĐỔI CỠ KHUNG NHÌN THẬT khi đang ở màn cắt (lỗi #3) ───');
  for (const [w, h, nhan] of [[375, 812, 'dọc 375×812 (gốc)'], [320, 568, 'máy hẹp 320×568'],
    [812, 375, 'XOAY NGANG 812×375'], [375, 480, 'bàn phím ảo 375×480'], [375, 812, 'xoay về dọc']]) {
    await doiKhung(w, h);
    const l = await cr.chay('JSON.stringify(window.__lech())');
    const kn = await cr.chay('JSON.stringify(window.__khungNhin())');
    const anh = await cr.chay('JSON.stringify(window.__anhXemTruoc())');
    const day = await cr.chay('window.__nutDay()');
    const ds = JSON.parse(l || 'null') || [];
    const teNhat = ds.length ? Math.max(...ds) : 999;
    const [kw, kh] = JSON.parse(kn);
    console.log(`  ${nhan.padEnd(24)} khung ${kn} · ảnh ${anh} · lệch ${l} · nút đáy ${day}px`);
    dat(kw === w && kh === h, `${nhan}: KHUNG NHÌN ra đúng số đã xin (tự kiểm phép đo)`,
      `→ xin ${w}×${h}, được ${kw}×${kh}`);
    if (kw !== w || kh !== h) { console.log('     ↑ phép đo không tin được, bỏ qua hai dòng dưới'); continue; }
    dat(teNhat < 2, `${nhan}: 4 chấm bám đúng 4 góc ảnh`, `→ tệ nhất ${teNhat}px`);
    dat(day !== null && day <= h + 1, `${nhan}: hai nút nằm trong khung nhìn`, `→ ${day}px / ${h}px`);
  }

  console.log('\n─── ② THẺ TRANG CỦA MỘT TRANG ĐÃ CẮT (6 nút) — 375px và 320px ───');
  await doiKhung(375, 812);
  const daCat = await cr.chay('window.__catThat()');
  dat(daCat === true, 'Cắt thật được (không rơi vào nhánh "không có gì để cắt")');
  for (const [w, h] of [[375, 812], [320, 568]]) {
    await doiKhung(w, h);
    const t = JSON.parse(await cr.chay('JSON.stringify(window.__doThe())'));
    console.log(`  ${w}px: thẻ cao ${t.cao}px · ${t.soNut} nút [${t.ten.join(' | ')}] · ` +
      `thấp nhất ${t.thapNhat}px · ${t.tran} nút tràn · cuộn ngang ${t.thanhNgang}`);
    dat(t.soNut === 6, `${w}px: thẻ trang đã cắt có đủ 6 nút`, `→ ${t.soNut}`);
    dat(t.cao <= 116, `${w}px: thẻ không quá trần 116px`, `→ ${t.cao}px`);
    dat(t.thapNhat >= 44, `${w}px: mọi nút vẫn ≥44px`, `→ ${t.thapNhat}px`);
    dat(!t.thanhNgang, `${w}px: không đẻ ra thanh cuộn ngang`);
  }
  console.log('\n─── ③ MÀN CẮT Ở CẤU HÌNH CAO NHẤT: có thêm đoạn lời khuyên (375×812) ───');
  await doiKhung(375, 812);
  {
    const r = JSON.parse(await cr.chay(
      '(async () => JSON.stringify(await window.__moCatXa()))()'));
    const kn = JSON.parse(await cr.chay('JSON.stringify(window.__khungNhin())'));
    console.log(`  khung nhìn ${kn} · đoạn lời khuyên cao ${r.caoLoiKhuyen}px · "${r.cauNoi}…"`);
    console.log(`  mép dưới hàng hai nút: ${r.nutDay}px / màn ${r.man}px`);
    dat(kn[0] === 375 && kn[1] === 812, 'Khung nhìn đúng 375×812 (tự kiểm)');
    dat(r.coLoiKhuyen, 'Ca này đúng là ca CÓ đoạn lời khuyên (cấu hình cao nhất)');
    dat(r.nutDay !== null && r.nutDay <= r.man,
      '⭐ CÓ lời khuyên mà hai nút VẪN vừa một màn 375×812',
      `→ ${r.nutDay}px / ${r.man}px`);
  }

  const loi = cr.loiConsole.filter(l => !/^\[log\] Failed to load resource.*404/.test(String(l)));
  const ngoaiLe = cr.ngoaiLe.slice();
  cr.dong();
  console.log(`\nSOI XOAY+THẺ: ${hong} dòng HỎNG, ${loi.length} console.error, ${ngoaiLe.length} ngoại lệ`);
  for (const l of loi.slice(0, 6)) console.log('  console.error: ' + l);
  process.exit(hong === 0 && loi.length === 0 ? 0 : 1);
});
