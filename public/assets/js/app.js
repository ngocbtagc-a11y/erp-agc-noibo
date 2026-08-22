/* ==========================================================================
   ERP Alpha Green Commerce — Điều khiển giao diện
   ---------------------------------------------------------------------------
   Mọi tab đều lấy dữ liệu thật từ máy chủ (máy chủ tự kiểm tra quyền) —
   không còn dữ liệu mẫu nào (đã gỡ khỏi Tổng quan/Nhân sự/Kinh doanh/
   Kế toán trước go-live).

   Việc ẩn/hiện tab ở file này CHỈ để cho thuận mắt, không phải bảo mật.
   Chặn thật nằm ở máy chủ: gõ thẳng /api/nhan-su khi không có quyền thì
   nhận 403, và cột lương không được chọn ra khỏi database ngay từ đầu.
   ========================================================================== */

import { API } from './api.js';

/* ---- Danh mục tab -------------------------------------------------------
   "nhom" = nhóm cha hiện trên sidebar, bám theo 4 phòng ban thật của công ty
   (xem docs/ERP_V2_INFORMATION_ARCHITECTURE.md). null = không có nhóm cha,
   hiện ngay đầu sidebar (dùng chung mọi vai trò). */
const TAB = [
  { id: 'tongquan',  ten: 'Trạm Mục Tiêu', nhom: null, icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { id: 'lichsuviec', ten: 'Lịch sử làm việc', nhom: null, icon: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z' },
  { id: 'danhba',    ten: 'Danh bạ',    nhom: null, icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8' },
  { id: 'kinhdoanh', ten: 'Kinh doanh', nhom: 'Kinh doanh & MKT', icon: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
  { id: 'donhoan',   ten: 'Kết nối sàn', nhom: 'Kinh doanh & MKT', icon: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' },
  { id: 'khovan',    ten: 'Kho vận',    nhom: 'Kho vận & Sản xuất', icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' },
  { id: 'nhansu',    ten: 'Nhân sự',    nhom: 'Support', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'ketoan',    ten: 'Kế toán',    nhom: 'Support', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { id: 'taisan',    ten: 'Tài sản',    nhom: 'Support', icon: 'M20 7h-3V6a3 3 0 00-3-3h-4a3 3 0 00-3 3v1H4a1 1 0 00-1 1v11a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1zM9 6a1 1 0 011-1h4a1 1 0 011 1v1H9V6z' },
  { id: 'xepca',     ten: 'Xếp ca',     nhom: 'Support', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { id: 'quantri',   ten: 'Quản trị',   nhom: 'Quản trị doanh nghiệp', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.17V21a2 2 0 01-4 0v-.09A1.65 1.65 0 006 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 14a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 7.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' }
];

/* ---- Danh mục nền dùng chung (Phòng ban/Chức danh/Đơn vị tính) ----------
   Nạp 1 lần, dùng lại cho cả dropdown ở Nhân sự, Kho vận, VÀ 2 màn tự quản
   lý danh mục này — Cơ cấu tổ chức (trong tab Quản trị) + Danh mục (trong
   tab Kho vận) — tránh mỗi màn tự gọi API riêng. */
// Giữ NGUYÊN cả hàng đã ẩn trong 3 mảng này (2 màn quản lý danh mục cần
// thấy hàng ẩn mới bấm "Hiện" lại được — lỗi thật đã gặp: ẩn xong hàng
// biến mất luôn, không có đường quay lại). Chỗ nào đổ DROPDOWN để CHỌN
// (Thêm/Sửa Nhân sự, Thêm/Sửa Sản phẩm...) thì tự lọc .hoat_dong ngay tại chỗ dùng.
let DS_PHONG_BAN = [], DS_CHUC_DANH = [], DS_DON_VI = [];
// Dữ liệu nhân sự đầy đủ (chỉ nạp cho HCNS/Admin qua qtDanhSach) — dùng
// chung cho cả bảng Nhân sự (hồ sơ) lẫn Quản trị (tài khoản), 1 API duy
// nhất thay vì mỗi tab tự gọi riêng.
let DS_NHAN_SU_QT = [], DS_VAI_TRO_QT = [];
// Người xem thường (không có them_nhan_su) chỉ có bảng hồ sơ, dữ liệu ít hơn
// (không cột lương nếu không có quyền) — vẫn cần lưu lại để Search/Filter
// lọc phía client không phải gọi lại API mỗi lần gõ.
let DS_NHAN_SU_DOC = [], NS_XEM_LUONG_DOC = true;
async function taiDanhMucNen() {
  const [pb, cd, dv] = await Promise.all([
    API.dlnPhongBan().catch(() => ({ ds: [] })),
    API.dlnChucDanh().catch(() => ({ ds: [] })),
    API.dlnDonVi().catch(() => ({ ds: [] }))
  ]);
  DS_PHONG_BAN = pb.ds || [];
  DS_CHUC_DANH = cd.ds || [];
  DS_DON_VI = dv.ds || [];
}
window.LAM_MOI_DANHMUC_NEN = taiDanhMucNen;

/* Nạp lại bảng Nhân sự (tab Nhân sự — hồ sơ) và bảng Quản trị (tab Quản
   trị — tài khoản) cùng lúc. HCNS/Admin (them_nhan_su) dùng chung 1 API
   (qtDanhSach) cho cả 2 bảng; người xem thường chỉ có bảng Nhân sự dạng
   đọc (API.nhanSu, không có cột lương nếu không có quyền). */
async function taiLaiNhanSuQuanTri() {
  if (!TOI.them_nhan_su) {
    const { nhan_su, xem_luong } = await API.nhanSu();
    NS_XEM_LUONG_DOC = xem_luong;
    if (!xem_luong) {
      const th = $('#ns-thLuong'); if (th) th.remove();
    }
    DS_NHAN_SU_DOC = nhan_su;
    napBoLocBoPhanNS(nhan_su);
    veBangNsDoc();
    return;
  }

  const { nhan_su, vai_tro } = await API.qtDanhSach();
  DS_NHAN_SU_QT = nhan_su;
  DS_VAI_TRO_QT = vai_tro;

  const oLuongTh = $('#ns-thLuong'); if (oLuongTh) oLuongTh.hidden = true;
  napBoLocBoPhanNS(nhan_su);
  veBangNsQuanTri();

  // Quản trị (tài khoản) — chỉ hiện nếu tab đó tồn tại trong DOM cho vai trò này.
  const oQtBang = $('#qtBang');
  if (oQtBang) {
    const oQuanLy = $('#qtQuanLy');
    if (oQuanLy) {
      const { capNhatHienThi: veQuanLy } = ganCombo({
        hienThi: $('#qtQuanLyHienThi'), panel: $('#qtQuanLyPanel'),
        tim: $('#qtQuanLyTim'), goiY: $('#qtQuanLyGoiY'), giaTri: oQuanLy
      }, () => uuTienCungPhongBan(nhan_su.filter(n => n.dang_lam), $('#qtPhongBan')?.value).map(n => ({ gia_tri: n.id, nhan: nhanNhanSu(n) })),
        '— Không —', 'Chọn quản lý...');
      // Đổi Phòng ban thì sắp lại ưu tiên (không tự xoá lựa chọn đang có).
      // Gán qua .onchange (không addEventListener) — an toàn khi gọi lại nhiều lần.
      const oPbTaoNs = $('#qtPhongBan');
      if (oPbTaoNs) oPbTaoNs.onchange = veQuanLy;
    }
    napBoLocVaiTroQT(vai_tro);
    veBangQtTaiKhoan();
  }
}

/* ---- Search + Filter: Nhân sự / Tài khoản --------------------------------
   Dữ liệu nhỏ (chục dòng, không phải nghìn) nên lọc thẳng phía client, không
   cần debounce/pagination/gọi lại API. boDau() (đã có sẵn, dùng chung toàn
   app) lo phần không dấu/không phân biệt hoa-thường. ------------------------- */

// Bộ phận filter lấy từ DỮ LIỆU THẬT đang có (không phải danh mục Phòng ban
// chuẩn) — nhiều nhân sự chưa gán phòng_ban_id, lọc theo giá trị bo_phan
// đang hiển thị trên bảng mới đúng với cái người dùng nhìn thấy.
function napBoLocBoPhanNS(ds) {
  const o = $('#ns-locbophan'); if (!o) return;
  const hienTai = o.value;
  const dsBoPhan = [...new Set(ds.map(n => (n.bo_phan || '').trim()).filter(Boolean))].sort();
  o.innerHTML = '<option value="">Tất cả bộ phận</option>' +
    dsBoPhan.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
  o.value = hienTai;
}

function napBoLocVaiTroQT(dsVaiTro) {
  const o = $('#qt-locvaitro'); if (!o) return;
  const hienTai = o.value;
  o.innerHTML = '<option value="">Tất cả vai trò</option>' +
    dsVaiTro.map(v => `<option value="${esc(v.ma)}">${esc(v.ten)}</option>`).join('');
  o.value = hienTai;
}

function locNhanSu(ds) {
  const k = boDau(($('#ns-tim')?.value || '').trim());
  const boPhan = $('#ns-locbophan')?.value || '';
  const trangThai = $('#ns-loctrangthai')?.value || '';
  const loaiLd = $('#ns-locloaild')?.value || '';
  return ds.filter(n => {
    if (boPhan && (n.bo_phan || '').trim() !== boPhan) return false;
    if (trangThai && n.trang_thai !== trangThai) return false;
    if (loaiLd && n.loai_lao_dong !== loaiLd) return false;
    if (k && !boDau(`${n.ma_nv || ''} ${n.ho_ten} ${n.sdt || ''} ${n.email || ''}`).includes(k)) return false;
    return true;
  });
}

function xoaLocNS() {
  if ($('#ns-tim')) $('#ns-tim').value = '';
  if ($('#ns-locbophan')) $('#ns-locbophan').value = '';
  if ($('#ns-loctrangthai')) $('#ns-loctrangthai').value = '';
  if ($('#ns-locloaild')) $('#ns-locloaild').value = '';
  TOI.them_nhan_su ? veBangNsQuanTri() : veBangNsDoc();
}

function veTrongNS(tong, sauLoc) {
  const o = $('#ns-trong'); if (!o) return;
  o.hidden = sauLoc.length > 0;
  if (sauLoc.length === 0) {
    o.innerHTML = tong.length === 0
      ? 'Chưa có nhân sự nào.'
      : 'Không tìm thấy kết quả phù hợp. <button type="button" class="btn-nho" id="ns-trongxoaloc">Xoá bộ lọc</button>';
    $('#ns-trongxoaloc')?.addEventListener('click', xoaLocNS);
  }
  const nutLoc = $('#ns-xoaloc');
  if (nutLoc) nutLoc.hidden = !($('#ns-tim')?.value || $('#ns-locbophan')?.value || $('#ns-loctrangthai')?.value || $('#ns-locloaild')?.value);
}

function veBangNsDoc() {
  const ds = locNhanSu(DS_NHAN_SU_DOC);
  $('#ns-hint').textContent = NS_XEM_LUONG_DOC
    ? `${ds.length}/${DS_NHAN_SU_DOC.length} nhân sự`
    : `${ds.length}/${DS_NHAN_SU_DOC.length} nhân sự · Chức vụ của bạn không xem được cột lương`;
  veBang('#ns-bang', ds, r => {
    const tt = TRANG_THAI[r.trang_thai] || { chu: r.trang_thai, mau: 'mute' };
    return '' +
      `<td><div class="person">${avHtml(r.id, r.viet_tat, r.co_anh)}` +
        `<div><div class="nm">${esc(r.ho_ten)}${r.ma_nv ? ` <span class="sm" style="font-weight:400">· ${esc(r.ma_nv)}</span>` : ''}</div>` +
        `<div class="sm">${esc(r.chuc_vu)}</div></div></div></td>` +
      `<td>${esc(r.bo_phan)}</td>` +
      `<td><span class="tag ${tt.mau}">${esc(tt.chu)}</span></td>` +
      `<td class="sm">${esc(r.ngay_vao)}</td>` +
      (NS_XEM_LUONG_DOC ? `<td class="num">${esc(tienVN(r.luong))}</td>` : '');
  });
  veTrongNS(DS_NHAN_SU_DOC, ds);
}

function veBangNsQuanTri() {
  const ds = locNhanSu(DS_NHAN_SU_QT);
  $('#ns-hint').textContent = `${ds.length}/${DS_NHAN_SU_QT.length} nhân sự`;
  veBang('#ns-bang', ds, n => {
    const tt = TRANG_THAI[n.trang_thai] || { chu: n.trang_thai, mau: 'mute' };
    const daKhoaNs = n.trang_thai_dl === 'da_khoa';
    const thaoTac = `<button class="btn-nho" data-sua-ns="${esc(n.id)}">Sửa</button> ` +
      (daKhoaNs
        ? (TOI.la_admin ? `<button class="btn-nho" data-mokhoa-ns="${esc(n.id)}">Mở lại</button>` : '')
        : `<button class="btn-nho" data-khoa-ns="${esc(n.id)}">Hoàn tất</button>`) +
      (TOI.la_admin ? ` <button class="btn-nho btn-phu" data-xoa-ns="${esc(n.id)}" data-xoa-ns-ten="${esc(n.ho_ten)}">Xoá</button>` : '');
    return '' +
      `<td><div class="person">${avHtml(n.id, n.viet_tat, n.co_anh)}` +
        `<div><div class="nm">${esc(n.ho_ten)}${n.ma_nv ? ` <span class="sm" style="font-weight:400">· ${esc(n.ma_nv)}</span>` : ''}${daKhoaNs ? ' <span class="tag warn">🔒</span>' : ''}</div>` +
        `<div class="sm">${esc(n.chuc_vu || tt.chu || '')}</div></div></div></td>` +
      `<td>${esc(n.bo_phan || '—')}</td>` +
      `<td><span class="tag ${tt.mau}">${esc(tt.chu)}</span></td>` +
      `<td class="sm">${esc(n.ngay_vao || '')}</td>` +
      `<td>${thaoTac}</td>`;
  });
  veTrongNS(DS_NHAN_SU_QT, ds);
}

function locTaiKhoanQT(ds) {
  const k = boDau(($('#qt-tim')?.value || '').trim());
  const vaiTro = $('#qt-locvaitro')?.value || '';
  return ds.filter(n => {
    if (vaiTro && n.vai_tro !== vaiTro) return false;
    if (k && !boDau(`${n.ma_nv || ''} ${n.ho_ten} ${n.ten_dang_nhap || ''}`).includes(k)) return false;
    return true;
  });
}

function xoaLocQT() {
  if ($('#qt-tim')) $('#qt-tim').value = '';
  if ($('#qt-locvaitro')) $('#qt-locvaitro').value = '';
  veBangQtTaiKhoan();
}

function veBangQtTaiKhoan() {
  const nhan_su = DS_NHAN_SU_QT, vai_tro = DS_VAI_TRO_QT;
  const ds = locTaiKhoanQT(nhan_su);
  $('#qtDem').textContent = `${ds.length}/${nhan_su.length} nhân sự · ${nhan_su.filter(n => n.tai_khoan_id).length} có tài khoản`;

  veBang('#qtBang', ds, n => {
    const coTK = !!n.tai_khoan_id;
    const tt = TRANG_THAI[n.trang_thai] || { chu: n.trang_thai, mau: 'mute' };
    const tenVaiTro = coTK ? (vai_tro.find(v => v.ma === n.vai_tro)?.ten || n.vai_tro) : '';
    let cotTK;
    if (!coTK) cotTK = '<span class="tag mute">Chưa có</span>';
    else if (!n.kich_hoat) cotTK = `<span class="tag danger">Đã khoá</span> <span class="sm">${esc(n.ten_dang_nhap)}</span>`;
    else cotTK = `<span class="nm">${esc(n.ten_dang_nhap)}</span>` + (n.phai_doi_mk ? ' <span class="tag warn">chờ đổi MK</span>' : '');

    let thaoTac = '<span class="sm">—</span>';
    if (!coTK) {
      if (TOI.duoc_tao_tai_khoan) {
        const goiY = String(n.sdt || '').replace(/\D/g, '');
        thaoTac = `<button class="btn-nho btn-primary" data-tao="${esc(n.id)}" data-ten-goi-y="${esc(goiY)}" data-ten="${esc(n.ho_ten)}">Tạo tài khoản</button>`;
      }
    } else if (TOI.la_admin) {
      thaoTac = `<button class="btn-nho btn-phu" data-doivaitro="${n.tai_khoan_id}" data-doivaitro-ten="${esc(n.ho_ten)}" data-doivaitro-hientai="${esc(n.vai_tro || '')}">Đổi vai trò</button> ` +
        `<button class="btn-nho btn-phu" data-datlai="${n.tai_khoan_id}">Đặt lại MK</button> ` +
        (n.kich_hoat
          ? `<button class="btn-nho btn-phu" data-khoa="${n.tai_khoan_id}" data-kh="0">Khoá</button>`
          : `<button class="btn-nho btn-phu" data-khoa="${n.tai_khoan_id}" data-kh="1">Mở lại</button>`) +
        ` <button class="btn-nho btn-phu" data-xoatk="${n.tai_khoan_id}" data-xoatk-ten="${esc(n.ho_ten)}">Xoá</button>`;
    }
    return '' +
      `<td><div class="person">${avHtml(n.id, n.viet_tat, n.co_anh)}` +
        `<div><div class="nm">${esc(n.ho_ten)}${n.ma_nv ? ` <span class="sm" style="font-weight:400">· ${esc(n.ma_nv)}</span>` : ''}</div>` +
        `<div class="sm">${esc(n.chuc_vu || tt.chu || '')}</div></div></div></td>` +
      `<td>${esc(n.bo_phan || '—')}</td>` +
      `<td>${cotTK}</td>` +
      `<td class="sm">${esc(tenVaiTro || '—')}</td>` +
      `<td class="qt-thaotac">${thaoTac}</td>`;
  });

  const o = $('#qt-trong');
  if (o) {
    o.hidden = ds.length > 0;
    if (ds.length === 0) {
      o.innerHTML = nhan_su.length === 0
        ? 'Chưa có nhân sự nào.'
        : 'Không tìm thấy kết quả phù hợp. <button type="button" class="btn-nho" id="qt-trongxoaloc">Xoá bộ lọc</button>';
      $('#qt-trongxoaloc')?.addEventListener('click', xoaLocQT);
    }
  }
  const nutLoc = $('#qt-xoaloc');
  if (nutLoc) nutLoc.hidden = !($('#qt-tim')?.value || $('#qt-locvaitro')?.value);
}

/* Mã trạng thái trong database → chữ hiển thị + màu nhãn */
const TRANG_THAI = {
  da_ky:        { chu: 'Đã ký HĐ',     mau: 'ok' },
  thu_viec:     { chu: 'Thử việc',     mau: 'warn' },
  cho_ky:       { chu: 'Chờ ký',       mau: 'warn' },
  can_trao_doi: { chu: 'Cần trao đổi', mau: 'danger' },
  parttime:     { chu: 'Bán thời gian', mau: 'mute' }
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

/* Nhãn 1 dòng cho nhân sự trong dropdown/option — "Mã · Họ tên — Chức vụ".
   Không render dấu "—" trống nếu không có chức vụ (tránh "Tên –" rỗng). */
function nhanNhanSu(n) {
  const ma = n.ma_nv ? `${n.ma_nv} · ` : '';
  const cv = (n.chuc_vu || '').trim();
  return ma + n.ho_ten + (cv ? ` — ${cv}` : '');
}

/* Sắp người cùng phòng ban (đặc biệt Trưởng phòng) lên đầu candidate list
   thay vì thứ tự ngẫu nhiên/ABC — không cần organizational_level hay
   is_managerial, chỉ dùng đúng 1 quan hệ thật đang có: phong_ban.truong_phong_id.
   Nhẹ, không migration, không chặn chọn người ngoài phòng (Sếp vẫn có thể
   cần gán quản lý khác phòng thật). */
function uuTienCungPhongBan(ds, phongBanId) {
  if (!phongBanId) return ds;
  const truongPhongId = DS_PHONG_BAN.find(p => String(p.id) === String(phongBanId))?.truong_phong_id;
  return [...ds].sort((a, b) => {
    const diem = x => x.id === truongPhongId ? 0 : (String(x.phong_ban_id) === String(phongBanId) ? 1 : 2);
    return diem(a) - diem(b);
  });
}

/* Searchable Combobox dùng chung toàn ERP (xem docs/UX_ENGINEERING_STANDARD.md
   — "Long List = Searchable", 1 control duy nhất, không tách ô tìm/dropdown
   riêng). Dùng cho MỌI danh sách dài/có thể tăng: chọn nhân sự (Quản lý
   trực tiếp, Trưởng phòng, Cấp phát tài sản), danh mục nền (Chức danh,
   Phòng ban)... — chỉ cần layTuyChon() trả mảng {gia_tri, nhan}.
   giaTri là <input type="hidden"> giữ id đã chọn (giữ nguyên .value để chỗ
   đọc/ghi cũ không phải đổi). Gõ lọc theo boDau() (không dấu, không phân
   biệt hoa-thường) trên CẢ label hiển thị (đã gồm mã nếu có, VD "01-0003 ·
   Tên" — gõ mã hay tên đều tìm được). Enter chọn dòng đầu, Escape đóng.
   Trả về { capNhatHienThi } để gọi lại khi nạp danh sách/giá trị mới. */
function ganCombo({ hienThi, panel, tim, goiY, giaTri }, layTuyChon, coRong, rongChu) {
  const combo = hienThi.closest('.combo1');
  function capNhatHienThi() {
    const hienTai = layTuyChon().find(t => String(t.gia_tri) === giaTri.value);
    hienThi.querySelector('span').textContent = hienTai ? hienTai.nhan : (rongChu || 'Chọn...');
    hienThi.classList.toggle('rong', !hienTai);
  }
  function ve() {
    const k = boDau((tim.value || '').trim());
    const dsGoc = layTuyChon();
    const loc = k ? dsGoc.filter(t => boDau(t.nhan).includes(k)) : dsGoc;
    const rongHtml = coRong
      ? `<div class="ql-goiy-item${giaTri.value ? '' : ' active'}" data-gt="">${esc(coRong)}</div>` : '';
    goiY.innerHTML = rongHtml + (loc.length
      ? loc.map(t => `<div class="ql-goiy-item${String(t.gia_tri) === giaTri.value ? ' active' : ''}" data-gt="${esc(t.gia_tri)}">${esc(t.nhan)}</div>`).join('')
      : (rongHtml ? '' : '<div class="ql-goiy-trong">Không tìm thấy</div>'));
  }
  function mo() {
    combo.classList.add('mo');
    panel.hidden = false;
    tim.value = '';
    ve();
    tim.focus();
  }
  function dong() {
    combo.classList.remove('mo');
    panel.hidden = true;
  }
  function chon(gt) {
    giaTri.value = gt;
    capNhatHienThi();
    dong();
    hienThi.focus();
  }
  // Gán qua .onclick/.oninput/.onkeydown (không addEventListener) — gọi
  // hàm này nhiều lần (mỗi lần mở modal/nạp lại data) vẫn an toàn, không
  // chồng nhiều listener chạy trùng. Đóng khi click ra ngoài xử lý chung ở
  // 1 listener document duy nhất (xem cuối file), không gắn lại mỗi lần.
  hienThi.onclick = () => (panel.hidden ? mo() : dong());
  tim.oninput = ve;
  goiY.onclick = e => { const it = e.target.closest('[data-gt]'); if (it) chon(it.dataset.gt); };
  tim.onkeydown = e => {
    if (e.key === 'Escape') { dong(); hienThi.focus(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const dau = goiY.querySelector('.ql-goiy-item');
      if (dau) chon(dau.dataset.gt);
    }
  };
  capNhatHienThi();
  return { capNhatHienThi };
}

/* Đóng mọi combobox (.combo1) đang mở khi click ra ngoài — 1 listener
   dùng chung cho toàn trang, không gắn lại theo từng combo. */
document.addEventListener('click', e => {
  document.querySelectorAll('.combo1.mo').forEach(c => {
    if (c.contains(e.target)) return;
    c.classList.remove('mo');
    const p = c.querySelector('.combo1-panel');
    if (p) p.hidden = true;
  });
});

/* Hộp nhập nhanh dùng chung — thay prompt()/confirm() tự do của trình
   duyệt bằng modal cùng khuôn với Sửa hồ sơ nhân sự. loai: 'text' | 'select'
   | 'textarea'. xuLyLuu(giaTri) ném lỗi thì hiện form-loi, không đóng hộp. */
function moHopNhap({ tieuDe, loai = 'text', nhan = '', giaTri = '', placeholder = '', tuyChon = [], xuLyLuu }) {
  const nen = $('#hopNhapModalNen');
  $('#hopNhap-tieude').textContent = tieuDe;
  const oNhan = $('#hopNhap-nhan');
  oNhan.textContent = nhan; oNhan.hidden = !nhan;

  const oInput = $('#hopNhap-input'), oSelect = $('#hopNhap-select'), oTextarea = $('#hopNhap-textarea');
  const oSelectCombo = $('#hopNhap-selectcombo');
  oInput.hidden = true; oSelectCombo.hidden = true; oTextarea.hidden = true;
  let o;
  if (loai === 'select') {
    oSelect.value = giaTri || '';
    ganCombo({
      hienThi: $('#hopNhap-selecthienthi'), panel: $('#hopNhap-selectpanel'),
      tim: $('#hopNhap-selecttim'), goiY: $('#hopNhap-selectgoiy'), giaTri: oSelect
    }, () => tuyChon, null, 'Chọn...');
    oSelectCombo.hidden = false;
    o = $('#hopNhap-selecthienthi');
  } else if (loai === 'textarea') {
    o = oTextarea; oTextarea.value = giaTri || ''; oTextarea.placeholder = placeholder;
    o.hidden = false;
  } else {
    o = oInput; oInput.value = giaTri || ''; oInput.placeholder = placeholder;
    o.hidden = false;
  }
  $('#hopNhap-loi').textContent = '';
  nen.hidden = false;
  o.focus();

  const form = $('#hopNhapForm');
  const nut = $('#hopNhap-luu');
  function dong() {
    nen.hidden = true;
    form.removeEventListener('submit', onSubmit);
    $('#hopNhap-huy').removeEventListener('click', dong);
    nen.removeEventListener('click', onNenClick);
  }
  async function onSubmit(e) {
    e.preventDefault();
    const val = loai === 'select' ? oSelect.value
      : loai === 'textarea' ? oTextarea.value.trim()
      : oInput.value.trim();
    nut.disabled = true;
    try {
      await xuLyLuu(val);
      dong();
    } catch (err) {
      $('#hopNhap-loi').textContent = err.message || 'Không lưu được, thử lại nhé.';
    } finally {
      nut.disabled = false;
    }
  }
  function onNenClick(e) { if (e.target === nen) dong(); }
  form.addEventListener('submit', onSubmit);
  $('#hopNhap-huy').addEventListener('click', dong);
  nen.addEventListener('click', onNenClick);
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

/* Dựng option cho dropdown Phòng ban/Chức danh/Đơn vị tính — lọc bỏ hàng
   đã ẩn NHƯNG vẫn giữ đúng hàng đang được chọn hiện tại (nếu record đang
   sửa lỡ gắn vào 1 mục đã bị ẩn sau đó, để mất trắng lựa chọn hiện tại còn
   tệ hơn là cho thấy nó kèm nhãn "(đã ẩn)"). */
function tuyChonDanhMuc(ds, hienTaiId) {
  const hienTai = String(hienTaiId || '');
  const list = ds.filter(x => x.hoat_dong || String(x.id) === hienTai);
  return '<option value="">— Chưa chọn —</option>' +
    list.map(x => `<option value="${x.id}">${esc(x.ten)}${x.hoat_dong ? '' : ' (đã ẩn)'}</option>`).join('');
}

/* Cùng logic lọc với tuyChonDanhMuc() nhưng trả {gia_tri, nhan} cho
   ganCombo() thay vì chuỗi <option> — dùng cho Chức danh/Phòng ban khi
   hiển thị dạng Searchable Combobox (≥8 dòng hoặc danh mục có thể tăng —
   xem docs/UX_ENGINEERING_STANDARD.md). */
function dsCandidateDanhMuc(ds, hienTaiId) {
  const hienTai = String(hienTaiId || '');
  return ds.filter(x => x.hoat_dong || String(x.id) === hienTai)
    .map(x => ({ gia_tri: x.id, nhan: x.ten + (x.hoat_dong ? '' : ' (đã ẩn)') }));
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
let nhomVuaVe = null;
TAB.forEach(t => {
  if (t.nhom && t.nhom !== nhomVuaVe) {
    nav.appendChild(el('div', 'sb-nhom', esc(t.nhom)));
  }
  nhomVuaVe = t.nhom;

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

/* Nhãn trạng thái công việc — PHẢI khai báo TRƯỚC khối init bên dưới, vì
   khoiDongCongViec() được gọi sớm (Trạm Mục Tiêu nằm trong Tổng quan) và
   taiLai() dùng ngay hằng này. Để dưới sẽ dính "temporal dead zone" của
   const -> bảng "Việc tôi giao" ném lỗi, hiện trống (bắt được 21/08/2026). */
const CV_TRANG_THAI = {
  moi:        { chu: 'Mới giao',    mau: 'mute' },
  dang_lam:   { chu: 'Đang làm',    mau: 'warn' },
  cho_duyet:  { chu: 'Chờ duyệt',   mau: 'sage' },
  hoan_thanh: { chu: 'Hoàn thành',  mau: 'ok' },
  huy:        { chu: 'Đã huỷ',      mau: 'danger' }
};

await khoiDongVinhDanh();
await khoiDongMucTieu();

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

/* -- Trạm Mục Tiêu: giao việc cho nhân viên (máy chủ thật) -- */
if (TOI.quyen.includes('congviec')) {
  try { await khoiDongCongViec(); } catch (e) { console.error('Trạm Mục Tiêu:', e); }
  try { await veTongQuanTheoVaiTro(); } catch (e) { console.error('Tóm tắt Tổng quan:', e); }
}

/* -- Lịch sử làm việc (máy chủ thật) -- */
if (TOI.quyen.includes('lichsuviec')) {
  try { await khoiDongLichSuViec(); } catch (e) { console.error('Lịch sử làm việc:', e); }
}

/* -- Chat nội bộ (máy chủ thật) -- */
if (TOI.quyen.includes('chat')) {
  try { await khoiDongChat(); } catch (e) { console.error('Chat nội bộ:', e); }
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
        `💡 <span>${esc(kq.goi_y.nguoi_nhan_ten)} vừa hoàn thành ${kq.goi_y.so_viec} việc ở Trạm Mục Tiêu tuần này</span>` +
        `<button type="button" class="btn-nho" id="vd-goiy-nut">Vinh danh luôn</button>`;
      $('#vd-goiy-nut').addEventListener('click', () => {
        dongMoFormVd(true);
        chonNguoi.value = kq.goi_y.nguoi_nhan_id;
        $('#vd-noidung').value = `Hoàn thành ${kq.goi_y.so_viec} việc ở Trạm Mục Tiêu tuần này, làm tốt lắm!`;
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
   TÓM TẮT TRẠM MỤC TIÊU THEO VAI TRÒ — Employee/Manager = Action/Exception
   First (Việc cần làm lên trước Mục Tiêu); Admin = Decision First (giữ Mục
   Tiêu trước, thêm cảnh báo mục tiêu công ty chưa chốt + doanh thu thật).
   CHỈ dùng dữ liệu thật đã có sẵn (cvDanhSach/mtDanhSach/doanh thu) —
   không tự bịa số liệu; rỗng thì ẩn hẳn khối, không hiện khối trống.
   ========================================================================== */
async function veTongQuanTheoVaiTro() {
  if (!TOI.quyen.includes('congviec')) return;

  let cv, mt;
  try { [cv, mt] = await Promise.all([API.cvDanhSach(), API.mtDanhSach()]); }
  catch { return; }

  const homNay = new Date().toISOString().slice(0, 10);
  const chuaXong = c => !['hoan_thanh', 'huy'].includes(c.trang_thai);
  const nhan = (cv.nhan || []).filter(chuaXong);
  const giao = (cv.giao || []).filter(chuaXong);
  const quaHanNhan = nhan.filter(c => c.han_chot && c.han_chot < homNay).length;
  const quaHanGiao = giao.filter(c => c.han_chot && c.han_chot < homNay).length;
  const choDuyetGiao = giao.filter(c => c.trang_thai === 'cho_duyet').length;

  const the = [];
  const canhBao = [];

  if (TOI.la_admin) {
    ((mt.cong_ty || [])).filter(m => m.trang_thai === 'dang_thuc_hien' && !m.da_chot)
      .forEach(m => canhBao.push({ m: 'warn', b: `Mục tiêu công ty "${m.tieu_de}" chưa chốt`, s: 'Vào khối Trạm Mục Tiêu bên dưới để chốt', t: 'Mục tiêu' }));
    if (quaHanGiao > 0) canhBao.push({ m: 'danger', b: `${quaHanGiao} việc đã giao đang quá hạn`, s: '', t: 'Công việc' });
    if (choDuyetGiao > 0) canhBao.push({ m: 'warn', b: `${choDuyetGiao} việc đang chờ Sếp duyệt`, s: '', t: 'Công việc' });

    try {
      const dt = await API.kdTongQuanDoanhThu();
      if (dt.co_bang) {
        the.push({ k: 'Doanh thu hôm nay', v: tienVN(dt.hom_nay.tong_tien) + ' đ', d: `${dt.hom_nay.so_don} đơn` });
      }
    } catch { /* chưa nạp migration đơn hàng ở môi trường này — im lặng bỏ qua */ }
  } else {
    the.push({ k: 'Việc đang mở', v: String(nhan.length), d: 'Việc cần làm của tôi' });
    the.push({ k: 'Việc quá hạn', v: String(quaHanNhan), d: quaHanNhan ? 'Cần xử lý ngay' : 'Không có', dir: quaHanNhan ? 'down' : '' });
    if (giao.length > 0) the.push({ k: 'Việc tôi giao — chờ duyệt', v: String(choDuyetGiao), d: `${giao.length} việc đang giao` });
  }

  if (the.length) { veThe('#tq-tomtat', the); $('#tq-tomtat').hidden = false; }
  if (canhBao.length) { veDanhSach('#tq-canhbao-that', canhBao); $('#tq-canhbao-panel').hidden = false; }

  // Employee/Manager: đẩy "Việc cần làm" lên TRƯỚC khối Mục Tiêu (Action/
  // Exception First). Admin giữ nguyên thứ tự mặc định trong HTML (Mục
  // Tiêu trước — Decision First). Chỉ đổi VỊ TRÍ hiển thị, không đổi dữ
  // liệu/logic — .mt-panel/#cvSeg là các khối DOM đã render sẵn.
  if (!TOI.la_admin) {
    const khoiMucTieu = document.querySelector('.mt-panel');
    const segViec = $('#cvSeg');
    if (khoiMucTieu && segViec) {
      [segViec, $('#cv-pane-nhan'), $('#cv-pane-phoihop'), $('#cv-pane-giao')].forEach(el => {
        if (el) khoiMucTieu.parentNode.insertBefore(el, khoiMucTieu);
      });
    }
  }
}

/* ==========================================================================
   MỤC TIÊU (MBOs) — Công ty -> Phòng ban, theo quý. Tiến độ tự tính từ %
   công việc (Trạm Mục Tiêu) đã gắn vào mục tiêu mà trạng thái = hoàn_thành.
   ========================================================================== */
async function khoiDongMucTieu() {
  // Tạo mục tiêu MỚI giờ nằm trong hộp "+ Giao Mục Tiêu" (khoiDongCongViec
  // gọi thẳng API.mtTao rồi window.LAM_MOI_MUCTIEU() để làm mới thẻ ở đây)
  // — Sếp Ngọc chốt 21/08/2026: "thêm mục tiêu và giao mục tiêu bản chất
  // như nhau, giao mục tiêu vẫn có mục giao cho tôi, đang trùng lặp thừa
  // thãi, gộp chung đi". Hộp mt-form ở đây giờ CHỈ CÒN dùng để SỬA mục tiêu
  // đã có (mtCapNhat không đổi được cấp/phòng ban nên hộp sửa không cần 2
  // trường đó nữa).
  const mtFormModal = $('#mtFormModalNen');
  let mtDangSuaId = null;

  function moFormSua(m) {
    mtDangSuaId = m.id;
    $('#mt-tieu-de').value = m.tieu_de;
    $('#mt-mo-ta').value = m.mo_ta || '';
    mtFormModal.hidden = false;
  }
  function dongMoFormMt() {
    mtFormModal.hidden = true;
    mtDangSuaId = null;
    $('#mt-form').reset();
  }
  mtFormModal.addEventListener('click', e => { if (e.target === mtFormModal) dongMoFormMt(); });
  $('#mt-nut-huy').addEventListener('click', dongMoFormMt);

  function veThe1MucTieu(m) {
    const pct = m.so_viec > 0 ? Math.round((m.so_viec_xong / m.so_viec) * 100) : 0;
    const mauBar = pct >= 70 ? '' : (pct >= 40 ? 'warn' : 'danger');  // màu thanh .bar>i
    // Màu số % + viền trái thẻ. Mục chưa chia việc (0 việc) để trung tính (xám),
    // không tô đỏ như thể đang bết bát.
    const mucMau = m.so_viec === 0 ? 'cho'
                 : (pct >= 70 ? 'ok' : (pct >= 40 ? 'warn' : 'danger'));
    const daXong = m.trang_thai === 'hoan_thanh';
    const daHuy = m.trang_thai === 'huy';

    // Badge gọn: cấp công ty -> nút/chốt; cấp phòng ban -> tên bộ phận; cấp
    // cá nhân -> không cần chip riêng (tên người đã hiện sẵn ở dòng dưới).
    let badge;
    if (m.cap === 'cong_ty') {
      badge = m.da_chot
        ? `<span class="mt-chip ok" title="Chốt bởi ${esc(m.chot_boi || '')}">✓ Đã chốt</span>`
        : (TOI.la_admin
            ? `<button type="button" class="btn-nho btn-primary" data-mt-chot="${m.id}">Chốt</button>`
            : `<span class="mt-chip warn">Chưa chốt</span>`);
    } else if (m.cap === 'phong_ban') {
      badge = `<span class="mt-chip mute">${esc(m.bo_phan || '')}</span>`;
    } else {
      badge = `<span class="mt-chip mute">🙋 Cá nhân</span>`;
    }
    if (daXong) badge += ` <span class="mt-chip ok">Hoàn thành</span>`;
    else if (daHuy) badge += ` <span class="mt-chip danger">Đã huỷ</span>`;

    // Sửa được khi chưa xong/huỷ/chốt (mục tiêu công ty ĐÃ CHỐT thì khoá hẳn —
    // Sếp Ngọc xác nhận 21/08/2026: "cấp công ty thì tôi sẽ không sửa vì đã
    // chốt rồi nhưng bình thường sẽ phải chỉnh cho phù hợp tình hình cụ thể").
    const duocSua = (m.nguoi_tao_id === TOI.id || TOI.la_admin) && !daXong && !daHuy && !m.da_chot;
    const nutSua = duocSua
      ? `<span class="mt-the-nut"><button type="button" class="btn-nho" data-mt-sua="${m.id}">Sửa</button> <button type="button" class="btn-nho" data-mt-xong="${m.id}">Xong</button> <button type="button" class="btn-nho" data-mt-huy="${m.id}">Huỷ</button></span>`
      : '';

    // Thẻ nhỏ gọn: hàng 1 = tên (cắt 1 dòng, rê chuột hiện đủ) + % nổi bật;
    // hàng 2 = thanh tiến độ; hàng 3 = mô tả 1 dòng; hàng 4 = badge + số việc + nút.
    // Bấm vào thẻ (ngoài nút Xong/Huỷ/Chốt) → mở hộp chi tiết xem việc gắn vào.
    const r = el('div', 'mt-the ' + mucMau + (daHuy ? ' mo' : ''),
      `<div class="mt-the-top">` +
        `<div class="mt-the-tt" title="${esc(m.tieu_de)}">${esc(m.tieu_de)}</div>` +
        `<div class="mt-the-pct ${mucMau}">${pct}<span>%</span></div>` +
      `</div>` +
      `<div class="bar mt-the-bar"><i class="${mauBar}" style="width:0"></i></div>` +
      (m.mo_ta ? `<div class="mt-the-mo" title="${esc(m.mo_ta)}">${esc(m.mo_ta)}</div>` : '') +
      `<div class="mt-the-meta">${badge}` +
        `<span class="mt-the-viec">${m.so_viec_xong}/${m.so_viec} việc · ${esc(m.nguoi_tao_ten)}</span>` +
        nutSua +
      `</div>`);
    r.dataset.mtId = m.id;
    requestAnimationFrame(() => { r.querySelector('.bar > i').style.width = pct + '%'; });
    return r;
  }

  let DS_MT = [];   // cả 3 cấp, dùng chung để đổ dropdown "Thuộc mục tiêu" ở Trạm Mục Tiêu

  async function taiLaiMucTieu() {
    const kq = await API.mtDanhSach();
    $('#mt-ky-hint').textContent = `Quý ${kq.quy}/${kq.nam}`;
    DS_MT = [...(kq.cong_ty || []), ...(kq.phong_ban || []), ...(kq.ca_nhan || [])];

    const oCT = $('#mt-congty-list'); oCT.innerHTML = '';
    (kq.cong_ty || []).forEach(m => oCT.appendChild(veThe1MucTieu(m)));
    $('#mt-congty-trong').hidden = (kq.cong_ty || []).length > 0;

    const oPB = $('#mt-phongban-list'); oPB.innerHTML = '';
    (kq.phong_ban || []).forEach(m => oPB.appendChild(veThe1MucTieu(m)));
    $('#mt-phongban-trong').hidden = (kq.phong_ban || []).length > 0;

    const oCN = $('#mt-canhan-list'); oCN.innerHTML = '';
    (kq.ca_nhan || []).forEach(m => oCN.appendChild(veThe1MucTieu(m)));
    $('#mt-canhan-trong').hidden = (kq.ca_nhan || []).length > 0;

    // Đổ dropdown "Thuộc mục tiêu" trong form Giao Mục Tiêu — giữ nguyên tuỳ
    // chọn "+ Tạo mục tiêu mới…" (hardcode sẵn trong app.html) ở đầu danh
    // sách, đổ lại tự động mỗi khi rebuild nên phải nối tay vào lại đây.
    const oSel = $('#cv-muc-tieu');
    if (oSel) {
      const dangChon = oSel.value;
      const nhanCap = m => m.cap === 'cong_ty' ? 'Công ty' : (m.cap === 'phong_ban' ? esc(m.bo_phan) : 'Cá nhân');
      oSel.innerHTML = '<option value="">— Không gắn mục tiêu —</option>' +
        '<option value="_moi_">+ Tạo mục tiêu mới…</option>' +
        DS_MT.filter(m => m.trang_thai === 'dang_thuc_hien').map(m =>
          `<option value="${m.id}">[${nhanCap(m)}] ${esc(m.tieu_de)}</option>`).join('');
      oSel.value = dangChon;
    }
  }
  window.LAM_MOI_MUCTIEU = taiLaiMucTieu;

  $('#mt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#mt-loi').textContent = '';
    const nut = $('#mt-nut-luu');
    nut.disabled = true;
    try {
      await API.mtCapNhat(mtDangSuaId, {
        tieu_de: $('#mt-tieu-de').value.trim(),
        mo_ta: $('#mt-mo-ta').value.trim()
      });
      dongMoFormMt();
      await taiLaiMucTieu();
    } catch (err) {
      $('#mt-loi').textContent = err.message || 'Không lưu được, thử lại nhé.';
    } finally {
      nut.disabled = false;
    }
  });

  // Hộp chi tiết mục tiêu (bấm vào thẻ .mt-the) — cùng khuôn mẫu modal-nen/
  // modal dùng ở Kho (xem kvModal). Danh sách việc lấy TOÀN CỤC (không lọc
  // theo người xem), khớp đúng cách so_viec/so_viec_xong đã đếm ở MT_COT.
  const mtModal = $('#mtModalNen');
  $('#mtModalDong').addEventListener('click', () => { mtModal.hidden = true; });
  mtModal.addEventListener('click', e => { if (e.target === mtModal) mtModal.hidden = true; });

  let mtDangXem = null;   // mục tiêu đang mở trong hộp chi tiết — để nút "+ Thêm việc" biết gắn vào đâu
  $('#mtModalThemViec').addEventListener('click', () => {
    if (!mtDangXem) return;
    mtModal.hidden = true;
    const nguoiNhan = mtDangXem.cap === 'ca_nhan' ? mtDangXem.nguoi_tao_id : null;
    if (window.MO_FORM_GIAO_VIEC) window.MO_FORM_GIAO_VIEC(mtDangXem.id, nguoiNhan);
  });

  function dongHanMt(hanChot) {
    if (!hanChot) return '—';
    const quaHan = hanChot < new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const [nam, thang, ngay] = hanChot.split('-');
    return `<span class="${quaHan ? 'canh-bao-chu' : ''}">${ngay}/${thang}/${nam}</span>`;
  }

  async function moChiTietMucTieu(id) {
    const m = DS_MT.find(x => String(x.id) === String(id));
    if (!m) return;
    mtDangXem = m;
    const pct = m.so_viec > 0 ? Math.round((m.so_viec_xong / m.so_viec) * 100) : 0;
    const mauBar = pct >= 70 ? '' : (pct >= 40 ? 'warn' : 'danger');
    const nhanCap = m.cap === 'cong_ty' ? 'Cấp công ty'
                  : (m.cap === 'phong_ban' ? `Cấp phòng ban · ${esc(m.bo_phan || '')}` : 'Cấp cá nhân');

    $('#mtModalCap').textContent = nhanCap;
    $('#mtModalTen').textContent = m.tieu_de;
    $('#mtModalMo').textContent = m.mo_ta || '';
    $('#mtModalMo').hidden = !m.mo_ta;
    $('#mtModalPct').textContent = pct + '%';
    $('#mtModalViec').innerHTML = '';
    $('#mtModalViecTrong').hidden = true;
    mtModal.hidden = false;
    requestAnimationFrame(() => {
      const i = $('#mtModalBarI');
      i.className = mauBar;
      i.style.width = pct + '%';
    });

    let viec = [];
    try { ({ viec } = await API.mtViec(m.id)); } catch { /* im lặng — modal vẫn hiện phần đầu */ }
    veBang('#mtModalViec', viec, v => {
      const tt = CV_TRANG_THAI[v.trang_thai] || CV_TRANG_THAI.moi;
      return `<td><div class="nm">${esc(v.tieu_de)}</div>${v.dau_ra ? `<div class="sm">${esc(v.dau_ra)}</div>` : ''}${v.phoi_hop_ten ? `<div class="sm">🤝 Phối hợp: ${esc(v.phoi_hop_ten)}</div>` : ''}</td>` +
        `<td class="sm">${esc(v.nguoi_nhan_ten)}</td>` +
        `<td class="sm">${esc(v.nguoi_giao_ten)}</td>` +
        `<td class="sm">${dongHanMt(v.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>`;
    });
    $('#mtModalViecTrong').hidden = viec.length > 0;
  }

  async function xuLyNutMucTieu(e) {
    const nutSua = e.target.closest('[data-mt-sua]');
    if (nutSua) {
      const m = DS_MT.find(x => String(x.id) === String(nutSua.getAttribute('data-mt-sua')));
      if (m) moFormSua(m);
      return;
    }
    const nutChot = e.target.closest('[data-mt-chot]');
    const nutXong = e.target.closest('[data-mt-xong]');
    const nutHuy = e.target.closest('[data-mt-huy]');
    const nut = nutChot || nutXong || nutHuy;
    if (!nut) {
      const the = e.target.closest('.mt-the');
      if (the && the.dataset.mtId) await moChiTietMucTieu(the.dataset.mtId);
      return;
    }
    const dangLam = nut.textContent;
    nut.disabled = true;
    try {
      if (nutChot) {
        if (!confirm('Chốt mục tiêu này? Sau khi chốt sẽ KHOÁ, không sửa/huỷ được nữa.')) { nut.disabled = false; return; }
        await API.mtChot(nut.getAttribute('data-mt-chot'));
      } else if (nutXong) {
        await API.mtCapNhat(nut.getAttribute('data-mt-xong'), { trang_thai: 'hoan_thanh' });
      } else if (nutHuy) {
        if (!confirm('Huỷ mục tiêu này?')) { nut.disabled = false; return; }
        await API.mtCapNhat(nut.getAttribute('data-mt-huy'), { trang_thai: 'huy' });
      }
      await taiLaiMucTieu();
    } catch (err) {
      alert(err.message || 'Không thực hiện được, thử lại nhé.');
      nut.disabled = false;
      nut.textContent = dangLam;
    }
  }
  $('#mt-congty-list').addEventListener('click', xuLyNutMucTieu);
  $('#mt-phongban-list').addEventListener('click', xuLyNutMucTieu);
  $('#mt-canhan-list').addEventListener('click', xuLyNutMucTieu);

  await taiLaiMucTieu();
}

/* ==========================================================================
   TRẠM VIỆC — giao việc cho nhân viên. Theo tinh thần MBOs (quản lý theo mục
   tiêu): mỗi việc BẮT BUỘC có "đầu ra cụ thể", không chỉ mô tả làm gì.
   Luồng trạng thái: moi -> dang_lam -> cho_duyet -> hoan_thanh (hoặc huy).
   (Nhãn CV_TRANG_THAI đã dời lên đầu file — xem ghi chú ở đó.)
   ========================================================================== */

async function khoiDongCongViec() {
  const { danh_ba } = await API.danhBa();
  const chonNguoiNhan = $('#cv-nguoi-nhan');
  const oPhoiHop = $('#cv-phoi-hop');

  // Cho tự giao cho MÌNH = todo cá nhân (việc cần làm của bản thân). Ghim lên
  // đầu danh sách cho dễ thấy.
  const oToi = document.createElement('option');
  oToi.value = TOI.id;
  oToi.textContent = '🙋 Tôi — việc cần làm của tôi (todo cá nhân)';
  chonNguoiNhan.appendChild(oToi);

  danh_ba.filter(n => n.id !== TOI.id).forEach(n => {
    const o = document.createElement('option');
    o.value = n.id; o.textContent = `${n.ho_ten} — ${n.chuc_vu || ''}`;
    chonNguoiNhan.appendChild(o);
    if (oPhoiHop) {
      const lbl = document.createElement('label');
      lbl.className = 'cv-ph-item';
      lbl.dataset.ten = boDau(n.ho_ten);
      lbl.innerHTML = `<input type="checkbox" value="${esc(n.id)}"><span>${esc(n.ho_ten)}</span>`;
      oPhoiHop.appendChild(lbl);
    }
  });

  // Công ty càng đông, danh sách càng dài → cho gõ lọc tên thay vì cuộn tìm.
  // Không bỏ chọn khi lọc — người đã tick vẫn giữ, chỉ đang tạm bị ẩn đi.
  const oTimPhoiHop = $('#cv-phoi-hop-tim');
  if (oTimPhoiHop && oPhoiHop) {
    oTimPhoiHop.addEventListener('input', e => {
      const k = boDau(e.target.value.trim());
      let coHien = false;
      oPhoiHop.querySelectorAll('.cv-ph-item').forEach(lbl => {
        const khop = !k || lbl.dataset.ten.includes(k);
        lbl.classList.toggle('an', !khop);
        if (khop) coHien = true;
      });
      let oTrong = oPhoiHop.querySelector('.cv-ph-trong');
      if (!coHien) {
        if (!oTrong) {
          oTrong = el('div', 'cv-ph-trong', 'Không tìm thấy ai khớp.');
          oPhoiHop.appendChild(oTrong);
        }
      } else if (oTrong) {
        oTrong.remove();
      }
    });
  }

  // "+ Giao Mục Tiêu" mở HỘP GIỮA MÀN HÌNH (modal) — cùng kiểu với hộp
  // "+ Thêm mục tiêu" cạnh nó, khỏi lệch chỗ sổ ra như trước (Sếp Ngọc bắt
  // lỗi 21/08/2026: "ngáo đét, sổ ra màn hình phụ đi cho dễ làm").
  const cvFormModal = $('#cvFormModalNen');
  function dongMoFormCv(hienForm) { cvFormModal.hidden = !hienForm; }
  $('#cv-nut-mo-form').addEventListener('click', () => dongMoFormCv(true));
  cvFormModal.addEventListener('click', e => { if (e.target === cvFormModal) dongMoFormCv(false); });
  $('#cv-nut-huy').addEventListener('click', () => {
    $('#cv-form').reset();
    dongMoFormCv(false);
    moTuyChon(false);
    capNhatMtmKhoi();
    apDungCheDoTodo();
  });

  // Form THÍCH ỨNG: chọn "Tôi" -> todo cá nhân, đầu ra để tuỳ chọn + đổi chữ
  // nút cho đúng ngữ cảnh (thêm việc cho mình chứ không phải "giao" cho ai).
  const oDauRa = $('#cv-dau-ra');
  const nhanDauRa = oDauRa ? oDauRa.closest('.field')?.querySelector('label') : null;
  const chuDauRaGoc = nhanDauRa ? nhanDauRa.innerHTML : '';
  function apDungCheDoTodo() {
    const laToi = chonNguoiNhan.value === TOI.id;
    if (oDauRa) oDauRa.required = !laToi;
    if (nhanDauRa) nhanDauRa.innerHTML = laToi
      ? 'Đầu ra cụ thể cần đạt <span class="hint">(tuỳ chọn với việc của mình)</span>'
      : chuDauRaGoc;
    $('#cv-nut-luu').textContent = laToi ? '+ Thêm việc cần làm' : 'Giao việc';
  }
  chonNguoiNhan.addEventListener('change', apDungCheDoTodo);
  apDungCheDoTodo();

  // Form gọn: mục tiêu/phối hợp/ghi chú thêm gộp sau 1 nút "+ Thêm tuỳ chọn",
  // ẩn mặc định — 4 ô chính (Giao cho ai/Tên việc/Đầu ra/Hạn chót) là đủ cho
  // phần lớn việc, đỡ rối mắt (Sếp Ngọc chốt 21/08/2026: "thiết kế gọn, dễ
  // làm, dễ hiểu thôi nhé").
  const oTuyChon = $('#cv-tuychon-them');
  const nutTuyChon = $('#cv-nut-tuychon');
  function moTuyChon(hien) {
    oTuyChon.hidden = !hien;
    nutTuyChon.textContent = hien ? '− Ẩn tuỳ chọn thêm' : '+ Thêm tuỳ chọn (mục tiêu, người phối hợp, ghi chú)';
  }
  nutTuyChon.addEventListener('click', () => moTuyChon(oTuyChon.hidden));

  // "+ Tạo mục tiêu mới…" ngay trong dropdown "Thuộc mục tiêu" — gộp tạo
  // mục tiêu vào thẳng đây, khỏi phải làm 2 bước ở 2 chỗ khác nhau (Sếp
  // Ngọc chốt 21/08/2026: "thêm mục tiêu và giao mục tiêu bản chất như
  // nhau, giao mục tiêu vẫn có mục giao cho tôi, đang trùng lặp thừa thãi
  // — gộp chung đi"). Chỉ Admin mới thấy lựa chọn "Công ty".
  const oCvMucTieu = $('#cv-muc-tieu');
  const oMtmKhoi = $('#cv-mtm-khoi');
  const oMtmCap = $('#cv-mtm-cap');
  const oMtmBoPhanField = $('#cv-mtm-field-bophan');
  const oMtmTieuDe = $('#cv-mtm-tieude');
  const oMoTaHint = $('#cv-mo-ta-hint');
  if (TOI.la_admin) $('#cv-mtm-opt-congty').hidden = false;

  function capNhatMtmBoPhan() {
    oMtmBoPhanField.hidden = (oMtmCap.value !== 'phong_ban');
  }
  oMtmCap.addEventListener('change', capNhatMtmBoPhan);
  capNhatMtmBoPhan();

  function capNhatMtmKhoi() {
    const taoMoi = oCvMucTieu.value === '_moi_';
    oMtmKhoi.hidden = !taoMoi;
    oMoTaHint.textContent = taoMoi ? '(cũng dùng làm mô tả cho mục tiêu mới)' : '';
    // Gợi ý sẵn tên mục tiêu = tên việc — mục tiêu cá nhân thường trùng tên
    // việc luôn, đỡ phải gõ lại; vẫn sửa được nếu muốn khác.
    if (taoMoi && !oMtmTieuDe.value) oMtmTieuDe.value = $('#cv-tieu-de').value.trim();
  }
  oCvMucTieu.addEventListener('change', capNhatMtmKhoi);

  // Bấm "+ Thêm việc cho mục tiêu này" trong hộp chi tiết mục tiêu (Trạm Mục
  // Tiêu, khoiDongMucTieu bên dưới) → mở thẳng form giao việc, tự chọn sẵn
  // đúng mục tiêu đó (Sếp Ngọc: "mục tiêu 0/0 việc thì điền todo kiểu gì" —
  // trước đây phải tự mở form rồi tự tìm đúng mục tiêu trong dropdown).
  // Mục tiêu CÁ NHÂN thì chọn luôn sẵn người nhận = chủ mục tiêu đó — vừa
  // đúng người khi chính họ tự thêm việc, vừa đúng khi quản lý trực tiếp mở
  // mục tiêu của nhân viên rồi thêm việc thay (Sếp Ngọc yêu cầu 21/08/2026:
  // "cá nhân đó hoặc quản lý trực tiếp thêm vào đó"). Mở sẵn khối "tuỳ chọn"
  // để thấy rõ mục tiêu đã được chọn — không thì ẩn đi, tưởng chưa gắn.
  window.MO_FORM_GIAO_VIEC = (mucTieuId, nguoiNhanId) => {
    dongMoFormCv(true);
    if (nguoiNhanId) chonNguoiNhan.value = nguoiNhanId;
    if (mucTieuId) { oCvMucTieu.value = mucTieuId; capNhatMtmKhoi(); moTuyChon(true); }
    apDungCheDoTodo();
  };

  // Chuyển màn Việc tôi nhận / Việc tôi giao
  $('#cvSeg').addEventListener('click', (e) => {
    const nut = e.target.closest('.seg-nut');
    if (!nut) return;
    document.querySelectorAll('#cvSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    ['nhan', 'phoihop', 'giao'].forEach(k => {
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
      // Trong "Việc cần làm", người nhận luôn là tôi; nếu người giao cũng là
      // tôi => TODO CÁ NHÂN: bấm 1 phát là XONG, khỏi nộp + chờ duyệt.
      const laTodo = r.nguoi_giao_id === TOI.id;
      const chuaXong = ['moi', 'dang_lam', 'cho_duyet'].includes(r.trang_thai);
      let nut = '';
      if (laTodo) {
        if (chuaXong) nut = `<button type="button" class="btn-nho btn-primary" data-cv-xongngay="${r.id}">✓ Xong</button>` +
          ` <button type="button" class="btn-nho" data-cv-huy="${r.id}">Bỏ</button>`;
      } else if (r.trang_thai === 'moi') {
        nut = `<button type="button" class="btn-nho btn-primary" data-cv-batdau="${r.id}">Bắt đầu làm</button>`;
      } else if (r.trang_thai === 'dang_lam') {
        nut = `<button type="button" class="btn-nho btn-primary" data-cv-nop="${r.id}">Nộp kết quả</button>`;
      }
      const nhanTodo = laTodo ? ` <span class="tag sage">🙋 Việc của tôi</span>` : '';
      return `<td><div class="nm">${esc(r.tieu_de)}${nhanTodo}</div>${r.mo_ta ? `<div class="sm">${esc(r.mo_ta)}</div>` : ''}${r.phoi_hop_ten ? `<div class="sm">🤝 Phối hợp: ${esc(r.phoi_hop_ten)}</div>` : ''}${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${esc(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm">${esc(r.dau_ra) || '—'}</td>` +
        `<td class="sm">${laTodo ? '— (của tôi)' : esc(r.nguoi_giao_ten)}</td>` +
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
      return `<td><div class="nm">${esc(r.tieu_de)}</div>${r.mo_ta ? `<div class="sm">${esc(r.mo_ta)}</div>` : ''}${r.phoi_hop_ten ? `<div class="sm">🤝 Phối hợp: ${esc(r.phoi_hop_ten)}</div>` : ''}${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${esc(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm">${esc(r.dau_ra)}</td>` +
        `<td class="sm">${esc(r.nguoi_nhan_ten)}</td>` +
        `<td class="sm">${dongHan(r.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>` +
        `<td style="white-space:nowrap">${nut}</td>`;
    });
    $('#cv-trong-giao').hidden = (kq.giao || []).length > 0;

    // Việc mình được mời PHỐI HỢP — CHỈ THEO DÕI, không báo cáo/chuyển trạng
    // thái thay người chính (Sếp Ngọc chốt 20/08/2026: giữ đúng 1 đầu mối
    // chịu trách nhiệm báo cáo cho mỗi việc, phối hợp chỉ để biết & hỗ trợ).
    veBang('#cv-bang-phoihop', kq.phoi_hop || [], r => {
      const tt = CV_TRANG_THAI[r.trang_thai] || CV_TRANG_THAI.moi;
      return `<td><div class="nm">${esc(r.tieu_de)}</div>${r.mo_ta ? `<div class="sm">${esc(r.mo_ta)}</div>` : ''}</td>` +
        `<td class="sm">${esc(r.dau_ra)}</td>` +
        `<td class="sm">${esc(r.nguoi_nhan_ten)}</td>` +
        `<td class="sm">${esc(r.nguoi_giao_ten)}</td>` +
        `<td class="sm">${dongHan(r.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>`;
    });
    $('#cv-trong-phoihop').hidden = (kq.phoi_hop || []).length > 0;
  }

  $('#cv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#cv-loi').textContent = '';
    const nut = $('#cv-nut-luu');
    nut.disabled = true;
    const moTa = $('#cv-mo-ta').value.trim();
    try {
      // Chọn "+ Tạo mục tiêu mới…" -> tạo mục tiêu TRƯỚC, lấy id xong mới
      // gắn vào việc — 1 lần bấm ra cả 2 (Sếp Ngọc: gộp chung thêm mục tiêu
      // + giao việc, khỏi phải làm 2 bước ở 2 chỗ khác nhau).
      let mucTieuId = oCvMucTieu.value || null;
      if (mucTieuId === '_moi_') {
        const capMoi = oMtmCap.value;
        const kqMt = await API.mtTao({
          cap: capMoi,
          bo_phan: $('#cv-mtm-bophan').value.trim(),
          tieu_de: (oMtmTieuDe.value.trim() || $('#cv-tieu-de').value.trim()),
          mo_ta: moTa
        });
        mucTieuId = kqMt.id;
      }
      await API.cvTao({
        nguoi_nhan_id: chonNguoiNhan.value,
        phoi_hop: oPhoiHop ? [...oPhoiHop.querySelectorAll('input:checked')].map(i => i.value) : [],
        muc_tieu_id: mucTieuId,
        tieu_de: $('#cv-tieu-de').value.trim(),
        dau_ra: $('#cv-dau-ra').value.trim(),
        mo_ta: moTa,
        han_chot: $('#cv-han-chot').value || null
      });
      // Gắn việc vào mục tiêu xong -> tiến độ mục tiêu đổi, tải lại luôn cho khớp
      if (window.LAM_MOI_MUCTIEU) window.LAM_MOI_MUCTIEU();
      $('#cv-form').reset();
      apDungCheDoTodo();
      capNhatMtmKhoi();
      dongMoFormCv(false);
      moTuyChon(false);
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
    const nutXongNgay = e.target.closest('[data-cv-xongngay]');
    const nutDuyet = e.target.closest('[data-cv-duyet]');
    const nutTraLai = e.target.closest('[data-cv-tralai]');
    const nutHuy = e.target.closest('[data-cv-huy]');
    const btn = nutBatDau || nutNop || nutXongNgay || nutDuyet || nutTraLai || nutHuy;
    if (!btn) return;

    if (nutNop) {
      const idNop = btn.getAttribute('data-cv-nop');
      moHopNhap({
        tieuDe: 'Nộp kết quả công việc',
        loai: 'textarea',
        nhan: 'Kết quả thực tế đạt được (so với đầu ra đã giao) *',
        xuLyLuu: async val => {
          if (!val) throw new Error('Cần điền kết quả trước khi nộp.');
          await API.cvCapNhat(idNop, 'cho_duyet', val);
          await taiLai();
        }
      });
      return;
    }

    let id, trangThai, ketQua;
    if (nutBatDau) { id = btn.getAttribute('data-cv-batdau'); trangThai = 'dang_lam'; }
    else if (nutXongNgay) { id = btn.getAttribute('data-cv-xongngay'); trangThai = 'hoan_thanh'; }
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
      // Việc chuyển Hoàn thành/Huỷ có thể đổi tiến độ mục tiêu đang gắn — tải lại
      if ((trangThai === 'hoan_thanh' || trangThai === 'huy') && window.LAM_MOI_MUCTIEU) window.LAM_MOI_MUCTIEU();
    } catch (err) {
      alert(err.message || 'Không lưu được, thử lại nhé.');
      btn.disabled = false;
    }
  }
  $('#cv-bang-nhan').addEventListener('click', xuLyNut);
  $('#cv-bang-giao').addEventListener('click', xuLyNut);

  window.LAM_MOI_CONGVIEC = taiLai;   // để chuông thông báo gọi làm mới được
  await taiLai();
}

/* ==========================================================================
   LỊCH SỬ LÀM VIỆC — kho lưu trữ TOÀN CỤC mọi việc trong Trạm Mục Tiêu, của
   TẤT CẢ mọi người chứ không riêng người xem (Sếp Ngọc yêu cầu 21/08/2026:
   "lưu trữ lại quá trình làm việc của nhân sự, ai làm gì, xong task gì như
   nào"). Chỉ đọc — không có nút thao tác nào ở đây, đúng vai trò 1 cuốn sổ
   lưu trữ, không phải nơi làm việc (đó là Trạm Mục Tiêu).
   ========================================================================== */
async function khoiDongLichSuViec() {
  let DS_LSCV = [];

  function capNhatVN(s) {
    if (!s) return '—';
    const [ngay, gio] = String(s).split(' ');
    const [nam, thang, ng] = (ngay || '').split('-');
    return ng && thang ? `${ng}/${thang}/${nam} ${(gio || '').slice(0, 5)}` : s;
  }
  function hanChotVN(hanChot) {
    if (!hanChot) return '—';
    const quaHan = hanChot < new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const [nam, thang, ngay] = hanChot.split('-');
    return `<span class="${quaHan ? 'canh-bao-chu' : ''}">${ngay}/${thang}/${nam}</span>`;
  }

  function veBangLsCv() {
    const k = boDau(($('#ls-cv-tim').value || '').trim());
    const locTt = $('#ls-cv-loctt').value;
    const ds = DS_LSCV.filter(r =>
      (!locTt || r.trang_thai === locTt) &&
      (!k || boDau(`${r.tieu_de} ${r.nguoi_nhan_ten || ''} ${r.nguoi_giao_ten || ''} ${r.muc_tieu_ten || ''}`).includes(k)));
    veBang('#ls-cv-bang', ds, r => {
      const tt = CV_TRANG_THAI[r.trang_thai] || CV_TRANG_THAI.moi;
      return `<td><div class="nm">${esc(r.tieu_de)}</div>${r.dau_ra ? `<div class="sm">${esc(r.dau_ra)}</div>` : ''}${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${esc(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm">${esc(r.nguoi_nhan_ten)}</td>` +
        `<td class="sm">${esc(r.nguoi_giao_ten)}</td>` +
        `<td class="sm">${esc(r.muc_tieu_ten || '—')}</td>` +
        `<td class="sm">${hanChotVN(r.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>` +
        `<td class="sm">${capNhatVN(r.cap_nhat_luc)}</td>`;
    });
    $('#ls-cv-trong').hidden = ds.length > 0;
  }

  try {
    const { viec } = await API.cvLichSu();
    DS_LSCV = viec || [];
  } catch { /* trống — hiện bảng rỗng, không chặn cả trang */ }
  veBangLsCv();

  $('#ls-cv-tim').addEventListener('input', veBangLsCv);
  $('#ls-cv-loctt').addEventListener('change', veBangLsCv);
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
  let chuaDocTruoc = 0;   // số chưa đọc lần kiểm tra trước (để biết có THÊM tin mới không)

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
      const { so_luong } = await API.chatChuaDoc();   // tổng chưa đọc THẬT (mốc máy chủ)
      if (so_luong > chuaDocTruoc) veGanDay();          // có thêm tin mới -> làm mới danh sách gần đây
      chuaDocTruoc = so_luong;
      // Đang mở popup = đang đọc hết -> badge 0. Đóng thì hiện đúng số chưa đọc.
      chuaDoc = dangMo ? 0 : so_luong;
      veBadge();
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
    chuaDoc = 0; chuaDocTruoc = 0; veBadge();
    // Đánh dấu ĐÃ ĐỌC ở máy chủ -> tải lại trang cũng không hiện "1" lại nữa
    API.chatDaDoc().catch(() => {});
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
// Thêm/Sửa hồ sơ nhân sự sống Ở ĐÂY (không phải Quản trị) — đúng chỗ
// HCNS/người phụ trách nhân sự tìm tới đầu tiên. Quản trị giờ chỉ còn
// quản lý TÀI KHOẢN đăng nhập (Data Ownership: HR sở hữu hồ sơ con người,
// Admin sở hữu tài khoản hệ thống — 2 thứ khác nhau, xem docs/DATA_OWNERSHIP_MATRIX.md).
if (TOI.quyen.includes('nhansu')) {
  // Search + Filter danh sách nhân sự — dùng chung cho cả 2 chế độ xem
  // (đọc / quản trị), gắn 1 lần duy nhất ở đây.
  const veLaiBangNs = () => (TOI.them_nhan_su ? veBangNsQuanTri() : veBangNsDoc());
  $('#ns-tim').addEventListener('input', veLaiBangNs);
  $('#ns-locbophan').addEventListener('change', veLaiBangNs);
  $('#ns-loctrangthai').addEventListener('change', veLaiBangNs);
  $('#ns-locloaild').addEventListener('change', veLaiBangNs);
  $('#ns-xoaloc').addEventListener('click', xoaLocNS);

  if (TOI.them_nhan_su) {
    $('#ns-panel-them').hidden = false;
    $('#ns-thThaoTac').hidden = false;
    if (!TOI.la_admin) {
      const oLuong = document.getElementById('qtFieldLuong');
      if (oLuong) oLuong.remove();
      $('#nsMoTa').textContent = 'Thêm/sửa hồ sơ nhân sự. Cấp tài khoản đăng nhập và lương do Admin phụ trách (tab Quản trị).';
    }

    const { capNhatHienThi: veQtChucDanh } = ganCombo({
      hienThi: $('#qtChucDanhHienThi'), panel: $('#qtChucDanhPanel'),
      tim: $('#qtChucDanhTim'), goiY: $('#qtChucDanhGoiY'), giaTri: $('#qtChucDanh')
    }, () => dsCandidateDanhMuc(DS_CHUC_DANH, $('#qtChucDanh').value), null, 'Chọn chức danh...');
    const { capNhatHienThi: veQtPhongBan } = ganCombo({
      hienThi: $('#qtPhongBanHienThi'), panel: $('#qtPhongBanPanel'),
      tim: $('#qtPhongBanTim'), goiY: $('#qtPhongBanGoiY'), giaTri: $('#qtPhongBan')
    }, () => dsCandidateDanhMuc(DS_PHONG_BAN, $('#qtPhongBan').value), null, 'Chọn phòng ban...');

    $('#qtFormThem').addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#qtLoiThem');
      oLoi.classList.remove('show');
      const nut = $('#qtNutThem');
      nut.disabled = true; nut.textContent = 'Đang lưu…';
      try {
        await API.qtThemNhanSu({
          ho_ten: $('#qtHoTen').value,
          chuc_danh_id: $('#qtChucDanh').value,
          phong_ban_id: $('#qtPhongBan').value,
          sdt: $('#qtSdt').value,
          email: $('#qtEmail').value,
          quan_ly_id: $('#qtQuanLy').value,
          trang_thai: $('#qtTrangThai').value,
          loai_lao_dong: $('#qtLoaiLaoDong').value,
          luong: $('#qtLuong').value
        });
        $('#qtFormThem').reset();
        veQtChucDanh(); veQtPhongBan();
        await taiLaiNhanSuQuanTri();
      } catch (err) {
        oLoi.textContent = err.message; oLoi.classList.add('show');
      } finally {
        nut.disabled = false; nut.textContent = 'Thêm nhân sự';
      }
    });

    const nsSuaModal = $('#nsSuaModalNen');
    function dongHopSuaNhanSu() { nsSuaModal.hidden = true; }
    $('#nsSua-nuthuy').addEventListener('click', dongHopSuaNhanSu);
    nsSuaModal.addEventListener('click', e => { if (e.target === nsSuaModal) dongHopSuaNhanSu(); });

    function moHopSuaNhanSu(id) {
      const n = DS_NHAN_SU_QT.find(x => x.id === id);
      if (!n) return;
      if (n.trang_thai_dl === 'da_khoa' && !TOI.la_admin) {
        alert('Hồ sơ này đã khoá — cần Admin sửa hoặc mở khoá lại.');
        return;
      }
      $('#nsSua-id').value = n.id;
      $('#nsSua-hoten').value = n.ho_ten;
      $('#nsSua-sdt').value = n.sdt || '';
      $('#nsSua-email').value = n.email || '';
      $('#nsSua-trangthai').value = n.trang_thai || 'da_ky';
      $('#nsSua-loailaodong').value = n.loai_lao_dong || 'toan_thoi_gian';
      $('#nsSua-fieldmanv').hidden = !TOI.la_admin;
      $('#nsSua-manv').value = n.ma_nv || '';

      const oCd = $('#nsSua-chucdanh'), oPb = $('#nsSua-phongban');
      oCd.value = n.chuc_danh_id || '';
      oPb.value = n.phong_ban_id || '';
      ganCombo({
        hienThi: $('#nsSua-chucdanhhienthi'), panel: $('#nsSua-chucdanhpanel'),
        tim: $('#nsSua-chucdanhtim'), goiY: $('#nsSua-chucdanhgoiy'), giaTri: oCd
      }, () => dsCandidateDanhMuc(DS_CHUC_DANH, n.chuc_danh_id), null, 'Chọn chức danh...');
      ganCombo({
        hienThi: $('#nsSua-phongbanhienthi'), panel: $('#nsSua-phongbanpanel'),
        tim: $('#nsSua-phongbantim'), goiY: $('#nsSua-phongbangoiy'), giaTri: oPb
      }, () => dsCandidateDanhMuc(DS_PHONG_BAN, n.phong_ban_id), null, 'Chọn phòng ban...');

      const oQl = $('#nsSua-quanly');
      oQl.value = n.quan_ly_id || '';
      ganCombo({
        hienThi: $('#nsSua-quanlyhienthi'), panel: $('#nsSua-quanlypanel'),
        tim: $('#nsSua-quanlytim'), goiY: $('#nsSua-quanlygoiy'), giaTri: oQl
      }, () => uuTienCungPhongBan(DS_NHAN_SU_QT.filter(x => x.dang_lam && x.id !== n.id), n.phong_ban_id)
          .map(x => ({ gia_tri: x.id, nhan: nhanNhanSu(x) })),
        '— Không —', 'Chọn quản lý...');

      const oFieldLuong = $('#nsSua-fieldluong');
      if (oFieldLuong) oFieldLuong.hidden = !TOI.la_admin;
      $('#nsSua-luong').value = '';

      $('#nsSua-loi').textContent = '';
      nsSuaModal.hidden = false;
    }

    $('#nsSuaForm').addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#nsSua-loi'); oLoi.textContent = '';
      const nut = $('#nsSua-nutluu');
      nut.disabled = true;
      try {
        const body = {
          id: $('#nsSua-id').value,
          ho_ten: $('#nsSua-hoten').value,
          chuc_danh_id: $('#nsSua-chucdanh').value,
          phong_ban_id: $('#nsSua-phongban').value,
          sdt: $('#nsSua-sdt').value,
          email: $('#nsSua-email').value,
          quan_ly_id: $('#nsSua-quanly').value,
          trang_thai: $('#nsSua-trangthai').value,
          loai_lao_dong: $('#nsSua-loailaodong').value
        };
        const luongMoi = $('#nsSua-luong').value.trim();
        if (TOI.la_admin && luongMoi) body.luong = luongMoi;
        if (TOI.la_admin) body.ma_nv = $('#nsSua-manv').value.trim();
        await API.qtSuaNhanSu(body);
        dongHopSuaNhanSu();
        await taiLaiNhanSuQuanTri();
      } catch (err) {
        oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.';
      } finally {
        nut.disabled = false;
      }
    });

    $('#ns-bang').addEventListener('click', async e => {
      const btnSua = e.target.closest('[data-sua-ns]');
      const btnKhoa = e.target.closest('[data-khoa-ns]');
      const btnMoKhoa = e.target.closest('[data-mokhoa-ns]');
      const btnXoa = e.target.closest('[data-xoa-ns]');
      if (btnSua) {
        moHopSuaNhanSu(btnSua.dataset.suaNs);
      } else if (btnKhoa) {
        if (!confirm('Hoàn tất hồ sơ này? Sau đó chỉ Admin mới sửa hoặc mở lại được.')) return;
        try { await API.qtKhoaNhanSu(btnKhoa.dataset.khoaNs, 'da_khoa'); await taiLaiNhanSuQuanTri(); }
        catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
      } else if (btnMoKhoa) {
        try { await API.qtKhoaNhanSu(btnMoKhoa.dataset.mokhoaNs, 'nhap'); await taiLaiNhanSuQuanTri(); }
        catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
      } else if (btnXoa) {
        if (!confirm(`Xoá HẲN hồ sơ "${btnXoa.dataset.xoaNsTen}"? Không thể hoàn tác — chỉ dùng khi tạo nhầm/test. Nếu nhân sự đã nghỉ việc thật, dùng "Hoàn tất" để giữ lịch sử thay vì xoá.`)) return;
        try { await API.qtXoaNhanSu(btnXoa.dataset.xoaNs); await taiLaiNhanSuQuanTri(); }
        catch (err) { alert(err.message || 'Không xoá được, thử lại nhé.'); }
      }
    });
  }

  await taiLaiNhanSuQuanTri();
}

/* -- Kinh doanh -- */
if (TOI.quyen.includes('kinhdoanh')) {
  // Chuyển màn Vận hành sàn / R&D (giống bộ pills của Kho vận)
  $('#kdSeg')?.addEventListener('click', e => {
    const nut = e.target.closest('.seg-nut');
    if (!nut) return;
    document.querySelectorAll('#kdSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    ['vanhanh', 'sanpham', 'rnd', 'cskh'].forEach(k => {
      const pane = document.getElementById('kd-pane-' + k);
      if (pane) pane.hidden = (k !== nut.dataset.kd);
    });
  });

  /* ---- Sản phẩm/SKU — Kinh doanh là chủ sở hữu (Data Ownership, xem
     docs/DATA_OWNERSHIP_MATRIX.md). Dùng LẠI đúng API Kho vận đang dùng
     (khoSanPham/khoThemSanPham/khoSuaSanPham/khoKhoaSanPham) — 1 dữ liệu
     duy nhất, không tạo bảng riêng. Ai xem tab Kinh doanh cũng xem được
     danh sách; chỉ ai có quyen.sua_san_pham mới Thêm/Sửa được, chỉ
     quyen.khoa_san_pham mới "Hoàn tất"/"Mở lại" được (Kho vận sửa ngày
     thường nhưng không phải người khoá). */
  (async function khoiDongSanPhamKinhDoanh() {
    let DS_SP_KD = [], quyenSp = {};

    function veBangSp(tuKhoa) {
      const k = boDau((tuKhoa || '').trim());
      const ds = DS_SP_KD.filter(s => !k || boDau(`${s.ten} ${s.ma_sku} ${s.danh_muc || ''}`).includes(k));
      veBang('#kdsp-bang', ds, s => {
        const daKhoa = s.trang_thai === 'da_khoa';
        const nutSua = quyenSp.sua_san_pham ? `<button type="button" class="btn-nho" data-kdsp-sua="${esc(s.id)}">Sửa</button> ` : '';
        const nutKhoa = quyenSp.khoa_san_pham
          ? (daKhoa
              ? `<button type="button" class="btn-nho" data-kdsp-mokhoa="${esc(s.id)}">Mở lại</button>`
              : `<button type="button" class="btn-nho" data-kdsp-khoa="${esc(s.id)}">Hoàn tất</button>`)
          : '';
        return `<td><div class="nm">${esc(s.ten)}</div>${s.danh_muc ? `<div class="sm">${esc(s.danh_muc)}</div>` : ''}</td>` +
          `<td class="sm">${esc(s.ma_sku)}</td>` +
          `<td class="sm">${esc(s.don_vi)}</td>` +
          `<td>${daKhoa ? '<span class="tag warn">🔒 Đã khoá</span>' : '<span class="tag mute">Nháp</span>'}</td>` +
          `<td style="white-space:nowrap">${nutSua}${nutKhoa}</td>`;
      });
      $('#kdsp-dem').textContent = `${ds.length}/${DS_SP_KD.length} mã hàng`;
      $('#kdsp-trong').hidden = ds.length > 0;
    }

    async function taiLaiSp() {
      const kq = await API.khoSanPham().catch(() => null);
      if (!kq) return;
      DS_SP_KD = kq.san_pham || [];
      quyenSp = kq.quyen || {};
      if (quyenSp.sua_san_pham) {
        $('#kdsp-panel-them').hidden = false;
        $('#kdsp-donvi').innerHTML = '<option value="">— Chưa chọn —</option>' +
          DS_DON_VI.filter(x => x.hoat_dong).map(d => `<option value="${d.id}">${esc(d.ten)}</option>`).join('');
      }
      veBangSp($('#kdsp-tim').value);
    }

    $('#kdsp-tim')?.addEventListener('input', e => veBangSp(e.target.value));

    function dienFormSp(s) {
      $('#kdsp-id').value = s ? s.id : '';
      $('#kdsp-sku').value = s ? s.ma_sku : '';
      $('#kdsp-sku').disabled = !!s;   // SKU là khoá tự nhiên, không đổi khi sửa
      $('#kdsp-ten').value = s ? s.ten : '';
      $('#kdsp-danhmuc').value = s ? (s.danh_muc || '') : '';
      $('#kdsp-donvi').value = s ? (s.don_vi_id || '') : '';
      $('#kdsp-tonmin').value = s ? (s.ton_toi_thieu ?? '') : '';
      $('#kdsp-theodoihsd').checked = s ? !!s.theo_doi_hsd : true;
      $('#kdsp-nutluu').textContent = s ? 'Lưu' : '+ Thêm mã hàng';
      $('#kdsp-nuthuy').hidden = !s;
      $('#kdsp-loi').textContent = '';
    }

    $('#kdsp-nuthuy')?.addEventListener('click', () => { $('#kdspForm').reset(); dienFormSp(null); });

    $('#kdspForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#kdsp-loi'); oLoi.textContent = '';
      const id = $('#kdsp-id').value;
      const du = {
        ma_sku: $('#kdsp-sku').value,
        ten: $('#kdsp-ten').value,
        danh_muc: $('#kdsp-danhmuc').value,
        don_vi_id: $('#kdsp-donvi').value,
        ton_toi_thieu: $('#kdsp-tonmin').value,
        theo_doi_hsd: $('#kdsp-theodoihsd').checked
      };
      try {
        if (id) { du.id = id; await API.khoSuaSanPham(du); }
        else await API.khoThemSanPham(du);
        $('#kdspForm').reset(); dienFormSp(null);
        await taiLaiSp();
      } catch (err) { oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.'; }
    });

    $('#kdsp-bang')?.addEventListener('click', async e => {
      const btnSua = e.target.closest('[data-kdsp-sua]');
      const btnKhoa = e.target.closest('[data-kdsp-khoa]');
      const btnMoKhoa = e.target.closest('[data-kdsp-mokhoa]');
      if (btnSua) {
        const s = DS_SP_KD.find(x => String(x.id) === btnSua.dataset.kdspSua);
        if (s.trang_thai === 'da_khoa' && !TOI.la_admin) {
          alert('Mã hàng này đã khoá — cần Kinh doanh (Vận hành sàn) hoặc Admin mở lại trước.');
          return;
        }
        dienFormSp(s);
        $('#kdsp-ten').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (btnKhoa) {
        const s = DS_SP_KD.find(x => String(x.id) === btnKhoa.dataset.kdspKhoa);
        if (!confirm(`Hoàn tất "${s.ten}"? Sau đó Kho vận vẫn sửa được, nhưng chỉ Kinh doanh/Admin mới mở lại được.`)) return;
        try { await API.khoKhoaSanPham(s.id, 'da_khoa'); await taiLaiSp(); }
        catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
      } else if (btnMoKhoa) {
        try { await API.khoKhoaSanPham(btnMoKhoa.dataset.kdspMokhoa, 'nhap'); await taiLaiSp(); }
        catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
      }
    });

    await taiLaiSp();
  })();

  // Vận hành sàn — đơn hoàn cần đối soát (đã GỘP đơn huỷ vào chung) — chỉ ai có
  // quyền Đơn hoàn mới thấy. Bọc try/catch để 1 lỗi không kéo sập phần sau.
  if (TOI.quyen.includes('donhoan')) {
    try { await khoiDongDoiSoatSan(); } catch (e) { console.error('Đối soát sàn:', e); }
    try { await khoiDongCSKH(); } catch (e) { console.error('CSKH:', e); }
  }
  try { await khoiDongDonHangHuy(); } catch (e) { console.error('Đơn hàng bị hủy:', e); }
}

/* Vận hành sàn — đơn hàng bị HỦY trước khi giao (Order API, khác Đơn hoàn) */
async function khoiDongDonHangHuy() {
  // Đổi unix (giây) -> "dd/mm/yy"
  function ngayVN(unix) {
    if (!unix) return '';
    const d = new Date(Number(unix) * 1000);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  $('#kd-dhh-dongbo')?.addEventListener('click', async () => {
    const btn = $('#kd-dhh-dongbo');
    btn.disabled = true;
    const cu = btn.textContent;
    btn.textContent = 'Đang đồng bộ…';
    const oLoi = $('#kd-dhh-loi');
    oLoi.className = 'form-loi show';
    oLoi.style.color = '';
    oLoi.textContent = '';
    try {
      const kq = await API.kdDongBoDonHang();
      if (kq.loi && kq.loi.length) {
        oLoi.textContent = `Đồng bộ được ${kq.so_don} đơn, nhưng có lỗi: ${kq.loi.join(' · ')}`;
      } else {
        oLoi.style.color = 'var(--ok)';
        oLoi.textContent = `Đã đồng bộ xong: ${kq.so_don} đơn hàng (Shopee + TikTok).`;
      }
      await taiDonHangHuy();
    } catch (err) {
      oLoi.textContent = err.message || 'Không đồng bộ được, thử lại nhé.';
    } finally {
      btn.disabled = false;
      btn.textContent = cu;
    }
  });

  await taiDonHangHuy();

  async function taiDonHangHuy() {
  const { don_huy, co_bang, co_van_don } = await API.kdDonHangHuy();
  $('#kd-donhanghuy-panel').hidden = false;
  if (!co_bang) {
    $('#kd-dhh-dem').textContent = 'Chưa nạp migration them-donhang-huy.sql';
    $('#kd-dhh-trong').hidden = false;
    $('#kd-dhh-trong').textContent = 'Máy chủ chưa nạp cấu trúc dữ liệu cho mục này — báo Sếp Ngọc nạp migration them-donhang-huy.sql.';
    return;
  }
  const NHAN_HUY_BOI = { buyer: 'Khách hàng', seller: 'Người bán', system: 'Hệ thống' };
  veBang('#kd-dhh-bang', don_huy, r => {
    const ngTag = r.nguon === 'tiktok'
      ? '<span class="tag mute">TikTok</span>'
      : '<span class="tag sage">Shopee</span>';
    const tien = r.tong_tien != null
      ? tienVN(Math.round(r.tong_tien / 100000)) + ' ' + esc(r.tien_te || '')
      : '—';
    const spTen = r.san_pham_ten || '—';
    const spSku = r.san_pham_sku || '';
    const spCell = `<td class="sm" title="${esc(spTen)}">${esc(spTen)}` +
      (spSku ? `<div class="phu">${esc(spSku)}</div>` : '') + `</td>`;
    const lyDo = r.huy_ly_do_khach || r.huy_ly_do || '—';
    // Cột Mã vận đơn chỉ hiện khi máy chủ đã nạp migration them-donhang-mavandon.sql
    const vanDonCell = co_van_don ? `<td class="sm">${esc(r.ma_van_don || '—')}</td>` : '';
    return `<td>${ngTag}</td>` +
      `<td class="sm">${ngayVN(r.tao_luc_san)}</td>` +
      `<td class="sm">${esc(r.order_sn)}</td>` +
      vanDonCell +
      `<td class="sm">${esc(r.nguoi_mua || '—')}</td>` +
      spCell +
      `<td class="num">${tien}</td>` +
      `<td class="sm">${esc(NHAN_HUY_BOI[r.huy_boi] || r.huy_boi || '—')}</td>` +
      `<td class="sm">${esc(lyDo)}</td>`;
  });
  // Ẩn cột "Mã vận đơn" trên tiêu đề bảng khi máy chủ CHƯA nạp migration
  // them-donhang-mavandon.sql (server bỏ hẳn cột đó khỏi dữ liệu trả về).
  const thVanDon = $('#kd-dhh-th-mavandon');
  if (thVanDon) thVanDon.hidden = !co_van_don;
  $('#kd-dhh-trong').hidden = don_huy.length > 0;
  $('#kd-dhh-dem').textContent = co_van_don
    ? `${don_huy.length} đơn bị hủy sau khi đã chuẩn bị (có mã vận đơn) tháng này`
    : `${don_huy.length} đơn bị hủy tháng này`;
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
    const soMinhChung = (r.so_anh || 0) + (r.so_video || 0);
    const xemMinhChung = soMinhChung
      ? ` <button type="button" class="btn-nho" data-xemmc="${esc(r.return_sn)}" style="margin-top:3px">📷 Xem minh chứng (${soMinhChung})</button>`
      : '';
    const khieuNaiHtml = r.ly_do_khieu_nai
      ? `<div class="phu" style="margin-top:4px">` +
          `<span class="tag danger">⚠️ Kho khiếu nại</span>` +
          `<div class="canh-bao-chu" style="margin-top:3px">${esc(r.ly_do_khieu_nai)}` +
            `${r.khieu_nai_boi ? ' — ' + esc(r.khieu_nai_boi) : ''}</div>` +
          xemMinhChung +
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
    const btnXem = e.target.closest('[data-xemmc]');
    if (btnXem) { moXemMinhChung(btnXem.getAttribute('data-xemmc')); return; }

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

  /* ---- Hộp xem ảnh/video minh chứng kho gửi kèm khiếu nại ---- */
  const knXemModal = $('#knXemModalNen');
  $('#knXemDong').addEventListener('click', () => { knXemModal.hidden = true; });
  knXemModal.addEventListener('click', e => { if (e.target === knXemModal) knXemModal.hidden = true; });

  async function moXemMinhChung(rsn) {
    const r = DS_DOISOAT.find(x => x.return_sn === rsn);
    const ngChu = r && r.nguon === 'tiktok' ? 'TikTok' : 'Shopee';
    $('#knXemDon').innerHTML = `${esc(ngChu)} · Mã đơn hoàn <b>${esc(rsn)}</b>`;
    $('#knXemAnh').innerHTML = '';
    $('#knXemVideo').innerHTML = '';
    knXemModal.hidden = false;

    const { minh_chung } = await API.hoanKhieuNaiMinhChung(rsn);
    const anh = minh_chung.filter(m => m.loai === 'anh');
    const video = minh_chung.filter(m => m.loai === 'video');

    $('#knXemAnh').innerHTML = anh.map(a =>
      `<a class="kn-thumb" href="${a.du_lieu}" target="_blank" rel="noopener"><img src="${a.du_lieu}" alt="Ảnh minh chứng"></a>`
    ).join('');
    $('#knXemAnhTrong').hidden = anh.length > 0;

    $('#knXemVideo').innerHTML = video.map(v =>
      `<div class="kn-video-box"><video controls preload="metadata" src="${API.hoanKhieuNaiVideoUrl(v.id)}"></video></div>`
    ).join('');
    $('#knXemVideoTrong').hidden = video.length > 0;
  }

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

/* -- Danh mục nền dùng chung — nạp trước vì Kho vận/Nhân sự/Dữ liệu nền
   đều cần (dropdown Phòng ban/Chức danh/Đơn vị tính). */
if (TOI.quyen.some(t => ['khovan', 'nhansu', 'quantri', 'dulieunen'].includes(t))) {
  try { await taiDanhMucNen(); } catch (e) { console.error('Danh mục nền:', e); }
}

/* -- Kho — Xuất / Nhập / Tồn (máy chủ thật) -- */
if (TOI.quyen.includes('khovan')) {
  try { await khoiDongKho(); } catch (e) { console.error('Kho vận:', e); }
}

/* -- Dữ liệu nền: Phòng ban / Chức danh / Đơn vị tính -- */
if (TOI.quyen.includes('dulieunen')) {
  try { await khoiDongDuLieuNen(); } catch (e) { console.error('Dữ liệu nền:', e); }
}

/* -- Tài sản (Asset Management) -- */
if (TOI.quyen.includes('taisan')) {
  try { await khoiDongTaiSan(); } catch (e) { console.error('Tài sản:', e); }
}

/* -- Xếp ca (Đăng ký ca / Xếp ca tuần) -- */
if (TOI.quyen.includes('xepca')) {
  try { await khoiDongXepCa(); } catch (e) { console.error('Xếp ca:', e); }
}

/* -- Đơn hoàn Shopee/TikTok — danh sách nằm trong tab Kho vận (kho xử lý),
   khối kết nối nằm trong tab Kết nối sàn. Chạy cho MỌI vai trò xem được đơn
   hoàn (gồm cả kho), không chỉ vai trò có tab Kết nối sàn. -- */
if (TOI.shopee && TOI.shopee.xem) {
  try { await khoiDongDonHoan(); } catch (e) { console.error('Đơn hoàn/Kết nối sàn:', e); }
  try { await khoiDongLichSuHoan(); } catch (e) { console.error('Lịch sử hoàn:', e); }
}

/* ---- Chuông thông báo trong ERP 🔔 ---- */
(function chuongThongBao() {
  // Chuông hiện cho MỌI người đăng nhập — thông báo gồm cả CÁ NHÂN (giao việc,
  // mời phối hợp) lẫn theo NHÓM (kho/vận hành/kế toán), ai cũng có thể nhận.
  const chuong = $('#tbChuong'), nut = $('#tbNut'), panel = $('#tbPanel'),
        badge = $('#tbBadge'), ds = $('#tbDanhSach'), trong = $('#tbTrong');
  if (!chuong || !nut) return;
  chuong.hidden = false;

  const ICO = { day_kho: '📦', day_ke_toan: '💰', khieu_nai: '⚠️', canh_bao: '🔔',
                cong_viec_moi: '🎯', cong_viec_phoi_hop: '🤝' };

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
    } else if (it.dataset.loai === 'cong_viec_moi' || it.dataset.loai === 'cong_viec_phoi_hop') {
      moTab('tongquan');
      if (window.LAM_MOI_CONGVIEC) window.LAM_MOI_CONGVIEC();
    }
    panel.hidden = true;
  });

  document.addEventListener('click', () => { panel.hidden = true; });
  panel.addEventListener('click', (e) => e.stopPropagation());

  taiThongBao();
  setInterval(taiThongBao, 5 * 60 * 1000);   // làm mới 5 phút/lần
})();

/* ==========================================================================
   DỮ LIỆU NỀN — Phòng ban / Chức danh / Đơn vị tính + tình trạng sẵn sàng.
   ========================================================================== */
async function khoiDongDuLieuNen() {
  const NHAN_TT = {
    NOT_STARTED: 'Chưa bắt đầu',
    IN_PROGRESS: 'Đang nhập',
    READY: 'Đã đủ'
  };

  async function veTinhTrang() {
    let kq;
    try { kq = await API.dlnTinhTrang(); } catch { return; }
    veThe('#dln-tinhtrang', kq.muc.map(m => ({
      k: m.ten,
      v: m.da_gan != null ? `${m.da_gan}/${m.tong}` : `${m.tong}`,
      d: NHAN_TT[m.trang_thai] || m.trang_thai,
      dir: m.trang_thai === 'READY' ? 'up' : (m.trang_thai === 'NOT_STARTED' ? 'down' : '')
    })));
    veDanhSach('#dln-viectieptheo', kq.viec_tiep_theo.length
      ? kq.viec_tiep_theo.map(v => ({ m: 'warn', b: v.chu, s: '', t: '' }))
      : [{ m: 'sage', b: 'Dữ liệu nền đã đủ cho các mục đang theo dõi.', s: '', t: '' }]);
  }

  // Render 1 danh mục (Phòng ban/Chức danh/Đơn vị tính) — cùng khuôn cho cả 3.
  function veDanhMuc(dsId, demId, trongId, ds, xuLySua, xuLyAn, xuLyKhoa, dongPhu) {
    const box = $(dsId);
    box.innerHTML = '';
    ds.forEach(m => {
      const daKhoa = m.trang_thai === 'da_khoa';
      const r = el('div', '', '');
      r.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:8px 0;border-bottom:1px solid var(--line)';
      const nutSua = `<button type="button" class="btn-nho" data-sua="${m.id}">Sửa</button> `;
      const nutKhoa = daKhoa
        ? (TOI.la_admin ? `<button type="button" class="btn-nho" data-mokhoa="${m.id}">Mở lại</button> ` : '')
        : `<button type="button" class="btn-nho" data-khoa="${m.id}">Hoàn tất</button> `;
      r.innerHTML =
        `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">` +
        `<span>${esc(m.ten)}${m.hoat_dong ? '' : ' <span class="tag mute">Đã ẩn</span>'}` +
          `${daKhoa ? ' <span class="tag warn">🔒 Đã khoá</span>' : ''}</span>` +
        `<span>${nutSua}${nutKhoa}` +
        `<button type="button" class="btn-nho" data-an="${m.id}" data-hd="${m.hoat_dong ? 0 : 1}">${m.hoat_dong ? 'Ẩn' : 'Hiện'}</button></span>` +
        `</div>` + (dongPhu ? dongPhu(m) : '');
      box.appendChild(r);
    });
    $(demId).textContent = ds.length ? `${ds.length} mục` : '';
    $(trongId).hidden = ds.length > 0;

    box.onclick = async (e) => {
      const btnSua = e.target.closest('[data-sua]');
      const btnAn = e.target.closest('[data-an]');
      const btnKhoa = e.target.closest('[data-khoa]');
      const btnMoKhoa = e.target.closest('[data-mokhoa]');
      const btnGanTruong = e.target.closest('[data-gan-truong]');
      if (btnGanTruong) {
        const m = ds.find(x => String(x.id) === btnGanTruong.dataset.ganTruong);
        const dsChon = DS_NHAN_SU_QT.length ? DS_NHAN_SU_QT : (await API.danhBa().catch(() => ({ danh_ba: [] }))).danh_ba || [];
        moHopNhap({
          tieuDe: `Trưởng phòng — ${m.ten}`,
          loai: 'select',
          nhan: 'Người làm trưởng phòng',
          giaTri: m.truong_phong_id || '',
          tuyChon: [
            { gia_tri: '', nhan: '— Không gán —' },
            ...dsChon.map(n => ({ gia_tri: n.id, nhan: nhanNhanSu(n) }))
          ],
          xuLyLuu: async val => { await API.dlnGanTruongPhong(m.id, val || null); await lamMoiTatCa(); }
        });
        return;
      }
      if (btnSua) {
        const m = ds.find(x => String(x.id) === btnSua.dataset.sua);
        if (m.trang_thai === 'da_khoa' && !TOI.la_admin) {
          alert('Mục này đã khoá — cần Admin sửa hoặc mở khoá lại.');
          return;
        }
        moHopNhap({
          tieuDe: `Sửa tên — ${m.ten}`,
          nhan: 'Tên mới *',
          giaTri: m.ten,
          xuLyLuu: async val => {
            if (!val) throw new Error('Vui lòng nhập tên.');
            await xuLySua(m.id, val);
            await lamMoiTatCa();
          }
        });
      } else if (btnAn) {
        try { await xuLyAn(btnAn.dataset.an, btnAn.dataset.hd === '1'); await lamMoiTatCa(); }
        catch (err) { alert(err.message || 'Không lưu được, thử lại nhé.'); }
      } else if (btnKhoa) {
        if (!confirm('Hoàn tất mục này? Sau đó người thường sẽ không sửa tên được nữa — chỉ Admin mới sửa hoặc mở lại.')) return;
        try { await xuLyKhoa(btnKhoa.dataset.khoa, 'da_khoa'); await lamMoiTatCa(); }
        catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
      } else if (btnMoKhoa) {
        try { await xuLyKhoa(btnMoKhoa.dataset.mokhoa, 'nhap'); await lamMoiTatCa(); }
        catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
      }
    };
  }

  async function lamMoiTatCa() {
    await taiDanhMucNen();   // làm mới cache dùng chung (Nhân sự/Kho vận cũng đọc từ đây)
    veDanhMuc('#dln-pb-list', '#dln-pb-dem', '#dln-pb-trong', DS_PHONG_BAN,
      (id, ten) => API.dlnSuaPhongBan(id, { ten }), (id, hd) => API.dlnSuaPhongBan(id, { hoat_dong: hd }),
      (id, tt) => API.dlnKhoaPhongBan(id, tt),
      m => `<div class="sm">Trưởng phòng: ${m.truong_phong_ten ? esc(m.truong_phong_ten) : '— Chưa gán —'} ` +
           `<button type="button" class="btn-nho" data-gan-truong="${m.id}" style="margin-left:6px">Đổi</button></div>`);
    veDanhMuc('#dln-cd-list', '#dln-cd-dem', '#dln-cd-trong', DS_CHUC_DANH,
      (id, ten) => API.dlnSuaChucDanh(id, { ten }), (id, hd) => API.dlnSuaChucDanh(id, { hoat_dong: hd }),
      (id, tt) => API.dlnKhoaChucDanh(id, tt));
    veDanhMuc('#dln-dv-list', '#dln-dv-dem', '#dln-dv-trong', DS_DON_VI,
      (id, ten) => API.dlnSuaDonVi(id, { ten }), (id, hd) => API.dlnSuaDonVi(id, { hoat_dong: hd }),
      (id, tt) => API.dlnKhoaDonVi(id, tt));
    await veTinhTrang();
  }

  // Thêm mới có kiểm tra "gần giống" (Search Before Create) — API trả về
  // {canh_bao, giong:[...]} thay vì lỗi khi nghi trùng; hỏi xác nhận rồi gọi
  // lại với xac_nhan=true để thực sự tạo. goiApi(ten, xacNhan) là 1 trong
  // các hàm API.dlnThem* — dùng chung logic này cho cả 3 danh mục dưới.
  async function themCoCanhBaoTrung(goiApi, ten, oLoi) {
    let kq = await goiApi(ten, false);
    if (kq && kq.canh_bao) {
      const ok = confirm(`Đã có mục gần giống: "${kq.giong.join('", "')}".\nVẫn tạo "${ten}" là mục MỚI riêng?`);
      if (!ok) return false;
      kq = await goiApi(ten, true);
    }
    return true;
  }

  $('#dln-pb-form').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#dln-pb-loi'); oLoi.textContent = '';
    try {
      const ten = $('#dln-pb-ten').value.trim();
      if (await themCoCanhBaoTrung(API.dlnThemPhongBan, ten, oLoi)) { $('#dln-pb-form').reset(); await lamMoiTatCa(); }
    } catch (err) { oLoi.textContent = err.message; }
  });
  $('#dln-cd-form').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#dln-cd-loi'); oLoi.textContent = '';
    try {
      const ten = $('#dln-cd-ten').value.trim();
      if (await themCoCanhBaoTrung(API.dlnThemChucDanh, ten, oLoi)) { $('#dln-cd-form').reset(); await lamMoiTatCa(); }
    } catch (err) { oLoi.textContent = err.message; }
  });
  $('#dln-dv-form').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#dln-dv-loi'); oLoi.textContent = '';
    try {
      const ten = $('#dln-dv-ten').value.trim();
      if (await themCoCanhBaoTrung(API.dlnThemDonVi, ten, oLoi)) { $('#dln-dv-form').reset(); await lamMoiTatCa(); }
    } catch (err) { oLoi.textContent = err.message; }
  });

  /* ---- Nhà cung cấp ---- */
  let dsNCC = [], nccDangSua = null;
  async function veNCC() {
    const kq = await API.dlnNCC().catch(() => ({ ds: [] }));
    dsNCC = kq.ds || [];
    const box = $('#dln-ncc-list');
    box.innerHTML = '';
    dsNCC.forEach(n => {
      const daKhoa = n.trang_thai === 'da_khoa';
      const r = el('div', '', '');
      r.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)';
      const phu = [n.ma_so_thue ? `MST: ${esc(n.ma_so_thue)}` : '', n.dien_thoai ? esc(n.dien_thoai) : '', n.dia_chi ? esc(n.dia_chi) : '']
        .filter(Boolean).join(' · ');
      const nutKhoa = daKhoa
        ? (TOI.la_admin ? `<button type="button" class="btn-nho" data-ncc-mokhoa="${n.id}">Mở lại</button> ` : '')
        : `<button type="button" class="btn-nho" data-ncc-khoa="${n.id}">Hoàn tất</button> `;
      r.innerHTML =
        `<div><div>${esc(n.ten)}${n.hoat_dong ? '' : ' <span class="tag mute">Đã ẩn</span>'}${daKhoa ? ' <span class="tag warn">🔒 Đã khoá</span>' : ''}</div>` +
          (phu ? `<div class="sm" style="color:var(--text-mute)">${phu}</div>` : '') + `</div>` +
        `<span style="white-space:nowrap"><button type="button" class="btn-nho" data-ncc-sua="${n.id}">Sửa</button> ${nutKhoa}` +
        `<button type="button" class="btn-nho" data-ncc-an="${n.id}" data-hd="${n.hoat_dong ? 0 : 1}">${n.hoat_dong ? 'Ẩn' : 'Hiện'}</button></span>`;
      box.appendChild(r);
    });
    $('#dln-ncc-dem').textContent = dsNCC.length ? `${dsNCC.length} nhà cung cấp` : '';
    $('#dln-ncc-trong').hidden = dsNCC.length > 0;
  }

  function dienFormNCC(n) {
    nccDangSua = n || null;
    $('#dln-ncc-id').value = n ? n.id : '';
    $('#dln-ncc-ten').value = n ? n.ten : '';
    $('#dln-ncc-mst').value = n ? (n.ma_so_thue || '') : '';
    $('#dln-ncc-dt').value = n ? (n.dien_thoai || '') : '';
    $('#dln-ncc-diachi').value = n ? (n.dia_chi || '') : '';
    $('#dln-ncc-nutluu').textContent = n ? 'Lưu' : '+ Thêm';
    $('#dln-ncc-nuthuy').hidden = !n;
    $('#dln-ncc-loi').textContent = '';
  }

  $('#dln-ncc-nuthuy').addEventListener('click', () => { $('#dln-ncc-form').reset(); dienFormNCC(null); });

  $('#dln-ncc-form').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#dln-ncc-loi'); oLoi.textContent = '';
    if (nccDangSua && nccDangSua.trang_thai === 'da_khoa' && !TOI.la_admin) {
      oLoi.textContent = 'Nhà cung cấp này đã khoá — cần Admin sửa hoặc mở lại.';
      return;
    }
    const du = {
      ten: $('#dln-ncc-ten').value.trim(),
      ma_so_thue: $('#dln-ncc-mst').value.trim(),
      dien_thoai: $('#dln-ncc-dt').value.trim(),
      dia_chi: $('#dln-ncc-diachi').value.trim()
    };
    try {
      const goi = (xac) => nccDangSua
        ? API.dlnSuaNCC(nccDangSua.id, { ...du, xac_nhan: xac })
        : API.dlnThemNCC({ ...du, xac_nhan: xac });
      let kq = await goi(false);
      if (kq && kq.canh_bao) {
        if (!confirm(`Đã có NCC gần giống: "${kq.giong.join('", "')}".\nVẫn lưu "${du.ten}" là mục MỚI riêng?`)) return;
        kq = await goi(true);
      }
      $('#dln-ncc-form').reset(); dienFormNCC(null);
      await veNCC();
    } catch (err) { oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.'; }
  });

  $('#dln-ncc-list').addEventListener('click', async e => {
    const btnSua = e.target.closest('[data-ncc-sua]');
    const btnAn = e.target.closest('[data-ncc-an]');
    const btnKhoa = e.target.closest('[data-ncc-khoa]');
    const btnMoKhoa = e.target.closest('[data-ncc-mokhoa]');
    if (btnSua) {
      const n = dsNCC.find(x => String(x.id) === btnSua.dataset.nccSua);
      if (n.trang_thai === 'da_khoa' && !TOI.la_admin) {
        alert('Nhà cung cấp này đã khoá — cần Admin sửa hoặc mở lại.');
        return;
      }
      dienFormNCC(n);
      $('#dln-ncc-ten').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (btnAn) {
      try { await API.dlnSuaNCC(btnAn.dataset.nccAn, { hoat_dong: btnAn.dataset.hd === '1' }); await veNCC(); }
      catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
    } else if (btnKhoa) {
      if (!confirm('Hoàn tất nhà cung cấp này? Sau đó người thường sẽ không sửa được nữa — chỉ Admin mới sửa hoặc mở lại.')) return;
      try { await API.dlnKhoaNCC(btnKhoa.dataset.nccKhoa, 'da_khoa'); await veNCC(); }
      catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
    } else if (btnMoKhoa) {
      try { await API.dlnKhoaNCC(btnMoKhoa.dataset.nccMokhoa, 'nhap'); await veNCC(); }
      catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
    }
  });

  /* ---- Kho (nhiều kho vật lý — chỉ Admin quản lý) ---- */
  let dsKho = [], khoDangSua = null;
  async function veKhoList() {
    const kq = await API.dlnKho().catch(() => ({ ds: [] }));
    dsKho = kq.ds || [];
    const box = $('#dln-kho-list');
    box.innerHTML = '';
    dsKho.forEach(k => {
      const r = el('div', '', '');
      r.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)';
      r.innerHTML =
        `<span>${esc(k.ten)}${k.dia_chi ? ` <span class="sm" style="color:var(--text-mute)">— ${esc(k.dia_chi)}</span>` : ''}` +
          `${k.hoat_dong ? '' : ' <span class="tag mute">Đã ẩn</span>'}</span>` +
        (TOI.la_admin
          ? `<span><button type="button" class="btn-nho" data-kho-sua="${k.id}">Sửa</button> ` +
            `<button type="button" class="btn-nho" data-kho-an="${k.id}" data-hd="${k.hoat_dong ? 0 : 1}">${k.hoat_dong ? 'Ẩn' : 'Hiện'}</button></span>`
          : '');
      box.appendChild(r);
    });
    $('#dln-kho-dem').textContent = dsKho.length ? `${dsKho.length} kho` : '';
    $('#dln-kho-trong').hidden = dsKho.length > 0;
    if (!TOI.la_admin) $('#dln-kho-form').hidden = true;
  }

  function dienFormKho(k) {
    khoDangSua = k || null;
    $('#dln-kho-id').value = k ? k.id : '';
    $('#dln-kho-ten').value = k ? k.ten : '';
    $('#dln-kho-diachi').value = k ? (k.dia_chi || '') : '';
    $('#dln-kho-nutluu').textContent = k ? 'Lưu' : '+ Thêm';
    $('#dln-kho-nuthuy').hidden = !k;
    $('#dln-kho-loi').textContent = '';
  }

  $('#dln-kho-nuthuy').addEventListener('click', () => { $('#dln-kho-form').reset(); dienFormKho(null); });

  $('#dln-kho-form').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#dln-kho-loi'); oLoi.textContent = '';
    const du = { ten: $('#dln-kho-ten').value.trim(), dia_chi: $('#dln-kho-diachi').value.trim() };
    try {
      if (khoDangSua) await API.dlnSuaKho(khoDangSua.id, du);
      else await API.dlnThemKho(du);
      $('#dln-kho-form').reset(); dienFormKho(null);
      await veKhoList();
    } catch (err) { oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.'; }
  });

  $('#dln-kho-list').addEventListener('click', async e => {
    const btnSua = e.target.closest('[data-kho-sua]');
    const btnAn = e.target.closest('[data-kho-an]');
    if (btnSua) {
      dienFormKho(dsKho.find(x => String(x.id) === btnSua.dataset.khoSua));
      $('#dln-kho-ten').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (btnAn) {
      try { await API.dlnSuaKho(btnAn.dataset.khoAn, { hoat_dong: btnAn.dataset.hd === '1' }); await veKhoList(); }
      catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
    }
  });

  // Chuyển màn Tài khoản / Cơ cấu tổ chức trong tab Quản trị (Phòng ban +
  // Chức danh — cấp công ty, chuyển từ Dữ liệu nền hôm nay).
  const qtSeg = $('#qtSeg');
  if (qtSeg) qtSeg.addEventListener('click', e => {
    const nut = e.target.closest('.seg-nut');
    if (!nut) return;
    document.querySelectorAll('#qtSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    const paneTk = $('#qt-pane-taikhoan'), paneCc = $('#dln-pane-tochuc');
    if (paneTk) paneTk.hidden = nut.dataset.qt !== 'taikhoan';
    if (paneCc) paneCc.hidden = nut.dataset.qt !== 'cocau';
  });

  // Chuyển màn Đơn vị tính / Nhà cung cấp / Kho trong tab Kho vận → Danh mục
  // (cũng chuyển từ Dữ liệu nền hôm nay — cùng chủ sở hữu quan_ly_kho).
  const kvdlnSeg = $('#kvdlnSeg');
  if (kvdlnSeg) kvdlnSeg.addEventListener('click', e => {
    const nut = e.target.closest('.seg-nut');
    if (!nut) return;
    document.querySelectorAll('#kvdlnSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    ['hanghoa', 'doitac', 'kho'].forEach(k => {
      const pane = document.getElementById('dln-pane-' + k);
      if (pane) pane.hidden = (k !== nut.dataset.dln);
    });
  });

  // Liên kết "quản lý ở Quản trị/Kho vận" từ các form khác — mở đúng tab
  // rồi bấm luôn đúng tab con để khỏi phải tự tìm.
  document.querySelectorAll('a[data-mo-tab]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const dich = a.dataset.moTab;
      moTab(dich);
      if (dich === 'quantri') {
        const b = document.querySelector('#qtSeg .seg-nut[data-qt="cocau"]'); if (b) b.click();
      } else if (dich === 'khovan') {
        const b = document.querySelector('#kvSeg .seg-nut[data-kv="danhmuc"]'); if (b) b.click();
      }
    });
  });

  await lamMoiTatCa();
  await veNCC();
  await veKhoList();
}

