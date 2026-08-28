/* ==========================================================================
   ĐO 8 LỖI REV-0019 — mỗi lỗi một con số TRƯỚC/SAU + một ca ĐỐI CHỨNG (BH-16)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-va-rev0019.mjs
   Không cần mạng, không cần wrangler, không đụng D1 thật.

   CA ĐỐI CHỨNG Ở ĐÂY LÀ THẬT, KHÔNG PHẢI CỜ TRONG MÃ SẢN PHẨM:
   `banDoiChung()` lôi NGUYÊN VĂN `src/index.js` + `src/nhac-cong-viec.js` của
   commit 8909355 (bản CHƯA VÁ) ra khỏi git, viết vào thư mục tạm, đổi đường
   dẫn import thành tuyệt đối rồi nạp như một Worker thứ hai. Ca đối chứng
   chạy qua `worker.fetch()` / `worker.scheduled()` của BẢN CHƯA VÁ, với DB
   dựng thiếu đúng một file migration. "Cố ý bỏ chỗ vá" theo nghĩa đen.

   Mọi câu SQL chạy trên SQLite THẬT (xem `ban-thu-d1.mjs`) — bàn thử cũ khớp
   chuỗi SQL bằng tay nên mù với lỗi trong `WHERE` (BH-34).
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  dungDB, dungEnv, datDongHo, goiAPI, goiCron, taoPhienThat, tinNhac, ok, tongKet, TELEGRAM
} from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMMIT_TRUOC_VA = '8909355';

/* ---- Bản ĐỐI CHỨNG: mã nguồn CHƯA VÁ, lấy thẳng từ git ------------------- */

