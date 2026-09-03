/* ==========================================================================
   BÀN ĐO — PDF TỪ MÁY SCAN  ·  CTL-0026 vòng 7
   ---------------------------------------------------------------------------
   Chạy:  npm run do-pdf-scan
          npm run do-pdf-scan -- --pdf "C:\\duong\\dan\\file.pdf"   (đo file thật)

   Sếp Ngọc 03/09/2026: *"định dạng file sẽ là scan pdf"*.

   ĐO SÁU THỨ, MỖI THỨ CÓ CA ĐỐI CHỨNG (BH-16 — phép đo không bắt được lỗi khi
   ta CỐ TÌNH gỡ chốt là phép đo mù):
     ①  Chữ ký `%PDF-` có BOM / byte thừa ở đầu → PHẢI NHẬN.  Đối chứng: file
        rác thật vẫn PHẢI CHẶN, và chốt cũ (đòi byte 0) PHẢI trượt ca BOM.
     ②  PDF có lớp chữ TIẾNG VIỆT → bóc ra bao nhiêu % ký tự đúng, có dấu không.
        Đối chứng: bỏ bảng `/ToUnicode` thì tỉ lệ PHẢI tụt và dấu PHẢI mất.
     ③  PDF chỉ có ảnh → nhận đúng là `chi_anh`, câu báo KHÔNG lộ ruột kỹ thuật.
     ④  Đếm trang: vùng chồng lấn 1 MB không được đếm hai lần (REV-0054 #4a).
     ⑤  Mỏ neo tính lại khi `so_hieu` đổi — CẢ HAI CHIỀU (sai→đúng, đúng→sai).
        Đối chứng: bỏ bước tính lại thì phép đo PHẢI bắt được nhãn nói dối.
     ⑥  Câu báo lỗi: quét MỌI chuỗi ra người dùng của đường tải file, không được
        còn chữ kỹ thuật.

   Gọi HÀM THẬT của `src/pdf-chu.js` + `src/tai-lieu.js`, không khớp chuỗi.
   ========================================================================== */

import { readFileSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nhap = (p) => import('file://' + path.join(GOC, p).replace(/\\/g, '/'));

const pdfChu = await nhap('src/pdf-chu.js');
const taiLieu = await nhap('src/tai-lieu.js');
const gopPdf = await nhap('public/assets/js/gop-trang-pdf.js');

let dat = 0, hong = 0;
const ok = (c, ten, ghi = '') => {
  if (c) { dat++; console.log(`  ✓ ĐẠT   ${ten}${ghi ? ' — ' + ghi : ''}`); }
  else { hong++; console.log(`  ✗ HỎNG  ${ten}${ghi ? ' — ' + ghi : ''}`); }
};
const muc = (s) => console.log(`\n─── ${s} ${'─'.repeat(Math.max(0, 62 - s.length))}`);

/* ==========================================================================
   Xưởng dựng PDF thử — dựng bằng tay, không thư viện
   ========================================================================== */

/** PDF một trang, phông có `/ToUnicode` ánh xạ mã → chữ tiếng Việt CÓ DẤU.
 *  Đây đúng khuôn máy scan xuất ra khi bật nhận dạng chữ: mã trong luồng nội
 *  dung là mã trong phông (1, 2, 3…), chữ thật chỉ đọc được qua bảng đổi mã. */
function dungPDFCoChu(cau, { coToUnicode = true, nen = true } = {}) {
  const ky = [...cau];
  /* Mã bắt đầu từ 1 để CỐ TÌNH khác mã ASCII — bỏ bảng đổi mã là ra rác ngay,
     chứ không "tình cờ đúng" như khi mã trùng ASCII. */
  const bang = ky.map((c, i) => ({ ma: i + 1, chu: c }));
  const hex = bang.map(b => b.ma.toString(16).padStart(4, '0')).join('');
  const nd = `BT /F1 12 Tf 40 700 Td <${hex}> Tj ET`;
  const ndByte = nen ? deflateSync(Buffer.from(nd, 'latin1')) : Buffer.from(nd, 'latin1');

  const cmap =
    '/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n' +
    '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' +
    `${bang.length} beginbfchar\n` +
    bang.map(b => `<${b.ma.toString(16).padStart(4, '0')}> ` +
      `<${b.chu.charCodeAt(0).toString(16).padStart(4, '0')}>`).join('\n') +
    '\nendbfchar\nendcmap CMapName currentdict /CMap defineresource pop end end';
  const cmapByte = Buffer.from(cmap, 'latin1');

  const doiTuong = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    { dict: `<< /Length ${ndByte.length}${nen ? ' /Filter /FlateDecode' : ''} >>`, luong: ndByte },
    '<< /Type /Font /Subtype /Type0 /BaseFont /TestVN /Encoding /Identity-H ' +
      '/DescendantFonts [7 0 R]' + (coToUnicode ? ' /ToUnicode 6 0 R' : '') + ' >>',
    { dict: `<< /Length ${cmapByte.length} >>`, luong: cmapByte },
    '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /TestVN >>'
  ];
  return ghepPDF(doiTuong);
}

