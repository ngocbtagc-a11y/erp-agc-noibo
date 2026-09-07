/* ==========================================================================
   MÁY QUÉT: LUẬT CSS TRONG `@media` BỊ LUẬT NỀN ĐỨNG SAU ĐÈ CHẾT
   ---------------------------------------------------------------------------
   Chạy:  npm run do-luat-css-chet      (node scripts/do-luat-css-chet.mjs)

   CHUYỆN. Ba lần trong hai vòng soi, cùng MỘT kiểu hỏng:

     · `@media(≤1100px) thead th { white-space: normal }` bị luật nền
       `thead th { white-space: nowrap }` đứng SAU trong tệp đè. Tiêu đề cột
       CHƯA BAO GIỜ xuống dòng ở dải 981–1100px. Hậu quả đo được @1024px:
       `kd-tq-bang` tràn +139px, `cskh-bang` +12px. (REV-0063, tìm ra bằng tay)
     · `@media(≤1100px) td.cot-chu.co-chitiet { min-width: 150px }` bị dòng
       `min-width: 190px` đứng sau đè — ĐÚNG cái luật sinh ra để cứu tràn ở
       1024px, và nó chưa từng chạy. (REV-0063 CAO-2)
     · `@media(≤640px) .chat-tin { max-width: 86% }` bị `max-width: 72%` đứng
       sau đè — trên điện thoại bong bóng chat vẫn bó 72%. (REV-0063 CAO-2)

   Cả ba đều là LUẬT VIẾT RA RỒI KHÔNG BAO GIỜ CHẠY. Không trình duyệt nào
   báo, không cổng nào bắt, và người viết thì tin là mình đã chữa xong. Vòng
   trước tìm được ca thứ nhất BẰNG TAY rồi tuyên bố "đây là một LỚP" — mà
   chữa đúng một chỗ. Đây là cái máy để lần sau không phải tìm bằng tay nữa.

   NGUYÊN LÝ. Trong CSS, khi hai luật cùng khớp một phần tử và cùng đặt một
   thuộc tính, thắng thua theo thứ tự: `!important` > độ ưu tiên > VỊ TRÍ
   TRONG TỆP (đứa sau thắng). `@media` KHÔNG cộng thêm một chút độ ưu tiên
   nào. Nên một khai báo trong `@media` là CHẾT khi có một luật nền
   (ngoài mọi `@media`) CÙNG SELECTOR, đặt CÙNG thuộc tính, đứng SAU nó trong
   tệp và có độ ưu tiên ≥.

   PHẠM VI — NÓI THẲNG RA, ĐÂY LÀ SÀN DƯỚI CHỨ KHÔNG PHẢI TRẦN.
   Máy này chỉ bắt lớp CÙNG SELECTOR (sau khi chuẩn hoá khoảng trắng). Ca
   "selector KHÁC nhau nhưng khớp cùng phần tử" — ví dụ `.cot-chu` bị
   `td.cot-chu` đè — nó KHÔNG bắt được, và bắt được thì cũng chỉ bằng cách
   đoán, vì phải biết cây DOM thật. Con số 0 ở đây nghĩa là "không còn ca
   cùng selector", không phải "CSS sạch tuyệt đối". Đừng khai quá điều đo được.

   ⚠️ CA ĐỐI CHỨNG (BH-16) — MÁY QUÉT PHẢI TỰ CHỨNG MINH NÓ BẮT ĐƯỢC.
   Trước khi quét tệp thật, file này chạy chính phép quét đó trên bốn MẪU dựng
   sẵn trong bộ nhớ: hai mẫu BẨN (phải bắt) và hai mẫu SẠCH (không được bắt
   oan). Sai một mẫu là dừng, mã thoát 2 — "bàn đo hỏng", không phải "mã hỏng".

   MÃ THOÁT: 0 = sạch · 1 = còn luật chết · 2 = bàn đo hỏng.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEP_MAC_DINH = path.join(GOC, 'public/assets/css/style.css');

/* ==========================================================================
   BẢNG MIỄN TRỪ — MỖI DÒNG PHẢI CÓ LÝ DO VIẾT RA.
   Khớp theo `selector | thuộc tính`. Thêm một dòng vào đây là một quyết định
   CÓ TÊN, không phải một sự im lặng. Hôm nay rỗng, và phải cố giữ nó rỗng.
   ========================================================================== */
const MIEN_TRU = [
  // { khoa: 'ví.dụ | color', lyDo: '...' }
];

/* ---- Tách luật ------------------------------------------------------------
   Đi từng ký tự, đếm ngoặc, nhớ đang nằm trong `@media` nào. Bình luận được
   thay bằng khoảng trắng CÙNG ĐỘ DÀI để số dòng báo ra vẫn đúng — báo sai số
   dòng là bắt người ta đi tìm lại bằng tay, tức là mất đúng thứ file này làm. */
function bocBinhLuan(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}

