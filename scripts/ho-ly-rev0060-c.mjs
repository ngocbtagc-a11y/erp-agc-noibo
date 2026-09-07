/* ==========================================================================
   HỒ LY — BÀN ĐO VÒNG 2 REV-0060 (tấn công bản vá, không đo lại cái đã đo)
   Chạy: node scripts/ho-ly-rev0060-c.mjs
   ========================================================================== */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modun = m => import(pathToFileURL(path.join(GOC, 'src', m)).href);
const nap = await modun('nap-du-lieu.js');
const docb = await modun('doc-bang.js');

let dat = 0, truot = 0; const hong = [];
function ok(ten, dung, ct = '') {
  if (dung) { dat++; console.log(`  ✓ ${ten}${ct ? ' — ' + ct : ''}`); }
  else { truot++; hong.push(ten + (ct ? ` — ${ct}` : '')); console.log(`  ✗ ${ten}${ct ? ' — ' + ct : ''}`); }
}
const tin = s => console.log('    · ' + s);

function tachCau(sql) {
  const sach = sql.replace(/\r\n?/g, '\n').split('\n').map(d => d.replace(/--.*$/, '')).join('\n');
  const cau = []; let ht = '', than = false;
  for (const mau of sach.split(/(;)/)) {
    ht += mau;
    if (mau !== ';') {
      if (/\bBEGIN\b/i.test(mau)) than = true;
      if (/\bEND\b\s*$/i.test(mau.trim())) than = false;
      continue;
    }
    if (than) continue;
    const c = ht.trim(); if (c && c !== ';') cau.push(c); ht = '';
  }
  if (ht.trim()) cau.push(ht.trim());
  return cau;
}
function dungCsdl() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = OFF;');
  for (const ten of ['them-kho.sql', 'them-khoa-danhmuc-nen.sql', 'them-nap-ghep-cot.sql',
                     'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql']) {
    const duong = path.join(GOC, 'migrations', ten);
    if (!existsSync(duong)) { console.error('thiếu ' + ten); process.exit(2); }
    for (const c of tachCau(readFileSync(duong, 'utf8'))) {
      try { db.exec(c); } catch (e) {
        if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e;
      }
    }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
           INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-NGOC','Bùi Thị Ngọc');`);
  return db;
}
function dungD1(db, hong = null) {
  const idx = new Map();
  const demIdx = b => {
    if (!idx.has(b)) idx.set(b, Number(db.prepare(
      `SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND tbl_name=?`).get(b).n));
    return idx.get(b);
  };
  const bangCua = sql => {
    const m = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([a-z_]+)/i) || sql.match(/UPDATE\s+([a-z_]+)/i);
    return m ? m[1] : null;
  };
  const moi = (sql, tso = []) => ({
    bind: (...a) => moi(sql, a),
    async run() {
      if (hong && hong(sql)) throw new Error('D1 network error');
      const kq = db.prepare(sql).run(...tso);
      const bang = bangCua(sql), dong = Number(kq.changes || 0);
      return { success: true, meta: { rows_written: bang ? dong * (1 + demIdx(bang)) : dong, changes: dong } };
    },
    async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...tso) }; }
  });
  return { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
}
const B = s => new TextEncoder().encode(s);
const PHIEN = { nhan_su_id: 'NS-NGOC', ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin' };
const GHEP_SP = { ma_sku: 0, ten: 1 };
const GHEP_TON = { ma_sku: 0, so_luong: 1 };
const GHEP_TON_LO = { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 };
function csvSP(n, tien = 'SP') {
  let s = 'Mã SKU,Tên sản phẩm\n';
  for (let i = 1; i <= n; i++) s += `${tien}-${String(i).padStart(5, '0')},"Hạt điều ${i}"\n`;
  return B(s);
}
function csvTon(n, sl = 100, tien = 'SP') {
  let s = 'Mã SKU,Số lượng tồn\n';
  for (let i = 1; i <= n; i++) s += `${tien}-${String(i).padStart(5, '0')},${sl}\n`;
  return B(s);
}
async function ghi(env, bytes, ghep, maDich = 'san_pham', tenTep = 'thu.csv', them = {}) {
  const bang = await nap.docBangTuByte(bytes, tenTep);
  return nap.ghiThat(env, them.phien || PHIEN, { bang, ghep, maDich, tenTep, ...them });
}
const NGAY = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const soSo = db => db.prepare('SELECT so_dong FROM d1_ghi_ngay WHERE ngay = ?').get(NGAY())?.so_dong ?? null;
const tonCua = db => Number(db.prepare(
  `SELECT COALESCE(SUM(CASE WHEN loai='nhap' THEN so_luong ELSE -so_luong END),0) AS t
     FROM giao_dich_kho`).get().t);

/* ========================================================================== */
console.log('\n══ A. LƯỚI CHỐNG NẠP LẠI — TẤN CÔNG CHIỀU "LỌT" ══');

async function caLot(ten, lamFileHai, kiem = 'chan') {
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(50), GHEP_SP);
  await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton_goc.csv');
  const t1 = tonCua(db);
  const { bytes, ten: tenTep, ghep } = lamFileHai();
  const kq = await ghi(env, bytes, ghep || GHEP_TON, 'ton_kho', tenTep || 'lan2.csv');
  const t2 = tonCua(db);
  const chan = kq.ma === 409;
  if (kiem === 'chan') ok(ten, chan && t2 === t1, chan ? `409, tồn giữ ${t2}` : `LỌT — tồn ${t1} → ${t2}`);
  else ok(ten, !chan, chan ? `bị chặn 409` : `cho qua, tồn ${t1} → ${t2}`);
  return { t1, t2, kq };
}

