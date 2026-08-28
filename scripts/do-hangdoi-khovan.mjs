/* ==========================================================================
   ĐO LỖI #1 CỦA REV-0033 — HÀNG ĐỢI KHO VẬN KHÔNG ĐƯỢC CẮT MẤT ĐƠN CŨ
   ---------------------------------------------------------------------------
   Chạy:  npm run do-hangdoi-khovan     (node scripts/do-hangdoi-khovan.mjs)

   CHUYỆN ĐANG VÁ. REV-0031 đổi nghĩa cột `dong_bo_luc`: từ "lần cuối cron
   chạy qua" thành "lần cuối đơn này ĐỔI" (src/chi-ghi-khi-doi.js). `hoanLichSu`
   đã được đổi sang xếp theo `tao_luc_shopee`, NHƯNG `apiDanhSach` trong
   src/shopee.js — MÀN KHO VẬN, hàng đợi việc thật của kho — bị bỏ sót: nó
   vẫn `ORDER BY d.dong_bo_luc DESC LIMIT 300`.

   VÌ SAO ĐÓ LÀ LỖI CHẶN: trước khi đổi nghĩa, mọi dòng cùng một giá trị nên
   `LIMIT 300` cắt NGẪU NHIÊN. Sau khi đổi nghĩa, 300 dòng giữ lại là 300 đơn
   ĐỔI GẦN NHẤT, còn đơn bị cắt là đơn LÂU NHẤT KHÔNG ĐỔI — tức ĐÚNG những
   ĐƠN TỒN QUÁ HẠN mà kho cần thấy nhất. Cắt ngẫu nhiên hoá thành cắt THIÊN VỊ
   CÓ HỆ THỐNG chống lại đường tiền. Vá: bỏ `LIMIT`.

   ĐO THẬT, KHÔNG CHÉP LẠI (BH-34): bàn thử BÓC ĐÚNG câu SELECT đang chạy
   trong `src/shopee.js` rồi chạy nó trên SQLite dựng từ ĐÚNG `migrations/`
   của repo. Không gõ lại một dòng SQL nào — bóc hụt là dừng với mã lỗi 2.

   BỐN CÂU HỎI PHẢI TRẢ LỜI BẰNG SỐ:
     ① Dựng >300 đơn, phần lớn KHÔNG đổi — đơn tồn lâu nhất còn hiện không?
     ② 25 đơn QUÁ HẠN 12h (cho_kho_nhan_tu cũ) có hiện đủ không?
     ③ ĐỐI CHỨNG (BH-16): giữ `LIMIT 300` thì phép đo có BẮT ĐƯỢC không?
        Không bắt được thì phép đo này vô giá trị -> phải TRƯỢT.
     ④ Bỏ `LIMIT` có làm lọt đơn KHÔNG thuộc hàng đợi kho không? (phải = 0)
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
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

/* ---- Bóc câu SELECT THẬT của màn Kho vận ra khỏi mã nguồn --------------- */
/** Template literal chứa `FROM don_hoan d` VÀ `dang_cho = 'kho'` — chỉ có
 *  đúng một chỗ như vậy trong repo: apiDanhSach (src/shopee.js). */
function bocSelectKhoVan() {
  const src = doc('src/shopee.js');
  const moi = [...src.matchAll(/`\s*\n\s*SELECT[\s\S]*?`/g)]
    .map(m => m[0].slice(1, -1))
    .filter(s => /FROM\s+don_hoan\s+d\b/.test(s) && /d\.dang_cho\s*=\s*'kho'/.test(s));
  if (moi.length !== 1) {
    chet(`bóc được ${moi.length} câu SELECT hàng đợi kho trong src/shopee.js (cần đúng 1) ` +
         `— mã đã đổi chỗ, sửa regex rồi chạy lại chứ ĐỪNG chép SQL vào đây`);
  }
  return moi[0];
}
const SQL_KHO_VAN = bocSelectKhoVan();

/* ---- Dựng CSDL từ ĐÚNG migrations của repo ------------------------------ */
function tachCau(sql) {
  const ra = [];
  let cau = '';
  for (const dong of sql.split('\n')) {
    const sach = dong.replace(/--.*$/, '');
    if (!sach.trim() && !cau.trim()) continue;
    cau += sach + '\n';
    if (/;\s*$/.test(sach.trim())) { ra.push(cau); cau = ''; }
  }
  if (cau.trim()) ra.push(cau);
  return ra;
}

