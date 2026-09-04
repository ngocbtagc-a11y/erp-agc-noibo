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
        chèn mô tả việc dài 200 ký tự (TRẦN ô nhập — đúng thứ Sếp và chị
        Huyền gõ hằng ngày) thì **17/26 bảng tràn ngay ở 1440px**.

   BÀN ĐO NÀY KHÔNG CÓ CỬA THA:
     · Không có bảng mốc số. Tràn là trượt.
     · Muốn được tràn thì phải nằm trong `BANG_GIU_CUON` của app.js — nơi mỗi
       khoá BẮT BUỘC kèm LÝ DO viết bằng chữ (arm C đọc chính danh sách đó).
       Không có cửa "thêm một con số cho qua".
     · In ra ĐÃ SOI BAO NHIÊU BẢNG và trượt nếu soi hụt (arm D). Bàn đo canh
       22 bảng trong khi ERP có 27 là bàn đo mù 5 bảng.

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
import { dungMayGia, moChrome, TOI, TOI_ID } from './lib/ban-do-chrome.mjs';
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

/* MẪU SỐ. ERP hiện có 27 bảng: 26 viết sẵn trong `app.html` + 1 dựng bằng JS
   (`#cv-tqct-phongban`, xem `API_CHO_BANG_27` bên dưới). Nếu một hôm nó soi
   được ít hơn, hoặc là có bảng bị mất, hoặc là bàn đo hỏng — cả hai đều phải
   báo, không được im. Thêm bảng mới thì SỬA SỐ NÀY LÊN, và việc phải sửa
   chính là lời nhắc "bảng mới của mày đã đo chưa?". */
const SO_BANG_PHAI_SOI = 27;

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
/* ĐÚNG 200 KÝ TỰ = TRẦN Ô NHẬP tiêu đề việc (`src/index.js` cắt `slice(0,200)`)
   — REV-0059 CAO-1. Bản đầu dùng 169 ký tự, tức vẫn là "chữ dài vừa phải" chứ
   không phải chữ dài NHẤT mà người dùng gõ được. Bề ngang một bảng và chiều
   cao một cái thẻ đều do ca xấu nhất quyết định; đo dưới trần là để hở đúng
   khoảng mà người ta sẽ chạm tới. */
const CHU_DAI = 'Rà soát toàn bộ tồn kho hàng nhập khẩu quý 3, đối chiếu số liệu giữa ' +
  'phần mềm và kiểm kê thực tế tại kho Hà Nội, lập biên bản chênh lệch gửi Kế toán trưởng ' +
  'trước ngày 15 và gửi bản mềm cho chị Hằng ok';
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

/* MẪU HỎNG GIẢ (--tu-kiem): dựng THÊM một bảng mới, kiểu bảng người sau này
   sẽ thêm mà quên khai cột nào là cột phụ.

   ⚠️ MẪU NÀY ĐÃ PHẢI ĐỔI MỘT LẦN, và lý do đáng ghi lại. Bản đầu gài bốn cột
   trong đó hai cột chữ tự do dài. Sau khi thêm LƯỚI CHẶN CUỐI trong
   `luoiBang()` (ô nào chứa >60 ký tự thì TỰ được cấp trần), cái bảng gài đó
   được lưới cứu và bàn đo in "54 ĐẠT · 0 TRƯỢT" — tự kiểm mất răng mà không
   ai báo. Đó là tin MỪNG cho ứng dụng và tin XẤU cho bàn đo: mẫu hỏng phải
   nhắm vào thứ lưới KHÔNG nuốt được, nếu không nó chỉ chứng minh lưới chạy
   chứ không chứng minh bàn đo còn mắt.

   Nay gài 14 cột chữ NGẮN — ngày tháng, mã, số. Lưới chặn cuối không đụng tới
   (không ô nào dài quá 60 ký tự), `.cot-phu` thì không ai khai, nên bảng tràn
   thật. Đây đúng ca "ai đó thêm bảng 14 cột vào ngày mai" mà Sếp cần máy kêu
   thay vì phải chụp ảnh màn hình. */
