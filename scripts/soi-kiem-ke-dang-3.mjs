/* ==========================================================================
   GIẤU KHỐI THEO DẠNG THỨ BA — Hồ Ly, REV-0057 vòng 4
   ---------------------------------------------------------------------------
   Vòng 3 nó vá được hai dạng: khối MỘT hàm, và khối HAI hàm (`taiX()` gọi
   `veX()`). Luật mới chỉ mượn **một cấp, cùng phạm vi** — nó tự khai chỗ dừng
   đó. Bàn này hỏi: **chỗ dừng ấy là ĐÚNG, hay chỉ là TIỆN?**

   Năm dạng tôi giấu, đều GIỐNG HỆT nhau về tác dụng với người dùng (đọc
   `hoanDanhSach` — nhóm `hoan` — rồi vẽ ra màn hình, KHÔNG ai nối dây):

     ① một hàm                        ← nó đã bắt được (đối chứng dương)
     ② hai hàm, mượn MỘT cấp          ← nó đã bắt được (đối chứng dương)
     ③ BA hàm, mượn HAI cấp   A→B→C   ← đúng chỗ nó tự cắt
     ④ vẽ qua hàm TRUYỀN LÀM THAM SỐ
     ⑤ đọc trong `Promise.all`, vẽ ở `.then`

   Bàn này KHÔNG sửa mã sản phẩm: nó nối thêm mã giấu vào BẢN SAO trong bộ
   nhớ rồi chạy lại đúng phép dò của `do-kiem-ke-lam-moi.mjs`.

   Chạy:  node scripts/soi-kiem-ke-dang-3.mjs
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GOC } from './lib/ban-do-chrome.mjs';

const NL = String.fromCharCode(10);
const L = (...d) => d.join(NL);

/* Năm mẩu mã giấu. Tên hàm ĐỌC là thứ bản kiểm kê phải in ra. */
const DANG = [
  ['① một hàm (đối chứng dương)', 'giau1MotHam', L(
    'async function giau1MotHam() {',
    '  const kq = await API.hoanDanhSach();',
    "  document.querySelector('#g1').innerHTML = (kq.don_hoan || []).length;",
    '}')],

  ['② hai hàm — mượn MỘT cấp (đối chứng dương)', 'giau2Tai', L(
    'let G2 = [];',
    'function giau2Ve() {',
    "  document.querySelector('#g2').innerHTML = G2.length;",
    '}',
    'async function giau2Tai() {',
    '  const kq = await API.hoanDanhSach();',
    '  G2 = kq.don_hoan || [];',
    '  giau2Ve();',
    '}')],

  ['③ BA hàm — mượn HAI cấp (A gọi B, B gọi C vẽ)', 'giau3Tai', L(
    'let G3 = [];',
    'function giau3Ve() {',
    "  document.querySelector('#g3').innerHTML = G3.length;",
    '}',
    'function giau3Giua() {',
    '  giau3Ve();',
    '}',
    'async function giau3Tai() {',
    '  const kq = await API.hoanDanhSach();',
    '  G3 = kq.don_hoan || [];',
    '  giau3Giua();',
    '}')],

  ['④ vẽ qua hàm TRUYỀN LÀM THAM SỐ', 'giau4Tai', L(
    'let G4 = [];',
    'function giau4Ve() {',
    "  document.querySelector('#g4').innerHTML = G4.length;",
    '}',
    'function giau4Chay(xong) {',
    '  xong();',
    '}',
    'async function giau4Tai() {',
    '  const kq = await API.hoanDanhSach();',
    '  G4 = kq.don_hoan || [];',
    '  giau4Chay(giau4Ve);',
    '}')],

  ['⑤ đọc trong Promise.all, vẽ ở .then', 'giau5Tai', L(
    'function giau5Tai() {',
    '  return Promise.all([API.hoanDanhSach()]).then(function (kq) {',
    "    document.querySelector('#g5').innerHTML = (kq[0].don_hoan || []).length;",
    '  });',
    '}')]
];

/* Chạy `do-kiem-ke-lam-moi.mjs` trên một mốc GIẢ: tôi dựng một commit tạm
   trong một bản sao repo, KHÔNG đụng repo thật. Cách rẻ hơn: nối mã giấu vào
   `app.js` của mốc rồi bảo bàn kiểm kê đọc từ tệp — nhưng nó đọc bằng
   `git show`, nên phải có commit. Dùng `git commit-tree` để tạo commit RỜI,
   không nhánh nào trỏ tới, xoá được ngay sau đó. */
