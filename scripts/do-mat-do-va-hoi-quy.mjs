/* ==========================================================================
   ĐO MẬT ĐỘ HIỂN THỊ + HỒI QUY TƯƠNG PHẢN — CTL-0023 Đợt 2
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-mat-do-va-hoi-quy.mjs <css-CŨ> <css-MỚI>

   VÌ SAO CÓ FILE NÀY — hai câu hỏi mà `do-tuong-phan-mau.mjs` KHÔNG trả lời:

   ① "Đổi giao diện xong, một màn 375px còn hiện được bao nhiêu dòng?"
      Nhân viên kho dùng điện thoại. Nới khoảng cách cho "thoáng" thì mỗi màn
      hiện ít dòng hơn → cuộn nhiều hơn → ĐẸP MÀ CHẬM VIỆC.
      Không có trình duyệt trong môi trường này nên KHÔNG chụp màn đếm dòng
      được. Nhưng đếm bằng mắt vốn cũng không phải phép đo: nó phụ thuộc dữ
      liệu mẫu lúc chụp. Cách chắc hơn: chiều cao một dòng danh sách là hàm
      CHỈ của các thuộc tính CHIẾM CHỖ. Nếu tập thuộc tính chiếm chỗ KHÔNG
      ĐỔI một byte nào thì số dòng/màn KHÔNG THỂ đổi — đúng với mọi dữ liệu,
      mọi màn, mạnh hơn một tấm ảnh chụp.
      → Bàn này trích MỌI khai báo chiếm chỗ ở CẢ HAI bản rồi so.
      Cái gì KHÔNG chiếm chỗ (color, background, box-shadow, border-color,
      border-radius, outline, transition, opacity) thì được phép đổi thoải mái.

   ② "Có cặp chữ–nền nào TỆ ĐI mà rớt qua ngưỡng không?"
      Tổng số cặp trượt giảm chưa đủ để kết luận. Vá 12 chỗ mà làm hỏng 1 chỗ
      thì tổng vẫn đẹp, nhưng chỗ hỏng đó là chỗ có người đọc hằng ngày.
      → Bàn này ghép cặp theo TÊN SELECTOR ở hai bản và nêu đích danh.

   BH-16 — CA ĐỐI CHỨNG ở cuối file: cố ý dựng một bản "đã nới khoảng cách"
   và một cặp "đã làm tệ đi", phép đo PHẢI bắt được cả hai.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/* ── Thuộc tính CHIẾM CHỖ — đổi cái nào là số dòng/màn có thể đổi ────────── */
const CHIEM_CHO = [
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap',
  'font-size', 'line-height', 'letter-spacing',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'border-width', 'border-top-width', 'border-bottom-width',
  'grid-template-columns', 'grid-template-rows', 'flex-basis',
];
/* `border`/`border-top`/… viết gộp có thể chứa độ dày → tính là chiếm chỗ.
   `border-color` thì không. */
const RE_BORDER_GOP = /^border(-(top|right|bottom|left))?$/;

const doc = p => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));

function quet(text, goc = 0) {
  const ra = [];
  let i = 0, dauSel = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '{') {
      const sel = text.slice(dauSel, i).replace(/\s+/g, ' ').trim();
      let d = 1, j = i + 1;
      while (j < text.length && d > 0) { if (text[j] === '{') d++; else if (text[j] === '}') d--; j++; }
      const than = text.slice(i + 1, j - 1);
      if (than.includes('{')) ra.push(...quet(than, goc + i + 1));
      else ra.push({ sel, than });
      i = j; dauSel = j;
    } else if (c === '}') { i++; dauSel = i; }
    else i++;
  }
  return ra;
}

/* Bản đồ "selector → mọi khai báo CHIẾM CHỖ", đã chuẩn hoá khoảng trắng.
   Gom theo selector nên thứ tự luật trong file đổi cũng không gây báo động giả. */
function dauVanLayout(css) {
  const map = new Map();
  for (const r of quet(css)) {
    if (!r.sel || r.sel.startsWith('@')) continue;
    for (const m of r.than.matchAll(/([a-z-]+)\s*:\s*([^;}]+)/g)) {
      const ten = m[1].trim();
      if (!CHIEM_CHO.includes(ten) && !RE_BORDER_GOP.test(ten)) continue;
      const gt = m[2].replace(/\s+/g, ' ').trim();
      const k = r.sel + ' | ' + ten;
      map.set(k, (map.get(k) || []).concat(gt));
    }
  }
  return map;
}

const [pCu, pMoi] = [process.argv[2], process.argv[3]];
if (!pCu || !pMoi) { console.error('Cần 2 tham số: <css-CŨ> <css-MỚI>'); process.exit(2); }

