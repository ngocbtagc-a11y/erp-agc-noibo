/* ==========================================================================
   BÀN ĐO HỒ SƠ (BỘ)  ·  PHASE 2 — Sếp Ngọc chốt 09/09/2026
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-ho-so-bo.mjs            (đủ cả máy chủ + giao diện)
          node scripts/do-ho-so-bo.mjs --chi-may  (bỏ phần Chrome, chạy nhanh)

   ĐO THẬT, KHÔNG KHỚP CHUỖI. Hai nửa:

     PHẦN A — MÁY CHỦ. Dựng SQLite thật bằng `node:sqlite`, nạp ĐÚNG bộ
       migration sẽ nạp lên D1 (kể cả file mới `them-kho-tai-lieu-ho-so-bo.sql`)
       rồi GỌI THẬT vào `src/tai-lieu.js`. Mỗi mục có CA ĐỐI CHỨNG (BH-16): bẻ
       chốt đi thì phép đo PHẢI đỏ — không đỏ nghĩa là phép đo vô dụng.

     PHẦN B — GIAO DIỆN. Dựng ERP thật trên 127.0.0.1, lái Chrome bằng CDP, đo
       ở 1440×900 và 375×812 — và đo CẢ BẢN TRƯỚC (`origin/main`) lẫn bản sau
       trong cùng một lượt chạy. Số "trước/sau" vì thế là số đo được cạnh nhau,
       không phải số chép lại từ một bản soát cũ.

   ⚠️ LUẬT NẶNG NHẤT MÀ BÀN ĐO NÀY GÁC: **BỘ HỒ SƠ KHÔNG CÓ QUYỀN RIÊNG.**
   Quyền xem vẫn CHỈ do NHÓM giấy tờ quyết định. Mục ① và ② dưới đây tồn tại để
   nếu ngày nào có người "tiện tay" cho bộ cấp quyền thì bàn đo đỏ ngay.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = path.join(GOC, '.do-tam');
mkdirSync(TAM, { recursive: true });

const CHI_MAY = process.argv.includes('--chi-may');

let soHong = 0;
const dat = (ok, nhan, them = '') => {
  if (!ok) soHong++;
  console.log(`  ${ok ? 'ĐẠT ' : '✗ HỎNG'}  ${nhan}${them ? '   → ' + them : ''}`);
  return ok;
};
const muc = (s) => console.log(`\n─── ${s} ───`);

/* ==========================================================================
   MÁY GIẢ — D1 chạy trên SQLite thật, đếm từng lượt đọc/ghi
   ========================================================================== */
const { DatabaseSync } = await import('node:sqlite');

/* ⚠️ THỨ TỰ NÀY PHẢI KHỚP thứ tự tên file mà công cụ kiểm migration dùng (sắp
   theo tên ĐÃ BỎ ĐUÔI `.sql`). Xếp sai ở đây là bàn đo chạy trên một lược đồ
   KHÁC lược đồ sản phẩm — đúng thứ mục ③ sinh ra để bắt. */
const MIGRATION = [
  'them-kho-tai-lieu.sql',
  'them-kho-tai-lieu-cot-chu-nguon.sql',
  'them-kho-tai-lieu-cot-ocr-neo.sql',
  'them-kho-tai-lieu-ho-so-bo.sql'
];
const docMig = f => readFileSync(path.join(GOC, 'migrations', f), 'utf8');

function dungKho() {
  const kho = new DatabaseSync(':memory:');
  for (const f of MIGRATION) kho.exec(docMig(f));
  kho.exec('CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT)');
  kho.exec(`CREATE TABLE IF NOT EXISTS lich_su_thay_doi_nen (
              id INTEGER PRIMARY KEY AUTOINCREMENT, bang TEXT NOT NULL,
              ban_ghi_id TEXT NOT NULL, truong TEXT NOT NULL,
              gia_tri_cu TEXT, gia_tri_moi TEXT, nguoi_id TEXT, nguoi_ten TEXT,
              luc TEXT NOT NULL DEFAULT (datetime('now','+7 hours')))`);
  return kho;
}

function d1(kho) {
  const so = { doc: 0, ghi: 0 };
  const db = {
    async batch(ds) { const r = []; for (const o of ds) r.push(await o.run()); return r; },
    prepare(sql) {
      const ban = [];
      const o = {
        bind(...b) { ban.push(...b); return o; },
        async first() { so.doc++; return kho.prepare(sql).get(...ban) ?? null; },
        async all() { so.doc++; return { results: kho.prepare(sql).all(...ban) }; },
        async run() {
          if (/^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(sql)) so.ghi++; else so.doc++;
          const r = kho.prepare(sql).run(...ban);
          return { meta: { changes: Number(r.changes || 0) } };
        }
      };
      return o;
    }
  };
  return { db, so };
}

/* Ba tờ giấy THẬT đang nằm trên hệ thống (theo lời Sếp giao, ghi ở bản soát
   PHASE 1 mục C4). Dùng đúng chúng để phép đo nói về kho thật, không về một
   kho tưởng tượng. Cả ba `chu_nguon='khong'` — 0/3 bóc được chữ. */
const BA_TO = [
  ['tl_gcn02', 'phap_ly', 'GCN đăng ký doanh nghiệp',
   'Giấy chứng nhận đăng ký doanh nghiệp Công ty TNHH Alpha Green Commerce', '02/2026/PLDN'],
  ['tl_gcn03', 'phap_ly', 'GCN đăng ký doanh nghiệp',
   'GCN đăng ký doanh nghiệp — Sửa đổi lần 1', '03/2026/PLDN'],
  ['tl_dl01', 'phap_ly', 'Điều lệ',
   'Điều lệ Công ty TNHH Alpha Green Commerce', '01/2026/ĐL']
];

function napBaTo(kho, boDau) {
  for (const [id, nhom, loai, tieuDe, soHieu] of BA_TO) {
    kho.prepare(`INSERT INTO tai_lieu
      (id, nhom, loai, tieu_de, so_hieu, tim_kiem, cua_vao, so_trang, kho_nha, kho_khoa,
       co_byte, ocr_so_trang, ocr_so_trang_neo, chu_nguon, nhay_cam, tao_luc, an)
      VALUES (?,?,?,?,?,?,'kho_chung',1,'drive',?,1000,0,0,'khong',0,'2026-09-01 08:00:00',0)`)
      .run(id, nhom, loai, tieuDe, soHieu,
           boDau([tieuDe, soHieu, loai, 'Pháp lý doanh nghiệp'].join(' ')), 'drive-' + id);
  }
}

/** Ghi một bản mã ĐÃ BẺ ra `.do-tam/` để nạp làm ca đối chứng. Phải chỉ lại
 *  đường `import './x.js'` sang đường tuyệt đối, không thì Node tìm anh em
 *  trong `.do-tam/` và chết vì `ERR_MODULE_NOT_FOUND` — lỗi của bàn đo, không
 *  phải của sản phẩm. Cùng mẹo `do-kho-tai-lieu.mjs` đang dùng. */
