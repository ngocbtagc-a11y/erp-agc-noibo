/* ==========================================================================
   BÀN NGHIỆM THU TRÊN TRÌNH DUYỆT — MÀN "NẠP TỪ FILE"
   ---------------------------------------------------------------------------
   Chạy:  npm run ban-nap-file

   VÌ SAO PHẢI CÓ. Bàn thử chứng minh LOGIC đúng; chỉ TRÌNH DUYỆT mới chứng
   minh TÍNH NĂNG CÒN SỐNG. REV-0038 từng bỏ lọt một tính năng CHẾT HOÀN TOÀN
   qua hai vòng soi liên tiếp vì không vòng nào nạp `app.js` trong trình
   duyệt. `do-nap-lai.mjs` đo đường máy chủ; bàn này đi đúng đường ngón tay
   Sếp đi: bấm tab → chọn file → ghép cột → xem trước → xác nhận → gỡ lại.

   MÁY CHỦ Ở ĐÂY LÀ THẬT. `apiRieng` gọi thẳng `src/nap-du-lieu.js` trên một
   CSDL `node:sqlite` dựng từ đúng `migrations/` — không phải trả lời giả.
   Nên cái màn hình này đang nói chuyện với đúng bộ nghiệp vụ chạy thật.

   BỐN CẢNH ĐI QUA:
     ① Nạp tồn kho lần đầu — bốn bước chạy trót lọt, số hiện đúng
     ② Nạp LẠI đúng file đó — màn phải NÓI RA và KHOÁ nút cho tới khi tick
     ③ Gỡ lượt nạp — tồn về như cũ ngay trên màn
     ④ Vai Kinh doanh (không có tab Kho vận) — vẫn mở được màn nạp
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';

const nap = await import(new URL('file:///' + path.join(GOC, 'src', 'nap-du-lieu.js').replace(/\\/g, '/')));

let dat = 0, truot = 0; const hong = [];
function ok(ten, dung, ct = '') {
  if (dung) { dat++; console.log(`  ✓ ${ten}${ct ? ' — ' + ct : ''}`); }
  else { truot++; hong.push(ten + (ct ? ` — ${ct}` : '')); console.log(`  ✗ ${ten}${ct ? ' — ' + ct : ''}`); }
}
const tin = s => console.log('    · ' + s);

/* ---- CSDL thật + giả lập D1 (cùng lối do-nap-ghi-d1.mjs) ---------------- */
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
for (const t of ['them-kho.sql', 'them-khoa-danhmuc-nen.sql', 'them-nap-ghep-cot.sql',
                 'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql']) {
  for (const c of tachCau(readFileSync(path.join(GOC, 'migrations', t), 'utf8'))) {
    try { db.exec(c); } catch (e) { if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e; }
  }
}
db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
         INSERT OR IGNORE INTO nhan_su VALUES ('${TOI_ID}','Bùi Thị Ngọc');`);

const idx = new Map();
const demIdx = b => { if (!idx.has(b)) idx.set(b, Number(db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND tbl_name=?`).get(b).n)); return idx.get(b); };
const bangCua = s => { const m = s.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([a-z_]+)/i) || s.match(/UPDATE\s+([a-z_]+)/i); return m ? m[1] : null; };
const moi = (sql, tso = []) => ({
  bind: (...a) => moi(sql, a),
  async run() { const k = db.prepare(sql).run(...tso); const b = bangCua(sql), d = Number(k.changes || 0); return { success: true, meta: { rows_written: b ? d * (1 + demIdx(b)) : d } }; },
  async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
  async all() { return { results: db.prepare(sql).all(...tso) }; }
});
const env = { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
const PHIEN = { nhan_su_id: TOI_ID, ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin' };

/* 40 mã hàng có sẵn để file tồn kho khớp được */
{
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  for (let i = 1; i <= 40; i++) s += `SP-${String(i).padStart(5, '0')},"Hạt điều gói ${i}",Hạt,túi,5\n`;
  const bang = await nap.docBangTuByte(new TextEncoder().encode(s), 'sp.csv');
  await nap.ghiThat(env, PHIEN, { bang, ghep: { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 },
                                  maDich: 'san_pham', tenTep: 'sp.csv' });
}
const tonCua = () => Number(db.prepare(
  `SELECT COALESCE(SUM(CASE WHEN loai='nhap' THEN so_luong ELSE -so_luong END),0) AS t FROM giao_dich_kho`).get().t);

/* Vai đo: mặc định Kho vận. `--kinh-doanh` dựng đúng cảnh REV-0060 CAO-⑥ —
   người có quyền sửa danh mục SKU nhưng KHÔNG có tab Kho vận. */
const VAI_KINH_DOANH = process.argv.includes('--kinh-doanh');
const RONG = Number((process.argv.find(a => a.startsWith('--rong=')) || '').split('=')[1]) || 1440;

/* ---- Cửa API thật cho trình duyệt gọi ---------------------------------- */
function bocKhung(khung) {
  const dai = ((khung[0] << 24) | (khung[1] << 16) | (khung[2] << 8) | khung[3]) >>> 0;
  return { moTa: JSON.parse(new TextDecoder().decode(khung.subarray(4, 4 + dai))), byte: khung.subarray(4 + dai) };
}
async function docThan(req) {
  const cuc = [];
  for await (const c of req) cuc.push(c);
  return new Uint8Array(Buffer.concat(cuc));
}
const apiRieng = (duong, u, traJson, req) => {
  /* Bộ quyền phải có `kho` và `san_pham` — giao diện cắt nút theo ĐÚNG hai cờ
     này (không theo tab). Thiếu chúng là màn nạp bị gỡ khỏi thanh chuyển màn,
     đúng như bản `TOI` mặc định của thư viện dùng chung. */
  if (duong === '/api/toi-la-ai') {
    traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
      quyen: VAI_KINH_DOANH
        ? ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'kinhdoanh']
        : ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu', 'khovan', 'kinhdoanh'],
      kho: VAI_KINH_DOANH
        ? { thao_tac: false, quan_ly: false, gia_von: false }
        : { thao_tac: true, quan_ly: true, gia_von: true },
      san_pham: { sua: true, khoa: true }
    });
    return true;
  }
  if (!duong.startsWith('/api/kho/nap')) return false;
  (async () => {
    try {
      if (duong === '/api/kho/nap-luot') {
        return traJson(await nap.dsLuotNap(env, PHIEN, 10));
      }
      if (duong === '/api/kho/nap-huy') {
        const b = JSON.parse(new TextDecoder().decode(await docThan(req)));
        const kq = await nap.huyLuotNap(env, PHIEN, b.phieu_id);
        return kq.loi ? traJson({ loi: kq.loi }, kq.ma || 400) : traJson(kq);
      }
      const { moTa, byte } = bocKhung(await docThan(req));
      const ten = String(moTa.ten_tep || 'file');
      if (duong === '/api/kho/nap-mo') {
        return traJson(await nap.moFile(env, PHIEN, byte, ten, moTa.dich, Number(moTa.bang_chon) || 0));
      }
      const bang = await nap.docBangTuByte(byte, ten, { bangChon: Number(moTa.bang_chon) || 0 });
      if (duong === '/api/kho/nap-xem') {
        return traJson(await nap.xemTruoc(env, PHIEN,
          { bang, ghep: moTa.ghep || {}, maDich: moTa.dich, vanTay: await nap.vanTayCot(bang.cot) }));
      }
      if (duong === '/api/kho/nap-ghi') {
        const kq = await nap.ghiThat(env, PHIEN, { bang, ghep: moTa.ghep || {}, maDich: moTa.dich,
                                                   tenTep: ten, xacNhanTrung: moTa.xac_nhan_trung === true });
        return kq.loi ? traJson({ loi: kq.loi }, kq.ma || 400) : traJson(kq);
      }
      traJson({ loi: 'không rõ cửa' }, 404);
    } catch (e) {
      traJson({ loi: e && e.name === 'LoiDocBang' || e.name === 'LoiGhiNua'
        ? e.message : 'Không đọc được file này.' }, 400);
    }
  })();
  return true;
};

