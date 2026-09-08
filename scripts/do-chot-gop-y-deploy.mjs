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
  'them-day-thongbao.sql', 'them-quyen-duyet-gopy.sql',
  'them-danhmuc-nen.sql',              // nhan_su.phong_ban_id — docPhien() đọc
  'them-sao-luu.sql',                  // bảng sao_luu_canh_bao — chốt 1 tin/ngày
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
  JSON.stringify(db.prepare('SELECT id, trang_thai, deploy_sha, deploy_cho_xac_nhan, bao_da_len_luc, deploy_tt_cu FROM gop_y ORDER BY id').all());
const demLichSu = (db, id) =>
  db.prepare('SELECT COUNT(*) n FROM gop_y_lich_su WHERE gop_y_id = ?').get(id).n;
/* Đọc ĐÚNG câu đến tay người gửi — REV-0042 mục 2a đòi hai câu KHÁC NHAU cho
   hai sự thật khác nhau ("đã xong" ≠ "đã có bản sửa, chờ Sếp xác nhận"). */
const cacTin = (db, ns) =>
  db.prepare("SELECT noi_dung FROM thong_bao WHERE nguoi_nhan_id = ? AND loai = 'gop_y_cap_nhat' ORDER BY id").all(ns)
    .map(r => r.noi_dung);

