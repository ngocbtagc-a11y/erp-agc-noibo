/* ==========================================================================
   src/nap-du-lieu.js — NẠP FILE SỐ LIỆU VÀO SỔ SÁCH
   ---------------------------------------------------------------------------
   ⚠️ KHÔNG MỘT LƯỢT GỌI AI NÀO TRONG FILE NÀY. Xem đầu `src/doc-bang.js`.

   BỐN LUẬT LÀM NÊN FILE NÀY (đổi cái nào cũng phải hỏi lại Sếp):

   ① MÁY KHÔNG ĐOÁN CỘT NÀO LÀ CỘT NÀO.
      File xuất từ Shopee, từ phần mềm kế toán, từ Excel Sếp tự làm — tên cột
      khác nhau hết. Máy đoán sai MỘT cột là CẢ BẢNG sai, mà lại sai êm: số
      vẫn vào, chỉ vào nhầm ô. Nên máy chỉ GỢI Ý (`goiY`), người CHỌN.
      Chọn xong thì nhớ lại (bảng `nap_ghep_cot`), lần sau tự điền sẵn để Sếp
      chỉ việc xác nhận.

   ② XEM TRƯỚC RỒI MỚI GHI. `xemTruoc()` không ghi một dòng nào vào CSDL. Nó
      trả về: thêm bao nhiêu · sửa bao nhiêu · bỏ qua bao nhiêu · dòng nào lỗi
      và lỗi gì · tốn bao nhiêu lượt ghi. Sếp bấm xác nhận thì `ghiThat()` mới
      chạy.

   ③ TẢI LẠI CÙNG FILE KHÔNG ĐƯỢC NHÂN ĐÔI. Người ta SẼ tải lại — mạng lỗi,
      tưởng chưa xong, hoặc file thêm vài dòng mới. Mọi thứ khớp theo KHOÁ
      TỰ NHIÊN (mã SKU / mã phiếu), đã có thì SỬA, chưa có thì THÊM. Không
      bao giờ chèn mù.

   ④ SAI THÌ NÓI RÕ DÒNG NÀO CỘT NÀO, bằng tiếng người:
        “Dòng 47, cột Số lượng: ghi ‘mười’ — chỗ này cần con số.”
      chứ không phải “parse error at row 47”. Người đọc câu này là chị kế
      toán và anh thủ kho, không phải lập trình viên.
   ========================================================================== */

import { docBang, LoiDocBang } from './doc-bang.js';
import { demGhi, chotNgayLuon, HAN_MUC_NGAY } from './canh-bao-ghi.js';
import { duocSuaSanPham, duocThaoTacKho } from './quyen.js';

/* Chừa lại cho phần còn lại của ngày. Nạp file là việc to, không được ăn hết
   hạn mức rồi để đồng bộ sàn chết đói — đơn hoàn ngừng cập nhật là mất tiền
   thật (xem src/canh-bao-ghi.js). */
const CHUA_LAI = 20000;

/* Ghi theo lô 50 lệnh — đúng nhịp đã dùng ở src/shopee.js:316. Mỗi lô chỉ
   tính MỘT subrequest, và cả lô nằm trong một giao dịch. */
const CO_LO = 50;

/* Trần số lỗi trả về giao diện. Một file hỏng định dạng có thể sinh 20.000
   dòng lỗi — trả hết về là treo trình duyệt của Sếp và chẳng ai đọc nổi.
   Cắt ở 50 và NÓI RÕ còn bao nhiêu nữa. */
const TRAN_LOI_TRA_VE = 50;

/* ⚠️ D1 CHỈ CHO 100 THAM SỐ MỖI CÂU LỆNH.
   Đối chiếu file với CSDL bằng `WHERE ma_sku IN (?, ?, …)`, nên số mã hỏi
   một lượt CHÍNH LÀ số tham số. Vòng đầu đặt 200: chạy ngon trên `node:sqlite`
   ở bàn thử, nhưng lên Worker thật thì D1 ném `too many SQL variables` và cả
   lần nạp chết ngay ở bước XEM TRƯỚC — mà câu lỗi hiện ra lại là câu chung
   chung "không đọc được file", tức là đi tìm sai hướng.
   BÀN THỬ Ở MÁY KHÔNG BẮT ĐƯỢC CA NÀY. Chỉ gọi HTTP thật mới lòi ra.
   Để 90 cho còn chỗ thở. */
const CO_LO_HOI = 90;

/* ==========================================================================
   1. ĐỔI CHỮ TRONG Ô THÀNH GIÁ TRỊ
   ========================================================================== */

/**
 * Đọc một con số kiểu Việt Nam.
 *
 * Chỗ khó: `1.234.567` (Việt Nam) và `1,234,567` (Mỹ) trông khác nhau nhưng ý
 * như nhau, còn `1.234` có thể là "một nghìn hai trăm ba tư" HOẶC "một phẩy
 * hai ba tư". Không có cách nào đúng 100% — nên luật ở đây là:
 *   · Có CẢ dấu chấm và dấu phẩy  -> dấu đứng SAU CÙNG là dấu thập phân.
 *   · Chỉ một loại dấu, và các nhóm sau nó đều đúng 3 chữ số -> dấu ngăn nghìn.
 *   · Còn lại -> dấu thập phân.
 * Luật này đọc đúng mọi ô trong file thật đã thử, và quan trọng hơn: nó
 * ĐOÁN ĐƯỢC TRƯỚC, viết ra được, nên sai thì tra ra ngay.
 */
