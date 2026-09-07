/* ==========================================================================
   BÀN ĐO — NẠP FILE DỮ LIỆU VÀO ERP
   ---------------------------------------------------------------------------
   Đo hai thứ, tách bạch:
     ① MÁY ĐỌC FILE (src/doc-bang.js): byte -> lưới ô. Bảng mã, dấu phân
        cách, ngoặc kép, xuống dòng trong ô, .xlsx.
     ② MÁY KIỂM SỐ (src/nap-du-lieu.js): lưới ô -> bản ghi sạch + câu lỗi.

   NGUYÊN TẮC CỦA BÀN ĐO NÀY — đọc trước khi thêm ca:
   · FILE XẤU MỚI LÀ PHÉP ĐO THẬT. File đẹp thì bộ đọc nào cũng qua. Phần
     lớn ca dưới đây là file hỏng, và điều được đo KHÔNG phải "có ngã không"
     mà là "có nói đúng dòng nào cột nào hỏng không".
   · KHÔNG TỰ DỰNG FILE RỒI ĐO CHÍNH NÓ. Mục 5 đọc FILE THẬT trên máy Sếp
     (chỉ đọc, không sửa, không xoá). File tự dựng chỉ hợp thức hoá giả định
     của chính người viết.
   · BÀN ĐO PHẢI TỰ CHỨNG MINH CÓ MẮT:
        node scripts/do-nap-file.mjs --tu-kiem
     cố ý làm hỏng bộ đọc rồi chạy lại — bàn đo PHẢI đỏ. Không đỏ thì bàn đo
     này là đồ trang trí, đừng tin nó.

   CHẠY:  npm run do-nap-file          → đo bình thường
          npm run do-nap-file-tu-kiem  → tự kiểm (phải ĐỎ)
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const GOC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TU_KIEM = process.argv.includes('--tu-kiem');

/* Nguồn mã để đo. Bình thường là `src/` thật; lúc TỰ KIỂM thì trỏ vào một
   BẢN SAO ĐÃ BỊ GÀI LỖI, để chứng minh bàn đo bắt được lỗi thật trong mã
   thật — chứ không chỉ bắt được lỗi tưởng tượng viết trong chính bàn đo. */
const NGUON = process.env.NAP_SRC ? resolve(process.env.NAP_SRC) : join(GOC, 'src');
const nap = m => import(pathToFileURL(join(NGUON, m)).href);

const { docBang, giaiMa, chonDauPhanCach, nhanDangKieu, LoiDocBang } = await nap('doc-bang.js');
const napRaw = await nap('nap-du-lieu.js');
const { docSo, docNgay, kiemBang, goiYGhep, khongDau, DICH } = napRaw;

