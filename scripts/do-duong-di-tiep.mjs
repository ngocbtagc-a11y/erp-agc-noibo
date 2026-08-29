/* ==========================================================================
   ĐO "ĐƯỜNG ĐI TIẾP" CÓ THẬT KHÔNG — D1 THẬT, WORKER THẬT
   ---------------------------------------------------------------------------
   Chạy:  npm run do-duong-di-tiep

   VÌ SAO CÓ FILE NÀY (REV-0034 · L2). Dải cắt ở màn Lịch sử làm việc từng in
   *"Dùng ô tìm kiếm phía trên để lọc đúng việc cần xem."* — nhưng ô đó lọc
   PHÍA TRÌNH DUYỆT trên đúng 500 dòng đã tải (`DS_LSCV`), nó KHÔNG hỏi lại
   máy chủ. Chỉ người ta đi tìm ở chỗ không có còn tệ hơn không chỉ gì cả.
   Bài học kèm theo: đừng viết câu chữ trước rồi kiểm mã sau — câu chữ sai ấy
   sinh ra đúng theo lối đó.

   NÊN Ở ĐÂY KHÔNG KHAI, MÀ ĐO. Dựng D1 thật (`scripts/ban-thu-d1.mjs`: SQLite
   thật + `schema.sql` + toàn bộ `migrations/`), tạo tài khoản `hcns` đúng vai
   trò chị Vũ Lan Hương, phiên đăng nhập thật, rồi gọi `worker.fetch()` thật:

     ① 700 việc toàn công ty → `GET /api/cong-viec/lich-su` trả ĐÚNG 500 +
        `cat.tong = 700` + `truoc_tiep` khác null.
     ② Bấm "Tải thêm" → `GET …?truoc=<con trỏ>` trả 200 việc CÒN LẠI,
        KHÔNG TRÙNG một dòng nào, hợp lại đủ 700 id phân biệt, KHÔNG SÓT.
     ③ CA ĐỐI CHỨNG (BH-16): gọi LẠI mà KHÔNG kèm `truoc` thì phải ra y hệt
        trang 1. Không có bước này thì "nút tải thêm chạy được" có thể chỉ là
        trang 1 hiện lại hai lần mà không ai biết.
     ④ Con trỏ rác → 400, không phải 500 và không nuốt im.
     ⑤ Tải hết rồi thì `cat = null` và `truoc_tiep = null` → dải TỰ TẮT.

   Đo luôn hai lỗi cùng bản soi:
     ⑥ L3 — chuông thông báo: 60 tin chưa đọc thì `chua_doc` phải là 60, không
        phải 50 (con số của mảng ĐÃ BỊ CẮT). Kèm ca đối chứng 30 tin.
     ⑦ L6 — `nhanCat` gặp `tong` NHỎ HƠN số dòng đang hiện (cron xoá/ghi lại
        giữa hai câu lệnh) thì trả `tong = null`, KHÔNG in "còn −50 việc".

   MÃ THOÁT: 0 = đạt hết · 1 = có ca trượt.
   ========================================================================== */

import { dungDB, dungEnv, taoPhienThat, goiAPI, ok, tongKet, datDongHo } from './ban-thu-d1.mjs';
import { nhanCat } from '../src/cat-danh-sach.js';

datDongHo('2026-08-29T02:00:00Z');
const worker = (await import('../src/index.js')).default;

/* ---- Dựng công ty thật: chị Lan Hương (hcns) + 700 việc ----------------- */
const { db, d1, conLoi } = dungDB();
/* `conLoi` là mấy câu tạo INDEX của migration lùi `lui-gopy-congduyet.sql` —
   lỗi CÓ SẴN trên nhánh, không liên quan bản vá này và không đụng bảng ta đo.
   Đo cái thật sự cần: ba bảng dưới đây có thật. */
const coBang = (t) => !!db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(t);
ok('D1 thật dựng xong — có đủ bảng cong_viec · thong_bao · tai_khoan',
  coBang('cong_viec') && coBang('thong_bao') && coBang('tai_khoan'),
  conLoi.length
    ? conLoi.length + ' câu SQL lỗi CÓ SẴN (index của lui-gopy-congduyet.sql), không đụng bảng đang đo'
    : 'sạch');

for (const [id, ten] of [['huong', 'Vũ Lan Hương'], ['ngoc', 'Bùi Thị Ngọc'], ['duy', 'Phạm Khương Duy']]) {
  db.prepare(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam)
              VALUES (?, ?, ?, 'NV', 'HCNS', NULL, 1)`).run(id, ten, id);
}
db.prepare(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat)
            VALUES ('huong', 'huong', 'x', 'hcns', 1)`).run();

