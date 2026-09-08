/* Hồ Ly vòng 2 — kiểm lại 3 ca với ĐÚNG quy ước của kho.js (xuất = số ÂM) */
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
const tonThat = db => Number(db.prepare('SELECT COALESCE(SUM(so_luong),0) AS t FROM giao_dich_kho').get().t);

console.log('── C-12 kiểm lại: XUẤT KHO ghi ĐÚNG quy ước kho.js (so_luong ÂM) ──');
{
  const db = dungCsdl(), env = dungD1(db);
  let s = 'Mã SKU,Tên sản phẩm\n'; for (let i = 1; i <= 20; i++) s += `SP-${i},Hạt ${i}\n`;
  await ghi(env, B(s), { ma_sku: 0, ten: 1 }, 'san_pham', 'sp.csv');
  let t = 'Mã SKU,Số lượng tồn\n'; for (let i = 1; i <= 20; i++) t += `SP-${i},100\n`;
  const k = await ghi(env, B(t), { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'Ton.csv');
  console.log('   tồn sau khi nạp file       :', tonThat(db));
  // Kinh doanh bán: xuất 80/mã — kho.js chèn so_luong ÂM, và chỉ cho xuất vì tồn đủ
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
              SELECT 'px_ban_01', id, 'xuat', -80, 'Xuất bán cho khách', 'NS-NGOC' FROM san_pham`).run();
  console.log('   tồn sau khi xuất bán 80/mã :', tonThat(db));
  const g = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  console.log('   tồn SAU KHI GỠ lượt nạp    :', tonThat(db));
  console.log('   ERP nói với Sếp            :', g.tin);
  const am = db.prepare(`SELECT COUNT(*) AS n FROM (SELECT san_pham_id, SUM(so_luong) t FROM giao_dich_kho GROUP BY san_pham_id) WHERE t < 0`).get().n;
  console.log('   số mã có tồn ÂM sau khi gỡ :', am, '/ 20');
  console.log('   ⇒', am > 0 ? '❌ huyLuotNap phá vỡ bất biến "tồn ≥ 0" mà chính xuatKho() bắt buộc' : '✅');
}

console.log('\n── F3/F4 kiểm lại với demDong: true (đúng cách bước 1 gọi) ──');
{
  const { deflateRawSync } = await import('node:zlib');
  function zip(files) {
    const enc = new TextEncoder(); const loc = []; const cen = []; let off = 0;
    for (const [ten, noi] of files) {
      const nb = enc.encode(ten); const d = enc.encode(noi); const cb = deflateRawSync(d);
      let crc = ~0; for (const b of d) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1)); } crc = ~crc >>> 0;
      const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8);
      h.writeUInt32LE(crc, 14); h.writeUInt32LE(cb.length, 18); h.writeUInt32LE(d.length, 22); h.writeUInt16LE(nb.length, 26);
      loc.push(h, nb, cb);
      const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
      c.writeUInt32LE(crc, 16); c.writeUInt32LE(cb.length, 20); c.writeUInt32LE(d.length, 24); c.writeUInt16LE(nb.length, 28);
      c.writeUInt32LE(off, 42); cen.push(c, nb); off += 30 + nb.length + cb.length;
    }
    const cbuf = Buffer.concat(cen); const e = Buffer.alloc(22);
    e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10);
    e.writeUInt32LE(cbuf.length, 12); e.writeUInt32LE(off, 16);
    return new Uint8Array(Buffer.concat([Buffer.concat(loc), cbuf, e]));
  }
  const hang = (r, cs) => `<row r="${r}">${cs.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${r}" t="inlineStr"><is><t>${v}</t></is></c>`).join('')}</row>`;
  function lamXlsx(bangs) {
    const files = [
      ['[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`],
      ['_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${bangs.map((b, i) => `<sheet name="${b.ten}" sheetId="${i + 1}" ${b.hidden ? 'state="hidden" ' : ''}r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${bangs.map((b, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`]
    ];
    bangs.forEach((b, i) => files.push([`xl/worksheets/sheet${i + 1}.xml`,
      `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${b.rows.map((r, j) => hang(j + 1, r)).join('')}</sheetData></worksheet>`]));
    return zip(files);
  }
  const x1 = lamXlsx([{ ten: 'Nháp cũ', hidden: true, rows: [['Mã SKU', 'Tên'], ['XX-1', 'rác']] },
                      { ten: 'Chính thức', rows: [['Mã SKU', 'Tên'], ['SP-1', 'Hạt điều'], ['SP-2', 'Hạnh nhân']] }]);
  const b1 = await nap.docBangTuByte(x1, 'coban.xlsx', { demDong: true });
  console.log('   BẢNG ẨN — dsBang :', JSON.stringify(b1.dsBang));
  console.log('   BẢNG ẨN — đang đọc:', b1.tenBang, '| cảnh báo:', JSON.stringify(b1.canhBao));
  console.log('   ⇒', b1.tenBang === 'Nháp cũ' ? '❌ mặc định đọc BẢNG ĐANG BỊ ẨN, và không nói cho Sếp biết bảng nào ẩn' : '✅');

  const x2 = lamXlsx([{ ten: 'Trống', rows: [] },
                      { ten: 'Số liệu', rows: [['Mã SKU', 'Tên'], ['SP-1', 'Hạt điều']] }]);
  let loi = null, b2 = null;
  try { b2 = await nap.docBangTuByte(x2, 'rong.xlsx', { demDong: true }); } catch (e) { loi = e; }
  console.log('   BẢNG ĐẦU RỖNG   :', loi ? 'ném lỗi — ' + loi.message : JSON.stringify(b2.dsBang));
  console.log('   ⇒', loi && !/bảng/i.test(loi.message)
    ? '❌ câu lỗi KHÔNG nhắc file có 2 bảng, không chỉ Sếp sang bảng "Số liệu" — cụt đường'
    : '✅');

  const x3 = lamXlsx([{ ten: 'Data', rows: [['Mã SKU', 'Tên'], ['SP-1', 'A']] },
                      { ten: 'Data', rows: [['Mã SKU', 'Tên'], ['SP-2', 'B'], ['SP-3', 'C']] }]);
  const b3 = await nap.docBangTuByte(x3, 'trungten.xlsx', { demDong: true });
  console.log('   TRÙNG TÊN       :', JSON.stringify(b3.dsBang), '| cảnh báo:', JSON.stringify(b3.canhBao));
}
