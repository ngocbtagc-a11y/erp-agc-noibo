/* ==========================================================================
   MODULE TIKTOK SHOP — Đơn hoàn (Returns)   (Cloudflare Worker)
   ---------------------------------------------------------------------------
   Khung sẵn sàng, CHỜ KHÓA THẬT. Chưa nạp app_key/app_secret thì mọi đầu việc
   trả "chưa cấu hình" lịch sự, KHÔNG làm sập máy chủ.

   Cấu hình (biến môi trường):
     TIKTOK_APP_KEY      — [vars]
     TIKTOK_APP_SECRET   — secret:  wrangler secret put TIKTOK_APP_SECRET
     TIKTOK_SERVICE_ID   — [vars] (dùng để tạo link ủy quyền)
     TIKTOK_REDIRECT     — URL callback đã khai với TikTok
     (tùy chọn) TIKTOK_AUTH_HOST / TIKTOK_API_HOST / TIKTOK_SERVICE_HOST

   KHÁC SHOPEE — hai điểm chính:
   1. Lấy/làm mới token KHÔNG ký, dùng app_secret làm tham số trực tiếp.
   2. Lệnh theo shop cần "shop_cipher" (lấy qua /authorization/202309/shops),
      access_token đặt ở HEADER x-tts-access-token, và cách ký chuỗi khác:
        base = app_secret + path + (các tham số sort theo key nối key+value)
               + body + app_secret
        sign = HMAC-SHA256(base, app_secret) → hex

   ⚠️ Ký theo tài liệu TikTok bản 202309. Khi có khóa thật cần chạy thử một
   lần và tinh chỉnh nếu TikTok đổi chi tiết — đã gói gọn trong hàm kyTikTok().
   ========================================================================== */

import { duocXemDonHoan, duocQuanLyShopee, duocXemTab } from './quyen.js';

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }

/* ---- Cấu hình ----------------------------------------------------------- */
export function daCauHinh(env) {
  return !!(env.TIKTOK_APP_KEY && env.TIKTOK_APP_SECRET);
}
const authHost = env => (env.TIKTOK_AUTH_HOST || 'https://auth.tiktok-shops.com').replace(/\/+$/, '');
const apiHost = env => (env.TIKTOK_API_HOST || 'https://open-api.tiktokglobalshop.com').replace(/\/+$/, '');
const serviceHost = env => (env.TIKTOK_SERVICE_HOST || 'https://services.tiktokshop.com').replace(/\/+$/, '');
const redirect = env => env.TIKTOK_REDIRECT || 'https://erp-agc.noiboagc.workers.dev/api/tiktok/callback';
const nowSec = () => Math.floor(Date.now() / 1000);

/* ---- Ký HMAC-SHA256 kiểu TikTok → hex ---------------------------------- */
async function kyTikTok(env, path, query, bodyStr = '') {
  const keys = Object.keys(query).filter(k => k !== 'sign' && k !== 'access_token').sort();
  let base = env.TIKTOK_APP_SECRET + path;
  for (const k of keys) base += k + query[k];
  base += bodyStr;
  base += env.TIKTOK_APP_SECRET;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.TIKTOK_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(base));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---- Link ủy quyền shop ------------------------------------------------- */
export function linkUyQuyen(env) {
  const q = new URLSearchParams({
    service_id: env.TIKTOK_SERVICE_ID || '',
    redirect_uri: redirect(env)
  });
  return `${serviceHost(env)}/open/authorize?${q}`;
}

