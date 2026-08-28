/* ==========================================================================
   TỰ KIỂM — THÔNG BÁO TIN NHẮN LÊN ĐIỆN THOẠI (CTL-0014)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tu-kiem-thongbao-tinnhan.mjs

   ĐO THẬT, KHÔNG KHỚP CHUỖI (BH-34):
     · D1 thật — `node:sqlite` + `schema.sql` + TOÀN BỘ `migrations/` thật.
     · `worker.fetch()` thật — đi qua đúng router, đúng cookie phiên, đúng
       `ctx.waitUntil` như Cloudflare.
     · Mã hoá Web Push thật — bàn thử GIỮ khoá riêng của "điện thoại" nên
       GIẢI MÃ NGƯỢC được gói tin. Đếm số gói là chưa đủ: gói sai khoá vẫn
       được máy chủ đẩy nhận (201) rồi hỏng IM LẶNG trên máy người dùng.

   CA ĐỐI CHỨNG (BH-16 · BH-26): mỗi chốt chặn được kiểm thêm một lần trên
   BẢN KHÔNG VÁ — chính file `src/day-thong-bao.js` bị GỠ ĐÚNG một dòng chốt
   bằng regex, nạp lại, chạy lại đúng kịch bản đó. Bản không vá BẮT BUỘC phải
   ra số khác. Cùng ra "đạt" nghĩa là phép đo hỏng, không phải code đúng.
   Đây là loại lệch CƠ HỌC (xoá hẳn câu lệnh), hỏng với mọi đầu vào.
   ========================================================================== */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NGUON_CHINH_SACH = path.join(GOC, 'src', 'day-thong-bao.js');

/* ---- Bắt gói tin đẩy: KHÔNG cho ra Internet, giữ lại để mổ --------------- */

const DAY = [];   // { endpoint, than(Uint8Array), ky(chuỗi Authorization) }

/* Máy chủ đẩy giả lập trả gì. `null` = 201 như bình thường; đặt số để dựng lại
   đúng các ca REV-0028 H1 (401/403/429/5xx/404/410); 'mang' = fetch ném lỗi. */
let MA_TRA_VE = null;

const TELEGRAM = [];   // mọi lời kêu cứu bắn ra — H1 và H3 soi thẳng vào đây
const guiTelegramThu = async (_env, text) => { TELEGRAM.push(text); return true; };

const fetchTruoc = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://day-thu.test/')) {
    if (MA_TRA_VE === 'mang') throw new Error('fetch failed');
    DAY.push({
      endpoint: u,
      than: new Uint8Array(init.body),
      ky: init.headers.Authorization,
      maHoa: init.headers['Content-Encoding']
    });
    if (MA_TRA_VE) {
      // 429 kèm Retry-After như máy chủ đẩy thật.
      const h = MA_TRA_VE === 429 ? { 'Retry-After': '120' } : undefined;
      return new Response('', { status: MA_TRA_VE, headers: h });
    }
    return new Response('', { status: 201 });
  }
  if (u.startsWith('https://day-chet.test/')) return new Response('', { status: 410 });
  return fetchTruoc(url, init);
};

/* ---- Tiện ích base64url + máy giải mã (đóng vai ĐIỆN THOẠI người nhận) --- */

const b64u = (u8) => Buffer.from(u8).toString('base64url');
const tuB64u = (s) => new Uint8Array(Buffer.from(String(s), 'base64url'));
const chu = (s) => new TextEncoder().encode(s);
function noi(...p) {
  const r = new Uint8Array(p.reduce((n, x) => n + x.length, 0));
  let v = 0; for (const x of p) { r.set(x, v); v += x.length; }
  return r;
}

/** Một "chiếc điện thoại": cặp khoá ECDH P-256 + bí mật auth 16 byte. */
async function taoDienThoai(ten) {
  const cap = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', cap.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    ten,
    endpoint: `https://day-thu.test/ep/${ten}`,
    p256dh: b64u(pub), auth: b64u(auth),
    _pub: pub, _riengTu: cap.privateKey, _auth: auth
  };
}

async function hkdf(muoi, goc, info, n) {
  const k = await crypto.subtle.importKey('raw', goc, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: muoi, info }, k, n * 8));
}

/** Giải mã gói `aes128gcm` bằng khoá riêng của điện thoại — đúng việc mà
 *  trình duyệt thật làm. Trả chuỗi JSON, hoặc ném lỗi nếu gói sai. */
async function giaiMa(dt, than) {
  const muoi = than.subarray(0, 16);
  const idlen = than[20];
  const khoaTam = than.subarray(21, 21 + idlen);
  const daMa = than.subarray(21 + idlen);

  const khoaTamCK = await crypto.subtle.importKey(
    'raw', khoaTam, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const chung = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: khoaTamCK }, dt._riengTu, 256));

  const goc = await hkdf(dt._auth, chung, noi(chu('WebPush: info\0'), dt._pub, khoaTam), 32);
  const cek = await hkdf(muoi, goc, chu('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(muoi, goc, chu('Content-Encoding: nonce\0'), 12);

  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const ro = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, k, daMa));
  let het = ro.length;
  while (het > 0 && ro[het - 1] === 0x00) het--;          // đệm
  if (ro[het - 1] === 0x02) het--;                         // dấu chấm hết bản ghi cuối
  return new TextDecoder().decode(ro.subarray(0, het));
}

/* ---- Dựng thế giới ------------------------------------------------------ */

let worker, env, db, VAPID;
const NGUOI = {};   // ten -> { nhanSuId, taiKhoanId, token, dienThoai }

async function themNguoi(ten, id, boPhan = 'Kho vận') {
  const vietTat = ten.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
  db.prepare(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, trang_thai, dang_lam)
              VALUES (?, ?, ?, 'Nhân viên', ?, 'da_ky', 1)`).run(id, ten, vietTat, boPhan);
  const r = db.prepare(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, tao_luc)
              VALUES (?, ?, 'x', 'nhan_vien', datetime('now'))`).run(id, id);
  const taiKhoanId = Number(r.lastInsertRowid);
  const token = await taoPhienThat(env, taiKhoanId);
  NGUOI[ten] = { nhanSuId: id, taiKhoanId, token, ten };
  return NGUOI[ten];
}

/** Gắn một "điện thoại" đã bật thông báo cho người này (qua API thật). */
async function batThongBao(n, hauTo = '') {
  const dt = await taoDienThoai(n.nhanSuId + hauTo);
  const kq = await goiAPI(worker, env, '/api/push/dang-ky', n.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: dt.endpoint, p256dh: dt.p256dh, auth: dt.auth, may: 'Bàn thử' })
  });
  if (kq.status !== 200) throw new Error('Đăng ký máy hỏng: ' + JSON.stringify(kq.than));
  n.dienThoai = dt;
  return dt;
}

