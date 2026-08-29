/* ==========================================================================
   BÀN ĐO QUYỀN — MÀN VIỆC GỘP (Lịch sử làm việc, 4 phạm vi)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-quyen-man-viec-gop.mjs
   0 mạng · 0 D1 thật · 0 token. SQLite THẬT trong RAM + `worker.fetch()` NGUYÊN
   BẢN qua router. Mọi kết luận đọc từ JSON THẬT — KHÔNG nhìn màn hình, KHÔNG
   khớp chuỗi SQL bằng tay (BH-34).

   VÌ SAO. Gộp ba tab về một màn là lúc dễ MỞ RỘNG QUYỀN mà không ai để ý: bốn
   phạm vi nằm cạnh nhau trên cùng một bảng, nhìn như bốn nút ngang hàng, nên
   rất dễ tưởng "thêm một cái nút" là xong. Ràng buộc Sếp Ngọc đặt:
     · "Toàn công ty" (khối TỔNG HỢP) vẫn CHỈ Admin.
     · `hcns` vẫn xem được TOÀN BỘ việc ở Lịch sử làm việc (đúng như e9170de).
     · Cắt ở MÁY CHỦ — giấu nút ở giao diện không phải là quyền.

   ĐO GÌ
     ① `cvDanhSach` — ba phạm vi CỦA TÔI: ai gọi cũng CHỈ ra việc của chính họ.
     ② `cvLichSu` — phạm vi "Toàn công ty": mọi vai có tab `lichsuviec` (kể cả
        `hcns` và nhân viên kho) đều thấy việc của người khác. KHÔNG đổi.
     ③ `cvTongQuanCongTy` — khối TỔNG HỢP: chỉ Admin, vai khác 403.
     ④ Cửa `lichsuviec` là CỬA THẬT: gỡ tab đó khỏi một vai thì `cvLichSu` 403.

   CA ĐỐI CHỨNG (BH-16) — mỗi ca bẻ ĐÚNG MỘT chỗ trong `src/`, và phải nói
   TRƯỚC vì sao kết quả BẮT BUỘC phải khác:
     DC-1  bỏ `WHERE nguoi_nhan_id = ?` ở cvDanhSach  → việc người khác rò vào
           "Việc của tôi" — đúng lớp lỗi nguy hiểm nhất của lần gộp này
     DC-2  bỏ cửa `laAdmin` ở cvTongQuanCongTy        → nhân viên xem được số
           liệu toàn công ty
     DC-3  bỏ cửa `duocXemTab(...,'lichsuviec')`      → cửa chỉ là trang trí
   ========================================================================== */

import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = path.join(GOC, '.tam-do-quyen-gop');

datDongHo('2026-08-29T03:00:00Z');          // 10:00 giờ VN

const NGUOI = [
  // id      họ tên              bộ phận         quản lý  vai trò
  ['SEP',   'Bùi Thị Ngọc',     'Ban giám đốc',  null,   'admin'],
  ['DUY',   'Phạm Khương Duy',  'Kho vận',       'SEP',  'quan_ly_kho'],
  ['AN',    'Nguyễn Văn An',    'Kho vận',       'DUY',  'nhan_vien_kho'],   // nhân viên THƯỜNG
  ['HUONG', 'Vũ Lan Hương',     'Hành chính',    'SEP',  'hcns'],
  ['HANG',  'Phan Thị Hằng',    'Kế toán',       'SEP',  'ke_toan_truong']
];

function moi(db) {
  db.exec('DELETE FROM thong_bao; DELETE FROM cong_viec; DELETE FROM muc_tieu;' +
          'DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam) VALUES (?,?,?,?,?,?,1)');
  const tk = db.prepare(
    'INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk) VALUES (?,?,?,?,?,1,0)');
  NGUOI.forEach(([id, ten, bp, ql, vt], i) => {
    ns.run(id, ten, id.slice(0, 2), 'NV', bp, ql);
    tk.run(i + 1, id, 'tk' + id, 'pbkdf2$1$x$x', vt);
  });

  const cv = db.prepare(`INSERT INTO cong_viec
    (id, tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten,
     phoi_hop_ids, han_chot, trang_thai, tao_luc, cap_nhat_luc)
    VALUES (?,?,?,?,?,?,?,?,?,?,'2026-08-25 09:00:00','2026-08-26 09:00:00')`);
  // 1: SEP giao AN. 2: DUY giao HANG (không dính dây tới AN).
  // 3: HUONG giao HANG. 4: AN giao DUY. 5: SEP giao HUONG, mời AN phối hợp.
  cv.run(1, 'Kiểm kê hàng nhập', 'Biên bản ký', 'SEP', 'Bùi Thị Ngọc', 'AN', 'Nguyễn Văn An', null, '2026-09-01', 'moi');
  cv.run(2, 'Đối soát Shopee T8', 'Bảng khớp', 'DUY', 'Phạm Khương Duy', 'HANG', 'Phan Thị Hằng', null, '2026-09-02', 'dang_lam');
  cv.run(3, 'Hồ sơ BHXH tháng 8', 'Nộp đúng hạn', 'HUONG', 'Vũ Lan Hương', 'HANG', 'Phan Thị Hằng', null, '2026-09-03', 'cho_duyet');
  cv.run(4, 'Dọn kệ A3', 'Kệ trống', 'AN', 'Nguyễn Văn An', 'DUY', 'Phạm Khương Duy', null, '2026-09-04', 'moi');
  cv.run(5, 'Chuyển đổi pháp nhân', 'Xong hồ sơ', 'SEP', 'Bùi Thị Ngọc', 'HUONG', 'Vũ Lan Hương', ',AN,', '2026-09-05', 'dang_lam');
}

