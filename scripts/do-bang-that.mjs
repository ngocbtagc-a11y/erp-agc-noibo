/* ==========================================================================
   BÀN ĐO: BẢNG VỪA MÀN VỚI DỮ LIỆU THẬT
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY, TRONG KHI ĐÃ CÓ `do-bang-vua-man.mjs`.

   04/09/2026 Sếp Bùi Thị Ngọc gửi ảnh màn 1440px, bảng "Lịch sử làm việc"
   vẫn còn thanh kéo ngang — LẦN THỨ HAI Sếp nhắc cùng một việc. Trong khung
   ảnh có sẵn dòng *"Còn cột bên phải — kéo ngang để xem tiếp →"* do chính
   chúng ta thêm vào. Nghĩa là lời nhắc KHÔNG PHẢI câu trả lời: Sếp không
   muốn được chỉ cách kéo, Sếp muốn không phải kéo.

   Lúc đó bàn đo cũ in **42 ĐẠT · 0 TRƯỢT**. Nó không mù, nó ĐƯỢC LẬP TRÌNH
   ĐỂ THA — hai chỗ:

     ① `MOC_TRAN` ("mốc tràn trước bản vá") cho `ls-cv-bang` được tràn 27px ở
        1440, 367px ở 1100, 645px ở 375. Bảng tràn đúng như giấy phép, bàn đo
        in dấu tick. Chốt "đừng tệ hơn hôm qua" đúng lúc vừa vá xong một lỗi;
        nhưng để lâu thì nó thôi làm cái SÀN và thành cái MÁI — hiện trạng
        được chứng nhận, và người duy nhất phát hiện ra là Sếp, bằng ảnh chụp.
        → BÀI HỌC CHUNG: chốt chống-tệ-đi phải có HẠN DÙNG.

     ② Dòng mẫu của nó là chữ NGẮN ("Nguyễn Văn An", "29/08/2026"). Bề ngang
        một bảng do CHỮ DÀI NHẤT quyết định, không phải chữ trung bình. Đo
        bằng dữ liệu không ai có thì ra con số không ai gặp: cùng cái cây đó,
        chèn mô tả việc dài 180 ký tự (đúng thứ Sếp và chị Huyền gõ hằng
        ngày) thì **17/26 bảng tràn ngay ở 1440px**.

   BÀN ĐO NÀY KHÔNG CÓ CỬA THA:
     · Không có bảng mốc số. Tràn là trượt.
     · Muốn được tràn thì phải nằm trong `BANG_GIU_CUON` của app.js — nơi mỗi
       khoá BẮT BUỘC kèm LÝ DO viết bằng chữ (arm C đọc chính danh sách đó).
       Không có cửa "thêm một con số cho qua".
     · In ra ĐÃ SOI BAO NHIÊU BẢNG và trượt nếu soi hụt (arm D). Bàn đo canh
       22 bảng trong khi ERP có 26 là bàn đo mù 4 bảng.

   CÁCH ĐO — Chrome thật, app.js thật, bề ngang đổi bằng
   `Emulation.setDeviceMetricsOverride` (co khung bằng CSS thì
   `window.innerWidth` vẫn là số cũ và phép đo nói dối).
   Ba bề ngang, đúng bề ngang người ta thật sự dùng:
     1440 — màn máy tính Sếp đang ngồi (ảnh Sếp gửi chụp ở đây)
     1280 — laptop phổ thông
      375 — điện thoại

   CHẠY:
     node scripts/do-bang-that.mjs                → đo cây làm việc
     node scripts/do-bang-that.mjs --bang-ke      → in bảng kê đầy đủ
     node scripts/do-bang-that.mjs --commit <sha> → đo cây cũ (lấy số TRƯỚC)
     node scripts/do-bang-that.mjs --tu-kiem      → BH-16: dựng một bảng mới
       có cột chữ dài KHÔNG đánh dấu. Bàn đo PHẢI ĐỎ. Không chứng minh được
       thì nó là đồ trang trí.
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';
import { ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dso = process.argv;
const lay = (co, mac) => { const i = dso.indexOf(co); return i > 0 ? dso[i + 1] : mac; };
const COMMIT = lay('--commit', null);
const BANG_KE = dso.includes('--bang-ke');
const TU_KIEM = dso.includes('--tu-kiem');

/* Ba bề ngang người ta THẬT SỰ dùng. Không đo 900/320 nữa: chúng nằm giữa hai
   mốc đã đo và chỉ làm loãng con số phải báo cho Sếp. */
