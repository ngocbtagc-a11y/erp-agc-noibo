/* ==========================================================================
   BÀN ĐO CHRUNG — dựng ERP chạy thật trên 127.0.0.1 + lái Chrome bằng CDP
   ---------------------------------------------------------------------------
   Vì sao tách ra: `do-chat-noibo.mjs` đã có đủ máy giả + lái Chrome + THU
   CONSOLE, nhưng chỉ dùng cho một mình nó. REV-0038 chỉ ra hai vòng soi liên
   tiếp bỏ lọt một tính năng CHẾT HOÀN TOÀN vì không vòng nào NẠP `app.js`
   trong trình duyệt. Tách phần dùng chung ra đây để `cong-khoi.mjs` (cổng
   khói bắt buộc trước mọi lần đẩy) dùng lại nguyên si, không chép bản thứ hai.

   Chi phí 0: Chrome sẵn trên máy + WebSocket có sẵn của Node.
   ========================================================================== */

import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

export const GOC = resolve(
  decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));

/* ---- Dữ liệu giả dùng chung -------------------------------------------- */
export const TOI_ID = 'NS-NGOC';
export const TOI = {
  ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
  phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
  trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
  quyen: ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu', 'khovan']
};
export const NGUOI = [
  { id: 'NS-DUY',   ho_ten: 'Phạm Khương Duy',  viet_tat: 'KD', chuc_vu: 'Quản lý kho',        bo_phan: 'Kho vận' },
  { id: 'NS-HANG',  ho_ten: 'Phan Thị Hằng',    viet_tat: 'PH', chuc_vu: 'Kế toán trưởng',     bo_phan: 'Kế toán' },
  { id: 'NS-HUONG', ho_ten: 'Vũ Lan Hương',     viet_tat: 'VH', chuc_vu: 'Hành chính nhân sự', bo_phan: 'HCNS' },
  { id: 'NS-HUYEN', ho_ten: 'Nguyễn Thị Huyền', viet_tat: 'NH', chuc_vu: 'Vận hành sàn',       bo_phan: 'Kinh doanh' },
  { id: TOI_ID,     ho_ten: 'Bùi Thị Ngọc',     viet_tat: 'BN', chuc_vu: 'Giám đốc Vận hành',  bo_phan: 'Ban Giám đốc' }
];
export const DANH_BA = NGUOI.map(n => ({
  ...n, sdt: '0900000000', email: 'a@agc.vn', quan_ly: '—',
  trang_thai_hd: 'available', trang_thai_ghi_chu: '', co_anh: 0
}));

/** 120 tin cho một luồng — đủ thử "xem tin cũ hơn" (2 trang 50 tin). */
export function dungTin(voi) {
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

const KIEU = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
               '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
               '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
               '.json': 'application/json', '.ico': 'image/x-icon' };

/**
 * Dựng bản tạm của `public/` rồi phục vụ trên 127.0.0.1 kèm /api/* giả.
 * @param {object} o
 * @param {string|null} o.commit  hoàn nguyên public/ về commit này trước khi đo
 * @param {boolean} o.tatHoatAnh  tắt `transition` (chỉ để chụp ảnh tất định)
 * @param {(duong, u, traJson) => boolean} o.apiRieng  chặn /api/* riêng của từng
 *        bàn đo; trả `true` nghĩa là đã trả lời xong.
 * @param {(s, ten) => string} o.suaTep  sửa nội dung một tệp trong bản tạm
 *        (dùng cho ca đối chứng "mẫu hỏng giả" của cổng khói).
 */
