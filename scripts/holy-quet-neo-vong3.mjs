/* ==========================================================================
   HỒ LY · vòng 3 — QUÉT NEO CHẾT ĐỘC LẬP
   ---------------------------------------------------------------------------
   Người xây khai: 105 tệp · 64 chuỗi neo · đúng 1 neo chết (đã sửa).
   File này quét lại từ đầu, KHÔNG dùng máy quét của họ: mọi chuỗi ≥ 20 ký tự
   đứng làm đối số ĐẦU của .replace( / .indexOf( / .includes( / .lastIndexOf(
   trong scripts/**, rồi hỏi: chuỗi đó có CÒN TỒN TẠI trong src/** hay
   public/** không. Neo không còn tồn tại = ca đối chứng ngừng canh mà bàn đo
   vẫn báo xanh (REV-0061 · CAO-3).
   ========================================================================== */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const liet = (goc, ra = []) => {
  for (const t of readdirSync(goc)) {
    if (t === 'node_modules' || t === '.git') continue;
    const p = path.join(goc, t);
    if (statSync(p).isDirectory()) liet(p, ra);
    else if (/\.(mjs|js|html|css)$/.test(t)) ra.push(p);
  }
  return ra;
};

/* Neo KHÔNG chỉ trỏ vào src/ và public/: `do-quyen-duyet-gopy` neo vào
   `scripts/dat-lai-mat-khau.mjs`. Bỏ sót scripts/ là tự đẻ ra ba báo oan. */
const tepNguon = [...liet(path.join(GOC, 'src')), ...liet(path.join(GOC, 'public')), ...liet(path.join(GOC, 'scripts'))]
  .filter(p => !/node_modules|\.min\.js|qrcode-lib|html5-qrcode/.test(p));
const noiNguon = new Map(tepNguon.map(p => [p, readFileSync(p, 'utf8')]));

const tepBan = liet(path.join(GOC, 'scripts'));
/* LƯỜI (`{20,}?`) chứ không tham: tham thì một lời gọi `.replace('A','B')`
   viết trên hai dòng bị nuốt trọn cả hai đối số thành MỘT chuỗi — và chuỗi
   dài ngoằng ấy dĩ nhiên "không tìm thấy trong nguồn". Đúng ba báo oan tôi
   vừa tự tạo ra. */
const RE = /\.(?:replace|replaceAll|indexOf|lastIndexOf|includes|split)\(\s*(['"])((?:\\.|(?!\1)[^\\]){20,}?)\1/g;

let soNeo = 0; const chet = [];
for (const p of tepBan) {
  const noi = readFileSync(p, 'utf8');
  let m;
  while ((m = RE.exec(noi))) {
    let chuoi;
    try { chuoi = JSON.parse(m[1] === '"' ? `"${m[2]}"` : `"${m[2].replace(/"/g, '\\"')}"`); }
    catch { continue; }
    // Chỉ tính chuỗi TRÔNG NHƯ MÃ NGUỒN (có dấu ngoặc / chấm phẩy / dấu bằng)
    if (!/[(){};=]/.test(chuoi)) continue;
    soNeo++;
    const song = [...noiNguon.entries()].some(([, s]) => s.includes(chuoi));
    if (!song) chet.push({ tep: path.relative(GOC, p), dong: noi.slice(0, m.index).split('\n').length, chuoi });
  }
}

console.log(`\nQUÉT NEO — ${tepBan.length} tệp bàn đo · ${tepNguon.length} tệp nguồn · ${soNeo} chuỗi neo`);
if (!chet.length) console.log('  ✅ KHÔNG có neo chết: mọi chuỗi neo đều còn tồn tại trong src/ hoặc public/.');
else {
  console.log(`  ❌ ${chet.length} NEO CHẾT:`);
  for (const c of chet) console.log(`     ${c.tep}:${c.dong}  «${c.chuoi.slice(0, 110)}»`);
}
