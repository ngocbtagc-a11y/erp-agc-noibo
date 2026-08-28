/* ==========================================================================
   BÀN THỬ D1 THẬT — dựng SQLite thật trong bộ nhớ, nạp schema.sql + TOÀN BỘ
   migrations thật, rồi cho mã sản phẩm chạy y nguyên trên đó.
   ---------------------------------------------------------------------------
   VÌ SAO PHẢI CÓ FILE NÀY (BH-34): bàn thử cũ
   `scripts/tu-kiem-nhac-cong-viec.mjs` KHỚP CHUỖI SQL BẰNG TAY — nó không
   chạy câu SQL nào cả, nên mọi lỗi nằm trong mệnh đề `WHERE` đều lọt. Ở đây
   mọi câu SQL của `src/` đi qua SQLite thật; sai `WHERE` là sai kết quả.

   BA MỐI NỐI, KHÔNG HƠN:
     ① `env.DB` — vỏ D1 mỏng bọc `node:sqlite` (prepare/bind/all/first/run/batch)
     ② ĐỒNG HỒ — `datDongHo()` đổi CẢ `new Date()` của JS lẫn `'now'` của SQL
        về cùng một mốc. Ghi đè `Date.now` KHÔNG đủ (BH-17) nên thay cả lớp
        `Date`; `'now'` trong SQL được thay bằng đúng mốc đó để hai đồng hồ
        không trôi lệch nhau.
     ③ `guiTelegram` — chặn ở tầng `fetch` toàn cục, KHÔNG sửa mã sản phẩm.

   Ngoài ba mối nối trên, KHÔNG có dòng nào của `src/` bị thay.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---- ② ĐỒNG HỒ ---------------------------------------------------------- */

const DateThat = globalThis.Date;
let MOC_GIA = null;                       // ms UTC, hoặc null = đồng hồ thật

/** Đặt đồng hồ cho CẢ JS lẫn SQL. Truyền chuỗi ISO có hậu tố 'Z' (giờ UTC). */
export function datDongHo(isoUTC) {
  MOC_GIA = isoUTC === null ? null : new DateThat(isoUTC).getTime();
}
export function dongHoBayGio() {
  return MOC_GIA === null ? DateThat.now() : MOC_GIA;
}

class DateGiaLap extends DateThat {
  constructor(...a) {
    if (a.length === 0) super(dongHoBayGio());
    else super(...a);
  }
  static now() { return dongHoBayGio(); }
}
globalThis.Date = DateGiaLap;

/** Mốc UTC dạng SQLite hiểu được: 'YYYY-MM-DD HH:MM:SS'. */
function mocSQL() {
  return new DateThat(dongHoBayGio()).toISOString().slice(0, 19).replace('T', ' ');
}

/* Thay ĐÚNG chuỗi `'now'` trong câu SQL bằng mốc giả. Chỉ đụng đối số đồng hồ
   của datetime()/date()/strftime(); mọi mệnh đề WHERE khác giữ nguyên từng ký
   tự — đây là chỗ BH-34 đòi phải chạy thật chứ không được khớp tay. */
function thayDongHo(sql) {
  if (MOC_GIA === null) return sql;
  return sql.replace(/'now'/g, `'${mocSQL()}'`);
}

/* ---- ① VỎ D1 ------------------------------------------------------------ */

function chuanHoaThamSo(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number' && !Number.isInteger(v)) return v;
  return v;
}

class D1Cau {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new D1Cau(this.db, this.sql, args.map(chuanHoaThamSo)); }
  _st() { return this.db.prepare(thayDongHo(this.sql)); }
  async all() {
    const r = this._st().all(...this.args);
    return { results: r, success: true, meta: {} };
  }
  async first(cot) {
    const r = this._st().get(...this.args);
    if (r === undefined) return null;
    return cot === undefined ? r : (r[cot] ?? null);
  }
  async run() {
    const r = this._st().run(...this.args);
    return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
  }
  async raw() {
    const st = this._st();
    st.setReadBigInts?.(false);
    const rows = st.all(...this.args);
    return rows.map(h => Object.values(h));
  }
}

class D1 {
  constructor(db) { this.db = db; }
  prepare(sql) { return new D1Cau(this.db, sql); }
  async batch(cacCau) { const kq = []; for (const c of cacCau) kq.push(await c.run()); return kq; }
  async exec(sql) { this.db.exec(thayDongHo(sql)); return { count: 0, duration: 0 }; }
}

/* ---- Nạp schema + migrations THẬT --------------------------------------- */

/** Cắt một file .sql thành từng câu. Có xử lý khối BEGIN…END của TRIGGER —
 *  cắt thô theo dấu `;` sẽ băng đôi trigger thành hai mảnh vô nghĩa. */
