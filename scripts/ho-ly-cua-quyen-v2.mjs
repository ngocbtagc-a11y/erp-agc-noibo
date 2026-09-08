/* ==========================================================================
   HỒ LY VÒNG 2 — CỬA QUYỀN SAU KHI ĐỔI CÁCH KHỚP CỘT
   ---------------------------------------------------------------------------
   Vòng 1 vá CHẶN-1 bằng cách khớp ô với "danh sách cột ĐANG HIỆN" trước, danh
   sách đầy đủ sau (`app.js` trong `luoiBang()` và trong bộ xử lý nút "Chi
   tiết"). Khớp lệch một cột = đọc nhầm `<th>` của ô bên cạnh = nhãn "Vào làm"
   ra giá trị lương. Đó là đổi một lỗi hiển thị lấy một LỖ RÒ.

   CÁCH KIỂM — không tin vào cách khớp của ứng dụng chút nào:
   nhét TÊN CỘT VÀO CHÍNH GIÁ TRỊ của ô ("«Bộ phận»"). Sau đó bất kỳ ô nào có
   `data-nhan` khác cái tên nằm trong giá trị của nó là LỆCH — kiểm được mà
   không cần biết ứng dụng khớp kiểu gì.

   Đo trên BA bảng vẽ ô theo điều kiện, với NHIỀU vai và NHIỀU tổ hợp cờ:
     · Nhân sự  `#ns-bang`     — quan_ly_kho (không lương) · admin (có lương)
     · Góp ý    `#gy-bang`     — 4 tổ hợp (người gửi × rủi ro)
     · Đơn huỷ  `#kd-dhh-bang` — có / không cột "Mã vận đơn"
   Cộng ca TẢI LẠI: lần đầu không có cột, lần sau có (và ngược lại).

   CHẠY: node scripts/ho-ly-cua-quyen-v2.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI, DANH_BA } from './lib/ban-do-chrome.mjs';

const LUONG_BI_MAT = 987654321;      // nếu con số này lọt ra đâu đó → CHẶN

/* Mỗi giá trị tự khai tên cột của nó. */
const V = (ten) => `«${ten}»`;

function nhanSu(coLuong) {
  const r = {
    id: 'NS-A', ma_nv: 'AGC-0001', ho_ten: V('Nhân sự'), viet_tat: 'NY',
    chuc_vu: 'Chuyên viên', bo_phan: V('Bộ phận'), trang_thai: 'dang_lam',
    ngay_vao: V('Vào làm'), dang_lam: 1, co_anh: 0
  };
  if (coLuong) r.luong = LUONG_BI_MAT;
  return [r];
}

function gopY(coNguoiGui, coRuiRo) {
  return [{
    id: 1, ma: 'GY-001', tieu_de: V('Tiêu đề'), trang_thai: 'moi',
    next_owner: 'ADMIN', tao_luc: '2026-09-01 08:00:00',
    nguoi_gui_id: coNguoiGui ? 'NS-KHAC' : TOI.id,
    nguoi_gui_ten: V('Người gửi'), nguoi_gui_bo_phan: '',
    risk: coRuiRo ? 'cao' : null, de_xuat_risk: null, khu_vuc: null
  }];
}

function donHuy() {
  return [{
    order_sn: V('Mã đơn hàng'), nguon: 'shopee', tao_luc_san: '2026-09-01',
    ma_van_don: V('Mã vận đơn'), nguoi_mua: V('Người mua'),
    san_pham_ten: V('Sản phẩm'), san_pham_sku: '', tong_tien: 100000,
    tien_te: 'VND', huy_boi: 'buyer', huy_ly_do_khach: V('Lý do huỷ')
  }];
}

