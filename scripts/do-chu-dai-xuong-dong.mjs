/* ==========================================================================
   BÀN ĐO CHỮ DÀI PHẢI XUỐNG DÒNG — không được bắt người ta kéo ngang
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY. 29/08/2026 Sếp Ngọc gửi ảnh thanh cuộn ngang trong chat:
   "tin nhắn dài quá thì xuống dòng, đừng để phải kéo ngang như này".

   Đo ra HAI bệnh, không phải một:
     ① THANH CHAT là `<input type="text">` — thẻ một dòng, KHÔNG có cách nào
        xuống dòng dù CSS viết gì. Ở 375px, gõ 133 ký tự tiếng Việt ra
        scrollWidth 1034px trên ô rộng 232px.
        VÒNG 1 khai "cả ERP có 12 ô cùng kiểu" — SỐ ĐÓ SAI, và sai vì phép
        đếm chứ không vì thiếu tìm (REV-0047/L1, xem chú thích arm C). Con số
        thật: 99 ô một dòng còn lại đều nhận chữ VÔ HẠN vì không khai
        `maxlength` nào cả. Vòng 2 vá cả 99: 19 ô chữ dài đổi sang
        `<textarea class="o-nhieu-dong">` (tổng 31 ô), 80 ô chữ ngắn khai trần
        `maxlength` < 100 cho đúng thứ chúng thật sự nhận.
     ② KHÔNG có chốt chặn TOÀN CỤC cho từ dài. Bơm một link Shopee (không có
        dấu cách) vào bất kỳ khung chữ nào — tiêu đề, dòng phụ, ô "chưa có dữ
        liệu" — cả trang phình từ 375px ra 654–854px ở CẢ 6 TAB.

   Luật Sếp Ngọc đã chốt: MỘT GÓP Ý LÀ TRIỆU CHỨNG, không phải một chỗ hỏng.
   Chat chỉ là chỗ Sếp vừa tình cờ gặp. Nên bàn đo này KHÔNG đo riêng chat —
   nó quét CẢ LỚP:
     · A. Bong bóng chat với 4 ca chữ (link · 80 số · từ dính 100 ký tự · tiếng
          Việt bình thường làm ca đối chứng "không được đổi").
     · B. Thanh chat: gõ chữ dài vào có kéo ngang không.
     · C. Đếm ô nhập MỘT DÒNG NHẬN CHỮ DÀI — phải bằng 0.
     · D. Bơm chuỗi độc vào MỌI khung hiện chữ của MỌI tab, đo thanh cuộn
          ngang cấp trang.
     · E. CA ĐỐI CHỨNG CHỐNG SỬA QUÁ TAY: bảng nhiều cột PHẢI vẫn cuộn ngang
          được trong khung riêng của nó. Ép bảng xuống dòng là vỡ cột.
     · F. Số dòng hiện trên màn — bản vá không được ăn bớt vùng đọc.
     · G. Ô đã đổi sang `<textarea>` phải giữ nguyên thói quen phím: Enter GỬI,
          Shift+Enter xuống dòng, bộ gõ tiếng Việt không bị cướp phím.
     · H. CÙNG một trường ở hai chỗ (tạo việc / sửa việc…) phải CÙNG hành vi —
          chống lại kiểu vá nửa vời đã xảy ra ở vòng 1 (REV-0047/L2).

   CHẠY:
     npm run do-chu-dai                      → 375px
     node scripts/do-chu-dai-xuong-dong.mjs --rong 320
     node scripts/do-chu-dai-xuong-dong.mjs --commit cbea4d9   → BH-16: bản
       TRƯỚC khi vá, phải ĐỎ. Xanh ở đây nghĩa là bàn đo không đo đúng thứ nó
       khai.
     npm run do-chu-dai-tu-kiem              → MẪU HỎNG GIẢ: chèn một khung
       chữ tắt chốt chặn + một ô nhập một dòng 500 ký tự. Bàn đo PHẢI ĐỎ.
       Không chứng minh được thì nó là đồ trang trí.
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';

const dso = process.argv;
const lay = (co, mac) => { const i = dso.indexOf(co); return i > 0 ? dso[i + 1] : mac; };
const RONG = Number(lay('--rong', 375));
const COMMIT = lay('--commit', null);
const TU_KIEM = dso.includes('--tu-kiem');

/* ---- BỐN CA CHỮ --------------------------------------------------------- */
const LINK = 'https://banhang.shopee.vn/portal/sale/order/detail?order_id=240829000112233445566778899&shop=1234567890&tab=to_ship_all_orders_view';
const SO80 = '1'.repeat(0) + '12345678901234567890123456789012345678901234567890123456789012345678901234567890';
const DINH100 = 'a'.repeat(100);
const VIET = 'Chào cả nhà, hôm nay kho mình xuất 320 đơn hạt điều rang muối và 145 đơn hạnh nhân, mọi người kiểm tra kỹ tem nhãn trước khi dán nhé.';
const CA = [
  { ma: 'link',    chu: 'Xem đơn ở đây ' + LINK },
  { ma: 'so80',    chu: SO80 },
  { ma: 'dinh100', chu: DINH100 },
  { ma: 'viet',    chu: VIET }          /* ca đối chứng: chữ thường KHÔNG được đổi */
];

