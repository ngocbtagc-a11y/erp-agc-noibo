/* ==========================================================================
   BÀN ĐO — NẠP FILE GHI VÀO CSDL: TỐN BAO NHIÊU LƯỢT GHI, CÓ NHÂN ĐÔI KHÔNG
   ---------------------------------------------------------------------------
   Chạy:  npm run do-nap-ghi          · npm run do-nap-ghi-tu-kiem

   VÌ SAO PHẢI ĐO. Hạn mức gói miễn phí của D1 là 100.000 LƯỢT GHI MỖI NGÀY,
   và D1 tính CẢ DÒNG CHỈ MỤC — một bảng có 2 chỉ mục thì mỗi dòng dữ liệu
   ăn 3 lượt. ERP này đã từng ghi vượt hạn mức 3,47 lần suốt nhiều tuần mà
   không ai biết (xem src/canh-bao-ghi.js). Nạp một file 5.000 sản phẩm là
   đúng kiểu việc thổi bay hạn mức trong một nốt nhạc. Nên:
     · Con số ở đây phải ĐO, không được ước lượng.
     · Và phải đo trên ĐÚNG mã chạy thật, không phải trên bản chép lại.

   ĐO THẬT, KHÔNG CHÉP LẠI (theo lối scripts/do-ghi-dongbo.mjs):
     · CSDL dựng từ ĐÚNG `migrations/*.sql` của repo — kèm đủ chỉ mục.
     · Gọi ĐÚNG `napdulieu.ghiThat()` mà máy chủ gọi, qua một lớp giả lập D1
       bọc `node:sqlite`.
     · "Lượt ghi" = số dòng bảng thật đổi × (1 + số chỉ mục của bảng đó).
       Số chỉ mục ĐẾM TỪ `sqlite_master` của chính CSDL vừa dựng, kể cả chỉ
       mục ngầm do UNIQUE sinh ra — không gõ tay con số nào.

   BA CÂU HỎI PHẢI TRẢ LỜI BẰNG SỐ:
     ① File 100 / 1.000 / 5.000 dòng tốn bao nhiêu lượt ghi?
     ② Nạp LẠI ĐÚNG file đó 3 lần — số dòng có đổi không? (phải KHÔNG đổi)
     ③ Gài lỗi bỏ đối chiếu trùng thì bàn đo có bắt được? (--tu-kiem)
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TU_KIEM = process.argv.includes('--tu-kiem');

let dat = 0, truot = 0;
const hong = [];
function ok(ten, dung, chiTiet = '') {
  if (dung) { dat++; console.log(`  ✓ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
  else { truot++; hong.push(ten + (chiTiet ? ` — ${chiTiet}` : '')); console.log(`  ✗ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
}
function chet(vi) { console.error('\nBÀN ĐO HỎNG: ' + vi); process.exit(2); }

/* ==========================================================================
   1. DỰNG CSDL TỪ ĐÚNG MIGRATION CỦA REPO
   ========================================================================== */
/* Tách một file .sql thành từng câu lệnh.
   Không dùng `sql.split(';')` được vì hai lý do có thật trong repo này:
     · Ghi chú `--` tiếng Việt có chứa dấu chấm phẩy.
     · TRIGGER có `BEGIN … END;` với nhiều dấu chấm phẩy BÊN TRONG thân nó. */
