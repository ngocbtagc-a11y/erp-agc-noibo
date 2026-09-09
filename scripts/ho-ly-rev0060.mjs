/* ==========================================================================
   BÀN SOI CỦA HỒ LY — REV-0060 "Nạp file số liệu"
   ---------------------------------------------------------------------------
   Bàn đo NÀY KHÔNG PHẢI của người xây. Việc của nó là chứng minh lời khai
   SAI, không phải xác nhận lời khai đúng. Mọi ca ở đây là ca mà bàn đo
   `do-nap-file` / `do-nap-ghi` CHƯA có.

   Chạy:  node scripts/ho-ly-rev0060.mjs
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = p => new URL('file:///' + p.replace(/\\/g, '/'));
const nap = await import(url(path.join(GOC, 'src', 'nap-du-lieu.js')));
const docb = await import(url(path.join(GOC, 'src', 'doc-bang.js')));
const canhbao = await import(url(path.join(GOC, 'src', 'canh-bao-ghi.js')));
const quyen = await import(url(path.join(GOC, 'src', 'quyen.js')));

let dat = 0, truot = 0; const hong = [];
function ok(ten, dung, ct = '') {
  if (dung) { dat++; console.log(`  ✓ ${ten}${ct ? ' — ' + ct : ''}`); }
  else { truot++; hong.push(ten + (ct ? ` — ${ct}` : '')); console.log(`  ✗ ${ten}${ct ? ' — ' + ct : ''}`); }
}
function tin(s) { console.log('    · ' + s); }

/* ---------- CSDL + giả lập D1 (cùng lối do-nap-ghi-d1.mjs) ---------------- */
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
    for (const c of tachCau(readFileSync(path.join(GOC, 'migrations', ten), 'utf8'))) {
      try { db.exec(c); } catch (e) {
        if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e;
      }
    }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
           INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-NGOC','Bùi Thị Ngọc');`);
  return db;
}
function dungD1(db) {
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
  let tongGhi = 0;
  const moi = (sql, tso = []) => ({
    bind: (...a) => moi(sql, a),
    async run() {
      const kq = db.prepare(sql).run(...tso);
      const bang = bangCua(sql), dong = Number(kq.changes || 0);
      const ghi = bang ? dong * (1 + demIdx(bang)) : dong;
      tongGhi += ghi;
      return { success: true, meta: { rows_written: ghi, changes: dong } };
    },
    async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...tso) }; }
  });
  return {
    DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } },
    tongGhi: () => tongGhi
  };
}

const B = s => new TextEncoder().encode(s);
const PHIEN = { nhan_su_id: 'NS-NGOC', ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin', quyen: ['khovan', 'kinhdoanh'] };
const GHEP_SP = { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 };
function csvSP(n, doi = 0) {
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  for (let i = 1; i <= n; i++)
    s += `SP-${String(i).padStart(5, '0')},"Hạt điều gói ${i}${doi ? ' (bản ' + doi + ')' : ''}",Hạt,túi,${20 + i % 30}\n`;
  return B(s);
}
async function nạp(env, bytes, ghep, maDich = 'san_pham', tenTep = 'thu.csv', phien = PHIEN) {
  const bang = await nap.docBangTuByte(bytes, tenTep);
  return nap.ghiThat(env, phien, { bang, ghep, maDich, tenTep });
}
async function xemT(env, bytes, ghep, maDich = 'san_pham', tenTep = 'thu.csv') {
  const bang = await nap.docBangTuByte(bytes, tenTep);
  return nap.xemTruoc(env, PHIEN, { bang, ghep, maDich, vanTay: 'x' });
}
const NGAY = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const soSo = db => db.prepare('SELECT so_dong FROM d1_ghi_ngay WHERE ngay = ?').get(NGAY())?.so_dong ?? null;

/* ==========================================================================
   A. CHỐT CHẶN HẠN MỨC GHI D1 — tự đo lại, không tin lời khai
   ========================================================================== */
console.log('\n══ A. CHỐT CHẶN HẠN MỨC GHI D1 ══');

console.log('\nA1. Ba lần nạp liên tiếp — sổ ngày có bằng tổng không?');
{
  const db = dungCsdl(), env = dungD1(db);
  const k1 = await nạp(env, csvSP(100), GHEP_SP);
  const s1 = soSo(db);
  const k2 = await nạp(env, csvSP(200), GHEP_SP);
  const s2 = soSo(db);
  const k3 = await nạp(env, csvSP(300), GHEP_SP);
  const s3 = soSo(db);
  const tong = k1.luot_ghi_that + k2.luot_ghi_that + k3.luot_ghi_that;
  tin(`lượt ghi thật: ${k1.luot_ghi_that} + ${k2.luot_ghi_that} + ${k3.luot_ghi_that} = ${tong}`);
  tin(`sổ ngày sau mỗi lần: ${s1} → ${s2} → ${s3}`);
  ok('Sổ ngày cộng dồn ĐÚNG BẰNG tổng lượt ghi thật', s3 === tong, `sổ ${s3} · thật ${tong}`);
  ok('Không lần nào sổ ngày trống', s1 > 0 && s2 > s1 && s3 > s2);
}

console.log('\nA2. Cron chốt sổ chạy CÙNG isolate — có đếm hai lần không?');
{
  /* Người xây viết trong mã: "cron chạy ở isolate KHÁC nên số này gần như
     KHÔNG BAO GIỜ tới được chỗ cron". "Gần như" = có lúc tới. Workers cho
     phép scheduled() và fetch() dùng CHUNG isolate. Lúc đó `donCho` (do
     demGhi cộng trong ghiThat) vẫn còn nguyên, cron flush thêm lần nữa. */
  const db = dungCsdl(), env = dungD1(db);
  canhbao.datLai(0);
  const k = await nạp(env, csvSP(100), GHEP_SP);
  const sauNap = soSo(db);
  const treo = canhbao.dangCho();
  tin(`ghi thật ${k.luot_ghi_that} · sổ ngày ${sauNap} · bộ đếm treo trong bộ nhớ = ${treo}`);
  await canhbao.chotVaCanhBao(env, async () => {});
  const sauCron = soSo(db);
  tin(`sau khi cron chốt sổ (cùng isolate): sổ ngày = ${sauCron}`);
  ok('Cron chốt sổ KHÔNG đếm lại lượt ghi của lần nạp file', sauCron === sauNap,
     sauCron === sauNap ? 'không cộng đôi' : `CỘNG ĐÔI: ${sauNap} → ${sauCron} (+${sauCron - sauNap})`);
}

console.log('\nA3. Hai người nạp CÙNG LÚC khi hạn mức sắp cạn');
{
  const db = dungCsdl(), env = dungD1(db);
  /* Chừa 20.000 + để đúng một file 1.000 dòng (~9.000 lượt) lọt qua. */
  const conCanDung = 20000 + 12000;
  db.prepare('INSERT INTO d1_ghi_ngay (ngay, so_dong, da_bao) VALUES (?, ?, 0)')
    .run(NGAY(), 100000 - conCanDung);
  const tep = csvSP(1000);
  const tepB = csvSP(1000).slice();               // cùng nội dung, nạp song song
  // hai lần nạp KHÁC mã để không đụng khoá tự nhiên
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  for (let i = 1; i <= 1000; i++) s += `XX-${String(i).padStart(5, '0')},"Hạt B ${i}",Hạt,túi,5\n`;
  const [ra, rb] = await Promise.all([
    nạp(env, tep, GHEP_SP, 'san_pham', 'a.csv'),
    nạp(env, B(s), GHEP_SP, 'san_pham', 'b.csv')
  ]);
  const cuoi = soSo(db);
  tin(`A: ${ra.loi ? 'CHẶN ' + ra.ma : ra.luot_ghi_that + ' lượt'} · B: ${rb.loi ? 'CHẶN ' + rb.ma : rb.luot_ghi_that + ' lượt'}`);
  tin(`sổ ngày cuối = ${cuoi} / hạn mức 100.000 · mức phải giữ = 80.000`);
  ok('Hai lần nạp song song KHÔNG cùng vượt mức chừa 20.000', cuoi <= 80000,
     cuoi > 80000 ? `VƯỢT: đã dùng ${cuoi}, ăn vào phần chừa cho đồng bộ sàn` : `còn ${100000 - cuoi}`);
  ok('Bộ đếm không bị đè (sổ ngày ≥ lượt ghi của cả hai)',
     cuoi >= (ra.luot_ghi_that || 0) + (rb.luot_ghi_that || 0));
}

console.log('\nA4. Chặn 429 có xảy ra TRƯỚC khi ghi dòng đầu tiên không?');
{
  const db = dungCsdl(), env = dungD1(db);
  db.prepare('INSERT INTO d1_ghi_ngay (ngay, so_dong, da_bao) VALUES (?, ?, 0)').run(NGAY(), 95000);
  const kq = await nạp(env, csvSP(1000), GHEP_SP);
  const sp = Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n);
  const vet = Number(db.prepare('SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen').get().n);
  ok('Trả 429', kq.ma === 429, String(kq.ma));
  ok('KHÔNG để lại dòng nửa vời (san_pham = 0, ghi vết = 0)', sp === 0 && vet === 0, `sp=${sp} vết=${vet}`);
  ok('Sổ ngày không đổi khi bị chặn', soSo(db) === 95000, String(soSo(db)));
}