export function cacCauSQL(sql) {
  const s = sql.replace(/--[^\n]*/g, '');
  const cau = [];
  let hienTai = '', trongChuoi = false, sauBegin = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'") { trongChuoi = !trongChuoi; hienTai += c; continue; }
    if (trongChuoi) { hienTai += c; continue; }
    hienTai += c;
    const tren = hienTai.toUpperCase();
    if (/\bBEGIN\s*$/.test(tren) && /CREATE\s+TRIGGER/.test(tren)) sauBegin++;
    if (c === ';') {
      if (sauBegin > 0) {
        if (/\bEND\s*;\s*$/.test(tren)) { sauBegin = 0; cau.push(hienTai.trim()); hienTai = ''; }
        continue;
      }
      cau.push(hienTai.trim()); hienTai = '';
    }
  }
  if (hienTai.trim()) cau.push(hienTai.trim());
  return cau.filter(c => c.replace(/;/g, '').trim());
}

const BO_QUA_DUOC = /duplicate column name|already exists|index .* already exists/i;

/** DB thật: schema.sql + mọi file trong migrations/, chạy nhiều vòng cho tới
 *  khi không còn tiến triển (thứ tự phụ thuộc giữa các file tự gỡ). */
export function dungDB() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = OFF;');

  const chay = (sql, ten) => {
    const conLai = [];
    for (const c of cacCauSQL(sql)) {
      try { db.exec(c); }
      catch (e) {
        if (BO_QUA_DUOC.test(e.message)) continue;
        conLai.push({ c, ten, loi: e.message });
      }
    }
    return conLai;
  };

  let hangDoi = chay(readFileSync(path.join(GOC, 'schema.sql'), 'utf8'), 'schema.sql');
  const thuMuc = path.join(GOC, 'migrations');
  /* BỎ QUA `lui-*.sql` — ĐÂY LÀ MỘT LỖI THẬT, KHÔNG PHẢI DỌN DẸP.
     Bản trước nạp MỌI file .sql theo thứ tự bảng chữ cái, mà 'lui-' đứng
     TRƯỚC 'them-'. Các câu của file lùi vấp lỗi "no such table" lúc đầu →
     rơi vào hàng đợi gỡ phụ thuộc → và được CHẠY LẠI SAU KHI file xuôi đã
     tạo xong bảng. Kết quả: `ALTER TABLE gop_y DROP COLUMN risk` (và 14 cột
     cổng duyệt khác) chạy thật. Đo được trên bản này: `gop_y` dựng ra THIẾU
     risk, current_owner, duyet_cap1_luc, duyet_owner_luc; và bảng
     `gop_y_lich_su` KHÔNG TỒN TẠI. Bàn đo nào dựng DB bằng hàm này đều đang đo trên một lược đồ
     không giống bản thật.
     File lùi là nút hoàn tác, chạy tay khi cần — không bao giờ thuộc đường
     dựng xuôi. */
  /* SẮP XẾP BỎ ĐUÔI `.sql` — cũng là một lỗi thật đã đo được.
     Sắp cả tên file thì '.' (46) đứng SAU '-' (45), nên `them-gopy.sql` chạy
     SAU `them-gopy-lichsu-tacnhan.sql` — tức là file dựng lại sổ nhật ký
     chạy trước file tạo ra cái sổ. Hậu quả đo được trên bản chưa sửa: hai
     lệnh RENAME chạy lệch nhau và bảng `gop_y_lich_su` BIẾN MẤT khỏi DB thử.
     Bỏ đuôi rồi mới so thì tên ngắn (file gốc) luôn đứng trước tên dài
     (file mở rộng nó) — đúng thứ tự phụ thuộc thật. */
  const laFileLui = (f) => /^lui-/.test(f);
  const khongDuoi = (f) => f.replace(/\.sql$/, '');
  for (const f of readdirSync(thuMuc).filter(f => f.endsWith('.sql') && !laFileLui(f))
                    .sort((a, b) => khongDuoi(a).localeCompare(khongDuoi(b), 'en'))) {
    hangDoi = hangDoi.concat(chay(readFileSync(path.join(thuMuc, f), 'utf8'), f));
  }
  // Vòng lặp gỡ phụ thuộc: ALTER TABLE của file A cần bảng do file B tạo.
  for (let vong = 0; vong < 6 && hangDoi.length; vong++) {
    const truoc = hangDoi.length;
    const conLai = [];
    for (const m of hangDoi) {
      try { db.exec(m.c); }
      catch (e) {
        if (BO_QUA_DUOC.test(e.message)) continue;
        conLai.push({ ...m, loi: e.message });
      }
    }
    hangDoi = conLai;
    if (hangDoi.length === truoc) break;
  }
  return { db, d1: new D1(db), conLoi: hangDoi };
}

/* ---- ③ Chặn mạng: Telegram không được ra Internet trong bàn thử ---------- */

