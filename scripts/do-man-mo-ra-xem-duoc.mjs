/* ==========================================================================
   BÀN ĐO "MỞ RA XEM ĐƯỢC" — cả lớp của GY-0006 và GY-0007
   ---------------------------------------------------------------------------
   VÌ SAO CÓ TỆP NÀY. Hai góp ý của Sếp nói cùng một câu:
     · GY-0006 "Không dùng được chat trên máy tính — bị lỗi, không mở ra xem được"
     · GY-0007 "Không xem được mục kho tài liệu trên app điện thoại, không kéo xuống được"
   Đi đo thì ra gốc: tab Kho tài liệu CHẾT HOÀN TOÀN ở MỌI bề ngang, MỌI vai
   trò — `let TL_NHOM_LUU_DUOC` khai ở dòng ~10334 trong khi
   `await khoiDongKhoTaiLieu()` chạy ở dòng ~7462, tức chạm biến trong vùng
   chết TDZ. Tab chỉ hiện đúng một dòng chữ "Không tải được kho tài liệu:
   Cannot access 'TL_NHOM_LUU_DUOC' before initialization" và KHÔNG có tài
   liệu nào — nên cũng chẳng có gì để kéo xuống.

   VÌ SAO CỔNG KHÓI KHÔNG BẮT ĐƯỢC. Lỗi bị một `catch` nuốt và IN RA MÀN HÌNH
   thành một dòng chữ tiếng Việt. Không `console.error`, không ngoại lệ chưa
   bắt, nút cửa ngõ vẫn bấm được → cổng khói XANH trong khi tính năng đã chết.
   Đây là cách hỏng THỨ SÁU, tiếp nối năm cách đã ghi ở `cong-khoi.mjs`:
     ⑥ Lỗi được bắt tử tế rồi in ra màn hình — không bàn đo nào ĐỌC màn hình.

   LỚP VẤN ĐỀ (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md Mục 2):
     "MÀN MỞ RA MÀ KHÔNG XEM ĐƯỢC NỘI DUNG."
   Ba dạng, bàn đo này canh cả ba:
     Ⓐ Màn hiện CÂU LỖI KỸ THUẬT thay cho dữ liệu ("Không tải được…",
       "Cannot access…", "undefined", "[object Object]", "NaN").
     Ⓑ Có `console.error` hoặc ngoại lệ chưa bắt trong lúc đi qua các tab.
     Ⓒ Nội dung cao hơn khung nhìn mà KHÔNG cuộn xuống được — kể cả khi có ai
       đó quên gỡ khoá cuộn (`body{overflow:hidden}`) sau khi đóng cửa sổ chat
       hay màn quét tài liệu.
   Kèm một lượt đi trọn đường CHAT (GY-0006): bấm "Chat ngay" ở Danh bạ → cửa
   sổ phải hiện TRONG khung nhìn, có ô nhập, vùng tin cuộn được, gõ và gửi ăn.

   QUÉT CẢ ERP, KHÔNG QUÉT MỘT CHỖ: mọi tab của BỐN vai trò × BA bề ngang.

   CHẠY:
     npm run do-mo-ra-xem-duoc            → đo cây làm việc hiện tại
     npm run do-mo-ra-xem-duoc-tu-kiem    → GÀI LẠI ĐÚNG LỖI GY-0007 (dời
       `let TL_NHOM_LUU_DUOC` về chỗ cũ, dưới đáy tệp). Bàn đo PHẢI ĐỎ. Không
       đỏ thì bàn đo mù, và số nó in ra không dùng được.
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { dungMayGia, moChrome, TOI, TOI_ID, NGUOI, DANH_BA, dungTin } from './lib/ban-do-chrome.mjs';

const dso = process.argv;
const TU_KIEM = dso.includes('--tu-kiem');
const CHUP = dso.includes('--chup');
const lay = (co, mac) => { const i = dso.indexOf(co); return i > 0 ? dso[i + 1] : mac; };
const THU_MUC_ANH = lay('--anh', '.anh-do-mo-ra-xem-duoc');

/* ==========================================================================
   MẪU HỎNG GIẢ — dời `let TL_NHOM_LUU_DUOC = []` trở lại đáy tệp
   ---------------------------------------------------------------------------
   Đây ĐÚNG là hình dạng lỗi đã sống trên `main`, không phải một lỗi bịa cho
   dễ bắt. Ba bước: gỡ dòng khai ở khối đầu tệp, rồi khai lại ngay trên
   `function nutSuaTaiLieu(` ở cuối tệp. Bước nào không khớp thì NÉM LỖI —
   bàn đo âm thầm chạy trên bản LÀNH rồi báo "đã tự kiểm" là tự lừa.
   ========================================================================== */
const NEO_KHAI_MOI = `let TL_NHOM_LUU_DUOC = [];\n\nconst taiDanhMucNen = ngheDuLieu(`;
const NEO_KHAI_MOI_THAY = `const taiDanhMucNen = ngheDuLieu(`;
const NEO_CHO_CU = `function nutSuaTaiLieu(t) {`;
const NEO_CHO_CU_THAY = `let TL_NHOM_LUU_DUOC = [];\n\nfunction nutSuaTaiLieu(t) {`;

