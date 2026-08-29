/* ==========================================================================
   BÀN ĐO — CTL-0017 · SỬA THỨ ĐÃ TẠO RA
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-sua-viec-da-giao.mjs
   0 phút GitHub Actions, 0 token, không chạm mạng, không chạm D1 thật.

   Dựng SQLite THẬT trong bộ nhớ (`ban-thu-d1.mjs`), nạp `schema.sql` + TOÀN
   BỘ `migrations/`, rồi gọi `worker.fetch()` NGUYÊN BẢN qua router. Mọi con
   số dưới đây đọc từ JSON THẬT trả về, không nhìn màn hình, không khớp chuỗi
   SQL bằng tay (BH-34).

   ĐO GÌ
     ① MA TRẬN VAI × LOẠI SỬA — ai sửa được gì, cắt ở MÁY CHỦ (gọi thẳng API).
     ② MA TRẬN BƯỚC × TRƯỜNG — sửa được tới bước nào.
     ③ ĐỔI HẠN CHÓT — lịch sử phải có ĐỦ 4 THỨ: cũ · mới · ai · lý do.
        Thiếu lý do thì TỪ CHỐI. Đây là chỗ nguy hiểm nhất cả đợt: ERP vừa
        lên nhắc việc quá hạn (SPEC-0004), cho dời hạn không dấu vết thì ai
        cũng dời hạn để khỏi bị nhắc và mọi số "đúng hạn" thành vô nghĩa.
     ④ NGƯỜI GIAO PHẢI THẤY — quản lý dời hạn thì người giao được báo.
     ⑤ SỐ DÒNG GHI D1 mỗi lần sửa (hạn mức ghi vừa vá hôm nay — REV-0031).
     ⑥ MỤC TIÊU — sửa được và có ghi vết (trước bản này: sửa được, KHÔNG vết).

   CA ĐỐI CHỨNG CỐ Ý SAI (BH-16/BH-26) — mỗi ca là một bản `src` bị bẻ gãy ở
   ĐÚNG MỘT CHỖ, và phải nói được TRƯỚC vì sao kết quả BẮT BUỘC phải khác:
     DC-A  bỏ cửa lý do khi đổi hạn chót     → dời hạn lén trở lại 200
     DC-B  ⚠️ CẮT QUÁ TAY: khoá cả tiêu đề   → người tạo không sửa nổi chính tả
     DC-C  cho người NHẬN tự sửa hạn chót    → tự gia hạn thoát nhắc quá hạn
     DC-D  bỏ báo người giao khi quản lý sửa → đổi cam kết sau lưng người giao
     DC-E  chốt CSDL (trigger) có thật không → chèn thẳng SQL, phải bị ABORT
     DC-F  cho quản lý sửa `dau_ra`          → hạ chuẩn nghiệm thu cho lính mình

   DC-B là ca bắt buộc theo yêu cầu của Sếp: khoá chặt tới mức NGƯỜI TẠO
   không sửa nổi một lỗi chính tả cũng là HỎNG, không phải "an toàn". Phép
   kiểm phải bắt được cả hai chiều — lỏng quá VÀ chặt quá.
   ========================================================================== */

import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = path.join(GOC, '.tam-do-sua');

datDongHo('2026-08-29T03:00:00Z');          // 10:00 giờ VN

/* ---- Mồi dữ liệu --------------------------------------------------------
   Đúng sơ đồ báo cáo Sếp Ngọc đã chốt cho kho: AN -> DUY -> SEP.
   HANG ở phòng khác, không dính dây nào tới việc của AN — dùng để đo
   "người ngoài không sửa được". */
const NGUOI = [
  // id      họ tên              bộ phận         quản lý  vai trò
  ['SEP',   'Bùi Thị Ngọc',     'Ban giám đốc',  null,   'admin'],
  ['DUY',   'Phạm Khương Duy',  'Kho vận',       'SEP',  'quan_ly_kho'],
  ['AN',    'Nguyễn Văn An',    'Kho vận',       'DUY',  'nhan_vien_kho'],
  ['HUONG', 'Vũ Lan Hương',     'Hành chính',    'SEP',  'hcns'],
  ['HANG',  'Phan Thị Hằng',    'Kế toán',       'SEP',  'ke_toan_truong']
];