console.log('\nA5. Con số BÁO TRƯỚC có bao giờ THẤP hơn số thật không?');
{
  /* Báo cao hơn thật là an toàn. Báo THẤP là chặn hụt — file lọt qua rồi ăn
     quá hạn mức. Quét nhiều hình dạng file, không chỉ ba hình người xây đo. */
  const ca = [];
  // (a) thêm mới, nhiều cỡ
  for (const n of [1, 7, 50, 500]) ca.push({ ten: `san_pham thêm ${n}`, n, kieu: 'them' });
  // (b) sửa 1 ô / 2 ô / 5 ô
  for (const soO of [1, 2, 5]) ca.push({ ten: `san_pham sửa ${soO} ô × 200 dòng`, soO, kieu: 'sua' });
  // (c) ton_kho có lô / không lô
  ca.push({ ten: 'ton_kho 200 dòng CÓ lô+HSD', kieu: 'ton', lo: true });
  ca.push({ ten: 'ton_kho 200 dòng KHÔNG lô', kieu: 'ton', lo: false });
  // (d) trộn: nửa thêm nửa sửa
  ca.push({ ten: 'san_pham nửa thêm nửa sửa', kieu: 'tron' });

  for (const c of ca) {
    const db = dungCsdl(), env = dungD1(db);
    let xem, kq;
    if (c.kieu === 'them') {
      xem = await xemT(env, csvSP(c.n), GHEP_SP);
      kq = await nạp(env, csvSP(c.n), GHEP_SP);
    } else if (c.kieu === 'sua') {
      await nạp(env, csvSP(200), GHEP_SP);
      // đổi soO ô: ten luôn đổi; thêm danh_muc / don_vi / ton_toi_thieu / theo_doi_hsd
      let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu,HSD\n';
      for (let i = 1; i <= 200; i++) {
        const dm = c.soO >= 2 ? 'Nhóm mới' : 'Hạt';
        const dv = c.soO >= 3 ? 'hộp' : 'túi';
        const tt = c.soO >= 4 ? 999 : (20 + i % 30);
        const hsd = c.soO >= 5 ? '0' : '1';
        s += `SP-${String(i).padStart(5, '0')},"Tên mới ${i}",${dm},${dv},${tt},${hsd}\n`;
      }
      const g = { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4, theo_doi_hsd: 5 };
      xem = await xemT(env, B(s), g);
      kq = await nạp(env, B(s), g);
    } else if (c.kieu === 'ton') {
      await nạp(env, csvSP(200), GHEP_SP);
      let s = c.lo ? 'Mã SKU,Số lượng tồn,Số lô,Hạn sử dụng,Đơn giá vốn\n' : 'Mã SKU,Số lượng tồn\n';
      for (let i = 1; i <= 200; i++)
        s += c.lo ? `SP-${String(i).padStart(5, '0')},${i},LO-${i},31/12/2026,15000\n`
                  : `SP-${String(i).padStart(5, '0')},${i}\n`;
      const g = c.lo ? { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3, don_gia: 4 }
                     : { ma_sku: 0, so_luong: 1 };
      xem = await xemT(env, B(s), g, 'ton_kho');
      kq = await nạp(env, B(s), g, 'ton_kho', 'ton.csv');
    } else {
      await nạp(env, csvSP(100), GHEP_SP);
      xem = await xemT(env, csvSP(200, 2), GHEP_SP);
      kq = await nạp(env, csvSP(200, 2), GHEP_SP);
    }
    const du = xem.ghi_du_tinh, that = kq.luot_ghi_that;
    ok(`Báo trước ≥ thật · ${c.ten}`, du >= that, `báo ${du} · thật ${that}` + (du < that ? ' ⇐ BÁO HỤT' : ''));
  }
}

/* ==========================================================================
   B. .XLSX — chỗ đáng ngờ nhất
   ========================================================================== */
