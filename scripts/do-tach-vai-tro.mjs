/* ==========================================================================
   ĐO: "TÁCH VAI TRÒ HỆ THỐNG KHỎI VỊ TRÍ CÔNG VIỆC" — HAI Ô, KHÔNG PHẢI MỘT
   ---------------------------------------------------------------------------
   Sếp Bùi Thị Ngọc chốt 04/09/2026, nguyên văn:
     "gộp 2 vai trò như này ko biết phân quyền kiểu gì nhé, tách ra 2 vai trò đi"

   BÀN ĐO NÀY TRẢ LỜI ĐÚNG BỐN CÂU, và không câu nào trả lời được bằng mắt:

   ① 24 TỔ HỢP (3 vai trò hệ thống × 8 vị trí kể cả "chưa gán") ra bộ quyền
     gì, và tổ hợp nào NGUY HIỂM. "Nguy hiểm" = tổ hợp cho ra quyền mà không
     ô nào trong hai ô tự có — tức là phép hợp ĐẺ RA quyền từ hư không. Phép
     hợp chỉ được CỘNG, không được SÁNG TẠO.

   ② KHÔNG AI MẤT QUYỀN sau chuyển đổi. Với MỌI vai trò cũ, bộ tab + ba cờ
     (xem_luong/admin/them_nhan_su) + quyền kho + quyền sàn + quyền tài liệu
     TRƯỚC và SAU migration phải GIỐNG HỆT. So từng khoá, không so "đại khái".

   ③ KHÔNG AI TỰ NÂNG QUYỀN. Gọi THẲNG API (không qua giao diện) bằng phiên
     thật của HCNS và của Admin backup, thử mọi đường tự phong Admin.

   ④ MIGRATION AN TOÀN: chạy trên CSDL đã có dữ liệu không mất gì; chạy hai
     lần không vỡ; mã mới sống được khi CỘT CHƯA CÓ (deploy.yml không tự chạy
     migration) — không 500, không mất đăng nhập.

   CÁCH ĐO (BH-34 · BH-44): SQLite THẬT qua `node:sqlite`, nạp `schema.sql` +
   TOÀN BỘ migrations thật, rồi gọi `worker.fetch()` NGUYÊN BẢN qua router với
   cookie phiên thật. Soi THẲNG JSON body — không nhìn màn hình, không khớp
   chuỗi SQL bằng tay.

   BH-16 — CÁC CA ĐỐI CHỨNG chạy trên bản `src` ĐÃ LÀM HỎNG CỐ Ý. Bàn đo nào
   không tự chứng minh được là nó CÓ MẮT thì chỉ là đồ trang trí:
     DC-A  ô 2 nhận cả vai trò hệ thống      → phải bắt (HCNS tự phong Admin)
     DC-B  bỏ chốt "không tự sửa chính mình" → phải bắt (HCNS tự lấy quyền lương)
     DC-C  bỏ chốt "chỉ Admin trao lương"    → phải bắt (Admin backup trao lương)
     DC-D  phép hợp thành phép GIAO          → phải bắt (mất quyền sau chuyển đổi)
     DC-E  ô 1 nhận cả vị trí công việc      → phải bắt (dựng lại đúng lỗi cũ)
     DC-F  đọc phiên không phòng thủ         → phải bắt (thiếu cột là 500 cả hệ thống)
     DC-G  danh bạ chỉ soi ô 1               → phải bắt (tài khoản test lòi ra)
     DC-H  cron HCNS chỉ soi ô 1             → phải bắt (chị Hương mất hết tin nhắc)

   Chạy:  node scripts/do-tach-vai-tro.mjs
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, cacCauSQL, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');

datDongHo('2026-09-04T03:00:00Z');            // 10:00 giờ VN

/* ---- Mồi dữ liệu — ĐÚNG 8 tài khoản của bản thật ------------------------
   Năm người ở giữa đang là `nguoi_dung` thật (đo trên CSDL bản thật ngày
   04/09/2026) — đó chính là triệu chứng cần chữa, KHÔNG phải mồi cho đẹp. */
const NGUOI = [
  // id       họ tên               chức vụ thật                      bộ phận      vai trò cũ
  ['SEP',    'Bùi Thị Ngọc',      'Giám đốc điều hành',             'Ban giám đốc', 'admin'],
  ['PHONG',  'Nguyễn Duy Phong',  'Giám đốc',                       'Ban giám đốc', 'admin'],
  ['DUY',    'Phạm Khương Duy',   'TP. Kho Vận - Sản Xuất',         'Kho vận',      'nguoi_dung'],
  ['HANG',   'Phan Thị Hằng',     'Trưởng nhóm Kế toán - Tài chính','Kế toán',      'nguoi_dung'],
  ['HUYEN',  'Nguyễn Thị Huyền',  'NV Vận hành TMĐT',               'Kinh doanh',   'nguoi_dung'],
  ['HUONG',  'Vũ Lan Hương',      'NV Chăm sóc Khách hàng',         'CSKH',         'nguoi_dung'],
  ['LINH',   'Đinh Mạnh Linh',    'Nhân viên Kho Vận',              'Kho vận',      'nguoi_dung'],
  ['TEST',   'Tài khoản thử',     'Test luồng',                     'Kho vận',      'nv_test']
];

