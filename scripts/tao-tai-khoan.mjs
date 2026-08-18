/* ==========================================================================
   Tạo (các) tài khoản ADMIN đầu tiên cho ERP
   ---------------------------------------------------------------------------
   Chỉ tạo các tài khoản admin liệt kê trong ADMINS bên dưới. Mọi nhân sự và
   tài khoản khác, admin tự thêm sau trong tab "Quản trị" của web.

   Tên đăng nhập = SỐ ĐIỆN THOẠI (chỉ lấy chữ số).

   Chạy:  node scripts/tao-tai-khoan.mjs
     1. Sinh mật khẩu ngẫu nhiên mạnh cho mỗi admin
     2. Băm mật khẩu (không lưu dạng đọc được)
     3. Ghi seed.sql (xoá sạch dữ liệu cũ, chỉ còn các admin này)
     4. In mật khẩu ra màn hình — CHỈ MỘT LẦN
   ========================================================================== */

import { webcrypto as crypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';

/* ====================== SẾP SỬA Ở ĐÂY ======================================
   Mỗi dòng là một admin. Đổi số điện thoại thành SỐ THẬT (đây là tên đăng nhập).
   vai_tro: 'giam_doc' hoặc 'pho_giam_doc' — cả hai đều có quyền quản trị. */
const ADMINS = [
  {
    ho_ten:        'Bùi Thị Ngọc',
    chuc_vu:       'Phó Giám đốc',
    bo_phan:       'Ban giám đốc',
    vai_tro:       'pho_giam_doc',
    so_dien_thoai: '0911994696',
    email:         ''
  },
  {
    ho_ten:        'Nguyễn Duy Phong',
    chuc_vu:       'Giám đốc',
    bo_phan:       'Ban giám đốc',
    vai_tro:       'giam_doc',
    so_dien_thoai: '0945923368',
    email:         ''
  }
];
/* =========================================================================== */

const SO_VONG = 100000;   // TRẦN của Cloudflare Workers — không đặt cao hơn (xem src/auth.js)

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

/* ---- Kiểm tra cấu hình --------------------------------------------------- */

const dong = [
  '-- Sinh tự động bởi scripts/tao-tai-khoan.mjs — KHÔNG sửa tay',
  '-- Xoá sạch dữ liệu cũ, chỉ để lại các tài khoản admin.',
  '',
  'DELETE FROM phien;',
  'DELETE FROM lan_dang_nhap_hong;',
  'DELETE FROM tai_khoan;',
  'DELETE FROM nhan_su;',
  ''
];

const daIn = [];
const tenDaDung = new Set();

for (let i = 0; i < ADMINS.length; i++) {
  const a = ADMINS[i];
  const ten = String(a.so_dien_thoai).replace(/\D/g, '');

  if (ten.length < 3) {
    console.error(`\n  ✖ Admin #${i + 1} (${a.ho_ten}): số điện thoại chưa hợp lệ.\n`);
    process.exit(1);
  }
  if (tenDaDung.has(ten)) {
    console.error(`\n  ✖ Số điện thoại ${ten} bị trùng giữa hai admin.\n`);
    process.exit(1);
  }
  tenDaDung.add(ten);
  if (a.vai_tro !== 'giam_doc' && a.vai_tro !== 'pho_giam_doc') {
    console.error(`\n  ✖ Admin #${i + 1}: vai_tro phải là giam_doc hoặc pho_giam_doc.\n`);
    process.exit(1);
  }

  const id = 'ns_admin' + (i + 1);
  const matKhau = sinhMatKhau();
  const hash = await bamMatKhau(matKhau);

  dong.push(
    `INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, sdt, email, quan_ly_id, phap_nhan, trang_thai, ngay_vao, luong) VALUES (` +
      `${nhayDon(id)}, ${nhayDon(a.ho_ten)}, ${nhayDon(vietTat(a.ho_ten))}, ${nhayDon(a.chuc_vu)}, ` +
      `${nhayDon(a.bo_phan)}, ${nhayDon(a.so_dien_thoai)}, ${nhayDon(a.email)}, NULL, ` +
      `'Công ty', 'da_ky', NULL, NULL);`
  );
  dong.push(
    `INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mk) VALUES (` +
      `${nhayDon(id)}, ${nhayDon(ten)}, ${nhayDon(hash)}, ${nhayDon(a.vai_tro)}, 1);`
  );
  dong.push('');

  daIn.push({ ho_ten: a.ho_ten, chuc_vu: a.chuc_vu, ten, matKhau });
}

writeFileSync('seed.sql', dong.join('\n') + '\n', 'utf8');

console.log(`\n  Đã ghi seed.sql (${daIn.length} tài khoản admin, chứa hash không chứa mật khẩu thô)\n`);
console.log('  ╔══════════════════════════════════════════════════════════════╗');
console.log('  ║  TÀI KHOẢN ADMIN — MẬT KHẨU CHỈ HIỆN MỘT LẦN                ║');
console.log('  ║  Chép ra, gửi riêng từng người, rồi đóng cửa sổ này.         ║');
console.log('  ╚══════════════════════════════════════════════════════════════╝\n');
for (const t of daIn) {
  console.log(`   ${t.ho_ten} (${t.chuc_vu})`);
  console.log(`      Đăng nhập: ${t.ten}   ← số điện thoại`);
  console.log(`      Mật khẩu:  ${t.matKhau}\n`);
}
console.log('   (Đăng nhập lần đầu sẽ bị bắt đổi mật khẩu ngay.)\n');
console.log('  Nạp vào database:');
console.log('     npm run nap-db        (bản thật trên Cloudflare)');
console.log('     npm run nap-db-may    (bản chạy thử ở máy)\n');
console.log('  Mọi nhân sự khác thêm trong tab "Quản trị" của web.\n');