// 1. đổi thứ tự dòng
await caLot('Đổi THỨ TỰ dòng rồi nạp lại → phải chặn', () => {
  let s = 'Mã SKU,Số lượng tồn\n';
  for (let i = 50; i >= 1; i--) s += `SP-${String(i).padStart(5, '0')},100\n`;
  return { bytes: B(s), ten: 'Ton_daoNguoc.csv' };
});

// 2. đổi hoa/thường mã hàng
await caLot('Đổi HOA/THƯỜNG mã hàng rồi nạp lại → phải chặn', () => {
  let s = 'Mã SKU,Số lượng tồn\n';
  for (let i = 1; i <= 50; i++) s += `sp-${String(i).padStart(5, '0')},100\n`;
  return { bytes: B(s), ten: 'Ton_thuong.csv' };
});

// 3. thêm một dòng trắng
await caLot('Thêm DÒNG TRẮNG rồi nạp lại → phải chặn', () => {
  let s = 'Mã SKU,Số lượng tồn\n\n';
  for (let i = 1; i <= 50; i++) s += `SP-${String(i).padStart(5, '0')},100\n\n`;
  return { bytes: B(s), ten: 'Ton_goc.csv' };
});

// 4. đổi tên file
await caLot('Đổi TÊN FILE rồi nạp lại → phải chặn', () => ({
  bytes: csvTon(50), ten: 'Ton_goc (bản sao).csv'
}));

// 5. sửa một số lượng
await caLot('Sửa MỘT con số rồi nạp lại cả file → phải chặn', () => {
  let s = 'Mã SKU,Số lượng tồn\n';
  for (let i = 1; i <= 50; i++) s += `SP-${String(i).padStart(5, '0')},${i === 7 ? 101 : 100}\n`;
  return { bytes: B(s), ten: 'Ton_sua1o.csv' };
});

// 6. nạp file con (một nửa file cũ)
await caLot('Nạp FILE CON (nửa file cũ) → phải chặn', () => ({
  bytes: csvTon(25), ten: 'Ton_mot_nua.csv'
}));

