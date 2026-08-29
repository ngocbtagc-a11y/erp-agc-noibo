/* ==========================================================================
   BÀN ĐO — SỬA MỤC TIÊU ĐÃ GIAO, ĐỦ BẢY TRƯỜNG
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-sua-muc-tieu-day-du.mjs
   0 phút GitHub Actions, 0 token, không chạm mạng, không chạm D1 thật.

   VÌ SAO CÓ BÀN ĐO NÀY. Sếp Ngọc nhắc BA LẦN cùng một chuyện:
     lần 1 — "trong tab Trạm Mục tiêu… tránh quên việc"
     lần 2 — "MỤC TIÊU ĐÃ GIAO KHÔNG SỬA ĐƯỢC NỮA KÌA"
     lần 3 — "còn việc sửa mục tiêu sau khi đã giao nữa"
   CTL-0017 mở được `tieu_de` + `mo_ta`, rồi dừng. Bốn trường còn lại —
   `cap` · `bo_phan` · `nam` · `quy` — vẫn đóng băng, và hộp Sửa trên màn hình
   chỉ có 2 ô. Bàn đo này chốt cả hai đầu: MÁY CHỦ nhận đủ 7 trường, và HỘP
   SỬA mở đủ 7 ô.

   Dựng SQLite THẬT trong bộ nhớ (`ban-thu-d1.mjs`), nạp `schema.sql` + TOÀN
   BỘ `migrations/`, rồi gọi `worker.fetch()` NGUYÊN BẢN qua router. Mọi con
   số dưới đây đọc từ JSON THẬT trả về, không nhìn màn hình, không khớp chuỗi
   SQL bằng tay (BH-34).

   ĐO GÌ
     ① BẢNG 7 TRƯỜNG × 4 NHÓM — trường nào sửa được, có ghi vết không, có bắt
        lý do không. Dựng bằng cách GỌI API 7 lần, đọc HTTP + đếm dòng sổ +
        đọc cột `ly_do` thật. Không đọc hằng số trong mã ra rồi tự khen.
     ② HỘP SỬA MỞ ĐỦ 7/7 Ô — soi `app.html` + `app.js`. Máy chủ nhận mà màn
        hình không có ô thì Sếp vẫn không sửa được, tức là chưa xong.
     ③ AI ĐƯỢC SỬA — cắt ở MÁY CHỦ (người ngoài, quản lý, chủ, Admin).
     ④ ĐỔI KỲ (nam/quy) — lịch sử đủ 4 THỨ (cũ · mới · ai · lý do) và người
        đặt mục tiêu nhận ĐÚNG 1 TIN, không phải 1 tin mỗi trường.
     ⑤ VIỆC ĐANG GẮN VÀO — mục tiêu có 3 việc, đổi `bo_phan` thì 3 việc đó ra
        sao. ĐO, KHÔNG ĐOÁN.
     ⑥ ĐỔI `cap` — hạ xuống `ca_nhan` là GIẤU mục tiêu khỏi người khác. Đo
        bằng `mtDanhSach` gọi bằng phiên của NGƯỜI KHÁC.
     ⑦ NHÓM ④ KHOÁ + LỐI RA "MỞ LẠI".
     ⑧ SỐ DÒNG GHI D1 mỗi lần sửa (hạn mức ghi — REV-0031).
     ⑨ MÃ MỚI TRÊN CSDL CŨ (chưa nạp `them-ly-do-sua.sql`).

   CA ĐỐI CHỨNG CỐ Ý SAI (BH-16) — mỗi ca là một bản `src` bị bẻ gãy ở ĐÚNG
   MỘT CHỖ, và phải nói được TRƯỚC vì sao kết quả BẮT BUỘC phải khác:
     DC-A  bỏ cửa lý do khi đổi cấp/kỳ      → đổi kỳ báo cáo lén trở lại
     DC-B  ⚠️ CẮT QUÁ TAY: bắt lý do cho CẢ  → sửa chính tả cũng bị tra hỏi
           `tieu_de`                            (phải bắt được, nếu không thì
                                                 phép đo mù một chiều)
     DC-C  bỏ chốt Admin khi nâng `cong_ty` → người thường tự phong mục tiêu
                                               cấp công ty qua cửa sửa
     DC-D  bỏ báo người đặt mục tiêu        → đổi kỳ sau lưng chủ mục tiêu
     DC-E  cho quản lý đổi `cap`            → giấu mục tiêu của cấp dưới

   DC-B là ca bắt buộc: khoá chặt tới mức người tạo không sửa nổi một lỗi
   chính tả cũng là HỎNG, không phải "an toàn". Phép kiểm phải bắt được cả
   hai chiều — lỏng quá VÀ chặt quá.
   ========================================================================== */

import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = path.join(GOC, '.tam-do-muctieu');

datDongHo('2026-08-29T03:00:00Z');          // 10:00 giờ VN

/* ---- Mồi dữ liệu --------------------------------------------------------
   Đúng sơ đồ báo cáo Sếp Ngọc đã chốt cho kho: AN -> DUY -> SEP.
   HANG ở phòng khác, không dính dây nào — dùng để đo "người ngoài". */
const NGUOI = [
  // id      họ tên              bộ phận         quản lý  vai trò
  ['SEP',   'Bùi Thị Ngọc',     'Ban giám đốc',  null,   'admin'],
  ['DUY',   'Phạm Khương Duy',  'Kho vận',       'SEP',  'quan_ly_kho'],
  ['AN',    'Nguyễn Văn An',    'Kho vận',       'DUY',  'nhan_vien_kho'],
  ['HANG',  'Phan Thị Hằng',    'Kế toán',       'SEP',  'ke_toan_truong']
];

/* Mục tiêu do DUY đặt (không phải Sếp) — để đo được cả nhánh "quản lý cấp
   trên của người đặt" lẫn nhánh "người đặt tự sửa". Mục tiêu #1 mang 3 việc
   để đo đúng ca Sếp yêu cầu ở mục ⑤. */
