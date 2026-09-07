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

   MỤC ⑦ — BẢY LỖI CỦA CHÍNH BẢN VÁ (REV-0060 vòng 2). Đường lùi `huyLuotNap`
   là mã MỚI, mã XOÁ DỮ LIỆU, và không bàn đo nào canh nó cho tới vòng 2:
     ⑦a CHẶN — gỡ lượt nạp KHÔNG được làm tồn kho âm (hàng đã xuất rồi)
     ⑦b CHẶN — chỉ người đã nạp / quản lý kho mới gỡ được
     ⑦c CAO  — gỡ ngã giữa chừng: đánh dấu trước, xoá sau, nói tiếng người
     ⑦d CAO  — chỗ đặt hạn mức không được rò khi ngã ở bước ghi vết
     ⑦e CAO  — một cái tick không được tắt cả hai lớp chống nạp trùng
     ⑦f CAO  — trần dò trùng đếm theo MÃ, và nói ra khi chạm trần
     ⑦g CAO  — .xlsx: bảng ẩn · bảng đầu rỗng
     ⑦h THẤP — gợi ý ghép cột yếu thì thôi, đừng đoán

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

/* ĐỌC MÃ NGUỒN ĐỂ SOI — LUÔN QUA HÀM NÀY, ĐỪNG GỌI THẲNG `readFileSync`.
   Git trên máy Windows của Sếp bật `core.autocrlf=true`, nên tệp trong cây làm
   việc xuống dòng bằng CRLF trong khi mọi biểu thức soi ở dưới viết `\n`. Hậu
   quả đo được (REV-0063 vòng 2): ba chốt ⑧e đỏ trên MỌI bản lấy về ở Windows —
   kể cả `origin/main af951b8`, nơi `src/doc-bang.js` giống hệt từng ký tự sau
   khi chuẩn hoá xuống dòng. Bàn đo đỏ vì cách lấy tệp, không vì mã hỏng: đúng
   loại "đỏ nhầm lý do" mà kho mã này chống, chỉ khác là nó nhầm sang phía kêu
   oan. Chuẩn hoá về LF ở ĐÚNG MỘT CHỖ, không rải `\r?` vào từng regex. */
const docNguon = (ten) => readFileSync(path.join(NGUON, ten), 'utf8').replace(/\r\n/g, '\n');

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
/* `hong(sql)`  — bàn tay CHẶN: câu lệnh nào khớp thì ném đúng thứ D1 thật ném.
   `deo(sql)`   — bàn tay ĐẮP: trả sẵn kết quả đọc cho một câu, để dựng được
                  cảnh "kho đã có hơn 50.000 mã" mà không phải chèn 50.000
                  dòng thật (đo cái TRẦN chứ không đo sức của node:sqlite). */
