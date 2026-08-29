/* ==========================================================================
   BÀN ĐO: BẢNG PHẢI VỪA MÀN — "ưu tiên hiển thị trên 1 trang"
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY. 29/08/2026 Sếp Bùi Thị Ngọc gửi ảnh thanh cuộn ngang:
     "ưu tiên hiển thị trên 1 trang, hạn chế kéo trang như này"

   Cùng một bệnh vừa chữa cho bảng góp ý (REV-0050), nhưng ở quy mô TOÀN ERP:
   bảng rộng hơn khung → phải kéo ngang → cột quan trọng rơi ra ngoài mà người
   dùng KHÔNG BIẾT mình đang thiếu gì.

   ERP-CONSTITUTION Rule 7 — Information Design:
     "Một cột chỉ xứng đáng có chỗ nếu nó trả lời câu hỏi người dùng mang tới
      TRƯỚC khi bấm vào. Chọn 3–4 cột cho điện thoại trước."

   CÁCH ĐO — Chrome thật, app.js thật, 5 bề ngang thật (1440 · 1100 · 900 ·
   375 · 320). Với MỖI bảng trong app.html:
     · mở đủ tổ tiên của nó (view/panel/modal) rồi trả lại nguyên trạng
     · nếu thân bảng rỗng thì CHÈN MỘT DÒNG MẪU, nội dung ngắn và thật
       ("Nguyễn Văn An", "29/08/2026", "1.234.567", một chip) — không nhồi
       chữ dài để thổi phồng số đo, và Y HỆT NHAU ở lượt trước và lượt sau
     · đo bề ngang KHUNG (`clientWidth` của chỗ cuộn) vs bề ngang BẢNG
       (`scrollWidth`), rồi liệt kê ĐÍCH DANH cột nào có mép phải nằm ngoài
   Bảng nào đang bị CSS ẩn ở bề ngang đó (đã chuyển sang thẻ) thì ghi "thẻ" —
   đó là ĐẠT, vì thẻ không có mép phải để rơi ra ngoài.

   HAI RÀNG BUỘC CHỐNG SỬA QUÁ TAY (Sếp dặn thẳng):
     · KHÔNG được bóp nhỏ cỡ chữ — nhân viên kho đọc điện thoại ngoài nắng.
     · KHÔNG được làm giảm số dòng thấy được.
   Hai thứ đó có arm đo riêng (F, G), so với mốc chốt cứng trong file này.

   CHẠY:
     node scripts/do-bang-vua-man.mjs                → đo cây làm việc
     node scripts/do-bang-vua-man.mjs --commit <sha> → đo cây cũ (lấy số TRƯỚC)
     node scripts/do-bang-vua-man.mjs --bang-ke      → in bảng kê đầy đủ
     node scripts/do-bang-vua-man.mjs --tu-kiem      → BH-16: chèn MỘT CỘT THỪA
       vào một bảng đang vừa màn. Bàn đo PHẢI ĐỎ. Không chứng minh được thì
       nó là đồ trang trí.
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

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
const RONGS = [1440, 1100, 900, 375, 320];

/* ---- BẢNG CỐ Ý GIỮ CUỘN NGANG ------------------------------------------
   Không phải bảng nào cũng ép vừa màn được, và ép bằng cách bỏ cột thì mất
   nghĩa. Ba bảng dưới đây là bảng ĐỐI CHIẾU: người dùng mở nó ra để so hàng
   ngang, bỏ cột là hỏng việc. Chúng được phép cuộn — NHƯNG phải nói rõ là
   còn cột bên phải (arm E), đừng để người ta tưởng đã thấy hết. */
