/* ==========================================================================
   HỒ LY — ĐO ĐỘC LẬP 24 TỔ HỢP, BẰNG ĐỊNH NGHĨA CỦA HỒ LY
   ---------------------------------------------------------------------------
   Khỉ Đột định nghĩa "nguy hiểm" = phép hợp đẻ ra quyền mà KHÔNG ô nào tự có.
   Đó là định nghĩa DỄ và nó tự đặt. Bàn đo này KHÔNG dùng định nghĩa đó.

   ĐỊNH NGHĨA CỦA HỒ LY — "nguy hiểm" là tổ hợp tạo ra MỘT CON NGƯỜI mà
   nghiệp vụ không muốn tồn tại, kể cả khi mọi quyền của người đó đều đến
   hợp lệ từ một trong hai ô:

     N1  VỪA CẤP ĐƯỢC DANH TÍNH VỪA XEM ĐƯỢC LƯƠNG (taoTk && luong)
         — người tạo tài khoản mà cũng thấy bảng lương là mất ranh giới
           kiểm soát nội bộ cơ bản nhất.
     N2  ÔM CẢ BA CHẶNG LUỒNG TIỀN đơn hoàn: thao tác kho + thao tác vận
         hành sàn + tab kế toán. Vừa làm vừa duyệt trên cùng một luồng tiền.
     N3  HCNS CHẠM ĐƯỢC LƯƠNG bằng bất kỳ đường nào.
     N4  MỞ ĐƯỢC NHÓM TÀI LIỆU 'nhan_su' (hợp đồng lao động, CCCD) mà không
         phải admin/hcns.
     N5  TỰ NÂNG QUYỀN QUA API — đo THẬT, gọi thẳng worker.fetch().

   Chạy: node scripts/holy-do-24-tohop.mjs
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');
datDongHo('2026-09-04T03:00:00Z');

const q = await import(pathToFileURL(path.join(SRC, 'quyen.js')).href);

/* ---------- PHẦN A — TOÁN QUYỀN TRÊN 24 TỔ HỢP ------------------------- */

const O1 = q.VAI_TRO_HE_THONG;
const O2 = ['', ...q.VI_TRI_CONG_VIEC];

function anh(chuThe) {
  const c = q.quyenCua(chuThe);
  return {
    tab: c.tab, luong: c.xem_luong === true, admin: c.admin === true,
    themNs: c.them_nhan_su === true,
    taoTk: q.duocTaoTaiKhoan(chuThe),
    datViTri: q.duocDatViTriCongViec(chuThe),
    kho: q.quyenKho(chuThe),
    vanHanh: q.duocThaoTacVanHanh(chuThe),
    shopee: q.quyenShopee(chuThe),
    tlXem: q.nhomTaiLieuXemDuoc(chuThe),
    tlLuu: q.nhomTaiLieuLuuDuoc(chuThe),
    taiSan: q.duocQuanLyTaiSan(chuThe)
  };
}

const bang = [];
for (const a of O1) for (const b of O2) bang.push({ a, b, q: anh({ vai_tro: a, vi_tri_cong_viec: b }) });

console.log('\n=== BẢNG 24 TỔ HỢP (đo lại từ đầu) =====================================\n');
console.log('ô1'.padEnd(14) + 'ô2'.padEnd(17) + 'tab  lương admin themNs taoTk kho.tt vh  ketoan nhân-sự-TL');
for (const r of bang) {
  const t = r.q;
  console.log(
    r.a.padEnd(14) + (r.b || '(chưa gán)').padEnd(17) +
    String(t.tab.length).padEnd(5) +
    String(t.luong).padEnd(6) + String(t.admin).padEnd(6) + String(t.themNs).padEnd(7) +
    String(t.taoTk).padEnd(6) + String(t.kho.thao_tac).padEnd(7) +
    String(t.vanHanh).padEnd(4) + String(t.tab.includes('ketoan')).padEnd(7) +
    String(t.tlXem.includes('nhan_su')));
}
console.log('\nSố tổ hợp: ' + bang.length);
ok('Đúng 24 tổ hợp (3 ô1 × 8 ô2)', bang.length === 24, bang.length + ' tổ hợp');

