/* ==========================================================================
   BÀN ĐO — LÔ HÀNG · PHIẾU ĐIỀU CHỈNH · TỒN CHẾT
   ---------------------------------------------------------------------------
   Chạy:  npm run do-lo-dieuchinh      · npm run do-lo-dieuchinh-tu-kiem

   VÌ SAO CÓ. REV-0060 vòng 4 bắt ba lỗi CHẶN và bốn lỗi CAO, và Hồ Ly gọi
   chung cả ba CHẶN bằng MỘT câu: “ghi số sai vào sổ cái, trả HTTP 200, in ra
   một câu chúc mừng”. Không bàn đo nào trong repo canh lớp đó — `do-nap-lai`
   canh đường nạp và đường lùi, `do-nap-ghi` canh hạn mức, `ban-dieu-chinh`
   canh màn hình đi ĐÚNG một đường. Cái chưa ai canh là: sau khi bấm xong,
   con số nằm lại trong sổ cái có ĐÚNG không, và hàng có LẤY RA ĐƯỢC không.

   BẢY CHỖ ĐƯỢC CANH (đánh số theo REV-0060 vòng 4):
     ① CHẶN — `dieuChinhKho` KHÔNG được sửa ở mức MÃ trên hàng theo lô
     ② CHẶN — hai phiếu điều chỉnh cùng lúc trên MỘT lô không được làm lô âm
     ③ CHẶN — nạp tồn bằng file KHÔNG có cột “Số lô” không được thành TỒN CHẾT
     ④ CAO  — ô “số tồn thật”: không nuốt dấu thập phân, có trần trên, ép kiểu
     ⑤ CAO  — dấu “đã gỡ” không được kẹt vĩnh viễn khi lệnh trả dấu ngã
     ⑥ CAO  — không gán lô cho hàng `theo_doi_hsd = 0`
     ⑦ CAO  — phiếu điều chỉnh phải ghi một dòng `lich_su_thay_doi_nen`
   Kèm THẤP-④ (FEFO hai lô cùng HSD phải xác định) và THẤP-③ (lô trùng tên
   phải phân biệt được).

   NGUYÊN TẮC:
   · ĐO TRÊN MÃ CHẠY THẬT. CSDL dựng từ đúng `migrations/*.sql`, gọi đúng
     `dieuChinhKho` / `xuatKho` / `ghiThat` / `huyLuotNap` mà máy chủ gọi.
   · ĐO QUA ĐÚNG CỬA ERP. Ca ③ nạp bằng một FILE CSV thật (`Mã SKU,Số lượng
     tồn`) đi qua `docBang` → `xemTruoc` → `ghiThat`, rồi hỏi `xuatKho` —
     vì chính chỗ “màn hiện đủ số mà không xuất được” là thứ phải bắt.
   · TỰ CHỨNG MINH CÓ MẮT:  node scripts/do-lo-va-dieu-chinh.mjs --tu-kiem
     gài LẠI từng lỗi vào một bản sao của `src/` rồi chạy lại chính bàn đo
     này. Ca nào vẫn xanh là một lỗ thủng có thật.

   MÃ THOÁT: 0 = xanh, 1 = đỏ, 2 = bàn đo tự hỏng.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TU_KIEM = process.argv.includes('--tu-kiem');
const NGUON = process.env.LODC_SRC ? path.resolve(process.env.LODC_SRC) : path.join(GOC, 'src');
const modun = m => import(pathToFileURL(path.join(NGUON, m)).href);

const kho  = await modun('kho.js');
const nap  = await modun('nap-du-lieu.js');
const docb = await modun('doc-bang.js');

let dat = 0, truot = 0;
const hong = [];
function ok(ten, dung, them = '') {
  if (dung) { dat++; console.log(`  ✓ ${ten}${them ? '  — ' + them : ''}`); }
  else { truot++; hong.push(ten + (them ? '  — ' + them : '')); console.log(`  ✗ ${ten}${them ? '  — ' + them : ''}`); }
}
const tin = s => console.log(`    ℹ️  ${s}`);
function chet(vi) { console.error('\nBÀN ĐO HỎNG: ' + vi); process.exit(2); }

/* ---- CSDL thật từ migrations ------------------------------------------- */
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
const TOI = 'NS-NGOC';
function dungDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = OFF;');
  for (const t of ['them-kho.sql', 'them-danhmuc-nen.sql', 'them-khoa-danhmuc-nen.sql',
                   'them-nap-ghep-cot.sql', 'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql']) {
    for (const c of tachCau(readFileSync(path.join(GOC, 'migrations', t), 'utf8'))) {
      try { db.exec(c); } catch (e) { if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e; }
    }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
           INSERT OR IGNORE INTO nhan_su VALUES ('${TOI}','Bùi Thị Ngọc');`);
  return db;
}
/* Ổ giả D1: trả CẢ `changes` lẫn `rows_written` như D1 thật. `hong(sql)` để
   dựng ca “máy chủ dữ liệu ngã đúng lệnh này”. */
function dungD1(db, hong = null) {
  const moi = (sql, tso = []) => ({
    bind: (...a) => moi(sql, a),
    async run() {
      if (hong && hong(sql)) throw new Error('D1 network error');
      const k = db.prepare(sql).run(...tso);
      const d = Number(k.changes || 0);
      return { success: true, meta: { changes: d, rows_written: d } };
    },
    async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...tso) }; }
  });
  return { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
}
const P = (v = 'admin') => ({ nhan_su_id: TOI, ho_ten: 'Bùi Thị Ngọc', vai_tro: v });
const goi = async (fn, ...a) => { const r = await fn(...a); return { ma: r.status, than: await r.json() }; };
const tonLo = (db, id) => Number(db.prepare('SELECT COALESCE(SUM(so_luong),0) t FROM giao_dich_kho WHERE lo_hang_id=?').get(id).t);
const tonMa = (db, id) => Number(db.prepare('SELECT COALESCE(SUM(so_luong),0) t FROM giao_dich_kho WHERE san_pham_id=?').get(id).t);
const B = s => new TextEncoder().encode(s);

/* Nạp một file qua ĐÚNG ba bước máy chủ đi: đọc bảng → xem trước → ghi thật. */
async function napFile(env, csv, ghep, maDich, tenTep, them = {}) {
  const bang = await docb.docBang(B(csv), tenTep);
  const xt = await nap.xemTruoc(env, P(), { bang, ghep, maDich, vanTay: 'vt' });
  const kq = await nap.ghiThat(env, P(), {
    bang, ghep, maDich, tenTep, vanTayNoiDung: xt.van_tay_noi_dung, ...them });
  return { xemTruoc: xt, ghi: kq };
}

/* ==========================================================================
   ① CHẶN — SỬA Ở MỨC MÃ TRÊN HÀNG THEO LÔ
   ========================================================================== */
console.log('\n① CHẶN — `dieuChinhKho` trên hàng THEO LÔ mà KHÔNG chọn lô');
{
  /* Đúng cảnh Hồ Ly dựng: di chứng CHẶN-ⓐ — lô A âm, lô B còn hàng. */
  const db = dungDb(), env = dungD1(db);
  db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,danh_muc,don_vi,theo_doi_hsd,ton_toi_thieu) VALUES
     ('sp_hn','SP-00001','Hạnh nhân Mỹ 500g','Hạt','túi',1,5)`).run();
  db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES
     ('lo_a','sp_hn','LO-A','2026-10-01'), ('lo_b','sp_hn','LO-B','2027-01-01')`).run();
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id) VALUES
     ('px','sp_hn','lo_a','xuat',-100,'${TOI}'), ('pn','sp_hn','lo_b','nhap',200,'${TOI}')`).run();
  tin(`dựng: lô A = ${tonLo(db, 'lo_a')} (ÂM) · lô B = ${tonLo(db, 'lo_b')} · tồn mã = ${tonMa(db, 'sp_hn')}`);

  const r = await goi(kho.dieuChinhKho, env, P(), {
    san_pham_id: 'sp_hn', ton_thuc: 200, ly_do: 'kiểm kê 07/09: đếm ngoài kho được 200 túi' });
  ok('① Bỏ trống ô lô trên hàng theo dõi HSD → TỪ CHỐI (không phải 200 kèm câu chúc mừng)',
     r.ma === 400 && !r.than.ok, `HTTP ${r.ma}`);
  ok('① Câu từ chối KÊ RA danh sách lô để đi tiếp, kể cả lô đang ÂM',
     /LO-A/.test(String(r.than.loi || '')) && /LO-B/.test(String(r.than.loi || '')) &&
     /ÂM/.test(String(r.than.loi || '')),
     String(r.than.loi || '').slice(0, 90) + '…');
  ok('① Sổ cái KHÔNG suy chuyển sau lần bấm bị từ chối',
     tonLo(db, 'lo_a') === -100 && tonLo(db, 'lo_b') === 200 && tonMa(db, 'sp_hn') === 100,
     `lô A=${tonLo(db, 'lo_a')} · lô B=${tonLo(db, 'lo_b')} · mã=${tonMa(db, 'sp_hn')}`);

  /* Chiều ngược lại — bản cũ dựng ra 490 túi tồn ma. */
  const r2 = await goi(kho.dieuChinhKho, env, P(), {
    san_pham_id: 'sp_hn', ton_thuc: 5000, ly_do: 'kiểm kê thấy thêm hàng ngoài kho' });
  ok('① Chiều LÊN cũng bị chặn (bản cũ dựng ra tồn ma không xuất được)',
     r2.ma === 400, `HTTP ${r2.ma}`);

  /* Và đi đúng đường thì vẫn phải qua — chặn oan cũng là một lỗi. */
  const r3 = await goi(kho.dieuChinhKho, env, P(), {
    san_pham_id: 'sp_hn', lo_hang_id: 'lo_a', ton_thuc: 0, ly_do: 'kiểm kê 07/09: lô A ngoài kho không còn gì' });
  ok('① KHÔNG chặn oan: chọn đúng lô âm rồi kéo về 0 thì QUA',
     r3.ma === 200 && r3.than.ok && tonLo(db, 'lo_a') === 0,
     `HTTP ${r3.ma} · lô A = ${tonLo(db, 'lo_a')}`);
  const x = await goi(kho.xuatKho, env, P(), { san_pham_id: 'sp_hn', so_luong: 200 });
  ok('① Sau khi sửa đúng đường, xuất 200 qua đúng cửa ERP và KHÔNG để lại lô âm',
     x.ma === 200 && tonLo(db, 'lo_a') === 0 && tonMa(db, 'sp_hn') === 0,
     `HTTP ${x.ma} · lô A = ${tonLo(db, 'lo_a')} · tồn mã = ${tonMa(db, 'sp_hn')}`);
}