function gaiLoiCu(maGoc) {
  /* Quy về LF trước khi khớp: git trên máy Windows này đổi LF ↔ CRLF tuỳ lúc
     checkout, nên chuỗi nhiều dòng viết trong bàn đo có lúc khớp có lúc không.
     Đúng cái bẫy `do-kho-tai-lieu.mjs` đã ghi. */
  const ma = maGoc.replace(/\r\n/g, '\n');
  if (!ma.includes(NEO_KHAI_MOI))
    throw new Error('Mẫu hỏng giả trượt: không thấy chỗ khai TL_NHOM_LUU_DUOC ở đầu tệp — sửa bàn đo.');
  if (!ma.includes(NEO_CHO_CU))
    throw new Error('Mẫu hỏng giả trượt: không thấy `function nutSuaTaiLieu(t) {` — sửa bàn đo.');
  return ma.replace(NEO_KHAI_MOI, NEO_KHAI_MOI_THAY).replace(NEO_CHO_CU, NEO_CHO_CU_THAY);
}
const suaTep = TU_KIEM ? (s, ten) => (ten === 'assets/js/app.js' ? gaiLoiCu(s) : s) : null;

/* ==========================================================================
   BỐN VAI TRÒ THẬT — bộ tab lấy đúng từ `src/quyen.js`
   ---------------------------------------------------------------------------
   Đo một vai admin là bỏ sót đúng nhóm hay gặp lỗi nhất: người có ÍT quyền.
   ========================================================================== */
const VAI_TRO = [
  { ma: 'du_quyen', ten: 'Đủ quyền (admin)', admin: 1,
    tab: ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu', 'khovan', 'kinhdoanh',
          'ketoan', 'taisan', 'xepca', 'donhoan', 'khotailieu', 'quantri', 'dulieunen',
          'congviec', 'muctieu'],
    nhomXem: '*', nhomLuu: '*' },
  { ma: 'nguoi_dung', ten: 'Người dùng', admin: 0,
    tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'taisan', 'xepca', 'khotailieu', 'gopy'],
    nhomXem: ['noi_bo'], nhomLuu: [] },
  { ma: 'quan_ly_kho', ten: 'Quản lý kho', admin: 0,
    tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'nhansu',
          'dulieunen', 'taisan', 'xepca', 'khotailieu', 'gopy'],
    nhomXem: ['nhap_khau', 'attp', 'noi_bo'], nhomLuu: ['nhap_khau', 'attp'] },
  { ma: 'ke_toan_truong', ten: 'Kế toán trưởng', admin: 0,
    tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'donhoan',
          'ketoan', 'taisan', 'xepca', 'khotailieu', 'gopy'],
    nhomXem: ['ke_toan', 'nhap_khau', 'ncc', 'phap_ly', 'noi_bo'],
    nhomLuu: ['ke_toan', 'nhap_khau', 'ncc'] }
];

const BE_NGANG = [
  { rong: 375, cao: 667, ten: 'iPhone SE' },
  { rong: 414, cao: 896, ten: 'iPhone Plus' },
  { rong: 1440, cao: 900, ten: 'Máy tính' }
];

/* ==========================================================================
   BẢY NHÓM GIẤY TỜ — CHÉP ĐÚNG `NHOM_TAI_LIEU` trong `src/quyen.js`
   ---------------------------------------------------------------------------
   Bản đầu của bàn đo này bịa bốn mã nhóm, và mã `luu` của vai "Quản lý kho"
   (`nhap_khau`·`attp`) không nằm trong danh sách bịa đó → màn quét mở ra
   KHÔNG có nhóm nào để chọn và bàn đo TREO CỨNG, không đỏ không xanh. Một bàn
   đo treo còn tệ hơn một bàn đo đỏ: người ta không đọc nó, người ta tắt nó.
   Dữ liệu giả phải cùng BỘ MÃ với sản phẩm, không được bịa.
   ========================================================================== */
const NHOM_TL = [
  { ma: 'phap_ly',   ten: 'Pháp lý doanh nghiệp' },
  { ma: 'attp',      ten: 'An toàn thực phẩm' },
  { ma: 'nhap_khau', ten: 'Nhập khẩu' },
  { ma: 'ke_toan',   ten: 'Kế toán – thuế' },
  { ma: 'nhan_su',   ten: 'Nhân sự' },
  { ma: 'ncc',       ten: 'Nhà cung cấp' },
  { ma: 'noi_bo',    ten: 'Quản trị nội bộ' }
];

/* Ba tài liệu — đúng bằng số tài liệu THẬT đang có trong kho (Sếp báo 3).
   Chọn nhóm sao cho MỌI vai trò đều nhìn thấy ít nhất một tờ (`noi_bo` ai
   cũng xem được) — không thì mấy vai ít quyền chỉ đo được một màn rỗng. */