/* ---- N1 — vừa cấp danh tính vừa xem lương ---- */
const n1 = bang.filter(r => r.q.taoTk && r.q.luong);
console.log('\n[N1] Vừa TẠO ĐƯỢC TÀI KHOẢN vừa XEM ĐƯỢC LƯƠNG:');
n1.forEach(r => console.log('   ⚠ ' + r.a + ' + ' + (r.b || '(chưa gán)')));
if (!n1.length) console.log('   (không có)');

/* ---- N2 — ôm cả ba chặng luồng tiền đơn hoàn ---- */
const n2 = bang.filter(r => r.q.kho.thao_tac && r.q.vanHanh && r.q.tab.includes('ketoan'));
console.log('\n[N2] Ôm CẢ BA chặng luồng đơn hoàn (kho + vận hành sàn + kế toán):');
n2.forEach(r => console.log('   ⚠ ' + r.a + ' + ' + (r.b || '(chưa gán)')));
if (!n2.length) console.log('   (không có)');

/* ---- N3 — HCNS chạm lương ---- */
const n3 = bang.filter(r => (r.a === 'hcns' || r.b === 'hcns') && r.q.luong);
ok('[N3] KHÔNG tổ hợp nào có hcns mà xem được lương', n3.length === 0,
   n3.map(r => r.a + '+' + r.b).join(', ') || 'sạch');

/* ---- N4 — nhóm tài liệu nhân sự ---- */
const n4 = bang.filter(r => r.q.tlXem.includes('nhan_su'));
console.log('\n[N4] Mở được nhóm tài liệu NHÂN SỰ (hợp đồng lao động, CCCD):');
n4.forEach(r => console.log('   · ' + r.a + ' + ' + (r.b || '(chưa gán)')));
const n4La = n4.every(r => r.a === 'admin' || r.b === 'hcns' || r.a === 'hcns');
ok('[N4] Chỉ admin (ô1) hoặc hcns (ô2) mở được giấy tờ nhân sự', n4La,
   n4.length + ' tổ hợp, đều hợp lệ: ' + n4La);

/* ---- Ai LƯU được vào nhóm nhân sự ---- */
const n4b = bang.filter(r => r.q.tlLuu.includes('nhan_su'));
console.log('\n[N4b] LƯU được vào nhóm tài liệu NHÂN SỰ:');
n4b.forEach(r => console.log('   · ' + r.a + ' + ' + (r.b || '(chưa gán)')));

/* ---- Ai ĐẶT ĐƯỢC VỊ TRÍ cho người khác ---- */
console.log('\n[N5-tiền đề] Đặt được VỊ TRÍ CÔNG VIỆC cho người khác:');
bang.filter(r => r.q.datViTri).forEach(r => console.log('   · ' + r.a + ' + ' + (r.b || '(chưa gán)')));

/* ---------- PHẦN B — TẤN CÔNG THẬT QUA API ----------------------------- */

const NGUOI = [
  ['SEP',   'Bùi Thị Ngọc',     'admin',       null],
  ['KE',    'Kẻ tấn công',      'nguoi_dung',  null],   // id 2 — bị gán 24 tổ hợp
  ['NAN',   'Nạn nhân',         'nguoi_dung',  null],   // id 3 — mục tiêu
  ['TRONG', 'Nhân sự chưa có TK','nguoi_dung', null]    // id 4 — chỉ hồ sơ, chưa có tài khoản
];

function moi(db, o1, o2) {
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam, luong) VALUES (?,?,?,?,?,1,?)');
  const tk = db.prepare(`INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro,
                          vi_tri_cong_viec, kich_hoat, phai_doi_mk) VALUES (?,?,?,?,?,?,1,0)`);
  NGUOI.forEach(([id, ten, vt, vi], i) => {
    ns.run(id, ten, id.slice(0, 2), 'Chức vụ', 'Bộ phận', 12345678);
    if (id !== 'TRONG') tk.run(i + 1, id, 'tk' + id.toLowerCase(), 'pbkdf2$1$x$x',
                               id === 'KE' ? o1 : vt, id === 'KE' ? (o2 || null) : vi);
  });
}

