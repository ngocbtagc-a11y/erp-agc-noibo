/* ==========================================================================
   BÀN SOI ĐỘC LẬP — REV-0057 (Hồ Ly, 03/09/2026)
   ---------------------------------------------------------------------------
   KHÔNG phải bàn đo của cổng. Đây là bàn SOI: dựng lại đúng những ca mà bản
   giao việc yêu cầu phải nghi ngờ, rồi in RA SỐ.

     A. "Tab đang ẩn: 0 lệnh gọi" — có đúng cho MỌI nhóm không?
     B. Máy chủ trả LỖI thì có bắn tín hiệu nhầm không?
     C. Vòng lặp vô tận: nạp lại có kéo theo nạp lại nữa không?
     D. Rò rỉ đăng ký: mở/đóng tab 20 lần rồi bấm một nút.
     E. Gõ dở ở ô KHÔNG nằm trong vùng có khai `goc`.
     F. Một người bấm 10 nút trong 3 giây thì gộp lại còn mấy lượt.
     G. Vai trò chị Phan Thị Hằng (kế toán trưởng, không thao_tac_van_hanh):
        màn Đối soát sàn sống hay chết — đo trên CẢ origin/main lẫn bản vá.
     H. Quét cả lớp G: chạy 5 vai trò khác nhau, đếm ngoại lệ.

   Chạy:  node scripts/soi-tu-lam-moi.mjs
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';

const MAIN = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: GOC }).toString().trim();

const QUYEN_DU = ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu',
                  'khovan', 'kinhdoanh', 'ketoan', 'taisan', 'xepca', 'donhoan',
                  'khotailieu', 'quantri', 'congviec', 'muctieu'];

function traLoiChung(duong, traJson) {
  if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
  if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
  if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
  if (duong === '/api/muc-tieu/danh-sach')
    return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
  if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
  if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach: [] }) || true;
  if (duong === '/api/kinh-doanh/don-hang-huy') return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
  if (duong === '/api/ke-toan/can-tra-soat') return traJson({ can_tra_soat: [] }) || true;
  if (duong === '/api/ke-toan/hang-hong') return traJson({ hang_hong: [] }) || true;
  if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 1 } }) || true;
  if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
  if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
  if (duong === '/api/quan-tri/danh-sach')
    return traJson({ nhan_su: [], tai_khoan: [], vai_tro: [] }) || true;
  if (duong === '/api/nhan-su/viec-can-lam')
    return traJson({ hop_dong_thieu: [], hop_dong_sap_het: [], mtcv_thieu: [] }) || true;
  return false;
}

async function moPhien({ commit = null, toi = {}, hong = null } = {}) {
  const dem = new Map();
  let choHong = hong;
  const may = await dungMayGia({
    commit, tatHoatAnh: true,
    suaTep: (s, f) => f === 'assets/js/app.js'
      ? s + `\nwindow.__API = API;\nimport('./lam-moi.js').then(m => { window.__SO_LUOT = m.soLuot; });\n`
      : s,
    apiRieng: (duong, u, traJson) => {
      dem.set(duong, (dem.get(duong) || 0) + 1);
      if (choHong && duong === choHong) { traJson({ loi: 'Máy chủ giả vờ hỏng' }, 500); return true; }
      if (duong === '/api/toi-la-ai') {
        return traJson({
          ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
          phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
          trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: 1,
          them_nhan_su: 1, thao_tac_van_hanh: 1, quyen: QUYEN_DU, shopee: { xem: 1 },
          ...toi
        }) || true;
      }
      return traLoiChung(duong, traJson);
    }
  });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3000 });
  return {
    cr, may, dem,
    datLai() { dem.clear(); },
    lay: d => dem.get(d) || 0,
    tong() { return [...dem.values()].reduce((a, b) => a + b, 0); },
    in() { return [...dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · '); },
    datHong(d) { choHong = d; },
    dong() { cr.dong(); may.dong(); }
  };
}

const bd = t => console.log(`\n──────── ${t}`);

/* ==========================================================================
   A · "TAB ĐANG ẨN = 0 LỆNH GỌI" — thử với NHIỀU nhóm, không chỉ tai_san
   ========================================================================== */
