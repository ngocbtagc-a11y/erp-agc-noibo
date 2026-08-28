/* ==========================================================================
   WEB PUSH — đẩy thông báo thẳng lên điện thoại, CHI PHÍ 0, KHÔNG thư viện.
   ---------------------------------------------------------------------------
   VÌ SAO TỰ VIẾT: gói `web-push` của npm kéo theo `asn1.js`/`jws` và dựng trên
   `crypto` của Node — Cloudflare Worker không có. Toàn bộ phép toán cần thiết
   (ECDSA P-256, ECDH P-256, HKDF-SHA256, AES-128-GCM) đều nằm sẵn trong
   WebCrypto của Worker, nên file này chỉ ~200 dòng và KHÔNG có phụ thuộc nào.

   KHÔNG có dịch vụ trung gian nào: Worker nói thẳng với máy chủ đẩy của chính
   hãng trình duyệt (Google/Apple/Mozilla). Không Firebase, không OneSignal,
   không trả tiền cho ai. Khoá VAPID do ta tự sinh (`scripts/tao-khoa-vapid.mjs`)
   và cất trong két Cloudflare, KHÔNG viết vào file.

   HAI CHUẨN được cài đúng chữ:
     · RFC 8292 — VAPID: ký JWT ES256 để máy chủ đẩy biết ai gửi.
     · RFC 8291 + RFC 8188 — mã hoá `aes128gcm`: máy chủ đẩy KHÔNG đọc được
       nội dung, chỉ điện thoại người nhận giải mã được. Đây là lý do gửi tin
       nhắn nội bộ qua Google mà nội dung vẫn kín.
   ========================================================================== */

/* ---- base64url ---------------------------------------------------------- */

export function byteSangB64url(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    // Duyệt theo lô — trải cả mảng vào tham số hàm là tràn ngăn xếp (BH-27).
    s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlSangByte(chuoi) {
  const s = String(chuoi).replace(/-/g, '+').replace(/_/g, '/');
  const bu = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const u8 = new Uint8Array(bu.length);
  for (let i = 0; i < bu.length; i++) u8[i] = bu.charCodeAt(i);
  return u8;
}

function noi(...phan) {
  const tong = phan.reduce((n, p) => n + p.length, 0);
  const ra = new Uint8Array(tong);
  let v = 0;
  for (const p of phan) { ra.set(p, v); v += p.length; }
  return ra;
}

const chu = (s) => new TextEncoder().encode(s);

/* ---- Sinh cặp khoá VAPID (chạy MỘT LẦN, ngoài giờ phục vụ) --------------- */

/** Trả { congKhai, biMat } dạng base64url. `congKhai` đem cho trình duyệt,
 *  `biMat` cất vào két Cloudflare. Không lưu ở đâu khác. */
export async function taoCapKhoaVAPID() {
  const cap = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
  );
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', cap.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', cap.privateKey);
  return { congKhai: byteSangB64url(raw), biMat: jwk.d };
}

/** Dựng lại khoá ký từ (bí mật `d`, công khai raw 65 byte) — WebCrypto không
 *  nhận riêng `d`, phải kèm toạ độ x/y, mà x/y chính là ruột khoá công khai. */
async function khoaKy(biMat, congKhai) {
  const pub = b64urlSangByte(congKhai);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error('Khoá VAPID công khai phải là 65 byte không nén (bắt đầu 0x04)');
  }
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256', ext: true, d: biMat,
      x: byteSangB64url(pub.subarray(1, 33)),
      y: byteSangB64url(pub.subarray(33, 65))
    },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
}

/* ---- RFC 8292 — chữ ký VAPID -------------------------------------------- */

/** Header `Authorization` cho một endpoint. `aud` phải là GỐC của endpoint
 *  (scheme + host), không phải cả đường dẫn — sai chỗ này là 401 từ Google. */
export async function chuKyVAPID(endpoint, khoa, hienTai = Date.now()) {
  const goc = new URL(endpoint).origin;
  const dau = byteSangB64url(chu(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const than = byteSangB64url(chu(JSON.stringify({
    aud: goc,
    exp: Math.floor(hienTai / 1000) + 12 * 3600,   // tối đa 24h theo RFC; lấy 12h
    sub: khoa.lienHe || 'mailto:alphagreen.commerce@gmail.com'
  })));
  const kyTren = `${dau}.${than}`;
  const ky = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    await khoaKy(khoa.biMat, khoa.congKhai),
    chu(kyTren)
  ));
  // WebCrypto trả thẳng r‖s 64 byte — đúng dạng JOSE cần, KHÔNG bọc DER.
  return `vapid t=${kyTren}.${byteSangB64url(ky)}, k=${khoa.congKhai}`;
}

/* ---- RFC 8291 — mã hoá nội dung ----------------------------------------- */

async function hkdf(muoi, goc, thongTin, soByte) {
  const k = await crypto.subtle.importKey('raw', goc, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: muoi, info: thongTin }, k, soByte * 8
  ));
}