/* Đọc mọi ô + mọi dòng chi tiết, và tự chấm lệch. */
const SOI = `(function(){
  const RA = [];
  for (const t of document.querySelectorAll('table')) {
    const tb = t.tBodies[0]; if (!tb || !tb.rows.length) continue;
    const ma = tb.id || t.id || '(không tên)';
    if (!['ns-bang','gy-bang','kd-dhh-bang'].includes(ma)) continue;
    const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
    const hang = t.querySelector('thead tr:last-of-type');
    const thTatCa = [...hang.children];
    const thHien = thTatCa.filter(th => !th.hidden);
    const tr = [...tb.rows].find(r => !r.classList.contains('dong-chitiet'));
    if (!tr) continue;

    /* ① LỆCH NHÃN TRÊN BẢNG: giá trị tự khai tên cột, so với data-nhan. */
    const lech = [];
    [...tr.cells].forEach(td => {
      const m = (td.textContent || '').match(/«([^»]+)»/);
      if (!m) return;
      const nhan = td.dataset.nhan;
      if (nhan == null) { lech.push(String.fromCharCode(244)+" "+m[1]+" KHONG co data-nhan"); return; }
      if (nhan !== m[1]) lech.push("gia tri cua cot ["+m[1]+"] lai doi nhan ["+nhan+"]");
    });

    /* ② BẤM "Chi tiết" → so nhãn với giá trị trong dòng bung ra. */
    const nut = tr.querySelector('button[data-chitiet]');
    let chiTiet = null, lechCt = [];
    if (nut) {
      nut.click();
      const sau = tr.nextElementSibling;
      if (sau && sau.classList.contains('dong-chitiet')) {
        chiTiet = [...sau.querySelectorAll('.chitiet-o')].map(o => ({
          nhan: (o.querySelector('.chitiet-nhan')||{}).textContent || '',
          tri:  (o.querySelector('.chitiet-tri') ||{}).textContent || ''
        }));
        for (const c of chiTiet) {
          const m = c.tri.match(/«([^»]+)»/);
          if (m && m[1] !== c.nhan) lechCt.push("nhan [" + c.nhan + "] ra gia tri cua cot [" + m[1] + "]");
        }
      }
      nut.click();
    }

    RA.push({
      ma,
      thTatCa: thTatCa.map(x => x.textContent.trim() || '(trống)'),
      thHien:  thHien.map(x => x.textContent.trim() || '(trống)'),
      soO: tr.cells.length,
      daDap: !!tr.dataset.luoi,
      oTrenBang: [...tr.cells].map(td => ({ nhan: td.dataset.nhan ?? null,
                                            chu: (td.textContent||'').trim().slice(0,28) })),
      lech, chiTiet, lechCt,
      coNut: !!nut,
      /* LƯƠNG CÓ LỌT RA ĐÂU KHÔNG — soi cả trang, kể cả dòng chi tiết. */
      luongLot: document.body.innerText.includes('${LUONG_BI_MAT}') ||
                document.body.innerText.includes('987.654.321'),
      tran: Math.max(t.scrollWidth, w.scrollWidth) > w.clientWidth + 1
    });
  }
  return RA;
})()`;

async function ca(ten, apiRieng, tab, rong = 375, sauKhiMo = null) {
  const may = await dungMayGia({ tatHoatAnh: true, apiRieng });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong, doiMs: 2600 });
  await cr.chay(`document.querySelector('[data-tab="${tab}"]')?.click(); 1`);
  await cr.doi(1600);
  if (sauKhiMo) { await cr.chay(sauKhiMo); await cr.doi(1600); }
  const ra = await cr.chay(SOI);
  console.log(`\n########## ${ten} (@${rong}px) ##########`);
  for (const b of ra) {
    console.log(`  bảng ${b.ma} · ô=${b.soO} · th hiện=${b.thHien.length}/${b.thTatCa.length} · đã dập=${b.daDap} · có nút=${b.coNut} · tràn=${b.tran}`);
    console.log(`    ô trên bảng: ` + b.oTrenBang.map(o => `[${o.nhan ?? 'KHÔNG-NHÃN'}]=${o.chu}`).join(' | '));
    if (b.chiTiet) console.log(`    dòng chi tiết: ` + b.chiTiet.map(c => `[${c.nhan}]=${c.tri.slice(0,28)}`).join(' | '));
    if (b.lech.length)   console.log(`    ❌ LỆCH TRÊN BẢNG: ${b.lech.join(' · ')}`);
    if (b.lechCt.length) console.log(`    ❌ LỆCH TRONG CHI TIẾT: ${b.lechCt.join(' · ')}`);
    if (b.luongLot)      console.log(`    ❌❌ LƯƠNG LỌT RA MÀN HÌNH`);
    if (!b.lech.length && !b.lechCt.length && !b.luongLot) console.log(`    ✅ nhãn khớp giá trị, không rò`);
  }
  if (cr.loiConsole.length) console.log('  LỖI CONSOLE: ' + cr.loiConsole.join(' | '));
  cr.dong(); may.dong();
}

