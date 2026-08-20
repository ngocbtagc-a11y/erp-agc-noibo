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
  { id: 'congviec',  ten: 'Trạm Việc',  icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
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

/* Khung tròn avatar — ảnh đại diện (co_anh=true) hoặc chữ viết tắt (mặc
   định). Dùng chung mọi nơi có khung .av (sidebar, Danh bạ, Nhân sự, Vinh
   danh…) — CSS .av lo kích thước/bo tròn, hàm này chỉ quyết định nội dung. */
function avHtml(id, vietTat, coAnh) {
  return coAnh
    ? `<img class="av" src="/api/nhan-su/anh?id=${encodeURIComponent(id)}" alt="">`
    : `<div class="av">${esc(vietTat)}</div>`;
}

/* 22000000 → "22.000.000" */
function tienVN(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('vi-VN');
}

/* Xuất mảng dữ liệu ra file CSV — Excel mở được, dấu tiếng Việt đọc đúng
   nhờ có BOM UTF-8 ở đầu file (thiếu BOM thì Excel tự đoán sai encoding,
   dấu tiếng Việt vỡ chữ). Dùng chung cho mọi bảng có nút "Xuất Excel". */
function xuatCSV(tenFile, cotTieuDe, dsHang) {
  const thoat = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const noiDung = [cotTieuDe, ...dsHang].map(hang => hang.map(thoat).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + noiDung], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = tenFile;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// Đổi unix (giây) -> "dd/mm/yy" — dùng chung nhiều tab (Đối soát, Đơn hoàn...)
function ngayVN(unix) {
  if (!unix) return '';
  const d = new Date(Number(unix) * 1000);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
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
  AWAITING_BUYER_SHIP: { chu: 'Chờ khách gửi hàng', mau: 'warn' },
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
  EXPIRED: 'Hết hạn dùng',
  // Bổ sung 20/08/2026 — rà dữ liệu thật thấy các mã này rơi qua chưa dịch,
  // vẫn hiện tiếng Anh thô (Sếp Ngọc bắt lỗi từ ảnh chụp cột "Lý do").
  BROKEN_PRODUCTS: 'Hàng vỡ/hỏng',
  CHANGE_MIND: 'Đổi ý',
  DAMAGED_OTHERS: 'Hàng hư hỏng (khác)',
  DIFFERENT_DESCRIPTION: 'Không đúng mô tả',
  EXPIRED_PRODUCT: 'Hết hạn dùng',
  FUNCTIONAL_DMG: 'Lỗi chức năng',
  ITEM_FAKE: 'Hàng giả/nhái',
  ITEM_MISSING: 'Thiếu hàng',
  NOT_RECEIPT: 'Chưa nhận được hàng',
  OUTER_DAMAGED_PACKAGE: 'Bao bì ngoài bị hỏng',
  SPILLED_CONTENTS: 'Hàng bị đổ/tràn',
  USED: 'Hàng đã qua sử dụng',
  WRONG_ADDRESS: 'Sai địa chỉ giao hàng',
  WRONG_ORDER_INFO: 'Sai thông tin đơn hàng'
};
/* Mã lý do của TikTok/Shopee thường dài (vd ecom_order_delivered_refund_and_
   return_reason_damaged) → dịch theo TỪ KHÓA cho bền, không phải liệt kê từng mã. */
const LY_DO_KHOA = [
  [/not_received|not_delivered|never_received/, 'Chưa nhận được hàng'],
  [/not_match|not_as_described/,          'Không đúng mô tả'],
  [/wrong_product|wrong_item|sent_wrong/, 'Giao sai hàng'],
  [/missing/,                             'Thiếu hàng'],
  [/buy_now_refund_later|refund_later|sample/, 'Hoàn mẫu (mua trước trả sau)'],
  [/damaged/,                             'Hàng hư hỏng'],
  [/defective/,                           'Hàng lỗi'],
  [/poor_quality|quality/,                'Chất lượng kém'],
  [/counterfeit|fake/,                    'Nghi hàng giả/nhái'],
  [/empty_(box|parcel|package)|empty.*box|no.*item.*inside/, 'Hộp hàng rỗng'],
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
  // Mã lạ chưa map → cắt bỏ tiền tố/hậu tố dài của sàn, chỉ giữ phần nghĩa
  let g = low
    .replace(/^ecom_order_(delivered_refund(_and_return)?|to_ship_canceled)_reason_/, '')
    .replace(/^(system_refund_|buyer_return_and_refund_)/, '')
    .replace(/_rts_ro$/, '')
    .replace(/_/g, ' ')
    .trim();
  g = g.charAt(0).toUpperCase() + g.slice(1);
  return g.length > 34 ? g.slice(0, 34) + '…' : g;
}

/* Lý do NGHIÊM TRỌNG (nghi hàng giả/nhái, hộp hàng rỗng) — cùng mẫu regex
   với backend (index.js: LY_DO_NGHIEM_TRONG_RE), sửa 1 bên nhớ soát bên
   kia. Máy chủ đã tự gửi thông báo/Telegram; đây chỉ thêm dấu đỏ ngay
   trên bảng để KHÔNG PHẢI mở chuông mới thấy (Sếp Ngọc yêu cầu 20/08/2026). */
const LY_DO_NGHIEM_TRONG_RE = /counterfeit|fake|empty_(box|parcel|package)/i;
function oLyDo(s) {
  const chu = nhanLyDo(s);
  if (!s || !LY_DO_NGHIEM_TRONG_RE.test(s)) return esc(chu);
  return `<span class="tag danger" title="${esc(s)}">🚨 ${esc(chu)}</span>`;
}

/* Ô "Sản phẩm hoàn về" dùng chung cho Kho vận / Cần đối soát / Kế toán tra soát.
   1 đơn hoàn có thể gồm nhiều sản phẩm — san_pham_ten/san_pham_sku lưu nối
   nhau bằng " | " (xem shopee.js, tiktok.js). Nhiều sản phẩm thì mỗi sản
   phẩm xuống 1 dòng riêng cho dễ theo dõi (Sếp Ngọc chốt), thay vì dồn hết
   vào 1 dòng dài khó đọc. Ghép đúng SKU theo từng sản phẩm khi số lượng tên
   và số lượng SKU khớp nhau; lệch số lượng (dữ liệu cũ/thiếu) thì liệt kê
   SKU chung 1 dòng bên dưới cho an toàn, khỏi ghép nhầm tên với SKU. */
function oSanPham(spTenRaw, spSkuRaw, soLuong) {
  const tenArr = String(spTenRaw || '').split(' | ').filter(Boolean);
  const skuArr = String(spSkuRaw || '').split(' | ').filter(Boolean);
  if (!tenArr.length) return { html: '—', title: '' };

  if (tenArr.length === 1) {
    const dong2 = skuArr[0]
      ? `${esc(skuArr[0])}${soLuong != null ? ' x ' + esc(soLuong) : ''}` : '';
    return {
      html: esc(tenArr[0]) + (dong2 ? `<div class="phu">${dong2}</div>` : ''),
      title: tenArr[0]
    };
  }

  const khopSku = skuArr.length === tenArr.length;
  const dongTen = tenArr.map((ten, i) => {
    const sku = khopSku ? skuArr[i] : '';
    return `<div${i > 0 ? ' style="margin-top:4px"' : ''}>${esc(ten)}` +
      (sku ? `<div class="phu">${esc(sku)}</div>` : '') + `</div>`;
  }).join('');
  const skuChungDong = (!khopSku && skuArr.length)
    ? `<div class="phu" style="margin-top:4px">SKU: ${esc(skuArr.join(', '))}</div>` : '';
  return { html: dongTen + skuChungDong, title: tenArr.join(' | ') };
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

/* Nén ảnh về hình vuông nhỏ (canvas, cắt giữa kiểu object-fit:cover) trước
   khi gửi lên — máy chủ chỉ lưu base64 thẳng vào DB, không tự nén được. */
function nenAnhVuong(file, kichThuoc = 200) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = kichThuoc; canvas.height = kichThuoc;
      const ctx = canvas.getContext('2d');
      const canh = Math.min(img.width, img.height);
      const sx = (img.width - canh) / 2, sy = (img.height - canh) / 2;
      ctx.drawImage(img, sx, sy, canh, canh, 0, 0, kichThuoc, kichThuoc);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này')); };
    img.src = url;
  });
}

function veAvatarSidebar(capNhat) {
  const wrap = $('#uAvWrap');
  wrap.querySelector('.av')?.remove();
  const html = TOI.co_anh
    ? `<img class="av" id="uAv" src="/api/nhan-su/anh?id=${encodeURIComponent(TOI.id)}${capNhat ? '&v=' + Date.now() : ''}" alt="">`
    : `<div class="av" id="uAv">${esc(TOI.viet_tat)}</div>`;
  wrap.insertAdjacentHTML('afterbegin', html);
}
veAvatarSidebar();

$('#uAvWrap').addEventListener('click', () => $('#uAvFile').click());
$('#uAvFile').addEventListener('change', async () => {
  const f = $('#uAvFile').files[0];
  if (!f) return;
  try {
    const anh = await nenAnhVuong(f, 200);
    await API.nsAnhDaiDien(anh);
    TOI.co_anh = true;
    veAvatarSidebar(true);
  } catch (err) {
    alert(err.message || 'Không đổi được ảnh, thử lại nhé.');
  } finally {
    $('#uAvFile').value = '';
  }
});

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
await khoiDongVinhDanh();

