/* ==========================================================================
   ĐẶT LẠI MẬT KHẨU MỘT TÀI KHOẢN Ở TẦNG DỮ LIỆU — ĐƯỜNG CỨU CUỐI CÙNG
   ---------------------------------------------------------------------------
   REV-0030 lỗi 3. Tin xấu phải nói thẳng: TRƯỚC file này, ERP KHÔNG CÓ đường
   nào đặt lại mật khẩu ở tầng dữ liệu.

     · Lệnh cứu trong ADR-0015
         UPDATE tai_khoan SET duyet_gopy = 1, kich_hoat = 1 WHERE ten_dang_nhap = ...
       viết đúng và chạy được, nhưng nó CỨU CÁI CỜ, KHÔNG CỨU LỐI VÀO —
       `mat_khau_hash` là PBKDF2, không ai gõ tay ra được.
     · `scripts/tao-tai-khoan.mjs` KHÔNG dùng thay được: nó ghi `seed.sql` với
       `DELETE FROM ...` XOÁ SẠCH dữ liệu cũ rồi INSERT lại hai admin. Chạy
       trên bản thật là MẤT CÔNG TY.

   Nghĩa là: Sếp quên mật khẩu + đường khôi phục qua Telegram hỏng = không còn
   cách nào vào. File này đóng đúng cái lỗ đó.

   BA LUẬT CỦA FILE NÀY — cũng là ba thứ bàn đo `do-quyen-duyet-gopy.mjs` bắt
   phải chứng minh, không phải lời hứa suông:
     ① ĐÚNG MỘT TÀI KHOẢN, tra theo tên đăng nhập (số điện thoại). Không có
        `--tat-ca`, không nhận nhiều số một lúc.
     ② KHÔNG CÓ MỘT CÂU XOÁ NÀO. Cả file chỉ sinh ra đúng một câu ghi:
        `UPDATE tai_khoan SET mat_khau_hash = ?, phai_doi_mk = 1 WHERE ten_dang_nhap = ?`
        Không DELETE, không DROP, không TRUNCATE, không ghi seed.sql, không
        đụng bảng nào khác.
     ③ IN RÕ ĐANG ĐỔI CHO AI RỒI MỚI HỎI. Không gõ đúng số điện thoại để xác
        nhận thì DỪNG, không ghi gì. Chạy trong môi trường không có bàn phím
        (CI, cron) thì đọc phải EOF → cũng DỪNG. Hỏng theo chiều an toàn.

   Chạy:
     node scripts/dat-lai-mat-khau.mjs 0911994696              (bản máy)
     node scripts/dat-lai-mat-khau.mjs 0911994696 --remote     (BẢN THẬT)

   Sau khi chạy: đăng nhập bằng mật khẩu tạm in ra màn hình, hệ thống bắt đổi
   mật khẩu ngay lần đầu (`phai_doi_mk = 1`). Mọi phiên cũ vẫn còn hiệu lực —
   cố ý không đụng bảng `phien` (luật ②: không đụng bảng nào khác). Muốn đá
   hết phiên cũ thì dùng nút "Đặt lại mật khẩu" trong tab Quản trị của ERP.
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { webcrypto as crypto } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

/* SO_VONG phải KHỚP src/auth.js — 100.000 là TRẦN của Cloudflare Workers.
   Đặt khác đi thì hash sinh ra ở đây Workers vẫn đọc được (số vòng nằm ngay
   trong chuỗi hash), nhưng lệch chuẩn là nợ kỹ thuật. */
const SO_VONG = 100000;

/* Tên đăng nhập hợp lệ — ĐÚNG bộ ký tự mà `qtTaoTaiKhoan` trong src/index.js
   cho phép. Đây vừa là kiểm tra dữ liệu, vừa là chốt chặn CHÈN SQL: sau hàm
   này thì trong chuỗi không còn dấu nháy, dấu chấm phẩy hay khoảng trắng nào
   để mà thoát ra khỏi câu lệnh. */
export const TEN_HOP_LE = /^[a-z0-9._-]{3,20}$/;

export function tenDangNhapHopLe(ten) {
  return TEN_HOP_LE.test(String(ten || ''));
}

function sangBase64(buf) {
  return Buffer.from(new Uint8Array(buf)).toString('base64');
}

/* Băm y hệt `bamMatKhau` của src/auth.js — cùng thuật toán, cùng số vòng,
   cùng định dạng `pbkdf2$<vòng>$<salt>$<hash>`, để `kiemTraMatKhau()` của
   Worker đọc được. Bàn đo chứng minh điều này bằng cách gọi thẳng
   `kiemTraMatKhau` của auth.js trên hash do file này sinh ra. */
export async function bamMatKhau(matKhau) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const khoa = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(matKhau), 'PBKDF2', false, ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: SO_VONG, hash: 'SHA-256' }, khoa, 256
  );
  return `pbkdf2$${SO_VONG}$${sangBase64(salt)}$${sangBase64(hash)}`;
}

/* Bỏ ký tự dễ nhìn nhầm (0/O, 1/l/I) — mật khẩu này hay phải đọc qua điện
   thoại. Giống hệt `sinhMatKhauTam` của src/auth.js. */
export function sinhMatKhauTam(doDai = 12) {
  const bang = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(doDai));
  return Array.from(b, x => bang[x % bang.length]).join('');
}

/* ---- HAI CÂU SQL DUY NHẤT CỦA FILE NÀY ---------------------------------- */