/* ==========================================================================
   TÀI SẢN — Asset Management (xem docs/ENTITY_IDENTITY.md)
   ---------------------------------------------------------------------------
   XEM (danh sách + lịch sử) cho mọi vai trò có tab 'taisan'. Chỉ Data Owner
   (Hành chính/Admin — quyen.quan_ly từ máy chủ) mới tạo/cấp phát/thu hồi/
   bảo trì/thanh lý. Báo hỏng thì Data Owner HOẶC người đang giữ tự báo.
   ========================================================================== */
async function khoiDongTaiSan() {
  let DS_TS = [];
  let quanLy = false;

  const NHAN_TT_TS = {
    san_sang:    { chu: 'Sẵn sàng',    mau: 'ok' },
    da_cap_phat: { chu: 'Đang giao',   mau: 'sage' },
    bao_hong:    { chu: 'Báo hỏng',    mau: 'danger' },
    da_thanh_ly: { chu: 'Đã thanh lý', mau: 'mute' }
  };
  const NHAN_SU_KIEN_TS = {
    tao_moi: 'Tạo mới', cap_phat: 'Cấp phát', thu_hoi: 'Thu hồi',
    bao_hong: 'Báo hỏng', bao_tri: 'Bảo trì xong', thanh_ly: 'Thanh lý'
  };

  function locTS() {
    const k = boDau(($('#ts-tim')?.value || '').trim());
    const trangThai = $('#ts-loctrangthai')?.value || '';
    return DS_TS.filter(t => {
      if (trangThai && t.trang_thai !== trangThai) return false;
      if (k && !boDau(`${t.ma_ts} ${t.ten} ${t.danh_muc || ''}`).includes(k)) return false;
      return true;
    });
  }

  function ve() {
    const ds = locTS();
    $('#tsDem').textContent = DS_TS.length ? `${ds.length}/${DS_TS.length} tài sản` : '';
    $('#ts-trong').hidden = ds.length > 0;
    if (ds.length === 0) {
      $('#ts-trong').innerHTML = DS_TS.length === 0
        ? 'Chưa có tài sản nào.'
        : 'Không tìm thấy kết quả phù hợp. <button type="button" class="btn-nho" id="ts-trongxoaloc">Xoá bộ lọc</button>';
      $('#ts-trongxoaloc')?.addEventListener('click', xoaLocTS);
    }
    const nutLoc = $('#ts-xoaloc');
    if (nutLoc) nutLoc.hidden = !($('#ts-tim')?.value || $('#ts-loctrangthai')?.value);
    veBang('#ts-bang', ds, t => {
      const tt = NHAN_TT_TS[t.trang_thai] || { chu: t.trang_thai, mau: 'mute' };
      const laNguoiGiu = t.nguoi_giu_id && t.nguoi_giu_id === TOI.id;
      let nut = '';
      if (t.trang_thai === 'san_sang' && quanLy) {
        nut += `<button class="btn-nho" data-ts-capphat="${esc(t.id)}">Cấp phát</button> ` +
               `<button class="btn-nho" data-ts-baohong="${esc(t.id)}">Báo hỏng</button> ` +
               `<button class="btn-nho" data-ts-thanhly="${esc(t.id)}">Thanh lý</button> `;
      } else if (t.trang_thai === 'da_cap_phat') {
        if (quanLy) {
          nut += `<button class="btn-nho" data-ts-capphat="${esc(t.id)}">Điều chuyển</button> ` +
                 `<button class="btn-nho" data-ts-thuhoi="${esc(t.id)}">Thu hồi</button> ` +
                 `<button class="btn-nho" data-ts-thanhly="${esc(t.id)}">Thanh lý</button> `;
        }
        if (quanLy || laNguoiGiu) nut += `<button class="btn-nho" data-ts-baohong="${esc(t.id)}">Báo hỏng</button> `;
      } else if (t.trang_thai === 'bao_hong' && quanLy) {
        nut += `<button class="btn-nho" data-ts-baotrixong="${esc(t.id)}">Bảo trì xong</button> ` +
               `<button class="btn-nho" data-ts-thanhly="${esc(t.id)}">Thanh lý</button> `;
      }
      nut += `<button class="btn-nho btn-phu" data-ts-lichsu="${esc(t.id)}">Lịch sử</button>`;
      return `<td class="sm">${esc(t.ma_ts)}</td>` +
        `<td><div class="nm">${esc(t.ten)}</div></td>` +
        `<td class="sm">${esc(t.danh_muc || '—')}</td>` +
        `<td><span class="tag ${tt.mau}">${esc(tt.chu)}</span></td>` +
        `<td class="sm">${t.nguoi_giu_ten ? esc(t.nguoi_giu_ten) + (t.nguoi_giu_ma ? ' · ' + esc(t.nguoi_giu_ma) : '') : '—'}</td>` +
        `<td class="sm">${esc(t.vi_tri || '—')}</td>` +
        `<td>${nut}</td>`;
    });
  }

  async function taiLai() {
    const kq = await API.taiSanDanhSach();
    DS_TS = kq.ds || [];
    quanLy = !!(kq.quyen && kq.quyen.quan_ly);
    $('#ts-panel-them').hidden = !quanLy;
    ve();
  }

  function xoaLocTS() {
    if ($('#ts-tim')) $('#ts-tim').value = '';
    if ($('#ts-loctrangthai')) $('#ts-loctrangthai').value = '';
    ve();
  }
  $('#ts-tim').addEventListener('input', ve);
  $('#ts-loctrangthai').addEventListener('change', ve);
  $('#ts-xoaloc').addEventListener('click', xoaLocTS);

  $('#tsThemForm').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#tsThemLoi'); oLoi.textContent = '';
    try {
      await API.taiSanThem({
        ten: $('#tsThemTen').value.trim(),
        danh_muc: $('#tsThemDanhMuc').value.trim(),
        vi_tri: $('#tsThemViTri').value.trim()
      });
      $('#tsThemForm').reset();
      await taiLai();
    } catch (err) { oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.'; }
  });

  /* Cấp phát/Điều chuyển — mở modal chọn nhân sự (dùng chung danh bạ, đỡ
     gọi thêm API riêng). */
  let dsNhanSuChon = [];
  async function moModalCapPhat(id) {
    if (!dsNhanSuChon.length) {
      try { const kq = await API.danhBa(); dsNhanSuChon = kq.danh_ba || []; } catch { dsNhanSuChon = []; }
    }
    const t = DS_TS.find(x => x.id === id);
    $('#tsCapPhatId').value = id;
    $('#tsCapPhatTieuDe').textContent = 'Cấp phát: ' + (t ? t.ten : '');
    $('#tsCapPhatNguoi').value = '';
    ganCombo({
      hienThi: $('#tsCapPhatNguoiHienThi'), panel: $('#tsCapPhatNguoiPanel'),
      tim: $('#tsCapPhatNguoiTim'), goiY: $('#tsCapPhatNguoiGoiY'), giaTri: $('#tsCapPhatNguoi')
    }, () => dsNhanSuChon.map(n => ({ gia_tri: n.id, nhan: nhanNhanSu(n) })),
      null, 'Chọn nhân sự...');
    $('#tsCapPhatViTri').value = t ? (t.vi_tri || '') : '';
    $('#tsCapPhatGhiChu').value = '';
    $('#tsCapPhatLoi').textContent = '';
    $('#tsCapPhatModalNen').hidden = false;
  }
  $('#tsCapPhatHuy').addEventListener('click', () => { $('#tsCapPhatModalNen').hidden = true; });
  $('#tsCapPhatForm').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#tsCapPhatLoi'); oLoi.textContent = '';
    try {
      await API.taiSanCapPhat({
        id: $('#tsCapPhatId').value,
        nguoi_giu_id: $('#tsCapPhatNguoi').value,
        vi_tri: $('#tsCapPhatViTri').value.trim(),
        ghi_chu: $('#tsCapPhatGhiChu').value.trim()
      });
      $('#tsCapPhatModalNen').hidden = true;
      await taiLai();
    } catch (err) { oLoi.textContent = err.message || 'Không cấp phát được, thử lại nhé.'; }
  });

  async function moModalLichSu(id) {
    const t = DS_TS.find(x => x.id === id);
    $('#tsLichSuTieuDe').textContent = 'Lịch sử: ' + (t ? t.ten : '');
    const box = $('#tsLichSuDanhSach');
    box.innerHTML = '<p class="hint">Đang tải…</p>';
    $('#tsLichSuTrong').hidden = true;
    $('#tsLichSuModalNen').hidden = false;
    try {
      const kq = await API.taiSanLichSu(id);
      const ds = kq.ds || [];
      $('#tsLichSuTrong').hidden = ds.length > 0;
      box.innerHTML = ds.map(ls => `<div class="list-item">` +
        `<div class="nm">${esc(NHAN_SU_KIEN_TS[ls.loai_su_kien] || ls.loai_su_kien)}</div>` +
        `<div class="sm">${esc(ls.luc)} · ${esc(ls.nguoi_thuc_hien_ten || '')}` +
        (ls.nguoi_giu_moi_ten ? ` · giao cho ${esc(ls.nguoi_giu_moi_ten)}` : '') +
        (ls.ghi_chu ? ` · ${esc(ls.ghi_chu)}` : '') + `</div></div>`).join('');
    } catch (err) { box.innerHTML = `<p class="hint">${esc(err.message || 'Không tải được lịch sử.')}</p>`; }
  }
  $('#tsLichSuDong').addEventListener('click', () => { $('#tsLichSuModalNen').hidden = true; });

  $('#ts-bang').addEventListener('click', async e => {
    const btnCapPhat = e.target.closest('[data-ts-capphat]');
    const btnThuHoi = e.target.closest('[data-ts-thuhoi]');
    const btnBaoHong = e.target.closest('[data-ts-baohong]');
    const btnBaoTriXong = e.target.closest('[data-ts-baotrixong]');
    const btnThanhLy = e.target.closest('[data-ts-thanhly]');
    const btnLichSu = e.target.closest('[data-ts-lichsu]');
    try {
      if (btnCapPhat) {
        await moModalCapPhat(btnCapPhat.dataset.tsCapphat);
      } else if (btnThuHoi) {
        if (!confirm('Thu hồi tài sản này về kho?')) return;
        await API.taiSanThuHoi({ id: btnThuHoi.dataset.tsThuhoi }); await taiLai();
      } else if (btnBaoHong) {
        moHopNhap({
          tieuDe: 'Báo hỏng tài sản',
          loai: 'textarea',
          nhan: 'Mô tả tình trạng hỏng',
          placeholder: 'Không bắt buộc',
          xuLyLuu: async val => { await API.taiSanBaoHong({ id: btnBaoHong.dataset.tsBaohong, ghi_chu: val }); await taiLai(); }
        });
      } else if (btnBaoTriXong) {
        if (!confirm('Xác nhận đã sửa xong — tài sản về trạng thái sẵn sàng?')) return;
        await API.taiSanBaoTriXong({ id: btnBaoTriXong.dataset.tsBaotrixong }); await taiLai();
      } else if (btnThanhLy) {
        if (!confirm('Thanh lý tài sản này? Sau đó không cấp phát lại được nữa.')) return;
        await API.taiSanThanhLy({ id: btnThanhLy.dataset.tsThanhly }); await taiLai();
      } else if (btnLichSu) {
        await moModalLichSu(btnLichSu.dataset.tsLichsu);
      }
    } catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
  });

  await taiLai();
}

