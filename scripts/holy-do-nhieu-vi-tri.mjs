/* ==========================================================================
   HỒ LY — "MỘT VỊ TRÍ" CÓ PHẢI LỖI THIẾT KẾ PHẢI SỬA TRƯỚC KHI GỘP KHÔNG?
   ---------------------------------------------------------------------------
   Gạo hỏi: chuyển sang NHIỀU vị trí sau này có RẺ và AN TOÀN không?
   Đo, không đoán. Ba câu:

     A. BỀ MẶT TỔ HỢP phình bao nhiêu, và tổ hợp nào NGUY HIỂM khi một người
        mang nhiều vị trí? (24 → 384)
     B. BA CHỐT AN TOÀN có còn đúng khi một người mang NHIỀU vị trí không?
        Mô phỏng cửa API kiểu "chỉ kiểm một giá trị" vs "kiểm từng giá trị".
     C. CHỖ NÀO trong bản vá hiện tại KHÓ ĐỔI NHẤT — liệt kê đúng file:dòng.

   Chạy: node scripts/holy-do-nhieu-vi-tri.mjs
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');
const q = await import(pathToFileURL(path.join(SRC, 'quyen.js')).href);

/* Mô phỏng quyenCua khi ô 2 mang NHIỀU vị trí — dùng CHÍNH phép hợp hiện có,
   chỉ nới `boVaiTro` cho nhận mảng. Không sửa mã sản phẩm. */
function quyenNhieu(o1, dsO2) {
  const gia = { vai_tro: o1, vi_tri_cong_viec: dsO2[0] || '' };
  let hop = q.quyenCua(gia);
  const co = new Set(hop.tab);
  let luong = hop.xem_luong === true, admin = hop.admin === true, themNs = hop.them_nhan_su === true;
  for (const v of dsO2.slice(1)) {
    const t = q.quyenCua(v);
    for (const x of t.tab) co.add(x);
    luong = luong || t.xem_luong === true;
    admin = admin || t.admin === true;
    themNs = themNs || t.them_nhan_su === true;
  }
  const tlXem = new Set(q.nhomTaiLieuXemDuoc(gia));
  for (const v of dsO2.slice(1)) for (const n of q.nhomTaiLieuXemDuoc(v)) tlXem.add(n);
  const kho = { ...q.quyenKho(gia) };
  const sho = { ...q.quyenShopee(gia) };
  let vanHanh = q.duocThaoTacVanHanh(gia), taoTk = q.duocTaoTaiKhoan(gia);
  for (const v of dsO2.slice(1)) {
    const k = q.quyenKho(v), s = q.quyenShopee(v);
    for (const c of ['thao_tac', 'quan_ly', 'gia_von']) kho[c] = kho[c] || k[c];
    for (const c of ['xem', 'quan_ly']) sho[c] = sho[c] || s[c];
    vanHanh = vanHanh || q.duocThaoTacVanHanh(v);
    taoTk = taoTk || q.duocTaoTaiKhoan(v);
  }
  return { tab: [...co], luong, admin, themNs, taoTk, kho, sho, vanHanh, tlXem: [...tlXem] };
}

/* ---------- A. BỀ MẶT TỔ HỢP: 24 → 3 × 2^7 = 384 ---------- */
console.log('\n=== A · BỀ MẶT TỔ HỢP KHI Ô 2 CHỨA NHIỀU VỊ TRÍ ====================\n');
const VT = q.VI_TRI_CONG_VIEC;
const O1 = q.VAI_TRO_HE_THONG;
const tapCon = [];
for (let m = 0; m < (1 << VT.length); m++) tapCon.push(VT.filter((_, i) => m & (1 << i)));
console.log(`Hôm nay (1 vị trí)  : ${O1.length} × ${VT.length + 1} = ${O1.length * (VT.length + 1)} tổ hợp`);
console.log(`Nhiều vị trí        : ${O1.length} × 2^${VT.length} = ${O1.length * tapCon.length} tổ hợp`);
console.log(`⇒ bề mặt kiểm thử phình ${(O1.length * tapCon.length) / (O1.length * (VT.length + 1))} lần\n`);