async function tanCong(o1, o2) {
  const { db, d1 } = dungDB();
  moi(db, o1, o2);
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(SRC, 'index.js')).href + `?v=${Math.random()}`)).default;
  const tk = await taoPhienThat(env, 2);          // phiên của KẺ TẤN CÔNG
  const P = (d, body) => goiAPI(worker, env, d, tk, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const G = (d) => goiAPI(worker, env, d, tk);

  const r = {};
  // b1 — tạo tài khoản mới, gán thẳng vị trí CÓ LƯƠNG
  r.taoKemLuong = (await P('/api/quan-tri/tao-tai-khoan',
    { nhan_su_id: 'TRONG', ten_dang_nhap: 'tkmoi1', vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'ke_toan_truong' })).status;
  // b2 — nhét 'admin' vào Ô 2
  r.adminVaoO2 = (await P('/api/quan-tri/tao-tai-khoan',
    { nhan_su_id: 'TRONG', ten_dang_nhap: 'tkmoi2', vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'admin' })).status;
  // b3 — nhét mã VỊ TRÍ vào Ô 1 (dựng lại lỗi cũ)
  r.viTriVaoO1 = (await P('/api/quan-tri/tao-tai-khoan',
    { nhan_su_id: 'TRONG', ten_dang_nhap: 'tkmoi3', vai_tro: 'ke_toan_truong' })).status;
  // b4 — tạo tài khoản thường (được hay không)
  r.taoThuong = (await P('/api/quan-tri/tao-tai-khoan',
    { nhan_su_id: 'TRONG', ten_dang_nhap: 'tkmoi4', vai_tro: 'nguoi_dung' })).status;
  // b5 — TỰ đặt mình thành kế toán trưởng
  r.tuDatLuong = (await P('/api/quan-tri/sua-vai-tro',
    { tai_khoan_id: 2, vi_tri_cong_viec: 'ke_toan_truong' })).status;
  // b6 — TỰ nâng ô 1 lên admin
  r.tuNangAdmin = (await P('/api/quan-tri/sua-vai-tro', { tai_khoan_id: 2, vai_tro: 'admin' })).status;
  // b7 — gán lương cho NGƯỜI KHÁC (rồi nhờ người đó xem hộ)
  r.traoLuongNguoiKhac = (await P('/api/quan-tri/sua-vai-tro',
    { tai_khoan_id: 3, vi_tri_cong_viec: 'ke_toan_truong' })).status;
  // b8 — nhét 'admin' vào ô 2 của người khác
  r.adminVaoO2NguoiKhac = (await P('/api/quan-tri/sua-vai-tro',
    { tai_khoan_id: 3, vi_tri_cong_viec: 'admin' })).status;
  // b9 — nâng người khác lên admin
  r.nangNguoiKhacAdmin = (await P('/api/quan-tri/sua-vai-tro', { tai_khoan_id: 3, vai_tro: 'admin' })).status;
  // b10 — ĐỌC THẬT: có thấy cột lương trong /api/nhan-su không
  const ns = await G('/api/nhan-su');
  r.nsStatus = ns.status;
  r.thayLuong = ns.status === 200 && (ns.than?.nhan_su || []).some(x => x.luong !== undefined);
  r.coLuongFlag = ns.than?.xem_luong;
  // b11 — kho tài liệu nhóm NHÂN SỰ
  const tl = await G('/api/tai-lieu?nhom=nhan_su');
  r.tlNhanSu = tl.status;
  // b12 — sau mọi cú trên, KIỂM LẠI quyền thật của kẻ tấn công
  const ai = await G('/api/toi-la-ai');
  r.cuoiLuong = ai.than?.than?.xem_luong ?? ai.than?.xem_luong;
  r.cuoiO1 = ai.than?.than?.vai_tro ?? ai.than?.vai_tro;
  r.cuoiO2 = ai.than?.than?.vi_tri_cong_viec ?? ai.than?.vi_tri_cong_viec;
  db.close?.();
  return r;
}