function tachCau(sql) {
  /* ⚠️ Phải bỏ \r TRƯỚC. Trong biểu thức chính quy của JavaScript, `\r` được
     tính là ký tự XUỐNG DÒNG: `.` không khớp nó, nên `--.*$` trên file kiểu
     Windows (CRLF) KHÔNG khớp gì cả và ghi chú lọt nguyên vào câu SQL. Đây
     là kiểu hỏng câm — thay vì báo lỗi, nó lặng lẽ không làm gì. */
  const sach = sql.replace(/\r\n?/g, '\n')
                  .split('\n').map(d => d.replace(/--.*$/, '')).join('\n');
  const cau = [];
  let hienTai = '', trongThan = false;
  for (const mau of sach.split(/(;)/)) {
    hienTai += mau;
    if (mau !== ';') {
      if (/\bBEGIN\b/i.test(mau)) trongThan = true;
      if (/\bEND\b\s*$/i.test(mau.trim())) trongThan = false;
      continue;
    }
    if (trongThan) continue;              // dấu ; nằm trong thân trigger -> chưa hết câu
    const c = hienTai.trim();
    if (c && c !== ';') cau.push(c);
    hienTai = '';
  }
  const cuoi = hienTai.trim();
  if (cuoi) cau.push(cuoi);
  return cau;
}

function dungCsdl() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = OFF;');

  // Chỉ nạp những migration liên quan — nạp cả thư mục thì vướng trigger của
  // module khác, mà ta chỉ cần đúng các bảng của việc này.
  const canCo = ['them-kho.sql', 'them-khoa-danhmuc-nen.sql', 'them-nap-ghep-cot.sql',
                 'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql'];
  for (const ten of canCo) {
    const duong = path.join(GOC, 'migrations', ten);
    if (!existsSync(duong)) chet(`thiếu migrations/${ten} — bàn đo không dựng đúng CSDL thật được`);
    for (const c of tachCau(readFileSync(duong, 'utf8'))) {
      try { db.exec(c); } catch (e) {
        // Bỏ qua ALTER thêm cột đã có / REFERENCES tới bảng chưa dựng
        if (!/duplicate column|no such table|already exists/i.test(e.message)) {
          chet(`không chạy được câu SQL trong ${ten}: ${e.message}\n${c.slice(0, 160)}`);
        }
      }
    }
  }
  // nhan_su chỉ để khoá ngoại không kêu — không phải đối tượng đo
  db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
           INSERT OR IGNORE INTO nhan_su (id, ho_ten) VALUES ('NS-NGOC','Bùi Thị Ngọc');`);

  for (const b of ['san_pham', 'lo_hang', 'giao_dich_kho', 'lich_su_thay_doi_nen', 'nap_ghep_cot']) {
    const co = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(b);
    if (!co) chet(`dựng CSDL xong mà không có bảng ${b} — migration đã đổi, sửa bàn đo`);
  }
  return db;
}

/* Đếm chỉ mục THẬT của một bảng, kể cả chỉ mục ngầm do UNIQUE sinh. */
function soChiMuc(db, bang) {
  const r = db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND tbl_name=?`).get(bang);
  return r ? Number(r.n) : 0;
}

/* ==========================================================================
   2. LỚP GIẢ LẬP D1 — bọc node:sqlite, trả `meta.rows_written` như D1 thật
   ========================================================================== */
function dungD1(db) {
  const chiMuc = new Map();
  const demIdx = b => {
    if (!chiMuc.has(b)) chiMuc.set(b, soChiMuc(db, b));
    return chiMuc.get(b);
  };
  /* D1 tính lượt ghi = dòng bảng + dòng chỉ mục. Bảng nào cũng vậy, nên hệ
     số là (1 + số chỉ mục). Đây là chỗ DUY NHẤT trong bàn đo có mô hình hoá
     — và số chỉ mục vẫn đếm từ CSDL thật, không gõ tay. */
  const bangCua = sql => {
    const m = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([a-z_]+)/i) || sql.match(/UPDATE\s+([a-z_]+)/i)
           || sql.match(/DELETE\s+FROM\s+([a-z_]+)/i);
    return m ? m[1] : null;
  };

  let tongGhi = 0;
  const moi = (sql, tso = []) => ({
    bind: (...a) => moi(sql, a),
    async run() {
      const st = db.prepare(sql);
      const kq = st.run(...tso);
      const bang = bangCua(sql);
      const dong = Number(kq.changes || 0);
      const ghi = bang ? dong * (1 + demIdx(bang)) : dong;
      tongGhi += ghi;
      return { success: true, meta: { rows_written: ghi, changes: dong, last_row_id: kq.lastInsertRowid } };
    },
    async first() { const r = db.prepare(sql).get(...tso_(tso)); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...tso_(tso)) }; }
  });
  const tso_ = a => a;

  return {
    DB: {
      prepare: sql => moi(sql),
      async batch(ds) { const ra = []; for (const s of ds) ra.push(await s.run()); return ra; }
    },
    tongGhi: () => tongGhi,
    datLai: () => { tongGhi = 0; }
  };
}

