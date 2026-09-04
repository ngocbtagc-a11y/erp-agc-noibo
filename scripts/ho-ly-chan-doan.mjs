/* HỒ LY — chẩn đoán: lớp `.luoi-bang` có được gắn không, cột nào KHÔNG được
   đánh dấu `.cot-chu`/`.cot-phu`, và cột nào trong số đó CHỞ CHỮ TỰ DO THẬT. */
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const MO_HET = `(function(){
  document.querySelectorAll('[hidden]').forEach(el => { if (!el.closest('template')) el.hidden = false; });
  return 1;
})()`;

/* Chèn chữ dài CHỈ vào cột không phải num và không phải cột nút — nhưng lần
   này ghi nhận rõ cột đó có được đánh dấu `.cot-chu` hay không. */
const CHEN = `(function(){
  const DAI = 'x'.repeat(40) + ' ' + 'Rà soát tồn kho quý 3 đối chiếu số liệu '.repeat(40);
  let dem = 0;
  document.querySelectorAll('table').forEach(t => {
    const tb = t.tBodies[0]; if (!tb || tb.rows.length) return;
    const ths = [...t.querySelectorAll('thead th')]; if (!ths.length) return;
    const tr = document.createElement('tr');
    ths.forEach(th => {
      const td = document.createElement('td');
      const nhan = th.textContent.trim();
      if (!nhan) td.innerHTML = '<button class="btn-nho">Xem</button>';
      else if (th.classList.contains('num')) { td.className='num'; td.textContent='1.234.567'; }
      else td.textContent = DAI;
      tr.appendChild(td);
    });
    tb.appendChild(tr); dem++;
  });
  return dem;
})()`;

const CHAN_DOAN = `(function(){
  const kq = { mq980: matchMedia('(max-width: 980px)').matches, bang: [] };
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb) continue;
    const ma = (tb && tb.id) || t.id || '(không tên)';
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') continue;
    const hang = t.querySelector('thead tr:last-of-type');
    const tr0 = [...tb.rows].find(r => !r.classList.contains('dong-chitiet'));
    if (!hang || !tr0) continue;
    /* Cột nào KHÔNG mang .cot-chu và KHÔNG mang .cot-phu và KHÔNG phải num
       thì không có trần bề ngang: luật nowrap toàn cục còn nguyên. */
    const troNgai = [...hang.children].map((th,i)=>({
      ten: th.textContent.trim() || '(nút)',
      chu: th.classList.contains('cot-chu'), phu: th.classList.contains('cot-phu'),
      num: th.classList.contains('num'),
      ws: tr0.cells[i] ? getComputedStyle(tr0.cells[i]).whiteSpace : null,
      rong: tr0.cells[i] ? Math.round(tr0.cells[i].getBoundingClientRect().width) : null
    })).filter(c => !c.chu && !c.phu && !c.num && c.ten !== '(nút)' && c.ws === 'nowrap' && c.rong > 400);
    kq.bang.push({ ma, laLuoi: t.classList.contains('luoi-bang'),
      dispTd: tr0.cells[0] ? getComputedStyle(tr0.cells[0]).display : null,
      daDap: !!tr0.dataset.luoi, soTh: hang.children.length, soTd: tr0.cells.length,
      rong: Math.max(t.scrollWidth, w.scrollWidth), khung: w.clientWidth,
      cotKhongTran: troNgai.map(c => c.ten + '(' + c.rong + 'px)') });
  }
  return kq;
})()`;

const may = await dungMayGia({ tatHoatAnh: true });
for (const RONG of [1440, 375]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(MO_HET);
  await cr.chay(CHEN);
  await cr.doi(1200);
  const d = await cr.chay(CHAN_DOAN);
  console.log(`\n===== ${RONG}px · media(max-width:980px)=${d.mq980} =====`);
  for (const b of d.bang) {
    const tran = b.rong > b.khung + 1;
    console.log(`${tran ? 'TRÀN' : 'vừa '} ${b.ma.padEnd(18)} luoi-bang=${String(b.laLuoi).padEnd(5)} td.display=${String(b.dispTd).padEnd(10)} dap=${String(b.daDap).padEnd(5)} th/td=${b.soTh}/${b.soTd} ${b.rong}/${b.khung}`);
    if (b.cotKhongTran.length) console.log(`      ⟶ CỘT KHÔNG CÓ TRẦN (nowrap, không .cot-chu): ${b.cotKhongTran.join(' · ')}`);
  }
  if (cr.loiConsole.length) console.log('LỖI CONSOLE: ' + cr.loiConsole.join(' | '));
  cr.dong();
}
may.dong();