async function dungVong(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;
  const phien = {};
  for (let i = 0; i < NGUOI.length; i++) phien[NGUOI[i][0]] = await taoPhienThat(env, i + 1);
  const g = (ai, duong) => goiAPI(worker, env, duong, phien[ai]);
  return {
    danhSach: (ai) => g(ai, '/api/cong-viec/danh-sach'),
    lichSu:   (ai) => g(ai, '/api/cong-viec/lich-su'),
    tongQuan: (ai) => g(ai, '/api/cong-viec/tong-quan-congty')
  };
}

/** Bẻ gãy ĐÚNG MỘT chỗ trong một bản sao của `src/`. */
function banBeGay(ten, tep, doi) {
  const dich = path.join(TAM, ten);
  rmSync(dich, { recursive: true, force: true });
  mkdirSync(dich, { recursive: true });
  cpSync(path.join(GOC, 'src'), dich, { recursive: true });
  const f = path.join(dich, tep);
  const truoc = readFileSync(f, 'utf8');
  const sau = doi(truoc);
  if (sau === truoc) throw new Error(`${ten}: KHÔNG bẻ được gì — ca đối chứng vô nghĩa, phép đo hỏng`);
  writeFileSync(f, sau, 'utf8');
  return dich;
}

const id = (r) => (r.than && Array.isArray(r.than.viec) ? r.than.viec : []).map(v => v.id).sort();
const idNhan = (r) => (r.than && r.than.nhan ? r.than.nhan : []).map(v => v.id).sort();
const idGiao = (r) => (r.than && r.than.giao ? r.than.giao : []).map(v => v.id).sort();
const idPh = (r) => (r.than && r.than.phoi_hop ? r.than.phoi_hop : []).map(v => v.id).sort();
const bang = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\n' + '='.repeat(72));
console.log('BÀN ĐO QUYỀN — MÀN VIỆC GỘP (4 phạm vi ở Lịch sử làm việc)');
console.log('='.repeat(72));

const T = await dungVong(path.join(GOC, 'src'));

/* ---- ① BA PHẠM VI "CỦA TÔI" — cvDanhSach ------------------------------- */
console.log('\n=== ① "Việc của tôi / Tôi phối hợp / Tôi giao" — cvDanhSach ===\n');
{
  const r = await T.danhSach('AN');   // nhân viên kho — vai thấp nhất
  ok('nhân viên thường gọi được', r.status === 200, `HTTP ${r.status}`);
  ok('  Việc của tôi = ĐÚNG việc mình nhận (#1)', bang(idNhan(r), [1]), JSON.stringify(idNhan(r)));
  ok('  Tôi giao = ĐÚNG việc mình giao (#4)', bang(idGiao(r), [4]), JSON.stringify(idGiao(r)));
  ok('  Tôi phối hợp = ĐÚNG việc được mời (#5)', bang(idPh(r), [5]), JSON.stringify(idPh(r)));
  const het = [...idNhan(r), ...idGiao(r), ...idPh(r)];
  ok('  ⚠️ KHÔNG rò việc người khác (#2, #3)', !het.includes(2) && !het.includes(3), JSON.stringify(het));
}
{
  const r = await T.danhSach('HUONG');  // hcns
  ok('hcns: ba phạm vi vẫn CHỈ là việc của chính hcns',
    bang(idNhan(r), [5]) && bang(idGiao(r), [3]) && bang(idPh(r), []),
    `nhan ${JSON.stringify(idNhan(r))} · giao ${JSON.stringify(idGiao(r))}`);
}
{
  const r = await T.danhSach('SEP');    // admin
  ok('Admin: ba phạm vi CŨNG chỉ là việc của chính Sếp — không phải cửa xem all',
    bang(idNhan(r), []) && bang(idGiao(r), [1, 5]),
    `nhan ${JSON.stringify(idNhan(r))} · giao ${JSON.stringify(idGiao(r))}`);
}

