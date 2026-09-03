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

   BH-16 — CÁC CA ĐỐI CHỨNG ở cuối file, chạy trên bản `src` ĐÃ LÀM HỎNG CỐ Ý:
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
     DC-L  đồng hồ SLA đọc cap_nhat_luc      → REV-0030 lỗi 1 (cửa 14)
     DC-M  gửi lại bỏ quên Việc 7            → REV-0030 cửa 15
     DC-N  gửi lại hộ mà sổ ghi sai người    → REV-0030 cửa 16
     DC-O  trả thẳng mật khẩu tạm cho người bấm → REV-0030 lỗi 2, đường rò (a)
     DC-P  thiếu cột mà không báo ai         → REV-0030 lỗi 5
     DC-Q  triage chỉ quét 'moi'             → REV-0030 lỗi 6
     DC-R  hoàn tác bỏ quên đồng hồ          → REV-0032 L1 (cửa 17)
     DC-S  bỏ chốt hai chat id trùng nhau    → REV-0032 M1
     DC-T  bỏ chốt nhịp khôi phục            → REV-0032 M2
     DC-U  ghi hỏng nửa chừng mà im lặng     → REV-0032 L5

   BÀN ĐO CŨ (45 ĐẠT / 0 TRƯỢT) KHÔNG BẮT ĐƯỢC L1/L2/L3 — bàn đo xanh mà lỗi
   vẫn còn thì bàn đo là thứ đầu tiên phải sửa (BH-47).

   SỐ TRONG LỜI KHAI PHẢI ĐÚNG BẰNG SỐ CHẠY RA (REV-0030): bản REV-0027 ghi
   "89 phép" trong khi chạy ra 90, và khai cây `2e5084d` là 64/25 trong khi
   chạy ra 65/25. Cùng loại lệch, lần thứ ba (REV-0032 L4): lời khai vòng 2
   nói ảnh chụp CSDL phủ "48 bảng" trong khi bàn đo in ra **57 bảng** — con
   số đúng là con số bàn đo in ra, không phải con số nhớ được. Bản REV-0030:
   146 phép, 16 ca đối chứng. Bản REV-0032: 175 phép, 20 ca đối chứng.
   Bản REV-0035 này: 192 phép, 22 ca đối chứng.
   Chấm lại cây REV-0030 (`53c77ef`) bằng chính bàn đo này: 177 ĐẠT /
   15 TRƯỢT — đúng sáu lỗi ở tầng máy chủ (cửa 17 · M1 · M2 · L5 của REV-0032,
   cộng L2 so chat id bằng chuỗi và L3 chốt nhịp hỏng-mở của REV-0035), không
   thiếu không thừa. (Phần trong `scripts/` — hai hàm SQL, `hoiMotLan`, và cả
   việc CHẠY THẬT script cứu hộ — không đổi theo `GOPY_SRC`, nên có ca đo và
   ca đối chứng riêng.) Đo cây cũ:
     GOPY_SRC=<thư mục src cũ> node scripts/do-quyen-duyet-gopy.mjs

   Chạy:  node scripts/do-quyen-duyet-gopy.mjs
   ========================================================================== */

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, goiCron, datDongHo, cacCauSQL,
         TELEGRAM, TELEGRAM_CT, ok, tongKet } from './ban-thu-d1.mjs';
import { kiemTraMatKhau } from '../src/auth.js';

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

async function motVong(thuMucSrc, themEnv = {}) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1, themEnv);
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

/* ---- Tiện ích cho REV-0030 ---------------------------------------------- */

/* Ảnh chụp TOÀN BỘ CSDL — mọi bảng, mọi dòng. Dùng cho hai việc:
   ① chứng minh mật khẩu tạm KHÔNG lọt vào bất kỳ bảng nào (kể cả `thong_bao`
      và `tai_khoan` — hai bảng NẰM TRONG bản sao lưu CSV đẩy lên Drive);
   ② chứng minh script đặt lại mật khẩu KHÔNG XOÁ GÌ. */
function anhChupDB(db) {
  const bang = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                 .all().map(r => r.name);
  const o = {};
  for (const b of bang) {
    try { o[b] = db.prepare(`SELECT * FROM "${b}"`).all(); } catch { o[b] = null; }
  }
  return o;
}
function moiChuTrongDB(db) {
  return JSON.stringify(anhChupDB(db));
}
function soSanhDB(a, b) {
  const khac = [];
  for (const t of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[t]) !== JSON.stringify(b[t]))
      khac.push({ bang: t, truoc: (a[t] || []).length, sau: (b[t] || []).length });
  }
  return khac;
}

/* Bắt MỌI dòng console mà mã sản phẩm in ra trong lúc chạy `fn`.
   Cần cho hai phép đo ngược nhau: (b) mật khẩu tạm KHÔNG được lọt vào Workers
   Logs, và ngược lại (lỗi 5) thiếu cột thì PHẢI có ít nhất một dòng. */
