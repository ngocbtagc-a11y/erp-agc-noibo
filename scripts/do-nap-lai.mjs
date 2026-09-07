/* ==========================================================================
   BÀN ĐO — NẠP LẠI · NGÃ GIỮA CHỪNG · ĐẶT CHỖ HẠN MỨC · CHỌN BẢNG
   ---------------------------------------------------------------------------
   Chạy:  npm run do-nap-lai          · npm run do-nap-lai-tu-kiem

   VÌ SAO CÓ BÀN ĐO NÀY. REV-0060 bắt được sáu chỗ mà hai bàn đo cũ
   (`do-nap-file` · `do-nap-ghi`) KHÔNG canh: chúng đo "đọc file có đúng
   không" và "tốn bao nhiêu lượt ghi", chứ không đo *cái gì xảy ra khi cùng
   một file được nạp hai lần*, *khi máy chủ ngã giữa lúc ghi*, hay *khi ba
   người nạp cùng lúc*. Đúng ba chỗ đó mới là chỗ làm SAI TỒN KHO THẬT — mà
   tồn ảo thì bán ra không có hàng giao.

   SÁU CHỖ ĐƯỢC CANH Ở ĐÂY (đánh số theo REV-0060):
     ① CHẶN — nạp lại đúng file tồn kho KHÔNG được âm thầm cộng dồn
     ② CHẶN — nạp ngã giữa chừng phải GỠ SẠCH, và nói rõ đã gỡ hay còn sót
     ③ CAO  — hạn mức ghi phải ĐẶT CHỖ trước, không đọc-rồi-quyết
     ④ CAO  — cron chốt sổ cùng isolate không được đếm lượt ghi hai lần
     ⑤ CAO  — .xlsx nhiều bảng: liệt kê cho NGƯỜI chọn, không đoán hộ
     ⑥ CAO  — Kinh doanh phải có đường vào màn nạp danh mục
   Kèm đường lùi (gỡ một lượt nạp) và mấy ổ cùng chỗ với ⑤ (hệ ngày 1904 ·
   ô gộp · quá 200 cột · file đặt mật khẩu · mẫu hiện giá trị đã đọc).

   NGUYÊN TẮC:
   · ĐO TRÊN MÃ CHẠY THẬT. CSDL dựng từ đúng `migrations/*.sql`, gọi đúng
     `ghiThat` / `xemTruoc` / `huyLuotNap` mà máy chủ gọi, qua lớp giả lập D1
     bọc `node:sqlite` (cùng lối `do-nap-ghi-d1.mjs`).
   · ĐO TRÊN FILE THẬT CỦA SẾP cho mục ⑤ — file tự dựng chỉ hợp thức hoá giả
     định của chính người viết. CHỈ ĐỌC: không sửa, không xoá, không di dời.
   · BÀN ĐO PHẢI TỰ CHỨNG MINH CÓ MẮT:
        node scripts/do-nap-lai.mjs --tu-kiem
     gài LẠI từng lỗi trên vào một bản sao của `src/` rồi chạy lại chính bàn
     đo này. Mỗi ca gài phải làm bàn đo ĐỎ. Ca nào vẫn xanh là một lỗ thủng
     có thật: gài lỗi đó vào sản phẩm thì không ai biết.
     Chế độ tự kiểm này XANH khi bắt đủ; ĐỎ khi có lỗ thủng.

   MÃ THOÁT: 0 = xanh, 1 = đỏ, 2 = bàn đo tự hỏng.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, existsSync, statSync,
         mkdirSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TU_KIEM = process.argv.includes('--tu-kiem');

/* Nguồn mã để đo: bình thường là `src/` thật, lúc tự kiểm là bản sao đã bị
   gài lỗi — để chứng minh bàn đo bắt được lỗi THẬT trong mã THẬT. */
const NGUON = process.env.NAP_SRC ? path.resolve(process.env.NAP_SRC) : path.join(GOC, 'src');
const modun = m => import(pathToFileURL(path.join(NGUON, m)).href);

const nap    = await modun('nap-du-lieu.js');
const docb   = await modun('doc-bang.js');
const canhbao = await modun('canh-bao-ghi.js');

let dat = 0, truot = 0;
const hong = [];
function ok(ten, dung, ct = '') {
  if (dung) { dat++; console.log(`  ✓ ${ten}${ct ? ' — ' + ct : ''}`); }
  else { truot++; hong.push(ten + (ct ? ` — ${ct}` : '')); console.log(`  ✗ ${ten}${ct ? ' — ' + ct : ''}`); }
}
const tin = s => console.log('    · ' + s);
function chet(vi) { console.error('\nBÀN ĐO HỎNG: ' + vi); process.exit(2); }

/* ==========================================================================
   DỰNG CSDL + GIẢ LẬP D1  (cùng lối do-nap-ghi-d1.mjs)
   ========================================================================== */
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
    if (!existsSync(duong)) chet(`thiếu migration ${ten}`);
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

