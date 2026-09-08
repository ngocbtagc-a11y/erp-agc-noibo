/* Đếm mảnh HTML CHẾT trong app.html: id có trong HTML mà KHÔNG file JS nào nhắc
   tới, và panel `hidden` không có JS nào mở. Hồ Ly · REV-0061. */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const html = readFileSync(path.join(GOC, 'public/app.html'), 'utf8');
let js = '';
const duyet = (d) => {
  for (const t of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, t.name);
    if (t.isDirectory()) duyet(p);
    else if (/\.(js|mjs)$/.test(t.name)) js += readFileSync(p, 'utf8');
  }
};
duyet(path.join(GOC, 'public/assets/js'));
js += readFileSync(path.join(GOC, 'public/app.html'), 'utf8').replace(/<[^>]*id="[^"]*"[^>]*>/g, '');

const ids = [...html.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)].map(m => m[1]);
const chet = ids.filter(id => !js.includes(id));

/* Khối `hidden` cấp panel không có JS nào gỡ hidden */
const khoi = [...html.matchAll(/<div class="panel"[^>]*\shidden[^>]*>([\s\S]{0,400}?)<\/div>/g)]
  .map(m => (m[1].match(/<h4>([^<]*)<\/h4>/) || [, '(không tiêu đề)'])[1].trim());

console.log('Tổng id khai trong app.html      :', ids.length);
console.log('Id KHÔNG file JS nào nhắc tới    :', chet.length);
console.log(chet.join(' · '));
console.log('\nPanel `hidden` cứng trong HTML   :', khoi.length);
console.log(khoi.map(k => '· ' + k).join('\n'));

/* Ô nhập nằm trong đám id chết */
const oChet = chet.filter(id => new RegExp(`id="${id}"[^>]*>`).test(html) &&
  /<(input|textarea|select)[^>]*id="/.test(html.slice(Math.max(0, html.indexOf(`id="${id}"`) - 200), html.indexOf(`id="${id}"`) + 5)));
console.log('\nTrong đó là Ô NHẬP (input/textarea/select):', oChet.length);
console.log(oChet.join(' · '));
