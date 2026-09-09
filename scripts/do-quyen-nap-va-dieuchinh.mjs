/* ==========================================================================
   ĐO: AI CÒN NẠP ĐƯỢC TỒN KHO HÀNG LOẠT · AI CÒN LẬP ĐƯỢC PHIẾU ĐIỀU CHỈNH
   ---------------------------------------------------------------------------
   Sếp Bùi Thị Ngọc chốt 09/09/2026:
     C1 — chỉ Quản lý kho và Kế toán trưởng được NẠP TỒN KHO HÀNG LOẠT.
     C2 — chỉ Quản lý kho và Kế toán trưởng được LẬP PHIẾU ĐIỀU CHỈNH KHO.
   (Admin vẫn làm được cả hai — Sếp Ngọc dùng tài khoản admin.)

   BÀN ĐO NÀY GỌI API THẬT, KHÔNG KHẲNG ĐỊNH SUÔNG.
   Không `import { duocNapTonHangLoat }` rồi bảo "đúng rồi". Nó dựng SQLite
   thật từ `schema.sql` + toàn bộ `migrations/`, tạo tài khoản thật, lấy cookie
   phiên thật, rồi gọi `worker.fetch()` NGUYÊN BẢN qua router:
       POST /api/kho/nap-mo · nap-xem · nap-ghi   (khung byte y hệt trình duyệt)
       GET  /api/kho/nap-luot    · POST /api/kho/nap-huy
       POST /api/kho/dieu-chinh
       POST /api/kho/nhap                          (đối chứng: KHÔNG được siết nhầm)
   Đọc thẳng mã HTTP và thân JSON. Ẩn nút ngoài giao diện KHÔNG tính là chặn.

   BỐN CÂU PHẢI TRẢ LỜI BẰNG SỐ:
   ① HIỆN TRẠNG TRƯỚC KHI SỬA — đo trên `--truoc <commit>`: có thật là
      `nhan_vien_kho` (17 bạn part-time ở kho) nạp được file tồn kho không?
   ② SAU KHI SỬA: người KHÔNG có quyền gọi thẳng API phải ăn 403, và câu 403
      phải NÓI RA LÝ DO (không phải danh sách rỗng, không phải 404 câm).
   ③ Người CÓ quyền vẫn chạy trọn việc: nạp file vào sổ cái thật, lập phiếu
      điều chỉnh thật — đếm dòng trong `giao_dich_kho` để chứng minh.
   ④ KHÔNG SIẾT NHẦM: `nhan_vien_kho` vẫn nhập/xuất kho từng phiếu như cũ.

   BH-16 — CA ĐỐI CHỨNG, chạy trên bản `src` LÀM HỎNG CỐ Ý. Bàn đo nào không
   tự chứng minh được là nó CÓ MẮT thì chỉ là đồ trang trí:
     DC-A  trả `nap_luot: true` cho mọi vai trò       → phải bắt
     DC-B  bỏ chốt ở `batBuocNapDuLieu` (cửa ngoài)   → phải bắt
     DC-C  bỏ chốt ở `ghiThat` (cửa trong)            → phải bắt
     DC-D  `dieuChinhKho` quay về `duocQuanLyKho`     → phải bắt (chị Hằng mất quyền)
     DC-E  `dieuChinhKho` bỏ hẳn chốt quyền           → phải bắt
     DC-F  siết nhầm cả `nhapKho` sang `nap_luot`     → phải bắt (kho mất việc hằng ngày)

   CHẠY:
     node scripts/do-quyen-nap-va-dieuchinh.mjs
     node scripts/do-quyen-nap-va-dieuchinh.mjs --truoc origin/main   (đo bản cũ)
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');

datDongHo('2026-09-09T03:00:00Z');            // 10:00 giờ VN

/* `--truoc <commit>` = bày `src/` của một commit khác ra thư mục tạm rồi đo
   trên đó. Đây là cách DUY NHẤT nói được "trước khi sửa, 17 bạn part-time nạp
   được thật" mà không phải tin lời ai. */
const viTriTruoc = process.argv.indexOf('--truoc');
const COMMIT_TRUOC = viTriTruoc > 0 ? process.argv[viTriTruoc + 1] : null;

/* ==========================================================================
   MỒI DỮ LIỆU — đúng những vai trò đang có người thật ngồi
   ========================================================================== */
