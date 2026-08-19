/* ==========================================================================
   MODULE SHOPEE — Đơn hoàn (Returns)   (Cloudflare Worker)
   ---------------------------------------------------------------------------
   Khung sẵn sàng, CHỜ KHÓA THẬT. Khi chưa nạp partner_id/partner_key thì mọi
   đầu việc trả "chưa cấu hình" một cách lịch sự, KHÔNG làm sập máy chủ.

   Cấu hình đọc từ biến môi trường (đặt trong wrangler.toml [vars] và secret):
     SHOPEE_PARTNER_ID   — mã đối tác (public), để [vars]
     SHOPEE_PARTNER_KEY  — khóa bí mật, đặt bằng:  wrangler secret put SHOPEE_PARTNER_KEY
     SHOPEE_HOST         — mặc định https://partner.shopeemobile.com (Live)
     SHOPEE_REDIRECT     — URL callback đã khai với Shopee

   Cách Shopee ký (bắt buộc):
     - API công khai (lấy/ làm mới token, link ủy quyền):
         base = partner_id + path + timestamp
     - API theo shop (đơn hoàn…):
         base = partner_id + path + timestamp + access_token + shop_id
     sign = HMAC-SHA256(base, partner_key)  → chuỗi hex
   ========================================================================== */

import { duocQuanLyShopee, duocXemDonHoan } from './quyen.js';

/* ---- Trả lời JSON ------------------------------------------------------- */
function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }

/* ---- Cấu hình ----------------------------------------------------------- */
export function daCauHinh(env) {
  return !!(env.SHOPEE_PARTNER_ID && env.SHOPEE_PARTNER_KEY);
}
function host(env) { return (env.SHOPEE_HOST || 'https://partner.shopeemobile.com').replace(/\/+$/, ''); }
function redirect(env) { return env.SHOPEE_REDIRECT || 'https://erp-agc.noiboagc.workers.dev/api/shopee/callback'; }
function nowSec() { return Math.floor(Date.now() / 1000); }

/* ---- Ký HMAC-SHA256 → hex ---------------------------------------------- */
async function ky(env, base) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.SHOPEE_PARTNER_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(base));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---- Link ủy quyền shop ------------------------------------------------- */
export async function linkUyQuyen(env) {
  const pid = Number(env.SHOPEE_PARTNER_ID);
  const path = '/api/v2/shop/auth_partner';
  const ts = nowSec();
  const sign = await ky(env, `${pid}${path}${ts}`);
  const q = new URLSearchParams({
    partner_id: String(pid), timestamp: String(ts), sign, redirect: redirect(env)
  });
  return `${host(env)}${path}?${q}`;
}

