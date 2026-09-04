/* ==========================================================================
   HỒ LY VÒNG 2 — "CHỮ VỪA VỪA": 45–58 KÝ TỰ, ĐƯỜNG VẼ THẬT
   ---------------------------------------------------------------------------
   "Lưới chặn cuối" chỉ cấp trần cho ô DÀI HƠN 60 ký tự. Bàn dò
   `ho-ly-nguong-60-va-tick.mjs` cho thấy đúng 60 ký tự thì 20 bảng tràn, 61 ký
   tự thì 1. Câu hỏi còn lại: chữ 45–58 ký tự có phải chữ THẬT của Alpha Green
   không, hay chỉ là số tôi bịa ra để bắt lỗi?

   Đây là chữ thật của ngành: tên nông sản khô nhập khẩu kèm quy cách, và họ
   tên Việt kèm chức danh. Đo trên ĐƯỜNG VẼ THẬT (API giả, ứng dụng tự vẽ),
   không chèn dòng.
   CHẠY: node scripts/ho-ly-chu-vua-vua.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI, DANH_BA } from './lib/ban-do-chrome.mjs';

/* Chữ THẬT, đếm được, đều nằm dưới ngưỡng 60. */
const TEN_NS   = 'Nguyễn Thị Huyền — Vận hành sàn Shopee & TikTok';   // 46
const CHUC_VU  = 'Chuyên viên Vận hành sàn kiêm Chăm sóc khách hàng'; // 48
const BO_PHAN  = 'Kinh doanh & Marketing — Nhóm sàn TMĐT';            // 38
const SAN_PHAM = 'Hạt điều rang muối Bình Phước loại A túi 500g';     // 44
const LY_DO    = 'Khách đổi ý sau khi đặt, chưa lấy hàng';            // 38

for (const [ten, n] of [['TEN_NS', TEN_NS], ['CHUC_VU', CHUC_VU], ['BO_PHAN', BO_PHAN],
                        ['SAN_PHAM', SAN_PHAM], ['LY_DO', LY_DO]])
  console.log(`  ${ten.padEnd(9)} = ${String(n.length).padStart(2)} ký tự  (ngưỡng lưới chặn cuối là >60)`);

const apiRieng = (d, u, j) => {
  if (d === '/api/danh-ba') { j({ danh_ba: DANH_BA }); return true; }
  if (d === '/api/toi-la-ai') {
    j({ ...TOI, vai_tro: 'quan_ly_kho', la_admin: false, them_nhan_su: false,
        quyen: ['tongquan', 'lichsuviec', 'danhba', 'nhansu', 'kinhdoanh'] });
    return true;
  }
  if (d === '/api/nhan-su') {
    j({ xem_luong: false, nhan_su: [1, 2, 3].map(i => ({
      id: 'NS-' + i, ma_nv: 'AGC-000' + i, ho_ten: TEN_NS, viet_tat: 'NH',
      chuc_vu: CHUC_VU, bo_phan: BO_PHAN, trang_thai: 'dang_lam',
      ngay_vao: '2025-01-05', dang_lam: 1, co_anh: 0 })) });
    return true;
  }
  if (d === '/api/kinh-doanh/don-hang-huy') {
    /* TÊN TRƯỜNG ĐÚNG như `veBangDonHuy` đọc (app.js:6766+) — bản mock của
       arm R dùng tên khác (`ma_don_hang`, `san_pham`, `ly_do_huy`) nên bảng
       vẽ ra toàn dấu "—" và phép đo bề ngang ở đó nhẹ hơn thực tế. */
    j({ co_bang: true, co_van_don: true, don_huy: [1, 2, 3].map(i => ({
      order_sn: 'SPX2026090' + i, nguon: 'shopee', tao_luc_san: '2026-09-0' + i,
      ma_van_don: 'SPXVN0345678' + i, nguoi_mua: TEN_NS,
      san_pham_ten: SAN_PHAM, san_pham_sku: 'HDRM-500', tong_tien: 45000000,
      tien_te: 'VND', huy_boi: 'buyer', huy_ly_do_khach: LY_DO })) });
    return true;
  }
  return false;
};

const DO = `(function(){
  const ra = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb || !tb.rows.length) continue;
    const ma = tb.id || t.id || '(không tên)';
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    if (getComputedStyle(w).display === 'none') continue;
    if (!t.getClientRects().length) continue;
    const rong = Math.max(t.scrollWidth, w.scrollWidth), khung = w.clientWidth;
    /* Ô nào KHÔNG được cấp trần (không .cot-chu, không .num) mà vẫn nowrap */
    const hoHang = [];
    const tr0 = [...tb.rows].find(r => !r.classList.contains('dong-chitiet'));
    if (tr0) for (const td of tr0.cells) {
      const cs = getComputedStyle(td);
      if (cs.display === 'none') continue;
      const n = (td.textContent || '').trim().length;
      if (!td.classList.contains('cot-chu') && !td.classList.contains('num') &&
          cs.whiteSpace === 'nowrap' && n >= 30)
        hoHang.push((td.dataset.nhan || '?') + ':' + n + 'ký tự/' + Math.round(td.getBoundingClientRect().width) + 'px');
    }
    ra.push({ ma, khung, rong, thua: Math.max(0, rong - khung), hoHang });
  }
  return ra;
})()`;

const may = await dungMayGia({ tatHoatAnh: true, apiRieng });
for (const RONG of [1440, 1280, 1024]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  console.log(`\n===== ${RONG}px · đường vẽ thật · chữ 38–48 ký tự =====`);
  for (const tab of ['nhansu', 'kinhdoanh']) {
    await cr.chay(`(document.querySelector('[data-tab="${tab}"]')||{click(){}}).click(); 1`);
    await cr.doi(1500);
    for (const b of await cr.chay(DO)) {
      const co = b.thua > 1;
      console.log(`  ${co ? 'TRÀN' : 'vừa '} ${b.ma.padEnd(14)} ${b.rong}/${b.khung}` + (co ? ` (+${b.thua}px)` : ''));
      if (b.hoHang.length) console.log(`        ô KHÔNG có trần (nowrap): ${b.hoHang.join(' · ')}`);
    }
  }
  cr.dong();
}
may.dong();
