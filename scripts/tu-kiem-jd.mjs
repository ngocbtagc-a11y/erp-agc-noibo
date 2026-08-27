/* ==========================================================================
   BÀN THỬ NGOẠI TUYẾN — SPEC-0007 Đợt 3 (mô tả công việc theo MBOs)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tu-kiem-jd.mjs
   0 phút GitHub Actions, 0 token, không chạm D1 thật, không chạm mạng.

   Điểm khác bàn thử Đợt 2: ở đây SQLite là THẬT (`node:sqlite`), và câu SQL
   chạy là ĐÚNG NGUYÊN VĂN file migration đọc từ đĩa — không gõ lại. Ràng
   buộc `do_bang NOT NULL` là chốt chặn duy nhất ép outcome, mà BH-23 nói rõ:
   "viết xong cổng mà chưa thử cho nó chặn thật thì coi như CHƯA CÓ CỔNG".
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { moDauLaHoatDong, cauNhacHoatDong, luu } from '../src/mota-cv.js';

let dat = 0, hong = 0;
const loi = [];
function kiem(ten, thuc, mong) {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) { dat++; return true; }
  hong++; loi.push(`  ✗ ${ten}\n      được : ${a}\n      cần   : ${b}`);
}

const SQL = readFileSync(new URL('../migrations/them-mota-congviec.sql', import.meta.url), 'utf8');

console.log('\n=== ① MIGRATION CHẠY THẬT TRÊN SQLite ===\n');

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE chuc_danh (id INTEGER PRIMARY KEY, ten TEXT);
         CREATE TABLE nhan_su   (id TEXT PRIMARY KEY, chuc_danh_id INTEGER);
         INSERT INTO chuc_danh VALUES (1,'Hành chính nhân sự'),(2,'Quản lý kho');
         INSERT INTO nhan_su   VALUES ('ns5',1),('ns1',2);`);
db.exec(SQL);
kiem('migration chạy sạch, không lỗi cú pháp', true, true);

/* --- Migration KHÔNG được chứa lệnh phá dữ liệu (yêu cầu "lùi được") ------
   Bỏ chú thích TRƯỚC khi quét, không thì phép kiểm đo chú thích chứ không đo
   code (BH-29) — file này có hẳn một khối chú thích nói về DROP TABLE.
   Chuẩn hoá CRLF trước, vì `.` trong JS không khớp `\r`. */
{
  const sach = SQL.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '');
  kiem('không có DROP trong phần thi hành', /\bDROP\b/i.test(sach), false);
  kiem('không có DELETE/UPDATE dữ liệu cũ', /\b(DELETE|UPDATE)\b/i.test(sach), false);
  kiem('ĐỐI CHỨNG · phép kiểm CÓ THỂ bắt được — chuỗi "DROP TABLE x" bị bắt',
    /\bDROP\b/i.test(sach + ' DROP TABLE x;'), true);
  kiem('ĐỐI CHỨNG · nếu KHÔNG bỏ chú thích thì phép kiểm báo động giả',
    /\bDROP\b/i.test(SQL), true);
}

/* --- AC #8: `do_bang` trống → KHÔNG lưu được ----------------------------- */
{
  let batDuoc = null;
  try {
    db.exec("INSERT INTO mo_ta_cong_viec (chuc_danh_id, dau_ra, do_bang) VALUES (1, 'Bảng công tháng đã chốt', NULL)");
  } catch (e) { batDuoc = /NOT NULL/i.test(e.message); }
  kiem('AC#8 · do_bang = NULL bị DB CHẶN CỨNG', batDuoc, true);

  let batDuoc2 = null;
  try {
    db.exec("INSERT INTO mo_ta_cong_viec (chuc_danh_id, dau_ra) VALUES (1, 'Bảng công tháng đã chốt')");
  } catch (e) { batDuoc2 = /NOT NULL/i.test(e.message); }
  kiem('AC#8 · bỏ hẳn cột do_bang cũng bị chặn', batDuoc2, true);

  /* ĐỐI CHỨNG (BH-16/BH-26) — cùng câu INSERT, chỉ khác BẢNG: một bản sao
     y hệt nhưng GỠ chữ `NOT NULL` khỏi `do_bang`. Vì sao BẮT BUỘC phải khác:
     lệch cơ học ở đúng một từ khoá, hỏng với MỌI đầu vào, không phụ thuộc
     dữ liệu thử. Nếu ca này CŨNG bị chặn thì phép kiểm trên đang đo thứ
     khác (ví dụ `dau_ra`), không đo `do_bang`. */
  db.exec(`CREATE TABLE mtcv_khong_chot (
    id INTEGER PRIMARY KEY AUTOINCREMENT, chuc_danh_id INTEGER NOT NULL,
    nhan_su_id TEXT, dau_ra TEXT NOT NULL, do_bang TEXT, nhip TEXT NOT NULL DEFAULT 'thang')`);
  let lot = false;
  try {
    db.exec("INSERT INTO mtcv_khong_chot (chuc_danh_id, dau_ra, do_bang) VALUES (1, 'Quản lý kho', NULL)");
    lot = true;
  } catch { lot = false; }
  kiem('ĐỐI CHỨNG · gỡ NOT NULL thì câu y hệt LỌT QUA (phép kiểm đủ nhạy)', lot, true);

  // Và bản đúng thì lưu được khi có đủ hai ô.
  db.exec("INSERT INTO mo_ta_cong_viec (chuc_danh_id, dau_ra, do_bang, nhip) VALUES (1, 'Bảng công tháng đã chốt', 'Gửi kế toán trước ngày 3', 'thang')");
  kiem('có đủ dau_ra + do_bang thì lưu được',
    db.prepare('SELECT COUNT(*) n FROM mo_ta_cong_viec').get().n, 1);
  kiem('dau_ra trống cũng bị chặn', (() => {
    try { db.exec("INSERT INTO mo_ta_cong_viec (chuc_danh_id, do_bang) VALUES (1,'x')"); return false; }
    catch (e) { return /NOT NULL/i.test(e.message); }
  })(), true);
}