function moi(db) {
  db.exec('DELETE FROM lich_su_thay_doi_nen; DELETE FROM thong_bao; DELETE FROM cong_viec;' +
          'DELETE FROM muc_tieu; DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam) VALUES (?,?,?,?,?,?,1)');
  const tk = db.prepare(
    'INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk) VALUES (?,?,?,?,?,1,0)');
  NGUOI.forEach(([id, ten, bp, ql, vt], i) => {
    ns.run(id, ten, id.slice(0, 2), 'NV', bp, ql);
    tk.run(i + 1, id, 'tk' + id, 'pbkdf2$1$x$x', vt);
  });

  db.prepare(`INSERT INTO muc_tieu (id, cap, bo_phan, tieu_de, mo_ta, nam, quy,
      nguoi_tao_id, nguoi_tao_ten, trang_thai, da_chot, tao_luc)
    VALUES
      (1,'phong_ban','Kho vận','Giảm sai sót đóng gói','mô tả gốc',2026,3,'DUY','Phạm Khương Duy','dang_thuc_hien',0,'2026-08-20 09:00:00'),
      (2,'cong_ty',NULL,'Doanh số 90 tỷ',NULL,2026,3,'SEP','Bùi Thị Ngọc','dang_thuc_hien',1,'2026-08-20 09:00:00'),
      (3,'phong_ban','Kho vận','Mục tiêu đã đóng sổ',NULL,2026,3,'DUY','Phạm Khương Duy','hoan_thanh',0,'2026-08-20 09:00:00'),
      (4,'cong_ty',NULL,'Mục tiêu công ty CHƯA chốt',NULL,2026,3,'SEP','Bùi Thị Ngọc','dang_thuc_hien',0,'2026-08-20 09:00:00'),
      (5,'phong_ban','Kho vận','Mục tiêu để đo bảng 7 trường',NULL,2026,3,'SEP','Bùi Thị Ngọc','dang_thuc_hien',0,'2026-08-20 09:00:00')`).run();

  // BA VIỆC gắn vào mục tiêu #1 — đúng ca Sếp yêu cầu đo ở mục ⑤.
  const cv = db.prepare(`INSERT INTO cong_viec
    (id, tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten,
     han_chot, trang_thai, muc_tieu_id, tao_luc)
    VALUES (?,?,'có biên bản ký','DUY','Phạm Khương Duy','AN','Nguyễn Văn An','2026-08-30',?,1,'2026-08-25 09:00:00')`);
  cv.run(1, 'Dán nhãn lại lô chè chưng yến', 'moi');
  cv.run(2, 'Kiểm kê hàng nhập khẩu quý 3', 'dang_lam');
  cv.run(3, 'Đối soát tồn hạt điều rang', 'hoan_thanh');
}

/* ---- Một vòng đo trên MỘT bản src --------------------------------------- */
async function dungVong(thuMucSrc, boiCSDL = null) {
  const { db, d1 } = dungDB();
  moi(db);
  if (boiCSDL) boiCSDL(db);
  const env = dungEnv(d1);
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;
  const phien = {};
  for (let i = 0; i < NGUOI.length; i++) phien[NGUOI[i][0]] = await taoPhienThat(env, i + 1);

  const suaMT = (ai, than) => goiAPI(worker, env, '/api/muc-tieu/cap-nhat', phien[ai],
    { method: 'POST', body: JSON.stringify(than) });
  const dsMT = (ai, nam, quy) => goiAPI(worker, env,
    `/api/muc-tieu/danh-sach?nam=${nam}&quy=${quy}`, phien[ai]);
  const lichSu = (ai, bang, id) => goiAPI(worker, env, `/api/sua/lich-su?bang=${bang}&id=${id}`, phien[ai]);
  const mt = (id) => db.prepare('SELECT * FROM muc_tieu WHERE id = ?').all(id)[0];
  const vetCua = (id) => db.prepare(
    "SELECT * FROM lich_su_thay_doi_nen WHERE bang = 'muc_tieu' AND ban_ghi_id = ? ORDER BY id").all(String(id));
  const soVet = (id) => vetCua(id).length;
  const tinCua = (who) => db.prepare(
    "SELECT noi_dung FROM thong_bao WHERE nguoi_nhan_id = ? AND loai = 'muc_tieu_sua'").all(who).map(r => r.noi_dung);
  const xoaTin = () => db.exec('DELETE FROM thong_bao');
  const viecCua = (mtId) => db.prepare('SELECT id, tieu_de, muc_tieu_id, trang_thai FROM cong_viec WHERE muc_tieu_id = ? ORDER BY id').all(mtId);
  return { db, env, worker, phien, suaMT, dsMT, lichSu, mt, vetCua, soVet, tinCua, xoaTin, viecCua };
}

/* Bẻ gãy ĐÚNG MỘT CHỖ trong một bản sao của `src/` — ca đối chứng. */
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

/* ========================================================================== */
console.log('\n' + '='.repeat(72));
console.log('SỬA MỤC TIÊU ĐÃ GIAO — BÀN ĐO BẢY TRƯỜNG');
console.log('='.repeat(72));

/* ---------------------------------------------------------------------------
   ① BẢNG 7 TRƯỜNG × 4 NHÓM — dựng bằng JSON THẬT, không đọc hằng số trong mã
   ---------------------------------------------------------------------------
   Mỗi trường gọi HAI lượt trên MỘT mục tiêu sạch:
     · lượt 1 — sửa KHÔNG kèm lý do. 200 = không bắt lý do; 400 = có bắt.
     · lượt 2 — nếu lượt 1 bị chặn thì gửi lại KÈM lý do, phải qua.
   Rồi đếm dòng sổ và đọc cột `ly_do` thật để biết có ghi vết / lý do có vào
   đúng dòng hay không.
   ------------------------------------------------------------------------ */
console.log('\n=== ① BẢNG 7 TRƯỜNG × 4 NHÓM (đo bằng JSON thật) ===\n');