console.log('\n=== PHẦN B — TẤN CÔNG THẬT QUA API, ĐỦ 24 TỔ HỢP =====================\n');
console.log('ô1+ô2'.padEnd(30) + 'tạo+lương adminÔ2 vịtríÔ1 tựlương tựadmin traolương  thấyLương');
const thung = [];
for (const { a, b } of bang) {
  const r = await tanCong(a, b);
  thung.push({ a, b, r });
  console.log((a + '+' + (b || '—')).padEnd(30) +
    String(r.taoKemLuong).padEnd(10) + String(r.adminVaoO2).padEnd(8) +
    String(r.viTriVaoO1).padEnd(9) + String(r.tuDatLuong).padEnd(8) +
    String(r.tuNangAdmin).padEnd(7) + String(r.traoLuongNguoiKhac).padEnd(10) +
    String(r.thayLuong));
}

const laAdminThat = (a) => a === 'admin';
const xau = [];
for (const { a, b, r } of thung) {
  const ad = laAdminThat(a);
  if (!ad && r.taoKemLuong === 200) xau.push(`${a}+${b}: TẠO được tài khoản kèm vị trí CÓ LƯƠNG (200)`);
  if (r.adminVaoO2 === 200) xau.push(`${a}+${b}: nhét 'admin' vào Ô 2 lúc TẠO lọt (200)`);
  if (r.viTriVaoO1 === 200) xau.push(`${a}+${b}: nhét mã VỊ TRÍ vào Ô 1 lúc TẠO lọt (200)`);
  if (!ad && r.tuDatLuong === 200) xau.push(`${a}+${b}: TỰ đặt mình thành kế toán trưởng (200)`);
  if (!ad && r.tuNangAdmin === 200) xau.push(`${a}+${b}: TỰ nâng mình lên admin (200)`);
  if (!ad && r.traoLuongNguoiKhac === 200) xau.push(`${a}+${b}: TRAO vị trí có lương cho người khác (200)`);
  if (r.adminVaoO2NguoiKhac === 200) xau.push(`${a}+${b}: nhét 'admin' vào Ô 2 người khác (200)`);
  if (!ad && r.nangNguoiKhacAdmin === 200) xau.push(`${a}+${b}: nâng người khác lên admin (200)`);
  // thấy lương mà bảng quyền bảo KHÔNG được thấy → rò
  const nen = anh({ vai_tro: a, vi_tri_cong_viec: b }).luong;
  if (r.thayLuong && !nen) xau.push(`${a}+${b}: ĐỌC ĐƯỢC cột lương mà bảng quyền nói không`);
  if (!r.thayLuong && nen && r.nsStatus === 200) xau.push(`${a}+${b}: MẤT quyền xem lương đáng có`);
}

console.log('\n=== KẾT LUẬN PHẦN B ==================================================\n');
ok('Không tổ hợp nào tự nâng quyền / trao lương / lách hai ô qua API', xau.length === 0,
   xau.length ? '\n   ' + xau.join('\n   ') : 'sạch cả 24 tổ hợp × 12 mũi = 288 phép');

