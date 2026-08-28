/* ==========================================================================
   ĐĂNG NHẬP — băm mật khẩu, phiên làm việc, chặn dò mật khẩu
   ---------------------------------------------------------------------------
   Dùng PBKDF2-SHA256 qua WebCrypto có sẵn trong Cloudflare Workers.
   Mật khẩu KHÔNG BAO GIỜ được lưu dạng đọc được — kể cả Sếp cũng không
   xem được mật khẩu của nhân viên, chỉ đặt lại được thôi. Đó là đúng.
   ========================================================================== */

const SO_VONG = 100000;          // số vòng băm. TRẦN CỦA CLOUDFLARE WORKERS LÀ
                                 // 100.000 — đặt cao hơn (vd 210.000) thì
                                 // deriveBits NÉM LỖI trên workerd thật, khiến
                                 // MỌI đăng nhập thất bại (dù local vẫn chạy).
const HAN_PHIEN_GIO = 12;        // phiên hết hạn sau 12 tiếng
const TOI_DA_SAI = 5;            // sai quá 5 lần thì khoá
const CUA_SO_KHOA_PHUT = 15;     // khoá trong 15 phút

/* ---- Tiện ích mã hoá ---------------------------------------------------- */

function sangBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function tuBase64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function pbkdf2(matKhau, salt, soVong) {
  const khoa = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(matKhau), 'PBKDF2', false, ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: soVong, hash: 'SHA-256' }, khoa, 256
  );
}

/* So sánh theo kiểu không để lộ thời gian.
   Nếu so sánh thường, kẻ tấn công đo được câu trả lời nhanh/chậm để đoán
   dần từng ký tự. Vòng lặp này luôn chạy hết nên thời gian như nhau. */
function bangNhauAnToan(a, b) {
  if (a.length !== b.length) return false;
  let khac = 0;
  for (let i = 0; i < a.length; i++) khac |= a[i] ^ b[i];
  return khac === 0;
}

/* ---- Mật khẩu ----------------------------------------------------------- */

/* Sinh mật khẩu tạm cho tài khoản mới / khi đặt lại.
   Bỏ các ký tự dễ nhìn nhầm (0/O, 1/l/I) để đọc qua điện thoại không sai. */
export function sinhMatKhauTam(doDai = 10) {
  const bang = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(doDai));
  return Array.from(b, x => bang[x % bang.length]).join('');
}

export async function bamMatKhau(matKhau) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(matKhau, salt, SO_VONG);
  return `pbkdf2$${SO_VONG}$${sangBase64(salt)}$${sangBase64(hash)}`;
}

export async function kiemTraMatKhau(matKhau, luuTru) {
  try {
    const [thuatToan, soVong, saltB64, hashB64] = luuTru.split('$');
    if (thuatToan !== 'pbkdf2') return false;
    const hash = await pbkdf2(matKhau, tuBase64(saltB64), parseInt(soVong, 10));
    return bangNhauAnToan(new Uint8Array(hash), tuBase64(hashB64));
  } catch {
    return false;
  }
}

/* ---- Phiên làm việc ----------------------------------------------------- */

async function bamToken(token) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return sangBase64(h);
}

export async function taoPhien(db, taiKhoanId) {
  // 32 byte ngẫu nhiên — không thể đoán
  const token = sangBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/[+/=]/g, '');
  const hetHan = new Date(Date.now() + HAN_PHIEN_GIO * 3600 * 1000).toISOString();

  await db.prepare(
    'INSERT INTO phien (token_hash, tai_khoan_id, het_han) VALUES (?, ?, ?)'
  ).bind(await bamToken(token), taiKhoanId, hetHan).run();

  return { token, hetHan };
}

