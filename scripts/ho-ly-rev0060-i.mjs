/* ==========================================================================
   MẨU DÒ HỒ LY · REV-0060 VÒNG 4 — DỰNG LẠI ⓐ, VÀ SOI ③ ④ HAI CHIỀU
   ---------------------------------------------------------------------------
   KHÔNG tin lời khai. Dựng lại đúng cảnh vòng 3 dựng, đo qua đúng cửa ERP,
   rồi gài thêm những ca người xây CHƯA dựng:
     · ba lô · lô có HSD BẰNG NHAU · gỡ hai lượt chồng lên CÙNG MỘT lô
     · hàng KHÔNG theo dõi HSD (`theo_doi_hsd = 0`)
     · ③ chặn oan: đổi tên file rồi gõ TÊN MỚI
     · ④ có thành KHOÁ CHẾT không (ngã sau khi đặt dấu)
   Thoát 0 — mẩu dò, không phải cổng.
   ========================================================================== */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nap = await import(pathToFileURL(path.join(GOC, 'src', 'nap-du-lieu.js')).href);
const kho = await import(pathToFileURL(path.join(GOC, 'src', 'kho.js')).href);

function tachCau(sql) {
  const sach = sql.replace(/\r\n?/g, '\n').split('\n').map(d => d.replace(/--.*$/, '')).join('\n');
  const cau = []; let ht = '', than = false;
  for (const mau of sach.split(/(;)/)) {
    ht += mau;
    if (mau !== ';') { if (/\bBEGIN\b/i.test(mau)) than = true; if (/\bEND\b\s*$/i.test(mau.trim())) than = false; continue; }
    if (than) continue; const c = ht.trim(); if (c && c !== ';') cau.push(c); ht = '';
  }
  if (ht.trim()) cau.push(ht.trim());
  return cau;
}
function dungCsdl() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = OFF;');
  for (const t of ['them-kho.sql', 'them-khoa-danhmuc-nen.sql', 'them-nap-ghep-cot.sql',
                   'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql']) {
    for (const c of tachCau(readFileSync(path.join(GOC, 'migrations', t), 'utf8'))) {
      try { db.exec(c); } catch (e) { if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e; }
    }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
           INSERT OR IGNORE INTO nhan_su VALUES ('NS-NGOC','Bùi Thị Ngọc');`);
  return db;
}
function dungD1(db, hong = null) {
  const idx = new Map();
  const demIdx = b => { if (!idx.has(b)) idx.set(b, Number(db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND tbl_name=?`).get(b).n)); return idx.get(b); };
  const bangCua = s => { const m = s.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([a-z_]+)/i) || s.match(/UPDATE\s+([a-z_]+)/i); return m ? m[1] : null; };
  const moi = (sql, tso = []) => ({
    bind: (...a) => moi(sql, a),
    async run() {
      if (hong && hong(sql)) throw new Error('D1 network error');
      const k = db.prepare(sql).run(...tso); const b = bangCua(sql), d = Number(k.changes || 0);
      return { success: true, meta: { rows_written: b ? d * (1 + demIdx(b)) : d, changes: d } };
    },
    async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...tso) }; }
  });
  return { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
}
const B = s => new TextEncoder().encode(s);
const PHIEN = { nhan_su_id: 'NS-NGOC', ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin' };
const GHEP_SP = { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4, theo_doi_hsd: 5 };
async function ghi(env, bytes, ghep, maDich, tenTep, them = {}) {
  const bang = await nap.docBangTuByte(bytes, tenTep);
  return nap.ghiThat(env, them.phien || PHIEN, { bang, ghep, maDich, tenTep, ...them });
}
const d = (k, v) => console.log(`   ${String(k).padEnd(52)} ${v}`);
const tieu = s => console.log('\n' + '─'.repeat(78) + '\n' + s + '\n' + '─'.repeat(78));
const tonMa = (db, id) => Number(db.prepare(`SELECT COALESCE(SUM(so_luong),0) t FROM giao_dich_kho WHERE san_pham_id=?`).get(id).t);
const cacLo = db => db.prepare(`SELECT l.id, l.so_lo, l.han_su_dung, COALESCE(SUM(g.so_luong),0) ton
    FROM lo_hang l LEFT JOIN giao_dich_kho g ON g.lo_hang_id=l.id GROUP BY l.id ORDER BY l.so_lo`).all()
  .map(x => `${x.so_lo}=${x.ton}`).join(' · ');
async function goi(env, fn, ...a) { const r = await fn(env, ...a); return { ma: r.status, than: await r.json() }; }

/* Dựng: SKU theo lô, nạp TỒN từ file (sinh lô), nhập tay một lô khác, xuất. */
async function dungCanh({ hsdNap, hsdTay, theoDoiHsd = 1, soLoNap = 'LO-A' }) {
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B(`Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu,Theo dõi hạn dùng\nSP-00001,Hạnh nhân Mỹ 500g,Hạt,túi,5,${theoDoiHsd ? 'x' : ''}\n`),
            GHEP_SP, 'san_pham', 'DanhMuc.csv');
  const kq = await ghi(env, B(`Mã SKU,Số lượng tồn,Số lô,Hạn sử dụng\nSP-00001,100,${soLoNap},${hsdNap}\n`),
                       { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 }, 'ton_kho', 'TonDauKy.csv');
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  await kho.nhapKho(env, PHIEN, { san_pham_id: spId, so_luong: 100, so_lo: 'LO-M', han_su_dung: hsdTay });
  return { db, env, spId, phieuNap: kq.phieu_id };
}