const RONGS = [1440, 1280, 375];

/* MẪU SỐ. ERP hiện có 26 bảng (đếm bằng chính bàn đo này, `--bang-ke`). Nếu
   một hôm nó soi được ít hơn, hoặc là có bảng bị mất, hoặc là bàn đo hỏng —
   cả hai đều phải báo, không được im. Thêm bảng mới thì SỬA SỐ NÀY LÊN, và
   việc phải sửa chính là lời nhắc "bảng mới của mày đã đo chưa?". */
const SO_BANG_PHAI_SOI = 26;

/* MỐC CHỮ và MỐC CHIỀU CAO DÒNG — hai chốt chống "sửa quá tay". Sếp dặn
   thẳng: bỏ bớt CỘT, không thu nhỏ CHỮ; và không được làm giảm số dòng thấy
   được. Số lấy từ cây trước bản vá (755d556), giữ nguyên không nới. */
const MOC_CHU = { chuBody: 15, chuO: 13.5, chuTieuDe: 11 };
const MOC_CAO_DONG = { 1440: 55, 1280: 55, 375: 50 };

/* ---- DÒNG MẪU: DỮ LIỆU THẬT, KHÔNG PHẢI DỮ LIỆU DỄ ------------------------
   Đây là điểm khác cốt lõi với bàn đo cũ. Chữ lấy đúng giọng người trong công
   ty gõ: một mô tả việc kho vận thật, một tên người kèm chức danh thật. Không
   nhồi bừa 500 ký tự để thổi phồng — nhồi bừa thì con số cũng vô nghĩa như
   chữ ngắn, chỉ lệch về phía kia. Chữ mẫu Y HỆT NHAU ở lượt trước và lượt
   sau, nếu không thì hai con số không so được với nhau. */
const CHU_DAI = 'Rà soát toàn bộ tồn kho hàng nhập khẩu quý 3, đối chiếu số liệu giữa ' +
  'phần mềm và kiểm kê thực tế tại kho Hà Nội, lập biên bản chênh lệch gửi Kế toán trưởng trước ngày 15';
const TEN_NGUOI = 'Nguyễn Thị Huyền (Vận hành sàn Shopee & TikTok)';

const CHEN_DONG_THAT = `(function(){
  const DAI = ${JSON.stringify(CHU_DAI)};
  const TEN = ${JSON.stringify(TEN_NGUOI)};
  let dem = 0;
  document.querySelectorAll('table').forEach(t => {
    const tb = t.tBodies[0]; if (!tb || tb.rows.length) return;
    const ths = [...t.querySelectorAll('thead th')];
    if (!ths.length) return;
    const tr = document.createElement('tr');
    tr.dataset.dongMau = '1';
    ths.forEach(th => {
      const td = document.createElement('td');
      const nhan = th.textContent.trim().toLowerCase();
      if (!nhan) { td.innerHTML = '<button class="btn-nho">Xem</button>'; }
      else if (th.classList.contains('num')) { td.className = 'num'; td.textContent = '1.234.567'; }
      else if (/việc|đầu ra|mô tả|ghi chú|nội dung|kết quả|lý do|tiêu đề|sản phẩm|mục tiêu|kỹ năng|thay đổi|đo bằng|khách hàng|tên/.test(nhan)) td.textContent = DAI;
      else if (/người|nhận|giao|thực hiện|phối|nhân sự|giữ|xác nhận|đối tác|hủy/.test(nhan)) td.textContent = TEN;
      else td.textContent = '29/08/2026';
      tr.appendChild(td);
    });
    tb.appendChild(tr); dem++;
  });
  return dem;
})()`;