function moi(db, viTri = {}) {
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)');
  const tk = db.prepare(
    `INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro,
                            vi_tri_cong_viec, kich_hoat, phai_doi_mk, duyet_gopy)
     VALUES (?,?,?,?,?,?,1,0,?)`);
  NGUOI.forEach(([id, ten, cv, bp, vt], i) => {
    ns.run(id, ten, id.slice(0, 2), cv, bp);
    tk.run(i + 1, id, 'tk' + id.toLowerCase(), 'pbkdf2$1$x$x', vt, viTri[id] ?? null, id === 'SEP' ? 1 : 0);
  });
}
const CHI_SO = Object.fromEntries(NGUOI.map(([id], i) => [id, i + 1]));

/* ---- Ảnh chụp TOÀN BỘ quyền của một chủ thể ----------------------------
   Chụp ĐỦ mọi bảng quyền trong src/quyen.js, không chỉ bộ tab. Chụp thiếu
   một bảng là ca "mất quyền" trốn được qua bàn đo — đúng lỗi BH-47.

   SO THEO TẬP, KHÔNG THEO THỨ TỰ: `tab` được sắp lại trước khi so. Thứ tự
   tab là chuyện TRÌNH BÀY (menu vẽ theo TAB trong src/quyen.js), còn cái
   đang đo là AI XEM ĐƯỢC GÌ. Không sắp thì bàn đo báo đỏ chỉ vì đường một
   vai trò trả về giữ thứ tự khai trong bảng còn đường hợp hai ô trả về theo
   thứ tự menu — một khác biệt không ai nhìn thấy và không ai mất quyền. */
async function anhQuyen(q, chuThe) {
  return JSON.stringify({
    tab:      [...q.quyenCua(chuThe).tab].sort(),
    luong:    q.duocXemLuong(chuThe),
    admin:    q.laAdmin(chuThe),
    themNs:   q.duocThemNhanSu(chuThe),
    taoTk:    q.duocTaoTaiKhoan(chuThe),
    taiSan:   q.duocQuanLyTaiSan(chuThe),
    caChinhSach: q.duocQuanLyChinhSachCa(chuThe),
    vanHanh:  q.duocThaoTacVanHanh(chuThe),
    kho:      q.quyenKho(chuThe),
    sanPham:  q.quyenSanPham(chuThe),
    shopee:   q.quyenShopee(chuThe),
    tlXem:    [...q.nhomTaiLieuXemDuoc(chuThe)].sort(),
    tlLuu:    [...q.nhomTaiLieuLuuDuoc(chuThe)].sort()
  });
}

/* ---- Nạp một bản quyen.js (bản thật, hoặc bản làm hỏng cố ý) ------------ */
async function napQuyen(thuMucSrc) {
  const url = pathToFileURL(path.join(thuMucSrc, 'quyen.js')).href + `?v=${Math.random()}`;
  return import(url);
}
async function napWorker(thuMucSrc) {
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  return (await import(url)).default;
}

/* ======================================================================
   PHÉP ĐO 1 — 24 TỔ HỢP: phép hợp chỉ CỘNG, không ĐẺ RA quyền
   ====================================================================== */
async function doHaiMuoiBonToHop(thuMucSrc) {
  const q = await napQuyen(thuMucSrc);
  const o1 = q.VAI_TRO_HE_THONG;                 // 3
  const o2 = ['', ...q.VI_TRI_CONG_VIEC];        // 8 (kể cả "chưa gán")
  const bang = [], nguyHiem = [];

  for (const a of o1) for (const b of o2) {
    const gop  = JSON.parse(await anhQuyen(q, { vai_tro: a, vi_tri_cong_viec: b }));
    const rieng1 = JSON.parse(await anhQuyen(q, a));
    const rieng2 = b ? JSON.parse(await anhQuyen(q, b)) : null;

    /* Mọi thứ trong bộ hợp phải đến TỪ MỘT TRONG HAI ô. Không thì phép hợp
       đang đẻ ra quyền từ hư không — đó mới là "tổ hợp nguy hiểm" thật, chứ
       không phải "tổ hợp mạnh" (mạnh là do Sếp cố ý trao). */
    const loi = [];
    for (const t of gop.tab) {
      if (!rieng1.tab.includes(t) && !(rieng2 && rieng2.tab.includes(t))) loi.push('tab:' + t);
    }
    for (const c of ['luong', 'admin', 'themNs', 'taoTk', 'taiSan', 'caChinhSach', 'vanHanh']) {
      if (gop[c] && !rieng1[c] && !(rieng2 && rieng2[c])) loi.push('cờ:' + c);
    }
    for (const [nhom, cot] of [['kho', ['thao_tac', 'quan_ly', 'gia_von']],
                               ['sanPham', ['sua', 'khoa']],
                               ['shopee', ['xem', 'quan_ly']]]) {
      for (const c of cot) {
        if (gop[nhom][c] && !rieng1[nhom][c] && !(rieng2 && rieng2[nhom][c])) loi.push(`${nhom}.${c}`);
      }
    }
    for (const n of gop.tlXem) {
      if (!rieng1.tlXem.includes(n) && !(rieng2 && rieng2.tlXem.includes(n))) loi.push('tàiliệu:' + n);
    }
    if (loi.length) nguyHiem.push({ a, b, loi });
    bang.push({ a, b: b || '(chưa gán)', tab: gop.tab.length, luong: gop.luong,
                admin: gop.admin, themNs: gop.themNs, nhanSuTL: gop.tlXem.includes('nhan_su') });
  }
  return { bang, nguyHiem, soToHop: bang.length };
}

