import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nap = await import(pathToFileURL(path.join(GOC, 'src', 'nap-du-lieu.js')).href);
let s = 'Mã SKU,Số lượng tồn\n';
for (let i = 1; i <= 25000; i++) s += `SP-${i},10\n`;
const b = await nap.docBangTuByte(new TextEncoder().encode(s), 'to.csv');
console.log('dòng đọc được :', b.luoi.length - 1, '(file thật có 25.000)');
console.log('cảnh báo      :', JSON.stringify(b.canhBao));
const kb = nap.kiemBang(b, { ma_sku: 0, so_luong: 1 }, 'ton_kho');
console.log('kiemBang      : banGhi=', kb.banGhi.length, '· soDongDoc=', kb.soDongDoc, '· loi=', kb.loi.length);
console.log('⇒', (b.canhBao || []).some(c => /20\.?000|dòng/i.test(c))
  ? '✅ có nói ra vết cắt' : '❌ CẮT IM LẶNG — 5.000 dòng cuối biến mất, không một câu nào');