const THU = [
  // trường,        giá trị mới,          nhóm KỲ VỌNG
  ['tieu_de',      'Giảm sai sót còn 1%', '① thoải mái'],
  ['mo_ta',        'mô tả mới',           '① thoải mái'],
  ['bo_phan',      'Vận hành sàn',        '② ghi vết'],
  ['cap',          'ca_nhan',             '③ bắt lý do'],
  ['nam',          2027,                  '③ bắt lý do'],
  ['quy',          4,                     '③ bắt lý do'],
  ['trang_thai',   'hoan_thanh',          '② ghi vết']
];
const BANG = [];
for (const [truong, giaTri, nhomKV] of THU) {
  const V = await dungVong(path.join(GOC, 'src'));
  const r1 = await V.suaMT('SEP', { id: 5, [truong]: giaTri });
  let batLyDo = r1.status === 400;
  let r = r1;
  if (batLyDo) r = await V.suaMT('SEP', { id: 5, [truong]: giaTri, ly_do: 'lý do thật, dài hơn 5 ký tự' });
  const vet = V.vetCua(5).filter(v => v.truong === truong);
  BANG.push({
    truong,
    suaDuoc: r.status === 200,
    ghiVet: vet.length === 1,
    batLyDo,
    lyDoVaoSo: vet.length === 1 ? !!vet[0].ly_do : false,
    giaTriMoiTrongDb: String(V.mt(5)[truong]),
    nhomKV
  });
}
console.log('  trường        sửa được  ghi vết  bắt lý do  lý do vào sổ  nhóm');
for (const h of BANG) {
  console.log(`  ${h.truong.padEnd(13)} ${(h.suaDuoc ? 'CÓ' : 'KHÔNG').padEnd(9)} ` +
              `${(h.ghiVet ? 'CÓ' : 'KHÔNG').padEnd(8)} ${(h.batLyDo ? 'CÓ' : 'KHÔNG').padEnd(10)} ` +
              `${(h.lyDoVaoSo ? 'CÓ' : '—').padEnd(13)} ${h.nhomKV}`);
}
console.log('');
ok('⚠️ CẢ 7/7 TRƯỜNG ĐỀU SỬA ĐƯỢC (trước bản này: 3/7)',
   BANG.every(h => h.suaDuoc), BANG.filter(h => !h.suaDuoc).map(h => h.truong).join(', ') || 'không sót trường nào');
ok('  → CẢ 7/7 đều CÓ GHI VẾT, đúng 1 dòng mỗi trường',
   BANG.every(h => h.ghiVet), BANG.filter(h => !h.ghiVet).map(h => h.truong).join(', ') || 'đủ vết');
ok('  → nhóm ③ (cap · nam · quy) BẮT lý do',
   ['cap', 'nam', 'quy'].every(t => BANG.find(h => h.truong === t).batLyDo));
ok('  → và lý do vào ĐÚNG dòng của nó trong sổ',
   ['cap', 'nam', 'quy'].every(t => BANG.find(h => h.truong === t).lyDoVaoSo));
ok('⚠️ nhóm ① + ② (tieu_de · mo_ta · bo_phan · trang_thai) KHÔNG bắt lý do — sửa chính tả phải đi lọt',
   ['tieu_de', 'mo_ta', 'bo_phan', 'trang_thai'].every(t => !BANG.find(h => h.truong === t).batLyDo));

/* ---------------------------------------------------------------------------
   ② HỘP SỬA CÓ MỞ ĐỦ 7 Ô KHÔNG
   ---------------------------------------------------------------------------
   Máy chủ nhận 7 trường mà màn hình chỉ có 2 ô thì Sếp VẪN không sửa được —
   tức là chưa xong. Soi thẳng `app.html` (có ô) và `app.js` (ô đó có được
   gói vào dữ liệu gửi đi không). Đây là chỗ Sếp NHÌN THẤY.
   ------------------------------------------------------------------------ */
console.log('\n=== ② HỘP SỬA — có đủ 7 ô trên màn hình không ===\n');
{
  const html = readFileSync(path.join(GOC, 'public/app.html'), 'utf8');
  const js = readFileSync(path.join(GOC, 'public/assets/js/app.js'), 'utf8');
  const O = {
    tieu_de: 'mt-tieu-de', mo_ta: 'mt-mo-ta', cap: 'mt-cap', bo_phan: 'mt-bo-phan',
    nam: 'mt-nam', quy: 'mt-quy', trang_thai: 'mt-trang-thai'
  };
  const thieuO = Object.entries(O).filter(([, idO]) => !html.includes(`id="${idO}"`)).map(([t]) => t);
  ok('app.html có đủ 7/7 ô nhập', thieuO.length === 0, thieuO.join(', ') || '7/7');
  const thieuGoi = Object.keys(O).filter(t => !new RegExp(`doi\\.${t}\\b`).test(js));
  ok('app.js gói đủ 7/7 trường vào dữ liệu gửi lên', thieuGoi.length === 0, thieuGoi.join(', ') || '7/7');
  ok('có ô lý do + dải cảnh báo hậu quả', html.includes('id="mt-ly-do"') && html.includes('id="mt-canh-bao"'));
  ok('có lối ra "Mở lại" cho mục tiêu đã đóng sổ', js.includes('data-mt-molai'));
  ok('có sổ lịch sử sửa ngay trong hộp', html.includes('id="mt-lichsu"'));
}

/* ---------------------------------------------------------------------------
   ③ AI ĐƯỢC SỬA — cắt ở MÁY CHỦ
   ------------------------------------------------------------------------ */
