/* ==========================================================================
   DÒNG HÀNG CỦA ĐƠN (don_hang_item) — bóc `du_lieu_json` của `don_hang` ra
   từng mặt hàng, để tính được doanh số/sản lượng THEO TỪNG SKU.
   Migration: migrations/them-donhang-dong.sql
   Audit:     docs/audit/AUDIT-DASHBOARD-MARKETPLACE.md (mục C.1)

   MỘT bộ tách duy nhất dùng cho cả 2 đường (Rule 5 — không viết lại logic đã có):
     1. Bóc bù dữ liệu cũ  — tachBu() bên dưới, chạy qua nút bấm ở tab Kinh doanh.
     2. Đơn mới đồng bộ về — shopee.js / tiktok.js gọi cauLenhGhiDong().

   Quy ước tiền: don_gia/thanh_tien lưu ×100000, GIỐNG `don_hang.tong_tien`
   (xem migrations/them-donhang.sql) — để đối chiếu được với tổng tiền đơn.
   ========================================================================== */

const HE_SO_TIEN = 100000;
const so = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const tien = v => Math.round(so(v) * HE_SO_TIEN);

/* --------------------------------------------------------------------------
   PHÂN BỔ TIỀN VỀ TỪNG DÒNG HÀNG — phần dễ làm sai nhất, đã đối chiếu với
   150 đơn Shopee + 150 đơn TikTok THẬT trên production (06/09/2026).

   Vì sao không lấy thẳng giá từng mặt hàng làm doanh thu:
   - Shopee: `model_discounted_price` mới chỉ trừ giảm giá của NGƯỜI BÁN.
     Voucher sàn nằm ở cấp ĐƠN, không hề chia về từng dòng. Đo thật: tổng giá
     dòng CAO HƠN `total_amount` tới 16,4% (119/150 đơn lệch). Nếu lấy giá
     dòng làm doanh thu SKU thì tổng doanh thu theo SKU sẽ vống hơn hẳn con số
     "Doanh thu tạm tính" ngay trên cùng màn hình — hai số đá nhau (Rule D4).
   - TikTok: `sale_price` cộng lại khớp `sub_total`, nhưng `total_amount` (thứ
     đang lưu vào `tong_tien`) còn cộng thêm phí ship — đo thật: ship chiếm
     0,9% tổng.

   Vì vậy: chia `tong_tien` của đơn về các dòng THEO TỶ LỆ giá trị dòng. Cách
   này bảo đảm **cộng doanh thu mọi SKU trong 1 đơn = đúng doanh thu đơn đó**,
   không bịa thêm cũng không hụt. Đây là PHÂN BỔ (allocation), không phải giá
   thật của mặt hàng — giá niêm yết sau giảm của người bán vẫn giữ nguyên ở
   `don_gia` để tra khi cần.
   -------------------------------------------------------------------------- */
function phanBoTien(ds, tongDonVnd) {
  const tong = tien(tongDonVnd);
  if (!ds.length) return ds;
  if (!tong) {                                   // đơn không có tổng tiền -> giữ giá gốc
    ds.forEach(d => { d.thanh_tien = d.don_gia ? d.don_gia * d.so_luong : null; });
    return ds;
  }
  // Chia theo giá trị dòng; đơn nào mọi dòng đều thiếu giá thì chia theo số lượng
  let goc = ds.map(d => (d.don_gia || 0) * d.so_luong);
  let tongGoc = goc.reduce((s, v) => s + v, 0);
  if (!tongGoc) { goc = ds.map(d => d.so_luong || 1); tongGoc = goc.reduce((s, v) => s + v, 0); }
  if (!tongGoc) { ds.forEach(d => { d.thanh_tien = null; }); return ds; }

  // Dòng cuối nhận phần còn lại để tổng khớp TUYỆT ĐỐI, không lệch vì làm tròn
  let conLai = tong;
  ds.forEach((d, i) => {
    if (i === ds.length - 1) d.thanh_tien = conLai;
    else { const v = Math.round(tong * goc[i] / tongGoc); d.thanh_tien = v; conLai -= v; }
  });
  return ds;
}

/* --------------------------------------------------------------------------
   Shopee — `item_list`: MỖI PHẦN TỬ LÀ 1 DÒNG HÀNG, đã có sẵn số lượng
   (`model_quantity_purchased`). `don_gia` lấy `model_discounted_price` (giá
   sau giảm của người bán) — chỉ để tham chiếu, doanh thu do phanBoTien tính.
   Đã gặp thật: `item_sku` rỗng còn `model_sku` có giá trị -> ưu tiên model_sku.
   -------------------------------------------------------------------------- */