function dungDB() {
  const db = new DatabaseSync(':memory:');
  for (const f of ['them-shopee.sql', 'them-sku-map.sql']) {
    for (const c of tachCau(doc('migrations/' + f))) {
      try { db.exec(c); } catch (e) {
        if (!/already exists|duplicate column/i.test(e.message)) chet(`${f}: ${e.message}`);
      }
    }
  }
  /* Mọi cột `don_hoan` được thêm về sau — lấy THẲNG từ migrations, không liệt
     kê tay, để bàn đo luôn khớp cấu trúc bảng thật. */
  let soAlter = 0;
  for (const f of readdirSync(path.join(GOC, 'migrations')).filter(f => f.endsWith('.sql'))) {
    for (const d of doc('migrations/' + f).split('\n')) {
      if (!/^\s*ALTER TABLE don_hoan ADD COLUMN/i.test(d)) continue;
      const cau = d.split('--')[0].trim();
      try { db.exec(cau.endsWith(';') ? cau : cau + ';'); soAlter++; } catch { /* đã có cột */ }
    }
  }
  if (soAlter < 20) chet(`chỉ nạp được ${soAlter} cột ALTER cho don_hoan — migrations đổi chỗ?`);
  return db;
}

/* ---- Dữ liệu thử: hàng đợi kho > 300 đơn -------------------------------- */
const SO_TRONG_HANG_DOI = 400;   // > 300 để trần cũ chắc chắn cắt
const SO_QUA_HAN = 25;           // đơn đã quá 12h chưa nhận — đường tiền
const NGAY = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 19).replace('T', ' ');
const GIO = (n) => new Date(Date.now() - n * 3600000).toISOString().slice(0, 19).replace('T', ' ');

/** Chèn 1 đơn hoàn. `doi` ghi đè bất kỳ cột nào. */
function chen(db, i, doi = {}) {
  const r = {
    return_sn: 'RT' + String(i).padStart(6, '0'),
    order_sn: 'OD' + String(i).padStart(6, '0'),
    trang_thai: 'PROCESSING', ly_do: 'DIFFERENT_DESC', so_tien: 12300000,
    tien_te: 'VND', nguoi_mua: 'khach' + i,
    san_pham: 'CBYM-4V ×1', san_pham_ten: 'Hạt điều rang muối', san_pham_sku: null,
    so_luong: 1, ma_van_don: 'SPX' + i, nguon: 'shopee',
    tao_luc_shopee: '1755000000', cap_nhat_shopee: '1756000000',
    du_lieu_json: '{}', dang_cho: 'kho', kho_nhan_luc: null,
    cho_kho_nhan_tu: GIO(1), dong_bo_luc: GIO(0), ...doi
  };
  const cot = Object.keys(r);
  db.prepare(`INSERT INTO don_hoan (${cot.join(',')}) VALUES (${cot.map(() => '?').join(',')})`)
    .run(...cot.map(c => r[c]));
  return r.return_sn;
}