/* ==========================================================================
   3. DỰNG FILE CSV (chỉ để đo QUY MÔ — tính đúng sai đã đo ở do-nap-file)
   ========================================================================== */
const B = s => new TextEncoder().encode(s);
function csvSanPham(n, doi = 0) {
  let s = 'Mã SKU,Tên sản phẩm,Nhóm hàng,Đơn vị tính,Tồn tối thiểu\n';
  for (let i = 1; i <= n; i++) {
    const ten = doi ? `Hạt điều rang muối gói ${i} (bản ${doi})` : `Hạt điều rang muối gói ${i}`;
    s += `SP-${String(i).padStart(5, '0')},"${ten}",Hạt dinh dưỡng,túi,${20 + (i % 30)}\n`;
  }
  return B(s);
}

const PHIEN = { nhan_su_id: 'NS-NGOC', ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin', quyen: ['khovan', 'kinhdoanh'] };

const NGUON = process.env.NAP_SRC ? path.resolve(process.env.NAP_SRC) : path.join(GOC, 'src');
const napM = m => import(pathToFileURL2(path.join(NGUON, m)));
function pathToFileURL2(p) { return new URL('file:///' + p.replace(/\\/g, '/')); }
const nap = await napM('nap-du-lieu.js');

async function nạp(env, bytes, ghep, maDich = 'san_pham', tenTep = 'thu.csv') {
  const bang = await nap.docBangTuByte(bytes, tenTep);
  return nap.ghiThat(env, PHIEN, { bang, ghep, maDich, tenTep });
}
const GHEP_SP = { ma_sku: 0, ten: 1, danh_muc: 2, don_vi: 3, ton_toi_thieu: 4 };

/* ==========================================================================
   4. ĐO LƯỢT GHI THEO QUY MÔ FILE
   ========================================================================== */
console.log('\n① Lượt ghi D1 theo cỡ file (bảng san_pham)');
const bangDo = [];
for (const n of [100, 1000, 5000]) {
  const db = dungCsdl();
  const env = dungD1(db);
  const t0 = Date.now();
  const kq = await nạp(env, csvSanPham(n), GHEP_SP);
  const ms = Date.now() - t0;
  const soDong = db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n;
  bangDo.push({ n, ghi: kq.luot_ghi_that, soDong: Number(soDong), ms, lenh: kq.so_lenh });
  ok(`${n} dòng -> ${kq.luot_ghi_that.toLocaleString('vi-VN')} lượt ghi, ${ms} ms`,
     Number(soDong) === n, `CSDL có ${soDong} sản phẩm`);
}
console.log('\n   Bảng số (đo thật, không ước lượng):');
console.log('   ┌────────────┬──────────────┬─────────────┬────────┐');
console.log('   │ Dòng file  │ Lượt ghi D1  │ Ghi/dòng    │ Thời gian│');
for (const r of bangDo) {
  console.log(`   │ ${String(r.n).padStart(10)} │ ${String(r.ghi.toLocaleString('vi-VN')).padStart(12)} │ ${String((r.ghi / r.n).toFixed(1)).padStart(11)} │ ${String(r.ms + ' ms').padStart(8)} │`);
}
console.log('   └────────────┴──────────────┴─────────────┴────────┘');
{
  const r5 = bangDo.find(x => x.n === 5000);
  ok('File 5.000 dòng vẫn dưới hạn mức 100.000 lượt/ngày', r5.ghi < 100000,
     `${r5.ghi.toLocaleString('vi-VN')} lượt = ${(r5.ghi / 1000).toFixed(0)}% hạn mức`);
}

/* ---- Con số DỰ TÍNH phải KHÔNG ĐƯỢC LẠC QUAN hơn con số THẬT ------------
   Chốt chặn hạn mức đứng trên con số dự tính (`GHI_MOI_DONG` trong
   nap-du-lieu.js). Dự tính THẤP hơn thực tế thì chốt chặn vô dụng: nó cho
   một file đi qua rồi file đó ăn gấp đôi hạn mức. Nên bàn đo phải canh
   chính con số dự tính đó, không chỉ canh kết quả. */
console.log('\n   Đối chiếu con số DỰ TÍNH với con số THẬT:');
{
  if (typeof nap.duTinhGhi !== 'function') chet('nap-du-lieu.js không còn xuất duTinhGhi — sửa bàn đo');

  /* ---- Trần THAM SỐ của D1 ------------------------------------------------
     `node:sqlite` cho hàng chục nghìn tham số nên bàn đo này KHÔNG tự vấp
     được ca đó; D1 thật chỉ cho 100. Vì vậy phải canh thẳng CON SỐ trong mã.
     Đây là bài học đã trả giá: đặt 200, bàn thử xanh mướt, lên Worker thật
     thì `too many SQL variables` giết cả bước xem trước. */
  {
    const nguon = readFileSync(path.join(NGUON, 'nap-du-lieu.js'), 'utf8');
    const m = nguon.match(/const CO_LO_HOI = (\d+)/);
    if (!m) chet('không bóc được CO_LO_HOI trong nap-du-lieu.js — mã đã đổi, sửa bàn đo');
    const n = Number(m[1]);
    ok(`Số mã hỏi một lượt (${n}) nằm dưới trần 100 tham số của D1`, n <= 100,
       n > 100 ? `D1 sẽ ném "too many SQL variables"` : 'an toàn');
    // Không còn chỗ nào chunk bằng số cứng > 100
    const soCung = [...nguon.matchAll(/i \+= (\d+)\)/g)].map(x => Number(x[1])).filter(v => v > 100);
    ok('Không còn vòng lặp nào chia lô lớn hơn 100', soCung.length === 0, soCung.join(', '));
  }

  // (a) File toàn dòng THÊM
  {
    const duTinh = nap.duTinhGhi('san_pham', Array.from({ length: 100 }, () => ({})), []);
    const that = bangDo[0].ghi;
    console.log(`     · san_pham, 100 dòng thêm: thật ${that}, dự tính ${duTinh}`);
    ok('Dự tính KHÔNG lạc quan hơn thật (san_pham, dòng thêm)', duTinh >= that,
       duTinh < that ? `HỤT ${that - duTinh} lượt` : 'an toàn');
  }

  // (b) File toàn dòng SỬA — mỗi ô đổi là một dòng ghi vết, chỗ dễ hụt nhất
  {
    const db = dungCsdl(); const env = dungD1(db);
    await nạp(env, csvSanPham(200), GHEP_SP);
    const kq = await nạp(env, csvSanPham(200, 2), GHEP_SP);   // đổi tên -> 200 dòng sửa
    const sua = Array.from({ length: 200 }, () => ({ __doi: { ten: [1, 2] } }));
    const duTinh = nap.duTinhGhi('san_pham', [], sua);
    console.log(`     · san_pham, 200 dòng sửa 1 ô: thật ${kq.luot_ghi_that}, dự tính ${duTinh}`);
    ok('Dự tính KHÔNG lạc quan hơn thật (san_pham, dòng sửa)', duTinh >= kq.luot_ghi_that,
       duTinh < kq.luot_ghi_that ? `HỤT ${kq.luot_ghi_that - duTinh} lượt` : 'an toàn');
  }

  // (c) Tồn kho
  {
    const db = dungCsdl(); const env = dungD1(db);
    await nạp(env, csvSanPham(200), GHEP_SP);
    let s = 'Mã SKU,Số lượng tồn,Hạn sử dụng\n';
    for (let i = 1; i <= 200; i++) s += `SP-${String(i).padStart(5, '0')},${i},31/12/2026\n`;
    const kq = await nạp(env, B(s), { ma_sku: 0, so_luong: 1, han_su_dung: 2 }, 'ton_kho', 'ton.csv');
    const duTinh = nap.duTinhGhi('ton_kho', Array.from({ length: 200 }, () => ({})), []);
    console.log(`     · ton_kho, 200 dòng: thật ${kq.luot_ghi_that}, dự tính ${duTinh}`);
    ok('Dự tính KHÔNG lạc quan hơn thật (ton_kho)', duTinh >= kq.luot_ghi_that,
       duTinh < kq.luot_ghi_that ? `HỤT ${kq.luot_ghi_that - duTinh} lượt` : 'an toàn');
  }
}

