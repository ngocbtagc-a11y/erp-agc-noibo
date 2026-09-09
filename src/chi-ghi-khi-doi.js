/* ==========================================================================
   CHỈ GHI KHI DỮ LIỆU THẬT SỰ ĐỔI  —  ràng buộc chi phí 0 (ADR-0006)
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY (REV-0031 §0.3 · đo lại 28/08/2026 trên bản THẬT)

     npx wrangler d1 info crm-agc
       rows_written_24h = 346.688   /  hạn mức gói miễn phí = 100.000
       write_queries_24h = 113.263

   Truy nguồn (cùng ngày, cùng bản thật):
       SELECT COUNT(*) FROM don_hoan
        WHERE dong_bo_luc >= datetime('now','+7 hours','-6 minutes')  ->  523
   Tức là CẢ 523 dòng đơn hoàn bị ghi đè lại SAU MỖI LƯỢT CRON 5 PHÚT, dù
   sàn không đổi gì. 113.263 / 523 = 216 lượt cron/ngày -> gần như 100% lượt
   ghi của toàn hệ thống là việc ghi đè vô ích này. 346.688 / 113.263 = 3,07
   dòng/lệnh, đúng mức khuếch đại của 1 dòng bảng + 2 chỉ mục
   (idx_don_hoan_trang_thai, idx_don_hoan_cap_nhat) mà lệnh SET có chạm tới.

   Số đơn THẬT SỰ đổi trong 24h (cap_nhat_shopee = update_time của sàn):
       SELECT COUNT(*) FROM don_hoan
        WHERE CAST(cap_nhat_shopee AS INTEGER) >= strftime('%s','now')-86400  ->  60
   60 dòng đổi thật / 150.624 lượt ghi mỗi ngày. 99,96% là ghi đè y nguyên.

   CÁCH VÁ: lọc ở SQL bằng mệnh đề `WHERE` của `ON CONFLICT ... DO UPDATE`,
   KHÔNG so ở JavaScript. So ở JS thì vẫn phải SELECT toàn bộ về trước, tức
   đổi lượt ghi lấy lượt đọc — mà D1 tính cả hai.

   RANH GIỚI CỨNG — KHÔNG ĐƯỢC LÀM MẤT CẬP NHẬT. Kho vận bắt đơn hoàn quá
   hạn dựa vào dữ liệu tươi từng 5 phút; bỏ sót một đơn đổi trạng thái là mất
   tiền thật. Nên mệnh đề lọc liệt kê ĐỦ MỌI CỘT mà lệnh SET ghi (trừ cột dấu
   thời gian `dong_bo_luc` do chính ta sinh ra): chỉ cần MỘT cột khác đi là
   ghi. `IS NOT` của SQLite so an toàn với NULL (khác `!=`, vốn trả NULL khi
   một vế là NULL và như thế sẽ NUỐT MẤT bản cập nhật).

   HỆ QUẢ CÓ CHỦ Ý: `dong_bo_luc` từ nay là "lần cuối dữ liệu đơn này ĐỔI",
   không còn là "lần cuối cron chạy qua". Trước đây mọi dòng có cùng một giá
   trị nên `ORDER BY dong_bo_luc DESC` chỉ là thứ tự ngẫu nhiên; nay nó có
   nghĩa thật.

   ⚠️ HỆ QUẢ ĐÓ LAN RA MỌI CHỖ ĐỌC CỘT NÀY — chỗ nào vừa `ORDER BY dong_bo_luc`
   vừa `LIMIT` là chỗ ÂM THẦM CẮT MẤT ĐƠN LÂU NHẤT KHÔNG ĐỔI, tức đơn tồn quá
   hạn. Quét toàn `src/` ngày 28/08/2026 có 5 chỗ đọc, ĐÚNG HAI chỗ có `LIMIT`
   và cả hai đã xử:
     · `hoanLichSu` (index.js · LIMIT 500 / 523 dòng) -> xếp theo `tao_luc_shopee`.
     · `apiDanhSach` (shopee.js · MÀN KHO VẬN · LIMIT 300) -> BỎ HẲN `LIMIT`
       (REV-0033 lỗi #1 — sót ở vòng trước, suýt phát hành).
   Ba chỗ còn lại (index.js: kdCanDoiSoat, kdDonHuy, ktCanTraSoat) không có
   `LIMIT` nên chỉ đổi thứ tự hiển thị, không mất dòng.
   Máy quét canh tái phát: `npm run do-hangdoi-khovan`.
   ========================================================================== */

/** Cột của `don_hoan` mà cả shopee.js lẫn tiktok.js đều ghi trong DO UPDATE.
 *  Thêm cột vào lệnh SET thì PHẢI thêm vào đây, nếu không là mất cập nhật. */
export const COT_DON_HOAN = [
  'trang_thai', 'ly_do', 'so_tien', 'tien_te', 'nguoi_mua', 'san_pham',
  'san_pham_ten', 'san_pham_sku', 'so_luong', 'ma_van_don',
  'cap_nhat_shopee', 'du_lieu_json'
];

/** Cột `don_hang` luôn được ghi (các cột tuỳ chọn truyền thêm qua tham số). */
export const COT_DON_HANG = [
  'trang_thai', 'tong_tien', 'tien_te', 'nguoi_mua', 'so_sp',
  'cap_nhat_san', 'du_lieu_json'
];

/**
 * Dựng mệnh đề `WHERE` cho `ON CONFLICT ... DO UPDATE`.
 * @param {string} bang   tên bảng (vế cũ)
 * @param {string[]} cot  các cột phải so
 * @param {string[]} them các vế so thêm, viết sẵn SQL (vd: `don_hoan.nguon IS NOT 'tiktok'`)
 * @returns {string} `WHERE a IS NOT excluded.a OR b IS NOT excluded.b ...`
 */
