/* ==========================================================================
   BÀN ĐO CHAT NỘI BỘ — bấm THẬT bằng Chrome, đọc console THẬT
   ---------------------------------------------------------------------------
   Vì sao có file này: Sếp Ngọc báo "ấn Chat ngay không được". Đọc mã rồi đoán
   là cách sai (BH-17: phép đo hỏng chứ không phải mã hỏng). File này dựng một
   bản ERP chạy được trên http://127.0.0.1, cắm dữ liệu giả cho /api/*, rồi
   lái Chrome bằng CDP: bấm đúng cái nút, đếm cửa sổ chat có mở hay không.

   Chi phí 0: dùng Chrome sẵn trên máy + WebSocket có sẵn của Node 24.

   Chạy:
     node scripts/do-chat-noibo.mjs                → đo cây làm việc hiện tại
     node scripts/do-chat-noibo.mjs --hong-lan-dau → ca đối chứng: /api/chat/
       tin-nhan lỗi 500 ở ĐÚNG lượt gọi lúc khởi động (đúng ca của Sếp)
     node scripts/do-chat-noibo.mjs --css <commit> → hoàn nguyên public/ về
       commit đó rồi đo (ca đối chứng BH-16)
   MÃ THOÁT: 0 = xanh, 1 = đỏ. (Tới 29/08/2026 tệp này KHÔNG có `process.exit`
   nào — luôn thoát 0, tức chạy nó như cổng hồi quy là tự lừa. REV-0047/L4.
   Ngưỡng của từng phép đo nằm ở cuối tệp, mục "PHÉP TRƯỢT".)
   ========================================================================== */

import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

const GOC = resolve(decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
const HONG_LAN_DAU = process.argv.includes('--hong-lan-dau');
const iCss = process.argv.indexOf('--css');
const commitCu = iCss > 0 ? process.argv[iCss + 1] : null;
const BE_NGANG = (() => {
  const i = process.argv.indexOf('--rong');
  return i > 0 ? Number(process.argv[i + 1]) : 1440;
})();

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
if (!CHROME) throw new Error('Không tìm thấy chrome.exe');

/* ---- Bản tạm của public/ ------------------------------------------------ */
const tam = join(tmpdir(), 'agc-do-chat-' + Date.now());
mkdirSync(tam, { recursive: true });
cpSync(join(GOC, 'public'), tam, { recursive: true });

if (commitCu) {
  for (const f of ['assets/js/app.js', 'assets/css/style.css', 'app.html']) {
    try {
      writeFileSync(join(tam, f),
        execFileSync('git', ['show', `${commitCu}:public/${f}`],
          { cwd: GOC, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }), 'utf8');
    } catch { /* commit cũ chưa có file đó — bỏ qua */ }
  }
}

const iAnh = process.argv.indexOf('--anh');
const raAnh = iAnh > 0 ? resolve(process.argv[iAnh + 1]) : null;

// Service worker giữ trang "sống"; gỡ trong bản tạm cho phép đo tất định.
const boSW = s => s.replace(/'serviceWorker' in navigator/g, 'false');
/* TẮT TRANSITION lúc chụp — REV-0029/K4: một tấm ảnh trong repo này đã từng
   nói dối vì chụp trúng giữa lúc `transition` đang chạy, màu ra nhạt thếch mà
   CSS không đổi một chữ. Chỉ tắt `transition`, KHÔNG đụng `animation`: có
   `@keyframes` mở đầu bằng `opacity: 0`, tắt luôn là phần tử tàng hình. */
const TAT_HOAT_ANH =
  `<style id="chup-tat-transition">*,*::before,*::after{transition:none !important}</style>\n`;
const tatHA = s => (s.includes('</head>') ? s.replace('</head>', TAT_HOAT_ANH + '</head>') : TAT_HOAT_ANH + s);
for (const f of ['app.html', 'index.html']) {
  const p = join(tam, f);
  if (existsSync(p)) writeFileSync(p, tatHA(boSW(readFileSync(p, 'utf8'))), 'utf8');
}

/* ---- Dữ liệu giả -------------------------------------------------------- */
const TOI_ID = 'NS-NGOC';
const TOI = {
  ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
  phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
  trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
  quyen: ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu', 'khovan']
};
const NGUOI = [
  { id: 'NS-DUY',  ho_ten: 'Phạm Khương Duy', viet_tat: 'KD', chuc_vu: 'Quản lý kho',   bo_phan: 'Kho vận' },
  { id: 'NS-HANG', ho_ten: 'Phan Thị Hằng',   viet_tat: 'PH', chuc_vu: 'Kế toán trưởng', bo_phan: 'Kế toán' },
  { id: 'NS-HUONG',ho_ten: 'Vũ Lan Hương',    viet_tat: 'VH', chuc_vu: 'Hành chính nhân sự', bo_phan: 'HCNS' },
  { id: 'NS-HUYEN',ho_ten: 'Nguyễn Thị Huyền',viet_tat: 'NH', chuc_vu: 'Vận hành sàn',  bo_phan: 'Kinh doanh' },
  { id: TOI_ID,    ho_ten: 'Bùi Thị Ngọc',    viet_tat: 'BN', chuc_vu: 'Giám đốc Vận hành', bo_phan: 'Ban Giám đốc' }
];
const DANH_BA = NGUOI.map(n => ({
  ...n, sdt: '0900000000', email: 'a@agc.vn', quan_ly: '—',
  trang_thai_hd: 'available', trang_thai_ghi_chu: '', co_anh: 0
}));

// 120 tin cho mỗi luồng — đủ để thử "xem tin cũ hơn" (2 trang 50 tin).
function dungTin(voi) {
  const ds = [];
  for (let i = 1; i <= 120; i++) {
    const cuaToi = i % 3 === 0;
    ds.push({
      id: i,
      nguoi_gui_id: cuaToi ? TOI_ID : (voi || 'NS-DUY'),
      nguoi_gui_ten: cuaToi ? 'Bùi Thị Ngọc' : (NGUOI.find(n => n.id === voi)?.ho_ten || 'Phạm Khương Duy'),
      nguoi_gui_viet_tat: cuaToi ? 'BN' : (NGUOI.find(n => n.id === voi)?.viet_tat || 'KD'),
      nguoi_nhan_id: voi || null,
      noi_dung: `Tin thử số ${i}`,
      tep_ten: null, tep_loai: null, tep_kich_thuoc: null,
      tao_luc: '2026-08-29 08:' + String(i % 60).padStart(2, '0') + ':00'
    });
  }
  return ds;
}

let luotTinNhan = 0;
const KIEU = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
               '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
               '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
               '.json': 'application/json', '.ico': 'image/x-icon' };

