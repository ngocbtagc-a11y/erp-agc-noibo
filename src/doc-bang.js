/* ==========================================================================
   src/doc-bang.js — ĐỌC FILE BẢNG (CSV · TSV · XLSX) THÀNH LƯỚI Ô
   ---------------------------------------------------------------------------
   ⚠️ LUẬT CỨNG CỦA FILE NÀY: KHÔNG MỘT LƯỢT GỌI AI NÀO.

   Đây là đường "đọc để TÍNH" — số vào sổ sách (sản phẩm, tồn kho, tiền, số
   lượng). Khác hẳn đường "đọc để LƯU" ở `src/tai-lieu.js`, nơi AI được phép
   đọc hợp đồng scan rồi gắn nhãn "chưa kiểm".

   Con số AI đọc = CHƯA KIỂM. Sổ sách không nhận số chưa kiểm. Nên ở đây đọc
   TỪNG Ô một cách máy móc: hoặc ra đúng giá trị có trong file, hoặc BÁO LỖI
   nói rõ DÒNG NÀO CỘT NÀO. Tuyệt đối không đoán, không "hiểu ý", không suy
   luận. Một con số đoán sai trong bảng tồn kho là một lần kiểm kê sai.

   ---------------------------------------------------------------------------
   NHỮNG CHỖ ĐÃ CẮN NGƯỜI KHÁC, ĐÃ XỬ Ở ĐÂY (đừng gỡ ra cho "gọn"):

   ① BOM đầu file. Excel bản Việt Nam lưu CSV kèm ba byte EF BB BF. Không cắt
      thì tên cột đầu tiên thành "﻿Mã SKU" — mắt người nhìn giống hệt
      "Mã SKU" nhưng máy so sánh KHÔNG khớp. Kiểu hỏng khó thấy nhất.

   ② UTF-16LE. Excel "Save as → Unicode Text (*.txt)" ra UTF-16LE + TAB, KHÔNG
      phải UTF-8. Đọc nhầm ra chuỗi xen NUL, nhìn như file rác.
      Tự giải mã bằng tay chứ không nhờ TextDecoder('utf-16le') — bảng mã
      ngoài utf-8 không phải bản Workers nào cũng có, mà hỏng thì hỏng câm.

   ③ Dấu phân cách. Máy Việt Nam đặt Region = Vietnam thì Excel xuất CSV bằng
      DẤU CHẤM PHẨY, không phải dấu phẩy. Đoán sai là cả bảng dồn vào một cột.
      → Không đoán bừa: thử cả `, ; \t |`, chọn cái cho số ô ĐỀU NHẤT giữa
        các dòng (xem `chonDauPhanCach`).

   ④ Dấu phẩy và xuống dòng NẰM TRONG ô có ngoặc kép. Tên sản phẩm thật có
      dạng `Hạt điều rang muối, loại 1` — tách thô bằng split(',') là vỡ.
      → Máy đọc theo RFC 4180 đúng nghĩa, có trạng thái trong/ngoài ngoặc.

   ⑤ SKU trông như số: `074305001161` (mã thật trong file của Sếp). Đọc thành
      số là mất số 0 đầu, dài hơn nữa thì thành 7.43E+11. → Ô LUÔN trả về
      CHUỖI. Việc đổi sang số làm sau, và chỉ cho cột nào Sếp bảo là số.

   ⑥ Bộ nhớ. Worker chỉ có 128 MB cho cả isolate. File .xlsx 0,9 MB của Shopee
      bung ra 8,9 MB XML (gấp 10,8 lần — số đo thật, không phải ước lượng).
      → Có TRẦN BYTE và TRẦN DÒNG, chạm là dừng và nói ra, không âm thầm cắt.
      Trần CỘT cũng vậy: cột thứ 201 CÓ nội dung là dừng và nói ra (REV-0060).

   ⑦ .XLSX NHIỀU BẢNG. `Desktop\Nhap_khau_hang_hoa.xlsx` của Sếp có 7 bảng,
      bảng đầu tiên là trang chữ "Hướng dẫn nhập khẩu", số liệu nằm ở bảng 2.
      Lấy bảng đầu rồi im lặng là đưa trang hướng dẫn cho Sếp như thể đó là
      bảng số liệu. → Liệt kê TÊN + SỐ DÒNG của mọi bảng, để NGƯỜI chọn.

   ⑧ HỆ NGÀY 1904. Excel có hai mốc ngày. File xuất từ Excel bản Mac cũ khai
      `<workbookPr date1904="1"/>`; không đọc cờ này thì mọi ô ngày lệch đúng
      4 năm 1 ngày, mà lệch IM LẶNG. Hạn sử dụng lệch 4 năm với công ty bán
      thực phẩm là kiểu sai đắt nhất. → Đọc cờ, bù ngày, và NÓI RA đã bù.

   ⑨ .XLSX ĐẶT MẬT KHẨU nằm trong kho OLE2, byte đầu `D0 CF 11 E0` giống hệt
      .xls 2003. Chẩn đoán nhầm là Sếp đi chữa sai bệnh. → Dò dấu vết
      `EncryptedPackage` rồi nói thẳng là file đang có mật khẩu.
   ========================================================================== */