/* ==========================================================================
   5. TẢI LẠI CÙNG FILE 3 LẦN — KHÔNG ĐƯỢC NHÂN ĐÔI
   ========================================================================== */
console.log('\n② Nạp LẠI đúng file đó 3 lần');
{
  const db = dungCsdl();
  const env = dungD1(db);
  const tep = csvSanPham(500);
  const dem = () => Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n);

  const l1 = await nạp(env, tep, GHEP_SP); const d1 = dem();
  const l2 = await nạp(env, tep, GHEP_SP); const d2 = dem();
  const l3 = await nạp(env, tep, GHEP_SP); const d3 = dem();

  ok('Lần 1 thêm đủ 500 dòng', d1 === 500, `${d1} dòng, ${l1.luot_ghi_that} lượt ghi`);
  ok('Lần 2 KHÔNG nhân đôi', d2 === 500, `vẫn ${d2} dòng`);
  ok('Lần 3 KHÔNG nhân đôi', d3 === 500, `vẫn ${d3} dòng`);
  ok('Lần 2 nhận ra "y hệt" nên BỎ QUA hết', l2.bo_qua === 500 && l2.da_them === 0,
     `thêm ${l2.da_them}, sửa ${l2.da_sua}, bỏ qua ${l2.bo_qua}`);
  ok('Lần 2 tốn 0 LƯỢT GHI (không đổi thì không ghi)', l2.luot_ghi_that === 0,
     `${l2.luot_ghi_that} lượt`);
  ok('Lần 3 cũng tốn 0 lượt ghi', l3.luot_ghi_that === 0, `${l3.luot_ghi_that} lượt`);
  ok('Không sinh dòng lịch sử thừa',
     Number(db.prepare(`SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen`).get().n) === 500,
     `${db.prepare(`SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen`).get().n} dòng ghi vết`);
}