function dungHangDoi(db) {
  const qua = [];
  /* 1 đơn TỒN LÂU NHẤT: 45 ngày không hề đổi -> `dong_bo_luc` cũ nhất bảng. */
  const cuNhat = chen(db, 1, { dong_bo_luc: NGAY(45), cho_kho_nhan_tu: NGAY(45), trang_thai: 'ACCEPTED' });
  /* 25 đơn QUÁ HẠN 12h, cũng lâu không đổi (30..6 ngày). */
  for (let i = 2; i <= 1 + SO_QUA_HAN; i++) {
    qua.push(chen(db, i, { dong_bo_luc: NGAY(30 - i * 0.9), cho_kho_nhan_tu: NGAY(30 - i * 0.9) }));
  }
  /* Phần còn lại: đơn mới đổi trong vài giờ qua -> chiếm hết 300 chỗ đầu. */
  for (let i = 1 + SO_QUA_HAN + 1; i <= SO_TRONG_HANG_DOI; i++) {
    chen(db, i, { dong_bo_luc: GIO((i % 20) / 10) });
  }
  /* NHIỄU — 4 loại đơn KHÔNG được hiện ở màn kho, mỗi loại 1 đơn, đều rất
     "mới đổi" để nếu lọt là lọt lên đầu (dễ bắt). */
  const nhieu = {
    'kho đã nhận rồi': chen(db, 9001, { kho_nhan_luc: GIO(0), dong_bo_luc: GIO(0) }),
    'đang ở sân Vận hành sàn': chen(db, 9002, { dang_cho: 'van_hanh', dong_bo_luc: GIO(0) }),
    'huỷ, KHÔNG có mã vận đơn': chen(db, 9003, { trang_thai: 'CANCELLED', ma_van_don: null, dong_bo_luc: GIO(0) }),
    'đã sang Kế toán': chen(db, 9004, { dang_cho: 'ke_toan', dong_bo_luc: GIO(0) })
  };
  /* Đơn huỷ NHƯNG có mã vận đơn thì VẪN phải hiện (hàng vật lý đang về kho). */
  const huyCoHang = chen(db, 9005, { trang_thai: 'CANCELLED', ma_van_don: 'SPX9005', dong_bo_luc: NGAY(40) });
  return { cuNhat, qua, nhieu, huyCoHang };
}

const chay1 = (db, sql) => db.prepare(sql).all().map(r => r.return_sn);

