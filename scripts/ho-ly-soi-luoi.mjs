/* ==========================================================================
   HỒ LY — BÀN ĐO ĐỘC LẬP CHO REV-0059
   Không tin lời khai. Đo lại bằng cách KHÁC với `do-bang-that.mjs`:
     · chữ dài bằng ĐÚNG trần máy chủ cho phép (2000 ký tự), không phải 180
     · nhồi chữ dài vào MỌI cột không phải `num`, không lọc theo regex tên cột
     · dựng dòng THẬT (có .nm/.sm lồng nhau) chứ không phải td chỉ có textContent
     · thêm hai bề ngang bị bỏ: 1024 (máy tính bảng nằm ngang) và 414 (đt lớn)
     · đếm thẻ ĐỌC ĐƯỢC, loại trừ hàng tiêu đề đang bị ẩn
   CHẠY: node scripts/ho-ly-soi-luoi.mjs
   ========================================================================== */

import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const RONGS = [1440, 1280, 1024, 980, 979, 414, 375];

/* Trần THẬT của máy chủ: src/index.js:2892 `mo_ta ... slice(0, 2000)`,
   :2891 `dau_ra ... slice(0, 1000)`, :2890 `tieu_de ... slice(0, 200)`. */
const CHU_2000 = ('Rà soát toàn bộ tồn kho hàng nhập khẩu quý 3 năm 2026, đối chiếu số liệu giữa phần mềm ' +
  'và kiểm kê thực tế tại kho Hà Nội, lập biên bản chênh lệch gửi chị Phan Thị Hằng trước ngày 15 hàng tháng. ')
  .repeat(12).slice(0, 2000);
const TEN_DAI = 'Nguyễn Thị Huyền Trang Phương Thảo (Chuyên viên Vận hành sàn Shopee & TikTok — Kiêm CSKH)';

/* ---- ① NHỒI CHỮ DÀI VÀO MỌI CỘT, KHÔNG LỌC THEO TÊN CỘT ------------------
   `do-bang-that` chọn cột để nhồi bằng một regex tên cột. Cột nào tên không
   khớp thì nhận '29/08/2026' — một chuỗi ngắn. Ở đây nhồi hết, trừ cột `num`
   và cột không có tiêu đề (cột nút). */
const CHEN_TAN_LUC = `(function(){
  const DAI = ${JSON.stringify(CHU_2000)};
  const TEN = ${JSON.stringify(TEN_DAI)};
  let dem = 0;
  document.querySelectorAll('table').forEach(t => {
    const tb = t.tBodies[0]; if (!tb || tb.rows.length) return;
    const ths = [...t.querySelectorAll('thead th')];
    if (!ths.length) return;
    const tr = document.createElement('tr');
    tr.dataset.dongMau = '1';
    ths.forEach((th, i) => {
      const td = document.createElement('td');
      const nhan = th.textContent.trim();
      if (!nhan) td.innerHTML = '<button class="btn-nho">Xem</button>';
      else if (th.classList.contains('num')) { td.className = 'num'; td.textContent = '1.234.567'; }
      else if (i === 0) {
        /* DÒNG THẬT: ô đầu của bảng việc render .nm + .sm lồng nhau, KHÔNG
           phải textContent phẳng. luoiBang() chỉ bọc .dai-gon khi ô KHÔNG có
           thẻ con — nên đây đúng là nhánh mà bàn đo của Khỉ Đột không đi qua. */
        td.innerHTML = '<div class="nm">' + DAI + '</div><div class="sm">' + TEN + '</div>';
      } else td.textContent = DAI;
      tr.appendChild(td);
    });
    tb.appendChild(tr); dem++;
  });
  return dem;
})()`;

const MO_HET = `(function(){
  document.querySelectorAll('[hidden]').forEach(el => { if (!el.closest('template')) el.hidden = false; });
  return 1;
})()`;

const DO_TRAN = `(function(){
  const kq = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0];
    const ma = (tb && tb.id) || t.id || '(không tên)';
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') { kq.push({ ma, an: true }); continue; }
    const khung = w.clientWidth;
    const rong = Math.max(t.scrollWidth, w.scrollWidth);
    /* CHIỀU CAO DÒNG với chữ dài thật — thứ do-bang-that không đo vì nó
       không dựng dòng có .nm lồng bên trong. */
    let caoMax = 0;
    for (const tr of tb ? tb.rows : []) caoMax = Math.max(caoMax, Math.round(tr.getBoundingClientRect().height));
    kq.push({ ma, an: false, khung, rong, tran: rong > khung + 1, thua: Math.max(0, rong - khung), caoMax });
  }
  return kq;
})()`;

/* ---- ② ĐẾM THẺ: TÁCH "tr đếm được" VỚI "thẻ NGƯỜI ĐỌC ĐƯỢC" --------------
   `do-gop-viec-lichsu.mjs:166` đếm mọi `tr` nằm lọt trong khung nhìn. Hàng
   tiêu đề `<thead><tr>` khi bị `display:none` có getBoundingClientRect() toàn
   số 0 — mà 0>=0 và 0<=innerHeight, nên nó ĐƯỢC ĐẾM. Ở đây đếm cả hai kiểu
   để xem con số báo cho Sếp có bị thổi lên không. */
