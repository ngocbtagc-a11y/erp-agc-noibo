/* ==========================================================================
   BÀN THỬ GIAO DIỆN — SPEC-0007 Đợt 2·3·4
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tu-kiem-giao-dien-0007.mjs
   Không cần trình duyệt, không cần dev server.

   Kiểm những thứ mà đọc bằng mắt hay bỏ sót và chỉ lộ ra lúc chạy thật:
   ① `id` trùng nhau trong app.html — `$('#x')` sẽ lấy nhầm phần tử, và lỗi
     này im lặng tuyệt đối cho tới khi ai đó bấm nhầm ô.
   ② Mọi `$('#...')` mà JS đụng tới đều CÓ THẬT trong HTML.
   ③ BH-19: phần tử điều khiển bằng `hidden` thì KHÔNG được khai `display`
     trong CSS, không thì `.hidden = true` chạy mà không ẩn được gì.
   ④ RÀNG BUỘC CỦA BẢN GIAO VIỆC: không đụng `src/quyen.js`.
   Kèm ca đối chứng cố ý sai cho từng phép (BH-16).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

let dat = 0, hong = 0;
const loi = [];
function kiem(ten, thuc, mong) {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) { dat++; return; }
  hong++; loi.push(`  ✗ ${ten}\n      được : ${a}\n      cần   : ${b}`);
}

const goc = new URL('../', import.meta.url);
const html = readFileSync(new URL('public/app.html', goc), 'utf8');
const js = readFileSync(new URL('public/assets/js/app.js', goc), 'utf8');
const css = readFileSync(new URL('public/assets/css/style.css', goc), 'utf8');

/* --- ① id trùng ---------------------------------------------------------- */
{
  const ds = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dem = new Map();
  for (const id of ds) dem.set(id, (dem.get(id) || 0) + 1);
  const trung = [...dem].filter(([, n]) => n > 1).map(([id]) => id);
  kiem('không có id nào trùng trong app.html', trung, []);
  kiem('ĐỐI CHỨNG · phép đếm CÓ THỂ bắt được trùng', (() => {
    const d = new Map(); for (const id of [...ds, ds[0]]) d.set(id, (d.get(id) || 0) + 1);
    return [...d].filter(([, n]) => n > 1).map(([i]) => i);
  })(), [ds[0]]);
}

/* --- ② mọi $('#id') của SPEC-0007 đều có thật trong HTML ------------------ */
{
  const coTrongHtml = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  /* Chỉ soi các tiền tố do đợt này thêm — soi cả tệp sẽ đụng những id được
     tạo động bằng innerHTML ở nơi khác, ra báo động giả (BH-29: phép kiểm
     phải tự chứng minh được nó đo đúng thứ nó nghĩ). */
  const tienTo = /^#(kn|jd|nsSua-jd|nsSua-kn|nsSua-sinhnhat|snCongKhai|ns-vieccanlam)/;
  const dung = [...js.matchAll(/\$\('(#[A-Za-z0-9_-]+)'\)/g)].map(m => m[1]);
  const thieu = [...new Set(dung.filter(s => tienTo.test(s)))]
    .filter(s => !coTrongHtml.has(s.slice(1)));
  kiem('mọi id SPEC-0007 mà JS đụng tới đều có trong HTML', thieu, []);
  kiem('ĐỐI CHỨNG · id bịa ra thì phép kiểm bắt được',
    ['#knKhongTonTai'].filter(s => !coTrongHtml.has(s.slice(1))), ['#knKhongTonTai']);
}

/* --- ③ BH-19: `hidden` vs `display` -------------------------------------- */
{
  /* Những phần tử đợt này bật/tắt bằng `.hidden` trong JS. Nếu CSS khai
     `display` cho chính selector đó thì luật của trang thắng luật mặc định
     của trình duyệt, và `hidden` chạy mà không ẩn được gì. */
  const cssSach = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const canKiem = ['.ns-vieccanlam', '.kn-tieuchuan'];
  const pham = canKiem.filter(sel => {
    // Bắt khối luật của ĐÚNG selector đó (không bắt selector con).
    const re = new RegExp('(^|[},])\\s*' + sel.replace('.', '\\.') + '\\s*\\{([^}]*)\\}', 'm');
    const m = cssSach.match(re);
    return m && /(^|[;\s])display\s*:/.test(m[2]);
  });
  kiem('phần tử điều khiển bằng hidden KHÔNG khai display (BH-19)', pham, []);
  kiem('ĐỐI CHỨNG · phép kiểm bắt được nếu có khai display', (() => {
    const gia = cssSach + '\n.ns-vieccanlam { display: flex; }';
    const re = /(^|[},])\s*\.ns-vieccanlam\s*\{([^}]*)\}/gm;
    return [...gia.matchAll(re)].some(m => /(^|[;\s])display\s*:/.test(m[2]));
  })(), true);

  // Các nhóm gập dùng <details>, KHÔNG dùng hidden — nên khai display thoải mái.
  kiem('nhóm gập JD/năng lực dùng <details>, không dùng hidden',
    /<details class="jd-khoi"/.test(html) && /<details class="kn-tra"/.test(html), true);
}