/* ---- MẪU HỎNG GIẢ -------------------------------------------------------
   BA vết thương cố ý:
     · một khung chữ tự tắt chốt chặn `overflow-wrap`  → arm D phải bắt.
     · một ô nhập MỘT DÒNG khai `maxlength="500"`      → arm C phải bắt.
     · một ô nhập MỘT DÒNG KHÔNG khai `maxlength` gì   → arm C phải bắt.
   Vết thứ ba là ca đối chứng cho ĐÚNG chỗ phép đếm cũ bị mù (REV-0047/L1):
   bản cũ lọc `i.maxLength >= 100`, mà ô không khai `maxlength` thì
   `maxLength === -1` nên bị loại sạch khỏi phép đếm — trong khi nó là ô
   NẶNG NHẤT, nhận chữ vô hạn. Cố ý để sót một ô kiểu đó ở đây, bàn đo không
   bắt được thì chính phép đếm mới là thứ hỏng.
   Chỉ sửa BẢN TẠM, không đụng tệp thật trong repo. */
const VET_THUONG = `
<div id="mau-hong-khung" style="overflow-wrap:normal;word-break:normal">${LINK}</div>
<form id="mau-hong-form"><input type="text" id="mau-hong-o" maxlength="500">
<input type="text" id="mau-hong-o-vo-han"></form>
`;
const suaTep = TU_KIEM
  ? (s, ten) => (ten === 'app.html' && s.includes('</body>') ? s.replace('</body>', VET_THUONG + '</body>') : s)
  : null;

/* ---- Tin nhắn giả cho 4 ca ---------------------------------------------- */
function tinBonCa() {
  return CA.map((c, i) => ({
    id: i + 1,
    nguoi_gui_id: i % 2 === 0 ? 'NS-DUY' : TOI_ID,
    nguoi_gui_ten: i % 2 === 0 ? 'Phạm Khương Duy' : 'Bùi Thị Ngọc',
    nguoi_gui_viet_tat: i % 2 === 0 ? 'KD' : 'BN',
    nguoi_nhan_id: 'NS-DUY', noi_dung: c.chu,
    tep_ten: null, tep_loai: null, tep_kich_thuoc: null,
    tao_luc: '2026-08-29 08:0' + i + ':00'
  }));
}

const may = await dungMayGia({
  commit: COMMIT, suaTep,
  apiRieng(duong, u, traJson) {
    if (duong === '/api/chat/tin-nhan') {
      traJson({ tin_nhan: tinBonCa(), con_nua: false, toi_id: TOI_ID });
      return true;
    }
    return false;
  }
});
const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 3000 });

const kq = { commit: COMMIT || 'cây làm việc', rong: RONG, tu_kiem: TU_KIEM };
const doVi = [];

/* ======================================================================== *
   E. CA ĐỐI CHỨNG CHỐNG SỬA QUÁ TAY — bảng nhiều cột PHẢI còn cuộn ngang
   Chốt chặn toàn cục là `body { overflow-wrap: anywhere }` — `anywhere` hạ cả
   min-content nên hàng flex co lại được, đó là lý do phải dùng nó thay
   `break-word`. Cái giá: Ô BẢNG cũng co theo và CỘT BẢNG VỠ, nên `style.css`
   trả riêng `table, table *` về `break-word`. Dòng đo này canh đúng chỗ đó:
   ai gỡ luật `table` kia thì bảng nhiều cột hết cuộn ngang và bàn đo đỏ
   trước khi Sếp nhìn thấy bảng vỡ.
 * ======================================================================== */