const TAI_LIEU = [
  { id: 'TL-001', tieu_de: 'Giấy chứng nhận đăng ký doanh nghiệp Alpha Green Commerce',
    nhom: 'phap_ly', loai: 'Giấy phép', so_hieu: '0110938472', so_trang: 3,
    ngay_het_han: null, nhay_cam: 0, ocr_so_trang: 3, ocr_so_trang_neo: 3,
    chu_nguon: 'pdf_lop_chu', trich: 'Công ty TNHH Alpha Green Commerce, trụ sở Hà Nội' },
  { id: 'TL-002', tieu_de: 'Giấy tiếp nhận bản công bố hạt điều rang muối',
    nhom: 'attp', loai: 'Công bố sản phẩm', so_hieu: 'ATTP-2451', so_trang: 5,
    ngay_het_han: '2026-09-20', nhay_cam: 0, ocr_so_trang: 5, ocr_so_trang_neo: 2,
    chu_nguon: 'boc_chu', trich: 'Bản công bố phù hợp quy định an toàn thực phẩm' },
  { id: 'TL-003', tieu_de: 'Quy trình đóng gói hàng khô — bản ban hành 2026',
    nhom: 'noi_bo', loai: 'Quy trình', so_hieu: 'QT-KV-07', so_trang: 4,
    ngay_het_han: null, nhay_cam: 0, ocr_so_trang: 0, ocr_so_trang_neo: 0,
    chu_nguon: null, trich: null }
];
const loc = (ds, cho) => (cho === '*' ? ds : ds.filter(x => cho.includes(x.ma || x.nhom)));

/* ==========================================================================
   Ổ CHAT CÓ TRÍ NHỚ — máy giả phải NHẬN được tin vừa gửi
   ---------------------------------------------------------------------------
   Ổ chung của thư viện trả một danh sách 120 tin CỐ ĐỊNH. Gửi tin xong,
   `app.js` gọi `?sau_id=120` để lấy tin mới — ổ cố định trả rỗng, nên phép đo
   "gửi có ăn không" luôn ĐỎ dù sản phẩm chạy đúng. Đó là bàn đo nói dối, và
   một bàn đo đỏ oan sẽ bị người ta tắt đi. Ổ này nhớ tin vừa gửi.
   ========================================================================== */
function oChatCoTriNho(voiMacDinh) {
  const themVao = [];   // tin do bàn đo gửi lên
  let idKe = 121;
  return { themVao, tiep(duong, u, traJson, req) {
    if (duong === '/api/chat/gui') {
      themVao.push({
        id: idKe, nguoi_gui_id: TOI_ID, nguoi_gui_ten: TOI.ho_ten, nguoi_gui_viet_tat: 'BN',
        nguoi_nhan_id: voiMacDinh, noi_dung: 'Thử gửi từ bàn đo',
        tep_ten: null, tep_loai: null, tep_kich_thuoc: null,
        tao_luc: '2026-09-07 09:00:00'
      });
      return traJson({ ok: true, id: idKe++ }) || true;
    }
    if (duong === '/api/chat/tin-nhan') {
      const sauId = parseInt(u.searchParams.get('sau_id'), 10) || 0;
      const truoc = parseInt(u.searchParams.get('truoc_id'), 10) || 0;
      const het = dungTin(u.searchParams.get('voi') || null).concat(themVao);
      if (sauId > 0) return traJson({ tin_nhan: het.filter(t => t.id > sauId), toi_id: TOI_ID }) || true;
      if (truoc > 0) {
        const cu = het.filter(t => t.id < truoc).slice(-50);
        return traJson({ tin_nhan: cu, con_nua: het.some(t => t.id < (cu[0]?.id ?? 0)), toi_id: TOI_ID }) || true;
      }
      const cuoi = het.slice(-50);
      return traJson({ tin_nhan: cuoi, con_nua: het.length > 50, toi_id: TOI_ID }) || true;
    }
    return false;
  } };
}

function oTraLoi(vai, chat) {
  return function apiRieng(duong, u, traJson, req) {
    if (chat.tiep(duong, u, traJson, req)) return true;
    if (duong === '/api/toi-la-ai') return traJson({
      ...TOI, id: TOI_ID, nhan_su_id: TOI_ID, quyen: vai.tab,
      vai_tro: vai.admin ? 'admin' : vai.ma,
      la_admin: vai.admin, them_nhan_su: vai.admin, thao_tac_van_hanh: vai.admin,
      phong_ban_quan_ly: [], shopee: { xem: vai.tab.includes('donhoan') ? 1 : 0 }
    }) || true;
    if (duong === '/api/tai-lieu') {
      /* Máy chủ thật lọc theo quyền XEM của từng vai (src/quyen.js
         `QUYEN_NHOM_TAI_LIEU`) — bàn đo lọc y hệt, không trả cả kho cho vai
         chỉ xem được một nhóm. */
      const nhom = loc(NHOM_TL, vai.nhomXem);
      const ds = loc(TAI_LIEU, vai.nhomXem);
      return traJson({
        ds, nhom,
        nhom_luu_duoc: vai.nhomLuu === '*' ? NHOM_TL.map(n => n.ma) : vai.nhomLuu,
        dem_chu: { tra_cuu_duoc: 1, co_chu_chua_neo: 1, khong_chu: 1 }
      }) || true;
    }
    if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
    if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
    if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
    if (duong === '/api/muc-tieu/danh-sach')
      return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
    if (duong === '/api/dulieunen/tinh-trang') return traJson({ muc: [], viec_tiep_theo: [] }) || true;
    if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
    if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach_hang: [] }) || true;
    if (duong === '/api/kinh-doanh/don-hang-huy')
      return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
    if (duong === '/api/ke-toan/can-tra-soat') return traJson({ can_tra_soat: [] }) || true;
    if (duong === '/api/ke-toan/hang-hong') return traJson({ hang_hong: [] }) || true;
    if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: vai.admin } }) || true;
    if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
    if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
    if (duong === '/api/quan-tri/danh-sach') return traJson({ nhan_su: [], vai_tro: [] }) || true;
    if (duong === '/api/nhan-su/viec-can-lam')
      return traJson({ qua_han: [], sap_het: [], sinh_nhat_thang_sau: [] }) || true;
    return false;
  };
}