/** Mã hoá `noiDung` (chuỗi) cho một đăng ký. Trả về thân yêu cầu HTTP dạng
 *  `aes128gcm` đã đóng gói đủ header nội bộ (muối, kích thước bản ghi, khoá
 *  công khai tạm) — máy chủ đẩy chỉ chuyển tiếp, không mở ra được.
 *
 *  `muoiThu` / `capTamThu` chỉ dùng cho bàn thử (để tái lập được kết quả);
 *  lúc chạy thật cả hai đều tự sinh ngẫu nhiên mỗi lần gửi. */
export async function maHoaNoiDung(noiDung, p256dh, auth, { muoiThu, capTamThu } = {}) {
  const khoaMay = b64urlSangByte(p256dh);        // 65 byte khoá công khai của MÁY người nhận
  const biMatChung = b64urlSangByte(auth);       // 16 byte bí mật chia sẻ
  if (khoaMay.length !== 65) throw new Error('p256dh phải là 65 byte');
  if (biMatChung.length !== 16) throw new Error('auth phải là 16 byte');

  const capTam = capTamThu || await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const khoaTam = new Uint8Array(await crypto.subtle.exportKey('raw', capTam.publicKey));

  const khoaMayCK = await crypto.subtle.importKey(
    'raw', khoaMay, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const chung = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: khoaMayCK }, capTam.privateKey, 256
  ));

  /* Bước then chốt của RFC 8291: trộn bí mật ECDH với `auth` cùng CẢ HAI khoá
     công khai. Thiếu một trong hai khoá ở `info` là điện thoại giải mã ra rác
     mà máy chủ đẩy vẫn trả 201 — hỏng IM LẶNG, không ai biết. */
  const goc = await hkdf(
    biMatChung, chung,
    noi(chu('WebPush: info\0'), khoaMay, khoaTam),
    32
  );

  const muoi = muoiThu || crypto.getRandomValues(new Uint8Array(16));
  const khoaMa = await hkdf(muoi, goc, chu('Content-Encoding: aes128gcm\0'), 16);
  const soDungMotLan = await hkdf(muoi, goc, chu('Content-Encoding: nonce\0'), 12);

  const khoaAES = await crypto.subtle.importKey('raw', khoaMa, 'AES-GCM', false, ['encrypt']);
  // 0x02 = dấu chấm hết bản ghi cuối (RFC 8188 §2). Thiếu byte này là hỏng.
  const roDe = noi(chu(noiDung), new Uint8Array([0x02]));
  const daMa = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: soDungMotLan }, khoaAES, roDe
  ));

  const cheoDai = new Uint8Array(4);
  new DataView(cheoDai.buffer).setUint32(0, 4096);      // kích thước bản ghi
  return noi(muoi, cheoDai, new Uint8Array([khoaTam.length]), khoaTam, daMa);
}

/* ---- Gửi ---------------------------------------------------------------- */

/** Gửi một thông báo tới một đăng ký.
 *  Trả { ok, ma, chet } — `chet: true` nghĩa là đăng ký đã hỏng vĩnh viễn
 *  (đổi máy / gỡ app / xoá dữ liệu trang), phải xoá khỏi bảng, không thử lại. */
export async function guiMotDangKy(dangKy, noiDung, khoa, { hienTai = Date.now() } = {}) {
  let than, ky;
  try {
    than = await maHoaNoiDung(JSON.stringify(noiDung), dangKy.p256dh, dangKy.auth);
    ky = await chuKyVAPID(dangKy.endpoint, khoa, hienTai);
  } catch (e) {
    // Đăng ký méo (khoá sai độ dài…) — thử lại bao nhiêu lần cũng thế.
    return { ok: false, ma: 0, chet: true, loi: e.message };
  }
  try {
    const res = await fetch(dangKy.endpoint, {
      method: 'POST',
      headers: {
        Authorization: ky,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'normal'
      },
      body: than
    });
    // 404/410 = máy chủ đẩy nói thẳng "đăng ký này không còn nữa".
    return { ok: res.status >= 200 && res.status < 300, ma: res.status, chet: res.status === 404 || res.status === 410 };
  } catch (e) {
    return { ok: false, ma: 0, chet: false, loi: e.message };   // lỗi mạng — còn thử lại được
  }
}

/** Lấy khoá VAPID từ két. Chưa cấu hình thì trả null để nơi gọi bỏ qua ÊM —
 *  ERP phải chạy bình thường khi chưa đặt khoá, không được vỡ. */
export function khoaVAPID(env) {
  const congKhai = env.VAPID_KHOA_CONG_KHAI, biMat = env.VAPID_KHOA_BI_MAT;
  if (!congKhai || !biMat) return null;
  return { congKhai, biMat, lienHe: env.VAPID_LIEN_HE || 'mailto:alphagreen.commerce@gmail.com' };
}