function dungD1(db, hong = null, deo = null) {
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
    async all() {
      const dap = deo && deo(sql, tso);
      if (dap) return dap;
      return { results: db.prepare(sql).all(...tso) };
    }
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

  /* ---- HAI LỚP, HAI CỬA (REV-0060 vòng 2 · CAO-⑤) ----
     Đây là ca TRÙNG NGUYÊN FILE = lớp (a). Cái tick KHÔNG được mở cửa này:
     lớp (b) kêu ở mọi lần kho nhập lại cùng mã nên cái tick đã thành phản xạ,
     mà phản xạ thì gạt luôn tín hiệu mạnh nhất. Phải gõ lại tên file. */
  const k4a = await ghi(env, tep, GHEP_TON, 'ton_kho', 'TonDauKy.csv', { xacNhanTrung: true });
  ok('Trùng NGUYÊN FILE: cái tick KHÔNG mở được cửa (vẫn 409)',
     k4a.ma === 409 && tonCua(db) === t1, `${k4a.ma} · tồn ${tonCua(db)}`);
  ok('Câu chặn chỉ đúng cách qua cửa: GÕ LẠI TÊN FILE',
     /gõ lại tên file/i.test(k4a.loi || ''), String(k4a.loi).slice(-120));
  const k4b = await ghi(env, tep, GHEP_TON, 'ton_kho', 'TonDauKy.csv',
                        { xacNhanTenTep: 'TonDauKy_sai.csv' });
  ok('Gõ SAI tên file cũng không qua', k4b.ma === 409 && tonCua(db) === t1, String(k4b.ma));
  // Xác nhận đúng thì PHẢI cho qua — chặn được nhưng không mở ra là khoá luôn
  // việc thật (kho nhập thêm cùng mã, cùng file mẫu).
  const k4 = await ghi(env, tep, GHEP_TON, 'ton_kho', 'TonDauKy.csv',
                       { xacNhanTenTep: 'tondauky.csv' });
  ok('Gõ ĐÚNG tên file thì vẫn nạp được (chặn chứ không khoá chết)',
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
   ⑦ VÒNG 2 — BẢY LỖI CỦA CHÍNH BẢN VÁ (REV-0060 vòng 2)
   --------------------------------------------------------------------------
   Sáu lỗi trên là lỗi của bản gốc. Bảy ca dưới đây là lỗi mà BẢN VÁ ĐẺ RA —
   nặng nhất là đường lùi `huyLuotNap`: mã MỚI, mã XOÁ DỮ LIỆU, và không bàn
   đo nào canh nó cho tới khi Hồ Ly soi vòng 2.
   ========================================================================== */
console.log('\n══ ⑦ a. GỠ LƯỢT NẠP KHÔNG ĐƯỢC LÀM TỒN ÂM (CHẶN-①) ══');

/* Bằng `KE_MA_TOI_DA` trong src/nap-du-lieu.js — số mã kê đích danh trong câu
   từ chối. Viết ra đây để đổi bên kia mà quên bên này thì bàn đo kêu. */
const KE_MA_TOI_DA_MONG_DOI = 5;

/* Dựng đúng cảnh Hồ Ly dựng: nạp tồn → kho bán bớt → mới bấm gỡ.
   `am = true` là đúng quy ước kho.js (dòng xuất lưu số ÂM); `am = false` là
   quy ước dương mà dữ liệu cũ/bàn đo khác dùng. Chốt chặn phải đúng ở CẢ HAI,
   vì đọc sai dấu là chốt chặn tự mù. */
async function canhBanBot(soMa, slNap, slBan, am = true, phien = PHIEN) {
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(soMa), GHEP_SP);
  const k = await ghi(env, csvTon(soMa, slNap), GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  if (slBan > 0) {
    db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
                SELECT 'px_ban_01', id, 'xuat', ?, 'Xuất bán cho khách', 'NS-NGOC' FROM san_pham`)
      .run(am ? -slBan : slBan);
  }
  const truoc = tonCua(db);
  const g = await nap.huyLuotNap(env, phien, k.phieu_id);
  const soAm = Number(db.prepare(
    `SELECT COUNT(*) AS n FROM (
        SELECT san_pham_id, SUM(CASE WHEN loai='xuat' THEN -ABS(so_luong) ELSE so_luong END) AS t
          FROM giao_dich_kho GROUP BY san_pham_id) WHERE t < 0`).get().n);
  return { db, env, k, g, truoc, sau: tonCua(db), soAm,
           conDong: Number(db.prepare(`SELECT COUNT(*) AS n FROM giao_dich_kho WHERE phieu_id=?`)
                             .get(k.phieu_id).n) };
}

{
  // Đúng cảnh REV-0060 vòng 2 đo được: 20 mã × 100 nạp, bán 80/mã, rồi gỡ.
  const r = await canhBanBot(20, 100, 80, true);
  tin(`nạp 2.000 → bán 1.600 → bấm gỡ: ${r.g.ok ? 'GỠ RỒI' : r.g.ma} · tồn ${r.truoc} → ${r.sau} · ${r.soAm} mã âm`);
  tin(`ERP nói: "${String(r.g.loi || r.g.tin).slice(0, 150)}…"`);
  ok('Gỡ lượt nạp khi hàng ĐÃ XUẤT: bị từ chối, không xoá gì', r.g.ma === 409 && r.conDong === 20,
     `${r.g.ma} · còn ${r.conDong} dòng`);
  ok('Tồn kho KHÔNG âm, và giữ nguyên như trước khi bấm', r.soAm === 0 && r.sau === r.truoc,
     `${r.truoc} → ${r.sau} · ${r.soAm} mã âm`);
  ok('Câu từ chối nói rõ vì sao (đã xuất hàng) và kê ĐÍCH DANH mã sẽ âm',
     /đã xuất/i.test(r.g.loi || '') && /âm/i.test(r.g.loi || '') && /SP-00001/.test(r.g.loi || ''),
     String(r.g.loi).slice(0, 130));
  ok('Câu từ chối chỉ ĐƯỜNG ĐI TIẾP (phiếu điều chỉnh / gỡ phiếu xuất trước)',
     /điều chỉnh/i.test(r.g.loi || '') && /phiếu xuất/i.test(r.g.loi || ''), String(r.g.loi).slice(-120));
  ok('Và đếm đúng bao nhiêu mã sẽ âm', r.g.so_ma_se_am === 20, String(r.g.so_ma_se_am));
  /* Kê 5 mã rồi NÓI RA còn bao nhiêu — kê hết 20.000 mã thì không ai đọc,
     mà kê 5 rồi im thì Sếp tưởng chỉ có 5. Và chỉ đọc về 5 dòng: một lượt
     nạp có thể tới 20.000 mã, kéo hết vào isolate 128 MB để in 5 dòng là
     đổi một lỗi lấy một lỗi khác. */
  ok('Kê 5 mã đầu rồi nói còn bao nhiêu mã nữa',
     /…và 15 mã nữa/.test(r.g.loi || '') && r.g.ma_se_am.length === KE_MA_TOI_DA_MONG_DOI,
     `${r.g.ma_se_am.length} mã kê ra`);
  /* Không được có cửa sau: gỡ bất chấp tồn âm. Bỏ ghi chú trước khi soi —
     máy đo tin vào lời bình trong mã là máy đo vô dụng. */
  const maSach = docNguon('nap-du-lieu.js')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
  ok('KHÔNG có cờ nào cho gỡ bất chấp tồn âm (không `force`, không `bo_qua_am`)',
     !/\bforce\b|batChap|bat_chap|boQuaAm|bo_qua_am/.test(maSach) &&
     /huyLuotNap\(env, phien, phieuId\)/.test(maSach),
     (maSach.match(/export async function huyLuotNap[^)]*\)/) || [''])[0]);
}
{
  // Quy ước KIA: dòng xuất lưu số DƯƠNG. Chốt chặn phải bắt được cả hai.
  const r = await canhBanBot(20, 100, 80, false);
  ok('Bắt được cả khi dòng xuất lưu số DƯƠNG (không đọc sai dấu)',
     r.g.ma === 409 && r.soAm === 0 && r.conDong === 20, `${r.g.ma} · ${r.soAm} mã âm`);
}
{
  // Chỉ MỘT mã bị bán bớt: vẫn chặn cả lượt, và kê đúng một mã.
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(10), GHEP_SP);
  const k = await ghi(env, csvTon(10, 100), GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
              SELECT 'px_ban_02', id, 'xuat', -30, 'Xuất bán', 'NS-NGOC'
                FROM san_pham WHERE ma_sku='SP-00003'`).run();
  const g = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  ok('Một mã đã bán bớt cũng đủ để từ chối cả lượt (không gỡ nửa vời)',
     g.ma === 409 && g.so_ma_se_am === 1, `${g.ma} · ${g.so_ma_se_am} mã`);
  ok('Và nói rõ còn bao nhiêu mã lẽ ra gỡ được', g.so_ma_go_duoc === 9, String(g.so_ma_go_duoc));
}
{
  // KHÔNG ĐƯỢC CHẶN OAN: chưa xuất gì thì vẫn gỡ được như cũ.
  const r = await canhBanBot(20, 100, 0, true);
  ok('Chưa xuất hàng thì đường lùi vẫn thông (không chặn oan)',
     !!r.g.ok && r.sau === 0 && r.conDong === 0, r.g.ok ? `tồn ${r.sau}` : String(r.g.ma));
}
{
  // Xuất rồi nhưng kho đã nhập tay bù đủ → gỡ được, vì gỡ xong vẫn ≥ 0.
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(10), GHEP_SP);
  const k = await ghi(env, csvTon(10, 100), GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
              SELECT 'px_ban_03', id, 'xuat', -80, 'Xuất bán', 'NS-NGOC' FROM san_pham`).run();
  db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
              SELECT 'pn_tay_09', id, 'nhap', 200, 'Nhập tay bù', 'NS-NGOC' FROM san_pham`).run();
  const g = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  /* `tonSo` cộng dồn theo ĐÚNG quy ước kho.js (dòng xuất mang số âm) — khác
     `tonCua` ở đầu file vốn viết cho các ca không có dòng xuất. */
  const tonSo = d => Number(d.prepare(
    `SELECT COALESCE(SUM(CASE WHEN loai='xuat' THEN -ABS(so_luong) ELSE so_luong END),0) AS t
       FROM giao_dich_kho`).get().t);
  ok('Đã xuất nhưng kho nhập tay bù đủ thì VẪN gỡ được (chặn theo số dư, không theo nghi ngờ)',
     !!g.ok && tonSo(db) === 1200, g.ok ? String(tonSo(db)) : String(g.ma));
}

console.log('\n⑦ b. AI ĐƯỢC GỠ LƯỢT NẠP CỦA NGƯỜI KHÁC (CHẶN-②)');
{
  const db = dungCsdl(), env = dungD1(db);
  db.prepare(`INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-PT','Bạn part-time kho')`).run();
  await ghi(env, csvSP(30), GHEP_SP);
  const k = await ghi(env, csvTon(30), GHEP_TON, 'ton_kho', 'TonDauKy_Sep.csv');
  const tonSauNap = tonCua(db);
  const partTime = { nhan_su_id: 'NS-PT', ho_ten: 'Bạn part-time kho', vai_tro: 'nhan_vien_kho' };
  const g = await nap.huyLuotNap(env, partTime, k.phieu_id);
  tin(`phiên nhan_vien_kho gỡ lượt của Sếp Ngọc → ${g.ok ? 'GỠ ĐƯỢC ' + g.da_go_dong + ' dòng' : g.ma}`);
  ok('nhan_vien_kho KHÔNG gỡ được lượt nạp của Sếp', g.ma === 403, String(g.ma));
  ok('Và không một dòng nào bị xoá', tonCua(db) === tonSauNap, `${tonSauNap} → ${tonCua(db)}`);
  ok('Câu từ chối nói rõ AI đã nạp và AI gỡ được',
     /Bùi Thị Ngọc/.test(g.loi || '') && /quản lý kho/i.test(g.loi || ''), String(g.loi).slice(0, 120));

  // Danh sách lượt nạp phải nói trước cho giao diện biết ai gỡ được
  const dsPT = await nap.dsLuotNap(env, partTime, 10);
  const dsSep = await nap.dsLuotNap(env, PHIEN, 10);
  ok('Danh sách lượt nạp: part-time KHÔNG thấy nút gỡ', dsPT.ds[0].go_duoc === false);
  ok('Danh sách lượt nạp: người đã nạp THẤY nút gỡ', dsSep.ds[0].go_duoc === true);

  // Quản lý kho (anh Duy) gỡ được lượt của người khác — đúng kênh Sếp đã chốt
  const duy = { nhan_su_id: 'NS-DUY', ho_ten: 'Phạm Khương Duy', vai_tro: 'quan_ly_kho' };
  const dsDuy = await nap.dsLuotNap(env, duy, 10);
  ok('Danh sách lượt nạp: quản lý kho THẤY nút gỡ', dsDuy.ds[0].go_duoc === true);
  const gDuy = await nap.huyLuotNap(env, duy, k.phieu_id);
  ok('Quản lý kho gỡ được lượt nạp của người khác', !!gDuy.ok && tonCua(db) === 0,
     gDuy.ok ? String(tonCua(db)) : String(gDuy.ma));
}
{
  // Người đã nạp tự gỡ lượt của mình — đường thường ngày, không được chặn oan
  const db = dungCsdl(), env = dungD1(db);
  db.prepare(`INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-PT','Bạn part-time kho')`).run();
  const pt = { nhan_su_id: 'NS-PT', ho_ten: 'Bạn part-time kho', vai_tro: 'nhan_vien_kho' };
  await ghi(env, csvSP(10), GHEP_SP);
  const k = await ghi(env, csvTon(10), GHEP_TON, 'ton_kho', 'PT_nap.csv', { phien: pt });
  const g = await nap.huyLuotNap(env, pt, k.phieu_id);
  ok('Chính người đã nạp thì tự gỡ được lượt của mình', !!g.ok && tonCua(db) === 0,
     g.ok ? String(tonCua(db)) : String(g.ma));
}

console.log('\n⑦ c. GỠ NGÃ GIỮA CHỪNG (CAO-③)');
{
  // Ngã ở bước ĐÁNH DẤU — chưa xoá gì cả thì phải KHÔNG mất dòng nào
  const db = dungCsdl();
  let batDau = false;
  const env = dungD1(db, sql => batDau && /UPDATE lich_su_thay_doi_nen/i.test(sql));
  const env0 = dungD1(db);
  await ghi(env0, csvSP(20), GHEP_SP);
  const k = await ghi(env0, csvTon(20), GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  batDau = true;
  let nem = null, g = null;
  try { g = await nap.huyLuotNap(env, PHIEN, k.phieu_id); } catch (e) { nem = e; }
  const conDong = Number(db.prepare(`SELECT COUNT(*) AS n FROM giao_dich_kho WHERE phieu_id=?`).get(k.phieu_id).n);
  const vet = db.prepare(`SELECT gia_tri_moi FROM lich_su_thay_doi_nen WHERE ban_ghi_id=?`).get(k.phieu_id);
  tin(`ngã ở bước đánh dấu: ném=${nem ? nem.message : 'không'} · còn ${conDong} dòng · vết=${JSON.stringify(vet?.gia_tri_moi)}`);
  ok('Ngã ở bước đánh dấu: KHÔNG xoá dòng nào (đánh dấu đi TRƯỚC, xoá đi sau)',
     conDong === 20, `còn ${conDong}/20 dòng`);
  ok('Sổ cái và ghi vết KHÔNG lệch nhau', conDong === 20 && vet?.gia_tri_moi === '20 dòng',
     `${conDong} dòng · vết "${vet?.gia_tri_moi}"`);
  ok('KHÔNG ném lỗi máy trần trụi ra ngoài', nem === null, nem ? String(nem.message) : '');
  ok('Câu báo là tiếng người, nói rõ chưa xoá gì',
     !!g && /[À-ỹ]/.test(g.loi || '') && /không xoá|KHÔNG xoá/i.test(g.loi || ''), String(g && g.loi).slice(0, 110));
  batDau = false;
  const g2 = await nap.huyLuotNap(env0, PHIEN, k.phieu_id);
  ok('Bấm gỡ lại sau đó thì gỡ được sạch', !!g2.ok && g2.da_go_dong === 20 && tonCua(db) === 0,
     g2.ok ? `gỡ ${g2.da_go_dong} dòng` : String(g2.ma));
}
{
  // Ngã ở bước XOÁ — dấu phải được TRẢ VỀ, không để lại "lượt ma"
  const db = dungCsdl();
  let batDau = false;
  const env = dungD1(db, sql => batDau && /DELETE FROM giao_dich_kho/i.test(sql));
  const env0 = dungD1(db);
  await ghi(env0, csvSP(20), GHEP_SP);
  const k = await ghi(env0, csvTon(20), GHEP_TON, 'ton_kho', 'TonDauKy.csv');
  batDau = true;
  let nem = null, g = null;
  try { g = await nap.huyLuotNap(env, PHIEN, k.phieu_id); } catch (e) { nem = e; }
  const vet = db.prepare(`SELECT gia_tri_moi FROM lich_su_thay_doi_nen WHERE ban_ghi_id=?`).get(k.phieu_id);
  tin(`ngã ở bước xoá: ném=${nem ? nem.message : 'không'} · vết=${JSON.stringify(vet?.gia_tri_moi)} · trả về ${g && g.ma}`);
  ok('Ngã ở bước xoá: KHÔNG ném lỗi máy ra ngoài', nem === null, nem ? String(nem.message) : '');
  ok('Dấu "đã gỡ" được TRẢ VỀ như cũ (không để lượt ma)', vet?.gia_tri_moi === '20 dòng',
     `vết "${vet?.gia_tri_moi}"`);
  ok('Câu báo tiếng người, nói rõ còn bao nhiêu dòng và bảo bấm lại',
     !!g && /[À-ỹ]/.test(g.loi || '') && /còn 20 dòng/.test(g.loi || '') && /lần nữa/i.test(g.loi || ''),
     String(g && g.loi).slice(0, 130));
  batDau = false;
  const g2 = await nap.huyLuotNap(env0, PHIEN, k.phieu_id);
  ok('Và bấm lại thì gỡ được thật', !!g2.ok && tonCua(db) === 0, g2.ok ? 'ok' : String(g2.ma));
}

console.log('\n⑦ d. CHỖ ĐẶT HẠN MỨC KHÔNG ĐƯỢC RÒ (CAO-④)');
{
  const db = dungCsdl();
  const env0 = dungD1(db);
  await ghi(env0, csvSP(50), GHEP_SP);
  const truoc = soSo(db) || 0;
  // Ngã đúng ở dòng GHI VẾT phiếu nhập — chỗ trước đây nằm NGOÀI try
  const env = dungD1(db, sql => /INSERT INTO lich_su_thay_doi_nen/i.test(sql));
  let e = null;
  try { await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'TonDauKy.csv'); } catch (er) { e = er; }
  const sau = soSo(db) || 0;
  tin(`ngã ở dòng ghi vết: lỗi=${e && e.name} · sổ ngày ${truoc} → ${sau}`);
  ok('Ngã ở bước ghi vết: chỗ đặt hạn mức được TRẢ LẠI đủ', sau === truoc, `rò ${sau - truoc} lượt`);
  ok('Và lỗi ném ra là LoiGhiNua (câu tiếng người), không phải lỗi D1 trần trụi',
     !!e && e.name === 'LoiGhiNua', e ? `${e.name}: ${String(e.message).slice(0, 70)}` : 'không ném');
  ok('Không dòng nào nằm lại trong sổ cái',
     Number(db.prepare('SELECT COUNT(*) AS n FROM giao_dich_kho').get().n) === 0);
}

console.log('\n⑦ e. MỘT CÁI TICK KHÔNG ĐƯỢC TẮT CẢ HAI LỚP (CAO-⑤)');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(60), GHEP_SP);
  await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton_T9.csv');
  const t1 = tonCua(db);
  // LỚP (b): file khác (thêm 10 mã mới) — cái tick mở được, đúng việc thật
  const kb = await ghi(env, csvTon(60), GHEP_TON, 'ton_kho', 'Ton_T10.csv', { xacNhanTrung: true });
  ok('Lớp (b) — kho nhập lại cùng mã: cái tick vẫn mở được (không khoá việc thật)',
     !kb.loi && tonCua(db) === t1 + 6000, kb.loi ? String(kb.ma) : String(tonCua(db)));
  // LỚP (a): đúng file cũ — cái tick KHÔNG mở được
  const t2 = tonCua(db);
  const ka = await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton_T9.csv', { xacNhanTrung: true });
  ok('Lớp (a) — đúng file cũ: cái tick KHÔNG mở được', ka.ma === 409 && tonCua(db) === t2, String(ka.ma));
  const ka2 = await ghi(env, csvTon(50), GHEP_TON, 'ton_kho', 'Ton_T9.csv', { xacNhanTenTep: 'Ton_T9.csv' });
  ok('Lớp (a) — gõ lại đúng tên file thì qua được', !ka2.loi && tonCua(db) === t2 + 5000,
     ka2.loi ? String(ka2.ma) : String(tonCua(db)));

  // Màn xem trước phải nói cho giao diện biết đang là lớp nào
  const db2 = dungCsdl(), env2 = dungD1(db2);
  await ghi(env2, csvSP(60), GHEP_SP);
  await ghi(env2, csvTon(50), GHEP_TON, 'ton_kho', 'Ton_T9.csv');
  const xA = await xemT(env2, csvTon(50), GHEP_TON, 'ton_kho', 'Ton_T9.csv');
  const xB = await xemT(env2, csvTon(60), GHEP_TON, 'ton_kho', 'Ton_T10.csv');
  ok('Xem trước: trùng nguyên file thì bảo giao diện BẮT GÕ TÊN FILE',
     xA.can_go_ten_tep === true && xA.nap_trung.can_go_ten_tep === true);
  ok('Xem trước: chỉ trùng mã hàng thì KHÔNG bắt gõ tên (chỉ cái tick)',
     xB.can_xac_nhan_trung === true && xB.can_go_ten_tep === false);
  ok('Giao diện có ô gõ tên file riêng, không dùng chung ô tick',
     /napTrungGo/.test(readFileSync(path.join(GOC, 'public', 'app.html'), 'utf8')) &&
     /napTrungGo/.test(readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8')));

  /* Trần gõ tên: ô một dòng phải khai `maxlength` (luật `do-chu-dai`), nên
     tên file dài hơn trần thì gõ hết là việc KHÔNG THỂ — ba chỗ phải cùng
     một con số, lệch là màn mở nút mà máy chủ vẫn 409. */
  const htmlApp = readFileSync(path.join(GOC, 'public', 'app.html'), 'utf8');
  const jsApp = readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8');
  const tranHtml = Number((htmlApp.match(/id="napTrungGo"[^>]*maxlength="(\d+)"/) ||
                           htmlApp.match(/maxlength="(\d+)"[^>]*id="napTrungGo"/) || [])[1]);
  const tranJs = Number((jsApp.match(/const TRAN_GO_TEN = (\d+)/) || [])[1]);
  ok('Trần gõ tên file khớp nhau ở cả ba chỗ (html · app.js · máy chủ)',
     tranHtml === nap.TRAN_GO_TEN_TEP && tranJs === nap.TRAN_GO_TEN_TEP,
     `html ${tranHtml} · app.js ${tranJs} · máy chủ ${nap.TRAN_GO_TEN_TEP}`);
  const tenDai = 'Ton_' + 'x'.repeat(120) + '.csv';
  ok('Tên file dài hơn trần: gõ đúng phần đầu bằng trần là qua được',
     nap.khopTenTep(tenDai.slice(0, nap.TRAN_GO_TEN_TEP), tenDai) === true);
  ok('Nhưng gõ phần đầu của một tên NGẮN thì KHÔNG qua (không nới cửa)',
     nap.khopTenTep('TonDauKy', 'TonDauKy_T9.csv') === false);
}

console.log('\n⑦ f. TRẦN DÒ TRÙNG ĐẾM THEO MÃ, VÀ NÓI RA KHI CHẠM (CAO-⑥)');
{
  const src = docNguon('nap-du-lieu.js');
  ok('Câu dò lớp (b) hỏi theo MÃ, không hỏi theo cặp (mã × phiếu)',
     /SELECT DISTINCT san_pham_id FROM giao_dich_kho/.test(src) &&
     !/SELECT DISTINCT san_pham_id, phieu_id FROM giao_dich_kho/.test(src));
  ok('Và có ORDER BY để vạch cắt xác định, không phụ thuộc may rủi',
     /ORDER BY san_pham_id LIMIT \?/.test(src));

  /* Cảnh "kho đã hơn 50.000 mã": đắp sẵn kết quả cho đúng câu dò đó thay vì
     chèn 50.000 dòng thật — đo cái TRẦN chứ không đo sức của node:sqlite. */
  const db = dungCsdl();
  const gia = { results: Array.from({ length: 50001 }, (_, i) => ({ san_pham_id: 'sp_gia_' + i })) };
  const env = dungD1(db, null, sql => /SELECT DISTINCT san_pham_id FROM giao_dich_kho/.test(sql) ? gia : null);
  await ghi(dungD1(db), csvSP(5), GHEP_SP);
  const xm = await xemT(env, csvTon(5), GHEP_TON, 'ton_kho', 'Ton.csv');
  tin(`chạm trần: canh_bao = ${JSON.stringify(xm.canh_bao).slice(0, 150)}`);
  ok('Chạm trần thì NÓI RA, không lặng lẽ mù đi',
     (xm.canh_bao || []).some(c => /chỉ soi được/i.test(c) && /50\.000/.test(c)),
     JSON.stringify(xm.canh_bao).slice(0, 120));
  ok('Nhưng KHÔNG chặn oan lần nạp đó (chạm trần không phải là trùng)',
     xm.can_xac_nhan_trung === false, String(xm.can_xac_nhan_trung));
}
{
  // Cảnh Hồ Ly dựng ở `-e.mjs`: 60 mã mà 55.000 cặp — lớp (b) vẫn phải thấy
  const db = dungCsdl(), env = dungD1(db);
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  for (let i = 1; i <= 50; i++) s += `CU-${i},"Hàng cũ ${i}",Hạt,túi,5\n`;
  for (let i = 1; i <= 10; i++) s += `MOI-${i},"Hàng mới ${i}",Hạt,túi,5\n`;
  await ghi(env, B(s), GHEP_SP);
  const spCu = db.prepare(`SELECT id FROM san_pham WHERE ma_sku LIKE 'CU-%'`).all().map(r => r.id);
  const chen = db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
                           VALUES (?, ?, 'nhap', 1, 'Nạp từ file “lịch sử”', 'NS-NGOC')`);
  for (let l = 0; l < 1100; l++) for (const id of spCu) chen.run('pn_lichsu_' + l, id);
  const cap = Number(db.prepare(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT san_pham_id, phieu_id
      FROM giao_dich_kho WHERE loai='nhap' AND ghi_chu LIKE 'Nạp từ file%')`).get().n);
  let t = 'Mã SKU,Số lượng tồn\n';
  for (let i = 1; i <= 10; i++) t += `MOI-${i},100\n`;
  await ghi(env, B(t), GHEP_TON, 'ton_kho', 'TonMoi.csv');
  const ton1 = tonCua(db);
  let t2 = t + 'CU-1,5\n';               // vân tay khác ⇒ chỉ còn lớp (b) đỡ
  const kq = await ghi(env, B(t2), GHEP_TON, 'ton_kho', 'TonMoi_them1dong.csv');
  tin(`${cap.toLocaleString('vi-VN')} cặp (mã × phiếu) trên kho 60 mã · nạp lại file thêm 1 dòng → ${kq.ma || 'CHO QUA'}`);
  ok('55.000 cặp trên kho 60 mã: lớp (b) VẪN thấy trùng (đếm mã thì không chạm trần)',
     kq.ma === 409 && tonCua(db) === ton1, `${kq.ma} · tồn ${tonCua(db)}`);
}