const DUOC_CUON = {
  'kd-ds-bang': 'Đối soát sàn (12 cột) — đọc theo hàng ngang để so tiền với sàn; bỏ cột là mất nghĩa đối chiếu',
  'dh-bang':    'Đơn hoàn (11 cột) — kho đối chiếu mã vận đơn · sản phẩm · số tiền · kho nhận trên cùng một hàng',
  'ls-bang':    'Lịch sử đơn hoàn (12 cột) — sổ tra cứu, phải giữ đủ vết để đối chiếu với sàn',
  'kt-ts-bang': 'Kế toán tra soát (10 cột) — đối chiếu tiền hoàn với đơn gốc trên cùng một hàng',
  'xc-kehoach-tbody': 'Ma trận xếp ca — một cột là một ngày, số cột do lịch quyết',
  'xc-matrix-tbody':  'Ma trận xếp ca (tuần) — như trên'
};

/* ---- MỐC TRÀN TRƯỚC BẢN VÁ (đo trên 755d556, cùng bàn đo này) -----------
   Dùng làm CHỐT CHỐNG TỆ ĐI: không bảng nào được tràn nhiều hơn số này. Chỉ
   ghi những bảng từng tràn; bảng không có tên ở đây thì mốc là 0 (đang vừa
   màn, và phải vừa tiếp). */
const MOC_TRAN = {
  1440: { 'ls-cv-bang': 27, 'kd-ds-bang': 260, 'dh-bang': 294, 'ls-bang': 459,
          'kt-ts-bang': 24, 'nsSua-hopdong': 78, 'mtModalViec': 14 },
  1100: { 'ls-cv-bang': 367, 'db-bang': 216, 'kd-ds-bang': 600, 'kd-dhh-bang': 305,
          'cskh-bang': 35, 'dh-bang': 634, 'ls-bang': 799, 'kt-ts-bang': 364,
          'kt-hh-bang': 5, 'ts-bang': 131, 'nsSua-hopdong': 78, 'mtModalViec': 14 },
  900:  { 'ls-cv-bang': 464, 'db-bang': 416, 'ns-bang': 82, 'kd-ds-bang': 800,
          'kd-dhh-bang': 505, 'cskh-bang': 235, 'kv-ton-bang': 26, 'kv-bc-bang': 120,
          'dh-bang': 834, 'ls-bang': 999, 'kt-ts-bang': 564, 'kt-hh-bang': 205,
          'ts-bang': 331, 'nsSua-hopdong': 78, 'mtModalViec': 14,
          'xc-kehoach-tbody': 6 },
  375:  { 'ls-cv-bang': 645, 'db-bang': 613, 'knChamBang': 239, 'ns-bang': 287,
          'kd-ds-bang': 1053, 'kd-dhh-bang': 686, 'kdsp-bang': 219, 'cskh-bang': 440,
          'kv-bc-bang': 325, 'dh-bang': 999, 'ls-bang': 1156, 'kt-ts-bang': 737,
          'kt-hh-bang': 402, 'ts-bang': 520, 'qtBang': 219, 'nsSua-jdBang': 285,
          'nsSua-knBang': 285, 'nsSua-hopdong': 323, 'nsSua-lichsu': 265,
          'mtModalViec': 267, 'kvModalLo': 265, 'kvModalLichSu': 265,
          'xc-kehoach-tbody': 251, 'xc-matrix-tbody': 217 },
  320:  { 'ls-cv-bang': 700, 'db-bang': 668, 'knChamBang': 294, 'ns-bang': 342,
          'kd-ds-bang': 1108, 'kd-dhh-bang': 741, 'kdsp-bang': 274, 'cskh-bang': 495,
          'kv-bc-bang': 380, 'dh-bang': 1054, 'ls-bang': 1211, 'kt-ts-bang': 792,
          'kt-hh-bang': 457, 'ts-bang': 575, 'qtBang': 274, 'nsSua-jdBang': 340,
          'nsSua-knBang': 340, 'nsSua-hopdong': 378, 'nsSua-lichsu': 320,
          'mtModalViec': 322, 'kvModalLo': 320, 'kvModalLichSu': 320,
          'xc-kehoach-tbody': 306, 'xc-matrix-tbody': 272 }
};

