/* ==========================================================================
   MẨU DÒ HỒ LY · REV-0060 VÒNG 4 — SOI `dieuChinhKho` NHƯ MÃ NGUY HIỂM NHẤT
   ---------------------------------------------------------------------------
   `dieuChinhKho` là CỬA DUY NHẤT trong ERP ghi thẳng một con số vào sổ cái kho
   mà không có chứng từ mua/bán đứng sau. Bàn này KHÔNG tin lời khai — nó dựng
   CSDL thật từ `migrations/`, gọi thẳng `src/kho.js`, và đo:
     ① số học ở mọi ca (0 · âm sẵn · nhiều lô · thập phân · rất lớn · không lô)
     ② hai luật cứng (dấu trừ bị từ chối · tồn mã LẪN lô đều ≥ 0)
     ③ quyền khi gọi THẲNG API
     ④ ghi vết
     ⑤ đồng thời
   In số đo thô, KHÔNG kết luận thay người đọc. Thoát 0 luôn — đây là mẩu dò.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kho = await import(pathToFileURL(path.join(GOC, 'src', 'kho.js')).href);
const TOI = 'NS-NGOC';

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

let db;
function dungDb() {
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = OFF;');
  for (const t of ['them-kho.sql', 'them-danhmuc-nen.sql', 'them-khoa-danhmuc-nen.sql',
                   'them-nap-ghep-cot.sql', 'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql']) {
    for (const c of tachCau(readFileSync(path.join(GOC, 'migrations', t), 'utf8'))) {
      try { db.exec(c); } catch (e) { if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e; }
    }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
           INSERT OR IGNORE INTO nhan_su VALUES ('${TOI}','Bùi Thị Ngọc');`);
}

const moi = (sql, tso = []) => ({
  bind: (...a) => moi(sql, a),
  async run() { const k = db.prepare(sql).run(...tso); return { success: true, meta: { rows_written: Number(k.changes || 0) } }; },
  async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
  async all() { return { results: db.prepare(sql).all(...tso) }; }
});
const env = { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
const P = v => ({ nhan_su_id: TOI, ho_ten: 'Bùi Thị Ngọc', vai_tro: v || 'admin' });

const tonLo = id => Number(db.prepare(`SELECT COALESCE(SUM(so_luong),0) t FROM giao_dich_kho WHERE lo_hang_id=?`).get(id).t);
const tonMa = id => Number(db.prepare(`SELECT COALESCE(SUM(so_luong),0) t FROM giao_dich_kho WHERE san_pham_id=?`).get(id).t);
async function goi(fn, ...a) { const r = await fn(env, ...a); return { ma: r.status, than: await r.json() }; }
const dc = (phien, body) => goi(kho.dieuChinhKho, phien, body);

function tieu(s) { console.log('\n' + '─'.repeat(74) + '\n' + s + '\n' + '─'.repeat(74)); }
const d = (k, v) => console.log(`   ${String(k).padEnd(46)} ${v}`);

/* ---------------------------------------------------------------------- */
tieu('① SỐ HỌC — máy tự tính chênh từ "tồn thật đếm được"');

