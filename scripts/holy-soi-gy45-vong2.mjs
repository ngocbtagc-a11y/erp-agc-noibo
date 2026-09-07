/* HỒ LY vòng 2 — hai chỗ vòng 1 chưa đo tới:
   T1 · nhận xét CŨ bị 100 dòng sửa MỚI đè ra khỏi cửa sổ → sổ nhận xét mất câu
   T2 · hộp nhận xét có in dải "đã cắt" như hộp Sửa (`#cv-sua-lichsu-cat`) không
   T3 · câu sai cũ dính lại khi mở hồ sơ NGƯỜI KHÁC                            */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
datDongHo('2026-09-07T03:00:00Z');

/* ---- T1 · MÁY CHỦ ------------------------------------------------------- */
{
  const { db, d1 } = dungDB();
  db.exec('DELETE FROM lich_su_thay_doi_nen; DELETE FROM thong_bao; DELETE FROM cong_viec; DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)').run('SEP', 'Bùi Thị Ngọc', 'BN', 'GĐ', 'BGĐ');
  db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam) VALUES (?,?,?,?,?,?,1)').run('AN', 'Nguyễn Văn An', 'NA', 'NV', 'Kho vận', 'SEP');
  db.prepare('INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk) VALUES (1,?,?,?,?,1,0)').run('SEP', 'tkSEP', 'pbkdf2$1$x$x', 'admin');
  db.prepare(`INSERT INTO cong_viec (id, tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten, han_chot, trang_thai, tao_luc)
    VALUES (1,'Rà soát tồn lô chè','File khớp 100%','SEP','Bùi Thị Ngọc','AN','Nguyễn Văn An','2026-09-10','dang_lam','2026-09-01 09:00:00')`).run();

  /* 3 NHẬN XÉT vào tháng 6 — câu quan trọng nhất của cả năm nằm ở đây. */
  const nx = db.prepare(`INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten, luc)
    VALUES ('cong_viec','1','nhan_xet',NULL,?, 'SEP','Bùi Thị Ngọc', ?)`);
  nx.run('Chỗ cần sửa: lô 12 thiếu số lô — đây là lần thứ ba.', '2026-06-01 09:00:00');
  nx.run('Chỗ làm tốt: gửi trước 17h.', '2026-06-02 09:00:00');
  nx.run('Chỗ cần sửa: vẫn quên số lô.', '2026-06-03 09:00:00');
  /* 110 dòng SỬA VIỆC bình thường, MỚI HƠN — việc chạy dài nhiều tháng. */
  const sua = db.prepare(`INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten, luc)
    VALUES ('cong_viec','1','tieu_de',?,?, 'SEP','Bùi Thị Ngọc', ?)`);
  for (let i = 0; i < 110; i++) sua.run('Tên ' + i, 'Tên ' + (i + 1), '2026-08-01 10:' + String(i % 60).padStart(2, '0') + ':00');

  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(GOC, 'src', 'index.js')).href + '?v=' + Math.random())).default;
  const token = await taoPhienThat(env, 1);
  const r = await goiAPI(worker, env, '/api/sua/lich-su?bang=cong_viec&id=1', token);
  const conNx = (r.than?.ds || []).filter(d => d.truong === 'nhan_xet');
  console.log('\n=== T · NHẬN XÉT CŨ BỊ ĐÈ RA KHỎI CỬA SỔ 100 DÒNG ===\n');
  ok('T1 · 3 nhận xét tháng 6 + 110 lần sửa tháng 8 → sổ nhận xét CÒN mấy câu?',
     conNx.length === 3, `còn ${conNx.length}/3 · API trả ${r.than?.ds?.length} dòng · cat = ${JSON.stringify(r.than?.cat)}`);
}