const MB = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: GOC }).toString().trim();
const appGoc = execFileSync('git', ['show', MB + ':public/assets/js/app.js'],
  { cwd: GOC, maxBuffer: 1 << 28 }).toString();

const tam = mkdtempSync(join(tmpdir(), 'holy-dang3-'));
function mocGia(maThem) {
  const f = join(tam, 'app.js');
  writeFileSync(f, appGoc + NL + maThem + NL, 'utf8');
  const blob = execFileSync('git', ['hash-object', '-w', f], { cwd: GOC }).toString().trim();
  /* Cây mới = cây của mốc, thay đúng một tệp. */
  const doc = execFileSync('git', ['ls-tree', '-r', MB], { cwd: GOC, maxBuffer: 1 << 28 }).toString();
  const moi = doc.split(NL).filter(Boolean).map(d =>
    d.startsWith('100644 blob') && d.endsWith('public/assets/js/app.js')
      ? `100644 blob ${blob}\tpublic/assets/js/app.js` : d).join(NL) + NL;
  const fTree = join(tam, 'tree.txt');
  writeFileSync(fTree, moi, 'utf8');
  const tree = execFileSync('git', ['mktree'], { cwd: GOC, input: moi, encoding: 'utf8' }).trim();
  return execFileSync('git', ['commit-tree', tree, '-m', 'holy-tam'],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env,
      GIT_AUTHOR_NAME: 'HoLy', GIT_AUTHOR_EMAIL: 'h@a',
      GIT_COMMITTER_NAME: 'HoLy', GIT_COMMITTER_EMAIL: 'h@a' } }).trim();
}

console.log('\nGIẤU KHỐI THEO NĂM HÌNH DẠNG — bản kiểm kê nhìn thấy mấy dạng?\n');
console.log('(mọi mẩu đều: đọc `hoanDanhSach` (nhóm `hoan`) rồi vẽ, KHÔNG ai nối dây');
console.log(' → đúng thì phải hiện ra ở RỔ A)\n');

const goc0 = execFileSync('node', ['scripts/do-kiem-ke-lam-moi.mjs', MB],
  { cwd: GOC, encoding: 'utf8', maxBuffer: 1 << 28 });
const soKhoiGoc = Number((goc0.match(/Khối hiển thị dò được\s*:\s*(\d+)/) || [])[1]);
const soAGoc = Number((goc0.match(/RỔ A — khối KHÔNG BAO GIỜ vẽ lại: (\d+)/) || [])[1]);
console.log(`Mốc sạch: ${soKhoiGoc} khối · rổ A ${soAGoc}\n`);

let bat = 0, sot = 0;
for (const [nhan, tenDoc, ma] of DANG) {
  const c = mocGia(ma);
  const ra = execFileSync('node', ['scripts/do-kiem-ke-lam-moi.mjs', c],
    { cwd: GOC, encoding: 'utf8', maxBuffer: 1 << 28 });
  const soKhoi = Number((ra.match(/Khối hiển thị dò được\s*:\s*(\d+)/) || [])[1]);
  const soA = Number((ra.match(/RỔ A — khối KHÔNG BAO GIỜ vẽ lại: (\d+)/) || [])[1]);
  const coTen = new RegExp(`· ${tenDoc}\\b`).test(ra);
  const oRoA = new RegExp(`RỔ A[\\s\\S]*?· ${tenDoc}\\b`).test(ra.split('RỔ B')[0]);
  if (coTen && oRoA) { bat++; console.log(`  ✅ ${nhan}  — TÌM RA, rổ A  (khối ${soKhoiGoc}→${soKhoi}, A ${soAGoc}→${soA})`); }
  else if (coTen) { sot++; console.log(`  ⚠️  ${nhan}  — tìm ra nhưng KHÔNG ở rổ A  (khối ${soKhoiGoc}→${soKhoi})`); }
  else { sot++; console.log(`  ❌ ${nhan}  — KHÔNG TÌM RA  (khối ${soKhoiGoc}→${soKhoi}, A ${soAGoc}→${soA})`); }
}
rmSync(tam, { recursive: true, force: true });
console.log(`\nBẮT ĐƯỢC ${bat}/5 · BỎ SÓT ${sot}/5\n`);
