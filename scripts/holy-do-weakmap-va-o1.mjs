/* HỒ LY — soi ba chỗ tinh tế:
   ① WeakMap nhớ "đã có cột chưa" — hai CSDL có dùng chung câu trả lời không,
      và lỗi DB TẠM THỜI (không phải thiếu cột) bị nuốt thành "chưa có cột"?
   ② Ô 1 DUNG THỨ mã vị trí — câu "không vị trí nào mang cờ nguy hiểm" đúng?
   ③ Danh sách vị trí trong migration khớp mã?                               */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');
datDongHo('2026-09-04T03:00:00Z');

const q = await import(pathToFileURL(path.join(SRC, 'quyen.js')).href);
const auth = await import(pathToFileURL(path.join(SRC, 'auth.js')).href);

/* ---------- ② Ô 1 dung thứ mã vị trí — quét TOÀN BỘ bảng quyền ---------- */
console.log('\n=== ② Ô 1 DUNG THỨ MÃ VỊ TRÍ — CỜ NGUY HIỂM NÀO ĐI KÈM? ==========\n');
console.log('vị trí'.padEnd(18) + 'admin  xem_luong  them_nhan_su');
const coCo = { admin: [], xem_luong: [], them_nhan_su: [] };
for (const v of q.VI_TRI_CONG_VIEC) {
  const c = q.quyenCua(v);
  console.log(v.padEnd(18) + String(c.admin === true).padEnd(7) +
              String(c.xem_luong === true).padEnd(11) + String(c.them_nhan_su === true));
  for (const k of Object.keys(coCo)) if (c[k] === true) coCo[k].push(v);
}
console.log('\nVị trí mang cờ admin        : ' + (coCo.admin.join(', ') || '(không có)'));
console.log('Vị trí mang cờ xem_luong    : ' + (coCo.xem_luong.join(', ') || '(không có)'));
console.log('Vị trí mang cờ them_nhan_su : ' + (coCo.them_nhan_su.join(', ') || '(không có)'));

ok('KHÔNG vị trí nào mang cờ `admin` — ô 1 dung thứ thì KHÔNG phong được Admin',
   coCo.admin.length === 0, 'mang admin: ' + (coCo.admin.join(',') || 'không ai'));

/* Câu hỏi thật: để mã vị trí ở ô 1 có cấp quyền gì KHÔNG ĐÁNG CẤP không?
   Trả lời bằng phép so: `boVaiTro({vai_tro: <vị trí>})` phải ra ĐÚNG BẰNG
   `boVaiTro(<vị trí>)` — tức đúng bằng HÀNH VI CŨ, không hơn một khoá. */
const anh = (x) => JSON.stringify({
  tab: [...q.quyenCua(x).tab].sort(), luong: q.duocXemLuong(x), admin: q.laAdmin(x),
  themNs: q.duocThemNhanSu(x), taoTk: q.duocTaoTaiKhoan(x), datViTri: q.duocDatViTriCongViec(x),
  kho: q.quyenKho(x), sp: q.quyenSanPham(x), shopee: q.quyenShopee(x),
  vanHanh: q.duocThaoTacVanHanh(x), taiSan: q.duocQuanLyTaiSan(x),
  ca: q.duocQuanLyChinhSachCa(x),
  tlXem: [...q.nhomTaiLieuXemDuoc(x)].sort(), tlLuu: [...q.nhomTaiLieuLuuDuoc(x)].sort()
});
const lech = q.VI_TRI_CONG_VIEC.filter(v => anh(v) !== anh({ vai_tro: v, vi_tri_cong_viec: null }));
ok('Mã vị trí nằm ở Ô 1 cho ĐÚNG bộ quyền của bản CŨ — không thêm một khoá',
   lech.length === 0, lech.length ? 'lệch: ' + lech.join(',') : '7/7 vị trí khớp tuyệt đối');

/* Và chiều ngược: ô 1 có nhận mã LẠ không (gõ sai trong DB)? */
const la = anh({ vai_tro: 'giam_doc', vi_tri_cong_viec: null });
ok('Mã LẠ ở ô 1 (vd `giam_doc` cũ) → KHÔNG QUYỀN GÌ, chặn nhầm hơn mở nhầm',
   JSON.parse(la).tab.length === 0 && !JSON.parse(la).admin, la.slice(0, 90));
const la2 = anh({ vai_tro: 'giam_doc', vi_tri_cong_viec: 'quan_ly_kho' });
console.log('   · `giam_doc`(ô1) + `quan_ly_kho`(ô2) → ' + JSON.parse(la2).tab.length + ' tab (ô 2 vẫn có tác dụng)');