console.log('\n⑦ g. .XLSX — BẢNG ẨN · BẢNG ĐẦU RỖNG (CAO-⑦)');
{
  const wbXml = bangs => '<?xml version="1.0"?><workbook xmlns:r="r">' +
    bangs.map((b, i) => `<sheet name="${b.ten}" sheetId="${i + 1}" ${b.an ? 'state="hidden" ' : ''}r:id="rId${i + 1}"/>`).join('') +
    '</workbook>';
  const relsXml = bangs => '<?xml version="1.0"?><Relationships>' +
    bangs.map((b, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    '</Relationships>';
  const lamXlsx = bangs => dungZip([
    { ten: 'xl/workbook.xml', noiDung: wbXml(bangs) },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: relsXml(bangs) },
    ...bangs.map((b, i) => ({
      ten: `xl/worksheets/sheet${i + 1}.xml`,
      noiDung: SHEET(b.dong.map((d, j) =>
        `<row r="${j + 1}">` + d.map((v, c) => oStr(String.fromCharCode(65 + c) + (j + 1), v)).join('') + '</row>').join(''))
    }))
  ]);

  const xAn = lamXlsx([
    { ten: 'Nháp cũ', an: true, dong: [['Mã SKU', 'Tên sản phẩm'], ['XX-1', 'rác cũ']] },
    { ten: 'Chính thức', dong: [['Mã SKU', 'Tên sản phẩm'], ['SP-1', 'Hạt điều'], ['SP-2', 'Hạnh nhân']] }
  ]);
  const bAn = await docb.docBang(xAn, 'coban.xlsx', { demDong: true });
  tin(`bảng ẩn: ${JSON.stringify(bAn.dsBang)} · đang đọc "${bAn.tenBang}"`);
  ok('Bảng ẨN không được lấy làm mặc định', bAn.tenBang === 'Chính thức', bAn.tenBang);
  ok('Danh sách bảng có đánh dấu bảng nào đang ẩn', bAn.dsBang[0].an === true && bAn.dsBang[1].an === false,
     JSON.stringify(bAn.dsBang));
  ok('Và NÓI RA là file có bảng đang ẩn',
     (bAn.canhBao || []).some(c => /ẩn/i.test(c) && /Nháp cũ/.test(c)), JSON.stringify(bAn.canhBao).slice(0, 120));
  const bAn0 = await docb.docBang(xAn, 'coban.xlsx', { bangChon: 0 });
  ok('Người CHỌN đích danh bảng ẩn thì vẫn đọc đúng bảng đó (máy không cãi người)',
     bAn0.tenBang === 'Nháp cũ', bAn0.tenBang);
  ok('Giao diện hiện chữ "đang ẩn" cạnh tên bảng',
     /đang ẩn/.test(readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8')));

  const xRong = lamXlsx([
    { ten: 'Trống', dong: [] },
    { ten: 'Số liệu', dong: [['Mã SKU', 'Tên sản phẩm'], ['SP-1', 'Hạt điều']] }
  ]);
  const bRong = await docb.docBang(xRong, 'rong.xlsx');
  tin(`bảng đầu rỗng: đang đọc "${bRong.tenBang}" · ${bRong.dong.length} dòng`);
  ok('Bảng đầu RỖNG mà file còn bảng có số liệu: đi tiếp, không cụt đường',
     bRong.tenBang === 'Số liệu' && bRong.dong.length === 1, `${bRong.tenBang} · ${bRong.dong.length} dòng`);
  ok('Và NÓI RA là đã đi sang bảng khác',
     (bRong.canhBao || []).some(c => /không có dòng dữ liệu/i.test(c) && /Số liệu/.test(c)),
     JSON.stringify(bRong.canhBao).slice(0, 130));

  const xRong2 = lamXlsx([{ ten: 'Trống', dong: [] }, { ten: 'Cũng trống', dong: [] }]);
  let eR = null;
  try { await docb.docBang(xRong2, 'rong2.xlsx'); } catch (er) { eR = er; }
  ok('Không bảng nào có số liệu: câu lỗi KÊ TÊN từng bảng ra, không nói cụt',
     !!eR && /Trống/.test(eR.message) && /Cũng trống/.test(eR.message) && /2 bảng/.test(eR.message),
     eR ? eR.message.slice(0, 130) : '(không ném)');

  /* FILE THẬT của Sếp — CHỈ ĐỌC. Đúng file REV-0060 vòng 2 nêu đích danh:
     `Sheet1` 0 dòng, đảo thứ tự hai bảng là cả lần nạp cụt đường. */
  const duong = 'C:/Users/Admin/Desktop/AI/TongHop_SanPham_Theo_SKU.xlsx';
  if (existsSync(duong)) {
    const bThat = await docb.docBang(new Uint8Array(readFileSync(duong)),
                                     'TongHop_SanPham_Theo_SKU.xlsx', { demDong: true });
    tin(`file thật: ${bThat.dsBang.map(x => `${x.ten} (${x.so_dong} dòng${x.an ? ', ẩn' : ''})`).join(' | ')}`);
    ok('File thật của Sếp: vẫn đọc đúng bảng 797 dòng, không bảng nào bị đánh dấu ẩn sai',
       bThat.dong.length > 700 && bThat.dsBang.some(x => x.so_dong === 0) &&
       bThat.dsBang.every(x => x.an === false),
       `${bThat.tenBang} · ${bThat.dong.length} dòng`);
  } else {
    ok('file thật có mặt để đo: TongHop_SanPham_Theo_SKU.xlsx', false, 'KHÔNG TÌM THẤY — ca này MÙ');
  }
}

console.log('\n⑦ h. GỢI Ý GHÉP CỘT YẾU THÌ THÔI, ĐỪNG ĐOÁN (THẤP-⑧)');
{
  const g = nap.goiYGhep(['Mã đơn hàng', 'Loại xử lý đơn hàng', 'Đơn Vị Vận Chuyển', 'Tên sản phẩm'], 'san_pham');
  tin(`gợi ý trên cột kiểu file Shopee: ${JSON.stringify(g)}`);
  ok('KHÔNG vơ "Đơn Vị Vận Chuyển" thành Đơn vị tính', g.don_vi === undefined, JSON.stringify(g));
  ok('KHÔNG vơ "Loại xử lý đơn hàng" thành Nhóm hàng', g.danh_muc === undefined, JSON.stringify(g));
  const g2 = nap.goiYGhep(['Mã SKU', 'Tên sản phẩm', 'ĐVT', 'Danh mục chuẩn'], 'san_pham');
  ok('Nhưng cột khớp rõ ràng thì vẫn gợi ý (không tắt hẳn tính năng)',
     g2.don_vi === 2 && g2.danh_muc === 3, JSON.stringify(g2));
}

console.log('\n⑦ i. BẪY HỘP THOẠI Ở LỚP DÙNG CHUNG (THẤP-⑨)');
{
  /* `app.js` gọi `confirm(` ở mấy chục chỗ. Bàn đo trình duyệt nào bấm trúng
     một nút như thế mà chưa tự đặt bẫy thì TREO tới hết giờ chờ rồi mới đỏ —
     đỏ vì hết giờ, không phải vì lỗi thật. Bẫy phải nằm ở lớp dùng chung để
     bàn đo viết sau khỏi phải nhớ. */
  const lib = readFileSync(path.join(GOC, 'scripts', 'lib', 'ban-do-chrome.mjs'), 'utf8');
  const app = readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8');
  tin(`app.js có ${(app.match(/\bconfirm\s*\(/g) || []).length} chỗ gọi confirm(`);
  ok('Lớp dùng chung tắt sẵn confirm/alert/prompt cho MỌI bàn đo trình duyệt',
     /window\.confirm\s*=\s*\(\)\s*=>\s*true/.test(lib) &&
     /Page\.addScriptToEvaluateOnNewDocument/.test(lib));
  ok('Và còn lưới thứ hai: hộp thoại nào lọt ra thì tự bấm đồng ý, có ghi lại',
     /Page\.javascriptDialogOpening/.test(lib) && /Page\.handleJavaScriptDialog/.test(lib) &&
     /hopThoaiDaBat/.test(lib));
}

/* ==========================================================================
   ⑧ — TÁM LỖI CỦA VÒNG 3 (REV-0060 vòng 3)
   --------------------------------------------------------------------------
   Vòng 2 vá đúng hai chỗ CHẶN, nhưng CÙNG MỘT HẬU QUẢ (tồn kho ÂM) vẫn đến
   được bằng đường LÔ HÀNG, và cái giá của "không có cờ force" chưa trả được vì
   hai lối thoát mà câu từ chối hứa KHÔNG TỒN TẠI trong ERP này.
     ⑧a CHẶN-ⓐ  gỡ lượt nạp không được làm tồn LÔ âm (kho xuất theo FEFO)
     ⑧b CHẶN-ⓑ  câu từ chối phải chỉ vào cửa CÓ THẬT, và cửa đó phải mở được
     ⑧c CAO-③   cửa "gõ lại tên file" phải là cửa của MÁY CHỦ, không của màn
     ⑧d CAO-④   kiểm số dư và xoá phải nguyên tử (hai người gỡ cùng lúc)
     ⑧e CAO-⑤   vòng "đi tiếp sang bảng có số liệu" phải có chốt
     ⑧f CAO-⑥   `keBangRong` không được khẳng định điều nó không biết
     ⑧g THẤP-①  tên file NFD (máy Mac) vs NFC (Windows)
     ⑧h THẤP-③  ô chọn bảng chỉ được hiện MỘT loại số dòng
   ========================================================================== */
const kho = await modun('kho.js');

console.log('\n══ ⑧ a. GỠ LƯỢT NẠP KHÔNG ĐƯỢC LÀM TỒN **LÔ** ÂM (CHẶN-ⓐ) ══');
{
  /* ĐÚNG cảnh Hồ Ly dựng, đo qua ĐÚNG cửa ERP (ghiThat → nhapKho → xuatKho →
     huyLuotNap → xuatKho), không đọc bảng rồi tự kết luận.
     HSD đặt lệch nhau để FEFO XÁC ĐỊNH: lô A cận hạn hơn nên bị ăn trước —
     không có HSD thì `tao_luc` bằng nhau tới giây, thứ tự là do may. */
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B('Mã SKU,Tên sản phẩm,Đơn vị tính\nSP-00001,"Hạnh nhân Mỹ 500g",túi\n'),
            { ma_sku: 0, ten: 1, don_vi: 2 }, 'san_pham', 'dm.csv');
  const spId = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;

  const k = await ghi(env, B('Mã SKU,Số lượng,Số lô,Hạn sử dụng\nSP-00001,100,LO-A,2026-10-01\n'),
                      { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 }, 'ton_kho', 'TonDauKy.csv');
  await kho.nhapKho(env, PHIEN, { san_pham_id: spId, so_luong: 100, so_lo: 'LO-M', han_su_dung: '2027-10-01' });
  await kho.xuatKho(env, PHIEN, { san_pham_id: spId, so_luong: 100 });

  const tonMa = () => Number(db.prepare(
    `SELECT COALESCE(SUM(so_luong),0) AS t FROM giao_dich_kho WHERE san_pham_id=?`).get(spId).t);
  const loNao = () => db.prepare(
    `SELECT l.so_lo, COALESCE(SUM(g.so_luong),0) AS t FROM lo_hang l
       LEFT JOIN giao_dich_kho g ON g.lo_hang_id=l.id GROUP BY l.id ORDER BY l.so_lo`).all();
  const dauCua = () => db.prepare(`SELECT gia_tri_moi AS v FROM lich_su_thay_doi_nen
      WHERE bang='giao_dich_kho' AND truong='nap_file' AND ban_ghi_id=?`).get(k.phieu_id).v;
  tin(`nạp lô A 100 · nhập tay lô M 100 · xuất 100 (FEFO ăn lô A) → tồn mã ${tonMa()} · ` +
      loNao().map(l => `${l.so_lo}=${l.t}`).join(' · '));

  const g = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  tin(`bấm gỡ → ${g.ok ? 'CHO QUA' : g.ma} · ${String(g.loi || g.tin).slice(0, 110)}…`);
  ok('Gỡ lượt nạp khi LÔ đã xuất hết: bị từ chối (tồn MÃ vẫn dương nên tầng mã không thấy)',
     g.ma === 409, String(g.ma));
  ok('Câu từ chối kê ĐÍCH DANH lô sẽ âm, không nói chung chung',
     /LÔ HÀNG/.test(g.loi || '') && /LO-A/.test(g.loi || '') && g.so_lo_se_am === 1,
     String(g.loi).slice(0, 100));
  ok('Không một dòng nào bị xoá, và dấu “đã gỡ” đã trả về như cũ',
     Number(db.prepare('SELECT COUNT(*) AS n FROM giao_dich_kho WHERE phieu_id=?').get(k.phieu_id).n) === 1 &&
     dauCua() !== 'đã gỡ', String(dauCua()));

  /* Ca gây hại thật: xuất TIẾP qua đúng cửa ERP. Trước bản vá HTTP 200 và tồn
     mã về −100; nay lô A đã hết nên chỉ còn lô M, xuất đúng 100 rồi hết. */
  const r2 = await kho.xuatKho(env, PHIEN, { san_pham_id: spId, so_luong: 100 });
  ok('Xuất tiếp qua ĐÚNG cửa xuatKho: tồn mã KHÔNG âm', tonMa() >= 0,
     `HTTP ${r2.status} · tồn mã ${tonMa()}`);
  const r3 = await kho.xuatKho(env, PHIEN, { san_pham_id: spId, so_luong: 1 });
  ok('Và hết hàng thật thì xuất tiếp bị chặn, không đẻ tồn âm',
     r3.status === 400 && tonMa() === 0, `HTTP ${r3.status} · tồn ${tonMa()}`);
}
{
  /* KHÔNG ĐƯỢC CHẶN OAN: hàng có lô nhưng chưa xuất gì thì vẫn gỡ được. */
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B('Mã SKU,Tên sản phẩm,Đơn vị tính\nSP-00001,"Hạnh nhân Mỹ 500g",túi\n'),
            { ma_sku: 0, ten: 1, don_vi: 2 }, 'san_pham', 'dm.csv');
  const k = await ghi(env, B('Mã SKU,Số lượng,Số lô,Hạn sử dụng\nSP-00001,100,LO-A,2026-10-01\n'),
                      { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 }, 'ton_kho', 'TonDauKy.csv');
  const g = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  ok('Hàng theo lô mà chưa xuất gì: đường lùi vẫn thông (không chặn oan)',
     !!g.ok && Number(db.prepare('SELECT COUNT(*) AS n FROM giao_dich_kho').get().n) === 0,
     g.ok ? 'gỡ được' : String(g.ma));
  ok('Và lô mồ côi cũng được dọn theo',
     Number(db.prepare('SELECT COUNT(*) AS n FROM lo_hang').get().n) === 0);
}

console.log('\n⑧ b. ĐƯỜNG RA CHO CA "NẠP NHẦM RỒI BÁN MẤT" PHẢI CÓ THẬT (CHẶN-ⓑ)');
{
  const maKho = docNguon('kho.js');
  ok('ERP có hàm ghi phiếu điều chỉnh THẬT (không chỉ có cột trong báo cáo)',
     typeof kho.dieuChinhKho === 'function' &&
     /INSERT INTO giao_dich_kho[\s\S]{0,400}'dieu_chinh'/.test(maKho));
  ok('Và có cửa API cho nó',
     /'POST \/api\/kho\/dieu-chinh'/.test(docNguon('index.js')));
  ok('Và có màn cho Sếp bấm',
     /kv-pane-dieuchinh/.test(readFileSync(path.join(GOC, 'public', 'app.html'), 'utf8')) &&
     /kvFormDieuChinh/.test(readFileSync(path.join(GOC, 'public', 'assets', 'js', 'app.js'), 'utf8')));

  /* Đi HẾT đường: nạp nhầm → bán mất → gỡ bị 409 → làm ĐÚNG cái câu 409 bảo. */
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, B('Mã SKU,Tên sản phẩm,Đơn vị tính\nSP-00001,"Hạnh nhân Mỹ 500g",túi\n'),
            { ma_sku: 0, ten: 1, don_vi: 2 }, 'san_pham', 'dm.csv');
  const sp = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
  const k = await ghi(env, B('Mã SKU,Số lượng,Số lô,Hạn sử dụng\nSP-00001,100,LO-A,2026-10-01\n'),
                      { ma_sku: 0, so_luong: 1, so_lo: 2, han_su_dung: 3 }, 'ton_kho', 'NhamTo.csv');
  await kho.xuatKho(env, PHIEN, { san_pham_id: sp, so_luong: 30 });
  const g = await nap.huyLuotNap(env, PHIEN, k.phieu_id);
  ok('Nạp nhầm rồi bán mất: gỡ vẫn bị từ chối (đúng)', g.ma === 409, String(g.ma));
  ok('Câu từ chối chỉ vào phiếu điều chỉnh, và KHÔNG hứa gỡ được phiếu XUẤT',
     /điều chỉnh/i.test(g.loi || '') && /KHÔNG gỡ được một phiếu XUẤT/.test(g.loi || ''),
     String(g.loi).slice(-130));

  const tonCuaSp = () => Number(db.prepare(
    `SELECT COALESCE(SUM(so_luong),0) AS t FROM giao_dich_kho WHERE san_pham_id=?`).get(sp).t);
  const loA = db.prepare(`SELECT id FROM lo_hang WHERE so_lo='LO-A'`).get().id;
  const rd = await kho.dieuChinhKho(env, PHIEN, {
    san_pham_id: sp, lo_hang_id: loA, ton_thuc: 0,
    ly_do: `nạp nhầm file NhamTo.csv, phiếu ${k.phieu_id}` });
  tin(`lập phiếu điều chỉnh → HTTP ${rd.status} · tồn ${tonCuaSp()}`);
  ok('Làm đúng cái câu 409 bảo thì THOÁT ĐƯỢC: sổ về đúng số thật',
     rd.status === 200 && tonCuaSp() === 0, `HTTP ${rd.status} · tồn ${tonCuaSp()}`);
  const dc = db.prepare(`SELECT phieu_id AS p, ghi_chu AS g, nguoi_id AS n
                           FROM giao_dich_kho WHERE loai='dieu_chinh'`).get();
  ok('Và phiếu điều chỉnh có dấu vết đủ: mã phiếu · lý do · ai lập',
     /^pd_/.test(dc.p) && /NhamTo\.csv/.test(dc.g) && dc.n === 'NS-NGOC', `${dc.p} · ${dc.n}`);
  const r4 = await kho.xuatKho(env, PHIEN, { san_pham_id: sp, so_luong: 1 });
  ok('Sau điều chỉnh, xuất tiếp bị chặn đúng (không còn tồn ảo)', r4.status === 400, String(r4.status));

  /* Phiếu điều chỉnh KHÔNG được thành cửa lách bất biến TỒN ≥ 0, và không
     phải ai cũng lập được. */
  db.prepare(`INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-PT','Bạn part-time kho')`).run();
  const partTime = { nhan_su_id: 'NS-PT', ho_ten: 'Bạn part-time kho', vai_tro: 'nhan_vien_kho' };
  const rPt = await kho.dieuChinhKho(env, partTime, { san_pham_id: sp, ton_thuc: 5, ly_do: 'thử xem có qua không' });
  ok('17 bạn part-time có thao_tac_kho KHÔNG lập được phiếu điều chỉnh', rPt.status === 403, String(rPt.status));
  const rTrong = await kho.dieuChinhKho(env, PHIEN, { san_pham_id: sp, lo_hang_id: loA, ton_thuc: 5, ly_do: 'ừ' });
  ok('Bắt buộc ghi LÝ DO đủ dài — sổ cái không nhận một con số không lý do',
     rTrong.status === 400, String(rTrong.status));
  /* ⚠️ PHẢI GỬI KÈM `lo_hang_id` (REV-0060 vòng 4). Mã này theo dõi HSD, mà từ
     vòng 4 máy chủ BẮT chọn lô (CHẶN-①) và kiểm ĐIỀU ĐÓ TRƯỚC khi tính toán
     gì. Không gửi lô thì mọi lượt gọi ở đây đều ăn 400 vì thiếu lô — phép
     chấm vẫn xanh nhưng nó KHÔNG CÒN đo cái nó nói là đang đo, và ca gài
     "nuốt dấu trừ" ở phần tự kiểm thành mù. */
  const rAm = await kho.dieuChinhKho(env, PHIEN, {
    san_pham_id: sp, lo_hang_id: loA, ton_thuc: -5, ly_do: 'thử đẩy về âm xem sao' });
  ok('Và KHÔNG lập được phiếu kéo tồn xuống ÂM (không phải cửa lách)', rAm.status === 400, String(rAm.status));
  ok('…và sổ cái không nhúc nhích sau lượt bấm bị từ chối', tonCuaSp() === 0, String(tonCuaSp()));
}

