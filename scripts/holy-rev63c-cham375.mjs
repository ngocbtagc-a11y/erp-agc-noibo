/* HỒ LY · REV-0063 vòng 3 — QUÉT DỌC vùng chạm thật của `td .dai-gon-btn`.
 * Hộp `getBoundingClientRect()` nói 44px. Câu hỏi: NGÓN TAY có bấm được đủ
 * 44px ấy không? Quét từng pixel bằng `elementFromPoint` — đúng "đo bằng cả
 * hai cách" mà luật nhà đòi.
 */
import { dungMayGia, moChrome, TOI } from './lib/ban-do-chrome.mjs';

const TEN_DAI = 'Hạnh nhân Mỹ nguyên vỏ rang mộc không muối nhập khẩu California hũ 500g — lô nhập tháng 8/2026';
const API_SKU = (duong, u, traJson) => {
  if (duong === '/api/toi-la-ai') { traJson({ ...TOI, la_admin: true, quyen: [...TOI.quyen, 'kinhdoanh'] }); return true; }
  if (duong === '/api/kinh-doanh/xep-hang-sku') {
    const h = (i, ten, sl) => ({ sku: 'AGC-NK-' + (1000 + i), ten, so_luong: sl, doanh_thu: 9876543210 });
    traJson({ co_bang: true, nguon_xep_hang: 'don_hang', so_ma_hang: 120, so_ma_ban_duoc: 96,
      ky: { nhan: 'Tháng 8/2026' },
      ban_chay: [h(1, TEN_DAI, 412), h(2, TEN_DAI + ' loại 2', 388), h(3, 'Óc chó Chile', 300)],
      ban_kem:  [h(4, TEN_DAI, 3), h(5, TEN_DAI + ' loại 2', 1), h(6, 'Nho khô Úc', 0)] });
    return true;
  }
  return false;
};
const MO = `(function(){
  if (typeof window.moTab === 'function') { try { window.moTab('kinhdoanh'); } catch(e) {} }
  const t = document.querySelector('[data-tab="kinhdoanh"], #tab-kinhdoanh, [href="#kinhdoanh"]');
  if (t) t.click();
  return document.querySelectorAll('#kd-sku-chay tr').length;
})()`;

const QUET = `(function(){
  const ra = [];
  for (const nut of document.querySelectorAll('td .dai-gon-btn')) {
    nut.scrollIntoView({ block: 'center' });
    const r = nut.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const dong = [];
    for (let y = Math.floor(r.top); y <= Math.ceil(r.bottom); y++) {
      const e = document.elementFromPoint(cx, y);
      dong.push(e && (e === nut || nut.contains(e)) ? 1 : 0);
    }
    // dải liên tục dài nhất trúng nút
    let max = 0, cur = 0, dau = -1, dauMax = -1;
    for (let i = 0; i < dong.length; i++) {
      if (dong[i]) { if (!cur) dau = i; cur++; if (cur > max) { max = cur; dauMax = dau; } }
      else cur = 0;
    }
    // quét NGANG ở giữa hộp
    const cy = Math.round(r.top + r.height / 2);
    let ngang = 0;
    for (let x = Math.floor(r.left); x <= Math.ceil(r.right); x++) {
      const e = document.elementFromPoint(x, cy);
      if (e && (e === nut || nut.contains(e))) ngang++;
    }
    const tb = nut.closest('table').tBodies[0];
    ra.push({ ma: tb ? tb.id : '?', hopH: +r.height.toFixed(1), hopW: +r.width.toFixed(1),
      chamCaoLienTuc: max, chamRong: ngang,
      hutTren: dauMax, hutDuoi: dong.length - (dauMax + max),
      ban: dong.join('') });
  }
  return ra;
})()`;

const may = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU });
for (const RONG of [1440, 1024, 414, 390, 375, 360, 320]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(MO); await cr.doi(1000);
  const ds = await cr.chay(QUET);
  console.log(`\n─── ${RONG}px · ${ds.length} nút ───`);
  for (const x of ds) {
    const dat = x.chamCaoLienTuc >= 44 && x.chamRong >= 44;
    console.log(`  ${dat ? '✅' : '❌'} ${x.ma.padEnd(12)} hộp ${x.hopW}×${x.hopH}` +
      ` · VÙNG CHẠM ${x.chamRong}×${x.chamCaoLienTuc}px (hụt trên ${x.hutTren}, hụt dưới ${x.hutDuoi})`);
  }
  cr.dong();
}
may.dong();
console.log('\nXONG.');