/* ---- Gọi API công khai (token) ----------------------------------------- */
async function goiCongKhai(env, path, body) {
  const pid = Number(env.SHOPEE_PARTNER_ID);
  const ts = nowSec();
  const sign = await ky(env, `${pid}${path}${ts}`);
  const url = `${host(env)}${path}?partner_id=${pid}&timestamp=${ts}&sign=${sign}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partner_id: pid, ...body })
  });
  return res.json();
}

/* ---- Lưu / cập nhật token ---------------------------------------------- */
async function luuToken(env, shopId, kq) {
  // Shopee trả expire_in (giây). Trừ 10 phút đệm cho an toàn.
  const hetHan = nowSec() + (Number(kq.expire_in) || 14400) - 600;
  await env.DB.prepare(`
    INSERT INTO shopee_ket_noi (shop_id, access_token, refresh_token, token_het_han, cap_nhat_luc)
    VALUES (?, ?, ?, ?, datetime('now','+7 hours'))
    ON CONFLICT(shop_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_het_han = excluded.token_het_han,
      cap_nhat_luc = datetime('now','+7 hours')
  `).bind(String(shopId), kq.access_token, kq.refresh_token, String(hetHan)).run();
}

/* ---- Đổi code (sau ủy quyền) lấy token --------------------------------- */
export async function doiCodeLayToken(env, code, shopId) {
  const kq = await goiCongKhai(env, '/api/v2/auth/token/get', { code, shop_id: Number(shopId) });
  if (!kq.access_token) throw new Error(kq.message || kq.error || 'Không đổi được token');
  await luuToken(env, shopId, kq);
  return kq;
}

/* ---- Làm mới token bằng refresh_token ---------------------------------- */
export async function lamMoiToken(env) {
  const kn = await env.DB.prepare('SELECT shop_id, refresh_token FROM shopee_ket_noi LIMIT 1').first();
  if (!kn) return null;
  const kq = await goiCongKhai(env, '/api/v2/auth/access_token/get', {
    refresh_token: kn.refresh_token, shop_id: Number(kn.shop_id)
  });
  if (!kq.access_token) throw new Error(kq.message || kq.error || 'Không làm mới được token');
  await luuToken(env, kn.shop_id, kq);
  return kq;
}

/* ---- Lấy kết nối còn hạn (tự làm mới nếu sắp hết) ----------------------- */
async function ketNoiConHan(env) {
  const kn = await env.DB.prepare('SELECT * FROM shopee_ket_noi LIMIT 1').first();
  if (!kn) return null;
  if (nowSec() >= Number(kn.token_het_han)) {
    await lamMoiToken(env);
    return env.DB.prepare('SELECT * FROM shopee_ket_noi LIMIT 1').first();
  }
  return kn;
}

/* ---- Gọi API theo shop (đã ký kèm access_token + shop_id) -------------- */
async function goiTheoShop(env, path, kn, thamSo = {}) {
  const pid = Number(env.SHOPEE_PARTNER_ID);
  const ts = nowSec();
  const sign = await ky(env, `${pid}${path}${ts}${kn.access_token}${kn.shop_id}`);
  const q = new URLSearchParams({
    partner_id: String(pid), timestamp: String(ts),
    access_token: kn.access_token, shop_id: String(kn.shop_id), sign, ...thamSo
  });
  const res = await fetch(`${host(env)}${path}?${q}`);
  return res.json();
}

/* ==========================================================================
   ĐẦU VIỆC CHO ROUTE
   ========================================================================== */

/* Trạng thái kết nối — cho tab Đơn hoàn vẽ đúng (đã nối hay chưa) */
export async function apiTrangThai(env, phien) {
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền xem Đơn hoàn', 403);
  const cauHinh = daCauHinh(env);
  const kn = cauHinh ? await env.DB.prepare('SELECT shop_id, token_het_han, cap_nhat_luc FROM shopee_ket_noi LIMIT 1').first() : null;
  return json({
    da_cau_hinh: cauHinh,
    da_ket_noi: !!kn,
    shop_id: kn ? kn.shop_id : null,
    cap_nhat_luc: kn ? kn.cap_nhat_luc : null,
    quyen: { quan_ly: duocQuanLyShopee(phien.vai_tro) }
  });
}

/* Bắt đầu kết nối: chuyển hướng sang trang ủy quyền của Shopee (admin) */
export async function apiConnect(env, phien) {
  if (!duocQuanLyShopee(phien.vai_tro)) return loi('Chỉ Giám đốc / Phó Giám đốc mới được kết nối Shopee', 403);
  if (!daCauHinh(env)) return loi('Chưa nạp khóa Shopee (partner_id/partner_key) trên máy chủ', 409);
  const url = await linkUyQuyen(env);
  return new Response(null, { status: 302, headers: { Location: url } });
}

/* Shopee gọi lại sau khi shop bấm đồng ý — nhận code + shop_id, đổi token */
export async function apiCallback(env, urlObj) {
  if (!daCauHinh(env)) return new Response('Chưa cấu hình Shopee', { status: 409 });
  const code = urlObj.searchParams.get('code');
  const shopId = urlObj.searchParams.get('shop_id');
  if (!code || !shopId) return new Response('Thiếu code hoặc shop_id', { status: 400 });
  try {
    await doiCodeLayToken(env, code, shopId);
    // Ủy quyền xong → đưa người dùng về app, gắn cờ để giao diện báo thành công
    return new Response(null, { status: 302, headers: { Location: '/app?shopee=ok' } });
  } catch (e) {
    return new Response('Kết nối Shopee thất bại: ' + e.message, { status: 502 });
  }
}

/* Đồng bộ đơn hoàn Shopee về DB — dùng cho CẢ nút bấm lẫn lịch chạy nền.
   Trả về số đơn; null nếu chưa cấu hình/chưa kết nối; ném lỗi nếu API lỗi. */
export async function dongBoNen(env) {
  if (!daCauHinh(env)) return null;
  const kn = await ketNoiConHan(env);
  if (!kn) return null;

  let pageNo = 0, them = 0, con = true;
  while (con && pageNo < 20) {                     // chặn trần 20 trang cho an toàn
    const kq = await goiTheoShop(env, '/api/v2/returns/get_return_list', kn, {
      page_no: String(pageNo), page_size: '50'
    });
    if (kq.error) throw new Error('Shopee báo lỗi: ' + (kq.message || kq.error));
    const ds = (kq.response && kq.response.return) || [];
    for (const r of ds) {
      const tenArr = [], skuArr = [];
      let tongSl = 0;
      const sp = (r.item || []).map(it => {
        const ten = it.name || it.item_name || '';
        const sku = it.item_sku || it.model_sku || '';
        const sl = Number(it.amount || it.quantity) || 1;
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
        INSERT INTO don_hoan (return_sn, order_sn, trang_thai, ly_do, so_tien, tien_te, nguoi_mua, san_pham, san_pham_ten, san_pham_sku, so_luong, ma_van_don, tao_luc_shopee, cap_nhat_shopee, du_lieu_json, dong_bo_luc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))
        ON CONFLICT(return_sn) DO UPDATE SET
          trang_thai=excluded.trang_thai, ly_do=excluded.ly_do, so_tien=excluded.so_tien,
          tien_te=excluded.tien_te, nguoi_mua=excluded.nguoi_mua, san_pham=excluded.san_pham,
          san_pham_ten=excluded.san_pham_ten, san_pham_sku=excluded.san_pham_sku, so_luong=excluded.so_luong,
          ma_van_don=excluded.ma_van_don,
          cap_nhat_shopee=excluded.cap_nhat_shopee, du_lieu_json=excluded.du_lieu_json,
          dong_bo_luc=datetime('now','+7 hours')
      `).bind(
        String(r.return_sn), r.order_sn || null, r.status || null, r.reason || null,
        Math.round((Number(r.refund_amount) || 0) * 100000) || null, r.currency || null,
        (r.user && r.user.username) || null, sp, spTen, spSku, soLuong,
        r.tracking_number || r.return_tracking_number || null,
        r.create_time ? String(r.create_time) : null,
        r.update_time ? String(r.update_time) : null,
        JSON.stringify(r)
      ).run();
      them++;
    }
    con = !!(kq.response && kq.response.more);
    pageNo++;
  }
  return them;
}

