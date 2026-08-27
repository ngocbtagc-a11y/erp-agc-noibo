/* ==========================================================================
   BÀN THỬ NGOẠI TUYẾN — SPEC-0007 Đợt 4 (bộ năng lực)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tu-kiem-ky-nang.mjs
   SQLite THẬT (`node:sqlite`), câu SQL đọc NGUYÊN VĂN từ file migration.

   Ba thứ phải chứng minh, không được khai suông:
   ① CHECK 4 mức chặn thật (BH-23: cổng chưa thử chặn = chưa có cổng)
   ② Hai màn hình trả lời ĐÚNG hai câu hỏi thật, kể cả ca "không ai làm được"
   ③ Nhân viên KHÔNG tự khai được (Rule 9) — và quản lý trực tiếp THÌ được
   Mỗi thứ kèm ca đối chứng cố ý sai (BH-16/BH-26).
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { diemMuc, MUC, duocChamCho, aiLamDuoc, aiThayDuoc, diemChet, cham } from '../src/ky-nang.js';

let dat = 0, hong = 0;
const loi = [];
function kiem(ten, thuc, mong) {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) { dat++; return; }
  hong++; loi.push(`  ✗ ${ten}\n      được : ${a}\n      cần   : ${b}`);
}

const SQL = readFileSync(new URL('../migrations/them-ky-nang.sql', import.meta.url), 'utf8');

console.log('\n=== ① MIGRATION + CHỐT CHẶN 4 MỨC ===\n');

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE nhan_su (
           id TEXT PRIMARY KEY, ho_ten TEXT, chuc_vu TEXT, bo_phan TEXT,
           loai_lao_dong TEXT, dang_lam INTEGER, quan_ly_id TEXT, phong_ban_id INTEGER);
         CREATE TABLE phong_ban (id INTEGER PRIMARY KEY, truong_phong_id TEXT);`);
db.exec(SQL);
kiem('migration chạy sạch', true, true);

{
  const sach = SQL.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '');
  kiem('không có DROP trong phần thi hành', /\bDROP\b/i.test(sach), false);
  kiem('không có DELETE/UPDATE dữ liệu cũ', /\b(DELETE|UPDATE)\b/i.test(sach), false);
  kiem('ĐỐI CHỨNG · phép kiểm bắt được DROP thật', /\bDROP\b/i.test(sach + ' DROP TABLE x;'), true);
}

/* --- Danh mục: cố định, có nhóm kho, có mô tả "thế nào là làm được" ------ */
{
  const n = db.prepare('SELECT nhom, COUNT(*) c FROM ky_nang GROUP BY nhom ORDER BY nhom').all();
  kiem('danh mục có đủ 5 nhóm', n.map(r => r.nhom), ['chung', 'hcns', 'ke_toan', 'kho', 'van_hanh']);
  kiem('nhóm KHO có ≥ 8 kỹ năng (nơi nhập đầu tiên)',
    n.find(r => r.nhom === 'kho').c >= 8, true);
  kiem('MỌI kỹ năng đều có mô tả "thế nào là làm được"',
    db.prepare("SELECT COUNT(*) c FROM ky_nang WHERE mo_ta IS NULL OR TRIM(mo_ta)=''").get().c, 0);
  kiem('có đánh dấu an_toan cho việc rủi ro (xe nâng, máy, thuế/BHXH)',
    db.prepare('SELECT COUNT(*) c FROM ky_nang WHERE an_toan = 1').get().c >= 8, true);
  kiem('có cột Data Lock trang_thai, mặc định nhap',
    db.prepare("SELECT COUNT(*) c FROM ky_nang WHERE trang_thai <> 'nhap'").get().c, 0);
  kiem('tên kỹ năng là UNIQUE — chống "Excel"/"excel" ngay ở DB', (() => {
    try { db.exec("INSERT INTO ky_nang (ten, nhom) VALUES ('Lái xe nâng','kho')"); return false; }
    catch (e) { return /UNIQUE/i.test(e.message); }
  })(), true);
}