console.log('\n══ B. ĐỌC FILE .XLSX ══');

/* --- Bộ dựng file nén ZIP kiểu "store" (kiểu nén 0 — bungPhan có hỗ trợ) --- */
function crc32(u8) {
  let c, t = crc32.t;
  if (!t) {
    t = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  }
  c = -1;
  for (let i = 0; i < u8.length; i++) c = (c >>> 8) ^ t[(c ^ u8[i]) & 0xFF];
  return (c ^ -1) >>> 0;
}
function dungZip(phan) {                       // phan: [{ten, noiDung(string)}]
  const enc = new TextEncoder();
  const cuc = [], trung = [];
  let off = 0;
  for (const p of phan) {
    const ten = enc.encode(p.ten), du = enc.encode(p.noiDung);
    const c = crc32(du);
    const h = new Uint8Array(30 + ten.length);
    const dv = new DataView(h.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true);
    dv.setUint16(8, 0, true);                   // store
    dv.setUint32(14, c, true); dv.setUint32(18, du.length, true); dv.setUint32(22, du.length, true);
    dv.setUint16(26, ten.length, true);
    h.set(ten, 30);
    cuc.push(h, du);
    const cd = new Uint8Array(46 + ten.length);
    const dv2 = new DataView(cd.buffer);
    dv2.setUint32(0, 0x02014b50, true); dv2.setUint16(4, 20, true); dv2.setUint16(6, 20, true);
    dv2.setUint16(10, 0, true);
    dv2.setUint32(16, c, true); dv2.setUint32(20, du.length, true); dv2.setUint32(24, du.length, true);
    dv2.setUint16(28, ten.length, true);
    dv2.setUint32(42, off, true);
    cd.set(ten, 46);
    trung.push(cd);
    off += h.length + du.length;
  }
  const thanCd = trung.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  const dv3 = new DataView(eocd.buffer);
  dv3.setUint32(0, 0x06054b50, true);
  dv3.setUint16(8, phan.length, true); dv3.setUint16(10, phan.length, true);
  dv3.setUint32(12, thanCd, true); dv3.setUint32(16, off, true);
  const tat = [...cuc, ...trung, eocd];
  const tong = tat.reduce((a, b) => a + b.length, 0);
  const ra = new Uint8Array(tong); let p = 0;
  for (const x of tat) { ra.set(x, p); p += x.length; }
  return ra;
}
const WB = (soSheet = 1) => '<?xml version="1.0"?><workbook xmlns:r="r">' +
  Array.from({ length: soSheet }, (_, i) => `<sheet name="Bảng ${i + 1}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
  '</workbook>';
const RELS = (soSheet = 1) => '<?xml version="1.0"?><Relationships>' +
  Array.from({ length: soSheet }, (_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
  '</Relationships>';
const SHEET = rows => '<?xml version="1.0"?><worksheet><sheetData>' + rows + '</sheetData></worksheet>';
const o = (ref, v, t) => `<c r="${ref}"${t ? ` t="${t}"` : ''}><v>${v}</v></c>`;
const oStr = (ref, s) => `<c r="${ref}" t="inlineStr"><is><t>${s}</t></is></c>`;

console.log('\nB1. Nhiều sheet — lấy sheet nào, có NÓI cho người dùng biết không?');
{
  const z = dungZip([
    { ten: 'xl/workbook.xml', noiDung: WB(2) },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: RELS(2) },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Tên')}</row>` +
        `<row r="2">${oStr('A2', 'SHEET1-A')}${oStr('B2', 'Hàng ở bảng 1')}</row>`) },
    { ten: 'xl/worksheets/sheet2.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Tên')}</row>` +
        `<row r="2">${oStr('A2', 'SHEET2-A')}${oStr('B2', 'Hàng ở bảng 2')}</row>`) }
  ]);
  const b = await docb.docBang(z, 'nhieu-sheet.xlsx');
  tin(`đọc được: ${JSON.stringify(b.dong[0])}`);
  tin(`cảnh báo trả về: ${JSON.stringify(b.canhBao)}`);
  ok('Lấy đúng bảng ĐẦU TIÊN', b.dong[0][0] === 'SHEET1-A', b.dong[0][0]);
  ok('CÓ nói cho người dùng biết file nhiều bảng và đang lấy bảng nào',
     b.canhBao.some(c => /bảng|sheet/i.test(c)) || /Bảng 1/.test(b.dinhDang || ''),
     b.canhBao.length ? b.canhBao.join(' | ') : '(im lặng — người dùng không biết 2 bảng kia bị bỏ)');
}

console.log('\nB2. Ô CÔNG THỨC — lấy công thức hay lấy kết quả?');
{
  const z = dungZip([
    { ten: 'xl/workbook.xml', noiDung: WB() },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: RELS() },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Số lượng')}</row>` +
        `<row r="2">${oStr('A2', 'SP-1')}<c r="B2"><f>SUM(C2:D2)</f><v>250</v></c></row>` +
        `<row r="3">${oStr('A3', 'SP-2')}<c r="B3" t="e"><f>1/0</f><v>#DIV/0!</v></c></row>` +
        `<row r="4">${oStr('A4', 'SP-3')}<c r="B4"><f>SUM(C4:D4)</f></c></row>`) }
  ]);
  const b = await docb.docBang(z, 'congthuc.xlsx');
  tin(`dòng: ${JSON.stringify(b.dong)}`);
  ok('Ô công thức trả KẾT QUẢ (250), không trả chuỗi công thức', b.dong[0][1] === '250', b.dong[0][1]);
  ok('Ô lỗi #DIV/0! không âm thầm thành số', b.dong[1][1] === '#DIV/0!', b.dong[1][1]);
  const kb = nap.kiemBang(b, { ma_sku: 0, so_luong: 1 }, 'ton_kho');
  const cauLoi = kb.loi.map(l => l.thongDiep);
  tin(cauLoi.join(' || ') || '(không lỗi)');
  ok('Ô #DIV/0! bị chặn và câu lỗi nói rõ dòng/cột',
     cauLoi.some(c => /Dòng 3.*Số lượng/.test(c)), cauLoi[0] || '(lọt qua!)');
  ok('Ô công thức KHÔNG có kết quả lưu sẵn -> báo lỗi, không lặng lẽ thành 0',
     cauLoi.some(c => /Dòng 4/.test(c)), cauLoi.join(' | ') || '(lọt!)');
}