/* ==========================================================================
   ② CHẶN — HAI PHIẾU ĐIỀU CHỈNH CÙNG LÚC TRÊN MỘT LÔ
   ========================================================================== */
console.log('\n② CHẶN — hai người điều chỉnh CÙNG MỘT LÔ cùng lúc');
{
  const db = dungDb(), env = dungD1(db);
  db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_lo','SP-LO','Hạnh nhân','túi',1)`).run();
  db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES ('lo_a','sp_lo','LO-A','2026-10-01')`).run();
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id)
              VALUES ('pn_a','sp_lo','lo_a','nhap',100,'${TOI}')`).run();
  const [a, b] = await Promise.all([
    goi(kho.dieuChinhKho, env, P(), { san_pham_id: 'sp_lo', lo_hang_id: 'lo_a', ton_thuc: 0, ly_do: 'anh Duy đếm: hết sạch' }),
    goi(kho.dieuChinhKho, env, P(), { san_pham_id: 'sp_lo', lo_hang_id: 'lo_a', ton_thuc: 0, ly_do: 'chị Hằng đếm: hết sạch' })
  ]);
  const soPhieu = Number(db.prepare(`SELECT COUNT(*) n FROM giao_dich_kho WHERE loai='dieu_chinh'`).get().n);
  ok('② Đúng MỘT phiếu vào sổ, người thứ hai ăn 409',
     [a.ma, b.ma].sort().join('/') === '200/409' && soPhieu === 1,
     `HTTP ${a.ma} / ${b.ma} · ${soPhieu} phiếu`);
  ok('② LÔ KHÔNG ÂM sau hai lượt bấm song song (bản cũ: −100)',
     tonLo(db, 'lo_a') === 0 && tonMa(db, 'sp_lo') === 0,
     `lô = ${tonLo(db, 'lo_a')} · mã = ${tonMa(db, 'sp_lo')}`);
  const nguoiThua = a.ma === 409 ? a : b;
  ok('② Người thứ hai đọc được câu TIẾNG NGƯỜI nói phải làm gì tiếp',
     /vừa thay đổi/.test(String(nguoiThua.than.loi || '')) && /Làm mới/.test(String(nguoiThua.than.loi || '')),
     String(nguoiThua.than.loi || '').slice(0, 80) + '…');

  /* Ca thứ hai: hai người sửa HAI LÔ khác nhau của cùng một mã. Nếu chốt
     đồng thời canh cả số dư MÃ thì người sau bị 409 — đúng, vì bất biến
     “tồn mã ≥ 0” tính trên con số vừa đọc. Cái KHÔNG được phép là lô âm. */
  const db2 = dungDb(), env2 = dungD1(db2);
  db2.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_lo','SP-LO','Hạnh nhân','túi',1)`).run();
  db2.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung) VALUES
     ('lo_a','sp_lo','LO-A','2026-10-01'), ('lo_b','sp_lo','LO-B','2026-11-01')`).run();
  db2.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id) VALUES
     ('p1','sp_lo','lo_a','nhap',100,'${TOI}'), ('p2','sp_lo','lo_b','nhap',100,'${TOI}')`).run();
  await Promise.all([
    goi(kho.dieuChinhKho, env2, P(), { san_pham_id: 'sp_lo', lo_hang_id: 'lo_a', ton_thuc: 50, ly_do: 'đếm lô A còn 50' }),
    goi(kho.dieuChinhKho, env2, P(), { san_pham_id: 'sp_lo', lo_hang_id: 'lo_b', ton_thuc: 50, ly_do: 'đếm lô B còn 50' })
  ]);
  ok('② Hai lô khác nhau, cùng lúc: không lô nào âm, tồn mã không âm',
     tonLo(db2, 'lo_a') >= 0 && tonLo(db2, 'lo_b') >= 0 && tonMa(db2, 'sp_lo') >= 0,
     `lô A=${tonLo(db2, 'lo_a')} · lô B=${tonLo(db2, 'lo_b')} · mã=${tonMa(db2, 'sp_lo')}`);
}

