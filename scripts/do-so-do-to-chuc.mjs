/* ==========================================================================
   BÀN ĐO: SƠ ĐỒ TỔ CHỨC BA TẦNG — bản Sếp Ngọc ban hành 09/09/2026
   ---------------------------------------------------------------------------
   CHẠY:
     node scripts/do-so-do-to-chuc.mjs              → đo đủ (SQL + Chrome)
     node scripts/do-so-do-to-chuc.mjs --chi-sql    → chỉ phần migration
     node scripts/do-so-do-to-chuc.mjs --bang-ke    → in thêm số đo từng bề ngang
     node scripts/do-so-do-to-chuc.mjs --truoc <sha>→ đo thêm BẢN CŨ để có số "trước"
     node scripts/do-so-do-to-chuc.mjs --chup <thư mục> → lưu ảnh 1440 và 375
   MÃ THOÁT: 0 = xanh · 1 = đỏ.

   ---------------------------------------------------------------------------
   BÀN ĐO NÀY SINH RA VÌ BỐN THỨ ĐÃ HỎNG THẬT, KHÔNG PHẢI VÌ GIẢ ĐỊNH
   ---------------------------------------------------------------------------
   Đo trên CSDL sản xuất 09/09/2026:

   ① Ô GỐC ĐẾM SAI. Sơ đồ cũ cộng `so_nguoi` của 4 phòng: 17+3+2+0 = 22. Đang
      làm thật là 24. Hai người chưa có `phong_ban_id` không lọt vào phép cộng
      và BIẾN MẤT khỏi màn hình — không một dòng nào nói rằng họ tồn tại. Phép
      ① và ② dưới đây canh đúng hai mặt của lỗi đó: con số ở ô gốc, và khối
      cảnh báo có tên người.
   ② CÂY PHẲNG. Cả 4 hàng `phong_ban` đều `cha_id = NULL`. Cơ cấu Sếp ban hành
      có ba tầng. Phép ③ canh cây không được phẳng trở lại.
   ③ TRÀN NGANG Ở 375px. Cơ cấu mới có 5 Nhóm; năm hộp nằm ngang ở màn điện
      thoại thì hoặc tràn, hoặc phải kéo ngang — cả hai đều bị cấm. Phép ④.
   ④ CHỮ KHÔNG DẤU / CỘT `cap` KHÔNG RÀNG BUỘC. Phép ⑤ chạy chính hai file
      migration trên SQLite thật rồi hỏi lại kết quả — không đọc bằng mắt.

   ---------------------------------------------------------------------------
   MỖI CHỐT MỘT CA ĐỐI CHỨNG (BH-16)
   ---------------------------------------------------------------------------
   "Thước đo báo sạch trong khi thứ nó đo đang hỏng" là lỗi nặng nhất ở đây.
   Nên MỖI phép đo đều chạy thêm một lượt trên bản ĐÃ BẺ CỐ Ý, và nếu lượt đó
   KHÔNG đỏ thì chính bàn đo bị tính là TRƯỢT:
     ① ← trả `tom_tat` kiểu cũ (tổng = cộng theo phòng) → phải bắt lệch 22/24
     ② ← gỡ hàm `veCanhBaoNhanSu` khỏi app.js          → phải bắt mất cảnh báo
     ③ ← xoá cột `cap` khỏi dữ liệu máy chủ trả về     → phải bắt cây phẳng
     ④ ← ép 5 Nhóm nằm ngang bằng CSS chèn thêm        → phải bắt tràn 375px
     ⑤ ← nhét `cap = 'phòng'` (có dấu) vào SQLite      → CHECK phải chặn
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';
import { ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dso = process.argv;
const CHI_SQL = dso.includes('--chi-sql');
const BANG_KE = dso.includes('--bang-ke');
const TRUOC = (i => i > 0 ? dso[i + 1] : null)(dso.indexOf('--truoc'));
const CHUP  = (i => i > 0 ? dso[i + 1] : null)(dso.indexOf('--chup'));
/* Ảnh CHỈ chụp ở lượt đo chính. Các ca đối chứng cũng chạy ở 375px; nếu chúng
   cũng chụp thì tấm cuối ghi đè tấm thật — và ta đưa Sếp xem ảnh của một bản
   CỐ Ý BẺ HỎNG mà tưởng là ảnh sản phẩm. */
let DANG_DO_CHINH = true;

/* Hai bề ngang Sếp yêu cầu đo đích danh. 1440×900 = màn làm việc của Sếp;
   375×812 = điện thoại kho vận. */
const MAN = [{ rong: 1440, cao: 900 }, { rong: 375, cao: 812 }];

/* ==========================================================================
   DỮ LIỆU THẬT — chụp từ CSDL sản xuất 09/09/2026 (chỉ ĐỌC, không ghi)
   ---------------------------------------------------------------------------
   Chép vào đây thay vì gọi ra mạng: bàn đo phải chạy được khi mất mạng, và
   phải cho ra CÙNG một kết quả mọi lượt. Dữ liệu này cũng chính là thứ hai
   file migration phải biến đổi được, nên phép ⑤ dùng lại nguyên si.
   ========================================================================== */