/* --- ④ Ràng buộc: KHÔNG đụng src/quyen.js -------------------------------- */
{
  /* So với `4f91cd2` (gốc nhánh), KHÔNG so `4f91cd2..HEAD`: dạng hai chấm chỉ
     nhìn phần ĐÃ COMMIT, nên một vi phạm còn nằm trong cây làm việc sẽ lọt.
     Đo bằng mutant: thêm một câu `UPDATE` vào bảng bị cấm rồi CHƯA commit —
     bản `..HEAD` in "25 đạt · 0 hỏng", bản này bắt được. Cổng chưa thử cho nó
     chặn thật thì coi như chưa có cổng (BH-23/BH-28). */
  const repo = decodeURIComponent(new URL('.', goc).pathname).replace(/^\//, '');
  const dienBien = execSync('git diff --name-only 4f91cd2', { cwd: repo })
    .toString().split('\n').map(s => s.trim()).filter(Boolean);
  kiem('KHÔNG đụng src/quyen.js', dienBien.includes('src/quyen.js'), false);
  kiem('KHÔNG đụng src/ca.js', dienBien.includes('src/ca.js'), false);
  /* Rule 13 cấm SỬA bảng `gop_y` / `cong_viec`. Kiểm bằng NỘI DUNG dòng
     thêm mới, không kiểm bằng TÊN FILE: `them-mota-congviec.sql` có chữ
     "congviec" trong tên nhưng không đụng bảng `cong_viec` một dòng nào —
     kiểm theo tên là báo động giả, đúng loại BH-29. Bỏ chú thích trước khi
     quét, không thì phép kiểm đo chú thích. */
  /* ⚠️ BH-24 — nghiệm thu bằng `grep` thì CHÍNH BÀI KIỂM cũng bị `grep`.
     Bản đầu của phép kiểm này viết nguyên văn câu `UPDATE cong_viec ...` làm
     ca đối chứng, và lượt chạy kế tiếp nó tự bắt chính mình: dòng đó nằm
     trong diff. Nên ① mẫu nhận diện GHÉP TỪ MẢNH (đừng "dọn dẹp" dòng này),
     ② miễn trừ chính tệp bàn thử, và nói rõ đã miễn trừ gì. */
  const BANG_CAM = ['cong', 'viec'].join('_') + '|' + ['gop', 'y'].join('_');
  const MAU_GHI = new RegExp(
    '\\b(ALTER\\s+TABLE|INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+(' + BANG_CAM + ')\\b', 'i');

  // Tách diff theo file để miễn trừ đúng một tệp, không miễn trừ cả lượt.
  const khoiFile = execSync('git diff -U0 4f91cd2', { cwd: repo }).toString().split('\ndiff --git ');
  const themVao = [];
  for (const khoi of khoiFile) {
    if (/scripts\/tu-kiem-giao-dien-0007\.mjs/.test(khoi.split('\n')[0] || '')) continue;  // miễn trừ
    for (const d of khoi.split('\n')) {
      if (!d.startsWith('+') || d.startsWith('+++')) continue;
      const noi = d.slice(1);
      if (/^\s*(--|\/\/|\*|\/\*)/.test(noi)) continue;    // bỏ chú thích (BH-29)
      themVao.push(noi);
    }
  }
  kiem('KHÔNG có câu SQL nào ghi vào bảng bị cấm (Rule 13)', themVao.filter(d => MAU_GHI.test(d)), []);
  kiem('ĐỐI CHỨNG · mẫu nhận diện CÓ THỂ bắt được câu như vậy',
    MAU_GHI.test('  UPDATE ' + ['cong', 'viec'].join('_') + ' SET x = 1'), true);
  kiem('ĐỐI CHỨNG · và diff đã quét KHÔNG rỗng (rỗng thì mọi phép trên vô nghĩa)',
    themVao.length > 50, true);
  kiem('ĐỐI CHỨNG · danh sách file KHÔNG rỗng (nếu rỗng thì 3 phép trên vô nghĩa)',
    dienBien.length > 0, true);
}

/* --- BH-32: kiểm một cột thì kiểm CẢ HAI CHIỀU --------------------------
   Trước đợt này `ngay_sinh` chỉ có chiều GHI (đúng một chỗ, lúc nhận hồ sơ
   mới) và không có chiều ĐỌC nào — cột chỉ có chiều ghi là tính năng chết mà
   trông như đang chạy. Cả Đợt 2 dựa lên cột này, nên phải chứng minh sau đợt
   này nó có ĐỦ: đọc · sửa · và một chỗ để người dùng nhập. */
{
  const idx = readFileSync(new URL('src/index.js', goc), 'utf8');
  kiem('ngay_sinh có đường ĐỌC (SELECT)', /SELECT[^;]*\bngay_sinh\b/i.test(idx), true);
  kiem('ngay_sinh có đường SỬA (UPDATE)', /UPDATE nhan_su SET ngay_sinh/i.test(idx), true);
  kiem('có tuyến API sửa ngày sinh', /'POST \/api\/nhan-su\/ngay-sinh'/.test(idx), true);
  kiem('có Ô NHẬP ngày sinh trong hồ sơ', /id="nsSua-ngaysinh"/.test(html), true);
  kiem('và giao diện thật sự gọi đường lưu đó', /API\.nsNgaySinhLuu\(/.test(js), true);
  kiem('ĐỐI CHỨNG · phép kiểm bắt được cột không tồn tại',
    /UPDATE nhan_su SET khong_co_cot_nay/i.test(idx), false);
}

/* --- Thêm: mọi migration của đợt này phải LÙI ĐƯỢC ------------------------ */
for (const f of ['them-sinhnhat-congkhai.sql', 'them-mota-congviec.sql', 'them-ky-nang.sql']) {
  const sql = readFileSync(new URL('migrations/' + f, goc), 'utf8');
  kiem(`${f} có ghi cách LÙI LẠI`, /LÙI LẠI|rollback/i.test(sql), true);
  const sach = sql.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '');
  kiem(`${f} không DROP/DELETE/UPDATE ở phần thi hành`,
    /\b(DROP|DELETE|UPDATE)\b/i.test(sach), false);
}

console.log(loi.join('\n'));
console.log(`\n${dat} đạt · ${hong} hỏng\n`);
process.exit(hong ? 1 : 0);