/* ==========================================================================
   CÂU LỖI KỸ THUẬT LỌT RA MÀN HÌNH
   ---------------------------------------------------------------------------
   Hai họ:
     · Chữ MÁY: `Cannot access … before initialization`, `is not defined`,
       `undefined`, `[object Object]`, `NaN`. Người dùng đọc không hiểu gì —
       và mỗi lần nó hiện là một tính năng đã chết.
     · Chữ NGƯỜI báo hỏng: "Không tải được", "Không mở được"… Câu này viết
       đúng luật nhà, nhưng ở bàn đo thì nó vẫn là bằng chứng màn KHÔNG xem
       được — vì mọi đường API trong bàn đo đều trả 200.
   ========================================================================== */
const MAU_LOI_MAY = [
  /Cannot access '[^']+' before initialization/,
  /is not defined/, /is not a function/, /\[object Object\]/,
  /\bundefined\b/, /\bNaN\b/, /TypeError/, /ReferenceError/
];
const MAU_LOI_NGUOI = [
  /Không tải được/, /Không mở được/, /Không đọc được/, /Không xem được/,
  /Không dựng được/, /Không nạp được/
];

function batLoiTrongChu(chu) {
  const ra = [];
  for (const m of MAU_LOI_MAY) { const k = chu.match(m); if (k) ra.push('chữ máy: ' + k[0]); }
  for (const m of MAU_LOI_NGUOI) {
    const i = chu.search(m);
    if (i >= 0) ra.push('báo hỏng: ' + chu.slice(i, i + 90).replace(/\s+/g, ' '));
  }
  return ra;
}

/* ---- Sổ chấm ------------------------------------------------------------ */
let soHong = 0, soCham = 0;
let LUOT = '';                      // "vai trò @ bề ngang" của lượt đang chạy
let DANG_MO = null;                 // { b, may } của lượt đang chạy — để dọn khi TREO
const HONG = [];
function cham(ok, nhan, them = '') {
  soCham++;
  if (!ok) { soHong++; HONG.push(`[${LUOT}] ` + nhan + (them ? ' — ' + them : '')); }
  console.log(`  ${ok ? 'ĐẠT  ' : '✗ HỎNG'}  ${nhan}${them ? '   ' + them : ''}`);
  return ok;
}
const muc = (s) => console.log(`\n─── ${s} ───`);

/* ==========================================================================
   MỘT LƯỢT: một vai trò × một bề ngang
   ========================================================================== */