/* File CẬP NHẬT (thêm dòng mới + sửa vài dòng cũ) — phải sửa, không nhân đôi */
console.log('\n③ File cập nhật: thêm dòng mới + sửa dòng cũ');
{
  const db = dungCsdl();
  const env = dungD1(db);
  await nạp(env, csvSanPham(300), GHEP_SP);
  const kq = await nạp(env, csvSanPham(400, 2), GHEP_SP);   // 400 dòng, tên đã đổi
  const soDong = Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n);

  ok('Tổng thành 400 dòng, không phải 700', soDong === 400, `${soDong} dòng`);
  ok('Nhận đúng 100 dòng THÊM', kq.da_them === 100, `thêm ${kq.da_them}`);
  ok('Nhận đúng 300 dòng SỬA', kq.da_sua === 300, `sửa ${kq.da_sua}`);
  const ten1 = db.prepare(`SELECT ten FROM san_pham WHERE ma_sku='SP-00001'`).get().ten;
  ok('Dòng cũ đã được cập nhật tên mới', /bản 2/.test(ten1), ten1);
}

/* ==========================================================================
   6. CHẶN KHI VƯỢT HẠN MỨC GHI TRONG NGÀY
   ========================================================================== */
console.log('\n④ Chặn khi hạn mức ghi trong ngày sắp cạn');
{
  const db = dungCsdl();
  const env = dungD1(db);
  const ngay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  db.prepare('INSERT INTO d1_ghi_ngay (ngay, so_dong, da_bao) VALUES (?, ?, 0)').run(ngay, 95000);

  const kq = await nạp(env, csvSanPham(1000), GHEP_SP);
  ok('Vượt hạn mức thì TỪ CHỐI ghi', !!kq.loi, kq.loi ? kq.loi.slice(0, 80) : '(vẫn ghi!)');
  ok('Từ chối bằng mã 429', kq.ma === 429, `mã ${kq.ma}`);
  ok('KHÔNG ghi dòng nào vào CSDL',
     Number(db.prepare('SELECT COUNT(*) AS n FROM san_pham').get().n) === 0);
  ok('Câu từ chối nói cách xử lý', /chia nhỏ|ngày mai/i.test(kq.loi || ''), (kq.loi || '').slice(0, 90));
}
{
  /* ⚠️ CA NÀY LỌT LƯỚI VÒNG TRƯỚC, VÀ NÓ LÀM CHỐT CHẶN THÀNH ĐỒ TRANG TRÍ.
     Lượt ghi của một lần nạp file phải vào SỔ NGÀY (`d1_ghi_ngay`) NGAY, chứ
     không đợi cron. `demGhi` chỉ cộng vào một biến trong BỘ NHỚ của isolate
     đang chạy, mà cron chốt sổ chạy ở isolate KHÁC — số đó không bao giờ tới
     nơi. Không chốt ngay thì nạp ba file 5.000 dòng liên tiếp (120.000 lượt)
     mà lần nào màn xem trước cũng báo "hôm nay còn 100.000 lượt", rồi D1
     chặn ghi cả hệ thống. */
  const db = dungCsdl();
  const env = dungD1(db);
  const ngay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const doSo = () => db.prepare('SELECT so_dong FROM d1_ghi_ngay WHERE ngay = ?').get(ngay)?.so_dong ?? null;

  ok('Trước khi nạp: sổ ngày chưa có gì', doSo() === null, String(doSo()));

  const kq1 = await nạp(env, csvSanPham(50), GHEP_SP);
  const sau1 = doSo();
  ok('Nạp xong: lượt ghi vào SỔ NGÀY ngay, KHÔNG đợi cron', sau1 !== null && sau1 > 0,
     sau1 === null ? '(SỔ NGÀY VẪN TRỐNG — chốt chặn vô dụng)' : `sổ ngày = ${sau1}`);
  ok('Sổ ngày ghi đủ lượt ghi thật của lần nạp', sau1 >= kq1.luot_ghi_that,
     `sổ ${sau1} · thật ${kq1.luot_ghi_that}`);

  /* File THỨ HAI trong cùng ngày — đây mới đúng chỗ người ta vượt hạn mức.
     Sổ phải CỘNG DỒN, không ghi đè. */
  const kq2 = await nạp(env, csvSanPham(100), GHEP_SP);
  const sau2 = doSo();
  ok('File thứ hai CỘNG DỒN vào sổ ngày, không ghi đè',
     sau2 >= sau1 + kq2.luot_ghi_that, `sau file 1 = ${sau1} · sau file 2 = ${sau2}`);
  ok('Trả lại cho giao diện số lượt còn lại sau khi nạp',
     typeof kq2.ghi_con_lai_hom_nay === 'number', String(kq2.ghi_con_lai_hom_nay));
}