console.log('\n═══ ① MẬT ĐỘ HIỂN THỊ — thuộc tính CHIẾM CHỖ có đổi không? ═══\n');
const A = dauVanLayout(doc(pCu)), B = dauVanLayout(doc(pMoi));
const khac = [];
for (const [k, v] of B) { const w = A.get(k); if (!w || w.join('|') !== v.join('|')) khac.push(['THÊM/ĐỔI', k, (w || []).join('|'), v.join('|')]); }
for (const [k, v] of A) if (!B.has(k)) khac.push(['MẤT', k, v.join('|'), '—']);

console.log(`  Bản cũ:  ${A.size} khai báo chiếm chỗ`);
console.log(`  Bản mới: ${B.size} khai báo chiếm chỗ`);
if (!khac.length) {
  console.log('\n  ĐẠT  KHÔNG một khai báo chiếm chỗ nào đổi.');
  console.log('       → Chiều cao mọi dòng danh sách GIỮ NGUYÊN từng pixel.');
  console.log('       → Số dòng hiện được trên màn 375px thay đổi 0% — đúng với');
  console.log('         MỌI màn và MỌI bộ dữ liệu, không phụ thuộc ảnh chụp.');
} else {
  console.log(`\n  ⚠️  ${khac.length} khai báo chiếm chỗ đã đổi — mật độ CÓ THỂ đã lấn:`);
  for (const [loai, k, cu, moi] of khac.slice(0, 40)) console.log(`   ${loai.padEnd(9)} ${k.padEnd(56)} ${cu} → ${moi}`);
}

