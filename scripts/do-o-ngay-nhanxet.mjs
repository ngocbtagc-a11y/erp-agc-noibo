/* ==========================================================================
   BÀN ĐO — Ô NHẬP NGÀY (GY-0004) + NHẬN XÉT MỘT VIỆC (GY-0005)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-o-ngay-nhanxet.mjs   (thêm --rong 1440 nếu cần)
   0 phút GitHub Actions, 0 token, không chạm mạng, không chạm D1 thật.

   HAI PHẦN, HAI LOẠI BẰNG CHỨNG KHÁC NHAU — và đó là cả điểm của file này:

   PHẦN A · MÁY CHỦ (SQLite thật qua `ban-thu-d1.mjs`)
     Nhận xét là chuyện quyền + ghi vết + báo ai. Những thứ đó chỉ chứng minh
     được bằng cách GỌI API thật rồi ĐỌC BẢNG thật, không phải bằng cách khớp
     chuỗi SQL (BH-34).

   PHẦN B · TRÌNH DUYỆT (Chrome headless thật)
     Ô nhập ngày là GIAO DIỆN. Bàn thử logic không chứng minh được gì ở đây:
     lỗi GY-0004 nằm ĐÚNG ở chỗ trình duyệt bắn `change` giữa lúc người ta
     đang gõ, và mã cũ khoá ô lại ⇒ mất tiêu điểm. Muốn thấy nó thì phải GÕ
     THẬT bằng `Input.dispatchKeyEvent`, không phải gán `.value` rồi tự khen.

   ĐO GÌ — PHẦN A
     A1  ai nhận xét được / ai bị chặn (người giao · quản lý · người nhận ·
         người ngoài)
     A2  việc ĐÃ NGHIỆM THU vẫn nhận xét được (khác hẳn `cvSua`, cố ý)
     A3  vết ghi vào ĐÚNG sổ chung `lich_su_thay_doi_nen`, KHÔNG đẻ bảng mới
     A4  câu sổ ĐỌC HIỂU ĐƯỢC ("… nhận xét: …"), không phải "đổi nhan_xet"
     A5  người bị nhận xét NHẬN ĐƯỢC THÔNG BÁO — và tự nhận xét mình thì
         KHÔNG tự gửi cho mình
     A6  nhận xét rỗng/quá ngắn bị chặn
     A7  NHẬN XÉT CŨ KHÔNG BỊ VẾT SỬA ĐẨY RA KHỎI TRẦN (REV-0061 · CHẶN-1)
     A8  nhận xét quá 1000 ký tự bị TỪ CHỐI, không bị cắt im lặng (VỪA-3)

   ĐO GÌ — PHẦN B
     B1  GÕ THẬT 8 chữ số của MỘT NGÀY KHÔNG ĐỐI XỨNG vào ô ngày sinh
     B2  DÁN thật "25/01/1990" → 1990-01-25
     B3  CẢ LỚP: mọi `input[type=date]` đều có min/max — đếm và nêu số
     B4  ngưỡng ngón tay 44px cho ô ngày và nút Nhận xét
     B5  nút "Nhận xét" có mặt ở CẢ HAI phía (người giao VÀ người nhận), và
         hộp mở ra thật
     B6  không tràn ngang ở 375px khi hộp nhận xét mở
     B7  DÒNG ĐỌC LẠI NGÀY: ô có giá trị thì hiện "= 25/01/1990 · N tuổi", và
         con số đó phải KHỚP `o.value` — bản vá THẬT của GY-0004
     B8  `#kvBcDen` / `#kvBcTu` / `#dmNgayVao` nhận được ngày TƯƠNG LAI (CAO-1)
     B9  câu lỗi nói ĐÚNG ĐẦU BỊ VI PHẠM, không một câu chung cho cả hai (CAO-2)
     B10 câu lỗi đỏ KHÔNG dính lại giữa hai lần mở hộp hồ sơ (VỪA-2)
     B10b CẢ 8 Ô mà `app.js` gán `.value` bằng mã: gán xong thì câu đỏ của bản
         ghi TRƯỚC biến mất VÀ dòng đọc lại hiện đúng giá trị mới (CAO-1 vòng 2)
     B10c cùng chuyện đó trên MÀN THẬT: bấm "Sửa" việc A → gõ nhầm → Huỷ →
         bấm "Sửa" việc B, đúng cảnh Hồ Ly dựng
     B11 bấm dòng thông báo `cong_viec_nhan_xet` MỞ ĐÚNG hộp nhận xét (VỪA-1)

   ⚠️ VÌ SAO B1 PHẢI GÕ `25011990` CHỨ KHÔNG PHẢI `01011990` — ĐỪNG ĐỔI LẠI.
   Bản đầu của bàn đo này gõ `01011990`. `01/01` đọc theo ngày/tháng/năm hay
   tháng/ngày/năm đều ra `1990-01-01`: một NGÀY ĐỐI XỨNG. Phép kiểm đó KHÔNG
   THỂ phát hiện lỗi đảo thứ tự — không phải vì thiếu ca, mà vì nguyên lý.
   Hồ Ly gõ `25011990` trên Chrome tiếng Anh ra `1990-02-05` ở 9/9 ô: hợp lệ,
   nằm trong min/max, không một câu lỗi nào (REV-0061). Ai đổi ngày này về một
   ngày đối xứng là tự bịt mắt bàn đo.

   Và bàn đo KHÔNG đòi `value` phải bằng `1990-01-25`: thứ tự ô con do NGÔN
   NGỮ GIAO DIỆN của trình duyệt quyết, `<input type="date">` không cho ERP
   đổi. Thứ đo được — và là thứ thật sự cứu người dùng — là ERP có NÓI RA nó
   hiểu thành ngày nào không (B7), và `value` có khớp đúng thứ tự mà trình
   duyệt TỰ KHAI không (B1). Sai lệch giữa hai cái đó mới là lỗi.

   CA ĐỐI CHỨNG (BH-16) — bẻ ĐÚNG MỘT chỗ, nói TRƯỚC phép kiểm nào phải đỏ:
     DC-A  trả `o.disabled = true` về ô ngày sinh   → B1 mất tiêu điểm
     DC-B  gỡ `theoDoiONgay()`                      → B2/B3 mất dán + mất min/max
     DC-C  gỡ nhánh `nhan_xet` khỏi `cauSuaDoc`     → A4 câu sổ đọc không hiểu
     DC-D  bỏ chặn quyền trong `cvNhanXet`          → A1 người ngoài nhận xét được
     DC-E  gỡ nút Nhận xét ở phía NGƯỜI NHẬN        → B5 người bị nhận xét mù
     DC-F  bỏ lọc `truong` ở `suaLichSu`            → A7 nhận xét cũ rơi mất
     DC-G  gỡ dòng đọc lại ngày (`docLaiNgay`)      → B7 mù trở lại
     DC-H  gỡ BẪY trên `value` trong `o-ngay.js`    → B10b/B10c đỏ CẢ 8 ô
   ========================================================================== */

import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';
import { dungMayGia, moChrome, TOI } from './lib/ban-do-chrome.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = path.join(GOC, '.tam-do-ongay');
const RONG = (() => { const i = process.argv.indexOf('--rong'); return i > 0 ? parseInt(process.argv[i + 1], 10) : 375; })();

datDongHo('2026-09-07T03:00:00Z');   // 10:00 giờ VN

/* ======================================================================== */
/* PHẦN A — MÁY CHỦ                                                          */
/* ======================================================================== */

/* Đúng sơ đồ báo cáo Sếp Ngọc chốt cho kho: AN -> DUY -> SEP.
   HANG ở phòng khác, không dính dây nào — dùng để đo "người ngoài". */
const NGUOI = [
  ['SEP',   'Bùi Thị Ngọc',     'Ban giám đốc',  null,   'admin'],
  ['DUY',   'Phạm Khương Duy',  'Kho vận',       'SEP',  'quan_ly_kho'],
  ['AN',    'Nguyễn Văn An',    'Kho vận',       'DUY',  'nhan_vien_kho'],
  ['HUONG', 'Vũ Lan Hương',     'Hành chính',    'SEP',  'hcns'],
  ['HANG',  'Phan Thị Hằng',    'Kế toán',       'SEP',  'ke_toan_truong']
];