/* ---- Trần an toàn -------------------------------------------------------
   Đây là đường ghi vào sổ sách, KHÔNG phải kho tài liệu (kho tài liệu trần
   25 MB — xem API.tlLuuTep). Bảng số liệu thực tế của công ty nhỏ hơn nhiều:
   danh mục sản phẩm thật của Sếp là 797 dòng / 67 KB. Đặt trần rộng gấp
   nhiều lần chỗ cần, nhưng vẫn xa ngưỡng chết bộ nhớ. */
export const TRAN_BYTE = 8 * 1024 * 1024;      // 8 MB file thô
export const TRAN_DONG = 20000;                // 20.000 dòng dữ liệu
export const TRAN_COT = 200;                   // 200 cột
export const TRAN_XML_BUNG = 64 * 1024 * 1024; // 64 MB sau khi bung .xlsx

/** Lỗi có câu chữ tiếng người, ném ra để tầng trên hiển thị nguyên văn. */
export class LoiDocBang extends Error {
  constructor(thongDiep) { super(thongDiep); this.name = 'LoiDocBang'; }
}

/* ==========================================================================
   1. NHẬN DẠNG KIỂU FILE — theo BYTE ĐẦU, không theo đuôi tên
   --------------------------------------------------------------------------
   Vì sao không tin đuôi tên: file Shopee thật tên
   `Order.return_refund...xls` nhưng byte đầu là `PK\x03\x04` — tức nó là
   .xlsx (một file nén) bị đặt sai đuôi. Tin đuôi tên là đọc sai ngay từ
   bước đầu. Byte không nói dối.
   ========================================================================== */

/* Dò dấu vết "gói đã mã hoá" của ECMA-376 nằm trong kho OLE2.
   VÌ SAO CẦN: file .xlsx ĐẶT MẬT KHẨU được Excel gói lại trong kho OLE2, nên
   byte đầu là `D0 CF 11 E0` — GIỐNG HỆT .xls đời 2003. Không dò thêm thì ERP
   chẩn đoán nhầm ("file .xls đời 2003") và Sếp đi lưu lại thành CSV mãi không
   xong, vì bệnh thật là cái mật khẩu.
   Tên mục trong kho OLE2 lưu kiểu UTF-16LE ('E',0,'n',0,…) nên dò theo lối
   "cho phép ĐÚNG MỘT byte đệm giữa hai chữ cái" — bắt được cả dạng liền lẫn
   dạng xen byte, mà không phải dựng chuỗi khổng lồ trong bộ nhớ. */
function coDauMatKhau(bytes) {
  for (const chu of ['EncryptedPackage', 'StrongEncryptionDataSpace']) {
    const dau = chu.charCodeAt(0);
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== dau) continue;
      for (const buoc of [1, 2]) {                 // liền nhau, hoặc xen 1 byte
        let khop = true;
        for (let k = 1; k < chu.length; k++) {
          if (bytes[i + k * buoc] !== chu.charCodeAt(k)) { khop = false; break; }
        }
        if (khop) return true;
      }
    }
  }
  return false;
}

export function nhanDangKieu(bytes) {
  if (bytes.length >= 4 &&
      bytes[0] === 0x50 && bytes[1] === 0x4B &&
      (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
    return 'xlsx';                       // file nén — có thể là .xlsx
  }
  // .xls đời cũ (BIFF/OLE2): D0 CF 11 E0 A1 B1 1A E1 — KHÔNG đọc được.
  if (bytes.length >= 8 &&
      bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
    return coDauMatKhau(bytes) ? 'co_mat_khau' : 'xls_cu';
  }
  if (bytes.length >= 5 &&
      bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf';
  }
  return 'chu';                          // coi như file chữ (CSV/TSV/TXT)
}

/* ==========================================================================
   2. GIẢI MÃ BYTE → CHỮ
   ========================================================================== */

/* Giải mã UTF-16 bằng tay. Không dùng TextDecoder('utf-16le') vì bảng mã
   ngoài utf-8 không chắc có ở mọi bản Workers — mà thiếu thì nó ném, hoặc tệ
   hơn là trả rác. Mười dòng tự viết đổi lấy chắc chắn. */
function giaiMaUtf16(bytes, nhoTruoc) {
  const n = bytes.length >> 1;
  const ma = [];
  for (let i = 0; i < n; i++) {
    const b0 = bytes[i * 2], b1 = bytes[i * 2 + 1];
    ma.push(nhoTruoc ? (b0 << 8) | b1 : (b1 << 8) | b0);
  }
  // Ghép từng mẩu để không nổ ngăn xếp khi gọi String.fromCharCode(...rất nhiều)
  let ra = '';
  for (let i = 0; i < ma.length; i += 8192) {
    ra += String.fromCharCode.apply(null, ma.slice(i, i + 8192));
  }
  return ra;
}

/**
 * Đổi byte thành chữ, tự nhận bảng mã.
 * @returns {{chu: string, bangMa: string}}
 */
export function giaiMa(bytes) {
  // --- BOM: bằng chứng chắc chắn nhất, xét trước ---
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { chu: new TextDecoder('utf-8').decode(bytes.subarray(3)), bangMa: 'UTF-8 (có BOM)' };
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return { chu: giaiMaUtf16(bytes.subarray(2), false), bangMa: 'UTF-16LE' };
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return { chu: giaiMaUtf16(bytes.subarray(2), true), bangMa: 'UTF-16BE' };
  }

  /* --- Không có BOM: đoán UTF-16 bằng thế phân bố byte NUL ---
     Chữ Latin/Việt trong UTF-16LE luôn có byte cao = 0, tức file đầy NUL ở
     vị trí LẺ. UTF-8 gần như không bao giờ chứa NUL. Lấy 1 KB đầu làm mẫu. */
  const mau = Math.min(bytes.length, 1024);
  let nulLe = 0, nulChan = 0;
  for (let i = 0; i < mau; i++) {
    if (bytes[i] === 0) (i % 2 ? nulLe++ : nulChan++);
  }
  if (nulLe > mau / 8 && nulChan < 4) return { chu: giaiMaUtf16(bytes, false), bangMa: 'UTF-16LE (không BOM)' };
  if (nulChan > mau / 8 && nulLe < 4) return { chu: giaiMaUtf16(bytes.subarray(0), true), bangMa: 'UTF-16BE (không BOM)' };

  /* --- Mặc định UTF-8, KHÔNG bỏ qua lỗi ---
     `fatal: true` để file mã Việt cũ (TCVN3/VNI/CP1258) KHÔNG lọt qua thành
     chữ rác trông như chữ. Thà báo "không đọc được" còn hơn nhập vào sổ một
     tên sản phẩm sai chính tả mà không ai biết. */
  try {
    return { chu: new TextDecoder('utf-8', { fatal: true }).decode(bytes), bangMa: 'UTF-8' };
  } catch {
    throw new LoiDocBang(
      'File này không phải mã UTF-8 nên đọc ra chữ sai dấu. ' +
      'Mở lại bằng Excel rồi bấm “Lưu thành” → chọn “CSV UTF-8 (dấu phẩy phân cách)”.');
  }
}