/* ---- Lưu token ---------------------------------------------------------- */
async function luuToken(env, data) {
  // access_token_expire_in của TikTok thường là mốc epoch tuyệt đối (giây).
  // Phòng cả hai kiểu: nếu là mốc lớn thì dùng thẳng, nếu là số giây thì cộng.
  let exp = Number(data.access_token_expire_in) || 0;
  const hetHan = (exp > 1e9 ? exp : nowSec() + (exp || 7200)) - 600;
  await env.DB.prepare(`
    INSERT INTO tiktok_ket_noi (shop_id, access_token, refresh_token, token_het_han, cap_nhat_luc)
    VALUES (?, ?, ?, ?, datetime('now','+7 hours'))
    ON CONFLICT(shop_id) DO UPDATE SET
      access_token=excluded.access_token, refresh_token=excluded.refresh_token,
      token_het_han=excluded.token_het_han, cap_nhat_luc=datetime('now','+7 hours')
  `).bind(String(data._shop_id || 'tiktok'), data.access_token, data.refresh_token, String(hetHan)).run();
}

/* ---- Đổi auth_code lấy token (KHÔNG ký) -------------------------------- */
export async function doiCodeLayToken(env, code) {
  const q = new URLSearchParams({
    app_key: env.TIKTOK_APP_KEY, app_secret: env.TIKTOK_APP_SECRET,
    auth_code: code, grant_type: 'authorized_code'
  });
  const res = await fetch(`${authHost(env)}/api/v2/token/get?${q}`);
  const kq = await res.json();
  const data = kq.data || {};
  if (!data.access_token) throw new Error(kq.message || 'Không đổi được token TikTok');
  await luuToken(env, { ...data, _shop_id: 'tiktok' });
  // Lấy shop_cipher ngay sau khi có token (không chặn nếu lỗi — để lát đồng bộ thử lại)
  try { await luuShopCipher(env, await layShopCipher(env, data.access_token)); } catch (_) { /* để đồng bộ lấy lại */ }
  return data;
}

/* ---- Làm mới token ------------------------------------------------------ */
export async function lamMoiToken(env) {
  const kn = await env.DB.prepare('SELECT shop_id, refresh_token FROM tiktok_ket_noi LIMIT 1').first();
  if (!kn) return null;
  const q = new URLSearchParams({
    app_key: env.TIKTOK_APP_KEY, app_secret: env.TIKTOK_APP_SECRET,
    refresh_token: kn.refresh_token, grant_type: 'refresh_token'
  });
  const res = await fetch(`${authHost(env)}/api/v2/token/refresh?${q}`);
  const kq = await res.json();
  const data = kq.data || {};
  if (!data.access_token) throw new Error(kq.message || 'Không làm mới được token TikTok');
  await luuToken(env, { ...data, _shop_id: kn.shop_id });
  return data;
}

/* ---- Lấy shop_cipher (bắt buộc cho các lệnh theo shop) ------------------
   Trả về cả phản hồi thô của TikTok để dễ soi lỗi khi chưa lấy được. */
async function layShopCipher(env, accessToken) {
  const path = '/authorization/202407/shops';
  const query = { app_key: env.TIKTOK_APP_KEY, timestamp: String(nowSec()) };
  const sign = await kyTikTok(env, path, query, '');
  const q = new URLSearchParams({ ...query, sign });
  const res = await fetch(`${apiHost(env)}${path}?${q}`, {
    headers: { 'x-tts-access-token': accessToken }
  });
  const kq = await res.json();
  const shop = kq && kq.data && kq.data.shops && kq.data.shops[0];
  return { cipher: shop ? (shop.cipher || null) : null, ten: shop ? (shop.name || null) : null, raw: kq };
}

async function luuShopCipher(env, sc) {
  if (!sc.cipher) return;
  await env.DB.prepare(
    'UPDATE tiktok_ket_noi SET shop_cipher=?, shop_name=?, cap_nhat_luc=datetime(\'now\',\'+7 hours\') WHERE shop_id=?'
  ).bind(sc.cipher, sc.ten, 'tiktok').run();
}

/* ---- Kết nối còn hạn (tự làm mới) -------------------------------------- */
async function ketNoiConHan(env) {
  const kn = await env.DB.prepare('SELECT * FROM tiktok_ket_noi LIMIT 1').first();
  if (!kn) return null;
  if (nowSec() >= Number(kn.token_het_han)) {
    await lamMoiToken(env);
    return env.DB.prepare('SELECT * FROM tiktok_ket_noi LIMIT 1').first();
  }
  return kn;
}

