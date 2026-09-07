/* ==========================================================================
   ⚠️ TỆP NÀY HỎNG — DÙNG `holy-rev63c-nhandinh2.mjs` THAY THẾ.

   Nó sửa `style.css` qua `suaTep`, nhưng `dungMayGia()` chỉ đưa `suaTep` cho
   `app.html` + 4 tệp `.js` — CSS KHÔNG nằm trong danh sách. Nên "ba bản đối
   chứng" ở đây thật ra là ba lần chạy CÙNG MỘT BẢN, và số đo giống hệt nhau
   từng pixel chính là thứ đã tố cáo nó.
   Giữ lại làm bài học: ca đối chứng phải TỰ CHỨNG MINH nó đổi được cái gì.
   ========================================================================== */
/* HỒ LY · REV-0063 vòng 3 — CHỨNG MINH NGUYÊN NHÂN vùng chạm hụt ở điện thoại.
 * Giả thuyết: ở chế độ THẺ (≤980px, `td { display: block }`) thì `margin-bottom:
 * -10px` của `td .dai-gon-btn` kéo Ô KẾ TIẾP (`td.num`) trùm lên đáy nút. Trong
 * chế độ BẢNG các ô nằm cạnh nhau nên không ai trùm.
 * Thử ba bản, cùng một cây, chỉ khác CSS trong bản tạm của bàn đo.
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
const QUET = `(function(){
  const ra = [];
  for (const nut of document.querySelectorAll('#kd-sku-chay .dai-gon-btn, #kd-sku-kem .dai-gon-btn')) {
    nut.scrollIntoView({ block: 'center' });
    const r = nut.getBoundingClientRect();
    const cx = Math.round(r.left + r.width/2);
    let cao = 0, cur = 0;
    for (let y = Math.floor(r.top); y <= Math.ceil(r.bottom); y++) {
      const e = document.elementFromPoint(cx, y);
      if (e && (e === nut || nut.contains(e))) { cur++; if (cur > cao) cao = cur; } else cur = 0;
    }
    const tr = nut.closest('tr');
    ra.push({ hop: +r.height.toFixed(1), cham: cao, caoDong: +tr.getBoundingClientRect().height.toFixed(1) });
  }
  return ra;
})()`;

const BAN = [
  ['NAY  (lề âm -10/-10)', null],
  ['THỬ  (bỏ lề âm DƯỚI, giữ lề âm TRÊN)', (s, t) => t === 'assets/css/style.css'
    ? s.replace(/(td \.dai-gon-btn \{[\s\S]*?)margin: -10px 0 -10px -6px;/, '$1margin: -10px 0 0 -6px;') : s],
  ['THỬ  (bỏ HẲN lề âm)', (s, t) => t === 'assets/css/style.css'
    ? s.replace(/(td \.dai-gon-btn \{[\s\S]*?)margin: -10px 0 -10px -6px;/, '$1margin: 0 0 0 -6px;') : s],
];
/* In ra khối CSS thật để chắc chắn regex bám đúng — bàn đo gỡ trượt mà im lặng
   là bàn đo nói dối, đúng lỗi lớp này. */
import { readFileSync } from 'node:fs';
const css = readFileSync('C:/Users/Admin/AppData/Local/Temp/claude/agc-sku/public/assets/css/style.css', 'utf8');
const khoi = (css.match(/td \.dai-gon-btn \{[\s\S]*?\n\}/) || ['(KHÔNG TÌM THẤY)'])[0];
console.log('--- khối CSS thật ---\n' + khoi + '\n');

for (const [nhan, sua] of BAN) {
  if (sua) {
    const thu = sua(css, 'assets/css/style.css');
    if (thu === css) { console.log(`⚠️  ${nhan}: REGEX TRƯỢT — bỏ ca này, không đoán bừa.`); continue; }
  }
  const may = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU, suaTep: sua });
  for (const RONG of [375, 1440]) {
    const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
    await cr.chay(MO); await cr.doi(1000);
    const ds = await cr.chay(QUET);
    console.log(`${nhan.padEnd(38)} @${RONG}px → ` +
      ds.map(x => `hộp ${x.hop} / CHẠM ${x.cham} / dòng ${x.caoDong}`).join('  ·  '));
    cr.dong();
  }
  may.dong();
}