const NHAN_SU_THAT = [
  // id                 ho_ten                    chuc_vu                              pb   quan_ly_id       chuc_danh_id
  ['ns_admin2',        'Nguyễn Duy Phong',       'Giám đốc kiêm TP. Kinh doanh - MKT',  1,  null,             1],
  ['ns_admin1',        'Bùi Thị Ngọc',           'Phó Giám đốc kiêm TP. Support',       1,  'ns_admin2',      2],
  ['ns_6222e61d-6a0',  'Nguyễn Thị Huyền',       'NV Vận hành TMĐT',                 null,  'ns_admin2',   null],
  ['ns_a81898a3-f7b',  'Vũ Lan Hương',           'NV Chăm sóc Khách hàng',           null,  'ns_admin2',   null],
  ['ns_nv010014',      'Phan Thị Hằng',          'Trưởng nhóm Kế toán - Tài chính',     2,  'ns_b8e66305-845', 4],
  ['ns_nv010015',      'Dương Thị Hồng Khánh',   '',                                    2,  'ns_nv010014', null],
  ['ns_fcc63fda-0cd',  'Phạm Thị Lan',           'NV HCNS kiêm Admin',                  2,  'ns_admin1',     10],
  ['ns_b8e66305-845',  'Phạm Khương Duy',        'TP. Kho Vận - Sản Xuất',              4,  'ns_admin1',      5],
  ['ns_nv010010',      'Hoàng Văn Tế',           'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020004',      'Nguyễn Thị Ngọc Anh',    'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv010013',      'Nguyễn Thị Đào',         'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020001',      'Nguyễn Xuân Khoa An',    'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv010009',      'Phạm Thị Hải',           'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020007',      'Phạm Thị Thu Uyên',      'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020006',      'Trần Minh Hằng',         'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020002',      'Vũ Thị Trà Mi',          'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv010012',      'Vương Thị Huyền',        'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_ef6ebbe1-c4d',  'Đinh Mạnh Linh',         'Nhân viên Kho Vận',                   4,  'ns_b8e66305-845', 3],
  ['ns_nv020009',      'Đào Thị Hồng Vy',        'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020008',      'Đặng Lê Hà',             'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020010',      'Đỗ Duy Khánh',           'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv010011',      'Đỗ Thị Hường',           'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020005',      'Đỗ Thị Như Quỳnh',       'NV Kho Vận',                          4,  'ns_b8e66305-845', 3],
  ['ns_nv020003',      'Nguyễn Thị Bích Trâm',   '',                                    4,  'ns_b8e66305-845', null]
];
const PHONG_BAN_THAT = [
  [1, 'Ban Giám đốc',                          'ns_admin2',       1],
  [2, 'P. Support (Kế toán - Nhân sự - Admin)', 'ns_admin1',       2],
  [3, 'P. Kinh Doanh - MKT',                   'ns_admin2',       3],
  [4, 'P. Kho Vận - Sản Xuất',                 'ns_b8e66305-845', 4]
];
const TONG_DANG_LAM = NHAN_SU_THAT.length;                       // 24

/* ==========================================================================
   ⑤ CHẠY THẬT HAI FILE MIGRATION TRÊN SQLITE
   ---------------------------------------------------------------------------
   Không đọc file .sql bằng mắt rồi gật đầu. Dựng lại đúng hai bảng như bản
   thật, chạy đúng hai file, rồi hỏi lại CSDL. `node:sqlite` là SQLite thật —
   cùng động cơ D1 chạy — nên `CHECK`, `ALTER TABLE ADD COLUMN` và mọi ràng
   buộc đều xử sự y hệt lúc lên bản thật.
   ========================================================================== */