function moi(db) {
  db.exec('DELETE FROM lich_su_thay_doi_nen; DELETE FROM thong_bao; DELETE FROM cong_viec;' +
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
     han_chot, trang_thai, tao_luc)
    VALUES (?,?,?,'SEP','Bùi Thị Ngọc','AN','Nguyễn Văn An','2026-09-10',?,'2026-09-01 09:00:00')`);
  cv.run(1, 'Rà soát tồn lô chè chưng yến', 'File đối chiếu tồn khớp 100%, gửi trước 17h', 'dang_lam');
  cv.run(2, 'Kiểm kê hàng nhập khẩu quý 3', 'Biên bản kiểm kê có chữ ký 2 bên', 'hoan_thanh');
  // TODO cá nhân: HUONG tự giao cho mình — nhận xét chính mình thì đừng tự
  // bắn thông báo cho mình.
  db.prepare(`INSERT INTO cong_viec
    (id, tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten,
     trang_thai, tao_luc)
    VALUES (9,'Gọi NCC chè','Có báo giá','HUONG','Vũ Lan Hương','HUONG','Vũ Lan Hương','moi','2026-09-01 09:00:00')`).run();
}

async function dungVong(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;
  const phien = {};
  for (let i = 0; i < NGUOI.length; i++) phien[NGUOI[i][0]] = await taoPhienThat(env, i + 1);

  const nx = (ai, than) => goiAPI(worker, env, '/api/cong-viec/nhan-xet', phien[ai],
    { method: 'POST', body: JSON.stringify(than) });
  const lichSu = (ai, id, truong) => goiAPI(worker, env,
    `/api/sua/lich-su?bang=cong_viec&id=${id}` + (truong ? `&truong=${truong}` : ''), phien[ai]);
  const vet = (id) => db.prepare(
    "SELECT * FROM lich_su_thay_doi_nen WHERE bang='cong_viec' AND ban_ghi_id = ? AND truong='nhan_xet'").all(String(id));
  const tinCua = (who) => db.prepare(
    'SELECT noi_dung, loai FROM thong_bao WHERE nguoi_nhan_id = ?').all(who);
  return { db, env, worker, phien, nx, lichSu, vet, tinCua };
}

function banBeGay(ten, doi) {
  const dich = path.join(TAM, ten);
  rmSync(dich, { recursive: true, force: true });
  mkdirSync(dich, { recursive: true });
  cpSync(path.join(GOC, 'src'), dich, { recursive: true });
  const f = path.join(dich, 'index.js');
  const truoc = readFileSync(f, 'utf8');
  const sau = doi(truoc);
  if (sau === truoc) throw new Error(`${ten}: KHÔNG bẻ được gì — ca đối chứng vô nghĩa, phép đo hỏng`);
  writeFileSync(f, sau, 'utf8');
  return dich;
}

console.log('\n' + '='.repeat(72));
console.log('GY-0004 · Ô NHẬP NGÀY   +   GY-0005 · NHẬN XÉT MỘT VIỆC');
console.log('='.repeat(72));

console.log('\n=== A · MÁY CHỦ — nhận xét một việc đã giao ===\n');
const T = await dungVong(path.join(GOC, 'src'));

/* A1 — ai được viết */
{
  const r = await T.nx('SEP', { id: 1, noi_dung: 'Chỗ làm tốt: file đối chiếu gửi trước 17h, đúng cam kết.' });
  ok('A1 · NGƯỜI GIAO nhận xét → CHO', r.status === 200, `HTTP ${r.status} ${JSON.stringify(r.than)}`);
}
{
  const r = await T.nx('DUY', { id: 1, noi_dung: 'Chỗ cần sửa: lần sau ghi rõ số lô ở cột ghi chú.' });
  ok('A1 · QUẢN LÝ CẤP TRÊN của người nhận → CHO', r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await T.nx('AN', { id: 1, noi_dung: 'Em nhận rồi ạ, lô 12 em bổ sung trong hôm nay.' });
  ok('A1 · CHÍNH NGƯỜI NHẬN nói lại → CHO (nhận xét một chiều thì không ai đọc)',
     r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await T.nx('HANG', { id: 1, noi_dung: 'Người ngoài chen vào nhận xét việc phòng khác.' });
  ok('A1 · NGƯỜI NGOÀI (khác phòng, không dính dây) → CHẶN 403', r.status === 403, `HTTP ${r.status}`);
}

/* A2 — việc đã nghiệm thu */
{
  const r = await T.nx('SEP', { id: 2, noi_dung: 'Biên bản đủ chữ ký, đóng gói gọn. Ghi nhận.' });
  ok('A2 · việc ĐÃ HOÀN THÀNH vẫn nhận xét được (khác `cvSua`, cố ý)',
     r.status === 200, `HTTP ${r.status}`);
}

/* A3 — ghi vào đúng sổ chung, không đẻ bảng */
{
  const ds = T.vet(1);
  ok('A3 · vết nằm trong sổ chung `lich_su_thay_doi_nen` (3 nhận xét ở việc #1)',
     ds.length === 3, `${ds.length} dòng`);
  ok('A3 · KHÔNG đẻ bảng mới cho nhận xét',
     T.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%nhan_xet%'").all().length === 0);
  ok('A3 · `ban_ghi_id` là CHUỖI đúng id việc (nhét số vào cột TEXT ra "1.0" là đọc rỗng)',
     ds.every(d => d.ban_ghi_id === '1'), JSON.stringify(ds.map(d => d.ban_ghi_id)));
}

/* A4 — câu đọc hiểu được */
{
  const r = await T.lichSu('AN', 1);
  const cau = (r.than.ds || []).filter(d => d.truong === 'nhan_xet').map(d => d.cau);
  ok('A4 · người NHẬN việc ĐỌC ĐƯỢC nhận xét về mình qua sổ việc', cau.length === 3, `${cau.length} câu`);
  ok('A4 · câu sổ là tiếng người ("… nhận xét: …"), KHÔNG phải "đổi nhan_xet (trống) → …"',
     cau.every(c => / nhận xét: "/.test(c)) && !cau.some(c => /nhan_xet/.test(c)),
     JSON.stringify(cau[0]));
}

/* A5 — báo đúng người */
{
  /* AN nhận 3 tin: SEP + DUY nhận xét việc #1, và SEP nhận xét việc #2 (cũng
     của AN). Đếm đúng 3 chứ không "≥1": ≥1 thì bỏ sót đúng lỗi hay gặp nhất
     ở đường thông báo — gửi một tin cho mỗi trường, hoặc quên gửi một cửa. */
  const tinAn = T.tinCua('AN').filter(t => t.loai === 'cong_viec_nhan_xet');
  ok('A5 · người bị nhận xét NHẬN ĐƯỢC thông báo (3 tin: SEP+DUY ở việc #1, SEP ở việc #2)',
     tinAn.length === 3, `${tinAn.length} tin`);
  const tinSep = T.tinCua('SEP').filter(t => t.loai === 'cong_viec_nhan_xet');
  ok('A5 · người NHẬN nói lại thì NGƯỜI GIAO cũng được báo', tinSep.length === 1, `${tinSep.length} tin`);
}
{
  await T.nx('HUONG', { id: 9, noi_dung: 'Tự nhắc mình: gọi trước 10h sáng mai.' });
  const tin = T.tinCua('HUONG').filter(t => t.loai === 'cong_viec_nhan_xet');
  ok('A5 · TODO cá nhân — tự nhận xét mình thì KHÔNG tự bắn thông báo cho mình',
     tin.length === 0, `${tin.length} tin`);
}

/* A6 — chặn rỗng */
{
  const r1 = await T.nx('SEP', { id: 1, noi_dung: '   ' });
  const r2 = await T.nx('SEP', { id: 1, noi_dung: 'ok' });
  ok('A6 · nhận xét rỗng → CHẶN', r1.status === 400, `HTTP ${r1.status}`);
  ok('A6 · nhận xét cụt lủn ("ok") → CHẶN', r2.status === 400, `HTTP ${r2.status}`);
}

/* A8 — VỪA-3: quá dài thì TỪ CHỐI, không cắt im lặng */
{
  const dai = 'Chỗ cần sửa: '.repeat(120);            // ~1560 ký tự
  const r = await T.nx('SEP', { id: 1, noi_dung: dai });
  ok('A8 · nhận xét 1500+ ký tự → TỪ CHỐI (không âm thầm cắt còn 1000)',
     r.status === 400, `HTTP ${r.status} ${JSON.stringify(r.than && r.than.loi)}`);
  const luu = T.db.prepare(
    "SELECT gia_tri_moi FROM lich_su_thay_doi_nen WHERE truong='nhan_xet' AND length(gia_tri_moi) >= 1000").all();
  ok('A8 · và KHÔNG có dòng nào bị cắt cụt 1000 ký tự nằm lại trong sổ',
     luu.length === 0, `${luu.length} dòng`);
}

/* ======================================================================== */
/* A7 — CHẶN-1: nhận xét cũ bị vết sửa đẩy ra khỏi trần 100                  */
/* ---------------------------------------------------------------------- */
/* CA TÁI HIỆN NGUYÊN VĂN CỦA HỒ LY (REV-0061 · CHẶN-1):                     */
/*   · việc #1 có 3 NHẬN XÉT ghi tháng 6/2026 (dòng CŨ NHẤT)                 */
/*   · cũng việc đó, tháng 8 có 110 dòng sửa `tieu_de` bình thường           */
/*   · cửa đọc trần 100 ⇒ đọc chung một rổ thì 3 nhận xét rơi HẾT            */
/* Nhận xét bao giờ cũng là dòng cũ nhất của một việc chạy dài — tức là dòng */
/* RƠI TRƯỚC TIÊN. Đây không phải ca hiếm, đây là ca THƯỜNG.                 */
/* ======================================================================== */
console.log('\n=== A7 · CHẶN-1 — 110 lần sửa có đẩy 3 nhận xét cũ ra khỏi sổ không? ===\n');
{
  const V = await dungVong(path.join(GOC, 'src'));
  const them = V.db.prepare(
    `INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                       nguoi_id, nguoi_ten, luc)
     VALUES ('cong_viec', '1', ?, ?, ?, 'SEP', 'Bùi Thị Ngọc', ?)`);
  for (let i = 1; i <= 3; i++) {
    them.run('nhan_xet', null,
      `Chỗ cần sửa: lô 12 thiếu số lô — đây là lần thứ ${i}`, `2026-06-0${i} 09:00:00`);
  }
  for (let i = 1; i <= 110; i++) {
    them.run('tieu_de', 'Rà soát tồn lô chè chưng yến', `Rà soát tồn lô chè chưng yến (v${i})`,
      `2026-08-${String((i % 28) + 1).padStart(2, '0')} 1${i % 10}:00:00`);
  }

  /* ① Ca gốc CÓ THẬT — cửa chung vẫn cắt, và vẫn NÓI là đã cắt. */
  const chung = await V.lichSu('AN', 1);
  const nxTrongRoChung = (chung.than.ds || []).filter(d => d.truong === 'nhan_xet').length;
  ok('A7 · ca có thật: đọc CHUNG một rổ thì cửa trả 100 dòng và nói rõ đã cắt',
     (chung.than.ds || []).length === 100 && !!chung.than.cat,
     `${(chung.than.ds || []).length} dòng · cat=${JSON.stringify(chung.than.cat)}`);
  ok('A7 · và lọc `truong` ở TRÌNH DUYỆT trên rổ đó thì còn 0/3 nhận xét — ' +
     'đúng chỗ màn hình khẳng định sai "Chưa có nhận xét nào"',
     nxTrongRoChung === 0, `${nxTrongRoChung}/3 câu`);

  /* ② Bản vá: hỏi RIÊNG loại vết. */
  const rieng = await V.lichSu('AN', 1, 'nhan_xet');
  const cau = (rieng.than.ds || []);
  ok('A7 · hỏi RIÊNG `?truong=nhan_xet` → ĐỦ 3 nhận xét cũ, không mất câu nào',
     cau.length === 3 && cau.every(d => d.truong === 'nhan_xet'), `${cau.length} câu`);
  ok('A7 · và không cắt gì cả nên `cat` = null (dải cắt biến mất, không mọc dòng thừa)',
     rieng.than.cat === null, JSON.stringify(rieng.than.cat));
  ok('A7 · câu CŨ NHẤT (tháng 6, "lần thứ 1") vẫn còn — đây là câu rơi trước tiên ở bản cũ',
     cau.some(d => /lần thứ 1$/.test(d.gia_tri_moi || '')),
     JSON.stringify(cau.map(d => d.gia_tri_moi)));

  /* ③ Cửa lọc là DANH SÁCH TRẮNG, không nhận chuỗi tự do. */
  const bay = await V.lichSu('AN', 1, 'tieu_de');
  ok('A7 · `?truong=` ngoài danh sách trắng → CHẶN (gõ sai mà trả rỗng lại đúng lỗi đang chữa)',
     bay.status === 400, `HTTP ${bay.status}`);

  /* ③b THẤP-1 — cặp `bang × truong` phải khớp NHAU, chứ không phải hai danh
     sách trắng rời nhau. `muc_tieu` chưa có loại vết `nhan_xet`; cho qua rồi
     trả rỗng kèm HTTP 200 là dựng sẵn đúng cái "màn hình khẳng định sai" của
     CHẶN-1 cho ngày ai đó thêm nhận xét cho mục tiêu mà quên nối cửa. */
  const cheoBang = await goiAPI(V.worker, V.env,
    '/api/sua/lich-su?bang=muc_tieu&id=1&truong=nhan_xet', V.phien.AN);
  ok('A7 · THẤP-1: `bang=muc_tieu&truong=nhan_xet` → CHẶN 400, KHÔNG trả rỗng kèm HTTP 200',
     cheoBang.status === 400, `HTTP ${cheoBang.status} · ${JSON.stringify(cheoBang.than || {})}`);
  ok('A7 · THẤP-1: và cặp ĐÚNG (`cong_viec` × `nhan_xet`) vẫn qua — siết cặp mà siết ' +
     'nhầm cả cửa đang dùng thì còn tệ hơn để hở',
     rieng.status === 200, `HTTP ${rieng.status}`);

  /* ④ Trần vẫn còn hiệu lực trên chính loại vết đó — không phải bỏ trần đi. */
  for (let i = 1; i <= 120; i++) {
    them.run('nhan_xet', null, `Nhận xét dồn số ${i}`, `2026-09-0${(i % 7) + 1} 08:00:00`);
  }
  const day = await V.lichSu('AN', 1, 'nhan_xet');
  ok('A7 · 123 nhận xét → vẫn cắt ở 100 VÀ vẫn nói ra, đơn vị là NHẬN XÉT chứ không phải dòng sổ',
     (day.than.ds || []).length === 100 && day.than.cat && day.than.cat.tong === 123,
     `${(day.than.ds || []).length} dòng · cat=${JSON.stringify(day.than.cat)}`);
}

/* ======================================================================== */
/* PHẦN B — TRÌNH DUYỆT                                                      */
/* ======================================================================== */

const VIEC_TOI = {
  id: 11, tieu_de: 'Rà soát tồn lô chè chưng yến', dau_ra: 'File đối chiếu khớp 100%',
  mo_ta: '', nguoi_giao_id: 'NS-DUY', nguoi_giao_ten: 'Phạm Khương Duy',
  nguoi_nhan_id: 'NS-NGOC', nguoi_nhan_ten: 'Bùi Thị Ngọc',
  han_chot: '2026-09-10', trang_thai: 'dang_lam', muc_tieu_id: null, tao_luc: '2026-09-01 09:00:00'
};
const VIEC_GIAO = {
  id: 12, tieu_de: 'Kiểm kê hàng nhập khẩu quý 3', dau_ra: 'Biên bản có chữ ký 2 bên',
  mo_ta: '', nguoi_giao_id: 'NS-NGOC', nguoi_giao_ten: 'Bùi Thị Ngọc',
  nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy',
  han_chot: '2026-09-12', trang_thai: 'hoan_thanh', muc_tieu_id: null, tao_luc: '2026-09-01 09:00:00'
};

/* HAI VIỆC ĐỂ DỰNG LẠI ĐÚNG CẢNH CAO-1 (REV-0061 vòng 2): mở *Sửa việc A*,
   gõ nhầm hạn chót → đỏ; đóng; mở *Sửa việc B* có hạn chót HỢP LỆ và KHÁC A.
   Phải là việc TÔI GIAO + CHƯA XONG thì `nutCuaViec()` mới vẽ nút "Sửa"
   (`app.js:3516`) — VIEC_TOI/VIEC_GIAO sẵn có đều không thoả: một cái tôi
   NHẬN, một cái ĐÃ nghiệm thu. Hai hạn chót phải KHÁC NHAU, nếu không thì
   `moHopSuaViec` gán lại đúng giá trị cũ và phép đo mất khả năng phân biệt
   "vẽ lại thật" với "may mà trùng". */
const VIEC_SUA_A = {
  id: 21, tieu_de: 'Chốt đơn lô chè chưng yến số 9', dau_ra: 'Đơn đã chốt trên Shopee',
  mo_ta: '', nguoi_giao_id: 'NS-NGOC', nguoi_giao_ten: 'Bùi Thị Ngọc',
  nguoi_nhan_id: 'NS-HUYEN', nguoi_nhan_ten: 'Nguyễn Thị Huyền',
  han_chot: '2026-09-20', trang_thai: 'dang_lam', muc_tieu_id: null, tao_luc: '2026-09-01 09:00:00'
};
const VIEC_SUA_B = {
  id: 22, tieu_de: 'Dán tem phụ lô hạnh nhân nhập khẩu', dau_ra: 'Đủ tem phụ trước khi lên kệ',
  mo_ta: '', nguoi_giao_id: 'NS-NGOC', nguoi_giao_ten: 'Bùi Thị Ngọc',
  nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy',
  han_chot: '2026-09-30', trang_thai: 'dang_lam', muc_tieu_id: null, tao_luc: '2026-09-01 09:00:00'
};

const NHAN_XET_DA_GUI = [];
/* Bật ở ca B12: máy chủ NÓI là đã cắt sổ nhận xét → hộp phải nói lại. */
let SO_NHAN_XET_BI_CAT = false;
function apiRieng(duong, u, traJson) {
  if (duong === '/api/toi-la-ai') {
    traJson({ ...TOI, la_admin: 1, them_nhan_su: 1, thao_tac_van_hanh: 1, phong_ban_quan_ly: [],
      quyen: [...TOI.quyen, 'quantri', 'congviec', 'muctieu', 'lichsuviec'] });
    return true;
  }
  if (duong === '/api/quan-tri/danh-sach') {
    traJson({ nhan_su: [{
      id: 'NS-DUY', ho_ten: 'Phạm Khương Duy', viet_tat: 'KD', chuc_vu: 'Quản lý kho',
      bo_phan: 'Kho vận', chuc_danh_id: null, phong_ban_id: null, quan_ly_id: null,
      trang_thai: 'da_ky', trang_thai_dl: 'dang_lam', dang_lam: 1,
      loai_lao_dong: 'toan_thoi_gian', ma_nv: '01-0002', sdt: '', email: '',
      cong_khai_sinh_nhat: true, tai_khoan: null
    }], vai_tro: [], quyen: { quan_ly: 1 } });
    return true;
  }
  if (duong.startsWith('/api/nhan-su/sinh-nhat')) { traJson({ ngay_sinh: null }); return true; }
  if (duong === '/api/nhan-su/ngay-sinh') { traJson({ ok: true }); return true; }
  /* Ổ chung của thư viện trả `{danh_sach:[]}`, mà ba cửa này đòi khoá `ds` —
     thiếu thì `veBang(undefined)` nổ và bàn đo đỏ vì BÀN ĐO, không vì sản
     phẩm. Đúng cái bẫy đã ghi trong `lib/ban-do-chrome.mjs`. */
  if (duong.startsWith('/api/nhan-su/hop-dong')) { traJson({ hop_dong: [] }); return true; }
  if (duong.startsWith('/api/ky-nang')) { traJson({ ky_nang: [], danh_muc: [], duoc: false }); return true; }
  if (duong.startsWith('/api/mo-ta-cong-viec')) { traJson({ mo_ta: [], ds: [] }); return true; }
  if (duong === '/api/cong-viec/danh-sach') {
    traJson({ nhan: [VIEC_TOI], giao: [VIEC_GIAO, VIEC_SUA_A, VIEC_SUA_B] });
    return true;
  }
  if (duong === '/api/cong-viec/hom-nay') {
    traJson({ nhac_tat: 0, toi: { qua_han: [], den_han_hom_nay: [], chua_bat_dau: [], cho_toi_duyet: [] },
              dong_viec: [], ghi_nhan: [] });
    return true;
  }
  if (duong === '/api/cong-viec/nhan-xet') { NHAN_XET_DA_GUI.push(1); traJson({ ok: true, id: 1 }); return true; }
  /* Máy giả phải bắt chước ĐÚNG máy chủ thật: chỉ trả nhận xét khi được hỏi
     `?truong=nhan_xet`. Nếu nó cứ trả nhận xét cho mọi lời gọi thì bàn đo
     xanh kể cả khi giao diện quên mất bộ lọc — tức bàn đo đo cái vỏ. */
  if (duong === '/api/sua/lich-su') {
    const loc = u.searchParams.get('truong');
    const nhanXet = { truong: 'nhan_xet', gia_tri_cu: null, gia_tri_moi: 'Chỗ làm tốt: gửi đúng hạn',
                      nguoi_ten: 'Phạm Khương Duy', luc: '2026-09-05 10:00:00',
                      cau: 'Phạm Khương Duy nhận xét: "Chỗ làm tốt: gửi đúng hạn"' };
    const vetSua = { truong: 'tieu_de', gia_tri_cu: 'a', gia_tri_moi: 'b',
                     nguoi_ten: 'Bùi Thị Ngọc', luc: '2026-09-06 10:00:00',
                     cau: 'Bùi Thị Ngọc đổi tên việc a → b' };
    /* `SO_NHAN_XET_BI_CAT` bật lên thì máy giả trả về ĐÚNG khuôn `nhanCat`
       thật (`gioi_han`/`tong`) — sai khuôn thì `veDaiCat` im lặng và bàn đo
       xanh oan, tức lại đúng lỗi đang canh. */
    traJson(loc === 'nhan_xet'
      ? { ds: [nhanXet], cat: SO_NHAN_XET_BI_CAT ? { gioi_han: 100, tong: 123, xem_them: null } : null }
      : { ds: [vetSua], cat: null });
    return true;
  }
  /* VỪA-1 — một dòng thông báo nhận xét THẬT trong chuông, `lien_ket` là id việc. */
  if (duong === '/api/thong-bao') {
    traJson({ thong_bao: [{ id: 1, nhom: 'ca_nhan', loai: 'cong_viec_nhan_xet',
                            noi_dung: 'Phạm Khương Duy nhận xét việc "Rà soát tồn lô chè chưng yến": Chỗ làm tốt…',
                            lien_ket: String(VIEC_TOI.id), tao_luc: '2026-09-06 10:00:00' }],
              chua_doc: 1, cat: null });
    return true;
  }
  if (duong === '/api/thong-bao/da-xem') { traJson({ ok: true }); return true; }
  return false;
}

const PHIM = { '0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54, '7': 55, '8': 56, '9': 57 };
async function goSo(c, ch) {
  const vk = PHIM[ch];
  await c.goi('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
    key: ch, code: 'Digit' + ch, text: ch, unmodifiedText: ch }, c.sessionId);
  await c.goi('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
    key: ch, code: 'Digit' + ch }, c.sessionId);
  await new Promise(r => setTimeout(r, 70));
}

async function doTrinhDuyet({ be = null, tep = null } = {}) {
  let daBe = false;
  const suaTep = be
    ? (s, ten) => { if (ten !== tep) return s; const sau = be(s); if (sau !== s) daBe = true; return sau; }
    : null;
  const may = await dungMayGia({ apiRieng, suaTep });
  if (be && !daBe) { may.dong(); throw new Error('CA ĐỐI CHỨNG KHÔNG BẺ ĐƯỢC GÌ — phép đo hỏng, không phải mã đúng'); }
  const c = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, cao: 812 });
  const kq = {};
  try {
    /* --- B1 · GÕ THẬT vào ô ngày sinh --------------------------------- */
    /* NGÀY KHÔNG ĐỐI XỨNG `25011990` — xem lời dặn ở đầu tệp, ĐỪNG đổi về
       `01011990`: ngày đối xứng thì đọc kiểu nào cũng ra một kết quả, phép
       kiểm mất khả năng phát hiện lỗi đảo thứ tự (REV-0061 · GY-0004). */
    await c.chay(`document.querySelector('[data-tab="nhansu"]')?.click(); true`);
    await c.doi(800);
    await c.chay(`document.querySelector('[data-sua-ns]').click(); true`);
    await c.doi(800);
    await c.chay(`(()=>{const o=document.getElementById('nsSua-ngaysinh');o.value='';o.scrollIntoView();o.focus();return true})()`);
    const buoc = [];
    for (const ch of '25011990') {
      await goSo(c, ch);
      buoc.push(await c.chay(`(()=>{const o=document.getElementById('nsSua-ngaysinh');
        return {v:o.value, dis:o.disabled, tieuDiem:document.activeElement===o};})()`));
    }
    kq.b1_giu_tieu_diem = buoc.every(b => b.tieuDiem && !b.dis);
    kq.b1_gia_tri = buoc[buoc.length - 1].v;
    kq.b1_buoc = buoc;
    /* THỨ TỰ Ô CON MÀ CHÍNH TRÌNH DUYỆT NÀY ĐANG KHAI. `value` phải khớp
       đúng thứ tự đó — lệch là ERP đang nói dối về thứ tự. */
    kq.b1_thu_tu = await c.chay(`(()=>{
      try {
        return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit'})
          .formatToParts(new Date(2026,0,25))
          .filter(p=>['day','month','year'].includes(p.type)).map(p=>p.type).join('/');
      } catch { return 'khong-doc-duoc'; }
    })()`);

    /* --- B7 · DÒNG ĐỌC LẠI NGÀY (bản vá thật của GY-0004) -------------- */
    kq.b7 = await c.chay(`(()=>{
      const o=document.getElementById('nsSua-ngaysinh');
      const n=o.nextElementSibling;
      return { coThe: !!(n && n.classList.contains('o-ngay-nhac')),
               hien: !!(n && !n.hidden),
               chu: n ? n.textContent : '',
               doc: n ? (n.dataset.ngayDoc || '') : '',
               value: o.value };
    })()`);
    /* Dòng đọc lại phải SỐNG LẠI ở ô KHÁC nữa — nếu chỉ ô ngày sinh có thì
       15 ô còn lại vẫn mù đúng như trước. Ô hạn chót việc: kiểu mặc định,
       không có tuổi, nên câu phải là "= DD/MM/YYYY" trơn. */
    kq.b7_o_khac = await c.chay(`(()=>{
      const o=document.getElementById('cv-han-chot'); if(!o) return {khong_co:true};
      o.value='2026-03-04';
      o.dispatchEvent(new Event('input',{bubbles:true}));
      const n=o.nextElementSibling;
      return { chu: n ? n.textContent : '', hien: !!(n && !n.hidden), doc: n ? (n.dataset.ngayDoc||'') : '' };
    })()`);

    /* --- B8 · CAO-1: ô báo cáo / ngày vào làm nhận ngày TƯƠNG LAI ------ */
    kq.b8 = await c.chay(`(()=>{
      const thu = (id, v) => { const o=document.getElementById(id); if(!o) return {khong_co:true};
        o.value=v; return { hopLe:o.checkValidity(), min:o.min, max:o.max }; };
      return { kvBcDen_maisau: thu('kvBcDen','2026-09-08'),
               kvBcDen_cuoinam: thu('kvBcDen','2026-12-31'),
               kvBcTu_cuoinam: thu('kvBcTu','2026-12-31'),
               dmNgayVao_thuhaitoi: thu('dmNgayVao','2026-09-14') };
    })()`);

    /* --- B9 · CAO-2: câu lỗi nói ĐÚNG đầu bị vi phạm ------------------- */
    kq.b9 = await c.chay(`(()=>{
      const doc = (id, v) => { const o=document.getElementById(id); if(!o) return {khong_co:true};
        o.value=v; o.dispatchEvent(new Event('input',{bubbles:true}));
        const n=o.nextElementSibling;
        return { hopLe:o.checkValidity(), chu: n ? n.textContent : '', do: !!(n && n.classList.contains('sai')) }; };
      return {
        // Máy in mua năm 1988 — ca thật của Hồ Ly. Sàn của kiểu qua-khu nay là 1900.
        muaNam1988: doc('tsThemNgayMua','1988-05-20'),
        // Vượt trần: phải nói "không được quá hôm nay", KHÔNG nói về sàn dưới.
        muaTuongLai: doc('tsThemNgayMua','2030-01-01'),
        // Ngày sinh dưới sàn 1930 → phải nói về SÀN, không nói "dưới 14 tuổi".
        sinhNam1900: doc('nsSua-ngaysinh','1900-01-01'),
        // Ngày sinh quá trần (dưới 14 tuổi) → phải nói về TUỔI, không nói 1930.
        sinh2020: doc('nsSua-ngaysinh','2020-01-01')
      };
    })()`);

    /* --- B10 · VỪA-2: câu đỏ dính lại giữa hai lần mở hộp -------------- */
    /* Đọc phòng thủ: ca đối chứng DC-B gỡ hẳn bộ nâng cấp nên thẻ `.o-ngay-nhac`
       không tồn tại. Nổ ở đây là bàn đo chết, không phải sản phẩm sai. */
    kq.b10 = await c.chay(`(async()=>{
      const doc = () => { const o=document.getElementById('nsSua-ngaysinh');
        const n=o.nextElementSibling;
        const laNhac = !!(n && n.classList.contains('o-ngay-nhac'));
        return { chu: laNhac ? n.textContent : '(không có thẻ nhắc)',
                 do: laNhac && n.classList.contains('sai'),
                 vien: o.classList.contains('o-ngay-sai'), value: o.value }; };
      const o=document.getElementById('nsSua-ngaysinh');
      o.focus();
      o.value='2020-01-01'; o.dispatchEvent(new Event('input',{bubbles:true}));
      const truoc = doc();
      /* RỜI TIÊU ĐIỂM RỒI MỚI ĐÓNG — đây mới là ca thật: người ta gõ nhầm rồi
         BẤM ĐÓNG hộp, tức ô đã mất tiêu điểm. Đo được 07/09: nếu ô VẪN đang
         có tiêu điểm thì Chrome tự bắn sự kiện input khi mã gán value, nên
         bản GÃY cũng tự sạch và ca đối chứng xanh oan — phép đo khi ấy không
         đo cái gì cả. */
      o.blur();
      document.getElementById('nsSuaModalNen').hidden = true;
      document.querySelector('[data-sua-ns]').click();
      await new Promise(r=>setTimeout(r,700));
      return { truoc, sau: doc() };
    })()`);

    /* --- B10b · CAO-1: gán `.value` bằng mã phải vẽ lại — CẢ 8 Ô ------- */
    /* REV-0061 vòng 2 đếm được 9 lệnh gán `.value` trên 7 ô ngày trong
       `app.js`, cộng ô ngày sinh đã vá vòng trước = 8 ô. Vòng trước bàn đo
       này chỉ canh MỘT ô (B10 ở trên) nên 7 ô kia thủng mà vẫn xanh.
       ĐỪNG THU LẠI CÒN MỘT Ô: cái lỗi được vá ở đây là lỗi CẢ LỚP, canh một
       ô là canh một mẫu của lớp rồi tưởng đã canh cả lớp.

       Mỗi ô đo đúng hai nhịp của cảnh thật:
         ① bản ghi TRƯỚC — người dùng GÕ nhầm (gán + bắn `input`, đúng đường
            bàn phím đi) → phải ĐỎ, nếu không thì nhịp ② vô nghĩa;
         ② bản ghi SAU — máy chủ đổ dữ liệu vào (gán THẲNG `.value`, KHÔNG
            một sự kiện nào, đúng đường `app.js` đi) → phải hết đỏ, hết viền
            đỏ, VÀ hiện dòng đọc lại đúng giá trị mới. */
    kq.b10_lop = await c.chay(`(()=>{
      const CA = [
        ['nsSua-ngaysinh',  '2020-01-01', '1990-01-25', '= 25/01/1990', 'Sửa hồ sơ nhân sự'],
        ['tsSuaNgayMua',    '2030-01-01', '2024-03-15', '= 15/03/2024', 'Sửa tài sản'],
        ['tsSuaHetBaoHanh', '2200-01-01', '2027-03-15', '= 15/03/2027', 'Sửa tài sản'],
        ['cv-sua-han-chot', '2200-01-01', '2026-09-30', '= 30/09/2026', 'Sửa việc'],
        ['nsHd-batdau',     '1800-01-01', '2026-01-01', '= 01/01/2026', 'Hợp đồng nhân sự'],
        ['nsHd-hethan',     '2200-01-01', '2027-01-01', '= 01/01/2027', 'Hợp đồng nhân sự'],
        ['kvBcTu',          '2200-01-01', '2026-09-01', '= 01/09/2026', 'Báo cáo kho'],
        ['kvBcDen',         '1800-01-01', '2026-09-07', '= 07/09/2026', 'Báo cáo kho']
      ];
      /* Đọc phòng thủ y như B10: ca đối chứng DC-B gỡ hẳn bộ nâng cấp nên thẻ
         ".o-ngay-nhac" không tồn tại — nổ ở đây là bàn đo chết, không phải
         sản phẩm sai. (Không dùng dấu huyền trong khối này: cả đoạn nằm
         trong một template literal của Node.) */
      const doc = (o) => { const n = o.nextElementSibling;
        const la = !!(n && n.classList.contains('o-ngay-nhac'));
        return { chu: la ? n.textContent : '(không có thẻ nhắc)',
                 do: la && n.classList.contains('sai'),
                 hien: la && !n.hidden,
                 docLai: la ? (n.dataset.ngayDoc || '') : '',
                 vien: o.classList.contains('o-ngay-sai') }; };
      return CA.map(([id, ban, sach, mong, man]) => {
        const o = document.getElementById(id);
        if (!o) return { id, man, khong_co: true };
        o.blur();
        o.value = ban;                                        // ① gõ nhầm…
        o.dispatchEvent(new Event('input', { bubbles: true }));
        const truoc = doc(o);
        o.value = sach;         // ② máy chủ đổ dữ liệu — KHÔNG sự kiện nào
        const sau = doc(o);
        return { id, man, mong, truoc, sau, value: o.value };
      });
    })()`);

    /* --- B2 · DÁN thật ------------------------------------------------- */
    kq.b2_dan = await c.chay(`(()=>{
      const o=document.getElementById('nsSua-ngaysinh'); o.value=''; o.focus();
      const dt=new DataTransfer(); dt.setData('text/plain','25/01/1990');
      o.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
      return o.value;
    })()`);
    kq.b2_dan_iso = await c.chay(`(()=>{
      const o=document.getElementById('nsSua-ngaysinh'); o.value=''; o.focus();
      const dt=new DataTransfer(); dt.setData('text/plain','1990-01-25');
      o.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
      return o.value;
    })()`);

    /* --- B10d · `form.reset()` cũng phải vẽ lại ------------------------ */
    /* `.reset()` KHÔNG đi qua cái bẫy trên `value` và cũng không bắn
       `input`/`change` — nó bắn `reset` trên FORM và xoá ô SAU khi handler
       chạy. ERP gọi `.reset()` ở hơn 20 chỗ; `#cv-form` có ô ngày
       `#cv-han-chot`. Thiếu nhánh này thì bấm "Huỷ" xong dòng nhắc vẫn đọc
       lại cái ngày vừa bị xoá khỏi ô — lại đúng lớp "màn hình nói sai". */
    kq.b10_reset = await c.chay(`(async()=>{
      const o = document.getElementById('cv-han-chot');
      const f = document.getElementById('cv-form');
      if (!o || !f) return { khong_co: true };
      /* Đọc phòng thủ: ca đối chứng DC-B gỡ hẳn bộ nâng cấp nên KHÔNG có thẻ
         nhắc nào — nổ ở đây là bàn đo chết, không phải sản phẩm sai. */
      const doc = () => { const n = o.nextElementSibling;
        const la = !!(n && n.classList.contains('o-ngay-nhac'));
        return { doc: la ? (n.dataset.ngayDoc || '') : '', hien: la && !n.hidden }; };
      o.value = '2026-12-31';
      const truoc = doc();
      f.reset();
      await new Promise(r=>setTimeout(r,50));
      return { truoc, value: o.value, ...doc() };
    })()`);

    /* --- B2b · THẤP-3: nhánh ISO phải NEO CẢ HAI ĐẦU ------------------- */
    /* Bản trước chỉ neo đầu chuỗi: dán "1990-01-25rác" (nửa câu copy nhầm)
       cũng ăn thành 25/01/1990. Nhưng phần GIỜ thật thì vẫn phải qua — máy
       chủ trả "2026-09-05 10:00:00", siết quá tay là chặn cả ca đúng. */
    kq.b2_neo = await c.chay(`(()=>{
      const dan = (chu) => { const o=document.getElementById('nsSua-ngaysinh');
        o.value=''; o.focus();
        const dt=new DataTransfer(); dt.setData('text/plain',chu);
        o.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
        return o.value; };
      return { rac: dan('1990-01-25rác'),
               racSo: dan('1990-01-2599'),
               kemGio: dan('1990-01-25 10:00:00'),
               kemGioZ: dan('1990-01-25T10:00:00Z') };
    })()`);

    /* --- B3 · CẢ LỚP ô ngày -------------------------------------------- */
    kq.b3 = await c.chay(`(()=>{const ds=[...document.querySelectorAll('input[type=date]')];
      return { tong: ds.length,
               thieu: ds.filter(o=>!o.min||!o.max).map(o=>o.id||'(không id)'),
               chua_nang: ds.filter(o=>o.dataset.ngayDaNang!=='1').map(o=>o.id||'(không id)') };})()`);

    /* --- B4 · 44px ------------------------------------------------------ */
    kq.b4_o = await c.chay(`Math.round(document.getElementById('nsSua-ngaysinh').getBoundingClientRect().height)`);

    /* --- B5 · nút Nhận xét hai phía + hộp mở --------------------------- */
    await c.chay(`document.querySelector('[data-tab="lichsuviec"]')?.click(); true`);
    await c.doi(900);
    kq.b5_nut = await c.chay(`(()=>{
      const chon = (loc) => { const n=[...document.querySelectorAll('#lsv-loc .seg-nut')].find(b=>b.dataset.lsv===loc); if(n) n.click(); };
      const dem = () => document.querySelectorAll('#ls-cv-bang [data-cv-nhanxet]').length;
      chon('toi'); const toi = dem();
      chon('giao'); const giao = dem();
      return { toi, giao };
    })()`);
    await c.doi(400);
    const moHop = await c.chay(`(()=>{
      const n=document.querySelector('#ls-cv-bang [data-cv-nhanxet]'); if(!n) return 'khong-co-nut';
      n.click(); return 'da-bam';
    })()`);
    await c.doi(700);
    kq.b5_hop = await c.chay(`(()=>{
      const m=document.getElementById('cvNxModalNen');
      if(!m) return {co:false};
      const soDong=document.querySelectorAll('#cv-nx-so li').length;
      const o=document.getElementById('cv-nx-noi-dung');
      const nut=document.getElementById('cv-nx-nut-gui');
      const chip=document.querySelectorAll('#cv-nx-form [data-nx-them]').length;
      return { co:!m.hidden, soDongSo:soDong, coONhap:!!o, chip,
               caoNut: nut?Math.round(nut.getBoundingClientRect().height):0,
               nutKhen: !document.getElementById('cv-nx-nut-khen').hidden };
    })()`) || { co: false };
    kq.b5_bam = moHop;

    /* Gửi thử một nhận xét trên MÀN THẬT — nút mà bấm không ăn thì mọi phép
       đo phía trên chỉ là đo một cái vỏ. */
    kq.b5_gui = await c.chay(`(async()=>{
      const o=document.getElementById('cv-nx-noi-dung');
      o.value='Chỗ làm tốt: gửi trước 17h, đúng cam kết đầu ra.';
      document.getElementById('cv-nx-form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
      await new Promise(r=>setTimeout(r,600));
      return { xong: !document.getElementById('cv-nx-xong').hidden,
               oDaRong: document.getElementById('cv-nx-noi-dung').value === '' };
    })()`);

    /* --- B6 · không tràn ngang ---------------------------------------- */
    kq.b6 = await c.chay(`(()=>{
      const m=document.querySelector('#cvNxModalNen .modal');
      return { tranTrang: document.documentElement.scrollWidth > window.innerWidth + 1,
               tranHop: m ? Math.round(m.scrollWidth - m.clientWidth) : 0 };
    })()`);

    /* --- B12 · CHẶN-1 tầng lưới: sổ nhận xét bị cắt thì hộp phải NÓI RA -- */
    SO_NHAN_XET_BI_CAT = true;
    kq.b12 = await c.chay(`(async()=>{
      document.getElementById('cvNxModalNen').hidden = true;
      const n=document.querySelector('#ls-cv-bang [data-cv-nhanxet]');
      if(!n) return { khongCoNut:true };
      n.click();
      await new Promise(r=>setTimeout(r,800));
      const dai=document.getElementById('cv-nx-cat');
      return { coO: !!dai, hien: !!(dai && !dai.hidden), chu: dai ? dai.innerText : '',
               soDong: document.querySelectorAll('#cv-nx-so li').length };
    })()`);
    SO_NHAN_XET_BI_CAT = false;

    /* --- B11 · VỪA-1: bấm dòng thông báo nhận xét phải MỞ ĐÚNG hộp ----- */
    kq.b11 = await c.chay(`(async()=>{
      document.getElementById('cvNxModalNen').hidden = true;
      document.getElementById('tbNut').click();
      await new Promise(r=>setTimeout(r,600));
      const it = document.querySelector('#tbDanhSach .tb-item[data-loai="cong_viec_nhan_xet"]');
      if (!it) return { coDong:false };
      const bieuTuong = it.textContent.trim().slice(0,2);
      it.click();
      await new Promise(r=>setTimeout(r,900));
      return { coDong:true, bieuTuong,
               lienKet: it.dataset.lienKet || '',
               hopMo: !document.getElementById('cvNxModalNen').hidden,
               tieuDe: (document.getElementById('cv-nx-viec')||{}).textContent || '' };
    })()`);

    /* --- B10c · CAO-1 trên MÀN THẬT: Sửa việc A → Sửa việc B ----------- */
    /* B10b ở trên đo đúng cơ chế nhưng gán `.value` bằng tay. Cảnh Hồ Ly
       dựng là cảnh NGƯỜI DÙNG đi: bấm nút "Sửa" việc A, gõ nhầm hạn chót,
       ĐÓNG hộp bằng nút Huỷ, rồi bấm nút "Sửa" việc B. Không dựng lại đúng
       cảnh ấy thì không chứng minh được là đã hết — chỉ chứng minh được cái
       hàm mình vừa viết chạy đúng. */
    kq.b10_e2e = await c.chay(`(async()=>{
      const doi = (ms) => new Promise(r=>setTimeout(r,ms));
      document.getElementById('cvNxModalNen').hidden = true;
      document.querySelector('[data-tab="congviec"]')?.click();
      await doi(900);
      const nut = [...document.querySelectorAll('[data-cv-sua]')];
      if (nut.length < 2) return { du_nut: false, so_nut: nut.length };
      const doc = () => { const o = document.getElementById('cv-sua-han-chot');
        const n = o.nextElementSibling;
        const la = !!(n && n.classList.contains('o-ngay-nhac'));
        return { chu: la ? n.textContent : '(không có thẻ nhắc)',
                 do: la && n.classList.contains('sai'),
                 hien: la && !n.hidden,
                 docLai: la ? (n.dataset.ngayDoc || '') : '',
                 vien: o.classList.contains('o-ngay-sai'), value: o.value }; };

      // ① VIỆC A — mở hộp, hạn chót 20/09/2026 đổ sẵn từ máy chủ.
      nut[0].click(); await doi(700);
      const a_vua_mo = doc();
      // …gõ nhầm 01/01/2200 (quá trần 2100) rồi RỜI TIÊU ĐIỂM, y như người
      // ta gõ xong rồi với tay bấm Huỷ.
      const oA = document.getElementById('cv-sua-han-chot');
      oA.focus();
      oA.value = '2200-01-01'; oA.dispatchEvent(new Event('input',{bubbles:true}));
      oA.blur();
      const a_go_nham = doc();
      document.getElementById('cv-sua-nut-huy').click();
      await doi(400);

      // ② VIỆC B — hạn chót 30/09/2026, hoàn toàn hợp lệ, KHÔNG chạm vào ô.
      nut[1].click(); await doi(700);
      const b = doc();
      document.getElementById('cv-sua-nut-huy').click();
      return { du_nut: true, so_nut: nut.length, a_vua_mo, a_go_nham, b };
    })()`);

    kq.loi_console = c.loiConsole.slice();
    kq.ngoai_le = c.ngoaiLe.slice();
  } finally {
    c.dong(); may.dong();
  }
  return kq;
}

