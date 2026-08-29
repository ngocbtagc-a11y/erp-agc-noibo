/* ==========================================================================
   BÀN ĐO CHỮ DÀI PHẢI XUỐNG DÒNG — không được bắt người ta kéo ngang
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY. 29/08/2026 Sếp Ngọc gửi ảnh thanh cuộn ngang trong chat:
   "tin nhắn dài quá thì xuống dòng, đừng để phải kéo ngang như này".

   Đo ra HAI bệnh, không phải một:
     ① THANH CHAT là `<input type="text">` — thẻ một dòng, KHÔNG có cách nào
        xuống dòng dù CSS viết gì. Ở 375px, gõ 133 ký tự tiếng Việt ra
        scrollWidth 1034px trên ô rộng 232px. Cả ERP có 12 ô cùng kiểu, nhận
        120–2000 ký tự.
     ② KHÔNG có chốt chặn TOÀN CỤC cho từ dài. Bơm một link Shopee (không có
        dấu cách) vào bất kỳ khung chữ nào — tiêu đề, dòng phụ, ô "chưa có dữ
        liệu" — cả trang phình từ 375px ra 654–854px ở CẢ 6 TAB.

   Luật Sếp Ngọc đã chốt: MỘT GÓP Ý LÀ TRIỆU CHỨNG, không phải một chỗ hỏng.
   Chat chỉ là chỗ Sếp vừa tình cờ gặp. Nên bàn đo này KHÔNG đo riêng chat —
   nó quét CẢ LỚP:
     · A. Bong bóng chat với 4 ca chữ (link · 80 số · từ dính 100 ký tự · tiếng
          Việt bình thường làm ca đối chứng "không được đổi").
     · B. Thanh chat: gõ chữ dài vào có kéo ngang không.
     · C. Đếm ô nhập MỘT DÒNG nhận ≥100 ký tự — phải bằng 0.
     · D. Bơm chuỗi độc vào MỌI khung hiện chữ của MỌI tab, đo thanh cuộn
          ngang cấp trang.
     · E. CA ĐỐI CHỨNG CHỐNG SỬA QUÁ TAY: bảng nhiều cột PHẢI vẫn cuộn ngang
          được trong khung riêng của nó. Ép bảng xuống dòng là vỡ cột.
     · F. Số dòng hiện trên màn — bản vá không được ăn bớt vùng đọc.

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
   Hai vết thương cố ý, mỗi vết cho một arm của bàn đo:
     · một khung chữ tự tắt chốt chặn `overflow-wrap` → arm D phải bắt.
     · một ô nhập MỘT DÒNG nhận 500 ký tự            → arm C phải bắt.
   Chỉ sửa BẢN TẠM, không đụng tệp thật trong repo. */
const VET_THUONG = `
<div id="mau-hong-khung" style="overflow-wrap:normal;word-break:normal">${LINK}</div>
<form id="mau-hong-form"><input type="text" id="mau-hong-o" maxlength="500"></form>
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
   C. Ô NHẬP MỘT DÒNG NHẬN CHỮ DÀI — phải bằng 0
   `<input type="text">` không bao giờ xuống dòng được; cho nó 100+ ký tự là
   chắc chắn có ngày phải kéo ngang trong ô. Đo bằng cấu trúc chứ không bằng
   bề rộng: ô nằm trong hộp thoại chưa mở thì clientWidth = 0, đo bề rộng ở
   đó là đo cái không tồn tại — đúng bẫy "phép đo im lặng nói dối".
 * ======================================================================== */
kq.C_o_mot_dong = await cr.chay(`(() =>
  [...document.querySelectorAll('input[type="text"], input:not([type])')]
    .filter(i => i.maxLength >= 100)
    .map(i => ({ id: i.id || '(không id)', max: i.maxLength })))()`);
if (kq.C_o_mot_dong.length)
  doVi.push(`${kq.C_o_mot_dong.length} ô nhập MỘT DÒNG nhận ≥100 ký tự (` +
    kq.C_o_mot_dong.map(o => o.id).join(', ') + ')');

/* ======================================================================== *
   E. CA ĐỐI CHỨNG CHỐNG SỬA QUÁ TAY — bảng nhiều cột PHẢI còn cuộn ngang
   Chốt chặn `overflow-wrap: break-word` cố ý KHÔNG dùng `anywhere` vì
   `anywhere` đổi cả min-content và làm CỘT BẢNG VỠ. Nếu một ngày ai đó đổi
   sang `anywhere`, dòng đo này đỏ trước khi Sếp nhìn thấy bảng vỡ.
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
for (const o of kq.F2_o_rong_cao)
  if (o.cao > 48) doVi.push(`ô "${o.id}" lúc RỖNG cao ${o.cao}px (min-height ${o.min}) — ăn bớt dòng trên màn hẹp`);
if (kq.F2_o_rong_cao.length < 12)
  doVi.push(`chỉ đo được ${kq.F2_o_rong_cao.length}/12 ô nhiều dòng — thiếu ô nào là thiếu chỗ đó`);

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
  const batC = doVi.some(d => d.includes('mau-hong-o'));
  const batD = doVi.some(d => d.includes('mẫu hỏng giả'));
  const dat = !XANH && batC && batD;
  console.error(dat
    ? '  ✅ TỰ KIỂM ĐẠT — bắt được CẢ HAI vết thương giả (ô một dòng + khung tắt chốt chặn).'
    : `  ❌ TỰ KIỂM TRƯỢT — arm C ${batC ? 'bắt' : 'KHÔNG bắt'}, arm D ${batD ? 'bắt' : 'KHÔNG bắt'}: bàn đo là đồ trang trí.`);
  process.exit(dat ? 0 : 1);
}

process.exit(XANH ? 0 : 1);