function napBanBe(ten, ma) {
  const sua = ma.replace(
    /from '\.\/([a-z0-9-]+)\.js'/g,
    (m, t) => `from '${pathToFileURL(path.join(GOC, 'src', t + '.js')).href}'`);
  const duong = path.join(TAM, ten);
  writeFileSync(duong, sua, 'utf8');
  return import(pathToFileURL(duong).href + '?v=' + Date.now());
}

const PHIEN = {
  admin:    { id: 'u1', nhan_su_id: 'NS-NGOC', ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin' },
  ke_toan:  { id: 'u2', nhan_su_id: 'NS-HANG', ho_ten: 'Phan Thị Hằng', vai_tro: 'ke_toan_truong' },
  hcns:     { id: 'u3', nhan_su_id: 'NS-HUONG', ho_ten: 'Vũ Lan Hương', vai_tro: 'hcns' },
  kho:      { id: 'u4', nhan_su_id: 'NS-DUY', ho_ten: 'Phạm Khương Duy', vai_tro: 'quan_ly_kho' }
};

const than = async (res) => JSON.parse(await res.text());
const ts = (o) => new URLSearchParams(o);

const TL = await import(pathToFileURL(path.join(GOC, 'src', 'tai-lieu.js')).href);
const SL = await import(pathToFileURL(path.join(GOC, 'src', 'sao-luu.js')).href);

console.log('\n═══ BÀN ĐO HỒ SƠ (BỘ) · PHASE 2 ═══');

/* ==========================================================================
   ① BỘ KHÔNG CÓ QUYỀN RIÊNG — và bộ thiếu giấy thì PHẢI NÓI RA
   ---------------------------------------------------------------------------
   Ca thật của Sếp: bộ *Hồ sơ pháp lý doanh nghiệp* chứa CCCD người đại diện.
   CCCD bắt buộc ở nhóm `nhan_su`. Kế toán trưởng KHÔNG xem được nhóm đó.
   ⇒ Kế toán mở bộ ra phải thấy giấy pháp lý, KHÔNG thấy CCCD, và màn hình phải
     NÓI THẲNG "bộ này có 1 giấy tờ bạn không được xem".
   Giấu im hoặc trả danh sách rỗng đều là NÓI DỐI VỀ DỮ LIỆU.
   ========================================================================== */
muc('① Bộ KHÔNG có quyền riêng — quyền vẫn cắt bằng NHÓM, phần bị chặn phải NÓI RA');
{
  const kho = dungKho();
  const { db } = d1(kho);
  napBaTo(kho, TL.boDau);
  kho.prepare("INSERT INTO nhan_su (id, ho_ten) VALUES ('NS-PHONG','Nguyễn Duy Phong')").run();
  kho.prepare(`INSERT INTO tai_lieu
      (id, nhom, loai, tieu_de, so_hieu, tim_kiem, cua_vao, gan_id, so_trang, kho_nha,
       kho_khoa, co_byte, ocr_so_trang, ocr_so_trang_neo, nhay_cam, tao_luc, an)
      VALUES ('tl_cccd','nhan_su','CCCD','CCCD người đại diện','001091027384',
              'cccd nguoi dai dien','nhan_su','NS-PHONG',1,'drive','drive-cccd',900,0,0,1,
              '2026-09-01 09:00:00',0)`).run();
  /* Cả bốn tờ vào CÙNG MỘT BỘ — đúng như đời thật. */
  kho.prepare("UPDATE tai_lieu SET ho_so_id = 'hs_phaply_agc' WHERE id IN ('tl_gcn02','tl_gcn03','tl_dl01','tl_cccd')").run();

  const boCoSan = kho.prepare("SELECT COUNT(*) AS n FROM ho_so WHERE id='hs_phaply_agc'").get();
  dat(Number(boCoSan.n) === 1,
    'Migration dựng SẴN bộ "Hồ sơ pháp lý doanh nghiệp" cho Sếp kéo giấy vào');
  dat(Number(kho.prepare("SELECT COUNT(*) AS n FROM ho_so WHERE id='hs_phaply_onfod'").get().n) === 1,
    'Và một bộ RIÊNG cho HKD Onfod — hai pháp nhân = hai bộ (Sếp chốt)');

  const rAdmin = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin, ts({ ho_so_id: 'hs_phaply_agc' })));
  dat(rAdmin.ds.length === 4, 'Admin mở bộ: thấy đủ 4 tờ', `${rAdmin.ds.length} tờ`);
  dat(rAdmin.ho_so.so_bi_chan === 0, 'Admin: 0 giấy bị chặn', String(rAdmin.ho_so.so_bi_chan));

  const rKt = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.ke_toan, ts({ ho_so_id: 'hs_phaply_agc' })));
  dat(rKt.ds.length === 3 && !rKt.ds.some(t => t.id === 'tl_cccd'),
    '⚠️ Kế toán trưởng mở CÙNG bộ đó: KHÔNG thấy tờ CCCD',
    `${rKt.ds.length} tờ, có CCCD: ${rKt.ds.some(t => t.id === 'tl_cccd')}`);
  dat(rKt.ho_so.so_bi_chan === 1,
    '⚠️ VÀ MÀN HÌNH ĐƯỢC BÁO: "bộ này có 1 giấy tờ bạn không được xem" — không giấu im',
    `so_bi_chan = ${rKt.ho_so.so_bi_chan}`);

  /* Bảng kiểm PHẢI tính trên phần THẤY ĐƯỢC, và phải lệch giữa hai người —
     nếu nó giống nhau thì hoặc nó đọc cả giấy bị chặn (rò), hoặc nó bịa. */
  const tickAdmin = rAdmin.ho_so.bang_kiem.find(k => k.ma === 'cccd_dai_dien');
  const tickKt = rKt.ho_so.bang_kiem.find(k => k.ma === 'cccd_dai_dien');
  dat(tickAdmin.co === true && tickKt.co === false,
    'Bảng kiểm tính trên ĐÚNG phần thấy được: Admin tick CCCD, kế toán thì không',
    `admin=${tickAdmin.co} kt=${tickKt.co}`);

  /* CA ĐỐI CHỨNG (BH-16) — nếu bỏ mệnh đề `nhom IN (...)` thì tờ CCCD PHẢI LỌT
     vào danh sách của kế toán. Không lọt nghĩa là phép đo trên vô dụng. */
  const nguon = readFileSync(path.join(GOC, 'src', 'tai-lieu.js'), 'utf8').replace(/\r\n/g, '\n');
  const be = nguon.replace(
    "dieuKien.push(`nhom IN (${duocXem.map(() => '?').join(',')})`);\n    bien.push(...duocXem);",
    '/* BỎ CHẶN — ca đối chứng */');
  dat(be !== nguon, 'Ca đối chứng: cắt được đúng dòng lọc nhóm');
  const TLBe = await napBanBe('tai-lieu-bo-chan-nhom.mjs', be);
  const rBe = await than(await TLBe.danhSachTaiLieu({ DB: db }, PHIEN.ke_toan, ts({ ho_so_id: 'hs_phaply_agc' })));
  dat(rBe.ds.some(t => t.id === 'tl_cccd'),
    'ĐỐI CHỨNG BH-16: bản BỎ CHẶN → tờ CCCD LỌT ra cho kế toán (phải lọt, sạch là PHÉP ĐO hỏng)',
    `${rBe.ds.length} tờ`);

  /* Và cửa `?ho_so_id=` KHÔNG được có chốt "được xem bộ hay không": kế toán
     vẫn phải MỞ ĐƯỢC bộ (200), chỉ là thấy ít tờ hơn. Trả 403 cả bộ chính là
     cấp quyền cho bộ — đúng thứ Sếp cấm. */
  dat(rKt.ho_so && rKt.ho_so.ten,
    '⚠️ Kế toán vẫn MỞ ĐƯỢC bộ (200 + tên bộ) — bộ không có chốt quyền riêng',
    rKt.ho_so.ten);
}