/* ======================================================================
   PHÉP ĐO 2 — TRƯỚC = SAU: không ai mất quyền sau chuyển đổi
   ====================================================================== */
async function doTruocBangSau(thuMucSrc) {
  const q = await napQuyen(thuMucSrc);
  const lech = [];
  for (const vt of q.VI_TRI_CONG_VIEC) {
    const truoc = await anhQuyen(q, vt);                                            // cách cũ: 1 cột
    const sau   = await anhQuyen(q, { vai_tro: 'nguoi_dung', vi_tri_cong_viec: vt }); // sau migration
    if (truoc !== sau) lech.push(vt);
  }
  for (const vt of q.VAI_TRO_HE_THONG) {
    const truoc = await anhQuyen(q, vt);
    const sau   = await anhQuyen(q, { vai_tro: vt, vi_tri_cong_viec: null });
    if (truoc !== sau) lech.push(vt);
  }
  return lech;
}

/* Danh sách vị trí trong MIGRATION phải khớp src/quyen.js — lệch một mã là
   một người bị bỏ quên ở lại ô 1, và không bàn đo nào khác thấy. */
async function doDanhSachKhopMigration(thuMucSrc) {
  const q = await napQuyen(thuMucSrc);
  const sql = readFileSync(path.join(GOC, 'migrations', 'them-vi-tri-cong-viec.sql'), 'utf8');
  const khoi = sql.match(/WHERE vai_tro IN \(([^)]*)\)/s);
  if (!khoi) return { khop: false, thieu: ['không tìm thấy mệnh đề WHERE vai_tro IN'] };
  const trongSql = [...khoi[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort();
  const trongMa  = [...q.VI_TRI_CONG_VIEC].sort();
  return { khop: JSON.stringify(trongSql) === JSON.stringify(trongMa), trongSql, trongMa };
}

/* ======================================================================
   PHÉP ĐO 3 — GỌI THẲNG API: không ai tự nâng quyền
   ====================================================================== */
async function doCuaAPI(thuMucSrc) {
  const { db, d1 } = dungDB();
  // HCNS = chị Vũ Lan Hương (vị trí, ô 2). Admin backup = chị Phan Thị Hằng.
  moi(db, { HUONG: 'hcns', DUY: 'quan_ly_kho' });
  db.prepare("UPDATE tai_khoan SET vai_tro='admin_backup' WHERE nhan_su_id='HANG'").run();
  const env = dungEnv(d1);
  const worker = await napWorker(thuMucSrc);

  const p = {};
  for (const id of Object.keys(CHI_SO)) p[id] = await taoPhienThat(env, CHI_SO[id]);
  const sua = (ai, than) => goiAPI(worker, env, '/api/quan-tri/sua-vai-tro', p[ai],
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });
  const tao = (ai, than) => goiAPI(worker, env, '/api/quan-tri/tao-tai-khoan', p[ai],
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });
  const doc = (nsId) => db.prepare('SELECT vai_tro, vi_tri_cong_viec FROM tai_khoan WHERE nhan_su_id = ?').get(nsId);
  const idTK = (nsId) => db.prepare('SELECT id FROM tai_khoan WHERE nhan_su_id = ?').get(nsId).id;

  const k = {};

  // — HCNS (chị Hương) tự phong Admin, bốn đường —
  k.hcnsTuAdminO1 = await sua('HUONG', { tai_khoan_id: idTK('HUONG'), vai_tro: 'admin' });
  k.hcnsTuAdminO2 = await sua('HUONG', { tai_khoan_id: idTK('HUONG'), vi_tri_cong_viec: 'admin' });
  k.hcnsTuKTT     = await sua('HUONG', { tai_khoan_id: idTK('HUONG'), vi_tri_cong_viec: 'ke_toan_truong' });
  k.hcnsPhongAdminChoNguoiKhac = await sua('HUONG', { tai_khoan_id: idTK('LINH'), vai_tro: 'admin' });
  k.huongSauCung = doc('HUONG');

  // — HCNS trao lương cho người khác —
  k.hcnsTraoLuong = await sua('HUONG', { tai_khoan_id: idTK('LINH'), vi_tri_cong_viec: 'ke_toan_truong' });
  // — HCNS làm ĐÚNG việc của mình: đặt vị trí kho cho anh Linh —
  k.hcnsDatViTri = await sua('HUONG', { tai_khoan_id: idTK('HUYEN'), vi_tri_cong_viec: 'van_hanh_san' });
  k.huyenSauCung = doc('HUYEN');

  // — Admin backup (chị Hằng) —
  k.abTuAdmin      = await sua('HANG', { tai_khoan_id: idTK('HANG'), vai_tro: 'admin' });
  k.abTraoLuong    = await sua('HANG', { tai_khoan_id: idTK('LINH'), vi_tri_cong_viec: 'ke_toan_truong' });
  k.abTuSuaViTri   = await sua('HANG', { tai_khoan_id: idTK('HANG'), vi_tri_cong_viec: 'quan_ly_kho' });
  k.abDatViTriNguoiKhac = await sua('HANG', { tai_khoan_id: idTK('LINH'), vi_tri_cong_viec: 'nhan_vien_kho' });
  k.abTaoTkViTriLuong = await tao('HANG', { nhan_su_id: 'TEST2', ten_dang_nhap: 'xyz', vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'ke_toan_truong' });

  // — Nhân viên thường (anh Linh) không được đụng gì —
  k.nvSua = await sua('LINH', { tai_khoan_id: idTK('HUYEN'), vi_tri_cong_viec: 'cskh' });

  // — Admin thật làm được mọi thứ, kể cả ô của chính mình —
  k.adminSuaHai = await sua('SEP', { tai_khoan_id: idTK('DUY'), vai_tro: 'admin_backup', vi_tri_cong_viec: 'quan_ly_kho' });
  k.duySauCung = doc('DUY');
  k.adminTuSua = await sua('SEP', { tai_khoan_id: idTK('SEP'), vi_tri_cong_viec: 'hcns' });

  // — Ô 1 KHÔNG nhận vị trí công việc (dựng lại đúng cái lỗi vừa sửa) —
  k.o1NhanViTri = await sua('SEP', { tai_khoan_id: idTK('LINH'), vai_tro: 'quan_ly_kho' });

  // — Ghi vết: mỗi lần đổi thật phải để lại đúng một dòng —
  k.soDongVet = db.prepare(
    "SELECT COUNT(*) AS n FROM nhan_su_lich_su WHERE loai_su_kien = 'doi_vai_tro'").get().n;
  k.dongVetDuy = db.prepare(
    `SELECT gia_tri_cu, gia_tri_moi, nguoi_thuc_hien_id FROM nhan_su_lich_su
      WHERE nhan_su_id = 'DUY' AND loai_su_kien = 'doi_vai_tro' ORDER BY id DESC LIMIT 1`).get();

  // — Anh Duy CÓ vào được tab Kho vận sau khi gán vị trí (triệu chứng gốc) —
  moi(db, { DUY: 'quan_ly_kho', HANG: 'ke_toan_truong', HUYEN: 'van_hanh_san' });
  const p2 = {};
  for (const id of ['DUY', 'HANG', 'HUYEN']) p2[id] = await taoPhienThat(env, CHI_SO[id]);
  k.duyToiLaAi   = await goiAPI(worker, env, '/api/toi-la-ai', p2.DUY);
  k.hangToiLaAi  = await goiAPI(worker, env, '/api/toi-la-ai', p2.HANG);
  k.huyenToiLaAi = await goiAPI(worker, env, '/api/toi-la-ai', p2.HUYEN);
  k.duyKhoVan    = await goiAPI(worker, env, '/api/kho/san-pham', p2.DUY);

  // — Tài khoản test vẫn bị giấu khỏi danh bạ khi `nv_test` nằm ở ô 2 —
  db.prepare("UPDATE tai_khoan SET vai_tro='nguoi_dung', vi_tri_cong_viec='nv_test' WHERE nhan_su_id='TEST'").run();
  const db2 = await goiAPI(worker, env, '/api/danh-ba', p2.DUY);
  k.danhBaCoTest = JSON.stringify(db2.than || {}).includes('Tài khoản thử');

  return k;
}

