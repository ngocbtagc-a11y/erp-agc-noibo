/* HỒ LY · REV-0063 vòng 3 — hai phép đo SẠCH mà bản trước của tôi làm bẩn:
 *   ① TỐC ĐỘ A/B: bản NAY (có gỡ nút) vs bản CŨ (chỉ gỡ nút đoán) — cùng cây,
 *      chỉ khác đúng một dòng, sửa trong BẢN TẠM của bàn đo, không đụng kho mã.
 *   ② CHẠM: chỉ mở tab Kinh doanh (KHÔNG mở bừa mọi `[hidden]` — mở bừa thì
 *      cửa sổ bật lên phủ lên bảng và `elementFromPoint` trả về `modal-nen`,
 *      lỗi của phép đo chứ không của nút).
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

const MO_KINHDOANH = `(function(){
  if (typeof window.moTab === 'function') { try { window.moTab('kinhdoanh'); } catch(e) {} }
  const t = document.querySelector('[data-tab="kinhdoanh"], #tab-kinhdoanh, [href="#kinhdoanh"]');
  if (t) t.click();
  const p = document.getElementById('kd-sku') || document.getElementById('kdPane');
  if (p) p.hidden = false;
  // mở đúng khối SKU, KHÔNG mở cửa sổ bật lên
  document.querySelectorAll('#pane-kinhdoanh [hidden], .kd-sku-cot [hidden]').forEach(el => {
    if (!el.closest('template') && !el.classList.contains('modal') && !el.classList.contains('modal-nen')) el.hidden = false;
  });
  return document.querySelectorAll('#kd-sku-chay tr').length + '/' + document.querySelectorAll('#kd-sku-kem tr').length;
})()`;

const NHOI_DO = `(async function(){
  const tb = document.getElementById('kd-sku-kem'); if (!tb || !tb.rows.length) return { loi: 'bảng rỗng' };
  const mau = tb.rows[0].outerHTML;
  let h = ''; for (let i = 0; i < 300; i++) h += mau;
  tb.insertAdjacentHTML('beforeend', h);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise(r => setTimeout(r, 200));
  const lan = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const d = document.createElement('span'); document.body.appendChild(d); d.remove();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    lan.push(+(performance.now() - t0).toFixed(1));
  }
  return { dong: tb.rows.length, sm: document.querySelectorAll('#kd-sku-kem .sm').length,
           nut: document.querySelectorAll('#kd-sku-kem .dai-gon-btn').length, veLai: lan };
})()`;

const CHAM = `(function(){
  const ra = [];
  for (const nut of document.querySelectorAll('#kd-sku-chay .dai-gon-btn, #kd-sku-kem .dai-gon-btn')) {
    nut.scrollIntoView({ block: 'center' });
    const r = nut.getBoundingClientRect();
    const td = nut.closest('td'), tr = nut.closest('tr'), trS = tr.nextElementSibling;
    const rt = td.getBoundingClientRect();
    const cham = (x, y) => { const e = document.elementFromPoint(Math.round(x), Math.round(y));
      return e ? (e === nut || nut.contains(e) ? 'NÚT' : (e.className || e.tagName)) : 'ngoài-khung' ; };
    const sm = nut.previousElementSibling;
    const rsm = sm && sm.classList.contains('sm') ? sm.getBoundingClientRect() : null;
    let anDongSau = null;
    if (trS) { const rs = trS.getBoundingClientRect();
      anDongSau = r.bottom > rs.top ? cham(r.left + r.width/2, rs.top + 0.5) : 'không chạm dòng sau'; }
    ra.push({ ma: td.closest('table').tBodies[0].id,
      hop: r.width.toFixed(1) + '×' + r.height.toFixed(1),
      giua: cham(r.left + r.width/2, r.top + r.height/2),
      gocTT: cham(r.left + 2, r.top + 2), gocPD: cham(r.right - 2, r.bottom - 2),
      gocTD: cham(r.left + 2, r.bottom - 2), gocPT: cham(r.right - 2, r.top + 2),
      deChu: rsm ? +Math.max(0, rsm.bottom - r.top).toFixed(1) : null,
      diemChuBiDe: rsm && rsm.bottom > r.top ? cham(rsm.left + 20, rsm.bottom - 3) : 'không đè',
      thoDayO: +Math.max(0, r.bottom - rt.bottom).toFixed(1),
      anDongSau });
  }
  return ra;
})()`;

const CUOC_GO_CU = (s, ten) => ten === 'assets/js/app.js'
  ? s.replace(`    } else if (nutCu) {`, `    } else if (nutCu && nutCu.dataset.doan) {  /* HỒ LY: bản CŨ, chỉ gỡ nút đoán */`)
  : s;

for (const [nhan, sua] of [['NAY (có gỡ nút thật)', null], ['CŨ (chỉ gỡ nút đoán)', CUOC_GO_CU]]) {
  const may = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU, suaTep: sua });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: 1440, doiMs: 2600 });
  await cr.chay(MO_KINHDOANH); await cr.doi(1000);
  const t = await cr.chay(NHOI_DO);
  console.log(`TỐC ĐỘ · ${nhan.padEnd(24)} ${JSON.stringify(t)}`);
  cr.dong(); may.dong();
}

console.log('\n══ CHẠM — chỉ mở tab Kinh doanh, không mở cửa sổ bật lên ══');
const may2 = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU });
for (const RONG of [1440, 1280, 1024, 768, 375]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may2.cong}/app.html`, rong: RONG, doiMs: 2600 });
  const mo = await cr.chay(MO_KINHDOANH); await cr.doi(1000);
  const ds = await cr.chay(CHAM);
  console.log(`\n─── ${RONG}px  (dòng SKU ${mo}) · ${ds.length} nút ───`);
  for (const x of ds)
    console.log(`  ${x.ma.padEnd(12)} ${x.hop.padEnd(11)} giữa=${String(x.giua).padEnd(6)}` +
      ` 4góc[${x.gocTT}·${x.gocPT}·${x.gocTD}·${x.gocPD}]` +
      ` đèChữ ${x.deChu}px→chạm«${x.diemChuBiDe}» thòĐáyÔ ${x.thoDayO} dòngSau«${x.anDongSau}»`);
  cr.dong();
}
may2.dong();
console.log('\nXONG.');
