/* ==========================================================================
   SOI MÁY BÓC CHÚ THÍCH VIẾT LẠI — Hồ Ly, REV-0057 vòng 3
   ---------------------------------------------------------------------------
   `lamSachMa` được viết lại thành máy trạng thái có ngăn xếp. Đây là MÃ MỚI,
   chưa ai soi, và nó là nền của HAI bàn đo (`③e` soi đối số thừa, và cả bản
   kiểm kê ba rổ). Máy bóc sai một chỗ là hai bàn kia mù im lặng ở đúng chỗ đó.

   Ba dạng tôi gài — hai dạng đã giết bản trước, và một dạng THỨ BA của tôi:
     ① regex literal (chứa dấu nháy · chứa dấu huyền · chứa `/` trong `[…]` ·
        phép chia trông giống regex)
     ② chuỗi mẫu lồng nhau nhiều tầng, có regex bên trong `${…}`
     ③ MỚI: chú thích và chuỗi chứa NGOẶC LỆCH, dấu nháy lẻ, dấu chú thích giả

   ⚠️ MỌI DẤU HUYỀN TRONG MẨU THỬ ĐỀU DỰNG BẰNG `String.fromCharCode(96)`.
   Vòng đầu tôi viết thẳng dấu huyền vào một chuỗi mẫu của chính tệp này —
   ra một mẩu mã KHÔNG hợp lệ (`\` + dấu huyền`), và bàn soi báo đỏ 4 chỗ trong
   khi máy bóc chẳng sai gì. Đó là lần thứ năm phép đo của tôi suýt báo oan.
   Mẩu thử phải là mã THẬT, không thì đang đo lỗi của chính mình.

   Chạy:  node scripts/soi-may-boc.mjs
   ========================================================================== */

import { lamSachMa, soiDongBiXoaOan, soiDoiSoThua } from './lib/soi-doi-so-thua.mjs';

const BT = String.fromCharCode(96);      // dấu huyền
const NH = String.fromCharCode(39);      // dấu nháy đơn
const L = (...d) => d.join('\n') + '\n';

let dat = 0, truot = 0;
const ok = (ten, dung, chiTiet = '') => {
  if (dung) { dat++; console.log(`  ✅ ${ten}` + (chiTiet ? `  — ${chiTiet}` : '')); }
  else { truot++; console.log(`  ❌ ${ten}` + (chiTiet ? `  — ${chiTiet}` : '')); }
};

/** Sau khi bóc: số dòng phải giữ nguyên, dòng `MOC_NEO` phải còn nguyên chữ,
 *  và chốt tự kiểm `soiDongBiXoaOan` phải im. */
function thu(ten, ma) {
  const sach = lamSachMa(ma);
  const dongGoc = ma.split('\n'), dongSach = sach.split('\n');
  const soDongKhop = dongGoc.length === dongSach.length;
  const iNeo = dongGoc.findIndex(d => d.includes('MOC_NEO'));
  const neoConNguyen = iNeo >= 0 && dongSach[iNeo].includes('MOC_NEO');
  const oan = soiDongBiXoaOan(ma);
  ok(ten, soDongKhop && neoConNguyen && oan.length === 0,
    `số dòng ${soDongKhop ? 'khớp' : 'LỆCH ' + dongGoc.length + '→' + dongSach.length}` +
    ` · mốc neo ${neoConNguyen ? 'còn' : 'BỊ NUỐT'}` +
    ` · dòng bóc oan: ${oan.length}${oan.length ? ' (dòng ' + oan.map(x => x.ln).join(',') + ')' : ''}`);
}

console.log('\n① REGEX LITERAL — dạng đã giết bản trước');
thu('regex chứa CẢ HAI loại dấu nháy (đúng ca quet-tai-lieu.js:281)', L(
  `const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => c);`,
  `function MOC_NEO(a, b) { return a + b; }`));
thu('regex chứa dấu huyền', L(
  `const x = 'a'.replace(/[` + BT + `~]/g, '');`,
  `function MOC_NEO(a) { return a; }`));
thu('regex có dấu / nằm trong [ ]', L(
  `const y = '2026/09/04'.split(/[/-]/);`,
  `function MOC_NEO(a) { return a; }`));
thu('PHÉP CHIA trông giống regex — không được nuốt', L(
  `const a = 10, b = 2, c = 5;`,
  `const t = a / b / c;`,
  `function MOC_NEO(a) { return a; }`));
thu('phép chia rồi tới chuỗi có dấu nháy lẻ', L(
  `const ti = tong / soDon;`,
  `const nhac = "đừng để nó don't hiểu nhầm";`,
  `function MOC_NEO(a) { return a; }`));