/* Mở mọi tổ tiên đang `[hidden]` (tab/panel/cửa sổ chưa mở) rồi ĐỢI MỘT NHỊP
   trước khi đo — `ganBaoCuonNgang()` và `luoiBang()` chạy trong
   requestAnimationFrame; đo ngay là đo trước khi ứng dụng kịp dập lớp cột và
   gắn dải "còn cột bên phải", bàn đo sẽ báo đỏ oan.
   TUYỆT ĐỐI KHÔNG ép `display` của thứ bị CSS ẩn: đó là chế độ THẺ do media
   query bật — ép mở là tự dựng một màn hình không ai nhìn thấy rồi chấm nó. */
const MO_HET = `(function(){
  window.__daMo = [];
  document.querySelectorAll('[hidden]').forEach(el => {
    if (el.closest('template')) return;
    el.hidden = false; window.__daMo.push(el);
  });
  return window.__daMo.length;
})()`;

const DO_MOI_BANG = `(function(){
  const kq = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0];
    const ma = (tb && tb.id) || t.id || '(không tên)';
    const khungEl = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    const anCss = getComputedStyle(khungEl).display === 'none';
    let ban = null;
    if (!anCss) {
      const kRect = khungEl.getBoundingClientRect();
      const khung = khungEl.clientWidth;
      const rong = Math.max(t.scrollWidth, khungEl.scrollWidth);
      const ths = [...t.querySelectorAll('thead th')].filter(x => getComputedStyle(x).display !== 'none');
      const roiRa = ths.filter(x => {
        const r = x.getBoundingClientRect();
        return (r.right - kRect.left) > khung + 1;
      }).map(x => x.textContent.trim() || '(nút)');
      const em = khungEl.nextElementSibling;
      const coBao = !!(em && em.classList.contains('cuon-bao') &&
                       getComputedStyle(em).display !== 'none');
      ban = { khung, rong, tran: rong > khung + 1, thua: Math.max(0, rong - khung),
              soCot: ths.length, roiRa, coBao };
    }
    kq.push({ ma, an: anCss, ...(ban || {}) });
  }
  return kq;
})()`;

/* ĐƯỜNG XEM CHO CỘT ĐÃ GIẤU. Giấu cột để bảng vừa màn chỉ hợp lệ khi trường
   bị giấu VẪN TỚI ĐƯỢC. ERP này đã bị chị Vũ Lan Hương góp ý vì cắt danh sách
   âm thầm (`npm run do-cat-im-lang`) — đừng phạm lại dưới cái tên khác. Kiểm
   ba việc, tại chỗ, trên trình duyệt thật:
     · dòng nào có ô `.cot-phu` CÓ NỘI DUNG thì phải có nút "Chi tiết"
     · nút đó phải ≥44px cả hai chiều (ngón tay ở kho, ngoài nắng)
     · bấm vào phải MỞ RA đúng những trường đang bị giấu, không phải mở suông */
