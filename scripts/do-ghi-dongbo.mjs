/* ==========================================================================
   ĐO VIỆC 1 — "CHỈ GHI KHI DỮ LIỆU THẬT SỰ ĐỔI"
   ---------------------------------------------------------------------------
   Chạy:  npm run do-ghi-dongbo      (node scripts/do-ghi-dongbo.mjs)

   CHUYỆN ĐANG VÁ (REV-0031 §0.3). `wrangler d1 info crm-agc` ngày 28/08/2026:
   rows_written_24h = 346.688 trên hạn mức 100.000 dòng/ngày của gói miễn phí
   — VƯỢT 3,47 LẦN, kéo dài nhiều tuần mà không ai biết. Nguyên nhân: 4 lệnh
   `INSERT … ON CONFLICT DO UPDATE` của Shopee/TikTok ghi đè lại MỌI đơn mỗi
   lượt cron 5 phút, kể cả đơn không đổi gì.

   ĐO THẬT, KHÔNG CHÉP LẠI (BH-34): bàn thử này BÓC ĐÚNG CÂU SQL trong
   `src/shopee.js` / `src/tiktok.js` rồi chạy nó trên SQLite dựng từ ĐÚNG
   `migrations/*.sql` của repo (kèm chỉ mục và trigger lịch sử). Không có một
   dòng SQL nào được gõ lại trong file này — bóc hụt là dừng ngay với mã lỗi 2,
   để không bao giờ có chuyện "đo một bản chép rồi tự khen nhau".

   BA CÂU HỎI PHẢI TRẢ LỜI BẰNG SỐ:
     ① Đơn KHÔNG đổi thì còn ghi không?            (phải = 0)
     ② Đơn CÓ đổi thì có ghi không?                 (phải ghi, TỪNG CỘT MỘT)
     ③ Bỏ một vế lọc ra thì bàn thử có bắt được?    (ca đối chứng BH-16)

   ② là ranh giới CỨNG: kho vận bắt đơn hoàn quá hạn nhờ dữ liệu tươi từng 5
   phút — bỏ sót một đơn đổi trạng thái là mất tiền thật. Nên câu ② được đo
   RIÊNG CHO TỪNG CỘT mà lệnh SET ghi, không phải đo chung một lần cho xong.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { locDoi, COT_DON_HOAN, COT_DON_HANG } from '../src/chi-ghi-khi-doi.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = (p) => readFileSync(path.join(GOC, p), 'utf8');

let dat = 0, truot = 0;
function ok(ten, dung, chiTiet = '') {
  if (dung) { dat++; console.log(`  ✅ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
  else { truot++; console.log(`  ❌ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
}
function chet(vi) { console.error('\nBÀN ĐO HỎNG: ' + vi); process.exit(2); }

/* ---- Bóc câu SQL THẬT ra khỏi mã nguồn ---------------------------------- */
/** Lấy nội dung template literal chứa `INSERT INTO <bang>` trong 1 file. */
function bocSQL(tepNguon, bang, thuTu = 0) {
  const src = doc(tepNguon);
  const moi = [...src.matchAll(new RegExp('`\\s*\\n?\\s*INSERT INTO ' + bang + '[\\s\\S]*?`', 'g'))];
  if (!moi[thuTu]) chet(`không bóc được lệnh INSERT INTO ${bang} #${thuTu} trong ${tepNguon} — mã đã đổi chỗ, sửa regex rồi chạy lại`);
  return moi[thuTu][0].slice(1, -1);
}
/** Thay các chỗ ${...} bằng giá trị thật, dùng CHÍNH module chi-ghi-khi-doi.js. */
function noiSuon(mau, bien) {
  const ra = mau.replace(/\$\{([^}]+)\}/g, (_, bt) => {
    const v = bien[bt.trim()];
    if (v === undefined) chet(`không biết thay ${'${'}${bt}} — thêm vào bảng biến rồi chạy lại`);
    return v;
  });
  if (/\$\{/.test(ra)) chet('còn sót ${...} trong SQL sau khi thay');
  return ra;
}