/* ==========================================================================
   ĐẦU VIỆC CHO ROUTE
   ========================================================================== */

export async function apiTrangThai(env, phien) {
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  const cauHinh = daCauHinh(env);
  const kn = cauHinh ? await env.DB.prepare('SELECT shop_id, shop_name, cap_nhat_luc FROM tiktok_ket_noi LIMIT 1').first() : null;
  return json({
    da_cau_hinh: cauHinh,
    da_ket_noi: !!kn,
    shop_id: kn ? (kn.shop_name || kn.shop_id) : null,
    cap_nhat_luc: kn ? kn.cap_nhat_luc : null,
    quyen: { quan_ly: duocQuanLyShopee(phien.vai_tro) }   // dùng chung quyền "kết nối sàn"
  });
}

export async function apiConnect(env, phien) {
  if (!duocQuanLyShopee(phien.vai_tro)) return loi('Chỉ Giám đốc / Phó Giám đốc mới được kết nối TikTok', 403);
  if (!daCauHinh(env)) return loi('Chưa nạp khóa TikTok (app_key/app_secret) trên máy chủ', 409);
  return new Response(null, { status: 302, headers: { Location: linkUyQuyen(env) } });
}

export async function apiCallback(env, urlObj) {
  if (!daCauHinh(env)) return new Response('Chưa cấu hình TikTok', { status: 409 });
  const code = urlObj.searchParams.get('code') || urlObj.searchParams.get('auth_code');
  if (!code) return new Response('Thiếu auth_code', { status: 400 });
  try {
    await doiCodeLayToken(env, code);
    // Kết nối xong là kéo đơn hoàn về ngay, khỏi phải bấm "Đồng bộ".
    try { await dongBoNen(env); } catch (e) { console.error('Đồng bộ ngay sau kết nối TikTok:', e.message); }
    return new Response(null, { status: 302, headers: { Location: '/app?tiktok=ok' } });
  } catch (e) {
    return new Response('Kết nối TikTok thất bại: ' + e.message, { status: 502 });
  }
}

/* Đồng bộ đơn hoàn TikTok về DB — dùng cho CẢ nút bấm lẫn lịch chạy nền.
   Trả về số đơn cập nhật; null nếu chưa cấu hình/chưa kết nối; ném lỗi nếu API lỗi. */
