/* ==========================================================================
   Tạo tài khoản ban đầu cho CRM
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tao-tai-khoan.mjs
   Việc nó làm:
     1. Sinh mật khẩu ngẫu nhiên mạnh cho từng người
     2. Băm mật khẩu (PBKDF2-SHA256, cùng cách với máy chủ)
     3. Ghi file seed.sql để nạp vào database
     4. In bảng mật khẩu ra màn hình — CHỈ HIỆN MỘT LẦN DUY NHẤT
   Mật khẩu KHÔNG được ghi vào file nào cả. Sếp chép ra, gửi riêng cho từng
   người, rồi đóng cửa sổ này. Ai cũng bị bắt đổi mật khẩu ở lần đăng nhập đầu.
   ========================================================================== */

import { webcrypto as crypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';

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

/* ---- Sinh mật khẩu dễ đọc nhưng khó đoán --------------------------------
   Bỏ các ký tự dễ nhìn nhầm: 0/O, 1/l/I. Nhân sự kho đọc qua điện thoại
   cũng không nhầm được.                                                    */
function sinhMatKhau(doDai = 14) {
  const bang = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(doDai));
  return Array.from(b, x => bang[x % bang.length]).join('');
}

/* ---- Nhân sự & tài khoản ------------------------------------------------ */

const NHAN_SU = [
  // id,   họ tên,             vt,   chức vụ,               bộ phận,       quản lý, pháp nhân, trạng thái,     ngày vào,  lương
  ['ns01', 'Nguyễn Duy Phong',  'NP', 'Giám đốc',            'Ban giám đốc', null,   'Công ty', 'da_ky',        '01/2025', null],
  ['ns02', 'Bùi Thị Ngọc',      'BN', 'Phó Giám đốc',        'Ban giám đốc', null,   'Công ty', 'da_ky',        '01/2025', null],
  ['ns03', 'Phạm Khương Duy',   'PD', 'Quản lý kho',         'Kho vận',      'ns02', 'Công ty', 'da_ky',        '03/2025', 22000000],
  ['ns04', 'Phan Thị Hằng',     'PH', 'Kế toán trưởng',      'Kế toán',      'ns02', 'Công ty', 'da_ky',        '01/2025', 25000000],
  ['ns05', 'Vũ Lan Hương',      'VH', 'Hành chính nhân sự',  'HCNS',         'ns02', 'Công ty', 'thu_viec',     '05/2026', 11000000],
  ['ns06', 'Nguyễn Thị Huyền',  'NH', 'Vận hành sàn',        'Kinh doanh',   'ns01', 'Công ty', 'da_ky',        '08/2025', 14000000],
  ['ns07', 'Trần Văn Nam',      'TN', 'Nhân viên kho',       'Kho vận',      'ns03', 'HKD',     'cho_ky',       '06/2024', 9500000],
  ['ns08', 'Lê Thị Mai',        'LM', 'Đóng gói',            'Kho vận',      'ns03', 'HKD',     'cho_ky',       '09/2024', 8500000],
  ['ns09', 'Hoàng Minh Tuấn',   'HT', 'Nhân viên kho',       'Kho vận',      'ns03', 'HKD',     'can_trao_doi', '02/2025', 9000000],
  ['ns10', 'Đỗ Thu Trang',      'ĐT', 'Kế toán công nợ',     'Kế toán',      'ns04', 'Công ty', 'da_ky',        '04/2025', 12000000],
  ['ns11', 'Ngô Quang Hải',     'NQ', 'CSKH',                'Kinh doanh',   'ns06', 'HKD',     'cho_ky',       '11/2025', 10000000],
  ['ns12', 'Vương Thị Yến',     'VY', 'Đóng gói (parttime)', 'Kho vận',      'ns03', 'HKD',     'parttime',     '03/2026', null]
];

const TAI_KHOAN = [
  ['ns01', 'phong', 'giam_doc'],
  ['ns02', 'ngoc',  'pho_giam_doc'],
  ['ns03', 'duy',   'quan_ly_kho'],
  ['ns04', 'hang',  'ke_toan_truong'],
  ['ns05', 'huong', 'hcns'],
  ['ns06', 'huyen', 'van_hanh_san']
];

/* ---- Chạy --------------------------------------------------------------- */

function nhayDon(s) {
  return s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
}

const dong = [];
dong.push('-- Sinh tự động bởi scripts/tao-tai-khoan.mjs — KHÔNG sửa tay');
dong.push('-- Chứa hash mật khẩu, không chứa mật khẩu đọc được.');
dong.push('');
dong.push('DELETE FROM phien;');
dong.push('DELETE FROM lan_dang_nhap_hong;');
dong.push('DELETE FROM tai_khoan;');
dong.push('DELETE FROM nhan_su;');
dong.push('');

// Nhân sự — chèn người không có quản lý trước, để khoá ngoại quan_ly_id hợp lệ
for (const n of [...NHAN_SU].sort((a, b) => (a[5] ? 1 : 0) - (b[5] ? 1 : 0))) {
  const [id, ten, vt, cv, bp, ql, pn, tt, vao, luong] = n;
  const sdt = `'0900 000 0${id.slice(2)}'`;      // SỐ GIẢ — Sếp thay số thật sau
  const email = `'${vt.toLowerCase()}@alphagreen.vn'`;
  dong.push(
    `INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, sdt, email, quan_ly_id, phap_nhan, trang_thai, ngay_vao, luong) VALUES (` +
    `${nhayDon(id)}, ${nhayDon(ten)}, ${nhayDon(vt)}, ${nhayDon(cv)}, ${nhayDon(bp)}, ` +
    `${sdt}, ${email}, ${nhayDon(ql)}, ${nhayDon(pn)}, ${nhayDon(tt)}, ${nhayDon(vao)}, ${luong ?? 'NULL'});`
  );
}
dong.push('');

const matKhauDaSinh = [];
for (const [nsId, ten, vaiTro] of TAI_KHOAN) {
  const mk = sinhMatKhau();
  const hash = await bamMatKhau(mk);
  matKhauDaSinh.push({ ten, mk, hoTen: NHAN_SU.find(n => n[0] === nsId)[1] });
  dong.push(
    `INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mk) VALUES (` +
    `${nhayDon(nsId)}, ${nhayDon(ten)}, ${nhayDon(hash)}, ${nhayDon(vaiTro)}, 1);`
  );
}

writeFileSync('seed.sql', dong.join('\n') + '\n', 'utf8');

console.log('\n  Đã ghi seed.sql (chứa hash, không chứa mật khẩu đọc được)\n');
console.log('  ╔══════════════════════════════════════════════════════════════╗');
console.log('  ║  MẬT KHẨU BAN ĐẦU — CHỈ HIỆN MỘT LẦN DUY NHẤT               ║');
console.log('  ║  Chép ra, gửi riêng cho từng người, rồi đóng cửa sổ này.     ║');
console.log('  ║  Đừng gửi qua nhóm chat chung. Ai cũng phải đổi khi vào lần  ║');
console.log('  ║  đầu tiên.                                                   ║');
console.log('  ╚══════════════════════════════════════════════════════════════╝\n');

for (const t of matKhauDaSinh) {
  console.log(`   ${t.hoTen.padEnd(20)}  đăng nhập: ${t.ten.padEnd(7)}  mật khẩu: ${t.mk}`);
}

console.log('\n  Nạp vào database bằng lệnh:');
console.log('     npm run nap-db\n');
