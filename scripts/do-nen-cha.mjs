/* ==========================================================================
   ĐO NỀN CHA THẬT — leo cây tổ tiên trong DOM đã dựng, không đoán bằng regex
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-nen-cha.mjs
   Ra:    scripts/nen-cha.json   (bảng: selector → những nền HIỆU LỰC của cha)

   VÌ SAO CÓ FILE NÀY — REV-0026/H3 bắt đúng chỗ dối của bàn đo cũ:
   `do-tuong-phan-mau.mjs` đoán nền cha bằng một bảng regex dán cứng
   (`/^\.sb-|^\.thd-(nut|cham|ok|sage|warn|danger|mute)/ → nền thanh bên`).
   Nhưng `.thd-danger` KHÔNG ngồi thẳng trên thanh bên: nó nằm trong
   `.thd-nut{background:var(--surface-2)}`. Đoán sai nền thì mọi con số nó
   nói đều vô giá trị — và nó đã khai "0 cặp rớt ngưỡng" trong khi
   `.thd-danger` thật ra 4.67 → 4.23.
   Không có cách nào đọc CSS mà biết ai là cha của ai: quan hệ cha–con nằm
   trong HTML và trong DOM do `app.js` sinh ra lúc chạy. Nên phải DỰNG TRANG
   THẬT rồi hỏi trình duyệt.

   CÁCH LÀM (chi phí 0, không thêm gói nào): máy chủ tĩnh trong tiến trình
   này + Chrome headless có sẵn. Trang tự chạy phép đo rồi nhét kết quả vào
   một thẻ <pre>; `--dump-dom` trả DOM về, ta đọc thẻ đó ra. Không cần CDP,
   không cần puppeteer.

   ⚠️ Đây là dữ liệu SINH RA, có commit kèm để `do-tuong-phan-mau.mjs` chạy
   được offline trong 0,2 giây. Đổi HTML/cấu trúc DOM thì CHẠY LẠI FILE NÀY.
   ========================================================================== */

import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

