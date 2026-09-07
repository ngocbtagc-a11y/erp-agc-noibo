/* Hồ Ly vòng 2 — thử bộ đọc bảng trên FILE THẬT mà bàn đo của người xây CHƯA thử.
   CHỈ ĐỌC. Không sửa, không xoá, không di dời một file nào. */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nap = await import(pathToFileURL(path.join(GOC, 'src', 'nap-du-lieu.js')).href);

const DS = [
  'C:/Users/Admin/Desktop/Nhap_khau_combo.xlsx',
  'C:/Users/Admin/Downloads/Order.cancelled.20260701_20260801_part_1_of_3.xlsx',
  'C:/Users/Admin/Downloads/Income_16-31.07_LOC_MST_0111392419.xlsx',
  'C:/Users/Admin/Downloads/Bảng Lương T7.2026.xlsx',
  'C:/Users/Admin/Downloads/Order.failed_delivery.20260701_20260801.xlsx',
  'C:/Users/Admin/Desktop/Income(16-30.7).xlsx'
];
for (const d of DS) {
  const ten = d.split('/').pop();
  if (!existsSync(d)) { console.log(`— ${ten}: không có`); continue; }
  const kb = (statSync(d).size / 1024).toFixed(0);
  if (statSync(d).size > 8 * 1024 * 1024) { console.log(`— ${ten} (${kb} KB): vượt trần 8 MB, ERP từ chối (đúng thiết kế)`); continue; }
  const t0 = Date.now();
  try {
    const b = await nap.docBangTuByte(new Uint8Array(readFileSync(d)), ten, { demDong: true });
    console.log(`\n✔ ${ten} (${kb} KB, ${Date.now() - t0} ms)`);
    console.log(`   bảng   : ${(b.dsBang || []).map(s => `${s.ten} (${s.so_dong})`).join(' | ')}`);
    console.log(`   đọc    : “${b.tenBang}” · ${b.cot.length} cột × ${b.dong.length} dòng`);
    console.log(`   cột    : ${JSON.stringify(b.cot.slice(0, 6))}`);
    if ((b.canhBao || []).length) b.canhBao.forEach(c => console.log(`   ⚠ ${String(c).slice(0, 130)}`));
    // Gợi ý ghép cột có bậy không
    const g = nap.goiYGhep(b.cot, 'san_pham');
    console.log(`   gợi ý ghép danh mục: ${JSON.stringify(g)}`);
  } catch (e) {
    console.log(`\n✖ ${ten} (${kb} KB, ${Date.now() - t0} ms) → ${e.name}: ${String(e.message).slice(0, 160)}`);
  }
}