export async function dongBoNen(env) {
  if (!daCauHinh(env)) return null;
  let kn = await ketNoiConHan(env);
  if (!kn) return null;

  if (!kn.shop_cipher) {
    const sc = await layShopCipher(env, kn.access_token);
    if (!sc.cipher) throw new Error('Chưa lấy được mã shop từ TikTok: ' +
      ((sc.raw && sc.raw.message) || JSON.stringify(sc.raw).slice(0, 200)));
    await luuShopCipher(env, sc);
    kn = { ...kn, shop_cipher: sc.cipher };
  }

  const path = '/return_refund/202309/returns/search';
  // Chỉ lấy đơn hoàn phát sinh TỪ ĐẦU THÁNG NÀY, sắp MỚI NHẤT trước — nếu không
  // sàn trả 50 đơn cũ nhất trước, đơn mới không bao giờ tới lượt. Cuối tháng sẽ
  // đóng gói/lưu trữ rồi dọn cho DB gọn (Sếp Ngọc 19/08/2026).
  const _vn = new Date(Date.now() + 7 * 3600 * 1000);
  const dauThang = Math.floor(Date.UTC(_vn.getUTCFullYear(), _vn.getUTCMonth(), 1) / 1000) - 7 * 3600;
  const bodyStr = JSON.stringify({
    create_time_ge: dauThang,
    sort_field: 'create_time',
    sort_order: 'DESC'
  });
  const query = {
    app_key: env.TIKTOK_APP_KEY, timestamp: String(nowSec()),
    shop_cipher: kn.shop_cipher, page_size: '50'
  };
  const sign = await kyTikTok(env, path, query, bodyStr);
  const q = new URLSearchParams({ ...query, sign });
  const res = await fetch(`${apiHost(env)}${path}?${q}`, {
    method: 'POST',
    headers: { 'x-tts-access-token': kn.access_token, 'Content-Type': 'application/json' },
    body: bodyStr
  });
  const kq = await res.json();
  if (kq.code && kq.code !== 0) throw new Error('TikTok báo lỗi: ' + (kq.message || kq.code));

  const ds = (kq.data && (kq.data.return_orders || kq.data.returns)) || [];
  let them = 0;
  for (const r of ds) {
    const returnId = r.return_id || r.return_sn || r.id;
    if (!returnId) continue;
    const soTien = r.refund_amount && (r.refund_amount.refund_total || r.refund_amount.total);
    // Tách tên / SKU / số lượng riêng để kho hiển thị: tên dòng chính, SKU dòng phụ.
    const tenArr = [], skuArr = [];
    let tongSl = 0;
    const sp = (r.return_line_items || []).map(li => {
      const ten = li.product_name || '';
      const sku = li.seller_sku || li.sku || '';
      const sl = Number(li.quantity || li.return_quantity) || 1;
      if (ten) tenArr.push(ten);
      if (sku) skuArr.push(sku);
      tongSl += sl;
      const nhan = sku || ten || '—';
      return `${nhan} ×${sl}` + (sku && ten ? ` (${ten})` : '');
    }).filter(Boolean).join(' | ') || null;
    const spTen = [...new Set(tenArr)].join(' | ') || null;
    const spSku = [...new Set(skuArr)].join(' | ') || null;
    const soLuong = tongSl || null;
    await env.DB.prepare(`
      INSERT INTO don_hoan (return_sn, order_sn, trang_thai, ly_do, so_tien, tien_te, nguoi_mua, san_pham, san_pham_ten, san_pham_sku, so_luong, ma_van_don, tao_luc_shopee, cap_nhat_shopee, du_lieu_json, nguon, dang_cho, dong_bo_luc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tiktok', 'van_hanh', datetime('now','+7 hours'))
      ON CONFLICT(return_sn) DO UPDATE SET
        trang_thai=excluded.trang_thai, ly_do=excluded.ly_do, so_tien=excluded.so_tien,
        tien_te=excluded.tien_te, nguoi_mua=excluded.nguoi_mua, san_pham=excluded.san_pham,
        san_pham_ten=excluded.san_pham_ten, san_pham_sku=excluded.san_pham_sku, so_luong=excluded.so_luong,
        ma_van_don=excluded.ma_van_don,
        cap_nhat_shopee=excluded.cap_nhat_shopee, du_lieu_json=excluded.du_lieu_json,
        nguon='tiktok', dong_bo_luc=datetime('now','+7 hours')
    `).bind(
      String(returnId), r.order_id || r.order_sn || null,
      r.return_status || r.status || null, r.return_reason || r.reason || null,
      soTien != null ? Math.round(Number(soTien) * 100000) || null : null,
      (r.refund_amount && r.refund_amount.currency) || r.currency || null,
      (r.buyer_info && r.buyer_info.username) || r.buyer_name || null,
      sp, spTen, spSku, soLuong,
      r.return_tracking_number || r.tracking_number || null,
      r.create_time ? String(r.create_time) : null,
      r.update_time ? String(r.update_time) : null,
      JSON.stringify(r)
    ).run();
    them++;
  }
  // Đặt mốc đếm 12h: đơn nào sàn báo "khách đã gửi hàng về" (BUYER_SHIPPED_ITEM)
  // mà chưa có mốc và kho chưa nhận → ghi mốc = bây giờ (giờ VN). Chỉ ghi 1 lần.
  await env.DB.prepare(`
    UPDATE don_hoan SET cho_kho_nhan_tu = datetime('now','+7 hours')
     WHERE nguon='tiktok' AND cho_kho_nhan_tu IS NULL AND kho_nhan_luc IS NULL
       AND trang_thai='BUYER_SHIPPED_ITEM'
  `).run();
  return them;
}

