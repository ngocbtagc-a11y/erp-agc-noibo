/* ==========================================================================
   MÁY QUÉT: LUẬT CSS TRONG `@media` BỊ LUẬT NỀN ĐỨNG SAU ĐÈ CHẾT
   ---------------------------------------------------------------------------
   Chạy:  npm run do-luat-css-chet      (node scripts/do-luat-css-chet.mjs)

   CHUYỆN. Năm lần trong ba vòng soi, cùng MỘT kiểu hỏng:

     · `@media(≤1100px) thead th { white-space: normal }` bị luật nền
       `thead th { white-space: nowrap }` đứng SAU trong tệp đè. Tiêu đề cột
       CHƯA BAO GIỜ xuống dòng ở dải 981–1100px. Hậu quả đo được @1024px:
       `kd-tq-bang` tràn +139px, `cskh-bang` +12px. (REV-0063, tìm ra bằng tay)
     · `@media(≤1100px) td.cot-chu.co-chitiet { min-width: 150px }` bị dòng
       `min-width: 190px` đứng sau đè — ĐÚNG cái luật sinh ra để cứu tràn ở
       1024px, và nó chưa từng chạy. (REV-0063 CAO-2)
     · `@media(≤640px) .chat-tin { max-width: 86% }` bị `max-width: 72%` đứng
       sau đè — trên điện thoại bong bóng chat vẫn bó 72%. (REV-0063 CAO-2)
     · `@media(≤1100px) thead th, tbody td { padding-left/right: 10px }` bị
       `thead th { padding: 11px 16px }` / `tbody td { padding: 13px 16px }` /
       `.table-wrap-cuon …{ padding: 9px|8px 16px }` đứng sau đè. Đệm đo bằng
       Chrome ở 1100·1099·1024·981 đều là **16px**, chưa bao giờ 10px — tức
       144px (12 cột × 12px) CHƯA TỪNG được lấy về ở đúng bề ngang mà cả vòng
       vá đi tìm. (REV-0063 vòng 2, CAO-1)
     · `@media(≤640px) .chat-nhap { padding-bottom: calc(… env(safe-area-inset-
       bottom)) }` bị `.chat-nhap { padding: 10px 12px }` đứng sau đè ⇒ lề an
       toàn cho tai thỏ / thanh vuốt iPhone CHƯA BAO GIỜ chạy, trên một PWA mà
       kho vận đọc chat một tay giữa ca. (REV-0063 vòng 2, CAO-1)

   Cả năm đều là LUẬT VIẾT RA RỒI KHÔNG BAO GIỜ CHẠY. Không trình duyệt nào
   báo, không cổng nào bắt, và người viết thì tin là mình đã chữa xong. Vòng
   trước tìm được ca thứ nhất BẰNG TAY rồi tuyên bố "đây là một LỚP" — mà
   chữa đúng một chỗ. Đây là cái máy để lần sau không phải tìm bằng tay nữa.

   ⚠️ HAI CA CUỐI LỌT QUA CHÍNH CÁI MÁY NÀY ở bản đầu, vì bản đầu chỉ so CÙNG
   TÊN THUỘC TÍNH: `padding` (viết GỘP) đè `padding-left` (viết RỜI) không nằm
   trong phép so ấy. Bài học ghi thẳng vào đây: một cổng khai "đã đóng cả LỚP"
   mà chỉ đóng đúng cái ca đã thấy thì vẫn là cổng mù — và phần PHẠM SOI phải
   khai đúng cái nó mù, chứ không phải khai một chỗ mù tiện nói.

   NGUYÊN LÝ. Trong CSS, khi hai luật cùng khớp một phần tử và cùng đặt một
   thuộc tính, thắng thua theo thứ tự: `!important` > độ ưu tiên > VỊ TRÍ
   TRONG TỆP (đứa sau thắng). `@media` KHÔNG cộng thêm một chút độ ưu tiên
   nào. Nên một khai báo trong `@media` là CHẾT khi có một luật nền
   (ngoài mọi `@media`) KHỚP CÙNG PHẦN TỬ, đặt CÙNG thuộc tính — TRỰC TIẾP
   hoặc QUA MỘT THUỘC TÍNH VIẾT GỘP — đứng SAU nó trong tệp và có độ ưu tiên ≥.

   PHẠM VI — NÓI THẲNG RA, ĐÂY LÀ SÀN DƯỚI CHỨ KHÔNG PHẢI TRẦN.
   Đọc kỹ mục "PHẠM VI ĐÃ SOI" mà chương trình in ra ở cuối mỗi lần chạy: nó
   liệt kê ĐỦ những chỗ máy này còn mù, không phải một chỗ chọn lọc. Con số 0
   nghĩa là "không còn ca trong phạm vi ấy", không phải "CSS sạch tuyệt đối".
   Đừng khai quá điều đo được.

   ⚠️ CA ĐỐI CHỨNG (BH-16) — MÁY QUÉT PHẢI TỰ CHỨNG MINH NÓ BẮT ĐƯỢC.
   Trước khi quét tệp thật, file này chạy chính phép quét đó trên các MẪU dựng
   sẵn trong bộ nhớ (`MAU`): mẫu BẨN phải bắt, mẫu SẠCH không được bắt oan —
   số lượng lấy thẳng từ `MAU.length`, KHÔNG viết cứng vào bình luận nữa (bản
   trước khai "bốn mẫu" trong khi mã có năm; REV-0063 vòng 2, THẤP-1).
   Sai một mẫu là dừng, mã thoát 2 — "bàn đo hỏng", không phải "mã hỏng".

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

/* ---- Chuẩn hoá selector ----------------------------------------------------
   Hai chuỗi selector KHÁC NHAU từng ký tự vẫn có thể là MỘT selector với trình
   duyệt. Bản đầu của máy này chỉ `replace(/\s+/g,' ')`, nên ba kiểu viết khác
   nhau dưới đây lọt hết — Hồ Ly gài và chứng minh được:
     · `td.a.b`  vs `td.b.a`   — thứ tự lớp trong cùng một cụm KHÔNG có nghĩa
     · `td.a>b`  vs `td.a > b` — khoảng trắng quanh combinator KHÔNG có nghĩa
     · `td.a`    vs `TD.a`     — tên THẺ trong HTML không phân biệt hoa/thường
                                 (tên LỚP và tên ID thì CÓ — không đụng vào)
   Chuẩn hoá: tách thành cụm + combinator (đếm ngoặc để `:not(.a .b)` và
   `[href*=" "]` không bị cắt nhầm), trong mỗi cụm hạ hoa tên thẻ rồi xếp các
   phần đơn theo thứ tự chữ cái. Kết quả chỉ dùng để SO KHỚP, không in ra —
   chỗ nào in cho người đọc thì vẫn in nguyên văn `sel`. */