async function chay() {
  console.log('='.repeat(74));
  console.log('ĐO REV-0033 lỗi #1 — hàng đợi Kho vận không được cắt mất đơn cũ');
  console.log('='.repeat(74));

  /* --- A · Câu SQL bóc ra có đúng là bản ĐÃ VÁ không -------------------- */
  console.log('\nA · Câu SELECT bóc thẳng từ src/shopee.js (apiDanhSach)');
  ok('xếp theo dong_bo_luc DESC (giữ nguyên thứ tự hiển thị cho kho)',
    /ORDER BY\s+d\.dong_bo_luc\s+DESC/.test(SQL_KHO_VAN));
  ok('KHÔNG còn mệnh đề LIMIT', !/\bLIMIT\b/i.test(SQL_KHO_VAN));

  /* Quét toàn bộ src: không chỗ nào được vừa xếp theo dong_bo_luc vừa cắt.
     Bỏ chú thích trước khi quét (nhiều file GIẢI THÍCH chính cái bẫy này) —
     xoá bằng cách thay ký tự chú thích bằng khoảng trắng để giữ nguyên số dòng. */
  const boChuThich = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/[^\n]*$/gm, '');   // chỉ xoá dòng chú thích TRỌN VẸN, không cắt giữa dòng
  const quet = (ten, nguon) => {
    const dong = boChuThich(nguon).split('\n');
    const ra = [];
    dong.forEach((d, i) => {
      if (!/ORDER BY[^\n]*dong_bo_luc/i.test(d)) return;
      const khoi = [d, dong[i + 1] || '', dong[i + 2] || ''].join(' ');   // LIMIT hay xuống dòng
      if (/\bLIMIT\b/i.test(khoi)) ra.push(`${ten}:${i + 1}`);
    });
    return ra;
  };
  const phamQuy = readdirSync(path.join(GOC, 'src')).filter(f => f.endsWith('.js'))
    .flatMap(f => quet('src/' + f, doc('src/' + f)));
  ok('quét toàn src/: KHÔNG còn chỗ nào "ORDER BY dong_bo_luc … LIMIT"',
    phamQuy.length === 0, phamQuy.join(', ') || 'sạch');
  /* Máy quét phải TỰ CHỨNG MINH nó bắt được, nếu không "sạch" là vô nghĩa. */
  ok('ĐỐI CHỨNG · máy quét bắt được mẫu vi phạm giả (cả khi LIMIT xuống dòng)',
    quet('gia.js', 'x = `ORDER BY d.dong_bo_luc DESC\n LIMIT 300`;').length === 1 &&
    quet('gia.js', '/* ORDER BY d.dong_bo_luc DESC LIMIT 300 chỉ là chú thích */').length === 0);

  /* --- B · Hàng đợi > 300 đơn, phần lớn không đổi ----------------------- */
  console.log(`\nB · Dựng ${SO_TRONG_HANG_DOI} đơn trong hàng đợi kho (+5 đơn nhiễu)`);
  const db = dungDB();
  const { cuNhat, qua, nhieu, huyCoHang } = dungHangDoi(db);
  const ra = chay1(db, SQL_KHO_VAN);

  ok(`trả về đủ ${SO_TRONG_HANG_DOI + 1} đơn của hàng đợi (400 + 1 đơn huỷ có hàng về)`,
    ra.length === SO_TRONG_HANG_DOI + 1, `thực nhận ${ra.length}`);
  ok('ĐƠN TỒN LÂU NHẤT (45 ngày không đổi) VẪN HIỆN',
    ra.includes(cuNhat), `${cuNhat} ở vị trí ${ra.indexOf(cuNhat) + 1}/${ra.length}`);
  ok('đơn tồn lâu nhất nằm CUỐI danh sách (thứ tự hiển thị không đổi)',
    ra[ra.length - 1] === cuNhat, ra[ra.length - 1]);
  ok(`đủ ${SO_QUA_HAN} đơn QUÁ HẠN 12h chưa nhận đều hiện`,
    qua.every(r => ra.includes(r)),
    `thiếu ${qua.filter(r => !ra.includes(r)).length}`);
  ok('đơn HUỶ nhưng có mã vận đơn (hàng vật lý đang về) vẫn hiện',
    ra.includes(huyCoHang));

  console.log('\nC · Bỏ LIMIT KHÔNG được kéo theo đơn ngoài hàng đợi');
  for (const [ten, rsn] of Object.entries(nhieu)) {
    ok(`đơn "${ten}" KHÔNG lọt vào màn kho`, !ra.includes(rsn));
  }

  /* --- D · ĐỐI CHỨNG: giữ LIMIT thì phép đo phải BẮT ĐƯỢC (BH-16) ------- */
  console.log('\nD · ĐỐI CHỨNG — gắn lại "LIMIT 300" vào ĐÚNG câu SQL vừa bóc');
  const raCu = chay1(db, SQL_KHO_VAN + '\n LIMIT 300');
  ok('bản có LIMIT chỉ trả 300 dòng', raCu.length === 300, `thực nhận ${raCu.length}`);
  ok('bản có LIMIT LÀM MẤT đơn tồn lâu nhất -> phép đo NHẠY THẬT',
    !raCu.includes(cuNhat), 'đơn 45 ngày bị cắt khỏi màn kho');
  const quaMat = qua.filter(r => !raCu.includes(r));
  ok(`bản có LIMIT còn nuốt ${quaMat.length}/${SO_QUA_HAN} đơn QUÁ HẠN 12h`,
    quaMat.length > 0, quaMat.slice(0, 3).join(', ') + (quaMat.length > 3 ? '…' : ''));
  ok('bản có LIMIT vẫn giữ đủ đơn MỚI ĐỔI -> đúng là cắt THIÊN VỊ, không ngẫu nhiên',
    raCu.filter(r => !qua.includes(r) && r !== cuNhat && r !== huyCoHang).length === 300);

  /* --- E · Chỗ đã sửa vòng trước không được lùi ------------------------- */
  console.log('\nE · hoanLichSu (index.js) — chỗ đã sửa ở REV-0031 vẫn đứng');
  const lichSu = [...doc('src/index.js').matchAll(/`\s*\n\s*SELECT[\s\S]*?`/g)]
    .map(m => m[0]).filter(s => /FROM\s+don_hoan\s+d\b/.test(s) && /\bLIMIT 500\b/.test(s));
  if (lichSu.length !== 1) chet(`bóc được ${lichSu.length} câu hoanLichSu (cần đúng 1)`);
  ok('hoanLichSu xếp theo tao_luc_shopee, KHÔNG theo dong_bo_luc',
    /ORDER BY\s+CAST\(d\.tao_luc_shopee/.test(lichSu[0]) &&
    !/ORDER BY[^\n]*dong_bo_luc/.test(lichSu[0]));

  console.log('\n' + '='.repeat(74));
  console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
  return truot === 0;
}

chay().then(d => process.exit(d ? 0 : 1))
      .catch(e => { console.error('\nBÀN ĐO HỎNG:', e.stack || e.message); process.exit(2); });