/* [khoá, họ tên, chức vụ, ô 1 (vai trò hệ thống), ô 2 (vị trí công việc)]
   Hai ô, không phải một — xem khối "HAI Ô" trong src/quyen.js. Anh Duy và chị
   Hằng trên bản thật đang là `nguoi_dung` + vị trí, nên mồi đúng như vậy. */
const NGUOI = [
  ['SEP',   'Bùi Thị Ngọc',     'Giám đốc điều hành', 'admin',      null],
  ['DUY',   'Phạm Khương Duy',  'TP. Kho Vận',        'nguoi_dung', 'quan_ly_kho'],
  ['HANG',  'Phan Thị Hằng',    'Kế toán trưởng',     'nguoi_dung', 'ke_toan_truong'],
  ['LINH',  'Đinh Mạnh Linh',   'NV Kho Vận',         'nguoi_dung', 'nhan_vien_kho'],
  ['TEST',  'Nguyễn Văn Thử',   'NV thử luồng',       'nguoi_dung', 'nv_test'],
  ['HUYEN', 'Nguyễn Thị Huyền', 'NV Vận hành TMĐT',   'nguoi_dung', 'van_hanh_san'],
  ['HUONG', 'Vũ Lan Hương',     'NV Hành chính NS',   'nguoi_dung', 'hcns']
];

function moi(db) {
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)');
  const coCotViTri = db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('tai_khoan') WHERE name='vi_tri_cong_viec'")
                       .get().n > 0;
  const tk = coCotViTri
    ? db.prepare('INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, vi_tri_cong_viec) VALUES (?,?,?,?,?,?)')
    : db.prepare('INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro) VALUES (?,?,?,?,?)');
  NGUOI.forEach(([id, ten, cv, o1, o2], i) => {
    ns.run(id, ten, id.slice(0, 2), cv, 'Thử');
    if (coCotViTri) tk.run(i + 1, id, 'tk' + id.toLowerCase(), 'h', o1, o2);
    else tk.run(i + 1, id, 'tk' + id.toLowerCase(), 'h', o2 || o1);   // bản cũ: một ô
  });

  /* Một mã hàng KHÔNG theo lô, đã có 100 trong sổ — đủ để điều chỉnh thật. */
  db.exec(`
    INSERT OR REPLACE INTO san_pham (id, ma_sku, ten, don_vi, theo_doi_hsd, dang_ban)
      VALUES ('sp_hanhkho', 'AGC-HK-01', 'Hành khô Bắc Giang loại 1', 'túi', 0, 1);
    INSERT OR REPLACE INTO san_pham (id, ma_sku, ten, don_vi, theo_doi_hsd, dang_ban)
      VALUES ('sp_hatdieu', 'AGC-HD-02', 'Hạt điều rang muối 500g', 'túi', 0, 1);
    DELETE FROM giao_dich_kho;
    INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, ghi_chu, nguoi_id)
      VALUES ('pn_mo', 'sp_hanhkho', NULL, 'nhap', 100, 'tồn mồi', 'SEP');
  `);
}

const KHOA = Object.fromEntries(NGUOI.map(([id], i) => [id, i + 1]));

/* ==========================================================================
   DỰNG KHUNG BYTE Y HỆT TRÌNH DUYỆT  (public/assets/js/api.js · khungNapFile)
   4 byte độ dài phần mô tả (big-endian) + JSON mô tả + nội dung file.
   Gõ lại ở đây chứ không import: bàn đo phải nói được ngôn ngữ của CỬA, chứ
   không mượn hàm của chính thứ nó đang đo.
   ========================================================================== */
function khungNap(moTa, chuFile) {
  const md = new TextEncoder().encode(JSON.stringify(moTa));
  const byte = new TextEncoder().encode(chuFile);
  const khung = new Uint8Array(4 + md.length + byte.length);
  new DataView(khung.buffer).setUint32(0, md.length, false);
  khung.set(md, 4);
  khung.set(byte, 4 + md.length);
  return khung;
}

/* File tồn kho thật: 2 dòng, đúng hai cột bắt buộc của đích `ton_kho`. */
const FILE_TON = 'Mã hàng,Số lượng tồn\nAGC-HK-01,250\nAGC-HD-02,80\n';
const MO_TA_TON = { dich: 'ton_kho', ten_tep: 'ton-dau-ky.csv', bang_chon: null,
                    ghep: { ma_sku: 0, so_luong: 1 } };

