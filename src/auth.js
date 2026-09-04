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

/* Cờ "vừa đọc phiên mà thiếu cột `duyet_gopy`". docPhien() chỉ nhận `db` nên
   không tự bắn Telegram được; index.js lấy cờ này ra ngay sau mỗi lần đọc
   phiên. LẤY LÀ XOÁ (đọc-rồi-đặt-lại) để không kẹt cờ sau khi migration đã
   chạy — cột có lại là hết cảnh báo, không cần khởi động lại Worker. */
let thieuCotDuyetGopY = false;
export function layCoThieuCotDuyetGopY() {
  const c = thieuCotDuyetGopY;
  thieuCotDuyetGopY = false;
  return c;
}

/* Cùng cơ chế, cho cột `vi_tri_cong_viec` (ô 2 — vị trí công việc, tách
   04/09/2026). Thiếu cột thì phiên chỉ có ô 1 ⇒ quyền đúng bằng bản trước
   khi tách, KHÔNG mất đăng nhập của ai — nhưng vẫn phải KÊU LÊN, vì im lặng
   ở đây nghĩa là anh Duy tiếp tục không mở được tab Kho vận mà không ai biết
   vì sao (đúng lỗi BH-21/REV-0030 lỗi 5 đã trả giá một lần). */
let thieuCotViTri = false;
export function layCoThieuCotViTri() {
  const c = thieuCotViTri;
  thieuCotViTri = false;
  return c;
}

/* ĐÃ CÓ CỘT `vi_tri_cong_viec` CHƯA — cho các câu SQL KHÁC (danh bạ, danh
   sách tài khoản, cron nhắc HCNS) phải chọn giữa hai bản câu lệnh. docPhien
   ở trên tự lùi được vì nó chỉ có một câu; những chỗ kia thì hỏi hàm này.

   PRAGMA table_info không dùng được qua binding D1 trong Worker — thử SELECT
   thật, cột không tồn tại thì ném lỗi (đúng khuôn coCotTinhTrangHang trong
   src/shopee.js).

   NHỚ CÓ, KHÔNG NHỚ KHÔNG: đã thấy cột thì nhớ vĩnh viễn (0 lượt đọc thêm).
   CHƯA thấy thì chỉ nhớ 60 giây rồi hỏi lại — nếu nhớ luôn thì sau khi nạp
   migration, ERP vẫn chạy như cũ cho tới lúc Cloudflare thay isolate, và
   không ai hiểu vì sao "đã nạp DB rồi mà anh Duy vẫn không vào được". Giá
   phải trả: tối đa 1 lượt đọc D1 mỗi phút mỗi isolate, và CHỈ trong quãng
   chưa nạp migration.

   NHỚ THEO TỪNG BINDING (WeakMap), không nhớ một biến chung cho cả module:
   một biến chung thì hai CSDL khác nhau trong cùng tiến trình dùng chung câu
   trả lời — bàn đo đã bắt được đúng ca này (đo "chưa có cột" trước rồi đo
   "đã có cột" sau, cả loạt phép sau trả 409). Cùng lỗi ấy có thật ngoài đời
   khi đo/khôi phục trên một CSDL thứ hai. WeakMap không giữ binding sống. */
