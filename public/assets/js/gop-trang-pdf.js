/* ==========================================================================
   GỘP NHIỀU TRANG THÀNH MỘT TÀI LIỆU  ·  CTL-0026 / CTL-0025 — lõi dùng chung
   ---------------------------------------------------------------------------
   Chuyện thật phải giải (CTL-0025 Mục 3): "Hợp đồng lao động 3–5 trang. Chụp
   nhiều ảnh → gộp thành MỘT tài liệu, không phải 5 ảnh rời."

   File này gộp N ảnh JPEG thành MỘT file PDF. Viết tay ~150 dòng, KHÔNG thư
   viện — ràng buộc "chi phí 0, không thư viện quét" của cả hai phiếu.

   VÌ SAO LÀM ĐƯỢC MÀ KHÔNG CẦN THƯ VIỆN: PDF nhúng thẳng được luồng JPEG y
   nguyên qua bộ lọc `/DCTDecode`. Nghĩa là ta KHÔNG giải mã, KHÔNG vẽ lại,
   KHÔNG nén lại — chỉ chép nguyên khối byte của ảnh vào giữa file rồi bọc
   quanh nó mấy chục dòng cấu trúc. Ảnh đã nén ở máy bằng `nenAnhChung()`
   thì PDF ra đúng bằng tổng các ảnh + ~1 KB.

   VÌ SAO GỘP Ở MÁY CHỨ KHÔNG Ở MÁY CHỦ: Workers gói miễn phí tính CPU rất
   chặt, mà ghép byte cho 5 trang là việc CPU thuần. Gộp ở điện thoại thì máy
   chủ chỉ còn việc giải base64 rồi đẩy thẳng lên Drive. Thêm một cái lợi lớn
   hơn: bản nháp nằm ở máy nên SÓNG YẾU GỬI HỤT VẪN GỬI LẠI ĐƯỢC, không mất
   ảnh đã chụp (ràng buộc CTL-0025 Mục 4).

   Trang giấy đặt cỡ A4 và ảnh được co vừa khung, canh giữa — in ra là đúng
   khổ giấy văn phòng, không ra tờ giấy kích thước lạ theo cảm biến máy ảnh.
   ========================================================================== */

/** A4 tính theo đơn vị point của PDF (1/72 inch). */
export const A4_RONG = 595.28;
export const A4_CAO  = 841.89;

/* ==========================================================================
   1. Đọc kích thước thật của một ảnh JPEG
   ---------------------------------------------------------------------------
   PDF bắt phải khai /Width /Height ĐÚNG bằng kích thước trong luồng JPEG.
   Khai lệch thì trình đọc PDF vẽ méo hoặc từ chối mở — mà lệch thì KHÔNG có
   thông báo lỗi nào, nên phải đọc từ chính file chứ đừng tin canvas.

   Cách đọc: đi dọc chuỗi marker `FF xx`. Marker SOF (Start Of Frame) mang
   chiều cao/rộng ở byte thứ 5..8 sau marker. Có nhiều SOF khác nhau (SOF0
   baseline, SOF2 progressive...) nên nhận cả dải C0–CF, TRỪ ba cái không
   phải SOF: C4 (bảng Huffman), C8 (JPG mở rộng), CC (bảng số học).
   ========================================================================== */
export function kichThuocJPEG(bytes) {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    throw new Error('Trang này không phải ảnh JPEG hợp lệ');
  }
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xFF) { i++; continue; }
    const m = bytes[i + 1];
    if (m === 0xFF) { i++; continue; }                       // byte đệm
    if (m === 0x01 || (m >= 0xD0 && m <= 0xD9)) { i += 2; continue; }  // marker rỗng
    if (m === 0xDA) break;                                   // vào phần dữ liệu ảnh, hết marker
    const dai = (bytes[i + 2] << 8) | bytes[i + 3];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return {
        cao:  (bytes[i + 5] << 8) | bytes[i + 6],
        rong: (bytes[i + 7] << 8) | bytes[i + 8],
        kenh: bytes[i + 9]                                    // 1 xám · 3 màu · 4 CMYK
      };
    }
    if (dai < 2) throw new Error('Ảnh JPEG hỏng cấu trúc');
    i += 2 + dai;
  }
  throw new Error('Không đọc được kích thước của ảnh JPEG');
}

/* ==========================================================================
   2. Gộp
   ========================================================================== */