async function batConsole(fn) {
  const cu = { log: console.log, warn: console.warn, error: console.error };
  const dong = [];
  const bat = (...a) => dong.push(a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  console.log = bat; console.warn = bat; console.error = bat;
  try { return { kq: await fn(), dong }; }
  finally { Object.assign(console, cu); }
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
   THIẾU CỘT gop_y.cho_duyet_tu_luc — ĐÚNG RỦI RO CỦA BẢN VÁ CỬA 17.
   Vá cửa 17 nghĩa là thêm một chỗ ĐỌC và một chỗ GHI cột `cho_duyet_tu_luc`
   ngay trên đường duyệt/hoàn tác. Nếu deploy code trước khi nạp migration
   (BH-48) mà những chỗ đó không phòng thủ thì cả cổng duyệt sập — đắt hơn
   nhiều so với chính cửa 17. Nên phải đo: THIẾU CỘT thì mọi thứ vẫn chạy.
   ========================================================================== */

async function doThieuCotDongHo(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;
  const tokenAn = await taoPhienThat(env, 4), tokenDuy = await taoPhienThat(env, 3);

  db.exec('DROP INDEX IF EXISTS idx_gopy_cho_duyet_tu_luc');
  db.exec('ALTER TABLE gop_y DROP COLUMN cho_duyet_tu_luc');
  const r = { conCot: db.prepare("SELECT name FROM pragma_table_info('gop_y')").all().map(x => x.name) };

  const post = async (duong, token, than) => goiAPI(worker, env, duong, token,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });

  r.gui = (await post('/api/gop-y', tokenAn,
    { tieu_de: 'Thiếu cột mà vẫn phải gửi được', boi_canh: 'bc', vuong_o_dau: 'vd', mong_muon: 'mm' })).status;
  r.duyet = (await post('/api/gop-y/duyet', tokenDuy, { id: 1, quyet_dinh: 'duyet' })).status;
  r.hoanTac = (await post('/api/gop-y/hoan-tac', tokenDuy, { id: 1 })).status;
  r.sauHoanTac = db.prepare('SELECT trang_thai, next_owner FROM gop_y WHERE id = 1').get();
  try { await goiCron(worker, env); r.cronNem = false; } catch { r.cronNem = true; }
  db.close?.();
  return r;
}

console.log('\n=== THIẾU CỘT gop_y.cho_duyet_tu_luc (rủi ro của bản vá cửa 17) ===\n');
{
  const td = await doThieuCotDongHo(SRC);
  ok('Đã dựng đúng ca: cột cho_duyet_tu_luc KHÔNG còn trong DB',
     !td.conCot.includes('cho_duyet_tu_luc'));
  ok('Gửi góp ý vẫn 200 (không 500 vì thiếu cột)', td.gui === 200, 'HTTP ' + td.gui);
  ok('Cổng duyệt vẫn mở: duyệt 200 · hoàn tác 200',
     td.duyet === 200 && td.hoanTac === 200, `duyệt ${td.duyet} · hoàn tác ${td.hoanTac}`);
  ok('Hoàn tác vẫn trả việc về đúng chỗ cũ khi KHÔNG có đồng hồ để trả',
     td.sauHoanTac?.trang_thai === 'moi' && td.sauHoanTac?.next_owner === 'QL_CAP1',
     `${td.sauHoanTac?.trang_thai} · chờ ${td.sauHoanTac?.next_owner}`);
  ok('Cron chạy xong KHÔNG ném (SLA lùi về cap_nhat_luc như cũ)', !td.cronNem);
}

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
    for (const c of cacCauSQL(readFileSync(path.join(GOC, 'migrations', /^lui-/.test(f) ? 'lui' : '.', f), 'utf8'))) db.exec(c);
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
    for (const c of cacCauSQL(readFileSync(path.join(GOC, 'migrations', /^lui-/.test(f) ? 'lui' : '.', f), 'utf8'))) db.exec(c);
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

/* ---- MIGRATION CỘT ĐỒNG HỒ: lùi–tiến–lùi–tiến, và backfill có sót không -- */

console.log('\n=== MIGRATION cho_duyet_tu_luc (thêm–lùi–thêm–lùi–thêm) ========\n');
{
  const { db } = dungDB();          // đã có sẵn them-gopy-cho-duyet-tu-luc.sql
  const cot = () => db.prepare("SELECT name FROM pragma_table_info('gop_y')").all().map(r => r.name);
  const chay = (f) => {
    for (const c of cacCauSQL(readFileSync(path.join(GOC, 'migrations', /^lui-/.test(f) ? 'lui' : '.', f), 'utf8'))) db.exec(c);
  };
  ok('Cột cho_duyet_tu_luc có mặt sau khi nạp migrations', cot().includes('cho_duyet_tu_luc'));

  let sach = true;
  for (let vong = 1; vong <= 2; vong++) {
    try {
      chay('lui-gopy-cho-duyet-tu-luc.sql');
      if (cot().includes('cho_duyet_tu_luc')) sach = false;
      chay('them-gopy-cho-duyet-tu-luc.sql');
      if (!cot().includes('cho_duyet_tu_luc')) sach = false;
    } catch (e) { sach = false; console.log('   lỗi vòng ' + vong + ': ' + e.message); }
  }
  ok('Lùi–tiến 2 vòng: không vòng nào lỗi, cột về đúng chỗ', sach);
  ok('Chạy file xuôi lần 2 bị chặn đúng bằng schema_migrations',
     (() => { try { chay('them-gopy-cho-duyet-tu-luc.sql'); return false; }
              catch (e) { return /UNIQUE|schema_migrations/i.test(e.message); } })());
  ok('KHÔNG đụng cột nghiệp vụ cũ của gop_y',
     ['trang_thai', 'current_owner', 'next_owner', 'risk', 'cap_nhat_luc', 'tao_luc',
      'duyet_cap1_luc', 'duyet_owner_luc'].every(c => cot().includes(c)));

  // Backfill lấy ĐÚNG đồng hồ cũ, không để việc nào nhảy vọt hay bị lùi.
  {
    const { db: db2 } = dungDB();
    for (const c of cacCauSQL(readFileSync(path.join(GOC, 'migrations', 'lui', 'lui-gopy-cho-duyet-tu-luc.sql'), 'utf8'))) db2.exec(c);
    db2.exec("DELETE FROM gop_y_lich_su; DELETE FROM gop_y; DELETE FROM tai_khoan; DELETE FROM nhan_su;");
    db2.exec("INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan) VALUES ('N1','Nguyễn Văn An','NVA','NV','Kho vận')");
    db2.exec(`INSERT INTO gop_y (id, nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon,
                trang_thai, tao_luc, cap_nhat_luc)
              VALUES (1,'N1','cũ có cap_nhat_luc','bc','vd','mm','moi','2026-08-20 08:00:00','2026-08-23 10:00:00'),
                     (2,'N1','cũ chưa từng sửa','bc','vd','mm','moi','2026-08-21 08:00:00',NULL)`);
    for (const c of cacCauSQL(readFileSync(path.join(GOC, 'migrations', 'them-gopy-cho-duyet-tu-luc.sql'), 'utf8'))) db2.exec(c);
    const d = db2.prepare('SELECT id, cho_duyet_tu_luc FROM gop_y ORDER BY id').all();
    ok('Backfill lấy đúng đồng hồ cũ (cap_nhat_luc, thiếu thì tao_luc), không sót dòng nào',
       d.length === 2 && d[0].cho_duyet_tu_luc === '2026-08-23 10:00:00'
                      && d[1].cho_duyet_tu_luc === '2026-08-21 08:00:00',
       d.map(x => `#${x.id}=${x.cho_duyet_tu_luc}`).join(' · '));
    db2.close?.();
  }
  db.close?.();
}

/* ==========================================================================
   CỬA THỨ 14 (REV-0030 lỗi 1) — ĐỒNG HỒ SLA CÓ BỊ ĐẨY LÙI ĐƯỢC KHÔNG?
   Đo bằng đúng cái Sếp quan tâm: SAU KHI CHẠY CRON, việc có lên tới Sếp không.
   ========================================================================== */

const CU5NGAY = '2026-08-23 10:00:00';    // đúng 5 ngày trước mốc đo (28/08 10:00)
const HOM_NAY = '2026-08-28 09:00:00';

async function doDongHoSla(thuMucSrc) {
  const t = await motVong(thuMucSrc);
  const d = {};

  t.db.exec("DELETE FROM gop_y_lich_su; DELETE FROM gop_y;");
  const g = t.db.prepare(`INSERT INTO gop_y
    (id, nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon, trang_thai,
     current_owner, next_owner, de_xuat_risk, tao_luc, cap_nhat_luc, cho_duyet_tu_luc)
    VALUES (?,?,?,'bc','vd','mm','moi','NGUOI_GUI','QL_CAP1','MEDIUM',?,?,?)`);
  g.run(11, 'AN', 'Chờ cổng 1 từ 23/08 — bị giao người phụ trách', CU5NGAY, CU5NGAY, CU5NGAY);
  g.run(12, 'AN', 'Chờ cổng 1 từ 23/08 — bị chặn rồi gỡ chặn',     CU5NGAY, CU5NGAY, CU5NGAY);
  g.run(13, 'AN', 'Vừa gửi sáng nay (ca ngược — không siết oan)',  HOM_NAY, HOM_NAY, HOM_NAY);
  g.run(14, 'AN', 'Chờ cổng 1 từ 23/08 — qua cổng 1 đàng hoàng',   CU5NGAY, CU5NGAY, CU5NGAY);
  // CỬA 17 (REV-0032 L1) — cặp bấm "duyệt" rồi "hoàn tác".
  g.run(15, 'AN', 'Chờ cổng 1 từ 23/08 — duyệt rồi HOÀN TÁC',      CU5NGAY, CU5NGAY, CU5NGAY);

  const dongHo = (id) => t.db.prepare(
    'SELECT cap_nhat_luc, cho_duyet_tu_luc FROM gop_y WHERE id = ?').get(id);

  d.truoc11 = dongHo(11);
  // ① "Lưu tại chỗ" — anh Phong CHỈ giao người phụ trách, không đổi trạng thái.
  d.giaoViec = (await t.doiTT('PHONG', { id: 11, nguoi_phu_trach_id: 'DUY' })).status;
  d.sau11 = dongHo(11);

  // ② Chặn rồi gỡ chặn — cùng một vòng lặp, chỉ khác nút bấm.
  d.chan = (await t.doiTT('SEP', { id: 12, trang_thai: 'bi_chan', ghi_chu: 'chờ hỏi lại' })).status;
  d.goChan = (await t.doiTT('PHONG', { id: 12, trang_thai: 'moi' })).status;
  d.sau12 = dongHo(12);

  // ③ ĐÓNG DẤU ĐÚNG LÚC — qua cổng 1 đàng hoàng thì đồng hồ PHẢI chạy lại.
  d.duyetCap1 = (await t.duyet('DUY', { id: 14, quyet_dinh: 'duyet' })).status;
  d.sau14 = dongHo(14);

  /* ④ CỬA THỨ 17 — DUYỆT (đóng dấu đồng hồ: đúng) rồi HOÀN TÁC NGAY (trả lại
     việc). Hoàn tác mà không trả lại đồng hồ thì việc 5 ngày tuổi tụt về 0 —
     cron thôi đẩy lên Sếp, lặp được, không một dòng cảnh báo. */
  d.truoc15 = dongHo(15);
  d.duyet15 = (await t.duyet('DUY', { id: 15, quyet_dinh: 'duyet' })).status;
  d.sauDuyet15 = dongHo(15);
  d.hoanTac15 = (await t.hoanTac('DUY', 15)).status;
  d.sauHoanTac15 = dongHo(15);
  d.owner15 = t.dong(15)?.next_owner;

  // Cron thật — đây mới là câu trả lời cuối cùng: việc có lên tới Sếp không.
  await goiCron(t.worker, t.env);
  d.chuLai = {};
  for (const id of [11, 12, 13, 15]) d.chuLai[id] = t.dong(id)?.next_owner;

  t.db.close?.();
  return d;
}

console.log('\n=== CỬA THỨ 14: ĐỒNG HỒ SLA CÓ ĐẨY LÙI ĐƯỢC KHÔNG? ============\n');
const s = await doDongHoSla(SRC);
ok('Giao người phụ trách KHÔNG đẩy lùi đồng hồ hàng chờ',
   s.giaoViec === 200 && s.sau11?.cho_duyet_tu_luc === CU5NGAY,
   `HTTP ${s.giaoViec} · đồng hồ ${s.truoc11?.cho_duyet_tu_luc} → ${s.sau11?.cho_duyet_tu_luc} ` +
   `(cap_nhat_luc thì vẫn nhảy: ${s.sau11?.cap_nhat_luc} — đúng nghĩa của cột đó)`);
ok('Chặn rồi gỡ chặn KHÔNG đẩy lùi đồng hồ (đóng băng, không đặt lại)',
   s.chan === 200 && s.goChan === 200 && s.sau12?.cho_duyet_tu_luc === CU5NGAY,
   `chặn ${s.chan} · gỡ ${s.goChan} · đồng hồ ${s.sau12?.cho_duyet_tu_luc}`);
ok('SLA VẪN đẩy được cả hai việc lên Sếp sau khi bị bấm',
   s.chuLai[11] === 'OWNER' && s.chuLai[12] === 'OWNER',
   `#11 chờ ${s.chuLai[11]} · #12 chờ ${s.chuLai[12]}`);
ok('CA NGƯỢC — việc vừa gửi sáng nay KHÔNG bị đẩy lên Sếp oan',
   s.chuLai[13] === 'QL_CAP1', `#13 chờ ${s.chuLai[13]}`);
ok('Đóng dấu ĐÚNG LÚC: qua cổng 1 đàng hoàng thì đồng hồ chạy lại',
   s.duyetCap1 === 200 && s.sau14?.cho_duyet_tu_luc > CU5NGAY,
   `HTTP ${s.duyetCap1} · đồng hồ ${CU5NGAY} → ${s.sau14?.cho_duyet_tu_luc}`);

console.log('\n=== CỬA THỨ 17: HOÀN TÁC CÓ TRẢ LẠI ĐỒNG HỒ KHÔNG? ============\n');
ok('Duyệt thì đồng hồ ĐƯỢC đóng dấu lại (việc sang hàng chờ mới — đúng)',
   s.duyet15 === 200 && s.sauDuyet15?.cho_duyet_tu_luc > CU5NGAY,
   `HTTP ${s.duyet15} · đồng hồ ${s.truoc15?.cho_duyet_tu_luc} → ${s.sauDuyet15?.cho_duyet_tu_luc}`);
ok('HOÀN TÁC trả lại ĐỒNG HỒ, không chỉ trả lại việc',
   s.hoanTac15 === 200 && s.sauHoanTac15?.cho_duyet_tu_luc === CU5NGAY,
   `HTTP ${s.hoanTac15} · đồng hồ ${s.sauDuyet15?.cho_duyet_tu_luc} → ` +
   `${s.sauHoanTac15?.cho_duyet_tu_luc} (phải về ${CU5NGAY})`);
ok('Hoàn tác trả việc về đúng cổng 1 (không đánh rơi phần đã đúng)',
   s.owner15 === 'QL_CAP1', `sau hoàn tác chờ ${s.owner15}`);
ok('SAU CẶP BẤM duyệt→hoàn tác, cron VẪN đẩy việc 5 ngày tuổi lên Sếp',
   s.chuLai[15] === 'OWNER', `#15 chờ ${s.chuLai[15]}`);

/* ==========================================================================
   CỬA 15 · 16 (REV-0030) — GỬI LẠI SAU KHI BỊ TỪ CHỐI
   ========================================================================== */

async function doGuiLai(thuMucSrc) {
  const t = await motVong(thuMucSrc);
  const r = {};
  const ls = (id) => t.db.prepare(
    'SELECT ghi_chu, tu_trang_thai, den_trang_thai, nguoi_doi_id FROM gop_y_lich_su WHERE gop_y_id = ? ORDER BY id').all(id);

  // ① CỬA 15 — người KHÔNG CÓ AI Ở CẤP 1 (anh Phong) gửi lại
  const a = (await t.gui('PHONG', 'Quản lý gửi: rút gọn phiếu nhập')).than?.id;
  r.sepTuChoiPhong = (await t.duyet('SEP', { id: a, quyet_dinh: 'tu_choi', ly_do: 'chưa rõ mong muốn' })).status;
  r.phongGuiLai = (await t.doiTT('PHONG', { id: a, trang_thai: 'moi' })).status;
  r.sauPhongGuiLai = t.dong(a);
  r.lsPhongGuiLai = ls(a);

  // ② CA NGƯỢC — nhân viên CÓ quản lý cấp 1 gửi lại thì VẪN về cổng 1
  const b = (await t.gui('AN', 'Nhân viên gửi: máy quét kêu to')).than?.id;
  r.duyTuChoiAn = (await t.duyet('DUY', { id: b, quyet_dinh: 'tu_choi', ly_do: 'thiếu ảnh' })).status;
  r.anGuiLai = (await t.doiTT('AN', { id: b, trang_thai: 'moi' })).status;
  r.sauAnGuiLai = t.dong(b);
  r.lsAnGuiLai = ls(b);

  // ③ CỬA 16 — admin gửi lại HỘ người khác thì sổ phải ghi đúng ai bấm
  const c = (await t.gui('AN', 'Nhân viên gửi: đèn kho hỏng')).than?.id;
  await t.duyet('DUY', { id: c, quyet_dinh: 'tu_choi', ly_do: 'gửi nhầm mục' });
  r.adminGuiLaiHo = (await t.doiTT('PHONG', { id: c, trang_thai: 'moi' })).status;
  r.lsAdminGuiLaiHo = ls(c);

  t.db.close?.();
  return r;
}

console.log('\n=== CỬA 15 · 16: GỬI LẠI SAU KHI BỊ TỪ CHỐI ====================\n');
const gl = await doGuiLai(SRC);
const coBoQua = (ls) => ls.some(x => /[Bb]ỏ qua cổng duyệt cấp 1/.test(x.ghi_chu || ''));
ok('CỬA 15 — người không có ai ở cấp 1 gửi lại: KHÔNG tụt về QL_CAP1',
   gl.phongGuiLai === 200 && gl.sauPhongGuiLai?.next_owner === 'OWNER',
   `HTTP ${gl.phongGuiLai} · chờ ${gl.sauPhongGuiLai?.next_owner}`);
ok('CỬA 15 — có ghi dòng lịch sử nói rõ vì sao bỏ qua cổng 1',
   coBoQua(gl.lsPhongGuiLai),
   (gl.lsPhongGuiLai.map(x => x.ghi_chu).filter(Boolean).pop() || '(không có dòng nào)').slice(0, 60));
ok('CA NGƯỢC — nhân viên CÓ quản lý gửi lại thì VẪN về cổng 1 (không cắt quá tay)',
   gl.anGuiLai === 200 && gl.sauAnGuiLai?.next_owner === 'QL_CAP1' && !coBoQua(gl.lsAnGuiLai),
   `HTTP ${gl.anGuiLai} · chờ ${gl.sauAnGuiLai?.next_owner} · dòng "bỏ qua": ${coBoQua(gl.lsAnGuiLai) ? 'CÓ (sai)' : 'không'}`);
ok('CỬA 16 — admin gửi lại hộ: sổ KHÔNG ghi "Người gửi đã sửa"',
   gl.adminGuiLaiHo === 200
     && gl.lsAdminGuiLaiHo.some(x => /gửi lại hộ/.test(x.ghi_chu || ''))
     && !gl.lsAdminGuiLaiHo.some(x => /Người gửi đã sửa/.test(x.ghi_chu || '')),
   (gl.lsAdminGuiLaiHo.map(x => x.ghi_chu).filter(Boolean).pop() || '(trống)').slice(0, 60));

/* ==========================================================================
   REV-0030 LỖI 2 — ĐƯỜNG KHÔI PHỤC ĐĂNG NHẬP CHO SẾP
   Sếp Ngọc: "cho a ấy duyệt khôi phục cho tôi đi chứ".
   Anh Phong BẤM ĐƯỢC, nhưng mật khẩu tạm KHÔNG được đi qua tay anh —
   và phải chứng minh nó không lọt CẢ NĂM ĐƯỜNG RÒ.
   ========================================================================== */

const CHAT_SEP = '777';          // chat 1-1 giữa Sếp và bot
const CHAT_NHOM = '1';           // chat dùng chung (dungEnv đặt sẵn)

async function doKhoiPhuc(thuMucSrc) {
  const r = {};
  const hashCua = (t, id) => t.db.prepare('SELECT mat_khau_hash FROM tai_khoan WHERE id = ?').get(id)?.mat_khau_hash;

  // ① CÓ kênh riêng — đường chính
  {
    TELEGRAM.length = 0; TELEGRAM_CT.length = 0;
    const t = await motVong(thuMucSrc, { TELEGRAM_CHAT_ID_SEP: CHAT_SEP });
    const { kq, dong } = await batConsole(() =>
      t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 }));
    r.ma = kq.status;
    r.than = kq.than || {};
    r.console = dong.join('\n');
    r.rieng = TELEGRAM_CT.filter(x => x.chatId === CHAT_SEP);
    r.nhom  = TELEGRAM_CT.filter(x => x.chatId === CHAT_NHOM);
    const m = (r.rieng[0]?.text || '').match(/Mật khẩu tạm:\s*(\S+)/);
    r.mk = m ? m[1] : null;
    r.hashSau = hashCua(t, 1);
    r.mkDungHash = r.mk ? await kiemTraMatKhau(r.mk, r.hashSau) : false;
    r.duLieu = moiChuTrongDB(t.db);
    r.tinChoSep = t.db.prepare("SELECT noi_dung FROM thong_bao WHERE nguoi_nhan_id = 'SEP'").all();
    r.nsLichSu = t.db.prepare("SELECT * FROM nhan_su_lich_su WHERE nhan_su_id = 'SEP'").all();
    const tk = t.db.prepare('SELECT phai_doi_mk FROM tai_khoan WHERE id = 1').get();
    r.phaiDoiMk = tk?.phai_doi_mk;
    r.conPhien = t.db.prepare('SELECT COUNT(*) AS n FROM phien WHERE tai_khoan_id = 1').get()?.n;
    t.db.close?.();
  }

  // ② CHƯA cấu hình kênh riêng → 403, và KHÔNG được đụng mật khẩu hiện tại
  {
    const t = await motVong(thuMucSrc);
    const truoc = hashCua(t, 1);
    const kq = await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 });
    r.khongCoSecret = kq.status;
    r.hashDoiKhiKhongSecret = hashCua(t, 1) !== truoc;
    t.db.close?.();
  }

  // ③ Có secret nhưng KHÔNG GỬI ĐƯỢC (mất token bot) → 502, mật khẩu cũ nguyên vẹn
  {
    const t = await motVong(thuMucSrc, { TELEGRAM_CHAT_ID_SEP: CHAT_SEP, TELEGRAM_BOT_TOKEN: '' });
    const truoc = hashCua(t, 1);
    const kq = await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 });
    r.guiHong = kq.status;
    r.hashDoiKhiGuiHong = hashCua(t, 1) !== truoc;
    t.db.close?.();
  }

  /* ⑥ ĐƯỜNG RÒ THỨ SÁU (REV-0032 M1) — ĐẶT NHẦM CHÌA.
     `TELEGRAM_CHAT_ID_SEP` bị dán đúng chat id của NHÓM CHUNG. Trước bản vá:
     200 êm ru và mật khẩu tạm của Sếp nằm trong nhóm. */
  {
    TELEGRAM.length = 0; TELEGRAM_CT.length = 0;
    const t = await motVong(thuMucSrc, { TELEGRAM_CHAT_ID_SEP: CHAT_NHOM });
    const truoc = hashCua(t, 1);
    const kq = await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 });
    r.chiaTrung = kq.status;
    r.hashDoiKhiChiaTrung = hashCua(t, 1) !== truoc;
    // Có tin nào mang mật khẩu bay vào nhóm chung không?
    r.tinNhomKhiChiaTrung = TELEGRAM_CT.filter(x => x.chatId === CHAT_NHOM)
                                       .filter(x => /Mật khẩu tạm:/.test(x.text || '')).length;
    t.db.close?.();
  }

  /* ⑨ SỐ 0 THỪA Ở ĐẦU (REV-0035 L2) — `-01002222` và `-1002222` là CÙNG một
     nhóm với Telegram (nó đọc chat_id thành số nguyên) nhưng KHÁC chuỗi. So
     chuỗi thôi thì chốt ⑥ mở toang. */
  {
    TELEGRAM.length = 0; TELEGRAM_CT.length = 0;
    const t = await motVong(thuMucSrc,
      { TELEGRAM_CHAT_ID: '-1002222', TELEGRAM_CHAT_ID_SEP: '-01002222' });
    const truoc = hashCua(t, 1);
    r.soKhongThua = (await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 })).status;
    r.hashDoiKhiSoKhongThua = hashCua(t, 1) !== truoc;
    r.tinNhomKhiSoKhongThua = TELEGRAM_CT.filter(x => /Mật khẩu tạm:/.test(x.text || '')).length;
    t.db.close?.();
  }

  /* ⑩ CA NGƯỢC CỦA ⑨ — hai số chỉ lệch ĐÚNG MỘT CHỮ SỐ cuối là hai chỗ khác
     nhau thật, không được siết oan. */
  {
    TELEGRAM.length = 0; TELEGRAM_CT.length = 0;
    const t = await motVong(thuMucSrc,
      { TELEGRAM_CHAT_ID: '-1002222', TELEGRAM_CHAT_ID_SEP: '-1002223' });
    r.chatKhacThat = (await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 })).status;
    r.tinRiengKhacThat = TELEGRAM_CT.filter(x => x.chatId === '-1002223'
                                             && /Mật khẩu tạm:/.test(x.text || '')).length;
    t.db.close?.();
  }

  /* ⑪ CHỐT NHỊP HỎNG THÌ PHẢI ĐÓNG, KHÔNG PHẢI MỞ (REV-0035 L3).
     Mất bảng `nhan_su_lich_su` = không đọc được mốc = không biết vừa phát cách
     đây mấy giây. Bản cũ nuốt lỗi rồi phát tiếp như không có gì. */
  {
    TELEGRAM.length = 0; TELEGRAM_CT.length = 0;
    const t = await motVong(thuMucSrc, { TELEGRAM_CHAT_ID_SEP: CHAT_SEP });
    const truoc = hashCua(t, 1);
    t.db.exec('DROP TABLE nhan_su_lich_su');
    const { kq, dong } = await batConsole(() =>
      t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 }));
    r.soHong = kq.status;
    r.soHongConsole = dong.join('\n');
    r.hashDoiKhiSoHong = hashCua(t, 1) !== truoc;
    r.tinRiengKhiSoHong = TELEGRAM_CT.filter(x => x.chatId === CHAT_SEP).length;
    t.db.close?.();
  }

  /* ⑦ CHỐT NHỊP (REV-0032 M2) — BẤM DỒN.
     Hai cú bấm liên tiếp trong cùng cửa sổ 5 phút: cú thứ hai phải 429, và
     KHÔNG được sinh mật khẩu mới, KHÔNG được đá phiên, KHÔNG spam chat Sếp. */
  {
    TELEGRAM.length = 0; TELEGRAM_CT.length = 0;
    const t = await motVong(thuMucSrc, { TELEGRAM_CHAT_ID_SEP: CHAT_SEP });
    r.bam1 = (await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 })).status;
    const hashSauBam1 = hashCua(t, 1);
    // Sếp đăng nhập lại bằng mật khẩu tạm — có phiên mới.
    await taoPhienThat(t.env, 1);
    const kq2 = await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 });
    r.bam2 = kq2.status;
    r.hashDoiKhiBam2 = hashCua(t, 1) !== hashSauBam1;
    r.phienConSauBam2 = t.db.prepare('SELECT COUNT(*) AS n FROM phien WHERE tai_khoan_id = 1').get()?.n;
    r.tinRiengSau2Bam = TELEGRAM_CT.filter(x => x.chatId === CHAT_SEP).length;
    r.tinChanChoSep = t.db.prepare(
      "SELECT COUNT(*) AS n FROM thong_bao WHERE nguoi_nhan_id = 'SEP' AND lien_ket = 'chan_khoi_phuc'").get()?.n;
    // Bấm thêm lần thứ ba: vẫn 429, và tin báo chặn KHÔNG được nhân đôi.
    r.bam3 = (await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 })).status;
    r.tinChanSau3Bam = t.db.prepare(
      "SELECT COUNT(*) AS n FROM thong_bao WHERE nguoi_nhan_id = 'SEP' AND lien_ket = 'chan_khoi_phuc'").get()?.n;
    // ...và QUA cửa sổ 5 phút thì lại cho (đẩy mốc trong sổ lùi 10 phút).
    t.db.exec("UPDATE nhan_su_lich_su SET luc = datetime(luc, '-10 minutes') WHERE loai_su_kien = 'khoi_phuc_dang_nhap'");
    r.bamSau5Phut = (await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 })).status;
    t.db.close?.();
  }

  /* ⑧ CA NGƯỢC CỦA "GỬI TRƯỚC GHI SAU" (REV-0032 L5) — Telegram GỬI XONG mà
     UPDATE hỏng. Trước bản vá: 500 trần, 0 dấu vết trong ERP. */
  {
    TELEGRAM.length = 0; TELEGRAM_CT.length = 0;
    const t = await motVong(thuMucSrc, { TELEGRAM_CHAT_ID_SEP: CHAT_SEP });
    // Làm câu UPDATE tai_khoan hỏng theo đúng cách nó có thể hỏng thật:
    // một trigger từ chối ghi (đứng sau câu Telegram đã gửi xong).
    t.db.exec(`CREATE TRIGGER thu_chan_ghi BEFORE UPDATE OF mat_khau_hash ON tai_khoan
               BEGIN SELECT RAISE(ABORT, 'thu-ghi-hong'); END`);
    const { kq, dong } = await batConsole(() =>
      t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 1 }));
    r.ghiHong = kq.status;
    r.ghiHongConsole = dong.join('\n');
    r.ghiHongTinSep = t.db.prepare(
      "SELECT noi_dung FROM thong_bao WHERE nguoi_nhan_id = 'SEP'").all();
    r.ghiHongTinNhom = TELEGRAM_CT.filter(x => x.chatId === CHAT_NHOM);
    const mkGui = (TELEGRAM_CT.find(x => x.chatId === CHAT_SEP)?.text || '').match(/Mật khẩu tạm:\s*(\S+)/);
    r.ghiHongMkLo = mkGui ? JSON.stringify(r.ghiHongTinSep).includes(mkGui[1])
                            || r.ghiHongConsole.includes(mkGui[1])
                            || r.ghiHongTinNhom.some(x => x.text.includes(mkGui[1])) : true;
    t.db.exec('DROP TRIGGER thu_chan_ghi');
    t.db.close?.();
  }

  // ④ CA NGƯỢC — người thường vẫn 200 + mật khẩu tạm trả thẳng như cũ
  {
    const t = await motVong(thuMucSrc, { TELEGRAM_CHAT_ID_SEP: CHAT_SEP });
    const kq = await t.post('/api/quan-tri/dat-lai-mat-khau', 'PHONG', { tai_khoan_id: 4 });
    r.maAn = kq.status; r.mkAn = kq.than?.mat_khau_tam || null;
    // ⑤ và chính chủ tự đặt lại mật khẩu của mình cũng không bị siết
    const tuMinh = await t.post('/api/quan-tri/dat-lai-mat-khau', 'SEP', { tai_khoan_id: 1 });
    r.maTuMinh = tuMinh.status; r.mkTuMinh = tuMinh.than?.mat_khau_tam || null;
    t.db.close?.();
  }
  return r;
}

