/* ==========================================================================
   SỐ ĐỎ TRÊN BIỂU TƯỢNG ERP Ở THANH TÁC VỤ — "nhìn cái là biết có tin"
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY. Sếp Ngọc 29/08/2026, chỉ vào biểu tượng Zalo trên thanh
   tác vụ Windows: *"Nếu tao dùng desktop thì hiện thông báo như này nè, để
   không bị miss tin nhắn"*. Tức là: số chưa đọc phải nằm NGAY TRÊN BIỂU TƯỢNG,
   không phải bắt mở ERP ra mới thấy.

   DÙNG THỨ TRÌNH DUYỆT ĐÃ CÓ SẴN: `navigator.setAppBadge(n)` /
   `navigator.clearAppBadge()` (Badging API — chuẩn web, 0 đồng, 0 thư viện).
   Chrome/Edge trên Windows vẽ đúng chấm đỏ có số lên biểu tượng thanh tác vụ
   KHI ERP đã được CÀI như ứng dụng. Chưa cài / Firefox / Safari thì hàm không
   tồn tại — phải HỎNG ÊM, xem luật ở dưới.

   BA LUẬT BẤT BIẾN
   ① MỘT NGUỒN SỐ DUY NHẤT. Số trên biểu tượng và số đỏ trong ERP phải là CÙNG
      một con số, tính bằng CÙNG một hàm (`soDoHienThi`). Hai chỗ tự đếm lấy là
      hai chỗ lệch nhau, mà lệch một lần là mất tin cậy vĩnh viễn. `app.js`
      KHÔNG được tự gọi `setAppBadge` ở đâu khác ngoài `veBadge()`.
   ② HỎNG ÊM. Máy không cài ERP, hoặc trình duyệt không có Badging API, thì mọi
      hàm ở đây trả về `{lam:false}` và KHÔNG ném, KHÔNG in `console.error`.
      Cổng khói coi mọi `console.error` là TRƯỢT (`scripts/cong-khoi.mjs`) —
      một dòng lỗi ở đây là cả cổng đỏ oan cho mọi người dùng Firefox.
   ③ ĐỌC XONG LÀ XOÁ. Số đỏ không tắt khi đã đọc là thứ làm người ta học được
      cách bỏ qua nó vĩnh viễn — mất luôn cả giá trị của lần báo thật.
   ========================================================================== */

/** Ngưỡng ERP tự cắt chữ huy hiệu. Trình duyệt tự cắt số trên biểu tượng theo
 *  cách riêng của nó (Chrome hiện "99+"), ta không can thiệp — nhưng CON SỐ
 *  đưa vào phải là số THẬT, không phải 99 đã bị ta tự bóp. */
export const TRAN_CHU = 99;

/**
 * CON SỐ DUY NHẤT. Cả huy hiệu trong ERP lẫn số trên biểu tượng đều lấy từ đây.
 * @param {number} chuaDoc số chưa đọc THẬT lấy từ máy chủ (`/api/chat/chua-doc`)
 * @param {boolean} dangMo cửa sổ chat có đang mở không (mở = đang đọc = 0)
 * @returns {number} 0 nghĩa là KHÔNG hiện gì (và phải XOÁ số cũ đi)
 */
export function soDoHienThi(chuaDoc, dangMo = false) {
  const n = Number(chuaDoc);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (dangMo) return 0;
  return Math.floor(n);
}

/** Chữ in trong huy hiệu tròn của ERP. Cùng gốc số với `soDoHienThi` nên hai
 *  chỗ không thể đá nhau. `''` = ẩn huy hiệu. */
export function chuHuyHieu(so) {
  return so > 0 ? (so > TRAN_CHU ? TRAN_CHU + '+' : String(so)) : '';
}

/**
 * Đặt / xoá số đỏ trên biểu tượng ứng dụng. HỎNG ÊM tuyệt đối (luật ②).
 * @param {number} so 0 = xoá
 * @param {object} mt bề mặt `navigator` — bàn thử đưa vào bản giả để đo THẬT
 * @returns {{lam:boolean, viec:'dat'|'xoa'|null, so:number, ly_do:string|null}}
 */
export function datSoDo(so, mt = (typeof navigator !== 'undefined' ? navigator : null)) {
  const n = soDoHienThi(so, false);
  if (!mt || typeof mt.setAppBadge !== 'function' || typeof mt.clearAppBadge !== 'function') {
    return { lam: false, viec: null, so: n, ly_do: 'khong_ho_tro' };
  }
  try {
    /* `setAppBadge` trả Promise. Promise bị từ chối mà không ai bắt là
       "unhandled rejection" — cổng khói tính đó là TRƯỢT y như console.error.
       `?.catch` ở đây phòng ca trình duyệt trả về `undefined` thay vì Promise. */
    const p = n > 0 ? mt.setAppBadge(n) : mt.clearAppBadge();
    p?.catch?.(() => { /* hệ điều hành từ chối vẽ — im lặng, không phải lỗi ERP */ });
    return { lam: true, viec: n > 0 ? 'dat' : 'xoa', so: n, ly_do: null };
  } catch {
    // Ném đồng bộ (một số bản Edge cũ khi chưa cài app) — cũng im.
    return { lam: false, viec: null, so: n, ly_do: 'nem_loi' };
  }
}

/* ==========================================================================
   NHẮC CÀI ERP LÊN MÁY — không cài thì KHÔNG CÓ biểu tượng để gắn số
   ---------------------------------------------------------------------------
   Nhưng đây là chỗ rất dễ thành phiền. Luật: MỘT dải nhỏ, MỘT lần, bấm bỏ qua
   là THÔI HẲN. Trên điện thoại KHÔNG hiện — ở đó đã có thông báo đẩy rồi, thêm
   một lời mời nữa chỉ là quảng cáo.
   ========================================================================== */

/** Khoá nhớ "đã bỏ qua" trong localStorage của chính máy đó. */
export const KHOA_BO_QUA = 'erp_bo_qua_cai_may';

/**
 * @param {object} mt
 *   coSuKienCai      — trình duyệt đã bắn `beforeinstallprompt` chưa (tức là
 *                      CÀI ĐƯỢC và CHƯA CÀI). Không có nó thì không mời nổi.
 *   daCaiRoi         — đang chạy dạng ứng dụng (`display-mode: standalone`)
 *   laDienThoai      — màn hình nhỏ / thiết bị cảm ứng
 *   daBoQua          — đã bấm "Bỏ qua" lần trước
 * @returns {{hien:boolean, ly_do:string}}
 */
export function nenNhacCai(mt = {}) {
  const { coSuKienCai = false, daCaiRoi = false, laDienThoai = false, daBoQua = false } = mt;
  if (daCaiRoi) return { hien: false, ly_do: 'da_cai_roi' };
  if (laDienThoai) return { hien: false, ly_do: 'dien_thoai' };
  if (daBoQua) return { hien: false, ly_do: 'da_bo_qua' };
  if (!coSuKienCai) return { hien: false, ly_do: 'trinh_duyet_khong_cai_duoc' };
  return { hien: true, ly_do: 'nen_moi' };
}

/** Câu chữ CỐ ĐỊNH của dải mời. Nói đúng cái người ta được lợi, không nói
 *  "cài ứng dụng" chung chung — không ai cài một thứ chỉ vì nó là ứng dụng. */
export const CHU_NHAC_CAI =
  'Cài ERP lên máy để thấy số tin mới ngay trên biểu tượng, không phải mở ERP ra xem.';