const DO_DUONG_XEM = `(function(){
  const thieuNut = [], nutNho = [], khongMo = [];
  let soDongCoPhu = 0, soMoDuoc = 0;
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb) continue;
    const ma = (tb && tb.id) || t.id || '(không tên)';
    /* Bảng đang bị CSS ẩn (đã chuyển sang thẻ dựng tay như Góp ý, Tồn kho)
       thì mọi thứ trong nó đo ra 0×0 — chấm nút ở đó là chấm một màn hình
       không ai nhìn thấy. Thẻ của chúng có đường xem riêng, không qua nút này. */
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') continue;
    for (const tr of [...tb.rows]) {
      if (tr.classList.contains('dong-chitiet')) continue;
      const oPhu = [...tr.cells].filter(td => td.classList.contains('cot-phu') && td.textContent.trim());
      if (!oPhu.length) continue;
      soDongCoPhu++;
      const nut = tr.querySelector('button[data-chitiet]');
      if (!nut) { thieuNut.push(ma); continue; }
      const r = nut.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) nutNho.push(ma + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      nut.click();
      const sau = tr.nextElementSibling;
      const soO = sau && sau.classList.contains('dong-chitiet')
        ? sau.querySelectorAll('.chitiet-o').length : 0;
      if (soO < oPhu.length) khongMo.push(ma + ' (' + soO + '/' + oPhu.length + ')');
      else soMoDuoc++;
      nut.click();   // đóng lại, trả trang về nguyên trạng cho phép đo sau
    }
  }
  return { thieuNut, nutNho, khongMo, soDongCoPhu, soMoDuoc };
})()`;

const DO_CHU_VA_DONG = `(function(){
  const cs = getComputedStyle(document.body);
  let o = null, dong = null;
  for (const td of document.querySelectorAll('tbody td')) {
    const r = td.getBoundingClientRect();
    if (r.height > 0) { o = td; dong = td.parentElement; break; }
  }
  return {
    chuBody: parseFloat(cs.fontSize),
    chuO: o ? parseFloat(getComputedStyle(o).fontSize) : null,
    /* Ở chế độ THẺ (≤780px) thead bị ẩn hẳn — không có tiêu đề cột để đo.
       Nhưng nhãn cột KHÔNG biến mất: nó chuyển thành td::before đọc từ
       data-nhan. Đo đúng cái nhãn người dùng THẬT SỰ nhìn thấy, thay vì trả
       null rồi trượt oan (hoặc tệ hơn: bỏ qua và không đo gì cả). */
    chuTieuDe: (function(){
      for (const th of document.querySelectorAll('thead th'))
        if (th.getBoundingClientRect().height > 0) return parseFloat(getComputedStyle(th).fontSize);
      for (const td of document.querySelectorAll('.luoi-bang tbody td[data-nhan]')) {
        if (!td.dataset.nhan || td.getBoundingClientRect().height <= 0) continue;
        const cs = getComputedStyle(td, '::before');
        if (cs.content && cs.content !== 'none') return parseFloat(cs.fontSize);
      }
      return null;
    })(),
    caoDong: dong ? Math.round(dong.getBoundingClientRect().height) : null
  };
})()`;

/* ---- Đọc danh sách miễn trừ TỪ CHÍNH app.js -------------------------------
   Không chép lại vào đây. Chép lại là tạo bản sự thật thứ hai, và bản sao
   luôn là bản đúng cho tới hôm nó lệch. */
function docBangGiuCuon() {
  const src = fs.readFileSync(path.join(GOC, 'public/assets/js/app.js'), 'utf8');
  const khoi = src.match(/const BANG_GIU_CUON = \{([\s\S]*?)\n\};/);
  if (!khoi) return null;
  const ds = {};
  for (const m of khoi[1].matchAll(/'([^']+)':\s*((?:'[^']*'(?:\s*\+\s*)?)+)/g))
    ds[m[1]] = m[2].split('+').map(x => x.trim().replace(/^'|'$/g, '')).join('');
  return ds;
}

/* MẪU HỎNG GIẢ (--tu-kiem): dựng THÊM một bảng mới, kiểu bảng mà người sau
   này sẽ thêm — bốn cột, hai cột chữ tự do, KHÔNG đánh dấu `.cot-chu` /
   `.cot-phu`. Đúng thứ bàn đo phải bắt được mà không cần ai nhớ khai báo. */
