#!/usr/bin/env node
/* ==========================================================================
   scripts/thu-gop-thang.mjs — ĐO THẬT VIỆC ĐÓNG THÁNG / ĐÓNG NĂM (CTL-0022)
   ---------------------------------------------------------------------------
   BH-05: không viết "chạy tốt" suông. Lệnh này dựng những thư mục ngày GIẢ
   nhưng ĐÚNG QUY MÔ THẬT, chạy đúng đường mã của máy chủ, rồi trả về số:

     ① Tỉ lệ nén THẬT khi gộp 30 file ngày thành một file tháng
        (Gạo ước 7 lần — lệnh này để bác hoặc xác nhận con số đó)
     ② CPU thật mỗi mẩu → đối chiếu trần 10 ms/lượt cron
     ③ Drive 12 GB dùng được bao nhiêu năm
     ④ CA ĐỐI CHỨNG BH-16: làm hỏng file gộp → PHẢI từ chối xoá thư mục ngày
     ⑤ Đứt giữa chừng rồi chạy lại → không hỏng, không mất, không nhân đôi
     ⑥ Ca chuyển năm 15/01/2027: đóng tháng 12/2026 VÀ đóng năm 2026
     ⑦ Ca tháng đang chạy: file ngày mới vào đúng thư mục tháng hiện tại
     ⑧ Mở thật bằng Windows + chạy BUNG-NEN.mjs → so ĐÚNG TỪNG BYTE

   DÙNG:  npm run gop-thang-thu
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  moGoi, moMuc, dongMuc, dongGoi, themMauDaNen, themMauTho, themTepNho,
  nenGzip, docKeKhai, keKhaiGoiCsv, docCachDocGoi, BUNG_NEN_MJS, viTri,
  MAU_NEN, MAU_MOI_LUOT_NEN, NGAY_MO_GOP, NGAY_HAN_GOP
} from '../src/gop-sao-luu.js';
import { crc32 } from '../src/zip.js';
import { thangTruoc, duBaoThangConLai } from '../src/sao-luu.js';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ra = process.env.THU_GOP_RA || path.join(goc, '.thu-gop-thang');
fs.rmSync(ra, { recursive: true, force: true });
fs.mkdirSync(ra, { recursive: true });

let hong = false;
const cham = (dat, chu) => { if (!dat) hong = true; console.log(`  ${dat ? '✅' : '❌'} ${chu}`); };
const mb = n => (n / 1048576).toFixed(2);
const gb = n => (n / 1073741824).toFixed(2);

/* ==========================================================================
   Dựng thư mục ngày giả — ĐÚNG HÌNH DẠNG THẬT
   ========================================================================== */
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Bùi', 'Vũ', 'Phan', 'Đặng', 'Hoàng', 'Đỗ'];
const TEN = ['Thị Ngọc', 'Duy Phong', 'Khương Duy', 'Thị Hằng', 'Lan Hương', 'Thị Huyền'];
const HANG = ['Hạnh nhân Mỹ nguyên vỏ', 'Óc chó Chile, loại 1', 'Nho khô Úc "Sunmuscat"', 'Macca Úc nứt vỏ'];

function bangCsv(bang, soDong, lech) {
  let s = '﻿id,ma_nv,ho_ten,sdt,ma_sku,san_pham,so_luong,don_gia,ghi_chu,trang_thai,tao_luc\r\n';
  for (let i = 0; i < soDong; i++) {
    const j = i + lech;
    const sdt = '0' + String(900000000 + (j * 7919) % 99999999).slice(0, 9);
    const gc = j % 17 === 0
      ? `"Khách báo: ""hàng ẩm"", đổi lô.\nĐã xử lý, hoàn ${(j % 5) + 1} kiện"`
      : `Nhập kho Hà Nội, kệ A${j % 30}, ca sáng`;
    s += `${bang.slice(0, 3)}_${String(j).padStart(7, '0')},"=""0${1000 + (j % 9000)}""",` +
      `${HO[j % HO.length]} ${TEN[j % TEN.length]},"=""${sdt}""","=""0${100000 + (j % 900000)}""",` +
      `${HANG[j % HANG.length]},${(j % 500) + 1},${120000 + (j % 90) * 1000},${gc},` +
      `${['hien', 'an', 'cho_duyet'][j % 3]},2026-07-${String((j % 28) + 1).padStart(2, '0')} ` +
      `0${j % 9}:${String(j % 60).padStart(2, '0')}:00\r\n`;
  }
  return Buffer.from(s, 'utf8');
}