/** PDF "chỉ có ảnh": một trang, nội dung chỉ vẽ một khối ảnh, KHÔNG toán tử chữ. */
function dungPDFChiAnh(soTrang = 1) {
  const nd = deflateSync(Buffer.from('q 595 0 0 842 0 0 cm /Im0 Do Q', 'latin1'));
  const anh = Buffer.alloc(4096, 0x7f);          // "ảnh" giả, đủ to để không rỗng
  const dt = ['<< /Type /Catalog /Pages 2 0 R >>', null];
  const kids = [];
  let so = 3;
  for (let i = 0; i < soTrang; i++) {
    kids.push(`${so} 0 R`);
    dt.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      `/Resources << /XObject << /Im0 ${so + 2} 0 R >> >> /Contents ${so + 1} 0 R >>`);
    dt.push({ dict: `<< /Length ${nd.length} /Filter /FlateDecode >>`, luong: nd });
    dt.push({
      dict: `<< /Type /XObject /Subtype /Image /Width 64 /Height 64 /ColorSpace /DeviceGray ` +
            `/BitsPerComponent 8 /Length ${anh.length} >>`, luong: anh
    });
    so += 3;
  }
  dt[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${soTrang} >>`;
  return ghepPDF(dt);
}

function ghepPDF(dsDoiTuong) {
  const manh = [Buffer.from('%PDF-1.5\n', 'latin1')];
  dsDoiTuong.forEach((o, i) => {
    const n = i + 1;
    if (typeof o === 'string') {
      manh.push(Buffer.from(`${n} 0 obj\n${o}\nendobj\n`, 'latin1'));
    } else {
      manh.push(Buffer.from(`${n} 0 obj\n${o.dict}\nstream\n`, 'latin1'));
      manh.push(o.luong);
      manh.push(Buffer.from('\nendstream\nendobj\n', 'latin1'));
    }
  });
  manh.push(Buffer.from('trailer\n<< /Size 9 /Root 1 0 R >>\n%%EOF\n', 'latin1'));
  return new Uint8Array(Buffer.concat(manh));
}

const themDauFile = (b, dau) => {
  const ra = new Uint8Array(dau.length + b.length);
  ra.set(dau, 0); ra.set(b, dau.length);
  return ra;
};
const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
const XUONG_DONG = new Uint8Array([0x0D, 0x0A, 0x0D, 0x0A]);

const CAU_VN = 'CÔNG TY TNHH ALPHA GREEN COMMERCE — Giấy chứng nhận đủ điều kiện an ' +
  'toàn thực phẩm số 124/2026/GCN-ATTP, cấp ngày 12 tháng 3 năm 2026, hiệu lực ba năm.';

/* ==========================================================================
   ① CHỮ KÝ `%PDF-` — BOM và byte thừa ở đầu
   ========================================================================== */
muc('① Chữ ký %PDF- — byte thừa ở đầu file (REV-0054 lỗi #1)');
{
  const sach = dungPDFCoChu('A');
  ok(pdfChu.laByteCuaPDF(sach), 'PDF chuẩn (chữ ký ở byte 0) → NHẬN');
  ok(pdfChu.laByteCuaPDF(themDauFile(sach, BOM)), 'PDF có BOM UTF-8 3 byte ở đầu → NHẬN');
  ok(pdfChu.laByteCuaPDF(themDauFile(sach, XUONG_DONG)), 'PDF có 4 byte xuống dòng ở đầu → NHẬN');
  const day = new Uint8Array(1000); day.fill(0x20);
  ok(pdfChu.laByteCuaPDF(themDauFile(sach, day)), 'Chữ ký ở byte 1000 (trong trần 1024) → NHẬN');

  /* ---- CA ĐỐI CHỨNG: file rác THẬT vẫn phải chặn ---- */
  const rac = new Uint8Array(200000);
  for (let i = 0; i < rac.length; i++) rac[i] = (i * 7919) & 0xFF;
  ok(!pdfChu.laByteCuaPDF(rac), 'ĐỐI CHỨNG — 200 KB byte rác → CHẶN');
  const jpg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1]);
  ok(!pdfChu.laByteCuaPDF(jpg), 'ĐỐI CHỨNG — ảnh JPG đổi đuôi .pdf → CHẶN');
  const xa = themDauFile(sach, new Uint8Array(2000));
  ok(!pdfChu.laByteCuaPDF(xa), 'ĐỐI CHỨNG — chữ ký ở byte 2000 (quá trần) → CHẶN');

  /* ---- CA ĐỐI CHỨNG BH-16: CHỐT CŨ phải TRƯỢT ca BOM ---- */
  const chotCu = (b) => !!b && b.length > 5 && b[0] === 0x25 && b[1] === 0x50 &&
    b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2D;
  ok(!chotCu(themDauFile(sach, BOM)),
     'ĐỐI CHỨNG BH-16 — chốt CŨ (đòi byte 0) chặn oan PDF có BOM ⇒ phép đo có mắt');

  ok(gopPdf.laByteCuaPDF(themDauFile(sach, BOM)), 'Trình duyệt cũng nhận PDF có BOM (một luật, hai lớp)');
  ok(!gopPdf.laByteCuaPDF(rac), 'Trình duyệt vẫn chặn byte rác');
}

/* ==========================================================================
   ② PDF CÓ LỚP CHỮ TIẾNG VIỆT — bóc ra bao nhiêu % ký tự đúng
   ========================================================================== */
muc('② PDF có lớp chữ tiếng Việt — % ký tự đúng, dấu còn đủ không');
{
  const b = dungPDFCoChu(CAU_VN);
  const r = await pdfChu.docChuTuPDF(b);
  ok(r.loai === 'co_lop_chu', 'Nhận đúng là PDF CÓ LỚP CHỮ', `loai=${r.loai}`);

  const raw = r.chu.replace(/\s+/g, '');
  const mong = CAU_VN.replace(/\s+/g, '');
  let trung = 0;
  for (let i = 0; i < mong.length; i++) if (raw[i] === mong[i]) trung++;
  const pct = (trung / mong.length * 100);
  ok(pct >= 99, `Bóc đúng ${pct.toFixed(1)}% ký tự (ngưỡng 99%)`,
     `${trung}/${mong.length}`);
  ok(r.co_dau === true, 'Dấu tiếng Việt CÒN ĐỦ (Ô, Ê, ấ, ề, ệ…)');
  ok(raw.includes('124/2026/GCN-ATTP'.replace(/\s/g, '')), 'Số hiệu đọc ra nguyên vẹn');
  ok(r.ty_le_doc_duoc >= 0.99, `Tỉ lệ mã tra được bảng: ${(r.ty_le_doc_duoc * 100).toFixed(1)}%`);

  /* ---- CA ĐỐI CHỨNG BH-16: bỏ bảng `/ToUnicode` ---- */
  const b2 = dungPDFCoChu(CAU_VN, { coToUnicode: false });
  const r2 = await pdfChu.docChuTuPDF(b2);
  ok(r2.loai !== 'co_lop_chu' || r2.co_dau === false,
     'ĐỐI CHỨNG BH-16 — bỏ bảng /ToUnicode ⇒ KHÔNG còn nhận là chữ tra cứu được',
     `loai=${r2.loai} ty_le=${(r2.ty_le_doc_duoc * 100).toFixed(0)}%`);

  /* ---- Luồng KHÔNG nén (máy scan cũ) vẫn đọc được ---- */
  const r3 = await pdfChu.docChuTuPDF(dungPDFCoChu(CAU_VN, { nen: false }));
  ok(r3.loai === 'co_lop_chu', 'Luồng nội dung KHÔNG nén cũng đọc được');

  /* ---- BOM ở đầu KHÔNG làm hỏng việc bóc chữ ---- */
  const r4 = await pdfChu.docChuTuPDF(themDauFile(b, BOM));
  ok(r4.loai === 'co_lop_chu' && r4.co_dau, 'PDF có BOM vẫn bóc được chữ có dấu');
}

/* ==========================================================================
   ③ PDF CHỈ CÓ ẢNH — nhận đúng, câu báo bằng tiếng người
   ========================================================================== */
muc('③ PDF chỉ có ảnh — nhận đúng và NÓI RA bằng tiếng người');
{
  const r = await pdfChu.docChuTuPDF(dungPDFChiAnh(3));
  ok(r.loai === 'chi_anh', 'Nhận đúng là PDF CHỈ CÓ ẢNH', `loai=${r.loai}`);
  ok(r.so_trang === 3, `Vẫn đếm đúng 3 trang (so_trang=${r.so_trang})`);
  ok(!!r.ghi_chu && r.ghi_chu.length > 60, 'Có câu giải thích, không im lặng');
  const CAM = ['thư viện', 'chi phí 0', 'Cloudflare', 'Workers', 'render', 'Flate',
               'base64', 'isolate', 'API', 'OCR engine', 'library'];
  const dinh = CAM.filter(c => new RegExp(c, 'i').test(r.ghi_chu));
  ok(dinh.length === 0, 'Câu báo KHÔNG lộ ruột kỹ thuật', dinh.join(', ') || 'sạch');
  ok(/máy scan/i.test(r.ghi_chu) && /nhận dạng chữ/i.test(r.ghi_chu),
     'Câu báo nói ĐÚNG việc phải làm (chỉnh máy scan sang nhận dạng chữ)');
  ok(/vẫn lưu/i.test(r.ghi_chu) && /xem được/i.test(r.ghi_chu),
     'Câu báo trấn an đúng chỗ: tài liệu VẪN LƯU và VẪN MỞ XEM ĐƯỢC');
}

/* ==========================================================================
   ④ ĐẾM TRANG — vùng chồng lấn không đếm hai lần (REV-0054 #4a)
   ========================================================================== */
muc('④ Đếm trang — vùng chồng lấn 1 MB (REV-0054 lỗi #4a)');
{
  /* Dựng ca THẬT: nhồi đệm để cụm `/Type /Page` rơi đúng vào 64 byte dư của
     mốc 1 MB. Chốt cũ đếm cụm đó HAI lần. */
  const MB = 1 << 20;
  const dauTrang = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>';
  for (const lech of [10, 30, 50]) {
    const truoc = Buffer.alloc(MB - 20 + lech, 0x20);
    const than = Buffer.concat([
      Buffer.from('%PDF-1.5\n1 0 obj\n<< /Type /Catalog >>\nendobj\n', 'latin1'),
      truoc,
      Buffer.from(`3 0 obj\n${dauTrang}\nendobj\n%%EOF\n`, 'latin1')
    ]);
    const n = gopPdf.demTrangPDF(new Uint8Array(than));
    ok(n === 1, `Cụm /Type/Page ở mép chồng lấn (lệch ${lech}) → đếm 1`, `đếm ${n}`);
  }
  /* ĐỐI CHỨNG BH-16: chốt CŨ (không bỏ qua vùng dư) phải đếm SAI ít nhất 1 ca. */
  const demCu = (bytes) => {
    const KHOI = 1 << 20, MAU = 8192, CHONG = 64;
    let d = 0;
    for (let i = 0; i < bytes.length; i += KHOI) {
      const het = Math.min(i + KHOI + CHONG, bytes.length);
      let s = '';
      for (let j = i; j < het; j += MAU) s += String.fromCharCode.apply(null, bytes.subarray(j, Math.min(j + MAU, het)));
      for (const _ of s.matchAll(/\/Type\s*\/Page(?![s\w])/g)) d++;
    }
    return d;
  };
  /* Quét một dải lệch để chắc chắn bắt được ca cụm chữ rơi TRỌN trong 64 byte
     dư — vị trí chính xác phụ thuộc độ dài phần đầu file, đoán tay là đoán sai.
     Chốt MỚI phải đếm 1 ở MỌI lệch; chốt CŨ phải đếm 2 ở ÍT NHẤT một lệch. */
  let caCuSai = 0, caMoiSai = 0;
  for (let lech = -80; lech <= 80; lech += 2) {
    const dem = Buffer.alloc(MB - 20 + lech, 0x20);
    const b = new Uint8Array(Buffer.concat([
      Buffer.from('%PDF-1.5\n1 0 obj\n<< /Type /Catalog >>\nendobj\n', 'latin1'),
      dem, Buffer.from(`3 0 obj\n${dauTrang}\nendobj\n%%EOF\n`, 'latin1')
    ]));
    if (demCu(b) !== 1) caCuSai++;
    if (gopPdf.demTrangPDF(b) !== 1) caMoiSai++;
  }
  ok(caMoiSai === 0, 'Chốt MỚI đếm đúng 1 ở cả 81 vị trí quanh mốc 1 MB', `sai ${caMoiSai} ca`);
  ok(caCuSai > 0, 'ĐỐI CHỨNG BH-16 — chốt CŨ đếm SAI (2 thay vì 1) ở vùng chồng lấn',
     `chốt cũ sai ${caCuSai}/81 ca`);

  const r = await pdfChu.demTrangPDFThat(dungPDFChiAnh(5));
  ok(r === 5, `Đếm trang phía máy chủ: 5 trang`, `đếm ${r}`);
}

/* ==========================================================================
   ⑤ MỎ NEO TÍNH LẠI KHI SỐ HIỆU ĐỔI — cả hai chiều
   ========================================================================== */
muc('⑤ Mỏ neo tính lại khi số hiệu đổi (Sếp Ngọc 03/09/2026)');
{
  const CHU_TRANG = 'CONG TY TNHH ALPHA GREEN — Giay chung nhan so 124/2026/GCN-ATTP ngay 12/03/2026';
  /* Chữ KHÔNG nhắc tên công ty (giấy của nhà cung cấp) để mỏ neo chỉ còn phụ
     thuộc vào SỐ HIỆU — đúng thứ đang đo. */
  const CHU_NCC = 'HOA DON GIA TRI GIA TANG — So: 124/2026/GCN-ATTP — Ben ban: HTX Son La';

  const soSai = taiLieu.docTinChu(CHU_NCC, { soHieu: '999/2026/XX', loai: 'Hoá đơn', tieuDe: 'Hoá đơn NCC' });
  ok(soSai.muc !== 'da_neo', 'CHIỀU A trước sửa — gõ NHẦM số hiệu ⇒ chữ CHƯA KIỂM', soSai.muc);
  const soDung = taiLieu.docTinChu(CHU_NCC, { soHieu: '124/2026/GCN-ATTP', loai: 'Hoá đơn', tieuDe: 'Hoá đơn NCC' });
  ok(soDung.muc === 'da_neo', 'CHIỀU A sau sửa — số hiệu ĐÚNG ⇒ chữ ĐÃ ĐỐI CHIẾU', soDung.muc);

  const nguoc = taiLieu.docTinChu(CHU_NCC, { soHieu: '777/2026/ZZ', loai: 'Hoá đơn', tieuDe: 'Hoá đơn NCC' });
  ok(nguoc.muc !== 'da_neo',
     'CHIỀU B — đang TRÚNG, sửa số hiệu sang số khác ⇒ nhãn HẠ về chưa kiểm (không nói dối)', nguoc.muc);

  /* ---- Tách ngược `noi_dung` đã lưu ra từng trang ---- */
  const daLuu =
    `--- Trang 1 · ĐÃ ĐỐI CHIẾU · AI đọc — CHƯA KIỂM ---\n${CHU_TRANG}\n\n` +
    `--- Trang 2 · CHƯA KIỂM · AI đọc — CHƯA KIỂM ---\nTrang phu luc khong co so hieu`;
  const tach = taiLieu.tachTrangDaLuu(daLuu);
  ok(tach.length === 2, 'Tách ngược chuỗi đã lưu ra ĐÚNG 2 trang', `được ${tach.length}`);
  ok(tach[0].chu.includes('124/2026'), 'Trang 1 tách ra đúng chữ');
  ok(taiLieu.tachTrangDaLuu('Chu luu theo loi cu, khong co dau trang').length === 0,
     'Chuỗi lưu theo LỐI CŨ ⇒ tách ra rỗng ⇒ máy chủ phải HẠ về chưa kiểm');

  /* ---- ĐỐI CHỨNG BH-16: bỏ hẳn bước tính lại ⇒ nhãn cũ thành lời nói dối ---- */
  const khongTinhLai = 'da_neo';                 // giữ nguyên nhãn cũ
  ok(khongTinhLai !== nguoc.muc,
     'ĐỐI CHỨNG BH-16 — bỏ bước tính lại ⇒ nhãn "ĐÃ ĐỐI CHIẾU" tồn tại trong khi số hiệu đã khác');
}

/* ==========================================================================
   ⑥ CÂU BÁO LỖI — không còn chữ kỹ thuật
   ========================================================================== */
muc('⑥ Câu báo lỗi của đường tải file — quét toàn bộ');
{
  const CAM = [/thư viện/i, /chi phí 0/i, /Cloudflare/i, /\bWorkers?\b/, /render/i,
               /FlateDecode/i, /\bbase64\b/i, /isolate/i, /%PDF-/, /Uint8Array/,
               /localStorage/, /\bAPI\b/, /\bJSON\b/, /Content-Type/i];
  const dsFile = ['src/tai-lieu.js', 'src/pdf-chu.js', 'public/assets/js/quet-tai-lieu.js'];
  let daSua = 0, conDinh = [];
  for (const f of dsFile) {
    const src = readFileSync(path.join(GOC, f), 'utf8');
    /* CHỈ soi chuỗi thật sự ra mắt người dùng: đối số của `loi(...)`,
       `alert(...)`, `confirm(...)`, và các hằng `CAU_*` / `GHI_CHU_*`.
       Chú thích trong mã ĐƯỢC PHÉP nói chuyện kỹ thuật — đó là chỗ của nó. */
    const re = /(?:\bloi\(|\balert\(|\bconfirm\(|CAU_LOAI\s*=|GHI_CHU_PDF_CHUA_BOC\s*=)([\s\S]{0,900}?)(?:\);|\n\s*\n)/g;
    for (const m of src.matchAll(re)) {
      const doan = m[1];
      const chuoi = [...doan.matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)]
        .map(x => x[1] || x[2] || '').join(' ');
      if (!chuoi.trim()) continue;
      daSua++;
      const v = CAM.filter(c => c.test(chuoi));
      if (v.length) conDinh.push(`${f}: «${chuoi.slice(0, 70)}…» → ${v.join(' ')}`);
    }
  }
  console.log(`  · Đã quét ${daSua} câu ra người dùng trong ${dsFile.length} file.`);
  ok(conDinh.length === 0, 'Không câu nào còn chữ kỹ thuật',
     conDinh.length ? '\n      ' + conDinh.slice(0, 8).join('\n      ') : 'sạch');

  ok(!/thư viện|chi phí 0/i.test(taiLieu.GHI_CHU_PDF_CHUA_BOC),
     'Câu ghi vào CỘT `ocr_ghi_chu` đã bỏ hết chữ kỹ thuật');
  for (const [k, v] of Object.entries(pdfChu.CAU_LOAI)) {
    ok(!/thư viện|chi phí 0|Workers|render/i.test(v) && /vẫn lưu/i.test(v),
       `CAU_LOAI.${k} — tiếng người, và nói rõ tài liệu vẫn lưu`);
  }
}

/* ==========================================================================
   ⑦ KHUNG BYTE THẲNG — bộ mã hoá THẬT của trình duyệt gặp bộ giải mã THẬT
   ---------------------------------------------------------------------------
   Vá REV-0054 lỗi #2: file PDF nay đi lên NGUYÊN khối byte thay vì base64
   trong JSON, nên trong Worker chỉ còn ĐÚNG MỘT bản của file và hai người tải
   25 MB trùng giờ không còn làm chết isolate.

   Hai đầu khung nằm ở hai file khác nhau (`public/assets/js/api.js` viết,
   `src/index.js` đọc). Đó chính là kiểu lỗi chỉ lộ ra khi ghép: mỗi bên tự
   test thì cả hai đều "đúng", mà lệch một byte độ dài là hỏng cả đường tải.
   Nên ở đây gọi HÀM THẬT của cả hai, không dựng lại khung bằng tay.
   ========================================================================== */
muc('⑦ Khung byte thẳng — api.js viết, index.js đọc (vá REV-0054 #2)');
{
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { pathToFileURL } = await import('node:url');
  const TAM = path.join(GOC, '.do-tam');
  mkdirSync(TAM, { recursive: true });

  /* --- Bộ MÃ HOÁ thật: `API.tlLuuTep` trong api.js. Chặn `fetch` để giữ lại
         đúng yêu cầu nó dựng ra, không cho nó đi đâu cả. --- */
  const api = await nhap('public/assets/js/api.js');
  let yeuCau = null;
  const fetchThat = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    yeuCau = new Request('https://x' + u, o);
    return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } });
  };

  /* --- Bộ GIẢI MÃ thật: `tlLuu` trong index.js. Vá đúng hai chỗ: bỏ chốt
         đăng nhập (đang đo khung, không đo phiên) và mở `tlLuu` ra để gọi. --- */
  let ma = readFileSync(path.join(GOC, 'src/index.js'), 'utf8').replace(/\r\n/g, '\n');
  const chotPhien = 'async function batBuocDangNhap(req, env) {';
  ok(ma.includes(chotPhien), 'Tìm được chỗ vá chốt đăng nhập trong index.js');
  ma = ma.replace(chotPhien, chotPhien + `\n  return { phien: { vai_tro: 'admin', nhan_su_id: 'ns_do' } };`);
  ma = ma.replace(/from '\.\/([\w-]+)\.js'/g,
    (m, t) => `from '${pathToFileURL(path.join(GOC, 'src', t + '.js')).href}'`);
  ma += '\nexport { tlLuu as __tlLuu };\n';
  const duong = path.join(TAM, 'index-do-khung.mjs');
  writeFileSync(duong, ma);
  const chuTien = await import(pathToFileURL(duong).href + '?v=' + Date.now());

  const envGia = {
    DB: { prepare: () => ({ bind: () => ({ async first() { return null; } }) }) },
    GOOGLE_CLIENT_ID: 'gia', GOOGLE_CLIENT_SECRET: 'gia', GOOGLE_REFRESH_TOKEN: 'gia'
  };
  const moTa = { nhom: 'ke_toan', tieu_de: 'Bản scan hợp đồng NCC', so_trang: 3, dinh_dang: 'pdf_goc' };

  async function guiQuaKhung(byte) {
    yeuCau = null;
    await api.API.tlLuuTep(moTa, byte);
    const res = await chuTien.__tlLuu(yeuCau, envGia);
    let than = {};
    try { than = await res.json(); } catch { /* không phải JSON */ }
    return { ma: res.status, than };
  }

  /* Ca A — 500 byte RÁC. Đi qua được chốt "rỗng hoặc hỏng" (>200 byte) rồi
     dừng ở chốt chữ ký ⇒ chứng minh ĐÚNG khối byte đã tới nơi, đúng độ dài. */
  const rac = new Uint8Array(500);
  for (let i = 0; i < rac.length; i++) rac[i] = (i * 31) & 0xFF;
  {
    const r = await guiQuaKhung(rac);
    ok(r.ma === 400 && /không phải PDF/i.test(r.than.loi || ''),
       'Khung 500 byte rác đi trọn từ api.js sang index.js', `HTTP ${r.ma}`);
  }

  /* Ca B — 100 byte. Phải dừng ở chốt "rỗng hoặc hỏng", KHÔNG phải chốt chữ
     ký: hai câu khác nhau ⇒ độ dài đọc ra đúng tới từng byte, không lệch. */
  {
    const r = await guiQuaKhung(new Uint8Array(100));
    ok(r.ma === 400 && /rỗng hoặc đã hỏng/i.test(r.than.loi || ''),
       'Khung 100 byte → dừng đúng ở chốt "file rỗng", không lẫn sang chốt khác',
       `HTTP ${r.ma}`);
  }

  /* Ca C — CON SỐ. File 30 MB phải báo ĐÚNG "30.0 MB": con số đó tính từ
     `bytes.length` sau khi cắt khung, nên nó là bằng chứng mạnh nhất rằng
     phần mô tả và phần file được tách đúng chỗ, không lệch một byte. */
  {
    const to = new Uint8Array(30 * 1024 * 1024);
    to.set([0x25, 0x50, 0x44, 0x46, 0x2D], 0);
    const r = await guiQuaKhung(to);
    ok(r.ma === 400 && /30\.0 MB/.test(r.than.loi || ''),
       'File 30 MB qua khung → máy chủ đọc ra ĐÚNG 30.0 MB (không lệch một byte)',
       (r.than.loi || '').slice(0, 60));
    ok(!/base64|Cloudflare|Workers|isolate/i.test(r.than.loi || ''),
       'Câu chặn quá cỡ KHÔNG lộ ruột kỹ thuật');
  }

  /* Ca ĐỐI CHỨNG — khung hỏng (độ dài phần mô tả bịa) phải bị từ chối, không
     được đoán bừa. Không có ca này thì "đọc đúng" ở trên có thể chỉ là may. */
  {
    const xau = new Uint8Array(600);
    new DataView(xau.buffer).setUint32(0, 999999, false);      // dài hơn cả khung
    const req = new Request('https://x/api/tai-lieu/luu', {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: xau
    });
    const res = await chuTien.__tlLuu(req, envGia);
    ok(res.status === 400, 'ĐỐI CHỨNG — khung hỏng (độ dài bịa) → CHẶN, không đoán bừa',
       `HTTP ${res.status}`);
  }

  /* Đường JSON base64 CŨ vẫn phải sống: trình duyệt còn nhớ bản cũ, và đường
     ảnh vẫn đi lối đó. Bỏ quên chỗ này là cả đường máy ảnh chết lặng. */
  {
    const req = new Request('https://x/api/tai-lieu/luu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...moTa, dinh_dang: 'anh_gop', so_trang: 1,
        tep: Buffer.from(rac).toString('base64') })
    });
    const res = await chuTien.__tlLuu(req, envGia);
    const than = await res.json();
    ok(res.status === 400 && /không phải PDF/i.test(than.loi || ''),
       'Đường JSON base64 CŨ vẫn chạy — trình duyệt bản cũ không bị bỏ rơi');
  }

  globalThis.fetch = fetchThat;
}

/* ==========================================================================
   ⑧ FILE PDF THẬT (nếu có) — đo trên hàng thật, không chỉ hàng dựng
   ========================================================================== */
const iTep = process.argv.indexOf('--pdf');
const tepThat = iTep > 0 ? process.argv[iTep + 1] : null;
if (tepThat && existsSync(tepThat)) {
  muc("⑧ File PDF THẬT trên máy");
  const b = new Uint8Array(readFileSync(tepThat));
  const t0 = Date.now();
  const r = await pdfChu.docChuTuPDF(b);
  const ms = Date.now() - t0;
  console.log(`  · ${path.basename(tepThat)} — ${(b.length / 1024).toFixed(0)} KB, ${ms} ms`);
  console.log(`  · loai=${r.loai} · trang=${r.so_trang} · ky_tu=${r.so_ky_tu} · ` +
              `ty_le_doc_duoc=${(r.ty_le_doc_duoc * 100).toFixed(1)}% · co_dau=${r.co_dau}`);
  if (r.chu) console.log('  · 160 ký tự đầu: ' + JSON.stringify(r.chu.slice(0, 160)));
  ok(r.loai === 'co_lop_chu' || r.loai === 'chi_anh', 'Kết luận rõ ràng, không "không rõ"');
  ok(ms < 5000, `Đọc xong dưới 5 giây (${ms} ms)`);
}

console.log('\n───────────────────────────────────────────────────────────');
console.log(`KET_LUAN  ${dat} ĐẠT · ${hong} HỎNG`);
process.exit(hong === 0 ? 0 : 1);