/* Mốc CỠ CHỮ và CHIỀU CAO DÒNG đo trên cùng cây 755d556. Sếp dặn thẳng: bỏ
   bớt CỘT chứ không thu nhỏ CHỮ, và không được làm giảm số dòng thấy được.
   Hai con số này là chốt cho cả hai câu đó — cỡ chữ không được nhỏ hơn, dòng
   không được cao hơn (dòng cao hơn = ít dòng hơn trên cùng một màn). */
const MOC_CHU = { chuBody: 15, chuO: 13.5, chuTieuDe: 11 };
const MOC_CAO_DONG = { 1440: 55, 1100: 55, 900: 54, 375: 50, 320: 50 };

/* Dòng mẫu: nội dung NGẮN và THẬT. Không nhồi chữ dài — mục đích là đo bề
   ngang tự nhiên của bảng, không phải thi xem chữ nào dài hơn. */
const CHEN_DONG_MAU = `(function(){
  const MAU = ['Nguyễn Văn An', '29/08/2026', 'AGC-0142', '1.234.567', 'Kho vận'];
  let dem = 0;
  document.querySelectorAll('table').forEach(t => {
    const tb = t.tBodies[0]; if (!tb || tb.rows.length) return;
    const ths = [...t.querySelectorAll('thead th')];
    if (!ths.length) return;
    const tr = document.createElement('tr');
    tr.dataset.dongMau = '1';
    ths.forEach((th, i) => {
      const td = document.createElement('td');
      if (th.classList.contains('num')) { td.className = 'num'; td.textContent = '1.234.567'; }
      else if (!th.textContent.trim()) { td.innerHTML = '<button class="btn-nho">Xem</button>'; }
      else td.textContent = MAU[i % MAU.length];
      tr.appendChild(td);
    });
    tb.appendChild(tr); dem++;
  });
  return dem;
})()`;

/* MỞ TẤT CẢ tổ tiên đang `hidden` (tab/panel/modal chưa mở) rồi ĐỢI MỘT NHỊP
   trước khi đo — phải đợi vì `ganBaoCuonNgang()` chạy trong requestAnimationFrame;
   đo ngay lập tức là đo trước khi ứng dụng kịp gắn dải "còn cột bên phải" và
   bàn đo sẽ báo đỏ oan (bản đầu của bàn đo này dính đúng lỗi đó).
   TUYỆT ĐỐI KHÔNG ép `display` của thứ bị CSS ẩn: đó là chế độ THẺ do media
   query bật — ép mở là tự dựng lên một màn hình không ai nhìn thấy rồi báo
   lỗi trên đó. */
const MO_HET = `(function(){
  window.__daMo = [];
  document.querySelectorAll('[hidden]').forEach(el => {
    if (el.closest('template')) return;
    el.hidden = false; window.__daMo.push(el);
  });
  return window.__daMo.length;
})()`;
const DONG_HET = `(function(){ (window.__daMo||[]).forEach(el => el.hidden = true); return 1; })()`;

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
      // Dải "còn cột bên phải" do ganBaoCuonNgang() gắn — có thật trong DOM
      // và có đang HIỆN không, chứ không phải chỉ có trong tệp CSS.
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

/* Cỡ chữ + số dòng thấy được — hai chốt chống sửa quá tay. */
const DO_CHU_VA_DONG = `(function(){
  const cs = getComputedStyle(document.body);
  // Phải lấy dòng ĐANG HIỆN — dòng trong tab đang ẩn có chiều cao 0 và sẽ
  // làm phép đo "số dòng thấy được" nói dối đúng chiều dễ chịu nhất.
  let o = null, dong = null;
  for (const td of document.querySelectorAll('tbody td')) {
    const r = td.getBoundingClientRect();
    if (r.height > 0) { o = td; dong = td.parentElement; break; }
  }
  return {
    chuBody: parseFloat(cs.fontSize),
    chuO: o ? parseFloat(getComputedStyle(o).fontSize) : null,
    chuTieuDe: (function(){ for (const th of document.querySelectorAll('thead th'))
      if (th.getBoundingClientRect().height > 0) return parseFloat(getComputedStyle(th).fontSize);
      return null; })(),
    caoDong: dong ? Math.round(dong.getBoundingClientRect().height) : null
  };
})()`;