/* Một việc cho MỖI bước, để đo ma trận bước × trường mà không phải đẩy
   trạng thái qua lại (đẩy qua lại là mời trạng thái rò từ ca này sang ca kia
   — đúng cái bẫy BH-17 đã cắn một lần). */
const VIEC = [
  // id  trạng thái     tiêu đề
  [1, 'moi',        'Bàn giao Con Dấu'],
  [2, 'dang_lam',   'Công việc gọi VPP'],
  [3, 'cho_duyet',  'Bảng lương tháng 8'],
  [4, 'hoan_thanh', 'Kiểm kê hàng nhập khẩu'],
  [5, 'huy',        'Đối soát Shopee tháng 7']
];

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
    VALUES (1,'phong_ban','Kho vận','Giảm sai sót đóng gói','ban đầu',2026,3,'SEP','Bùi Thị Ngọc','dang_thuc_hien',0,'2026-08-20 09:00:00'),
           (2,'cong_ty',NULL,'Doanh số 90 tỷ',NULL,2026,3,'SEP','Bùi Thị Ngọc','dang_thuc_hien',1,'2026-08-20 09:00:00')`).run();

  // SEP giao cho AN. Đầu ra là cam kết MBOs; hạn chót 30/08 để đo dời hạn.
  const cv = db.prepare(`INSERT INTO cong_viec
    (id, tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten,
     han_chot, trang_thai, muc_tieu_id, tao_luc)
    VALUES (?,?,?,?,'SEP','Bùi Thị Ngọc','AN','Nguyễn Văn An','2026-08-30',?,1,'2026-08-25 09:00:00')`);
  VIEC.forEach(([id, tt, td]) => cv.run(id, td, 'Bàn giao xong, có biên bản ký', 'mô tả gốc', tt));

  // Todo cá nhân: HUONG tự giao cho mình — phải sửa được thoải mái.
  db.prepare(`INSERT INTO cong_viec
    (id, tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten,
     han_chot, trang_thai, tao_luc)
    VALUES (9,'Gọi NCC chè','','HUONG','Vũ Lan Hương','HUONG','Vũ Lan Hương','2026-08-30','moi','2026-08-25 09:00:00')`).run();
}

/* ---- Một vòng đo trên MỘT bản src --------------------------------------- */
async function dungVong(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;
  const phien = {};
  for (let i = 0; i < NGUOI.length; i++) phien[NGUOI[i][0]] = await taoPhienThat(env, i + 1);

  const sua = (ai, than) => goiAPI(worker, env, '/api/cong-viec/sua', phien[ai],
    { method: 'POST', body: JSON.stringify(than) });
  const suaMT = (ai, than) => goiAPI(worker, env, '/api/muc-tieu/cap-nhat', phien[ai],
    { method: 'POST', body: JSON.stringify(than) });
  const lichSu = (ai, bang, id) => goiAPI(worker, env, `/api/sua/lich-su?bang=${bang}&id=${id}`, phien[ai]);
  const tinCua = (who) => db.prepare(
    "SELECT noi_dung FROM thong_bao WHERE nguoi_nhan_id = ? AND loai = 'cong_viec_sua'").all(who).map(r => r.noi_dung);
  const viec = (id) => db.prepare('SELECT * FROM cong_viec WHERE id = ?').all(id)[0];
  const soVet = (bang, id) => db.prepare(
    'SELECT COUNT(*) n FROM lich_su_thay_doi_nen WHERE bang = ? AND ban_ghi_id = ?').all(bang, String(id))[0].n;
  return { db, env, sua, suaMT, lichSu, tinCua, viec, soVet };
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
console.log('CTL-0017 — BÀN ĐO SỬA THỨ ĐÃ TẠO RA');
console.log('='.repeat(72));

const T = await dungVong(path.join(GOC, 'src'));

/* ---------------------------------------------------------------------------
   ① MA TRẬN VAI × LOẠI SỬA  (việc #1, bước `moi`)
   ------------------------------------------------------------------------ */
console.log('\n=== ① AI ĐƯỢC SỬA GÌ — cắt ở MÁY CHỦ, gọi thẳng API ===\n');
{
  const r = await T.sua('SEP', { id: 1, tieu_de: 'Bàn giao Con Dấu (đã sửa chính tả)' });
  ok('người GIAO sửa tên việc', r.status === 200, `HTTP ${r.status}`);
  ok('  → tên đã đổi thật trong CSDL', T.viec(1).tieu_de.includes('đã sửa chính tả'));
}
{
  const r = await T.sua('AN', { id: 1, tieu_de: 'AN tự đổi tên' });
  ok('người NHẬN sửa tên việc → CHẶN', r.status === 403, `HTTP ${r.status}`);
}
{
  const r = await T.sua('AN', { id: 1, han_chot: '2026-09-30', ly_do: 'em xin dời hạn cho thoải mái' });
  ok('⚠️ người NHẬN tự dời hạn chót → CHẶN', r.status === 403, `HTTP ${r.status}`);
  ok('  → hạn chót KHÔNG hề đổi', T.viec(1).han_chot === '2026-08-30', T.viec(1).han_chot);
}
{
  const r = await T.sua('AN', { id: 1, dau_ra: 'chỉ cần bàn giao miệng là được' });
  ok('người NHẬN tự hạ đầu ra → CHẶN', r.status === 403, `HTTP ${r.status}`);
}
{
  const r = await T.sua('HANG', { id: 1, tieu_de: 'người ngoài đổi' });
  ok('người NGOÀI (khác phòng, không dính dây) → CHẶN', r.status === 403, `HTTP ${r.status}`);
}
{
  const r = await T.sua('DUY', { id: 1, dau_ra: 'bàn giao miệng cũng được' });
  ok('QUẢN LÝ sửa đầu ra → CHẶN (không hạ chuẩn nghiệm thu thay người giao)',
     r.status === 403, `HTTP ${r.status}`);
}
{
  const r = await T.sua('DUY', { id: 1, han_chot: '2026-09-05', ly_do: 'chờ NCC gửi báo giá' });
  ok('QUẢN LÝ dời hạn chót (có lý do) → CHO', r.status === 200, `HTTP ${r.status}`);
  ok('  → hạn chót đã đổi thật', T.viec(1).han_chot === '2026-09-05', T.viec(1).han_chot);
}
{
  const r = await T.sua('HUONG', { id: 9, tieu_de: 'Gọi NCC chè Thái Nguyên', han_chot: '2026-09-10',
                                   ly_do: 'dời sang tuần sau cho gọn' });
  ok('TODO CÁ NHÂN — tự sửa todo của mình → CHO', r.status === 200, `HTTP ${r.status}`);
}

/* ---------------------------------------------------------------------------
   ② MA TRẬN BƯỚC × TRƯỜNG
   ------------------------------------------------------------------------ */
console.log('\n=== ② SỬA ĐƯỢC TỚI BƯỚC NÀO ===\n');
{
  const r = await T.sua('SEP', { id: 2, dau_ra: 'gọi VPP xong, có báo giá' });
  ok('`dang_lam` — người giao sửa đầu ra → CHO (kèm ghi vết + báo người nhận)',
     r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await T.sua('SEP', { id: 3, tieu_de: 'Bảng lương tháng 08' });
  ok('`cho_duyet` — sửa CHÍNH TẢ tiêu đề → CHO (không phải bằng chứng)',
     r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await T.sua('SEP', { id: 3, dau_ra: 'chỉ cần bảng nháp' });
  ok('`cho_duyet` — sửa ĐẦU RA → CHẶN (đổi thước sau khi đã đo)',
     r.status === 409, `HTTP ${r.status}`);
}
{
  const r = await T.sua('SEP', { id: 3, han_chot: '2026-09-20', ly_do: 'dời cho dễ thở' });
  ok('`cho_duyet` — dời HẠN CHÓT → CHẶN', r.status === 409, `HTTP ${r.status}`);
}
{
  const r = await T.sua('SEP', { id: 4, tieu_de: 'sửa việc đã xong' });
  ok('`hoan_thanh` — khoá hẳn (bản ghi là bằng chứng)', r.status === 409, `HTTP ${r.status}`);
}
{
  const r = await T.sua('SEP', { id: 5, tieu_de: 'sửa việc đã huỷ' });
  ok('`huy` — khoá hẳn', r.status === 409, `HTTP ${r.status}`);
}

/* ---------------------------------------------------------------------------
   ③ ĐỔI HẠN CHÓT — CHỖ NGUY HIỂM NHẤT
   ------------------------------------------------------------------------ */
console.log('\n=== ③ ĐỔI HẠN CHÓT — lịch sử phải đủ 4 THỨ (cũ · mới · ai · lý do) ===\n');
{
  const r = await T.sua('SEP', { id: 2, han_chot: '2026-09-15' });
  ok('dời hạn KHÔNG lý do → TỪ CHỐI', r.status === 400, `HTTP ${r.status}`);
  ok('  → thông báo lỗi nói rõ vì sao',
     /lý do/i.test(r.than?.loi || r.than?.error || JSON.stringify(r.than)), JSON.stringify(r.than));
}
{
  const r = await T.sua('SEP', { id: 2, han_chot: '2026-09-15', ly_do: 'ok' });
  ok('dời hạn với lý do cho-có ("ok", 2 ký tự) → TỪ CHỐI', r.status === 400, `HTTP ${r.status}`);
}
{
  const r = await T.sua('SEP', { id: 2, han_chot: '2026-09-15', ly_do: 'chờ NCC gửi báo giá' });
  ok('dời hạn CÓ lý do đàng hoàng → CHO', r.status === 200, `HTTP ${r.status}`);
}
{
  const r = await T.lichSu('AN', 'cong_viec', 2);
  const d = (r.than?.ds || []).find(x => x.truong === 'han_chot');
  ok('lịch sử có dòng đổi hạn chót', !!d);
  ok('  ① hạn CŨ  có ghi', d?.gia_tri_cu === '2026-08-30', String(d?.gia_tri_cu));
  ok('  ② hạn MỚI có ghi', d?.gia_tri_moi === '2026-09-15', String(d?.gia_tri_moi));
  ok('  ③ AI đổi  có ghi', d?.nguoi_id === 'SEP' && d?.nguoi_ten === 'Bùi Thị Ngọc', String(d?.nguoi_ten));
  ok('  ④ LÝ DO   có ghi', d?.ly_do === 'chờ NCC gửi báo giá', String(d?.ly_do));
  // ĐỌC HIỂU ĐƯỢC, không phải mã máy.
  const mong = 'Bùi Thị Ngọc đổi hạn chót 30/08/2026 → 15/09/2026 — lý do: chờ NCC gửi báo giá';
  ok('câu lịch sử ĐỌC HIỂU ĐƯỢC (ngày kiểu VN, không phải mã máy)', d?.cau === mong, d?.cau);
}
{
  // Sửa chính tả thì KHÔNG dán lý do vào — sổ phải sạch.
  const d = (await T.lichSu('SEP', 'cong_viec', 1)).than.ds.find(x => x.truong === 'tieu_de');
  ok('dòng sửa chính tả KHÔNG bị dán lý do của việc khác', d && d.ly_do == null, String(d?.ly_do));
}

/* ---------------------------------------------------------------------------
   ④ NGƯỜI GIAO PHẢI THẤY + ĐỔI NGƯỜI NHẬN
   ------------------------------------------------------------------------ */
console.log('\n=== ④ BÁO ĐÚNG NGƯỜI — không thoả thuận sau lưng người giao ===\n');
{
  const tinSep = T.tinCua('SEP');
  ok('QUẢN LÝ dời hạn → NGƯỜI GIAO (Sếp) được báo NGAY', tinSep.length >= 1,
     tinSep[0] || '(không có tin nào)');
  ok('  → tin nói rõ hạn cũ, hạn mới VÀ lý do',
     /30\/08\/2026/.test(tinSep[0] || '') && /05\/09\/2026/.test(tinSep[0] || '')
     && /chờ NCC gửi báo giá/.test(tinSep[0] || ''), tinSep[0]);
  ok('  → người NHẬN cũng được báo', T.tinCua('AN').length >= 1);
}
{
  const r = await T.sua('SEP', { id: 1, nguoi_nhan_id: 'HUONG', ly_do: 'An chuyển sang ca đêm' });
  ok('đổi NGƯỜI NHẬN (có lý do) → CHO', r.status === 200, `HTTP ${r.status}`);
  const v = T.viec(1);
  ok('  → cột đọng `nguoi_nhan_ten` cập nhật theo (không lệch id/tên)',
     v.nguoi_nhan_id === 'HUONG' && v.nguoi_nhan_ten === 'Vũ Lan Hương', `${v.nguoi_nhan_id}/${v.nguoi_nhan_ten}`);
  ok('  → người nhận CŨ được báo mình đã hết giữ việc',
     T.tinCua('AN').some(t => /chuyển việc/.test(t)), T.tinCua('AN').join(' | '));
  ok('  → người nhận MỚI được báo', T.tinCua('HUONG').length >= 1);
  const d = (await T.lichSu('SEP', 'cong_viec', 1)).than.ds.find(x => x.truong === 'nguoi_nhan_id');
  ok('  → lịch sử ghi TÊN người (đọc được), không phải id thô',
     d?.gia_tri_cu === 'Nguyễn Văn An' && d?.gia_tri_moi === 'Vũ Lan Hương',
     `${d?.gia_tri_cu} → ${d?.gia_tri_moi}`);
}
{
  const r = await T.sua('SEP', { id: 1, nguoi_nhan_id: 'HANG' });
  ok('đổi người nhận KHÔNG lý do → TỪ CHỐI', r.status === 400, `HTTP ${r.status}`);
}

/* ---------------------------------------------------------------------------
   ⑤ SỐ DÒNG GHI D1
   ------------------------------------------------------------------------ */
console.log('\n=== ⑤ SỐ DÒNG GHI D1 MỖI LẦN SỬA (hạn mức vừa vá — REV-0031) ===\n');
{
  const r = await T.sua('SEP', { id: 2, tieu_de: 'Công việc gọi VPP quý 3' });
  ok('sửa 1 lỗi chính tả = ĐÚNG 2 dòng ghi (1 UPDATE + 1 vết), 0 thông báo',
     r.than?.so_dong_ghi === 2, `${r.than?.so_dong_ghi} dòng`);
}
{
  const r = await T.sua('SEP', { id: 2, tieu_de: 'Gọi VPP Q3', mo_ta: 'gọi 3 nhà cung cấp' });
  ok('sửa 2 trường tự do = 3 dòng ghi', r.than?.so_dong_ghi === 3, `${r.than?.so_dong_ghi} dòng`);
}
{
  const r = await T.sua('SEP', { id: 2, tieu_de: 'Gọi VPP Q3' });
  ok('gửi lại y hệt giá trị cũ = 0 dòng ghi (không đẻ vết rác)',
     r.status === 400 && /Không có gì thay đổi/.test(JSON.stringify(r.than)), `HTTP ${r.status}`);
}

/* ---------------------------------------------------------------------------
   ⑥ MỤC TIÊU — sửa được VÀ có ghi vết
   ------------------------------------------------------------------------ */
console.log('\n=== ⑥ MỤC TIÊU — trước bản này: sửa được nhưng KHÔNG ghi vết ===\n');
{
  const r = await T.suaMT('SEP', { id: 1, tieu_de: 'Giảm sai sót đóng gói còn dưới 1%' });
  ok('sửa tiêu đề mục tiêu → CHO', r.status === 200, `HTTP ${r.status}`);
  ok('  → CÓ ghi vết (trước bản này là 0)', T.soVet('muc_tieu', 1) === 1, `${T.soVet('muc_tieu', 1)} vết`);
  const d = (await T.lichSu('SEP', 'muc_tieu', 1)).than.ds[0];
  ok('  → đọc được: cũ → mới, ai đổi',
     d?.gia_tri_cu === 'Giảm sai sót đóng gói' && d?.nguoi_ten === 'Bùi Thị Ngọc', d?.cau);
}
{
  const r = await T.suaMT('SEP', { id: 2, tieu_de: 'Doanh số 100 tỷ' });
  ok('mục tiêu công ty ĐÃ CHỐT → khoá hẳn (đã dùng làm bằng chứng cả quý)',
     r.status === 409, `HTTP ${r.status}`);
}
{
  const r = await T.suaMT('HANG', { id: 1, tieu_de: 'người ngoài đổi mục tiêu' });
  ok('người không phải chủ mục tiêu → CHẶN', r.status === 403, `HTTP ${r.status}`);
}

/* ---------------------------------------------------------------------------
   ⑦ CA ĐỐI CHỨNG (BH-16/BH-26)
   ------------------------------------------------------------------------ */
console.log('\n=== ⑦ CA ĐỐI CHỨNG — mỗi ca bẻ gãy ĐÚNG một chỗ, phải bị bắt ===\n');

/* DC-A — bỏ cửa lý do Ở MÁY CHỦ. Vì sao BẮT BUỘC khác: bản thật trả 400 và
   hạn giữ nguyên. Bản gãy phải ra kết quả KHÁC.
   Kết quả đo được còn tốt hơn dự đoán: nó ra 500 chứ không phải 200 — vì
   TRIGGER Ở CSDL bắt tiếp. Đó chính là bằng chứng LỚP HAI có thật: gỡ luật
   khỏi `src/` thì `lich_su_thay_doi_nen` vẫn không cho ghi dòng dời hạn
   không lý do, và vì UPDATE + ghi vết đi CHUNG một `batch` nên cả lượt bị
   huỷ — HẠN CHÓT KHÔNG ĐỔI. Đây đúng là ca "đường ghi viết sau này quên mất
   luật" mà migration nhắm tới. */
{
  const src = banBeGay('dc-a', s => s.replace(
    'if (canLyDo.length && lyDo.length < 5) {',
    'if (false) {'));
  const V = await dungVong(src);
  const r = await V.sua('SEP', { id: 2, han_chot: '2026-09-15' });
  ok('DC-A · bỏ cửa lý do ở máy chủ → kết quả KHÁC bản thật (400)',
     r.status !== 400, `bản gãy HTTP ${r.status}`);
  ok('DC-A2 · …và CSDL bắt tiếp: hạn chót KHÔNG hề đổi (lớp hai có thật)',
     V.viec(2).han_chot === '2026-08-30', V.viec(2).han_chot);
}

/* DC-A3 — gỡ CẢ HAI lớp (cửa máy chủ + trigger CSDL). Vì sao BẮT BUỘC khác:
   không còn gì chặn nữa thì dời hạn lén phải LỌT HẲN (200) và hạn đổi thật.
   Ca này chứng minh hai ca trên không phải "đạt nhờ may" — bỏ hết thì thủng,
   nên mỗi lớp đang thật sự gánh việc. */
{
  const src = banBeGay('dc-a3', s => s.replace(
    'if (canLyDo.length && lyDo.length < 5) {',
    'if (false) {'));
  const { db, d1 } = dungDB();
  moi(db);
  db.exec('DROP TRIGGER IF EXISTS trg_doi_cam_ket_phai_co_ly_do');
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(src, 'index.js')).href + `?v=${Math.random()}`)).default;
  const tok = await taoPhienThat(env, 1);   // SEP
  const r = await goiAPI(worker, env, '/api/cong-viec/sua', tok,
    { method: 'POST', body: JSON.stringify({ id: 2, han_chot: '2026-09-15' }) });
  const hc = db.prepare('SELECT han_chot FROM cong_viec WHERE id = 2').all()[0].han_chot;
  ok('DC-A3 · gỡ CẢ HAI lớp → dời hạn lén LỌT HẲN', r.status === 200 && hc === '2026-09-15',
     `HTTP ${r.status}, hạn = ${hc}`);
}

/* DC-B — ⚠️ CẮT QUÁ TAY. Vì sao BẮT BUỘC khác: khoá `tieu_de` ở MỌI bước thì
   chính NGƯỜI TẠO cũng không sửa nổi một lỗi chính tả — đúng nỗi đau gốc của
   CTL-0017, chỉ đổi chiều. Chặt quá cũng là HỎNG, không phải "an toàn". */
{
  const src = banBeGay('dc-b', s => s.replace(
    "  moi:        ['tieu_de', 'mo_ta', 'phoi_hop', 'dau_ra', 'muc_tieu_id', 'han_chot', 'nguoi_nhan_id'],",
    "  moi:        ['mo_ta'],"));
  const V = await dungVong(src);
  const r = await V.sua('SEP', { id: 1, tieu_de: 'Bàn giao Con Dấu (sửa chính tả)' });
  ok('DC-B · CẮT QUÁ TAY → người TẠO không sửa nổi chính tả (bản thật cho 200)',
     r.status === 409, `bản gãy HTTP ${r.status}`);
}

/* DC-C — cho người nhận tự sửa. Vì sao BẮT BUỘC khác: AN tự dời hạn của chính
   mình để thoát nhắc quá hạn SPEC-0004 — bản thật trả 403, bản gãy trả 200. */
{
  const src = banBeGay('dc-c', s => s.replace(
    '  if (!laNguoiGiao && !laQuanLy) {',
    '  if (false) {'));
  const V = await dungVong(src);
  const r = await V.sua('AN', { id: 1, han_chot: '2026-12-31', ly_do: 'em bận quá xin dời' });
  ok('DC-C · bỏ chặn vai → người NHẬN tự gia hạn thoát nhắc quá hạn',
     r.status === 200, `bản gãy HTTP ${r.status}`);
}

/* DC-D — bỏ báo người giao. Vì sao BẮT BUỘC khác: quản lý và nhân viên đổi
   cam kết với nhau, người giao KHÔNG có tin nào — đúng cái "thoả thuận sau
   lưng" mà yêu cầu của Sếp bắt phải chặn. */
{
  const src = banBeGay('dc-d', s => s.replace(
    /if \(!laNguoiGiao\) \{\s*\n(\s*)await guiThongBao\(env, null,\s*\n\s*`\$\{nguoiSuaTen\} \(quản lý\)/,
    (m) => m.replace('if (!laNguoiGiao) {', 'if (false) {')));
  const V = await dungVong(src);
  await V.sua('DUY', { id: 1, han_chot: '2026-09-05', ly_do: 'chờ NCC gửi báo giá' });
  ok('DC-D · bỏ báo người giao → Sếp không hề biết cam kết đã đổi',
     V.tinCua('SEP').length === 0, `bản gãy: ${V.tinCua('SEP').length} tin`);
}