/* -- Danh bạ (máy chủ thật) -- */
if (TOI.quyen.includes('danhba')) {
  const { danh_ba } = await API.danhBa();

  const veDanhBa = (tuKhoa) => {
    const k = boDau((tuKhoa || '').trim());
    const ds = danh_ba.filter(n => !k ||
      boDau(`${n.ho_ten} ${n.chuc_vu} ${n.bo_phan} ${n.sdt} ${n.email}`).includes(k));

    // Nút "Chat ngay" mở chat riêng (DM) — chỉ hiện nếu có kênh chat và
    // không phải chính mình (tự chat với mình thì vô nghĩa).
    const coChat = TOI.quyen.includes('chat');

    veBang('#db-bang', ds, n =>
      `<td><div class="person">${avHtml(n.id, n.viet_tat, n.co_anh)}` +
        `<div><div class="nm">${esc(n.ho_ten)}</div>` +
        `<div class="sm">${esc(n.chuc_vu)}</div></div></div></td>` +
      `<td>${esc(n.bo_phan)}</td>` +
      `<td><a class="lnk" href="tel:${esc(String(n.sdt || '').replace(/\s/g, ''))}">${esc(n.sdt || '—')}</a></td>` +
      `<td><a class="lnk" href="mailto:${esc(n.email)}">${esc(n.email || '—')}</a></td>` +
      `<td class="sm">${esc(n.quan_ly || '—')}</td>` +
      `<td>${(coChat && n.id !== TOI.id)
        ? `<button type="button" class="btn-nho" data-chatngay="${esc(n.id)}" data-ten="${esc(n.ho_ten)}" data-vt="${esc(n.viet_tat)}">Chat ngay</button>`
        : ''}</td>`);

    $('#db-trong').hidden = ds.length > 0;
    $('#db-dem').textContent = `${ds.length}/${danh_ba.length} người`;
  };

  veDanhBa('');
  $('#db-tim').addEventListener('input', e => veDanhBa(e.target.value));

  $('#db-bang').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-chatngay]');
    if (!btn) return;
    window.moChatVoi?.(btn.getAttribute('data-chatngay'), btn.getAttribute('data-ten'), btn.getAttribute('data-vt'));
  });
}

/* -- Trạm Việc: giao việc cho nhân viên (máy chủ thật) -- */
if (TOI.quyen.includes('congviec')) {
  await khoiDongCongViec();
}

/* -- Chat nội bộ (máy chủ thật) -- */
if (TOI.quyen.includes('chat')) {
  await khoiDongChat();
}

/* ==========================================================================
   VINH DANH (Tổng quan) — bảng khen ngợi nhỏ, ai mở ERP cũng thấy.
   ========================================================================== */

// "Vừa xong" / "5 phút trước" / "2 giờ trước" / "hôm qua" — chỉ dùng nội bộ
// cho khu Vinh danh (danh sách chat/thông báo khác đã có kiểu hiện giờ riêng)
function thoiGianTruoc(chuoi) {
  if (!chuoi) return '';
  // Chuỗi từ máy chủ là giờ VN "trần trụi" (datetime('now','+7 hours'), không
  // có 'Z'/múi giờ) — PHẢI ép đọc là UTC (thêm 'Z') để khớp với gioNay bên
  // dưới, không thì Date.parse tự đoán theo múi giờ HỆ ĐIỀU HÀNH trình duyệt,
  // sai lệch tuỳ máy (bắt được lỗi này khi tự test: hiện "7 giờ trước" cho
  // tin vừa gửi xong, trên máy có múi giờ hệ thống UTC+7).
  const luc = Date.parse(chuoi.replace(' ', 'T') + 'Z');
  const gioNay = Date.now() + 7 * 3600 * 1000;
  const phut = Math.max(0, Math.round((gioNay - luc) / 60000));
  if (phut < 1) return 'vừa xong';
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.round(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  return `${Math.round(gio / 24)} ngày trước`;
}

async function khoiDongVinhDanh() {
  const { danh_ba } = await API.danhBa();
  const chonNguoi = $('#vd-nguoi');
  danh_ba.forEach(n => {
    const o = document.createElement('option');
    o.value = n.id; o.textContent = n.ho_ten;
    chonNguoi.appendChild(o);
  });

  // Nút mở/đóng đổi chữ theo trạng thái — trước đây chữ đứng yên "+ Khen ai
  // đó" dù form đang mở, không ai biết bấm lại là đóng được (Sếp Ngọc bắt lỗi
  // 20/08/2026: "mở ra xong ko đóng được vào à"). Thêm cả nút "Hủy" trong
  // form cho chắc, khỏi phải đoán bấm lại nút mở.
  const nutMoVd = $('#vd-nut-mo');
  function dongMoFormVd(hienForm) {
    $('#vd-form-body').hidden = !hienForm;
    nutMoVd.textContent = hienForm ? '✕ Đóng' : '+ Khen ai đó';
  }
  nutMoVd.addEventListener('click', () => dongMoFormVd($('#vd-form-body').hidden));
  $('#vd-nut-huy').addEventListener('click', () => {
    $('#vd-form').reset();
    dongMoFormVd(false);
  });

  async function taiLai() {
    let kq;
    try { kq = await API.vdDanhSach(); } catch { return; }
    const ds = kq.vinh_danh || [];

    const goiYBody = $('#vd-goiy-body');
    if (kq.goi_y && kq.goi_y.so_viec > 0) {
      goiYBody.hidden = false;
      $('#vd-goiy').innerHTML =
        `💡 <span>${esc(kq.goi_y.nguoi_nhan_ten)} vừa hoàn thành ${kq.goi_y.so_viec} việc ở Trạm Việc tuần này</span>` +
        `<button type="button" class="btn-nho" id="vd-goiy-nut">Vinh danh luôn</button>`;
      $('#vd-goiy-nut').addEventListener('click', () => {
        dongMoFormVd(true);
        chonNguoi.value = kq.goi_y.nguoi_nhan_id;
        $('#vd-noidung').value = `Hoàn thành ${kq.goi_y.so_viec} việc ở Trạm Việc tuần này, làm tốt lắm!`;
        $('#vd-noidung').focus();
      });
    } else {
      goiYBody.hidden = true;
    }

    const list = $('#vd-list');
    list.innerHTML = ds.map(r => `
      <div class="vd-item person">
        ${avHtml(r.nhan_su_id, (r.nhan_su_ten || '?').trim().split(/\s+/).slice(-2).map(t => t[0]).join('').toUpperCase(), r.co_anh)}
        <div style="flex:1">
          <div class="nm">${esc(r.nhan_su_ten)}` +
            ` <span class="tag warn" title="Vừa được tặng lần này">+${esc(r.so_sao ?? 1)} ⭐</span>` +
            ` <span class="tag sage" title="Tổng sao tích luỹ, dùng đổi quà">⭐ ${esc(r.sao ?? 0)} tổng</span></div>
          <div class="vd-noidung">${esc(r.noi_dung)}</div>
          <div class="sm">— ${esc(r.nguoi_gui_ten)} · ${thoiGianTruoc(r.tao_luc)}</div>
        </div>
      </div>
    `).join('');
    $('#vd-trong').hidden = ds.length > 0;
  }

  $('#vd-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#vd-loi').textContent = '';
    const nut = $('#vd-nut-gui');
    nut.disabled = true;
    try {
      await API.vdGui(chonNguoi.value, $('#vd-noidung').value.trim(), parseInt($('#vd-so-sao').value, 10));
      $('#vd-form').reset();
      dongMoFormVd(false);
      await taiLai();
    } catch (err) {
      $('#vd-loi').textContent = err.message || 'Không gửi được, thử lại nhé.';
    } finally {
      nut.disabled = false;
    }
  });

  await taiLai();
}

/* ==========================================================================
   TRẠM VIỆC — giao việc cho nhân viên. Theo tinh thần MBOs (quản lý theo mục
   tiêu): mỗi việc BẮT BUỘC có "đầu ra cụ thể", không chỉ mô tả làm gì.
   Luồng trạng thái: moi -> dang_lam -> cho_duyet -> hoan_thanh (hoặc huy).
   ========================================================================== */
const CV_TRANG_THAI = {
  moi:        { chu: 'Mới giao',    mau: 'mute' },
  dang_lam:   { chu: 'Đang làm',    mau: 'warn' },
  cho_duyet:  { chu: 'Chờ duyệt',   mau: 'sage' },
  hoan_thanh: { chu: 'Hoàn thành',  mau: 'ok' },
  huy:        { chu: 'Đã huỷ',      mau: 'danger' }
};