async function napWorker(thuMucSrc) {
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  return (await import(url)).default;
}

const BYTE = { 'Content-Type': 'application/octet-stream' };

/* Gọi một lượt nạp tồn kho ĐẦY ĐỦ BA BƯỚC như trình duyệt vẫn làm. Trả về mã
   HTTP của từng bước — bước nào chặn thì các bước sau vẫn được gọi, vì cả BA
   cửa đều phải chặn chứ không phải chỉ cửa đầu. */
async function napTonBaBuoc(worker, env, token) {
  const goi = (duong) => goiAPI(worker, env, duong, token, {
    method: 'POST', headers: BYTE, body: khungNap(MO_TA_TON, FILE_TON)
  });
  return { mo: await goi('/api/kho/nap-mo'),
           xem: await goi('/api/kho/nap-xem'),
           ghi: await goi('/api/kho/nap-ghi') };
}

async function lapPhieuDieuChinh(worker, env, token, tonThuc = 88) {
  return goiAPI(worker, env, '/api/kho/dieu-chinh', token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ san_pham_id: 'sp_hanhkho', ton_thuc: tonThuc,
                           ly_do: 'kiểm kê 09/09/2026, hàng vỡ 12 túi' })
  });
}

/* ==========================================================================
   MỘT LƯỢT ĐO TRỌN VẸN TRÊN MỘT THƯ MỤC src
   ========================================================================== */
async function doMotBan(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const worker = await napWorker(thuMucSrc);

  const the = {};
  for (const k of Object.keys(KHOA)) the[k] = await taoPhienThat(env, KHOA[k]);

  const demSoCai = () => db.prepare('SELECT COUNT(*) AS n FROM giao_dich_kho').get().n;
  /* Trả sổ cái về đúng mốc mồi TRƯỚC MỖI VAI.
     ⚠️ Phải xoá CẢ SỔ VẾT `nap_file`, không chỉ dòng sổ cái. `ghiThat` có chốt
     chống nạp lại đúng một file (vân tay nội dung nằm ở `lich_su_thay_doi_nen`)
     — để lại vết của vai trước là vai sau ăn 409 "file này đã nạp rồi" và bàn
     đo tưởng đó là chặn quyền. Đúng kiểu phép đo nói dối NGƯỢC CHIỀU: mã đúng
     mà báo sai. */
  const traSoVeMoc = () => db.exec(
    "DELETE FROM giao_dich_kho WHERE phieu_id <> 'pn_mo';" +
    "DELETE FROM lich_su_thay_doi_nen WHERE bang = 'giao_dich_kho';" +
    "DELETE FROM lo_hang;");

  /* Im tiếng console của mã sản phẩm — nó in cảnh báo thật, nhưng ở đây tiếng
     động che mất bảng kết quả. */
  const that = { error: console.error, warn: console.warn, log: console.log };
  console.error = () => {}; console.warn = () => {};

  const kq = { nap: {}, dieuChinh: {}, luot: {}, nhap: {}, toiLaAi: {} };
  try {
    for (const k of Object.keys(KHOA)) {
      kq.toiLaAi[k] = await goiAPI(worker, env, '/api/toi-la-ai', the[k]);
    }
    /* --- Nạp tồn hàng loạt: đo TỪNG vai, mỗi vai trên sổ cái sạch --------- */
    for (const k of Object.keys(KHOA)) {
      traSoVeMoc();
      const truoc = demSoCai();
      const r = await napTonBaBuoc(worker, env, the[k]);
      kq.nap[k] = { ...r, themDong: demSoCai() - truoc };
      kq.luot[k] = await goiAPI(worker, env, '/api/kho/nap-luot?so=10', the[k]);
    }
    /* --- Phiếu điều chỉnh: cũng từng vai, sổ cái trả về đúng mốc 100 ------ */
    for (const k of Object.keys(KHOA)) {
      traSoVeMoc();
      const truoc = demSoCai();
      const r = await lapPhieuDieuChinh(worker, env, the[k]);
      kq.dieuChinh[k] = { ...r, themDong: demSoCai() - truoc };
    }
    /* --- ĐỐI CHỨNG: nhập kho từng phiếu KHÔNG được siết nhầm -------------- */
    for (const k of ['DUY', 'LINH', 'TEST', 'HANG']) {
      traSoVeMoc();
      kq.nhap[k] = await goiAPI(worker, env, '/api/kho/nhap', the[k], {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ san_pham_id: 'sp_hanhkho', so_luong: 5, doi_tac: 'NCC thử' })
      });
    }
  } finally {
    Object.assign(console, that);
  }
  return kq;
}

