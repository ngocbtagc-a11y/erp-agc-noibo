/* ==========================================================================
   HỒ LY · BÀN SOI ĐỘC LẬP — GY-0004 (ô ngày) + GY-0005 (nhận xét)
   ---------------------------------------------------------------------------
   KHÔNG lặp lại `do-o-ngay-nhanxet.mjs`. File này đo ĐÚNG những chỗ bàn đo
   của người xây KHÔNG chạm tới:

   PHẦN H · TRÌNH DUYỆT
     H1  gõ thật 8 chữ số vào MỌI ô ngày (không chỉ ô ngày sinh)
     H2  dán những kiểu người xây CHƯA thử: 1990.01.25 · 25-01-1990 ·
         khoảng trắng thừa · chữ · ngày không có thật
     H3  bộ nâng cấp có ĐẺ RÁC DOM không (một `.o-ngay-nhac` cho một ô?)
     H4  RÒ RỈ: mở/đóng hộp 20 lần → còn đúng một người nghe / một dòng nhắc?
     H5  @375px: bấm vào ô ngày có đẩy trang tràn ngang / dài thêm không?
     H6  câu sai CŨ có dính lại khi mở hộp lần sau không?
     H7  min/max có CHẶN OAN ca hợp lệ không (báo cáo kho "Đến ngày")
     H8  đọc `.value` của cả 15 ô còn đúng không (lời khai "không đổi value")
     H9  thông báo `cong_viec_nhan_xet` bấm vào có đi đâu không
     H10 sổ nhận xét bị CẮT ở trần 100 — màn có NÓI RA không?

   PHẦN S · MÁY CHỦ
     S1  ai ĐỌC được nhận xét (không phải ai VIẾT được — người xây chỉ đo viết)
     S2  nhân viên kho nhận xét việc của quản lý mình → phải chặn
     S3  nhận xét dài 1500 ký tự → máy chủ cắt còn 1000, CÓ NÓI KHÔNG?
     S4  lượt ghi / lượt đọc D1 cho MỘT lần nhận xét
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RONG = (() => { const i = process.argv.indexOf('--rong'); return i > 0 ? parseInt(process.argv[i + 1], 10) : 375; })();
datDongHo('2026-09-07T03:00:00Z');

/* ======================================================================== */
/* PHẦN S — MÁY CHỦ                                                          */
/* ======================================================================== */
const NGUOI = [
  ['SEP',   'Bùi Thị Ngọc',    'Ban giám đốc', null,  'admin'],
  ['DUY',   'Phạm Khương Duy', 'Kho vận',      'SEP', 'quan_ly_kho'],
  ['AN',    'Nguyễn Văn An',   'Kho vận',      'DUY', 'nhan_vien_kho'],
  ['HUONG', 'Vũ Lan Hương',    'Hành chính',   'SEP', 'hcns'],
  ['HANG',  'Phan Thị Hằng',   'Kế toán',      'SEP', 'ke_toan_truong']
];

function moi(db) {
  db.exec('DELETE FROM lich_su_thay_doi_nen; DELETE FROM thong_bao; DELETE FROM cong_viec;' +
          'DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam) VALUES (?,?,?,?,?,?,1)');
  const tk = db.prepare('INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk) VALUES (?,?,?,?,?,1,0)');
  NGUOI.forEach(([id, ten, bp, ql, vt], i) => { ns.run(id, ten, id.slice(0, 2), 'NV', bp, ql); tk.run(i + 1, id, 'tk' + id, 'pbkdf2$1$x$x', vt); });
  const cv = db.prepare(`INSERT INTO cong_viec
    (id, tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten, nguoi_nhan_id, nguoi_nhan_ten, han_chot, trang_thai, tao_luc)
    VALUES (?,?,?,?,?,?,?,'2026-09-10',?,'2026-09-01 09:00:00')`);
  // #1: SEP giao cho AN  (AN là nhân viên kho, DUY là quản lý của AN)
  cv.run(1, 'Rà soát tồn lô chè chưng yến', 'File đối chiếu tồn khớp 100%', 'SEP', 'Bùi Thị Ngọc', 'AN', 'Nguyễn Văn An', 'dang_lam');
  // #2: SEP giao cho DUY — AN là CẤP DƯỚI của DUY, không được chấm sếp mình
  cv.run(2, 'Chốt KPI tổ kho tháng 9', 'Bảng KPI có chữ ký', 'SEP', 'Bùi Thị Ngọc', 'DUY', 'Phạm Khương Duy', 'dang_lam');
}