console.log('\n=== ③ AI ĐƯỢC SỬA — gọi thẳng API ===\n');
{
  const V = await dungVong(path.join(GOC, 'src'));
  ok('người ĐẶT mục tiêu (DUY) sửa tên → CHO',
     (await V.suaMT('DUY', { id: 1, tieu_de: 'Giảm sai sót đóng gói (sửa chính tả)' })).status === 200);
  ok('ADMIN (SEP) sửa mục tiêu người khác đặt → CHO',
     (await V.suaMT('SEP', { id: 1, mo_ta: 'Sếp bổ sung bối cảnh' })).status === 200);
  ok('QUẢN LÝ CẤP TRÊN của người đặt sửa được (SEP là quản lý của DUY qua chuỗi quan_ly_id)',
     (await V.suaMT('SEP', { id: 1, bo_phan: 'Kho vận 2' })).status === 200);
  ok('người NGOÀI (HANG, khác phòng, không dính dây) → CHẶN',
     (await V.suaMT('HANG', { id: 1, tieu_de: 'người ngoài đổi' })).status === 403);
  ok('  → tên KHÔNG hề đổi', V.mt(1).tieu_de.includes('sửa chính tả'), V.mt(1).tieu_de);
  ok('CẤP DƯỚI (AN) sửa mục tiêu của quản lý mình → CHẶN',
     (await V.suaMT('AN', { id: 1, quy: 4, ly_do: 'em xin dời sang quý sau' })).status === 403);

  // ⚠️ NGUY HIỂM ② — nâng lên cấp công ty vẫn chỉ Admin, y hệt `mtTao`.
  // Nếu không thì cửa SỬA là đường vòng để lách đúng cái chốt đó.
  const rNang = await V.suaMT('DUY', { id: 1, cap: 'cong_ty', ly_do: 'tôi tự nâng lên cấp công ty' });
  ok('⚠️ người thường TỰ NÂNG mục tiêu lên cấp CÔNG TY → CHẶN (không lách được chốt của mtTao)',
     rNang.status === 403, `HTTP ${rNang.status}`);
  ok('  → cấp KHÔNG hề đổi', V.mt(1).cap === 'phong_ban', V.mt(1).cap);

  ok('mục tiêu công ty ĐÃ CHỐT → khoá hẳn, cả Admin cũng không sửa',
     (await V.suaMT('SEP', { id: 2, tieu_de: 'Doanh số 100 tỷ' })).status === 409);
  ok('  → và không mở lại được (khác nhóm ④: chốt là chốt)',
     (await V.suaMT('SEP', { id: 2, quy: 4, ly_do: 'xin chuyển sang quý 4' })).status === 409);

  ok('gửi lại ĐÚNG giá trị cũ → "không có gì để sửa", KHÔNG đòi lý do oan',
     (await V.suaMT('SEP', { id: 1, quy: 3, nam: 2026 })).status === 400);
}

/* ---------------------------------------------------------------------------
   ④ ĐỔI KỲ BÁO CÁO (nam/quy) — NGUY HIỂM ①
   ------------------------------------------------------------------------ */
console.log('\n=== ④ ĐỔI NĂM/QUÝ — lịch sử đủ 4 thứ + người đặt nhận ĐÚNG 1 TIN ===\n');
{
  const V = await dungVong(path.join(GOC, 'src'));
  V.xoaTin();
  const r = await V.suaMT('SEP', { id: 1, nam: 2027, quy: 1, ly_do: 'quý 3 không kịp triển khai, chuyển cam kết sang quý 1/2027' });
  ok('thiếu lý do → CHẶN', (await V.suaMT('SEP', { id: 5, quy: 4 })).status === 400);
  ok('có lý do → CHO', r.status === 200, `HTTP ${r.status}`);
  ok('  → CSDL đã đổi thật', V.mt(1).nam === 2027 && V.mt(1).quy === 1, `${V.mt(1).quy}/${V.mt(1).nam}`);
  ok('  → lý do cụt lủn ("ok") vẫn bị chặn (chống lý do cho có)',
     (await V.suaMT('SEP', { id: 5, quy: 4, ly_do: 'ok' })).status === 400);

  const ds = (await V.lichSu('SEP', 'muc_tieu', 1)).than.ds;
  const dNam = ds.find(d => d.truong === 'nam');
  const dQuy = ds.find(d => d.truong === 'quy');
  ok('  → sổ có ĐỦ 4 THỨ: cũ · mới · ai · lý do',
     dNam?.gia_tri_cu === '2026' && dNam?.gia_tri_moi === '2027' &&
     dNam?.nguoi_ten === 'Bùi Thị Ngọc' && /không kịp triển khai/.test(dNam?.ly_do || ''),
     JSON.stringify({ cu: dNam?.gia_tri_cu, moi: dNam?.gia_tri_moi, ai: dNam?.nguoi_ten, ly_do: dNam?.ly_do }));
  ok('  → câu tiếng Việt đọc được, KHÔNG phải mã máy', /đổi năm 2026 → 2027 — lý do:/.test(dNam?.cau || ''), dNam?.cau);
  ok('  → và dựng lại được kỳ cũ từ sổ (2026 Q3)',
     dNam?.gia_tri_cu === '2026' && dQuy?.gia_tri_cu === '3', `${dQuy?.gia_tri_cu}/${dNam?.gia_tri_cu}`);

  const tin = V.tinCua('DUY');
  ok('⚠️ NGƯỜI ĐẶT MỤC TIÊU (DUY) nhận ĐÚNG 1 TIN — không phải 1 tin mỗi trường',
     tin.length === 1, `${tin.length} tin`);
  ok('  → tin gộp cả năm lẫn quý, kèm lý do', /năm/.test(tin[0] || '') && /quý/.test(tin[0] || '') && /lý do/.test(tin[0] || ''), tin[0]);
  ok('  → người sửa (SEP) KHÔNG tự bắn tin cho chính mình', V.tinCua('SEP').length === 0);

  // Hậu quả thật: mục tiêu rời khỏi Trạm Mục Tiêu quý 3, mọc ở quý 1/2027.
  const q3 = (await V.dsMT('DUY', 2026, 3)).than;
  const q1 = (await V.dsMT('DUY', 2027, 1)).than;
  ok('  → HẬU QUẢ THẬT: mục tiêu BIẾN MẤT khỏi Trạm Mục Tiêu quý 3/2026',
     !(q3.phong_ban || []).some(m => m.id === 1));
  ok('  → và mọc ở quý 1/2027', (q1.phong_ban || []).some(m => m.id === 1));
}

