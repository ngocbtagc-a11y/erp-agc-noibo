/* ==========================================================================
   BÀN ĐO: LỊCH SỬ LÀM VIỆC — 10 DÒNG MỘT TRANG CÓ LỌT MỘT MÀN HÌNH KHÔNG?
   ---------------------------------------------------------------------------
   Sếp Bùi Thị Ngọc chốt 09/09/2026 (C6): "10 dòng một trang, lọc theo tháng."

   ⚠️ BÀN ĐO NÀY KHÔNG ĐƯỢC PHÉP TỰ HẠ SỐ DÒNG.
   10 là quyết định của Sếp. Nếu 10 dòng không lọt một màn thì việc phải làm là
   BÁO CON SỐ THẬT (cao bao nhiêu · khả dụng bao nhiêu · thiếu bao nhiêu px) để
   Sếp tự quyết, KHÔNG phải lặng lẽ đổi thành 8 rồi báo "đã vừa màn". Đó đúng
   là lỗi nặng nhất của dự án này: *thước đo báo sạch trong khi thứ nó đo đang
   hỏng* — ở đây là thước đo tự chỉnh cái nó đo cho vừa mình.

   CÁCH ĐO — Chrome thật, `app.html` + `app.js` thật, dữ liệu 25 việc thật đi
   qua đúng `/api/cong-viec/lich-su`. Với mỗi bề ngang (1440×900 và 375×812):
     · đếm SỐ DÒNG bảng đang vẽ                      → phải đúng 10
     · đo MÉP DƯỚI của thanh phân trang (đáy khối cuối cùng của màn)
     · so với CHIỀU CAO KHẢ DỤNG của viewport        → thiếu bao nhiêu px
     · đo cả `scrollWidth` vs `clientWidth` của khung bảng (kéo ngang không)
   Số đo lấy bằng `getBoundingClientRect()` cộng `scrollY`, không ước lượng.

   BỐN THỨ PHẢI CÙNG CÓ MẶT TRÊN MÀN (nếu không thì "vừa màn" là vô nghĩa):
     đầu bảng (thead) · đúng 10 dòng · thanh phân trang · ô lọc tháng

   BH-16 — CA ĐỐI CHỨNG:
     DC-1  đặt lại 25 dòng/trang → bàn đo PHẢI báo "không lọt" (nó có mắt)
     DC-2  gỡ ô lọc tháng khỏi app.html → bàn đo PHẢI đỏ

   CHẠY:  node scripts/do-lichsu-mot-man.mjs
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';
import { ok, tongKet } from './ban-thu-d1.mjs';

/* Hai bề ngang Sếp yêu cầu đo. 1440×900 là màn Sếp dùng; 375×812 là điện
   thoại của nhân sự kho. */
const BE_NGANG = [
  { ten: '1440×900 (máy tính)', rong: 1440, cao: 900 },
  { ten: '375×812 (điện thoại)', rong: 375, cao: 812 }
];

/* ---- 25 việc thật, chữ độ dài ĐỜI THẬT ---------------------------------
   KHÔNG nhồi chữ dài để thổi phồng số đo, cũng KHÔNG rút ngắn để làm đẹp —
   cả hai đều là nói dối, chỉ khác chiều. Tiêu đề lấy đúng giọng việc của Alpha
   Green: nhập hàng, kiểm kê, đối soát sàn, đóng gói. */
const TIEU_DE = [
  'Kiểm kê tồn kho hạt điều rang muối cuối tháng',
  'Đối soát tiền về Shopee đợt 1 tháng 9',
  'Nhập lô hành khô Bắc Giang về kho Long Biên',
  'Rà soát hạn sử dụng nhóm nông sản khô',
  'Chốt bảng công part-time kho tháng 8',
  'Làm tự công bố sản phẩm cho mã hạt macca',
  'Trả lời khiếu nại đơn hoàn của khách VIP',
  'Cập nhật giá vốn nhóm hàng nhập khẩu',
  'Đóng gói đơn sỉ cho khách Hà Đông',
  'Kiểm tra giấy ATTP sắp hết hạn'
];
const NGUOI_NHAN = ['Phạm Khương Duy', 'Phan Thị Hằng', 'Nguyễn Thị Huyền',
                    'Vũ Lan Hương', 'Đinh Mạnh Linh'];