function dungDbThat() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE nhan_su (
      id TEXT PRIMARY KEY, ho_ten TEXT, chuc_vu TEXT,
      phong_ban_id INTEGER, quan_ly_id TEXT, chuc_danh_id INTEGER,
      dang_lam INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE phong_ban (
      id INTEGER PRIMARY KEY, ten TEXT NOT NULL,
      hoat_dong INTEGER NOT NULL DEFAULT 1,
      tao_luc TEXT, trang_thai TEXT NOT NULL DEFAULT 'nhap',
      truong_phong_id TEXT, thu_tu INTEGER, cha_id INTEGER REFERENCES phong_ban(id)
    );
    CREATE INDEX ix_pb_cay ON phong_ban(cha_id, thu_tu);
  `);
  const cPB = db.prepare(`INSERT INTO phong_ban (id, ten, truong_phong_id, thu_tu, trang_thai) VALUES (?,?,?,?,'da_khoa')`);
  for (const r of PHONG_BAN_THAT) cPB.run(...r);
  const cNS = db.prepare(`INSERT INTO nhan_su (id, ho_ten, chuc_vu, phong_ban_id, quan_ly_id, chuc_danh_id, dang_lam) VALUES (?,?,?,?,?,?,1)`);
  for (const r of NHAN_SU_THAT) cNS.run(...r);
  return db;
}

/* Chạy TỪNG CÂU chứ không đổ cả file vào `exec`: câu nào hỏng thì báo đích
   danh câu đó, thay vì một dòng "syntax error" không biết ở đâu.
   ⚠️ BỎ CHÚ THÍCH TRƯỚC, CẮT `;` SAU — và bỏ bằng cách lọc theo DÒNG, không
   bằng một biểu thức chính quy có lượng từ lồng nhau. Bản đầu dùng
   `/^(--[^\n]*\n?)+$/` để nhận ra khối toàn chú thích: hai file này có khối
   chú thích 50 dòng, và biểu thức đó quay lui theo cấp số nhân — bàn đo TREO
   hẳn, không in nổi một dòng nào. Treo im lặng còn khó tìm hơn đỏ.
   An toàn vì trong hai file này không chuỗi nào chứa `--` hay `;`. */
function chayFileSql(db, ten) {
  const raw = readFileSync(path.join(GOC, 'migrations', ten), 'utf8');
  const sach = raw.split('\n')
    .map(d => d.replace(/\s*--.*$/, ''))     // bỏ chú thích cuối dòng và cả dòng
    .join('\n');
  const cau = sach.split(';').map(s => s.trim()).filter(Boolean);
  for (const c of cau) db.exec(c + ';');
  return cau.length;
}

function doSql() {
  console.log('\n─── ⑤ MIGRATION CHẠY THẬT TRÊN SQLITE ───');
  const db = dungDbThat();

  let chayDuoc = true, loi = '';
  try {
    const a = chayFileSql(db, 'them-phongban-ba-tang.sql');
    const b = chayFileSql(db, 'xep-lai-co-cau-2026-09.sql');
    if (BANG_KE) console.log(`      ${a} câu lược đồ · ${b} câu dữ liệu`);
  } catch (e) { chayDuoc = false; loi = e.message; }
  ok('Hai file migration chạy trót lọt', chayDuoc, loi);
  if (!chayDuoc) return;

  const pb = db.prepare(`SELECT id, ten, cap, cha_id, truong_phong_id, phu_trach_id, mo_ta FROM phong_ban ORDER BY id`).all();
  const capCua = c => pb.filter(p => p.cap === c);

  ok('Đúng 1 hộp cấp Công ty', capCua('cong_ty').length === 1,
    capCua('cong_ty').map(p => p.ten).join(', '));
  ok('Đúng 2 Phòng, cả hai treo dưới hộp Công ty',
    capCua('phong').length === 2 && capCua('phong').every(p => p.cha_id === 1),
    capCua('phong').map(p => `${p.ten}←${p.cha_id}`).join(' · '));
  ok('Đúng 5 Nhóm, cả năm treo dưới một Phòng',
    capCua('nhom').length === 5 && capCua('nhom').every(p => [2, 3].includes(p.cha_id)),
    capCua('nhom').map(p => `${p.ten}←${p.cha_id}`).join(' · '));
  ok('Không hàng nào bị xoá — vẫn còn cả 4 id cũ',
    [1, 2, 3, 4].every(id => pb.some(p => p.id === id)));
  ok('Mọi Nhóm đều có hai dòng chức năng (`mo_ta`)',
    capCua('nhom').every(p => (p.mo_ta || '').includes(' · ')),
    capCua('nhom').filter(p => !(p.mo_ta || '').includes(' · ')).map(p => p.ten).join(', ') || '—');
  ok('Hai Phòng đều có người TRỰC TIẾP PHỤ TRÁCH, và KHÔNG có trưởng phòng',
    capCua('phong').every(p => p.phu_trach_id && !p.truong_phong_id));

  const ns = db.prepare(`SELECT id, ho_ten, phong_ban_id, quan_ly_id FROM nhan_su WHERE dang_lam = 1`).all();
  ok(`Đủ ${TONG_DANG_LAM} người đang làm`, ns.length === TONG_DANG_LAM, `đếm được ${ns.length}`);
  const roiNgoai = ns.filter(n => n.phong_ban_id == null);
  ok('KHÔNG còn ai rơi ra ngoài sơ đồ (`phong_ban_id` rỗng)', roiNgoai.length === 0,
    roiNgoai.map(n => n.ho_ten).join(', ') || '—');
  const khongQL = ns.filter(n => !n.quan_ly_id);
  ok('Đúng 1 người không có quản lý — Giám đốc, đỉnh cây',
    khongQL.length === 1 && khongQL[0].id === 'ns_admin2',
    khongQL.map(n => n.ho_ten).join(', '));

  const hang = ns.find(n => n.id === 'ns_nv010014');
  ok('🔴 SỬA XONG: Phan Thị Hằng báo cáo cho Phó Giám đốc, không phải Quản lý kho',
    hang && hang.quan_ly_id === 'ns_admin1', `quan_ly_id = ${hang && hang.quan_ly_id}`);

  const kho = ns.filter(n => n.phong_ban_id === 4);
  ok('17 người kho vận GIỮ NGUYÊN phòng id 4 — không hồ sơ nào phải chuyển',
    kho.length === 17, `${kho.length} người ở id 4`);

  /* --- Ca đối chứng ⑤: cột `cap` phải là RÀNG BUỘC, không phải chú thích --- */
  let bịChan = false, viec = '';
  try { db.exec(`UPDATE phong_ban SET cap = 'phòng' WHERE id = 3`); }
  catch (e) { bịChan = true; viec = e.message.slice(0, 60); }
  ok('ĐỐI CHỨNG — CHECK chặn `cap` viết sai ("phòng" có dấu)', bịChan, viec);

  let bịChan2 = false;
  try { db.exec(`INSERT INTO phong_ban (id, ten, cap) VALUES (99, 'Hộp lạ', 'ban')`); }
  catch { bịChan2 = true; }
  ok('ĐỐI CHỨNG — CHECK chặn hàng mới mang cấp lạ ("ban")', bịChan2);

  db.close();
}

/* ==========================================================================
   PHẦN TRÌNH DUYỆT — app.js THẬT, style.css THẬT, Chrome THẬT
   ========================================================================== */

/* Dựng đúng khối `ds` + `tom_tat` mà `src/dulieunen.js` trả về SAU khi nạp
   migration. Giữ ĐÚNG tên khoá — lệch một chữ là bàn đo đo bản giả của chính
   nó chứ không đo thứ máy chủ gửi. */
function duLieuSauMigration() {
  const ten = id => (NHAN_SU_THAT.find(n => n[0] === id) || [])[1] || null;
  const chucVu = id => (NHAN_SU_THAT.find(n => n[0] === id) || [])[2] || null;
  const hop = (id, tenHop, cap, cha, thuTu, truong, phuTrach, moTa, so) => ({
    id, ten: tenHop, hoat_dong: 1, trang_thai: 'nhap',
    truong_phong_id: truong, truong_phong_ten: truong ? ten(truong) : null,
    so_nguoi: so, thu_tu: thuTu, cha_id: cha, cap, mo_ta: moTa,
    phu_trach_id: phuTrach, phu_trach_ten: phuTrach ? ten(phuTrach) : null,
    /* CHỨC VỤ THÔ, y như máy chủ gửi — "Giám đốc kiêm TP. Kinh doanh - MKT".
       Cắt sẵn ở đây là bàn đo tự dọn hộ rồi khen giao diện sạch; việc rút gọn
       phải do `chucVuGon()` trong app.js làm, và phép ③ dưới kia soi CHỮ in
       ra để chứng minh nó có làm. */
    phu_trach_chuc_vu: phuTrach ? chucVu(phuTrach) : null
  });
  const ds = [
    hop(1, 'Ban Giám đốc', 'cong_ty', null, 1, 'ns_admin2', 'ns_admin2',
        'Điều hành hoạt động kinh doanh hằng ngày của Công ty', 1),
    hop(3, 'Phòng Kinh doanh và Phát triển thị trường', 'phong', 1, 1, null, 'ns_admin2', null, 0),
    hop(2, 'Phòng Vận hành và Hỗ trợ', 'phong', 1, 2, null, 'ns_admin1', null, 1),
    hop(5, 'Nhóm Marketing – Bán hàng', 'nhom', 3, 1, null, null, 'Marketing - Booking · Kênh bán', 1),
    hop(6, 'Nhóm CSKH và Phát triển nguồn cung ứng', 'nhom', 3, 2, null, null, 'CSKH - Sản phẩm · Nhà cung cấp', 1),
    hop(7, 'Nhóm Kế toán – Tài chính', 'nhom', 2, 1, 'ns_nv010014', null, 'Kế toán - Thuế · Tài chính - Dòng tiền', 2),
    hop(8, 'Nhóm HCNS – Admin', 'nhom', 2, 2, null, null, 'Nhân sự - Hành chính · Văn thư', 1),
    hop(4, 'Nhóm Kho vận – Sản xuất', 'nhom', 2, 3, 'ns_b8e66305-845', null, 'Kho - Đơn hàng · Đóng gói - Vận chuyển', 17)
  ];
  const gon = id => ({ id, ho_ten: ten(id), chuc_vu: chucVu(id) || '' });
  return {
    ds,
    tom_tat: {
      tong_dang_lam: TONG_DANG_LAM,
      dinh_cay: ['ns_admin2'],
      khong_phong: [],
      khong_quan_ly: [],
      /* Hai ô này VẪN trống sau migration — đó là việc chờ Sếp chốt, không
         phải thứ bản vá này tự điền. Bàn đo canh chúng HIỆN RA, có tên. */
      trong_chuc_vu: [gon('ns_nv010015'), gon('ns_nv020003')],
      trong_chuc_danh: [gon('ns_nv010015'), gon('ns_nv020003'),
                        gon('ns_6222e61d-6a0'), gon('ns_a81898a3-f7b')]
    }
  };
}

/* Dữ liệu Y NHƯ HIỆN TRẠNG (trước migration) — dùng cho phép ① và ②: sơ đồ
   phải hiện đúng 24 ở ô gốc và kêu tên hai người rơi ngoài, chứ không phải im
   lặng ở con số 22. */
function duLieuTruocMigration() {
  const ten = id => (NHAN_SU_THAT.find(n => n[0] === id) || [])[1] || null;
  const chucVu = id => (NHAN_SU_THAT.find(n => n[0] === id) || [])[2] || null;
  const gon = id => ({ id, ho_ten: ten(id), chuc_vu: chucVu(id) || '' });
  const sau = duLieuSauMigration();
  return {
    ds: sau.ds,
    tom_tat: {
      ...sau.tom_tat,
      khong_phong: [gon('ns_6222e61d-6a0'), gon('ns_a81898a3-f7b')],
      khong_quan_ly: []
    }
  };
}

/* HIỆN TRẠNG NGUYÊN XI — 4 phòng phẳng, `so_nguoi` 2·3·0·17 (cộng lại = 22),
   không cột `cap`, không khối `tom_tat`. Đây là thứ bản CŨ nhận được trên bản
   thật, và là bộ dữ liệu duy nhất cho ra con số "TRƯỚC" trung thực: đưa dữ
   liệu đã xếp lại cho bản cũ thì nó in 24 — một con số đúng vì lý do sai. */
function duLieuHienTrang() {
  const ten = id => (NHAN_SU_THAT.find(n => n[0] === id) || [])[1] || null;
  const dem = pb => NHAN_SU_THAT.filter(n => n[3] === pb).length;
  return {
    ds: PHONG_BAN_THAT.map(([id, tenPb, truong, thuTu]) => ({
      id, ten: tenPb, hoat_dong: 1, trang_thai: 'da_khoa',
      truong_phong_id: truong, truong_phong_ten: ten(truong),
      so_nguoi: dem(id), thu_tu: thuTu, cha_id: null
    }))
  };
}

function apiRieng(du) {
  return function (duong, u, traJson) {
    if (duong === '/api/toi-la-ai') {
      traJson({
        id: 'ns_admin1', ten: 'Bùi Thị Ngọc', viet_tat: 'BN', chuc_vu: 'Phó Giám đốc',
        vai_tro: 'admin', vi_tri_cong_viec: null, phai_doi_mk: false, co_anh: false,
        phong_ban_quan_ly: [],
        quyen: ['tongquan', 'danhba', 'chat', 'nhansu', 'quantri', 'dulieunen'],
        xem_luong: true, la_admin: true, them_nhan_su: true, quan_ly_chinh_sach_ca: true,
        duoc_tao_tai_khoan: true, duoc_dat_vi_tri: true, duyet_gopy: true,
        kho: { thao_tac: true, quan_ly: true, gia_von: true },
        shopee: { xem: true, quan_ly: true }, thao_tac_van_hanh: true,
        mat_khau_dai_toi_thieu: 8
      });
      return true;
    }
    if (duong === '/api/dulieunen/phong-ban') { traJson(du); return true; }
    if (duong === '/api/dulieunen/chuc-danh') { traJson({ ds: [] }); return true; }
    if (duong === '/api/dulieunen/don-vi')    { traJson({ ds: [] }); return true; }
    if (duong === '/api/dulieunen/tinh-trang') { traJson({ muc: [], viec_tiep_theo: [] }); return true; }
    if (duong === '/api/quan-tri/danh-sach') {
      traJson({ nhan_su: [], vai_tro: [], vai_tro_he_thong: [], vi_tri_cong_viec: [], co_cot_vi_tri: true });
      return true;
    }
    /* Ổ trả lời cho các tab tự khởi động — thiếu khoá là TIẾNG ĐỘNG CỦA BÀN
       ĐO, và phép "không console.error" sẽ đỏ oan. */
    if (/^\/api\/(don-hoan|hoan|shopee|tiktok|lich-su-hoan)/.test(duong)) {
      traJson({ ok: true, don_hoan: [], lich_su: [], danh_sach: [], ket_noi: null,
                quyen: { quan_ly: false, xem: false } });
      return true;
    }
    return false;
  };
}

/* Mở tab Quản trị → phân đoạn "Cơ cấu tổ chức", rồi đọc sơ đồ ĐÃ VẼ THẬT
   (không gọi hàm vẽ tay — gọi tay là đo bản dựng riêng cho bàn đo). */
async function doMotMan(du, { rong, cao }, suaTep = null) {
  const may = await dungMayGia({ apiRieng: apiRieng(du), suaTep, tatHoatAnh: true });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong, cao, doiMs: 2600 });
  try {
    await cr.chay(`document.querySelector('[data-tab="quantri"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 500))`);
    await cr.chay(`document.querySelector('[data-qt="cocau"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 900))`);

    const kq = await cr.chay(`(() => {
      const o = document.getElementById('dln-sodo');
      if (!o) return { co: false };
      const q  = s => o.querySelector(s);
      const qa = s => [...o.querySelectorAll(s)];
      const oGoc = q('.sodo-o.cap-cong_ty');
      const tong = q('.sodo-tong');

      /* TRÀN NGANG — đo trên MỌI phần tử con: bề rộng nội dung (scrollWidth)
         so với bề rộng khung (clientWidth), và mép phải so với mép phải của
         khối sơ đồ. Đo cả hai vì một hộp có thể đúng scrollWidth mà vẫn thò
         ra ngoài do lề âm hay grid track cứng. */
      const khung = o.getBoundingClientRect();
      const thoRa = qa('*').map(e => {
        const r = e.getBoundingClientRect();
        return { lop: e.className && String(e.className).slice(0, 40),
                 lech: Math.round(r.right - khung.right) };
      }).filter(x => x.lech > 1).sort((a, b) => b.lech - a.lech);

      const cuonNgang = qa('*').filter(e => e.scrollWidth > e.clientWidth + 1)
        .map(e => String(e.className).slice(0, 40) + ' +' + (e.scrollWidth - e.clientWidth));

      /* Sâu nhất của cây — đếm số tầng .sodo-hang lồng nhau + 1 (hộp gốc) */
      const sau = e => { let n = 0, p = e; while (p && p !== o) { if (p.classList?.contains('sodo-hang')) n++; p = p.parentElement; } return n; };
      const tang = Math.max(0, ...qa('.sodo-o').map(sau)) + 1;

      const thieu = q('.sodo-thieu');
      const muc = {};
      for (const li of qa('.sodo-thieu li')) muc[li.dataset.thieu] = Number(li.dataset.so);

      return {
        co: true,
        coGoc: !!oGoc,
        tongIn: tong ? Number(tong.dataset.tongNguoi) : null,
        chuTong: tong ? tong.textContent.trim() : '',
        soHopTheoCap: {
          cong_ty: qa('.sodo-o.cap-cong_ty').length,
          phong:   qa('.sodo-o.cap-phong').length,
          nhom:    qa('.sodo-o.cap-nhom').length,
          la:      qa('.sodo-o.cap-la').length
        },
        tang,
        cayPhang: !!q('[data-loi="cay-phang"]'),
        soNhomCoMoTa: qa('.sodo-o.cap-nhom .sodo-mota').length,
        soNhomCoSoNguoi: qa('.sodo-o.cap-nhom [data-so-nguoi]').length,
        soNhomCoTruong: qa('.sodo-o.cap-nhom .sodo-tp').length,
        coPhuTrachGachChan: qa('.sodo-phutrach').length,
        chuPhuTrach: qa('.sodo-phutrach').map(e => e.textContent.replace(/\\s+/g, ' ').trim()),
        coMuiTen: qa('.sodo-noi').length,
        coKhoiCanhBao: !!thieu,
        soMucCanhBao: thieu ? Number(thieu.dataset.canhBaoSo) : null,
        muc,
        /* Sửa tên tại chỗ / kéo thả / gán trưởng nhóm — ba việc bản cũ có,
           bản mới KHÔNG được đánh rơi. */
        giuSuaTen: qa('[data-sua-ten]').length,
        giuKeoTha: qa('.sodo-o[draggable="true"]').length,
        giuOChon:  qa('.sodo-chon').length,
        giuNutTruong: qa('[data-gan-truong]').length,
        rongKhung: Math.round(khung.width),
        rongNoiDung: Math.round(o.scrollWidth),
        rongTrang: Math.round(document.documentElement.scrollWidth),
        rongMan: window.innerWidth,
        caoSoDo: Math.round(o.getBoundingClientRect().height),
        thoRa: thoRa.slice(0, 6),
        cuonNgang: cuonNgang.slice(0, 6)
      };
    })()`);
    /* TIẾNG ĐỘNG PHẢI ĐI CÙNG SỐ ĐO. Lượt chạy đầu của bàn đo này, sơ đồ ra
       RỖNG và mọi phép đo đỏ mà không nói được VÌ SAO — thủ phạm là một
       `ReferenceError` do vùng chết (TDZ), bị `try/catch` của khối khởi động
       nuốt gọn và chỉ hiện ra ở console. Không kéo console về đây thì bàn đo
       biết "hỏng" mà không biết "hỏng ở đâu". */
    kq.loi = [...cr.ngoaiLe, ...cr.loiConsole].slice(0, 4);
    /* Ảnh để Sếp chấm bằng mắt — số đo nói "không tràn", ảnh nói "trông ra
       sao". Hai thứ khác nhau, cần cả hai. */
    if (CHUP && DANG_DO_CHINH) {
      kq.anh = await cr.chup(path.join(CHUP, `so-do-${rong}x${cao}.png`));
      console.log(`      ảnh: ${kq.anh}`);
    }
    return kq;
  } finally { cr.dong(); may.dong(); }
}

