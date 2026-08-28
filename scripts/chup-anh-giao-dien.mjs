/* ==========================================================================
   CHỤP ẢNH GIAO DIỆN — Chrome headless có sẵn trên máy, chi phí 0
   ---------------------------------------------------------------------------
   Chạy:  node scripts/chup-anh-giao-dien.mjs <thư-mục-ra> [commit-css]
     · không có `commit-css`  → chụp CÂY LÀM VIỆC hiện tại (bản "SAU")
     · có `commit-css`        → thay style.css bằng bản ở commit đó (bản "TRƯỚC")

   VÌ SAO CẦN FILE NÀY: đổi màu mà chỉ đọc số tương phản thì không trả lời được
   câu Sếp hỏi — "nhìn có sang không". Bảng số nói ĐỌC ĐƯỢC; ảnh nói ĐẸP/XẤU.
   Hai thứ khác nhau, phải có cả hai.

   ⚠️ KHÔNG chụp bằng `file://`. `app.js` là ES module; module nạp từ `file://`
   bị chặn CORS (origin `null`) nên `app.js` KHÔNG chạy — trang vẫn ra ảnh,
   chỉ là thanh bên RỖNG, và người xem tưởng mình đã chụp đúng. Đây đúng loại
   bẫy BH-17: phép đo hỏng chứ không phải code hỏng. Nên dựng một máy chủ tĩnh
   nhỏ trong chính file này, phục vụ thư mục tạm qua http://127.0.0.1 và trả
   luôn dữ liệu giả cho mọi `/api/*`.
   ========================================================================== */

import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

const GOC = resolve(decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
const raDir = resolve(process.argv[2] || join(GOC, 'docs/reviews/anh-tam'));
const commitCss = process.argv[3] || null;

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
if (!CHROME) throw new Error('Không tìm thấy chrome.exe');

const tam = join(tmpdir(), 'agc-chup-' + Date.now());
mkdirSync(tam, { recursive: true });
cpSync(join(GOC, 'public'), tam, { recursive: true });

if (commitCss) {
  writeFileSync(join(tam, 'assets/css/style.css'),
    execFileSync('git', ['show', `${commitCss}:public/assets/css/style.css`],
      { cwd: GOC, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }), 'utf8');
}

/* Chuyển tab: bấm đúng cái nút mà `app.js` vừa sinh ra — `moTab` nằm trong
   module, bên ngoài không với tới được. */
const STUB = `<script>
(function () {
  var tab = new URLSearchParams(location.search).get('tab');
  if (!tab) return;
  window.addEventListener('load', function () {
    setTimeout(function () { var b = document.querySelector('[data-tab="' + tab + '"]'); if (b) b.click(); }, 500);
  });
})();
</script>
`;
const dApp = join(tam, 'app.html');
/* Gỡ đăng ký service worker trong BẢN CHỤP: worker giữ trang "sống" nên
   `--virtual-time-budget` không bao giờ đếm hết và Chrome treo, không bao giờ
   trả ảnh. Chỉ gỡ ở bản tạm — mã nguồn thật không đụng tới. */
const boSW = s => s.replace(/'serviceWorker' in navigator/g, 'false');
writeFileSync(dApp, boSW(readFileSync(dApp, 'utf8').replace('<script type="module"', STUB + '<script type="module"')), 'utf8');
for (const f of ['index.html', 'reset.html']) {
  const p = join(tam, f);
  if (existsSync(p)) writeFileSync(p, boSW(readFileSync(p, 'utf8')), 'utf8');
}

/* ---- Máy chủ tĩnh + dữ liệu giả cho /api/* ------------------------------ */
const TOI = {
  ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
  phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
  trang_thai: 'dang_lam', nhan_su_id: 1,
  quyen: ['tongquan', 'lichsuviec', 'danhba', 'gopy', 'kinhdoanh', 'donhoan', 'khovan', 'nhansu', 'ketoan', 'taisan', 'xepca']
};
const API_GIA = { '/api/toi-la-ai': TOI, '/api/danh-ba': { danh_ba: [] }, '/api/nhan-su': { nhan_su: [], xem_luong: 0 } };
const KIEU = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
               '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
               '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
               '.json': 'application/json', '.ico': 'image/x-icon' };

const may = createServer((req, res) => {
  const duong = decodeURIComponent(req.url.split('?')[0]);
  if (duong.startsWith('/api/')) {
    /* Màn ĐĂNG NHẬP phải thấy "chưa có phiên", không thì `index.html` tự đá
       thẳng sang `app.html` và ta chụp nhầm màn — ảnh trông vẫn "đúng". */
    if (/\/index\.html$/.test(req.headers.referer || '')) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"loi":"chưa đăng nhập"}'); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(API_GIA[duong] || { danh_sach: [], danh_ba: [], nhan_su: [], muc_tieu: [], viec: [], ok: true }));
  }
  const f = join(tam, duong === '/' ? 'index.html' : duong);
  if (!f.startsWith(tam) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': KIEU[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(ok => may.listen(0, '127.0.0.1', ok));
const CONG = may.address().port;

/* ---- Danh sách ảnh ------------------------------------------------------ */
const MAN = [['dangnhap', 'index.html'], ['trammuctieu', 'app.html'], ['khovan', 'app.html?tab=khovan']];
const KHUNG = [['1440', 1440, 900], ['375', 375, 812]];

mkdirSync(raDir, { recursive: true });
const hau = commitCss ? 'truoc' : 'sau';
for (const [ten, duong] of MAN) {
  for (const [nhan, w, h] of KHUNG) {
    const ra = join(raDir, `${nhan}-${ten}-${hau}.png`);
    /* ⚠️ PHẢI dùng spawn (bất đồng bộ), KHÔNG dùng execFileSync: máy chủ tĩnh
       ở trên chạy trong CHÍNH tiến trình này, mà execFileSync khoá vòng lặp
       sự kiện — Chrome xin trang, không ai trả lời, treo tới hết giờ. Bẫy này
       tốn 3 lượt chạy mới ra; ghi lại đây để lần sau khỏi mất. */
    await new Promise((ok, hong) => {
      const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--force-device-scale-factor=1', '--virtual-time-budget=8000',
        `--window-size=${w},${h}`, `--screenshot=${ra}`, `http://127.0.0.1:${CONG}/${duong}`],
        { stdio: 'ignore', timeout: 90000 });
      p.on('exit', ok); p.on('error', hong);
    });
    console.log('  ✓ ' + ra);
  }
}
may.close();
rmSync(tam, { recursive: true, force: true });
console.log(`\n${MAN.length * KHUNG.length} ảnh (${hau}) → ${raDir}`);
