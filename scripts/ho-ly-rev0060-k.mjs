/* ==========================================================================
   MẨU DÒ HỒ LY · REV-0060 VÒNG 4 — MÀN "ĐIỀU CHỈNH" TRÊN TRÌNH DUYỆT
   ---------------------------------------------------------------------------
   Bàn `ban-dieu-chinh` của người xây chỉ đi ĐÚNG một đường: chọn mã → chọn lô
   → gõ số → bấm. Mẩu dò này đi những đường nó KHÔNG đi:
     ① Chọn mã có lô rồi **KHÔNG chọn lô** mà bấm luôn — ô ghi "Lô hàng *" và
        lời nhắc ngay dưới nói sửa mức mã sẽ để lại lô âm. Cửa có đóng không?
     ② Gõ số THẬP PHÂN ("12.5") — đúng đường ngón tay của anh Duy cân hàng kg.
     ③ Thanh chuyển màn `#kvSeg` nay có 7 nút — @375px còn vừa một màn không?
     ④ Chạm ≥ 44px · không mã màu cứng.
   Chạy:  node scripts/ho-ly-rev0060-k.mjs [--rong=375]
   Thoát 0 — mẩu dò.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';

const kho = await import(new URL('file:///' + path.join(GOC, 'src', 'kho.js').replace(/\\/g, '/')));

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
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = OFF;');
for (const t of ['them-kho.sql', 'them-danhmuc-nen.sql', 'them-khoa-danhmuc-nen.sql', 'them-nap-ghep-cot.sql',
                 'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql']) {
  for (const c of tachCau(readFileSync(path.join(GOC, 'migrations', t), 'utf8'))) {
    try { db.exec(c); } catch (e) { if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e; }
  }
}
db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
         INSERT OR IGNORE INTO nhan_su VALUES ('${TOI_ID}','Bùi Thị Ngọc');`);

const moi = (sql, tso = []) => ({
  bind: (...a) => moi(sql, a),
  async run() { const k = db.prepare(sql).run(...tso); return { success: true, meta: { rows_written: Number(k.changes || 0) } }; },
  async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
  async all() { return { results: db.prepare(sql).all(...tso) }; }
});
const env = { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
const PHIEN = { nhan_su_id: TOI_ID, ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin' };

/* Cảnh di chứng CHẶN-ⓐ: lô A ÂM, lô B còn hàng. Và một mã bán theo KG. */
db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,danh_muc,don_vi,theo_doi_hsd,ton_toi_thieu) VALUES
   ('sp_hn','SP-00001','Hạnh nhân Mỹ 500g','Hạt','túi',1,5),
   ('sp_kg','SP-00002','Hạt điều rang muối (xá)','Hạt','kg',0,0)`).run();
db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES
   ('lo_a','sp_hn','LO-A','2026-10-01'), ('lo_b','sp_hn','LO-B','2027-01-01')`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id) VALUES
   ('px','sp_hn','lo_a','xuat',-100,'${TOI_ID}'), ('pn','sp_hn','lo_b','nhap',200,'${TOI_ID}'),
   ('pk','sp_kg',NULL,'nhap',20,'${TOI_ID}')`).run();

const tonLo = id => Number(db.prepare(`SELECT COALESCE(SUM(so_luong),0) t FROM giao_dich_kho WHERE lo_hang_id=?`).get(id).t);
const tonMa = id => Number(db.prepare(`SELECT COALESCE(SUM(so_luong),0) t FROM giao_dich_kho WHERE san_pham_id=?`).get(id).t);
const d = (k, v) => console.log(`   ${String(k).padEnd(50)} ${v}`);
const tieu = s => console.log('\n' + '─'.repeat(78) + '\n' + s + '\n' + '─'.repeat(78));

const RONG = Number((process.argv.find(a => a.startsWith('--rong=')) || '').split('=')[1]) || 375;
async function docThan(req) { const c = []; for await (const x of req) c.push(x); return Buffer.concat(c).toString('utf8'); }
const apiRieng = (duong, u, traJson, req) => {
  if (duong === '/api/toi-la-ai') {
    traJson({ ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
      quyen: ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'khovan'],
      kho: { thao_tac: true, quan_ly: true, gia_von: true }, san_pham: { sua: true, khoa: true } });
    return true;
  }
  if (duong === '/api/kho/san-pham') { (async () => traJson(await (await kho.danhSachSanPham(env, PHIEN)).json()))(); return true; }
  if (duong === '/api/kho/lo') {
    (async () => traJson(await (await kho.loTheoSanPham(env, PHIEN, u.searchParams.get('san_pham_id'), u.searchParams.get('tat_ca') === '1')).json()))();
    return true;
  }
  if (duong === '/api/kho/dieu-chinh') {
    (async () => { const b = JSON.parse(await docThan(req));
      const r = await kho.dieuChinhKho(env, PHIEN, b); traJson(await r.json(), r.status); })();
    return true;
  }
  return false;
};

const may = await dungMayGia({ tatHoatAnh: true, apiRieng });
const trinh = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, cao: 812, doiMs: 2600 });
const { chay, loiConsole, ngoaiLe, dong } = trinh;
const cho = ms => new Promise(r => setTimeout(r, ms));

try {
  await chay(`document.querySelector('.nav-nut[data-tab="khovan"], [data-mo-tab="khovan"]')?.click()`);
  await cho(900);
  await chay(`document.querySelector('#kvSeg .seg-nut[data-kv="dieuchinh"]').click()`);
  await cho(400);

  tieu(`① CHỌN MÃ CÓ LÔ RỒI **KHÔNG CHỌN LÔ** MÀ BẤM — @${RONG}px`);
  d('dựng', `lô A = ${tonLo('lo_a')} (ÂM) · lô B = ${tonLo('lo_b')} · tồn mã = ${tonMa('sp_hn')}`);
  await chay(`document.getElementById('kvDcSPHienThi').click()`); await cho(300);
  await chay(`document.querySelector('#kvDcSPGoiY .ql-goiy-item[data-gt="sp_hn"]').click()`); await cho(800);
  d('ô "Lô hàng *" có hiện ra không', await chay(`!document.getElementById('kvDcLoO').hidden`));
  d('select#kvDcLo có thuộc tính required?', await chay(`document.getElementById('kvDcLo').required`));
  d('nhãn ghi', await chay(`document.querySelector('label[for="kvDcLo"]').textContent`));
  d('lời nhắc ngay dưới ô lô', String(await chay(`document.querySelector('#kvDcLoO .hint').textContent`)).trim());
  d('ô lô đang chọn giá trị', JSON.stringify(await chay(`document.getElementById('kvDcLo').value`)));
  /* KHÔNG đụng vào ô lô. Gõ số + lý do rồi bấm — đúng đường ngón tay. */
  await chay(`(()=>{const t=document.getElementById('kvDcTonThuc');t.value='200';t.dispatchEvent(new Event('input'));
                     const l=document.getElementById('kvDcLyDo');l.value='kiểm kê 07/09: đếm ngoài kho được 200 túi';l.dispatchEvent(new Event('input'));})()`);
  await chay(`document.getElementById('kvNutDieuChinh').click()`);
  await cho(1400);
  d('màn báo', String(await chay(`document.getElementById('kvOkDieuChinh').hidden
        ? 'LỖI: '+document.getElementById('kvLoiDieuChinh').textContent
        : document.getElementById('kvOkDieuChinh').textContent`)).slice(0, 150));
  d('SỔ CÁI SAU: lô A / lô B / tồn mã', `${tonLo('lo_a')} / ${tonLo('lo_b')} / ${tonMa('sp_hn')}`);
  d('⇒ lô A còn ÂM?', tonLo('lo_a') < 0 ? `CÓ (${tonLo('lo_a')}) — đúng thứ lời nhắc vừa cảnh báo` : 'không');
  {
    const x = await kho.xuatKho(env, PHIEN, { san_pham_id: 'sp_hn', so_luong: 200 });
    d('xuatKho(200) ngay sau đó', `HTTP ${x.status} ⇒ tồn mã = ${tonMa('sp_hn')} · lô A = ${tonLo('lo_a')}`);
  }

  tieu('② GÕ SỐ THẬP PHÂN — mã bán theo KG');
  await chay(`document.getElementById('kvDcSPHienThi').click()`); await cho(300);
  await chay(`document.querySelector('#kvDcSPGoiY .ql-goiy-item[data-gt="sp_kg"]').click()`); await cho(700);
  d('sổ đang ghi', `${tonMa('sp_kg')} kg`);
  await chay(`(()=>{const t=document.getElementById('kvDcTonThuc');t.value='12.5';t.dispatchEvent(new Event('input'));
                     const l=document.getElementById('kvDcLyDo');l.value='cân lại kho ngày 07/09, còn 12,5 kg';l.dispatchEvent(new Event('input'));})()`);
  d('ô nhập inputmode', await chay(`document.getElementById('kvDcTonThuc').inputMode`));
  await chay(`document.getElementById('kvNutDieuChinh').click()`); await cho(1300);
  d('màn báo cho anh Duy', String(await chay(`document.getElementById('kvOkDieuChinh').hidden
        ? 'LỖI: '+document.getElementById('kvLoiDieuChinh').textContent
        : document.getElementById('kvOkDieuChinh').textContent`)).slice(0, 150));
  d('SỔ CÁI GHI', `${tonMa('sp_kg')} kg`);

  tieu(`③ ④ LUẬT NHÀ @${RONG}px`);
  const s = await chay(`(()=>{
    const seg=document.getElementById('kvSeg');
    const nut=[...seg.querySelectorAll('.seg-nut')];
    const p=document.getElementById('kv-pane-dieuchinh');
    const nho=[...p.querySelectorAll('button,select,input,textarea,a')]
      .filter(e=>e.offsetParent!==null)
      .map(e=>({t:(e.id||e.tagName),h:Math.round(e.getBoundingClientRect().height)}))
      .filter(e=>e.h>0 && e.h<44);
    return {
      segNut: nut.length,
      segKeoNgang: Math.max(0, seg.scrollWidth - seg.clientWidth),
      segCao: Math.round(seg.getBoundingClientRect().height),
      bodyKeoNgang: Math.max(0, document.body.scrollWidth - document.body.clientWidth),
      paneKeoNgang: Math.max(0, p.scrollWidth - p.clientWidth),
      manCao: window.innerHeight,
      trangCao: document.documentElement.scrollHeight,
      duoi44: nho
    };})()`);
  d('số nút trong #kvSeg', s.segNut);
  d('thanh #kvSeg tràn ngang', `${s.segKeoNgang}px (cao ${s.segCao}px)`);
  d('body / pane tràn ngang', `${s.bodyKeoNgang} / ${s.paneKeoNgang}`);
  d('màn cao / trang cao', `${s.manCao} / ${s.trangCao} ⇒ ${s.trangCao > s.manCao ? 'PHẢI CUỘN ' + (s.trangCao - s.manCao) + 'px' : 'vừa một màn'}`);
  d('phần tử chạm < 44px', s.duoi44.length ? JSON.stringify(s.duoi44) : 'không có');
  const mau = await chay(`(()=>{const p=document.getElementById('kv-pane-dieuchinh');
     return /#[0-9a-fA-F]{3,8}\\b|rgb\\(/.test(p.getAttribute('style')||'') ||
            [...p.querySelectorAll('[style]')].some(e=>/#[0-9a-fA-F]{3,8}\\b|rgb\\(/.test(e.getAttribute('style')));})()`);
  d('có mã màu viết cứng trong màn không', mau ? 'CÓ' : 'không');
  d('lỗi console / ngoại lệ', `${loiConsole.length} / ${ngoaiLe.length} ${loiConsole.length ? JSON.stringify(loiConsole).slice(0, 150) : ''}`);
} finally {
  await dong(); may.dong();
}
console.log('\n(mẩu dò — luôn thoát 0)\n');