// 7. hai file KHÁC NHAU cùng chứa một mã
await caLot('Hai file khác hẳn nhau nhưng CHUNG 1 mã → phải chặn', () => {
  let s = 'Mã SKU,Số lượng tồn\n';
  s += 'SP-00001,999\n';   // mã đã nạp
  return { bytes: B(s), ten: 'Ton_file_khac.csv' };
});

console.log('\n══ B. LƯỚI CHỐNG NẠP LẠI — TẤN CÔNG CHIỀU "CHẶN OAN" ══');

// 8. tick xác nhận có thật sự qua được không (và đúng số không)
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(50), GHEP_SP);
  await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton1.csv');
  const t1 = tonCua(db);
  const kq = await ghi(env, csvTon(50, 30), GHEP_TON, 'ton_kho', 'DotHang2.csv', { xacNhanTrung: true });
  const t2 = tonCua(db);
  ok('Kho nhập THẬT cùng mã, Sếp tick xác nhận → nạp được', !kq.loi, kq.loi ? String(kq.ma) : 'ok');
  ok('Và cộng đúng số đợt hàng mới (5.000 + 1.500)', t2 === t1 + 1500, `${t1} → ${t2}`);
}

// 9. hai đợt hàng cùng mã KHÁC LÔ
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(10), GHEP_SP);
  const f1 = B('Mã SKU,Số lượng tồn,Số lô,Hạn sử dụng\n' +
    Array.from({ length: 10 }, (_, i) => `SP-${String(i + 1).padStart(5, '0')},100,LO-A,2027-01-01`).join('\n') + '\n');
  const f2 = B('Mã SKU,Số lượng tồn,Số lô,Hạn sử dụng\n' +
    Array.from({ length: 10 }, (_, i) => `SP-${String(i + 1).padStart(5, '0')},100,LO-B,2027-06-01`).join('\n') + '\n');
  await ghi(env, f1, GHEP_TON_LO, 'ton_kho', 'LoA.csv');
  const kq = await ghi(env, f2, GHEP_TON_LO, 'ton_kho', 'LoB.csv');
  tin(`đợt 2 khác lô (LO-B, hạn khác) → ${kq.ma || 'cho qua'}`);
  ok('Hai đợt CÙNG MÃ KHÁC LÔ vẫn bị chặn (Sếp phải tick mỗi lần nhập hàng)',
     kq.ma === 409, String(kq.ma));   // ghi nhận hiện trạng, xem nhận xét
}

// 10. nạp lại SAU KHI đã dùng đường lùi
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(50), GHEP_SP);
  const k1 = await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton1.csv');
  await nap.huyLuotNap(env, PHIEN, k1.phieu_id);
  const kq = await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton1.csv');
  ok('Gỡ lượt cũ rồi nạp lại thì KHÔNG bị chặn oan', !kq.loi, kq.loi ? String(kq.ma) : 'ok');
  ok('Và tồn ra đúng 5.000 (không nhân đôi)', tonCua(db) === 5000, String(tonCua(db)));
}

/* ========================================================================== */
console.log('\n══ C. ĐƯỜNG LÙI `huyLuotNap` — SOI NHƯ MÃ NGUY HIỂM ══');

