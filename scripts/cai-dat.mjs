/* ==========================================================================
   Cài đặt CRM lên Cloudflare — chạy: npm run cai-dat
   ---------------------------------------------------------------------------
   Script này lo khâu dễ sai nhất: tạo database D1 rồi tự điền mã database
   vào wrangler.toml, thay vì bắt người dùng chép tay chuỗi mã dài.
   Chạy lại nhiều lần vẫn an toàn — database đã có thì dùng lại, không tạo mới.
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const TEN_DB = 'crm-agc';
const FILE_CAU_HINH = 'wrangler.toml';

function chay(args, imLang = false) {
  return execFileSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    shell: true,
    stdio: imLang ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'inherit']
  });
}

function thoat(thongDiep) {
  console.error('\n  ✖ ' + thongDiep + '\n');
  process.exit(1);
}

console.log('\n  Cài đặt CRM Alpha Green Commerce lên Cloudflare\n');

/* ---- 1. Đã đăng nhập Cloudflare chưa? ---------------------------------- */

let ai;
try {
  ai = chay(['whoami'], true);
} catch {
  thoat('Chưa đăng nhập Cloudflare.\n    Chạy lệnh này trước:  npx wrangler login');
}

const email = (ai.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0];
if (!email) {
  thoat('Chưa đăng nhập Cloudflare.\n    Chạy lệnh này trước:  npx wrangler login');
}
console.log('  ✓ Đã đăng nhập Cloudflare: ' + email);

/* ---- 2. Tìm hoặc tạo database ------------------------------------------ */

function timDatabase() {
  try {
    const ds = JSON.parse(chay(['d1', 'list', '--json'], true));
    const d = ds.find(x => x.name === TEN_DB);
    return d ? (d.uuid || d.database_id) : null;
  } catch {
    return null;
  }
}

let idDatabase = timDatabase();

if (idDatabase) {
  console.log('  ✓ Database "' + TEN_DB + '" đã có sẵn — dùng lại');
} else {
  console.log('  · Đang tạo database "' + TEN_DB + '"…');
  try {
    chay(['d1', 'create', TEN_DB], true);
  } catch (e) {
    thoat('Không tạo được database.\n    ' + (e.stderr || e.message || '').trim());
  }
  idDatabase = timDatabase();
  if (!idDatabase) thoat('Tạo xong nhưng không đọc được mã database. Chạy lại lệnh này thử.');
  console.log('  ✓ Đã tạo database');
}

console.log('    Mã database: ' + idDatabase);

/* ---- 3. Điền mã database vào wrangler.toml ----------------------------- */

const cauHinh = readFileSync(FILE_CAU_HINH, 'utf8');
const daCo = new RegExp(`database_id\\s*=\\s*"${idDatabase}"`).test(cauHinh);

if (daCo) {
  console.log('  ✓ wrangler.toml đã đúng mã database rồi');
} else {
  const moi = cauHinh.replace(
    /database_id\s*=\s*"[^"]*"/,
    `database_id = "${idDatabase}"`
  );
  if (moi === cauHinh) {
    thoat('Không tìm thấy dòng database_id trong ' + FILE_CAU_HINH + ' để điền.');
  }
  writeFileSync(FILE_CAU_HINH, moi, 'utf8');
  console.log('  ✓ Đã điền mã database vào ' + FILE_CAU_HINH);
}

/* ---- 4. Việc còn lại --------------------------------------------------- */

console.log(`
  ────────────────────────────────────────────────────────────────
  Xong bước 1. Còn 3 bước nữa:

    npm run tao-tai-khoan     Sinh mật khẩu cho 6 người
                              ⚠ Mật khẩu CHỈ HIỆN MỘT LẦN.
                              Chép ra, gửi riêng từng người,
                              đừng gửi vào nhóm chat chung.

    npm run nap-db            Nạp database lên Cloudflare

    npm run dua-len           Đưa web lên mạng
                              → xong sẽ hiện địa chỉ dạng
                                ${TEN_DB}.<tài-khoản>.workers.dev
  ────────────────────────────────────────────────────────────────
`);
