/* ==========================================================================
   src/khoi-phuc-kem.js — NHỮNG THỨ ĐI KÈM BÊN TRONG BẢN SAO LƯU
   ---------------------------------------------------------------------------
   CTL-0013 · yêu cầu của Sếp Ngọc 27/08/2026:
     "Phần sao lưu đang sao lưu và update vào driver thì phải lưu cả cách tao
      khôi phục bộ nhớ và chuyển bộ nhớ đấy nhé"

   NGUYÊN TẮC SỐNG CÒN — VÌ SAO FILE NÀY TỒN TẠI:

   Lúc cần khôi phục là lúc ERP ĐÃ HỎNG. GitHub có thể không vào được, không có
   ai trực, không có Claude. Thứ DUY NHẤT còn trong tay Sếp là file .zip trên ổ
   cứng rời. Cho nên hướng dẫn khôi phục và công cụ khôi phục PHẢI NẰM TRONG
   CHÍNH FILE .ZIP ĐÓ. Hướng dẫn nằm trong repo là hướng dẫn vô dụng.

   Ba thứ được nhét kèm mỗi bản sao lưu:
     · DOC-CACH-DOC.txt  — mở rộng thành 3 phần (xem `sao-luu.js/docCachDoc`)
     · KHOI-PHUC.mjs     — script CHẠY ĐƯỢC THẬT, tự đứng, không cần repo
     · SO-DO-DU-LIEU.txt — bảng nào nối bảng nào, cho người tiếp nhận

   ⚠️ `KHOI_PHUC_MJS` là MÃ NGUỒN dưới dạng chuỗi. Viết bằng `String.raw` nên
   dấu `\` bên trong giữ nguyên. Hai thứ TUYỆT ĐỐI không được xuất hiện trong
   ruột chuỗi: dấu backtick, và cặp `$` + `{` — chúng sẽ cắt đứt chuỗi.
   `npm run sao-luu-thu` GHI RA rồi CHẠY THẬT script này, nên lỗi cú pháp bị
   bắt ngay chứ không đợi tới ngày phục hồi.
   ========================================================================== */

/* ==========================================================================
   1. KHOI-PHUC.mjs — công cụ khôi phục, tự đứng một mình
   ========================================================================== */
