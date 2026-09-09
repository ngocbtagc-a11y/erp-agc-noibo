/* ==========================================================================
   ĐẾM LƯỢT GỌI AI MỖI NGÀY — hôm nay không có gì đếm cả
   ---------------------------------------------------------------------------
   TRA ĐƯỢC, KHÔNG PHẢI PHỎNG ĐOÁN (bản soát 09/09/2026 §8.1): tìm `neuron`,
   `han_muc`, `rate limit`, `quota` trong `src/` ra **0 kết quả**. Cửa
   `POST /api/van-phong/hoi` chỉ có `batBuocDangNhap` — không đếm lượt, không
   giới hạn theo người, theo ngày. Trần duy nhất là 4.000 ký tự mỗi câu hỏi.

   CÙNG LÚC ĐÓ: Workers AI free có **10.000 Neuron/ngày dùng chung toàn hệ
   thống**, và cùng một model chạy ở BA nơi —
     · Mây (src/vp-may.js)
     · Hồ Ly triage, cron 5 phút = **288 lượt/ngày** (src/index.js)
     · soạn kế hoạch, cron ngày (src/vp-kehoach.js)
   Một câu ACTION_REQUEST hệ trọng gọi **7 lượt**. Cạn hạn mức thì cả ba đường
   cùng câm, và không ai biết vì sao vì không có số nào để nhìn.

   FILE NÀY KHÔNG CHẶN, NÓ ĐẾM — và nói rõ vì sao chỉ đếm.
   Đặt một cái trần rồi tự cắt lượt gọi là một quyết định business (câu hỏi nào
   bị từ chối, ai bị từ chối trước) — đó là việc của Sếp, không phải của tôi.
   Thứ chắc chắn đúng cần làm ngay là **có số thật để mà quyết**: hôm nay mọi
   con số về chi phí AI trong repo này đều là ước lượng, kể cả của bản soát.

   VÌ SAO KHÔNG ĐẺ BẢNG MỚI:
   Sếp Ngọc chốt 09/09/2026 — cả khu này chỉ được thêm 4 cột + 1 CHECK + 1 chỉ
   mục, không thêm bảng nào. Nên bộ đếm ở nhờ `lich_su_thay_doi_nen` với
   `bang = 'vp_ai_luot'`. Đây KHÔNG phải nhét bừa: bảng đó vốn là sổ ghi
   "cái gì đổi, từ giá trị nào sang giá trị nào, lúc nào" — một bộ đếm tăng dần
   đúng hình dạng ấy (`gia_tri_cu` → `gia_tri_moi`), và nó đã có sẵn chỉ mục
   `idx_lstdn_doc (bang, ban_ghi_id, luc DESC)` đúng đường đọc.

   GỘP THEO NGÀY, đúng khuôn `ghiNhatKy()` (src/tai-lieu.js): một dòng cho mỗi
   (ngày × loại lượt). 500 lượt gọi trong ngày tốn 500 lượt đọc + 500 lượt ghi
   D1 — nghe nhiều, nhưng một lượt gọi Workers AI đắt hơn một cặp đọc-ghi D1
   vài bậc, và không đếm thì không bao giờ biết 500 hay 5.000.
   ========================================================================== */

/** Tên bảng giả trong sổ chung. Một hằng, một chỗ — để câu đọc và câu ghi
 *  không bao giờ gõ lệch nhau. */
export const BANG_DEM_AI = 'vp_ai_luot';

function ngayVN() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Cộng 1 vào bộ đếm lượt gọi AI của hôm nay.
 *
 *  @param nhan  loại lượt: 'may' | 'holy_triage' | 'ke_hoach' | 'day_nghe' …
 *               Đếm gộp tất cả làm một con số thì biết mình sắp cạn nhưng
 *               không biết vì ai — mà ba đường dùng chung hạn mức này có ba
 *               cách chữa khác hẳn nhau (giảm tần suất cron ≠ giảm câu hỏi).
 *
 *  KHÔNG BAO GIỜ NÉM LỖI RA NGOÀI. Bộ đếm hỏng thì mất một con số thống kê;
 *  bộ đếm làm gãy câu trả lời của trợ lý thì mất cả văn phòng. Thứ tự ưu tiên
 *  đó phải nằm trong mã, không nằm trong ý định.
 */
export async function demLuotAI(env, nhan) {
  try {
    const ngay = ngayVN();
    const cu = await env.DB.prepare(
      'SELECT id, gia_tri_moi FROM lich_su_thay_doi_nen ' +
      ' WHERE bang = ? AND ban_ghi_id = ? AND truong = ? LIMIT 1'
    ).bind(BANG_DEM_AI, ngay, nhan).first();

    if (cu) {
      const so = (Number(cu.gia_tri_moi) || 0) + 1;
      await env.DB.prepare(
        'UPDATE lich_su_thay_doi_nen SET gia_tri_cu = gia_tri_moi, gia_tri_moi = ?, ' +
        "       luc = datetime('now', '+7 hours') WHERE id = ?"
      ).bind(String(so), cu.id).run();
      return so;
    }

    /* Dòng đầu ngày. `nguoi_id` để NULL và `nguoi_ten` ghi 'máy' — đây là lượt
       của MÁY, không của ai cả. Nhét tên người đang đăng nhập vào đây là đúng
       kiểu mạo danh mà them-gopy-lichsu-tacnhan.sql đã đi vá một lần. */
    await env.DB.prepare(
      'INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten) ' +
      'VALUES (?, ?, ?, ?, ?, NULL, ?)'
    ).bind(BANG_DEM_AI, ngay, nhan, '0', '1', 'máy').run();
    return 1;
  } catch (e) {
    console.error('Đếm lượt AI lỗi (bỏ qua, không chặn câu trả lời):', e.message);
    return 0;
  }
}

/** Bảng đếm mấy ngày gần đây, cho tab LỊCH SỬ. Trả về
 *  `[{ngay, tong, theo_loai: {may: 12, holy_triage: 288, …}}, …]`. */
export async function bangDemAI(env, soNgay = 14) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT ban_ghi_id AS ngay, truong AS loai, gia_tri_moi AS so ' +
      '  FROM lich_su_thay_doi_nen ' +
      ' WHERE bang = ? AND ban_ghi_id >= date(?, ?) ' +
      ' ORDER BY ban_ghi_id DESC'
    ).bind(BANG_DEM_AI, ngayVN(), '-' + Number(soNgay) + ' days').all();

    const theoNgay = new Map();
    for (const d of results || []) {
      if (!theoNgay.has(d.ngay)) theoNgay.set(d.ngay, { ngay: d.ngay, tong: 0, theo_loai: {} });
      const o = theoNgay.get(d.ngay);
      const so = Number(d.so) || 0;
      o.theo_loai[d.loai] = so;
      o.tong += so;
    }
    return [...theoNgay.values()];
  } catch (e) {
    console.error('Đọc bảng đếm AI lỗi:', e.message);
    return [];
  }
}