export function docSo(chu) {
  let s = String(chu ?? '').trim();
  if (!s) return null;

  s = s.replace(/[₫đ]/gi, '').replace(/\s| /g, '');   // bỏ ký hiệu tiền + khoảng trắng
  let am = false;
  if (/^\((.*)\)$/.test(s)) { am = true; s = s.slice(1, -1); }   // (1.234) = âm, lối kế toán
  if (s.startsWith('-')) { am = true; s = s.slice(1); }
  else if (s.startsWith('+')) s = s.slice(1);
  if (!s) return null;

  if (!/^[\d.,]+$/.test(s)) return null;                    // còn chữ cái -> không phải số

  const cham = s.lastIndexOf('.'), phay = s.lastIndexOf(',');
  let nguyen = s, le = '';

  if (cham >= 0 && phay >= 0) {
    const cat = Math.max(cham, phay);
    nguyen = s.slice(0, cat); le = s.slice(cat + 1);
  } else if (cham >= 0 || phay >= 0) {
    const cat = Math.max(cham, phay);
    const dau = s[cat];
    const sau = s.slice(cat + 1);
    const truoc = s.slice(0, cat);
    const chiMotDau = s.split(dau).length === 2;
    // "1.234" -> ngăn nghìn nếu đúng 3 số sau và phần trước ≤ 3 số
    const nhuNganNghin = sau.length === 3 && (!chiMotDau || (truoc.length >= 1 && truoc.length <= 3));
    if (nhuNganNghin) { nguyen = s; le = ''; }
    else { nguyen = truoc; le = sau; }
  }

  nguyen = nguyen.replace(/[.,]/g, '');
  if (!/^\d*$/.test(nguyen) || !/^\d*$/.test(le)) return null;
  if (nguyen === '' && le === '') return null;

  const n = Number((nguyen || '0') + (le ? '.' + le : ''));
  if (!Number.isFinite(n)) return null;
  return am ? -n : n;
}

/**
 * Đọc một ngày. Nhận:
 *   · 2026-09-12            (chuẩn, ưu tiên)
 *   · 12/09/2026, 12-9-2026 (lối Việt Nam: NGÀY trước)
 *   · 45912                 (số ngày của Excel — ô ngày trong .xlsx là SỐ)
 * Trả 'YYYY-MM-DD' hoặc null.
 *
 * ⚠️ `12/09/2026` là 12 tháng 9, KHÔNG phải 9 tháng 12. Đọc theo lối Mỹ là
 * sai hạn sử dụng ba tháng — hàng thực phẩm thì đó là sai chết người.
 */