/* ==========================================================================
   ② ĐƯA MỘT TỜ VÀO BỘ = SỬA TỜ ĐÓ ⇒ đi ĐÚNG chốt quyền theo NHÓM
   ========================================================================== */
muc('② Xếp giấy vào bộ đi qua chốt quyền NHÓM (không phải chốt của bộ)');
{
  const kho = dungKho();
  const { db, so } = d1(kho);
  napBaTo(kho, TL.boDau);
  kho.prepare("INSERT INTO nhan_su (id, ho_ten) VALUES ('NS-PHONG','Nguyễn Duy Phong')").run();
  kho.prepare(`INSERT INTO tai_lieu (id, nhom, loai, tieu_de, tim_kiem, cua_vao, gan_id,
      so_trang, kho_nha, kho_khoa, co_byte, ocr_so_trang, ocr_so_trang_neo, nhay_cam, tao_luc, an)
      VALUES ('tl_cccd','nhan_su','CCCD','CCCD người đại diện','cccd','nhan_su','NS-PHONG',
              1,'drive','k',900,0,0,1,'2026-09-01 09:00:00',0)`).run();

  const r403 = await TL.taiLieuVaoBo({ DB: db }, PHIEN.ke_toan, { id: 'tl_cccd', ho_so_id: 'hs_phaply_agc' });
  dat(r403.status === 403, 'Kế toán xếp tờ CCCD (nhóm nhân sự) vào bộ → 403', 'HTTP ' + r403.status);

  const rHcns = await than(await TL.taiLieuVaoBo({ DB: db }, PHIEN.hcns, { id: 'tl_cccd', ho_so_id: 'hs_phaply_agc' }));
  dat(rHcns.ok === true, 'HCNS xếp đúng tờ đó vào bộ → được');
  dat(rHcns.luot_ghi_d1 === 2, 'Xếp sau tốn ĐÚNG 2 lượt ghi: 1 UPDATE + 1 dòng sổ sửa chung',
    String(rHcns.luot_ghi_d1));
  const vet = kho.prepare(
    "SELECT * FROM lich_su_thay_doi_nen WHERE bang='tai_lieu' AND truong='ho_so_id'").all();
  dat(vet.length === 1 && vet[0].gia_tri_moi === 'hs_phaply_agc',
    'Ghi vết vào SỔ SỬA CHUNG `lich_su_thay_doi_nen` — KHÔNG đẻ bảng nhật ký thứ hai');
  dat(kho.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%ho_so%'")
        .all().every(x => x.name === 'ho_so'),
    'Chỉ MỘT bảng mới `ho_so` — không có bảng nối, không có bảng nhật ký riêng');

  /* Xếp lại đúng chỗ cũ = 0 lượt ghi. Ghi lại một giá trị y hệt là rác. */
  const ghiTruoc = so.ghi;
  const r0 = await than(await TL.taiLieuVaoBo({ DB: db }, PHIEN.hcns, { id: 'tl_cccd', ho_so_id: 'hs_phaply_agc' }));
  dat(r0.khong_doi === true && so.ghi === ghiTruoc, 'Xếp lại đúng bộ cũ → 0 lượt ghi D1');

  /* Bộ ĐÃ ĐÓNG không nhận giấy — đóng bộ là một tuyên bố, nhận thêm giấy làm
     tuyên bố đó thành sai mà không ai thấy. */
  await TL.luuHoSo({ DB: db }, PHIEN.hcns, { id: 'hs_phaply_onfod', ten: 'Hồ sơ pháp lý doanh nghiệp — HKD Onfod (tiền thân)', loai: 'phap_ly_dn', trang_thai: 'da_dong' });
  const rDong = await TL.taiLieuVaoBo({ DB: db }, PHIEN.hcns, { id: 'tl_cccd', ho_so_id: 'hs_phaply_onfod' });
  dat(rDong.status === 400, 'Bộ ĐÃ ĐÓNG không nhận thêm giấy', 'HTTP ' + rDong.status);
}

/* ==========================================================================
   ③ MIGRATION — module này đã vấp 4 lần, nên đo bằng ca chạy thật
   ========================================================================== */
