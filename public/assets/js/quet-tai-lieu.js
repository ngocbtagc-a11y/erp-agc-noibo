/* ==========================================================================
   QUÉT TÀI LIỆU BẰNG ĐIỆN THOẠI — LÕI DÙNG CHUNG
   CTL-0026 (kho chung, Đợt 1)  ·  CTL-0025 (hồ sơ nhân sự, Đợt 2)
   ---------------------------------------------------------------------------
   MỘT cỗ máy, HAI cửa vào. Khác nhau CHỈ ở hai tham số `cuaVao` + `ganId`;
   mọi thứ còn lại — chụp, nén, gộp trang, xem lại, chụp lại, nhập hạn, gửi
   lại khi sóng yếu — dùng chung. Đợt 2 chỉ việc gọi:

       moQuetTaiLieu({ cuaVao: 'nhan_su', ganId: nhanSu.id, ... })

   ---------------------------------------------------------------------------
   NĂM CHUYỆN THẬT PHẢI GIẢI (CTL-0025 Mục 3 · CTL-0026 phần "Năm chuyện"):

   ① NHIỀU TRANG   → `gop-trang-pdf.js` gộp N ảnh thành MỘT file PDF ở máy.
                     Kho nhận đúng 1 tài liệu, không phải 5 ảnh rời.
   ② ẢNH 3–8 MB    → nén bằng `nenAnhChung()` NGAY khi vừa chụp, trước khi
                     bất cứ byte nào rời điện thoại. Kho sóng yếu, gửi nguyên
                     ảnh máy ảnh là treo.
   ③ CHỤP LỆCH/MỜ  → mỗi trang có ô xem lại + nút "Chụp lại" RIÊNG cho trang
                     đó. Lưu rồi mới thấy mờ là phải làm lại cả bộ.
   ④ LOẠI GIẤY TỜ  → chọn nhóm TRƯỚC KHI mở máy ảnh. Chọn xong máy ảnh bật
                     luôn, không tốn thêm một cú chạm nào.
   ⑤ NGÀY HẾT HẠN  → hỏi ngay ở màn cuối, có phím tắt +1/+2/+3 năm. Để sau là
                     không ai quay lại nhập.

   ---------------------------------------------------------------------------
   SÓNG YẾU (ràng buộc cứng): toàn bộ bộ ảnh đã chụp nằm trong `localStorage`
   NGAY SAU MỖI LẦN CHỤP. Gửi hụt, tắt máy, hết pin, đóng nhầm tab — mở lại
   vẫn còn nguyên và bấm "Gửi lại" là xong. `maGui` giữ NGUYÊN qua mọi lần gửi
   lại, nên máy chủ nhận ra và KHÔNG tạo bản trùng trên Drive.

   ⚠️ Câu bắt buộc trên màn hình (CTL-0026 Mục 2): đây là BẢN DỰ PHÒNG, KHÔNG
   thay bản giấy. Không có câu đó là có ngày ai đó dọn kho giấy.

   MIỄN PHÍ, KHÔNG THƯ VIỆN: máy ảnh mở bằng `<input capture="environment">`,
   nén bằng canvas có sẵn, gộp PDF viết tay. Không cài gì thêm.
   ========================================================================== */

import { nenAnhChung, coByteCuaDataUrl } from './anh-chung.js';
import { gopTrangThanhPDF, dataUrlThanhByte, byteThanhBase64,
         laByteCuaPDF, demTrangPDF } from './gop-trang-pdf.js';
/* CẮT KHUNG VĂN BẢN — toàn bộ phần toán nằm ở `cat-khung.js` (hàm thuần).
   Ở đây chỉ có màn hình và mấy cái nút. */
import { doanBonGoc, duoiPhang, lamRoChu, taiAnh, canvasThanhTep,
         laTronKhung, tuGiacLoi } from './cat-khung.js';
import { API } from './api.js';

/* ---- Thông số nén. Đo thật rồi mới chốt (xem báo cáo CTL-0026):
   1700px/chất lượng 0.72 giữ được chữ in 10pt và dấu tiếng Việt, mà một
   trang A4 ra 180–380 KB. Trần 450 KB để 12 trang vẫn dưới trần 6 MB của
   máy chủ. Ảnh bóc chữ nhỏ hơn hẳn: AI đọc ảnh không cần nét bằng mắt
   người, mà ảnh nhỏ thì gọi AI nhanh hơn nhiều. */
/* Hai bộ thông số này `export` để BÀN ĐO dùng lại đúng con số đang chạy —
   chép tay sang bàn đo là đo một đường khác với đường sản phẩm. */
export const ANH_TRANG = { cheDo: 'vua-khung', canhToiDa: 1700, chatLuong: 0.72, gioiHanByte: 450 * 1024 };
export const ANH_BOC_CHU = { cheDo: 'vua-khung', canhToiDa: 1100, chatLuong: 0.65, gioiHanByte: 160 * 1024 };
const TRAN_SO_TRANG = 12;
const TRAN_TRANG_BOC_CHU = 3;      // khớp TRAN_TRANG_BOC_CHU ở src/tai-lieu.js

export const CAU_PHAP_LY =
  'Đây là bản dự phòng để tra cứu. KHÔNG thay bản giấy — đừng huỷ giấy gốc.';
export const CAU_TRA_GIAY =
  'Chỉ lưu BẢN SAO. Quét xong trả giấy lại cho nhân viên ngay.';

/* ==========================================================================
   ĐƯỜNG THỨ HAI VÀO CÙNG MỘT LÕI: TẢI FILE CÓ SẴN TRÊN MÁY
   ---------------------------------------------------------------------------
   Sếp Ngọc 29/08/2026, nhìn màn Kho tài liệu trên máy tính: *"rất oke nhưng
   đang thấy chưa tối ưu, nếu tôi upload file từ máy tính lên thì không có chỗ
   thêm tài liệu à"*.

   Đúng. Bản trước CHỈ có `capture="environment"` — đường máy ảnh. Trên máy bàn
   thường KHÔNG có camera, mà giấy tờ thì đã nằm sẵn trên đĩa: bản scan từ máy
   scan thật, hoặc PDF nhận qua email. Bắt Sếp chụp lại màn hình là vô lý.

   ⚠️ KHÔNG viết đường thứ hai. Ô chọn file chỉ khác ô máy ảnh ĐÚNG hai thuộc
   tính (`capture` và `multiple`); từ chỗ có `File` trong tay trở đi, ẢNH đi
   NGUYÊN đường cũ — `nenAnhChung()` → `gopTrangThanhPDF()` → cùng một `gui()`.
   Chỉ PDF rẽ nhánh, và rẽ vì lý do ở luật ① dưới đây.

   BỐN CHỖ KHÓ, XỬ THẲNG:

   ① PDF ĐÃ LÀ PDF THÌ KHÔNG BỌC LẠI. Chép nguyên byte lên kho. Bọc lại phải
      render từng trang ra ảnh (không có thư viện) rồi nén lần hai (phình
      dung lượng, nhoè chữ). Xem chú thích ở `gop-trang-pdf.js` Mục 5.

   ② PDF KHÔNG BÓC ĐƯỢC CHỮ — VÀ PHẢI NÓI RA. Đường bóc chữ của ERP nhận ẢNH
      (Workers AI đọc ảnh). Muốn bóc chữ trong PDF thì phải render PDF ra ảnh
      trước, tức là cần thư viện đọc PDF — ERP KHÔNG có, và ràng buộc chi phí 0
      cấm thêm dịch vụ. Nên: PDF lưu được, tra được bằng TÊN/số hiệu/loại,
      nhưng KHÔNG tra được bằng chữ bên trong. Câu đó in thẳng lên màn hình
      TRƯỚC khi gửi và nhắc lại sau khi lưu. Im lặng ở đây là để người ta
      tưởng đã tra cứu được — đúng cái bẫy `docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md`
      gọi là "cắt im lặng".

   ③ FILE TO. Ảnh thì nén được ở máy trước khi gửi; PDF thì KHÔNG (nén PDF cần
      đúng cái thư viện ta không có). Máy scan thật ra PDF 10–50 MB, nên trần
      phải nói rõ VÀ báo TRƯỚC KHI GỬI — xem `TRAN_BYTE_PDF_GOC`.

   ④ KHÔNG PHÁ THỨ ĐANG CHẠY. Luật "con số AI đọc = chưa kiểm", mỏ neo, phân
      quyền theo nhóm, nhật ký truy cập, câu pháp lý: không đụng một dòng.
   ========================================================================== */

/* ⚠️ TRẦN CHO FILE PDF CÓ SẴN — 25 MB. BỐN CON SỐ ÉP RA NÓ, KHÔNG PHẢI SỐ ĐẸP:
   ---------------------------------------------------------------------------
   ① BỘ NHỚ WORKER (chốt chặt nhất). Worker có 128 MB. Thân yêu cầu là JSON
      mang base64, nên cùng một file tồn tại NHIỀU BẢN cùng lúc trong Worker:
      chuỗi thân (~1,34×N) → `JSON.parse` sinh chuỗi base64 nữa (~1,34×N) →
      `atob` ra chuỗi nhị phân (~1×N) → `Uint8Array` (~1×N). Đỉnh ≈ 3,7×N.
      Với N = 25 MB là ≈ 93 MB — dưới 128 MB nhưng KHÔNG dư nhiều. 30 MB đã là
      ≈ 111 MB, sát trần tới mức một lượt gửi đôi là chết Worker.
   ② TRẦN THÂN YÊU CẦU CỦA CLOUDFLARE WORKERS: 100 MB. 25 MB → 33,4 MB base64,
      dư rộng. Đây KHÔNG phải chốt chặt nhất, đừng lấy nó ra biện minh cho số
      to hơn.
   ③ CHỖ TRÊN DRIVE: còn ~12 GB (SPEC-0005 Mục 4), ước 0,9 GB/năm. Một tờ 25 MB
      thì 12 GB được ~480 file. Bản scan cỡ đó là hàng hiếm, nhưng đây là lý do
      màn hình khuyên hạ DPI thay vì cứ đẩy file to lên.
   ④ ĐƯỜNG MÁY ẢNH GIỮ NGUYÊN TRẦN 6 MB (`src/tai-lieu.js`). Ảnh đã nén ở máy
      còn 150–400 KB/trang, 12 trang không bao giờ chạm 6 MB — nới trần đường
      đó là nới vô cớ.

   File to hơn trần thì màn hình nói NGAY LÚC CHỌN, kèm con số thật và cách xử
   (quét lại 200 DPI · tách file · chụp bằng máy ảnh). Để người ta bấm Lưu rồi
   chờ 30 giây mới báo hỏng là cách tệ nhất. */
export const TRAN_BYTE_PDF_GOC = 25 * 1024 * 1024;

/* ⚠️ NHỚ LỰA CHỌN "LÀM RÕ CHỮ" — một khoá `localStorage` riêng, KHÔNG nằm
   trong bản nháp bộ quét. Bản nháp bị xoá sau mỗi lần lưu xong; lựa chọn này
   phải sống qua nhiều lượt quét, vì ai đã bật một lần thì lần sau thường vẫn
   muốn bật. Mất khoá này cũng không mất gì: mặc định TẮT. */
const KHOA_LAM_RO = 'tl_lam_ro_chu_v1';
function nhoLamRo() {
  try { return localStorage.getItem(KHOA_LAM_RO) === '1'; } catch { return false; }
}
function ghiNhoLamRo(bat) {
  try { localStorage.setItem(KHOA_LAM_RO, bat ? '1' : '0'); } catch { /* kệ */ }
}

/** Tên 4 góc, theo đúng thứ tự TL·TR·BR·BL của `cat-khung.js`. Dùng cho nhãn
 *  trình đọc màn hình — "Góc 1" thì người khiếm thị không biết là góc nào. */
const TEN_GOC = ['trên trái', 'trên phải', 'dưới phải', 'dưới trái'];

/** Đuôi ảnh nhận được. HEIC/HEIF có mặt vì iPhone mặc định chụp HEIC, nhưng
 *  xem `LOI_HEIC` — Chrome trên máy tính KHÔNG giải mã được nó. */
const DUOI_ANH = ['jpg', 'jpeg', 'png', 'heic', 'heif'];