console.log('\n② CHUỖI MẪU LỒNG NHAU — dạng đã giết bản trước');
thu('chuỗi mẫu lồng HAI tầng', L(
  `const h = ` + BT + `<div>\${n.ma ? ` + BT + ` <span>· \${esc(n.ma)}</span>` + BT + ` : ''}</div>` + BT + `;`,
  `function MOC_NEO(a) { return a; }`));
thu('chuỗi mẫu lồng BA tầng + ngoặc nhọn nằm trong chuỗi', L(
  `const h = ` + BT + `\${a ? ` + BT + `\${b ? ` + BT + `{x}` + BT + ` : '{y}'}` + BT + ` : ''}` + BT + `;`,
  `function MOC_NEO(a) { return a; }`));
thu('chuỗi mẫu chứa REGEX bên trong ${…}', L(
  `const h = ` + BT + `\${s.replace(/[` + NH + `"]/g, "")}` + BT + `;`,
  `function MOC_NEO(a) { return a; }`));
thu('chuỗi mẫu chứa LỜI GỌI HÀM trong ${…} — mã thật, không được bóc', L(
  `const h = ` + BT + `<b>\${veTen(r, 1)}</b>` + BT + `;`,
  `function MOC_NEO(a) { return a; }`));

console.log('\n③ DẠNG THỨ BA CỦA TÔI — ngoặc lệch, nháy lẻ, dấu chú thích giả');
thu('chú thích chứa ngoặc mở lẻ', L(
  `/* mở ngoặc mà không đóng: ( và { và [ — chỉ là chữ trong chú thích */`,
  `function MOC_NEO(a) { return a; }`));
thu('chú thích chứa dấu nháy lẻ', L(
  `// don't do this — dấu nháy lẻ trong chú thích một dòng`,
  `/* it's also here, and a lone " too */`,
  `function MOC_NEO(a) { return a; }`));
thu('chuỗi chứa ngoặc lệch và dấu chú thích GIẢ', L(
  `const s1 = "chuỗi có ( lệch và /* không phải chú thích */ đâu";`,
  `const s2 = 'và // cũng không phải';`,
  `function MOC_NEO(a) { return a; }`));
thu('chuỗi thường chứa dấu huyền · chuỗi mẫu chứa nháy đơn và nháy kép', L(
  `const s3 = "dùng ` + BT + ` trong chuỗi thường";`,
  `const s4 = ` + BT + `dùng ` + NH + ` và " trong chuỗi mẫu` + BT + `;`,
  `function MOC_NEO(a) { return a; }`));
thu('regex ngay sau `return` và sau `typeof`', L(
  `function f(x) { return /^[a-z]+$/.test(x); }`,
  `const g = typeof /x/;`,
  `function MOC_NEO(a) { return a; }`));
thu('chuỗi có ký tự thoát ngay trước dấu đóng', L(
  `const s5 = 'nửa vời \\\\';`,
  `const s6 = "cũng thế \\\\";`,
  `function MOC_NEO(a) { return a; }`));

console.log('\n④ CHỐT TỰ KIỂM `soiDongBiXoaOan` CÓ RĂNG KHÔNG');
{
  const maBay = L(
    `const esc = (s) => String(s).replace(/[&<>"']/g, c => c);`,
    `function BiNuot(a, b) { return a + b; }`,
    `const cungBiNuot = (x) => x * 2;`);
  /* Dựng lại ĐÚNG kiểu hỏng cũ: coi mọi dấu nháy là mở chuỗi, không hiểu regex */
  let gia = '', trong = null;
  for (const ch of maBay) {
    if (ch === '\n') { gia += '\n'; continue; }
    if (!trong && (ch === '"' || ch === NH)) { trong = ch; gia += ' '; continue; }
    if (trong && ch === trong) { trong = null; gia += ' '; continue; }
    gia += trong ? ' ' : ch;
  }
  const dongGoc = maBay.split('\n'), dongGia = gia.split('\n');
  const nuotOan = dongGoc.filter((d, i) =>
    /\b(function|const)\b/.test(d) && !(dongGia[i] || '').trim()).length;
  ok('④a dựng lại được kiểu hỏng cũ', nuotOan > 0,
    `${nuotOan} dòng mã bị máy bóc NGÂY THƠ nuốt oan`);
  ok('④b máy bóc MỚI không nuốt mẩu đó', soiDongBiXoaOan(maBay).length === 0,
    `${soiDongBiXoaOan(maBay).length} dòng oan`);
  const kq = soiDoiSoThua(maBay + 'BiNuot(1, 2, 3);\n');
  ok('④c `soiDoiSoThua` NHÌN THẤY hàm nằm SAU regex đó', kq.length > 0,
    JSON.stringify(kq[0] || null));
}

console.log(`\n══════════════════════════════════════════\nĐẠT ${dat} · TRƯỢT ${truot}\n`);
process.exit(truot ? 1 : 0);