async function motLuot(vai, bn) {
  const chat = oChatCoTriNho('NS-DUY');
  const may = await dungMayGia({ apiRieng: oTraLoi(vai, chat), suaTep });
  const b = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: bn.rong, cao: bn.cao });
  /* Ghi lại để đồng hồ chết ở cuối tệp còn dọn được Chrome khi lượt TREO —
     `finally` dưới đây không chạy nổi lúc đó vì lượt vẫn đang chờ. */
  DANG_MO = { b, may };
  LUOT = `${vai.ten} @ ${bn.rong}px`;
  muc(`${LUOT}  (${bn.ten})`);

  try {
    const soTab = await b.chay(`document.querySelectorAll('[data-tab]').length`);
    if (!cham(soTab > 0, 'dựng được thanh bên', `${soTab} tab`)) return;

    const dsTab = await b.chay(`[...document.querySelectorAll('[data-tab]')].map(x => x.dataset.tab)`);

    /* ---- Ⓐ + Ⓒ: đi qua TỪNG tab ---------------------------------------- */
    for (const tab of dsTab) {
      await b.chay(`document.querySelector('[data-tab="${tab}"]').click(); 1`);
      await b.doi(600);
      const kq = await b.chay(`(async () => {
        const v = document.getElementById('v-${tab}');
        const se = document.scrollingElement;
        const chu = v ? (v.innerText || '') : '';
        // Cuộn thật: đẩy xuống đáy rồi đọc lại scrollTop.
        const canCuon = se.scrollHeight - se.clientHeight;
        let cuonDuoc = true, cuonToi = 0;
        if (canCuon > 8) {
          se.scrollTop = 0;
          window.scrollTo(0, 99999);
          await new Promise(r => setTimeout(r, 200));
          cuonToi = se.scrollTop;
          cuonDuoc = cuonToi > 0;
          window.scrollTo(0, 0);
        }
        return {
          chu, canCuon, cuonDuoc, cuonToi,
          bodyOy: getComputedStyle(document.body).overflowY,
          htmlOy: getComputedStyle(document.documentElement).overflowY,
          coChu: chu.trim().length
        };
      })()`);

      const loi = batLoiTrongChu(kq.chu);
      cham(loi.length === 0, `Ⓐ ${tab} — không có câu lỗi trên màn`,
        loi.length ? loi.join(' | ') : `${kq.coChu} ký tự`);
      cham(kq.cuonDuoc, `Ⓒ ${tab} — cuộn xuống được`,
        kq.canCuon > 8 ? `cần cuộn ${kq.canCuon}px, cuộn tới ${kq.cuonToi}px` : 'vừa một màn');
    }

    /* ---- GY-0006: đi trọn đường CHAT ------------------------------------ */
    if (dsTab.includes('danhba')) {
      await b.chay(`document.querySelector('[data-tab="danhba"]').click(); 1`);
      await b.doi(700);
      const moChat = await b.chay(`(() => {
        const v = document.getElementById('v-danhba');
        const nut = [...v.querySelectorAll('button, a')].find(x => /chat ngay/i.test(x.textContent));
        if (!nut) return 'khong-thay-nut';
        nut.click(); return 'ok';
      })()`);
      cham(moChat === 'ok', `chat — có nút "Chat ngay" ở Danh bạ`, moChat);
      if (moChat === 'ok') {
        await b.doi(1400);
        const cs = await b.chay(`(() => {
          const p = document.querySelector('.cnb-popup');
          if (!p || p.hidden) return { mo: false };
          const r = p.getBoundingClientRect();
          const khung = [...p.querySelectorAll('*')].find(e => e.scrollHeight - e.clientHeight > 8);
          return {
            mo: true,
            trongMan: r.top < window.innerHeight - 40 && r.bottom > 40 &&
                      r.left < window.innerWidth - 40 && r.right > 40,
            w: Math.round(r.width), h: Math.round(r.height),
            top: Math.round(r.top), bottom: Math.round(r.bottom),
            soTin: p.querySelectorAll('.chat-tin').length,
            coONhap: !!p.querySelector('textarea, input[type=text]'),
            vungCuon: khung ? khung.scrollHeight - khung.clientHeight : 0,
            chu: p.innerText || ''
          };
        })()`);
        cham(cs.mo, 'chat — cửa sổ MỞ RA sau khi bấm');
        if (cs.mo) {
          cham(cs.trongMan, 'chat — cửa sổ nằm trong khung nhìn',
            `${cs.w}×${cs.h} tại y ${cs.top}…${cs.bottom}, màn cao ${bn.cao}`);
          cham(cs.soTin > 0, 'chat — có tin nhắn hiện ra', `${cs.soTin} tin`);
          cham(cs.coONhap, 'chat — có ô gõ tin');
          cham(cs.vungCuon > 0, 'chat — vùng đọc tin cuộn ngược được', `${cs.vungCuon}px`);
          const loiChat = batLoiTrongChu(cs.chu);
          cham(loiChat.length === 0, 'chat — không có câu lỗi trong cửa sổ', loiChat.join(' | '));

          /* Gõ + gửi: bấm mà không có phản ứng nhìn thấy được là TRƯỢT. */
          const gui = await b.chay(`(async () => {
            const p = document.querySelector('.cnb-popup');
            const o = p.querySelector('textarea, input[type=text]');
            const truoc = p.querySelectorAll('.chat-tin').length;
            o.focus(); o.value = 'Thử gửi từ bàn đo';
            o.dispatchEvent(new Event('input', { bubbles: true }));
            const nut = [...p.querySelectorAll('button')].find(x => /^gửi$/i.test(x.textContent.trim()));
            if (!nut) return { loi: 'khong-thay-nut-gui' };
            nut.click();
            await new Promise(r => setTimeout(r, 900));
            return { truoc, sau: p.querySelectorAll('.chat-tin').length,
                     oConChu: o.value.length };
          })()`);
          cham(!gui.loi && gui.sau > gui.truoc, 'chat — gửi tin thì có tin mới hiện lên',
            gui.loi || `${gui.truoc} → ${gui.sau} tin`);
          cham(!gui.loi && gui.oConChu === 0, 'chat — gửi xong ô gõ được dọn sạch',
            gui.loi || `còn ${gui.oConChu} ký tự`);
        }

        if (CHUP) await b.chup(`${process.cwd()}/${THU_MUC_ANH}/${vai.ma}-${bn.rong}-chat.png`);

        /* ---- Ⓒ: ĐÓNG cửa sổ rồi kiểm khoá cuộn có được gỡ không --------- */
        await b.chay(`(document.querySelector('.cnb-dong') || {click(){}}).click(); 1`);
        await b.doi(500);
        const sauDong = await b.chay(`(async () => {
          const se = document.scrollingElement;
          const canCuon = se.scrollHeight - se.clientHeight;
          se.scrollTop = 0; window.scrollTo(0, 99999);
          await new Promise(r => setTimeout(r, 200));
          const toi = se.scrollTop;
          window.scrollTo(0, 0);
          return {
            conLop: document.body.classList.contains('cnb-mo') ||
                    document.body.classList.contains('tlq-khoa-cuon'),
            bodyOy: getComputedStyle(document.body).overflowY,
            canCuon, toi
          };
        })()`);
        cham(!sauDong.conLop, 'chat — đóng xong KHÔNG còn lớp khoá cuộn trên body',
          `body.overflow-y = ${sauDong.bodyOy}`);
        cham(sauDong.canCuon <= 8 || sauDong.toi > 0,
          'chat — đóng xong trang nền cuộn lại được',
          `cần ${sauDong.canCuon}px, cuộn tới ${sauDong.toi}px`);
      }

      /* ---- GY-0006: ĐƯỜNG VÀO THỨ HAI — nút chat nổi góc màn ------------
         "Không dùng được chat trên máy tính" không nói rõ bấm từ đâu. Đường
         "Chat ngay" ở Danh bạ đã đo ở trên; đây là đường người ta dùng nhiều
         hơn hẳn: cái nút tròn góc dưới phải, mở ra DANH SÁCH HỘI THOẠI rồi
         mới vào một luồng. Hai đường, hai lượt đo — đo một đường rồi khai
         "chat chạy tốt" là khai thừa. */
      const moNoi = await b.chay(`(() => {
        const n = document.querySelector('.cnb-nut');
        if (!n || getComputedStyle(n).display === 'none') return 'khong-thay-nut-noi';
        n.click(); return 'ok';
      })()`);
      cham(moNoi === 'ok', 'chat — có nút chat nổi ở góc màn', moNoi);
      if (moNoi === 'ok') {
        await b.doi(1300);
        const ds = await b.chay(`(() => {
          const p = document.querySelector('.cnb-popup');
          if (!p || p.hidden) return { mo: false };
          const o = p.querySelector('#cnbDs');
          const muc = o ? [...o.querySelectorAll('.cnb-ds-muc')] : [];
          return { mo: true, soMuc: muc.length,
                   tenDau: muc[0] ? muc[0].innerText.trim().slice(0, 40) : '',
                   chu: p.innerText || '' };
        })()`);
        cham(ds.mo, 'chat — nút nổi MỞ được cửa sổ');
        if (ds.mo) {
          cham(ds.soMuc > 0, 'chat — danh sách hội thoại có dòng để bấm', `${ds.soMuc} dòng`);
          const loiDs = batLoiTrongChu(ds.chu);
          cham(loiDs.length === 0, 'chat — danh sách hội thoại không có câu lỗi', loiDs.join(' | '));
          if (ds.soMuc > 0) {
            await b.chay(`document.querySelector('.cnb-popup #cnbDs .cnb-ds-muc').click(); 1`);
            await b.doi(1300);
            const luong = await b.chay(`(() => {
              const p = document.querySelector('.cnb-popup');
              return { soTin: p.querySelectorAll('.chat-tin').length,
                       coONhap: !!p.querySelector('textarea, input[type=text]') };
            })()`);
            cham(luong.soTin > 0, 'chat — bấm một hội thoại thì vào đọc được tin',
              `${luong.soTin} tin`);
            cham(luong.coONhap, 'chat — vào luồng có ô gõ tin');
          }
        }
        await b.chay(`(document.querySelector('.cnb-dong') || {click(){}}).click(); 1`);
        await b.doi(400);
      }
    }

    /* ---- Ⓒ (tiếp): MÀN QUÉT TÀI LIỆU — khoá cuộn thứ HAI của ERP -------
       `.tlq-khoa-cuon` đặt `overflow:hidden` lên `body`. Quên gỡ nó là CẢ ERP
       đứng im, không riêng kho tài liệu — đúng câu "không kéo xuống được". */
    if (dsTab.includes('khotailieu')) {
      await b.chay(`document.querySelector('[data-tab="khotailieu"]').click(); 1`);
      await b.doi(600);
      const coNutQuet = await b.chay(`(() => { const n = document.querySelector('#tl-nut-quet'); return !!n && !n.hidden; })()`);
      if (coNutQuet) {
        await b.chay(`document.querySelector('#tl-nut-quet').click(); 1`);
        await b.doi(1000);
        const dangMo = await b.chay(`(() => {
          const nen = document.querySelector('.tlq-nen');
          if (!nen) return { mo: false };
          const tam = nen.querySelector('.tlq-tam');
          const x = nen.querySelector('.tlq-x');
          const rt = tam.getBoundingClientRect(), rx = x ? x.getBoundingClientRect() : null;
          return {
            mo: true,
            khoa: document.body.classList.contains('tlq-khoa-cuon'),
            tamVuaMan: rt.top >= -1 && rt.bottom <= window.innerHeight + 1,
            tamCao: Math.round(rt.height), manCao: window.innerHeight,
            nutXTrongMan: !!rx && rx.top >= 0 && rx.bottom <= window.innerHeight,
            tuCuon: tam.scrollHeight - tam.clientHeight
          };
        })()`);
        cham(dangMo.mo, 'màn quét — mở ra được');
        if (dangMo.mo) {
          cham(dangMo.khoa, 'màn quét — có khoá cuộn trang nền lúc đang mở');
          cham(dangMo.tamVuaMan, 'màn quét — tấm quét nằm gọn trong khung nhìn',
            `tấm cao ${dangMo.tamCao}px / màn ${dangMo.manCao}px`);
          cham(dangMo.nutXTrongMan, 'màn quét — nút ✕ đóng nằm trong khung nhìn');
          await b.chay(`(document.querySelector('.tlq-x') || {click(){}}).click(); 1`);
          await b.doi(600);
          const sauQuet = await b.chay(`(async () => {
            const se = document.scrollingElement;
            const canCuon = se.scrollHeight - se.clientHeight;
            se.scrollTop = 0; window.scrollTo(0, 99999);
            await new Promise(r => setTimeout(r, 200));
            const toi = se.scrollTop; window.scrollTo(0, 0);
            return { conNen: !!document.querySelector('.tlq-nen'),
                     conKhoa: document.body.classList.contains('tlq-khoa-cuon'),
                     bodyOy: getComputedStyle(document.body).overflowY, canCuon, toi };
          })()`);
          cham(!sauQuet.conNen, 'màn quét — bấm ✕ thì đóng hẳn');
          cham(!sauQuet.conKhoa, 'màn quét — đóng xong GỠ khoá cuộn trang nền',
            `body.overflow-y = ${sauQuet.bodyOy}`);
          cham(sauQuet.canCuon <= 8 || sauQuet.toi > 0,
            'màn quét — đóng xong kho tài liệu cuộn lại được',
            `cần ${sauQuet.canCuon}px, cuộn tới ${sauQuet.toi}px`);
        }
      }
    }

    /* ---- Ⓑ: console sạch sau cả lượt ------------------------------------ */
    cham(b.loiConsole.length === 0, 'Ⓑ không có console.error nào trong cả lượt',
      b.loiConsole.slice(0, 3).join(' | '));
    cham(b.ngoaiLe.length === 0, 'Ⓑ không có ngoại lệ chưa bắt nào',
      b.ngoaiLe.slice(0, 3).join(' | '));

    if (CHUP) {
      await b.chay(`(document.querySelector('[data-tab="khotailieu"]')||{click(){}}).click(); 1`);
      await b.doi(600);
      await b.chup(`${process.cwd()}/${THU_MUC_ANH}/${vai.ma}-${bn.rong}-khotailieu.png`);
    }
  } finally {
    b.dong(); may.dong(); DANG_MO = null;
  }
}