/* --- 4 MẪU ĐIỀN SẴN: bắt buộc phải có, đủ 4 nhóm ------------------------- */
{
  const nhom = db.prepare('SELECT nhom, COUNT(*) n FROM jd_mau GROUP BY nhom ORDER BY nhom').all();
  kiem('đủ 4 nhóm mẫu: kho · kế toán · HCNS · vận hành sàn',
    nhom.map(r => r.nhom), ['hcns', 'ke_toan', 'kho', 'van_hanh_san']);
  kiem('mỗi nhóm có ít nhất 5 mẫu', nhom.every(r => r.n >= 5), true);

  /* Mẫu mà chính nó vi phạm luật outcome thì dạy người ta viết sai. Quét cả
     bộ bằng đúng hàm mà máy chủ dùng để cảnh báo. */
  const xau = db.prepare('SELECT nhom, dau_ra FROM jd_mau').all()
    .filter(r => moDauLaHoatDong(r.dau_ra));
  kiem('KHÔNG mẫu nào mở đầu bằng động từ hoạt động', xau.map(r => r.dau_ra), []);

  /* Mẫu phải viết đúng NGHIỆP VỤ TMĐT thực phẩm nhập khẩu, không chung chung.
     Kiểm bằng những chữ chỉ xuất hiện khi viết đúng ngành. */
  const cot = db.prepare('SELECT dau_ra || \' \' || do_bang t FROM jd_mau').all().map(r => r.t).join(' ');
  for (const tu of ['Shopee', 'TikTok', 'hạn sử dụng', 'đơn hoàn', 'BHXH', 'tồn kho', 'SKU']) {
    kiem(`mẫu có nhắc "${tu}" (đúng ngành, không chung chung)`, cot.includes(tu), true);
  }
  kiem('ĐỐI CHỨNG · phép kiểm trên KHÔNG luôn-đạt: chữ không liên quan thì trượt',
    cot.includes('lò hơi công nghiệp'), false);

  kiem('mọi mẫu có nhịp hợp lệ',
    db.prepare("SELECT COUNT(*) n FROM jd_mau WHERE nhip NOT IN ('ngay','tuan','thang','quy')").get().n, 0);
}

console.log('\n=== ② TẦNG MÁY CHỦ (src/mota-cv.js) ===\n');

/* --- Hàm thuần: nhận diện động từ hoạt động ------------------------------ */
kiem('bắt "Quản lý kho"', moDauLaHoatDong('Quản lý kho'), 'quản lý');
kiem('bắt cả khi viết thường', moDauLaHoatDong('theo dõi công nợ'), 'theo dõi');
kiem('bắt "Đảm bảo ..."', moDauLaHoatDong('Đảm bảo hàng về đúng hẹn'), 'đảm bảo');
kiem('KHÔNG bắt một đầu ra thật', moDauLaHoatDong('Bảng công tháng đã chốt'), null);
kiem('KHÔNG bắt khi động từ nằm giữa câu', moDauLaHoatDong('Sổ quản lý tồn kho đã khoá'), null);
kiem('câu nhắc nêu đúng động từ vừa bắt', cauNhacHoatDong('quản lý').includes('quản lý'), true);
/* ĐỐI CHỨNG · bản "bắt bất cứ đâu trong câu" (dùng includes thay vì
   startsWith). Vì sao BẮT BUỘC khác: "Sổ quản lý tồn kho đã khoá" là một đầu
   ra ĐÚNG, nhưng bản đó vẫn kêu — tức là cảnh báo giả, và cảnh báo giả nhiều
   thì người dùng học cách bỏ qua mọi cảnh báo. */
{
  const banSai = (s) => ['quản lý', 'theo dõi'].find(v => String(s).toLowerCase().includes(v)) || null;
  kiem('ĐỐI CHỨNG · bản dùng includes kêu nhầm trên đầu ra đúng',
    banSai('Sổ quản lý tồn kho đã khoá'), 'quản lý');
}

