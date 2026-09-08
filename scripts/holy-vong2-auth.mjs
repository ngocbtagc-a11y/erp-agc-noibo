/* ==========================================================================
   HỒ LY VÒNG 2 — SOI `src/auth.js` NHƯ SOI MÃ MỚI
   ---------------------------------------------------------------------------
   Bản vá ① đổi `catch` trần thành:
       if (!/no such column/i.test(tin) || !/vi_tri_cong_viec/i.test(tin)) throw e;

   Đây là CHỐT BẰNG SO CHUỖI THÔNG BÁO LỖI. Hai câu hỏi phải trả lời bằng số:

   ① Lỗi D1 TẠM THỜI nay có hỏng TO (500) thay vì âm thầm ghi thiếu không?
      — mong đợi: CÓ, đó là ý của bản vá.
   ② Có lỗi nào THẬT SỰ là thiếu cột mà nay bị ném ra 500 không?
      — tức bản vá có phá lại cửa sổ "mã mới, DB chưa migration" mà vòng 1
        đã đo sạch không. ĐÂY LÀ RỦI RO CHÍNH CỦA BẢN VÁ.

   Cách đo: bơm ĐÚNG một lỗi với NHIỀU CÁCH GHI THÔNG BÁO khác nhau vào đúng
   câu thăm dò của coCotViTri, rồi đo mã HTTP ở CẢ 4 CỬA gọi nó, cộng cửa
   đăng nhập (docPhien có đường phòng thủ RIÊNG — phải sống độc lập).

   Chạy: node scripts/holy-vong2-auth.mjs
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');
datDongHo('2026-09-04T03:00:00Z');

/* ---- Thông báo lỗi THẬT của lớp D1 khi thiếu cột ------------------------ */
{
  const { db, d1 } = dungDB();
  db.exec('DROP INDEX IF EXISTS idx_taikhoan_vitri');
  db.exec('ALTER TABLE tai_khoan DROP COLUMN vi_tri_cong_viec');
  let tin = '(không ném lỗi)';
  try { await d1.prepare('SELECT vi_tri_cong_viec FROM tai_khoan LIMIT 1').first(); }
  catch (e) { tin = e.message; }
  console.log('\n=== THÔNG BÁO LỖI THẬT KHI THIẾU CỘT =============================\n');
  console.log('   "' + tin + '"');
  const khop = /no such column/i.test(tin) && /vi_tri_cong_viec/i.test(tin);
  ok('Chốt mới KHỚP đúng thông báo thiếu cột thật', khop, khop ? 'khớp cả hai vế' : 'KHÔNG KHỚP');
  db.close?.();
}

/* ---- Bơm lỗi với nhiều CÁCH GHI khác nhau ------------------------------- */
const CACH_GHI = [
  ['W1 SQLite địa phương', 'no such column: vi_tri_cong_viec', 'thiếu cột', true],
  ['W2 D1 từ xa (thật)',   'D1_ERROR: no such column: vi_tri_cong_viec: SQLITE_ERROR', 'thiếu cột', true],
  ['W3 D1 chập tạm thời',  'D1_ERROR: Network connection lost.', 'lỗi tạm thời', false],
  ['W4 D1 quá tải',        'D1_ERROR: Too many API requests by single worker invocation.', 'lỗi tạm thời', false],
  ['W5 Cloudflare ĐỔI CHỮ','SQLITE_ERROR: unknown column vi_tri_cong_viec in SELECT', 'thiếu cột', false],
  ['W6 thiếu cả BẢNG',     'D1_ERROR: no such table: tai_khoan: SQLITE_ERROR', 'thiếu bảng', false],
  ['W7 KHÔNG kèm tên cột', 'D1_ERROR: no such column', 'thiếu cột', false]
];

/* 4 cửa gọi coCotViTri + 1 cửa đăng nhập (docPhien, đường phòng thủ riêng) */
const CUA = [
  ['/api/danh-ba',                'GET',  null],
  ['/api/quan-tri/danh-sach',     'GET',  null],
  ['/api/toi-la-ai',              'GET',  null],   // KHÔNG gọi coCotViTri — chốt sống
  ['/api/quan-tri/tao-tai-khoan', 'POST', { nhan_su_id: 'MOI', ten_dang_nhap: 'tkmoi',
                                            vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'nhan_vien_kho' }],
  ['/api/quan-tri/sua-vai-tro',   'POST', { tai_khoan_id: 2, vi_tri_cong_viec: 'nhan_vien_kho' }]
];