muc('③ Migration: thứ tự nạp · ALTER riêng · KHÔNG UPDATE dữ liệu cũ');
{
  /* Ca A — thứ tự ĐÚNG thì cột sinh ra. */
  const a = new DatabaseSync(':memory:');
  for (const f of MIGRATION) a.exec(docMig(f));
  const cot = a.prepare('PRAGMA table_info(tai_lieu)').all().map(c => c.name);
  dat(cot.includes('ho_so_id') && cot.includes('thay_the_boi_id'),
    'Nạp đúng thứ tự → hai cột mới có mặt trên `tai_lieu`');

  /* Ca B — ĐỐI CHỨNG: nạp file mới TRƯỚC file tạo bảng thì PHẢI chết.
     Đây chính là lỗi REV-0050 #3 (công cụ sắp file sai thứ tự). */
  let chetDungCho = false;
  try {
    const b = new DatabaseSync(':memory:');
    b.exec(docMig('them-kho-tai-lieu-ho-so-bo.sql'));
  } catch (e) { chetDungCho = /no such table: tai_lieu/i.test(String(e.message)); }
  dat(chetDungCho, 'ĐỐI CHỨNG: nạp SAI thứ tự (ALTER trước CREATE) → chết ngay, không âm thầm');

  /* Ca C — tên file ÉP đúng thứ tự. Đổi tên file là đổi thứ tự nạp. */
  const tenTran = f => f.slice(0, -4);
  const daSap = [...MIGRATION].sort((x, y) => tenTran(x) < tenTran(y) ? -1 : tenTran(x) > tenTran(y) ? 1 : 0);
  dat(JSON.stringify(daSap) === JSON.stringify(MIGRATION),
    'Tên file ÉP đúng thứ tự nạp (sắp theo tên đã bỏ đuôi .sql, y như kiem-tra-migration.mjs)');

  /* Ca D — cột mới KHÔNG được nhét vào giữa `CREATE TABLE IF NOT EXISTS`
     (REV-0046 #1: máy đã có bảng thì cột vĩnh viễn không sinh ra). */
  const ruot = docMig('them-kho-tai-lieu.sql')
    .split('\n').filter(d => !/^\s*--/.test(d)).join('\n')
    .match(/CREATE TABLE IF NOT EXISTS tai_lieu\s*\(([\s\S]*?)\n\);/)[1];
  dat(!/\bho_so_id\b/.test(ruot) && !/\bthay_the_boi_id\b/.test(ruot),
    'Cột mới KHÔNG khai lại trong CREATE TABLE — chỉ khai ĐÚNG MỘT chỗ (ALTER)');

  /* Ca E — KHÔNG MỘT CÂU `UPDATE` NÀO trên dữ liệu cũ. Đo bằng cách nạp
     migration lên một CSDL ĐÃ CÓ ba tờ giấy, rồi soi lại từng dòng. */
  const e = new DatabaseSync(':memory:');
  e.exec(docMig('them-kho-tai-lieu.sql'));
  e.exec(docMig('them-kho-tai-lieu-cot-chu-nguon.sql'));
  e.exec(docMig('them-kho-tai-lieu-cot-ocr-neo.sql'));
  napBaTo(e, TL.boDau);
  const timTruoc = e.prepare('SELECT id, tim_kiem FROM tai_lieu ORDER BY id').all();
  e.exec(docMig('them-kho-tai-lieu-ho-so-bo.sql'));
  const sau = e.prepare('SELECT id, tim_kiem, ho_so_id, thay_the_boi_id FROM tai_lieu ORDER BY id').all();
  dat(sau.length === 3 && sau.every(r => r.ho_so_id === null && r.thay_the_boi_id === null),
    '⚠️ Ba tờ giấy CŨ giữ nguyên, hai cột mới = NULL — không có bước chuyển đổi dữ liệu');
  dat(JSON.stringify(timTruoc) === JSON.stringify(sau.map(r => ({ id: r.id, tim_kiem: r.tim_kiem }))),
    '⚠️ Ô tìm của dòng cũ KHÔNG bị đụng một ký tự nào');
  dat(!/^\s*UPDATE\s/im.test(docMig('them-kho-tai-lieu-ho-so-bo.sql')),
    'Trong file migration KHÔNG có một câu UPDATE nào');

  /* Ca F — chạy lại hai lần: `INSERT OR IGNORE` + id cố định ⇒ vẫn đúng 2 bộ. */
  let loiLai = '';
  try { e.exec(docMig('them-kho-tai-lieu-ho-so-bo.sql')); } catch (er) { loiLai = String(er.message); }
  dat(/duplicate column name/i.test(loiLai),
    'Chạy lại lần hai báo "duplicate column name" — ĐÃ CHẠY RỒI, không phải hỏng', loiLai.slice(0, 60));
  dat(Number(e.prepare('SELECT COUNT(*) AS n FROM ho_so').get().n) === 2,
    'Hai bộ dựng sẵn không nhân đôi khi nạp lại (INSERT OR IGNORE + id cố định)');

  /* Ca G — CHÚ THÍCH KHÔNG PHẢI RÀNG BUỘC (bài học them-gopy-lichsu-tacnhan.sql:50).
     Tập giá trị của `loai` và `trang_thai` phải do CHECK ép, không do chú thích. */
  let epDuoc = false;
  try {
    e.prepare("INSERT INTO ho_so (id, ten, loai, trang_thai) VALUES ('hs_x','Bộ bịa','loai_bia','dang_dung')").run();
  } catch (er) { epDuoc = /CHECK constraint/i.test(String(er.message)); }
  dat(epDuoc, '⚠️ CHECK ép thật tập giá trị `loai` — không phải chú thích suông');
  let epTt = false;
  try {
    e.prepare("INSERT INTO ho_so (id, ten, loai, trang_thai) VALUES ('hs_y','Bộ bịa 2','khac','trang_thai_bia')").run();
  } catch (er) { epTt = /CHECK constraint/i.test(String(er.message)); }
  dat(epTt, 'CHECK ép thật tập giá trị `trang_thai`');
}

/* ==========================================================================
   ④ 🔴 TỜ CŨ BỊ THAY THẾ — RỦI RO THẬT ĐANG NẰM TRÊN HỆ THỐNG
   ========================================================================== */
muc('④ GCN 02/2026/PLDN ↔ Sửa đổi 03/2026/PLDN — đánh dấu, hai chiều, KHÔNG ẩn tờ cũ');
{
  const kho = dungKho();
  const { db } = d1(kho);
  napBaTo(kho, TL.boDau);

  /* TRƯỚC khi đánh dấu: đúng như bản soát PHASE 1 đo được — không chỗ nào nói
     tờ 02 đã bị sửa đổi. */
  const truoc = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin, ts({})));
  const t02Truoc = truoc.ds.find(t => t.id === 'tl_gcn02');
  dat(!t02Truoc.thay_the_boi_id && !t02Truoc.thay_the_cho,
    'TRƯỚC: tờ 02 không biết mình đã bị sửa đổi (đúng hiện trạng bản soát đo được)');

  /* MÁY GỢI Ý — nhưng KHÔNG tự nối. */
  const g = await than(await TL.goiYThayThe({ DB: db }, PHIEN.admin, 'tl_gcn02'));
  dat(g.ds.some(x => x.id === 'tl_gcn03'),
    '⚠️ Máy GỢI Ý đúng tờ 03 là bản thay thế của tờ 02',
    (g.ds[0] && g.ds[0].vi_sao.join(' · ')) || '(không gợi ý được)');
  dat(!g.ds.some(x => x.id === 'tl_dl01'),
    'Nhưng KHÔNG gợi ý bừa: tờ Điều lệ (khác loại, số hiệu không liền kề) không lọt');
  const vanChuaNoi = kho.prepare("SELECT thay_the_boi_id FROM tai_lieu WHERE id='tl_gcn02'").get();
  dat(vanChuaNoi.thay_the_boi_id === null,
    '⚠️ GỢI Ý KHÔNG GHI GÌ VÀO CSDL — người phải bấm xác nhận (Sếp chốt)');

  /* NGƯỜI bấm. */
  const r = await than(await TL.danhDauThayThe({ DB: db }, PHIEN.admin,
    { id: 'tl_gcn02', thay_the_boi_id: 'tl_gcn03' }));
  dat(r.ok && r.luot_ghi_d1 === 2, 'Đánh dấu tốn 2 lượt ghi: 1 UPDATE + 1 dòng sổ sửa chung');

  const sau = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin, ts({})));
  const t02 = sau.ds.find(t => t.id === 'tl_gcn02');
  const t03 = sau.ds.find(t => t.id === 'tl_gcn03');
  dat(t02 && t02.thay_the_boi && t02.thay_the_boi.tieu_de.includes('Sửa đổi lần 1'),
    '⚠️ CHIỀU 1: tờ 02 nay CHỈ THẲNG sang tờ mới', t02?.thay_the_boi?.tieu_de);
  dat(t03 && t03.thay_the_cho && t03.thay_the_cho.id === 'tl_gcn02',
    '⚠️ CHIỀU 2: tờ 03 ghi rõ nó thay thế tờ nào', t03?.thay_the_cho?.tieu_de);

  /* ⚠️ CẤM ẨN TỜ CŨ — SPEC-0005 Mục 7.5. */
  const dong02 = kho.prepare("SELECT an FROM tai_lieu WHERE id='tl_gcn02'").get();
  dat(Number(dong02.an) === 0 && !!t02,
    '⚠️ TỜ CŨ KHÔNG BỊ ẨN: `an` vẫn = 0 và nó vẫn nằm trong danh sách');
  const mo02 = await than(await TL.moTaiLieu({ DB: db }, PHIEN.admin, 'tl_gcn02'));
  dat(mo02.ok && mo02.tai_lieu.thay_the_boi && mo02.tai_lieu.thay_the_boi.xem_duoc,
    'Tờ cũ vẫn MỞ ĐƯỢC, và màn mở nó nói ngay là đã hết hiệu lực');

  /* Không cho vòng lặp hai chiều — hai tờ cùng "hết hiệu lực" là kho tự mâu thuẫn. */
  const vong = await TL.danhDauThayThe({ DB: db }, PHIEN.admin,
    { id: 'tl_gcn03', thay_the_boi_id: 'tl_gcn02' });
  dat(vong.status === 400, 'Chặn vòng lặp A↔B', 'HTTP ' + vong.status);
  const tuMinh = await TL.danhDauThayThe({ DB: db }, PHIEN.admin,
    { id: 'tl_dl01', thay_the_boi_id: 'tl_dl01' });
  dat(tuMinh.status === 400, 'Chặn tự thay thế chính mình', 'HTTP ' + tuMinh.status);

  /* Gỡ dấu được — xếp nhầm mà không gỡ được thì người ta quay về thói ẩn tờ đi. */
  await than(await TL.danhDauThayThe({ DB: db }, PHIEN.admin, { id: 'tl_gcn02', thay_the_boi_id: null }));
  const go = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin, ts({})));
  dat(!go.ds.find(t => t.id === 'tl_gcn02').thay_the_boi_id, 'Gỡ dấu được, tờ giấy không bị đụng tới');
}

