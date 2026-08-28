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

   BH-16 — MƯỜI CA ĐỐI CHỨNG ở cuối file, chạy trên bản `src` ĐÃ LÀM HỎNG CỐ Ý:
     DC-A  bỏ chặn ở cổng duyệt              → phải bắt được (anh Phong duyệt lọt)
     DC-B  bỏ chặn ở cửa sau /trang-thai     → phải bắt được
     DC-C  CẮT THỪA: cắt luôn quyền XEM      → phải bắt được (cắt quá tay cũng là lỗi)
     DC-D  bỏ chặn ở cửa cấp cờ quyền        → phải bắt được (anh Phong tự bật cờ)
     DC-E  bỏ chặn "Chặn" ở cổng duyệt       → REV-0027 L1
     DC-F  "lưu tại chỗ" ghi đè next_owner   → REV-0027 L2 (+ cửa thứ sáu: gỡ chặn)
     DC-G  bỏ chặn 4 cửa quản trị            → REV-0027 L3 + cửa thứ năm
     DC-H  đọc phiên không phòng thủ         → REV-0027 L4
     DC-I  vẫn bắt người gửi tự duyệt        → Việc 7
     DC-K  bỏ qua cổng cho CẢ nhân viên      → Việc 7, chiều cắt quá tay

   BÀN ĐO CŨ (45 ĐẠT / 0 TRƯỢT) KHÔNG BẮT ĐƯỢC L1/L2/L3 — bàn đo xanh mà lỗi
   vẫn còn thì bàn đo là thứ đầu tiên phải sửa (BH-45). Bản này 89 phép; chấm
   lại cây cũ `2e5084d` bằng chính nó ra 64 ĐẠT / 25 TRƯỢT:
     GOPY_SRC=<thư mục src cũ> node scripts/do-quyen-duyet-gopy.mjs

   Chạy:  node scripts/do-quyen-duyet-gopy.mjs
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, cacCauSQL, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Bàn đo chạy được trên MỘT cây src bất kỳ — GOPY_SRC=<thư mục> để đo lại
   cây cũ và lấy số ĐO TRƯỚC (vd: git worktree ra 2e5084d rồi trỏ vào đó).
   Không đặt thì đo cây hiện tại. */