/* ======================================================================
   PHÉP ĐO 4 — MIGRATION: dữ liệu thật, chạy hai lần, và CHƯA CÓ CỘT
   ====================================================================== */
function doMigration() {
  const { db } = dungDB();
  // Dựng lại CSDL ở trạng thái TRƯỚC migration: bỏ cột đi rồi mồi dữ liệu cũ.
  db.exec('DROP INDEX IF EXISTS idx_taikhoan_vitri');
  db.exec('ALTER TABLE tai_khoan DROP COLUMN vi_tri_cong_viec');
  db.exec("DELETE FROM schema_migrations WHERE filename = 'them-vi-tri-cong-viec.sql'");
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');

  // Mồi theo kiểu CŨ — một cột, và có đủ cả vai trò hệ thống lẫn vị trí.
  const CU = [['SEP', 'admin'], ['PHONG', 'admin'], ['DUY', 'quan_ly_kho'],
              ['HANG', 'ke_toan_truong'], ['HUYEN', 'van_hanh_san'],
              ['HUONG', 'hcns'], ['LINH', 'nguoi_dung'], ['TEST', 'nv_test']];
  const ns = db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)');
  const tk = db.prepare(
    'INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro) VALUES (?,?,?,?,?)');
  CU.forEach(([id, vt], i) => { ns.run(id, id, id.slice(0, 2), 'NV', 'BP'); tk.run(i + 1, id, 'tk' + id, 'h', vt); });

  const sql = readFileSync(path.join(GOC, 'migrations', 'them-vi-tri-cong-viec.sql'), 'utf8');
  const chay = () => { for (const c of cacCauSQL(sql)) db.exec(c); };

  chay();                                   // lần 1
  const sau = db.prepare('SELECT nhan_su_id, vai_tro, vi_tri_cong_viec FROM tai_khoan ORDER BY id').all();

  let lanHaiVo = false;
  try { chay(); } catch { lanHaiVo = true; } // lần 2 PHẢI dừng ở chốt schema_migrations
  const sauLanHai = db.prepare('SELECT nhan_su_id, vai_tro, vi_tri_cong_viec FROM tai_khoan ORDER BY id').all();

  const soDong = db.prepare('SELECT COUNT(*) AS n FROM tai_khoan').get().n;
  return { sau, lanHaiVo, khongDoiSauLanHai: JSON.stringify(sau) === JSON.stringify(sauLanHai), soDong };
}