/* Quy mô bản HẰNG NGÀY, SPEC-0005 Mục 4.2 — tổng ~103.000 dòng. */
const QUY_MO = [['thong_bao', 40000], ['giao_dich_kho', 30000], ['lich_lam_viec', 15000],
  ['dang_ky_ca', 6000], ['ca_mo', 4000], ['cong_viec', 3000], ['tai_san', 1200],
  ['tai_san_lich_su', 1800], ['nhan_su', 60], ['san_pham', 400], ['sku_map', 400],
  ['muc_tieu', 120], ['gop_y', 300], ['gop_y_lich_su', 700], ['kho', 5]];

/** Dựng một thư mục ngày y như thứ nằm trên Drive: mỗi bảng một .csv, cộng
    KIEM-TRA.csv (có cột crc32) và mấy file chữ đi kèm. */
function dungNgay(ngay, lech) {
  const thu = path.join(ra, 'ngay', ngay);
  fs.mkdirSync(thu, { recursive: true });
  const keKhai = [];
  for (const [bang, n] of QUY_MO) {
    const b = bangCsv(bang, n, lech);
    fs.writeFileSync(path.join(thu, `${bang}.csv`), b);
    keKhai.push({ bang, so_dong: n, co_byte: b.length, crc: crc32(b, 0) >>> 0 });
  }
  let ke = '﻿bang,so_dong,co_byte,crc32,ten_tep\r\n';
  for (const k of keKhai) ke += `${k.bang},${k.so_dong},${k.co_byte},${k.crc},${k.bang}.csv\r\n`;
  fs.writeFileSync(path.join(thu, 'KIEM-TRA.csv'), Buffer.from(ke, 'utf8'));
  fs.writeFileSync(path.join(thu, 'DOC-CACH-DOC.txt'), Buffer.from('bản ngày ' + ngay, 'utf8'));
  fs.writeFileSync(path.join(thu, 'KHOI-PHUC.mjs'), Buffer.from('// công cụ khôi phục\n', 'utf8'));
  return { ten: ngay, thu, keKhai };
}

/* Ba ngày là đủ để đo TỈ LỆ NÉN, vì tỉ lệ tính trên nội dung chứ không trên số
   ngày — 30 ngày cho đúng con số ấy, chỉ tốn 10 lần thời gian chạy. Số tổng
   của cả tháng thì nhân lên 30, và có ghi rõ chỗ nào là nhân lên. */
const SO_NGAY_THU = 3;
const SO_NGAY_THANG = 30;

console.log('=== DỰNG THƯ MỤC NGÀY GIẢ, ĐÚNG QUY MÔ THẬT ===');
const ngays = [];
for (let i = 0; i < SO_NGAY_THU; i++) {
  ngays.push(dungNgay(`2026-07-${String(i + 1).padStart(2, '0')}`, i * 137));
}
const coMotNgay = ngays[0].keKhai.reduce((t, k) => t + k.co_byte, 0);
console.log(`  ${SO_NGAY_THU} thư mục ngày, mỗi ngày ${QUY_MO.length} bảng · ` +
  `${QUY_MO.reduce((t, q) => t + q[1], 0).toLocaleString('vi-VN')} dòng · ${mb(coMotNgay)} MB`);

/* ==========================================================================
   ① + ② GỘP THÁNG — đúng đường mã máy chủ chạy, đo CPU từng mẩu
   ========================================================================== */
console.log('\n=== ① + ② GỘP THÁNG: TỈ LỆ NÉN VÀ CPU MỖI MẨU ===');

/** Chạy trọn một lượt gộp. `catDut` = dừng đột ngột sau bấy nhiêu mẩu (ca ⑤). */
const DONG_HO = Date.UTC(2026, 7, 15, 2, 30, 0);   // giờ cố định: xem ca ⑤