export const KHOI_PHUC_MJS = String.raw`#!/usr/bin/env node
/* ==========================================================================
   KHOI-PHUC.mjs — ĐƯA BẢN SAO LƯU NÀY TRỞ LẠI THÀNH DỮ LIỆU THẬT
   ---------------------------------------------------------------------------
   Công ty TNHH Alpha Green Commerce · phần mềm ERP nội bộ.

   File này TỰ ĐỨNG ĐƯỢC. Không cần Internet, không cần tải gì thêm, không cần
   mã nguồn ERP. Chỉ cần Node.js (phiên bản 22 trở lên) và chính thư mục này.

   NÓ LÀM GÌ, THEO ĐÚNG THỨ TỰ:
     ① Đọc KIEM-TRA.csv rồi soi TỪNG FILE .csv: đủ file chưa, đủ dòng chưa,
        đủ byte chưa, và MÃ KIỂM CRC32 có khớp không.
     ② Sai một chỗ thôi là DỪNG. Không ghi gì hết. Bản sao lưu đã hỏng thì
        khôi phục nó vào chỉ làm hỏng thêm cái đang có.
     ③ Đúng hết thì HỎI LẠI người dùng. Phải gõ đúng chữ GHI ĐÈ mới đi tiếp.
     ④ Rồi mới ghi.

   BA CÁCH DÙNG:

     node KHOI-PHUC.mjs
        Chỉ SOI thôi, không ghi gì. Rồi đẻ ra file KHOI-PHUC.sql để đưa vào ERP.

     node KHOI-PHUC.mjs --vao-sqlite=du-lieu.db
        Đổ thẳng vào một file cơ sở dữ liệu SQLite trên máy. Đây là đường dùng
        khi công ty BỎ ERP này và chuyển sang phần mềm khác — có file .db là
        gần như phần mềm nào cũng đọc được.

     node KHOI-PHUC.mjs "C:\Users\Admin\Downloads\sao-luu-AGC-2026-08"
        Chạy từ chỗ khác, chỉ đường tới thư mục bản sao lưu.

   Thêm --dong-y thì không hỏi lại (dùng cho máy chạy tự động). Người thật thì
   ĐỪNG dùng cờ này.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const doi = process.argv.slice(2);
const coCo = (t) => doi.some(x => x === t);
const layCo = (t) => {
  const x = doi.find(v => v.startsWith(t + '='));
  return x ? x.slice(t.length + 1) : null;
};
const thuMuc = path.resolve(
  doi.find(x => !x.startsWith('--')) || path.dirname(fileURLToPath(import.meta.url)));

const raSqlite = layCo('--vao-sqlite');
const raSql = layCo('--ra') || path.join(thuMuc, 'KHOI-PHUC.sql');
const khongHoi = coCo('--dong-y');
const rongLaChuoi = coCo('--rong-la-chuoi');

console.log('');
console.log('KHÔI PHỤC BẢN SAO LƯU ERP — ALPHA GREEN COMMERCE');
console.log('Thư mục: ' + thuMuc);
console.log('');

/* --------------------------------------------------------------------------
   MÃ KIỂM CRC32 — chép nguyên từ src/zip.js của ERP.
   CỐ Ý CHÉP chứ không import: file này phải chạy được KHI KHÔNG CÒN REPO.
   -------------------------------------------------------------------------- */
const BANG_CRC = (() => {
  const b = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    b[i] = c >>> 0;
  }
  return b;
})();
function crc32(bytes, truoc) {
  let c = (~(truoc || 0)) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = (BANG_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (~c) >>> 0;
}

/* --------------------------------------------------------------------------
   ĐỌC CSV — chép nguyên hai hàm phanTichCsv và docO của ERP.
   Hai hàm này là một cặp: phanTichCsv bóc dấu nháy của CSV, docO bóc nốt
   hai lớp rào mà ERP cố ý thêm vào (xem DOC-CACH-DOC.txt phần "HAI DẤU LẠ").
   Ai tự tách bằng split(',') là mất dữ liệu — đừng làm thế.
   -------------------------------------------------------------------------- */
function phanTichCsv(vanBan) {
  const s = vanBan.charCodeAt(0) === 0xFEFF ? vanBan.slice(1) : vanBan;
  const hang = [];
  let cot = [], o = '', trongNhay = false;
  const chotO = () => { cot.push(o); o = ''; };
  const chotHang = () => { chotO(); hang.push(cot); cot = []; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (trongNhay) {
      if (c !== '"') { o += c; continue; }
      if (s[i + 1] === '"') { o += '"'; i++; } else trongNhay = false;
      continue;
    }
    if (c === '"') trongNhay = true;
    else if (c === ',') chotO();
    else if (c === '\r' && s[i + 1] === '\n') { chotHang(); i++; }
    else if (c === '\n') chotHang();
    else o += c;
  }
  if (o !== '' || cot.length) chotHang();
  return hang;
}
function docO(o) {
  if (typeof o !== 'string' || o === '') return o;
  if (o.charCodeAt(0) === 39) return o.slice(1);
  const m = /^="(0\d+)"$/.exec(o);
  return m ? m[1] : o;
}
function demDongCsv(vanBan) {
  const s = vanBan.charCodeAt(0) === 0xFEFF ? vanBan.slice(1) : vanBan;
  let trongNhay = false, dong = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { if (trongNhay && s[i + 1] === '"') i++; else trongNhay = !trongNhay; }
    else if (c === '\n' && !trongNhay) dong++;
  }
  return Math.max(0, dong - 1);
}

/* ==========================================================================
   BƯỚC ① — SOI BẢN SAO LƯU. Chưa soi xong thì chưa được ghi gì hết.
   ========================================================================== */
const duongKe = path.join(thuMuc, 'KIEM-TRA.csv');
if (!fs.existsSync(duongKe)) {
  console.error('DỪNG: không thấy file KIEM-TRA.csv trong thư mục này.');
  console.error('Không có bản kê khai thì không cách nào biết dữ liệu còn nguyên hay đã hỏng.');
  console.error('Kiểm lại: đã giải nén file .zip chưa? Có chỉ đúng thư mục không?');
  process.exit(2);
}

const dongKe = fs.readFileSync(duongKe, 'utf8').replace(/^\uFEFF/, '')
  .trim().split(/\r?\n/).slice(1).filter(Boolean);
const keKhai = dongKe.map(d => {
  const [bang, soDong, coByte, ma] = d.split(',');
  return {
    bang,
    so_dong: Number(soDong),
    co_byte: Number(coByte),
    crc: (ma === undefined || ma === '') ? null : (Number(ma) >>> 0)
  };
});

console.log('Bản kê khai: ' + keKhai.length + ' bảng, ' +
  keKhai.reduce((t, k) => t + k.so_dong, 0).toLocaleString('vi-VN') + ' dòng.');
console.log('Đang soi từng file...');
console.log('');

const loi = [];
const daDoc = new Map();

for (const k of keKhai) {
  const ten = k.bang + '.csv';
  const duong = path.join(thuMuc, ten);
  if (!fs.existsSync(duong)) { loi.push('THIẾU FILE: ' + ten + ' — kê khai có mà không thấy đâu.'); continue; }

  const bytes = fs.readFileSync(duong);
  if (bytes.length !== k.co_byte) {
    loi.push('LỆCH KÍCH THƯỚC: ' + ten + ' — kê khai ' + k.co_byte +
      ' byte, thật ' + bytes.length + ' byte.');
    continue;
  }

  if (k.crc === null) {
    loi.push('THIẾU MÃ KIỂM: ' + ten + ' — bản kê khai không có cột crc32. ' +
      'Bản sao lưu này ghi bằng bản phần mềm cũ, KHÔNG kiểm được ruột file.');
    continue;
  }
  const maThat = crc32(bytes, 0);
  if (maThat !== k.crc) {
    loi.push('SAI MÃ KIỂM: ' + ten + ' — kê khai ' + k.crc + ', thật ' + maThat +
      '. File ĐÚNG KÍCH THƯỚC nhưng RUỘT ĐÃ KHÁC. Có người sửa, hoặc đĩa hỏng ngầm.');
    continue;
  }

  const van = bytes.toString('utf8');
  const soDongThat = demDongCsv(van);
  if (soDongThat !== k.so_dong) {
    loi.push('LỆCH SỐ DÒNG: ' + ten + ' — kê khai ' + k.so_dong + ', thật ' + soDongThat + '.');
    continue;
  }
  daDoc.set(k.bang, van);
}

/* File lạ trong thư mục — không phải lỗi chặn, nhưng phải nói ra. */
const chinhChu = new Set(['KIEM-TRA.csv', 'DOC-CACH-DOC.txt', 'SO-DO-DU-LIEU.txt',
  'KHOI-PHUC.mjs', 'KHOI-PHUC.sql']);
const teps = fs.readdirSync(thuMuc).filter(t => {
  try { return fs.statSync(path.join(thuMuc, t)).isFile(); } catch (e) { return false; }
});
const laMat = teps.filter(t => !chinhChu.has(t) && !keKhai.some(k => k.bang + '.csv' === t));
if (laMat.length) {
  console.log('Lưu ý: có ' + laMat.length + ' file không nằm trong bản kê khai: ' +
    laMat.join(', '));
  console.log('Chúng KHÔNG được khôi phục. Nếu là file .csv thì có thể bản sao lưu bị lẫn.');
  console.log('');
}

/* ==========================================================================
   BƯỚC ② — SAI THÌ DỪNG. Đây là điểm sống còn của cả công cụ này.
   ========================================================================== */
if (loi.length) {
  console.error('══════════════════════════════════════════════════════════════');
  console.error('  TỪ CHỐI KHÔI PHỤC — BẢN SAO LƯU NÀY KHÔNG ĐÁNG TIN');
  console.error('══════════════════════════════════════════════════════════════');
  console.error('');
  for (const l of loi) console.error('  · ' + l);
  console.error('');
  console.error('KHÔNG ghi gì cả. Dữ liệu hiện tại của công ty vẫn còn nguyên.');
  console.error('');
  console.error('Việc cần làm: lấy bản sao lưu của NGÀY KHÁC, hoặc bản .zip tháng mà');
  console.error('Sếp cất riêng ngoài Google Drive, rồi chạy lại lệnh này với bản đó.');
  console.error('Đừng cố ép bản này vào — ép vào là hỏng thêm cái đang có.');
  process.exit(1);
}

console.log('ĐẠT — đủ ' + daDoc.size + ' bảng, đủ dòng, đủ byte, mã kiểm khớp từng file.');
console.log('');

/* ==========================================================================
   BƯỚC ③ — HỎI LẠI TRƯỚC KHI ĐÈ
   ========================================================================== */
const dich = raSqlite ? ('file cơ sở dữ liệu: ' + path.resolve(raSqlite))
                      : ('file lệnh SQL: ' + raSql);

console.log('══════════════════════════════════════════════════════════════');
console.log('  CẢNH BÁO — VIỆC SẮP LÀM SẼ XOÁ TRẮNG RỒI GHI ĐÈ');
console.log('══════════════════════════════════════════════════════════════');
console.log('');
console.log('  Đích đến : ' + dich);
console.log('  Sẽ ghi   : ' + daDoc.size + ' bảng, ' +
  keKhai.reduce((t, k) => t + k.so_dong, 0).toLocaleString('vi-VN') + ' dòng.');
console.log('');
console.log('  Với MỖI bảng ở trên, việc làm là: XOÁ SẠCH dòng đang có, rồi ghi');
console.log('  dòng của bản sao lưu vào. Dữ liệu phát sinh SAU thời điểm bản sao');
console.log('  lưu này được tạo sẽ MẤT VĨNH VIỄN, không lấy lại được.');
console.log('');
console.log('  TRƯỚC KHI GÕ TIẾP: hãy sao lưu cái đang có. Nếu ERP còn chạy, vào');
console.log('  Cloudflare và xuất một bản D1 mới; nếu không, ít nhất chép ra một');
console.log('  bản của file cơ sở dữ liệu hiện tại. Sai một lần là hết đường lùi.');
console.log('');

async function hoiXacNhan() {
  if (khongHoi) { console.log('  (có cờ --dong-y nên bỏ qua bước hỏi)'); return true; }
  if (!process.stdin.isTTY) {
    console.error('  Không hỏi được (đang chạy trong môi trường không có bàn phím).');
    console.error('  Muốn chạy tự động thì thêm cờ --dong-y, và tự chịu trách nhiệm.');
    return false;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const tra = await new Promise(r => rl.question('  Gõ đúng hai chữ  GHI ĐÈ  rồi bấm Enter: ', r));
  rl.close();
  const sach = String(tra).trim().toUpperCase();
  if (sach !== 'GHI ĐÈ' && sach !== 'GHI DE') {
    console.log('');
    console.log('  Đã HUỶ. Không ghi gì cả.');
    return false;
  }
  return true;
}

if (!(await hoiXacNhan())) process.exit(3);
console.log('');

/* ==========================================================================
   BƯỚC ④ — GHI
   ---------------------------------------------------------------------------
   MỘT ĐIỀU PHẢI BIẾT VỀ Ô TRỐNG:
   Trong file CSV, ô "không có gì" và ô "chuỗi rỗng" trông y hệt nhau — CSV
   không phân biệt được. Mặc định công cụ này ghi ô trống thành KHÔNG CÓ GÌ
   (NULL), vì NULL an toàn cho mọi kiểu cột. Muốn ngược lại thì thêm cờ
   --rong-la-chuoi.
   -------------------------------------------------------------------------- */
function raoSql(v) {
  if (v === '' || v === null || v === undefined) return rongLaChuoi ? "''" : 'NULL';
  if (v === '[nhi_phan]') return 'NULL';   // ô nhị phân không xuất được ra CSV
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function raoTen(t) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
    throw new Error('Tên bảng/cột không hợp lệ, dừng cho chắc: ' + t);
  }
  return t;
}

/* Đọc một bảng ra { cot: [...], dong: [[...]] } với giá trị ĐÃ hoàn nguyên. */
function bocBang(bang) {
  const hang = phanTichCsv(daDoc.get(bang));
  const cot = (hang[0] || []).map(docO);
  const dong = [];
  for (let i = 1; i < hang.length; i++) {
    const h = hang[i];
    if (h.length === 1 && h[0] === '') continue;   // dòng rỗng cuối file
    dong.push(h.map(docO));
  }
  return { cot, dong };
}

let soDongDaGhi = 0, soONhiPhan = 0;

if (raSqlite) {
  /* ---- Đường A: đổ thẳng vào một file SQLite trên máy -------------------- */
  let DatabaseSync;
  try { ({ DatabaseSync } = await import('node:sqlite')); }
  catch (e) {
    console.error('Máy này chạy Node.js quá cũ, chưa có sẵn phần đọc SQLite.');
    console.error('Cần Node.js 22 trở lên. Kiểm bằng lệnh:  node --version');
    console.error('Hoặc bỏ cờ --vao-sqlite để công cụ đẻ ra file KHOI-PHUC.sql.');
    process.exit(2);
  }
  const db = new DatabaseSync(path.resolve(raSqlite));
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN');
  try {
    for (const k of keKhai) {
      const { cot, dong } = bocBang(k.bang);
      const ten = raoTen(k.bang);
      const coBang = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(ten);
      if (!coBang) {
        db.exec('CREATE TABLE ' + ten + ' (' + cot.map(c => raoTen(c) + ' TEXT').join(', ') + ')');
        console.log('  Bảng ' + ten + ' chưa có trong đích — đã tạo mới (mọi cột kiểu chữ).');
      }
      db.exec('DELETE FROM ' + ten);
      const cau = db.prepare('INSERT INTO ' + ten + ' (' + cot.map(raoTen).join(', ') +
        ') VALUES (' + cot.map(() => '?').join(', ') + ')');
      for (const d of dong) {
        const gt = cot.map((_, i) => {
          const v = d[i];
          if (v === '[nhi_phan]') { soONhiPhan++; return null; }
          if (v === '' || v === undefined) return rongLaChuoi ? '' : null;
          return v;
        });
        cau.run(...gt);
        soDongDaGhi++;
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('LỖI khi ghi — đã HOÀN TÁC toàn bộ, đích không bị đụng vào:');
    console.error('  ' + e.message);
    process.exit(1);
  }
  db.close();
  console.log('');
  console.log('XONG. Đã ghi ' + soDongDaGhi.toLocaleString('vi-VN') + ' dòng vào ' +
    path.resolve(raSqlite));
  console.log('');
  console.log('LÀM SAO BIẾT ĐÃ ĐÚNG — mở file đó bằng bất kỳ công cụ SQLite nào');
  console.log('(DB Browser for SQLite, miễn phí) rồi đối chiếu số dòng từng bảng với');
  console.log('cột so_dong trong KIEM-TRA.csv. Khớp hết là đúng.');
} else {
  /* ---- Đường B: đẻ ra file lệnh SQL để đưa vào ERP ----------------------- */
  const manh = [];
  manh.push('-- Sinh tự động bởi KHOI-PHUC.mjs từ bản sao lưu trong thư mục:');
  manh.push('--   ' + thuMuc);
  manh.push('-- Sinh lúc: ' + new Date().toISOString());
  manh.push('-- CẢNH BÁO: file này XOÁ SẠCH rồi GHI ĐÈ ' + keKhai.length + ' bảng.');
  manh.push('PRAGMA defer_foreign_keys = ON;');
  manh.push('');

  /* Xoá HẾT trước, ghi HẾT sau. Làm vậy để không vướng thứ tự bảng cha/con. */
  for (const k of keKhai) manh.push('DELETE FROM ' + raoTen(k.bang) + ';');
  manh.push('');

  for (const k of keKhai) {
    const { cot, dong } = bocBang(k.bang);
    if (!dong.length) { manh.push('-- ' + k.bang + ': không có dòng nào.'); continue; }
    const dau = 'INSERT INTO ' + raoTen(k.bang) + ' (' + cot.map(raoTen).join(', ') + ') VALUES';
    manh.push('-- ' + k.bang + ': ' + dong.length + ' dòng');
    for (let i = 0; i < dong.length; i += 100) {
      const lo = dong.slice(i, i + 100).map(d => {
        return '(' + cot.map((_, j) => {
          if (d[j] === '[nhi_phan]') soONhiPhan++;
          return raoSql(d[j]);
        }).join(',') + ')';
      });
      manh.push(dau + '\n' + lo.join(',\n') + ';');
      soDongDaGhi += Math.min(100, dong.length - i);
    }
    manh.push('');
  }

  fs.writeFileSync(raSql, manh.join('\n'), 'utf8');
  const mb = (fs.statSync(raSql).size / 1048576).toFixed(1);
  console.log('XONG PHẦN CHUẨN BỊ. Đã tạo: ' + raSql + '  (' + mb + ' MB, ' +
    soDongDaGhi.toLocaleString('vi-VN') + ' dòng)');
  console.log('');
  console.log('CÒN MỘT BƯỚC NỮA — CHẠY FILE ĐÓ VÀO ERP.');
  console.log('Mở PowerShell trong thư mục mã nguồn ERP rồi gõ ĐÚNG một dòng này:');
  console.log('');
  console.log('  npx wrangler d1 execute crm-agc --remote --file="' + raSql + '"');
  console.log('');
  console.log('  (muốn thử trước trên máy cho chắc thì đổi --remote thành --local)');
  console.log('');
  console.log('LÀM SAO BIẾT ĐÃ ĐÚNG — sau khi chạy xong, gõ tiếp:');
  console.log('');
  console.log('  npx wrangler d1 execute crm-agc --remote --command="SELECT COUNT(*) FROM nhan_su"');
  console.log('');
  console.log('  rồi so con số đó với cột so_dong của dòng nhan_su trong KIEM-TRA.csv.');
  console.log('  Khớp là đúng. Lệch là chưa chạy xong — chạy lại từ đầu.');
}

if (soONhiPhan) {
  console.log('');
  console.log('Lưu ý: có ' + soONhiPhan + ' ô kiểu nhị phân (ảnh, tệp đính kèm) không');
  console.log('nằm trong bản sao lưu dạng bảng này — chúng được ghi thành trống.');
  console.log('File đính kèm thật nằm ở kho tài liệu trên Drive, không mất.');
}
console.log('');
`;