const n1 = [], n2 = [], n4 = [];
for (const a of O1) for (const ds of tapCon) {
  const t = quyenNhieu(a, ds);
  const ten = a + ' + [' + (ds.join('+') || '—') + ']';
  if (a !== 'admin' && t.taoTk && t.luong) n1.push(ten);
  if (a !== 'admin' && t.kho.thao_tac && t.vanHanh && t.tab.includes('ketoan')) n2.push(ten);
  if (a !== 'admin' && t.tlXem.includes('nhan_su') && !ds.includes('hcns')) n4.push(ten);
}
console.log(`[N1] vừa cấp tài khoản vừa xem lương (bỏ admin): ${n1.length} tổ hợp`);
console.log('     ví dụ: ' + n1.slice(0, 3).join(' · ') + (n1.length > 3 ? ' …' : ''));
console.log(`[N2] ôm cả ba chặng luồng tiền  (bỏ admin): ${n2.length} tổ hợp`);
console.log('     ví dụ: ' + n2.slice(0, 3).join(' · ') + (n2.length > 3 ? ' …' : ''));
ok('[N4] KHÔNG đường nào chạm giấy tờ nhân sự ngoài `hcns`, kể cả khi kiêm nhiều',
   n4.length === 0, n4.length ? n4.slice(0, 3).join(' · ') : 'sạch cả 384 tổ hợp');

/* Câu quan trọng nhất: kiêm nhiều vị trí có ĐẺ ra quyền nào mà KHÔNG vị trí
   nào tự có không? (phép hợp phải chỉ CỘNG) */
let de = 0;
for (const a of O1) for (const ds of tapCon) {
  const t = quyenNhieu(a, ds);
  for (const tab of t.tab) {
    const co = q.quyenCua(a).tab.includes(tab) || ds.some(v => q.quyenCua(v).tab.includes(tab));
    if (!co) de++;
  }
}
ok('Kiêm nhiều vị trí KHÔNG đẻ quyền từ hư không (phép hợp chỉ CỘNG)', de === 0, de + ' khoá đẻ ra');

/* Ca cụ thể của chị Hương */
console.log('\n--- Chị Vũ Lan Hương: HCNS (chính thức) + CSKH (tạm kiêm) ---');
const h1 = quyenNhieu('nguoi_dung', ['hcns']);
const h2 = quyenNhieu('nguoi_dung', ['cskh']);
const hh = quyenNhieu('nguoi_dung', ['hcns', 'cskh']);
console.log(`  chỉ hcns      : ${h1.tab.length} tab · lương=${h1.luong}`);
console.log(`  chỉ cskh      : ${h2.tab.length} tab · lương=${h2.luong}`);
console.log(`  hcns + cskh   : ${hh.tab.length} tab · lương=${hh.luong} · ${hh.tab.sort().join(',')}`);
ok('Kiêm HCNS + CSKH KHÔNG kéo theo quyền xem lương', hh.luong === false);
ok('Kiêm HCNS + CSKH = đúng phép hợp, không hơn không kém',
   hh.tab.length === new Set([...h1.tab, ...h2.tab]).size, hh.tab.length + ' tab');

/* ---------- B. BA CHỐT AN TOÀN có sống sót không? ---------- */
console.log('\n=== B · BA CHỐT AN TOÀN DƯỚI MÔ HÌNH NHIỀU VỊ TRÍ ==================\n');

/* Mô phỏng cửa API. Hai cách viết — cách SAI là cách người ta hay viết khi
   đổi từ một giá trị sang danh sách: chỉ kiểm giá trị ĐẦU (hoặc giá trị
   "chính thức") rồi bỏ qua phần còn lại. */