/* ==========================================================================
   Ⓓ TRẦN CHIỀU CAO ĐO BẰNG `vh` TRÊN THỨ NỔI ĐÈ MÀN HÌNH
   ---------------------------------------------------------------------------
   Đây là phần KHÔNG đo được bằng Chrome không đầu, và phải nói thẳng ra:
   Chrome chạy không đầu KHÔNG có thanh địa chỉ co giãn, nên ở đó `100vh` luôn
   bằng `innerHeight` và cái bẫy này TÀNG HÌNH với mọi phép đo trên máy này.
   Trên điện thoại thật thì `vh` tính theo màn hình lúc thanh địa chỉ CHƯA
   hiện — cao hơn vùng nhìn thấy ~60-90px. Một tấm nổi cao `92vh` nằm trong
   khung `position:fixed` (chỉ cao bằng vùng nhìn thấy) sẽ THÒI ra ngoài, và
   phần thòi ra thì `overflow:auto` của chính nó không kéo tới được: mất nút
   đóng, mất hàng nút Lưu/Huỷ. ERP đã trả giá đúng chuyện này một lần và ghi
   thành chú thích ở `.cnb-popup` (29/08/2026) — bản vá 100dvh.

   Vì không đo được bằng mắt trình duyệt, canh bằng LUẬT trên chính tệp CSS:
   thứ nào có `position: fixed` (hoặc nằm trong nền `fixed`) mà đặt trần chiều
   cao bằng `vh` thì ĐỎ. Đây là lưới chống tái phát, không phải phép đo giả
   vờ. Danh sách chỗ nổi được liệt kê tay và có kèm lý do — thêm chỗ nổi mới
   thì thêm vào đây.
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOC_REPO = resolve(decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));

/** Bộ chọn của những thứ NỔI ĐÈ màn hình (nằm trong một nền `position:fixed`).
 *  Trần chiều cao của chúng phải đo bằng `dvh`, không được đo bằng `vh`. */
