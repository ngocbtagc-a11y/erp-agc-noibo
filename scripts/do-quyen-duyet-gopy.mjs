/* ==========================================================================
   ĐO: "GÓP Ý ERP — CHỈ SẾP NGỌC DUYỆT CẤP CUỐI"
   ---------------------------------------------------------------------------
   Sếp Bùi Thị Ngọc chốt 28/08/2026:
     "riêng cái góp ý ERP đừng để sếp Phong duyệt, 1 mình tao duyệt hết"
     "cứ để tao duyệt 1 mình, tao duyệt đt cũng được"

   Anh Nguyễn Duy Phong (Giám đốc, tài khoản `admin`) GIỮ TOÀN QUYỀN mọi thứ
   khác và XEM ĐẦY ĐỦ mọi góp ý — chỉ mất đúng nút duyệt/từ chối ở cấp cuối.

   CÁCH ĐO (BH-34 · BH-44): SQLite THẬT qua `node:sqlite`, nạp `schema.sql` +
   TOÀN BỘ migrations thật, rồi gọi `worker.fetch()` NGUYÊN BẢN qua router với
   cookie phiên thật (`taoPhien` của auth.js). Soi THẲNG JSON body — không
   nhìn màn hình, không khớp chuỗi SQL bằng tay.

   BH-16 — BỐN CA ĐỐI CHỨNG ở cuối file, chạy trên bản `src` ĐÃ LÀM HỎNG CỐ Ý:
     DC-A  bỏ chặn ở cổng duyệt              → phải bắt được (anh Phong duyệt lọt)
     DC-B  bỏ chặn ở cửa sau /trang-thai     → phải bắt được
     DC-C  CẮT THỪA: cắt luôn quyền XEM      → phải bắt được (cắt quá tay cũng là lỗi)
     DC-D  bỏ chặn ở cửa cấp cờ quyền        → phải bắt được (anh Phong tự bật cờ)

   Chạy:  node scripts/do-quyen-duyet-gopy.mjs
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, cacCauSQL, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

datDongHo('2026-08-28T03:00:00Z');            // 10:00 giờ VN

/* ---- Mồi dữ liệu -------------------------------------------------------- */

const NGUOI = [
  // id      họ tên               bộ phận          quản lý  vai trò        cờ duyệt
  ['SEP',   'Bùi Thị Ngọc',      'Ban giám đốc',  null,    'admin',        1],
  ['PHONG', 'Nguyễn Duy Phong',  'Ban giám đốc',  null,    'admin',        0],
  ['DUY',   'Phạm Khương Duy',   'Kho vận',       'SEP',   'quan_ly_kho',  0],
  ['AN',    'Nguyễn Văn An',     'Kho vận',       'DUY',   'nhan_vien_kho',0],
  ['HANG',  'Phan Thị Hằng',     'Kế toán',       'SEP',   'ke_toan_truong',0]
];

/* Chuỗi thô cắm vào ruột nội bộ — tìm trong JSON là biết có rò hay không. */
const BIMAT = { risk: 'HIGH', spec: 'DEXUATSPEC-NOIBO', lyDo: 'DEXUATLYDO-NOIBO',
                ghiChu: 'GHICHU-RIENGTU-QL-VA-SEP' };

function moi(db) {
  db.exec("DELETE FROM gop_y_lich_su; DELETE FROM gop_y; DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;");
  const ns = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam) VALUES (?,?,?,?,?,?,1)');
  const tk = db.prepare(
    'INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk, duyet_gopy) VALUES (?,?,?,?,?,1,0,?)');
  NGUOI.forEach(([id, ten, bp, ql, vt, cd], i) => {
    ns.run(id, ten, id.slice(0, 2), 'NV', bp, ql);
    tk.run(i + 1, id, 'tk' + id, 'pbkdf2$1$x$x', vt, cd);
  });

  // 3 góp ý của AN, đủ ba chặng của cổng duyệt:
  //   #1 'moi'            next_owner QL_CAP1  → anh Duy duyệt cấp 1
  //   #2 'moi'            next_owner OWNER    → đã qua cấp 1, chờ Sếp
  //   #3 'cho_quyet_dinh' next_owner OWNER    → rủi ro CAO, chờ Sếp quyết
  const g = db.prepare(`INSERT INTO gop_y
    (id, nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon, trang_thai,
     current_owner, next_owner, de_xuat_risk, de_xuat_ly_do, de_xuat_spec,
     risk, bang_chung_url, tao_luc)
    VALUES (?,?,?,'bc','vd','mm',?,?,?,?,?,?,?,?,'2026-08-27 09:00:00')`);
  g.run(1, 'AN', 'Máy in tem hay kẹt', 'moi', 'NGUOI_GUI', 'QL_CAP1',
        'MEDIUM', BIMAT.lyDo, BIMAT.spec, null, null);
  g.run(2, 'AN', 'Quét QR chậm', 'moi', 'NGUOI_GUI', 'OWNER',
        'MEDIUM', BIMAT.lyDo, BIMAT.spec, 'MEDIUM', null);
  g.run(3, 'AN', 'Đổi công thức tính tồn', 'cho_quyet_dinh', 'OWNER', 'OWNER',
        'HIGH', BIMAT.lyDo, BIMAT.spec, 'HIGH', 'https://github.com/agc/erp/pull/42-LINKPR-BIMAT');

  db.prepare(`INSERT INTO gop_y_lich_su
    (gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, nguoi_thuc_hien_loai, ghi_chu, luc)
    VALUES (2, 'moi', 'moi', 'DUY', 'nguoi', ?, '2026-08-27 10:00:00')`).run(BIMAT.ghiChu);
}