const TRANG_THAI = ['moi', 'dang_lam', 'cho_duyet', 'hoan_thanh', 'huy'];

/* Trải đều qua BA tháng để ô lọc tháng có thật việc để lọc. */
function ngay(i) {
  const thang = 9 - Math.floor(i / 9);                 // 9 · 8 · 7
  const ngay = ((i * 3) % 27) + 1;
  return `2026-${String(thang).padStart(2, '0')}-${String(ngay).padStart(2, '0')}`;
}

const VIEC = Array.from({ length: 25 }, (_, i) => ({
  id: 1000 + i,
  tieu_de: TIEU_DE[i % TIEU_DE.length],
  dau_ra: 'Biên bản có chữ ký, nộp trước 17h',
  mo_ta: '',
  nguoi_giao_id: TOI_ID, nguoi_giao_ten: 'Bùi Thị Ngọc',
  nguoi_nhan_id: 'NS-' + (i % 5), nguoi_nhan_ten: NGUOI_NHAN[i % 5],
  phoi_hop_ids: null, phoi_hop_ten: null,
  han_chot: ngay(i), trang_thai: TRANG_THAI[i % 5], ket_qua: null,
  tao_luc: ngay(i) + ' 08:00:00', cap_nhat_luc: ngay(i) + ' 14:30:00',
  muc_tieu_id: null, muc_tieu_ten: 'Doanh số 90 tỷ 2026'
}));

function apiRieng(duong, u, traJson) {
  if (duong === '/api/cong-viec/lich-su') {
    return traJson({ viec: VIEC, cat: null, truoc_tiep: null }), true;
  }
  if (duong === '/api/cong-viec/danh-sach') {
    return traJson({ nhan: VIEC, phoi_hop: [], giao: [],
                     cat_nhan: null, cat_phoi_hop: null, cat_giao: null }), true;
  }
  return false;
}

/* ==========================================================================
   ĐO MỘT BỀ NGANG
   ========================================================================== */
