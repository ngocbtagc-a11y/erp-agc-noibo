/* ==========================================================================
   TAB NỀN NGỦ LÂU RỒI MỞ LẠI — CÓ BẮT KỊP KHÔNG?  (Hồ Ly, REV-0057 vòng 3)
   ---------------------------------------------------------------------------
   Bản vá vòng 3 cho tab TRÌNH DUYỆT đang ở nền NGỦ hẳn (`document.hidden`).
   Tiết kiệm được lượt đọc D1 — nhưng "ngủ" mà thành "quên" thì màn hình lại
   nói dối, và **dữ liệu cũ trông như mới còn tệ hơn tốn thêm lệnh gọi**.

   Ca đối chứng của Khỉ Đột (⑪f) chỉ thử MỘT cú ghi rồi mở tab ra ngay. Sáu
   câu dưới đây là những chỗ khuôn `document.hidden` hay hỏng thật:

     A. NHIỀU cú ghi rải ra trong lúc tab nằm nền → mở lại có đúng KHÔNG,
        và có gộp thành MỘT lượt nạp không (đừng nạp 5 lần cho 5 cú ghi).
     B. Ngủ LÂU (nhiều vòng gộp 60ms đã trôi qua) rồi mới mở.
     C. CHUÔNG 🔔 — người nghe KHÔNG khai `goc`, nay cũng bị ngủ theo. Con số
        đỏ trên chuông có bắt kịp không, hay đứng im?
     D. Tab nền + màn TRONG ỨNG DỤNG cũng đang ẩn: mở tab ra rồi mới chuyển
        màn — hai tầng ngủ chồng nhau có đánh thức đủ không?
     E. Ghi ngay TRƯỚC lúc ẩn (đang hiện) rồi ẩn ngay — có mất lượt nạp không?
     F. Ẩn → ghi → mở → KHÔNG ghi thêm → ẩn → mở lại: có nạp thừa không?

   Chạy:  node scripts/soi-tab-nen-bat-kip.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';

const QUYEN = ['tongquan', 'lichsuviec', 'chat', 'congviec', 'muctieu', 'taisan'];
let choDuyet = 2, chuaDoc = 0;
const dem = new Map();

const viec = (i, tt) => ({ id: i, tieu_de: 'Việc ' + i, trang_thai: tt, han_chot: null,
  nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy', nguoi_giao_id: TOI_ID });

const may = await dungMayGia({
  tatHoatAnh: true,
  suaTep: (s, f) => f === 'assets/js/app.js'
    ? s + `\nwindow.__API = API;\nimport('./lam-moi.js').then(m => { window.__SO_LUOT = m.soLuot; });\n` : s,
  apiRieng: (duong, u, traJson) => {
    dem.set(duong, (dem.get(duong) || 0) + 1);
    if (duong === '/api/toi-la-ai') return traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'nhan_vien', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
      la_admin: 0, phong_ban_quan_ly: [], them_nhan_su: 0, thao_tac_van_hanh: 0,
      quyen: QUYEN, shopee: null
    }) || true;
    if (duong === '/api/cong-viec/danh-sach') return traJson({
      nhan: [], giao: [viec(1, choDuyet >= 1 ? 'cho_duyet' : 'dang_lam'),
                       viec(2, choDuyet >= 2 ? 'cho_duyet' : 'dang_lam')] }) || true;
    if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: chuaDoc }) || true;
    if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
    if (duong === '/api/muc-tieu/danh-sach')
      return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
    if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 0 } }) || true;
    return false;
  }
});
const URL_APP = `http://127.0.0.1:${may.cong}/app.html`;
const cr = await moChrome({ url: URL_APP, doiMs: 3000 });

/* Tab 2 — cái sẽ bị đẩy xuống nền. */
const t2 = await cr.goi('Target.createTarget', { url: URL_APP });
const { sessionId: s2 } = await cr.goi('Target.attachToTarget', { targetId: t2.targetId, flatten: true });
await cr.goi('Runtime.enable', {}, s2);
await cr.goi('Page.enable', {}, s2);
await cr.doi(3200);