const TONG_VIEC = 700;
for (let i = 1; i <= TONG_VIEC; i++) {
  // `cap_nhat_luc` giảm dần theo i → thứ tự trả về đúng là 1, 2, 3… Cố ý cho
  // 40 việc TRÙNG NHAU mốc cập nhật: một con trỏ chỉ dựa vào thời gian sẽ nhảy
  // cóc hoặc lặp ở đúng chỗ này. Không có nhóm trùng thì phép đo không chạm
  // tới vế `id <` của con trỏ, và cái vế đó là chỗ dễ sai nhất.
  const phut = String(59 - (i % 60)).padStart(2, '0');
  const gio = String(23 - Math.floor(i / 60)).padStart(2, '0');
  const luc = i >= 480 && i < 520 ? '2026-08-20 05:05:05' : `2026-08-28 ${gio}:${phut}:00`;
  db.prepare(`INSERT INTO cong_viec (id, tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten,
                nguoi_nhan_id, nguoi_nhan_ten, trang_thai, tao_luc, cap_nhat_luc)
              VALUES (?, ?, 'đầu ra', 'ngoc', 'Bùi Thị Ngọc', ?, ?, 'dang_lam', ?, ?)`)
    .run(i, 'Việc ' + i,
         i % 3 === 0 ? 'huong' : 'duy', i % 3 === 0 ? 'Vũ Lan Hương' : 'Phạm Khương Duy',
         '2026-08-01 09:00:00', luc);
}

const env = dungEnv(d1);
const token = await taoPhienThat(env,
  db.prepare("SELECT id FROM tai_khoan WHERE ten_dang_nhap='huong'").get().id);
const G = (dd) => goiAPI(worker, env, dd, token);

/* ==========================================================================
   ① TRANG ĐẦU
   ========================================================================== */
console.log('\n① TRANG ĐẦU — chị Lan Hương (hcns) gọi thật');
const t1 = await G('/api/cong-viec/lich-su');
ok('200 OK', t1.status === 200, 'status=' + t1.status);
ok('trả ĐÚNG 500 việc (trần), không phải 501', t1.than?.viec?.length === 500, 'nhận ' + t1.than?.viec?.length);
ok('dải cắt nói TỔNG THẬT 700', t1.than?.cat?.tong === TONG_VIEC, JSON.stringify(t1.than?.cat));
ok('có con trỏ `truoc_tiep` → nút "Tải thêm" có chỗ để đi',
  !!t1.than?.truoc_tiep, String(t1.than?.truoc_tiep));

/* ==========================================================================
   ② TRANG 2 — CÂU HỎI CHÍNH: đường đi tiếp có THẬT không
   ========================================================================== */
console.log('\n② BẤM "TẢI THÊM" — có hỏi lại MÁY CHỦ và có ra dòng MỚI không');
const t2 = await G('/api/cong-viec/lich-su?truoc=' + encodeURIComponent(t1.than.truoc_tiep));
ok('200 OK', t2.status === 200, 'status=' + t2.status);
ok('trả nốt 200 việc còn lại', t2.than?.viec?.length === TONG_VIEC - 500, 'nhận ' + t2.than?.viec?.length);

const id1 = t1.than.viec.map(v => v.id), id2 = t2.than.viec.map(v => v.id);
const trung = id2.filter(x => id1.includes(x));
ok('KHÔNG trùng một dòng nào với trang 1', trung.length === 0, 'trùng ' + trung.length + ' dòng');
const hop = new Set([...id1, ...id2]);
ok('hợp hai trang = ĐỦ 700 id phân biệt, KHÔNG SÓT dòng nào',
  hop.size === TONG_VIEC, 'gộp được ' + hop.size + '/' + TONG_VIEC);

/* Đây chính là chỗ chị Lan Hương thiếu: 200 việc này TRƯỚC ĐÂY không có đường
   nào tới được — ô tìm kiếm lọc trên mảng đã tải nên tìm mãi không ra. */
ok('200 việc mà ô tìm kiếm trình duyệt KHÔNG BAO GIỜ với tới, nay lấy được',
  id2.length === 200, id2.length + ' việc');

/* ==========================================================================
   ③ CA ĐỐI CHỨNG (BH-16) — không có `truoc` thì phải ra Y HỆT trang 1
   ========================================================================== */
console.log('\n③ CA ĐỐI CHỨNG — chính THAM SỐ `truoc` làm nên chuyện, không phải may');
const t1b = await G('/api/cong-viec/lich-su');
ok('gọi lại KHÔNG kèm `truoc` → đúng lại trang 1 (nếu không thì phép đo ② vô nghĩa)',
  JSON.stringify(t1b.than.viec.map(v => v.id)) === JSON.stringify(id1));