console.log('\n=== LỖI 2: KHÔI PHỤC ĐĂNG NHẬP HỘ SẾP =========================\n');
const kp = await doKhoiPhuc(SRC);
ok('Anh Phong BẤM ĐƯỢC khôi phục cho Sếp → 200 (không còn 403)',
   kp.ma === 200 && kp.than.da_gui_kenh_rieng === true, `HTTP ${kp.ma} · ${JSON.stringify(kp.than)}`);
ok('Mật khẩu tạm ĐÃ tới chat RIÊNG của Sếp và mở được tài khoản',
   kp.rieng.length === 1 && !!kp.mk && kp.mkDungHash,
   `${kp.rieng.length} tin riêng · mật khẩu ${kp.mk ? 'có' : 'KHÔNG CÓ'} · khớp hash: ${kp.mkDungHash}`);
console.log('  · năm đường rò —');
ok('  (a) JSON trả về KHÔNG có trường mat_khau_tam (bỏ khoá, không phải để rỗng)',
   !('mat_khau_tam' in kp.than) && !JSON.stringify(kp.than).includes(kp.mk || '\u0000'),
   Object.keys(kp.than).join(','));
ok('  (b) KHÔNG một dòng console/Workers Logs nào chứa mật khẩu tạm',
   !!kp.mk && !kp.console.includes(kp.mk), `${kp.console.split('\n').filter(Boolean).length} dòng log`);