function tachCum(sel) {
  const ra = []; let cur = '', ngoac = 0, vuong = 0;
  for (const c of sel) {
    if (ngoac === 0 && vuong === 0) {
      if (/\s/.test(c)) { if (cur) { ra.push(cur); cur = ''; } continue; }
      if (c === '>' || c === '+' || c === '~') { if (cur) { ra.push(cur); cur = ''; } ra.push(c); continue; }
    }
    if (c === '(') ngoac++; else if (c === ')') ngoac--;
    else if (c === '[') vuong++; else if (c === ']') vuong--;
    cur += c;
  }
  if (cur) ra.push(cur);
  return ra;
}

function tachDon(cum) {
  const ra = []; let cur = '', ngoac = 0, vuong = 0;
  for (let i = 0; i < cum.length; i++) {
    const c = cum[i];
    const moc = ngoac === 0 && vuong === 0 &&
                (c === '.' || c === '#' || c === '[' || (c === ':' && cum[i - 1] !== ':'));
    if (moc && cur) { ra.push(cur); cur = ''; }
    if (c === '(') ngoac++; else if (c === ')') ngoac--;
    else if (c === '[') vuong++; else if (c === ']') vuong--;
    cur += c;
  }
  if (cur) ra.push(cur);
  return ra;
}