/* --- CHECK 4 mức --------------------------------------------------------- */
db.exec(`INSERT INTO nhan_su (id,ho_ten,chuc_vu,bo_phan,dang_lam,quan_ly_id,phong_ban_id) VALUES
  ('duy','Phạm Khương Duy','Quản lý kho','Kho',1,'ngoc',1),
  ('a','Nguyễn Văn A','NV kho','Kho',1,'duy',1),
  ('b','Trần Thị B','NV kho','Kho',1,'duy',1),
  ('c','Lê Văn C','NV kho','Kho',1,'duy',1),
  ('nghi','Người Đã Nghỉ','NV kho','Kho',0,'duy',1),
  ('ngoc','Bùi Thị Ngọc','Giám đốc','BGĐ',1,NULL,2);
  INSERT INTO phong_ban VALUES (1,'duy'),(2,NULL);`);

const idXeNang = db.prepare("SELECT id FROM ky_nang WHERE ten='Lái xe nâng'").get().id;
const idMayCo  = db.prepare("SELECT id FROM ky_nang WHERE ten='Vận hành máy dán màng co'").get().id;
const idDem    = db.prepare("SELECT id FROM ky_nang WHERE ten='Kiểm đếm và kiểm kê tồn'").get().id;

{
  let batDuoc = false;
  try {
    db.exec(`INSERT INTO nhan_su_ky_nang (nhan_su_id,ky_nang_id,muc,nguoi_cham_id)
             VALUES ('a',${idXeNang},'gioi_lam','duy')`);
  } catch (e) { batDuoc = /CHECK/i.test(e.message); }
  kiem('mức lạ bị DB CHẶN CỨNG bằng CHECK', batDuoc, true);

  let thieuNguoiCham = false;
  try {
    db.exec(`INSERT INTO nhan_su_ky_nang (nhan_su_id,ky_nang_id,muc) VALUES ('a',${idXeNang},'lam_duoc')`);
  } catch (e) { thieuNguoiCham = /NOT NULL/i.test(e.message); }
  kiem('không có người chấm thì không có dòng (Rule 9 ở tầng DB)', thieuNguoiCham, true);

  /* ĐỐI CHỨNG — bảng y hệt nhưng GỠ mệnh đề CHECK. Vì sao BẮT BUỘC khác:
     lệch cơ học ở đúng một mệnh đề, hỏng với mọi đầu vào. Nếu ca này CŨNG
     bị chặn thì phép kiểm trên đang đo cột khác. */
  db.exec(`CREATE TABLE nskn_khong_chot (
    nhan_su_id TEXT, ky_nang_id INTEGER, muc TEXT NOT NULL, nguoi_cham_id TEXT NOT NULL)`);
  let lot = false;
  try {
    db.exec(`INSERT INTO nskn_khong_chot VALUES ('a',${idXeNang},'gioi_lam','duy')`); lot = true;
  } catch { lot = false; }
  kiem('ĐỐI CHỨNG · gỡ CHECK thì mức lạ LỌT QUA (phép kiểm đủ nhạy)', lot, true);
}

/* --- Dựng dữ liệu năng lực thật để chạy hai màn hình --------------------- */
db.exec(`INSERT INTO nhan_su_ky_nang (nhan_su_id,ky_nang_id,muc,nguoi_cham_id) VALUES
  ('a',${idXeNang},'thanh_thao','duy'),
  ('a',${idMayCo},'lam_duoc','duy'),
  ('a',${idDem},'lam_duoc','duy'),
  ('b',${idXeNang},'biet','duy'),
  ('b',${idDem},'day_duoc','duy'),
  ('c',${idDem},'lam_duoc','duy'),
  ('nghi',${idXeNang},'day_duoc','duy');`);

kiem('diemMuc xếp đúng thứ tự', MUC.map(diemMuc), [1, 2, 3, 4]);
kiem('diemMuc của mức lạ = 0', diemMuc('gioi_lam'), 0);

/* Bọc SQLite đồng bộ thành lớp giống D1 (prepare/bind/first/all/run). */
function envD1(database) {
  return { DB: { prepare(sql) {
    const st = database.prepare(sql);
    let t = [];
    return {
      bind(...a) { t = a; return this; },
      async first() { return st.get(...t) ?? null; },
      async all() { return { results: st.all(...t) }; },
      async run() { return { meta: {} }; }
    };
  } } };
}
const env = envD1(db);
const doc = async (r) => JSON.parse(await r.text());

console.log('\n=== ② HAI MÀN HÌNH ===\n');