/* ---- Bày src của một commit khác ra thư mục tạm -------------------------- */
function baySrcCuaCommit(commit) {
  const thuMuc = path.join(GOC, '.do-quyen-truoc');
  rmSync(thuMuc, { recursive: true, force: true });
  mkdirSync(thuMuc, { recursive: true });
  const ds = execFileSync('git', ['ls-tree', '--name-only', `${commit}:src`],
                          { cwd: GOC, encoding: 'utf8' }).trim().split('\n');
  for (const f of ds) {
    if (!f.endsWith('.js')) continue;
    const noi = execFileSync('git', ['show', `${commit}:src/${f}`],
                             { cwd: GOC, encoding: 'utf8' });
    writeFileSync(path.join(thuMuc, f), noi, 'utf8');
  }
  return thuMuc;
}

/* ---- Ca đối chứng: làm hỏng src cố ý ------------------------------------
   CRLF → LF trước khi tiêm: `src/*.js` trên máy này lưu bằng CRLF, còn chuỗi
   neo viết trong tệp này là LF — không đổi thì mũi tiêm chẳng bao giờ găm vào
   và ca đối chứng báo "LỌT" oan (bài học đã ghi ở scripts/do-tach-vai-tro.mjs). */
function banSrcHong(ten, sua) {
  const thuMuc = path.join(GOC, '.dc-quyenkho-' + ten);
  rmSync(thuMuc, { recursive: true, force: true });
  mkdirSync(thuMuc, { recursive: true });
  for (const f of readdirSync(SRC)) {
    if (!f.endsWith('.js')) continue;
    const noi = readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
    writeFileSync(path.join(thuMuc, f), sua(f, noi), 'utf8');
  }
  return thuMuc;
}

const TEN = { SEP: 'Admin (Sếp Ngọc)', DUY: 'Quản lý kho (anh Duy)',
              HANG: 'Kế toán trưởng (chị Hằng)', LINH: 'Nhân viên kho (part-time)',
              TEST: 'NV test luồng', HUYEN: 'Vận hành sàn', HUONG: 'Hành chính nhân sự' };

/* ĐƯỢC LÀM = tất cả các bước đều KHÔNG 403 và có dòng vào sổ cái. */
const napDuoc = (r) => r.ghi.status === 200 && r.themDong > 0;
const dieuChinhDuoc = (r) => r.status === 200 && r.themDong === 1;

/* ==========================================================================
   CHẠY
   ========================================================================== */

if (COMMIT_TRUOC) {
  console.log(`\n=== ① HIỆN TRẠNG TRƯỚC KHI SỬA (${COMMIT_TRUOC}) =====================\n`);
  const thuMuc = baySrcCuaCommit(COMMIT_TRUOC);
  let cu = null;
  try { cu = await doMotBan(thuMuc); }
  finally { rmSync(thuMuc, { recursive: true, force: true }); }
  console.log('  ' + 'VAI TRÒ'.padEnd(30) + 'nạp tồn hàng loạt   phiếu điều chỉnh');
  for (const k of Object.keys(KHOA)) {
    console.log('  ' + TEN[k].padEnd(30) +
      (napDuoc(cu.nap[k]) ? 'ĐƯỢC' : `chặn ${cu.nap[k].ghi.status}`).padEnd(20) +
      (dieuChinhDuoc(cu.dieuChinh[k]) ? 'ĐƯỢC' : `chặn ${cu.dieuChinh[k].status}`));
  }
  console.log('');
  ok('BẢN CŨ: nhân viên kho part-time NẠP ĐƯỢC file tồn kho hàng loạt (đúng cái Sếp bảo siết)',
     napDuoc(cu.nap.LINH), `nap-ghi ${cu.nap.LINH.ghi.status}, ghi ${cu.nap.LINH.themDong} dòng vào sổ cái`);
  ok('BẢN CŨ: Kế toán trưởng KHÔNG lập được phiếu điều chỉnh (đúng cái Sếp bảo mở)',
     !dieuChinhDuoc(cu.dieuChinh.HANG), `dieu-chinh ${cu.dieuChinh.HANG.status}`);
}