function tachShopee(o) {
  const ds = (o.item_list || []).map(it => ({
    sku: it.model_sku || it.item_sku || null,
    ten: it.item_name || it.name || null,
    so_luong: so(it.model_quantity_purchased || it.amount) || 1,
    don_gia: tien(it.model_discounted_price ?? it.model_original_price) || null,
    thanh_tien: null
  }));
  return phanBoTien(ds, o.total_amount);
}

/* --------------------------------------------------------------------------
   TikTok — `line_items`: MỖI PHẦN TỬ LÀ 1 ĐƠN VỊ HÀNG (không có trường số
   lượng; 2 cái cùng loại nằm thành 2 phần tử). Đây là khác biệt dễ tính sai
   nhất giữa 2 sàn — code cũ đã dựa đúng vào điểm này (`so_sp` của TikTok =
   `line_items.length`, xem tiktok.js). Vì vậy phải GỘP theo SKU rồi mới đếm.
   -------------------------------------------------------------------------- */
function tachTikTok(o) {
  const gop = new Map();
  for (const it of o.line_items || []) {
    const sku = it.seller_sku || it.sku_id || null;
    const ten = it.product_name || it.sku_name || null;
    const khoa = `${sku || ''} ${ten || ''}`;
    const gia = tien(it.sale_price ?? it.original_price) || null;
    if (!gop.has(khoa)) gop.set(khoa, { sku, ten, so_luong: 0, don_gia: gia, thanh_tien: null });
    gop.get(khoa).so_luong += 1;
  }
  return phanBoTien([...gop.values()], o.payment && o.payment.total_amount);
}

export function tachDong(nguon, o) {
  if (!o || typeof o !== 'object') return [];
  return nguon === 'tiktok' ? tachTikTok(o) : tachShopee(o);
}

/* Câu lệnh ghi dòng hàng của 1 đơn. Ghi đè theo (order_sn, dong) nên chạy lại
   nhiều lần vẫn ra đúng 1 bộ, không nhân bản. */
