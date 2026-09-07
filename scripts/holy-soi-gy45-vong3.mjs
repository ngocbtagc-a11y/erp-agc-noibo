/* ==========================================================================
   HỒ LY · BÀN SOI VÒNG 3 — REV-0061 vòng 2
   ---------------------------------------------------------------------------
   Vòng 2 người xây BÁC LẠI 5 phép kiểm của tôi, nói bàn đo hỏng chứ không
   phải sản phẩm hỏng. File này SỬA LẠI đúng những chỗ tôi đo sai, rồi đo lại:

     · fixture `/api/cong-viec/lich-su` trả `viec` (KHÔNG phải `danh_sach`)
     · fixture `/api/thong-bao` có `lien_ket` như máy chủ thật
     · bộ chọn tab là `.sb-item[data-tab].active` (KHÔNG phải `.tab-nut.chon`)
     · H1 nay hỏi ĐÚNG cái đã chốt: DÒNG ĐỌC LẠI có nói ra ngày ERP hiểu không
     · H6 nay đi ĐÚNG đường thật (gán `.value` như mã sản phẩm đang gán)
     · S5 nay hỏi qua cửa `?truong=nhan_xet` như giao diện đang gọi

   VÀ soi thêm phần vòng 2 mới đẻ ra:
     A · cửa `?truong=` — danh sách trắng, rò quyền
     C · dải cắt `#cv-nx-cat` ở 0 / 99 / 100 / 101 nhận xét
     D · dòng đọc lại ngày ở CẢ 17 ô · năm nhuận · tuổi quanh sinh nhật
     E · 6 chỗ khác gán `.value` cho ô ngày mà KHÔNG bắn `input`
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RONG = (() => { const i = process.argv.indexOf('--rong'); return i > 0 ? parseInt(process.argv[i + 1], 10) : 375; })();
datDongHo('2026-09-07T03:00:00Z');

/* ======================================================================== */
/* PHẦN A · MÁY CHỦ — cửa `?truong=` soi như MÃ MỚI                          */
/* ======================================================================== */
const NGUOI = [
  ['SEP',   'Bùi Thị Ngọc',    'Ban giám đốc', null,  'admin'],
  ['DUY',   'Phạm Khương Duy', 'Kho vận',      'SEP', 'quan_ly_kho'],
  ['AN',    'Nguyễn Văn An',   'Kho vận',      'DUY', 'nhan_vien_kho'],
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
  cv.run(1, 'Rà soát tồn lô chè chưng yến', 'File đối chiếu tồn khớp 100%', 'SEP', 'Bùi Thị Ngọc', 'AN', 'Nguyễn Văn An', 'dang_lam');
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
    // `duoi` là phần đuôi query THÔ — để thử đúng những chuỗi bẩn.
    ls: (ai, duoi = '') => goiAPI(worker, env, `/api/sua/lich-su?bang=cong_viec&id=1${duoi}`, phien[ai])
  };
}

/** Chèn thẳng một vết vào sổ — nhanh hơn gọi API 123 lần. */
function chenVet(db, truong, gia, luc) {
  db.prepare(`INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_id, nguoi_ten, luc)
    VALUES ('cong_viec','1',?,'',?, 'SEP','Bùi Thị Ngọc', ?)`).run(truong, gia, luc);
}