console.log('\n=== ② BẢN NÀY ==================================================\n');
const r = await doMotBan(SRC);

console.log('  ' + 'VAI TRÒ'.padEnd(30) + 'nạp tồn hàng loạt   phiếu điều chỉnh   xem lượt nạp');
for (const k of Object.keys(KHOA)) {
  console.log('  ' + TEN[k].padEnd(30) +
    (napDuoc(r.nap[k]) ? 'ĐƯỢC' : `chặn ${r.nap[k].ghi.status}`).padEnd(20) +
    (dieuChinhDuoc(r.dieuChinh[k]) ? 'ĐƯỢC' : `chặn ${r.dieuChinh[k].status}`).padEnd(20) +
    (r.luot[k].status === 200 ? 'ĐƯỢC' : `chặn ${r.luot[k].status}`));
}
console.log('');

console.log('— C1 · NẠP TỒN KHO HÀNG LOẠT —');
for (const k of ['SEP', 'DUY', 'HANG']) {
  ok(`${TEN[k]} VẪN nạp được trọn ba bước, dòng vào sổ cái thật`, napDuoc(r.nap[k]),
     `nap-mo ${r.nap[k].mo.status} · nap-xem ${r.nap[k].xem.status} · nap-ghi ${r.nap[k].ghi.status} · +${r.nap[k].themDong} dòng`);
}
for (const k of ['LINH', 'TEST', 'HUYEN', 'HUONG']) {
  const b = r.nap[k];
  ok(`${TEN[k]} bị chặn 403 ở CẢ BA cửa nạp, KHÔNG dòng nào vào sổ cái`,
     b.mo.status === 403 && b.xem.status === 403 && b.ghi.status === 403 && b.themDong === 0,
     `nap-mo ${b.mo.status} · nap-xem ${b.xem.status} · nap-ghi ${b.ghi.status} · +${b.themDong} dòng`);
}
ok('Câu 403 NÓI THẲNG LÝ DO (không rỗng, không câm) và chỉ đúng người nạp giúp',
   /nạp tồn kho hàng loạt/i.test(r.nap.LINH.ghi.than?.loi || '') &&
   /Kế toán trưởng/.test(r.nap.LINH.ghi.than?.loi || ''),
   '“' + String(r.nap.LINH.ghi.than?.loi || '(rỗng)').slice(0, 90) + '…”');
ok('Nhân viên kho cũng KHÔNG xem được danh sách lượt nạp (403, không phải danh sách rỗng)',
   r.luot.LINH.status === 403 && !Array.isArray(r.luot.LINH.than?.ds),
   `status ${r.luot.LINH.status}`);
ok('Kế toán trưởng XEM ĐƯỢC lượt nạp — có nạp thì phải có đường lùi',
   r.luot.HANG.status === 200, `status ${r.luot.HANG.status}`);

console.log('\n— C2 · PHIẾU ĐIỀU CHỈNH KHO —');
for (const k of ['SEP', 'DUY', 'HANG']) {
  ok(`${TEN[k]} lập được phiếu điều chỉnh, đúng 1 dòng vào sổ cái`, dieuChinhDuoc(r.dieuChinh[k]),
     `status ${r.dieuChinh[k].status} · +${r.dieuChinh[k].themDong} dòng · ` +
     `${r.dieuChinh[k].than?.ton_truoc} → ${r.dieuChinh[k].than?.ton_sau}`);
}
for (const k of ['LINH', 'TEST', 'HUYEN', 'HUONG']) {
  ok(`${TEN[k]} bị chặn, KHÔNG dòng nào vào sổ cái`,
     r.dieuChinh[k].status === 403 && r.dieuChinh[k].themDong === 0,
     `status ${r.dieuChinh[k].status} · +${r.dieuChinh[k].themDong} dòng`);
}
ok('Câu 403 của phiếu điều chỉnh nói rõ ai lập được + báo cho ai',
   /Quản lý kho, Kế toán trưởng/.test(r.dieuChinh.LINH.than?.loi || '') &&
   /Phạm Khương Duy/.test(r.dieuChinh.LINH.than?.loi || ''),
   '“' + String(r.dieuChinh.LINH.than?.loi || '(rỗng)').slice(0, 90) + '…”');