const may = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const duong = decodeURIComponent(u.pathname);
  const traJson = (o, ma = 200) => {
    res.writeHead(ma, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(o));
  };
  if (duong.startsWith('/api/')) {
    if (duong === '/api/toi-la-ai') return traJson(TOI);
    if (duong === '/api/danh-ba') return traJson({ danh_ba: DANH_BA });
    if (duong === '/api/chat/tin-nhan') {
      luotTinNhan++;
      /* CA ĐỐI CHỨNG: chỉ lượt gọi ĐẦU TIÊN hỏng. Đây đúng ca ngoài đời —
         một trục trặc thoáng qua lúc khởi động (mạng chập, D1 nghẽn). */
      if (HONG_LAN_DAU && luotTinNhan === 1) return traJson({ loi: 'D1 quá tải' }, 500);
      const voi = u.searchParams.get('voi') || null;
      const sauId = parseInt(u.searchParams.get('sau_id'), 10) || 0;
      const truoc = parseInt(u.searchParams.get('truoc_id'), 10) || 0;
      const het = dungTin(voi);
      if (sauId > 0) return traJson({ tin_nhan: het.filter(t => t.id > sauId), toi_id: TOI_ID });
      if (truoc > 0) {
        const cu = het.filter(t => t.id < truoc).slice(-50);
        return traJson({ tin_nhan: cu, con_nua: het.some(t => t.id < (cu[0]?.id ?? 0)), toi_id: TOI_ID });
      }
      const cuoi = het.slice(-50);
      return traJson({ tin_nhan: cuoi, con_nua: het.length > 50, toi_id: TOI_ID });
    }
    if (duong === '/api/chat/gan-day') {
      const n = Number(process.env.AGC_SO_BONG || 3);
      const ds = [];
      const nguon = NGUOI.filter(x => x.id !== TOI_ID);
      for (let i = 0; i < n; i++) {
        const x = nguon[i % nguon.length];
        ds.push({ id: i < nguon.length ? x.id : x.id + '-' + i, ho_ten: x.ho_ten, viet_tat: x.viet_tat,
                  tin_cuoi: 'Tin thử số 120', tep_cuoi: null, luc_cuoi: '2026-08-29 08:20:00',
                  gui_cuoi: x.id, chua_doc: i === 0 ? 3 : 0 });
      }
      return traJson({ gan_day: ds, kenh_chung: { tin_cuoi: 'Cả nhà xuất kho lúc 15h nhé',
        tep_cuoi: null, luc_cuoi: '2026-08-29 08:30:00', ten_cuoi: 'Phạm Khương Duy', chua_doc: 2 } });
    }
    if (duong === '/api/chat/chua-doc') return traJson({ so_luong: 0, id_lon_nhat: 120 });
    /* Ổ trả lời chung. Mọi khoá MẢNG mà các tab hay đọc đều phải CÓ MẶT và
       RỖNG — thiếu một khoá là `undefined.length` nổ trong tab đó, rồi
       `loi_console` của bàn đo này báo một lỗi KHÔNG CÓ THẬT (đã xảy ra:
       thiếu `san_pham` làm tab Kho vận in TypeError suốt). Phép đo hỏng chứ
       không phải mã hỏng — đúng bẫy BH-17. Dùng chung danh sách khoá với
       `scripts/lib/ban-do-chrome.mjs`. */
    return traJson({ ok: true, danh_sach: [], danh_ba: [], nhan_su: [], nhan_vien: [],
      muc_tieu: [], viec: [], gan_day: [], gop_y: [], vai_tro: [], tai_khoan: [],
      phong_ban: [], chuc_danh: [], don_vi_tinh: [], san_pham: [], kho: [], ton: [],
      lich_su: [], vinh_danh: [], ca: [], thong_ke: {}, tong_quan: {} });
  }
  const f = join(tam, duong === '/' ? 'index.html' : duong);
  if (!f.startsWith(tam) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': KIEU[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(ok => may.listen(0, '127.0.0.1', ok));
const CONG = may.address().port;

/* ---- Lái Chrome bằng CDP (WebSocket có sẵn trong Node 24) ---------------- */
const hoSo = join(tmpdir(), 'agc-chrome-' + Date.now());
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--remote-debugging-port=0', `--user-data-dir=${hoSo}`,
  `--window-size=${BE_NGANG},900`, `http://127.0.0.1:${CONG}/app.html`],
  { stdio: ['ignore', 'ignore', 'pipe'] });