/* Mã mới chạy trên CSDL CHƯA có cột — không được 500, không mất đăng nhập. */
async function doThieuCot(thuMucSrc) {
  const { db, d1 } = dungDB();
  db.exec('DROP INDEX IF EXISTS idx_taikhoan_vitri');
  db.exec('ALTER TABLE tai_khoan DROP COLUMN vi_tri_cong_viec');
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)');
  const tk = db.prepare(
    'INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, duyet_gopy) VALUES (?,?,?,?,?,?)');
  ns.run('SEP', 'Bùi Thị Ngọc', 'TN', 'GĐ', 'BGĐ'); tk.run(1, 'SEP', 'tksep', 'h', 'admin', 1);
  ns.run('DUY', 'Phạm Khương Duy', 'KD', 'TP Kho', 'Kho vận'); tk.run(2, 'DUY', 'tkduy', 'h', 'quan_ly_kho', 0);

  const env = dungEnv(d1);
  const worker = await napWorker(thuMucSrc);
  const tSep = await taoPhienThat(env, 1), tDuy = await taoPhienThat(env, 2);

  const im = console.warn; console.warn = () => {};
  const r = {
    toiLaAi:  await goiAPI(worker, env, '/api/toi-la-ai', tDuy),
    danhBa:   await goiAPI(worker, env, '/api/danh-ba', tDuy),
    qtDs:     await goiAPI(worker, env, '/api/quan-tri/danh-sach', tSep),
    khoVan:   await goiAPI(worker, env, '/api/kho/san-pham', tDuy)
  };
  console.warn = im;
  return r;
}

/* ---- Ca đối chứng: làm hỏng src cố ý ------------------------------------ */
function banSrcHong(ten, sua) {
  const thuMuc = path.join(GOC, '.dc-vaitro-' + ten);
  rmSync(thuMuc, { recursive: true, force: true });
  mkdirSync(thuMuc, { recursive: true });
  for (const f of readdirSync(SRC)) {
    if (!f.endsWith('.js')) continue;
    writeFileSync(path.join(thuMuc, f), sua(f, readFileSync(path.join(SRC, f), 'utf8')), 'utf8');
  }
  return thuMuc;
}

/* ==========================================================================
   CHẠY
   ========================================================================== */

console.log('\n=== BẢN THẬT ===================================================\n');

const th = await doHaiMuoiBonToHop(SRC);
console.log('— ① BẢNG 24 TỔ HỢP (3 vai trò hệ thống × 8 vị trí) —\n');
console.log('  ' + 'VAI TRÒ HỆ THỐNG'.padEnd(15) + 'VỊ TRÍ CÔNG VIỆC'.padEnd(18) +
            'tab'.padStart(4) + '  lương  admin  +nsự  giấy-nhân-sự');
for (const r of th.bang) {
  console.log('  ' + r.a.padEnd(15) + r.b.padEnd(18) + String(r.tab).padStart(4) +
    '  ' + (r.luong ? ' CÓ  ' : '  –  ') + '  ' + (r.admin ? ' CÓ ' : '  – ') +
    '   ' + (r.themNs ? ' CÓ ' : '  – ') + '   ' + (r.nhanSuTL ? ' CÓ' : '  –'));
}
console.log('');
ok('Đúng 24 tổ hợp được đo', th.soToHop === 24, `${th.soToHop} tổ hợp`);
ok('KHÔNG tổ hợp nào đẻ ra quyền từ hư không (hợp chỉ CỘNG)',
   th.nguyHiem.length === 0,
   th.nguyHiem.length ? th.nguyHiem.map(x => `${x.a}+${x.b}: ${x.loi.join(',')}`).join(' | ') : '0/24 nguy hiểm');

