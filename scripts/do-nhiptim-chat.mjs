/* ==========================================================================
   ĐO VIỆC 2 — NHỊP TIM CHAT: hai lớp chặn ghi, và không được mất tin
   ---------------------------------------------------------------------------
   Chạy:  npm run do-nhiptim         (node scripts/do-nhiptim-chat.mjs)

   CHUYỆN ĐANG VÁ (REV-0031 §0.4). Vòng lặp 6 giây của chat gửi cờ `dang_mo=1`,
   máy chủ lấy cờ đó GHI một dòng vào `tai_khoan`. Bản trước: mỗi lượt hỏi là
   một dòng ghi, KHÔNG có trần, và ở trình duyệt thì KHÔNG có `clearInterval`,
   KHÔNG nghe `visibilitychange`, KHÔNG biết giờ làm. Một máy bàn ở kho để
   quên cửa sổ chat qua 3 ngày nghỉ = 43.200 dòng ghi, trong khi cả hệ thống
   chỉ được 100.000 dòng/ngày.

   HAI LỚP, đo riêng từng lớp:
     ① MÁY CHỦ (`src/index.js`) — mệnh đề WHERE chỉ cho đóng dấu 30 giây/lần.
        Đây là lớp KHÔNG LÁCH ĐƯỢC: sửa trình duyệt cũng vô ích.
     ② TRÌNH DUYỆT (`public/assets/js/nhip-tim-chat.js`) — tab ẩn / ngồi không
        5 phút thì dừng hẳn vòng lặp; ngoài giờ làm thì vẫn hỏi tin nhưng
        không đóng dấu.

   ĐO THẬT (BH-34): câu SQL được BÓC ĐÚNG TỪ `src/index.js` và chạy trên
   SQLite; các hàm quyết định được NẠP THẲNG từ file mà trình duyệt đang dùng.
   Bóc hụt là dừng với mã lỗi 2.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = (p) => readFileSync(path.join(GOC, p), 'utf8');

let dat = 0, truot = 0;
function ok(ten, dung, chiTiet = '') {
  if (dung) { dat++; console.log(`  ✅ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
  else { truot++; console.log(`  ❌ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
}
function chet(vi) { console.error('\nBÀN ĐO HỎNG: ' + vi); process.exit(2); }

/* ---- Bóc câu nhịp tim THẬT ra khỏi src/index.js ------------------------- */
const src = doc('src/index.js');
const m = src.match(/`(\s*UPDATE tai_khoan SET xem_chat_voi[\s\S]*?)`/);
if (!m) chet('không bóc được lệnh nhịp tim trong src/index.js — mã đã đổi chỗ');
const SQL_NHIP = m[1];
/** Bản TRƯỚC KHI VÁ: cắt bỏ đúng phần điều kiện 30 giây, giữ nguyên phần còn lại. */
const SQL_CU = SQL_NHIP.replace(/\s*AND \(xem_chat_luc IS NULL[\s\S]*?\)\s*$/, '\n');
if (SQL_CU === SQL_NHIP) chet('không cắt được mệnh đề chặn — đối chứng vô nghĩa');

