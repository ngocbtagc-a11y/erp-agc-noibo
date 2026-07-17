/* ==========================================================================
   CRM Alpha Green Commerce — Điều khiển giao diện
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
  { id: 'ketoan',    ten: 'Kế toán',    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' }
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
    tr.innerHTML = hang(r);
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
      `<td><span class="tag ${r.phap_nhan === 'Công ty' ? 'sage' : 'mute'}">${esc(r.phap_nhan)}</span></td>` +
      `<td><span class="tag ${tt.mau}">${esc(tt.chu)}</span></td>` +
      `<td class="sm">${esc(r.ngay_vao)}</td>` +
      (xem_luong ? `<td class="num">${esc(tienVN(r.luong))}</td>` : '');
  });

  // Các khối dưới đây vẫn là dữ liệu mẫu
  veThe('#ns-the', DB.nhanSu.the);
  veTienDo('#ns-chuyendoi', DB.nhanSu.chuyenDoi);
  veDanhSach('#ns-lich', DB.nhanSu.lich);
}

/* -- Kinh doanh (còn là dữ liệu mẫu) -- */
if (TOI.quyen.includes('kinhdoanh')) {
  veThe('#kd-the', DB.kinhDoanh.the);
  veChart('#kd-chart', DB.kinhDoanh.theoKenh);
  veDanhSach('#kd-doithu', DB.kinhDoanh.doiThu);
  veBang('#kd-bang', DB.kinhDoanh.topSanPham, r =>
    `<td><div class="nm">${esc(r.sp)}</div></td>` +
    `<td class="sm">${esc(r.dm)}</td>` +
    `<td class="num">${esc(r.dh)}</td>` +
    `<td class="num">${esc(r.dt)}</td>` +
    `<td><span class="tag ${esc(r.tt)}">${esc(r.ttx)}</span></td>`);
}

/* -- Kho vận (còn là dữ liệu mẫu) -- */
if (TOI.quyen.includes('khovan')) {
  veThe('#kv-the', DB.khoVan.the);
  veChart('#kv-chart', DB.khoVan.donHang);
  veDanhSach('#kv-nhap', DB.khoVan.nhapHang);
  veBang('#kv-bang', DB.khoVan.tonKho, r =>
    `<td><div class="nm">${esc(r.sp)}</div></td>` +
    `<td class="sm">${esc(r.ma)}</td>` +
    `<td class="num">${esc(r.sl)}</td>` +
    `<td class="num">${esc(r.ngay.toFixed(1))}</td>` +
    `<td><span class="tag ${esc(r.tt)}">${esc(r.ttx)}</span></td>`);
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

/* ---- Mở tab đầu tiên người dùng được xem -------------------------------- */
moTab(TOI.quyen[0]);