/* ── ② Hồi quy tương phản: ghép cặp theo tên, nêu đích danh cặp TỆ ĐI ────── */
console.log('\n═══ ② HỒI QUY TƯƠNG PHẢN — cặp nào TỆ ĐI? ═══\n');
const doCap = p => {
  const ra = new Map();
  /* `do-tuong-phan-mau.mjs` THOÁT VỚI MÃ 1 khi còn cặp trượt — đó là hành vi
     đúng của nó (để CI chặn), nhưng ở đây ta CẦN đọc bảng kể cả khi còn
     trượt. Bắt lỗi và lấy stdout ra. Nếu không có stdout thì mới là hỏng
     thật (BH-17: nghi bàn đo trước, đừng vội kết tội code). */
  let out;
  try {
    out = execFileSync(process.execPath, [new URL('./do-tuong-phan-mau.mjs', import.meta.url).pathname.replace(/^\//, ''), p],
      { encoding: 'utf8', env: { ...process.env, DAY_DU: '1' }, maxBuffer: 1 << 26 });
  } catch (e) {
    out = e.stdout;
    if (!out) throw new Error('BÀN THỬ HỎNG — không lấy được bảng đo của ' + p + ': ' + e.message);
    if (e.status === 2) throw new Error('BÀN THỬ HỎNG — đối chứng của do-tuong-phan-mau.mjs không bắt được lỗi cố ý (' + p + ')');
  }
  for (const d of out.split('\n')) {
    const m = d.match(/^\s+(ĐẠT|TRƯỢT)\s+([\d.]+):1 \(cần ([\d.]+)\)\s+\S+ trên \S+\s+(.+?)\s+d\.\d+\s*$/);
    if (m) ra.set(m[4].trim(), { r: +m[2], ng: +m[3] });
  }
  return ra;
};
const cCu = doCap(pCu), cMoi = doCap(pMoi);
const teDi = [], totLen = [], rotNguong = [], vaXong = [];
for (const [ten, m] of cMoi) {
  const c = cCu.get(ten);
  if (!c) continue;
  if (m.r < c.r - 0.005) {
    teDi.push([ten, c.r, m.r]);
    if (c.r >= c.ng && m.r < m.ng) rotNguong.push([ten, c.r, m.r, m.ng]);
  } else if (m.r > c.r + 0.005) {
    totLen.push([ten, c.r, m.r]);
    if (c.r < c.ng && m.r >= m.ng) vaXong.push([ten, c.r, m.r]);
  }
}
const truotCua = m => [...m.values()].filter(x => x.r < x.ng).length;
console.log(`  Cặp trượt:  CŨ ${truotCua(cCu)}/${cCu.size}  →  MỚI ${truotCua(cMoi)}/${cMoi.size}`);
console.log(`  Tốt lên: ${totLen.length}   ·   Tệ đi: ${teDi.length}   ·   VÁ XONG (trượt→đạt): ${vaXong.length}`);
console.log(`\n  RỚT QUA NGƯỠNG (đạt → trượt): ${rotNguong.length}`);
for (const [t, a, b, ng] of rotNguong) console.log(`   ✗ ${t.padEnd(52)} ${a.toFixed(2)} → ${b.toFixed(2)} (cần ${ng})`);
if (teDi.length) {
  console.log('\n  Tệ đi nhưng VẪN ĐẠT (đánh đổi có chủ ý):');
  for (const [t, a, b] of teDi.slice(0, 15)) console.log(`   · ${t.padEnd(52)} ${a.toFixed(2)} → ${b.toFixed(2)}`);
}
if (vaXong.length) {
  console.log('\n  VÁ XONG — trượt thành đạt:');
  for (const [t, a, b] of vaXong) console.log(`   ✓ ${t.padEnd(52)} ${a.toFixed(2)} → ${b.toFixed(2)}`);
}

/* ── ③ BH-16 · CA ĐỐI CHỨNG — phép đo phải BẮT ĐƯỢC lỗi cố ý ─────────────── */
console.log('\n═══ ③ CA ĐỐI CHỨNG (BH-16) ═══\n');
let bat = 0, tong = 0;
const thu = (ten, dieuKien) => { tong++; if (dieuKien) bat++; console.log(`  ${dieuKien ? 'BẮT ĐƯỢC      ' : 'KHÔNG BẮT ←HỎNG'} ${ten}`); };

/* a) Cố ý NỚI khoảng cách: bàn ① phải kêu. */
const cssNoi = doc(pMoi).replace('padding: 10px 11px;', 'padding: 16px 11px;');
thu('Cố ý nới .sb-item padding 10px→16px → bàn mật độ phải kêu',
    [...dauVanLayout(cssNoi)].some(([k, v]) => { const w = B.get(k); return !w || w.join('|') !== v.join('|'); }));

/* b) Cố ý ĐỔI cỡ chữ: bàn ① phải kêu. */
const cssChu = doc(pMoi).replace('font-size: 13.5px;', 'font-size: 15px;');
thu('Cố ý tăng font-size 13.5px→15px → bàn mật độ phải kêu',
    [...dauVanLayout(cssChu)].some(([k, v]) => { const w = B.get(k); return !w || w.join('|') !== v.join('|'); }));

/* c) Đổi thứ CHỈ có màu thì bàn ① phải IM — nếu nó kêu là báo động giả. */
const cssMau = doc(pMoi).replace('background: var(--cam);', 'background: #123456;');
thu('Đổi RIÊNG màu nền → bàn mật độ phải IM (không báo động giả)',
    ![...dauVanLayout(cssMau)].some(([k, v]) => { const w = B.get(k); return !w || w.join('|') !== v.join('|'); }));

/* d) Lỗi THẬT tôi đã mắc và bàn ② đã bắt: chữ tối trên nền tối.
      `--ink` #1e2417 trên `--cam-dark` #b45606 = 3.24:1. */
const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const P = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const Lm = c => 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
const ti = (a, b) => { const x = Lm(P(a)), y = Lm(P(b)), [h, l] = x > y ? [x, y] : [y, x]; return (h + 0.05) / (l + 0.05); };
thu(`Hover mục menu TỐI đi (--ink trên --cam-dark) = ${ti('#1e2417', '#b45606').toFixed(2)} → phải trượt 4.5`, ti('#1e2417', '#b45606') < 4.5);
thu(`Bản đã sửa: --ink trên #f18627 = ${ti('#1e2417', '#f18627').toFixed(2)} → phải ĐẠT`, ti('#1e2417', '#f18627') >= 4.5);
thu(`Chữ TRẮNG trên --cam #eb7c17 = ${ti('#ffffff', '#eb7c17').toFixed(2)} → phải trượt cả ngưỡng 3`, ti('#ffffff', '#eb7c17') < 3);
thu(`Nút trang mẫu: trắng trên #FF7A18 = ${ti('#ffffff', '#FF7A18').toFixed(2)} → chép mù là trượt`, ti('#ffffff', '#FF7A18') < 4.5);
thu(`--cam-dark làm CHỮ rơi xuống --surface-2 = ${ti('#b45606', '#efe8dc').toFixed(2)} → phải trượt (vì sao cần --cam-text)`, ti('#b45606', '#efe8dc') < 4.5);
thu(`--cam-text trên tầng xấu nhất --surface-2 = ${ti('#a64f07', '#efe8dc').toFixed(2)} → phải ĐẠT`, ti('#a64f07', '#efe8dc') >= 4.5);

console.log('\n───────────────────────────────────────────────────────────');
console.log(`  Đối chứng: bắt được ${bat}/${tong}`);
const hong = bat !== tong;
if (hong) console.log('  ✗ PHÉP ĐO HỎNG — sửa phép đo trước khi tin số nào ở trên.');
const chan = rotNguong.length > 0 || khac.length > 0 || hong;
console.log(chan ? '  ✗ CÓ VẤN ĐỀ CHẶN — xem mục ① hoặc ②.' : '  ✓ Mật độ giữ nguyên · 0 cặp rớt qua ngưỡng · đối chứng đủ.');
process.exit(chan ? 1 : 0);