/** ⚠️ Windows/Chrome thường trả `type` RỖNG cho .heic, nên nhận diện phải soi
 *  CẢ đuôi tên file, không chỉ MIME. Soi mỗi MIME thì file HEIC bị đá ra với
 *  câu "sai loại" — sai câu, người ta đi tìm nhầm chỗ. */
function loaiTep(f) {
  const ten = String(f?.name || '').toLowerCase();
  const duoi = ten.includes('.') ? ten.slice(ten.lastIndexOf('.') + 1) : '';
  const mime = String(f?.type || '').toLowerCase();
  if (mime === 'application/pdf' || duoi === 'pdf') return 'pdf';
  if (DUOI_ANH.includes(duoi)) return 'anh';
  if (mime.startsWith('image/')) return 'anh';
  return 'la';
}

/* Trên máy tính, `canvas` của Chrome/Edge/Firefox KHÔNG giải mã được HEIC —
   `nenAnhChung()` sẽ ném lỗi. Câu này phải nói ĐÚNG cách xử, không phải "ảnh
   hỏng": file không hỏng, chỉ là trình duyệt không đọc được định dạng đó. */
const LOI_HEIC =
  'Trình duyệt trên máy này không mở được ảnh HEIC (định dạng mặc định của ' +
  'iPhone). Ba cách: (1) đổi iPhone sang chụp JPG — Cài đặt → Máy ảnh → Định ' +
  'dạng → "Tương thích nhất"; (2) gửi file PDF thay vì ảnh; (3) chụp thẳng ' +
  'bằng nút máy ảnh ở đây.';

/* SẮP XẾP THEO TÊN FILE — CÓ HIỂU CHỮ SỐ.
   Bản scan hay đánh số 1, 2, … 10, 11. So chữ trần thì "10" đứng TRƯỚC "2",
   nên xấp 12 trang vào kho sai thứ tự mà không ai để ý cho tới lúc mở ra đọc.
   `Intl.Collator` với `numeric: true` đọc cụm chữ số thành SỐ — có sẵn trong
   mọi trình duyệt, không thêm một byte thư viện nào. */
const SAP_TEN = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

/** Máy này nên mở đường nào TRƯỚC. Trả `'may-anh'` hoặc `'chon-tep'`.
 *
 *  ⚠️ NHẬN DIỆN BẰNG CÁCH TRỎ, KHÔNG BẰNG CHUỖI `userAgent`. Chuỗi UA là bãi
 *  lầy ai cũng giả được và đổi luôn. Hai dấu hiệu này nói đúng thứ ta cần:
 *    · `pointer: coarse` — con trỏ CHÍNH là ngón tay, không phải chuột.
 *    · `maxTouchPoints > 0` — màn hình có cảm ứng thật.
 *  Cả hai cùng đúng = điện thoại/máy tính bảng → mở MÁY ẢNH trước.
 *  Máy bàn, laptop (kể cả laptop màn cảm ứng: chuột vẫn là con trỏ chính, nên
 *  `coarse` sai) → mở CHỌN FILE trước, vì máy bàn thường không có camera. */
export function duongMacDinh() {
  try {
    const thoRap = window.matchMedia('(pointer: coarse)').matches;
    const chamDuoc = (navigator.maxTouchPoints || 0) > 0;
    return (thoRap && chamDuoc) ? 'may-anh' : 'chon-tep';
  } catch { return 'chon-tep'; }
}

/* ==========================================================================
   1. Bản nháp trong máy — thứ giữ cho "gửi hụt không mất ảnh"
   ========================================================================== */
function khoaNhap(cuaVao, ganId) {
  return `tl_nhap_v1_${cuaVao}_${ganId || 'chung'}`;
}

function docNhap(cuaVao, ganId) {
  try {
    const s = localStorage.getItem(khoaNhap(cuaVao, ganId));
    if (!s) return null;
    const d = JSON.parse(s);
    return (d && Array.isArray(d.trang) && d.trang.length) ? d : null;
  } catch { return null; }
}

/** Trả về true nếu ghi được. Ghi HỎNG (hết chỗ, chế độ ẩn danh) thì KHÔNG
 *  ném lỗi — bộ ảnh vẫn nằm trong bộ nhớ trang, chỉ là đóng tab thì mất, và
 *  màn hình sẽ nói thẳng câu đó ra thay vì im lặng. */
function ghiNhap(cuaVao, ganId, d) {
  try {
    /* ⚠️ FILE PDF CÓ SẴN KHÔNG VÀO BẢN NHÁP — CỐ Ý, KHÔNG PHẢI SÓT.
       `localStorage` cho khoảng 5–10 MB; một bản scan 25 MB thành base64 là
       33 MB, ghi vào là ném `QuotaExceededError` và làm MẤT LUÔN bản nháp của
       cả bộ ảnh đang có. Mà lý do bản nháp tồn tại là "chụp xong tắt máy thì
       ảnh vẫn còn" — ảnh chụp mất là mất thật, còn FILE PDF thì vẫn nằm
       nguyên trên đĩa máy Sếp, gửi hụt chỉ việc chọn lại. Hai chuyện khác
       hẳn nhau, nên xử khác nhau. Màn hình nói thẳng điều này ở thẻ PDF. */
    const { tepGoc, ...con } = d;
    localStorage.setItem(khoaNhap(cuaVao, ganId), JSON.stringify(con));
    return true;
  } catch { return false; }
}

function xoaNhap(cuaVao, ganId) {
  try { localStorage.removeItem(khoaNhap(cuaVao, ganId)); } catch { /* kệ */ }
}

/* ==========================================================================
   2. Tiện ích nhỏ
   ========================================================================== */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const coDoc = (b) => b < 1024 ? b + ' B'
  : b < 1048576 ? (b / 1024).toFixed(0) + ' KB'
  : (b / 1048576).toFixed(2) + ' MB';

function dataUrlThanhTep(dataUrl, ten) {
  const u8 = dataUrlThanhByte(dataUrl);
  return new File([u8], ten, { type: 'image/jpeg' });
}