/* ==========================================================================
   ĐO BẢN CŨ — lấy con số "TRƯỚC" để đặt cạnh con số "SAU"
   ---------------------------------------------------------------------------
   `node scripts/do-so-do-to-chuc.mjs --truoc <sha>` hoàn nguyên cả `public/`
   về commit đó rồi đo bằng CHÍNH bộ dữ liệu giả này. Đo bằng lời kể ("bản cũ
   chắc là tràn") không phải bằng chứng; hoàn nguyên rồi đo mới là.

   Đọc bằng bộ chọn CHUNG (`#dln-sodo`, `.sodo-o`) chứ không bằng lớp riêng
   của bản mới — bản cũ không có `.cap-cong_ty` nào để mà đếm.
   ========================================================================== */
async function doBanCu(commit, du, { rong, cao }) {
  const may = await dungMayGia({ commit, apiRieng: apiRieng(du), tatHoatAnh: true });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong, cao, doiMs: 2600 });
  try {
    await cr.chay(`document.querySelector('[data-tab="quantri"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 500))`);
    await cr.chay(`document.querySelector('[data-qt="cocau"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 900))`);
    return await cr.chay(`(() => {
      const o = document.getElementById('dln-sodo');
      if (!o) return { co: false };
      const qa = s => [...o.querySelectorAll(s)];
      const khung = o.getBoundingClientRect();
      const thoRa = qa('*').map(e => Math.round(e.getBoundingClientRect().right - khung.right))
                           .filter(x => x > 1);
      const chuGoc = (o.querySelector('.sodo-goc') || o.querySelector('.sodo-o.cap-cong_ty'));
      return {
        co: true,
        chuGoc: chuGoc ? chuGoc.textContent.replace(/\\s+/g, ' ').trim().slice(0, 70) : '(không có ô gốc)',
        soHop: qa('.sodo-o').length,
        coKhoiCanhBao: !!o.querySelector('.sodo-thieu'),
        keCanhBao: qa('.sodo-thieu li').length,
        thoRaToiDa: thoRa.length ? Math.max(...thoRa) : 0,
        caoSoDo: Math.round(khung.height),
        rongKhung: Math.round(khung.width),
        rongTrang: Math.round(document.documentElement.scrollWidth),
        rongMan: window.innerWidth
      };
    })()`);
  } finally { cr.dong(); may.dong(); }
}