const chay2 = async (js) => {
  const r = await cr.goi('Runtime.evaluate', { expression: js, returnByValue: true, awaitPromise: true }, s2);
  if (r.exceptionDetails) return 'LỖI: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const the2 = () => chay2(`(() => {
  const b = document.querySelector('#tq-tomtat');
  if (!b) return 'KHÔNG CÓ Ô';
  for (const s of b.querySelectorAll('.stat')) {
    const k = s.querySelector('.k'), v = s.querySelector('.v');
    if (k && v && k.textContent.includes('Việc tôi giao')) return v.textContent.trim();
  }
  return '(không thấy thẻ)';
})()`);
const chuong2 = () => chay2(`(() => {
  const o = document.querySelector('#tbBadge');
  if (!o) return '(không có huy hiệu)';
  return (o.hidden ? 'ẩn' : (o.textContent || '').trim());
})()`);
const an2 = () => chay2('document.hidden');
const dai2 = () => chay2('window.__SO_LUOT ? JSON.stringify(window.__SO_LUOT()) : "?"');

const raTruoc1 = async () => { await cr.goi('Page.bringToFront', {}, cr.sessionId); await cr.doi(700); };
const raTruoc2 = async () => { await cr.goi('Page.bringToFront', {}, s2); await cr.doi(1500); };

let dat = 0, truot = 0;
const ok = (t, d, c = '') => { d ? (dat++, console.log(`  ✅ ${t}` + (c ? `  — ${c}` : '')))
                                 : (truot++, console.log(`  ❌ ${t}` + (c ? `  — ${c}` : ''))); };

console.log('\n──── ĐIỀU KIỆN CỦA PHÉP ĐO');
await raTruoc1();
ok('tab 2 thật sự đang ở NỀN', (await an2()) === true, `document.hidden = ${await an2()}`);
ok('tab 2 đang kể số cũ đúng như lúc mở', (await the2()) === '2', `thẻ = ${await the2()}`);

console.log('\n──── A · NĂM cú ghi rải ra trong lúc tab 2 nằm nền');
dem.clear();
for (let i = 0; i < 5; i++) {
  choDuyet = (i % 2 === 0) ? 0 : 2;
  chuaDoc = i + 1;
  await cr.chay(`window.__API.cvCapNhat(${i}, 'hoan_thanh', 'x').catch(()=>{})`);
  await cr.doi(400);
}
choDuyet = 0; chuaDoc = 7;
await cr.chay(`window.__API.cvCapNhat(9, 'hoan_thanh', 'x').catch(()=>{})`);
await cr.doi(900);
const goiLucAn = [...dem.entries()].filter(([d]) => !/chat\//.test(d));
const nenGoi = goiLucAn.filter(([d]) => d !== '/api/cong-viec/cap-nhat')
  .reduce((a, [, n]) => a + n, 0);
console.log(`   Lượt gọi trong lúc tab 2 ngủ: ${goiLucAn.map(([d, n]) => d.replace('/api/', '') + '×' + n).join(' · ')}`);
/* Bằng chứng ĐÚNG cho "tab 2 không gọi" là bộ đếm CỦA TAB 2 (`chay`), không
   phải tổng lượt gọi máy chủ — tổng đó gồm cả tab 1 đang ở trước và phải nạp.
   Vòng đầu tôi so tổng với 6 rồi báo đỏ oan; 6 cú ghi × 4 lượt nạp của tab 1
   = 24 mới là con số đúng. Sửa phép đo, không sửa sản phẩm. */
const dai = JSON.parse(await dai2());
ok('A1 tab 2 KHÔNG chạy người nghe nào trong lúc ngủ (đếm ở CHÍNH tab 2)',
  dai.chay === 0 && dai.ngu > 0,
  `đài tab 2: chay=${dai.chay} · ngu=${dai.ngu} · ban=${dai.ban}`);
ok('A1b tổng lượt gọi = đúng phần của tab 1, không có phần tab 2',
  nenGoi === 24, `${nenGoi} lượt nạp lại (6 cú ghi × 4 lượt của riêng tab 1)`);
ok('A2 tab 2 vẫn giữ số cũ trong lúc ngủ', (await the2()) === '2', `thẻ = ${await the2()}`);
console.log(`   Đài của tab 2: ${await dai2()}`);

console.log('\n──── B · Ngủ LÂU rồi mới mở (3 giây, nhiều vòng gộp đã trôi)');
await cr.doi(3000);
dem.clear();
await raTruoc2();
const sauKhiMo = [...dem.entries()].filter(([d]) => !/chat\//.test(d));
const soLuotMo = sauKhiMo.reduce((a, [, n]) => a + n, 0);
ok('B1 mở tab 2 ra → thẻ BẮT KỊP, nói 0', (await the2()) === '0',
  `thẻ = ${await the2()}` + ((await the2()) === '2' ? '  ❌ ngủ đã thành QUÊN' : ''));
ok('B2 năm cú ghi gộp thành MỘT lượt nạp, không nạp năm lần',
  soLuotMo > 0 && soLuotMo <= 5,
  `${soLuotMo} lượt: ${sauKhiMo.map(([d, n]) => d.replace('/api/', '') + '×' + n).join(' · ')}`);

console.log('\n──── C · CHUÔNG 🔔 (người nghe KHÔNG khai `goc`) có bắt kịp không');
ok('C1 chuông của tab 2 hiện số mới', String(await chuong2()) === '7',
  `huy hiệu = "${await chuong2()}" (máy chủ đang trả chua_doc = 7)`);

console.log('\n──── D · Hai tầng ngủ: tab nền + màn trong ứng dụng cũng ẩn');
await chay2(`document.querySelector('.sb-item[data-tab="taisan"]')?.click()`);
await cr.doi(600);
await raTruoc1();
choDuyet = 2; chuaDoc = 9;
dem.clear();
await cr.chay(`window.__API.cvCapNhat(1, 'cho_duyet', 'x').catch(()=>{})`);
await cr.doi(900);
await raTruoc2();
const theKhiOTaiSan = await the2();
await chay2(`document.querySelector('.sb-item[data-tab="tongquan"]')?.click()`);
await cr.doi(1200);
ok('D1 mở tab ra khi đang ở màn Tài sản → chuông vẫn bắt kịp',
  String(await chuong2()) === '9', `huy hiệu = "${await chuong2()}"`);
ok('D2 chuyển về màn Tổng quan → thẻ bắt kịp, nói 2',
  (await the2()) === '2', `thẻ = ${await the2()} (lúc còn ở màn Tài sản: ${theKhiOTaiSan})`);

console.log('\n──── E · Ghi ngay TRƯỚC lúc ẩn — có mất lượt nạp không?');
await raTruoc2();
choDuyet = 0; chuaDoc = 11;
dem.clear();
await chay2(`window.__API.cvCapNhat(1, 'hoan_thanh', 'x').catch(()=>{})`);
await cr.goi('Page.bringToFront', {}, cr.sessionId);      // ẩn NGAY, không chờ
await cr.doi(1500);
await raTruoc2();
ok('E1 ghi rồi ẩn ngay → mở lại vẫn đúng', (await the2()) === '0',
  `thẻ = ${await the2()}`);

console.log('\n──── F · Ẩn → mở → ẩn → mở mà KHÔNG ghi gì: có nạp thừa không?');
await raTruoc1(); await cr.doi(400);
dem.clear();
await raTruoc2(); await raTruoc1(); await raTruoc2();
const thua = [...dem.entries()].filter(([d]) => !/chat\//.test(d));
ok('F1 không ghi gì thì mở/ẩn không tốn lệnh gọi nào',
  thua.reduce((a, [, n]) => a + n, 0) === 0,
  thua.length ? thua.map(([d, n]) => d.replace('/api/', '') + '×' + n).join(' · ') : '0 lượt');

const loi = [...cr.ngoaiLe, ...cr.loiConsole.filter(l => !/favicon|404/.test(l))];
console.log('\nNgoại lệ/console lỗi:', loi.length ? loi.slice(0, 3).join(' | ') : 'sạch');
console.log(`\n══════════════════════════════════════════\nĐẠT ${dat} · TRƯỢT ${truot}\n`);
try { await cr.goi('Target.closeTarget', { targetId: t2.targetId }); } catch { /* kệ */ }
cr.dong(); may.dong();