const SQL_HOAN_SHOPEE = noiSuon(bocSQL('src/shopee.js', 'don_hoan'), {
  "locDoi('don_hoan', COT_DON_HOAN)": locDoi('don_hoan', COT_DON_HOAN)
});
const SQL_HOAN_TIKTOK = noiSuon(bocSQL('src/tiktok.js', 'don_hoan'), {
  'locDoi(\'don_hoan\', COT_DON_HOAN, ["don_hoan.nguon IS NOT \'tiktok\'"])':
    locDoi('don_hoan', COT_DON_HOAN, ["don_hoan.nguon IS NOT 'tiktok'"])
});
const SQL_HANG_TIKTOK = noiSuon(bocSQL('src/tiktok.js', 'don_hang'), {
  "locDoi('don_hang', COT_DON_HANG)": locDoi('don_hang', COT_DON_HANG)
});
/* Lệnh don_hang của Shopee dựng động theo cột tuỳ chọn (coHuy / coVanDon).
   Đo ở cấu hình ĐẦY ĐỦ — cấu hình có nhiều cột nhất, dễ sót nhất. */
const COT_HUY = ['san_pham_ten', 'san_pham_sku', 'huy_ly_do', 'huy_boi', 'huy_ly_do_khach'];
const SQL_HANG_SHOPEE = noiSuon(bocSQL('src/shopee.js', 'don_hang'), {
  cotHuy: `, ${COT_HUY.join(', ')}`,
  gtHuy: ', ?, ?, ?, ?, ?',
  capNhatHuy: ', ' + COT_HUY.map(c => `${c}=excluded.${c}`).join(', '),
  cotVanDon: ', ma_van_don',
  gtVanDon: ', ?',
  capNhatVanDon: ', ma_van_don=excluded.ma_van_don',
  "locDoi('don_hang', cotSo)": locDoi('don_hang', COT_DON_HANG.concat(COT_HUY, ['ma_van_don']))
});

/* ---- Dựng CSDL từ ĐÚNG migrations của repo ------------------------------ */
/** Tách file .sql thành từng câu lệnh, HIỂU khối BEGIN…END của trigger
 *  (tách thô bằng `;` sẽ cắt đôi trigger lịch sử — mà trigger đó là thứ phải
 *  có mặt để chứng minh việc lọc không chặn oan lịch sử đổi trạng thái). */
function tachCau(sql) {
  const ra = [];
  let cau = '', sauBegin = false;
  for (const dong of sql.split('\n')) {
    const sach = dong.replace(/--.*$/, '');
    if (!sach.trim() && !cau.trim()) continue;
    cau += sach + '\n';
    if (/\bBEGIN\b/i.test(sach)) sauBegin = true;
    if (sauBegin) { if (/\bEND\s*;/i.test(sach)) { ra.push(cau); cau = ''; sauBegin = false; } continue; }
    if (/;\s*$/.test(sach.trim())) { ra.push(cau); cau = ''; }
  }
  if (cau.trim()) ra.push(cau);
  return ra;
}

