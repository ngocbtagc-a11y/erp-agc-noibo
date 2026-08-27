#!/usr/bin/env node
/* ==========================================================================
   scripts/kiem-tra-ban-sao-luu.mjs
   ---------------------------------------------------------------------------
   KIỂM MỘT BẢN SAO LƯU ĐÃ TẢI VỀ MÁY.

   Bản sao lưu chưa từng thử đọc lại thì KHÔNG PHẢI bản sao lưu — nó chỉ là
   một đống file để yên tâm (BH-16). Lệnh này mở thư mục đã tải về, so từng
   file với bản kê khai KIEM-TRA.csv, đếm lại số dòng, và nói thẳng thiếu gì.

   DÙNG:
     npm run sao-luu-kiemtra -- "C:\\Users\\Admin\\Downloads\\2026-08-27"

   HAI CA ĐỐI CHỨNG (bắt buộc chạy ít nhất một lần — BH-16):

     npm run sao-luu-kiemtra -- "…\\2026-08-27" --bo-file=nhan_su.csv
   Giả vờ MẤT một file. Lệnh này PHẢI báo hỏng.

     npm run sao-luu-kiemtra -- "…\\2026-08-27" --sua-byte=nhan_su.csv
   Giả vờ ai đó SỬA ĐÚNG MỘT KÝ TỰ giữa file mà GIỮ NGUYÊN KÍCH THƯỚC — dạng
   hỏng của bit rot, của lỗi ghi Drive, của người sửa lén. Số dòng khớp, số
   byte khớp; chỉ mã kiểm crc32 là lệch. Lệnh này PHẢI báo hỏng.

   Cả hai mà vẫn báo "ĐẠT" thì PHÉP KIỂM hỏng, chứ không phải bản sao lưu tốt.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { kiemTraKeKhai, demDongCsv } from '../src/sao-luu.js';
import { crc32 } from '../src/zip.js';

const thamSo = process.argv.slice(2);
const thuMuc = thamSo.find(t => !t.startsWith('--'));
const boFile = (thamSo.find(t => t.startsWith('--bo-file=')) || '').split('=')[1];
const suaFile = (thamSo.find(t => t.startsWith('--sua-byte=')) || '').split('=')[1];
const caDoiChung = boFile || suaFile;

if (!thuMuc) {
  console.error('Thiếu đường dẫn thư mục bản sao lưu.\n' +
    'Ví dụ: npm run sao-luu-kiemtra -- "C:\\Users\\Admin\\Downloads\\2026-08-27"');
  process.exit(2);
}
if (!fs.existsSync(thuMuc)) { console.error(`Không thấy thư mục: ${thuMuc}`); process.exit(2); }

/* ---- Đọc bản kê khai ---------------------------------------------------- */
const duongKe = path.join(thuMuc, 'KIEM-TRA.csv');
if (!fs.existsSync(duongKe)) {
  console.error('❌ HỎNG: không có KIEM-TRA.csv — không có gì để đối chiếu.');
  process.exit(1);
}
const vanKe = fs.readFileSync(duongKe, 'utf8').replace(/^\uFEFF/, '');
const keKhai = vanKe.trim().split(/\r?\n/).slice(1).filter(Boolean).map(d => {
  // Cột 4 `crc32` là MÃ KIỂM (B1). Bản kê khai đời cũ không có cột này — để
  // `crc` là undefined thì `kiemTraKeKhai` sẽ kêu `thieu_ma_kiem`, đúng ý.
  const [bang, so_dong, co_byte, crc32Ke] = d.split(',');
  const o = { bang, so_dong: Number(so_dong), co_byte: Number(co_byte) };
  if (crc32Ke !== undefined && crc32Ke !== '') o.crc = Number(crc32Ke) >>> 0;
  return o;
});

/* ---- Liệt kê thứ THẬT SỰ có ---------------------------------------------
   Đọc BYTE THÔ (không phải chuỗi) để tính crc32 — phải là đúng những byte nằm
   trên đĩa, kể cả BOM, chứ không phải chuỗi đã qua giải mã. */
let thucTe = fs.readdirSync(thuMuc)
  .filter(t => fs.statSync(path.join(thuMuc, t)).isFile())
  .map(ten => {
    const d = path.join(thuMuc, ten);
    const o = { ten, co_byte: fs.statSync(d).size };
    if (ten.endsWith('.csv') && ten !== 'KIEM-TRA.csv') {
      let bytes = fs.readFileSync(d);
      if (ten === suaFile) {
        // Sửa ĐÚNG MỘT byte ở giữa, KHÔNG đổi kích thước. Chỉ trong bộ nhớ —
        // file trên đĩa của Sếp không bị đụng tới.
        bytes = Buffer.from(bytes);
        const i = Math.floor(bytes.length / 2);
        bytes[i] = bytes[i] === 0x41 ? 0x42 : 0x41;
        console.log(`⚠️  CA ĐỐI CHỨNG: giả vờ "${ten}" bị sửa 1 byte ở vị trí ${i} ` +
          `(kích thước GIỮ NGUYÊN ${bytes.length} byte).`);
      }
      o.so_dong = demDongCsv(bytes.toString('utf8'));
      o.crc = crc32(bytes, 0);
    }
    return o;
  });

if (suaFile && !thucTe.some(t => t.ten === suaFile)) {
  console.error(`Không thấy file "${suaFile}" để chạy ca đối chứng --sua-byte.`);
  process.exit(2);
}

if (boFile) {
  console.log(`⚠️  CA ĐỐI CHỨNG: giả vờ thiếu file "${boFile}".`);
  thucTe = thucTe.filter(t => t.ten !== boFile);
}

/* ---- Chấm --------------------------------------------------------------- */
const kq = kiemTraKeKhai(keKhai, thucTe);

console.log(`\nThư mục : ${thuMuc}`);
console.log(`Kê khai : ${keKhai.length} bảng, ` +
  `${keKhai.reduce((t, k) => t + k.so_dong, 0).toLocaleString('vi-VN')} dòng, ` +
  `${(keKhai.reduce((t, k) => t + k.co_byte, 0) / 1048576).toFixed(2)} MB`);

if (kq.dat) {
  console.log('\n✅ ĐẠT — đủ file, đủ dòng, đủ byte, MÃ KIỂM từng file khớp.');
  if (caDoiChung) {
    console.log(`\n❌❌ NHƯNG CA ĐỐI CHỨNG VỪA THẤT BẠI: đã ` +
      `${boFile ? 'bỏ một file' : 'sửa một byte'} mà vẫn báo ĐẠT.`);
    console.log('   → PHÉP KIỂM HỎNG. Không được tin kết quả của lệnh này nữa.');
    process.exit(1);
  }
  process.exit(0);
}

console.log(`\n❌ HỎNG — ${kq.loi.length} vấn đề:`);
for (const l of kq.loi) console.log('   · ' + l);
if (caDoiChung) {
  console.log(`\n✅ Ca đối chứng ĐÚNG như mong đợi: ` +
    `${boFile ? 'bỏ một file' : 'sửa một byte mà giữ nguyên cỡ'} thì nó báo hỏng.`);
}
process.exit(caDoiChung ? 0 : 1);