// 11. phiếu tay cùng ngày cùng mã
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(20), GHEP_SP);
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
              SELECT 'pn_tay_01', id, 'nhap', 7, 'Nhập tay', 'NS-NGOC' FROM san_pham`).run();
  const tonTay = tonCua(db);
  const k = await ghi(env, csvTon(20), GHEP_TON, 'ton_kho', 'Ton.csv');
  await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  ok('Gỡ lượt nạp KHÔNG đụng phiếu nhập tay CÙNG NGÀY CÙNG MÃ',
     tonCua(db) === tonTay, `${tonTay} → ${tonCua(db)}`);
}

// 12. có XUẤT KHO phát sinh sau lượt nạp rồi mới gỡ
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(20), GHEP_SP);
  const k = await ghi(env, csvTon(20, 100), GHEP_TON, 'ton_kho', 'Ton.csv');
  const truoc = tonCua(db);
  // Kinh doanh bán hàng: xuất 80 mỗi mã (dựa trên tồn vừa nạp)
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
              SELECT 'px_ban_01', id, 'xuat', 80, 'Xuất bán', 'NS-NGOC' FROM san_pham`).run();
  const sauXuat = tonCua(db);
  const g = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  const sauGo = tonCua(db);
  tin(`tồn: nạp ${truoc} → xuất bán còn ${sauXuat} → gỡ lượt nạp còn ${sauGo}`);
  tin(`câu ERP nói với Sếp: "${g.tin}"`);
  const am = Number(db.prepare(
    `SELECT COUNT(*) AS n FROM (
        SELECT san_pham_id, SUM(CASE WHEN loai='nhap' THEN so_luong ELSE -so_luong END) AS t
          FROM giao_dich_kho GROUP BY san_pham_id) WHERE t < 0`).get().n);
  ok('Gỡ lượt nạp khi ĐÃ CÓ XUẤT KHO: ERP phải cản hoặc ít nhất CẢNH BÁO tồn âm',
     !(sauGo < 0) && am === 0, `tồn tổng ${sauGo}, ${am} mã tồn ÂM — mà câu báo vẫn nói "Tồn kho đã tính lại theo sổ"`);
}

// 13. gỡ lần hai · gỡ phiếu tay · không quyền
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(10), GHEP_SP);
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
              SELECT 'pn_tay_02', id, 'nhap', 5, 'Nhập tay', 'NS-NGOC' FROM san_pham LIMIT 1`).run();
  const k = await ghi(env, csvTon(10), GHEP_TON, 'ton_kho', 'Ton.csv');
  const g1 = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  const g2 = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  const g3 = await nap.huyLuotNap(env, PHIEN, 'pn_tay_02');
  const g4 = await nap.huyLuotNap(env, { nhan_su_id: 'X', vai_tro: 'cskh' }, k.phieu_id);
  ok('Gỡ lần đầu OK', !!g1.ok);
  ok('Gỡ lần hai → 409', g2.ma === 409, String(g2.ma));
  ok('Gỡ phiếu NHẬP TAY → 404 (không đi qua cửa này được)', g3.ma === 404, String(g3.ma));
  ok('Vai không có quyền kho → 403', g4.ma === 403, String(g4.ma));
  const conTay = Number(db.prepare(`SELECT COUNT(*) AS n FROM giao_dich_kho WHERE phieu_id='pn_tay_02'`).get().n);
  ok('Phiếu tay vẫn nguyên sau mọi thao tác gỡ', conTay === 1, String(conTay));
}

// 14. AI gỡ được lượt nạp của NGƯỜI KHÁC
{
  const db = dungCsdl(), env = dungD1(db);
  db.prepare(`INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-PT','Bạn part-time kho')`).run();
  await ghi(env, csvSP(30), GHEP_SP);
  const k = await ghi(env, csvTon(30), GHEP_TON, 'ton_kho', 'TonDauKy_Sep.csv');
  const partTime = { nhan_su_id: 'NS-PT', ho_ten: 'Bạn part-time kho', vai_tro: 'nhan_vien_kho' };
  const g = await nap.huyLuotNap(env, partTime, k.phieu_id);
  tin(`part-time gỡ lượt nạp của Sếp → ${g.ok ? 'GỠ ĐƯỢC ' + g.da_go_dong + ' dòng' : g.ma}`);
  ok('Lượt nạp của người khác KHÔNG bị người thứ ba gỡ tuỳ ý',
     !g.ok, g.ok ? `nhan_vien_kho gỡ trắng ${g.da_go_dong} dòng của Sếp, tồn về ${tonCua(db)}` : String(g.ma));
}