/** 'YYYY-MM-DD' của hôm nay theo giờ Việt Nam. */
function homNayVN() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function congNam(n) {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

/* ==========================================================================
   3. Mở màn quét
   ---------------------------------------------------------------------------
   @param {object} t
   @param {string} t.cuaVao       'kho_chung' (Đợt 1) | 'nhan_su' (Đợt 2)
   @param {string} [t.ganId]      nhan_su.id khi cuaVao='nhan_su'
   @param {Array}  t.nhom         [{ma, ten, vi_du, han_luu, nhay_cam}] — CHỈ
                                  các nhóm người này được LƯU (máy chủ vẫn
                                  kiểm lại, đây chỉ là bớt chỗ bấm nhầm)
   @param {Function} [t.timNguoi] async () => [{id, ho_ten}] — CHỈ cửa KHO
                                  CHUNG truyền. Nhóm "Nhân sự" chọn ở cửa kho
                                  chung BẮT BUỘC phải chọn người trước khi lưu
                                  (REV-0046 #2 — Sếp Ngọc: "thành 1 bộ là
                                  đẹp"). Danh sách lấy từ MÁY CHỦ lúc cần,
                                  không chép sẵn vào đây.
   @param {string} [t.tenGoiY]    điền sẵn tiêu đề (Đợt 2: tên nhân viên)
   @param {string} [t.dongYGoiY]  điền sẵn ô "ai đồng ý" (Đợt 2: tên nhân viên
                                  — người có giấy tờ CHÍNH LÀ người đó)
   @param {Array}  [t.loaiGoiY]   [{ma, ten, goi_y_so}] — chip bấm một cái là
                                  xong ô "Loại giấy", thay vì gõ tay trên điện
                                  thoại. MÁY CHỦ trả danh sách này, trình duyệt
                                  KHÔNG giữ bản chép tay.
   @param {boolean} [t.boQuaChonNhom] cửa chỉ có ĐÚNG MỘT nhóm (hồ sơ nhân sự)
                                  thì bỏ hẳn màn chọn nhóm và mở máy ảnh luôn —
                                  tiết kiệm đúng một cú chạm. Cửa kho chung
                                  KHÔNG truyền cờ này: ở đó chọn nhóm là một
                                  quyết định thật.
   @param {Function} t.khiXong    gọi lại sau khi lưu thành công
   ========================================================================== */
export function moQuetTaiLieu(t) {
  const cuaVao = t.cuaVao || 'kho_chung';
  const ganId = t.ganId || null;
  const dsLoaiGoiY = Array.isArray(t.loaiGoiY) ? t.loaiGoiY.filter(x => x && x.ten) : [];
  const dsNhom = (t.nhom || []).filter(n => n && n.ma);
  if (!dsNhom.length) {
    alert('Bạn không có quyền quét tài liệu vào nhóm nào. Nhờ Admin cấp quyền.');
    return null;
  }

  /* ---- Trạng thái ---- */
  /* Bỏ màn chọn nhóm CHỈ khi cửa vào thật sự có đúng một nhóm — cờ do nơi gọi
     bật, không tự đoán: đoán sai là người ta mất luôn màn chọn nhóm ở kho
     chung mà không hiểu vì sao. */
  const boQuaChonNhom = t.boQuaChonNhom === true && dsNhom.length === 1;
  let hs = docNhap(cuaVao, ganId) || moiBo();
  let dangGui = false;
  let loiGui = null;
  let nhapKhongLuuDuoc = false;                       // localStorage không ghi được

  /* ---- NHÓM NHÂN SỰ PHẢI CÓ CHỦ  ·  REV-0046 #2 ------------------------
     Máy chủ đã chặn cứng (giấy nhóm `nhan_su` không có `gan_id` → 400). Màn
     này chỉ để người ta không đi hết 12 chạm rồi mới bị chặn. Cửa hồ sơ đã có
     `ganId` sẵn nên không bao giờ vào màn này. */
  const timNguoi = typeof t.timNguoi === 'function' ? t.timNguoi : null;
  let dsNguoi = null;                 // null = chưa nạp
  let loiNguoi = null;
  const canChonNguoi = () => hs.nhom === 'nhan_su' && !ganId && !hs.ganId;

  let manHinh = hs.trang.length ? 'trang' : boQuaChonNhom ? 'trang' : 'chon-nhom';

  function moiBo() {
    return {
      maGui: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())).slice(0, 40),
      nhom: dsNhom.length === 1 ? dsNhom[0].ma : '',
      /* Người được gắn khi quét ở cửa KHO CHUNG mà chọn nhóm Nhân sự. Nằm
         trong bản nháp để tắt máy giữa chừng mở lại vẫn còn — mất nó là người
         ta phải chọn lại người cho một xấp ảnh đã chụp xong. */
      ganId: '', ganTen: '',
      /* Một tài liệu là MỘT trong hai thứ, không bao giờ cả hai:
           · `trang[]`  — xấp ảnh (chụp hoặc chọn từ máy) sẽ gộp thành 1 PDF
           · `tepGoc`   — MỘT file PDF có sẵn, chép nguyên byte, không bọc lại
         `tepGoc` KHÔNG nằm trong bản nháp `localStorage` — xem `ghiNhap()`. */
      tepGoc: null,
      nguon: null,                     // 'may_anh' | 'tep_may' — điền lúc nhận file
      trang: [], tieuDe: t.tenGoiY || '', loai: '', soHieu: '',
      ngayBanHanh: '', ngayHetHan: '',
      /* Điền sẵn TÊN người, KHÔNG điền sẵn mục đích: "ai đồng ý" là chuyện xác
         định được (giấy của người nào thì người đó), còn "đồng ý cho mục đích
         gì" là chuyện phải hỏi thật. Điền sẵn cả hai thì cái dấu đồng ý của
         Luật BVDLCN 91/2025/QH15 thành một ô máy tự gõ. */
      dongYBoi: t.dongYGoiY || '', dongYMucDich: ''
    };
  }

  function luuNhap() {
    if (!hs.trang.length) { xoaNhap(cuaVao, ganId); nhapKhongLuuDuoc = false; return; }
    nhapKhongLuuDuoc = !ghiNhap(cuaVao, ganId, hs);
  }

  function nhomDangChon() { return dsNhom.find(n => n.ma === hs.nhom) || null; }

  /** Loại giấy đang chọn có phải CCCD không. Bản NGẮN của `laLoaiCCCD()` ở máy
   *  chủ, và cố ý chỉ dùng để HIỆN LỜI NHẮC — chốt thật nằm ở máy chủ
   *  (`src/tai-lieu.js`), nên hai bản có lệch nhau thì cùng lắm là thiếu một
   *  dòng nhắc, KHÔNG phải lọt một số CCCD sai. */
  function laCCCD(loai) {
    return /cccd|cmnd|căn cước|can cuoc/i.test(String(loai || ''));
  }

  function goiYSoHieu() {
    const l = dsLoaiGoiY.find(x => x.ten === hs.loai);
    return (l && l.goi_y_so) || 'VD: 123/2026/GCN-ATTP';
  }

  /* ---- Khung ---- */
  const nen = document.createElement('div');
  nen.className = 'tlq-nen';
  nen.innerHTML = '<div class="tlq-tam" role="dialog" aria-modal="true" aria-label="Quét tài liệu"></div>';
  const tam = nen.querySelector('.tlq-tam');
  document.body.appendChild(nen);
  document.body.classList.add('tlq-khoa-cuon');

  /* Máy ảnh — MỘT ô input dùng lại cho mọi trang.
     `capture="environment"` bảo điện thoại mở THẲNG camera sau. Đây là cả
     phần "tiện lợi để scan trên điện thoại" mà Sếp yêu cầu, và nó miễn phí,
     không cần một dòng thư viện nào. Máy tính bàn không có camera thì trình
     duyệt tự rơi về hộp chọn file — vẫn dùng được, không hỏng. */
  const oMayAnh = document.createElement('input');
  oMayAnh.type = 'file';
  oMayAnh.accept = 'image/*';
  oMayAnh.setAttribute('capture', 'environment');
  oMayAnh.hidden = true;
  document.body.appendChild(oMayAnh);

  let viTriChupLai = -1;        // -1 = chụp trang mới; ≥0 = chụp lại đúng trang đó

  oMayAnh.addEventListener('change', async () => {
    const f = oMayAnh.files && oMayAnh.files[0];
    oMayAnh.value = '';                    // để chụp lại cùng một trang vẫn nổ sự kiện
    if (!f) return;
    try {
      const coGoc = f.size;
      const t0 = performance.now();
      const nen_ = await nenAnhChung(f, ANH_TRANG);
      const trang = {
        anh: nen_,
        co_goc: coGoc,
        co_nen: coByteCuaDataUrl(nen_),
        ms_nen: Math.round(performance.now() - t0)
      };
      let viTri;
      if (viTriChupLai >= 0) { hs.trang[viTriChupLai] = trang; viTri = viTriChupLai; }
      else { hs.trang.push(trang); viTri = hs.trang.length - 1; }
      viTriChupLai = -1;
      luuNhap();
      manHinh = 'trang';
      ve();
      /* KHÔNG `await`: màn xem trang đã hiện rồi, việc dò góc chạy tiếp phía
         sau. Dò hỏng hay không tự tin thì màn cắt không bật, người ta đi tiếp
         như chưa từng có tính năng này. */
      moCatTuDong(viTri);
    } catch (e) {
      alert('Không đọc được ảnh vừa chụp: ' + e.message);
    }
  });

  function moMayAnh(viTri = -1) {
    if (viTri < 0 && hs.trang.length >= TRAN_SO_TRANG) {
      alert(`Một tài liệu tối đa ${TRAN_SO_TRANG} trang. Tách thành hai tài liệu nhé.`);
      return;
    }
    viTriChupLai = viTri;
    oMayAnh.click();
  }

  /* ======================================================================
     3a-bis. CẮT KHUNG VĂN BẢN  ·  Sếp Ngọc 03/09/2026
     ----------------------------------------------------------------------
     *"chụp rộng nhưng tao chỉnh được khung văn bản"* — chụp cả mặt bàn cũng
     được, máy cắt lấy tờ giấy rồi duỗi phẳng.

     BA LUẬT CỦA MÀN NÀY, theo đúng thứ tự quan trọng:

     ① KÉO TAY LÀ CHÍNH, MÁY ĐOÁN LÀ PHỤ. Bốn chấm luôn kéo được, kể cả khi
        máy đoán trượt hoàn toàn. Máy đoán chỉ để đỡ người ta vài giây.

     ② BỎ QUA ĐƯỢC, VÀ BỎ QUA LÀ ĐI ĐÚNG ĐƯỜNG CŨ. Nút "Dùng nguyên ảnh"
        KHÔNG nén lại, KHÔNG đụng một byte nào của trang — ảnh y hệt lúc
        chưa có màn này. Người quét vội một xấp giấy sẽ bấm nó, và thế là
        đúng.

     ③ KHÔNG BÀY MÀN NÀY KHI KHÔNG CÓ GÌ ĐỂ CẮT. Ảnh chụp đã kín tờ giấy
        (khung đoán ra ≈ mép ảnh) thì cắt là cắt vào không khí, mà bày ra là
        bắt bấm thừa MỘT CÁI cho MỖI TRANG — đúng thứ giết một tính năng
        trong tuần đầu. Nút "✂ Cắt khung" vẫn nằm sẵn trên từng thẻ trang,
        nên không bao giờ mất đường vào: đây là bỏ BÀY, không phải bỏ CHỨC
        NĂNG (không phải "cắt im lặng").
     ====================================================================== */
  /* {i, anh, goc[4], tuTin, viSao, msDoan, lamRo, dangXu, loi} */
  let cat = null;
  let boKeoGoc = null;         // gỡ trình bắt sự kiện kéo của lượt vẽ trước

  /** Dò góc rồi CHỈ bày màn cắt khi thật sự có việc để làm (luật ③). */
  async function moCatTuDong(i) {
    try {
      const tr = hs.trang[i];
      if (!tr) return;
      const anh = await taiAnh(tr.anh);
      const d = doanBonGoc(anh);
      tr.ms_doan = d.ms;
      /* Sai số 4%: ảnh chụp sát mép giấy thì mép giấy TRÙNG mép ảnh, lệch vài
         phần trăm là do nhiễu chứ không phải có mặt bàn để cắt. */
      if (!d.tuTin || laTronKhung(d.goc, 0.04)) return;
      if (manHinh !== 'trang' || cat) return;      // người ta đã đi tiếp rồi
      cat = { i, anh, goc: d.goc.map(g => g.slice()), tuTin: d.tuTin,
              viSao: d.viSao, msDoan: d.ms, lamRo: nhoLamRo(), dangXu: false, loi: null };
      manHinh = 'cat';
      ve();
    } catch { /* dò hỏng thì im lặng đi tiếp — đây chỉ là GỢI Ý, không phải luật */ }
  }

  /** Mở màn cắt bằng tay từ thẻ trang — đường vào LUÔN CÓ, kể cả khi máy đã
   *  quyết định không tự bày. */
  async function moCatTay(i) {
    const tr = hs.trang[i];
    if (!tr) return;
    try {
      const anh = await taiAnh(tr.anh);
      const d = doanBonGoc(anh);
      cat = { i, anh, goc: d.goc.map(g => g.slice()), tuTin: d.tuTin,
              viSao: d.viSao, msDoan: d.ms, lamRo: nhoLamRo(), dangXu: false, loi: null };
      manHinh = 'cat';
      ve();
    } catch (e) {
      alert('Không mở được ảnh trang này để cắt: ' + (e.message || 'không rõ lý do'));
    }
  }

  /** Bỏ qua — KHÔNG đụng gì vào trang. Đây là ca "đi đúng đường cũ". */
  function catBoQua() {
    cat = null;
    manHinh = 'trang';
    ve();
  }

  async function catXong() {
    if (!cat || cat.dangXu) return;
    if (!tuGiacLoi(cat.goc)) {
      cat.loi = 'Bốn góc đang vắt chéo nhau nên không dựng được khung. ' +
        'Kéo lại cho bốn cạnh không cắt nhau, hoặc bấm "Đặt lại 4 góc".';
      ve(); return;
    }
    /* Không kéo gì mà cũng không bật làm rõ chữ → không có gì để làm. Nén lại
       một tấm ảnh y nguyên chỉ để nó xấu đi một nấc là việc vô nghĩa. */
    if (laTronKhung(cat.goc) && !cat.lamRo) return catBoQua();

    cat.dangXu = true; cat.loi = null; ve();
    const i = cat.i;
    try {
      const t0 = performance.now();
      const kq = duoiPhang(cat.anh, cat.goc, { canhToiDa: ANH_TRANG.canhToiDa });
      let msRo = 0;
      if (cat.lamRo) { lamRoChu(kq.canvas); msRo = kq.canvas.msLamRo || 0; }
      /* ⚠️ QUAY VỀ ĐÚNG `nenAnhChung()` với ĐÚNG `ANH_TRANG`. Trang đã cắt và
         trang chưa cắt phải ra cùng một loại tệp, cùng một trần dung lượng —
         thêm một chỗ chốt chất lượng thứ hai là thêm một chỗ để hai con số
         lệch nhau (Hiến pháp Rule 5). */
      const tep = await canvasThanhTep(kq.canvas, `cat-${i + 1}.jpg`);
      const nen_ = await nenAnhChung(tep, ANH_TRANG);
      const cu = hs.trang[i];
      hs.trang[i] = {
        ...cu,
        anh: nen_,
        co_nen: coByteCuaDataUrl(nen_),
        co_truoc_cat: cu.co_truoc_cat != null ? cu.co_truoc_cat : cu.co_nen,
        da_cat: true,
        lam_ro: !!cat.lamRo,
        ms_duoi: kq.ms, ms_lam_ro: msRo,
        ms_cat: Math.round(performance.now() - t0)
      };
      ghiNhoLamRo(cat.lamRo);
      cat = null;
      luuNhap();
      manHinh = 'trang';
      ve();
    } catch (e) {
      /* KHÔNG đụng vào trang gốc. Cắt hỏng thì trang vẫn là trang cũ, người ta
         bấm "Dùng nguyên ảnh" là đi tiếp được ngay. */
      cat.dangXu = false;
      cat.loi = 'Không cắt được: ' + (e.message || 'không rõ lý do') +
        '. Ảnh gốc vẫn nguyên — bấm "Dùng nguyên ảnh" để đi tiếp.';
      ve();
    }
  }

  /* ======================================================================
     3b. Ô CHỌN FILE CÓ SẴN — cùng lõi, khác đúng hai thuộc tính
     ----------------------------------------------------------------------
     KHÔNG có `capture`  → trình duyệt mở hộp chọn file thay vì máy ảnh.
     CÓ `multiple`        → chọn cả xấp bản scan trong một lượt (Sếp có cả
                            thư mục), thay vì mở hộp thoại 5 lần.
     `accept` liệt kê CẢ MIME lẫn đuôi: Windows trả `type` rỗng cho .heic và
     đôi khi cả .pdf, chỉ khai MIME thì hộp thoại làm mờ đúng file cần chọn.
     ====================================================================== */
  const oChonTep = document.createElement('input');
  oChonTep.type = 'file';
  oChonTep.multiple = true;
  oChonTep.accept =
    'image/jpeg,image/png,image/heic,image/heif,application/pdf,' +
    '.jpg,.jpeg,.png,.heic,.heif,.pdf';
  oChonTep.hidden = true;
  document.body.appendChild(oChonTep);

  let dangDocTep = false;              // hiện "Đang đọc file…" thay vì màn đứng im

  oChonTep.addEventListener('change', async () => {
    const ds = [...(oChonTep.files || [])];
    oChonTep.value = '';               // chọn LẠI đúng file đó vẫn nổ sự kiện
    if (!ds.length) return;
    await nhanTepTuMay(ds);
  });

  /** Nhận một xấp `File` từ máy. Tách riêng khỏi trình bắt sự kiện để bàn đo
   *  gọi thẳng được, và để đường kéo-thả (nếu ngày nào thêm) dùng lại. */
  async function nhanTepTuMay(dsTho) {
    /* ---- ① SẮP THEO TÊN FILE TRƯỚC MỌI THỨ KHÁC -------------------------
       Trình duyệt trả `files` theo thứ tự người dùng bấm chuột, KHÔNG theo
       tên. Không sắp là xấp bản scan vào kho theo thứ tự ngẫu nhiên. */
    const ds = dsTho.slice().sort((a, b) => SAP_TEN.compare(a.name || '', b.name || ''));

    /* ---- ② FILE SAI LOẠI: NÊU ĐÍCH DANH, ĐỪNG ÂM THẦM BỎ ---------------- */
    const la = ds.filter(f => loaiTep(f) === 'la');
    if (la.length) {
      alert(`Không nhận được ${la.length} file này:\n` +
        la.map(f => '• ' + f.name).join('\n') +
        '\n\nKho chỉ nhận ẢNH (JPG · PNG · HEIC) và PDF. ' +
        'File Word/Excel thì xuất ra PDF rồi tải lên.');
      return;
    }

    const dsPdf = ds.filter(f => loaiTep(f) === 'pdf');
    const dsAnh = ds.filter(f => loaiTep(f) === 'anh');

    /* ---- ③ PDF KHÔNG TRỘN VỚI ẢNH, VÀ MỖI LƯỢT ĐÚNG MỘT PDF -------------
       Vì sao KHÔNG gộp: gộp nhiều PDF (hay chèn ảnh vào PDF) cần đọc và ghi
       lại cấu trúc PDF — đúng cái thư viện ERP không có (chi phí 0). Cách
       duy nhất còn lại là bọc PDF vào PDF, tức là phá luật ①.
       Nên nói THẲNG giới hạn thay vì im lặng lấy file đầu tiên. */
    if (dsPdf.length && dsAnh.length) {
      alert('Chọn ảnh và PDF cùng lúc thì kho không gộp được — gộp PDF cần thư ' +
            'viện đọc PDF mà ERP không có (ràng buộc chi phí 0).\n\n' +
            'Làm hai lượt: xấp ảnh một lượt, file PDF một lượt.');
      return;
    }
    if (dsPdf.length > 1) {
      alert(`Bạn chọn ${dsPdf.length} file PDF. Mỗi file PDF là MỘT tài liệu ` +
            'riêng — kho lưu nguyên bản chứ không gộp (gộp PDF cần thư viện ' +
            'ERP không có).\n\nChọn từng file PDF một. Nếu là ẢNH thì chọn cả ' +
            'xấp một lượt được.');
      return;
    }

    if (dsPdf.length === 1) return nhanMotPDF(dsPdf[0]);
    return nhanXapAnh(dsAnh);
  }

  /** MỘT file PDF có sẵn → lưu NGUYÊN BẢN. Không bọc, không nén, không đụng. */
  async function nhanMotPDF(f) {
    if (hs.trang.length) {
      if (!confirm(`Đang có ${hs.trang.length} trang ảnh trong bộ này.\n\n` +
        'Một tài liệu chỉ là MỘT trong hai: xấp ảnh, hoặc một file PDF.\n' +
        'Bấm OK để bỏ xấp ảnh và dùng file PDF này.')) return;
      hs.trang = [];
    }

    /* ---- TRẦN BÁO TRƯỚC KHI GỬI, KHÔNG PHẢI GIỮA CHỪNG ------------------
       Đọc `f.size` là đọc thuộc tính có sẵn — chưa nạp một byte nào vào bộ
       nhớ, chưa gửi một byte nào lên mạng. Đây là chỗ RẺ NHẤT để chặn, và là
       chỗ DUY NHẤT chặn được trước khi người ta ngồi chờ. */
    if (f.size > TRAN_BYTE_PDF_GOC) {
      alert(`File "${f.name}" nặng ${coDoc(f.size)}, vượt trần ` +
        `${(TRAN_BYTE_PDF_GOC / 1048576).toFixed(0)} MB.\n\n` +
        'Trần này do bộ nhớ 128 MB của máy chủ Cloudflare Workers ép ra: file ' +
        'đi lên dưới dạng base64 nên trong máy chủ tồn tại nhiều bản cùng lúc, ' +
        'đỉnh khoảng 3,7 lần cỡ file.\n\nBa cách xử:\n' +
        '• Quét lại ở 200 DPI, chế độ xám hoặc đen trắng — thường nhẹ đi 3–5 lần\n' +
        '• Tách file thành nhiều phần, mỗi phần một tài liệu\n' +
        '• Chụp bằng nút máy ảnh ở đây (ảnh được nén ngay tại máy)');
      return;
    }

    dangDocTep = true; manHinh = 'trang'; ve();
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      /* Soi CHỮ KÝ chứ không tin đuôi tên file. Đổi tên `anh.jpg` thành
         `.pdf` là việc bấm hai cái; đây bắt được ngay tại máy, và máy chủ
         còn soi lại lần nữa. */
      if (!laByteCuaPDF(bytes)) {
        dangDocTep = false; ve();
        alert(`File "${f.name}" có đuôi .pdf nhưng ruột KHÔNG phải PDF ` +
              '(thiếu chữ ký "%PDF-" ở đầu file). Có thể file hỏng, hoặc bị ' +
              'đổi tên từ định dạng khác. Mở thử bằng trình đọc PDF xem sao.');
        return;
      }
      const soTrang = demTrangPDF(bytes);
      hs.tepGoc = {
        ten: f.name,
        coByte: bytes.length,
        soTrang,                       // 0 = KHÔNG ĐẾM ĐƯỢC, xem `demTrangPDF`
        base64: byteThanhBase64(bytes)
      };
      hs.nguon = 'tep_may';
      if (!hs.tieuDe) {
        /* Gợi ý tên từ tên file — bỏ đuôi, đổi gạch/gạch dưới thành khoảng
           trắng. Chỉ là GỢI Ý, người ta sửa được; điền sẵn tiết kiệm đúng
           một lần gõ mà không quyết thay ai. */
        hs.tieuDe = String(f.name).replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 200);
      }
    } catch (e) {
      alert('Không đọc được file: ' + (e.message || 'không rõ lý do'));
    }
    dangDocTep = false;
    ve();
  }

  /** Xấp ẢNH chọn từ máy → đi NGUYÊN đường của máy ảnh: nén tại máy rồi thành
   *  các trang. Không một dòng xử lý riêng nào ngoài vòng lặp này. */
  async function nhanXapAnh(dsAnh) {
    if (hs.tepGoc) {
      if (!confirm(`Đang có file PDF "${hs.tepGoc.ten}" trong bộ này.\n\n` +
        'Bấm OK để bỏ file đó và dùng xấp ảnh vừa chọn.')) return;
      hs.tepGoc = null;
    }
    const conCho = TRAN_SO_TRANG - hs.trang.length;
    if (conCho <= 0) {
      alert(`Một tài liệu tối đa ${TRAN_SO_TRANG} trang, bộ này đã đủ. ` +
            'Tách thành hai tài liệu nhé.');
      return;
    }
    /* Chọn quá trần thì NÓI RA rồi mới cắt — cắt im lặng ở đây nghĩa là Sếp
       chọn 15 file, thấy 12 trang, tưởng mình chọn nhầm. */
    let ds = dsAnh;
    if (ds.length > conCho) {
      if (!confirm(`Bạn chọn ${ds.length} ảnh, mà một tài liệu tối đa ` +
        `${TRAN_SO_TRANG} trang (còn chỗ cho ${conCho}).\n\n` +
        `Bấm OK để lấy ${conCho} file ĐẦU theo tên file, phần còn lại tải ` +
        'thành một tài liệu khác.')) return;
      ds = ds.slice(0, conCho);
    }

    dangDocTep = true; manHinh = 'trang'; ve();
    const hong = [];
    for (const f of ds) {
      try {
        const coGoc = f.size;
        const t0 = performance.now();
        /* ⚠️ ĐÚNG `nenAnhChung()` với ĐÚNG `ANH_TRANG` mà đường máy ảnh dùng.
           Đây là chỗ dễ đẻ ra hàm nén thứ tư nhất — đừng. */
        const nen_ = await nenAnhChung(f, ANH_TRANG);
        hs.trang.push({
          anh: nen_, ten_goc: f.name, co_goc: coGoc,
          co_nen: coByteCuaDataUrl(nen_),
          ms_nen: Math.round(performance.now() - t0)
        });
      } catch (e) {
        hong.push({ ten: f.name, vi_sao: /heic|heif/i.test(f.name) ? LOI_HEIC : (e.message || 'không đọc được') });
      }
    }
    hs.nguon = hs.nguon || 'tep_may';
    luuNhap();
    dangDocTep = false;
    manHinh = 'trang';
    ve();
    /* File hỏng phải NÊU ĐÍCH DANH. "Đã thêm 3 trang" khi chọn 5 file là câu
       nói dối bằng cách bỏ bớt. */
    if (hong.length) {
      alert(`${hong.length}/${ds.length} file KHÔNG mở được:\n` +
        hong.map(h => `• ${h.ten}\n  ${h.vi_sao}`).join('\n') +
        (hs.trang.length ? `\n\n${hs.trang.length} trang còn lại vẫn giữ nguyên.` : ''));
    }
  }

  function moChonTep() { oChonTep.click(); }

  /** Mở ĐƯỜNG MẶC ĐỊNH của máy này — dùng ở mọi chỗ trước đây gọi thẳng
   *  `moMayAnh(-1)`. Máy tính bàn không có camera thì mở máy ảnh là mở một hộp
   *  thoại vô nghĩa; điện thoại thì ngược lại, bắt đi tìm file là bắt chụp
   *  trước ở ứng dụng khác rồi quay lại. */
  const duong = t.duongMacDinh === 'may-anh' || t.duongMacDinh === 'chon-tep'
    ? t.duongMacDinh : duongMacDinh();
  function moDuongChinh() {
    if (duong === 'may-anh') return moMayAnh(-1);
    return moChonTep();
  }

  /* ---- Đóng ---- */
  function dong() {
    document.body.classList.remove('tlq-khoa-cuon');
    /* Màn cắt gắn trình bắt `pointermove` lên `document` (kéo góc phải theo
       ngón tay cả khi nó ra ngoài chấm). Không gỡ ở đây là để lại một trình
       bắt sống mãi sau khi màn đã đóng. */
    if (boKeoGoc) { boKeoGoc(); boKeoGoc = null; }
    cat = null;
    nen.remove();
    oMayAnh.remove();
    oChonTep.remove();
    document.removeEventListener('keydown', phimEsc);
  }
  function phimEsc(e) { if (e.key === 'Escape') hoiThoat(); }
  document.addEventListener('keydown', phimEsc);

  function hoiThoat() {
    if (dangGui || dangDocTep) return;
    if (hs.tepGoc && !confirm(
      `Đã chọn file "${hs.tepGoc.ten}" nhưng chưa lưu.\n\n` +
      'Bấm OK để đóng — file vẫn nằm nguyên trên máy, lần sau chọn lại là được.')) return;
    if (hs.trang.length && !confirm(
      `Còn ${hs.trang.length} trang đã chụp chưa lưu.\n\n` +
      `Bấm OK để đóng — bộ này vẫn giữ trong máy, lần sau mở ra quét tiếp được.`)) return;
    dong();
  }

  nen.addEventListener('click', (e) => { if (e.target === nen) hoiThoat(); });

  /* ======================================================================
     4. Vẽ màn hình
     ====================================================================== */
  function ve() {
    if (boKeoGoc) { boKeoGoc(); boKeoGoc = null; }
    tam.innerHTML =
      dauTrang() +
      (manHinh === 'chon-nhom' ? veChonNhom()
        : manHinh === 'chon-nguoi' ? veChonNguoi()
        : manHinh === 'thong-tin' ? veThongTin()
        /* `&& cat`: màn cắt không có hồ sơ cắt thì rơi về màn trang, đừng nổ.
           Rẻ hơn nhiều so với một màn trắng giữa lúc đang quét dở. */
        : (manHinh === 'cat' && cat) ? veCat()
        : veTrang());
    noiSuKien();
    if (manHinh === 'cat' && cat) noiCat();
    const oDau = tam.querySelector('[data-tu-focus]');
    if (oDau) setTimeout(() => oDau.focus(), 30);
  }

  function dauTrang() {
    const n = nhomDangChon();
    const cua = hs.ganTen ? ' · ' + esc(hs.ganTen) : '';
    return `
      <div class="tlq-dau">
        <b>Quét tài liệu${n ? ' · ' + esc(n.ten) : ''}${cua}</b>
        <button type="button" class="tlq-x" data-viec="dong" aria-label="Đóng">✕</button>
      </div>
      <div class="tlq-luat">
        <b>⚠️ ${esc(CAU_PHAP_LY)}</b>
        <div class="tlq-luat-phu">
          Luật Giao dịch điện tử 2023 chỉ công nhận bản số hoá khi có ký số và
          bảo đảm toàn vẹn — quét bằng điện thoại không đạt. Luật Kế toán vẫn
          bắt giữ bản giấy có dấu đỏ.
          ${n && n.nhay_cam ? `<br><b>${esc(CAU_TRA_GIAY)}</b>` : ''}
        </div>
      </div>`;
  }

  function veChonNhom() {
    return `
      <div class="tlq-than">
        <p class="tlq-huong">Chọn loại giấy tờ <b>trước</b> — chọn xong máy ảnh mở luôn.</p>
        <div class="tlq-nhom">
          ${dsNhom.map(n => `
            <button type="button" class="tlq-o-nhom" data-viec="chon-nhom" data-ma="${esc(n.ma)}">
              <b>${esc(n.ten)}</b>
              <span>${esc(n.vi_du || '')}</span>
              <i>Hạn lưu bản giấy: ${esc(n.han_luu || '—')}</i>
            </button>`).join('')}
        </div>
      </div>`;
  }

  /* ---- MÀN CHỌN NGƯỜI  ·  REV-0046 #2 ---------------------------------
     Chỉ hiện ở cửa KHO CHUNG khi nhóm đang chọn là "Nhân sự". Không có màn
     này thì tờ giấy nhân sự quét ở kho chung nằm ngoài bộ của mọi người —
     đúng thứ Sếp Ngọc gọi là không "thành 1 bộ". */
  function veChonNguoi() {
    if (loiNguoi) {
      return `<div class="tlq-than">
        <p class="tlq-loi">Không lấy được danh sách nhân sự: ${esc(loiNguoi)}</p>
        <button type="button" class="tlq-nut-chinh" data-viec="tai-lai-nguoi">↻ Thử lại</button>
        <button type="button" class="tlq-nut-nhi" data-viec="doi-nhom">← Chọn nhóm giấy khác</button>
      </div>`;
    }
    if (dsNguoi === null) {
      return `<div class="tlq-than"><p class="tlq-huong">Đang lấy danh sách nhân sự…</p></div>`;
    }
    if (!dsNguoi.length) {
      return `<div class="tlq-than">
        <p class="tlq-canh">Chưa có nhân sự nào đang làm việc để gắn giấy tờ vào.</p>
        <button type="button" class="tlq-nut-nhi" data-viec="doi-nhom">← Chọn nhóm giấy khác</button>
      </div>`;
    }
    return `
      <div class="tlq-than">
        <p class="tlq-huong">Giấy tờ nhân sự phải nằm <b>trong hồ sơ của một người</b> —
          chọn người trước, để mở hồ sơ ra là thấy đủ <b>một bộ</b>.</p>
        <input class="tlq-o" id="tlqTimNguoi" data-tu-focus maxlength="60"
               placeholder="Gõ tên để lọc — VD: Phạm Khương Duy">
        <div class="tlq-nhom" id="tlqDsNguoi">${veODsNguoi('')}</div>
        <button type="button" class="tlq-nut-nhi" data-viec="doi-nhom">← Chọn nhóm giấy khác</button>
      </div>`;
  }

  /** Bỏ dấu + hạ chữ thường, để gõ "duy" ra "Phạm Khương Duy". Cùng luật với
   *  ô tìm ở máy chủ, nhưng đây chỉ lọc TẠI CHỖ, không gọi thêm lượt nào. */
  function khongDau(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  function veODsNguoi(tu) {
    const k = khongDau(tu).trim();
    /* KHÔNG cắt danh sách. Cắt im lặng ở đây nghĩa là người quét gõ đúng tên
       mà không thấy ai, rồi tưởng người đó chưa có trong ERP (đúng thứ
       `do-cat-im-lang` sinh ra để bắt). Danh sách đã lọc "đang làm việc" nên
       cỡ vài chục dòng — vẽ hết là đúng và vẫn nhanh. */
    const ds = (dsNguoi || []).filter(n => !k || khongDau(n.ho_ten).includes(k));
    if (!ds.length) return `<p class="tlq-huong">Không có ai khớp "${esc(tu)}".</p>`;
    return ds.map(n => `
      <button type="button" class="tlq-o-nhom" data-viec="chon-nguoi"
              data-id="${esc(n.id)}" data-ten="${esc(n.ho_ten || '')}">
        <b>${esc(n.ho_ten || '(chưa có tên)')}</b>
        <span>${esc(n.chuc_danh || n.vi_tri || '')}</span>
      </button>`).join('');
  }

  async function napNguoi() {
    if (!timNguoi) { loiNguoi = 'màn này chưa được nối danh sách nhân sự'; ve(); return; }
    dsNguoi = null; loiNguoi = null; ve();
    try {
      const ds = await timNguoi();
      dsNguoi = (Array.isArray(ds) ? ds : []).filter(n => n && n.id);
    } catch (e) {
      loiNguoi = e.message || 'không rõ lý do';
    }
    ve();
  }

  /* ⚠️ CÂU PHẢI NÓI RA VỀ PDF — chốt ② của lượt này.
     ERP bóc chữ bằng Workers AI ĐỌC ẢNH. Muốn bóc chữ trong PDF thì phải
     render PDF ra ảnh trước, cần thư viện đọc PDF mà ERP không có và chi phí 0
     cấm thêm. Im lặng ở đây là để người ta tưởng tra cứu được bằng nội dung,
     rồi gõ một cụm chữ trong hợp đồng, không thấy gì, và kết luận SAI rằng
     hợp đồng đó chưa được lưu. */
  const CAU_PDF_CHUA_BOC_CHU =
    'File PDF lưu được nguyên bản, nhưng ERP CHƯA bóc được chữ bên trong PDF ' +
    'để tra cứu — đường bóc chữ chỉ đọc được ẢNH. Tài liệu này sẽ tra bằng ' +
    'TÊN, số hiệu và loại giấy. Cần tra bằng nội dung thì chụp bằng máy ảnh.';

  /** Hai đường vào tài liệu, xếp theo ĐÚNG thiết bị.
   *
   *  ⚠️ NẰM CẠNH NHAU TRÊN MỘT HÀNG, không xếp chồng. Sếp vừa chốt "ưu tiên
   *  vừa một trang, hạn chế kéo trang" — thêm một nút xếp chồng là thêm một
   *  hàng 44px vào đúng màn Sếp bảo đừng làm dài ra. Một hàng hai nút thì
   *  chiều cao màn KHÔNG đổi một pixel so với bản chỉ có máy ảnh.
   *
   *  Nút của đường mặc định mang `tlq-nut-chinh` (cam đậm — ĐÚNG MỘT điểm
   *  nhấn trên một khung nhìn, luật ③ của `docs/BANG-MAU.md`), đường phụ mang
   *  `tlq-nut-nhi`. Đảo thứ tự theo máy, không đảo màu: cam vẫn chỉ có một. */
  function veHaiDuong() {
    const co = hs.trang.length;
    const nutAnh = (lop) => `
      <button type="button" class="${lop}" data-viec="chup-tiep"
              title="Mở máy ảnh chụp thẳng trang giấy">
        📷 ${co ? 'Chụp thêm' : 'Chụp máy ảnh'}
      </button>`;
    const nutTep = (lop) => `
      <button type="button" class="${lop}" data-viec="chon-tep"
              title="Chọn ảnh JPG/PNG/HEIC hoặc file PDF có sẵn trên máy">
        📁 ${co ? 'Thêm file' : 'Chọn file'}
      </button>`;
    return '<div class="tlq-hai-duong">' + (duong === 'may-anh'
      ? nutAnh('tlq-nut-chinh') + nutTep('tlq-nut-nhi')
      : nutTep('tlq-nut-chinh') + nutAnh('tlq-nut-nhi')) + '</div>';
  }

  function veTheTepGoc() {
    const g = hs.tepGoc;
    return `
      <div class="tlq-than">
        <div class="tlq-the tlq-the-tep">
          <div class="tlq-bieu-tuong" aria-hidden="true">PDF</div>
          <div class="tlq-the-tin">
            <b>${esc(g.ten)}</b>
            <span>${coDoc(g.coByte)} · ${g.soTrang
              ? g.soTrang + ' trang'
              : '<b>không đếm được số trang</b>'}</span>
          </div>
          <div class="tlq-the-nut">
            <button type="button" class="tlq-nut-phu" data-viec="chon-tep">Đổi file</button>
            <button type="button" class="tlq-nut-phu" data-viec="bo-tep">Bỏ</button>
          </div>
        </div>
        <p class="tlq-canh"><b>Lưu nguyên bản</b> — kho KHÔNG bọc lại file PDF,
          nên không phình dung lượng và không mất chất lượng.</p>
        <p class="tlq-canh">${esc(CAU_PDF_CHUA_BOC_CHU)}</p>
        ${g.soTrang ? '' : `<p class="tlq-huong">File này nén cấu trúc bên trong nên
          máy không đếm được số trang; kho sẽ ghi <b>1 trang</b>. Số trang thật
          vẫn xem được khi mở file.</p>`}
        <p class="tlq-huong">File PDF <b>không</b> giữ trong bản nháp của trình duyệt
          (quá lớn) — gửi hụt thì chọn lại file, nó vẫn nằm nguyên trên máy.</p>
        <button type="button" class="tlq-nut-chinh" data-viec="sang-thong-tin">
          Nhập thông tin →
        </button>
      </div>`;
  }

  /* ---- MÀN CẮT KHUNG ---------------------------------------------------
     Chấm góc là `<button>` THẬT chứ không phải hình vẽ trên canvas: nút thật
     thì có vùng chạm 44px do CSS bảo đảm (đo được bằng
     `getBoundingClientRect`), bấm được bằng phím Tab, và trình đọc màn hình
     đọc ra tên góc. Hình vẽ trên canvas thì cả ba thứ đó đều không có. */
  function veCat() {
    const c = cat;
    /* ⚠️ MÀN NÀY PHẢI VỪA MỘT TRANG Ở 375×812 — Sếp Ngọc: "ưu tiên vừa một
       trang, hạn chế kéo trang". Câu pháp lý ở đầu màn chiếm sẵn ~130px và
       KHÔNG được bỏ (CTL-0026 Mục 2), nên chỗ tiết kiệm phải lấy ở nơi khác:
       hai nút hành động NẰM CẠNH NHAU một hàng thay vì chồng lên nhau, lời
       giải thích "làm rõ chữ" gộp vào một dòng nhỏ thay vì một đoạn riêng, và
       ảnh xem trước bị trần chiều cao (xem `noiCat`). Bàn đo `do-cat-khung`
       kiểm thẳng: hai nút phải nằm TRONG khung nhìn, không phải cuộn xuống
       mới thấy. */
    return `
      <div class="tlq-than">
        <p class="tlq-huong">Kéo <b>4 chấm</b> vào 4 góc tờ giấy — máy duỗi phẳng
          thành hình chữ nhật ngay ngắn.
          ${c.tuTin ? 'Bốn góc máy đặt sẵn chỉ là <b>gợi ý</b>.'
            : 'Máy <b>không nhận ra</b> mép giấy nên đặt tạm ở mép ảnh.'}</p>
        <div class="tlq-cat-khung" id="tlqCatKhung">
          <canvas id="tlqCatVe"></canvas>
          ${[0, 1, 2, 3].map(k => `
            <button type="button" class="tlq-cat-goc" data-goc="${k}"
                    aria-label="Góc ${TEN_GOC[k]} — kéo để chỉnh"><i></i></button>`).join('')}
        </div>
        <div class="tlq-chip">
          <button type="button" class="tlq-nut-phu${c.lamRo ? ' chon' : ''}"
                  data-viec="cat-lamro" aria-pressed="${c.lamRo ? 'true' : 'false'}"
                  title="Xoá bóng đổ, làm nền trắng đều. Giữ nguyên màu dấu đỏ.">
            ${c.lamRo ? '☑' : '☐'} Làm rõ chữ
          </button>
          <button type="button" class="tlq-nut-phu" data-viec="cat-datlai">Đặt lại 4 góc</button>
        </div>
        <p class="tlq-do">Dò 4 góc hết ${c.msDoan} ms · ${esc(c.viSao)}.
          "Làm rõ chữ" xoá bóng đổ, làm nền trắng đều, <b>giữ nguyên màu dấu đỏ</b>.</p>
        ${c.loi ? `<p class="tlq-loi">${esc(c.loi)}</p>` : ''}
        <div class="tlq-hai-duong">
          <button type="button" class="tlq-nut-chinh" id="tlqCatXong"
                  data-viec="cat-xong" ${c.dangXu ? 'disabled' : ''}>
            ${c.dangXu ? 'Đang cắt…' : '✂ Cắt & duỗi'}
          </button>
          <button type="button" class="tlq-nut-nhi" id="tlqCatBo"
                  data-viec="cat-bo" ${c.dangXu ? 'disabled' : ''}>
            Dùng nguyên ảnh
          </button>
        </div>
      </div>`;
  }

  /** Đệm quanh ảnh xem trước. Chấm góc rộng 44px, tâm nằm ĐÚNG trên góc, nên
   *  góc sát mép ảnh thì 22px của chấm thò ra ngoài. Không có đệm này thì
   *  chấm bị cắt cụt hoặc đẩy khỏi vùng chạm — và bốn góc mép ảnh chính là
   *  trạng thái MẶC ĐỊNH khi máy không đoán được. */
  const CAT_DEM = 24;

  function noiCat() {
    const khung = tam.querySelector('#tlqCatKhung');
    const oVe = tam.querySelector('#tlqCatVe');
    if (!khung || !oVe || !cat) return;
    const anh = cat.anh;
    const rongAnh = anh.naturalWidth || anh.width;
    const caoAnh = anh.naturalHeight || anh.height;

    /* Bề ngang khung do CSS quyết (vừa màn), chiều cao suy ra theo tỉ lệ ảnh.
       Trần chiều cao để ảnh dọc không đẩy hai nút xuống dưới màn — Sếp đã
       chốt "ưu tiên vừa một trang, hạn chế kéo trang". */
    const rongCo = Math.max(120, Math.round(khung.clientWidth - CAT_DEM * 2));
    /* 520px là chỗ mọi thứ KHÁC chiếm: đầu màn 52 + câu pháp lý 130 + dòng
       hướng dẫn 44 + đệm khung 60 + dòng số đo 52 + hàng chip 60 + hàng hai
       nút 62 + đệm thân 32 ≈ 492, cộng ít dư. Đo bằng bàn đo chứ không ước —
       xem phép kiểm "hai nút nằm trong khung nhìn" ở `do-cat-khung`. */
    const caoTran = Math.max(170, Math.round(window.innerHeight - 520));
    let ti = Math.min(rongCo / rongAnh, caoTran / caoAnh);
    let W = 0, H = 0;
    function datCo() {
      W = Math.max(80, Math.round(rongAnh * ti));
      H = Math.max(80, Math.round(caoAnh * ti));
      oVe.width = W; oVe.height = H;
      oVe.style.width = W + 'px'; oVe.style.height = H + 'px';
    }
    datCo();
    const x = oVe.getContext('2d');

    /* Màu lấy từ BIẾN CSS, không gõ mã màu vào JS: luật ba màu
       (`docs/BANG-MAU.md`) chỉ giữ được nếu mọi chỗ cùng đọc một nguồn. */
    const bien = getComputedStyle(document.documentElement);
    const mau = (ten, du) => (bien.getPropertyValue(ten) || '').trim() || du;
    const CAM = mau('--cam', '#eb7c17');
    const DO = mau('--danger', '#c0392b');

    const chams = [...khung.querySelectorAll('.tlq-cat-goc')];
    let choKhung = 0;

    function veLai() {
      x.clearRect(0, 0, W, H);
      x.drawImage(anh, 0, 0, W, H);
      const diem = cat.goc.map(g => [g[0] * W, g[1] * H]);
      const duong = () => {
        x.beginPath();
        x.moveTo(diem[0][0], diem[0][1]);
        for (let k = 1; k < 4; k++) x.lineTo(diem[k][0], diem[k][1]);
        x.closePath();
      };
      /* Phần BỊ BỎ tối đi — nhìn một cái là biết cái gì còn lại, không phải
         đoán theo bốn cái chấm. */
      x.save();
      x.beginPath();
      x.rect(0, 0, W, H);
      x.moveTo(diem[0][0], diem[0][1]);
      for (let k = 1; k < 4; k++) x.lineTo(diem[k][0], diem[k][1]);
      x.closePath();
      x.fillStyle = 'rgba(44, 33, 23, .5)';
      x.fill('evenodd');
      x.restore();
      duong();
      x.lineWidth = 2;
      /* Khung lõm thì viền chuyển ĐỎ — đỏ chỉ dùng cho "có việc hỏng", và
         khung vắt chéo đúng là hỏng: cắt ra sẽ méo. */
      x.strokeStyle = tuGiacLoi(cat.goc) ? CAM : DO;
      x.stroke();
      /* ⚠️ LẤY `offsetLeft/offsetTop` CỦA CHÍNH CANVAS, đừng cộng tay `CAT_DEM`.
         Canvas được CĂN GIỮA (`margin: 0 auto`) nên khi ảnh dọc bị trần chiều
         cao ép hẹp lại, nó không còn nằm ở mép trái vùng đệm — cộng tay là
         bốn cái chấm lệch khỏi bốn góc đúng bằng nửa phần thừa. Bàn đo bắt
         được đúng cảnh này: lệch 13,5px ở cả bốn góc. */
      chams.forEach((b, k) => {
        b.style.left = (oVe.offsetLeft + diem[k][0] - 22) + 'px';
        b.style.top = (oVe.offsetTop + diem[k][1] - 22) + 'px';
      });
    }
    veLai();

    /* ---- TỰ CO CHO VỪA MÀN ----------------------------------------------
       Con số 520 ở trên chỉ là ước lượng ban đầu. Cái ĐÚNG trên mọi máy, mọi
       cỡ chữ hệ thống, mọi độ dài câu là: đo mép dưới THẬT của hàng nút rồi
       cắt đúng phần thừa khỏi ảnh xem trước. Sàn 150px — hẹp hơn thế thì kéo
       góc không còn chính xác, thà để cuộn một chút.
       Không có bước này thì ở màn 812px hàng nút rơi xuống 850px: người ta
       thấy ảnh, thấy chấm, KHÔNG thấy nút cắt — coi như tính năng không có. */
    {
      const hangNut = tam.querySelector('.tlq-hai-duong');
      if (hangNut) {
        const thua = Math.ceil(hangNut.getBoundingClientRect().bottom - window.innerHeight + 8);
        if (thua > 0 && H - thua >= 150) {
          ti *= (H - thua) / H;
          datCo();
          veLai();
        }
      }
    }

    /* ---- KÉO BẰNG NGÓN TAY ---------------------------------------------
       `pointer*` chứ không `mouse*`/`touch*`: một bộ trình bắt chạy cho cả
       ngón tay, chuột và bút. `touch-action: none` ở CSS chặn trình duyệt
       cuộn trang khi ngón tay đi ngang — không có nó thì kéo góc thành cuộn
       màn hình, đúng lỗi kinh điển của mọi màn kéo thả trên điện thoại. */
    let dangKeo = -1;
    function diChuyen(e) {
      if (dangKeo < 0) return;
      const r = oVe.getBoundingClientRect();
      cat.goc[dangKeo] = [
        Math.min(1, Math.max(0, (e.clientX - r.left) / (r.width || 1))),
        Math.min(1, Math.max(0, (e.clientY - r.top) / (r.height || 1)))
      ];
      if (!choKhung) choKhung = requestAnimationFrame(() => { choKhung = 0; veLai(); });
      e.preventDefault();
    }
    function thaTay() {
      if (dangKeo < 0) return;
      chams[dangKeo]?.classList.remove('keo');
      dangKeo = -1;
      veLai();
    }
    chams.forEach((b, k) => {
      b.addEventListener('pointerdown', (e) => {
        dangKeo = k;
        b.classList.add('keo');
        try { b.setPointerCapture(e.pointerId); } catch { /* trình duyệt cũ */ }
        e.preventDefault();
      });
      /* Bàn phím: mỗi lần bấm dời 1% cạnh — đường vào cho người không dùng
         được cảm ứng, và cũng là đường bàn đo bấm được mà không cần giả lập
         ngón tay. */
      b.addEventListener('keydown', (e) => {
        const b1 = { ArrowLeft: [-0.01, 0], ArrowRight: [0.01, 0],
                     ArrowUp: [0, -0.01], ArrowDown: [0, 0.01] }[e.key];
        if (!b1) return;
        cat.goc[k] = [
          Math.min(1, Math.max(0, cat.goc[k][0] + b1[0])),
          Math.min(1, Math.max(0, cat.goc[k][1] + b1[1]))
        ];
        veLai();
        e.preventDefault();
      });
    });
    document.addEventListener('pointermove', diChuyen, { passive: false });
    document.addEventListener('pointerup', thaTay);
    document.addEventListener('pointercancel', thaTay);
    boKeoGoc = () => {
      document.removeEventListener('pointermove', diChuyen, { passive: false });
      document.removeEventListener('pointerup', thaTay);
      document.removeEventListener('pointercancel', thaTay);
      if (choKhung) cancelAnimationFrame(choKhung);
    };
  }

  function veTrang() {
    if (dangDocTep) {
      return `<div class="tlq-than"><p class="tlq-huong">Đang đọc file…</p></div>`;
    }
    if (hs.tepGoc) return veTheTepGoc();

    const tongNen = hs.trang.reduce((a, x) => a + x.co_nen, 0);
    const tongGoc = hs.trang.reduce((a, x) => a + (x.co_goc || 0), 0);
    const n = hs.trang.length;
    return `
      <div class="tlq-than">
        ${nhapKhongLuuDuoc ? `<p class="tlq-canh">Máy không lưu được bản nháp (hết chỗ hoặc chế độ ẩn danh).
          <b>Đừng đóng trang này</b> cho tới khi lưu xong.</p>` : ''}
        <div class="tlq-dsdanh">
          ${hs.trang.map((tr, i) => `
            <div class="tlq-the" draggable="true" data-i="${i}">
              <img src="${tr.anh}" alt="Trang ${i + 1}" loading="lazy">
              <div class="tlq-the-tin">
                <b>Trang ${i + 1}</b>
                <span>${coDoc(tr.co_goc || 0)} → <b>${coDoc(tr.co_nen)}</b></span>
                ${tr.ten_goc ? `<span class="tlq-ten-goc">${esc(tr.ten_goc)}</span>` : ''}
                ${tr.da_cat ? `<span class="tlq-ten-goc">✂ đã cắt khung${
                  tr.lam_ro ? ' · làm rõ chữ' : ''}${tr.co_truoc_cat
                    ? ` · ${coDoc(tr.co_truoc_cat)} → ${coDoc(tr.co_nen)}` : ''}</span>` : ''}
              </div>
              <div class="tlq-the-nut">
                <button type="button" class="tlq-nut-phu" data-viec="len" data-i="${i}"
                        ${i === 0 ? 'disabled' : ''} aria-label="Đưa trang ${i + 1} lên trên">↑</button>
                <button type="button" class="tlq-nut-phu" data-viec="xuong" data-i="${i}"
                        ${i === n - 1 ? 'disabled' : ''} aria-label="Đưa trang ${i + 1} xuống dưới">↓</button>
                <button type="button" class="tlq-nut-phu" data-viec="cat" data-i="${i}"
                        aria-label="Cắt khung văn bản trang ${i + 1}">✂ ${tr.da_cat ? 'Cắt lại' : 'Cắt'}</button>
                <button type="button" class="tlq-nut-phu" data-viec="chup-lai" data-i="${i}">Thay</button>
                <button type="button" class="tlq-nut-phu" data-viec="xoa-trang" data-i="${i}">Xoá</button>
              </div>
            </div>`).join('')}
        </div>
        ${n ? `<p class="tlq-do">
          ${n} trang · gốc ${coDoc(tongGoc)} → sau nén <b>${coDoc(tongNen)}</b>
          (nhẹ đi ${tongGoc ? Math.round((1 - tongNen / tongGoc) * 100) : 0}%)${
            n > 1 ? ' · xếp theo tên file, kéo thẻ hoặc bấm ↑↓ để đổi thứ tự' : ''}</p>` : ''}
        ${veHaiDuong()}
        ${n ? `
          <button type="button" class="tlq-nut-nhi" data-viec="sang-thong-tin">
            Xong ${n} trang — nhập thông tin →
          </button>`
        /* Câu này CHỈ hiện lúc chưa có trang nào — đúng lúc màn hình trống, nên
           nó không đẩy thứ gì xuống dưới. Có trang rồi thì thẻ trang đã nói đủ. */
        : `<p class="tlq-huong">Nhận ảnh <b>JPG · PNG · HEIC</b> và <b>PDF</b>.
             Chọn nhiều ảnh một lượt được — kho xếp theo <b>tên file</b>.
             File PDF lưu nguyên bản, mỗi lượt một file.</p>`}
      </div>`;
  }

  /* CHỮ DÀI TỰ XUỐNG DÒNG — REV-0047, gộp từ `main` 29/08/2026.
     Luật của lượt vá 111 ô: ô MỘT DÒNG nhận chữ mà `maxLength === -1` HOẶC
     `>= 100` là vi phạm. 5 ô dưới đây (tên tài liệu 200 · loại 120 · số hiệu
     120 · ai đồng ý 200 · mục đích 300) sinh ra ở nhánh CTL-0026 nên KHÔNG
     nằm trong 111 ô đã vá — nay vá cho đồng bộ: đổi sang
     `<textarea class="o-nhieu-dong" rows="1">`, trông y hệt ô một dòng lúc
     rỗng, tự cao dần tới trần 132px rồi cuộn dọc, không bao giờ kéo ngang.
     Ba thứ đi kèm KHÔNG mất: `maxlength` giữ nguyên; Enter vẫn Lưu (uỷ quyền
     `keydown` trên `document` trong app.js — kể cả ô do JS dựng ra như ở
     đây); giá trị cũ chuyển từ `value="…"` sang phần TỬ CON của thẻ, `esc()`
     đã chặn `&<>` nên không hở HTML.
     `tlqTimNguoi` (60) và hai ô `type="date"` KHÔNG đổi — chưa từng vi phạm. */
  function veThongTin() {
    const n = nhomDangChon();
    return `
      <div class="tlq-than">
        <form class="tlq-form" id="tlqForm">
          <label class="tlq-nhan">Tên tài liệu <i>*</i></label>
          <textarea class="tlq-o o-nhieu-dong" rows="1" id="tlqTieuDe" data-tu-focus
                    maxlength="200" required
                    placeholder="VD: Giấy chứng nhận ATTP nhà xưởng">${esc(hs.tieuDe)}</textarea>

          <label class="tlq-nhan">Loại giấy</label>
          ${dsLoaiGoiY.length ? `
            <div class="tlq-chip">
              ${dsLoaiGoiY.map(l => `
                <button type="button" class="tlq-nut-phu${hs.loai === l.ten ? ' chon' : ''}"
                        data-viec="loai" data-ten="${esc(l.ten)}"
                        data-so="${esc(l.goi_y_so || '')}">${esc(l.ten)}</button>`).join('')}
            </div>` : ''}
          <textarea class="tlq-o o-nhieu-dong" rows="1" id="tlqLoai" maxlength="120"
                    placeholder="${esc((n && n.vi_du ? n.vi_du.split(',')[0] : '') || 'VD: Hợp đồng')}">${esc(hs.loai)}</textarea>
          ${dsLoaiGoiY.length ? `<p class="tlq-huong">Bấm một loại ở trên, hoặc gõ tay —
            danh sách này là <b>gợi ý</b>, không phải danh sách đóng.</p>` : ''}

          <label class="tlq-nhan">Số hiệu</label>
          <textarea class="tlq-o o-nhieu-dong" rows="1" id="tlqSoHieu" maxlength="120"
                    placeholder="${esc(goiYSoHieu())}">${esc(hs.soHieu)}</textarea>
          ${laCCCD(hs.loai) ? `<p class="tlq-huong"><b>Số CCCD phải đủ 12 chữ số.</b>
            CCCD Việt Nam mẫu từ 2021 luôn 12 chữ số — thiếu một chữ là hồ sơ lao động
            mang số sai. Máy chủ chặn, không phải nhắc suông.</p>` : ''}

          <label class="tlq-nhan">Ngày ban hành</label>
          <input class="tlq-o" id="tlqBanHanh" type="date" value="${esc(hs.ngayBanHanh)}">

          <label class="tlq-nhan">Ngày hết hạn</label>
          <input class="tlq-o" id="tlqHetHan" type="date" value="${esc(hs.ngayHetHan)}">
          <div class="tlq-chip">
            <button type="button" class="tlq-nut-phu" data-viec="han" data-nam="1">+1 năm</button>
            <button type="button" class="tlq-nut-phu" data-viec="han" data-nam="2">+2 năm</button>
            <button type="button" class="tlq-nut-phu" data-viec="han" data-nam="3">+3 năm</button>
            <button type="button" class="tlq-nut-phu" data-viec="han" data-nam="0">Không hết hạn</button>
          </div>
          <p class="tlq-huong">Nhập hạn <b>ngay bây giờ</b>. Giấy hết hạn có thể bị khoá gian hàng —
            ERP sẽ nhắc trước 30 ngày, 7 ngày và đúng hôm hết hạn.</p>

          ${n && n.nhay_cam ? `
            <div class="tlq-dongy">
              <b>Giấy tờ cá nhân — bắt buộc ghi nhận đồng ý</b>
              <p>Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và NĐ 356/2025, hiệu lực 01/01/2026.</p>
              <label class="tlq-nhan">Ai đồng ý cho lưu <i>*</i></label>
              <textarea class="tlq-o o-nhieu-dong" rows="1" id="tlqDongYBoi" maxlength="200"
                        placeholder="Họ tên người có giấy tờ">${esc(hs.dongYBoi)}</textarea>
              <label class="tlq-nhan">Đồng ý cho mục đích gì <i>*</i></label>
              <textarea class="tlq-o o-nhieu-dong" rows="1" id="tlqMucDich" maxlength="300"
                        placeholder="VD: quản lý hồ sơ lao động, đóng BHXH">${esc(hs.dongYMucDich)}</textarea>
            </div>` : ''}

          ${hs.tepGoc ? `<p class="tlq-canh">${esc(CAU_PDF_CHUA_BOC_CHU)}</p>` : ''}

          ${loiGui ? `<p class="tlq-loi">${esc(loiGui)}
            <br><b>${hs.tepGoc
              ? 'File vẫn nằm trên máy' : 'Ảnh vẫn còn trong máy'}</b> — bấm Gửi lại khi có sóng.</p>` : ''}

          <button type="submit" class="tlq-nut-chinh" ${dangGui ? 'disabled' : ''}>
            ${dangGui ? 'Đang gửi…' : (loiGui ? '↻ Gửi lại'
              : hs.tepGoc ? `💾 Lưu file ${esc(hs.tepGoc.ten)} vào kho`
              : `💾 Lưu ${hs.trang.length} trang vào kho`)}
          </button>
          <button type="button" class="tlq-nut-nhi" data-viec="ve-trang" ${dangGui ? 'disabled' : ''}>
            ← Quay lại ${hs.tepGoc ? 'xem file đã chọn' : `xem ${hs.trang.length} trang`}
          </button>
        </form>
      </div>`;
  }

  /* ======================================================================
     5. Sự kiện
     ====================================================================== */
  function noiSuKien() {
    tam.querySelectorAll('[data-viec]').forEach(el => {
      el.addEventListener('click', () => {
        const v = el.dataset.viec;
        if (v === 'dong') return hoiThoat();
        if (v === 'chon-nhom') {
          hs.nhom = el.dataset.ma;
          hs.ganId = ''; hs.ganTen = '';     // đổi nhóm là bỏ người đã chọn
          luuNhap();
          /* Nhóm Nhân sự ở cửa kho chung: chọn NGƯỜI trước rồi mới mở đường
             chính (REV-0046 #2). Nhóm khác thì bật luôn như cũ. */
          if (canChonNguoi()) { manHinh = 'chon-nguoi'; napNguoi(); return; }
          manHinh = 'trang';
          ve();
          moDuongChinh();                    // chọn nhóm xong ĐƯỜNG CHÍNH bật LUÔN
          return;
        }
        if (v === 'chon-nguoi') {
          hs.ganId = el.dataset.id || '';
          hs.ganTen = el.dataset.ten || '';
          /* Giấy của ai thì người đó là người đồng ý — điền sẵn ĐÚNG một ô, y
             như cửa hồ sơ đang làm. "Đồng ý cho mục đích gì" vẫn phải gõ tay. */
          if (!hs.dongYBoi) hs.dongYBoi = hs.ganTen;
          if (!hs.tieuDe && hs.ganTen) hs.tieuDe = hs.ganTen + ' — ';
          luuNhap();
          manHinh = 'trang';
          ve();
          if (!hs.trang.length) moDuongChinh();
          return;
        }
        if (v === 'tai-lai-nguoi') { napNguoi(); return; }
        if (v === 'doi-nhom') { manHinh = 'chon-nhom'; ve(); return; }
        if (v === 'chup-tiep') return moMayAnh(-1);
        if (v === 'chon-tep') return moChonTep();
        if (v === 'chup-lai') return moMayAnh(parseInt(el.dataset.i, 10));
        if (v === 'cat') return moCatTay(parseInt(el.dataset.i, 10));
        if (v === 'cat-bo') return catBoQua();
        if (v === 'cat-xong') return catXong();
        if (v === 'cat-lamro') {
          if (!cat) return;
          cat.lamRo = !cat.lamRo;
          ghiNhoLamRo(cat.lamRo);
          ve(); return;
        }
        if (v === 'cat-datlai') {
          if (!cat) return;
          /* Đặt lại = về MÉP ẢNH, không phải về "máy đoán lần nữa". Máy vừa
             đoán ra cái người ta đang muốn bỏ đi, đoán lại là trả về đúng nó. */
          cat.goc = [[0, 0], [1, 0], [1, 1], [0, 1]];
          cat.loi = null;
          ve(); return;
        }
        if (v === 'bo-tep') {
          if (!confirm(`Bỏ file "${hs.tepGoc?.ten}" khỏi bộ này?`)) return;
          hs.tepGoc = null; hs.nguon = null;
          manHinh = 'trang'; ve(); return;
        }
        if (v === 'xoa-trang') {
          const i = parseInt(el.dataset.i, 10);
          if (!confirm(`Xoá trang ${i + 1}?`)) return;
          hs.trang.splice(i, 1);
          luuNhap(); ve(); return;
        }
        /* ĐỔI THỨ TỰ BẰNG NÚT — đường CHÍNH, không phải đường dự phòng của kéo
           thả. Kéo thả HTML5 không chạy bằng ngón tay trên điện thoại (không
           có sự kiện `dragstart`), mà đây là sản phẩm điện thoại-trước. Nút
           ↑↓ chạy ở CẢ HAI, đọc được bằng trình đọc màn hình, và bấm được
           bằng bàn phím. */
        if (v === 'len' || v === 'xuong') {
          const i = parseInt(el.dataset.i, 10);
          const j = v === 'len' ? i - 1 : i + 1;
          if (j < 0 || j >= hs.trang.length) return;
          [hs.trang[i], hs.trang[j]] = [hs.trang[j], hs.trang[i]];
          luuNhap(); ve();
          /* Giữ ngón tay/con trỏ ở ĐÚNG trang vừa dời, không nhảy về đầu danh
             sách — dời 3 nấc là bấm 3 lần vào cùng một chỗ. */
          setTimeout(() => tam.querySelector(
            `.tlq-the[data-i="${j}"] [data-viec="${v}"]`)?.focus(), 0);
          return;
        }
        if (v === 'sang-thong-tin') { thu(); manHinh = 'thong-tin'; loiGui = null; ve(); return; }
        if (v === 've-trang') { thu(); manHinh = 'trang'; ve(); return; }
        if (v === 'han') {
          const nam = parseInt(el.dataset.nam, 10);
          const o = tam.querySelector('#tlqHetHan');
          if (o) o.value = nam ? congNam(nam) : '';
          return;
        }
        /* Chip loại giấy: THU trước rồi mới vẽ lại — không thu là tiêu đề và
           số hiệu người ta vừa gõ bay sạch chỉ vì bấm một cái chip. */
        if (v === 'loai') {
          thu();
          hs.loai = el.dataset.ten || '';
          luuNhap();
          ve();
          return;
        }
      });
    });

    /* ---- KÉO ĐỔI THỨ TỰ (máy tính) --------------------------------------
       Bản scan hay đánh số 1,2,…,10 nên `SAP_TEN` (có hiểu chữ số) đã xếp
       đúng ngay lúc chọn. Nhưng tên file đời thực còn tệ hơn thế —
       `scan0001.pdf`, `IMG_2231`, `trang cuoi` — nên phải cho sửa tay TRƯỚC
       khi lưu, vì lưu rồi thì thứ tự nằm trong file PDF, đổi là phải làm lại
       cả bộ. Kéo thả là đường tự nhiên trên máy tính; nút ↑↓ ở trên là đường
       chạy được ở mọi nơi. */
    let keo = -1;
    tam.querySelectorAll('.tlq-the[draggable="true"]').forEach(the => {
      the.addEventListener('dragstart', (e) => {
        keo = parseInt(the.dataset.i, 10);
        the.classList.add('dang-keo');
        /* Firefox KHÔNG khởi động thao tác kéo nếu `dataTransfer` rỗng. */
        try { e.dataTransfer.setData('text/plain', String(keo)); } catch {}
        e.dataTransfer.effectAllowed = 'move';
      });
      the.addEventListener('dragend', () => {
        keo = -1;
        tam.querySelectorAll('.tlq-the').forEach(x => x.classList.remove('dang-keo', 'dich'));
      });
      the.addEventListener('dragover', (e) => {
        if (keo < 0) return;
        e.preventDefault();                  // không chặn thì `drop` không nổ
        e.dataTransfer.dropEffect = 'move';
        the.classList.add('dich');
      });
      the.addEventListener('dragleave', () => the.classList.remove('dich'));
      the.addEventListener('drop', (e) => {
        e.preventDefault();
        const tu = keo >= 0 ? keo : parseInt(e.dataTransfer.getData('text/plain') || '-1', 10);
        const den = parseInt(the.dataset.i, 10);
        if (tu < 0 || den < 0 || tu === den || tu >= hs.trang.length) return;
        /* CHÈN vào vị trí thả, KHÔNG hoán đổi hai thẻ. Kéo trang 5 lên đầu mà
           lại hoán đổi thì trang 1 rơi xuống vị trí 5 — người ta chỉ định dời
           MỘT trang, không định dời hai. */
        const [x] = hs.trang.splice(tu, 1);
        hs.trang.splice(den, 0, x);
        luuNhap(); ve();
      });
    });

    const form = tam.querySelector('#tlqForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); gui(); });

    /* Ô lọc tên: vẽ lại RIÊNG danh sách, không vẽ lại cả màn — vẽ cả màn là
       ô nhập bị dựng lại và mất con trỏ sau mỗi chữ. */
    const oTim = tam.querySelector('#tlqTimNguoi');
    if (oTim) oTim.addEventListener('input', () => {
      const o = tam.querySelector('#tlqDsNguoi');
      if (!o) return;
      o.innerHTML = veODsNguoi(oTim.value);
      o.querySelectorAll('[data-viec="chon-nguoi"]').forEach(b => b.addEventListener('click', () => {
        hs.ganId = b.dataset.id || '';
        hs.ganTen = b.dataset.ten || '';
        if (!hs.dongYBoi) hs.dongYBoi = hs.ganTen;
        if (!hs.tieuDe && hs.ganTen) hs.tieuDe = hs.ganTen + ' — ';
        luuNhap();
        manHinh = 'trang';
        ve();
        if (!hs.trang.length) moDuongChinh();
      }));
    });
  }

  /** Thu các ô đang gõ dở về `hs` — không thu là chuyển màn một cái mất sạch. */
  function thu() {
    const lay = (id) => tam.querySelector('#' + id)?.value?.trim() ?? null;
    if (tam.querySelector('#tlqTieuDe') != null) {
      hs.tieuDe = lay('tlqTieuDe') || '';
      hs.loai = lay('tlqLoai') || '';
      hs.soHieu = lay('tlqSoHieu') || '';
      hs.ngayBanHanh = lay('tlqBanHanh') || '';
      hs.ngayHetHan = lay('tlqHetHan') || '';
      hs.dongYBoi = lay('tlqDongYBoi') || '';
      hs.dongYMucDich = lay('tlqMucDich') || '';
      luuNhap();
    }
  }

  /* ======================================================================
     6. Gửi
     ====================================================================== */
  async function gui() {
    /* CHỐT ĐẦU HÀM — REV-0036 lỗi #4. Nút có `disabled` khi đang gửi, nhưng
       `disabled` chỉ chặn con chuột: phím Enter trong ô nhập, hay `form.submit`
       gọi lại lúc màn hình đang vẽ dở, vẫn lọt vào đây. Hai lượt gửi chồng nhau
       là hai file trên Drive (một mồ côi) + một lỗi UNIQUE. Chặn ở chỗ RẺ nhất
       trước; máy chủ vẫn có lưới thứ hai cho ca hai tab. */
    if (dangGui) return;
    thu();
    if (!hs.tieuDe || hs.tieuDe.length < 3) { alert('Đặt tên cho tài liệu đã nhé.'); return; }
    if (!hs.trang.length && !hs.tepGoc) { alert('Chưa có trang nào.'); return; }
    /* Bản nháp cũ (lưu trước bản vá REV-0046 #2) có thể đã có đủ trang mà chưa
       có người. Máy chủ chặn thật; ở đây đưa người ta về đúng màn để chọn, chứ
       đừng để họ bấm Lưu rồi ăn một câu lỗi. */
    if (canChonNguoi()) { manHinh = 'chon-nguoi'; napNguoi(); return; }
    const n = nhomDangChon();
    if (n && n.nhay_cam && (!hs.dongYBoi || !hs.dongYMucDich)) {
      alert('Giấy tờ cá nhân: phải ghi rõ AI đồng ý và đồng ý cho MỤC ĐÍCH GÌ.');
      return;
    }
    if (hs.ngayHetHan && hs.ngayHetHan < homNayVN() &&
        !confirm('Ngày hết hạn đã qua. Vẫn lưu?')) return;

    dangGui = true; loiGui = null; ve();
    try {
      /* ---- HAI NGUỒN, MỘT LƯỢT GỬI ------------------------------------
         `laTepGoc` là chỗ DUY NHẤT hai đường khác nhau, và khác đúng ba thứ:
         byte gửi lên, số trang, và có ảnh cho AI bóc chữ hay không. Từ
         `API.tlLuu(...)` trở xuống là chung tuyệt đối — chống trùng `ma_gui`,
         gửi lại khi sóng yếu, phân quyền, đồng ý, nhật ký: y nguyên. */
      const laTepGoc = !!hs.tepGoc;

      /* ① ẢNH: gộp N trang thành MỘT file PDF, ngay tại máy.
            PDF CÓ SẴN: chép nguyên byte, KHÔNG bọc lại (luật ①). */
      const pdf = laTepGoc ? null
        : gopTrangThanhPDF(hs.trang.map(x => dataUrlThanhByte(x.anh)), { tieuDe: hs.tieuDe });
      const than64 = laTepGoc ? hs.tepGoc.base64 : byteThanhBase64(pdf);
      const coByte = laTepGoc ? hs.tepGoc.coByte : pdf.length;

      /* ② Ảnh cho AI bóc chữ: thu nhỏ thêm một nấc, tối đa 3 trang đầu. AI
         đọc ảnh không cần nét bằng mắt người, mà ảnh nhỏ thì gọi nhanh hơn
         nhiều và không tốn thêm đồng nào (Workers AI đã có sẵn).

         ⚠️ PDF CÓ SẴN KHÔNG CÓ ẢNH ĐỂ ĐƯA — và đó là một GIỚI HẠN THẬT phải
         nói ra, không phải một mảng rỗng lặng lẽ. Bóc chữ trong PDF đòi
         render PDF ra ảnh, tức là đòi thư viện đọc PDF mà ERP không có
         (chi phí 0). Máy chủ nhận `dinh_dang: 'pdf_goc'` và ghi thẳng câu
         "chưa bóc được chữ" vào `ocr_ghi_chu`, để nó còn nguyên ở màn xem
         chữ, ở bản sao lưu CSV, ở bản khôi phục — chứ không chỉ trong một
         cái `alert` bay mất sau ba giây. */
      const anhBocChu = [];
      for (let i = 0; !laTepGoc && i < Math.min(hs.trang.length, TRAN_TRANG_BOC_CHU); i++) {
        const tep = dataUrlThanhTep(hs.trang[i].anh, `trang-${i + 1}.jpg`);
        anhBocChu.push(await nenAnhChung(tep, ANH_BOC_CHU));
      }

      const t0 = performance.now();
      const kq = await API.tlLuu({
        ma_gui: hs.maGui,                    // GIỮ NGUYÊN qua mọi lần gửi lại
        cua_vao: cuaVao,
        /* Cửa hồ sơ đã có `ganId`; cửa kho chung lấy người vừa chọn ở màn
           `chon-nguoi` (REV-0046 #2). Máy chủ ghi `cua_vao='nhan_su'` cho mọi
           giấy nhóm nhân sự, nên hai đường về cùng MỘT dạng dòng. */
        gan_id: ganId || hs.ganId || null,
        nhom: hs.nhom,
        tieu_de: hs.tieuDe,
        loai: hs.loai || null,
        so_hieu: hs.soHieu || null,
        ngay_ban_hanh: hs.ngayBanHanh || null,
        ngay_het_han: hs.ngayHetHan || null,
        /* PDF đếm được mấy trang thì ghi đúng chừng đó; đếm KHÔNG được thì
           ghi 1 và màn hình đã nói trước là ghi 1 (xem `veTheTepGoc`). Máy chủ
           đòi `so_trang >= 1`. */
        so_trang: laTepGoc ? (hs.tepGoc.soTrang || 1) : hs.trang.length,
        tep: than64,
        anh_boc_chu: anhBocChu,
        /* Hai cột chỉ đường cho máy chủ: trần kích thước nào áp, có bỏ qua
           bước bóc chữ không, và câu ghi chú nào phải ghi lại. */
        nguon: laTepGoc ? 'tep_may' : (hs.nguon || 'may_anh'),
        dinh_dang: laTepGoc ? 'pdf_goc' : 'anh_gop',
        dong_y_boi: hs.dongYBoi || null,
        dong_y_muc_dich: hs.dongYMucDich || null
      });
      const msGui = Math.round(performance.now() - t0);

      xoaNhap(cuaVao, ganId);
      dong();
      if (typeof t.khiXong === 'function') {
        t.khiXong({
          ...kq,
          so_trang: laTepGoc ? (hs.tepGoc.soTrang || 1) : hs.trang.length,
          co_byte_pdf: coByte,
          ms_gui: msGui,
          la_tep_goc: laTepGoc,
          ten_tep_goc: laTepGoc ? hs.tepGoc.ten : null
        });
      }
    } catch (e) {
      /* KHÔNG xoá bản nháp. Đây chính là chỗ ràng buộc "sóng yếu gửi hụt phải
         gửi lại được" sống hay chết. */
      dangGui = false;
      loiGui = e.message || 'Không gửi được';
      manHinh = 'thong-tin';
      ve();
    }
  }

  ve();
  /* Cửa một-nhóm (hồ sơ nhân sự): mở ĐƯỜNG CHÍNH của máy này LUÔN, đúng tinh
     thần "chọn xong máy ảnh bật luôn, không tốn thêm một cú chạm nào"
     (CTL-0025 Mục 3 ④). Trên MÁY TÍNH "đường chính" là hộp CHỌN FILE chứ không
     phải máy ảnh — máy bàn thường không có camera, mở máy ảnh ở đó là bắt Sếp
     đóng một hộp thoại vô nghĩa rồi mới đi tìm nút đúng. Chỉ làm khi chưa có
     trang nào — đang mở lại bộ quét dở mà tự bật là cướp mất màn xem lại. */
  if (boQuaChonNhom && !hs.trang.length && hs.nhom) moDuongChinh();
  /* Đang có bản nháp dở thì nói ngay, đừng để người ta tưởng mất ảnh. */
  if (hs.trang.length) {
    setTimeout(() => {
      const o = tam.querySelector('.tlq-than');
      if (!o) return;
      const p = document.createElement('p');
      p.className = 'tlq-canh';
      p.textContent = `Đang mở lại bộ quét dở: ${hs.trang.length} trang vẫn còn trong máy.`;
      o.prepend(p);
    }, 0);
  }

  return { dong };
}