/* ==========================================================================
   ⑤ TÊN TỜ THAY THẾ CŨNG PHẢI CHE THEO NHÓM
   ========================================================================== */
muc('⑤ Tờ thay thế thuộc nhóm không xem được → nói CÓ, KHÔNG nói TÊN');
{
  const kho = dungKho();
  const { db } = d1(kho);
  napBaTo(kho, TL.boDau);
  kho.prepare("INSERT INTO nhan_su (id, ho_ten) VALUES ('NS-PHONG','Nguyễn Duy Phong')").run();
  kho.prepare(`INSERT INTO tai_lieu (id, nhom, loai, tieu_de, tim_kiem, cua_vao, gan_id,
      so_trang, kho_nha, kho_khoa, co_byte, ocr_so_trang, ocr_so_trang_neo, nhay_cam, tao_luc, an)
      VALUES ('tl_qd','nhan_su','Quyết định','Quyết định bổ nhiệm bản mới — lương 45.000.000',
              'quyet dinh','nhan_su','NS-PHONG',1,'drive','k',900,0,0,1,'2026-09-02 09:00:00',0)`).run();
  kho.prepare("UPDATE tai_lieu SET thay_the_boi_id='tl_qd' WHERE id='tl_dl01'").run();

  const rKt = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.ke_toan, ts({})));
  const dl = rKt.ds.find(t => t.id === 'tl_dl01');
  dat(!!dl && !!dl.thay_the_boi && dl.thay_the_boi.xem_duoc === false,
    '⚠️ Kế toán VẪN được báo là tờ này đã hết hiệu lực (thứ họ cần để không nộp nhầm)');
  dat(dl.thay_the_boi.tieu_de === null,
    '⚠️ Nhưng TÊN tờ thay thế bị che — nó thuộc nhóm nhân sự',
    JSON.stringify(dl.thay_the_boi));
  dat(!JSON.stringify(rKt).includes('45.000.000'),
    'Không một mẩu ruột nào của tờ nhóm nhân sự lọt ra câu trả lời');

  const rAd = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin, ts({})));
  dat(rAd.ds.find(t => t.id === 'tl_dl01').thay_the_boi.xem_duoc === true,
    'ĐỐI CHỨNG: Admin (xem được nhóm nhân sự) thì ĐỌC ĐƯỢC tên tờ thay thế');
}

/* ==========================================================================
   ⑥ TRA THEO TÊN BỘ — vá đúng con số 0 mà bản soát PHASE 1 đo được
   ========================================================================== */
muc('⑥ Gõ "hồ sơ pháp lý doanh nghiệp" — PHASE 1 đo được 0 kết quả');
{
  const kho = dungKho();
  const { db } = d1(kho);
  napBaTo(kho, TL.boDau);

  const truoc = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin,
    ts({ q: 'hồ sơ pháp lý doanh nghiệp' })));
  dat(truoc.ds.length === 0,
    'TRƯỚC (chưa xếp vào bộ): gõ "hồ sơ pháp lý doanh nghiệp" → 0 kết quả, đúng số PHASE 1 đo',
    `${truoc.ds.length} kết quả`);

  kho.prepare("UPDATE tai_lieu SET ho_so_id='hs_phaply_agc' WHERE nhom='phap_ly'").run();
  const sau = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin,
    ts({ q: 'hồ sơ pháp lý doanh nghiệp' })));
  dat(sau.ds.length === 3, 'SAU (đã xếp vào bộ): ra đủ 3 tờ', `${sau.ds.length} kết quả`);
  const khongDau = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin,
    ts({ q: 'ho so phap ly' })));
  dat(khongDau.ds.length === 3, 'Gõ KHÔNG DẤU cũng ra — dùng chung `boDau()`, không bảng thứ hai');

  /* ⚠️ ĐỔI TÊN BỘ RỒI TRA LẠI — đây là chỗ cách làm "nhét tên bộ vào cột
     tim_kiem" sẽ nói dối: tên cũ vẫn ra, tên mới không ra. */
  await than(await TL.luuHoSo({ DB: db }, PHIEN.admin,
    { id: 'hs_phaply_agc', ten: 'Bộ giấy tờ pháp nhân AGC', loai: 'phap_ly_dn', trang_thai: 'dang_dung' }));
  const tenMoi = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin, ts({ q: 'phap nhan AGC' })));
  const tenCu = await than(await TL.danhSachTaiLieu({ DB: db }, PHIEN.admin, ts({ q: 'ho so phap ly doanh nghiep' })));
  dat(tenMoi.ds.length === 3, '⚠️ Đổi tên bộ xong: tra bằng TÊN MỚI ra ngay', `${tenMoi.ds.length}`);
  dat(tenCu.ds.length === 0, '⚠️ Và tra bằng TÊN CŨ hết ra ngay — không có chuỗi tra cứu nào bị cũ',
    `${tenCu.ds.length}`);
  const soDong = kho.prepare("SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen WHERE bang='ho_so'").get();
  dat(Number(soDong.n) === 1, 'Đổi tên bộ 3 tờ tốn 1 UPDATE trên `ho_so` + 1 dòng vết, 0 lượt ghi trên `tai_lieu`');

  /* Con số ĐẾM phải khớp danh sách — `dieuKien` được dùng lại nguyên văn cho
     câu đếm, nên đẩy `OR` vào mà quên đóng ngoặc là mọi con số sai âm thầm. */
  dat(tenMoi.dem_chu && (tenMoi.dem_chu.tra_cuu_duoc + tenMoi.dem_chu.co_chu_chua_tra_duoc +
      tenMoi.dem_chu.chi_xem_duoc) === 3,
    '⚠️ Dải đếm ba vế cộng lại = đúng số dòng danh sách (mệnh đề OR có đóng ngoặc)',
    JSON.stringify(tenMoi.dem_chu));
  dat(tenMoi.dem_chu.tra_cuu_duoc === 0,
    '⚠️ VÀ NÓI THẬT: 0/3 tra được theo NỘI DUNG — cả ba là ảnh chụp, không có lớp chữ');
}