ok('  (c) KHÔNG lọt vào bảng nào của CSDL (gồm thong_bao + tai_khoan — hai bảng nằm trong bản sao lưu CSV)',
   !!kp.mk && !kp.duLieu.includes(kp.mk));
ok('  (d) KHÔNG lọt vào Telegram NHÓM CHUNG',
   kp.nhom.length >= 1 && !kp.nhom.some(x => x.text.includes(kp.mk || '\u0000')),
   `${kp.nhom.length} tin nhóm · ${(kp.nhom[0]?.text || '').slice(0, 50)}`);
ok('  (e) tai_khoan chỉ giữ hash — mật khẩu cũ cũng không đọc ra được',
   /^pbkdf2\$/.test(String(kp.hashSau)) && !String(kp.hashSau).includes(kp.mk || '\u0000'));
ok('Sếp ĐƯỢC BÁO: một tin trong ERP nói rõ ai bấm, lúc nào (không kèm mật khẩu)',
   kp.tinChoSep.some(x => /Bảo mật/.test(x.noi_dung) && /Nguyễn Duy Phong/.test(x.noi_dung))
     && !kp.tinChoSep.some(x => x.noi_dung.includes(kp.mk || '\u0000')),
   (kp.tinChoSep.map(x => x.noi_dung).find(x => /Bảo mật/.test(x)) || '(không có)').slice(0, 60));
ok('Có MỘT dòng nhan_su_lich_su, không phải chỉ một dòng log',
   kp.nsLichSu.length === 1 && kp.nsLichSu[0].loai_su_kien === 'khoi_phuc_dang_nhap'
     && kp.nsLichSu[0].nguoi_thuc_hien_id === 'PHONG',
   `${kp.nsLichSu.length} dòng · ${kp.nsLichSu[0]?.loai_su_kien} bởi ${kp.nsLichSu[0]?.nguoi_thuc_hien_id}`);
ok('Cả công ty thấy: Telegram nhóm có dòng "[Bảo mật] ai vừa khôi phục cho ai"',
   kp.nhom.some(x => /Bảo mật/.test(x.text) && /Nguyễn Duy Phong/.test(x.text)));
ok('phai_doi_mk = 1 và mọi phiên cũ của Sếp bị đá ra',
   kp.phaiDoiMk === 1 && kp.conPhien === 0, `phai_doi_mk=${kp.phaiDoiMk} · còn ${kp.conPhien} phiên`);
ok('Chưa cấu hình TELEGRAM_CHAT_ID_SEP → 403 và KHÔNG đụng mật khẩu hiện tại',
   kp.khongCoSecret === 403 && !kp.hashDoiKhiKhongSecret,
   `HTTP ${kp.khongCoSecret} · mật khẩu ${kp.hashDoiKhiKhongSecret ? 'ĐÃ BỊ ĐỔI (sai)' : 'nguyên vẹn'}`);
ok('Gửi Telegram hỏng → 502 và mật khẩu cũ NGUYÊN VẸN (không khoá chết tài khoản Sếp)',
   kp.guiHong === 502 && !kp.hashDoiKhiGuiHong,
   `HTTP ${kp.guiHong} · mật khẩu ${kp.hashDoiKhiGuiHong ? 'ĐÃ BỊ ĐỔI (sai)' : 'nguyên vẹn'}`);