/* ==========================================================================
   ③ CHẶN — FILE KHÔNG CÓ CỘT "SỐ LÔ" ⇒ KHÔNG ĐƯỢC LÀ TỒN CHẾT
   ========================================================================== */
console.log('\n③ CHẶN — nạp tồn đầu kỳ bằng FILE THẬT không có cột “Số lô”');
{
  const db = dungDb(), env = dungD1(db);
  /* Danh mục KHÔNG có cột “Theo dõi hạn dùng” ⇒ ERP đặt mặc định 1. */
  await napFile(env,
    'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n' +
    'SP-00001,Hạnh nhân Mỹ 500g,Hạt,túi,5\n' +
    'SP-00002,Hạt điều rang muối,Hạt,túi,5\n' +
    'SP-00003,Nho khô Mỹ 500g,Hạt,túi,5\n',
    { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 }, 'san_pham', 'DanhMuc.csv');
  const hsd = db.prepare('SELECT ma_sku, theo_doi_hsd FROM san_pham ORDER BY ma_sku').all();
  ok('③ Tiền đề: file danh mục thiếu cột “Theo dõi hạn dùng” ⇒ ERP đặt theo_doi_hsd = 1',
     hsd.every(r => r.theo_doi_hsd === 1), hsd.map(r => `${r.ma_sku}=${r.theo_doi_hsd}`).join(' · '));

  /* Đúng dạng file khả dĩ nhất Sếp có: hai cột. */
  const { xemTruoc: xt, ghi } = await napFile(env,
    'Mã SKU,Số lượng tồn\nSP-00001,500\nSP-00002,500\nSP-00003,500\n',
    { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'TonDauKy.csv');
  ok('③ Nạp tồn thành công', !!ghi.phieu_id, String(ghi.phieu_id || ghi.loi));

  ok('③ MÀN XEM TRƯỚC NÓI RA chuyện thiếu cột lô (bản cũ: cảnh báo [])',
     Number(xt.so_dong_thieu_lo || 0) === 3 &&
     (xt.canh_bao || []).some(c => /Số lô/.test(c) && /LÔ MẶC ĐỊNH/i.test(c)),
     `so_dong_thieu_lo = ${xt.so_dong_thieu_lo} · ${(xt.canh_bao || []).length} câu cảnh báo`);

  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  const soLo = Number(db.prepare('SELECT COUNT(*) n FROM lo_hang').get().n);
  ok('③ Mỗi mã theo lô có một LÔ trong sổ (bản cũ: 0 lô, 3 dòng lo_hang_id NULL)',
     soLo === 3, `${soLo} lô`);

  const loDs = await goi(kho.loTheoSanPham, env, P(), spId, false);
  ok('③ Ô chọn lô ở màn Xuất kho KHÔNG còn rỗng',
     (loDs.than.lo || []).length === 1 && loDs.than.lo[0].ton === 500,
     `${(loDs.than.lo || []).length} lô · tồn ${loDs.than.lo?.[0]?.ton}`);

  /* Chỗ quyết định: anh Duy xuất một túi. Bản cũ trả 400 “chỉ còn 0”. */
  const x1 = await goi(kho.xuatKho, env, P(), { san_pham_id: spId, so_luong: 1 });
  ok('③ ANH DUY XUẤT 1 TÚI — PHẢI THÀNH CÔNG (bản cũ: 400 “chỉ còn 0 túi”)',
     x1.ma === 200, `HTTP ${x1.ma} · ${x1.than.ok ? 'qua' : x1.than.loi}`);
  const x2 = await goi(kho.xuatKho, env, P(), { san_pham_id: spId, so_luong: 499 });
  ok('③ Xuất nốt 499 vẫn qua, và tồn về đúng 0 — không dư một túi ma nào',
     x2.ma === 200 && tonMa(db, spId) === 0, `HTTP ${x2.ma} · tồn = ${tonMa(db, spId)}`);
  const x3 = await goi(kho.xuatKho, env, P(), { san_pham_id: spId, so_luong: 1 });
  ok('③ Hết hàng rồi thì chặn — không nới lỏng bất biến TỒN ≥ 0', x3.ma === 400, `HTTP ${x3.ma}`);

  /* Và đường lùi vẫn phải chạy trên lô do ERP tự tạo. */
  const spId3 = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00003'`).get().id;
  const g = await nap.huyLuotNap(env, P(), ghi.phieu_id);
  ok('③ Lượt nạp có lô tự tạo mà đã xuất mất một phần thì GỠ bị từ chối, đúng luật cũ',
     g.ma === 409, `HTTP ${g.ma}`);
  ok('③ Bị từ chối thì sổ cái không suy chuyển', tonMa(db, spId3) === 500, String(tonMa(db, spId3)));

  /* File CÓ cột lô thì vẫn phải giữ đúng số lô người ta ghi. */
  const db2 = dungDb(), env2 = dungD1(db2);
  await napFile(env2,
    'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\nSP-00001,Hạnh nhân,Hạt,túi,5\n',
    { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 }, 'san_pham', 'DM.csv');
  const r2 = await napFile(env2,
    'Mã SKU,Số lượng tồn,Số lô,Hạn sử dụng\nSP-00001,100,LO-A,2026-10-01\n',
    { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 }, 'ton_kho', 'TonCoLo.csv');
  const lo2 = db2.prepare('SELECT so_lo, han_su_dung FROM lo_hang').all();
  ok('③ File CÓ cột lô: số lô và hạn vẫn ghi đúng, không bị lô mặc định đè',
     lo2.length === 1 && lo2[0].so_lo === 'LO-A' && lo2[0].han_su_dung === '2026-10-01',
     JSON.stringify(lo2));
  ok('③ File CÓ cột lô: màn xem trước KHÔNG cảnh báo oan',
     Number(r2.xemTruoc.so_dong_thieu_lo || 0) === 0, String(r2.xemTruoc.so_dong_thieu_lo));
}

/* ==========================================================================
   ④ CAO — Ô "SỐ TỒN THẬT": DẤU THẬP PHÂN · TRẦN TRÊN · ÉP KIỂU
   ========================================================================== */
console.log('\n④ CAO — ô “Số tồn THẬT đếm được” phải có bờ');
{
  const db = dungDb(), env = dungD1(db);
  db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp_kg','SP-KG','Hạt điều rang muối (xá)','kg',0)`).run();
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,loai,so_luong,nguoi_id) VALUES ('pn','sp_kg','nhap',20,'${TOI}')`).run();
  const thu = async v => {
    const r = await goi(kho.dieuChinhKho, env, P(), { san_pham_id: 'sp_kg', ton_thuc: v, ly_do: 'cân lại kho ngày 07/09' });
    if (r.than.ok) db.prepare('DELETE FROM giao_dich_kho WHERE phieu_id=?').run(r.than.phieu_id);
    return r;
  };
  const tp = await thu('12.5');
  ok('④ “12.5” kg BỊ TỪ CHỐI (bản cũ: sổ ghi 125 kg kèm câu chúc mừng)',
     tp.ma === 400, `HTTP ${tp.ma}`);
  ok('④ Câu từ chối chỉ đúng đường đi tiếp cho hàng cân theo kg',
     /quy về đơn vị nhỏ hơn|làm tròn/.test(String(tp.than.loi || '')),
     String(tp.than.loi || '').slice(0, 100) + '…');
  for (const v of ['5.7', '0,5', '1e3', '12abc', '+5', '-5', '1.000,000'])
    ok(`④ từ chối ${JSON.stringify(v)}`, (await thu(v)).ma === 400);
  for (const [v, mong] of [['1.000', 1000], ['2 000', 2000], ['1.000.000', 1000000], ['  12  ', 12], ['007', 7], [0, 0]]) {
    const r = await thu(v);
    ok(`④ vẫn nhận nhóm nghìn CHUẨN ${JSON.stringify(v)} = ${mong}`, r.than.ton_sau === mong, String(r.than.ton_sau));
  }
  ok('④ Có TRẦN TRÊN: “99999999999999999999” bị từ chối, không lưu 1e20 vào cột INTEGER',
     (await thu('99999999999999999999')).ma === 400);
  /* Ca này đo ĐÚNG cái trần, không đo nhờ `Number.isSafeInteger`: 2 tỷ là một
     số nguyên an toàn hoàn hảo, chỉ có trần mới chặn được nó. Thiếu ca này
     thì gỡ trần đi bàn đo vẫn xanh — đo được ở lần tự kiểm đầu. */
  const qTran = await thu('2000000000');
  ok('④ Trần là trần THẬT: 2.000.000.000 (số nguyên an toàn) vẫn bị chặn',
     qTran.ma === 400 && /trần/.test(String(qTran.than.loi || '')), `HTTP ${qTran.ma}`);
  ok('④ Ngay dưới trần thì vẫn nhận — không chặn oan',
     (await thu('1000000000')).than.ton_sau === 1_000_000_000);
  ok('④ Quá MAX_SAFE_INTEGER (9007199254740993) bị từ chối, không lặng lẽ lệch 1',
     (await thu('9007199254740993')).ma === 400);
  ok('④ Ép kiểu: mảng ["7"] KHÔNG được coi là số 7', (await thu(['7'])).ma === 400);
  for (const v of [true, {}, null, undefined])
    ok(`④ từ chối kiểu ${v === null ? 'null' : typeof v}`, (await thu(v)).ma === 400);
}

/* ==========================================================================
   ⑤ CAO — DẤU "ĐÃ GỠ" KHÔNG ĐƯỢC KẸT VĨNH VIỄN
   ========================================================================== */
console.log('\n⑤ CAO — lệnh TRẢ DẤU ngã thì lượt nạp vẫn phải có đường ra');
{
  const db = dungDb(), env = dungD1(db);
  await napFile(env, 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\nSP-00001,Hạnh nhân,Hạt,túi,5\n',
    { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 }, 'san_pham', 'DM.csv');
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  const { ghi } = await napFile(env, 'Mã SKU,Số lượng tồn\nSP-00001,100\n',
    { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'B.csv');
  await goi(kho.xuatKho, env, P(), { san_pham_id: spId, so_luong: 100 });

  /* Gỡ sẽ phải từ chối (âm) ⇒ phải trả dấu — và ta cho ĐÚNG lệnh trả dấu ngã. */
  let lan = 0;
  const envNga = dungD1(db, sql => /UPDATE lich_su_thay_doi_nen/i.test(sql) && ++lan === 2);
  const g1 = await nap.huyLuotNap(envNga, P(), ghi.phieu_id);
  const dauKet = db.prepare('SELECT gia_tri_moi g FROM lich_su_thay_doi_nen WHERE ban_ghi_id=?').get(ghi.phieu_id)?.g;
  tin(`gỡ lần 1: HTTP ${g1.ma} · dấu trong sổ vết = ${JSON.stringify(dauKet)}`);
  ok('⑤ Trả dấu ngã thì câu từ chối NÓI RA, không im lặng',
     /chưa trả được trạng thái/.test(String(g1.loi || '')), String(g1.loi || '').slice(-120));

  const ds1 = await nap.dsLuotNap(env, P(), 10);
  const dong = (ds1.ds || []).find(r => r.phieu_id === ghi.phieu_id);
  ok('⑤ Danh sách lượt nạp KHÔNG khai “đã gỡ” cho lượt sổ cái vẫn còn dòng',
     dong && dong.da_go === false && dong.ket === true,
     `da_go=${dong?.da_go} · ket=${dong?.ket} · so_dong=${dong?.so_dong}`);
  ok('⑤ Và nút gỡ vẫn còn — có đường ra từ giao diện', dong && dong.go_duoc === true, String(dong?.go_duoc));

  const g2 = await nap.huyLuotNap(env, P(), ghi.phieu_id);
  ok('⑤ Bấm lại khi D1 đã lành: KHÔNG còn câu sai “đã được gỡ khỏi sổ cái rồi”',
     !/đã được gỡ khỏi sổ cái rồi/.test(String(g2.loi || '')), String(g2.loi || 'gỡ được').slice(0, 90));
  ok('⑤ Bấm lại đi tới ĐÚNG phép kiểm số dư (409 vì hàng đã bán), không phải 409 giả',
     g2.ma === 409 && /tồn kho ÂM|tồn của lô ÂM/.test(String(g2.loi || '')), `HTTP ${g2.ma}`);
  ok('⑤ Sổ cái vẫn nguyên vẹn suốt hai lần bấm', tonMa(db, spId) === 0 &&
     Number(db.prepare('SELECT COUNT(*) n FROM giao_dich_kho WHERE phieu_id=?').get(ghi.phieu_id).n) === 1,
     `tồn = ${tonMa(db, spId)}`);

  /* Không nới oan: lượt ĐÃ GỠ THẬT (0 dòng) vẫn phải trả 409. */
  const db2 = dungDb(), env2 = dungD1(db2);
  await napFile(env2, 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\nSP-00001,Hạnh nhân,Hạt,túi,5\n',
    { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 }, 'san_pham', 'DM.csv');
  const r2 = await napFile(env2, 'Mã SKU,Số lượng tồn\nSP-00001,100\n',
    { ma_sku: 0, so_luong: 1 }, 'ton_kho', 'C.csv');
  await nap.huyLuotNap(env2, P(), r2.ghi.phieu_id);
  const lai = await nap.huyLuotNap(env2, P(), r2.ghi.phieu_id);
  ok('⑤ KHÔNG nới oan: lượt đã gỡ THẬT (0 dòng) bấm lại vẫn 409 “đã được gỡ rồi”',
     lai.ma === 409 && /đã được gỡ khỏi sổ cái rồi/.test(String(lai.loi || '')), `HTTP ${lai.ma}`);
}

/* ==========================================================================
   ⑥ ⑦ CAO — GÁN LÔ SAI CHỖ · SỔ VẾT TRA ĐƯỢC BẰNG MÁY
   ========================================================================== */
console.log('\n⑥ ⑦ CAO — lô sai chỗ · sổ vết `lich_su_thay_doi_nen`');
{
  const db = dungDb(), env = dungD1(db);
  db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd,dang_ban) VALUES
     ('sp_ko','SP-KO','Túi zip 10x15','cái',0,1), ('sp_ngung','SP-NG','Mã đã ngừng bán','cái',0,0)`).run();
  db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo) VALUES ('lo_x','sp_ko','LO-X')`).run();
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,loai,so_luong,nguoi_id) VALUES
     ('p1','sp_ko','nhap',50,'${TOI}'), ('p2','sp_ngung','nhap',10,'${TOI}')`).run();

  const rl = await goi(kho.dieuChinhKho, env, P(), {
    san_pham_id: 'sp_ko', lo_hang_id: 'lo_x', ton_thuc: 7, ly_do: 'kiểm kê 07/09 tại kho' });
  ok('⑥ Gán lô cho hàng theo_doi_hsd = 0 → TỪ CHỐI (bản cũ: 200, dòng lô thành rác câm)',
     rl.ma === 400, `HTTP ${rl.ma}`);
  ok('⑥ Không sinh ra chênh lệch tồn-mã/tồn-lô',
     tonMa(db, 'sp_ko') === 50 && tonLo(db, 'lo_x') === 0,
     `mã=${tonMa(db, 'sp_ko')} · lô=${tonLo(db, 'lo_x')}`);

  const rn = await goi(kho.dieuChinhKho, env, P(), {
    san_pham_id: 'sp_ngung', ton_thuc: 0, ly_do: 'thanh lý hết hàng mã đã ngừng bán' });
  ok('⑥ Mã đã NGỪNG BÁN vẫn điều chỉnh được — quyết định CÓ CHỦ Ý (thanh lý/huỷ hàng)',
     rn.ma === 200, `HTTP ${rn.ma}`);
  ok('⑥ …nhưng phải NÓI RA rằng mã này không hiện ở danh sách tồn kho',
     /NGỪNG KINH DOANH/.test(String(rn.than.tin || '')), String(rn.than.tin || '').slice(-90));

  const rd = await goi(kho.dieuChinhKho, env, P(), {
    san_pham_id: 'sp_ko', ton_thuc: 38, ly_do: 'hàng vỡ 12 cái khi bốc xếp 07/09' });
  const vet = db.prepare(
    `SELECT * FROM lich_su_thay_doi_nen WHERE bang='giao_dich_kho' AND truong='dieu_chinh' AND ban_ghi_id=?`
  ).get(rd.than.phieu_id);
  ok('⑦ Phiếu điều chỉnh ghi MỘT dòng `lich_su_thay_doi_nen` (bản cũ: không dòng nào)',
     !!vet, vet ? JSON.stringify({ truong: vet.truong, cu: vet.gia_tri_cu, moi: vet.gia_tri_moi }) : 'không có');
  ok('⑦ Trước/sau/lý do/người nằm ở CỘT RIÊNG, truy vấn được — không nhồi vào một câu chữ',
     vet && vet.gia_tri_cu === '50' && vet.gia_tri_moi === '38' &&
     vet.ly_do === 'hàng vỡ 12 cái khi bốc xếp 07/09' && vet.nguoi_ten === 'Bùi Thị Ngọc',
     vet ? `${vet.gia_tri_cu}→${vet.gia_tri_moi} · ${vet.nguoi_ten}` : '');
  const lanNap = Number(db.prepare(
    `SELECT COUNT(*) n FROM lich_su_thay_doi_nen WHERE truong='nap_file'`).get().n);
  ok('⑦ KHÔNG lẫn với sổ vết lượt nạp (`truong = nap_file`) — `dsLuotNap` không nhiễu',
     lanNap === 0, `${lanNap} dòng nap_file`);
  ok('⑦ Sổ cái vẫn giữ nguyên câu tiếng Việt để đọc bằng mắt',
     /Điều chỉnh tồn: sổ ghi 50 → đếm thật 38/.test(
       String(db.prepare(`SELECT ghi_chu g FROM giao_dich_kho WHERE phieu_id=?`).get(rd.than.phieu_id).g)));
}