/* ---------------------------------------------------------------------------
   ⑤ VIỆC ĐANG GẮN VÀO — ĐO, KHÔNG ĐOÁN (Sếp yêu cầu ca này đích danh)
   ---------------------------------------------------------------------------
   Mục tiêu #1 có ĐÚNG 3 việc. Đổi `bo_phan` rồi đo lại: 3 việc đó ra sao?
   Câu hỏi thật là "việc có bị mồ côi không" — chứ không phải "tôi nghĩ là
   không sao".
   ------------------------------------------------------------------------ */
console.log('\n=== ⑤ MỤC TIÊU CÓ 3 VIỆC — đổi phòng ban thì 3 việc đó ra sao ===\n');
{
  const V = await dungVong(path.join(GOC, 'src'));
  const truoc = V.viecCua(1);
  ok('trước khi sửa: mục tiêu #1 có ĐÚNG 3 việc', truoc.length === 3, `${truoc.length} việc`);

  const r = await V.suaMT('SEP', { id: 1, bo_phan: 'Vận hành sàn' });
  ok('đổi bo_phan (nhóm ②, không cần lý do) → CHO', r.status === 200, `HTTP ${r.status}`);

  const sau = V.viecCua(1);
  ok('⚠️ 3 VIỆC VẪN CÒN NGUYÊN, KHÔNG MỒ CÔI', sau.length === 3, `${sau.length} việc`);
  ok('  → đúng 3 việc CŨ, cùng id, muc_tieu_id vẫn trỏ về #1',
     JSON.stringify(sau.map(v => v.id)) === JSON.stringify(truoc.map(v => v.id)) &&
     sau.every(v => v.muc_tieu_id === 1),
     sau.map(v => `#${v.id}→mt${v.muc_tieu_id}`).join(' '));
  const the = (await V.dsMT('SEP', 2026, 3)).than.phong_ban.find(m => m.id === 1);
  ok('  → thẻ mục tiêu vẫn đếm đủ 3 việc (1 xong / 3) — tiến độ không hụt',
     the?.so_viec === 3 && the?.so_viec_xong === 1, `${the?.so_viec_xong}/${the?.so_viec}`);
  ok('  → và nhãn phòng ban đã đổi thật trên thẻ', the?.bo_phan === 'Vận hành sàn', the?.bo_phan);

  // Chiều nguy hiểm hơn: đổi KỲ. Dây nối vẫn nguyên, nhưng THẺ rời màn hình.
  const r2 = await V.suaMT('SEP', { id: 1, quy: 4, ly_do: 'chuyển cam kết sang quý 4 cho kịp mùa Tết' });
  ok('đổi quý (mục tiêu đang có 3 việc) → CHO, có lý do', r2.status === 200);
  ok('  → máy chủ TRẢ VỀ số việc đang treo, để giao diện cảnh báo được',
     r2.than.so_viec === 3, `so_viec = ${r2.than.so_viec}`);
  ok('  → 3 việc VẪN nguyên dây (không mồ côi)', V.viecCua(1).length === 3);
  ok('  ⚠️ nhưng THẺ mục tiêu rời khỏi Trạm Mục Tiêu quý 3 — đây là cái mất thật',
     !((await V.dsMT('SEP', 2026, 3)).than.phong_ban || []).some(m => m.id === 1));
}

/* ---------------------------------------------------------------------------
   ⑥ ĐỔI `cap` — NGUY HIỂM ②: giấu mục tiêu khỏi người đang theo dõi
   ------------------------------------------------------------------------ */
console.log('\n=== ⑥ HẠ CẤP mục tiêu = GIẤU nó khỏi người khác ===\n');
{
  const V = await dungVong(path.join(GOC, 'src'));
  const truoc = (await V.dsMT('AN', 2026, 3)).than;
  ok('trước: AN (người ngoài cuộc) THẤY mục tiêu công ty #4',
     (truoc.cong_ty || []).some(m => m.id === 4));

  const r = await V.suaMT('SEP', { id: 4, cap: 'ca_nhan', ly_do: 'tạm hạ xuống cá nhân để làm nháp' });
  ok('Admin hạ mục tiêu công ty → cá nhân (có lý do) → CHO', r.status === 200, `HTTP ${r.status}`);

  const sau = (await V.dsMT('AN', 2026, 3)).than;
  ok('⚠️ sau: AN KHÔNG CÒN THẤY NÓ Ở ĐÂU — mục tiêu đã bị giấu khỏi cả công ty',
     !(sau.cong_ty || []).some(m => m.id === 4) &&
     !(sau.phong_ban || []).some(m => m.id === 4) &&
     !(sau.ca_nhan || []).some(m => m.id === 4));
  ok('  → mà người đặt (SEP) thì vẫn thấy — nên nhìn từ ghế Sếp KHÔNG có gì lạ',
     ((await V.dsMT('SEP', 2026, 3)).than.ca_nhan || []).some(m => m.id === 4));
  ok('  → CHÍNH VÌ THẾ mới bắt lý do + ghi vết: đây là thứ duy nhất còn lại để truy',
     /Cá nhân/.test(V.vetCua(4).find(v => v.truong === 'cap')?.gia_tri_moi ? 'Cá nhân' : ''),
     JSON.stringify(V.vetCua(4).map(v => `${v.truong}:${v.gia_tri_cu}→${v.gia_tri_moi}`)));
  const cau = (await V.lichSu('SEP', 'muc_tieu', 4)).than.ds.find(d => d.truong === 'cap')?.cau;
  ok('  → câu đọc được bằng TIẾNG VIỆT, không phải "đổi cap cong_ty → ca_nhan"',
     /đổi cấp mục tiêu Công ty → Cá nhân — lý do:/.test(cau || ''), cau);

  // Chuẩn hoá cặp cấp+phòng ban: hạ khỏi phòng ban thì nhãn phòng phải xoá.
  const V2 = await dungVong(path.join(GOC, 'src'));
  await V2.suaMT('SEP', { id: 1, cap: 'ca_nhan', ly_do: 'chuyển thành mục tiêu cá nhân của tôi' });
  ok('hạ phòng ban → cá nhân thì nhãn phòng ban tự xoá (không treo lơ lửng)',
     V2.mt(1).bo_phan === null, String(V2.mt(1).bo_phan));
  ok('nâng cá nhân → phòng ban mà KHÔNG ghi tên phòng → CHẶN (không đẻ mục tiêu vô chủ)',
     (await V2.suaMT('SEP', { id: 1, cap: 'phong_ban', ly_do: 'trả lại cho phòng kho vận' })).status === 400);
}