function moi(db) {
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)');
  const tk = db.prepare(`INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk)
                         VALUES (?,?,?,?,?,1,0)`);
  ns.run('SEP', 'Bùi Thị Ngọc', 'BN', 'CEO', 'BGĐ');
  ns.run('NAN', 'Nạn nhân', 'NN', 'NV', 'Kho');
  ns.run('MOI', 'Người mới', 'NM', 'NV', 'Kho');
  tk.run(1, 'SEP', 'tksep', 'pbkdf2$1$x$x', 'admin');
  tk.run(2, 'NAN', 'tknan', 'pbkdf2$1$x$x', 'nguoi_dung');
}

async function doMotCachGhi(tinLoi, boCot) {
  const { db, d1 } = dungDB();
  moi(db);
  if (boCot) {
    db.exec('DROP INDEX IF EXISTS idx_taikhoan_vitri');
    db.exec('ALTER TABLE tai_khoan DROP COLUMN vi_tri_cong_viec');
  }
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(SRC, 'index.js')).href + `?v=${Math.random()}`)).default;
  const tk = await taoPhienThat(env, 1);

  /* Bơm lỗi CHỈ vào câu thăm dò của coCotViTri. Mọi câu khác chạy thật. */
  const goc = d1.prepare.bind(d1);
  if (tinLoi) d1.prepare = (sql) => {
    if (/SELECT vi_tri_cong_viec FROM tai_khoan LIMIT 1/.test(sql)) {
      return { first: async () => { throw new Error(tinLoi); },
               bind: () => ({ first: async () => { throw new Error(tinLoi); },
                              run: async () => { throw new Error(tinLoi); } }) };
    }
    return goc(sql);
  };

  const ma = {};
  for (const [d, pt, body] of CUA) {
    const init = pt === 'POST'
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {};
    ma[d] = (await goiAPI(worker, env, d, tk, init)).status;
  }
  d1.prepare = goc;
  const cot = boCot ? 'NULL AS vi_tri_cong_viec' : 'vi_tri_cong_viec';
  const dong = db.prepare(`SELECT vai_tro, ${cot} FROM tai_khoan WHERE ten_dang_nhap='tkmoi'`).get() || null;
  db.close?.();
  return { ma, dong };
}

console.log('\n=== BƠM LỖI THEO TỪNG CÁCH GHI THÔNG BÁO ==========================\n');
console.log('cách ghi'.padEnd(26) + 'danhba qtDS toiLaAi taoTK suaVT   ô2 ghi ra');
const ketQua = [];
for (const [ten, tin, loai, nenNuot] of CACH_GHI) {
  const r = await doMotCachGhi(tin, false);
  ketQua.push({ ten, tin, loai, nenNuot, ...r });
  console.log(ten.padEnd(26) +
    String(r.ma['/api/danh-ba']).padEnd(7) +
    String(r.ma['/api/quan-tri/danh-sach']).padEnd(5) +
    String(r.ma['/api/toi-la-ai']).padEnd(8) +
    String(r.ma['/api/quan-tri/tao-tai-khoan']).padEnd(6) +
    String(r.ma['/api/quan-tri/sua-vai-tro']).padEnd(8) +
    (r.dong ? JSON.stringify(r.dong.vi_tri_cong_viec) : '(không tạo)'));
}

console.log('\n--- ① Lỗi TẠM THỜI có hỏng TO thay vì âm thầm ghi thiếu không? ---');
const tamThoi = ketQua.filter(x => x.loai === 'lỗi tạm thời');
ok('Lỗi D1 tạm thời KHÔNG còn âm thầm ghi tài khoản mất ô 2',
   tamThoi.every(x => !(x.ma['/api/quan-tri/tao-tai-khoan'] === 200 && x.dong && x.dong.vi_tri_cong_viec == null)),
   tamThoi.map(x => x.ten.slice(0, 2) + '→' + x.ma['/api/quan-tri/tao-tai-khoan']).join(' · '));
ok('Lỗi D1 tạm thời làm cửa tạo tài khoản trả 500 (hỏng to, bấm lại được)',
   tamThoi.every(x => x.ma['/api/quan-tri/tao-tai-khoan'] === 500),
   tamThoi.map(x => x.ma['/api/quan-tri/tao-tai-khoan']).join(','));