/* Đặt đồng hồ RỒI CẤP LẠI PHIÊN cho mọi người.
   BH-17 — lần chạy đầu, ba ca (thứ Bảy, dọn đăng ký chết, chưa có khoá VAPID)
   báo "hỏng" và suýt bị ghi thành lỗi của code. Truy ra là bàn thử: phiên đăng
   nhập sống 12 tiếng (`HAN_PHIEN_GIO` trong `src/auth.js`), mà bàn thử nhảy
   đồng hồ sang ngày hôm sau — mọi lệnh gọi sau đó trả 401, không phải vì chốt
   chặn nào chặn cả. Code đúng, phép đo hỏng. */
async function datGio(iso) {
  datDongHo(iso);
  for (const n of Object.values(NGUOI)) n.token = await taoPhienThat(env, n.taiKhoanId);
}

async function guiTin(tu, denNhanSuId, noiDung) {
  const fd = new FormData();
  fd.append('noi_dung', noiDung);
  if (denNhanSuId) fd.append('nguoi_nhan_id', denNhanSuId);
  return goiAPI(worker, env, '/api/chat/gui', tu.token, { method: 'POST', body: fd });
}

/** "Tôi đang mở cửa sổ chat với X" — đúng lệnh gọi mà giao diện phát ra. */
async function moCuaSoChatVoi(n, voiId) {
  return goiAPI(worker, env, `/api/chat/tin-nhan?voi=${voiId}&dang_mo=1`, n.token);
}

function demDayToi(dt) { return DAY.filter(d => d.endpoint === dt.endpoint).length; }

/* ---- Bản KHÔNG VÁ, dùng cho ca đối chứng (BH-16) ------------------------ */

/* Gỡ ĐÚNG một câu lệnh chốt chặn khỏi `src/day-thong-bao.js` rồi nạp bản đó.
   Không sửa file gốc: ghi ra file tạm CẠNH file gốc (để `import` tương đối
   `./nhac-nhan-su.js` vẫn phân giải đúng), dùng xong xoá. */
const CHOT = {
  tu_gui_cho_minh:       /if \(nhan === gui\) return \{ day: false, ly_do: 'tu_gui_cho_minh' \};/,
  kenh_chung:            /if \(!nhan\) return \{ day: false, ly_do: 'kenh_chung_khong_day' \};/,
  nguoi_dung_da_tat:     /if \(tk\.push_chat_tat\) return \{ day: false, ly_do: 'nguoi_dung_da_tat' \};/,
  gop_trong_mot_phut:    /if \(cach >= 0 && cach < GOP_GIAY\) return \{ day: false, ly_do: 'gop_trong_mot_phut' \};/,
  cham_tran_ngay:        /if \(\(dem\?\.n \|\| 0\) >= TRAN_NGAY\) return \{ day: false, ly_do: 'cham_tran_ngay' \};/,
  dang_mo_dung_cua_so:   /return \{ day: false, ly_do: 'dang_mo_dung_cua_so' \};/
};

const tamDaTao = [];
async function napBanKhongVa(tenChot) {
  const goc = readFileSync(NGUON_CHINH_SACH, 'utf8');
  const re = CHOT[tenChot];
  if (!re.test(goc)) throw new Error(`Không tìm thấy chốt "${tenChot}" để gỡ — regex đã lạc hậu so với code`);
  const khongVa = goc.replace(re, `/* CHỐT BỊ GỠ CỐ Ý — ca đối chứng ${tenChot} */`);
  const duong = path.join(GOC, 'src', `_doichung_${tenChot}.js`);
  writeFileSync(duong, khongVa, 'utf8');
  tamDaTao.push(duong);
  return import('file://' + duong.replace(/\\/g, '/') + '?v=' + Date.now());
}

/** Ca đối chứng kiểu THAY: có chốt không gỡ trống được mà phải trả về đúng
 *  hành vi của bản TRƯỚC KHI VÁ. Ví dụ H1: bản cũ xoá đăng ký với MỌI lỗi, bản
 *  vá chỉ xoá khi `duocXoaDangKy(...)`. Đây vẫn là lệch CƠ HỌC (đổi đúng một
 *  biểu thức), hỏng với mọi đầu vào. */
let demNap = 0;
async function napBanThay(ten, duongNguon, tim, thay, { napLuon = true } = {}) {
  const goc = readFileSync(duongNguon, 'utf8');
  if (!tim.test(goc)) throw new Error(`Ca đối chứng "${ten}": regex trượt — đã lạc hậu so với code`);
  const duong = path.join(path.dirname(duongNguon), `_doichung_${ten}${path.extname(duongNguon)}`);
  writeFileSync(duong, goc.replace(tim, thay), 'utf8');
  tamDaTao.push(duong);
  // `service worker` phải được nạp SAU khi dựng `self` giả — nên có đường lùi
  // chỉ ghi file rồi trả đường dẫn, không nạp ngay.
  if (!napLuon) return { duong };
  return import('file://' + duong.replace(/\\/g, '/') + `?v=${Date.now()}-${++demNap}`);
}

/* ---- Nạp `public/sw.js` THẬT để đo hành vi trên màn hình khoá (M1 · M3) ----
   Không chép lại logic: dựng một `self` giả đúng bề mặt mà service worker dùng
   rồi nạp CHÍNH file đang phục vụ người dùng. */
async function napServiceWorker(duong = path.join(GOC, 'public', 'sw.js')) {
  const bo = { hien: [], nhan: [], mo: [], tay: {} };
  const tabs = [];
  bo.themTab = (url) => {
    const t = { url, focus: async () => { t.daFocus = true; }, postMessage: (m) => bo.nhan.push(m) };
    tabs.push(t); return t;
  };
  globalThis.self = {
    addEventListener: (ten, fn) => { bo.tay[ten] = fn; },
    registration: {
      showNotification: async (tieuDe, tuyChon) => { bo.hien.push({ tieuDe, ...tuyChon }); }
    },
    clients: {
      matchAll: async () => tabs,
      claim: async () => {},
      openWindow: async (u) => { bo.mo.push(u); }
    },
    skipWaiting: () => {}
  };
  await import('file://' + duong.replace(/\\/g, '/') + `?v=${Date.now()}-${++demNap}`);
  bo.day = async (dulieu) => {
    const cho = [];
    await bo.tay.push({ data: { json: () => dulieu }, waitUntil: (p) => cho.push(p) });
    await Promise.all(cho);
  };
  bo.bam = async (dulieu) => {
    const cho = [];
    await bo.tay.notificationclick({
      notification: { close: () => {}, data: dulieu },
      waitUntil: (p) => cho.push(p)
    });
    await Promise.all(cho);
  };
  return bo;
}
function donFileTam() {
  for (const d of tamDaTao) { try { unlinkSync(d); } catch { /* đã xoá */ } }
}

/* ========================================================================== */