/* ==========================================================================
   ⑦ QUÉT THẲNG VÀO BỘ = 0 LƯỢT GHI D1 THÊM
   ========================================================================== */
muc('⑦ Một lượt quét vào bộ vẫn tốn ĐÚNG 1 lượt ghi D1');
{
  const kho = dungKho();
  const { db, so } = d1(kho);
  kho.exec(`CREATE TABLE IF NOT EXISTS sao_luu_thu_muc (khoa TEXT PRIMARY KEY, drive_id TEXT NOT NULL);
            INSERT INTO sao_luu_thu_muc (khoa, drive_id) VALUES ('tailieu_goc','g'),('tailieu_phap_ly','p');`);
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    if (url.includes('oauth2.googleapis.com')) {
      return new Response(JSON.stringify({ access_token: 've', expires_in: 3600 }), { status: 200 });
    }
    if (String(o.method || 'GET').toUpperCase() === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 'drive-' + Math.random().toString(36).slice(2), size: 900 }), { status: 200 });
  };
  const env = { DB: db, AI: { async run() { return { response: '' }; } },
                GOOGLE_CLIENT_ID: 'g', GOOGLE_CLIENT_SECRET: 'g', GOOGLE_REFRESH_TOKEN: 'g' };
  const pdf = new Uint8Array(400); pdf.set(new TextEncoder().encode('%PDF-1.4\n'), 0);

  const truocGhi = so.ghi;
  const r = await than(await TL.luuTaiLieu(env, PHIEN.admin, {
    cua_vao: 'kho_chung', nhom: 'phap_ly', tieu_de: 'Biên bản họp thành lập',
    loai: 'Biên bản', so_hieu: '04/2026/PLDN', so_trang: 1,
    dinh_dang: 'pdf_goc', tep_byte: pdf, ho_so_id: 'hs_phaply_agc'
  }));
  dat(r.ok === true, 'Quét thẳng vào bộ → lưu được', 'id ' + r.id);
  dat(so.ghi - truocGhi === 1,
    '⚠️ ĐÚNG 1 lượt ghi D1 cho cả lượt quét — bộ đi kèm chính câu INSERT đó',
    `${so.ghi - truocGhi} lượt ghi`);
  dat(kho.prepare('SELECT ho_so_id FROM tai_lieu WHERE id = ?').get(r.id).ho_so_id === 'hs_phaply_agc',
    'Và tờ giấy nằm đúng trong bộ ngay từ lượt ghi đầu tiên');

  const boBia = await TL.luuTaiLieu(env, PHIEN.admin, {
    cua_vao: 'kho_chung', nhom: 'phap_ly', tieu_de: 'Giấy bịa', so_trang: 1,
    dinh_dang: 'pdf_goc', tep_byte: pdf, ho_so_id: 'hs_khong_co_that'
  });
  dat(boBia.status === 404, 'Mã bộ bịa → 404, không sinh dòng trỏ vào hư không', 'HTTP ' + boBia.status);
}

/* ==========================================================================
   ⑧ TÊN BỘ LÀ DỮ LIỆU CÁ NHÂN — PHẢI CHE TRONG BẢN SAO LƯU
   ========================================================================== */
muc('⑧ Bản sao lưu CSV: tên bộ bị che (REV-0040 #5 đã bắt đúng lỗi này một lần)');
{
  const dong = { id: 'hs_kl', ten: 'Hồ sơ kỷ luật Nguyễn Văn A', loai: 'khac',
                 ghi_chu: 'Vi phạm ngày 12/8', trang_thai: 'dang_dung' };
  const che = SL.cheDongNhayCam('ho_so', dong);
  dat(che.ten === SL.O_DA_CHE, '⚠️ Tên bộ bị che trong CSV', che.ten);
  dat(che.ghi_chu === SL.O_DA_CHE, 'Ghi chú bộ cũng bị che');
  dat(che.id === 'hs_kl' && che.loai === 'khac',
    'Nhưng `id` và `loai` giữ nguyên — khôi phục xong cấu trúc bộ còn đủ, chỉ thiếu cái tên');
  dat(!SL.BANG_KHONG_SAO_LUU.has('ho_so'),
    'Bảng `ho_so` VẪN được sao lưu (danh sách loại trừ không nuốt nó) — che dòng, không bỏ bảng');

  /* ĐỐI CHỨNG BH-16: gỡ luật che đi thì tên PHẢI lọt ra. */
  const nguon = readFileSync(path.join(GOC, 'src', 'sao-luu.js'), 'utf8').replace(/\r\n/g, '\n');
  const be = nguon.replace(
    "  ho_so:    { co: () => true,                      cot: ['ten', 'ghi_chu'] }\n", '');
  dat(be !== nguon, 'Ca đối chứng: cắt được đúng dòng khai che');
  const SLBe = await napBanBe('sao-luu-bo-che.mjs', be);
  dat(SLBe.cheDongNhayCam('ho_so', dong).ten === 'Hồ sơ kỷ luật Nguyễn Văn A',
    'ĐỐI CHỨNG BH-16: bỏ luật che → tên người LỌT ra CSV (phải lọt, sạch là PHÉP ĐO hỏng)');
}

/* ==========================================================================
   ⑨ BẢNG KIỂM "BỘ NÀY CÒN THIẾU GÌ" — dùng lại khuôn 9 loại giấy đã có
   ========================================================================== */