const GAI_BANG_TRAN = `(function(){
  const v = document.querySelector('.view:not([hidden])') || document.body;
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  wrap.innerHTML = '<table><thead><tr><th>Nội dung bàn giao</th><th>Ghi chú của quản lý</th>' +
    '<th>Người lập</th><th>Ngày</th></tr></thead><tbody id="bang-gai-tu-kiem"></tbody></table>';
  v.appendChild(wrap);
  return 1;
})()`;

const may = await dungMayGia({ commit: COMMIT, tatHoatAnh: true });
const BANG_KE_HET = {};
const MIEN_TRU = docBangGiuCuon();

for (const RONG of RONGS) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });

  await cr.chay(MO_HET);
  if (TU_KIEM) await cr.chay(GAI_BANG_TRAN);
  const soChen = await cr.chay(CHEN_DONG_THAT);
  await cr.doi(800);            // để luoiBang() + ganBaoCuonNgang() chạy xong
  const ds = await cr.chay(DO_MOI_BANG);
  const xem = await cr.chay(DO_DUONG_XEM);
  const cd = await cr.chay(DO_CHU_VA_DONG);
  BANG_KE_HET[RONG] = ds;

  const hien = ds.filter(b => !b.an);
  const tran = hien.filter(b => b.tran);
  const tranKhongPhep = tran.filter(b => !(MIEN_TRU && MIEN_TRU[b.ma]));

  /* ---- D. MẪU SỐ — bàn đo có soi hết bảng không? ------------------------ */
  ok(`D @${RONG}px · đã soi ${ds.length} bảng (tối thiểu ${SO_BANG_PHAI_SOI}) · chèn dòng thật vào ${soChen} bảng`,
     ds.length >= SO_BANG_PHAI_SOI && soChen > 0,
     `soi ${ds.length} · chèn ${soChen}`);

  /* ---- A. VỚI DỮ LIỆU THẬT, 0 BẢNG TRÀN --------------------------------
     Không mốc, không tha. Muốn tràn thì phải có tên + LÝ DO trong
     BANG_GIU_CUON của app.js, và arm C kiểm lý do đó có thật hay không. */
  ok(`A @${RONG}px · 0 bảng tràn với dữ liệu thật ` +
     `(hiện ${hien.length} · tràn ${tran.length} · miễn trừ có lý do ${tran.length - tranKhongPhep.length})`,
     tranKhongPhep.length === 0,
     tranKhongPhep.map(b => `${b.ma} +${b.thua}px [rơi: ${(b.roiRa || []).join(', ') || '—'}]`).join(' · '));

  /* ---- B. BẢNG CÒN CUỘN THÌ PHẢI NÓI RA --------------------------------- */
  const cuonMaCam = tran.filter(b => !b.coBao);
  ok(`B @${RONG}px · mọi bảng còn cuộn đều báo "còn cột bên phải" (${tran.length} bảng)`,
     cuonMaCam.length === 0, cuonMaCam.map(b => b.ma).join(', '));

  /* ---- B2. BẢNG ĐÃ VỪA MÀN THÌ KHÔNG ĐƯỢC CÒN LỜI NHẮC KÉO --------------
     Sếp gửi ảnh có đúng dòng "kéo ngang để xem tiếp" trong khung. Bảng đã
     vừa mà vẫn dán lời nhắc là nói dối người dùng — và là đúng thứ Sếp bảo
     bỏ. */
  const baoThua = hien.filter(b => !b.tran && b.coBao);
  ok(`B2 @${RONG}px · 0 bảng đã vừa màn mà vẫn hiện lời nhắc kéo ngang`,
     baoThua.length === 0, baoThua.map(b => b.ma).join(', '));

  /* ---- G. CỘT GIẤU PHẢI CÓ ĐƯỜNG XEM, BẤM ĐƯỢC BẰNG NGÓN TAY ------------ */
  ok(`G @${RONG}px · mọi dòng có cột giấu đều có nút "Chi tiết" (${xem.soDongCoPhu} dòng)`,
     xem.thieuNut.length === 0, xem.thieuNut.join(', '));
  ok(`G2 @${RONG}px · nút "Chi tiết" ≥44px`,
     xem.nutNho.length === 0, xem.nutNho.join(', '));
  ok(`G3 @${RONG}px · bấm "Chi tiết" mở ra ĐỦ trường đang giấu (${xem.soMoDuoc}/${xem.soDongCoPhu})`,
     xem.khongMo.length === 0, xem.khongMo.join(', '));

  /* ---- E. KHÔNG BÓP CHỮ ------------------------------------------------- */
  ok(`E @${RONG}px · cỡ chữ thân trang không nhỏ đi (mốc ${MOC_CHU.chuBody}px)`,
     cd.chuBody >= MOC_CHU.chuBody, `${cd.chuBody}px`);
  ok(`E2 @${RONG}px · cỡ chữ trong ô bảng không nhỏ đi (mốc ${MOC_CHU.chuO}px)`,
     cd.chuO != null && cd.chuO >= MOC_CHU.chuO, `${cd.chuO}px`);
  ok(`E3 @${RONG}px · cỡ chữ tiêu đề cột không nhỏ đi (mốc ${MOC_CHU.chuTieuDe}px)`,
     cd.chuTieuDe != null && cd.chuTieuDe >= MOC_CHU.chuTieuDe, `${cd.chuTieuDe}px`);

  ok(`Z @${RONG}px · 0 lỗi console, 0 ngoại lệ`,
     cr.loiConsole.length === 0 && cr.ngoaiLe.length === 0,
     [...cr.loiConsole, ...cr.ngoaiLe].join(' | '));

  cr.dong();
}
may.dong();