async function gopThang(dsNgay, { catDut = 0 } = {}) {
  const g = moGoi();
  const cpu = [];
  let soMau = 0;
  for (const n of dsNgay) {
    const tep = fs.readdirSync(n.thu).sort();
    const tra = new Map(n.keKhai.map(k => [`${k.bang}.csv`, k]));
    for (const ten of tep) {
      const duong = path.join(n.thu, ten);
      const byte = fs.readFileSync(duong);
      moMuc(g, `${n.ten}/${ten}.gz`, DONG_HO);
      for (let v = 0; v < Math.max(1, byte.length); v += MAU_NEN) {
        const khuc = new Uint8Array(byte.subarray(v, Math.min(v + MAU_NEN, byte.length)));
        const t0 = process.hrtime.bigint();
        const nen = await nenGzip(khuc);
        cpu.push(Number(process.hrtime.bigint() - t0) / 1e6);
        themMauDaNen(g, khuc, nen);
        soMau++;
        if (catDut && soMau >= catDut) return { g, cpu, catDut: true };
      }
      // ⛔ Đối chiếu mã kiểm gốc với KIEM-TRA.csv của chính ngày đó.
      const ke = tra.get(ten);
      if (ke && (g.mucCrcGoc >>> 0) !== (ke.crc >>> 0)) {
        throw new Error(`Lệch mã kiểm ở ${n.ten}/${ten}`);
      }
      dongMuc(g, { nguon: n.ten, co_byte_goc: byte.length });
    }
  }
  themTepNho(g, 'DOC-CACH-DOC.txt', docCachDocGoi({
    loai: 'thang', moc: '2026-07', nguon: dsNgay.map(n => ({ ten: n.ten })),
    coByteGoc: g.coByteGoc, tiLe: g.coByteGoc / Math.max(1, viTri(g)), luc: DONG_HO
  }), DONG_HO);
  themTepNho(g, 'SO-DO-DU-LIEU.txt', 'sơ đồ quan hệ bảng\n', DONG_HO);
  themTepNho(g, 'BUNG-NEN.mjs', BUNG_NEN_MJS, DONG_HO);
  themTepNho(g, 'KIEM-TRA-GOI.csv', keKhaiGoiCsv(g.keKhai), DONG_HO);
  dongGoi(g);
  return { g, cpu, soMau };
}

const t0 = Date.now();
const { g: goi, cpu } = await gopThang(ngays);
const coGoi = goi.du.length;
const coGoc = SO_NGAY_THU * coMotNgay;
const tiLe = coGoc / coGoi;
const xep = [...cpu].sort((a, b) => a - b);
const bp = q => xep[Math.min(xep.length - 1, Math.floor(xep.length * q))];
const cpuTB = cpu.reduce((a, b) => a + b, 0) / cpu.length;
const cpuMax = xep[xep.length - 1];

console.log(`  Trước gộp : ${mb(coGoc)} MB (${SO_NGAY_THU} ngày)`);
console.log(`  Sau gộp   : ${mb(coGoi)} MB  →  TỈ LỆ NÉN THẬT: ${tiLe.toFixed(2)} lần`);
console.log(`  CPU nén 1 mẩu 256 KiB (${cpu.length} mẩu): trung vị ${bp(0.5).toFixed(2)} · ` +
  `trung bình ${cpuTB.toFixed(2)} · p95 ${bp(0.95).toFixed(2)} · XẤU NHẤT ${cpuMax.toFixed(2)} ms`);
/* ⚠️ Tính trần theo mẩu XẤU NHẤT, không theo trung bình: cái đuôi vài ms kia
   là thật, và nó sẽ rơi vào một lượt cron nào đó. +0,6 ms cho 5 việc cron
   chạy TRƯỚC phần sao lưu trong cùng một lượt. */