muc('⑨ Bảng kiểm viết cứng, dùng lại khuôn LOAI_GIAY_NHAN_SU');
{
  const bkNs = TL.bangKiemHoSo('nhan_su');
  dat(bkNs.length === TL.LOAI_GIAY_NHAN_SU.length && bkNs.length === 9,
    'Bộ hồ sơ nhân sự dùng lại ĐÚNG 9 loại giấy đã khai — không chép tay lần thứ hai',
    `${bkNs.length} loại`);
  dat(bkNs.every((x, i) => x.ma === TL.LOAI_GIAY_NHAN_SU[i].ma),
    'Và đúng từng mã một — thêm một loại giấy nhân sự chỉ phải sửa MỘT chỗ');
  dat(TL.bangKiemHoSo('phap_ly_dn').length === 9, 'Bộ pháp lý doanh nghiệp: 9 loại giấy');
  dat(TL.bangKiemHoSo('khac').length === 0,
    'Bộ "khác" KHÔNG có bảng kiểm — bịa ra một bảng kiểm cho nó là bịa ra một con số Sếp sẽ tin');

  const soat = TL.soatBangKiem('phap_ly_dn', [
    { loai: 'GCN đăng ký doanh nghiệp', tieu_de: 'GCN ĐKDN' },
    { loai: 'Điều lệ', tieu_de: 'Điều lệ công ty' }
  ]);
  dat(soat.find(x => x.ma === 'gcn_dkkd').co === true, 'Soát nhận ra tờ GCN đã có');
  dat(soat.find(x => x.ma === 'cccd_dai_dien').co === false, 'Và nói đúng là thiếu CCCD người đại diện');
  dat(TL.soatBangKiem('phap_ly_dn', [{ loai: 'GIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP', tieu_de: '' }])
        .find(x => x.ma === 'gcn_dkkd').co === true,
    'So bằng chữ ĐÃ BỎ DẤU — gõ hoa/thường/không dấu đều nhận ra');
}

/* ==========================================================================
   PHẦN B — GIAO DIỆN: đo THẬT bằng Chrome, TRƯỚC (origin/main) và SAU
   ========================================================================== */