/* ---- ② PHẠM VI "TOÀN CÔNG TY" — cvLichSu ------------------------------- */
console.log('\n=== ② Phạm vi "Toàn công ty" — cvLichSu (KHÔNG đổi quyền) ===\n');
const HET = [1, 2, 3, 4, 5];
for (const [ai, mo] of [['AN', 'nhân viên kho (thường)'], ['HUONG', 'hcns'], ['HANG', 'kế toán trưởng'], ['SEP', 'Admin']]) {
  const r = await T.lichSu(ai);
  ok(`${mo}: thấy TOÀN BỘ việc công ty`, r.status === 200 && bang(id(r), HET),
    `HTTP ${r.status} · ${JSON.stringify(id(r))}`);
}
console.log('  (đúng như e9170de/21-08 đã mở: tab `lichsuviec` cấp cho MỌI vai trò —');
console.log('   bản gộp này chỉ đổi CHỖ NHÌN, không đổi một dòng quyền nào)');

/* ---- ③ KHỐI TỔNG HỢP "toàn công ty" — chỉ Admin ------------------------ */
console.log('\n=== ③ Khối TỔNG HỢP toàn công ty — cvTongQuanCongTy: CHỈ Admin ===\n');
{
  const r = await T.tongQuan('SEP');
  ok('Admin: 200 và có số liệu', r.status === 200 && Number.isFinite(r.than?.dang_mo), `HTTP ${r.status}`);
}
for (const [ai, mo] of [['AN', 'nhân viên kho'], ['HUONG', 'hcns'], ['DUY', 'quản lý kho'], ['HANG', 'kế toán trưởng']]) {
  const r = await T.tongQuan(ai);
  ok(`${mo}: bị chặn 403 ở MÁY CHỦ`, r.status === 403, `HTTP ${r.status}`);
}

/* ---- ④ + CA ĐỐI CHỨNG --------------------------------------------------- */
console.log('\n=== ④ CA ĐỐI CHỨNG (BH-16) — bẻ chỗ vá, phép kiểm phải BẮT ĐƯỢC ===\n');

{
  const b = await dungVong(banBeGay('dc1', 'index.js', s =>
    s.replace('`SELECT ${CV_COT} FROM ${CV_TU} WHERE c.nguoi_nhan_id = ?',
              '`SELECT ${CV_COT} FROM ${CV_TU} WHERE (? IS NOT NULL)')));
  const r = await b.danhSach('AN');
  ok('DC-1 bỏ lọc theo người nhận → việc người khác RÒ vào "Việc của tôi"',
    idNhan(r).length > 1, JSON.stringify(idNhan(r)));
}
{
  /* Cắt cửa Admin CHỈ trong `cvTongQuanCongTy` — `laAdmin(phien.vai_tro)` còn
     ở nhiều hàm khác, thay hết là bẻ nhầm nửa ERP rồi kết luận sai. Chặt file
     tại đầu hàm rồi mới thay lần XUẤT HIỆN ĐẦU TIÊN sau đó. */
  const b = await dungVong(banBeGay('dc2', 'index.js', s => {
    const moc = s.indexOf('async function cvTongQuanCongTy');
    if (moc < 0) return s;
    const dau = s.slice(0, moc), duoi = s.slice(moc);
    return dau + duoi.replace("if (!laAdmin(phien.vai_tro)) return loi('Bạn không có quyền', 403);", '');
  }));
  const r = await b.tongQuan('AN');
  ok('DC-2 bỏ cửa laAdmin → nhân viên xem được số liệu toàn công ty', r.status === 200, `HTTP ${r.status}`);
}
{
  /* Cửa `lichsuviec` có THẬT không? Gỡ tab đó khỏi vai `nhan_vien_kho` trong
     bảng quyền: nếu `cvLichSu` vẫn trả 200 thì `duocXemTab` chỉ là trang trí. */
  const b = await dungVong(banBeGay('dc3', 'quyen.js', s =>
    s.replace(/nhan_vien_kho:\s*\{ tab: \['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec'/,
              "nhan_vien_kho:   { tab: ['tongquan', 'danhba', 'chat', 'congviec'")));
  const r = await b.lichSu('AN');
  ok('DC-3 gỡ tab `lichsuviec` của một vai → cvLichSu chặn 403 (cửa CÓ THẬT)',
    r.status === 403, `HTTP ${r.status}`);
  const r2 = await b.danhSach('AN');
  ok('  → nhưng ba phạm vi CỦA TÔI vẫn chạy (không khoá nhầm)', r2.status === 200, `HTTP ${r2.status}`);
}

rmSync(TAM, { recursive: true, force: true });
process.exit(tongKet() ? 0 : 1);