ok('CA NGƯỢC — khôi phục cho người thường vẫn 200 + mật khẩu tạm trả thẳng',
   kp.maAn === 200 && !!kp.mkAn, `HTTP ${kp.maAn} · mật khẩu tạm ${kp.mkAn ? 'có' : 'KHÔNG (siết oan)'}`);
ok('CA NGƯỢC — chính chủ tự đặt lại mật khẩu của mình cũng không bị siết',
   kp.maTuMinh === 200 && !!kp.mkTuMinh, `HTTP ${kp.maTuMinh} · mật khẩu tạm ${kp.mkTuMinh ? 'có' : 'KHÔNG'}`);

console.log('\n  · REV-0032 M1 — ĐẶT NHẦM CHÌA (chat id nhóm chung):');
ok('  Hai chat id TRÙNG NHAU → TỪ CHỐI (409), không đụng mật khẩu hiện tại',
   kp.chiaTrung === 409 && !kp.hashDoiKhiChiaTrung,
   `HTTP ${kp.chiaTrung} · mật khẩu ${kp.hashDoiKhiChiaTrung ? 'ĐÃ BỊ ĐỔI (sai)' : 'nguyên vẹn'}`);
ok('  Và KHÔNG một mật khẩu tạm nào bay vào nhóm chung',
   kp.tinNhomKhiChiaTrung === 0, `${kp.tinNhomKhiChiaTrung} tin có mật khẩu trong nhóm`);
ok('  CA NGƯỢC — hai chat id KHÁC nhau thì vẫn chạy bình thường (không siết oan)',
   kp.ma === 200 && kp.rieng.length === 1, `HTTP ${kp.ma} · ${kp.rieng.length} tin vào chat riêng`);

console.log('\n  · REV-0035 L2 — CÙNG MỘT CHAT NHƯNG KHÁC CHUỖI:');
ok('  "-01002222" vs "-1002222" (số 0 thừa) → vẫn bắt là TRÙNG, 409',
   kp.soKhongThua === 409 && !kp.hashDoiKhiSoKhongThua,
   `HTTP ${kp.soKhongThua} · mật khẩu ${kp.hashDoiKhiSoKhongThua ? 'ĐÃ BỊ ĐỔI (sai)' : 'nguyên vẹn'}`);
ok('  Và KHÔNG một mật khẩu tạm nào được gửi đi đường nào',
   kp.tinNhomKhiSoKhongThua === 0, `${kp.tinNhomKhiSoKhongThua} tin có mật khẩu`);
ok('  CA NGƯỢC — lệch đúng một chữ số cuối là hai chỗ KHÁC nhau thật, vẫn chạy',
   kp.chatKhacThat === 200 && kp.tinRiengKhacThat === 1,
   `HTTP ${kp.chatKhacThat} · ${kp.tinRiengKhacThat} tin mật khẩu vào chat riêng`);

console.log('\n  · REV-0035 L3 — SỔ HỎNG THÌ CHỐT NHỊP PHẢI ĐÓNG:');
ok('  Mất bảng nhan_su_lich_su → TỪ CHỐI (503), không phát mật khẩu mù',
   kp.soHong === 503 && !kp.hashDoiKhiSoHong && kp.tinRiengKhiSoHong === 0,
   `HTTP ${kp.soHong} · mật khẩu ${kp.hashDoiKhiSoHong ? 'ĐÃ BỊ ĐỔI (sai)' : 'nguyên vẹn'} · ` +
   `${kp.tinRiengKhiSoHong} tin vào chat riêng`);
ok('  Và nói rõ trong Workers Logs vì sao từ chối',
   /KHÔNG ĐỌC ĐƯỢC MỐC NHỊP/.test(kp.soHongConsole || ''),
   (kp.soHongConsole || '').split('\n').filter(Boolean).length + ' dòng log');

console.log('\n  · REV-0032 M2 — BẤM DỒN:');
ok('  Bấm lần 2 trong 5 phút → 429, KHÔNG sinh mật khẩu mới',
   kp.bam1 === 200 && kp.bam2 === 429 && !kp.hashDoiKhiBam2,
   `lần 1 ${kp.bam1} · lần 2 ${kp.bam2} · mật khẩu ${kp.hashDoiKhiBam2 ? 'BỊ ĐỔI LẠI (sai)' : 'giữ nguyên'}`);
ok('  Phiên Sếp vừa đăng nhập lại KHÔNG bị đá ra',
   kp.phienConSauBam2 === 1, `còn ${kp.phienConSauBam2} phiên`);
ok('  KHÔNG spam chat riêng của Sếp: hai cú bấm chỉ MỘT tin mật khẩu',
   kp.tinRiengSau2Bam === 1, `${kp.tinRiengSau2Bam} tin vào chat riêng`);
ok('  Sếp ĐƯỢC BÁO là có người bấm dồn — và chỉ MỘT tin mỗi cửa sổ',
   kp.tinChanChoSep === 1 && kp.bam3 === 429 && kp.tinChanSau3Bam === 1,
   `sau 2 bấm: ${kp.tinChanChoSep} tin · lần 3 HTTP ${kp.bam3} · sau 3 bấm: ${kp.tinChanSau3Bam} tin`);
ok('  CA NGƯỢC — qua 5 phút thì lại khôi phục được (không khoá vĩnh viễn)',
   kp.bamSau5Phut === 200, `HTTP ${kp.bamSau5Phut}`);

console.log('\n  · REV-0032 L5 — Telegram GỬI XONG mà ghi CSDL hỏng:');
ok('  Không im lặng: có dòng console/Workers Logs nói rõ đã hỏng nửa chừng',
   /KHÔI PHỤC ĐĂNG NHẬP HỎNG NỬA CHỪNG/.test(kp.ghiHongConsole),
   `${kp.ghiHongConsole.split('\n').filter(Boolean).length} dòng log`);
ok('  Chủ tài khoản được báo "mật khẩu tạm vừa gửi KHÔNG dùng được"',
   kp.ghiHongTinSep.some(x => /KHÔNG dùng được/.test(x.noi_dung)),
   (kp.ghiHongTinSep.map(x => x.noi_dung).pop() || '(không có tin nào)').slice(0, 60));
ok('  Nhóm chung cũng thấy — lần thử hỏng KHÔNG vô hình với công ty',
   kp.ghiHongTinNhom.some(x => /ghi hỏng/i.test(x.text)),
   `${kp.ghiHongTinNhom.length} tin nhóm`);
ok('  Trả 500 nói đúng chuyện đã xảy ra, và mật khẩu tạm KHÔNG rò ra đường nào',
   kp.ghiHong === 500 && !kp.ghiHongMkLo, `HTTP ${kp.ghiHong} · rò: ${kp.ghiHongMkLo ? 'CÓ (sai)' : 'không'}`);

/* ==========================================================================
   REV-0030 LỖI 3 — SCRIPT ĐẶT LẠI MẬT KHẨU Ở TẦNG DỮ LIỆU
   Phải chứng minh nó KHÔNG XOÁ GÌ. Không nhận lời hứa: chụp cả CSDL trước và
   sau, so từng bảng.
   ========================================================================== */