const GOC = resolve(decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
if (!CHROME) throw new Error('Không tìm thấy chrome.exe');

const tam = join(tmpdir(), 'agc-nencha-' + Date.now());
mkdirSync(tam, { recursive: true });
cpSync(join(GOC, 'public'), tam, { recursive: true });

/* Tham số 1 = commit: thay style.css bằng bản ở commit đó để SO TRƯỚC/SAU.
   Có so được trước/sau mới phân biệt được "lỗi vòng này gây ra" với "lỗi có
   sẵn từ trước" — hai thứ đó xử lý khác hẳn nhau. Bản CŨ KHÔNG ghi đè
   `nen-cha.json` (xem cuối file). */
const commitCss = process.argv[2] || null;
if (commitCss) {
  const { execFileSync } = await import('node:child_process');
  writeFileSync(join(tam, 'assets/css/style.css'),
    execFileSync('git', ['show', `${commitCss}:public/assets/css/style.css`],
      { cwd: GOC, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }), 'utf8');
}

/* Script đo chạy TRONG trang. Đặt sau app.js nên nav đã sinh xong. */
const DO = `<script>
window.addEventListener('load', function () { setTimeout(function () {
  /* Bật hết mọi biến thể lớp mà app.js gán theo dữ liệu, để selector nào
     cũng có ít nhất một phần tử thật để hỏi. Thêm LỚP không đổi CHA — mà cha
     mới là thứ ta đang đo. */
  var cham = document.querySelector('.thd-cham') || document.querySelector('#thdNhan');
  if (cham) ['thd-ok','thd-sage','thd-warn','thd-danger','thd-mute','thd-cham'].forEach(function (c) { cham.classList.add(c); });
  document.querySelectorAll('.sb-item').forEach(function (b, i) { if (i === 1) b.classList.add('active'); if (i === 2) b.classList.add('locked'); });
  document.querySelectorAll('[hidden]').forEach(function (e) { e.dataset.dorieng = '1'; });

  function docMau(s) {
    var m = String(s).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    var p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3) return null;
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  /* Nền của MỘT phần tử: nền đặc của nó, hoặc mọi chặng màu nếu là gradient. */
  function nenRieng(el) {
    var cs = getComputedStyle(el), ra = [];
    var anh = cs.backgroundImage || '';
    if (anh && anh !== 'none' && anh.indexOf('gradient') >= 0) {
      var g = anh.match(/rgba?\\([^)]+\\)/g) || [];
      for (var i = 0; i < g.length; i++) { var c = docMau(g[i]); if (c && c[3] > 0) ra.push(c); }
    }
    var n = docMau(cs.backgroundColor);
    if (n && n[3] > 0) ra.push(n);
    return ra;
  }
  var TRANG = [255, 255, 255, 1];
  /* Leo tổ tiên: bỏ qua mọi tầng trong suốt, dừng ở tầng ĐẶC đầu tiên, rồi
     pha ngược từ dưới lên. Đây chính là thứ bàn đo cũ không làm.
     Trả về MỘT DANH SÁCH, không phải một màu: tầng đặc có thể là dải chuyển
     màu, và chữ trên dải phải đo ở CẢ HAI đầu — chỗ sáng nhất là chỗ chữ
     trắng dễ trượt nhất, đo mỗi đầu tối là tự khen mình. */
  function nenHieuLuc(el, boChinhNo) {
    var chong = [], dacDs = null, e = boChinhNo ? el.parentElement : el;
    while (e) {
      var ds = nenRieng(e), mo = [], dac = [];
      for (var i = 0; i < ds.length; i++) (ds[i][3] >= 1 ? dac : mo).push(ds[i]);
      for (var j = 0; j < mo.length; j++) chong.push(mo[j]);
      if (dac.length) { dacDs = dac; break; }
      e = e.parentElement;
    }
    if (!dacDs) dacDs = [TRANG];
    var ra = [];
    for (var d = 0; d < dacDs.length; d++) {
      var nen = dacDs[d].slice(0, 3);
      for (var k = chong.length - 1; k >= 0; k--) {
        var t = chong[k];
        nen = [t[0] * t[3] + nen[0] * (1 - t[3]), t[1] * t[3] + nen[1] * (1 - t[3]), t[2] * t[3] + nen[2] * (1 - t[3])];
      }
      ra.push(nen);
    }
    return ra;
  }
  function hex(c) { return '#' + c.map(function (n) { var s = Math.round(n).toString(16); return s.length < 2 ? '0' + s : s; }).join(''); }

  /* Duyệt MỌI selector lá trong style.css, bỏ phần trạng thái giả
     (:hover/:focus/::before…) rồi hỏi DOM xem nó rơi lên nền nào. */
  var bang = {};
  var toSo = 0;
  var loi = null;
  try {
  for (var s = 0; s < document.styleSheets.length; s++) {
    var luat; try { luat = document.styleSheets[s].cssRules; } catch (e) { continue; }
    var hangDoi = [];
    for (var r = 0; r < luat.length; r++) hangDoi.push(luat[r]);
    while (hangDoi.length) {
      var L = hangDoi.shift();
      /* ⚠️ KHÔNG viết 'if (L.cssRules)' rồi continue: Chrome đã bật CSS lồng
         nhau nên MỌI CSSStyleRule đều CÓ thuộc tính cssRules (một danh sách
         RỖNG — và một đối tượng rỗng vẫn là TRUE). Viết thế thì mọi luật đều
         bị coi là luật cha, bảng trả về rỗng mà không báo lỗi gì. Đây đúng
         loại bẫy BH-17: số ra 0 thì nghi PHÉP ĐO trước. */
      if (L.cssRules && L.cssRules.length) { for (var q = 0; q < L.cssRules.length; q++) hangDoi.push(L.cssRules[q]); }
      if (!L.selectorText) continue;
      toSo++;
      L.selectorText.split(',').forEach(function (sel) {
        sel = sel.trim();
        var goc = sel.replace(/::?[a-z-]+(\\([^)]*\\))?/g, '').trim();
        if (!goc || bang[sel]) return;
        var ds; try { ds = document.querySelectorAll(goc); } catch (e) { return; }
        if (!ds.length) return;
        /* Lưu theo CẶP (nền cha, màu chữ CUỐI CÙNG) của TỪNG phần tử, không
           lưu hai tập rời nhau. Rời nhau thì bàn đo tĩnh sẽ ghép màu của phần
           tử này với nền của phần tử kia — đúng kiểu tố oan: '.panel-head .hint'
           bị ghép màu xám của .hint thường với nền dải cam của mt-panel, ra
           1.91:1 ở một chỗ không hề tồn tại. Màu chữ cuối cùng còn cho biết
           luật có bị luật đặc hiệu hơn ĐÈ hay không. */
        var gom = {};
        for (var i = 0; i < ds.length && i < 40; i++) {
          var nds = nenHieuLuc(ds[i], true);
          var mc = docMau(getComputedStyle(ds[i]).color);
          var mh = mc ? hex([mc[0], mc[1], mc[2]]) : '';
          for (var z = 0; z < nds.length; z++) gom[hex(nds[z]) + '|' + mh] = 1;
        }
        bang[sel] = Object.keys(gom).map(function (k) { return k.split('|'); });
      });
    }
  }
  } catch (e) { loi = String(e && e.stack || e); }
  /* ── ĐO TƯƠNG PHẢN TRÊN DOM THẬT ────────────────────────────────────────
     Bàn đo tĩnh xét TỪNG LUẬT CSS một, nên nó không biết luật nào bị luật
     khác đặc hiệu hơn ĐÈ LÊN — nó sẽ tố cả những cặp không bao giờ hiện ra
     (ví dụ '.panel-head .hint' bị '.mt-panel .panel-head .hint' đè).
     Ở đây thì ngược lại: hỏi thẳng 'getComputedStyle' MÀU CUỐI CÙNG của
     từng phần tử CÓ CHỮ. Đây mới là thứ mắt người nhìn thấy. */
  function sang(c) {
    function g(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * g(c[0]) + 0.7152 * g(c[1]) + 0.0722 * g(c[2]);
  }
  function ti(a, b) { var x = sang(a), y = sang(b); var hi = x > y ? x : y, lo = x > y ? y : x; return (hi + 0.05) / (lo + 0.05); }
  function duong(el) {
    var p = [], e = el, n = 0;
    while (e && n++ < 4) { p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')); e = e.parentElement; }
    return p.join(' ');
  }
  var capDom = [];
  var tatCa = document.querySelectorAll('*');
  for (var t = 0; t < tatCa.length; t++) {
    var el = tatCa[t], coChu = false;
    for (var c2 = 0; c2 < el.childNodes.length; c2++)
      if (el.childNodes[c2].nodeType === 3 && el.childNodes[c2].nodeValue.trim()) { coChu = true; break; }
    if (!coChu) continue;
    var cs = getComputedStyle(el), chu = docMau(cs.color);
    if (!chu || chu[3] === 0) continue;
    var cx = parseFloat(cs.fontSize) || 15, dam = parseFloat(cs.fontWeight) || 400;
    var ng = (cx >= 24 || (cx >= 18.66 && dam >= 700)) ? 3 : 4.5;
    var nds = nenHieuLuc(el, false);
    for (var z2 = 0; z2 < nds.length; z2++) {
      var nen = nds[z2], mau = chu[3] >= 1 ? [chu[0], chu[1], chu[2]]
        : [chu[0] * chu[3] + nen[0] * (1 - chu[3]), chu[1] * chu[3] + nen[1] * (1 - chu[3]), chu[2] * chu[3] + nen[2] * (1 - chu[3])];
      capDom.push({ d: duong(el), c: hex(mau), n: hex(nen), r: Math.round(ti(mau, nen) * 100) / 100, g: ng });
    }
  }
  var pre = document.createElement('pre');
  pre.id = 'ket-qua-nen-cha';
  pre.textContent = JSON.stringify({ soLuat: toSo, loi: loi, bang: bang, capDom: capDom });
  document.body.appendChild(pre);
}, 700); });
</script>
`;
const dApp = join(tam, 'app.html');
writeFileSync(dApp, readFileSync(dApp, 'utf8')
  .replace("'serviceWorker' in navigator", 'false')
  .replace('</body>', DO + '</body>'), 'utf8');

const TOI = {
  ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
  vai_tro: 'admin', phai_doi_mk: 0, trang_thai: 'dang_lam', nhan_su_id: 1,
  quyen: ['tongquan', 'lichsuviec', 'danhba', 'gopy', 'kinhdoanh', 'donhoan', 'khovan', 'nhansu', 'ketoan', 'taisan', 'xepca']
};
const KIEU = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
               '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
               '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };
const may = createServer((req, res) => {
  const d = decodeURIComponent(req.url.split('?')[0]);
  if (d.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(d === '/api/toi-la-ai' ? TOI : { danh_sach: [], danh_ba: [], nhan_su: [], muc_tieu: [], viec: [], ok: true }));
  }
  const f = join(tam, d === '/' ? 'index.html' : d);
  if (!f.startsWith(tam) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': KIEU[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(ok => may.listen(0, '127.0.0.1', ok));
const CONG = may.address().port;

/* ⚠️ spawn, KHÔNG execFileSync: máy chủ chạy trong chính tiến trình này, khoá
   vòng lặp sự kiện là Chrome xin trang mà không ai trả lời → treo. */
const raFile = join(tam, 'dom.html');
await new Promise((ok, hong) => {
  const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--virtual-time-budget=9000',
    '--window-size=1440,900', '--dump-dom', `http://127.0.0.1:${CONG}/app.html`],
    { stdio: ['ignore', 'pipe', 'ignore'], timeout: 90000 });
  let out = '';
  p.stdout.on('data', c => { out += c; });
  p.on('error', hong);
  p.on('exit', () => { writeFileSync(raFile, out, 'utf8'); ok(); });
});
may.close();

const dom = readFileSync(raFile, 'utf8');
const m = dom.match(/<pre id="ket-qua-nen-cha">([\s\S]*?)<\/pre>/);
if (!m) { rmSync(tam, { recursive: true, force: true }); throw new Error('Trang không trả kết quả — app.js có chạy không? (xem module/CORS)'); }
const kq = JSON.parse(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
rmSync(tam, { recursive: true, force: true });

if (!commitCss) writeFileSync(join(GOC, 'scripts/nen-cha.json'), JSON.stringify(kq.bang, null, 0), 'utf8');
console.log(`\n═══ NỀN CHA THẬT (leo cây tổ tiên trong DOM)${commitCss ? ' — style.css @ ' + commitCss : ''} ═══`);
if (kq.loi) console.log(`  ⚠️ phép đo trong trang báo lỗi: ${kq.loi}`);
console.log(`  ${kq.soLuat} luật CSS · ${Object.keys(kq.bang).length} selector có phần tử thật trong trang`);
for (const s of ['.thd-nut', '.thd-danger', '.thd-ok', '.thd-mute', '.sb-item', '.sb-item.active', '.sb-user .meta span', '.mt-panel .panel-head h4'])
  if (kq.bang[s]) console.log(`  ${s.padEnd(28)} → ${[...new Set(kq.bang[s].map(x => x[0]))].join(' · ')}`);
console.log(`  ${commitCss ? "(bản cũ — KHÔNG ghi đè nen-cha.json)" : "→ scripts/nen-cha.json"}`);

/* ── Bảng tương phản trên DOM thật ──────────────────────────────────────── */
const cap = kq.capDom || [];
const truot = cap.filter(c => c.r < c.g).sort((a, b) => a.r - b.r);
console.log(`\n═══ TƯƠNG PHẢN TRÊN DOM THẬT (đã tính đặc hiệu, đã leo tổ tiên) ═══`);
console.log(`  ${cap.length} cặp chữ–nền của phần tử CÓ CHỮ · ${cap.length - truot.length} đạt · ${truot.length} trượt`);
const gom = new Map();
for (const c of truot) {
  const k = c.c + '|' + c.n + '|' + c.r;
  if (!gom.has(k)) gom.set(k, { ...c, so: 0, vd: c.d });
  gom.get(k).so++;
}
for (const g of [...gom.values()].sort((a, b) => a.r - b.r))
  console.log(`  TRƯỢT ${g.r.toFixed(2).padStart(6)}:1 (cần ${g.g})  ${g.c} trên ${g.n}  ×${String(g.so).padEnd(3)} ${g.vd.slice(0, 88)}`);
if (!truot.length) console.log('  ✓ Không cặp nào dưới ngưỡng.');
console.log(`\n  Thấp nhất: ${cap.length ? Math.min(...cap.map(c => c.r)).toFixed(2) : '—'}:1`);