/** Chỉ ĐỌC — để in ra "đang đổi cho ai" trước khi hỏi. */
export function cauTraCuu(ten) {
  if (!tenDangNhapHopLe(ten)) throw new Error('Tên đăng nhập không hợp lệ');
  return `SELECT t.id, t.ten_dang_nhap, t.vai_tro, t.kich_hoat, t.duyet_gopy, n.ho_ten, n.chuc_vu ` +
         `FROM tai_khoan t LEFT JOIN nhan_su n ON n.id = t.nhan_su_id ` +
         `WHERE t.ten_dang_nhap = '${ten}'`;
}

/** Câu GHI duy nhất. Đúng một bảng, đúng một dòng, đúng hai cột. */
export function cauDatLai(ten, hash) {
  if (!tenDangNhapHopLe(ten)) throw new Error('Tên đăng nhập không hợp lệ');
  if (!/^pbkdf2\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/.test(String(hash)))
    throw new Error('Hash không đúng định dạng pbkdf2$vòng$salt$hash');
  return `UPDATE tai_khoan SET mat_khau_hash = '${hash}', phai_doi_mk = 1 ` +
         `WHERE ten_dang_nhap = '${ten}'`;
}

/* ---- Chạy --------------------------------------------------------------- */

function wrangler(moiTruong, sql, json = false) {
  const args = ['wrangler', 'd1', 'execute', 'crm-agc', moiTruong, '--command', sql];
  if (json) args.push('--json');
  return execFileSync('npx', args, { encoding: 'utf8', shell: true });
}

async function chinh() {
  const ten = String(process.argv[2] || '').replace(/\s+/g, '');
  const moiTruong = process.argv.includes('--remote') ? '--remote' : '--local';

  if (!ten) {
    console.error('Thiếu số điện thoại (tên đăng nhập).');
    console.error('Dùng: node scripts/dat-lai-mat-khau.mjs <so-dien-thoai> [--remote]');
    process.exit(1);
  }
  if (!tenDangNhapHopLe(ten)) {
    console.error(`"${ten}" không phải tên đăng nhập hợp lệ (3–20 ký tự, chỉ số/chữ thường/. _ -).`);
    process.exit(1);
  }

  console.log(`\n>> [1/3] Tra tài khoản trên ${moiTruong === '--remote' ? 'BẢN THẬT' : 'bản máy'}...\n`);
  let dong = [];
  try {
    const raw = wrangler(moiTruong, cauTraCuu(ten), true);
    const kq = JSON.parse(raw.slice(raw.indexOf('[')));
    dong = (kq[0] && kq[0].results) || [];
  } catch (e) {
    console.error('Không tra được tài khoản:', e.message);
    process.exit(1);
  }

  if (dong.length !== 1) {
    console.error(dong.length === 0
      ? `Không có tài khoản nào tên đăng nhập "${ten}". KHÔNG ghi gì cả.`
      : `Có ${dong.length} tài khoản trùng tên đăng nhập "${ten}" — bất thường. KHÔNG ghi gì cả.`);
    process.exit(1);
  }

  const t = dong[0];
  console.log('   Sẽ đặt lại mật khẩu cho ĐÚNG một tài khoản này:');
  console.log(`     Họ tên        : ${t.ho_ten || '(không có hồ sơ nhân sự)'}`);
  console.log(`     Chức vụ       : ${t.chuc_vu || '—'}`);
  console.log(`     Tên đăng nhập : ${t.ten_dang_nhap}`);
  console.log(`     Vai trò       : ${t.vai_tro}${Number(t.duyet_gopy) === 1 ? '  ·  ĐANG GIỮ QUYỀN DUYỆT GÓP Ý' : ''}`);
  console.log(`     Đang hoạt động: ${Number(t.kich_hoat) === 1 ? 'có' : 'KHÔNG (tài khoản đang bị khoá)'}`);
  console.log('\n   KHÔNG đụng bảng nào khác, KHÔNG xoá dòng nào, KHÔNG đá phiên đang đăng nhập.\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let traLoi = '';
  try { traLoi = (await rl.question(`   Gõ lại số điện thoại "${ten}" để xác nhận (Enter trống = huỷ): `)).trim(); }
  catch { traLoi = ''; }       // không có bàn phím (CI/cron) → coi như huỷ
  finally { rl.close(); }

  if (traLoi !== ten) {
    console.log('\n   Đã HUỶ — không ghi gì cả.\n');
    process.exit(1);
  }

  const matKhauTam = sinhMatKhauTam(12);
  const hash = await bamMatKhau(matKhauTam);

  console.log(`\n>> [2/3] Ghi ĐÚNG MỘT câu UPDATE...\n`);
  try { wrangler(moiTruong, cauDatLai(ten, hash)); }
  catch (e) { console.error('Ghi hỏng:', e.message); process.exit(1); }

  console.log(`\n>> [3/3] Xong.\n`);
  console.log('   ==========================================================');
  console.log(`   Tên đăng nhập : ${ten}`);
  console.log(`   Mật khẩu tạm  : ${matKhauTam}`);
  console.log('   ==========================================================');
  console.log('   MẬT KHẨU NÀY CHỈ HIỆN RA MỘT LẦN. Máy chủ chỉ lưu hash.');
  console.log('   Đăng nhập xong hệ thống sẽ bắt đổi mật khẩu ngay.\n');
}

// Chỉ chạy khi được gọi thẳng — bàn đo import file này để soi hai câu SQL.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await chinh();
}
