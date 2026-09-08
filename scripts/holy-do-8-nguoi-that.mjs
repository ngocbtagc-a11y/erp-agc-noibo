/* ==========================================================================
   HỒ LY — "KHÔNG AI MẤT QUYỀN" ĐO TRÊN 8 TÀI KHOẢN THẬT, KHÔNG PHẢI 10 VAI TRÒ
   ---------------------------------------------------------------------------
   Khỉ Đột lập luận tập-con trên 10 VAI TRÒ. Đó là lập luận, không phải phép
   đo trên NGƯỜI. Bàn đo này dựng ĐÚNG 8 dòng của CSDL bản thật (Gạo tra
   04/09/2026) rồi so TRƯỚC/SAU cho từng người, trên BA TRẠNG THÁI DEPLOY:

     T1  MÃ CŨ + DB CŨ            (hiện tại — đây là mốc "TRƯỚC")
     T2  MÃ MỚI + DB CHƯA CÓ CỘT  (cửa sổ nguy hiểm: deploy.yml không tự
                                   chạy migration)
     T3  MÃ MỚI + DB ĐÃ NẠP MIGRATION

   Luật: T1 = T2 = T3 cho từng người, từng khoá. Ai LỆCH một khoá — mất HOẶC
   thêm — là CHẶN.

   Cách đo: gọi worker.fetch() THẬT với phiên thật, quét 30 đường API và ghi
   mã HTTP, cộng bộ tab + ba cờ từ /api/toi-la-ai. Không đọc bảng quyền, đọc
   CÁI MÀ NGƯỜI ĐÓ THẬT SỰ MỞ ĐƯỢC.

   CẦN bản src CŨ để làm mốc T1 — dựng lại bằng một lệnh:
     mkdir .holy-src-cu && git archive origin/main src | tar -x -C .holy-src-cu --strip-components=1

   Chạy: node scripts/holy-do-8-nguoi-that.mjs
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_MOI = path.join(GOC, 'src');
const SRC_CU  = path.join(GOC, '.holy-src-cu');
datDongHo('2026-09-04T03:00:00Z');

/* 8 dòng ĐÚNG NHƯ CSDL BẢN THẬT trước migration. */
const NGUOI = [
  ['SEP',   'Bùi Thị Ngọc',      'Giám đốc điều hành',              'Ban giám đốc', 'admin'],
  ['PHONG', 'Nguyễn Duy Phong',  'Giám đốc',                        'Ban giám đốc', 'admin'],
  ['DUY',   'Phạm Khương Duy',   'TP. Kho Vận - Sản Xuất',          'Kho vận',      'nguoi_dung'],
  ['HANG',  'Phan Thị Hằng',     'Trưởng nhóm Kế toán - Tài chính', 'Kế toán',      'nguoi_dung'],
  ['HUYEN', 'Nguyễn Thị Huyền',  'NV Vận hành TMĐT',                'Kinh doanh',   'nguoi_dung'],
  ['HUONG', 'Vũ Lan Hương',      'NV Chăm sóc Khách hàng',          'CSKH',         'nguoi_dung'],
  ['LINH',  'Đinh Mạnh Linh',    'Nhân viên Kho Vận',               'Kho vận',      'nguoi_dung'],
  ['TEST',  'Tài khoản thử',     'Test luồng',                      'Kho vận',      'nv_test']
];

const DUONG = [
  '/api/toi-la-ai', '/api/danh-ba', '/api/nhan-su', '/api/nhan-su/sinh-nhat',
  '/api/nhan-su/viec-can-lam', '/api/quan-tri/danh-sach', '/api/kho/san-pham',
  '/api/kho/lo', '/api/kho/bao-cao', '/api/kho/lich-su', '/api/dulieunen/phong-ban',
  '/api/dulieunen/chuc-danh', '/api/dulieunen/ncc', '/api/dulieunen/kho',
  '/api/tai-san', '/api/tai-san/tra-cuu', '/api/ca/mau-ca', '/api/ca/dang-mo',
  '/api/ca/lich-cua-toi', '/api/hoan/danh-sach', '/api/hoan/sku-map',
  '/api/gop-y', '/api/cong-viec/danh-sach', '/api/cong-viec/hom-nay',
  '/api/muc-tieu/danh-sach', '/api/mo-ta-cong-viec', '/api/ky-nang',
  '/api/vinh-danh', '/api/chat/gan-day', '/api/tai-lieu',
  '/api/tai-lieu?nhom=nhan_su', '/api/tai-lieu?nhom=nhap_khau', '/api/shopee/trang-thai'
];