export async function apiDongBo(env, phien) {
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  if (!daCauHinh(env)) return loi('Chưa nạp khóa TikTok trên máy chủ', 409);
  const co = await env.DB.prepare('SELECT shop_id FROM tiktok_ket_noi LIMIT 1').first();
  if (!co) return loi('Chưa kết nối shop TikTok. Hãy bấm “Kết nối TikTok” trước.', 409);
  try {
    const so = await dongBoNen(env);
    return json({ ok: true, so_don: so || 0 });
  } catch (e) {
    return loi(e.message, 502);
  }
}

/* ==========================================================================
   ĐƠN HÀNG — Doanh thu + số đơn (khác Đơn hoàn ở trên, dùng LẠI cùng 1 kết
   nối đã ủy quyền). Xem migrations/them-donhang.sql.
   ⚠️ total_amount là TỔNG GIÁ ĐƠN, CHƯA trừ phí sàn/voucher/phí vận chuyển —
   không phải doanh thu thực nhận (giống lưu ý ở shopee.js).
   ⚠️ Field/endpoint theo tài liệu TikTok bản 202309, CHƯA chạy thử với khóa
   thật — cần tinh chỉnh khi có khóa, giống lưu ý đã có ở dongBoNen() trên.
   ========================================================================== */

let _coBangDonHang = null;
async function coBangDonHang(env) {
  if (_coBangDonHang !== null) return _coBangDonHang;
  try {
    await env.DB.prepare(`SELECT 1 FROM don_hang LIMIT 1`).first();
    _coBangDonHang = true;
  } catch {
    _coBangDonHang = false;
  }
  return _coBangDonHang;
}

/* Chưa có thì lấy ĐẦU NGÀY HÔM NAY (giờ VN) làm nền, không lùi cả tháng
   (chị Huyền chốt 21/08/2026 — cũng nhẹ hơn cho giới hạn subrequest dưới đây). */
function moGocDongBoDonHang(kn) {
  if (kn.dh_dong_bo_den) return Number(kn.dh_dong_bo_den);
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  return Math.floor(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) / 1000) - 7 * 3600;
}

/* Cloudflare Workers giới hạn ~50 subrequest/lần chạy (gói free) — GHI NGAY
   từng trang thay vì gom tới cuối, và mốc dh_dong_bo_den chỉ tiến tới đơn
   cuối ĐÃ GHI XONG (không tiến tới "bây giờ" nếu chưa quét hết), giống hệt
   cách sửa bên shopee.js (Claude 21/08/2026, sau khi shop thật báo lỗi
   "Too many subrequests"). */
const GIOI_HAN_SUBREQ = 35;

