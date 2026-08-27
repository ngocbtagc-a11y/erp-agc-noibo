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

   CA ĐỐI CHỨNG (bắt buộc chạy ít nhất một lần — BH-16):
     npm run sao-luu-kiemtra -- "…\\2026-08-27" --bo-file=nhan_su.csv
   Giả vờ mất một file. Lệnh này PHẢI báo hỏng. Nếu nó vẫn báo "ĐẠT" thì phép
   kiểm hỏng, chứ không phải bản sao lưu tốt.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { kiemTraKeKhai, demDongCsv } from '../src/sao-luu.js';

const thamSo = process.argv.slice(2);
const thuMuc = thamSo.find(t => !t.startsWith('--'));
const boFile = (thamSo.find(t => t.startsWith('--bo-file=')) || '').split('=')[1];

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
  const [bang, so_dong, co_byte] = d.split(',');
  return { bang, so_dong: Number(so_dong), co_byte: Number(co_byte) };
});

/* ---- Liệt kê thứ THẬT SỰ có --------------------------------------------- */
let thucTe = fs.readdirSync(thuMuc)
  .filter(t => fs.statSync(path.join(thuMuc, t)).isFile())
  .map(ten => {
    const d = path.join(thuMuc, ten);
    const o = { ten, co_byte: fs.statSync(d).size };
    if (ten.endsWith('.csv') && ten !== 'KIEM-TRA.csv') {
      o.so_dong = demDongCsv(fs.readFileSync(d, 'utf8'));
    }
    return o;
  });

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
  console.log('\n✅ ĐẠT — bản sao lưu đủ file, đủ dòng, đủ byte.');
  if (boFile) {
    console.log('\n❌❌ NHƯNG CA ĐỐI CHỨNG VỪA THẤT BẠI: đã bỏ một file mà vẫn báo ĐẠT.');
    console.log('   → PHÉP KIỂM HỎNG. Không được tin kết quả của lệnh này nữa.');
    process.exit(1);
  }
  process.exit(0);
}

console.log(`\n❌ HỎNG — ${kq.loi.length} vấn đề:`);
for (const l of kq.loi) console.log('   · ' + l);
if (boFile) console.log('\n✅ Ca đối chứng ĐÚNG như mong đợi: bỏ một file thì nó báo hỏng.');
process.exit(boFile ? 0 : 1);
