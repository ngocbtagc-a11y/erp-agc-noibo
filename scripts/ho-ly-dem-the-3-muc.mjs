/* HỒ LY VÒNG 2 — SỐ THẺ MỘT MÀN Ở BA ĐỘ DÀI TIÊU ĐỀ
   Khỉ Đột hạ chốt 4 → 3 và nói: ca xấu nhất (tiêu đề 200 ký tự) ra 3, ca
   thường ra 5. Kiểm cả hai đầu, cộng thêm ca giữa.
   Đếm thẻ ĐỌC ĐƯỢC (loại hàng tiêu đề ẩn), y cách `ho-ly-the-va-tick`. */
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const MO_HET = `(function(){
  document.querySelectorAll('[hidden]').forEach(el => { if (!el.closest('template')) el.hidden = false; });
  return 1;
})()`;

const CHEN = (n) => `(function(){
  const CO = 'Đối soát đơn hoàn Shopee tháng 8 kèm biên bản chênh lệch kho Hà Nội có chữ ký quản lý kho và kế toán trưởng nộp trước 15h ngày làm việc kế tiếp theo quy trình đã thống nhất từ đầu quý ba năm nay';
  let CHU = CO; while (CHU.length < ${n}) CHU += ' ' + CO;
  CHU = CHU.slice(0, ${n});
  const tb = document.querySelector('#ls-cv-bang'); if (!tb) return 'khong co';
  const ths = [...tb.closest('table').querySelectorAll('thead th')];
  for (let i = 0; i < 20; i++) {
    const tr = document.createElement('tr');
    ths.forEach((th, j) => {
      const td = document.createElement('td');
      const nhan = th.textContent.trim();
      if (!nhan) td.innerHTML = '<button class="btn-nho">Xem</button>';
      else if (j === 0) td.innerHTML = '<div class="nm">' + CHU + '</div>';
      else td.textContent = 'Nguyễn Thị Huyền';
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  }
  return CHU.length;
})()`;

const DEM = `(function(){
  const b = document.querySelector('#ls-cv-bang');
  b.scrollIntoView({ block: 'start' });
  const tr = [...b.querySelectorAll('tr')];
  const lot = t => { const o = t.getBoundingClientRect(); return o.top >= 0 && o.bottom <= innerHeight; };
  const doc = tr.filter(t => { const o = t.getBoundingClientRect();
    return o.height > 0 && o.width > 0 && !t.closest('thead') &&
           !t.classList.contains('dong-chitiet') && lot(t); });
  const caoThe = doc[0] ? Math.round(doc[0].getBoundingClientRect().height) : null;
  /* Trường nào thấy NGAY, không phải bấm gì */
  const truong = doc[0] ? [...doc[0].cells].filter(td => getComputedStyle(td).display !== 'none')
                            .map(td => td.dataset.nhan || '(nút)') : [];
  return { soThe: doc.length, caoThe, truong, caoMan: innerHeight };
})()`;

const may = await dungMayGia({ tatHoatAnh: true });
for (const n of [30, 100, 200]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: 375, doiMs: 2500 });
  await cr.chay(MO_HET);
  await cr.chay(`(document.querySelector('[data-tab="lichsuviec"]')||{click(){}}).click(); 1`);
  await cr.doi(700);
  const d = await cr.chay(CHEN(n));
  await cr.doi(1300);
  const k = await cr.chay(DEM);
  console.log(`  tiêu đề ${String(d).padStart(3)} ký tự @375px → ${k.soThe} thẻ một màn · thẻ cao ${k.caoThe}px / màn ${k.caoMan}px`);
  console.log(`      trường thấy NGAY (không phải bấm): ${k.truong.join(' · ')}`);
  cr.dong();
}
may.dong();