const SRC = process.env.GOPY_SRC ? path.resolve(process.env.GOPY_SRC) : path.join(GOC, 'src');

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

  // 7 góp ý của AN — đủ mọi chặng của cổng duyệt VÀ đủ ca cho ba lỗi REV-0027:
  //   #1 'moi'            next QL_CAP1 → anh Duy duyệt cấp 1
  //   #2 'moi'            next OWNER   → đã qua cấp 1, chờ Sếp
  //   #3 'cho_quyet_dinh' next OWNER   → rủi ro CAO, chờ Sếp quyết
  //   #4 'dang_lam'       next KHIDOT  → ĐÃ QUA cổng: chặn nó vẫn là việc vận hành
  //   #5 'moi'            next OWNER   → SLA ngày thứ 5 đã tự đẩy lên Sếp   (L1/L2)
  //   #6 'cho_quyet_dinh' next OWNER   → đo chặn NGAY TẠI cổng quyết định   (L1)
  //   #7 'moi'            next OWNER, gửi lại lần 3 → đã lên thẳng Sếp      (L2)
  const g = db.prepare(`INSERT INTO gop_y
    (id, nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon, trang_thai,
     current_owner, next_owner, de_xuat_risk, de_xuat_ly_do, de_xuat_spec,
     risk, bang_chung_url, so_lan_gui_lai, tao_luc)
    VALUES (?,?,?,'bc','vd','mm',?,?,?,?,?,?,?,?,?,'2026-08-27 09:00:00')`);
  g.run(1, 'AN', 'Máy in tem hay kẹt', 'moi', 'NGUOI_GUI', 'QL_CAP1',
        'MEDIUM', BIMAT.lyDo, BIMAT.spec, null, null, 0);
  g.run(2, 'AN', 'Quét QR chậm', 'moi', 'NGUOI_GUI', 'OWNER',
        'MEDIUM', BIMAT.lyDo, BIMAT.spec, 'MEDIUM', null, 0);
  g.run(3, 'AN', 'Đổi công thức tính tồn', 'cho_quyet_dinh', 'OWNER', 'OWNER',
        'HIGH', BIMAT.lyDo, BIMAT.spec, 'HIGH', 'https://github.com/agc/erp/pull/42-LINKPR-BIMAT', 0);
  g.run(4, 'AN', 'Gộp phiếu xuất theo đơn', 'dang_lam', 'KHIDOT', 'KHIDOT',
        'MEDIUM', BIMAT.lyDo, BIMAT.spec, 'MEDIUM', null, 0);
  g.run(5, 'AN', 'Cảnh báo hàng cận date', 'moi', 'NGUOI_GUI', 'OWNER',
        'MEDIUM', BIMAT.lyDo, BIMAT.spec, null, null, 0);
  g.run(6, 'AN', 'Đổi cách tính công', 'cho_quyet_dinh', 'OWNER', 'OWNER',
        'HIGH', BIMAT.lyDo, BIMAT.spec, 'HIGH', null, 0);
  g.run(7, 'AN', 'In tem theo lô', 'moi', 'NGUOI_GUI', 'OWNER',
        'MEDIUM', BIMAT.lyDo, BIMAT.spec, null, null, 3);

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

  const post = async (duong, ai, than) => goiAPI(worker, env, duong, phien[ai],
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });
  const get = async (duong, ai) => goiAPI(worker, env, duong, phien[ai]);
  const gui = async (ai, tieuDe) => post('/api/gop-y', ai,
    { tieu_de: tieuDe, boi_canh: 'bc', vuong_o_dau: 'vd', mong_muon: 'mm' });
  const dong = (id) => db.prepare(
    'SELECT trang_thai, current_owner, next_owner, so_lan_gui_lai, nguoi_phu_trach_id FROM gop_y WHERE id = ?').get(id);
  // Hàng chờ của Sếp: việc đang nằm ở cổng duyệt và đang chờ đúng Sếp.
  const hangCho = () => db.prepare(
    `SELECT COUNT(*) AS n FROM gop_y
      WHERE trang_thai IN ('moi', 'cho_quyet_dinh') AND next_owner = 'OWNER'`).get()?.n;

  return { db, env, worker, phien, ds, duyet, doiTT, lichSu, capCo, hoanTac, post, get, gui, dong, hangCho };
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

  /* ---- CỬA THỨ BA (REV-0027 L1) — "Chặn" việc đang nằm ở cổng duyệt ------
     Cùng loại với `da_huy`, chỉ khác tên: việc biến khỏi panel "Chờ tôi
     duyệt" vô thời hạn. Đo bằng ĐÚNG cái Sếp nhìn thấy: số việc còn trong
     hàng chờ trước và sau hai cú bấm. */
  kq.hangChoTruoc     = t.hangCho();
  kq.phongChanMoi     = (await t.doiTT('PHONG', { id: 5, trang_thai: 'bi_chan', ghi_chu: 'chặn' })).status;
  kq.phongChanQuyetDinh = (await t.doiTT('PHONG', { id: 6, trang_thai: 'bi_chan', ghi_chu: 'chặn' })).status;
  kq.hangChoSau       = t.hangCho();
  // Ca ngược — KHÔNG cắt quá tay: chặn việc ĐÃ QUA cổng vẫn là việc vận hành.
  kq.phongChanDangLam = (await t.doiTT('PHONG', { id: 4, trang_thai: 'bi_chan', ghi_chu: 'chờ nhà cung cấp trả lời' })).status;
  kq.sauChanDangLam   = t.dong(4)?.trang_thai;
  // Và Sếp thì chặn được việc đang ở cổng duyệt (quyền của người giữ cờ).
  kq.sepChanMoi       = (await t.doiTT('SEP', { id: 5, trang_thai: 'bi_chan', ghi_chu: 'trùng góp ý cũ' })).status;
  kq.sauSepChan       = t.dong(5)?.trang_thai;
  // CỬA THỨ SÁU (tự tìm) — chặn rồi gỡ chặn không được đánh rơi hàng chờ:
  // #5 đã được SLA đẩy lên Sếp, rã băng xong vẫn phải là việc của Sếp.
  kq.phongGoChan      = (await t.doiTT('PHONG', { id: 5, trang_thai: 'moi' })).status;
  kq.sauGoChan        = t.dong(5);

  /* ---- CỬA THỨ TƯ (REV-0027 L2) — "lưu tại chỗ" ghi đè next_owner --------
     Anh Phong CHỈ giao người phụ trách, không đổi trạng thái. Trước bản vá,
     hai việc đã lên tới Sếp (một do SLA ngày thứ 5, một do gửi lại lần 3)
     tụt về QL_CAP1 — 200, không cảnh báo, không có đường quay lại. */
  kq.phongGiaoViecSla  = (await t.doiTT('PHONG', { id: 5, nguoi_phu_trach_id: 'DUY' })).status;
  kq.sauGiaoViecSla    = t.dong(5);
  kq.phongGiaoViecLan3 = (await t.doiTT('PHONG', { id: 7, nguoi_phu_trach_id: 'DUY' })).status;
  kq.sauGiaoViecLan3   = t.dong(7);

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
  for (const f of readdirSync(SRC)) {
    let noi = readFileSync(path.join(SRC, f), 'utf8');
    noi = sua(f, noi);
    writeFileSync(path.join(thuMuc, f), noi, 'utf8');
  }
  return thuMuc;
}

/* ---- Chạy --------------------------------------------------------------- */