/* ---- CHUỖI HAI BƯỚC: admin_backup tạo tài khoản rồi CỐ gán lương ---- */
console.log('\n=== CHUỖI HAI BƯỚC (admin_backup + ke_toan_truong) ===================\n');
{
  const { db, d1 } = dungDB();
  moi(db, 'admin_backup', 'ke_toan_truong');
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(SRC, 'index.js')).href + `?v=${Math.random()}`)).default;
  const tk = await taoPhienThat(env, 2);
  const P = (d, body) => goiAPI(worker, env, d, tk, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const b1 = await P('/api/quan-tri/tao-tai-khoan',
    { nhan_su_id: 'TRONG', ten_dang_nhap: 'tkbay', vai_tro: 'nguoi_dung' });
  ok('Bước 1: admin_backup TẠO được tài khoản thường', b1.status === 200, 'HTTP ' + b1.status);
  const idMoi = db.prepare("SELECT id FROM tai_khoan WHERE ten_dang_nhap='tkbay'").get()?.id;
  const b2 = await P('/api/quan-tri/sua-vai-tro', { tai_khoan_id: idMoi, vi_tri_cong_viec: 'ke_toan_truong' });
  ok('Bước 2: gán vị trí CÓ LƯƠNG cho tài khoản vừa tạo → CHẶN', b2.status === 403,
     'HTTP ' + b2.status + ' — ' + (b2.than?.loi || ''));
  const b3 = await P('/api/quan-tri/sua-vai-tro', { tai_khoan_id: idMoi, vai_tro: 'admin_backup' });
  ok('Bước 2b: nâng tài khoản vừa tạo lên admin_backup → CHẶN', b3.status === 403,
     'HTTP ' + b3.status + ' — ' + (b3.than?.loi || ''));
  const sau = db.prepare('SELECT vai_tro, vi_tri_cong_viec FROM tai_khoan WHERE id=?').get(idMoi);
  ok('Tài khoản mới KHÔNG mang vị trí có lương trong DB', sau.vi_tri_cong_viec == null,
     JSON.stringify(sau));
  db.close?.();
}

/* ---- HCNS: mọi đường vòng tới lương ---- */
console.log('\n=== HCNS — MỌI ĐƯỜNG VÒNG TỚI LƯƠNG ==================================\n');
{
  const { db, d1 } = dungDB();
  moi(db, 'nguoi_dung', 'hcns');
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(SRC, 'index.js')).href + `?v=${Math.random()}`)).default;
  const tk = await taoPhienThat(env, 2);
  const P = (d, body) => goiAPI(worker, env, d, tk, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const G = (d) => goiAPI(worker, env, d, tk);

  ok('HCNS KHÔNG cấp được tài khoản', (await P('/api/quan-tri/tao-tai-khoan',
    { nhan_su_id: 'TRONG', ten_dang_nhap: 'tkhc', vai_tro: 'nguoi_dung' })).status === 403);
  ok('HCNS KHÔNG tự đặt mình thành kế toán trưởng',
    (await P('/api/quan-tri/sua-vai-tro', { tai_khoan_id: 2, vi_tri_cong_viec: 'ke_toan_truong' })).status === 403);
  ok('HCNS KHÔNG trao vị trí có lương cho người khác',
    (await P('/api/quan-tri/sua-vai-tro', { tai_khoan_id: 3, vi_tri_cong_viec: 'ke_toan_truong' })).status === 403);
  const ns = await G('/api/nhan-su');
  ok('HCNS đọc /api/nhan-su KHÔNG có cột lương',
    ns.status === 200 && !(ns.than?.nhan_su || []).some(x => x.luong !== undefined),
    'HTTP ' + ns.status + ' · xem_luong=' + ns.than?.xem_luong);
  const them = await P('/api/quan-tri/them-nhan-su',
    { ho_ten: 'Người mới', chuc_vu: 'NV', bo_phan: 'Kho', luong: '99000000' });
  ok('HCNS THÊM nhân sự được (đúng thiết kế)', them.status === 200, 'HTTP ' + them.status);
  const luongGhi = db.prepare("SELECT luong FROM nhan_su WHERE ho_ten='Người mới'").get()?.luong;
  ok('…nhưng lương HCNS gửi lên bị máy chủ ép NULL', luongGhi == null, 'luong = ' + luongGhi);
  const ls = await G('/api/nhan-su/lich-su?id=NAN');
  ok('HCNS đọc /api/nhan-su/lich-su KHÔNG rò lương',
    !JSON.stringify(ls.than || {}).includes('12345678'), 'HTTP ' + ls.status);
  const db2 = await G('/api/danh-ba');
  ok('HCNS đọc /api/danh-ba KHÔNG rò lương',
    !JSON.stringify(db2.than || {}).includes('12345678'), 'HTTP ' + db2.status);
  db.close?.();
}

process.exit(tongKet() ? 0 : 1);
