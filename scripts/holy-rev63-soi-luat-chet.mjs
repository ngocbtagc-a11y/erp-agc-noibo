/* Đếm lớp "luật CSS trong @media bị luật nền đứng SAU đè chết".
   Chạy: node soi-luat-chet.mjs <duong-dan-style.css> */
import { readFileSync } from 'node:fs';

const duong = process.argv[2];
const src = readFileSync(duong, 'utf8');

/* ---- Tách khối: đi ký tự một, đếm ngoặc, nhớ mình đang ở trong @media nào ---- */
function bocBinhLuan(s) {
  // giữ nguyên độ dài để offset -> số dòng vẫn đúng
  return s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}
const ss = bocBinhLuan(src);

function soDong(off) { return ss.slice(0, off).split('\n').length; }

const luat = []; // {sel, props:[{ten,gt,quanTrong}], media, dau, cuoi}
let i = 0;
const nganXep = []; // {loai:'media'|'sup', dieuKien}
while (i < ss.length) {
  const c = ss[i];
  if (c === '}') { nganXep.pop(); i++; continue; }
  if (c === '{') { i++; continue; }
  // đọc tới '{' hoặc '}' hoặc ';'
  let j = i;
  while (j < ss.length && ss[j] !== '{' && ss[j] !== '}' && ss[j] !== ';') j++;
  const truoc = ss.slice(i, j).trim();
  if (ss[j] === '{') {
    if (truoc.startsWith('@')) {
      nganXep.push({ loai: 'at', dieuKien: truoc });
      i = j + 1; continue;
    }
    // khối khai báo
    let k = j + 1, sau = 1;
    while (k < ss.length && sau > 0) { if (ss[k] === '{') sau++; else if (ss[k] === '}') sau--; k++; }
    const than = ss.slice(j + 1, k - 1);
    const media = nganXep.filter(n => n.dieuKien.startsWith('@media')).map(n => n.dieuKien).join(' AND ') || null;
    const props = [];
    than.split(';').forEach(d => {
      const m = d.match(/^\s*([-a-zA-Z]+)\s*:\s*([\s\S]+)$/);
      if (!m) return;
      props.push({ ten: m[1].trim().toLowerCase(), gt: m[2].trim(), quanTrong: /!important/.test(m[2]) });
    });
    truoc.split(',').forEach(sel => {
      luat.push({ sel: sel.trim().replace(/\s+/g, ' '), props, media, dau: i, dong: soDong(i) });
    });
    i = k; continue;
  }
  if (ss[j] === '}') { nganXep.pop(); }   // đóng khối @ — PHẢI pop
  i = j + 1;
}

/* ---- Độ ưu tiên ---- */
function doUuTien(sel) {
  let s = sel.replace(/::?[a-z-]+(\([^)]*\))?/g, m => {
    // giả lớp như :hover tính như lớp; phần tử giả ::before tính như thẻ
    return m.startsWith('::') ? ' PSEUDOEL ' : ' PSEUDOCLS ';
  });
  const id = (s.match(/#[-\w]+/g) || []).length;
  const cls = (s.match(/\.[-\w]+/g) || []).length
    + (s.match(/\[[^\]]*\]/g) || []).length
    + (s.match(/PSEUDOCLS/g) || []).length;
  const tag = (s.replace(/#[-\w]+|\.[-\w]+|\[[^\]]*\]|PSEUDOCLS/g, '')
    .match(/\b[a-zA-Z][-\w]*\b/g) || []).length
    + (s.match(/PSEUDOEL/g) || []).length;
  return [id, cls, tag];
}
function soSanh(a, b) {
  for (let n = 0; n < 3; n++) if (a[n] !== b[n]) return a[n] - b[n];
  return 0;
}

/* ---- Tìm ---- */
const nenTheoSel = new Map(); // sel -> [luat nền]
luat.filter(l => !l.media).forEach(l => {
  if (!nenTheoSel.has(l.sel)) nenTheoSel.set(l.sel, []);
  nenTheoSel.get(l.sel).push(l);
});

const chet = [];
luat.filter(l => l.media).forEach(l => {
  const ut = doUuTien(l.sel);
  const ungVien = nenTheoSel.get(l.sel) || [];
  l.props.forEach(p => {
    if (p.quanTrong) return;
    const de = ungVien.filter(n => n.dau > l.dau && n.props.some(q => q.ten === p.ten && !q.quanTrong)
      && soSanh(doUuTien(n.sel), ut) >= 0);
    if (de.length) {
      const n = de[0];
      const q = n.props.find(x => x.ten === p.ten);
      chet.push({ sel: l.sel, prop: p.ten, gtMedia: p.gt, gtNen: q.gt,
        media: l.media, dongMedia: l.dong, dongNen: n.dong,
        utMedia: ut.join(','), utNen: doUuTien(n.sel).join(',') });
    }
  });
});

console.log('=== LUẬT TRONG @media BỊ LUẬT NỀN ĐỨNG SAU ĐÈ CHẾT (cùng selector) ===');
console.log('Tổng số khai báo trong @media:',
  luat.filter(l => l.media).reduce((s, l) => s + l.props.length, 0));
console.log('Số khai báo CHẾT:', chet.length);
console.log('');
chet.forEach(c => {
  const cungGt = c.gtMedia.replace(/\s+/g,'') === c.gtNen.replace(/\s+/g,'');
  console.log(`${cungGt ? '(vô hại: cùng giá trị) ' : '!! '}` +
    `dòng ${c.dongMedia} [${c.media}] ${c.sel} { ${c.prop}: ${c.gtMedia} }  ` +
    `<-- bị dòng ${c.dongNen} ${c.sel} { ${c.prop}: ${c.gtNen} } (ut ${c.utMedia} vs ${c.utNen}) đè`);
});
const thatSuChet = chet.filter(c => c.gtMedia.replace(/\s+/g,'') !== c.gtNen.replace(/\s+/g,''));
console.log('');
console.log('=> CHẾT VÀ ĐỔI HÀNH VI (giá trị khác nhau):', thatSuChet.length);

if (process.env.GO) {
  console.log('--- DEBUG: mọi luật có selector "thead th" ---');
  luat.filter(l => l.sel === 'thead th').forEach(l =>
    console.log(l.dong, JSON.stringify(l.media), l.props.map(p=>p.ten+':'+p.gt).join(' | ')));
}

if (process.env.TK) {
  const m = new Map();
  luat.filter(l => l.media).forEach(l => m.set(l.media, (m.get(l.media)||0)+l.props.length));
  console.log('--- khai báo theo từng @media ---');
  [...m.entries()].forEach(([k,v]) => console.log(v, k));
  console.log('tổng luật (mọi loại):', luat.length, '· luật nền:', luat.filter(l=>!l.media).length);
}