export function chuanHoaSel(sel) {
  return tachCum(sel.trim().replace(/\s+/g, ' ')).map(cum => {
    if (/^[>+~]$/.test(cum)) return cum;
    const don = tachDon(cum).map(d =>
      /^[.#[:]/.test(d) ? d : d.toLowerCase());   // chỉ hạ hoa phần TÊN THẺ
    return don.sort().join('');
  }).join(' ');
}

/* Tách danh sách selector theo dấu phẩy mà KHÔNG cắt nhầm `:not(a, b)`. */
function tachDanhSach(s) {
  const ra = []; let cur = '', ngoac = 0, vuong = 0;
  for (const c of s) {
    if (c === ',' && ngoac === 0 && vuong === 0) { ra.push(cur); cur = ''; continue; }
    if (c === '(') ngoac++; else if (c === ')') ngoac--;
    else if (c === '[') vuong++; else if (c === ']') vuong--;
    cur += c;
  }
  ra.push(cur);
  return ra;
}

/* ==========================================================================
   VIẾT GỘP ĐÈ VIẾT RỜI
   ---------------------------------------------------------------------------
   `padding: 11px 16px` đặt lại CẢ BỐN `padding-*`, kể cả những cạnh nó không
   nhắc tên. Nên một `padding-left` trong @media đứng TRƯỚC một `padding` ở
   luật nền là CHẾT y như bị chính `padding-left` đè — chỉ khác là mắt thường
   không thấy, và bản đầu của máy này cũng không thấy.
   Bảng dưới là bảng NỞ: viết gộp → những viết rời mà nó nuốt.
   ========================================================================== */
const HOP = ['top', 'right', 'bottom', 'left'];
const NO_GOP = {
  padding:       HOP.map(h => `padding-${h}`),
  margin:        HOP.map(h => `margin-${h}`),
  inset:         [...HOP],
  'scroll-margin':  HOP.map(h => `scroll-margin-${h}`),
  'scroll-padding': HOP.map(h => `scroll-padding-${h}`),
  'border-width': HOP.map(h => `border-${h}-width`),
  'border-style': HOP.map(h => `border-${h}-style`),
  'border-color': HOP.map(h => `border-${h}-color`),
  gap:           ['row-gap', 'column-gap'],
  overflow:      ['overflow-x', 'overflow-y'],
  'place-items':   ['align-items', 'justify-items'],
  'place-content': ['align-content', 'justify-content'],
  'place-self':    ['align-self', 'justify-self'],
  'border-radius': ['border-top-left-radius', 'border-top-right-radius',
                    'border-bottom-right-radius', 'border-bottom-left-radius'],
  border: [...HOP.map(h => `border-${h}-width`), ...HOP.map(h => `border-${h}-style`),
           ...HOP.map(h => `border-${h}-color`), 'border-width', 'border-style', 'border-color',
           ...HOP.map(h => `border-${h}`)],
  'border-top':    ['border-top-width', 'border-top-style', 'border-top-color'],
  'border-right':  ['border-right-width', 'border-right-style', 'border-right-color'],
  'border-bottom': ['border-bottom-width', 'border-bottom-style', 'border-bottom-color'],
  'border-left':   ['border-left-width', 'border-left-style', 'border-left-color'],
  background: ['background-color', 'background-image', 'background-position', 'background-size',
               'background-repeat', 'background-attachment', 'background-origin', 'background-clip'],
  font: ['font-style', 'font-variant', 'font-weight', 'font-stretch', 'font-size',
         'line-height', 'font-family'],
  flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
  'flex-flow': ['flex-direction', 'flex-wrap'],
  'grid-area': ['grid-row-start', 'grid-column-start', 'grid-row-end', 'grid-column-end'],
  'grid-row':    ['grid-row-start', 'grid-row-end'],
  'grid-column': ['grid-column-start', 'grid-column-end'],
  'grid-template': ['grid-template-rows', 'grid-template-columns', 'grid-template-areas'],
  transition: ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'],
  animation: ['animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay',
              'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state'],
  outline: ['outline-width', 'outline-style', 'outline-color'],
  'list-style': ['list-style-type', 'list-style-position', 'list-style-image'],
  'text-decoration': ['text-decoration-line', 'text-decoration-color',
                      'text-decoration-style', 'text-decoration-thickness']
};
/* viết rời → viết gộp nào nuốt nó */
const GOP_CUA = new Map();
for (const [gop, roi] of Object.entries(NO_GOP))
  for (const r of roi) { if (!GOP_CUA.has(r)) GOP_CUA.set(r, []); GOP_CUA.get(r).push(gop); }

/* Tách giá trị theo khoảng trắng NGOÀI ngoặc — `calc(10px + env(x, 0px))` là
   MỘT giá trị, không phải bốn. */
function tachGiaTri(gt) {
  const ra = []; let cur = '', ngoac = 0;
  for (const c of gt.replace(/!important/g, '').trim()) {
    if (c === '(') ngoac++; else if (c === ')') ngoac--;
    if (/\s/.test(c) && ngoac === 0) { if (cur) { ra.push(cur); cur = ''; } continue; }
    cur += c;
  }
  if (cur) ra.push(cur);
  return ra;
}

/* Tính GIÁ TRỊ THẬT mà một viết gộp đặt cho một viết rời — để phân biệt
   "chết và ĐỔI hành vi" (đỏ) với "chết nhưng cùng giá trị" (chỉ thừa).
   Chỉ tính chắc chắn cho nhóm hộp 1–4 giá trị và nhóm 2 giá trị; nhóm còn lại
   (`background`, `font`, `border`, `transition`…) trả `null` = KHÔNG BIẾT, và
   chỗ gọi coi "không biết" là ĐỔI HÀNH VI. Thà đỏ oan một khai báo đã chết
   sẵn còn hơn im lặng cho qua một khai báo chết thật. */
const NHOM_HOP = new Set(['padding', 'margin', 'inset', 'scroll-margin', 'scroll-padding',
                          'border-width', 'border-style', 'border-color']);
const NHOM_HAI = { gap: ['row-gap', 'column-gap'], overflow: ['overflow-x', 'overflow-y'],
                   'place-items': ['align-items', 'justify-items'],
                   'place-content': ['align-content', 'justify-content'],
                   'place-self': ['align-self', 'justify-self'] };
export function giaTriRoiTuGop(gop, gtGop, roi) {
  const v = tachGiaTri(gtGop);
  if (NHOM_HOP.has(gop)) {
    if (!v.length || v.length > 4) return null;
    const [t, r = v[0], b = v[0], l = r] = v;
    const canh = { top: t, right: r, bottom: b, left: l };
    const m = roi.match(/^(?:border-)?(top|right|bottom|left)$|-(top|right|bottom|left)-|-(top|right|bottom|left)$/);
    const ten = m ? (m[1] || m[2] || m[3]) : null;
    return ten ? canh[ten] : null;
  }
  if (NHOM_HAI[gop]) {
    if (!v.length || v.length > 2) return null;
    const i = NHOM_HAI[gop].indexOf(roi);
    return i < 0 ? null : (v[i] ?? v[0]);
  }
  return null;
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
      for (const sel of tachDanhSach(truoc)) {
        const s = sel.trim().replace(/\s+/g, ' ');
        if (s) luat.push({ sel: s, khoaSel: chuanHoaSel(s), props, media, dau: i, dong: soDong(i) });
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

/* ---- Điều kiện @media này có PHỦ điều kiện @media kia không? ---------------
   Luật nền (không @media) phủ mọi thứ — đó là ca gốc. Nhưng một khai báo cũng
   chết khi bị một khối @media KHÁC đứng sau đè, miễn điều kiện của kẻ sau đúng
   ở mọi bề ngang mà kẻ trước đúng. Chỉ khẳng định ba trường hợp CHẮC CHẮN:
     · kẻ đè không nằm trong @media nào          → phủ
     · hai điều kiện GIỐNG HỆT nhau (kể cả cùng một khối) → phủ
     · cả hai chỉ có `max-width` và max của kẻ đè LỚN HƠN → phủ
       (đối xứng: cả hai chỉ có `min-width` và min của kẻ đè NHỎ HƠN)
   Mọi điều kiện phức tạp hơn (`min` và `max` cùng lúc, `orientation`,
   `prefers-*`, `and`/`,` nhiều vế) trả `false` = KHÔNG DÁM KHẲNG ĐỊNH, và
   được khai thẳng ở mục "KHÔNG soi". Đoán bừa chỗ này là đỏ oan. */
const chiMax = (m) => { const s = m.replace(/@media\s*/g, '').trim();
  return /^\(\s*max-width:\s*\d+px\s*\)$/.test(s) ? +/(\d+)px/.exec(s)[1] : null; };
const chiMin = (m) => { const s = m.replace(/@media\s*/g, '').trim();
  return /^\(\s*min-width:\s*\d+px\s*\)$/.test(s) ? +/(\d+)px/.exec(s)[1] : null; };
export function phuMedia(cua, keDe) {
  if (!keDe) return true;                       // luật nền phủ tất
  if (!cua) return false;                       // nền không thể bị @media đè
  if (cua === keDe) return true;                // giống hệt (kể cả cùng khối)
  const a = chiMax(cua), b = chiMax(keDe);
  if (a !== null && b !== null) return b >= a;
  const c = chiMin(cua), d = chiMin(keDe);
  if (c !== null && d !== null) return d <= c;
  return false;
}

/* ---- Tìm khai báo chết --------------------------------------------------- */
export function timLuatChet(src) {
  const luat = tachLuat(src);
  const nen = new Map();
  for (const l of luat) {
    if (!nen.has(l.khoaSel)) nen.set(l.khoaSel, []);
    nen.get(l.khoaSel).push(l);
  }
  const chet = [];
  for (const l of luat) {
    if (!l.media) continue;
    const ut = doUuTien(l.sel);
    for (const p of l.props) {
      if (p.quanTrong) continue;          // `!important` thắng luật thường đứng sau
      /* Kẻ đè có thể đặt thuộc tính này theo HAI đường:
           ① cùng tên thuộc tính                    (`padding-left` ← `padding-left`)
           ② một thuộc tính VIẾT GỘP nuốt nó        (`padding-left` ← `padding`)
         Đường ② là chỗ mù đã cho hai luật chết thật lọt qua bản đầu. */
      const ungVien = [];
      for (const n of (nen.get(l.khoaSel) || [])) {
        if (n.dau <= l.dau) continue;
        if (!phuMedia(l.media, n.media)) continue;
        if (soSanh(doUuTien(n.sel), ut) < 0) continue;
        for (const q of n.props) {
          if (q.quanTrong) continue;
          if (q.ten === p.ten) { ungVien.push({ n, q, qua: null }); continue; }
          if ((GOP_CUA.get(p.ten) || []).includes(q.ten)) ungVien.push({ n, q, qua: q.ten });
        }
      }
      if (!ungVien.length) continue;
      /* Kẻ THẮNG theo luật xếp tầng: ưu tiên cao nhất, hoà thì đứa đứng SAU.
         (Bản đầu lấy `de[0]` — đứa ĐẦU TIÊN — nên có thể báo nhầm tên kẻ đè,
         và tệ hơn là so nhầm giá trị khi quyết đỏ/vàng.) */
      let thang = ungVien[0];
      for (const uv of ungVien)
        if (soSanh(doUuTien(uv.n.sel), doUuTien(thang.n.sel)) > 0 ||
            (soSanh(doUuTien(uv.n.sel), doUuTien(thang.n.sel)) === 0 && uv.n.dau > thang.n.dau))
          thang = uv;
      const { n, q, qua } = thang;
      /* Cùng giá trị thì luật chết KHÔNG đổi hành vi — thừa, không sai. Ghi ra
         để dọn, nhưng không làm đỏ cổng: đỏ vì một thứ vô hại là dạy người ta
         bỏ qua màu đỏ.
         Với đường ② phải TÍNH ra cạnh tương ứng trước khi so; tính không ra
         (`background`, `font`, `border`…) thì coi là ĐỔI HÀNH VI — khai báo đã
         chết chắc chắn rồi, chỉ là không biết giá trị mới, và im lặng ở chỗ
         không biết thì đúng bằng không có cổng. */
      const gtHieuLuc = qua ? giaTriRoiTuGop(qua, q.gt, p.ten) : q.gt;
      const doiHanhVi = gtHieuLuc === null ||
        p.gt.replace(/\s+/g, '') !== gtHieuLuc.replace(/\s+/g, '');
      chet.push({ sel: l.sel, selNen: n.sel, prop: p.ten, gtMedia: p.gt,
                  gtNen: q.gt, propNen: q.ten, qua, gtHieuLuc, media: l.media,
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
    phaiBat: false },

  /* ---- Bốn ca dưới đây LỌT qua bản đầu. Hồ Ly gài, REV-0063 vòng 2 CAO-1.
     Giữ nguyên hình dạng ca gài, không "dịu" đi cho dễ đạt. ---------------- */
  { ten: 'BẨN · viết GỘP đè viết RỜI (`padding` nuốt `padding-right`) ← ca lọt, có lỗi THẬT',
    css: `@media (max-width: 1100px) { td { padding-right: 10px; } }\ntd { padding: 11px 16px; }`,
    phaiBat: true },
  { ten: 'BẨN · đảo thứ tự lớp trong cùng một cụm (`td.a.b` vs `td.b.a`) ← ca lọt',
    css: `@media (max-width: 640px) { td.a.b { color: red; } }\ntd.b.a { color: blue; }`,
    phaiBat: true },
  { ten: 'BẨN · khoảng trắng quanh combinator (`td.a>b` vs `td.a > b`) ← ca lọt',
    css: `@media (max-width: 640px) { td.a>b { color: red; } }\ntd.a > b { color: blue; }`,
    phaiBat: true },
  { ten: 'BẨN · hoa/thường tên THẺ (`td.a` vs `TD.a`) ← ca lọt',
    css: `@media (max-width: 640px) { td.a { color: red; } }\nTD.a { color: blue; }`,
    phaiBat: true },

  /* ---- Chống bắt oan cho đúng lớp vừa mở ---- */
  { ten: 'SẠCH · gộp đè rời nhưng TÍNH RA CÙNG GIÁ TRỊ → chỉ "thừa", không đỏ',
    css: `@media (max-width: 640px) { .a { padding-left: 12px; } }\n.a { padding: 10px 12px; }`,
    phaiBat: true, chiThua: true },
  { ten: 'SẠCH · viết gộp KHÁC NHÓM không nuốt (`margin` không đè `padding-left`)',
    css: `@media (max-width: 640px) { .a { padding-left: 10px; } }\n.a { margin: 4px; }`,
    phaiBat: false },
  { ten: 'SẠCH · nền viết RỜI không phủ hết media viết GỘP (ngoài phạm vi — xem PHẠM VI ĐÃ SOI)',
    css: `@media (max-width: 640px) { .a { padding: 10px; } }\n.a { padding-left: 4px; }`,
    phaiBat: false },
  { ten: 'SẠCH · tên LỚP phân biệt hoa/thường (`.a` KHÁC `.A`) — không được gộp nhầm',
    css: `@media (max-width: 640px) { td.a { color: red; } }\ntd.A { color: blue; }`,
    phaiBat: false },
  { ten: 'BẨN · danh sách selector — chỉ một vế bị đè',
    css: `@media (max-width: 640px) { .foo, thead th { white-space: normal; } }\nthead th { white-space: nowrap; }`,
    phaiBat: true },
  { ten: 'BẨN · @media lồng trong @supports vẫn phải soi',
    css: `@supports (display: grid) { @media (max-width: 640px) { .a { color: red; } } }\n.a { color: blue; }`,
    phaiBat: true },
  { ten: 'SẠCH · dấu phẩy nằm trong `:not(...)` không được cắt selector làm đôi',
    css: `@media (max-width: 640px) { td:not(.a, .b) { color: red; } }\ntd { color: blue; }`,
    phaiBat: false },

  /* ---- Lớp "@media bị @media PHỦ đứng sau đè" — mở thêm ở vòng này, và nó
     tìm ra ngay một luật chết thật (`.login-panel` @980px, hai luật trùng
     selector cách nhau MỘT dòng trong CÙNG khối). ------------------------- */
  { ten: 'BẨN · hai luật trùng selector trong CÙNG khối @media, đứa sau đè ← có lỗi THẬT',
    css: `@media (max-width: 980px) { .a { padding: 26px; } .a { padding: 32px; } }`,
    phaiBat: true },
  { ten: 'BẨN · @media hẹp bị @media RỘNG HƠN đứng sau phủ và đè',
    css: `@media (max-width: 700px) { .z { color: red; } }\n@media (max-width: 1200px) { .z { color: blue; } }`,
    phaiBat: true },
  { ten: 'SẠCH · @media rộng bị @media HẸP hơn đứng sau — chỉ đè MỘT PHẦN dải, không chết',
    css: `@media (max-width: 1200px) { .z { color: red; } }\n@media (max-width: 700px) { .z { color: blue; } }`,
    phaiBat: false },
  { ten: 'SẠCH · min-width và max-width không so được với nhau — không dám khẳng định',
    css: `@media (max-width: 700px) { .z { color: red; } }\n@media (min-width: 900px) { .z { color: blue; } }`,
    phaiBat: false },
  { ten: 'SẠCH · luật NỀN không thể bị một khối @media đứng sau giết',
    css: `.a { color: red; }\n@media (max-width: 700px) { .a { color: blue; } }`,
    phaiBat: false }
];

/* ==========================================================================
   TỪ ĐÂY XUỐNG LÀ PHẦN CHẠY DÒNG LỆNH — CHỈ CHẠY KHI GỌI TRỰC TIẾP.
   Người soi phải gài được lỗi vào cổng bằng CHÍNH cổng này, không phải bằng
   một bản CHÉP đã đóng băng: bản chép thì sửa cổng xong nó vẫn khai số cũ
   (đúng chuyện đã xảy ra với `holy-rev63-quet-min560.mjs`, REV-0063 vòng 2 ⑤).
   Nên `import { timLuatChet } from './do-luat-css-chet.mjs'` phải IM LẶNG.
   ========================================================================== */
const CHAY_TRUC_TIEP = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!CHAY_TRUC_TIEP) { /* nạp làm thư viện — không in, không quét, không thoát */ }
else {

console.log(`=== ĐỐI CHỨNG BÀN ĐO (BH-16) — ${MAU.length} mẫu ==================================`);
let banHong = 0;
for (const m of MAU) {
  const { chet } = timLuatChet(m.css);
  const bat = chet.length > 0;
  /* `chiThua`: phải THẤY nhưng KHÔNG được kêu đỏ — đây chính là chỗ dễ làm
     hỏng khi mở lớp viết-gộp: bắt thì dễ, bắt mà không kêu oan mới khó. */
  const do_ = chet.some(c => c.doiHanhVi);
  const dat = m.chiThua ? (bat && !do_) : (bat === m.phaiBat && (!bat || do_));
  if (!dat) banHong++;
  const canGi = m.chiThua ? 'BẮT nhưng chỉ THỪA' : (m.phaiBat ? 'BẮT và ĐỎ' : 'không bắt');
  const raGi = !bat ? 'không bắt' : (do_ ? 'BẮT và ĐỎ' : 'BẮT nhưng chỉ THỪA');
  console.log(`  ${dat ? '✅' : '❌'} ${m.ten} → ${raGi} (cần ${canGi})`);
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
  `        ↳ bị dòng ${c.dongNen}  ${c.selNen} { ${c.propNen}: ${c.gtNen} }  đè ` +
  `(ưu tiên ${c.utMedia} vs ${c.utNen}, đứng sau nên thắng)` +
  (c.qua ? `\n        ↳ QUA VIẾT GỘP \`${c.qua}\` — nó đặt lại \`${c.prop}\` thành ` +
           `${c.gtHieuLuc === null ? '(không tính được — coi như đổi hành vi)' : '`' + c.gtHieuLuc + '`'}` +
           ` dù không nhắc tên. Mắt thường không thấy chỗ này.` : '');

if (batBuoc.length) {
  console.log(`\n❌ ${batBuoc.length} khai báo CHẾT VÀ ĐỔI HÀNH VI — luật viết ra mà chưa bao giờ chạy:`);
  for (const c of batBuoc) console.log('   · ' + in1(c));
  console.log('\n   CÁCH CHỮA: thêm một tên thẻ vào selector trong @media để thắng độ ưu tiên');
  console.log('   (`thead th` → `table thead th`), hoặc dời luật nền lên TRƯỚC khối @media.');
  console.log('   Nếu kẻ đè nằm trong CÙNG khối @media (hai luật trùng selector cách nhau');
  console.log('   vài dòng) thì đừng nống ưu tiên — GỘP chúng lại, giữ giá trị đang chạy.');
  console.log('   Nếu kẻ đè dùng VIẾT GỘP, giữ viết rời trong @media (đệm dọc mỗi luật một');
  console.log('   khác, viết gộp là xoá luôn cả nó) và nống ưu tiên cho ĐỦ MỌI kẻ đè —');
  console.log('   `.table-wrap-cuon thead th` (0,1,2) không thua `table thead th` (0,0,3).');
}
if (thua.length) {
  console.log(`\n⚠️  ${thua.length} khai báo chết nhưng CÙNG GIÁ TRỊ (thừa, không đổi hành vi):`);
  for (const c of thua) console.log('   · ' + in1(c));
}
for (const b of boQua) console.log(`\n  (miễn trừ) ${b.c.sel} | ${b.c.prop} — ${b.lyDo}`);

console.log('\n--- PHẠM VI ĐÃ SOI ------------------------------------------------------');
console.log('  Danh sách này phải kể ĐỦ chỗ mù, không phải một chỗ tiện nói. Bản đầu chỉ');
console.log('  khai một chỗ mù trong khi có bốn, và hai luật CSS chết THẬT nằm ở chỗ');
console.log('  không khai (REV-0063 vòng 2, CAO-1). Thêm phép soi thì phải sửa mục này.');
console.log('');
console.log('  CÓ soi — khai báo trong @media bị một luật ĐỨNG SAU, ưu tiên ≥, đè:');
console.log('    · kẻ đè là luật NỀN (ngoài mọi @media) cùng selector.');
console.log('    · kẻ đè nằm trong một @media PHỦ nó: giống hệt điều kiện (kể cả cùng một');
console.log('      khối), hoặc cả hai chỉ có max-width và max của kẻ đè lớn hơn (đối xứng');
console.log('      cho min-width). Hàm `phuMedia()` là chỗ khai điều đó.');
console.log('    · hai selector viết KHÁC ký tự mà cùng nghĩa: đảo thứ tự lớp');
console.log('      (`td.a.b` = `td.b.a`), khoảng trắng quanh `> + ~`, hoa/thường tên THẺ.');
console.log('    · kẻ đè dùng VIẾT GỘP nuốt viết rời (`padding` nuốt `padding-left`) —');
console.log('      bảng NO_GOP trong tệp này liệt kê các nhóm.');
console.log('    · @media lồng trong @supports; danh sách selector ngăn bằng dấu phẩy.');
console.log('');
console.log('  KHÔNG soi (và đây là ĐỦ những gì tôi biết mình không soi):');
console.log('    ① selector KHÁC nhau mà khớp cùng phần tử (vd `.cot-chu` bị `td.cot-chu`');
console.log('       đè) — cần cây DOM thật mới biết, máy này không đoán.');
console.log('       Hồ Ly đếm 0 ca trong ERP hôm nay (REV-0063 vòng 2).');
console.log('    ② chiều NGƯỢC: media viết GỘP bị nền viết RỜI đè — đó là chết MỘT PHẦN');
console.log('       (`padding` vẫn sống ở ba cạnh kia), không phải khai báo chết hẳn.');
console.log('    ③ giá trị của viết gộp ở nhóm không tính được (`background`, `font`,');
console.log('       `border`, `transition`…): biết là CHẾT, không biết giá trị mới —');
console.log('       máy kêu ĐỎ ở đó, có thể đỏ oan khi thật ra trùng giá trị.');
console.log('    ④ điều kiện @media phức tạp hơn một `max-width`/`min-width` đơn:');
console.log('       min+max cùng lúc, `orientation`, `prefers-*`, nhiều vế `and`/dấu phẩy.');
console.log('       `phuMedia()` trả false ở đó — thà bỏ sót còn hơn đỏ oan.');
console.log('    ⑤ `:is()/:where()`, biến CSS (`var()`), `@layer`, `@scope`, và thứ tự');
console.log('       trong `:not(...)` — chưa dùng trong tệp này; dùng thì phải sửa máy');
console.log('       TRƯỚC khi tin con số.');
console.log('    ⑥ luật nền bị luật nền đứng sau đè — máy này chỉ chấm khai báo NẰM TRONG');
console.log('       @media, đúng như tên nó.');
console.log('    ⑦ tệp CSS khác và CSS nội tuyến trong HTML — máy chỉ đọc MỘT tệp.');
console.log('  Nên con số dưới đây là SÀN DƯỚI, không phải trần.');

if (batBuoc.length) {
  console.log(`\n❌ TRƯỢT — còn ${batBuoc.length} luật CSS chết.`);
  process.exit(1);
}
console.log(`\n✅ ĐẠT — 0 luật chết đổi hành vi / ${tongKhaiBaoMedia} khai báo trong @media` +
            (thua.length ? ` (${thua.length} chỗ thừa, không đổi hành vi)` : ''));

}   /* hết CHAY_TRUC_TIEP */