console.log(`\n=== B · TRÌNH DUYỆT THẬT @${RONG}px — ô ngày + nút nhận xét ===\n`);
const B = await doTrinhDuyet();

/* Ngày `25011990` đọc theo ĐÚNG thứ tự trình duyệt tự khai. Máy Việt/Anh cho
   hai kết quả khác nhau, và cả hai đều "đúng" theo trình duyệt — cái sai là
   khi ERP không nói cho người dùng biết nó hiểu ra cái nào (xem B7). */
const MONG_THEO_THU_TU = {
  'day/month/year': '1990-01-25',
  'month/day/year': '1990-02-05',
  'year/month/day': '1990-01-25'
};
const MONG = MONG_THEO_THU_TU[B.b1_thu_tu] || null;

ok('B1 · GÕ 8 chữ số vào ô NGÀY SINH: giữ tiêu điểm suốt, KHÔNG bị khoá giữa chừng',
   B.b1_giu_tieu_diem, JSON.stringify(B.b1_buoc));
ok('B1 · gõ xong ra một NGÀY ĐỦ, không kẹt ở 0001-01-01 (đây là ca Sếp báo)',
   /^\d{4}-\d{2}-\d{2}$/.test(B.b1_gia_tri || '') && !String(B.b1_gia_tri).startsWith('0'),
   `value = ${B.b1_gia_tri}`);