console.log('\n=== BẢN THẬT ===================================================\n');
const k = await doChinh(SRC);

console.log('— XEM (anh Phong không được mất gì) —');
ok('Sếp thấy đủ 7 góp ý', k.sepThay === 7, `thấy ${k.sepThay}`);
ok('Anh Phong thấy ĐỦ 7 góp ý (không cắt quyền xem)', k.phongThay === 7, `thấy ${k.phongThay}`);
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

console.log('\n— CỬA THỨ BA: "CHẶN" VIỆC ĐANG CHỜ DUYỆT (REV-0027 L1) —');
ok('Anh Phong chặn việc đang chờ Sếp (moi) → 403', k.phongChanMoi === 403, 'HTTP ' + k.phongChanMoi);
ok('Anh Phong chặn việc chờ quyết định (CAO) → 403', k.phongChanQuyetDinh === 403, 'HTTP ' + k.phongChanQuyetDinh);
ok('Hàng chờ của Sếp KHÔNG bị rút việc nào',
   k.hangChoTruoc === k.hangChoSau && k.hangChoTruoc === 5,
   `trước ${k.hangChoTruoc} → sau ${k.hangChoSau} việc`);
ok('Sếp VẪN chặn được việc đang ở cổng duyệt → 200',
   k.sepChanMoi === 200 && k.sauSepChan === 'bi_chan', `HTTP ${k.sepChanMoi} · ${k.sauSepChan}`);

console.log('\n— CỬA THỨ TƯ: "LƯU TẠI CHỖ" GHI ĐÈ NGƯỜI ĐANG CHỜ (REV-0027 L2) —');
ok('Giao người phụ trách KHÔNG kéo việc đã lên Sếp (SLA) về cổng 1',
   k.phongGiaoViecSla === 200 && k.sauGiaoViecSla?.next_owner === 'OWNER'
     && k.sauGiaoViecSla?.nguoi_phu_trach_id === 'DUY',
   `HTTP ${k.phongGiaoViecSla} · chờ ${k.sauGiaoViecSla?.next_owner} · giao ${k.sauGiaoViecSla?.nguoi_phu_trach_id}`);
ok('Giao người phụ trách KHÔNG kéo việc gửi lại lần 3 về cổng 1',
   k.phongGiaoViecLan3 === 200 && k.sauGiaoViecLan3?.next_owner === 'OWNER',
   `HTTP ${k.phongGiaoViecLan3} · chờ ${k.sauGiaoViecLan3?.next_owner}`);

console.log('\n— CỬA THỨ SÁU (tự tìm): CHẶN RỒI GỠ CHẶN LÀM RƠI HÀNG CHỜ —');
ok('Gỡ chặn trả việc về ĐÚNG người đang chờ trước đó (OWNER)',
   k.phongGoChan === 200 && k.sauGoChan?.trang_thai === 'moi' && k.sauGoChan?.next_owner === 'OWNER',
   `HTTP ${k.phongGoChan} · ${k.sauGoChan?.trang_thai} · chờ ${k.sauGoChan?.next_owner}`);

console.log('\n— KHÔNG CẮT QUÁ TAY —');
ok('Anh Phong VẪN phân loại/giao việc được (200)', k.phongPhanLoai === 200, 'HTTP ' + k.phongPhanLoai);
ok('Anh Phong VẪN chặn được việc ĐÃ QUA cổng (đang làm) → 200',
   k.phongChanDangLam === 200 && k.sauChanDangLam === 'bi_chan',
   `HTTP ${k.phongChanDangLam} · ${k.sauChanDangLam}`);

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

/* ==========================================================================
   BỐN CỬA QUẢN TRỊ CÓ THỂ TẮT NGƯỜI DUYỆT (REV-0027 L3 + cửa thứ năm)
   Mỗi cửa đo trên MỘT vòng riêng, DB sạch — cửa trước không được làm hỏng
   phép đo của cửa sau (trên bản chưa vá, cửa đầu tiên đã xoá mất người duyệt).
   ========================================================================== */

console.log('\n=== CỬA QUẢN TRỊ: NGƯỜI BỊ LẤY QUYỀN DUYỆT CÓ TẮT ĐƯỢC NGƯỜI DUYỆT? ===\n');

async function moiCua(thuMucSrc, chay) {
  const t = await motVong(thuMucSrc);
  const r = await chay(t);
  t.db.close?.();
  return r;
}
const conNguoiDuyet = (t) => t.db.prepare(
  'SELECT COUNT(*) AS n FROM tai_khoan WHERE duyet_gopy = 1 AND kich_hoat = 1').get()?.n;