/* ==========================================================================
   ⑧ THẤP — FEFO XÁC ĐỊNH · LÔ TRÙNG TÊN PHÂN BIỆT ĐƯỢC
   ========================================================================== */
console.log('\n⑧ THẤP — FEFO khi hai lô cùng HSD · lô trùng tên');
{
  const db = dungDb(), env = dungD1(db);
  db.prepare(`INSERT INTO san_pham (id,ma_sku,ten,don_vi,theo_doi_hsd) VALUES ('sp','SP-1','Hạnh nhân','túi',1)`).run();
  /* `tao_luc` BẰNG NHAU — đúng ca hai lượt nhập trong cùng một giây. */
  db.prepare(`INSERT INTO lo_hang (id,san_pham_id,so_lo,han_su_dung,tao_luc) VALUES
     ('lo_2','sp','LO-A','2026-10-01','2026-09-07 10:00:00'),
     ('lo_1','sp','LO-A','2026-10-01','2026-09-07 10:00:00')`).run();
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id,san_pham_id,lo_hang_id,loai,so_luong,nguoi_id) VALUES
     ('p1','sp','lo_1','nhap',100,'${TOI}'), ('p2','sp','lo_2','nhap',100,'${TOI}')`).run();
  await goi(kho.xuatKho, env, P(), { san_pham_id: 'sp', so_luong: 100 });
  ok('⑧ THẤP-④ Hai lô cùng HSD, cùng `tao_luc`: lô có id nhỏ hơn bị ăn trước (thứ tự XÁC ĐỊNH)',
     tonLo(db, 'lo_1') === 0 && tonLo(db, 'lo_2') === 100,
     `lo_1=${tonLo(db, 'lo_1')} · lo_2=${tonLo(db, 'lo_2')}`);
  const ds = await goi(kho.loTheoSanPham, env, P(), 'sp', true);
  ok('⑧ THẤP-③ Lưới lô trả kèm `tao_luc` để phân biệt hai lô TRÙNG TÊN',
     (ds.than.lo || []).every(l => 'tao_luc' in l), JSON.stringify(ds.than.lo?.[0] || {}));
  ok('⑧ Màn Điều chỉnh thấy CẢ lô đang có tồn 0 (từ vòng này bắt buộc chọn lô)',
     (ds.than.lo || []).length === 2, `${(ds.than.lo || []).length} lô`);
}

/* ==========================================================================
   TỰ KIỂM — GÀI LẠI TỪNG LỖI VÀO MÃ THẬT
   ========================================================================== */
if (TU_KIEM && !process.env.LODC_SRC) {
  console.log('\n══ TỰ KIỂM — GÀI LẠI TỪNG LỖI CỦA REV-0060 VÒNG 4 VÀO MÃ THẬT ══');
  console.log('   (mỗi ca: chép src/ ra chỗ khác, gài lại đúng lỗi, chạy lại chính bàn đo này.');
  console.log('    Ca nào KHÔNG làm bàn đo đỏ là một lỗ thủng có thật.)\n');

  const CA_GAI = [
    { ten: '① Bỏ luật “hàng theo lô thì BẮT chọn lô” (đúng lỗi CHẶN-①)',
      tep: 'kho.js',
      tim: `  if (sp.theo_doi_hsd && !loId) {`,
      thay: `  if (false && sp.theo_doi_hsd && !loId) {   // GÀI LỖI` },

    { ten: '② Ghi phiếu điều chỉnh KHÔNG kèm điều kiện số dư (đúng lỗi CHẶN-②)',
      tep: 'kho.js',
      sua: [[`  const dieuKien = loId
    ? \`WHERE (\${DU_LO}) = ? AND (\${DU_MA}) = ?\`
    : \`WHERE (\${DU_MA}) = ?\`;`,
             `  const dieuKien = '';   // GÀI LỖI: đọc-rồi-ghi, không nguyên tử`],
            [`  const thamSo = loId ? [loId, dangGhi, spId, tonMa] : [spId, dangGhi];`,
             `  const thamSo = [];   // GÀI LỖI`]] },

    { ten: '② b Ghi được 0 dòng mà vẫn báo thành công',
      tep: 'kho.js',
      tim: `  const daGhi = Number(kq?.meta?.changes ?? kq?.meta?.rows_written ?? 0);`,
      thay: `  const daGhi = 1;   // GÀI LỖI: mặc định là thành công` },

    { ten: '③ Chỉ tạo lô khi file CÓ cột lô (đúng lỗi CHẶN-③ — tồn chết)',
      tep: 'nap-du-lieu.js',
      tim: `      if (b.__theoDoiHsd) {`,
      thay: `      if (b.__theoDoiHsd && (b.so_lo || b.han_su_dung)) {   // GÀI LỖI` },

    { ten: '③ b Tạo lô nhưng màn xem trước KHÔNG nói ra',
      tep: 'nap-du-lieu.js',
      tim: `    ? doiChieu.them.filter(b => b.__theoDoiHsd && !b.so_lo && !b.han_su_dung)`,
      thay: `    ? []   // GÀI LỖI: im lặng` },

    { ten: '④ Ô số tồn nuốt dấu chấm/phẩy như bản cũ (12.5 → 125)',
      tep: 'kho.js',
      tim: `  if (/^\\d+$/.test(s)) sach = s;`,
      thay: `  if (/^\\d+$/.test(s.replace(/[.,\\s]/g, ''))) sach = s.replace(/[.,\\s]/g, '');   // GÀI LỖI` },

    { ten: '④ b Bỏ trần trên của số tồn',
      tep: 'kho.js',
      tim: `  if (so > TRAN_TON) {`,
      thay: `  if (false) {   // GÀI LỖI: không còn trần` },

    { ten: '④ c Bỏ ép kiểu (mảng ["7"] lọt qua như số 7)',
      tep: 'kho.js',
      tim: `  if (tho === null || tho === undefined || (typeof tho !== 'string' && typeof tho !== 'number')) {`,
      thay: `  if (tho === null || tho === undefined) {   // GÀI LỖI` },

    { ten: '⑤ Dấu “đã gỡ” lại kẹt vĩnh viễn (đúng lỗi CAO-②)',
      tep: 'nap-du-lieu.js',
      tim: `  if (vet.gia_tri_moi === DA_GO) {
    let conDong = 0;`,
      thay: `  if (vet.gia_tri_moi === DA_GO) {
    return { loi: 'Lượt nạp này đã được gỡ khỏi sổ cái rồi.', ma: 409 };   // GÀI LỖI
    let conDong = 0;` },

    { ten: '⑤ b Trả dấu ngã mà câu từ chối im lặng',
      tep: 'nap-du-lieu.js',
      tim: `    traDauHong = !ok;`,
      thay: `    traDauHong = false;   // GÀI LỖI: nuốt mất sự thật` },

    { ten: '⑥ Cho gán lô cho hàng theo_doi_hsd = 0',
      tep: 'kho.js',
      tim: `    if (!sp.theo_doi_hsd) {
      return loi(\`“\${sp.ten}” KHÔNG theo dõi hạn sử dụng`,
      thay: `    if (false) {
      return loi(\`“\${sp.ten}” KHÔNG theo dõi hạn sử dụng` },

    { ten: '⑦ Không ghi `lich_su_thay_doi_nen` cho phiếu điều chỉnh',
      tep: 'kho.js',
      tim: `      INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                        nguoi_id, nguoi_ten, ly_do, luc)
      VALUES ('giao_dich_kho', ?, 'dieu_chinh', ?, ?, ?, ?, ?, datetime('now','+7 hours'))`,
      thay: `      SELECT 1 WHERE 0 AND ? AND ? AND ? AND ? AND ? AND ?` },

    { ten: '⑧ Bỏ `l.id ASC` — FEFO lại không xác định khi hai lô cùng HSD',
      tep: 'kho.js',
      tim: `       ORDER BY (l.han_su_dung IS NULL), l.han_su_dung ASC, l.tao_luc ASC, l.id ASC
    \`).bind(spId).all();

    const tongCo`,
      thay: `       ORDER BY (l.han_su_dung IS NULL), l.han_su_dung ASC, l.tao_luc ASC, l.id DESC
    \`).bind(spId).all();

    const tongCo` }
  ];

  const TAM = path.join(GOC, '.tu-kiem-lo-dieuchinh');
  let batDuoc = 0;
  for (const ca of CA_GAI) {
    rmSync(TAM, { recursive: true, force: true });
    mkdirSync(TAM, { recursive: true });
    cpSync(path.join(GOC, 'src'), TAM, { recursive: true });

    const duong = path.join(TAM, ca.tep);
    /* Quy về LF trước khi gài: repo này có tệp lưu CRLF (git `core.autocrlf`),
       mà chuỗi "tim" nhiều dòng viết trong bàn đo thì luôn là LF. Không quy về
       thì ca gài nhiều dòng LẶNG LẼ không khớp — và một ca gài không khớp là
       một ca MÙ, đúng thứ chế độ tự kiểm sinh ra để loại trừ. */
    let noi = readFileSync(duong, 'utf8').replace(/\r\n/g, '\n');
    const sua = ca.sua || [[ca.tim, ca.thay]];
    let gaiDuoc = true;
    for (const [tim, thay] of sua) {
      if (!noi.includes(tim)) { gaiDuoc = false; break; }
      noi = noi.replace(tim, thay);
    }
    if (!gaiDuoc) {
      console.log(`  ✗ ${ca.ten}`);
      console.log('      KHÔNG gài được — mã đã đổi nên ca này MÙ. Sửa lại chuỗi "tim".');
      continue;
    }
    writeFileSync(duong, noi, 'utf8');

    const kq = spawnSync(process.execPath, [fileURLToPath(import.meta.url)],
                         { env: { ...process.env, LODC_SRC: TAM }, encoding: 'utf8' });
    if (kq.status === 1) {
      const soTruot = (kq.stdout.match(/TRƯỢT (\d+)/) || [])[1] || '?';
      console.log(`  ✓ ${ca.ten}`);
      console.log(`      → bàn đo ĐỎ (${soTruot} ca trượt) — bắt được.`);
      batDuoc++;
    } else {
      console.log(`  ✗ ${ca.ten}`);
      console.log(`      → bàn đo VẪN XANH (mã thoát ${kq.status}). LỖ THỦNG: gài lỗi này vào`);
      console.log('        sản phẩm thật thì không ai biết.');
    }
  }
  rmSync(TAM, { recursive: true, force: true });

  console.log(`\nTự kiểm: bắt được ${batDuoc}/${CA_GAI.length} lỗi gài vào mã thật.`);
  if (batDuoc < CA_GAI.length) {
    console.log('❌ TỰ KIỂM TRƯỢT — bàn đo này có lỗ thủng, đừng tin nó.');
    process.exit(1);
  }
  console.log('✅ Tự kiểm đạt — bàn đo bắt được mọi lỗi gài vào mã thật.');
}

/* ========================================================================== */
console.log('\n' + '='.repeat(70));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) {
  console.log('\nCHỖ TRƯỢT:');
  hong.forEach(h => console.log('  ✗ ' + h));
  console.log('\n❌ ĐỎ');
  process.exit(1);
}
console.log('✅ XANH');