/* Ranh giới cứng, gọi đích danh — kiểm RIÊNG chứ không tin vào phép trên. */
const q0 = await napQuyen(SRC);
const nd = (b) => ({ vai_tro: 'nguoi_dung', vi_tri_cong_viec: b });
ok('HCNS (mọi tổ hợp không-Admin) KHÔNG xem được lương',
   !q0.duocXemLuong(nd('hcns')) && !q0.duocXemLuong({ vai_tro: 'admin_backup', vi_tri_cong_viec: 'hcns' }));
ok('HCNS VẪN thêm được nhân sự (không cắt quá tay)', q0.duocThemNhanSu(nd('hcns')));
ok('Quản lý kho KHÔNG xem được giấy tờ nhân sự (CCCD) — CTL-0025 Mục 4',
   !q0.nhomTaiLieuXemDuoc(nd('quan_ly_kho')).includes('nhan_su') &&
   !q0.nhomTaiLieuXemDuoc({ vai_tro: 'admin_backup', vi_tri_cong_viec: 'quan_ly_kho' }).includes('nhan_su'));
ok('Nhân viên kho KHÔNG xem được giá vốn', !q0.duocXemGiaVon(nd('nhan_vien_kho')));
ok('KHÔNG vị trí công việc nào phong được Admin',
   q0.VI_TRI_CONG_VIEC.every(v => !q0.laAdmin(nd(v))));
ok('Nhét vai trò hệ thống vào ô 2 thì bị VỨT, không cộng quyền',
   !q0.laAdmin({ vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'admin' }) &&
   !q0.duocTaoTaiKhoan({ vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'admin_backup' }));
// Dòng CŨ = mã vị trí còn nằm ở ô 1, đúng trạng thái DB trong quãng
// "code mới, chưa nạp migration". Phải giữ NGUYÊN quyền, không ai mất gì.
ok('Dòng cũ (mã vị trí còn ở ô 1) giữ nguyên quyền — quãng chưa nạp migration',
   JSON.stringify(q0.quyenCua({ vai_tro: 'quan_ly_kho', vi_tri_cong_viec: '' }).tab) ===
   JSON.stringify(q0.quyenCua('quan_ly_kho').tab));
ok('Chị Hằng = Admin backup + Kế toán trưởng ra ĐÚNG hợp hai bộ',
   (() => { const x = q0.quyenCua({ vai_tro: 'admin_backup', vi_tri_cong_viec: 'ke_toan_truong' });
            return x.xem_luong && x.them_nhan_su && !x.admin &&
                   x.tab.includes('ketoan') && x.tab.includes('quantri'); })());

console.log('\n— ② TRƯỚC = SAU (không ai mất quyền sau chuyển đổi) —');
const lech = await doTruocBangSau(SRC);
ok('Cả 10 vai trò: bộ quyền TRƯỚC và SAU giống hệt',
   lech.length === 0, lech.length ? 'lệch: ' + lech.join(',') : '10/10 khớp từng khoá');
const kh = await doDanhSachKhopMigration(SRC);
ok('Danh sách vị trí trong migration KHỚP src/quyen.js', kh.khop,
   kh.khop ? kh.trongMa.length + ' mã' : `SQL=[${kh.trongSql}] · mã=[${kh.trongMa}]`);

console.log('\n— ④ MIGRATION —');
const mg = doMigration();
const bang = Object.fromEntries(mg.sau.map(r => [r.nhan_su_id, r]));
ok('Không mất/thêm dòng tài khoản nào', mg.soDong === 8, `${mg.soDong} dòng`);
ok('Admin GIỮ NGUYÊN ở ô 1, ô 2 để trống',
   bang.SEP.vai_tro === 'admin' && bang.SEP.vi_tri_cong_viec === null);
ok('Quản lý kho chuyển sang ô 2, ô 1 về "nguoi_dung"',
   bang.DUY.vai_tro === 'nguoi_dung' && bang.DUY.vi_tri_cong_viec === 'quan_ly_kho');
ok('Kế toán trưởng chuyển đúng', bang.HANG.vi_tri_cong_viec === 'ke_toan_truong');
ok('HCNS chuyển đúng', bang.HUONG.vi_tri_cong_viec === 'hcns');
ok('Người đang là "nguoi_dung" thật thì KHÔNG bị đụng',
   bang.LINH.vai_tro === 'nguoi_dung' && bang.LINH.vi_tri_cong_viec === null);
ok('Chạy lần 2 DỪNG ngay ở chốt, không vỡ dữ liệu', mg.lanHaiVo && mg.khongDoiSauLanHai);

console.log('\n— ⑤ CHƯA NẠP MIGRATION: mã mới vẫn sống —');
const tc = await doThieuCot(SRC);
ok('/api/toi-la-ai KHÔNG 500', tc.toiLaAi.status === 200, 'status ' + tc.toiLaAi.status);
ok('/api/danh-ba KHÔNG 500', tc.danhBa.status === 200, 'status ' + tc.danhBa.status);
ok('/api/quan-tri/danh-sach KHÔNG 500', tc.qtDs.status === 200, 'status ' + tc.qtDs.status);
ok('/api/kho/san-pham KHÔNG 500', tc.khoVan.status === 200, 'status ' + tc.khoVan.status);
ok('Thiếu cột thì quyền ĐÚNG BẰNG bản cũ (quản lý kho vẫn vào tab Kho vận)',
   (tc.toiLaAi.than?.quyen || []).includes('khovan'));
