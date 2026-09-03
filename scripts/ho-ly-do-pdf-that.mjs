/* ==========================================================================
   BÀN ĐO CỦA HỒ LY — BÓC CHỮ PDF TRÊN FILE THẬT (REV-0055)
   ---------------------------------------------------------------------------
   Vì sao có bàn đo này: `scripts/do-pdf-scan.mjs` mục ② đo "100,0% ký tự đúng"
   trên một file PDF DO CHÍNH NÓ dựng ra (hàm `dungPDFCoChu`) từ một chuỗi nó
   đã biết trước. Bản đối chiếu và bản đo cùng một tay làm ⇒ con số ấy chỉ nói
   "bộ bóc chữ đọc được đúng khuôn PDF mà bàn đo biết viết", không nói gì về
   file máy khác sinh ra.

   Bàn này đo ngược lại:
     · File PDF THẬT có sẵn trên máy (không tự tạo).
     · Bản đối chiếu do `pdftotext` (poppler, /mingw64/bin) sinh ra — một bộ
       bóc chữ ĐỘC LẬP, không dính dáng gì tới mã của ERP.
     · Chỉ so 8 trang đầu, vì `src/pdf-chu.js` tự cắt ở 8 trang.

   Chạy:  node scripts/ho-ly-do-pdf-that.mjs <đường dẫn thư mục hoặc file...>
   ========================================================================== */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfChu = await import('file://' + path.join(GOC, 'src/pdf-chu.js').replace(/\\/g, '/'));

/* Gom danh sách file .pdf từ tham số (file hoặc thư mục, không đệ quy sâu). */
const dsVao = process.argv.slice(2);
const dsPdf = [];
for (const v of dsVao) {
  if (!existsSync(v)) { console.log('  (bỏ qua, không có) ' + v); continue; }
  if (statSync(v).isDirectory()) {
    for (const t of readdirSync(v)) if (/\.pdf$/i.test(t)) dsPdf.push(path.join(v, t));
  } else if (/\.pdf$/i.test(v)) dsPdf.push(v);
}

/** Chuẩn hoá để so: bỏ khoảng trắng thừa, đưa về cùng dạng Unicode dựng sẵn. */
const chuan = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
/** Cắt thành từ để đo phần trăm THU HỒI (bao nhiêu từ của bản đối chiếu lấy lại được). */
const tach = (s) => chuan(s).toLowerCase().split(' ').filter(Boolean);

/** % ký tự đúng theo dãy con chung dài nhất, chạy trên 4000 ký tự đầu để không nổ. */
function tyLeKyTu(a, b) {
  a = chuan(a).slice(0, 4000); b = chuan(b).slice(0, 4000);
  if (!a.length) return 0;
  let truoc = new Uint16Array(b.length + 1), nay = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      nay[j] = a[i - 1] === b[j - 1] ? truoc[j - 1] + 1 : Math.max(truoc[j], nay[j - 1]);
    }
    [truoc, nay] = [nay, truoc]; nay.fill(0);
  }
  return truoc[b.length] / a.length;
}

const COT = (s, n) => String(s).padEnd(n).slice(0, n);
console.log('\n  FILE                                    | LOẠI        | ty_le_doc | %TỪ thu hồi | %KÝ TỰ | dấu | ms');
console.log('  ' + '-'.repeat(108));

let soCoChu = 0, soChiAnh = 0, tongTu = 0, tongKyTu = 0, soDo = 0;
const chiTiet = [];

for (const f of dsPdf) {
  const b = new Uint8Array(readFileSync(f));
  let doiChieu = '';
  try {
    doiChieu = execFileSync('pdftotext', ['-enc', 'UTF-8', '-f', '1', '-l', '8', f, '-'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch { doiChieu = ''; }

  const t0 = Date.now();
  let r;
  try { r = await pdfChu.docChuTuPDF(b); }
  catch (e) { r = { loai: 'NỔ: ' + e.message, chu: '', ty_le_doc_duoc: 0, co_dau: false }; }
  const ms = Date.now() - t0;

  const tuDC = tach(doiChieu);
  const tuTa = tach(r.chu);
  const bo = new Map();
  for (const t of tuTa) bo.set(t, (bo.get(t) || 0) + 1);
  let hit = 0;
  for (const t of tuDC) { const c = bo.get(t) || 0; if (c > 0) { hit++; bo.set(t, c - 1); } }
  const pTu = tuDC.length ? hit / tuDC.length : null;
  const pKy = tuDC.length ? tyLeKyTu(doiChieu, r.chu) : null;

  if (r.loai === 'co_lop_chu') soCoChu++; else if (r.loai === 'chi_anh') soChiAnh++;
  if (tuDC.length > 20) {           // chỉ tính trung bình trên file đối chiếu CÓ chữ
    tongTu += pTu; tongKyTu += pKy; soDo++;
  }

  console.log('  ' + COT(path.basename(f), 39) + ' | ' + COT(r.loai, 11) + ' | ' +
    COT((r.ty_le_doc_duoc * 100).toFixed(1) + '%', 9) + ' | ' +
    COT(pTu === null ? '(đ/c rỗng)' : (pTu * 100).toFixed(1) + '%', 11) + ' | ' +
    COT(pKy === null ? '—' : (pKy * 100).toFixed(1) + '%', 6) + ' | ' +
    COT(r.co_dau ? 'có' : 'KHÔNG', 3) + ' | ' + ms);

  chiTiet.push({ f, r, doiChieu, pTu, pKy });
}

console.log('\n  TỔNG: ' + dsPdf.length + ' file · co_lop_chu=' + soCoChu + ' · chi_anh=' + soChiAnh);
if (soDo) {
  console.log('  TRUNG BÌNH trên ' + soDo + ' file mà pdftotext ĐỌC RA CHỮ:');
  console.log('    · % TỪ thu hồi được : ' + (tongTu / soDo * 100).toFixed(1) + '%');
  console.log('    · % KÝ TỰ (LCS)     : ' + (tongKyTu / soDo * 100).toFixed(1) + '%');
}

/* In mẫu 3 file lệch nhất để nhìn tận mắt chữ ra thế nào. */
const lech = chiTiet.filter(c => c.pTu !== null).sort((a, b) => a.pTu - b.pTu).slice(0, 4);
for (const c of lech) {
  console.log('\n  ── ' + path.basename(c.f) + '  (thu hồi ' + (c.pTu * 100).toFixed(1) + '%)');
  console.log('     pdftotext : ' + JSON.stringify(chuan(c.doiChieu).slice(0, 150)));
  console.log('     pdf-chu.js: ' + JSON.stringify(chuan(c.r.chu).slice(0, 150)));
}