const GAI_BANG_TRAN = `(function(){
  const v = document.querySelector('.view:not([hidden])') || document.body;
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const cot = ['Ngày lập','Ngày duyệt','Ngày giao','Ngày nhận','Ngày trả',
               'Mã phiếu','Mã lô','Mã kho','Mã ca','Số lượng',
               'Số kiện','Số pallet','Số xe','Số seal'];
  wrap.innerHTML = '<table><thead><tr>' + cot.map(c => '<th>' + c + '</th>').join('') +
    '</tr></thead><tbody id="bang-gai-tu-kiem"></tbody></table>';
  v.appendChild(wrap);
  return 1;
})()`;

/* ---- BẢNG THỨ 27, DỰNG BẰNG JS — REV-0059 THẤP-1 ------------------------
   `#cv-tqct-phongban` ("Tổng quan công ty theo phòng ban", chỉ Admin) không
   nằm trong `app.html`: nó được `innerHTML` dựng ra khi có dữ liệu. Máy giả
   mặc định trả mảng rỗng → bảng không bao giờ ra đời → không bao giờ bị soi.
   Đó đúng kiểu mù mà bàn đo này sinh ra để chặn, nên trả dữ liệu cho nó chứ
   không ghi chú rồi bỏ qua. Nhớ: bảng nào dựng bằng JS thì phải NUÔI nó ở
   đây, không thì mẫu số 27 chỉ là con số trên giấy. */
const API_CHO_BANG_27 = (duong, u, traJson) => {
  if (duong === '/api/toi-la-ai') {
    traJson({ ...TOI, la_admin: true, quyen: [...TOI.quyen, 'congviec'] });
    return true;
  }
  if (duong === '/api/cong-viec/tong-quan-congty') {
    traJson({ dang_mo: 12, qua_han: 3, cho_duyet: 2, viec_qua_han: [],
      theo_phong_ban: [
        { bo_phan: 'Kho vận', dang_mo: 5, qua_han: 2, cho_duyet: 1 },
        { bo_phan: 'Kế toán', dang_mo: 4, qua_han: 1, cho_duyet: 0 },
        { bo_phan: 'Kinh doanh', dang_mo: 3, qua_han: 0, cho_duyet: 1 }
      ] });
    return true;
  }
  return false;
};

const may = await dungMayGia({ commit: COMMIT, tatHoatAnh: true, apiRieng: API_CHO_BANG_27 });
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

/* ==========================================================================
   ARM R — ĐO TRÊN ĐƯỜNG VẼ THẬT CỦA ỨNG DỤNG
   ---------------------------------------------------------------------------
   REV-0059 CHẶN-1. Mọi arm ở trên đo trên dòng do CHÍNH BÀN ĐO chèn vào, và
   dòng đó có đúng một `<td>` cho mỗi `<th>`, nội dung là chữ phẳng. Ứng dụng
   thật đi qua hai nhánh mà bàn đo chưa lần nào đi qua:

     ① Ô lồng thẻ con — `<div class="nm">…</div>` — chứ không phải chữ phẳng.
     ② Số ô vẽ THEO ĐIỀU KIỆN nên khác số `<th>` (Nhân sự 6 `<th>` / 4 `<td>`
        khi người xem không có quyền xem lương).

   Đúng ở đó thanh kéo ngang còn sót: anh Phạm Khương Duy (vai `quan_ly_kho`)
   mở tab Nhân sự trên điện thoại, bảng rộng 711px trong khung 341px, và thẻ
   thì không có tên trường nào. Bàn đo cũ in "37 ĐẠT · 0 TRƯỢT" ngay lúc đó.

   Nên arm này KHÔNG chèn dòng. Nó nạp dữ liệu qua API giả rồi để ứng dụng tự
   vẽ, bấm qua từng tab, và chấm đúng cái người dùng nhận được. Ý này lấy từ
   `scripts/ho-ly-duong-that.mjs` của Hồ Ly, gộp vào đây thay vì giữ tệp rời.
   ========================================================================== */

/* Vai KHÔNG xem được lương và KHÔNG quản trị nhân sự — đúng cấu hình của anh
   Phạm Khương Duy và chị Vũ Lan Hương (`src/quyen.js`, `xem_luong: false`).
   Đây là vai đẩy bảng Nhân sự vào đúng nhánh lệch ô. */