async function doQuanTri(thuMucSrc) {
  const q = {};
  // ① khoá tài khoản Sếp
  Object.assign(q, await moiCua(thuMucSrc, async (t) => {
    const r = await t.post('/api/quan-tri/khoa-tai-khoan', 'PHONG', { tai_khoan_id: 1, kich_hoat: false });
    return { khoaSep: r.status, conSauKhoa: conNguoiDuyet(t),
             sepConGoiDuocAPI: (await t.get('/api/toi-la-ai', 'SEP')).status };
  }));
  // ② xoá tài khoản Sếp
  Object.assign(q, await moiCua(thuMucSrc, async (t) => {
    const r = await t.post('/api/quan-tri/xoa-tai-khoan', 'PHONG', { tai_khoan_id: 1 });
    return { xoaTkSep: r.status, conSauXoaTk: conNguoiDuyet(t) };
  }));
  // ③ xoá hồ sơ nhân sự của Sếp (xoá kèm tài khoản bên dưới — cửa 5a)
  Object.assign(q, await moiCua(thuMucSrc, async (t) => {
    const r = await t.post('/api/quan-tri/xoa-nhan-su', 'PHONG', { id: 'SEP' });
    return { xoaNsSep: r.status, conSauXoaNs: conNguoiDuyet(t) };
  }));
  // ④ đặt lại mật khẩu tài khoản Sếp → mượn danh tính mà duyệt (cửa 5b)
  Object.assign(q, await moiCua(thuMucSrc, async (t) => {
    const r = await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 });
    return { datLaiMkSep: r.status, loMatKhauSep: !!(r.than && r.than.mat_khau_tam) };
  }));
  // ⑤ ca ngược — KHÔNG cắt quá tay: người KHÔNG giữ cờ thì quản trị như cũ,
  //    và khi đã có người thay giữ cờ thì khoá tài khoản Sếp lại được.
  Object.assign(q, await moiCua(thuMucSrc, async (t) => {
    const khoaAn = await t.post('/api/quan-tri/khoa-tai-khoan', 'PHONG', { tai_khoan_id: 4, kich_hoat: false });
    const mkAn = await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 4 });
    const capCoPhong = await t.capCo('SEP', 2, true);
    const khoaSep2 = await t.post('/api/quan-tri/khoa-tai-khoan', 'PHONG', { tai_khoan_id: 1, kich_hoat: false });
    return { khoaAn: khoaAn.status, mkAn: mkAn.status, capCoPhong: capCoPhong.status,
             khoaSepSauUyQuyen: khoaSep2.status, conSauUyQuyen: conNguoiDuyet(t) };
  }));
  // ⑥ hai cửa gián tiếp còn lại — hạ vai trò Sếp và khoá hồ sơ nhân sự của
  //    Sếp. Cả hai KHÔNG phải lỗ hổng (cờ duyệt không đi theo vai trò, và
  //    docPhien không đọc trang_thai_dl) — nhưng phải ĐO mới được nói vậy.
  Object.assign(q, await moiCua(thuMucSrc, async (t) => {
    const haVaiTro = await t.post('/api/quan-tri/sua-vai-tro', 'PHONG',
      { tai_khoan_id: 1, vai_tro: 'nhan_vien_kho' });
    const khoaHoSo = await t.post('/api/quan-tri/khoa-nhan-su', 'PHONG',
      { id: 'SEP', trang_thai_dl: 'da_khoa' });
    return { haVaiTroSep: haVaiTro.status, khoaHoSoSep: khoaHoSo.status,
             sepVanDuyetDuoc: (await t.duyet('SEP', { id: 2, quyet_dinh: 'duyet' })).status };
  }));
  return q;
}

const q = await doQuanTri(SRC);
ok('Anh Phong KHOÁ tài khoản Sếp → 409', q.khoaSep === 409, 'HTTP ' + q.khoaSep);
ok('Sau đó VẪN còn đúng 1 người duyệt được, Sếp vẫn gọi được API',
   q.conSauKhoa === 1 && q.sepConGoiDuocAPI === 200,
   `${q.conSauKhoa} người duyệt · Sếp HTTP ${q.sepConGoiDuocAPI}`);
ok('Anh Phong XOÁ tài khoản Sếp → 409', q.xoaTkSep === 409, 'HTTP ' + q.xoaTkSep);
ok('Cờ duyệt KHÔNG biến mất khỏi DB', q.conSauXoaTk === 1, q.conSauXoaTk + ' người duyệt');
ok('Anh Phong XOÁ HỒ SƠ NHÂN SỰ của Sếp (xoá kèm tài khoản) → 409',
   q.xoaNsSep === 409, 'HTTP ' + q.xoaNsSep);
ok('Cờ duyệt vẫn còn sau cửa xoá-nhân-sự', q.conSauXoaNs === 1, q.conSauXoaNs + ' người duyệt');
ok('Anh Phong ĐẶT LẠI MẬT KHẨU tài khoản Sếp → 403', q.datLaiMkSep === 403, 'HTTP ' + q.datLaiMkSep);
ok('KHÔNG rò mật khẩu tạm của Sếp ra cho người gọi', !q.loMatKhauSep);
ok('Không cắt quá tay: khoá/đặt lại mật khẩu người thường vẫn 200',
   q.khoaAn === 200 && q.mkAn === 200, `khoá ${q.khoaAn} · mật khẩu ${q.mkAn}`);
