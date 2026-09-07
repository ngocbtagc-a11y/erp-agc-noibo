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

   ĐO GÌ — PHẦN B
     B1  GÕ THẬT 8 chữ số vào ô ngày sinh: giữ được tiêu điểm suốt và ra
         đúng 1990-01-01 (đây chính là ca Sếp báo)
     B2  DÁN thật "25/01/1990" → 1990-01-25
     B3  CẢ LỚP: mọi `input[type=date]` đều có min/max — đếm và nêu số
     B4  ngưỡng ngón tay 44px cho ô ngày và nút Nhận xét
     B5  nút "Nhận xét" có mặt ở CẢ HAI phía (người giao VÀ người nhận), và
         hộp mở ra thật
     B6  không tràn ngang ở 375px khi hộp nhận xét mở

   CA ĐỐI CHỨNG (BH-16) — bẻ ĐÚNG MỘT chỗ, nói TRƯỚC phép kiểm nào phải đỏ:
     DC-A  trả `o.disabled = true` về ô ngày sinh   → B1 mất tiêu điểm
     DC-B  gỡ `theoDoiONgay()`                      → B2/B3 mất dán + mất min/max
     DC-C  gỡ nhánh `nhan_xet` khỏi `cauSuaDoc`     → A4 câu sổ đọc không hiểu
     DC-D  bỏ chặn quyền trong `cvNhanXet`          → A1 người ngoài nhận xét được
     DC-E  gỡ nút Nhận xét ở phía NGƯỜI NHẬN        → B5 người bị nhận xét mù
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
  const lichSu = (ai, id) => goiAPI(worker, env, `/api/sua/lich-su?bang=cong_viec&id=${id}`, phien[ai]);
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

const NHAN_XET_DA_GUI = [];
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
  if (duong === '/api/cong-viec/danh-sach') { traJson({ nhan: [VIEC_TOI], giao: [VIEC_GIAO] }); return true; }
  if (duong === '/api/cong-viec/hom-nay') {
    traJson({ nhac_tat: 0, toi: { qua_han: [], den_han_hom_nay: [], chua_bat_dau: [], cho_toi_duyet: [] },
              dong_viec: [], ghi_nhan: [] });
    return true;
  }
  if (duong === '/api/cong-viec/nhan-xet') { NHAN_XET_DA_GUI.push(1); traJson({ ok: true, id: 1 }); return true; }
  if (duong === '/api/sua/lich-su') {
    traJson({ ds: [{ truong: 'nhan_xet', gia_tri_cu: null, gia_tri_moi: 'Chỗ làm tốt: gửi đúng hạn',
                     nguoi_ten: 'Phạm Khương Duy', luc: '2026-09-05 10:00:00',
                     cau: 'Phạm Khương Duy nhận xét: "Chỗ làm tốt: gửi đúng hạn"' }], cat: null });
    return true;
  }
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
    await c.chay(`document.querySelector('[data-tab="nhansu"]')?.click(); true`);
    await c.doi(800);
    await c.chay(`document.querySelector('[data-sua-ns]').click(); true`);
    await c.doi(800);
    await c.chay(`(()=>{const o=document.getElementById('nsSua-ngaysinh');o.value='';o.scrollIntoView();o.focus();return true})()`);
    const buoc = [];
    for (const ch of '01011990') {
      await goSo(c, ch);
      buoc.push(await c.chay(`(()=>{const o=document.getElementById('nsSua-ngaysinh');
        return {v:o.value, dis:o.disabled, tieuDiem:document.activeElement===o};})()`));
    }
    kq.b1_giu_tieu_diem = buoc.every(b => b.tieuDiem && !b.dis);
    kq.b1_gia_tri = buoc[buoc.length - 1].v;
    kq.b1_buoc = buoc;

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

    kq.loi_console = c.loiConsole.slice();
    kq.ngoai_le = c.ngoaiLe.slice();
  } finally {
    c.dong(); may.dong();
  }
  return kq;
}

console.log(`\n=== B · TRÌNH DUYỆT THẬT @${RONG}px — ô ngày + nút nhận xét ===\n`);
const B = await doTrinhDuyet();

ok('B1 · GÕ 8 chữ số vào ô NGÀY SINH: giữ tiêu điểm suốt, KHÔNG bị khoá giữa chừng',
   B.b1_giu_tieu_diem, JSON.stringify(B.b1_buoc));
ok('B1 · gõ xong ra ĐÚNG 1990-01-01 (trước bản vá: kẹt ở 0001-01-01)',
   B.b1_gia_tri === '1990-01-01', `value = ${B.b1_gia_tri}`);
ok('B2 · DÁN "25/01/1990" → 1990-01-25', B.b2_dan === '1990-01-25', `value = ${B.b2_dan}`);
ok('B2 · DÁN "1990-01-25" (kiểu ISO) cũng ăn', B.b2_dan_iso === '1990-01-25', `value = ${B.b2_dan_iso}`);
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

rmSync(TAM, { recursive: true, force: true });
console.log('');
process.exit(tongKet() ? 0 : 1);