async function dungVong() {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const url = pathToFileURL(path.join(GOC, 'src', 'index.js')).href + `?v=${Math.random()}`;
  const worker = (await import(url)).default;
  const phien = {};
  for (let i = 0; i < NGUOI.length; i++) phien[NGUOI[i][0]] = await taoPhienThat(env, i + 1);
  return {
    db, env, worker, phien,
    nx: (ai, than) => goiAPI(worker, env, '/api/cong-viec/nhan-xet', phien[ai], { method: 'POST', body: JSON.stringify(than) }),
    lichSu: (ai, id) => goiAPI(worker, env, `/api/sua/lich-su?bang=cong_viec&id=${id}`, phien[ai])
  };
}

console.log('\n=== S · MÁY CHỦ — chỗ bàn đo của người xây KHÔNG chạm ===\n');
{
  const V = await dungVong();
  await V.nx('SEP', { id: 1, noi_dung: 'Chỗ cần sửa: em còn quên ghi số lô, lần sau bổ sung.' });

  /* --- S1 · AI ĐỌC ĐƯỢC nhận xét ------------------------------------------
     Người xây chỉ đo AI VIẾT ĐƯỢC (A1). Đường ĐỌC là `suaLichSu`, mà cửa của
     nó chỉ hỏi `duocXemTab(phien,'congviec')` — KHÔNG hỏi có dính dây gì với
     việc này không. */
  const docHang = await V.lichSu('HANG', 1);      // kế toán trưởng, khác phòng, không dính dây
  const docHuong = await V.lichSu('HUONG', 1);    // hcns, khác phòng
  const cauHang = (docHang.than?.ds || []).filter(d => d.truong === 'nhan_xet').map(d => d.cau);
  ok('S1 · NGƯỜI NGOÀI (khác phòng, không dính dây) ĐỌC được nguyên văn nhận xét về người khác',
     docHang.status === 200 && cauHang.length > 0,
     `HTTP ${docHang.status} · ${JSON.stringify(cauHang)}`);
  ok('S1 · … và người HCNS cũng đọc được y hệt',
     docHuong.status === 200 && (docHuong.than?.ds || []).some(d => d.truong === 'nhan_xet'),
     `HTTP ${docHuong.status}`);

  /* --- S2 · nhân viên kho chấm việc của CHÍNH QUẢN LÝ MÌNH ---------------- */
  const anChamDuy = await V.nx('AN', { id: 2, noi_dung: 'Anh Duy làm bảng KPI hơi chậm ạ.' });
  ok('S2 · nhân viên kho nhận xét việc của QUẢN LÝ mình → phải CHẶN',
     anChamDuy.status === 403, `HTTP ${anChamDuy.status} ${JSON.stringify(anChamDuy.than)}`);

  /* --- S3 · nhận xét 1500 ký tự -------------------------------------------- */
  const dai = 'A'.repeat(1500);
  const rDai = await V.nx('SEP', { id: 1, noi_dung: dai });
  const vet = V.db.prepare("SELECT gia_tri_moi FROM lich_su_thay_doi_nen WHERE truong='nhan_xet' ORDER BY id DESC LIMIT 1").get();
  const luuDuoc = String(vet?.gia_tri_moi || '').length;
  ok('S3 · nhận xét 1500 ký tự: máy chủ CẮT còn 1000 — có nói ra là đã cắt không?',
     !(rDai.status === 200 && luuDuoc === 1000 && !JSON.stringify(rDai.than).match(/cat|cắt|1000/i)),
     `HTTP ${rDai.status} · lưu ${luuDuoc} ký tự · trả về ${JSON.stringify(rDai.than)}`);

  /* --- S4 · lượt ghi / đọc D1 cho MỘT nhận xét ---------------------------- */
  let dem = 0;
  const goc = V.env.DB.prepare.bind(V.env.DB);
  V.env.DB.prepare = (sql) => { dem++; return goc(sql); };
  await V.nx('DUY', { id: 1, noi_dung: 'Chỗ làm tốt: đối chiếu khớp, gửi đúng hạn.' });
  V.env.DB.prepare = goc;
  ok(`S4 · MỘT lần nhận xét tốn ${dem} lượt chuẩn bị câu D1 (đọc phiên + đọc việc + ghi vết + ghi tin + tra cấp trên)`,
     dem <= 12, `${dem} lượt`);

  /* --- S5 · TRẦN 100 · hai loại vết tranh chỗ ------------------------------ */
  const them = V.db.prepare(`INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten, luc)
    VALUES ('cong_viec','1','tieu_de',?,?, 'SEP','Bùi Thị Ngọc', ?)`);
  for (let i = 0; i < 120; i++) them.run('Tên cũ ' + i, 'Tên mới ' + i, '2026-09-06 12:' + String(i % 60).padStart(2, '0') + ':00');
  const sau = await V.lichSu('SEP', 1);
  const nxConLai = (sau.than?.ds || []).filter(d => d.truong === 'nhan_xet').length;
  ok('S5 · 120 dòng dời hạn đè lên 3 nhận xét cũ → API CÓ nói là đã cắt (`cat`)',
     !!sau.than?.cat, `cat = ${JSON.stringify(sau.than?.cat)} · nhận xét còn thấy: ${nxConLai}/3`);
  ok('S5 · … nhưng SỔ NHẬN XÉT còn lại bao nhiêu câu sau khi bị đè?',
     nxConLai === 3, `còn ${nxConLai}/3 nhận xét trong 100 dòng trả về`);
}