/* --- ① Ai lái được xe nâng? --------------------------------------------- */
{
  const k = await doc(await aiLamDuoc(env, idXeNang));   // mặc định từ lam_duoc
  kiem('① chỉ "a" đủ mức xếp ca lái xe nâng', k.nguoi.map(n => n.id), ['a']);
  kiem('① người ĐÃ NGHỈ không lọt vào dù mức day_duoc',
    k.nguoi.some(n => n.id === 'nghi'), false);
  kiem('① cảnh báo điểm chết bật lên khi chỉ còn 1 người', k.diem_chet, true);
}
{
  // Đối chứng: hạ ngưỡng xuống "biet" thì "b" PHẢI xuất hiện. Nếu cả hai ca
  // ra cùng kết quả thì bộ lọc mức chưa bao giờ chạy.
  const k = await doc(await aiLamDuoc(env, idXeNang, 'biet'));
  kiem('① ĐỐI CHỨNG · hạ ngưỡng xuống "Biết" thì b xuất hiện',
    k.nguoi.map(n => n.id).sort(), ['a', 'b']);
  kiem('① ĐỐI CHỨNG · và "nghỉ" VẪN không xuất hiện (lọc dang_lam độc lập)',
    k.nguoi.some(n => n.id === 'nghi'), false);
}
{
  const k = await doc(await aiLamDuoc(env, idMayCo, 'thanh_thao'));
  kiem('① ca "KHÔNG AI đạt mức này" được nói thẳng, không trả rỗng im lặng',
    [k.khong_ai, k.nguoi.length], [true, 0]);
}
{
  const k = await doc(await aiLamDuoc(env, idDem));
  kiem('① 3 người đếm kho được → KHÔNG báo điểm chết', k.diem_chet, false);
  /* b = day_duoc (4) lên đầu. a và c cùng lam_duoc (2) → hoà, xếp tiếp theo
     TÊN theo bảng chữ cái tiếng Việt: "Lê Văn C" trước "Nguyễn Văn A". */
  kiem('① xếp mức cao lên trước, hoà thì theo tên', k.nguoi.map(n => n.id), ['b', 'c', 'a']);
}

/* --- ② Ai thay được "a" khi nghỉ đột xuất? ------------------------------- */
{
  const k = await doc(await aiThayDuoc(env, 'a'));
  kiem('② phần việc cần gánh = 3 kỹ năng của a từ lam_duoc trở lên',
    k.can_ky_nang.length, 3);
  /* b phủ được 1 (kiểm đếm - day_duoc); c phủ được 1 (kiểm đếm).
     Xe nâng và máy dán màng KHÔNG ai khác gánh được. */
  /* Hoà 1/3 cả hai → xếp theo tên: "Lê Văn C" trước "Trần Thị B".
     CỐ Ý không xếp theo tổng điểm mức: hôm nay việc cần trả lời là "ca này
     có chạy được không", không phải "ai giỏi hơn ai" — xếp theo điểm là bước
     đầu tiên trượt sang đo năng suất cá nhân (điều cấm 20). */
  kiem('② ứng viên xếp theo SỐ kỹ năng phủ được, hoà thì theo tên',
    k.ung_vien.map(u => [u.id, u.so_phu]), [['c', 1], ['b', 1]]);
  kiem('② nói thẳng phần việc SẼ ĐỨNG LẠI',
    k.khong_ai_ganh.map(x => x.ten).sort(), ['Lái xe nâng', 'Vận hành máy dán màng co']);
  kiem('② người đã nghỉ không được đề xuất làm ứng viên',
    k.ung_vien.some(u => u.id === 'nghi'), false);
  kiem('② không tự đề xuất chính người vắng', k.ung_vien.some(u => u.id === 'a'), false);
}
{
  // ĐỐI CHỨNG: người CHƯA ĐƯỢC CHẤM gì. Phải nói "chưa chấm", không được trả
  // một danh sách ứng viên rỗng trông như "không ai thay được" — hai kết luận
  // khác hẳn nhau và dẫn tới hai hành động khác hẳn nhau.
  const k = await doc(await aiThayDuoc(env, 'ngoc'));
  kiem('② ĐỐI CHỨNG · người chưa chấm → báo "chưa chấm", KHÔNG báo "không ai thay được"',
    [k.chua_cham === true, k.ung_vien.length], [true, 0]);
}