/* "Lượt ghi" = số dòng đổi × (1 + số chỉ mục của bảng), đếm chỉ mục từ chính
   `sqlite_master` — không gõ tay con số nào. */
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
  const moi = (sql, tso = []) => ({
    bind: (...a) => moi(sql, a),
    async run() {
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
const GHEP_SP  = { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 };
const GHEP_TON = { ma_sku: 0, so_luong: 1 };

function csvSP(n, tien = 'SP') {
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  for (let i = 1; i <= n; i++) s += `${tien}-${String(i).padStart(5, '0')},"Hạt điều gói ${i}",Hạt,túi,5\n`;
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
async function xemT(env, bytes, ghep, maDich = 'san_pham', tenTep = 'thu.csv') {
  const bang = await nap.docBangTuByte(bytes, tenTep);
  return nap.xemTruoc(env, PHIEN, { bang, ghep, maDich, vanTay: 'x' });
}
const NGAY = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const soSo = db => db.prepare('SELECT so_dong FROM d1_ghi_ngay WHERE ngay = ?').get(NGAY())?.so_dong ?? null;
const tonCua = db => Number(db.prepare(
  `SELECT COALESCE(SUM(CASE WHEN loai='nhap' THEN so_luong ELSE -so_luong END),0) AS t
     FROM giao_dich_kho`).get().t);

/* ==========================================================================
   ① NẠP LẠI FILE TỒN KHO — cộng dồn âm thầm là SAI TỒN THẬT
   ========================================================================== */
console.log('\n══ ① NẠP LẠI ĐÚNG FILE TỒN KHO ══');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(50), GHEP_SP);

  const tep = csvTon(50);
  const k1 = await ghi(env, tep, GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  const t1 = tonCua(db);

  const xem2 = await xemT(env, tep, GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  const k2 = await ghi(env, tep, GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  const t2 = tonCua(db);
  const k3 = await ghi(env, tep, GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  const t3 = tonCua(db);

  tin(`tổng tồn sau lần 1/2/3: ${t1} → ${t2} → ${t3}`);
  tin(`lần 2 máy chủ trả: ${k2.ma || 'cho qua'}`);
  ok('Lần 1 vào sổ đủ 5.000 đơn vị', t1 === 5000, String(t1));
  ok('Nạp lại lần 2 KHÔNG cộng dồn vào tồn', t2 === t1, `${t1} → ${t2}`);
  ok('Nạp lại lần 3 cũng không', t3 === t1, `${t1} → ${t3}`);
  ok('Lần nạp trùng bị chặn bằng mã 409 (không phải lỗi chung chung)', k2.ma === 409, String(k2.ma));
  ok('Câu chặn nói rõ là file ĐÃ NẠP RỒI và nạp tiếp sẽ CỘNG THÊM',
     /đã nạp/i.test(k2.loi || '') && /cộng thêm/i.test(k2.loi || ''), String(k2.loi).slice(0, 110));
  ok('Câu chặn có chỉ đường lùi (gỡ lượt nạp cũ)', /gỡ/i.test(k2.loi || ''), String(k2.loi).slice(-90));

  // Màn xem trước phải NÓI RA, không im lặng hiện y hệt lần đầu
  tin(`xem trước lần 2: so_them=${xem2.so_them} · can_xac_nhan_trung=${xem2.can_xac_nhan_trung}`);
  ok('Màn xem trước lần 2 có cảnh báo "đã nạp rồi"',
     (xem2.canh_bao || []).some(c => /đã nạp/i.test(c)), JSON.stringify(xem2.canh_bao).slice(0, 130));
  ok('Màn xem trước bắt XÁC NHẬN RIÊNG, không cho bấm trôi', xem2.can_xac_nhan_trung === true);
  ok('Xem trước chỉ ra được lần nạp trước (phiếu nào, ai nạp, lúc nào)',
     !!(xem2.nap_trung && xem2.nap_trung.lan_truoc && xem2.nap_trung.lan_truoc[0] &&
        xem2.nap_trung.lan_truoc[0].phieu_id && xem2.nap_trung.lan_truoc[0].nguoi_ten),
     JSON.stringify(xem2.nap_trung && xem2.nap_trung.lan_truoc && xem2.nap_trung.lan_truoc[0] || null).slice(0, 110));

  // Xác nhận rồi thì PHẢI cho qua — chặn được nhưng không mở ra là khoá luôn
  // việc thật (kho nhập thêm cùng mã, cùng file mẫu).
  const k4 = await ghi(env, tep, GHEP_TON, 'ton_kho', 'TonDauKy.csv', { xacNhanTrung: true });
  ok('Sếp tick xác nhận thì vẫn nạp được (chặn chứ không khoá chết)',
     !k4.loi && tonCua(db) === t1 + 5000, `${t1} → ${tonCua(db)}`);
}

console.log('\n① b. FILE CŨ THÊM VÀI DÒNG MỚI RỒI NẠP LẠI CẢ FILE');
{
  /* Ca hiểm hơn ca trên: vân tay nội dung KHÁC (file có thêm dòng) nhưng
     phần trùng vẫn cộng đôi. Người ta hay làm đúng như vậy — thêm mấy mã mới
     vào cuối file cũ rồi nạp lại cả file. */
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(60), GHEP_SP);
  await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton_T9.csv');
  const t1 = tonCua(db);
  const kq = await ghi(env, csvTon(60), GHEP_TON, 'ton_kho', 'Ton_T9_v2.csv');
  tin(`file cũ 50 mã đã nạp; file mới 60 mã (50 cũ + 10 mới) → ${kq.ma || 'cho qua'}`);
  ok('Bắt được ca "thêm vài dòng rồi nạp lại cả file"', kq.ma === 409, String(kq.ma));
  ok('Nói đúng số mã bị trùng', /50 mã hàng/.test(kq.loi || ''), String(kq.loi).slice(0, 100));
  ok('Tồn KHÔNG đổi khi bị chặn', tonCua(db) === t1, `${t1} → ${tonCua(db)}`);
}

console.log('\n① c. NẠP TỒN CHO NHỮNG MÃ CHƯA TỪNG NẠP — KHÔNG ĐƯỢC CHẶN OAN');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(30, 'AA'), GHEP_SP);
  await ghi(env, csvSP(30, 'BB'), GHEP_SP);
  await ghi(env, csvTon(30, 100, 'AA'), GHEP_TON, 'ton_kho', 'ton_A.csv');
  const kq = await ghi(env, csvTon(30, 100, 'BB'), GHEP_TON, 'ton_kho', 'ton_B.csv');
  ok('Nhóm mã khác hoàn toàn thì nạp thẳng, không hỏi lại',
     !kq.loi && tonCua(db) === 6000, kq.loi ? String(kq.ma) : String(tonCua(db)));
}

/* ==========================================================================
   ĐƯỜNG LÙI — gỡ một lượt nạp ra khỏi sổ cái
   ========================================================================== */
console.log('\n══ ĐƯỜNG LÙI — GỠ MỘT LƯỢT NẠP ══');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(20), GHEP_SP);

  // Một phiếu NHẬP TAY có sẵn — gỡ lượt nạp file KHÔNG được đụng vào nó
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
              SELECT 'pn_tay_01', id, 'nhap', 7, 'Nhập tay ở màn Kho vận', 'NS-NGOC'
                FROM san_pham LIMIT 1`).run();
  const tonTruoc = tonCua(db);

  const kq = await ghi(env, csvTon(20), GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  ok('Nạp xong có trả về mã phiếu để gỡ', !!kq.phieu_id, String(kq.phieu_id));
  const tonSauNap = tonCua(db);
  tin(`tồn: ${tonTruoc} (nhập tay) → ${tonSauNap} (sau khi nạp file)`);

  const ds = await nap.dsLuotNap(env, PHIEN, 10);
  ok('Danh sách lượt nạp có lượt vừa rồi, kèm số dòng và số lượng',
     !!(ds.ds && ds.ds[0] && ds.ds[0].phieu_id === kq.phieu_id &&
        ds.ds[0].so_dong === 20 && ds.ds[0].so_luong === 2000),
     JSON.stringify(ds.ds && ds.ds[0]).slice(0, 140));
  ok('Danh sách hiện đúng TÊN FILE cho Sếp nhận ra',
     /TonDauKy\.csv/.test((ds.ds && ds.ds[0] && ds.ds[0].ten_tep) || ''),
     String(ds.ds && ds.ds[0] && ds.ds[0].ten_tep));

  const go = await nap.huyLuotNap(env, PHIEN, kq.phieu_id);
  tin(`gỡ: ${go.tin || go.loi}`);
  ok('Gỡ xong tồn trở lại đúng như trước khi nạp', tonCua(db) === tonTruoc,
     `${tonSauNap} → ${tonCua(db)} · trước khi nạp ${tonTruoc}`);
  ok('Phiếu NHẬP TAY không bị đụng tới',
     Number(db.prepare(`SELECT COUNT(*) AS n FROM giao_dich_kho WHERE phieu_id='pn_tay_01'`).get().n) === 1);
  ok('Câu báo nói rõ gỡ bao nhiêu dòng, bao nhiêu đơn vị',
     /20 dòng/.test(go.tin || '') && /2.000 đơn vị/.test(go.tin || ''), String(go.tin));
  ok('Việc gỡ CÓ ghi vết (ai gỡ, phiếu nào)',
     /đã gỡ khỏi sổ cái bởi Bùi Thị Ngọc/.test(
       db.prepare(`SELECT ly_do FROM lich_su_thay_doi_nen WHERE ban_ghi_id=?`).get(kq.phieu_id)?.ly_do || ''));

  const go2 = await nap.huyLuotNap(env, PHIEN, kq.phieu_id);
  ok('Gỡ lần hai bị chặn, không xoá lan sang dữ liệu khác', go2.ma === 409, String(go2.ma));
  const go3 = await nap.huyLuotNap(env, PHIEN, 'pn_tay_01');
  ok('KHÔNG gỡ được phiếu nhập tay qua cửa này', go3.ma === 404, String(go3.ma));
  const go4 = await nap.huyLuotNap(env, { nhan_su_id: 'X', vai_tro: 'ke_toan_truong' }, kq.phieu_id);
  ok('Người không có quyền thao tác kho thì không gỡ được (403)', go4.ma === 403, String(go4.ma));

  // Gỡ rồi thì nạp lại chính file đó phải trôi, không bị coi là trùng nữa
  const lai = await ghi(env, csvTon(20), GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  ok('Gỡ xong nạp lại file đó KHÔNG còn bị coi là trùng',
     !lai.loi && tonCua(db) === tonSauNap, lai.loi ? String(lai.ma) : String(tonCua(db)));
}

/* ==========================================================================
   ② NGÃ GIỮA CHỪNG — hoặc vào hết, hoặc không vào gì
   ========================================================================== */
console.log('\n══ ② NGÃ GIỮA CHỪNG ══');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(300), GHEP_SP);
  const goc = env.DB.batch.bind(env.DB);
  let lan = 0;
  env.DB.batch = async ds => { if (++lan === 4) throw new Error('D1 network error'); return goc(ds); };

  const soTruoc = soSo(db) || 0;          // sổ ngày đã có phần nạp danh mục ở trên
  let e = null;
  try { await ghi(env, csvTon(300), GHEP_TON, 'ton_kho', 'TonDauKy.csv'); } catch (er) { e = er; }
  env.DB.batch = goc;

  tin(`câu lỗi: ${e && e.message}`);
  ok('Ngã giữa chừng vẫn NÉM LỖI ra ngoài, không nuốt', !!e, e ? '' : '(nuốt lỗi!)');
  ok('Sổ cái KHÔNG còn dòng nửa vời', tonCua(db) === 0, `còn ${tonCua(db)} đơn vị`);
  ok('Không còn lô hàng mồ côi',
     Number(db.prepare('SELECT COUNT(*) AS n FROM lo_hang').get().n) === 0);
  ok('Không còn ghi vết của lượt nạp hỏng',
     Number(db.prepare(`SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen WHERE bang='giao_dich_kho'`).get().n) === 0);
  ok('Câu lỗi nói rõ ĐÃ GHI ĐƯỢC BAO NHIÊU / TỔNG BAO NHIÊU',
     /\d+\/300 dòng/.test(e ? e.message : ''), e ? e.message.slice(0, 80) : '');
  ok('Câu lỗi nói rõ ĐÃ GỠ SẠCH hay CÒN SÓT', /gỡ sạch|còn sót/i.test(e ? e.message : ''));
  ok('Câu lỗi bằng tiếng người, không lộ chữ kỹ thuật',
     !!e && !/batch|network error|undefined|SQLITE/i.test(e.message), e ? e.message.slice(0, 60) : '');
  /* ⚠️ CANH BẰNG SỐ THẬT, KHÔNG CANH "LỚN HƠN 0".
     Lần nạp đã ĐẶT CHỖ trước khi ghi, nên sổ ngày lớn hơn 0 kể cả khi không
     ai chỉnh lại — "> 0" là phép đo mù. Phải canh sổ ngày BẰNG ĐÚNG số lượt
     ghi thật mà lần ngã đó tiêu (kèm cả lượt dọn). Chính bàn đo này bắt được
     lỗ thủng đó ở chế độ --tu-kiem ca ② b. */
  const themVaoSo = (soSo(db) || 0) - soTruoc;
  tin(`sổ ngày cộng thêm ${themVaoSo} · lượt ghi thật của lần ngã = ${e && e.luot_ghi_that}`);
  ok('Lượt ghi đã tiêu vào sổ ngày ĐÚNG BẰNG số thật (không giữ lại phần đặt chỗ thừa)',
     !!e && themVaoSo === e.luot_ghi_that && e.luot_ghi_that > 0,
     `sổ +${themVaoSo} · thật ${e && e.luot_ghi_that}`);

  // Nạp lại sau khi ngã phải ra ĐÚNG số, không gấp rưỡi
  const k2 = await ghi(env, csvTon(300), GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  ok('Nạp lại sau khi ngã ra ĐÚNG 30.000, không thừa',
     !k2.loi && tonCua(db) === 30000, k2.loi ? String(k2.ma) : String(tonCua(db)));
}

console.log('\n② b. NGÃ GIỮA CHỪNG KHI NẠP DANH MỤC');
{
  const db = dungCsdl(), env = dungD1(db);
  const goc = env.DB.batch.bind(env.DB);
  let lan = 0;
  env.DB.batch = async ds => { if (++lan === 3) throw new Error('D1 network error'); return goc(ds); };
  let e = null;
  try { await ghi(env, csvSP(200), GHEP_SP); } catch (er) { e = er; }
  env.DB.batch = goc;
  const sp = Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n);
  ok('Danh mục ngã giữa chừng cũng gỡ sạch', sp === 0, `còn ${sp}/200 dòng`);
  ok('Không còn ghi vết của lượt nạp hỏng',
     Number(db.prepare('SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen').get().n) === 0);
  ok('Lượt ghi đã tiêu vào sổ ngày đúng bằng số thật',
     !!e && soSo(db) === e.luot_ghi_that && e.luot_ghi_that > 0,
     `sổ ${soSo(db)} · thật ${e && e.luot_ghi_that}`);
  const k2 = await ghi(env, csvSP(200), GHEP_SP);
  ok('Nạp lại sau khi ngã ra đủ 200 mã', !k2.loi && k2.da_them === 200, String(k2.da_them));
}

console.log('\n② c. NGÃ KHI SỬA DANH MỤC — giá trị cũ phải được trả về');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(120), GHEP_SP);
  const tenCu = db.prepare(`SELECT ten FROM san_pham WHERE ma_sku='SP-00001'`).get().ten;
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  for (let i = 1; i <= 120; i++) s += `SP-${String(i).padStart(5, '0')},"Tên mới ${i}",Nhóm mới,hộp,99\n`;
  const goc = env.DB.batch.bind(env.DB);
  let lan = 0;
  env.DB.batch = async ds => { if (++lan === 3) throw new Error('D1 network error'); return goc(ds); };
  try { await ghi(env, B(s), GHEP_SP); } catch { /* mong đợi */ }
  env.DB.batch = goc;
  const tenSau = db.prepare(`SELECT ten FROM san_pham WHERE ma_sku='SP-00001'`).get().ten;
  ok('Dòng đã bị sửa dở được trả về đúng giá trị cũ', tenSau === tenCu, `${tenCu} → ${tenSau}`);
  ok('Không sót ghi vết của lượt sửa hỏng',
     Number(db.prepare(`SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen WHERE truong='ten'`).get().n) === 0);
}

/* ==========================================================================
   ③ ĐẶT CHỖ HẠN MỨC — nhiều người nạp cùng lúc
   ========================================================================== */
console.log('\n══ ③ ĐẶT CHỖ HẠN MỨC GHI ══');
{
  const db = dungCsdl(), env = dungD1(db);
  db.prepare('INSERT INTO d1_ghi_ngay (ngay, so_dong, da_bao) VALUES (?, ?, 0)').run(NGAY(), 35000);
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  const tep = t => { let x = s; for (let i = 1; i <= 5000; i++) x += `${t}-${String(i).padStart(5, '0')},"Hạt ${i}",Hạt,túi,5\n`; return B(x); };
  const [a, b, c] = await Promise.all([
    ghi(env, tep('AA'), GHEP_SP, 'san_pham', 'sep.csv'),
    ghi(env, tep('BB'), GHEP_SP, 'san_pham', 'duy.csv'),
    ghi(env, tep('CC'), GHEP_SP, 'san_pham', 'huong.csv')
  ]);
  const cuoi = soSo(db);
  const soChan = [a, b, c].filter(k => k.ma === 429).length;
  tin(`Sếp/Duy/Hương: ${[a, b, c].map(k => k.ma === 429 ? 'CHẶN 429' : k.luot_ghi_that + ' lượt').join(' · ')}`);
  tin(`sổ ngày: 35.000 → ${cuoi} / hạn mức 100.000 · mức phải giữ 80.000`);
  ok('Ba người nạp CÙNG LÚC không cùng lọt qua', soChan >= 2, `chỉ chặn ${soChan}/2`);
  ok('Sổ ngày không ăn vào phần chừa 20.000 cho đồng bộ sàn', cuoi <= 80000, String(cuoi));
  ok('Sổ ngày không vượt hạn mức', cuoi <= 100000, String(cuoi));
  ok('Người bị chặn KHÔNG để lại dòng nào trong CSDL',
     Number(db.prepare(`SELECT COUNT(*) AS n FROM san_pham WHERE ma_sku LIKE 'BB-%' OR ma_sku LIKE 'CC-%'`).get().n) === 0 ||
     soChan === 0);
}

console.log('\n③ b. CHỖ ĐÃ ĐẶT PHẢI ĐƯỢC TRẢ LẠI KHI BỊ CHẶN');
{
  const db = dungCsdl(), env = dungD1(db);
  db.prepare('INSERT INTO d1_ghi_ngay (ngay, so_dong, da_bao) VALUES (?, ?, 0)').run(NGAY(), 95000);
  const kq = await ghi(env, csvSP(1000), GHEP_SP);
  ok('Trả 429', kq.ma === 429, String(kq.ma));
  ok('Sổ ngày về ĐÚNG số cũ (chỗ đặt đã trả lại hết)', soSo(db) === 95000, String(soSo(db)));
  ok('Không ghi một dòng nào', Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n) === 0);
}

console.log('\n③ c. SỔ NGÀY PHẢI BẰNG ĐÚNG LƯỢT GHI THẬT, KHÔNG PHẢI DỰ TÍNH');
{
  const db = dungCsdl(), env = dungD1(db);
  const k1 = await ghi(env, csvSP(100), GHEP_SP);
  const k2 = await ghi(env, csvSP(200), GHEP_SP);
  const tong = k1.luot_ghi_that + k2.luot_ghi_that;
  tin(`lượt ghi thật ${k1.luot_ghi_that} + ${k2.luot_ghi_that} = ${tong} · sổ ngày ${soSo(db)}`);
  ok('Sổ ngày = tổng lượt ghi thật (dự tính đã được chỉnh lại)', soSo(db) === tong,
     `sổ ${soSo(db)} · thật ${tong}`);
}

/* ==========================================================================
   ④ CRON CHỐT SỔ CÙNG ISOLATE — không được đếm hai lần
   ========================================================================== */
console.log('\n══ ④ CRON CHỐT SỔ CÙNG ISOLATE ══');
{
  const db = dungCsdl(), env = dungD1(db);
  canhbao.datLai(0);
  const k = await ghi(env, csvSP(100), GHEP_SP);
  const sauNap = soSo(db);
  const treo = canhbao.dangCho();
  tin(`ghi thật ${k.luot_ghi_that} · sổ ngày ${sauNap} · bộ đếm treo = ${treo}`);
  ok('Nạp file KHÔNG để lại số treo cho cron vớt lần nữa', treo === 0, String(treo));
  await canhbao.chotVaCanhBao(env, async () => {});
  ok('Cron chốt sổ cùng isolate KHÔNG cộng đôi', soSo(db) === sauNap,
     `${sauNap} → ${soSo(db)}`);
}

/* ==========================================================================
   ⑤ .XLSX NHIỀU BẢNG + mấy ổ cùng chỗ
   ========================================================================== */
console.log('\n══ ⑤ .XLSX NHIỀU BẢNG ══');

/* Dựng .xlsx kiểu "store" (kiểu nén 0 — bungPhan đọc được) */
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
function dungZip(phan) {
  const enc = new TextEncoder();
  const cuc = [], trung = [];
  let off = 0;
  for (const p of phan) {
    const ten = enc.encode(p.ten), du = enc.encode(p.noiDung);
    const c = crc32(du);
    const h = new Uint8Array(30 + ten.length);
    const dv = new DataView(h.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(8, 0, true);
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
  const ra = new Uint8Array(tat.reduce((a, b) => a + b.length, 0));
  let p = 0; for (const x of tat) { ra.set(x, p); p += x.length; }
  return ra;
}
const SHEET = rows => '<?xml version="1.0"?><worksheet><sheetData>' + rows + '</sheetData></worksheet>';
const oStr = (ref, s) => `<c r="${ref}" t="inlineStr"><is><t>${s}</t></is></c>`;
const oNum = (ref, v) => `<c r="${ref}"><v>${v}</v></c>`;

{
  /* Dựng lại đúng hình dạng file thật của Sếp: bảng 1 là trang hướng dẫn,
     số liệu nằm ở bảng 2. */
  const z = dungZip([
    { ten: 'xl/workbook.xml', noiDung:
      '<?xml version="1.0"?><workbook xmlns:r="r">' +
      '<sheet name="Hướng dẫn nhập khẩu" sheetId="1" r:id="rId1"/>' +
      '<sheet name="Tep nhap khau" sheetId="2" r:id="rId2"/>' +
      '<sheet name="Danh mục" sheetId="3" r:id="rId3"/></workbook>' },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung:
      '<?xml version="1.0"?><Relationships>' +
      '<Relationship Id="rId1" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Target="worksheets/sheet2.xml"/>' +
      '<Relationship Id="rId3" Target="worksheets/sheet3.xml"/></Relationships>' },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'HƯỚNG DẪN NHẬP KHẨU HÀNG HÓA')}</row>` +
        `<row r="2">${oStr('A2', 'Các bước để nhập khẩu thêm mới hàng hóa')}</row>`) },
    { ten: 'xl/worksheets/sheet2.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Tên sản phẩm')}</row>` +
        `<row r="2">${oStr('A2', 'SP-0001')}${oStr('B2', 'Hạt điều rang muối')}</row>` +
        `<row r="3">${oStr('A3', 'SP-0002')}${oStr('B3', 'Hạnh nhân')}</row>`) },
    { ten: 'xl/worksheets/sheet3.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'Nhóm')}</row><row r="2">${oStr('A2', 'Hạt')}</row>`) }
  ]);

  const b0 = await docb.docBang(z, 'nhapkhau.xlsx', { demDong: true });
  tin(`bảng ERP liệt kê: ${JSON.stringify(b0.dsBang)}`);
  ok('Liệt kê ĐỦ tên cả 3 bảng', (b0.dsBang || []).length === 3 &&
     b0.dsBang[0].ten === 'Hướng dẫn nhập khẩu' && b0.dsBang[1].ten === 'Tep nhap khau');
  ok('Có SỐ DÒNG từng bảng để Sếp chọn cho đúng',
     b0.dsBang.every(x => typeof x.so_dong === 'number'), JSON.stringify(b0.dsBang.map(x => x.so_dong)));
  ok('Nói rõ đang đọc bảng nào',
     (b0.canhBao || []).some(c => /3 bảng/.test(c) && /Hướng dẫn nhập khẩu/.test(c)),
     JSON.stringify(b0.canhBao).slice(0, 130));
  ok('Mặc định vẫn là bảng đầu (máy không tự nhảy sang bảng khác)',
     b0.bangChon === 0 && b0.cot[0] === 'HƯỚNG DẪN NHẬP KHẨU HÀNG HÓA');

  const b2 = await docb.docBang(z, 'nhapkhau.xlsx', { bangChon: 1 });
  tin(`chọn bảng 2 → cột: ${JSON.stringify(b2.cot)} · ${b2.dong.length} dòng`);
  ok('CHỌN được bảng 2 và ra đúng số liệu thật',
     b2.cot[0] === 'Mã SKU' && b2.dong.length === 2 && b2.dong[0][0] === 'SP-0001');
  ok('Bảng đang đọc có tên trả về cho giao diện', b2.tenBang === 'Tep nhap khau', String(b2.tenBang));

  // Chọn bảng ngoài khoảng thì rơi về bảng đầu chứ không nổ
  const b9 = await docb.docBang(z, 'nhapkhau.xlsx', { bangChon: 99 });
  ok('Chọn bảng không có thật thì rơi về bảng đầu, không ném lỗi', b9.bangChon === 0);
}

