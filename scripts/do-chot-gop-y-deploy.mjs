/* ============================================================================
   ĐO: DEPLOY XONG THÌ GÓP Ý CÓ TỰ CHUYỂN SANG "ĐÃ XONG" ĐÚNG KHÔNG
   ---------------------------------------------------------------------------
   Chạy:  npm run do-chot-gopy      (node scripts/do-chot-gop-y-deploy.mjs)

   ĐO THẬT, KHÔNG CHÉP LẠI (BH-34): bàn thử này gọi ĐÚNG cửa HTTP thật của
   Worker — `(await import('../src/index.js')).default.fetch(req, env)` — trên
   một SQLite dựng từ ĐÚNG các file `migrations/*.sql` của repo. Không một
   dòng luật nào được gõ lại ở đây. Nếu `src/index.js` sai, bàn này phải đỏ.

   SÁU CÂU HỎI PHẢI TRẢ LỜI BẰNG SỐ:
     ① Deploy CÓ mã góp ý → đúng góp ý đó đổi, góp ý khác KHÔNG đụng?
     ② Deploy KHÔNG có mã → đúng 0 góp ý bị đổi?
     ③ Mã không tồn tại / đã đóng / đã xoá → không nổ, không đổi bừa?
     ④ Người gửi nhận ĐÚNG 1 tin, dù deploy chạy lại nhiều lần?
     ⑤ ⚠️ CA ĐÓNG NHẦM — góp ý CHƯA QUA CỔNG DUYỆT mà commit khai đã sửa:
        máy có ĐỨNG LẠI không? (đây là ca quan trọng nhất cả file)
     ⑥ Chữ ký sai / bản tin cũ → 0 góp ý bị đổi?

   ĐỐI CHỨNG (BH-16 + BH-26): mỗi câu trên đi kèm một ca mà ta BIẾT CHẮC phải
   ra khác. Riêng ⑤ có đối chứng CƠ HỌC: chạy lại đúng ca đó nhưng gỡ rổ
   `TT_CHUA_QUA_CONG` khỏi luật (tiêm thẳng vào bản sao module). Nếu phép đo
   vẫn "đạt" thì PHÉP ĐO hỏng, không phải code đúng.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = (p) => readFileSync(path.join(GOC, p), 'utf8');
const KHOA = 'khoa-thu-nghiem-khong-dung-that';

let dat = 0, truot = 0;
const ok = (ten, dung, ct = '') => {
  if (dung) { dat++; console.log(`  ✅ ${ten}${ct ? ' — ' + ct : ''}`); }
  else { truot++; console.log(`  ❌ ${ten}${ct ? ' — ' + ct : ''}`); }
};
const chet = (m) => { console.error('\n💥 BÀN THỬ DỰNG SAI: ' + m); process.exit(2); };

/* ---- Tách câu SQL (chuỗi/chú thích không cắt nhầm) ----------------------- */
function tachCau(sql) {
  const ra = []; let cau = '', nhay = null, ghiChu = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (ghiChu) { if (c === '\n') { ghiChu = false; cau += c; } continue; }
    if (!nhay && c === '-' && sql[i + 1] === '-') { ghiChu = true; i++; continue; }
    if (!nhay && (c === "'" || c === '"')) nhay = c;
    else if (nhay && c === nhay) nhay = null;
    cau += c;
    if (c === ';' && !nhay) { if (cau.trim()) ra.push(cau); cau = ''; }
  }
  if (cau.trim()) ra.push(cau);
  return ra;
}

/* ---- Dựng DB từ ĐÚNG migrations của repo -------------------------------- */
const MIGRATIONS = [
  'them-schema-migrations.sql',
  'them-thong-bao.sql', 'them-thongbao-canhan.sql',
  'them-gopy.sql', 'them-gopy-tudong.sql', 'them-gopy-congduyet.sql',
  'them-gopy-lichsu-tacnhan.sql', 'them-gopy-cho-duyet-tu-luc.sql',
  'them-day-thongbao.sql',
  'them-gopy-da-len-that.sql'          // ← file của đợt này
];