/* Đồng bộ đơn hoàn: kéo get_return_list về, lưu vào bảng don_hoan (nút bấm) */
export async function apiDongBo(env, phien) {
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  if (!daCauHinh(env)) return loi('Chưa nạp khóa Shopee trên máy chủ', 409);
  const co = await env.DB.prepare('SELECT shop_id FROM shopee_ket_noi LIMIT 1').first();
  if (!co) return loi('Chưa kết nối shop Shopee. Hãy bấm “Kết nối Shopee” trước.', 409);
  try {
    const so = await dongBoNen(env);
    return json({ ok: true, so_don: so || 0 });
  } catch (e) {
    return loi(e.message, 502);
  }
}

/* Danh sách đơn hoàn đã lưu (để tab hiển thị) */
export async function apiDanhSach(env, phien) {
  if (!duocXemDonHoan(phien.vai_tro)) return loi('Bạn không có quyền', 403);
  const { results } = await env.DB.prepare(`
    SELECT return_sn, order_sn, trang_thai, ly_do, so_tien, tien_te, nguoi_mua,
           san_pham, san_pham_ten, san_pham_sku, so_luong, ma_van_don, nguon,
           cap_nhat_shopee, dong_bo_luc,
           kho_nhan_luc, kho_nhan_boi, cho_kho_nhan_tu, lan_tra_soat, dang_cho
      FROM don_hoan
     WHERE trang_thai NOT LIKE '%CANCEL%'
     ORDER BY dong_bo_luc DESC LIMIT 300
  `).all();
  return json({ don_hoan: results });
}