kq.E_bang_van_cuon = await cr.chay(`(() => {
  const k = [...document.querySelectorAll('.table-wrap, .table-wrap-cuon')]
    .filter(e => e.clientWidth > 0);
  return { so_khung: k.length,
           con_cuon_ngang: k.filter(e => e.scrollWidth > e.clientWidth + 1).length,
           chi_tiet: k.slice(0, 4).map(e => ({ sw: e.scrollWidth, cw: e.clientWidth })) };
})()`);
if (kq.E_bang_van_cuon.so_khung > 0 && kq.E_bang_van_cuon.con_cuon_ngang === 0)
  doVi.push('SỬA QUÁ TAY: bảng nhiều cột không còn cuộn ngang được — cột đã bị ép xuống dòng');

/* ======================================================================== *
   D. BƠM CHUỖI ĐỘC VÀO MỌI KHUNG HIỆN CHỮ — quét cả lớp, không riêng chat
   Đặt một chuỗi KHÔNG có dấu cách vào từng khung chữ của từng tab rồi hỏi
   một câu duy nhất: cả trang có mọc thanh cuộn ngang không.
   Bỏ qua những khung CỐ Ý cuộn/cắt: bảng nhiều cột, thanh tab, dòng phụ có
   ellipsis — cắt gọn bằng `overflow:hidden` là thiết kế đúng, không phải bệnh.
 * ======================================================================== */
const BO_DESIGN = '.table-wrap,.table-wrap-cuon,.seg,.tabs,.cnb-ds-phu,.cnb-ds-ten,.chat-tep-card';
const bom = `(() => {
  const DOC = ${JSON.stringify(LINK)};
  const BD = ${JSON.stringify(BO_DESIGN)};
  const la = e => e.children.length === 0 && (e.textContent || '').trim().length > 0;
  const cu = [];
  /* Bỏ qua khung đặt white-space: nowrap. Đó là những chỗ CỐ Ý từ chối xuống
     dòng — nhãn ngắn cố định ("Đi", "Còn hạn"), số căn phải, ô bảng cắt bằng
     ellipsis. Không chỗ nào trong số đó hiện chữ người dùng gõ mà lại nằm
     ngoài một khung cuộn/cắt có sẵn. Bơm chữ dài vào nhãn cố định rồi báo đỏ
     là báo oan, mà bàn đo báo oan thì lần sau không ai đọc nữa. */
  const ung = [...document.querySelectorAll('[id^="v-"] *, .modal *, .cnb-popup *')]
    .filter(e => la(e) && !e.closest(BD) && e.getBoundingClientRect().width > 0
                 && !/nowrap|^pre$/.test(getComputedStyle(e).whiteSpace));
  ung.forEach(e => { cu.push([e, e.textContent]); e.textContent = DOC; });
  const H = document.documentElement;
  /* CHỈ ĐIỂM: báo "trang tràn" mà không nói tràn Ở ĐÂU thì người sửa lại phải
     đi dò tay từ đầu. Thủ phạm = khung chữ vừa bơm mà mép phải vọt ra ngoài
     bề ngang màn hình — kèm luôn white-space / overflow-wrap đang tính ra để
     biết nó không xuống dòng vì lý do gì.
     (Khối này nằm TRONG một template literal của Node — đừng viết dấu huyền
     kiểu markdown ở đây, một dấu là đứt chuỗi và cả tệp không nạp nổi.) */
  const thu = ung.filter(e => e.getBoundingClientRect().right > H.clientWidth + 1)
    .slice(0, 6).map(e => {
      const cs = getComputedStyle(e);
      return { the: e.tagName, lop: String(e.className).slice(0, 40) || '(không lớp)',
               cha: e.parentElement ? String(e.parentElement.className).slice(0, 40) : '',
               mep_phai: Math.round(e.getBoundingClientRect().right),
               ws: cs.whiteSpace, ow: cs.overflowWrap };
    });
  const r = { so_khung_bom: ung.length,
              trang: { sw: H.scrollWidth, cw: H.clientWidth },
              than: { sw: document.body.scrollWidth, cw: document.body.clientWidth },
              thu_pham: thu };
  cu.forEach(([e, t]) => { e.textContent = t; });
  return r;
})()`;

const TAB = ['tongquan', 'lichsuviec', 'danhba', 'gopy', 'nhansu', 'khovan'];
kq.D_bom_chuoi_doc = {};
for (const t of TAB) {
  await cr.chay(`document.querySelector('[data-tab="${t}"]')?.click(); 1`);
  await cr.doi(800);
  const r = await cr.chay(bom);
  r.tran_ngang = r.trang.sw > r.trang.cw + 1 || r.than.sw > r.than.cw + 1;
  kq.D_bom_chuoi_doc[t] = r;
  if (r.tran_ngang)
    doVi.push(`tab "${t}": bơm chuỗi dài → trang tràn ${r.trang.sw}px trên khung ${r.trang.cw}px` +
      (r.thu_pham.length ? ' · thủ phạm: ' +
        r.thu_pham.map(x => `${x.lop} (ws:${x.ws}, ow:${x.ow})`).join(' | ') : ''));
}