export async function docPhien(db, token) {
  if (!token) return null;

  // phong_ban_id thêm vào phiên (Employee Profile Phase 1, CORE_CHANGE đã
  // duyệt 25/08/2026) — mọi màn hình dùng Position/Capability sau này đọc
  // thẳng phien.phong_ban_id, khỏi phải gọi thêm API riêng chỉ để biết
  // phòng ban của người đang đăng nhập. Chỉ THÊM cột đọc ra, không đổi hành
  // vi/độ dài phiên/bảo mật — tương thích ngược hoàn toàn.
  // duyet_gopy: cờ "được duyệt góp ý ERP ở cấp cuối" (Sếp Ngọc chốt
  // 28/08/2026 — xem duocDuyetGopY() trong src/quyen.js). Đọc THẲNG vào
  // phiên để cổng duyệt không phải hỏi DB thêm một câu mỗi lần bấm, và để
  // quyền được kiểm ở MÁY CHỦ chứ không phải ẩn nút ở trình duyệt.
  // THỨ TỰ TRIỂN KHAI: cột này NÊN có trong DB trước khi deploy code (REV-0018
  // mục 6: DB trước, code sau) — nhưng thứ tự triển khai dựa vào TRÍ NHỚ CON
  // NGƯỜI là thứ sẽ sai một ngày nào đó, và ngày 28/08/2026 nó đã sai một lần.
  //
  // ĐỌC PHÒNG THỦ (REV-0027 L4): trước bản vá này, thiếu cột `duyet_gopy` làm
  // ĐÚNG CÂU NÀY lỗi → docPhien() ném → /toi-la-ai, /danh-ba, /thong-bao,
  // /kho/san-pham đều 500 với MỌI phiên (đo được: nhân viên kho chẳng dính gì
  // tới góp ý cũng mất đăng nhập). Nay bắt đúng lỗi "no such column" rồi chạy
  // lại với `0 AS duyet_gopy`: thiếu cột thì cờ về false — hỏng theo chiều AN
  // TOÀN (đúng khuôn KHONG_QUYEN của src/quyen.js), không sập cả công ty.
  // CHỈ nuốt đúng lỗi thiếu cột đó; mọi lỗi DB khác vẫn ném ra như cũ.
  const cauPhien = (cotDuyet) => `
    SELECT p.tai_khoan_id, p.het_han,
           t.ten_dang_nhap, t.vai_tro, t.kich_hoat, t.phai_doi_mk, ${cotDuyet},
           n.id AS nhan_su_id, n.ho_ten, n.viet_tat, n.chuc_vu, n.phong_ban_id
      FROM phien p
      JOIN tai_khoan t ON t.id = p.tai_khoan_id
      JOIN nhan_su  n ON n.id = t.nhan_su_id
     WHERE p.token_hash = ?
  `;
  const bam = await bamToken(token);
  let d;
  try {
    d = await db.prepare(cauPhien('t.duyet_gopy')).bind(bam).first();
  } catch (e) {
    if (!/no such column/i.test(String(e && e.message)) ||
        !/duyet_gopy/i.test(String(e && e.message))) throw e;
    d = await db.prepare(cauPhien('0 AS duyet_gopy')).bind(bam).first();
  }

  if (!d) return null;
  if (!d.kich_hoat) return null;

  // Hết hạn thì dọn luôn
  if (new Date(d.het_han) < new Date()) {
    await xoaPhien(db, token);
    return null;
  }
  return d;
}

export async function xoaPhien(db, token) {
  if (!token) return;
  await db.prepare('DELETE FROM phien WHERE token_hash = ?')
          .bind(await bamToken(token)).run();
}

export async function xoaPhienHetHan(db) {
  await db.prepare("DELETE FROM phien WHERE het_han < datetime('now')").run();
}

/* ---- Chặn dò mật khẩu --------------------------------------------------- */

export async function dangBiKhoa(db, tenDangNhap) {
  const d = await db.prepare(`
    SELECT COUNT(*) AS n FROM lan_dang_nhap_hong
     WHERE ten_dang_nhap = ? AND luc > datetime('now', ?)
  `).bind(tenDangNhap, `-${CUA_SO_KHOA_PHUT} minutes`).first();
  return (d?.n || 0) >= TOI_DA_SAI;
}

export async function ghiNhanSai(db, tenDangNhap) {
  await db.prepare('INSERT INTO lan_dang_nhap_hong (ten_dang_nhap) VALUES (?)')
          .bind(tenDangNhap).run();
}

export async function xoaLanSai(db, tenDangNhap) {
  await db.prepare('DELETE FROM lan_dang_nhap_hong WHERE ten_dang_nhap = ?')
          .bind(tenDangNhap).run();
}

/* ---- Cookie ------------------------------------------------------------- */

export const TEN_COOKIE = 'agc_phien';

/* HttpOnly: JavaScript trong trang KHÔNG đọc được cookie này. Nghĩa là dù
   trang có dính mã độc thì cũng không lấy được phiên đăng nhập.
   Secure: chỉ gửi qua HTTPS. SameSite=Lax: chặn trang khác mượn phiên. */
export function cookieDangNhap(token, hetHan) {
  return `${TEN_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${new Date(hetHan).toUTCString()}`;
}

export function cookieDangXuat() {
  return `${TEN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function layTokenTuCookie(req) {
  const raw = req.headers.get('Cookie') || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + TEN_COOKIE + '=([^;]+)'));
  return m ? m[1] : null;
}
