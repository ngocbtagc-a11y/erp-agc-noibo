/* ==========================================================================
   HỒ LY — ba câu hỏi bàn đo của Khỉ Đột không hỏi
     ① `DEM_DONG` (do-gop-viec-lichsu.mjs:166) đếm MỌI <tr> lọt khung nhìn.
        Ở chế độ thẻ `thead` bị `display:none` → getBoundingClientRect() toàn
        số 0 → 0>=0 và 0<=innerHeight → HÀNG TIÊU ĐỀ ĐƯỢC ĐẾM NHƯ MỘT THẺ.
        Con số "5 thẻ" báo cho Sếp có bị thổi lên 1 không?
     ② Ô tick chọn dòng (Kế toán tra soát, Đối soát sàn — việc hằng ngày của
        chị Phan Thị Hằng) ở chế độ thẻ còn bấm được không, và có ≥44px không?
     ③ Nút "Chi tiết" ở 375px thật sự bao nhiêu px — tự đo, không tin lời khai.
   CHẠY: node scripts/ho-ly-the-va-tick.mjs
   ========================================================================== */

import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const MO_HET = `(function(){
  document.querySelectorAll('[hidden]').forEach(el => { if (!el.closest('template')) el.hidden = false; });
  return 1;
})()`;

/* Chèn 12 dòng thật vào MỌI bảng rỗng, giữ nguyên thẻ con mà ứng dụng dùng
   (input tick ở cột không tiêu đề đầu tiên nếu <th> chứa checkbox). */
const CHEN = `(function(){
  const DAI = 'Rà soát tồn kho hàng nhập khẩu quý 3, đối chiếu số liệu phần mềm với kiểm kê thực tế tại kho Hà Nội';
  const TEN = 'Nguyễn Thị Huyền (Vận hành sàn Shopee & TikTok)';
  let dem = 0;
  document.querySelectorAll('table').forEach(t => {
    const tb = t.tBodies[0]; if (!tb || tb.rows.length) return;
    const ths = [...t.querySelectorAll('thead th')]; if (!ths.length) return;
    for (let n = 0; n < 12; n++) {
      const tr = document.createElement('tr');
      ths.forEach(th => {
        const td = document.createElement('td');
        const nhan = th.textContent.trim();
        if (th.querySelector('input[type=checkbox]')) td.innerHTML = '<input type="checkbox">';
        else if (!nhan) td.innerHTML = '<button class="btn-nho">Xem</button>';
        else if (th.classList.contains('num')) { td.className='num'; td.textContent='1.234.567'; }
        else if (/việc|tiêu đề|sản phẩm|mô tả|lý do|nhân sự|khách hàng|tên/i.test(nhan))
          td.innerHTML = '<div class="nm">' + DAI + '</div>';
        else if (/người|nhận|giao|thực hiện|giữ/i.test(nhan)) td.textContent = TEN;
        else td.textContent = '29/08/2026';
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    }
    dem++;
  });
  return dem;
})()`;

/* ① Hai cách đếm, cùng một bảng. */
const DEM = (sel) => `(function(){
  const b = document.querySelector(${JSON.stringify(sel)});
  if (!b) return null;
  b.scrollIntoView({ block: 'start' });
  const tr = [...b.closest('table').querySelectorAll('tr')];
  const trTbody = [...b.querySelectorAll('tr')];
  const lot = (t) => { const o = t.getBoundingClientRect(); return o.top >= 0 && o.bottom <= innerHeight; };
  return {
    /* Y HỆT DEM_DONG của do-gop-viec: querySelectorAll('tr') trên chính tbody. */
    kieuDoGopViec: trTbody.filter(lot).length,
    /* Nếu bàn đo trỏ vào cả <table> thì hàng tiêu đề ẩn cũng lọt. */
    neuTroVaoTable: tr.filter(lot).length,
    /* Thẻ NGƯỜI ĐỌC ĐƯỢC: có kích thước thật, không phải hàng tiêu đề. */
    theThat: trTbody.filter(t => {
      const o = t.getBoundingClientRect();
      return o.height > 0 && o.width > 0 && !t.closest('thead')
             && !t.classList.contains('dong-chitiet') && lot(t);
    }).length,
    theadCaoBaoNhieu: (function(){
      const th = b.closest('table').querySelector('thead tr');
      if (!th) return null;
      const o = th.getBoundingClientRect();
      return { cao: o.height, rong: o.width, lot: lot(th), disp: getComputedStyle(th).display };
    })()
  };
})()`;

/* ② + ③ */
const DO_CHAM = `(function(){
  const tick = [], nut = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb || !tb.rows.length) continue;
    const ma = tb.id || t.id || '(không tên)';
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') continue;
    const o = tb.querySelector('input[type=checkbox]');
    if (o) {
      const r = o.getBoundingClientRect();
      tick.push({ ma, w: Math.round(r.width), h: Math.round(r.height),
                  hien: getComputedStyle(o).display !== 'none' && r.width > 0 && r.height > 0,
                  the: t.classList.contains('luoi-bang'),
                  nhan: o.closest('td') ? (o.closest('td').dataset.nhan ?? '(KHÔNG CÓ)') : null });
    }
    const n = tb.querySelector('button[data-chitiet]');
    if (n) { const r = n.getBoundingClientRect(); nut.push({ ma, w: Math.round(r.width), h: Math.round(r.height) }); }
  }
  return { tick, nut };
})()`;

const may = await dungMayGia({ tatHoatAnh: true });
for (const RONG of [1440, 414, 375]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(MO_HET);
  await cr.chay(CHEN);
  await cr.doi(1200);
  console.log(`\n========== ${RONG}px ==========`);
  const d = await cr.chay(DEM('#ls-cv-bang'));
  console.log('① ĐẾM #ls-cv-bang: ' + JSON.stringify(d));
  const c = await cr.chay(DO_CHAM);
  console.log('② Ô TICK:');
  for (const t of c.tick)
    console.log(`     ${t.ma.padEnd(14)} ${t.w}x${t.h}px hiện=${t.hien} thẻ=${t.the} nhãn=${t.nhan}` +
      ((t.w < 44 || t.h < 44) ? '   ⟵ DƯỚI 44px' : ''));
  console.log('③ NÚT "Chi tiết" (tự đo):');
  const nho = c.nut.filter(n => n.w < 44 || n.h < 44);
  console.log(`     ${c.nut.length} nút · nhỏ hơn 44px: ${nho.length}` +
    (nho.length ? ' ⟵ ' + nho.map(n => `${n.ma} ${n.w}x${n.h}`).join(', ') : '') +
    (c.nut.length ? ` · ví dụ ${c.nut[0].ma} ${c.nut[0].w}x${c.nut[0].h}` : ''));
  cr.dong();
}
may.dong();