console.log('\n— ④ KHÔNG SIẾT NHẦM: việc hằng ngày ở kho giữ nguyên —');
ok('Nhân viên kho part-time VẪN nhập kho từng phiếu được', r.nhap.LINH.status === 200,
   `status ${r.nhap.LINH.status}`);
ok('NV test luồng VẪN nhập kho được', r.nhap.TEST.status === 200, `status ${r.nhap.TEST.status}`);
ok('Quản lý kho VẪN nhập kho được', r.nhap.DUY.status === 200, `status ${r.nhap.DUY.status}`);
ok('Kế toán trưởng VẪN KHÔNG nhập kho thay kho được (ranh giới cũ không đổi)',
   r.nhap.HANG.status === 403, `status ${r.nhap.HANG.status}`);

console.log('\n— Cờ máy chủ gửi ra giao diện (/api/toi-la-ai) —');
ok('Giao diện nhận đúng cờ `kho.nap_luot` cho từng vai (để không bày nút ăn 403)',
   r.toiLaAi.DUY.than?.kho?.nap_luot === true &&
   r.toiLaAi.HANG.than?.kho?.nap_luot === true &&
   r.toiLaAi.LINH.than?.kho?.nap_luot === false,
   `Duy ${r.toiLaAi.DUY.than?.kho?.nap_luot} · Hằng ${r.toiLaAi.HANG.than?.kho?.nap_luot} · Linh ${r.toiLaAi.LINH.than?.kho?.nap_luot}`);
ok('Giao diện nhận đúng cờ `kho.dieu_chinh`',
   r.toiLaAi.DUY.than?.kho?.dieu_chinh === true &&
   r.toiLaAi.HANG.than?.kho?.dieu_chinh === true &&
   r.toiLaAi.LINH.than?.kho?.dieu_chinh === false,
   `Duy ${r.toiLaAi.DUY.than?.kho?.dieu_chinh} · Hằng ${r.toiLaAi.HANG.than?.kho?.dieu_chinh} · Linh ${r.toiLaAi.LINH.than?.kho?.dieu_chinh}`);
ok('Cờ `kho.thao_tac` của nhân viên kho GIỮ NGUYÊN true — không cắt lan',
   r.toiLaAi.LINH.than?.kho?.thao_tac === true);

/* ==========================================================================
   CA ĐỐI CHỨNG — bàn đo có mắt hay không
   ========================================================================== */
console.log('\n— BH-16 · CA ĐỐI CHỨNG (làm hỏng src cố ý, bàn đo PHẢI đỏ) —');

const DC = [
  ['A', 'bảng quyền trả nap_luot=true cho mọi vai trò',
    (f, s) => f !== 'quyen.js' ? s :
      s.replace('nap_luot: false, dieu_chinh: false }', 'nap_luot: true, dieu_chinh: false }'),
    (k) => napDuoc(k.nap.LINH)],

  ['B', 'bỏ chốt ở batBuocNapDuLieu (cửa ngoài)',
    (f, s) => f !== 'index.js' ? s :
      s.replace("if (maDich === 'ton_kho' && !duocNapTonHangLoat(phien)) {",
                "if (false) {"),
    (k) => k.nap.LINH.mo.status !== 403],

  /* ⚠️ PHẢI GỠ CẢ HAI CỬA MỚI ĐO ĐƯỢC CỬA TRONG.
     Gỡ mỗi `ghiThat` thì cửa ngoài (`batBuocNapDuLieu`) vẫn 403 và ca này báo
     "LỌT" oan — bàn đo tưởng mình mù trong khi sản phẩm vẫn lành. Vòng chạy
     đầu đã dính đúng bẫy đó. Đo cửa trong ĐỨNG MỘT MÌNH thì nằm ở phép "CHẶN
     KÉP" ngay dưới danh sách này. */
  ['C', 'bỏ chốt ở CẢ HAI cửa nạp (ngoài + trong)',
    (f, s) => f === 'index.js'
      ? s.replace("if (maDich === 'ton_kho' && !duocNapTonHangLoat(phien)) {", 'if (false) {')
      : f === 'nap-du-lieu.js'
        ? s.replace("if (maDich === 'ton_kho' && !duocNapTonHangLoat(phien)) {", 'if (false) {')
        : s,
    (k) => napDuoc(k.nap.LINH)],

  ['D', 'dieuChinhKho quay về duocQuanLyKho (chị Hằng mất quyền)',
    (f, s) => f !== 'kho.js' ? s : s.replace('if (!duocDieuChinhKho(phien)) {', 'if (!duocQuanLyKho(phien)) {'),
    (k) => !dieuChinhDuoc(k.dieuChinh.HANG)],

  ['E', 'dieuChinhKho bỏ hẳn chốt quyền',
    (f, s) => f !== 'kho.js' ? s : s.replace('if (!duocDieuChinhKho(phien)) {', 'if (false) {'),
    (k) => dieuChinhDuoc(k.dieuChinh.LINH)],

  ['F', 'siết nhầm cả nhapKho sang quyền nạp hàng loạt',
    (f, s) => f !== 'kho.js' ? s :
      s.replace("if (!duocThaoTacKho(phien)) return loi('Bạn không có quyền nhập kho', 403);",
                "if (!duocDieuChinhKho(phien)) return loi('Bạn không có quyền nhập kho', 403);"),
    (k) => k.nhap.LINH.status !== 200]
];