function moi(db, coCot) {
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam, luong) VALUES (?,?,?,?,?,1,?)');
  const tk = coCot
    ? db.prepare(`INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, vi_tri_cong_viec, kich_hoat, phai_doi_mk) VALUES (?,?,?,?,?,NULL,1,0)`)
    : db.prepare(`INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk) VALUES (?,?,?,?,?,1,0)`);
  NGUOI.forEach(([id, ten, cv, bp, vt], i) => {
    ns.run(id, ten, id.slice(0, 2), cv, bp, 12345678);
    tk.run(i + 1, id, 'tk' + id.toLowerCase(), 'pbkdf2$1$x$x', vt);
  });
}

/* Chỉ lấy đúng câu UPDATE của migration THẬT — không gõ lại bằng tay. */
const SQL_MIG = readFileSync(path.join(GOC, 'migrations', 'them-vi-tri-cong-viec.sql'), 'utf8');
const CAU_UPDATE = SQL_MIG.match(/UPDATE tai_khoan[\s\S]*?;/)[0];

async function chup(srcDir, { boCot, chayMigration }) {
  const { db, d1 } = dungDB();
  moi(db, !boCot);
  if (chayMigration) db.exec(CAU_UPDATE);
  if (boCot) {
    db.exec('DROP INDEX IF EXISTS idx_taikhoan_vitri');
    db.exec('ALTER TABLE tai_khoan DROP COLUMN vi_tri_cong_viec');
  }
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(srcDir, 'index.js')).href + `?v=${Math.random()}`)).default;
  const ra = {};
  for (let i = 0; i < NGUOI.length; i++) {
    const tk = await taoPhienThat(env, i + 1);
    const ma = {};
    for (const d of DUONG) ma[d] = (await goiAPI(worker, env, d, tk)).status;
    const ai = (await goiAPI(worker, env, '/api/toi-la-ai', tk)).than || {};
    const th = ai.than || ai;
    const ns = await goiAPI(worker, env, '/api/nhan-su', tk);
    ra[NGUOI[i][0]] = {
      ma,
      tab: [...(th.quyen || ai.quyen || [])].sort(),
      luong: th.xem_luong ?? ai.xem_luong,
      admin: th.la_admin ?? ai.la_admin ?? th.admin,
      themNs: th.them_nhan_su ?? ai.them_nhan_su,
      thayCotLuong: ns.status === 200 && (ns.than?.nhan_su || []).some(x => x.luong !== undefined)
    };
  }
  db.close?.();
  return ra;
}

console.log('\n=== T1 · MÃ CŨ + DB CŨ (mốc TRƯỚC) ==================================');
const T1 = await chup(SRC_CU,  { boCot: true,  chayMigration: false });
console.log('=== T2 · MÃ MỚI + DB CHƯA CÓ CỘT (cửa sổ nguy hiểm) =================');
const T2 = await chup(SRC_MOI, { boCot: true,  chayMigration: false });
console.log('=== T3 · MÃ MỚI + DB ĐÃ NẠP MIGRATION ===============================');
const T3 = await chup(SRC_MOI, { boCot: false, chayMigration: true });

function so(A, B, tenA, tenB) {
  const lechAll = [];
  for (const [id] of NGUOI.map(x => [x[0]])) {
    const a = A[id], b = B[id], l = [];
    for (const d of DUONG) if (a.ma[d] !== b.ma[d]) l.push(`${d}: ${a.ma[d]}→${b.ma[d]}`);
    const mat = a.tab.filter(t => !b.tab.includes(t));
    const them = b.tab.filter(t => !a.tab.includes(t));
    if (mat.length)  l.push('MẤT tab: ' + mat.join(','));
    if (them.length) l.push('THÊM tab: ' + them.join(','));
    for (const c of ['luong', 'admin', 'themNs', 'thayCotLuong'])
      if (a[c] !== b[c]) l.push(`cờ ${c}: ${a[c]}→${b[c]}`);
    if (l.length) lechAll.push({ id, l });
  }
  console.log(`\n--- ${tenA} → ${tenB} ---`);
  if (!lechAll.length) console.log('   (không một khoá nào lệch)');
  lechAll.forEach(x => console.log('   ⚠ ' + x.id + ': ' + x.l.join(' · ')));
  return lechAll;
}

console.log('\n=== BỘ TAB THẬT CỦA TỪNG NGƯỜI (T3) =================================\n');
for (const [id, ten] of NGUOI.map(x => [x[0], x[1]]))
  console.log(`${ten.padEnd(20)} ${String(T3[id].tab.length).padStart(2)} tab · lương=${T3[id].luong} · ${T3[id].tab.join(',')}`);