/* ======================================================================== *
   C. Ô NHẬP MỘT DÒNG NHẬN CHỮ DÀI — phải bằng 0
   ---------------------------------------------------------------------------
   `<input type="text">` không bao giờ xuống dòng được, dù CSS viết gì. Nên
   câu hỏi đúng là "ô này có NHẬN chữ dài không", KHÔNG phải "ô này có KHAI
   maxlength lớn không".

   PHÉP LỌC CŨ SAI, VÀ SAI Ở ĐÚNG BƯỚC ĐẾM (REV-0047/L1). Nó lọc
   `i.maxLength >= 100`. Nhưng input KHÔNG khai `maxlength` thì
   `maxLength === -1` → bị loại sạch khỏi phép đếm. Đo thật: bơm 200 ký tự vào
   mọi ô, 99/99 ô một dòng còn lại đều kéo ngang và 99/99 KHÔNG có
   `maxlength` — tức nhận chữ VÔ HẠN, nặng hơn hẳn ô 120 ký tự đã vá, mà bị
   đếm bằng 0. Bàn đo cũ vì thế sẽ báo XANH mãi mãi.

   Luật mới: ô một dòng nhận chữ mà `maxLength === -1` (vô hạn) HOẶC
   `maxLength >= 100` đều là vi phạm. Cách chữa có hai đường, chọn theo bản
   chất của ô:
     · ô CHỮ DÀI (tên hàng, địa chỉ, tiêu đề, lý do…) → `<textarea
       class="o-nhieu-dong" rows="1">` — trông y hệt ô một dòng, tự xuống dòng.
     · ô CHỮ NGẮN (tìm kiếm, SĐT, mã, số lượng…) → khai `maxlength` < 100 cho
       đúng thứ nó thật sự nhận. Trần thấp thì chữ không bao giờ đủ dài để
       phải kéo ngang.

   Đo bằng CẤU TRÚC chứ không bằng bề rộng: ô nằm trong hộp thoại chưa mở thì
   clientWidth = 0, đo bề rộng ở đó là đo cái không tồn tại — đúng bẫy "phép
   đo im lặng nói dối". Và đếm SAU vòng bơm ở trên, khi cả 6 tab đã dựng xong,
   để bắt luôn những ô do JS sinh ra chứ không chỉ ô viết sẵn trong app.html.
 * ======================================================================== */
kq.C_o_mot_dong = await cr.chay(`(() => {
  /* Loại nhận CHỮ. Bỏ number/date/time/checkbox/radio/file/hidden/color/range
     (không nhận chữ tự do) và password (không thể đổi sang textarea). */
  const LOAI = ['', 'text', 'search', 'url', 'email', 'tel'];
  const het = [...document.querySelectorAll('input')]
    .filter(i => LOAI.includes((i.getAttribute('type') || '').toLowerCase()));
  const pham = het.filter(i => i.maxLength < 0 || i.maxLength >= 100);
  return { tong_o_mot_dong: het.length, so_pham: pham.length,
    pham: pham.map(i => ({ id: i.id || '(không id)',
      loai: i.getAttribute('type') || '(không khai)',
      vi_sao: i.maxLength < 0 ? 'KHÔNG khai maxlength — nhận chữ VÔ HẠN'
                              : 'maxlength ' + i.maxLength })) };
})()`);
if (kq.C_o_mot_dong.so_pham)
  doVi.push(`${kq.C_o_mot_dong.so_pham}/${kq.C_o_mot_dong.tong_o_mot_dong} ô nhập MỘT DÒNG còn nhận chữ dài (` +
    kq.C_o_mot_dong.pham.slice(0, 12).map(o => `${o.id}: ${o.vi_sao}`).join(' · ') +
    (kq.C_o_mot_dong.so_pham > 12 ? ` · …và ${kq.C_o_mot_dong.so_pham - 12} ô nữa` : '') + ')');

