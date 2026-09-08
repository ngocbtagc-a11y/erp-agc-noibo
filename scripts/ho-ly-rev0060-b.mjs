/* Bàn soi phụ REV-0060 — dựng lại ĐÚNG ba cảnh gây hại nhất, có số. */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = p => new URL('file:///' + p.replace(/\\/g, '/'));
const nap = await import(url(path.join(GOC, 'src', 'nap-du-lieu.js')));

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
  for (const t of ['them-kho.sql', 'them-khoa-danhmuc-nen.sql', 'them-nap-ghep-cot.sql', 'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql'])
    for (const c of tachCau(readFileSync(path.join(GOC, 'migrations', t), 'utf8')))
      try { db.exec(c); } catch (e) { if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e; }
  db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
           INSERT OR IGNORE INTO nhan_su VALUES ('NS-NGOC','Bùi Thị Ngọc');`);
  return db;
}
function dungD1(db) {
  const idx = new Map();
  const demIdx = b => { if (!idx.has(b)) idx.set(b, Number(db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND tbl_name=?`).get(b).n)); return idx.get(b); };
  const bangCua = s => { const m = s.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([a-z_]+)/i) || s.match(/UPDATE\s+([a-z_]+)/i); return m ? m[1] : null; };
  const moi = (sql, tso = []) => ({
    bind: (...a) => moi(sql, a),
    async run() { const k = db.prepare(sql).run(...tso); const b = bangCua(sql), d = Number(k.changes || 0); return { success: true, meta: { rows_written: b ? d * (1 + demIdx(b)) : d } }; },
    async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...tso) }; }
  });
  return { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
}
const B = s => new TextEncoder().encode(s);
const PHIEN = { nhan_su_id: 'NS-NGOC', ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin' };
const GHEP_SP = { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 };
function csvSP(n, tien = 'SP') {
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  for (let i = 1; i <= n; i++) s += `${tien}-${String(i).padStart(5, '0')},"Hạt điều gói ${i}",Hạt,túi,5\n`;
  return B(s);
}
async function nạp(env, byte, ghep, dich = 'san_pham', ten = 'x.csv') {
  const bang = await nap.docBangTuByte(byte, ten);
  return nap.ghiThat(env, PHIEN, { bang, ghep, maDich: dich, tenTep: ten });
}
const NGAY = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const soSo = db => db.prepare('SELECT so_dong FROM d1_ghi_ngay WHERE ngay=?').get(NGAY())?.so_dong ?? 0;

/* ---------------------------------------------------------------- ① TOCTOU */
console.log('\n① HAI NGƯỜI NẠP CÙNG LÚC — cảnh thật: Sếp và anh Duy, mỗi người một file 5.000 dòng');
{
  const db = dungCsdl(), env = dungD1(db);
  db.prepare('INSERT INTO d1_ghi_ngay (ngay,so_dong,da_bao) VALUES (?,?,0)').run(NGAY(), 35000);
  console.log(`   sổ ngày trước khi nạp: 35.000 / 100.000 (đồng bộ sàn buổi sáng)`);
  const [a, b, c3] = await Promise.all([
    nạp(env, csvSP(5000, 'AA'), GHEP_SP, 'san_pham', 'sep.csv'),
    nạp(env, csvSP(5000, 'BB'), GHEP_SP, 'san_pham', 'duy.csv'),
    nạp(env, csvSP(5000, 'CC'), GHEP_SP, 'san_pham', 'huong.csv')
  ]);
  console.log(`   Sếp  : ${a.loi ? 'CHẶN ' + a.ma : a.luot_ghi_that.toLocaleString('vi-VN') + ' lượt'}`);
  console.log(`   Duy  : ${b.loi ? 'CHẶN ' + b.ma : b.luot_ghi_that.toLocaleString('vi-VN') + ' lượt'}`);
  console.log(`   Hương: ${c3.loi ? 'CHẶN ' + c3.ma : c3.luot_ghi_that.toLocaleString('vi-VN') + ' lượt'}`);
  const c = soSo(db);
  console.log(`   sổ ngày sau: ${c.toLocaleString('vi-VN')} / 100.000  ⇒ ${c > 100000 ? '❌ VƯỢT HẠN MỨC — D1 CHẶN GHI CẢ HỆ THỐNG' : c > 80000 ? '⚠️ ăn hết phần chừa 20.000 cho đồng bộ sàn' : '✅ trong mức'}`);
  console.log(`   (nạp lần lượt thì người thứ hai phải bị chặn 429 — song song thì cả hai đều lọt)`);
}

/* ------------------------------------------------- ② TỒN KHO NGÃ GIỮA CHỪNG */
console.log('\n② NẠP TỒN KHO NGÃ GIỮA CHỪNG RỒI NẠP LẠI — tồn thành bao nhiêu?');
{
  const db = dungCsdl(), env = dungD1(db);
  await nạp(env, csvSP(300), GHEP_SP);
  let s = 'Mã SKU,Số lượng tồn\n';
  for (let i = 1; i <= 300; i++) s += `SP-${String(i).padStart(5, '0')},100\n`;
  const g = { ma_sku: 0, so_luong: 1 };
  const ton = () => Number(db.prepare(`SELECT COALESCE(SUM(so_luong),0) AS t FROM giao_dich_kho WHERE loai='nhap'`).get().t);
  const goc = env.DB.batch.bind(env.DB);
  let lan = 0;
  env.DB.batch = async ds => { if (++lan === 4) throw new Error('D1 network error'); return goc(ds); };
  try { await nạp(env, B(s), g, 'ton_kho', 'TonDauKy.csv'); } catch (e) { console.log(`   lần 1 NGÃ: ${e.message}`); }
  const t1 = ton();
  console.log(`   sau khi ngã: sổ cái đã có ${t1} đơn vị (đúng ra phải là 0 hoặc 30.000)`);
  env.DB.batch = goc;
  const k2 = await nạp(env, B(s), g, 'ton_kho', 'TonDauKy.csv');
  const t2 = ton();
  console.log(`   Sếp thấy báo lỗi nên nạp LẠI ⇒ tồn = ${t2} (file chỉ có 30.000)`);
  console.log(`   ⇒ tồn ẢO thừa ${t2 - 30000} đơn vị · ${t2 > 30000 ? '❌ SAI TỒN' : '✅'}`);
  console.log(`   sổ ngày (hạn mức) = ${soSo(db)} — lượt ghi của lần NGÃ (${t1 ? 'có ghi thật' : ''}) không vào sổ`);
}

/* ------------------------------------------------ ③ MÃ TRÙNG TRONG FILE SẠCH */
console.log('\n③ MÃ TRÙNG TRONG CHÍNH FILE (file sạch, không có ô lỗi khác)');
{
  const b = await nap.docBangTuByte(B('Mã SKU,Tên sản phẩm\nSP-1,Hạt điều\nSP-2,Hạnh nhân\nSP-1,Hạt điều loại 2\n'), 'trung.csv');
  const kb = nap.kiemBang(b, { ma_sku: 0, ten: 1 }, 'san_pham');
  kb.loi.forEach(l => console.log('   ' + l.thongDiep));
  console.log(`   ⇒ nhận ${kb.banGhi.length} dòng, báo ${kb.soTrung} mã trùng — ${kb.soTrung === 1 ? '✅ BẮT ĐƯỢC' : '❌ LỌT'}`);
  // Ca lệch: dòng đầu bị lỗi ô khác thì dòng trùng sau đó KHÔNG bị coi là trùng
  const b2 = await nap.docBangTuByte(B('Mã SKU,Tên sản phẩm,Tồn tối thiểu\nSP-1,Hạt điều,mười\nSP-1,Hạt điều,5\n'), 't2.csv');
  const kb2 = nap.kiemBang(b2, { ma_sku: 0, ten: 1, ton_toi_thieu: 2 }, 'san_pham');
  console.log(`   ca lệch: dòng 2 hỏng ô "Tồn tối thiểu" ⇒ dòng 3 cùng mã KHÔNG bị báo trùng (nhận ${kb2.banGhi.length} dòng, trùng ${kb2.soTrung}) — dòng 3 vẫn vào, chấp nhận được`);
}

/* --------------------------------------- ④ KINH DOANH CÓ ĐƯỜNG VÀO MÀN KHÔNG */
console.log('\n④ KINH DOANH (van_hanh_san) có mở được màn "Nạp từ file" không?');
{
  const q = await import(url(path.join(GOC, 'src', 'quyen.js')));
  const js = readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8');
  const html = readFileSync(path.join(GOC, 'public', 'app.html'), 'utf8');
  /* ⚠️ ĐÃ SỬA (Hồ Ly, vòng 4). Bản trước kết luận "Kinh doanh KHÔNG có đường
     vào" bằng hai phép đọc chữ nay ĐÃ LỖI THỜI: nó soi xem `khoiDongNapFile`
     có nằm trong `khoiDongKho` không, và xem khối màn có nằm trong
     `<section id="v-khovan">` không. Vòng 2 đã dời lời gọi ra khối khởi động
     chung, và `khoiDongNapFile` tự DỜI khối màn sang `#kd-pane-napfile` lúc
     chạy — nên vế thứ hai vẫn "true" trong HTML tĩnh mà kết luận thì sai.
     Một mẩu dò in ra câu sai còn tệ hơn không in gì: nó thoát 0 nên không làm
     đỏ cổng nào, người đọc lại tin. Nay soi đúng bốn mắt xích thật. */
  const p = { vai_tro: 'van_hanh_san' };
  const coTab = q.duocXemTab(p, 'khovan');
  const suaSp = q.duocSuaSanPham(p);
  const goiNgoaiKho = /const qKhoNap[\s\S]{0,600}?khoiDongNapFile\(qKhoNap, qSpNap\)/.test(js);
  const catTheoCo   = /if \(qSpNap\.sua \|\| qKhoNap\.thao_tac\)/.test(js);
  const tuDoiCho    = /if \(!TOI\.quyen\.includes\('khovan'\)\)[\s\S]{0,600}?getElementById\('kd-pane-napfile'\)[\s\S]{0,400}?appendChild\(khoi\)/.test(js);
  const coChoDat    = html.includes('id="kd-pane-napfile"');
  console.log(`   van_hanh_san có tab 'khovan'?              ${coTab}`);
  console.log(`   máy chủ cho van_hanh_san nạp danh mục?     ${suaSp}`);
  console.log(`   khoiDongNapFile gọi NGOÀI khoiDongKho?     ${goiNgoaiKho}`);
  console.log(`   cắt theo CỜ máy chủ (sua || thao_tac)?     ${catTheoCo}`);
  console.log(`   tự DỜI khối màn sang tab Kinh doanh?       ${tuDoiCho}`);
  console.log(`   app.html có chỗ đặt #kd-pane-napfile?      ${coChoDat}`);
  console.log(`   ⇒ ${(!coTab && suaSp && goiNgoaiKho && catTheoCo && tuDoiCho && coChoDat)
    ? '✅ Kinh doanh CÓ đường vào màn nạp (vá vòng 2 — đo lại ở vòng 4)'
    : '❌ Kinh doanh KHÔNG có đường vào màn nạp, dù máy chủ cho phép'}`);
}