async function khoiDongCongViec() {
  const { danh_ba } = await API.danhBa();
  const chonNguoiNhan = $('#cv-nguoi-nhan');
  danh_ba.filter(n => n.id !== TOI.id).forEach(n => {
    const o = document.createElement('option');
    o.value = n.id; o.textContent = `${n.ho_ten} — ${n.chuc_vu || ''}`;
    chonNguoiNhan.appendChild(o);
  });

  // Ẩn/hiện form giao việc — đổi chữ nút theo trạng thái + có nút "Hủy" riêng
  // trong form, cùng lỗi/cùng sửa với Vinh danh (Sếp Ngọc bắt lỗi 20/08/2026).
  const nutMoCv = $('#cv-nut-mo-form');
  function dongMoFormCv(hienForm) {
    $('#cv-form-body').hidden = !hienForm;
    nutMoCv.textContent = hienForm ? '✕ Đóng' : '+ Giao việc mới';
  }
  nutMoCv.addEventListener('click', () => dongMoFormCv($('#cv-form-body').hidden));
  $('#cv-nut-huy').addEventListener('click', () => {
    $('#cv-form').reset();
    dongMoFormCv(false);
  });

  // Chuyển màn Việc tôi nhận / Việc tôi giao
  $('#cvSeg').addEventListener('click', (e) => {
    const nut = e.target.closest('.seg-nut');
    if (!nut) return;
    document.querySelectorAll('#cvSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    ['nhan', 'giao'].forEach(k => {
      const pane = document.getElementById('cv-pane-' + k);
      if (pane) pane.hidden = (k !== nut.dataset.cv);
    });
  });

  function dongHan(hanChot) {
    if (!hanChot) return '—';
    const quaHan = hanChot < new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const [nam, thang, ngay] = hanChot.split('-');
    return `<span class="${quaHan ? 'canh-bao-chu' : ''}">${ngay}/${thang}/${nam}</span>`;
  }

  async function taiLai() {
    let kq;
    try { kq = await API.cvDanhSach(); } catch { return; }

    veBang('#cv-bang-nhan', kq.nhan || [], r => {
      const tt = CV_TRANG_THAI[r.trang_thai] || CV_TRANG_THAI.moi;
      let nut = '';
      if (r.trang_thai === 'moi') nut = `<button type="button" class="btn-nho btn-primary" data-cv-batdau="${r.id}">Bắt đầu làm</button>`;
      else if (r.trang_thai === 'dang_lam') nut = `<button type="button" class="btn-nho btn-primary" data-cv-nop="${r.id}">Nộp kết quả</button>`;
      return `<td><div class="nm">${esc(r.tieu_de)}</div>${r.mo_ta ? `<div class="sm">${esc(r.mo_ta)}</div>` : ''}${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${esc(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm">${esc(r.dau_ra)}</td>` +
        `<td class="sm">${esc(r.nguoi_giao_ten)}</td>` +
        `<td class="sm">${dongHan(r.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>` +
        `<td style="white-space:nowrap">${nut}</td>`;
    });
    $('#cv-trong-nhan').hidden = (kq.nhan || []).length > 0;

    veBang('#cv-bang-giao', kq.giao || [], r => {
      const tt = CV_TRANG_THAI[r.trang_thai] || CV_TRANG_THAI.moi;
      let nut = '';
      if (r.trang_thai === 'cho_duyet') {
        nut = `<button type="button" class="btn-nho btn-primary" data-cv-duyet="${r.id}">Duyệt xong</button> ` +
              `<button type="button" class="btn-nho" data-cv-tralai="${r.id}">Trả lại</button>`;
      }
      if (r.trang_thai === 'moi' || r.trang_thai === 'dang_lam' || r.trang_thai === 'cho_duyet') {
        nut += ` <button type="button" class="btn-nho" data-cv-huy="${r.id}">Huỷ</button>`;
      }
      return `<td><div class="nm">${esc(r.tieu_de)}</div>${r.mo_ta ? `<div class="sm">${esc(r.mo_ta)}</div>` : ''}${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${esc(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm">${esc(r.dau_ra)}</td>` +
        `<td class="sm">${esc(r.nguoi_nhan_ten)}</td>` +
        `<td class="sm">${dongHan(r.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>` +
        `<td style="white-space:nowrap">${nut}</td>`;
    });
    $('#cv-trong-giao').hidden = (kq.giao || []).length > 0;
  }

  $('#cv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#cv-loi').textContent = '';
    const nut = $('#cv-nut-luu');
    nut.disabled = true;
    try {
      await API.cvTao({
        nguoi_nhan_id: chonNguoiNhan.value,
        tieu_de: $('#cv-tieu-de').value.trim(),
        dau_ra: $('#cv-dau-ra').value.trim(),
        mo_ta: $('#cv-mo-ta').value.trim(),
        han_chot: $('#cv-han-chot').value || null
      });
      $('#cv-form').reset();
      dongMoFormCv(false);
      await taiLai();
    } catch (err) {
      $('#cv-loi').textContent = err.message || 'Không giao được việc, thử lại nhé.';
    } finally {
      nut.disabled = false;
    }
  });

  async function xuLyNut(e) {
    const nutBatDau = e.target.closest('[data-cv-batdau]');
    const nutNop = e.target.closest('[data-cv-nop]');
    const nutDuyet = e.target.closest('[data-cv-duyet]');
    const nutTraLai = e.target.closest('[data-cv-tralai]');
    const nutHuy = e.target.closest('[data-cv-huy]');
    const btn = nutBatDau || nutNop || nutDuyet || nutTraLai || nutHuy;
    if (!btn) return;

    let id, trangThai, ketQua;
    if (nutBatDau) { id = btn.getAttribute('data-cv-batdau'); trangThai = 'dang_lam'; }
    else if (nutNop) {
      id = btn.getAttribute('data-cv-nop'); trangThai = 'cho_duyet';
      const nhap = prompt('Kết quả thực tế đạt được (so với đầu ra đã giao):', '');
      if (nhap === null) return;
      if (!nhap.trim()) { alert('Cần điền kết quả trước khi nộp.'); return; }
      ketQua = nhap.trim();
    }
    else if (nutDuyet) { id = btn.getAttribute('data-cv-duyet'); trangThai = 'hoan_thanh'; }
    else if (nutTraLai) {
      id = btn.getAttribute('data-cv-tralai'); trangThai = 'dang_lam';
      if (!confirm('Trả việc lại cho nhân viên làm tiếp?')) return;
    }
    else if (nutHuy) {
      id = btn.getAttribute('data-cv-huy'); trangThai = 'huy';
      if (!confirm('Huỷ việc này?')) return;
    }

    btn.disabled = true;
    try {
      await API.cvCapNhat(id, trangThai, ketQua);
      await taiLai();
    } catch (err) {
      alert(err.message || 'Không lưu được, thử lại nhé.');
      btn.disabled = false;
    }
  }
  $('#cv-bang-nhan').addEventListener('click', xuLyNut);
  $('#cv-bang-giao').addEventListener('click', xuLyNut);

  await taiLai();
}

/* ==========================================================================
   CHAT NỘI BỘ — bong bóng nổi góc phải dưới (kiểu Messenger). Kênh chung +
   chat riêng (DM) từng người — bấm "Chat ngay" ở Danh bạ (window.moChatVoi)
   để mở đúng luồng riêng với người đó. Tự hỏi lại (poll) mỗi vài giây.
   ========================================================================== */