/* ======================================================================== *
   F2. Ô ĐÃ ĐỔI KHÔNG ĐƯỢC ĂN BỚT DÒNG
   11 ô đổi từ `<input>` sang `<textarea>`. Luật `.field textarea` trong
   style.css đặt `min-height: 90px` cho ô mô tả nhiều dòng — dính phải luật
   đó là mỗi ô phình thêm ~50px và màn 375px mất bớt dòng. Ô RỖNG phải cao
   đúng bằng ô một dòng cũ (44–48px).

   Gần hết số ô này nằm trong hộp thoại đang đóng, mà phần tử ẩn thì cao 0px —
   đo thẳng là đo cái không tồn tại, và bàn đo sẽ XANH vì nó chẳng nhìn thấy
   gì. Nên: gỡ tạm `hidden` của các ông bà tổ tiên, đo, rồi TRẢ LẠI nguyên
   trạng. Trả lại là bắt buộc — phép đo mà để lại dấu vết thì phép đo sau nó
   đo nhầm cái mình vừa bày ra.
 * ======================================================================== */
kq.F2_o_rong_cao = await cr.chay(`(() => {
  const ra = [];
  for (const o of document.querySelectorAll('.o-nhieu-dong')) {
    const daGo = [];
    for (let e = o; e && e !== document.body; e = e.parentElement)
      if (e.hidden) { e.hidden = false; daGo.push(e); }
    const giuGiaTri = o.value; o.value = '';
    o.style.height = 'auto';
    ra.push({ id: o.id, cao: Math.round(o.getBoundingClientRect().height),
              min: getComputedStyle(o).minHeight });
    o.value = giuGiaTri;
    daGo.forEach(e => { e.hidden = true; });
  }
  return ra;
})()`);
const SO_O_NHIEU_DONG = 31;   /* 12 ô đợt đầu + 19 ô nhóm chữ dài vá theo REV-0047/L1-L2 */
for (const o of kq.F2_o_rong_cao)
  if (o.cao > 48) doVi.push(`ô "${o.id}" lúc RỖNG cao ${o.cao}px (min-height ${o.min}) — ăn bớt dòng trên màn hẹp`);
if (kq.F2_o_rong_cao.length < SO_O_NHIEU_DONG)
  doVi.push(`chỉ đo được ${kq.F2_o_rong_cao.length}/${SO_O_NHIEU_DONG} ô nhiều dòng — thiếu ô nào là thiếu chỗ đó`);

/* ======================================================================== *
   G. PHÍM CỦA Ô ĐÃ ĐỔI — Enter GỬI · Shift+Enter XUỐNG DÒNG · bộ gõ tiếng
      Việt KHÔNG bị cướp phím
   ---------------------------------------------------------------------------
   Đổi `<input>` sang `<textarea>` là mất mặc định "Enter = submit" của trình
   duyệt. Không đo dòng này thì 20 người gõ Enter và không có gì xảy ra.
   Đo TOÀN BỘ ô `.o-nhieu-dong`, không riêng thanh chat.

   Ba chỗ dễ đo sai, xử lý sẵn:
     · Ô trong hộp thoại chưa mở → gỡ tạm `hidden` rồi TRẢ LẠI.
     · `requestSubmit()` chạy kiểm tra `required` trước; ô rỗng thì sự kiện
       `submit` KHÔNG bao giờ bắn và phép đo báo "Enter không gửi" oan. Nên
       tắt tạm `noValidate` và đổ chữ vào ô trước khi bấm.
     · Bắt `submit` bằng CAPTURE TRÊN `document`, không phải trên chính form:
       ở giai đoạn "at target" thì listener capture và bubble bắn theo thứ tự
       ĐĂNG KÝ, nên gắn trên form là chạy SAU handler thật của app — tức là
       phép đo vô tình gửi thật một cái form.
 * ======================================================================== */