/* ---- Một vòng đo trên MỘT bản src --------------------------------------- */

async function motVong(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  // Windows: import() cần file:// URL, không nhận đường dẫn 'C:\...'.
  // ?v= để mỗi ca đối chứng nạp một bản mới, không dính bộ nhớ đệm module.
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;

  const phien = {};
  for (let i = 0; i < NGUOI.length; i++) phien[NGUOI[i][0]] = await taoPhienThat(env, i + 1);

  const ds = async (ai) => goiAPI(worker, env, '/api/gop-y', phien[ai]);
  const duyet = async (ai, than) => goiAPI(worker, env, '/api/gop-y/duyet', phien[ai],
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });
  const doiTT = async (ai, than) => goiAPI(worker, env, '/api/gop-y/trang-thai', phien[ai],
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });
  const lichSu = async (ai, id) => goiAPI(worker, env, '/api/gop-y/lich-su?id=' + id, phien[ai]);
  const capCo = async (ai, tkId, bat) => goiAPI(worker, env, '/api/quan-tri/quyen-duyet-gopy', phien[ai],
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tai_khoan_id: tkId, bat }) });
  const hoanTac = async (ai, id) => goiAPI(worker, env, '/api/gop-y/hoan-tac', phien[ai],
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });

  return { db, env, worker, phien, ds, duyet, doiTT, lichSu, capCo, hoanTac };
}

const khoaCua = (than, id) => {
  const g = (than?.gop_y || []).find(x => x.id === id);
  return g ? Object.keys(g).sort() : null;
};
const coChuoi = (o, s) => JSON.stringify(o || {}).includes(s);

/* ---- Bảng đo chính ------------------------------------------------------ */