dungDb();
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,danh_muc,don_vi,theo_doi_hsd,ton_toi_thieu)
            VALUES ('sp_lo','SP-LO','Hạnh nhân Mỹ 500g','Hạt','túi',1,5),
                   ('sp_ko','SP-KO','Túi zip 10x15','Bao bì','cái',0,0)`).run();
db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES
            ('lo_a','sp_lo','LO-A','2026-10-01'),
            ('lo_b','sp_lo','LO-B','2026-11-01'),
            ('lo_c','sp_lo','LO-C',NULL)`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id) VALUES
            ('px1','sp_lo','lo_a','xuat',-100,'${TOI}'),
            ('pn1','sp_lo','lo_b','nhap',100,'${TOI}'),
            ('pn2','sp_lo','lo_c','nhap',40,'${TOI}'),
            ('pn3','sp_ko',NULL,'nhap',30,'${TOI}')`).run();
d('dựng: lô A / B / C', `${tonLo('lo_a')} / ${tonLo('lo_b')} / ${tonLo('lo_c')} · tồn mã sp_lo = ${tonMa('sp_lo')}`);

const LY = 'kiểm kê 07/09 tại kho Hà Nội';
for (const [ten, body] of [
  ['lô ÂM −100 → đếm thật 0',   { san_pham_id: 'sp_lo', lo_hang_id: 'lo_a', ton_thuc: 0, ly_do: LY }],
  ['tồn hiện 0 (lô A) → 12',    { san_pham_id: 'sp_lo', lo_hang_id: 'lo_a', ton_thuc: 12, ly_do: LY }],
  ['lô hết hạn C (HSD null) 40→7', { san_pham_id: 'sp_lo', lo_hang_id: 'lo_c', ton_thuc: 7, ly_do: LY }],
  ['mã KHÔNG theo lô 30 → 25',  { san_pham_id: 'sp_ko', ton_thuc: 25, ly_do: LY }],
  ['bằng đúng số đang ghi',     { san_pham_id: 'sp_ko', ton_thuc: 25, ly_do: LY }]
]) {
  const r = await dc(P(), body);
  d(ten, `HTTP ${r.ma} · ${r.than.ok ? `chênh ${r.than.chenh_lech} · ${r.than.ton_truoc}→${r.than.ton_sau}` : r.than.loi.slice(0, 70)}`);
}
d('sau loạt trên: lô A / B / C', `${tonLo('lo_a')} / ${tonLo('lo_b')} / ${tonLo('lo_c')} · tồn mã = ${tonMa('sp_lo')}`);

tieu('①b SỐ THẬP PHÂN và SỐ RẤT LỚN — ô nhập "số tồn thật"');
for (const v of ['5.7', '0,5', '1.000', '2 000', '1e3', '  12  ', '007',
                 '99999999999999999999', '9007199254740993', '12abc', '+5', '-5', '', '   ', 'NaN']) {
  const r = await dc(P(), { san_pham_id: 'sp_ko', ton_thuc: v, ly_do: LY });
  d(`ton_thuc = ${JSON.stringify(v)}`,
    r.than.ok ? `HTTP ${r.ma} ⇒ NHẬN, sổ ghi ton_sau = ${r.than.ton_sau} (chênh ${r.than.chenh_lech})`
              : `HTTP ${r.ma} ⇒ từ chối`);
  if (r.than.ok) { // kéo về lại 25 cho lượt sau
    db.prepare(`DELETE FROM giao_dich_kho WHERE phieu_id=?`).run(r.than.phieu_id);
  }
}
d('kiểu KHÁC chuỗi/số', '');
for (const v of [5, 0, -5, 5.7, true, null, undefined, ['7'], { a: 1 }]) {
  const r = await dc(P(), { san_pham_id: 'sp_ko', ton_thuc: v, ly_do: LY });
  d(`ton_thuc = ${JSON.stringify(v) ?? String(v)} (${typeof v})`,
    r.than.ok ? `HTTP ${r.ma} ⇒ NHẬN, ton_sau = ${r.than.ton_sau}` : `HTTP ${r.ma} ⇒ từ chối`);
  if (r.than.ok) db.prepare(`DELETE FROM giao_dich_kho WHERE phieu_id=?`).run(r.than.phieu_id);
}

/* ---------------------------------------------------------------------- */
tieu('② HAI LUẬT CỨNG — tồn MÃ lẫn LÔ đều ≥ 0 sau điều chỉnh');

dungDb();
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_lo','SP-LO','Hạnh nhân','túi',1)`).run();
db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES
            ('lo_a','sp_lo','LO-A','2026-10-01'), ('lo_b','sp_lo','LO-B','2026-11-01')`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id) VALUES
            ('pn_a','sp_lo','lo_a','nhap',100,'${TOI}'), ('pn_b','sp_lo','lo_b','nhap',10,'${TOI}'),
            ('px_x','sp_lo',NULL,'xuat',-105,'${TOI}')`).run();
d('dựng: lô A=100 · lô B=10 · một phiếu xuất KHÔNG lô −105', `tồn mã = ${tonMa('sp_lo')}`);
let r = await dc(P(), { san_pham_id: 'sp_lo', lo_hang_id: 'lo_a', ton_thuc: 0, ly_do: LY });
d('chỉnh lô A 100→0 (tồn mã 5 sẽ thành −95)', `HTTP ${r.ma} · ${r.than.ok ? 'CHO QUA' : r.than.loi.slice(0, 95)}`);
d('sau: lô A / tồn mã', `${tonLo('lo_a')} / ${tonMa('sp_lo')}`);

tieu('②b CA "CHỈNH MÃ NÀY LÀM ÂM LÔ KIA" — hàng theo dõi HSD, KHÔNG chọn lô');
dungDb();
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_lo','SP-LO','Hạnh nhân','túi',1)`).run();
db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES
            ('lo_a','sp_lo','LO-A','2026-10-01'), ('lo_b','sp_lo','LO-B','2026-11-01')`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id) VALUES
            ('px_a','sp_lo','lo_a','xuat',-100,'${TOI}'), ('pn_b','sp_lo','lo_b','nhap',100,'${TOI}')`).run();