ok('Hạ vai trò Sếp / khoá hồ sơ nhân sự Sếp KHÔNG tắt được quyền duyệt',
   q.sepVanDuyetDuoc === 200,
   `hạ vai trò ${q.haVaiTroSep} · khoá hồ sơ ${q.khoaHoSoSep} · Sếp duyệt HTTP ${q.sepVanDuyetDuoc}`);
ok('Có người thay giữ cờ rồi thì khoá được tài khoản Sếp (200)',
   q.capCoPhong === 200 && q.khoaSepSauUyQuyen === 200 && q.conSauUyQuyen === 1,
   `cấp cờ ${q.capCoPhong} · khoá ${q.khoaSepSauUyQuyen} · còn ${q.conSauUyQuyen} người duyệt`);

/* ==========================================================================
   ĐỌC PHÒNG THỦ (REV-0027 L4) — THIẾU CỘT `duyet_gopy` THÌ HỎNG THEO CHIỀU
   AN TOÀN, KHÔNG SẬP CẢ ERP. Dựng đúng ca "deploy code trước, nạp DB sau".
   ========================================================================== */

const DUONG_SONG_CON = ['/api/toi-la-ai', '/api/danh-ba', '/api/thong-bao', '/api/kho/san-pham'];

async function doThieuCot(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;
  const tokenAn  = await taoPhienThat(env, 4);    // nhân viên kho, chẳng dính góp ý
  const tokenSep = await taoPhienThat(env, 1);

  // Đúng ca "deploy code trước, nạp DB sau": cột chưa có mà code đã đọc.
  db.exec('DROP INDEX IF EXISTS idx_taikhoan_duyetgopy');
  db.exec('ALTER TABLE tai_khoan DROP COLUMN duyet_gopy');

  const r = { conCot: db.prepare("SELECT name FROM pragma_table_info('tai_khoan')").all().map(x => x.name),
              maAn: [], maSep: [] };
  for (const d of DUONG_SONG_CON) {
    r.maAn.push((await goiAPI(worker, env, d, tokenAn)).status);
    r.maSep.push((await goiAPI(worker, env, d, tokenSep)).status);
  }
  r.coDuyet = (await goiAPI(worker, env, '/api/toi-la-ai', tokenSep)).than?.duyet_gopy;
  r.duyetKhiThieuCot = (await goiAPI(worker, env, '/api/gop-y/duyet', tokenSep,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 2 }) })).status;
  db.close?.();
  return r;
}

console.log('\n=== THIẾU CỘT duyet_gopy (deploy sai thứ tự) ===================\n');
const tc = await doThieuCot(SRC);
ok('Đã dựng đúng ca: cột duyet_gopy KHÔNG còn trong DB', !tc.conCot.includes('duyet_gopy'));
ok('Phiên nhân viên kho: cả 4 đường đều 200 (không mất đăng nhập)',
   tc.maAn.every(x => x === 200), DUONG_SONG_CON.map((d, i) => `${d} ${tc.maAn[i]}`).join(' · '));
ok('Phiên của Sếp: cả 4 đường đều 200', tc.maSep.every(x => x === 200), tc.maSep.join(','));
ok('Cờ duyệt lùi về FALSE — hỏng theo chiều AN TOÀN, không mở toang',
   tc.coDuyet === false, 'duyet_gopy = ' + JSON.stringify(tc.coDuyet));
ok('Thiếu cột thì KHÔNG ai duyệt được cấp cuối (403, không phải 500)',
   tc.duyetKhiThieuCot === 403, 'HTTP ' + tc.duyetKhiThieuCot);

/* ==========================================================================
   VIỆC 7 — KHÔNG AI DUYỆT GÓP Ý CỦA CHÍNH MÌNH
   Sếp Ngọc 28/08: "lỗi của tôi tự góp ý mà vẫn bắt tôi duyệt, bị ngu à :))))"
   ========================================================================== */

console.log('\n=== VIỆC 7: NGƯỜI GỬI CŨNG LÀ NGƯỜI DUYỆT =====================\n');