const THU_NOI = [
  { chon: '.modal', vi: 'mọi hộp thoại trong ERP' },
  { chon: '.tlq-tam', vi: 'tấm quét giấy tờ (Kho tài liệu)' },
  { chon: '.tb-panel', vi: 'bảng thông báo dưới chuông' },
  { chon: '.cnb-popup', vi: 'cửa sổ chat' }
];

function doTranChieuCao() {
  muc('Ⓓ trần chiều cao của thứ nổi đè màn hình — phải là dvh, không phải vh');
  LUOT = 'luật CSS';
  const css = readFileSync(GOC_REPO + '/public/assets/css/style.css', 'utf8').replace(/\r\n/g, '\n');
  for (const t of THU_NOI) {
    /* Lấy mọi khối luật mở đầu bằng đúng bộ chọn đó, rồi soi phần thân. */
    const re = new RegExp('(?<![\\w.#-])\\' + t.chon + '\\s*(?:,[^{}]*)?\\{([^{}]*)\\}', 'g');
    const than = [...css.matchAll(re)].map(m => m[1]).join('\n');
    if (!than.trim()) { cham(false, `Ⓓ ${t.chon} — tìm thấy luật CSS`, 'không thấy khối nào, sửa bàn đo'); continue; }
    /* Chỉ soi TRẦN chiều cao (`height` / `max-height`). `max-width: 90vw` là
       chuyện khác, không đụng. */
    /* `(?<![a-z])vh\b` chứ KHÔNG phải `\bvh\b`: trong `100vh` thì trước `vh`
       là chữ số, mà chữ số cũng là ký tự từ nên KHÔNG có ranh giới `\b` ở đó
       — bản đầu tiên của bàn đo này viết `\bvh\b` và bỏ lọt SẠCH cả ba chỗ
       hỏng thật trên `main`. Đúng kiểu phép đo im lặng nói dối. Lookbehind
       chặn chữ cái đứng trước cũng là cách loại `dvh`/`svh`/`lvh`. */
    const xau = [...than.matchAll(/(max-height|height)\s*:\s*([^;]*?(?<![a-z])vh\b[^;]*);/g)]
      .map(m => m[0].trim());
    cham(xau.length === 0, `Ⓓ ${t.chon} — trần chiều cao không dùng \`vh\``,
      xau.length ? `${t.vi}: ${xau.join(' ')}` : t.vi);
  }
}