/* ====================================================================== */
tieu('ⓐ-1 DỰNG LẠI ĐÚNG CẢNH VÒNG 3 (HSD lệch, FEFO xác định) — đo qua cửa ERP');
{
  const { db, env, spId, phieuNap } = await dungCanh({ hsdNap: '2026-10-01', hsdTay: '2027-10-01' });
  d('sau nạp + nhập tay', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
  let x = await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 100 });
  d('xuất 100 (FEFO phải ăn LO-A)', `HTTP ${x.ma} · ${cacLo(db)} · tồn mã=${tonMa(db, spId)}`);
  const g = await nap.huyLuotNap(env, PHIEN, phieuNap);
  d('GỠ lượt nạp', g.loi ? `HTTP ${g.ma} · ${String(g.loi).slice(0, 130)}` : `CHO QUA (ok=${g.ok})`);
  d('sau khi gỡ', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
  x = await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 100 });
  d('xuatKho(100) — phải ăn lô M', `HTTP ${x.ma}`);
  x = await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 1 });
  d('xuatKho(1) tiếp — phải bị chặn', `HTTP ${x.ma}`);
  d('TỒN MÃ CUỐI', tonMa(db, spId));
}

tieu('ⓐ-2 KHÔNG CHẶN OAN — có lô mà CHƯA xuất gì thì vẫn gỡ được, lô mồ côi dọn theo');
{
  const { db, env, spId, phieuNap } = await dungCanh({ hsdNap: '2026-10-01', hsdTay: '2027-10-01' });
  d('trước khi gỡ', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
  const g = await nap.huyLuotNap(env, PHIEN, phieuNap);
  d('GỠ (chưa xuất gì)', g.loi ? `CHẶN OAN — HTTP ${g.ma} · ${String(g.loi).slice(0, 90)}` : `gỡ ${g.so_dong} dòng, ok`);
  d('sau khi gỡ', `${cacLo(db) || '(hết lô)'} · tồn mã = ${tonMa(db, spId)}`);
  d('lô mồ côi LO-A còn trong bảng lo_hang?',
    db.prepare(`SELECT COUNT(*) n FROM lo_hang WHERE so_lo='LO-A'`).get().n ? 'CÒN' : 'đã dọn');
}

tieu('ⓐ-3 HAI LÔ CÓ HSD BẰNG NHAU (FEFO không xác định thứ tự)');
{
  const { db, env, spId, phieuNap } = await dungCanh({ hsdNap: '2026-10-01', hsdTay: '2026-10-01' });
  await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 100 });
  d('sau xuất 100', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
  const g = await nap.huyLuotNap(env, PHIEN, phieuNap);
  d('GỠ', g.loi ? `HTTP ${g.ma} · ${String(g.loi).slice(0, 110)}` : `CHO QUA — gỡ ${g.so_dong} dòng`);
  d('sau', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
  const x = await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 100 });
  d('xuatKho(100) sau đó', `HTTP ${x.ma} ⇒ tồn mã = ${tonMa(db, spId)}`);
}

