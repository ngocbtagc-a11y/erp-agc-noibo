/* ==========================================================================
   HỒ LY VÒNG 2 — HAI CÂU HỎI
   ① NGƯỠNG 60 KÝ TỰ của "lưới chặn cuối" có đúng chỗ không?
      Lưới chỉ cấp trần cho ô >60 ký tự. Vậy ô 55 ký tự — DƯỚI ngưỡng — vẫn
      `nowrap`, vẫn không có trần. 55 ký tự ở 13.5px ≈ 380px một cột. Tám cột
      như thế là 3.000px. Ngưỡng đặt đúng hay đặt hụt? Đo bằng cách nhồi CHÍNH
      XÁC 55 và 60 ký tự vào mọi cột.
   ② Ô TICK ở chế độ thẻ có DÙNG ĐƯỢC không — không chỉ có đủ 44px:
      chọn nhiều dòng · chọn tất cả · bỏ chọn. Việc hằng ngày của chị Hằng.
   CHẠY: node scripts/ho-ly-nguong-60-va-tick.mjs
   ========================================================================== */

import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const MO_HET = `(function(){
  document.querySelectorAll('[hidden]').forEach(el => { if (!el.closest('template')) el.hidden = false; });
  return 1;
})()`;

/* Chèn n ký tự vào MỌI cột có tiêu đề (trừ num và cột nút). */
const CHEN = (n, soDong) => `(function(){
  const CHU = 'Đối soát đơn hoàn Shopee tháng tám năm hai nghìn hai sáu abcdefghijk'.slice(0, ${n});
  let dem = 0;
  document.querySelectorAll('table').forEach(t => {
    const tb = t.tBodies[0]; if (!tb || tb.rows.length) return;
    const ths = [...t.querySelectorAll('thead th')]; if (!ths.length) return;
    for (let k = 0; k < ${soDong}; k++) {
      const tr = document.createElement('tr');
      ths.forEach(th => {
        const td = document.createElement('td');
        const nhan = th.textContent.trim();
        if (th.querySelector('input[type=checkbox]')) td.innerHTML = '<input type="checkbox" class="thu-tick">';
        else if (!nhan) td.innerHTML = '<button class="btn-nho">Xem</button>';
        else if (th.classList.contains('num')) { td.className='num'; td.textContent='1.234.567'; }
        else td.textContent = CHU;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    }
    dem++;
  });
  return { dem, doDai: CHU.length };
})()`;

const DO_TRAN = `(function(){
  const ra = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb || !tb.rows.length) continue;
    const ma = tb.id || t.id || '(không tên)';
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') continue;
    const rong = Math.max(t.scrollWidth, w.scrollWidth), khung = w.clientWidth;
    if (rong > khung + 1) ra.push(ma + ' +' + (rong - khung) + 'px');
  }
  return ra;
})()`;

/* ② Tick: chọn 3 dòng · chọn tất cả · bỏ chọn — ở chế độ thẻ. */
const THU_TICK = `(function(){
  const t = document.querySelector('#kt-ts-bang');
  if (!t) return { co: false };
  const bang = t.closest('table');
  const oTat = bang.querySelector('thead input[type=checkbox]');
  const oDong = [...t.querySelectorAll('input[type=checkbox]')];
  const dem = () => t.querySelectorAll('input[type=checkbox]:checked').length;
  const r = (el) => { const b = el.getBoundingClientRect(); return Math.round(b.width)+'x'+Math.round(b.height); };

  const kq = { co: true, soDong: oDong.length, coONhonTatCa: !!oTat,
               cheDoThe: bang.classList.contains('luoi-bang') &&
                         getComputedStyle(t.rows[0].cells[0]).display !== 'table-cell',
               kichThuocDong: oDong[0] ? r(oDong[0]) : null,
               kichThuocTatCa: oTat ? r(oTat) : null };

  /* Chọn 3 dòng bằng cách BẤM THẬT (không gán .checked) */
  oDong.slice(0, 3).forEach(o => o.click());
  kq.sauKhiBam3 = dem();

  /* Bỏ chọn 1 */
  oDong[0].click();
  kq.sauKhiBoChon1 = dem();

  /* Chọn tất cả */
  if (oTat) { oTat.click(); kq.sauKhiChonTatCa = dem(); }

  /* Bỏ chọn tất cả */
  if (oTat) { oTat.click(); kq.sauKhiBoTatCa = dem(); }

  /* Ô tick có nằm trong vùng nhìn thấy của thẻ không (không bị đè/cắt)? */
  const o0 = oDong[0].getBoundingClientRect();
  const the = oDong[0].closest('tr').getBoundingClientRect();
  kq.tickNamTrongThe = o0.left >= the.left - 14 && o0.right <= the.right + 2;
  kq.nhanOTick = oDong[0].closest('td') ? oDong[0].closest('td').dataset.nhan : null;
  return kq;
})()`;

const may = await dungMayGia({ tatHoatAnh: true });

console.log('===== ① NGƯỠNG 60 KÝ TỰ =====');
for (const n of [55, 60, 61, 80]) {
  for (const RONG of [1440, 1024]) {
    const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2500 });
    await cr.chay(MO_HET);
    const c = await cr.chay(CHEN(n, 1));
    await cr.doi(1100);
    const tran = await cr.chay(DO_TRAN);
    console.log(`  ${String(c.doDai).padStart(2)} ký tự @${RONG}px → ${tran.length} bảng tràn` +
      (tran.length ? '  ⟵ ' + tran.slice(0, 6).join(' · ') + (tran.length > 6 ? ` …+${tran.length-6}` : '') : ''));
    cr.dong();
  }
}

console.log('\n===== ② Ô TICK Ở CHẾ ĐỘ THẺ (Kế toán tra soát — việc chị Hằng) =====');
for (const RONG of [1440, 375]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2500 });
  await cr.chay(MO_HET);
  await cr.chay(CHEN(30, 5));
  await cr.doi(1100);
  const k = await cr.chay(THU_TICK);
  console.log(`  @${RONG}px ` + JSON.stringify(k));
  if (k.co) {
    const oke = k.sauKhiBam3 === 3 && k.sauKhiBoChon1 === 2 &&
                k.sauKhiChonTatCa === k.soDong && k.sauKhiBoTatCa === 0;
    console.log(`     ${oke ? '✅' : '❌'} chọn 3 → ${k.sauKhiBam3} · bỏ 1 → ${k.sauKhiBoChon1} · chọn tất cả → ${k.sauKhiChonTatCa}/${k.soDong} · bỏ tất cả → ${k.sauKhiBoTatCa}`);
  }
  if (cr.loiConsole.length) console.log('     LỖI CONSOLE: ' + cr.loiConsole.join(' | '));
  cr.dong();
}
may.dong();