console.log('\nB3. Ô NGÀY của Excel (Excel lưu 31/12/2026 thành một con số)');
{
  // 31/12/2026 theo mốc 1899-12-30
  const serial = Math.round((Date.UTC(2026, 11, 31) - Date.UTC(1899, 11, 30)) / 86400000);
  tin(`31/12/2026 = số ${serial} trong Excel`);
  const z = dungZip([
    { ten: 'xl/workbook.xml', noiDung: WB() },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: RELS() },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Số lượng tồn')}${oStr('C1', 'Hạn sử dụng')}</row>` +
        `<row r="2">${oStr('A2', 'SP-00001')}${o('B2', '10')}<c r="C2" s="3"><v>${serial}</v></c></row>`) }
  ]);
  const b = await docb.docBang(z, 'ngay.xlsx');
  tin(`ô hạn dùng đọc thô = "${b.dong[0][2]}"`);
  const d = nap.docNgay(b.dong[0][2]);
  ok('Số ngày của Excel đổi đúng thành 2026-12-31', d === '2026-12-31', String(d));
  const kb = nap.kiemBang(b, { ma_sku: 0, so_luong: 1, han_su_dung: 2 }, 'ton_kho');
  ok('Qua kiemBang ra đúng ngày', kb.banGhi[0]?.han_su_dung === '2026-12-31', String(kb.banGhi[0]?.han_su_dung));
  ok('Nhưng MẪU hiện cho Sếp xem ở bước ghép cột là con số thô (Sếp không kiểm được bằng mắt)',
     b.dong[0][2] === String(serial), `mẫu hiện "${b.dong[0][2]}" chứ không phải "31/12/2026"`);

  // Hệ ngày 1904 (Excel bản Mac / workbookPr date1904="1")
  const z04 = dungZip([
    { ten: 'xl/workbook.xml', noiDung: '<?xml version="1.0"?><workbook xmlns:r="r"><workbookPr date1904="1"/><sheet name="S" sheetId="1" r:id="rId1"/></workbook>' },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: RELS() },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Số lượng tồn')}${oStr('C1', 'Hạn sử dụng')}</row>` +
        `<row r="2">${oStr('A2', 'SP-00001')}${o('B2', '10')}<c r="C2"><v>${serial - 1462}</v></c></row>`) }
  ]);
  const b04 = await docb.docBang(z04, 'ngay1904.xlsx');
  const d04 = nap.docNgay(b04.dong[0][2]);
  ok('File dùng hệ ngày 1904: hoặc đọc đúng, hoặc BÁO ra — không được đọc lệch âm thầm',
     d04 === '2026-12-31' || b04.canhBao.some(c => /1904/.test(c)),
     `đọc ra ${d04} (lệch ${d04 === '2022-12-30' ? '4 năm 1 ngày' : '?'}) · cảnh báo: ${JSON.stringify(b04.canhBao)}`);
}

console.log('\nB4. Ô GỘP (merged cell)');
{
  const z = dungZip([
    { ten: 'xl/workbook.xml', noiDung: WB() },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: RELS() },
    { ten: 'xl/worksheets/sheet1.xml', noiDung:
      '<?xml version="1.0"?><worksheet><sheetData>' +
      `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Tên sản phẩm')}</row>` +
      `<row r="2">${oStr('A2', 'SP-A')}${oStr('B2', 'Hạt điều')}</row>` +
      `<row r="3">${oStr('A3', 'SP-B')}</row>` +          // B3 nằm trong ô gộp B2:B3 -> trống
      '</sheetData><mergeCells count="1"><mergeCell ref="B2:B3"/></mergeCells></worksheet>' }
  ]);
  const b = await docb.docBang(z, 'ogop.xlsx');
  tin(`dòng: ${JSON.stringify(b.dong)}`);
  const kb = nap.kiemBang(b, { ma_sku: 0, ten: 1 }, 'san_pham');
  tin(`lỗi: ${kb.loi.map(l => l.thongDiep).join(' || ') || '(không)'}`);
  ok('Ô gộp: dòng dưới hoặc lấy được giá trị, hoặc BÁO LỖI rõ — không lặng lẽ trống',
     kb.loi.length > 0 || kb.banGhi.every(r => r.ten), JSON.stringify(kb.banGhi.map(r => r.ten)));
  ok('Có nói cho người dùng biết file có ô gộp',
     b.canhBao.some(c => /gộp|merge/i.test(c)),
     b.canhBao.length ? b.canhBao.join('|') : '(im lặng)');
}

console.log('\nB5. File .xlsx hỏng / .zip đổi đuôi / file có mật khẩu');
{
  const zTot = dungZip([
    { ten: 'xl/workbook.xml', noiDung: WB() },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: RELS() },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(`<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Tên')}</row><row r="2">${oStr('A2', 'X')}${oStr('B2', 'Y')}</row>`) }
  ]);
  // (a) cắt cụt đuôi -> mất EOCD
  const cut = zTot.slice(0, zTot.length - 10);
  let e1 = null; try { await docb.docBang(cut, 'hong.xlsx'); } catch (e) { e1 = e; }
  ok('File nén hỏng: có câu lỗi tiếng người', e1 && e1.name === 'LoiDocBang', e1 ? e1.message.slice(0, 90) : '(KHÔNG ném lỗi!)');

  // (b) đục thủng giữa thân file (EOCD còn, dữ liệu hỏng)
  const duc = zTot.slice(); duc[40] = 0xFF; duc[41] = 0xFF; duc[42] = 0xFF;
  let e2 = null, ok2 = null; try { ok2 = await docb.docBang(duc, 'duc.xlsx'); } catch (e) { e2 = e; }
  ok('File nén bị đục thủng: hoặc đọc được, hoặc lỗi TIẾNG NGƯỜI (không phải lỗi kỹ thuật)',
     !!ok2 || (e2 && e2.name === 'LoiDocBang'), e2 ? `${e2.name}: ${e2.message.slice(0, 90)}` : 'đọc được');

  // (c) file .zip thường đổi đuôi .xlsx
  const zip = dungZip([{ ten: 'ghichu.txt', noiDung: 'đây không phải file Excel' }]);
  let e3 = null; try { await docb.docBang(zip, 'gia.xlsx'); } catch (e) { e3 = e; }
  ok('.zip đổi đuôi .xlsx: câu lỗi tiếng người', e3 && e3.name === 'LoiDocBang', e3 ? e3.message.slice(0, 100) : '(không lỗi!)');

  // (d) file .xlsx ĐẶT MẬT KHẨU — thân là kho OLE2 (D0 CF 11 E0), giống hệt .xls 2003
  const ole = new Uint8Array(600);
  ole.set([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
  // dấu vết của gói mã hoá ECMA-376
  const dau = B('E n c r y p t e d P a c k a g e');
  ole.set(dau, 100);
  let e4 = null; try { await docb.docBang(ole, 'matkhau.xlsx'); } catch (e) { e4 = e; }
  tin(`câu lỗi: ${e4 ? e4.message : '(không lỗi)'}`);
  ok('File .xlsx có mật khẩu: câu lỗi KHÔNG được chẩn đoán nhầm thành ".xls đời 2003"',
     e4 && !/2003/.test(e4.message), e4 ? e4.message.slice(0, 110) : '(không lỗi!)');
}

console.log('\nB6. File .xlsx quá 200 cột — cắt âm thầm hay báo ra?');
{
  const cot = 260;
  let tieuDe = '', dong = '';
  const tenCot = i => { let n = i + 1, s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  for (let i = 0; i < cot; i++) { tieuDe += oStr(tenCot(i) + '1', 'C' + (i + 1)); dong += oStr(tenCot(i) + '2', 'v' + (i + 1)); }
  const z = dungZip([
    { ten: 'xl/workbook.xml', noiDung: WB() },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: RELS() },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(`<row r="1">${tieuDe}</row><row r="2">${dong}</row>`) }
  ]);
  let b = null, e = null;
  try { b = await docb.docBang(z, 'nhieucot.xlsx'); } catch (er) { e = er; }
  tin(b ? `đọc được ${b.cot.length} cột (file có ${cot})` : `lỗi: ${e.message.slice(0, 80)}`);
  ok('260 cột: hoặc báo lỗi, hoặc đọc đủ — KHÔNG được lặng lẽ vứt 60 cột',
     !!e || (b && b.cot.length === cot),
     b ? `chỉ giữ ${b.cot.length}/${cot} cột, cảnh báo = ${JSON.stringify(b.canhBao)}` : 'có báo lỗi');
}