/* ==========================================================================
   ĐĂNG KÝ CA / XẾP CA TUẦN — Part-time & Thời vụ (xem docs/ENTITY_IDENTITY.md)
   ---------------------------------------------------------------------------
   2 màn hình độc lập trong cùng 1 tab: "Đăng ký ca" (nhân viên part-time/
   thời vụ tự đăng ký) và "Xếp ca tuần" (trưởng phòng xem ma trận cả tuần,
   duyệt/từ chối/gán ca/chốt lịch). Cùng 1 bộ dữ liệu — không tạo bảng riêng
   cho ma trận, ma trận chỉ là lớp hiển thị + hành động trên dang_ky_ca/
   lich_lam_viec đã có.
   ========================================================================== */
async function khoiDongXepCa() {
  const THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  // KHÔNG dùng "Đã duyệt/Chờ duyệt" — hệ thống không còn duyệt từng đăng ký
  // (xem docs). "cho_duyet" = đã khai báo có thể làm, chưa được xếp; "da_duyet"
  // = ERP (hoặc trưởng phòng) đã xếp vào lịch; "cho_xep" = còn trong danh sách
  // chờ (available nhưng chưa được chọn); "tu_choi" = trưởng phòng loại hẳn.
  const NHAN_TT_DK = {
    cho_duyet: { chu: 'Đã đăng ký', mau: 'warn' },
    cho_xep:   { chu: 'Danh sách chờ', mau: 'warn' },
    da_duyet:  { chu: 'Đã xếp', mau: 'ok' },
    tu_choi:   { chu: 'Không được chọn', mau: 'danger' }
  };

  function ngayISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function dauTuanCuaNgay(d) {
    const x = new Date(d);
    const thu = x.getDay();
    x.setDate(x.getDate() + (thu === 0 ? -6 : 1 - thu));
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function nhanNgayNgan(iso) {
    const d = new Date(iso + 'T00:00:00');
    return `${THU_NGAN[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  }

  /* ---- Chuyển màn Đăng ký ca / Xếp ca tuần / Cấu hình ca ---- */
  if (TOI.quan_ly_chinh_sach_ca) $('#xcSegCauHinh').hidden = false;
  $('#xcSeg').addEventListener('click', e => {
    const nut = e.target.closest('.seg-nut');
    if (!nut) return;
    document.querySelectorAll('#xcSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    $('#xc-pane-dangky').hidden = nut.dataset.xc !== 'dangky';
    $('#xc-pane-xep').hidden = nut.dataset.xc !== 'xep';
    $('#xc-pane-cauhinh').hidden = nut.dataset.xc !== 'cauhinh';
  });

  /* ---- Mẫu ca: HR quản lý danh mục, nhưng ai có tab 'xepca' cũng ĐỌC được
     (trưởng phòng cần danh sách này để lập Kế hoạch nhân lực tuần). ---- */
  let dsMauCa = [];
  async function taiMauCaDungChung() {
    const kq = await API.caMauCa().catch(() => ({ ds: [] }));
    dsMauCa = kq.ds || [];
  }
  await taiMauCaDungChung();

  /* ================= HR/ADMIN: Cấu hình Mẫu ca ================= */
  if (TOI.quan_ly_chinh_sach_ca) {
    function veMauCaList() {
      $('#xcMauCaDem').textContent = dsMauCa.length ? `${dsMauCa.length} mẫu ca` : '';
      const box = $('#xcMcList');
      box.innerHTML = '';
      dsMauCa.forEach(m => {
        box.appendChild(el('div', 'list-item',
          `<div class="body"><b>${esc(m.ma_ca)} — ${esc(m.ten_ca)}</b><span>${esc(m.gio_bat_dau)}–${esc(m.gio_ket_thuc)}</span></div>` +
          `<div class="meta"><button type="button" class="btn-nho" data-mc-sua="${esc(m.id)}">Sửa</button> ` +
          `<button type="button" class="btn-nho btn-phu" data-mc-xoa="${esc(m.id)}">Xoá</button></div>`
        ));
      });
    }
    veMauCaList();

    function dienFormMauCa(m) {
      $('#xcMcId').value = m ? m.id : '';
      $('#xcMcMa').value = m ? m.ma_ca : '';
      $('#xcMcTen').value = m ? m.ten_ca : '';
      $('#xcMcBatDau').value = m ? m.gio_bat_dau : '';
      $('#xcMcKetThuc').value = m ? m.gio_ket_thuc : '';
      $('#xcMcNutThem').textContent = m ? 'Lưu thay đổi' : '+ Thêm mẫu ca';
      $('#xcMcNutHuy').hidden = !m;
      $('#xcMcLoi').textContent = '';
    }

    $('#xcMcNutHuy').addEventListener('click', () => { $('#xcMauCaForm').reset(); dienFormMauCa(null); });

    $('#xcMauCaForm').addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#xcMcLoi'); oLoi.textContent = '';
      const dangSua = $('#xcMcId').value;
      const du = {
        ma_ca: $('#xcMcMa').value.trim(),
        ten_ca: $('#xcMcTen').value.trim(),
        gio_bat_dau: $('#xcMcBatDau').value,
        gio_ket_thuc: $('#xcMcKetThuc').value
      };
      try {
        if (dangSua) await API.caSuaMauCa({ id: dangSua, ...du });
        else await API.caThemMauCa(du);
        $('#xcMauCaForm').reset();
        dienFormMauCa(null);
        await taiMauCaDungChung();
        veMauCaList();
      } catch (err) { oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.'; }
    });

    $('#xcMcList').addEventListener('click', async e => {
      const btnSua = e.target.closest('[data-mc-sua]');
      const btnXoa = e.target.closest('[data-mc-xoa]');
      if (btnSua) {
        const m = dsMauCa.find(x => x.id === btnSua.dataset.mcSua);
        if (m) dienFormMauCa(m);
      } else if (btnXoa) {
        if (!confirm('Xoá mẫu ca này? Nếu đã có ca mở dùng mẫu này thì hệ thống sẽ tự ẩn thay vì xoá hẳn.')) return;
        try {
          const kq = await API.caXoaMauCa(btnXoa.dataset.mcXoa);
          if (kq.da_an) alert('Mẫu ca này đã có Ca mở dùng rồi nên chỉ ẩn đi, không xoá hẳn được (giữ đúng dữ liệu lịch sử).');
          await taiMauCaDungChung();
          veMauCaList();
        } catch (err) { alert(err.message || 'Không xoá được, thử lại nhé.'); }
      }
    });
  }

  /* ================= NHÂN VIÊN: Đăng ký ca ================= */
  async function taiDangKy() {
    const kq = await API.caDangMo();
    const duocDangKy = ['ban_thoi_gian', 'thoi_vu'].includes(kq.loai_lao_dong);
    $('#xc-khongduockyy').hidden = duocDangKy;
    $('#xc-dangky-body').hidden = !duocDangKy;
    if (!duocDangKy) return;

    const ds = kq.ds || [];
    $('#xcDangMoDem').textContent = ds.length ? `${ds.length} ca` : '';
    $('#xc-dangky-trong').hidden = ds.length > 0;
    const box = $('#xc-dangky-list');
    box.innerHTML = '';
    ds.forEach(c => {
      const tt = c.dang_ky_trang_thai ? (NHAN_TT_DK[c.dang_ky_trang_thai] || { chu: c.dang_ky_trang_thai, mau: 'mute' }) : null;
      let hanhDong = '';
      if (!c.dang_ky_id) {
        hanhDong = `<button type="button" class="btn-nho btn-primary" data-xc-dk="${esc(c.id)}">Đăng ký</button>`;
      } else if (['cho_duyet', 'cho_xep'].includes(c.dang_ky_trang_thai)) {
        hanhDong = `<button type="button" class="btn-nho btn-phu" data-xc-huy="${esc(c.dang_ky_id)}">Hủy đăng ký</button>`;
      }
      // Nhân viên chỉ cần biết ca gì, giờ nào, kết quả ra sao — không cần
      // thấy số liệu quản trị (Cần X người/Đã duyệt Y) như màn Xếp ca tuần.
      box.appendChild(el('div', 'list-item',
        `<div class="body"><b>${nhanNgayNgan(c.ngay)} · ${esc(c.ten_ca)} (${esc(c.gio_bat_dau)}–${esc(c.gio_ket_thuc)})</b>` +
          `${!c.dang_ky_id ? '<span>Còn nhận đăng ký</span>' : ''}</div>` +
        `<div class="meta">${tt ? `<span class="tag ${tt.mau}">${tt.chu}</span> ` : ''}${hanhDong}</div>`
      ));
    });
  }

  $('#xc-dangky-list').addEventListener('click', async e => {
    const btnDk = e.target.closest('[data-xc-dk]');
    const btnHuy = e.target.closest('[data-xc-huy]');
    try {
      if (btnDk) { await API.caDangKy({ ca_mo_id: btnDk.dataset.xcDk }); await taiDangKy(); }
      else if (btnHuy) {
        if (!confirm('Hủy đăng ký ca này?')) return;
        await API.caHuyDangKy(btnHuy.dataset.xcHuy); await taiDangKy();
      }
    } catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
  });

  async function taiLichCuaToi() {
    const homNay = ngayISO(new Date());
    const den = ngayISO(new Date(Date.now() + 30 * 86400000));
    const kq = await API.caLichCuaToi(homNay, den).catch(() => ({ ds: [] }));
    const ds = kq.ds || [];
    $('#xc-lichtoi-trong').hidden = ds.length > 0;
    const box = $('#xc-lichtoi-list');
    box.innerHTML = '';
    ds.forEach(l => {
      const khoa = !!l.khoa_luc;
      box.appendChild(el('div', 'list-item',
        `<div class="body"><b>${nhanNgayNgan(l.ngay)} · ${esc(l.ten_ca)} (${esc(l.gio_bat_dau)}–${esc(l.gio_ket_thuc)})</b>` +
          `<span>${l.nguon === 'xep_thu_cong' ? 'Trưởng phòng xếp' : 'Từ đăng ký của bạn'}</span></div>` +
        `<div class="meta"><span class="tag ${khoa ? 'ok' : 'sage'}">${khoa ? 'Đã chốt' : 'Đã xếp'}</span></div>`
      ));
    });
  }

  /* ================= TRƯỞNG PHÒNG: Xếp ca tuần (ma trận) ================= */
  let dsPhongBanQuanLy = TOI.phong_ban_quan_ly || [];
  let tuanHienTai = dauTuanCuaNgay(new Date());
  let duLieuTuan = null;   // kết quả API.caMaTranTuan gần nhất

  if (TOI.la_admin && !dsPhongBanQuanLy.length) {
    // Admin không nhất thiết được gán trưởng phòng nhưng vẫn cần xem/duyệt
    // được mọi phòng — lấy toàn bộ danh sách phòng ban đang hoạt động.
    try {
      const kq = await API.dlnPhongBan();
      dsPhongBanQuanLy = (kq.ds || []).filter(p => p.hoat_dong).map(p => ({ id: p.id, ten: p.ten }));
    } catch { /* kệ, để trống */ }
  }

  const coQuyenXep = dsPhongBanQuanLy.length > 0;
  $('#xc-khongquanly').hidden = coQuyenXep;
  $('#xc-xep-body').hidden = !coQuyenXep;

  if (coQuyenXep) {
    $('#xcPhongBan').innerHTML = dsPhongBanQuanLy.map(p => `<option value="${p.id}">${esc(p.ten)}</option>`).join('');

    function tuanLabel() {
      const cuoiTuan = new Date(tuanHienTai); cuoiTuan.setDate(cuoiTuan.getDate() + 6);
      $('#xcTuanLabel').textContent = `${tuanHienTai.getDate()}/${tuanHienTai.getMonth() + 1} – ${cuoiTuan.getDate()}/${cuoiTuan.getMonth() + 1}/${cuoiTuan.getFullYear()}`;
    }

    async function taiMaTran() {
      tuanLabel();
      const phongBanId = $('#xcPhongBan').value;
      if (!phongBanId) return;
      const tu = ngayISO(tuanHienTai);
      const cuoiTuan = new Date(tuanHienTai); cuoiTuan.setDate(cuoiTuan.getDate() + 6);
      const den = ngayISO(cuoiTuan);
      try { duLieuTuan = await API.caMaTranTuan(phongBanId, tu, den); }
      catch (err) { alert(err.message || 'Không tải được dữ liệu tuần này.'); duLieuTuan = null; return; }
      veMaTran(tu);
      veKeHoach(tu);
    }

    /* ---- Kế hoạch nhân lực tuần: 1 hàng/mẫu ca, cột = 7 ngày, ô nhập số
       người cần. Trưởng phòng nhập xong bấm "Mở đăng ký cho tuần" 1 lần —
       không phải mở từng ca một (đúng nguyên tắc Data Ownership ERP V2). */
    function veKeHoach(tuNgay) {
      $('#xc-kehoach-chuacomauca').hidden = dsMauCa.length > 0;
      $('#xc-kehoach-noidung').hidden = dsMauCa.length === 0;
      if (!dsMauCa.length) return;

      const cacNgay = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(tuNgay + 'T00:00:00'); d.setDate(d.getDate() + i); return ngayISO(d);
      });
      $('#xc-kehoach-thead').innerHTML = '<tr><th class="xc-col-fixed">Ca</th>' +
        cacNgay.map(ng => `<th>${nhanNgayNgan(ng)}</th>`).join('') + '</tr>';

      const caMoHienCo = duLieuTuan ? duLieuTuan.ca_mo : [];
      $('#xc-kehoach-tbody').innerHTML = dsMauCa.map(mc => {
        const oCells = cacNgay.map(ng => {
          const cm = caMoHienCo.find(c => c.mau_ca_id === mc.id && c.ngay === ng);
          const gtri = cm ? cm.can_bao_nhieu_nguoi : '';
          return `<td><input type="text" inputmode="numeric" class="xc-kh-o" data-xc-kh-ngay="${ng}" data-xc-kh-mauca="${mc.id}" value="${gtri}" style="width:44px;text-align:center;border:1px solid var(--line);border-radius:6px;padding:3px"></td>`;
        }).join('');
        return `<tr><td class="xc-col-fixed sm">${esc(mc.ma_ca)} — ${esc(mc.ten_ca)}<br><span style="font-weight:400">${esc(mc.gio_bat_dau)}–${esc(mc.gio_ket_thuc)}</span></td>${oCells}</tr>`;
      }).join('');
    }

    $('#xcMoDangKyTuan').addEventListener('click', async () => {
      const oLoi = $('#xcKeHoachLoi'); oLoi.textContent = '';
      const danhSach = Array.from(document.querySelectorAll('.xc-kh-o'))
        .map(o => ({ ngay: o.dataset.xcKhNgay, mau_ca_id: o.dataset.xcKhMauca, can_bao_nhieu_nguoi: o.value.trim() }))
        .filter(o => parseInt(o.can_bao_nhieu_nguoi, 10) > 0);
      if (!danhSach.length) { oLoi.textContent = 'Chưa nhập số người cần cho ca nào.'; return; }
      try {
        const kq = await API.caMoDangKyTuan({
          phong_ban_id: $('#xcPhongBan').value,
          han_dang_ky: $('#xcKeHoachHan').value || null,
          danh_sach: danhSach
        });
        alert(`Đã mở ${kq.da_mo} ca mới, cập nhật ${kq.da_cap_nhat} ca đã có.`);
        await taiMaTran();
      } catch (err) { oLoi.textContent = err.message || 'Không mở đăng ký được, thử lại nhé.'; }
    });

    function veMaTran(tuNgay) {
      if (!duLieuTuan) return;
      const { nhan_su, dang_ky, ca_mo, lich_lam } = duLieuTuan;
      const cacNgay = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(tuNgay + 'T00:00:00'); d.setDate(d.getDate() + i); return ngayISO(d);
      });

      // ---- Tổng quan nhân lực theo ca (mỗi ca_mo 1 dòng) ----
      const boxTQ = $('#xc-tongquan-ca');
      boxTQ.innerHTML = '';
      let soCaThieu = 0;
      ca_mo.forEach(cm => {
        const daXep = dang_ky.filter(d => d.ca_mo_id === cm.id && d.trang_thai === 'da_duyet').length;
        const dangCho = dang_ky.filter(d => d.ca_mo_id === cm.id && ['cho_duyet', 'cho_xep'].includes(d.trang_thai)).length;
        const can = cm.can_bao_nhieu_nguoi || 0;
        let ttChu = 'Đủ', ttCls = 'du';
        if (daXep < can) { ttChu = `Thiếu ${can - daXep}`; ttCls = 'thieu'; soCaThieu++; }
        else if (daXep > can) { ttChu = `Dư ${daXep - can}`; ttCls = 'du_thua'; }
        const r = el('div', 'list-item',
          `<div class="body"><b>${nhanNgayNgan(cm.ngay)} · ${esc(cm.ten_ca)} (${esc(cm.gio_bat_dau)}–${esc(cm.gio_ket_thuc)})</b>` +
            `<span>Đã xếp ${daXep}/${can}${dangCho ? ` · ${dangCho} đang chờ` : ''}</span></div>` +
          `<div class="meta"><span class="xc-ngay-tt ${ttCls}">${ttChu}</span> ` +
          (dangCho ? `<button type="button" class="btn-nho" data-xc-duyetca="${cm.id}">Tự xếp ca này</button>` : '') + `</div>`
        );
        boxTQ.appendChild(r);
      });
      const tongCho = dang_ky.filter(d => ['cho_duyet', 'cho_xep'].includes(d.trang_thai)).length;
      if (tongCho) {
        boxTQ.appendChild(el('div', 'list-item',
          `<div class="body"><b>Toàn bộ tuần</b><span>${tongCho} người đang chờ xếp</span></div>` +
          `<div class="meta"><button type="button" class="btn-nho btn-primary" data-xc-duyettuan="1">Xếp tất cả còn chờ</button></div>`
        ));
      }

      // ---- Cần xử lý (exception) — trưởng phòng chỉ cần nhìn đây thay vì
      // lướt qua từng người đã hợp lệ ----
      const soChuaXep = dang_ky.filter(d => d.trang_thai === 'cho_xep').length;
      const boxCX = $('#xc-canxuly-list');
      const canXuLy = [];
      if (soCaThieu) canXuLy.push(`${soCaThieu} ca còn thiếu người`);
      if (soChuaXep) canXuLy.push(`${soChuaXep} người đã đăng ký nhưng chưa được xếp (danh sách chờ)`);
      $('#xc-canxuly-panel').hidden = canXuLy.length === 0;
      if (canXuLy.length) {
        boxCX.innerHTML = canXuLy.map(t => `<div class="list-item"><div class="body"><span>⚠️ ${esc(t)}</span></div></div>`).join('');
      }

      // ---- Ma trận: header ----
      const thead = $('#xc-matrix-thead');
      thead.innerHTML = '<tr><th class="xc-col-fixed">Mã NV</th><th class="xc-col-fixed">Họ và tên</th><th>Loại LĐ</th>' +
        cacNgay.map(ng => `<th>${nhanNgayNgan(ng)}</th>`).join('') + '</tr>';

      // ---- Ma trận: body ----
      const NHAN_LLD = { toan_thoi_gian: 'Toàn TG', ban_thoi_gian: 'Part-time', thoi_vu: 'Thời vụ' };
      const tbody = $('#xc-matrix-tbody');
      tbody.innerHTML = '';
      $('#xc-matrix-trong').hidden = nhan_su.length > 0;

      nhan_su.forEach((ns, i) => {
        const tr = document.createElement('tr');
        let hang = `<td class="xc-col-fixed">${esc(ns.ma_nv || '—')}</td>` +
          `<td class="xc-col-fixed xc-ten">${esc(ns.ho_ten)}</td>` +
          `<td class="sm">${NHAN_LLD[ns.loai_lao_dong] || ns.loai_lao_dong}</td>`;

        cacNgay.forEach(ng => {
          const dkNgay = dang_ky.filter(d => d.nhan_su_id === ns.id && d.ngay === ng);
          if (!dkNgay.length) {
            hang += `<td><span class="xc-o trong" data-xc-o-trong="1" data-xc-ns="${esc(ns.id)}" data-xc-ngay="${ng}">+</span></td>`;
          } else {
            const oCells = dkNgay.map(d => {
              const llv = lich_lam.find(l => l.nhan_su_id === ns.id && l.ca_mo_id === d.ca_mo_id);
              const khoa = llv && llv.khoa_luc;
              const cls = khoa ? 'khoa' : d.trang_thai;
              return `<span class="xc-o ${cls}" data-xc-o-dk="${esc(d.id)}" title="${esc(d.ten_ca)} ${esc(d.gio_bat_dau)}-${esc(d.gio_ket_thuc)}">${esc(d.ma_ca)}</span>`;
            }).join('');
            hang += `<td>${oCells}</td>`;
          }
        });
        tr.innerHTML = hang;
        tbody.appendChild(tr);
      });
    }

    /* ---- Click 1 ô: mở hộp chi tiết/hành động ---- */
    let oDangMoDangKyId = null, oDangMoTrongInfo = null;

    function dongModalO() { $('#xcOModalNen').hidden = true; }
    $('#xcODong').addEventListener('click', dongModalO);
    $('#xcOModalNen').addEventListener('click', e => { if (e.target.id === 'xcOModalNen') dongModalO(); });

    function moModalChiTiet(dkId) {
      const d = duLieuTuan.dang_ky.find(x => x.id === dkId);
      if (!d) return;
      const ns = duLieuTuan.nhan_su.find(n => n.id === d.nhan_su_id);
      const llv = duLieuTuan.lich_lam.find(l => l.nhan_su_id === d.nhan_su_id && l.ca_mo_id === d.ca_mo_id);
      const khoa = llv && llv.khoa_luc;
      oDangMoDangKyId = dkId; oDangMoTrongInfo = null;

      $('#xcOTieuDe').textContent = `${ns ? ns.ho_ten : ''} — ${nhanNgayNgan(d.ngay)}`;
      $('#xcOChiTiet').innerHTML =
        `<div>Ca: <b>${esc(d.ten_ca)}</b> (${esc(d.gio_bat_dau)}–${esc(d.gio_ket_thuc)})</div>` +
        `<div>Đăng ký lúc: ${esc(d.tao_luc || '—')}</div>` +
        (d.ghi_chu_ns ? `<div>Ghi chú nhân viên: ${esc(d.ghi_chu_ns)}</div>` : '') +
        (d.ly_do_de_xuat ? `<div class="hint">Được đề xuất vì: ${esc(d.ly_do_de_xuat)}</div>` : '') +
        (d.nguoi_duyet_ten ? `<div>Người xếp: ${esc(d.nguoi_duyet_ten)} · ${esc(d.duyet_luc || '')}</div>` : '') +
        (d.ly_do_tu_choi ? `<div>Lý do không chọn: ${esc(d.ly_do_tu_choi)}</div>` : '') +
        (khoa ? `<div><span class="tag ok">Đã chốt lịch</span></div>` : '');

      const choDuyet = ['cho_duyet', 'cho_xep'].includes(d.trang_thai) && !khoa;
      $('#xcODuyet').hidden = !choDuyet;
      $('#xcOTuChoiNut').hidden = !choDuyet;
      $('#xcOTuChoiXacNhan').hidden = true;
      $('#xcOTuChoiBox').hidden = true;
      $('#xcOGanCaBox').hidden = true;
      $('#xcOGanCaNut').hidden = true;
      $('#xcOLoi').textContent = '';
      $('#xcOModalNen').hidden = false;
    }

    function moModalGanCa(nhanSuId, ngay) {
      const ns = duLieuTuan.nhan_su.find(n => n.id === nhanSuId);
      const daCoCaMoId = new Set(duLieuTuan.dang_ky.filter(d => d.nhan_su_id === nhanSuId && d.ngay === ngay).map(d => d.ca_mo_id));
      const chonDuoc = duLieuTuan.ca_mo.filter(cm => cm.ngay === ngay && !daCoCaMoId.has(cm.id));
      oDangMoDangKyId = null; oDangMoTrongInfo = { nhanSuId, ngay };

      $('#xcOTieuDe').textContent = `Gán ca — ${ns ? ns.ho_ten : ''} — ${nhanNgayNgan(ngay)}`;
      $('#xcOChiTiet').innerHTML = '';
      $('#xcODuyet').hidden = true;
      $('#xcOTuChoiNut').hidden = true;
      $('#xcOTuChoiXacNhan').hidden = true;
      $('#xcOTuChoiBox').hidden = true;
      $('#xcOLoi').textContent = '';

      if (!chonDuoc.length) {
        $('#xcOGanCaBox').hidden = true;
        $('#xcOGanCaNut').hidden = true;
        $('#xcOChiTiet').innerHTML = '<span class="sm">Không còn ca nào mở cho ngày này.</span>';
      } else {
        $('#xcOChonCa').innerHTML = chonDuoc.map(cm => `<option value="${cm.id}">${esc(cm.ma_ca)} — ${esc(cm.ten_ca)} (${esc(cm.gio_bat_dau)}-${esc(cm.gio_ket_thuc)})</option>`).join('');
        $('#xcOGanCaBox').hidden = false;
        $('#xcOGanCaNut').hidden = false;
      }
      $('#xcOModalNen').hidden = false;
    }

    $('#xc-matrix-tbody').addEventListener('click', e => {
      const oDk = e.target.closest('[data-xc-o-dk]');
      const oTrong = e.target.closest('[data-xc-o-trong]');
      if (oDk) moModalChiTiet(oDk.dataset.xcODk);
      else if (oTrong) moModalGanCa(oTrong.dataset.xcNs, oTrong.dataset.xcNgay);
    });

    $('#xcODuyet').addEventListener('click', async () => {
      try { await API.caDuyet(oDangMoDangKyId); dongModalO(); await taiMaTran(); }
      catch (err) { $('#xcOLoi').textContent = err.message || 'Không duyệt được.'; }
    });
    $('#xcOTuChoiNut').addEventListener('click', () => {
      $('#xcOTuChoiBox').hidden = false;
      $('#xcOTuChoiNut').hidden = true;
      $('#xcOTuChoiXacNhan').hidden = false;
    });
    $('#xcOTuChoiXacNhan').addEventListener('click', async () => {
      try {
        await API.caTuChoi(oDangMoDangKyId, $('#xcOLyDoTuChoi').value.trim());
        dongModalO(); await taiMaTran();
      } catch (err) { $('#xcOLoi').textContent = err.message || 'Không từ chối được.'; }
    });
    $('#xcOGanCaNut').addEventListener('click', async () => {
      if (!oDangMoTrongInfo) return;
      try {
        await API.caGanThuCong({ nhan_su_id: oDangMoTrongInfo.nhanSuId, ca_mo_id: $('#xcOChonCa').value });
        dongModalO(); await taiMaTran();
      } catch (err) { $('#xcOLoi').textContent = err.message || 'Không gán ca được.'; }
    });

    /* ---- Duyệt tất cả (1 ca_mo hoặc cả tuần đang chờ) ---- */
    $('#xc-tongquan-ca').addEventListener('click', async e => {
      const btnCa = e.target.closest('[data-xc-duyetca]');
      const btnTuan = e.target.closest('[data-xc-duyettuan]');
      if (!btnCa && !btnTuan) return;
      const ids = btnCa
        ? duLieuTuan.dang_ky.filter(d => d.ca_mo_id === btnCa.dataset.xcDuyetca && ['cho_duyet', 'cho_xep'].includes(d.trang_thai)).map(d => d.id)
        : duLieuTuan.dang_ky.filter(d => ['cho_duyet', 'cho_xep'].includes(d.trang_thai)).map(d => d.id);
      if (!ids.length) return;
      if (!confirm(`Tự xếp ${ids.length} người đang chờ vào ca?`)) return;
      try {
        const kq = await API.caDuyetHangLoat(ids);
        if (kq.loi && kq.loi.length) alert(`Đã xếp ${kq.thanh_cong.length}, lỗi ${kq.loi.length}:\n` + kq.loi.map(x => x.loi).join('\n'));
        await taiMaTran();
      } catch (err) { alert(err.message || 'Không xếp được.'); }
    });

    /* ---- Xếp lịch tự động (Auto Allocation) — luồng chính, thay cho duyệt
       từng đăng ký. Chạy lại an toàn: không đụng vào ai đã được xếp/loại
       thủ công từ trước, chỉ xử lý người đang ở trạng thái chờ. ---- */
    $('#xcXepTuDong').addEventListener('click', async () => {
      const oLoi = $('#xcXepTuDongLoi'); oLoi.textContent = '';
      const phongBanId = $('#xcPhongBan').value;
      const tu = ngayISO(tuanHienTai);
      const cuoiTuan = new Date(tuanHienTai); cuoiTuan.setDate(cuoiTuan.getDate() + 6);
      const den = ngayISO(cuoiTuan);
      try {
        const kq = await API.caXepTuDong({ phong_ban_id: phongBanId, tu_ngay: tu, den_ngay: den });
        alert(`Đã xếp ${kq.so_da_xep} người vào lịch. Còn ${kq.so_cho_xep} người trong danh sách chờ (không đủ chỗ hoặc trùng giờ).`);
        await taiMaTran();
      } catch (err) { oLoi.textContent = err.message || 'Không xếp được, thử lại nhé.'; }
    });

    /* ---- Điều hướng tuần ---- */
    $('#xcPhongBan').addEventListener('change', taiMaTran);
    $('#xcTuanTruoc').addEventListener('click', () => { tuanHienTai.setDate(tuanHienTai.getDate() - 7); taiMaTran(); });
    $('#xcTuanSau').addEventListener('click', () => { tuanHienTai.setDate(tuanHienTai.getDate() + 7); taiMaTran(); });

    /* ---- Chốt lịch tuần ---- */
    $('#xcChotLich').addEventListener('click', async () => {
      const phongBanId = $('#xcPhongBan').value;
      const tu = ngayISO(tuanHienTai);
      const cuoiTuan = new Date(tuanHienTai); cuoiTuan.setDate(cuoiTuan.getDate() + 6);
      const den = ngayISO(cuoiTuan);
      try {
        let kq = await API.caChotLichTuan({ phong_ban_id: phongBanId, tu_ngay: tu, den_ngay: den });
        if (kq.canh_bao) {
          if (!confirm(`Còn ${kq.con_cho_duyet} đăng ký chưa duyệt trong tuần này. Vẫn chốt lịch?`)) return;
          kq = await API.caChotLichTuan({ phong_ban_id: phongBanId, tu_ngay: tu, den_ngay: den, xac_nhan: true });
        }
        alert(`Đã chốt ${kq.da_khoa || 0} ca làm việc trong tuần.`);
        await taiMaTran();
      } catch (err) { alert(err.message || 'Không chốt được lịch tuần.'); }
    });

    await taiMaTran();
  }

  await taiDangKy();
  await taiLichCuaToi();
}

async function khoiDongKho() {
  const qKho = TOI.kho || { thao_tac: false, quan_ly: false, gia_von: false };
  let DS_SP = [];          // danh sách sản phẩm + tồn, lấy từ máy chủ
  let xemGiaVon = false;
  // Khoá/mở khoá Sản phẩm/SKU giờ CHỈ dành cho Kinh doanh/Admin (chủ sở
  // hữu định nghĩa sản phẩm) — Quản lý kho vẫn Sửa được (qKho.quan_ly) như
  // trước nhưng KHÔNG còn thấy nút Khoá nữa. Cờ riêng lấy từ API.khoSanPham(),
  // không dùng qKho.quan_ly cho việc này.
  let khoaSanPhamOk = false;

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
  // Không được quản lý kho → giấu ô thêm mã hàng + tab Danh mục (Đơn vị
  // tính/NCC/Kho — chuyển từ Dữ liệu nền, cùng chủ sở hữu quan_ly_kho).
  if (qKho.quan_ly) {
    $('#kv-panel-them').hidden = false;
    $('#kvDonVi').innerHTML = '<option value="">— Chưa chọn —</option>' +
      DS_DON_VI.filter(x => x.hoat_dong).map(d => `<option value="${d.id}">${esc(d.ten)}</option>`).join('');
  } else {
    document.querySelectorAll('#kvSeg .seg-nut[data-kv="danhmuc"]').forEach(b => b.remove());
  }
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
    ['ton', 'nhap', 'xuat', 'baocao', 'donhoan', 'lichsu', 'danhmuc'].forEach(k => {
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

    // Card mobile (≤780px) — CÙNG dữ liệu ds, chỉ khác cách render (pilot
    // Mobile Card 21/08/2026). Bấm cả card mở đúng modal chi tiết như bấm
    // tên sản phẩm trên bảng desktop (moChiTiet bên dưới).
    const oCard = $('#kv-ton-card');
    oCard.innerHTML = '';
    ds.forEach(s => {
      const tt = NHAN_TT[s.trang_thai] || NHAN_TT.binh_thuong;
      const card = el('div', 'kv-card',
        `<div class="kv-card-dau">
           <div>
             <div class="kv-card-ten">${esc(s.ten)}</div>
             <div class="kv-card-sku">${esc(s.ma_sku)}${s.danh_muc ? ' · ' + esc(s.danh_muc) : ''}</div>
           </div>
           <span class="tag ${tt.mau}">${esc(tt.chu)}</span>
         </div>
         <div class="kv-card-hang">
           <span class="kv-card-ton">${esc(tienVN(s.ton))}</span>
           <span class="kv-card-donvi">${esc(s.don_vi)}</span>
         </div>` +
        (s.theo_doi_hsd ? `<div class="kv-card-phu">HSD gần nhất: ${moTaHsd(s.han_gan_nhat, s.so_ngay_toi_han)}</div>` : '') +
        (xemGiaVon && s.gia_tri_ton != null ? `<div class="kv-card-phu">Giá trị tồn: ${esc(tienVN(s.gia_tri_ton))} đ</div>` : '')
      );
      card.dataset.sp = s.id;
      oCard.appendChild(card);
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
    khoaSanPhamOk = !!(kq.quyen && kq.quyen.khoa_san_pham);
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

  // Card mobile: bấm cả card (không cần đúng vào chữ) — target lớn hơn, dễ
  // bấm 1 tay hơn link nhỏ trên bảng desktop.
  $('#kv-ton-card').addEventListener('click', async e => {
    const card = e.target.closest('.kv-card');
    if (!card) return;
    await moChiTiet(card.dataset.sp);
  });

  const kvModal = $('#kvModalNen');
  function dongKvModal() { kvModal.hidden = true; $('#kvSuaForm').hidden = true; }
  $('#kvModalDong').addEventListener('click', dongKvModal);
  kvModal.addEventListener('click', e => { if (e.target === kvModal) dongKvModal(); });

  let spDangXem = null;

  async function moChiTiet(spId) {
    const sp = DS_SP.find(s => s.id === spId);
    if (!sp) return;
    spDangXem = sp;
    const daKhoaSp = sp.trang_thai === 'da_khoa';
    $('#kvModalTen').textContent = sp.ten;
    $('#kvModalMa').innerHTML = `Mã ${esc(sp.ma_sku)} · tồn ${esc(tienVN(sp.ton))} ${esc(sp.don_vi)}` +
      (daKhoaSp ? ' <span class="tag warn">🔒 Đã khoá</span>' : '');
    $('#kvModalLo').innerHTML = '';
    $('#kvModalLichSu').innerHTML = '';
    $('#kvSuaForm').hidden = true;

    // Danh sách Tồn kho chỉ trả mã ĐANG bán (dang_ban=1) nên trong hộp này
    // luôn là "Ẩn" một chiều — mã đã ẩn sẽ biến mất khỏi danh sách, chưa có
    // màn "xem cả mã đã ẩn" để hiện lại (việc nhỏ, để sau nếu cần).
    if (qKho.quan_ly) {
      $('#kvModalSua').hidden = false;
      $('#kvModalAnHien').hidden = false;
      const btnKhoa = $('#kvModalKhoa');
      if (daKhoaSp) {
        btnKhoa.hidden = !TOI.la_admin;
        btnKhoa.textContent = 'Mở lại';
      } else {
        // Khoá ("Hoàn tất") giờ chỉ Kinh doanh/Admin — Quản lý kho sửa
        // được nhưng không phải người khoá (xem docs/DATA_OWNERSHIP_MATRIX.md).
        btnKhoa.hidden = !khoaSanPhamOk;
        btnKhoa.textContent = 'Hoàn tất';
      }
    }
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

  /* ---- Sửa / Ẩn mã hàng (chỉ Quản lý kho/Admin) ---- */
  if (qKho.quan_ly) {
    $('#kvModalSua').addEventListener('click', () => {
      if (!spDangXem) return;
      const sp = spDangXem;
      if (sp.trang_thai === 'da_khoa' && !TOI.la_admin) {
        alert('Mã hàng này đã khoá — cần Admin sửa hoặc mở khoá lại.');
        return;
      }
      $('#kvSua-id').value = sp.id;
      $('#kvSua-ten').value = sp.ten;
      $('#kvSua-danhmuc').value = sp.danh_muc || '';
      $('#kvSua-tonmin').value = sp.ton_toi_thieu ?? '';
      $('#kvSua-theodoihsd').checked = !!sp.theo_doi_hsd;
      $('#kvSua-donvi').innerHTML = tuyChonDanhMuc(DS_DON_VI, sp.don_vi_id);
      $('#kvSua-donvi').value = sp.don_vi_id || '';
      $('#kvSua-loi').textContent = '';
      $('#kvSuaForm').hidden = false;
    });
    $('#kvSua-nuthuy').addEventListener('click', () => { $('#kvSuaForm').hidden = true; });

    $('#kvSuaForm').addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#kvSua-loi'); oLoi.textContent = '';
      const nut = $('#kvSua-nutluu');
      nut.disabled = true;
      try {
        await API.khoSuaSanPham({
          id: $('#kvSua-id').value,
          ten: $('#kvSua-ten').value,
          danh_muc: $('#kvSua-danhmuc').value,
          don_vi_id: $('#kvSua-donvi').value,
          ton_toi_thieu: $('#kvSua-tonmin').value,
          theo_doi_hsd: $('#kvSua-theodoihsd').checked
        });
        $('#kvSuaForm').hidden = true;
        await taiLai();
        await moChiTiet($('#kvSua-id').value);
      } catch (err) {
        oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.';
      } finally {
        nut.disabled = false;
      }
    });

    $('#kvModalAnHien').addEventListener('click', async () => {
      if (!spDangXem) return;
      if (!confirm(`Ẩn "${spDangXem.ten}" khỏi danh sách Tồn kho? Lô hàng/lịch sử cũ vẫn giữ nguyên, không mất dữ liệu — chỉ ẩn khỏi màn hình chọn hàng.`)) return;
      try {
        await API.khoAnHienSanPham(spDangXem.id, false);
        dongKvModal();
        await taiLai();
      } catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
    });

    $('#kvModalKhoa').addEventListener('click', async () => {
      if (!spDangXem) return;
      const dangKhoa = spDangXem.trang_thai === 'da_khoa';
      if (!dangKhoa && !confirm(`Hoàn tất "${spDangXem.ten}"? Sau đó chỉ Admin mới sửa hoặc mở lại.`)) return;
      try {
        await API.khoKhoaSanPham(spDangXem.id, dangKhoa ? 'nhap' : 'da_khoa');
        await taiLai();
        await moChiTiet(spDangXem.id);
      } catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
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
          don_vi_id: $('#kvDonVi').value,
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

/* Nén ảnh minh chứng khiếu nại — giữ nguyên tỉ lệ (khác nenAnhVuong dùng cho
   avatar, cắt vuông), giới hạn cạnh dài nhất 1280px, JPEG chất lượng 0.72:
   đủ rõ để làm bằng chứng, đủ nhẹ để nằm gọn trong giới hạn 2MB/giá trị D1. */
function nenAnh(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1280;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const ti = w > h ? MAX / w : MAX / h;
        w = Math.round(w * ti); h = Math.round(h * ti);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này')); };
    img.src = url;
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
     "Chưa nhận được" (đẩy ngay). Riêng "Cần khiếu nại" mở hộp nhập lý do +
     ảnh/video (thay vì prompt() chỉ nhập được chữ) — xử lý ở hộp đó luôn. */
  $('#dh-bang').addEventListener('click', async (e) => {
    const btnNhan = e.target.closest('[data-nhan]');
    const btnKn = e.target.closest('[data-khieunai]');
    const btnPl = e.target.closest('[data-phanloai]');
    const btnCn = e.target.closest('[data-chuanhan]');
    if (!btnNhan && !btnKn && !btnPl && !btnCn) return;

    if (btnKn) {
      // Đang chọn sẵn "Hư hỏng" ở ô tình trạng thì gợi ý luôn lý do, khỏi gõ lại.
      const sel = btnKn.closest('td').querySelector('.sel-tinhtrang');
      const goiY = sel && sel.value === 'hu_hong' ? 'Hàng hư hỏng khi kho nhận' : '';
      moKhieuNaiModal(btnKn.getAttribute('data-khieunai'), goiY);
      return;
    }

    const btn = btnNhan || btnPl || btnCn;
    const rsn = btn.getAttribute('data-rsn') || btn.getAttribute('data-nhan') || btn.getAttribute('data-chuanhan');
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
      else await API.hoanChuaNhan(rsn);
      await veDanhSach();               // tải lại
    } catch (err) {
      btn.disabled = false;
      btn.textContent = cu;
      alert(err.message || 'Không lưu được, thử lại nhé.');
    }
  });

  /* ---- Hộp nhập khiếu nại: lý do + ảnh (nén ở trình duyệt) + video ---- */
  const knModal = $('#knModalNen');
  let anhDangChon = [];      // [{ base64 }]
  let videoDangChon = null;
  let returnSnDangMo = null;

  function veAnhLuoi() {
    $('#knAnhLuoi').innerHTML = anhDangChon.map((a, i) =>
      `<div class="kn-thumb"><img src="${a.base64}" alt="Ảnh minh chứng">` +
      `<div class="kn-xoa" data-xoaanh="${i}">×</div></div>`
    ).join('');
  }

  function moKhieuNaiModal(returnSn, goiYLyDo) {
    returnSnDangMo = returnSn;
    $('#knForm').reset();
    anhDangChon = []; videoDangChon = null;
    veAnhLuoi();
    $('#knVideoTen').textContent = '';
    $('#knLoi').textContent = '';
    if (goiYLyDo) $('#knLyDo').value = goiYLyDo;
    const r = DS_DH.find(x => x.return_sn === returnSn);
    const ngChu = r && r.nguon === 'tiktok' ? 'TikTok' : 'Shopee';
    const spTen = (r && (r.san_pham_ten || r.san_pham)) || '—';
    $('#knModalDon').innerHTML =
      `${esc(ngChu)} · Mã đơn hoàn <b>${esc(returnSn)}</b>` +
      (r && r.order_sn ? ` · Đơn gốc ${esc(r.order_sn)}` : '') +
      `<br>${esc(spTen)}`;
    knModal.hidden = false;
    $('#knLyDo').focus();
  }
  function dongKhieuNaiModal() { knModal.hidden = true; returnSnDangMo = null; }

  $('#knHuy').addEventListener('click', dongKhieuNaiModal);
  knModal.addEventListener('click', e => { if (e.target === knModal) dongKhieuNaiModal(); });

  $('#knAnh').addEventListener('change', async () => {
    const files = [...$('#knAnh').files].slice(0, Math.max(0, 6 - anhDangChon.length));
    for (const f of files) {
      try { anhDangChon.push({ base64: await nenAnh(f) }); }
      catch { alert(`Không đọc được ảnh "${f.name}", thử ảnh khác nhé.`); }
    }
    veAnhLuoi();
    $('#knAnh').value = '';
  });

  $('#knAnhLuoi').addEventListener('click', e => {
    const btn = e.target.closest('[data-xoaanh]');
    if (!btn) return;
    anhDangChon.splice(Number(btn.getAttribute('data-xoaanh')), 1);
    veAnhLuoi();
  });

  $('#knVideo').addEventListener('change', () => {
    const f = $('#knVideo').files[0];
    videoDangChon = f || null;
    $('#knVideoTen').textContent = f ? `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)` : '';
  });

  $('#knForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!returnSnDangMo) return;
    const lyDo = $('#knLyDo').value.trim();
    if (lyDo.length < 5) { $('#knLoi').textContent = 'Vui lòng mô tả rõ vấn đề.'; return; }

    const btn = $('#knNutGui');
    btn.disabled = true;
    const cu = btn.textContent;
    $('#knLoi').textContent = '';
    try {
      btn.textContent = 'Đang gửi…';
      await API.hoanKhieuNai(returnSnDangMo, lyDo, anhDangChon.map(a => a.base64));
      if (videoDangChon) {
        btn.textContent = 'Đang tải video…';
        await API.hoanKhieuNaiVideo(returnSnDangMo, videoDangChon);
      }
      dongKhieuNaiModal();
      await veDanhSach();
    } catch (err) {
      $('#knLoi').textContent = err.message || 'Không gửi được, thử lại nhé.';
    } finally {
      btn.disabled = false;
      btn.textContent = cu;
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
          (tt.quyen.quan_ly ? `Bấm “Kết nối ${cfg.ten}” để ủy quyền một lần.` : 'Nhờ Admin bấm kết nối.');
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

/* -- Kế toán -- */
if (TOI.quyen.includes('ketoan')) {
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
  $('#kt-ts-trasoathangloat').addEventListener('click', async () => {
    const ds = dsDangChon();
    if (!ds.length) return;
    if (!confirm(`Xác nhận đã tra soát ${ds.length} đơn đã chọn?`)) return;
    const nut = $('#kt-ts-trasoathangloat');
    nut.disabled = true; const cu = nut.textContent; nut.textContent = 'Đang lưu…';
    try {
      await API.ktDaTraSoat(ds);
      await veTraSoat();
    } catch (err) {
      alert(err.message || 'Không lưu được, thử lại nhé.');
    } finally {
      nut.disabled = false; nut.textContent = cu;
    }
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
  // Chỉ còn quản lý TÀI KHOẢN đăng nhập ở đây — Thêm/Sửa/Hoàn tất/Mở lại
  // HỒ SƠ nhân sự đã chuyển sang tab Nhân sự (xem docs/DATA_OWNERSHIP_MATRIX.md).
  // Bảng qtBang được taiLaiNhanSuQuanTri() (gọi từ khối 'nhansu' phía trên)
  // vẽ sẵn — ở đây chỉ cần gắn sự kiện.
  $('#qt-tim')?.addEventListener('input', veBangQtTaiKhoan);
  $('#qt-locvaitro')?.addEventListener('change', veBangQtTaiKhoan);
  $('#qt-xoaloc')?.addEventListener('click', xoaLocQT);

  $('#qtBang').addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.tao) {
      moHopTaoTaiKhoan(btn.dataset.tao, btn.dataset.tenGoiY, btn.dataset.ten);
    } else if (btn.dataset.datlai) {
      if (!confirm('Đặt lại mật khẩu cho tài khoản này? Mật khẩu cũ sẽ hết hiệu lực ngay.')) return;
      btn.disabled = true;
      try {
        const kq = await API.qtDatLaiMatKhau(parseInt(btn.dataset.datlai, 10));
        hienMatKhauTam('Đã đặt lại mật khẩu', kq.ten_dang_nhap, kq.mat_khau_tam);
        await taiLaiNhanSuQuanTri();
      } catch (err) { alert(err.message); btn.disabled = false; }
    } else if (btn.dataset.khoa) {
      const kh = btn.dataset.kh === '1';
      btn.disabled = true;
      try {
        await API.qtKhoaTaiKhoan(parseInt(btn.dataset.khoa, 10), kh);
        await taiLaiNhanSuQuanTri();
      } catch (err) { alert(err.message); btn.disabled = false; }
    } else if (btn.dataset.xoatk) {
      if (!confirm(`Xoá HẲN tài khoản đăng nhập của "${btn.dataset.xoatkTen}"? Không thể hoàn tác — nếu chỉ muốn tạm ngừng đăng nhập, dùng nút "Khoá" thay vì Xoá.`)) return;
      btn.disabled = true;
      try {
        await API.qtXoaTaiKhoan(parseInt(btn.dataset.xoatk, 10));
        await taiLaiNhanSuQuanTri();
      } catch (err) { alert(err.message); btn.disabled = false; }
    } else if (btn.dataset.doivaitro) {
      moHopDoiVaiTro(btn.dataset.doivaitro, btn.dataset.doivaitroTen, btn.dataset.doivaitroHientai);
    }
  });

  /* Đổ <select> vai trò thành 2 nhóm — "Vai trò hệ thống" tách khỏi "Vị trí
     công việc" (Sếp chốt 23/08/2026: 2 thứ khác nhau, không gộp 1 danh
     sách phẳng). nhom đến từ src/quyen.js nhomVaiTro(), không suy đoán ở
     frontend. */
  function veTuyChonVaiTro(select, hienTai) {
    const heThong = DS_VAI_TRO_QT.filter(v => v.nhom === 'he_thong');
    const viTri = DS_VAI_TRO_QT.filter(v => v.nhom !== 'he_thong');
    const oNhom = (nhan, ds) => ds.length
      ? `<optgroup label="${esc(nhan)}">${ds.map(v => `<option value="${esc(v.ma)}">${esc(v.ten)}</option>`).join('')}</optgroup>`
      : '';
    select.innerHTML = oNhom('Vai trò hệ thống', heThong) + oNhom('Vị trí công việc', viTri);
    if (hienTai) select.value = hienTai;
  }

  // Hộp tạo tài khoản
  function moHopTaoTaiKhoan(nhanSuId, tenGoiY, hoTen) {
    $('#taoTkHoTen').textContent = hoTen || '';
    $('#taoTkTen').value = tenGoiY || '';
    veTuyChonVaiTro($('#taoTkVaiTro'));
    $('#taoTkLoi').textContent = '';
    $('#taoTkForm').dataset.nhanSuId = nhanSuId;
    $('#taoTkModalNen').hidden = false;
  }
  $('#taoTkHuy').addEventListener('click', () => { $('#taoTkModalNen').hidden = true; });
  $('#taoTkModalNen').addEventListener('click', e => { if (e.target.id === 'taoTkModalNen') $('#taoTkModalNen').hidden = true; });
  $('#taoTkForm').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#taoTkLoi'); oLoi.textContent = '';
    try {
      const kq = await API.qtTaoTaiKhoan($('#taoTkForm').dataset.nhanSuId, $('#taoTkTen').value.trim(), $('#taoTkVaiTro').value);
      $('#taoTkModalNen').hidden = true;
      hienMatKhauTam('Đã tạo tài khoản', kq.ten_dang_nhap, kq.mat_khau_tam);
      await taiLaiNhanSuQuanTri();
    } catch (err) { oLoi.textContent = err.message || 'Không tạo được, thử lại nhé.'; }
  });

  // Hộp đổi vai trò
  function moHopDoiVaiTro(taiKhoanId, hoTen, vaiTroHienTai) {
    $('#doiVaiTroHoTen').textContent = hoTen || '';
    $('#doiVaiTroHienTai').textContent = (DS_VAI_TRO_QT.find(v => v.ma === vaiTroHienTai) || {}).ten || vaiTroHienTai || '—';
    veTuyChonVaiTro($('#doiVaiTroMoi'), vaiTroHienTai);
    $('#doiVaiTroLoi').textContent = '';
    $('#doiVaiTroForm').dataset.taiKhoanId = taiKhoanId;
    $('#doiVaiTroModalNen').hidden = false;
  }
  $('#doiVaiTroHuy').addEventListener('click', () => { $('#doiVaiTroModalNen').hidden = true; });
  $('#doiVaiTroModalNen').addEventListener('click', e => { if (e.target.id === 'doiVaiTroModalNen') $('#doiVaiTroModalNen').hidden = true; });
  $('#doiVaiTroForm').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#doiVaiTroLoi'); oLoi.textContent = '';
    try {
      await API.qtSuaVaiTro(parseInt($('#doiVaiTroForm').dataset.taiKhoanId, 10), $('#doiVaiTroMoi').value);
      $('#doiVaiTroModalNen').hidden = true;
      await taiLaiNhanSuQuanTri();
    } catch (err) { oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.'; }
  });

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
}

/* ---- Mở tab đầu tiên người dùng được xem -------------------------------- */
moTab(TOI.quyen[0]);