/* ---------------------------------------------------------------------------
   ⑦ NHÓM ④ — KHOÁ, VÀ LỐI RA "MỞ LẠI"
   ---------------------------------------------------------------------------
   Khoá cứng KHÔNG lối ra thì một cú bấm nhầm nút "Xong" (nút đó không có
   bước xác nhận nào) đóng băng vĩnh viễn cả mục tiêu quý — đó là CẮT QUÁ TAY,
   không phải an toàn. Nên có đúng một nước: mở lại, kèm lý do, có vết.
   ------------------------------------------------------------------------ */
console.log('\n=== ⑦ MỤC TIÊU ĐÃ ĐÓNG SỔ — khoá nội dung, còn đúng 1 lối ra ===\n');
{
  const V = await dungVong(path.join(GOC, 'src'));   // mục tiêu #3 đang `hoan_thanh`
  ok('sửa tên mục tiêu đã hoàn thành → CHẶN',
     (await V.suaMT('SEP', { id: 3, tieu_de: 'sửa lại tên sau khi đã báo cáo' })).status === 409);
  ok('đổi quý mục tiêu đã hoàn thành → CHẶN',
     (await V.suaMT('SEP', { id: 3, quy: 4, ly_do: 'xin chuyển sang quý 4' })).status === 409);
  ok('đổi thẳng hoàn thành → huỷ → CHẶN (phải mở lại trước)',
     (await V.suaMT('SEP', { id: 3, trang_thai: 'huy' })).status === 409);
  ok('MỞ LẠI mà không ghi lý do → CHẶN',
     (await V.suaMT('SEP', { id: 3, trang_thai: 'dang_thuc_hien' })).status === 400);

  V.xoaTin();
  const r = await V.suaMT('SEP', { id: 3, trang_thai: 'dang_thuc_hien', ly_do: 'nghiệm thu nhầm, việc con chưa xong hết' });
  ok('MỞ LẠI có lý do → CHO', r.status === 200, `HTTP ${r.status}`);
  ok('  → có ghi vết KÈM lý do', V.vetCua(3).some(v => v.truong === 'trang_thai' && /nghiệm thu nhầm/.test(v.ly_do || '')));
  ok('  → người đặt mục tiêu (DUY) được báo', V.tinCua('DUY').length === 1);
  ok('  → mở lại rồi thì sửa nội dung được bình thường',
     (await V.suaMT('SEP', { id: 3, tieu_de: 'Mục tiêu đã mở lại' })).status === 200);
  ok('  → và sửa tên sau khi mở lại KHÔNG bị đòi lý do (không cắt quá tay)',
     V.vetCua(3).find(v => v.truong === 'tieu_de')?.ly_do == null);
}

/* ---------------------------------------------------------------------------
   ⑧ SỐ DÒNG GHI D1 — hạn mức ghi (REV-0031)
   ------------------------------------------------------------------------ */
console.log('\n=== ⑧ SỐ DÒNG GHI MỖI LẦN SỬA ===\n');
{
  const V = await dungVong(path.join(GOC, 'src'));
  const r1 = await V.suaMT('SEP', { id: 5, tieu_de: 'Sửa mỗi lỗi chính tả' });
  ok('sửa MỖI tiêu đề = ĐÚNG 2 dòng ghi (1 UPDATE + 1 vết), 0 thông báo',
     r1.than.so_dong_ghi === 2, `${r1.than.so_dong_ghi} dòng`);
  const r2 = await V.suaMT('SEP', { id: 5, tieu_de: 'Sửa nhiều thứ một lượt', mo_ta: 'mô tả mới', quy: 4, ly_do: 'gộp một lượt cho gọn' });
  ok('sửa 3 trường một lượt = ĐÚNG 4 dòng (1 UPDATE + 3 vết), không phải 3 lượt batch',
     r2.than.so_dong_ghi === 4, `${r2.than.so_dong_ghi} dòng`);
  ok('gửi cả 7 trường nhưng chỉ 1 cái đổi → vẫn ĐÚNG 2 dòng (không đẻ vết "A → A")',
     (await V.suaMT('SEP', {
       id: 5, tieu_de: 'Sửa nhiều thứ một lượt', mo_ta: 'mô tả mới', cap: 'phong_ban',
       bo_phan: 'Kho vận', nam: 2026, quy: 4, trang_thai: 'huy'
     })).than.so_dong_ghi === 2);
}

/* ---------------------------------------------------------------------------
   ⑨ MÃ MỚI TRÊN CSDL CŨ (REV-0037 · L2)
   ---------------------------------------------------------------------------
   `deploy.yml` tự deploy khi đẩy `main` và KHÔNG chạy migration. Luật phân
   biệt: sửa tên/mô tả là TÍNH NĂNG ĐANG CHẠY, phải sống. Đổi cấp/kỳ là TÍNH
   NĂNG MỚI, được phép chưa dùng được — nhưng phải hỏng theo CHIỀU AN TOÀN:
   không sửa gì cả, chứ KHÔNG PHẢI sửa mà mất lý do.
   ------------------------------------------------------------------------ */