async function khoiDongChat() {
  const widget = $('#cnbWidget'), nutMo = $('#cnbNut'), popup = $('#cnbPopup'),
        nutDong = $('#cnbDong'), nutLui = $('#cnbLui'), badge = $('#cnbBadge'),
        dauTen = $('#cnbDauTen'), dauPhu = $('#cnbDauPhu'), ganDayEl = $('#cnbGanDay');
  const khung = $('#chat-khung');
  if (!widget) return;
  widget.hidden = false;

  let idCuoi = 0;
  let idMocToanCuc = 0;   // mốc "đã biết tới đâu" TÍNH TRÊN MỌI luồng (không riêng luồng đang mở) — dùng cho huy hiệu
  let tepDangChon = null;
  let nguoiNhanHienTai = null;    // null = kênh chung; {id, ten, viet_tat} = đang chat riêng
  let dangMo = false;
  let chuaDoc = 0;

  // Đổi giờ VN "YYYY-MM-DD HH:MM:SS" -> "HH:MM" (hôm nay) hoặc "dd/mm HH:MM"
  function gioChat(chuoi) {
    if (!chuoi) return '';
    const [ngay, gio] = chuoi.split(' ');
    const homNay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const hhmm = (gio || '').slice(0, 5);
    if (ngay === homNay) return hhmm;
    const [, thang, ng] = ngay.split('-');
    return `${ng}/${thang} ${hhmm}`;
  }

  function dinhDangCo(byte) {
    if (byte == null) return '';
    if (byte < 1024) return byte + ' B';
    if (byte < 1024 * 1024) return (byte / 1024).toFixed(0) + ' KB';
    return (byte / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Kiểu Messenger: tin liên tiếp CÙNG người, cách nhau dưới 5 phút thì gộp
  // cụm — chỉ hiện avatar/tên ở tin ĐẦU cụm, các tin sau nằm sát nhau.
  let nguoiGuiTruoc = null, taoLucTruoc = null;

  function themTin(t) {
    const cuaToi = t.nguoi_gui_id === TOI.id;
    const gop = t.nguoi_gui_id === nguoiGuiTruoc &&
      taoLucTruoc && (Date.parse(t.tao_luc.replace(' ', 'T')) - Date.parse(taoLucTruoc.replace(' ', 'T'))) < 5 * 60000;
    nguoiGuiTruoc = t.nguoi_gui_id; taoLucTruoc = t.tao_luc;

    const div = document.createElement('div');
    div.className = 'chat-tin' + (cuaToi ? ' chat-cua-toi' : '') + (gop ? ' chat-gop' : '');

    let noiDungHtml = t.noi_dung ? `<div class="chat-bong">${esc(t.noi_dung)}</div>` : '';
    if (t.tep_ten) {
      const laAnh = (t.tep_loai || '').startsWith('image/');
      const url = `/api/chat/tep?id=${t.id}`;
      noiDungHtml += laAnh
        ? `<img class="chat-anh" src="${esc(url)}" alt="${esc(t.tep_ten)}" onclick="window.open('${esc(url)}','_blank')">`
        : `<a class="chat-tep-card" href="${esc(url)}" target="_blank" rel="noopener">` +
            `📎 <span>${esc(t.tep_ten)}<div class="sm">${dinhDangCo(t.tep_kich_thuoc)}</div></span></a>`;
    }

    // Avatar chỉ hiện ở tin đầu cụm — tin gộp sau đó để trống (không lặp lại)
    const avtHtml = (cuaToi || gop)
      ? `<div class="chat-avt chat-avt-rong"></div>`
      : `<div class="chat-avt">${esc(t.nguoi_gui_viet_tat)}</div>`;

    div.innerHTML =
      avtHtml +
      `<div class="chat-noi">` +
        `<div class="chat-ten">${esc(t.nguoi_gui_ten)}</div>` +
        noiDungHtml +
        `<div class="chat-gio-canh">${esc(gioChat(t.tao_luc))}</div>` +
      `</div>`;
    khung.appendChild(div);
    idCuoi = Math.max(idCuoi, t.id);
  }

  function cuoiTrang() { khung.scrollTop = khung.scrollHeight; }

  function veTieuDe() {
    if (nguoiNhanHienTai) {
      dauTen.textContent = '💬 ' + nguoiNhanHienTai.ten;
      dauPhu.textContent = 'Chat riêng';
      nutLui.hidden = false;
    } else {
      dauTen.textContent = '💬 Kênh chung';
      dauPhu.textContent = '';
      nutLui.hidden = true;
    }
  }

  function veBadge() {
    if (chuaDoc > 0 && !dangMo) { badge.textContent = chuaDoc > 99 ? '99+' : chuaDoc; badge.hidden = false; }
    else badge.hidden = true;
  }

  // Tải lại từ đầu — dùng khi mở popup lần đầu HOẶC vừa đổi cuộc trò chuyện
  async function taiLanDau() {
    khung.querySelectorAll('.chat-tin').forEach(el => el.remove());   // giữ lại #chat-trong (nằm trong khung)
    idCuoi = 0;
    nguoiGuiTruoc = null; taoLucTruoc = null;
    const { tin_nhan } = await API.chatDanhSach(null, nguoiNhanHienTai?.id);
    $('#chat-trong').hidden = tin_nhan.length > 0;
    tin_nhan.forEach(t => themTin(t));
    cuoiTrang();
  }

  async function hoiTinMoi() {
    try {
      const { tin_nhan } = await API.chatDanhSach(idCuoi, nguoiNhanHienTai?.id);
      if (tin_nhan.length) {
        const oDay = khung.scrollHeight - khung.scrollTop - khung.clientHeight < 80;
        tin_nhan.forEach(t => themTin(t));
        $('#chat-trong').hidden = true;
        if (oDay) cuoiTrang();   // chỉ tự cuộn nếu đang xem gần cuối, khỏi giật khi đọc tin cũ
      }
    } catch { /* mất mạng tạm thời — bỏ qua, đợt hỏi sau tự thử lại */ }
  }

  /* Huy hiệu chưa đọc: kiểm tra TOÀN BỘ luồng (kênh chung + mọi chat riêng
     gửi tới tôi), không chỉ luồng đang mở trên widget — nếu không thì ai
     đang xem kênh chung (hay đang đóng popup) sẽ không hề hay biết có tin
     nhắn riêng mới gửi tới. */
  async function hoiChuaDocToanCuc() {
    try {
      const { so_luong, id_lon_nhat } = await API.chatChuaDoc(idMocToanCuc);
      if (so_luong > 0 && !dangMo) { chuaDoc += so_luong; veBadge(); }
      if (so_luong > 0) veGanDay();   // có tin mới thì đối tác đó cũng cần nổi/lên đầu danh sách
      idMocToanCuc = Math.max(idMocToanCuc, id_lon_nhat);
    } catch { /* mất mạng tạm thời — bỏ qua, đợt hỏi sau tự thử lại */ }
  }

  // Bong bóng truy cập nhanh các chat riêng gần đây, cạnh nút chính
  async function veGanDay() {
    try {
      const { gan_day } = await API.chatGanDay();
      ganDayEl.innerHTML = (gan_day || []).map(p =>
        `<button type="button" class="cnb-gd-item" title="${esc(p.ho_ten)}" data-ganday="${esc(p.id)}" data-ten="${esc(p.ho_ten)}" data-vt="${esc(p.viet_tat)}">${esc(p.viet_tat)}</button>`
      ).join('');
    } catch { /* mất mạng tạm thời — bỏ qua, đợt hỏi sau tự thử lại */ }
  }
  ganDayEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ganday]');
    if (!btn) return;
    e.stopPropagation();
    window.moChatVoi?.(btn.getAttribute('data-ganday'), btn.getAttribute('data-ten'), btn.getAttribute('data-vt'));
  });

  await taiLanDau();
  await hoiChuaDocToanCuc();   // lấy mốc ban đầu, KHÔNG tính lịch sử cũ là "mới" ngay lúc vừa mở trang
  await veGanDay();
  setInterval(hoiTinMoi, 6000);
  setInterval(hoiChuaDocToanCuc, 6000);

  /* ---- Mở / đóng popup (giống hệt cách chuông thông báo làm) ----
     boQuaClickKeTiep: nút "Chat ngay" ở Danh bạ (hay bất kỳ nút nào bên
     ngoài widget sau này) không tự stopPropagation() được — click đó nổi
     bọt lên document và bị coi là "click ra ngoài" nên đóng popup ngay
     lập tức. Cờ này bỏ qua đúng 1 lượt click sau khi moPopup() vừa chạy. */
  let boQuaClickKeTiep = false;
  function moPopup() {
    dangMo = true; popup.hidden = false;
    boQuaClickKeTiep = true;
    chuaDoc = 0; veBadge();
    cuoiTrang();
    setTimeout(() => $('#chat-noidung')?.focus(), 60);
  }
  function dongPopup() { dangMo = false; popup.hidden = true; }

  nutMo.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popup.hidden) moPopup(); else dongPopup();
  });
  nutDong.addEventListener('click', (e) => { e.stopPropagation(); dongPopup(); });
  document.addEventListener('click', () => {
    if (boQuaClickKeTiep) { boQuaClickKeTiep = false; return; }
    if (dangMo) dongPopup();
  });
  popup.addEventListener('click', (e) => e.stopPropagation());

  // Về kênh chung từ 1 cuộc chat riêng
  nutLui.addEventListener('click', async () => {
    nguoiNhanHienTai = null;
    veTieuDe();
    await taiLanDau();
  });

  // Mở chat riêng với 1 người — gọi từ nút "Chat ngay" ở Danh bạ
  window.moChatVoi = async (id, ten, vietTat) => {
    if (!id || id === TOI.id) return;
    nguoiNhanHienTai = { id, ten, viet_tat: vietTat };
    veTieuDe();
    moPopup();
    await taiLanDau();
    veGanDay();   // đối tác mới lần đầu chat thì cũng cần hiện luôn bong bóng
  };

  // Chọn / bỏ file đính kèm
  $('#chat-nut-tep').addEventListener('click', () => $('#chat-tep').click());
  $('#chat-tep').addEventListener('change', () => {
    const f = $('#chat-tep').files[0] || null;
    tepDangChon = f;
    $('#chat-file-dinhkem').hidden = !f;
    $('#chat-file-ten').textContent = f ? `${f.name} (${dinhDangCo(f.size)})` : '';
  });
  $('#chat-file-bo').addEventListener('click', () => {
    tepDangChon = null;
    $('#chat-tep').value = '';
    $('#chat-file-dinhkem').hidden = true;
  });

  // Gửi
  $('#chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oNoiDung = $('#chat-noidung');
    const noiDung = oNoiDung.value.trim();
    if (!noiDung && !tepDangChon) return;
    $('#chat-loi').textContent = '';
    const nutGui = $('#chat-nut-gui');
    nutGui.disabled = true;
    try {
      const { id } = await API.chatGui(noiDung, tepDangChon, nguoiNhanHienTai?.id);
      oNoiDung.value = '';
      $('#chat-tep').value = '';
      tepDangChon = null;
      $('#chat-file-dinhkem').hidden = true;
      // Hiện luôn tin vừa gửi (khỏi đợi vòng hỏi lại tiếp theo)
      if (id > idCuoi) await hoiTinMoi();
      cuoiTrang();
    } catch (err) {
      $('#chat-loi').textContent = err.message || 'Không gửi được, thử lại nhé.';
    } finally {
      nutGui.disabled = false;
      oNoiDung.focus();
    }
  });
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
      `<td><div class="person">${avHtml(r.id, r.viet_tat, r.co_anh)}` +
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
    ['vanhanh', 'rnd', 'cskh'].forEach(k => {
      const pane = document.getElementById('kd-pane-' + k);
      if (pane) pane.hidden = (k !== nut.dataset.kd);
    });
  });

  // Vận hành sàn — đơn hoàn cần đối soát (đã GỘP đơn huỷ vào chung) — chỉ ai có
  // quyền Đơn hoàn mới thấy
  if (TOI.quyen.includes('donhoan')) {
    await khoiDongDoiSoatSan();
    await khoiDongCSKH();
  }
}