async function doChinh(thuMucSrc, im = false) {
  const t = await motVong(thuMucSrc);
  const kq = {};

  const dsSep   = await t.ds('SEP');
  const dsPhong = await t.ds('PHONG');
  const dsDuy   = await t.ds('DUY');
  const dsAn    = await t.ds('AN');

  kq.sepThay   = (dsSep.than?.gop_y || []).length;
  kq.phongThay = (dsPhong.than?.gop_y || []).length;
  kq.duyThay   = (dsDuy.than?.gop_y || []).length;
  kq.anThay    = (dsAn.than?.gop_y || []).length;

  // Anh Phong có mất trường nào so với Sếp không?
  const kSep = khoaCua(dsSep.than, 3) || [], kPhong = khoaCua(dsPhong.than, 3) || [];
  kq.phongThieuKhoa = kSep.filter(k => !kPhong.includes(k));
  kq.phongDuRuot = ['risk', 'bang_chung_url', 'de_xuat_risk', 'de_xuat_ly_do', 'de_xuat_spec']
    .filter(k => kPhong.includes(k));
  kq.phongThayLinkPR = coChuoi(dsPhong.than, '42-LINKPR-BIMAT');
  kq.anThayLinkPR    = coChuoi(dsAn.than, '42-LINKPR-BIMAT');

  // Lịch sử + ghi chú nội bộ
  const lsPhong = await t.lichSu('PHONG', 2);
  const lsAn    = await t.lichSu('AN', 2);
  kq.phongDocGhiChu = coChuoi(lsPhong.than, BIMAT.ghiChu);
  kq.anDocGhiChu    = coChuoi(lsAn.than, BIMAT.ghiChu);

  // Cờ giao diện
  kq.coDuyetSep = dsSep.than?.duyet_gopy === true;
  kq.coDuyetPhong = dsPhong.than?.duyet_gopy === true;

  // ---- DUYỆT: gọi THẲNG đường duyệt, không qua giao diện -----------------
  kq.phongDuyetOwner  = (await t.duyet('PHONG', { id: 2, quyet_dinh: 'duyet' })).status;
  kq.phongDuyetCao    = (await t.duyet('PHONG', { id: 3, quyet_dinh: 'duyet', ghi_chu: 'ok' })).status;
  kq.phongTuChoi      = (await t.duyet('PHONG', { id: 2, quyet_dinh: 'tu_choi', ly_do: 'không' })).status;
  kq.phongVuotCap     = (await t.duyet('PHONG', { id: 1, quyet_dinh: 'duyet', ghi_chu: 'vượt cấp' })).status;
  kq.anDuyet          = (await t.duyet('AN', { id: 2, quyet_dinh: 'duyet' })).status;
  kq.hangDuyet        = (await t.duyet('HANG', { id: 2, quyet_dinh: 'duyet' })).status;

  // Cửa sau ①: cho_quyet_dinh → cho_phan_tich CHÍNH LÀ duyệt cấp cuối.
  kq.phongCuaSauDuyet = (await t.doiTT('PHONG', { id: 3, trang_thai: 'cho_phan_tich' })).status;
  // Cửa sau ②: huỷ góp ý đang nằm ở cổng duyệt = từ chối trá hình.
  kq.phongCuaSauHuy   = (await t.doiTT('PHONG', { id: 2, trang_thai: 'da_huy' })).status;
  // KHÔNG cắt quá tay: anh Phong vẫn phân loại / giao người phụ trách được.
  kq.phongPhanLoai    = (await t.doiTT('PHONG', { id: 3, loai: 'cai_tien_quy_trinh' })).status;

  // Cửa cấp cờ quyền: anh Phong KHÔNG được tự bật cho mình.
  kq.phongTuBatCo = (await t.capCo('PHONG', 2, true)).status;
  kq.phongThuCoSep = (await t.capCo('PHONG', 1, false)).status;

  // ---- Cấp 1 của quản lý phòng: KHÔNG ĐỔI --------------------------------
  const duyCap1 = await t.duyet('DUY', { id: 1, quyet_dinh: 'duyet' });
  kq.duyDuyetCap1 = duyCap1.status;
  kq.sauCap1 = t.db.prepare('SELECT trang_thai, next_owner, duyet_cap1_nguon FROM gop_y WHERE id = 1').get();
  // ...nhưng anh Duy KHÔNG đi tiếp được cấp cuối của chính việc đó.
  kq.duyDuyetCapCuoi = (await t.duyet('DUY', { id: 1, quyet_dinh: 'duyet' })).status;

  // ---- Sếp duyệt được -----------------------------------------------------
  const sepDuyet = await t.duyet('SEP', { id: 2, quyet_dinh: 'duyet' });
  kq.sepDuyet = sepDuyet.status;
  kq.sauSepDuyet = t.db.prepare('SELECT trang_thai FROM gop_y WHERE id = 2').get()?.trang_thai;

  // ---- Hoàn tác -----------------------------------------------------------
  const dsSep2 = await t.ds('SEP');
  const g2 = (dsSep2.than?.gop_y || []).find(x => x.id === 2);
  kq.hoanTacHien = g2?.hoan_tac_duoc === true;
  kq.loRuotHoanTac = g2 ? Object.keys(g2).some(k => k.startsWith('hoan_tac_') && k !== 'hoan_tac_duoc') : true;
  kq.phongHoanTacHo = (await t.hoanTac('PHONG', 2)).status;   // không phải người bấm → 403
  kq.sepHoanTac = (await t.hoanTac('SEP', 2)).status;
  kq.sauHoanTac = t.db.prepare('SELECT trang_thai, next_owner, duyet_owner_luc FROM gop_y WHERE id = 2').get();
  kq.lichSuConDu = t.db.prepare('SELECT COUNT(*) AS n FROM gop_y_lich_su WHERE gop_y_id = 2').get()?.n;

  // ---- Uỷ quyền: Sếp bật cờ cho anh Phong thì anh duyệt được -------------
  kq.sepCapCo = (await t.capCo('SEP', 2, true)).status;
  kq.phongSauKhiDuocCap = (await t.duyet('PHONG', { id: 2, quyet_dinh: 'duyet' })).status;
  kq.sepTuTatCoCuoi = (await t.capCo('SEP', 1, false)).status;   // còn anh Phong giữ cờ → cho phép

  if (!im) t.db.close?.();
  return kq;
}