const _nhoCotViTri = new WeakMap();
export async function coCotViTri(db) {
  const nho = _nhoCotViTri.get(db);
  if (nho && (nho.co || Date.now() < nho.hetHan)) return nho.co;
  try {
    await db.prepare('SELECT vi_tri_cong_viec FROM tai_khoan LIMIT 1').first();
    _nhoCotViTri.set(db, { co: true, hetHan: 0 });
    return true;
  } catch {
    _nhoCotViTri.set(db, { co: false, hetHan: Date.now() + 60000 });
    return false;
  }
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
  // vi_tri_cong_viec: ô 2 — vị trí công việc (Sếp Ngọc chốt 04/09/2026, xem
  // khối "HAI Ô" ở src/quyen.js). Đọc thẳng vào phiên vì MỌI cửa phân quyền
  // đều cần nó; hỏi thêm một câu DB mỗi lượt là +1 lượt đọc D1 cho từng
  // request, không đáng.
  //
  // HAI CỘT TUỲ CHỌN, KHÔNG PHẢI MỘT: `deploy.yml` không tự chạy migration,
  // nên bất kỳ cột nào trong hai cột này cũng có thể chưa tồn tại, và có thể
  // thiếu ĐỒNG THỜI. Vòng lặp dưới đây bỏ dần từng cột thiếu rồi chạy lại —
  // viết lồng hai try/catch thì ca "thiếu cả hai" rơi vào nhánh ném lỗi và
  // cả công ty mất đăng nhập, đúng loại lỗi REV-0027 L4 đã trả giá.
  const cauPhien = (cotDuyet, cotViTri) => `
    SELECT p.tai_khoan_id, p.het_han,
           t.ten_dang_nhap, t.vai_tro, t.kich_hoat, t.phai_doi_mk, ${cotDuyet}, ${cotViTri},
           n.id AS nhan_su_id, n.ho_ten, n.viet_tat, n.chuc_vu, n.phong_ban_id
      FROM phien p
      JOIN tai_khoan t ON t.id = p.tai_khoan_id
      JOIN nhan_su  n ON n.id = t.nhan_su_id
     WHERE p.token_hash = ?
  `;
  const bam = await bamToken(token);
  let coDuyet = true, coViTri = true, d = null;
  for (let lan = 0; lan < 3; lan++) {
    try {
      d = await db.prepare(cauPhien(
        coDuyet ? 't.duyet_gopy' : '0 AS duyet_gopy',
        coViTri ? 't.vi_tri_cong_viec' : 'NULL AS vi_tri_cong_viec'
      )).bind(bam).first();
      break;
    } catch (e) {
      const tin = String(e && e.message);
      if (!/no such column/i.test(tin)) throw e;
      /* IM LẶNG VĨNH VIỄN LÀ LỖI THỨ HAI (REV-0030 lỗi 5).
         Hỏng theo chiều an toàn thì đúng — nhưng KHÔNG AI ĐƯỢC BÁO thì cả công
         ty chạy tiếp ở mức không-quyền, cả hàng góp ý đứng, và không ai biết vì
         sao. Đo được trước bản vá: thong_bao +0 · Telegram +0 · console 0 dòng.
         Nay:
           · console.warn NGAY TẠI ĐÂY — `[observability]` đang bật trong
             wrangler.toml nên dòng này đọc được trên Workers Logs;
           · dựng cờ cho batBuocDangNhap() bắn MỘT tin Telegram/ngày. Hàm này
             chỉ nhận `db`, không có `env` để gọi guiTelegram, và cũng KHÔNG
             được import ngược từ index.js (vòng tròn) — nên phải đi bằng cờ. */
      if (coDuyet && /duyet_gopy/i.test(tin)) {
        coDuyet = false;
        thieuCotDuyetGopY = true;
        console.warn('[ERP] Thiếu cột tai_khoan.duyet_gopy — phiên đang chạy ở mức không-quyền. ' +
                     'Nạp migrations/them-quyen-duyet-gopy.sql rồi deploy lại.');
        continue;
      }
      if (coViTri && /vi_tri_cong_viec/i.test(tin)) {
        coViTri = false;
        thieuCotViTri = true;
        console.warn('[ERP] Thiếu cột tai_khoan.vi_tri_cong_viec — vị trí công việc chưa có tác dụng, ' +
                     'quyền đang đúng bằng bản cũ. Nạp migrations/them-vi-tri-cong-viec.sql rồi deploy lại.');
        continue;
      }
      throw e;   // thiếu một cột KHÁC — đó là lỗi thật, không nuốt
    }
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