console.log('\nB7. File .xlsx THẬT trên máy Sếp mà bàn đo của người xây CHƯA thử');
{
  const thuMuc = ['C:/Users/Admin/Desktop/SP T1', 'C:/Users/Admin/Desktop/SP T5',
                  'C:/Users/Admin/Desktop/HCNS', 'C:/Users/Admin/Desktop/AGC - Bộ não Drive',
                  'C:/Users/Admin/Downloads'];
  let daDo = 0, thanhCong = 0;
  for (const tm of thuMuc) {
    if (!existsSync(tm)) continue;
    let ds = [];
    try { ds = readdirSync(tm).filter(f => /\.(xlsx|xls)$/i.test(f)); } catch { continue; }
    for (const f of ds.slice(0, 3)) {
      const duong = path.join(tm, f);
      let st; try { st = statSync(duong); } catch { continue; }
      if (st.size > 8 * 1024 * 1024) { tin(`BỎ QUA (${(st.size / 1048576).toFixed(1)} MB > trần 8 MB): ${f}`); continue; }
      const byte = new Uint8Array(readFileSync(duong));
      const t0 = Date.now();
      try {
        const b = await docb.docBang(byte, f);
        thanhCong++;
        ok(`đọc "${f}"`, b.cot.length >= 1 && b.dong.length >= 0,
           `${b.cot.length} cột × ${b.dong.length} dòng · ${Date.now() - t0} ms · ${b.dinhDang}`);
      } catch (er) {
        ok(`đọc "${f}" — hoặc được, hoặc lỗi tiếng người`, er.name === 'LoiDocBang',
           `${er.name}: ${er.message.slice(0, 90)}`);
      }
      daDo++;
    }
  }
  tin(`đã thử ${daDo} file thật, đọc trót lọt ${thanhCong}`);
  ok('Có thử ít nhất 6 file thật CHƯA nằm trong bàn đo của người xây', daDo >= 6, `mới ${daDo}`);
}

/* ==========================================================================
   C. GHI VÀO SỔ CÁI KHO — nghiệp vụ
   ========================================================================== */
console.log('\n══ C. SỔ CÁI KHO ══');