/* ======================================================================== */
/* PHẦN H — TRÌNH DUYỆT                                                      */
/* ======================================================================== */
let LICH_SU_CAT = false;
function apiRieng(duong, u, traJson) {
  if (duong === '/api/toi-la-ai') return false;
  if (duong === '/api/nhan-su') {
    traJson({ nhan_su: [{ id: 'AN', ho_ten: 'Nguyễn Văn An', viet_tat: 'AN', chuc_vu: 'NV kho', bo_phan: 'Kho vận', dang_lam: 1, quyen: [] }] });
    return true;
  }
  if (duong === '/api/nhan-su/ngay-sinh') { traJson({ ngay_sinh: null, cong_khai_sinh_nhat: true }); return true; }
  if (duong === '/api/cong-viec/lich-su' || duong === '/api/cong-viec') {
    traJson({ danh_sach: [
      { id: 1, tieu_de: 'Rà soát tồn lô chè chưng yến', dau_ra: 'File đối chiếu tồn khớp 100%',
        nguoi_giao_id: 'NS-NGOC', nguoi_giao_ten: 'Bùi Thị Ngọc', nguoi_nhan_id: 'AN', nguoi_nhan_ten: 'Nguyễn Văn An',
        trang_thai: 'dang_lam', han_chot: '2026-09-10', tao_luc: '2026-09-01 09:00:00' }], cat: null });
    return true;
  }
  if (duong === '/api/cong-viec/nhan-xet') { traJson({ ok: true, id: 1 }); return true; }
  if (duong === '/api/thong-bao') {
    traJson({ chua_doc: 1, cat: null, thong_bao: [
      { id: 1, loai: 'cong_viec_nhan_xet', noi_dung: 'Bùi Thị Ngọc nhận xét việc "Rà soát tồn"', tao_luc: '2026-09-06 10:00:00' }] });
    return true;
  }
  if (duong === '/api/sua/lich-su') {
    traJson({ ds: [{ truong: 'nhan_xet', gia_tri_moi: 'Chỗ làm tốt: gửi đúng hạn', nguoi_ten: 'Phạm Khương Duy',
                     luc: '2026-09-05 10:00:00', cau: 'Phạm Khương Duy nhận xét: "Chỗ làm tốt: gửi đúng hạn"' }],
              cat: LICH_SU_CAT ? { tong: 123, hien: 100, don_vi: 'dòng' } : null });
    return true;
  }
  return false;
}