/** Số thực đưa vào PDF — 2 chữ số thập phân là quá đủ ở đơn vị point, và
 *  tránh kiểu `1e-7` mà cú pháp PDF KHÔNG hiểu (ghi ra là file hỏng). */
function so(n) {
  const s = (Math.round(n * 100) / 100).toFixed(2);
  return s.replace(/\.00$/, '');
}

/**
 * Gộp danh sách ảnh JPEG thành một PDF.
 * @param {Uint8Array[]} dsAnh  các trang, ĐÚNG THỨ TỰ
 * @param {{tieuDe?:string, taoLuc?:Date}} tuyChon
 * @returns {Uint8Array} nội dung file PDF
 */
export function gopTrangThanhPDF(dsAnh, tuyChon = {}) {
  const n = (dsAnh || []).length;
  if (!n) throw new Error('Chưa có trang nào để gộp');

  const enc = new TextEncoder();
  const manh = [];
  let viTri = 0;
  const viTriObj = [];                       // viTriObj[số hiệu] = byte thứ mấy

  const day     = (u8) => { manh.push(u8); viTri += u8.length; };
  const dayChu  = (s)  => day(enc.encode(s));
  const moObj   = (id) => { viTriObj[id] = viTri; dayChu(`${id} 0 obj\n`); };
  const dongObj = ()   => dayChu('endobj\n');

  /* Đánh số đối tượng: 1 = danh mục, 2 = cây trang, 3 = thông tin tài liệu.
     Mỗi trang chiếm 3 đối tượng liền nhau kể từ số 4. */
  const idTrang = k => 4 + 3 * k;
  const idNoiDung = k => 5 + 3 * k;
  const idAnh = k => 6 + 3 * k;
  const soDoiTuong = 3 + 3 * n;

  dayChu('%PDF-1.4\n');
  /* Dòng chú thích 4 byte >127: quy ước của chuẩn PDF để công cụ truyền file
     nhận ra đây là file NHỊ PHÂN, đừng đổi ký tự xuống dòng. Phải ghi thẳng
     byte, KHÔNG đi qua TextEncoder (nó mã hoá UTF-8 ra byte khác). */
  day(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

  moObj(1); dayChu('<< /Type /Catalog /Pages 2 0 R >>\n'); dongObj();

  moObj(2);
  dayChu(`<< /Type /Pages /Count ${n} /Kids [` +
         Array.from({ length: n }, (_, k) => `${idTrang(k)} 0 R`).join(' ') + '] >>\n');
  dongObj();

  /* Thông tin tài liệu. Tiêu đề tiếng Việt CÓ DẤU: mã hoá UTF-16BE có BOM —
     đây là cách DUY NHẤT chuẩn PDF 1.4 nhận chữ ngoài bảng Latin. Viết chữ
     có dấu thẳng vào chuỗi `(...)` thì trình đọc hiện ra ký tự rác. */
  moObj(3);
  dayChu('<< /Producer (ERP Alpha Green Commerce) /Creator (ERP Alpha Green Commerce)');
  if (tuyChon.tieuDe) dayChu(` /Title <${utf16beHex(String(tuyChon.tieuDe))}>`);
  dayChu(` /CreationDate (${mocThoiGianPDF(tuyChon.taoLuc || new Date())})`);
  dayChu(' >>\n');
  dongObj();

  for (let k = 0; k < n; k++) {
    const anh = dsAnh[k];
    const { rong, cao, kenh } = kichThuocJPEG(anh);

    // Co vừa khung A4, giữ nguyên tỉ lệ, canh giữa trang.
    const ti = Math.min(A4_RONG / rong, A4_CAO / cao);
    const w = rong * ti, h = cao * ti;
    const x = (A4_RONG - w) / 2, y = (A4_CAO - h) / 2;

    moObj(idTrang(k));
    dayChu(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${so(A4_RONG)} ${so(A4_CAO)}] ` +
           `/Resources << /XObject << /Im0 ${idAnh(k)} 0 R >> >> ` +
           `/Contents ${idNoiDung(k)} 0 R >>\n`);
    dongObj();

    const lenh = enc.encode(`q\n${so(w)} 0 0 ${so(h)} ${so(x)} ${so(y)} cm\n/Im0 Do\nQ\n`);
    moObj(idNoiDung(k));
    dayChu(`<< /Length ${lenh.length} >>\nstream\n`);
    day(lenh);
    dayChu('\nendstream\n');
    dongObj();

    const khongGianMau = kenh === 1 ? '/DeviceGray' : kenh === 4 ? '/DeviceCMYK' : '/DeviceRGB';
    moObj(idAnh(k));
    dayChu(`<< /Type /XObject /Subtype /Image /Width ${rong} /Height ${cao} ` +
           `/ColorSpace ${khongGianMau} /BitsPerComponent 8 /Filter /DCTDecode ` +
           `/Length ${anh.length} >>\nstream\n`);
    day(anh);                                  // NGUYÊN KHỐI — không đụng vào ảnh
    dayChu('\nendstream\n');
    dongObj();
  }

  /* Bảng tra vị trí. Mỗi dòng ĐÚNG 20 byte, chuẩn bắt buộc như vậy — thiếu
     một dấu cách là trình đọc báo file hỏng. */
  const viTriBang = viTri;
  dayChu(`xref\n0 ${soDoiTuong + 1}\n`);
  dayChu('0000000000 65535 f \n');
  for (let i = 1; i <= soDoiTuong; i++) {
    dayChu(`${String(viTriObj[i]).padStart(10, '0')} 00000 n \n`);
  }
  dayChu(`trailer\n<< /Size ${soDoiTuong + 1} /Root 1 0 R /Info 3 0 R >>\n` +
         `startxref\n${viTriBang}\n%%EOF\n`);

  const tong = manh.reduce((a, m) => a + m.length, 0);
  const ra = new Uint8Array(tong);
  let o = 0;
  for (const m of manh) { ra.set(m, o); o += m.length; }
  return ra;
}

/** Chuỗi hex UTF-16BE có BOM — dạng chuỗi chữ có dấu duy nhất PDF 1.4 hiểu. */
function utf16beHex(s) {
  let hex = 'FEFF';
  for (const ky of s) {
    const ma = ky.codePointAt(0);
    if (ma > 0xFFFF) {                        // ngoài BMP → cặp thay thế
      const t = ma - 0x10000;
      hex += (0xD800 + (t >> 10)).toString(16).padStart(4, '0').toUpperCase();
      hex += (0xDC00 + (t & 0x3FF)).toString(16).padStart(4, '0').toUpperCase();
    } else {
      hex += ma.toString(16).padStart(4, '0').toUpperCase();
    }
  }
  return hex;
}

/** `D:YYYYMMDDHHmmSS+07'00'` — giờ Việt Nam, đúng khuôn ngày tháng của PDF. */
function mocThoiGianPDF(luc) {
  const vn = new Date(luc.getTime() + 7 * 3600 * 1000);
  const h = n => String(n).padStart(2, '0');
  return `D:${vn.getUTCFullYear()}${h(vn.getUTCMonth() + 1)}${h(vn.getUTCDate())}` +
         `${h(vn.getUTCHours())}${h(vn.getUTCMinutes())}${h(vn.getUTCSeconds())}+07'00'`;
}

/* ==========================================================================
   3. Đổi qua lại giữa data URL và byte
   ---------------------------------------------------------------------------
   ⚠️ BH-27 — KHÔNG dùng `String.fromCharCode(...mảng)`. Toán tử `...` trải
   mỗi byte thành một tham số hàm và GÃY trong khoảng 100–200 KB. Một trang
   quét sau nén là 150–400 KB, tức là gãy CHẮC CHẮN. Đây đúng là cái bẫy đã
   làm hỏng đường dán ảnh vào chat; chép lại cảnh báo vào đây để đời sau
   không đạp lại.
   ========================================================================== */

export function dataUrlThanhByte(dataUrl) {
  const raw = String(dataUrl || '').replace(/^data:[^,]*,/, '');
  const bin = atob(raw);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

export function byteThanhBase64(bytes) {
  let chuoi = '';
  const LO = 8192;                              // đủ nhỏ để không gãy, đủ lớn để nhanh
  for (let i = 0; i < bytes.length; i += LO) {
    chuoi += String.fromCharCode.apply(null, bytes.subarray(i, i + LO));
  }
  return btoa(chuoi);
}

/* ==========================================================================
   5. ĐỌC MỘT FILE PDF CÓ SẴN  ·  CTL-0026 vòng 6 — "tải file từ máy tính"
   ---------------------------------------------------------------------------
   Sếp Ngọc 29/08/2026: *"nếu tôi upload file từ máy tính lên thì không có chỗ
   thêm tài liệu à"*. Trên máy tính, giấy tờ thường ĐÃ LÀ FILE: bản scan từ máy
   scan thật, hoặc PDF nhận qua email. Bắt chụp lại màn hình là vô lý.

   ⚠️ LUẬT ① — PDF ĐÃ LÀ PDF THÌ KHÔNG BỌC LẠI.
   Cám dỗ là cho PDF đi qua `gopTrangThanhPDF()` cho "một đường duy nhất". Làm
   thế là SAI HAI LẦN: (a) muốn bọc thì phải RENDER từng trang PDF ra ảnh, mà
   ERP không có thư viện đọc PDF và ràng buộc chi phí 0 cấm thêm dịch vụ;
   (b) kể cả làm được thì ảnh → JPEG → PDF là nén hai lần: file phình lên và
   chữ nhoè đi. Bản scan 300 DPI của máy scan thật vốn đã là PDF chuẩn — chép
   NGUYÊN khối byte lên kho là đường vừa rẻ nhất vừa cho chất lượng cao nhất.

   Hai hàm dưới đây KHÔNG sửa PDF. Chúng chỉ NHÌN vào file để trả lời hai câu
   mà màn hình phải nói ra trước khi gửi: "đây có đúng là PDF không" và "nó
   dày mấy trang".
   ========================================================================== */

/** Đúng là file PDF không — soi CHỮ KÝ 5 byte đầu `%PDF-`, không tin phần đuôi
 *  tên file. Đổi tên `virus.exe` thành `hop-dong.pdf` là việc ai cũng làm được;
 *  đổi 5 byte đầu thì không còn là cái file người ta định gửi nữa.
 *  Máy chủ soi LẠI đúng chữ ký này (`src/tai-lieu.js`) — đây chỉ là báo sớm. */
export function laByteCuaPDF(bytes) {
  return !!bytes && bytes.length > 5 &&
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 &&
    bytes[3] === 0x46 && bytes[4] === 0x2D;                 // % P D F -
}

/** SỐ TRANG của một file PDF — hoặc `0` nếu KHÔNG ĐẾM ĐƯỢC.
 *
 *  ⚠️ Trả 0 là câu trả lời THẬT, không phải lỗi. PDF đời mới hay nén cả cây
 *  đối tượng vào `/ObjStm` (object stream), lúc đó chuỗi `/Type /Page` nằm
 *  trong khối đã nén Flate và KHÔNG đọc được nếu không giải nén — mà giải nén
 *  cần thư viện. Đoán bừa "1 trang" cho một bản scan 30 trang là nói dối vào
 *  đúng cột `so_trang` mà sau này người ta dùng để đối chiếu với xấp giấy.
 *  Nơi gọi phải nói thẳng "không đếm được", xem `quet-tai-lieu.js`.
 *
 *  Đọc theo KHỐI 1 MB, KHÔNG dựng một chuỗi 25 MB: file scan to là chuyện
 *  thường ở đây, và một chuỗi 25 MB trên điện thoại cũ là một cú treo tab.
 *  Mỗi khối lại ghép từ mẩu 8 KB — `String.fromCharCode.apply` GÃY ở mảng
 *  trên khoảng 100–200 KB (BH-27, xem `byteThanhBase64` ngay trên). Khối
 *  chồng lấn 64 byte để không cắt đôi đúng cụm `/Type /Page` ở mép. */
export function demTrangPDF(bytes) {
  if (!laByteCuaPDF(bytes)) return 0;
  const KHOI = 1 << 20, MAU = 8192, CHONG = 64;
  let demTrang = 0, countLonNhat = 0;
  for (let i = 0; i < bytes.length; i += KHOI) {
    const het = Math.min(i + KHOI + CHONG, bytes.length);
    let s = '';
    for (let j = i; j < het; j += MAU) {
      s += String.fromCharCode.apply(null, bytes.subarray(j, Math.min(j + MAU, het)));
    }
    /* `/Type /Page` KHÔNG theo sau bởi `s` — `/Pages` là NÚT CÂY, không phải
       trang. Đếm nhầm nó là mọi PDF đều dày thêm đúng 1 trang. */
    for (const _ of s.matchAll(/\/Type\s*\/Page(?![s\w])/g)) demTrang++;
    /* Đường lui: `/Count N` của nút `/Pages` gốc. Lấy số LỚN NHẤT vì cây trang
       nhiều tầng có nhiều `/Count`, gốc luôn là số lớn nhất. */
    for (const m of s.matchAll(/\/Count\s+(\d+)/g)) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > countLonNhat) countLonNhat = n;
    }
  }
  return demTrang || countLonNhat || 0;
}