export function tachLuat(src) {
  const ss = bocBinhLuan(src);
  const soDong = (off) => ss.slice(0, off).split('\n').length;
  const luat = [];
  const nganXep = [];
  let i = 0;
  while (i < ss.length) {
    const c = ss[i];
    if (c === '}') { nganXep.pop(); i++; continue; }
    if (c === '{') { i++; continue; }
    let j = i;
    while (j < ss.length && ss[j] !== '{' && ss[j] !== '}' && ss[j] !== ';') j++;
    const truoc = ss.slice(i, j).trim();
    if (ss[j] === '{') {
      if (truoc.startsWith('@')) { nganXep.push({ dieuKien: truoc }); i = j + 1; continue; }
      let k = j + 1, sau = 1;
      while (k < ss.length && sau > 0) { if (ss[k] === '{') sau++; else if (ss[k] === '}') sau--; k++; }
      const than = ss.slice(j + 1, k - 1);
      const media = nganXep.filter(n => n.dieuKien.startsWith('@media'))
                           .map(n => n.dieuKien).join(' AND ') || null;
      const props = [];
      for (const d of than.split(';')) {
        const m = d.match(/^\s*([-a-zA-Z]+)\s*:\s*([\s\S]+)$/);
        if (!m) continue;
        props.push({ ten: m[1].trim().toLowerCase(), gt: m[2].trim(), quanTrong: /!important/.test(m[2]) });
      }
      for (const sel of truoc.split(',')) {
        const s = sel.trim().replace(/\s+/g, ' ');
        if (s) luat.push({ sel: s, props, media, dau: i, dong: soDong(i) });
      }
      i = k; continue;
    }
    if (ss[j] === '}') nganXep.pop();
    i = j + 1;
  }
  return luat;
}

/* ---- Độ ưu tiên (id, lớp, thẻ) -------------------------------------------
   `::phần-tử-giả` tính như một THẺ, `:lớp-giả` tính như một LỚP — đúng luật
   CSS. `:is()/:where()` không dùng trong tệp này; nếu mai có, phải sửa chỗ
   này trước khi tin con số. */