tieu('ⓐ-4 BA LÔ');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B(`Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu,Theo dõi hạn dùng\nSP-00001,Hạnh nhân,Hạt,túi,5,x\n`), GHEP_SP, 'san_pham', 'DM.csv');
  const kq = await ghi(env, B(`Mã SKU,Số lượng tồn,Số lô,Hạn sử dụng\nSP-00001,100,LO-A,2026-10-01\n`),
                       { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 }, 'ton_kho', 'Ton.csv');
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  await kho.nhapKho(env, PHIEN, { san_pham_id: spId, so_luong: 50, so_lo: 'LO-M', han_su_dung: '2027-01-01' });
  await kho.nhapKho(env, PHIEN, { san_pham_id: spId, so_luong: 70, so_lo: 'LO-N', han_su_dung: '2027-06-01' });
  await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 120 });   // ăn hết A + 20 của M
  d('sau xuất 120', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
  const g = await nap.huyLuotNap(env, PHIEN, kq.phieu_id);
  d('GỠ', g.loi ? `HTTP ${g.ma} · ${String(g.loi).slice(0, 140)}` : 'CHO QUA');
  d('sau', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
}

tieu('ⓐ-5 HÀNG **KHÔNG** THEO DÕI HSD (`theo_doi_hsd = 0`) — người xây khai mặc định là 1');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B(`Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu,Theo dõi hạn dùng\nSP-00002,Túi zip 10x15,Bao bì,cái,0,\n`), GHEP_SP, 'san_pham', 'DM.csv');
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00002'`).get().id;
  d('theo_doi_hsd trong CSDL', db.prepare(`SELECT theo_doi_hsd t FROM san_pham WHERE id=?`).get(spId).t);
  const kq = await ghi(env, B(`Mã SKU,Số lượng tồn\nSP-00002,100\n`), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'Ton.csv');
  await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 60 });
  d('sau nạp 100 + xuất 60', `tồn mã = ${tonMa(db, spId)} · lô: ${cacLo(db) || '(không lô)'}`);
  const g = await nap.huyLuotNap(env, PHIEN, kq.phieu_id);
  d('GỠ (gỡ đi là −60)', g.loi ? `HTTP ${g.ma} · ${String(g.loi).slice(0, 120)}` : 'CHO QUA ❗');
  d('tồn mã sau', tonMa(db, spId));
}

tieu('ⓐ-6 HAI LƯỢT NẠP CHỒNG LÊN CÙNG MỘT LÔ, gỡ lần lượt');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B(`Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu,Theo dõi hạn dùng\nSP-00001,Hạnh nhân,Hạt,túi,5,x\n`), GHEP_SP, 'san_pham', 'DM.csv');
  const k1 = await ghi(env, B(`Mã SKU,Số lượng tồn,Số lô,Hạn sử dụng\nSP-00001,100,LO-A,2026-10-01\n`), { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 }, 'ton_kho', 'Ton1.csv');
  const k2 = await ghi(env, B(`Mã SKU,Số lượng tồn,Số lô,Hạn sử dụng\nSP-00001,60,LO-A,2026-10-01\n`), { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 }, 'ton_kho', 'Ton2.csv',
                       { xacNhanTrung: true, xacNhanTenTep: 'Ton1.csv' });
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  d('hai lượt nạp', `k1=${k1.phieu_id || k1.loi?.slice(0, 60)} · k2=${k2.phieu_id || 'CHẶN: ' + String(k2.loi).slice(0, 60)}`);
  d('lô hiện có', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
  if (k2.phieu_id) {
    await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 130 });
    d('sau xuất 130', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
    const g1 = await nap.huyLuotNap(env, PHIEN, k1.phieu_id);
    d('gỡ lượt 1', g1.loi ? `HTTP ${g1.ma}` : 'CHO QUA');
    const g2 = await nap.huyLuotNap(env, PHIEN, k2.phieu_id);
    d('gỡ lượt 2', g2.loi ? `HTTP ${g2.ma}` : 'CHO QUA');
    d('cuối', `${cacLo(db)} · tồn mã = ${tonMa(db, spId)}`);
  }
}