/* ---- Chấm điểm ---------------------------------------------------------- */
let dat = 0, truot = 0;
const hong = [];
function dung(ten, dieuKien, chiTiet = '') {
  if (dieuKien) { dat++; console.log(`  ✓ ${ten}`); }
  else { truot++; hong.push(ten + (chiTiet ? ` — ${chiTiet}` : '')); console.log(`  ✗ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
}
const B = s => new TextEncoder().encode(s);

/* Ghép byte */
function noiByte(...ms) {
  const n = ms.reduce((a, m) => a + m.length, 0);
  const ra = new Uint8Array(n);
  let p = 0; for (const m of ms) { ra.set(m, p); p += m.length; }
  return ra;
}

/* Dựng một file .xlsx tối thiểu (nén thật) để đo đường đọc Excel. */
function dungXlsx(cot, dong) {
  const kho = [];
  const soKho = new Map();
  const idKho = s => { if (!soKho.has(s)) { soKho.set(s, kho.length); kho.push(s); } return soKho.get(s); };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const chuCot = i => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; } return s; };

  const bang = [cot, ...dong];
  let xmlDong = '';
  bang.forEach((d, ri) => {
    let o = '';
    d.forEach((v, ci) => {
      if (v === '' || v === null || v === undefined) return;
      o += `<c r="${chuCot(ci)}${ri + 1}" t="s"><v>${idKho(String(v))}</v></c>`;
    });
    xmlDong += `<row r="${ri + 1}">${o}</row>`;
  });

  const phan = {
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
    'xl/workbook.xml': '<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Bang1" sheetId="1" r:id="rId7"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId7" Target="worksheets/sheet9.xml"/></Relationships>',
    'xl/sharedStrings.xml': `<?xml version="1.0"?><sst count="${kho.length}">${kho.map(s => `<si><t>${esc(s)}</t></si>`).join('')}</sst>`,
    'xl/worksheets/sheet9.xml': `<?xml version="1.0"?><worksheet><sheetData>${xmlDong}</sheetData></worksheet>`
  };

  // --- Gói thành file ZIP (deflate-raw, có mục lục trung tâm) ---
  const cuc = [], muc = [];
  let off = 0;
  const u32 = n => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  const u16 = n => new Uint8Array([n & 255, (n >>> 8) & 255]);
  const crcBang = (() => { const b = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); b[i] = c >>> 0; } return b; })();
  const crc32 = by => { let c = 0xFFFFFFFF; for (const x of by) c = (crcBang[(c ^ x) & 255] ^ (c >>> 8)) >>> 0; return (~c) >>> 0; };

  for (const [ten, noi] of Object.entries(phan)) {
    const tho = B(noi);
    const nen = new Uint8Array(deflateRawSync(Buffer.from(tho)));
    const tenB = B(ten);
    const dauMuc = noiByte(u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0),
                           u32(crc32(tho)), u32(nen.length), u32(tho.length), u16(tenB.length), u16(0), tenB);
    cuc.push(dauMuc, nen);
    muc.push({ ten: tenB, crc: crc32(tho), nen: nen.length, tho: tho.length, off });
    off += dauMuc.length + nen.length;
  }
  const mucByte = [];
  for (const m of muc) {
    mucByte.push(noiByte(u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0),
                         u32(m.crc), u32(m.nen), u32(m.tho), u16(m.ten.length), u16(0), u16(0),
                         u16(0), u16(0), u32(0), u32(m.off), m.ten));
  }
  const mucGop = noiByte(...mucByte);
  const eocd = noiByte(u32(0x06054b50), u16(0), u16(0), u16(muc.length), u16(muc.length),
                       u32(mucGop.length), u32(off), u16(0));
  return noiByte(...cuc, mucGop, eocd);
}

/* ==========================================================================
   1. ĐỌC ĐÚNG FILE BÌNH THƯỜNG
   ========================================================================== */
console.log('\n① File bình thường');
{
  const b = await docBang(B('Mã SKU,Tên sản phẩm,Số lượng\nHN-001,Hạnh nhân Mỹ,120\nMC-002,Macca Úc,80\n'), 'thu.csv');
  dung('Đọc đúng 3 cột', b.cot.length === 3, `ra ${b.cot.length}`);
  dung('Đọc đúng 2 dòng dữ liệu', b.dong.length === 2, `ra ${b.dong.length}`);
  dung('Giữ nguyên dấu tiếng Việt', b.dong[0][1] === 'Hạnh nhân Mỹ', `ra "${b.dong[0][1]}"`);
  dung('Nhận đúng dấu phẩy', b.dauPhanCach === ',', `ra "${b.dauPhanCach}"`);
}

/* ==========================================================================
   2. BẢNG MÃ VÀ DẤU PHÂN CÁCH
   ========================================================================== */
console.log('\n② Bảng mã và dấu phân cách');
{
  // BOM UTF-8 — Excel Việt Nam hay kèm
  const bom = noiByte(new Uint8Array([0xEF, 0xBB, 0xBF]), B('Mã SKU,Tên\nA1,Táo đỏ\n'));
  const b = await docBang(bom, 'bom.csv');
  dung('Cắt BOM khỏi tên cột đầu', b.cot[0] === 'Mã SKU', `ra "${b.cot[0]}"`);
  dung('Nói ra là có BOM', /có BOM/.test(b.bangMa), b.bangMa);
  // Không còn ký tự ẩn U+FEFF sót ở BẤT KỲ đâu — kể cả trong ô dữ liệu.
  const conAn = [...b.cot, ...b.dong.flat()].some(s => String(s).includes('﻿'));
  dung('Không còn ký tự ẩn U+FEFF ở bất kỳ ô nào', !conAn);
  // Ghép cột phải khớp — đây mới là hậu quả thật của việc bỏ sót BOM.
  dung('BOM không làm hỏng việc ghép cột', goiYGhep(b.cot, 'san_pham').ma_sku === 0,
       JSON.stringify(goiYGhep(b.cot, 'san_pham')));
}
{
  // Dấu chấm phẩy — máy Việt Nam đặt Region=Vietnam
  const b = await docBang(B('Mã SKU;Tên;Tồn\nA1;Nho khô;5\nA2;Óc chó;7\n'), 'cham-phay.csv');
  dung('Nhận dấu chấm phẩy', b.dauPhanCach === ';', `ra "${b.dauPhanCach}"`);
  dung('Chấm phẩy: đúng 3 cột', b.cot.length === 3, `ra ${b.cot.length}`);
}
{
  // UTF-16LE + TAB — Excel "Save as Unicode Text"
  const chu = 'Mã SKU\tTên\nA1\tHạt điều\n';
  const u16 = new Uint8Array(2 + chu.length * 2);
  u16[0] = 0xFF; u16[1] = 0xFE;
  for (let i = 0; i < chu.length; i++) { const c = chu.charCodeAt(i); u16[2 + i * 2] = c & 255; u16[3 + i * 2] = c >> 8; }
  const b = await docBang(u16, 'unicode.txt');
  dung('Đọc được UTF-16LE', b.cot[0] === 'Mã SKU', `ra "${b.cot[0]}"`);
  dung('UTF-16LE giữ dấu', b.dong[0][1] === 'Hạt điều', `ra "${b.dong[0][1]}"`);
  dung('Nhận đúng TAB', b.dauPhanCach === '\t');
}
{
  // CRLF của Windows
  const b = await docBang(B('Mã,Tên\r\nA1,Táo\r\nA2,Lê\r\n'), 'crlf.csv');
  dung('CRLF không dính \\r vào ô', b.dong[0][1] === 'Táo', `ra "${b.dong[0][1]}"`);
}

/* ==========================================================================
   3. NGOẶC KÉP — chỗ vỡ kinh điển
   ========================================================================== */
console.log('\n③ Dấu phẩy, ngoặc kép, xuống dòng trong ô');
{
  const b = await docBang(B('Mã,Tên,Ghi chú\nA1,"Hạt điều rang muối, loại 1","Cao 2""3"\n'), 'ngoac.csv');
  dung('Dấu phẩy trong ngoặc vẫn là MỘT ô', b.dong[0][1] === 'Hạt điều rang muối, loại 1', `ra "${b.dong[0][1]}"`);
  dung('"" thành một dấu ngoặc kép', b.dong[0][2] === 'Cao 2"3', `ra "${b.dong[0][2]}"`);
  dung('Không tách nhầm thành 4 cột', b.dong[0].length === 3, `ra ${b.dong[0].length}`);
}
{
  const b = await docBang(B('Mã,Mô tả\nA1,"Dòng một\nDòng hai"\nA2,Ngắn\n'), 'xuongdong.csv');
  dung('Xuống dòng trong ngoặc vẫn là MỘT ô', b.dong[0][1] === 'Dòng một\nDòng hai', JSON.stringify(b.dong[0][1]));
  dung('Vẫn đếm đúng 2 dòng dữ liệu', b.dong.length === 2, `ra ${b.dong.length}`);
}
{
  // Ngoặc kép mở mà không đóng -> phải NÓI RA, không được nuốt
  let câu = '';
  try { await docBang(B('Mã,Tên\nA1,"chưa đóng\nA2,Lê\n'), 'hong.csv'); }
  catch (e) { câu = e.message; }
  dung('Ngoặc kép thiếu đóng: báo lỗi có số dòng', /Dòng \d+/.test(câu), câu || '(không báo lỗi)');
}

/* ==========================================================================
   4. FILE XẤU — điều được đo là CÂU LỖI, không phải "có ngã không"
   ========================================================================== */
console.log('\n④ File xấu');
const caXau = [
  { ten: 'File rỗng',              byte: new Uint8Array(0),                          mong: /rỗng/i },
  { ten: 'Chỉ có dòng tiêu đề',    byte: B('Mã SKU,Tên sản phẩm\n'),                 mong: /chỉ có dòng tiêu đề/i },
  { ten: 'Toàn dòng trắng',        byte: B('\n\n\n'),                                mong: /không có dòng nào|rỗng/i },
  { ten: 'File PDF đưa nhầm',      byte: B('%PDF-1.4\n%????\n'),                     mong: /PDF/i },
  { ten: '.xls đời cũ 2003',       byte: noiByte(new Uint8Array([0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1]), new Uint8Array(64)), mong: /Lưu thành|CSV/i }
];
for (const ca of caXau) {
  let câu = '';
  try { await docBang(ca.byte, 'xau.csv'); câu = '(KHÔNG báo lỗi — đọc trót lọt)'; }
  catch (e) { câu = e.message; }
  dung(`${ca.ten}: nói rõ bằng tiếng người`, ca.mong.test(câu), câu.slice(0, 90));
}
{
  // File to quá trần
  let câu = '';
  try { await docBang(new Uint8Array(9 * 1024 * 1024), 'to.csv'); }
  catch (e) { câu = e.message; }
  dung('File 9 MB: chặn và bảo chia nhỏ', /chia nhỏ/i.test(câu), câu.slice(0, 90));
}
{
  // Tên cột trùng nhau
  const b = await docBang(B('Mã,Tên,Tên\nA1,Táo,Lê\n'), 'trungcot.csv');
  dung('Hai cột trùng tên: đánh số cho khác', b.cot[1] !== b.cot[2], `${b.cot[1]} / ${b.cot[2]}`);
  dung('Hai cột trùng tên: có nói ra', b.canhBao.some(c => /cùng tên/.test(c)), JSON.stringify(b.canhBao));
}
{
  // Dòng thiếu ô / thừa ô
  const b = await docBang(B('Mã,Tên,Tồn\nA1,Táo\nA2,Lê,5,THỪA\n'), 'lechô.csv');
  dung('Dòng thiếu ô vẫn đọc được', b.dong[0].length === 2, `ra ${b.dong[0].length}`);
  dung('Dòng thừa ô vẫn đọc được', b.dong[1].length === 4, `ra ${b.dong[1].length}`);
}

/* ==========================================================================
   5. ĐỌC SỐ VÀ NGÀY KIỂU VIỆT NAM
   ========================================================================== */
console.log('\n⑤ Đọc số và ngày');
const caSo = [
  ['1234567', 1234567], ['1.234.567', 1234567], ['1,234,567', 1234567],
  ['1.234,56', 1234.56], ['1,234.56', 1234.56], ['12,5', 12.5], ['0', 0],
  ['-8', -8], ['(1.200)', -1200], ['145200', 145200], ['1.500 ₫', 1500],
  ['mười', null], ['', null], ['abc', null], ['12a', null]
];
for (const [vao, ra] of caSo) dung(`docSo("${vao}") = ${ra}`, docSo(vao) === ra, `ra ${docSo(vao)}`);

const caNgay = [
  ['2026-09-12', '2026-09-12'], ['12/09/2026', '2026-09-12'], ['12-9-2026', '2026-09-12'],
  ['31/02/2026', null], ['2026-13-01', null], ['hôm qua', null],
  // Số ngày của Excel. Neo đối chứng: 25569 = 01/01/1970 (mốc Unix) — đã tra tay.
  ['45912', '2025-09-12'], ['25569', null]   // 25569 nằm ngoài khoảng 1990–2100 nên bị loại, đúng ý đồ
];
for (const [vao, ra] of caNgay) dung(`docNgay("${vao}") = ${ra}`, docNgay(vao) === ra, `ra ${docNgay(vao)}`);

/* ==========================================================================
   6. KIỂM BẢNG — câu lỗi phải chỉ đúng DÒNG và CỘT
   ========================================================================== */
console.log('\n⑥ Câu lỗi chỉ đúng dòng và cột');
{
  const bang = {
    cot: ['Mã SKU', 'Tên sản phẩm', 'Tồn tối thiểu'],
    dong: [
      ['HN-001', 'Hạnh nhân Mỹ', '60'],
      ['MC-002', 'Macca Úc', 'mười'],       // dòng 3: số hỏng
      ['', 'Không có mã', '10'],            // dòng 4: thiếu ô bắt buộc
      ['HN-001', 'Trùng mã', '5'],          // dòng 5: trùng trong file
      ['OC-003', 'Óc chó Chile', '-4']      // dòng 6: âm
    ]
  };
  const ghep = { ma_sku: 0, ten: 1, ton_toi_thieu: 2 };
  const kq = kiemBang(bang, ghep, 'san_pham');

  dung('Chỉ nhận 1 dòng sạch', kq.banGhi.length === 1, `ra ${kq.banGhi.length}`);
  const c = t => kq.loi.find(l => t.test(l.thongDiep));
  dung('Số hỏng: nói "Dòng 3, cột Tồn tối thiểu"', !!c(/Dòng 3, cột Tồn tối thiểu.*cần con số/), c(/Dòng 3/)?.thongDiep);
  dung('Thiếu ô bắt buộc: nói dòng 4', !!c(/Dòng 4.*bắt buộc/), c(/Dòng 4/)?.thongDiep);
  dung('Trùng mã trong file: chỉ ra dòng đầu', !!c(/Dòng 5.*đã xuất hiện ở dòng 2/), c(/Dòng 5/)?.thongDiep);
  dung('Số âm: nói không được âm', !!c(/Dòng 6.*không được âm/), c(/Dòng 6/)?.thongDiep);
  dung('Câu lỗi KHÔNG có tiếng máy', !kq.loi.some(l => /parse|error|invalid|NaN|undefined/i.test(l.thongDiep)));
  dung('Đếm đúng số dòng trùng', kq.soTrung === 1, `ra ${kq.soTrung}`);
}
{
  // Thiếu ghép ô bắt buộc -> phải chặn, không được nạp bừa
  let câu = '';
  try { kiemBang({ cot: ['A', 'B'], dong: [['1', '2']] }, { ma_sku: 0 }, 'san_pham'); }
  catch (e) { câu = e.message; }
  dung('Chưa chọn cột Tên: chặn và nói tên ô còn thiếu', /Tên sản phẩm/.test(câu), câu.slice(0, 90));
}

/* ==========================================================================
   7. GỢI Ý GHÉP CỘT — gợi ý thôi, không tự quyết
   ========================================================================== */
console.log('\n⑦ Gợi ý ghép cột');
{
  const g = goiYGhep(['Mã SKU', 'Tên sản phẩm (theo báo giá)', 'ĐVT', 'Danh mục chuẩn'], 'san_pham');
  dung('Gợi ý đúng cột Mã SKU', g.ma_sku === 0, JSON.stringify(g));
  dung('Gợi ý đúng cột Tên', g.ten === 1, JSON.stringify(g));
  dung('Gợi ý đúng ĐVT -> đơn vị', g.don_vi === 2, JSON.stringify(g));
  dung('Không gán hai ô vào cùng một cột', new Set(Object.values(g)).size === Object.values(g).length);
}
{
  const g = goiYGhep(['Cột 1', 'Cột 2', 'Cột 3'], 'san_pham');
  dung('Tên cột vô nghĩa: KHÔNG đoán bừa', Object.keys(g).length === 0, JSON.stringify(g));
}
{
  /* Ca hiểm nhất: tên cột TRÔNG GIỐNG nhưng nghĩa khác hẳn. Máy vơ bừa
     "Mã vận đơn" thành "Mã hàng" là cả bảng sản phẩm sai — mà sai êm. */
  const g = goiYGhep(['Mã vận đơn', 'Tên người nhận', 'Ghi chú'], 'san_pham');
  dung('KHÔNG vơ "Mã vận đơn" thành Mã hàng', g.ma_sku === undefined, JSON.stringify(g));
  dung('KHÔNG vơ "Tên người nhận" thành Tên sản phẩm', g.ten === undefined, JSON.stringify(g));
}

/* ==========================================================================
   8. ĐỌC FILE .XLSX
   ========================================================================== */
console.log('\n⑧ Đọc file Excel (.xlsx)');
{
  const x = dungXlsx(['Mã SKU', 'Tên sản phẩm', 'Tồn'],
                     [['HN-001', 'Hạnh nhân Mỹ, loại 1', '120'], ['MC-002', 'Macca Úc', '80']]);
  dung('Nhận ra là file nén (xlsx) theo byte đầu', nhanDangKieu(x) === 'xlsx');
  const b = await docBang(x, 'thu.xlsx');
  dung('Đọc đúng cột từ .xlsx', b.cot[0] === 'Mã SKU' && b.cot.length === 3, JSON.stringify(b.cot));
  dung('Đọc đúng dòng từ .xlsx', b.dong.length === 2, `ra ${b.dong.length}`);
  dung('.xlsx giữ dấu tiếng Việt + dấu phẩy trong ô', b.dong[0][1] === 'Hạnh nhân Mỹ, loại 1', `ra "${b.dong[0][1]}"`);
  dung('Tìm đúng bảng dù tên là sheet9.xml', b.dong[1][0] === 'MC-002', `ra "${b.dong[1][0]}"`);
}

/* ==========================================================================
   9. FILE THẬT TRÊN MÁY SẾP  (CHỈ ĐỌC — không sửa, không xoá)
   ========================================================================== */
console.log('\n⑨ File thật trên máy (chỉ đọc)');
const thuMucThat = ['C:/Users/Admin/Desktop/AI/MauDuLieu_AGC', 'C:/Users/Admin/Desktop/AI', 'C:/Users/Admin/Desktop'];
let daDoThat = 0;
for (const tm of thuMucThat) {
  if (!existsSync(tm)) continue;
  let ds = [];
  try { ds = readdirSync(tm).filter(f => /\.(csv|xlsx)$/i.test(f)); } catch { continue; }
  for (const f of ds.slice(0, 4)) {
    const duong = join(tm, f);
    let byte;
    try { byte = new Uint8Array(readFileSync(duong)); } catch { continue; }
    if (byte.length > 8 * 1024 * 1024) continue;
    try {
      const b = await docBang(byte, f);
      dung(`Đọc được file thật "${f}"`, b.cot.length >= 2 && b.dong.length >= 1,
           `${b.cot.length} cột, ${b.dong.length} dòng, ${b.bangMa}`);
      daDoThat++;
    } catch (e) {
      dung(`Đọc được file thật "${f}"`, false, e.message.slice(0, 80));
    }
  }
  if (daDoThat >= 4) break;
}
dung('Có đo trên ÍT NHẤT 2 file thật của Sếp', daDoThat >= 2, `mới đo ${daDoThat} file`);

/* Danh mục sản phẩm THẬT — đo cả đường ghép cột lẫn đường kiểm số */
{
  const duong = 'C:/Users/Admin/Desktop/AI/TongHop_SanPham_Theo_SKU.xlsx';
  if (existsSync(duong)) {
    const b = await docBang(new Uint8Array(readFileSync(duong)), 'TongHop_SanPham_Theo_SKU.xlsx');
    dung('Danh mục thật: đọc được >700 dòng', b.dong.length > 700, `ra ${b.dong.length}`);
    const g = goiYGhep(b.cot, 'san_pham');
    dung('Danh mục thật: gợi ý đúng Mã SKU + Tên', g.ma_sku === 0 && g.ten === 1, JSON.stringify(g));
    const kq = kiemBang(b, { ma_sku: g.ma_sku, ten: g.ten }, 'san_pham');
    dung('Danh mục thật: có >700 dòng sạch', kq.banGhi.length > 700, `sạch ${kq.banGhi.length}, lỗi ${kq.loi.length}`);
    dung('Danh mục thật: SKU giữ số 0 đầu', kq.banGhi.some(x => /^0\d+$/.test(x.ma_sku)),
         kq.banGhi[0]?.ma_sku);
  } else {
    console.log('  · (bỏ qua — không thấy TongHop_SanPham_Theo_SKU.xlsx)');
  }
}

/* ==========================================================================
   10. TẢI LẠI CÙNG FILE KHÔNG ĐƯỢC NHÂN ĐÔI (phần thuần, không CSDL)
   ========================================================================== */
console.log('\n⑩ Đọc lại cùng file ra cùng kết quả');
{
  const byte = B('Mã SKU,Tên sản phẩm\nHN-001,Hạnh nhân\nMC-002,Macca\n');
  const a = kiemBang(await docBang(byte, 'x.csv'), { ma_sku: 0, ten: 1 }, 'san_pham');
  const c = kiemBang(await docBang(byte, 'x.csv'), { ma_sku: 0, ten: 1 }, 'san_pham');
  dung('Đọc 2 lần ra cùng số bản ghi', a.banGhi.length === c.banGhi.length && a.banGhi.length === 2);
  dung('Khoá đối chiếu ổn định giữa 2 lần',
       JSON.stringify(a.banGhi.map(x => x.__khoa)) === JSON.stringify(c.banGhi.map(x => x.__khoa)),
       JSON.stringify(a.banGhi.map(x => x.__khoa)));
  dung('Khoá luôn viết HOA để so cho chắc', a.banGhi[0].__khoa === 'HN-001');
}
{
  // Chữ hoa/thường của mã phải coi là MỘT
  const a = kiemBang(await docBang(B('Mã,Tên\nhn-001,A\nHN-001,B\n'), 'y.csv'), { ma_sku: 0, ten: 1 }, 'san_pham');
  dung('“hn-001” và “HN-001” tính là trùng nhau', a.soTrung === 1, `ra ${a.soTrung}`);
}

/* ==========================================================================
   11. TỰ KIỂM — bàn đo có mắt không?
   ========================================================================== */
if (TU_KIEM && !process.env.NAP_SRC) {
  console.log('\n⑪ TỰ KIỂM — GÀI LỖI THẬT VÀO MÃ THẬT, bàn đo PHẢI đỏ');
  console.log('   (mỗi ca: chép src/ ra chỗ khác, sửa hỏng MỘT chỗ, chạy lại chính bàn đo này)\n');

  /* Vì sao phải gài lỗi vào MÃ THẬT: một bàn đo tự viết ra "lỗi giả" rồi tự
     bắt lỗi giả đó thì chỉ chứng minh phép so sánh chạy được, KHÔNG chứng
     minh nó canh đúng chỗ trong sản phẩm. Ở đây mỗi ca sửa thật một dòng
     trong bản sao của src/ rồi chạy lại toàn bộ bàn đo — ĐỎ mới là có mắt. */
  const CA_GAI = [
    /* BOM được chắn HAI LỚP (giaiMa cắt 3 byte đầu, rồi cotTho cắt lần nữa).
       Gỡ một lớp thì lớp kia đỡ, nên phải gỡ CẢ HAI mới ra đúng cảnh
       "người viết không biết tới BOM" — đó mới là lỗi thật cần bắt. */
    { ten: 'Bỏ nhận BOM UTF-8 cả hai lớp (tên cột dính ký tự ẩn)',
      tep: 'doc-bang.js',
      sua: [
        [`{ chu: new TextDecoder('utf-8').decode(bytes.subarray(3)), bangMa: 'UTF-8 (có BOM)' }`,
         `{ chu: new TextDecoder('utf-8').decode(bytes), bangMa: 'UTF-8' }`],
        [`const cotTho = luoi[0].map(c => String(c).replace(/^﻿/, '').trim());`,
         `const cotTho = luoi[0].map(c => String(c).trim());`]
      ] },

    { ten: 'Tắt xử lý ngoặc kép (vỡ ô có dấu phẩy bên trong)',
      tep: 'doc-bang.js',
      tim: `    if (c === '"' && hienTai === '') { trongNgoac = true; dongCuaODangMo = soDong; i++; continue; }`,
      thay: `    if (false) { trongNgoac = true; dongCuaODangMo = soDong; i++; continue; }` },

    { ten: 'Đọc ngày theo lối Mỹ (12/09 hoá thành 9 tháng 12)',
      tep: 'nap-du-lieu.js',
      tim: `  if (m) return ghepNgay(+m[3], +m[2], +m[1]);          // ngày/tháng/năm`,
      thay: `  if (m) return ghepNgay(+m[3], +m[1], +m[2]);          // GÀI LỖI: lối Mỹ` },

    { ten: 'Không nhận dấu chấm phẩy (máy Việt Nam xuất CSV bằng ;)',
      tep: 'doc-bang.js',
      tim: `  const ungVien = [',', ';', '\\t', '|'];`,
      thay: `  const ungVien = [','];` },

    { ten: 'Gợi ý ghép cột vơ bừa (khớp mẩu chữ ngắn: "Mã vận đơn" -> Mã hàng)',
      tep: 'nap-du-lieu.js',
      tim: `      else if (t.goiY.some(g => g.length >= 4 && k.startsWith(g))) diem = 70;`,
      thay: `      else if (t.goiY.some(g => g.length >= 2 && k.startsWith(g))) diem = 70;` },

    { ten: 'Bỏ kiểm trùng mã trong cùng một file (nhân đôi dữ liệu)',
      tep: 'nap-du-lieu.js',
      tim: `    if (daThay.has(khoa)) {`,
      thay: `    if (false) {` },

    { ten: 'Ô bắt buộc để trống vẫn cho qua (thủng luật bắt buộc)',
      tep: 'nap-du-lieu.js',
      tim: `    if (truong.batBuoc) return { loi: \`để trống — chỗ này bắt buộc phải có\` };`,
      thay: `    if (false) return { loi: 'x' };` }
  ];

  const TAM = join(GOC, '.tu-kiem-nap');
  let batDuoc = 0;

  for (const ca of CA_GAI) {
    rmSync(TAM, { recursive: true, force: true });
    mkdirSync(TAM, { recursive: true });
    cpSync(join(GOC, 'src'), TAM, { recursive: true });

    const duong = join(TAM, ca.tep);
    let noi = readFileSync(duong, 'utf8');
    const sua = ca.sua || [[ca.tim, ca.thay]];
    let gaiDuoc = true;
    for (const [tim, thay] of sua) {
      if (!noi.includes(tim)) { gaiDuoc = false; break; }
      noi = noi.replace(tim, thay);
    }
    if (!gaiDuoc) {
      console.log(`  ✗ ${ca.ten}`);
      console.log(`      KHÔNG gài được — mã đã đổi nên ca này MÙ. Sửa lại chuỗi "tim".`);
      continue;
    }
    writeFileSync(duong, noi, 'utf8');

    const kq = spawnSync(process.execPath, [fileURLToPath(import.meta.url)],
                         { env: { ...process.env, NAP_SRC: TAM }, encoding: 'utf8' });
    if (kq.status === 1) {
      const soTruot = (kq.stdout.match(/TRƯỢT (\d+)/) || [])[1] || '?';
      console.log(`  ✓ ${ca.ten}`);
      console.log(`      → bàn đo ĐỎ (${soTruot} ca trượt) — bắt được.`);
      batDuoc++;
    } else {
      console.log(`  ✗ ${ca.ten}`);
      console.log(`      → bàn đo VẪN XANH. LỖ THỦNG: gài lỗi này vào sản phẩm thật thì không ai biết.`);
    }
  }
  rmSync(TAM, { recursive: true, force: true });

  console.log(`\nTự kiểm: bắt được ${batDuoc}/${CA_GAI.length} lỗi gài vào mã thật.`);
  if (batDuoc < CA_GAI.length) {
    console.log('\n❌ TỰ KIỂM TRƯỢT — bàn đo này có lỗ thủng, đừng tin nó.');
    process.exit(1);
  }
  console.log('✅ Tự kiểm đạt — bàn đo bắt được mọi lỗi gài vào mã thật.');
}

/* ---- Tổng kết ----------------------------------------------------------- */
console.log('\n' + '='.repeat(66));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) {
  console.log('\nCác ca trượt:');
  hong.forEach(h => console.log('  · ' + h));
  console.log('\n❌ ĐỎ');
  process.exit(1);
}
console.log('✅ XANH');