console.log('\n⑧ c. CỬA "GÕ LẠI TÊN FILE" PHẢI LÀ CỬA CỦA MÁY CHỦ (CAO-③)');
{
  const db = dungCsdl(), env = dungD1(db);
  await ghi(env, csvSP(20), GHEP_SP);
  await ghi(env, csvTon(20), GHEP_TON, 'ton_kho', 'Ton_T9.csv');
  const t1 = tonCua(db);

  /* GỌI THẲNG API, bỏ qua giao diện: cả hai trường đều là 'x'. Trước bản vá
     cửa này mở toang, vì `ten_tep` và `xac_nhan_ten_tep` CÙNG do khách gửi
     lên trong một gói — so hai cái đó là tự so mình với mình. */
  const gian = await ghi(env, csvTon(20), GHEP_TON, 'ton_kho', 'x', { xacNhanTenTep: 'x' });
  ok("Gọi thẳng API với ten_tep='x' và xac_nhan_ten_tep='x': BỊ CHẶN",
     gian.ma === 409 && tonCua(db) === t1, `${gian.ma} · tồn ${t1} → ${tonCua(db)}`);
  ok('Và câu chặn nói rõ phải gõ tên file của LƯỢT NẠP TRƯỚC',
     /LƯỢT NẠP TRƯỚC/.test(gian.loi || '') && /Ton_T9\.csv/.test(gian.loi || ''),
     String(gian.loi).slice(0, 140));

  /* Đổi tên file rồi nạp lại: vẫn phải gõ tên CŨ (thứ máy chủ biết); gõ tên
     MỚI (thứ mình vừa tự khai) thì không mở được. */
  const tenMoi = await ghi(env, csvTon(20), GHEP_TON, 'ton_kho', 'Ton_T9 (1).csv',
                           { xacNhanTenTep: 'Ton_T9 (1).csv' });
  ok('Đổi tên file rồi gõ lại chính tên MỚI: KHÔNG mở được cửa',
     tenMoi.ma === 409 && tonCua(db) === t1, `${tenMoi.ma} · tồn ${tonCua(db)}`);
  const tenCu = await ghi(env, csvTon(20), GHEP_TON, 'ton_kho', 'Ton_T9 (1).csv',
                          { xacNhanTenTep: 'Ton_T9.csv' });
  ok('Gõ đúng tên file của lượt nạp TRƯỚC thì qua được (không khoá việc thật)',
     !tenCu.loi && tonCua(db) === t1 * 2, tenCu.loi ? String(tenCu.ma) : String(tonCua(db)));

  /* Màn xem trước phải in ra ĐÚNG chuỗi máy chủ sẽ đem đi so. */
  const db2 = dungCsdl(), env2 = dungD1(db2);
  await ghi(env2, csvSP(20), GHEP_SP);
  await ghi(env2, csvTon(20), GHEP_TON, 'ton_kho', 'TonDauKy_T9.csv');
  const x = await xemT(env2, csvTon(20), GHEP_TON, 'ton_kho', 'DoiTenLungTung.csv');
  ok('Xem trước trả về TÊN FILE CỦA LƯỢT TRƯỚC, không phải tên khách vừa gửi',
     !!x.nap_trung && x.nap_trung.ten_tep === 'TonDauKy_T9.csv', String(x.nap_trung?.ten_tep));
  ok('Và moi được tên file ra khỏi sổ vết',
     nap.tenTepTuLyDo('Nạp từ file “Ton dau ky.csv” · lượt nl_ab12cd34') === 'Ton dau ky.csv',
     nap.tenTepTuLyDo('Nạp từ file “Ton dau ky.csv” · lượt nl_ab12cd34'));
}