ok(`B1 · gõ NGÀY KHÔNG ĐỐI XỨNG 25011990 trên trình duyệt thứ tự "${B.b1_thu_tu}" ` +
   `→ value KHỚP đúng thứ tự đó (${MONG})`,
   MONG !== null && B.b1_gia_tri === MONG,
   `value = ${B.b1_gia_tri} · mong = ${MONG} · thứ tự khai = ${B.b1_thu_tu}`);
ok('B2 · DÁN "25/01/1990" → 1990-01-25', B.b2_dan === '1990-01-25', `value = ${B.b2_dan}`);
ok('B2 · DÁN "1990-01-25" (kiểu ISO) cũng ăn', B.b2_dan_iso === '1990-01-25', `value = ${B.b2_dan_iso}`);
ok('B2b · THẤP-3: DÁN "1990-01-25rác" → KHÔNG đọc thành ngày (nhánh ISO nay neo cả hai đầu)',
   B.b2_neo.rac === '' && B.b2_neo.racSo === '', JSON.stringify(B.b2_neo));
ok('B2b · …nhưng ngày KÈM GIỜ thật (máy chủ trả "2026-09-05 10:00:00" / kiểu ISO có Z) ' +
   'vẫn phải ăn — siết quá tay là chặn cả ca đúng',
   B.b2_neo.kemGio === '1990-01-25' && B.b2_neo.kemGioZ === '1990-01-25', JSON.stringify(B.b2_neo));