/* ---- T2 / T3 · TRÌNH DUYỆT ---------------------------------------------- */
let NGUOI_DANG_MO = 'A';
function apiRieng(duong, u, traJson) {
  if (duong === '/api/nhan-su') {
    traJson({ nhan_su: [
      { id: 'A', ho_ten: 'Nguyễn Văn An', viet_tat: 'NA', chuc_vu: 'NV kho', bo_phan: 'Kho vận', dang_lam: 1, quyen: [] },
      { id: 'B', ho_ten: 'Trần Thị Bích', viet_tat: 'TB', chuc_vu: 'NV kho', bo_phan: 'Kho vận', dang_lam: 1, quyen: [] }] });
    return true;
  }
  if (duong === '/api/nhan-su/ngay-sinh') { traJson({ ngay_sinh: null, cong_khai_sinh_nhat: true }); return true; }
  if (duong === '/api/cong-viec/lich-su' || duong === '/api/cong-viec') {
    traJson({ danh_sach: [{ id: 1, tieu_de: 'Rà soát tồn lô chè', dau_ra: 'File khớp 100%',
      nguoi_giao_id: 'NS-NGOC', nguoi_giao_ten: 'Bùi Thị Ngọc', nguoi_nhan_id: 'A', nguoi_nhan_ten: 'Nguyễn Văn An',
      trang_thai: 'dang_lam', han_chot: '2026-09-10', tao_luc: '2026-09-01 09:00:00' }], cat: null });
    return true;
  }
  if (duong === '/api/sua/lich-su') {
    traJson({ ds: [{ truong: 'nhan_xet', gia_tri_moi: 'Chỗ làm tốt', nguoi_ten: 'Bùi Thị Ngọc',
      luc: '2026-09-05 10:00:00', cau: 'Bùi Thị Ngọc nhận xét: "Chỗ làm tốt"' }],
      cat: { gioi_han: 100, tong: 213, xem_them: null } });
    return true;
  }
  return false;
}

const may = await dungMayGia({ apiRieng });
const c = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: 375, cao: 812 });
const K = {};
try {
  /* T3 — mở hồ sơ người A, gõ sai, đóng, mở hồ sơ người B */
  await c.chay(`document.querySelector('[data-tab="nhansu"]')?.click(); true`);
  await c.doi(900);
  K.t3 = await c.chay(`(async()=>{
    const nut=[...document.querySelectorAll('[data-sua-ns]')];
    if(nut.length<2) return {thieuNguoi:nut.length};
    nut[0].click(); await new Promise(r=>setTimeout(r,600));
    const o=document.getElementById('nsSua-ngaysinh');
    o.value='2020-05-05'; o.dispatchEvent(new Event('input',{bubbles:true}));
    const nhac=o.nextElementSibling;
    const doA = nhac && !nhac.hidden && nhac.classList.contains('sai');
    const m=o.closest('.modal-nen'); if(m) m.hidden=true;
    await new Promise(r=>setTimeout(r,300));
    nut[1].click(); await new Promise(r=>setTimeout(r,900));
    return { doA, giaTriB:o.value, conDoOHoSoB: nhac && !nhac.hidden && nhac.classList.contains('sai'),
             chuConLai: nhac?nhac.textContent.slice(0,60):null,
             vienDoConLai: o.classList.contains('o-ngay-sai') };
  })()`);

  /* T2 — hộp nhận xét có in dải "đã cắt" không (hộp Sửa thì CÓ) */
  await c.chay(`document.querySelector('[data-tab="lichsuviec"]')?.click(); true`);
  await c.doi(1200);
  K.t2 = await c.chay(`(async()=>{
    const n=document.querySelector('[data-cv-nhanxet]');
    if(!n) return {khongCoNut:true};
    n.click(); await new Promise(r=>setTimeout(r,900));
    const m=document.getElementById('cvNxModalNen');
    const chu=m?m.innerText:'';
    const hopSuaCoDai = !!document.getElementById('cv-sua-lichsu-cat');
    return { hopMo:!m.hidden, chu:chu.slice(0,400),
             noiDaCat: /cắt|còn lại|213|xem thêm|đang hiện/i.test(chu),
             hopSuaCoDai, hopNxCoDai: !!m.querySelector('[id$="-cat"]') };
  })()`);
  K.loi = c.loiConsole.slice(); K.ngoaiLe = c.ngoaiLe.slice();
} finally { c.dong(); may.dong(); }

ok('T3 · câu sai đỏ của hồ sơ NGƯỜI TRƯỚC không dính sang hồ sơ người sau',
   !K.t3.conDoOHoSoB, JSON.stringify(K.t3));
ok('T2 · API nói "cắt 213 → 100" → hộp NHẬN XÉT có nói ra như hộp Sửa không',
   K.t2.noiDaCat === true, JSON.stringify(K.t2).slice(0, 500));
ok('T2 · hộp Sửa có ô dải-cắt `#cv-sua-lichsu-cat`; hộp Nhận xét có ô tương đương không',
   K.t2.hopNxCoDai === true, `hộp Sửa: ${K.t2.hopSuaCoDai} · hộp Nhận xét: ${K.t2.hopNxCoDai}`);
ok('T · 0 lỗi console', (K.loi || []).length === 0, JSON.stringify(K.loi));
tongKet();
