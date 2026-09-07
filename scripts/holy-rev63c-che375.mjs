/* HỒ LY · REV-0063 vòng 3 — ở 375px cái gì CHE 8–9px đáy nút "Xem thêm"? */
import { dungMayGia, moChrome, TOI } from './lib/ban-do-chrome.mjs';
const TEN_DAI = 'Hạnh nhân Mỹ nguyên vỏ rang mộc không muối nhập khẩu California hũ 500g — lô nhập tháng 8/2026';
const API_SKU = (d, u, tra) => {
  if (d === '/api/toi-la-ai') { tra({ ...TOI, la_admin: true, quyen: [...TOI.quyen, 'kinhdoanh'] }); return true; }
  if (d === '/api/kinh-doanh/xep-hang-sku') {
    const h = (i, t, s) => ({ sku: 'AGC-NK-' + (1000 + i), ten: t, so_luong: s, doanh_thu: 9876543210 });
    tra({ co_bang: true, nguon_xep_hang: 'don_hang', so_ma_hang: 120, so_ma_ban_duoc: 96, ky: { nhan: 'Tháng 8/2026' },
      ban_chay: [h(1, TEN_DAI, 412), h(2, TEN_DAI + ' loại 2', 388), h(3, 'Óc chó Chile', 300)],
      ban_kem: [h(4, TEN_DAI, 3), h(5, TEN_DAI + ' loại 2', 1), h(6, 'Nho khô Úc', 0)] });
    return true;
  }
  return false;
};
const MO = `(function(){ if (typeof window.moTab==='function'){try{window.moTab('kinhdoanh');}catch(e){}}
  const t=document.querySelector('[data-tab="kinhdoanh"]'); if(t)t.click(); return 1; })()`;

const SOI = `(function(){
  const nut = document.querySelector('#kd-sku-chay .dai-gon-btn');
  if (!nut) return { loi: 'không có nút' };
  nut.scrollIntoView({ block: 'center' });
  const r = nut.getBoundingClientRect();
  const cx = Math.round(r.left + r.width / 2);
  const mo = (e) => e ? (e.tagName + '.' + (e.className || '') + (e.id ? '#' + e.id : '')) : 'null';
  const diem = [];
  for (let y = Math.floor(r.top); y <= Math.ceil(r.bottom) + 2; y++) {
    const e = document.elementFromPoint(cx, y);
    const laNut = e && (e === nut || nut.contains(e));
    diem.push({ dy: +(y - r.top).toFixed(0), laNut, el: laNut ? 'NÚT' : mo(e) });
  }
  const td = nut.closest('td'), tr = nut.closest('tr');
  const cs = getComputedStyle(nut), csTd = getComputedStyle(td), csTr = getComputedStyle(tr);
  const sau = nut.nextElementSibling, truoc = nut.previousElementSibling;
  const rTd = td.getBoundingClientRect();
  return { hop: { w: +r.width.toFixed(1), h: +r.height.toFixed(1), top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1) },
    o: { top: +rTd.top.toFixed(1), bottom: +rTd.bottom.toFixed(1), overflow: csTd.overflow, pos: csTd.position, disp: csTd.display },
    tr: { disp: csTr.display, pos: csTr.position },
    nutCss: { pos: cs.position, z: cs.zIndex, mb: cs.marginBottom, disp: cs.display },
    keSau: sau ? mo(sau) : null, keTruoc: truoc ? mo(truoc) : null,
    diem: diem.filter((d, i) => !d.laNut || i === 0 || diem[i-1].laNut !== d.laNut) };
})()`;

const may = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU });
for (const RONG of [375, 1440]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(MO); await cr.doi(1000);
  const k = await cr.chay(SOI);
  console.log(`\n═══ ${RONG}px ═══`);
  console.log(JSON.stringify(k, null, 1));
  cr.dong();
}
may.dong();