ok(`B3 · CẢ LỚP: ${B.b3.tong} ô ngày trong ERP, tất cả đều có min/max`,
   B.b3.tong >= 14 && B.b3.thieu.length === 0, `thiếu: ${JSON.stringify(B.b3.thieu)}`);
ok(`B3 · cả ${B.b3.tong} ô đều đã qua bộ nâng cấp dùng chung`,
   B.b3.chua_nang.length === 0, `chưa nâng: ${JSON.stringify(B.b3.chua_nang)}`);
ok('B4 · ô ngày ≥ 44px (ngưỡng ngón tay)', B.b4_o >= 44, `${B.b4_o}px`);
ok('B5 · nút "Nhận xét" có ở phía NGƯỜI NHẬN việc (người bị nhận xét đọc được)',
   B.b5_nut.toi >= 1, JSON.stringify(B.b5_nut));
ok('B5 · nút "Nhận xét" có ở phía NGƯỜI GIAO việc, kể cả việc ĐÃ nghiệm thu',
   B.b5_nut.giao >= 1, JSON.stringify(B.b5_nut));
ok('B5 · bấm nút thì HỘP MỞ RA THẬT (không phải cú bấm chết)',
   B.b5_bam === 'da-bam' && B.b5_hop.co, JSON.stringify(B.b5_hop));
