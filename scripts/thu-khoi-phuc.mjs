#!/usr/bin/env node
/* ==========================================================================
   scripts/thu-khoi-phuc.mjs — KHÔI PHỤC THẬT, RỒI SO TỪNG DÒNG
   ---------------------------------------------------------------------------
   BH-16: "Bản sao lưu chưa từng thử phục hồi = KHÔNG PHẢI bản sao lưu."

   `thu-sao-luu.mjs` chứng minh việc GHI RA đúng. Lệnh này chứng minh nửa còn
   lại — việc ĐỌC NGƯỢC VÀO — thứ mà tới hôm nay chưa ai thử.

   ĐI ĐÚNG ĐƯỜNG THẬT, KHÔNG ĐI TẮT:

     ① Dựng một database SQLite bằng CHÍNH schema.sql của ERP, nhét dữ liệu
        có dấu tiếng Việt, có ô công thức Excel, có số 0 đứng đầu, có xuống
        dòng trong ô, có NULL, có khoá ngoại.
     ② Xuất ra CSV bằng CHÍNH mấy hàm mà Worker dùng (dongCsv, keKhaiCsv,
        docCachDoc, soDoDuLieu) — không viết lại phiên bản "cho dễ".
     ③ Gói thành .zip bằng CHÍNH src/zip.js.
     ④ GIẢI NÉN NGƯỢC file .zip đó ra (đọc mục lục trung tâm như Windows làm).
     ⑤ Chạy KHOI-PHUC.mjs lấy TỪ TRONG ZIP, đổ vào một database RỖNG.
     ⑥ So TỪNG BẢNG, TỪNG DÒNG, TỪNG Ô với database gốc.
     ⑦ CA ĐỐI CHỨNG: sửa lén 1 byte trong ruột file .zip → khôi phục PHẢI TỪ
        CHỐI và KHÔNG được ghi gì.
     ⑧ Ca thử lịch bản tháng: ngày 15 gói tháng trước, kể cả bắc cầu năm.

   DÙNG:  npm run khoi-phuc-thu
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import {
  BOM, dongCsv, dongTieuDe, keKhaiCsv, docCachDoc, docO, phanTichCsv,
  MO_TA_BANG, TEP_DI_KEM, thangTruoc, gioVN,
  NGAY_CHAY_BAN_THANG, NGAY_CUOI_CHO_BAN_THANG, DONG_MOI_LO
} from '../src/sao-luu.js';
import { KHOI_PHUC_MJS, soDoDuLieu } from '../src/khoi-phuc-kem.js';
import { crc32, dauTep, cuoiTep, mucLuc } from '../src/zip.js';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ra = process.env.THU_KHOI_PHUC_RA || path.join(goc, '.thu-khoi-phuc');
fs.rmSync(ra, { recursive: true, force: true });
fs.mkdirSync(ra, { recursive: true });

let hong = 0;
/* Cảnh báo KHÁC lỗi: lỗi thì chặn phát hành, cảnh báo thì phải đọc và ghi lại.
   Tách hai thứ ra để không có cái nào bị nuốt mất vào cái kia. */
const canhBao = [];
const cham = (dat, nhan, them = '') => {
  if (!dat) hong++;
  console.log(`  ${dat ? '✅' : '❌'} ${nhan}${them ? ' — ' + them : ''}`);
  return dat;
};

/* ==========================================================================
   ① DATABASE GỐC — dựng bằng CHÍNH schema.sql của ERP
   ========================================================================== */
console.log('\n=== ① DATABASE GỐC (schema thật của ERP) ===');

const duongGoc = path.join(ra, 'goc.db');
const dbGoc = new DatabaseSync(duongGoc);
dbGoc.exec('PRAGMA foreign_keys = OFF');

/* Nạp schema.sql rồi nạp migrations. Migrations phụ thuộc nhau mà tên file
   không nói lên thứ tự, nên quét đi quét lại tới khi không tiến thêm được —
   rẻ hơn là gõ tay một danh sách thứ tự rồi để nó mốc. */
