// ==========================================================================
// Chạy 1 migration AN TOÀN: thực thi file .sql rồi TỰ GHI vào schema_migrations.
// Thay cho gọi "wrangler d1 execute --file=..." trực tiếp — làm vậy dễ QUÊN
// ghi nhận, dẫn đến sự cố "deploy code rồi mà không nhớ đã nạp DB chưa".
//
// Dùng:
//   node scripts/chay-migration.mjs <ten-file.sql>            (mặc định --local)
//   node scripts/chay-migration.mjs <ten-file.sql> --remote   (lên bản thật)
//
// Cần đã nạp migrations/them-schema-migrations.sql trước (tạo bảng theo dõi).
// ==========================================================================
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const tenFile = process.argv[2];
const moiTruong = process.argv.includes('--remote') ? '--remote' : '--local';

if (!tenFile) {
  console.error('Thiếu tên file. Dùng: node scripts/chay-migration.mjs <ten-file.sql> [--remote]');
  process.exit(1);
}

const duongDan = `migrations/${tenFile}`;
if (!existsSync(duongDan)) {
  console.error(`Không tìm thấy ${duongDan}`);
  process.exit(1);
}

function chay(lenh) {
  execSync(lenh, { stdio: 'inherit' });
}

console.log(`\n>> [1/2] Chạy ${duongDan}  (${moiTruong === '--remote' ? 'BẢN THẬT' : 'máy'})...\n`);
chay(`npx wrangler d1 execute crm-agc ${moiTruong} --file=${duongDan}`);

console.log(`\n>> [2/2] Ghi nhận vào schema_migrations...\n`);
const tenAnToan = tenFile.replace(/'/g, "''");
chay(`npx wrangler d1 execute crm-agc ${moiTruong} --command "INSERT OR IGNORE INTO schema_migrations (filename) VALUES ('${tenAnToan}')"`);

console.log(`\n✅ Xong: ${tenFile} đã chạy và được ghi nhận trên ${moiTruong === '--remote' ? 'bản thật' : 'máy'}.\n`);