let _doiChung = null;
async function banDoiChung() {
  if (_doiChung) return _doiChung;
  const tam = mkdtempSync(path.join(tmpdir(), 'doi-chung-rev0019-'));
  const lay = (f) => execFileSync('git', ['show', `${COMMIT_TRUOC_VA}:${f}`],
    { cwd: GOC, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const srcURL = (t) => pathToFileURL(path.join(GOC, 'src', t)).href;

  let nhac = lay('src/nhac-cong-viec.js')
    .replace("from './nhac-nhan-su.js'", `from '${srcURL('nhac-nhan-su.js')}'`);
  writeFileSync(path.join(tam, 'nhac-cong-viec.js'), nhac, 'utf8');

  const idx = lay('src/index.js').replace(/from '\.\/([\w.-]+\.js)'/g,
    (_, t) => t === 'nhac-cong-viec.js'
      ? `from '${pathToFileURL(path.join(tam, 'nhac-cong-viec.js')).href}'`
      : `from '${srcURL(t)}'`);
  writeFileSync(path.join(tam, 'index.js'), idx, 'utf8');

  _doiChung = (await import(pathToFileURL(path.join(tam, 'index.js')).href)).default;
  return _doiChung;
}

const banDaVa = (await import('../src/index.js')).default;

/* ---- Công ty thật của Sếp Ngọc ------------------------------------------ */

const NGUOI = [
  { id: 'SEP',   ten: 'Bùi Thị Ngọc',      bp: 'Ban giám đốc',      ql: null,  vt: 'admin' },
  { id: 'DUY',   ten: 'Phạm Khương Duy',   bp: 'Kho vận',           ql: 'SEP', vt: 'quan_ly_kho' },
  { id: 'HANG',  ten: 'Phan Thị Hằng',     bp: 'Kế toán',           ql: 'SEP', vt: 'ke_toan_truong' },
  { id: 'HUONG', ten: 'Vũ Lan Hương',      bp: 'Hành chính nhân sự', ql: 'SEP', vt: 'hcns' },
  { id: 'HUYEN', ten: 'Nguyễn Thị Huyền',  bp: 'Vận hành sàn',      ql: 'SEP', vt: 'van_hanh_san' },
];
for (let i = 1; i <= 5; i++) {
  NGUOI.push({ id: `K${i}`, ten: `Nhân viên kho ${i}`, bp: 'Kho vận', ql: 'DUY', vt: 'nhan_vien_kho' });
}

/** Dựng DB + nạp danh bạ + tài khoản. `boQuaVa=true` → KHÔNG nạp file vá
 *  (ca đối chứng cho L2/L6, hai lỗi có phần vá nằm ở migration). */
function dungCongTy({ boQuaVa = false, nguoi = NGUOI } = {}) {
  const { db, d1 } = dungDB();
  if (boQuaVa) {
    db.exec('DROP TRIGGER IF EXISTS trg_cong_viec_doi_nguoi_nhan');
    db.exec('DROP INDEX IF EXISTS ux_thong_bao_nhac_viec_ngay');
    db.exec('DROP INDEX IF EXISTS ux_thong_bao_han_chot_sai');
    // Không bỏ được cột đã ADD (SQLite cũ), nhưng để NULL là đủ: mã nguồn rơi
    // về `tao_luc` y như khi chưa có cột.
  }
  for (const n of nguoi) {
    db.prepare(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam)
                VALUES (?, ?, ?, ?, ?, ?, 1)`).run(n.id, n.ten, n.id, 'NV', n.bp, n.ql);
    db.prepare(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat)
                VALUES (?, ?, 'x', ?, 1)`).run(n.id, n.id.toLowerCase(), n.vt);
  }
  for (const t of [...new Set(nguoi.map(n => n.bp))]) {
    db.prepare('INSERT OR IGNORE INTO phong_ban (ten) VALUES (?)').run(t);
  }
  db.prepare("UPDATE phong_ban SET truong_phong_id = 'DUY' WHERE ten = 'Kho vận'").run();
  return { db, d1 };
}

let idViec = 0;
function themViec(db, { nhan, giao, han = null, tt = 'dang_lam', tao = '2026-08-01 09:00:00', nop = null, nhanLuc = null, tieuDe = null }) {
  const ten = (id) => NGUOI.find(n => n.id === id)?.ten || id;
  idViec++;
  db.prepare(`INSERT INTO cong_viec
      (tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten,
       han_chot, trang_thai, tao_luc, cap_nhat_luc, nop_luc)
      VALUES (?, 'đầu ra', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(tieuDe || `Việc ${idViec}`, giao, ten(giao), nhan, ten(nhan), han, tt, tao, tao, nop);
  const id = db.prepare('SELECT last_insert_rowid() AS id').get().id;
  if (nhanLuc) {
    try { db.prepare('UPDATE cong_viec SET nhan_viec_luc = ? WHERE id = ?').run(nhanLuc, id); } catch { /* chưa có cột */ }
  }
  return id;
}

const bpCua = (id) => NGUOI.find(n => n.id === id)?.bp || '?';
const nhomTheoNguoi = (tin) => {
  const m = new Map();
  for (const t of tin) m.set(t.nguoi_nhan_id, (m.get(t.nguoi_nhan_id) || 0) + 1);
  return m;
};

/* Thứ Sáu 28/08/2026, 09:30 giờ VN (= 02:30 UTC) — trong cửa gửi. */
const GIO_CHUAN = '2026-08-28T02:30:00Z';

console.log('\n' + '='.repeat(72));
console.log('ĐO 8 LỖI REV-0019 · D1 thật trên node:sqlite · worker thật');
console.log('='.repeat(72));

/* ======================================================================= */
/* L1 — NHAC_VIEC_BO_PHAN rò sang phòng khác                               */
/* ======================================================================= */

function dungCanhPilot(db) {
  // 5 nhân viên kho, mỗi người 3 việc quá hạn ĐÚNG 1 NGÀY (mốc nhắc đầu tiên),
  // đều do anh Duy (Kho vận) giao → tin đi tới NV kho + anh Duy: đúng phòng.
  for (let i = 1; i <= 5; i++)
    for (let j = 0; j < 3; j++) themViec(db, { nhan: `K${i}`, giao: 'DUY', han: '2026-08-27' });
  // MỘT việc của kho do chị Huyền (Vận hành sàn) giao — chị không thuộc phòng
  // đang chạy thử, nhưng bản cũ vẫn bắn tin "việc bạn giao đang quá hạn".
  themViec(db, { nhan: 'K1', giao: 'HUYEN', han: '2026-08-27', tieuDe: 'Việc kho do Vận hành giao' });
  // Và một việc của chị Huyền (ngoài phòng thử) — không được đụng tới.
  themViec(db, { nhan: 'HUYEN', giao: 'SEP', han: '2026-08-27' });
}

async function doPilot(worker, { boQuaVa = false } = {}) {
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy({ boQuaVa });
  dungCanhPilot(db);
  const env = dungEnv(d1, { NHAC_VIEC_BO_PHAN: 'Kho vận', NHAC_VIEC_BAT_DAU_TU: '2026-07-01' });
  await goiCron(worker, env);
  const tin = tinNhac(db);
  const ro = tin.filter(t => bpCua(t.nguoi_nhan_id) !== 'Kho vận');
  return { tong: tin.length, ro: ro.length, aiRo: [...new Set(ro.map(t => t.nguoi_nhan_id))] };
}

console.log('\n--- L1 · nút chạy thử riêng một phòng (NHAC_VIEC_BO_PHAN="Kho vận") ---');
const l1Truoc = await doPilot(await banDoiChung(), { boQuaVa: true });
const l1Sau = await doPilot(banDaVa);
console.log(`  TRƯỚC (bản chưa vá): ${l1Truoc.ro}/${l1Truoc.tong} tin rò — tới ${l1Truoc.aiRo.join(', ') || '—'}`);
console.log(`  SAU   (bản đã vá)  : ${l1Sau.ro}/${l1Sau.tong} tin rò — tới ${l1Sau.aiRo.join(', ') || '—'}`);
ok('L1 · bản đã vá: 0 tin đi ra ngoài phòng đang chạy thử', l1Sau.ro === 0, `${l1Sau.ro}/${l1Sau.tong}`);
ok('L1 · ĐỐI CHỨNG: bỏ chỗ vá thì phép đo BẮT ĐƯỢC rò', l1Truoc.ro > 0, `${l1Truoc.ro}/${l1Truoc.tong}`);
ok('L1 · vá xong người trong phòng thử VẪN được nhắc (không câm cả làng)', l1Sau.tong > 0, `${l1Sau.tong} tin`);

/* Nút chạy thử phải nhận CẢ phong_ban_id (spec ghi theo id) --------------- */
{
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy();
  dungCanhPilot(db);
  const idKho = db.prepare("SELECT id FROM phong_ban WHERE ten='Kho vận'").get().id;
  db.prepare("UPDATE nhan_su SET bo_phan='Kho', phong_ban_id=? WHERE bo_phan='Kho vận'").run(idKho);
  const env = dungEnv(d1, { NHAC_VIEC_BO_PHAN: 'Kho vận', NHAC_VIEC_BAT_DAU_TU: '2026-07-01' });
  await goiCron(banDaVa, env);
  const tin = tinNhac(db);
  ok('L1 · lọc được cả khi phòng khớp bằng phong_ban_id, không khớp bằng chữ',
    tin.length > 0, `${tin.length} tin`);
}

/* ======================================================================= */
/* L2 — đổi người phụ trách giữa chừng                                     */
/* ======================================================================= */

console.log('\n--- L2 · chuyển việc đang trễ sang người khác ---');

async function doDoiNguoi(worker, { boQuaVa = false } = {}) {
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy({ boQuaVa });
  /* Việc giao 01/08, hạn 21/08 → tới 28/08 là trễ ĐÚNG 7 ngày, tức trúng mốc
     nhắc thứ ba (1-3-7). Chọn mốc trúng lịch là CỐ Ý: lấy "trễ 9 ngày" như
     bản soi thì lịch 1-3-7 không nổ và phép đo sẽ ra "đạt" cho cả bản chưa vá
     — một phép đo lúc nào cũng đạt thì không chứng minh được gì (BH-16). */
  const id = themViec(db, { nhan: 'K1', giao: 'DUY', han: '2026-08-21', tieuDe: 'Việc bàn giao' });
  // …HÔM NAY chuyển sang K2. Đổi bằng UPDATE thẳng DB — đúng con đường thật
  // đang dùng (ERP chưa có endpoint đổi người nhận).
  db.prepare("UPDATE cong_viec SET nguoi_nhan_id='K2', nguoi_nhan_ten='Nhân viên kho 2' WHERE id=?").run(id);
  const env = dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' });
  await goiCron(worker, env);
  const tin = tinNhac(db);
  const cuaK2 = tin.filter(t => t.nguoi_nhan_id === 'K2');
  const mocCam = (() => { try { return db.prepare('SELECT nhan_viec_luc AS m FROM cong_viec WHERE id=?').get(id).m; } catch { return null; } })();
  return { cuaK2: cuaK2.length, noiDung: cuaK2.map(t => t.noi_dung).join(' | '), mocCam, tong: tin.length };
}

const l2Truoc = await doDoiNguoi(await banDoiChung(), { boQuaVa: true });
const l2Sau = await doDoiNguoi(banDaVa);
console.log(`  TRƯỚC: người mới nhận ${l2Truoc.cuaK2} tin — ${l2Truoc.noiDung.slice(0, 110) || '—'}`);
console.log(`  SAU  : người mới nhận ${l2Sau.cuaK2} tin (mốc cầm việc = ${l2Sau.mocCam})`);
ok('L2 · người vừa nhận bàn giao KHÔNG bị báo trễ ngay hôm đầu', l2Sau.cuaK2 === 0, `${l2Sau.cuaK2} tin`);
ok('L2 · ĐỐI CHỨNG: bỏ vá (không trigger, không cột) thì lỗi hiện ra',
  l2Truoc.cuaK2 > 0 && /trễ 7 ngày/.test(l2Truoc.noiDung), l2Truoc.noiDung.slice(0, 80));
ok('L2 · trigger DB đóng dấu mốc cầm việc khi đổi nguoi_nhan_id', !!l2Sau.mocCam, String(l2Sau.mocCam));

/* Sau ân xá vẫn phải nhắc — vá không được biến thành "im mãi mãi". */
{
  datDongHo('2026-08-31T02:30:00Z');   // thứ Hai 31/08, 3 ngày sau bàn giao
  const { db, d1 } = dungCongTy();
  const id = themViec(db, { nhan: 'K1', giao: 'DUY', han: '2026-08-21', tieuDe: 'Việc bàn giao' });
  db.prepare("UPDATE cong_viec SET nguoi_nhan_id='K2', nguoi_nhan_ten='Nhân viên kho 2' WHERE id=?").run(id);
  db.prepare("UPDATE cong_viec SET nhan_viec_luc='2026-08-28 09:30:00' WHERE id=?").run(id);
  await goiCron(banDaVa, dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' }));
  const cuaK2 = tinNhac(db).filter(t => t.nguoi_nhan_id === 'K2');
  ok('L2 · sang ngày thứ 3 sau bàn giao thì NHẮC LẠI, và nói rõ "vừa nhận việc"',
    cuaK2.length === 1 && /nhận việc 3 ngày trước/.test(cuaK2[0].noi_dung),
    cuaK2[0]?.noi_dung.slice(0, 100) || 'không có tin');
}

/* ======================================================================= */
/* L3 — hạn chót gõ nhầm năm                                               */
/* ======================================================================= */

console.log('\n--- L3 · hạn chót gõ nhầm năm ---');

/* Mốc leo cấp là "trễ ≥8 ngày VÀ (trễ−8) chia hết 7" — chọn bừa một ngày
   trong 1999 thì lệch pha và bản CHƯA VÁ cũng im, phép đo hoá ra vô dụng
   (BH-16). Tìm đúng ngày trong 12/1999 rơi trúng pha để ca đối chứng thật sự
   nổ. */
function ngayGoNhamNam() {
  for (let d = 1; d <= 31; d++) {
    const han = `1999-12-${String(d).padStart(2, '0')}`;
    const tre = Math.round((Date.UTC(2026, 7, 28) - Date.UTC(1999, 11, d)) / 86400000);
    if (tre >= 8 && (tre - 8) % 7 === 0) return han;
  }
  throw new Error('không tìm được ngày trúng pha leo cấp');
}
const HAN_GO_NHAM = ngayGoNhamNam();

async function doHanVoLy(worker) {
  const { db, d1 } = dungCongTy();
  themViec(db, { nhan: 'K1', giao: 'DUY', han: HAN_GO_NHAM, tieuDe: 'Việc gõ nhầm năm' });
  const env = dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' });
  // 10 tuần liên tiếp, mỗi tuần một lượt cron trong cửa gửi.
  const moc = [];
  for (let tuan = 0; tuan < 10; tuan++) {
    const d = new Date(Date.UTC(2026, 7, 28 + tuan * 7, 2, 30));
    datDongHo(d.toISOString());
    await goiCron(worker, env);
  }
  const tin = tinNhac(db);
  return {
    leoCap: tin.filter(t => t.loai === 'cv_leo_cap').length,
    banTin: tin.filter(t => t.loai === 'cv_ban_tin').length,
    baoSai: tin.filter(t => t.loai === 'cv_han_chot_sai').length,
    mau: tin.map(t => t.noi_dung).join(' | ').slice(0, 120), moc
  };
}

const l3Truoc = await doHanVoLy(await banDoiChung());
const l3Sau = await doHanVoLy(banDaVa);
console.log(`  Hạn gõ nhầm dùng để đo: ${HAN_GO_NHAM}`);
console.log(`  TRƯỚC (10 tuần): ${l3Truoc.leoCap} tin leo cấp + ${l3Truoc.banTin} bản tin — ${l3Truoc.mau.slice(0, 90)}`);
console.log(`  SAU   (10 tuần): ${l3Sau.leoCap} tin leo cấp + ${l3Sau.banTin} bản tin + ${l3Sau.baoSai} tin "hạn chót sai"`);
ok('L3 · hết réo vĩnh viễn: 0 tin leo cấp trong 10 tuần', l3Sau.leoCap === 0, `${l3Sau.leoCap}`);
ok('L3 · báo SAI DỮ LIỆU đúng MỘT lần rồi thôi', l3Sau.baoSai === 1, `${l3Sau.baoSai} tin`);
ok('L3 · ĐỐI CHỨNG: bản chưa vá réo lặp lại', l3Truoc.leoCap > 1, `${l3Truoc.leoCap} tin leo cấp`);

/* ======================================================================= */
/* L4 — NHAC_VIEC_TAT gõ khác chữ "1"                                      */
/* ======================================================================= */

console.log('\n--- L4 · nút tắt khẩn gõ nhiều kiểu ---');

async function doNutTat(worker, giaTri) {
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy();
  for (let i = 1; i <= 5; i++) themViec(db, { nhan: `K${i}`, giao: 'DUY', han: '2026-08-27' });
  await goiCron(worker, dungEnv(d1, { NHAC_VIEC_TAT: giaTri, NHAC_VIEC_BAT_DAU_TU: '2026-07-01' }));
  return tinNhac(db).length;
}

const truocVa = await banDoiChung();
const cachViet = ['1', 'true', 'TRUE', 'yes', 'on', 'bat', 'tắt', 'taat'];
const bangTat = [];
for (const v of cachViet) bangTat.push({ v, truoc: await doNutTat(truocVa, v), sau: await doNutTat(banDaVa, v) });
for (const h of bangTat) console.log(`  NHAC_VIEC_TAT="${h.v}"  → TRƯỚC ${String(h.truoc).padStart(2)} tin · SAU ${String(h.sau).padStart(2)} tin`);
ok('L4 · mọi cách viết đều TẮT THẬT', bangTat.every(h => h.sau === 0));
ok('L4 · ĐỐI CHỨNG: bản chưa vá im lặng KHÔNG tắt khi gõ khác "1"',
  bangTat.filter(h => h.v !== '1').every(h => h.truoc > 0),
  `${bangTat.filter(h => h.v !== '1' && h.truoc > 0).length}/7 cách viết vẫn bắn tin`);
const khongTat = [];
for (const v of ['', '0', 'false', 'no', 'off', 'khong']) khongTat.push({ v, sau: await doNutTat(banDaVa, v) });
console.log('  Giá trị nghĩa "không tắt": ' + khongTat.map(h => `"${h.v}"→${h.sau} tin`).join(' · '));
ok('L4 · "0"/"false"/rỗng vẫn phải CHẠY (không tắt nhầm)', khongTat.every(h => h.sau > 0));

/* ======================================================================= */
/* L5 — chạm trần 40 phải nêu tên người bị bỏ                              */
/* ======================================================================= */

console.log('\n--- L5 · chạm trần 40 tin/lượt ---');

async function doTran(worker) {
  datDongHo(GIO_CHUAN);
  const dong = NGUOI.slice(0, 5);
  for (let i = 1; i <= 60; i++) dong.push({ id: `N${i}`, ten: `Người ${i}`, bp: 'Kho vận', ql: 'DUY', vt: 'nhan_vien_kho' });
  const { db, d1 } = dungCongTy({ nguoi: dong });
  for (let i = 1; i <= 60; i++)
    db.prepare(`INSERT INTO cong_viec (tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten, han_chot, trang_thai, tao_luc)
                VALUES (?, 'x', 'DUY', 'Phạm Khương Duy', ?, ?, '2026-08-27', 'dang_lam', '2026-08-01 09:00:00')`)
      .run(`Việc trần ${i}`, `N${i}`, `Người ${i}`);
  TELEGRAM.length = 0;
  await goiCron(worker, dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' }));
  const tg = TELEGRAM.find(t => t.includes('chạm trần')) || '';
  return { daGui: tinNhac(db).length, tg, neuTen: /Người \d+/.test(tg) };
}

const l5Truoc = await doTran(truocVa);
const l5Sau = await doTran(banDaVa);
console.log(`  TRƯỚC: gửi ${l5Truoc.daGui} tin, tin Telegram nêu tên người bị bỏ? ${l5Truoc.neuTen ? 'CÓ' : 'KHÔNG'}`);
console.log(`  SAU  : gửi ${l5Sau.daGui} tin, tin Telegram: "${l5Sau.tg.split('\n')[1]?.slice(0, 100) || '—'}"`);
ok('L5 · vẫn dừng đúng trần 40', l5Sau.daGui === 40, `${l5Sau.daGui} tin`);
ok('L5 · tin báo NÊU TÊN người bị bỏ', l5Sau.neuTen);
ok('L5 · ĐỐI CHỨNG: bản chưa vá bỏ im lặng, không nêu tên ai', !l5Truoc.neuTen);

/* ======================================================================= */
/* L6 — hai lượt cron CHỒNG NHAU                                           */
/* ======================================================================= */

console.log('\n--- L6 · 4 lượt cron chạy chồng nhau ---');

async function doChongNhau(worker, { boQuaVa = false } = {}) {
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy({ boQuaVa });
  for (let i = 1; i <= 5; i++) themViec(db, { nhan: `K${i}`, giao: 'DUY', han: '2026-08-27' });
  const env = dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' });
  await Promise.all([goiCron(worker, env), goiCron(worker, env), goiCron(worker, env), goiCron(worker, env)]);
  const m = nhomTheoNguoi(tinNhac(db));
  return { max: Math.max(...m.values(), 0), tong: tinNhac(db).length };
}

const l6Truoc = await doChongNhau(truocVa, { boQuaVa: true });
const l6Sau = await doChongNhau(banDaVa);
console.log(`  TRƯỚC: ${l6Truoc.tong} tin, nhiều nhất ${l6Truoc.max} tin/người`);
console.log(`  SAU  : ${l6Sau.tong} tin, nhiều nhất ${l6Sau.max} tin/người`);
ok('L6 · 4 lượt chồng nhau vẫn đúng 1 tin/người', l6Sau.max === 1, `${l6Sau.max} tin/người`);
ok('L6 · ĐỐI CHỨNG: bỏ chỉ mục DUY NHẤT thì tin nhân lên', l6Truoc.max > 1, `${l6Truoc.max} tin/người`);

/* ======================================================================= */
/* L8 — cvHomNay không có cổng quyền                                       */
/* ======================================================================= */

console.log('\n--- L8 · cổng quyền của /api/cong-viec/hom-nay ---');

async function doCongQuyen(worker, vaiTro) {
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy();
  themViec(db, { nhan: 'K1', giao: 'DUY', han: '2026-08-19' });
  themViec(db, { nhan: 'K2', giao: 'DUY', han: '2026-08-01', tt: 'hoan_thanh', nop: '2026-07-30 09:00:00' });
  db.prepare('UPDATE tai_khoan SET vai_tro = ? WHERE nhan_su_id = ?').run(vaiTro, 'HUONG');
  const env = dungEnv(d1);
  const tkId = db.prepare("SELECT id FROM tai_khoan WHERE nhan_su_id='HUONG'").get().id;
  const token = await taoPhienThat(env, tkId);
  return goiAPI(worker, env, '/api/cong-viec/hom-nay', token);
}

// Vai trò KHÔNG có tab nào (mô phỏng "ngày nào Sếp gỡ tab của một vai").
const l8Truoc = await doCongQuyen(truocVa, 'vai_tro_bi_go_tab');
const l8Sau = await doCongQuyen(banDaVa, 'vai_tro_bi_go_tab');
console.log(`  TRƯỚC: HTTP ${l8Truoc.status}, trả ghi_nhan ${l8Truoc.than?.ghi_nhan?.length ?? '-'} dòng toàn công ty`);
console.log(`  SAU  : HTTP ${l8Sau.status}`);
ok('L8 · vai không còn quyền thì bị chặn ở MÁY CHỦ', l8Sau.status === 403, `HTTP ${l8Sau.status}`);
ok('L8 · ĐỐI CHỨNG: bản chưa vá trả 200 kèm dữ liệu toàn công ty',
  l8Truoc.status === 200, `HTTP ${l8Truoc.status}`);
const l8Binh = await doCongQuyen(banDaVa, 'hcns');
ok('L8 · vai bình thường KHÔNG bị chặn oan', l8Binh.status === 200, `HTTP ${l8Binh.status}`);

/* ======================================================================= */
/* KHÔNG ĐƯỢC LÀM HỎNG 5 ĐIỂM ĐÃ ĐẠT                                       */
/* ======================================================================= */

console.log('\n' + '='.repeat(72));
console.log('ĐO LẠI 5 ĐIỂM HỒ LY ĐÃ CHẤM ĐẠT');
console.log('='.repeat(72));

/* --- ① Ngập tin: 20 người · 240 việc · 7 ngày · cron 5 phút -------------- */
console.log('\n--- ① không ngập tin ---');
{
  const dong = NGUOI.slice();
  for (let i = 1; i <= 10; i++) dong.push({ id: `X${i}`, ten: `Nhân sự ${i}`, bp: 'Kho vận', ql: 'DUY', vt: 'nhan_vien_kho' });
  const { db, d1 } = dungCongTy({ nguoi: dong });
  const ids = dong.map(n => n.id);
  // 240 việc mở, hạn rải đều để ngày nào cũng có việc chạm mốc 1/3/7 và 8/15/22/29.
  for (let i = 0; i < 240; i++) {
    const nhan = ids[i % ids.length], giao = ids[(i * 7 + 3) % ids.length];
    const d = new Date(Date.UTC(2026, 6, 10 + (i % 55)));
    themViec(db, { nhan, giao, han: d.toISOString().slice(0, 10), tt: ['moi', 'dang_lam', 'cho_duyet'][i % 3], nop: i % 3 === 2 ? '2026-08-20 09:00:00' : null });
  }
  const env = dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' });
  let luot = 0;
  const bd = process.hrtime.bigint();   // KHÔNG dùng Date.now(): đồng hồ đang bị giả lập
  for (let phut = 0; phut < 7 * 24 * 60; phut += 5) {   // 2016 lượt cron
    datDongHo(new Date(Date.UTC(2026, 7, 24, 0, phut)).toISOString());
    await goiCron(banDaVa, env); luot++;
  }
  const tin = tinNhac(db);
  const m = nhomTheoNguoi(tin);
  const theoNgay = new Map();
  for (const t of tin) {
    const k = `${t.nguoi_nhan_id}|${String(t.tao_luc).slice(0, 10)}`;
    theoNgay.set(k, (theoNgay.get(k) || 0) + 1);
  }
  const cn = tin.filter(t => new Date(String(t.tao_luc).replace(' ', 'T') + 'Z').getUTCDay() === 0).length;
  console.log(`  ${luot} lượt cron / 7 ngày · ${dong.length} người · 240 việc · ${(Number(process.hrtime.bigint() - bd) / 1e9).toFixed(1)}s`);
  console.log(`  Tổng ${tin.length} tin · nhiều nhất ${Math.max(...m.values(), 0)} tin/người/TUẦN · ${Math.max(...theoNgay.values(), 0)} tin/người/NGÀY · Chủ nhật ${cn} tin`);
  ok('① ≤15 tin/người/tuần', Math.max(...m.values(), 0) <= 15, `${Math.max(...m.values(), 0)}`);
  ok('① ≤3 tin/người/ngày', Math.max(...theoNgay.values(), 0) <= 3, `${Math.max(...theoNgay.values(), 0)}`);
  ok('① Chủ nhật im hẳn', cn === 0);
}

/* --- ② Đổ lỗi đúng người ------------------------------------------------ */
console.log('\n--- ② đổ lỗi đúng người ---');
{
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy();
  // NV nộp ĐÚNG HẠN 20/08, Sếp mãi 28/08 mới duyệt.
  themViec(db, { nhan: 'K1', giao: 'SEP', han: '2026-08-20', tt: 'cho_duyet', nop: '2026-08-20 16:00:00' });
  await goiCron(banDaVa, dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' }));
  const tin = tinNhac(db);
  const cuaK1 = tin.filter(t => t.nguoi_nhan_id === 'K1');
  const cuaSep = tin.filter(t => t.nguoi_nhan_id === 'SEP');
  console.log(`  Người nộp đúng hạn nhận ${cuaK1.length} tin · người duyệt muộn nhận ${cuaSep.length} tin`);
  ok('② người nộp đúng hạn KHÔNG bị báo trễ', cuaK1.length === 0);
  ok('② người duyệt muộn BỊ nhắc', cuaSep.length === 1 && /chờ BẠN duyệt/.test(cuaSep[0].noi_dung));
}

/* --- ③ Cửa giờ / ngày nghỉ / múi giờ: 168 mốc UTC liên tiếp -------------- */
console.log('\n--- ③ cửa giờ 168 giờ UTC liên tiếp ---');
{
  /* Mỗi mốc giờ dựng DB mới và cắm một việc ĐẾN HẠN ĐÚNG NGÀY VN của mốc đó
     — có vậy thì "câm" mới chắc chắn là do CỬA GIỜ, không phải do hôm ấy
     chẳng có gì để nhắc. Lần chạy đầu tôi cắm hạn cố định 27/08 và bảng in ra
     là lịch nhắc của việc, không phải cửa giờ. */
  const bang = [], mongDoi = [];
  for (let gio = 0; gio < 168; gio++) {
    const mocUTC = new Date(Date.UTC(2026, 7, 24, gio, 30));
    datDongHo(mocUTC.toISOString());
    const vn = new Date(mocUTC.getTime() + 7 * 3600 * 1000);
    const ngayVN = vn.toISOString().slice(0, 10);
    const { db, d1 } = dungCongTy();
    themViec(db, { nhan: 'K1', giao: 'DUY', han: ngayVN });
    await goiCron(banDaVa, dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' }));
    bang.push(tinNhac(db).length > 0 ? '#' : '.');
    // Cửa gửi: 8h ≤ giờ VN < 18h, và KHÔNG phải Chủ nhật (thứ Bảy VẪN nhắc).
    mongDoi.push(vn.getUTCDay() !== 0 && vn.getUTCHours() >= 8 && vn.getUTCHours() < 18);
  }
  const ten = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  console.log('       000102030405060708091011121314151617181920212223  (giờ UTC)');
  for (let d = 0; d < 7; d++) console.log(`   ${ten[d]}  ` + bang.slice(d * 24, d * 24 + 24).join('  '));
  let sai = 0;
  for (let i = 0; i < 168; i++) if ((bang[i] === '#') !== mongDoi[i]) sai++;
  ok('③ đúng cửa 8h–18h GIỜ VN cả 168 giờ, thứ Bảy nhắc, Chủ nhật câm', sai === 0, `${sai} giờ lệch`);
}

/* --- ④ Ba nút tắt ------------------------------------------------------- */
console.log('\n--- ④ nút tắt ---');
{
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy();
  // Hạn 20/08 → tới 28/08 là trễ ĐÚNG 8 ngày = mốc leo cấp đầu tiên.
  for (let i = 1; i <= 5; i++) themViec(db, { nhan: `K${i}`, giao: 'DUY', han: '2026-08-20' });
  db.prepare('UPDATE tai_khoan SET nhac_viec_tat = 1').run();
  await goiCron(banDaVa, dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' }));
  const tin = tinNhac(db);
  ok('④ cả công ty tự tắt → chỉ còn leo cấp (tắt nhắc không tắt trách nhiệm)',
    tin.length > 0 && tin.every(t => t.loai === 'cv_leo_cap'),
    `${tin.length} tin, loại: ${[...new Set(tin.map(t => t.loai))].join(',')}`);
}
{
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy();
  themViec(db, { nhan: 'K1', giao: 'DUY', han: '2026-08-27' });
  const env = dungEnv(d1, { NHAC_VIEC_TAT: '1' });
  await goiCron(banDaVa, env);
  // Cron vẫn phải chạy các đầu việc khác, không văng.
  ok('④ NHAC_VIEC_TAT=1 → 0 tin nhắc việc, cron còn lại vẫn chạy', tinNhac(db).length === 0);
}

/* --- ⑤ Ranh giới thông tin (cắt ở máy chủ) ------------------------------- */
console.log('\n--- ⑤ ranh giới thông tin ---');
{
  datDongHo(GIO_CHUAN);
  const { db, d1 } = dungCongTy();
  // Hạn 27/08 → trễ 1 ngày = mốc nhắc đầu tiên, chắc chắn CÓ tin để mà đo
  // "ai thấy tin của ai" (đo trên bảng rỗng thì lúc nào cũng đạt).
  themViec(db, { nhan: 'K1', giao: 'DUY', han: '2026-08-27' });
  themViec(db, { nhan: 'HUYEN', giao: 'SEP', han: '2026-08-27' });
  const env = dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-07-01' });
  await goiCron(banDaVa, env);
  const phien = {};
  for (const id of ['K1', 'DUY', 'SEP', 'HUYEN']) {
    const tk = db.prepare('SELECT id FROM tai_khoan WHERE nhan_su_id = ?').get(id).id;
    phien[id] = await taoPhienThat(env, tk);
  }
  const k1 = await goiAPI(banDaVa, env, '/api/cong-viec/hom-nay', phien.K1);
  const duy = await goiAPI(banDaVa, env, '/api/cong-viec/hom-nay', phien.DUY);
  const sep = await goiAPI(banDaVa, env, '/api/cong-viec/hom-nay', phien.SEP);
  ok('⑤ nhân viên kho: quan_ly = null', k1.than?.quan_ly === null, JSON.stringify(k1.than?.quan_ly));
  ok('⑤ anh Duy: phạm vi "team", đúng cấp dưới trực tiếp',
    duy.than?.quan_ly?.pham_vi === 'team' && duy.than.quan_ly.dong_viec.every(d => ['K1', 'K2', 'K3', 'K4', 'K5', 'DUY'].includes(d.nhan_su_id)),
    JSON.stringify(duy.than?.quan_ly?.dong_viec?.map(d => d.nhan_su_id)));
  ok('⑤ Sếp: phạm vi "cong_ty"', sep.than?.quan_ly?.pham_vi === 'cong_ty');
  /* Chuông: KHÔNG đọc mệnh đề WHERE rồi kết luận (BH-43) — đối chiếu ID trả
     về với ID thật trong DB. `/api/thong-bao` không trả `nguoi_nhan_id` nên
     lọc theo trường đó ở phía bàn thử sẽ ra 0/0 và "đạt" một cách rỗng tuếch. */
  const tb = await goiAPI(banDaVa, env, '/api/thong-bao', phien.K1);
  const ds = tb.than?.thong_bao || [];
  const duocPhep = new Set(db.prepare(
    "SELECT id FROM thong_bao WHERE nguoi_nhan_id = 'K1' OR nguoi_nhan_id IS NULL").all().map(r => r.id));
  const lot = ds.filter(t => !duocPhep.has(t.id));
  ok('⑤ chuông: 0 tin của người khác lọt sang', ds.length > 0 && lot.length === 0,
    `thấy ${ds.length} tin, lọt ${lot.length}; cả bảng có ${tinNhac(db).length} tin`);
  const gia = await goiAPI(banDaVa, env, '/api/cong-viec/nhac-tat', phien.K1,
    { method: 'POST', body: JSON.stringify({ tat: 1, nhan_su_id: 'SEP' }) });
  const cuaSep = db.prepare("SELECT nhac_viec_tat AS t FROM tai_khoan WHERE nhan_su_id='SEP'").get().t;
  const cuaK1 = db.prepare("SELECT nhac_viec_tat AS t FROM tai_khoan WHERE nhan_su_id='K1'").get().t;
  ok('⑤ nhét thêm nhan_su_id không đổi được cờ của người khác',
    gia.status === 200 && cuaSep === 0 && cuaK1 === 1, `SEP=${cuaSep} K1=${cuaK1}`);
}

process.exit(tongKet() ? 0 : 1);