kq.G_phim = await cr.chay(`(() => {
  const ra = [];
  for (const o of document.querySelectorAll('.o-nhieu-dong')) {
    const daGo = [];
    for (let e = o; e && e !== document.body; e = e.parentElement)
      if (e.hidden) { e.hidden = false; daGo.push(e); }
    const form = o.closest('form');
    let enter = null, shift = null, goDau = null;
    if (form) {
      const nvCu = form.noValidate; form.noValidate = true;
      const giu = o.value; o.value = 'thu phim';
      let ban = 0;
      const nghe = e => { if (e.target === form) { e.preventDefault(); e.stopPropagation(); ban++; } };
      document.addEventListener('submit', nghe, true);
      const bam = kh => { ban = 0;
        o.dispatchEvent(new KeyboardEvent('keydown',
          Object.assign({ key: 'Enter', bubbles: true, cancelable: true }, kh)));
        return ban > 0; };
      enter = bam({});
      shift = bam({ shiftKey: true });
      goDau = bam({ isComposing: true });
      document.removeEventListener('submit', nghe, true);
      form.noValidate = nvCu; o.value = giu;
      o.dispatchEvent(new Event('input', { bubbles: true }));
    }
    ra.push({ id: o.id || '(không id)', trong_form: !!form,
              enter_gui: enter, shift_enter_gui: shift, go_dau_gui: goDau });
    daGo.forEach(e => { e.hidden = true; });
  }
  return ra;
})()`);
for (const p of kq.G_phim) {
  if (!p.trong_form) continue;      /* ngoài <form> thì Enter cứ xuống dòng — bản cũ cũng thế */
  if (!p.enter_gui)   doVi.push(`ô "${p.id}": Enter KHÔNG còn gửi/lưu`);
  if (p.shift_enter_gui) doVi.push(`ô "${p.id}": Shift+Enter lại đi gửi — phải là xuống dòng`);
  if (p.go_dau_gui)   doVi.push(`ô "${p.id}": bộ gõ tiếng Việt đang dựng dấu mà Enter đã gửi — nuốt chữ`);
}
/* ======================================================================== *
   H. CÙNG MỘT TRƯỜNG THÌ PHẢI CÙNG MỘT HÀNH VI
   ---------------------------------------------------------------------------
   REV-0047/L2: vòng 1 vá `cv-sua-tieu-de` (sửa việc) mà bỏ `cv-tieu-de` (tạo
   việc) — CÙNG một ô "Tên việc", người dùng gặp hai hành vi khác nhau tuỳ
   vào việc họ đang tạo hay đang sửa. Kiểu lệch đó không có bàn đo nào bắt
   được vì mỗi ô xét riêng đều "hợp lệ".
   Nên liệt kê thẳng các NHÓM ô là cùng một trường, rồi đòi chúng giống nhau
   cả ba thứ người dùng cảm thấy: loại thẻ · có tự xuống dòng không · trần ký
   tự. Thêm ô mới cho một trường đã có thì thêm id vào nhóm của nó.
 * ======================================================================== */
const NHOM_CUNG_TRUONG = {
  'tên việc':        ['cv-tieu-de', 'cv-sua-tieu-de'],
  'tiêu đề mục tiêu': ['mt-tieu-de', 'cv-mtm-tieude'],
  'tên sản phẩm':    ['kdsp-ten', 'kvTenSP', 'kvSua-ten'],
  'tên nhà cung cấp': ['dln-ncc-ten', 'kvNhapNCC', 'tsThemNCC', 'tsSuaNCC'],
  'tên tài sản':     ['tsThemTen', 'tsSuaTen'],
  'địa chỉ':         ['dln-ncc-diachi', 'dln-kho-diachi', 'dmQueQuan', 'dmThuongTru']
};
kq.H_cung_truong = await cr.chay(`(() => {
  const N = ${JSON.stringify(NHOM_CUNG_TRUONG)};
  const ra = {};
  for (const [ten, ids] of Object.entries(N))
    ra[ten] = ids.map(id => {
      const e = document.getElementById(id);
      if (!e) return { id, thieu: true };
      return { id, the: e.tagName,
               xuong_dong: e.classList.contains('o-nhieu-dong'),
               tran: e.maxLength };
    });
  return ra;
})()`);
for (const [ten, ds] of Object.entries(kq.H_cung_truong)) {
  const thieu = ds.filter(o => o.thieu).map(o => o.id);
  if (thieu.length) { doVi.push(`nhóm "${ten}": không tìm thấy ô ${thieu.join(', ')}`); continue; }
  const van = ds.map(o => `${o.the}/${o.xuong_dong}/${o.tran}`);
  if (new Set(van).size > 1)
    doVi.push(`nhóm "${ten}" LỆCH HÀNH VI: ` +
      ds.map(o => `${o.id}=${o.the}${o.xuong_dong ? '+tự xuống dòng' : '+KÉO NGANG'}(trần ${o.tran})`).join(' vs '));
}

kq.G_tom_tat = {
  tong: kq.G_phim.length,
  trong_form: kq.G_phim.filter(p => p.trong_form).length,
  enter_gui: kq.G_phim.filter(p => p.enter_gui).length,
  shift_enter_gui: kq.G_phim.filter(p => p.shift_enter_gui).length,
  go_dau_gui: kq.G_phim.filter(p => p.go_dau_gui).length,
  ngoai_form: kq.G_phim.filter(p => !p.trong_form).map(p => p.id)
};