async function doViec7(thuMucSrc) {
  const t = await motVong(thuMucSrc);
  const v = {};
  const lichSuCua = (id) => t.db.prepare(
    'SELECT ghi_chu, tu_trang_thai, den_trang_thai, nguoi_doi_id FROM gop_y_lich_su WHERE gop_y_id = ? ORDER BY id').all(id);

  // ① Sếp (người giữ cờ) tự gửi
  const rSep = await t.gui('SEP', 'Sếp tự góp ý: gộp báo cáo tồn kho');
  v.sepGui = rSep.status; v.sepGopY = t.dong(rSep.than?.id);
  v.sepLichSu = lichSuCua(rSep.than?.id);
  v.sepPhaiBamGiKhong = (await t.duyet('SEP', { id: rSep.than?.id, quyet_dinh: 'duyet' })).status;

  // ② Quản lý phòng (không có ai ở cấp 1) tự gửi
  const rPhong = await t.gui('PHONG', 'Quản lý góp ý: rút gọn phiếu nhập');
  v.phongGui = rPhong.status; v.phongGopY = t.dong(rPhong.than?.id);
  v.phongLichSu = lichSuCua(rPhong.than?.id);
  v.phongTuDuyet = (await t.duyet('PHONG', { id: rPhong.than?.id, quyet_dinh: 'duyet' })).status;
  v.sepDuyetHoPhong = (await t.duyet('SEP', { id: rPhong.than?.id, quyet_dinh: 'duyet', ghi_chu: 'ok' })).status;
  v.sauSepDuyetHoPhong = t.dong(rPhong.than?.id);

  // ③ CA NGƯỢC — nhân viên thường VẪN phải qua đủ hai cửa
  const rAn = await t.gui('AN', 'Nhân viên góp ý: máy quét kêu to');
  v.anGui = rAn.status; v.anGopY = t.dong(rAn.than?.id);
  v.anLichSu = lichSuCua(rAn.than?.id);
  v.sepDuyetVuotCapChuaGhiLyDo = (await t.duyet('SEP', { id: rAn.than?.id, quyet_dinh: 'duyet' })).status;
  v.duyDuyetCap1 = (await t.duyet('DUY', { id: rAn.than?.id, quyet_dinh: 'duyet' })).status;
  v.anSauCua1 = t.dong(rAn.than?.id);
  v.duyDiTiep = (await t.duyet('DUY', { id: rAn.than?.id, quyet_dinh: 'duyet' })).status;
  v.sepDuyetCua2 = (await t.duyet('SEP', { id: rAn.than?.id, quyet_dinh: 'duyet' })).status;
  v.anSauCua2 = t.dong(rAn.than?.id);

  t.db.close?.();
  return v;
}

const v = await doViec7(SRC);
const coDongBoQua = (ls, tu) => ls.some(x => /[Bb]ỏ qua/.test(x.ghi_chu || '') && x.tu_trang_thai === tu);

console.log('— NGƯỜI GIỮ CỜ DUYỆT (Sếp) tự gửi —');
ok('Vào THẲNG trạng thái đã duyệt, không qua cửa nào',
   v.sepGui === 200 && v.sepGopY?.trang_thai === 'cho_phan_tich',
   `HTTP ${v.sepGui} · ${v.sepGopY?.trang_thai} · chờ ${v.sepGopY?.next_owner}`);
ok('CÓ ghi một dòng lịch sử "bỏ qua vì người gửi cũng là người duyệt"',
   coDongBoQua(v.sepLichSu, 'moi') && v.sepLichSu.length === 1,
   (v.sepLichSu[0]?.ghi_chu || '(không có dòng nào)').slice(0, 60));
ok('Không còn cửa nào bắt Sếp bấm duyệt góp ý của chính mình (400)',
   v.sepPhaiBamGiKhong === 400, 'HTTP ' + v.sepPhaiBamGiKhong);

console.log('\n— QUẢN LÝ PHÒNG (không có ai ở cấp 1) tự gửi —');
ok('Bỏ qua cổng 1, lên thẳng Sếp',
   v.phongGui === 200 && v.phongGopY?.trang_thai === 'moi' && v.phongGopY?.next_owner === 'OWNER',
   `${v.phongGopY?.trang_thai} · chờ ${v.phongGopY?.next_owner}`);
ok('CÓ ghi dòng lịch sử nói rõ vì sao bỏ qua', coDongBoQua(v.phongLichSu, 'moi'),
   (v.phongLichSu[0]?.ghi_chu || '(không có dòng nào)').slice(0, 60));
ok('Quản lý KHÔNG tự duyệt góp ý của mình được → 403', v.phongTuDuyet === 403, 'HTTP ' + v.phongTuDuyet);
ok('Sếp duyệt việc đó → 200 và đi tiếp đúng bước',
   v.sepDuyetHoPhong === 200 && v.sauSepDuyetHoPhong?.trang_thai === 'cho_phan_tich',
   `HTTP ${v.sepDuyetHoPhong} · ${v.sauSepDuyetHoPhong?.trang_thai}`);

console.log('\n— CA NGƯỢC: NHÂN VIÊN THƯỜNG VẪN PHẢI QUA ĐỦ HAI CỬA —');
ok('Gửi xong nằm ở cổng 1, KHÔNG bị bỏ qua nhầm',
   v.anGui === 200 && v.anGopY?.trang_thai === 'moi' && v.anGopY?.next_owner === 'QL_CAP1',
   `${v.anGopY?.trang_thai} · chờ ${v.anGopY?.next_owner}`);