console.log('\n--- ② Có lỗi THIẾU CỘT nào nay bị ném ra 500 không? ---');
const thieuCot = ketQua.filter(x => x.loai === 'thiếu cột');
for (const x of thieuCot) {
  const sap = Object.entries(x.ma).filter(([, m]) => m >= 500).map(([d]) => d);
  console.log(`   ${x.ten.padEnd(24)} ${sap.length ? '⚠ SẬP: ' + sap.join(', ') : 'không cửa nào sập'}`);
}
ok('W1/W2 (cách ghi THẬT của SQLite và D1) — không cửa nào sập',
   thieuCot.filter(x => x.nenNuot).every(x => Object.values(x.ma).every(m => m < 500)),
   'W1 + W2 đều nuốt đúng');

const w5 = ketQua.find(x => x.ten.startsWith('W5'));
const w5Sap = Object.entries(w5.ma).filter(([, m]) => m >= 500).map(([d]) => d);
console.log(`\n   W5 (giả định Cloudflare ĐỔI CÂU CHỮ) → sập ${w5Sap.length}/5 cửa: ${w5Sap.join(', ') || 'không'}`);

console.log('\n--- ③ ĐĂNG NHẬP có sống độc lập không? ---');
ok('/api/toi-la-ai (docPhien, đường phòng thủ RIÊNG) sống ở MỌI cách ghi lỗi',
   ketQua.every(x => x.ma['/api/toi-la-ai'] === 200),
   ketQua.map(x => x.ten.slice(0, 2) + ':' + x.ma['/api/toi-la-ai']).join(' '));

/* ---- ④ Cửa sổ "mã mới, DB chưa migration" — KHÔNG bơm lỗi, thiếu cột THẬT ---- */
console.log('\n=== ④ CỬA SỔ THẬT: THIẾU CỘT, KHÔNG BƠM GÌ ========================\n');
{
  const r = await doMotCachGhi(null, true);
  console.log('   ' + Object.entries(r.ma).map(([d, m]) => d.replace('/api/', '') + '=' + m).join(' · '));
  ok('Thiếu cột THẬT: không cửa nào sập (500)', Object.values(r.ma).every(m => m < 500),
     Object.values(r.ma).join(','));
  ok('Thiếu cột THẬT: danh bạ + quản trị + đăng nhập vẫn 200',
     r.ma['/api/danh-ba'] === 200 && r.ma['/api/quan-tri/danh-sach'] === 200 && r.ma['/api/toi-la-ai'] === 200);
  ok('Thiếu cột THẬT: vẫn CẤP được tài khoản (không chặn vì lý do kỹ thuật)',
     r.ma['/api/quan-tri/tao-tai-khoan'] === 200, 'HTTP ' + r.ma['/api/quan-tri/tao-tai-khoan']);
  ok('Thiếu cột THẬT: sửa vị trí trả 409 nói rõ lý do (không phải 500)',
     r.ma['/api/quan-tri/sua-vai-tro'] === 409, 'HTTP ' + r.ma['/api/quan-tri/sua-vai-tro']);
}

/* ---- ⑤ Dấu thời gian ghi vết — so với GIỜ VIỆT NAM thật ---- */
console.log('\n=== ⑤ DẤU THỜI GIAN GHI VẾT (vá ②) ================================\n');
{
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(SRC, 'index.js')).href + `?v=${Math.random()}`)).default;
  const tk = await taoPhienThat(env, 1);
  await goiAPI(worker, env, '/api/quan-tri/sua-vai-tro', tk, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tai_khoan_id: 2, vi_tri_cong_viec: 'nhan_vien_kho' }) });
  const d = db.prepare("SELECT loai_su_kien, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien_id, luc FROM nhan_su_lich_su WHERE loai_su_kien='doi_vai_tro'").get();
  const utc = db.prepare("SELECT datetime('now') AS t").get().t;
  const vn  = db.prepare("SELECT datetime('now','+7 hours') AS t").get().t;
  console.log('   dòng ghi vết : ' + JSON.stringify(d));
  console.log('   giờ UTC      : ' + utc);
  console.log('   giờ VN (+7)  : ' + vn);
  ok('Dấu thời gian ghi vết KHỚP GIỜ VIỆT NAM, không phải UTC',
     d && d.luc.slice(0, 16) === vn.slice(0, 16), 'ghi=' + (d && d.luc) + ' · VN=' + vn);
  ok('Ghi vết có ĐỦ cũ → mới → ai → lúc nào',
     !!(d && d.gia_tri_cu !== undefined && d.gia_tri_moi && d.nguoi_thuc_hien_id && d.luc),
     `cũ=${d && JSON.stringify(d.gia_tri_cu)} mới=${d && d.gia_tri_moi} ai=${d && d.nguoi_thuc_hien_id}`);
  db.close?.();
}

process.exit(tongKet() ? 0 : 1);