/* Chăm sóc khách hàng — bảng xếp hạng khách hoàn/hủy nhiều nhất 6 tháng gần đây */
async function khoiDongCSKH() {
  let kq;
  try { kq = await API.kdKhachHoanNhieu(); } catch { return; }
  const ds = kq.khach_hang || [];
  ds.forEach((r, i) => { r.__thu_tu = i + 1; });
  veBang('#cskh-bang', ds, r => {
    const ngTag = (r.nguon || '').split(',').map(n =>
      n === 'tiktok' ? '<span class="tag mute">TikTok</span>' : '<span class="tag sage">Shopee</span>'
    ).join(' ');
    return `<td class="num">${r.__thu_tu}</td>` +
      `<td>${esc(r.nguoi_mua)}</td>` +
      `<td>${ngTag}</td>` +
      `<td class="num">${esc(r.so_don)}</td>` +
      `<td class="num">${esc(r.so_huy)}</td>` +
      `<td class="sm">${ngayVN(r.gan_nhat)}</td>`;
  });
  $('#cskh-trong').hidden = ds.length > 0;
  $('#cskh-dem').textContent = ds.length ? `${ds.length} khách` : '';
}

/* ==========================================================================
   KINH DOANH — Vận hành sàn: đơn hoàn cần đối soát (quá 12h kho chưa nhận)
   ========================================================================== */
async function khoiDongDoiSoatSan() {
  $('#kd-doisoat-panel').hidden = false;

  // Chỉ Vận hành sàn (+ ban giám đốc) được bấm nút ở bước này — kế toán trưởng
  // vẫn xem được cả bảng (để biết đơn đang ở đâu) nhưng không thao tác được,
  // đúng luật "bộ phận nào việc nấy" (Sếp Ngọc chốt 19/08/2026). Ô tick/nút
  // vẫn giữ nguyên cấu trúc cột (để không lệch cột cố định), chỉ bỏ trống
  // nội dung tương tác bên trong khi không có quyền.
  const coQuyen = !!TOI.thao_tac_van_hanh;
  if (!coQuyen) {
    const thTick = $('#kd-doisoat-panel thead th.dinh-tick');
    if (thTick) thTick.innerHTML = '';
    // Không cần ẩn riêng thanh "Đã chọn N đơn" — vì không còn ô tick nào để
    // chọn (dongDoiSoat bỏ trống ô tick khi !coQuyen) nên thanh này tự nhiên
    // không bao giờ hiện lên (veThanhChon dựa trên dsDangChon() luôn rỗng).
  }

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
    // Sản phẩm — nhiều sản phẩm thì mỗi sản phẩm 1 dòng (oSanPham, dùng chung)
    const sp = oSanPham(r.san_pham_ten || r.san_pham, r.san_pham_sku, r.so_luong);
    const spCell = `<td class="sm" title="${esc(sp.title)}">${sp.html}</td>`;
    // Trạng thái sàn — dùng chung nhanTrangThai() (trước đây tự lowercase
    // tay ở đây, không qua từ điển nên vẫn hiện tiếng Anh thô dù NHAN_TT đã
    // có sẵn bản dịch — Sếp Ngọc bắt lỗi 20/08/2026 từ ảnh chụp cột này).
    const tt = nhanTrangThai(r.trang_thai);
    // Đã tra soát mấy lần
    const daTra = (r.lan_tra_soat > 0)
      ? `<span class="tag warn">${r.lan_tra_soat} lần</span>` +
        `<div class="phu">${esc(r.doi_soat_luc || '')}${r.doi_soat_boi ? ' · ' + esc(r.doi_soat_boi) : ''}</div>`
      : '<span class="tag mute">Chưa</span>';
    const nhanNut = (r.lan_tra_soat > 0) ? `Tra soát lần ${r.lan_tra_soat + 1}` : 'Đã tra soát';
    // Ngày phát sinh hoàn trên sàn + tag "new" (phát sinh <3 ngày & chưa xử lý)
    const ngayTao = ngayVN(r.tao_luc_shopee);
    const laMoi = r.tao_luc_shopee && !(r.lan_tra_soat > 0) &&
      (Date.now() / 1000 - Number(r.tao_luc_shopee)) < 3 * 86400;
    const tagMoi = laMoi ? '<span class="tag-new">new</span>' : '';
    // Lý do kho khiếu nại (nếu kho vừa bấm "Cần khiếu nại") — icon + tag đỏ nổi
    // bật để vận hành sàn không lướt qua, kèm nguyên văn lý do kho ghi. Đơn nào
    // chỉ tự động đẩy lên do quá 24h chưa nhận (không phải kho chủ động khiếu
    // nại) thì hiện mốc thời gian trễ nhẹ hơn để biết mức độ gấp.
    const khieuNaiHtml = r.ly_do_khieu_nai
      ? `<div class="phu" style="margin-top:4px">` +
          `<span class="tag danger">⚠️ Kho khiếu nại</span>` +
          `<div class="canh-bao-chu" style="margin-top:3px">${esc(r.ly_do_khieu_nai)}` +
            `${r.khieu_nai_boi ? ' — ' + esc(r.khieu_nai_boi) : ''}</div>` +
        `</div>`
      : (r.dang_cho === 'van_hanh' && r.cho_kho_nhan_tu
          ? `<div class="phu canh-bao-chu">Kho đẩy lên · quá ${esc(gioTre(r.cho_kho_nhan_tu))}</div>` : '');
    const oTick = coQuyen ? `<input type="checkbox" data-chon="${esc(r.return_sn)}">` : '';
    return `<td class="dinh-tick">${oTick}</td>` +
      `<td class="dinh-cot">${ngTag}</td>` +
      `<td class="sm dinh-cot2" title="${esc(r.return_sn)}">${esc(r.return_sn)}${tagMoi}` +
        (ngayTao ? `<div class="phu">Hoàn: ${esc(ngayTao)}</div>` : '') + khieuNaiHtml + `</td>` +
      `<td class="sm dinh-cot3" title="${esc(r.order_sn || '')}">${esc(r.order_sn || '—')}</td>` +
      `<td class="sm dinh-cot4" title="${esc(r.ma_van_don || '')}">${esc(r.ma_van_don || '—')}</td>` +
      spCell +
      `<td class="num">${r.so_luong != null ? esc(r.so_luong) : '—'}</td>` +
      `<td class="sm">${oLyDo(r.ly_do)}</td>` +
      `<td><span class="tag ${tt.mau}" title="${esc(r.trang_thai || '')}">${esc(tt.chu)}</span></td>` +
      `<td class="num">${tien}</td>` +
      `<td>${daTra}</td>` +
      `<td>${coQuyen ? `<button type="button" class="btn-nho" data-doisoat="${esc(r.return_sn)}">${nhanNut}</button>` : ''}</td>`;
  }

  // Dữ liệu thô từ máy chủ — lọc tìm kiếm/nguồn làm ngay ở trình duyệt,
  // không cần gọi lại API mỗi lần Sếp gõ chữ hay đổi bộ lọc.
  let DS_DOISOAT = [];

  function veBangDoiSoat() {
    const tk = boDau(($('#kd-ds-tim').value || '').trim());
    const locNguon = $('#kd-ds-locnguon').value;
    const ds = DS_DOISOAT.filter(r => {
      if (locNguon && r.nguon !== locNguon) return false;
      if (!tk) return true;
      return boDau(`${r.return_sn} ${r.order_sn || ''} ${r.ma_van_don || ''} ${r.san_pham_ten || r.san_pham || ''} ${r.san_pham_sku || ''}`).includes(tk);
    });

    // Chưa tra soát lần nào HOẶC kho vừa khiếu nại (dù trước đó đã tra soát
    // rồi, khiếu nại mới vẫn là việc gấp) → lên đầu, tô đỏ.
    // Còn lại (đã tra soát, không có khiếu nại đang mở) → tự chìm xuống cuối.
    const chua = ds.filter(r => !(r.lan_tra_soat > 0) || r.ly_do_khieu_nai);
    const daXong = ds.filter(r => (r.lan_tra_soat > 0) && !r.ly_do_khieu_nai);

    let html = chua.map(r => `<tr class="canh-bao">${dongDoiSoat(r)}</tr>`).join('');
    if (chua.length && daXong.length) {
      html += `<tr class="kd-chiadoi"><td colspan="12">Đã tra soát — chỉ còn chờ kho xác nhận nhận hàng</td></tr>`;
    }
    html += daXong.map(r => `<tr class="kd-daxong">${dongDoiSoat(r)}</tr>`).join('');
    $('#kd-ds-bang').innerHTML = html;

    $('#kd-ds-trong').hidden = ds.length > 0;
    $('#kd-ds-dem').textContent = (tk || locNguon)
      ? `${ds.length}/${DS_DOISOAT.length} đơn cần đối soát`
      : `${ds.length} đơn cần đối soát`;

    // Mỗi lần vẽ lại bảng là danh sách chọn reset về rỗng (dữ liệu vừa đổi)
    $('#kd-ds-chontatca').checked = false;
    veThanhChon();
  }

  async function veDoiSoat() {
    const { can_doi_soat } = await API.kdCanDoiSoat();
    DS_DOISOAT = can_doi_soat;
    veBangDoiSoat();
  }
  $('#kd-ds-tim').addEventListener('input', veBangDoiSoat);
  $('#kd-ds-locnguon').addEventListener('change', veBangDoiSoat);

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
  async function dayHangLoat(nut, goi) {
    const ds = dsDangChon();
    if (!ds.length) return;
    nut.disabled = true;
    const cu = nut.textContent;
    nut.textContent = 'Đang đẩy…';
    try {
      await goi(ds);
      await veDoiSoat();      // tự reset danh sách chọn
    } catch (err) {
      alert(err.message || 'Không đẩy được, thử lại nhé.');
    } finally {
      nut.disabled = false;
      nut.textContent = cu;
    }
  }
  $('#kd-ds-daykho').addEventListener('click', () => dayHangLoat($('#kd-ds-daykho'), API.kdDayKho));
  $('#kd-ds-dayketoan')?.addEventListener('click', () => dayHangLoat($('#kd-ds-dayketoan'), API.kdDayKeToan));

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

  // Cho chuông thông báo gọi lại được khi bấm vào 1 thông báo — không thì
  // tab Vận hành sàn chỉ hiện lại dữ liệu cũ từ lúc tải trang, chưa có đơn
  // vừa được đẩy sang (anh Duy phát hiện 20/08/2026).
  window.LAM_MOI_DOISOAT = veDoiSoat;
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
/* (Đã gộp "Đơn hoàn huỷ" vào chung danh sách "Cần đối soát" — Sếp chốt 19/08/2026) */