console.log('\n=== A · CỬA `?truong=` — soi như MÃ MỚI ===\n');
{
  const V = await dungVong();
  // 3 nhận xét CŨ (tháng 6) + 110 lần sửa MỚI (tháng 8) — đúng ca CHẶN-1.
  for (let i = 0; i < 3; i++) chenVet(V.db, 'nhan_xet', `Câu nhận xét cũ số ${i + 1} — lô 12 thiếu số lô`, `2026-06-0${i + 1} 09:00:00`);
  for (let i = 0; i < 110; i++) chenVet(V.db, 'tieu_de', 'Tên mới ' + i, '2026-08-01 12:' + String(i % 60).padStart(2, '0') + ':00');

  const chung = await V.ls('SEP');
  const nxChung = (chung.than?.ds || []).filter(d => d.truong === 'nhan_xet').length;
  ok('A0 · rổ CHUNG (không `?truong=`) vẫn đè mất nhận xét cũ — đúng như người xây khai',
     nxChung === 0, `nhận xét thấy trong rổ chung: ${nxChung}/3 · cat=${JSON.stringify(chung.than?.cat)}`);

  const rieng = await V.ls('SEP', '&truong=nhan_xet');
  const dsR = (rieng.than?.ds || []);
  ok('A1 · hỏi RIÊNG `?truong=nhan_xet` → ĐỦ 3/3 nhận xét, câu CŨ NHẤT còn nguyên',
     rieng.status === 200 && dsR.length === 3 && dsR.some(d => /số 1/.test(d.gia_tri_moi)),
     `HTTP ${rieng.status} · ${dsR.length} dòng · ${JSON.stringify(dsR.map(d => d.gia_tri_moi))}`);
  ok('A1b · … và không lẫn một dòng `tieu_de` nào',
     dsR.every(d => d.truong === 'nhan_xet'), JSON.stringify([...new Set(dsR.map(d => d.truong))]));
  ok('A1c · … `cat` = null vì 3 < 100', rieng.than?.cat === null, JSON.stringify(rieng.than?.cat));

  /* ---- danh sách trắng: gửi rác ---------------------------------------- */
  const ca = [
    ['&truong=',                       200, 'rỗng → không lọc'],
    ['&truong=nhan_xet&truong=tieu_de', 200, 'nhiều giá trị → lấy cái đầu'],
    ['&truong=tieu_de&truong=nhan_xet', 400, 'nhiều giá trị, cái đầu là hàng cấm'],
    ['&truong=NHAN_XET',               400, 'CHỮ HOA'],
    ['&truong=Nhan_Xet',               400, 'hoa lẫn thường'],
    ['&truong=%20nhan_xet%20',         200, 'khoảng trắng hai đầu (trim)'],
    ['&truong=nhan_xet%00',            400, 'ký tự NUL bám đuôi'],
    ["&truong=nhan_xet'%20OR%201%3D1", 400, "nhan_xet' OR 1=1"],
    ['&truong=nhan_xet%3B%20DROP%20TABLE%20cong_viec', 400, 'chấm phẩy + DROP TABLE'],
    ['&truong=tieu_de',                400, 'trường có thật nhưng ngoài danh sách trắng'],
    ['&truong=*',                      400, 'sao'],
    ['&truong=1%20OR%201%3D1',         400, 'số + OR']
  ];
  for (const [duoi, mong, ten] of ca) {
    const r = await V.ls('SEP', duoi);
    ok(`A2 · ${ten} → HTTP ${mong}`, r.status === mong,
       `HTTP ${r.status} · ${JSON.stringify(r.than).slice(0, 160)}`);
  }
  // Bảng còn nguyên sau mọi phát bẩn?
  const conBang = V.db.prepare('SELECT COUNT(*) AS n FROM cong_viec').get();
  ok('A3 · sau 12 phát gửi rác, bảng `cong_viec` còn nguyên', conBang.n === 1, `${conBang.n} dòng`);

  /* ---- rò quyền ---------------------------------------------------------- */
  const kt = await V.ls('HANG', '&truong=nhan_xet');
  const ktChung = await V.ls('HANG');
  ok('A4 · cửa MỚI không rò thêm quyền: ai đọc được rổ chung thì đọc được rổ riêng, ai không thì không',
     kt.status === ktChung.status,
     `riêng HTTP ${kt.status} · chung HTTP ${ktChung.status} (kế toán trưởng — VỪA-4 vẫn mở, đã ghi là câu chờ Sếp)`);

  /* ---- trần 100 ĐÚNG ĐƠN VỊ --------------------------------------------- */
  const V2 = await dungVong();
  for (let i = 0; i < 123; i++) chenVet(V2.db, 'nhan_xet', 'Nhận xét số ' + (i + 1), '2026-06-01 09:' + String(i % 60).padStart(2, '0') + ':' + String(i % 60).padStart(2, '0'));
  const r123 = await V2.ls('SEP', '&truong=nhan_xet');
  ok('A5 · 123 nhận xét → cắt ở 100 và `cat.tong` đếm ĐÚNG SỐ NHẬN XÉT (không phải số dòng sổ)',
     (r123.than?.ds || []).length === 100 && r123.than?.cat?.tong === 123 && r123.than?.cat?.gioi_han === 100,
     JSON.stringify(r123.than?.cat) + ` · ${(r123.than?.ds || []).length} dòng`);

  // 99 · 100 · 101 — mép của dải cắt
  for (const [n, phaiCat] of [[99, false], [100, false], [101, true]]) {
    const Vx = await dungVong();
    for (let i = 0; i < n; i++) chenVet(Vx.db, 'nhan_xet', 'NX ' + (i + 1), '2026-06-01 09:' + String(i % 60).padStart(2, '0') + ':' + String(i % 60).padStart(2, '0'));
    const r = await Vx.ls('SEP', '&truong=nhan_xet');
    const coCat = !!r.than?.cat;
    ok(`A6 · ${n} nhận xét → ${phaiCat ? 'CÓ' : 'KHÔNG'} dải cắt`, coCat === phaiCat,
       `${(r.than?.ds || []).length} dòng · cat=${JSON.stringify(r.than?.cat)}`);
  }
  const V0 = await dungVong();
  const r0 = await V0.ls('SEP', '&truong=nhan_xet');
  ok('A6 · 0 nhận xét THẬT → KHÔNG dải cắt (và danh sách rỗng)',
     r0.than?.cat === null && (r0.than?.ds || []).length === 0, JSON.stringify(r0.than));
}

