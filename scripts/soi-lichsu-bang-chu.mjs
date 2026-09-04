/* ==========================================================================
   AI ĐÚNG Ở VỪA-1 — ĐO BẰNG CHỮ TRÊN MÀN HÌNH  (Hồ Ly, REV-0057 vòng 5)
   ---------------------------------------------------------------------------
   Vòng 4 tôi kết luận "danh sách Lịch sử làm việc khai đã nối dây nhưng
   KHÔNG" — bằng chứng: `/api/cong-viec/lich-su` **0 lượt**. Khỉ Đột đo lại và
   nói ngược: 0 lượt ở đó là ĐÚNG và TIẾT KIỆM, vì bảng vẽ từ
   `window.CV_DU_LIEU_CUA_TOI` mà `lamMoiCacManLienQuanCv` vừa nạp mới.

   Đúng bài học tôi tự rút ra vòng 4 — *"đếm lượt gọi mạng là phép đo GIÁN
   TIẾP"* — bàn này chấm bằng **CHỮ TRONG BẢNG**, thứ Sếp thật sự nhìn.

   Bốn ca:
     A. Chưa bấm "Tải thêm" · đứng ở Lịch sử làm việc · duyệt một việc
        → chữ trong bảng có đổi không, tốn mấy lượt gọi?
     B. ĐÃ bấm "Tải thêm" rồi mới duyệt
        → có giữ được các trang đã tải không, chữ có đổi không?
     C. Bấm "Tải thêm" → rời tab → quay lại → duyệt
        → cờ "đã bấm" còn nhớ, hay reset về nạp lại (mất trang)?
     D. Lịch sử hoàn: chưa bấm thì nghe, bấm rồi thì thôi.

   Chạy:  node scripts/soi-lichsu-bang-chu.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';

const QUYEN = ['tongquan', 'lichsuviec', 'chat', 'congviec', 'muctieu',
               'khovan', 'donhoan', 'kinhdoanh', 'taisan'];

/* Máy chủ giả: hai việc, trạng thái đổi được giữa chừng. */
let tt = ['cho_duyet', 'cho_duyet'];
let trangCu = false;              // đã trả trang cũ hơn chưa
const dem = new Map();

const viec = (i, trangThai, cu = false) => ({
  id: i, tieu_de: (cu ? 'Việc CŨ ' : 'Việc thử ') + i, trang_thai: trangThai,
  han_chot: null, nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy',
  nguoi_giao_id: TOI_ID, nguoi_giao_ten: 'Bùi Thị Ngọc',
  cap_nhat_luc: '2026-09-01 10:00:00', tao_luc: '2026-09-01 10:00:00'
});

const may = await dungMayGia({
  tatHoatAnh: true,
  suaTep: (s, f) => f === 'assets/js/app.js' ? s + '\nwindow.__API = API;\n' : s,
  apiRieng: (duong, u, traJson) => {
    dem.set(duong, (dem.get(duong) || 0) + 1);
    if (duong === '/api/toi-la-ai') return traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: 1,
      them_nhan_su: 1, thao_tac_van_hanh: 1, phong_ban_quan_ly: [],
      quyen: QUYEN, shopee: { xem: 1 }
    }) || true;
    if (duong === '/api/cong-viec/danh-sach')
      return traJson({ nhan: [viec(1, tt[0]), viec(2, tt[1])],
                       giao: [viec(1, tt[0]), viec(2, tt[1])] }) || true;
    if (duong === '/api/cong-viec/lich-su') {
      const sau = u.searchParams.get('truoc');
      /* Trang 1 = hai việc mới; "tải thêm" = một việc CŨ nữa. */
      if (sau) return traJson({ viec: [viec(9, 'hoan_thanh', true)], truoc_tiep: null, cat: null }) || true;
      return traJson({
        viec: [viec(1, tt[0]), viec(2, tt[1])],
        truoc_tiep: 'moc|2', cat: { gioi_han: 2, tong: 3 }
      }) || true;
    }
    if (duong === '/api/hoan/lich-su') {
      const sau = u.searchParams.get('truoc');
      if (sau) return traJson({ don_hoan: [{ return_sn: 'RS-CU', order_sn: 'O9' }], truoc_tiep: null, cat: null }) || true;
      return traJson({ don_hoan: [{ return_sn: trangCu ? 'RS-MOI' : 'RS-1', order_sn: 'O1' }],
                       truoc_tiep: 'moc|1', cat: null }) || true;
    }
    if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
    if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
    if (duong === '/api/muc-tieu/danh-sach')
      return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
    if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
    if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
    if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 0 } }) || true;
    if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
    if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach_hang: [] }) || true;
    if (duong === '/api/kinh-doanh/don-hang-huy')
      return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
    return false;
  }
});
const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3500 });