export const TELEGRAM = [];
/* TELEGRAM_CT — cùng những tin ấy nhưng GIỮ CẢ `chat_id`. Từ REV-0030, một bí
   mật (mật khẩu tạm của ERP Owner) đi Telegram tới CHAT RIÊNG của Sếp, còn
   tin "[Bảo mật] ai vừa khôi phục cho ai" đi CHAT NHÓM chung. Bàn đo phải
   phân biệt được hai cái đó, không thì phép đo "không rò ra nhóm chung" là
   phép đo giả. `TELEGRAM` (chỉ text) giữ nguyên cho mọi bàn đo cũ. */
export const TELEGRAM_CT = [];
const fetchThat = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes('api.telegram.org')) {
    let than = {};
    try { than = JSON.parse(init?.body || '{}'); } catch { than = {}; }
    TELEGRAM.push(than.text || '');
    TELEGRAM_CT.push({ chatId: String(than.chat_id ?? ''), text: than.text || '' });
    return new Response('{"ok":true}', { status: 200 });
  }
  return fetchThat(url, init);
};

/* ---- env của Worker ----------------------------------------------------- */

export function dungEnv(d1, them = {}) {
  return {
    DB: d1,
    ASSETS: { fetch: async () => new Response('', { status: 200 }) },
    TELEGRAM_BOT_TOKEN: 'thu', TELEGRAM_CHAT_ID: '1',
    ...them
  };
}

/* ---- Phiên đăng nhập THẬT (đi qua đúng hàm băm token của auth.js) -------- */

export async function taoPhienThat(env, taiKhoanId) {
  const { taoPhien } = await import('../src/auth.js');
  const { token } = await taoPhien(env.DB, taiKhoanId);
  return token;
}

/** Gọi worker.fetch() THẬT với cookie phiên thật. Tên cookie lấy THẲNG từ
 *  `auth.js` — gõ tay 'phien' là 401 hết lượt và bàn thử lại tưởng "đã chặn
 *  đúng", đúng kiểu phép đo lúc nào cũng đạt mà BH-16 cấm. */
const { TEN_COOKIE } = await import('../src/auth.js');
export async function goiAPI(worker, env, duongDan, token, init = {}) {
  const req = new Request(`https://erp.test${duongDan}`, {
    ...init,
    headers: { ...(init.headers || {}), Cookie: `${TEN_COOKIE}=${token}` }
  });
  const res = await worker.fetch(req, env);
  let than = null;
  try { than = JSON.parse(await res.text()); } catch { /* không phải JSON */ }
  return { status: res.status, than };
}

/* Bịt log của mã sản phẩm khi chạy cron. ĐẾM ĐỘ SÂU chứ không lưu-rồi-trả:
   bốn lượt cron chạy chồng nhau (ca đo L6) thì lượt kết thúc sau cùng sẽ trả
   về đúng cái hàm rỗng của lượt trước, và cả bàn thử im tiếng từ đó trở đi —
   chính bẫy này đã nuốt mất một nửa bảng kết quả ở lần chạy đầu. */
const LOG_THAT = { error: console.error, warn: console.warn, log: console.log };
let sauIm = 0;
function imLang(bat) {
  sauIm += bat ? 1 : -1;
  if (bat && sauIm === 1) { console.error = () => {}; console.warn = () => {}; console.log = () => {}; }
  if (!bat && sauIm === 0) Object.assign(console, LOG_THAT);
}

/** Gọi worker.scheduled() THẬT (đi qua ctx.waitUntil như Cloudflare). */
export async function goiCron(worker, env) {
  const cho = [];
  imLang(true);
  try {
    await worker.scheduled({ scheduledTime: dongHoBayGio(), cron: '*/5 * * * *' }, env,
      { waitUntil: (p) => cho.push(p) });
    await Promise.all(cho);
  } finally { imLang(false); }
}

/* ---- Tiện ích đo -------------------------------------------------------- */

export function tinNhac(db, loai = null) {
  const dk = loai ? ` AND loai = '${loai}'` : '';
  return db.prepare(
    `SELECT id, loai, nguoi_nhan_id, noi_dung, tao_luc FROM thong_bao
      WHERE loai LIKE 'cv_%'${dk} ORDER BY id`
  ).all();
}

export function xoaTin(db) { db.exec("DELETE FROM thong_bao"); }

/* ---- Cột mốc kiểm: đếm ĐẠT / TRƯỢT ------------------------------------- */

let dat = 0, truot = 0;
export function ok(nhan, dieuKien, chiTiet = '') {
  if (dieuKien) { dat++; console.log(`  ✅ ${nhan}${chiTiet ? ' — ' + chiTiet : ''}`); }
  else { truot++; console.log(`  ❌ ${nhan}${chiTiet ? ' — ' + chiTiet : ''}`); }
  return !!dieuKien;
}
export function tongKet() {
  console.log(`\n${'='.repeat(72)}\nĐẠT ${dat} · TRƯỢT ${truot}`);
  return truot === 0;
}