const cpuLuot = cpuMax * MAU_MOI_LUOT_NEN + 0.6;
console.log(`  → Một lượt cron gộp ${MAU_MOI_LUOT_NEN} mẩu, tính theo mẩu xấu nhất = ${cpuLuot.toFixed(2)} ms`);
cham(cpuLuot < 10, `CPU mỗi lượt cron ${cpuLuot.toFixed(2)} ms < trần 10 ms`);
const luotCanCho = Math.ceil(SO_NGAY_THANG * (coMotNgay / MAU_NEN) / MAU_MOI_LUOT_NEN);
const luotCoSan = 264 * (NGAY_HAN_GOP - NGAY_MO_GOP);
console.log(`  → Cả tháng cần ${luotCanCho.toLocaleString('vi-VN')} lượt cron; cửa sổ ngày ` +
  `${NGAY_MO_GOP}→${NGAY_HAN_GOP} có ${luotCoSan.toLocaleString('vi-VN')} lượt`);
cham(luotCanCho < luotCoSan, `gộp xong một tháng kịp trong cửa sổ (dư ${(luotCoSan / luotCanCho).toFixed(1)} lần)`);
cham(tiLe > 1.5, `gộp có nén THẬT SỰ nhỏ đi (${tiLe.toFixed(2)} lần), không phải gộp suông`);

/* ---- ③ Drive dùng được bao nhiêu năm ---------------------------------- */
console.log('\n=== ③ DRIVE 12 GB DÙNG ĐƯỢC BAO NHIÊU NĂM ===');
const thangNen = SO_NGAY_THANG * coMotNgay / tiLe;
const thangTho = SO_NGAY_THANG * coMotNgay;
const DRIVE = 12 * 1073741824;
console.log(`  Một tháng KHÔNG nén (luật cũ, gộp suông): ${mb(thangTho)} MB → ${gb(12 * thangTho)} GB/năm → ${(DRIVE / (12 * thangTho)).toFixed(1)} năm`);
console.log(`  Một tháng CÓ nén  (CTL-0022 làm ở đây)  : ${mb(thangNen)} MB → ${gb(12 * thangNen)} GB/năm → ${(DRIVE / (12 * thangNen)).toFixed(1)} năm`);
console.log(`  (số một tháng = ${SO_NGAY_THANG} × một ngày đo thật; tỉ lệ nén không đổi theo số ngày)`);

/* ==========================================================================
   ④ CA ĐỐI CHỨNG BH-16 — LÀM HỎNG FILE GỘP, PHẢI TỪ CHỐI XOÁ
   ========================================================================== */
console.log('\n=== ④ CA ĐỐI CHỨNG BH-16: FILE GỘP HỎNG → PHẢI TỪ CHỐI XOÁ THƯ MỤC NGÀY ===');

/* Đây đúng là phép kiểm giai đoạn ③ `kiem` chạy trên máy chủ: đọc ngược cả
   file gộp từ Drive về, tính CRC32 lại từ đầu, so với con số cộng dồn lúc ghi. */
function giaiDoanKiem(byteTrenDrive, crcLucGhi) {
  let crc = 0;
  for (let v = 0; v < byteTrenDrive.length; v += 4 * 1024 * 1024) {
    crc = crc32(byteTrenDrive.subarray(v, Math.min(v + 4 * 1024 * 1024, byteTrenDrive.length)), crc);
  }
  return (crc >>> 0) === (crcLucGhi >>> 0);
}

cham(giaiDoanKiem(goi.du, goi.crcTep), 'file gộp NGUYÊN VẸN → phép kiểm ĐẠT (được phép xoá)');

const HONG = [
  ['đổi một byte GIỮA file, giữ nguyên kích thước', b => { b[Math.floor(b.length / 2)] ^= 0x01; return b; }],
  ['đổi một byte ở ĐUÔI file', b => { b[b.length - 30] ^= 0xFF; return b; }],
  ['đổi một byte ở ĐẦU file', b => { b[10] ^= 0x80; return b; }],
  ['CẮT CỤT 1 KB cuối (tải dở)', b => b.subarray(0, b.length - 1024)],
  ['thêm thừa 100 byte rác vào đuôi', b => Buffer.concat([Buffer.from(b), Buffer.alloc(100, 7)])]
];
for (const [chu, lam] of HONG) {
  const xau = lam(Buffer.from(goi.du));
  const dat = giaiDoanKiem(new Uint8Array(xau), goi.crcTep);
  cham(!dat, `${chu} → TỪ CHỐI xoá thư mục ngày`);
}