console.log('\n=== ⑨ CSDL ĐỜI CŨ (chưa nạp them-ly-do-sua.sql) ===\n');
const LUI_CSDL = (db) => {
  db.exec('DROP TRIGGER IF EXISTS trg_doi_cam_ket_phai_co_ly_do');
  db.exec('ALTER TABLE lich_su_thay_doi_nen DROP COLUMN ly_do');
};
{
  const V = await dungVong(path.join(GOC, 'src'), LUI_CSDL);
  const coCot = V.db.prepare("SELECT COUNT(*) n FROM pragma_table_info('lich_su_thay_doi_nen') WHERE name='ly_do'").all()[0].n;
  ok('bàn đo đã lùi thật: cột `ly_do` KHÔNG còn', coCot === 0, `${coCot} cột`);

  const r = await V.suaMT('SEP', { id: 1, tieu_de: 'Sửa tên trên CSDL cũ' });
  ok('⚠️ sửa tên/mô tả (ĐANG CHẠY từ 28976b6) → vẫn 200, KHÔNG nổ 500', r.status === 200, `HTTP ${r.status}`);
  ok('  → và vẫn ghi được vết (mất cột lý do chứ không mất sổ)', V.soVet(1) === 1, `${V.soVet(1)} vết`);
  ok('sửa bo_phan (nhóm ②, cũng không cần lý do) → vẫn 200',
     (await V.suaMT('SEP', { id: 1, bo_phan: 'Vận hành sàn' })).status === 200);

  const r2 = await V.suaMT('SEP', { id: 1, quy: 4, ly_do: 'chuyển sang quý 4' });
  ok('đổi kỳ (TÍNH NĂNG MỚI) → hỏng theo chiều AN TOÀN: không 200', r2.status !== 200, `HTTP ${r2.status}`);
  ok('  → và nói RÕ phải nạp migration nào, không để người dùng đoán',
     /them-ly-do-sua/.test(r2.than?.loi || ''), r2.than?.loi);
  ok('  → quý KHÔNG bị đổi nửa vời (UPDATE lùi cùng batch)', V.mt(1).quy === 3, `quý ${V.mt(1).quy}`);
}

/* ---------------------------------------------------------------------------
   CA ĐỐI CHỨNG (BH-16) — bẻ gãy đúng một chỗ, kết quả BẮT BUỘC phải khác
   ------------------------------------------------------------------------ */
console.log('\n' + '='.repeat(72));
console.log('CA ĐỐI CHỨNG — mỗi ca bẻ gãy ĐÚNG MỘT CHỖ');
console.log('='.repeat(72));

/* DC-A — bỏ cửa lý do khi đổi cấp/kỳ. Phải thấy đổi kỳ báo cáo lọt qua
   KHÔNG một dòng lý do nào. */
console.log('\n--- DC-A · bỏ cửa lý do khi đổi cấp/kỳ ---\n');
{
  const src = banBeGay('dc-a', s => s.replace(
    "const MT_CAN_LY_DO = new Set(['cap', 'nam', 'quy']);",
    'const MT_CAN_LY_DO = new Set([]);'));
  const V = await dungVong(src);
  const r = await V.suaMT('SEP', { id: 1, quy: 4 });
  ok('BẢN GÃY: đổi quý KHÔNG lý do vẫn lọt', r.status === 200, `HTTP ${r.status}`);
  ok('  → và sổ ghi vết TRỐNG lý do — đúng thứ bản thật phải chặn',
     V.vetCua(1).find(v => v.truong === 'quy')?.ly_do == null);
  const T = await dungVong(path.join(GOC, 'src'));
  ok('BẢN THẬT: chặn (400)', (await T.suaMT('SEP', { id: 1, quy: 4 })).status === 400);
}

/* DC-B — ⚠️ CA CẮT QUÁ TAY, ca bắt buộc theo yêu cầu của Sếp.
   Bắt lý do cho CẢ `tieu_de`: sửa một lỗi chính tả cũng bị tra hỏi. Phép đo
   phải BẮT ĐƯỢC ca này — nếu không thì nó mù một chiều, chỉ thấy "lỏng quá"
   mà không thấy "chặt quá", và chặt quá chính là thứ đẩy người ta quay lại
   thói xoá đi tạo lại (mất sạch lịch sử). */
console.log('\n--- DC-B · ⚠️ CẮT QUÁ TAY: bắt lý do cho cả sửa chính tả ---\n');
{
  const src = banBeGay('dc-b', s => s.replace(
    "const MT_CAN_LY_DO = new Set(['cap', 'nam', 'quy']);",
    "const MT_CAN_LY_DO = new Set(['cap', 'nam', 'quy', 'tieu_de', 'mo_ta']);"));
  const V = await dungVong(src);
  const r = await V.suaMT('SEP', { id: 1, tieu_de: 'Giảm sai sót đóng gói (sửa chính tả)' });
  ok('⚠️ BẢN GÃY: sửa MỖI lỗi chính tả cũng bị đòi lý do → phép đo BẮT ĐƯỢC',
     r.status === 400, `HTTP ${r.status}`);
  ok('  → tên KHÔNG sửa được, người dùng bị đẩy về thói xoá-đi-tạo-lại',
     V.mt(1).tieu_de === 'Giảm sai sót đóng gói', V.mt(1).tieu_de);
  const T = await dungVong(path.join(GOC, 'src'));
  ok('BẢN THẬT: sửa chính tả đi lọt, KHÔNG câu hỏi nào',
     (await T.suaMT('SEP', { id: 1, tieu_de: 'Giảm sai sót đóng gói (sửa chính tả)' })).status === 200);
  ok('  → và vết đó KHÔNG có lý do đính kèm (sổ sạch, không rác)',
     T.vetCua(1).find(v => v.truong === 'tieu_de')?.ly_do == null);
}

/* DC-C — bỏ chốt Admin khi nâng lên `cong_ty`: cửa SỬA thành đường vòng lách
   đúng cái chốt mà `mtTao` đang giữ. */