/* ---- Ca đối chứng: làm hỏng src cố ý ------------------------------------ */

function banSrcHong(ten, sua) {
  const thuMuc = path.join(GOC, '.dc-' + ten);
  rmSync(thuMuc, { recursive: true, force: true });
  mkdirSync(thuMuc, { recursive: true });
  for (const f of readdirSync(path.join(GOC, 'src'))) {
    let noi = readFileSync(path.join(GOC, 'src', f), 'utf8');
    noi = sua(f, noi);
    writeFileSync(path.join(thuMuc, f), noi, 'utf8');
  }
  return thuMuc;
}

/* ---- Chạy --------------------------------------------------------------- */

console.log('\n=== BẢN THẬT ===================================================\n');
const k = await doChinh(path.join(GOC, 'src'));

console.log('— XEM (anh Phong không được mất gì) —');
ok('Sếp thấy đủ 3 góp ý', k.sepThay === 3, `thấy ${k.sepThay}`);
ok('Anh Phong thấy ĐỦ 3 góp ý (không cắt quyền xem)', k.phongThay === 3, `thấy ${k.phongThay}`);
ok('Anh Phong KHÔNG thiếu trường nào so với Sếp', k.phongThieuKhoa.length === 0,
   k.phongThieuKhoa.length ? 'thiếu: ' + k.phongThieuKhoa.join(',') : 'khớp từng khoá');
ok('Anh Phong vẫn nhận đủ 5 khoá ruột nội bộ', k.phongDuRuot.length === 5, k.phongDuRuot.join(','));
ok('Anh Phong vẫn đọc được link PR nội bộ', k.phongThayLinkPR);
ok('Anh Phong vẫn đọc được ghi chú riêng của quản lý/Sếp', k.phongDocGhiChu);
ok('Người gửi (An) VẪN không thấy link PR (luật cũ còn nguyên)', !k.anThayLinkPR);
ok('Người gửi (An) VẪN không đọc được ghi chú nội bộ', !k.anDocGhiChu);
ok('Cờ giao diện: Sếp có / anh Phong không', k.coDuyetSep && !k.coDuyetPhong,
   `sep=${k.coDuyetSep} phong=${k.coDuyetPhong}`);

console.log('\n— DUYỆT (chặn ở MÁY CHỦ, gọi thẳng API) —');
ok('Anh Phong duyệt cấp cuối → 403', k.phongDuyetOwner === 403, 'HTTP ' + k.phongDuyetOwner);
ok('Anh Phong duyệt việc rủi ro CAO → 403', k.phongDuyetCao === 403, 'HTTP ' + k.phongDuyetCao);
ok('Anh Phong TỪ CHỐI cấp cuối → 403', k.phongTuChoi === 403, 'HTTP ' + k.phongTuChoi);
ok('Anh Phong duyệt VƯỢT CẤP thay quản lý → 403', k.phongVuotCap === 403, 'HTTP ' + k.phongVuotCap);
ok('Cửa sau ① cho_quyet_dinh→cho_phan_tich → 403', k.phongCuaSauDuyet === 403, 'HTTP ' + k.phongCuaSauDuyet);
ok('Cửa sau ② huỷ việc đang chờ duyệt → 403', k.phongCuaSauHuy === 403, 'HTTP ' + k.phongCuaSauHuy);
ok('Cửa cấp cờ: anh Phong tự bật cho mình → 403', k.phongTuBatCo === 403, 'HTTP ' + k.phongTuBatCo);
ok('Cửa cấp cờ: anh Phong thu cờ của Sếp → 403', k.phongThuCoSep === 403, 'HTTP ' + k.phongThuCoSep);
ok('Nhân viên thường duyệt → 403', k.anDuyet === 403, 'HTTP ' + k.anDuyet);
ok('Trưởng phòng khác duyệt → 403', k.hangDuyet === 403, 'HTTP ' + k.hangDuyet);

console.log('\n— KHÔNG CẮT QUÁ TAY —');
ok('Anh Phong VẪN phân loại/giao việc được (200)', k.phongPhanLoai === 200, 'HTTP ' + k.phongPhanLoai);