if (!CHI_MAY) {
  const { dungMayGia, moChrome, TOI } = await import(pathToFileURL(
    path.join(GOC, 'scripts', 'lib', 'ban-do-chrome.mjs')).href);

  /* Tài liệu giả ĐÚNG KHUÔN máy chủ thật trả về. Ba tờ đầu là ba tờ thật. */
  function dungTaiLieu(n) {
    const ds = [];
    for (let i = 0; i < n; i++) {
      const g = BA_TO[i % 3];
      ds.push({
        id: 'tl_' + i, nhom: 'phap_ly', loai: g[2], tieu_de: g[3] + (i > 2 ? ` (${i})` : ''),
        so_hieu: g[4], ngay_ban_hanh: '2026-01-15', ngay_het_han: null, han_luu: 'vĩnh viễn',
        so_trang: 1, co_byte: 900000, ocr_so_trang: 0, ocr_so_trang_neo: 0, chu_nguon: 'khong',
        ocr_ghi_chu: null, nhay_cam: 0, nguoi_tao: 'NS-NGOC', tao_luc: '2026-09-01 08:00:00',
        cua_vao: 'kho_chung', gan_id: null, gan_ten: null, trich: null,
        ho_so_id: null, thay_the_boi_id: null, ho_so_ten: null,
        thay_the_boi: null, thay_the_cho: null
      });
    }
    return ds;
  }
  const NHOM = [
    { ma: 'phap_ly', ten: 'Pháp lý doanh nghiệp' }, { ma: 'attp', ten: 'An toàn thực phẩm' },
    { ma: 'nhap_khau', ten: 'Nhập khẩu' }, { ma: 'ke_toan', ten: 'Kế toán – thuế' },
    { ma: 'nhan_su', ten: 'Nhân sự' }, { ma: 'ncc', ten: 'Nhà cung cấp' },
    { ma: 'noi_bo', ten: 'Quản trị nội bộ' }
  ];

  function apiCua(n) {
    return (duong, u, traJson) => {
      if (duong === '/api/toi-la-ai') {
        return traJson({ ...TOI, quyen: [...TOI.quyen, 'khotailieu'] }), true;
      }
      if (duong === '/api/tai-lieu') {
        const ds = dungTaiLieu(n);
        return traJson({
          ds, tong: ds.length, bi_cat: false, cat: null, tran: 50, nhom: NHOM,
          nhom_luu_duoc: NHOM.map(x => x.ma), gan_id: null, loai_goi_y: [],
          duoc_quet_nhan_su: true, ho_so: null,
          dem_chu: { tra_cuu_duoc: 0, co_chu_chua_tra_duoc: 0, chi_xem_duoc: ds.length },
          canh_bao: 'Đây là bản dự phòng để tra cứu. KHÔNG thay bản giấy — đừng huỷ giấy gốc.'
        }), true;
      }
      if (duong === '/api/ho-so') {
        return traJson({
          ds: [
            { id: 'hs_phaply_agc', ten: 'Hồ sơ pháp lý doanh nghiệp — Công ty TNHH Alpha Green Commerce',
              loai: 'phap_ly_dn', ten_loai: 'Hồ sơ pháp lý doanh nghiệp', trang_thai: 'dang_dung',
              ghi_chu: null, so_giay: 3, so_can: 9 },
            { id: 'hs_phaply_onfod', ten: 'Hồ sơ pháp lý doanh nghiệp — HKD Onfod (tiền thân)',
              loai: 'phap_ly_dn', ten_loai: 'Hồ sơ pháp lý doanh nghiệp', trang_thai: 'dang_dung',
              ghi_chu: null, so_giay: 0, so_can: 9 }
          ],
          bi_cat: false, cat: null, tran: 100, sua_duoc: true,
          loai: [{ ma: 'phap_ly_dn', ten: 'Hồ sơ pháp lý doanh nghiệp', so_can: 9 },
                 { ma: 'khac', ten: 'Hồ sơ khác', so_can: 0 }]
        }), true;
      }
      return false;
    };
  }

  /* Phép đo chạy TRONG trình duyệt. Đo cái người dùng thật sự gặp:
       · chỗ bị chiếm trước THẺ ĐẦU TIÊN (px)
       · số thẻ nhìn TRỌN VẸN trong một màn, chưa cuộn
       · chiều dài cả trang
       · có kéo ngang không, có phần tử nào tràn mép phải không
       · nút chạm nhỏ nhất */
  const PHEP_DO = `(() => {
    const v = document.querySelector('#v-khotailieu');
    const the = [...v.querySelectorAll('.tl-the')];
    const cao = window.innerHeight;
    const dau = the.length ? Math.round(the[0].getBoundingClientRect().top + window.scrollY) : null;
    const tron = the.filter(t => {
      const r = t.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= cao;
    }).length;
    const tran = [...v.querySelectorAll('*')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.right > window.innerWidth + 1;
    }).length;
    /* ⚠️ Ô CHẠM LÀ CÁI NGƯỜI TA CHẠM, KHÔNG PHẢI CÁI THẺ BÊN TRONG NÓ.
       Ô tick trần cao 13px ở mọi trình duyệt — nhưng người ta chạm vào NHÃN
       bọc nó (.tl-loc-han, min-height 44px). Đo cái ô 13px rồi kêu hỏng là
       phép đo sai chỗ, và bản origin/main cũng "hỏng" y hệt, tức là nó không
       đo được gì cả. Đo đúng bộ lớp nhà đã chốt (cùng danh sách
       do-kho-tai-lieu dùng), cộng summary vì PHASE 2 thêm khối gập. */
    const cham = [...v.querySelectorAll(
      '.tl-nut-mo, .tl-chip, .tl-tim, .tl-loc-han, .tl-nut-quet, .tl-bo-dong, summary')]
      .filter(e => e.offsetParent !== null)
      .map(e => Math.round(e.getBoundingClientRect().height));
    return {
      soThe: the.length,
      truocTheDau: dau,
      theTron: tron,
      daiTrang: Math.round(document.documentElement.scrollHeight),
      keoNgang: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      tranMep: tran,
      chamNhoNhat: cham.length ? Math.min(...cham) : null
    };
  })()`;

  async function do1({ commit, rong, cao, soTaiLieu }) {
    const may = await dungMayGia({ commit, tatHoatAnh: true, apiRieng: apiCua(soTaiLieu) });
    const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html#khotailieu`, rong, cao, doiMs: 2200 });
    try {
      await cr.chay(`(location.hash='#khotailieu', document.querySelector('[data-tab="khotailieu"]')?.click(), 1)`)
        .catch(() => {});
      await cr.doi(900);
      return await cr.chay(PHEP_DO);
    } finally { cr.dong(); may.dong(); }
  }

  muc('⑩ GIAO DIỆN — đo THẬT ở 1440×900 và 375×812, bản TRƯỚC (origin/main) cạnh bản SAU');
  const KHUNG = [{ rong: 1440, cao: 900 }, { rong: 375, cao: 812 }];
  const kq = { truoc: {}, sau: {} };
  for (const k of KHUNG) {
    for (const [ten, commit] of [['truoc', 'origin/main'], ['sau', null]]) {
      kq[ten][k.rong] = {
        it: await do1({ commit, rong: k.rong, cao: k.cao, soTaiLieu: 3 }),
        nhieu: await do1({ commit, rong: k.rong, cao: k.cao, soTaiLieu: 50 })
      };
    }
  }

  const bang = (t) => `${t.truocTheDau}px trước thẻ đầu · ${t.theTron} thẻ trọn màn`;
  for (const k of KHUNG) {
    const T = kq.truoc[k.rong].it, S = kq.sau[k.rong].it;
    console.log(`\n  ${k.rong}×${k.cao} · kho 3 tài liệu`);
    console.log(`    TRƯỚC: ${bang(T)} · trang dài ${T.daiTrang}px`);
    console.log(`    SAU  : ${bang(S)} · trang dài ${S.daiTrang}px`);
    console.log(`  ${k.rong}×${k.cao} · kho 50 tài liệu`);
    console.log(`    TRƯỚC: trang dài ${kq.truoc[k.rong].nhieu.daiTrang}px`);
    console.log(`    SAU  : trang dài ${kq.sau[k.rong].nhieu.daiTrang}px`);
  }

  for (const k of KHUNG) {
    const T = kq.truoc[k.rong].it, S = kq.sau[k.rong].it;
    dat(S.truocTheDau < T.truocTheDau,
      `${k.rong}px: chỗ bị chiếm trước thẻ đầu GIẢM`,
      `${T.truocTheDau} → ${S.truocTheDau} px (bớt ${T.truocTheDau - S.truocTheDau})`);
    dat(S.theTron >= T.theTron,
      `${k.rong}px: số thẻ nhìn trọn một màn KHÔNG giảm`,
      `${T.theTron} → ${S.theTron}`);
  }
  /* ⚠️ CÂU NẶNG NHẤT CỦA BẢN SOÁT: "trên điện thoại, kho mới 3 tờ mà mở tab ra
     không thấy tờ nào". Đây là chỗ phải hết. */
  dat(kq.truoc[375].it.theTron === 0 && kq.sau[375].it.theTron >= 1,
    '⚠️ 375px: TRƯỚC mở tab ra KHÔNG thấy tờ nào; SAU thấy ít nhất một tờ',
    `${kq.truoc[375].it.theTron} → ${kq.sau[375].it.theTron} thẻ`);

  /* ĐIỂM TỐT PHẢI GIỮ — không kéo ngang, 0 phần tử tràn mép, nút ≥44px. */
  for (const k of KHUNG) {
    for (const n of ['it', 'nhieu']) {
      const S = kq.sau[k.rong][n];
      dat(!S.keoNgang, `${k.rong}px (${n === 'it' ? '3' : '50'} tài liệu): KHÔNG kéo ngang`);
      dat(S.tranMep === 0, `${k.rong}px (${n === 'it' ? '3' : '50'} tài liệu): 0 phần tử tràn mép phải`,
        String(S.tranMep));
    }
    dat(kq.sau[k.rong].it.chamNhoNhat >= 44,
      `${k.rong}px: nút chạm nhỏ nhất vẫn ≥ 44px`, kq.sau[k.rong].it.chamNhoNhat + 'px');
  }

  /* ⚠️ CÂU BẮT BUỘC CTL-0026 Mục 2 PHẢI CÒN NHÌN THẤY ĐƯỢC, không nằm sau một
     cú bấm. Gập đoạn trích luật thì được, gập chính câu đó thì KHÔNG. */
  {
    const may = await dungMayGia({ tatHoatAnh: true, apiRieng: apiCua(3) });
    const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html#khotailieu`, rong: 375, cao: 812, doiMs: 2200 });
    try {
      /* PHẢI mở đúng tab trước khi đo — quên bước này thì `#v-khotailieu` còn
         mang thuộc tính `hidden`, mọi `getBoundingClientRect()` trả về 0, và
         phép đo đỏ vì BÀN ĐO sai chứ không phải vì sản phẩm sai (BH-17). */
      await cr.chay(`(location.hash='#khotailieu', document.querySelector('[data-tab="khotailieu"]')?.click(), 1)`)
        .catch(() => {});
      await cr.doi(900);
      const r = await cr.chay(`(() => {
        const b = document.querySelector('#tl-luat b');
        if (!b) return { co: false };
        const rc = b.getBoundingClientRect();
        return { co: true, chu: b.textContent.trim(), hien: rc.height > 0 && rc.top < window.innerHeight };
      })()`);
      dat(r.co && r.hien, '⚠️ Câu cảnh báo pháp lý VẪN HIỆN NGAY (không gập, không phải bấm mới thấy)');
      dat(r.chu.includes('KHÔNG thay bản giấy'),
        'Và đúng nguyên văn chuỗi CANH_BAO_PHAP_LY của máy chủ', r.chu.slice(0, 60) + '…');
      const dem = await cr.chay(`(() => {
        const p = document.querySelector('#tl-dem-chu');
        return { hien: !p.hidden, chu: (p.textContent || '').slice(0, 40) };
      })()`);
      dat(dem.hien && /0/.test(dem.chu),
        '⚠️ Dải đếm VẪN HIỆN con số 0-tra-được-theo-nội-dung (chỉ đoạn giải thích gập vào)',
        dem.chu);
      dat(cr.loiConsole.length === 0 && cr.ngoaiLe.length === 0,
        'Không lỗi console, không ngoại lệ chưa bắt',
        (cr.loiConsole[0] || cr.ngoaiLe[0] || '').slice(0, 90));
    } finally { cr.dong(); may.dong(); }
  }
}

console.log('\n───────────────────────────────────────────────────────────');
console.log(soHong ? `  ✗ ${soHong} mục HỎNG` : '  KẾT LUẬN: ĐẠT toàn bộ.');
process.exit(soHong ? 1 : 0);