console.log('\nC1. Nạp LẠI ĐÚNG file tồn kho — tồn có gấp đôi không? Có cảnh báo không?');
{
  const db = dungCsdl(), env = dungD1(db);
  await nạp(env, csvSP(50), GHEP_SP);
  let s = 'Mã SKU,Số lượng tồn\n';
  for (let i = 1; i <= 50; i++) s += `SP-${String(i).padStart(5, '0')},100\n`;
  const g = { ma_sku: 0, so_luong: 1 };
  const tonCua = () => Number(db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN loai='nhap' THEN so_luong ELSE -so_luong END),0) AS t FROM giao_dich_kho`).get().t);

  await nạp(env, B(s), g, 'ton_kho', 'TonDauKy.csv');
  const t1 = tonCua();
  const xem2 = await xemT(env, B(s), g, 'ton_kho', 'TonDauKy.csv');
  await nạp(env, B(s), g, 'ton_kho', 'TonDauKy.csv');
  const t2 = tonCua();
  await nạp(env, B(s), g, 'ton_kho', 'TonDauKy.csv');
  const t3 = tonCua();
  tin(`tổng tồn sau lần 1/2/3: ${t1} → ${t2} → ${t3}`);
  tin(`xem trước lần 2 nói gì: so_them=${xem2.so_them} · cảnh báo=${JSON.stringify(xem2.canh_bao)}`);
  ok('Nạp lại đúng file tồn KHÔNG làm tồn gấp đôi', t2 === t1,
     t2 === t1 ? '' : `tồn ${t1} → ${t2} → ${t3} (nhân ${(t3 / t1).toFixed(0)} lần sau 3 lần nạp)`);
  ok('Nếu vẫn cộng dồn thì ÍT NHẤT phải có cảnh báo "file này đã nạp rồi"',
     (xem2.canh_bao || []).some(c => /đã nạp|trùng|lặp/i.test(c)),
     JSON.stringify(xem2.canh_bao) + ' ⇐ không một chữ nào cảnh báo');
}

console.log('\nC2. Tồn tính ra có khớp tổng sổ cái không?');
{
  const db = dungCsdl(), env = dungD1(db);
  await nạp(env, csvSP(20), GHEP_SP);
  let s = 'Mã SKU,Số lượng tồn,Đơn giá vốn\n';
  for (let i = 1; i <= 20; i++) s += `SP-${String(i).padStart(5, '0')},${i * 10},"25.000"\n`;
  const kq = await nạp(env, B(s), { ma_sku: 0, so_luong: 1, don_gia: 2 }, 'ton_kho', 'ton.csv');
  const tong = Number(db.prepare(`SELECT SUM(so_luong) AS t FROM giao_dich_kho WHERE loai='nhap'`).get().t);
  const canCo = 10 * 20 * 21 / 2;
  ok('Tổng sổ cái = tổng số lượng trong file', tong === canCo, `sổ ${tong} · file ${canCo}`);
  ok('Mọi dòng cùng MỘT phiếu nhập',
     Number(db.prepare(`SELECT COUNT(DISTINCT phieu_id) AS n FROM giao_dich_kho`).get().n) === 1);
  const gia = db.prepare(`SELECT don_gia FROM giao_dich_kho LIMIT 1`).get().don_gia;
  ok('Đơn giá "25.000" đọc thành 25000 (không thành 25)', gia === 25000, String(gia));
  ok('Ghi vết phiếu nhập có trong sổ',
     Number(db.prepare(`SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen WHERE bang='giao_dich_kho'`).get().n) === 1);
  tin(`kết quả trả về: ${JSON.stringify({ da_them: kq.da_them, luot: kq.luot_ghi_that })}`);
}

console.log('\nC3. Số âm trong file tồn kho');
{
  const b = await nap.docBangTuByte(B('Mã SKU,Số lượng tồn\nSP-1,-8\nSP-2,5\n'), 'am.csv');
  const kb = nap.kiemBang(b, { ma_sku: 0, so_luong: 1 }, 'ton_kho');
  const c = kb.loi.map(l => l.thongDiep).join(' | ');
  tin(c);
  ok('Số âm bị chặn', kb.banGhi.length === 1 && kb.loi.length === 1, `nhận ${kb.banGhi.length} dòng`);
  ok('Câu lỗi nói rõ dòng + cột + cách xử lý', /Dòng 2.*Số lượng tồn.*Xuất kho/i.test(c), c.slice(0, 120));
}

console.log('\nC4. Nạp hỏng GIỮA CHỪNG — có để lại nửa vời không?');
{
  /* Cho lô thứ 3 nổ giữa chừng, xem các lô trước đã ghi có bị bỏ lại không. */
  const db = dungCsdl();
  const env = dungD1(db);
  const batGoc = env.DB.batch.bind(env.DB);
  let lan = 0;
  env.DB.batch = async ds => { if (++lan === 3) throw new Error('D1: network error'); return batGoc(ds); };
  let e = null;
  try { await nạp(env, csvSP(200), GHEP_SP); } catch (er) { e = er; }
  const sp = Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n);
  tin(`ngã ở lô 3 · CSDL còn ${sp} sản phẩm · sổ ngày = ${soSo(db)}`);
  ok('Ngã giữa chừng thì có ném lỗi ra ngoài', !!e, e ? e.message : '(nuốt lỗi!)');
  ok('KHÔNG để lại dữ liệu nửa vời (0 dòng, hoặc có cơ chế dọn)', sp === 0,
     sp === 0 ? '' : `còn ${sp}/200 dòng ghi dở trong CSDL, không ai dọn`);
  ok('Lượt ghi đã tiêu vẫn được ghi vào sổ ngày (không thì hạn mức đếm hụt)',
     soSo(db) !== null && soSo(db) > 0,
     soSo(db) === null ? 'SỔ NGÀY TRỐNG dù đã ghi ' + sp + ' dòng — hạn mức đếm hụt' : String(soSo(db)));
}

/* ==========================================================================
   D. QUYỀN — luật máy chủ vs luật giao diện
   ========================================================================== */
console.log('\n══ D. QUYỀN ══');
{
  const vai = ['admin', 'admin_backup', 'nguoi_dung', 'ke_toan_truong', 'quan_ly_kho',
               'nhan_vien_kho', 'van_hanh_san', 'hcns', 'nv_test'];
  /* ⚠️ HỎI ĐÚNG HÀM MÁY CHỦ ĐANG DÙNG, KHÔNG DỰNG LẠI LUẬT BẰNG TAY.
     Bản trước tính `napTon = (tab) && duocThaoTacKho(p)` — tức CHÉP LẠI luật
     của `batBuocNapDuLieu` vào bàn đo. Ngày 09/09/2026 Sếp đổi luật (chỉ Quản
     lý kho + Kế toán trưởng nạp được, cờ riêng `duocNapTonHangLoat`), mã sản
     phẩm đổi theo, mà bàn đo vẫn đọc cờ CŨ nên nó khai `nhan_vien_kho` VẪN
     nạp được trong khi máy chủ đã trả 403 thật. Bàn đo chép tay luật là bàn
     đo sẽ nói dối đúng vào ngày luật đổi. Nay hỏi thẳng hàm. */
  console.log('  vai trò          | tab khovan | tab kinhdoanh | sua SP | thao tác kho | nạp SP | nạp tồn | điều chỉnh');
  const bang = [];
  for (const v of vai) {
    const p = { vai_tro: v };
    const t1 = quyen.duocXemTab(p, 'khovan'), t2 = quyen.duocXemTab(p, 'kinhdoanh');
    const sua = quyen.duocSuaSanPham(p), thao = quyen.duocThaoTacKho(p);
    const napSP = (t1 || t2) && sua;
    const napTon = (t1 || t2) && quyen.duocNapTonHangLoat(p);
    const dieuChinh = t1 && quyen.duocDieuChinhKho(p);
    bang.push({ v, t1, t2, sua, thao, napSP, napTon, dieuChinh });
    console.log(`  ${v.padEnd(16)} | ${String(t1).padEnd(10)} | ${String(t2).padEnd(13)} | ${String(sua).padEnd(6)} | ${String(thao).padEnd(12)} | ${String(napSP).padEnd(6)} | ${String(napTon).padEnd(7)} | ${dieuChinh}`);
  }
  const g = n => bang.find(b => b.v === n);
  /* Sếp Ngọc chốt 09/09/2026 (C1): Kế toán trưởng NAY nạp được tồn kho hàng
     loạt — chị Hằng là người đối chiếu sổ với số kiểm kê. Vẫn KHÔNG nạp được
     danh mục sản phẩm (đó là của Kinh doanh). */
  ok('ke_toan_truong nạp được TỒN KHO nhưng KHÔNG nạp danh mục (C1)',
     g('ke_toan_truong').napTon && !g('ke_toan_truong').napSP);
  ok('van_hanh_san (Kinh doanh) nạp được DANH MỤC', g('van_hanh_san').napSP);
  ok('van_hanh_san KHÔNG nạp được TỒN KHO', !g('van_hanh_san').napTon);
  ok('quan_ly_kho (anh Duy) nạp được cả hai', g('quan_ly_kho').napSP && g('quan_ly_kho').napTon);
  ok('nguoi_dung thường không nạp được gì', !g('nguoi_dung').napSP && !g('nguoi_dung').napTon);
  ok('nhan_vien_kho KHÔNG nạp hàng loạt được tồn kho (C1 — Sếp chốt 09/09/2026)',
     !g('nhan_vien_kho').napTon,
     g('nhan_vien_kho').napTon ? 'NẠP ĐƯỢC — 17 bạn part-time ở kho đều ghi được thẳng vào sổ cái' : '');
  ok('nv_test cũng KHÔNG nạp hàng loạt được (vai để bấm thử luồng, không để ghi thật)',
     !g('nv_test').napTon);
  /* C2 — phiếu điều chỉnh: Quản lý kho + Kế toán trưởng + Admin, không ai khác. */
  ok('Phiếu điều chỉnh CHỈ mở cho Quản lý kho · Kế toán trưởng · Admin (C2)',
     bang.filter(b => b.dieuChinh).map(b => b.v).sort().join(',') ===
     'admin,ke_toan_truong,quan_ly_kho',
     bang.filter(b => b.dieuChinh).map(b => b.v).join(', ') || '(không ai)');

  /* Luật giao diện lấy từ app.js, phải TRÙNG luật máy chủ */
  const js = readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8');
  ok('Giao diện cắt nút bằng ĐÚNG hai cờ máy chủ gửi xuống (san_pham.sua · kho.nap_luot)',
     /qSanPham\.sua \|\| qKho\.nap_luot/.test(js) &&
     /if \(!qSanPham\.sua\)[\s\S]{0,120}san_pham/.test(js) &&
     /if \(!qKho\.nap_luot\)[\s\S]{0,120}ton_kho/.test(js));
  ok('Giao diện cắt tab "Điều chỉnh" bằng đúng cờ `kho.dieu_chinh`',
     /if \(!qKho\.dieu_chinh\)[\s\S]{0,200}dieuchinh/.test(js));

  /* Ai THẤY nút mà gọi bị chặn? Ai KHÔNG thấy nút mà gọi lại được?
     `thayNut` phải dựng bằng ĐÚNG hai cờ `khoiDongNapFile` đang soi
     (`san_pham.sua` · `kho.nap_luot`) — dùng `thao_tac` như bản cũ là so hai
     luật khác nhau rồi kết luận "khớp". */
  let lech = [];
  for (const b of bang) {
    const napTonDuoc = quyen.duocNapTonHangLoat({ vai_tro: b.v });
    const thayNut = (b.t1 || b.t2) && (b.sua || napTonDuoc);
    if (thayNut !== (b.napSP || b.napTon)) lech.push(b.v);
  }
  ok('Không vai trò nào lệch giữa "thấy nút" và "gọi được"', lech.length === 0, lech.join(', '));

  /* ghiThat tự kiểm quyền lần nữa (phòng khi index.js sót) */
  const db = dungCsdl(), env = dungD1(db);
  const r1 = await nạp(env, csvSP(3), GHEP_SP, 'san_pham', 'x.csv', { nhan_su_id: 'NS-NGOC', vai_tro: 'ke_toan_truong' });
  ok('ghiThat tự chặn 403 dù index.js có sót', r1.ma === 403, JSON.stringify(r1).slice(0, 90));
  const r2 = await nạp(env, csvSP(3), GHEP_SP, 'san_pham', 'x.csv', { nhan_su_id: 'NS-NGOC', vai_tro: 'nhan_vien_kho' });
  ok('nhan_vien_kho bị ghiThat chặn khi nạp DANH MỤC', r2.ma === 403, JSON.stringify(r2).slice(0, 90));

  /* xemTruoc có kiểm quyền không? (index.js kiểm, nhưng hàm thì sao) */
  const db2 = dungCsdl(), env2 = dungD1(db2);
  let xemLoi = null;
  try {
    const bang2 = await nap.docBangTuByte(csvSP(3), 'x.csv');
    await nap.xemTruoc(env2, { nhan_su_id: 'X', vai_tro: 'nguoi_dung' }, { bang: bang2, ghep: GHEP_SP, maDich: 'san_pham', vanTay: 'v' });
  } catch (e) { xemLoi = e; }
  tin(`xemTruoc với vai "nguoi_dung": ${xemLoi ? 'ném lỗi' : 'CHẠY BÌNH THƯỜNG (chỉ đọc — cửa chặn nằm ở index.js)'}`);
}

/* ==========================================================================
   E. GHI VẾT
   ========================================================================== */
console.log('\n══ E. GHI VẾT ══');
{
  const db = dungCsdl(), env = dungD1(db);
  await nạp(env, csvSP(4), GHEP_SP, 'san_pham', 'DanhMuc_T9_final(2).xlsx');
  const v = db.prepare(`SELECT * FROM lich_su_thay_doi_nen WHERE bang='san_pham' LIMIT 1`).get();
  tin(JSON.stringify(v));
  ok('Có: ai nạp', !!v.nguoi_ten && !!v.nguoi_id);
  ok('Có: file gì', /DanhMuc_T9_final\(2\)\.xlsx/.test(v.ly_do || ''));
  ok('Có: lúc nào', !!v.luc);
  ok('Có: bao nhiêu dòng — cho DANH MỤC thì chỉ có 1 vết/dòng, không có con số tổng',
     Number(db.prepare(`SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen`).get().n) === 4,
     'mỗi mã một vết (4 vết cho 4 dòng) — tra được nhưng phải tự đếm');
  const cot = db.prepare(`PRAGMA table_info(lich_su_thay_doi_nen)`).all().map(c => c.name);
  ok('KHÔNG đẻ bảng mới cho ghi vết', cot.includes('bang') && cot.includes('ly_do'));
  const bangMoi = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%nap%'`).all().map(r => r.name);
  ok('Chỉ thêm ĐÚNG bảng nap_ghep_cot (nhớ ghép cột), không thêm bảng ghi vết nào',
     bangMoi.length === 1 && bangMoi[0] === 'nap_ghep_cot', bangMoi.join(','));

  const idx = readFileSync(path.join(GOC, 'src', 'index.js'), 'utf8');
  ok('Đọc lại được vết của san_pham qua API (bảng nằm trong SUA_BANG_HOP_LE)',
     /SUA_BANG_HOP_LE = new Set\(\[[^\]]*'san_pham'[^\]]*'giao_dich_kho'/.test(idx));
}