/* Mẫu hỏng giả nằm ngoài mọi tab (cuối <body>) — đo riêng một nhát. */
if (TU_KIEM) {
  const h = await cr.chay(`(() => { const H = document.documentElement;
    return { sw: H.scrollWidth, cw: H.clientWidth,
             co_vet: !!document.querySelector('#mau-hong-khung') }; })()`);
  kq.D_mau_hong = h;
  if (h.co_vet && h.sw > h.cw + 1)
    doVi.push(`mẫu hỏng giả: khung tắt chốt chặn làm trang tràn ${h.sw}px / ${h.cw}px`);
}

/* ======================================================================== *
   A + B + F. CHAT — bong bóng, thanh chat, số dòng hiện trên màn
 * ======================================================================== */
await cr.chay(`document.querySelector('[data-tab="danhba"]')?.click(); 1`);
await cr.doi(500);
/* Nút chat nổi là nút BẬT/TẮT: vòng bơm chuỗi độc ở trên bấm qua 6 tab nên
   không dám đoán cửa sổ đang mở hay đóng. Bấm rồi ĐO, chưa ra danh sách thì
   bấm lại một nhát — chắc chắn hơn là đoán trạng thái rồi ép `hidden`, vì ép
   `hidden` chỉ đổi thẻ chứ không đổi biến trạng thái bên trong app. */
let soHoiThoai = 0;
for (let i = 0; i < 2 && !soHoiThoai; i++) {
  await cr.chay(`document.querySelector('#cnbNut').click(); 1`);
  await cr.doi(900);
  soHoiThoai = await cr.chay(`document.querySelectorAll('.cnb-ds-muc').length`);
}
if (!soHoiThoai) { console.error('❌ Không dựng nổi danh sách hội thoại — bàn đo dừng.'); cr.dong(); may.dong(); process.exit(1); }
await cr.chay(`document.querySelector('.cnb-ds-muc').click(); 1`);
await cr.doi(1300);

kq.A_bong_bong = await cr.chay(`(() => {
  const k = document.querySelector('#chat-khung');
  const kr = k.getBoundingClientRect();
  const ma = ${JSON.stringify(CA.map(c => c.ma))};
  return {
    khung: { sw: k.scrollWidth, cw: k.clientWidth,
             tran_ngang: k.scrollWidth > k.clientWidth + 1 },
    bong: [...document.querySelectorAll('.chat-bong')].map((b, i) => {
      const r = b.getBoundingClientRect();
      return { ca: ma[i] || '?', rong: Math.round(r.width),
               lot_trong_khung: r.right <= kr.right + 1 && r.left >= kr.left - 1,
               so_dong: Math.round(r.height / parseFloat(getComputedStyle(b).lineHeight)) };
    })
  };
})()`);
for (const b of kq.A_bong_bong.bong)
  if (!b.lot_trong_khung) doVi.push(`bong bóng ca "${b.ca}" tràn ra ngoài khung đọc`);
if (kq.A_bong_bong.khung.tran_ngang)
  doVi.push(`khung đọc chat tràn ngang ${kq.A_bong_bong.khung.sw}px / ${kq.A_bong_bong.khung.cw}px`);

kq.B_thanh_chat = await cr.chay(`(() => {
  const o = document.querySelector('#chat-noidung');
  const cao0 = Math.round(o.getBoundingClientRect().height);
  o.value = ${JSON.stringify(VIET)};
  o.dispatchEvent(new Event('input', { bubbles: true }));
  const cao1 = Math.round(o.getBoundingClientRect().height);
  const r = { the: o.tagName, cao_rong: cao0, cao_co_chu: cao1,
              sw: o.scrollWidth, cw: o.clientWidth,
              tran_ngang: o.scrollWidth > o.clientWidth + 1,
              ox: getComputedStyle(o).overflowX };
  o.value = ''; o.dispatchEvent(new Event('input', { bubbles: true }));
  return r;
})()`);
if (kq.B_thanh_chat.tran_ngang)
  doVi.push(`THANH CHAT còn kéo ngang: ${kq.B_thanh_chat.sw}px chữ trong ô rộng ${kq.B_thanh_chat.cw}px`);
if (kq.B_thanh_chat.cao_rong > 48)
  doVi.push(`thanh chat lúc RỖNG cao ${kq.B_thanh_chat.cao_rong}px — ăn mất vùng đọc`);

/* Enter vẫn GỬI — đổi `<input>` sang `<textarea>` là mất mặc định của trình
   duyệt. Không đo dòng này thì 20 người gõ Enter và không có gì xảy ra. */