export function cauLenhGhiDong(env, orderSn, nguon, taoLucSan, dsDong) {
  return dsDong.map((d, i) => env.DB.prepare(`
    INSERT OR REPLACE INTO don_hang_item
      (order_sn, dong, nguon, sku, ten, so_luong, don_gia, thanh_tien, tao_luc_san)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(String(orderSn), i, nguon, d.sku, d.ten, d.so_luong, d.don_gia, d.thanh_tien,
          taoLucSan ? String(taoLucSan) : null));
}

/* Đánh dấu đơn đã bóc dòng xong, để tachBu() không quét lại. Tách riêng vì
   đơn KHÔNG có dòng nào (payload lạ) vẫn phải được đánh dấu, nếu không lô bóc
   bù sẽ lặp vô hạn trên đúng mấy đơn đó. */
export function cauLenhDanhDauDaTach(env, orderSn) {
  return env.DB.prepare('UPDATE don_hang SET da_tach_dong = 1 WHERE order_sn = ?').bind(String(orderSn));
}

export async function coBangDong(env) {
  try { await env.DB.prepare('SELECT 1 FROM don_hang_item LIMIT 1').first(); return true; }
  catch { return false; }
}

/* --------------------------------------------------------------------------
   BÓC BÙ dữ liệu cũ, theo lô. Trả về tiến độ để giao diện gọi lại tới khi hết.

   Doanh thu từng dòng nay được PHÂN BỔ từ `tong_tien` nên tổng luôn khớp đơn —
   không cần đối chiếu tổng nữa. Thứ đáng đếm là DÒNG KHÔNG CÓ SKU: dòng đó biến
   mất khỏi bảng xếp hạng, nên phải báo ra để người ta còn đi gắn mã trên sàn.
   -------------------------------------------------------------------------- */
export async function tachBu(env, gioiHan = 200, { dem = false } = {}) {
  const { results } = await env.DB.prepare(`
    SELECT order_sn, nguon, tong_tien, tao_luc_san, du_lieu_json
      FROM don_hang
     WHERE da_tach_dong = 0
     ORDER BY tao_luc_san DESC
     LIMIT ?
  `).bind(gioiHan).all();

  let soDong = 0, thieuSku = 0, khongDoc = 0, khongCoDong = 0;
  const lenh = [];
  for (const d of results || []) {
    let payload = null;
    try { payload = JSON.parse(d.du_lieu_json || 'null'); }
    catch { khongDoc++; }

    const ds = payload ? tachDong(d.nguon, payload) : [];
    if (!ds.length) khongCoDong++;

    thieuSku += ds.filter(x => !x.sku).length;

    lenh.push(...cauLenhGhiDong(env, d.order_sn, d.nguon, d.tao_luc_san, ds));
    lenh.push(cauLenhDanhDauDaTach(env, d.order_sn));
    soDong += ds.length;
  }
  if (lenh.length) await env.DB.batch(lenh);

  const daXuLy = (results || []).length;

  /* Còn việc nữa hay không thì KHÔNG cần hỏi database: lô này lấy được ít hơn
     mức xin, nghĩa là đã vét sạch. Đây là chỗ trước đây đốt hạn mức nặng nhất
     — câu COUNT(*) chạy sau MỖI lô, mỗi lần đếm lại cả bảng 24.089 dòng, 196
     lô là 4,7 triệu lượt đọc chỉ để hiện một con số lên màn hình. */
  const conNua = daXuLy === gioiHan;

  /* Chỉ đếm khi người gọi thật sự cần con số (giao diện chỉ xin ở lô ĐẦU để
     biết tổng việc, rồi tự trừ dần). Đã vét sạch thì khỏi đếm, chắc chắn là 0. */
  let conLai = conNua ? null : 0;
  if (conNua && dem) {
    const d = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM don_hang WHERE da_tach_dong = 0'
    ).first();
    conLai = (d && d.n) || 0;
  }

  return {
    da_xu_ly: daXuLy, so_dong: soDong,
    thieu_sku: thieuSku, khong_doc_duoc: khongDoc, khong_co_dong: khongCoDong,
    con_nua: conNua,      // dùng cái này để quyết định gọi lô tiếp
    con_lai: conLai       // null = chưa đếm (còn việc, nhưng không hỏi cho đỡ tốn)
  };
}

/* --------------------------------------------------------------------------
   XẾP HẠNG SKU trong 1 kỳ.

   Gốc bảng xếp hạng là DANH MỤC SẢN PHẨM ĐANG KINH DOANH (`san_pham`), không
   phải danh sách SKU đã bán. Lý do: "10 SKU bán kém nhất" mà chỉ xếp trong số
   SKU CÓ bán thì bỏ sót đúng nhóm tệ nhất — mã bán được 0 cái sẽ không xuất
   hiện dòng nào để mà xếp hạng. Vì vậy LEFT JOIN: mã không bán được vẫn hiện,
   với số 0.

   SKU xuất hiện trong đơn nhưng KHÔNG khớp mã nào trong kho được trả riêng ở
   `chua_khop` — đây là việc cần người sửa (gắn đúng SKU trên sàn), không phải
   thứ để giấu đi.
   -------------------------------------------------------------------------- */
export async function xepHangSku(env, tu, den, soLay = 10) {
  // ⚠️ PHẢI loại đơn đã HỦY, nếu không bảng xếp hạng sẽ nói dối: một mã bị
  // hủy hàng loạt vẫn leo lên "bán chạy". Loại bằng JOIN sang `don_hang` thay
  // vì chép trạng thái vào `don_hang_item` — trạng thái đơn còn đổi về sau
  // (đang giao -> hủy), chép ra là ôm dữ liệu cũ (Rule 1: không tạo bản sao).
  //
  // KHÁC `doanh_thu_tam_tinh` một điểm: ở đây CHƯA trừ tiền hoàn, vì sàn trả
  // tiền hoàn theo ĐƠN chứ không theo từng dòng hàng — không có cách chia về
  // đúng SKU mà không bịa. Vì vậy metric này mang tên riêng `doanh_thu_sku`
  // (Rule D4: khác định nghĩa thì khác tên), xem METRIC-DEFINITIONS.md.
  const banRa = `
    SELECT UPPER(TRIM(i.sku)) AS sku,
           MAX(i.ten)                     AS ten,
           COALESCE(SUM(i.so_luong), 0)   AS so_luong,
           COALESCE(SUM(i.thanh_tien), 0) AS doanh_thu
      FROM don_hang_item i
      JOIN don_hang h ON h.order_sn = i.order_sn
     WHERE i.sku IS NOT NULL AND TRIM(i.sku) <> ''
       AND COALESCE(h.trang_thai, '') <> 'CANCELLED'
       AND CAST(i.tao_luc_san AS INTEGER) >= ? AND CAST(i.tao_luc_san AS INTEGER) < ?
     GROUP BY UPPER(TRIM(i.sku))
  `;

  /* Gốc xếp hạng: DANH MỤC SẢN PHẨM (`san_pham`) mới là đúng, vì "10 mã bán
     kém nhất" phải bao gồm cả mã bán được 0 cái — mà mã đó không có dòng nào
     trong đơn hàng để mà xếp.

     NHƯNG danh mục kho có thể còn TRỐNG (đúng hiện trạng production 06/09/2026:
     `san_pham` 0 dòng — module Kho vận chưa nhập liệu). Lúc đó nếu cứ xếp theo
     `san_pham` thì bảng rỗng trơn, tính năng vô dụng. Vì vậy tự chuyển sang
     xếp trên chính các SKU đã bán, và BÁO RÕ cho người xem là đang ở chế độ
     hạn chế — không lặng lẽ đưa ra bảng thiếu rồi để Sếp tưởng là đủ. */
  const dem = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM san_pham WHERE dang_ban = 1 AND ma_sku IS NOT NULL AND TRIM(ma_sku) <> ''"
  ).first().catch(() => null);
  const coDanhMuc = !!(dem && dem.n > 0);

  const doiTien = r => ({
    sku: r.sku, ten: r.ten,
    so_luong: r.so_luong || 0,
    doanh_thu: Math.round((r.doanh_thu || 0) / HE_SO_TIEN)
  });

  let ds, chuaKhop = [];
  if (coDanhMuc) {
    const [xh, ck] = await Promise.all([
      env.DB.prepare(`
        SELECT p.ma_sku AS sku, p.ten AS ten,
               COALESCE(b.so_luong, 0)  AS so_luong,
               COALESCE(b.doanh_thu, 0) AS doanh_thu
          FROM san_pham p
          LEFT JOIN (${banRa}) b ON b.sku = UPPER(TRIM(p.ma_sku))
         WHERE p.ma_sku IS NOT NULL AND TRIM(p.ma_sku) <> ''
           AND p.dang_ban = 1
      `).bind(tu, den).all(),
      env.DB.prepare(`
        SELECT b.sku AS sku, b.ten AS ten, b.so_luong AS so_luong, b.doanh_thu AS doanh_thu
          FROM (${banRa}) b
          LEFT JOIN san_pham p ON UPPER(TRIM(p.ma_sku)) = b.sku AND p.dang_ban = 1
         WHERE p.ma_sku IS NULL
         ORDER BY b.doanh_thu DESC
         LIMIT 20
      `).bind(tu, den).all()
    ]);
    ds = (xh.results || []).map(doiTien);
    chuaKhop = (ck.results || []).map(doiTien);
  } else {
    const xh = await env.DB.prepare(`SELECT * FROM (${banRa})`).bind(tu, den).all();
    ds = (xh.results || []).map(doiTien);
  }

  // Bán chạy: nhiều tiền nhất trước. Bán kém: ít tiền nhất trước, mã bán 0 cái
  // xếp trên cùng (tệ nhất). Hai đầu bảng có thể trùng nhau khi ít mã hàng —
  // giao diện tự xử, ở đây không tự ý cắt bớt cho "đẹp".
  const banChay = [...ds].sort((a, b) => b.doanh_thu - a.doanh_thu || b.so_luong - a.so_luong).slice(0, soLay);
  const banKem  = [...ds].sort((a, b) => a.doanh_thu - b.doanh_thu || a.so_luong - b.so_luong).slice(0, soLay);

  return {
    ban_chay: banChay,
    ban_kem: banKem,
    // 'danh_muc' = xếp trên toàn bộ mã hàng đang kinh doanh (đúng đủ).
    // 'da_ban'   = danh mục kho còn trống, chỉ xếp trên mã ĐÃ bán được (thiếu
    //              hẳn nhóm bán 0 cái) — giao diện phải nói rõ chỗ này.
    nguon_xep_hang: coDanhMuc ? 'danh_muc' : 'da_ban',
    so_ma_hang: ds.length,
    so_ma_ban_duoc: ds.filter(x => x.so_luong > 0).length,
    chua_khop: chuaKhop
  };
}