/* ==========================================================================
   3. TÁCH CSV THEO RFC 4180
   --------------------------------------------------------------------------
   Đây là phần dễ viết ẩu nhất. `chu.split('\n').map(d => d.split(','))` chạy
   được với file đẹp và VỠ với file thật. Máy dưới đây đọc từng ký tự, có
   trạng thái "đang trong ngoặc kép hay không", nên:
     · `Hạt điều, loại 1`   nằm trong ngoặc kép -> vẫn là MỘT ô
     · ô có xuống dòng      nằm trong ngoặc kép -> vẫn là MỘT ô
     · `""` bên trong ngoặc -> một dấu " thật
   ========================================================================== */

function tachCsv(chu, dau, tranDong) {
  const luoi = [];
  let o = [], hienTai = '', trongNgoac = false, batDauDong = 0;
  let i = 0;
  const N = chu.length;
  let dongCuaODangMo = 1, soDong = 1;

  const chotO   = () => { o.push(hienTai); hienTai = ''; };
  const chotDong = () => {
    luoi.push(o); o = [];
    if (luoi.length > tranDong + 1) {
      throw new LoiDocBang(
        `File có nhiều hơn ${tranDong.toLocaleString('vi-VN')} dòng — vượt sức xử lý một lần. ` +
        `Xin chia nhỏ file rồi nạp làm nhiều lần.`);
    }
  };

  while (i < N) {
    const c = chu[i];

    if (trongNgoac) {
      if (c === '"') {
        if (chu[i + 1] === '"') { hienTai += '"'; i += 2; continue; }  // "" = một dấu "
        trongNgoac = false; i++; continue;
      }
      if (c === '\n') soDong++;
      hienTai += c; i++; continue;
    }

    if (c === '"' && hienTai === '') { trongNgoac = true; dongCuaODangMo = soDong; i++; continue; }
    if (c === dau) { chotO(); i++; continue; }
    if (c === '\r') { i++; continue; }                                  // CRLF -> bỏ CR
    if (c === '\n') { soDong++; chotO(); chotDong(); i++; batDauDong = i; continue; }

    hienTai += c; i++;
  }

  if (trongNgoac) {
    throw new LoiDocBang(
      `Dòng ${dongCuaODangMo}: có một dấu ngoặc kép mở ra mà không thấy đóng lại. ` +
      `Thường do trong ô có ký tự " lẻ. Kiểm tra lại dòng này trong Excel.`);
  }
  // Ô/dòng cuối chưa chốt (file không kết thúc bằng xuống dòng)
  if (hienTai !== '' || o.length) { chotO(); chotDong(); }

  return luoi;
}

/* Chọn dấu phân cách: thử từng ứng viên, chấm điểm bằng độ ĐỀU của số ô.
   Không hỏi người dùng vì đây là thứ máy đo được chắc chắn — khác với việc
   cột nào là cột nào (cái đó máy KHÔNG được đoán, phải để Sếp chọn). */
export function chonDauPhanCach(chu) {
  const ungVien = [',', ';', '\t', '|'];
  const mau = chu.slice(0, 64 * 1024);        // 64 KB đầu là quá đủ để nhìn ra
  let totNhat = ',', diemTot = -1;

  for (const dau of ungVien) {
    let luoi;
    try { luoi = tachCsv(mau, dau, 500); } catch { continue; }
    const dong = luoi.filter(d => d.length && d.some(o => o !== '')).slice(0, 20);
    if (dong.length < 1) continue;

    const soO = dong.map(d => d.length);
    const dauTien = soO[0];
    if (dauTien < 2) continue;                // một cột thì coi như không tách được
    const deu = soO.filter(n => n === dauTien).length / soO.length;
    // Ưu tiên ĐỀU trước, rồi mới tới nhiều cột. Đều 100% với 15 cột thắng
    // đều 60% với 30 cột — vì lệch số ô nghĩa là tách sai.
    const diem = deu * 1000 + dauTien;
    if (diem > diemTot) { diemTot = diem; totNhat = dau; }
  }
  return totNhat;
}