ok('B5 · hộp có ô nhập + 2 chip gợi ý hai chiều (tốt / cần sửa)',
   B.b5_hop.coONhap && B.b5_hop.chip === 2, JSON.stringify(B.b5_hop));
ok('B5 · hộp hiện SỔ nhận xét cũ (người nhận đọc được nhận xét về mình)',
   B.b5_hop.soDongSo >= 1, `${B.b5_hop.soDongSo} dòng`);
ok('B5 · nút "Gửi nhận xét" ≥ 44px', B.b5_hop.caoNut >= 44, `${B.b5_hop.caoNut}px`);
ok('B5 · GỬI THẬT trên màn: báo xong và ô nhập được dọn',
   B.b5_gui.xong && B.b5_gui.oDaRong, JSON.stringify(B.b5_gui));
ok(`B6 · @${RONG}px không tràn ngang (trang lẫn hộp)`,
   !B.b6.tranTrang && B.b6.tranHop <= 1, JSON.stringify(B.b6));

/* ---- B7 · DÒNG ĐỌC LẠI NGÀY — bản vá THẬT của GY-0004 ------------------ */
{
  const v = B.b7.value || '';
  const [y, th, ng] = v.split('-');
  const mongDoc = v ? `= ${ng}/${th}/${y}` : '';
  ok('B7 · ô ngày CÓ giá trị thì dòng đọc lại HIỆN THƯỜNG TRỰC (không phải chỉ khi bấm vào)',
     B.b7.coThe && B.b7.hien, JSON.stringify(B.b7));
  ok(`B7 · dòng đó đọc lại ĐÚNG value của ô ("${mongDoc}") — người gõ NHÌN THẤY ` +
     'ERP hiểu thành ngày nào, ngay lúc gõ xong',
     B.b7.doc.startsWith(mongDoc), `doc="${B.b7.doc}" · value=${v}`);
  ok('B7 · ngày sinh còn kèm SỐ TUỔI — sai một con là thấy ngay',
     / · \d+ tuổi$/.test(B.b7.doc), `doc="${B.b7.doc}"`);
  ok('B7 · CẢ LỚP: ô ngày khác (hạn chót việc) cũng có dòng đọc lại — "= 04/03/2026"',
     B.b7_o_khac.hien && B.b7_o_khac.doc === '= 04/03/2026', JSON.stringify(B.b7_o_khac));
}

/* ---- B8 · CAO-1: hồi quy "Đến ngày" không đặt được quá hôm nay --------- */
ok('B8 · #kvBcDen nhận NGÀY MAI (2026-09-08) — trước bản vá `checkValidity()` = false, chặn cả form',
   B.b8.kvBcDen_maisau.hopLe === true, JSON.stringify(B.b8.kvBcDen_maisau));