/* --- Đường lưu qua máy chủ ----------------------------------------------- */
function dbGia() {
  return {
    DB: {
      prepare(sql) {
        const s = sql.replace(/\s+/g, ' ').trim();
        let t = [];
        return {
          bind(...a) { t = a; return this; },
          async first() {
            if (s.startsWith('SELECT id, ten FROM chuc_danh')) return { id: t[0], ten: 'HCNS' };
            if (s.startsWith('SELECT id, chuc_danh_id FROM nhan_su')) return { id: t[0], chuc_danh_id: 1 };
            if (s.startsWith('SELECT id FROM mo_ta_cong_viec')) return { id: t[0] };
            return null;
          },
          async run() { return { meta: {} }; },
          async all() { return { results: [] }; }
        };
      }
    }
  };
}
const phien = { nhan_su_id: 'ns9' };
const doc = async (r) => JSON.parse(await r.text());

{
  const r = await luu(dbGia(), phien, { chuc_danh_id: 1, dau_ra: 'Bảng công tháng đã chốt', do_bang: '' });
  const b = await doc(r);
  kiem('AC#8 · máy chủ chặn khi thiếu "đo bằng gì"', [r.status, /ĐO BẰNG GÌ/.test(b.loi || '')], [400, true]);
}
{
  const r = await luu(dbGia(), phien, { chuc_danh_id: 1, dau_ra: '', do_bang: 'x' });
  kiem('máy chủ chặn khi thiếu đầu ra', r.status, 400);
}
{
  const r = await luu(dbGia(), phien, {
    chuc_danh_id: 1, dau_ra: 'Bảng công tháng đã chốt',
    do_bang: 'Gửi kế toán trước ngày 3', nhip: 'thang'
  });
  const b = await doc(r);
  kiem('đủ hai ô thì lưu được, KHÔNG cảnh báo', [r.status, b.ok, b.canh_bao], [200, true, []]);
}
{
  const r = await luu(dbGia(), phien, {
    chuc_danh_id: 1, dau_ra: 'Quản lý kho', do_bang: 'Không để mất hàng'
  });
  const b = await doc(r);
  kiem('mở đầu bằng hoạt động thì VẪN LƯU (chặn mềm) nhưng có nhắc',
    [r.status, b.ok, b.canh_bao.length], [200, true, 1]);
  kiem('…và câu nhắc nói rõ đây là hoạt động', /HOẠT ĐỘNG/.test(b.canh_bao[0]), true);
}
{
  // Kiêm nhiệm gắn nhầm chức danh phải bị chặn — nếu không, JD của vị trí
  // người ta KHÔNG giữ sẽ mọc thêm một dòng treo lơ lửng.
  const env = dbGia();
  env.DB.prepare = ((goc) => (sql) => {
    const api = goc(sql);
    if (sql.includes('SELECT id, chuc_danh_id FROM nhan_su')) {
      api.first = async () => ({ id: 'ns1', chuc_danh_id: 2 });   // giữ chức danh KHÁC
    }
    return api;
  })(env.DB.prepare.bind(env.DB));
  const r = await luu(env, phien, {
    chuc_danh_id: 1, nhan_su_id: 'ns1', dau_ra: 'Ca kho xếp đủ người', do_bang: 'Không ca nào thiếu'
  });
  kiem('kiêm nhiệm gắn sai chức danh bị chặn', r.status, 400);
}
{
  const r = await luu(dbGia(), phien, {
    chuc_danh_id: 1, nhan_su_id: 'ns5', dau_ra: 'Trả lời khách trong 1 giờ', do_bang: 'Tỉ lệ ≥ 90%'
  });
  kiem('ĐỐI CHỨNG · kiêm nhiệm ĐÚNG chức danh thì lưu được', r.status, 200);
}
{
  const r = await luu(dbGia(), phien, { dau_ra: 'x', do_bang: 'y' });
  kiem('thiếu chức danh thì chặn', r.status, 400);
}
{
  const r = await luu(dbGia(), phien, {
    chuc_danh_id: 1, dau_ra: 'A', do_bang: 'B', nhip: 'moi_gio'
  });
  kiem('nhịp lạ bị hạ về mặc định, không ném lỗi', r.status, 200);
}

console.log(loi.join('\n'));
console.log(`\n${dat} đạt · ${hong} hỏng\n`);
process.exit(hong ? 1 : 0);