/* ==========================================================================
   2. SO-DO-DU-LIEU.txt — bảng nào nối bảng nào
   ---------------------------------------------------------------------------
   Dựng từ quan hệ THẬT đọc ra khỏi database (`pragma_foreign_key_list`), chứ
   không phải một danh sách gõ tay sẽ mốc meo sau vài tháng. Tra không được thì
   nói thẳng là không tra được, chứ không bịa.
   ========================================================================== */

/** @param {{moc:string, loai:string, keKhai:Array, quanHe:Array, moTa:object}} */
export function soDoDuLieu({ moc, loai, keKhai, quanHe, moTa }) {
  const nhan = loai === 'thang' ? `tháng ${moc}` : `ngày ${moc}`;
  const coBang = new Set(keKhai.map(k => k.bang));
  const soDong = new Map(keKhai.map(k => [k.bang, Number(k.so_dong || 0)]));

  /* Gom quan hệ theo bảng con. Bỏ quan hệ trỏ tới bảng không có trong bản này
     (ví dụ đơn hàng chỉ nằm ở bản tháng) — nói ra thì rối, im thì sai; ta ghi
     chú riêng ở cuối. */
  const theoBang = new Map();
  const treoLo = [];
  for (const q of (quanHe || [])) {
    if (!coBang.has(q.bang)) continue;
    if (!coBang.has(q.den)) { treoLo.push(q); continue; }
    if (!theoBang.has(q.bang)) theoBang.set(q.bang, []);
    theoBang.get(q.bang).push(q);
  }

  /* Bảng nào được nhiều bảng khác trỏ tới nhất thì là bảng TRUNG TÂM. */
  const demTro = new Map();
  for (const q of (quanHe || [])) {
    if (!coBang.has(q.bang) || !coBang.has(q.den)) continue;
    demTro.set(q.den, (demTro.get(q.den) || 0) + 1);
  }
  const trungTam = [...demTro.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  let s = `SƠ ĐỒ DỮ LIỆU — ERP CÔNG TY TNHH ALPHA GREEN COMMERCE
Bản của ${nhan}. ${keKhai.length} bảng.

FILE NÀY DÙNG ĐỂ LÀM GÌ
-----------------------
Nếu một ngày công ty bỏ phần mềm ERP này và chuyển sang phần mềm khác, người
tiếp nhận dữ liệu sẽ mở đống file .csv ra và hỏi: "bảng nào là gì, và bảng nào
dính với bảng nào?". File này trả lời đúng hai câu đó.

Người đọc file này KHÔNG CẦN biết gì về ERP cũ.

ĐỌC HIỂU KIỂU NỐI
-----------------
Một dòng dạng:

    giao_dich_kho.nhan_su_id  ──►  nhan_su.id

nghĩa là: trong file giao_dich_kho.csv có một cột tên nhan_su_id; con số trong
cột đó chính là con số ở cột id của một dòng trong file nhan_su.csv. Muốn biết
"lần xuất kho này ai làm" thì lấy số ở cột nhan_su_id, sang nhan_su.csv tìm
dòng có id đúng bằng số đó.

Đó là cách duy nhất các bảng dính với nhau. Không có phép thuật nào khác.

`;

  if (trungTam.length) {
    s += `NĂM BẢNG TRUNG TÂM — NHẬP DỮ LIỆU THÌ NHẬP MẤY BẢNG NÀY TRƯỚC
---------------------------------------------------------------
Bảng càng nhiều bảng khác trỏ tới thì càng phải có trước. Nhập ngược thứ tự là
các con số nối bị trỏ vào chỗ trống.

`;
    for (const [ten, dem] of trungTam) {
      const mt = moTa && moTa[ten] ? ` — ${moTa[ten]}` : '';
      s += `  ${(ten + '.csv').padEnd(24)} ${String(dem).padStart(2)} bảng khác trỏ tới${mt}\n`;
    }
    s += '\n';
  }

  /* ⚠️ KHÔNG TRA ĐƯỢC THÌ NÓI THẲNG LÀ KHÔNG TRA ĐƯỢC.
     Nếu im lặng in tiếp thì mọi bảng đều hiện ra "không nối sang bảng nào" —
     đó là một lời KHẲNG ĐỊNH SAI, và người tiếp nhận sẽ tin nó rồi nhập một bộ
     dữ liệu đứt hết mối nối. Thà trống còn hơn sai. */
  if (!quanHe || !quanHe.length) {
    s += `KHÔNG TRA ĐƯỢC SƠ ĐỒ NỐI
------------------------
Lúc tạo bản sao lưu này, phần mềm KHÔNG đọc được danh sách mối nối giữa các
bảng. Cho nên phần sơ đồ dưới đây để TRỐNG — trống là trung thực, chứ không
phải "các bảng không nối với nhau". Chúng CÓ nối, chỉ là chưa liệt kê được.

Cách tự dựng lại sơ đồ: chạy trong thư mục này

    node KHOI-PHUC.mjs --vao-sqlite=du-lieu-erp.db

rồi mở du-lieu-erp.db bằng DB Browser for SQLite, hoặc hỏi bộ phận kỹ thuật
lấy file schema.sql của ERP — mối nối nằm ở mấy chữ REFERENCES trong đó.

Vẫn còn dùng được: quy tắc đặt tên ở phần trên (cột <tên-bảng>_id trỏ tới
<tên-bảng>.id) đúng cho gần như toàn bộ ERP này.

`;
  }

  s += `TỪNG BẢNG NỐI ĐI ĐÂU
--------------------
`;
  const tenSap = [...coBang].sort();
  let coNoi = 0;
  for (const bang of tenSap) {
    const ds = theoBang.get(bang);
    const mt = moTa && moTa[bang] ? moTa[bang] : '';
    const dem = soDong.get(bang) || 0;
    s += `\n▸ ${bang}.csv — ${dem.toLocaleString('vi-VN')} dòng${mt ? `\n  ${mt}` : ''}\n`;
    if (!ds || !ds.length) {
      s += (quanHe && quanHe.length)
        ? `  (không nối sang bảng nào — bảng đứng riêng)\n`
        : `  (chưa tra được mối nối — xem ghi chú ở trên)\n`;
      continue;
    }
    coNoi++;
    for (const q of ds) {
      s += `  ${bang}.${q.cot}  ──►  ${q.den}.${q.cot_den || 'id'}\n`;
    }
  }

  s += `\n(${coNoi}/${tenSap.length} bảng có nối sang bảng khác.)\n`;

  if (treoLo.length) {
    const ten = [...new Set(treoLo.map(q => q.den))].sort();
    s += `\nNỐI RA NGOÀI BẢN NÀY
--------------------
Mấy cột dưới đây trỏ tới bảng KHÔNG có trong bản sao lưu này:

`;
    for (const q of treoLo) s += `  ${q.bang}.${q.cot}  ──►  ${q.den}.${q.cot_den || 'id'}  (thiếu ${q.den}.csv)\n`;
    s += `\nLý do: ${ten.join(', ')} là dữ liệu đơn hàng do Shopee/TikTok làm chủ, chỉ
được gói vào BẢN THÁNG chứ không vào bản hằng ngày. Cần thì lấy bản .zip tháng.
`;
  }

  s += `
BA ĐIỀU PHẢI BIẾT TRƯỚC KHI NHẬP VÀO PHẦN MỀM KHÁC
--------------------------------------------------
1. Ô TRỐNG. File CSV không phân biệt được "không có gì" với "chuỗi rỗng". Khi
   nhập vào chỗ mới phải tự chọn một cách hiểu và giữ nhất quán. Công cụ
   KHOI-PHUC.mjs mặc định hiểu ô trống là "không có gì".

2. HAI DẤU RÀO. Ô nào bắt đầu bằng một dấu nháy đơn ' thì bỏ ĐÚNG MỘT dấu đó
   đi mới ra chữ gốc. Ô nào có dạng ="0987654321" thì lấy phần trong nháy.
   Chi tiết vì sao: xem DOC-CACH-DOC.txt.

3. ẢNH VÀ TỆP ĐÍNH KÈM. Ô nào ghi [nhi_phan] nghĩa là chỗ đó vốn là dữ liệu
   nhị phân, không nhét vào bảng chữ được. Ảnh và chứng từ thật nằm ở kho tài
   liệu trên Google Drive, không nằm trong bản sao lưu này.
`;
  return s;
}