/* ==========================================================================
   7. GHI VẾT + KHOÁ DỮ LIỆU
   ========================================================================== */
console.log('\n⑤ Ghi vết và khoá dữ liệu');
{
  const db = dungCsdl();
  const env = dungD1(db);
  await nạp(env, csvSanPham(5), GHEP_SP, 'san_pham', 'DanhMuc_Thang9.csv');
  const v = db.prepare(`SELECT * FROM lich_su_thay_doi_nen LIMIT 1`).get();
  ok('Có ghi vết vào bảng lich_su_thay_doi_nen SẴN CÓ', !!v);
  ok('Ghi vết có tên người nạp', v && v.nguoi_ten === 'Bùi Thị Ngọc', v && v.nguoi_ten);
  ok('Ghi vết có TÊN FILE trong lý do', v && /DanhMuc_Thang9\.csv/.test(v.ly_do || ''), v && v.ly_do);
  ok('Ghi vết trỏ đúng bảng san_pham', v && v.bang === 'san_pham', v && v.bang);
}
{
  // Mã đã "Hoàn tất" (khoá) thì file KHÔNG được ghi đè
  const db = dungCsdl();
  const env = dungD1(db);
  await nạp(env, csvSanPham(3), GHEP_SP);
  db.prepare(`UPDATE san_pham SET trang_thai='da_khoa' WHERE ma_sku='SP-00001'`).run();
  const kq = await nạp(env, csvSanPham(3, 2), GHEP_SP);
  const ten1 = db.prepare(`SELECT ten FROM san_pham WHERE ma_sku='SP-00001'`).get().ten;
  const ten2 = db.prepare(`SELECT ten FROM san_pham WHERE ma_sku='SP-00002'`).get().ten;
  ok('Mã ĐÃ KHOÁ: file không ghi đè được', !/bản 2/.test(ten1), ten1);
  ok('Mã chưa khoá: vẫn cập nhật bình thường', /bản 2/.test(ten2), ten2);
  ok('Có báo lại số mã bị bỏ vì khoá', kq.bo_vi_khoa === 1, `bỏ ${kq.bo_vi_khoa}`);
}