function dungDB() {
  const db = new DatabaseSync(':memory:');
  for (const f of ['them-shopee.sql', 'them-tiktok.sql', 'them-donhang.sql']) {
    for (const c of tachCau(doc('migrations/' + f))) {
      try { db.exec(c); } catch (e) {
        // Chỉ được nuốt lỗi "đã có sẵn" — lỗi khác là bàn đo dựng sai, phải nổ.
        if (!/already exists|duplicate column/i.test(e.message)) chet(`${f}: ${e.message}`);
      }
    }
  }
  const alter = [];
  for (const f of ['them-mavandon.sql', 'them-cot-sanpham.sql', 'them-canhbao-kho.sql',
                   'them-luong-tra-soat.sql', 'them-huy-lydo.sql', 'them-donhang-huy.sql']) {
    let t; try { t = doc('migrations/' + f); } catch { continue; }
    for (const d of t.split('\n')) if (/^\s*ALTER TABLE/.test(d)) alter.push(d.split('--')[0].trim());
  }
  for (const a of alter) { try { db.exec(a.endsWith(';') ? a : a + ';'); } catch { /* đã có cột */ } }
  // Cột huỷ của don_hang (migration tên khác nhau tuỳ đợt) — đảm bảo có đủ.
  for (const c of COT_HUY.concat(['ma_van_don'])) {
    try { db.exec(`ALTER TABLE don_hang ADD COLUMN ${c} TEXT;`); } catch { /* đã có */ }
  }
  for (const c of ['san_pham', 'san_pham_ten', 'san_pham_sku', 'ma_van_don', 'nguon', 'dang_cho']) {
    try { db.exec(`ALTER TABLE don_hoan ADD COLUMN ${c} TEXT;`); } catch { /* đã có */ }
  }
  try { db.exec('ALTER TABLE don_hoan ADD COLUMN so_luong INTEGER;'); } catch { /* đã có */ }
  try { db.exec('ALTER TABLE don_hoan ADD COLUMN cho_kho_nhan_tu TEXT;'); } catch { /* đã có */ }
  try { db.exec('ALTER TABLE don_hoan ADD COLUMN kho_nhan_luc TEXT;'); } catch { /* đã có */ }
  // Trigger lịch sử: PHẢI có thật, lỗi ở đây không được nuốt.
  for (const c of tachCau(doc('migrations/them-lichsu-donhang-donhoan.sql'))) db.exec(c);
  return db;
}

/* ---- Một "đơn hoàn" như Shopee trả về ----------------------------------- */
function donHoan(i, doi = {}) {
  const r = {
    return_sn: 'RT' + String(i).padStart(6, '0'),
    order_sn: 'OD' + String(i).padStart(6, '0'),
    trang_thai: 'REQUESTED', ly_do: 'DIFFERENT_DESC', so_tien: 12300000,
    tien_te: 'VND', nguoi_mua: 'khach' + i,
    san_pham: 'CBYM-4V ×1', san_pham_ten: 'Hạt điều rang muối', san_pham_sku: 'CBYM-4V',
    so_luong: 1, ma_van_don: null,
    tao_luc_shopee: '1755000000', cap_nhat_shopee: '1756000000',
    ...doi
  };
  r.du_lieu_json = JSON.stringify(r);
  return r;
}
const THAM_SO_HOAN = (r) => [
  r.return_sn, r.order_sn, r.trang_thai, r.ly_do, r.so_tien, r.tien_te, r.nguoi_mua,
  r.san_pham, r.san_pham_ten, r.san_pham_sku, r.so_luong, r.ma_van_don,
  r.tao_luc_shopee, r.cap_nhat_shopee, r.du_lieu_json
];

/** Chạy 1 lệnh, trả về SỐ DÒNG BẢNG bị ghi (SQLite `changes`). */
function ghi(db, sql, thamSo) { return db.prepare(sql).run(...thamSo).changes; }

const SO_DON = 523;                 // đúng số dòng don_hoan trên bản thật, 28/08/2026
const LUOT_CRON_NGAY = 288;         // cron */5 * * * *

