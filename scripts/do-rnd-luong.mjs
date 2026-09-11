/* ==========================================================================
   BÀN ĐO LUỒNG R&D SẢN PHẨM — chạy trọn một vòng trên SQLite thật, qua đúng
   bộ định tuyến và đăng nhập thật của Worker (không gọi thẳng hàm nghiệp vụ)
   ---------------------------------------------------------------------------
   Chạy:  npm run do-rnd        (node scripts/do-rnd-luong.mjs)

   VÌ SAO CÓ BÀN NÀY (gộp R&D lên main, 11/09/2026):
   Màn R&D dựng ngày 06/09 trên một gốc cũ, lúc quyền còn đọc theo MỘT cột
   `vai_tro`. Main sau đó tách hai lớp (vai trò hệ thống + vị trí công việc).
   Bản cũ gọi `duocSuaSanPham(phien.vai_tro)` — với người có vai trò
   `nguoi_dung` và vị trí `van_hanh_san` thì hàm chỉ thấy 'nguoi_dung' và trả
   KHÔNG. Tức là chính đội Vận hành sàn, người phải làm R&D, bị chặn tạo dự
   án. Bàn này khoá đúng ca đó, và đi qua cả luồng: tạo → chặn ở cổng khi còn
   việc bắt buộc → tick → sang giai đoạn → mã RD tăng đúng.

   Không ghi gì lên dữ liệu thật: mọi thứ nằm trong SQLite bộ nhớ dựng từ
   schema.sql + migrations/ (scripts/ban-thu-d1.mjs).
   ========================================================================== */

import { dungDB, dungEnv, taoPhienThat, goiAPI, ok, tongKet } from './ban-thu-d1.mjs';
import { duocSuaSanPham } from '../src/quyen.js';

const worker = (await import('../src/index.js')).default;
const { db, d1 } = dungDB();
const env = dungEnv(d1);

/* ---- Bốn người, bốn kiểu quyền ------------------------------------------ */
function taoNguoi(id, ten, vaiTro, viTri) {
  db.prepare(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam)
              VALUES (?, ?, ?, ?, ?, NULL, 1)`).run(id, ten, ten.slice(0, 2).toUpperCase(), 'Nhân viên', 'Thử');
  db.prepare(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, vi_tri_cong_viec)
              VALUES (?, ?, 'x', ?, 1, ?)`).run(id, 'tk_' + id, vaiTro, viTri);
  return db.prepare('SELECT id FROM tai_khoan WHERE ten_dang_nhap = ?').get('tk_' + id).id;
}
const tkAdmin = taoNguoi('ns_ad', 'Quản trị', 'admin', null);
const tkVhs   = taoNguoi('ns_vh', 'Vận hành sàn', 'nguoi_dung', 'van_hanh_san');
const tkCskh  = taoNguoi('ns_cs', 'Chăm sóc KH', 'nguoi_dung', 'cskh');
const tkKho   = taoNguoi('ns_kh', 'Nhân viên kho', 'nguoi_dung', 'nhan_vien_kho');

const [tAdmin, tVhs, tCskh, tKho] = await Promise.all(
  [tkAdmin, tkVhs, tkCskh, tkKho].map(id => taoPhienThat(env, id)));
const POST = (than) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });

/* ---- ① Vì sao phải truyền cả phiên, không phải riêng vai_tro ------------- */
console.log('\n① Quyền hai lớp');
const chuThe = { vai_tro: 'nguoi_dung', vi_tri_cong_viec: 'van_hanh_san' };
ok('truyền CẢ phiên: Vận hành sàn sửa được R&D', duocSuaSanPham(chuThe) === true);
ok('đối chứng — truyền riêng vai_tro (cách của bản 06/09) thì bị chặn oan',
  duocSuaSanPham(chuThe.vai_tro) === false,
  'nếu dòng này đỏ thì phép đo ở trên không còn phân biệt được hai cách gọi');

/* ---- ② Ai xem được, ai sửa được ------------------------------------------ */
console.log('\n② Cửa xem / cửa sửa');
const dsVhs = await goiAPI(worker, env, '/api/rnd', tVhs);
ok('GET /api/rnd — Vận hành sàn: 200 (đường GET viết đúng hai dấu cách)', dsVhs.status === 200, 'nhận ' + dsVhs.status);
ok('… và máy chủ báo quyen.sua = true', dsVhs.than?.quyen?.sua === true, JSON.stringify(dsVhs.than?.quyen));
ok('… trả đủ 12 giai đoạn từ máy chủ', Array.isArray(dsVhs.than?.giai_doan) && dsVhs.than.giai_doan.length === 12,
  'nhận ' + dsVhs.than?.giai_doan?.length);