ok('KHÔNG có dòng lịch sử "bỏ qua" nào cho nhân viên thường', v.anLichSu.length === 0,
   v.anLichSu.length + ' dòng');
ok('Sếp vượt cấp mà chưa ghi lý do → 400 (cổng 1 vẫn là cổng thật)',
   v.sepDuyetVuotCapChuaGhiLyDo === 400, 'HTTP ' + v.sepDuyetVuotCapChuaGhiLyDo);
ok('Cửa 1: quản lý trực tiếp duyệt → 200, việc chuyển lên Sếp',
   v.duyDuyetCap1 === 200 && v.anSauCua1?.next_owner === 'OWNER',
   `HTTP ${v.duyDuyetCap1} · chờ ${v.anSauCua1?.next_owner}`);
ok('Cửa 2: quản lý KHÔNG đi tiếp được → 403', v.duyDiTiep === 403, 'HTTP ' + v.duyDiTiep);
ok('Cửa 2: Sếp duyệt → 200, việc đi tiếp',
   v.sepDuyetCua2 === 200 && v.anSauCua2?.trang_thai === 'cho_phan_tich',
   `HTTP ${v.sepDuyetCua2} · ${v.anSauCua2?.trang_thai}`);

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

/* ---- L5: BACKFILL HỤT THÌ MIGRATION PHẢI GÃY TO, KHÔNG ĐƯỢC IM ---------- */

console.log('\n=== MIGRATION TỰ KIỂM (REV-0027 L5) ============================\n');
{
  const chayTren = (db, f) => {
    for (const c of cacCauSQL(readFileSync(path.join(GOC, 'migrations', f), 'utf8'))) db.exec(c);
  };
  // Ca hỏng: số điện thoại của Sếp đã đổi VÀ họ tên trong hồ sơ cũng khác →
  // backfill bắt trúng 0 người. Trước bản vá, migration báo thành công.
  const { db } = dungDB();
  chayTren(db, 'lui-quyen-duyet-gopy.sql');
  db.exec("DELETE FROM tai_khoan; DELETE FROM nhan_su;");
  db.exec(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan) VALUES
             ('N9','Bùi Thi Ngọc','BTN','Giám đốc','BGĐ')`);   // thiếu dấu — cố ý
  db.exec(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat)
           VALUES ('N9','0987000111','x','admin',1)`);
  let loiBackfillHut = '';
  try { chayTren(db, 'them-quyen-duyet-gopy.sql'); }
  catch (e) { loiBackfillHut = String(e.message || ''); }
  ok('Backfill bắt 0 người → migration GÃY, có tên chốt kiểm trong lỗi',
     /CHECK constraint failed/i.test(loiBackfillHut)
       && /backfill_duyet_gopy_phai_bat_dung_1_nguoi/i.test(loiBackfillHut),
     loiBackfillHut ? loiBackfillHut.slice(0, 70) : 'migration ĐI QUA ÊM (đúng lỗi L5)');
  ok('Ca đúng: bật cờ cho đúng 1 người thì migration đi qua êm',
     (() => {
       const { db: db2 } = dungDB();
       try {
         chayTren(db2, 'lui-quyen-duyet-gopy.sql');
         db2.exec("DELETE FROM tai_khoan; DELETE FROM nhan_su;");
         db2.exec("INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan) VALUES ('N1','Bùi Thị Ngọc','BTN','GĐ','BGĐ')");
         db2.exec("INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat) VALUES ('N1','0911994696','x','admin',1)");
         chayTren(db2, 'them-quyen-duyet-gopy.sql');
         return db2.prepare('SELECT COUNT(*) AS n FROM tai_khoan WHERE duyet_gopy = 1').get()?.n === 1;
       } catch (e) { console.log('   lỗi: ' + e.message); return false; }
     })());
  db.close?.();
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
    (d) => d.phongThay !== 7 || d.phongThieuKhoa.length > 0 || !d.phongDocGhiChu,
    'anh Phong bị cắt mất quyền xem (cắt quá tay)'],

  ['D-bo-chan-cap-co', (f, s) => f === 'index.js'
    ? s.replace("return loi('Chỉ người đang giữ quyền duyệt góp ý mới cấp/thu được quyền này', 403);",
                'if (false) return null;') : s,
    (d) => d.phongTuBatCo !== 403 || d.phongThuCoSep !== 403,
    'anh Phong tự bật cờ / thu cờ của Sếp']
];

/* Ca đối chứng cho SÁU lỗi REV-0027 tìm ra — bàn đo cũ chạy 45 ĐẠT / 0 TRƯỢT
   mà KHÔNG bắt được cái nào trong số này. Bàn đo xanh mà lỗi vẫn còn thì bàn
   đo là thứ đầu tiên phải sửa. Mỗi ca chạy trên bàn đo tương ứng với lỗi. */