const TEN_TRAN = 'Nguyễn Thị Hoàng Yến Phương Thảo Quỳnh Anh Trần Lê Minh Khuê Bảo Ngọc Hà My Chi';  // 80 ký tự = trần ô nhập
const NS_THAT = [
  { id: 'NS-A', ma_nv: 'AGC-0001', ho_ten: TEN_TRAN, viet_tat: 'NY',
    chuc_vu: 'Chuyên viên Vận hành sàn Shopee & TikTok kiêm Chăm sóc khách hàng',
    bo_phan: 'Kinh doanh', trang_thai: 'dang_lam', ngay_vao: '2025-01-05', dang_lam: 1, co_anh: 0 },
  { id: 'NS-B', ma_nv: 'AGC-0002', ho_ten: 'Phạm Khương Duy', viet_tat: 'KD', chuc_vu: 'Quản lý kho',
    bo_phan: 'Kho vận', trang_thai: 'dang_lam', ngay_vao: '2024-03-01', dang_lam: 1, co_anh: 0 }
];
const VIEC_THAT = [1, 2, 3].map(i => ({
  id: 500 + i, tieu_de: CHU_DAI.slice(0, 200), dau_ra: CHU_DAI, mo_ta: CHU_DAI,
  phoi_hop_ids: null, phoi_hop_ten: TEN_NGUOI, ket_qua: CHU_DAI,
  nguoi_giao_id: 'NS-DUY', nguoi_giao_ten: TEN_NGUOI,
  nguoi_nhan_id: TOI_ID, nguoi_nhan_ten: TEN_NGUOI,
  han_chot: '2026-09-0' + i, trang_thai: 'dang_lam',
  tao_luc: '2026-08-20 09:00:00', cap_nhat_luc: '2026-08-28 10:00:00',
  muc_tieu_id: 1, muc_tieu_ten: CHU_DAI.slice(0, 60)
}));
const GOPY_THAT = [1, 2].map(i => ({
  id: i, ma: 'GY-000' + i, tieu_de: CHU_DAI.slice(0, 120), trang_thai: 'moi',
  next_owner: 'OWNER', nguoi_gui_id: 'NS-KHAC', nguoi_gui_ten: TEN_NGUOI,
  nguoi_gui_bo_phan: 'Kho vận', ngay_gui: '2026-08-28', risk: 'cao',
  quan_ly_cap1_id: null, so_anh: 0
}));

const API_THAT = (duong, u, traJson) => {
  if (duong === '/api/toi-la-ai') {
    traJson({ ...TOI, vai_tro: 'quan_ly_kho', la_admin: false, them_nhan_su: false,
              phong_ban_quan_ly: [],
              quyen: ['tongquan', 'lichsuviec', 'danhba', 'nhansu', 'gopy', 'kinhdoanh'] });
    return true;
  }
  if (duong === '/api/nhan-su') { traJson({ nhan_su: NS_THAT, xem_luong: false }); return true; }
  if (duong === '/api/cong-viec/danh-sach') {
    traJson({ nhan: VIEC_THAT, giao: [], phoi_hop: [],
              cat_nhan: null, cat_giao: null, cat_phoi_hop: null });
    return true;
  }
  if (duong === '/api/gop-y') {
    traJson({ gop_y: GOPY_THAT, la_admin: false, duyet_gopy: false, toi_la: TOI_ID });
    return true;
  }
  if (duong === '/api/kinh-doanh/don-hang-huy') {
    traJson({ co_bang: true, co_van_don: false, don_huy: [1, 2].map(i => ({
      id: i, nguon: 'shopee', ngay: '2026-08-2' + i, ma_don_hang: 'SPX00' + i,
      ma_van_don: null, nguoi_mua: TEN_NGUOI, san_pham: CHU_DAI,
      gia_tri_don: 1234567, ai_huy: TEN_NGUOI, ly_do_huy: CHU_DAI })) });
    return true;
  }
  return false;
};

/* Chấm ĐÚNG cái người dùng nhận được, trên từng dòng ứng dụng tự vẽ:
     · `luoiBang()` có xử lý dòng đó không (`data-luoi`)
     · mọi ô có nhãn `data-nhan` chưa (thiếu là thẻ mất tên trường)
     · bảng có tràn khung không
   Chỉ soi bảng ĐANG HIỆN và CÓ DÒNG — bảng rỗng thì không có gì để chấm. */