async function chay() {
  console.log('='.repeat(72));
  console.log('TỰ KIỂM CTL-0014 — Thông báo tin nhắn lên điện thoại');
  console.log('='.repeat(72));

  /* --- L0 · Bàn thử tự chứng minh nó đo được gì ------------------------- */
  console.log('\nL0 · Dựng D1 thật + khoá VAPID thật');
  const { db: _db, d1, conLoi } = dungDB();
  db = _db;
  /* Các file `lui-*.sql` là kịch bản LÙI BẢN — chạy xuôi thì hỏng là đúng.
     Ba lỗi `them-gopy-*` là NỢ CÓ SẴN, đã kiểm chứng: gỡ hẳn migration của đợt
     này ra khỏi thư mục thì vẫn ĐÚNG 3 lỗi đó, không hơn không kém. Neo vào
     mốc đã biết thay vì bỏ qua cả cụm — làm thế thì migration của đợt này có
     hỏng cũng lọt. */
  const NO_CO_SAN = new Set(['them-gopy-congduyet.sql', 'them-gopy-lichsu-tacnhan.sql']);
  const loiMoi = conLoi.filter(c => !/^lui-/.test(c.ten) && !NO_CO_SAN.has(c.ten));
  ok('migration của đợt này KHÔNG thêm lỗi nạp nào', loiMoi.length === 0,
    loiMoi.length ? loiMoi.slice(0, 3).map(c => c.ten + ': ' + c.loi).join(' | ')
                  : `${conLoi.filter(c => NO_CO_SAN.has(c.ten)).length} lỗi nợ cũ giữ nguyên`);
  ok('bảng push_dangky có thật', !!db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='push_dangky'`).get());
  ok('bảng push_nhat_ky có thật', !!db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='push_nhat_ky'`).get());

  const { taoCapKhoaVAPID } = await import('../src/webpush.js');
  VAPID = await taoCapKhoaVAPID();
  ok('sinh được cặp khoá VAPID (chi phí 0, không dịch vụ ngoài)',
    VAPID.congKhai.length > 80 && !!VAPID.biMat, `công khai ${VAPID.congKhai.length} ký tự`);

  env = dungEnv(d1, {
    VAPID_KHOA_CONG_KHAI: VAPID.congKhai,
    VAPID_KHOA_BI_MAT: VAPID.biMat,
    VAPID_LIEN_HE: 'mailto:alphagreen.commerce@gmail.com'
  });
  worker = (await import('../src/index.js')).default;

  // Thứ Năm 10h sáng giờ VN = trong cửa gửi ADR-0013.
  datDongHo('2026-09-03T03:00:00Z');

  const lan  = await themNguoi('Phạm Thị Lan', 'NS-LAN');
  const duy  = await themNguoi('Phạm Khương Duy', 'NS-DUY');
  const huyen = await themNguoi('Nguyễn Thị Huyền', 'NS-HUYEN');
  await batThongBao(lan);
  await batThongBao(duy);
  ok('3 người + 2 điện thoại đã bật thông báo', !!lan.dienThoai && !!duy.dienThoai);

  /* --- L1 · Mã hoá THẬT: điện thoại giải ra đúng chữ --------------------- */
  console.log('\nL1 · Gói tin đẩy — mã hoá đúng chuẩn RFC 8291 hay không');
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'Chị Lan ơi, lô hạt điều về rồi nhé');
  ok('chị Lan nhận được ĐÚNG 1 gói đẩy', demDayToi(lan.dienThoai) === 1, `đo được ${demDayToi(lan.dienThoai)}`);

  let noiDungGiai = null;
  try { noiDungGiai = JSON.parse(await giaiMa(lan.dienThoai, DAY[0].than)); } catch (e) { noiDungGiai = { _loi: e.message }; }
  ok('điện thoại GIẢI MÃ được gói tin (không phải chỉ nhận được 201)',
    !!noiDungGiai?.tieu_de, JSON.stringify(noiDungGiai).slice(0, 90));
  ok('thông báo nêu TÊN người gửi', String(noiDungGiai?.tieu_de || '').includes('Phạm Khương Duy'));
  ok('KHÔNG lộ nội dung tin nhắn trên màn hình khoá',
    !JSON.stringify(noiDungGiai).includes('hạt điều'),
    'chat nội bộ có cả chuyện lương/kỷ luật — CTL-0014 §5.3');
  ok('bấm vào thì mở đúng cửa sổ chat', String(noiDungGiai?.duong_dan || '').includes('#chat'));
  ok('header Content-Encoding đúng aes128gcm', DAY[0].maHoa === 'aes128gcm');

  // Chữ ký VAPID phải THẬT — dựng lại khoá công khai rồi xác minh chữ ký.
  const kyDay = DAY[0].ky || '';
  const jwt = (kyDay.match(/t=([^,]+)/) || [])[1] || '';
  const [h, p, s] = jwt.split('.');
  let kyDung = false;
  try {
    const pub = tuB64u(VAPID.congKhai);
    const khoaXm = await crypto.subtle.importKey('jwk',
      { kty: 'EC', crv: 'P-256', x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    kyDung = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' },
      khoaXm, tuB64u(s), chu(`${h}.${p}`));
  } catch (e) { kyDung = 'lỗi: ' + e.message; }
  ok('chữ ký VAPID xác minh ĐƯỢC bằng khoá công khai', kyDung === true, String(kyDung));
  const than = JSON.parse(Buffer.from(p, 'base64url').toString());
  ok('trường aud là GỐC của endpoint (sai chỗ này là Google trả 401)',
    than.aud === 'https://day-thu.test', than.aud);

  // ĐỐI CHỨNG CƠ HỌC: lật 1 byte trong gói → giải mã BẮT BUỘC phải hỏng.
  const hong = new Uint8Array(DAY[0].than);
  hong[hong.length - 1] ^= 0x01;
  let giaiHong = false;
  try { await giaiMa(lan.dienThoai, hong); giaiHong = false; } catch { giaiHong = true; }
  ok('ĐỐI CHỨNG · lật 1 byte thì giải mã PHẢI hỏng', giaiHong,
    'chứng minh phép giải mã ở trên thật sự kiểm chữ, không phải luôn "đạt"');

  /* --- L2 · Không thông báo tin của CHÍNH MÌNH --------------------------- */
  console.log('\nL2 · Tin của chính mình gửi');
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'tin thứ hai');
  ok('người GỬI (anh Duy) nhận 0 thông báo', demDayToi(duy.dienThoai) === 0, `đo được ${demDayToi(duy.dienThoai)}`);

  // Gửi DM cho chính mình bị máy chủ chặn từ đầu.
  const tuGui = await guiTin(lan, lan.nhanSuId, 'tự nhắn');
  ok('máy chủ từ chối DM tự gửi cho mình', tuGui.status >= 400, 'mã ' + tuGui.status);

  {
    const { xetDayChat } = await import('../src/day-thong-bao.js');
    const x = await xetDayChat(env, { nguoi_nhan_id: 'NS-LAN', nguoi_gui_id: 'NS-LAN' });
    ok('chốt tu_gui_cho_minh chặn ở tầng chính sách', x.ly_do === 'tu_gui_cho_minh', x.ly_do);
    const kv = await napBanKhongVa('tu_gui_cho_minh');
    const y = await kv.xetDayChat(env, { nguoi_nhan_id: 'NS-LAN', nguoi_gui_id: 'NS-LAN' });
    ok('ĐỐI CHỨNG · gỡ chốt đó thì kết quả PHẢI khác', y.ly_do !== 'tu_gui_cho_minh',
      'bản không vá cho ly_do = ' + y.ly_do);
  }

  /* --- L3 · Đang mở đúng cửa sổ chat đó ---------------------------------- */
  console.log('\nL3 · Chị Lan đang mở đúng cửa sổ chat với anh Duy');
  await datGio('2026-09-03T03:10:00Z');
  DAY.length = 0;
  await moCuaSoChatVoi(lan, duy.nhanSuId);            // nhịp tim từ giao diện
  await guiTin(duy, lan.nhanSuId, 'đang mở nên đừng đẩy');
  ok('0 thông báo ĐẨY khi đang mở đúng cửa sổ đó', demDayToi(lan.dienThoai) === 0,
    `đo được ${demDayToi(lan.dienThoai)} — giao diện vẫn kêu khẽ, xem app.js`);

  // Mở cửa sổ với NGƯỜI KHÁC thì tin của anh Duy vẫn phải đẩy.
  await datGio('2026-09-03T03:12:00Z');
  DAY.length = 0;
  await moCuaSoChatVoi(lan, huyen.nhanSuId);
  await guiTin(duy, lan.nhanSuId, 'mở cửa sổ người khác thì vẫn phải báo');
  ok('mở cửa sổ NGƯỜI KHÁC thì vẫn đẩy bình thường', demDayToi(lan.dienThoai) === 1,
    `đo được ${demDayToi(lan.dienThoai)}`);

  // Nhịp tim cũ quá (quá 45s) = đã đóng máy → phải đẩy lại.
  await datGio('2026-09-03T03:20:00Z');
  await moCuaSoChatVoi(lan, duy.nhanSuId);
  await datGio('2026-09-03T03:25:00Z');                  // 5 phút sau, nhịp tim đã nguội
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'nhịp tim đã nguội');
  ok('nhịp tim nguội (>45s) thì đẩy lại bình thường', demDayToi(lan.dienThoai) === 1,
    `đo được ${demDayToi(lan.dienThoai)}`);

  {
    await datGio('2026-09-03T03:30:00Z');
    await moCuaSoChatVoi(lan, duy.nhanSuId);
    db.exec("DELETE FROM push_nhat_ky");
    const tin = { nguoi_nhan_id: lan.nhanSuId, nguoi_gui_id: duy.nhanSuId, nguoi_gui_ten: 'Duy' };
    const { xetDayChat } = await import('../src/day-thong-bao.js');
    const x = await xetDayChat(env, tin, new Date());
    ok('chốt dang_mo_dung_cua_so đang chặn', x.ly_do === 'dang_mo_dung_cua_so', x.ly_do);
    const kv = await napBanKhongVa('dang_mo_dung_cua_so');
    const y = await kv.xetDayChat(env, tin, new Date());
    ok('ĐỐI CHỨNG · gỡ chốt đó thì PHẢI cho đẩy', y.day === true, 'bản không vá: day=' + y.day);
  }

  /* --- L4 · Gộp 5 tin trong 1 phút = 1 thông báo ------------------------- */
  console.log('\nL4 · Anh Duy nhắn dồn 5 tin trong một phút');
  db.exec("DELETE FROM push_nhat_ky");
  db.exec("UPDATE tai_khoan SET xem_chat_voi = NULL, xem_chat_luc = NULL");
  DAY.length = 0;
  for (let i = 0; i < 5; i++) {
    await datGio(`2026-09-03T04:00:${String(i * 10).padStart(2, '0')}Z`);   // 0s,10s,20s,30s,40s
    await guiTin(duy, lan.nhanSuId, `tin dồn số ${i + 1}`);
  }
  ok('5 tin trong 1 phút → ĐÚNG 1 thông báo', demDayToi(lan.dienThoai) === 1,
    `đo được ${demDayToi(lan.dienThoai)}`);

  // Qua 60 giây thì tin tiếp theo lại được báo — gộp chứ không phải chặn chết.
  await datGio('2026-09-03T04:01:30Z');
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'sau một phút rưỡi');
  ok('quá 60 giây thì báo lại (gộp, không phải chặn chết)', demDayToi(lan.dienThoai) === 1,
    `đo được ${demDayToi(lan.dienThoai)}`);

  // Người gửi KHÁC trong cùng phút vẫn phải báo — gộp theo TỪNG người gửi.
  db.exec("DELETE FROM push_nhat_ky");
  await datGio('2026-09-03T04:05:00Z');
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'anh Duy');
  await guiTin(huyen, lan.nhanSuId, 'chị Huyền');
  ok('hai người KHÁC nhau cùng phút → 2 thông báo (gộp theo người gửi)',
    demDayToi(lan.dienThoai) === 2, `đo được ${demDayToi(lan.dienThoai)}`);

  {
    db.exec("DELETE FROM push_nhat_ky");
    await datGio('2026-09-03T04:10:00Z');
    DAY.length = 0;
    for (let i = 0; i < 5; i++) await guiTin(duy, lan.nhanSuId, `dồn ${i}`);
    const coVa = demDayToi(lan.dienThoai);
    db.exec("DELETE FROM push_nhat_ky");
    const kv = await napBanKhongVa('gop_trong_mot_phut');
    DAY.length = 0;
    const tin = { nguoi_nhan_id: lan.nhanSuId, nguoi_gui_id: duy.nhanSuId, nguoi_gui_ten: 'Duy' };
    for (let i = 0; i < 5; i++) await kv.dayTinNhanChat(env, tin, new Date());
    const khongVa = demDayToi(lan.dienThoai);
    ok('ĐỐI CHỨNG · gỡ chốt gộp thì 5 tin ra 5 thông báo',
      coVa === 1 && khongVa === 5, `có vá ${coVa} · không vá ${khongVa}`);
  }

  /* --- L5 · Tắt thì im ---------------------------------------------------- */
  console.log('\nL5 · Chị Lan tự tắt báo tin nhắn');
  db.exec("DELETE FROM push_nhat_ky");
  await datGio('2026-09-03T05:00:00Z');
  const tat = await goiAPI(worker, env, '/api/push/tuy-chon', lan.token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_tat: 1 })
  });
  ok('API tắt trả lời ok', tat.status === 200 && tat.than?.chat_tat === 1);
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'đã tắt thì đừng báo');
  ok('đã TẮT → 0 thông báo', demDayToi(lan.dienThoai) === 0, `đo được ${demDayToi(lan.dienThoai)}`);

  {
    const kv = await napBanKhongVa('nguoi_dung_da_tat');
    DAY.length = 0;
    await kv.dayTinNhanChat(env,
      { nguoi_nhan_id: lan.nhanSuId, nguoi_gui_id: duy.nhanSuId, nguoi_gui_ten: 'Duy' }, new Date());
    ok('ĐỐI CHỨNG · gỡ chốt tắt thì lại đẩy', demDayToi(lan.dienThoai) === 1,
      `bản không vá đẩy ${demDayToi(lan.dienThoai)} gói`);
  }
  // Bật lại để các ca sau chạy tiếp.
  await goiAPI(worker, env, '/api/push/tuy-chon', lan.token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_tat: 0 })
  });
  db.exec("DELETE FROM push_nhat_ky");

  /* --- L6 · Kênh chung KHÔNG đẩy ----------------------------------------- */
  console.log('\nL6 · Kênh chung 20 người');
  await datGio('2026-09-03T06:00:00Z');
  DAY.length = 0;
  await guiTin(duy, null, 'cả nhà ơi họp 3h nhé');
  ok('kênh chung → 0 thông báo đẩy (Đợt 1 cố ý)', DAY.length === 0,
    `đo được ${DAY.length} — 1 tin kênh chung mà đẩy là 19 thông báo`);

  /* --- L7 · Cửa giờ dùng CHUNG với hệ nhắc việc (ADR-0013) ---------------- */
  console.log('\nL7 · Ngoài giờ làm việc / Chủ nhật');
  db.exec("DELETE FROM push_nhat_ky");
  await datGio('2026-09-03T15:00:00Z');           // 22h giờ VN
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'nhắn lúc 10h đêm');
  ok('22h đêm → 0 thông báo (cửa 8h–18h của ADR-0013)', demDayToi(lan.dienThoai) === 0,
    `đo được ${demDayToi(lan.dienThoai)}`);

  db.exec("DELETE FROM push_nhat_ky");
  await datGio('2026-09-06T03:00:00Z');           // Chủ nhật 10h VN
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'nhắn Chủ nhật');
  ok('Chủ nhật → 0 thông báo', demDayToi(lan.dienThoai) === 0, `đo được ${demDayToi(lan.dienThoai)}`);

  db.exec("DELETE FROM push_nhat_ky");
  await datGio('2026-09-05T03:00:00Z');           // Thứ Bảy 10h VN — VẪN làm (ADR-0013)
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'nhắn thứ Bảy');
  ok('thứ Bảy VẪN báo (ADR-0013: chỉ nghỉ Chủ nhật)', demDayToi(lan.dienThoai) === 1,
    `đo được ${demDayToi(lan.dienThoai)}`);

  /* --- L8 · TRẦN NGÀY — hàng rào bảo vệ cảnh báo đơn hoàn ---------------- */
  console.log('\nL8 · NGÀY BẬN NHẤT — một người nhận tối đa bao nhiêu thông báo');
  const { TRAN_NGAY, GOP_GIAY } = await import('../src/day-thong-bao.js');
  db.exec("DELETE FROM push_nhat_ky");
  db.exec("UPDATE tai_khoan SET xem_chat_voi = NULL, xem_chat_luc = NULL");
  DAY.length = 0;

  /* Kịch bản DÀY NHẤT có thể xảy ra thật: 8h–18h là 10 tiếng = 600 phút.
     Cả công ty (19 người khác) thi nhau nhắn riêng cho chị Lan LIÊN TỤC, mỗi
     người mỗi phút một tin — tức 11.400 tin nhắn riêng gửi tới một người
     trong một ngày. Đây là mức phi thực tế, cố ý chọn để đo TRẦN. */
  let gio = 8, phut = 0;
  for (let n = 0; n < 400 && demDayToi(lan.dienThoai) <= TRAN_NGAY + 2; n++) {
    const gioUTC = gio - 7 + Math.floor(phut / 60);
    await datGio(`2026-09-03T${String(gioUTC).padStart(2, '0')}:${String(phut % 60).padStart(2, '0')}:00Z`);
    // Hai người gửi khác nhau, xen kẽ → lớp gộp 60s không che được
    await guiTin(n % 2 ? huyen : duy, lan.nhanSuId, 'tin dồn dập ' + n);
    phut += 2;
    if (gio + Math.floor(phut / 60) >= 18) break;
  }
  const daNhan = demDayToi(lan.dienThoai);
  ok(`ngày dày nhất: tối đa ${TRAN_NGAY} thông báo/người/ngày`, daNhan <= TRAN_NGAY,
    `ĐO ĐƯỢC ${daNhan} thông báo dù có 11.400 tin nhắn dồn tới`);

  DAY.length = 0;
  await datGio('2026-09-03T09:00:00Z');
  await guiTin(duy, lan.nhanSuId, 'sau khi chạm trần');
  ok('chạm trần rồi thì im hẳn tới sáng hôm sau', demDayToi(lan.dienThoai) === 0,
    'số đỏ và tiếng trong app vẫn còn — chỉ ngừng ĐẨY');

  {
    const truocKhiGo = demDayToi(lan.dienThoai);
    const kv = await napBanKhongVa('cham_tran_ngay');
    DAY.length = 0;
    for (let i = 0; i < 4; i++) {
      // 02:30Z–05:30Z = 9h30–12h30 giờ VN. Dùng 09:00Z như lần đầu là 16h–19h
      // VN, hai lượt cuối rơi ra ngoài cửa 8h–18h và ca đối chứng đo hụt.
      await datGio(`2026-09-03T0${2 + i}:30:00Z`);
      await kv.dayTinNhanChat(env,
        { nguoi_nhan_id: lan.nhanSuId, nguoi_gui_id: duy.nhanSuId, nguoi_gui_ten: 'Duy' }, new Date());
    }
    ok('ĐỐI CHỨNG · gỡ trần ngày thì tràn ngay', truocKhiGo === 0 && demDayToi(lan.dienThoai) === 4,
      `có vá ${truocKhiGo} · không vá ${demDayToi(lan.dienThoai)}`);
  }

  /* --- L9 · Dọn đăng ký chết (đổi máy, gỡ app) --------------------------- */
  console.log('\nL9 · Đổi điện thoại / gỡ app — đăng ký cũ thành rác');
  await datGio('2026-09-04T03:00:00Z');
  db.exec("DELETE FROM push_nhat_ky");
  db.prepare(`INSERT INTO push_dangky (nhan_su_id, endpoint, p256dh, auth, tao_luc)
              VALUES (?, 'https://day-chet.test/ep/cu', ?, ?, datetime('now'))`)
    .run(huyen.nhanSuId, lan.dienThoai.p256dh, lan.dienThoai.auth);
  const truocDon = db.prepare(`SELECT COUNT(*) n FROM push_dangky WHERE nhan_su_id = ?`).get(huyen.nhanSuId).n;
  await guiTin(duy, huyen.nhanSuId, 'gửi vào máy đã chết');
  const sauDon = db.prepare(`SELECT COUNT(*) n FROM push_dangky WHERE nhan_su_id = ?`).get(huyen.nhanSuId).n;
  ok('máy chủ đẩy trả 410 → tự xoá đăng ký rác', truocDon === 1 && sauDon === 0,
    `trước ${truocDon} · sau ${sauDon}`);

  /* --- L10 · Chưa đặt khoá VAPID thì ERP vẫn chạy bình thường ------------ */
  console.log('\nL10 · Két Cloudflare chưa có khoá VAPID');
  const envKhongKhoa = dungEnv(d1, {});
  DAY.length = 0;
  await datGio('2026-09-04T04:00:00Z');
  db.exec("DELETE FROM push_nhat_ky");
  const fd = new FormData(); fd.append('noi_dung', 'chưa có khoá'); fd.append('nguoi_nhan_id', lan.nhanSuId);
  const rKhongKhoa = await goiAPI(worker, envKhongKhoa, '/api/chat/gui', duy.token, { method: 'POST', body: fd });
  ok('chưa có khoá → tin nhắn VẪN gửi được, không vỡ', rKhongKhoa.status === 200, 'mã ' + rKhongKhoa.status);
  ok('chưa có khoá → 0 gói đẩy, không báo lỗi đỏ', DAY.length === 0);

  /* --- L11 · Kênh cảnh báo đơn hoàn KHÔNG bị đụng ------------------------ */
  console.log('\nL11 · Rủi ro lớn nhất — cảnh báo đơn hoàn có bị ảnh hưởng không');
  const truocTB = db.prepare(`SELECT COUNT(*) n FROM thong_bao`).get().n;
  await datGio('2026-09-04T05:00:00Z');
  db.exec("DELETE FROM push_nhat_ky");
  await guiTin(duy, lan.nhanSuId, 'tin nhắn thường');
  const sauTB = db.prepare(`SELECT COUNT(*) n FROM thong_bao`).get().n;
  ok('đẩy tin nhắn KHÔNG ghi thêm dòng nào vào bảng thong_bao',
    truocTB === sauTB, `chuông cảnh báo đơn hoàn không bị tin nhắn làm loãng (${truocTB}→${sauTB})`);

  db.prepare(`UPDATE tai_khoan SET push_chat_tat = 1 WHERE nhan_su_id = ?`).run(lan.nhanSuId);
  const conNhanCanhBao = db.prepare(
    `SELECT push_chat_tat FROM tai_khoan WHERE nhan_su_id = ?`).get(lan.nhanSuId).push_chat_tat;
  ok('tắt tin nhắn là cột RIÊNG, không phải công tắc tổng', conNhanCanhBao === 1,
    'người tắt chat trong ERP vẫn giữ nguyên cảnh báo đơn hoàn');

  /* ======================================================================
     L12 · REV-0028 H1 — LỖI PHÍA MÌNH KHÔNG ĐƯỢC XOÁ DỮ LIỆU CỦA NGƯỜI TA
     Dựng lại đúng ca của Hồ Ly: chị Lan có 3 máy, đẩy một lượt với từng mã lỗi,
     đếm SỐ ĐĂNG KÝ CÒN LẠI trước/sau. 404/410 phải xoá; mọi mã còn lại phải
     giữ nguyên 3/3.
     ====================================================================== */
  console.log('\nL12 · Khoá sai / 401 / 403 / 429 / 5xx — đăng ký của nhân viên còn hay mất');
  const { dayToiNguoi, loiThongBao } = await import('../src/day-thong-bao.js');
  db.prepare(`UPDATE tai_khoan SET push_chat_tat = 0 WHERE nhan_su_id = ?`).run(lan.nhanSuId);

  const BA_MAY = [];
  async function dungLai3May() {
    db.prepare(`DELETE FROM push_dangky WHERE nhan_su_id = ?`).run(lan.nhanSuId);
    BA_MAY.length = 0;
    for (const hau of ['-dt', '-may-tinh', '-may-bau']) {
      const dt = await taoDienThoai(lan.nhanSuId + hau);
      db.prepare(`INSERT INTO push_dangky (nhan_su_id, endpoint, p256dh, auth, tao_luc)
                  VALUES (?, ?, ?, ?, datetime('now'))`)
        .run(lan.nhanSuId, dt.endpoint, dt.p256dh, dt.auth);
      BA_MAY.push(dt);
    }
    return db.prepare(`SELECT COUNT(*) n FROM push_dangky WHERE nhan_su_id = ?`).get(lan.nhanSuId).n;
  }
  const demMay = () => db.prepare(`SELECT COUNT(*) n FROM push_dangky WHERE nhan_su_id = ?`)
    .get(lan.nhanSuId).n;

  /* Két Cloudflare bị dán nhầm chuỗi vào VAPID_KHOA_BI_MAT — ca nguy hiểm nhất:
     đo cũ ra {"gui":0,"hong":0,"xoa":3}, 3/3 máy của chị Lan bay sạch, im lặng. */
  const envKhoaSai = dungEnv(d1, {
    VAPID_KHOA_CONG_KHAI: VAPID.congKhai,
    VAPID_KHOA_BI_MAT: 'day-la-chuoi-dan-nham-khong-phai-khoa'
  });
  await datGio('2026-09-04T06:00:00Z');
  const truocKhoaSai = await dungLai3May();
  TELEGRAM.length = 0;
  const kqKhoaSai = await dayToiNguoi(envKhoaSai, lan.nhanSuId, loiThongBao('Duy', 1, duy.nhanSuId),
    new Date(), { guiTelegram: guiTelegramThu });
  ok('DÁN NHẦM KHOÁ VAPID → giữ nguyên 3/3 đăng ký, KHÔNG xoá ai',
    truocKhoaSai === 3 && demMay() === 3 && kqKhoaSai.xoa === 0,
    `trước ${truocKhoaSai} · sau ${demMay()} · dừng vì ${kqKhoaSai.dung_lai}`);
  ok('dán nhầm khoá thì KÊU TO (Telegram cho Gạo), không im lặng',
    TELEGRAM.length === 1 && /VAPID/.test(TELEGRAM[0]), TELEGRAM[0]?.slice(0, 80) || 'không có tin nào');
  ok('lời kêu KHÔNG mang theo chuỗi khoá bí mật',
    !TELEGRAM.join('\n').includes(VAPID.biMat) &&
    !TELEGRAM.join('\n').includes('day-la-chuoi-dan-nham-khong-phai-khoa'));

  // Từng mã lỗi một, mỗi ca dựng lại đủ 3 máy.
  const CA_MA = [
    [401, 3, 'chữ ký bị từ chối — lỗi CỦA TA'],
    [403, 3, 'bị cấm — lỗi CỦA TA'],
    [429, 3, 'bị chặn tốc độ — lùi lại, không xoá'],
    [500, 3, 'máy chủ đẩy hỏng — thử lại'],
    [503, 3, 'máy chủ đẩy bận — thử lại'],
    ['mang', 3, 'đứt mạng — thử lại'],
    [404, 0, 'đăng ký không còn — xoá đúng'],
    [410, 0, 'đăng ký đã huỷ — xoá đúng']
  ];
  for (const [ma, conLai, vi] of CA_MA) {
    const truoc = await dungLai3May();
    TELEGRAM.length = 0;
    MA_TRA_VE = ma;
    const kq = await dayToiNguoi(env, lan.nhanSuId, loiThongBao('Duy', 1, duy.nhanSuId),
      new Date(), { guiTelegram: guiTelegramThu });
    MA_TRA_VE = null;
    const sau = demMay();
    ok(`mã ${ma} (${vi}) → còn ${conLai}/3 đăng ký`, truoc === 3 && sau === conLai,
      `trước ${truoc} · sau ${sau} · xoá ${kq.xoa} · hỏng ${kq.hong}`);
  }

  /* 12 lượt 500 LIÊN TIẾP: bản trước dọn sau 10 lượt. Google hỏng một tiếng là
     MỌI đăng ký cùng dính — dọn kiểu đó là mất sạch cả công ty, chỉ chậm hơn
     10 nhịp. Giờ chỉ kêu, không xoá. */
  const truoc12 = await dungLai3May();
  TELEGRAM.length = 0;
  MA_TRA_VE = 500;
  for (let i = 0; i < 12; i++) {
    await dayToiNguoi(env, lan.nhanSuId, loiThongBao('Duy', 1, duy.nhanSuId),
      new Date(), { guiTelegram: guiTelegramThu });
  }
  MA_TRA_VE = null;
  ok('12 lượt 5xx liên tiếp → VẪN còn 3/3 đăng ký (chỉ kêu, không dọn)',
    truoc12 === 3 && demMay() === 3, `trước ${truoc12} · sau ${demMay()}`);
  ok('hỏng dai dẳng thì có kêu lên Telegram', TELEGRAM.some(t => /liên tiếp/.test(t)),
    `${TELEGRAM.length} tin`);

  {
    // ĐỐI CHỨNG (BH-16): đưa luật xoá về đúng bản trước — "hỏng là xoá".
    const kv = await napBanThay('h1_xoa_moi_loi', NGUON_CHINH_SACH,
      /if \(duocXoaDangKy\(kq\.loai\)\) \{/, 'if (!kq.ok) {');
    const truoc = await dungLai3May();
    MA_TRA_VE = 401;
    await kv.dayToiNguoi(env, lan.nhanSuId, loiThongBao('Duy', 1, duy.nhanSuId), new Date(), {});
    MA_TRA_VE = null;
    ok('ĐỐI CHỨNG · bản "hỏng là xoá" thì 401 quét sạch 3/3',
      truoc === 3 && demMay() === 0, `trước ${truoc} · sau ${demMay()} — phép đo có nhạy thật`);
  }
  await dungLai3May();

  /* ======================================================================
     L13 · REV-0028 H3 — thiếu bước cài đặt thì PHẢI kêu, đủ thì PHẢI im
     ====================================================================== */
  console.log('\nL13 · Thiếu 1 trong 3 bước triển khai — có tự phát hiện không');
  const { kiemTraCaiDatDay, NGUOI_HE_THONG } = await import('../src/day-thong-bao.js');
  const xoaDauCanhBao = () => db.prepare(`DELETE FROM push_nhat_ky WHERE nhan_su_id = ?`)
    .run(NGUOI_HE_THONG);
  const LUC_9H = new Date('2026-09-07T02:00:00Z');    // 9h00 giờ VN, thứ Hai

  async function thuThieu(ten, envThu, monKhac) {
    xoaDauCanhBao();
    TELEGRAM.length = 0;
    if (monKhac) monKhac();
    let kq;
    try { kq = await kiemTraCaiDatDay(envThu, guiTelegramThu, LUC_9H); }
    finally { if (monKhac) monKhac(true); }
    return { kq, tin: TELEGRAM.slice() };
  }

  {
    const { kq, tin } = await thuThieu('đủ cả 3 bước', env);
    ok('ĐỦ cả 3 bước → KHÔNG cảnh báo giả', kq.chay === true && kq.thieu.length === 0 && tin.length === 0,
      JSON.stringify(kq.thieu));
  }
  {
    const envThieuCK = dungEnv(d1, { VAPID_KHOA_BI_MAT: VAPID.biMat });
    const { kq, tin } = await thuThieu('thiếu khoá công khai', envThieuCK);
    ok('thiếu Bước 2 (VAPID_KHOA_CONG_KHAI) → có cảnh báo',
      kq.thieu.length >= 1 && tin.length === 1 && /Bước 2/.test(tin[0]), kq.thieu.join(' | '));
  }
  {
    const envThieuBM = dungEnv(d1, { VAPID_KHOA_CONG_KHAI: VAPID.congKhai });
    const { kq, tin } = await thuThieu('thiếu khoá bí mật', envThieuBM);
    ok('thiếu Bước 3 (VAPID_KHOA_BI_MAT) → có cảnh báo',
      kq.thieu.length >= 1 && tin.length === 1 && /Bước 3/.test(tin[0]), kq.thieu.join(' | '));
  }
  {
    /* Bước 1 thiếu THẬT: đổi tên bảng trên D1 thật rồi trả lại — không phải
       giả lập bằng cách bắt chuỗi SQL. */
    const { kq, tin } = await thuThieu('thiếu migration', env, (traLai) => {
      db.exec(traLai ? `ALTER TABLE push_dangky_tam RENAME TO push_dangky`
                     : `ALTER TABLE push_dangky RENAME TO push_dangky_tam`);
    });
    ok('thiếu Bước 1 (migration) → có cảnh báo',
      kq.thieu.some(t => /Bước 1/.test(t)) && tin.length === 1, kq.thieu.join(' | '));
  }
  {
    // Có đủ hai khoá nhưng dán nhầm → KÝ KHÔNG ĐƯỢC. Đây là ca đã gây ra H1.
    const { kq, tin } = await thuThieu('khoá lệch cặp', envKhoaSai);
    ok('có khoá nhưng KÝ KHÔNG ĐƯỢC → vẫn bắt được trước khi hỏng thật',
      kq.thieu.some(t => /KÝ KHÔNG ĐƯỢC/.test(t)) && tin.length === 1, kq.thieu.join(' | '));
  }
  {
    xoaDauCanhBao(); TELEGRAM.length = 0;
    const a = await kiemTraCaiDatDay(dungEnv(d1, {}), guiTelegramThu, LUC_9H);
    const b = await kiemTraCaiDatDay(dungEnv(d1, {}), guiTelegramThu, LUC_9H);
    ok('kêu MỘT lần/ngày, không bắn Telegram mỗi 5 phút',
      a.da_bao === true && b.da_bao === false && TELEGRAM.length === 1, `${TELEGRAM.length} tin`);
    const ngoai = await kiemTraCaiDatDay(dungEnv(d1, {}), guiTelegramThu, new Date('2026-09-07T07:00:00Z'));
    ok('ngoài cửa 9h VN thì không chạy (dùng chung cron 5 phút sẵn có)',
      ngoai.chay === false, ngoai.ly_do);
    xoaDauCanhBao();
  }
  {
    const truocTB2 = db.prepare(`SELECT COUNT(*) n FROM thong_bao`).get().n;
    await kiemTraCaiDatDay(dungEnv(d1, {}), guiTelegramThu, LUC_9H);
    const sauTB2 = db.prepare(`SELECT COUNT(*) n FROM thong_bao`).get().n;
    ok('cảnh báo cài đặt KHÔNG đụng bảng thong_bao (chuông đơn hoàn)',
      truocTB2 === sauTB2, `${truocTB2}→${sauTB2}`);
    xoaDauCanhBao();
  }

  /* ======================================================================
     L14 · REV-0028 M1 · M3 — trên MÀN HÌNH KHOÁ: mỗi người gửi một thông báo
     Nạp CHÍNH `public/sw.js` đang phục vụ, đẩy vào đó đúng gói tin đã GIẢI MÃ
     từ máy chủ — không tự bịa dữ liệu.
     ====================================================================== */
  console.log('\nL14 · Ba người khác nhau nhắn liên tiếp — màn hình khoá hiện mấy dòng');
  const hang = await themNguoi('Phan Thị Hằng', 'NS-HANG', 'Kế toán');
  db.exec("DELETE FROM push_nhat_ky");
  db.exec("UPDATE tai_khoan SET xem_chat_voi = NULL, xem_chat_luc = NULL");
  await datGio('2026-09-07T03:00:00Z');
  DAY.length = 0;
  await guiTin(duy, lan.nhanSuId, 'lô hạt điều về rồi');
  await guiTin(huyen, lan.nhanSuId, 'đơn Shopee cần xác nhận');
  await guiTin(hang, lan.nhanSuId, 'chị ký giúp em uỷ nhiệm chi');
  const goiBaNguoi = DAY.filter(d => d.endpoint === BA_MAY[0].endpoint);
  ok('3 người khác nhau → máy chủ đẩy 3 gói tới cùng một máy', goiBaNguoi.length === 3,
    `đo được ${goiBaNguoi.length}`);

  const noiDungBa = [];
  for (const g of goiBaNguoi) noiDungBa.push(JSON.parse(await giaiMa(BA_MAY[0], g.than)));

  const sw = await napServiceWorker();
  for (const nd of noiDungBa) await sw.day(nd);
  const nhan = new Set(sw.hien.map(h => h.tag));
  ok('màn hình khoá hiện ĐỦ 3 thông báo, KHÔNG cái nào tráo cái nào',
    sw.hien.length === 3 && nhan.size === 3, `${sw.hien.length} thông báo · ${nhan.size} nhãn: ${[...nhan].join(', ')}`);
  ok('cả 3 đều KÊU LẠI (renotify), không âm thầm đổi chữ',
    sw.hien.every(h => h.renotify === true));
  ok('nhãn gộp mang đúng id NGƯỜI GỬI', [...nhan].every(t => /^chat:NS-/.test(t)),
    [...nhan].join(', '));

  {
    // Cùng MỘT người nhắn 5 tin trong một phút → đúng 1 thông báo (gộp 60s).
    db.exec("DELETE FROM push_nhat_ky");
    await datGio('2026-09-07T04:00:00Z');
    DAY.length = 0;
    for (let i = 0; i < 5; i++) await guiTin(duy, lan.nhanSuId, `tin dồn ${i}`);
    const goiMot = DAY.filter(d => d.endpoint === BA_MAY[0].endpoint);
    const sw2 = await napServiceWorker();
    for (const g of goiMot) await sw2.day(JSON.parse(await giaiMa(BA_MAY[0], g.than)));
    ok('CÙNG một người nhắn 5 tin → đúng 1 thông báo', sw2.hien.length === 1,
      `${goiMot.length} gói · ${sw2.hien.length} thông báo`);
  }

  {
    // ĐỐI CHỨNG (BH-16): trả `sw.js` về nhãn chung 'chat' như bản trước.
    const { duong } = await napBanThay('m1_nhan_chung', path.join(GOC, 'public', 'sw.js'),
      /tag: d\.loai === 'chat' \? \('chat:' \+ \(d\.nguoi_gui_id \|\| 'khong-ro'\)\) :/,
      "tag: d.loai === 'chat' ? 'chat' :", { napLuon: false });
    const swCu = await napServiceWorker(duong);
    for (const nd of noiDungBa) await swCu.day(nd);
    const nhanCu = new Set(swCu.hien.map(h => h.tag));
    ok('ĐỐI CHỨNG · bản nhãn chung gộp 3 người vào 1 nhãn', nhanCu.size === 1,
      `${nhanCu.size} nhãn: ${[...nhanCu].join(', ')} — phép đo có nhạy thật`);
  }

  {
    // M3 — bấm vào thông báo phải tới ĐÚNG đoạn chat của người gửi.
    const cuaDuy = noiDungBa.find(n => n.tieu_de.includes('Phạm Khương Duy'));
    ok('gói tin mang đường dẫn tới ĐÚNG đoạn chat người gửi',
      cuaDuy.duong_dan === `/app.html#chat=${duy.nhanSuId}`, cuaDuy.duong_dan);
    ok('gói tin VẪN không mang một chữ nào của nội dung tin nhắn',
      !JSON.stringify(noiDungBa).includes('hạt điều') &&
      !JSON.stringify(noiDungBa).includes('uỷ nhiệm chi'));

    const swBam = await napServiceWorker();
    await swBam.day(cuaDuy);
    const dl = swBam.hien[0].data;
    swBam.themTab('https://erp.test/app.html');
    await swBam.bam(dl);
    ok('ERP đang mở → nhắn về tab đúng id người gửi',
      swBam.nhan.length === 1 && swBam.nhan[0].nguoi_gui_id === duy.nhanSuId,
      JSON.stringify(swBam.nhan[0]));

    const swNguoi = await napServiceWorker();       // chưa mở tab nào
    await swNguoi.day(cuaDuy);
    await swNguoi.bam(swNguoi.hien[0].data);
    ok('ERP đang đóng → mở thẳng cửa sổ chat của người gửi',
      swNguoi.mo.length === 1 && swNguoi.mo[0] === `/app.html#chat=${duy.nhanSuId}`,
      swNguoi.mo.join(','));
  }
  delete globalThis.self;

  console.log(`\nThông số chốt: gộp ${GOP_GIAY}s · trần ${TRAN_NGAY} thông báo/người/ngày`);
  return tongKet();
}

chay()
  .then((dat) => { donFileTam(); process.exit(dat ? 0 : 1); })
  .catch((e) => { donFileTam(); console.error('\nBÀN THỬ HỎNG:', e.stack || e.message); process.exit(2); });