/* ==========================================================================
   F. RANH GIỚI AI / MẠNG — soi CẢ CÂY PHỤ THUỘC
   ========================================================================== */
console.log('\n══ F. RANH GIỚI AI / MẠNG ══');
{
  const daXem = new Set(); const cay = [];
  (function di(f) {
    if (daXem.has(f)) return; daXem.add(f); cay.push(f);
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const p = path.resolve(path.dirname(f), m[1]);
      if (existsSync(p)) di(p);
    }
  })(path.join(GOC, 'src', 'nap-du-lieu.js'));
  tin('cây phụ thuộc: ' + cay.map(f => path.basename(f)).join(' → '));
  let ban = [];
  for (const f of cay) {
    const s = readFileSync(f, 'utf8');
    // bỏ ghi chú trước khi soi, không thì bắt oan chữ trong lời giải thích
    const ma = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const re of [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /AI\s*\.\s*run/, /\bai\.run\b/,
                      /env\.AI\b/, /anthropic/i, /openai/i, /gemini/i, /\bgoiAI\b/, /WebSocket/]) {
      if (re.test(ma)) ban.push(`${path.basename(f)} ⟵ ${re}`);
    }
  }
  ok('Không một lời gọi AI / mạng nào trong CẢ cây phụ thuộc của đường nạp',
     ban.length === 0, ban.join(' · '));
  ok('Cây phụ thuộc đúng 4 file (nap-du-lieu · doc-bang · canh-bao-ghi · quyen)',
     cay.length === 4, String(cay.length));
}