/* ==========================================================================
   4. ĐỌC .XLSX  (file nén chứa XML)
   --------------------------------------------------------------------------
   Workers có sẵn `DecompressionStream('deflate-raw')` — cùng thứ đã dùng để
   bóc chữ trong PDF ở `src/pdf-chu.js`. Không thêm thư viện, không tốn đồng
   nào.

   Đọc mục lục trung tâm của file nén (End Of Central Directory) chứ không
   quét tuần tự: mục lục cho biết chính xác từng phần nằm ở đâu, dài bao
   nhiêu, nén kiểu gì.
   ========================================================================== */

const soLE16 = (b, p) => b[p] | (b[p + 1] << 8);
const soLE32 = (b, p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16)) + b[p + 3] * 0x1000000;

/** Đọc mục lục file nén -> Map(tên phần -> {vi tri, kieu nen, co}) */
function mucLucNen(b) {
  // EOCD nằm gần cuối, sau nó tối đa 64 KB ghi chú
  let p = -1;
  const somNhat = Math.max(0, b.length - 65557);
  for (let i = b.length - 22; i >= somNhat; i--) {
    if (b[i] === 0x50 && b[i + 1] === 0x4B && b[i + 2] === 0x05 && b[i + 3] === 0x06) { p = i; break; }
  }
  if (p < 0) throw new LoiDocBang('File Excel này hỏng cấu trúc bên trong — không mở được. Thử mở bằng Excel rồi lưu lại.');

  const so = soLE16(b, p + 10);
  let off = soLE32(b, p + 16);
  const muc = new Map();
  const doc = new TextDecoder('utf-8');

  for (let i = 0; i < so; i++) {
    if (off + 46 > b.length || b[off] !== 0x50 || b[off + 1] !== 0x4B || b[off + 2] !== 0x01) break;
    const kieuNen = soLE16(b, off + 10);
    const coNen   = soLE32(b, off + 20);
    const coThat  = soLE32(b, off + 24);
    const nLen = soLE16(b, off + 28), eLen = soLE16(b, off + 30), cLen = soLE16(b, off + 32);
    const cucBo = soLE32(b, off + 42);
    const ten = doc.decode(b.subarray(off + 46, off + 46 + nLen));
    muc.set(ten, { kieuNen, coNen, coThat, cucBo });
    off += 46 + nLen + eLen + cLen;
  }
  return muc;
}

/** Bung MỘT phần trong file nén thành chuỗi XML. */
async function bungPhan(b, m) {
  if (!m) return null;
  if (m.coThat > TRAN_XML_BUNG) {
    throw new LoiDocBang(
      `Bảng trong file Excel này bung ra tới ${Math.round(m.coThat / 1048576)} MB — quá lớn để xử lý một lần. ` +
      `Xin mở file, giữ lại phần cần nạp rồi lưu thành file CSV.`);
  }
  const p = m.cucBo;
  if (b[p] !== 0x50 || b[p + 1] !== 0x4B) throw new LoiDocBang('File Excel này hỏng cấu trúc bên trong — không mở được.');
  const nLen = soLE16(b, p + 26), eLen = soLE16(b, p + 28);
  const dau = p + 30 + nLen + eLen;
  const than = b.subarray(dau, dau + m.coNen);

  if (m.kieuNen === 0) return new TextDecoder('utf-8').decode(than);   // không nén
  if (m.kieuNen !== 8) throw new LoiDocBang('File Excel này dùng kiểu nén lạ — không đọc được. Xin lưu lại thành file CSV.');

  const luong = new Response(than).body.pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(luong).text();
}

/* Gỡ thực thể XML. Phải làm &amp; SAU CÙNG, không thì `&amp;lt;` ra `<`. */
function goThucThe(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
          .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
          .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
          .replace(/&amp;/g, '&');
}