/* Chỉ hỏi trên bản đã đổi sang `<textarea>`. Bản CŨ là `<input>` thì Enter do
   trình duyệt tự xử, một `KeyboardEvent` dựng bằng script KHÔNG kích hoạt
   được hành vi mặc định đó — hỏi ở đó là chắc chắn nhận câu trả lời sai, và
   ca đối chứng BH-16 sẽ đỏ vì một lý do bịa. */
kq.B_enter_van_gui = kq.B_thanh_chat.the !== 'TEXTAREA' ? 'không hỏi (bản cũ dùng <input>)'
  : await cr.chay(`(() => new Promise(ok => {
  const f = document.querySelector('#chat-form');
  const o = document.querySelector('#chat-noidung');
  let da = false;
  const nghe = e => { e.preventDefault(); da = true; };
  f.addEventListener('submit', nghe, { capture: true });
  o.value = 'thử enter';
  o.dispatchEvent(new KeyboardEvent('keydown',
    { key: 'Enter', bubbles: true, cancelable: true }));
  setTimeout(() => { f.removeEventListener('submit', nghe, { capture: true });
                     o.value = ''; ok(da); }, 200);
}))()`);
if (kq.B_enter_van_gui === false) doVi.push('Enter trong thanh chat KHÔNG còn gửi tin');

kq.F_so_dong_tren_man = await cr.chay(`(() => {
  const k = document.querySelector('#chat-khung');
  const kr = k.getBoundingClientRect();
  const hien = [...document.querySelectorAll('#chat-khung .chat-tin')]
    .filter(e => { const r = e.getBoundingClientRect();
                   return r.bottom > kr.top && r.top < kr.bottom; });
  return { cao_vung_doc: Math.round(kr.height), so_tin_hien: hien.length,
           tong_tin: document.querySelectorAll('#chat-khung .chat-tin').length };
})()`);

kq.loi_console = cr.loiConsole;
kq.ngoai_le = cr.ngoaiLe;
if (kq.loi_console.length) doVi.push(`${kq.loi_console.length} dòng console.error`);
if (kq.ngoai_le.length) doVi.push(`${kq.ngoai_le.length} ngoại lệ chưa bắt`);

cr.dong(); may.dong();

/* ---- KẾT LUẬN ----------------------------------------------------------- */
const XANH = doVi.length === 0;
kq.ket_luan = XANH ? 'XANH' : 'ĐỎ';
kq.vi_sao_do = doVi;
console.log(JSON.stringify(kq, null, 2));
console.error('');
console.error(`CHỮ DÀI XUỐNG DÒNG [${kq.commit} @${RONG}px]: ${XANH ? '✅ XANH' : '❌ ĐỎ'}`);
for (const d of doVi) console.error('  · ' + d);

/* TỰ KIỂM — chạy với `--tu-kiem` thì bàn đo PHẢI đỏ, và phải đỏ vì ĐÚNG hai
   vết thương đã chèn, không phải đỏ vì lý do nào khác. Xanh ở đây nghĩa là
   chính bàn đo mới là thứ hỏng, nên thoát 1 để không ai kịp tin nó. */
if (TU_KIEM) {
  const idPham = (kq.C_o_mot_dong.pham || []).map(o => o.id);
  const batC = idPham.includes('mau-hong-o');
  /* CA ĐỐI CHỨNG CHO ĐÚNG CHỖ PHÉP ĐẾM CŨ MÙ: ô cố ý KHÔNG khai `maxlength`.
     Phép lọc cũ (`maxLength >= 100`) trượt ô này 100%. */
  const batCVoHan = idPham.includes('mau-hong-o-vo-han');
  const batD = doVi.some(d => d.includes('mẫu hỏng giả'));
  const dat = !XANH && batC && batCVoHan && batD;
  console.error(dat
    ? '  ✅ TỰ KIỂM ĐẠT — bắt được CẢ BA vết thương giả (ô 500 ký tự · ô KHÔNG khai maxlength · khung tắt chốt chặn).'
    : `  ❌ TỰ KIỂM TRƯỢT — arm C/500 ${batC ? 'bắt' : 'KHÔNG bắt'}, arm C/vô hạn ${batCVoHan ? 'bắt' : 'KHÔNG bắt'}, arm D ${batD ? 'bắt' : 'KHÔNG bắt'}: bàn đo là đồ trang trí.`);
  process.exit(dat ? 0 : 1);
}

process.exit(XANH ? 0 : 1);