/* MẪU HỎNG GIẢ (--tu-kiem): thêm MỘT CỘT THỪA vào bảng Danh bạ (đang vừa màn
   ở 1440px). Cột thừa đẩy bảng ra khỏi khung → arm A phải ĐỎ. */
const may = await dungMayGia({ commit: COMMIT, tatHoatAnh: true });
const BANG_KE_HET = {};


for (const RONG of RONGS) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });

  /* --tu-kiem: bơm một cột thừa vào bảng Danh bạ NGAY TRONG TRANG. Làm ở đây
     (không sửa tệp) để chắc chắn cột thừa xuất hiện ở cả <thead> lẫn <tbody>
     — đúng hình dạng một cột mới bị thêm vào thật. */
  if (TU_KIEM) await cr.chay(`(function(){
    const t = document.querySelector('#db-bang').closest('table');
    const thr = t.querySelector('thead tr');
    for (let i = 0; i < 4; i++) {
      const th = document.createElement('th');
      th.textContent = 'Cột thừa số ' + (i + 1);
      thr.appendChild(th);
    }
    return thr.children.length;
  })()`);

  await cr.chay(MO_HET);
  await cr.chay(CHEN_DONG_MAU);
  await cr.doi(700);            // để ganBaoCuonNgang() (rAF + observer) chạy xong
  const ds = await cr.chay(DO_MOI_BANG);
  const cd = await cr.chay(DO_CHU_VA_DONG);
  await cr.chay(DONG_HET);
  BANG_KE_HET[RONG] = ds;

  const hien = ds.filter(b => !b.an);
  const tran = hien.filter(b => b.tran);
  const tranKhongPhep = tran.filter(b => !DUOC_CUON[b.ma]);

  /* ---- A. MÀN LÀM VIỆC CHÍNH (≥1440px) PHẢI VỪA HẾT ----------------------
     Đây là màn Sếp và khối văn phòng dùng để làm việc. Ở đây "vừa một trang"
     là ràng buộc CỨNG: 0 bảng tràn, trừ đúng những bảng đối chiếu đã đăng ký
     ở DUOC_CUON (bỏ cột của chúng là hỏng việc đọc theo hàng ngang).
     Ở màn hẹp hơn, bảng 8–12 cột KHÔNG THỂ vừa 341px mà không đổi sang thẻ —
     việc đó nằm ở arm C (không được tệ đi) và arm B (phải báo còn cột), cộng
     việc dựng thẻ cho từng bảng là hạng mục riêng, xem REV-0051. */
  if (RONG >= 1440) {
    ok(`A @${RONG}px · 0 bảng tràn ngoài danh sách được phép cuộn ` +
       `(hiện ${hien.length} · tràn ${tran.length} · được phép ${tran.length - tranKhongPhep.length})`,
       tranKhongPhep.length === 0,
       tranKhongPhep.map(b => `${b.ma} +${b.thua}px [rơi: ${b.roiRa.join(', ') || '—'}]`).join(' · '));
  }

  /* ---- B. BẢNG CÒN CUỘN THÌ PHẢI NÓI RA -----------------------------------
     Ràng buộc này áp cho MỌI bề ngang và MỌI bảng, kể cả bảng chưa kịp dựng
     thẻ. Cuộn thì được, cuộn IM LẶNG thì không: người dùng phải biết bên phải
     còn cột, đừng để họ tưởng đã thấy hết. */
  const cuonMaCam = tran.filter(b => !b.coBao);
  ok(`B @${RONG}px · mọi bảng còn cuộn đều báo "còn cột bên phải" (${tran.length} bảng)`,
     cuonMaCam.length === 0,
     cuonMaCam.map(b => b.ma).join(', '));

  /* ---- C. KHÔNG BẢNG NÀO ĐƯỢC TỆ ĐI so với mốc trước bản vá ---- */
  const moc = MOC_TRAN[RONG] || {};
  const teDi = hien.filter(b => b.thua > (moc[b.ma] || 0));
  const tongTruoc = hien.reduce((s, b) => s + (moc[b.ma] || 0), 0);
  const tongSau = hien.reduce((s, b) => s + b.thua, 0);
  ok(`C @${RONG}px · 0 bảng tràn nhiều hơn trước (tổng px tràn ${tongTruoc} → ${tongSau})`,
     teDi.length === 0,
     teDi.map(b => `${b.ma} ${moc[b.ma] || 0}→${b.thua}`).join(' · '));

  /* ---- F. Cỡ chữ KHÔNG được nhỏ đi so với trước bản vá ---- */
  ok(`F @${RONG}px · cỡ chữ thân trang không nhỏ đi (mốc ${MOC_CHU.chuBody}px)`,
     cd.chuBody >= MOC_CHU.chuBody, `${cd.chuBody}px`);
  ok(`F2 @${RONG}px · cỡ chữ trong ô bảng không nhỏ đi (mốc ${MOC_CHU.chuO}px)`,
     cd.chuO != null && cd.chuO >= MOC_CHU.chuO, `${cd.chuO}px`);
  ok(`F3 @${RONG}px · cỡ chữ tiêu đề cột không nhỏ đi (mốc ${MOC_CHU.chuTieuDe}px)`,
     cd.chuTieuDe != null && cd.chuTieuDe >= MOC_CHU.chuTieuDe, `${cd.chuTieuDe}px`);

  /* ---- G. Số dòng thấy được KHÔNG được giảm ----------------------------
     Đo gián tiếp mà chắc chắn: cùng một chiều cao khung, dòng cao hơn nghĩa
     là ít dòng hơn. Mốc lấy từ chính cây trước bản vá. */
  ok(`G @${RONG}px · chiều cao một dòng không tăng (mốc ${MOC_CAO_DONG[RONG]}px)`,
     cd.caoDong != null && cd.caoDong <= MOC_CAO_DONG[RONG], `${cd.caoDong}px`);

  ok(`Z @${RONG}px · 0 lỗi console, 0 ngoại lệ`,
     cr.loiConsole.length === 0 && cr.ngoaiLe.length === 0,
     [...cr.loiConsole, ...cr.ngoaiLe].join(' | '));

  cr.dong();
}
may.dong();