const DC2 = [
  ['E-bo-chan-bi-chan-o-cong-duyet', (f, s) => f === 'index.js'
    ? s.replace("const dangOCongDuyet = ['moi', 'cho_quyet_dinh'].includes(g.trang_thai);",
                'const dangOCongDuyet = false;') : s,
    doChinh,
    (d) => d.phongChanMoi !== 403 || d.phongChanQuyetDinh !== 403 || d.hangChoSau !== d.hangChoTruoc,
    'anh Phong chặn được việc đang chờ Sếp → rút khỏi hàng chờ (L1)'],

  ['F-luu-tai-cho-ghi-de-nguoi-cho', (f, s) => f === 'index.js'
    ? s.replace('if (trangThaiMoi !== g.trang_thai && !raVaoBiChan && !gan.some(', 'if (!gan.some(') : s,
    doChinh,
    (d) => d.sauGiaoViecSla?.next_owner !== 'OWNER' || d.sauGiaoViecLan3?.next_owner !== 'OWNER'
        || d.sauGoChan?.next_owner !== 'OWNER',
    'giao người phụ trách kéo việc đã lên Sếp tụt về cổng 1 (L2)'],

  ['G-bo-chan-cua-quan-tri', (f, s) => f === 'index.js'
    ? s.replace('async function laNguoiDuyetGopYCuoiCung(env, tkId) {',
                'async function laNguoiDuyetGopYCuoiCung(env, tkId) { return false;')
       .replace('async function dangGiuCoDuyetGopY(env, tkId) {',
                'async function dangGiuCoDuyetGopY(env, tkId) { return false;') : s,
    doQuanTri,
    (d) => d.khoaSep !== 409 || d.xoaTkSep !== 409 || d.xoaNsSep !== 409 || d.datLaiMkSep !== 403,
    'anh Phong khoá/xoá/đặt lại mật khẩu tài khoản Sếp (L3 + cửa 5)'],

  ['H-doc-khong-phong-thu', (f, s) => f === 'auth.js'
    ? s.replace("cauPhien('0 AS duyet_gopy')", "cauPhien('t.duyet_gopy')") : s,
    doThieuCot,
    (d) => !d.maAn.every(x => x === 200) || !d.maSep.every(x => x === 200),
    'thiếu cột duyet_gopy làm sập đăng nhập toàn hệ thống (L4)'],

  ['I-van-bat-sep-tu-duyet', (f, s) => f === 'index.js'
    ? s.replace("const tt = nguoiGuiGiuCo ? 'cho_phan_tich' : 'moi';", "const tt = 'moi';")
       .replace('const [cur, nxt] = nguoiGuiGiuCo ? GOPY_OWNER_THEO_TT.cho_phan_tich',
                'const [cur, nxt] = false ? GOPY_OWNER_THEO_TT.cho_phan_tich') : s,
    doViec7,
    (d) => d.sepGopY?.trang_thai !== 'cho_phan_tich' || d.phongGopY?.next_owner !== 'OWNER',
    'vẫn bắt người gửi tự duyệt góp ý của chính mình (Việc 7)'],

  ['K-bo-qua-nham-ca-nhan-vien', (f, s) => f === 'index.js'
    ? s.replace("const tt = nguoiGuiGiuCo ? 'cho_phan_tich' : 'moi';", "const tt = 'cho_phan_tich';")
       .replace('const [cur, nxt] = nguoiGuiGiuCo ? GOPY_OWNER_THEO_TT.cho_phan_tich',
                'const [cur, nxt] = true ? GOPY_OWNER_THEO_TT.cho_phan_tich') : s,
    doViec7,
    (d) => d.anGopY?.trang_thai !== 'moi' || d.anGopY?.next_owner !== 'QL_CAP1',
    'góp ý của nhân viên thường cũng bỏ qua cả hai cổng (cắt quá tay)']
];

let batDu = 0;
const chayDC = async (ten, sua, banDo, batLoi, moTa) => {
  const thuMuc = banSrcHong(ten, sua);
  let d = null, vo = false;
  try { d = await banDo(thuMuc); } catch (e) { vo = true; console.log('   (bản hỏng ném lỗi: ' + e.message + ')'); }
  const bat = vo || batLoi(d);
  if (ok(`DC-${ten} → bàn đo BẮT ĐƯỢC`, bat, moTa)) batDu++;
  rmSync(thuMuc, { recursive: true, force: true });
};

for (const [ten, sua, batLoi, moTa] of DC) await chayDC(ten, sua, doChinh, batLoi, moTa);
for (const [ten, sua, banDo, batLoi, moTa] of DC2) await chayDC(ten, sua, banDo, batLoi, moTa);
ok('Phép đo nhạy cả hai chiều (rò rỉ VÀ cắt thừa)', batDu === DC.length + DC2.length,
   `${batDu}/${DC.length + DC2.length}`);

process.exit(tongKet() ? 0 : 1);