/* ---- Nội dung file dùng cho các cảnh ----------------------------------- */
let CSV_TON = 'Mã SKU,Số lượng tồn\n';
for (let i = 1; i <= 40; i++) CSV_TON += `SP-${String(i).padStart(5, '0')},100\n`;
/* Danh mục cho vai Kinh doanh — mã KHÁC hẳn để là dòng THÊM MỚI thật. */
let CSV_SP = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
for (let i = 1; i <= 40; i++) CSV_SP += `KD-${String(i).padStart(5, '0')},"Hạnh nhân gói ${i}",Hạt,túi,5\n`;

/* ==========================================================================
   CHẠY
   ========================================================================== */
const may = await dungMayGia({ tatHoatAnh: true, apiRieng });
const trinh = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, cao: 900, doiMs: 2600 });
const { chay, loiConsole, ngoaiLe, dong } = trinh;

const cho = ms => new Promise(r => setTimeout(r, ms));

console.log(`\n══ MÀN NẠP TỪ FILE TRÊN TRÌNH DUYỆT @${RONG}px ` +
            `(vai ${VAI_KINH_DOANH ? 'Kinh doanh — KHÔNG có tab Kho vận' : 'Kho vận'}) ══`);

try {
  /* ---- Mở đúng màn ----
     Hai đường, đúng hai vai: Kho vận bấm ở `#kvSeg`, Kinh doanh bấm ở
     `#kdSeg` (nút do `khoiDongNapFile` cắm vào khi không có tab Kho vận). */
  const oSeg = VAI_KINH_DOANH ? 'kdSeg' : 'kvSeg';
  const oData = VAI_KINH_DOANH ? 'data-kd' : 'data-kv';
  const moMan = await chay(`(() => {
    const nut = document.querySelector('#${oSeg} .seg-nut[${oData}="napfile"]');
    if (!nut) return 'không thấy nút Nạp từ file trong #${oSeg}';
    const tab = document.querySelector('.sb-item[data-tab="${VAI_KINH_DOANH ? 'kinhdoanh' : 'khovan'}"]');
    if (!tab) return 'không thấy tab ${VAI_KINH_DOANH ? 'kinhdoanh' : 'khovan'} ở thanh bên';
    tab.click();
    nut.click();
    const pane = document.getElementById('kv-pane-napfile');
    if (!pane) return 'không thấy khối màn nạp';
    if (pane.hidden) return 'khối màn nạp vẫn ẩn';
    return pane.offsetParent === null ? 'khối màn nạp không hiện ra (cha đang ẩn)' : 'OK';
  })()`);
  ok(`Mở được màn "Nạp từ file" từ thanh chuyển màn ${VAI_KINH_DOANH ? 'Kinh doanh' : 'Kho vận'}`,
     moMan === 'OK', String(moMan));

  /* ---- BƯỚC 1: chọn đích + đưa file vào ----
     Vai Kinh doanh KHÔNG có quyền thao tác kho, nên lựa chọn "Tồn kho đầu kỳ"
     phải BIẾN MẤT khỏi danh sách — thà không hiện còn hơn hiện rồi 403 sau
     khi Sếp đã chọn xong file. Vai này chỉ nạp DANH MỤC. */
  const DICH = VAI_KINH_DOANH ? 'san_pham' : 'ton_kho';
  const coDich = await chay(`(() => {
    const o = document.getElementById('napDich');
    const co = [...o.options].map(x => x.value);
    o.value = '${DICH}';
    o.dispatchEvent(new Event('change', { bubbles: true }));
    return JSON.stringify({ co, dat: o.value });
  })()`).then(JSON.parse);
  if (VAI_KINH_DOANH) {
    ok('Kinh doanh KHÔNG được mời chọn "Tồn kho đầu kỳ"',
       !coDich.co.includes('ton_kho') && coDich.co.includes('san_pham'), JSON.stringify(coDich.co));
  }
  ok(`Chọn được đích nạp "${DICH}"`, coDich.dat === DICH, coDich.dat);

  const NOI_DUNG = VAI_KINH_DOANH ? CSV_SP : CSV_TON;
  const datTep = async (ten) => chay(`(async () => {
    const inp = document.getElementById('napChonTep');
    const dt = new DataTransfer();
    dt.items.add(new File([${JSON.stringify(NOI_DUNG)}], ${JSON.stringify(ten)}, { type: 'text/csv' }));
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return 'da-tha';
  })()`);

  await datTep(VAI_KINH_DOANH ? 'DanhMuc_T9.csv' : 'TonDauKy.csv');
  await cho(1200);

  const b2 = await chay(`(() => {
    const p = document.getElementById('nap-b2');
    const sel = [...document.querySelectorAll('#napGhepO select')].map(s => s.id + '=' + s.value);
    return JSON.stringify({ hienB2: p && !p.hidden, ghep: sel,
      hint: document.getElementById('napB2Hint').textContent,
      mau: document.getElementById('napM-${VAI_KINH_DOANH ? 'ten' : 'so_luong'}')?.textContent || '',
      loi: document.getElementById('nap-loi').textContent });
  })()`);
  const d2 = JSON.parse(b2);
  tin(`bước 2: ${d2.hint}`);
  ok('Đọc file xong nhảy sang bước GHÉP CỘT', d2.hienB2 === true, d2.loi || '');
  ok('Máy gợi ý sẵn hai cột bắt buộc',
     d2.ghep.includes('napG-ma_sku=0') &&
     d2.ghep.includes(VAI_KINH_DOANH ? 'napG-ten=1' : 'napG-so_luong=1'), JSON.stringify(d2.ghep));
  ok('Có hiện MẪU đọc thử cho Sếp đối chiếu bằng mắt', /Đọc thử/.test(d2.mau), d2.mau.slice(0, 60));

  /* ---- BƯỚC 2 → 3 ---- */
  await chay(`document.getElementById('napB2Tiep').click()`);
  await cho(1200);
  const b3 = await chay(`(() => {
    const p = document.getElementById('nap-b3');
    return JSON.stringify({ hien: p && !p.hidden,
      the: document.getElementById('napTomTat').textContent.replace(/\\s+/g, ' ').trim(),
      trungHien: !document.getElementById('napTrungO').hidden,
      nutTat: document.getElementById('napB3Ghi').disabled,
      nutChu: document.getElementById('napB3Ghi').textContent });
  })()`);
  const d3 = JSON.parse(b3);
  tin(`thẻ xem trước: ${d3.the.slice(0, 100)}`);
  ok('Sang được bước XEM TRƯỚC', d3.hien === true);
  ok('Lần đầu KHÔNG hiện cảnh báo trùng (không doạ oan)', d3.trungHien === false);
  ok('Nút xác nhận mở và nói rõ nạp bao nhiêu dòng',
     d3.nutTat === false && /40 dòng/.test(d3.nutChu), d3.nutChu);

  /* ---- BƯỚC 3 → 4: GHI THẬT ---- */
  const tonTruoc = tonCua();
  const spTruoc = Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n);
  await chay(`document.getElementById('napB3Ghi').click()`);
  await cho(1500);
  const b4 = await chay(`(() => {
    const p = document.getElementById('nap-b4');
    return JSON.stringify({ hien: p && !p.hidden,
      the: document.getElementById('napKetQua').textContent.replace(/\\s+/g, ' ').trim(),
      goHien: !document.getElementById('napB4GoNut').hidden,
      goChu: document.getElementById('napB4Go').textContent.slice(0, 60),
      loi: document.getElementById('nap-loi3').textContent });
  })()`);
  const d4 = JSON.parse(b4);
  tin(`kết quả: ${d4.the.slice(0, 110)}`);
  ok('Ghi xong nhảy sang bước 4 và hiện kết quả', d4.hien === true, d4.loi || '');
  if (VAI_KINH_DOANH) {
    const spSau = Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n);
    ok('CSDL THẬT nhận đủ 40 mã hàng mới do Kinh doanh nạp', spSau - spTruoc === 40, `+${spSau - spTruoc}`);
    ok('Nạp danh mục KHÔNG hiện nút gỡ lượt nạp (đường lùi chỉ dành cho sổ cái kho)',
       d4.goHien === false);
  } else {
    ok('SỔ CÁI THẬT nhận đúng 4.000 đơn vị', tonCua() - tonTruoc === 4000, String(tonCua()));
    ok('Bước 4 hiện sẵn ĐƯỜNG LÙI (nút gỡ lượt nạp)', d4.goHien === true, d4.goChu);
  }

  /* ---- CẢNH ②+③: chỉ có nghĩa với TỒN KHO ----
     Danh mục khớp theo `ma_sku` nên nạp lại không nhân đôi (đã có bàn đo
     riêng); còn đường gỡ lượt nạp là đường của SỔ CÁI KHO. Vai Kinh doanh
     không có hai thứ đó, đo ở đây là đo cảnh không tồn tại. */
  if (!VAI_KINH_DOANH) {
  /* ---- CẢNH ②: NẠP LẠI ĐÚNG FILE ĐÓ ---- */
  console.log('\n② Nạp LẠI đúng file đó — màn phải nói ra và khoá nút');
  await chay(`document.getElementById('napB4Moi').click()`);
  await cho(400);
  await datTep('TonDauKy.csv');
  await cho(1200);
  await chay(`document.getElementById('napB2Tiep').click()`);
  await cho(1300);
  const t2 = JSON.parse(await chay(`JSON.stringify({
    trungHien: !document.getElementById('napTrungO').hidden,
    cau: document.getElementById('napTrungCau').textContent,
    canh: document.getElementById('napCanhBao').textContent.replace(/\\s+/g,' ').trim(),
    nutTat: document.getElementById('napB3Ghi').disabled,
    coTick: !!document.getElementById('napTrungTick'),
    tickHien: !document.getElementById('napTrungTickO').hidden,
    goHien: !document.getElementById('napTrungGoO').hidden,
    goHint: document.getElementById('napTrungGoHint').textContent,
    coNutGo: !!document.querySelector('#napTrungDs [data-nap-go]')
  })`));
  tin(`câu cảnh báo: ${String(t2.cau).slice(0, 120)}`);
  ok('Màn hiện khối cảnh báo TRÙNG', t2.trungHien === true);
  ok('Câu cảnh báo nói rõ file đã nạp rồi và nạp tiếp là CỘNG THÊM',
     /đã nạp rồi/i.test(t2.cau) && /cộng thêm/i.test(t2.cau), String(t2.cau).slice(0, 80));
  ok('Nút xác nhận bị TẮT — không cho bấm trôi', t2.nutTat === true);
  ok('Có sẵn nút gỡ lượt nạp cũ ngay trong khối cảnh báo', t2.coNutGo === true);

  /* ---- HAI LỚP, HAI CỬA (REV-0060 vòng 2 · CAO-⑤) ----
     Đây là ca TRÙNG NGUYÊN FILE = lớp (a), tín hiệu mạnh nhất: đúng từng dòng
     từng con số. Cửa của nó phải là GÕ LẠI TÊN FILE chứ không phải cái tick —
     cái tick còn dùng cho lớp (b), mà lớp (b) kêu ở mọi lần kho nhập lại cùng
     mã nên nó đã thành phản xạ. */
  ok('Trùng NGUYÊN FILE: ô tick bị GIẤU ĐI, hiện ô gõ lại tên file',
     t2.tickHien === false && t2.goHien === true, `tick hiện ${t2.tickHien} · ô gõ tên hiện ${t2.goHien}`);
  ok('Và chỉ rõ phải gõ đúng chữ gì', /TonDauKy\.csv/.test(t2.goHint), String(t2.goHint));

  const tonGiuNguyen = tonCua();
  const goTen = async ten => {
    await chay(`(() => { const o = document.getElementById('napTrungGo');
      o.value = ${JSON.stringify(ten)}; o.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await cho(250);
    return chay(`document.getElementById('napB3Ghi').disabled`);
  };
  await chay(`(() => { const t = document.getElementById('napTrungTick');
    t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await cho(250);
  ok('Tick vào ô kia KHÔNG mở được cửa lớp (a)',
     await chay(`document.getElementById('napB3Ghi').disabled`) === true);
  ok('Gõ SAI tên file: nút vẫn TẮT', await goTen('TonDauKy_sai.csv') === true);
  const moKhoa = await goTen('TonDauKy.csv');
  ok('Gõ ĐÚNG tên file thì nút mới mở ra (chặn chứ không khoá chết)', moKhoa === false, String(moKhoa));
  ok('Trong suốt lúc đó, sổ cái KHÔNG đổi một dòng nào', tonCua() === tonGiuNguyen, String(tonCua()));

  /* ---- CẢNH ③: GỠ LƯỢT NẠP ---- */
  console.log('\n③ Gỡ lượt nạp — tồn phải về như cũ');
  const phieu = db.prepare(`SELECT ban_ghi_id FROM lich_su_thay_doi_nen
                             WHERE bang='giao_dich_kho' AND truong='nap_file' ORDER BY id DESC LIMIT 1`).get().ban_ghi_id;
  /* ⚠️ PHẢI THAY `confirm` TRƯỚC KHI BẤM. Gỡ lượt nạp là việc xoá dòng khỏi
     sổ cái nên có hộp hỏi lại; hộp đó treo cả trang trong Chrome headless và
     CDP không bao giờ trả lời — bàn đo treo 10 phút chứ không đỏ. */
  await chay(`(() => { window.confirm = () => true; return 1; })()`);
  await chay(`document.querySelector('#napTrungDs [data-nap-go]').click()`);
  await cho(1500);
  ok('Gỡ xong sổ cái về đúng số trước khi nạp', tonCua() === tonTruoc,
     `${tonGiuNguyen} → ${tonCua()} · trước khi nạp ${tonTruoc}`);
  const vet = db.prepare(`SELECT gia_tri_moi FROM lich_su_thay_doi_nen WHERE ban_ghi_id=?`).get(phieu);
  ok('Lượt nạp bị đánh dấu "đã gỡ" trong ghi vết', vet && vet.gia_tri_moi === 'đã gỡ',
     String(vet && vet.gia_tri_moi));
  }

  /* ---- Console sạch ---- */
  ok('Không lỗi console trong cả luồng', loiConsole.length === 0, loiConsole.slice(0, 2).join(' | '));
  ok('Không ngoại lệ chưa bắt', ngoaiLe.length === 0, ngoaiLe.slice(0, 2).join(' | '));

  /* ---- Vừa màn: không đẻ thanh kéo ngang ---- */
  const tran = await chay(`(() => {
    const p = document.getElementById('kv-pane-napfile');
    return JSON.stringify({ body: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                            pane: p.scrollWidth - p.clientWidth });
  })()`);
  const dt = JSON.parse(tran);
  ok(`Màn nạp không đẻ thanh kéo ngang @${RONG}px`, dt.body <= 0 && dt.pane <= 0, JSON.stringify(dt));
} finally {
  await dong();
  may.dong();
}

console.log('\n' + '='.repeat(70));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) { console.log('\nCHỖ TRƯỢT:'); hong.forEach(h => console.log('  ✗ ' + h)); console.log('\n❌ ĐỎ'); process.exit(1); }
console.log('✅ XANH');