const wsUrl = await new Promise((ok, hong) => {
  let dem = '';
  const h = setTimeout(() => hong(new Error('Chrome không mở cổng gỡ lỗi')), 30000);
  chrome.stderr.on('data', d => {
    dem += d.toString();
    const m = dem.match(/ws:\/\/[^\s]+/);
    if (m) { clearTimeout(h); ok(m[0]); }
  });
});

const ws = new WebSocket(wsUrl);
await new Promise(ok => ws.addEventListener('open', ok));
let idLenh = 0;
const dangCho = new Map();
const suKien = [];
ws.addEventListener('message', ev => {
  const g = JSON.parse(ev.data);
  if (g.id && dangCho.has(g.id)) { dangCho.get(g.id)(g); dangCho.delete(g.id); }
  else if (g.method) suKien.push(g);
});
function goi(method, params = {}, sessionId) {
  const id = ++idLenh;
  return new Promise((ok, hong) => {
    dangCho.set(id, g => g.error ? hong(new Error(method + ': ' + g.error.message)) : ok(g.result));
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

const { targetInfos } = await goi('Target.getTargets');
const trang = targetInfos.find(t => t.type === 'page' && t.url.includes('app.html'));
const { sessionId } = await goi('Target.attachToTarget', { targetId: trang.targetId, flatten: true });
await goi('Runtime.enable', {}, sessionId);
await goi('Page.enable', {}, sessionId);
await goi('Log.enable', {}, sessionId);

const loiConsole = [];
ws.addEventListener('message', ev => {
  const g = JSON.parse(ev.data);
  if (g.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(g.params.type))
    loiConsole.push(g.params.args.map(a => a.value ?? a.description ?? a.type).join(' '));
  if (g.method === 'Log.entryAdded' && g.params.entry.level === 'error')
    loiConsole.push('[log] ' + g.params.entry.text);
});

const doi = ms => new Promise(ok => setTimeout(ok, ms));
async function chay(bieuThuc) {
  const r = await goi('Runtime.evaluate',
    { expression: bieuThuc, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' +
    (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
}

/* Bề ngang PHẢI đặt bằng Emulation, KHÔNG bằng `--window-size`: Chrome có bề
   ngang cửa sổ tối thiểu (~500px trên Windows) nên `--window-size=320` ra
   viewport 500 — phép đo im lặng nói dối đúng ở chỗ ta cần nó thật nhất. */
await goi('Emulation.setDeviceMetricsOverride',
  { width: BE_NGANG, height: 812, deviceScaleFactor: 1, mobile: BE_NGANG <= 640 }, sessionId);
await goi('Page.reload', {}, sessionId);
await doi(2500);   // đợi app.js nạp xong

/* ---- Phép đo ------------------------------------------------------------ */
const kq = { rong: BE_NGANG, hong_lan_dau: HONG_LAN_DAU, css: commitCu || 'cây làm việc' };

// Sang tab Danh bạ
await chay(`document.querySelector('[data-tab="danhba"]')?.click(); 1`);
await doi(600);

kq.co_moChatVoi = await chay(`typeof window.moChatVoi`);
kq.so_nut_chatngay = await chay(`document.querySelectorAll('[data-chatngay]').length`);

// Bấm THẬT từng nút "Chat ngay", đếm số lần cửa sổ chat mở ra
const nutIds = await chay(`Array.from(document.querySelectorAll('[data-chatngay]')).map(b => b.getAttribute('data-chatngay'))`);
let mo = 0;
const chiTiet = [];
for (const id of nutIds) {
  await chay(`document.querySelector('#cnbPopup').hidden = true; 1`);
  await chay(`document.querySelector('[data-chatngay="${id}"]').click(); 1`);
  await doi(500);
  const daMo = await chay(`!document.querySelector('#cnbPopup').hidden`);
  const tieuDe = await chay(`document.querySelector('#cnbDauTen')?.textContent || ''`);
  if (daMo) mo++;
  chiTiet.push({ id, mo: daMo, tieu_de: tieuDe });
}
kq.bam = nutIds.length;
kq.mo = mo;
kq.chi_tiet = chiTiet;
kq.loi_console = loiConsole.slice(0, 10);

/* ---- Danh sách hội thoại: mở nút nổi -> phải ra DANH SÁCH, không phải
   nhảy thẳng vào Kênh chung ---------------------------------------------- */
await chay(`document.querySelector('#cnbPopup').hidden = true;
            document.body.classList.remove('cnb-mo'); 1`);
await chay(`document.querySelector('#cnbNut')?.click(); 1`);
await doi(700);
kq.danh_sach = await chay(`(() => {
  const ds = document.querySelector('#cnbDs');
  const muc = Array.from(document.querySelectorAll('.cnb-ds-muc'));
  return {
    co: !!ds,
    hien: ds ? !ds.hidden : false,
    so_dong: muc.length,
    co_kenh_chung: muc.some(m => m.getAttribute('data-mo') === '__chung__'),
    dong_dau: muc[0] ? {
      ten: muc[0].querySelector('.cnb-ds-ten')?.textContent,
      phu: muc[0].querySelector('.cnb-ds-phu')?.textContent,
      gio: muc[0].querySelector('.cnb-ds-gio')?.textContent,
      chua_doc: muc[0].querySelector('.cnb-ds-dem')?.textContent || null
    } : null,
    cao_min: muc.length ? +Math.min(...muc.map(m => m.getBoundingClientRect().height)).toFixed(1) : null,
    o_nhap_an: !!document.querySelector('#chat-form')?.hidden
  };
})()`);

/* ---- Xem tin cũ hơn: 120 tin -> trang 1 · trang 2 không trùng, không sót -- */
/* Bản CŨ không có danh sách hội thoại — mở thẳng nút nổi là đã vào Kênh
   chung. Ca đối chứng phải CHẠY ĐƯỢC trên bản cũ thì mới so được. */
await chay(`(document.querySelector('.cnb-ds-muc[data-mo="__chung__"]')
             || document.querySelector('#cnbNut'))?.click(); 1`);
await doi(700);
const trang1 = await chay(`Array.from(document.querySelectorAll('#chat-khung .chat-bong')).map(e => e.textContent)`);
kq.xem_tin_cu = { trang1_so: trang1.length,
  co_nut: await chay(`!!document.querySelector('#chat-cu-hon')`),
  nut_hien: await chay(`(() => { const n = document.querySelector('#chat-cu-hon'); return !!n && !n.hidden; })()`) };
await chay(`document.querySelector('#chat-cu-hon')?.click(); 1`);
await doi(900);
const sau = await chay(`Array.from(document.querySelectorAll('#chat-khung .chat-bong')).map(e => e.textContent)`);
const so = s => Number(String(s).replace(/\D+/g, ''));
const idSau = sau.map(so);
kq.xem_tin_cu.sau_so = sau.length;
kq.xem_tin_cu.trung = idSau.length - new Set(idSau).size;
kq.xem_tin_cu.sot = (() => {
  const sx = [...idSau].sort((a, b) => a - b);
  let thieu = 0;
  for (let i = 1; i < sx.length; i++) if (sx[i] !== sx[i - 1] + 1) thieu += sx[i] - sx[i - 1] - 1;
  return thieu;
})();
kq.xem_tin_cu.tu_den = idSau.length ? [Math.min(...idSau), Math.max(...idSau)] : null;
kq.xem_tin_cu.con_nut = await chay(`(() => { const n = document.querySelector('#chat-cu-hon'); return !!n && !n.hidden; })()`);

/* ---- Kích thước nút thật (>=44px) + chiều cao vùng đọc tin -------------- */
kq.do_nut = await chay(`(() => {
  const lay = s => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  return { cnbNut: lay('#cnbNut'), cnbDong: lay('#cnbDong'), cnbLui: lay('#cnbLui'),
           guiTin: lay('#chat-nut-gui'), tep: lay('#chat-nut-tep'),
           oNhap: lay('#chat-noidung'), cuHon: lay('#chat-cu-hon'),
           dongHoiThoai: lay('.cnb-ds-muc'), bongGanDay: lay('.cnb-gd-item') };
})()`);
kq.vung_doc = await chay(`(() => {
  const k = document.querySelector('#chat-khung'); if (!k) return null;
  const r = k.getBoundingClientRect(); const p = document.querySelector('#cnbPopup').getBoundingClientRect();
  return { khung_cao: +r.height.toFixed(1), popup_cao: +p.height.toFixed(1),
           popup_rong: +p.width.toFixed(1), man_cao: window.innerHeight, man_rong: window.innerWidth,
           ti_le_man: +(r.height / window.innerHeight * 100).toFixed(1) };
})()`);

/* Nút nổi + bong bóng chỉ đo được khi cửa sổ ĐÓNG: ở điện thoại cửa sổ chiếm
   toàn màn hình nên chúng cố ý bị giấu (`body.cnb-mo`). */
await chay(`document.querySelector('#cnbPopup').hidden = true;
            document.body.classList.remove('cnb-mo'); 1`);
await doi(200);
kq.do_nut_ngoai = await chay(`(() => {
  const lay = s => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  return { cnbNut: lay('#cnbNut'), bongGanDay: lay('.cnb-gd-item'), chatNgay: lay('[data-chatngay]') };
})()`);
/* SỐ DÒNG TRÊN MÀN — ràng buộc cứng: nới nút "Chat ngay" lên 44px KHÔNG được
   làm bảng Danh bạ cao lên và đẩy dòng ra khỏi màn. Đo chiều cao một dòng
   thật rồi chia cho màn, chứ không khai suông. */
/* VÙNG CHẠM 44px của nút "Chat ngay" — đo bằng `elementFromPoint`, không đo
   `getBoundingClientRect`. Nút vẽ cao 28px nhưng có `::after` trong suốt cao
   44px; câu hỏi thật là "chạm ở mép trên/dưới vùng 44px có trúng nút không". */
kq.cham_44 = await chay(`(() => {
  const b = document.querySelector('[data-chatngay]'); if (!b) return null;
  /* Ở 375/320 bảng Danh bạ cuộn ngang, cột "Chat ngay" nằm NGOÀI khung nhìn —
     elementFromPoint trả null và phép đo báo "trượt" oan. Kéo nút vào giữa
     khung trước đã. Đây đúng bẫy BH-17: phép đo hỏng, không phải nút hỏng. */
  b.scrollIntoView({ block: 'center', inline: 'center' });
  const r = b.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const giua = r.top + r.height / 2;
  const tren = Math.round(giua - 21), duoi = Math.round(giua + 21);   // 44px => ±22, chừa 1px mép
  const trung = y => { const e = document.elementFromPoint(x, y); return !!(e && e.closest('[data-chatngay]')); };
  return { ve_cao: +r.height.toFixed(1), cham_cao: duoi - tren,
           trung_mep_tren: trung(tren), trung_mep_duoi: trung(duoi) };
})()`);
kq.dong_danhba = await chay(`(() => {
  const tr = document.querySelectorAll('#db-bang tr');
  if (!tr.length) return null;
  const cao = [...tr].map(r => r.getBoundingClientRect().height);
  const b = document.querySelector('#db-bang').getBoundingClientRect();
  return { so_dong: tr.length, cao_dong: +Math.max(...cao).toFixed(1),
           lot_duoc_man: Math.floor((window.innerHeight - b.top) / Math.max(...cao)) };
})()`);

/* ---- Cột bong bóng có đè lên nút bấm nào của trang không? --------------- */
kq.chong_lan = await chay(`(() => {
  document.querySelector('#cnbPopup').hidden = true;
  document.body.classList.remove('cnb-mo');
  const cham = (r, n) => r.left < n.right && r.right > n.left && r.top < n.bottom && r.bottom > n.top;
  const nutTrang = [...document.querySelectorAll('#v-danhba button, #v-danhba a')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height; });
  const dem = sel => {
    const noi = [...document.querySelectorAll(sel)].map(e => e.getBoundingClientRect());
    return nutTrang.filter(e => noi.some(n => cham(e.getBoundingClientRect(), n))).length;
  };
  /* Tách RIÊNG hai thủ phạm: nút nổi ở góc là "vùng cấm" tiêu chuẩn mọi ứng
     dụng đều có, còn CỘT BONG BÓNG leo dọc mới là thứ đè thêm. Gộp một số thì
     không biết phải sửa cái nào. */
  return { so_bong: document.querySelectorAll('.cnb-gd-item').length,
           bi_de_boi_bong: dem('.cnb-gd-item'),
           bi_de_boi_nut_chinh: dem('#cnbNut'),
           so_nut_bi_de: dem('.cnb-gd-item, #cnbNut') };
})()`);

/* ---- Ảnh chụp trước/sau ------------------------------------------------- */
if (raAnh) {
  mkdirSync(raAnh, { recursive: true });
  const hau = commitCu ? 'truoc' : 'sau';
  async function chup(ten) {
    const r = await goi('Page.captureScreenshot', { format: 'png' }, sessionId);
    const d = join(raAnh, `${BE_NGANG}-${ten}-${hau}.png`);
    writeFileSync(d, Buffer.from(r.data, 'base64'));
    console.error('  ✓ ' + d);
  }
  // ① Danh bạ, cửa sổ chat đóng — thấy nút "Chat ngay" và cột bong bóng
  await chay(`document.querySelector('#cnbPopup').hidden = true;
              document.body.classList.remove('cnb-mo');
              window.scrollTo(0, 0); 1`);
  await doi(500); await chup('danhba');
  // ② Cửa sổ chat vừa mở — bản mới ra DANH SÁCH, bản cũ ra thẳng Kênh chung
  await chay(`document.querySelector('#cnbNut')?.click(); 1`);
  await doi(900); await chup('chat-mo');
  // ③ Trong một đoạn chat
  await chay(`(document.querySelector('.cnb-ds-muc[data-mo="__chung__"]')
               || document.querySelector('#cnbNut'))?.click(); 1`);
  await doi(900); await chup('chat-luong');
}

/* ==========================================================================
   PHÉP TRƯỢT — MÃ THOÁT 0/1
   ---------------------------------------------------------------------------
   REV-0047/L4: tệp này TỪNG KHÔNG CÓ `process.exit` nào cả. Nó chạy, in một
   đống JSON, rồi thoát 0 dù mọi số đo có tệ đến đâu. Cả ngày 29/08 nhiều báo
   cáo trích "`do-chat-noibo` thoát 0" như bằng chứng hồi quy — bằng chứng đó
   VÔ NGHĨA: một cổng không bao giờ đỏ được thì nó không phải cổng.

   Từ đây mỗi phép đo có một ngưỡng viết thẳng ra. Chỉ chốt những thứ ĐÃ ĐO
   ĐƯỢC và phải đúng, không chốt thứ phụ thuộc dữ liệu giả (số bong bóng gần
   đây, bề rộng dòng hội thoại lúc đang trong một đoạn chat…) — cổng báo oan
   thì lần sau không ai đọc nữa.
   ========================================================================== */
const doVi = [];
const doi44 = (ten, o) => {
  if (!o) { doVi.push(`không tìm thấy ${ten}`); return; }
  if (o.h < 44 || o.w < 44) doVi.push(`${ten} chỉ ${o.w}×${o.h}px — dưới sàn chạm 44px`);
};

if (kq.co_moChatVoi !== 'function') doVi.push('window.moChatVoi không phải hàm — nút "Chat ngay" chắc chắn chết');
if (!kq.so_nut_chatngay) doVi.push('không có nút "Chat ngay" nào trong Danh bạ');
if (kq.mo !== kq.bam) doVi.push(`bấm ${kq.bam} nút "Chat ngay" mà chỉ mở được ${kq.mo} — đúng lỗi Sếp Ngọc báo`);
if (kq.loi_console.length) doVi.push(`${kq.loi_console.length} dòng console.error: ${kq.loi_console.slice(0, 3).join(' | ')}`);

const ds = kq.danh_sach || {};
if (!ds.co || !ds.hien) doVi.push('mở nút nổi mà KHÔNG ra danh sách hội thoại');
if (!ds.so_dong) doVi.push('danh sách hội thoại rỗng');
if (!ds.co_kenh_chung) doVi.push('danh sách hội thoại thiếu Kênh chung');
if (!ds.o_nhap_an) doVi.push('đang ở màn DANH SÁCH mà ô nhập tin vẫn hiện — gõ vào đó không biết gửi cho ai');

const x = kq.xem_tin_cu || {};
if (!x.co_nut || !x.nut_hien) doVi.push('không có nút "Xem tin cũ hơn" dù còn tin cũ');
if (!(x.sau_so > x.trang1_so)) doVi.push(`bấm "Xem tin cũ hơn" mà số tin không tăng (${x.trang1_so} → ${x.sau_so})`);
if (x.trung) doVi.push(`${x.trung} tin bị lặp sau khi tải trang 2`);
if (x.sot) doVi.push(`${x.sot} tin bị sót giữa hai trang — thủng lịch sử chat`);

const n = kq.do_nut || {};
doi44('nút nổi #cnbNut', n.cnbNut);
doi44('nút đóng #cnbDong', n.cnbDong);
doi44('nút lùi #cnbLui', n.cnbLui);
doi44('nút Gửi', n.guiTin);
doi44('nút đính kèm 📎', n.tep);
doi44('nút "Xem tin cũ hơn"', n.cuHon);
if (n.oNhap && n.oNhap.h < 44) doVi.push(`ô nhập tin cao ${n.oNhap.h}px — dưới sàn chạm 44px`);
/* Nút "Chat ngay" vẽ CAO 28px nhưng có `::after` trong suốt nới vùng chạm.
   Nên hỏi bằng `elementFromPoint`, không hỏi bằng bề cao vẽ ra. */
const c = kq.cham_44 || {};
if (!c.trung_mep_tren || !c.trung_mep_duoi)
  doVi.push(`vùng chạm nút "Chat ngay" thủng: mép trên ${c.trung_mep_tren ? 'trúng' : 'TRƯỢT'}, mép dưới ${c.trung_mep_duoi ? 'trúng' : 'TRƯỢT'}`);

if (kq.chong_lan && kq.chong_lan.bi_de_boi_bong)
  doVi.push(`cột bong bóng đè lên ${kq.chong_lan.bi_de_boi_bong} nút của trang`);

kq.ket_luan = doVi.length ? 'ĐỎ' : 'XANH';
kq.vi_sao_do = doVi;

console.log(JSON.stringify(kq, null, 2));
console.error('');
console.error(`CHAT NỘI BỘ [${kq.css} @${BE_NGANG}px${HONG_LAN_DAU ? ' · hỏng-lần-đầu' : ''}]: ${doVi.length ? '❌ ĐỎ' : '✅ XANH'}`);
for (const d of doVi) console.error('  · ' + d);

ws.close();
chrome.kill();
may.close();
try { rmSync(tam, { recursive: true, force: true }); } catch {}
try { rmSync(hoSo, { recursive: true, force: true }); } catch {}

/* MÃ THOÁT: 0 = xanh, 1 = đỏ. Không có dòng này thì cả tệp là đồ trang trí. */
process.exit(doVi.length ? 1 : 0);