/* DC-E — chốt ở CSDL có thật không. Vì sao BẮT BUỘC khác: đây KHÔNG đi qua
   `src/` chút nào — chèn thẳng SQL, đúng kiểu một đường ghi viết sau này sẽ
   vô tình làm. Trigger `trg_doi_cam_ket_phai_co_ly_do` phải ABORT. */
{
  let chan = false, thongDiep = '';
  try {
    T.db.prepare(`INSERT INTO lich_su_thay_doi_nen
      (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten, ly_do, luc)
      VALUES ('cong_viec','2','han_chot','2026-08-30','2027-01-01','AN','Nguyễn Văn An',NULL,'2026-08-29 10:00:00')`).run();
  } catch (e) { chan = true; thongDiep = e.message; }
  ok('DC-E · chèn THẲNG SQL dời hạn không lý do → CSDL tự chặn (trigger)',
     chan, thongDiep || 'LỌT — trigger không chạy');

  let chan2 = false;
  try {
    T.db.prepare(`INSERT INTO lich_su_thay_doi_nen
      (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten, ly_do, luc)
      VALUES ('cong_viec','2','han_chot','2026-08-30','2027-01-01','AN','An',' . ','2026-08-29 10:00:00')`).run();
  } catch { chan2 = true; }
  ok('DC-E2 · lý do cho-có (" . ") cũng bị CSDL chặn', chan2);

  // Chiều ngược: trường TỰ DO không bị trigger làm phiền — chặt quá cũng sai.
  let loanh = true;
  try {
    T.db.prepare(`INSERT INTO lich_su_thay_doi_nen
      (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten, ly_do, luc)
      VALUES ('cong_viec','2','tieu_de','a','b','AN','An',NULL,'2026-08-29 10:00:00')`).run();
  } catch { loanh = false; }
  ok('DC-E3 · sửa TIÊU ĐỀ không lý do vẫn ghi được (trigger không cắt quá tay)', loanh);
}

/* DC-F — cho quản lý sửa đầu ra. Vì sao BẮT BUỘC khác: anh Duy hạ chuẩn
   nghiệm thu cho chính lính của mình — xung đột lợi ích mà MBOs sinh ra để
   chặn. Bản thật 403, bản gãy 200. */
{
  const src = banBeGay('dc-f', s => s.replace(
    "    if (t === 'dau_ra' && !laNguoiGiao) {",
    '    if (false) {'));
  const V = await dungVong(src);
  const r = await V.sua('DUY', { id: 1, dau_ra: 'bàn giao miệng cũng được' });
  ok('DC-F · bỏ chặn đầu ra → quản lý hạ chuẩn nghiệm thu cho lính mình',
     r.status === 200, `bản gãy HTTP ${r.status}`);
}

rmSync(TAM, { recursive: true, force: true });
console.log('');
process.exit(tongKet() ? 0 : 1);