export function docNgay(chu) {
  const s = String(chu ?? '').trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return ghepNgay(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return ghepNgay(+m[3], +m[2], +m[1]);          // ngày/tháng/năm

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (m) return ghepNgay(2000 + +m[3], +m[2], +m[1]);

  /* Số ngày của Excel: mốc 1899-12-30 (đã tra bằng neo đối chứng 25569 =
     01/01/1970, mốc Unix). Chỉ nhận khoảng 1990–2100, vì hai lý do:
       · Một ô SỐ LƯỢNG lỡ bị ghép nhầm vào cột ngày thì KHÔNG âm thầm hoá
         thành một ngày trông có vẻ hợp lý.
       · Excel có lỗi coi năm 1900 là năm nhuận, nên mọi mốc trước 01/03/1900
         lệch một ngày. Khoảng 1990–2100 nằm xa hẳn vùng lỗi đó. */
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Math.floor(Number(s));
    if (n >= 32874 && n <= 73415) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function ghepNgay(nam, thang, ngay) {
  if (thang < 1 || thang > 12 || ngay < 1 || ngay > 31) return null;
  if (nam < 1900 || nam > 2200) return null;
  const d = new Date(Date.UTC(nam, thang - 1, ngay));
  // Bắt ngày không tồn tại: 31/02 sẽ trôi sang 03/03 -> lệch tháng -> loại
  if (d.getUTCMonth() !== thang - 1 || d.getUTCDate() !== ngay) return null;
  return d.toISOString().slice(0, 10);
}

/** Đọc ô đúng/sai. Nhận cả tiếng Việt lẫn tiếng Anh lẫn 1/0. */
export function docCo(chu, mac = true) {
  const s = String(chu ?? '').trim().toLowerCase();
  if (!s) return mac;
  if (['1', 'x', 'co', 'có', 'true', 'yes', 'y', 'đúng', 'dung'].includes(s)) return true;
  if (['0', '', 'khong', 'không', 'false', 'no', 'n', 'sai'].includes(s)) return false;
  return mac;
}

/* Bỏ dấu tiếng Việt + hạ chữ thường — CHỈ dùng để so tên cột khi gợi ý ghép.
   KHÔNG bao giờ dùng để lưu dữ liệu: tên sản phẩm phải giữ nguyên dấu. */
export function khongDau(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '');
}

/* ==========================================================================
   2. KHAI BÁO ĐÍCH NẠP
   --------------------------------------------------------------------------
   Mỗi đích = một bảng trong ERP + danh sách ô cần điền. `goiY` chỉ để MÁY
   GỢI Ý sẵn cho Sếp nhìn, KHÔNG phải để máy tự quyết (luật ①).
   ========================================================================== */

export const DICH = {
  san_pham: {
    ten: 'Danh mục sản phẩm',
    moTa: 'Mã hàng, tên, đơn vị tính, mức tồn tối thiểu. Nạp cái này trước — mọi thứ khác đều cần có sản phẩm.',
    khoa: 'ma_sku',
    quyen: 'sua_san_pham',
    truong: [
      { ma: 'ma_sku',        nhan: 'Mã hàng (SKU)',      kieu: 'chu',  batBuoc: true,
        goiY: ['masku', 'sku', 'mahang', 'masanpham', 'ma', 'masp', 'itemsku', 'productsku', 'variationsku'] },
      { ma: 'ten',           nhan: 'Tên sản phẩm',       kieu: 'chu',  batBuoc: true,
        goiY: ['tensanpham', 'ten', 'tenhang', 'sanpham', 'productname', 'itemname', 'tenmathang'] },
      { ma: 'danh_muc',      nhan: 'Nhóm hàng',          kieu: 'chu',
        goiY: ['danhmuc', 'nhomhang', 'loai', 'category', 'nganhhang', 'danhmucchuan'] },
      { ma: 'don_vi',        nhan: 'Đơn vị tính',        kieu: 'chu',
        goiY: ['donvi', 'donvitinh', 'dvt', 'unit', 'quycach'] },
      { ma: 'ton_toi_thieu', nhan: 'Tồn tối thiểu',      kieu: 'nguyen_khong_am',
        goiY: ['tontoithieu', 'mucton', 'tonmin', 'dinhmuc', 'minstock', 'canhbao'] },
      { ma: 'theo_doi_hsd',  nhan: 'Theo dõi hạn dùng',  kieu: 'co',
        goiY: ['theodoihsd', 'hsd', 'cohsd', 'quanlylo', 'theodoilo'] }
    ]
  },

  ton_kho: {
    ten: 'Tồn kho đầu kỳ',
    moTa: 'Số lượng đang có trong kho của từng mã hàng. Ghi vào sổ cái thành một phiếu nhập, nên tồn vẫn truy được nguồn gốc.',
    khoa: 'ma_sku',
    quyen: 'thao_tac_kho',
    canSanPham: true,
    truong: [
      { ma: 'ma_sku',      nhan: 'Mã hàng (SKU)',   kieu: 'chu',    batBuoc: true,
        goiY: ['masku', 'sku', 'mahang', 'masanpham', 'ma', 'masp'] },
      /* ⚠️ KHÔNG ÂM, và đây không phải chuyện khó tính cho vui.
         Mỗi dòng ở đây ghi vào sổ cái thành một dòng loại 'nhap'. Một dòng
         "nhập −8" là một phiếu NHẬP làm GIẢM tồn — anh Duy mở sổ ra thấy
         phiếu nhập âm thì không hiểu nổi, mà tồn thì đã sai rồi. File tồn
         đầu kỳ xuất từ phần mềm cũ hay có ô âm do công thức lỗi; thà chặn
         và chỉ rõ dòng nào, còn hơn cho nó chảy êm vào sổ.
         Muốn giảm tồn thì dùng phiếu XUẤT ở màn Kho vận, không phải nạp file. */
      { ma: 'so_luong',    nhan: 'Số lượng tồn',    kieu: 'nguyen_khong_am', batBuoc: true,
        goiY: ['soluong', 'soluongton', 'ton', 'tonkho', 'sl', 'quantity', 'tonhientai'] },
      { ma: 'don_gia',     nhan: 'Đơn giá vốn',     kieu: 'tien',
        goiY: ['dongia', 'giavon', 'gia', 'donggia', 'price', 'giamua', 'gianhap'] },
      { ma: 'so_lo',       nhan: 'Số lô',           kieu: 'chu',
        goiY: ['solo', 'lo', 'malo', 'batch', 'lot'] },
      { ma: 'han_su_dung', nhan: 'Hạn sử dụng',     kieu: 'ngay',
        goiY: ['hansudung', 'hsd', 'handung', 'expiry', 'ngayhethan', 'exp'] },
      { ma: 'doi_tac',     nhan: 'Nhà cung cấp',    kieu: 'chu',
        goiY: ['nhacungcap', 'ncc', 'doitac', 'supplier', 'thuonghieu', 'nhasanxuat'] }
    ]
  }
};

/** Gợi ý ghép cột: so tên cột trong file với `goiY` của từng ô ERP. */
export function goiYGhep(cotFile, maDich) {
  const dich = DICH[maDich];
  if (!dich) return {};
  const ghep = {};
  const daDung = new Set();

  for (const t of dich.truong) {
    const nhanChuan = khongDau(t.nhan);
    let tot = null, diemTot = 0;
    cotFile.forEach((c, i) => {
      if (daDung.has(i)) return;
      const k = khongDau(c);
      if (!k) return;
      let diem = 0;
      if (k === nhanChuan) diem = 100;
      else if (t.goiY.includes(k)) diem = 90;
      else if (t.goiY.some(g => k === g)) diem = 90;
      else if (t.goiY.some(g => g.length >= 4 && k.startsWith(g))) diem = 70;
      else if (t.goiY.some(g => g.length >= 5 && k.includes(g))) diem = 55;
      if (diem > diemTot) { diemTot = diem; tot = i; }
    });
    if (tot !== null && diemTot >= 55) { ghep[t.ma] = tot; daDung.add(tot); }
  }
  return ghep;
}

/* ==========================================================================
   3. ĐỌC + KIỂM TỪNG Ô
   ========================================================================== */

/** Đọc một ô theo kiểu đã khai. Trả `{v}` nếu được, `{loi}` nếu không. */
function docO(tho, truong) {
  const s = String(tho ?? '').trim();

  if (!s) {
    if (truong.batBuoc) return { loi: `để trống — chỗ này bắt buộc phải có` };
    return { v: null };
  }

  switch (truong.kieu) {
    case 'chu':
      if (s.length > 300) return { loi: `dài ${s.length} ký tự — quá dài, tối đa 300` };
      return { v: s };

    case 'co':
      return { v: docCo(s) };

    case 'nguyen':
    case 'nguyen_khong_am': {
      const n = docSo(s);
      if (n === null) return { loi: `ghi “${catNgan(s)}” — chỗ này cần con số` };
      if (!Number.isInteger(n)) return { loi: `ghi “${catNgan(s)}” — chỗ này cần số nguyên, không có phần lẻ` };
      if (truong.kieu === 'nguyen_khong_am' && n < 0) {
        return { loi: `ghi “${catNgan(s)}” — số này không được âm. ` +
                      `Nếu cần giảm tồn thì lập phiếu Xuất kho, đừng ghi số âm vào file` };
      }
      if (Math.abs(n) > 1e9) return { loi: `ghi “${catNgan(s)}” — con số lớn bất thường, kiểm tra lại` };
      return { v: n };
    }

    case 'tien': {
      const n = docSo(s);
      if (n === null) return { loi: `ghi “${catNgan(s)}” — chỗ này cần con số tiền` };
      if (n < 0) return { loi: `ghi “${catNgan(s)}” — giá tiền không được âm` };
      if (n > 1e11) return { loi: `ghi “${catNgan(s)}” — số tiền lớn bất thường, kiểm tra lại` };
      return { v: Math.round(n) };
    }

    case 'ngay': {
      const d = docNgay(s);
      if (!d) return { loi: `ghi “${catNgan(s)}” — chưa đúng kiểu ngày. Xin ghi dạng 31/12/2026 hoặc 2026-12-31` };
      return { v: d };
    }

    default:
      return { v: s };
  }
}

const catNgan = s => (String(s).length > 40 ? String(s).slice(0, 40) + '…' : String(s));

/**
 * Chạy toàn bộ lưới qua bảng ghép cột -> ra danh sách bản ghi sạch + lỗi.
 * KHÔNG đụng CSDL. Thuần tuý, nên bàn thử gọi thẳng được.
 *
 * @param {{cot:string[],dong:string[][]}} bang  kết quả `docBang`
 * @param {Object<string,number>} ghep           { ma_truong: chi_so_cot }
 * @param {string} maDich
 */
export function kiemBang(bang, ghep, maDich) {
  const dich = DICH[maDich];
  if (!dich) throw new LoiDocBang('Không rõ nạp vào đâu — chọn lại loại dữ liệu.');

  // --- Ô bắt buộc đã được ghép chưa? ---
  const thieu = dich.truong.filter(t => t.batBuoc && !(t.ma in ghep) ).map(t => t.nhan);
  if (thieu.length) {
    throw new LoiDocBang(
      `Chưa chọn cột cho: ${thieu.join(', ')}. ` +
      `Đây là ô bắt buộc — xin chọn cột tương ứng trong file rồi xem lại.`);
  }
  for (const [ma, ci] of Object.entries(ghep)) {
    if (ci !== null && ci !== undefined && (ci < 0 || ci >= bang.cot.length)) {
      throw new LoiDocBang(`Cột đã chọn cho “${ma}” không còn trong file — xin chọn lại.`);
    }
  }

  const truongDung = dich.truong.filter(t => t.ma in ghep && ghep[t.ma] !== null && ghep[t.ma] !== undefined);
  const banGhi = [];
  const loi = [];
  const daThay = new Map();          // khoá -> số dòng đầu tiên gặp
  let soTrung = 0;

  bang.dong.forEach((dong, i) => {
    const soDongFile = i + 2;        // +1 vì bỏ tiêu đề, +1 vì người đếm từ 1
    const ban = {};
    let hongDong = false;

    for (const t of truongDung) {
      const ci = ghep[t.ma];
      /* Dòng thiếu ô: file thật hay có dòng cuối cụt, hoặc ô cuối trống bị
         Excel lược mất. Coi như ô rỗng — rồi để luật `batBuoc` phán, chứ
         không tự ý báo hỏng cả dòng. */
      const tho = ci < dong.length ? dong[ci] : '';
      const kq = docO(tho, t);
      if (kq.loi) {
        loi.push({ dong: soDongFile, cot: t.nhan, thongDiep: `Dòng ${soDongFile}, cột ${t.nhan}: ${kq.loi}.` });
        hongDong = true;
      } else ban[t.ma] = kq.v;
    }

    if (hongDong) return;

    // --- Trùng khoá NGAY TRONG CÙNG MỘT FILE ---
    const khoa = String(ban[dich.khoa] ?? '').trim().toUpperCase();
    if (!khoa) return;               // đã bị bắt ở luật batBuoc phía trên
    if (daThay.has(khoa)) {
      soTrung++;
      loi.push({
        dong: soDongFile, cot: 'Mã hàng',
        thongDiep: `Dòng ${soDongFile}: mã “${khoa}” đã xuất hiện ở dòng ${daThay.get(khoa)} trong chính file này. ` +
                   `Chỉ dòng đầu tiên được dùng — xin gộp lại trong file rồi nạp lần nữa.`
      });
      return;
    }
    daThay.set(khoa, soDongFile);

    ban.__khoa = khoa;
    ban.__dong = soDongFile;
    banGhi.push(ban);
  });

  return { banGhi, loi, soTrung, soDongDoc: bang.dong.length };
}

/* ==========================================================================
   4. XEM TRƯỚC — không ghi một dòng nào
   ========================================================================== */

/* ---- Giá của một lượt ghi, tính bằng "dòng D1" --------------------------
   D1 tính CẢ DÒNG CHỈ MỤC, nên một INSERT vào bảng có 2 chỉ mục ăn 3 lượt.
   Mấy con số dưới đây KHÔNG phải đoán: chúng được ĐO bằng
   `npm run do-nap-ghi` trên CSDL dựng từ đúng migrations của repo, và bàn
   đo đó CHẶN LẠI nếu con số ở đây thấp hơn con số thật.

   ⚠️ Vì sao phải canh: chốt chặn hạn mức đứng trên con số DỰ TÍNH. Dự tính
   thấp hơn thật thì chốt chặn thành vô dụng — nó cho file đi qua rồi file
   đó ăn gấp đôi hạn mức. Vòng đo đầu tiên đặt nhầm 3 (thật là 7), tức là
   hụt 2,3 lần. Đổi bảng/chỉ mục thì chạy lại bàn đo và sửa số ở đây.

   ⚠️ CÓ HAI CON SỐ, VÀ PHẢI LẤY CON SỐ LỚN HƠN.
   Bàn đo ở máy (`node:sqlite`, dựng từ migrations) đo được 7 lượt/dòng cho
   `san_pham`. Nhưng đo TRÊN WORKER THẬT với D1 thật thì ra 8 lượt/dòng —
   CSDL thật có thêm chỉ mục mà bàn đo ở máy chưa dựng hết. Lấy số của bàn đo
   ở máy là dự tính HỤT 1 lượt mỗi dòng, tức hụt 800 lượt cho một file 800
   dòng. Nên lấy số đo THẬT rồi cộng thêm một chút đệm. */
const GIA_GHI = {
  san_pham:      { them: 9, sua_co_ban: 4, moi_truong_doi: 5 },
  ton_kho:       { them: 10, sua_co_ban: 0, moi_truong_doi: 0 }
};
/* Giữ tên cũ cho bàn đo bóc ra đối chiếu — đây là mức ghi của MỘT DÒNG THÊM. */
const GHI_MOI_DONG = { san_pham: GIA_GHI.san_pham.them, ton_kho: GIA_GHI.ton_kho.them };

/* Dự tính lượt ghi cho cả lần nạp. Tính riêng dòng THÊM và dòng SỬA, vì một
   dòng sửa 5 ô tốn gấp mấy lần một dòng sửa 1 ô (mỗi ô đổi là một dòng ghi
   vết). Tính gộp theo đầu dòng là chỗ dễ hụt nhất. */
export function duTinhGhi(maDich, them, sua) {
  const g = GIA_GHI[maDich] || GIA_GHI.san_pham;
  let tong = them.length * g.them;
  for (const b of sua) {
    if (b.__khoaCu) continue;                       // mã đã khoá thì không ghi
    const soDoi = Object.keys(b.__doi || {}).length;
    tong += g.sua_co_ban + soDoi * g.moi_truong_doi;
  }
  if (maDich === 'ton_kho' && them.length) tong += 4;   // một dòng ghi vết cho cả phiếu
  return tong;
}

async function conLaiTrongNgay(env) {
  const ngay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  try {
    const d = await env.DB.prepare('SELECT so_dong FROM d1_ghi_ngay WHERE ngay = ?').bind(ngay).first();
    return Math.max(0, HAN_MUC_NGAY - (d?.so_dong || 0));
  } catch {
    return HAN_MUC_NGAY;             // chưa nạp migration -> đừng chặn oan
  }
}

/**
 * Đối chiếu với CSDL: dòng nào THÊM mới, dòng nào SỬA, dòng nào GIỮ NGUYÊN.
 * Chỉ ĐỌC. Đọc D1 rẻ (5 triệu lượt/ngày) nên thoải mái đối chiếu kỹ.
 */
async function doiChieuSanPham(env, banGhi) {
  const them = [], sua = [], boQua = [];
  for (let i = 0; i < banGhi.length; i += CO_LO_HOI) {
    const lo = banGhi.slice(i, i + CO_LO_HOI);
    const dau = lo.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id, ma_sku, ten, danh_muc, don_vi, ton_toi_thieu, theo_doi_hsd, trang_thai
         FROM san_pham WHERE ma_sku IN (${dau})`
    ).bind(...lo.map(b => b.__khoa)).all();
    const co = new Map((results || []).map(r => [r.ma_sku, r]));

    for (const b of lo) {
      const cu = co.get(b.__khoa);
      if (!cu) { them.push(b); continue; }
      b.__id = cu.id;
      /* So từng ô ĐÃ ĐƯỢC GHÉP thôi. Cột Sếp không ghép thì giữ nguyên giá
         trị cũ — nạp file thiếu cột KHÔNG được xoá trắng dữ liệu đang có. */
      const doi = {};
      if ('ten' in b && b.ten !== null && b.ten !== cu.ten) doi.ten = [cu.ten, b.ten];
      if ('danh_muc' in b && b.danh_muc !== null && b.danh_muc !== cu.danh_muc) doi.danh_muc = [cu.danh_muc, b.danh_muc];
      if ('don_vi' in b && b.don_vi !== null && b.don_vi !== cu.don_vi) doi.don_vi = [cu.don_vi, b.don_vi];
      if ('ton_toi_thieu' in b && b.ton_toi_thieu !== null && b.ton_toi_thieu !== cu.ton_toi_thieu)
        doi.ton_toi_thieu = [cu.ton_toi_thieu, b.ton_toi_thieu];
      if ('theo_doi_hsd' in b && b.theo_doi_hsd !== null && (b.theo_doi_hsd ? 1 : 0) !== cu.theo_doi_hsd)
        doi.theo_doi_hsd = [cu.theo_doi_hsd, b.theo_doi_hsd ? 1 : 0];

      b.__doi = doi;
      b.__khoaCu = cu.trang_thai === 'da_khoa';
      if (!Object.keys(doi).length) boQua.push(b);      // y hệt -> KHÔNG ghi
      else sua.push(b);
    }
  }
  return { them, sua, boQua };
}

async function doiChieuTonKho(env, banGhi) {
  const them = [], boQua = [], thieuSp = [];
  for (let i = 0; i < banGhi.length; i += CO_LO_HOI) {
    const lo = banGhi.slice(i, i + CO_LO_HOI);
    const dau = lo.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id, ma_sku, ten, theo_doi_hsd FROM san_pham WHERE ma_sku IN (${dau})`
    ).bind(...lo.map(b => b.__khoa)).all();
    const co = new Map((results || []).map(r => [r.ma_sku, r]));

    for (const b of lo) {
      const sp = co.get(b.__khoa);
      if (!sp) { thieuSp.push(b); continue; }
      b.__spId = sp.id;
      b.__theoDoiHsd = sp.theo_doi_hsd;
      if (b.so_luong === 0) { boQua.push(b); continue; }
      them.push(b);
    }
  }
  return { them, sua: [], boQua, thieuSp };
}