/* --- Cảnh báo ngược: kỹ năng chỉ MỘT người biết -------------------------- */
{
  const dc = await diemChet(env);
  const ten = dc.map(r => r.ten).sort();
  kiem('điểm chết: xe nâng và máy dán màng chỉ mình "a" làm được',
    ten, ['Lái xe nâng', 'Vận hành máy dán màng co']);
  kiem('kiểm đếm (3 người) KHÔNG bị coi là điểm chết', ten.includes('Kiểm đếm và kiểm kê tồn'), false);
  kiem('điểm chết nêu đúng tên người duy nhất',
    dc.every(r => r.nguoi_duy_nhat === 'Nguyễn Văn A'), true);
  kiem('việc có rủi ro an toàn xếp lên trước', dc[0].an_toan, 1);
}

console.log('\n=== ③ AI ĐƯỢC CHẤM (Rule 9) ===\n');

const p = (id) => ({ nhan_su_id: id, vai_tro: 'nguoi_dung' });

kiem('quản lý trực tiếp được chấm', (await duocChamCho(env, p('duy'), 'a', false)).vi_tri, 'quan_ly_truc_tiep');
kiem('TỰ CHẤM CHO MÌNH thì KHÔNG (Rule 9)', (await duocChamCho(env, p('a'), 'a', false)).duoc, false);
kiem('người ngang hàng KHÔNG chấm được', (await duocChamCho(env, p('b'), 'a', false)).duoc, false);
kiem('trưởng phòng của phòng ban đó được chấm',
  (await duocChamCho(env, p('duy'), 'c', false)).vi_tri, 'quan_ly_truc_tiep');
kiem('HCNS (quản lý hồ sơ) được chấm cho bất kỳ ai',
  (await duocChamCho(env, p('ngoc'), 'a', true)).vi_tri, 'quan_ly_ho_so');
kiem('ĐỐI CHỨNG · cùng người đó mà KHÔNG có cờ quản lý hồ sơ thì KHÔNG được',
  (await duocChamCho(env, p('ngoc'), 'a', false)).duoc, false);
/* Trưởng phòng nhưng KHÔNG phải quản lý trực tiếp: 'duy' là truong_phong_id
   của phòng 1. Dựng một người phòng 1 mà quản lý là người khác. */
db.exec("INSERT INTO nhan_su (id,ho_ten,dang_lam,quan_ly_id,phong_ban_id) VALUES ('d','Người D',1,'ngoc',1)");
kiem('trưởng phòng chấm được cho người trong phòng dù không phải QL trực tiếp',
  (await duocChamCho(env, p('duy'), 'd', false)).vi_tri, 'truong_phong');
kiem('ĐỐI CHỨNG · người phòng KHÁC thì trưởng phòng 1 không chấm được',
  (await duocChamCho(env, p('duy'), 'ngoc', false)).duoc, false);

/* Đường ghi thật: tự khai phải bị 403, quản lý trực tiếp phải 200. */
{
  const r = await cham(env, p('a'), { nhan_su_id: 'a', ky_nang_id: idXeNang, muc: 'day_duoc' }, false);
  kiem('API cham: TỰ KHAI bị chặn 403', r.status, 403);
  const r2 = await cham(env, p('duy'), { nhan_su_id: 'a', ky_nang_id: idXeNang, muc: 'day_duoc' }, false);
  kiem('ĐỐI CHỨNG · quản lý trực tiếp chấm cùng dòng đó thì 200', r2.status, 200);
  const r3 = await cham(env, p('duy'), { nhan_su_id: 'a', ky_nang_id: idXeNang, muc: 'sieu_cap' }, false);
  kiem('API cham: mức lạ bị chặn trước khi chạm DB', r3.status, 400);
  const r4 = await cham(env, p('duy'), { nhan_su_id: 'a', ky_nang_id: 999999, muc: 'biet' }, false);
  kiem('API cham: kỹ năng ngoài danh mục bị chặn (không có đường nhập tự do)', r4.status, 404);
}

console.log(loi.join('\n'));
console.log(`\n${dat} đạt · ${hong} hỏng\n`);
process.exit(hong ? 1 : 0);