export async function dongBoDonHangNen(env) {
  if (!daCauHinh(env)) return null;
  if (!(await coBangDonHang(env))) return null;   // chưa nạp migration them-donhang.sql
  let kn = await ketNoiConHan(env);
  if (!kn) return null;

  if (!kn.shop_cipher) {
    const sc = await layShopCipher(env, kn.access_token);
    if (!sc.cipher) throw new Error('Chưa lấy được mã shop từ TikTok: ' +
      ((sc.raw && sc.raw.message) || JSON.stringify(sc.raw).slice(0, 200)));
    await luuShopCipher(env, sc);
    kn = { ...kn, shop_cipher: sc.cipher };
  }

  const tuGoc = moGocDongBoDonHang(kn);
  const denGoc = nowSec();
  const path = '/order/202309/orders/search';
  let pageToken = '', con = true, trang = 0, them = 0, subReq = 0, mocMoi = null;

  while (con && trang < 20) {                        // chặn trần 20 trang cho an toàn
    if (subReq >= GIOI_HAN_SUBREQ) break;
    const bodyStr = JSON.stringify({
      update_time_ge: tuGoc, update_time_lt: denGoc,
      sort_field: 'update_time', sort_order: 'DESC'
    });
    const query = {
      app_key: env.TIKTOK_APP_KEY, timestamp: String(nowSec()),
      shop_cipher: kn.shop_cipher, page_size: '50',
      ...(pageToken ? { page_token: pageToken } : {})
    };
    const sign = await kyTikTok(env, path, query, bodyStr);
    const q = new URLSearchParams({ ...query, sign });
    const res = await fetch(`${apiHost(env)}${path}?${q}`, {
      method: 'POST',
      headers: { 'x-tts-access-token': kn.access_token, 'Content-Type': 'application/json' },
      body: bodyStr
    });
    subReq++;
    const kq = await res.json();
    if (kq.code && kq.code !== 0) throw new Error('TikTok báo lỗi (orders/search): ' + (kq.message || kq.code));

    const ds = (kq.data && kq.data.orders) || [];
    const cauLenh = [];
    for (const o of ds) {
      const orderId = o.id || o.order_id;
      if (!orderId) continue;
      const soSp = (o.line_items || []).length;
      const tong = o.payment && (o.payment.total_amount || o.payment.sub_total);
      cauLenh.push(env.DB.prepare(`
        INSERT INTO don_hang (order_sn, nguon, trang_thai, tong_tien, tien_te, nguoi_mua, so_sp, tao_luc_san, cap_nhat_san, du_lieu_json, dong_bo_luc)
        VALUES (?, 'tiktok', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))
        ON CONFLICT(order_sn) DO UPDATE SET
          trang_thai=excluded.trang_thai, tong_tien=excluded.tong_tien, tien_te=excluded.tien_te,
          nguoi_mua=excluded.nguoi_mua, so_sp=excluded.so_sp,
          cap_nhat_san=excluded.cap_nhat_san, du_lieu_json=excluded.du_lieu_json,
          dong_bo_luc=datetime('now','+7 hours')
      `).bind(
        String(orderId), o.status || null,
        tong != null ? Math.round(Number(tong) * 100000) || null : null,
        (o.payment && o.payment.currency) || null,
        o.buyer_email || (o.recipient_address && o.recipient_address.name) || null,
        soSp || null,
        o.create_time ? String(o.create_time) : null,
        o.update_time ? String(o.update_time) : null,
        JSON.stringify(o)
      ));
      const ut = Number(o.update_time) || 0;
      if (ut && (mocMoi === null || ut > mocMoi)) mocMoi = ut;
      them++;
    }
    if (cauLenh.length) {
      await env.DB.batch(cauLenh);
      subReq++;
    }

    pageToken = (kq.data && kq.data.next_page_token) || '';
    con = !!pageToken;
    trang++;
  }

  const mocLuu = con ? mocMoi : denGoc;
  if (mocLuu) {
    await env.DB.prepare('UPDATE tiktok_ket_noi SET dh_dong_bo_den = ? WHERE shop_id = ?')
                .bind(String(mocLuu), kn.shop_id).run();
  }
  return them;
}

/* Nút "Đồng bộ đơn hàng" ở tab Kinh doanh — ai xem được Kinh doanh đều bấm được */
export async function apiDongBoDonHang(env, phien) {
  if (!duocXemTab(phien.vai_tro, 'kinhdoanh')) return loi('Bạn không có quyền', 403);
  if (!daCauHinh(env)) return loi('Chưa nạp khóa TikTok trên máy chủ', 409);
  if (!(await coBangDonHang(env))) return loi('Chưa nạp migration them-donhang.sql trên máy chủ', 409);
  const co = await env.DB.prepare('SELECT shop_id FROM tiktok_ket_noi LIMIT 1').first();
  if (!co) return loi('Chưa kết nối shop TikTok. Hãy vào tab Kết nối sàn trước.', 409);
  try {
    const so = await dongBoDonHangNen(env);
    return json({ ok: true, so_don: so || 0 });
  } catch (e) {
    return loi(e.message, 502);
  }
}