/* ==========================================================================
   CHẠY
   ========================================================================== */
console.log('\n' + '='.repeat(72));
console.log('BÀN ĐO SƠ ĐỒ TỔ CHỨC BA TẦNG — ' + new Date().toISOString().slice(0, 10));
console.log('='.repeat(72));

doSql();

if (!CHI_SQL) {
  const SAU = duLieuSauMigration();
  const CHUA_XEP = duLieuTruocMigration();

  /* Số đo "TRƯỚC" — chỉ khi được yêu cầu, vì nó phải hoàn nguyên cả public/ */
  if (TRUOC) {
    console.log(`\n─── SỐ ĐO BẢN CŨ (commit ${TRUOC}) ───`);
    for (const man of MAN) {
      const c = await doBanCu(TRUOC, duLieuHienTrang(), man);
      console.log(`  ${man.rong}×${man.cao}  ô gốc in: "${c.chuGoc}"`);
      console.log(`             ${c.soHop} hộp · khối cảnh báo: ${c.coKhoiCanhBao ? c.keCanhBao + ' mục' : 'KHÔNG CÓ'}`
        + ` · thò ra ${c.thoRaToiDa}px · cao ${c.caoSoDo}px · trang ${c.rongTrang}/${c.rongMan}px`);
    }
  }

  for (const man of MAN) {
    console.log(`\n─── MÀN ${man.rong}×${man.cao} ───`);
    const k = await doMotMan(SAU, man);
    if (!ok('Vẽ được sơ đồ', k.co)) continue;
    ok('Không một lỗi console / ngoại lệ nào khi vẽ', (k.loi || []).length === 0,
      (k.loi || []).join(' | ').slice(0, 200) || '—');

    /* ① TỔNG NGƯỜI Ở Ô GỐC */
    ok(`① Ô gốc in ĐÚNG ${TONG_DANG_LAM} người đang làm`, k.tongIn === TONG_DANG_LAM,
      `in ra "${k.chuTong}"`);
    ok('① Con số đó KHÔNG phải tổng cộng theo phòng',
      k.tongIn !== SAU.ds.reduce((m, p) => m + (p.cap === 'cong_ty' ? 0 : p.so_nguoi), 0)
      || TONG_DANG_LAM === SAU.ds.reduce((m, p) => m + (p.cap === 'nhom' ? p.so_nguoi : 0), 0),
      `cộng theo Nhóm = ${SAU.ds.filter(p => p.cap === 'nhom').reduce((m, p) => m + p.so_nguoi, 0)}`);

    /* ③ BA TẦNG */
    ok('③ Cây đúng BA TẦNG', k.tang === 3, `đo được ${k.tang} tầng`);
    ok('③ Không có báo động cây phẳng', !k.cayPhang);
    ok('③ Đủ 1 Công ty · 2 Phòng · 5 Nhóm, không hộp nào lạc cấp',
      k.soHopTheoCap.cong_ty === 1 && k.soHopTheoCap.phong === 2
      && k.soHopTheoCap.nhom === 5 && k.soHopTheoCap.la === 0,
      JSON.stringify(k.soHopTheoCap));
    ok('③ Mỗi Nhóm có hai dòng chức năng, số người và dòng trưởng nhóm',
      k.soNhomCoMoTa === 5 && k.soNhomCoSoNguoi === 5 && k.soNhomCoTruong === 5,
      `mô tả ${k.soNhomCoMoTa} · số ${k.soNhomCoSoNguoi} · trưởng ${k.soNhomCoTruong}`);
    ok('③ Có dòng "trực tiếp phụ trách" gạch chân ở hộp Công ty và 2 Phòng',
      k.coPhuTrachGachChan >= 3, `${k.coPhuTrachGachChan} dòng`);
    /* Chức vụ trong hồ sơ thật là "Giám đốc kiêm TP. Kinh doanh - MKT". Sơ đồ
       phải in đúng vai ông ấy đứng ở hộp này — "Giám đốc" — chứ không kéo cả
       cụm kiêm nhiệm vào. */
    ok('③ Dòng phụ trách in ĐÚNG chức chính, không kéo theo phần "kiêm"',
      (k.chuPhuTrach || []).some(c => c.startsWith('Giám đốc trực tiếp phụ trách: Nguyễn Duy Phong'))
      && (k.chuPhuTrach || []).some(c => c.startsWith('Phó Giám đốc trực tiếp phụ trách: Bùi Thị Ngọc'))
      && !(k.chuPhuTrach || []).some(c => /kiêm/i.test(c)),
      (k.chuPhuTrach || []).join(' | '));
    ok('③ Có mũi tên nối xuống giữa các tầng', k.coMuiTen >= 3, `${k.coMuiTen} mũi tên`);

    /* ② KHỐI CẢNH BÁO */
    ok('② Có khối cảnh báo đếm được', k.coKhoiCanhBao && k.soMucCanhBao !== null,
      `${k.soMucCanhBao} mục`);
    ok('② Hai người trống chức vụ được kêu tên', k.muc['trong-chuc-vu'] === 2,
      JSON.stringify(k.muc));
    ok('② Bốn người trống chức danh được kêu tên', k.muc['trong-chuc-danh'] === 4);
    ok('② Ba nhóm chưa có trưởng nhóm được kêu tên', k.muc['nhom-chua-truong'] === 3);

    /* ④ KHÔNG TRÀN NGANG */
    ok(`④ Sơ đồ không thò ra ngoài khung (${man.rong}px)`, k.thoRa.length === 0,
      k.thoRa.map(x => `${x.lop} +${x.lech}px`).join(' · ') || '—');
    ok('④ Không phần tử nào phải cuộn ngang', k.cuonNgang.length === 0,
      k.cuonNgang.join(' · ') || '—');
    ok('④ Cả trang không có thanh kéo ngang', k.rongTrang <= k.rongMan,
      `trang ${k.rongTrang}px / màn ${k.rongMan}px`);

    /* GIỮ ĐƯỢC THÌ GIỮ */
    ok('Giữ: sửa tên tại chỗ · kéo thả · ô chọn trực thuộc · gán trưởng nhóm',
      k.giuSuaTen === 8 && k.giuKeoTha === 7 && k.giuOChon === 7 && k.giuNutTruong === 7,
      `sửa ${k.giuSuaTen} · kéo ${k.giuKeoTha} · chọn ${k.giuOChon} · gán ${k.giuNutTruong}`);

    if (BANG_KE) console.log(`      khung ${k.rongKhung}px · nội dung ${k.rongNoiDung}px · cao sơ đồ ${k.caoSoDo}px`);
  }

  /* ======================================================================
     CA ĐỐI CHỨNG (BH-16) — bàn đo phải BẮT ĐƯỢC lỗi cố ý
     ====================================================================== */
  console.log('\n─── CA ĐỐI CHỨNG (BH-16) ───');
  DANG_DO_CHINH = false;              // từ đây không chụp nữa — xem chú thích ở CHUP
  const M = MAN[1];   // bẻ ở 375px — nơi mọi thứ dễ hỏng nhất

  // ① tổng ở ô gốc quay về cách cũ: cộng theo phòng = 22
  {
    const cu = JSON.parse(JSON.stringify(duLieuSauMigration()));
    cu.tom_tat.tong_dang_lam = 22;
    const k = await doMotMan(cu, M);
    ok('ĐỐI CHỨNG ① — bắt được tổng 22 thay vì 24', k.co && k.tongIn !== TONG_DANG_LAM,
      `bàn đo đọc ${k.tongIn}`);
  }

  // ② gỡ khối cảnh báo khỏi app.js
  {
    const k = await doMotMan(duLieuSauMigration(), M, (s, ten) =>
      ten === 'assets/js/app.js'
        ? s.replace('+ veCanhBaoNhanSu(ds, tt)', "+ ''")
        : s);
    ok('ĐỐI CHỨNG ② — bắt được khi khối cảnh báo bị gỡ', k.co && !k.coKhoiCanhBao,
      k.coKhoiCanhBao ? 'khối vẫn còn — BÀN ĐO MÙ' : 'khối biến mất, bàn đo thấy');
  }

  // ② (b) hai người không phòng: phải hiện ra, có tên, đếm được
  {
    const k = await doMotMan(CHUA_XEP, M);
    ok('ĐỐI CHỨNG ②b — 2 người không phòng HIỆN RA thành cảnh báo, không biến mất',
      k.co && k.muc['khong-phong'] === 2, JSON.stringify(k.muc));
    ok('ĐỐI CHỨNG ②b — mà ô gốc vẫn in đủ 24 người', k.tongIn === TONG_DANG_LAM,
      `in ra "${k.chuTong}"`);
  }

  /* ②c CÙNG MỘT ĐẦU VÀO, HAI BẢN MÃ — đây là cặp số "trước/sau" trung thực
     nhất: dữ liệu y nguyên hiện trạng (4 phòng phẳng, chưa nạp migration,
     máy chủ chưa gửi `tom_tat`). Bản cũ vẽ êm ru và in 22. Bản mới KHÔNG
     được phép cũng vẽ êm ru: phải kêu cây phẳng VÀ nói thẳng là chưa đọc
     được số người, chứ không im lặng để người đọc tưởng đã sạch. */
  {
    const k = await doMotMan(duLieuHienTrang(), M);
    ok('ĐỐI CHỨNG ②c — dữ liệu hiện trạng: bản mới KÊU cây phẳng', k.co && k.cayPhang);
    ok('ĐỐI CHỨNG ②c — và nói rõ chưa đếm được người, không im lặng',
      k.soMucCanhBao === -1 && k.tongIn !== TONG_DANG_LAM,
      `ô gốc in "${k.chuTong}" · khối cảnh báo ${k.soMucCanhBao}`);
  }

  // ③ xoá cột `cap` — cây phẳng trở lại
  {
    const phang = duLieuSauMigration();
    for (const p of phang.ds) { delete p.cap; p.cha_id = null; }
    const k = await doMotMan(phang, M);
    ok('ĐỐI CHỨNG ③ — bắt được cây phẳng và KÊU TO', k.co && k.cayPhang && k.tang < 3,
      `${k.tang} tầng · báo động ${k.cayPhang}`);
  }

  // ④ ép 5 Nhóm nằm ngang bằng CSS chèn thêm → phải tràn ở 375px
  {
    const CHEN = `<style id="doi-chung-tran">.sodo-hang.hang-nhom{grid-template-columns:repeat(5,240px) !important}</style>`;
    const k = await doMotMan(duLieuSauMigration(), M, (s, ten) =>
      ten === 'app.html' ? s.replace('</head>', CHEN + '</head>') : s);
    ok('ĐỐI CHỨNG ④ — bắt được tràn ngang khi ép 5 Nhóm nằm ngang ở 375px',
      k.co && (k.thoRa.length > 0 || k.cuonNgang.length > 0 || k.rongTrang > k.rongMan),
      k.thoRa.map(x => `${x.lop} +${x.lech}px`).join(' · ') || `trang ${k.rongTrang}/${k.rongMan}`);
  }
}

process.exit(tongKet() ? 0 : 1);