/* ==========================================================================
   8. TỒN KHO — ghi vào SỔ CÁI, và phải có sản phẩm trước
   ========================================================================== */
console.log('\n⑥ Nạp tồn kho vào sổ cái');
{
  const db = dungCsdl();
  const env = dungD1(db);
  await nạp(env, csvSanPham(5), GHEP_SP);

  let s = 'Mã SKU,Số lượng tồn,Đơn giá vốn,Hạn sử dụng\n';
  for (let i = 1; i <= 5; i++) s += `SP-${String(i).padStart(5, '0')},${i * 10},145200,31/12/2026\n`;
  s += 'SP-99999,50,1000,31/12/2026\n';     // mã chưa có trong ERP
  const kq = await nạp(env, B(s), { ma_sku: 0, so_luong: 1, don_gia: 2, han_su_dung: 3 }, 'ton_kho', 'TonKho.csv');

  ok('Ghi 5 dòng vào sổ cái giao_dich_kho',
     Number(db.prepare('SELECT COUNT(*) AS n FROM giao_dich_kho').get().n) === 5,
     `${db.prepare('SELECT COUNT(*) AS n FROM giao_dich_kho').get().n} dòng`);
  ok('Mã chưa có trong ERP thì KHÔNG ghi bừa', kq.da_them === 5, `ghi ${kq.da_them}`);
  ok('Tồn tính đúng bằng tổng sổ cái',
     Number(db.prepare('SELECT SUM(so_luong) AS t FROM giao_dich_kho').get().t) === 150,
     `tổng ${db.prepare('SELECT SUM(so_luong) AS t FROM giao_dich_kho').get().t}`);
  ok('Có tạo lô hàng cho mã theo dõi hạn dùng',
     Number(db.prepare('SELECT COUNT(*) AS n FROM lo_hang').get().n) === 5);
  ok('Hạn dùng đọc đúng kiểu Việt Nam (31/12/2026)',
     db.prepare(`SELECT han_su_dung AS h FROM lo_hang LIMIT 1`).get().h === '2026-12-31',
     db.prepare(`SELECT han_su_dung AS h FROM lo_hang LIMIT 1`).get().h);
  ok('Mọi dòng đều thuộc CÙNG MỘT phiếu nhập',
     Number(db.prepare('SELECT COUNT(DISTINCT phieu_id) AS n FROM giao_dich_kho').get().n) === 1);
}