/* ==========================================================================
   G. CÂU LỖI RA NGƯỜI DÙNG — ca người xây chưa thử
   ========================================================================== */
console.log('\n══ G. CÂU LỖI ══');
{
  const ca = [
    ['file toàn khoảng trắng', B('   \n  \n')],
    ['chỉ có một ô', B('A')],
    ['tiêu đề rỗng hết', B(',,,\n1,2,3,4\n')],
    ['file JSON đổi đuôi .csv', B('{"a":1,"b":[2,3]}')],
    ['file HTML (xuất nhầm từ web)', B('<html><body><table><tr><td>a</td></tr></table></body></html>')],
    ['file nhị phân ngẫu nhiên', new Uint8Array([0x1F, 0x8B, 0x08, 0x00, 0x99, 0x42, 0x13, 0xA7, 0xEE])],
    ['CSV mã TCVN3/CP1258 (không phải UTF-8)', new Uint8Array([0x4D, 0xE3, 0x20, 0x53, 0x4B, 0x55, 0x0A, 0xFF, 0xFE, 0x41])]
  ];
  for (const [ten, byte] of ca) {
    let r = null, e = null;
    try { r = await docb.docBang(byte, 'x.csv'); } catch (er) { e = er; }
    const cau = e ? e.message : '(đọc được: ' + JSON.stringify(r.cot).slice(0, 60) + ')';
    const nguoiHieu = e ? (e.name === 'LoiDocBang' && /[àáâãèéêìíòóôõùúýăđĩũơư]/i.test(e.message) && e.message.length > 30) : null;
    ok(`${ten}: câu lỗi bằng tiếng người (hoặc đọc được)`, e ? nguoiHieu : true, cau.slice(0, 110));
  }
  // Câu lỗi có nói DÒNG nào CỘT nào không?
  const xau = B('Mã SKU,Tên sản phẩm,Tồn tối thiểu\nSP-1,Hạt điều,mười\nSP-2,,5\nSP-1,Trùng,3\n');
  const b = await nap.docBangTuByte(xau, 'xau.csv');
  const kb = nap.kiemBang(b, { ma_sku: 0, ten: 1, ton_toi_thieu: 2 }, 'san_pham');
  for (const l of kb.loi) tin(l.thongDiep);
  ok('Mỗi câu lỗi có SỐ DÒNG', kb.loi.every(l => /Dòng \d+/.test(l.thongDiep)));
  ok('Câu lỗi kiểu số có TÊN CỘT', kb.loi.some(l => /cột Tồn tối thiểu/.test(l.thongDiep)));
  ok('Bắt được ô bắt buộc để trống', kb.loi.some(l => /bắt buộc/.test(l.thongDiep)));
  // file SẠCH (không ô nào hỏng) mới đo được luật trùng khoá cho đúng
  const bs = await nap.docBangTuByte(B('Mã SKU,Tên sản phẩm\nSP-1,Hạt điều\nSP-2,Hạnh nhân\nSP-1,Hạt điều loại 2\n'), 't.csv');
  const kbs = nap.kiemBang(bs, { ma_sku: 0, ten: 1 }, 'san_pham');
  tin(kbs.loi.map(l => l.thongDiep).join(' | '));
  ok('Bắt được mã trùng trong chính file', kbs.loi.some(l => /đã xuất hiện ở dòng/.test(l.thongDiep)) && kbs.banGhi.length === 2);
}

/* ==========================================================================
   H. GIAO DIỆN — chạm 44px · vừa màn 375px · ba màu
   ========================================================================== */
console.log('\n══ H. GIAO DIỆN (đọc mã, phần đo trên trình duyệt để cổng khói lo) ══');
{
  const html = readFileSync(path.join(GOC, 'public', 'app.html'), 'utf8');
  const css = readFileSync(path.join(GOC, 'public', 'assets', 'css', 'style.css'), 'utf8');
  const khoiNap = (html.match(/id="kv-pane-napfile"[\s\S]*?(?=<div class="kv-pane"|<\/section>)/) || [''])[0];
  ok('Có khối màn Nạp từ file trong app.html', khoiNap.length > 200, `${khoiNap.length} ký tự`);
  ok('Không có thẻ <table> mới trong màn nạp (khỏi lo kéo ngang 375px)', !/<table/.test(khoiNap));
  const napCss = (css.match(/\.nap-[\s\S]*$/) || [''])[0];
  ok('CSS của màn nạp có luật chống tràn chữ dài',
     /overflow-wrap|word-break|min-width:\s*0/.test(css.slice(css.indexOf('nap-') - 4000)));
  const mauLa = [...(khoiNap + napCss).matchAll(/#[0-9a-f]{3,8}\b/gi)].map(m => m[0]);
  ok('Màn nạp không viết cứng mã màu (dùng token)', mauLa.length === 0, mauLa.join(' '));
  ok('Ô chọn/nút trong màn nạp không đặt chiều cao dưới 44px',
     !/\.nap-[a-z-]*\s*\{[^}]*(height|min-height):\s*(1?[0-9]|2[0-9]|3[0-9]|4[0-3])px/.test(css));
}

/* ========================================================================== */
console.log('\n' + '='.repeat(74));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (hong.length) { console.log('\nCHỖ TRƯỢT:'); hong.forEach(h => console.log('  ✗ ' + h)); }
process.exit(truot ? 1 : 0);