/* ---- E. Danh sách bảng CỐ Ý giữ cuộn ngang phải có LÝ DO viết ra --------- */
for (const [ma, ly] of Object.entries(DUOC_CUON))
  ok(`E · "${ma}" giữ cuộn ngang có lý do rõ ràng`, ly.length > 30, ly);

if (BANG_KE) {
  console.log('\n' + '='.repeat(78) + '\nBẢNG KÊ ĐẦY ĐỦ\n' + '='.repeat(78));
  for (const RONG of RONGS) {
    console.log(`\n--- ${RONG}px ---`);
    for (const b of BANG_KE_HET[RONG]) {
      if (b.an) { console.log(`  ${b.ma.padEnd(20)} thẻ (bảng bị CSS ẩn)`); continue; }
      const nhan = b.tran ? (DUOC_CUON[b.ma] ? 'CUỘN (cho phép)' : 'TRÀN') : 'vừa';
      console.log(`  ${b.ma.padEnd(20)} ${String(b.soCot).padStart(2)} cột · khung ${String(b.khung).padStart(4)} · bảng ${String(b.rong).padStart(4)} · ${nhan}` +
        (b.tran ? ` +${b.thua}px · rơi: ${b.roiRa.join(', ') || '—'}` : ''));
    }
  }
}

process.exit(tongKet() ? 0 : 1);