console.log('\n⑧ d. KIỂM SỐ DƯ VÀ XOÁ PHẢI NGUYÊN TỬ (CAO-④)');
{
  /* `node:sqlite` chạy đồng bộ nên hai lời gọi không tự chen nhau — D1 thì có.
     Dựng lớp giả lập NHƯỜNG LƯỢT ở mọi phép ĐỌC để hai `huyLuotNap` thật sự
     xen kẽ, đúng thứ tự mà một Worker thật gặp. */
  function dungD1Nhuong(db) {
    const goc = dungD1(db);
    const cho = () => new Promise(r => setTimeout(r, 0));
    const boc = p => ({
      bind: (...a) => boc(p.bind(...a)),
      run: () => p.run(),
      first: async () => { await cho(); return p.first(); },
      all: async () => { await cho(); return p.all(); }
    });
    return { DB: { prepare: s => boc(goc.DB.prepare(s)), batch: ds => goc.DB.batch(ds) } };
  }

  db_toctou: {
    /* Ca Hồ Ly dựng: HAI LƯỢT NẠP KHÁC NHAU trên cùng một mã. */
    const db = dungCsdl(), env = dungD1Nhuong(db);
    db.prepare(`INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-HANG','Phan Thị Hằng')`).run();
    const HANG = { nhan_su_id: 'NS-HANG', ho_ten: 'Phan Thị Hằng', vai_tro: 'admin' };
    await ghi(env, csvSP(1), GHEP_SP);
    const kA = await ghi(env, csvTon(1, 100), GHEP_TON, 'ton_kho', 'ton_A.csv');
    const kB = await ghi(env, csvTon(1, 100), GHEP_TON, 'ton_kho', 'ton_B.csv',
                         { xacNhanTrung: true, xacNhanTenTep: 'ton_A.csv' });
    const sp = db.prepare(`SELECT id FROM san_pham WHERE ma_sku='SP-00001'`).get().id;
    /* Xuất ghi thẳng vào sổ cái (đúng quy ước `kho.js`: dòng xuất mang số ÂM).
       Không đi qua `xuatKho` vì mã do `csvSP` sinh ra mặc định theo dõi HSD mà
       lượt nạp này không kèm lô — cảnh cần dựng ở đây là TOCTOU, không phải
       đường FEFO. */
    db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, loai, so_luong, ghi_chu, nguoi_id)
                VALUES ('px_ban_toctou', ?, 'xuat', -50, 'Xuất bán cho khách', 'NS-NGOC')`).run(sp);
    const ton = () => Number(db.prepare(
      `SELECT COALESCE(SUM(so_luong),0) AS t FROM giao_dich_kho WHERE san_pham_id=?`).get(sp).t);
    tin(`nạp A 100 · nạp B 100 · xuất 50 → tồn ${ton()}`);

    const [gA, gB] = await Promise.all([
      nap.huyLuotNap(env, PHIEN, kA.phieu_id),
      nap.huyLuotNap(env, HANG, kB.phieu_id)
    ]);
    tin(`anh Duy gỡ A → ${gA.ok ? 'QUA' : gA.ma} · chị Hằng gỡ B → ${gB.ok ? 'QUA' : gB.ma} · tồn ${ton()}`);
    ok('Hai người gỡ hai lượt CÙNG LÚC: không được cả hai cùng qua',
       !(gA.ok && gB.ok), `${gA.ok ? 'qua' : gA.ma} / ${gB.ok ? 'qua' : gB.ma}`);
    ok('Và tồn kho KHÔNG âm sau khi hai người cùng bấm', ton() >= 0, String(ton()));
    ok('Lượt nào bị từ chối thì dấu “đã gỡ” phải trả về (không đẻ “lượt ma”)',
       Number(db.prepare(
         `SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen v
           WHERE v.bang='giao_dich_kho' AND v.truong='nap_file' AND v.gia_tri_moi='đã gỡ'
             AND EXISTS (SELECT 1 FROM giao_dich_kho g WHERE g.phieu_id=v.ban_ghi_id)`).get().n) === 0);
    /* Hỏng về phía AN TOÀN được, nhưng KHÔNG được thành khoá chết: hai người
       cùng bị từ chối thì một người bấm lại một mình phải gỡ được ngay. */
    const lai = await nap.huyLuotNap(env, PHIEN, kA.phieu_id);
    ok('Từ chối rồi thì bấm lại MỘT MÌNH vẫn gỡ được (không thành khoá chết)',
       !!lai.ok && ton() === 50, lai.ok ? `tồn ${ton()}` : String(lai.ma));
  }
  {
    /* Và hai người gỡ CÙNG MỘT lượt: người thứ hai không được xoá lần nữa. */
    const db = dungCsdl(), env = dungD1Nhuong(db);
    db.prepare(`INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-HANG','Phan Thị Hằng')`).run();
    const HANG = { nhan_su_id: 'NS-HANG', ho_ten: 'Phan Thị Hằng', vai_tro: 'admin' };
    await ghi(env, csvSP(3), GHEP_SP);
    const k = await ghi(env, csvTon(3, 100), GHEP_TON, 'ton_kho', 'ton.csv');
    const [x1, x2] = await Promise.all([
      nap.huyLuotNap(env, PHIEN, k.phieu_id),
      nap.huyLuotNap(env, HANG, k.phieu_id)
    ]);
    ok('Hai người gỡ CÙNG một lượt: đúng một người qua',
       (x1.ok ? 1 : 0) + (x2.ok ? 1 : 0) === 1, `${x1.ok ? 'qua' : x1.ma} / ${x2.ok ? 'qua' : x2.ma}`);
    const thua = x1.ok ? x2 : x1;
    ok('Và người thứ hai không báo "đã gỡ 0 dòng" mà nói thẳng là người khác vừa gỡ',
       /người khác/.test(String(thua.loi || '')), String(thua.loi || '').slice(0, 80));
  }
}

