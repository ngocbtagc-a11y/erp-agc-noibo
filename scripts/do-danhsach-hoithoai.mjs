/* ==========================================================================
   ĐO `/api/chat/gan-day` — DANH SÁCH HỘI THOẠI, TRÊN D1 THẬT
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY (REV-0038 · L4): hàm `chatGanDay()` nay gộp HAI câu đọc
   vào một `DB.batch()` để chỉ còn MỘT vòng gọi D1. Gộp kiểu đó đổi hình dạng
   giá trị trả về (`batch()` trả MẢNG `D1Result`, không phải một `D1Result`) —
   sai một nhịp là danh sách hội thoại RỖNG mà không ai báo lỗi, đúng lớp
   "hỏng im lặng" mà cả vòng soi này đang gỡ.
   Nên: cắm dữ liệu thật vào SQLite thật, gọi qua đúng bộ định tuyến của
   `src/index.js`, rồi đòi ĐỦ 4 thứ mà cửa sổ chat vẽ ra: tên · tin cuối ·
   giờ · số chưa đọc — cho cả chat riêng LẪN kênh chung.

   Chạy:  node scripts/do-danhsach-hoithoai.mjs      (mã thoát 0 = đạt)
   ========================================================================== */

import { dungDB, dungEnv, taoPhienThat, goiAPI, ok, tongKet, datDongHo } from './ban-thu-d1.mjs';

datDongHo('2026-08-29T02:00:00Z');
const worker = (await import('../src/index.js')).default;

const { db, d1 } = dungDB();
for (const [id, ten, vt] of [['ngoc', 'Bùi Thị Ngọc', 'BN'],
                             ['duy', 'Phạm Khương Duy', 'KD'],
                             ['hang', 'Phan Thị Hằng', 'PH']]) {
  db.prepare(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam)
              VALUES (?, ?, ?, 'NV', 'Kho vận', NULL, 1)`).run(id, ten, vt);
}
db.prepare(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat)
            VALUES ('ngoc', 'ngoc', 'x', 'admin', 1)`).run();

/* Kênh chung: 2 tin của người khác. Chat riêng: anh Duy 3 tin, chị Hằng 1. */
const tin = (gui, nhan, chu, luc) => db.prepare(
  `INSERT INTO tin_nhan_chat (nguoi_gui_id, nguoi_gui_ten, nguoi_gui_viet_tat,
                              nguoi_nhan_id, noi_dung, tao_luc)
   VALUES (?, ?, ?, ?, ?, ?)`).run(gui, gui === 'duy' ? 'Phạm Khương Duy' : 'Phan Thị Hằng',
   gui === 'duy' ? 'KD' : 'PH', nhan, chu, luc);

/* CHÈN THEO ĐÚNG THỨ TỰ THỜI GIAN. Câu lệnh sắp theo `MAX(id)` chứ không theo
   `tao_luc` — đó là lựa chọn CÓ CHỦ Ý (con trỏ "xem tin cũ hơn" bám `id` nên
   120 tin cùng một mốc giây vẫn đúng thứ tự). Ngoài đời `id` tăng theo thời
   gian nên hai thứ trùng nhau; chèn ngược đời ở bàn đo thì chỉ tự bẫy mình. */
tin('duy',  null,   'Cả nhà xuất kho lúc 15h nhé',   '2026-08-29 08:00:00');
tin('hang', null,   'Chốt sổ tháng 8 nhé cả nhà',    '2026-08-29 08:05:00');
tin('hang', 'ngoc', 'Chị xem giúp em hoá đơn',       '2026-08-29 08:30:00');
tin('duy',  'ngoc', 'Chị ơi lô hạt điều về rồi',     '2026-08-29 09:00:00');
tin('duy',  'ngoc', 'Em xếp vào kệ A3',              '2026-08-29 09:01:00');
tin('duy',  'ngoc', 'Chị duyệt giúp em phiếu nhập',  '2026-08-29 09:02:00');

const env = dungEnv(d1);
/* `taoPhien` nhận ID CỦA TÀI KHOẢN (số tự tăng), KHÔNG phải `nhan_su_id` —
   gõ nhầm 'ngoc' vào đây thì mọi lượt gọi trả 401 và cả bàn đo trượt sạch vì
   phép đo sai, không phải vì mã sai. */
const token = await taoPhienThat(env,
  db.prepare("SELECT id FROM tai_khoan WHERE ten_dang_nhap='ngoc'").get().id);
const r = await goiAPI(worker, env, '/api/chat/gan-day', token);
const kq = r.than || {};

const ds = kq.gan_day || [];
const kc = kq.kenh_chung;
const duy = ds.find(x => x.id === 'duy');
const hang = ds.find(x => x.id === 'hang');

console.log('\n═══ /api/chat/gan-day — gộp 2 câu vào 1 batch có còn ĐÚNG không? ═══\n');

ok('① `batch()` trả về ĐỦ dòng chat riêng (2 người), không rỗng',
  ds.length === 2, `${ds.length} người: ${ds.map(x => x.ho_ten).join(', ')}`);
ok('② sắp theo TIN MỚI NHẤT — anh Duy (09:02) đứng trước chị Hằng (08:30)',
  ds[0]?.id === 'duy', ds.map(x => x.id).join(' → '));
ok('③ mỗi dòng đủ 4 thứ cửa sổ chat vẽ ra: tên · tin cuối · giờ · chưa đọc',
  !!(duy?.ho_ten && duy?.tin_cuoi && duy?.luc_cuoi && duy?.chua_doc !== undefined),
  `${duy?.ho_ten} | "${duy?.tin_cuoi}" | ${duy?.luc_cuoi} | chưa đọc ${duy?.chua_doc}`);
ok('④ TIN CUỐI đúng là tin mới nhất, không phải tin đầu',
  duy?.tin_cuoi === 'Chị duyệt giúp em phiếu nhập', String(duy?.tin_cuoi));
ok('⑤ số chưa đọc đúng (chưa xem gì → 3 tin của anh Duy, 1 của chị Hằng)',
  Number(duy?.chua_doc) === 3 && Number(hang?.chua_doc) === 1,
  `Duy ${duy?.chua_doc} · Hằng ${hang?.chua_doc}`);
ok('⑥ CÂU THỨ HAI trong batch (Kênh chung) cũng ra dòng — không nuốt mất',
  !!kc && kc.tin_cuoi === 'Chốt sổ tháng 8 nhé cả nhà' && Number(kc.chua_doc) === 2,
  kc ? `"${kc.tin_cuoi}" · ${kc.ten_cuoi} · chưa đọc ${kc.chua_doc}` : 'kenh_chung = null');

/* ---- CA ĐỐI CHỨNG: đọc rồi thì số chưa đọc phải về 0 ------------------- */
db.prepare(`UPDATE tai_khoan SET chat_xem_id = (SELECT MAX(id) FROM tin_nhan_chat)
             WHERE nhan_su_id = 'ngoc'`).run();
const r2 = await goiAPI(worker, env, '/api/chat/gan-day', token);
const kq2 = r2.than || {};
ok('⑦ ĐỐI CHỨNG · đã xem hết → mọi số chưa đọc về 0 (phép đo nhạy thật)',
  (kq2.gan_day || []).every(x => Number(x.chua_doc) === 0) &&
  Number(kq2.kenh_chung?.chua_doc) === 0,
  (kq2.gan_day || []).map(x => `${x.id}:${x.chua_doc}`).join(' ') +
  ` chung:${kq2.kenh_chung?.chua_doc}`);

tongKet();