bd('A · Đang đứng ở tab Tổng quan, ghi vào các nhóm khác — có nạp không?');
{
  const p = await moPhien();
  const dangO = await p.cr.chay(`[...document.querySelectorAll('[id^="v-"]')].filter(x => !x.hidden).map(x => x.id).join(',')`);
  console.log('  Tab đang hiện lúc mở trang:', dangO);

  const ca = [
    ['tai_san    (taiSanSua)',      `taiSanSua({id:1,ten:'x'})`,               '/api/tai-san'],
    ['kho        (khoSuaSanPham)',  `khoSuaSanPham({id:1,ten:'x'})`,           '/api/kho/san-pham'],
    ['hoan       (kdDaDoiSoat)',    `kdDaDoiSoat('RS1')`,                      '/api/hoan/danh-sach'],
    ['nhan_su    (qtSuaNhanSu)',    `qtSuaNhanSu({id:'NS-DUY'})`,              '/api/quan-tri/danh-sach'],
    ['ho_so      (nsHopDongLuu)',   `nsHopDongLuu({id:'NS-DUY'})`,             '/api/nhan-su/viec-can-lam'],
    ['du_lieu_nen(dlnSuaPhongBan)', `dlnSuaPhongBan(1,{ten:'x'})`,             '/api/du-lieu-nen/phong-ban']
  ];
  for (const [ten, goi, duong] of ca) {
    p.datLai();
    await p.cr.chay(`window.__API.${goi}.catch(()=>{})`);
    await p.cr.doi(500);
    const n = p.lay(duong);
    console.log(`  ${ten.padEnd(28)} → ${duong.padEnd(34)} ${n} lượt   ${n === 0 ? '(ngủ ✔)' : '⚠ VẪN GỌI DÙ TAB ĐANG ẨN'}`);
    console.log(`      toàn bộ lượt gọi: ${p.in()}`);
  }
  p.dong();
}

/* ==========================================================================
   B · MÁY CHỦ TRẢ LỖI THÌ CÓ BẮN TÍN HIỆU NHẦM KHÔNG
   ========================================================================== */
bd('B · Ghi HỎNG (500) — có nạp lại vô ích không?');
{
  const p = await moPhien({ hong: '/api/cong-viec/cap-nhat' });
  p.datLai();
  await p.cr.chay(`window.__API.cvCapNhat(1,'hoan_thanh','xong').catch(()=>{})`);
  await p.cr.doi(700);
  console.log(`  Sau khi ghi hỏng: ${p.tong()} lệnh gọi  →  ${p.in() || '(không gọi gì thêm — đúng)'}`);
  const sl = await p.cr.chay(`JSON.stringify(window.__SO_LUOT ? window.__SO_LUOT() : {})`);
  console.log('  Đài:', sl);
  p.dong();
}

/* ==========================================================================
   C · VÒNG LẶP — sau khi lắng, còn gọi tiếp không?
   ========================================================================== */
bd('C · Vòng lặp vô tận: đợi 5 giây sau một cú ghi');
{
  const p = await moPhien();
  p.datLai();
  await p.cr.chay(`window.__API.cvCapNhat(1,'hoan_thanh','xong').catch(()=>{})`);
  await p.cr.doi(1200);
  const sau1 = p.tong();
  await p.cr.doi(4000);
  const sau2 = p.tong();
  console.log(`  Sau 1,2 giây: ${sau1} lệnh gọi · sau thêm 4 giây nữa: ${sau2} lệnh gọi`);
  console.log(`  ${sau2 === sau1 ? '✔ Đứng yên — không có vòng lặp' : '⚠ VẪN GỌI TIẾP: ' + p.in()}`);
  p.dong();
}

/* ==========================================================================
   D · RÒ RỈ ĐĂNG KÝ — mở/đóng tab 20 lần rồi bấm 1 nút
   ========================================================================== */
