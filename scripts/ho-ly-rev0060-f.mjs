/* ==========================================================================
   MẨU DÒ HỒ LY — FILE QUÁ 20.000 DÒNG THÌ PHẢI TỪ CHỐI TO TIẾNG
   ---------------------------------------------------------------------------
   HỒ LY TỰ SỬA (vòng 4). Bản trước gọi thẳng `docBangTuByte` rồi in kết quả,
   nên khi bộ đọc bảng làm ĐÚNG — ném `LoiDocBang` "File có nhiều hơn 20.000
   dòng" — mẩu dò này CHẾT giữa chừng với một vệt stack trace. Người xây đọc
   ra đúng: cái "chết" ấy chính là hành vi ĐÚNG, và đăng ký nguyên bản đó vào
   `package.json` là biến mẩu dò thành một cổng có tên mà chạy là đỏ.
   Nhưng vứt đi thì mất một chốt thật: lớp lỗi đáng sợ ở đây KHÔNG phải "từ
   chối" mà là "CẮT IM LẶNG" — đọc 20.000 dòng đầu, im lặng bỏ 5.000 dòng
   cuối, báo thành công. Tồn kho thiếu 5.000 mã mà không ai biết.
   Nên đảo lại: bắt lấy câu từ chối và ĐÒI nó phải to tiếng + nói ra con số.
   Đỏ khi và chỉ khi có cắt im lặng.  MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nap = await import(pathToFileURL(path.join(GOC, 'src', 'nap-du-lieu.js')).href);

const THAT = 25000;
let s = 'Mã SKU,Số lượng tồn\n';
for (let i = 1; i <= THAT; i++) s += `SP-${i},10\n`;

let dat = 0, truot = 0;
const ok = (ten, dung, ct = '') => {
  if (dung) { dat++; console.log(`  ✓ ${ten}${ct ? ' — ' + ct : ''}`); }
  else { truot++; console.log(`  ✗ ${ten}${ct ? ' — ' + ct : ''}`); }
};

console.log(`\n══ FILE ${THAT.toLocaleString('vi-VN')} DÒNG (trần của bộ đọc là 20.000) ══`);

let bang = null, loi = null;
try { bang = await nap.docBangTuByte(new TextEncoder().encode(s), 'to.csv'); }
catch (e) { loi = e; }

if (loi) {
  console.log(`    · câu từ chối: ${loi.message}`);
  ok('Từ chối hẳn, không đọc nửa vời', true);
  ok('Câu từ chối có CON SỐ để Sếp biết phải chia file ra sao',
     /20[.\s]?000|\d{2}\.\d{3}/.test(loi.message), loi.message.slice(0, 80));
  ok('Và chỉ đường đi tiếp (chia nhỏ / nạp nhiều lần)',
     /chia nhỏ|nhiều lần|tách/i.test(loi.message));
} else {
  const doc = bang.luoi.length - 1;
  console.log(`    · dòng đọc được: ${doc} / ${THAT} · cảnh báo: ${JSON.stringify(bang.canhBao)}`);
  ok('KHÔNG cắt im lặng — đọc thiếu thì phải nói ra',
     doc >= THAT || (bang.canhBao || []).some(c => /\d/.test(c) && /dòng/i.test(c)),
     `đọc ${doc}, thiếu ${THAT - doc} dòng mà cảnh báo = ${JSON.stringify(bang.canhBao)}`);
  const kb = nap.kiemBang(bang, { ma_sku: 0, so_luong: 1 }, 'ton_kho');
  console.log(`    · kiemBang: banGhi=${kb.banGhi.length} · soDongDoc=${kb.soDongDoc} · loi=${kb.loi.length}`);
}

console.log('\n' + '='.repeat(70));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) { console.log('❌ ĐỎ — có cắt im lặng'); process.exit(1); }
console.log('✅ XANH');