// 15. gỡ giữa chừng mà NGÃ
{
  const db = dungCsdl();
  let batDau = false;
  const env = dungD1(db, sql => batDau && /UPDATE lich_su_thay_doi_nen/i.test(sql));
  const env0 = dungD1(db);
  await ghi(env0, csvSP(20), GHEP_SP);
  const k = await ghi(env0, csvTon(20), GHEP_TON, 'ton_kho', 'Ton.csv');
  batDau = true;
  let loi = null;
  try { await nap.huyLuotNap(env, PHIEN, k.phieu_id); } catch (e) { loi = e; }
  const conDong = Number(db.prepare(`SELECT COUNT(*) AS n FROM giao_dich_kho WHERE phieu_id=?`).get(k.phieu_id).n);
  const vet = db.prepare(`SELECT gia_tri_moi FROM lich_su_thay_doi_nen WHERE ban_ghi_id=?`).get(k.phieu_id);
  tin(`ngã ở bước đánh dấu "đã gỡ": lỗi=${loi ? loi.message : 'không'} · dòng sổ cái còn ${conDong} · vết=${JSON.stringify(vet?.gia_tri_moi)}`);
  ok('Gỡ ngã giữa chừng: KHÔNG để sổ cái và sổ ghi vết lệch nhau',
     !(conDong === 0 && vet && vet.gia_tri_moi !== 'đã gỡ'),
     conDong === 0 && vet?.gia_tri_moi !== 'đã gỡ'
       ? `dữ liệu XOÁ RỒI mà vết vẫn ghi "${vet?.gia_tri_moi}" — danh sách lượt nạp hiện sai, gỡ lại lần nữa vẫn "thành công" mà không gỡ gì`
       : 'ok');
  const g2 = await nap.huyLuotNap(env0, PHIEN, k.phieu_id);
  ok('Và câu lỗi khi gỡ ngã phải là câu tiếng người, không ném thẳng lỗi máy',
     loi === null || /[À-ỹ]/.test(String(loi.message)),
     loi ? String(loi.message).slice(0, 80) : 'không ném');
  tin(`gỡ lại lần nữa → ${g2.ok ? 'ok, gỡ ' + g2.da_go_dong + ' dòng' : g2.ma}`);
}

/* ========================================================================== */
console.log('\n══ D. ĐẶT CHỖ HẠN MỨC ══');

// 16. ngã ở đoạn NGOÀI try (ghi vết phiếu) → chỗ đặt có rò không
{
  const db = dungCsdl();
  const env0 = dungD1(db);
  await ghi(env0, csvSP(50), GHEP_SP);
  const truoc = soSo(db) || 0;
  const env = dungD1(db, sql => /INSERT INTO lich_su_thay_doi_nen/i.test(sql));
  let loi = null;
  try { await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton.csv'); } catch (e) { loi = e; }
  const sau = soSo(db) || 0;
  const dong = Number(db.prepare(`SELECT COUNT(*) AS n FROM giao_dich_kho`).get().n);
  tin(`ngã ở dòng GHI VẾT (nằm NGOÀI try): lỗi=${loi ? loi.constructor.name : 'không'} · sổ ngày ${truoc} → ${sau} · dòng sổ cái ${dong}`);
  ok('Ngã ở bước ghi vết: chỗ đặt hạn mức phải được TRẢ LẠI',
     sau === truoc, `rò ${sau - truoc} lượt hạn mức giữ suốt ngày mà không ghi được dòng nào`);
  ok('Và lỗi phải là LoiGhiNua (câu tiếng người), không phải lỗi D1 trần trụi',
     !loi || loi.name === 'LoiGhiNua', loi ? `${loi.name}: ${loi.message}` : 'không ném');
}

// 17. đặt chỗ rồi ghi ÍT hơn dự tính
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(50), GHEP_SP);
  const truoc = soSo(db) || 0;
  const k = await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton.csv');
  const sau = soSo(db) || 0;
  tin(`dự tính ${nap.duTinhGhi('ton_kho', new Array(50), [])} · thật ${k.luot_ghi_that} · sổ ngày +${sau - truoc}`);
  ok('Sổ ngày cộng ĐÚNG lượt ghi thật, phần đặt thừa được trả lại',
     sau - truoc === k.luot_ghi_that, `sổ +${sau - truoc} · thật ${k.luot_ghi_that}`);
}

