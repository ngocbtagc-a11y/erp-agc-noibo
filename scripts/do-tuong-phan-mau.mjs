/* ==========================================================================
   ĐO TƯƠNG PHẢN CHỮ/NỀN — CTL-0023 Đợt 1 (đổi bảng màu nền sáng)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-tuong-phan-mau.mjs
   Không cần trình duyệt, không cần dev server.

   VÌ SAO CÓ FILE NÀY: nhân viên kho đọc ERP trên điện thoại NGOÀI NẮNG và
   DƯỚI ĐÈN KHO. Nền sáng mà chữ nhạt là không đọc được — đẹp mà vô dụng.
   "Nhìn ổn" không phải là phép đo. File này đọc THẲNG biến trong style.css,
   dựng lại đúng những cặp chữ–nền ĐANG CÓ THẬT trong CSS (mỗi cặp ghi kèm số
   dòng để soi lại), rồi tính tỉ số tương phản theo WCAG 2.1.

   NGƯỠNG: chữ thường ≥ 4.5:1 · chữ lớn (≥18.66px đậm hoặc ≥24px) ≥ 3:1.

   BH-16 — CA ĐỐI CHỨNG: phép đo nào cũng phải chứng minh nó BẮT ĐƯỢC lỗi.
   Cuối file cố ý đặt một màu chữ quá nhạt; nếu phép đo báo ĐẠT thì phép đo
   hỏng, không phải màu đúng.
   ========================================================================== */

import { readFileSync } from 'node:fs';

const goc = new URL('../', import.meta.url);
const css = readFileSync(new URL('public/assets/css/style.css', goc), 'utf8');