ok('B8 · #kvBcDen nhận CUỐI NĂM (2026-12-31) — kiểu người ta hay gõ cho chắc',
   B.b8.kvBcDen_cuoinam.hopLe === true, JSON.stringify(B.b8.kvBcDen_cuoinam));
ok('B8 · #kvBcTu cũng vậy (không áp một luật chung rồi để nó tự đúng)',
   B.b8.kvBcTu_cuoinam.hopLe === true, JSON.stringify(B.b8.kvBcTu_cuoinam));
ok('B8 · #dmNgayVao nhận ngày vào làm TƯƠNG LAI (offer đã ký, thứ Hai tới bắt đầu)',
   B.b8.dmNgayVao_thuhaitoi.hopLe === true, JSON.stringify(B.b8.dmNgayVao_thuhaitoi));
ok('B8 · nhưng KHÔNG bỏ min/max: `0001-01-01` vẫn phải sai thấy được',
   B.b8.kvBcDen_maisau.min === '1900-01-01' && B.b8.kvBcDen_maisau.max === '2100-12-31',
   JSON.stringify(B.b8.kvBcDen_maisau));

/* ---- B9 · CAO-2: câu lỗi nói ĐÚNG đầu bị vi phạm ----------------------- */
ok('B9 · ngày mua 20/05/1988 (máy in mua năm 1988) → HỢP LỆ, không còn chặn oan ở sàn 1990',
   B.b9.muaNam1988.hopLe === true && !B.b9.muaNam1988.do, JSON.stringify(B.b9.muaNam1988));
ok('B9 · ngày mua 01/01/2030 → câu lỗi nói về TRẦN ("không được quá hôm nay"), ' +
   'và nói luôn ngày đang nhập',
   /quá hôm nay/.test(B.b9.muaTuongLai.chu) && /04\/01\/2030|01\/01\/2030/.test(B.b9.muaTuongLai.chu),
   JSON.stringify(B.b9.muaTuongLai));
ok('B9 · ngày sinh 01/01/1900 → câu lỗi nói về SÀN ("sớm nhất là 1930"), KHÔNG nói về tuổi',
   /1930/.test(B.b9.sinhNam1900.chu) && !/14 tuổi/.test(B.b9.sinhNam1900.chu),
   JSON.stringify(B.b9.sinhNam1900));
ok('B9 · ngày sinh 01/01/2020 → câu lỗi nói về TUỔI ("dưới 14 tuổi"), KHÔNG nói về 1930 — ' +
   'một câu chung cho cả hai đầu là câu SAI SỰ THẬT ở một nửa số ca',
   /14 tuổi/.test(B.b9.sinh2020.chu) && !/1930/.test(B.b9.sinh2020.chu),
   JSON.stringify(B.b9.sinh2020));

/* ---- B10 · VỪA-2: câu đỏ dính lại giữa hai lần mở hộp ------------------ */
ok('B10 · gõ sai ngày sinh thì CÓ hiện câu đỏ (nếu không thì phép kiểm dưới vô nghĩa)',
   B.b10.truoc.do && B.b10.truoc.vien, JSON.stringify(B.b10.truoc));
ok('B10 · đóng hộp rồi mở lại, KHÔNG chạm vào ô → câu đỏ và viền đỏ ĐỀU BIẾN MẤT ' +
   '(trước bản vá: form người B hiện câu đỏ của người A dưới một ô rỗng)',
   !B.b10.sau.do && !B.b10.sau.vien, JSON.stringify(B.b10.sau));

/* ---- B10b · CAO-1: CẢ 8 Ô, không chỉ ô ngày sinh ---------------------- */
{
  const L = B.b10_lop || [];
  ok(`B10b · đủ 8 ô ngày mà \`app.js\` gán \`.value\` bằng mã (7 ô của CAO-1 + ô đã vá vòng trước)`,
     L.length === 8 && L.every(x => !x.khong_co),
     L.map(x => x.id + (x.khong_co ? ' (KHÔNG CÓ)' : '')).join(' · '));
  for (const x of L) {
    if (x.khong_co) continue;
    ok(`B10b · ${x.man} · #${x.id} — ① gõ nhầm thì CÓ đỏ (không có thì hai phép dưới vô nghĩa)`,
       x.truoc.do && x.truoc.vien, JSON.stringify(x.truoc));
    ok(`B10b · ${x.man} · #${x.id} — ② gán \`.value\` giá trị HỢP LỆ (không sự kiện nào) ` +
       `→ câu đỏ + viền đỏ của bản ghi TRƯỚC BIẾN MẤT`,
       !x.sau.do && !x.sau.vien, JSON.stringify(x.sau));
    ok(`B10b · ${x.man} · #${x.id} — ② dòng ĐỌC LẠI hiện đúng giá trị mới ("${x.mong}") — ` +
       'đây mới là bản vá THẬT của GY-0004, và nó phải có mặt trên ĐƯỜNG TẢI DỮ LIỆU ' +
       'từ máy chủ, không chỉ khi gõ tay',
       x.sau.hien && x.sau.docLai.startsWith(x.mong),
       `docLai="${x.sau.docLai}" · hien=${x.sau.hien} · value=${x.value}`);
  }
}

/* ---- B10d · `form.reset()` — đường thứ hai KHÔNG đi qua bẫy `value` --- */
{
  const R = B.b10_reset || {};
  ok('B10d · dựng được cảnh: `#cv-han-chot` có giá trị thì dòng đọc lại HIỆN ' +
     '(không có thì phép kiểm dưới vô nghĩa)',
     R.truoc && R.truoc.hien && R.truoc.doc === '= 31/12/2026', JSON.stringify(R.truoc));
  ok('B10d · bấm Huỷ (`form.reset()`) → ô rỗng VÀ dòng đọc lại biến mất theo — ' +
     '`.reset()` không bắn `input`/`change` và không đi qua bẫy `value`, phải nghe `reset` riêng',
     R.value === '' && !R.doc && !R.hien, JSON.stringify(R));
}

/* ---- B10c · CAO-1 trên MÀN THẬT: Sửa việc A → Sửa việc B -------------- */
{
  const E = B.b10_e2e || {};
  ok('B10c · dựng được đúng cảnh: có ≥ 2 nút "Sửa" việc trên màn Công việc',
     E.du_nut === true, JSON.stringify({ so_nut: E.so_nut }));
  if (E.du_nut) {
    ok('B10c · mở Sửa việc A: hạn chót 20/09/2026 từ máy chủ hiện NGAY dòng đọc lại ' +
       '"= 20/09/2026" — trước bản vá ô có giá trị mà dưới ô trống trơn',
       E.a_vua_mo.hien && E.a_vua_mo.docLai === '= 20/09/2026' && !E.a_vua_mo.do,
       JSON.stringify(E.a_vua_mo));
    ok('B10c · gõ nhầm 01/01/2200 trong việc A → CÓ câu đỏ (nếu không thì phép kiểm dưới vô nghĩa)',
       E.a_go_nham.do && E.a_go_nham.vien, JSON.stringify(E.a_go_nham));
    ok('B10c · bấm Huỷ, mở Sửa việc B (hạn 30/09/2026 HỢP LỆ), KHÔNG chạm vào ô → ' +
       'câu đỏ "bạn đang nhập 01/01/2200" và viền đỏ ĐỀU BIẾN MẤT',
       !E.b.do && !E.b.vien, JSON.stringify(E.b));
    ok('B10c · …và dưới ô là dòng đọc lại của CHÍNH việc B ("= 30/09/2026"), ' +
       'không phải của việc A, không phải trống',
       E.b.hien && E.b.docLai === '= 30/09/2026' && E.b.value === '2026-09-30',
       JSON.stringify(E.b));
  }
}

/* ---- B12 · CHẶN-1 tầng lưới: hộp Nhận xét có dải cắt ------------------- */
ok('B12 · máy chủ nói sổ nhận xét bị cắt (100/123) → hộp Nhận xét NÓI LẠI bằng dải cắt ' +
   '(trước bản vá hộp này không có ô nào, chỉ hộp Sửa việc ngay cạnh mới có)',
   B.b12.hien && /100/.test(B.b12.chu) && /123/.test(B.b12.chu), JSON.stringify(B.b12));
ok('B12 · dải nói theo đơn vị NHẬN XÉT, không phải "lần sửa" — cửa đọc nay chỉ đếm nhận xét',
   /nhận xét/i.test(B.b12.chu), JSON.stringify(B.b12.chu));

/* ---- B11 · VỪA-1: bấm thông báo nhận xét ------------------------------- */
ok('B11 · chuông có dòng thông báo nhận xét, và mang biểu tượng RIÊNG (💬) chứ không rơi về 🔔',
   B.b11.coDong && B.b11.bieuTuong === '💬', JSON.stringify(B.b11));
ok('B11 · bấm vào dòng đó thì HỘP NHẬN XÉT MỞ RA, đúng việc `lien_ket` trỏ tới — ' +
   'trước bản vá: panel đóng, không đổi tab, không mở gì cả',
   B.b11.hopMo && B.b11.lienKet === String(VIEC_TOI.id), JSON.stringify(B.b11));

ok('B · 0 lỗi console, 0 ngoại lệ', B.loi_console.length === 0 && B.ngoai_le.length === 0,
   JSON.stringify([B.loi_console, B.ngoai_le]));

/* ======================================================================== */
/* CA ĐỐI CHỨNG                                                              */
/* ======================================================================== */
console.log('\n=== CA ĐỐI CHỨNG — gài lỗi lại, phép đo PHẢI đỏ ===\n');

/* DC-A — trả `o.disabled = true` về đúng chỗ cũ. */
{
  const G = await doTrinhDuyet({
    tep: 'assets/js/app.js',
    be: s => s.replace(
      "      if (cauSaiONgay(o)) { noiNgaySinh(''); return; }",
      '      o.disabled = true; setTimeout(()=>{o.disabled=false;},50);')
  });
  ok('DC-A · khoá ô lúc `change` → GÕ NĂM SINH MẤT TIÊU ĐIỂM, kẹt ở 0001',
     !G.b1_giu_tieu_diem || G.b1_gia_tri !== '1990-01-01',
     `bản gãy: tiêu điểm=${G.b1_giu_tieu_diem} value=${G.b1_gia_tri}`);
}