const DO = `(async () => {
  /* Mở tab Lịch sử làm việc rồi chuyển sang phạm vi "Toàn công ty" — đúng
     đường ngón tay của Sếp, không gọi hàm nội bộ. */
  const nutTab = document.querySelector('.sb-item[data-tab="lichsuviec"]');
  if (nutTab) nutTab.click();
  await new Promise(r => setTimeout(r, 400));
  const nutPv = document.querySelector('#lsv-loc .seg-nut[data-lsv="congty"]');
  if (nutPv) nutPv.click();
  await new Promise(r => setTimeout(r, 700));

  const view   = document.getElementById('v-lichsuviec');
  const bang   = document.getElementById('ls-cv-bang');
  const thead  = document.querySelector('#ls-cv-tbl thead');
  const thanh  = document.getElementById('ls-cv-trang');
  const oThang = document.getElementById('ls-cv-locthang');
  const khung  = document.querySelector('#v-lichsuviec .table-wrap');

  const hien = (el) => !!el && !el.hidden && el.getBoundingClientRect().height > 0;
  const day  = (el) => el ? Math.round(el.getBoundingClientRect().bottom + window.scrollY) : null;

  /* Chiều cao KHẢ DỤNG = chiều cao viewport. Đây là con số duy nhất đúng cho
     câu hỏi "có phải kéo dọc không": mọi thứ nằm dưới nó là phải kéo. */
  const khaDung = window.innerHeight;

  /* Số tháng ô lọc đang bày ra (trừ mục "Tất cả các tháng"). */
  const soThang = oThang ? Math.max(0, oThang.options.length - 1) : 0;

  /* DƯỚI 980px BẢNG THÀNH THẺ — thead bị CSS ẩn CÓ CHỦ Ý (style.css "LỚP 3"),
     nhãn cột chuyển thành thuộc tính data-nhan in trước từng giá trị. Không
     phân biệt hai chế độ thì bàn đo báo đỏ oan ở điện thoại: nó đòi một cái
     đầu bảng mà cả ERP đã cố ý bỏ đi ở bề ngang đó. Cái PHẢI hỏi là "người ta
     còn biết ô này là trường gì không", chứ không phải "có thẻ thead không". */
  const cheDoThe = !!thead && getComputedStyle(thead).display === 'none';
  const oCoNhan = bang
    ? [...bang.querySelectorAll('td')].some(td => (td.getAttribute('data-nhan') || '').trim().length > 0)
    : false;

  return {
    viewHien: hien(view),
    soDong: bang ? bang.querySelectorAll('tr').length : 0,
    cheDoThe,
    oCoNhan,
    theadHien: !!thead && thead.getBoundingClientRect().height > 0,
    thanhHien: hien(thanh),
    thanhChu: document.getElementById('ls-cv-trang-chu')?.textContent || '',
    oThangHien: hien(oThang),
    soThang,
    nutTruocTat: !!document.querySelector('#ls-cv-trang [data-pt="truoc"]')?.disabled,
    nutSauTat: !!document.querySelector('#ls-cv-trang [data-pt="sau"]')?.disabled,
    /* Mép dưới của khối CUỐI CÙNG thuộc màn này. Thanh phân trang đứng trước
       dải cắt, nên lấy cái nào thấp hơn. */
    dayThanh: day(thanh),
    dayDaiCat: hien(document.getElementById('ls-cv-cat')) ? day(document.getElementById('ls-cv-cat')) : null,
    dayBang: day(document.querySelector('#v-lichsuviec .table-wrap')),
    khaDung,
    /* Kéo ngang: khung bảng có rộng hơn chỗ chứa không. */
    khungRong: khung ? khung.clientWidth : 0,
    bangRong: khung ? khung.scrollWidth : 0,

    /* ---- BÓC TÁCH CHIỀU CAO: chỗ đang đi đâu hết ------------------------
       Không có bảng này thì câu "thiếu 301px" là một lời than, không phải một
       việc làm được. Có nó thì Sếp nhìn ra ngay: cắt chỗ nào lấy lại được bao
       nhiêu, mà KHÔNG phải giảm số dòng. */
    cao: {
      dauMan: Math.round(document.querySelector('#v-lichsuviec .view-head')?.getBoundingClientRect().height || 0),
      loiGioiThieu: Math.round(document.querySelector('#v-lichsuviec .view-head p')?.getBoundingClientRect().height || 0),
      boLocPhamVi: Math.round(document.getElementById('lsv-loc')?.getBoundingClientRect().height || 0),
      hangTimLoc: Math.round(document.querySelector('#v-lichsuviec .dh-timkiem')?.getBoundingClientRect().height || 0),
      khungBang: Math.round(khung?.getBoundingClientRect().height || 0),
      thanhTrang: Math.round(thanh?.getBoundingClientRect().height || 0),
      motDong: Math.round((bang?.querySelector('tr')?.getBoundingClientRect().height) || 0)
    }
  };
})()`;

async function doMotBeNgang({ rong, cao }, may) {
  const b = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong, cao, doiMs: 2200 });
  try {
    const kq = await b.chay(DO);
    return { ...kq, loiConsole: b.loiConsole.slice(), ngoaiLe: b.ngoaiLe.slice() };
  } finally { await b.dong(); }
}

/* ==========================================================================
   CHẠY
   ========================================================================== */
console.log('\n=== LỊCH SỬ LÀM VIỆC · 10 DÒNG MỘT TRANG · LỌC THEO THÁNG ===\n');

