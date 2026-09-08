/* HỒ LY — 200 thẻ trên điện thoại có làm treo máy không, và bảng RỖNG /
   MỘT DÒNG có vỡ không. `luoiBang()` chạy trong MutationObserver và duyệt
   MỌI bảng × MỌI dòng mỗi lượt — cần đo, không đoán. */
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const CHEN = (n) => `(function(){
  const tb = document.querySelector('#ls-cv-bang'); if (!tb) return 'khong co bang';
  const ths = [...tb.closest('table').querySelectorAll('thead th')];
  const t0 = performance.now();
  const kho = document.createDocumentFragment();
  for (let i = 0; i < ${n}; i++) {
    const tr = document.createElement('tr');
    ths.forEach((th, j) => {
      const td = document.createElement('td');
      const nhan = th.textContent.trim();
      if (!nhan) td.innerHTML = '<button class="btn-nho">Xem</button>';
      else if (j === 0) td.innerHTML = '<div class="nm">Đối soát đơn hoàn Shopee tháng 8 dòng ' + i + '</div>';
      else td.textContent = 'Nguyễn Thị Huyền';
      tr.appendChild(td);
    });
    kho.appendChild(tr);
  }
  tb.appendChild(kho);
  window.__t0 = t0;
  return 'da chen ${n} dong';
})()`;

const DO = `(function(){
  const tb = document.querySelector('#ls-cv-bang');
  const t = tb.closest('table');
  const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
  const chuaDap = [...tb.rows].filter(r => !r.dataset.luoi && !r.classList.contains('dong-chitiet')).length;
  /* Đo chi phí một lượt bố cục lại — thứ quyết định cuộn có giật hay không. */
  const t1 = performance.now();
  void t.offsetHeight; void document.body.offsetHeight;
  const boCuc = performance.now() - t1;
  return {
    soDong: tb.rows.length,
    chuaDapLop: chuaDap,
    caoBang: Math.round(t.getBoundingClientRect().height),
    tran: Math.max(t.scrollWidth, w.scrollWidth) > w.clientWidth + 1,
    boCucMs: Math.round(boCuc * 100) / 100,
    tuLucChenToiGio: Math.round(performance.now() - window.__t0)
  };
})()`;

/* Bảng RỖNG và bảng MỘT DÒNG ở chế độ thẻ. */
const BIEN = `(function(){
  const kq = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb) continue;
    const ma = tb.id || t.id || '(không tên)';
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') continue;
    if (tb.rows.length <= 1)
      kq.push({ ma, dong: tb.rows.length, cao: Math.round(t.getBoundingClientRect().height),
                tran: Math.max(t.scrollWidth, w.scrollWidth) > w.clientWidth + 1,
                theadAn: getComputedStyle(t.querySelector('thead') || t).display === 'none' });
  }
  return kq;
})()`;

const may = await dungMayGia({ tatHoatAnh: true });
for (const RONG of [375]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(`document.querySelector('[data-tab="lichsuviec"]')?.click(); 1`);
  await cr.doi(800);
  console.log(`\n===== ${RONG}px · BẢNG RỖNG / MỘT DÒNG ở chế độ thẻ =====`);
  console.log(JSON.stringify(await cr.chay(BIEN), null, 1));
  console.log(await cr.chay(CHEN(200)));
  await cr.doi(2500);
  console.log(`\n===== ${RONG}px · 200 THẺ =====`);
  console.log(JSON.stringify(await cr.chay(DO), null, 1));
  if (cr.loiConsole.length) console.log('LỖI CONSOLE: ' + cr.loiConsole.join(' | '));
  cr.dong();
}
may.dong();