/* ======================================================================== */
/* PHẦN H · TRÌNH DUYỆT — fixture ĐÃ SỬA                                     */
/* ======================================================================== */
let SO_NHAN_XET = 1;      // bao nhiêu nhận xét cửa `?truong=nhan_xet` trả về
let CAT_NHAN_XET = null;  // gói `cat` kèm theo

const VIEC = {
  id: 1, tieu_de: 'Rà soát tồn lô chè chưng yến', dau_ra: 'File đối chiếu tồn khớp 100%',
  nguoi_giao_id: 'NS-NGOC', nguoi_giao_ten: 'Bùi Thị Ngọc',
  nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy',
  trang_thai: 'dang_lam', han_chot: '2026-09-10', tao_luc: '2026-09-01 09:00:00',
  cap_nhat_luc: '2026-09-01 09:00:00'
};

function apiRieng(duong, u, traJson) {
  /* ĐÃ SỬA (lỗi bàn đo của chính tôi, vòng 2): `TOI` mặc định của bàn đo
     chung KHÔNG có quyền `congviec`, mà `app.js:2368` bọc cả
     `khoiDongCongViec()` trong `if (TOI.quyen.includes('congviec'))`.
     Thiếu quyền ⇒ `window.MO_HOP_NHANXET` / `LAM_MOI_CONGVIEC` không bao giờ
     được gán ⇒ mọi phép kiểm chạm tới hộp Nhận xét đo vào chỗ trống. */
  if (duong === '/api/toi-la-ai') {
    traJson({ ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'admin', la_admin: true, phai_doi_mk: 0,
      anh_dai_dien: null, trang_thai: 'dang_lam', nhan_su_id: 'NS-NGOC', id: 'NS-NGOC',
      quyen: ['tongquan', 'congviec', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu', 'khovan', 'taisan'] });
    return true;
  }
  if (duong === '/api/muc-tieu/danh-sach') { traJson({ muc_tieu: [], cong_ty: [], cat: null }); return true; }
  if (duong === '/api/nhan-su') {
    traJson({ nhan_su: [{ id: 'NS-DUY', ho_ten: 'Phạm Khương Duy', viet_tat: 'KD', chuc_vu: 'Quản lý kho', bo_phan: 'Kho vận', dang_lam: 1, quyen: [] }] });
    return true;
  }
  if (duong.startsWith('/api/nhan-su/sinh-nhat')) { traJson({ ngay_sinh: null, cong_khai_sinh_nhat: true }); return true; }
  if (duong === '/api/nhan-su/ngay-sinh') { traJson({ ok: true }); return true; }
  /* ĐÃ SỬA: khoá là `viec`, đúng như `cvLichSu` trả về. Bản vòng 2 của tôi
     dùng `danh_sach` ⇒ bảng rỗng ⇒ không có nút "Nhận xét" nào để bấm. */
  if (duong === '/api/cong-viec/lich-su') { traJson({ viec: [VIEC], cat: null, truoc_tiep: null }); return true; }
  if (duong === '/api/cong-viec/danh-sach') {
    traJson({ nhan: [VIEC], giao: [VIEC], phoi_hop: [], cat_nhan: null, cat_giao: null, cat_phoi_hop: null });
    return true;
  }
  if (duong === '/api/cong-viec/hom-nay') { traJson({ hom_nay: [], qua_han: [], sap_han: [], cho_duyet: [], quan_ly: {}, ghi_nhan: [] }); return true; }
  if (duong === '/api/cong-viec/nhan-xet') { traJson({ ok: true, id: 1 }); return true; }
  if (duong === '/api/thong-bao') {
    /* ĐÃ SỬA: máy chủ THẬT luôn gửi `lien_ket` (SELECT ở `layThongBao`), và
       với tin nhận xét thì `lien_ket` = id việc. */
    traJson({ chua_doc: 1, cat: null, thong_bao: [
      { id: 1, nhom: 'cong_viec', loai: 'cong_viec_nhan_xet', lien_ket: '1',
        noi_dung: 'Bùi Thị Ngọc nhận xét việc "Rà soát tồn lô chè chưng yến"', tao_luc: '2026-09-06 10:00:00' }] });
    return true;
  }
  if (duong === '/api/thong-bao/da-xem') { traJson({ ok: true }); return true; }
  if (duong === '/api/sua/lich-su') {
    const truong = u.searchParams.get('truong');
    const ds = [];
    if (truong === 'nhan_xet') {
      for (let i = 0; i < SO_NHAN_XET; i++) {
        ds.push({ truong: 'nhan_xet', gia_tri_moi: 'Chỗ làm tốt: gửi đúng hạn ' + (i + 1),
                  nguoi_ten: 'Bùi Thị Ngọc', luc: '2026-09-05 10:00:00',
                  cau: `Bùi Thị Ngọc nhận xét: "Chỗ làm tốt: gửi đúng hạn ${i + 1}"` });
      }
      traJson({ ds, cat: CAT_NHAN_XET });
    } else {
      traJson({ ds: [{ truong: 'tieu_de', gia_tri_cu: 'a', gia_tri_moi: 'b', nguoi_ten: 'Bùi Thị Ngọc',
                       luc: '2026-09-05 10:00:00', cau: 'Bùi Thị Ngọc đổi tên việc' }], cat: null });
    }
    return true;
  }
  return false;
}

const PHIM = { '0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54, '7': 55, '8': 56, '9': 57 };
async function goSo(c, ch) {
  const vk = PHIM[ch];
  await c.goi('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, key: ch, code: 'Digit' + ch, text: ch, unmodifiedText: ch }, c.sessionId);
  await c.goi('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, key: ch, code: 'Digit' + ch }, c.sessionId);
  await new Promise(r => setTimeout(r, 50));
}

console.log(`\n=== D/E/H · TRÌNH DUYỆT THẬT @${RONG}px ===\n`);
const may = await dungMayGia({ apiRieng });
const c = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, cao: 812 });
const R = {};
try {
  R.homNay = await c.chay(`new Date().toISOString().slice(0,10)`);
  R.thuTu = await c.chay(`(()=>{const o=document.querySelector('input[type=date]');
    const n=o&&o.nextElementSibling; return n?n.title||o.title:null;})()`);

  /* ---- D1 · GÕ THẬT 25011990 vào MỌI ô — DÒNG ĐỌC LẠI có nói ra không --- */
  const dsId = (await c.chay(`[...document.querySelectorAll('input[type=date]')].map(o=>o.id)`)) || [];
  R.d1 = [];
  for (const id of dsId) {
    if (!id) continue;
    const moDuoc = await c.chay(`(()=>{const o=document.getElementById('${id}');
      if(!o) return false; const h=o.closest('[hidden]'); if(h) h.hidden=false;
      const m=o.closest('.modal-nen'); if(m) m.hidden=false;
      o.value=''; o.scrollIntoView(); o.focus(); return document.activeElement===o;})()`);
    if (!moDuoc) { R.d1.push({ id, boQua: true }); continue; }
    for (const ch of '25011990') await goSo(c, ch);
    const b = await c.chay(`(()=>{const o=document.getElementById('${id}');
      const n=o.nextElementSibling;
      return {v:o.value, an:n?n.hidden:null, chu:n?n.textContent:null,
              doc:n?n.dataset.ngayDoc:null, sai:n?n.classList.contains('sai'):null};})()`);
    R.d1.push({ id, ...b });
  }

  /* ---- D2 · năm nhuận + tuổi quanh sinh nhật --------------------------- */
  R.d2 = await c.chay(`(async()=>{
    const m = await import('/assets/js/o-ngay.js');
    const h = new Date(); const y = h.getFullYear();
    const p2 = (n)=>String(n).padStart(2,'0');
    const homNay = y+'-'+p2(h.getMonth()+1)+'-'+p2(h.getDate());
    const d = new Date(h); d.setDate(d.getDate()+1);
    const mai = d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
    const q = new Date(h); q.setDate(q.getDate()-1);
    const qua = q.getFullYear()+'-'+p2(q.getMonth()+1)+'-'+p2(q.getDate());
    const sn = (iso)=>({iso, tuoi:m.tuoiTheoNgaySinh(iso)});
    return {
      nhuan2000: { doc:m.ngayDocVN('2000-02-29'), tuoi:m.tuoiTheoNgaySinh('2000-02-29') },
      nhuan1900: { doc:m.ngayDocVN('1900-02-29') },
      dungHomNay: sn((y-30)+homNay.slice(4)),
      sinhNhatMai: sn((y-30)+mai.slice(4)),
      sinhNhatHomQua: sn((y-30)+qua.slice(4)),
      mep1: sn('1930-01-01'), rac: m.tuoiTheoNgaySinh('rác'), rong: m.tuoiTheoNgaySinh('')
    };
  })()`);

  /* ---- D3 · dòng đọc lại có làm hộp phải CUỘN không -------------------- */
  R.d3 = await c.chay(`(()=>{
    const kq=[];
    for (const sel of ['#nsSuaModalNen','#cvSuaModalNen','#cvNxModalNen','#tsSuaModalNen']) {
      const m=document.querySelector(sel); if(!m) continue;
      const daAn=m.hidden; m.hidden=false;
      const hop=m.querySelector('.modal')||m;
      const oNg=[...m.querySelectorAll('input[type=date]')];
      oNg.forEach(o=>{o.value=''; o.dispatchEvent(new Event('input',{bubbles:true}));});
      const truoc=hop.scrollHeight;
      oNg.forEach(o=>{o.value='1990-01-25'; o.dispatchEvent(new Event('input',{bubbles:true}));});
      const sau=hop.scrollHeight;
      /* Đo RIÊNG chiều cao của chính dòng đọc lại: scrollHeight của hộp Sửa
         việc còn cộng thêm khối "lý do dời hạn" mà capNhatHopLyDo mở ra khi
         #cv-sua-han-chot bắn input — không tách ra thì đổ oan cho dòng đọc
         lại 257px. */
      const caoNhac=oNg.reduce((s,o)=>{const n=o.nextElementSibling;
        return s + (n && n.classList.contains('o-ngay-nhac') && !n.hidden ? n.offsetHeight : 0);},0);
      kq.push({sel, soO:oNg.length, truoc, sau, them:sau-truoc, caoNhac,
               cao:hop.clientHeight, phaiCuon: sau>hop.clientHeight+1,
               phaiCuonTruoc: truoc>hop.clientHeight+1});
      m.hidden=daAn;
    }
    return {kq, tranNgang: document.documentElement.scrollWidth>window.innerWidth+1};
  })()`);

  /* ---- E · GÁN `.value` KHÔNG BẮN `input` — 6 chỗ còn lại -------------- */
  /* Đúng ca VỪA-2, chỉ khác ô. Mở "Sửa tài sản" tài sản A, gõ ngày sai →
     đỏ; đóng; mở tài sản B (ngày hợp lệ) — mã sản phẩm gán thẳng `.value`,
     KHÔNG bắn `input` ⇒ dòng đỏ của A còn nguyên dưới ngày của B. */
  R.e = await c.chay(`(()=>{
    const thu=(id, saiV, dungV)=>{
      const o=document.getElementById(id); if(!o) return {id, thieu:true};
      const m=o.closest('.modal-nen'); const daAn=m?m.hidden:null; if(m) m.hidden=false;
      o.value=saiV; o.dispatchEvent(new Event('input',{bubbles:true}));
      const n=o.nextElementSibling;
      const doA={do:n&&!n.hidden&&n.classList.contains('sai'), chu:n?n.textContent.slice(0,60):null};
      if(m){m.hidden=true; m.hidden=false;}
      o.value=dungV;                       // ← ĐÚNG như mã sản phẩm đang gán
      const doB={do:n&&!n.hidden&&n.classList.contains('sai'), chu:n?n.textContent.slice(0,60):null,
                 vienDo:o.classList.contains('o-ngay-sai'), giaTri:o.value,
                 docLai:n?n.dataset.ngayDoc:null};
      if(m) m.hidden=daAn;
      return {id, doA, doB};
    };
    return [
      thu('tsSuaNgayMua','2030-01-01','2024-03-15'),     // app.js:8462 gán thẳng
      thu('nsHd-batdau','1800-01-01','2026-01-01'),      // app.js:5779 gán thẳng
      thu('cv-sua-han-chot','2200-01-01','2026-09-30'),  // app.js:3637 gán thẳng
      thu('nsSua-ngaysinh','2020-01-01','1990-01-25')    // đối chứng: chỗ ĐÃ VÁ
    ];
  })()`);

  /* Và ĐI ĐÚNG ĐƯỜNG THẬT cho ô đã vá: gán rồi BẮN `input` như `datNgay`. */
  R.e2 = await c.chay(`(()=>{
    const o=document.getElementById('nsSua-ngaysinh'); const n=o.nextElementSibling;
    const dat=(v)=>{o.value=v; o.dispatchEvent(new Event('input',{bubbles:true}));};
    dat('2020-01-01');
    const A={do:!n.hidden&&n.classList.contains('sai')};
    dat(''); const B={do:!n.hidden&&n.classList.contains('sai'), chu:n.textContent.slice(0,50), an:n.hidden};
    dat('1990-01-25'); const C={do:n.classList.contains('sai'), chu:n.textContent.slice(0,50)};
    return {A,B,C};
  })()`);

  /* ---- H9 · thông báo nhận xét CÓ `lien_ket` --------------------------- */
  R.h9 = await c.chay(`(async()=>{
    const nut=document.getElementById('tbNut'); if(!nut) return {thieu:true};
    nut.click(); await new Promise(r=>setTimeout(r,800));
    const it=document.querySelector('#tbDanhSach .tb-item[data-loai="cong_viec_nhan_xet"]');
    if(!it) return {khongThayTin:true, co:document.querySelectorAll('#tbDanhSach .tb-item').length};
    const tabTruoc=document.querySelector('.sb-item[data-tab].active')?.dataset.tab||null;
    const bieuTuong=it.textContent.trim().slice(0,2);
    const lienKet=it.dataset.lienKet;
    it.click(); await new Promise(r=>setTimeout(r,1200));
    const tabSau=document.querySelector('.sb-item[data-tab].active')?.dataset.tab||null;
    const m=document.getElementById('cvNxModalNen');
    return { bieuTuong, lienKet, tabTruoc, tabSau, hopMo: m&&!m.hidden,
             tieuDeViec: (document.getElementById('cv-nx-viec')||{}).textContent||null };
  })()`);

  /* ---- C · dải cắt `#cv-nx-cat` ở 0 / 99 / 100 / 101 ------------------- */
  R.c = [];
  for (const [n, cat, ten] of [
    [0, null, '0 nhận xét thật'],
    [99, null, '99 nhận xét'],
    [100, null, '100 nhận xét (đúng trần)'],
    [100, { gioi_han: 100, tong: 101, xem_them: null }, '101 nhận xét (bị cắt 1)'],
    [100, { gioi_han: 100, tong: 123, xem_them: null }, '123 nhận xét (bị cắt 23)']
  ]) {
    await c.chay(`window.__soNx=${n}`);
    SO_NHAN_XET = n; CAT_NHAN_XET = cat;
    const r = await c.chay(`(async()=>{
      const m=document.getElementById('cvNxModalNen');
      if(m) m.hidden=true;
      if(window.MO_HOP_NHANXET) await window.MO_HOP_NHANXET('1');
      await new Promise(r=>setTimeout(r,600));
      const dai=document.getElementById('cv-nx-cat');
      const trong=document.getElementById('cv-nx-trong');
      return { hopMo: m&&!m.hidden,
               soCau: document.querySelectorAll('#cv-nx-so li').length,
               daiHien: dai?!dai.hidden:null, daiChu: dai?dai.textContent.trim():null,
               noiChuaCo: trong?!trong.hidden:null };
    })()`);
    R.c.push({ ten, ...r });
  }

  /* ---- E2 · bảng min/max của CẢ 17 ô ----------------------------------- */
  R.minmax = await c.chay(`(()=>{
    const g=(o)=>({id:o.id, kieu:o.dataset.ngayKieu||'(mặc định)', min:o.min, max:o.max});
    const ds=[...document.querySelectorAll('input[type=date]')].map(g);
    return ds;
  })()`);

  R.loiConsole = c.loiConsole.slice();
  R.ngoaiLe = c.ngoaiLe.slice();
} finally { c.dong(); may.dong(); }

/* ---------------------------------------------------------------------- */
console.log(`  ℹ️  hôm nay trên máy đo: ${R.homNay} · ${R.thuTu}\n`);

/* D1 — dòng đọc lại */
const goDuoc = R.d1.filter(x => !x.boQua);
const raSai = goDuoc.filter(x => x.v !== '1990-01-25');
ok(`D1 · gõ "25011990" vào ${goDuoc.length} ô: trình duyệt hiểu thành ngày nào`,
   true, raSai.length ? `${raSai.length}/${goDuoc.length} ô ra ${raSai[0].v} (máy đo là mm/dd/yyyy — ĐÂY LÀ THỨ TỰ CỦA TRÌNH DUYỆT, ERP không đổi được)` : 'tất cả ra 1990-01-25');
const khongNoi = goDuoc.filter(x => x.an || !x.doc || !/^= \d\d\/\d\d\/\d{4}/.test(x.doc));
ok(`D1 · … và ${goDuoc.length}/${goDuoc.length} ô ĐỀU hiện DÒNG ĐỌC LẠI nói ra ngày ERP hiểu`,
   khongNoi.length === 0, JSON.stringify(khongNoi.map(x => ({ id: x.id, an: x.an, doc: x.doc }))));
const docKhop = goDuoc.filter(x => {
  const m = /^= (\d\d)\/(\d\d)\/(\d{4})/.exec(x.doc || '');
  return !m || `${m[3]}-${m[2]}-${m[1]}` !== x.v;
});
ok('D1 · … dòng đọc lại nói ĐÚNG giá trị đang có trong ô (không phải câu chung)',
   docKhop.length === 0, JSON.stringify(docKhop.map(x => ({ id: x.id, v: x.v, doc: x.doc }))));
const oSinh = goDuoc.filter(x => /ngaysinh|NgaySinh/.test(x.id));
ok('D1 · ô ngày sinh kèm SỐ TUỔI', oSinh.every(x => /tuổi/.test(x.doc || '')),
   JSON.stringify(oSinh.map(x => x.doc)));
ok(`D1 · số ô gõ thử được`, goDuoc.length >= 9,
   `${goDuoc.length}/${R.d1.length} · bỏ qua ${JSON.stringify(R.d1.filter(x => x.boQua).map(x => x.id))}`);

/* D2 — năm nhuận + tuổi */
ok('D2 · 29/02/2000 (năm nhuận) đọc lại đúng + tính tuổi được',
   R.d2.nhuan2000.doc === '29/02/2000' && R.d2.nhuan2000.tuoi === 26, JSON.stringify(R.d2.nhuan2000));
ok('D2 · tuổi ĐÚNG SINH NHẬT HÔM NAY = 30', R.d2.dungHomNay.tuoi === 30, JSON.stringify(R.d2.dungHomNay));
ok('D2 · sinh nhật NGÀY MAI thì vẫn 29 tuổi', R.d2.sinhNhatMai.tuoi === 29, JSON.stringify(R.d2.sinhNhatMai));
ok('D2 · sinh nhật HÔM QUA thì đã 30 tuổi', R.d2.sinhNhatHomQua.tuoi === 30, JSON.stringify(R.d2.sinhNhatHomQua));
ok('D2 · chuỗi rác / rỗng → không tính bừa ra tuổi',
   R.d2.rac === null && R.d2.rong === null, JSON.stringify([R.d2.rac, R.d2.rong]));

/* D3 — hộp có phải cuộn thêm không */
for (const k of R.d3.kq) {
  ok(`D3 · @${RONG}px ${k.sel} (${k.soO} ô ngày): riêng dòng đọc lại chiếm ${k.caoNhac}px`,
     k.caoNhac <= 30 * k.soO, JSON.stringify(k));
  ok(`D3 · … và KHÔNG biến một hộp vốn vừa màn thành hộp phải cuộn`,
     !(k.phaiCuon && !k.phaiCuonTruoc), JSON.stringify(k));
}
ok(`D3 · @${RONG}px không tràn ngang`, !R.d3.tranNgang, String(R.d3.tranNgang));

/* E — gán `.value` không bắn `input` */
for (const r of R.e) {
  if (r.thieu) { ok(`E · ${r.id} — không tìm thấy ô`, false, ''); continue; }
  /* `nsSua-ngaysinh` là CA ĐỐI CHỨNG: đây là ô DUY NHẤT mã sản phẩm đã sửa
     để bắn `input` sau khi gán (`datNgay`, app.js:5357). Ở đây tôi cố tình
     gán KHÔNG bắn — nó PHẢI đỏ, nếu không thì phép đo này không có mắt và
     ba ca kia không chứng minh được gì. */
  const doiChung = r.id === 'nsSua-ngaysinh';
  if (doiChung) {
    ok(`E · ĐỐI CHỨNG ${r.id}: gán \`.value\` mà KHÔNG bắn \`input\` thì dòng đỏ PHẢI dính lại — phép đo có mắt`,
       r.doB.do === true, `còn đỏ: ${r.doB.do} · câu: "${r.doB.chu}"`);
    continue;
  }
  ok(`E · ${r.id}: mã sản phẩm gán thẳng \`.value\` giá trị HỢP LỆ sau một lần gõ sai → dòng đỏ cũ phải BIẾN MẤT`,
     !r.doB.do && !r.doB.vienDo,
     `còn đỏ: ${r.doB.do} · viền đỏ: ${r.doB.vienDo} · ô đang là "${r.doB.giaTri}" · câu: "${r.doB.chu}"`);
}
ok('E2 · đi ĐÚNG đường `datNgay` (gán + bắn `input`): dòng đỏ biến mất, đọc lại theo giá trị mới',
   !R.e2.B.do && !R.e2.C.do && /25\/01\/1990/.test(R.e2.C.chu || ''), JSON.stringify(R.e2));

/* H9 */
ok('H9 · bấm thông báo "nhận xét" (tin CÓ `lien_ket` như máy chủ thật) → MỞ đúng hộp nhận xét',
   !!R.h9.hopMo, JSON.stringify(R.h9));
ok('H9 · … và biểu tượng riêng 💬 chứ không rơi về 🔔', R.h9.bieuTuong === '💬', JSON.stringify(R.h9.bieuTuong));

/* C — dải cắt */
for (const r of R.c) {
  const phaiHien = /bị cắt/.test(r.ten);
  ok(`C · ${r.ten}: dải cắt ${phaiHien ? 'PHẢI hiện' : 'KHÔNG được hiện'}`,
     !!r.daiHien === phaiHien, JSON.stringify(r));
}
const ca101 = R.c.find(r => /cắt 1\)/.test(r.ten));
ok('C · câu dải cắt nói đúng số và đúng đơn vị "nhận xét"',
   /100/.test(ca101?.daiChu || '') && /101/.test(ca101?.daiChu || '') && /nhận xét/.test(ca101?.daiChu || ''),
   ca101?.daiChu || '');
const ca0 = R.c.find(r => /0 nhận xét/.test(r.ten));
ok('C · 0 nhận xét thật → CÓ nói "chưa có nhận xét nào" và KHÔNG có dải cắt',
   ca0?.noiChuaCo === true && ca0?.daiHien === false, JSON.stringify(ca0));

/* min/max cả 17 ô */
console.log('\n  BẢNG min/max CỦA CẢ ' + R.minmax.length + ' Ô NGÀY TRÊN app.html');
R.minmax.forEach(o => console.log(`    ${o.id.padEnd(20)} ${o.kieu.padEnd(12)} ${o.min} … ${o.max}`));
const quaKhu = R.minmax.filter(o => o.kieu === 'qua-khu').map(o => o.id);
ok('E3 · chỉ còn ĐÚNG những ô nghĩa "đã xảy ra" mang luật `qua-khu`',
   quaKhu.every(id => /NgayMua|BanHanh/.test(id)), JSON.stringify(quaKhu));

ok('· 0 lỗi console, 0 ngoại lệ', R.loiConsole.length === 0 && R.ngoaiLe.length === 0,
   JSON.stringify([R.loiConsole, R.ngoaiLe]).slice(0, 600));

tongKet();