/* ---- C. MỖI KHOÁ MIỄN TRỪ PHẢI CÓ LÝ DO VIẾT BẰNG CHỮ -------------------
   Đây là cái thay cho `MOC_TRAN`. Con số thì ai cũng thêm được trong ba giây
   và không ai đọc lại; một câu lý do thì người thêm phải nghĩ, và người sau
   đọc được để cãi. */
ok('C · đọc được danh sách miễn trừ BANG_GIU_CUON trong app.js', !!MIEN_TRU,
   MIEN_TRU ? `${Object.keys(MIEN_TRU).length} bảng` : 'KHÔNG ĐỌC ĐƯỢC');
for (const [ma, ly] of Object.entries(MIEN_TRU || {}))
  ok(`C · "${ma}" được kéo ngang có lý do đủ dài để cãi được`, ly.length > 60, ly);

if (BANG_KE) {
  console.log('\n' + '='.repeat(78) + '\nBẢNG KÊ ĐẦY ĐỦ — dữ liệu THẬT\n' + '='.repeat(78));
  for (const RONG of RONGS) {
    const ds = BANG_KE_HET[RONG];
    const hien = ds.filter(b => !b.an);
    console.log(`\n--- ${RONG}px · soi ${ds.length} bảng · hiện ${hien.length} · thẻ ${ds.length - hien.length} · tràn ${hien.filter(b => b.tran).length} ---`);
    for (const b of ds) {
      if (b.an) { console.log(`  ${b.ma.padEnd(20)} thẻ (bảng bị CSS ẩn)`); continue; }
      const nhan = b.tran ? ((MIEN_TRU && MIEN_TRU[b.ma]) ? 'CUỘN (có lý do)' : 'TRÀN') : 'vừa';
      console.log(`  ${b.ma.padEnd(20)} ${String(b.soCot).padStart(2)} cột · khung ${String(b.khung).padStart(4)} · bảng ${String(b.rong).padStart(4)} · ${nhan}` +
        (b.tran ? ` +${b.thua}px · rơi: ${(b.roiRa || []).join(', ') || '—'}` : ''));
    }
  }
}

process.exit(tongKet() ? 0 : 1);