ok('Màn Quản trị BÁO là chưa có cột (không im lặng)', tc.qtDs.than?.co_cot_vi_tri === false);

console.log('\n— ③ GỌI THẲNG API: không ai tự nâng quyền —');
const k = await doCuaAPI(SRC);
ok('HCNS tự đặt ô 1 = admin → CHẶN', k.hcnsTuAdminO1.status === 403, 'status ' + k.hcnsTuAdminO1.status);
ok('HCNS nhét "admin" vào ô 2 → CHẶN', k.hcnsTuAdminO2.status >= 400, 'status ' + k.hcnsTuAdminO2.status);
ok('HCNS tự đặt mình = Kế toán trưởng (lấy quyền lương) → CHẶN',
   k.hcnsTuKTT.status === 403, 'status ' + k.hcnsTuKTT.status);
ok('HCNS phong Admin cho người khác → CHẶN', k.hcnsPhongAdminChoNguoiKhac.status === 403,
   'status ' + k.hcnsPhongAdminChoNguoiKhac.status);
ok('Sau bốn cú thử, ô của HCNS KHÔNG hề đổi',
   k.huongSauCung.vai_tro === 'nguoi_dung' && k.huongSauCung.vi_tri_cong_viec === 'hcns',
   `${k.huongSauCung.vai_tro} / ${k.huongSauCung.vi_tri_cong_viec}`);
ok('HCNS trao vị trí có lương cho người khác → CHẶN', k.hcnsTraoLuong.status === 403,
   'status ' + k.hcnsTraoLuong.status);
ok('HCNS LÀM ĐƯỢC đúng việc của mình: đặt vị trí thường (không cắt quá tay)',
   k.hcnsDatViTri.status === 200 && k.huyenSauCung.vi_tri_cong_viec === 'van_hanh_san',
   'status ' + k.hcnsDatViTri.status);
ok('Admin backup tự phong Admin → CHẶN', k.abTuAdmin.status === 403, 'status ' + k.abTuAdmin.status);
ok('Admin backup trao vị trí có lương → CHẶN', k.abTraoLuong.status === 403, 'status ' + k.abTraoLuong.status);
ok('Admin backup tự sửa vị trí của CHÍNH MÌNH → CHẶN', k.abTuSuaViTri.status === 403,
   'status ' + k.abTuSuaViTri.status);
ok('Admin backup tạo tài khoản kèm vị trí có lương → CHẶN', k.abTaoTkViTriLuong.status === 403,
   'status ' + k.abTaoTkViTriLuong.status);
ok('Admin backup VẪN đặt được vị trí thường cho người khác', k.abDatViTriNguoiKhac.status === 200,
   'status ' + k.abDatViTriNguoiKhac.status);
ok('Nhân viên thường không đụng được gì', k.nvSua.status === 403, 'status ' + k.nvSua.status);
ok('Cửa API KHÔNG cho GHI vị trí công việc vào ô 1', k.o1NhanViTri.status === 400,
   'status ' + k.o1NhanViTri.status);
ok('Admin thật đặt được CẢ HAI ô trong một lần bấm',
   k.adminSuaHai.status === 200 && k.duySauCung.vai_tro === 'admin_backup' &&
   k.duySauCung.vi_tri_cong_viec === 'quan_ly_kho');
ok('Admin thật sửa được ô của chính mình', k.adminTuSua.status === 200, 'status ' + k.adminTuSua.status);

console.log('\n— ④ GHI VẾT —');
ok('Mỗi cú đổi thật để lại đúng một dòng nhật ký', k.soDongVet === 4, `${k.soDongVet} dòng`);
ok('Dòng nhật ký có ĐỦ cũ → mới → ai đổi',
   !!k.dongVetDuy && !!k.dongVetDuy.gia_tri_cu && !!k.dongVetDuy.gia_tri_moi &&
   k.dongVetDuy.nguoi_thuc_hien_id === 'SEP',
   k.dongVetDuy ? `"${k.dongVetDuy.gia_tri_cu}" → "${k.dongVetDuy.gia_tri_moi}" bởi ${k.dongVetDuy.nguoi_thuc_hien_id}` : 'không có dòng nào');

console.log('\n— TRIỆU CHỨNG GỐC: ba người mở được tab của mình chưa? —');
ok('Anh Phạm Khương Duy mở được tab Kho vận',
   (k.duyToiLaAi.than?.quyen || []).includes('khovan') && k.duyKhoVan.status === 200);
ok('Chị Phan Thị Hằng mở được tab Kế toán', (k.hangToiLaAi.than?.quyen || []).includes('ketoan'));
ok('Chị Nguyễn Thị Huyền mở được tab Kinh doanh', (k.huyenToiLaAi.than?.quyen || []).includes('kinhdoanh'));
ok('Vẫn giấu được tài khoản test khỏi danh bạ khi nv_test nằm ở ô 2', !k.danhBaCoTest);