export async function dungMayGia({ commit = null, tatHoatAnh = false, apiRieng = null, suaTep = null } = {}) {
  const tam = join(tmpdir(), 'agc-ban-do-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
  mkdirSync(tam, { recursive: true });
  cpSync(join(GOC, 'public'), tam, { recursive: true });

  if (commit) {
    for (const f of ['assets/js/app.js', 'assets/js/api.js', 'assets/css/style.css', 'app.html']) {
      try {
        writeFileSync(join(tam, f),
          execFileSync('git', ['show', `${commit}:public/${f}`],
            { cwd: GOC, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }), 'utf8');
      } catch { /* commit cũ chưa có tệp đó — bỏ qua */ }
    }
  }

  // Service worker giữ trang "sống"; gỡ trong bản tạm cho phép đo tất định.
  const boSW = s => s.replace(/'serviceWorker' in navigator/g, 'false');
  const TAT_HA = `<style id="chup-tat-transition">*,*::before,*::after{transition:none !important}</style>\n`;
  for (const f of ['app.html', 'index.html']) {
    const p = join(tam, f);
    if (!existsSync(p)) continue;
    let s = boSW(readFileSync(p, 'utf8'));
    if (tatHoatAnh) s = s.includes('</head>') ? s.replace('</head>', TAT_HA + '</head>') : TAT_HA + s;
    writeFileSync(p, s, 'utf8');
  }
  if (suaTep) {
    for (const f of ['app.html', 'assets/js/app.js']) {
      const p = join(tam, f);
      if (!existsSync(p)) continue;
      const truoc = readFileSync(p, 'utf8');
      const sau = suaTep(truoc, f);
      if (sau !== truoc) writeFileSync(p, sau, 'utf8');
    }
  }

  const may = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const duong = decodeURIComponent(u.pathname);
    const traJson = (o, ma = 200) => {
      res.writeHead(ma, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(o));
    };
    if (duong.startsWith('/api/')) {
      if (apiRieng && apiRieng(duong, u, traJson)) return;
      if (duong === '/api/toi-la-ai') return traJson(TOI);
      if (duong === '/api/danh-ba') return traJson({ danh_ba: DANH_BA });
      if (duong === '/api/chat/tin-nhan') {
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
      /* Ổ trả lời chung: mọi khoá mảng mà các tab hay đọc đều có mặt và RỖNG.
         Rỗng chứ không thiếu — `undefined.map` là lỗi của bàn đo, không phải
         lỗi của ứng dụng, và cổng khói sẽ đỏ oan. */
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

  return {
    cong: may.address().port,
    thuMuc: tam,
    dong() {
      may.close();
      try { rmSync(tam, { recursive: true, force: true }); } catch {}
    }
  };
}

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));

/**
 * Mở Chrome headless vào `url`, nối CDP, THU console + NGOẠI LỆ CHƯA BẮT.
 * Trả về { chay, goi, loiConsole, ngoaiLe, dong }.
 * `loiConsole` chỉ nhận mức `error` — cảnh báo (`warning`) gom riêng ở
 * `canhBao` để cổng khói không đỏ vì mấy dòng nhắc nhở của trình duyệt.
 */
export async function moChrome({ url, rong = 1440, cao = 812, doiMs = 2500 } = {}) {
  if (!CHROME) throw new Error('Không tìm thấy chrome.exe');
  const hoSo = join(tmpdir(), 'agc-chrome-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--remote-debugging-port=0', `--user-data-dir=${hoSo}`,
    `--window-size=${rong},900`, url], { stdio: ['ignore', 'ignore', 'pipe'] });

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
  ws.addEventListener('message', ev => {
    const g = JSON.parse(ev.data);
    if (g.id && dangCho.has(g.id)) { dangCho.get(g.id)(g); dangCho.delete(g.id); }
  });
  function goi(method, params = {}, sid) {
    const id = ++idLenh;
    return new Promise((ok, hong) => {
      dangCho.set(id, g => g.error ? hong(new Error(method + ': ' + g.error.message)) : ok(g.result));
      ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
    });
  }

  const { targetInfos } = await goi('Target.getTargets');
  const trang = targetInfos.find(t => t.type === 'page' && t.url.includes('.html'));
  const { sessionId } = await goi('Target.attachToTarget', { targetId: trang.targetId, flatten: true });
  await goi('Runtime.enable', {}, sessionId);
  await goi('Page.enable', {}, sessionId);
  await goi('Log.enable', {}, sessionId);

  const loiConsole = [], canhBao = [], ngoaiLe = [];
  ws.addEventListener('message', ev => {
    const g = JSON.parse(ev.data);
    if (g.method === 'Runtime.consoleAPICalled') {
      const chu = (g.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' ');
      if (g.params.type === 'error') loiConsole.push(chu);
      else if (g.params.type === 'warning') canhBao.push(chu);
    }
    /* NGOẠI LỆ CHƯA BẮT — đây đúng thứ đã giết chat suốt từ `7bf0e58`
       (`Cannot access 'TBDay' before initialization`) mà không bàn đo nào đọc.
       `Log.entryAdded` mức error bắt thêm 404 tài nguyên, CSP, v.v. */
    if (g.method === 'Runtime.exceptionThrown') {
      const d = g.params.exceptionDetails || {};
      ngoaiLe.push(d.exception?.description || d.text || 'ngoại lệ không rõ');
    }
    if (g.method === 'Log.entryAdded' && g.params.entry.level === 'error')
      loiConsole.push('[log] ' + g.params.entry.text);
  });

  /* Bề ngang PHẢI đặt bằng Emulation, KHÔNG bằng `--window-size`: Chrome có bề
     ngang cửa sổ tối thiểu (~500px trên Windows) nên `--window-size=320` ra
     viewport 500 — phép đo im lặng nói dối đúng ở chỗ ta cần nó thật nhất. */
  await goi('Emulation.setDeviceMetricsOverride',
    { width: rong, height: cao, deviceScaleFactor: 1, mobile: rong <= 640 }, sessionId);
  await goi('Page.reload', {}, sessionId);
  await new Promise(ok => setTimeout(ok, doiMs));

  async function chay(bieuThuc) {
    const r = await goi('Runtime.evaluate',
      { expression: bieuThuc, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' +
      (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  }

  return {
    chay, goi, sessionId, loiConsole, canhBao, ngoaiLe,
    doi: ms => new Promise(ok => setTimeout(ok, ms)),
    dong() {
      try { ws.close(); } catch {}
      try { chrome.kill(); } catch {}
      try { rmSync(hoSo, { recursive: true, force: true }); } catch {}
    }
  };
}
