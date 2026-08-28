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
   nghĩa thật. Riêng `hoanLichSu` (LIMIT 500 / 523 dòng) đã đổi sang xếp theo
   `tao_luc_shopee` để không có đơn cũ nào bị rơi khỏi trang.
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