/**
 * Xem trước một lần nạp. KHÔNG GHI GÌ.
 * @returns bảng tóm tắt để giao diện hiện cho Sếp bấm xác nhận.
 */
export async function xemTruoc(env, phien, { bang, ghep, maDich, vanTay }) {
  const dich = DICH[maDich];
  const { banGhi, loi, soTrung, soDongDoc } = kiemBang(bang, ghep, maDich);

  let doiChieu, thieuSp = [];
  if (maDich === 'ton_kho') {
    const r = await doiChieuTonKho(env, banGhi);
    doiChieu = r; thieuSp = r.thieuSp;
    for (const b of thieuSp.slice(0, TRAN_LOI_TRA_VE)) {
      loi.push({
        dong: b.__dong, cot: 'Mã hàng',
        thongDiep: `Dòng ${b.__dong}: chưa có mã hàng “${b.__khoa}” trong ERP. ` +
                   `Xin nạp Danh mục sản phẩm trước, rồi nạp lại tồn kho.`
      });
    }
  } else {
    doiChieu = await doiChieuSanPham(env, banGhi);
  }

  const soThem = doiChieu.them.length;
  const soSua = doiChieu.sua.length;
  const soBoQua = doiChieu.boQua.length;

  // --- Dự tính lượt ghi + chặn nếu vượt hạn mức ---
  const ghiDuTinh = duTinhGhi(maDich, doiChieu.them, doiChieu.sua);
  const conLai = await conLaiTrongNgay(env);
  const nguongChan = Math.max(0, conLai - CHUA_LAI);
  const vuotHanMuc = ghiDuTinh > nguongChan;

  // --- Khoá dữ liệu: mã đã "Hoàn tất" thì không cho file ghi đè ---
  const daKhoa = doiChieu.sua.filter(b => b.__khoaCu);

  return {
    ok: true,
    dich: { ma: maDich, ten: dich.ten },
    tep: { ten: bang.tenTep, bang_ma: bang.bangMa, dinh_dang: bang.dinhDang },
    so_dong_doc: soDongDoc,
    so_them: soThem,
    so_sua: soSua,
    so_bo_qua: soBoQua,
    so_trung_trong_file: soTrung,
    so_dong_loi: loi.length,
    loi: loi.slice(0, TRAN_LOI_TRA_VE),
    loi_con_lai: Math.max(0, loi.length - TRAN_LOI_TRA_VE),
    da_khoa: daKhoa.length,
    canh_bao: bang.canhBao || [],
    ghi_du_tinh: ghiDuTinh,
    ghi_con_lai_hom_nay: conLai,
    vuot_han_muc: vuotHanMuc,
    loi_han_muc: vuotHanMuc
      ? `File này cần khoảng ${ghiDuTinh.toLocaleString('vi-VN')} lượt ghi, ` +
        `mà hôm nay chỉ còn ${nguongChan.toLocaleString('vi-VN')} lượt dùng được ` +
        `(đã chừa ${CHUA_LAI.toLocaleString('vi-VN')} lượt cho đồng bộ đơn hoàn Shopee/TikTok). ` +
        `Xin chia nhỏ file, hoặc nạp tiếp vào ngày mai.`
      : null,
    van_tay: vanTay,
    // Xem thử 5 dòng đầu để Sếp đối chiếu bằng mắt trước khi bấm
    mau: doiChieu.them.slice(0, 5).map(b => ({ dong: b.__dong, ...sachDeHien(b) }))
  };
}