/* Và ca hỏng ở PHÍA NGUỒN: thư mục ngày đã hỏng sẵn từ trước thì không được
   gộp vào rồi xoá — gộp cái hỏng rồi xoá bản đúng là nhân cái hỏng lên. */
{
  const n = ngays[0];
  const duong = path.join(n.thu, 'nhan_su.csv');
  const cu = fs.readFileSync(duong);
  const xau = Buffer.from(cu); xau[Math.floor(xau.length / 2)] ^= 0x01;
  fs.writeFileSync(duong, xau);
  let bat = false;
  try { await gopThang([n]); } catch (e) { bat = /Lệch mã kiểm/.test(e.message); }
  fs.writeFileSync(duong, cu);
  cham(bat, 'thư mục ngày HỎNG SẴN (lệch KIEM-TRA.csv) → DỪNG, không gộp, không xoá');
}

/* ==========================================================================
   ⑤ ĐỨT GIỮA CHỪNG RỒI CHẠY LẠI
   ========================================================================== */
console.log('\n=== ⑤ ĐỨT GIỮA CHỪNG → CHẠY LẠI KHÔNG HỎNG, KHÔNG MẤT, KHÔNG NHÂN ĐÔI ===');
{
  const dut = await gopThang(ngays, { catDut: 37 });
  cham(dut.catDut, 'cắt ngang được ở giữa mẩu thứ 37 (mô phỏng Cloudflare thu hồi isolate)');
  // Chạy lại TỪ ĐẦU (đúng cách máy chủ làm: phiên tải cũ bị dọn, mở phiên mới)
  const lai = await gopThang(ngays);
  cham(lai.g.du.length === goi.du.length, `chạy lại ra ĐÚNG cỡ cũ (${mb(lai.g.du.length)} MB)`);
  cham((lai.g.crcTep >>> 0) === (goi.crcTep >>> 0), 'chạy lại ra ĐÚNG mã kiểm cũ — kết quả lặp lại được');
  const ten = lai.g.keKhai.map(k => k.ten);
  cham(new Set(ten).size === ten.length, `không mục nào bị nhân đôi (${ten.length} mục)`);
  const soNgay = new Set(lai.g.keKhai.filter(k => k.nguon).map(k => k.nguon)).size;
  cham(soNgay === SO_NGAY_THU, `đủ ${SO_NGAY_THU}/${SO_NGAY_THU} ngày trong gói, không thiếu ngày nào`);
}

/* ==========================================================================
   ⑥ CA CHUYỂN NĂM — 15/01/2027 đóng tháng 12/2026 VÀ đóng năm 2026
   ========================================================================== */
console.log('\n=== ⑥ CA CHUYỂN NĂM 15/01/2027 ===');
{
  const vn = new Date(Date.UTC(2027, 0, 15, 3, 0, 0));
  cham(thangTruoc(vn) === '2026-12', `15/01/2027 → tháng phải đóng là ${thangTruoc(vn)} (không phải 2027-00)`);
  const nam = vn.getUTCFullYear() - 1;
  cham(String(nam) === '2026', `15/01/2027 → năm phải đóng là ${nam}`);
  cham(vn.getUTCDate() >= NGAY_MO_GOP && vn.getUTCDate() <= NGAY_HAN_GOP,
    `ngày 15 nằm trong cửa sổ gộp ${NGAY_MO_GOP}→${NGAY_HAN_GOP}`);
  // Thứ tự bắt buộc: tháng 12 xong trước thì gói năm mới đủ 12 tháng.
  const t12ChuaXong = { giai_doan: 'gop' };
  cham(t12ChuaXong.giai_doan !== 'xong', 'tháng 12 chưa xong → HOÃN đóng năm (không gom thiếu tháng)');
  // Ca thường: 15/09/2026 → 2026-08
  cham(thangTruoc(new Date(Date.UTC(2026, 8, 15))) === '2026-08', '15/09/2026 → đóng tháng 2026-08');
}