console.log('\n⑧ e/f/h. BỘ ĐỌC BẢNG: CHỐT VÒNG · CÂU LỖI KHÔNG NÓI DỐI · MỘT LOẠI SỐ');
{
  const maDb = docNguon('doc-bang.js');
  /* ⑧e — vòng "đi tiếp" phải có ĐỦ BA chốt, và bảng ẩn phải bỏ TRƯỚC khi bung
     (bung xong mới `continue` là trả tiền rồi vứt đi). */
  const doan = (maDb.match(/if \(!nguoiChon && coDong\(luoi\) < 2[\s\S]*?\n  \}\n/) || [''])[0];
  ok('⑧e Vòng đi-tiếp có chốt 8 MB như đường đếm dòng ngay dưới',
     /coThat > 8 \* 1024 \* 1024/.test(doan), doan ? 'có đoạn mã' : '(không tìm thấy vòng)');
  ok('⑧e Bảng ẩn bị bỏ TRƯỚC khi bung XML, không bung xong mới bỏ',
     doan.indexOf('.an) continue') > 0 && doan.indexOf('.an) continue') < doan.indexOf('bungLuoi('),
     `vị trí: ẩn ${doan.indexOf('.an) continue')} · bung ${doan.indexOf('bungLuoi(')}`);
  ok('⑧e Và vòng có trần số bảng được thử, không chạy hết 30 bảng',
     /TRAN_THU_BANG/.test(doan) && /break;/.test(doan));

  /* ⑧f — `keBangRong` không được nói "không bảng nào có dòng dữ liệu" khi nó
     mới chỉ CHƯA ĐẾM. Đúng cảnh bước 2/bước 3 (`demDong` tắt). */
  const wbXml = bs => '<?xml version="1.0"?><workbook xmlns:r="r">' +
    bs.map((b, i) => `<sheet name="${b.ten}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</workbook>';
  const relsXml = bs => '<?xml version="1.0"?><Relationships>' +
    bs.map((b, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + '</Relationships>';
  const lamXlsx = bs => dungZip([
    { ten: 'xl/workbook.xml', noiDung: wbXml(bs) },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: relsXml(bs) },
    ...bs.map((b, i) => ({ ten: `xl/worksheets/sheet${i + 1}.xml`,
      noiDung: SHEET(b.dong.map((d, j) => `<row r="${j + 1}">` +
        d.map((v, c) => oStr(String.fromCharCode(65 + c) + (j + 1), v)).join('') + '</row>').join('')) }))
  ]);
  const xHai = lamXlsx([
    { ten: 'Sheet1', dong: [] },
    { ten: 'Data', dong: [['Mã SKU', 'Tên sản phẩm'], ['SP-1', 'Hạt điều'], ['SP-2', 'Hạnh nhân']] }
  ]);
  /* `bangChon: 0` = Sếp CHỌN đích danh Sheet1 (đúng ca thật), `demDong` tắt
     như ở bước xem trước và bước ghi. */
  let eF = null;
  try { await docb.docBang(xHai, 'hai.xlsx', { bangChon: 0 }); } catch (er) { eF = er; }
  tin(`chọn Sheet1 ở bước xem trước → "${eF ? eF.message.slice(0, 140) : '(không ném)'}"`);
  ok('⑧f KHÔNG khẳng định "Không bảng nào có dòng dữ liệu" khi mới chỉ CHƯA ĐẾM',
     !!eF && !/Không bảng nào có dòng dữ liệu/.test(eF.message),
     eF ? eF.message.slice(0, 110) : '(không ném)');
  ok('⑧f Mà nói rõ là CHƯA ĐẾM, và chỉ đường quay lại bước chọn bảng',
     !!eF && /chưa đếm/i.test(eF.message) && /ghép cột/.test(eF.message),
     eF ? eF.message.slice(-100) : '');
  let eF2 = null;
  try { await docb.docBang(xHai, 'hai.xlsx', { bangChon: 0, demDong: true }); } catch (er) { eF2 = er; }
  ok('⑧f Đếm rồi thì vẫn chỉ thẳng sang bảng có số liệu như cũ',
     !!eF2 && /“Data”/.test(eF2.message) && /chọn lại bảng/.test(eF2.message),
     eF2 ? eF2.message.slice(-90) : '');

  /* ⑧h — ô chọn bảng chỉ được hiện MỘT loại số: dòng CÓ NỘI DUNG.
     Bảng "Rác" có 6 dòng thô nhưng ô nào cũng rỗng ⇒ phải hiện 0, không phải 5. */
  const xRac = lamXlsx([
    { ten: 'Data', dong: [['Mã SKU', 'Tên'], ['SP-1', 'Hạt điều']] },
    { ten: 'Rác', dong: [['', ''], ['', ''], ['', ''], ['', ''], ['', ''], ['', '']] }
  ]);
  const bRac = await docb.docBang(xRac, 'rac.xlsx', { demDong: true });
  tin(`ô chọn bảng: ${bRac.dsBang.map(b => `${b.ten} (${b.so_dong})`).join(' | ')}`);
  ok('⑧h Bảng toàn dòng trống hiện 0 dòng, không hiện số dòng thô',
     bRac.dsBang.find(b => b.ten === 'Rác').so_dong === 0,
     String(bRac.dsBang.find(b => b.ten === 'Rác').so_dong));
  ok('⑧h Và bảng có số liệu vẫn đếm đúng',
     bRac.dsBang.find(b => b.ten === 'Data').so_dong === 1,
     String(bRac.dsBang.find(b => b.ten === 'Data').so_dong));
}

console.log('\n⑧ g. TÊN FILE NFD (MÁY MAC) vs NFC (WINDOWS) — THẤP-①');
{
  const nfc = 'Tồn đầu kỳ.csv'.normalize('NFC');
  const nfd = 'Tồn đầu kỳ.csv'.normalize('NFD');
  tin(`cùng một tên, nhìn trên màn hình y hệt: NFC ${nfc.length} ký tự · NFD ${nfd.length} ký tự`);
  ok('Tên file lưu dạng NFD (máy Mac), Sếp gõ NFC (Windows): vẫn khớp',
     nap.khopTenTep(nfc, nfd) === true && nap.khopTenTep(nfd, nfc) === true,
     `${nap.khopTenTep(nfc, nfd)} / ${nap.khopTenTep(nfd, nfc)}`);
  ok('Nhưng vẫn KHÔNG nới cửa: tên khác thì vẫn không khớp',
     nap.khopTenTep('Ton dau ky.csv', nfd) === false);
}

/* ==========================================================================
   TỰ KIỂM — GÀI LẠI TỪNG LỖI VÀO MÃ THẬT
   ========================================================================== */
if (TU_KIEM && !process.env.NAP_SRC) {
  console.log('\n══ TỰ KIỂM — GÀI LẠI TỪNG LỖI VÀO MÃ THẬT (6 lỗi vòng 1 + 7 lỗi vòng 2) ══');
  console.log('   (mỗi ca: chép src/ ra chỗ khác, gài lại đúng lỗi REV-0060 bắt được,');
  console.log('    rồi chạy lại chính bàn đo này. Mỗi ca PHẢI làm bàn đo ĐỎ.)\n');

  const CA_GAI = [
    { ten: '① Bỏ dò trùng khi nạp lại file tồn (tồn cộng dồn âm thầm)',
      tep: 'nap-du-lieu.js',
      tim: `    const trung = await doTrungNapTon(env, doiChieu.them, vanTayND);`,
      thay: `    const trung = null;   // GÀI LỖI: không dò trùng nữa` },

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
        [`  let chonThat = nguoiChon ? chon : chonMacDinh();`,
         `  let chonThat = 0;   // GÀI LỖI: luôn lấy bảng đầu`],
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
      thay: `  await chay('SELECT 1 FROM giao_dich_kho WHERE phieu_id = ?', [ma]);   // GÀI LỖI` },

    /* ---- Bảy ca của VÒNG 2 — lỗi mà chính bản vá đẻ ra ---- */

    { ten: '⑦ a CHẶN-① Gỡ lượt nạp mà không nhìn hàng đã xuất (tồn ÂM hồi tố)',
      tep: 'nap-du-lieu.js',
      tim: `  if (seAm.length) {`,
      thay: `  if (false) {   // GÀI LỖI: xoá thẳng, kệ tồn âm` },

    { ten: '⑦ a2 CHẶN-① Đọc sai dấu dòng xuất (chốt chặn tồn âm tự mù)',
      tep: 'nap-du-lieu.js',
      tim: `const CONG_DON_TON = \`SUM(CASE WHEN loai = 'xuat' THEN -ABS(so_luong) ELSE so_luong END)\`;`,
      thay: `const CONG_DON_TON = \`SUM(so_luong)\`;   // GÀI LỖI: dữ liệu lưu xuất dương thì mù` },

    { ten: '⑦ b CHẶN-② Ai có quyền thao tác kho cũng gỡ được lượt của người khác',
      tep: 'nap-du-lieu.js',
      tim: `  if (!laNguoiNap && !duocQuanLyKho(phien)) {`,
      thay: `  if (false) {   // GÀI LỖI: không kiểm chủ sở hữu` },

    { ten: '⑦ c CAO-③ Quay lại lối XOÁ TRƯỚC, đánh dấu SAU',
      tep: 'nap-du-lieu.js',
      tim: `  const danhDau = await chay(`,
      thay: `  await chay('DELETE FROM giao_dich_kho WHERE phieu_id = ?', [ma]);   // GÀI LỖI: xoá trước
  const danhDau = await chay(` },

    { ten: '⑦ d CAO-④ Kéo dòng ghi vết ra NGOÀI try (rò chỗ đặt hạn mức)',
      tep: 'nap-du-lieu.js',
      sua: [
        [`    if (maDich === 'ton_kho' && doiChieu.them.length) {
      dem(await ghiVet.bind('giao_dich_kho', String(phieuId), 'nap_file', vanTayND,
                            DANG_GHI, phien.nhan_su_id, nguoiTen, lyDo).run());
    }

    for (let i = 0; i < lenh.length; i += CO_LO) {`,
         `    for (let i = 0; i < lenh.length; i += CO_LO) {`],
        [`  let daChay = 0;
  try {`,
         `  if (maDich === 'ton_kho' && doiChieu.them.length) {   // GÀI LỖI: ghi vết ngoài try
    dem(await ghiVet.bind('giao_dich_kho', String(phieuId), 'nap_file', vanTayND,
                          DANG_GHI, phien.nhan_su_id, nguoiTen, lyDo).run());
  }
  let daChay = 0;
  try {`]
      ] },

    { ten: '⑦ e CAO-⑤ Một cái tick mở cả hai lớp xác nhận',
      tep: 'nap-du-lieu.js',
      tim: `    const chan = nguyenFile ? !daGoTen : (!!cau && !xacNhanTrung);`,
      thay: `    const chan = !!cau && !xacNhanTrung;   // GÀI LỖI: tick mở luôn lớp (a)` },

    { ten: '⑦ f CAO-⑥ Chạm trần dò trùng thì im lặng (chốt chặn tự mù)',
      tep: 'nap-du-lieu.js',
      tim: `      ra.cat = cat;`,
      thay: `      ra.cat = null;   // GÀI LỖI: chạm trần mà không nói` },

    { ten: '⑦ g CAO-⑦a Bỏ đọc cờ bảng ẩn (mặc định đọc bản nháp cũ)',
      tep: 'doc-bang.js',
      tim: `      const an = tt === 'hidden' || tt === 'veryhidden';`,
      thay: `      const an = false;   // GÀI LỖI` },

    { ten: '⑦ g2 CAO-⑦b Bảng đầu rỗng thì ném câu lỗi cụt đường',
      tep: 'doc-bang.js',
      tim: `  if (!nguoiChon && coDong(luoi) < 2 && dsBang.length > 1) {`,
      thay: `  if (false) {   // GÀI LỖI: không đi tiếp sang bảng có số liệu` },

    { ten: '⑦ h THẤP-⑧ Gợi ý bừa cho ô không bắt buộc (ghép nhầm mà tự tin)',
      tep: 'nap-du-lieu.js',
      tim: `    const nguong = t.batBuoc ? 55 : 90;`,
      thay: `    const nguong = 55;   // GÀI LỖI` },

    /* ---- Tám ca của VÒNG 3 ---- */

    { ten: '⑧ a CHẶN-ⓐ Chỉ soi số dư theo MÃ, bỏ tầng LÔ (tồn âm đi đường vòng)',
      tep: 'nap-du-lieu.js',
      tim: `  if (seAmLo.length) {`,
      thay: `  if (false) {   // GÀI LỖI: không soi lô, để lại lô âm mồ côi` },

    { ten: '⑧ a2 CHẶN-ⓐ Soi lô nhưng lọc mất chính lô âm (đúng bẫy HAVING ton > 0)',
      tep: 'nap-du-lieu.js',
      tim: `     HAVING con < 0\`;

  /* \`ORDER BY\` để câu từ chối kê ra cùng một danh sách ở mọi lần bấm`,
      thay: `     HAVING con < 0 AND con > 0\`;   // GÀI LỖI: không lô nào lọt lưới

  /* \`ORDER BY\` để câu từ chối kê ra cùng một danh sách ở mọi lần bấm` },

    { ten: '⑧ b CHẶN-ⓑ Bỏ hàm lập phiếu điều chỉnh (câu từ chối lại chỉ vào cửa không có)',
      tep: 'kho.js',
      tim: `export async function dieuChinhKho(env, phien, body) {`,
      thay: `async function dieuChinhKhoAn(env, phien, body) {   // GÀI LỖI: không xuất ra nữa` },

    { ten: '⑧ b2 CHẶN-ⓑ Phiếu điều chỉnh nuốt mất dấu trừ ("-5" lặng lẽ thành "5")',
      tep: 'kho.js',
      /* Vòng 4 dời phép đọc số vào hàm riêng `docTonThat` (CAO-①), nên mỏ neo
         cũ trỏ vào một dòng KHÔNG CÒN TỒN TẠI — ca gài thành MÙ mà bàn đo vẫn
         xanh. Neo lại vào dòng thật; gài đúng cùng một hành vi: nuốt mọi ký tự
         không phải chữ số, tức `-5` lặng lẽ thành `5`. */
      tim: `  const s = String(tho).trim();`,
      thay: `  const s = String(tho).replace(/[^\\d]/g, '');   // GÀI LỖI: nuốt dấu trừ` },

    { ten: '⑧ c CAO-③ So tên file khách gửi với chính tên file khách gửi',
      tep: 'nap-du-lieu.js',
      tim: `    const daGoTen = nguyenFile && !!canGo && khopTenTep(xacNhanTenTep, canGo);`,
      thay: `    const daGoTen = nguyenFile && khopTenTep(xacNhanTenTep, tenTep);   // GÀI LỖI` },

    { ten: '⑧ d CAO-④ Kiểm số dư mà không nhìn lượt người khác đang gỡ',
      tep: 'nap-du-lieu.js',
      tim: `             AND d.ban_ghi_id = g.phieu_id AND d.gia_tri_moi = '\${DA_GO}'
      WHERE g.san_pham_id IN`,
      thay: `             AND d.ban_ghi_id = g.phieu_id AND d.gia_tri_moi = 'không bao giờ khớp'
      WHERE g.san_pham_id IN` },

    { ten: '⑧ d2 CAO-④ Bỏ khoá “đã gỡ” trên chính lượt đang gỡ (hai người xoá hai lần)',
      tep: 'nap-du-lieu.js',
      tim: `        AND gia_tri_moi <> ?\`,
    [DA_GO, lyDoMoi, ma, DA_GO]);`,
      thay: `        AND ? <> ?\`,
    [DA_GO, lyDoMoi, ma, 'a', 'b']);   // GÀI LỖI: điều kiện luôn đúng` },

    { ten: '⑧ e CAO-⑤ Bỏ chốt 8 MB của vòng đi-tiếp (bung 30 bảng trong isolate 128 MB)',
      tep: 'doc-bang.js',
      tim: `      if (!mucB || mucB.coThat > 8 * 1024 * 1024) continue;`,
      thay: `      if (!mucB) continue;   // GÀI LỖI: bỏ chốt kích thước` },

    { ten: '⑧ f CAO-⑥ `keBangRong` lại khẳng định điều nó chưa đếm',
      tep: 'doc-bang.js',
      tim: `  if (!con.length && soChuaDem) {`,
      thay: `  if (false) {   // GÀI LỖI: chưa đếm mà vẫn nói "không bảng nào có dữ liệu"` },

    { ten: '⑧ g THẤP-① Bỏ chuẩn hoá NFC (tên file máy Mac gõ mãi không vào)',
      tep: 'nap-du-lieu.js',
      tim: `  const sach = s => String(s ?? '').normalize('NFC').trim().toLowerCase().replace(/\\s+/g, ' ');`,
      thay: `  const sach = s => String(s ?? '').trim().toLowerCase().replace(/\\s+/g, ' ');   // GÀI LỖI` },

    { ten: '⑧ h THẤP-③ Ô chọn bảng hiện lại hai loại số (thô vs có nội dung)',
      tep: 'doc-bang.js',
      tim: `      b.so_dong = Math.max(0, demDongCoNoiDung(x) - 1);`,
      thay: `      b.so_dong = Math.max(0, (x.match(/<row\\b/g) || []).length - 1);   // GÀI LỖI` }
  ];

  const TAM = path.join(GOC, '.tu-kiem-nap-lai');
  let batDuoc = 0;
  for (const ca of CA_GAI) {
    rmSync(TAM, { recursive: true, force: true });
    mkdirSync(TAM, { recursive: true });
    cpSync(path.join(GOC, 'src'), TAM, { recursive: true });

    const duong = path.join(TAM, ca.tep);
    /* Chuẩn hoá xuống dòng TRƯỚC KHI GÀI — cùng lý do với `docNguon()` ở đầu
       tệp. Chuỗi `tim` nhiều dòng viết trong file này dùng `\n`, còn bản lấy
       về ở Windows (`core.autocrlf=true`) là CRLF, nên `noi.includes(tim)`
       trượt và ca gài in "mã đã đổi nên ca này MÙ" — một câu SAI: mã không
       đổi gì cả. Đo được trước khi sửa: 27/32, đúng 5 ca trượt và cả 5 đều là
       ca có chuỗi `tim` nhiều dòng. (REV-0063 vòng 2) */
    let noi = readFileSync(duong, 'utf8').replace(/\r\n/g, '\n');
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