bd('D · Mở/đóng tab 20 lần rồi ghi một lần');
{
  const p = await moPhien();
  const truoc = await p.cr.chay(`(() => { let n = 0; return n; })()`);
  p.datLai();
  await p.cr.chay(`window.__API.cvCapNhat(1,'hoan_thanh','xong').catch(()=>{})`);
  await p.cr.doi(700);
  const lan1 = p.tong(), in1 = p.in();

  await p.cr.chay(`(async () => {
    for (let i = 0; i < 20; i++) {
      document.querySelector('.sb-item[data-tab="taisan"]')?.click();
      document.querySelector('.sb-item[data-tab="tongquan"]')?.click();
    }
  })()`);
  await p.cr.doi(1500);
  p.datLai();
  await p.cr.chay(`window.__API.cvCapNhat(1,'hoan_thanh','xong').catch(()=>{})`);
  await p.cr.doi(700);
  console.log(`  Lượt ghi ĐẦU  : ${lan1} lệnh gọi → ${in1}`);
  console.log(`  Sau 20 vòng   : ${p.tong()} lệnh gọi → ${p.in()}`);
  console.log(`  ${p.tong() === lan1 ? '✔ Không chồng chất' : '⚠ CHỒNG CHẤT ĐĂNG KÝ'}`);
  console.log('  Đài:', await p.cr.chay(`JSON.stringify(window.__SO_LUOT())`));
  p.dong();
}

/* ==========================================================================
   E · GÕ DỞ Ở Ô KHÔNG NẰM TRONG VÙNG CÓ KHAI `goc`
   ========================================================================== */
bd('E · Gõ dở ở ô tìm kiếm Nhân sự (#ns-tim) khi có ghi nhóm nhan_su');
{
  const p = await moPhien();
  await p.cr.chay(`document.querySelector('.sb-item[data-tab="nhansu"]')?.click()`);
  await p.cr.doi(600);
  const dat = await p.cr.chay(`(() => {
    const o = document.querySelector('#ns-tim');
    if (!o) return 'KHÔNG CÓ Ô';
    o.value = 'Duy đang gõ dở'; o.focus();
    return document.activeElement === o ? 'ok' : 'không focus được';
  })()`);
  p.datLai();
  await p.cr.chay(`window.__API.qtSuaNhanSu({id:'NS-DUY'}).catch(()=>{})`);
  await p.cr.doi(400);
  const conChu = await p.cr.chay(`document.querySelector('#ns-tim') && document.querySelector('#ns-tim').value`);
  const conFocus = await p.cr.chay(`document.activeElement && document.activeElement.id`);
  console.log(`  đặt con trỏ: ${dat}`);
  console.log(`  gọi máy chủ ngay lúc đang gõ: ${p.lay('/api/quan-tri/danh-sach')} lượt (0 = có hoãn, 1 = KHÔNG hoãn)`);
  console.log(`  chữ còn lại: "${conChu}" · con trỏ ở: "${conFocus}"`);
  console.log('  Đài:', await p.cr.chay(`JSON.stringify(window.__SO_LUOT())`));
  p.dong();
}

/* ==========================================================================
   F · BẤM 10 NÚT TRONG 3 GIÂY
   ========================================================================== */
bd('F · Bấm 10 nút liên tiếp (mỗi 250ms) — gộp được mấy lượt?');
{
  const p = await moPhien();
  p.datLai();
  await p.cr.chay(`(async () => {
    for (let i = 0; i < 10; i++) {
      window.__API.cvCapNhat(i, 'hoan_thanh', 'xong').catch(()=>{});
      await new Promise(r => setTimeout(r, 250));
    }
  })()`);
  await p.cr.doi(4000);
  const ghi = p.lay('/api/cong-viec/cap-nhat');
  console.log(`  10 cú ghi (${ghi} lệnh ghi) → tổng ${p.tong()} lệnh gọi`);
  console.log(`  chi tiết: ${p.in()}`);
  console.log('  Đài:', await p.cr.chay(`JSON.stringify(window.__SO_LUOT())`));

  /* Ca xấu hơn: 10 cú TRONG CÙNG một khoảnh khắc */
  p.datLai();
  await p.cr.chay(`(() => { for (let i = 0; i < 10; i++) window.__API.cvCapNhat(i,'hoan_thanh','x').catch(()=>{}); })()`);
  await p.cr.doi(2500);
  console.log(`  10 cú CÙNG LÚC → tổng ${p.tong()} lệnh gọi · ${p.in()}`);
  p.dong();
}

/* ==========================================================================
   G · VAI TRÒ CHỊ PHAN THỊ HẰNG — KẾ TOÁN TRƯỞNG, KHÔNG thao_tac_van_hanh
   ========================================================================== */