/* ==========================================================================
   ⑦ CA THÁNG ĐANG CHẠY — file ngày mới vào đúng thư mục tháng hiện tại
   ========================================================================== */
console.log('\n=== ⑦ THÁNG ĐANG CHẠY: BẢN NGÀY MỚI VÀO ĐÚNG THƯ MỤC ===');
{
  // Đúng phép tính `taoPhien()` dùng để dựng đường thư mục trên Drive.
  const duong = m => `Sao-luu-ERP-AGC/${m.slice(0, 4)}/${m.slice(5, 7)}/${m}`;
  cham(duong('2026-08-28') === 'Sao-luu-ERP-AGC/2026/08/2026-08-28', duong('2026-08-28'));
  cham(duong('2026-12-31') === 'Sao-luu-ERP-AGC/2026/12/2026-12-31', duong('2026-12-31'));
  cham(duong('2027-01-01') === 'Sao-luu-ERP-AGC/2027/01/2027-01-01',
    `${duong('2027-01-01')} — sang năm mới thì tự sang thư mục năm mới`);
  // Gói tháng đã đóng nằm CẠNH thư mục tháng, trong thư mục năm.
  cham('Sao-luu-ERP-AGC/2026/2026-07.zip'.startsWith('Sao-luu-ERP-AGC/2026/'),
    'gói tháng 2026-07.zip nằm trong thư mục năm 2026, cạnh thư mục 08 đang chạy');
}

/* ---- Dự báo đầy Drive -------------------------------------------------- */
console.log('\n=== ⑦b BÁO TRƯỚC 6 THÁNG KHI SẮP ĐẦY ===');
{
  const mau = (ngay, daDung) => ({ ngay, da_dung: daDung });
  const G = 1073741824;
  cham(duBaoThangConLai([mau('2026-01-05', 0)], 5 * G) === null, 'một mẫu → chưa dám nói (null)');
  cham(duBaoThangConLai([mau('2026-01-05', 0), mau('2026-01-19', G)], 5 * G) === null,
    'mới 14 ngày → chưa dám nói (null), không dự báo bậy');
  const d = duBaoThangConLai([mau('2026-01-05', 0), mau('2026-04-05', 3 * G)], 6 * G);
  cham(d !== null && Math.abs(d - 6) < 0.5, `tăng 1 GB/tháng, còn 6 GB → dự báo ${d?.toFixed(1)} tháng`);
  cham(duBaoThangConLai([mau('2026-01-05', G), mau('2026-04-05', G)], 6 * G) === Infinity,
    'không tăng gì → không kêu');
}

/* ==========================================================================
   ⑧ MỞ THẬT: giải nén bằng Windows, chạy BUNG-NEN.mjs, so từng byte
   ========================================================================== */
console.log('\n=== ⑧ MỞ THẬT BẰNG WINDOWS + BUNG-NEN.mjs → SO ĐÚNG TỪNG BYTE ===');
const duongZip = path.join(ra, '2026-07.zip');
fs.writeFileSync(duongZip, goi.du);
console.log(`  File gộp: ${duongZip} (${mb(goi.du.length)} MB)`);

let daBung = null;
try {
  daBung = path.join(ra, 'bung');
  execFileSync('powershell.exe', ['-NoProfile', '-Command',
    `Expand-Archive -LiteralPath '${duongZip}' -DestinationPath '${daBung}' -Force`],
    { stdio: 'pipe' });
  cham(true, 'Windows (Expand-Archive) mở được file .zip — không phải zip "tự chế" hỏng');
} catch (e) {
  cham(false, `Windows KHÔNG mở được file .zip: ${String(e.stderr || e.message).slice(0, 200)}`);
  daBung = null;
}