/* ==========================================================================
   CA ĐỐI CHỨNG — bàn đo phải TỰ CHỨNG MINH LÀ CÓ MẮT (BH-16)
   ========================================================================== */
console.log('\n=== CA ĐỐI CHỨNG (làm hỏng src cố ý — bàn đo PHẢI bắt được) ====\n');

const DC = [
  ['A', 'ô 2 nhận cả vai trò hệ thống (HCNS tự phong Admin)',
    (f, s) => f !== 'quyen.js' ? s :
      s.replace('if (o2 && NHOM_VI_TRI.has(o2) && o2 !== o1) ra.push(o2);', 'if (o2 && o2 !== o1) ra.push(o2);'),
    async (t) => {
      const q = await napQuyen(t);
      return q.laAdmin({ vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'admin' });
    }],
  ['B', 'bỏ chốt "không tự sửa ô của chính mình"',
    (f, s) => f !== 'index.js' ? s :
      s.replace('if (tk.nhan_su_id === phien.nhan_su_id && !laAdmin(phien)) {', 'if (false) {'),
    async (t) => {
      const kk = await doCuaAPI(t);
      return kk.hcnsTuKTT.status === 200 || kk.abTuSuaViTri.status === 200;
    }],
  ['C', 'bỏ chốt "chỉ Admin trao vị trí có lương"',
    (f, s) => f !== 'index.js' ? s :
      s.replace(/if \(viTriMoi && !laAdmin\(phien\) && viTriCoXemLuong\(viTriMoi\)\) \{/,
                'if (false) {'),
    async (t) => { const kk = await doCuaAPI(t); return kk.hcnsTraoLuong.status === 200; }],
  ['D', 'phép HỢP biến thành phép GIAO (mất quyền sau chuyển đổi)',
    (f, s) => f !== 'quyen.js' ? s :
      s.replace('for (const t of q.tab) co.add(t);',
                'if (co.size === 0) { for (const t of q.tab) co.add(t); } else { for (const t of [...co]) if (!q.tab.includes(t)) co.delete(t); }'),
    async (t) => (await doTruocBangSau(t)).length > 0],
  ['E', 'ô 1 nhận cả vị trí công việc (dựng lại đúng lỗi cũ)',
    (f, s) => f !== 'index.js' ? s :
      s.replace("if (!laVaiTroHeThong(vaiTroMoi)) return loi('Vai trò hệ thống không hợp lệ');",
                "if (!VAI_TRO_HOP_LE.includes(vaiTroMoi)) return loi('Vai trò không hợp lệ');"),
    async (t) => { const kk = await doCuaAPI(t); return kk.o1NhanViTri.status === 200; }],
  ['F', 'đọc phiên không phòng thủ (thiếu cột là 500 cả hệ thống)',
    (f, s) => f !== 'auth.js' ? s :
      s.replace("if (!/no such column/i.test(tin)) throw e;", 'throw e;'),
    async (t) => {
      try { const r = await doThieuCot(t); return r.toiLaAi.status >= 500; }
      catch { return true; }
    }],
  ['G', 'danh bạ chỉ soi ô 1 (tài khoản test lòi ra)',
    (f, s) => f !== 'index.js' ? s :
      s.replace(/\$\{coViTri \? "AND \(t\.vi_tri_cong_viec IS NULL OR t\.vi_tri_cong_viec != 'nv_test'\)" : ''\}/, ''),
    async (t) => (await doCuaAPI(t)).danhBaCoTest],
  ['H', 'cron nhắc nhân sự chỉ soi ô 1 (chị Hương mất hết tin nhắc)',
    (f, s) => f !== 'nhac-nhan-su.js' ? s :
      s.replace("${coViTri ? \"OR t.vi_tri_cong_viec = 'hcns'\" : ''}", ''),
    async (t) => {
      const { db, d1 } = dungDB();
      moi(db, { HUONG: 'hcns' });
      const url = pathToFileURL(path.join(t, 'nhac-nhan-su.js')).href + `?v=${Math.random()}`;
      const m = await import(url);
      if (!m.nguoiNhanHCNS) return null;      // không xuất ra thì bỏ qua ca này
      const ds = await m.nguoiNhanHCNS(dungEnv(d1));
      return !ds.includes('HUONG');
    }]
];

for (const [ma, ten, sua, chay] of DC) {
  const thuMuc = banSrcHong(ma, sua);
  let bat = false, ghiChu = '';
  try { const r = await chay(thuMuc); if (r === null) { ghiChu = 'bỏ qua'; bat = null; } else bat = !!r; }
  catch (e) { bat = true; ghiChu = 'ném lỗi: ' + String(e.message).slice(0, 60); }
  rmSync(thuMuc, { recursive: true, force: true });
  if (bat === null) console.log(`  ⏭️  DC-${ma} ${ten} — ${ghiChu}`);
  else ok(`DC-${ma} ${ten}`, bat, bat ? 'bàn đo BẮT ĐƯỢC' + (ghiChu ? ' (' + ghiChu + ')' : '') : 'LỌT — bàn đo mù chỗ này');
}

process.exit(tongKet() ? 0 : 1);