/* ---- Gọi ĐÚNG cửa HTTP thật của Worker ---------------------------------- */
async function goiDeploy(worker, db, cacCommit, { khoa = KHOA, kyBang = KHOA, luc = new Date().toISOString(),
                                                  env = {} } = {}) {
  /* Từ REV-0042, bản tin mang thêm DANH SÁCH FILE BỊ ĐỔI — máy chủ đòi bằng
     chứng chứ không tin lời khai trong thông điệp commit. Ca nào không nói rõ
     thì mặc định là một bản vá code thật, để mọi phép đo cũ vẫn đo đúng thứ nó
     định đo; ca nào cần soi chốt bằng chứng thì khai `cac_tep` tường minh. */
  const than = JSON.stringify({ luc, cac_commit: cacCommit.map(c =>
    ('cac_tep' in c ? c : { ...c, cac_tep: ['src/index.js'] })) });
  const req = new Request('https://x/api/gop-y/da-len-that', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-erp-chu-ky': 'sha256=' + createHmac('sha256', kyBang).update(than).digest('hex') },
    body: than
  });
  const tl = await worker.fetch(req, { DB: voD1(db), DEPLOY_CHOT_KHOA: khoa, ...env });
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
    ok('  và chỉ 1 dòng lịch sử (T3 — phát lại không đẻ lịch sử)', demLichSu(db, A) === 1, demLichSu(db, A) + ' dòng');

    /* ⚠️ ĐỔI SO VỚI BẢN TRƯỚC — REV-0042 C4. Bản trước đóng dấu "đã báo" VĨNH
       VIỄN theo góp ý, nên vòng nghiệm thu thứ 2 CÂM: sửa lại, deploy lại, và
       người gửi không bao giờ nghe gì nữa. Chốt đúng phải là (góp ý, commit):
       commit KHÁC = đợt vá khác = đáng một tin. */
    await goiDeploy(worker, db, [{ sha: '2'.repeat(39) + 'b', tieu_de: `GY-${A} vá tiếp vòng 2`, than: '' }]);
    ok('C4: đợt vá SAU (commit khác) → người gửi ĐƯỢC báo tiếp',
      demTin(db, 'ns_lan') === 2, demTin(db, 'ns_lan') + ' tin');
    // ĐỐI CHỨNG CẮT QUÁ TAY: đúng commit ấy phát lại → KHÔNG được thành tin 3.
    await goiDeploy(worker, db, [{ sha: '2'.repeat(39) + 'b', tieu_de: `GY-${A} vá tiếp vòng 2`, than: '' }]);
    ok('ĐỐI CHỨNG cùng commit phát lại → VẪN 2 tin, không nhắn thừa',
      demTin(db, 'ns_lan') === 2, demTin(db, 'ns_lan') + ' tin');
    // ĐỐI CHỨNG: một góp ý KHÁC của cùng người → phải có tin riêng.
    const B = themGopY(db, { trang_thai: 'dang_lam' });
    await goiDeploy(worker, db, [{ sha: '3'.repeat(39) + 'c', tieu_de: `GY-${B} vá cái khác`, than: '' }]);
    ok('ĐỐI CHỨNG góp ý khác → có tin riêng', demTin(db, 'ns_lan') === 3, demTin(db, 'ns_lan') + ' tin');
  }

  /* ── ⑤ ⚠️ CA ĐÓNG NHẦM — ca quan trọng nhất ─────────────────────────── */
  console.log('\n⑤ ⚠️ CA ĐÓNG NHẦM — góp ý CHƯA QUA CỔNG DUYỆT');
  {
    const db = dungDB(); idTiep = 1;
    const cac = {};
    for (const tt of ['moi', 'dang_phan_tich', 'cho_quyet_dinh', 'bi_chan'])
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
    /* ⚠️ ĐỔI SO VỚI BẢN TRƯỚC — Gạo chốt 29/08 mục 2a: rổ an toàn giữ nguyên
       nguyên tắc (máy KHÔNG tự đóng), nhưng KHÔNG ĐƯỢC IM. Nỗi đau gốc của Sếp
       là "người báo không biết" — cái đó giải được ngay, không cần đợi ai bấm
       nút. Câu gửi đi phải là "đang chờ Sếp xác nhận", TUYỆT ĐỐI không phải
       "đã sửa xong". */
    const tin = cacTin(db, 'ns_lan');
    ok('người gửi ĐƯỢC báo (không im nữa)', tin.length === 4, tin.length + ' tin');
    ok('  và câu đó nói ĐÚNG SỰ THẬT — "chờ Sếp xác nhận", KHÔNG nói "đã xong"',
      tin.every(t => /đang chờ Sếp xác nhận/.test(t) && !/đã được sửa xong/.test(t)),
      JSON.stringify(tin[0] || ''));
    ok('  KHÔNG đóng dấu "đã báo xong" (để lúc Sếp gật còn báo được tin thật)',
      Object.values(cac).every(id => !xem(db, id).bao_da_len_luc));
    ok('lịch sử ghi tác nhân DEPLOY, KHÔNG mạo danh ai',
      db.prepare("SELECT COUNT(*) n FROM gop_y_lich_su WHERE tac_nhan='DEPLOY' AND nguoi_doi_id IS NULL").get().n === 4);

    /* ĐỐI CHỨNG CƠ HỌC (BH-16/BH-26) — bản sao module với rổ an toàn BỊ GỠ.
       Ca này ta BIẾT CHẮC phải ra khác: nhét 'bi_chan' sang TT_DANG_XAY thì máy
       sẽ đẩy nó đi. Phép đo phải thấy được sự khác biệt đó — không thấy nghĩa
       là phép đo hỏng, không phải code đúng. */
    const CM = { sha: 'a'.repeat(40), tieu_de: 'x', cac_tep: ['src/index.js'] };
    const nguon = doc('src/chot-gop-y-deploy.js')
      .replace("export const TT_DANG_XAY = ['da_duyet'", "export const TT_DANG_XAY = ['bi_chan', 'da_duyet'")
      .replace("export const TT_CHUA_QUA_CONG = ['moi', 'dang_phan_tich',", "export const TT_CHUA_QUA_CONG = ['moi',");
    const thuMuc = mkdtempSync(path.join(tmpdir(), 'doichung-'));
    const f = path.join(thuMuc, 'hong.mjs');
    writeFileSync(f, nguon, 'utf8');
    const hong = await import('file://' + f.replace(/\\/g, '/'));
    ok('ĐỐI CHỨNG bản GỠ CHỐT thì ĐẨY ĐI THẬT (phép đo đủ nhạy)',
      hong.quyetDinhChot({ id: 9, trang_thai: 'bi_chan' }, CM).hanh_dong === 'day_sang_nghiem_thu');
    const THAT = await import('file://' + path.join(GOC, 'src/chot-gop-y-deploy.js').replace(/\\/g, '/'));
    ok('bản THẬT đứng lại ở "chờ xác nhận"',
      THAT.quyetDinhChot({ id: 9, trang_thai: 'bi_chan' }, CM).hanh_dong === 'cho_xac_nhan');
  }

  /* ── ⑤b QUY TRÌNH HỤT: `cho_phan_tich` + code đã lên thật ────────────────
     Gạo chốt 29/08 mục 2b. Hồ Ly đọc DB thật: 4/4 góp ý đang mở đều ở
     `cho_phan_tich`, nên bản trước đóng ĐÚNG 0 GÓP Ý — "dời việc, không bớt
     việc". Nhưng cả 4 đã sửa xong và lên thật từ lâu: ở repo này
     `cho_phan_tich` là bằng chứng QUY TRÌNH HỤT, không phải bằng chứng chưa
     làm. Đẩy sang CHỜ NGHIỆM THU — không bao giờ sang "hoàn thành". */
  console.log('\n⑤b Quy trình hụt: "cho_phan_tich" + commit đụng code thật');
  {
    const db = dungDB(); idTiep = 1;
    const A = themGopY(db, { trang_thai: 'cho_phan_tich', tieu_de: 'Không hiện thông báo khi có tin nhắn đến' });
    await goiDeploy(worker, db, [{ sha: 'a'.repeat(40), tieu_de: `GY-${A}: gộp thông báo tin nhắn`,
                                   than: '', cac_tep: ['src/index.js', 'public/assets/js/app.js'] }]);
    const g = xem(db, A);
    ok('→ "cho_nghiem_thu" (chờ Sếp nghiệm thu)', g.trang_thai === 'cho_nghiem_thu', g.trang_thai);
    ok('  KHÔNG bao giờ tự sang "hoan_thanh"', g.trang_thai !== 'hoan_thanh');
    ok('  người gửi được báo', demTin(db, 'ns_lan') === 1, demTin(db, 'ns_lan') + ' tin');
    ok('  cất được chỗ cũ để lùi (deploy_tt_cu)', g.deploy_tt_cu === 'cho_phan_tich', String(g.deploy_tt_cu));

    // ĐỐI CHỨNG CẮT QUÁ TAY: đúng góp ý đó, nhưng commit CHỈ sửa tài liệu.
    const db2 = dungDB(); idTiep = 1;
    const A2 = themGopY(db2, { trang_thai: 'cho_phan_tich' });
    await goiDeploy(worker, db2, [{ sha: 'b'.repeat(40), tieu_de: `GY-${A2}: ghi chép lại`,
                                    than: '', cac_tep: ['docs/reviews/REV-0042.md'] }]);
    ok('ĐỐI CHỨNG commit chỉ sửa tài liệu → KHÔNG đẩy, 0 tin',
      xem(db2, A2).trang_thai === 'cho_phan_tich' && demTin(db2, 'ns_lan') === 0,
      xem(db2, A2).trang_thai);
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

  /* ══════════════════════════════════════════════════════════════════════
     ⑨ BÀN ĐỐI KHÁNG REV-0042 — DỰNG LẠI ĐỦ 9 CA CỦA HỒ LY
     ----------------------------------------------------------------------
     Bàn thử bản trước 59 đạt / 0 trượt mà KHÔNG CÓ MỘT CA GÕ NHẦM MÃ NÀO.
     Hồ Ly dựng riêng bàn đối kháng: 22 đạt / 10 trượt, thủng 6/9.
     Dựng lại nguyên văn 9 ca đó ở đây để lần sau không ai phải dựng lại.
     ════════════════════════════════════════════════════════════════════ */
  console.log('\n⑨ BÀN ĐỐI KHÁNG REV-0042 — 9 ca đóng nhầm của Hồ Ly');
  {
    // Ca 1 — GÕ NHẦM MÃ. Commit ghi GY-1 mà định GY-2.
    {
      const db = dungDB(); idTiep = 1;
      const VOCAN = themGopY(db, { trang_thai: 'da_duyet', nguoi: 'ns_lan',
                                   tieu_de: 'Góp ý chả liên quan của chị Lan' });
      themGopY(db, { trang_thai: 'da_duyet', nguoi: 'ns_huong', tieu_de: 'Cái đáng lẽ phải sửa' });
      await goiDeploy(worker, db, [{ sha: 'a'.repeat(40), tieu_de: `GY-${VOCAN}: vá lỗi X`,
                                     than: '', cac_tep: ['src/index.js'] }]);
      const g = xem(db, VOCAN);
      /* Gõ nhầm số thì máy KHÔNG cách nào biết — nó vẫn đẩy. Cái phải kín là:
         Sếp NHÌN THẤY và GỠ ĐƯỢC (C3), và người gửi nhận câu đúng mức độ. */
      ok('ca 1 gõ nhầm mã: máy có cất chỗ cũ để lùi được', g.deploy_tt_cu === 'da_duyet', String(g.deploy_tt_cu));
      ok('  và hiện lên panel của Sếp (deploy_tt_cu ≠ NULL)', !!g.deploy_tt_cu);
    }

    // Ca 2 — LƯỢT ĐẨY CHỈ CÓ COMMIT REVERT. Bản vá vừa bị GỠ.
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'da_duyet' });
      const truoc = anhChup(db);
      const kq = await goiDeploy(worker, db, [{ sha: 'b'.repeat(40),
        tieu_de: `Revert "GY-${A} sửa lỗi X"`, than: `This reverts commit ${'a'.repeat(40)}.`,
        cac_tep: ['src/index.js'] }]);
      ok('ca 2 revert: 0 góp ý bị đổi', anhChup(db) === truoc, kq.than.da_doi + ' đổi');
      ok('  0 tin cho người gửi', demTin(db, 'ns_lan') === 0, demTin(db, 'ns_lan') + ' tin');
      ok('  lý do ghi rõ là commit lùi',
        (kq.than.chi_tiet || []).some(q => q.ly_do === 'commit_lui'),
        JSON.stringify((kq.than.chi_tiet || []).map(q => q.ly_do)));
    }

    // Ca 3 — REVERT SAU KHI GÓP Ý ĐÃ `hoan_thanh`. Nhãn nói dối.
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'hoan_thanh' });
      const kq = await goiDeploy(worker, db, [{ sha: 'c'.repeat(40),
        tieu_de: `Revert "GY-${A} sửa lỗi X"`, than: '', cac_tep: ['src/index.js'] }]);
      ok('ca 3 revert sau khi đã đóng: KHÔNG tự mở lại (quyết định của người)',
        xem(db, A).trang_thai === 'hoan_thanh');
      ok('  nhưng KÊU cho Sếp thay vì im',
        (kq.than.chi_tiet || []).some(q => q.hanh_dong === 'canh_bao_lui' && q.bao_sep),
        JSON.stringify((kq.than.chi_tiet || []).map(q => q.hanh_dong)));
      ok('  và để lại vết trong lịch sử', demLichSu(db, A) === 1, demLichSu(db, A) + ' dòng');
      ok('  0 tin "đã xong" cho người gửi', demTin(db, 'ns_lan') === 0);
    }

    // Ca 4 — GỘP NHÁNH CŨ BỎ DỞ (góp ý đang `can_chinh_sua`).
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'can_chinh_sua' });
      await goiDeploy(worker, db, [{ sha: 'd'.repeat(40), tieu_de: `GY-${A} làm dở`,
                                     than: '', cac_tep: ['src/index.js'] }]);
      /* Code CÓ lên thật — đẩy sang chờ nghiệm thu là đúng phần cơ học của
         máy. Cái bản trước thiếu là ĐƯỜNG LÙI; giờ có. */
      ok('ca 4 gộp nhánh bỏ dở: lùi được (chỗ cũ đã cất)',
        xem(db, A).deploy_tt_cu === 'can_chinh_sua', String(xem(db, A).deploy_tt_cu));
      ok('  KHÔNG bao giờ nhảy thẳng "hoan_thanh"', xem(db, A).trang_thai === 'cho_nghiem_thu');
    }

    // Ca 5 — gộp nhánh chứa mã của góp ý ĐÃ ĐÓNG (Hồ Ly đo: đã kín).
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'hoan_thanh' });
      const truoc = anhChup(db);
      await goiDeploy(worker, db, [{ sha: 'e'.repeat(40), tieu_de: `GY-${A} vá lại`, than: '' }]);
      ok('ca 5 mã của góp ý đã đóng → 0 đổi, 0 tin',
        anhChup(db) === truoc && demTin(db, 'ns_lan') === 0);
    }

    // Ca 6 — deploy hỏng giữa chừng: bước chốt không chạy (đo ở YAML, câu ⑩).
    // Ca 7 — hai mã trong một commit, mỗi mã xử đúng rổ riêng.
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'san_sang_phat_hanh' });
      const B = themGopY(db, { trang_thai: 'bi_chan', nguoi: 'ns_huong' });
      await goiDeploy(worker, db, [{ sha: 'f'.repeat(40), tieu_de: `GY-${A} vá xong`,
                                     than: `Kèm cả GY-${B}`, cac_tep: ['src/index.js'] }]);
      ok('ca 7 hai mã một commit: mỗi mã đúng rổ riêng',
        xem(db, A).trang_thai === 'hoan_thanh' && xem(db, B).trang_thai === 'bi_chan',
        `${xem(db, A).trang_thai} · ${xem(db, B).trang_thai}`);
    }

    // Ca 8 — COMMIT CHỈ SỬA TÀI LIỆU. Máy đọc thông điệp, không đọc file.
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'da_duyet' });
      const truoc = anhChup(db);
      const kq = await goiDeploy(worker, db, [{ sha: '1'.repeat(40),
        tieu_de: `REV-0042: soi lại GY-${A}, chưa sửa gì`, than: '',
        cac_tep: ['docs/reviews/REV-0042-gopy-tu-dong-xong.md', 'HUONG-DAN-DEPLOY.md'] }]);
      ok('ca 8 commit chỉ sửa tài liệu: 0 góp ý bị đổi', anhChup(db) === truoc, kq.than.da_doi + ' đổi');
      ok('  0 tin cho người gửi', demTin(db, 'ns_lan') === 0, demTin(db, 'ns_lan') + ' tin');
      ok('  lý do ghi rõ', (kq.than.chi_tiet || []).some(q => q.ly_do === 'chi_sua_tai_lieu'));

      // ĐỐI CHỨNG CẮT QUÁ TAY (BH-16): cùng commit ấy nhưng CÓ đụng src/ →
      // phải đẩy. Chốt chặt tới mức chặn cả bản vá thật là hỏng kiểu khác.
      const db2 = dungDB(); idTiep = 1;
      const A2 = themGopY(db2, { trang_thai: 'da_duyet' });
      await goiDeploy(worker, db2, [{ sha: '2'.repeat(40), tieu_de: `GY-${A2}: vá thật kèm ghi chép`,
        than: '', cac_tep: ['docs/reviews/REV-0042.md', 'src/index.js'] }]);
      ok('ĐỐI CHỨNG tài liệu + src/ → VẪN đẩy (không cắt quá tay)',
        xem(db2, A2).trang_thai === 'cho_nghiem_thu', xem(db2, A2).trang_thai);
      // Và migrations/ cũng là code lên thật.
      const db3 = dungDB(); idTiep = 1;
      const A3 = themGopY(db3, { trang_thai: 'da_duyet' });
      await goiDeploy(worker, db3, [{ sha: '3'.repeat(40), tieu_de: `GY-${A3}: thêm cột`,
        than: '', cac_tep: ['migrations/them-abc.sql'] }]);
      ok('ĐỐI CHỨNG chỉ migrations/ → VẪN đẩy (đó cũng là code lên thật)',
        xem(db3, A3).trang_thai === 'cho_nghiem_thu', xem(db3, A3).trang_thai);
    }

    // Ca 9 — ĐƯỜNG PHỤ `bang_chung_url` KHÔNG có mã GY- nào. Người gửi dán
    // chính link COMMIT GÂY RA LỖI làm bằng chứng.
    {
      const db = dungDB(); idTiep = 1;
      // SHA phải có chữ a-f: `docShaTrongLink` cố tình bỏ số thuần, không thì
      // mọi số hiệu PR dài (`/pull/1234567`) đều thành "SHA" và khớp bừa.
      const SHA = 'abc4d5e' + '4'.repeat(33);
      const A = themGopY(db, { trang_thai: 'da_duyet',
                               bang_chung: `https://github.com/agc/erp/commit/${SHA}` });
      const kq = await goiDeploy(worker, db, [{ sha: SHA, tieu_de: 'Dọn dẹp, không nhắc mã nào',
                                                than: '', cac_tep: ['src/index.js'] }]);
      ok('ca 9 đường phụ bang_chung_url: KHÔNG đổi trạng thái',
        xem(db, A).trang_thai === 'da_duyet', xem(db, A).trang_thai);
      ok('  KHÔNG nhắn người gửi (bằng chứng yếu, thà im còn hơn báo sai)',
        demTin(db, 'ns_lan') === 0, demTin(db, 'ns_lan') + ' tin');
      ok('  chỉ dựng cờ cho Sếp', xem(db, A).deploy_cho_xac_nhan === 1);
      ok('  lý do ghi rõ', (kq.than.chi_tiet || []).some(q => q.ly_do === 'chi_co_link_bang_chung'));
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     ⑩ BA CA TỰ NGHĨ THÊM — những chỗ Hồ Ly chưa đụng tới
     ════════════════════════════════════════════════════════════════════ */
  console.log('\n⑩ Ca tự nghĩ thêm: cherry-pick · nhiều commit nhiều mã · mã trong tên nhánh · force-push');
  {
    // T-1 CHERRY-PICK: cùng nội dung, SHA MỚI. Bản vá lên thật lần thứ hai.
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'da_duyet' });
      await goiDeploy(worker, db, [{ sha: 'a'.repeat(40), tieu_de: `GY-${A} vá lỗi` }]);
      const sha1 = xem(db, A).deploy_sha;
      await goiDeploy(worker, db, [{ sha: 'b'.repeat(40),
        tieu_de: `GY-${A} vá lỗi`, than: `(cherry picked from commit ${'a'.repeat(40)})` }]);
      ok('T-1 cherry-pick: dấu commit cập nhật sang SHA mới',
        xem(db, A).deploy_sha === 'b'.repeat(40), `${String(sha1).slice(0, 7)} → ${String(xem(db, A).deploy_sha).slice(0, 7)}`);
      ok('  KHÔNG đẻ thêm dòng lịch sử vô nghĩa (≤ 2)', demLichSu(db, A) <= 2, demLichSu(db, A) + ' dòng');
    }

    // T-2 MỘT LƯỢT ĐẨY NHIỀU COMMIT NHIỀU MÃ, có cả tài liệu lẫn revert lẫn
    // vá thật — và MỘT GÓP Ý bị hai commit nhắc (một ghi chép, một vá thật).
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'da_duyet', tieu_de: 'A' });
      const B = themGopY(db, { trang_thai: 'da_duyet', tieu_de: 'B', nguoi: 'ns_huong' });
      const C = themGopY(db, { trang_thai: 'da_duyet', tieu_de: 'C' });
      await goiDeploy(worker, db, [
        { sha: '1'.repeat(40), tieu_de: `GY-${A}: ghi chép trước đã`, cac_tep: ['docs/x.md'] },
        { sha: '2'.repeat(40), tieu_de: `GY-${A}: vá thật`,           cac_tep: ['src/index.js'] },
        { sha: '3'.repeat(40), tieu_de: `Revert "GY-${B} vá lỗi"`,    cac_tep: ['src/index.js'] },
        { sha: '4'.repeat(40), tieu_de: `GY-${C}: vá thật`,           cac_tep: ['public/app.html'] }
      ]);
      ok('T-2 ghi chép đứng TRƯỚC bản vá thật → bản vá vẫn thắng',
        xem(db, A).trang_thai === 'cho_nghiem_thu', xem(db, A).trang_thai);
      ok('  commit revert trong cùng lượt → B đứng yên',
        xem(db, B).trang_thai === 'da_duyet', xem(db, B).trang_thai);
      ok('  C vá thật → đẩy đúng', xem(db, C).trang_thai === 'cho_nghiem_thu');
      ok('  chị Hương (người gửi B) nhận 0 tin', demTin(db, 'ns_huong') === 0);
    }

    /* T-3 MÃ TRONG TÊN NHÁNH (`feature/gy-1-sua-thong-bao`). ĐO ĐƯỢC: máy CÓ
       bắt — `gy-1` trong tên nhánh khớp đúng khuôn mã. Cân nhắc rồi GIỮ, không
       chặn: tên nhánh đó là một tham chiếu do NGƯỜI gõ ra, và commit có đụng
       code thật. Chặn nó mới là cắt quá tay. Cái phải kín là hệ quả: chờ
       nghiệm thu (không phải "hoàn thành"), câu nhắn không nói dối, và lùi
       được. Đo cả ba. */
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'da_duyet' });
      await goiDeploy(worker, db, [{ sha: '5'.repeat(40),
        tieu_de: 'Merge branch feature/gy-1-sua-thong-bao', than: '', cac_tep: ['src/index.js'] }]);
      const g = xem(db, A);
      ok('T-3 mã trong tên nhánh: bắt được, nhưng chỉ tới CHỜ NGHIỆM THU',
        g.trang_thai === 'cho_nghiem_thu', g.trang_thai);
      ok('  và lùi được nếu Sếp thấy sai', g.deploy_tt_cu === 'da_duyet', String(g.deploy_tt_cu));
      // ĐỐI CHỨNG: tên nhánh KHÔNG có mã → không bắt gì cả.
      const db2 = dungDB(); idTiep = 1;
      const A2 = themGopY(db2, { trang_thai: 'da_duyet' });
      const truoc = anhChup(db2);
      await goiDeploy(worker, db2, [{ sha: '6'.repeat(40),
        tieu_de: 'Merge branch feature/sua-thong-bao', than: '', cac_tep: ['src/index.js'] }]);
      ok('  ĐỐI CHỨNG tên nhánh không mã → 0 đổi', anhChup(db2) === truoc,
        `GY-${A2} vẫn "${xem(db2, A2).trang_thai}"`);
    }

    // T-4 FORCE-PUSH: commit cũ biến mất, lượt sau là SHA hoàn toàn khác cho
    // cùng góp ý ĐÃ ĐÓNG rồi. Không được mở lại, không được nhắn lại.
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'san_sang_phat_hanh' });
      await goiDeploy(worker, db, [{ sha: '6'.repeat(40), tieu_de: `GY-${A} phát hành` }]);
      ok('T-4 lượt 1: đóng + 1 tin',
        xem(db, A).trang_thai === 'hoan_thanh' && demTin(db, 'ns_lan') === 1);
      await goiDeploy(worker, db, [{ sha: '7'.repeat(40), tieu_de: `GY-${A} phát hành (viết lại lịch sử)` }]);
      ok('  lượt 2 sau force-push: KHÔNG mở lại, VẪN 1 tin',
        xem(db, A).trang_thai === 'hoan_thanh' && demTin(db, 'ns_lan') === 1, demTin(db, 'ns_lan') + ' tin');
    }

    // T-5 SCRIPT KHÔNG GỬI `cac_tep` (bản cũ, hoặc git đọc hỏng) → không đủ
    // bằng chứng: dựng cờ, KHÔNG đẩy, KHÔNG nhắn người gửi.
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'da_duyet' });
      const kq = await goiDeploy(worker, db, [{ sha: '8'.repeat(40), tieu_de: `GY-${A} vá thật`,
                                               than: '', cac_tep: null }]);
      ok('T-5 không đọc được danh sách file → KHÔNG đẩy', xem(db, A).trang_thai === 'da_duyet',
        xem(db, A).trang_thai);
      ok('  chỉ dựng cờ, 0 tin cho người gửi',
        xem(db, A).deploy_cho_xac_nhan === 1 && demTin(db, 'ns_lan') === 0);
      ok('  lý do ghi rõ',
        (kq.than.chi_tiet || []).some(q => q.ly_do === 'khong_doc_duoc_danh_sach_tep'));
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     ⑪ ĐƯỜNG LÙI (C3 + C4) — đo bằng PHIÊN SẾP THẬT
     ════════════════════════════════════════════════════════════════════ */
  console.log('\n⑪ Đường lùi: MỌI ca máy đụng vào đều gỡ được');
  {
    const { taoPhien, TEN_COOKIE } = await import('file://' + path.join(GOC, 'src/auth.js').replace(/\\/g, '/'));

    const dungSep = async (db) => {
      db.exec(`INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro,
                                      kich_hoat, phai_doi_mk, duyet_gopy)
               VALUES (1, 'ns_sep', 'sep', 'pbkdf2$1$x$x', 'admin', 1, 0, 1)`);
      const env = { DB: voD1(db), DEPLOY_CHOT_KHOA: KHOA };
      const { token } = await taoPhien(env.DB, 1);
      return { env, token };
    };
    const gapSep = async (worker, env, token, than) => {
      const res = await worker.fetch(new Request('https://x/api/gop-y/xac-nhan-da-len', {
        method: 'POST', headers: { 'content-type': 'application/json', Cookie: `${TEN_COOKIE}=${token}` },
        body: JSON.stringify(than)
      }), env);
      return { ma: res.status, than: await res.json().catch(() => ({})) };
    };

    /* ⚠️ ĐÚNG CA HỒ LY ĐO ĐƯỢC 400: máy ĐẨY NHẦM một góp ý vô can. */
    {
      const db = dungDB(); idTiep = 1;
      const VOCAN = themGopY(db, { trang_thai: 'da_duyet', tieu_de: 'Góp ý vô can' });
      const { env, token } = await dungSep(db);
      await goiDeploy(worker, db, [{ sha: 'a'.repeat(40), tieu_de: `GY-${VOCAN}: vá lỗi X` }]);
      ok('máy đã đẩy đi (đúng ca Hồ Ly)', xem(db, VOCAN).trang_thai === 'cho_nghiem_thu');
      const r = await gapSep(worker, env, token, { id: VOCAN, dong_y: false });
      ok('C3: "Không phải góp ý này" → 200 (bản trước: 400)', r.ma === 200, `mã ${r.ma}`);
      ok('  trả trạng thái về ĐÚNG CHỖ CŨ', xem(db, VOCAN).trang_thai === 'da_duyet',
        xem(db, VOCAN).trang_thai);
      ok('  gỡ sạch dấu deploy', !xem(db, VOCAN).deploy_sha && !xem(db, VOCAN).deploy_tt_cu);

      /* C4 — CHỐT QUAN TRỌNG NHẤT: sau khi gỡ, lần sửa THẬT sau đó phải gửi
         được tin. Bản trước đốt `bao_da_len_luc` vĩnh viễn → gửi 0 tin. */
      const tinTruoc = demTin(db, 'ns_lan');
      await goiDeploy(worker, db, [{ sha: 'b'.repeat(40), tieu_de: `GY-${VOCAN}: LẦN NÀY sửa thật` }]);
      ok('C4: sau khi gỡ nhầm, lần sửa THẬT VẪN gửi được tin',
        demTin(db, 'ns_lan') === tinTruoc + 1, `${tinTruoc} → ${demTin(db, 'ns_lan')} tin`);
    }

    /* Ca rổ an toàn vẫn gỡ được như cũ (không hồi quy). */
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'bi_chan' });
      const { env, token } = await dungSep(db);
      await goiDeploy(worker, db, [{ sha: 'c'.repeat(40), tieu_de: `GY-${A}: vá` }]);
      const r = await gapSep(worker, env, token, { id: A, dong_y: false });
      ok('rổ an toàn vẫn gỡ được (không hồi quy)', r.ma === 200 && xem(db, A).trang_thai === 'bi_chan');
    }

    /* Sếp GẬT trên ca rổ an toàn → đóng + người gửi nghe được câu "đã xong",
       chứ không kẹt mãi ở câu "đang chờ Sếp xác nhận". */
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'bi_chan' });
      const { env, token } = await dungSep(db);
      await goiDeploy(worker, db, [{ sha: 'd'.repeat(40), tieu_de: `GY-${A}: vá` }]);
      ok('người gửi mới chỉ nghe "đang chờ Sếp xác nhận"',
        cacTin(db, 'ns_lan').length === 1 && /đang chờ Sếp xác nhận/.test(cacTin(db, 'ns_lan')[0]));
      const r = await gapSep(worker, env, token, { id: A, dong_y: true });
      const tin = cacTin(db, 'ns_lan');
      ok('Sếp gật → hoan_thanh', r.ma === 200 && xem(db, A).trang_thai === 'hoan_thanh');
      ok('  và người gửi NGHE ĐƯỢC câu "đã xong" (không kẹt ở câu chờ)',
        tin.length === 2 && /đã được sửa xong/.test(tin[1]), JSON.stringify(tin));
      ok('  panel không giữ lại nữa (deploy_tt_cu = NULL)', !xem(db, A).deploy_tt_cu);
    }

    /* ĐỐI CHỨNG CẮT QUÁ TAY: góp ý máy CHƯA HỀ đụng vào → vẫn phải 400. */
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'da_duyet' });
      const { env, token } = await dungSep(db);
      const r = await gapSep(worker, env, token, { id: A, dong_y: false });
      ok('ĐỐI CHỨNG máy chưa đụng vào → vẫn 400, không mở cửa bừa', r.ma === 400, `mã ${r.ma}`);
    }

    /* ĐỐI CHỨNG: người đã chuyển góp ý đi chỗ khác sau khi máy đẩy → gỡ dấu
       nhưng KHÔNG giật trạng thái khỏi tay người. */
    {
      const db = dungDB(); idTiep = 1;
      const A = themGopY(db, { trang_thai: 'da_duyet' });
      const { env, token } = await dungSep(db);
      await goiDeploy(worker, db, [{ sha: 'e'.repeat(40), tieu_de: `GY-${A}: vá` }]);
      db.prepare("UPDATE gop_y SET trang_thai = 'san_sang_phat_hanh' WHERE id = ?").run(A);
      const r = await gapSep(worker, env, token, { id: A, dong_y: false });
      ok('ĐỐI CHỨNG người đã chuyển đi chỗ khác → KHÔNG giật lại',
        r.ma === 200 && xem(db, A).trang_thai === 'san_sang_phat_hanh', xem(db, A).trang_thai);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     ⑫ KHOÁ LỆCH THÌ PHẢI KÊU (mục 3)
     ════════════════════════════════════════════════════════════════════ */
  console.log('\n⑫ Khoá lệch giữa GitHub và Cloudflare');
  {
    const bat = () => { const g = []; return { g, fn: (...a) => { g.push(a); return Promise.resolve(); } }; };

    // Khoá LỆCH → 401 VÀ kêu Telegram.
    {
      const db = dungDB(); idTiep = 1;
      themGopY(db, { trang_thai: 'da_duyet' });
      const t = bat();
      const kq = await goiDeploy(worker, db, [{ sha: 'a'.repeat(40), tieu_de: 'GY-1 vá' }],
        { kyBang: 'khoa-khac-han', env: { TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CHAT_ID: 'y', __guiTelegram: t.fn } });
      ok('khoá lệch → 401', kq.ma === 401, `mã ${kq.ma}`);
      const kh = db.prepare("SELECT khoa FROM sao_luu_canh_bao WHERE khoa LIKE 'deploy-khoa-lech%'").all();
      ok('  CÓ KÊU (dựng chốt cảnh báo 1 tin/ngày)', kh.length === 1, JSON.stringify(kh));
      // Gọi lại 2 lần nữa → vẫn đúng 1 tin/ngày, không spam.
      await goiDeploy(worker, db, [{ sha: 'a'.repeat(40), tieu_de: 'GY-1 vá' }], { kyBang: 'khoa-khac-han' });
      await goiDeploy(worker, db, [{ sha: 'a'.repeat(40), tieu_de: 'GY-1 vá' }], { kyBang: 'khoa-khac-han' });
      ok('  và tối đa 1 tin/ngày, không spam',
        db.prepare("SELECT COUNT(*) n FROM sao_luu_canh_bao WHERE khoa LIKE 'deploy-khoa-lech%'").get().n === 1);
    }

    // Thiếu khoá phía Cloudflare → 503 VÀ kêu.
    {
      const db = dungDB(); idTiep = 1;
      const kq = await goiDeploy(worker, db, [{ sha: 'b'.repeat(40), tieu_de: 'GY-1 vá' }], { khoa: '' });
      ok('thiếu khoá phía Cloudflare → 503', kq.ma === 503, `mã ${kq.ma}`);
      ok('  CÓ KÊU',
        db.prepare("SELECT COUNT(*) n FROM sao_luu_canh_bao WHERE khoa LIKE 'deploy-thieu-khoa-erp%'").get().n === 1);
    }

    // ĐỐI CHỨNG KHÔNG KÊU OAN: khoá KHỚP → 200, 0 cảnh báo.
    {
      const db = dungDB(); idTiep = 1;
      themGopY(db, { trang_thai: 'da_duyet' });
      const kq = await goiDeploy(worker, db, [{ sha: 'c'.repeat(40), tieu_de: 'GY-1 vá' }]);
      ok('ĐỐI CHỨNG khoá khớp → 200 và KHÔNG kêu oan',
        kq.ma === 200 && db.prepare("SELECT COUNT(*) n FROM sao_luu_canh_bao WHERE khoa LIKE 'deploy-%'").get().n === 0);
    }

    // Bản tin "chào hỏi" rỗng (lượt đẩy không có mã nào): khoá khớp → 200,
    // 0 câu ghi. Đây là thứ làm khoá lệch lộ ra NGAY, không đợi tới hôm có
    // góp ý thật bị bỏ rơi.
    {
      const db = dungDB(); idTiep = 1;
      themGopY(db, { trang_thai: 'da_duyet' });
      const truoc = anhChup(db);
      const kq = await goiDeploy(worker, db, []);
      ok('chào hỏi rỗng + khoá khớp → 200, 0 đổi',
        kq.ma === 200 && kq.than.ly_do === 'khong_co_commit' && anhChup(db) === truoc);
      const kq2 = await goiDeploy(worker, db, [], { kyBang: 'khoa-khac-han' });
      ok('chào hỏi rỗng + khoá LỆCH → 401 và KÊU (lệch lộ ra ngay)',
        kq2.ma === 401 &&
        db.prepare("SELECT COUNT(*) n FROM sao_luu_canh_bao WHERE khoa LIKE 'deploy-khoa-lech%'").get().n === 1);
    }

    // Script: bước YAML vẫn không nhuộm đỏ deploy, nhưng phải in ::warning::
    const script = doc('scripts/bao-deploy-len-erp.mjs');
    ok('script: thiếu khoá phía GitHub → in ::warning:: (bản trước: console.log thường)',
      /::warning::Chưa đặt secret DEPLOY_CHOT_KHOA phía GitHub/.test(script));
    ok('script: 401 → nói thẳng "hai khoá KHÁC NHAU"',
      /tl\.status === 401/.test(script) && /KHÁC NHAU/.test(script));
    ok('script: 0 mã vẫn gõ cửa một tiếng (không return im lặng)',
      !/if \(!ma\.length\) return;/.test(script) && /chao_hoi: true/.test(script));
    ok('script: gửi kèm DANH SÁCH FILE bị đổi', /cac_tep: docTepCuaCommit/.test(script));
  }

  /* ══════════════════════════════════════════════════════════════════════
     ⑬ ĐO TRÊN 4 GÓP Ý THẬT — tính năng đóng được bao nhiêu cái?
     ----------------------------------------------------------------------
     Hồ Ly đọc DB thật sáng 29/08: 4 góp ý đang mở, TẤT CẢ ở `cho_phan_tich`.
     Bản trước đẩy 0 cái, báo 0 người. Dựng lại đúng bốn cái đó và ĐẾM.
     ════════════════════════════════════════════════════════════════════ */
  console.log('\n⑬ Đo trên 4 góp ý THẬT đang mở (đều ở cho_phan_tich)');
  {
    const db = dungDB(); idTiep = 1;
    const THAT = [
      ['Không hiện thông báo khi có tin nhắn đến', 'ns_lan',   '7bf0e58'],
      ['Lỗi số năm chỗ ngày sinh',                 'ns_huong', 'cc13f89'],
      ['không hiển thị hết công việc public ở mục Việc cần làm', 'ns_huong', '0d153b5'],
      ['Danh sách bị cắt mà không nói ra',          'ns_lan',   'ab92afc']
    ].map(([tieu_de, nguoi]) => themGopY(db, { trang_thai: 'cho_phan_tich', nguoi, tieu_de }));

    const kq = await goiDeploy(worker, db, THAT.map((id, i) => ({
      sha: String(i + 1).repeat(40), tieu_de: `GY-${id}: vá thật`, than: '',
      cac_tep: ['src/index.js', 'public/assets/js/app.js']
    })));
    const dayDuoc = THAT.filter(id => xem(db, id).trang_thai === 'cho_nghiem_thu').length;
    const nguoiDuocBao = demTin(db, 'ns_lan') + demTin(db, 'ns_huong');
    console.log(`     ⇒ ĐẨY ĐƯỢC ${dayDuoc}/4 góp ý · BÁO ĐƯỢC ${nguoiDuocBao}/4 người gửi ` +
                `(bản trước: 0/4 và 0/4)`);
    ok('mục 2b: 4/4 góp ý thật được đẩy sang chờ nghiệm thu', dayDuoc === 4 && kq.ma === 200, `${dayDuoc}/4`);
    ok('mục 2a: 4/4 người gửi được báo', nguoiDuocBao === 4, `${nguoiDuocBao}/4`);
    ok('  KHÔNG cái nào bị máy tự đưa sang "hoan_thanh"',
      THAT.every(id => xem(db, id).trang_thai !== 'hoan_thanh'));
    ok('  cả 4 đều lùi được nếu máy sai', THAT.every(id => !!xem(db, id).deploy_tt_cu));
  }

  /* ══════════════════════════════════════════════════════════════════════
     ⑭ ĐỒNG HỒ CHỜ (`cho_duyet_tu_luc`) — CỬA THỨ 14 ÁP CHO ĐƯỜNG DEPLOY
     ----------------------------------------------------------------------
     Cột này ra đời SAU nhánh này (nằm trong 102 commit của main). Bản cũ đổi
     `trang_thai` mà bỏ quên đồng hồ, nên góp ý nằm ở `cho_phan_tich` từ lâu
     bị máy đẩy sang `cho_nghiem_thu` là đồng hồ VẪN Ở NGÀY CŨ → nhánh 3 của
     gopYNhacSla() thấy ngay >= 7 ngày và nhắn người gửi "chờ bạn dùng thử"
     NGAY LƯỢT CRON ĐẦU, cùng ngày bản vá vừa lên. Sai và ồn.

     Đo bằng ĐÚNG biểu thức tuổi hàng chờ của gopYNhacSla(), không đo câu chữ.
     ════════════════════════════════════════════════════════════════════ */
  console.log('\n⑭ Đồng hồ chờ sau khi máy đẩy trạng thái');
  {
    const SLA_NGHIEM_THU_NGAY = 7;          // = GOPY_SLA_NGHIEM_THU_NGAY trong src/index.js
    const db = dungDB(); idTiep = 1;
    const tuoi = (id) => db.prepare(
      `SELECT julianday(datetime('now','+7 hours'))
            - julianday(COALESCE(g.cho_duyet_tu_luc, g.cap_nhat_luc, g.tao_luc)) AS d
         FROM gop_y g WHERE g.id = ?`).get(id).d;

    const A = themGopY(db, { trang_thai: 'cho_phan_tich', tieu_de: 'Nằm chờ đã 20 ngày' });
    const B = themGopY(db, { trang_thai: 'cho_nghiem_thu', nguoi: 'ns_huong',
                             tieu_de: 'Đã ở đúng chỗ, người gửi đang thử' });
    db.prepare(`UPDATE gop_y SET cho_duyet_tu_luc = datetime('now','+7 hours','-20 days')`).run();
    ok('trước khi đẩy: cả hai đều đã quá hạn nghiệm thu',
      tuoi(A) >= 19 && tuoi(B) >= 19, `A=${tuoi(A).toFixed(1)}d · B=${tuoi(B).toFixed(1)}d`);

    await goiDeploy(worker, db, [
      { sha: 'e'.repeat(40), tieu_de: `GY-${A}: vá thật`, than: '', cac_tep: ['src/index.js'] },
      { sha: 'f'.repeat(40), tieu_de: `GY-${B}: vá thật`, than: '', cac_tep: ['src/index.js'] }
    ]);

    /* A — máy ĐỔI trạng thái, tức việc vào một hàng chờ MỚI → phải bấm lại. */
    ok(`GY-${A} đã sang chờ nghiệm thu`, xem(db, A).trang_thai === 'cho_nghiem_thu', xem(db, A).trang_thai);
    ok('  đồng hồ bấm lại từ hôm nay (bản trước: giữ nguyên 20 ngày)',
      tuoi(A) < 1, `${tuoi(A).toFixed(1)} ngày`);
    ok(`  nên SLA KHÔNG nhắn người gửi ngay hôm nay (< ${SLA_NGHIEM_THU_NGAY} ngày)`,
      tuoi(A) < SLA_NGHIEM_THU_NGAY, `${tuoi(A).toFixed(1)} ngày`);

    /* ĐỐI CHỨNG — cửa 14 CẤM đẩy lùi đồng hồ bằng một cú "lưu tại chỗ".
       GY-B đã ở sẵn `cho_nghiem_thu`: máy chỉ đóng dấu bằng chứng, KHÔNG đổi
       trạng thái. Bấm lại đồng hồ ở đây là xoá sạch 20 ngày người gửi đã chờ —
       đúng cái lỗ mà cửa 14 bịt. */
    ok(`ĐỐI CHỨNG GY-${B}: máy chỉ đóng dấu, KHÔNG đổi trạng thái`,
      xem(db, B).trang_thai === 'cho_nghiem_thu' && /^f{40}$/.test(xem(db, B).deploy_sha || ''));
    ok('  → đồng hồ GIỮ NGUYÊN 20 ngày, không bị bấm lại (cửa 14)',
      tuoi(B) >= 19, `${tuoi(B).toFixed(1)} ngày`);
  }

  /* ══════════════════════════════════════════════════════════════════════
     ⑮ KHÔNG ĐƯỢC ĐỤNG 4 PHIẾU SẾP VỪA ĐÓNG TAY
     ----------------------------------------------------------------------
     ⚠️ §⑬ ở trên đo THỰC TẾ NGÀY 29/08 (4 góp ý đang ở `cho_phan_tich`).
     Thực tế đó KHÔNG CÒN. Đọc DB thật 08/09/2026: 8 góp ý, 7 `hoan_thanh` +
     1 `moi`. GY-4·5·6·7 đã được Sếp ĐÓNG TAY, lịch sử ghi
     `nguoi_thuc_hien_loai='nguoi'`, `nguoi_doi_id='ns_admin1'`.

     Giữ §⑬ vì nó vẫn chứng minh đường `quy_trinh_hut` chạy đúng. Nhưng phải
     có thêm phép đo cho thực tế HÔM NAY: lượt deploy tới đây gần như chắc
     chắn mang commit nhắc GY-4…7 (chính các bản vá đó), nên câu hỏi sống còn
     là máy có mở lại / ghi đè / đếm nhầm việc Sếp vừa làm tay không.
     ════════════════════════════════════════════════════════════════════ */
  console.log('\n⑮ 4 phiếu Sếp vừa đóng tay — máy có đụng vào không');
  {
    const db = dungDB(); idTiep = 1;
    // Tài khoản Sếp dùng để đóng tay trên DB thật.
    db.exec(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam)
             VALUES ('ns_admin1','Bùi Thị Ngọc','Ngọc','Giám đốc','Ban giám đốc',1)`);
    // Dựng lại ĐÚNG trạng thái thật của GY-4·5·6·7 sáng 08/09.
    const TAY = [4, 5, 6, 7].map(() => themGopY(db, { trang_thai: 'hoan_thanh' }));
    db.prepare(`UPDATE gop_y SET current_owner='NONE', next_owner='NONE',
                                 can_xac_minh_lai=0, cho_duyet_tu_luc=datetime('now','+7 hours','-9 days')`).run();
    // Dòng lịch sử "người đóng tay" — để đếm được máy có ghi đè lên không.
    for (const id of TAY)
      db.prepare(`INSERT INTO gop_y_lich_su (gop_y_id, tu_trang_thai, den_trang_thai,
                    nguoi_thuc_hien_loai, nguoi_doi_id, luc)
                  VALUES (?, 'da_duyet', 'hoan_thanh', 'nguoi', 'ns_admin1', datetime('now','+7 hours'))`).run(id);

    const truoc = anhChup(db);
    const suKienTruoc = db.prepare('SELECT COUNT(*) n FROM gop_y_lich_su').get().n;
    const tinTruoc = demTin(db, 'ns_lan') + demTin(db, 'ns_huong');

    /* Lượt deploy nhắc ĐÚNG 4 mã đó, kèm file code thật — ca xấu nhất. */
    const kq = await goiDeploy(worker, db, TAY.map((id, i) => ({
      sha: String.fromCharCode(97 + i).repeat(40), tieu_de: `GY-${id}: vá thật`, than: '',
      cac_tep: ['src/index.js', 'public/assets/js/app.js']
    })));

    ok('cửa vẫn trả 200 (không nổ)', kq.ma === 200, `mã ${kq.ma}`);
    ok('KHÔNG một cột nào của 4 phiếu bị đổi', anhChup(db) === truoc);
    ok('  cả 4 vẫn "hoan_thanh" — máy KHÔNG mở lại',
      TAY.every(id => xem(db, id).trang_thai === 'hoan_thanh'));
    ok("  next_owner vẫn 'NONE', KHÔNG bị để trống",
      TAY.every(id => xem(db, id).next_owner === 'NONE' && xem(db, id).current_owner === 'NONE'));
    ok('  KHÔNG ghi đè bằng chứng / dấu deploy của Sếp',
      TAY.every(id => !xem(db, id).deploy_sha && !xem(db, id).deploy_tt_cu));
    ok('  đồng hồ chờ KHÔNG bị bấm lại', TAY.every(id => !!xem(db, id).cho_duyet_tu_luc));
    ok('  KHÔNG đè lên dòng lịch sử "người đóng tay"',
      db.prepare(`SELECT COUNT(*) n FROM gop_y_lich_su
                   WHERE nguoi_thuc_hien_loai='nguoi' AND nguoi_doi_id='ns_admin1'`).get().n === 4);
    ok('  KHÔNG sinh thêm dòng lịch sử nào',
      db.prepare('SELECT COUNT(*) n FROM gop_y_lich_su').get().n === suKienTruoc);
    ok('  KHÔNG nhắn lại người gửi (họ đã biết là xong)',
      demTin(db, 'ns_lan') + demTin(db, 'ns_huong') === tinTruoc);
    ok('  và máy ĐẾM ĐÚNG: 0 phiếu bị đụng trong lượt này',
      (kq.than.da_doi || 0) === 0, JSON.stringify(kq.than).slice(0, 160));
  }

  console.log(`\n═══ ${dat} đạt · ${truot} trượt ═══\n`);
  process.exit(truot ? 1 : 0);
}

main().catch(e => { console.error('\n💥 ' + (e.stack || e.message)); process.exit(2); });
