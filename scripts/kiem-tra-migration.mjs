// ==========================================================================
// Kiểm tra migration nào TRÊN Ổ ĐĨA (thư mục migrations/) CHƯA được ghi nhận
// là đã chạy trên D1 — chạy lệnh này bất cứ lúc nào để biết chắc trước khi
// deploy, khỏi rơi vào sự cố "code mới cần bảng/cột mới nhưng quên nạp DB".
//
// Dùng:
//   node scripts/kiem-tra-migration.mjs            (mặc định kiểm tra BẢN THẬT --remote)
//   node scripts/kiem-tra-migration.mjs --local     (kiểm tra máy)
// ==========================================================================
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const moiTruong = process.argv.includes('--local') ? '--local' : '--remote';

const treenOdia = readdirSync('migrations').filter(f => f.endsWith('.sql')).sort();

let daGhiNhan = [];
try {
  const raw = execSync(
    `npx wrangler d1 execute crm-agc ${moiTruong} --command "SELECT filename FROM schema_migrations ORDER BY filename"`,
    { encoding: 'utf8' }
  );
  const jsonBatDau = raw.indexOf('[');
  const kq = JSON.parse(raw.slice(jsonBatDau));
  daGhiNhan = (kq[0]?.results || []).map(r => r.filename);
} catch (e) {
  console.error('\n❌ Không đọc được bảng schema_migrations.');
  console.error('   Đã nạp migrations/them-schema-migrations.sql trên môi trường này chưa?');
  console.error(`   npx wrangler d1 execute crm-agc ${moiTruong} --file=migrations/them-schema-migrations.sql\n`);
  process.exit(1);
}

const chuaChay = treenOdia.filter(f => !daGhiNhan.includes(f));
const moCoi = daGhiNhan.filter(f => !treenOdia.includes(f));

console.log(`\nMôi trường: ${moiTruong === '--remote' ? 'BẢN THẬT (remote)' : 'máy (local)'}`);
console.log(`File trên ổ đĩa: ${treenOdia.length} · Đã ghi nhận đã chạy: ${daGhiNhan.length}\n`);

if (chuaChay.length) {
  console.log(`⚠️  CÓ ${chuaChay.length} MIGRATION CHƯA CHẠY trên ${moiTruong === '--remote' ? 'bản thật' : 'máy'}:`);
  chuaChay.forEach(f => console.log('   - ' + f));
  console.log(`\n   Chạy từng file:  node scripts/chay-migration.mjs <ten-file.sql> ${moiTruong}\n`);
} else {
  console.log('✅ Không còn migration nào chưa chạy — an toàn để deploy code mới.\n');
}

if (moCoi.length) {
  console.log('ℹ️  Đã ghi nhận đã chạy nhưng không còn thấy file (đổi tên/xoá?), chỉ để biết:');
  moCoi.forEach(f => console.log('   - ' + f));
  console.log('');
}

process.exit(chuaChay.length ? 1 : 0);