/* ====================================================================== */
tieu('③ HAI CHIỀU — cửa "gõ lại tên file"');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B(`Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\nSP-00001,Hạnh nhân,Hạt,túi,5\n`), { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 }, 'san_pham', 'DM.csv');
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  const TON = B(`Mã SKU,Số lượng tồn\nSP-00001,1000\n`);
  await ghi(env, TON, { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'TonThang9.csv');
  d('nạp lần 1 xong, tồn mã', tonMa(db, spId));
  let k = await ghi(env, TON, { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'x', { xacNhanTrung: true, xacNhanTenTep: 'x' });
  d('GỌI THẲNG API, cả hai vế = "x"', k.loi ? `HTTP ${k.ma} CHẶN · tồn = ${tonMa(db, spId)}` : `❗CHO QUA · tồn = ${tonMa(db, spId)}`);
  d('câu báo chỉ đúng tên phải gõ?', String(k.loi || '').match(/GÕ LẠI TÊN FILE[^”]*“([^”]*)”/)?.[1] ?? '(không có)');
  k = await ghi(env, TON, { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'DoiTenRoi.csv', { xacNhanTrung: true, xacNhanTenTep: 'DoiTenRoi.csv' });
  d('CHẶN OAN? đổi tên file rồi gõ TÊN MỚI', k.loi ? `HTTP ${k.ma} CHẶN — phải gõ “${String(k.loi).match(/“([^”]*)”/g)?.join(',')}”` : 'cho qua');
  k = await ghi(env, TON, { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'DoiTenRoi.csv', { xacNhanTrung: true, xacNhanTenTep: 'TonThang9.csv' });
  d('gõ đúng tên LƯỢT TRƯỚC', k.loi ? `HTTP ${k.ma} CHẶN` : `cho qua · tồn = ${tonMa(db, spId)}`);
}

tieu('④ HAI NGƯỜI CÙNG BẤM GỠ HAI LƯỢT KHÁC NHAU');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B(`Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\nSP-00001,Hạnh nhân,Hạt,túi,5\n`), { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 }, 'san_pham', 'DM.csv');
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  const kA = await ghi(env, B(`Mã SKU,Số lượng tồn\nSP-00001,100\n`), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'A.csv');
  const kB = await ghi(env, B(`Mã SKU,Số lượng tồn\nSP-00001,100\n`), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'B.csv', { xacNhanTrung: true, xacNhanTenTep: 'A.csv' });
  await goi(env, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 50 });
  d('dựng: nạp A 100 · nạp B 100 · xuất 50', `tồn = ${tonMa(db, spId)}`);
  const [g1, g2] = await Promise.all([
    nap.huyLuotNap(env, PHIEN, kA.phieu_id),
    nap.huyLuotNap(env, { ...PHIEN, ho_ten: 'Phan Thị Hằng' }, kB.phieu_id)
  ]);
  d('anh Duy gỡ A / chị Hằng gỡ B', `${g1.loi ? 'HTTP ' + g1.ma : 'CHO QUA'} / ${g2.loi ? 'HTTP ' + g2.ma : 'CHO QUA'}`);
  d('tồn sau', tonMa(db, spId));
  const g3 = await nap.huyLuotNap(env, PHIEN, kA.phieu_id);
  d('bấm lại MỘT MÌNH lượt A', g3.loi ? `HTTP ${g3.ma} · ${String(g3.loi).slice(0, 80)}` : `gỡ được · tồn = ${tonMa(db, spId)}`);
  const g4 = await nap.huyLuotNap(env, PHIEN, kB.phieu_id);
  d('rồi gỡ nốt lượt B', g4.loi ? `HTTP ${g4.ma} · ${String(g4.loi).slice(0, 80)}` : `gỡ được · tồn = ${tonMa(db, spId)}`);
}