for (const [ma, ten, sua, batDuoc] of DC) {
  const thuMuc = banSrcHong(ma, sua);
  /* Mũi tiêm KHÔNG găm được = ca đối chứng vô nghĩa. Bắt buộc phải khác bản
     lành ở ít nhất một tệp, không thì báo hỏng BÀN ĐO chứ không báo "lọt". */
  let daGam = false;
  for (const f of readdirSync(SRC)) {
    if (!f.endsWith('.js')) continue;
    const goc = readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
    if (readFileSync(path.join(thuMuc, f), 'utf8') !== goc) { daGam = true; break; }
  }
  let bat = false, ghiChu = '';
  if (!daGam) { ghiChu = 'MŨI TIÊM KHÔNG GĂM — chuỗi neo đã lệch, sửa bàn đo'; }
  else {
    try { bat = !!batDuoc(await doMotBan(thuMuc)); }
    catch (e) { bat = true; ghiChu = 'ném lỗi: ' + String(e.message).slice(0, 60); }
  }
  rmSync(thuMuc, { recursive: true, force: true });
  ok(`DC-${ma} ${ten}`, daGam && bat,
     !daGam ? ghiChu : (bat ? 'bàn đo BẮT ĐƯỢC' + (ghiChu ? ' (' + ghiChu + ')' : '')
                            : 'LỌT — bàn đo mù chỗ này'));
}

/* ---- CHẶN KÉP: cửa trong phải tự đứng được một mình ----------------------
   Mọi cửa kho trong ERP này đều chặn hai lớp. Lớp trong chỉ có giá trị nếu nó
   CÒN CHẶN khi lớp ngoài đã đổ — mà điều đó không đo được trên bản lành, vì
   lớp ngoài luôn cắt trước. Nên gỡ ĐÚNG lớp ngoài rồi hỏi lại lớp trong. */
console.log('\n— CHẶN KÉP: gỡ cửa ngoài thì cửa trong (`ghiThat`) có còn chặn không —');
{
  const thuMuc = banSrcHong('kep', (f, s) => f !== 'index.js' ? s :
    s.replace("if (maDich === 'ton_kho' && !duocNapTonHangLoat(phien)) {", 'if (false) {'));
  let k = null;
  try { k = await doMotBan(thuMuc); } finally { rmSync(thuMuc, { recursive: true, force: true }); }
  ok('Gỡ cửa ngoài: `nap-mo`/`nap-xem` lọt (đúng — đã gỡ), nhưng `nap-ghi` VẪN 403',
     k.nap.LINH.mo.status === 200 && k.nap.LINH.ghi.status === 403 && k.nap.LINH.themDong === 0,
     `nap-mo ${k.nap.LINH.mo.status} · nap-ghi ${k.nap.LINH.ghi.status} · +${k.nap.LINH.themDong} dòng`);
}

process.exit(tongKet() ? 0 : 1);