/* ==========================================================================
   9. TỰ KIỂM — gài lỗi vào mã thật
   ========================================================================== */
if (TU_KIEM && !process.env.NAP_SRC) {
  console.log('\n⑦ TỰ KIỂM — gài lỗi thật vào mã thật, bàn đo PHẢI đỏ\n');
  const { mkdirSync, rmSync, cpSync, writeFileSync } = await import('node:fs');
  const { spawnSync } = await import('node:child_process');

  const CA_GAI = [
    { ten: 'Bỏ đối chiếu "y hệt thì bỏ qua" (nạp lại là ghi đè hết)',
      tep: 'nap-du-lieu.js',
      tim: `      if (!Object.keys(doi).length) boQua.push(b);      // y hệt -> KHÔNG ghi`,
      thay: `      if (false) boQua.push(b);` },
    { ten: 'Luôn THÊM MỚI, không nhận ra mã đã có (nhân đôi dữ liệu)',
      tep: 'nap-du-lieu.js',
      tim: `      if (!cu) { them.push(b); continue; }`,
      thay: `      { them.push(b); continue; }` },
    { ten: 'Bỏ chốt chặn hạn mức ghi trong ngày',
      tep: 'nap-du-lieu.js',
      tim: `  if (ghiDuTinh > Math.max(0, conLai - CHUA_LAI)) {`,
      thay: `  if (false) {` },
    { ten: 'Mã đã khoá vẫn cho file ghi đè',
      tep: 'nap-du-lieu.js',
      tim: `      if (b.__khoaCu) continue;`,
      thay: `      if (false) continue;` }
  ];

  const TAM = path.join(GOC, '.tu-kiem-ghi');
  let batDuoc = 0;
  for (const ca of CA_GAI) {
    rmSync(TAM, { recursive: true, force: true });
    mkdirSync(TAM, { recursive: true });
    cpSync(path.join(GOC, 'src'), TAM, { recursive: true });
    const duong = path.join(TAM, ca.tep);
    const goc = readFileSync(duong, 'utf8');
    if (!goc.includes(ca.tim)) { console.log(`  ✗ ${ca.ten}\n      KHÔNG gài được — mã đã đổi, ca này MÙ.`); continue; }
    writeFileSync(duong, goc.replace(ca.tim, ca.thay), 'utf8');
    const kq = spawnSync(process.execPath, [fileURLToPath(import.meta.url)],
                         { env: { ...process.env, NAP_SRC: TAM }, encoding: 'utf8' });
    if (kq.status === 1) {
      const t = (kq.stdout.match(/TRƯỢT (\d+)/) || [])[1] || '?';
      console.log(`  ✓ ${ca.ten}\n      → bàn đo ĐỎ (${t} ca trượt) — bắt được.`);
      batDuoc++;
    } else {
      console.log(`  ✗ ${ca.ten}\n      → bàn đo VẪN XANH. LỖ THỦNG.`);
    }
  }
  rmSync(TAM, { recursive: true, force: true });
  console.log(`\nTự kiểm: bắt được ${batDuoc}/${CA_GAI.length} lỗi gài.`);
  if (batDuoc < CA_GAI.length) { console.log('\n❌ TỰ KIỂM TRƯỢT'); process.exit(1); }
  console.log('✅ Tự kiểm đạt.');
}

console.log('\n' + '='.repeat(66));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) {
  console.log('\nCác ca trượt:');
  hong.forEach(h => console.log('  · ' + h));
  console.log('\n❌ ĐỎ');
  process.exit(1);
}
console.log('✅ XANH');