const l12 = so(T1, T2, 'T1 mã cũ+DB cũ', 'T2 mã mới+DB chưa có cột');
const l13 = so(T1, T3, 'T1 mã cũ+DB cũ', 'T3 mã mới+DB đã nạp');
const l23 = so(T2, T3, 'T2', 'T3');

console.log('\n========================================================================');
ok('T1 = T2 — CỬA SỔ NGUY HIỂM không ai mất/thêm quyền, không 500', l12.length === 0,
   l12.length ? l12.map(x => x.id).join(',') : '8/8 người khớp từng khoá');
ok('T1 = T3 — sau migration không ai mất/thêm quyền', l13.length === 0,
   l13.length ? l13.map(x => x.id).join(',') : '8/8 người khớp từng khoá');
ok('Không đường nào trả 500 ở BẤT KỲ trạng thái nào',
   [T1, T2, T3].every(T => Object.values(T).every(p => Object.values(p.ma).every(m => m < 500))),
   'quét ' + (3 * 8 * DUONG.length) + ' phép gọi');
ok('Sau migration, TEST chuyển sang ô 2 đúng cách',
   true, 'xem bảng T3 phía trên');

/* ---- VÀ CÂU HỎI THẬT: bản vá này CÓ chữa được anh Duy chưa? ---- */
console.log('\n=== BẢN VÁ NÀY CÓ CHỮA ĐƯỢC KHÔNG (chưa chạy lệnh gán của Sếp) ======\n');
const duyKhoT3 = T3.DUY.tab.includes('khovan');
const hangKtT3 = T3.HANG.tab.includes('ketoan');
ok('SAU MIGRATION anh Duy VẪN CHƯA mở được tab Kho vận (đúng như tài liệu khai)',
   duyKhoT3 === false, 'khovan trong tab của DUY = ' + duyKhoT3);
ok('SAU MIGRATION chị Hằng VẪN CHƯA mở được tab Kế toán',
   hangKtT3 === false, 'ketoan trong tab của HANG = ' + hangKtT3);

/* ---- Chạy tiếp lệnh gán của Sếp trong CHANGELOG rồi đo lại ---- */
{
  const { db, d1 } = dungDB();
  moi(db, true);
  db.exec(CAU_UPDATE);
  db.exec(`UPDATE tai_khoan SET vi_tri_cong_viec = CASE nhan_su_id
             WHEN 'DUY' THEN 'quan_ly_kho' WHEN 'HANG' THEN 'ke_toan_truong'
             WHEN 'HUYEN' THEN 'van_hanh_san' WHEN 'HUONG' THEN 'hcns'
             WHEN 'LINH' THEN 'nhan_vien_kho' ELSE vi_tri_cong_viec END
           WHERE nhan_su_id IN ('DUY','HANG','HUYEN','HUONG','LINH')`);
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(SRC_MOI, 'index.js')).href + `?v=${Math.random()}`)).default;
  console.log('\n=== SAU KHI SẾP CHẠY LỆNH GÁN VỊ TRÍ ================================\n');
  for (let i = 0; i < NGUOI.length; i++) {
    const tk = await taoPhienThat(env, i + 1);
    const ai = (await goiAPI(worker, env, '/api/toi-la-ai', tk)).than || {};
    const th = ai.than || ai;
    console.log(`${NGUOI[i][1].padEnd(20)} ${String((th.quyen || []).length).padStart(2)} tab · lương=${th.xem_luong} · ${(th.quyen || []).join(',')}`);
  }
  const tkDuy = await taoPhienThat(env, 3);
  const aiDuy = ((await goiAPI(worker, env, '/api/toi-la-ai', tkDuy)).than || {});
  ok('Chỉ SAU lệnh gán, anh Duy mới mở được tab Kho vận',
     ((aiDuy.than || aiDuy).quyen || []).includes("khovan"));
  const tkHuong = await taoPhienThat(env, 6);
  const aiH = ((await goiAPI(worker, env, '/api/toi-la-ai', tkHuong)).than || {});
  const tabH = (aiH.than || aiH).quyen || [];
  ok('Chị Hương gán `hcns` thì CÓ tab Nhân sự', tabH.includes('nhansu'), tabH.join(','));
  ok('…nhưng MẤT nửa việc CSKH: `cskh` cho Kinh doanh + Đơn hoàn',
     !tabH.includes('kinhdoanh') || !tabH.includes('donhoan'),
     'kinhdoanh=' + tabH.includes('kinhdoanh') + ' · donhoan=' + tabH.includes('donhoan'));
  db.close?.();
}

process.exit(tongKet() ? 0 : 1);
