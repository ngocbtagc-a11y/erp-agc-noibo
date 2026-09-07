/* Hồ Ly vòng 2 — chứng minh TRẦN 50.000 của lớp (b) là CẮT IM LẶNG.
   Cảnh thật: kho đã có nhiều lượt nạp cũ cho các mã KHÁC. Số CẶP (mã × phiếu)
   vượt 50.000. Câu dò không có ORDER BY nên cắt theo rowid — mã của file đang
   nạp nằm sau vạch cắt thì lớp (b) MÙ. */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nap = await import(pathToFileURL(path.join(GOC, 'src', 'nap-du-lieu.js')).href);
function tachCau(sql) {
  const sach = sql.replace(/\r\n?/g, '\n').split('\n').map(d => d.replace(/--.*$/, '')).join('\n');
  const cau = []; let ht = '', than = false;
  for (const mau of sach.split(/(;)/)) {
    ht += mau;
    if (mau !== ';') { if (/\bBEGIN\b/i.test(mau)) than = true; if (/\bEND\b\s*$/i.test(mau.trim())) than = false; continue; }
    if (than) continue; const c = ht.trim(); if (c && c !== ';') cau.push(c); ht = '';
  }
  if (ht.trim()) cau.push(ht.trim()); return cau;
}
function dungCsdl() {
  const db = new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys = OFF;');
  for (const t of ['them-kho.sql', 'them-khoa-danhmuc-nen.sql', 'them-nap-ghep-cot.sql', 'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql']) {
    const d = path.join(GOC, 'migrations', t); if (!existsSync(d)) { console.error('thiếu ' + t); process.exit(2); }
    for (const c of tachCau(readFileSync(d, 'utf8'))) { try { db.exec(c); } catch (e) { if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e; } }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
           INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-NGOC','Bùi Thị Ngọc');`);
  return db;
}
function dungD1(db) {
  const idx = new Map();
  const demIdx = b => { if (!idx.has(b)) idx.set(b, Number(db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND tbl_name=?`).get(b).n)); return idx.get(b); };
  const bangCua = s => { const m = s.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([a-z_]+)/i) || s.match(/UPDATE\s+([a-z_]+)/i); return m ? m[1] : null; };
  const moi = (sql, tso = []) => ({
    bind: (...a) => moi(sql, a),
    async run() { const k = db.prepare(sql).run(...tso); const b = bangCua(sql), d = Number(k.changes || 0); return { success: true, meta: { rows_written: b ? d * (1 + demIdx(b)) : d, changes: d } }; },
    async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...tso) }; }
  });
  return { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
}
const B = s => new TextEncoder().encode(s);
const PHIEN = { nhan_su_id: 'NS-NGOC', ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin' };
async function ghi(env, bytes, ghep, maDich, tenTep, them = {}) {
  const bang = await nap.docBangTuByte(bytes, tenTep);
  return nap.ghiThat(env, them.phien || PHIEN, { bang, ghep, maDich, tenTep, ...them });
}
const ton = db => Number(db.prepare('SELECT COALESCE(SUM(so_luong),0) AS t FROM giao_dich_kho').get().t);

const db = dungCsdl(), env = dungD1(db);
// 60 mã: 50 mã "cũ" (rác lịch sử) + 10 mã của file Sếp sắp nạp
let s = 'Mã SKU,Tên sản phẩm\n';
for (let i = 1; i <= 50; i++) s += `CU-${i},Hàng cũ ${i}\n`;
for (let i = 1; i <= 10; i++) s += `MOI-${i},Hàng mới ${i}\n`;
await ghi(env, B(s), { ma_sku: 0, ten: 1 }, 'san_pham', 'sp.csv');

// Sếp nạp tồn cho 10 mã MOI — lần 1
let t = 'Mã SKU,Số lượng tồn\n';
for (let i = 1; i <= 10; i++) t += `MOI-${i},100\n`;
const k1 = await ghi(env, B(t), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'TonMoi.csv');
console.log('Lần 1 nạp 10 mã MOI · tồn =', ton(db));

// SAU ĐÓ kho phát sinh nhiều lượt nạp file khác cho 50 mã CU
// (1.200 lượt × 50 mã = 60.000 cặp, chèn SAU nên rowid lớn hơn — nhưng
//  hàng của MOI có rowid NHỎ nên vẫn lọt vào 50.000 đầu.
//  Đảo lại cho đúng cảnh thật: dữ liệu cũ đứng TRƯỚC.)
console.log('\n— Cảnh 2: lịch sử nạp file của các mã KHÁC đứng TRƯỚC —');
const db2 = dungCsdl(), env2 = dungD1(db2);
let s2 = 'Mã SKU,Tên sản phẩm\n';
for (let i = 1; i <= 50; i++) s2 += `CU-${i},Hàng cũ ${i}\n`;
for (let i = 1; i <= 10; i++) s2 += `MOI-${i},Hàng mới ${i}\n`;
await ghi(env2, B(s2), { ma_sku: 0, ten: 1 }, 'san_pham', 'sp.csv');
const spCu = db2.prepare(`SELECT id FROM san_pham WHERE ma_sku LIKE 'CU-%'`).all().map(r => r.id);
const chen = db2.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
                          VALUES (?, ?, 'nhap', 1, 'Nạp từ file “lịch sử”', 'NS-NGOC')`);
for (let l = 0; l < 1100; l++) for (const id of spCu) chen.run('pn_lichsu_' + l, id);
const cap = db2.prepare(`SELECT COUNT(*) n FROM (SELECT DISTINCT san_pham_id, phieu_id FROM giao_dich_kho WHERE loai='nhap' AND ghi_chu LIKE 'Nạp từ file%')`).get().n;
console.log('   cặp (mã × phiếu) trong lịch sử:', cap.toLocaleString('vi-VN'), '(kho chỉ có 60 mã)');
const kA = await ghi(env2, B(t), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'TonMoi.csv');
console.log('   nạp lần 1 cho 10 mã MOI →', kA.ma || 'cho qua', '· tồn =', ton(db2));
const kB = await ghi(env2, B(t), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'TonMoi_bansao.csv');
console.log('   NẠP LẠI đúng file đó   →', kB.ma || 'CHO QUA', '· tồn =', ton(db2));
console.log('   ⇒', kB.ma === 409
  ? '✅ vẫn chặn (lớp (a) vân tay nội dung cứu)'
  : '❌ LỌT — tồn nhân đôi');

// Ca hiểm: vân tay khác (thêm 1 dòng mới) ⇒ chỉ còn lớp (b), mà (b) bị trần cắt
let t2 = 'Mã SKU,Số lượng tồn\n';
for (let i = 1; i <= 10; i++) t2 += `MOI-${i},100\n`;
t2 += 'CU-1,5\n';
const kC = await ghi(env2, B(t2), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'TonMoi_them1dong.csv');
console.log('\n   File cũ + 1 dòng mới (vân tay KHÁC ⇒ chỉ còn lớp (b)) →', kC.ma || 'CHO QUA', '· tồn =', ton(db2));
console.log('   ⇒', kC.ma === 409 ? '✅ lớp (b) còn thấy' : '❌ LỌT — lớp (b) mù vì trần 50.000 cắt mất phần đuôi, tồn cộng đôi âm thầm');