const nen = (extra) => (duong, u, traJson) => {
  if (duong === '/api/danh-ba') { traJson({ danh_ba: DANH_BA }); return true; }
  return extra(duong, u, traJson);
};

/* ---- Nhân sự: hai vai ---- */
await ca('NHÂN SỰ · vai quan_ly_kho (KHÔNG xem được lương)', nen((d, u, j) => {
  if (d === '/api/toi-la-ai') { j({ ...TOI, vai_tro: 'quan_ly_kho', them_nhan_su: false,
    quyen: ['tongquan','lichsuviec','danhba','nhansu','khovan'] }); return true; }
  if (d === '/api/nhan-su') { j({ nhan_su: nhanSu(false), xem_luong: false }); return true; }
  return false;
}), 'nhansu');

await ca('NHÂN SỰ · vai admin (CÓ xem lương)', nen((d, u, j) => {
  if (d === '/api/toi-la-ai') { j({ ...TOI, vai_tro: 'admin', them_nhan_su: false,
    quyen: ['tongquan','lichsuviec','danhba','nhansu','khovan'] }); return true; }
  if (d === '/api/nhan-su') { j({ nhan_su: nhanSu(true), xem_luong: true }); return true; }
  return false;
}), 'nhansu');

/* ---- Góp ý: bốn tổ hợp cờ ---- */
for (const [ng, rr] of [[false,false],[true,false],[false,true],[true,true]]) {
  await ca(`GÓP Ý · người gửi=${ng} · rủi ro=${rr}`, nen((d, u, j) => {
    if (d === '/api/toi-la-ai') { j({ ...TOI, vai_tro: 'nguoi_dung', la_admin: false,
      quyen: ['tongquan','lichsuviec','danhba','gopy'] }); return true; }
    if (d === '/api/gop-y') { j({ gop_y: gopY(ng, rr), danh_sach: gopY(ng, rr), toi: TOI.id }); return true; }
    return false;
  }), 'gopy', 1440);
}

/* ---- Đơn huỷ: có / không cột Mã vận đơn ---- */
for (const cvd of [false, true]) {
  await ca(`ĐƠN HUỶ · có cột Mã vận đơn=${cvd}`, nen((d, u, j) => {
    if (d === '/api/toi-la-ai') { j({ ...TOI, vai_tro: 'admin',
      quyen: ['tongquan','lichsuviec','danhba','kinhdoanh'] }); return true; }
    if (d === '/api/kinh-doanh/don-hang-huy') {
      j({ don_huy: donHuy(), co_bang: true, co_van_don: cvd }); return true; }
    return false;
  }), 'kinhdoanh', 1440);
}

/* ---- CA TẢI LẠI: lần đầu KHÔNG có cột người gửi, lần sau CÓ ---- */
let lan = 0;
await ca('GÓP Ý · TẢI LẠI (lần 1 không cột người gửi → lần 2 có)', nen((d, u, j) => {
  if (d === '/api/toi-la-ai') { j({ ...TOI, vai_tro: 'nguoi_dung', la_admin: false,
    quyen: ['tongquan','lichsuviec','danhba','gopy'] }); return true; }
  if (d === '/api/gop-y') {
    lan++;
    const ds = gopY(lan > 1, false);
    j({ gop_y: ds, danh_sach: ds, toi: TOI.id }); return true;
  }
  return false;
}), 'gopy', 1440, `document.querySelector('[data-tab="tongquan"]')?.click();
   setTimeout(()=>document.querySelector('[data-tab="gopy"]')?.click(), 300); 1`);