console.log('\n--- DC-C · bỏ chốt Admin khi nâng lên cấp công ty ---\n');
{
  /* `src/index.js` xuống dòng kiểu CRLF — neo nhiều dòng bằng '\n' sẽ KHÔNG
     khớp và ca đối chứng lặng lẽ thành vô nghĩa. Neo trong MỘT dòng cho chắc
     (`banBeGay` cũng ném lỗi nếu không bẻ được gì — hai lớp cho một luật). */
  const src = banBeGay('dc-c', s => s.replace(
    "capMoi === 'cong_ty' && !laAdmin(phien.vai_tro)", 'false'));
  const V = await dungVong(src);
  const r = await V.suaMT('DUY', { id: 1, cap: 'cong_ty', ly_do: 'tôi tự nâng lên cấp công ty' });
  ok('BẢN GÃY: người thường tự phong mục tiêu cấp CÔNG TY', r.status === 200, `HTTP ${r.status}`);
  ok('  → và nó hiện ở khối Công ty cho cả nhà cùng xem',
     ((await V.dsMT('AN', 2026, 3)).than.cong_ty || []).some(m => m.id === 1));
  const T = await dungVong(path.join(GOC, 'src'));
  ok('BẢN THẬT: chặn (403)',
     (await T.suaMT('DUY', { id: 1, cap: 'cong_ty', ly_do: 'tôi tự nâng lên cấp công ty' })).status === 403);
}

/* DC-D — bỏ báo người đặt mục tiêu: đổi kỳ báo cáo sau lưng chủ mục tiêu. */
console.log('\n--- DC-D · bỏ báo người đặt mục tiêu ---\n');
{
  const src = banBeGay('dc-d', s => s.replace(
    "const MT_BAO_NGUOI_TAO = new Set(['cap', 'bo_phan', 'nam', 'quy', 'trang_thai']);",
    'const MT_BAO_NGUOI_TAO = new Set([]);'));
  const V = await dungVong(src);
  await V.suaMT('SEP', { id: 1, quy: 4, ly_do: 'chuyển cam kết sang quý 4' });
  ok('BẢN GÃY: người đặt mục tiêu KHÔNG nhận tin nào — kỳ đổi sau lưng',
     V.tinCua('DUY').length === 0, `${V.tinCua('DUY').length} tin`);
  const T = await dungVong(path.join(GOC, 'src'));
  await T.suaMT('SEP', { id: 1, quy: 4, ly_do: 'chuyển cam kết sang quý 4' });
  ok('BẢN THẬT: nhận ĐÚNG 1 tin', T.tinCua('DUY').length === 1);
}

/* DC-E — cho quản lý đổi `cap`: quản lý hạ mục tiêu của cấp dưới xuống cá
   nhân là GIẤU nó khỏi cả công ty mà chủ mục tiêu không đổi được gì. */
console.log('\n--- DC-E · cho quản lý đổi cấp (giấu mục tiêu của cấp dưới) ---\n');
{
  const src = banBeGay('dc-e', s => s.replace('if (!laChu) {', 'if (false) {'));
  const V = await dungVong(src);
  // DUY là quản lý của AN; dựng một mục tiêu do AN đặt để DUY thử hạ cấp.
  V.db.prepare(`INSERT INTO muc_tieu (id, cap, bo_phan, tieu_de, nam, quy, nguoi_tao_id,
      nguoi_tao_ten, trang_thai, da_chot, tao_luc)
    VALUES (9,'phong_ban','Kho vận','Mục tiêu của AN',2026,3,'AN','Nguyễn Văn An','dang_thuc_hien',0,'2026-08-20 09:00:00')`).run();
  const r = await V.suaMT('DUY', { id: 9, cap: 'ca_nhan', ly_do: 'tôi hạ xuống cá nhân cho gọn bảng' });
  ok('BẢN GÃY: quản lý hạ cấp mục tiêu của cấp dưới → lọt', r.status === 200, `HTTP ${r.status}`);
  /* HẠI Ở ĐÂU — đo cho đúng chỗ, đừng đoán. Người ĐẶT (AN) VẪN thấy nó (cấp
     `ca_nhan` hiện cho chính người tạo), nên NHÌN TỪ GHẾ AN KHÔNG CÓ GÌ LẠ —
     đó mới là phần khó chịu. Cái mất là ở NGƯỜI KHÁC: cả công ty vừa mất
     tầm nhìn vào một mục tiêu phòng ban mà không ai được báo. */
  const dsAn = (await V.dsMT('AN', 2026, 3)).than;
  const dsHang = (await V.dsMT('HANG', 2026, 3)).than;
  ok('  → người ĐẶT (AN) vẫn thấy nó → không có dấu hiệu gì bất thường từ ghế của AN',
     (dsAn.ca_nhan || []).some(m => m.id === 9));
  ok('  ⚠️ nhưng CẢ CÔNG TY (HANG) mất sạch tầm nhìn vào mục tiêu phòng ban đó',
     !(dsHang.phong_ban || []).some(m => m.id === 9) &&
     !(dsHang.ca_nhan || []).some(m => m.id === 9));

  const T = await dungVong(path.join(GOC, 'src'));
  T.db.prepare(`INSERT INTO muc_tieu (id, cap, bo_phan, tieu_de, nam, quy, nguoi_tao_id,
      nguoi_tao_ten, trang_thai, da_chot, tao_luc)
    VALUES (9,'phong_ban','Kho vận','Mục tiêu của AN',2026,3,'AN','Nguyễn Văn An','dang_thuc_hien',0,'2026-08-20 09:00:00')`).run();
  ok('BẢN THẬT: chặn (403)',
     (await T.suaMT('DUY', { id: 9, cap: 'ca_nhan', ly_do: 'tôi hạ xuống cá nhân cho gọn bảng' })).status === 403);
  ok('  → nhưng quản lý VẪN sửa được tên/kỳ (không cắt quá tay chiều kia)',
     (await T.suaMT('DUY', { id: 9, tieu_de: 'Mục tiêu của AN (Duy sửa chính tả)' })).status === 200);
}

rmSync(TAM, { recursive: true, force: true });
process.exit(tongKet() ? 0 : 1);