/* ========================================================================== */
console.log('\n══ E. LỚP (b) DÒ TRÙNG THEO MÃ — TRẦN 50.000 ══');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(5), GHEP_SP);
  // Giả cảnh đã có nhiều lượt nạp trong quá khứ: mỗi lượt là một phieu_id mới
  const sp = db.prepare('SELECT id FROM san_pham').all().map(r => r.id);
  const chen = db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
                           VALUES (?, ?, 'nhap', 1, 'Nạp từ file “cũ”', 'NS-NGOC')`);
  for (let l = 0; l < 12000; l++) for (const s of sp) chen.run('pn_cu_' + l, s, );
  const cap = Number(db.prepare(
    `SELECT COUNT(*) AS n FROM (SELECT DISTINCT san_pham_id, phieu_id FROM giao_dich_kho
      WHERE loai='nhap' AND ghi_chu LIKE 'Nạp từ file%')`).get().n);
  tin(`kho chỉ có ${sp.length} mã, nhưng số cặp (mã × phiếu) đã là ${cap.toLocaleString('vi-VN')} — câu dò LIMIT 50000 đếm CẶP, không đếm MÃ`);
  const kq = await ghi(env, csvTon(5), GHEP_TON, 'ton_kho', 'Ton_lai.csv');
  ok('Lớp (b) vẫn bắt được trùng khi số cặp (mã × phiếu) vượt 50.000',
     kq.ma === 409, kq.ma === 409 ? '409' : `LỌT — tồn ${tonCua(db)}`);
}

/* ========================================================================== */
console.log('\n══ F. .XLSX CHỌN BẢNG — CA XẤU ══');
{
  // Dựng .xlsx tối giản bằng zip tay
  const { deflateRawSync } = await import('node:zlib');
  function zip(files) {
    const enc = new TextEncoder(); const loc = []; const cen = []; let off = 0;
    for (const [ten, noi] of files) {
      const nb = enc.encode(ten); const db2 = enc.encode(noi); const cb = deflateRawSync(db2);
      let crc = ~0; for (const b of db2) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1)); } crc = ~crc >>> 0;
      const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8);
      h.writeUInt32LE(crc, 14); h.writeUInt32LE(cb.length, 18); h.writeUInt32LE(db2.length, 22); h.writeUInt16LE(nb.length, 26);
      loc.push(h, nb, cb);
      const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
      c.writeUInt32LE(crc, 16); c.writeUInt32LE(cb.length, 20); c.writeUInt32LE(db2.length, 24); c.writeUInt16LE(nb.length, 28);
      c.writeUInt32LE(off, 42); cen.push(c, nb);
      off += 30 + nb.length + cb.length;
    }
    const cbuf = Buffer.concat(cen);
    const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10);
    e.writeUInt32LE(cbuf.length, 12); e.writeUInt32LE(off, 16);
    return new Uint8Array(Buffer.concat([Buffer.concat(loc), cbuf, e]));
  }
  const sheetXml = rows => `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
  const hang = (r, cells) => `<row r="${r}">${cells.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${r}" t="inlineStr"><is><t>${v}</t></is></c>`).join('')}</row>`;
  function lamXlsx(bangs) {   // [{ten, hidden, rows:[[..]]}]
    const files = [
      ['[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`],
      ['_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${bangs.map((b, i) => `<sheet name="${b.ten}" sheetId="${i + 1}" ${b.hidden ? 'state="hidden" ' : ''}r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${bangs.map((b, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`]
    ];
    bangs.forEach((b, i) => files.push([`xl/worksheets/sheet${i + 1}.xml`,
      `<?xml version="1.0"?>` + sheetXml(b.rows.map((r, j) => hang(j + 1, r)).join(''))]));
    return zip(files);
  }

  // F1. file 1 bảng — có bắt chọn thừa không
  {
    const x = lamXlsx([{ ten: 'Danh mục', rows: [['Mã SKU', 'Tên sản phẩm'], ['SP-1', 'Hạt điều']] }]);
    const b = await nap.docBangTuByte(x, 'motbang.xlsx');
    tin(`1 bảng: dsBang=${JSON.stringify(b.dsBang)} · canhBao=${JSON.stringify(b.canhBao)}`);
    ok('File 1 bảng KHÔNG bắt Sếp chọn bảng (không cảnh báo thừa)',
       !(b.canhBao || []).some(c => /bảng/i.test(c) && /chọn lại bảng/i.test(c)),
       JSON.stringify(b.canhBao));
  }
  // F2. hai bảng TRÙNG TÊN
  {
    const x = lamXlsx([
      { ten: 'Data', rows: [['Mã SKU', 'Tên'], ['SP-1', 'A']] },
      { ten: 'Data', rows: [['Mã SKU', 'Tên'], ['SP-2', 'B'], ['SP-3', 'C']] }]);
    const b0 = await nap.docBangTuByte(x, 'trungten.xlsx');
    const b1 = await nap.docBangTuByte(x, 'trungten.xlsx', { bangChon: 1 });
    tin(`trùng tên: ${JSON.stringify(b0.dsBang)} · chọn bảng 2 → ${b1.soDong ?? b1.dong?.length} dòng, tên "${b1.tenBang}"`);
    ok('Hai bảng TRÙNG TÊN vẫn phân biệt được (số dòng khác nhau để Sếp nhận ra)',
       b0.dsBang && b0.dsBang.length === 2 && b0.dsBang[0].so_dong !== b0.dsBang[1].so_dong,
       JSON.stringify(b0.dsBang));
  }
  // F3. bảng ẨN
  {
    const x = lamXlsx([
      { ten: 'Nháp cũ', hidden: true, rows: [['Mã SKU', 'Tên'], ['XX-1', 'rác']] },
      { ten: 'Chính thức', rows: [['Mã SKU', 'Tên'], ['SP-1', 'Hạt điều']] }]);
    const b = await nap.docBangTuByte(x, 'coban.xlsx');
    tin(`bảng ẩn: dsBang=${JSON.stringify(b.dsBang)} · đang đọc "${b.tenBang}" · cột=${JSON.stringify(b.cot)}`);
    ok('Bảng ẨN: ERP phải nói rõ nó ẩn, hoặc không mặc định đọc bảng ẩn',
       (b.dsBang || []).some(s => s.an === true || s.hidden === true) ||
       (b.canhBao || []).some(c => /ẩn/i.test(c)) || b.tenBang !== 'Nháp cũ',
       `mặc định đọc "${b.tenBang}" — không đánh dấu bảng nào đang ẩn`);
  }
  // F4. bảng RỖNG hoàn toàn là bảng đầu
  {
    const x = lamXlsx([
      { ten: 'Trống', rows: [] },
      { ten: 'Số liệu', rows: [['Mã SKU', 'Tên'], ['SP-1', 'Hạt điều']] }]);
    let loi = null, b = null;
    try { b = await nap.docBangTuByte(x, 'rong.xlsx'); } catch (e) { loi = e; }
    tin(`bảng đầu rỗng: ${loi ? 'ném lỗi — ' + String(loi.message).slice(0, 90) : 'dsBang=' + JSON.stringify(b.dsBang)}`);
    ok('Bảng đầu RỖNG: câu lỗi vẫn phải chỉ đường sang bảng có số liệu',
       loi ? /bảng/i.test(loi.message) : !!(b.dsBang || []).length,
       loi ? String(loi.message).slice(0, 110) : 'không ném');
  }
}

/* ========================================================================== */
console.log('\n' + '='.repeat(70));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (hong.length) { console.log('\nCHỖ TRƯỢT:'); hong.forEach(h => console.log('  ✗ ' + h)); }
process.exit(truot ? 1 : 0);