bd('G · Kế toán trưởng (thao_tac_van_hanh = 0) mở tab Kinh doanh');
for (const [nhan, commit] of [['TRƯỚC (origin/main)', MAIN], ['SAU  (bản vá)', null]]) {
  const p = await moPhien({
    commit,
    toi: {
      ho_ten: 'Phan Thị Hằng', chuc_danh: 'Kế toán trưởng', phong_ban: 'Kế toán',
      vai_tro: 'ke_toan', la_admin: 0, them_nhan_su: 0, thao_tac_van_hanh: 0,
      quyen: ['tongquan', 'chat', 'gopy', 'kinhdoanh', 'ketoan', 'donhoan', 'congviec']
    }
  });
  await p.cr.chay(`document.querySelector('.sb-item[data-tab="kinhdoanh"]')?.click()`);
  await p.cr.doi(800);
  const loi = [...p.cr.ngoaiLe, ...p.cr.loiConsole.filter(l => !/favicon|404/.test(l))];
  const song = await p.cr.chay(`(() => {
    const o = document.querySelector('#kd-doisoat-panel');
    return o ? (o.hidden ? 'PANEL BỊ ẨN' : 'panel hiện') : 'KHÔNG CÓ PANEL';
  })()`);
  const bang = await p.cr.chay(`(() => {
    const o = document.querySelector('#kd-ds-dem');
    return o ? (o.textContent || '(rỗng)') : 'KHÔNG CÓ';
  })()`);
  const doiSoat = p.lay('/api/kinh-doanh/can-doi-soat');
  console.log(`  ${nhan}`);
  console.log(`     Đối soát panel : ${song} · #kd-ds-dem = "${bang}" · gọi can-doi-soat ${doiSoat} lượt`);
  console.log(`     Ngoại lệ/console lỗi (${loi.length}): ${loi.slice(0, 3).join(' | ') || 'sạch'}`);
  p.dong();
}

/* ==========================================================================
   H · QUÉT CẢ LỚP — 5 vai trò, đếm ngoại lệ trên bản vá
   ========================================================================== */
bd('H · Quét cả lớp: nhiều vai trò, mở HẾT tab, đếm ngoại lệ (bản vá)');
const VAI = [
  ['Kho — Phạm Khương Duy', { them_nhan_su: 0, la_admin: 0, thao_tac_van_hanh: 1,
    quyen: ['tongquan', 'khovan', 'donhoan', 'chat', 'congviec'] }],
  ['Kế toán — Phan Thị Hằng', { them_nhan_su: 0, la_admin: 0, thao_tac_van_hanh: 0,
    quyen: ['tongquan', 'ketoan', 'kinhdoanh', 'donhoan', 'chat', 'congviec'] }],
  ['HCNS — Vũ Lan Hương', { them_nhan_su: 1, la_admin: 0, thao_tac_van_hanh: 0,
    quyen: ['tongquan', 'nhansu', 'xepca', 'khotailieu', 'chat', 'congviec'] }],
  ['Vận hành sàn — Nguyễn Thị Huyền', { them_nhan_su: 0, la_admin: 0, thao_tac_van_hanh: 1,
    quyen: ['tongquan', 'kinhdoanh', 'donhoan', 'khovan', 'chat', 'congviec'] }],
  ['Nhân viên trơn', { them_nhan_su: 0, la_admin: 0, thao_tac_van_hanh: 0,
    quyen: ['tongquan', 'chat', 'congviec'] }]
];
for (const [ten, toi] of VAI) {
  for (const [nhan, commit] of [['main', MAIN], ['vá  ', null]]) {
    const p = await moPhien({ commit, toi: { ...toi, shopee: { xem: 1 } } });
    await p.cr.chay(`(async () => {
      for (const b of document.querySelectorAll('.sb-item[data-tab]')) { b.click(); await new Promise(r => setTimeout(r, 120)); }
    })()`);
    await p.cr.doi(2500);
    const loi = [...p.cr.ngoaiLe, ...p.cr.loiConsole.filter(l => !/favicon|404/.test(l))];
    console.log(`  ${ten.padEnd(32)} [${nhan}] ngoại lệ: ${loi.length}${loi.length ? '  → ' + loi.slice(0, 2).join(' | ').slice(0, 160) : ''}`);
    p.dong();
  }
}

console.log('\nXong bàn soi.\n');