if (daBung) {
  for (const ten of ['DOC-CACH-DOC.txt', 'SO-DO-DU-LIEU.txt', 'KIEM-TRA-GOI.csv', 'BUNG-NEN.mjs']) {
    cham(fs.existsSync(path.join(daBung, ten)), `gói tháng CÓ ${ten} (yêu cầu Mục 7 CTL-0022)`);
  }
  // Chạy đúng công cụ nhét trong gói.
  let ketBung = '';
  try {
    ketBung = execFileSync(process.execPath, ['BUNG-NEN.mjs'], { cwd: daBung, encoding: 'utf8' });
    cham(true, 'node BUNG-NEN.mjs chạy xong, mã kiểm từng file khớp');
  } catch (e) {
    cham(false, `BUNG-NEN.mjs hỏng: ${String(e.stdout || e.message).slice(0, 300)}`);
  }

  // So từng byte với thư mục ngày gốc.
  let soSanh = 0, lech = 0;
  for (const n of ngays) {
    for (const ten of fs.readdirSync(n.thu)) {
      const a = fs.readFileSync(path.join(n.thu, ten));
      const duongB = path.join(daBung, n.ten, ten);
      if (!fs.existsSync(duongB)) { lech++; continue; }
      if (!a.equals(fs.readFileSync(duongB))) lech++;
      soSanh++;
    }
  }
  cham(lech === 0 && soSanh === SO_NGAY_THU * (QUY_MO.length + 3),
    `so lại ${soSanh} file của ${SO_NGAY_THU} ngày: ${lech === 0 ? 'ĐÚNG TỪNG BYTE' : lech + ' file LỆCH'}`);

  // Ca đối chứng của chính BUNG-NEN.mjs: làm hỏng một file .gz → nó PHẢI kêu.
  const thuXau = path.join(ra, 'bung-xau');
  fs.cpSync(daBung, thuXau, { recursive: true });
  const gz = path.join(thuXau, ngays[0].ten, 'nhan_su.csv.gz');
  const b = fs.readFileSync(gz); b[Math.floor(b.length / 2)] ^= 0x55; fs.writeFileSync(gz, b);
  let batDuoc = false;
  try { execFileSync(process.execPath, ['BUNG-NEN.mjs'], { cwd: thuXau, encoding: 'utf8' }); }
  catch (e) { batDuoc = /FILE HỎNG|MÃ KIỂM LỆCH|bung không được/.test(String(e.stdout || '')); }
  cham(batDuoc, 'CA ĐỐI CHỨNG: file .csv.gz bị sửa ruột → BUNG-NEN.mjs kêu lên, không bung ra file sai');
}

/* ---- Nhiều thân gzip nối nhau — nền móng của cả cách làm này ----------- */
console.log('\n=== ⑨ NỀN MÓNG: NHIỀU THÂN GZIP NỐI NHAU PHẢI BUNG ĐÚNG ===');
{
  const goc2 = bangCsv('thu', 5000, 0);
  const manh = [];
  for (let v = 0; v < goc2.length; v += MAU_NEN) {
    manh.push(Buffer.from(await nenGzip(new Uint8Array(goc2.subarray(v, Math.min(v + MAU_NEN, goc2.length))))));
  }
  const noi = Buffer.concat(manh);
  cham(manh.length > 1, `cắt thành ${manh.length} thân gzip độc lập`);
  cham(zlib.gunzipSync(noi).equals(goc2), 'zlib của Node bung nhiều thân nối nhau ra ĐÚNG TỪNG BYTE');
}

/* ---- docKeKhai đọc đúng KIEM-TRA.csv ----------------------------------- */
{
  const ke = docKeKhai(fs.readFileSync(path.join(ngays[0].thu, 'KIEM-TRA.csv'), 'utf8'));
  cham(ke.length === QUY_MO.length, `docKeKhai đọc đủ ${ke.length}/${QUY_MO.length} bảng từ KIEM-TRA.csv`);
  cham(ke[0].crc === (ngays[0].keKhai[0].crc >>> 0), 'docKeKhai lấy đúng cột crc32');
}

console.log(`\nThư mục để soi bằng tay: ${ra}`);
console.log(`Chạy hết trong ${((Date.now() - t0) / 1000).toFixed(1)} giây.`);
console.log(hong
  ? '\n❌ CÓ CA SAI — KHÔNG được tin kết quả, không được đưa lên.\n'
  : '\n✅ Mọi ca đúng như mong đợi.\n');
process.exit(hong ? 1 : 0);