/* DC-B — gỡ hẳn bộ nâng cấp ô ngày. */
{
  const G = await doTrinhDuyet({
    tep: 'assets/js/app.js',
    be: s => s.replace('theoDoiONgay();', '/* DC-B: gỡ */')
  });
  ok('DC-B · gỡ `theoDoiONgay()` → DÁN không ăn và cả lớp ô ngày mất min/max',
     G.b2_dan !== '1990-01-25' && G.b3.thieu.length > 0,
     `bản gãy: dán="${G.b2_dan}" · thiếu min/max ${G.b3.thieu.length} ô`);
}

/* DC-E — gỡ nút Nhận xét ở phía NGƯỜI NHẬN. */
{
  const G = await doTrinhDuyet({
    tep: 'assets/js/app.js',
    be: s => s.replace('      return nutNx.trim();', "      return '';")
              .replace(/return `<button type="button" class="btn-nho btn-primary" data-cv-batdau="\$\{r\.id\}">Bắt đầu làm<\/button>` \+ nutNx;/,
                       'return `<button type="button" class="btn-nho btn-primary" data-cv-batdau="${r.id}">Bắt đầu làm</button>`;')
              .replace(/return `<button type="button" class="btn-nho btn-primary" data-cv-nop="\$\{r\.id\}">Nộp kết quả<\/button>` \+ nutNx;/,
                       'return `<button type="button" class="btn-nho btn-primary" data-cv-nop="${r.id}">Nộp kết quả</button>`;')
  });
  ok('DC-E · gỡ nút ở phía người NHẬN → người bị nhận xét không còn đường đọc',
     G.b5_nut.toi === 0, `bản gãy: toi=${G.b5_nut.toi}`);
}

/* DC-C — gỡ nhánh `nhan_xet` khỏi `cauSuaDoc`. */
{
  const src = banBeGay('dc-c', s => s.replace(
    "  if (d.truong === 'nhan_xet') return `${d.nguoi_ten} nhận xét: \"${d.gia_tri_moi}\"`;",
    ''));
  const V = await dungVong(src);
  await V.nx('SEP', { id: 1, noi_dung: 'Chỗ làm tốt: gửi đúng hạn, khớp đầu ra.' });
  const r = await V.lichSu('AN', 1);
  const cau = (r.than.ds || []).filter(d => d.truong === 'nhan_xet').map(d => d.cau);
  ok('DC-C · gỡ câu riêng → sổ in ra mã máy "nhan_xet", đọc không hiểu',
     cau.length === 1 && /nhan_xet/.test(cau[0]), `bản gãy: ${JSON.stringify(cau[0])}`);
}

/* DC-D — bỏ chặn quyền. */
{
  const src = banBeGay('dc-d', s => s.replace(
    '  if (!laNguoiGiao && !laQuanLy && !laNguoiNhan) {',
    '  if (false) {'));
  const V = await dungVong(src);
  const r = await V.nx('HANG', { id: 1, noi_dung: 'Người ngoài chen vào chấm việc phòng khác.' });
  ok('DC-D · bỏ chặn quyền → người NGOÀI chấm được việc của phòng khác',
     r.status === 200, `bản gãy HTTP ${r.status}`);
}

/* DC-F — bỏ lọc `truong` ở `suaLichSu`, tức quay về ĐÚNG bản CHẶN-1.
   Bẻ ở chỗ ĐỌC tham số chứ không ở mệnh đề SQL: bỏ mỗi mệnh đề `AND truong=?`
   mà vẫn `bind` ba tham số thì D1 ném "column index out of range" — ca đối
   chứng khi ấy đỏ vì CÂU SQL HỎNG, không phải vì nhận xét bị đẩy ra khỏi
   trần, tức là đo nhầm thứ. (Đã đo được đúng bẫy này lúc dựng ca.) */
{
  const src = banBeGay('dc-f', s => s.replace(
    "  const truong = String(u.searchParams.get('truong') || '').trim();",
    "  const truong = '';"));
  const V = await dungVong(src);
  const them = V.db.prepare(
    `INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                       nguoi_id, nguoi_ten, luc)
     VALUES ('cong_viec', '1', ?, NULL, ?, 'SEP', 'Bùi Thị Ngọc', ?)`);
  for (let i = 1; i <= 3; i++) them.run('nhan_xet', `Nhận xét cũ ${i}`, `2026-06-0${i} 09:00:00`);
  for (let i = 1; i <= 110; i++) {
    them.run('tieu_de', `Đổi tên lần ${i}`, `2026-08-${String((i % 28) + 1).padStart(2, '0')} 1${i % 10}:00:00`);
  }
  const r = await V.lichSu('AN', 1, 'nhan_xet');
  const cau = (r.than.ds || []).filter(d => d.truong === 'nhan_xet');
  ok('DC-F · bỏ lọc `truong` → 110 vết sửa đẩy SẠCH 3 nhận xét cũ ra khỏi trần 100, ' +
     'hộp sẽ in "Chưa có nhận xét nào"',
     cau.length === 0, `bản gãy: còn ${cau.length}/3 nhận xét · ${(r.than.ds || []).length} dòng trả về`);
}

/* DC-G — gỡ dòng ĐỌC LẠI NGÀY. Bẻ đúng `docLaiNgay` (trả rỗng) chứ không gỡ
   cả `veNhac`: gỡ cả thì mất luôn câu báo sai, và ca này hoá ra đo hai thứ. */
{
  const G = await doTrinhDuyet({
    tep: 'assets/js/o-ngay.js',
    be: s => s.replace('export function docLaiNgay(o) {', 'export function docLaiNgay(o) {\n  return \'\';')
  });
  /* Đo trên CÂU CHỮ hiện ra màn: gỡ `docLaiNgay` thì dòng nhắc vẫn còn (nó
     còn hai việc khác), nhưng KHÔNG chỗ nào đọc lại "= DD/MM/YYYY" nữa —
     tức người gõ lại mù đúng như trước bản vá. */
  ok('DC-G · gỡ dòng đọc lại ngày → gõ 25011990 ra 1990-02-05 mà KHÔNG chỗ nào nói ra, ' +
     'đúng trạng thái mù của GY-0004 trước bản vá',
     !G.b7.doc && !/=\s*\d{2}\/\d{2}\/\d{4}/.test(G.b7.chu || '') &&
     !/=\s*\d{2}\/\d{2}\/\d{4}/.test(G.b7_o_khac.chu || ''),
     `bản gãy: doc="${G.b7.doc}" chu="${G.b7.chu}" value=${G.b7.value}`);
}

/* DC-H — GỠ CÁI BẪY trên `value` trong `o-ngay.js` (REV-0061 vòng 2 · CAO-1).
   ------------------------------------------------------------------------
   Vòng trước ca này bẻ `app.js` (bỏ một lệnh `dispatchEvent`) và vì thế chỉ
   canh được ĐÚNG MỘT Ô — 6 ô kia thủng mà bàn đo vẫn xanh, đúng lỗi Hồ Ly
   bắt được. Nay bản vá nằm ở TẦNG LỚP nên ca đối chứng cũng phải bẻ ở tầng
   lớp: giết cái bẫy `Object.defineProperty(o,'value')` bằng cách cho
   `moTaValue = null` — `o-ngay.js` lập tức quay về đúng trạng thái vòng
   trước (chỉ nghe focus/blur/input/change).
   ĐỪNG đổi ca này về bẻ một lệnh gán trong `app.js`: bẻ ở đó chỉ chứng minh
   được một ô, mà lỗi này là lỗi cả lớp. */
{
  const G = await doTrinhDuyet({
    tep: 'assets/js/o-ngay.js',
    be: s => s.replace(
      "  const moTaValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');",
      '  const moTaValue = null;   /* DC-H: giết cái bẫy */')
  });
  const L = G.b10_lop || [];
  const dinhDo = L.filter(x => !x.khong_co && (x.sau.do || x.sau.vien)).map(x => x.id);
  const mucDoc = L.filter(x => !x.khong_co && (!x.sau.hien || !x.sau.docLai)).map(x => x.id);
  ok('DC-H · gỡ bẫy `value` → câu đỏ + viền đỏ của bản ghi TRƯỚC dính lại trên ' +
     `CẢ ${L.length} ô, dưới một giá trị HỢP LỆ của bản ghi SAU`,
     dinhDo.length === L.length, `bản gãy dính đỏ ở ${dinhDo.length}/${L.length} ô: ${dinhDo.join(' · ')}`);
  ok('DC-H · …và ô nào KHÔNG dính đỏ thì mất hẳn dòng đọc lại — bản vá THẬT của ' +
     'GY-0004 vắng mặt trên đường tải dữ liệu từ máy chủ (hậu quả tầng hai của CAO-1)',
     dinhDo.length + mucDoc.length >= L.length,
     `dính đỏ ${dinhDo.length} ô · mất dòng đọc lại ${mucDoc.length} ô`);
  ok('DC-H · trên MÀN THẬT: mở Sửa việc B (hạn 30/09/2026 hợp lệ) vẫn thấy câu đỏ ' +
     '"bạn đang nhập 01/01/2200" của việc A — đúng ca CAO-1 Hồ Ly dựng',
     G.b10_e2e.du_nut && (G.b10_e2e.b.do || G.b10_e2e.b.vien),
     `bản gãy: ${JSON.stringify(G.b10_e2e.b || G.b10_e2e)}`);
  ok('DC-H · và ngay lúc VỪA MỞ Sửa việc A, dòng "= 20/09/2026" cũng không có — ' +
     '`veNhac` chỉ chạy một lần lúc nâng cấp ô, khi ô còn rỗng',
     G.b10_e2e.du_nut && !G.b10_e2e.a_vua_mo.docLai,
     `bản gãy: ${JSON.stringify(G.b10_e2e.a_vua_mo || G.b10_e2e)}`);
}

rmSync(TAM, { recursive: true, force: true });
console.log('');
process.exit(tongKet() ? 0 : 1);