const cuaSai = (phien, dsMoi) => {           // chỉ kiểm phần tử đầu
  const v = dsMoi[0] || '';
  if (v && !q.laViTriCongViec(v)) return 400;
  if (v && !q.laAdmin(phien) && q.viTriCoXemLuong(v)) return 403;
  return 200;
};
const cuaDung = (phien, dsMoi) => {          // kiểm TỪNG phần tử
  for (const v of dsMoi) {
    if (v && !q.laViTriCongViec(v)) return 400;
    if (v && !q.laAdmin(phien) && q.viTriCoXemLuong(v)) return 403;
  }
  return 200;
};
const hcns = { vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'hcns' };
// Chị Hương (HCNS) tự thêm cho mình "tạm kiêm" Kế toán trưởng, giấu ở phần tử thứ 2
const muiTiem = ['cskh', 'ke_toan_truong'];
console.log(`  Mũi tiêm: HCNS gán ["cskh","ke_toan_truong"] — lương giấu ở phần tử THỨ HAI`);
console.log(`  Cửa viết SAI (chỉ kiểm phần tử đầu) → HTTP ${cuaSai(hcns, muiTiem)}   ⚠ LỌT`);
console.log(`  Cửa viết ĐÚNG (kiểm từng phần tử)   → HTTP ${cuaDung(hcns, muiTiem)}`);
ok('Chốt ③ "chỉ Admin trao lương" CHỈ sống sót nếu kiểm TỪNG vị trí',
   cuaSai(hcns, muiTiem) === 200 && cuaDung(hcns, muiTiem) === 403,
   'sai=' + cuaSai(hcns, muiTiem) + ' · đúng=' + cuaDung(hcns, muiTiem));

/* Chốt ② — "không tự sửa ô của chính mình" xét theo DÒNG, không theo giá trị,
   nên nó KHÔNG phụ thuộc số lượng vị trí. Kiểm bằng đọc mã. */
const src = readFileSync(path.join(SRC, 'index.js'), 'utf8');
const chot2 = /tk\.nhan_su_id === phien\.nhan_su_id && !laAdmin\(phien\)/.test(src);
ok('Chốt ② "không tự sửa ô của chính mình" xét theo DÒNG ⇒ sống sót nguyên vẹn',
   chot2, 'src/index.js:1712 — so nhan_su_id, không so giá trị vị trí');

/* Chốt ① — "ô 2 chỉ nhận mã vị trí" áp cho từng phần tử, sống sót nếu lặp. */
ok('Chốt ① "ô 2 chỉ nhận mã vị trí" áp được cho từng phần tử',
   cuaDung(hcns, ['cskh', 'admin']) === 400, 'nhét admin vào phần tử thứ 2 → 400');

/* ---------- C. CHỖ KHÓ ĐỔI NHẤT — so bằng chuỗi SQL vô hướng ---------- */
console.log('\n=== C · CHỖ KHÓ ĐỔI NHẤT — SO VÔ HƯỚNG TRÊN CỘT ===================\n');
const files = ['index.js', 'nhac-nhan-su.js', 'tai-lieu.js', 'auth.js'];
const voHuong = [];
for (const f of files) {
  const s = readFileSync(path.join(SRC, f), 'utf8').split('\n');
  s.forEach((d, i) => {
    if (/vi_tri_cong_viec\s*(=|!=|===|!==)\s*'/.test(d) || /vi_tri_cong_viec\s*(=|!=)\s*['"]/.test(d))
      voHuong.push(`src/${f}:${i + 1}  ${d.trim().slice(0, 96)}`);
  });
}
console.log('So VÔ HƯỚNG trên cột (vỡ ngay nếu cột chứa danh sách):');
voHuong.forEach(x => console.log('   ⚠ ' + x));
console.log(`\n⇒ ${voHuong.length} chỗ phải viết lại thành EXISTS / bảng nối.`);
ok('Đếm được đúng các chỗ so vô hướng (đây là danh sách việc cho Khỉ Đột)',
   voHuong.length > 0, voHuong.length + ' chỗ');

process.exit(tongKet() ? 0 : 1);