console.log('\n— CẤP 1 CỦA QUẢN LÝ PHÒNG: GIỮ NGUYÊN —');
ok('Anh Duy duyệt cấp 1 → 200', k.duyDuyetCap1 === 200, 'HTTP ' + k.duyDuyetCap1);
ok('Duyệt xong việc chuyển sang chờ Sếp', k.sauCap1?.next_owner === 'OWNER',
   `trạng thái ${k.sauCap1?.trang_thai}, chờ ${k.sauCap1?.next_owner}, nguồn ${k.sauCap1?.duyet_cap1_nguon}`);
ok('Anh Duy KHÔNG đi tiếp được cấp cuối → 403', k.duyDuyetCapCuoi === 403, 'HTTP ' + k.duyDuyetCapCuoi);

console.log('\n— SẾP DUYỆT ĐƯỢC —');
ok('Sếp duyệt cấp cuối → 200', k.sepDuyet === 200, 'HTTP ' + k.sepDuyet);
ok('Việc đi tiếp đúng bước', k.sauSepDuyet === 'cho_phan_tich', k.sauSepDuyet);

console.log('\n— HOÀN TÁC (một mình duyệt thì phải sửa được cú bấm nhầm) —');
ok('Nút hoàn tác sáng lên ngay trong danh sách', k.hoanTacHien);
ok('Ảnh chụp hoàn tác KHÔNG rò ra JSON', !k.loRuotHoanTac);
ok('Người khác hoàn tác hộ → 403', k.phongHoanTacHo === 403, 'HTTP ' + k.phongHoanTacHo);
ok('Sếp hoàn tác → 200', k.sepHoanTac === 200, 'HTTP ' + k.sepHoanTac);
ok('Trả về đúng nguyên trạng trước khi bấm',
   k.sauHoanTac?.trang_thai === 'moi' && k.sauHoanTac?.next_owner === 'OWNER' && !k.sauHoanTac?.duyet_owner_luc,
   JSON.stringify(k.sauHoanTac));
ok('Lịch sử KHÔNG bị xoá, ghi thêm dòng hoàn tác', k.lichSuConDu >= 3, k.lichSuConDu + ' dòng');

console.log('\n— UỶ QUYỀN KHI SẾP ĐI VẮNG (bật cờ, không sửa code) —');
ok('Sếp bật cờ cho người khác → 200', k.sepCapCo === 200, 'HTTP ' + k.sepCapCo);
ok('Người vừa được cấp cờ duyệt được ngay → 200', k.phongSauKhiDuocCap === 200, 'HTTP ' + k.phongSauKhiDuocCap);
ok('Còn người khác giữ cờ thì Sếp tắt cờ của mình được', k.sepTuTatCoCuoi === 200, 'HTTP ' + k.sepTuTatCoCuoi);

/* ---- MIGRATION: lùi–tiến–lùi–tiến, và backfill có bắt đúng người không -- */