console.log('\n=== LỖI 3: SCRIPT ĐẶT LẠI MẬT KHẨU TẦNG DỮ LIỆU ================\n');
{
  const duong = path.join(GOC, 'scripts', 'dat-lai-mat-khau.mjs');
  const mod = await import(pathToFileURL(duong).href);
  // Bỏ chú thích trước khi soi — chú thích có nhắc tới `DELETE FROM` của
  // tao-tai-khoan.mjs, soi cả chú thích là bắt nhầm chính lời cảnh báo.
  const nguon = readFileSync(duong, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  // Soi SQL, không soi tiếng Anh: `.replace()` của JavaScript là hàm chuỗi,
  // không phải `REPLACE INTO` của SQL — bắt cả nó là phép đo nói dối.
  ok('Trong mã KHÔNG có DELETE FROM / DROP / TRUNCATE / REPLACE INTO nào',
     !/\b(DELETE\s+FROM|DROP\s+(TABLE|INDEX|COLUMN)|TRUNCATE|REPLACE\s+INTO)\b/i.test(nguon));
  ok('KHÔNG ghi seed.sql, KHÔNG ghi file nào cả',
     !/seed\.sql|writeFileSync|appendFileSync/i.test(nguon));
  ok('Câu GHI duy nhất đúng khuôn "UPDATE tai_khoan SET ... WHERE ten_dang_nhap"',
     /^UPDATE tai_khoan SET mat_khau_hash = '[^']+', phai_doi_mk = 1 WHERE ten_dang_nhap = '[^']+'$/
       .test(mod.cauDatLai('0911994696', 'pbkdf2$100000$AAAA$BBBB')));
  ok('Câu TRA CỨU chỉ đọc (SELECT), không ghi gì',
     /^SELECT /.test(mod.cauTraCuu('0911994696')));
  ok('Từ chối tên đăng nhập lạ (chốt chặn chèn SQL)',
     !mod.tenDangNhapHopLe("0911994696' OR '1'='1")
       && !mod.tenDangNhapHopLe('') && mod.tenDangNhapHopLe('0911994696'));

  const { db } = dungDB();
  moi(db);
  db.exec('UPDATE tai_khoan SET ten_dang_nhap = lower(ten_dang_nhap)');
  const truoc = anhChupDB(db);
  const soBang = Object.keys(truoc).length;
  const mk = mod.sinhMatKhauTam(12);
  const hash = await mod.bamMatKhau(mk);
  db.exec(mod.cauDatLai('tksep', hash));
  const sau = anhChupDB(db);
  const khac = soSanhDB(truoc, sau);

  ok(`ĐÚNG MỘT bảng đổi trong ${soBang} bảng, và là tai_khoan`,
     khac.length === 1 && khac[0].bang === 'tai_khoan',
     khac.map(x => `${x.bang} (${x.truoc}→${x.sau})`).join(', ') || 'không bảng nào đổi');
  ok('KHÔNG mất một dòng nào ở bất kỳ bảng nào',
     Object.keys(truoc).every(b => (truoc[b] || []).length === (sau[b] || []).length));
  const doiDong = sau.tai_khoan.filter((x, i) => JSON.stringify(x) !== JSON.stringify(truoc.tai_khoan[i]));
  ok('Trong tai_khoan chỉ ĐÚNG MỘT dòng đổi, đúng tài khoản được chỉ định',
     doiDong.length === 1 && doiDong[0].ten_dang_nhap === 'tksep',
     `${doiDong.length} dòng · ${doiDong.map(x => x.ten_dang_nhap).join(',')}`);
  {
    const i = sau.tai_khoan.findIndex(x => x.ten_dang_nhap === 'tksep');
    const cotDoi = Object.keys(sau.tai_khoan[i])
      .filter(c => sau.tai_khoan[i][c] !== truoc.tai_khoan[i][c]);
    ok('Chỉ ĐÚNG HAI cột đổi: mat_khau_hash + phai_doi_mk',
       cotDoi.length === 2 && cotDoi.includes('mat_khau_hash') && cotDoi.includes('phai_doi_mk'),
       cotDoi.join(','));
    ok('Cờ duyet_gopy của Sếp KHÔNG bị đụng tới',
       sau.tai_khoan[i].duyet_gopy === truoc.tai_khoan[i].duyet_gopy,
       `duyet_gopy = ${sau.tai_khoan[i].duyet_gopy}`);
    ok('Hash sinh ra ĐĂNG NHẬP ĐƯỢC bằng đúng kiemTraMatKhau() của src/auth.js',
       await kiemTraMatKhau(mk, sau.tai_khoan[i].mat_khau_hash));
  }

  /* REV-0032 L3 — TÀI KHOẢN ĐANG BỊ KHOÁ. Đặt xong mật khẩu mà `kich_hoat = 0`
     thì vẫn không đăng nhập được: đường cứu cuối cùng mà cứu hụt. */
  {
    const { db: db3 } = dungDB();
    moi(db3);
    db3.exec("UPDATE tai_khoan SET ten_dang_nhap = lower(ten_dang_nhap), kich_hoat = 0 WHERE nhan_su_id = 'SEP'");
    const t1 = anhChupDB(db3);
    const hash3 = await mod.bamMatKhau(mod.sinhMatKhauTam(12));
    db3.exec(mod.cauDatLai('tksep', hash3, true));
    const t2 = anhChupDB(db3);
    const i = t2.tai_khoan.findIndex(x => x.ten_dang_nhap === 'tksep');
    const cotDoi = Object.keys(t2.tai_khoan[i]).filter(c => t2.tai_khoan[i][c] !== t1.tai_khoan[i][c]);
    ok('L3 — tài khoản đang KHOÁ thì cùng câu lệnh đó BẬT LẠI kich_hoat',
       t2.tai_khoan[i].kich_hoat === 1 && cotDoi.length === 3 && cotDoi.includes('kich_hoat'),
       `kich_hoat ${t1.tai_khoan[i].kich_hoat} → ${t2.tai_khoan[i].kich_hoat} · cột đổi: ${cotDoi.join(',')}`);
    ok('L3 — vẫn ĐÚNG MỘT bảng, ĐÚNG MỘT dòng (mở khoá không kéo theo gì khác)',
       soSanhDB(t1, t2).length === 1
         && t2.tai_khoan.filter((x, k) => JSON.stringify(x) !== JSON.stringify(t1.tai_khoan[k])).length === 1);
    ok('L3 — CA NGƯỢC: tài khoản đang hoạt động thì KHÔNG có kich_hoat trong câu lệnh',
       !/kich_hoat/.test(mod.cauDatLai('tksep', hash3, false)),
       mod.cauDatLai('tksep', 'pbkdf2$1$A$B', false).slice(0, 70));
    db3.close?.();
  }

  /* REV-0032 L2 — HỎI XÁC NHẬN GẶP EOF THÌ PHẢI NÉM, KHÔNG ĐƯỢC TREO.
     `rl.question()` im lặng chờ mãi khi luồng vào hết; chú thích cũ khai là
     "DỪNG" — nói sai. Đo thẳng: đưa một luồng vào RỖNG rồi bấm giờ. */
  {
    const { Readable, Writable } = await import('node:stream');
    const { createInterface } = await import('node:readline/promises');
    const rl = createInterface({
      input: Readable.from([]),                                  // luồng vào RỖNG = EOF ngay
      output: new Writable({ write(c, e, cb) { cb(); } })
    });
    // Đồng hồ THẬT (Date đã bị datDongHo đóng băng nên đo bằng Date là ra 0ms).
    const batDau = process.hrtime.bigint();
    let nem = false;
    try {
      await Promise.race([
        mod.hoiMotLan(rl, 'xác nhận: '),
        new Promise((_, tuChoi) => setTimeout(() => tuChoi(new Error('TREO — quá 3 giây')), 3000))
      ]);
    } catch (e) { nem = /EOF/.test(e.message); }
    rl.close();
    const ms = Number(process.hrtime.bigint() - batDau) / 1e6;
    ok('L2 — EOF (CI/cron, không có bàn phím) thì NÉM ngay, không treo',
       nem && ms < 3000, `${nem ? 'ném EOF' : 'TREO / ném lỗi khác'} sau ${ms.toFixed(0)}ms`);

    /* REV-0035 L5 — CA NGƯỢC: luồng vào là ỐNG DẪN có sẵn câu trả lời
       (`echo 0911994696 | node scripts/dat-lai-mat-khau.mjs 0911994696`).
       Bản cũ coi luôn là EOF và huỷ oan, vì readline phát 'line' rồi 'close'
       ngay trong cùng một nhịp còn `.then` chạy sau. */
    const rl2 = createInterface({
      input: Readable.from(['0911994696\n']),
      output: new Writable({ write(c, e, cb) { cb(); } })
    });
    let traLoi = null, loiOng = null;
    try { traLoi = await mod.hoiMotLan(rl2, 'xác nhận: '); } catch (e) { loiOng = e.message; }
    rl2.close();
    ok('L5 — ỐNG DẪN có câu trả lời thì NHẬN, không coi là EOF rồi huỷ oan',
       traLoi === '0911994696', loiOng ? `bị từ chối: ${loiOng}` : `nhận "${traLoi}"`);
  }
  /* CA ĐỐI CHỨNG CHO CHÍNH PHÉP ĐO NÀY (BH-16): nếu script LÀM ĐÚNG cái mà
     tao-tai-khoan.mjs làm (xoá sạch rồi dựng lại), phép đo trên có bắt được
     không? Không bắt được thì "không xoá gì" chỉ là chữ. */
  {
    const { db: db2 } = dungDB();
    moi(db2);
    const t1 = anhChupDB(db2);
    db2.exec('DELETE FROM nhan_su');                 // đúng kiểu seed.sql
    const khac2 = soSanhDB(t1, anhChupDB(db2));
    ok('ĐỐI CHỨNG — phép đo BẮT ĐƯỢC nếu script xoá dữ liệu như seed.sql',
       khac2.some(x => x.bang === 'nhan_su' && x.sau < x.truoc),
       khac2.map(x => `${x.bang} (${x.truoc}→${x.sau})`).join(', '));
    db2.close?.();
  }
  db.close?.();
}

/* ==========================================================================
   REV-0035 L1 — CHẠY THẬT CẢ SCRIPT CỨU HỘ, KHÔNG CHỈ IMPORT HÀM

   Bàn đo REV-0032 `import` đúng hai hàm sinh SQL rồi tuyên bố script an toàn.
   Nó chưa bao giờ CHẠY script — nên không thấy `execFileSync(..., {shell:true})`
   cắt vụn câu SQL, tức là đường cứu cuối cùng chưa từng chạy được lần nào mà
   bàn đo vẫn xanh. Đúng BH-47: bàn đo xanh mà lỗi còn thì sửa bàn đo trước.

   Từ đây bàn đo GỌI CHÍNH FILE ĐÓ như người vận hành gọi — tiến trình riêng,
   D1 `--local` thật, wrangler thật — đủ bốn đường: xác nhận · gõ nhầm ·
   số không tồn tại · tài khoản đang khoá; cộng ca đối chứng giữ `shell: true`.

   Cần `npm install` (wrangler nằm trong devDependencies). Thiếu thì các phép
   dưới TRƯỢT chứ không lặng lẽ bỏ qua — bỏ qua là bàn đo nói dối lần nữa.
   ========================================================================== */

console.log('\n=== REV-0035 L1: CHẠY THẬT SCRIPT CỨU HỘ TRÊN D1 --local =======\n');
{
  const duongScript = path.join(GOC, 'scripts', 'dat-lai-mat-khau.mjs');
  const modS = await import(pathToFileURL(duongScript).href);
  const TK = 'ttb';                       // tài khoản thử trên D1 bản máy
  const S = { loi: null };
  let BIN = null;
  try { BIN = modS.timWrangler(); } catch (e) { S.loi = e.message; }

  const d1 = (sql) => {
    const raw = execFileSync(process.execPath,
      [BIN, 'd1', 'execute', 'crm-agc', '--local', '--command', sql, '--json'],
      { encoding: 'utf8', cwd: GOC });
    return JSON.parse(raw.slice(raw.indexOf('[')))[0].results;
  };
  const doc = () => d1(`SELECT ten_dang_nhap, mat_khau_hash, phai_doi_mk, kich_hoat ` +
                       `FROM tai_khoan WHERE ten_dang_nhap = '${TK}'`)[0];
  const dem = () => d1('SELECT COUNT(*) AS n FROM tai_khoan')[0].n;
  const chay = (script, doiSo, goVao) => {
    const k = spawnSync(process.execPath, [script, ...doiSo],
      { input: goVao, encoding: 'utf8', cwd: GOC, timeout: 180000 });
    return { ma: k.status, ra: (k.stdout || '') + (k.stderr || '') };
  };
  const layMk = (ra) => (String(ra).match(/Mật khẩu tạm\s*:\s*(\S+)/) || [])[1] || null;

  if (!S.loi) try {
    /* Dựng đúng cái fixture script cần: câu tra cứu của nó đọc `t.duyet_gopy`,
       cột do `them-quyen-duyet-gopy.sql` thêm. D1 bản máy của người chạy có
       thể chưa nạp migration đó — thêm đúng một cột, đúng khuôn migration, và
       nói ra là đã thêm. Bàn đo dựng fixture thì phải khai, không làm lén. */
    const cot = d1('PRAGMA table_info(tai_khoan)').map(x => x.name);
    if (!cot.includes('duyet_gopy')) {
      d1('ALTER TABLE tai_khoan ADD COLUMN duyet_gopy INTEGER NOT NULL DEFAULT 0');
      console.log('   (bàn đo đã thêm cột duyet_gopy vào D1 bản máy — đúng khuôn them-quyen-duyet-gopy.sql)');
    }
    const goc = doc();
    if (!goc) throw new Error(`D1 bản máy chưa có tài khoản "${TK}" — nạp schema.sql + seed.sql trước.`);
    S.demTruoc = dem();

    // ① SỐ KHÔNG TỒN TẠI → dừng, không ghi gì
    S.khongCo = chay(duongScript, ['khongcotaikhoannay'], 'khongcotaikhoannay\n');
    S.demSauKhongCo = dem();

    // ② GÕ NHẦM số xác nhận → HUỶ
    S.goNham = chay(duongScript, [TK], 'gonhamso\n');
    S.hashSauGoNham = doc().mat_khau_hash;

    // ③ KHÔNG CÓ BÀN PHÍM (luồng vào rỗng — đúng cảnh CI/cron) → HUỶ
    S.khongBanPhim = chay(duongScript, [TK], '');
    S.hashSauKhongBanPhim = doc().mat_khau_hash;

    // ④ ĐƯỜNG CHÍNH — xác nhận đúng, đưa vào qua ỐNG DẪN (REV-0035 L5)
    S.chinh = chay(duongScript, [TK], TK + '\n');
    S.mk = layMk(S.chinh.ra);
    const sau = doc();
    S.hashDoi = sau.mat_khau_hash !== goc.mat_khau_hash;
    S.phaiDoiMk = Number(sau.phai_doi_mk);
    S.mkDungHash = S.mk ? await kiemTraMatKhau(S.mk, sau.mat_khau_hash) : false;
    S.demSauChinh = dem();

    // ⑤ TÀI KHOẢN ĐANG KHOÁ → cùng câu lệnh đó bật lại kich_hoat
    d1(`UPDATE tai_khoan SET kich_hoat = 0 WHERE ten_dang_nhap = '${TK}'`);
    S.khoa = chay(duongScript, [TK], TK + '\n');
    S.kichHoatSauKhoa = Number(doc().kich_hoat);

    // ⑥ ĐỐI CHỨNG (BH-16) — đúng bản cũ: `npx` + `shell: true`. Phép đo phải bắt.
    const thuMuc = path.join(GOC, '.dc-script-cuu-ho');
    rmSync(thuMuc, { recursive: true, force: true });
    mkdirSync(thuMuc, { recursive: true });
    const nguyen = readFileSync(duongScript, 'utf8');
    const banHong = nguyen
      .replace("const args = [timWrangler(), 'd1'", "const args = ['wrangler', 'd1'")
      .replace("return execFileSync(process.execPath, args, { encoding: 'utf8' });",
               "return execFileSync('npx', args, { encoding: 'utf8', shell: true });");
    S.doiChungDoiThat = banHong !== nguyen;
    const duongHong = path.join(thuMuc, 'dat-lai-mat-khau.mjs');
    writeFileSync(duongHong, banHong, 'utf8');
    S.hong = chay(duongHong, [TK], TK + '\n');
    S.hongMk = layMk(S.hong.ra);
    rmSync(thuMuc, { recursive: true, force: true });

    // Trả tài khoản thử về nguyên trạng — bàn đo không để lại dấu.
    d1(`UPDATE tai_khoan SET mat_khau_hash = '${goc.mat_khau_hash}', ` +
       `phai_doi_mk = ${Number(goc.phai_doi_mk)}, kich_hoat = ${Number(goc.kich_hoat)} ` +
       `WHERE ten_dang_nhap = '${TK}'`);
    S.traLai = doc().mat_khau_hash === goc.mat_khau_hash;
  } catch (e) { S.loi = e.message; }

  const vi = (x) => S.loi ? `KHÔNG ĐO ĐƯỢC: ${S.loi}` : x;
  ok('Script CHẠY THẬT được: xác nhận đúng (qua ống dẫn) → thoát 0, in ra mật khẩu tạm',
     !S.loi && S.chinh?.ma === 0 && !!S.mk && !/Unknown arguments/.test(S.chinh?.ra || ''),
     vi(`thoát ${S.chinh?.ma} · mật khẩu tạm ${S.mk ? 'có' : 'KHÔNG'}`));
  ok('Mật khẩu tạm đó ĐĂNG NHẬP ĐƯỢC (khớp kiemTraMatKhau của src/auth.js), phai_doi_mk = 1',
     !S.loi && S.hashDoi && S.mkDungHash && S.phaiDoiMk === 1,
     vi(`hash ${S.hashDoi ? 'đã đổi' : 'KHÔNG đổi'} · khớp: ${S.mkDungHash} · phai_doi_mk=${S.phaiDoiMk}`));
  ok('Chạy thật KHÔNG thêm không bớt dòng nào trong tai_khoan',
     !S.loi && S.demTruoc === S.demSauChinh && S.demTruoc === S.demSauKhongCo,
     vi(`${S.demTruoc} → ${S.demSauKhongCo} → ${S.demSauChinh} dòng`));
  ok('GÕ NHẦM số xác nhận → thoát 1, "Đã HUỶ", mật khẩu NGUYÊN VẸN',
     !S.loi && S.goNham?.ma === 1 && /Đã HUỶ/.test(S.goNham?.ra || '')
       && S.hashSauGoNham === S.hashSauKhongBanPhim,
     vi(`thoát ${S.goNham?.ma}`));
  ok('SỐ KHÔNG TỒN TẠI → thoát 1, nói rõ "KHÔNG ghi gì cả"',
     !S.loi && S.khongCo?.ma === 1 && /Không có tài khoản nào/.test(S.khongCo?.ra || ''),
     vi(`thoát ${S.khongCo?.ma} · ${(S.khongCo?.ra || '').split('\n').filter(Boolean).pop() || ''}`.slice(0, 90)));
  ok('KHÔNG CÓ BÀN PHÍM (CI/cron) → thoát 1, không ghi gì',
     !S.loi && S.khongBanPhim?.ma === 1 && /Đã HUỶ/.test(S.khongBanPhim?.ra || ''),
     vi(`thoát ${S.khongBanPhim?.ma}`));
  ok('TÀI KHOẢN ĐANG KHOÁ → chạy thật xong thì kich_hoat = 1, có báo trước khi hỏi',
     !S.loi && S.khoa?.ma === 0 && /TÀI KHOẢN ĐANG BỊ KHOÁ/.test(S.khoa?.ra || '')
       && S.kichHoatSauKhoa === 1,
     vi(`thoát ${S.khoa?.ma} · kich_hoat = ${S.kichHoatSauKhoa}`));
  ok('ĐỐI CHỨNG — giữ nguyên `shell: true` thì phép đo BẮT ĐƯỢC (chết ngay [1/3])',
     !S.loi && S.doiChungDoiThat && S.hong?.ma !== 0 && !S.hongMk,
     vi(`bản hỏng thoát ${S.hong?.ma} · ${/Unknown arguments/.test(S.hong?.ra || '') ? 'Unknown arguments' : 'lỗi khác'}`));
  ok('Bàn đo trả tài khoản thử về nguyên trạng, không để lại dấu',
     !S.loi && S.traLai === true, vi(String(S.traLai)));
}

/* ==========================================================================
   REV-0030 LỖI 5 — L4 HỎNG AN TOÀN NHƯNG IM LẶNG VĨNH VIỄN
   ========================================================================== */

async function doImLang(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;
  const tokenAn = await taoPhienThat(env, 4);

  db.exec('DROP INDEX IF EXISTS idx_taikhoan_duyetgopy');
  db.exec('ALTER TABLE tai_khoan DROP COLUMN duyet_gopy');

  TELEGRAM.length = 0; TELEGRAM_CT.length = 0;
  const { dong } = await batConsole(async () => {
    for (const d of DUONG_SONG_CON) await goiAPI(worker, env, d, tokenAn);
  });
  const r = { dongLog: dong.filter(x => /duyet_gopy/i.test(x)).length, tin: TELEGRAM.length };
  // Lượt thứ hai trong CÙNG MỘT NGÀY — không được bắn thêm tin nào nữa.
  await batConsole(async () => {
    for (const d of DUONG_SONG_CON) await goiAPI(worker, env, d, tokenAn);
  });
  r.tinSauLuot2 = TELEGRAM.length;
  db.close?.();
  return r;
}

console.log('\n=== LỖI 5: THIẾU CỘT THÌ CÓ AI ĐƯỢC BÁO KHÔNG? =================\n');
const im = await doImLang(SRC);
ok('Có ít nhất một dòng console nói rõ thiếu cột duyet_gopy',
   im.dongLog >= 1, im.dongLog + ' dòng');
ok('Có ĐÚNG MỘT tin Telegram cảnh báo', im.tin === 1, im.tin + ' tin');
ok('Chạy lại trong cùng ngày KHÔNG bắn thêm tin (chống lặp bằng sao_luu_canh_bao)',
   im.tinSauLuot2 === 1, im.tinSauLuot2 + ' tin sau 2 lượt');

/* ==========================================================================
   REV-0030 LỖI 6 — GÓP Ý CỦA SẾP CÓ ĐƯỢC HỒ LY CHẤM KHÔNG?
   + LỖ DỮ LIỆU: khôi phục bản sao lưu chụp TRƯỚC migration → cờ về 0 toàn bộ
   ========================================================================== */

const AI_GIA = { run: async () => ({
  response: '{"loai":"loi","risk":"MEDIUM","ly_do_risk":"chỉ 1 màn hình","spec":"SPEC-NHAP-CUA-MAY"}' }) };

async function doTriage(thuMucSrc) {
  const t = await motVong(thuMucSrc, { AI: AI_GIA });
  t.db.exec("DELETE FROM gop_y_lich_su; DELETE FROM gop_y;");
  const idSep = (await t.gui('SEP', 'Sếp tự góp ý: gộp báo cáo tồn kho')).than?.id;
  const idAn  = (await t.gui('AN',  'Nhân viên góp ý: máy quét kêu to')).than?.id;
  await goiCron(t.worker, t.env);
  const doc = (id) => t.db.prepare(
    'SELECT trang_thai, de_xuat_risk, de_xuat_spec, tu_dong_xu_luc FROM gop_y WHERE id = ?').get(id);
  const r = { sep: doc(idSep), an: doc(idAn) };
  // Chạy cron lần hai — đã chấm rồi thì KHÔNG chấm lại (tu_dong_xu_luc IS NULL).
  const truoc = r.sep?.tu_dong_xu_luc;
  await goiCron(t.worker, t.env);
  r.chamLai = doc(idSep)?.tu_dong_xu_luc !== truoc;
  t.db.close?.();
  return r;
}

async function doMatHetCo(thuMucSrc) {
  const t = await motVong(thuMucSrc);
  TELEGRAM.length = 0;
  // Đúng ca: khôi phục một bản sao lưu CSV chụp TRƯỚC migration → cột có
  // nhưng mọi dòng về mặc định 0.
  t.db.exec('UPDATE tai_khoan SET duyet_gopy = 0');
  await goiCron(t.worker, t.env);
  const dem = () => TELEGRAM.filter(x => /KHÔNG CÒN AI DUYỆT/i.test(x)).length;
  const r = { tin: dem() };
  await goiCron(t.worker, t.env);
  r.tinSauLuot2 = dem();
  // CA NGƯỢC — bật lại cờ cho đúng 1 người thì KHÔNG được báo oan
  const t2 = await motVong(thuMucSrc);
  TELEGRAM.length = 0;
  await goiCron(t2.worker, t2.env);
  r.tinKhiVanConNguoiDuyet = TELEGRAM.filter(x => /KHÔNG CÒN AI DUYỆT/i.test(x)).length;
  t.db.close?.(); t2.db.close?.();
  return r;
}

console.log('\n=== LỖI 6: HỒ LY CÓ CHẤM GÓP Ý CỦA SẾP KHÔNG? ==================\n');
const tr = await doTriage(SRC);
ok('Góp ý của Sếp vào thẳng cho_phan_tich VẪN được Hồ Ly chấm',
   tr.sep?.trang_thai === 'cho_phan_tich' && tr.sep?.de_xuat_risk === 'MEDIUM'
     && !!tr.sep?.de_xuat_spec && !!tr.sep?.tu_dong_xu_luc,
   `${tr.sep?.trang_thai} · risk ${tr.sep?.de_xuat_risk} · spec ${tr.sep?.de_xuat_spec ? 'có' : 'KHÔNG'}`);
ok('CA NGƯỢC — góp ý "moi" của nhân viên vẫn được chấm như cũ',
   tr.an?.trang_thai === 'moi' && tr.an?.de_xuat_risk === 'MEDIUM',
   `${tr.an?.trang_thai} · risk ${tr.an?.de_xuat_risk}`);
ok('Chạy cron lần hai KHÔNG chấm lại cái đã chấm', !tr.chamLai);

console.log('\n— LỖ DỮ LIỆU: sao lưu chụp TRƯỚC migration → cờ về 0 toàn bộ —');
const mh = await doMatHetCo(SRC);
ok('Không còn ai giữ cờ → ERP TỰ PHÁT HIỆN và báo Telegram', mh.tin === 1, mh.tin + ' tin');
ok('Chống lặp: lượt cron sau trong cùng ngày không bắn thêm',
   mh.tinSauLuot2 === 1, mh.tinSauLuot2 + ' tin');
ok('CA NGƯỢC — vẫn còn người giữ cờ thì KHÔNG báo oan',
   mh.tinKhiVanConNguoiDuyet === 0, mh.tinKhiVanConNguoiDuyet + ' tin');

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
    'góp ý của nhân viên thường cũng bỏ qua cả hai cổng (cắt quá tay)'],

  /* ---- Ca đối chứng cho SÁU lỗi REV-0030 ------------------------------- */

  ['L-dong-ho-doc-cap-nhat-luc', (f, s) => f === 'index.js'
    ? s.replace('julianday(COALESCE(g.cho_duyet_tu_luc, g.cap_nhat_luc, g.tao_luc))',
                'julianday(COALESCE(g.cap_nhat_luc, g.tao_luc))') : s,
    doDongHoSla,
    (d) => d.chuLai?.[11] !== 'OWNER' || d.chuLai?.[12] !== 'OWNER',
    'đồng hồ SLA đo bằng cap_nhat_luc → một cú "giao người phụ trách" là đẩy lùi ngày thứ 5 (cửa 14)'],

  ['M-gui-lai-bo-quen-viec-7', (f, s) => f === 'index.js'
    ? s.replace('    } else if (!ql1GuiLai.id) {', '    } else if (false) {') : s,
    doGuiLai,
    (d) => d.sauPhongGuiLai?.next_owner !== 'OWNER',
    'gửi lại sau từ chối tụt về QL_CAP1 không tồn tại (cửa 15)'],

  ['N-gui-lai-ho-noi-doi', (f, s) => f === 'index.js'
    ? s.replace('`${phien.ho_ten || phien.ten_dang_nhap} gửi lại hộ ${g.nguoi_gui_ten || g.nguoi_gui_id} (lần ${lanMoi})`',
                '`Người gửi đã sửa và gửi lại (lần ${lanMoi})`') : s,
    doGuiLai,
    (d) => (d.lsAdminGuiLaiHo || []).some(x => /Người gửi đã sửa/.test(x.ghi_chu || '')),
    'admin gửi lại hộ nhưng sổ ghi "Người gửi đã sửa" (cửa 16)'],

  ['O-tra-thang-mat-khau-tam', (f, s) => f === 'index.js'
    ? s.replace("return json({ ok: true, ten_dang_nhap: tk.ten_dang_nhap, da_gui_kenh_rieng: true });",
                'return json({ ok: true, ten_dang_nhap: tk.ten_dang_nhap, da_gui_kenh_rieng: true, mat_khau_tam: matKhauTam });') : s,
    doKhoiPhuc,
    (d) => !!d.mk && JSON.stringify(d.than || {}).includes(d.mk),
    'mật khẩu tạm của Sếp rò về tay người bấm qua JSON (lỗi 2, đường rò a)'],

  ['P-canh-bao-thieu-cot-im-lang', (f, s) => f === 'auth.js'
    ? s.replace('    thieuCotDuyetGopY = true;', '    thieuCotDuyetGopY = false;') : s,
    doImLang,
    (d) => d.tin !== 1,
    'thiếu cột duyet_gopy mà không ai được báo — im lặng vĩnh viễn (lỗi 5)'],

  ['Q-triage-chi-quet-moi', (f, s) => f === 'index.js'
    ? s.replace("FROM gop_y WHERE trang_thai IN ('moi', 'cho_phan_tich') AND tu_dong_xu_luc IS NULL",
                "FROM gop_y WHERE trang_thai = 'moi' AND tu_dong_xu_luc IS NULL") : s,
    doTriage,
    (d) => !d.sep?.de_xuat_risk || !d.sep?.tu_dong_xu_luc,
    'góp ý của Sếp không bao giờ được Hồ Ly chấm (lỗi 6)'],

  /* ---- Ca đối chứng cho REV-0032 --------------------------------------- */

  /* DC-R — bỏ `cho_duyet_tu_luc` khỏi ảnh chụp hoàn tác, tức là quay về đúng
     cây 53c77ef. Không có ca này thì bàn đo lại xanh trong khi cửa 17 còn
     nguyên (BH-47). */
  ['R-hoan-tac-bo-quen-dong-ho', (f, s) => f === 'index.js'
    ? s.replace("  'cho_duyet_tu_luc'];", '];') : s,
    doDongHoSla,
    (d) => d.chuLai?.[15] !== 'OWNER' || d.sauHoanTac15?.cho_duyet_tu_luc !== CU5NGAY,
    'duyệt rồi hoàn tác là xoá sạch tuổi hàng chờ — cron thôi đẩy lên Sếp (cửa 17)'],

  /* DC-S — gỡ chốt "hai chat id không được trùng nhau" (M1). */
  ['S-bo-chot-chia-trung', (f, s) => f === 'index.js'
    ? s.replace('  if (khoiPhucHo && env.TELEGRAM_CHAT_ID &&',
                '  if (false && khoiPhucHo && env.TELEGRAM_CHAT_ID &&') : s,
    doKhoiPhuc,
    (d) => d.chiaTrung !== 409 || d.tinNhomKhiChiaTrung > 0,
    'đặt nhầm chat id nhóm chung → mật khẩu tạm của Sếp phát cho cả công ty (M1)'],

  /* DC-T — gỡ chốt nhịp (M2). */
  ['T-bo-chot-nhip', (f, s) => f === 'index.js'
    ? s.replace('if (khoiPhucHo && tk.nhan_su_id) {', 'if (false && tk.nhan_su_id) {') : s,
    doKhoiPhuc,
    (d) => d.bam2 !== 429 || d.hashDoiKhiBam2 || d.phienConSauBam2 !== 1,
    'bấm liên tục là sinh mật khẩu mới và đá phiên Sếp không giới hạn (M2)'],

  /* DC-V — so hai chat id CHỈ BẰNG CHUỖI, đúng bản trước REV-0035 (L2). */
  ['V-so-chat-chi-so-chuoi', (f, s) => f === 'index.js'
    ? s.replace('cungMotChat(env.TELEGRAM_CHAT_ID_SEP, env.TELEGRAM_CHAT_ID)',
                'String(env.TELEGRAM_CHAT_ID_SEP).trim() === String(env.TELEGRAM_CHAT_ID).trim()') : s,
    doKhoiPhuc,
    (d) => d.soKhongThua !== 409 || d.tinNhomKhiSoKhongThua > 0,
    'chat id thừa số 0 ở đầu lọt chốt trùng → mật khẩu tạm vào nhóm chung (L2)'],

  /* DC-W — trả chốt nhịp về HỎNG-MỞ: đọc sổ lỗi thì cho qua (L3). */
  ['W-chot-nhip-hong-mo', (f, s) => f === 'index.js'
    ? s.replace("      return loi('Không kiểm được chốt nhịp",
                "      ganDay = null; if (false) return loi('Không kiểm được chốt nhịp") : s,
    doKhoiPhuc,
    (d) => d.soHong !== 503 || d.hashDoiKhiSoHong || d.tinRiengKhiSoHong > 0,
    'mất bảng nhan_su_lich_su → chốt nhịp tắt âm thầm mà vẫn phát mật khẩu (L3)'],

  /* DC-U — quay lại "ghi hỏng thì im lặng" (L5). */
  ['U-ghi-hong-im-lang', (f, s) => f === 'index.js'
    ? s.replace('if (!khoiPhucHo) throw e;', 'throw e;') : s,
    doKhoiPhuc,
    (d) => !/KHÔI PHỤC ĐĂNG NHẬP HỎNG NỬA CHỪNG/.test(d.ghiHongConsole || '')
        || !(d.ghiHongTinSep || []).some(x => /KHÔNG dùng được/.test(x.noi_dung)),
    'Telegram gửi xong mà ghi hỏng → 0 dấu vết trong ERP, công ty không biết (L5)']
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