/* --- Đọc biến từ khối :root ĐẦU TIÊN của style.css ------------------------ */
const dau = css.search(/^:root\s*\{/m);              // khai báo thật, không phải chữ ':root' trong ghi chú
if (dau < 0) throw new Error('Không tìm thấy khối :root trong style.css');
const khoi = css.slice(dau, css.indexOf('}', dau));
const M = {};
for (const m of khoi.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) M[m[1]] = m[2];

/* --- WCAG 2.1 ------------------------------------------------------------- */
function rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
function sang([r, g, b]) {                       // relative luminance
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function tron(tren, duoi, a) {                   // chữ mờ (rgba) đè lên nền đặc
  const [r1, g1, b1] = rgb(tren), [r2, g2, b2] = rgb(duoi);
  return [r1 * a + r2 * (1 - a), g1 * a + g2 * (1 - a), b1 * a + b2 * (1 - a)];
}
function ti(chu, nen) {
  const a = sang(Array.isArray(chu) ? chu : rgb(chu));
  const b = sang(Array.isArray(nen) ? nen : rgb(nen));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
const v = t => M[t] || (() => { throw new Error('Thiếu biến --' + t + ' trong :root'); })();

/* --- Danh sách cặp chữ–nền CÓ THẬT trong style.css ------------------------ */
/* [tên, màu chữ, màu nền, ngưỡng, ghi chú dòng CSS] */
const CAP = [
  ['Chữ thân bài trên nền trang',        v('text'),      v('bg'),        4.5, 'body — d.67'],
  ['Chữ thân bài trên mặt thẻ',          v('text'),      v('card'),      4.5, '.panel — d.972'],
  ['Tiêu đề (--ink) trên mặt thẻ',       v('ink'),       v('card'),      4.5, '42 chỗ dùng --ink'],
  ['Chữ phụ (--text-mute) trên thẻ',     v('text-mute'), v('card'),      4.5, '.sm, .hint — 63 chỗ'],
  ['Chữ phụ trên nền trang',             v('text-mute'), v('bg'),        4.5, 'chữ phụ ngoài thẻ'],
  ['Chữ phụ trên --surface-2',           v('text-mute'), v('surface-2'), 4.5, '.tag.mute d.1602'],
  ['Chữ thân bài trên --surface',        v('text'),      v('surface'),   4.5, 'ô nhập, thẻ chìm'],
  ['--ink trên --surface',               v('ink'),       v('surface'),   4.5, 'd.684'],
  ['--ink-soft trên --surface-2',        v('ink-soft'),  v('surface-2'), 4.5, '.seg-nut d.2010'],
  ['--ink-soft trên --sage-wash',        v('ink-soft'),  v('sage-wash'), 4.5, '.tag.sage d.1603'],
  ['--ink trên --sage-wash',             v('ink'),       v('sage-wash'), 4.5, 'tbody tr:hover d.1050'],
  ['TRẮNG trên --sage (nút chính)',      v('white'),     v('sage'),      4.5, '.btn-primary d.286'],
  ['TRẮNG trên --sage (bong bóng chat)', v('white'),     v('sage'),      4.5, '.chat-cua-toi d.1402'],
  ['TRẮNG trên --sage-dark',             v('white'),     v('sage-dark'), 4.5, '.chat-avt d.1369'],
  ['--ink trên --sage (menu đang mở)',   v('ink'),       v('sage'),      4.5, '.sb-item.active d.451'],
  ['--ink trên --sage-pale (ảnh đại diện)', v('ink'),    v('sage-pale'), 4.5, '.sb-user .av d.476'],
  ['Chữ thanh bên rgba(255,255,255,.78)', tron('#ffffff', v('ink'), .78), v('ink'), 4.5, '.sidebar d.348'],
  ['Nút Thoát rgba(255,255,255,.6)',     tron('#ffffff', v('ink'), .60),  v('ink'), 4.5, '.sb-logout d.690'],
  ['TRẮNG trên nền thanh bên (--ink)',   v('white'),     v('ink'),       4.5, '.sb-user b d.624'],
  ['--warn trên --warn-wash',            v('warn'),      v('warn-wash'), 4.5, 'MÀU MANG NGHĨA, giữ nguyên'],
  ['--danger trên --danger-wash',        v('danger'),    v('danger-wash'), 4.5, 'MÀU MANG NGHĨA, giữ nguyên'],
  ['--ok trên --ok-wash',                v('ok'),        v('ok-wash'),   4.5, 'MÀU MANG NGHĨA, giữ nguyên'],
  ['--warn trên mặt thẻ',                v('warn'),      v('card'),      4.5, '.hd-han.sap-het d.2210'],
  ['--danger trên mặt thẻ',              v('danger'),    v('card'),      4.5, '.cv-nhom-dau.danger d.2367'],
];
if (M['cam']) {
  CAP.push(
    ['--cam-dark trên mặt thẻ',    v('cam-dark'), v('card'),     4.5, 'số liệu cần chú ý (Đợt 2)'],
    ['--cam-dark trên --cam-wash', v('cam-dark'), v('cam-wash'), 4.5, 'nhãn "đang chờ bạn" (Đợt 2)'],
    ['TRẮNG trên --cam-dark',      v('white'),    v('cam-dark'), 4.5, 'nút hành động chính (Đợt 2)'],
    ['--ink trên --cam',           v('ink'),      v('cam'),      4.5, 'cam là màu NỀN cho chữ đậm'],
  );
}

/* --- In bảng -------------------------------------------------------------- */
let dat = 0, truot = 0;
const in1 = (ten, r, nguong, ghi) => {
  const ok = r >= nguong;
  ok ? dat++ : truot++;
  console.log(`  ${ok ? 'ĐẠT ' : 'TRƯỢT'}  ${r.toFixed(2).padStart(6)}:1  (cần ${nguong})  ${ten.padEnd(40)} ${ghi}`);
};
console.log('\n═══ ĐO TƯƠNG PHẢN — WCAG 2.1 ═══\n');
console.log('  Nền   --bg      = ' + v('bg') + '   |  Mặt thẻ --card = ' + v('card'));
console.log('  Xanh  --sage    = ' + v('sage') + '   |  Chữ đậm --ink  = ' + v('ink'));
if (M['cam']) console.log('  Cam   --cam     = ' + v('cam'));
console.log('');
for (const [ten, c, n, ng, ghi] of CAP) in1(ten, ti(c, n), ng, ghi);

/* --- Nền và mặt thẻ có TÁCH RA khỏi nhau không ---------------------------
   Dùng L* (CIE Lab) chứ KHÔNG dùng hiệu độ sáng thô: gần vùng trắng, hiệu
   độ sáng thô phóng đại rất mạnh (#ded9d3 vs #ffffff chênh 0.30 nghe như
   "cách xa", thực tế mắt chỉ thấy L* 87 vs 100). L* mới là thang mắt đọc. */
const Lsao = h => { const y = sang(rgb(h)); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
const in2 = (ten, a, b, nguong, ok, xau) => {
  const d = Math.abs(Lsao(a) - Lsao(b));
  console.log(`  ${ten}: L* ${Lsao(a).toFixed(1)} ↔ ${Lsao(b).toFixed(1)}  = ΔL* ${d.toFixed(1)}  ${d >= nguong ? '→ ' + ok : '→ ' + xau}`);
  if (d < nguong) truot++;
};
console.log('');
in2('Nền ↔ mặt thẻ         ', v('bg'), v('card'), 2, 'thẻ NỔI khỏi nền', 'QUÁ SÁT — thẻ chìm, trang thành tấm giấy phẳng');
in2('Nền ↔ --surface       ', v('bg'), v('surface'), 2, 'khung đăng nhập .login-shell còn nổi', 'KHUNG ĐĂNG NHẬP TAN VÀO NỀN (d.94)');
in2('--surface ↔ mặt thẻ   ', v('surface'), v('card'), 2, 'ô nhập/dòng di chuột còn chìm rõ', 'Ô NHẬP MẤT HÌNH trong thẻ trắng');
in2('Rãnh .seg ↔ nút chọn  ', v('surface-2'), v('card'), 3, 'nút đang chọn còn thấy', 'nút .seg đang chọn BIẾN MẤT');
in2('Đường kẻ ↔ mặt thẻ    ', v('line'), v('card'), 3, 'viền thẻ còn nhìn ra', 'VIỀN TÀNG HÌNH — thẻ mất khung');
in2('Đường kẻ ↔ nền trang  ', v('line'), v('bg'), 2, 'viền còn thấy cả ngoài nền', 'viền chìm khi đặt trên nền trang');

/* Thứ tự bốn tầng — đảo tầng là hỏng phân cấp, mà nhìn mắt rất khó ra. */
const tang = [['--surface-2', v('surface-2')], ['--bg', v('bg')], ['--surface', v('surface')], ['--card', v('card')]];
const dungThuTu = tang.every((t, i) => i === 0 || Lsao(t[1]) > Lsao(tang[i - 1][1]));
console.log(`\n  Thứ tự tầng ${tang.map(t => t[0] + '(' + Lsao(t[1]).toFixed(1) + ')').join(' < ')}`);
console.log(`  ${dungThuTu ? '→ ĐÚNG thứ tự chìm→nổi' : '→ ✗ ĐẢO TẦNG — phân cấp mặt phẳng hỏng'}`);
if (!dungThuTu) truot++;

/* --- TEM TÀI SẢN 60×40mm IN RA GIẤY (ADR-0008) ---------------------------
   Đã suýt hỏng một lần. Kiểm hai thứ:
   ① Chữ trên tem KHÔNG được lấy màu từ `:root` — tem phải đen tuyền dù bảng
     màu đổi thế nào. Nếu ai đó thay `#000` bằng `var(--ink)` thì tem sẽ nhạt
     dần theo bảng màu, và chỉ lộ ra khi cầm tờ tem in xong trên tay.
   ② Nếu người dùng bật "in cả nền", `body{background:var(--bg)}` sẽ phủ kín
     tem → tốn mực. Nền càng sáng càng đỡ. */
console.log('\n═══ TEM TÀI SẢN 60×40mm — @media print ═══\n');
{
  const dauTem = css.indexOf('.ts-tem {');
  const vungTem = css.slice(dauTem, css.indexOf('@media print', dauTem) + 200);
  const dungBien = [...vungTem.matchAll(/color:\s*var\(--([a-z0-9-]+)\)/g)].map(m => m[1]);
  const ok1 = dungBien.length === 0;
  console.log(`  ${ok1 ? 'ĐẠT ' : 'TRƯỢT'}  Chữ tem không phụ thuộc bảng màu` +
              (ok1 ? '  (đen tuyền #000/#333, cố định)' : `  ← DÍNH BIẾN: ${dungBien.join(', ')}`));
  if (!ok1) truot++;
  const ok2 = /background:\s*var\(--/.test(vungTem.slice(0, vungTem.indexOf('@media print')));
  console.log(`  ${!ok2 ? 'ĐẠT ' : 'TRƯỢT'}  Nền tem không phụ thuộc bảng màu`);
  if (ok2) truot++;
  console.log(`  ĐẠT    Chữ #000 trên giấy trắng: ${ti('#000000', '#ffffff').toFixed(2)}:1`);
  console.log(`  ĐẠT    Chữ #333 (dòng phụ) trên giấy trắng: ${ti('#333333', '#ffffff').toFixed(2)}:1`);
  const mucCu = (100 - Lsao('#ded9d3')).toFixed(1), mucMoi = (100 - Lsao(v('bg'))).toFixed(1);
  console.log(`  Nếu người dùng bật "in cả nền": phủ mực nền cũ ${mucCu}% → mới ${mucMoi}%  → ${+mucMoi < +mucCu ? 'ĐỠ TỐN MỰC HƠN TRƯỚC' : 'TỐN HƠN — xem lại'}`);
}

/* --- BH-16 · CA ĐỐI CHỨNG ------------------------------------------------- */
console.log('\n═══ CA ĐỐI CHỨNG (BH-16) — phép đo phải BẮT ĐƯỢC màu sai ═══\n');
const doiChung = [
  ['Chữ #CFC9C0 (xám nhạt) trên mặt thẻ', '#cfc9c0', v('card'), 4.5],
  ['Chữ #9aab86 (sage CŨ) trên mặt thẻ',  '#9aab86', v('card'), 4.5],
  ['TRẮNG trên #6CA839 (xanh logo nguyên bản)', '#ffffff', '#6ca839', 4.5],
];
let batDuoc = 0;
for (const [ten, c, n, ng] of doiChung) {
  const r = ti(c, n);
  const batLoi = r < ng;
  if (batLoi) batDuoc++;
  console.log(`  ${batLoi ? 'BẮT ĐƯỢC' : 'KHÔNG BẮT ĐƯỢC ←HỎNG'}  ${r.toFixed(2)}:1  ${ten}`);
}

console.log('\n───────────────────────────────────────────────────────────');
console.log(`  Cặp thật: ${dat} đạt · ${truot} trượt`);
console.log(`  Đối chứng: bắt được ${batDuoc}/${doiChung.length} màu cố ý sai`);
if (batDuoc !== doiChung.length) {
  console.log('\n  ✗ PHÉP ĐO HỎNG — không bắt được màu cố ý sai. Sửa phép đo trước.');
  process.exit(2);
}
console.log(truot === 0
  ? '\n  ✓ Mọi cặp chữ–nền đạt ngưỡng WCAG.'
  : `\n  ✗ Còn ${truot} cặp dưới ngưỡng — xem dòng TRƯỢT ở trên.`);
process.exit(truot === 0 ? 0 : 1);