function sachDeHien(b) {
  const o = {};
  for (const [k, v] of Object.entries(b)) if (!k.startsWith('__')) o[k] = v;
  return o;
}

/* ==========================================================================
   5. GHI THẬT
   ========================================================================== */

/**
 * Ghi vào CSDL. Chỉ gọi SAU khi Sếp đã xem `xemTruoc` và bấm xác nhận.
 * Đếm lượt ghi THẬT bằng `demGhi` (đọc `meta.rows_written` do chính D1 trả).
 */
export async function ghiThat(env, phien, { bang, ghep, maDich, tenTep }) {
  const dich = DICH[maDich];
  if (maDich === 'san_pham' && !duocSuaSanPham(phien)) {
    return { loi: 'Bạn không có quyền nạp danh mục sản phẩm', ma: 403 };
  }
  if (maDich === 'ton_kho' && !duocThaoTacKho(phien)) {
    return { loi: 'Bạn không có quyền nạp tồn kho', ma: 403 };
  }

  const { banGhi, loi } = kiemBang(bang, ghep, maDich);

  const doiChieu = maDich === 'ton_kho'
    ? await doiChieuTonKho(env, banGhi)
    : await doiChieuSanPham(env, banGhi);

  // Chặn lần nữa ở đây, không tin mỗi bước xem trước (người dùng có thể để
  // màn hình xem trước qua đêm rồi mới bấm, lúc đó hạn mức đã khác).
  const ghiDuTinh = duTinhGhi(maDich, doiChieu.them, doiChieu.sua);
  const conLai = await conLaiTrongNgay(env);
  if (ghiDuTinh > Math.max(0, conLai - CHUA_LAI)) {
    return {
      loi: `Hôm nay không còn đủ lượt ghi để nạp file này (cần khoảng ${ghiDuTinh.toLocaleString('vi-VN')}). ` +
           `Xin chia nhỏ file hoặc nạp lại vào ngày mai.`,
      ma: 429
    };
  }

  const lenh = [];
  const nguoiTen = phien?.ho_ten || phien?.ten_dang_nhap || 'Không rõ';
  const lyDo = `Nạp từ file “${String(tenTep || 'không rõ tên').slice(0, 80)}”`;

  const ghiVet = env.DB.prepare(
    `INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                       nguoi_id, nguoi_ten, ly_do, luc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))`
  );

  if (maDich === 'san_pham') {
    const themSP = env.DB.prepare(`
      INSERT INTO san_pham (id, ma_sku, ten, danh_muc, don_vi, theo_doi_hsd, ton_toi_thieu)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const b of doiChieu.them) {
      const id = 'sp_' + crypto.randomUUID().slice(0, 12);
      lenh.push(themSP.bind(
        id, b.__khoa, b.ten,
        b.danh_muc ?? null,
        b.don_vi || 'sản phẩm',
        b.theo_doi_hsd === null || b.theo_doi_hsd === undefined ? 1 : (b.theo_doi_hsd ? 1 : 0),
        b.ton_toi_thieu ?? 0
      ));
      lenh.push(ghiVet.bind('san_pham', String(id), 'nap_file', null, b.__khoa,
                            phien.nhan_su_id, nguoiTen, lyDo));
    }

    for (const b of doiChieu.sua) {
      /* Mã đã khoá ("Hoàn tất") thì file KHÔNG được ghi đè. Khoá là quyết
         định của Kinh doanh, một file tải lên không được lặng lẽ phá nó. */
      if (b.__khoaCu) continue;
      const dat = [], giaTri = [];
      for (const [truong, [, moi]] of Object.entries(b.__doi)) {
        dat.push(`${truong} = ?`);
        giaTri.push(truong === 'theo_doi_hsd' ? (moi ? 1 : 0) : moi);
      }
      if (!dat.length) continue;
      lenh.push(env.DB.prepare(`UPDATE san_pham SET ${dat.join(', ')} WHERE id = ?`).bind(...giaTri, b.__id));
      for (const [truong, [cu, moi]] of Object.entries(b.__doi)) {
        lenh.push(ghiVet.bind('san_pham', String(b.__id), truong,
                              cu === null || cu === undefined ? null : String(cu),
                              moi === null || moi === undefined ? null : String(moi),
                              phien.nhan_su_id, nguoiTen, lyDo));
      }
    }
  } else {
    /* TỒN KHO: ghi vào SỔ CÁI thành một phiếu nhập, không đặt thẳng con số
       tồn. Đúng nguyên tắc của module kho — tồn luôn là tổng của sổ cái,
       không bao giờ là con số rời cộng trừ tay. */
    const phieuId = 'pn_' + crypto.randomUUID().slice(0, 12);
    const themLo = env.DB.prepare(
      'INSERT INTO lo_hang (id, san_pham_id, so_lo, han_su_dung) VALUES (?, ?, ?, ?)');
    const themGd = env.DB.prepare(`
      INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, don_gia, doi_tac, ghi_chu, nguoi_id)
      VALUES (?, ?, ?, 'nhap', ?, ?, ?, ?, ?)
    `);
    for (const b of doiChieu.them) {
      let loId = null;
      if (b.__theoDoiHsd && (b.so_lo || b.han_su_dung)) {
        loId = 'lo_' + crypto.randomUUID().slice(0, 12);
        lenh.push(themLo.bind(loId, b.__spId, b.so_lo || null, b.han_su_dung || null));
      }
      lenh.push(themGd.bind(phieuId, b.__spId, loId, b.so_luong, b.don_gia ?? null,
                            b.doi_tac || null, lyDo, phien.nhan_su_id));
    }
    if (doiChieu.them.length) {
      lenh.push(ghiVet.bind('giao_dich_kho', String(phieuId), 'nap_file', null,
                            `${doiChieu.them.length} dòng`, phien.nhan_su_id, nguoiTen, lyDo));
    }
  }

  // --- Ghi theo lô, đếm lượt ghi THẬT ---
  let ghiThuc = 0;
  for (let i = 0; i < lenh.length; i += CO_LO) {
    const kq = await env.DB.batch(lenh.slice(i, i + CO_LO));
    demGhi(kq);
    for (const r of (Array.isArray(kq) ? kq : [kq])) {
      const n = r?.meta?.rows_written;
      if (typeof n === 'number' && n > 0) ghiThuc += n;
    }
  }

  /* ⚠️ CHỐT SỔ NGAY, KHÔNG ĐỢI CRON.
     `demGhi` ở trên chỉ cộng vào bộ nhớ của isolate đang chạy, mà cron chốt
     sổ lại chạy ở isolate khác — số này gần như không bao giờ tới được sổ
     ngày. Không chốt ngay thì màn xem trước của lần nạp SAU vẫn báo "hôm nay
     còn 100.000 lượt" dù vừa đốt 40.000, và chốt chặn hạn mức thành đồ trang
     trí. Xem chú thích dài ở `chotNgayLuon` trong src/canh-bao-ghi.js. */
  let conLaiSau = null;
  if (ghiThuc > 0) {
    const chot = await chotNgayLuon(env, ghiThuc);
    if (chot) conLaiSau = Math.max(0, HAN_MUC_NGAY - chot.so_dong);
  }

  return {
    ok: true,
    da_them: doiChieu.them.length,
    da_sua: doiChieu.sua.filter(b => !b.__khoaCu).length,
    bo_qua: doiChieu.boQua.length,
    bo_vi_khoa: (doiChieu.sua || []).filter(b => b.__khoaCu).length,
    dong_loi: loi.length,
    so_lenh: lenh.length,
    luot_ghi_that: ghiThuc,
    ghi_con_lai_hom_nay: conLaiSau
  };
}

/* ==========================================================================
   6. NHỚ BẢNG GHÉP CỘT
   --------------------------------------------------------------------------
   Vì sao phải có bảng riêng (`nap_ghep_cot`): ERP chưa có bảng cấu hình
   dùng chung nào để gửi nhờ. Bảng này ĐÚNG MỘT DÒNG cho mỗi (đích + dạng
   file), nên cả đời cũng chỉ vài chục dòng — không phải nguồn ghi đáng lo.
   Ghi vết vẫn dùng `lich_su_thay_doi_nen` sẵn có, KHÔNG đẻ bảng mới cho nó.

   "Dạng file" nhận diện bằng danh sách tên cột đã sắp xếp rồi băm lại
   (`vanTayCot`) — cùng một loại file xuất ra thì tên cột giống nhau, kể cả
   khi thứ tự dòng khác.
   ========================================================================== */

export async function vanTayCot(cot) {
  const chu = cot.map(c => khongDau(c)).sort().join('|');
  const bam = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chu));
  return [...new Uint8Array(bam)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function nhoGhep(env, maDich, vanTay, ghep, phien) {
  try {
    await env.DB.prepare(`
      INSERT INTO nap_ghep_cot (van_tay, ma_dich, ghep_json, nguoi_id, luc)
      VALUES (?, ?, ?, ?, datetime('now','+7 hours'))
      ON CONFLICT(van_tay, ma_dich) DO UPDATE SET
        ghep_json = excluded.ghep_json, nguoi_id = excluded.nguoi_id, luc = excluded.luc
    `).bind(vanTay, maDich, JSON.stringify(ghep), phien?.nhan_su_id || null).run();
  } catch (e) {
    // Nhớ được thì tiện, không nhớ được cũng KHÔNG được làm hỏng lần nạp.
    console.error('Nhớ bảng ghép cột:', e.message);
  }
}

export async function ghepDaNho(env, maDich, vanTay) {
  try {
    const d = await env.DB.prepare(
      'SELECT ghep_json FROM nap_ghep_cot WHERE van_tay = ? AND ma_dich = ?'
    ).bind(vanTay, maDich).first();
    return d ? JSON.parse(d.ghep_json) : null;
  } catch { return null; }
}

/* ==========================================================================
   7. CỬA CHÍNH CHO index.js
   ========================================================================== */

/* Đọc file thành lưới ô. Bọc lại `docBang` để index.js chỉ phải nhập MỘT
   mô-đun (`nap-du-lieu.js`) thay vì hai. */
export async function docBangTuByte(bytes, tenTep) {
  return docBang(bytes, tenTep);
}

/** Bước 1 — đọc file, trả tên cột + gợi ý ghép + (nếu đã nhớ) xem trước luôn. */
export async function moFile(env, phien, bytes, tenTep, maDich) {
  const bang = await docBang(bytes, tenTep);
  const vanTay = await vanTayCot(bang.cot);
  const daNho = await ghepDaNho(env, maDich, vanTay);
  const ghep = daNho || goiYGhep(bang.cot, maDich);

  const dich = DICH[maDich];
  const duGhep = dich.truong.filter(t => t.batBuoc).every(t => t.ma in ghep);

  return {
    ok: true,
    tep: { ten: tenTep, bang_ma: bang.bangMa, dinh_dang: bang.dinhDang, so_dong: bang.dong.length },
    cot: bang.cot,
    mau_dong: bang.dong.slice(0, 3),
    ghep,
    da_nho: !!daNho,
    du_de_xem_truoc: duGhep,
    van_tay: vanTay,
    canh_bao: bang.canhBao,
    truong: dich.truong.map(t => ({ ma: t.ma, nhan: t.nhan, bat_buoc: !!t.batBuoc, kieu: t.kieu }))
  };
}