d('dựng lại đúng cảnh CHẶN-ⓐ: lô A=−100 · lô B=100', `tồn mã = ${tonMa('sp_lo')}`);
d('lời khai trong mã (kho.js:448-450)', '"với hàng có lô thì BẮT chọn lô"');
r = await dc(P(), { san_pham_id: 'sp_lo', ton_thuc: 0, ly_do: 'kiểm kê: mã này ngoài kho không còn gì' });
d('gọi KHÔNG gửi lo_hang_id, hàng theo_doi_hsd=1', `HTTP ${r.ma} · ${r.than.ok ? 'CHO QUA — KHÔNG bắt chọn lô' : r.than.loi.slice(0, 80)}`);
d('sau: lô A / lô B / tồn mã',
  `${tonLo('lo_a')} / ${tonLo('lo_b')} / ${tonMa('sp_lo')}`);
{
  const { results } = await (moi(`SELECT l.id, COALESCE(SUM(g.so_luong),0) ton FROM lo_hang l
      LEFT JOIN giao_dich_kho g ON g.lo_hang_id=l.id WHERE l.san_pham_id='sp_lo' GROUP BY l.id`)).all();
  d('kiểm luật cứng #2 sau khi lập phiếu', results.map(x => `${x.id}=${x.ton}`).join(' · ') +
    `  ⇒ còn lô ÂM? ${results.some(x => x.ton < 0) ? 'CÓ' : 'không'}`);
}
/* Hệ quả đo qua đúng cửa ERP: tồn mã nói một đằng, xuatKho làm một nẻo. */
dungDb();
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_lo','SP-LO','Hạnh nhân','túi',1)`).run();
db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES ('lo_a','sp_lo','LO-A','2026-10-01')`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id)
            VALUES ('pn_a','sp_lo','lo_a','nhap',10,'${TOI}')`).run();
r = await dc(P(), { san_pham_id: 'sp_lo', ton_thuc: 500, ly_do: 'kiểm kê thấy thêm hàng ngoài kho' });
d('chỉnh MÃ (không lô) 10 → 500 trên hàng có lô', `HTTP ${r.ma} · ${r.than.ok ? 'CHO QUA' : r.than.loi.slice(0, 70)}`);
{
  const ds = await goi(kho.danhSachSanPham, P());
  d('màn Kho vận hiện tồn', String(ds.than.san_pham[0].ton));
  const x = await goi(kho.xuatKho, P(), { san_pham_id: 'sp_lo', so_luong: 100 });
  d('xuatKho(100) qua đúng cửa ERP', `HTTP ${x.ma} · ${x.than.ok ? 'CHO QUA' : x.than.loi}`);
}

/* ---------------------------------------------------------------------- */
tieu('③ QUYỀN — gọi THẲNG API `dieuChinhKho` với từng vai');
dungDb();
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_ko','SP-KO','Túi zip','cái',0)`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,loai,so_luong,nguoi_id) VALUES ('pn','sp_ko','nhap',50,'${TOI}')`).run();
for (const v of ['admin', 'quan_ly_kho', 'nhan_vien_kho', 'van_hanh_san', 'ke_toan_truong',
                 'nguoi_dung', 'admin_backup', 'hcns', 'cskh', 'nv_test', '']) {
  const t0 = tonMa('sp_ko');
  const rr = await dc(P(v), { san_pham_id: 'sp_ko', ton_thuc: 1, ly_do: LY });
  d(`vai ${v || '(rỗng)'}`, `HTTP ${rr.ma} · tồn ${t0}→${tonMa('sp_ko')}`);
  if (rr.than.ok) db.prepare(`DELETE FROM giao_dich_kho WHERE phieu_id=?`).run(rr.than.phieu_id);
}
/* Vai kép: nguoi_dung + vi_tri */
for (const vt of ['quan_ly_kho', 'nhan_vien_kho']) {
  const rr = await dc({ nhan_su_id: TOI, vai_tro: 'nguoi_dung', vi_tri_cong_viec: vt }, { san_pham_id: 'sp_ko', ton_thuc: 1, ly_do: LY });
  d(`vai kép nguoi_dung + ${vt}`, `HTTP ${rr.ma}`);
  if (rr.than.ok) db.prepare(`DELETE FROM giao_dich_kho WHERE phieu_id=?`).run(rr.than.phieu_id);
}