function dungDB() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE tai_khoan (
             id INTEGER PRIMARY KEY, nhan_su_id TEXT UNIQUE,
             xem_chat_voi TEXT, xem_chat_luc TEXT);`);
  db.prepare('INSERT INTO tai_khoan (nhan_su_id) VALUES (?)').run('NS-LAN');
  return db;
}
/** Một lượt hỏi tin có kèm cờ `dang_mo=1`. Trả về số dòng đã ghi. */
function motLuot(db, sql, voi) {
  return db.prepare(sql).run(voi, 'NS-LAN', voi).changes;
}
function motLuotCu(db, voi) {
  return db.prepare(SQL_CU).run(voi, 'NS-LAN').changes;
}

const CON_DANG_XEM_GIAY = Number((doc('src/day-thong-bao.js')
  .match(/CON_DANG_XEM_GIAY\s*=\s*(\d+)/) || [])[1]);
if (!CON_DANG_XEM_GIAY) chet('không đọc được CON_DANG_XEM_GIAY trong src/day-thong-bao.js');

async function chay() {
  console.log('='.repeat(74));
  console.log('ĐO VIỆC 2 — nhịp tim chat: chặn ở máy chủ + tắt ở trình duyệt');
  console.log('='.repeat(74));

  /* --- A · Lớp máy chủ --------------------------------------------------- */
  console.log('\nA · Máy chủ — 100 lượt hỏi liên tiếp thì ghi mấy dòng');
  const db = dungDB();
  let n = 0;
  for (let i = 0; i < 100; i++) n += motLuot(db, SQL_NHIP, 'NS-DUY');
  ok('100 lượt hỏi (cùng người chat, trong 30 giây) → ghi ĐÚNG 1 dòng', n === 1, `${n} dòng`);

  const db2 = dungDB();
  let nCu = 0;
  for (let i = 0; i < 100; i++) nCu += motLuotCu(db2, 'NS-DUY');
  ok('ĐỐI CHỨNG · bản TRƯỚC KHI VÁ ghi đủ 100 dòng (tái hiện đúng lỗi)',
    nCu === 100, `${nCu} dòng — gấp ${nCu / Math.max(n, 1)} lần bản đã vá`);

  console.log('\nB · Không được hỏng tính năng: đóng dấu vẫn phải KỊP');
  ok('ĐỔI NGƯỜI ĐANG CHAT → đóng dấu NGAY, không đợi hết 30 giây',
    motLuot(db, SQL_NHIP, 'NS-HANG') === 1);
  ok('  hỏi lại ngay sau đó cho cùng người mới → không ghi thêm',
    motLuot(db, SQL_NHIP, 'NS-HANG') === 0);
  ok('về KÊNH CHUNG (người nhận = NULL) cũng đóng dấu ngay (so bằng IS NOT, an toàn NULL)',
    motLuot(db, SQL_NHIP, null) === 1);
  db.prepare("UPDATE tai_khoan SET xem_chat_luc = datetime('now','-31 seconds')").run();
  ok('quá 30 giây → mốc được làm mới lại (không đóng băng vĩnh viễn)',
    motLuot(db, SQL_NHIP, null) === 1);
  ok(`30 giây < CON_DANG_XEM_GIAY = ${CON_DANG_XEM_GIAY}s → còn dư ${CON_DANG_XEM_GIAY - 30}s, ` +
     'không ai bị đẩy thông báo oan', CON_DANG_XEM_GIAY > 30, `dư ${CON_DANG_XEM_GIAY - 30} giây`);

  /* --- C · Lớp trình duyệt ---------------------------------------------- */
  console.log('\nC · Trình duyệt — ba chốt trong public/assets/js/nhip-tim-chat.js');
  const N = await import('file://' +
    path.join(GOC, 'public/assets/js/nhip-tim-chat.js').replace(/\\/g, '/'));
  const THU5_10H = Date.UTC(2026, 7, 27, 3, 0, 0);    // 10h00 thứ Năm giờ VN
  const THU5_22H = Date.UTC(2026, 7, 27, 15, 0, 0);   // 22h00 thứ Năm giờ VN
  const CN_10H = Date.UTC(2026, 7, 30, 3, 0, 0);      // 10h00 Chủ nhật giờ VN

  ok('trong giờ làm (10h thứ Năm) → được đóng dấu',
    N.nenDongDau({ dangMo: true, tabHien: true, hoatDongCachDay: 0, luc: THU5_10H }) === true);
  ok('TAB ẨN → dừng hẳn vòng lặp, không hỏi không ghi',
    N.nenChayVongLap({ tabHien: false, hoatDongCachDay: 0 }) === false &&
    N.nenDongDau({ dangMo: true, tabHien: false, hoatDongCachDay: 0, luc: THU5_10H }) === false);
  ok(`NGỒI KHÔNG quá ${N.IDLE_PHUT} phút (máy bàn bỏ quên, tab vẫn HIỆN) → dừng vòng lặp`,
    N.nenChayVongLap({ tabHien: true, hoatDongCachDay: (N.IDLE_PHUT + 1) * 60000 }) === false);
  ok(`  vừa chạm máy (${N.IDLE_PHUT - 1} phút trước) → vẫn chạy bình thường`,
    N.nenChayVongLap({ tabHien: true, hoatDongCachDay: (N.IDLE_PHUT - 1) * 60000 }) === true);
  ok('NGOÀI GIỜ (22h) → KHÔNG đóng dấu, nhưng VẪN hỏi tin (chat không bị chết)',
    N.nenDongDau({ dangMo: true, tabHien: true, hoatDongCachDay: 0, luc: THU5_22H }) === false &&
    N.nenChayVongLap({ tabHien: true, hoatDongCachDay: 0 }) === true);
  ok('CHỦ NHẬT → không đóng dấu (ADR-0013); thứ Bảy thì vẫn tính là ngày làm',
    N.trongGioLam(CN_10H) === false && N.trongGioLam(Date.UTC(2026, 7, 29, 3)) === true);
  ok('cửa sổ chat ĐÓNG → không đóng dấu dù mọi thứ khác đều đúng',
    N.nenDongDau({ dangMo: false, tabHien: true, hoatDongCachDay: 0, luc: THU5_10H }) === false);

  /* --- D · app.js có THẬT SỰ gọi những thứ đó không ---------------------- */
  console.log('\nD · app.js có thật sự dùng ba chốt đó không (đúng lỗi Hồ Ly nêu)');
  const app = doc('public/assets/js/app.js');
  ok('có `clearInterval` cho vòng lặp chat (trước bản này KHÔNG hề có)',
    /function tatNhipTin\(\)\s*\{\s*clearInterval\(nhipTin\)/.test(app));
  ok('có nghe `visibilitychange`', /addEventListener\('visibilitychange'/.test(app));
  ok('có đo hoạt động của người dùng để biết máy bị bỏ quên',
    /'pointerdown', 'keydown'/.test(app));
  ok('cờ `dang_mo` gửi lên máy chủ đi qua `dongDauDuoc()`, không phải biến `dangMo` trần',
    !/chatDanhSach\([^)]*,\s*dangMo\)/.test(app) &&
    (app.match(/chatDanhSach\([^)]*dongDauDuoc\(\)\)/g) || []).length === 2,
    'cả 2 lời gọi chatDanhSach');
  ok('KHÔNG tắt `hoiChuaDocToanCuc` (SELECT thuần — nó dựng thông báo lúc tab ẩn)',
    /setInterval\(hoiChuaDocToanCuc, 6000\)/.test(app));

  /* --- E · Con số cuối --------------------------------------------------- */
  console.log('\nE · Máy bàn ở kho bỏ quên cửa sổ chat qua 3 ngày nghỉ');
  const luotHoi3Ngay = 3 * 24 * 3600 / 6;
  console.log(`  trước:  ${luotHoi3Ngay} lượt hỏi = ${luotHoi3Ngay} dòng ghi`);
  console.log('  sau:    0 dòng ghi (ngồi không > 5 phút → vòng lặp tự tắt;' +
              ' kể cả nếu chạy thì ngoài giờ làm cũng không đóng dấu)');
  console.log('  trần xấu nhất còn lại (20 người mở chat suốt 8h–18h, ngồi liên tục):');
  const tran = 20 * (10 * 3600 / 30);
  console.log(`          20 người × 10 giờ × 2 dòng/phút = ${tran} dòng/ngày`);
  ok('trần xấu nhất vẫn dưới hạn mức 100.000 dòng/ngày', tran < 100000, `${tran} dòng`);

  console.log('\n' + '='.repeat(74));
  console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
  return truot === 0;
}

chay().then(d => process.exit(d ? 0 : 1))
      .catch(e => { console.error('\nBÀN ĐO HỎNG:', e.stack || e.message); process.exit(2); });