const moTab = async (t) => {
  await cr.chay(`(() => { const b = document.querySelector('.sb-item[data-tab="${t}"]'); if (b) b.click(); })()`);
  await cr.doi(900);
};
/* CHỮ trong bảng Lịch sử làm việc — thứ Sếp nhìn. */
const chuLSCV = () => cr.chay(`(() => {
  const b = document.querySelector('#ls-cv-bang');
  if (!b) return 'KHÔNG CÓ BẢNG #ls-cv-bang';
  return [...b.querySelectorAll('tr')].map(r =>
    [...r.querySelectorAll('td')].map(c => c.textContent.trim()).join(' | ')
  ).filter(Boolean).join('  ||  ').slice(0, 260) || '(bảng rỗng)';
})()`);
const chuLSH = () => cr.chay(`(() => {
  const b = document.querySelector('#ls-bang');
  if (!b) return 'KHÔNG CÓ BẢNG';
  return (b.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160) || '(rỗng)';
})()`);

let dat = 0, truot = 0;
const ok = (t, d, c = '') => { d ? (dat++, console.log(`  ✅ ${t}` + (c ? `  — ${c}` : '')))
                                 : (truot++, console.log(`  ❌ ${t}` + (c ? `  — ${c}` : ''))); };
const luot = () => [...dem.entries()].filter(([d]) => !/chat\//.test(d))
  .map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · ') || '(0)';

console.log('\n──── A · CHƯA bấm "Tải thêm" — duyệt một việc, chữ có đổi không?');
await moTab('lichsuviec');
const a0 = await chuLSCV();
console.log(`   trước: ${a0}`);
tt = ['hoan_thanh', 'dang_lam'];
dem.clear();
await cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'x').catch(() => {})`);
await cr.doi(1400);
const a1 = await chuLSCV();
console.log(`   sau  : ${a1}`);
console.log(`   lượt gọi: ${luot()}`);
ok('A1 CHỮ trong bảng ĐÃ ĐỔI (không cần F5)', a1 !== a0 && /Hoàn thành|hoan_thanh/i.test(a1),
  a1 === a0 ? 'không đổi — bảng nói dối' : 'đổi đúng');
ok('A2 không tốn thêm lượt gọi cvLichSu', (dem.get('/api/cong-viec/lich-su') || 0) === 0,
  `cvLichSu ${dem.get('/api/cong-viec/lich-su') || 0} lượt`);

console.log('\n──── B · ĐÃ bấm "Tải thêm" rồi mới duyệt');
const daBam = await cr.chay(`(() => {
  const v = document.querySelector('#v-lichsuviec');
  if (!v || v.hidden) return 'TAB KHÔNG MỞ';
  const n = [...v.querySelectorAll('button')].find(b => /Tải thêm/i.test(b.textContent));
  if (!n) return 'KHÔNG THẤY NÚT';
  n.click(); return 'đã bấm';
})()`);
await cr.doi(1500);
const b0 = await chuLSCV();
console.log(`   sau khi bấm Tải thêm (${daBam}): ${b0}`);
const coTrangCu = /Việc CŨ/.test(b0);
ok('B1 bấm được "Tải thêm" và trang cũ đã vào bảng', coTrangCu, coTrangCu ? 'có "Việc CŨ"' : b0);
tt = ['huy', 'hoan_thanh'];
dem.clear();
await cr.chay(`window.__API.cvCapNhat(2, 'hoan_thanh', 'x').catch(() => {})`);
await cr.doi(1400);
const b1 = await chuLSCV();
console.log(`   sau khi duyệt: ${b1}`);
console.log(`   lượt gọi: ${luot()}`);
ok('B2 trang cũ KHÔNG bị vứt mất', /Việc CŨ/.test(b1), /Việc CŨ/.test(b1) ? 'còn' : 'MẤT');
ok('B3 chữ vẫn cập nhật dù đang giữ nhiều trang', b1 !== b0, b1 === b0 ? 'không đổi' : 'đổi');

console.log('\n──── C · Bấm "Tải thêm" → rời tab → quay lại → duyệt');
await moTab('tongquan'); await moTab('lichsuviec');
const c0 = await chuLSCV();
ok('C1 rời tab quay lại vẫn giữ trang đã tải', /Việc CŨ/.test(c0),
  /Việc CŨ/.test(c0) ? 'còn "Việc CŨ"' : 'MẤT trang cũ khi quay lại');
tt = ['dang_lam', 'huy'];
dem.clear();
await cr.chay(`window.__API.cvCapNhat(1, 'dang_lam', 'x').catch(() => {})`);
await cr.doi(1400);
const c1 = await chuLSCV();
console.log(`   sau: ${c1}`);
console.log(`   lượt gọi: ${luot()}`);
ok('C2 vẫn giữ trang cũ sau khi duyệt tiếp', /Việc CŨ/.test(c1), /Việc CŨ/.test(c1) ? 'còn' : 'MẤT');

console.log('\n──── D · Lịch sử hoàn: chưa bấm thì nghe, bấm rồi thì thôi');
await moTab('donhoan');
const d0 = await chuLSH();
trangCu = true;
dem.clear();
await cr.chay(`window.__API.kdDaDoiSoat('RS1').catch(() => {})`);
await cr.doi(1400);
const d1 = await chuLSH();
ok('D1 CHƯA bấm "Tải thêm" → tự nạp lại, chữ đổi',
  (dem.get('/api/hoan/lich-su') || 0) >= 1 && d1 !== d0,
  `hoanLichSu ${dem.get('/api/hoan/lich-su') || 0} lượt · "${String(d0).slice(0, 40)}" → "${String(d1).slice(0, 40)}"`);
const bamLS = await cr.chay(`(() => {
  const v = document.querySelector('#v-donhoan');
  if (!v || v.hidden) return 'TAB KHÔNG MỞ';
  const n = [...v.querySelectorAll('button')].find(b => /Tải thêm/i.test(b.textContent));
  if (!n) return 'KHÔNG THẤY NÚT'; n.click(); return 'đã bấm';
})()`);
await cr.doi(1500);
const d2 = await chuLSH();
dem.clear();
await cr.chay(`window.__API.kdDaDoiSoat('RS2').catch(() => {})`);
await cr.doi(1400);
ok('D2 ĐÃ bấm "Tải thêm" → KHÔNG nạp lại nữa (giữ trang)',
  (dem.get('/api/hoan/lich-su') || 0) === 0,
  `bấm: ${bamLS} · hoanLichSu ${dem.get('/api/hoan/lich-su') || 0} lượt · bảng: "${String(d2).slice(0, 50)}"`);

const loi = [...cr.ngoaiLe, ...cr.loiConsole.filter(l => !/favicon|404/.test(l))];
console.log('\nNgoại lệ/console lỗi:', loi.length ? loi.slice(0, 3).join(' | ') : 'sạch');
console.log(`\n══════════════════════════════════════════\nĐẠT ${dat} · TRƯỢT ${truot}\n`);
cr.dong(); may.dong();
