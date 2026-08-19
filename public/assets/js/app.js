/* ==========================================================================
   ERP Alpha Green Commerce — Điều khiển giao diện
   ---------------------------------------------------------------------------
   Danh bạ và Nhân sự lấy từ máy chủ thật (máy chủ tự kiểm tra quyền).
   Tổng quan / Kinh doanh / Kho vận / Kế toán vẫn là dữ liệu mẫu trong
   data.js — chưa nối database, chưa được đưa số thật vào.

   Việc ẩn/hiện tab ở file này CHỈ để cho thuận mắt, không phải bảo mật.
   Chặn thật nằm ở máy chủ: gõ thẳng /api/nhan-su khi không có quyền thì
   nhận 403, và cột lương không được chọn ra khỏi database ngay từ đầu.
   ========================================================================== */

import { API } from './api.js';

/* ---- Danh mục tab ------------------------------------------------------- */
const TAB = [
  { id: 'tongquan',  ten: 'Tổng quan',  icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { id: 'danhba',    ten: 'Danh bạ',    icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8' },
  { id: 'nhansu',    ten: 'Nhân sự',    icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'kinhdoanh', ten: 'Kinh doanh', icon: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
  { id: 'khovan',    ten: 'Kho vận',    icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' },
  { id: 'ketoan',    ten: 'Kế toán',    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { id: 'donhoan',   ten: 'Kết nối sàn', icon: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' },
  { id: 'quantri',   ten: 'Quản trị',   icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.17V21a2 2 0 01-4 0v-.09A1.65 1.65 0 006 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 14a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 7.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' }
];

/* Mã trạng thái trong database → chữ hiển thị + màu nhãn */
const TRANG_THAI = {
  da_ky:        { chu: 'Đã ký HĐ',     mau: 'ok' },
  thu_viec:     { chu: 'Thử việc',     mau: 'warn' },
  cho_ky:       { chu: 'Chờ ký',       mau: 'warn' },
  can_trao_doi: { chu: 'Cần trao đổi', mau: 'danger' },
  parttime:     { chu: 'Parttime',     mau: 'mute' }
};

/* ---- Tiện ích ----------------------------------------------------------- */

const $ = s => document.querySelector(s);

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

/* Chặn ký tự HTML để dữ liệu không phá vỡ trang */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* 22000000 → "22.000.000" */
function tienVN(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('vi-VN');
}

/* Bỏ dấu để gõ "ke toan" cũng tìm ra "Kế toán" */
function boDau(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
                  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/* ---- Nhãn đơn hoàn (dùng chung: Kho vận + Kinh doanh > Đơn hoàn huỷ) ---- */

// Nhãn trạng thái sàn → chữ Việt NGẮN + màu (liếc là biết). Gồm cả Shopee lẫn TikTok.
const NHAN_TT = {
  // Shopee
  REQUESTED:  { chu: 'Chờ xử lý',   mau: 'warn'   },
  PROCESSING: { chu: 'Đang xử lý',  mau: 'warn'   },
  ACCEPTED:   { chu: 'Đã duyệt',    mau: 'ok'     },
  CANCELLED:  { chu: 'Đã huỷ',      mau: 'mute'   },
  CLOSED:     { chu: 'Đã đóng',     mau: 'mute'   },
  JUDGING:    { chu: 'Đang phân xử',mau: 'danger' },
  // TikTok
  RETURN_OR_REFUND_REQUEST_PENDING:  { chu: 'Chờ duyệt',      mau: 'warn'   },
  RETURN_OR_REFUND_REQUEST_SUCCESS:  { chu: 'Đã duyệt',       mau: 'ok'     },
  RETURN_OR_REFUND_REQUEST_COMPLETE: { chu: 'Hoàn tất',       mau: 'ok'     },
  RETURN_OR_REFUND_REQUEST_CANCEL:   { chu: 'Đã huỷ',         mau: 'mute'   },
  RETURN_OR_REFUND_REQUEST_REJECT:   { chu: 'Bị từ chối',     mau: 'danger' },
  RETURN_OR_REFUND_PROCESSING:       { chu: 'Đang xử lý',     mau: 'warn'   },
  RETURN_OR_REFUND_REQUEST_REFUND:   { chu: 'Đang hoàn tiền', mau: 'warn'   },
  BUYER_SHIPPED_ITEM:                { chu: 'KH đang gửi về', mau: 'warn'   },
  SELLER_REVIEW_RETURN:              { chu: 'Chờ shop duyệt', mau: 'warn'   },
  COMPLETED:                         { chu: 'Hoàn tất',       mau: 'ok'     }
};

// Mã lạ chưa map → rút gọn cho dễ đọc (bỏ tiền tố, thay _ bằng khoảng trắng)
function nhanTrangThai(s) {
  if (!s) return { chu: '—', mau: 'mute' };
  if (NHAN_TT[s]) return NHAN_TT[s];
  const g = String(s).replace(/^RETURN_OR_REFUND_/, '').replace(/^REQUEST_/, '')
                     .replace(/_/g, ' ').toLowerCase();
  return { chu: g.charAt(0).toUpperCase() + g.slice(1), mau: 'mute' };
}

// Lý do hoàn → chữ Việt ngắn. Mã lạ thì làm sạch + cắt ngắn (giữ text đầy đủ khi rê chuột).
const LY_DO = {
  SELLER_SENT_WRONG_ITEM: 'Giao sai hàng',
  WRONG_ITEM: 'Giao sai hàng',
  ITEM_DAMAGED: 'Hàng hư hỏng',
  DAMAGED_ITEM: 'Hàng hư hỏng',
  ITEM_NOT_AS_DESCRIBED: 'Không đúng mô tả',
  NOT_AS_DESCRIBED: 'Không đúng mô tả',
  MISSING_ITEM: 'Thiếu hàng',
  MISSING_PARTS: 'Thiếu phụ kiện',
  CHANGE_OF_MIND: 'Đổi ý',
  NO_LONGER_WANTED: 'Không muốn nữa',
  WRONG_SIZE: 'Sai kích cỡ',
  QUALITY_ISSUE: 'Lỗi chất lượng',
  FAKE_ITEM: 'Hàng giả/nhái',
  EXPIRED: 'Hết hạn dùng'
};
/* Mã lý do của TikTok/Shopee thường dài (vd ecom_order_delivered_refund_and_
   return_reason_damaged) → dịch theo TỪ KHÓA cho bền, không phải liệt kê từng mã. */
const LY_DO_KHOA = [
  [/not_match|not_as_described/,          'Không đúng mô tả'],
  [/wrong_product|wrong_item|sent_wrong/, 'Giao sai hàng'],
  [/missing/,                             'Thiếu hàng'],
  [/damaged/,                             'Hàng hư hỏng'],
  [/defective/,                           'Hàng lỗi'],
  [/poor_quality|quality/,                'Chất lượng kém'],
  [/counterfeit|fake/,                    'Nghi hàng giả/nhái'],
  [/missed_delivery|delivery_date/,       'Giao trễ hẹn'],
  [/change_payment/,                      'Huỷ: đổi phương thức thanh toán'],
  [/wrong_delivery_info/,                 'Huỷ: sai thông tin giao hàng'],
  [/created_by_mistake/,                  'Huỷ: tạo nhầm đơn'],
  [/change_of_mind|no_longer_wanted/,     'Khách đổi ý'],
  [/wrong_size/,                          'Sai kích cỡ'],
  [/cancel/,                              'Khách huỷ đơn']
];
function nhanLyDo(s) {
  if (!s) return '—';
  if (LY_DO[s]) return LY_DO[s];
  const low = String(s).toLowerCase();
  for (const [re, vn] of LY_DO_KHOA) if (re.test(low)) return vn;
  let g = low.replace(/_/g, ' ');
  g = g.charAt(0).toUpperCase() + g.slice(1);
  return g.length > 34 ? g.slice(0, 34) + '…' : g;
}

/* ---- Khởi động ---------------------------------------------------------- */

let TOI;
try {
  TOI = await API.toiLaAi();
} catch {
  window.location.replace('index.html');
  throw new Error('Chưa đăng nhập');
}

/* Chưa đổi mật khẩu lần đầu thì phải đổi xong mới được vào */
if (TOI.phai_doi_mk) {
  window.location.replace('index.html');
  throw new Error('Phải đổi mật khẩu trước');
}

$('#uAv').textContent = TOI.viet_tat;
$('#uTen').textContent = TOI.ten;
$('#uChucVu').textContent = TOI.chuc_vu;

const d = new Date();
$('#ngayHomNay').textContent = 'Hôm nay, ' +
  ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'][d.getDay()] +
  ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();

/* ---- Thanh điều hướng --------------------------------------------------- */

const nav = $('#dieuHuong');
TAB.forEach(t => {
  const duocXem = TOI.quyen.includes(t.id);
  const b = el('button', 'sb-item' + (duocXem ? '' : ' locked'));
  b.innerHTML =
    `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round"><path d="${t.icon}"/></svg>` +
    `<span>${esc(t.ten)}</span>`;
  if (duocXem) {
    b.dataset.tab = t.id;
    b.addEventListener('click', () => moTab(t.id));
  } else {
    b.title = 'Chức vụ của bạn không được xem mục này';
  }
  nav.appendChild(b);
});

function moTab(id) {
  if (!TOI.quyen.includes(id)) return;

  TAB.forEach(t => {
    const v = document.getElementById('v-' + t.id);
    if (v) v.hidden = (t.id !== id);
  });

  document.querySelectorAll('.sb-item[data-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === id);
  });

  const t = TAB.find(x => x.id === id);
  $('#tieuDe').textContent = t ? t.ten : '';

  dongThanhBen();
  window.scrollTo(0, 0);
}

/* ---- Thanh bên trên điện thoại ------------------------------------------ */

const sb = $('#thanhBen'), lp = $('#lopPhu');
function dongThanhBen() { sb.classList.remove('open'); lp.classList.remove('show'); }

$('#nutMenu').addEventListener('click', () => {
  sb.classList.toggle('open'); lp.classList.toggle('show');
});
lp.addEventListener('click', dongThanhBen);

$('#nutThoat').addEventListener('click', async () => {
  try { await API.dangXuat(); } catch { /* kệ, vẫn đá về màn đăng nhập */ }
  window.location.replace('index.html');
});

/* ==========================================================================
   CÁC KHỐI DỰNG SẴN
   ========================================================================== */

function veThe(dich, ds) {
  const box = $(dich);
  if (!box) return;
  box.innerHTML = '';
  ds.forEach(s => box.appendChild(el('div', 'stat',
    `<div class="k">${esc(s.k)}</div>` +
    `<div class="v">${esc(s.v)}</div>` +
    `<div class="d ${s.dir || ''}">${esc(s.d)}</div>`
  )));
}

function veChart(dich, ds) {
  const box = $(dich);
  if (!box) return;
  box.innerHTML = '';
  const max = Math.max(...ds.map(x => x.v)) || 1;
  ds.forEach(c => {
    const col = el('div', 'col' + (c.hi ? ' hi' : ''));
    col.innerHTML =
      `<div class="vl">${esc(c.v)}</div>` +
      `<div class="fill" style="height:0"></div>` +
      `<div class="lb">${esc(c.lb)}</div>`;
    box.appendChild(col);
    requestAnimationFrame(() => {
      col.querySelector('.fill').style.height = Math.max(2, (c.v / max) * 100) + '%';
    });
  });
}

function veTienDo(dich, ds) {
  const box = $(dich);
  if (!box) return;
  box.innerHTML = '';
  ds.forEach(m => {
    const mau = m.pct >= 70 ? '' : (m.pct >= 40 ? 'warn' : 'danger');
    const r = el('div', 'list-item',
      `<div class="body">` +
        `<b>${esc(m.b)}</b><span>${esc(m.note)}</span>` +
        `<div class="bar-row" style="margin-top:8px">` +
          `<div class="bar"><i class="${mau}" style="width:0"></i></div>` +
          `<div class="pct">${m.pct}%</div>` +
        `</div>` +
      `</div>`);
    box.appendChild(r);
    requestAnimationFrame(() => { r.querySelector('.bar > i').style.width = m.pct + '%'; });
  });
}

function veDanhSach(dich, ds) {
  const box = $(dich);
  if (!box) return;
  box.innerHTML = '';
  ds.forEach(i => box.appendChild(el('div', 'list-item',
    `<div class="bullet ${i.m || ''}"></div>` +
    `<div class="body"><b>${esc(i.b)}</b><span>${esc(i.s)}</span></div>` +
    `<div class="meta">${esc(i.t)}</div>`
  )));
}

function veBang(dich, ds, hang) {
  const box = $(dich);
  if (!box) return;
  box.innerHTML = '';
  ds.forEach(r => {
    const tr = document.createElement('tr');
    const out = hang(r);
    if (out && typeof out === 'object') {       // { html, cls } — cho phép tô màu hàng
      tr.innerHTML = out.html;
      if (out.cls) tr.className = out.cls;
    } else {
      tr.innerHTML = out;
    }
    box.appendChild(tr);
  });
}

/* ==========================================================================
   ĐỔ DỮ LIỆU
   ========================================================================== */

/* -- Tổng quan (còn là dữ liệu mẫu) -- */
veThe('#tq-the', DB.tongQuan.the);
veChart('#tq-chart', DB.tongQuan.doanhThu6Thang);
veTienDo('#tq-muctieu', DB.tongQuan.mucTieuQuy);
veDanhSach('#tq-canhbao', DB.tongQuan.cannBaoDong);

/* -- Danh bạ (máy chủ thật) -- */
if (TOI.quyen.includes('danhba')) {
  const { danh_ba } = await API.danhBa();

  const veDanhBa = (tuKhoa) => {
    const k = boDau((tuKhoa || '').trim());
    const ds = danh_ba.filter(n => !k ||
      boDau(`${n.ho_ten} ${n.chuc_vu} ${n.bo_phan} ${n.sdt} ${n.email}`).includes(k));

    veBang('#db-bang', ds, n =>
      `<td><div class="person"><div class="av">${esc(n.viet_tat)}</div>` +
        `<div><div class="nm">${esc(n.ho_ten)}</div>` +
        `<div class="sm">${esc(n.chuc_vu)}</div></div></div></td>` +
      `<td>${esc(n.bo_phan)}</td>` +
      `<td><a class="lnk" href="tel:${esc(String(n.sdt || '').replace(/\s/g, ''))}">${esc(n.sdt || '—')}</a></td>` +
      `<td><a class="lnk" href="mailto:${esc(n.email)}">${esc(n.email || '—')}</a></td>` +
      `<td class="sm">${esc(n.quan_ly || '—')}</td>`);

    $('#db-trong').hidden = ds.length > 0;
    $('#db-dem').textContent = `${ds.length}/${danh_ba.length} người`;
  };

  veDanhBa('');
  $('#db-tim').addEventListener('input', e => veDanhBa(e.target.value));
}

/* -- Nhân sự (máy chủ thật) -- */
if (TOI.quyen.includes('nhansu')) {
  const { nhan_su, xem_luong } = await API.nhanSu();

  // Máy chủ mới là nơi quyết định — giao diện chỉ nghe theo.
  // Người không có quyền thì trong nhan_su thậm chí không có trường luong.
  if (!xem_luong) {
    const th = $('#ns-thLuong');
    if (th) th.remove();
    $('#ns-hint').textContent = 'Chức vụ của bạn không xem được cột lương';
  }

  veBang('#ns-bang', nhan_su, r => {
    const tt = TRANG_THAI[r.trang_thai] || { chu: r.trang_thai, mau: 'mute' };
    return '' +
      `<td><div class="person"><div class="av">${esc(r.viet_tat)}</div>` +
        `<div><div class="nm">${esc(r.ho_ten)}</div>` +
        `<div class="sm">${esc(r.chuc_vu)}</div></div></div></td>` +
      `<td>${esc(r.bo_phan)}</td>` +
      `<td><span class="tag ${tt.mau}">${esc(tt.chu)}</span></td>` +
      `<td class="sm">${esc(r.ngay_vao)}</td>` +
      (xem_luong ? `<td class="num">${esc(tienVN(r.luong))}</td>` : '');
  });

  // Các khối dưới đây vẫn là dữ liệu mẫu
  veThe('#ns-the', DB.nhanSu.the);
  veTienDo('#ns-chuyendoi', DB.nhanSu.chuyenDoi);
  veDanhSach('#ns-lich', DB.nhanSu.lich);
}

/* -- Kinh doanh -- */
if (TOI.quyen.includes('kinhdoanh')) {
  // Doanh thu theo kênh / đối thủ / sản phẩm bán chạy vẫn là dữ liệu mẫu
  veThe('#kd-the', DB.kinhDoanh.the);
  veChart('#kd-chart', DB.kinhDoanh.theoKenh);
  veDanhSach('#kd-doithu', DB.kinhDoanh.doiThu);
  veBang('#kd-bang', DB.kinhDoanh.topSanPham, r =>
    `<td><div class="nm">${esc(r.sp)}</div></td>` +
    `<td class="sm">${esc(r.dm)}</td>` +
    `<td class="num">${esc(r.dh)}</td>` +
    `<td class="num">${esc(r.dt)}</td>` +
    `<td><span class="tag ${esc(r.tt)}">${esc(r.ttx)}</span></td>`);

  // Chuyển màn Vận hành sàn / R&D (giống bộ pills của Kho vận)
  $('#kdSeg').addEventListener('click', e => {
    const nut = e.target.closest('.seg-nut');
    if (!nut) return;
    document.querySelectorAll('#kdSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    ['vanhanh', 'rnd'].forEach(k => {
      const pane = document.getElementById('kd-pane-' + k);
      if (pane) pane.hidden = (k !== nut.dataset.kd);
    });
  });

  // Vận hành sàn — đơn hoàn cần đối soát + đơn hoàn huỷ (máy chủ thật) —
  // chỉ ai có quyền Đơn hoàn mới thấy
  if (TOI.quyen.includes('donhoan')) {
    await khoiDongDoiSoatSan();
    await khoiDongDonHuy();
  }
}

/* ==========================================================================
   KINH DOANH — Vận hành sàn: đơn hoàn cần đối soát (quá 12h kho chưa nhận)
   ========================================================================== */
async function khoiDongDoiSoatSan() {
  $('#kd-doisoat-panel').hidden = false;

  function gioTre(choTu) {
    if (!choTu) return '—';
    const gio = (Date.now() - Date.parse(choTu.replace(' ', 'T'))) / 3600000;
    return gio >= 24 ? `${(gio / 24).toFixed(1)} ngày` : `${Math.round(gio)} giờ`;
  }

  // 1 dòng bảng — dùng chung cho cả 2 nhóm (chưa/đã tra soát) bên dưới
  function dongDoiSoat(r) {
    const ngTag = r.nguon === 'tiktok'
      ? '<span class="tag mute">TikTok</span>'
      : '<span class="tag sage">Shopee</span>';
    const tien = r.so_tien != null
      ? tienVN(Math.round(r.so_tien / 100000)) + ' ' + esc(r.tien_te || '')
      : '—';
    // Sản phẩm: tên (dòng trên) + SKU x số lượng (dòng dưới)
    const spSku = r.san_pham_sku || '';
    const spTen = r.san_pham_ten || r.san_pham || '—';
    const sl = r.so_luong != null ? r.so_luong : 1;
    const dong2 = spSku ? `${esc(spSku)} x ${sl}` : '';
    const spCell = `<td class="sm" title="${esc(spTen)}">${esc(spTen)}` +
      (dong2 ? `<div class="phu">${dong2}</div>` : '') + `</td>`;
    // Trạng thái sàn — rút gọn (chỉ tham khảo, không quyết định)
    const ttChu = (r.trang_thai || '—').replace(/^RETURN_OR_REFUND_/, '')
      .replace(/^REQUEST_/, '').replace(/_/g, ' ').toLowerCase();
    // Đã tra soát mấy lần
    const daTra = (r.lan_tra_soat > 0)
      ? `<span class="tag warn">${r.lan_tra_soat} lần</span>` +
        `<div class="phu">${esc(r.doi_soat_luc || '')}${r.doi_soat_boi ? ' · ' + esc(r.doi_soat_boi) : ''}</div>`
      : '<span class="tag mute">Chưa</span>';
    const nhanNut = (r.lan_tra_soat > 0) ? `Tra soát lần ${r.lan_tra_soat + 1}` : 'Đã tra soát';
    // Kho đã để quá 24h không nhận -> hệ thống tự đẩy đơn này lên đây (dang_cho='van_hanh')
    const daybao = r.dang_cho === 'van_hanh'
      ? `<div class="phu canh-bao-chu">Kho đẩy lên · quá ${esc(gioTre(r.cho_kho_nhan_tu))}</div>` : '';
    return `<td class="dinh-tick"><input type="checkbox" data-chon="${esc(r.return_sn)}"></td>` +
      `<td class="dinh-cot">${ngTag}</td>` +
      `<td class="sm dinh-cot2">${esc(r.return_sn)}${daybao}</td>` +
      `<td class="sm dinh-cot3">${esc(r.order_sn || '—')}</td>` +
      `<td class="sm dinh-cot4">${esc(r.ma_van_don || '—')}</td>` +
      spCell +
      `<td class="num">${r.so_luong != null ? esc(r.so_luong) : '—'}</td>` +
      `<td><span class="tag mute" title="${esc(r.trang_thai || '')}">${esc(ttChu)}</span></td>` +
      `<td class="num">${tien}</td>` +
      `<td>${daTra}</td>` +
      `<td><button type="button" class="btn-nho" data-doisoat="${esc(r.return_sn)}">${nhanNut}</button></td>`;
  }

  async function veDoiSoat() {
    const { can_doi_soat } = await API.kdCanDoiSoat();

    // Chưa tra soát lần nào → lên đầu, cần xử lý gấp (tô đỏ).
    // Đã tra soát rồi → tự chìm xuống cuối, chỉ còn chờ kho xác nhận nhận hàng.
    const chua = can_doi_soat.filter(r => !(r.lan_tra_soat > 0));
    const daXong = can_doi_soat.filter(r => r.lan_tra_soat > 0);

    let html = chua.map(r => `<tr class="canh-bao">${dongDoiSoat(r)}</tr>`).join('');
    if (chua.length && daXong.length) {
      html += `<tr class="kd-chiadoi"><td colspan="11">Đã tra soát — chỉ còn chờ kho xác nhận nhận hàng</td></tr>`;
    }
    html += daXong.map(r => `<tr class="kd-daxong">${dongDoiSoat(r)}</tr>`).join('');
    $('#kd-ds-bang').innerHTML = html;

    $('#kd-ds-trong').hidden = can_doi_soat.length > 0;
    $('#kd-ds-dem').textContent = `${can_doi_soat.length} đơn cần đối soát`;

    // Mỗi lần vẽ lại bảng là danh sách chọn reset về rỗng (dữ liệu vừa đổi)
    $('#kd-ds-chontatca').checked = false;
    veThanhChon();
  }

  /* ---- Tick chọn nhiều đơn -> đẩy hàng loạt sang Kho vận ---- */
  function dsDangChon() {
    return [...document.querySelectorAll('#kd-ds-bang input[data-chon]:checked')].map(o => o.getAttribute('data-chon'));
  }
  function veThanhChon() {
    const sl = dsDangChon().length;
    $('#kd-ds-thanhchon').hidden = sl === 0;
    $('#kd-ds-sldachon').innerHTML = `Đã chọn <b>${sl}</b> đơn`;
  }
  $('#kd-ds-bang').addEventListener('change', (e) => {
    if (!e.target.matches('input[data-chon]')) return;
    veThanhChon();
  });
  $('#kd-ds-chontatca').addEventListener('change', (e) => {
    document.querySelectorAll('#kd-ds-bang input[data-chon]').forEach(o => { o.checked = e.target.checked; });
    veThanhChon();
  });
  $('#kd-ds-huychon').addEventListener('click', () => {
    document.querySelectorAll('#kd-ds-bang input[data-chon]').forEach(o => { o.checked = false; });
    $('#kd-ds-chontatca').checked = false;
    veThanhChon();
  });
  $('#kd-ds-daykho').addEventListener('click', async () => {
    const ds = dsDangChon();
    if (!ds.length) return;
    const btn = $('#kd-ds-daykho');
    btn.disabled = true;
    const cu = btn.textContent;
    btn.textContent = 'Đang đẩy…';
    try {
      await API.kdDayKho(ds);
      await veDoiSoat();      // tự reset danh sách chọn + tự chìm nhóm vừa đẩy xuống dưới
    } catch (err) {
      alert(err.message || 'Không đẩy được, thử lại nhé.');
    } finally {
      btn.disabled = false;
      btn.textContent = cu;
    }
  });

  $('#kd-ds-bang').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-doisoat]');
    if (!btn) return;
    const rsn = btn.getAttribute('data-doisoat');
    btn.disabled = true;
    const cu = btn.textContent;
    btn.textContent = 'Đang lưu…';
    try {
      await API.kdDaDoiSoat(rsn);
      await veDoiSoat();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = cu;
      alert(err.message || 'Không lưu được, thử lại nhé.');
    }
  });

  await veDoiSoat();
}

/* ==========================================================================
   KINH DOANH — Vận hành sàn: đơn hoàn/hoàn tiền bị HUỶ trên sàn
   ---------------------------------------------------------------------------
   Mọi đơn huỷ đổ về đây (Sếp Ngọc chốt 19/08/2026). Đơn nào có mã vận đơn
   (hàng vật lý đã/đang quay lại dù đơn bị huỷ) thì cột "Trạng thái kho" cho
   biết kho đã nhận chưa — đơn đó cũng tự xuất hiện ở Kho vận > Đơn hoàn để
   kho bấm "Đã nhận" (xem apiDanhSach trong shopee.js).
   ========================================================================== */
async function khoiDongDonHuy() {
  $('#kd-donhuy-panel').hidden = false;

  const { don_huy } = await API.kdDonHuy();
  veBang('#kd-dh-bang', don_huy, r => {
    const ngTag = r.nguon === 'tiktok'
      ? '<span class="tag mute">TikTok</span>'
      : '<span class="tag sage">Shopee</span>';
    const spSku = r.san_pham_sku || '';
    const spTen = r.san_pham_ten || r.san_pham || '—';
    const dong2 = spSku ? `${esc(spSku)}` : '';
    const spCell = `<td class="sm" title="${esc(spTen)}">${esc(spTen)}` +
      (dong2 ? `<div class="phu">${dong2}</div>` : '') + `</td>`;
    const tt = nhanTrangThai(r.trang_thai);
    // Panel này chỉ còn đơn huỷ KHÔNG có mã vận đơn = huỷ suông, không hàng về —
    // chỉ là sổ tham chiếu. Đơn huỷ mà CÓ mã vận đơn (có hàng) đã đi vào
    // danh sách "Cần đối soát" của Vận hành sàn để xử lý như đơn thường.
    return `<td>${ngTag}</td>` +
      `<td class="sm">${esc(r.return_sn)}</td>` +
      `<td class="sm">${esc(r.order_sn || '—')}</td>` +
      spCell +
      `<td class="num">${r.so_luong != null ? esc(r.so_luong) : '—'}</td>` +
      `<td class="sm">${esc(nhanLyDo(r.ly_do))}</td>` +
      `<td><span class="tag ${tt.mau}" title="${esc(r.trang_thai || '')}">${esc(tt.chu)}</span></td>`;
  });
  $('#kd-dh-trong').hidden = don_huy.length > 0;
  $('#kd-dh-dem').textContent = `${don_huy.length} đơn huỷ`;
}

/* -- Kho — Xuất / Nhập / Tồn (máy chủ thật) -- */
if (TOI.quyen.includes('khovan')) {
  await khoiDongKho();
}

/* -- Đơn hoàn Shopee/TikTok — danh sách nằm trong tab Kho vận (kho xử lý),
   khối kết nối nằm trong tab Kết nối sàn. Chạy cho MỌI vai trò xem được đơn
   hoàn (gồm cả kho), không chỉ vai trò có tab Kết nối sàn. -- */
if (TOI.shopee && TOI.shopee.xem) {
  await khoiDongDonHoan();
}

/* ---- Chuông thông báo trong ERP 🔔 ---- */
(function chuongThongBao() {
  const NHOM_ROLES = ['nhan_vien_kho', 'quan_ly_kho', 'van_hanh_san', 'giam_doc', 'pho_giam_doc'];
  if (!NHOM_ROLES.includes(TOI.vai_tro)) return;   // vai trò không nhận thông báo → ẩn chuông

  const chuong = $('#tbChuong'), nut = $('#tbNut'), panel = $('#tbPanel'),
        badge = $('#tbBadge'), ds = $('#tbDanhSach'), trong = $('#tbTrong');
  if (!chuong || !nut) return;
  chuong.hidden = false;

  const ICO = { day_kho: '📦', khieu_nai: '⚠️', canh_bao: '🔔' };

  async function taiThongBao() {
    let kq;
    try { kq = await API.thongBao(); } catch { return; }
    const list = kq.thong_bao || [];
    if (kq.chua_doc > 0) { badge.textContent = kq.chua_doc > 99 ? '99+' : kq.chua_doc; badge.hidden = false; }
    else badge.hidden = true;
    ds.innerHTML = list.map(t =>
      `<div class="tb-item" data-loai="${esc(t.loai || '')}">` +
      `${ICO[t.loai] || '🔔'} ${esc(t.noi_dung)}<div class="tb-gio">${esc(t.tao_luc || '')}</div></div>`
    ).join('');
    trong.hidden = list.length > 0;
  }

  nut.addEventListener('click', async (e) => {
    e.stopPropagation();
    const dangMo = !panel.hidden;
    panel.hidden = dangMo;
    if (!dangMo) { try { await API.thongBaoDaXem(); } catch {} badge.hidden = true; }
  });

  ds.addEventListener('click', (e) => {
    const it = e.target.closest('.tb-item');
    if (!it) return;
    if (it.dataset.loai === 'day_kho') {
      moTab('khovan');
      const b = document.querySelector('#kvSeg .seg-nut[data-kv="donhoan"]'); if (b) b.click();
    } else if (it.dataset.loai === 'khieu_nai') {
      moTab('kinhdoanh');
    }
    panel.hidden = true;
  });

  document.addEventListener('click', () => { panel.hidden = true; });
  panel.addEventListener('click', (e) => e.stopPropagation());

  taiThongBao();
  setInterval(taiThongBao, 5 * 60 * 1000);   // làm mới 5 phút/lần
})();

async function khoiDongKho() {
  const qKho = TOI.kho || { thao_tac: false, quan_ly: false, gia_von: false };
  let DS_SP = [];          // danh sách sản phẩm + tồn, lấy từ máy chủ
  let xemGiaVon = false;

  /* Ngày dạng YYYY-MM-DD theo giờ máy người dùng (Hà Nội = giờ VN) */
  const p2 = n => String(n).padStart(2, '0');
  const ngayISO = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

  /* HSD + số ngày còn lại thành chữ dễ đọc */
  function moTaHsd(han, soNgay) {
    if (!han) return '<span class="sm">—</span>';
    const dd = han.split('-').reverse().join('/');
    if (soNgay == null) return `<span class="sm">${dd}</span>`;
    if (soNgay < 0)  return `${dd} <span class="tag danger">quá hạn</span>`;
    if (soNgay <= 30) return `${dd} <span class="tag warn">còn ${soNgay}n</span>`;
    return `<span class="sm">${dd}</span>`;
  }

  const NHAN_TT = {
    het:         { chu: 'Hết hàng',    mau: 'danger' },
    sap_het:     { chu: 'Sắp hết',     mau: 'danger' },
    can_han:     { chu: 'Cận hạn',     mau: 'warn'   },
    binh_thuong: { chu: 'Bình thường', mau: 'ok'     }
  };

  /* ---- Ẩn/hiện theo quyền ---- */
  // Không được thao tác (VD kế toán trưởng) → giấu tab Nhập/Xuất
  if (!qKho.thao_tac) {
    document.querySelectorAll('#kvSeg .seg-nut[data-kv="nhap"], #kvSeg .seg-nut[data-kv="xuat"]')
            .forEach(b => b.remove());
  }
  // Không được quản lý kho → giấu ô thêm mã hàng
  if (qKho.quan_ly) $('#kv-panel-them').hidden = false;
  // Không xem được giá vốn → bỏ cột giá trị tồn và ô đơn giá
  if (!qKho.gia_von) {
    const th = $('#kv-thGiaTri'); if (th) th.remove();
  } else {
    $('#kvNhapFieldGia').hidden = false;
  }

  /* ---- Chuyển màn (segmented) ---- */
  $('#kvSeg').addEventListener('click', e => {
    const nut = e.target.closest('.seg-nut');
    if (!nut) return;
    document.querySelectorAll('#kvSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    ['ton', 'nhap', 'xuat', 'baocao', 'donhoan'].forEach(k => {
      const pane = document.getElementById('kv-pane-' + k);
      if (pane) pane.hidden = (k !== nut.dataset.kv);
    });
  });

  /* ---- Vẽ bảng tồn kho + thẻ tổng quan + đổ dropdown ---- */
  function veTonKho(tuKhoa) {
    const k = boDau((tuKhoa || '').trim());
    const ds = DS_SP.filter(s => !k ||
      boDau(`${s.ten} ${s.ma_sku} ${s.danh_muc || ''}`).includes(k));

    veBang('#kv-ton-bang', ds, s => {
      const tt = NHAN_TT[s.trang_thai] || NHAN_TT.binh_thuong;
      return '' +
        `<td><div class="nm kv-lnk" data-sp="${esc(s.id)}">${esc(s.ten)}</div>` +
          `<div class="sm">${esc(s.danh_muc || '')}</div></td>` +
        `<td class="sm">${esc(s.ma_sku)}</td>` +
        `<td class="num"><b>${esc(tienVN(s.ton))}</b> <span class="sm">${esc(s.don_vi)}</span></td>` +
        `<td>${s.theo_doi_hsd ? moTaHsd(s.han_gan_nhat, s.so_ngay_toi_han) : '<span class="sm">không theo dõi</span>'}</td>` +
        (xemGiaVon ? `<td class="num">${esc(tienVN(s.gia_tri_ton))}</td>` : '') +
        `<td><span class="tag ${tt.mau}">${esc(tt.chu)}</span></td>`;
    });

    $('#kv-ton-trong').hidden = ds.length > 0;
    $('#kv-ton-hint').textContent = `${ds.length}/${DS_SP.length} mã hàng`;
  }

  function veThe_Kho() {
    const soMa = DS_SP.length;
    const duoiMin = DS_SP.filter(s => s.trang_thai === 'sap_het' || s.trang_thai === 'het').length;
    const canHan = DS_SP.filter(s => s.trang_thai === 'can_han').length;
    const the = [
      { k: 'Số mã hàng', v: String(soMa), d: 'Đang kinh doanh' },
      { k: 'Dưới mức tối thiểu', v: String(duoiMin), d: duoiMin ? 'Cần nhập bổ sung' : 'Ổn', dir: duoiMin ? 'down' : '' },
      { k: 'Sắp hết hạn (≤30n)', v: String(canHan), d: canHan ? 'Ưu tiên xả hàng' : 'Không có', dir: canHan ? 'down' : '' }
    ];
    if (xemGiaVon) {
      const tong = DS_SP.reduce((s, x) => s + (x.gia_tri_ton || 0), 0);
      the.push({ k: 'Giá trị tồn kho', v: tienVN(tong) + ' đ', d: 'Theo giá nhập gần nhất' });
    } else {
      const tongTon = DS_SP.reduce((s, x) => s + (x.ton || 0), 0);
      the.push({ k: 'Tổng tồn (đơn vị)', v: tienVN(tongTon), d: 'Cộng mọi mã hàng' });
    }
    veThe('#kv-the', the);
  }

  function doDropdown() {
    const optNhap = DS_SP.map(s =>
      `<option value="${esc(s.id)}">${esc(s.ten)} — ${esc(s.ma_sku)}</option>`).join('');
    const nSel = $('#kvNhapSP'), xSel = $('#kvXuatSP');
    if (nSel) nSel.innerHTML = '<option value="">— Chọn sản phẩm —</option>' + optNhap;
    if (xSel) xSel.innerHTML = '<option value="">— Chọn sản phẩm —</option>' +
      DS_SP.map(s => `<option value="${esc(s.id)}">${esc(s.ten)} — tồn ${s.ton} ${esc(s.don_vi)}</option>`).join('');
  }

  /* ---- Nạp lại toàn bộ dữ liệu kho từ máy chủ ---- */
  async function taiLai() {
    const kq = await API.khoSanPham();
    DS_SP = kq.san_pham;
    xemGiaVon = kq.xem_gia_von;
    veThe_Kho();
    veTonKho($('#kv-tim').value);
    doDropdown();
  }

  await taiLai();
  $('#kv-tim').addEventListener('input', e => veTonKho(e.target.value));

  /* ---- Bấm vào tên sản phẩm → mở hộp chi tiết lô + lịch sử ---- */
  $('#kv-ton-bang').addEventListener('click', async e => {
    const lnk = e.target.closest('.kv-lnk');
    if (!lnk) return;
    await moChiTiet(lnk.dataset.sp);
  });

  const kvModal = $('#kvModalNen');
  $('#kvModalDong').addEventListener('click', () => { kvModal.hidden = true; });
  kvModal.addEventListener('click', e => { if (e.target === kvModal) kvModal.hidden = true; });

  async function moChiTiet(spId) {
    const sp = DS_SP.find(s => s.id === spId);
    if (!sp) return;
    $('#kvModalTen').textContent = sp.ten;
    $('#kvModalMa').textContent = `Mã ${sp.ma_sku} · tồn ${sp.ton} ${sp.don_vi}`;
    $('#kvModalLo').innerHTML = '';
    $('#kvModalLichSu').innerHTML = '';
    kvModal.hidden = false;

    const [{ lo }, { lich_su }] = await Promise.all([
      API.khoLo(spId), API.khoLichSu(spId, 30)
    ]);

    // Không theo dõi HSD → luôn hiện dòng nhắc "không quản theo lô".
    // Có theo dõi → chỉ hiện khi thực sự không còn lô nào.
    $('#kvModalLoTrong').hidden = sp.theo_doi_hsd ? (lo.length > 0) : false;
    veBang('#kvModalLo', lo, l =>
      `<td>${esc(l.so_lo || '—')}</td>` +
      `<td>${moTaHsd(l.han_su_dung, l.so_ngay_toi_han)}</td>` +
      `<td class="num">${esc(tienVN(l.ton))}</td>`);

    veBang('#kvModalLichSu', lich_su, g => {
      const nhap = g.loai === 'nhap';
      const mau = nhap ? 'ok' : (g.loai === 'xuat' ? 'mute' : 'warn');
      const chu = nhap ? 'Nhập' : (g.loai === 'xuat' ? 'Xuất' : 'Điều chỉnh');
      return '' +
        `<td class="sm">${esc((g.luc || '').slice(0, 16).replace('T', ' '))}</td>` +
        `<td><span class="tag ${mau}">${chu}</span></td>` +
        `<td class="num">${esc(tienVN(g.so_luong))}</td>` +
        `<td class="sm">${esc(g.doi_tac || '—')}</td>` +
        `<td class="sm">${esc(g.nguoi || '—')}</td>`;
    });
  }

  /* ---- Nhập kho ---- */
  if (qKho.thao_tac) {
    $('#kvXuatSP').addEventListener('change', e => {
      const s = DS_SP.find(x => x.id === e.target.value);
      const box = $('#kvXuatTonBox');
      if (!s) { box.hidden = true; return; }
      box.hidden = false;
      $('#kvXuatTonNhac').innerHTML =
        `Tồn hiện tại: <b>${tienVN(s.ton)} ${esc(s.don_vi)}</b>` +
        (s.theo_doi_hsd && s.han_gan_nhat ? ` · HSD gần nhất ${esc(s.han_gan_nhat.split('-').reverse().join('/'))}` : '');
    });

    $('#kvFormNhap').addEventListener('submit', async ev => {
      ev.preventDefault();
      const oLoi = $('#kvLoiNhap'), oOk = $('#kvOkNhap');
      oLoi.classList.remove('show'); oOk.hidden = true;
      const nut = $('#kvNutNhap'); nut.disabled = true; nut.textContent = 'Đang lưu…';
      try {
        await API.khoNhap({
          san_pham_id: $('#kvNhapSP').value,
          so_luong: $('#kvNhapSL').value,
          don_gia: $('#kvNhapGia').value,
          so_lo: $('#kvNhapLo').value,
          han_su_dung: $('#kvNhapHsd').value,
          doi_tac: $('#kvNhapNCC').value,
          ghi_chu: $('#kvNhapGhiChu').value
        });
        $('#kvFormNhap').reset();
        oOk.textContent = '✓ Đã nhập kho. Tồn đã cập nhật.'; oOk.hidden = false;
        await taiLai();
      } catch (err) {
        oLoi.textContent = err.message; oLoi.classList.add('show');
      } finally {
        nut.disabled = false; nut.textContent = 'Nhập kho';
      }
    });

    /* ---- Xuất kho ---- */
    $('#kvFormXuat').addEventListener('submit', async ev => {
      ev.preventDefault();
      const oLoi = $('#kvLoiXuat'), oOk = $('#kvOkXuat');
      oLoi.classList.remove('show'); oOk.hidden = true;
      const nut = $('#kvNutXuat'); nut.disabled = true; nut.textContent = 'Đang lưu…';
      try {
        const kq = await API.khoXuat({
          san_pham_id: $('#kvXuatSP').value,
          so_luong: $('#kvXuatSL').value,
          doi_tac: $('#kvXuatKenh').value,
          ghi_chu: $('#kvXuatGhiChu').value
        });
        $('#kvFormXuat').reset();
        $('#kvXuatTonBox').hidden = true;
        oOk.textContent = '✓ Đã xuất kho theo lô cận hạn nhất (FEFO).'; oOk.hidden = false;
        await taiLai();
      } catch (err) {
        oLoi.textContent = err.message; oLoi.classList.add('show');
      } finally {
        nut.disabled = false; nut.textContent = 'Xuất kho';
      }
    });
  }

  /* ---- Thêm mã hàng (chỉ quản lý kho) ---- */
  if (qKho.quan_ly) {
    $('#kvFormThemSP').addEventListener('submit', async ev => {
      ev.preventDefault();
      const oLoi = $('#kvLoiThemSP');
      oLoi.classList.remove('show');
      const nut = $('#kvNutThemSP'); nut.disabled = true; nut.textContent = 'Đang lưu…';
      try {
        await API.khoThemSanPham({
          ma_sku: $('#kvSku').value,
          ten: $('#kvTenSP').value,
          danh_muc: $('#kvDanhMuc').value,
          don_vi: $('#kvDonVi').value,
          ton_toi_thieu: $('#kvTonMin').value,
          theo_doi_hsd: $('#kvTheoDoiHsd').checked
        });
        $('#kvFormThemSP').reset();
        $('#kvTheoDoiHsd').checked = true;
        await taiLai();
      } catch (err) {
        oLoi.textContent = err.message; oLoi.classList.add('show');
      } finally {
        nut.disabled = false; nut.textContent = 'Thêm mã hàng';
      }
    });
  }

  /* ---- Báo cáo Xuất-Nhập-Tồn ---- */
  const now = new Date();
  $('#kvBcTu').value = ngayISO(new Date(now.getFullYear(), now.getMonth(), 1));
  $('#kvBcDen').value = ngayISO(now);

  $('#kvFormBaoCao').addEventListener('submit', async ev => {
    ev.preventDefault();
    const nut = $('#kvNutBaoCao'); nut.disabled = true; nut.textContent = 'Đang tính…';
    try {
      const { bang } = await API.khoBaoCao($('#kvBcTu').value, $('#kvBcDen').value);
      veBang('#kv-bc-bang', bang, r =>
        `<td><div class="nm">${esc(r.ten)}</div></td>` +
        `<td class="sm">${esc(r.ma_sku)}</td>` +
        `<td class="num">${esc(tienVN(r.ton_dau))}</td>` +
        `<td class="num" style="color:var(--sage,#3f6b3f)">+${esc(tienVN(r.nhap))}</td>` +
        `<td class="num" style="color:#b3462f">-${esc(tienVN(r.xuat))}</td>` +
        `<td class="num"><b>${esc(tienVN(r.ton_cuoi))}</b></td>`);
      $('#kv-bc-trong').hidden = bang.length > 0;
    } catch (err) {
      alert(err.message);
    } finally {
      nut.disabled = false; nut.textContent = 'Xem báo cáo';
    }
  });
}

/* ==========================================================================
   ĐƠN HOÀN — Shopee
   ========================================================================== */
async function khoiDongDonHoan() {

  /* Danh sách đơn hoàn dùng chung — Nguồn + mã vận đơn + tìm kiếm + quẹt QR */
  let DS_DH = [];
  function veBangDH(tuKhoa) {
    const k = boDau((tuKhoa || '').trim());
    const ds = DS_DH.filter(r => !k ||
      boDau(`${r.return_sn} ${r.order_sn || ''} ${r.ma_van_don || ''} ${r.san_pham_ten || r.san_pham || ''} ${r.san_pham_sku || ''} ${r.nguoi_mua || ''}`).includes(k));
    veBang('#dh-bang', ds, r => {
      const tt = nhanTrangThai(r.trang_thai);
      const tien = r.so_tien != null
        ? tienVN(Math.round(r.so_tien / 100000)) + ' ' + esc(r.tien_te || '')
        : '—';
      const ngTag = r.nguon === 'tiktok'
        ? '<span class="tag mute">TikTok</span>'
        : '<span class="tag sage">Shopee</span>';

      // Cột "Kho nhận": đã nhận → tick + người + giờ; chưa nhận → nút bấm.
      // Quá 12h kể từ khi sàn báo khách gửi về mà chưa nhận → tô đỏ cả hàng.
      let khoTd, cls = '';
      if (r.kho_nhan_luc) {
        khoTd = `<td class="sm"><span class="tag ok">✓ Đã nhận</span>` +
                `<div class="phu">${esc(r.kho_nhan_boi || '')} · ${esc(r.kho_nhan_luc)}</div></td>`;
      } else {
        const qua12h = r.cho_kho_nhan_tu &&
          (Date.now() - Date.parse(r.cho_kho_nhan_tu.replace(' ', 'T'))) / 3600000 >= 12;
        if (qua12h) cls = 'canh-bao';
        const nhac = qua12h ? '<div class="phu canh-bao-chu">Quá 12h!</div>' : '';
        khoTd = `<td style="white-space:nowrap">` +
          `<button type="button" class="btn-nho btn-primary" data-nhan="${esc(r.return_sn)}">Nhận đủ</button> ` +
          `<button type="button" class="btn-nho" data-khieunai="${esc(r.return_sn)}">Cần khiếu nại</button>${nhac}</td>`;
      }

      // Sản phẩm hoàn về: DÒNG TRÊN = tên sản phẩm trên sàn; DÒNG DƯỚI = SKU x số lượng.
      // Dữ liệu cũ chưa tách thì tạm dùng chuỗi gộp san_pham cho tới lần đồng bộ tới.
      const spSku = r.san_pham_sku || '';
      const spTen = r.san_pham_ten || r.san_pham || '—';
      const sl = r.so_luong != null ? r.so_luong : 1;
      const dong2 = spSku ? `${esc(spSku)} x ${sl}` : '';
      const spCell = `<td class="sm" title="${esc(spTen)}">${esc(spTen)}` +
        (dong2 ? `<div class="phu">${dong2}</div>` : '') + `</td>`;
      const slCell = `<td class="num">${r.so_luong != null ? esc(r.so_luong) : '—'}</td>`;

      const html = `<td>${ngTag}</td>` +
        `<td class="sm">${esc(r.return_sn)}</td>` +
        `<td class="sm">${esc(r.order_sn || '—')}</td>` +
        `<td class="sm">${esc(r.ma_van_don || '—')}</td>` +
        spCell +
        slCell +
        `<td><span class="tag ${tt.mau}" title="${esc(r.trang_thai || '')}">${esc(tt.chu)}</span></td>` +
        `<td class="num">${tien}</td>` +
        `<td class="sm">${esc(r.nguoi_mua || '—')}</td>` +
        khoTd;
      return { html, cls };
    });
    $('#dh-trong').hidden = ds.length > 0;
    $('#dh-dem').textContent = `${ds.length}/${DS_DH.length} đơn hoàn`;
  }
  async function veDanhSach() {
    const { don_hoan } = await API.hoanDanhSach();
    DS_DH = don_hoan;
    veBangDH($('#dh-tim').value);
  }
  $('#dh-tim').addEventListener('input', e => veBangDH(e.target.value));

  /* Kho bấm "Nhận đủ" (đóng đơn) hoặc "Cần khiếu nại" (đẩy về Vận hành sàn) */
  $('#dh-bang').addEventListener('click', async (e) => {
    const btnNhan = e.target.closest('[data-nhan]');
    const btnKn = e.target.closest('[data-khieunai]');
    if (!btnNhan && !btnKn) return;
    const btn = btnNhan || btnKn;
    const rsn = btn.getAttribute(btnNhan ? 'data-nhan' : 'data-khieunai');
    let ghiChu = '';
    if (btnKn) {
      const nhap = prompt('Lý do cần khiếu nại (thiếu hàng / hỏng / không đúng mô tả…):', '');
      if (nhap === null) return;   // bấm Huỷ thì thôi
      ghiChu = nhap;
    }
    btn.disabled = true;
    const cu = btn.textContent;
    btn.textContent = 'Đang lưu…';
    try {
      if (btnNhan) await API.hoanDaNhan(rsn);
      else await API.hoanKhieuNai(rsn, ghiChu);
      await veDanhSach();               // tải lại
    } catch (err) {
      btn.disabled = false;
      btn.textContent = cu;
      alert(err.message || 'Không lưu được, thử lại nhé.');
    }
  });

  /* (Đã gỡ khối "Ghép SKU cho sản phẩm chưa có mã" theo yêu cầu Sếp) */

  /* ---- Quẹt QR / mã vạch bằng camera điện thoại (Android + iPhone) ----
     Dùng html5-qrcode — tự chọn bộ quét nhanh nhất của máy, đọc cả mã vạch
     dài (1D) lẫn ô QR (2D). Thư viện chỉ nạp khi bấm nút cho nhẹ trang. */
  const qrModal = $('#qrModalNen');
  let qrDoc = null, qrDangChay = false, qrDaNap = null;

  function napThuVienQR() {
    if (qrDaNap) return qrDaNap;
    qrDaNap = new Promise((ok, loi) => {
      if (window.Html5Qrcode) return ok();
      const s = document.createElement('script');
      s.src = 'assets/js/html5-qrcode.min.js';
      s.onload = () => ok();
      s.onerror = () => loi(new Error('Không nạp được thư viện quẹt QR'));
      document.head.appendChild(s);
    });
    return qrDaNap;
  }

  async function moQuetQR() {
    try { await napThuVienQR(); }
    catch { alert('Không nạp được bộ quẹt QR. Sếp gõ tay mã vào ô tìm kiếm bên cạnh nhé.'); return; }

    qrModal.hidden = false;
    try {
      qrDoc = new Html5Qrcode('qrKhung', { verbose: false });
      qrDangChay = true;
      await qrDoc.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {                    // quét trúng
          $('#dh-tim').value = text;
          veBangDH(text);
          dongQuetQR();
        },
        () => { /* mỗi khung chưa thấy mã — bỏ qua */ }
      );
    } catch (e) {
      dongQuetQR();
      alert('Không mở được camera — kiểm tra đã cho phép quyền camera cho trang này chưa, hoặc gõ tay mã vào ô tìm kiếm.');
    }
  }

  async function dongQuetQR() {
    qrModal.hidden = true;
    if (qrDoc && qrDangChay) {
      qrDangChay = false;
      try { await qrDoc.stop(); } catch {}
      try { await qrDoc.clear(); } catch {}
    }
    qrDoc = null;
  }

  $('#dh-quetqr').addEventListener('click', moQuetQR);
  $('#qrDong').addEventListener('click', dongQuetQR);
  qrModal.addEventListener('click', e => { if (e.target === qrModal) dongQuetQR(); });

  /* Một khối kết nối sàn (dùng cho cả Shopee lẫn TikTok) */
  function dungSan(cfg) {
    const oTrang = $(cfg.trang), oHint = $(cfg.hint);
    const nutKN = $(cfg.ketnoi), nutDB = $(cfg.dongbo);
    const oLoi = $(cfg.loi), oOk = $(cfg.ok);

    // Sàn đá về kèm ?shopee=ok / ?tiktok=ok sau khi ủy quyền xong
    if (new URLSearchParams(location.search).get(cfg.co) === 'ok') {
      oOk.textContent = `✓ Đã kết nối ${cfg.ten} thành công.`; oOk.hidden = false;
    }

    async function veTrangThai() {
      const tt = await cfg.apiTrangThai();
      nutKN.hidden = true; nutDB.hidden = true;
      if (!tt.da_cau_hinh) {
        oTrang.innerHTML = `⏳ <b>Chưa cấu hình khóa ${cfg.ten}</b> trên máy chủ. Khung sẵn sàng — chờ nạp khóa rồi kết nối.`;
        oHint.textContent = 'Chưa cấu hình';
        return;
      }
      if (!tt.da_ket_noi) {
        oTrang.innerHTML = `🔌 <b>Chưa kết nối shop ${cfg.ten}.</b> ` +
          (tt.quyen.quan_ly ? `Bấm “Kết nối ${cfg.ten}” để ủy quyền một lần.` : 'Nhờ Giám đốc bấm kết nối.');
        oHint.textContent = 'Chưa kết nối';
        if (tt.quyen.quan_ly) { nutKN.hidden = false; nutKN.textContent = `Kết nối ${cfg.ten}`; }
        return;
      }
      oTrang.innerHTML = `✅ <b>Đã kết nối shop</b> <code>${esc(tt.shop_id)}</code>` +
        (tt.cap_nhat_luc ? ` · làm mới token: ${esc(tt.cap_nhat_luc)}` : '');
      oHint.textContent = 'Đã kết nối';
      nutDB.hidden = false;
      if (tt.quyen.quan_ly) { nutKN.hidden = false; nutKN.textContent = 'Kết nối lại'; }
    }

    // Kết nối = chuyển trang sang trang ủy quyền của sàn (server trả 302)
    nutKN.addEventListener('click', () => { window.location.href = cfg.duongDanConnect; });

    nutDB.addEventListener('click', async () => {
      oLoi.classList.remove('show'); oOk.hidden = true;
      nutDB.disabled = true; nutDB.textContent = 'Đang đồng bộ…';
      try {
        const kq = await cfg.apiDongBo();
        oOk.textContent = `✓ Đã đồng bộ ${kq.so_don} đơn hoàn ${cfg.ten}.`; oOk.hidden = false;
        await veDanhSach(); await veTrangThai();
      } catch (err) {
        oLoi.textContent = err.message; oLoi.classList.add('show');
      } finally {
        nutDB.disabled = false; nutDB.textContent = 'Đồng bộ đơn hoàn';
      }
    });

    return veTrangThai;
  }

  const veShopee = dungSan({
    ten: 'Shopee', co: 'shopee', duongDanConnect: '/api/shopee/connect',
    trang: '#dh-trangthai', hint: '#dh-tt-hint', ketnoi: '#dh-ketnoi', dongbo: '#dh-dongbo',
    loi: '#dh-loi', ok: '#dh-ok', apiTrangThai: API.shopeeTrangThai, apiDongBo: API.hoanDongBo
  });
  const veTiktok = dungSan({
    ten: 'TikTok', co: 'tiktok', duongDanConnect: '/api/tiktok/connect',
    trang: '#dh-tk-trangthai', hint: '#dh-tk-hint', ketnoi: '#dh-tk-ketnoi', dongbo: '#dh-tk-dongbo',
    loi: '#dh-tk-loi', ok: '#dh-tk-ok', apiTrangThai: API.tiktokTrangThai, apiDongBo: API.tiktokDongBo
  });

  // Danh sách đơn hoàn là phần quan trọng nhất (kho dùng) → load TRƯỚC. Phần
  // kết nối sàn + ghép SKU bọc try/catch để lỗi ở đó không chặn việc hiện danh sách.
  await veDanhSach();
  try { await veShopee(); } catch (e) { console.error('Kết nối Shopee:', e); }
  try { await veTiktok(); } catch (e) { console.error('Kết nối TikTok:', e); }
}

/* -- Kế toán (còn là dữ liệu mẫu) -- */
if (TOI.quyen.includes('ketoan')) {
  veThe('#kt-the', DB.keToan.the);
  veChart('#kt-chart', DB.keToan.chiPhi);
  veDanhSach('#kt-thue', DB.keToan.thue.map(x => ({
    m: x.t === 'Hoàn thành' ? '' : (x.t === 'Đang xử lý' ? 'warn' : 'danger'),
    b: x.b, s: x.s, t: x.t
  })));
  veBang('#kt-bang', DB.keToan.congNo, r =>
    `<td><div class="nm">${esc(r.dt)}</div></td>` +
    `<td><span class="tag ${r.loai === 'Phải thu' ? 'ok' : 'mute'}">${esc(r.loai)}</span></td>` +
    `<td class="num">${esc(r.st)}</td>` +
    `<td class="sm">${esc(r.han)}</td>` +
    `<td><span class="tag ${esc(r.tt)}">${esc(r.ttx)}</span></td>`);
}

/* -- Quản trị (chỉ admin) -- */
if (TOI.quyen.includes('quantri')) {
  const TT_QT = {
    da_ky: 'Đã ký HĐ', thu_viec: 'Thử việc', cho_ky: 'Chờ ký',
    can_trao_doi: 'Cần trao đổi', parttime: 'Parttime'
  };
  let DS_VAI_TRO = [];

  // HCNS thêm được nhân sự nhưng KHÔNG thấy/đặt lương và KHÔNG cấp tài khoản.
  // Ẩn ô lương và cột thao tác cho người không phải admin. (Máy chủ vẫn tự
  // chặn nữa — đây chỉ là cho gọn mắt.)
  if (!TOI.la_admin) {
    const oLuong = document.getElementById('qtFieldLuong');
    if (oLuong) oLuong.remove();
    $('#qtMoTa').textContent = 'Thêm nhân sự mới vào hồ sơ. Việc cấp tài khoản đăng nhập và lương do Giám đốc phụ trách.';
  }

  async function veQuanTri() {
    const { nhan_su, vai_tro } = await API.qtDanhSach();
    DS_VAI_TRO = vai_tro;

    // Đổ ô "quản lý trực tiếp" và các ô chọn vai trò
    const oQuanLy = $('#qtQuanLy');
    oQuanLy.innerHTML = '<option value="">— Không —</option>' +
      nhan_su.filter(n => n.dang_lam).map(n =>
        `<option value="${esc(n.id)}">${esc(n.ho_ten)} — ${esc(n.chuc_vu || '')}</option>`).join('');

    const optVaiTro = vai_tro.map(v => `<option value="${esc(v.ma)}">${esc(v.ten)}</option>`).join('');

    $('#qtDem').textContent = `${nhan_su.length} nhân sự · ${nhan_su.filter(n => n.tai_khoan_id).length} có tài khoản`;

    veBang('#qtBang', nhan_su, n => {
      const coTK = !!n.tai_khoan_id;
      const tenVaiTro = coTK ? (vai_tro.find(v => v.ma === n.vai_tro)?.ten || n.vai_tro) : '';

      // Cột tài khoản
      let cotTK;
      if (!coTK) {
        cotTK = '<span class="tag mute">Chưa có</span>';
      } else if (!n.kich_hoat) {
        cotTK = `<span class="tag danger">Đã khoá</span> <span class="sm">${esc(n.ten_dang_nhap)}</span>`;
      } else {
        cotTK = `<span class="nm">${esc(n.ten_dang_nhap)}</span>` +
                (n.phai_doi_mk ? ' <span class="tag warn">chờ đổi MK</span>' : '');
      }

      // Cột thao tác — chỉ admin mới cấp/khoá/đặt lại tài khoản.
      // HCNS chỉ thấy dấu gạch (máy chủ cũng chặn nếu cố gọi).
      let thaoTac = '<span class="sm">—</span>';
      if (TOI.la_admin) {
        if (!coTK) {
          // Gợi ý tên đăng nhập = số điện thoại (chỉ chữ số); chưa có SĐT thì để trống
          const goiY = String(n.sdt || '').replace(/\D/g, '');
          thaoTac = `<button class="btn-nho btn-primary" data-tao="${esc(n.id)}" data-ten-goi-y="${esc(goiY)}">Tạo tài khoản</button>`;
        } else {
          thaoTac =
            `<button class="btn-nho btn-phu" data-datlai="${n.tai_khoan_id}">Đặt lại MK</button> ` +
            (n.kich_hoat
              ? `<button class="btn-nho btn-phu" data-khoa="${n.tai_khoan_id}" data-kh="0">Khoá</button>`
              : `<button class="btn-nho btn-phu" data-khoa="${n.tai_khoan_id}" data-kh="1">Mở lại</button>`);
        }
      }

      return '' +
        `<td><div class="person"><div class="av">${esc(n.viet_tat)}</div>` +
          `<div><div class="nm">${esc(n.ho_ten)}</div>` +
          `<div class="sm">${esc(n.chuc_vu || TT_QT[n.trang_thai] || '')}</div></div></div></td>` +
        `<td>${esc(n.bo_phan || '—')}</td>` +
        `<td>${cotTK}</td>` +
        `<td class="sm">${esc(tenVaiTro || '—')}</td>` +
        `<td class="qt-thaotac">${thaoTac}</td>`;
    });
  }

  // Thêm nhân sự
  $('#qtFormThem').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#qtLoiThem');
    oLoi.classList.remove('show');
    const nut = $('#qtNutThem');
    nut.disabled = true; nut.textContent = 'Đang lưu…';
    try {
      await API.qtThemNhanSu({
        ho_ten: $('#qtHoTen').value,
        chuc_vu: $('#qtChucVu').value,
        bo_phan: $('#qtBoPhan').value,
        sdt: $('#qtSdt').value,
        email: $('#qtEmail').value,
        quan_ly_id: $('#qtQuanLy').value,
        luong: $('#qtLuong').value
      });
      $('#qtFormThem').reset();
      await veQuanTri();
    } catch (err) {
      oLoi.textContent = err.message; oLoi.classList.add('show');
    } finally {
      nut.disabled = false; nut.textContent = 'Thêm nhân sự';
    }
  });

  // Bấm nút trong bảng (tạo tài khoản / đặt lại / khoá) — gắn một lần, dùng nổi bọt
  $('#qtBang').addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.tao) {
      moHopTaoTaiKhoan(btn.dataset.tao, btn.dataset.tenGoiY);
    } else if (btn.dataset.datlai) {
      if (!confirm('Đặt lại mật khẩu cho tài khoản này? Mật khẩu cũ sẽ hết hiệu lực ngay.')) return;
      btn.disabled = true;
      try {
        const kq = await API.qtDatLaiMatKhau(parseInt(btn.dataset.datlai, 10));
        hienMatKhauTam('Đã đặt lại mật khẩu', kq.ten_dang_nhap, kq.mat_khau_tam);
        await veQuanTri();
      } catch (err) { alert(err.message); btn.disabled = false; }
    } else if (btn.dataset.khoa) {
      const kh = btn.dataset.kh === '1';
      btn.disabled = true;
      try {
        await API.qtKhoaTaiKhoan(parseInt(btn.dataset.khoa, 10), kh);
        await veQuanTri();
      } catch (err) { alert(err.message); btn.disabled = false; }
    }
  });

  // Hộp tạo tài khoản: hỏi tên đăng nhập + vai trò
  function moHopTaoTaiKhoan(nhanSuId, tenGoiY) {
    const ten = prompt('Tên đăng nhập cho nhân viên này\n(dùng số điện thoại của họ):', tenGoiY || '');
    if (ten === null) return;

    const dsMa = DS_VAI_TRO.map((v, i) => `${i + 1}. ${v.ten}`).join('\n');
    const chon = prompt('Vai trò — gõ số:\n' + dsMa, '');
    if (chon === null) return;
    const idx = parseInt(chon, 10) - 1;
    if (!(idx >= 0 && idx < DS_VAI_TRO.length)) { alert('Số vai trò không hợp lệ'); return; }

    API.qtTaoTaiKhoan(nhanSuId, ten.trim(), DS_VAI_TRO[idx].ma)
      .then(async kq => {
        hienMatKhauTam('Đã tạo tài khoản', kq.ten_dang_nhap, kq.mat_khau_tam);
        await veQuanTri();
      })
      .catch(err => alert(err.message));
  }

  // Hộp hiện mật khẩu tạm
  const modalNen = $('#mkModalNen');
  function hienMatKhauTam(tieuDe, ten, mk) {
    $('#mkModalTieuDe').textContent = tieuDe;
    $('#mkModalTen').textContent = ten;
    $('#mkModalMk').textContent = mk;
    modalNen.hidden = false;
  }
  $('#mkModalDong').addEventListener('click', () => { modalNen.hidden = true; });
  $('#mkModalChep').addEventListener('click', async () => {
    const txt = `Đăng nhập: ${$('#mkModalTen').textContent}\nMật khẩu: ${$('#mkModalMk').textContent}`;
    try { await navigator.clipboard.writeText(txt); $('#mkModalChep').textContent = 'Đã chép ✓'; }
    catch { $('#mkModalChep').textContent = 'Hãy chép thủ công'; }
  });

  veQuanTri();
}

/* ---- Mở tab đầu tiên người dùng được xem -------------------------------- */
moTab(TOI.quyen[0]);