const may = await dungMayGia({ apiRieng, tatHoatAnh: true });
const soDo = {};
try {
  for (const bn of BE_NGANG) {
    const k = await doMotBeNgang(bn, may);
    soDo[bn.ten] = k;

    const day = Math.max(k.dayThanh || 0, k.dayDaiCat || 0, k.dayBang || 0);
    const thieu = day - k.khaDung;
    console.log(`— ${bn.ten} —`);
    console.log(`   số dòng đang vẽ            : ${k.soDong}`);
    console.log(`   chế độ hiển thị            : ${k.cheDoThe ? 'THẺ (≤980px, thead ẩn có chủ ý), ô có nhãn: ' + (k.oCoNhan ? 'có' : 'KHÔNG')
                                                              : 'BẢNG, đầu bảng hiện: ' + (k.theadHien ? 'có' : 'KHÔNG')}`);
    console.log(`   thanh phân trang hiện      : ${k.thanhHien ? 'có' : 'KHÔNG'}  “${k.thanhChu}”`);
    console.log(`   ô lọc tháng hiện           : ${k.oThangHien ? 'có' : 'KHÔNG'} (${k.soThang} tháng có thật)`);
    console.log(`   mép dưới khối cuối         : ${day} px`);
    console.log(`   chiều cao khả dụng         : ${k.khaDung} px`);
    console.log(`   ${thieu > 0 ? `THIẾU                      : ${thieu} px  → PHẢI KÉO DỌC`
                                : `còn dư                     : ${-thieu} px  → LỌT MỘT MÀN`}`);
    console.log(`   khung bảng / bảng          : ${k.khungRong} / ${k.bangRong} px` +
                `${k.bangRong > k.khungRong ? `  ⚠ KÉO NGANG ${k.bangRong - k.khungRong}px` : '  (không kéo ngang)'}`);
    console.log('');
  }
} finally { /* máy giả đóng ở cuối */ }

/* ---- Chốt: đúng 10 dòng, đủ bốn thứ, không kéo ngang -------------------- */
for (const bn of BE_NGANG) {
  const k = soDo[bn.ten];
  ok(`${bn.ten} · vẽ ĐÚNG 10 dòng một trang (con số Sếp chốt)`, k.soDong === 10, `${k.soDong} dòng`);
  /* "Đầu bảng" ở chế độ BẢNG là `<thead>`; ở chế độ THẺ (≤980px) là nhãn
     `data-nhan` in trước từng giá trị. Hai hình thức, một câu hỏi: người xem
     có biết ô này là trường gì không. */
  ok(`${bn.ten} · có đủ tên trường + thanh phân trang + ô lọc tháng`,
     (k.cheDoThe ? k.oCoNhan : k.theadHien) && k.thanhHien && k.oThangHien,
     `${k.cheDoThe ? 'chế độ THẺ, ô có nhãn ' + k.oCoNhan : 'chế độ BẢNG, thead ' + k.theadHien}` +
     ` · thanh ${k.thanhHien} · lọc tháng ${k.oThangHien}`);
  ok(`${bn.ten} · thanh phân trang nói cả hai con số (dòng nào / tổng bao nhiêu)`,
     /Dòng \d+–\d+ trong \d+ việc · trang \d+\/\d+/.test(k.thanhChu), `“${k.thanhChu}”`);
  ok(`${bn.ten} · trang 1 thì nút “Trước” phải TẮT, nút “Sau” phải BẬT`,
     k.nutTruocTat && !k.nutSauTat, `trước tắt ${k.nutTruocTat} · sau tắt ${k.nutSauTat}`);
  ok(`${bn.ten} · ô lọc tháng có tháng thật để chọn`, k.soThang >= 2, `${k.soThang} tháng`);
  ok(`${bn.ten} · KHÔNG kéo ngang (luật nhà: hạn chế thanh kéo sang)`,
     k.bangRong <= k.khungRong, `bảng ${k.bangRong}px / khung ${k.khungRong}px`);
  ok(`${bn.ten} · nạp màn KHÔNG lỗi console, không ngoại lệ chưa bắt`,
     k.loiConsole.length === 0 && k.ngoaiLe.length === 0,
     [...k.loiConsole, ...k.ngoaiLe].slice(0, 2).join(' | ') || 'sạch');
}

/* ---- LỌT MỘT MÀN HAY KHÔNG — BÁO SỐ, KHÔNG TỰ SỬA ----------------------
   ⚠️ MỤC NÀY KHÔNG PHẢI MỘT CỔNG ĐẬU/TRƯỢT, VÀ ĐÓ LÀ CHỦ Ý.
   Số dòng là quyết định của Sếp (10). "Vừa một màn hình" là mong muốn của Sếp.
   Hai thứ đó đang xung đột nhau ở màn này — và người được quyền gỡ xung đột đó
   là Sếp, không phải bàn đo, cũng không phải người viết mã.
     · Bắt mục này ĐỎ = ép người sau hạ số dòng cho cổng xanh → sửa cái Sếp đã
       chốt để chiều cái thước đo.
     · Bắt mục này XANH bằng cách nới ngưỡng = thước đo báo sạch trong khi thứ
       nó đo vẫn phải kéo dọc — đúng lỗi nặng nhất của dự án này.
   Nên: IN SỐ THẬT, in cả bảng bóc tách "chỗ đang đi đâu", rồi để Sếp quyết. */