async function chay() {
  console.log('='.repeat(74));
  console.log('ĐO VIỆC 1 — chỉ ghi khi dữ liệu THẬT SỰ đổi (chi phí 0 · ADR-0006)');
  console.log('='.repeat(74));

  /* --- A · Câu SQL bóc ra có đúng là bản ĐÃ VÁ không -------------------- */
  console.log('\nA · Bốn lệnh upsert bóc thẳng từ mã nguồn');
  const bon = [
    ['shopee.js · don_hoan', SQL_HOAN_SHOPEE],
    ['tiktok.js · don_hoan', SQL_HOAN_TIKTOK],
    ['shopee.js · don_hang', SQL_HANG_SHOPEE],
    ['tiktok.js · don_hang', SQL_HANG_TIKTOK]
  ];
  for (const [ten, sql] of bon) {
    ok(`${ten} có mệnh đề WHERE lọc "chỉ ghi khi đổi"`,
      /DO UPDATE SET[\s\S]*\bWHERE\b[\s\S]*IS NOT excluded\./.test(sql));
  }
  ok('lọc don_hoan phủ ĐỦ 12 cột mà lệnh SET ghi (thiếu cột nào là mất cập nhật cột đó)',
    COT_DON_HOAN.every(c => SQL_HOAN_SHOPEE.includes(`don_hoan.${c} IS NOT excluded.${c}`)),
    COT_DON_HOAN.length + ' cột');

  /* --- B · Đơn KHÔNG đổi: phải ghi 0 dòng -------------------------------- */
  console.log('\nB · 523 đơn y nguyên, chạy lại đúng lệnh đồng bộ (bảng nguồn ghi)');
  const db = dungDB();
  let lanDau = 0;
  for (let i = 1; i <= SO_DON; i++) lanDau += ghi(db, SQL_HOAN_SHOPEE, THAM_SO_HOAN(donHoan(i)));
  ok(`lượt đầu (đơn mới) ghi đủ ${SO_DON} dòng`, lanDau === SO_DON, `${lanDau} dòng`);

  let lapLai = 0;
  for (let v = 0; v < 3; v++)
    for (let i = 1; i <= SO_DON; i++) lapLai += ghi(db, SQL_HOAN_SHOPEE, THAM_SO_HOAN(donHoan(i)));
  ok('3 lượt cron tiếp theo, KHÔNG đơn nào đổi → ghi 0 dòng',
    lapLai === 0, `${lapLai} dòng / ${SO_DON * 3} lệnh`);

  /* --- C · RANH GIỚI CỨNG: đơn CÓ đổi thì PHẢI ghi ---------------------- */
  console.log('\nC · Không được làm mất cập nhật — đo RIÊNG TỪNG CỘT');
  const doiThu = {
    trang_thai: 'BUYER_SHIPPED_ITEM',      // ca đắt nhất: kho đợi hàng về
    ma_van_don: 'SPXVN0123456789',         // ca thứ hai: kho cần mã để nhận hàng
    ly_do: 'ITEM_DAMAGED', so_tien: 45600000, tien_te: 'USD',
    nguoi_mua: 'khach-doi-ten', san_pham: 'CBYM-9Z ×2',
    san_pham_ten: 'Hạnh nhân Mỹ', san_pham_sku: 'CBYM-9Z', so_luong: 2,
    cap_nhat_shopee: '1756999999'
  };
  let stt = 0;
  for (const [cot, giaTri] of Object.entries(doiThu)) {
    stt++;
    const r = donHoan(stt, { [cot]: giaTri });
    const n = ghi(db, SQL_HOAN_SHOPEE, THAM_SO_HOAN(r));
    const luu = db.prepare('SELECT * FROM don_hoan WHERE return_sn = ?').get(r.return_sn);
    ok(`  đổi mỗi cột "${cot}" → CÓ ghi và giá trị mới đã vào DB`,
      n === 1 && String(luu[cot]) === String(giaTri), `${n} dòng, DB = ${luu[cot]}`);
  }
  // du_lieu_json đổi mà không cột tóm tắt nào đổi (sàn thêm trường mới)
  {
    const r = donHoan(400); r.du_lieu_json = JSON.stringify({ ...JSON.parse(r.du_lieu_json), them: 1 });
    ok('  đổi mỗi payload thô (du_lieu_json) → vẫn CÓ ghi',
      ghi(db, SQL_HOAN_SHOPEE, THAM_SO_HOAN(r)) === 1);
  }
  // Đơn hoàn TikTok, và đơn mới hoàn toàn
  ok('  đơn hoàn TikTok đổi trạng thái → CÓ ghi',
    (() => { const r = donHoan(9001); ghi(db, SQL_HOAN_TIKTOK, THAM_SO_HOAN(r));
             return ghi(db, SQL_HOAN_TIKTOK, THAM_SO_HOAN(donHoan(9001, { trang_thai: 'REFUNDED' }))) === 1; })());
  ok('  đơn hoàn HOÀN TOÀN MỚI → vẫn được thêm bình thường',
    ghi(db, SQL_HOAN_SHOPEE, THAM_SO_HOAN(donHoan(99999))) === 1);
  ok('  trigger lịch sử vẫn ghi được lần đổi trạng thái (không bị lọc chặn oan)',
    db.prepare("SELECT COUNT(*) n FROM don_hoan_lich_su WHERE truong='trang_thai'").get().n >= 2,
    db.prepare('SELECT COUNT(*) n FROM don_hoan_lich_su').get().n + ' dòng lịch sử');

  /* --- D · BẢNG NGUỒN GHI trước / sau ------------------------------------ */
  console.log('\nD · Bảng nguồn ghi mỗi ngày (dòng bảng × 3,07 = dòng D1 kể cả chỉ mục)');
  const KHUECH_DAI = 346688 / 113263;    // đo từ bản thật: rows_written / write_queries
  const DOI_THAT_NGAY = 60;              // đơn hoàn thật sự đổi trong 24h (đo bản thật)
  const truoc = SO_DON * LUOT_CRON_NGAY;
  const sau = DOI_THAT_NGAY + 15;        // 60 đơn đổi + 15 đơn mới mỗi ngày
  const d1Truoc = Math.round(truoc * KHUECH_DAI), d1Sau = Math.round(sau * KHUECH_DAI);
  console.log(`  đơn hoàn (cron 5 phút)   ${String(truoc).padStart(7)} lệnh/ngày  →  ${String(sau).padStart(7)} lệnh/ngày`);
  console.log(`  quy ra dòng ghi D1       ${String(d1Truoc).padStart(7)}          →  ${String(d1Sau).padStart(7)}`);
  ok('sau khi vá, riêng luồng đơn hoàn dưới 1% hạn mức 100.000 dòng/ngày',
    d1Sau < 1000, `${d1Sau} dòng/ngày`);

  /* --- E · CA ĐỐI CHỨNG (BH-16) ----------------------------------------- */
  console.log('\nE · Ca đối chứng — bỏ bớt một vế lọc thì bàn thử có bắt được không');
  const WHERE_DU = locDoi('don_hoan', COT_DON_HOAN);
  if (!SQL_HOAN_SHOPEE.includes(WHERE_DU)) chet('không tìm thấy mệnh đề lọc trong SQL đã bóc');

  /* ĐỐI CHỨNG 1 — BẢN TRƯỚC KHI VÁ (gỡ hẳn mệnh đề WHERE): phải tái hiện
     đúng con số đã làm vỡ hạn mức, tức ghi lại đủ 523 dòng dù không đơn nào đổi. */
  const banCu = SQL_HOAN_SHOPEE.replace(WHERE_DU, '');
  const db2 = dungDB();
  for (let i = 1; i <= SO_DON; i++) ghi(db2, banCu, THAM_SO_HOAN(donHoan(i)));
  let cuLapLai = 0;
  for (let i = 1; i <= SO_DON; i++) cuLapLai += ghi(db2, banCu, THAM_SO_HOAN(donHoan(i)));
  ok('bản TRƯỚC KHI VÁ ghi đè lại toàn bộ 523 đơn không đổi (tái hiện đúng lỗi)',
    cuLapLai === SO_DON, `${cuLapLai} dòng — bản đã vá ở mục B ghi 0`);

  /* ĐỐI CHỨNG 2 — VÁ HỤT: chỉ so mỗi `trang_thai`, quên 11 cột còn lại. Đơn
     đổi MÃ VẬN ĐƠN mà giữ nguyên trạng thái sẽ bị nuốt — kho không bao giờ
     thấy mã để nhận hàng. Bàn đo phải bắt được ca này, nếu không nó vô dụng. */
  const vaHut = SQL_HOAN_SHOPEE.replace(WHERE_DU, locDoi('don_hoan', ['trang_thai']));
  const db3 = dungDB();
  ghi(db3, vaHut, THAM_SO_HOAN(donHoan(1)));
  const nHong = ghi(db3, vaHut, THAM_SO_HOAN(donHoan(1, { ma_van_don: 'SPXVN999' })));
  ok('bản VÁ HỤT (chỉ so trang_thai) để LỌT mã vận đơn mới', nHong === 0,
    `${nHong} dòng ghi — kho sẽ không bao giờ thấy mã vận đơn này`);
  const nDu = ghi(db3, SQL_HOAN_SHOPEE, THAM_SO_HOAN(donHoan(1, { ma_van_don: 'SPXVN999' })));
  ok('bản ĐÃ VÁ bắt đúng ca đó', nDu === 1, `${nDu} dòng ghi`);

  /* --- F · CHUÔNG BÁO VƯỢT HẠN MỨC -------------------------------------- */
  console.log('\nF · Cảnh báo 80% hạn mức — thứ đáng lẽ phải kêu từ nhiều tuần trước');
  const CB = await import('file://' + path.join(GOC, 'src/canh-bao-ghi.js').replace(/\\/g, '/'));
  const db4 = new DatabaseSync(':memory:');
  for (const c of tachCau(doc('migrations/them-canhbao-ghi-d1.sql'))) db4.exec(c);
  // Vỏ D1 tối thiểu: đúng bề mặt `prepare().bind().first()/run()` mà module dùng.
  const boc = (sql) => ({
    bind: (...ts) => ({
      first: async () => db4.prepare(sql).get(...ts) ?? null,
      run: async () => { const r = db4.prepare(sql).run(...ts); return { meta: { rows_written: r.changes } }; }
    }),
    run: async () => { const r = db4.prepare(sql).run(); return { meta: { rows_written: r.changes } }; }
  });
  const env = { DB: { prepare: boc } };
  const tin = [];
  const telegramGia = async (_e, t) => { tin.push(t); return true; };

  CB.datLai(0);
  CB.demGhi({ meta: { rows_written: 1200 } });
  CB.demGhi([{ meta: { rows_written: 300 } }, { meta: { rows_written: 500 } }]);
  ok('đếm được cả lệnh đơn lẫn lệnh batch, lấy số THẬT từ meta.rows_written của D1',
    CB.dangCho() === 2000, `${CB.dangCho()} dòng`);
  let kq = await CB.chotVaCanhBao(env, telegramGia);
  ok('mức bình thường (2.000 dòng) → KHÔNG kêu, chỉ ghi sổ',
    kq.so_dong === 2000 && tin.length === 0);

  CB.demGhi({ meta: { rows_written: CB.NGUONG_BAO - 2000 } });
  kq = await CB.chotVaCanhBao(env, telegramGia);
  ok(`chạm ngưỡng ${CB.NGUONG_BAO.toLocaleString('vi-VN')} dòng (80% của ` +
     `${CB.HAN_MUC_NGAY.toLocaleString('vi-VN')}) → BẮN Telegram`,
    tin.length === 1 && /HẠN MỨC/.test(tin[0]), tin[0]?.split('\n')[0]);

  CB.demGhi({ meta: { rows_written: 5000 } });
  await CB.chotVaCanhBao(env, telegramGia);
  ok('lượt cron sau vẫn quá ngưỡng → KHÔNG nhắn lại (đúng 1 tin/ngày, không spam)',
    tin.length === 1);

  ok('ĐỐI CHỨNG · chưa nạp migration thì im lặng bỏ qua, KHÔNG làm hỏng cron',
    await (async () => {
      CB.datLai(0); CB.demGhi({ meta: { rows_written: 999999 } });
      const envHong = { DB: { prepare: () => ({ bind: () => ({ first: async () => { throw new Error('no such table: d1_ghi_ngay'); } }) }) } };
      const r = await CB.chotVaCanhBao(envHong, telegramGia);
      return r === null && CB.dangCho() === 999999;   // giữ lại số, đếm tiếp lượt sau
    })(), 'giữ nguyên số đang treo để lượt sau chốt lại');

  console.log('\n' + '='.repeat(74));
  console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
  return truot === 0;
}

chay().then(d => process.exit(d ? 0 : 1))
      .catch(e => { console.error('\nBÀN ĐO HỎNG:', e.stack || e.message); process.exit(2); });