/* ---------------------------------------------------------------------- */
tieu('④ GHI VẾT — ai · lúc nào · lý do · trước/sau, và đọc lại được không');
dungDb();
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_ko','SP-KO','Túi zip','cái',0)`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,loai,so_luong,nguoi_id) VALUES ('pn','sp_ko','nhap',50,'${TOI}')`).run();
r = await dc(P(), { san_pham_id: 'sp_ko', ton_thuc: 38, ly_do: 'hàng vỡ 12 cái khi bốc xếp 07/09' });
{
  const row = db.prepare(`SELECT * FROM giao_dich_kho WHERE loai='dieu_chinh'`).get();
  d('dòng sổ cái', JSON.stringify(row));
  const ls = await goi(kho.lichSu, P(), 'sp_ko', 30);
  d('đọc lại qua lichSu()', JSON.stringify(ls.than.lich_su.find(x => x.loai === 'dieu_chinh')));
  const n = Number(db.prepare(`SELECT COUNT(*) n FROM lich_su_thay_doi_nen WHERE bang='giao_dich_kho'`).get().n);
  d('có ghi vào lich_su_thay_doi_nen không?', n ? `có (${n})` : 'KHÔNG — chỉ có ghi_chu trong sổ cái');
  const bc = await goi(kho.baoCaoXNT, P(), '2020-01-01', '2030-12-31');
  d('báo cáo XNT cột điều chỉnh', JSON.stringify(bc.than.bang[0]));
}
d('lý do 4 ký tự', (await dc(P(), { san_pham_id: 'sp_ko', ton_thuc: 1, ly_do: 'vỡ' })).ma);
d('lý do toàn dấu cách', (await dc(P(), { san_pham_id: 'sp_ko', ton_thuc: 1, ly_do: '        ' })).ma);
d('lý do 5 ký tự vô nghĩa "aaaaa"', (await dc(P(), { san_pham_id: 'sp_ko', ton_thuc: 1, ly_do: 'aaaaa' })).ma);

/* ---------------------------------------------------------------------- */
tieu('⑤ ĐỒNG THỜI — hai người điều chỉnh CÙNG MỘT LÔ cùng lúc');
dungDb();
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_lo','SP-LO','Hạnh nhân','túi',1)`).run();
db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES ('lo_a','sp_lo','LO-A','2026-10-01')`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id)
            VALUES ('pn_a','sp_lo','lo_a','nhap',100,'${TOI}')`).run();
d('trước: lô A / tồn mã', `${tonLo('lo_a')} / ${tonMa('sp_lo')}`);
{
  const [x, y] = await Promise.all([
    dc(P(), { san_pham_id: 'sp_lo', lo_hang_id: 'lo_a', ton_thuc: 0, ly_do: 'anh Duy đếm: hết sạch' }),
    dc(P(), { san_pham_id: 'sp_lo', lo_hang_id: 'lo_a', ton_thuc: 0, ly_do: 'chị Hằng đếm: hết sạch' })
  ]);
  d('người 1 / người 2', `HTTP ${x.ma} (${x.than.ok ? 'qua' : 'chặn'}) / HTTP ${y.ma} (${y.than.ok ? 'qua' : 'chặn'})`);
  d('SAU: lô A / tồn mã', `${tonLo('lo_a')} / ${tonMa('sp_lo')}  ⇒ ${tonLo('lo_a') < 0 ? '❗LÔ ÂM' : 'không âm'}`);
  d('số dòng dieu_chinh đã ghi', db.prepare(`SELECT COUNT(*) n FROM giao_dich_kho WHERE loai='dieu_chinh'`).get().n);
}

/* ---------------------------------------------------------------------- */
tieu('⑥ CÁC CA LẶT VẶT');
dungDb();
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd,dang_ban) VALUES
            ('sp_1','SP-1','Còn bán','cái',0,1), ('sp_2','SP-2','Đã ngừng bán','cái',0,0)`).run();
db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo) VALUES ('lo_x','sp_1','LO-X')`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,loai,so_luong,nguoi_id) VALUES
            ('p1','sp_1','nhap',10,'${TOI}'), ('p2','sp_2','nhap',10,'${TOI}')`).run();
d('mã đã NGỪNG BÁN', (await dc(P(), { san_pham_id: 'sp_2', ton_thuc: 3, ly_do: LY })).ma);
d('lô của mã KHÁC', (await dc(P(), { san_pham_id: 'sp_2', lo_hang_id: 'lo_x', ton_thuc: 3, ly_do: LY })).ma);
d('lô không tồn tại', (await dc(P(), { san_pham_id: 'sp_1', lo_hang_id: 'lo_zzz', ton_thuc: 3, ly_do: LY })).ma);
d('mã không tồn tại', (await dc(P(), { san_pham_id: 'sp_zzz', ton_thuc: 3, ly_do: LY })).ma);
d('gán lô cho hàng KHÔNG theo dõi HSD (sp_1 theo_doi_hsd=0)',
  JSON.stringify((await dc(P(), { san_pham_id: 'sp_1', lo_hang_id: 'lo_x', ton_thuc: 7, ly_do: LY })).than).slice(0, 120));
d('⇒ tồn mã sp_1 / tồn lô lo_x', `${tonMa('sp_1')} / ${tonLo('lo_x')}`);

console.log('\n(mẩu dò — luôn thoát 0)\n');