ok('tức: dòng mới ở ② đến TỪ MÁY CHỦ nhờ `truoc`, không phải trang 1 hiện lại',
  id2[0] !== id1[0] && id2[0] === id1[499] + 1, `dòng đầu trang 2 = id ${id2[0]}`);

/* ==========================================================================
   ④ Con trỏ rác — báo lỗi tử tế, không nổ 500, không nuốt im
   ========================================================================== */
console.log('\n④ CON TRỎ RÁC');
const rac = await G('/api/cong-viec/lich-su?truoc=' + encodeURIComponent("' OR 1=1 --"));
ok('con trỏ hỏng → 400, không phải 500 và không im lặng trả lại trang 1',
  rac.status === 400, 'status=' + rac.status);

/* ==========================================================================
   ⑤ TẢI HẾT → dải TỰ TẮT
   ========================================================================== */
console.log('\n⑤ TẢI HẾT RỒI THÌ DẢI PHẢI BIẾN MẤT');
ok('trang cuối: `cat = null` (không còn gì để nói)', t2.than.cat === null, JSON.stringify(t2.than.cat));
ok('trang cuối: `truoc_tiep = null` → không mọc nút bấm vào không có gì',
  t2.than.truoc_tiep === null, String(t2.than.truoc_tiep));

/* ==========================================================================
   ⑥ L3 — CHUÔNG ĐẾM CHƯA ĐỌC TRÊN MẢNG ĐÃ BỊ CẮT
   ========================================================================== */
console.log('\n⑥ L3 — chuông thông báo: 60 tin chưa đọc thì phải nói 60');
for (let i = 1; i <= 60; i++) {
  db.prepare(`INSERT INTO thong_bao (nhom, noi_dung, loai, nguoi_nhan_id, tao_luc)
              VALUES ('ca_nhan', ?, 'cong_viec_moi', 'huong', ?)`)
    .run('Tin ' + i, '2026-08-2' + (i % 9) + ' 08:00:00');
}
const tb = await G('/api/thong-bao');
ok('chuông đếm ĐÚNG 60 tin chưa đọc, không phải 50 (số của mảng đã bị cắt)',
  tb.than?.chua_doc === 60, 'chua_doc=' + tb.than?.chua_doc);
ok('danh sách vẫn giữ trần 50 (không đổi trần, chỉ nói ra)',
  tb.than?.thong_bao?.length === 50, 'trả ' + tb.than?.thong_bao?.length + ' tin');
ok('và NÓI RA là đã cắt: cat.tong = 60', tb.than?.cat?.tong === 60, JSON.stringify(tb.than?.cat));

// Ca đối chứng: dưới trần thì KHÔNG được báo cắt oan.
db.exec('DELETE FROM thong_bao');
for (let i = 1; i <= 30; i++) {
  db.prepare(`INSERT INTO thong_bao (nhom, noi_dung, loai, nguoi_nhan_id, tao_luc)
              VALUES ('ca_nhan', ?, 'cong_viec_moi', 'huong', '2026-08-28 08:00:00')`).run('Tin ' + i);
}
const tb2 = await G('/api/thong-bao');
ok('ĐỐI CHỨNG 30 tin: chua_doc = 30 và KHÔNG báo cắt oan',
  tb2.than?.chua_doc === 30 && tb2.than?.cat === null,
  `chua_doc=${tb2.than?.chua_doc} cat=${JSON.stringify(tb2.than?.cat)}`);

/* ==========================================================================
   ⑦ L6 — `tong` nhỏ hơn số đang hiện thì KHÔNG được in số âm
   ========================================================================== */
console.log('\n⑦ L6 — cron xoá bớt giữa hai câu lệnh → không được ra "còn −50 việc"');
const envGia = { DB: { prepare: () => ({ bind: () => ({ first: async () => ({ n: 450 }) }) }) } };
const r6 = await nhanCat(envGia, true, 500, 'SELECT COUNT(*) AS n FROM x', []);
ok('tổng đếm được (450) < số đang hiện (500) → trả tong = null, VẪN báo là đã cắt',
  r6 !== null && r6.tong === null && r6.gioi_han === 500, JSON.stringify(r6));
const envThat = { DB: { prepare: () => ({ bind: () => ({ first: async () => ({ n: 700 }) }) }) } };
const r6b = await nhanCat(envThat, true, 500, 'SELECT COUNT(*) AS n FROM x', []);
ok('ĐỐI CHỨNG: tổng hợp lệ (700) thì vẫn giữ nguyên con số', r6b.tong === 700, JSON.stringify(r6b));

process.exit(tongKet() ? 0 : 1);
