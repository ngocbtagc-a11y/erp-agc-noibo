/* HỒ LY · REV-0063 vòng 3 — nguyên nhân vùng chạm hụt ở CHẾ ĐỘ THẺ.
 * Bản trước của tệp này SAI: nó sửa `style.css` qua `suaTep`, mà `dungMayGia`
 * chỉ đưa `suaTep` cho app.html + 4 tệp .js — CSS không nằm trong danh sách,
 * nên "ba bản" thật ra là ba lần chạy CÙNG MỘT BẢN. Ghi lại đây làm bài học:
 * ca đối chứng phải TỰ CHỨNG MINH là nó đã đổi được cái gì đó.
 * Lần này tiêm CSS tại chỗ bằng `<style>` và ĐO LẠI để chắc là đã đổi.
 */
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
const MO = `(function(){ if(typeof window.moTab==='function'){try{window.moTab('kinhdoanh');}catch(e){}}
  const t=document.querySelector('[data-tab="kinhdoanh"]'); if(t)t.click(); return 1; })()`;

const TIEM = (css) => `(function(){
  let s = document.getElementById('holy-thu');
  if (!s) { s = document.createElement('style'); s.id = 'holy-thu'; document.head.appendChild(s); }
  s.textContent = ${JSON.stringify(css)};
  return getComputedStyle(document.querySelector('#kd-sku-chay .dai-gon-btn') || document.body).marginBottom;
})()`;

const QUET = `(function(){
  const ra = [];
  for (const nut of document.querySelectorAll('#kd-sku-chay .dai-gon-btn, #kd-sku-kem .dai-gon-btn')) {
    nut.scrollIntoView({ block: 'center' });
    const r = nut.getBoundingClientRect();
    const cx = Math.round(r.left + r.width/2);
    let cao = 0, cur = 0, che = null;
    for (let y = Math.floor(r.top); y <= Math.ceil(r.bottom); y++) {
      const e = document.elementFromPoint(cx, y);
      if (e && (e === nut || nut.contains(e))) { cur++; if (cur > cao) cao = cur; }
      else { cur = 0; if (!che && e) che = (e.tagName + '.' + (e.className || '')).slice(0, 26); }
    }
    const tr = nut.closest('tr');
    const cs = getComputedStyle(nut);
    ra.push({ hop: +r.height.toFixed(1), cham: cao, dong: +tr.getBoundingClientRect().height.toFixed(1),
              mb: cs.marginBottom, pos: cs.position, z: cs.zIndex, che });
  }
  return ra;
})()`;

const CA = [
  ['① NGUYÊN BẢN', ''],
  ['② bỏ lề âm DƯỚI', 'td .dai-gon-btn { margin-bottom: 0 !important; }'],
  ['③ bỏ HẲN lề âm', 'td .dai-gon-btn { margin-top: 0 !important; margin-bottom: 0 !important; }'],
  ['④ position:relative; z-index:1', 'td .dai-gon-btn { position: relative !important; z-index: 1 !important; }'],
  ['⑤ nút thành BLOCK riêng dòng', 'td .dai-gon-btn { display: flex !important; width: max-content !important; }'],
];

const may = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU });
for (const RONG of [375, 1440]) {
  console.log(`\n══════ ${RONG}px ══════`);
  for (const [nhan, css] of CA) {
    const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
    await cr.chay(MO); await cr.doi(1000);
    const mb = await cr.chay(TIEM(css));
    await cr.doi(300);
    const ds = await cr.chay(QUET);
    const dat = ds.length && ds.every(x => x.cham >= 44);
    console.log(`  ${dat ? '✅' : '❌'} ${nhan.padEnd(32)} (margin-bottom sau tiêm: ${mb}) → ` +
      ds.map(x => `hộp ${x.hop}/CHẠM ${x.cham}/dòng ${x.dong}${x.che ? ' che bởi ' + x.che : ''}`).join(' · '));
    cr.dong();
  }
}
may.dong();