function dungDB() {
  const db = new DatabaseSync(':memory:');
  // nhan_su + phong_ban: lấy từ schema.sql thật, không bịa bảng.
  for (const c of tachCau(doc('schema.sql'))) {
    try { db.exec(c); } catch (e) { if (!/already exists|duplicate/i.test(e.message)) chet(`schema.sql: ${e.message}`); }
  }
  for (const f of MIGRATIONS) {
    let t; try { t = doc('migrations/' + f); } catch { chet(`thiếu migrations/${f}`); }
    for (const c of tachCau(t)) {
      try { db.exec(c); }
      catch (e) { if (!/already exists|duplicate column|no such table/i.test(e.message)) chet(`${f}: ${e.message}`); }
    }
  }
  // Cột `deploy_sha` PHẢI có thật — thiếu là migration của đợt này chưa chạy.
  const cot = db.prepare('PRAGMA table_info(gop_y)').all().map(r => r.name);
  for (const c of ['deploy_sha', 'deploy_luc', 'deploy_cho_xac_nhan', 'deploy_tom_tat',
                   'bao_da_len_luc', 'dong_kieu'])
    if (!cot.includes(c)) chet(`gop_y thiếu cột ${c} — them-gopy-da-len-that.sql chưa chạy được`);

  db.exec(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam)
           VALUES ('ns_lan','Phạm Thị Lan','Lan','Nhân viên','Kho vận',1),
                  ('ns_huong','Vũ Lan Hương','Hương','Nhân viên','Hành chính nhân sự',1),
                  ('ns_sep','Bùi Thị Ngọc','Ngọc','Giám đốc','Ban giám đốc',1)`);
  return db;
}

/* ---- Vỏ D1 tối thiểu — đúng bề mặt mà src/index.js dùng ------------------ */
function voD1(db) {
  return {
    prepare(sql) {
      let ts = [];
      const api = {
        bind: (...a) => { ts = a; return api; },
        first: async () => db.prepare(sql).get(...ts) ?? null,
        all:   async () => ({ results: db.prepare(sql).all(...ts) }),
        run:   async () => { const r = db.prepare(sql).run(...ts); return { meta: { rows_written: Number(r.changes) } }; }
      };
      return api;
    }
  };
}

/* ---- Một góp ý mẫu ------------------------------------------------------ */
let idTiep = 1;
function themGopY(db, { trang_thai, nguoi = 'ns_lan', tieu_de = 'Góp ý thử', bang_chung = null }) {
  const id = idTiep++;
  db.prepare(`INSERT INTO gop_y (id, nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon,
                                 trang_thai, bang_chung_url, tao_luc, cap_nhat_luc)
              VALUES (?,?,?,'bc','vd','mm',?,?,datetime('now'),datetime('now'))`)
    .run(id, nguoi, tieu_de, trang_thai, bang_chung);
  return id;
}
const xem = (db, id) => db.prepare('SELECT * FROM gop_y WHERE id = ?').get(id);
const demTin = (db, ns) =>
  db.prepare("SELECT COUNT(*) n FROM thong_bao WHERE nguoi_nhan_id = ? AND loai = 'gop_y_cap_nhat'").get(ns).n;
const anhChup = (db) =>
  JSON.stringify(db.prepare('SELECT id, trang_thai, deploy_sha, deploy_cho_xac_nhan, bao_da_len_luc FROM gop_y ORDER BY id').all());

/* ---- Gọi ĐÚNG cửa HTTP thật của Worker ---------------------------------- */
async function goiDeploy(worker, db, cacCommit, { khoa = KHOA, kyBang = KHOA, luc = new Date().toISOString() } = {}) {
  const than = JSON.stringify({ luc, cac_commit: cacCommit });
  const req = new Request('https://x/api/gop-y/da-len-that', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-erp-chu-ky': 'sha256=' + createHmac('sha256', kyBang).update(than).digest('hex') },
    body: than
  });
  const tl = await worker.fetch(req, { DB: voD1(db), DEPLOY_CHOT_KHOA: khoa });
  return { ma: tl.status, than: await tl.json().catch(() => ({})) };
}

/* ========================================================================== */
async function main() {
  console.log('\n═══ ĐO: deploy xong thì góp ý có tự chuyển sang "đã xong" không ═══\n');
  const worker = (await import('file://' + path.join(GOC, 'src/index.js').replace(/\\/g, '/'))).default;

  /* ── ① Deploy CÓ mã → đúng góp ý đó đổi, góp ý khác không đụng ────────── */
  console.log('① Deploy CÓ mã góp ý');
  {
    const db = dungDB(); idTiep = 1;
    const A = themGopY(db, { trang_thai: 'dang_lam', tieu_de: 'Không hiện thông báo khi có tin nhắn đến' });
    const B = themGopY(db, { trang_thai: 'dang_lam', tieu_de: 'Việc khác hoàn toàn', nguoi: 'ns_huong' });
    const C = themGopY(db, { trang_thai: 'san_sang_phat_hanh', tieu_de: 'Đã nghiệm thu, chờ phát hành' });
    const truoc = anhChup(db);
    const kq = await goiDeploy(worker, db, [
      { sha: 'a'.repeat(40), tieu_de: `GY-${A}: gộp thông báo tin nhắn`, than: '' },
      { sha: 'b'.repeat(40), tieu_de: `GY-${C} phát hành bản vá danh sách`, than: '' }
    ]);
    ok('cửa trả 200', kq.ma === 200, `mã ${kq.ma}`);
    ok(`GY-${A} (đang làm) → "cho_nghiem_thu"`, xem(db, A).trang_thai === 'cho_nghiem_thu', xem(db, A).trang_thai);
    ok(`GY-${C} (sẵn sàng phát hành) → "hoan_thanh"`, xem(db, C).trang_thai === 'hoan_thanh', xem(db, C).trang_thai);
    ok(`GY-${A} được đóng dấu commit`, /^a{40}$/.test(xem(db, A).deploy_sha || ''));
    ok(`GY-${A} có một câu tóm tắt "đã sửa gì"`, !!xem(db, A).deploy_tom_tat, JSON.stringify(xem(db, A).deploy_tom_tat));
    const b = xem(db, B);
    ok(`GY-${B} KHÔNG bị đụng tới`,
      b.trang_thai === 'dang_lam' && !b.deploy_sha && !b.deploy_cho_xac_nhan && !b.bao_da_len_luc,
      `vẫn "${b.trang_thai}", không dấu deploy`);
    ok(`chị Lan nhận ĐÚNG 2 tin (GY-${A} và GY-${C}, mỗi cái 1)`,
      demTin(db, 'ns_lan') === 2, demTin(db, 'ns_lan') + ' tin');
    ok('chị Hương (người gửi GY-' + B + ') nhận 0 tin', demTin(db, 'ns_huong') === 0, demTin(db, 'ns_huong') + ' tin');
    ok('không có dòng lịch sử nào cho GY-' + B,
      db.prepare('SELECT COUNT(*) n FROM gop_y_lich_su WHERE gop_y_id = ?').get(B).n === 0);
    // ĐỐI CHỨNG: cùng bản tin nhưng đổi mã sang một số không ai dùng.
    const db2 = dungDB(); idTiep = 1;
    const A2 = themGopY(db2, { trang_thai: 'dang_lam' });
    await goiDeploy(worker, db2, [{ sha: 'a'.repeat(40), tieu_de: 'GY-99999: sửa gì đó', than: '' }]);
    ok('ĐỐI CHỨNG mã khác → góp ý KHÔNG đổi', xem(db2, A2).trang_thai === 'dang_lam', xem(db2, A2).trang_thai);
  }

  /* ── ② Deploy KHÔNG có mã → 0 góp ý bị đổi ───────────────────────────── */
  console.log('\n② Deploy KHÔNG nhắc mã góp ý nào');
  {
    const db = dungDB(); idTiep = 1;
    themGopY(db, { trang_thai: 'dang_lam' });
    themGopY(db, { trang_thai: 'san_sang_phat_hanh' });
    themGopY(db, { trang_thai: 'cho_nghiem_thu' });
    const truoc = anhChup(db);
    const kq = await goiDeploy(worker, db, [
      { sha: 'c'.repeat(40), tieu_de: 'Dọn chú thích, không đụng nghiệp vụ', than: 'Chỉ sửa chính tả.' },
      // BIÊN: những chuỗi TRÔNG GIỐNG mã mà KHÔNG PHẢI mã. Cả 4 đều trỏ tới
      // góp ý số 2 đang tồn tại thật trong DB — bắt nhầm một cái là thấy ngay.
      { sha: 'd'.repeat(40), tieu_de: 'Vá LEGY-2 và GY-2a và GY2', than: 'legacy GY_ nothing, ORGY-2' }
    ]);
    ok('cửa trả 200', kq.ma === 200, `mã ${kq.ma}`);
    ok('0 góp ý bị đổi', anhChup(db) === truoc, kq.than.da_doi + ' báo đổi');
    ok('0 thông báo được gửi', demTin(db, 'ns_lan') === 0);
    // ĐỐI CHỨNG: thêm ĐÚNG một mã thật vào cùng bản tin → phải đổi.
    const kq2 = await goiDeploy(worker, db, [{ sha: 'e'.repeat(40), tieu_de: 'GY-1 vá thật', than: '' }]);
    ok('ĐỐI CHỨNG có mã thật → CÓ đổi', anhChup(db) !== truoc && kq2.than.da_doi === 1, kq2.than.da_doi + ' đổi');
  }

  /* ── ③ Mã không tồn tại / đã đóng / đã xoá ───────────────────────────── */
  console.log('\n③ Mã hỏng: không tồn tại · đã đóng · đã xoá');
  {
    const db = dungDB(); idTiep = 1;
    const daXong = themGopY(db, { trang_thai: 'hoan_thanh' });
    const daHuy  = themGopY(db, { trang_thai: 'da_huy' });
    const daXoa  = themGopY(db, { trang_thai: 'dang_lam' });
    db.prepare('DELETE FROM gop_y WHERE id = ?').run(daXoa);
    const truoc = anhChup(db);
    const kq = await goiDeploy(worker, db, [
      { sha: 'f'.repeat(40), tieu_de: `GY-${daXong} GY-${daHuy} GY-${daXoa} GY-4242 vá gộp`, than: '' }
    ]);
    ok('không nổ (200)', kq.ma === 200, `mã ${kq.ma}`);
    ok('0 góp ý bị đổi', anhChup(db) === truoc, kq.than.da_doi + ' báo đổi');
    ok('0 thông báo được gửi', demTin(db, 'ns_lan') === 0);
    ok('mỗi mã hỏng đều có lý do ghi rõ',
      (kq.than.chi_tiet || []).length === 4 && kq.than.chi_tiet.every(q => q.hanh_dong === 'bo_qua'),
      (kq.than.chi_tiet || []).map(q => `${q.gop_y_id}:${q.ly_do}`).join(' '));
  }

  /* ── ④ Đúng 1 tin, dù deploy chạy lại ────────────────────────────────── */
  console.log('\n④ Người gửi nhận ĐÚNG 1 tin');
  {
    const db = dungDB(); idTiep = 1;
    const A = themGopY(db, { trang_thai: 'dang_lam' });
    const banTin = [{ sha: '1'.repeat(39) + 'a', tieu_de: `GY-${A} vá thật`, than: '' }];
    await goiDeploy(worker, db, banTin);
    ok('lần deploy 1 → 1 tin', demTin(db, 'ns_lan') === 1, demTin(db, 'ns_lan') + ' tin');
    await goiDeploy(worker, db, banTin);
    await goiDeploy(worker, db, banTin);
    ok('chạy lại 2 lần nữa → VẪN 1 tin', demTin(db, 'ns_lan') === 1, demTin(db, 'ns_lan') + ' tin');
    // Commit KHÁC nhắc lại cùng mã (đợt vá tiếp theo) — vẫn không nhắn lần hai.
    await goiDeploy(worker, db, [{ sha: '2'.repeat(39) + 'b', tieu_de: `GY-${A} vá tiếp`, than: '' }]);
    ok('commit khác nhắc lại cùng mã → VẪN 1 tin', demTin(db, 'ns_lan') === 1, demTin(db, 'ns_lan') + ' tin');
    // ĐỐI CHỨNG: một góp ý KHÁC của cùng người → phải có tin thứ hai.
    const B = themGopY(db, { trang_thai: 'dang_lam' });
    await goiDeploy(worker, db, [{ sha: '3'.repeat(39) + 'c', tieu_de: `GY-${B} vá cái khác`, than: '' }]);
    ok('ĐỐI CHỨNG góp ý khác → có tin thứ 2', demTin(db, 'ns_lan') === 2, demTin(db, 'ns_lan') + ' tin');
  }

  /* ── ⑤ ⚠️ CA ĐÓNG NHẦM — ca quan trọng nhất ─────────────────────────── */
  console.log('\n⑤ ⚠️ CA ĐÓNG NHẦM — góp ý CHƯA QUA CỔNG DUYỆT');
  {
    const db = dungDB(); idTiep = 1;
    const cac = {};
    for (const tt of ['moi', 'cho_phan_tich', 'dang_phan_tich', 'cho_quyet_dinh', 'bi_chan'])
      cac[tt] = themGopY(db, { trang_thai: tt, tieu_de: `Đang ở ${tt}` });
    const kq = await goiDeploy(worker, db, Object.values(cac).map((id, i) => ({
      sha: String(i) + 'a'.repeat(39), tieu_de: `GY-${id}: khai là đã sửa xong rồi`, than: ''
    })));
    ok('cửa trả 200', kq.ma === 200, `mã ${kq.ma}`);
    for (const [tt, id] of Object.entries(cac)) {
      const g = xem(db, id);
      ok(`"${tt}" KHÔNG bị đẩy sang xong`, g.trang_thai === tt, `vẫn "${g.trang_thai}"`);
      ok(`  "${tt}" dựng cờ chờ Sếp xác nhận`, g.deploy_cho_xac_nhan === 1);
    }
    ok('người gửi KHÔNG nhận tin "đã xong" nào', demTin(db, 'ns_lan') === 0, demTin(db, 'ns_lan') + ' tin');
    ok('lịch sử ghi tác nhân DEPLOY, KHÔNG mạo danh ai',
      db.prepare("SELECT COUNT(*) n FROM gop_y_lich_su WHERE tac_nhan='DEPLOY' AND nguoi_doi_id IS NULL").get().n === 5);

    /* ĐỐI CHỨNG CƠ HỌC (BH-16/BH-26) — bản sao module với rổ an toàn BỊ GỠ.
       Ca này ta BIẾT CHẮC phải ra khác: bỏ 'cho_phan_tich' khỏi TT_CHUA_QUA_CONG
       và nhét sang TT_DANG_XAY thì máy sẽ đẩy nó đi. Phép đo phải thấy được
       sự khác biệt đó — không thấy nghĩa là phép đo hỏng. */
    const nguon = doc('src/chot-gop-y-deploy.js')
      .replace("export const TT_DANG_XAY = ['da_duyet'", "export const TT_DANG_XAY = ['cho_phan_tich', 'da_duyet'")
      .replace("export const TT_CHUA_QUA_CONG = ['moi', 'cho_phan_tich',", "export const TT_CHUA_QUA_CONG = ['moi',");
    const thuMuc = mkdtempSync(path.join(tmpdir(), 'doichung-'));
    const f = path.join(thuMuc, 'hong.mjs');
    writeFileSync(f, nguon, 'utf8');
    const hong = await import('file://' + f.replace(/\\/g, '/'));
    const qd = hong.quyetDinhChot({ id: 9, trang_thai: 'cho_phan_tich' }, { sha: 'a'.repeat(40), tieu_de: 'x' });
    ok('ĐỐI CHỨNG bản GỠ CHỐT thì ĐẨY ĐI THẬT (phép đo đủ nhạy)',
      qd.hanh_dong === 'day_sang_nghiem_thu', qd.hanh_dong);
    const that = (await import('file://' + path.join(GOC, 'src/chot-gop-y-deploy.js').replace(/\\/g, '/')))
      .quyetDinhChot({ id: 9, trang_thai: 'cho_phan_tich' }, { sha: 'a'.repeat(40), tieu_de: 'x' });
    ok('bản THẬT đứng lại ở "chờ xác nhận"', that.hanh_dong === 'cho_xac_nhan', that.hanh_dong);
  }

  /* ── ⑥ Chữ ký sai / bản tin cũ / thiếu khoá ──────────────────────────── */
  console.log('\n⑥ Cửa vào: chữ ký sai · bản tin cũ · thiếu khoá');
  {
    const db = dungDB(); idTiep = 1;
    const A = themGopY(db, { trang_thai: 'dang_lam' });
    const truoc = anhChup(db);
    const banTin = [{ sha: '9'.repeat(39) + 'a', tieu_de: `GY-${A} vá thật`, than: '' }];

    const saiKy = await goiDeploy(worker, db, banTin, { kyBang: 'khoa-gia-mao' });
    ok('chữ ký sai → 401', saiKy.ma === 401, `mã ${saiKy.ma}`);
    ok('  và 0 góp ý bị đổi', anhChup(db) === truoc);

    const cu = await goiDeploy(worker, db, banTin, { luc: new Date(Date.now() - 3 * 3600e3).toISOString() });
    ok('bản tin 3 tiếng trước → 401', cu.ma === 401, `mã ${cu.ma}`);
    ok('  và 0 góp ý bị đổi', anhChup(db) === truoc);

    const thieu = await goiDeploy(worker, db, banTin, { khoa: '' });
    ok('máy chủ chưa đặt khoá → 503', thieu.ma === 503, `mã ${thieu.ma}`);
    ok('  và 0 góp ý bị đổi', anhChup(db) === truoc);

    // ĐỐI CHỨNG: đúng khoá, đúng mốc → phải đổi.
    const dung = await goiDeploy(worker, db, banTin);
    ok('ĐỐI CHỨNG chữ ký đúng → CÓ đổi', dung.ma === 200 && anhChup(db) !== truoc, `mã ${dung.ma}`);
  }

  /* ── ⑦ SCRIPT ĐÓNG LÙI — chỉ đổi đúng những dòng đã in ra ────────────── */
  console.log('\n⑦ Script đóng lùi (scripts/dong-lui-gop-y.mjs)');
  {
    const { lenhDongLui } = await import('file://' + path.join(GOC, 'scripts/dong-lui-gop-y.mjs').replace(/\\/g, '/'));
    const db = dungDB(); idTiep = 1;
    // Dựng đúng hai ca thật của ngày 28/08 + ba dòng "người ngoài cuộc".
    const LAN   = themGopY(db, { trang_thai: 'cho_phan_tich', nguoi: 'ns_lan',
                                 tieu_de: 'Không hiện thông báo khi có tin nhắn đến' });
    const HUONG = themGopY(db, { trang_thai: 'cho_phan_tich', nguoi: 'ns_huong',
                                 tieu_de: 'không hiển thị hết công việc public ở mục Việc cần làm' });
    const NGOAI = [themGopY(db, { trang_thai: 'cho_phan_tich', nguoi: 'ns_lan', tieu_de: 'Việc chưa làm 1' }),
                   themGopY(db, { trang_thai: 'dang_lam',      nguoi: 'ns_huong', tieu_de: 'Việc chưa làm 2' }),
                   themGopY(db, { trang_thai: 'moi',           nguoi: 'ns_lan', tieu_de: 'Việc chưa làm 3' })];

    const COT = 'id, trang_thai, deploy_sha, deploy_cho_xac_nhan, bao_da_len_luc, dong_kieu, bang_chung_url';
    const chup = () => new Map(db.prepare(`SELECT ${COT} FROM gop_y ORDER BY id`).all().map(r => [r.id, JSON.stringify(r)]));
    const truoc = chup();

    const keHoach = [
      { id: LAN,   sha: '7bf0e58', tomTat: 'Gộp thông báo tin nhắn', trangThaiDaIn: 'cho_phan_tich' },
      { id: HUONG, sha: 'cc13f89', tomTat: 'Bỏ LIMIT làm cắt mất việc public', trangThaiDaIn: 'cho_phan_tich' }
    ];
    for (const k of keHoach)
      for (const sql of lenhDongLui({ ...k, uyQuyenBoiId: 'ns_sep', daBaoRoi: false })) db.exec(sql);

    ok(`GY-${LAN} (chị Lan) → hoan_thanh`, xem(db, LAN).trang_thai === 'hoan_thanh', xem(db, LAN).trang_thai);
    ok(`GY-${HUONG} (chị Hương) → hoan_thanh`, xem(db, HUONG).trang_thai === 'hoan_thanh', xem(db, HUONG).trang_thai);
    ok('cả hai có bằng chứng commit', !!xem(db, LAN).bang_chung_url && !!xem(db, HUONG).bang_chung_url,
      `${xem(db, LAN).bang_chung_url} · ${xem(db, HUONG).bang_chung_url}`);
    ok('mỗi người nhận đúng 1 tin', demTin(db, 'ns_lan') === 1 && demTin(db, 'ns_huong') === 1,
      `Lan ${demTin(db, 'ns_lan')} · Hương ${demTin(db, 'ns_huong')}`);
    ok('lịch sử ghi "ĐÓNG LÙI TAY", uỷ quyền ns_sep, KHÔNG mạo danh',
      db.prepare(`SELECT COUNT(*) n FROM gop_y_lich_su
                   WHERE tac_nhan = 'ĐÓNG LÙI TAY' AND nguoi_doi_id IS NULL
                     AND uy_quyen_boi_id = 'ns_sep'`).get().n === 2);

    const sau = chup();
    const doi = [...sau.keys()].filter(id => truoc.get(id) !== sau.get(id));
    ok('CHỈ 2 dòng bị đổi — 0 dòng nào khác', doi.length === 2 && doi.every(i => [LAN, HUONG].includes(i)),
      `đổi: ${doi.map(i => 'GY-' + i).join(',')} · người ngoài cuộc: ${NGOAI.map(i => 'GY-' + i).join(',')} nguyên vẹn`);

    // Chạy lại y hệt → không nhắn lần hai (chốt `daBaoRoi`), và WHERE bắt được.
    const truoc2 = chup();
    for (const k of keHoach)
      for (const sql of lenhDongLui({ ...k, uyQuyenBoiId: 'ns_sep', daBaoRoi: true })) db.exec(sql);
    ok('chạy lại → 0 dòng đổi thêm', JSON.stringify([...chup()]) === JSON.stringify([...truoc2]));
    ok('chạy lại → VẪN đúng 1 tin mỗi người', demTin(db, 'ns_lan') === 1 && demTin(db, 'ns_huong') === 1,
      `Lan ${demTin(db, 'ns_lan')} · Hương ${demTin(db, 'ns_huong')}`);

    /* ĐỐI CHỨNG (BH-26) — chốt `WHERE trang_thai = <đã in>` có thật sự cắn?
       Dựng đúng tình huống nguy hiểm: bảng in ra lúc góp ý ở 'cho_phan_tich',
       nhưng trong lúc Gạo đọc thì Sếp đã chuyển nó sang 'bi_chan'. Câu lệnh
       PHẢI không ghi được dòng nào. Không cắn = script ghi đè quyết định của
       người, đúng thứ nguy hiểm nhất của một dụng cụ đóng lùi. */
    const KHAC = themGopY(db, { trang_thai: 'bi_chan', tieu_de: 'Đã bị Sếp chặn sau khi in bảng' });
    const t3 = chup();
    for (const sql of lenhDongLui({ id: KHAC, sha: 'abc1234', tomTat: 'x',
                                    trangThaiDaIn: 'cho_phan_tich', uyQuyenBoiId: 'ns_sep' })) db.exec(sql);
    ok('ĐỐI CHỨNG dòng đã đổi từ lúc in → 0 dòng bị ghi',
      JSON.stringify([...chup()]) === JSON.stringify([...t3]), `GY-${KHAC} vẫn "${xem(db, KHAC).trang_thai}"`);
    ok('ĐỐI CHỨNG và cũng KHÔNG sinh lịch sử / thông báo ma',
      db.prepare('SELECT COUNT(*) n FROM gop_y_lich_su WHERE gop_y_id = ?').get(KHAC).n === 0 &&
      db.prepare('SELECT COUNT(*) n FROM thong_bao WHERE lien_ket = ?').get(String(KHAC)).n === 0);
    // Và chứng minh phép đo đủ nhạy: cùng dòng đó, khai ĐÚNG trạng thái → ghi được.
    for (const sql of lenhDongLui({ id: KHAC, sha: 'abc1234', tomTat: 'x',
                                    trangThaiDaIn: 'bi_chan', uyQuyenBoiId: 'ns_sep' })) db.exec(sql);
    ok('ĐỐI CHỨNG khai đúng trạng thái → CÓ ghi (phép đo đủ nhạy)',
      xem(db, KHAC).trang_thai === 'hoan_thanh', xem(db, KHAC).trang_thai);
  }

  /* ── ⑧ Nút mới: ngưỡng ngón tay 44px + luật ba màu ──────────────────── */
  console.log('\n⑧ Nút mới trên màn Góp ý');
  {
    const app = doc('public/assets/js/app.js');
    const css = doc('public/assets/css/style.css');
    const the = app.slice(app.indexOf('function veTheDaLen'), app.indexOf('function veTheDaLen') + 1400);
    const nutNgoai = [...the.matchAll(/<button[^>]*>/g)].length;
    const trongKhung = (the.match(/gy-the-nut/g) || []).length;
    ok('cả 2 nút nằm trong khung .gy-the-nut', nutNgoai === 2 && trongKhung === 1, `${nutNgoai} nút`);
    const luat = css.match(/\.gy-the-nut > button \{[^}]*\}/);
    ok('.gy-the-nut > button có min-height 44px', !!luat && /min-height:\s*44px/.test(luat[0]),
      luat ? luat[0].trim() : 'KHÔNG TÌM THẤY LUẬT');
    // ĐỐI CHỨNG: gỡ đúng luật đó ra thì phép đo phải đỏ.
    const cssHong = css.replace(/\.gy-the-nut > button \{[^}]*\}/, '.gy-the-nut > button { min-height: 30px; }');
    const luatHong = cssHong.match(/\.gy-the-nut > button \{[^}]*\}/);
    ok('ĐỐI CHỨNG hạ xuống 30px thì phép đo BẮT ĐƯỢC',
      !!luatHong && !/min-height:\s*44px/.test(luatHong[0]), luatHong[0].trim());
    ok('nút mới KHÔNG tự bịa màu (chỉ btn-primary / btn-phu)',
      !/style="[^"]*(color|background)/i.test(the) &&
      /btn-primary/.test(the) && /btn-phu/.test(the));
  }

  console.log(`\n═══ ${dat} đạt · ${truot} trượt ═══\n`);
  process.exit(truot ? 1 : 0);
}

main().catch(e => { console.error('\n💥 ' + (e.stack || e.message)); process.exit(2); });