export function doUuTien(sel) {
  const s = sel.replace(/::?[a-z-]+(\([^)]*\))?/g, m => m.startsWith('::') ? ' PSEUDOEL ' : ' PSEUDOCLS ');
  const id = (s.match(/#[-\w]+/g) || []).length;
  const cls = (s.match(/\.[-\w]+/g) || []).length
            + (s.match(/\[[^\]]*\]/g) || []).length
            + (s.match(/PSEUDOCLS/g) || []).length;
  const tag = (s.replace(/#[-\w]+|\.[-\w]+|\[[^\]]*\]|PSEUDOCLS/g, '').match(/\b[a-zA-Z][-\w]*\b/g) || []).length
            + (s.match(/PSEUDOEL/g) || []).length;
  return [id, cls, tag];
}
const soSanh = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);

/* ---- Tìm khai báo chết --------------------------------------------------- */
export function timLuatChet(src) {
  const luat = tachLuat(src);
  const nen = new Map();
  for (const l of luat) {
    if (l.media) continue;
    if (!nen.has(l.sel)) nen.set(l.sel, []);
    nen.get(l.sel).push(l);
  }
  const chet = [];
  for (const l of luat) {
    if (!l.media) continue;
    const ut = doUuTien(l.sel);
    for (const p of l.props) {
      if (p.quanTrong) continue;          // `!important` thắng luật thường đứng sau
      const de = (nen.get(l.sel) || []).filter(n =>
        n.dau > l.dau &&
        n.props.some(q => q.ten === p.ten && !q.quanTrong) &&
        soSanh(doUuTien(n.sel), ut) >= 0);
      if (!de.length) continue;
      const n = de[0];
      const q = n.props.find(x => x.ten === p.ten);
      /* Cùng giá trị thì luật chết KHÔNG đổi hành vi — thừa, không sai. Ghi ra
         để dọn, nhưng không làm đỏ cổng: đỏ vì một thứ vô hại là dạy người ta
         bỏ qua màu đỏ. */
      const doiHanhVi = p.gt.replace(/\s+/g, '') !== q.gt.replace(/\s+/g, '');
      chet.push({ sel: l.sel, prop: p.ten, gtMedia: p.gt, gtNen: q.gt, media: l.media,
                  dongMedia: l.dong, dongNen: n.dong, doiHanhVi,
                  utMedia: ut.join(','), utNen: doUuTien(n.sel).join(',') });
    }
  }
  const tongKhaiBaoMedia = luat.filter(l => l.media).reduce((s, l) => s + l.props.length, 0);
  return { chet, tongKhaiBaoMedia, tongLuat: luat.length };
}

/* ==========================================================================
   ĐỐI CHỨNG — BÀN ĐO PHẢI TỰ CHỨNG MINH TRƯỚC KHI ĐI CHẤM NGƯỜI KHÁC
   ========================================================================== */
const MAU = [
  { ten: 'BẨN · cùng selector, cùng độ ưu tiên, nền đứng sau',
    css: `@media (max-width: 1100px) { thead th { white-space: normal; } }\nthead th { white-space: nowrap; }`,
    phaiBat: true },
  { ten: 'BẨN · nền đứng sau và độ ưu tiên CAO HƠN',
    css: `@media (max-width: 640px) { .a { color: red; } }\nbody .a { color: blue; }\n.a { color: blue; }`,
    phaiBat: true },
  { ten: 'SẠCH · luật nền đứng TRƯỚC khối @media',
    css: `thead th { white-space: nowrap; }\n@media (max-width: 1100px) { thead th { white-space: normal; } }`,
    phaiBat: false },
  { ten: 'SẠCH · luật trong @media có độ ưu tiên cao hơn luật nền đứng sau',
    css: `@media (max-width: 1100px) { table thead th { white-space: normal; } }\nthead th { white-space: nowrap; }`,
    phaiBat: false },
  { ten: 'SẠCH · luật trong @media có !important',
    css: `@media (max-width: 640px) { .a { color: red !important; } }\n.a { color: blue; }`,
    phaiBat: false }
];

console.log('=== ĐỐI CHỨNG BÀN ĐO (BH-16) ============================================');
let banHong = 0;
for (const m of MAU) {
  const { chet } = timLuatChet(m.css);
  const bat = chet.length > 0;
  const dat = bat === m.phaiBat;
  if (!dat) banHong++;
  console.log(`  ${dat ? '✅' : '❌'} ${m.ten} → ${bat ? 'BẮT' : 'không bắt'} (cần ${m.phaiBat ? 'BẮT' : 'không bắt'})`);
}
if (banHong) {
  console.log(`\n❌ BÀN ĐO HỎNG: ${banHong}/${MAU.length} mẫu đối chứng sai. Không chấm tệp thật.`);
  process.exit(2);
}

/* ==========================================================================
   QUÉT TỆP THẬT
   ========================================================================== */
const tep = process.argv[2] ? path.resolve(process.argv[2]) : TEP_MAC_DINH;
const { chet, tongKhaiBaoMedia, tongLuat } = timLuatChet(readFileSync(tep, 'utf8'));

console.log(`\n=== QUÉT ${path.relative(GOC, tep) || tep} ===================================`);
console.log(`  ${tongLuat} luật · ${tongKhaiBaoMedia} khai báo nằm trong @media`);

const mienTru = new Map(MIEN_TRU.map(m => [m.khoa, m.lyDo]));
const batBuoc = [], thua = [], boQua = [];
for (const c of chet) {
  const khoa = `${c.sel} | ${c.prop}`;
  if (mienTru.has(khoa)) { boQua.push({ c, lyDo: mienTru.get(khoa) }); continue; }
  (c.doiHanhVi ? batBuoc : thua).push(c);
}

const in1 = (c) => `dòng ${c.dongMedia} [${c.media}]  ${c.sel} { ${c.prop}: ${c.gtMedia} }\n` +
  `        ↳ bị dòng ${c.dongNen}  ${c.sel} { ${c.prop}: ${c.gtNen} }  đè (ưu tiên ${c.utMedia} vs ${c.utNen}, đứng sau nên thắng)`;

if (batBuoc.length) {
  console.log(`\n❌ ${batBuoc.length} khai báo CHẾT VÀ ĐỔI HÀNH VI — luật viết ra mà chưa bao giờ chạy:`);
  for (const c of batBuoc) console.log('   · ' + in1(c));
  console.log('\n   CÁCH CHỮA: thêm một tên thẻ vào selector trong @media để thắng độ ưu tiên');
  console.log('   (`thead th` → `table thead th`), hoặc dời luật nền lên TRƯỚC khối @media.');
}
if (thua.length) {
  console.log(`\n⚠️  ${thua.length} khai báo chết nhưng CÙNG GIÁ TRỊ (thừa, không đổi hành vi):`);
  for (const c of thua) console.log('   · ' + in1(c));
}
for (const b of boQua) console.log(`\n  (miễn trừ) ${b.c.sel} | ${b.c.prop} — ${b.lyDo}`);

console.log('\n--- PHẠM VI ĐÃ SOI ------------------------------------------------------');
console.log('  CÓ soi : khai báo trong @media bị luật nền CÙNG SELECTOR đứng sau đè.');
console.log('  KHÔNG soi: selector KHÁC nhau mà khớp cùng phần tử (vd `.cot-chu` bị');
console.log('             `td.cot-chu` đè) — cần cây DOM thật mới biết, máy này không đoán.');
console.log('  Nên con số dưới đây là SÀN DƯỚI, không phải trần.');

if (batBuoc.length) {
  console.log(`\n❌ TRƯỢT — còn ${batBuoc.length} luật CSS chết.`);
  process.exit(1);
}
console.log(`\n✅ ĐẠT — 0 luật chết đổi hành vi / ${tongKhaiBaoMedia} khai báo trong @media` +
            (thua.length ? ` (${thua.length} chỗ thừa, không đổi hành vi)` : ''));