/** Đổi tham chiếu ô kiểu "BC12" -> chỉ số cột 0-based (BC = 54). */
function cotTuRef(ref) {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/* Trần số bảng liệt kê ra cho người chọn. File thật của Sếp nhiều nhất là 7
   bảng; đặt 30 để không ai chạm, mà cũng không phải bung 500 phần XML. */
const TRAN_BANG = 30;

/**
 * Đọc .xlsx.
 * @param {number|null} chon   chỉ số bảng NGƯỜI chọn (0 = bảng đầu tiên).
 *                             `null`/không truyền = chưa ai chọn, ERP tự mở
 *                             bảng đầu tiên KHÔNG bị ẩn và CÓ dòng dữ liệu.
 * @param {boolean} demDong    có đếm số dòng của TỪNG bảng không (tốn thêm
 *                             một lượt bung mỗi bảng — chỉ bật ở bước 1, để
 *                             Sếp nhìn số dòng mà chọn đúng bảng)
 * @returns {{luoi, dsBang, chon, tenBang, he1904, canhBao}}
 */
async function docXlsx(bytes, tranDong, chon = null, demDong = false) {
  const muc = mucLucNen(bytes);
  const canhBao = [];

  /* --- Liệt kê TẤT CẢ các bảng, không chỉ bảng đầu ---
     ⚠️ ĐÂY LÀ CHỖ ĐÃ CẮN FILE THẬT CỦA SẾP.
     `Desktop\Nhap_khau_hang_hoa.xlsx` có 7 bảng, bảng đầu tiên tên
     "Hướng dẫn nhập khẩu" — một trang chữ hướng dẫn, KHÔNG phải số liệu.
     Lấy bảng đầu rồi im lặng là đưa trang hướng dẫn cho Sếp như thể đó là
     bảng số liệu. Máy KHÔNG được đoán bảng nào là bảng cần (đúng luật ① của
     nap-du-lieu.js: máy gợi ý, người chọn).

     Đi đúng đường: workbook.xml cho biết thứ tự + TÊN từng bảng và r:id của
     nó, file rels đổi r:id ra đường dẫn thật. File Shopee thật chỉ có
     `sheet2.xml` chứ không có sheet1 — đoán tên file là đọc ra rỗng. */
  const wb = await bungPhan(bytes, muc.get('xl/workbook.xml'));
  const rels = await bungPhan(bytes, muc.get('xl/_rels/workbook.xml.rels'));
  const dsBang = [];
  if (wb && rels) {
    for (const m of wb.matchAll(/<sheet\b[^>]*\/?>/g)) {
      if (dsBang.length >= TRAN_BANG) break;
      const the = m[0];
      const ten = goThucThe((the.match(/\bname="([^"]*)"/) || [])[1] || '');
      const rid = (the.match(/r:id="([^"]+)"/) || [])[1];
      /* ⚠️ BẢNG ĐANG BỊ ẨN (REV-0060 vòng 2 · CAO-⑦a).
         Bản trước chỉ đọc `name` + `r:id`, bỏ qua `state="hidden"`. Bảng bị
         ẩn đúng là bảng người ta KHÔNG muốn ai đọc — thường là bản nháp cũ,
         số sai. Đo được: file có "Nháp cũ" (ẩn) + "Chính thức" thì ERP mặc
         định đọc "Nháp cũ", không một chữ nào nói nó đang ẩn. */
      const tt = ((the.match(/\bstate="([^"]*)"/) || [])[1] || '').toLowerCase();
      const an = tt === 'hidden' || tt === 'veryhidden';
      let duong = null;
      if (rid) {
        const rel = rels.match(new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*>`));
        const t = rel && (rel[0].match(/Target="([^"]+)"/) || [])[1];
        if (t) duong = t.replace(/^\/?(xl\/)?/, 'xl/');
      }
      if (duong && muc.has(duong)) dsBang.push({ ten: ten || `Bảng ${dsBang.length + 1}`, duong, an });
    }
  }
  if (!dsBang.length) {
    for (const k of [...muc.keys()].filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()) {
      if (dsBang.length >= TRAN_BANG) break;
      dsBang.push({ ten: `Bảng ${dsBang.length + 1}`, duong: k, an: false });
    }
  }
  if (!dsBang.length) throw new LoiDocBang('File Excel này không có bảng dữ liệu nào đọc được. Xin kiểm tra lại file.');

  /* --- CHỌN BẢNG ---
     `chon` là con số NGƯỜI chọn ở bước 1. Không có (null/undefined) nghĩa là
     chưa ai chọn, ERP phải tự mở một bảng — và lúc ĐÓ mới được quyền bỏ qua
     bảng ẩn. Người đã chỉ đích danh bảng nào thì mở đúng bảng đó, kể cả bảng
     ẩn: máy không cãi người (luật ① của nap-du-lieu.js). */
  const nguoiChon = Number.isInteger(chon) && chon >= 0 && chon < dsBang.length;
  const chonMacDinh = () => {
    const i = dsBang.findIndex(b => !b.an);
    return i >= 0 ? i : 0;
  };
  let chonThat = nguoiChon ? chon : chonMacDinh();
  const soAn = dsBang.filter(b => b.an).length;
  if (soAn) {
    canhBao.push(
      `File có ${soAn === dsBang.length ? 'toàn bộ' : soAn} bảng đang bị ẨN trong Excel ` +
      `(${dsBang.filter(b => b.an).map(b => '“' + b.ten + '”').join(', ')}). ` +
      `Bảng ẩn thường là bản nháp cũ — ERP ${dsBang[chonThat].an ? 'ĐANG ĐỌC ĐÚNG BẢNG ẨN theo lựa chọn của bạn' : 'không lấy bảng ẩn làm mặc định'}. ` +
      `Xin xem kỹ trước khi nạp.`);
  }
  let duongBang = dsBang[chonThat].duong;

  /* --- Hệ ngày 1904 (Excel bản Mac cũ, hoặc file đối tác gửi) ---
     Excel có HAI mốc ngày. Không đọc cờ này thì mọi ô ngày lệch đúng 4 năm 1
     ngày — mà lệch im lặng. Với công ty bán THỰC PHẨM, hạn sử dụng lệch 4 năm
     là kiểu sai đắt nhất. Đọc thêm một cờ, hết bệnh. */
  const he1904 = !!(wb && /<workbookPr\b[^>]*date1904="(1|true)"/i.test(wb));
  if (he1904) {
    canhBao.push('File này dùng hệ ngày 1904 (Excel bản Mac cũ). ' +
                 'ERP đã bù 4 năm 1 ngày khi đọc các ô ngày — xin kiểm lại vài ô ngày ở bước sau cho chắc.');
  }

  // --- Kho chuỗi dùng chung: ô chữ trong xlsx chỉ lưu SỐ THỨ TỰ trỏ vào đây ---
  const kho = [];
  const xmlKho = await bungPhan(bytes, muc.get('xl/sharedStrings.xml'));
  if (xmlKho) {
    for (const m of xmlKho.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      // Một <si> có thể chứa NHIỀU <t> (chữ nhiều định dạng) — phải nối hết,
      // lấy mỗi cái đầu là mất chữ giữa chừng.
      let t = '';
      for (const g of m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) t += g[1];
      kho.push(goThucThe(t));
    }
  }

  /* Bung MỘT bảng thành lưới ô. Tách hàm để còn đọc sang bảng khác được khi
     bảng đang mở rỗng — xem khối "BẢNG RỖNG" ngay dưới. */
  async function bungLuoi(duongB, tenB) {
    const xml = await bungPhan(bytes, muc.get(duongB));
    const rieng = [];

    /* --- Ô GỘP: nói ra, đừng để Sếp tự đoán vì sao dòng dưới trống ---
       Excel chỉ giữ giá trị ở ô TRÊN CÙNG của vùng gộp; các dòng dưới đọc ra
       rỗng. Luật `batBuoc` bắt được và báo đúng dòng đúng cột, nên không có
       số nào chạy êm vào sổ — chỉ thiếu một câu nói cho người dùng biết
       NGUYÊN NHÂN, để họ đi bỏ gộp ô thay vì ngồi gõ lại tay. */
    const soOGop = Number((xml.match(/<mergeCells\b[^>]*count="(\d+)"/) || [])[1] || 0) ||
                   (xml.match(/<mergeCell\b/g) || []).length;
    if (soOGop > 0) {
      rieng.push(`Bảng này có ${soOGop} vùng ô gộp (Merge & Center). ` +
                 `Excel chỉ giữ giá trị ở ô trên cùng, nên các dòng dưới sẽ đọc ra TRỐNG. ` +
                 `Xin bỏ gộp ô rồi điền đủ từng dòng, sau đó lưu lại và nạp lần nữa.`);
    }

    const luoi = [];
    let cotVuotTran = 0;                 // cột thứ 201 trở đi mà CÓ nội dung thật
    for (const md of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const o = [];
      for (const mc of md[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attr = mc[1], than = mc[2] || '';
        const ref = (attr.match(/r="([A-Z]+\d+)"/) || [])[1];
        const kieu = (attr.match(/t="([^"]+)"/) || [])[1] || 'n';
        let v = '';
        if (kieu === 'inlineStr') {
          for (const g of than.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) v += g[1];
          v = goThucThe(v);
        } else {
          const mv = than.match(/<v>([\s\S]*?)<\/v>/);
          v = mv ? goThucThe(mv[1]) : '';
          if (kieu === 's') v = kho[+v] ?? '';           // trỏ vào kho chuỗi
        }
        const ci = ref ? cotTuRef(ref) : o.length;
        if (ci >= 0 && ci < TRAN_COT) { while (o.length < ci) o.push(''); o[ci] = v; }
        /* ⚠️ KHÔNG CẮT ÂM THẦM. Đầu file này có hứa: "chạm là dừng và NÓI RA,
           không âm thầm cắt" — CSV giữ lời hứa đó, .xlsx thì trước đây lặng lẽ
           vứt cột 201 trở đi. Chỉ tính là mất mát khi ô đó CÓ nội dung: file
           Excel hay đèo theo hàng trăm cột trống chỉ vì lỡ tô màu, vứt mấy cột
           rỗng ấy đi thì không mất gì và cũng không cần kêu. */
        else if (ci >= TRAN_COT && String(v).trim() !== '') cotVuotTran = Math.max(cotVuotTran, ci + 1);
      }
      luoi.push(o);
      if (luoi.length > tranDong + 1) {
        throw new LoiDocBang(
          `File có nhiều hơn ${tranDong.toLocaleString('vi-VN')} dòng — vượt sức xử lý một lần. ` +
          `Xin chia nhỏ file rồi nạp làm nhiều lần.`);
      }
    }
    if (cotVuotTran) {
      throw new LoiDocBang(
        `Bảng “${tenB}” có tới ${cotVuotTran} cột có dữ liệu, vượt mức ${TRAN_COT} cột cho một lần nạp. ` +
        `Xin mở file, xoá bớt những cột không cần nạp rồi lưu lại và nạp lần nữa.`);
    }
    return { luoi, rieng };
  }

  let { luoi, rieng } = await bungLuoi(duongBang, dsBang[chonThat].ten);
  const coDong = l => l.filter(d => d.some(o => String(o ?? '').trim() !== '')).length;

  /* --- BẢNG ĐANG MỞ RỖNG MÀ FILE CÒN BẢNG KHÁC CÓ SỐ LIỆU (CAO-⑦b) ---
     Bản trước ném thẳng "File không có dòng nào có dữ liệu — mở lại bằng
     Excel xem có đúng file cần nạp không." Câu đó CHỈ SAI ĐƯỜNG: file đúng,
     chỉ là số liệu nằm ở bảng khác. Không phải ca giả định —
     `TongHop_SanPham_Theo_SKU.xlsx` của Sếp có `Sheet1` 0 dòng; đảo thứ tự
     hai bảng trong file là cả lần nạp cụt đường.
     Máy chưa ai chọn bảng thì được phép đi tiếp sang bảng có số liệu — nhưng
     phải NÓI RA là đã đi. Người đã chọn đích danh thì không tự ý đổi. */
  if (!nguoiChon && coDong(luoi) < 2 && dsBang.length > 1) {
    dsBang[chonThat].so_dong = Math.max(0, coDong(luoi) - 1);
    for (let i = 0; i < dsBang.length; i++) {
      if (i === chonThat) continue;
      let thu = null;
      try { thu = await bungLuoi(dsBang[i].duong, dsBang[i].ten); }
      catch { continue; }               // bảng hỏng/quá to thì bỏ, không làm hỏng cả lần đọc
      dsBang[i].so_dong = Math.max(0, coDong(thu.luoi) - 1);
      /* Đã đếm được số dòng của MỌI bảng rồi thì dù có đi tiếp được hay không,
         câu lỗi ở `docBang` cũng kê ra được đúng bảng nào có số liệu. */
      if (coDong(thu.luoi) < 2 || dsBang[i].an) continue;
      canhBao.push(`Bảng “${dsBang[chonThat].ten}” không có dòng dữ liệu nào, ` +
                   `nên ERP mở sang bảng “${dsBang[i].ten}”. ` +
                   `Nếu số liệu nằm ở bảng khác, xin chọn lại bảng rồi xem trước lần nữa.`);
      chonThat = i; duongBang = dsBang[i].duong;
      luoi = thu.luoi; rieng = thu.rieng;
      break;
    }
  }
  canhBao.push(...rieng);

  /* --- Đếm số dòng của từng bảng để Sếp chọn cho đúng ---
     Chỉ chạy ở bước 1 (`demDong`), vì mỗi bảng là một lượt bung XML. Bảng nào
     quá nặng thì để trống số dòng chứ không bung — thà thiếu một con số còn
     hơn ăn hết bộ nhớ của isolate. */
  for (let i = 0; i < dsBang.length; i++) {
    const b = dsBang[i];
    if (i === chonThat) { b.so_dong = Math.max(0, luoi.length - 1); continue; }
    /* Đã đếm rồi (đường "bảng rỗng" ở trên) thì giữ, đừng xoá đi đếm lại. */
    if (b.so_dong === undefined) b.so_dong = null;
    if (b.so_dong !== null) continue;
    if (!demDong || dsBang.length < 2) continue;
    const m = muc.get(b.duong);
    if (!m || m.coThat > 8 * 1024 * 1024) continue;
    try {
      const x = await bungPhan(bytes, m);
      b.so_dong = Math.max(0, (x.match(/<row\b/g) || []).length - 1);
    } catch { /* bảng lỗi thì bỏ số dòng, không làm hỏng cả lần đọc */ }
  }

  if (dsBang.length > 1) {
    canhBao.push(
      `File có ${dsBang.length} bảng. ERP đang đọc bảng “${dsBang[chonThat].ten}”. ` +
      `Nếu số liệu nằm ở bảng khác, xin chọn lại bảng rồi xem trước lần nữa.`);
  }

  return { luoi,
           dsBang: dsBang.map(b => ({ ten: b.ten, so_dong: b.so_dong, an: !!b.an })),
           chon: chonThat, tenBang: dsBang[chonThat].ten, he1904, canhBao };
}

/* ==========================================================================
   5. CỬA CHÍNH
   ========================================================================== */

/** Câu lỗi "bảng đang đọc không có số liệu" — KÊ TÊN các bảng khác ra.
 *  Trả `null` khi file chỉ có một bảng (lúc đó không có gì để chỉ sang, câu
 *  lỗi cũ đã đúng). */
function keBangRong(dsBang, tenBang) {
  if (!dsBang || dsBang.length < 2) return null;
  const ke = dsBang.map(b => `“${b.ten}” (${b.so_dong === null || b.so_dong === undefined
    ? 'chưa đếm được' : b.so_dong.toLocaleString('vi-VN') + ' dòng'}${b.an ? ', đang ẩn' : ''})`).join(' · ');
  const con = dsBang.filter(b => b.ten !== tenBang && Number(b.so_dong) > 0);
  return `Bảng “${tenBang}” không có dòng dữ liệu nào. File này có ${dsBang.length} bảng: ${ke}. ` +
         (con.length
           ? `Xin chọn lại bảng ${con.map(b => '“' + b.ten + '”').join(' hoặc ')} ở bước ghép cột rồi xem trước lần nữa.`
           : `Không bảng nào có dòng dữ liệu — mở lại bằng Excel xem có đúng file cần nạp không.`);
}

/**
 * Đọc file bảng thành lưới ô + tên cột.
 * @param {Uint8Array} bytes  nội dung file thô
 * @param {string} tenTep     tên file (chỉ để viết câu lỗi cho dễ hiểu)
 * @param {{bangChon?:number, demDong?:boolean}} tuyChon
 *        `bangChon` — .xlsx nhiều bảng thì đọc bảng thứ mấy (0 = bảng đầu).
 *        `demDong`  — có đếm số dòng của từng bảng không (bật ở bước 1 để Sếp
 *                     nhìn số dòng mà chọn đúng bảng; tốn thêm một lượt bung).
 * @returns {Promise<{cot:string[], dong:string[][], bangMa:string, dinhDang:string,
 *                    dauPhanCach:string|null, canhBao:string[],
 *                    dsBang:{ten:string,so_dong:number|null}[]|null,
 *                    bangChon:number, tenBang:string|null, he1904:boolean}>}
 */
export async function docBang(bytes, tenTep = 'file', tuyChon = {}) {
  if (!bytes || !bytes.length) {
    throw new LoiDocBang('File rỗng — không có nội dung nào để đọc.');
  }
  if (bytes.length > TRAN_BYTE) {
    throw new LoiDocBang(
      `File nặng ${(bytes.length / 1048576).toFixed(1)} MB, vượt mức ${TRAN_BYTE / 1048576} MB cho một lần nạp số liệu. ` +
      `Xin chia nhỏ file (mỗi lần một tháng, hoặc một nhóm hàng) rồi nạp làm nhiều lần.`);
  }

  const kieu = nhanDangKieu(bytes);
  if (kieu === 'co_mat_khau') {
    throw new LoiDocBang(
      'File Excel này đang ĐẶT MẬT KHẨU nên không mở ra để đọc được. ' +
      'Xin mở bằng Excel, vào “File → Thông tin → Bảo vệ sổ tính → Mã hoá bằng mật khẩu”, ' +
      'xoá trắng ô mật khẩu rồi lưu lại và gửi lần nữa.');
  }
  if (kieu === 'xls_cu') {
    throw new LoiDocBang(
      'Đây là file Excel định dạng cũ (.xls đời 2003). ERP chưa đọc được định dạng này. ' +
      'Xin mở bằng Excel rồi bấm “Lưu thành” → chọn “CSV UTF-8 (dấu phẩy phân cách)”.');
  }
  if (kieu === 'pdf') {
    throw new LoiDocBang('Đây là file PDF, không phải bảng số liệu. Xin dùng file Excel (.xlsx) hoặc CSV.');
  }

  const canhBao = [];
  let luoi, bangMa, dinhDang, dauPhanCach = null;
  let dsBang = null, bangChon = 0, tenBang = null, he1904 = false;

  if (kieu === 'xlsx') {
    dinhDang = 'Excel (.xlsx)';
    bangMa = 'UTF-8 (trong file Excel)';
    const x = await docXlsx(bytes, TRAN_DONG, tuyChon.bangChon, !!tuyChon.demDong);
    luoi = x.luoi;
    dsBang = x.dsBang; bangChon = x.chon; tenBang = x.tenBang; he1904 = x.he1904;
    canhBao.push(...x.canhBao);
  } else {
    const gm = giaiMa(bytes);
    bangMa = gm.bangMa;
    dauPhanCach = chonDauPhanCach(gm.chu);
    dinhDang = dauPhanCach === '\t' ? 'Văn bản ngăn bằng TAB' : 'CSV';
    luoi = tachCsv(gm.chu, dauPhanCach, TRAN_DONG);
  }

  // --- Bỏ các dòng trắng hoàn toàn ở đầu (Excel hay chèn dòng trống/tiêu đề) ---
  while (luoi.length && luoi[0].every(o => String(o).trim() === '')) luoi.shift();

  if (!luoi.length) {
    /* Câu lỗi phải CHỈ ĐƯỜNG, không được cụt (REV-0060 vòng 2 · CAO-⑦b).
       File .xlsx nhiều bảng thì kê tên từng bảng kèm số dòng ra đây — Sếp
       nhìn là biết ngay bảng nào có số liệu để chọn lại. */
    throw new LoiDocBang(keBangRong(dsBang, tenBang) ||
      'File không có dòng nào có dữ liệu — mở lại bằng Excel xem có đúng file cần nạp không.');
  }

  // --- Dòng đầu là TÊN CỘT ---
  const cotTho = luoi[0].map(c => String(c).replace(/^﻿/, '').trim());
  const dong = luoi.slice(1).filter(d => d.some(o => String(o).trim() !== ''));

  if (!dong.length) {
    throw new LoiDocBang(keBangRong(dsBang, tenBang) ||
      'File chỉ có dòng tiêu đề, chưa có dòng dữ liệu nào bên dưới. ' +
      'Kiểm tra lại xem đã xuất đúng file chưa.');
  }

  /* --- Tên cột trùng nhau hoặc để trống ---
     Không được để hai cột cùng tên: lúc Sếp nối cột sẽ không phân biệt được
     cái nào là cái nào. Đánh số cho khác nhau và NÓI RA đã đổi. */
  const cot = [], daDung = new Map();
  cotTho.forEach((c, i) => {
    let ten = c || `(cột ${i + 1} không có tiêu đề)`;
    if (daDung.has(ten)) {
      const lan = daDung.get(ten) + 1;
      daDung.set(ten, lan);
      canhBao.push(`Có ${lan + 1} cột cùng tên “${ten}” — đã đánh số để phân biệt.`);
      ten = `${ten} (${lan + 1})`;
    } else daDung.set(ten, 0);
    cot.push(ten);
  });

  if (cot.length > TRAN_COT) {
    throw new LoiDocBang(`File có ${cot.length} cột — nhiều bất thường. Kiểm tra lại dấu phân cách trong file.`);
  }

  return { cot, dong, bangMa, dinhDang, dauPhanCach, canhBao, tenTep,
           dsBang, bangChon, tenBang, he1904 };
}