export function locDoi(bang, cot, them = []) {
  const ve = cot.map(c => `${bang}.${c} IS NOT excluded.${c}`).concat(them);
  if (!ve.length) throw new Error('locDoi: danh sách cột rỗng — sẽ KHÔNG BAO GIỜ ghi, mất cập nhật');
  return 'WHERE ' + ve.join('\n           OR ');
}

/* ==========================================================================
   ĐỪNG GỬI CẢ LỆNH GHI KHI BIẾT CHẮC KHÔNG CÓ GÌ ĐỔI  (đo 06/09/2026)
   --------------------------------------------------------------------------
   `locDoi` ở trên đã chặn được việc GHI thừa — đó là vá đúng, và số liệu ghi
   đã về mức lành. Nhưng nó chặn ở trong lòng câu lệnh: lệnh vẫn được gửi đi,
   database vẫn phải tra khoá và đọc dòng cũ ra để so, rồi mới quyết định
   không ghi. Phần ĐỌC đó vẫn bị tính tiền.

   Đo bằng `wrangler d1 insights` (7 ngày tính tới 06/09/2026):
       INSERT INTO don_hoan ... ON CONFLICT ...
       chạy 201.015 lần · mỗi lần đọc 10 dòng · tổng 2.211.017 lượt đọc
   Tức khoảng 28.700 lệnh mỗi ngày, trong khi số đơn hoàn THẬT SỰ đổi chỉ
   khoảng 60 mỗi ngày (con số đo được ghi ở đầu file này). Hơn 99% số lệnh gửi
   đi chỉ để nhận về câu trả lời "không có gì đổi".

   VÌ SAO KHÔNG MÂU THUẪN VỚI ADR-0006. Phần đầu file này bác bỏ cách "SELECT
   toàn bộ về rồi so ở JS", vì hồi đó mục tiêu là giảm GHI, mà làm vậy chỉ là
   đổi lượt ghi lấy lượt đọc. Ở đây mục tiêu là giảm ĐỌC, và phép tính đảo
   chiều: MỘT câu SELECT hai cột cho cả lô (đọc ~523 dòng, đi thẳng theo khoá
   chính) rẻ hơn hẳn 523 lệnh INSERT mỗi lệnh đọc 10 dòng. Cùng một dữ liệu,
   một lần đọc thay vì năm nghìn.

   RANH GIỚI CỨNG VẪN GIỮ NGUYÊN — KHÔNG ĐƯỢC LÀM MẤT CẬP NHẬT:
     · So bằng `cap_nhat_shopee` (update_time của sàn) VÀ `trang_thai`. Chỉ cần
       một trong hai khác là ghi. Trạng thái nằm trong đó là có chủ ý: mốc đếm
       12 giờ của Kho vận dựa vào `trang_thai = 'BUYER_SHIPPED_ITEM'`, nên đơn
       đổi trạng thái luôn đi qua được bộ lọc này, không bao giờ bị giữ lại.
     · Đơn CHƯA CÓ trong database thì luôn ghi.
     · Đọc lỗi thì trả về "ghi tất" — hỏng bộ lọc phải nghiêng về phía ghi thừa,
       tuyệt đối không nghiêng về phía bỏ sót.
     · Người bấm nút "Đồng bộ" và lượt quét đối soát hằng ngày đều chạy với
       batLoc = false, tức ghi đè tất, để vá mọi trường hợp hi hữu sàn đổi dữ
       liệu mà không đổi cả update_time lẫn trạng thái.
   ========================================================================== */

/** D1 giới hạn số tham số mỗi câu lệnh; chia lô cho chắc, 200 là thừa an toàn. */
const LO_HOI = 200;

/**
 * Lọc ra những đơn hoàn thật sự cần gửi lệnh ghi.
 * @param {*} env
 * @param {{rsn:string, up:string|null, st:string|null}[]} ds  danh sách đơn vừa lấy từ sàn
 * @param {{batLoc?: boolean}} tuyChon  batLoc=false → ghi tất (nút bấm tay, quét đối soát)
 * @returns {Promise<boolean[]>} mảng cùng thứ tự với ds: true = cần ghi
 */
export async function locDonHoanCanGhi(env, ds, { batLoc = true } = {}) {
  if (!batLoc || !ds.length) return ds.map(() => true);

  const dangCo = new Map();
  try {
    for (let i = 0; i < ds.length; i += LO_HOI) {
      const lo = ds.slice(i, i + LO_HOI);
      const cho = lo.map(() => '?').join(',');
      const { results } = await env.DB.prepare(
        `SELECT return_sn, cap_nhat_shopee, trang_thai
           FROM don_hoan WHERE return_sn IN (${cho})`
      ).bind(...lo.map(d => d.rsn)).all();
      for (const r of results || []) dangCo.set(String(r.return_sn), r);
    }
  } catch (e) {
    // Hỏng bộ lọc thì ghi tất — thà tốn thêm một lượt còn hơn nuốt mất cập nhật.
    console.error('locDonHoanCanGhi: đọc lỗi, ghi tất cho chắc:', e.message);
    return ds.map(() => true);
  }

  const nhu = v => (v === null || v === undefined ? '' : String(v));
  return ds.map(d => {
    const cu = dangCo.get(d.rsn);
    if (!cu) return true;
    return nhu(cu.cap_nhat_shopee) !== nhu(d.up) || nhu(cu.trang_thai) !== nhu(d.st);
  });
}