console.log('— SỐ ĐO CHỜ SẾP QUYẾT: 10 dòng có lọt một màn không (KHÔNG tự giảm dòng) —');
for (const bn of BE_NGANG) {
  const k = soDo[bn.ten];
  const day = Math.max(k.dayThanh || 0, k.dayDaiCat || 0, k.dayBang || 0);
  const thieu = day - k.khaDung;
  const c = k.cao;
  console.log(`\n  ${bn.ten}`);
  console.log(`    cần ${day}px · khả dụng ${k.khaDung}px · ` +
    (thieu > 0 ? `THIẾU ${thieu}px (kéo dọc thêm ${(thieu / k.khaDung * 100).toFixed(1)}% màn)`
               : `còn dư ${-thieu}px — LỌT`));
  console.log(`    chỗ đang đi đâu: đầu màn ${c.dauMan}px (riêng lời giới thiệu ${c.loiGioiThieu}px) · ` +
              `bộ lọc phạm vi ${c.boLocPhamVi}px · hàng tìm+lọc ${c.hangTimLoc}px`);
  console.log(`                     khung bảng ${c.khungBang}px (một dòng ~${c.motDong}px) · ` +
              `thanh phân trang ${c.thanhTrang}px`);
  if (thieu > 0) {
    console.log(`    ĐỀ NGHỊ (không giảm dòng): bỏ/gập lời giới thiệu dưới tiêu đề lấy lại ~${c.loiGioiThieu}px; ` +
                `gộp bộ lọc phạm vi vào cùng hàng với ô tìm lấy lại ~${c.boLocPhamVi}px. ` +
                `Cộng lại ~${c.loiGioiThieu + c.boLocPhamVi}px / ${thieu}px còn thiếu.`);
    console.log(`    ⚠ Hai việc trên ĐỔI GIAO DIỆN NGOÀI phạm vi Sếp đã duyệt — chưa làm, chờ Sếp chốt.`);
  }
}
console.log('');

/* ==========================================================================
   BH-16 · CA ĐỐI CHỨNG — bàn đo có mắt hay không
   ========================================================================== */
console.log('\n— BH-16 · CA ĐỐI CHỨNG —');

/* DC-1: nhét 25 dòng/trang. Bàn đo phải thấy số dòng khác 10 VÀ (ở 1440×900)
   thấy màn tràn ra ngoài. Nếu nó vẫn xanh thì phép đo chiều cao là đồ giả. */
{
  const may2 = await dungMayGia({
    apiRieng, tatHoatAnh: true,
    suaTep: (s, f) => f === 'assets/js/app.js' ? s.replace('const MOI_TRANG = 10;', 'const MOI_TRANG = 25;') : s
  });
  let k = null;
  try { k = await doMotBeNgang(BE_NGANG[0], may2); } finally { may2.dong(); }
  const day = Math.max(k.dayThanh || 0, k.dayDaiCat || 0, k.dayBang || 0);
  ok('DC-1 đặt 25 dòng/trang → bàn đo THẤY số dòng sai VÀ thấy màn tràn',
     k.soDong === 25 && day > k.khaDung,
     `${k.soDong} dòng · cao ${day}px / khả dụng ${k.khaDung}px`);
}

/* DC-2: gỡ ô lọc tháng khỏi app.html. Phép kiểm "có ô lọc tháng" phải đỏ. */
{
  const may3 = await dungMayGia({
    apiRieng, tatHoatAnh: true,
    suaTep: (s, f) => f === 'app.html'
      ? s.replace(/<select id="ls-cv-locthang"[\s\S]*?<\/select>/, '')
      : s
  });
  let k = null;
  try { k = await doMotBeNgang(BE_NGANG[0], may3); } finally { may3.dong(); }
  ok('DC-2 gỡ ô lọc tháng khỏi app.html → bàn đo BẮT ĐƯỢC (không còn ô)',
     k.oThangHien === false, `oThangHien=${k.oThangHien}`);
}

may.dong();
process.exit(tongKet() ? 0 : 1);