const DEM_THE = (sel) => `(function(){
  const b = document.querySelector(${JSON.stringify(sel)});
  if (!b) return null;
  b.scrollIntoView({ block: 'start' });
  const tr = [...b.querySelectorAll('tr')];
  const kieuCu = tr.filter(t => { const o = t.getBoundingClientRect(); return o.top >= 0 && o.bottom <= innerHeight; }).length;
  const that = tr.filter(t => {
    const o = t.getBoundingClientRect();
    if (o.height <= 0 || o.width <= 0) return false;          // hàng ẩn / thead bị display:none
    if (t.closest('thead')) return false;
    if (t.classList.contains('dong-chitiet')) return false;
    return o.top >= 0 && o.bottom <= innerHeight;
  }).length;
  return { kieuCu, that, chenh: kieuCu - that };
})()`;

/* ---- ③ LUOIBANG CÓ BỎ SÓT BẢNG NÀO KHÔNG -------------------------------
   luoiBang() bỏ qua cả dòng khi `tr.cells.length !== ths.length`. Bảng nào
   render ô theo điều kiện (góp ý: `coCotNguoiGui`/`coCotRuiRo`; tồn kho:
   `xemGiaVon`; đơn hoàn: `co_van_don`) mà <th> chỉ bị `hidden` chứ không bị
   remove() thì rơi vào đúng cái bẫy này: mất data-nhan, mất .cot-phu, mất nút
   "Chi tiết" — và ở chế độ thẻ thì mất luôn nhãn đi kèm giá trị. */
const DO_BO_SOT = `(function(){
  const soT = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb || !tb.rows.length) continue;
    const ma = (tb && tb.id) || t.id || '(không tên)';
    const hang = t.querySelector('thead tr:last-of-type');
    if (!hang) continue;
    const nTh = hang.children.length;
    for (const tr of tb.rows) {
      if (tr.classList.contains('dong-chitiet')) continue;
      if (tr.cells.length !== nTh) {
        soT.push({ ma, th: nTh, td: tr.cells.length,
                   daDap: !!tr.dataset.luoi,
                   laThe: t.classList.contains('luoi-bang'),
                   coNhan: !!tr.cells[0] && tr.cells[0].hasAttribute('data-nhan') });
        break;
      }
    }
  }
  return soT;
})()`;

/* ---- ④ Ô TICK CHỌN DÒNG CÓ CÒN BẤM ĐƯỢC Ở CHẾ ĐỘ THẺ KHÔNG -------------
   Kế toán tra soát và Đối soát sàn đều tick từng dòng. Thẻ mà không tick được
   là mất một việc hằng ngày của chị Hằng. */
const DO_TICK = `(function(){
  const kq = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb) continue;
    const ma = (tb && tb.id) || t.id || '(không tên)';
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') continue;
    const o = t.querySelector('tbody input[type=checkbox]');
    if (!o) continue;
    const r = o.getBoundingClientRect();
    kq.push({ ma, w: Math.round(r.width), h: Math.round(r.height),
              hien: getComputedStyle(o).display !== 'none' && r.width > 0,
              the: t.classList.contains('luoi-bang') });
  }
  return kq;
})()`;

const may = await dungMayGia({ tatHoatAnh: true });
console.log('BÀN ĐO HỒ LY — chữ dài 2000 ký tự (đúng trần máy chủ), nhồi MỌI cột\n');

for (const RONG of RONGS) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(MO_HET);
  const soChen = await cr.chay(CHEN_TAN_LUC);
  await cr.doi(900);
  const ds = await cr.chay(DO_TRAN);
  const soT = await cr.chay(DO_BO_SOT);
  const tick = await cr.chay(DO_TICK);

  const hien = ds.filter(b => !b.an);
  const tran = hien.filter(b => b.tran);
  const caoNhat = hien.slice().sort((a, b) => b.caoMax - a.caoMax).slice(0, 4);

  console.log(`--- ${RONG}px · chèn ${soChen} bảng · hiện ${hien.length} · TRÀN ${tran.length}`);
  for (const b of tran) console.log(`     TRÀN ${b.ma} +${b.thua}px (khung ${b.khung} · bảng ${b.rong})`);
  console.log(`     chiều cao dòng lớn nhất: ` + caoNhat.map(b => `${b.ma}=${b.caoMax}px`).join(' · '));
  if (soT.length) for (const s of soT)
    console.log(`     BỎ SÓT ${s.ma}: th=${s.th} td=${s.td} · đã dập lớp=${s.daDap} · là thẻ=${s.laThe} · có data-nhan=${s.coNhan}`);
  if (tick.length) console.log(`     ô tick: ` + tick.map(t => `${t.ma} ${t.w}x${t.h} hiện=${t.hien} thẻ=${t.the}`).join(' · '));

  if (RONG === 375 || RONG === 414 || RONG === 980) {
    const d1 = await cr.chay(`document.querySelector('[data-tab="lichsuviec"]')?.click(); 1`);
    await cr.doi(900);
    const dem = await cr.chay(DEM_THE('#ls-cv-bang'));
    console.log(`     ĐẾM THẺ #ls-cv-bang → kiểu do-gop-viec: ${dem && dem.kieuCu} · thẻ THẬT đọc được: ${dem && dem.that} · chênh: ${dem && dem.chenh}`);
  }
  if (cr.loiConsole.length) console.log(`     LỖI CONSOLE: ${cr.loiConsole.join(' | ')}`);
  cr.dong();
}
may.dong();
