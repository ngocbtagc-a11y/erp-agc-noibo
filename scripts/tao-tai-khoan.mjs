/* ==========================================================================
   Tạo tài khoản ADMIN đầu tiên cho CRM
   ---------------------------------------------------------------------------
   Chỉ tạo DUY NHẤT 1 tài khoản admin. Mọi nhân sự và tài khoản khác, Sếp tự
   thêm sau trong tab "Quản trị" của web (thêm người → tạo tài khoản).

   Tên đăng nhập = SỐ ĐIỆN THOẠI (chỉ lấy chữ số).

   Chạy:  node scripts/tao-tai-khoan.mjs
   Việc nó làm:
     1. Sinh mật khẩu ngẫu nhiên mạnh cho admin
     2. Băm mật khẩu (không lưu dạng đọc được)
     3. Ghi seed.sql (xoá sạch dữ liệu cũ, chỉ còn 1 admin)
     4. In mật khẩu ra màn hình — CHỈ MỘT LẦN
   ========================================================================== */

import { webcrypto as crypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';

/* ====================== SẾP SỬA Ở ĐÂY ======================================
   Đổi số điện thoại thành SỐ THẬT của người làm admin (đây cũng là tên đăng
   nhập). Có thể đổi tên/chức vụ nếu muốn.
   vai_tro phải là 'giam_doc' hoặc 'pho_giam_doc' thì mới có quyền quản trị. */
const ADMIN = {
  ho_ten:        'Bùi Thị Ngọc',
  chuc_vu:       'Phó Giám đốc',
  bo_phan:       'Ban giám đốc',
  vai_tro:       'pho_giam_doc',       // 'giam_doc' hoặc 'pho_giam_doc'
  so_dien_thoai: '0900000000',         // ⚠ ĐỔI THÀNH SỐ THẬT — đây là tên đăng nhập
  email:         ''                    // để trống cũng được
};
/* =========================================================================== */

const SO_VONG = 210000;

/* ---- Băm mật khẩu (khớp y hệt src/auth.js) ------------------------------ */

function sangBase64(buf) {
  return Buffer.from(new Uint8Array(buf)).toString('base64');
}

async function bamMatKhau(matKhau) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const khoa = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(matKhau), 'PBKDF2', false, ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: SO_VONG, hash: 'SHA-256' }, khoa, 256
  );
  return `pbkdf2$${SO_VONG}$${sangBase64(salt)}$${sangBase64(hash)}`;
}

/* Mật khẩu dễ đọc nhưng khó đoán — bỏ ký tự dễ nhìn nhầm (0/O, 1/l/I) */
function sinhMatKhau(doDai = 12) {
  const bang = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(doDai));
  return Array.from(b, x => bang[x % bang.length]).join('');
}

function nhayDon(s) {
  return s === null || s === undefined || s === '' ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
}

function vietTat(hoTen) {
  const tu = String(hoTen).trim().split(/\s+/).filter(Boolean);
  return tu.slice(-2).map(t => t[0].toUpperCase()).join('') || '?';
}

/* ---- Chạy --------------------------------------------------------------- */

const tenDangNhap = String(ADMIN.so_dien_thoai).replace(/\D/g, '');   // chỉ lấy chữ số

if (tenDangNhap.length < 3) {
  console.error('\n  ✖ Số điện thoại chưa hợp lệ. Sửa ADMIN.so_dien_thoai trong file này.\n');
  process.exit(1);
}
if (ADMIN.vai_tro !== 'giam_doc' && ADMIN.vai_tro !== 'pho_giam_doc') {
  console.error('\n  ✖ vai_tro phải là giam_doc hoặc pho_giam_doc để có quyền quản trị.\n');
  process.exit(1);
}

const matKhau = sinhMatKhau();
const hash = await bamMatKhau(matKhau);
const id = 'ns_admin';

const sql = [
  '-- Sinh tự động bởi scripts/tao-tai-khoan.mjs — KHÔNG sửa tay',
  '-- Xoá sạch dữ liệu cũ, chỉ để lại 1 tài khoản admin.',
  '',
  'DELETE FROM phien;',
  'DELETE FROM lan_dang_nhap_hong;',
  'DELETE FROM tai_khoan;',
  'DELETE FROM nhan_su;',
  '',
  `INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, sdt, email, quan_ly_id, phap_nhan, trang_thai, ngay_vao, luong) VALUES (` +
    `${nhayDon(id)}, ${nhayDon(ADMIN.ho_ten)}, ${nhayDon(vietTat(ADMIN.ho_ten))}, ${nhayDon(ADMIN.chuc_vu)}, ` +
    `${nhayDon(ADMIN.bo_phan)}, ${nhayDon(ADMIN.so_dien_thoai)}, ${nhayDon(ADMIN.email)}, NULL, ` +
    `'Công ty', 'da_ky', NULL, NULL);`,
  '',
  `INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mk) VALUES (` +
    `${nhayDon(id)}, ${nhayDon(tenDangNhap)}, ${nhayDon(hash)}, ${nhayDon(ADMIN.vai_tro)}, 1);`,
  ''
].join('\n');

writeFileSync('seed.sql', sql, 'utf8');

console.log('\n  Đã ghi seed.sql (chỉ 1 tài khoản admin, chứa hash không chứa mật khẩu thô)\n');
console.log('  ╔══════════════════════════════════════════════════════════════╗');
console.log('  ║  TÀI KHOẢN ADMIN — MẬT KHẨU CHỈ HIỆN MỘT LẦN                ║');
console.log('  ║  Chép ra, cất kỹ, rồi đóng cửa sổ này.                       ║');
console.log('  ╚══════════════════════════════════════════════════════════════╝\n');
console.log(`   Người dùng:      ${ADMIN.ho_ten} (${ADMIN.chuc_vu})`);
console.log(`   Tên đăng nhập:   ${tenDangNhap}   ← số điện thoại`);
console.log(`   Mật khẩu:        ${matKhau}`);
console.log('\n   (Đăng nhập lần đầu sẽ bị bắt đổi mật khẩu ngay.)');
console.log('\n  Nạp vào database:');
console.log('     npm run nap-db        (bản thật trên Cloudflare)');
console.log('     npm run nap-db-may    (bản chạy thử ở máy)\n');
console.log('  Xong rồi, mọi nhân sự khác Sếp thêm trong tab "Quản trị" của web.\n');