const dsCskh = await goiAPI(worker, env, '/api/rnd', tCskh);
ok('CSKH xem được danh sách (tab Kinh doanh)', dsCskh.status === 200, 'nhận ' + dsCskh.status);
ok('… nhưng quyen.sua = false', dsCskh.than?.quyen?.sua === false);
const taoCskh = await goiAPI(worker, env, '/api/rnd/tao', tCskh, POST({ ten: 'Thử chặn' }));
ok('CSKH bấm tạo dự án → máy chủ chặn 403', taoCskh.status === 403, 'nhận ' + taoCskh.status);

const dsKho = await goiAPI(worker, env, '/api/rnd', tKho);
ok('Nhân viên kho (không có tab Kinh doanh) → 403', dsKho.status === 403, 'nhận ' + dsKho.status);

/* ---- ③ Một vòng thật: tạo → cổng chặn → tick → sang giai đoạn ------------ */
console.log('\n③ Luồng một dự án');
const tao = await goiAPI(worker, env, '/api/rnd/tao', tVhs, POST({
  ten: 'Bột ăn dặm yến mạch hữu cơ', nhom_hang: 'Bột ăn dặm', doi_tuong: 'me_be', kenh: 'ca_hai', uu_tien: 'cao'
}));
ok('Vận hành sàn tạo dự án → 200', tao.status === 200, JSON.stringify(tao.than));
ok('… mã đầu tiên là RD0001', tao.than?.ma_rnd === 'RD0001', 'nhận ' + tao.than?.ma_rnd);
ok('… dựng sẵn checklist', (tao.than?.so_buoc || 0) > 0, 'so_buoc = ' + tao.than?.so_buoc);
const idDuAn = tao.than?.id;

const ct = await goiAPI(worker, env, '/api/rnd/chi-tiet?id=' + encodeURIComponent(idDuAn), tVhs);
ok('GET /api/rnd/chi-tiet → 200', ct.status === 200, 'nhận ' + ct.status);

const batBuoc = db.prepare(`SELECT id, ten FROM rnd_buoc WHERE du_an_id = ? AND giai_doan = 'y_tuong' AND bat_buoc = 1`).all(idDuAn);
ok('giai đoạn Ý tưởng có việc bắt buộc để thử cổng', batBuoc.length > 0, 'đếm được ' + batBuoc.length);

const chan = await goiAPI(worker, env, '/api/rnd/chuyen-giai-doan', tVhs, POST({ id: idDuAn }));
ok('còn việc bắt buộc → KHÔNG sang được giai đoạn sau (400)', chan.status === 400, 'nhận ' + chan.status);
ok('… và máy chủ kể ra việc còn thiếu (màn R&D đọc ở err.than.con_thieu)',
  Array.isArray(chan.than?.con_thieu) && chan.than.con_thieu.length === batBuoc.length,
  JSON.stringify(chan.than?.con_thieu));

for (const b of batBuoc) {
  const r = await goiAPI(worker, env, '/api/rnd/buoc', tVhs, POST({ buoc_id: b.id, trang_thai: 'xong', ket_qua: 'Đã làm' }));
  ok('tick "' + b.ten.slice(0, 40) + '" → 200', r.status === 200, 'nhận ' + r.status + ' ' + JSON.stringify(r.than));
}

const qua = await goiAPI(worker, env, '/api/rnd/chuyen-giai-doan', tVhs, POST({ id: idDuAn }));
ok('xong hết việc bắt buộc → sang giai đoạn Thẩm định', qua.status === 200 && qua.than?.giai_doan === 'tham_dinh',
  'nhận ' + qua.status + ' ' + JSON.stringify(qua.than));

const lichSu = db.prepare(`SELECT loai_su_kien FROM rnd_lich_su WHERE du_an_id = ? ORDER BY id`).all(idDuAn).map(r => r.loai_su_kien);
ok('sổ cái ghi đủ: tạo → từng bước → chuyển giai đoạn',
  lichSu[0] === 'tao' && lichSu.includes('chuyen_giai_doan'), lichSu.join(' → '));

const tao2 = await goiAPI(worker, env, '/api/rnd/tao', tAdmin, POST({ ten: 'Hạt dinh dưỡng mix 5 loại' }));
ok('dự án thứ hai (Admin tạo) nhận mã RD0002', tao2.than?.ma_rnd === 'RD0002', 'nhận ' + tao2.than?.ma_rnd);

tongKet();