const DO_DUONG_VE_THAT = `(function(){
  const kq = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb || !tb.rows.length) continue;
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') continue;
    if (!t.getClientRects().length) continue;
    const ma = tb.id || t.id || '(không tên)';
    const hang = t.querySelector('thead tr:last-of-type');
    const dong = [...tb.rows].filter(tr => !tr.classList.contains('dong-chitiet'));
    const chuaDap = dong.filter(tr => !tr.dataset.luoi);
    const thieuNhan = dong.filter(tr => [...tr.cells].some(td => td.dataset.nhan == null));
    const khung = w.clientWidth;
    const rong = Math.max(t.scrollWidth, w.scrollWidth);
    kq.push({ ma, soDong: dong.length,
              soTh: hang ? hang.children.length : 0,
              soTd: dong[0] ? dong[0].cells.length : 0,
              chuaDap: chuaDap.length, thieuNhan: thieuNhan.length,
              khung, rong, thua: Math.max(0, rong - khung) });
  }
  return kq;
})()`;

const mayThat = await dungMayGia({ commit: COMMIT, tatHoatAnh: true, apiRieng: API_THAT });
const TAB_SOI = ['lichsuviec', 'danhba', 'nhansu', 'gopy', 'kinhdoanh'];
for (const RONG of RONGS) {
  const cr = await moChrome({ url: `http://127.0.0.1:${mayThat.cong}/app.html`, rong: RONG, doiMs: 2600 });
  const chuaDap = [], thieuNhan = [], tran = [];
  let soSoi = 0;
  for (const tab of TAB_SOI) {
    await cr.chay(`(document.querySelector('[data-tab="${tab}"]')||{click(){}}).click(); 1`);
    await cr.doi(1400);
    for (const b of await cr.chay(DO_DUONG_VE_THAT)) {
      soSoi++;
      if (b.chuaDap) chuaDap.push(`${b.ma} (${b.chuaDap}/${b.soDong} dòng · ${b.soTh} th/${b.soTd} td)`);
      if (b.thieuNhan) thieuNhan.push(`${b.ma} (${b.thieuNhan} dòng mất nhãn)`);
      if (b.thua > 1 && !(MIEN_TRU && MIEN_TRU[b.ma])) tran.push(`${b.ma} +${b.thua}px`);
    }
  }

  ok(`R @${RONG}px · mọi dòng ứng dụng TỰ VẼ đều được lưới bảng xử lý (soi ${soSoi} lượt bảng)`,
     chuaDap.length === 0 && soSoi > 0, chuaDap.join(' · ') || (soSoi ? '' : 'KHÔNG SOI ĐƯỢC BẢNG NÀO'));
  ok(`R2 @${RONG}px · mọi ô trên đường vẽ thật đều có nhãn cột (thẻ không mất tên trường)`,
     thieuNhan.length === 0, thieuNhan.join(' · '));
  ok(`R3 @${RONG}px · 0 bảng tràn trên đường vẽ thật`,
     tran.length === 0, tran.join(' · '));
  ok(`R4 @${RONG}px · 0 lỗi console, 0 ngoại lệ khi ứng dụng tự vẽ`,
     cr.loiConsole.length === 0 && cr.ngoaiLe.length === 0,
     [...cr.loiConsole, ...cr.ngoaiLe].join(' | '));
  cr.dong();
}
mayThat.dong();

/* ==========================================================================
   ARM X — HAI MA TRẬN XẾP CA THẬT SỰ GIỮ KÉO NGANG Ở MỌI BỀ NGANG?
   ---------------------------------------------------------------------------
   REV-0059 ④③. Lời khai cũ nói hai bảng này "giữ kéo ngang ở MỌI bề ngang",
   nhưng arm A ở 375px báo "miễn trừ có lý do 0" — tức là lúc đo chúng RỖNG,
   không có cột nào, nên không chứng minh được gì. Đo rỗng rồi khai là đã đo
   thì đúng là kiểu nói dối mà cả việc này đi chữa.

   Ở đây dựng thật: tiêu đề 7 ngày + một hàng ca, rồi hỏi ba câu:
     · bảng có KHÔNG mang lớp `.luoi-bang` không (tức không đổi sang thẻ)
     · ở 375px nó có tràn thật không
     · tràn thì có dải "còn cột bên phải" không
   ========================================================================== */