/* ==========================================================================
   CHẠY
   ========================================================================== */
console.log('BÀN ĐO "MỞ RA XEM ĐƯỢC" — lớp: màn mở ra mà không xem được nội dung');
console.log(TU_KIEM ? '⚠ CHẾ ĐỘ TỰ KIỂM: đã gài lại đúng lỗi GY-0007 — bàn đo PHẢI ĐỎ\n'
                    : `Quét ${VAI_TRO.length} vai trò × ${BE_NGANG.length} bề ngang\n`);

doTranChieuCao();

/* ==========================================================================
   ĐỒNG HỒ CHẾT CHO TỪNG LƯỢT — MỘT BÀN ĐO TREO LÀ MỘT BÀN ĐO BỊ TẮT
   ---------------------------------------------------------------------------
   Đã dính một lần trong chính đợt này: dữ liệu giả sai bộ mã làm màn quét mở
   ra không có nhóm nào, bàn đo đứng im 20 phút — không đỏ, không xanh, không
   một dòng chữ. Treo thì người ta bấm Ctrl-C rồi thôi luôn, tệ hơn hẳn ĐỎ.
   Quá giờ = ĐỎ, kèm tên lượt, để còn biết mà đi tìm.
   ========================================================================== */
const HAN_MOT_LUOT = 4 * 60 * 1000;
async function motLuotCoHan(vai, bn) {
  let hen;
  const chuong = new Promise((_, hong) => {
    hen = setTimeout(() => hong(new Error(`quá ${HAN_MOT_LUOT / 1000}s — lượt này TREO`)), HAN_MOT_LUOT);
  });
  try {
    await Promise.race([motLuot(vai, bn), chuong]);
  } catch (e) {
    LUOT = `${vai.ten} @ ${bn.rong}px`;
    cham(false, 'lượt chạy trọn vẹn', e?.message || String(e));
    if (DANG_MO) { try { DANG_MO.b.dong(); DANG_MO.may.dong(); } catch {} DANG_MO = null; }
  } finally {
    clearTimeout(hen);
  }
}

for (const vai of VAI_TRO) {
  for (const bn of BE_NGANG) await motLuotCoHan(vai, bn);
}

console.log('\n══════════════════════════════════════════════');
console.log(`Chấm ${soCham} phép · HỎNG ${soHong}`);
if (HONG.length) {
  console.log('\nDanh sách chỗ hỏng:');
  for (const h of HONG) console.log('  · ' + h);
}

if (TU_KIEM) {
  if (soHong === 0) {
    console.log('\n✗ TỰ KIỂM TRƯỢT: đã gài lại lỗi GY-0007 mà bàn đo vẫn XANH — bàn đo MÙ.');
    process.exit(1);
  }
  console.log('\n✔ TỰ KIỂM ĐẠT: gài lại lỗi thì bàn đo bắt được. Số nó in ra dùng được.');
  process.exit(0);
}
process.exit(soHong ? 1 : 0);