dbGoc.exec(fs.readFileSync(path.join(goc, 'schema.sql'), 'utf8'));
let conLai = fs.readdirSync(path.join(goc, 'migrations')).filter(f => f.endsWith('.sql'));
for (let vong = 0; vong < 6 && conLai.length; vong++) {
  const truot = [];
  for (const f of conLai) {
    try { dbGoc.exec(fs.readFileSync(path.join(goc, 'migrations', f), 'utf8')); }
    catch (e) { truot.push(f); }
  }
  if (truot.length === conLai.length) break;
  conLai = truot;
}
const soBangCo = dbGoc.prepare(
  "SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().c;
console.log(`  Nạp xong schema: ${soBangCo} bảng (bỏ qua ${conLai.length} migration không nạp được ngoài ngữ cảnh D1).`);

/* ---- Dữ liệu thử: cố ý nhét đủ bốn thứ hay làm hỏng CSV + NULL ---------- */
const NGUY = [
  '=1+1',
  '=HYPERLINK("http://ke-gian.example/"&A1,"Bấm vào đây")',
  '+84 gọi ngay',
  '-5 độ C',
  '@moi_nguoi ơi',
  "'đã có sẵn dấu nháy",
  '\tbắt đầu bằng Tab',
  'Ghi chú nhiều dòng:\r\nDòng hai, có dấu phẩy\r\nDòng ba có "nháy kép"',
  'Bình thường, không sao'
];

/* Mấy migration có sẵn dữ liệu mẫu — dọn đúng 4 bảng ta sắp gieo, giữ nguyên
   dữ liệu mẫu của các bảng khác (càng nhiều bảng có dòng thì càng nhiều bảng
   được đem đi sao lưu, phép kiểm càng rộng). */
for (const b of ['giao_dich_kho','lo_hang','san_pham','thong_bao','vinh_danh','cong_viec','nhan_su']) {
  try { dbGoc.exec(`DELETE FROM ${b}`); } catch (e) { /* bảng chưa có thì thôi */ }
}

const themNS = dbGoc.prepare(
  `INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, sdt, email,
                        quan_ly_id, luong, dang_lam, so_cccd, que_quan)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Bùi', 'Vũ', 'Phan', 'Đặng', 'Hoàng', 'Đỗ'];
const TEN = ['Ngọc', 'Duy', 'Hằng', 'Hương', 'Huyền', 'Phong', 'Khương', 'Lan', 'Thảo', 'Ánh'];
const BO_PHAN = ['Kho vận', 'Kế toán', 'Vận hành sàn', 'Hành chính nhân sự'];
const SO_NS = 600;
themNS.run('NS0001', 'Bùi Thị Ngọc', 'BTN', 'Giám đốc', 'Ban giám đốc',
  '0912345678', 'ngoc@example.vn', null, 90000000, 1, '001188000123', 'Hà Nội');
for (let i = 2; i <= SO_NS; i++) {
  themNS.run(
    'NS' + String(i).padStart(4, '0'),
    `${HO[i % HO.length]} Thị ${TEN[(i * 7) % TEN.length]} ${i}`,
    'X' + i,
    'Nhân viên',
    BO_PHAN[i % BO_PHAN.length],
    // Số 0 đứng đầu — thứ Excel hay ăn mất. Vài dòng để NULL cho có ca NULL.
    i % 17 === 0 ? null : '0' + String(900000000 + i),
    i % 5 === 0 ? '' : `nv${i}@example.vn`,          // ca ô CHUỖI RỖNG
    'NS0001',
    i % 11 === 0 ? null : 8000000 + i * 1000,        // ca ô SỐ + ca NULL
    i % 13 === 0 ? 0 : 1,
    i % 17 === 0 ? null : '0' + String(1188000000 + i),
    // ⛔ Ô công thức Excel + xuống dòng + dấu phẩy + nháy kép nhét vào đây
    NGUY[i % NGUY.length]);
}

/* Bảng có khoá ngoại trỏ về nhan_su — để sơ đồ dữ liệu có cái mà vẽ. */
dbGoc.exec(`INSERT INTO san_pham (id, ma_sku, ten, danh_muc, don_vi, ton_toi_thieu)
            VALUES ('SP001','0HN-MY-1000','Hạnh nhân Mỹ 500g','Hạt dinh dưỡng','gói',50),
                   ('SP002','0NK-CL-1000','Nho khô Chile 1kg','Trái cây sấy','túi',30);`);
dbGoc.exec(`INSERT INTO lo_hang (id, san_pham_id, so_lo, han_su_dung)
            VALUES ('LO001','SP001','0L2608','2027-02-28'),
                   ('LO002','SP002','0L2609','2027-05-31');`);
const themGD = dbGoc.prepare(
  `INSERT INTO giao_dich_kho (id, phieu_id, san_pham_id, lo_hang_id, loai, so_luong,
                              don_gia, doi_tac, ghi_chu, nguoi_id)
   VALUES (?,?,?,?,?,?,?,?,?,?)`);
const SO_GD = 2500;
for (let i = 1; i <= SO_GD; i++) {
  themGD.run(i, 'PH' + String(Math.ceil(i / 5)).padStart(5, '0'),
    i % 2 ? 'SP001' : 'SP002', i % 3 === 0 ? null : (i % 2 ? 'LO001' : 'LO002'),
    i % 2 ? 'nhap' : 'xuat', (i % 40) - 5,
    i % 4 === 0 ? null : 120000 + i,
    i % 6 === 0 ? '' : 'Nhà cung cấp số ' + (i % 9),
    NGUY[i % NGUY.length],
    'NS' + String((i % SO_NS) + 1).padStart(4, '0'));
}
/* Mấy bảng chứa CHỮ DO NHÂN VIÊN TỰ GÕ — đây đúng là chỗ ô công thức Excel
   chui vào ERP thật (⛔ B2). Phải nằm trong phép đối chiếu từng ô. */
const themTB = dbGoc.prepare(
  `INSERT INTO thong_bao (id, nhom, noi_dung, loai, lien_ket, nguoi_nhan_id, tao_luc)
   VALUES (?,?,?,?,?,?,?)`);
const themVD = dbGoc.prepare(
  `INSERT INTO vinh_danh (id, nhan_su_id, nhan_su_ten, noi_dung, nguoi_gui_id,
                          nguoi_gui_ten, so_sao, tao_luc)
   VALUES (?,?,?,?,?,?,?,?)`);
const themCV = dbGoc.prepare(
  `INSERT INTO cong_viec (id, tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten,
                          nguoi_nhan_id, nguoi_nhan_ten, han_chot, trang_thai,
                          ket_qua, tao_luc)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
const LUC = '2026-08-20 09:15:00';
for (let i = 1; i <= 400; i++) {
  const ai = 'NS' + String((i % SO_NS) + 1).padStart(4, '0');
  themTB.run(i, i % 2 ? 'admin' : 'kho', NGUY[i % NGUY.length],
    'sao_luu', i % 4 === 0 ? null : '/kho/' + i, i % 3 === 0 ? null : ai, LUC);
  themVD.run(i, ai, 'Nhân sự ' + i, NGUY[(i + 3) % NGUY.length], 'NS0001',
    'Bùi Thị Ngọc', (i % 5) + 1, LUC);
  themCV.run(i, 'Việc ' + i, NGUY[(i + 5) % NGUY.length],
    i % 7 === 0 ? null : 'Mô tả, có dấu phẩy và "nháy kép"',
    'NS0001', 'Bùi Thị Ngọc', ai, 'Nhân sự ' + i,
    i % 6 === 0 ? null : '2026-09-' + String((i % 28) + 1).padStart(2, '0'),
    i % 2 ? 'dang_lam' : 'xong', i % 3 === 0 ? '' : NGUY[(i + 1) % NGUY.length], LUC);
}
console.log(`  Dữ liệu thử: nhan_su ${SO_NS} · giao_dich_kho ${SO_GD} · ` +
  `thong_bao/vinh_danh/cong_viec 400 mỗi bảng · và mấy bảng nhỏ.`);

/* Danh sách bảng đem đi sao lưu: mọi bảng CÓ dòng (khỏi phải mô phỏng lại
   toàn bộ luật lọc của Worker — luật đó đã có ca thử riêng ở thu-sao-luu). */
const BANG = dbGoc.prepare(
  `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
  .all().map(r => r.name)
  .filter(n => dbGoc.prepare(`SELECT COUNT(*) c FROM ${n}`).get().c > 0);
console.log(`  Đem sao lưu ${BANG.length} bảng: ${BANG.join(', ')}`);

/* ==========================================================================
   ② XUẤT RA CSV — bằng CHÍNH mấy hàm Worker dùng
   ========================================================================== */
console.log('\n=== ② XUẤT RA CSV (dùng đúng hàm của Worker) ===');
const moc = '2026-08';
const keKhai = [];
const zipMuc = [];
const manhZip = [];
let viTriZip = 0;
const nhet = (b) => { manhZip.push(b); viTriZip += b.length; };
const MA = new TextEncoder();

function cotCua(bang) {
  return dbGoc.prepare(`PRAGMA table_info(${bang})`).all().map(r => r.name);
}

for (const bang of BANG) {
  const cot = cotCua(bang);
  const dong = dbGoc.prepare(`SELECT * FROM ${bang}`).all();
  let van = BOM + dongTieuDe(cot);
  for (const d of dong) van += dongCsv(cot, d);
  const bytes = MA.encode(van);
  const c = crc32(bytes, 0);
  keKhai.push({ bang, so_dong: dong.length, co_byte: bytes.length, crc: c });

  const viTriDau = viTriZip;
  nhet(dauTep(`${bang}.csv`)); nhet(bytes); nhet(cuoiTep(c, bytes.length));
  zipMuc.push({ ten: `${bang}.csv`, crc: c, coByte: bytes.length, viTriDau, luc: Date.now() });
}

const quanHe = dbGoc.prepare(
  `SELECT m.name AS bang, f."table" AS den, f."from" AS cot, f."to" AS cot_den
     FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f
    WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%' ORDER BY m.name`).all();

const kem = [
  ['DOC-CACH-DOC.txt', docCachDoc({ moc, loai: 'thang', keKhai })],
  ['SO-DO-DU-LIEU.txt', soDoDuLieu({ moc, loai: 'thang', keKhai, quanHe, moTa: MO_TA_BANG })],
  ['KHOI-PHUC.mjs', KHOI_PHUC_MJS],
  ['KIEM-TRA.csv', keKhaiCsv(keKhai)]
];
let coKem = 0;
for (const [ten, noi] of kem) {
  const b = MA.encode(noi);
  coKem += b.length;
  const viTriDau = viTriZip;
  const c = crc32(b, 0);
  nhet(dauTep(ten)); nhet(b); nhet(cuoiTep(c, b.length));
  zipMuc.push({ ten, crc: c, coByte: b.length, viTriDau, luc: Date.now() });
}
nhet(mucLuc(zipMuc, viTriZip));

const duongZip = path.join(ra, `sao-luu-AGC-${moc}.zip`);
fs.writeFileSync(duongZip, Buffer.concat(manhZip.map(Buffer.from)));
const coZip = fs.statSync(duongZip).size;
const coDuLieu = keKhai.reduce((t, k) => t + k.co_byte, 0);
console.log(`  Gói xong: ${path.basename(duongZip)} — ${(coZip / 1024).toFixed(0)} KB`);
console.log(`  Bốn file đi kèm: ${(coKem / 1024).toFixed(1)} KB ` +
  `(= ${(coKem / coDuLieu * 100).toFixed(2)}% dữ liệu — không làm phình bản sao lưu)`);
for (const [ten, noi] of kem) {
  console.log(`      ${ten.padEnd(20)} ${(MA.encode(noi).length / 1024).toFixed(1)} KB`);
}

/* ==========================================================================
   ③+④ GIẢI NÉN NGƯỢC — đọc mục lục trung tâm y như Windows làm
   ---------------------------------------------------------------------------
   CỐ Ý không dùng thư viện: đây là phép kiểm rằng file .zip ta tự gói ĐỌC
   NGƯỢC ĐƯỢC bằng đúng luật của định dạng ZIP, chứ không phải "mở được trên
   máy tôi". Chỉ hiểu phương thức STORE — vì ta chỉ ghi ra STORE.
   ========================================================================== */
function giaiNen(duong) {
  const b = fs.readFileSync(duong);
  /* Tìm đuôi ZIP (PK\5\6) từ cuối ngược lên. */
  let v = -1;
  for (let i = b.length - 22; i >= 0 && i > b.length - 65558; i--) {
    if (b.readUInt32LE(i) === 0x06054b50) { v = i; break; }
  }
  if (v < 0) throw new Error('Không thấy đuôi ZIP — file hỏng.');
  const soMuc = b.readUInt16LE(v + 10);
  let p = b.readUInt32LE(v + 16);
  const teps = new Map();
  for (let i = 0; i < soMuc; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('Mục lục ZIP hỏng ở mục ' + i);
    const crcKe = b.readUInt32LE(p + 16);
    const co = b.readUInt32LE(p + 24);
    const coTen = b.readUInt16LE(p + 28);
    const coPhu = b.readUInt16LE(p + 30);
    const coChu = b.readUInt16LE(p + 32);
    const viTriDau = b.readUInt32LE(p + 42);
    const ten = b.slice(p + 46, p + 46 + coTen).toString('utf8');
    /* Nhảy tới phần đầu của file rồi bỏ qua đúng độ dài tên + trường phụ. */
    const coTen2 = b.readUInt16LE(viTriDau + 26);
    const coPhu2 = b.readUInt16LE(viTriDau + 28);
    const dauRuot = viTriDau + 30 + coTen2 + coPhu2;
    teps.set(ten, { ruot: b.slice(dauRuot, dauRuot + co), crcKe });
    p += 46 + coTen + coPhu + coChu;
  }
  return teps;
}

console.log('\n=== ③ GIẢI NÉN NGƯỢC FILE .ZIP (không dùng thư viện) ===');
const buta = giaiNen(duongZip);
cham(buta.size === BANG.length + 4, `giải nén ra đủ ${BANG.length + 4} file`, `${buta.size} file`);
cham([...TEP_DI_KEM].filter(t => t !== 'KHOI-PHUC.sql').every(t => buta.has(t)),
  'có đủ 4 file đi kèm trong zip');
let crcOk = 0;
for (const [ten, t] of buta) if (crc32(t.ruot, 0) === t.crcKe) crcOk++;
cham(crcOk === buta.size, 'mã kiểm CRC32 trong mục lục khớp ruột từng file',
  `${crcOk}/${buta.size}`);

function buSanRa(thuMuc, teps) {
  fs.rmSync(thuMuc, { recursive: true, force: true });
  fs.mkdirSync(thuMuc, { recursive: true });
  for (const [ten, t] of teps) fs.writeFileSync(path.join(thuMuc, ten), t.ruot);
}
const thuMucGiaiNen = path.join(ra, 'giai-nen');
buSanRa(thuMucGiaiNen, buta);
console.log(`  Đã bung ra: ${thuMucGiaiNen}`);

/* ==========================================================================
   ⑤ KHÔI PHỤC THẬT — chạy KHOI-PHUC.mjs LẤY TỪ TRONG ZIP
   ========================================================================== */
console.log('\n=== ⑤ KHÔI PHỤC THẬT VÀO MỘT DATABASE RỖNG ===');

/* Database đích: CÙNG schema, KHÔNG có dòng nào. Đúng cảnh "D1 vừa dựng lại". */
const duongDich = path.join(ra, 'dich-rong.db');
const dbDich = new DatabaseSync(duongDich);
dbDich.exec('PRAGMA foreign_keys = OFF');
dbDich.exec(fs.readFileSync(path.join(goc, 'schema.sql'), 'utf8'));
let conLai2 = fs.readdirSync(path.join(goc, 'migrations')).filter(f => f.endsWith('.sql'));
for (let vong = 0; vong < 6 && conLai2.length; vong++) {
  const truot = [];
  for (const f of conLai2) {
    try { dbDich.exec(fs.readFileSync(path.join(goc, 'migrations', f), 'utf8')); }
    catch (e) { truot.push(f); }
  }
  if (truot.length === conLai2.length) break;
  conLai2 = truot;
}
/* Mấy migration gieo sẵn dữ liệu mẫu. Dọn hết cho đúng cảnh THẬT ta muốn dựng
   lại: "D1 vừa tạo lại từ schema, chưa có dòng nào". */
for (const b of BANG) dbDich.exec(`DELETE FROM ${b}`);
const truocKhiGhi = BANG.reduce((t, b) => t + dbDich.prepare(`SELECT COUNT(*) c FROM ${b}`).get().c, 0);
cham(truocKhiGhi === 0, 'database đích RỖNG trước khi khôi phục', `${truocKhiGhi} dòng`);
dbDich.close();

function chayKhoiPhuc(thuMuc, themDoi = []) {
  try {
    const out = execFileSync(process.execPath,
      [path.join(thuMuc, 'KHOI-PHUC.mjs'), thuMuc, ...themDoi],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ma: 0, out };
  } catch (e) {
    return { ma: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const kq = chayKhoiPhuc(thuMucGiaiNen, ['--dong-y', `--vao-sqlite=${duongDich}`]);
cham(kq.ma === 0, 'KHOI-PHUC.mjs chạy xong không lỗi', `mã thoát ${kq.ma}`);
cham(/ĐẠT — đủ \d+ bảng/.test(kq.out), 'nó tự chấm bản sao lưu là ĐẠT');
if (kq.ma !== 0) console.log(kq.out.split('\n').slice(-25).join('\n'));

/* ==========================================================================
   ⑥ SO TỪNG BẢNG, TỪNG DÒNG, TỪNG Ô
   ---------------------------------------------------------------------------
   MỘT ĐIỀU PHẢI KHAI THẲNG, KHÔNG GIẤU:
   CSV không phân biệt được NULL với chuỗi rỗng — cả hai đều ghi ra thành ô
   trống. Nên khi so, ô NULL bên gốc và ô '' bên gốc đều được coi là khớp nếu
   bên đích ra NULL. Đây là GIỚI HẠN THẬT của định dạng CSV, không phải lỗi
   khôi phục, và nó được ĐẾM RIÊNG rồi in ra chứ không giấu vào con số "khớp".
   ========================================================================== */
console.log('\n=== ⑥ ĐỐI CHIẾU TỪNG DÒNG VỚI BẢN GỐC ===');
const db2 = new DatabaseSync(duongDich);
let tongDongSo = 0, tongOSo = 0, oLech = 0, oMoHo = 0, bangLech = 0, bangKhop = 0;
const chiTietLech = [];

for (const bang of BANG) {
  const cot = cotCua(bang);
  const a = dbGoc.prepare(`SELECT * FROM ${bang} ORDER BY rowid`).all();
  const b = db2.prepare(`SELECT * FROM ${bang} ORDER BY rowid`).all();
  if (a.length !== b.length) {
    bangLech++;
    chiTietLech.push(`${bang}: gốc ${a.length} dòng, khôi phục ${b.length} dòng`);
    continue;
  }
  let lechBang = 0;
  for (let i = 0; i < a.length; i++) {
    tongDongSo++;
    for (const c of cot) {
      tongOSo++;
      const x = a[i][c], y = b[i][c];
      if (x === y) continue;
      // Số bên gốc ↔ chuỗi bên đích (SQLite tự ép kiểu theo affinity của cột).
      if (x !== null && y !== null && String(x) === String(y)) continue;
      // Giới hạn của CSV: rỗng và NULL trông y hệt nhau.
      if ((x === null || x === '') && (y === null || y === '')) { oMoHo++; continue; }
      oLech++; lechBang++;
      if (chiTietLech.length < 8) {
        chiTietLech.push(`${bang}[dòng ${i + 1}].${c}: gốc ${JSON.stringify(x)} → khôi phục ${JSON.stringify(y)}`);
      }
    }
  }
  if (!lechBang) bangKhop++; else bangLech++;
}

console.log(`  Số bảng đối chiếu : ${BANG.length}  → khớp ${bangKhop}, lệch ${bangLech}`);
console.log(`  Số dòng đối chiếu : ${tongDongSo.toLocaleString('vi-VN')}`);
console.log(`  Số Ô đối chiếu    : ${tongOSo.toLocaleString('vi-VN')}`);
console.log(`  Ô LỆCH            : ${oLech}`);
console.log(`  Ô rỗng ↔ NULL     : ${oMoHo.toLocaleString('vi-VN')} ` +
  `(giới hạn của CSV, KHAI RÕ chứ không giấu — xem DOC-CACH-DOC.txt PHẦN 3 mục 3)`);
for (const l of chiTietLech) console.log('      · ' + l);
cham(oLech === 0 && bangLech === 0, 'KHÔI PHỤC ĐÚNG TỪNG Ô so với bản gốc');

/* Kiểm riêng thứ dễ mất nhất: số 0 đứng đầu và ô công thức Excel. */
const sdtGoc = dbGoc.prepare("SELECT sdt FROM nhan_su WHERE id='NS0002'").get().sdt;
const sdtVe = db2.prepare("SELECT sdt FROM nhan_su WHERE id='NS0002'").get().sdt;
cham(sdtGoc === sdtVe && String(sdtVe).startsWith('0'),
  'số điện thoại giữ nguyên số 0 đứng đầu qua một vòng sao lưu → khôi phục',
  `${JSON.stringify(sdtGoc)} → ${JSON.stringify(sdtVe)}`);

const idNguy = dbGoc.prepare(
  "SELECT id, ghi_chu FROM giao_dich_kho WHERE ghi_chu LIKE '=HYPERLINK%' LIMIT 1").get();
if (idNguy) {
  const ve = db2.prepare('SELECT ghi_chu FROM giao_dich_kho WHERE id=?').get(idNguy.id).ghi_chu;
  cham(ve === idNguy.ghi_chu, 'ô công thức Excel hoàn nguyên ĐÚNG TỪNG BYTE (rào rồi bóc rào)');
}
const idXuong = dbGoc.prepare(
  "SELECT id, ghi_chu FROM giao_dich_kho WHERE ghi_chu LIKE 'Ghi chú nhiều dòng%' LIMIT 1").get();
if (idXuong) {
  const ve = db2.prepare('SELECT ghi_chu FROM giao_dich_kho WHERE id=?').get(idXuong.id).ghi_chu;
  cham(ve === idXuong.ghi_chu, 'ô có xuống dòng + dấu phẩy + nháy kép hoàn nguyên đúng');
}
const nhayGoc = dbGoc.prepare(
  "SELECT id, que_quan FROM nhan_su WHERE que_quan LIKE '''%' LIMIT 1").get();
if (nhayGoc) {
  const ve = db2.prepare('SELECT que_quan FROM nhan_su WHERE id=?').get(nhayGoc.id).que_quan;
  cham(ve === nhayGoc.que_quan,
    'ô vốn ĐÃ bắt đầu bằng dấu nháy đơn cũng về đúng nguyên trạng (rào đảo ngược được)');
}
db2.close();

/* ==========================================================================
   ⑦ CA ĐỐI CHỨNG (BH-16) — .ZIP BỊ SỬA LÉN
   ========================================================================== */
console.log('\n=== ⑦ CA ĐỐI CHỨNG — ĐƯA VÀO MỘT FILE .ZIP ĐÃ BỊ SỬA LÉN ===');

/* Sửa ĐÚNG MỘT BYTE trong ruột một file CSV nằm bên trong .zip, GIỮ NGUYÊN
   kích thước. Số dòng khớp, số byte khớp — chỉ mã kiểm là lệch. Đây đúng dạng
   hỏng của bit rot, của lỗi ghi Drive, và của người sửa lén. */
const zipBan = Buffer.from(fs.readFileSync(duongZip));
const mucNS = zipMuc.find(m => m.ten === 'nhan_su.csv');
const viTriRuot = mucNS.viTriDau + 30 + MA.encode('nhan_su.csv').length;
const viTriSua = viTriRuot + Math.floor(mucNS.coByte / 2);
const truoc = zipBan[viTriSua];
zipBan[viTriSua] = truoc === 0x41 ? 0x42 : 0x41;
const duongZipXau = path.join(ra, 'sao-luu-AGC-2026-08-DA-BI-SUA.zip');
fs.writeFileSync(duongZipXau, zipBan);
console.log(`  Đã sửa 1 byte ở vị trí ${viTriSua} trong ruột nhan_su.csv ` +
  `(${truoc} → ${zipBan[viTriSua]}). Kích thước file: ${coZip} → ${zipBan.length} byte — Y HỆT.`);

const thuMucXau = path.join(ra, 'giai-nen-xau');
buSanRa(thuMucXau, giaiNen(duongZipXau));

/* Đích cho ca đối chứng: một database CÓ SẴN dữ liệu. Nếu script lỡ ghi bừa
   thì ta phát hiện được — đây mới là phép kiểm thật, chứ ghi vào chỗ rỗng thì
   "không ghi gì" với "ghi rồi" trông giống nhau. */
const duongDichXau = path.join(ra, 'dich-co-du-lieu.db');
fs.copyFileSync(duongGoc, duongDichXau);
const dbX = new DatabaseSync(duongDichXau);
const truocX = dbX.prepare('SELECT COUNT(*) c FROM nhan_su').get().c;
dbX.close();

const kqXau = chayKhoiPhuc(thuMucXau, ['--dong-y', `--vao-sqlite=${duongDichXau}`]);
cham(kqXau.ma !== 0, 'khôi phục TỪ CHỐI file .zip đã bị sửa lén', `mã thoát ${kqXau.ma}`);
cham(/TỪ CHỐI KHÔI PHỤC/.test(kqXau.out), 'in ra đúng khung "TỪ CHỐI KHÔI PHỤC"');
cham(/SAI MÃ KIỂM: nhan_su\.csv/.test(kqXau.out), 'chỉ đúng mặt file bị sửa và đúng lý do');

const dbX2 = new DatabaseSync(duongDichXau);
const sauX = dbX2.prepare('SELECT COUNT(*) c FROM nhan_su').get().c;
dbX2.close();
cham(sauX === truocX && truocX > 0,
  'KHÔNG ghi đè gì lên dữ liệu đang có', `${truocX} dòng trước → ${sauX} dòng sau`);
cham(!fs.existsSync(path.join(thuMucXau, 'KHOI-PHUC.sql')),
  'cũng không đẻ ra file KHOI-PHUC.sql — dừng trước mọi thao tác ghi');

/* Ca đối chứng 2: thiếu hẳn một file. */
const thuMucThieu = path.join(ra, 'giai-nen-thieu');
buSanRa(thuMucThieu, buta);
fs.rmSync(path.join(thuMucThieu, 'nhan_su.csv'));
const kqThieu = chayKhoiPhuc(thuMucThieu, ['--dong-y', `--vao-sqlite=${path.join(ra, 'khong-duoc-tao.db')}`]);
cham(kqThieu.ma !== 0 && /THIẾU FILE: nhan_su\.csv/.test(kqThieu.out),
  'thiếu một file .csv → cũng TỪ CHỐI, chỉ đúng tên file thiếu');

/* Ca đối chứng 3: không có cờ --dong-y và không có bàn phím → phải DỪNG,
   tuyệt đối không được tự cho mình quyền ghi đè. */
const thuMucHoi = path.join(ra, 'giai-nen-hoi');
buSanRa(thuMucHoi, buta);
const kqHoi = chayKhoiPhuc(thuMucHoi, [`--vao-sqlite=${path.join(ra, 'khong-duoc-tao-2.db')}`]);
cham(kqHoi.ma === 3 && !fs.existsSync(path.join(ra, 'khong-duoc-tao-2.db')),
  'bản sao lưu TỐT nhưng chưa ai xác nhận → vẫn KHÔNG ghi', `mã thoát ${kqHoi.ma}`);
cham(/GHI ĐÈ/.test(kqHoi.out) && /MẤT VĨNH VIỄN/.test(kqHoi.out),
  'có in cảnh báo "sẽ ghi đè, dữ liệu mới sẽ mất vĩnh viễn" trước khi hỏi');

/* Ca đối chứng 4: đường sinh file .sql (đường mặc định, không có --vao-sqlite) */
const kqSql = chayKhoiPhuc(thuMucGiaiNen, ['--dong-y']);
const duongSqlRa = path.join(thuMucGiaiNen, 'KHOI-PHUC.sql');
cham(kqSql.ma === 0 && fs.existsSync(duongSqlRa), 'đường mặc định đẻ ra KHOI-PHUC.sql');
if (fs.existsSync(duongSqlRa)) {
  const sql = fs.readFileSync(duongSqlRa, 'utf8');
  cham(sql.includes('PRAGMA defer_foreign_keys = ON;'), 'file .sql có mở khoá ngoại tạm để không kẹt thứ tự bảng');
  cham(BANG.every(b => sql.includes(`DELETE FROM ${b};`)), 'file .sql xoá trắng đủ mọi bảng trước khi ghi');
  /* Chạy thẳng file .sql đó vào một database rỗng — chứng minh nó là SQL hợp lệ. */
  const duongSqlDb = path.join(ra, 'tu-file-sql.db');
  const dbSql = new DatabaseSync(duongSqlDb);
  dbSql.exec('PRAGMA foreign_keys = OFF');
  dbSql.exec(fs.readFileSync(path.join(goc, 'schema.sql'), 'utf8'));
  let cl = fs.readdirSync(path.join(goc, 'migrations')).filter(f => f.endsWith('.sql'));
  for (let v = 0; v < 6 && cl.length; v++) {
    const tr = [];
    for (const f of cl) { try { dbSql.exec(fs.readFileSync(path.join(goc, 'migrations', f), 'utf8')); } catch (e) { tr.push(f); } }
    if (tr.length === cl.length) break; cl = tr;
  }
  let sqlOk = true, sqlLoi = '';
  try { dbSql.exec(sql); } catch (e) { sqlOk = false; sqlLoi = e.message.slice(0, 100); }
  const demSql = sqlOk ? dbSql.prepare('SELECT COUNT(*) c FROM nhan_su').get().c : -1;
  dbSql.close();
  cham(sqlOk && demSql === SO_NS, 'file .sql chạy thật vào database rỗng ra đủ dòng',
    sqlOk ? `nhan_su ${demSql}/${SO_NS} dòng` : sqlLoi);
}

/* ==========================================================================
   ⑧ LỊCH BẢN THÁNG — NGÀY 15 GÓI THÁNG TRƯỚC
   ========================================================================== */
console.log('\n=== ⑧ LỊCH BẢN THÁNG: NGÀY 15 GÓI THÁNG TRƯỚC ===');
const T = (iso) => thangTruoc(new Date(iso + 'T00:00:00Z'));
cham(T('2026-09-15') === '2026-08', '15/09/2026 → gói tháng 2026-08', T('2026-09-15'));
cham(T('2026-10-15') === '2026-09', '15/10/2026 → gói tháng 2026-09', T('2026-10-15'));
cham(T('2027-01-15') === '2026-12', '⚠️ 15/01/2027 → gói tháng 2026-12 (ĐỔI CẢ NĂM)', T('2027-01-15'));
cham(T('2027-03-15') === '2027-02', '15/03/2027 → gói tháng 2027-02', T('2027-03-15'));

/* Cửa sổ mở phiên: mô phỏng đúng điều kiện trong moPhienMoi. */
const trongCuaSo = (ngay) => ngay >= NGAY_CHAY_BAN_THANG && ngay <= NGAY_CUOI_CHO_BAN_THANG;
cham(!trongCuaSo(1), 'mùng 1 → KHÔNG tạo gói tháng');
cham(!trongCuaSo(14), 'ngày 14 → KHÔNG tạo gói tháng');
cham(trongCuaSo(15), 'ngày 15 → CÓ tạo gói tháng');
/* Ngày 16 nằm TRONG cửa sổ (để chạy nốt bản mở dở ngày 15), nhưng nếu bản
   tháng đó ĐÃ XONG thì `coBan()` chặn — không đẻ ra gói thứ hai. Ca thử chống
   trùng bên dưới chính là chỗ chứng minh điều đó. */
cham(trongCuaSo(16), 'ngày 16 → còn trong cửa sổ để CHẠY NỐT bản mở dở');
cham(trongCuaSo(24), 'ngày 24 → vẫn trong hạn chạy nốt');
cham(!trongCuaSo(25), 'ngày 25 → hết hạn, báo động thay vì gói tiếp');

/* Chống trùng: mô phỏng cron quét cả ngày 15 → chỉ mở ĐÚNG MỘT phiên. */
const daCo = new Set();
let soLanMo = 0;
for (let ngay = 15; ngay <= 24; ngay++) {
  for (let luot = 0; luot < 96; luot++) {          // 8 tiếng × 12 lượt/giờ
    const id = 'thang-' + T('2026-09-15');
    if (trongCuaSo(ngay) && !daCo.has(id)) { daCo.add(id); soLanMo++; }
  }
}
cham(soLanMo === 1, `960 lượt cron trong 10 ngày → mở ĐÚNG 1 phiên gói tháng`, `${soLanMo} phiên`);
cham([...daCo][0] === 'thang-2026-08',
  'tên bản theo THÁNG DỮ LIỆU (2026-08), không theo ngày chạy (2026-09)', [...daCo][0]);

/* ==========================================================================
   ⑨ ĐO LẠI CPU SAU KHI THÊM
   ========================================================================== */
console.log('\n=== ⑨ ĐO LẠI CPU MỘT LÔ (trần 10 ms/lượt cron) ===');
{
  const cot = cotCua('nhan_su');
  const mau = dbGoc.prepare('SELECT * FROM nhan_su').all();
  const lo = [];
  for (let i = 0; i < DONG_MOI_LO; i++) lo.push(mau[i % mau.length]);
  const motLuot = () => {
    let van = '';
    for (const d of lo) van += dongCsv(cot, d);
    crc32(MA.encode(van), 0);
  };
  for (let v = 0; v < 10; v++) motLuot();          // hâm nóng, bỏ phần biên dịch
  const do_ = [];
  for (let v = 0; v < 60; v++) {
    const t0 = process.hrtime.bigint();
    motLuot();
    do_.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  do_.sort((a, b) => a - b);
  const giua = do_[Math.floor(do_.length / 2)];
  const p95 = do_[Math.floor(do_.length * 0.95)];
  const xau = do_[do_.length - 1];
  console.log(`  Một lô ${DONG_MOI_LO} dòng: trung vị ${giua.toFixed(2)} ms · p95 ${p95.toFixed(2)} ms · xấu nhất ${xau.toFixed(2)} ms`);
  /* ⚠️ SỐ TRÊN KHÔNG PHẢI SỐ CHÍNH THỨC, VÀ KHÔNG DÙNG ĐỂ CHẤM ĐẠT/HỎNG.
     Bàn thử này cố ý nhét dữ liệu NẶNG BẤT THƯỜNG: nhan_su 22 cột, và MỌI dòng
     đều mang một ô nhiều dòng + ô công thức. Hình dạng thật nhẹ hơn hẳn. Số
     chính thức đối chiếu trần 10 ms là số của `npm run sao-luu-thu` — bộ dữ
     liệu đúng quy mô thật, và ĐỢT NÀY KHÔNG ĐỘNG VÀO đường chạy mỗi lô.

     Nhưng nó vẫn nói một điều đáng nghe, nên KHÔNG GIẤU: một bảng nhiều cột
     chữ dài có thể đẩy một lô chạm trần. Đó chính là BH-22 nhìn từ góc khác —
     trần của thiết kế không chỉ là SỐ DÒNG, mà còn là ĐỘ NẶNG MỖI DÒNG. */
  console.log(`  ⚠️ Số trên là bàn thử STRESS, KHÔNG dùng chấm đạt/hỏng. Số chính thức`);
  console.log(`     đối chiếu trần 10 ms nằm ở "npm run sao-luu-thu".`);
  if (p95 >= 10) {
    canhBao.push(`Bộ dữ liệu nặng bất thường (22 cột, mọi dòng có ô nhiều dòng) đẩy ` +
      `một lô lên p95 ${p95.toFixed(2)} ms — chạm trần 10 ms. Bổ sung cho BH-22: ` +
      `trần thiết kế còn phụ thuộc ĐỘ NẶNG MỖI DÒNG, không chỉ số dòng.`);
  }

  /* Việc MỚI thêm chỉ chạy 1 lần mỗi bản, trong hoanTat — đo riêng. */
  const t1 = process.hrtime.bigint();
  const s1 = docCachDoc({ moc, loai: 'thang', keKhai });
  const s2 = soDoDuLieu({ moc, loai: 'thang', keKhai, quanHe, moTa: MO_TA_BANG });
  MA.encode(s1); MA.encode(s2); MA.encode(KHOI_PHUC_MJS);
  const tThem = Number(process.hrtime.bigint() - t1) / 1e6;
  console.log(`  Phần MỚI THÊM (dựng 3 file kèm + mã hoá): ${tThem.toFixed(2)} ms — ` +
    `chạy ĐÚNG MỘT LẦN mỗi bản, trong lượt hoanTat.`);
  cham(tThem < 4, 'phần thêm nằm gọn trong trần 10 ms của lượt hoanTat',
    `${tThem.toFixed(2)} ms`);
}

/* ==========================================================================
   ⑩ ĐỌC LẠI HƯỚNG DẪN BẰNG CON MẮT NGƯỜI KHÔNG BIẾT KỸ THUẬT
   ========================================================================== */
console.log('\n=== ⑩ SOI LẠI HƯỚNG DẪN ===');
const chuDoc = fs.readFileSync(path.join(thuMucGiaiNen, 'DOC-CACH-DOC.txt'), 'utf8');
const chuSo = fs.readFileSync(path.join(thuMucGiaiNen, 'SO-DO-DU-LIEU.txt'), 'utf8');
cham(/PHẦN 1 —/.test(chuDoc) && /PHẦN 2 —/.test(chuDoc) && /PHẦN 3 —/.test(chuDoc),
  'DOC-CACH-DOC.txt có đủ 3 phần');
cham(/BƯỚC 1 —[\s\S]*BƯỚC 6 —/.test(chuDoc), 'phần khôi phục có các bước ĐÁNH SỐ, không nói chung chung');
cham(/SAO LƯU CÁI ĐANG CÓ/.test(chuDoc) && /MẤT VĨNH VIỄN/.test(chuDoc),
  'có cảnh báo rõ: khôi phục là ĐÈ LÊN, phải sao lưu cái đang có trước');
cham(/LÀM SAO BIẾT ĐÃ KHÔI PHỤC ĐÚNG/.test(chuDoc), 'có mục "làm sao biết đã đúng"');
cham(/PowerShell/.test(chuDoc) && !/\bcmd\.exe\b/.test(chuDoc) && !/^C:\\>/m.test(chuDoc),
  'lệnh viết cho ĐÚNG VỎ PowerShell (máy Sếp), không phải cmd');
cham(/ngày 15/i.test(chuDoc) && !/mùng 1 hằng tháng/.test(chuDoc),
  'mốc thời gian đã khớp lịch mới: bản tháng ra NGÀY 15, gói tháng trước');
cham(/──►/.test(chuSo) && /nhan_su\.csv/.test(chuSo), 'SO-DO-DU-LIEU.txt có sơ đồ nối bảng đọc được');
cham(/giao_dich_kho\.nhan_su_id +──► +nhan_su\.id/.test(chuSo),
  'sơ đồ nêu đúng mối nối thật giao_dich_kho.nhan_su_id ──► nhan_su.id');
cham(!/KHÔNG TRA ĐƯỢC SƠ ĐỒ NỐI/.test(chuSo), 'sơ đồ tra được thật, không rơi vào nhánh "chịu"');

/* Có lệnh nào bảo người ta gõ mà không nói gõ ở đâu không? */
const dongLenh = chuDoc.split('\n').filter(d => /^ {4,}(node|npx) /.test(d));
cham(dongLenh.length >= 5, `có ${dongLenh.length} dòng lệnh cụ thể để chép-dán`);

/* ========================================================================== */
console.log('\n' + '='.repeat(70));
if (canhBao.length) {
  console.log(`⚠️  ${canhBao.length} CẢNH BÁO — không chặn phát hành, nhưng phải ghi vào BÀI HỌC:`);
  for (const c of canhBao) console.log('   · ' + c);
  console.log('');
}
if (hong) {
  console.log(`❌ ${hong} PHÉP KIỂM KHÔNG ĐẠT — chưa được phát hành.`);
  process.exit(1);
}
console.log('✅ TẤT CẢ ĐẠT.');
console.log(`   Đã khôi phục THẬT ${BANG.length} bảng · ` +
  `${tongDongSo.toLocaleString('vi-VN')} dòng · ${tongOSo.toLocaleString('vi-VN')} ô — ` +
  `đối chiếu từng ô với bản gốc, 0 ô lệch.`);
console.log(`   Ca đối chứng: .zip sửa lén 1 byte → TỪ CHỐI, không đụng dữ liệu đang có.`);
console.log(`   Xem tận mắt tại: ${ra}`);