tieu('④b CÓ THÀNH KHOÁ CHẾT KHÔNG — ngã SAU khi đã đặt dấu "đã gỡ"');
{
  const db = dungCsdl();
  const env0 = dungD1(db);
  await ghi(env0, B(`Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\nSP-00001,Hạnh nhân,Hạt,túi,5\n`), { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 }, 'san_pham', 'DM.csv');
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  const kA = await ghi(env0, B(`Mã SKU,Số lượng tồn\nSP-00001,100\n`), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'A.csv');
  d('trước', `tồn = ${tonMa(db, spId)}`);
  /* Ngã ở lệnh XOÁ — dấu đã đặt, `traDauVe` cũng là UPDATE nên vẫn chạy được. */
  const envNga = dungD1(db, sql => /DELETE FROM giao_dich_kho/i.test(sql));
  const g = await nap.huyLuotNap(envNga, PHIEN, kA.phieu_id);
  d('gỡ mà D1 ngã ở lệnh DELETE', g.loi ? `HTTP ${g.ma} · ${String(g.loi).slice(0, 110)}` : 'báo ok');
  d('dấu trong sổ vết', db.prepare(`SELECT gia_tri_moi g FROM lich_su_thay_doi_nen WHERE ban_ghi_id=?`).get(kA.phieu_id)?.g);
  d('tồn', tonMa(db, spId));
  const g2 = await nap.huyLuotNap(env0, PHIEN, kA.phieu_id);
  d('bấm gỡ LẠI khi D1 đã lành', g2.loi ? `❗HTTP ${g2.ma} · ${String(g2.loi).slice(0, 100)}` : `gỡ được · tồn = ${tonMa(db, spId)}`);

  /* Ca xấu hơn: ngã ở chính `traDauVe` (dấu kẹt lại vĩnh viễn). */
  const kB = await ghi(env0, B(`Mã SKU,Số lượng tồn\nSP-00001,100\n`), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'B.csv');
  await goi(env0, kho.xuatKho, PHIEN, { san_pham_id: spId, so_luong: 100 });
  d('dựng lượt B rồi xuất hết', `tồn = ${tonMa(db, spId)}`);
  let lan = 0;
  const envNga2 = dungD1(db, sql => /UPDATE lich_su_thay_doi_nen/i.test(sql) && ++lan === 2);
  const g3 = await nap.huyLuotNap(envNga2, PHIEN, kB.phieu_id);
  d('gỡ (sẽ âm ⇒ phải trả dấu) mà lệnh TRẢ DẤU ngã', g3.loi ? `HTTP ${g3.ma}` : 'ok');
  d('dấu còn kẹt "đã gỡ"?', db.prepare(`SELECT gia_tri_moi g FROM lich_su_thay_doi_nen WHERE ban_ghi_id=?`).get(kB.phieu_id)?.g);
  const g4 = await nap.huyLuotNap(env0, PHIEN, kB.phieu_id);
  d('bấm lại khi D1 đã lành', g4.loi ? `❗HTTP ${g4.ma} · ${String(g4.loi).slice(0, 100)}` : 'gỡ được');
  d('còn lượt nào gỡ được nữa không / tồn', tonMa(db, spId));
}

console.log('\n(mẩu dò — luôn thoát 0)\n');