console.log('\n⑤ b. HỆ NGÀY 1904 · Ô GỘP · QUÁ 200 CỘT · FILE ĐẶT MẬT KHẨU');
{
  const serial = Math.round((Date.UTC(2026, 11, 31) - Date.UTC(1899, 11, 30)) / 86400000);
  const z04 = dungZip([
    { ten: 'xl/workbook.xml', noiDung:
      '<?xml version="1.0"?><workbook xmlns:r="r"><workbookPr date1904="1"/>' +
      '<sheet name="S" sheetId="1" r:id="rId1"/></workbook>' },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung:
      '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>' },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(
        `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Số lượng tồn')}${oStr('C1', 'Hạn sử dụng')}</row>` +
        `<row r="2">${oStr('A2', 'SP-00001')}${oNum('B2', '10')}${oNum('C2', serial - 1462)}</row>`) }
  ]);
  const b04 = await docb.docBang(z04, 'mac.xlsx');
  const kb = nap.kiemBang(b04, { ma_sku: 0, so_luong: 1, han_su_dung: 2 }, 'ton_kho');
  tin(`hệ 1904: ô thô ${b04.dong[0][2]} → đọc ra ${kb.banGhi[0] && kb.banGhi[0].han_su_dung}`);
  ok('Hệ ngày 1904 đọc ra ĐÚNG 31/12/2026 (bù 4 năm 1 ngày)',
     kb.banGhi[0] && kb.banGhi[0].han_su_dung === '2026-12-31',
     String(kb.banGhi[0] && kb.banGhi[0].han_su_dung));
  ok('Và có NÓI RA là đã bù', (b04.canhBao || []).some(c => /1904/.test(c)),
     JSON.stringify(b04.canhBao).slice(0, 110));

  const zGop = dungZip([
    { ten: 'xl/workbook.xml', noiDung: '<?xml version="1.0"?><workbook xmlns:r="r"><sheet name="S" sheetId="1" r:id="rId1"/></workbook>' },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>' },
    { ten: 'xl/worksheets/sheet1.xml', noiDung:
      '<?xml version="1.0"?><worksheet><sheetData>' +
      `<row r="1">${oStr('A1', 'Mã SKU')}${oStr('B1', 'Tên sản phẩm')}</row>` +
      `<row r="2">${oStr('A2', 'SP-A')}${oStr('B2', 'Hạt điều')}</row>` +
      `<row r="3">${oStr('A3', 'SP-B')}</row>` +
      '</sheetData><mergeCells count="1"><mergeCell ref="B2:B3"/></mergeCells></worksheet>' }
  ]);
  const bGop = await docb.docBang(zGop, 'ogop.xlsx');
  ok('Nói cho người dùng biết file có Ô GỘP và vì sao dòng dưới trống',
     (bGop.canhBao || []).some(c => /gộp/i.test(c) && /trống/i.test(c)),
     JSON.stringify(bGop.canhBao).slice(0, 130));

  // 260 cột CÓ nội dung -> phải báo, không cắt im lặng
  const tenCot = i => { let n = i + 1, s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  let td = '', dg = '';
  for (let i = 0; i < 260; i++) { td += oStr(tenCot(i) + '1', 'C' + (i + 1)); dg += oStr(tenCot(i) + '2', 'v' + (i + 1)); }
  const zCot = dungZip([
    { ten: 'xl/workbook.xml', noiDung: '<?xml version="1.0"?><workbook xmlns:r="r"><sheet name="S" sheetId="1" r:id="rId1"/></workbook>' },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>' },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(`<row r="1">${td}</row><row r="2">${dg}</row>`) }
  ]);
  let eCot = null;
  try { await docb.docBang(zCot, 'nhieucot.xlsx'); } catch (er) { eCot = er; }
  ok('260 cột CÓ dữ liệu: báo ra chứ không lặng lẽ vứt 60 cột',
     !!eCot && eCot.name === 'LoiDocBang' && /260 cột/.test(eCot.message),
     eCot ? eCot.message.slice(0, 100) : '(im lặng cắt!)');

  // Cột trống ngoài trần thì KHÔNG được kêu oan (file Excel hay đèo cột rỗng)
  let td2 = '', dg2 = '';
  for (let i = 0; i < 60; i++) { td2 += oStr(tenCot(i) + '1', 'C' + (i + 1)); dg2 += oStr(tenCot(i) + '2', 'v' + (i + 1)); }
  for (let i = 200; i < 240; i++) { td2 += oStr(tenCot(i) + '1', ''); dg2 += oStr(tenCot(i) + '2', ''); }
  const zRong = dungZip([
    { ten: 'xl/workbook.xml', noiDung: '<?xml version="1.0"?><workbook xmlns:r="r"><sheet name="S" sheetId="1" r:id="rId1"/></workbook>' },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>' },
    { ten: 'xl/worksheets/sheet1.xml', noiDung: SHEET(`<row r="1">${td2}</row><row r="2">${dg2}</row>`) }
  ]);
  let bRong = null, eRong = null;
  try { bRong = await docb.docBang(zRong, 'cotrong.xlsx'); } catch (er) { eRong = er; }
  ok('Cột RỖNG ngoài trần thì bỏ im lặng, không kêu oan',
     !!bRong && bRong.cot.length === 60, eRong ? eRong.message.slice(0, 70) : String(bRong && bRong.cot.length));

  // File .xlsx đặt mật khẩu (kho OLE2) — đừng gọi nhầm là .xls 2003
  const ole = new Uint8Array(600);
  ole.set([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
  const ten16 = [];
  for (const ch of 'EncryptedPackage') { ten16.push(ch.charCodeAt(0), 0); }
  ole.set(ten16, 100);
  let eMk = null;
  try { await docb.docBang(ole, 'khoa.xlsx'); } catch (er) { eMk = er; }
  tin(`file có mật khẩu: ${eMk && eMk.message}`);
  ok('File .xlsx đặt mật khẩu: nói đúng bệnh, không đổ cho ".xls 2003"',
     !!eMk && /mật khẩu/i.test(eMk.message) && !/2003/.test(eMk.message),
     eMk ? eMk.message.slice(0, 100) : '(không lỗi!)');

  // .xls 2003 THẬT thì vẫn phải nói là .xls 2003
  const xls = new Uint8Array(600);
  xls.set([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
  let eXls = null;
  try { await docb.docBang(xls, 'cu.xls'); } catch (er) { eXls = er; }
  ok('.xls đời 2003 thật thì vẫn chẩn đoán đúng là .xls 2003',
     !!eXls && /2003/.test(eXls.message), eXls ? eXls.message.slice(0, 70) : '');
}

/* ==========================================================================
   ⑤ c. ĐO TRÊN FILE THẬT CỦA SẾP — CHỈ ĐỌC
   ========================================================================== */
console.log('\n⑤ c. FILE THẬT TRÊN MÁY SẾP (chỉ đọc, không sửa không xoá)');
{
  /* Hai file này là hai file REV-0060 nêu đích danh. Khoá cứng đường dẫn chứ
     không quét thư mục: quét thì lần chạy sau chỉ cần gặp file khác là xanh,
     mà con số "đọc được N file thật" lại không ai bảo vệ được. */
  const CA_THAT = [
    { duong: 'C:/Users/Admin/Desktop/Nhap_khau_hang_hoa.xlsx',
      soBangToiThieu: 7, moTa: 'file 7 bảng, bảng 1 là trang hướng dẫn' },
    { duong: 'C:/Users/Admin/Desktop/AI/TongHop_SanPham_Theo_SKU.xlsx',
      soBangToiThieu: 2, moTa: 'file danh mục 797 dòng, 2 bảng — trước đây ra đúng là do MAY' }
  ];
  let daDo = 0;
  for (const ca of CA_THAT) {
    if (!existsSync(ca.duong)) {
      ok(`file thật có mặt để đo: ${path.basename(ca.duong)}`, false,
         'KHÔNG TÌM THẤY — ca này MÙ, sửa lại đường dẫn');
      continue;
    }
    const byte = new Uint8Array(readFileSync(ca.duong));
    const t0 = Date.now();
    const b = await docb.docBang(byte, path.basename(ca.duong), { demDong: true });
    daDo++;
    tin(`${path.basename(ca.duong)} (${(statSync(ca.duong).size / 1024).toFixed(0)} KB) · ` +
        `${b.dsBang.length} bảng · ${Date.now() - t0} ms`);
    tin(`   bảng: ${b.dsBang.map(x => `${x.ten} (${x.so_dong} dòng)`).join(' | ')}`);
    ok(`Liệt kê đủ bảng của "${path.basename(ca.duong)}" — ${ca.moTa}`,
       b.dsBang.length >= ca.soBangToiThieu, `${b.dsBang.length} bảng`);
    /* Canh ĐÚNG câu "File có N bảng … đang đọc bảng X" — không nhận bừa câu
       cảnh báo khác có chữ "bảng" trong đó (file này còn có cả ô gộp). */
    ok(`Có nói rõ file có mấy bảng và đang đọc bảng nào: ${path.basename(ca.duong)}`,
       (b.canhBao || []).some(c => new RegExp(`File có ${b.dsBang.length} bảng`).test(c) &&
                                   c.includes(b.tenBang)),
       JSON.stringify(b.canhBao).slice(0, 110));
    ok(`Mọi bảng đều đếm được số dòng: ${path.basename(ca.duong)}`,
       b.dsBang.every(x => typeof x.so_dong === 'number'),
       JSON.stringify(b.dsBang.map(x => x.so_dong)));
  }

  // Đúng ca REV-0060 nêu: dữ liệu thật của Nhap_khau_hang_hoa nằm ở bảng 2
  const d = 'C:/Users/Admin/Desktop/Nhap_khau_hang_hoa.xlsx';
  if (existsSync(d)) {
    const byte = new Uint8Array(readFileSync(d));
    const b1 = await docb.docBang(byte, 'Nhap_khau_hang_hoa.xlsx');
    const b2 = await docb.docBang(byte, 'Nhap_khau_hang_hoa.xlsx', { bangChon: 1 });
    tin(`bảng 1 cột đầu: "${String(b1.cot[0]).slice(0, 46)}"`);
    tin(`bảng 2 cột: ${JSON.stringify(b2.cot.slice(0, 5))}`);
    ok('Bảng 1 đúng là trang HƯỚNG DẪN (không phải số liệu)',
       /hướng dẫn/i.test(String(b1.cot[0])), String(b1.cot[0]).slice(0, 60));
    ok('Chọn được sang bảng 2 và ra bảng số liệu thật (nhiều cột, có dòng)',
       b2.cot.length >= 3 && b2.dong.length >= 1,
       `${b2.cot.length} cột × ${b2.dong.length} dòng`);
    ok('Đọc bảng 2 KHÔNG còn ra trang hướng dẫn', !/hướng dẫn/i.test(String(b2.cot[0])),
       String(b2.cot[0]).slice(0, 60));
  }
  ok('Đã đo trên đủ HAI file thật REV-0060 nêu đích danh', daDo === 2, `${daDo}/2 file`);
}

/* ==========================================================================
   ⑤ d. MẪU Ở BƯỚC GHÉP CỘT PHẢI HIỆN GIÁ TRỊ ĐÃ ĐỌC
   ========================================================================== */
console.log('\n⑤ d. MẪU HIỆN GIÁ TRỊ ĐÃ ĐỌC (46387 → 31/12/2026)');
{
  const db = dungCsdl(), env = dungD1(db);
  const serial = Math.round((Date.UTC(2026, 11, 31) - Date.UTC(1899, 11, 30)) / 86400000);
  const byte = B(`Mã SKU,Số lượng tồn,Hạn sử dụng\nSP-00001,10,${serial}\n`);
  const mo = await nap.moFile(env, PHIEN, byte, 'ton.csv', 'ton_kho');
  const o = (mo.mau_doc && mo.mau_doc[0] && mo.mau_doc[0][2]) || null;
  tin(`ô thô "${mo.mau_dong[0][2]}" · máy chủ đọc ra ${JSON.stringify(o)}`);
  ok('Máy chủ gửi kèm giá trị ĐÃ ĐỌC cho từng ô mẫu', !!o && o.ngay === '2026-12-31', JSON.stringify(o));
  ok('Ô số lượng cũng có cách hiểu kiểu SỐ',
     !!(mo.mau_doc[0][1] && mo.mau_doc[0][1].so === 10), JSON.stringify(mo.mau_doc[0][1]));
  ok('Giao diện đọc mẫu từ máy chủ, KHÔNG tự viết lại hàm đọc ngày',
     /mau_doc/.test(readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8')));
}

/* ==========================================================================
   ⑥ KINH DOANH CÓ ĐƯỜNG VÀO MÀN NẠP
   ========================================================================== */
console.log('\n══ ⑥ KINH DOANH CÓ ĐƯỜNG VÀO MÀN NẠP ══');
{
  const quyen = await modun('quyen.js');
  const js = readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8');
  const html = readFileSync(path.join(GOC, 'public', 'app.html'), 'utf8');
  const p = { vai_tro: 'van_hanh_san' };

  ok('Máy chủ vẫn cho Kinh doanh nạp danh mục', quyen.duocSuaSanPham(p));
  ok('Kinh doanh KHÔNG có tab Kho vận (nên màn nạp không được nằm trong đó)',
     !quyen.duocXemTab(p, 'khovan'));
  ok('Kinh doanh CÓ tab Kinh doanh', quyen.duocXemTab(p, 'kinhdoanh'));

  /* Lời gọi khởi động màn nạp phải nằm NGOÀI `khoiDongKho` và cắt theo đúng
     hai cờ máy chủ dùng, không cắt theo tab. */
  const goiNgoai = /khoiDongNapFile\(qKhoNap, qSpNap\)/.test(js) &&
                   /qSpNap\.sua \|\| qKhoNap\.thao_tac/.test(js);
  ok('khoiDongNapFile được gọi ĐỘC LẬP với tab Kho vận', goiNgoai);
  ok('Bên trong khoiDongKho KHÔNG còn gọi khoiDongNapFile nữa',
     !/if \(qSanPham\.sua \|\| qKho\.thao_tac\) khoiDongNapFile/.test(js));

  /* Và phải có CHỖ ĐẶT màn cho người không có tab Kho vận. */
  ok('Có nhánh dời khối màn nạp sang tab Kinh doanh khi không có tab Kho vận',
     /!TOI\.quyen\.includes\('khovan'\)/.test(js) && /kd-pane-napfile/.test(js));
  const oCho = html.indexOf('id="kd-pane-napfile"');
  const dauKD = html.indexOf('id="v-kinhdoanh"'), dauKV = html.indexOf('id="v-khovan"');
  ok('Ô chứa màn nạp nằm TRONG khối <section id="v-kinhdoanh">',
     oCho > dauKD && oCho < dauKV, `kinhdoanh@${dauKD} · chỗ@${oCho} · khovan@${dauKV}`);
  ok('Thanh chuyển màn của Kinh doanh nhận thêm mục "napfile"',
     /'vanhanh', 'sanpham', 'rnd', 'cskh', 'napfile'/.test(js));
  ok('Có cắm nút "Nạp từ file" vào thanh chuyển màn Kinh doanh',
     /dataset\.kd = 'napfile'/.test(js) && /Nạp từ file/.test(js));

  /* Cửa máy chủ vẫn phải mở đúng cho vai này (không mở cửa API rồi bỏ trống) */
  const idx = readFileSync(path.join(GOC, 'src', 'index.js'), 'utf8');
  ok('Cửa API nạp vẫn nhận cả tab kinhdoanh',
     /duocXemTab\(phien, 'khovan'\) && !duocXemTab\(phien, 'kinhdoanh'\)/.test(idx));
}

/* ==========================================================================
   TỰ KIỂM — GÀI LẠI TỪNG LỖI VÀO MÃ THẬT
   ========================================================================== */
if (TU_KIEM && !process.env.NAP_SRC) {
  console.log('\n══ TỰ KIỂM — GÀI LẠI SÁU LỖI VÀO MÃ THẬT ══');
  console.log('   (mỗi ca: chép src/ ra chỗ khác, gài lại đúng lỗi REV-0060 bắt được,');
  console.log('    rồi chạy lại chính bàn đo này. Mỗi ca PHẢI làm bàn đo ĐỎ.)\n');

  const CA_GAI = [
    { ten: '① Bỏ dò trùng khi nạp lại file tồn (tồn cộng dồn âm thầm)',
      tep: 'nap-du-lieu.js',
      tim: `    if (cau && !xacNhanTrung) {`,
      thay: `    if (false) {` },

    { ten: '① b Chỉ dò trùng theo nội dung, bỏ dò theo mã hàng (file thêm dòng thì lọt)',
      tep: 'nap-du-lieu.js',
      tim: `    ra.so_ma_trung = daTrung.size;`,
      thay: `    ra.so_ma_trung = 0;   // GÀI LỖI` },

    { ten: '② Ngã giữa chừng thì bỏ mặc, không gỡ lại (để dữ liệu nửa vời)',
      tep: 'nap-du-lieu.js',
      tim: `    const don = await donLaiKhiNga(env, { maDich, phieuId, loIds, themIds, sua: doiChieu.sua, lyDo });`,
      thay: `    const don = { luot: 0, sot: [] };   // GÀI LỖI: không dọn` },

    { ten: '② b Ngã giữa chừng thì lượt ghi đã tiêu không vào sổ ngày',
      tep: 'nap-du-lieu.js',
      tim: `    if (daDatCho || ghiThuc) await chinhLaiCho(env, ghiThuc - daDatCho);`,
      thay: `    if (false) await chinhLaiCho(env, ghiThuc - daDatCho);   // GÀI LỖI` },

    { ten: '③ Quay lại lối ĐỌC-RỒI-QUYẾT hạn mức (nhiều người cùng lọt)',
      tep: 'nap-du-lieu.js',
      sua: [
        [`    const dat = await datChoGhi(env, ghiDuTinh);`,
         `    const conLaiX = await conLaiTrongNgay(env);
    const dat = { so_dong: HAN_MUC_NGAY - conLaiX + ghiDuTinh };   // GÀI LỖI: đọc rồi mới quyết`],
        [`        await traLaiCho(env, daDatCho);`, `        daDatCho = 0;`]
      ] },

    { ten: '④ Đếm lại lượt ghi vào bộ đếm treo (cron cùng isolate cộng đôi)',
      tep: 'nap-du-lieu.js',
      sua: [
        [`import { datChoGhi, traLaiCho, chinhLaiCho, HAN_MUC_NGAY } from './canh-bao-ghi.js';`,
         `import { datChoGhi, traLaiCho, chinhLaiCho, HAN_MUC_NGAY, demGhi } from './canh-bao-ghi.js';`],
        [`      dem(await env.DB.batch(lenh.slice(i, i + CO_LO)));`,
         `      const kqX = await env.DB.batch(lenh.slice(i, i + CO_LO)); demGhi(kqX); dem(kqX);`]
      ] },

    { ten: '⑤ Quay lại lối lấy bảng ĐẦU TIÊN rồi im lặng',
      tep: 'doc-bang.js',
      sua: [
        [`  const chonThat = (Number.isInteger(chon) && chon >= 0 && chon < dsBang.length) ? chon : 0;`,
         `  const chonThat = 0;   // GÀI LỖI: luôn lấy bảng đầu`],
        [`  if (dsBang.length > 1) {
    canhBao.push(`, `  if (false) {
    canhBao.push(`]
      ] },

    { ten: '⑤ b Bỏ đọc cờ hệ ngày 1904 (ô ngày lệch 4 năm 1 ngày, im lặng)',
      tep: 'doc-bang.js',
      tim: `  const he1904 = !!(wb && /<workbookPr\\b[^>]*date1904="(1|true)"/i.test(wb));`,
      thay: `  const he1904 = false;   // GÀI LỖI` },

    { ten: '⑤ c Quay lại cắt cột thứ 201 trở đi trong im lặng',
      tep: 'doc-bang.js',
      tim: `  if (cotVuotTran) {`,
      thay: `  if (false) {` },

    { ten: '⑤ d Chẩn đoán nhầm file .xlsx có mật khẩu thành ".xls 2003"',
      tep: 'doc-bang.js',
      tim: `    return coDauMatKhau(bytes) ? 'co_mat_khau' : 'xls_cu';`,
      thay: `    return 'xls_cu';   // GÀI LỖI` },

    { ten: 'Đường lùi: bỏ xoá dòng sổ cái khi gỡ lượt nạp',
      tep: 'nap-du-lieu.js',
      tim: `  await chay('DELETE FROM giao_dich_kho WHERE phieu_id = ?', [ma]);`,
      thay: `  await chay('SELECT 1 FROM giao_dich_kho WHERE phieu_id = ?', [ma]);   // GÀI LỖI` }
  ];

  const TAM = path.join(GOC, '.tu-kiem-nap-lai');
  let batDuoc = 0;
  for (const ca of CA_GAI) {
    rmSync(TAM, { recursive: true, force: true });
    mkdirSync(TAM, { recursive: true });
    cpSync(path.join(GOC, 'src'), TAM, { recursive: true });

    const duong = path.join(TAM, ca.tep);
    let noi = readFileSync(duong, 'utf8');
    const sua = ca.sua || [[ca.tim, ca.thay]];
    let gaiDuoc = true;
    for (const [tim, thay] of sua) {
      if (!noi.includes(tim)) { gaiDuoc = false; break; }
      noi = noi.replace(tim, thay);
    }
    if (!gaiDuoc) {
      console.log(`  ✗ ${ca.ten}`);
      console.log(`      KHÔNG gài được — mã đã đổi nên ca này MÙ. Sửa lại chuỗi "tim".`);
      continue;
    }
    writeFileSync(duong, noi, 'utf8');

    const kq = spawnSync(process.execPath, [fileURLToPath(import.meta.url)],
                         { env: { ...process.env, NAP_SRC: TAM }, encoding: 'utf8' });
    if (kq.status === 1) {
      const soTruot = (kq.stdout.match(/TRƯỢT (\d+)/) || [])[1] || '?';
      console.log(`  ✓ ${ca.ten}`);
      console.log(`      → bàn đo ĐỎ (${soTruot} ca trượt) — bắt được.`);
      batDuoc++;
    } else {
      console.log(`  ✗ ${ca.ten}`);
      console.log(`      → bàn đo VẪN XANH (mã thoát ${kq.status}). LỖ THỦNG: gài lỗi này vào`);
      console.log(`        sản phẩm thật thì không ai biết.`);
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