/* -- Kho — Xuất / Nhập / Tồn (máy chủ thật) -- */
if (TOI.quyen.includes('khovan')) {
  await khoiDongKho();
}

/* -- Đơn hoàn Shopee/TikTok — danh sách nằm trong tab Kho vận (kho xử lý),
   khối kết nối nằm trong tab Kết nối sàn. Chạy cho MỌI vai trò xem được đơn
   hoàn (gồm cả kho), không chỉ vai trò có tab Kết nối sàn. -- */
if (TOI.shopee && TOI.shopee.xem) {
  await khoiDongDonHoan();
  await khoiDongLichSuHoan();
}

/* ---- Chuông thông báo trong ERP 🔔 ---- */
(function chuongThongBao() {
  const NHOM_ROLES = ['nhan_vien_kho', 'quan_ly_kho', 'van_hanh_san', 'ke_toan_truong', 'giam_doc', 'pho_giam_doc'];
  if (!NHOM_ROLES.includes(TOI.vai_tro)) return;   // vai trò không nhận thông báo → ẩn chuông

  const chuong = $('#tbChuong'), nut = $('#tbNut'), panel = $('#tbPanel'),
        badge = $('#tbBadge'), ds = $('#tbDanhSach'), trong = $('#tbTrong');
  if (!chuong || !nut) return;
  chuong.hidden = false;

  const ICO = { day_kho: '📦', day_ke_toan: '💰', khieu_nai: '⚠️', canh_bao: '🔔' };

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
    if (!dangMo) await taiThongBao();   // mở chuông thì tải lại, khỏi chờ 5 phút
    if (!dangMo) { try { await API.thongBaoDaXem(); } catch {} badge.hidden = true; }
  });

  // Trước chỉ chuyển đúng tab nhưng danh sách bên trong vẫn là dữ liệu tải
  // từ lúc mở trang — đơn vừa đẩy sang chưa kịp hiện, tưởng như "bấm vào
  // không thấy đơn đâu" (anh Duy phát hiện 20/08/2026). Giờ gọi lại đúng
  // hàm tải dữ liệu của màn đó (window.LAM_MOI_*, gắn ở khoiDong* liên quan).
  ds.addEventListener('click', (e) => {
    const it = e.target.closest('.tb-item');
    if (!it) return;
    if (it.dataset.loai === 'day_kho') {
      moTab('khovan');
      const b = document.querySelector('#kvSeg .seg-nut[data-kv="donhoan"]'); if (b) b.click();
      if (window.LAM_MOI_DONHOAN) window.LAM_MOI_DONHOAN();
    } else if (it.dataset.loai === 'khieu_nai') {
      moTab('kinhdoanh');
      const b = document.querySelector('#kdSeg .seg-nut[data-kd="vanhanh"]'); if (b) b.click();
      if (window.LAM_MOI_DOISOAT) window.LAM_MOI_DOISOAT();
    } else if (it.dataset.loai === 'day_ke_toan') {
      moTab('ketoan');
      if (window.LAM_MOI_TRASOAT) window.LAM_MOI_TRASOAT();
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
    ['ton', 'nhap', 'xuat', 'baocao', 'donhoan', 'lichsu'].forEach(k => {
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
    const coShopee = $('#dh-nguon-shopee').checked, coTiktok = $('#dh-nguon-tiktok').checked;
    const ds = DS_DH.filter(r =>
      (r.nguon === 'tiktok' ? coTiktok : coShopee) &&
      (!k || boDau(`${r.return_sn} ${r.order_sn || ''} ${r.ma_van_don || ''} ${r.san_pham_ten || r.san_pham || ''} ${r.san_pham_sku || ''} ${r.nguoi_mua || ''}`).includes(k)));
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
      // Đơn HUỶ (trang_thai chứa CANCEL) có mã vận đơn: nhận xong phải phân
      // loại "Nhập kho" / "Hàng hỏng — chờ huỷ", không chỉ "Đã nhận" chung
      // chung (Sếp Ngọc chốt 20/08/2026).
      const laDonHuy = /CANCEL/.test(r.trang_thai || '');
      let khoTd, cls = '';
      if (r.kho_nhan_luc) {
        if (r.phan_loai_nhan === 'hong_cho_huy') {
          khoTd = `<td class="sm"><span class="tag danger">⚠️ Hỏng/Chờ Hủy</span>` +
            `<div class="phu">${esc(r.phan_loai_boi || '')} · ${esc(r.phan_loai_luc || '')}</div></td>`;
        } else if (r.phan_loai_nhan === 'nhap_kho') {
          khoTd = `<td class="sm"><span class="tag ok">✓ Nhập kho lại</span>` +
            `<div class="phu">${esc(r.phan_loai_boi || '')} · ${esc(r.phan_loai_luc || '')}</div></td>`;
        } else {
          const TT_NHAN = {
            con_tot: ['ok', '✓ Còn tốt'], hu_hong: ['danger', '⚠️ Hư hỏng'],
            thieu_hang: ['danger', '⚠️ Thiếu hàng'], sai_hang: ['danger', '⚠️ Sai hàng']
          };
          const tt = TT_NHAN[r.tinh_trang_hang] || ['ok', '✓ Đã nhận'];
          khoTd = `<td class="sm"><span class="tag ${tt[0]}">${tt[1]}</span>` +
                  `<div class="phu">${esc(r.kho_nhan_boi || '')} · ${esc(r.kho_nhan_luc)}</div></td>`;
        }
      } else {
        const qua12h = r.cho_kho_nhan_tu &&
          (Date.now() - Date.parse(r.cho_kho_nhan_tu.replace(' ', 'T'))) / 3600000 >= 12;
        if (qua12h) cls = 'canh-bao';
        const nhac = qua12h ? '<div class="phu canh-bao-chu">Quá 12h!</div>' : '';
        khoTd = laDonHuy
          ? `<td style="white-space:nowrap">` +
              `<button type="button" class="btn-nho btn-primary" data-phanloai="nhap_kho" data-rsn="${esc(r.return_sn)}">Nhập kho</button> ` +
              `<button type="button" class="btn-nho" data-phanloai="hong_cho_huy" data-rsn="${esc(r.return_sn)}">Hỏng/Chờ Hủy</button> ` +
              `<button type="button" class="btn-nho" data-khieunai="${esc(r.return_sn)}">Cần khiếu nại</button>${nhac}</td>`
          : `<td style="white-space:nowrap">` +
              `<select class="sel-tinhtrang" style="margin-right:4px">` +
                `<option value="con_tot">Còn tốt</option>` +
                `<option value="hu_hong">Hư hỏng</option>` +
                `<option value="thieu_hang">Thiếu hàng</option>` +
                `<option value="sai_hang">Sai hàng</option>` +
              `</select>` +
              `<button type="button" class="btn-nho btn-primary" data-nhan="${esc(r.return_sn)}">Nhận đủ</button> ` +
              `<button type="button" class="btn-nho" data-khieunai="${esc(r.return_sn)}">Cần khiếu nại</button> ` +
              `<button type="button" class="btn-nho" data-chuanhan="${esc(r.return_sn)}">Chưa nhận được</button>${nhac}</td>`;
      }

      // Sản phẩm — nhiều sản phẩm thì mỗi sản phẩm 1 dòng (oSanPham, dùng chung)
      const sp = oSanPham(r.san_pham_ten || r.san_pham, r.san_pham_sku, r.so_luong);
      const spCell = `<td class="sm" title="${esc(sp.title)}">${sp.html}</td>`;
      const slCell = `<td class="num">${r.so_luong != null ? esc(r.so_luong) : '—'}</td>`;

      const html = `<td>${ngTag}</td>` +
        `<td class="sm">${ngayVN(r.tao_luc_shopee)}</td>` +
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
  $('#dh-nguon-shopee').addEventListener('change', () => veBangDH($('#dh-tim').value));
  $('#dh-nguon-tiktok').addEventListener('change', () => veBangDH($('#dh-tim').value));

  /* Kho bấm "Nhận đủ" / "Nhập kho" / "Hàng hỏng-Chờ huỷ" (đóng đơn) hoặc
     "Cần khiếu nại" (đẩy về Vận hành sàn) */
  $('#dh-bang').addEventListener('click', async (e) => {
    const btnNhan = e.target.closest('[data-nhan]');
    const btnKn = e.target.closest('[data-khieunai]');
    const btnPl = e.target.closest('[data-phanloai]');
    const btnCn = e.target.closest('[data-chuanhan]');
    if (!btnNhan && !btnKn && !btnPl && !btnCn) return;
    const btn = btnNhan || btnKn || btnPl || btnCn;
    const rsn = btn.getAttribute('data-rsn') ||
      btn.getAttribute('data-nhan') || btn.getAttribute('data-khieunai') || btn.getAttribute('data-chuanhan');
    let ghiChu = '';
    if (btnKn) {
      // Gõ lý do xong mới đẩy về Vận hành sàn (anh Duy chốt 20/08/2026) —
      // khác "Chưa nhận được" là đẩy ngay không cần gõ gì. Đang chọn sẵn
      // "Hư hỏng" ở ô tình trạng thì gợi ý luôn lý do, khỏi gõ lại.
      const sel = btn.closest('td').querySelector('.sel-tinhtrang');
      const goiY = sel && sel.value === 'hu_hong' ? 'Hàng hư hỏng khi kho nhận' : '';
      const nhap = prompt('Lý do cần khiếu nại (thiếu hàng / hỏng / không đúng mô tả…):', goiY);
      if (nhap === null) return;   // bấm Huỷ thì thôi
      ghiChu = nhap;
    }
    if (btnPl && btn.getAttribute('data-phanloai') === 'hong_cho_huy' &&
        !confirm('Xác nhận hàng hỏng do vận chuyển, chờ lập biên bản hủy cùng kế toán?')) return;
    if (btnCn && !confirm('Xác nhận CHƯA NHẬN ĐƯỢC hàng — đơn sẽ đẩy ngay về Vận hành sàn để khiếu nại với sàn?')) return;
    let tinhTrang = '';
    if (btnNhan) {
      const sel = btn.closest('td').querySelector('.sel-tinhtrang');
      tinhTrang = sel ? sel.value : '';
    }
    btn.disabled = true;
    const cu = btn.textContent;
    btn.textContent = 'Đang lưu…';
    try {
      if (btnNhan) await API.hoanDaNhan(rsn, tinhTrang);
      else if (btnPl) await API.hoanPhanLoai(rsn, btn.getAttribute('data-phanloai'));
      else if (btnCn) await API.hoanChuaNhan(rsn);
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

  // Cho chuông thông báo gọi lại được (xem chú thích ở LAM_MOI_DOISOAT).
  window.LAM_MOI_DONHOAN = veDanhSach;
  // Danh sách đơn hoàn là phần quan trọng nhất (kho dùng) → load TRƯỚC. Phần
  // kết nối sàn + ghép SKU bọc try/catch để lỗi ở đó không chặn việc hiện danh sách.
  await veDanhSach();
  try { await veShopee(); } catch (e) { console.error('Kết nối Shopee:', e); }
  try { await veTiktok(); } catch (e) { console.error('Kết nối TikTok:', e); }
}

/* -- Lịch sử đơn hoàn — tra cứu lại đơn ĐÃ xử lý xong (anh Duy yêu cầu
   20/08/2026), khác tab "Đơn hoàn" chỉ là hàng đợi việc cần làm. Chỉ xem,
   không có nút thao tác. -- */
async function khoiDongLichSuHoan() {
  let DS_LS = [];
  const TT_NHAN_LS = {
    con_tot: ['ok', '✓ Còn tốt'], hu_hong: ['danger', '⚠️ Hư hỏng'],
    thieu_hang: ['danger', '⚠️ Thiếu hàng'], sai_hang: ['danger', '⚠️ Sai hàng']
  };

  // Hàng hư hỏng/thiếu/sai — bôi đỏ cả hàng cho dễ thấy ngay, không phải
  // đọc kỹ cột trạng thái mới biết (anh Duy yêu cầu 20/08/2026).
  const TINH_TRANG_CANH_BAO = ['hu_hong', 'thieu_hang', 'sai_hang'];

  // { mau, chu, phu: ghi chú (lý do…), canhBao, nguoi, luc: NGƯỜI/LÚC thao tác
  // gần nhất — tách riêng khỏi phu để lên hẳn 1 cột "Người thực hiện" (anh
  // Duy yêu cầu 20/08/2026), không phải đọc chữ nhỏ dưới trạng thái nữa.
  function trangThaiXuLy(r) {
    if (r.kho_nhan_luc) {
      if (r.phan_loai_nhan === 'hong_cho_huy')
        return { mau: 'danger', chu: '⚠️ Hàng hỏng — chờ huỷ', canhBao: true, nguoi: r.phan_loai_boi, luc: r.phan_loai_luc };
      if (r.phan_loai_nhan === 'nhap_kho')
        return { mau: 'ok', chu: '✓ Nhập kho lại', nguoi: r.phan_loai_boi, luc: r.phan_loai_luc };
      const tt = TT_NHAN_LS[r.tinh_trang_hang] || ['ok', '✓ Đã nhận'];
      if (r.ke_toan_luc)
        return { mau: tt[0], chu: tt[1], phu: 'Kế toán đã tra soát', nguoi: r.ke_toan_boi, luc: r.ke_toan_luc, canhBao: TINH_TRANG_CANH_BAO.includes(r.tinh_trang_hang) };
      return { mau: tt[0], chu: tt[1], nguoi: r.kho_nhan_boi, luc: r.kho_nhan_luc, canhBao: TINH_TRANG_CANH_BAO.includes(r.tinh_trang_hang) };
    }
    if (r.dang_cho === 'van_hanh' && r.ly_do_khieu_nai)
      return { mau: 'danger', chu: '⚠️ Kho khiếu nại — chờ Vận hành sàn', phu: r.ly_do_khieu_nai,
        nguoi: r.khieu_nai_boi, luc: r.khieu_nai_luc, canhBao: true };
    if (r.dang_cho === 'ke_toan')
      return { mau: 'warn', chu: '💰 Chờ Kế toán tra soát' };
    return { mau: 'mute', chu: 'Đang chờ Kho nhận' };
  }

  function veBangLS(tuKhoa) {
    const k = boDau((tuKhoa || '').trim());
    const coShopee = $('#ls-nguon-shopee').checked, coTiktok = $('#ls-nguon-tiktok').checked;
    const ds = DS_LS.filter(r =>
      (r.nguon === 'tiktok' ? coTiktok : coShopee) &&
      (!k || boDau(`${r.return_sn} ${r.order_sn || ''} ${r.ma_van_don || ''} ${r.san_pham_ten || r.san_pham || ''} ${r.san_pham_sku || ''} ${r.nguoi_mua || ''}`).includes(k)));
    veBang('#ls-bang', ds, r => {
      const tt = nhanTrangThai(r.trang_thai);
      const tien = r.so_tien != null
        ? tienVN(Math.round(r.so_tien / 100000)) + ' ' + esc(r.tien_te || '')
        : '—';
      const ngTag = r.nguon === 'tiktok'
        ? '<span class="tag mute">TikTok</span>' : '<span class="tag sage">Shopee</span>';
      const sp = oSanPham(r.san_pham_ten || r.san_pham, r.san_pham_sku, r.so_luong);
      const xl = trangThaiXuLy(r);
      const html = `<td>${ngTag}</td>` +
        `<td class="sm">${ngayVN(r.tao_luc_shopee)}</td>` +
        `<td class="sm">${esc(r.return_sn)}</td>` +
        `<td class="sm">${esc(r.order_sn || '—')}</td>` +
        `<td class="sm">${esc(r.ma_van_don || '—')}</td>` +
        `<td class="sm" title="${esc(sp.title)}">${sp.html}</td>` +
        `<td class="num">${r.so_luong != null ? esc(r.so_luong) : '—'}</td>` +
        `<td><span class="tag ${tt.mau}" title="${esc(r.trang_thai || '')}">${esc(tt.chu)}</span></td>` +
        `<td class="num">${tien}</td>` +
        `<td class="sm">${esc(r.nguoi_mua || '—')}</td>` +
        `<td class="sm"><span class="tag ${xl.mau}">${esc(xl.chu)}</span>${xl.phu ? `<div class="phu">${esc(xl.phu)}</div>` : ''}</td>` +
        `<td class="sm">${xl.nguoi ? esc(xl.nguoi) + (xl.luc ? `<div class="phu">${esc(xl.luc)}</div>` : '') : '—'}</td>`;
      return { html, cls: xl.canhBao ? 'canh-bao' : '' };
    });
    $('#ls-trong').hidden = ds.length > 0;
    $('#ls-dem').textContent = `${ds.length}/${DS_LS.length} đơn hoàn`;
  }

  async function veLichSu() {
    let kq;
    try { kq = await API.hoanLichSu(); } catch { return; }
    DS_LS = kq.don_hoan || [];
    veBangLS($('#ls-tim').value);
  }
  $('#ls-tim').addEventListener('input', e => veBangLS(e.target.value));
  $('#ls-nguon-shopee').addEventListener('change', () => veBangLS($('#ls-tim').value));
  $('#ls-nguon-tiktok').addEventListener('change', () => veBangLS($('#ls-tim').value));

  await veLichSu();
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
  khoiDongKeToanTraSoat();   // đơn hoàn Vận hành sàn đẩy sang (máy chủ thật)
  khoiDongKeToanHangHong();  // hàng hỏng do vận chuyển — biên bản hủy hàng tháng
}

/* Kế toán — đơn hoàn cần tra soát tiền (Vận hành sàn đẩy sang) */
async function khoiDongKeToanTraSoat() {
  const panel = $('#kt-trasoat-panel');
  if (!panel) return;
  panel.hidden = false;

  // Dữ liệu thô để xuất Excel dùng lại (bảng chỉ hiện HTML, cần bản gốc
  // để lấy chữ thuần — Sếp Ngọc yêu cầu 20/08/2026: tích chọn hàng loạt +
  // xuất Excel, cùng kiểu tick-chọn với "Hàng hỏng chờ huỷ" đã có sẵn).
  let DS_TS = [];

  function dsDangChon() {
    return [...document.querySelectorAll('#kt-ts-bang input[data-chon]:checked')].map(o => o.getAttribute('data-chon'));
  }
  function veThanhChon() {
    const sl = dsDangChon().length;
    $('#kt-ts-thanhchon').hidden = sl === 0;
    $('#kt-ts-sldachon').innerHTML = `Đã chọn <b>${sl}</b> đơn`;
  }

  async function veTraSoat() {
    let kq;
    try { kq = await API.ktCanTraSoat(); } catch { return; }
    DS_TS = kq.can_tra_soat || [];
    veBang('#kt-ts-bang', DS_TS, r => {
      const ngTag = r.nguon === 'tiktok'
        ? '<span class="tag mute">TikTok</span>' : '<span class="tag sage">Shopee</span>';
      const tien = r.so_tien != null
        ? tienVN(Math.round(r.so_tien / 100000)) + ' ' + esc(r.tien_te || '') : '—';
      const sp = oSanPham(r.san_pham_ten, r.san_pham_sku, r.so_luong);
      const spCell = `<td class="sm" title="${esc(sp.title)}">${sp.html}</td>`;
      // 2 luồng chung 1 hàng đợi: hoàn tiền không qua kho (kho_nhan_luc rỗng)
      // vs hàng đã nhập kho (Kho đã bấm "Nhận đủ" — Còn tốt) cần đối soát
      // chéo số lượng/tiền với sàn — phân biệt bằng thẻ này.
      const veTag = r.kho_nhan_luc
        ? '<span class="tag ok">📦 Đã nhập kho</span>'
        : '<span class="tag mute">💰 Hoàn tiền</span>';
      return `<td><input type="checkbox" data-chon="${esc(r.return_sn)}"></td>` +
        `<td>${ngTag}</td>` +
        `<td class="sm">${esc(r.return_sn)}</td>` +
        `<td class="sm">${esc(r.order_sn || '—')}</td>` +
        `<td>${veTag}</td>` +
        spCell +
        `<td class="num">${r.so_luong != null ? esc(r.so_luong) : '—'}</td>` +
        `<td class="sm">${oLyDo(r.ly_do)}</td>` +
        `<td class="num">${tien}</td>` +
        `<td><button type="button" class="btn-nho btn-primary" data-trasoat="${esc(r.return_sn)}">Đã tra soát</button></td>`;
    });
    $('#kt-ts-trong').hidden = DS_TS.length > 0;
    $('#kt-ts-dem').textContent = DS_TS.length ? `${DS_TS.length} đơn cần tra soát` : '';
    $('#kt-ts-chontatca').checked = false;
    veThanhChon();
  }

  $('#kt-ts-bang').addEventListener('change', (e) => {
    if (!e.target.matches('input[data-chon]')) return;
    veThanhChon();
  });
  $('#kt-ts-chontatca').addEventListener('change', (e) => {
    document.querySelectorAll('#kt-ts-bang input[data-chon]').forEach(o => { o.checked = e.target.checked; });
    veThanhChon();
  });
  $('#kt-ts-huychon').addEventListener('click', () => {
    document.querySelectorAll('#kt-ts-bang input[data-chon]').forEach(o => { o.checked = false; });
    $('#kt-ts-chontatca').checked = false;
    veThanhChon();
  });
  $('#kt-ts-xuatexcel').addEventListener('click', () => {
    const chon = new Set(dsDangChon());
    const ds = DS_TS.filter(r => chon.has(r.return_sn));
    if (!ds.length) return;
    const cot = ['Nguồn', 'Mã đơn hoàn', 'Đơn gốc', 'Về từ đâu', 'Sản phẩm hoàn về', 'Số lượng', 'Lý do', 'Số tiền hoàn'];
    const hang = ds.map(r => {
      const sp = oSanPham(r.san_pham_ten, r.san_pham_sku, r.so_luong);
      const tien = r.so_tien != null ? tienVN(Math.round(r.so_tien / 100000)) + ' ' + (r.tien_te || '') : '';
      return [
        r.nguon === 'tiktok' ? 'TikTok' : 'Shopee', r.return_sn, r.order_sn || '',
        r.kho_nhan_luc ? 'Đã nhập kho' : 'Hoàn tiền',
        sp.title, r.so_luong ?? '', nhanLyDo(r.ly_do), tien
      ];
    });
    xuatCSV(`don-hoan-can-tra-soat-${new Date().toISOString().slice(0, 10)}.csv`, cot, hang);
  });

  $('#kt-ts-bang').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-trasoat]');
    if (!btn) return;
    const rsn = btn.getAttribute('data-trasoat');
    btn.disabled = true; const cu = btn.textContent; btn.textContent = 'Đang lưu…';
    try {
      await API.ktDaTraSoat(rsn);
      await veTraSoat();
    } catch (err) { btn.disabled = false; btn.textContent = cu; alert(err.message || 'Không lưu được, thử lại nhé.'); }
  });

  // Cho chuông thông báo gọi lại được (xem chú thích ở LAM_MOI_DOISOAT).
  window.LAM_MOI_TRASOAT = veTraSoat;
  await veTraSoat();
}

/* Kế toán — hàng hỏng do vận chuyển (đơn huỷ), Kho + Kế toán cùng chốt
   thành 1 biên bản hủy hàng tháng bằng cách tick chọn hàng loạt. */
async function khoiDongKeToanHangHong() {
  const panel = $('#kt-hanghong-panel');
  if (!panel) return;
  panel.hidden = false;

  function dsDangChon() {
    return [...document.querySelectorAll('#kt-hh-bang input[data-chon]:checked')].map(o => o.getAttribute('data-chon'));
  }
  function veThanhChon() {
    const sl = dsDangChon().length;
    $('#kt-hh-thanhchon').hidden = sl === 0;
    $('#kt-hh-sldachon').innerHTML = `Đã chọn <b>${sl}</b> đơn`;
  }

  async function veHangHong() {
    let kq;
    try { kq = await API.ktHangHong(); } catch { return; }
    const ds = kq.hang_hong || [];
    veBang('#kt-hh-bang', ds, r => {
      const ngTag = r.nguon === 'tiktok'
        ? '<span class="tag mute">TikTok</span>' : '<span class="tag sage">Shopee</span>';
      const sp = oSanPham(r.san_pham_ten, r.san_pham_sku, r.so_luong);
      const spCell = `<td class="sm" title="${esc(sp.title)}">${sp.html}</td>`;
      return `<td><input type="checkbox" data-chon="${esc(r.return_sn)}"></td>` +
        `<td>${ngTag}</td>` +
        `<td class="sm">${esc(r.return_sn)}</td>` +
        `<td class="sm">${esc(r.order_sn || '—')}</td>` +
        spCell +
        `<td class="num">${r.so_luong != null ? esc(r.so_luong) : '—'}</td>` +
        `<td class="sm">${esc(r.phan_loai_boi || '')}<div class="phu">${esc(r.phan_loai_luc || '')}</div></td>`;
    });
    $('#kt-hh-trong').hidden = ds.length > 0;
    $('#kt-hh-dem').textContent = ds.length ? `${ds.length} đơn chờ lập biên bản` : '';
    $('#kt-hh-chontatca').checked = false;
    veThanhChon();
  }

  $('#kt-hh-bang').addEventListener('change', (e) => {
    if (!e.target.matches('input[data-chon]')) return;
    veThanhChon();
  });
  $('#kt-hh-chontatca').addEventListener('change', (e) => {
    document.querySelectorAll('#kt-hh-bang input[data-chon]').forEach(o => { o.checked = e.target.checked; });
    veThanhChon();
  });
  $('#kt-hh-huychon').addEventListener('click', () => {
    document.querySelectorAll('#kt-hh-bang input[data-chon]').forEach(o => { o.checked = false; });
    $('#kt-hh-chontatca').checked = false;
    veThanhChon();
  });
  $('#kt-hh-lapbienban').addEventListener('click', async () => {
    const ds = dsDangChon();
    if (!ds.length) return;
    if (!confirm(`Xác nhận đã lập biên bản hủy hàng cho ${ds.length} đơn đã chọn?`)) return;
    const nut = $('#kt-hh-lapbienban');
    nut.disabled = true; const cu = nut.textContent; nut.textContent = 'Đang lưu…';
    try {
      await API.ktLapBienBan(ds);
      await veHangHong();
    } catch (err) {
      alert(err.message || 'Không lưu được, thử lại nhé.');
    } finally {
      nut.disabled = false; nut.textContent = cu;
    }
  });

  await veHangHong();
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
        `<td><div class="person">${avHtml(n.id, n.viet_tat, n.co_anh)}` +
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