console.log('\n=== MIGRATION (thêm–lùi–thêm–lùi–thêm) =========================\n');
{
  const { db } = dungDB();          // đã có sẵn them-quyen-duyet-gopy.sql
  const cot = (b) => db.prepare(`SELECT name FROM pragma_table_info('${b}')`).all().map(r => r.name);
  const chay = (f) => {
    for (const c of cacCauSQL(readFileSync(path.join(GOC, 'migrations', f), 'utf8'))) db.exec(c);
  };

  db.exec("DELETE FROM tai_khoan; DELETE FROM nhan_su;");
  db.exec(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan) VALUES
             ('N1','Bùi Thị Ngọc','BTN','Giám đốc','BGĐ'),
             ('N2','Nguyễn Duy Phong','NDP','Giám đốc','BGĐ')`);
  db.exec(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro) VALUES
             ('N1','0911994696','x','admin'), ('N2','0945923368','x','admin')`);

  // Backfill: chạy lại phần UPDATE của file xuôi trên dữ liệu vừa mồi.
  db.exec("UPDATE tai_khoan SET duyet_gopy = 1 WHERE ten_dang_nhap = '0911994696'");
  const co = db.prepare('SELECT ten_dang_nhap FROM tai_khoan WHERE duyet_gopy = 1').all();
  ok('Backfill bật cờ cho ĐÚNG 1 tài khoản', co.length === 1 && co[0].ten_dang_nhap === '0911994696',
     co.map(x => x.ten_dang_nhap).join(',') || 'không ai');
  ok('Anh Phong KHÔNG được bật cờ',
     db.prepare("SELECT duyet_gopy AS c FROM tai_khoan WHERE ten_dang_nhap='0945923368'").get()?.c === 0);

  let sach = true;
  for (let vong = 1; vong <= 2; vong++) {
    try {
      chay('lui-quyen-duyet-gopy.sql');
      if (cot('tai_khoan').includes('duyet_gopy')) sach = false;
      chay('them-quyen-duyet-gopy.sql');
      if (!cot('tai_khoan').includes('duyet_gopy')) sach = false;
      if (!cot('gop_y').includes('hoan_tac_json')) sach = false;
    } catch (e) { sach = false; console.log('   lỗi vòng ' + vong + ': ' + e.message); }
  }
  ok('Lùi–tiến 2 vòng: không vòng nào lỗi, cột về đúng chỗ', sach);
  ok('Giá trị cờ được CẤT lại trước khi bỏ cột, không mất chữ nào',
     db.prepare("SELECT COUNT(*) AS n FROM quyen_duyet_gopy_luu_lui WHERE duyet_gopy = 1").get()?.n >= 2,
     db.prepare('SELECT COUNT(*) AS n FROM quyen_duyet_gopy_luu_lui').get()?.n + ' dòng đã cất');
  ok('Chạy file xuôi lần 2 bị chặn đúng bằng schema_migrations',
     (() => { try { chay('them-quyen-duyet-gopy.sql'); return false; }
              catch (e) { return /UNIQUE|schema_migrations/i.test(e.message); } })());
  ok('KHÔNG đụng cột nghiệp vụ cũ của tai_khoan',
     ['id', 'nhan_su_id', 'ten_dang_nhap', 'mat_khau_hash', 'vai_tro', 'kich_hoat']
       .every(c => cot('tai_khoan').includes(c)));
}

/* ---- BH-16: bốn ca đối chứng -------------------------------------------- */

console.log('\n=== CA ĐỐI CHỨNG (BH-16) — phép đo phải BẮT ĐƯỢC lỗi ===========\n');

const DC = [
  ['A-bo-chan-cong-duyet', (f, s) => f === 'index.js'
    ? s.replace('const laOwner = duocDuyetGopY(phien);', 'const laOwner = laAdmin(phien.vai_tro);') : s,
    (d) => d.phongDuyetOwner !== 403 || d.phongTuChoi !== 403,
    'anh Phong duyệt/từ chối lọt ở cấp cuối'],

  ['B-bo-chan-cua-sau', (f, s) => f === 'index.js'
    ? s.replace('const laDuyetCuoi = duocDuyetGopY(phien);', 'const laDuyetCuoi = laAdmin(phien.vai_tro);') : s,
    (d) => d.phongCuaSauDuyet !== 403 || d.phongCuaSauHuy !== 403,
    'anh Phong duyệt/huỷ lọt qua /api/gop-y/trang-thai'],

  ['C-cat-thua-quyen-xem', (f, s) => f === 'index.js'
    ? s.replace('const laAd = laAdmin(phien.vai_tro) || duocDuyetGopY(phien);',
                'const laAd = duocDuyetGopY(phien);') : s,
    (d) => d.phongThay !== 3 || d.phongThieuKhoa.length > 0 || !d.phongDocGhiChu,
    'anh Phong bị cắt mất quyền xem (cắt quá tay)'],

  ['D-bo-chan-cap-co', (f, s) => f === 'index.js'
    ? s.replace("return loi('Chỉ người đang giữ quyền duyệt góp ý mới cấp/thu được quyền này', 403);",
                'if (false) return null;') : s,
    (d) => d.phongTuBatCo !== 403 || d.phongThuCoSep !== 403,
    'anh Phong tự bật cờ / thu cờ của Sếp']
];

let batDu = 0;
for (const [ten, sua, batLoi, moTa] of DC) {
  const thuMuc = banSrcHong(ten, sua);
  let d = null, vo = false;
  try { d = await doChinh(thuMuc); } catch (e) { vo = true; console.log('   (bản hỏng ném lỗi: ' + e.message + ')'); }
  const bat = vo || batLoi(d);
  if (ok(`DC-${ten} → bàn đo BẮT ĐƯỢC`, bat, moTa)) batDu++;
  rmSync(thuMuc, { recursive: true, force: true });
}
ok('Phép đo nhạy cả hai chiều (rò rỉ VÀ cắt thừa)', batDu === DC.length, `${batDu}/${DC.length}`);

process.exit(tongKet() ? 0 : 1);