const DUNG_MA_TRAN = `(function(){
  const NGAY = ['Thứ Hai 07/09','Thứ Ba 08/09','Thứ Tư 09/09','Thứ Năm 10/09',
                'Thứ Sáu 11/09','Thứ Bảy 12/09','Chủ Nhật 13/09'];
  let dem = 0;
  for (const ma of ['xc-kehoach', 'xc-matrix']) {
    const th = document.querySelector('#' + ma + '-thead');
    const tb = document.querySelector('#' + ma + '-tbody');
    if (!th || !tb) continue;
    th.innerHTML = '<tr><th>Nhân sự</th>' + NGAY.map(n => '<th>' + n + '</th>').join('') + '</tr>';
    tb.innerHTML = '<tr><td>Phạm Khương Duy</td>' +
      NGAY.map(() => '<td>Ca sáng 8h–17h</td>').join('') + '</tr>';
    dem++;
  }
  return dem;
})()`;
const DO_MA_TRAN = `(function(){
  const kq = [];
  for (const ma of ['xc-kehoach-tbody', 'xc-matrix-tbody']) {
    const tb = document.getElementById(ma); if (!tb) continue;
    const t = tb.closest('table');
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    const em = w.nextElementSibling;
    kq.push({ ma,
      laLuoiBang: t.classList.contains('luoi-bang'),
      khung: w.clientWidth, rong: Math.max(t.scrollWidth, w.scrollWidth),
      tran: Math.max(t.scrollWidth, w.scrollWidth) > w.clientWidth + 1,
      coBao: !!(em && em.classList.contains('cuon-bao') && getComputedStyle(em).display !== 'none') });
  }
  return kq;
})()`;

const mayXc = await dungMayGia({ commit: COMMIT, tatHoatAnh: true });
for (const RONG of [1440, 375]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${mayXc.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(MO_HET);
  const soDung = await cr.chay(DUNG_MA_TRAN);
  await cr.doi(900);
  const ds = await cr.chay(DO_MA_TRAN);
  ok(`X @${RONG}px · dựng được ${soDung}/2 ma trận xếp ca để đo (không đo bảng rỗng rồi khai là đã đo)`,
     soDung === 2 && ds.length === 2, `dựng ${soDung} · đo ${ds.length}`);
  const thanhThe = ds.filter(b => b.laLuoiBang);
  ok(`X2 @${RONG}px · ma trận xếp ca KHÔNG đổi sang thẻ (một cột là một ngày)`,
     thanhThe.length === 0, thanhThe.map(b => b.ma).join(', '));
  if (RONG === 375) {
    const camNin = ds.filter(b => b.tran && !b.coBao);
    ok(`X3 @375px · ma trận có kéo ngang thật và NÓI RA (${ds.map(b => b.ma + ' ' + b.rong + '/' + b.khung).join(' · ')})`,
       ds.every(b => b.tran) && camNin.length === 0,
       camNin.length ? 'cuộn mà im: ' + camNin.map(b => b.ma).join(', ') : '');
  }
  cr.dong();
}
mayXc.dong();

/* ---- C. MỖI KHOÁ MIỄN TRỪ PHẢI CÓ LÝ DO VIẾT BẰNG CHỮ -------------------
   Đây là cái thay cho `MOC_TRAN`. Con số thì ai cũng thêm được trong ba giây
   và không ai đọc lại; một câu lý do thì người thêm phải nghĩ, và người sau
   đọc được để cãi.

   ⚠️ ĐỌC KỸ TÊN CHỐT — REV-0059 VỪA-1. Chốt này ĐẾM KÝ TỰ, nó KHÔNG đọc được
   nghĩa. Hồ Ly tiêm 80 ký tự "aaaa bbbb cccc…" vào một lý do và bàn đo vẫn in
   37 ĐẠT · 0 TRƯỢT. Tên cũ ("lý do đủ dài để CÃI ĐƯỢC") hứa nhiều hơn việc nó
   làm, nên người sau sẽ tưởng đã có máy canh. Cửa chặn thật ở đây là NGƯỜI
   SOI đọc diff — chốt này chỉ bảo đảm có một câu để mà đọc. Đừng đổi tên nó
   thành thứ nghe oai hơn. */
ok('C · đọc được danh sách miễn trừ BANG_GIU_CUON trong app.js', !!MIEN_TRU,
   MIEN_TRU ? `${Object.keys(MIEN_TRU).length} bảng` : 'KHÔNG ĐỌC ĐƯỢC');
for (const [ma, ly] of Object.entries(MIEN_TRU || {}))
  ok(`C · "${ma}" có lý do dài ≥60 ký tự (ĐẾM KÝ TỰ — máy không đọc được nghĩa, người soi mới là cửa chặn)`,
     ly.length > 60, ly);

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