const PHIM = { '0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54, '7': 55, '8': 56, '9': 57 };
async function goSo(c, ch) {
  const vk = PHIM[ch];
  await c.goi('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, key: ch, code: 'Digit' + ch, text: ch, unmodifiedText: ch }, c.sessionId);
  await c.goi('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, key: ch, code: 'Digit' + ch }, c.sessionId);
  await new Promise(r => setTimeout(r, 55));
}

console.log(`\n=== H · TRÌNH DUYỆT THẬT @${RONG}px ===\n`);
const may = await dungMayGia({ apiRieng });
const c = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, cao: 812 });
const H = {};
try {
  /* --- H3 · rác DOM ------------------------------------------------------ */
  H.h3 = await c.chay(`(()=>{
    const o=[...document.querySelectorAll('input[type=date]')];
    return { oNgay:o.length, dongNhac:document.querySelectorAll('.o-ngay-nhac').length,
             daNang:document.querySelectorAll('input[type=date][data-ngay-da-nang="1"]').length };
  })()`);

  /* --- H8 · đọc `.value` còn đúng ---------------------------------------- */
  H.h8 = await c.chay(`(()=>{
    const ds=[...document.querySelectorAll('input[type=date]')];
    const hong=[];
    for(const o of ds){
      const cu=o.value; o.value='2026-03-04';
      if(o.value!=='2026-03-04') hong.push({id:o.id,doc:o.value,min:o.min,max:o.max});
      o.value=cu;
    }
    return { tong:ds.length, hong, kieu:ds.map(o=>o.type).filter(t=>t!=='date').length,
             minmax: ds.map(o=>({id:o.id,min:o.min,max:o.max})) };
  })()`);

  /* --- H7 · min/max chặn OAN? -------------------------------------------- */
  H.h7 = await c.chay(`(()=>{
    const r=(id,v)=>{const o=document.getElementById(id); if(!o) return {id,thieu:true}; o.value=v;
      return {id, v, hopLe:o.checkValidity(), min:o.min, max:o.max};};
    return [
      r('kvBcDen','2026-09-08'),   // "Đến ngày" = NGÀY MAI (lấy trọn hôm nay)
      r('kvBcDen','2026-12-31'),   // "Đến ngày" = cuối năm (kiểu người ta hay gõ cho chắc)
      r('kvBcTu','2026-09-01'),
      r('tsThemNgayMua','1988-05-20'),  // máy in cũ mua 1988
      r('dmNgayVao','2026-09-08'),      // người vào làm NGÀY MAI (offer đã ký)
      r('nsSua-ngaysinh','2009-06-01'), // nhân viên kho 17 tuổi
      r('nsSua-ngaysinh','2012-12-31'), // đúng mép chốt máy chủ
      r('nsSua-ngaysinh','2013-01-01')  // 13 tuổi — PHẢI sai
    ];
  })()`);

  /* --- H1 · GÕ THẬT vào MỌI ô ngày --------------------------------------- */
  const dsId = (await c.chay(`[...document.querySelectorAll('input[type=date]')].map(o=>o.id)`)) || [];
  H.h1 = [];
  for (const id of dsId) {
    if (!id) continue;
    const moDuoc = await c.chay(`(()=>{const o=document.getElementById('${id}');
      if(!o) return false; const h=o.closest('[hidden]'); if(h) h.hidden=false;
      const m=o.closest('.modal-nen'); if(m) m.hidden=false;
      o.value=''; o.scrollIntoView(); o.focus(); return document.activeElement===o;})()`);
    if (!moDuoc) { H.h1.push({ id, boQua: 'không focus được' }); continue; }
    let giuTieuDiem = true;
    for (const ch of '25011990') {
      await goSo(c, ch);
      const b = await c.chay(`(()=>{const o=document.getElementById('${id}');
        return {dis:o.disabled, td:document.activeElement===o};})()`);
      if (!b.td || b.dis) giuTieuDiem = false;
    }
    const v = await c.chay(`document.getElementById('${id}').value`);
    H.h1.push({ id, giuTieuDiem, v });
  }

  /* --- H2 · DÁN các kiểu chưa thử ---------------------------------------- */
  H.h2 = await c.chay(`(()=>{
    const o=document.getElementById('nsSua-ngaysinh');
    const dan=(chu)=>{o.value=''; o.focus();
      const dt=new DataTransfer(); dt.setData('text/plain',chu);
      o.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
      const nhac=o.nextElementSibling;
      return {chu, v:o.value, nhac: nhac&&!nhac.hidden ? nhac.textContent.slice(0,60) : null};};
    return ['1990.01.25','25-01-1990','  25/01/1990  ','25/1/1990','1990-1-5',
            '31/02/1990','hôm nay','25011990','19900125','2026-13-45','1990/01/25'].map(dan);
  })()`);

  /* --- H6 · câu sai CŨ dính lại ------------------------------------------ */
  H.h6 = await c.chay(`(()=>{
    const o=document.getElementById('nsSua-ngaysinh');
    o.value='2020-01-01';                      // ngoài khoảng → phải đỏ
    o.dispatchEvent(new Event('input',{bubbles:true}));
    const nhac=o.nextElementSibling;
    const dangSai = nhac && !nhac.hidden && nhac.classList.contains('sai') ? nhac.textContent.slice(0,50) : null;
    // đóng hộp rồi mở lại, KHÔNG chạm vào ô
    const m=o.closest('.modal-nen'); if(m){m.hidden=true; m.hidden=false;}
    return { dangSai, sauKhiMoLai: nhac && !nhac.hidden ? nhac.textContent.slice(0,50) : null,
             giaTriConLai: o.value, vienDo: o.classList.contains('o-ngay-sai') };
  })()`);

  /* --- H5 · @375px bấm vào ô có tràn / dài thêm -------------------------- */
  H.h5 = await c.chay(`(()=>{
    const o=document.getElementById('nsSua-ngaysinh');
    const m=o.closest('.modal'); if(m) m.scrollTop=0;
    o.value='1990-01-25'; o.dispatchEvent(new Event('input',{bubbles:true}));
    o.blur();
    const truoc = m ? m.scrollHeight : document.body.scrollHeight;
    o.focus(); o.dispatchEvent(new Event('focus',{bubbles:true}));
    const sau = m ? m.scrollHeight : document.body.scrollHeight;
    const nhac=o.nextElementSibling;
    return { truoc, sau, dayThem: sau-truoc,
             tranNgang: document.documentElement.scrollWidth > window.innerWidth+1,
             nhacRong: nhac?Math.round(nhac.getBoundingClientRect().width):0,
             khungRong: Math.round(window.innerWidth),
             chuNhac: nhac?nhac.textContent.slice(0,80):null,
             caoNhac: nhac?Math.round(nhac.getBoundingClientRect().height):0 };
  })()`);

  /* --- H4 · RÒ RỈ: mở/đóng 20 lần ---------------------------------------- */
  H.h4 = await c.chay(`(async()=>{
    const m=document.getElementById('nsSuaModalNen') || document.querySelector('#nsSua-ngaysinh')?.closest('.modal-nen');
    for(let i=0;i<20;i++){ if(m){m.hidden=true; m.hidden=false;} await new Promise(r=>setTimeout(r,5)); }
    return { dongNhac: document.querySelectorAll('.o-ngay-nhac').length,
             oNgay: document.querySelectorAll('input[type=date]').length };
  })()`);

  /* --- H4b · RÒ RỈ THẬT: vẽ LẠI một ô ngày 30 lần bằng innerHTML --------- */
  H.h4b = await c.chay(`(async()=>{
    const hop=document.createElement('div'); document.body.appendChild(hop);
    for(let i=0;i<30;i++){ hop.innerHTML='<input type="date" data-ngay-kieu="ngay-sinh">';
      await new Promise(r=>setTimeout(r,12)); }
    const n = hop.querySelectorAll('.o-ngay-nhac').length;
    const o = hop.querySelector('input[type=date]');
    const tong = document.querySelectorAll('.o-ngay-nhac').length;
    hop.remove();
    return { nhacTrongHop:n, coMinMax: !!(o&&o.min&&o.max), tongToanTrang: tong };
  })()`);

  /* --- H9 · thông báo nhận xét bấm vào đi đâu ---------------------------- */
  H.h9 = await c.chay(`(async()=>{
    const nut=document.getElementById('tbNut'); if(!nut) return {thieu:true};
    nut.click(); await new Promise(r=>setTimeout(r,700));
    const it=document.querySelector('#tbDanhSach .tb-item[data-loai="cong_viec_nhan_xet"]');
    if(!it) return {khongThayTin:true, co:document.querySelectorAll('#tbDanhSach .tb-item').length};
    const tabTruoc=document.querySelector('.tab-nut.chon,[data-tab].chon')?.getAttribute('data-tab')||null;
    it.click(); await new Promise(r=>setTimeout(r,700));
    const tabSau=document.querySelector('.tab-nut.chon,[data-tab].chon')?.getAttribute('data-tab')||null;
    return { bieuTuong: it.textContent.trim().slice(0,2), tabTruoc, tabSau,
             hopNhanXetMo: !document.getElementById('cvNxModalNen').hidden };
  })()`);

  /* --- H10 · sổ nhận xét bị cắt — màn có nói không? --------------------- */
  LICH_SU_CAT = true;
  H.h10 = await c.chay(`(async()=>{
    const mod = await import('/assets/js/api.js').catch(()=>null);
    const m=document.getElementById('cvNxModalNen');
    const nut=document.querySelector('[data-cv-nhanxet]');
    if(nut) nut.click();
    await new Promise(r=>setTimeout(r,800));
    const chu = m ? m.innerText : '';
    return { hopMo: m && !m.hidden,
             noiDaCat: /cắt|còn \\d+|123|xem thêm/i.test(chu),
             chu: chu.slice(0,300) };
  })()`);

  H.loiConsole = c.loiConsole.slice();
  H.ngoaiLe = c.ngoaiLe.slice();
} finally { c.dong(); may.dong(); }

/* ---- KẾT ---------------------------------------------------------------- */
const goDuoc = H.h1.filter(x => !x.boQua);
const goSai = goDuoc.filter(x => x.v !== '1990-01-25');
const matTieuDiem = goDuoc.filter(x => !x.giuTieuDiem);
ok(`H1 · gõ thật "25011990" vào ${goDuoc.length} ô ngày: ô nào cũng ra 1990-01-25`,
   goSai.length === 0, JSON.stringify(goSai));
ok(`H1 · … và không ô nào mất tiêu điểm giữa chừng`,
   matTieuDiem.length === 0, JSON.stringify(matTieuDiem.map(x => x.id)));
ok(`H1 · số ô gõ thử được / tổng số ô ngày`, goDuoc.length >= 10,
   `${goDuoc.length}/${H.h1.length} · bỏ qua: ${JSON.stringify(H.h1.filter(x => x.boQua).map(x => x.id))}`);

const MONG = { '1990.01.25': '1990-01-25', '25-01-1990': '1990-01-25', '  25/01/1990  ': '1990-01-25',
               '25/1/1990': '1990-01-25', '1990-1-5': '1990-01-05', '31/02/1990': '',
               'hôm nay': '', '25011990': '1990-01-25', '19900125': '1990-01-25',
               '2026-13-45': '', '1990/01/25': '1990-01-25' };
for (const r of H.h2) {
  const mong = MONG[r.chu];
  const dung = r.v === mong;
  ok(`H2 · dán "${r.chu.trim()}" → ${mong || '(không nhận)'}${mong ? '' : ' + phải NÓI RA là không đọc được'}`,
     dung && (mong || r.nhac), `được "${r.v}" · nhắc: ${r.nhac ? '"' + r.nhac + '"' : 'KHÔNG NÓI GÌ'}`);
}

ok('H3 · một ô ngày = đúng một dòng nhắc, không đẻ rác DOM',
   H.h3.dongNhac === H.h3.oNgay && H.h3.daNang === H.h3.oNgay, JSON.stringify(H.h3));
ok('H4 · mở/đóng hộp 20 lần: KHÔNG chồng thêm dòng nhắc nào',
   H.h4.dongNhac === H.h3.dongNhac, `trước ${H.h3.dongNhac} → sau ${H.h4.dongNhac}`);
ok('H4b · vẽ lại một ô ngày 30 lần bằng innerHTML: mỗi lần đúng MỘT dòng nhắc, ô mới vẫn có min/max',
   H.h4b.nhacTrongHop === 1 && H.h4b.coMinMax, JSON.stringify(H.h4b));

ok('H8 · gán/đọc `.value` của mọi ô ngày vẫn chạy y như cũ (lời khai "không đổi value")',
   H.h8.hong.length === 0 && H.h8.kieu === 0, JSON.stringify(H.h8.hong));

for (const r of H.h7) {
  const phaiHopLe = r.id !== 'nsSua-ngaysinh' || r.v <= '2012-12-31';
  ok(`H7 · ${r.id} = ${r.v} → ${phaiHopLe ? 'phải NHẬN' : 'phải CHẶN'}`,
     r.thieu ? false : r.hopLe === phaiHopLe, JSON.stringify(r));
}

ok('H6 · câu sai cũ KHÔNG dính lại sau khi đóng/mở hộp',
   H.h6.sauKhiMoLai === null || !H.h6.dangSai, JSON.stringify(H.h6));
ok(`H5 · @${RONG}px bấm vào ô ngày: không tràn ngang`, !H.h5.tranNgang, JSON.stringify(H.h5));
ok(`H5 · @${RONG}px dòng nhắc đẩy hộp dài thêm bao nhiêu px`, H.h5.dayThem <= 60,
   `+${H.h5.dayThem}px (cao dòng nhắc ${H.h5.caoNhac}px) — "${H.h5.chuNhac}"`);

ok('H9 · bấm thông báo "nhận xét" có đi tới đâu không (đổi tab / mở hộp)',
   !!(H.h9.tabSau && H.h9.tabSau !== H.h9.tabTruoc) || H.h9.hopNhanXetMo, JSON.stringify(H.h9));
ok('H10 · sổ nhận xét bị cắt ở trần 100 → màn hình CÓ NÓI RA', H.h10.noiDaCat, JSON.stringify(H.h10).slice(0, 400));
ok('H · 0 lỗi console, 0 ngoại lệ', H.loiConsole.length === 0 && H.ngoaiLe.length === 0,
   JSON.stringify([H.loiConsole, H.ngoaiLe]).slice(0, 400));

tongKet();