/* ---------- ③ Danh sách migration khớp mã ---------- */
const { readFileSync } = await import('node:fs');
const sql = readFileSync(path.join(GOC, 'migrations', 'them-vi-tri-cong-viec.sql'), 'utf8');
const trongSql = [...sql.match(/WHERE vai_tro IN \(([^)]*)\)/s)[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort();
ok('Danh sách vị trí trong migration KHỚP `VI_TRI_CONG_VIEC`',
   JSON.stringify(trongSql) === JSON.stringify([...q.VI_TRI_CONG_VIEC].sort()), trongSql.join(','));

/* ---------- ① WeakMap: hai CSDL KHÁC NHAU trong cùng tiến trình ---------- */
console.log('\n=== ① WeakMap — hai CSDL trong CÙNG tiến trình ====================\n');
{
  const A = dungDB();                       // CSDL 1 — CHƯA có cột
  A.db.exec('DROP INDEX IF EXISTS idx_taikhoan_vitri');
  A.db.exec('ALTER TABLE tai_khoan DROP COLUMN vi_tri_cong_viec');
  const B = dungDB();                       // CSDL 2 — ĐÃ có cột

  const a1 = await auth.coCotViTri(A.d1);
  const b1 = await auth.coCotViTri(B.d1);
  const a2 = await auth.coCotViTri(A.d1);   // hỏi lại
  const b2 = await auth.coCotViTri(B.d1);
  ok('CSDL CHƯA có cột → false (cả hai lần)', a1 === false && a2 === false, `${a1},${a2}`);
  ok('CSDL ĐÃ có cột → true (KHÔNG bị CSDL kia đầu độc)', b1 === true && b2 === true, `${b1},${b2}`);
  ok('Hai CSDL KHÔNG dùng chung câu trả lời (WeakMap theo binding)',
     a1 !== b1, `A=${a1} · B=${b1}`);

  // Nạp cột vào A rồi hỏi lại — "chưa thấy" chỉ nhớ 60 giây, nên trong cùng
  // giây phải VẪN trả false (đúng thiết kế). Đây là ghi lại hành vi, không
  // phải lỗi — nhưng cần biết: nạp migration xong ERP còn "mù" tới 60 giây.
  A.db.exec('ALTER TABLE tai_khoan ADD COLUMN vi_tri_cong_viec TEXT');
  const a3 = await auth.coCotViTri(A.d1);
  console.log(`   · Nạp cột xong, hỏi NGAY trong 60 giây → ${a3} (thiết kế: nhớ "chưa có" 60 giây)`);
  A.db.close?.(); B.db.close?.();
}

/* ---------- ① LỖI DB TẠM THỜI có bị nuốt thành "chưa có cột" không? ------ */
console.log('\n=== ① LỖI DB TẠM THỜI (không phải thiếu cột) ======================\n');
{
  const { db, d1 } = dungDB();
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)')
    .run('SEP', 'Bùi Thị Ngọc', 'BN', 'CEO', 'BGĐ');
  db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)')
    .run('MOI', 'Người mới', 'NM', 'NV', 'Kho');
  db.prepare(`INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk)
              VALUES (1,'SEP','tksep','pbkdf2$1$x$x','admin',1,0)`).run();
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(SRC, 'index.js')).href + `?v=${Math.random()}`)).default;
  const tk = await taoPhienThat(env, 1);

  /* Chèn một lỗi TẠM THỜI đúng vào câu thăm dò của coCotViTri — mọi câu khác
     chạy bình thường. Đây là ca "D1 chập một nhịp", không phải thiếu cột. */
  const goc = d1.prepare.bind(d1);
  let daChap = false;
  d1.prepare = (sql) => {
    if (!daChap && /SELECT vi_tri_cong_viec FROM tai_khoan LIMIT 1/.test(sql)) {
      daChap = true;
      return { first: async () => { throw new Error('D1_ERROR: Network connection lost.'); },
               bind: () => ({ first: async () => { throw new Error('D1_ERROR'); }, run: async () => { throw new Error('D1_ERROR'); } }) };
    }
    return goc(sql);
  };
  const r = await goiAPI(worker, env, '/api/quan-tri/tao-tai-khoan', tk, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nhan_su_id: 'MOI', ten_dang_nhap: 'tkmoi', vai_tro: 'nguoi_dung',
                           vi_tri_cong_viec: 'nhan_vien_kho' }) });
  d1.prepare = goc;
  const dong = db.prepare("SELECT vai_tro, vi_tri_cong_viec FROM tai_khoan WHERE ten_dang_nhap='tkmoi'").get();
  console.log('   HTTP ' + r.status + ' · dòng ghi ra: ' + JSON.stringify(dong));
  ok('Lỗi D1 TẠM THỜI KHÔNG bị nuốt thành "chưa có cột" (ô 2 không âm thầm rơi)',
     !(r.status === 200 && dong && dong.vi_tri_cong_viec == null),
     r.status === 200 && dong?.vi_tri_cong_viec == null
       ? 'TÀI KHOẢN TẠO RA MẤT Ô 2, người gọi vẫn thấy 200 OK'
       : 'HTTP ' + r.status);
  db.close?.();
}

process.exit(tongKet() ? 0 : 1);
