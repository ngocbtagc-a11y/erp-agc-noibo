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
import { tinhTrangThaiTB, veGiaoDienTB, hoanDuoc } from './tbd-trangthai.js';
import { nenChayVongLap, nenDongDau } from './nhip-tim-chat.js';
/* Nén ảnh dùng chung — CTL-0011 gộp 3 hàm về 1, CTL-0026 dời sang file riêng
   để module Kho tài liệu dùng lại được. KHÔNG có hàm nén thứ hai trong ERP. */
import { nenAnhChung, coByteCuaDataUrl } from './anh-chung.js';
import { moQuetTaiLieu } from './quet-tai-lieu.js';
import { soDoHienThi, chuHuyHieu, datSoDo, nenNhacCai, CHU_NHAC_CAI, KHOA_BO_QUA }
  from './so-do-bieu-tuong.js';

/* ---- GỌI MÓC NỐI GIỮA CÁC MÔ-ĐUN — thay cho `window.CAI_GI_DO?.()` -------
   BÀI HỌC 29/08/2026 (REV-0038 · L3). `window.moChatVoi?.()` đã biến một
   mô-đun chat CHẾT thành cú bấm KHÔNG LÀM GÌ CẢ: không lỗi, không chữ, không
   dấu vết — Sếp Ngọc bấm mãi vào một cái nút đã chết, còn `console` thì im
   vì `?.` đã nuốt nốt bằng chứng cuối cùng.
   Nhưng KHÔNG được thay bừa bằng `console.error`: các móc nối này nằm ở
   mô-đun chỉ nạp KHI CÓ QUYỀN (`TOI.quyen.includes('nhansu')` …). Người
   không có quyền mà cũng báo lỗi thì là BÁO OAN, và cổng khói sẽ đỏ oan.
   Nên: có quyền mà móc nối vắng mặt = mô-đun chết lúc khởi động → HÉT LÊN.
   Không có quyền = mô-đun cố ý không nạp → im lặng là đúng.
   `quyenCan` = null nghĩa là móc nối này luôn phải có mặt.               */
function goiMocNoi(ten, quyenCan, ...thamSo) {
  const f = window[ten];
  if (typeof f === 'function') return f(...thamSo);
  /* `TOI` là `let` khai ở giữa file. Đọc nó trước khi nó được gán thì chính
     dòng này ném TDZ — ĐÚNG lớp lỗi mà cả hàm này sinh ra để bắt. `TOI?.`
     KHÔNG cứu được TDZ, `typeof TOI` cũng ném. Nên bọc try/catch: không đọc
     được quyền thì coi như KHÔNG BIẾT, mà không biết thì cứ HÉT — thà báo
     thừa một dòng còn hơn im lặng thêm một lần nữa. */
  let coQuyen = true;
  try { coQuyen = Array.isArray(TOI?.quyen) ? TOI.quyen.includes(quyenCan) : true; }
  catch { coQuyen = true; }
  if (quyenCan && !coQuyen) return undefined;
  console.error(`Móc nối "window.${ten}" không tồn tại — mô-đun` +
                (quyenCan ? ` "${quyenCan}"` : '') + ' nhiều khả năng đã chết lúc khởi động. Tải lại trang.');
  return undefined;
}

/* LẤY móc nối thay vì GỌI nó — cho chỗ cần cùng một hàm nhiều lần trong một
   vòng lặp (vẽ nút cho từng dòng bảng). Dùng `goiMocNoi` ở đó thì mỗi dòng là
   một lần tra `window` + một lần `console.error` khi vắng: 300 dòng thành 300
   dòng lỗi giống hệt nhau, tức che mất mọi lỗi khác. Luật báo/không báo giữ
   NGUYÊN của `goiMocNoi` — có quyền mà vắng thì HÉT, không quyền thì im. */
function layMocNoi(ten, quyenCan) {
  const f = window[ten];
  if (typeof f === 'function') return f;
  let coQuyen = true;
  try { coQuyen = Array.isArray(TOI?.quyen) ? TOI.quyen.includes(quyenCan) : true; }
  catch { coQuyen = true; }
  if (quyenCan && !coQuyen) return null;
  console.error(`Móc nối "window.${ten}" không tồn tại — mô-đun` +
                (quyenCan ? ` "${quyenCan}"` : '') + ' nhiều khả năng đã chết lúc khởi động. Tải lại trang.');
  return null;
}

/* ---- Danh mục tab -------------------------------------------------------
   "nhom" = nhóm cha hiện trên sidebar, bám theo 4 phòng ban thật của công ty
   (xem docs/ERP_V2_INFORMATION_ARCHITECTURE.md). null = không có nhóm cha,
   hiện ngay đầu sidebar (dùng chung mọi vai trò). */
const TAB = [
  { id: 'tongquan',  ten: 'Trạm Mục Tiêu', nhom: null, icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { id: 'lichsuviec', ten: 'Lịch sử làm việc', nhom: null, icon: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z' },
  { id: 'danhba',    ten: 'Danh bạ',    nhom: null, icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8' },
  { id: 'gopy',      ten: 'Góp ý ERP',  nhom: null, icon: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
  { id: 'kinhdoanh', ten: 'Kinh doanh', nhom: 'Kinh doanh & MKT', icon: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
  { id: 'donhoan',   ten: 'Kết nối sàn', nhom: 'Kinh doanh & MKT', icon: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' },
  { id: 'khovan',    ten: 'Kho vận',    nhom: 'Kho vận & Sản xuất', icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' },
  { id: 'nhansu',    ten: 'Nhân sự',    nhom: 'Support', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'ketoan',    ten: 'Kế toán',    nhom: 'Support', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { id: 'taisan',    ten: 'Tài sản',    nhom: 'Support', icon: 'M20 7h-3V6a3 3 0 00-3-3h-4a3 3 0 00-3 3v1H4a1 1 0 00-1 1v11a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1zM9 6a1 1 0 011-1h4a1 1 0 011 1v1H9V6z' },
  { id: 'xepca',     ten: 'Xếp ca',     nhom: 'Support', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { id: 'khotailieu', ten: 'Kho tài liệu', nhom: 'Quản trị doanh nghiệp', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
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
/* HAI Ô (Sếp chốt 04/09/2026) — hai danh sách RIÊNG cho hai ô trên form, lấy
   thẳng từ máy chủ chứ không lọc lại ở đây (luật thuộc src/quyen.js).
   QT_CO_COT_VI_TRI = null khi chưa nạp danh sách; false nghĩa là CSDL chưa
   chạy migration them-vi-tri-cong-viec.sql, ô 2 phải ẩn đi. */
let DS_VAI_TRO_HE_THONG = [], DS_VI_TRI_CONG_VIEC = [], QT_CO_COT_VI_TRI = null;
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

  const { nhan_su, vai_tro, vai_tro_he_thong, vi_tri_cong_viec, co_cot_vi_tri } = await API.qtDanhSach();
  DS_NHAN_SU_QT = nhan_su;
  DS_VAI_TRO_QT = vai_tro;
  // Máy chủ cũ (chưa deploy bản hai ô) không trả hai danh sách này — rơi về
  // mảng rỗng thay vì nổ, màn hình vẫn vẽ được như trước.
  DS_VAI_TRO_HE_THONG = vai_tro_he_thong || [];
  DS_VI_TRI_CONG_VIEC = vi_tri_cong_viec || [];
  QT_CO_COT_VI_TRI = co_cot_vi_tri === undefined ? null : !!co_cot_vi_tri;

  const oLuongTh = $('#ns-thLuong'); if (oLuongTh) oLuongTh.hidden = true;
  napBoLocBoPhanNS(nhan_su);
  veBangNsQuanTri();
  // Dải "việc cần làm" nạp SONG SONG, không `await`: hỏng đường này thì bảng
  // nhân sự vẫn phải hiện đủ (SPEC-0007 Đợt 2). Nó tự vẽ lại khi có dữ liệu.
  taiViecCanLam();

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

  // Hộp Hồ sơ nhân sự (nếu đang mở) đọc riêng DS_NHAN_SU_QT/DS_VAI_TRO_QT ở
  // trên — vừa nạp lại xong thì vẽ lại luôn khối Tài khoản, khỏi phải đóng
  // mở lại hộp mới thấy đúng (Employee Profile Phase 1, UI State Consistency
  // — Rule 7 trong ERP-CONSTITUTION.md).
  goiMocNoi('LAM_MOI_HOSO_NHANSU', 'nhansu');
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
  const hopDong = $('#ns-lochopdong')?.value || '';
  return ds.filter(n => {
    if (boPhan && (n.bo_phan || '').trim() !== boPhan) return false;
    if (trangThai && n.trang_thai !== trangThai) return false;
    if (loaiLd && n.loai_lao_dong !== loaiLd) return false;
    // 'thieu' = chưa có bản hợp đồng nào còn hiệu lực trong ERP
    if (hopDong === 'thieu' && n.hd_loai) return false;
    if (hopDong && hopDong !== 'thieu' && n.hd_loai !== hopDong) return false;
    if (k && !boDau(`${n.ma_nv || ''} ${n.ho_ten} ${n.sdt || ''} ${n.email || ''}`).includes(k)) return false;
    return true;
  });
}

function xoaLocNS() {
  if ($('#ns-tim')) $('#ns-tim').value = '';
  if ($('#ns-locbophan')) $('#ns-locbophan').value = '';
  if ($('#ns-loctrangthai')) $('#ns-loctrangthai').value = '';
  if ($('#ns-locloaild')) $('#ns-locloaild').value = '';
  if ($('#ns-lochopdong')) $('#ns-lochopdong').value = '';
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
  if (nutLoc) nutLoc.hidden = !($('#ns-tim')?.value || $('#ns-locbophan')?.value
    || $('#ns-loctrangthai')?.value || $('#ns-locloaild')?.value || $('#ns-lochopdong')?.value);
}

/* Dải Exception-First: còn bao nhiêu người ĐANG LÀM chưa có hợp đồng trong
   ERP. Chỉ đếm `dang_lam = 1` — người đã nghỉ không còn là việc phải làm.
   Đủ 100% thì dải tự biến mất, không để lại một dòng chúc mừng thừa. */
function veDaiThieuHopDong() {
  const o = $('#ns-thieuhd'); if (!o) return;
  const dangLam = DS_NHAN_SU_QT.filter(n => n.dang_lam);
  const thieu = dangLam.filter(n => !n.hd_loai);
  o.hidden = thieu.length === 0 || dangLam.length === 0;
  if (o.hidden) return;
  o.innerHTML =
    `<span>📋 <b>${thieu.length}/${dangLam.length}</b> người đang làm chưa có thông tin hợp đồng trong ERP. ` +
    `Ô “Hợp đồng” của họ để trống là vì chưa nhập, không phải hệ thống lỗi.</span>` +
    `<button type="button" class="btn-nho" id="ns-thieuhd-loc">Xem ${thieu.length} người này</button>`;
  $('#ns-thieuhd-loc').addEventListener('click', () => {
    const oLoc = $('#ns-lochopdong');
    if (oLoc) { oLoc.value = 'thieu'; veBangNsQuanTri(); }
  });
}

/* ---- Dải "việc cần làm" (SPEC-0007 Đợt 2) --------------------------------
   Ba nhóm còn lại của Exception-First: hợp đồng QUÁ HẠN · SẮP hết hạn <45
   ngày · sinh nhật THÁNG SAU. Dữ liệu về từ `/api/nhan-su/viec-can-lam` —
   một cửa riêng có kiểm quyền `them_nhan_su`, KHÔNG nhét `ngay_sinh` và hạn
   hợp đồng vào danh sách nhân sự chung (tab `nhansu` còn mở cho quản lý kho,
   mà hai thứ đó là mức 2 theo ADR-0011 A2).

   Nạp MỘT lần rồi vẽ lại từ bộ nhớ: đổi bộ lọc là vẽ lại bảng, mà gọi API
   theo mỗi lần đổi bộ lọc thì gõ 1 chữ vào ô tìm là bắn cả chục lượt. */
let VIEC_CAN_LAM = null;

async function taiViecCanLam() {
  if (!TOI.them_nhan_su) return;         // không đủ quyền thì không hỏi, khỏi ăn 403
  try { VIEC_CAN_LAM = await API.nsViecCanLam(); } catch { VIEC_CAN_LAM = null; }
  veDaiViecCanLam();
}

function veDaiViecCanLam() {
  const o = $('#ns-vieccanlam'); if (!o) return;
  const v = VIEC_CAN_LAM;
  if (!v) { o.hidden = true; o.innerHTML = ''; return; }

  const ten = (ds, n = 4) => ds.slice(0, n).map(x => x.ho_ten).join(', ')
    + (ds.length > n ? ` và ${ds.length - n} người nữa` : '');
  const dong = [];

  if (v.qua_han?.length) {
    dong.push(`<div class="vcl-dong vcl-do"><span>🚨 <b>${v.qua_han.length}</b> hợp đồng ĐÃ QUÁ HẠN — ` +
      `quá <b>30 ngày</b> không ký lại thì luật tự coi là không xác định thời hạn, và không đảo ngược được ` +
      `(BLLĐ 2019 Đ.20).<span class="vcl-ten"> ${esc(ten(v.qua_han))}</span></span></div>`);
  }
  if (v.sap_het?.length) {
    dong.push(`<div class="vcl-dong"><span>⏳ <b>${v.sap_het.length}</b> hợp đồng hết hạn trong <b>45 ngày</b> tới.` +
      `<span class="vcl-ten"> ${esc(ten(v.sap_het))}</span></span></div>`);
  }
  if (v.sinh_nhat_thang_sau?.length) {
    // Chỉ ngày/tháng, KHÔNG hiện năm sinh — dải này để bao quát lịch, không
    // phải để công khai tuổi của ai.
    const ds = v.sinh_nhat_thang_sau.map(x => `${String(x.ngay_sinh).slice(8, 10)}/${String(x.ngay_sinh).slice(5, 7)} ${x.ho_ten}`);
    dong.push(`<div class="vcl-dong vcl-nhe"><span>🎂 Tháng <b>${esc(v.thang_sau || '')}</b> có ` +
      `<b>${ds.length}</b> sinh nhật.<span class="vcl-ten"> ${esc(ds.slice(0, 5).join(' · '))}` +
      `${ds.length > 5 ? ' · …' : ''}</span></span></div>`);
  }

  /* Kỹ năng CHỈ MỘT NGƯỜI biết (Đợt 4) — điểm chết. Việc có rủi ro an toàn
     (`an_toan`) xếp trước và tô đỏ: một người duy nhất biết lái xe nâng khác
     hẳn một người duy nhất biết dùng Excel. */
  if (v.diem_chet?.length) {
    const nguyHiem = v.diem_chet.filter(k => k.an_toan);
    const ten = v.diem_chet.slice(0, 4).map(k => `${k.ten} (${k.nguoi_duy_nhat})`).join(' · ');
    dong.push(`<div class="vcl-dong${nguyHiem.length ? ' vcl-do' : ''}"><span>` +
      `${nguyHiem.length ? '🚨' : '⚠️'} <b>${v.diem_chet.length}</b> kỹ năng chỉ <b>một người</b> làm được` +
      `${nguyHiem.length ? `, trong đó <b>${nguyHiem.length}</b> là việc có rủi ro an toàn/tiền` : ''}. ` +
      `Người đó nghỉ một hôm là phần việc ấy đứng lại.` +
      `<span class="vcl-ten"> ${esc(ten)}${v.diem_chet.length > 4 ? ' …' : ''}</span></span></div>`);
  }

  o.hidden = dong.length === 0;
  o.innerHTML = dong.join('');
}

/* ==========================================================================
   BỘ NĂNG LỰC — SPEC-0007 Đợt 4
   ---------------------------------------------------------------------------
   Bảng này chỉ đáng tồn tại nếu trả lời được HAI câu hỏi thật:
     ① Xếp ca kho    — ai lái được xe nâng, ai vận hành được máy?
     ② Nghỉ đột xuất — ai thay được người này?
   Cộng cảnh báo ngược: kỹ năng CHỈ MỘT NGƯỜI biết = điểm chết của kho.

   Danh mục CỐ ĐỊNH, chỉ chọn — KHÔNG có một ô gõ tự do nào trong cả module
   này. Cho gõ tự do là sẽ có "Excel" / "excel" / "MS Excel" và tra cứu hỏng.
   ========================================================================== */

const KN_MUC_CHU = { biet: 'Biết', lam_duoc: 'Làm được', thanh_thao: 'Thành thạo', day_duoc: 'Dạy được người khác' };
const KN_MUC_MAU = { biet: 'mute', lam_duoc: '', thanh_thao: 'ok', day_duoc: 'ok' };
const KN_NHOM_CHU = { kho: 'Kho vận', van_hanh: 'Vận hành sàn', ke_toan: 'Kế toán', hcns: 'Hành chính nhân sự', chung: 'Chung' };

let KN_DANH_MUC = null;   // nạp một lần cho cả phiên — danh mục là dữ liệu nền

async function knNapDanhMuc() {
  if (KN_DANH_MUC) return KN_DANH_MUC;
  try { KN_DANH_MUC = (await API.knDanhMuc()).ky_nang || []; } catch { KN_DANH_MUC = []; }
  return KN_DANH_MUC;
}

/* Đổ danh mục vào một <select>, gom theo nhóm bằng <optgroup> — 27 kỹ năng
   phẳng trong một danh sách thì người chấm phải cuộn tìm; gom nhóm thì mở ra
   là thấy ngay phần của mình. */
function knDoVaoSelect(sel, ds, giuGiaTri) {
  const cu = giuGiaTri ? sel.value : '';
  const theoNhom = new Map();
  for (const k of ds) {
    if (!theoNhom.has(k.nhom)) theoNhom.set(k.nhom, []);
    theoNhom.get(k.nhom).push(k);
  }
  sel.innerHTML = '<option value="">— Chọn kỹ năng —</option>' +
    [...theoNhom].map(([nhom, ks]) =>
      `<optgroup label="${esc(KN_NHOM_CHU[nhom] || nhom)}">` +
      ks.map(k => `<option value="${k.id}">${esc(k.ten)}${k.an_toan ? ' ⚠' : ''}</option>`).join('') +
      '</optgroup>').join('');
  if (cu) sel.value = cu;
}

/* Khối "năng lực của một người": bảng + form chấm. Dùng ở HAI chỗ (hộp Hồ sơ
   nhân sự cho HCNS, và màn Chấm năng lực cho quản lý trực tiếp) nên nhận
   selector qua tham số thay vì viết hai bản — hai bản là hai lần phải sửa,
   và lần thứ hai sẽ có người quên. */
async function veKhoiNangLuc(o) {
  const ds0 = await knNapDanhMuc();
  const loc = o.nhom ? ds0.filter(k => k.nhom === o.nhom) : ds0;
  const oChon = $(o.chon);
  if (oChon) knDoVaoSelect(oChon, loc, true);

  let ky_nang = [];
  try { ({ ky_nang } = await API.knCuaNguoi(o.nhanSuId)); } catch { ky_nang = []; }
  if (o.conDungKhong && !o.conDungKhong()) return;   // đã đổi sang người khác

  let quyen = { duoc: false };
  try { quyen = await API.knQuyenCham(o.nhanSuId); } catch { /* coi như không được */ }
  if (o.conDungKhong && !o.conDungKhong()) return;

  veBang(o.bang, ky_nang, k =>
    `<td>${esc(k.ten)}${k.an_toan ? ' <span class="kn-antoan" title="Việc có rủi ro an toàn hoặc tiền">⚠</span>' : ''}` +
      `${k.ghi_chu ? `<div class="sm">${esc(k.ghi_chu)}</div>` : ''}</td>` +
    `<td class="sm"><span class="tag ${KN_MUC_MAU[k.muc] || ''}">${esc(KN_MUC_CHU[k.muc] || k.muc)}</span></td>` +
    `<td class="sm">${esc(k.nguoi_cham_ten || '—')}<div class="sm">${esc((k.luc || '').slice(0, 10))}</div></td>` +
    `<td class="sm">${quyen.duoc
      ? `<button type="button" class="btn-nho btn-phu" data-kn-go="${k.ky_nang_id}">Gỡ</button>` : ''}</td>`
  );
  $(o.trong).hidden = ky_nang.length > 0;
  if (o.dem) $(o.dem).textContent = ky_nang.length ? `· ${ky_nang.length} kỹ năng` : '· chưa chấm';
  $(o.form).hidden = !quyen.duoc;

  if (o.nhac) {
    const on = $(o.nhac);
    on.className = 'jd-nhac-vitri';
    on.innerHTML = quyen.duoc
      ? 'Bạn xác nhận với tư cách <b>' + esc({
          quan_ly_truc_tiep: 'quản lý trực tiếp', truong_phong: 'trưởng phòng',
          quan_ly_ho_so: 'người quản lý hồ sơ'
        }[quyen.vi_tri] || 'người có quyền') + '</b>. Chấm sai nghĩa là xếp nhầm người vào việc có rủi ro.'
      : 'Chỉ <b>quản lý trực tiếp</b>, trưởng phòng hoặc HCNS mới xác nhận được năng lực. ' +
        'Không ai tự khai năng lực của mình — tự khai thì không ai kiểm được.';
  }
  return quyen;
}

/* Tiêu chuẩn "thế nào là làm được" của kỹ năng đang chọn. Hiện ngay dưới ô
   chọn: hai quản lý chấm cùng một người mà ra hai kết quả thì cả bảng vô
   dụng, và cách rẻ nhất để họ chấm giống nhau là cho họ đọc cùng một câu. */
function knHienTieuChuan(idChon, idDich) {
  const oChon = $(idChon), oDich = $(idDich);
  if (!oChon || !oDich) return;
  const k = (KN_DANH_MUC || []).find(x => String(x.id) === oChon.value);
  oDich.hidden = !k || !k.mo_ta;
  if (k && k.mo_ta) {
    oDich.innerHTML = `<b>Thế nào là làm được:</b> ${esc(k.mo_ta)}` +
      (k.an_toan ? ' <span class="kn-antoan">⚠ việc có rủi ro an toàn hoặc tiền — chấm kỹ.</span>' : '');
  }
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
      `<td>${veOHopDong(n)}</td>` +
      `<td class="sm">${esc(n.ngay_vao || '')}</td>` +
      `<td>${thaoTac}</td>`;
  });
  veTrongNS(DS_NHAN_SU_QT, ds);
  veDaiThieuHopDong();
  veDaiViecCanLam();
}

function locTaiKhoanQT(ds) {
  const k = boDau(($('#qt-tim')?.value || '').trim());
  const vaiTro = $('#qt-locvaitro')?.value || '';
  return ds.filter(n => {
    // Lọc theo CẢ HAI ô (04/09/2026): chọn "Quản lý kho" ở bộ lọc mà chỉ so
    // ô 1 thì sau migration ra 0 kết quả, vì vị trí đã dọn sang ô 2.
    if (vaiTro && n.vai_tro !== vaiTro && n.vi_tri_cong_viec !== vaiTro) return false;
    if (k && !boDau(`${n.ma_nv || ''} ${n.ho_ten} ${n.ten_dang_nhap || ''}`).includes(k)) return false;
    return true;
  });
}

function xoaLocQT() {
  if ($('#qt-tim')) $('#qt-tim').value = '';
  if ($('#qt-locvaitro')) $('#qt-locvaitro').value = '';
  veBangQtTaiKhoan();
}

/* Badge trạng thái Tài khoản + nút thao tác — DÙNG CHUNG giữa bảng "Quản
   trị → Tài khoản" và khối "Tài khoản ERP" trong Hồ sơ nhân sự (Employee
   Profile Phase 1, 25/08/2026) — Rule 5, không viết lại 2 lần. `n` là 1
   dòng trong DS_NHAN_SU_QT (đã có sẵn tai_khoan_id/ten_dang_nhap/vai_tro/
   kich_hoat/phai_doi_mk qua qtDanhSach, không cần gọi thêm API). */
/* Tên hai ô gộp lại: "Admin backup · Kế toán trưởng" (Sếp chốt 04/09/2026).
   Một chỗ duy nhất — bảng Quản trị và khối Tài khoản trong hồ sơ nhân sự
   dùng chung, khỏi ghép mỗi nơi một kiểu. Đối chiếu tên hiển thị qua
   DS_VAI_TRO_QT (do máy chủ trả), KHÔNG viết cứng tên tiếng Việt ở đây. */
function tenHaiO(n, bang) {
  const ds = bang || DS_VAI_TRO_QT;
  const ten = (ma) => ma ? ((ds.find(v => v.ma === ma) || {}).ten || ma) : '';
  return [ten(n.vai_tro), ten(n.vi_tri_cong_viec)].filter(Boolean).join(' · ');
}

function veCotTaiKhoan(n) {
  if (!n.tai_khoan_id) return '<span class="tag mute">Chưa có</span>';
  if (!n.kich_hoat) return `<span class="tag danger">Đã khoá</span> <span class="sm">${esc(n.ten_dang_nhap)}</span>`;
  return `<span class="nm">${esc(n.ten_dang_nhap)}</span>` + (n.phai_doi_mk ? ' <span class="tag warn">chờ đổi MK</span>' : '') +
    // Ai đang cầm quyền duyệt góp ý — nhìn một cái là biết, không phải đoán.
    (n.duyet_gopy ? ' <span class="tag ok" title="Được duyệt góp ý ERP ở cấp cuối">duyệt góp ý</span>' : '');
}
function veThaoTacTaiKhoan(n) {
  if (!n.tai_khoan_id) {
    return TOI.duoc_tao_tai_khoan
      ? `<button class="btn-nho btn-primary" data-tao="${esc(n.id)}" data-ten-goi-y="${esc(String(n.sdt || '').replace(/\D/g, ''))}" data-ten="${esc(n.ho_ten)}">Tạo tài khoản</button>`
      : '<span class="sm">—</span>';
  }
  /* Công tắc "Duyệt góp ý ERP" — CHỈ người ĐANG GIỮ quyền mới thấy, vì chỉ
     họ bấm được (máy chủ kiểm ở qtQuyenDuyetGopY, admin gọi thẳng vẫn 403).
     Đây là đường để Sếp đổi ý hoặc tạm uỷ quyền lúc đi vắng mà không phải
     nhờ ai sửa code: bật/tắt ngay trên điện thoại. */
  const nutDuyetGopY = TOI.duyet_gopy
    ? `<button class="btn-nho btn-phu" data-quyenduyetgopy="${n.tai_khoan_id}" data-qdg-bat="${n.duyet_gopy ? 0 : 1}" data-qdg-ten="${esc(n.ho_ten)}">${n.duyet_gopy ? 'Thu quyền duyệt góp ý' : 'Cho duyệt góp ý'}</button> `
    : '';
  /* Nút "Đổi vai trò" nay mở cho CẢ người chỉ được đặt VỊ TRÍ (HCNS) — họ
     thấy đúng ô 2, không thấy ô 1 (xem moHopDoiVaiTro). Trước 04/09/2026
     nút này chỉ Admin thấy, nên đặt vị trí cho nhân viên mới phải chờ Sếp. */
  const nutDoiVaiTro = (TOI.la_admin || TOI.duoc_dat_vi_tri)
    ? `<button class="btn-nho btn-phu" data-doivaitro="${n.tai_khoan_id}" data-doivaitro-ten="${esc(n.ho_ten)}" data-doivaitro-hientai="${esc(n.vai_tro || '')}" data-doivaitro-vitri="${esc(n.vi_tri_cong_viec || '')}">Đổi vai trò</button> `
    : '';
  if (!TOI.la_admin) return (nutDuyetGopY + nutDoiVaiTro) || '<span class="sm">—</span>';
  return nutDuyetGopY + nutDoiVaiTro +
    `<button class="btn-nho btn-phu" data-datlai="${n.tai_khoan_id}">Đặt lại MK</button> ` +
    (n.kich_hoat
      ? `<button class="btn-nho btn-phu" data-khoa="${n.tai_khoan_id}" data-kh="0">Khoá</button>`
      : `<button class="btn-nho btn-phu" data-khoa="${n.tai_khoan_id}" data-kh="1">Mở lại</button>`) +
    ` <button class="btn-nho btn-phu" data-xoatk="${n.tai_khoan_id}" data-xoatk-ten="${esc(n.ho_ten)}">Xoá</button>`;
}

function veBangQtTaiKhoan() {
  const nhan_su = DS_NHAN_SU_QT, vai_tro = DS_VAI_TRO_QT;
  const ds = locTaiKhoanQT(nhan_su);
  $('#qtDem').textContent = `${ds.length}/${nhan_su.length} nhân sự · ${nhan_su.filter(n => n.tai_khoan_id).length} có tài khoản`;

  veBang('#qtBang', ds, n => {
    const coTK = !!n.tai_khoan_id;
    const tt = TRANG_THAI[n.trang_thai] || { chu: n.trang_thai, mau: 'mute' };
    // HAI Ô — hiện cả hai, ngăn bằng "·". Hiện mỗi ô 1 thì sau migration cả
    // bảng toàn chữ "Người dùng" và không ai biết ai làm nghề gì.
    const tenVaiTro = coTK ? tenHaiO(n, vai_tro) : '';
    const cotTK = veCotTaiKhoan(n);
    const thaoTac = veThaoTacTaiKhoan(n);
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

/* ==========================================================================
   HỢP ĐỒNG LAO ĐỘNG — SPEC-0007 Đợt 1
   ---------------------------------------------------------------------------
   HAI trục khác nhau, đừng lẫn:
   · HÌNH THỨC LÀM VIỆC (`loai_lao_dong`) — toàn/bán thời gian/thời vụ/khoán.
   · LOẠI HỢP ĐỒNG (`hop_dong_lao_dong.loai`) — thử việc/xác định thời hạn/
     không xác định thời hạn/khoán việc.
   "Bán thời gian" và "Khoán việc" KHÔNG thay thế nhau: bán thời gian là hợp
   đồng lao động có đóng BHXH, khoán việc là hợp đồng dân sự không đóng.
   ========================================================================== */
const LOAI_LD_CHU  = { toan_thoi_gian: 'Toàn thời gian', ban_thoi_gian: 'Part-time', thoi_vu: 'Thời vụ', khoan_viec: 'Khoán việc' };
const LOAI_LD_NGAN = { toan_thoi_gian: 'Toàn TG', ban_thoi_gian: 'Part-time', thoi_vu: 'Thời vụ', khoan_viec: 'Khoán' };
const LOAI_HD_CHU  = {
  thu_viec: 'Thử việc', xac_dinh_th: 'Xác định thời hạn',
  khong_xac_dinh_th: 'Không xác định thời hạn', khoan_viec: 'Khoán việc'
};

/* Lời nhắc khi chọn "Khoán" — NHẮC để chọn đúng, không phải doạ. Bốn điều
   kiện lấy thẳng từ BLLĐ 2019 Đ.13 k.1 và Luật BHXH 2024 (41/2024/QH15, hiệu
   lực 01/07/2025): thoả thuận mang TÊN GỌI KHÁC mà vẫn có trả công + quản lý,
   điều hành, giám sát thì vẫn là quan hệ lao động, vẫn BHXH bắt buộc. */
const NHAC_KHOAN_HTML =
  '<b>Chọn “Khoán việc” là chọn một loại hợp đồng khác hẳn.</b> Khoán việc là hợp đồng ' +
  '<b>dân sự</b>, không đóng BHXH. Chỉ đúng khi cả bốn điều dưới đây đều đúng:' +
  '<ul>' +
    '<li>Trả theo <b>kết quả bàn giao</b>, không trả theo tháng.</li>' +
    '<li><b>Không xếp ca, không chấm công</b> người này.</li>' +
    '<li>Họ tự quyết làm lúc nào, ở đâu.</li>' +
    '<li>Công việc có <b>điểm kết thúc rõ ràng</b>.</li>' +
  '</ul>' +
  'Thiếu một trong bốn thì đây <b>vẫn là hợp đồng lao động</b>, dù tờ giấy đề tên gì — ' +
  'và phải đóng BHXH. Đặt hình thức này thì người đó <b>không đăng ký ca được nữa</b>, ' +
  'đúng như hợp đồng khoán yêu cầu.';

/* Ngày YYYY-MM-DD → dd/mm/yyyy. Trả '' nếu trống, để nơi gọi tự quyết hiện gì.
   Tên KHÁC `ngayVN()` đã có sẵn ở dưới vì đầu vào khác hẳn: cái kia nhận unix
   (giây) của Shopee/Đối soát, cái này nhận chuỗi ngày của D1. */
function ngayIsoVN(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return '';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/* Số ngày từ hôm nay tới mốc (âm = đã quá hạn). Chỉ để tô màu nhắc mắt,
   KHÔNG phải cơ chế nhắc — nhắc hạn hợp đồng nối vào SPEC-0004, làm đợt sau. */
function conBaoNhieuNgay(s) {
  if (!s) return null;
  const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
  const moc = new Date(s + 'T00:00:00');
  if (isNaN(moc)) return null;
  return Math.round((moc - homNay) / 86400000);
}

/* Ô "Hợp đồng" trong bảng Danh sách nhân sự. Trống thì hiện "Chưa có thông
   tin" bằng chữ nghiêng mờ — nhìn ra ngay là CHƯA NHẬP, không phải vỡ giao
   diện (Exception-First: 24 người hiện có đều rơi vào ô này). */
function veOHopDong(n) {
  if (!n.hd_loai) return '<span class="hd-o"><span class="hd-trong">Chưa có thông tin</span></span>';
  const ten = LOAI_HD_CHU[n.hd_loai] || n.hd_loai;
  const lan = n.hd_loai === 'xac_dinh_th' && n.hd_lan_thu > 1 ? ` <span class="sm">· lần ${n.hd_lan_thu}</span>` : '';
  if (!n.hd_het_han) {
    return `<span class="hd-o">${esc(ten)}${lan}<span class="hd-han">Không có ngày hết hạn</span></span>`;
  }
  const con = conBaoNhieuNgay(n.hd_het_han);
  let cls = '', them = '';
  if (con !== null && con < 0) { cls = ' qua-han'; them = ` · quá hạn ${-con} ngày`; }
  else if (con !== null && con <= 45) { cls = ' sap-het'; them = ` · còn ${con} ngày`; }
  return `<span class="hd-o">${esc(ten)}${lan}` +
    `<span class="hd-han${cls}">Hết hạn ${ngayIsoVN(n.hd_het_han)}${them}</span></span>`;
}

/* Trạng thái HIỆN DIỆN (Presence) tự đặt — khác TRANG_THAI ở trên (trạng
   thái HỢP ĐỒNG). Đây là GIAO TIẾP nội bộ, không phải chấm công/lịch nghỉ:
   AVAILABLE không có nghĩa "đã check-in", không dùng để tính lương/KPI.
   Mỗi người tự đổi ở Sidebar (popover), hiện cho người khác thấy ở Danh bạ
   (Sếp Ngọc yêu cầu 25/08/2026). off_today/on_leave để dành cho SYSTEM
   status khi có Lịch làm/Nghỉ phép chính thức sau này — Phase 1 chưa có
   nguồn dữ liệu đó nên chỉ 6 trạng thái MANUAL này. */
const TRANG_THAI_HD = {
  available: { chu: 'Đang làm việc',  mau: 'ok' },
  busy:      { chu: 'Đang bận',       mau: 'warn' },
  meeting:   { chu: 'Đang họp',       mau: 'warn' },
  away:      { chu: 'Tạm vắng',       mau: 'mute' },
  dnd:       { chu: 'Không làm phiền', mau: 'danger' },
  remote:    { chu: 'Làm việc từ xa', mau: 'sage' }
};
/* Smart default (spec §13) — mở dropdown Thời hạn sẵn giá trị hợp lý theo
   trạng thái vừa chọn, người dùng vẫn đổi được. Trạng thái không liệt kê
   ở đây mặc định "Cuối ngày" (an toàn, không lo quên đổi qua hôm sau). */
const THOI_HAN_MAC_DINH_HD = { meeting: '1h', away: '30p', dnd: '1h' };

/* Góp ý & Cải tiến ERP — 12 mốc trạng thái đúng theo spec Sếp Ngọc
   25/08/2026 (NEW→...→DONE/BLOCKED), đổi tên tiếng Việt cho người dùng,
   giữ mã tiếng Việt ở backend/DB (đồng bộ quy ước cong_viec/tai_san).
   uuTien=true → xuất hiện trong khối "Cần xử lý" (Exception First) của
   Admin — khớp đúng set GOPY_MOC_THONG_BAO ở backend + NEW/UAT thêm vào. */
const GOPY_TRANG_THAI = {
  moi:                  { chu: 'Chờ duyệt',            mau: 'mute',   uuTien: true  },
  bi_tu_choi:           { chu: 'Chưa được duyệt',      mau: 'danger', uuTien: true  },
  da_huy:               { chu: 'Đã huỷ',               mau: 'mute',   uuTien: false },
  cho_phan_tich:        { chu: 'Đã duyệt — chờ phân tích', mau: 'sage', uuTien: false },
  dang_phan_tich:       { chu: 'Đang phân tích',        mau: 'warn',   uuTien: false },
  cho_quyet_dinh:       { chu: 'Chờ quyết định',        mau: 'danger', uuTien: true  },
  da_duyet:             { chu: 'Đã duyệt làm',          mau: 'sage',   uuTien: false },
  dang_lam:             { chu: 'Đang làm',              mau: 'warn',   uuTien: false },
  dang_kiem_tra:        { chu: 'Đang kiểm tra',         mau: 'sage',   uuTien: false },
  can_chinh_sua:        { chu: 'Cần chỉnh sửa',         mau: 'danger', uuTien: true  },
  cho_nghiem_thu:       { chu: 'Chờ nghiệm thu',        mau: 'warn',   uuTien: true  },
  nghiem_thu_chua_dat:  { chu: 'Nghiệm thu chưa đạt',   mau: 'danger', uuTien: false },
  san_sang_phat_hanh:   { chu: 'Sẵn sàng phát hành',    mau: 'ok',     uuTien: false },
  hoan_thanh:           { chu: 'Hoàn thành',            mau: 'ok',     uuTien: false },
  bi_chan:              { chu: 'Đang bị chặn',          mau: 'danger', uuTien: true  }
};

/* ---- ĐƯỜNG TIẾN ĐỘ cho NGƯỜI GỬI ---------------------------------------
   15 mốc trên là ngôn ngữ của thợ. Người gửi chỉ cần biết ĐƯỜNG CÒN BAO XA,
   nên gộp thành 6 chặng. Đây KHÔNG phải bảng nhãn thứ hai: bảng này chỉ
   XẾP NHÓM các mã đã khai ở GOPY_TRANG_THAI, không đặt lại tên cho mã nào.

   Cách gộp (nêu trong Handoff):
     1 Bạn gửi      — luôn xong, vì góp ý đã tồn tại thì đã gửi rồi
     2 Đang xem xét — đang ở cổng duyệt: moi, cho_quyet_dinh
     3 Đã duyệt     — qua cổng, đang định hình việc: cho_phan_tich,
                      dang_phan_tich, da_duyet
     4 Đang làm     — dang_lam, can_chinh_sua (sửa vẫn là đang làm)
     5 Kiểm tra     — dang_kiem_tra, cho_nghiem_thu, nghiem_thu_chua_dat,
                      san_sang_phat_hanh
     6 Xong         — hoan_thanh
   Ba mã KHÔNG nằm trên đường đi (chặng dừng), phải hiện rõ chứ không giấu:
   bi_tu_choi, bi_chan, da_huy. */
const GOPY_CHANG = [
  { ten: 'Bạn gửi',      ma: [] },
  { ten: 'Đang xem xét', ma: ['moi', 'cho_quyet_dinh'] },
  { ten: 'Đã duyệt',     ma: ['cho_phan_tich', 'dang_phan_tich', 'da_duyet'] },
  { ten: 'Đang làm',     ma: ['dang_lam', 'can_chinh_sua'] },
  { ten: 'Kiểm tra',     ma: ['dang_kiem_tra', 'cho_nghiem_thu', 'nghiem_thu_chua_dat', 'san_sang_phat_hanh'] },
  { ten: 'Xong',         ma: ['hoan_thanh'] }
];
/* Chặng DỪNG — không đi tiếp được nếu người gửi không làm gì. `chang` = đứng
   ở chỗ nào trên đường thì dừng lại (để vẽ đúng đoạn đã đi). */
const GOPY_CHANG_DUNG = {
  bi_tu_choi: { chang: 1, ten: 'Chưa duyệt' },
  bi_chan:    { chang: 3, ten: 'Đang vướng' },
  da_huy:     { chang: 1, ten: 'Đã huỷ' }
};

/* CHỐT CHỐNG LỆCH: thêm một trạng thái vào GOPY_TRANG_THAI mà quên xếp chặng
   thì báo ngay ở console lúc tải trang, không đợi người gửi nhìn thấy một
   đường tiến độ trống. Rule 5 — hai bảng chỉ được phép lệch khi có người
   biết là nó đang lệch. */
(function kiemChangPhuKin() {
  const daXep = new Set([...GOPY_CHANG.flatMap(c => c.ma), ...Object.keys(GOPY_CHANG_DUNG)]);
  const sot = Object.keys(GOPY_TRANG_THAI).filter(m => !daXep.has(m));
  const thua = [...daXep].filter(m => !GOPY_TRANG_THAI[m]);
  if (sot.length)  console.warn('[gop-y] trạng thái chưa xếp chặng nào:', sot);
  if (thua.length) console.warn('[gop-y] chặng trỏ tới trạng thái không tồn tại:', thua);
})();

const GOPY_LOAI = {
  loi: 'Lỗi (Bug)', cai_tien_trai_nghiem: 'Cải tiến trải nghiệm', cai_tien_quy_trinh: 'Cải tiến quy trình',
  tinh_nang_moi: 'Tính năng mới', du_lieu_sai: 'Dữ liệu sai', loi_phan_quyen: 'Lỗi phân quyền', loi_ket_noi: 'Lỗi kết nối'
};
const GOPY_TAN_SUAT = { lan_dau: 'Lần đầu gặp', thinh_thoang: 'Thỉnh thoảng', thuong_xuyen: 'Thường xuyên', lien_tuc: 'Gần như lúc nào cũng vậy' };

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

/* Hiển thị text dài (mô tả/đầu ra/ghi chú...) — xuống dòng đúng, không ép
   1 dòng. Text ngắn: bọc .dai (wrap, không giới hạn dòng). Text dài (theo
   độ dài ký tự hoặc số dòng): kẹp 2 dòng .dai-gon + nút "Xem thêm/Thu gọn"
   để bung/thu — không đo DOM, chỉ dựa heuristic độ dài (Rule 28). */
function dg(text) {
  if (!text) return '';
  const s = String(text);
  const daiQua = s.length > 120 || (s.match(/\n/g) || []).length >= 2;
  if (!daiQua) return `<div class="dai">${esc(s)}</div>`;
  return `<div class="dai-gon">${esc(s)}</div><button type="button" class="dai-gon-btn" onclick="window.toggleDaiGon(this)">Xem thêm</button>`;
}
window.toggleDaiGon = function (btn) {
  const wrap = btn.previousElementSibling;
  if (!wrap) return;
  const moRa = wrap.classList.toggle('dai-gon-mo');
  btn.textContent = moRa ? 'Thu gọn' : 'Xem thêm';
};

/* ==========================================================================
   Ô GÕ NHIỀU DÒNG — `.o-nhieu-dong`
   ---------------------------------------------------------------------------
   VÌ SAO CÓ. Sếp Ngọc 29/08/2026: "tin nhắn dài quá thì xuống dòng, đừng để
   phải kéo ngang". Một `<input type="text">` KHÔNG BAO GIỜ xuống dòng được —
   không phải chuyện CSS, đó là bản chất của thẻ. Đo ở 375px: gõ 133 ký tự
   tiếng Việt vào thanh chat ra scrollWidth 1034px trên ô rộng 232px; muốn
   đọc lại câu mình vừa gõ phải kéo ngang TRONG ô.

   Cả ERP có 111 ô một dòng cùng bệnh (vòng 1 khai 12 — sai vì phép đếm, xem
   REV-0047/L1 và BH-58). 31 ô CHỮ DÀI mang lớp này; 80 ô CHỮ NGẮN chữa bằng
   `maxlength` < 100 chứ không đổi thẻ. Đây là thuốc chung, gắn MỘT LẦN bằng
   uỷ quyền trên `document` nên ô nào thêm sau này cũng được che, kể cả ô do
   JS dựng ra — không phải nhớ gọi hàm khởi tạo cho từng chỗ.

   ENTER VẪN GỬI / VẪN LƯU NHƯ TRƯỚC. Trước bản này chúng đều là `<input>`
   trong `<form>`, nên Enter = submit theo mặc định của trình duyệt. Đổi sang
   `<textarea>` là mất mặc định đó — 20 người sẽ gõ Enter và không có gì xảy
   ra. Dòng `keydown` dưới đây trả lại đúng thói quen cũ; Shift+Enter mới là
   xuống dòng thủ công. Đo được: 29/31 ô nằm trong `<form>` và cả 29 đều gửi
   bằng Enter, 0/31 gửi nhầm khi Shift+Enter hay khi bộ gõ tiếng Việt đang
   dựng dấu (arm G của bàn đo). Hai ô còn lại (`thdGhiChu`,
   `gyCtGhiChuDuyet`) nằm NGOÀI `<form>` — bản `<input>` cũ cũng vậy, Enter ở
   đó chưa từng làm gì, không phải hồi quy.
   ========================================================================== */
function caoTheoChu(o) {
  if (!o || o.offsetParent === null) return;     /* ô đang ẩn thì scrollHeight vô nghĩa — đo lúc nó hiện ra */
  o.style.height = 'auto';                       /* phải hạ trước, không thì ô chỉ cao lên chứ không thấp xuống được */
  const tran = parseFloat(getComputedStyle(o).maxHeight) || Infinity;
  o.style.height = Math.min(o.scrollHeight, tran) + 'px';
  o.classList.toggle('dang-cao', o.value.includes('\n') || o.scrollHeight > 48);
}
window.caoTheoChu = caoTheoChu;

function noiDayONhieuDong() {
  document.addEventListener('input', e => {
    if (e.target.classList?.contains('o-nhieu-dong')) caoTheoChu(e.target);
  });
  document.addEventListener('keydown', e => {
    const o = e.target;
    if (!o.classList?.contains('o-nhieu-dong')) return;
    /* `isComposing`: đang dựng dấu tiếng Việt thì Enter là của bộ gõ, không
       phải của mình — cướp phím lúc đó là nuốt mất chữ người ta đang gõ. */
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const form = o.closest('form');
    if (!form) return;                           /* ngoài form thì Enter cứ xuống dòng như textarea thường */
    e.preventDefault();
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.querySelector('[type="submit"]')?.click();
  });
  /* Gán `.value` bằng JS (mở lại form sửa, xoá ô sau khi gửi) KHÔNG bắn sự
     kiện `input`. Thiếu vòng quét này thì form sửa mở ra đã có 3 dòng chữ mà
     ô vẫn cao 1 dòng, hoặc gửi xong ô rỗng rồi mà vẫn cao lù lù.
     CHỈ nghe `childList` + thuộc tính `hidden`: `caoTheoChu` tự sửa `style`
     và `class` của chính ô đó, nghe hai thứ ấy là quan sát viên tự gọi lại
     chính mình vòng vô tận. */
  const quet = () => document.querySelectorAll('.o-nhieu-dong').forEach(caoTheoChu);
  new MutationObserver(quet).observe(document.body,
    { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  quet();
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
// taoMoi (tuỳ chọn) — ERP-WIDE QUICK CREATE POLICY (docs/audit/AUDIT-QUICK-CREATE-POLICY.md):
// CHỈ bật cho entity đã đánh giá QUICK_CREATE_ALLOWED (rủi ro thấp, field
// bắt buộc duy nhất = tên đang gõ để tìm — không mở form riêng). Không tự
// ý bật cho combo khác khi chưa phân loại — mặc định KHÔNG có quick create.
// { xuLyTao: async (ten) => ({id}), capNhatDs: async () => void — nạp lại
//   ĐÚNG mảng mà layTuyChon() đọc, chạy XONG trước khi tự chọn record mới }
function ganCombo({ hienThi, panel, tim, goiY, giaTri }, layTuyChon, coRong, rongChu, taoMoi) {
  const combo = hienThi.closest('.combo1');
  function capNhatHienThi() {
    const hienTai = layTuyChon().find(t => String(t.gia_tri) === giaTri.value);
    hienThi.querySelector('span').textContent = hienTai ? hienTai.nhan : (rongChu || 'Chọn...');
    hienThi.classList.toggle('rong', !hienTai);
  }
  function ve() {
    const timTho = (tim.value || '').trim();
    const k = boDau(timTho);
    const dsGoc = layTuyChon();
    const loc = k ? dsGoc.filter(t => boDau(t.nhan).includes(k)) : dsGoc;
    const rongHtml = coRong
      ? `<div class="ql-goiy-item${giaTri.value ? '' : ' active'}" data-gt="">${esc(coRong)}</div>` : '';
    // Hỗ trợ nhóm (VD "Vai trò hệ thống" / "Vị trí công việc") — chỉ hiện
    // tiêu đề nhóm khi có ≥1 item thuộc nhóm đó CÒN LẠI sau khi lọc.
    let nhomVuaVe = null;
    const dsHtml = loc.map(t => {
      const dau = (t.nhom !== undefined && t.nhom !== nhomVuaVe)
        ? `<div class="ql-goiy-nhom">${esc(t.nhom)}</div>` : '';
      nhomVuaVe = t.nhom;
      return dau + `<div class="ql-goiy-item${String(t.gia_tri) === giaTri.value ? ' active' : ''}" data-gt="${esc(t.gia_tri)}">${esc(t.nhan)}</div>`;
    }).join('');
    // "+ Tạo ..." chỉ hiện khi: có bật taoMoi, đang gõ có chữ, và KHÔNG
    // trùng khít 1 lựa chọn đã có (Duplicate Protection — tránh tạo trùng
    // khi user chỉ gõ chưa đúng dấu/hoa-thường của cái đã tồn tại).
    const daTrungKhit = loc.some(t => boDau(t.nhan) === k);
    const taoMoiHtml = (taoMoi && timTho && !daTrungKhit)
      ? `<div class="ql-goiy-item ql-goiy-taomoi" data-tao-moi="1">+ Tạo "${esc(timTho)}"</div>` : '';
    goiY.innerHTML = rongHtml + (loc.length ? dsHtml : (rongHtml || taoMoiHtml ? '' : '<div class="ql-goiy-trong">Không tìm thấy</div>')) + taoMoiHtml;
  }
  // Panel định vị theo TOẠ ĐỘ MÀN HÌNH (position:fixed, tính lại mỗi lần mở)
  // thay vì position:absolute theo .combo1 — bug thật 23/08/2026 (Sếp Ngọc
  // báo dropdown "cụt" khi combobox nằm trong .modal): .modal có
  // overflow-y:auto để tự cuộn, absolute bên trong nó bị khung modal CẮT
  // thay vì nổi lên trên, dù z-index đã cao. Đây là bug Core ở component
  // dùng chung — sửa 1 chỗ cho mọi combobox trong ERP, không vá riêng từng
  // modal. Đóng khi cuộn trang (dropdown menu chuẩn vẫn làm vậy) để khỏi
  // lệch khỏi ô khi vị trí trigger đổi.
  function dongKhiCuon() { dong(); }
  function mo() {
    combo.classList.add('mo');
    panel.hidden = false;
    const r = hienThi.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = (r.bottom + 4) + 'px';
    panel.style.left = r.left + 'px';
    panel.style.width = r.width + 'px';
    tim.value = '';
    ve();
    tim.focus();
    window.addEventListener('scroll', dongKhiCuon, true);
    window.addEventListener('resize', dongKhiCuon);
  }
  function dong() {
    combo.classList.remove('mo');
    panel.hidden = true;
    panel.style.position = ''; panel.style.top = ''; panel.style.left = ''; panel.style.width = '';
    window.removeEventListener('scroll', dongKhiCuon, true);
    window.removeEventListener('resize', dongKhiCuon);
  }
  // Listener click-ra-ngoài dùng CHUNG (cuối file) cần gọi ĐÚNG dong() này
  // để gỡ listener scroll/resize vừa gắn ở trên — không thì mỗi lần mở rồi
  // bấm ra ngoài (không chọn gì) lại để sót 1 listener scroll trên window,
  // dồn mãi không gỡ. Gắn qua property trên chính node .combo1 vì dong() là
  // closure riêng của lần ganCombo() này, generic listener không gọi trực
  // tiếp được.
  combo._ganComboDong = dong;
  function chon(gt) {
    giaTri.value = gt;
    // Bắn 'change' như <select> thật — chỗ nào đã có addEventListener('change',
    // ...) trên giaTri (VD kvXuatSP hiện tồn kho khi chọn SP) vẫn chạy đúng,
    // không phải sửa lại logic cũ.
    giaTri.dispatchEvent(new Event('change', { bubbles: true }));
    capNhatHienThi();
    dong();
    hienThi.focus();
  }
  // Search → Not Found → + Create → Validate (Search Before Create ở
  // backend themDanhMuc/... đã có sẵn, cùng logic confirm() đã dùng ở
  // Dữ liệu nền — themCoCanhBaoTrung) → Create → Auto-select → Continue.
  // Không đóng modal cha, không reload, không mất field khác trong form.
  async function taoMoiVaChon(dong2) {
    if (!taoMoi) return;
    const ten = (tim.value || '').trim();
    if (!ten) return;
    dong2.classList.add('ql-goiy-dangtao');
    dong2.textContent = 'Đang tạo…';
    try {
      let kq = await taoMoi.xuLyTao(ten, false);
      if (kq && kq.canh_bao) {
        const dongY = confirm(`Đã có mục gần giống: "${kq.giong.join('", "')}".\nVẫn tạo "${ten}" là mục MỚI riêng?`);
        if (!dongY) {
          dong2.classList.remove('ql-goiy-dangtao');
          dong2.textContent = `+ Tạo "${ten}"`;
          tim.focus();
          return;
        }
        kq = await taoMoi.xuLyTao(ten, true);
      }
      await taoMoi.capNhatDs();
      chon(String(kq.id));
    } catch (err) {
      alert(err.message || 'Không tạo được, thử lại nhé.');
      dong2.classList.remove('ql-goiy-dangtao');
      dong2.textContent = `+ Tạo "${ten}"`;
    }
  }
  // Gán qua .onclick/.oninput/.onkeydown (không addEventListener) — gọi
  // hàm này nhiều lần (mỗi lần mở modal/nạp lại data) vẫn an toàn, không
  // chồng nhiều listener chạy trùng. Đóng khi click ra ngoài xử lý chung ở
  // 1 listener document duy nhất (xem cuối file), không gắn lại mỗi lần.
  hienThi.onclick = () => (panel.hidden ? mo() : dong());
  tim.oninput = ve;
  goiY.onclick = e => {
    const nutTao = e.target.closest('[data-tao-moi]');
    if (nutTao) { taoMoiVaChon(nutTao); return; }
    const it = e.target.closest('[data-gt]');
    if (it) chon(it.dataset.gt);
  };
  tim.onkeydown = e => {
    if (e.key === 'Escape') { dong(); hienThi.focus(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const dau = goiY.querySelector('.ql-goiy-item:not(.ql-goiy-taomoi)') || goiY.querySelector('.ql-goiy-item');
      if (dau && dau.dataset.taoMoi) taoMoiVaChon(dau);
      else if (dau) chon(dau.dataset.gt);
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
    // Gọi đúng dong() riêng của combo này (nếu có — luôn có, gán trong
    // ganCombo()) để gỡ đúng listener scroll/resize đã gắn lúc mở, không
    // chỉ tắt hiển thị suông.
    if (c._ganComboDong) c._ganComboDong();
    else { c.classList.remove('mo'); const p = c.querySelector('.combo1-panel'); if (p) p.hidden = true; }
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

/* ==========================================================================
   ẢNH DÙNG CHUNG — nén + dán (Ctrl+V) + kéo–thả  ·  CTL-0011
   --------------------------------------------------------------------------
   Trước đợt này repo có BA hàm nén ảnh gần trùng nhau (`nenAnhVuong` cho ảnh
   đại diện nhân sự, `nenAnhVuaKhung` cho Góp ý, `nenAnh` cho minh chứng khiếu
   nại) và toàn bộ logic dán/kéo–thả bị khoá trong closure của `khoiDongGopY()`
   nên Chat nội bộ không dùng lại được (REV-0002 mục 6).

   Hiến pháp Rule 5 (Reuse → Extend → Create): gộp về MỘT hàm nén có tham số
   và MỘT bộ tiện ích vùng nhận ảnh dùng chung. Sếp Ngọc duyệt `CORE_CHANGE`
   ngày 27/08/2026 ("làm luôn đi, sau cái gì mà sau").
   ========================================================================== */

/* `coByteCuaDataUrl` và `nenAnhChung` nay nằm ở `assets/js/anh-chung.js`
   (import ở đầu file). CTL-0026 cần đúng hàm nén này cho module Kho tài
   liệu, mà module riêng không import ngược vào `app.js` được — nên DỜI CHỖ,
   nội dung giữ nguyên từng chữ. Vẫn là MỘT hàm nén cho cả ERP (Rule 5). */

/* Lấy file ảnh đầu tiên trong một DataTransfer (clipboard hoặc kéo–thả).
   Windows/macOS chụp màn hình đều để ảnh ở dạng file trong `items`. */
function timAnhTrongDuLieu(dl) {
  if (!dl) return null;
  for (const it of dl.items || []) {
    if (it.kind === 'file' && /^image\//.test(it.type || '')) {
      const f = it.getAsFile();
      if (f) return f;
    }
  }
  for (const f of dl.files || []) {
    if (/^image\//.test(f.type || '')) return f;
  }
  return null;
}

/* Đổi data URL đã nén thành File thật — Chat nội bộ gửi tệp nhị phân qua
   multipart/form-data, không gửi chuỗi base64 như Góp ý. */
function dataUrlThanhTep(dataUrl, ten) {
  const s = String(dataUrl || '');
  const b64 = s.slice(s.indexOf(',') + 1);
  const loai = (s.match(/^data:([^;,]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new File([u8], ten, { type: loai });
}

/* Gắn KÉO–THẢ + CHỌN TỆP cho một vùng bất kỳ (Góp ý, Chat nội bộ, sau này
   thêm chỗ nào cũng gọi hàm này, không chép lại).

   Mọi tệp — kể cả tệp KHÔNG phải ảnh — đều được chuyển thẳng cho `khiCoTep`;
   bên gọi tự quyết định (Góp ý chỉ nhận ảnh và báo lỗi, Chat nhận cả
   Excel/PDF như trước).

   - `vungTha`   : vùng bắt kéo–thả (thường là cả thân form/popup, vì người
                   dùng hay thả trượt ra ngoài ô nhỏ vài chục pixel).
   - `vungSang`  : vùng được gắn class `dang-keo` (mặc định = `vungTha`).
   - `oChonFile` : <input type="file"> — tự nối vào cùng luồng và tự reset.
   - `nutChon`   : nút bấm mở hộp thoại chọn tệp.
   - `vungBamCamUng` : chỉ trên THIẾT BỊ CẢM ỨNG mới coi cả vùng này là nút
                   mở hộp thoại. Trên máy tính, bấm vào dòng chữ "Ctrl+V"
                   KHÔNG mở hộp thoại duyệt tệp — đúng thứ Sếp Ngọc muốn
                   tránh ("Ctrl+C, Ctrl+V là được luôn chứ không cần tìm
                   file"). REV-0002 lỗi #8. */
function ganVungThaTep({ vungTha, vungSang, oChonFile, nutChon, vungBamCamUng, khiCoTep }) {
  if (!vungTha || typeof khiCoTep !== 'function') return;
  const oSang = vungSang || vungTha;

  /* Bộ ĐẾM dragenter/dragleave. Kéo qua một ô con (textarea, nút…) cũng bắn
     `dragleave` từ ô con đó — kiểm `e.target === vungTha` như bản cũ sẽ để
     viền xanh "sẵn sàng nhận thả" KẸT LẠI vĩnh viễn, người dùng phải F5.
     Đếm 1–1 mới biết chắc con trỏ đã ra hẳn ngoài vùng. REV-0002 lỗi #6. */
  let demKeo = 0;
  const coTep = (e) => Array.from((e.dataTransfer && e.dataTransfer.types) || []).includes('Files');
  const tatVien = () => { demKeo = 0; oSang.classList.remove('dang-keo'); };

  vungTha.addEventListener('dragenter', (e) => {
    if (!coTep(e)) return;
    e.preventDefault();
    demKeo++;
    oSang.classList.add('dang-keo');
  });
  vungTha.addEventListener('dragover', (e) => {
    if (!coTep(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    oSang.classList.add('dang-keo');
  });
  vungTha.addEventListener('dragleave', (e) => {
    if (!coTep(e)) return;
    demKeo = Math.max(0, demKeo - 1);
    if (demKeo === 0) oSang.classList.remove('dang-keo');
  });
  vungTha.addEventListener('drop', (e) => {
    if (!coTep(e)) return;
    e.preventDefault();
    tatVien();
    const f = Array.from(e.dataTransfer.files || [])[0];
    if (f) khiCoTep(f);
  });
  // Thả ra chỗ khác trong trang, hoặc huỷ giữa chừng → viền phải tắt.
  window.addEventListener('drop', tatVien);
  window.addEventListener('dragend', tatVien);

  if (oChonFile) {
    oChonFile.addEventListener('change', () => {
      const f = oChonFile.files && oChonFile.files[0];
      /* Reset NGAY sau khi đọc: không reset thì chọn LẠI đúng tệp vừa chọn
         sẽ không bắn `change` (giá trị không đổi) → im lặng hoàn toàn.
         REV-0002 lỗi #7. */
      oChonFile.value = '';
      if (f) khiCoTep(f);
    });
    if (nutChon) {
      nutChon.addEventListener('click', (e) => { e.preventDefault(); oChonFile.click(); });
    }
    if (vungBamCamUng) {
      vungBamCamUng.addEventListener('click', (e) => {
        // Ô file ẩn và nút Chọn tệp đều nằm TRONG vùng này; click tổng hợp
        // của chúng nổi bọt lên đây, không chặn thì mở 2 hộp thoại / lặp vô tận.
        if (e.target === oChonFile) return;
        if (nutChon && (e.target === nutChon || nutChon.contains(e.target))) return;
        if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
        oChonFile.click();
      });
    }
  }
}

/* --------------------------------------------------------------------------
   TRỌNG TÀI Ctrl+V — MỘT handler `paste` duy nhất cho cả ERP.
   --------------------------------------------------------------------------
   Trước đợt này, form Góp ý gắn listener riêng trên `document` và chỉ gác
   `#v-gopy` — mà Chat nội bộ là bong bóng nổi NGOÀI mọi màn hình, nên
   Ctrl+V trong ô chat bị form góp ý CƯỚP mất (REV-0002 lỗi #4). Vá riêng
   từng form không giải được: phải có một người trọng tài.

   Luật định tuyến, xét theo `document.activeElement` chứ KHÔNG xét nội dung
   clipboard (REV-0002 lỗi #1 — xét nội dung làm cú dán bị NUỐT IM LẶNG khi
   copy từ web/Word/Excel/ShareX, vì những nguồn đó đặt CẢ chữ lẫn ảnh):

   1. Clipboard không có ảnh  → không can thiệp, để trình duyệt lo.
   2. Con trỏ đang nằm TRONG một vùng đã đăng ký → ảnh về vùng đó.
   3. Con trỏ ở `<body>` (chưa bấm vào đâu) → vùng đang mở có ưu tiên cao nhất.
   4. Con trỏ ở một ô nhập liệu KHÁC (ô tìm kiếm, form khác) → không cướp.
   5. Vừa có chữ vừa có ảnh và con trỏ đang ở ô chữ → KHÔNG `preventDefault`:
      chữ vẫn dán vào ô như thường, ảnh vẫn được đính kèm. Cả hai đều xảy ra,
      không có đường thoát im lặng nào (Rule 7 — Users See Work).
   -------------------------------------------------------------------------- */
const VUNG_NHAN_ANH_DAN = [];

function dangKyNhanAnhDan({ vung, dangBat, nhan, uuTien = 0 }) {
  if (!vung || typeof nhan !== 'function') return;
  VUNG_NHAN_ANH_DAN.push({ vung, dangBat: dangBat || (() => true), nhan, uuTien });
  VUNG_NHAN_ANH_DAN.sort((a, b) => b.uuTien - a.uuTien);
}

function chonVungNhanAnhDan(el) {
  const dangMo = VUNG_NHAN_ANH_DAN.filter(v => { try { return !!v.dangBat(); } catch { return false; } });
  if (!dangMo.length) return null;
  if (el && el !== document.body) {
    const trong = dangMo.find(v => v.vung.contains(el));
    if (trong) return trong;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || '') || el.isContentEditable === true) return null;
  }
  return dangMo[0];
}

document.addEventListener('paste', (e) => {
  const anh = timAnhTrongDuLieu(e.clipboardData);
  if (!anh) return;
  const el = document.activeElement;
  const dich = chonVungNhanAnhDan(el);
  if (!dich) return;
  const oChu = !!el && (/^(INPUT|TEXTAREA)$/.test(el.tagName || '') || el.isContentEditable === true);
  const coChu = ((e.clipboardData && e.clipboardData.getData('text/plain')) || '').trim() !== '';
  if (!(oChu && coChu)) e.preventDefault();
  dich.nhan(anh);
});

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
    // Ảnh đại diện: cắt vuông giữa 200×200, chất lượng 0.85 — đúng như
    // `nenAnhVuong()` cũ, chỉ đổi sang hàm nén dùng chung (CTL-0011).
    const anh = await nenAnhChung(f, { cheDo: 'vuong', canhToiDa: 200, chatLuong: 0.85 });
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

/* Trạng thái hiện diện — pill (chấm + nhãn ngắn) dưới tên mình ở Sidebar.
   Bấm mở popover nhỏ NGAY TẠI ĐÓ (không modal to) để đổi trạng thái + ghi
   chú + thời hạn. Sidebar CHỈ hiện nhãn ngắn — ghi chú dài chỉ hiện qua
   tooltip title (spec §11 "không hiện tại sidebar"). Lưu xong cập nhật
   ngay pill + đồng bộ dòng của mình trong Danh bạ nếu đang mở, không F5
   (Rule 7 UI State Consistency). */
$('#thdMa').innerHTML = Object.entries(TRANG_THAI_HD)
  .map(([ma, tt]) => `<option value="${ma}">${esc(tt.chu)}</option>`).join('');

function veThdPill() {
  const tt = TRANG_THAI_HD[TOI.trang_thai_hd] || TRANG_THAI_HD.available;
  $('#thdNhan').textContent = tt.chu;
  $('#thdNut').className = 'thd-nut thd-' + tt.mau;
  $('#thdNut').title = TOI.trang_thai_ghi_chu
    ? `${tt.chu} · ${TOI.trang_thai_ghi_chu}` : tt.chu;
}
veThdPill();

/* Không còn `e.stopPropagation()` ở đây và ở panel: trước kia hai lệnh đó
   sinh ra CHỈ để chặn listener `document click` cũ, mà listener đó đã bỏ.
   Giữ lại thì chúng âm thầm nuốt mọi click bên trong popover, không cho tới
   listener cấp `document` nào khác — bẫy cho người sau (REV-0004 FIX-04).
   Việc bật/tắt giờ do `closest('#thdWrap')` ở listener pointerdown lo. */
$('#thdNut').addEventListener('click', () => {
  const panel = $('#thdPanel');
  if (!panel.hidden) { panel.hidden = true; return; }
  $('#thdMa').value = TOI.trang_thai_hd || 'available';
  $('#thdGhiChu').value = TOI.trang_thai_ghi_chu || '';
  $('#thdThoiHan').value = THOI_HAN_MAC_DINH_HD[TOI.trang_thai_hd] || 'cuoi_ngay';
  panel.hidden = false;
  $('#thdGhiChu').focus();
});
$('#thdMa').addEventListener('change', () => {
  $('#thdThoiHan').value = THOI_HAN_MAC_DINH_HD[$('#thdMa').value] || 'cuoi_ngay';
});
$('#thdLuu').addEventListener('click', async () => {
  const ma = $('#thdMa').value;
  const ghiChu = $('#thdGhiChu').value.trim().slice(0, 120);
  const thoiHan = $('#thdThoiHan').value;
  const nutLuu = $('#thdLuu');
  nutLuu.disabled = true;
  try {
    await API.nsTrangThaiHD(ma, ghiChu, thoiHan);
    TOI.trang_thai_hd = ma;
    TOI.trang_thai_ghi_chu = ghiChu || null;
    veThdPill();
    $('#thdPanel').hidden = true;
    goiMocNoi('LAM_MOI_TRANGTHAI_DANHBA', 'danhba', TOI.id, ma, ghiChu || null);
  } catch (err) {
    alert(err.message || 'Không đổi được trạng thái, thử lại nhé.');
  } finally {
    nutLuu.disabled = false;
  }
});
/* Công tắc riêng tư sinh nhật của CHÍNH MÌNH (SPEC-0007 Đợt 2).
   Không có nút Lưu riêng: tick là lưu ngay. Một ô tick mà bắt bấm thêm nút
   thứ hai thì nửa số người sẽ tick rồi đóng panel, tưởng đã tắt mà chưa tắt.
   Hỏng thì TRẢ Ô VỀ TRẠNG THÁI CŨ — để ô hiện sai trạng thái thật là tệ hơn
   là báo lỗi, vì người ta tin mắt mình chứ không tin máy chủ. */
{
  const oSn = $('#snCongKhai');
  if (oSn) {
    oSn.checked = TOI.cong_khai_sinh_nhat !== false;
    oSn.addEventListener('change', async () => {
      const muon = oSn.checked;
      oSn.disabled = true;
      try {
        await API.nsSinhNhatCongKhai(muon);
        TOI.cong_khai_sinh_nhat = muon;
      } catch (err) {
        oSn.checked = !muon;
        alert(err.message || 'Chưa đổi được, thử lại nhé.');
      } finally {
        oSn.disabled = false;
      }
    });
  }
}

/* Đóng khi bấm/chạm ra ngoài. Dùng `pointerdown` chứ không dùng `click`:
   pointerdown bắn đều cho chuột, cảm ứng và bút — kho dùng điện thoại là
   chính, mà `click` trên `document` có máy iOS cũ không bắn khi chạm vào
   vùng trống (CTL-0008 giả thuyết 2). Chặn bằng `closest('#thdWrap')` thay
   vì dựa vào stopPropagation nên không lo thứ tự sự kiện làm hỏng nút bật/tắt. */
document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('#thdWrap')) $('#thdPanel').hidden = true;
});
/* Esc đóng popover — bàn phím cũng thoát được, không phải rê chuột đi chỗ khác.
   CHỈ trả con trỏ về nút trạng thái khi con trỏ đang thật sự ở trong popover.
   Panel không khoá focus: mở panel rồi bấm Tab đi chỗ khác thì panel vẫn mở
   (Tab không sinh pointerdown). Nếu trả focus vô điều kiện thì đang gõ dở ô
   giữa màn hình mà bấm Esc sẽ bị giật con trỏ về Sidebar (REV-0004 FIX-02). */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#thdPanel').hidden) {
    const dangOTrong = $('#thdWrap').contains(document.activeElement);
    $('#thdPanel').hidden = true;
    if (dangOTrong) $('#thdNut').focus();
  }
});

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

/* ---- Cài đặt ERP thành app riêng (PWA) — thay vì bắt nhân viên tự tìm
   trong menu ⋮ của trình duyệt, hiện thẳng nút bấm ngay trong ERP khi
   trình duyệt báo cài được (Sếp Ngọc yêu cầu 25/08/2026: phiên bản desktop,
   Phase 1 — không cần app .exe riêng, PWA đã đủ). Nút tự ẩn nếu trình
   duyệt không hỗ trợ cài (Safari cũ, hoặc đã cài rồi) hoặc sau khi cài xong. */
let _suKienCaiDat = null;
const nutCaiDat = $('#nutCaiDat');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _suKienCaiDat = e;
  nutCaiDat.hidden = false;
  veDaiNhacCai();     // nút nhỏ trên thanh đầu dễ bị nhìn xuyên qua — xem dưới
});
nutCaiDat?.addEventListener('click', async () => {
  if (!_suKienCaiDat) return;
  nutCaiDat.hidden = true;
  _suKienCaiDat.prompt();
  await _suKienCaiDat.userChoice;
  _suKienCaiDat = null;
});
window.addEventListener('appinstalled', () => {
  nutCaiDat.hidden = true;
  const d = $('#daiCaiMay'); if (d) d.hidden = true;
});

/* ---- DẢI NHẮC CÀI ERP LÊN MÁY (29/08/2026) -------------------------------
   Nút "⬇ Cài đặt ERP" ở trên đã có từ 25/08 nhưng nó là một nút phụ lẫn giữa
   thanh đầu — không ai bấm vì không ai biết bấm vào được gì. Số đỏ trên biểu
   tượng thanh tác vụ CHỈ chạy khi ERP đã cài như ứng dụng, nên phải nói thẳng
   ra đúng cái người ta được lợi.
   KỶ LUẬT: một dải nhỏ · một lần · bấm "Bỏ qua" là THÔI HẲN · điện thoại KHÔNG
   hiện (ở đó đã có thông báo đẩy). Quyết định nằm ở `nenNhacCai()` — bàn thử
   `scripts/do-so-do-bieu-tuong.mjs` đo ĐÚNG hàm đó, không đo bản chép lại. */
function veDaiNhacCai() {
  const dai = $('#daiCaiMay');
  if (!dai) return;
  let daBoQua = false;
  try { daBoQua = localStorage.getItem(KHOA_BO_QUA) === '1'; }
  catch { daBoQua = false; }   // chế độ riêng tư chặn localStorage — coi như chưa bỏ qua
  const { hien } = nenNhacCai({
    coSuKienCai: !!_suKienCaiDat,
    daCaiRoi: window.matchMedia?.('(display-mode: standalone)')?.matches ||
              navigator.standalone === true,
    laDienThoai: window.matchMedia?.('(max-width: 820px)')?.matches ||
                 (navigator.maxTouchPoints || 0) > 0,
    daBoQua
  });
  dai.hidden = !hien;
  const chu = $('#daiCaiMayChu');
  if (chu && hien) chu.textContent = CHU_NHAC_CAI;
}
$('#daiCaiMayBat')?.addEventListener('click', async () => {
  const dai = $('#daiCaiMay'); if (dai) dai.hidden = true;
  if (!_suKienCaiDat) return;
  nutCaiDat.hidden = true;
  _suKienCaiDat.prompt();
  await _suKienCaiDat.userChoice;
  _suKienCaiDat = null;
});
$('#daiCaiMayBoQua')?.addEventListener('click', () => {
  const dai = $('#daiCaiMay'); if (dai) dai.hidden = true;
  // Bấm bỏ qua là KHÔNG HỎI LẠI — kể cả sau khi tải lại trang.
  try { localStorage.setItem(KHOA_BO_QUA, '1'); } catch { /* riêng tư: đành hỏi lại */ }
});
veDaiNhacCai();   // ca trình duyệt đã bắn beforeinstallprompt TRƯỚC khi app.js chạy

/* ==========================================================================
   CÁC KHỐI DỰNG SẴN
   ========================================================================== */

// s.onClick (tuỳ chọn) — Drill Down to Action (UX_ENGINEERING_STANDARD.md):
// counter/card quan trọng phải bấm được tới đúng dữ liệu gốc, không phải
// ngõ cụt (audit Home/Dashboard 23/08/2026, docs/audit/AUDIT-HOME-DASHBOARD.md).
function veThe(dich, ds) {
  const box = $(dich);
  if (!box) return;
  box.innerHTML = '';
  ds.forEach(s => {
    const o = el('div', 'stat' + (s.onClick ? ' clickable' : ''),
      `<div class="k">${esc(s.k)}</div>` +
      `<div class="v">${esc(s.v)}</div>` +
      `<div class="d ${s.dir || ''}">${esc(s.d)}</div>`
    );
    if (s.onClick) { o.tabIndex = 0; o.setAttribute('role', 'button'); o.addEventListener('click', s.onClick); }
    box.appendChild(o);
  });
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

// i.onClick (tuỳ chọn) — xem ghi chú Drill Down ở veThe() phía trên.
function veDanhSach(dich, ds) {
  const box = $(dich);
  if (!box) return;
  box.innerHTML = '';
  ds.forEach(i => {
    const o = el('div', 'list-item' + (i.onClick ? ' clickable' : ''),
      `<div class="bullet ${i.m || ''}"></div>` +
      `<div class="body"><b>${esc(i.b)}</b><span>${esc(i.s)}</span></div>` +
      `<div class="meta">${esc(i.t)}</div>`
    );
    if (i.onClick) { o.tabIndex = 0; o.setAttribute('role', 'button'); o.addEventListener('click', i.onClick); }
    box.appendChild(o);
  });
}

// Render 1 danh mục dạng Data Lock (Phòng ban/Chức danh/Đơn vị tính/Danh
// mục tài sản/Vị trí tài sản...) — cùng khuôn cho mọi bảng {id,ten,
// hoat_dong,trang_thai}. Rút thành hàm dùng chung khi pattern lặp lại lần
// 2 (Tài sản), đúng UX_ENGINEERING_STANDARD.md — không viết lại logic
// khoá/sửa/ẩn riêng từng module (Rule 5).
function veDanhMuc(dsId, demId, trongId, ds, xuLySua, xuLyAn, xuLyKhoa, dongPhu, xuLyLamMoi) {
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
  if (demId) $(demId).textContent = ds.length ? `${ds.length} mục` : '';
  if (trongId) $(trongId).hidden = ds.length > 0;

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
        xuLyLuu: async val => { await API.dlnGanTruongPhong(m.id, val || null); await xuLyLamMoi?.(); }
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
          await xuLyLamMoi?.();
        }
      });
    } else if (btnAn) {
      try { await xuLyAn(btnAn.dataset.an, btnAn.dataset.hd === '1'); await xuLyLamMoi?.(); }
      catch (err) { alert(err.message || 'Không lưu được, thử lại nhé.'); }
    } else if (btnKhoa) {
      if (!confirm('Hoàn tất mục này? Sau đó người thường sẽ không sửa tên được nữa — chỉ Admin mới sửa hoặc mở lại.')) return;
      try { await xuLyKhoa(btnKhoa.dataset.khoa, 'da_khoa'); await xuLyLamMoi?.(); }
      catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
    } else if (btnMoKhoa) {
      try { await xuLyKhoa(btnMoKhoa.dataset.mokhoa, 'nhap'); await xuLyLamMoi?.(); }
      catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
    }
  };
}

// Thêm mới có kiểm tra "gần giống" (Search Before Create) — API dùng
// chung themDanhMuc() ở dulieunen.js trả về {canh_bao, giong:[...]} thay
// vì lỗi khi nghi trùng; hỏi xác nhận rồi gọi lại với xacNhan=true để
// thực sự tạo. goiApi(ten, xacNhan) là 1 trong các hàm API.dlnThem* —
// rút thành hàm dùng chung khi cần lần 2 (Rule 5, tài sản Danh mục/Vị
// trí — trước đây chỉ dùng ở Dữ liệu nền, sót không gọi ở Tài sản, làm
// form "im lặng không tạo gì" khi trùng tên mà không báo — audit
// 23/08/2026 khi rà lại tab Tài sản).
async function themCoCanhBaoTrung(goiApi, ten, oLoi) {
  let kq = await goiApi(ten, false);
  if (kq && kq.canh_bao) {
    const ok = confirm(`Đã có mục gần giống: "${kq.giong.join('", "')}".\nVẫn tạo "${ten}" là mục MỚI riêng?`);
    if (!ok) return false;
    kq = await goiApi(ten, true);
  }
  return true;
}

function veBang(dich, ds, hang) {
  const box = $(dich);
  if (!box) return;
  box.innerHTML = '';
  ds.forEach(r => {
    const tr = document.createElement('tr');
    if (r && r.id != null) tr.dataset.id = r.id;   // để drill-down scroll đúng dòng (xem MO_DEN_VIEC_CUA_TOI)
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
   DẢI "DANH SÁCH NÀY ĐÃ BỊ CẮT" — dùng chung cho MỌI màn có trần `LIMIT`
   ---------------------------------------------------------------------------
   Góp ý chị Vũ Lan Hương (HCNS, 28/08/2026): *"không hiển thị hết công việc
   public ở mục 'Việc cần làm'"*. LỚP vấn đề: danh sách bị cắt mà giao diện
   không nói là đã cắt (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md).

   Máy chủ trả kèm `cat = { gioi_han, tong }` (null nếu KHÔNG cắt — xem
   src/cat-danh-sach.js). Ở đây chỉ có một việc: cắt thì NÓI RA, kèm đường đi
   tiếp. Không cắt thì dải biến mất hẳn — một dải luôn hiện là một dải mắt
   người học được cách bỏ qua trong đúng một tuần.
   ========================================================================== */
function veDaiCat(dich, cat, dat = {}) {
  const box = $(dich);
  if (!box) return;
  if (!cat) { box.hidden = true; box.innerHTML = ''; return; }

  const dv = dat.don_vi || 'mục';
  const gh = cat.gioi_han;
  const tong = Number.isFinite(cat.tong) ? cat.tong : null;
  // "ĐÃ TẢI", không phải "đang hiện" (REV-0034 · L5). `gioi_han` là số dòng MÁY
  // CHỦ trả về; nhiều màn còn lọc tiếp phía trình duyệt (Trạm Mục Tiêu chỉ hiện
  // mục tiêu cá nhân CỦA CHÍNH người xem) nên "đang hiện 300" là một con số
  // KHÔNG mô tả cái đang nhìn — cùng lớp nói dối với `#ls-dem` in "500/500".
  // Không đếm được tổng (bảng chưa nạp migration…) vẫn PHẢI báo là đã cắt —
  // im lặng vì thiếu con số là quay lại đúng cái lỗi đang vá.
  const chu = tong != null
    ? `Đã tải <b>${gh}</b> trong tổng <b>${tong}</b> ${esc(dv)} — còn <b>${Math.max(0, tong - gh)}</b> ${esc(dv)} chưa tải về máy.`
    : `Đã tải <b>${gh}</b> ${esc(dv)} đầu danh sách — danh sách này <b>đã bị cắt bớt</b>, còn nữa.`;
  const nut = dat.nut
    ? `<button type="button" class="dai-cat-nut" ${dat.nut.tab ? `data-dai-cat-tab="${esc(dat.nut.tab)}"` : 'data-dai-cat-chay="1"'}>${esc(dat.nut.chu)}</button>`
    : '';
  box.innerHTML = `<span class="dai-cat-chu">✂️ ${chu}${dat.goi_y ? ' ' + esc(dat.goi_y) : ''}</span>${nut}`;
  // Nút "tải thêm" chạy một HÀM chứ không nhảy tab — gắn thẳng, không qua
  // handler chung (mỗi dải một hàm tải riêng).
  if (dat.nut && dat.nut.chay) {
    const b = box.querySelector('[data-dai-cat-chay]');
    if (b) b.addEventListener('click', () => dat.nut.chay(b));
  }
  box.hidden = false;
}

/* Một chỗ bắt click cho MỌI dải cắt — thêm dải mới không phải viết lại handler. */
document.addEventListener('click', (e) => {
  const nut = e.target.closest('[data-dai-cat-tab]');
  if (nut) moTab(nut.getAttribute('data-dai-cat-tab'));
});

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

/* ⚠️ KHỐI NÀY PHẢI NẰM TRƯỚC MỌI LỆNH KHỞI ĐỘNG BÊN DƯỚI — ĐỪNG DỜI XUỐNG.
   Trước bản này `const TBDay` khai ở GIỮA file, tức SAU `await khoiDongChat()`.
   `const` không được nâng GIÁ TRỊ: lúc khoiDongChat() chạm tới TBDay thì biến
   vẫn trong vùng chết (TDZ) → ném "Cannot access TBDay before initialization",
   cả hàm chết giữa chừng và `window.moChatVoi` KHÔNG BAO GIỜ được gán. Nút
   "Chat ngay" ở Danh bạ gọi `window.moChatVoi?.()` — dấu `?.` nuốt luôn, nên
   bấm ra… không gì cả. ĐO ĐƯỢC 29/08/2026: bấm 4 nút, mở 0
   (`node scripts/do-chat-noibo.mjs`).
   Luật chung: mọi `const`/`let` cấp mô-đun mà mã khởi động dùng tới phải khai
   TRƯỚC dòng `await khoiDongVinhDanh()` ngay dưới đây. */

/* ==========================================================================
   THÔNG BÁO TIN NHẮN (CTL-0014) — yêu cầu gốc của chị Phạm Thị Lan:
   "Không hiện thông báo khi có tin nhắn đến".
   ---------------------------------------------------------------------------
   ĐO TRƯỚC KHI XÂY. ERP đã có SỐ ĐỎ đếm tin chưa đọc, và số đó TỰ cập nhật 6
   giây một lần (`setInterval(hoiChuaDocToanCuc, 6000)` ngay dưới đây) — nên
   chị Lan KHÔNG thiếu chuyện "phải F5 mới thấy". Thứ thiếu là hai cái khác:
     · Số đỏ hiện lên hoàn toàn IM LẶNG — không tiếng, không rung. Trước bản
       này không một chỗ nào trong file gọi Audio/AudioContext/vibrate.
     · Đóng ERP ra là điếc — `public/sw.js` không có handler `push`.

   BA LỚP, tách ra vì mỗi lớp sống được ở một loại máy khác nhau:
     ① ÂM NHẸ + RUNG — chạy trên MỌI máy, KHÔNG cần xin quyền gì. Kể cả iPhone
       chưa "Thêm vào màn hình chính". Đây là đường lùi để không có ai bị bỏ
       lại hoàn toàn im lặng.
     ② THÔNG BÁO HỆ THỐNG khi ERP mở nhưng ở tab nền — cần quyền.
     ③ WEB PUSH khi đã đóng hẳn ERP — cần quyền + service worker (máy chủ lo,
       xem `src/day-thong-bao.js`).

   Âm thanh dựng bằng WebAudio, KHÔNG tải file mp3: thêm 0 byte tài sản, chạy
   được cả khi mất mạng, và không phải xin thêm hạn mức nào.
   ========================================================================== */
const TBDay = (() => {
  const KHOA_HOAN = 'erp-tbday-hoan-den';   // mốc "để sau" — nhớ ở MÁY, không tốn DB

  let batTrenMayChu = false;   // két Cloudflare đã có khoá VAPID chưa
  let khoaCongKhai = null;
  let chatTat = 0;             // người dùng tự tắt loại "tin nhắn"
  let dangKyHong = false;      // đã cho quyền nhưng máy KHÔNG đăng ký được (điếc âm thầm)
  /* MÁY CHỦ đang giữ mấy đăng ký của tôi (REV-0031 Việc 4 · L4). `null` =
     chưa hỏi được -> KHÔNG kết luận gì. `pushKhoa` trả sẵn `so_may` từ Đợt 1
     mà chưa ai dùng: thiếu nó thì "Đang bật" chỉ là lời của TRÌNH DUYỆT, còn
     máy chủ đã mất đăng ký (máy dùng chung bị người sau chiếm, hoặc vừa bấm
     "Tắt đẩy trên máy này") thì màn hình vẫn khoe đang bật — nói dối. */
  let soMayTrenMayChu = null;
  let amCtx = null;

  const laIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const daCaiManHinhChinh =
    window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true;

  /* iPhone CHỈ nhận thông báo đẩy khi PWA đã được Thêm vào màn hình chính
     (iOS 16.4+). Chưa cài thì `Notification` thường không tồn tại — gọi vào là
     ném lỗi. Hàm này là cái chốt để không bao giờ hỏi quyền ở nơi không hỏi được. */
  function hoiQuyenDuoc() {
    if (typeof Notification === 'undefined') return false;
    if (laIOS && !daCaiManHinhChinh) return false;
    return true;
  }
  function daChoQuyen() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }

  /* ---- ① Âm nhẹ + rung — không cần quyền, chạy mọi máy ------------------ */

  /** Hai nốt ngắn, âm lượng thấp. `manh` dùng cho tin đến khi KHÔNG mở cửa sổ
   *  đó; tin đến ngay trong cửa sổ đang đọc thì chỉ cần tiếng khẽ. */
  function am(manh = false) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      // Dựng muộn: iOS chỉ cho tạo/chạy AudioContext sau một cú chạm thật.
      if (!amCtx) amCtx = new AC();
      if (amCtx.state === 'suspended') amCtx.resume().catch(() => {});
      const t0 = amCtx.currentTime;
      const to = manh ? 0.10 : 0.045;          // rất khẽ — đây là nơi dễ gây khó chịu nhất
      [880, 1174.66].forEach((hz, i) => {
        const o = amCtx.createOscillator(), g = amCtx.createGain();
        o.type = 'sine'; o.frequency.value = hz;
        const b = t0 + i * 0.11;
        g.gain.setValueAtTime(0.0001, b);
        g.gain.exponentialRampToValueAtTime(to, b + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, b + 0.10);
        o.connect(g); g.connect(amCtx.destination);
        o.start(b); o.stop(b + 0.12);
      });
    } catch { /* máy chặn âm thanh — không phải lỗi, bỏ qua êm */ }
  }

  function rung() {
    // iOS Safari không có navigator.vibrate. Đó là lý do âm thanh phải có mặt.
    try { navigator.vibrate?.([80, 40, 80]); } catch { /* bỏ qua */ }
  }

  /* ---- ② Thông báo hệ thống khi ERP đang mở nhưng ở tab nền ------------- */

  async function hienTaiCho(tieuDe, than) {
    if (!daChoQuyen()) return false;
    try {
      /* Phải đi qua service worker: Chrome trên Android KHÔNG cho dùng
         `new Notification()` thẳng trong trang — ném TypeError. */
      const reg = await navigator.serviceWorker?.ready;
      if (!reg) return false;
      await reg.showNotification(tieuDe, {
        body: than,
        icon: '/assets/img/pwa-192.png',
        badge: '/assets/img/pwa-192.png',
        /* Nhãn RIÊNG cho tin tổng hợp trong app: không được trùng nhãn
           `chat:<người gửi>` của `sw.js`, nếu không nó tráo mất thông báo thật
           của một người cụ thể (REV-0028 M1). */
        tag: 'chat:trong-app',
        renotify: false,
        data: { duong_dan: '/app.html#chat' }
      });
      return true;
    } catch { return false; }
  }

  /* ---- ③ Đăng ký Web Push ----------------------------------------------- */

  function b64urlSangByte(s) {
    const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
    const bu = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
    const u8 = new Uint8Array(bu.length);
    for (let i = 0; i < bu.length; i++) u8[i] = bu.charCodeAt(i);
    return u8;
  }

  function moTaMay() {
    const ua = navigator.userAgent;
    const he = laIOS ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android'
      : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Máy khác';
    const tr = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome'
      : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt';
    return `${he} · ${tr}`;
  }

  async function dangKyDay() {
    if (!batTrenMayChu || !khoaCongKhai) return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { dangKyHong = true; return false; }
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      /* Khoá máy chủ đổi (sinh lại VAPID) thì đăng ký cũ vĩnh viễn không nhận
         được gì — phải huỷ rồi đăng ký lại, không thì hỏng IM LẶNG. */
      if (sub) {
        const cu = sub.options?.applicationServerKey;
        const khop = cu && byteBang(new Uint8Array(cu), b64urlSangByte(khoaCongKhai));
        if (!khop) { try { await sub.unsubscribe(); } catch { /* kệ */ } sub = null; }
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64urlSangByte(khoaCongKhai)
        });
      }
      const j = sub.toJSON();
      if (!j?.keys?.p256dh || !j?.keys?.auth) { dangKyHong = true; return false; }
      await API.pushDangKy({
        endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, may: moTaMay()
      });
      dangKyHong = false;
      // Vừa đăng ký xong -> máy chủ chắc chắn đang giữ ít nhất máy này. Không
      // cập nhật ở đây thì `so_may` cũ (đọc TRƯỚC lúc đăng ký) sẽ báo oan.
      soMayTrenMayChu = Math.max(soMayTrenMayChu || 0, 1);
      return true;
    } catch { dangKyHong = true; return false; }   // đã cho quyền mà vẫn điếc — phải hiện ra
  }

  function byteBang(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  async function huyDayMayNay() {
    try {
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager?.getSubscription();
      const ep = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      await API.pushHuy(ep || '');
      // Đã tự tắt trên máy này -> máy chủ không còn giữ đăng ký của nó nữa.
      // Không hạ số này thì màn hình vẫn báo "Đang bật" ngay sau khi vừa tắt.
      soMayTrenMayChu = Math.max((soMayTrenMayChu || 1) - 1, 0);
      return true;
    } catch { return false; }
  }

  /* ---- Nạp trạng thái từ máy chủ --------------------------------------- */

  async function nap() {
    try {
      const k = await API.pushKhoa();
      batTrenMayChu = !!k.bat;
      khoaCongKhai = k.khoa_cong_khai;
      chatTat = k.chat_tat ? 1 : 0;
      soMayTrenMayChu = typeof k.so_may === 'number' ? k.so_may : null;
      return k;
    } catch { return null; }
  }

  function nenMoiBat() {
    if (!batTrenMayChu) return false;         // két chưa có khoá — đừng mời vô ích
    if (chatTat) return false;                // người ta đã chủ động tắt
    if (daChoQuyen()) return false;           // đã bật rồi
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return false;
    return !dangHoan();                       // bấm "Để sau" thì im 7 ngày
  }
  function hoanLai(ngay = 7) {
    try { localStorage.setItem(KHOA_HOAN, String(Date.now() + ngay * 86400000)); } catch { /* chế độ riêng tư */ }
  }

  /** Ảnh chụp trạng thái THẬT của máy này — đầu vào duy nhất của
   *  `tinhTrangThaiTB()`. Đo, không đoán. */
  function doTrangThai() {
    return {
      batTrenMayChu, chatTat,
      coNotification: typeof Notification !== 'undefined',
      quyen: typeof Notification !== 'undefined' ? Notification.permission : null,
      laIOS, daCaiManHinhChinh, dangKyHong, soMayTrenMayChu
    };
  }

  /** Còn hoãn "Để sau" tới lúc nào — chỉ áp cho lời mời, xem `hoanDuoc()`.
   *  CÓ try/catch (REV-0031): `setItem` ở `hoanLai()` đã phòng chế độ riêng
   *  tư từ trước, còn `getItem` thì không — mà Safari riêng tư/Firefox chặn
   *  cookie NÉM ngay ở `getItem`. Lỗi đó nổ trong `veTrangThaiTB()` nên
   *  `veGiaoDienTB()` không chạy, chuông giữ `hidden`, dải trạng thái không
   *  hiện: đúng lỗi H2 gốc quay lại nguyên vẹn, mà lại IM LẶNG TUYỆT ĐỐI vì
   *  chỗ gọi dùng `.then(...)` không có `.catch`. Hỏng thì coi như KHÔNG hoãn:
   *  thà hiện thừa một lời mời còn hơn giấu mất một người đang điếc. */
  function dangHoan() {
    try {
      const hoan = Number(localStorage.getItem(KHOA_HOAN) || 0);
      return !!(hoan && Date.now() < hoan);
    } catch { return false; }
  }

  return {
    am, rung, hienTaiCho, nap, dangKyDay, huyDayMayNay, nenMoiBat, hoanLai,
    hoiQuyenDuoc, daChoQuyen, laIOS, daCaiManHinhChinh, doTrangThai, dangHoan,
    get batTrenMayChu() { return batTrenMayChu; },
    get chatTat() { return chatTat; },
    set chatTat(v) { chatTat = v ? 1 : 0; }
  };
})();

/* Ô gõ nhiều dòng — nối MỘT LẦN, uỷ quyền trên `document` nên ăn cả những ô
   mà các `khoiDong*` bên dưới dựng ra sau. Đặt TRƯỚC chúng, không phải sau. */
noiDayONhieuDong();

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

    veBang('#db-bang', ds, n => {
      const tt = TRANG_THAI_HD[n.trang_thai_hd] || TRANG_THAI_HD.available;
      // Ví dụ: "🟢 Đang làm việc" hoặc "🟡 Đang họp · đến 15:00" — dot MÀU
      // + CHỮ luôn đi cùng (spec §10 "Status luôn có text, không chỉ dot
      // màu"), ghi chú chỉ nối thêm khi có, không render null/undefined.
      const thd = `<span class="tag ${tt.mau}">${esc(tt.chu)}</span>` +
        (n.trang_thai_ghi_chu ? `<div class="sm">${esc(n.trang_thai_ghi_chu)}</div>` : '');
      return `<td><div class="person">${avHtml(n.id, n.viet_tat, n.co_anh)}` +
        `<div><div class="nm">${esc(n.ho_ten)}</div>` +
        `<div class="sm">${esc(n.chuc_vu)}</div></div></div></td>` +
      `<td>${thd}</td>` +
      `<td>${esc(n.bo_phan)}</td>` +
      `<td><a class="lnk" href="tel:${esc(String(n.sdt || '').replace(/\s/g, ''))}">${esc(n.sdt || '—')}</a></td>` +
      `<td><a class="lnk" href="mailto:${esc(n.email)}">${esc(n.email || '—')}</a></td>` +
      `<td class="sm">${esc(n.quan_ly || '—')}</td>` +
      `<td>${(coChat && n.id !== TOI.id)
        ? `<button type="button" class="btn-nho" data-chatngay="${esc(n.id)}" data-ten="${esc(n.ho_ten)}" data-vt="${esc(n.viet_tat)}">Chat ngay</button>`
        : ''}</td>`;
    });

    $('#db-trong').hidden = ds.length > 0;
    $('#db-dem').textContent = `${ds.length}/${danh_ba.length} người`;
  };

  veDanhBa('');
  $('#db-tim').addEventListener('input', e => veDanhBa(e.target.value));

  $('#db-bang').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-chatngay]');
    if (!btn) return;
    /* ⚠️ TRƯỚC ĐÂY dòng dưới là `window.moChatVoi?.(…)`. Dấu `?.` biến một
       mô-đun chat CHẾT thành cú bấm KHÔNG LÀM GÌ CẢ — không lỗi, không chữ,
       không dấu vết: đúng thứ Sếp Ngọc báo ngày 29/08/2026 ("ấn chat không
       được"). Nay hỏng thì PHẢI nói ra, người dùng còn biết đường tải lại
       trang thay vì bấm mãi vào một cái nút đã chết. */
    if (typeof window.moChatVoi !== 'function') {
      btn.textContent = 'Chat lỗi — tải lại trang';
      btn.disabled = true;
      console.error('Chat ngay: mô-đun chat chưa khởi động (window.moChatVoi không có).');
      return;
    }
    window.moChatVoi(btn.getAttribute('data-chatngay'), btn.getAttribute('data-ten'), btn.getAttribute('data-vt'));
  });

  // Sidebar gọi lại đây sau khi Lưu trạng thái — sửa thẳng dòng của mình
  // trong mảng đã tải (khỏi gọi lại API), re-render đúng ô tìm kiếm hiện
  // tại. Không F5 (Rule 7 UI State Consistency).
  window.LAM_MOI_TRANGTHAI_DANHBA = (id, ma, ghiChu) => {
    const n = danh_ba.find(x => x.id === id);
    if (!n) return;
    n.trang_thai_hd = ma;
    n.trang_thai_ghi_chu = ghiChu;
    veDanhBa($('#db-tim').value);
  };
}

/* -- Trạm Mục Tiêu: giao việc cho nhân viên (máy chủ thật) -- */
if (TOI.quyen.includes('congviec')) {
  try { await khoiDongCongViec(); } catch (e) { console.error('Trạm Mục Tiêu:', e); }
  try { await veTongQuanTheoVaiTro(); } catch (e) { console.error('Tóm tắt Tổng quan:', e); }
  // SPEC-0004 — "Việc của tôi hôm nay" + "Ai đang đọng việc" + "Đáng ghi nhận".
  // Bọc try/catch riêng: chưa nạp migration thì ba khối này im, phần Trạm Mục
  // Tiêu đang chạy KHÔNG được hỏng theo.
  try { await veHomNay(); } catch (e) { console.error('Việc của tôi hôm nay:', e); }
}

/* -- Lịch sử làm việc (máy chủ thật) -- */
if (TOI.quyen.includes('lichsuviec')) {
  try { await khoiDongLichSuViec(); } catch (e) { console.error('Lịch sử làm việc:', e); }
}

/* -- Chat nội bộ (máy chủ thật) -- */
if (TOI.quyen.includes('chat')) {
  try { await khoiDongChat(); } catch (e) { console.error('Chat nội bộ:', e); }
}

/* -- Góp ý & Cải tiến ERP (máy chủ thật) -- */
if (TOI.quyen.includes('gopy')) {
  try { await khoiDongGopY(); } catch (e) { console.error('Góp ý ERP:', e); }
}

/* ==========================================================================
   SPEC-0004 — "VIỆC CỦA TÔI HÔM NAY" · "AI ĐANG ĐỌNG VIỆC" · "ĐÁNG GHI NHẬN"
   ---------------------------------------------------------------------------
   EXCEPTION-FIRST xuyên suốt: khối nào không có gì bất thường thì BIẾN MẤT,
   không hiện khối rỗng và không hiện "🎉 bạn không có việc trễ".
   ĐIỆN THOẠI MỘT TAY: mọi dòng là một khối chạm được ≥44px (class `cv-dong`),
   xếp DỌC, không có bảng ngang ở màn <720px — kho vận dùng điện thoại là
   chính. Ngân sách thao tác: 0 lần bấm để thấy việc quá hạn (nó nằm sẵn ở màn
   đầu), 1 chạm để mở đúng việc.
   ========================================================================== */

async function veHomNay() {
  let kq;
  try { kq = await API.cvHomNay(); } catch { return; }
  const t = kq.toi || {};

  /* ---- ① Việc của tôi hôm nay ---- */
  const khoi = [];
  const dong = (mau, nhan, id, phu) =>
    `<button type="button" class="cv-dong ${mau}" data-cv-mo="${id}">` +
      `<span class="cv-dong-ten">${esc(nhan)}</span>` +
      (phu ? `<span class="cv-dong-phu">${esc(phu)}</span>` : '') +
    `</button>`;

  if ((t.qua_han || []).length) {
    khoi.push(`<div class="cv-nhom"><div class="cv-nhom-dau danger">🔴 ${t.qua_han.length} việc quá hạn</div>` +
      /* REV-0019 L2 — việc trễ từ TRƯỚC khi chuyển sang tay mình thì phải nói
         rõ, kẻo người vừa nhận bàn giao mở ERP ra chỉ thấy chữ đỏ "trễ 9 ngày"
         và tưởng mình đang bị chê. Q3/2026 đang chuyển nhân sự HKĐ lên công ty
         nên việc bị chuyền tay nhiều nhất đúng lúc này. */
      t.qua_han.map(v => dong('qua-han', v.tieu_de, v.id,
        `trễ ${v.tre} ngày` + (v.nhan_cach_day != null ? ` · bạn nhận việc ${v.nhan_cach_day} ngày trước` : '')
      )).join('') + '</div>');
  }
  if ((t.den_han_hom_nay || []).length) {
    khoi.push(`<div class="cv-nhom"><div class="cv-nhom-dau warn">🟡 ${t.den_han_hom_nay.length} việc đến hạn hôm nay</div>` +
      t.den_han_hom_nay.map(v => dong('den-han', v.tieu_de, v.id, '')).join('') + '</div>');
  }
  if ((t.chua_bat_dau || []).length) {
    khoi.push(`<div class="cv-nhom"><div class="cv-nhom-dau">⏳ ${t.chua_bat_dau.length} việc chưa bắt đầu</div>` +
      t.chua_bat_dau.map(v => dong('', v.tieu_de, v.id, `giao ${v.dong} ngày trước`)).join('') + '</div>');
  }
  /* Chữ BẠN in đậm là CỐ Ý: người giao việc thường không nghĩ mình đang là
     người làm chậm. Đây là lỗ hổng đau nhất — nhân viên nộp xong, người giao
     quên duyệt, việc chết ở giữa, và người chịu tiếng lại là nhân viên. */
  if ((t.cho_toi_duyet || []).length) {
    khoi.push(`<div class="cv-nhom"><div class="cv-nhom-dau tim">🟣 ${t.cho_toi_duyet.length} việc đang chờ <b>BẠN</b> duyệt</div>` +
      t.cho_toi_duyet.map(v => dong('cho-duyet', v.tieu_de, v.id,
        `${v.nguoi_nhan_ten}${v.dong != null ? ` — đã chờ ${v.dong} ngày` : ''}`)).join('') + '</div>');
  }

  const panel = $('#cv-homnay-panel');
  panel.hidden = khoi.length === 0;
  if (khoi.length) {
    $('#cv-homnay-body').innerHTML = khoi.join('');
    // 1 chạm là mở đúng việc, không qua danh sách trung gian.
    $('#cv-homnay-body').querySelectorAll('[data-cv-mo]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.cvMo;
        const laDuyet = b.classList.contains('cho-duyet');
        if (window.MO_DEN_VIEC_CUA_TOI) window.MO_DEN_VIEC_CUA_TOI(laDuyet ? 'giao' : 'nhan', id);
      });
    });
  }

  /* Công tắc tự tắt nhắc — đặt NGAY TRONG ứng dụng là có chủ đích: không cho
     tắt ở đây thì người ta tắt chuông ở tầng điện thoại, và lúc đó không ai
     biết gì cả. Tắt ở đây thì Sếp còn thấy và còn hỏi được vì sao.
     Và tắt nhắc KHÔNG tắt trách nhiệm: việc quá hạn vẫn leo cấp lên quản lý,
     vẫn vào bản tin tuần của Sếp. */
  const nutTat = $('#cv-nhactat-nut');
  if (nutTat) {
    let tat = kq.nhac_tat === 1;
    const veNut = () => { nutTat.textContent = tat ? '🔕 Đang tắt nhắc — bật lại' : '🔔 Đang nhận nhắc việc'; };
    veNut();
    nutTat.onclick = async () => {
      try { await API.cvNhacTat(tat ? 0 : 1); tat = !tat; veNut(); }
      catch (e) { alert(e.message || 'Không đổi được cài đặt nhắc việc'); }
    };
  }

  /* ---- ② + ③ Hai bảng NẰM CẠNH NHAU, CÙNG KÍCH THƯỚC ----
     Bố cục là thông điệp: hệ thống nhìn cả hai chiều. Nếu chỉ có bảng bắt lỗi
     thì Trạm Mục Tiêu bị hiểu là máy giám sát, và cách phòng thủ tự nhiên của
     mọi người là tránh nhận việc có hạn chót rõ ràng — đúng thứ phá hỏng MBOs. */
  const ql = kq.quan_ly;
  const bangDong = $('#cv-dongviec-panel');
  if (ql && (ql.dong_viec || []).length) {
    bangDong.hidden = false;
    $('#cv-dongviec-pv').textContent = ql.pham_vi === 'cong_ty' ? 'Toàn công ty' : 'Nhóm bạn quản lý';
    $('#cv-dongviec-body').innerHTML = ql.dong_viec.map(n => {
      const canhBao = n.tre_nhat > 7;   // máy đã hết cách nhắc — cần NGƯỜI vào cuộc
      const so = [];
      if (n.qua_han) so.push(`<span class="tag danger">🔴 ${n.qua_han} quá hạn</span> <span class="sm">trễ nhất ${n.tre_nhat} ngày</span>`);
      if (n.cho_duyet) so.push(`<span class="tag tim">🟣 ${n.cho_duyet} chờ chính người này duyệt</span> <span class="sm">đọng nhất ${n.dong_nhat} ngày</span>`);
      return `<div class="cv-dong-the">` +
        `<div class="nm">${esc(n.ho_ten)}${canhBao ? ' <span class="tag danger" title="Quá 7 ngày — nhắc máy đã hết tác dụng, cần hỏi trực tiếp">⚠️</span>' : ''}</div>` +
        `<div class="sm">${so.join('<br>')}</div></div>`;
    }).join('');
  } else { bangDong.hidden = true; }

  const ghiNhan = kq.ghi_nhan || [];
  const bangGhiNhan = $('#cv-ghinhan-panel');
  if (ghiNhan.length) {
    bangGhiNhan.hidden = false;
    /* KHÔNG đếm số việc, KHÔNG xếp hạng, KHÔNG có "quán quân tuần" — đây là
       danh sách NHỮNG LẦN LÀM TỐT, không phải bảng thi đua (điều cấm 20). */
    $('#cv-ghinhan-body').innerHTML = ghiNhan.map(v => {
      const nhan = v.som > 0 ? `nộp sớm ${v.som} ngày` : 'đúng hạn';
      return `<div class="cv-dong-the">` +
        `<div class="nm">${esc(v.nguoi_nhan_ten)} <span class="tag sage">${esc(nhan)}</span></div>` +
        `<div class="sm">“${esc(v.tieu_de)}”</div>` +
        `<button type="button" class="btn-nho btn-primary cv-nut-ghinhan" data-ns="${esc(v.nguoi_nhan_id)}" data-viec="${esc(v.tieu_de)}">⭐ Ghi nhận</button>` +
        `</div>`;
    }).join('');
    $('#cv-ghinhan-body').querySelectorAll('.cv-nut-ghinhan').forEach(b => {
      b.addEventListener('click', () => {
        // MỘT CHẠM → mở đúng form Vinh danh có sẵn, điền sẵn người + lời khen
        // nháp (sửa được). Máy chỉ chỗ — NGƯỜI mới khen.
        if (window.MO_FORM_VINH_DANH) window.MO_FORM_VINH_DANH(b.dataset.ns, `Hoàn thành đúng hạn: ${b.dataset.viec}`);
      });
    });
  } else { bangGhiNhan.hidden = true; }

  $('#cv-hai-bang').hidden = bangDong.hidden && bangGhiNhan.hidden;
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
  //
  // REV-0016 mục 4: chuỗi ĐÃ mang múi giờ sẵn (dạng ISO '...T09:00:00Z' hoặc
  // '+07:00') thì nối thêm 'Z' nữa là thành '...ZZ' → Date.parse trả NaN →
  // màn hình hiện "NaN ngày trước". Dữ liệu đi qua API thì luôn đúng dạng
  // trần trụi, nhưng nhập từ nguồn khác (đối soát, chép tay, sàn TMĐT) là lộ.
  // Nên: có múi giờ thì tin nó, so với giờ THẬT; trần trụi thì mới ép +7h.
  const s = String(chuoi).trim();
  const coMuiGio = /([Zz]|[+-]\d{2}:?\d{2})$/.test(s);
  const luc = Date.parse(coMuiGio ? s : s.replace(' ', 'T') + 'Z');
  if (!Number.isFinite(luc)) return '';   // thà không hiện gì còn hơn hiện "NaN"
  const gioNay = coMuiGio ? Date.now() : Date.now() + 7 * 3600 * 1000;
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
  const { capNhatHienThi: veNguoiVd } = ganCombo({
    hienThi: $('#vd-nguoihienthi'), panel: $('#vd-nguoipanel'),
    tim: $('#vd-nguoitim'), goiY: $('#vd-nguoigoiy'), giaTri: chonNguoi
  }, () => danh_ba.map(n => ({ gia_tri: n.id, nhan: nhanNhanSu(n) })), null, 'Chọn người...');

  // Nút mở/đóng đổi chữ theo trạng thái — trước đây chữ đứng yên "+ Khen ai
  // đó" dù form đang mở, không ai biết bấm lại là đóng được (Sếp Ngọc bắt lỗi
  // 20/08/2026: "mở ra xong ko đóng được vào à"). Thêm cả nút "Hủy" trong
  // form cho chắc, khỏi phải đoán bấm lại nút mở.
  const nutMoVd = $('#vd-nut-mo');
  function dongMoFormVd(hienForm) {
    $('#vd-form-body').hidden = !hienForm;
    nutMoVd.textContent = hienForm ? '✕ Đóng' : '+ Khen ai đó';
  }
  /* ĐANG SỬA lời khen nào (null = đang gửi mới). DÙNG LẠI ĐÚNG FORM NÀY,
     không dựng hộp thứ hai: form đã có đủ 3 thứ sửa được (người · nội dung ·
     số sao), mà `vdSua` KHÔNG cho đổi người — nên ở chế độ sửa, ô người bị
     khoá và có chữ nói rõ vì sao (chọn nhầm người thì phải Gỡ, xem `vdSua`). */
  let vdDangSuaId = null;
  function thoatCheDoSua() {
    vdDangSuaId = null;
    $('#vd-dang-sua').hidden = true;
    $('#vd-nguoihienthi').classList.remove('khoa');
    $('#vd-nut-gui').textContent = 'Vinh danh';
  }
  nutMoVd.addEventListener('click', () => {
    if (vdDangSuaId) { $('#vd-form').reset(); veNguoiVd(); thoatCheDoSua(); }
    dongMoFormVd($('#vd-form-body').hidden);
  });
  $('#vd-nut-huy').addEventListener('click', () => {
    $('#vd-form').reset();
    veNguoiVd();
    thoatCheDoSua();
    dongMoFormVd(false);
  });

  /* NÚT ⭐ GHI NHẬN — MỘT CHẠM, mở ĐÚNG form Vinh danh đang chạy với dữ liệu
     điền sẵn. KHÔNG endpoint mới, KHÔNG bảng mới: vẫn là `vdGui` cũ.
     Vì sao đáng làm: rào cản thật không phải Sếp không muốn khen, mà là phải
     NHỚ ai đã làm gì rồi TỰ ĐI TÌM mà khen. Bảng "Đáng ghi nhận" bỏ khâu nhớ,
     nút này bỏ khâu đi tìm. Còn lại đúng một chạm và một câu Sếp tự viết.
     Số sao mặc định 3 — MÁY KHÔNG TỰ CỘNG SAO BAO GIỜ: sao tự động biến ngay
     thành điểm KPI, và người ta sẽ chọn việc dễ, xin hạn dài, chia nhỏ việc
     để cộng sao (điều cấm 20). Máy chỉ chỗ, NGƯỜI mới khen. */
  function moFormVinhDanh(nhanSuId, loiKhenNhap) {
    dongMoFormVd(true);
    thoatCheDoSua();
    chonNguoi.value = nhanSuId;
    veNguoiVd();
    $('#vd-noidung').value = loiKhenNhap || '';
    const oSao = $('#vd-so-sao');
    if (oSao) oSao.value = 3;
    $('#vd-noidung').focus();
    $('#vd-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* Mở CHÍNH form trên ở chế độ SỬA một lời khen đã gửi (REV-0037 · L5). */
  function moFormSuaKhen(r) {
    dongMoFormVd(true);
    vdDangSuaId = r.id;
    chonNguoi.value = r.nhan_su_id;
    veNguoiVd();
    $('#vd-nguoihienthi').classList.add('khoa');
    $('#vd-dang-sua').hidden = false;
    $('#vd-dang-sua-ten').textContent = r.nhan_su_ten;
    $('#vd-noidung').value = r.noi_dung || '';
    const oSao = $('#vd-so-sao');
    if (oSao) oSao.value = r.so_sao ?? 1;
    $('#vd-nut-gui').textContent = 'Lưu lời khen';
    $('#vd-noidung').focus();
    $('#vd-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  window.MO_FORM_VINH_DANH = moFormVinhDanh;

  async function taiLai() {
    let kq;
    try { kq = await API.vdDanhSach(); } catch { return; }
    const ds = kq.vinh_danh || [];

    /* GỢI Ý — ĐÃ ĐỔI CÁCH TÍNH (SPEC-0004 câu 7). Bản cũ gợi ý "ai hoàn thành
       NHIỀU VIỆC NHẤT tuần này", tức đang xếp hạng năng suất (điều cấm 20) và
       dạy người ta chia nhỏ việc để lên đầu bảng. Bản mới gợi ý MỘT LẦN LÀM
       TỐT CỤ THỂ: việc gần nhất nộp đúng hạn — không đếm, không xếp hạng. */
    const goiYBody = $('#vd-goiy-body');
    if (kq.goi_y && kq.goi_y.tieu_de) {
      const g = kq.goi_y;
      goiYBody.hidden = false;
      $('#vd-goiy').innerHTML =
        `💡 <span>${esc(g.nguoi_nhan_ten)} vừa hoàn thành đúng hạn: “${esc(g.tieu_de)}”</span>` +
        `<button type="button" class="btn-nho" id="vd-goiy-nut">Vinh danh luôn</button>`;
      $('#vd-goiy-nut').addEventListener('click',
        () => moFormVinhDanh(g.nguoi_nhan_id, `Hoàn thành đúng hạn: ${g.tieu_de}`));
    } else {
      goiYBody.hidden = true;
    }

    const list = $('#vd-list');
    /* Nút Sửa/Gỡ CHỈ hiện trên lời khen của CHÍNH mình và CHỈ trong 24h —
       `con_sua_duoc` tính ở máy chủ để khỏi lệch múi giờ máy khách. Cửa thật
       vẫn chốt ở `vdSua`; ẩn nút chỉ để khỏi vẽ thứ bấm vào là báo lỗi. */
    VD_THEO_ID = {};
    list.innerHTML = ds.map(r => {
      VD_THEO_ID[r.id] = r;
      const cuaToi = kq.toi && r.nguoi_gui_id === kq.toi;
      const nut = (cuaToi && r.con_sua_duoc)
        ? `<div class="vd-nut">
             <button type="button" class="btn-nho" data-vd-sua="${r.id}">Sửa</button>
             <button type="button" class="btn-nho" data-vd-go="${r.id}">Gỡ</button>
           </div>`
        : '';
      return `
      <div class="vd-item person">
        ${avHtml(r.nhan_su_id, (r.nhan_su_ten || '?').trim().split(/\s+/).slice(-2).map(t => t[0]).join('').toUpperCase(), r.co_anh)}
        <div style="flex:1">
          <div class="nm">${esc(r.nhan_su_ten)}` +
            ` <span class="tag warn" title="Vừa được tặng lần này">+${esc(r.so_sao ?? 1)} ⭐</span>` +
            ` <span class="tag sage" title="Tổng sao tích luỹ, dùng đổi quà">⭐ ${esc(r.sao ?? 0)} tổng</span></div>
          <div class="vd-noidung">${esc(r.noi_dung)}</div>
          <div class="sm">— ${esc(r.nguoi_gui_ten)} · ${thoiGianTruoc(r.tao_luc)}</div>
          ${nut}
        </div>
      </div>`;
    }).join('');
    $('#vd-trong').hidden = ds.length > 0;
  }

  let VD_THEO_ID = {};
  $('#vd-list').addEventListener('click', async (e) => {
    const nSua = e.target.closest('[data-vd-sua]');
    if (nSua) { moFormSuaKhen(VD_THEO_ID[nSua.getAttribute('data-vd-sua')]); return; }
    const nGo = e.target.closest('[data-vd-go]');
    if (!nGo) return;
    const r = VD_THEO_ID[nGo.getAttribute('data-vd-go')];
    /* NÓI THẲNG HẬU QUẢ TRƯỚC KHI GỠ — người ta ĐÃ ĐỌC lời khen rồi, nên
       "gỡ" ở đây không phải là xoá cho biến mất mà là gửi một lời đính chính.
       Giấu điều đó đi là để Sếp bấm nhầm lần thứ hai. */
    if (!confirm(`Gỡ lời khen gửi ${r.nhan_su_ten}?\n\n`
      + `· Trừ lại ${r.so_sao ?? 1} ⭐ đã cộng\n`
      + `· ${r.nhan_su_ten} SẼ NHẬN một thông báo đính chính (bạn ấy đã đọc lời khen rồi)\n`
      + `· Việc gỡ được ghi vào sổ sửa`)) return;
    nGo.disabled = true;
    try { await API.vdSua(r.id, { go: true }); await taiLai(); }
    catch (err) { alert(err.message || 'Không gỡ được, thử lại nhé.'); nGo.disabled = false; }
  });

  $('#vd-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#vd-loi').textContent = '';
    const nut = $('#vd-nut-gui');
    nut.disabled = true;
    try {
      const noiDung = $('#vd-noidung').value.trim();
      const soSao = parseInt($('#vd-so-sao').value, 10);
      if (vdDangSuaId) await API.vdSua(vdDangSuaId, { noi_dung: noiDung, so_sao: soSao });
      else await API.vdGui(chonNguoi.value, noiDung, soSao);
      $('#vd-form').reset();
      veNguoiVd();
      thoatCheDoSua();
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
// Home 3 tầng theo vai trò thật (audit 23/08/2026, docs/audit/AUDIT-HOME-DASHBOARD.md):
// Employee = Action First (việc CỦA TÔI) · Manager = Exception First (ngoại
// lệ của PHÒNG tôi quản lý) · CEO/Admin = Decision First (vấn đề cần quyết
// định). Manager KHÔNG xác định qua vai_tro hệ thống (nhiều trưởng phòng
// thật chỉ có vai_tro="nguoi_dung") mà qua TOI.phong_ban_quan_ly — đúng
// cơ chế phong_ban.truong_phong_id đã dùng cho Xếp ca/Duyệt (ERP-CONSTITUTION.md).
async function veTongQuanTheoVaiTro() {
  if (!TOI.quyen.includes('congviec')) return;

  let cv, mt;
  try { [cv, mt] = await Promise.all([API.cvDanhSach(), API.mtDanhSach()]); }
  catch { return; }

  const homNay = new Date().toISOString().slice(0, 10);
  const chuaXong = c => !['hoan_thanh', 'huy'].includes(c.trang_thai);
  const nhan = (cv.nhan || []).filter(chuaXong);
  const giao = (cv.giao || []).filter(chuaXong);
  const quaHanNhan = nhan.filter(c => c.han_chot && c.han_chot < homNay);
  const quaHanGiao = giao.filter(c => c.han_chot && c.han_chot < homNay).length;
  const choDuyetGiao = giao.filter(c => c.trang_thai === 'cho_duyet').length;

  const the = [];
  const canhBao = [];
  const laManager = !TOI.la_admin && (TOI.phong_ban_quan_ly || []).length > 0;

  if (TOI.la_admin) {
    ((mt.cong_ty || [])).filter(m => m.trang_thai === 'dang_thuc_hien' && !m.da_chot)
      .forEach(m => canhBao.push({ m: 'warn', b: `Mục tiêu công ty "${m.tieu_de}" chưa chốt`, s: 'Vào khối Trạm Mục Tiêu bên dưới để chốt', t: 'Mục tiêu' }));
    if (quaHanGiao > 0) canhBao.push({ m: 'danger', b: `${quaHanGiao} việc đã giao đang quá hạn`, s: 'Bấm để xem trong Lịch sử làm việc', t: 'Công việc',
      onClick: () => window.MO_DEN_LICHSU_TIM && window.MO_DEN_LICHSU_TIM('') });
    if (choDuyetGiao > 0) canhBao.push({ m: 'warn', b: `${choDuyetGiao} việc đang chờ Sếp duyệt`, s: 'Bấm để xem ở Lịch sử làm việc — phạm vi "Tôi giao"', t: 'Công việc',
      onClick: () => window.MO_DEN_VIEC_CUA_TOI && window.MO_DEN_VIEC_CUA_TOI('giao') });

    try {
      const dt = await API.kdTongQuanDoanhThu();
      if (dt.co_bang) {
        the.push({ k: 'Doanh thu hôm nay', v: tienVN(dt.hom_nay.tong_tien) + ' đ', d: `${dt.hom_nay.so_don} đơn` });
      }
    } catch { /* chưa nạp migration đơn hàng ở môi trường này — im lặng bỏ qua */ }
  } else if (laManager) {
    // Exception First cho trưởng phòng — TEAM của họ, không phải việc cá
    // nhân (cá nhân vẫn thấy tiếp ở khối Việc cần làm bên dưới như Employee).
    try {
      const tq = await API.cvTongQuanPhongBan();
      const tenPhong = (tq.phong_ban || []).map(p => p.ten).join(', ') || 'phòng bạn quản lý';
      the.push({ k: 'Việc đang mở', v: String(tq.dang_mo || 0), d: tenPhong });
      the.push({ k: 'Việc quá hạn', v: String(tq.qua_han || 0), d: tq.qua_han ? 'Cần xử lý' : 'Không có', dir: tq.qua_han ? 'down' : '' });
      the.push({ k: 'Chờ duyệt', v: String(tq.cho_duyet || 0), d: tenPhong });
      (tq.viec_qua_han || []).forEach(v => {
        const [nam, thang, ngay] = (v.han_chot || '').split('-');
        canhBao.push({ m: 'danger', b: v.tieu_de, s: `${v.nguoi_nhan_ten} — quá hạn ${ngay}/${thang}/${nam}`, t: 'Quá hạn',
          onClick: () => window.MO_DEN_LICHSU_TIM && window.MO_DEN_LICHSU_TIM(v.tieu_de) });
      });
    } catch { /* chưa có phòng ban quản lý hợp lệ hoặc lỗi mạng — im lặng, Home vẫn dùng được */ }
  } else {
    the.push({ k: 'Việc đang mở', v: String(nhan.length), d: 'Việc tôi phải làm',
      onClick: () => window.MO_DEN_VIEC_CUA_TOI && window.MO_DEN_VIEC_CUA_TOI('nhan') });
    the.push({ k: 'Việc quá hạn', v: String(quaHanNhan.length), d: quaHanNhan.length ? 'Cần xử lý ngay' : 'Không có', dir: quaHanNhan.length ? 'down' : '',
      onClick: quaHanNhan.length ? () => window.MO_DEN_VIEC_CUA_TOI && window.MO_DEN_VIEC_CUA_TOI('nhan', quaHanNhan[0].id) : null });
    if (giao.length > 0) the.push({ k: 'Việc tôi giao — chờ duyệt', v: String(choDuyetGiao), d: `${giao.length} việc đang giao`,
      onClick: () => window.MO_DEN_VIEC_CUA_TOI && window.MO_DEN_VIEC_CUA_TOI('giao') });
  }

  if (the.length) { veThe('#tq-tomtat', the); $('#tq-tomtat').hidden = false; }
  if (canhBao.length) { veDanhSach('#tq-canhbao-that', canhBao); $('#tq-canhbao-panel').hidden = false; }

  /* Khối đảo thứ tự "#cvSeg lên trước .mt-panel" ĐÃ GỠ cùng ba tab (Sếp Ngọc
     29/08/2026). Không còn ba bảng nằm trong tab này để mà đảo — Action First
     cho nhân viên nay do khối "Việc của tôi hôm nay" gánh (nó vốn đã nằm TRÊN
     CÙNG mọi vai trò), phần danh sách đầy đủ nằm ở tab Lịch sử làm việc. */
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
  // đã có — nhưng SỬA ĐƯỢC CẢ BẢY TRƯỜNG, không còn ô nào đóng băng (Sếp
  // Ngọc nhắc LẦN THỨ BA: "còn việc sửa mục tiêu sau khi đã giao nữa").
  //
  // Hộp này KHÔNG tự quyết được gì: mọi luật (ai sửa được, trường nào bắt
  // buộc lý do, mục tiêu đóng sổ thì khoá tới đâu) đều nằm ở máy chủ và trả
  // về mã lỗi thật. Ở đây làm đúng bốn việc — đổ sẵn giá trị đang có, hỏi lý
  // do ĐÚNG LÚC cần, cảnh báo hậu quả TRƯỚC khi bấm Lưu, và in lại lỗi máy
  // chủ nguyên văn. Bịa luật lần hai ở trình duyệt là mời hai bên lệch nhau.
  const mtFormModal = $('#mtFormModalNen');
  let mtDangSuaId = null;
  let mtDangSua = null;      // bản ghi GỐC — để so xem trường nào THẬT SỰ đổi
  let mtCheDoMoLai = false;  // mục tiêu đã đóng sổ: chỉ cho mở lại, không sửa nội dung

  const MT_CAP_TEN = { cong_ty: 'Công ty', phong_ban: 'Phòng ban', ca_nhan: 'Cá nhân' };

  /* Ô "Phòng ban" chỉ có nghĩa khi cấp = phòng ban. Cấp khác mà vẫn hiện ô đó
     là mời người ta điền vào một chỗ máy chủ sẽ xoá trắng. */
  function capNhatOBoPhanMt() {
    $('#mt-field-bophan').hidden = $('#mt-cap').value !== 'phong_ban';
  }

  /* Trường nào ĐANG THẬT SỰ khác giá trị gốc — dùng chung cho cả ba việc:
     bật hộp lý do, dựng dải cảnh báo, và gói dữ liệu gửi đi. Một nguồn sự
     thật, không ba chỗ so lệch nhau. */
  function mtCacTruongDoi() {
    const m = mtDangSua || {};
    const doi = {};
    const v = (id) => $(id).value.trim();
    if (v('#mt-tieu-de') !== (m.tieu_de || '')) doi.tieu_de = v('#mt-tieu-de');
    if (v('#mt-mo-ta') !== (m.mo_ta || '')) doi.mo_ta = v('#mt-mo-ta');
    if ($('#mt-cap').value !== m.cap) doi.cap = $('#mt-cap').value;
    // Phòng ban chỉ tính khi ô đang hiện — cấp khác thì máy chủ tự xoá nhãn.
    if (!$('#mt-field-bophan').hidden && v('#mt-bo-phan') !== (m.bo_phan || '')) {
      doi.bo_phan = v('#mt-bo-phan');
    }
    if (Number($('#mt-nam').value) !== Number(m.nam)) doi.nam = Number($('#mt-nam').value);
    if (Number($('#mt-quy').value) !== Number(m.quy)) doi.quy = Number($('#mt-quy').value);
    if ($('#mt-trang-thai').value !== m.trang_thai) doi.trang_thai = $('#mt-trang-thai').value;
    return doi;
  }

  /* Hộp lý do bật khi cấp/năm/quý thật sự đổi (hoặc đang mở lại mục tiêu đã
     đóng sổ). Bật sẵn từ đầu thì người ta gõ cho có mỗi lần sửa chính tả, và
     luật thành hình thức — sửa chính tả PHẢI đi lọt không câu hỏi nào. */
  function capNhatCanhBaoMt() {
    const doi = mtCheDoMoLai ? { trang_thai: 'dang_thuc_hien' } : mtCacTruongDoi();
    const nangKy = doi.nam !== undefined || doi.quy !== undefined;
    const nangCap = doi.cap !== undefined;
    const canLyDo = mtCheDoMoLai || nangKy || nangCap;

    $('#mt-khoi-lydo').hidden = !canLyDo;
    $('#mt-ly-do').required = canLyDo;
    $('#mt-ly-do-nhan').textContent = mtCheDoMoLai
      ? 'Vì sao mở lại mục tiêu này? *'
      : (nangKy && nangCap ? 'Vì sao đổi cấp và đổi kỳ? *'
        : (nangKy ? 'Vì sao chuyển mục tiêu sang kỳ khác? *' : 'Vì sao đổi cấp mục tiêu? *'));

    /* ⚠️ HẬU QUẢ THẬT, NÓI TRƯỚC KHI BẤM LƯU. Hai chỗ, mỗi chỗ một câu — và
       kèm SỐ VIỆC đang treo dưới mục tiêu, vì "3 việc" đọc khác hẳn "0 việc". */
    const m = mtDangSua || {};
    const cauCanhBao = [];
    if (nangKy) {
      const kyCu = `Quý ${m.quy}/${m.nam}`;
      const kyMoi = `Quý ${doi.quy ?? m.quy}/${doi.nam ?? m.nam}`;
      cauCanhBao.push(`Chuyển <b>${kyCu} → ${kyMoi}</b> là <b>đổi kỳ báo cáo</b>: số liệu cả hai quý đều đổi theo. Ai đang mở Trạm Mục Tiêu ${kyCu} sẽ không còn thấy mục tiêu này.`);
    }
    if (nangCap) {
      cauCanhBao.push(doi.cap === 'ca_nhan'
        ? `Hạ xuống <b>Cá nhân</b> là <b>giấu mục tiêu khỏi cả công ty</b> — chỉ mình bạn còn nhìn thấy nó ở Trạm Mục Tiêu.`
        : `Đổi cấp <b>${MT_CAP_TEN[m.cap] || m.cap} → ${MT_CAP_TEN[doi.cap] || doi.cap}</b> là đổi <b>ai nhìn thấy mục tiêu này</b>.`);
    }
    if (cauCanhBao.length && m.so_viec > 0) {
      cauCanhBao.push(`Mục tiêu này đang có <b>${m.so_viec} việc</b> gắn vào. Việc <b>không mất</b> — vẫn treo nguyên vào mục tiêu — nhưng người đang làm sẽ không còn thấy thẻ mục tiêu ở chỗ cũ nữa.`);
    }
    $('#mt-canh-bao').innerHTML = cauCanhBao.join('<br><br>');
    $('#mt-canh-bao').hidden = cauCanhBao.length === 0;
  }

  async function veLichSuSuaMt(id) {
    const khoi = $('#mt-lichsu-khoi');
    khoi.hidden = true;
    veDaiCat('#mt-lichsu-cat', null);
    try {
      const ls = await API.suaLichSu('muc_tieu', id);
      const ds = ls.ds || [];
      if (ds.length) {
        $('#mt-lichsu').innerHTML = ds.map(d =>
          `<li>${esc(d.cau)} <span class="luc">· ${esc(String(d.luc || '').slice(0, 16))}</span></li>`).join('');
        veDaiCat('#mt-lichsu-cat', ls.cat, { don_vi: 'lần sửa' });
        khoi.hidden = false;
      }
    } catch { /* không xem được lịch sử thì thôi, đừng chặn việc sửa */ }
  }

  /* `moLai = true` → mục tiêu đã Hoàn thành/Đã huỷ: khoá hết ô nội dung, chỉ
     còn đúng một nước là mở lại (kèm lý do). Máy chủ cũng chốt y hệt — ở đây
     giấu ô đi cho người dùng khỏi gõ xong mới bị từ chối. */
  function moFormSua(m, moLai) {
    mtDangSuaId = m.id;
    mtDangSua = m;
    mtCheDoMoLai = !!moLai;
    $('#mt-loi').textContent = '';
    $('#mt-ly-do').value = '';
    $('#mt-tieu-de').value = m.tieu_de || '';
    $('#mt-mo-ta').value = m.mo_ta || '';
    $('#mt-cap').value = m.cap;
    $('#mt-bo-phan').value = m.bo_phan || '';
    $('#mt-nam').value = m.nam;
    $('#mt-quy').value = String(m.quy);
    $('#mt-trang-thai').value = moLai ? 'dang_thuc_hien' : m.trang_thai;
    // Cấp công ty chỉ Admin mới đặt được (y hệt lúc tạo) — giấu hẳn lựa chọn
    // đó với người khác thay vì để họ chọn rồi ăn 403.
    $('#mt-cap-opt-congty').hidden = !TOI.la_admin && m.cap !== 'cong_ty';

    $('#mt-form-tieude').textContent = moLai ? 'Mở lại mục tiêu' : 'Sửa mục tiêu';
    $('#mt-form-nhac').textContent = moLai
      ? `Mục tiêu này đã ${m.trang_thai === 'huy' ? 'huỷ' : 'hoàn thành'} — bản ghi là kết quả của kỳ nên nội dung đang khoá. Mở lại về "Đang thực hiện" thì sửa tiếp được, nhưng phải ghi lý do và có để lại vết.`
      : 'Sửa tên và mô tả thì thoải mái. Đổi phòng ban phụ trách thì có ghi vết. Đổi cấp, năm hoặc quý thì phải ghi lý do — đó là đổi cam kết của cả kỳ.';
    document.querySelectorAll('.mt-o-noidung').forEach(o => { o.hidden = !!moLai; });
    if (!moLai) capNhatOBoPhanMt();
    $('#mt-nut-luu').textContent = moLai ? 'Mở lại mục tiêu' : 'Lưu thay đổi';

    capNhatCanhBaoMt();
    mtFormModal.hidden = false;
    veLichSuSuaMt(m.id);
  }
  function dongMoFormMt() {
    mtFormModal.hidden = true;
    mtDangSuaId = null;
    mtDangSua = null;
    mtCheDoMoLai = false;
    $('#mt-form').reset();
  }
  mtFormModal.addEventListener('click', e => { if (e.target === mtFormModal) dongMoFormMt(); });
  $('#mt-nut-huy').addEventListener('click', dongMoFormMt);
  $('#mt-cap').addEventListener('change', () => { capNhatOBoPhanMt(); capNhatCanhBaoMt(); });
  ['#mt-nam', '#mt-quy', '#mt-trang-thai', '#mt-bo-phan'].forEach(s => {
    $(s).addEventListener('change', capNhatCanhBaoMt);
    $(s).addEventListener('input', capNhatCanhBaoMt);
  });

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
    // Nút Sửa nay mở CẢ BẢY trường, không chỉ tên + mô tả.
    const cuaToi = m.nguoi_tao_id === TOI.id || TOI.la_admin;
    const duocSua = cuaToi && !daXong && !daHuy && !m.da_chot;
    /* MỞ LẠI — mục tiêu đã Hoàn thành/Đã huỷ thì nội dung khoá, nhưng phải
       còn ĐÚNG MỘT lối ra. Nút "Xong" không có bước xác nhận nào: bấm nhầm
       một cái mà đóng băng vĩnh viễn cả mục tiêu của quý thì đó là cắt quá
       tay, không phải an toàn. Mở lại có ghi vết + bắt lý do nên không ai
       lặng lẽ dựng lại một mục tiêu đã đóng sổ được. */
    const duocMoLai = cuaToi && (daXong || daHuy) && !m.da_chot;
    const nutSua = duocSua
      ? `<span class="mt-the-nut"><button type="button" class="btn-nho" data-mt-sua="${m.id}">Sửa</button> <button type="button" class="btn-nho" data-mt-xong="${m.id}">Xong</button> <button type="button" class="btn-nho" data-mt-huy="${m.id}">Huỷ</button></span>`
      : (duocMoLai
        ? `<span class="mt-the-nut"><button type="button" class="btn-nho" data-mt-molai="${m.id}">Mở lại</button></span>`
        : '');

    // Thẻ nhỏ gọn: hàng 1 = tên (cắt 1 dòng, rê chuột hiện đủ) + % nổi bật;
    // hàng 2 = thanh tiến độ; hàng 3 = mô tả 1 dòng; hàng 4 = badge + số việc + nút.
    // Bấm vào thẻ (ngoài nút Xong/Huỷ/Chốt) → mở hộp chi tiết xem việc gắn vào.
    const r = el('div', 'mt-the ' + mucMau + (daHuy ? ' mo' : ''),
      `<div class="mt-the-top">` +
        `<div class="mt-the-tt" title="${esc(m.tieu_de)}">${esc(m.tieu_de)}</div>` +
        `<div class="mt-the-pct ${mucMau}">${pct}<span>%</span></div>` +
      `</div>` +
      `<div class="bar mt-the-bar"><i class="${mauBar}" style="width:0"></i></div>` +
      (m.mo_ta ? `<div class="mt-the-mo">${dg(m.mo_ta)}</div>` : '') +
      (!daXong && !daHuy && m.han_gan_nhat ? `<div class="mt-the-han">⏰ Hạn gần nhất: ${dongHanMt(m.han_gan_nhat)}</div>` : '') +
      `<div class="mt-the-meta">${badge}` +
        `<span class="mt-the-viec">${m.so_viec_xong}/${m.so_viec} việc · ${esc(m.nguoi_tao_ten)}</span>` +
        nutSua +
      `</div>`);
    r.dataset.mtId = m.id;
    requestAnimationFrame(() => { r.querySelector('.bar > i').style.width = pct + '%'; });
    return r;
  }

  let DS_MT = [];   // cả 3 cấp, dùng chung để đổ dropdown "Thuộc mục tiêu" ở Trạm Mục Tiêu

  // Mục tiêu đã Hoàn thành/Đã huỷ gấp lại thành khối riêng, không nằm lẫn
  // với mục đang làm — càng làm xong nhiều mục tiêu, màn hình càng đầy nếu
  // không gấp lại (Sếp Ngọc yêu cầu 23/08/2026: "để không bị đầy màn hình
  // và dễ kiểm soát"). Vẫn xem lại được ngay, chỉ cần bấm mở — không mất,
  // không phải sang tab khác. Backend đã sắp mục đang làm lên trước + theo
  // hạn gần nhất (xem mtDanhSach trong index.js), nên chỉ cần tách 2 nhóm
  // theo đúng thứ tự mảng trả về, không cần sort lại ở đây.
  function veNhomMucTieu(prefix, list) {
    const dangLam = list.filter(m => m.trang_thai === 'dang_thuc_hien');
    const daXong = list.filter(m => m.trang_thai !== 'dang_thuc_hien');

    const oList = $(`#mt-${prefix}-list`);
    oList.innerHTML = '';
    dangLam.forEach(m => oList.appendChild(veThe1MucTieu(m)));
    $(`#mt-${prefix}-trong`).hidden = list.length > 0;

    const oToggle = $(`#mt-${prefix}-daxong-toggle`);
    const oDaXongList = $(`#mt-${prefix}-daxong-list`);
    oToggle.hidden = daXong.length === 0;
    $(`#mt-${prefix}-daxong-dem`).textContent = `Đã xong (${daXong.length})`;
    oDaXongList.innerHTML = '';
    daXong.forEach(m => oDaXongList.appendChild(veThe1MucTieu(m)));
    // Gán qua .onclick (không addEventListener) — hàm này gọi lại mỗi lần
    // nạp dữ liệu, tránh chồng nhiều listener chạy trùng khi bấm 1 lần mở
    // ra nhiều khối.
    oToggle.onclick = () => {
      const dangMo = !oDaXongList.hidden;
      oDaXongList.hidden = dangMo;
      oToggle.classList.toggle('mo', !dangMo);
    };
  }

  async function taiLaiMucTieu() {
    const kq = await API.mtDanhSach();
    $('#mt-ky-hint').textContent = `Quý ${kq.quy}/${kq.nam}`;
    // REV-0034 · L5: dải nói "ĐÃ TẢI", không nói "đang hiện" — màn này còn lọc
    // tiếp phía trình duyệt (cấp cá nhân chỉ hiện mục tiêu CỦA CHÍNH người
    // xem), nên số máy chủ trả về không phải số đang nằm trên màn hình.
    veDaiCat('#mt-cat', kq.cat, {
      don_vi: 'mục tiêu',
      goi_y: 'Cấp cá nhân chỉ hiện mục tiêu của chính bạn nên số thẻ trên màn còn ít hơn số đã tải.'
    });
    DS_MT = [...(kq.cong_ty || []), ...(kq.phong_ban || []), ...(kq.ca_nhan || [])];

    veNhomMucTieu('congty', kq.cong_ty || []);
    veNhomMucTieu('phongban', kq.phong_ban || []);
    veNhomMucTieu('canhan', kq.ca_nhan || []);

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
      /* CHỈ gửi trường THẬT SỰ đổi. Gửi hết mọi trường thì mỗi lần bấm Lưu là
         đẻ một loạt dòng lịch sử "đổi A → A" — sổ đầy rác, đọc không ra cái
         gì, và tốn hạn mức ghi D1 vô ích (REV-0031). */
      const doi = mtCheDoMoLai ? { trang_thai: 'dang_thuc_hien' } : mtCacTruongDoi();
      if (!mtCheDoMoLai && doi.tieu_de !== undefined && !doi.tieu_de) {
        $('#mt-loi').textContent = 'Tên mục tiêu không được để trống.';
        return;
      }
      if (!Object.keys(doi).length) { dongMoFormMt(); return; }
      if (mtCheDoMoLai || doi.cap !== undefined || doi.nam !== undefined || doi.quy !== undefined) {
        doi.ly_do = $('#mt-ly-do').value.trim();
      }
      await API.mtCapNhat(mtDangSuaId, doi);
      dongMoFormMt();
      await taiLaiMucTieu();
    } catch (err) {
      // In NGUYÊN VĂN lỗi máy chủ — nó đã nói rõ vì sao bị chặn (thiếu lý do,
      // sai vai, mục tiêu đã đóng sổ). Thay bằng câu chung chung là giấu mất
      // lời giải ngay trước mắt người đang bí.
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
      return `<td><div class="nm">${esc(v.tieu_de)}</div>${v.dau_ra ? `<div class="sm">${dg(v.dau_ra)}</div>` : ''}${v.phoi_hop_ten ? `<div class="sm">🤝 Phối hợp: ${esc(v.phoi_hop_ten)}</div>` : ''}</td>` +
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
      if (m) moFormSua(m, false);
      return;
    }
    const nutMoLai = e.target.closest('[data-mt-molai]');
    if (nutMoLai) {
      const m = DS_MT.find(x => String(x.id) === String(nutMoLai.getAttribute('data-mt-molai')));
      if (m) moFormSua(m, true);
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
  /* ⚠️ SÁU Ô CHỨA, KHÔNG PHẢI BA. `veNhomMucTieu` đổ mục tiêu ĐANG LÀM vào
     `#mt-*-list` nhưng mục tiêu ĐÃ XONG/ĐÃ HUỶ vào `#mt-*-daxong-list` (khối
     gấp lại, Sếp Ngọc yêu cầu 23/08/2026). Ba ô chứa "đã xong" trước bản này
     KHÔNG có listener nào — nghĩa là bấm vào thẻ mục tiêu đã hoàn thành thì
     KHÔNG MỞ ĐƯỢC hộp chi tiết xem việc, im lặng, không báo lỗi gì. Bàn đo
     `do-hop-sua-muctieu.mjs` bắt được khi nút "Mở lại" bấm mãi không lên hộp.
     Nút chết vì thiếu listener là loại lỗi không ai thấy cho tới lúc cần. */
  ['congty', 'phongban', 'canhan'].forEach(p => {
    $(`#mt-${p}-list`).addEventListener('click', xuLyNutMucTieu);
    $(`#mt-${p}-daxong-list`).addEventListener('click', xuLyNutMucTieu);
  });

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
  /* CTL-0017 — bản ghi việc theo id, để hộp Sửa đổ sẵn giá trị đang có và để
     biết trường nào THẬT SỰ đổi khi bấm Lưu. Nạp trong `taiLai()` từ đúng
     lượt gọi đã có, KHÔNG thêm lượt gọi thứ hai. */
  let CV_THEO_ID = {};
  const oPhoiHop = $('#cv-phoi-hop');
  const chonNguoiNhan = $('#cv-nguoi-nhan');

  // Cho tự giao cho MÌNH = todo cá nhân (việc cần làm của bản thân). Ghim lên
  // đầu danh sách cho dễ thấy.
  const { capNhatHienThi: veNguoiNhanCv } = ganCombo({
    hienThi: $('#cv-nguoi-nhanhienthi'), panel: $('#cv-nguoi-nhanpanel'),
    tim: $('#cv-nguoi-nhantim'), goiY: $('#cv-nguoi-nhangoiy'), giaTri: chonNguoiNhan
  }, () => [
    { gia_tri: TOI.id, nhan: '🙋 Tôi — việc cần làm của tôi (todo cá nhân)' },
    ...danh_ba.filter(n => n.id !== TOI.id).map(n => ({ gia_tri: n.id, nhan: nhanNhanSu(n) }))
  ], null, 'Chọn người nhận việc...');

  danh_ba.filter(n => n.id !== TOI.id).forEach(n => {
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
    veNguoiNhanCv();
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

  // Form gọn: người phối hợp/ghi chú thêm gộp sau 1 nút "+ Thêm tuỳ chọn",
  // ẩn mặc định — 5 ô chính (Giao cho ai/Tên việc/Đầu ra/Hạn chót/Thuộc mục
  // tiêu) là đủ cho phần lớn việc, đỡ rối mắt (Sếp Ngọc chốt 21/08/2026:
  // "thiết kế gọn, dễ làm, dễ hiểu thôi nhé"). "Thuộc mục tiêu" LUÔN hiện
  // sẵn (không giấu trong tuỳ chọn) — trước đây bị ẩn khiến người dùng bấm
  // "+ Giao Mục Tiêu", điền xong, chỉ ra 1 Việc thường chứ không tạo Mục
  // tiêu, gây hiểu lầm "sao mục tiêu tôi tự giao không thấy ở Trạm Mục
  // Tiêu" (Sếp Ngọc phản ánh 23/08/2026).
  const oTuyChon = $('#cv-tuychon-them');
  const nutTuyChon = $('#cv-nut-tuychon');
  function moTuyChon(hien) {
    oTuyChon.hidden = !hien;
    nutTuyChon.textContent = hien ? '− Ẩn tuỳ chọn thêm' : '+ Thêm tuỳ chọn (người phối hợp, ghi chú)';
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
    if (nguoiNhanId) { chonNguoiNhan.value = nguoiNhanId; veNguoiNhanCv(); }
    if (mucTieuId) { oCvMucTieu.value = mucTieuId; capNhatMtmKhoi(); }
    apDungCheDoTodo();
  };

  /* `chuyenSegCv` + trình nghe `#cvSeg` ĐÃ GỠ — ba tab không còn nằm ở tab
     này nữa. `MO_DEN_VIEC_CUA_TOI` GIỮ NGUYÊN TÊN VÀ CHỮ KÝ (seg, rowId) vì
     nó là ĐƯỜNG DẪN CŨ: khối "Việc của tôi hôm nay" và các thẻ đếm ở Tổng
     quan gọi nó với 'nhan'/'giao'. Đổi tên hàm là làm vỡ đúng những chỗ đó,
     nên chỉ đổi ĐÍCH ĐẾN: chuyển hướng êm sang màn gộp ở Lịch sử làm việc,
     đúng bộ lọc, đúng dòng. Không có trang trắng, không có nút chết.
     Móc nối thật nằm ở `khoiDongLichSuViec`; gọi qua `goiMocNoi` để nếu mô-đun
     đó chết lúc khởi động thì HÉT LÊN chứ không im lặng nuốt cú bấm (BH REV-0038). */
  const SEG_CU_SANG_LOC = { nhan: 'toi', phoihop: 'phoihop', giao: 'giao' };
  window.MO_DEN_VIEC_CUA_TOI = (seg, rowId) => {
    goiMocNoi('MO_MAN_VIEC', 'lichsuviec', SEG_CU_SANG_LOC[seg] || 'toi', rowId);
  };

  /* `dongHan` đã GỠ — bản sao thứ hai của `hanChotVN` trong khoiDongLichSuViec,
     từng vẽ hạn chót cho ba bảng nay không còn. Giữ lại một hàm chết là giữ
     lại đúng thứ sinh ra "ba màn hình nói ba con số khác nhau". */

  /* ---- NÚT HÀNH ĐỘNG TRÊN MỘT DÒNG VIỆC ---------------------------------
     Trước bản gộp, đoạn này nằm rải trong ba hàm `veBang` khác nhau — cùng
     một luật, chép ba lần. Nay MỘT hàm, dùng cho cả bốn phạm vi của màn gộp.
     `loai` = phạm vi đang xem:
       'toi'     — việc TÔI nhận: Bắt đầu làm / Nộp kết quả; todo tự giao thì
                   ✓ Xong · Sửa · Bỏ.
       'giao'    — việc TÔI giao: Duyệt xong / Trả lại · Sửa · Huỷ.
       'phoihop' — CHỈ THEO DÕI, không nút (Sếp Ngọc chốt 20/08/2026: giữ đúng
                   1 đầu mối chịu trách nhiệm báo cáo cho mỗi việc).
       'congty'  — sổ tra cứu việc của người khác: không nút.
     Ẩn nút chỉ là phép lịch sự với mắt; CỬA THẬT nằm ở máy chủ
     (`CV_MO_THEO_TRANG_THAI`, `cvSua`) — gọi thẳng API vẫn bị chặn 403/409. */
  function htmlNutDongViec(r, loai) {
    const chuaXong = ['moi', 'dang_lam', 'cho_duyet'].includes(r.trang_thai);
    if (loai === 'toi') {
      // Người nhận là tôi; nếu người giao cũng là tôi => TODO CÁ NHÂN: bấm 1
      // phát là XONG, khỏi nộp + chờ duyệt. Tự giao cho mình thì tự sửa thoải
      // mái, không phiền ai — trước bản CTL-0017 phải xoá đi ghi lại.
      if (r.nguoi_giao_id === TOI.id) {
        return chuaXong
          ? `<button type="button" class="btn-nho btn-primary" data-cv-xongngay="${r.id}">✓ Xong</button>` +
            ` <button type="button" class="btn-nho cv-nut-sua" data-cv-sua="${r.id}">Sửa</button>` +
            ` <button type="button" class="btn-nho" data-cv-huy="${r.id}">Bỏ</button>`
          : '';
      }
      if (r.trang_thai === 'moi') return `<button type="button" class="btn-nho btn-primary" data-cv-batdau="${r.id}">Bắt đầu làm</button>`;
      if (r.trang_thai === 'dang_lam') return `<button type="button" class="btn-nho btn-primary" data-cv-nop="${r.id}">Nộp kết quả</button>`;
      return '';
    }
    if (loai === 'giao') {
      let nut = '';
      if (r.trang_thai === 'cho_duyet') {
        nut = `<button type="button" class="btn-nho btn-primary" data-cv-duyet="${r.id}">Duyệt xong</button> ` +
              `<button type="button" class="btn-nho" data-cv-tralai="${r.id}">Trả lại</button>`;
      }
      /* CTL-0017 — nút SỬA. Trước bản đó ở đây CHỈ có "Huỷ": muốn sửa một chữ
         trong đầu ra là phải huỷ rồi giao lại — mất lịch sử, người nhận ăn hai
         thông báo. Cố ý ĐỂ NÂU (`.btn-nho` trần), không cam: một khung nhìn
         chỉ MỘT thứ được cam đậm (luật ba màu ③), chỗ đó dành cho "Duyệt xong". */
      if (chuaXong) {
        nut += ` <button type="button" class="btn-nho cv-nut-sua" data-cv-sua="${r.id}">Sửa</button>`;
        nut += ` <button type="button" class="btn-nho" data-cv-huy="${r.id}">Huỷ</button>`;
      }
      return nut;
    }
    return '';
  }

  async function taiLai() {
    let kq;
    try { kq = await API.cvDanhSach(); } catch { return; }
    /* CTL-0017 — giữ lại bản ghi để hộp Sửa đổ sẵn giá trị đang có, khỏi bắt
       người dùng gõ lại từ đầu (gõ lại là mời gõ nhầm). Nạp cùng lượt gọi đã
       có, KHÔNG thêm lượt gọi thứ hai. */
    CV_THEO_ID = {};
    for (const r of [...(kq.nhan || []), ...(kq.giao || [])]) CV_THEO_ID[r.id] = r;
    /* Không còn ba bảng ở tab này để vẽ — dữ liệu (kèm NGUYÊN các nhãn cắt
       `cat_nhan`/`cat_giao`/`cat_phoi_hop`) giao sang màn gộp ở Lịch sử làm
       việc. Vẫn ĐÚNG MỘT lượt gọi `cvDanhSach` như trước, không thêm lượt nào. */
    window.CV_DU_LIEU_CUA_TOI = kq;
  }

  // UI STATE CONSISTENCY (docs/ERP-CONSTITUTION.md): sau mọi mutation đổi
  // cong_viec (tạo/nộp/bắt đầu/xong/duyệt/trả lại/huỷ), các màn ĐỌC lại
  // cùng dữ liệu này (Việc cần làm/giao/phối hợp, Tổng quan công ty Admin,
  // Lịch sử làm việc) phải làm mới ngay — không bắt F5. Gom 1 chỗ để mọi
  // nút hành động gọi giống nhau, không tự viết refresh riêng từng nút
  // (audit 23/08/2026: phát hiện "Lịch sử làm việc" và "Tổng quan công ty"
  // từng chỉ tải 1 lần lúc vào trang, không cập nhật khi có việc mới/đổi
  // trạng thái trong lúc đang dùng).
  async function lamMoiCacManLienQuanCv() {
    await taiLai();                 // nạp lại cvDanhSach -> window.CV_DU_LIEU_CUA_TOI
    await taiLaiTongQuanCongTy();
    // Thứ tự BẮT BUỘC: `taiLai()` trước, màn gộp vẽ sau — vẽ trước là vẽ lại
    // đúng dữ liệu cũ vừa thao tác xong, tức nút bấm "không ăn" trước mắt người dùng.
    if (window.LAM_MOI_LICHSU_VIEC) await window.LAM_MOI_LICHSU_VIEC();
    /* Khối "Việc của tôi hôm nay" nay là thứ DUY NHẤT còn hiện việc ở Trạm
       Mục Tiêu — nộp/duyệt xong mà nó vẫn kể việc cũ thì đúng bằng nói dối.
       Trước bản gộp nó ăn theo ba bảng bên cạnh nên không lộ. */
    try { await veHomNay(); } catch { /* chưa nạp migration nhắc việc — bỏ qua */ }
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
      veNguoiNhanCv();
      apDungCheDoTodo();
      capNhatMtmKhoi();
      dongMoFormCv(false);
      moTuyChon(false);
      await lamMoiCacManLienQuanCv();
    } catch (err) {
      $('#cv-loi').textContent = err.message || 'Không giao được việc, thử lại nhé.';
    } finally {
      nut.disabled = false;
    }
  });

  /* ==========================================================================
     CTL-0017 — HỘP SỬA VIỆC ĐÃ GIAO
     ------------------------------------------------------------------------
     Hộp này KHÔNG tự quyết được gì: mọi luật (ai sửa được, bước nào sửa được,
     trường nào bắt buộc lý do) đều nằm ở máy chủ và trả về mã lỗi thật. Ở đây
     chỉ làm ba việc — đổ sẵn giá trị đang có, hỏi lý do ĐÚNG LÚC cần, và in
     lại lỗi máy chủ nguyên văn. Bịa luật lần hai ở trình duyệt là mời hai bên
     lệch nhau.
     ====================================================================== */
  const cvSuaModal = $('#cvSuaModalNen');
  let cvDangSuaId = null, cvHanChotCu = null;

  /* Hộp lý do chỉ bật khi hạn chót THẬT SỰ khác giá trị cũ. Bật sẵn từ đầu
     thì người ta gõ cho có mỗi lần sửa chính tả, và luật thành hình thức. */
  function capNhatHopLyDo() {
    const doiHan = ($('#cv-sua-han-chot').value || '') !== (cvHanChotCu || '');
    $('#cv-sua-khoi-lydo').hidden = !doiHan;
    $('#cv-sua-ly-do').required = doiHan;
  }

  async function moHopSuaViec(id) {
    const r = CV_THEO_ID[id];
    if (!r) return;
    cvDangSuaId = id;
    cvHanChotCu = r.han_chot || '';
    $('#cv-sua-tieu-de').value = r.tieu_de || '';
    $('#cv-sua-dau-ra').value = r.dau_ra || '';
    $('#cv-sua-mo-ta').value = r.mo_ta || '';
    $('#cv-sua-han-chot').value = r.han_chot || '';
    $('#cv-sua-ly-do').value = '';
    $('#cv-sua-loi').textContent = '';

    /* `cho_duyet` — người ta ĐÃ NỘP kết quả theo đầu ra cũ. Sửa đầu ra/hạn
       chót lúc này là đổi thước đo sau khi đã đo xong, nên máy chủ khoá. Khoá
       luôn ở đây để người dùng khỏi gõ xong mới bị từ chối — nhưng vẫn để
       sửa được tiêu đề/ghi chú: chính tả không phải bằng chứng, khoá cả cái
       đó mới là cắt quá tay. */
    const daNop = r.trang_thai === 'cho_duyet';
    $('#cv-sua-khoi-daura').hidden = daNop;
    $('#cv-sua-khoi-han').hidden = daNop;
    $('#cv-sua-buoc').textContent = daNop
      ? 'Việc đã nộp chờ duyệt — chỉ sửa được tên việc và ghi chú. Đầu ra và hạn chót đã khoá vì người nhận đã nộp kết quả theo bản cũ.'
      : 'Sửa tên việc và ghi chú thì thoải mái. Đổi đầu ra thì người nhận được báo. Dời hạn chót thì phải ghi lý do.';
    capNhatHopLyDo();
    cvSuaModal.hidden = false;

    // Lịch sử sửa — gọi RIÊNG, và im lặng nếu hỏng: không xem được lịch sử
    // thì vẫn phải sửa được việc.
    const khoi = $('#cv-sua-lichsu-khoi');
    khoi.hidden = true;
    veDaiCat('#cv-sua-lichsu-cat', null);
    try {
      const ls = await API.suaLichSu('cong_viec', id);
      const ds = ls.ds || [];
      if (ds.length) {
        $('#cv-sua-lichsu').innerHTML = ds.map(d =>
          `<li>${esc(d.cau)} <span class="luc">· ${esc(String(d.luc || '').slice(0, 16))}</span></li>`).join('');
        // Sổ bằng chứng bị cắt thì nói ra ngay dưới danh sách (REV-0037 · L1).
        veDaiCat('#cv-sua-lichsu-cat', ls.cat, { don_vi: 'lần sửa' });
        khoi.hidden = false;
      }
    } catch { /* không xem được lịch sử thì thôi, đừng chặn việc sửa */ }
  }

  function dongHopSuaViec() {
    cvSuaModal.hidden = true;
    cvDangSuaId = null;
    cvHanChotCu = null;
  }
  cvSuaModal.addEventListener('click', e => { if (e.target === cvSuaModal) dongHopSuaViec(); });
  $('#cv-sua-nut-huy').addEventListener('click', dongHopSuaViec);
  $('#cv-sua-han-chot').addEventListener('change', capNhatHopLyDo);
  $('#cv-sua-han-chot').addEventListener('input', capNhatHopLyDo);

  $('#cv-sua-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#cv-sua-loi').textContent = '';
    const nut = $('#cv-sua-nut-luu');
    const cu = CV_THEO_ID[cvDangSuaId] || {};
    nut.disabled = true;
    try {
      /* CHỈ gửi trường THẬT SỰ đổi. Gửi hết mọi trường thì mỗi lần bấm Lưu
         là đẻ một loạt dòng lịch sử "đổi A → A" — sổ đầy rác, đọc không ra
         cái gì, và tốn hạn mức ghi D1 vô ích. */
      const doi = {};
      const v = (id) => $(id).value.trim();
      if (v('#cv-sua-tieu-de') !== (cu.tieu_de || '')) doi.tieu_de = v('#cv-sua-tieu-de');
      if (!$('#cv-sua-khoi-daura').hidden && v('#cv-sua-dau-ra') !== (cu.dau_ra || '')) doi.dau_ra = v('#cv-sua-dau-ra');
      if (v('#cv-sua-mo-ta') !== (cu.mo_ta || '')) doi.mo_ta = v('#cv-sua-mo-ta');
      if (!$('#cv-sua-khoi-han').hidden && ($('#cv-sua-han-chot').value || '') !== (cu.han_chot || '')) {
        doi.han_chot = $('#cv-sua-han-chot').value || '';
      }
      if (!Object.keys(doi).length) { dongHopSuaViec(); return; }
      if (doi.han_chot !== undefined) doi.ly_do = v('#cv-sua-ly-do');
      await API.cvSua(cvDangSuaId, doi);
      dongHopSuaViec();
      await lamMoiCacManLienQuanCv();
    } catch (err) {
      // In NGUYÊN VĂN lỗi máy chủ — nó đã nói rõ vì sao bị chặn (thiếu lý do,
      // sai vai, sai bước). Thay bằng câu chung chung là giấu mất lời giải.
      $('#cv-sua-loi').textContent = err.message || 'Không sửa được, thử lại nhé.';
    } finally {
      nut.disabled = false;
    }
  });

  async function xuLyNut(e) {
    const nutSua = e.target.closest('[data-cv-sua]');
    if (nutSua) { await moHopSuaViec(nutSua.getAttribute('data-cv-sua')); return; }
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
          await lamMoiCacManLienQuanCv();
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
      await lamMoiCacManLienQuanCv();
      // Việc chuyển Hoàn thành/Huỷ có thể đổi tiến độ mục tiêu đang gắn — tải lại
      if ((trangThai === 'hoan_thanh' || trangThai === 'huy') && window.LAM_MOI_MUCTIEU) window.LAM_MOI_MUCTIEU();
    } catch (err) {
      alert(err.message || 'Không lưu được, thử lại nhé.');
      btn.disabled = false;
    }
  }
  /* Hai bảng `#cv-bang-nhan` / `#cv-bang-giao` không còn tồn tại — bảng duy
     nhất giờ là `#ls-cv-bang` ở màn gộp. Đưa hàm vẽ nút + hàm xử lý bấm ra
     `window` để màn đó dùng lại NGUYÊN BẢN: một luật, một chỗ. */
  window.CV_HTML_NUT_DONG = htmlNutDongViec;
  window.CV_XU_LY_NUT = xuLyNut;

  // Tổng quan việc TOÀN CÔNG TY — chỉ Admin (Sếp Ngọc/Sếp Phong yêu cầu
  // 23/08/2026: "xem full toàn bộ công ty" ngay ở khu vực Việc, không chỉ
  // việc của riêng mình). Dùng lại .stats/list-item đã có, không tạo
  // component mới (Rule 5, docs/ERP-CONSTITUTION.md).
  async function taiLaiTongQuanCongTy() {
    if (!TOI.la_admin) return;
    $('#cv-tqct-panel').hidden = false;
    try {
      const kq = await API.cvTongQuanCongTy();
      veThe('#cv-tqct-the', [
        { k: 'Việc đang mở', v: String(kq.dang_mo), d: 'Toàn công ty' },
        { k: 'Việc quá hạn', v: String(kq.qua_han), d: kq.qua_han ? 'Cần xử lý' : 'Không có', dir: kq.qua_han ? 'down' : '' },
        { k: 'Chờ duyệt', v: String(kq.cho_duyet), d: 'Toàn công ty' }
      ]);

      const oPhong = $('#cv-tqct-phongban');
      oPhong.innerHTML = (kq.theo_phong_ban || []).length
        ? '<div class="table-wrap"><table><thead><tr>' +
          '<th>Phòng ban</th><th class="num">Đang mở</th><th class="num">Quá hạn</th><th class="num">Chờ duyệt</th>' +
          '</tr></thead><tbody>' +
          kq.theo_phong_ban.map(p => `<tr>` +
            `<td>${esc(p.bo_phan)}</td>` +
            `<td class="num">${p.dang_mo}</td>` +
            `<td class="num">${p.qua_han > 0 ? `<span class="canh-bao-chu">${p.qua_han}</span>` : '0'}</td>` +
            `<td class="num">${p.cho_duyet}</td>` +
          `</tr>`).join('') +
          '</tbody></table></div>'
        : '';

      $('#cv-tqct-quahan-nhan').hidden = !(kq.viec_qua_han || []).length;
      veDanhSach('#cv-tqct-quahan', (kq.viec_qua_han || []).map(v => {
        const [nam, thang, ngay] = (v.han_chot || '').split('-');
        return { m: 'danger', b: v.tieu_de, s: `${v.nguoi_nhan_ten} · ${v.bo_phan}`, t: `Hạn ${ngay}/${thang}/${nam}` };
      }));
    } catch { /* im lặng — không chặn phần còn lại của trang */ }
  }

  window.LAM_MOI_CONGVIEC = lamMoiCacManLienQuanCv;
  await taiLai();
  await taiLaiTongQuanCongTy();
}

/* ==========================================================================
   LỊCH SỬ LÀM VIỆC — kho lưu trữ TOÀN CỤC mọi việc trong Trạm Mục Tiêu, của
   TẤT CẢ mọi người chứ không riêng người xem (Sếp Ngọc yêu cầu 21/08/2026:
   "lưu trữ lại quá trình làm việc của nhân sự, ai làm gì, xong task gì như
   nào").

   GỘP 29/08/2026 — Sếp Ngọc nhắc HAI LẦN: "gộp vào lịch sử làm việc đi".
   Ba tab bên Trạm Mục Tiêu (Việc cần làm · Việc phối hợp · Việc tôi giao) +
   dải "Đây chỉ là việc của bạn" + nút "Xem việc toàn công ty →" đã chuyển hết
   về đây, thành MỘT màn có bộ lọc bốn phạm vi:
       Việc của tôi · Tôi phối hợp · Tôi giao · Toàn công ty
   Nên màn này KHÔNG còn "chỉ đọc" nữa: ba phạm vi đầu là nơi LÀM VIỆC thật
   (Bắt đầu làm · Nộp kết quả · Duyệt xong · Trả lại · Sửa · Huỷ · ✓ Xong).
   Sau bản này toàn ERP còn HAI chỗ hiện việc: khối "Việc của tôi hôm nay"
   (exception-first, mở ERP là thấy) và màn này (danh sách đầy đủ + tra cứu).

   HAI NGUỒN, MỘT BẢNG — và đó là chủ ý, không phải bỏ dở:
     · ba phạm vi CỦA TÔI đọc `cvDanhSach` (máy chủ lọc sẵn theo người gọi)
     · 'Toàn công ty' đọc `cvLichSu` (có con trỏ trang `truoc=`)
   Cả hai trả CÙNG bộ cột (`CV_COT` trong src/index.js) nên dùng chung đúng
   một hàm vẽ dòng. QUYỀN KHÔNG ĐỔI MỘT DÒNG NÀO: cửa vẫn ở máy chủ y như
   trước — `cvDanhSach` chỉ trả việc của chính người gọi, `cvLichSu` đòi tab
   `lichsuviec`, `cvTongQuanCongTy` (khối tổng hợp bên Trạm Mục Tiêu) đòi
   Admin. Đây là GỘP MÀN HÌNH, không phải mở quyền.
   ========================================================================== */
async function khoiDongLichSuViec() {
  let DS_LSCV = [];
  /* Phạm vi đang xem. Mặc định 'toi': người mở ERP mỗi sáng cần thấy việc của
     mình trước, không phải sổ tra cứu toàn công ty. */
  let LOC_LSV = 'toi';

  const NHAN_LOC = {
    toi:     { trong: 'Chưa ai giao việc gì cho Sếp/bạn cả.',   nut: 'toi' },
    phoihop: { trong: 'Chưa được mời phối hợp việc nào.',        nut: null },
    giao:    { trong: 'Sếp/bạn chưa giao việc nào.',             nut: 'giao' },
    congty:  { trong: 'Không tìm thấy việc nào khớp.',           nut: null }
  };

  /* Nguồn dữ liệu + nhãn cắt của phạm vi đang xem. `cvDanhSach` đã được
     `khoiDongCongViec` gọi và cất vào `window.CV_DU_LIEU_CUA_TOI` — KHÔNG gọi
     lại lần hai ở đây. Vai nào không có quyền `congviec` thì không có mô-đun
     đó, ba phạm vi kia rỗng và màn vẫn chạy ở mức suy giảm, không ném lỗi. */
  function nguonLoc() {
    if (LOC_LSV === 'congty') return { ds: DS_LSCV, cat: null };
    const d = window.CV_DU_LIEU_CUA_TOI || {};
    if (LOC_LSV === 'phoihop') return { ds: d.phoi_hop || [], cat: d.cat_phoi_hop };
    if (LOC_LSV === 'giao')    return { ds: d.giao || [],      cat: d.cat_giao };
    return { ds: d.nhan || [], cat: d.cat_nhan };
  }

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
    const { ds: nguon } = nguonLoc();
    const ds = nguon.filter(r =>
      (!locTt || r.trang_thai === locTt) &&
      (!k || boDau(`${r.tieu_de} ${r.nguoi_nhan_ten || ''} ${r.nguoi_giao_ten || ''} ${r.muc_tieu_ten || ''}`).includes(k)));
    /* Nút hành động lấy từ mô-đun Trạm Mục Tiêu (`window.CV_HTML_NUT_DONG`) —
       KHÔNG chép lại luật ở đây, vì chép lại đúng là thứ bản gộp này đi xoá.
       Vai không có quyền `congviec` thì móc nối vắng và cột nút rỗng: màn vẫn
       tra cứu được, chỉ không thao tác — đúng quyền họ vốn có. */
    const kieuNut = NHAN_LOC[LOC_LSV].nut;
    const veNut = kieuNut ? layMocNoi('CV_HTML_NUT_DONG', 'congviec') : null;
    veBang('#ls-cv-bang', ds, r => {
      const tt = CV_TRANG_THAI[r.trang_thai] || CV_TRANG_THAI.moi;
      /* Todo cá nhân (tự giao cho mình) — giữ nguyên nhãn 🙋 và chữ
         "— (của tôi)" ở cột Người giao như bảng "Việc cần làm" cũ. */
      const laTodo = r.nguoi_giao_id === TOI.id && r.nguoi_nhan_id === TOI.id;
      const nut = (kieuNut && typeof veNut === 'function') ? veNut(r, kieuNut) : '';
      /* ĐẦU RA = CỘT RIÊNG (29/08/2026). Bản gộp đầu tiên chôn `dau_ra` thành
         một dòng chữ nhỏ trong ô "Việc"; sai tinh thần MBOs — đầu ra là THƯỚC
         ĐO, phải rà được cả cột bằng mắt chứ không phải đọc từng ô đi tìm.
         Vẽ ĐÚNG MỘT LẦN ở hai chỗ, CSS chọn chỗ nào hiện theo bề ngang:
           · ≥980px → `<td class="cot-daura">` hiện, `.daura-hep` ẩn
           · ≤979px → ngược lại (màn hẹp không đủ chỗ cho 9 cột)
         Không dùng JS đo bề ngang rồi vẽ hai kiểu: thế là hai đường mã cho một
         sự thật, và là chỗ để chúng lệch nhau. */
      const oDauRa = r.dau_ra ? dg(r.dau_ra) : '';
      return `<td><div class="nm">${esc(r.tieu_de)}${laTodo ? ' <span class="tag sage">🙋 Việc của tôi</span>' : ''}</div>` +
          `${oDauRa ? `<div class="sm daura-hep">${oDauRa}</div>` : ''}` +
          `${r.mo_ta ? `<div class="sm">${dg(r.mo_ta)}</div>` : ''}` +
          `${r.phoi_hop_ten ? `<div class="sm">🤝 Phối hợp: ${esc(r.phoi_hop_ten)}</div>` : ''}` +
          `${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${dg(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm cot-daura">${oDauRa || '—'}</td>` +
        `<td class="sm">${esc(r.nguoi_nhan_ten)}</td>` +
        `<td class="sm">${laTodo ? '— (của tôi)' : esc(r.nguoi_giao_ten)}</td>` +
        `<td class="sm">${esc(r.muc_tieu_ten || '—')}</td>` +
        `<td class="sm">${hanChotVN(r.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>` +
        `<td class="sm">${capNhatVN(r.cap_nhat_luc)}</td>` +
        `<td style="white-space:nowrap">${nut}</td>`;
    });
    const oTrong = $('#ls-cv-trong');
    /* BA LÝ DO KHÁC NHAU, BA CÂU KHÁC NHAU. Nói chung một câu là cách chắc
       chắn để Sếp tưởng mất dữ liệu (REV-0048 lỗi #3) hoặc tưởng "chưa ai giao
       việc gì" trong khi thật ra mô-đun Trạm Mục Tiêu vừa chết (lỗi #4 — đúng
       kiểu im lặng REV-0038 đi vá).
       ① MÔ-ĐUN HỎNG: có quyền `congviec` mà `khoiDongCongViec` ném lỗi thì
          `window.CV_DU_LIEU_CUA_TOI` không bao giờ được đặt (nó chỉ gán ở cuối
          `taiLai()` khi đã gọi API xong). Ba phạm vi CỦA TÔI khi đó rỗng vì
          HỎNG, không phải vì trống. Vai KHÔNG có quyền `congviec` cũng rỗng —
          nhưng đó là đúng quyền họ có, nên không báo lỗi cho họ.
       ② CÒN BỘ LỌC: nói THẲNG bộ lọc nào đang bật + nút xoá ngay tại chỗ.
          Đổi phạm vi KHÔNG tự xoá bộ lọc (bộ lọc do người dùng chủ động đặt,
          tự xoá là cướp thao tác của họ) — nhưng phải nói ra, không để im.
       ③ Trống thật. */
    const moDunHong = LOC_LSV !== 'congty' &&
                      TOI.quyen.includes('congviec') && !window.CV_DU_LIEU_CUA_TOI;
    if (moDunHong) {
      oTrong.innerHTML = '<b>Không tải được việc của bạn — đây là LỖI, không phải "chưa ai giao việc gì".</b>' +
        ' Tải lại trang một lần; còn nữa thì báo bộ phận Công nghệ kèm giờ gặp lỗi.';
    } else if (k || locTt) {
      const dangDat = [];
      if (locTt) dangDat.push('Trạng thái: ' + ((CV_TRANG_THAI[locTt] || {}).chu || locTt));
      if (k) dangDat.push('Tìm: "' + ($('#ls-cv-tim').value || '').trim() + '"');
      oTrong.innerHTML = 'Không có việc nào khớp <b>bộ lọc đang đặt</b> (' + esc(dangDat.join(' · ')) +
        '). Dữ liệu vẫn còn nguyên. ' +
        '<button type="button" class="dai-cat-nut" data-lscv-xoaloc>Xoá bộ lọc</button>';
    } else {
      oTrong.textContent = NHAN_LOC[LOC_LSV].trong;
    }
    oTrong.hidden = ds.length > 0;
    veDaiCatLsCv();
  }

  /* Nút "Xoá bộ lọc" của câu ② ở trên. Uỷ quyền trên vùng cha vì `oTrong` bị
     vẽ lại mỗi lần lọc — gắn thẳng vào nút là gắn vào phần tử sắp bị thay. */
  $('#ls-cv-trong').addEventListener('click', (e) => {
    if (!e.target.closest('[data-lscv-xoaloc]')) return;
    const oTim = $('#ls-cv-tim'), oLoc = $('#ls-cv-loctt');
    if (oLoc) oLoc.value = '';
    if (oTim) oTim.value = '';
    veBangLsCv();
  });

  /* CON TRỎ trang — chuỗi `cap_nhat_luc|id` của dòng cuối đã tải. `null` =
     không còn gì cũ hơn. Xem src/index.js cvLichSu. */
  let TRUOC_LSCV = null;
  let TONG_LSCV = null;   // tổng thật của cả bảng cong_viec (chỉ có khi bị cắt)

  /* Dải cắt của màn này — ĐÂY LÀ CHỖ CÁC DẢI KHÁC CHỈ NGƯỜI SANG, nên câu chữ
     ở đây phải đúng sự thật đến từng chữ (REV-0034 · L2).
     BẢN CŨ NÓI DỐI: *"dùng ô tìm kiếm phía trên để lọc đúng việc cần xem"* —
     `#ls-cv-tim` lọc trên `DS_LSCV`, tức đúng những dòng ĐÃ TẢI, nó không hề
     hỏi lại máy chủ (xem `veBangLsCv` ngay trên). Chỉ người ta đi tìm ở chỗ
     không có thì tệ hơn là không chỉ gì cả.
     BẢN NÀY: nói đúng giới hạn của ô tìm + cho một đường đi CÓ THẬT (nút gọi
     lại API kèm `?truoc=`, tải tiếp 500 việc cũ hơn từ MÁY CHỦ). */
  function veDaiCatLsCv() {
    /* BA PHẠM VI CỦA TÔI — dải cắt do `cvDanhSach` trả về (`cat_nhan` /
       `cat_phoi_hop` / `cat_giao`, trần 300 mỗi loại). Trước bản gộp mỗi bảng
       có dải riêng chỉ sang "Lịch sử làm việc"; giờ CHÍNH LÀ chỗ đó, nên đường
       đi tiếp là đổi sang phạm vi 'Toàn công ty' — nơi có phân trang thật. */
    if (LOC_LSV !== 'congty') {
      const { cat } = nguonLoc();
      return veDaiCat('#ls-cv-cat', cat, {
        don_vi: 'việc',
        goi_y: 'Ô tìm kiếm phía trên chỉ tìm trong phần ĐÃ TẢI về máy.',
        nut: { chu: 'Xem đầy đủ ở phạm vi "Toàn công ty"', chay: () => doiLoc('congty') }
      });
    }
    if (TRUOC_LSCV === null && TONG_LSCV === null) return veDaiCat('#ls-cv-cat', null);
    const conLai = TONG_LSCV != null ? Math.max(0, TONG_LSCV - DS_LSCV.length) : null;
    veDaiCat('#ls-cv-cat', { gioi_han: DS_LSCV.length, tong: TONG_LSCV }, {
      don_vi: 'việc',
      goi_y: 'Ô tìm kiếm phía trên chỉ tìm trong phần ĐÃ TẢI về máy.',
      nut: {
        chu: conLai != null ? `Tải thêm ${Math.min(500, conLai)} việc cũ hơn` : 'Tải thêm việc cũ hơn',
        chay: async (b) => {
          b.disabled = true; b.textContent = 'Đang tải…';
          await taiLaiLichSuCv({ them: true });
        }
      }
    });
  }

  async function taiLaiLichSuCv({ them = false } = {}) {
    try {
      const kq = await API.cvLichSu(them ? TRUOC_LSCV : null);
      DS_LSCV = them ? DS_LSCV.concat(kq.viec || []) : (kq.viec || []);
      TRUOC_LSCV = kq.truoc_tiep || null;
      if (kq.cat && Number.isFinite(kq.cat.tong)) TONG_LSCV = kq.cat.tong;
      else if (!them) TONG_LSCV = null;
      // Tải hết rồi thì dải biến mất — không còn gì để nói nữa.
      if (!TRUOC_LSCV) TONG_LSCV = null;
    } catch {
      // Mạng hỏng giữa chừng: `veBangLsCv` bên dưới vẽ lại dải nên nút "Tải
      // thêm" trở về bấm được, không kẹt ở "Đang tải…" — kẹt im lặng cũng là
      // một kiểu nói dối.
    }
    veBangLsCv();
  }

  /* Đổi phạm vi. Ba phạm vi CỦA TÔI dùng dữ liệu `khoiDongCongViec` đã nạp —
     không gọi mạng. 'Toàn công ty' chỉ gọi `cvLichSu` LẦN ĐẦU vào phạm vi đó:
     người chỉ làm việc của mình không phải tải 500 dòng việc người khác. */
  async function doiLoc(loc) {
    if (!NHAN_LOC[loc]) return;
    LOC_LSV = loc;
    document.querySelectorAll('#lsv-loc .seg-nut').forEach(b =>
      b.classList.toggle('active', b.dataset.lsv === loc));
    if (loc === 'congty' && DS_LSCV.length === 0 && TRUOC_LSCV === null) await taiLaiLichSuCv();
    else veBangLsCv();
  }
  $('#lsv-loc').addEventListener('click', (e) => {
    const nut = e.target.closest('.seg-nut');
    if (nut) doiLoc(nut.dataset.lsv);
  });

  /* Nút trên từng dòng — uỷ quyền cho `xuLyNut` của mô-đun Trạm Mục Tiêu.
     `goiMocNoi` chứ không `?.`: mô-đun đó chết lúc khởi động thì phải HÉT LÊN,
     không được biến cú bấm thành "không làm gì cả" (bài học REV-0038 · L3 —
     Sếp Ngọc bấm mãi vào một cái nút đã chết mà console thì im). */
  $('#ls-cv-bang').addEventListener('click', (e) => {
    if (!e.target.closest('button[data-cv-batdau],button[data-cv-nop],button[data-cv-xongngay],' +
                          'button[data-cv-duyet],button[data-cv-tralai],button[data-cv-sua],button[data-cv-huy]')) return;
    goiMocNoi('CV_XU_LY_NUT', 'congviec', e);
  });

  await veBangLsCv();
  /* UI STATE CONSISTENCY: mọi màn khác đổi cong_viec gọi hàm này để màn gộp
     khớp dữ liệu mới nhất, không bắt F5 (bug thật 23/08/2026). Chỉ tải lại
     `cvLichSu` khi ĐANG xem 'Toàn công ty' hoặc đã từng tải nó — ba phạm vi
     kia đọc `window.CV_DU_LIEU_CUA_TOI` mà `lamMoiCacManLienQuanCv` vừa làm
     mới ngay trước đó, nên vẽ lại là đủ và không tốn thêm lượt gọi nào. */
  window.LAM_MOI_LICHSU_VIEC = async (o) => {
    if (LOC_LSV === 'congty' || DS_LSCV.length > 0) return taiLaiLichSuCv(o);
    veBangLsCv();
  };

  /* ĐƯỜNG DẪN CŨ — GIỮ NGUYÊN TÊN. Hai móc nối này là chỗ phần còn lại của
     ERP gọi sang; đổi tên là làm vỡ đúng những chỗ đó.
     · MO_DEN_LICHSU_TIM(tuKhoa) — Admin/Manager bấm một dòng quá hạn của
       NGƯỜI KHÁC ở khối tóm tắt: phải sang phạm vi 'Toàn công ty'.
     · MO_MAN_VIEC(loc, rowId)   — thay đường cũ MO_DEN_VIEC_CUA_TOI: khối
       "Việc của tôi hôm nay" và các thẻ đếm bấm vào phải rơi đúng phạm vi,
       đúng dòng, và dòng đó phải SÁNG LÊN (`.canh-bao`) như trước. */
  window.MO_DEN_LICHSU_TIM = async (tuKhoa) => {
    moTab('lichsuviec');
    await doiLoc('congty');
    const oTim = $('#ls-cv-tim'), oLoc = $('#ls-cv-loctt');
    if (oLoc) oLoc.value = '';
    if (oTim) { oTim.value = tuKhoa || ''; oTim.dispatchEvent(new Event('input', { bubbles: true })); oTim.focus(); }
    requestAnimationFrame(() => { const b = $('#ls-cv-bang'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  };

  window.MO_MAN_VIEC = async (loc, rowId) => {
    moTab('lichsuviec');
    const oTim = $('#ls-cv-tim'), oLoc = $('#ls-cv-loctt');
    // Bộ lọc còn sót từ lần trước là lý do kinh điển khiến "bấm vào không
    // thấy đâu cả" — xoá trước khi nhảy.
    if (oTim) oTim.value = '';
    if (oLoc) oLoc.value = '';
    await doiLoc(loc || 'toi');
    requestAnimationFrame(() => {
      const box = $('#lsv-loc');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (rowId != null) {
        const tr = document.querySelector(`#ls-cv-bang tr[data-id="${rowId}"]`);
        if (tr) { tr.scrollIntoView({ behavior: 'smooth', block: 'center' }); tr.classList.add('canh-bao'); setTimeout(() => tr.classList.remove('canh-bao'), 2500); }
      }
    });
  };

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
        dauTen = $('#cnbDauTen'), dauPhu = $('#cnbDauPhu'),
        dsEl = $('#cnbDs'), nutCuHon = $('#chat-cu-hon'), formNhap = $('#chat-form');
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
  /* Lượt đo ĐẦU TIÊN chỉ để lấy mốc, không được coi là "có tin mới" — không có
     cờ này thì vừa nạp trang là máy kêu vì mấy tin cũ từ hôm qua. */
  let daLayMocDau = false;

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

  /* Cửa sổ chat có HAI màn: 'ds' = danh sách hội thoại, 'luong' = một đoạn
     chat cụ thể. Trước bản này chỉ có màn 'luong' và luôn mở thẳng vào Kênh
     chung — muốn nhắn riêng ai phải đóng cửa sổ, sang tab Danh bạ, tìm người,
     bấm "Chat ngay". Nút "←" nay nghĩa là VỀ DANH SÁCH (chứ không phải "về
     kênh chung"), giống mọi ứng dụng nhắn tin người ta đã quen. */
  let man = 'ds';

  function veManHinh() {
    const laDs = man === 'ds';
    dsEl.hidden = !laDs;
    khung.hidden = laDs;
    formNhap.hidden = laDs;
    nutLui.hidden = laDs;
    if (laDs) {
      dauTen.textContent = '💬 Chat nội bộ';
      dauPhu.textContent = 'Chọn một cuộc trò chuyện';
    } else if (nguoiNhanHienTai) {
      dauTen.textContent = '💬 ' + nguoiNhanHienTai.ten;
      dauPhu.textContent = 'Chat riêng';
    } else {
      dauTen.textContent = '💬 Kênh chung';
      dauPhu.textContent = 'Cả công ty đọc được';
    }
  }
  const veTieuDe = veManHinh;   // tên cũ còn được gọi vài chỗ — giữ cho khỏi vỡ

  function tomTat(t) {
    const s = (t.tin_cuoi || '').trim();
    if (s) return s.length > 46 ? s.slice(0, 45) + '…' : s;
    return t.tep_cuoi ? '📎 ' + t.tep_cuoi : 'Chưa có tin nhắn';
  }

  /* Một dòng hội thoại = một mục bấm được cao TỐI THIỂU 56px (thẻ .cnb-ds-muc
     đặt min-height trong style.css). Kho vận bấm bằng ngón cái khi đang bê
     hàng — dưới 44px là bấm trượt, đây là chỗ bấm nhiều nhất của cả cửa sổ. */
  function veDanhSach(kenhChung, ganDay, cat) {
    const huy = n => (n > 0 ? `<span class="cnb-ds-dem">${n > 99 ? '99+' : n}</span>` : '');
    const dong = (id, vt, ten, phu, gio, chuaDocN) =>
      `<button type="button" class="cnb-ds-muc" data-mo="${esc(id)}" data-ten="${esc(ten)}" data-vt="${esc(vt)}">` +
        `<span class="cnb-ds-avt">${esc(vt)}</span>` +
        `<span class="cnb-ds-giua">` +
          `<span class="cnb-ds-ten">${esc(ten)}</span>` +
          `<span class="cnb-ds-phu">${esc(phu)}</span>` +
        `</span>` +
        `<span class="cnb-ds-phai"><span class="cnb-ds-gio">${esc(gio)}</span>${huy(chuaDocN)}</span>` +
      `</button>`;

    const kc = kenhChung || {};
    let html = dong('__chung__', '🏠', 'Kênh chung',
      kc.tin_cuoi || kc.tep_cuoi ? `${kc.ten_cuoi ? kc.ten_cuoi + ': ' : ''}${tomTat(kc)}` : 'Chưa có tin nhắn',
      gioChat(kc.luc_cuoi), Number(kc.chua_doc || 0));

    html += (ganDay || []).map(p =>
      dong(p.id, p.viet_tat, p.ho_ten,
        (p.gui_cuoi === TOI.id ? 'Bạn: ' : '') + tomTat(p),
        gioChat(p.luc_cuoi), Number(p.chua_doc || 0))).join('');

    /* Danh sách hội thoại bị cắt thì PHẢI NÓI RA — 23 nhân sự, trần 20, tức
       vết cắt có thật ngay hôm nay. Không nói ra thì một người từng nhắn cho
       Sếp biến mất khỏi cửa sổ mà Sếp không biết là mình đang thiếu ai.
       Dùng đúng dải `.dai-cat` như mọi màn khác, và chỉ ra đường đi tiếp. */
    if (cat) {
      const con = Number.isFinite(cat.tong) ? Math.max(0, cat.tong - cat.gioi_han) : null;
      html += `<p class="dai-cat cnb-ds-cat"><span class="dai-cat-chu">✂️ Đang hiện ` +
        `<b>${cat.gioi_han}</b> cuộc trò chuyện gần nhất` +
        (con != null ? ` trong tổng <b>${cat.tong}</b> — còn <b>${con}</b> người nữa chưa hiện` :
                       ` — danh sách này <b>đã bị cắt bớt</b>, còn nữa`) +
        `. Tìm người đó trong Danh bạ rồi bấm "Chat ngay".</span></p>`;
    }

    dsEl.innerHTML = html;
  }

  dsEl.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mo]');
    if (!m) return;
    e.stopPropagation();
    const id = m.getAttribute('data-mo');
    if (id === '__chung__') moLuong(null);
    else moLuong({ id, ten: m.getAttribute('data-ten'), viet_tat: m.getAttribute('data-vt') });
  });

  /* Vào một luồng. `null` = kênh chung. Đây là ĐƯỜNG DUY NHẤT để đổi luồng —
     nút "Chat ngay" ở Danh bạ, bong bóng gần đây, bấm thông báo đẩy và danh
     sách hội thoại đều gọi vào đây, nên chỉ có MỘT chỗ phải đúng. */
  async function moLuong(nguoi) {
    nguoiNhanHienTai = nguoi;
    man = 'luong';
    veManHinh();
    $('#chat-loi').textContent = '';
    try { await taiLanDau(); }
    catch (e) { $('#chat-loi').textContent = e?.message || 'Không tải được tin nhắn, thử lại nhé.'; }
    setTimeout(() => $('#chat-noidung')?.focus(), 60);
  }

  async function veDs() {
    man = 'ds';
    nguoiNhanHienTai = null;
    veManHinh();
    await taiDanhSachHoiThoai();
  }

  /* MỘT chỗ duy nhất trong toàn ERP được phép đổi số chưa đọc — cả huy hiệu
     tròn trong trang LẪN số đỏ trên biểu tượng thanh tác vụ (Sếp Ngọc
     29/08/2026: "để không bị miss tin nhắn"). Hai con số lấy từ CÙNG một hàm
     `soDoHienThi`, nên không có đường nào để chúng đá nhau.
     KHÔNG gọi `setAppBadge` ở bất kỳ chỗ nào khác trong `app.js` — thêm chỗ
     thứ hai là dựng cơ chế đếm thứ hai. Xem `so-do-bieu-tuong.js` luật ①. */
  function veBadge() {
    const so = soDoHienThi(chuaDoc, dangMo);
    const chu = chuHuyHieu(so);
    if (chu) { badge.textContent = chu; badge.hidden = false; }
    else badge.hidden = true;
    // Máy chưa cài ERP / Firefox / Safari: `datSoDo` trả {lam:false}, im lặng.
    datSoDo(so);
  }

  /* Giữ nguyên MẢNG tin đang hiển thị, không chỉ các thẻ DOM. Cần thế vì
     "Xem tin cũ hơn" CHÈN LÊN ĐẦU, mà việc gộp cụm kiểu Messenger
     (`nguoiGuiTruoc`/`taoLucTruoc`) tính TUẦN TỰ từ trên xuống — chèn lên đầu
     mà không dựng lại thì cụm đầu tiên gộp sai (mất avatar hoặc lặp avatar).
     Dựng lại 100–150 thẻ là việc dưới một khung hình; đổi lấy một quy tắc gộp
     luôn đúng thì rẻ. */
  let dsTin = [];
  let conTinCu = false;

  function veLaiTinNhan() {
    khung.querySelectorAll('.chat-tin').forEach(el => el.remove());   // giữ lại #chat-trong và nút "cũ hơn"
    nguoiGuiTruoc = null; taoLucTruoc = null;
    dsTin.forEach(t => themTin(t));
    nutCuHon.hidden = !conTinCu;
    $('#chat-trong').hidden = dsTin.length > 0;
  }

  // Tải lại từ đầu — dùng khi mở popup lần đầu HOẶC vừa đổi cuộc trò chuyện
  async function taiLanDau() {
    idCuoi = 0;
    const { tin_nhan, con_nua } = await API.chatDanhSach(null, nguoiNhanHienTai?.id, dongDauDuoc());
    dsTin = tin_nhan || [];
    conTinCu = !!con_nua;
    veLaiTinNhan();
    cuoiTrang();
  }

  /* "Xem tin cũ hơn" — con trỏ lùi `truoc_id` = id tin CŨ NHẤT đang có.
     Giữ nguyên chỗ đang đọc: đo chiều cao trước/sau rồi bù vào scrollTop, nếu
     không thì màn hình nhảy vọt lên đầu và người ta mất dấu chỗ đang đọc. */
  let dangTaiCu = false;
  async function taiTinCuHon() {
    if (dangTaiCu || !conTinCu || !dsTin.length) return;
    dangTaiCu = true;
    nutCuHon.disabled = true;
    const chuTruoc = nutCuHon.textContent;
    nutCuHon.textContent = 'Đang tải…';
    const caoTruoc = khung.scrollHeight, cuonTruoc = khung.scrollTop;
    try {
      const { tin_nhan, con_nua } =
        await API.chatDanhSach(null, nguoiNhanHienTai?.id, false, dsTin[0].id);
      dsTin = [...(tin_nhan || []), ...dsTin];
      conTinCu = !!con_nua;
      veLaiTinNhan();
      khung.scrollTop = cuonTruoc + (khung.scrollHeight - caoTruoc);
    } catch (e) {
      // Hỏng thì PHẢI nói ra. Nuốt lặng ở đây là đúng lỗi đã giết chat hôm nay.
      $('#chat-loi').textContent = e?.message || 'Không tải được tin cũ hơn, thử lại nhé.';
    } finally {
      dangTaiCu = false;
      nutCuHon.disabled = false;
      nutCuHon.textContent = chuTruoc;
    }
  }
  nutCuHon.addEventListener('click', (e) => { e.stopPropagation(); taiTinCuHon(); });

  /* ---- REV-0031 Việc 2 — TẮT NHỊP TIM KHI KHÔNG CÓ AI NGỒI ĐÓ -----------
     Ba chốt nằm ở `nhip-tim-chat.js` (hàm thuần, bàn thử đo thẳng vào đó):
     tab ẩn / ngồi không quá 5 phút → dừng hẳn vòng lặp; ngoài giờ làm → vẫn
     hỏi tin nhưng KHÔNG đóng dấu (không ghi D1). Trước bản này không có
     `clearInterval` nào: một máy bàn ở kho bỏ quên qua 3 ngày nghỉ ghi 43.200
     dòng, trong khi cả hệ thống chỉ được 100.000 dòng/ngày. */
  let hoatDongLuc = Date.now();          // lần cuối có người thật chạm vào máy
  let nhipTin = null;
  let daKhoiDongNhip = false;            // chưa tải xong lần đầu thì đừng hỏi chen ngang

  const doHoatDong = () => {
    const nghi = !nhipTin;               // đang ngủ mà có người chạm → dậy ngay
    hoatDongLuc = Date.now();
    if (nghi && daKhoiDongNhip) batNhipTin();
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(
    (sk) => window.addEventListener(sk, doHoatDong, { passive: true }));

  function trangThaiNhip() {
    return {
      dangMo,
      tabHien: document.visibilityState !== 'hidden',
      hoatDongCachDay: Date.now() - hoatDongLuc
    };
  }
  /** Cờ `dang_mo` gửi lên máy chủ — chỉ bật khi THẬT SỰ có người đang xem. */
  function dongDauDuoc() { return nenDongDau(trangThaiNhip()); }

  function batNhipTin() {
    if (nhipTin) return;
    nhipTin = setInterval(nhipMotLuot, 6000);
    hoiTinMoi();                          // dậy là hỏi ngay, không đợi 6 giây
  }
  function tatNhipTin() { clearInterval(nhipTin); nhipTin = null; }

  /** Mỗi nhịp tự hỏi lại xem còn được chạy không — hết điều kiện thì tự tắt. */
  function nhipMotLuot() {
    if (!nenChayVongLap(trangThaiNhip())) { tatNhipTin(); return; }
    hoiTinMoi();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') tatNhipTin();
    else doHoatDong();
  });

  /* CỐ Ý CHỈ TẮT `hoiTinMoi`, KHÔNG tắt `hoiChuaDocToanCuc`:
     · `hoiTinMoi` là hàm DUY NHẤT mang cờ `dang_mo` — tức là hàm duy nhất
       làm máy chủ GHI. Tắt nó là tắt trọn vẹn nguồn tốn hạn mức.
     · `hoiChuaDocToanCuc` là SELECT thuần (Hồ Ly đo: `SEARCH … USING INTEGER
       PRIMARY KEY (rowid>?)`, ~0 dòng đọc mỗi lượt) VÀ nó chính là chỗ dựng
       thông báo hệ thống khi tab đang ẩn. Tắt theo cho "gọn" là giết mất lớp
       ② của CTL-0014 — đúng nỗi đau gốc của chị Lan. */

  async function hoiTinMoi() {
    try {
      /* Cờ thứ ba = "cửa sổ chat đang THẬT SỰ mở". Máy chủ đóng dấu mốc này để
         không đẩy thông báo lên điện thoại của người đang ngồi đọc đúng đoạn
         chat đó (CTL-0014). Vòng hỏi lại vẫn chạy khi popup đã đóng — truyền
         cờ ở mọi lượt là chốt chặn luôn bật và không ai nhận được gì. */
      const { tin_nhan } = await API.chatDanhSach(idCuoi, nguoiNhanHienTai?.id, dongDauDuoc());
      if (tin_nhan.length) {
        const oDay = khung.scrollHeight - khung.scrollTop - khung.clientHeight < 80;
        dsTin = [...dsTin, ...tin_nhan];   // giữ mảng khớp DOM, không thì "Xem tin cũ hơn" tính sai con trỏ
        tin_nhan.forEach(t => themTin(t));
        $('#chat-trong').hidden = true;
        if (oDay) cuoiTrang();   // chỉ tự cuộn nếu đang xem gần cuối, khỏi giật khi đọc tin cũ

        /* Tin của NGƯỜI KHÁC rơi vào đúng cửa sổ đang mở: chỉ TIẾNG KHẼ, không
           thông báo hệ thống. Người ta đang nhìn thẳng vào nó rồi.
           Tin của CHÍNH MÌNH thì im hoàn toàn — không ai muốn máy kêu vì chính
           mình vừa bấm Gửi. */
        if (dangMo && tin_nhan.some(t => t.nguoi_gui_id !== TOI.id)) TBDay.am(false);
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
      if (so_luong > chuaDocTruoc) {
        taiDanhSachHoiThoai();   // có thêm tin mới -> làm mới danh sách hội thoại
        /* CTL-0014 — số đỏ này vốn nhảy lên HOÀN TOÀN IM LẶNG; đó chính là
           điều chị Lan báo thiếu. Chỉ kêu khi cửa sổ chat ĐANG ĐÓNG (mở thì
           `hoiTinMoi` đã kêu khẽ rồi — không kêu hai lần cho một tin), và chỉ
           khi đã qua lượt đo đầu tiên (`chuaDocTruoc > 0` hoặc đã có mốc), để
           lịch sử cũ lúc vừa nạp trang không bị coi là tin mới. */
        if (!dangMo && daLayMocDau) {
          TBDay.am(true);
          TBDay.rung();
          // Tab đang ẩn (người dùng đang ở app khác) → dựng cả thông báo hệ thống.
          if (document.visibilityState === 'hidden') {
            TBDay.hienTaiCho('💬 Tin nhắn mới', 'Bạn có tin nhắn nội bộ chưa đọc');
          }
        }
      }
      daLayMocDau = true;
      chuaDocTruoc = so_luong;
      // Đang mở popup = đang đọc hết -> badge 0. Đóng thì hiện đúng số chưa đọc.
      chuaDoc = dangMo ? 0 : so_luong;
      veBadge();
    } catch { /* mất mạng tạm thời — bỏ qua, đợt hỏi sau tự thử lại */ }
  }

  /* Tải danh sách hội thoại (kênh chung + các chat riêng gần đây) và vẽ vào
     cửa sổ. Trước 29/08/2026 một lượt gọi này nuôi HAI chỗ — danh sách trong
     cửa sổ và cột bong bóng nổi cạnh nút chính; cột bong bóng đã BỎ HẲN nên
     nay chỉ còn một nơi tiêu thụ, tên hàm đổi theo cho khỏi nói dối. */
  async function taiDanhSachHoiThoai() {
    try {
      const { gan_day, kenh_chung, cat } = await API.chatGanDay();
      veDanhSach(kenh_chung, gan_day, cat);
    } catch { /* mất mạng tạm thời — bỏ qua, đợt hỏi sau tự thử lại */ }
  }

  /* ⚠️ KHÔNG gọi mạng ở chỗ này. Ba lệnh `await` khởi động (taiLanDau /
     hoiChuaDocToanCuc / taiDanhSachHoiThoai) đã DỜI XUỐNG CUỐI hàm và bọc try/catch.
     Vì sao: chúng từng đứng đúng đây, TRƯỚC đoạn gắn sự kiện và trước
     `window.moChatVoi = …` ở dưới. Chỉ cần MỘT lượt 500 thoáng qua của
     `/api/chat/tin-nhan` lúc mở trang là `taiLanDau()` ném, cả hàm chết giữa
     chừng: `window.moChatVoi` không bao giờ được gán, nút chat nổi cũng không
     có sự kiện — chat CHẾT tới khi F5, mà màn hình im re.
     ĐO ĐƯỢC 29/08/2026: `node scripts/do-chat-noibo.mjs --hong-lan-dau`
     → bấm 4 nút, mở 0. LUẬT: DÂY NỐI TRƯỚC, MẠNG SAU. */

  /* ==== CTL-0014 · Thông báo tin nhắn — giao diện ========================
     Ba việc: (1) nút 🔔 mở bảng cài đặt, (2) dải mời bật quyền xuất hiện
     ĐÚNG LÚC, (3) bấm vào thông báo thì mở đúng cửa sổ chat. */
  const nutChuong = $('#cnbChuong'), bangCaiDat = $('#tbdCaiDat'),
        oChatBat = $('#tbdChatBat'), chuTrangThai = $('#tbdTrangThai'),
        nutTatMay = $('#tbdTatMay'),
        daiMoi = $('#tbdMoi'), chuMoi = $('#tbdMoiChu'),
        nutBat = $('#tbdBat'), nutDeSau = $('#tbdDeSau');

  /* REV-0028 H2 — MỘT đường vẽ duy nhất cho MỌI trạng thái, và nó chạy mà
     KHÔNG cần ai bấm nút 🔔. Trước bản vá, câu chữ hướng dẫn iPhone / bị Chặn
     có đủ nhưng nằm trong bảng `hidden`, còn nút 🔔 thì không đổi hình — người
     điếc không hề biết mình điếc. Quyết định trạng thái nằm ở
     `tbd-trangthai.js` (bàn thử đo thẳng vào đó). */
  function veTrangThaiTB() {
    if (oChatBat) oChatBat.checked = !TBDay.chatTat;
    const tt = tinhTrangThaiTB(TBDay.doTrangThai());
    veGiaoDienTB(
      { nutChuong, chuTrangThai, nutTatMay, daiMoi, chuMoi, nutBat, nutDeSau,
        /* REV-0031 Việc 3 — hai phần tử NGOÀI `#cnbPopup`: đây là thứ duy
           nhất người đang điếc thấy được mà không bấm gì. */
        dauTB: $('#cnbDauTB'), nutNoi: $('#cnbNut') },
      tt,
      { daHoan: TBDay.dangHoan() }
    );
    return tt;
  }

  /* Mời bật QUYỀN — chỉ gọi SAU khi người dùng vừa gửi hoặc vừa mở một tin
     nhắn. KHÔNG bao giờ gọi lúc vừa mở ERP: hỏi sai lúc là bị bấm Chặn, và
     trình duyệt KHÔNG cho hỏi lại lần thứ hai — mất vĩnh viễn, không sửa được.
     Còn DẢI TRẠNG THÁI (iPhone chưa cài / bị Chặn / máy chủ chưa bật) thì
     `veTrangThaiTB()` ở trên đã hiện sẵn, không đợi ai mời. */
  function moiBatNeuNen() {
    const tt = veTrangThaiTB();
    // Chỉ ca "chua_bat" mới đi tiếp tới việc hỏi quyền; các ca khác dải đã hiện.
    if (!daiMoi || !hoanDuoc(tt.ma)) return;
    if (!TBDay.nenMoiBat() || !TBDay.hoiQuyenDuoc()) return;
    daiMoi.hidden = false;   // `nenMoiBat()` đã tự tôn trọng hoãn "Để sau" 7/30 ngày
  }

  nutChuong?.addEventListener('click', (e) => {
    e.stopPropagation();
    bangCaiDat.hidden = !bangCaiDat.hidden;
    if (!bangCaiDat.hidden) veTrangThaiTB();
  });

  nutDeSau?.addEventListener('click', (e) => {
    e.stopPropagation();
    TBDay.hoanLai(7);        // im 7 ngày, không hỏi lại mỗi lần gửi tin
    daiMoi.hidden = true;
  });

  nutBat?.addEventListener('click', async (e) => {
    e.stopPropagation();
    nutBat.disabled = true;
    try {
      // Gọi requestPermission TRONG cú bấm — ngoài cú bấm là Safari từ chối.
      const cho = await Notification.requestPermission();
      if (cho === 'granted') {
        await TBDay.dangKyDay();
        TBDay.am(false);      // vừa xin quyền vừa mở khoá âm thanh trên iOS
      } else {
        TBDay.hoanLai(30);
      }
    } catch { /* trình duyệt cũ */ }
    finally {
      nutBat.disabled = false;
      daiMoi.hidden = true;
      veTrangThaiTB();
    }
  });

  oChatBat?.addEventListener('change', async () => {
    const tat = oChatBat.checked ? 0 : 1;
    try {
      await API.pushTuyChon(tat);
      TBDay.chatTat = tat;
      if (!tat && TBDay.daChoQuyen()) await TBDay.dangKyDay();
    } catch { oChatBat.checked = !TBDay.chatTat; }
    veTrangThaiTB();
  });

  nutTatMay?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await TBDay.huyDayMayNay();
    veTrangThaiTB();
  });

  bangCaiDat?.addEventListener('click', (e) => e.stopPropagation());
  daiMoi?.addEventListener('click', (e) => e.stopPropagation());

  /* REV-0028 M3 — mở ĐÚNG đoạn chat của người vừa nhắn. Thông báo cố ý không
     kèm nội dung tin, nên cú bấm bắt buộc phải tới đúng nơi; đổ về kênh chung
     rồi bắt tự đi tìm là vứt mất nửa giá trị của thông báo.
     Tên người gửi lấy từ chính gói tin (đã hiện trên màn hình khoá, không lộ
     thêm gì); không có thì tra trong danh sách chat gần đây. */
  async function moChatTheoId(id, tenGoiY) {
    if (!id || String(id) === String(TOI.id)) { moPopup(); veDs(); return; }
    let ten = tenGoiY || '', vt = '';
    try {
      const { gan_day } = await API.chatGanDay();
      const p = (gan_day || []).find(x => String(x.id) === String(id));
      if (p) { ten = p.ho_ten; vt = p.viet_tat; }
    } catch { /* mất mạng — dùng tên trong gói tin */ }
    if (!ten) { moPopup(); veDs(); return; }   // không biết là ai thì mở danh sách hội thoại
    if (!vt) vt = ten.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
    /* REV-0038 · L3 — ĐÂY là chỗ vá nửa lớp lần trước: chỗ "Chat ngay" ở Danh
       bạ đã bỏ `?.` rồi, còn đường "BẤM THÔNG BÁO ĐẨY" thì vẫn giữ nguyên.
       Hai đường gọi CÙNG một hàm `window.moChatVoi`; nếu `khoiDongChat()` chết
       lần nữa thì đường này lại im lặng y hệt lần trước. Móc nối này được gán
       ở CUỐI `khoiDongChat()`, sau chỗ gắn sự kiện — nên nó vắng mặt là dấu
       hiệu thật của khởi động hỏng, không phải chuyện thường. */
    goiMocNoi('moChatVoi', 'chat', id, ten, vt);
  }

  /** '/app.html#chat=NS-DUY' → 'NS-DUY'. Dùng cho cả hai đường: tab đang mở
   *  (postMessage) và mở nguội (openWindow rồi đọc hash). */
  function idTuDuongDan(duongDan) {
    const m = String(duongDan || '').match(/#chat=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* Bấm vào thông báo trên màn hình khoá khi ERP đang mở sẵn: service worker
     nhắn về đây để bật đúng cửa sổ chat. */
  navigator.serviceWorker?.addEventListener?.('message', (ev) => {
    if (ev.data?.kieu !== 'mo-thong-bao') return;
    const id = ev.data.nguoi_gui_id || idTuDuongDan(ev.data.duong_dan);
    if (id) moChatTheoId(id, ev.data.nguoi_gui_ten); else { moPopup(); veDs(); }
  });

  /* Mở nguội từ thông báo (chưa có tab nào): `openWindow` nạp
     '/app.html#chat=<id>' — đọc hash ngay khi chat khởi động xong. */
  setTimeout(() => {
    const id = idTuDuongDan(location.hash);
    if (id) moChatTheoId(id);              // `window.moChatVoi` gán ở cuối hàm này
    else if (location.hash === '#chat') { moPopup(); veDs(); }
  }, 0);

  // Nạp trạng thái + tự đăng ký lại nếu người dùng đã cho quyền từ trước.
  TBDay.nap().then(async (k) => {
    if (!k) return;
    if (k.bat && !k.chat_tat && TBDay.daChoQuyen()) await TBDay.dangKyDay();
    /* Vẽ SAU khi thử đăng ký: có thế mới biết ca "đã cho quyền mà vẫn điếc".
       Vẽ ở đây nghĩa là trạng thái hiện ra ngay khi mở ERP, KHÔNG cần bấm 🔔
       và cũng không cần mở cửa sổ chat — dấu trên bong bóng nằm ngoài popup. */
    veTrangThaiTB();
  }).catch((e) => {
    /* `.then(...)` KHÔNG có `.catch` là cách lỗi H2 quay lại mà không ai hay:
       một ngoại lệ ở đây nuốt trọn việc vẽ trạng thái, chuông giữ `hidden`,
       người dùng điếc trong im lặng tuyệt đối. Ghi ra console để còn lần được. */
    console.error('Vẽ trạng thái thông báo:', e?.message || e);
  });

  /* ---- Mở / đóng popup (giống hệt cách chuông thông báo làm) ----
     boQuaClickKeTiep: nút "Chat ngay" ở Danh bạ (hay bất kỳ nút nào bên
     ngoài widget sau này) không tự stopPropagation() được — click đó nổi
     bọt lên document và bị coi là "click ra ngoài" nên đóng popup ngay
     lập tức. Cờ này bỏ qua đúng 1 lượt click sau khi moPopup() vừa chạy. */
  let boQuaClickKeTiep = false;
  function moPopup() {
    dangMo = true; popup.hidden = false;
    /* Trên điện thoại cửa sổ chat chiếm TOÀN MÀN HÌNH (xem `@media` trong
       style.css). Lớp này để CSS giấu nút nổi + cột bong bóng lúc đang mở
       (chúng nằm đè lên chính cửa sổ) và khoá cuộn trang nền — không thì vuốt
       trong đoạn chat lại kéo trang phía sau trôi theo. */
    document.body.classList.add('cnb-mo');
    boQuaClickKeTiep = true;
    chuaDoc = 0; chuaDocTruoc = 0; veBadge();
    // Đánh dấu ĐÃ ĐỌC ở máy chủ -> tải lại trang cũng không hiện "1" lại nữa
    API.chatDaDoc().catch(() => {});
    veManHinh();
  }
  function dongPopup() {
    dangMo = false; popup.hidden = true;
    document.body.classList.remove('cnb-mo');
  }

  nutMo.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popup.hidden) { moPopup(); veDs(); } else dongPopup();
  });
  nutDong.addEventListener('click', (e) => { e.stopPropagation(); dongPopup(); });
  document.addEventListener('click', () => {
    if (boQuaClickKeTiep) { boQuaClickKeTiep = false; return; }
    if (dangMo) dongPopup();
  });
  popup.addEventListener('click', (e) => e.stopPropagation());
  /* Escape đóng cửa sổ. Trên điện thoại toàn màn hình thì nút ✕ là đường ra
     duy nhất nhìn thấy được; trên máy tính bàn phím phải có đường ra tương
     đương, không thì người quen dùng phím bị nhốt trong cửa sổ. */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dangMo) { e.stopPropagation(); dongPopup(); }
  });

  // "←" = VỀ DANH SÁCH hội thoại (trước đây là "về kênh chung")
  nutLui.addEventListener('click', (e) => { e.stopPropagation(); veDs(); });

  /* Mở chat riêng với 1 người — nút "Chat ngay" ở Danh bạ và cú bấm thông báo
     đẩy cùng đi qua đây. Chỉ là lớp vỏ mỏng quanh `moLuong()`; mọi logic đổi
     luồng nằm ở một chỗ duy nhất. */
  window.moChatVoi = async (id, ten, vietTat) => {
    if (!id || id === TOI.id) return;
    moPopup();
    await moLuong({ id, ten, viet_tat: vietTat });
    taiDanhSachHoiThoai();   // đối tác mới lần đầu chat thì cũng cần hiện luôn trong danh sách
    moiBatNeuNen();   // vừa MỞ một cuộc chat riêng — thời điểm hợp lý thứ hai để hỏi quyền
  };

  /* ---- Đính kèm: DÁN (Ctrl+V) · KÉO–THẢ · CHỌN TỆP  ·  CTL-0011 ----------
     Góp ý #1 của Sếp Ngọc: "đoạn chat ko tiếp nhận ảnh chụp màn hình, muốn
     paste nhanh như chat trong Zalo". Dùng CHUNG tiện ích với form Góp ý
     (`ganVungThaTep` + trọng tài Ctrl+V `dangKyNhanAnhDan`), không chép lại
     một bản thứ hai.

     ẢNH được nén ngay tại máy (JPEG, cạnh dài 1600px) rồi mới gửi. TỆP KHÔNG
     PHẢI ẢNH (Excel, PDF…) giữ nguyên như trước, không đụng tới.

     Giới hạn: backend `chatGui()` chặn ĐỘC LẬP ở 4MB (`CHAT_TEP_TOI_DA`,
     src/index.js) — KHÁC mức 800KB của Góp ý vì chat còn gửi cả tệp tài
     liệu. Nén ở giao diện chỉ là tiện lợi, KHÔNG thay thế hàng rào máy chủ.
     Không đổi schema, không đổi backend: cột `tep_ten/tep_loai/
     tep_kich_thuoc/tep_du_lieu` của bảng `tin_nhan_chat` đã có sẵn và đã
     hiển thị ảnh (`.chat-anh`) từ trước. */
  const CHAT_ANH_TOI_DA = Math.round(3.8 * 1024 * 1024);   // chừa dư dưới 4MB của backend
  const oTepChat = $('#chat-tep'), khoiTepChat = $('#chat-file-dinhkem'),
        tenTepChat = $('#chat-file-ten'), hinhTepChat = $('#chat-file-hinh'),
        oLoiChat = $('#chat-loi');
  let dangXuLyTepChat = 0, luotTepChat = 0;   // bộ đếm + số thứ tự lượt, như bên Góp ý

  function veTepDangChon() {
    const f = tepDangChon;
    khoiTepChat.hidden = !f;
    tenTepChat.textContent = f ? `${f.name} (${dinhDangCo(f.size)})` : '';
    // Thu hồi URL tạm của ảnh xem trước trước đó, tránh rò rỉ bộ nhớ.
    if (hinhTepChat.dataset.url) {
      URL.revokeObjectURL(hinhTepChat.dataset.url);
      delete hinhTepChat.dataset.url;
    }
    if (f && /^image\//.test(f.type || '')) {
      const u = URL.createObjectURL(f);
      hinhTepChat.dataset.url = u;
      hinhTepChat.src = u;
      hinhTepChat.hidden = false;
    } else {
      hinhTepChat.removeAttribute('src');
      hinhTepChat.hidden = true;
    }
  }

  function boTepChat() {
    luotTepChat++;              // huỷ hiệu lực lượt nén đang chạy dở (nếu có)
    tepDangChon = null;
    oTepChat.value = '';
    veTepDangChon();
    oLoiChat.textContent = '';
  }

  async function nhanTepChat(f) {
    const luot = ++luotTepChat;
    if (!f) return;
    oLoiChat.textContent = '';
    // Không phải ảnh → giữ nguyên đường cũ, backend tự chặn 4MB.
    if (!/^image\//.test(f.type || '')) {
      tepDangChon = f;
      veTepDangChon();
      return;
    }
    dangXuLyTepChat++;
    oLoiChat.textContent = 'Đang xử lý ảnh…';
    try {
      const nen = await nenAnhChung(f, {
        canhToiDa: 1600, chatLuong: 0.8, gioiHanByte: CHAT_ANH_TOI_DA
      });
      if (luot !== luotTepChat) return;
      const goc = String(f.name || '').replace(/\.[^.]+$/, '').trim();
      tepDangChon = dataUrlThanhTep(nen, (goc || 'anh-dan-' + Date.now()) + '.jpg');
      veTepDangChon();
      oLoiChat.textContent = '';
    } catch (err) {
      if (luot !== luotTepChat) return;
      /* Nén hỏng thì GIỮ TỆP GỐC, không xoá (REV-0006 lỗi #2).
         Ảnh HEIC của iPhone mang type "image/heic" nên lọt vào đây, nhưng
         <img> trên Chrome/Windows không giải mã được → trước bản vá này tệp
         bị xoá hẳn, tức là chat MẤT khả năng gửi ảnh iPhone vốn đang chạy tốt.
         Chat gửi được tệp nhị phân bất kỳ nên gửi nguyên bản là an toàn;
         backend `chatGui()` vẫn chặn 4MB độc lập.
         KHÁC với Góp ý: cột `gop_y.dinh_kem` chặn 800KB và chỉ nhận base64
         nên bên đó BẮT BUỘC giữ nguyên hành vi báo lỗi + xoá tệp. */
      if (f.size <= CHAT_ANH_TOI_DA) {
        tepDangChon = f;
        veTepDangChon();
        oLoiChat.textContent = 'Không nén được ảnh này, sẽ gửi nguyên bản.';
      } else {
        // Quá to mà lại không nén được → không còn đường nào, phải xoá thật.
        tepDangChon = null;
        oTepChat.value = '';
        veTepDangChon();
        oLoiChat.textContent = `Ảnh này không nén được mà lại nặng ${dinhDangCo(f.size)} `
          + '— quá giới hạn 4MB của chat. Sếp đổi sang ảnh JPG/PNG nhẹ hơn nhé.';
      }
    } finally {
      dangXuLyTepChat--;
    }
  }

  $('#chat-nut-tep').addEventListener('click', () => oTepChat.click());
  $('#chat-file-bo').addEventListener('click', boTepChat);

  // Kéo–thả tệp vào bất kỳ đâu trong bong bóng chat + nối ô chọn tệp.
  ganVungThaTep({ vungTha: popup, oChonFile: oTepChat, khiCoTep: nhanTepChat });

  /* Ctrl+V — ưu tiên 20, CAO HƠN form Góp ý (10): bong bóng chat nổi chồng
     lên mọi màn hình, đang mở chat mà dán thì rõ ràng là muốn gửi vào chat. */
  dangKyNhanAnhDan({
    vung: popup,
    dangBat: () => !popup.hidden,
    nhan: nhanTepChat,
    uuTien: 20
  });

  // Gửi
  $('#chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oNoiDung = $('#chat-noidung');
    const noiDung = oNoiDung.value.trim();
    // Ảnh nén xong ngay lúc dán/chọn; chỉ chặn trường hợp bấm Gửi ĐÚNG LÚC
    // máy còn đang nén — tránh gửi đi mà mất ảnh.
    if (dangXuLyTepChat > 0) {
      oLoiChat.textContent = 'Đang xử lý ảnh, chờ một chút rồi bấm Gửi nhé.';
      return;
    }
    if (!noiDung && !tepDangChon) return;
    oLoiChat.textContent = '';
    const nutGui = $('#chat-nut-gui');
    nutGui.disabled = true;
    try {
      const { id } = await API.chatGui(noiDung, tepDangChon, nguoiNhanHienTai?.id);
      oNoiDung.value = '';
      boTepChat();
      // Hiện luôn tin vừa gửi (khỏi đợi vòng hỏi lại tiếp theo)
      if (id > idCuoi) await hoiTinMoi();
      cuoiTrang();
      /* CTL-0014 — ĐÂY là chỗ hỏi quyền thông báo. Người vừa gõ xong một tin
         nhắn thì đang hiểu rất rõ vì sao cần được báo khi có tin trả lời; hỏi
         lúc vừa mở ERP thì họ chưa hiểu gì và bấm Chặn — mà Chặn là vĩnh viễn. */
      moiBatNeuNen();
    } catch (err) {
      $('#chat-loi').textContent = err.message || 'Không gửi được, thử lại nhé.';
    } finally {
      nutGui.disabled = false;
      oNoiDung.focus();
    }
  });

  /* ==== KHỞI ĐỘNG MẠNG — ĐẶT CUỐI CÙNG, CÓ CHỦ Ý =========================
     Tới dòng này MỌI dây nối đã gắn xong và `window.moChatVoi` đã có mặt, nên
     một lượt gọi hỏng ở dưới chỉ làm mất huy hiệu / danh sách hội thoại —
     KHÔNG giết cả mô-đun chat như trước (xem "DÂY NỐI TRƯỚC, MẠNG SAU" ở trên).
     Bỏ hẳn `taiLanDau()` lúc mở trang: popup nay mở ra DANH SÁCH HỘI THOẠI,
     tin nhắn chỉ tải khi người ta thật sự vào một luồng — bớt một lượt đọc
     `/api/chat/tin-nhan` cho MỖI lần mở ERP của cả 20 người. (Đổi lại
     `/api/chat/gan-day` nay gọi mỗi lần MỞ CỬA SỔ, không chỉ lúc nạp trang —
     xem sổ sách đầy đủ ở chú thích `chatGanDay()` trong `src/index.js`.) */
  try { await hoiChuaDocToanCuc(); } catch (e) { console.error('Chat · đếm chưa đọc:', e?.message || e); }
  try { await taiDanhSachHoiThoai(); } catch (e) { console.error('Chat · danh sách hội thoại:', e?.message || e); }
  daKhoiDongNhip = true;
  batNhipTin();                          // tự tắt/bật theo tab ẩn + ngồi không (REV-0031 Việc 2)
  setInterval(hoiChuaDocToanCuc, 6000);  // SELECT thuần — giữ chạy để tab ẩn vẫn báo được
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
  $('#ns-lochopdong').addEventListener('change', veLaiBangNs);
  $('#ns-xoaloc').addEventListener('click', xoaLocNS);

  /* ==== TRA NĂNG LỰC (SPEC-0007 Đợt 4) ==================================
     Nằm NGOÀI khối `them_nhan_su`: anh Duy là `quan_ly_kho`, KHÔNG có
     `them_nhan_su`, không mở được hộp Hồ sơ nhân sự — mà anh mới đúng là
     người chấm năng lực cho 29 bạn kho. Đặt màn chấm trong hộp hồ sơ là
     đúng người duy nhất cần nó lại không vào được.
     Máy chủ vẫn là nơi chặn thật (`src/ky-nang.js` kiểm quan hệ quản lý);
     phần dưới chỉ ẩn/hiện cho gọn mắt. */
  {
    /* REV-0010 ISSUE-1 — hai lớp đỡ, cố ý:
       (1) `/api/nhan-su` nay TRẢ cột `dang_lam` ở cả nhánh không-xem-lương;
       (2) chỉ loại người ĐÃ NGHỈ (`dang_lam === 0`). Trước đây `.filter(n =>
       n.dang_lam)` quét sạch danh sách khi API thiếu cột — im lặng tuyệt đối.
       `DS_NHAN_SU_DOC` vốn đã lọc `WHERE dang_lam = 1` từ máy chủ; chỉ
       `DS_NHAN_SU_QT` mới lẫn người nghỉ, và ở đó cột luôn có thật. */
    const dsNguoi = () => (TOI.them_nhan_su ? DS_NHAN_SU_QT : DS_NHAN_SU_DOC).filter(n => n.dang_lam !== 0);

    function doNguoiVao(sel, nhan) {
      const cu = sel.value;
      sel.innerHTML = `<option value="">${nhan}</option>` + dsNguoi()
        .map(n => `<option value="${esc(n.id)}">${esc(n.ho_ten)}${n.bo_phan ? ' — ' + esc(n.bo_phan) : ''}</option>`)
        .join('');
      if (cu) sel.value = cu;
    }

    let KN_MO_ROI = false;
    $('#knTra').addEventListener('toggle', async () => {
      if (!$('#knTra').open || KN_MO_ROI) return;
      KN_MO_ROI = true;                       // nạp danh mục ĐÚNG MỘT LẦN, và
      const ds = await knNapDanhMuc();        // chỉ khi người ta thật sự mở ra
      const oKn = $('#knChonKyNang');
      knDoVaoSelect(oKn, ds, false);
      oKn.querySelector('option[value=""]').textContent = 'Chọn kỹ năng…';
      doNguoiVao($('#knChonNguoiVang'), 'Chọn người nghỉ…');
      doNguoiVao($('#knChonNguoiCham'), 'Chọn người để chấm…');
    });

    $('#knSeg').addEventListener('click', e => {
      const b = e.target.closest('[data-kn]'); if (!b) return;
      for (const n of $('#knSeg').querySelectorAll('.seg-nut')) n.classList.toggle('active', n === b);
      for (const m of ['lamduoc', 'thayduoc', 'cham']) $('#knMan-' + m).hidden = m !== b.dataset.kn;
    });

    /* ---- ① Ai làm được việc này ---- */
    async function knVeAiLamDuoc() {
      const id = $('#knChonKyNang').value;
      const oKq = $('#knKqLamDuoc'), oMo = $('#knMoTa');
      if (!id) { oKq.innerHTML = ''; oMo.innerHTML = ''; return; }
      const k = (KN_DANH_MUC || []).find(x => String(x.id) === id);
      oMo.innerHTML = k?.mo_ta
        ? `<b>Thế nào là làm được:</b> ${esc(k.mo_ta)}` +
          (k.an_toan ? ' <span class="kn-antoan">⚠ việc có rủi ro an toàn hoặc tiền.</span>' : '')
        : '';
      oKq.innerHTML = '<div class="sm">Đang tra…</div>';
      let kq;
      try { kq = await API.knAiLamDuoc(id, $('#knChonMuc').value); }
      catch (err) { oKq.innerHTML = `<div class="form-loi">${esc(err.message || 'Không tra được.')}</div>`; return; }
      if ($('#knChonKyNang').value !== id) return;    // đã đổi kỹ năng trong lúc chờ

      if (kq.chua_nap) { oKq.innerHTML = '<div class="sm">Chưa nạp <code>them-ky-nang.sql</code>.</div>'; return; }
      if (!kq.nguoi.length) {
        oKq.innerHTML = `<div class="vcl-dong vcl-do"><span>🚨 <b>Không ai</b> đạt mức này. ` +
          `Việc này hôm nay <b>không xếp ca được</b> — hoặc chưa ai được chấm, hoặc thật sự chưa ai làm được.</span></div>`;
        return;
      }
      oKq.innerHTML =
        (kq.diem_chet
          ? `<div class="vcl-dong vcl-do"><span>🚨 <b>Chỉ một người</b> làm được việc này. ` +
            `Người này nghỉ là việc đứng lại — nên có người thứ hai được dạy lại.</span></div>`
          : '') +
        `<div class="kn-ds">` + kq.nguoi.map(n =>
          `<div class="kn-nguoi"><b>${esc(n.ho_ten)}</b>` +
            `<span class="tag ${KN_MUC_MAU[n.muc] || ''}">${esc(KN_MUC_CHU[n.muc] || n.muc)}</span>` +
            `<span class="kn-phu">${esc(n.chuc_vu || n.bo_phan || '')}` +
              `${n.nguoi_cham_ten ? ' · xác nhận bởi ' + esc(n.nguoi_cham_ten) : ''}</span></div>`
        ).join('') + `</div>`;
    }
    $('#knChonKyNang').addEventListener('change', knVeAiLamDuoc);
    $('#knChonMuc').addEventListener('change', knVeAiLamDuoc);

    /* ---- ② Ai thay được khi nghỉ ---- */
    $('#knChonNguoiVang').addEventListener('change', async () => {
      const id = $('#knChonNguoiVang').value;
      const oKq = $('#knKqThayDuoc');
      if (!id) { oKq.innerHTML = ''; return; }
      oKq.innerHTML = '<div class="sm">Đang tìm…</div>';
      let kq;
      try { kq = await API.knAiThayDuoc(id); }
      catch (err) { oKq.innerHTML = `<div class="form-loi">${esc(err.message || 'Không tìm được.')}</div>`; return; }
      if ($('#knChonNguoiVang').value !== id) return;

      if (kq.chua_nap) { oKq.innerHTML = '<div class="sm">Chưa nạp <code>them-ky-nang.sql</code>.</div>'; return; }
      if (kq.chua_cham) {
        oKq.innerHTML = '<div class="vcl-dong"><span>Người này <b>chưa được chấm năng lực nào</b> ' +
          'từ mức “Làm được” trở lên — nên chưa tra được ai thay. Chấm ở mục <b>Chấm năng lực</b>.</span></div>';
        return;
      }
      const tong = kq.can_ky_nang.length;
      oKq.innerHTML =
        `<div class="kn-tieu">Phần việc cần gánh: <b>${tong}</b> kỹ năng — ` +
          kq.can_ky_nang.map(c => esc(c.ten)).join(' · ') + `</div>` +
        (kq.khong_ai_ganh.length
          ? `<div class="vcl-dong vcl-do"><span>🚨 <b>Không ai khác</b> làm được: ` +
            kq.khong_ai_ganh.map(c => esc(c.ten)).join(' · ') +
            `. Đây là phần sẽ <b>đứng lại</b> nếu người này nghỉ.</span></div>` : '') +
        (kq.ung_vien.length
          ? `<div class="kn-ds">` + kq.ung_vien.map(u =>
              `<div class="kn-nguoi"><b>${esc(u.ho_ten)}</b>` +
              `<span class="tag ${u.so_phu === tong ? 'ok' : ''}">${u.so_phu}/${tong} kỹ năng</span>` +
              `<span class="kn-phu">${esc(u.chuc_vu || u.bo_phan || '')}` +
                `${u.thieu.length ? ' · chưa làm được: ' + esc(u.thieu.join(', ')) : ''}</span></div>`
            ).join('') + `</div>`
          : `<div class="vcl-dong vcl-do"><span>🚨 <b>Không có ai</b> gánh được dù chỉ một phần.</span></div>`);
    });

    /* ---- ③ Chấm năng lực ---- */
    const knChamO = {
      bang: '#knChamBang', trong: '#knChamTrong', form: '#knChamForm',
      chon: '#knChamChon', nhac: '#knChamNhac'
    };
    async function knVeManCham() {
      const id = $('#knChonNguoiCham').value;
      $('#knChamLoi').textContent = '';
      if (!id) {
        $('#knChamBang').innerHTML = ''; $('#knChamTrong').hidden = true;
        $('#knChamForm').hidden = true; $('#knChamNhac').innerHTML = ''; return;
      }
      await veKhoiNangLuc({
        ...knChamO, nhanSuId: id, nhom: $('#knLocNhom').value || null,
        conDungKhong: () => $('#knChonNguoiCham').value === id
      });
      knHienTieuChuan('#knChamChon', '#knChamTieuChuan');
    }
    $('#knChonNguoiCham').addEventListener('change', knVeManCham);
    $('#knLocNhom').addEventListener('change', knVeManCham);
    $('#knChamChon').addEventListener('change', () => knHienTieuChuan('#knChamChon', '#knChamTieuChuan'));

    $('#knChamForm').addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#knChamLoi'); oLoi.textContent = '';
      try {
        await API.knCham({
          nhan_su_id: $('#knChonNguoiCham').value,
          ky_nang_id: $('#knChamChon').value,
          muc: $('#knChamMuc').value,
          ghi_chu: $('#knChamGhiChu').value
        });
        $('#knChamGhiChu').value = '';
        await knVeManCham();
      } catch (err) { oLoi.textContent = err.message || 'Chưa xác nhận được, thử lại nhé.'; }
    });

    $('#knChamBang').addEventListener('click', async e => {
      const b = e.target.closest('[data-kn-go]'); if (!b) return;
      if (!confirm('Gỡ xác nhận năng lực này?')) return;
      try {
        await API.knGo($('#knChonNguoiCham').value, parseInt(b.dataset.knGo, 10), 'Gỡ từ màn Chấm năng lực');
        await knVeManCham();
      } catch (err) { $('#knChamLoi').textContent = err.message || 'Không gỡ được.'; }
    });
  }

  if (TOI.them_nhan_su) {
    $('#ns-panel-them').hidden = false;
    $('#ns-thThaoTac').hidden = false;
    // Cột + bộ lọc Hợp đồng CHỈ mở cho người quản lý nhân sự (Admin/HCNS) —
    // bảng đọc-thường vẽ ít ô hơn, hiện <th> lên là lệch cột toàn bảng, và
    // hạn hợp đồng cũng không phải thứ cả công ty cần nhìn.
    $('#ns-thHopDong').hidden = false;
    $('#ns-lochopdong').hidden = false;

    // Lời nhắc hiện NGAY TẠI CHỖ khi chọn "Khoán việc" — ngay dưới ô vừa
    // chọn, lúc người ta còn đang cân nhắc. Đưa ra hộp cảnh báo sau khi bấm
    // Lưu thì đã muộn: lúc đó người ta chỉ muốn bấm cho xong.
    function ganNhacKhoan(idSelect, idNhac) {
      const oSel = $(idSelect), oNhac = $(idNhac);
      if (!oSel || !oNhac) return;
      const capNhat = () => {
        const khoan = oSel.value === 'khoan_viec';
        oNhac.hidden = !khoan;
        if (khoan) oNhac.innerHTML = NHAC_KHOAN_HTML;
      };
      oSel.addEventListener('change', capNhat);
      capNhat();
    }
    ganNhacKhoan('#qtLoaiLaoDong', '#qtNhacKhoan');
    ganNhacKhoan('#nsSua-loailaodong', '#nsSuaNhacKhoan');
    if (!TOI.la_admin) {
      const oLuong = document.getElementById('qtFieldLuong');
      if (oLuong) oLuong.remove();
      $('#nsMoTa').textContent = 'Thêm/sửa hồ sơ nhân sự. Cấp tài khoản đăng nhập và lương do Admin phụ trách (tab Quản trị).';
    }

    // QUICK_CREATE_ALLOWED (docs/audit/AUDIT-QUICK-CREATE-POLICY.md) — người
    // đang thêm nhân sự ở đây ĐÃ đúng là Data Owner của Chức danh
    // (duocThemNhanSu), field bắt buộc duy nhất là tên.
    const taoMoiChucDanh = { xuLyTao: API.dlnThemChucDanh, capNhatDs: window.LAM_MOI_DANHMUC_NEN };
    const { capNhatHienThi: veQtChucDanh } = ganCombo({
      hienThi: $('#qtChucDanhHienThi'), panel: $('#qtChucDanhPanel'),
      tim: $('#qtChucDanhTim'), goiY: $('#qtChucDanhGoiY'), giaTri: $('#qtChucDanh')
    }, () => dsCandidateDanhMuc(DS_CHUC_DANH, $('#qtChucDanh').value), null, 'Chọn chức danh...', taoMoiChucDanh);
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
        // .reset() đưa select về mặc định nhưng KHÔNG bắn 'change' — không
        // bắn tay thì lời nhắc "Khoán" của người vừa thêm còn dính lại.
        $('#qtLoaiLaoDong').dispatchEvent(new Event('change'));
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

    // LOAI_LD_CHU nay khai báo 1 chỗ ở đầu tệp (SPEC-0007 Đợt 1) — bản cũ ở
    // đây thiếu 'khoan_viec' nên hồ sơ người khoán sẽ hiện trống một dòng.
    const NHAN_SU_KIEN = {
      vao_lam: '🙋 Vào làm', doi_phong_ban: 'Đổi phòng ban', doi_chuc_danh: 'Đổi chức danh',
      doi_quan_ly: 'Đổi quản lý trực tiếp', doi_trang_thai: 'Đổi trạng thái hợp đồng', nghi_viec: 'Nghỉ việc',
      // SPEC-0007 Đợt 1 — hai sự kiện này backend ĐÃ ghi từ vòng trước nhưng
      // từ điển thiếu ⇒ hồ sơ hiện mã thô (N-2 · REV-0013).
      doi_loai_lao_dong: 'Đổi loại lao động', don_ca_khoan_viec: '⚠️ Dọn ca do chuyển Khoán việc',
      hop_dong: 'Hợp đồng lao động',
      /* REV-0058 ③ — LẶP LẠI ĐÚNG LỖI mà chú thích ngay phía trên vừa nói là
         đã vá vòng trước. Nên quét lại CẢ từ điển thay vì chỉ thêm cái vừa
         thiếu: máy chủ ghi 14 loại sự kiện vào `nhan_su_lich_su`, từ điển này
         mới có 9 — SÁU loại hiện mã thô, không phải hai. Bốn loại đầu dưới đây
         đã hỏng âm thầm từ TRƯỚC bản này; hai loại cuối là của bản này.
         Bàn đo `scripts/do-tach-vai-tro.mjs` nay đối chiếu từ điển với chuỗi
         máy chủ THẬT SỰ ghi, qua HAI đường ghi đang có: câu `INSERT` thẳng
         (đặt cột theo thứ tự nào cũng bắt được) và lời gọi `ghiVetVaiTro()`.
         Ca đối chứng DC-K/DC-L canh đúng hai đường đó.
         KHÔNG nói "lần vá cuối" nữa — bản trước nói thế rồi lọt ngay hai
         đường né. Chốt này CÒN MÙ nếu người sau dựng một hàm ghi vết THỨ BA
         (không phải `ghiVetVaiTro`, cũng không `INSERT` thẳng). Thêm hàm như
         thế thì khai thêm tên nó vào vòng quét trong bàn đo. */
      ky_nang: 'Kỹ năng',
      doi_ngay_sinh: 'Đổi ngày sinh',
      mo_ta_cong_viec: 'Mô tả công việc',
      khoi_phuc_dang_nhap: '🔑 Khôi phục đăng nhập',
      cap_tai_khoan: '🔑 Cấp tài khoản ERP',
      doi_vai_tro: 'Đổi vai trò · vị trí công việc'
    };

    // Header tổng quan + khối Tài khoản ERP (Employee Profile Phase 1) —
    // đọc thẳng từ `n` (đã có sẵn trong DS_NHAN_SU_QT qua qtDanhSach), không
    // gọi thêm API nào cho phần này.
    function veDauHoSo(n) {
      const tt = TRANG_THAI[n.trang_thai] || { chu: n.trang_thai, mau: 'mute' };
      const quanLy = n.quan_ly_id ? DS_NHAN_SU_QT.find(x => x.id === n.quan_ly_id) : null;
      const chiTiet = [
        n.chuc_vu ? esc(n.chuc_vu) : null,
        n.bo_phan ? esc(n.bo_phan) : null,
        quanLy ? `Quản lý: ${esc(nhanNhanSu(quanLy))}` : null,
        LOAI_LD_CHU[n.loai_lao_dong] || null,
        n.ngay_vao ? `Vào làm ${esc(n.ngay_vao)}` : null
      ].filter(Boolean).join(' · ');
      $('#nsSua-dauho').innerHTML =
        `${avHtml(n.id, n.viet_tat, n.co_anh)}` +
        `<div><div class="nm">${esc(n.ho_ten)}${n.ma_nv ? ` <span class="sm" style="font-weight:400">· ${esc(n.ma_nv)}</span>` : ''} <span class="tag ${tt.mau}">${esc(tt.chu)}</span></div>` +
        `<div class="sm">${chiTiet || '—'}</div></div>`;
    }
    function veKhoiTaiKhoan(n) {
      $('#nsSua-taikhoan').innerHTML =
        `<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">${veCotTaiKhoan(n)}<span class="sm">${n.tai_khoan_id ? esc(tenHaiO(n)) : ''}</span></div>` +
        `<div style="margin-top:8px">${veThaoTacTaiKhoan(n)}</div>`;
    }
    async function veLichSuHoSo(id) {
      const oBang = $('#nsSua-lichsu'), oTrong = $('#nsSua-lichsu-trong');
      let lich_su = [];
      try { ({ lich_su } = await API.nsLichSu(id)); } catch { /* im lặng — hộp vẫn dùng được không có lịch sử */ }
      veBang('#nsSua-lichsu', lich_su, h => {
        const luc = (h.luc || '').slice(0, 16).replace('T', ' ');
        // doi_trang_thai lưu MÃ trạng thái thô (da_ky/thu_viec...) ở backend
        // — các loại sự kiện khác đã lưu sẵn TÊN (bo_phan/chuc_vu/họ tên
        // quản lý), dịch riêng chỉ mã này qua từ điển TRANG_THAI đã có.
        // `doi_loai_lao_dong` cũng lưu mã thô (ban_thoi_gian/khoan_viec…) —
        // dịch nốt, nếu không hồ sơ hiện "ban_thoi_gian → khoan_viec" (N-2).
        const dichGiaTri = v =>
          h.loai_su_kien === 'doi_trang_thai' ? (TRANG_THAI[v]?.chu || v) :
          h.loai_su_kien === 'doi_loai_lao_dong' ? (LOAI_LD_CHU[v] || v) : v;
        // `ghi_chu` là chỗ backend cất câu giải thích đầy đủ (vd: còn N đăng ký
        // ĐÃ DUYỆT phải xử lý tay). Có ghi mà không vẽ ra thì bằng không —
        // Rule 8 Traceable (N-2 · REV-0013).
        const ghiChu = h.ghi_chu ? `<div class="phu" style="white-space:normal">${esc(h.ghi_chu)}</div>` : '';
        return `<td class="sm">${esc(luc)}</td>` +
          `<td class="sm">${esc(NHAN_SU_KIEN[h.loai_su_kien] || h.loai_su_kien)}${h.gia_tri_cu || h.gia_tri_moi ? `<div class="phu">${esc(dichGiaTri(h.gia_tri_cu) || '—')} → ${esc(dichGiaTri(h.gia_tri_moi) || '—')}</div>` : ''}${ghiChu}</td>` +
          `<td class="sm">${esc(h.nguoi_thuc_hien_ten || '—')}</td>`;
      });
      oTrong.hidden = lich_su.length > 0;
    }

    /* ---- Công tắc sinh nhật trong hồ sơ (SPEC-0007 Đợt 2) --------------- */

    let NS_SN_DANG_MO = null;   // id người đang mở hồ sơ, để tick không lạc chủ

    async function veCongTacSinhNhat(n) {
      const o = $('#nsSua-sinhnhat'); if (!o) return;
      NS_SN_DANG_MO = n.id;
      o.checked = n.cong_khai_sinh_nhat !== false;
      o.disabled = false;
      /* Ngày sinh KHÔNG đi kèm danh sách nhân sự chung (mức 2, ADR-0011 A2)
         nên phải hỏi riêng khi mở hồ sơ. */
      const oNg = $('#nsSua-ngaysinh');
      if (!oNg) return;
      oNg.value = '';
      try {
        const kq = await API.nsSinhNhat(n.id);
        if (NS_SN_DANG_MO !== n.id) return;          // đã mở hồ sơ người khác
        oNg.value = (kq.ngay_sinh || '').slice(0, 10);
      } catch { /* để trống — vẫn nhập mới được */ }
    }

    /* Lưu ngay khi đổi, không chờ nút Lưu hồ sơ: ô này KHÔNG thuộc form hồ
       sơ, gộp vào là phải sửa đường lưu nhân sự mà người khác đang dùng. */
    $('#nsSua-ngaysinh')?.addEventListener('change', async () => {
      const o = $('#nsSua-ngaysinh'), id = NS_SN_DANG_MO;
      if (!id) return;
      o.disabled = true;
      try {
        await API.nsNgaySinhLuu(id, o.value || null);
        $('#nsSua-loi').textContent = '';
        taiViecCanLam();     // dải "sinh nhật tháng sau" phải đổi theo ngay
      } catch (err) {
        $('#nsSua-loi').textContent = err.message || 'Chưa lưu được ngày sinh.';
      } finally { o.disabled = false; }
    });

    $('#nsSua-sinhnhat')?.addEventListener('change', async () => {
      const o = $('#nsSua-sinhnhat');
      const id = NS_SN_DANG_MO;
      if (!id) return;
      const muon = o.checked;
      o.disabled = true;
      try {
        await API.nsSinhNhatCongKhai(muon, id);
        // Cập nhật bộ nhớ để đóng/mở lại hồ sơ không thấy trạng thái cũ.
        const n = DS_NHAN_SU_QT.find(x => x.id === id);
        if (n) n.cong_khai_sinh_nhat = muon;
        if (id === TOI.id) {
          TOI.cong_khai_sinh_nhat = muon;
          const oToi = $('#snCongKhai'); if (oToi) oToi.checked = muon;
        }
      } catch (err) {
        if (NS_SN_DANG_MO === id) o.checked = !muon;   // chưa đổi người thì trả ô về cũ
        $('#nsSua-loi').textContent = err.message || 'Chưa đổi được công tắc sinh nhật.';
      } finally {
        o.disabled = false;
      }
    });

    /* ---- Bộ năng lực trong hồ sơ (SPEC-0007 Đợt 4) ----------------------
       Bản trong hồ sơ dùng CHUNG hàm với màn Chấm năng lực ở tab Nhân sự —
       hai bản là hai lần phải sửa, và lần thứ hai sẽ có người quên. */

    let KN_HS_DANG_MO = null;

    async function veKnHoSo(n) {
      KN_HS_DANG_MO = n.id;
      $('#kn-loi').textContent = '';
      $('#kn-ghichu').value = '';
      await veKhoiNangLuc({
        nhanSuId: n.id,
        bang: '#nsSua-knBang', trong: '#nsSua-knTrong', dem: '#nsSua-knDem',
        form: '#nsSua-knForm', chon: '#kn-chon', nhac: '#nsSua-knNhac',
        conDungKhong: () => KN_HS_DANG_MO === n.id
      });
      knHienTieuChuan('#kn-chon', '#kn-tieuchuan');
    }

    $('#kn-chon').addEventListener('change', () => knHienTieuChuan('#kn-chon', '#kn-tieuchuan'));

    $('#nsSua-knForm').addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#kn-loi'); oLoi.textContent = '';
      const nut = $('#kn-nutluu'); nut.disabled = true;
      try {
        await API.knCham({
          nhan_su_id: KN_HS_DANG_MO,
          ky_nang_id: $('#kn-chon').value,
          muc: $('#kn-muc').value,
          ghi_chu: $('#kn-ghichu').value
        });
        const n = DS_NHAN_SU_QT.find(x => x.id === KN_HS_DANG_MO);
        if (n) await veKnHoSo(n);
      } catch (err) {
        oLoi.textContent = err.message || 'Chưa xác nhận được, thử lại nhé.';
      } finally { nut.disabled = false; }
    });

    $('#nsSua-knBang').addEventListener('click', async e => {
      const b = e.target.closest('[data-kn-go]'); if (!b) return;
      if (!confirm('Gỡ xác nhận năng lực này?')) return;
      try {
        await API.knGo(KN_HS_DANG_MO, parseInt(b.dataset.knGo, 10), 'Gỡ từ hồ sơ nhân sự');
        const n = DS_NHAN_SU_QT.find(x => x.id === KN_HS_DANG_MO);
        if (n) await veKnHoSo(n);
      } catch (err) { $('#kn-loi').textContent = err.message || 'Không gỡ được.'; }
    });

    /* ---- Mô tả công việc theo MBOs (SPEC-0007 Đợt 3) --------------------
       Gắn theo CHỨC DANH, không theo người: 24 người nhưng ~8 chức danh, và
       JD vốn thuộc về VỊ TRÍ — người nghỉ thì JD phải ở lại cho người sau.
       Chỗ ép outcome nằm ở `do_bang` bắt buộc (ràng buộc NOT NULL dưới DB),
       giao diện chỉ nhắc thêm cho dễ hiểu, KHÔNG phải chốt chặn. */

    let JD_DANG_MO = null;      // { nhan_su_id, chuc_danh_id }

    const JD_NHIP_CHU = { ngay: 'Hằng ngày', tuan: 'Hằng tuần', thang: 'Hằng tháng', quy: 'Hằng quý' };

    /* Bản sao danh sách động từ hoạt động của `src/mota-cv.js`. CỐ Ý sao chép
       thay vì nạp từ máy chủ: đây chỉ là lời nhắc trong lúc gõ, gọi API mỗi
       phím là vô lý. MÁY CHỦ mới là nơi phán quyết — lệch nhau thì cũng chỉ
       lệch một câu nhắc, không lệch dữ liệu. */
    const JD_MO_DAU_HOAT_DONG = ['quản lý', 'theo dõi', 'hỗ trợ', 'phối hợp', 'thực hiện', 'đảm bảo'];
    function jdDongTuHoatDong(s) {
      const t = String(s || '').trim().toLowerCase();
      return JD_MO_DAU_HOAT_DONG.find(v => t.startsWith(v)) || null;
    }

    function jdResetForm() {
      $('#jd-id').value = '';
      $('#jd-daura').value = '';
      $('#jd-dobang').value = '';
      $('#jd-nhip').value = 'thang';
      $('#jd-pham-vi').value = 'chuc_danh';
      $('#jd-nutluu').textContent = 'Lưu đầu ra';
      $('#jd-nutmoi').hidden = true;
      $('#jd-loi').textContent = '';
      jdCapNhatNhac();
    }

    function jdCapNhatNhac() {
      const o = $('#jd-nhac'), dt = jdDongTuHoatDong($('#jd-daura').value);
      o.hidden = !dt;
      if (dt) {
        o.innerHTML = `<b>“${esc(dt)}…” là một HOẠT ĐỘNG, chưa phải đầu ra.</b> ` +
          `Đầu ra là thứ <b>bàn giao được</b> — hỏi tiếp: làm xong thì có cái gì trên tay? ` +
          `Ví dụ “${esc(dt)} kho” → “Số liệu tồn kho khớp giữa ERP và đếm thực tế”. ` +
          `<i>Vẫn lưu được — đây là lời nhắc, không phải lỗi.</i>`;
      }
    }
    $('#jd-daura').addEventListener('input', jdCapNhatNhac);
    $('#jd-nutmoi').addEventListener('click', jdResetForm);

    async function veJdHoSo(n) {
      JD_DANG_MO = { nhan_su_id: n.id, chuc_danh_id: n.chuc_danh_id || null };
      jdResetForm();
      $('#jd-mauKhoi').hidden = true;
      $('#jd-chonmau').value = '';

      let kq = { mo_ta: [] };
      try { kq = await API.mtcv({ nhan_su_id: n.id }); } catch { /* hồ sơ vẫn dùng được */ }
      if (JD_DANG_MO?.nhan_su_id !== n.id) return;   // đã mở hồ sơ người khác

      JD_DANG_MO.chuc_danh_id = kq.chuc_danh_id || null;
      const ds = kq.mo_ta || [];

      $('#nsSua-jdDem').textContent = ds.length ? `· ${ds.length} đầu ra` : '· chưa viết';

      /* Nói RÕ đang sửa cho ai. Sửa ở đây là sửa cho CẢ VỊ TRÍ — không nói ra
         thì người dùng tưởng mình đang sửa riêng một người, và tháng sau sẽ
         ngạc nhiên vì người khác cùng chức danh cũng đổi theo. */
      const oVt = $('#nsSua-jdViTri');
      if (kq.chua_co_chuc_danh) {
        oVt.className = 'jd-nhac-vitri jd-canh';
        oVt.innerHTML = '⚠️ Người này <b>chưa được gán chức danh</b>. Mô tả công việc gắn theo ' +
          'chức danh, nên phải chọn chức danh ở phần trên rồi Lưu hồ sơ trước.';
      } else if (kq.chua_nap) {
        oVt.className = 'jd-nhac-vitri jd-canh';
        oVt.innerHTML = '⚠️ Chưa nạp <code>them-mota-congviec.sql</code> — phần này chưa dùng được.';
      } else {
        oVt.className = 'jd-nhac-vitri';
        oVt.innerHTML = `Đây là mô tả công việc của chức danh <b>${esc(kq.chuc_danh_ten || '—')}</b>. ` +
          `Sửa ở đây là sửa cho <b>mọi người</b> giữ chức danh này — chọn “Riêng người này” ` +
          `nếu chỉ là phần kiêm nhiệm.`;
      }
      const dungDuoc = !kq.chua_co_chuc_danh && !kq.chua_nap;
      $('#jd-nutluu').disabled = !dungDuoc;
      $('#jd-chonmau').disabled = !dungDuoc;

      veBang('#nsSua-jdBang', ds, m => {
        const rieng = m.nhan_su_id
          ? ' <span class="tag mute">riêng người này</span>' : '';
        return `<td>${esc(m.dau_ra)}${rieng}</td>` +
          `<td class="sm">${esc(m.do_bang)}</td>` +
          `<td class="sm">${esc(JD_NHIP_CHU[m.nhip] || m.nhip)}</td>` +
          `<td class="sm"><button type="button" class="btn-nho" data-jd-sua="${m.id}">Sửa</button> ` +
            `<button type="button" class="btn-nho btn-phu" data-jd-an="${m.id}">Ẩn</button></td>`;
      });
      $('#nsSua-jdTrong').hidden = ds.length > 0 || !dungDuoc;
      $('#nsSua-jdBang').dataset.ds = JSON.stringify(ds);
    }

    $('#nsSua-jdBang').addEventListener('click', async e => {
      const bSua = e.target.closest('[data-jd-sua]');
      const bAn = e.target.closest('[data-jd-an]');
      if (bSua) {
        const ds = JSON.parse($('#nsSua-jdBang').dataset.ds || '[]');
        const m = ds.find(x => String(x.id) === bSua.dataset.jdSua);
        if (!m) return;
        $('#jd-id').value = m.id;
        $('#jd-daura').value = m.dau_ra;
        $('#jd-dobang').value = m.do_bang;
        $('#jd-nhip').value = m.nhip || 'thang';
        $('#jd-pham-vi').value = m.nhan_su_id ? 'ca_nhan' : 'chuc_danh';
        $('#jd-nutluu').textContent = 'Lưu thay đổi';
        $('#jd-nutmoi').hidden = false;
        jdCapNhatNhac();
        return;
      }
      if (bAn) {
        if (!confirm('Ẩn đầu ra này? Bản ghi KHÔNG bị xoá — chỉ thôi không tính nữa.')) return;
        try {
          await API.mtcvAn(parseInt(bAn.dataset.jdAn, 10), 'Ẩn từ hồ sơ nhân sự');
          const n = DS_NHAN_SU_QT.find(x => x.id === JD_DANG_MO?.nhan_su_id);
          if (n) await veJdHoSo(n);
        } catch (err) {
          $('#jd-loi').textContent = err.message || 'Không ẩn được, thử lại nhé.';
        }
      }
    });

    $('#nsSua-jdForm').addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#jd-loi'); oLoi.textContent = '';
      if (!JD_DANG_MO?.chuc_danh_id) { oLoi.textContent = 'Người này chưa có chức danh.'; return; }
      const nut = $('#jd-nutluu'); nut.disabled = true;
      try {
        const kq = await API.mtcvLuu({
          id: $('#jd-id').value || null,
          chuc_danh_id: JD_DANG_MO.chuc_danh_id,
          nhan_su_id: $('#jd-pham-vi').value === 'ca_nhan' ? JD_DANG_MO.nhan_su_id : null,
          dau_ra: $('#jd-daura').value,
          do_bang: $('#jd-dobang').value,
          nhip: $('#jd-nhip').value
        });
        // `canh_bao` ở đây nghĩa là ĐÃ LƯU nhưng câu chữ còn là hoạt động —
        // khác hẳn `can_ly_do` của hợp đồng (chưa lưu). Không được lẫn.
        if (kq.canh_bao?.length) oLoi.textContent = 'Đã lưu. ' + kq.canh_bao.join(' ');
        const n = DS_NHAN_SU_QT.find(x => x.id === JD_DANG_MO.nhan_su_id);
        if (n) await veJdHoSo(n);
      } catch (err) {
        oLoi.textContent = err.message || 'Chưa lưu được, thử lại nhé.';
      } finally {
        nut.disabled = false;
      }
    });

    /* Mẫu điền sẵn — KHÔNG có mẫu thì tính năng chết ngay tuần đầu. Bấm một
       dòng mẫu là đổ vào form để SỬA rồi mới lưu; cố ý không có nút "nhập cả
       bộ", vì một tập JD nhập hàng loạt mà chưa ai đọc lại thì không ai coi
       đó là cam kết của mình. */
    $('#jd-chonmau').addEventListener('change', async () => {
      const nhom = $('#jd-chonmau').value;
      const khoi = $('#jd-mauKhoi');
      if (!nhom) { khoi.hidden = true; return; }
      let mau = [];
      try { ({ mau } = await API.mtcvMau(nhom)); } catch { mau = []; }
      $('#jd-mauTieu').innerHTML = mau.length
        ? `Bấm một dòng để đổ vào ô bên trên, <b>sửa cho đúng vị trí của mình</b> rồi mới Lưu. ` +
          `Đây là gợi ý, không phải mô tả công việc đã duyệt.`
        : 'Chưa nạp <code>them-mota-congviec.sql</code> nên chưa có mẫu nào.';
      $('#jd-mauDs').innerHTML = mau.map((m, i) =>
        `<button type="button" class="jd-mau-nut" data-mau="${i}">` +
          `<b>${esc(m.dau_ra)}</b><span>${esc(m.do_bang)}</span>` +
          `<i>${esc(JD_NHIP_CHU[m.nhip] || m.nhip)}</i></button>`).join('');
      $('#jd-mauDs').dataset.ds = JSON.stringify(mau);
      khoi.hidden = false;
    });

    $('#jd-mauDs').addEventListener('click', e => {
      const b = e.target.closest('[data-mau]'); if (!b) return;
      const mau = JSON.parse($('#jd-mauDs').dataset.ds || '[]');
      const m = mau[parseInt(b.dataset.mau, 10)];
      if (!m) return;
      $('#jd-id').value = '';
      $('#jd-daura').value = m.dau_ra;
      $('#jd-dobang').value = m.do_bang;
      $('#jd-nhip').value = m.nhip;
      $('#jd-nutluu').textContent = 'Lưu đầu ra';
      $('#jd-nutmoi').hidden = true;
      jdCapNhatNhac();
      $('#jd-daura').focus();
    });

    /* ---- Hợp đồng lao động trong hồ sơ (SPEC-0007 Đợt 1) ---------------- */

    let NS_HD_DANG_MO = null;   // id nhân sự đang mở hộp hồ sơ

    /* Lưu/ẩn/dùng lại một hợp đồng có thể ĐÁNH SỐ LẠI các bản khác của cùng
       người (nhập bù, ẩn bản lần 1...). Bản nào bị đẩy lên lần ≥ 3 là vi phạm
       giới hạn 2 lần của BLLĐ Đ.20 — phải báo, dù nó KHÔNG phải bản vừa nhập
       (N-5 · REV-0013). Dùng alert vì hộp #nsHd-nhac bị vẽ lại sau khi lưu. */
    function nhacDayLen3(kq) {
      const ds = kq && Array.isArray(kq.canh_bao_khac) ? kq.canh_bao_khac : [];
      if (!ds.length) return;
      alert('⚠️ Lượt này làm đổi số lần ký của hợp đồng KHÁC trong hồ sơ:\n\n'
        + ds.map(c => '  • ' + c).join('\n\n')
        + '\n\nMời anh/chị mở lại bảng hợp đồng của người này để rà.');
    }

    /* Đưa form về trạng thái "nhập bản mới": xoá id đang sửa, xoá ô lý do.
       KHÔNG tự điền sẵn loại hợp đồng — đoán hộ chỗ này là đoán hộ một quyết
       định pháp lý, để người nhập tự chọn. */
    function dongHoSoHopDongForm() {
      $('#nsHd-id').value = '';
      $('#nsHd-loai').value = '';
      $('#nsHd-phapnhan').value = 'cong_ty';
      $('#nsHd-batdau').value = '';
      $('#nsHd-hethan').value = '';
      $('#nsHd-sohd').value = '';
      $('#nsHd-lanthu').value = '—';
      $('#nsHd-lydo').value = '';
      $('#nsHd-fieldlydo').hidden = true;
      $('#nsHd-nutmoi').hidden = true;
      $('#nsHd-loi').textContent = '';
      $('#nsHd-nutluu').textContent = 'Lưu hợp đồng';
      capNhatNhacLoaiHd();
    }

    /* Nhắc tại chỗ theo loại hợp đồng vừa chọn + bật/tắt ô Ngày hết hạn cho
       khớp: "không xác định thời hạn" thì ô đó vô nghĩa, để hở là mời người
       ta điền vào rồi tự mâu thuẫn. */
    function capNhatNhacLoaiHd() {
      const loai = $('#nsHd-loai').value;
      const oNhac = $('#nsHd-nhac'), oHan = $('#nsHd-hethan');
      const khongHan = loai === 'khong_xac_dinh_th';
      oHan.disabled = khongHan;
      if (khongHan) oHan.value = '';
      $('#nsHd-fieldhethan').hidden = khongHan;

      if (loai === 'khoan_viec') {
        oNhac.hidden = false; oNhac.innerHTML = NHAC_KHOAN_HTML;
      } else if (loai === 'xac_dinh_th') {
        oNhac.hidden = false;
        oNhac.innerHTML = '<b>Bắt buộc có ngày hết hạn.</b> Loại này tối đa <b>36 tháng</b> ' +
          'một lần ký và chỉ được ký <b>2 lần liên tiếp</b> với cùng một người (BLLĐ 2019 Đ.20). ' +
          'Hết hạn mà quá <b>30 ngày</b> chưa ký lại thì luật tự coi là <b>không xác định thời hạn</b> — ' +
          'điều này không đảo ngược được.';
      } else {
        oNhac.hidden = true; oNhac.innerHTML = '';
      }
    }
    $('#nsHd-loai').addEventListener('change', capNhatNhacLoaiHd);
    $('#nsHd-nutmoi').addEventListener('click', dongHoSoHopDongForm);

    async function veHopDongHoSo(id) {
      NS_HD_DANG_MO = id;
      dongHoSoHopDongForm();
      let hop_dong = [];
      try { ({ hop_dong } = await API.nsHopDong(id)); } catch { /* im lặng — hộp vẫn dùng được */ }
      if (NS_HD_DANG_MO !== id) return;   // đã mở hồ sơ người khác trong lúc chờ

      veBang('#nsSua-hopdong', hop_dong, h => {
        const an = !h.hieu_luc;
        const han = h.ngay_het_han ? ngayIsoVN(h.ngay_het_han) : '—';
        const con = h.hieu_luc ? conBaoNhieuNgay(h.ngay_het_han) : null;
        let nhanHan = esc(han);
        if (con !== null && con < 0) nhanHan += ` <span class="tag danger">quá hạn</span>`;
        else if (con !== null && con <= 45) nhanHan += ` <span class="tag warn">còn ${con} ngày</span>`;
        /* "Lần" và "Số HĐ" xuống DÒNG PHỤ dưới "Loại" — 6 cột còn 4, đủ chỗ
           cho cột nút trong cửa sổ 588px. Dữ liệu KHÔNG mất: "lần thứ 2" là
           thông tin pháp lý (BLLĐ 2019 Đ.20) nên phải viết rõ chữ, không để
           trần một con số như cột cũ. */
        const phu = [
          h.loai === 'xac_dinh_th' ? `lần thứ ${esc(String(h.lan_thu || 1))}` : '',
          h.so_hd ? `số ${esc(h.so_hd)}` : ''
        ].filter(Boolean).join(' · ');
        return `<td class="sm">${esc(LOAI_HD_CHU[h.loai] || h.loai)}${an ? ' <span class="tag mute">đã ẩn</span>' : ''}` +
            (phu ? `<div class="sm">${phu}</div>` : '') + `</td>` +
          `<td class="sm">${esc(ngayIsoVN(h.ngay_bat_dau))}</td>` +
          `<td class="sm">${nhanHan}</td>` +
          `<td class="sm"><button type="button" class="btn-nho" data-hd-sua="${h.id}">Sửa</button> ` +
            `<button type="button" class="btn-nho btn-phu" data-hd-an="${h.id}" data-hd-hieuluc="${h.hieu_luc}">${an ? 'Dùng lại' : 'Ẩn'}</button></td>`;
      });
      $('#nsSua-hopdong-trong').hidden = hop_dong.length > 0;
      $('#nsSua-hopdong').dataset.ds = JSON.stringify(hop_dong);
    }

    $('#nsSua-hopdong').addEventListener('click', async e => {
      const bSua = e.target.closest('[data-hd-sua]');
      const bAn = e.target.closest('[data-hd-an]');
      if (bSua) {
        const ds = JSON.parse($('#nsSua-hopdong').dataset.ds || '[]');
        const h = ds.find(x => String(x.id) === bSua.dataset.hdSua);
        if (!h) return;
        $('#nsHd-id').value = h.id;
        $('#nsHd-loai').value = h.loai;
        capNhatNhacLoaiHd();
        $('#nsHd-phapnhan').value = h.phap_nhan || 'cong_ty';
        $('#nsHd-batdau').value = (h.ngay_bat_dau || '').slice(0, 10);
        $('#nsHd-hethan').value = (h.ngay_het_han || '').slice(0, 10);
        $('#nsHd-sohd').value = h.so_hd || '';
        $('#nsHd-lanthu').value = h.loai === 'xac_dinh_th' ? String(h.lan_thu || 1) : '—';
        // Lý do là của RIÊNG bản đang sửa — không được mang sang bản khác
        // (ISSUE-3 · REV-0009). Để sót lại thì máy chủ thấy `ly_do` khác rỗng
        // nên BỎ QUA toàn bộ cảnh báo Đ.20: cảnh báo im lặng biến mất, còn lý
        // do của bản A bị ghi vào `nhan_su_lich_su` làm căn cứ cho bản B.
        // (`#nsHd-nhac` KHÔNG đụng ở đây: `capNhatNhacLoaiHd()` gọi ngay phía
        //  trên đã ghi đè nó theo loại hợp đồng của bản B, nên hộp "Khoan đã"
        //  của bản A đã bị thay — hide thêm là xoá luôn lời nhắc hợp lệ.)
        $('#nsHd-lydo').value = '';
        $('#nsHd-fieldlydo').hidden = true;
        $('#nsHd-nutluu').textContent = 'Lưu thay đổi';
        $('#nsHd-nutmoi').hidden = false;
        $('#nsHd-loi').textContent = '';
        return;
      }
      if (bAn) {
        const dangHieuLuc = bAn.dataset.hdHieuluc === '1';
        const lyDo = prompt(dangHieuLuc
          ? 'Ẩn hợp đồng này vì sao? (bản ghi KHÔNG bị xoá, chỉ thôi không tính nữa)'
          : 'Dùng lại hợp đồng này vì sao?');
        if (!lyDo || !lyDo.trim()) return;
        try {
          const kqAn = await API.nsHopDongAn(parseInt(bAn.dataset.hdAn, 10), lyDo.trim());
          await veHopDongHoSo(NS_HD_DANG_MO);
          await taiLaiNhanSuQuanTri();
          nhacDayLen3(kqAn);
        } catch (err) {
          $('#nsHd-loi').textContent = err.message || 'Không đổi được, thử lại nhé.';
        }
      }
    });

    $('#nsHdForm').addEventListener('submit', async e => {
      e.preventDefault();
      const oLoi = $('#nsHd-loi'); oLoi.textContent = '';
      const nut = $('#nsHd-nutluu');
      if (!NS_HD_DANG_MO) return;
      nut.disabled = true;
      try {
        const kq = await API.nsHopDongLuu({
          id: $('#nsHd-id').value || null,
          nhan_su_id: NS_HD_DANG_MO,
          loai: $('#nsHd-loai').value,
          phap_nhan: $('#nsHd-phapnhan').value,
          ngay_bat_dau: $('#nsHd-batdau').value,
          ngay_het_han: $('#nsHd-hethan').value,
          so_hd: $('#nsHd-sohd').value,
          ly_do: $('#nsHd-lydo').value
        });
        // CHƯA lưu — máy chủ đòi một dòng lý do trước khi ghi bản vi phạm
        // BLLĐ Đ.20 vào hồ sơ. Chặn MỀM: gõ lý do rồi bấm lại là lưu được.
        if (kq && kq.can_ly_do) {
          $('#nsHd-fieldlydo').hidden = false;
          $('#nsHd-nhac').hidden = false;
          $('#nsHd-nhac').innerHTML = '<b>Khoan đã.</b><ul>' +
            kq.canh_bao.map(c => `<li>${esc(c)}</li>`).join('') +
            '</ul>Vẫn ký như vậy thì ghi một dòng lý do bên dưới rồi bấm Lưu lại — ' +
            'lý do sẽ được lưu vào lịch sử hồ sơ.';
          $('#nsHd-lydo').focus();
          return;
        }
        await veHopDongHoSo(NS_HD_DANG_MO);
        await taiLaiNhanSuQuanTri();
        nhacDayLen3(kq);
      } catch (err) {
        oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.';
      } finally {
        nut.disabled = false;
      }
    });

    /* ====================================================================
       GIẤY TỜ CỦA NGƯỜI NÀY  ·  CTL-0025 Đợt 2 — cửa vào HỒ SƠ NHÂN SỰ
       --------------------------------------------------------------------
       Sếp Ngọc 29/08/2026: *"cho tao thêm chỗ để scan bộ thông tin nhân sự
       lên nữa … lưu vào đây luôn THÀNH 1 BỘ là đẹp"*.

       MỘT KHO, HAI CỬA NHÌN. Khối này gọi ĐÚNG API của kho tài liệu, chỉ
       thêm `ganId` — không có bảng riêng, không có đường lưu riêng, không
       có bản chép tay nào của luật phân quyền. Giấy quét ở đây vẫn hiện ở
       tab Kho tài liệu và ngược lại.

       Lõi quét (chụp → nén → gộp trang → gửi lại khi sóng yếu) dùng NGUYÊN
       `quet-tai-lieu.js` của Đợt 1 — Đợt 2 không viết lại một dòng nào.

       ⚠️ RANH GIỚI CỨNG: quyền cắt ở MÁY CHỦ. `admin_backup` mở được hộp
       hồ sơ (có `them_nhan_su`) nhưng KHÔNG xem được nhóm `nhan_su` — máy
       chủ trả 403 và khối này nói thẳng ra, không vẽ một danh sách rỗng.
       ==================================================================== */
    let NS_GT_DANG_MO = null;         // id người đang mở, để câu trả lời chậm không lạc chủ
    let NS_GT_LOAI_GOI_Y = [];        // loại giấy tờ — MÁY CHỦ trả, không chép tay
    let NS_GT_QUET_DUOC = false;

    function nsGtNguoiQuet(idNguoi) {
      if (!idNguoi) return 'không rõ';
      const ng = DS_NHAN_SU_QT.find(x => x.id === idNguoi);
      return ng ? ng.ho_ten : idNguoi;
    }

    function nsGtMotThe(t) {
      const con = t.ngay_het_han ? conBaoNhieuNgay(t.ngay_het_han) : null;
      /* Đỏ CHỈ cho thứ đã hỏng (giấy quá hạn) — ngoại lệ duy nhất của luật ba
         màu. Sắp hết hạn dùng vàng nâu, vẫn trong họ nâu–cam. */
      const dai = con === null ? ''
        : con < 0 ? `<span class="tl-dai tl-dai-qua">Quá hạn ${-con} ngày</span>`
        : con <= 30 ? `<span class="tl-dai tl-dai-sap">Còn ${con} ngày</span>`
        : `<span class="tl-dai">Hết hạn ${esc(ngayIsoVN(t.ngay_het_han))}</span>`;
      return `
        <article class="tl-the">
          <div class="tl-the-dau">
            <b class="tl-ten">${esc(t.tieu_de)}</b>
            ${t.nhay_cam ? '<span class="tl-dai tl-dai-kin">Nhạy cảm</span>' : ''}
            ${dai}
          </div>
          <div class="tl-the-phu">
            ${esc(t.loai || 'chưa ghi loại')}
            ${t.so_hieu ? ' · ' + esc(t.so_hieu) : ''}
            ${t.ngay_ban_hanh ? ' · ban hành ' + esc(ngayIsoVN(t.ngay_ban_hanh)) : ''}
            · ${Number(t.so_trang) || 0} trang
            ${Number(t.ocr_so_trang) > Number(t.ocr_so_trang_neo || 0)
              ? `<span class="tl-dai tl-dai-sap">${Number(t.ocr_so_trang) - Number(t.ocr_so_trang_neo || 0)} trang chữ CHƯA KIỂM</span>`
              : ''}
          </div>
          <div class="tl-the-phu">
            Quét bởi <b>${esc(nsGtNguoiQuet(t.nguoi_tao))}</b>
            ${t.tao_luc ? ' lúc ' + esc(String(t.tao_luc).slice(0, 16)) : ''}
            ${t.han_luu ? ' · hạn lưu bản giấy: ' + esc(t.han_luu) : ''}
          </div>
          <div class="tl-the-nut">
            <a class="tl-nut-mo" href="/api/tai-lieu/tep?id=${encodeURIComponent(t.id)}"
               target="_blank" rel="noopener">Mở bản quét</a>
            ${/* Vá REV-0046 #4. Nhãn "n trang chữ CHƯA KIỂM" ngay phía trên chỉ
                  có nghĩa khi MỞ RA KIỂM ĐƯỢC — mà người vừa quét, đứng ngay ở
                  màn này, là người DUY NHẤT còn cầm tờ giấy để đối chiếu.
                  Dùng CHUNG hàm với tab Kho tài liệu, không chép bản hai. */''}
            ${nutXemChuTaiLieu(t.id)}
            ${/* Sửa số hiệu + tên SAU khi đã lưu — Sếp Ngọc 03/09/2026. Cùng
                  một hàm với tab Kho tài liệu, không chép bản hai. */''}
            ${nutSuaTaiLieu(t)}
          </div>
          ${oChuTaiLieu(t.id)}
          ${oSuaTaiLieu(t)}
        </article>`;
    }

    async function veGiayToHoSo(n) {
      const oDs = $('#nsGt-ds'), oTrong = $('#nsGt-trong'),
            oDem = $('#nsGt-dem'), oNut = $('#nsGt-quet');
      if (!oDs) return;
      NS_GT_DANG_MO = n.id;
      NS_GT_QUET_DUOC = false;
      oNut.hidden = true;                 // ẩn TRƯỚC, hiện lại chỉ khi máy chủ cho
      oDs.innerHTML = '';
      oDem.textContent = 'Đang mở bộ giấy tờ…';
      oTrong.hidden = true;
      veDaiCat('#nsGt-cat', null, {});

      let kq;
      try {
        kq = await API.tlDanhSach({ ganId: n.id });
      } catch (e) {
        if (NS_GT_DANG_MO !== n.id) return;
        oDem.textContent = '';
        oTrong.hidden = false;
        /* Nói THẲNG là không có quyền. Danh sách rỗng làm người ta tưởng người
           này chưa có giấy tờ nào rồi đi quét lại từ đầu. */
        oTrong.textContent = e.message || 'Không mở được bộ giấy tờ của người này.';
        return;
      }
      if (NS_GT_DANG_MO !== n.id) return;         // đã mở hồ sơ người khác

      NS_GT_LOAI_GOI_Y = kq.loai_goi_y || [];
      NS_GT_QUET_DUOC = kq.duoc_quet_nhan_su === true;
      oNut.hidden = !NS_GT_QUET_DUOC;
      /* Nhóm LƯU được do máy chủ trả — quyết định có bày nút "Sửa số & tên"
         hay không. Giao diện không tự đoán, máy chủ vẫn chặn lại lần nữa. */
      TL_NHOM_LUU_DUOC = kq.nhom_luu_duoc || [];

      const ds = kq.ds || [];
      oDs.innerHTML = ds.map(nsGtMotThe).join('');
      /* Cùng MỘT hàm bắt sự kiện với tab Kho tài liệu (vá REV-0046 #4) — hai
         cửa nhìn, một cỗ máy. */
      noiNutXemChu(oDs);
      noiNutSuaTaiLieu(oDs, () => veGiayToHoSo(n));
      oDem.textContent = ds.length
        ? `${ds.length} giấy tờ trong bộ${kq.bi_cat ? ' (đã cắt bớt)' : ''}`
        : '';
      oTrong.hidden = ds.length > 0;
      oTrong.textContent = NS_GT_QUET_DUOC
        ? 'Chưa có giấy tờ nào của người này. Bấm "Thêm giấy tờ" để chụp bằng máy ảnh, hoặc tải file ảnh/PDF có sẵn: quyết định, uỷ quyền, HĐLĐ, CCCD…'
        : 'Chưa có giấy tờ nào của người này.';
      veDaiCat('#nsGt-cat', kq.cat, {
        don_vi: 'giấy tờ',
        goi_y: 'Bộ giấy của người này đã quá dài — tra tiếp ở tab Kho tài liệu.'
      });
    }

    $('#nsGt-quet')?.addEventListener('click', () => {
      const id = NS_GT_DANG_MO;
      const n = id ? DS_NHAN_SU_QT.find(x => x.id === id) : null;
      if (!n || !NS_GT_QUET_DUOC) return;
      moQuetTaiLieu({
        cuaVao: 'nhan_su',
        ganId: n.id,
        /* Cửa này CHỈ có một nhóm — máy chủ khoá cứng `nhom='nhan_su'` cho cửa
           `nhan_su`, nên bày một màn chọn nhóm ở đây là bắt bấm thừa một cái.
           Tên nhóm và hạn lưu vẫn lấy từ máy chủ, không gõ tay vào đây. */
        nhom: (NS_GT_LOAI_GOI_Y.length ? [{
          ma: 'nhan_su', ten: 'Nhân sự',
          vi_du: NS_GT_LOAI_GOI_Y.map(l => l.ten).join(', '),
          han_luu: 'HĐLĐ 10 năm sau chấm dứt', nhay_cam: 1
        }] : []),
        boQuaChonNhom: true,
        loaiGoiY: NS_GT_LOAI_GOI_Y,
        tenGoiY: n.ho_ten ? n.ho_ten + ' — ' : '',
        /* Giấy tờ của ai thì người đó là người đồng ý. Điền sẵn TÊN thôi —
           "đồng ý cho mục đích gì" vẫn phải gõ, vì đó là chuyện phải hỏi thật. */
        dongYGoiY: n.ho_ten || '',
        khiXong: (kq) => {
          veGiayToHoSo(n);
          /* Dùng CHUNG `cauSauKhiQuet` với cửa kho chung — đó là chỗ `ocr_ghi_chu`
             được in ở CẢ HAI nhánh (vá REV-0044 · L1). Viết lại câu báo ở đây là
             dựng thêm một cửa nữa để quên in nó. */
          alert(`Vào bộ giấy tờ của ${n.ho_ten}.\n\n` + cauSauKhiQuet(kq) +
            '\n\n⚠️ Đây là BẢN DỰ PHÒNG. Đừng huỷ bản giấy gốc.' +
            '\n⚠️ TRẢ GIẤY lại cho nhân viên ngay — doanh nghiệp không được giữ bản gốc.');
        }
      });
    });

    function moHopSuaNhanSu(id) {
      const n = DS_NHAN_SU_QT.find(x => x.id === id);
      if (!n) return;
      if (n.trang_thai_dl === 'da_khoa' && !TOI.la_admin) {
        alert('Hồ sơ này đã khoá — cần Admin sửa hoặc mở khoá lại.');
        return;
      }
      veDauHoSo(n);
      veKhoiTaiKhoan(n);
      veLichSuHoSo(id);
      veHopDongHoSo(id);
      veCongTacSinhNhat(n);
      veGiayToHoSo(n);          // bộ giấy tờ của người này (CTL-0025 Đợt 2)
      veJdHoSo(n);
      veKnHoSo(n);
      $('#nsSua-id').value = n.id;
      $('#nsSua-hoten').value = n.ho_ten;
      $('#nsSua-sdt').value = n.sdt || '';
      $('#nsSua-email').value = n.email || '';
      $('#nsSua-trangthai').value = n.trang_thai || 'da_ky';
      // Đặt .value bằng mã KHÔNG kích hoạt sự kiện 'change' — phải bắn tay,
      // không thì mở hồ sơ một người đang Khoán sẽ không thấy lời nhắc nào.
      $('#nsSua-loailaodong').value = n.loai_lao_dong || 'toan_thoi_gian';
      $('#nsSua-loailaodong').dispatchEvent(new Event('change'));
      $('#nsSua-fieldmanv').hidden = !TOI.la_admin;
      $('#nsSua-manv').value = n.ma_nv || '';

      const oCd = $('#nsSua-chucdanh'), oPb = $('#nsSua-phongban');
      oCd.value = n.chuc_danh_id || '';
      oPb.value = n.phong_ban_id || '';
      ganCombo({
        hienThi: $('#nsSua-chucdanhhienthi'), panel: $('#nsSua-chucdanhpanel'),
        tim: $('#nsSua-chucdanhtim'), goiY: $('#nsSua-chucdanhgoiy'), giaTri: oCd
      }, () => dsCandidateDanhMuc(DS_CHUC_DANH, n.chuc_danh_id), null, 'Chọn chức danh...',
        { xuLyTao: API.dlnThemChucDanh, capNhatDs: window.LAM_MOI_DANHMUC_NEN });
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

    // Vẽ lại phần CHỈ ĐỌC (đầu hồ sơ + Tài khoản ERP) khi hộp đang mở đúng
    // người vừa có thay đổi tài khoản — KHÔNG đụng vào các ô đang sửa dở
    // trong form, tránh mất dữ liệu người dùng đang gõ (UI State Consistency,
    // ERP-CONSTITUTION.md Rule 7).
    window.LAM_MOI_HOSO_NHANSU = () => {
      if (nsSuaModal.hidden) return;
      const id = $('#nsSua-id').value;
      const n = DS_NHAN_SU_QT.find(x => x.id === id);
      if (!n) return;
      veDauHoSo(n);
      veKhoiTaiKhoan(n);
    };

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
        const kqSua = await API.qtSuaNhanSu(body);
        dongHopSuaNhanSu();
        await taiLaiNhanSuQuanTri();
        // Chuyển sang Khoán việc thì máy tự dọn ca — phải NÓI RA ngay, đừng
        // để người sửa đóng hộp rồi mới biết mất đăng ký (N-2 · REV-0013).
        const dc = kqSua && kqSua.don_ca;
        if (dc && (dc.da_huy_dang_ky || dc.con_da_duyet || dc.con_lich_lam_viec)) {
          alert(`Đã chuyển sang Khoán việc — máy đã dọn ca:\n\n`
            + `  • Huỷ ${dc.da_huy_dang_ky || 0} đăng ký ca còn chờ duyệt.\n`
            + `  • Còn ${dc.con_da_duyet || 0} đăng ký ĐÃ DUYỆT và ${dc.con_lich_lam_viec || 0} lịch làm việc sắp tới.\n\n`
            + `Hai mục sau máy KHÔNG tự xoá — trưởng phòng xem lại và xử lý tay nhé.\n`
            + `Toàn bộ đã ghi vào Lịch sử hồ sơ của người này.`);
        }
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

/* ==========================================================================
   GÓP Ý & CẢI TIẾN ERP — Employee = Action First (Gửi góp ý + Yêu cầu của
   tôi), Admin (Reviewer/Builder trong quy trình) = Exception First (khối
   "Cần xử lý" lên đầu, xem hết mọi góp ý, triage đổi trạng thái/loại).
   ========================================================================== */
async function khoiDongGopY() {
  /* laAd  = thấy MỌI góp ý (admin — anh Phong vẫn có, không đổi).
     coCoDuyet = được bấm DUYỆT/TỪ CHỐI Ở CẤP CUỐI (cờ tai_khoan.duyet_gopy —
     Sếp Ngọc chốt 28/08/2026 chỉ mình Sếp). Hai thứ TÁCH HẲN nhau: xem đủ
     mà không duyệt là đúng ý Sếp, không phải thiếu sót.
     Ẩn nút chỉ để khỏi mời người ta bấm vào một cái 403 — hàng rào thật nằm
     ở máy chủ (src/index.js gopYDuyet), giao diện không giữ được luật nào. */
  let dsGopY = [], laAd = false, coDuyet = false, toiLa = null;
  /* Hai cột PHỤ của bảng góp ý. Khai Ở ĐÂY, cùng chỗ với `laAd` — khai sau
     chỗ dùng là đúng cái bẫy đã giết tab Chat một lần (`Cannot access before
     initialization`). Cả hai do DỮ LIỆU quyết, không do vai trò:
       · Người gửi — hiện khi trong danh sách có dòng KHÔNG PHẢI của mình
         (Admin, và cả quản lý cấp 1 đang xem góp ý của nhân viên mình).
       · Rủi ro   — hiện khi có ít nhất một dòng thật sự CÓ mức rủi ro. Người
         gửi thường không bao giờ có (máy chủ đã cắt), nên cột đó với họ chỉ là
         một cột dấu gạch chiếm chỗ và đẩy Trạng thái ra ngoài khung nhìn. */
  let coCotNguoiGui = false, coCotRuiRo = false;

  // Khu vực/module — dùng lại đúng danh sách TAB đã có (Rule 5), khỏi tự
  // chế 1 danh mục song song rồi lệch tên với sidebar thật.
  $('#gy-khuvuc').insertAdjacentHTML('beforeend',
    TAB.filter(t => t.id !== 'gopy').map(t => `<option value="${t.id}">${esc(t.ten)}</option>`).join(''));
  $('#gyCtTrangThai').innerHTML = Object.entries(GOPY_TRANG_THAI)
    .map(([ma, tt]) => `<option value="${ma}">${esc(tt.chu)}</option>`).join('');

  const nutMo = $('#gy-nut-mo');
  /* CHỦ Ý: nút "✕ Đóng" chỉ THU form lại, GIỮ NGUYÊN bản nháp — cả chữ đang
     gõ dở lẫn ảnh đã dán. Mở lại là còn y nguyên.
     Chỉ nút "Hủy" mới xoá sạch (reset form + xoá ảnh).
     Đây là phương án (a) của REV-0002 lỗi #3: bản build trước KHAI SAI rằng
     "đóng form thì xoá ảnh". Hành vi thật là giữ nháp, và giữ nháp mới đúng
     Rule 12 (Human Cost) — bấm nhầm ✕ mà mất cả đoạn vừa gõ là quá đắt. */
  function dongMoForm(hien) {
    $('#gy-form-body').hidden = !hien;
    nutMo.textContent = hien ? '✕ Đóng' : '+ Gửi góp ý';
  }
  nutMo.addEventListener('click', () => dongMoForm($('#gy-form-body').hidden));
  $('#gy-nut-huy').addEventListener('click', () => { $('#gy-form').reset(); xoaAnhDinhKem(); dongMoForm(false); });

  /* ---- Đính kèm ảnh: DÁN (Ctrl+V) · KÉO THẢ · CHỌN TỆP -------------------
     Góp ý #1 của Sếp Ngọc (26/08/2026): "đoạn chat ko tiếp nhận ảnh chụp màn
     hình, muốn paste nhanh như chat trong Zalo", nói rõ thêm: "Ctrl+C, Ctrl+V
     cái là được luôn chứ không cần tìm file". Cột `gop_y.dinh_kem` đã có sẵn
     (base64, backend chặn ở 800KB) — đây chỉ THÊM đường vào, KHÔNG đổi
     backend, KHÔNG đổi schema, KHÔNG đụng danh sách/trạng thái góp ý.

     Ảnh sau khi nén được giữ trong biến `anhDinhKem` (data URL) — đúng cái
     sẽ gửi lên, đúng cái đang xem trước (thấy sao gửi vậy). Cả ba đường vào
     đổ về CÙNG hàm `nhanAnh()` nên không đá nhau. */
  const GOPY_ANH_TOI_DA = 780 * 1024;   // backend chặn 800KB (GOPY_DINH_KEM_TOI_DA) — chừa dư an toàn
  let anhDinhKem = null;                // data URL đã nén, hoặc null
  /* BỘ ĐẾM, không phải cờ boolean: `nhanAnh()` là hàm bất đồng bộ, dán ảnh A
     rồi dán ngay ảnh B thì hai lượt chạy chồng nhau — lượt A xong trước sẽ
     tắt cờ trong khi B còn đang nén, chốt chặn lúc bấm Gửi mất tác dụng.
     `luotAnh` là số thứ tự lượt: kết quả của lượt cũ bị bỏ, ảnh cuối cùng
     người dùng dán mới là ảnh được giữ. REV-0002 lỗi #5. */
  let dangXuLyAnh = 0;
  let luotAnh = 0;

  const vungDan = $('#gy-anh-dan'), oChonFile = $('#gy-anh');
  const khungXem = $('#gy-anh-xem'), hinhXem = $('#gy-anh-hinh');
  const coTin = $('#gy-anh-cotin'), oTrangThai = $('#gy-anh-tt');

  function baoAnh(chu, laLoi) {
    oTrangThai.textContent = chu || '';
    oTrangThai.classList.toggle('loi', !!laLoi);
    oTrangThai.hidden = !chu;
  }

  function xoaAnhDinhKem() {
    anhDinhKem = null;
    oChonFile.value = '';
    hinhXem.removeAttribute('src');
    khungXem.hidden = true;
    baoAnh('');
  }

  /* Báo lỗi ảnh: XOÁ ảnh đang giữ TRƯỚC rồi mới báo.
     Thứ tự này bắt buộc — `xoaAnhDinhKem()` có `baoAnh('')` bên trong, gọi
     ngược lại sẽ nuốt mất dòng báo lỗi.
     Vì sao phải xoá: bản trước chỉ báo đỏ mà giữ nguyên ảnh cũ, nên dán ảnh A
     thành công rồi dán tiếp ảnh B hỏng → màn hình báo "không phải ảnh" nhưng
     bấm Gửi thì ảnh A VẪN ĐI KÈM. Thấy sao gửi vậy. REV-0002 lỗi #2. */
  function loiAnh(chu) {
    xoaAnhDinhKem();
    baoAnh(chu, true);
  }

  /* Nhận 1 File/Blob ảnh từ bất kỳ đường nào (dán, kéo–thả, chọn tệp), nén
     cho lọt giới hạn rồi hiện xem trước ngay. Không bao giờ ném lỗi ra
     ngoài — báo tại chỗ bằng tiếng người. */
  async function nhanAnh(file) {
    const luot = ++luotAnh;   // lượt mới huỷ hiệu lực mọi lượt đang chạy dở
    if (!file || !/^image\//.test(file.type || '')) {
      loiAnh('Cái vừa dán/thả không phải ảnh. Chụp màn hình rồi dán lại nhé.');
      return;
    }
    dangXuLyAnh++;
    baoAnh('Đang xử lý ảnh…');
    try {
      const goc = file.size || 0;
      const nen = await nenAnhChung(file, {
        canhToiDa: 1600, chatLuong: 0.8, gioiHanByte: GOPY_ANH_TOI_DA
      });
      if (luot !== luotAnh) return;   // đã có ảnh mới hơn → bỏ kết quả này
      const co = coByteCuaDataUrl(nen);
      if (co > GOPY_ANH_TOI_DA) {
        // Rất hiếm (đã hạ chất lượng + thu nhỏ 6 vòng vẫn chưa lọt).
        loiAnh('Ảnh này nặng bất thường, thử chụp lại phần màn hình nhỏ hơn nhé.');
        return;
      }
      anhDinhKem = nen;
      hinhXem.src = nen;
      khungXem.hidden = false;
      coTin.textContent = 'Ảnh đính kèm · ' + Math.max(1, Math.round(co / 1024)) + ' KB';
      // Chỉ nói khi ảnh gốc thật sự vượt giới hạn — ảnh nào cũng khoe "đã nén"
      // thì thành tiếng ồn, người dùng thôi không đọc nữa.
      baoAnh(goc > GOPY_ANH_TOI_DA ? 'Ảnh hơi nặng nên đã tự nén lại, gửi bình thường.' : '');
    } catch (err) {
      if (luot !== luotAnh) return;
      loiAnh(err.message || 'Không đọc được ảnh này, thử ảnh khác nhé.');
    } finally {
      dangXuLyAnh--;
    }
  }

  function nhayVungDan() {
    vungDan.classList.add('dang-dan');
    setTimeout(() => vungDan.classList.remove('dang-dan'), 400);
  }

  /* Kéo–thả + chọn tệp: dùng tiện ích chung `ganVungThaTep()` ở đầu file.
     Bắt trên CẢ thân form đang mở, không riêng ô nhỏ — người dùng hay thả
     trượt ra ngoài vài chục pixel. Lưu ý: chỉ chặn được trong phạm vi
     `#gy-form-body`; thả ra vùng khác của trang thì trình duyệt vẫn tự mở
     tệp đó (REV-0002 ghi nhận N3 — sửa lời khai cho đúng, chưa chặn ở cấp
     `window` vì sẽ ảnh hưởng mọi màn hình khác). */
  ganVungThaTep({
    vungTha: $('#gy-form-body'),
    oChonFile,
    nutChon: $('#gy-anh-chon'),
    vungBamCamUng: vungDan,
    khiCoTep: nhanAnh
  });

  /* Ctrl+V: đăng ký với trọng tài dùng chung thay vì tự gắn listener trên
     `document` — bản trước gác mỗi `#v-gopy` nên cướp mất Ctrl+V của bong
     bóng Chat nội bộ (REV-0002 lỗi #4). Ưu tiên 10, thấp hơn Chat (20) vì
     Chat nổi CHỒNG LÊN màn hình Góp ý. */
  dangKyNhanAnhDan({
    vung: $('#gy-form-body'),
    dangBat: () => !$('#v-gopy').hidden && !$('#gy-form-body').hidden,
    nhan: (f) => { nhayVungDan(); nhanAnh(f); },
    uuTien: 10
  });

  $('#gy-anh-xoa').addEventListener('click', xoaAnhDinhKem);

  const GOPY_RISK_MAU  = { LOW: 'ok', MEDIUM: 'warn', HIGH: 'danger' };
  const GOPY_RISK_CHU  = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' };

  function gyMa(g)  { return 'GY-' + String(g.id).padStart(4, '0'); }
  function gyKhuVuc(g) { return g.khu_vuc ? ((TAB.find(t => t.id === g.khu_vuc) || {}).ten || g.khu_vuc) : ''; }

  /* Chip rủi ro. `risk` là mức ĐÃ CHỐT; chưa ai chốt thì hiện đề xuất của Hồ
     Ly ở dạng MỜ kèm 🦊 — người dùng phải phân biệt được "máy đoán" với "người
     đã quyết" (Rule 9). Đây là lần đầu de_xuat_risk hiện ra màn hình.

     KHÔNG lọc quyền ở đây: từ bản vá REV-0018, MÁY CHỦ đã ngừng gửi
     `risk`/`de_xuat_risk` cho người chỉ xem với tư cách người gửi
     (src/index.js — GOPY_RUOT_NOI_BO). Hai trường đó thành `undefined` →
     hàm trả CHUỖI RỖNG và để chỗ gọi tự quyết vẽ gì: ô bảng vẽ gạch ngang
     cho thẳng cột, thẻ thì để trắng. Không chip rỗng, không lỗi JS. Đây chỉ
     là lớp phòng thân — ranh giới quyền thật nằm ở máy chủ (BH-44). */
  function gyChipRisk(g) {
    if (g.risk) return `<span class="tag ${GOPY_RISK_MAU[g.risk] || 'mute'}">${GOPY_RISK_CHU[g.risk] || g.risk}</span>`;
    if (g.de_xuat_risk) return `<span class="tag mute gy-risk-mo" title="Hồ Ly đề xuất, chưa ai chốt">🦊 ${GOPY_RISK_CHU[g.de_xuat_risk] || g.de_xuat_risk}</span>`;
    return '';
  }

  /* "Đang chờ ai" — dịch mã kỹ thuật sang TÊN NGƯỜI THẬT. Người dùng không
     bao giờ nhìn thấy QL_CAP1/HOLY/KHIDOT (Rule 7). */
  function gyChoAi(g) {
    switch (g.next_owner) {
      case 'QL_CAP1':   return g.quan_ly_cap1_ten || 'Quản lý trực tiếp';
      case 'OWNER':     return 'Sếp (ERP Owner)';
      case 'NGUOI_GUI': return g.nguoi_gui_ten || 'Người gửi';
      case 'NONE':      return '—';
      default:          return 'Máy đang xử lý';
    }
  }

  /* ---- ĐƯỜNG TIẾN ĐỘ cho người gửi -------------------------------------
     Ba câu người gửi cần trả lời, không cần đọc chữ đoán:
       1. đang đứng ở chặng nào   2. ai đang giữ   3. bao lâu rồi
     Chỉ hiện TIẾN ĐỘ. Không nhánh code, không mức rủi ro nội bộ, không ghi
     chú riêng giữa quản lý với Sếp. */

  // "2 ngày trước" → "2 ngày", để ghép được câu "đã 2 ngày".
  function gyDaBaoLau(luc) {
    const s = thoiGianTruoc(luc);
    return s ? s.replace(/ trước$/, '') : '';
  }

  /* Vào chặng hiện tại từ lúc nào — lấy dòng nhật ký GẦN NHẤT chuyển ĐẾN
     trạng thái đang đứng. Không có nhật ký (góp ý chưa đổi trạng thái lần
     nào, ví dụ GY-0002 của chị Lan còn "moi") thì mốc là lúc gửi. */
  function gyMocChang(g, lichSu) {
    const d = (lichSu || []).filter(x => x.den_trang_thai === g.trang_thai && x.tu_trang_thai !== x.den_trang_thai);
    return d.length ? d[d.length - 1].luc : g.tao_luc;
  }

  function gyChiSoChang(trangThai) {
    const i = GOPY_CHANG.findIndex(c => c.ma.includes(trangThai));
    return i < 0 ? 1 : i;   // mã lạ thì coi như còn ở "Đang xem xét", không vẽ trống
  }

  function veTienDo(g, lichSu) {
    const khoi = $('#gyCtTienDoKhoi');
    khoi.hidden = false;

    const dung = GOPY_CHANG_DUNG[g.trang_thai];
    const iDay = dung ? dung.chang : gyChiSoChang(g.trang_thai);
    const xong = g.trang_thai === 'hoan_thanh';

    $('#gyCtTienDo').innerHTML = GOPY_CHANG.map((c, i) => {
      const lop = dung && i === iDay ? 'hong'
        : (i < iDay || (xong && i <= iDay)) ? 'qua'
        : i === iDay ? 'day' : '';
      const ten = dung && i === iDay ? dung.ten : c.ten;
      return `<div class="gy-td-chang ${lop}"><span class="gy-td-cham"></span>` +
             `<span class="gy-td-ten">${esc(ten)}</span></div>`;
    }).join('');

    const daLau = gyDaBaoLau(gyMocChang(g, lichSu));
    const canh = $('#gyCtTienDoCanh');
    canh.hidden = true;
    let chu;

    if (g.trang_thai === 'hoan_thanh') {
      chu = g.can_xac_minh_lai
        ? `Đã đánh dấu xong ${esc(daLau)} trước, nhưng <b>chưa có bằng chứng kèm theo</b> nên Sếp còn phải xác minh lại.`
        : `<b>Xong rồi.</b> Hoàn thành ${esc(daLau)} trước.`;
    } else if (g.trang_thai === 'bi_tu_choi') {
      chu = `Yêu cầu này <b>chưa được duyệt</b> (${esc(daLau)} trước).`;
      // Bị từ chối mà không biết vì sao thì lần sau người ta không gửi nữa.
      canh.hidden = false;
      canh.innerHTML = `<div><b>Vì sao chưa duyệt:</b> ${esc(g.ly_do_tu_choi || 'Người duyệt chưa ghi lý do — bạn hỏi lại giúp.')}</div>` +
        `<div class="sm" style="margin-top:4px">Bạn <b>sửa lại rồi gửi lại được</b> — mở góp ý này, bổ sung cho rõ rồi bấm “Gửi lại”.</div>`;
    } else if (g.trang_thai === 'bi_chan') {
      chu = `Yêu cầu này <b>đang vướng</b>, tạm dừng ${esc(daLau)} nay.`;
      canh.hidden = false;
      canh.innerHTML = `<div><b>Đang vướng gì:</b> ${esc(g.ly_do_tu_choi || 'Chưa ghi rõ — bạn hỏi lại người phụ trách giúp.')}</div>`;
    } else if (g.trang_thai === 'da_huy') {
      chu = `Yêu cầu này <b>đã huỷ</b> ${esc(daLau)} trước.`;
    } else if (g.next_owner === 'NGUOI_GUI' && g.nguoi_gui_id === toiLa) {
      // Đừng nói "Đang chờ Nguyễn Văn A" với chính Nguyễn Văn A.
      chu = `<b>Đang chờ bạn</b> — bóng đang ở sân bạn · đã ${esc(daLau)}`;
    } else if (['HOLY', 'KHIDOT', 'GAO', 'RUNNER'].includes(g.next_owner)) {
      // Máy đang cầm việc: nói đúng là máy, nhưng đừng ghép thành câu cụt
      // "Đang chờ Máy đang xử lý". Không nêu tên Agent nội bộ (Rule 7).
      chu = `<b>Đang được xử lý tự động</b> · đã ${esc(daLau)}`;
    } else {
      chu = `Đang chờ <b>${esc(gyChoAi(g))}</b> · đã ${esc(daLau)}`;
    }
    $('#gyCtTienDoChu').innerHTML = chu;
  }

  function gyTickCong(g) {
    const t1 = g.duyet_cap1_luc ? '<span class="gy-tick" title="Quản lý đã duyệt">✓QL</span>' : '';
    const t2 = g.duyet_owner_luc ? '<span class="gy-tick" title="Sếp đã duyệt">✓Sếp</span>' : '';
    return t1 + t2;
  }

  function gyNhanTrangThai(g) {
    const tt = GOPY_TRANG_THAI[g.trang_thai] || GOPY_TRANG_THAI.moi;
    // Hoàn thành mà không có bằng chứng thì KHÔNG được hiện màu xanh — nói
    // đúng sự thật ngay cả trước khi Sếp soát xong (bằng chứng: góp ý #1).
    if (g.trang_thai === 'hoan_thanh' && g.can_xac_minh_lai)
      return '<span class="tag mute" title="Chưa có link PR/commit nào chứng minh">Hoàn thành (cần xác minh lại)</span>';
    return `<span class="tag ${tt.mau}">${esc(tt.chu)}</span>`;
  }

  /* "đã chờ N ngày" — người gửi hỏi ba câu, câu thứ ba là "bao lâu rồi".
     `so_ngay_cho` do MÁY CHỦ tính (số ngày đứng yên ở chặng hiện tại) và đã
     trả sẵn cho người gửi từ trước; giao diện chưa bao giờ dùng tới nó.
     Việc đã đóng thì không còn chờ ai — đừng nói "đã 9 ngày" với một góp ý
     đã hoàn thành. */
  function gyDaCho(g) {
    if (['hoan_thanh', 'da_huy', 'bi_tu_choi'].includes(g.trang_thai)) return '';
    if (g.next_owner === 'NONE') return '';
    const n = Number(g.so_ngay_cho);
    if (!Number.isFinite(n) || n < 0) return '';
    return `<div class="sm gy-dacho${n >= 3 ? ' tre' : ''}">` +
           (n === 0 ? 'từ hôm nay' : `đã ${n} ngày`) + `</div>`;
  }

  /* Lý do — hiện NGAY TRÊN DANH SÁCH, không bắt mở modal mới biết vì sao.
     `ly_do_tu_choi` là lý do CÔNG KHAI, máy chủ vẫn gửi cho người gửi (nằm
     ngoài GOPY_RUOT_NOI_BO). Mức rủi ro, link PR, ghi chú riêng của quản lý
     thì KHÔNG — đã bị cắt ở máy chủ và tuyệt đối không bày ra đây. */
  function gyLyDo(g) {
    if (g.trang_thai === 'bi_tu_choi')
      return `<div class="sm gy-lydo">Chưa duyệt vì: ${esc(g.ly_do_tu_choi || 'chưa ghi lý do — hỏi lại người duyệt giúp')}</div>`;
    if (g.trang_thai === 'bi_chan')
      return `<div class="sm gy-lydo">Đang vướng: ${esc(g.ly_do_tu_choi || 'chưa ghi rõ — hỏi lại người phụ trách giúp')}</div>`;
    return '';
  }

  /* THỨ TỰ CỘT LÀ MỘT QUYẾT ĐỊNH, KHÔNG PHẢI THÓI QUEN.
     Bảng này rộng 932px; trên máy 900px khung nhìn của nó chỉ còn 594px (thanh
     bên chiếm chỗ). Bản cũ xếp Trạng thái ở ô thứ 6 → mép phải 681px → NGƯỜI
     GỬI KHÔNG THẤY TRẠNG THÁI nếu không kéo ngang, mà thứ họ thấy ngay trước
     mép lại là cột "Rủi ro" toàn dấu gạch (máy chủ đã cắt `risk` của họ ở
     REV-0020). Đó đúng là lỗi Sếp Ngọc báo 29/08/2026.
     Nay: Trạng thái + Đang chờ ai đứng NGAY SAU Tiêu đề (mép phải 475px) —
     hai cột phụ (Người gửi · Rủi ro) lùi xuống sau và CHỈ HIỆN KHI CÓ DỮ LIỆU
     THẬT. Sửa thứ tự ở đây phải sửa cả <thead> trong app.html — bàn đo
     `npm run do-trangthai-nguoigui` đếm ô tiêu đề với ô thân, lệch là đỏ. */
  function veDongGopY(g) {
    return `<tr data-id="${g.id}">` +
      `<td class="sm">${gyMa(g)}</td>` +
      `<td><div class="nm">${esc(g.tieu_de)}</div>` +
        `${g.khu_vuc ? `<div class="sm">${esc(gyKhuVuc(g))}</div>` : ''}${gyLyDo(g)}</td>` +
      `<td>${gyNhanTrangThai(g)} ${gyTickCong(g)}</td>` +
      `<td class="sm">${esc(gyChoAi(g))}${gyDaCho(g)}</td>` +
      (coCotNguoiGui ? `<td class="sm">${esc(g.nguoi_gui_ten)}<div class="sm">${esc(g.nguoi_gui_bo_phan || '')}</div></td>` : '') +
      `<td class="sm">${thoiGianTruoc(g.tao_luc)}</td>` +
      (coCotRuiRo ? `<td>${gyChipRisk(g) || '<span class="sm">—</span>'}</td>` : '') +
      `<td><button type="button" class="btn-nho" data-gyxem="${g.id}">Xem</button></td></tr>`;
  }

  /* Thẻ — dùng cho panel "Chờ tôi duyệt" (mọi kích thước) và cho danh sách
     trên điện thoại. `coNut` bật 2 nút to chạm được bằng ngón cái: việc rủi
     ro thấp không bắt mở modal mới duyệt được. */
  function veTheGopY(g, coNut) {
    return `<div class="gy-the" data-id="${g.id}">` +
      `<div class="gy-the-dau">` +
        (coNut ? `<label class="gy-the-chon"><input type="checkbox" class="gy-chon" value="${g.id}"></label>` : '') +
        `<span class="sm">${gyMa(g)}</span>${gyChipRisk(g)}</div>` +
      `<div class="nm gy-the-ten" data-gyxem="${g.id}">${esc(g.tieu_de)}</div>` +
      `<div class="sm">${gyNhanTrangThai(g)} · Chờ: ${esc(gyChoAi(g))} · ${thoiGianTruoc(g.tao_luc)}</div>` +
      // Trên điện thoại thẻ này LÀ danh sách — nên nó phải trả lời đủ ba câu
      // của người gửi (đang ở đâu · ai giữ · bao lâu) và nói luôn lý do nếu
      // việc bị dừng. Không bắt mở modal mới biết.
      gyDaCho(g) + gyLyDo(g) +
      (coCotNguoiGui || coNut ? `<div class="sm">${esc(g.nguoi_gui_ten)}${g.nguoi_gui_bo_phan ? ' — ' + esc(g.nguoi_gui_bo_phan) : ''}</div>` : '') +
      (coNut
        ? `<div class="gy-the-nut">` +
            `<button type="button" class="btn-primary btn-nho" data-gyduyet="${g.id}">Duyệt</button>` +
            `<button type="button" class="btn-phu btn-nho" data-gyxem="${g.id}">Xem / Chưa duyệt</button></div>`
        : '') +
      `</div>`;
  }

  function veDs(sel, ds, coNut) { $(sel).innerHTML = ds.map(g => veTheGopY(g, coNut)).join(''); }

  /* Thẻ HOÀN TÁC — Sếp là người DUY NHẤT duyệt cấp cuối và duyệt trên điện
     thoại, nên bấm nhầm phải sửa được ngay bằng chính ngón tay đó, không đi
     tìm menu. Cửa sổ 15 phút và luật "việc chưa đi tiếp" do máy chủ quyết
     (gop_y.hoan_tac_duoc), giao diện chỉ vẽ lại. */
  function veTheHoanTac(g) {
    return `<div class="gy-the" data-id="${g.id}">` +
      `<div class="gy-the-dau"><span class="sm">${gyMa(g)}</span>${gyNhanTrangThai(g)}</div>` +
      `<div class="nm gy-the-ten" data-gyxem="${g.id}">${esc(g.tieu_de)}</div>` +
      `<div class="sm">Bạn vừa xử lý — bấm nhầm thì hoàn lại được trong 15 phút.</div>` +
      `<div class="gy-the-nut">` +
        `<button type="button" class="btn-phu btn-nho" data-gyhoantac="${g.id}">↩︎ Hoàn tác</button>` +
      `</div></div>`;
  }

  /* Ai đang được CHỜ ở bản ghi này — dùng để bật panel "Chờ tôi duyệt".
     Chỉ là gợi ý giao diện; luật thật nằm ở backend (gopYDuyet). */
  function gyDangChoToi(g) {
    if (!['moi', 'cho_quyet_dinh'].includes(g.trang_thai)) return false;
    // Cấp cuối đi theo CỜ DUYỆT, không theo `laAd` nữa — nếu vẫn dùng laAd
    // thì anh Phong thấy panel "Chờ tôi duyệt" đầy việc mà bấm cái nào cũng
    // 403. Ẩn nút vì nó vô nghĩa với anh, KHÔNG phải vì nó là hàng rào.
    if (g.next_owner === 'OWNER') return coDuyet;
    if (g.next_owner === 'QL_CAP1') return g.quan_ly_cap1_id === toiLa || coDuyet;
    return false;
  }

  async function taiLai() {
    let kq;
    try { kq = await API.gopYDanhSach(); } catch { return; }
    dsGopY = kq.gop_y || [];
    laAd = !!kq.la_admin;
    coDuyet = !!kq.duyet_gopy;
    toiLa = kq.toi_la || null;

    /* Bật/tắt hai cột phụ TRƯỚC khi vẽ thân bảng — cùng một biểu thức quyết
       định cả <th> lẫn <td>, nên tiêu đề và thân không thể lệch nhau. */
    coCotNguoiGui = laAd || dsGopY.some(g => g.nguoi_gui_id !== toiLa);
    coCotRuiRo    = dsGopY.some(g => g.risk || g.de_xuat_risk);
    $('#gy-cot-nguoigui').hidden = !coCotNguoiGui;
    $('#gy-cot-ruiro').hidden = !coCotRuiRo;
    $('#gy-danhsach-tieude').textContent = laAd ? 'Tất cả góp ý' : 'Yêu cầu của tôi';

    // Vừa bấm nhầm? Panel hoàn tác nổi lên trên cùng, không phải đi tìm.
    const hoanTac = dsGopY.filter(g => g.hoan_tac_duoc);
    $('#gy-hoantac-panel').hidden = hoanTac.length === 0;
    $('#gy-hoantac-ds').innerHTML = hoanTac.map(veTheHoanTac).join('');

    // Panel rỗng thì ẨN HẲN, không để khoảng trống vô nghĩa (Exception First).
    const choDuyet = dsGopY.filter(gyDangChoToi);
    $('#gy-choduyet-panel').hidden = choDuyet.length === 0;
    $('#gy-choduyet-tieude').textContent = `Chờ tôi duyệt (${choDuyet.length})`;
    $('#gy-duyetlo').hidden = choDuyet.length < 2;
    veDs('#gy-choduyet-ds', choDuyet, true);

    /* "Quá hạn duyệt" là panel ĐỂ BIẾT, không phải để bấm — nên người xem
       được cả kho góp ý (admin) vẫn thấy đủ, kể cả việc mình không duyệt.
       Anh Phong mất nút duyệt chứ không mất tầm nhìn: cắt luôn panel này
       của anh mới là cắt quá tay. */
    const dangChoDuyet = (g) => ['moi', 'cho_quyet_dinh'].includes(g.trang_thai);
    const quaHan = (laAd ? dsGopY.filter(dangChoDuyet) : choDuyet)
      .filter(g => (g.so_ngay_cho || 0) >= 3);
    $('#gy-quahan-panel').hidden = quaHan.length === 0;
    $('#gy-quahan-tieude').textContent = `Quá hạn duyệt (${quaHan.length})`;
    veDs('#gy-quahan-ds', quaHan, false);

    const xacMinh = laAd ? dsGopY.filter(g => g.can_xac_minh_lai) : [];
    $('#gy-xacminh-panel').hidden = xacMinh.length === 0;
    $('#gy-xacminh-tieude').textContent = `Cần xác minh lại (${xacMinh.length})`;
    veDs('#gy-xacminh-ds', xacMinh, false);

    $('#gy-bang').innerHTML = dsGopY.map(veDongGopY).join('');
    veDs('#gy-the-ds', dsGopY, false);
    $('#gy-trong').hidden = dsGopY.length > 0;
  }

  // Duyệt thẳng từ thẻ — 1 thao tác cho việc rủi ro thấp.
  document.addEventListener('click', async (e) => {
    const nut = e.target.closest('[data-gyduyet]');
    if (!nut || $('#v-gopy').hidden) return;
    nut.disabled = true;
    $('#gy-duyet-loi').textContent = '';
    try {
      await API.gopYDuyet({ id: parseInt(nut.getAttribute('data-gyduyet'), 10), quyet_dinh: 'duyet' });
      await taiLai();
    } catch (err) {
      $('#gy-duyet-loi').textContent = err.message || 'Không duyệt được, thử lại nhé.';
      nut.disabled = false;
    }
  });

  // Hoàn tác — cũng 1 chạm, cũng tự tải lại danh sách, không reload trang.
  document.addEventListener('click', async (e) => {
    const nut = e.target.closest('[data-gyhoantac]');
    if (!nut || $('#v-gopy').hidden) return;
    nut.disabled = true;
    $('#gy-duyet-loi').textContent = '';
    try {
      await API.gopYHoanTac(parseInt(nut.getAttribute('data-gyhoantac'), 10));
      await taiLai();
    } catch (err) {
      $('#gy-duyet-loi').textContent = err.message || 'Không hoàn tác được.';
      nut.disabled = false;
    }
  });

  // Duyệt hàng loạt — 3 thao tác cho cả lô thay vì 45 thao tác cho 15 việc.
  // Backend vẫn kiểm từng cái một, gồm cả luật cấm hạ mức rủi ro.
  $('#gy-duyetlo').addEventListener('click', async () => {
    const ids = [...document.querySelectorAll('#gy-choduyet-ds .gy-chon:checked')].map(o => parseInt(o.value, 10));
    if (!ids.length) { $('#gy-duyet-loi').textContent = 'Chọn ít nhất 1 mục trước đã.'; return; }
    const nut = $('#gy-duyetlo'); nut.disabled = true;
    $('#gy-duyet-loi').textContent = '';
    try {
      await API.gopYDuyet({ ids, quyet_dinh: 'duyet' });
      await taiLai();
    } catch (err) {
      $('#gy-duyet-loi').textContent = err.message || 'Không duyệt được, thử lại nhé.';
    } finally { nut.disabled = false; }
  });

  $('#gy-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#gy-loi').textContent = '';
    const nut = $('#gy-nut-gui');
    // Ảnh đã được nén xong ngay lúc dán/chọn, chỉ chặn trường hợp bấm Gửi
    // đúng lúc máy còn đang nén — tránh gửi đi mà mất ảnh.
    if (dangXuLyAnh > 0) {
      $('#gy-loi').textContent = 'Đang xử lý ảnh, chờ một chút rồi bấm Gửi nhé.';
      return;
    }
    nut.disabled = true;
    try {
      await API.gopYGui({
        tieu_de: $('#gy-tieude').value.trim(),
        boi_canh: $('#gy-boicanh').value.trim(),
        vuong_o_dau: $('#gy-vuong').value.trim(),
        mong_muon: $('#gy-mongmuon').value.trim(),
        tan_suat: $('#gy-tansuat').value || null,
        khu_vuc: $('#gy-khuvuc').value || null,
        dinh_kem: anhDinhKem
      });
      $('#gy-form').reset();
      // form.reset() KHÔNG biết tới ảnh đang giữ trong biến — phải xoá tay,
      // nếu không góp ý sau sẽ vô tình đính kèm lại ảnh của góp ý trước.
      xoaAnhDinhKem();
      dongMoForm(false);
      await taiLai();
    } catch (err) {
      $('#gy-loi').textContent = err.message || 'Không gửi được, thử lại nhé.';
    } finally {
      nut.disabled = false;
    }
  });

  // Modal chi tiết — dùng chung cho cả bảng "Cần xử lý" lẫn bảng chính
  // (event delegation trên document, khỏi gắn listener riêng từng bảng).
  const modal = $('#gyChiTietModalNen');
  async function moChiTiet(id) {
    const g = dsGopY.find(x => x.id === id);
    if (!g) return;

    $('#gyCtTieuDe').textContent = g.tieu_de;
    $('#gyCtNguoiGui').textContent = `${g.nguoi_gui_ten} · ${thoiGianTruoc(g.tao_luc)}`;
    $('#gyCtBoiCanh').textContent = g.boi_canh;
    $('#gyCtVuong').textContent = g.vuong_o_dau;
    $('#gyCtMongMuon').textContent = g.mong_muon;
    const meta = [];
    if (g.tan_suat) meta.push('Tần suất: ' + (GOPY_TAN_SUAT[g.tan_suat] || g.tan_suat));
    if (g.loai) meta.push('Phân loại: ' + (GOPY_LOAI[g.loai] || g.loai));
    if (g.nguoi_phu_trach_ten) meta.push('Phụ trách: ' + g.nguoi_phu_trach_ten);
    $('#gyCtMeta').textContent = meta.join(' · ');

    const anh = $('#gyCtAnh');
    anh.hidden = !g.co_dinh_kem;
    if (g.co_dinh_kem) anh.src = '/api/gop-y/anh?id=' + encodeURIComponent(g.id) + '&v=' + Date.now();

    // ---- Đường duyệt: ai đã gật, đang chờ ai --------------------------
    const buoc = [];
    if (g.duyet_cap1_luc) {
      const NGUON = {
        QUAN_LY_ID: 'quản lý trực tiếp', TRUONG_PHONG_ID: 'trưởng phòng',
        KHONG_CO_QUAN_LY: 'không có quản lý trực tiếp — bỏ qua cổng 1',
        // Hai lý do khác nhau, việc phải làm khác nhau: cái trên là việc của
        // Sếp, cái dưới là hồ sơ nhân sự còn thiếu — HCNS bổ sung là hết.
        CHUA_XEP_PHONG_BAN: 'hồ sơ chưa xếp phòng ban — HCNS bổ sung giúp',
        OWNER_VUOT_CAP: 'Sếp duyệt VƯỢT CẤP', TU_DUYET_OWNER: 'Sếp tự gửi, tự duyệt',
        QUA_HAN_LEN_OWNER: 'quá hạn ở cấp quản lý — Sếp duyệt thay'
      };
      buoc.push(`✓ Cấp 1: ${esc(g.duyet_cap1_ten || '—')} (${NGUON[g.duyet_cap1_nguon] || g.duyet_cap1_nguon})`);
    }
    if (g.duyet_owner_luc) buoc.push(`✓ Sếp: ${esc(g.duyet_owner_ten || '—')}`);
    buoc.push(`Đang chờ: <b>${esc(gyChoAi(g))}</b>`);
    // RUỘT — chỉ người đang cầm việc mới cần: mức rủi ro nội bộ và link
    // PR/commit (lộ nhánh code). Người gửi xem tiến độ, không xem ruột.
    const xemRuot = laAd || gyDangChoToi(g);
    if (xemRuot && g.risk) buoc.push(`Rủi ro đã chốt: ${GOPY_RISK_CHU[g.risk] || g.risk}`);
    if (g.so_lan_gui_lai) buoc.push(`Đã gửi lại ${g.so_lan_gui_lai} lần`);
    if (xemRuot && g.bang_chung_url) buoc.push(`Bằng chứng: ${esc(g.bang_chung_url)}`);
    $('#gyCtDuongDuyet').innerHTML = buoc.join(' · ');
    $('#gyCtLyDoTuChoi').hidden = !(g.trang_thai === 'bi_tu_choi' && g.ly_do_tu_choi);
    $('#gyCtLyDoTuChoi').textContent = g.ly_do_tu_choi ? 'Chưa duyệt vì: ' + g.ly_do_tu_choi : '';

    // ---- Cổng duyệt — chỉ hiện với đúng người đang được chờ ------------
    const duyetKhoi = $('#gyCtDuyetKhoi');
    duyetKhoi.hidden = !gyDangChoToi(g);
    if (!duyetKhoi.hidden) {
      $('#gyCtRisk').value = g.risk || g.de_xuat_risk || 'MEDIUM';
      $('#gyCtGhiChuDuyet').value = '';
      $('#gyCtDuyetLoi').textContent = '';
      // Câu nhắc "chỉ được nâng" chỉ đúng với quản lý — Sếp hạ được, đừng
      // dặn Sếp một luật không áp cho Sếp.
      $('#gyCtRiskGoiY').textContent = !g.de_xuat_risk ? ''
        : (laAd ? `🦊 Hồ Ly chấm ${GOPY_RISK_CHU[g.de_xuat_risk]}.`
                : `🦊 Hồ Ly chấm ${GOPY_RISK_CHU[g.de_xuat_risk]}. Bạn chỉ NÂNG lên được — muốn hạ phải Sếp.`);
      $('#gyCtDuyetTieuDe').textContent = g.trang_thai === 'cho_quyet_dinh'
        ? 'Ghi quyết định rồi cho làm (rủi ro CAO)'
        : (g.next_owner === 'OWNER' ? 'Duyệt (ERP Owner)' : 'Duyệt (quản lý trực tiếp)');
    }

    const triageKhoi = $('#gyCtTriageKhoi');
    triageKhoi.hidden = !laAd;
    if (laAd) {
      $('#gyCtTrangThai').value = g.trang_thai;
      $('#gyCtLoai').value = g.loai || '';
      $('#gyCtGhiChu').value = '';
      $('#gyCtTriageLoi').textContent = '';
      $('#gyCtBangChung').value = g.bang_chung_url || '';
      $('#gyCtBangChungO').hidden = false;
    }

    // Đề xuất Hồ Ly (AI, chế độ nháp) — chỉ Admin thấy, chỉ có ý nghĩa khi
    // góp ý còn "Mới gửi" (đã triage tay/tự động rồi thì đề xuất cũ hết giá trị).
    const deXuatBox = $('#gyCtDeXuatKhoi'), choXuLy = $('#gyCtDeXuatChoXuLy');
    if (laAd && g.trang_thai === 'moi' && g.de_xuat_trang_thai) {
      deXuatBox.hidden = false; choXuLy.hidden = true;
      const RISK_MAU = { LOW: 'ok', MEDIUM: 'warn', HIGH: 'danger' };
      const RISK_NHAN = { LOW: 'Risk: Thấp', MEDIUM: 'Risk: Trung bình', HIGH: 'Risk: Cao' };
      $('#gyCtDeXuatRisk').className = 'tag ' + (RISK_MAU[g.de_xuat_risk] || 'mute');
      $('#gyCtDeXuatRisk').textContent = RISK_NHAN[g.de_xuat_risk] || g.de_xuat_risk || '—';
      $('#gyCtDeXuatLoai').textContent = GOPY_LOAI[g.de_xuat_loai] || 'Chưa rõ phân loại';
      $('#gyCtDeXuatLyDo').textContent = g.de_xuat_ly_do || '';
      $('#gyCtDeXuatSpec').textContent = g.de_xuat_spec || '';
    } else if (laAd && g.trang_thai === 'moi') {
      deXuatBox.hidden = true; choXuLy.hidden = false;
    } else {
      deXuatBox.hidden = true; choXuLy.hidden = true;
    }

    $('#gyCtLichSu').innerHTML = '<div class="sm">Đang tải…</div>';
    // Vẽ ngay đường tiến độ với mốc "lúc gửi" — người gửi thấy mình đang ở
    // đâu trước cả khi nhật ký tải xong; có nhật ký rồi thì vẽ lại cho đúng
    // mốc vào chặng. Nhật ký hỏng cũng không mất đường tiến độ.
    veTienDo(g, null);
    modal.hidden = false;

    try {
      const { lich_su } = await API.gopYLichSu(id);
      veTienDo(g, lich_su);
      // Dòng do MÁY ghi KHÔNG có tên người — hiện biểu tượng máy + tác nhân
      // + "(uỷ quyền: ...)". Người dùng không bao giờ thấy tên một người cho
      // hành động người đó không làm (Rule 7, Rule 9).
      const aiLam = ls => ls.nguoi_thuc_hien_loai === 'nguoi'
        ? esc(ls.nguoi_doi_ten || 'Người dùng cũ')
        : `⚙️ ${esc(ls.tac_nhan || 'Hệ thống')}${ls.uy_quyen_ten ? ` (uỷ quyền: ${esc(ls.uy_quyen_ten)})` : ''}`;
      $('#gyCtLichSu').innerHTML = (lich_su || []).length
        ? lich_su.map(ls => `<div class="sm" style="margin-bottom:4px">` +
            // tu === den: dòng ghi việc DUYỆT / SLA đẩy cấp — không phải đổi
            // trạng thái, đừng vẽ "Chờ duyệt → Chờ duyệt" cho rối mắt.
            (ls.tu_trang_thai === ls.den_trang_thai
              ? `${aiLam(ls)}`
              : `${aiLam(ls)} đổi ` +
                `${ls.tu_trang_thai ? `<b>${esc((GOPY_TRANG_THAI[ls.tu_trang_thai] || {}).chu || ls.tu_trang_thai)}</b> → ` : ''}` +
                `<b>${esc((GOPY_TRANG_THAI[ls.den_trang_thai] || {}).chu || ls.den_trang_thai)}</b>`) +
            `${ls.ghi_chu ? ` — ${esc(ls.ghi_chu)}` : ''} · ${thoiGianTruoc(ls.luc)}</div>`).join('')
        : '<div class="sm">Chưa có thay đổi trạng thái nào.</div>';
    } catch {
      $('#gyCtLichSu').innerHTML = '<div class="sm">Không tải được lịch sử.</div>';
    }

    modal.dataset.id = id;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gyxem]');
    if (btn) moChiTiet(parseInt(btn.getAttribute('data-gyxem'), 10));
  });
  $('#gyCtDong').addEventListener('click', () => { modal.hidden = true; });

  // "Áp dụng đề xuất" CHỈ điền sẵn form triage — không tự gọi API, không tự
  // đổi trạng thái thật. Admin vẫn phải tự bấm "Lưu" bên dưới mới thật sự
  // áp dụng (đúng API gopYDoiTrangThai() có backend enforce quyền sẵn có).
  $('#gyCtApDung').addEventListener('click', () => {
    const id = parseInt(modal.dataset.id, 10);
    const g = dsGopY.find(x => x.id === id);
    if (!g) return;
    // Từ SPEC-0002 đề xuất của Hồ Ly rót vào CỔNG DUYỆT (mức rủi ro + ghi
    // chú), không rót thẳng vào ô trạng thái nữa — trạng thái nay chỉ đi qua
    // cổng duyệt, không ai nhảy cóc được.
    if (!$('#gyCtDuyetKhoi').hidden) {
      if (g.de_xuat_risk) $('#gyCtRisk').value = g.de_xuat_risk;
      $('#gyCtGhiChuDuyet').value = '🦊 Hồ Ly (AI) đề xuất: ' + (g.de_xuat_ly_do || '');
      $('#gyCtGhiChuDuyet').focus();
    }
    $('#gyCtLoai').value = g.de_xuat_loai || '';
  });

  /* Duyệt / Chưa duyệt trong modal. Giao diện chỉ gom dữ liệu — mọi luật
     (ai được bấm, cấm hạ rủi ro, vượt cấp phải ghi lý do) enforce ở backend. */
  async function gyGuiDuyet(quyetDinh) {
    const id = parseInt(modal.dataset.id, 10);
    const oLoi = $('#gyCtDuyetLoi');
    oLoi.textContent = '';
    const ghiChu = $('#gyCtGhiChuDuyet').value.trim();
    if (quyetDinh === 'tu_choi' && !ghiChu) {
      oLoi.textContent = 'Hãy ghi rõ lý do chưa duyệt để người gửi biết đường sửa.';
      return;
    }
    const nut = $('#gyCtNutDuyet'), nut2 = $('#gyCtNutTuChoi');
    nut.disabled = nut2.disabled = true;
    try {
      await API.gopYDuyet({
        id, quyet_dinh: quyetDinh, risk: $('#gyCtRisk').value,
        ghi_chu: ghiChu || null, ly_do: quyetDinh === 'tu_choi' ? ghiChu : null,
        loi_nhan: quyetDinh === 'duyet' ? ghiChu : null
      });
      await taiLai();
      await moChiTiet(id);
    } catch (err) {
      oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.';
    } finally { nut.disabled = nut2.disabled = false; }
  }
  $('#gyCtNutDuyet').addEventListener('click', () => gyGuiDuyet('duyet'));
  $('#gyCtNutTuChoi').addEventListener('click', () => gyGuiDuyet('tu_choi'));

  $('#gyCtTriageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(modal.dataset.id, 10);
    $('#gyCtTriageLoi').textContent = '';
    const nut = $('#gyCtNutLuu');
    nut.disabled = true;
    try {
      await API.gopYDoiTrangThai(id, {
        trang_thai: $('#gyCtTrangThai').value,
        loai: $('#gyCtLoai').value || null,
        ghi_chu: $('#gyCtGhiChu').value.trim() || null,
        bang_chung_url: $('#gyCtBangChung').value.trim() || null
      });
      await taiLai();
      await moChiTiet(id);   // vẽ lại lịch sử + meta mới ngay trong modal, không cần đóng/mở lại
    } catch (err) {
      $('#gyCtTriageLoi').textContent = err.message || 'Không lưu được, thử lại nhé.';
    } finally {
      nut.disabled = false;
    }
  });

  await taiLai();
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
        /* REV-0026/H2 — trước đây là 'var(--ok)': 3.05:1 trên nền
           '--danger-wash' của '.form-loi'. Câu này vận hành sàn đọc MỖI LẦN
           đồng bộ. Đợt 2 quét sạch 'var(--ok)' trong CSS nhưng KHÔNG quét JS
           — quét màu thì phải quét CẢ HAI chỗ đặt màu, CSS lẫn JS.
           'var(--ok-dark)' = 5.02:1, giữ nguyên SẮC xanh 101° nên không đổi
           nghĩa "đã xong". */
        oLoi.style.color = 'var(--ok-dark)';
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

/* -- Kho tài liệu quản trị (CTL-0026 Đợt 1) -- */
if (TOI.quyen.includes('khotailieu')) {
  try { await khoiDongKhoTaiLieu(); } catch (e) { console.error('Kho tài liệu:', e); }
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
    // REV-0034 · L3: trần 50 tin — cắt thì phải nói ra. Không cắt thì dải
    // biến mất hẳn (kq.cat = null), chuông không mọc thêm một dòng thừa.
    veDaiCat('#tb-cat', kq.cat, { don_vi: 'thông báo' });
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

  async function lamMoiTatCa() {
    await taiDanhMucNen();   // làm mới cache dùng chung (Nhân sự/Kho vận cũng đọc từ đây)
    veDanhMuc('#dln-pb-list', '#dln-pb-dem', '#dln-pb-trong', DS_PHONG_BAN,
      (id, ten) => API.dlnSuaPhongBan(id, { ten }), (id, hd) => API.dlnSuaPhongBan(id, { hoat_dong: hd }),
      (id, tt) => API.dlnKhoaPhongBan(id, tt),
      m => `<div class="sm">Trưởng phòng: ${m.truong_phong_ten ? esc(m.truong_phong_ten) : '— Chưa gán —'} ` +
           `<button type="button" class="btn-nho" data-gan-truong="${m.id}" style="margin-left:6px">Đổi</button></div>`,
      lamMoiTatCa);
    veDanhMuc('#dln-cd-list', '#dln-cd-dem', '#dln-cd-trong', DS_CHUC_DANH,
      (id, ten) => API.dlnSuaChucDanh(id, { ten }), (id, hd) => API.dlnSuaChucDanh(id, { hoat_dong: hd }),
      (id, tt) => API.dlnKhoaChucDanh(id, tt), null, lamMoiTatCa);
    veDanhMuc('#dln-dv-list', '#dln-dv-dem', '#dln-dv-trong', DS_DON_VI,
      (id, ten) => API.dlnSuaDonVi(id, { ten }), (id, hd) => API.dlnSuaDonVi(id, { hoat_dong: hd }),
      (id, tt) => API.dlnKhoaDonVi(id, tt), null, lamMoiTatCa);
    await veTinhTrang();
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
  let DS_TS_DANHMUC = [], DS_TS_VITRI = [];

  const NHAN_TT_TS = {
    san_sang:    { chu: 'Sẵn sàng',    mau: 'ok' },
    da_cap_phat: { chu: 'Đang giao',   mau: 'sage' },
    bao_hong:    { chu: 'Báo hỏng',    mau: 'danger' },
    mat:         { chu: 'Mất',         mau: 'danger' },
    da_thanh_ly: { chu: 'Đã thanh lý', mau: 'mute' }
  };
  const NHAN_TINH_TRANG_TS = {
    tot: { chu: 'Tốt', mau: 'ok' }, binh_thuong: { chu: 'Bình thường', mau: 'sage' },
    can_sua: { chu: 'Cần sửa', mau: 'warn' }, hong: { chu: 'Hỏng', mau: 'danger' }
  };
  const NHAN_SU_KIEN_TS = {
    tao_moi: 'Tạo mới', cap_phat: 'Cấp phát', thu_hoi: 'Thu hồi',
    bao_hong: 'Báo hỏng', mat: 'Báo mất', bao_tri: 'Bảo trì xong', thanh_ly: 'Thanh lý'
  };

  function locTS() {
    const k = boDau(($('#ts-tim')?.value || '').trim());
    const trangThai = $('#ts-loctrangthai')?.value || '';
    return DS_TS.filter(t => {
      if (trangThai && t.trang_thai !== trangThai) return false;
      if (k && !boDau(`${t.ma_ts} ${t.ten} ${t.danh_muc_ten || t.danh_muc || ''} ${t.serial || ''}`).includes(k)) return false;
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
    // Bấm chọn nhiều dòng để In tem hàng loạt — bỏ id không còn trong danh
    // sách đang lọc/hiển thị (đổi bộ lọc thì lựa chọn cũ không còn ý nghĩa).
    const idConLai = new Set(ds.map(t => t.id));
    for (const id of [...tsChon]) if (!idConLai.has(id)) tsChon.delete(id);
    veBang('#ts-bang', ds, t => {
      const tt = NHAN_TT_TS[t.trang_thai] || { chu: t.trang_thai, mau: 'mute' };
      let nut = '';
      if (t.trang_thai === 'san_sang' && quanLy) {
        nut += `<button class="btn-nho" data-ts-capphat="${esc(t.id)}">Cấp phát</button> `;
      } else if (t.trang_thai === 'da_cap_phat' && quanLy) {
        nut += `<button class="btn-nho" data-ts-capphat="${esc(t.id)}">Điều chuyển</button> ` +
               `<button class="btn-nho" data-ts-thuhoi="${esc(t.id)}">Thu hồi</button> `;
      } else if (['bao_hong', 'mat'].includes(t.trang_thai) && quanLy) {
        nut += `<button class="btn-nho" data-ts-baotrixong="${esc(t.id)}">Bảo trì xong</button> `;
      }
      nut += `<button class="btn-nho btn-phu" data-ts-mo="${esc(t.id)}">Chi tiết</button>`;
      return `<td><input type="checkbox" data-ts-chon="${esc(t.id)}" ${tsChon.has(t.id) ? 'checked' : ''}></td>` +
        `<td class="sm"><button type="button" class="btn-nho btn-phu" data-ts-mo="${esc(t.id)}" style="font-weight:600">${esc(t.ma_ts)}</button></td>` +
        `<td><div class="nm">${esc(t.ten)}</div></td>` +
        `<td class="sm">${esc(t.danh_muc_ten || t.danh_muc || '—')}</td>` +
        `<td><span class="tag ${tt.mau}">${esc(tt.chu)}</span></td>` +
        `<td class="sm">${t.nguoi_giu_ten ? esc(t.nguoi_giu_ten) + (t.nguoi_giu_ma ? ' · ' + esc(t.nguoi_giu_ma) : '') : '—'}</td>` +
        `<td class="sm">${esc(t.vi_tri_ten || t.vi_tri || '—')}</td>` +
        `<td style="white-space:nowrap">${nut}</td>`;
    });
    veThanhChonTS();
  }

  /* ---- Chọn nhiều dòng → In tem hàng loạt (mỗi tài sản 1 trang, xem CSS
     .ts-tem page-break-after) ---- */
  const tsChon = new Set();
  function veThanhChonTS() {
    $('#ts-thanhchon').hidden = tsChon.size === 0;
    $('#ts-sldachon').textContent = `Đã chọn ${tsChon.size} tài sản`;
    const tatCa = $('#ts-chontatca');
    const dsHienThi = locTS();
    tatCa.checked = dsHienThi.length > 0 && dsHienThi.every(t => tsChon.has(t.id));
    tatCa.indeterminate = !tatCa.checked && dsHienThi.some(t => tsChon.has(t.id));
  }
  $('#ts-chontatca').addEventListener('change', e => {
    locTS().forEach(t => { if (e.target.checked) tsChon.add(t.id); else tsChon.delete(t.id); });
    ve();
  });
  $('#ts-nut-huychon').addEventListener('click', () => { tsChon.clear(); ve(); });
  $('#ts-bang').addEventListener('change', e => {
    const cb = e.target.closest('[data-ts-chon]');
    if (!cb) return;
    if (cb.checked) tsChon.add(cb.dataset.tsChon); else tsChon.delete(cb.dataset.tsChon);
    veThanhChonTS();
  });
  $('#ts-nut-intemchon').addEventListener('click', () => {
    const ds = DS_TS.filter(t => tsChon.has(t.id));
    if (ds.length) inTemNhieu(ds);
  });

  async function taiLai() {
    const kq = await API.taiSanDanhSach();
    DS_TS = kq.ds || [];
    quanLy = !!(kq.quyen && kq.quyen.quan_ly);
    $('#ts-panel-them').hidden = !quanLy;
    $('#ts-panel-danhmuc').hidden = !quanLy;
    ve();
  }
  window.LAM_MOI_TAISAN = taiLai;

  function xoaLocTS() {
    if ($('#ts-tim')) $('#ts-tim').value = '';
    if ($('#ts-loctrangthai')) $('#ts-loctrangthai').value = '';
    ve();
  }
  $('#ts-tim').addEventListener('input', ve);
  $('#ts-loctrangthai').addEventListener('change', ve);
  $('#ts-xoaloc').addEventListener('click', xoaLocTS);

  /* ---- Danh mục & Vị trí — combobox dùng chung cho Thêm/Sửa + panel quản lý.
     QUICK_CREATE_ALLOWED (docs/audit/AUDIT-QUICK-CREATE-POLICY.md mục E) —
     rủi ro thấp, chỉ tên, người bấm "Tài sản" đã đúng luôn là Data Owner
     (duocQuanLyTaiSan) nên không cần thêm bước xác nhận/quyền riêng. ---- */
  const taoMoiDanhMuc = { xuLyTao: API.dlnThemDanhMucTaiSan, capNhatDs: taiDanhMucViTri };
  const taoMoiViTri = { xuLyTao: API.dlnThemViTriTaiSan, capNhatDs: taiDanhMucViTri };
  const { capNhatHienThi: veThemDanhMuc } = ganCombo({
    hienThi: $('#tsThemDanhMucHienThi'), panel: $('#tsThemDanhMucPanel'),
    tim: $('#tsThemDanhMucTim'), goiY: $('#tsThemDanhMucGoiY'), giaTri: $('#tsThemDanhMucId')
  }, () => DS_TS_DANHMUC.filter(d => d.hoat_dong).map(d => ({ gia_tri: d.id, nhan: d.ten })), null, 'Chọn danh mục...', taoMoiDanhMuc);
  const { capNhatHienThi: veThemViTri } = ganCombo({
    hienThi: $('#tsThemViTriHienThi'), panel: $('#tsThemViTriPanel'),
    tim: $('#tsThemViTriTim'), goiY: $('#tsThemViTriGoiY'), giaTri: $('#tsThemViTriId')
  }, () => DS_TS_VITRI.filter(d => d.hoat_dong).map(d => ({ gia_tri: d.id, nhan: d.ten })), null, 'Chọn vị trí...', taoMoiViTri);
  const { capNhatHienThi: veSuaDanhMuc } = ganCombo({
    hienThi: $('#tsSuaDanhMucHienThi'), panel: $('#tsSuaDanhMucPanel'),
    tim: $('#tsSuaDanhMucTim'), goiY: $('#tsSuaDanhMucGoiY'), giaTri: $('#tsSuaDanhMucId')
  }, () => DS_TS_DANHMUC.filter(d => d.hoat_dong).map(d => ({ gia_tri: d.id, nhan: d.ten })), null, 'Chọn danh mục...', taoMoiDanhMuc);
  const { capNhatHienThi: veSuaViTri } = ganCombo({
    hienThi: $('#tsSuaViTriHienThi'), panel: $('#tsSuaViTriPanel'),
    tim: $('#tsSuaViTriTim'), goiY: $('#tsSuaViTriGoiY'), giaTri: $('#tsSuaViTriId')
  }, () => DS_TS_VITRI.filter(d => d.hoat_dong).map(d => ({ gia_tri: d.id, nhan: d.ten })), null, 'Chọn vị trí...', taoMoiViTri);

  function veChonPhongBan(sel, hienTaiId) {
    if (!sel) return;
    sel.innerHTML = '<option value="">— Chưa gán —</option>' +
      DS_PHONG_BAN.filter(p => p.hoat_dong).map(p => `<option value="${p.id}">${esc(p.ten)}</option>`).join('');
    sel.value = hienTaiId != null ? String(hienTaiId) : '';
  }

  async function taiDanhMucViTri() {
    try {
      const [dm, vt] = await Promise.all([API.dlnDanhMucTaiSan(), API.dlnViTriTaiSan()]);
      DS_TS_DANHMUC = dm.ds || []; DS_TS_VITRI = vt.ds || [];
    } catch { DS_TS_DANHMUC = []; DS_TS_VITRI = []; }
    veThemDanhMuc(); veThemViTri(); veSuaDanhMuc(); veSuaViTri();
    veChonPhongBan($('#tsThemPhongBan'));
    if (quanLy) veQuanLyDanhMuc();
  }

  function veQuanLyDanhMuc() {
    veDanhMuc('#ts-dm-list', null, null, DS_TS_DANHMUC,
      (id, ten) => API.dlnSuaDanhMucTaiSan(id, { ten }), (id, hd) => API.dlnSuaDanhMucTaiSan(id, { hoat_dong: hd }),
      (id, tt) => API.dlnKhoaDanhMucTaiSan(id, tt), null, taiDanhMucViTri);
    veDanhMuc('#ts-vt-list', null, null, DS_TS_VITRI,
      (id, ten) => API.dlnSuaViTriTaiSan(id, { ten }), (id, hd) => API.dlnSuaViTriTaiSan(id, { hoat_dong: hd }),
      (id, tt) => API.dlnKhoaViTriTaiSan(id, tt), null, taiDanhMucViTri);
  }

  $('#ts-nut-danhmuctoggle').addEventListener('click', () => {
    $('#ts-danhmuc-body').hidden = !$('#ts-danhmuc-body').hidden;
  });
  $('#ts-dm-form').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#ts-dm-loi'); oLoi.textContent = '';
    try {
      const ten = $('#ts-dm-ten').value.trim();
      if (await themCoCanhBaoTrung(API.dlnThemDanhMucTaiSan, ten, oLoi)) { $('#ts-dm-form').reset(); await taiDanhMucViTri(); }
    } catch (err) { oLoi.textContent = err.message || 'Không thêm được, thử lại nhé.'; }
  });
  $('#ts-vt-form').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#ts-vt-loi'); oLoi.textContent = '';
    try {
      const ten = $('#ts-vt-ten').value.trim();
      if (await themCoCanhBaoTrung(API.dlnThemViTriTaiSan, ten, oLoi)) { $('#ts-vt-form').reset(); await taiDanhMucViTri(); }
    } catch (err) { oLoi.textContent = err.message || 'Không thêm được, thử lại nhé.'; }
  });

  /* ---- Ảnh: đọc thành base64 để gửi thẳng, cùng giới hạn 4MB như ảnh nhân sự ---- */
  function docAnh(input, xemTruocId) {
    return new Promise((resolve, reject) => {
      const f = input.files && input.files[0];
      if (!f) { resolve(undefined); return; }
      if (f.size > 4 * 1024 * 1024) { reject(new Error('Ảnh vượt quá 4MB, chọn ảnh nhỏ hơn nhé.')); return; }
      const r = new FileReader();
      r.onload = () => {
        $(xemTruocId).innerHTML = `<img src="${r.result}" style="max-width:160px; border-radius:8px">`;
        resolve(String(r.result).split(',')[1] || null);
      };
      r.onerror = () => reject(new Error('Không đọc được ảnh.'));
      r.readAsDataURL(f);
    });
  }

  $('#tsThemNutChiTiet').addEventListener('click', () => { $('#tsThemChiTiet').hidden = !$('#tsThemChiTiet').hidden; });

  // "Lưu & In tem" — 2 nút submit trong cùng 1 form (Sếp Ngọc: "không bắt
  // lưu → quay danh sách → tìm lại → in"), phân biệt bằng nút nào bấm qua
  // submitter của SubmitEvent (chuẩn, không cần theo dõi biến cờ riêng).
  $('#tsThemForm').addEventListener('submit', async e => {
    e.preventDefault();
    const inTemSauKhiLuu = e.submitter && e.submitter.id === 'tsThemNutInTem';
    const oLoi = $('#tsThemLoi'); oLoi.textContent = '';
    const ten = $('#tsThemTen').value.trim();
    try {
      const anh = await docAnh($('#tsThemAnh'), '#tsThemAnhXemTruoc');
      const kq = await API.taiSanThem({
        ten,
        danh_muc_id: $('#tsThemDanhMucId').value || null,
        vi_tri_id: $('#tsThemViTriId').value || null,
        hang_sx: $('#tsThemHangSx').value.trim(),
        model: $('#tsThemModel').value.trim(),
        serial: $('#tsThemSerial').value.trim(),
        ngay_mua: $('#tsThemNgayMua').value,
        nha_cung_cap: $('#tsThemNCC').value.trim(),
        gia_mua: $('#tsThemGiaMua').value || null,
        het_bao_hanh: $('#tsThemHetBaoHanh').value,
        phong_ban_id: $('#tsThemPhongBan').value || null,
        anh, ghi_chu: $('#tsThemGhiChu').value.trim()
      });
      $('#tsThemForm').reset();
      // form.reset() KHÔNG xoá được input hidden của combobox — set .value
      // qua JS làm defaultValue của input hidden đổi theo (quirk trình
      // duyệt cho type=hidden), nên reset() coi giá trị vừa chọn là "mặc
      // định" luôn. Phải tự xoá tay trước khi vẽ lại nhãn hiển thị.
      $('#tsThemDanhMucId').value = ''; $('#tsThemViTriId').value = '';
      veThemDanhMuc(); veThemViTri();
      $('#tsThemAnhXemTruoc').innerHTML = '';
      $('#tsThemChiTiet').hidden = true;
      await taiLai();
      if (inTemSauKhiLuu) inTemNhieu([{ ma_ts: kq.ma_ts, ten }]);
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
    $('#tsCapPhatViTri').value = t ? (t.vi_tri_ten || t.vi_tri || '') : '';
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
      $('#tsChiTietModalNen').hidden = true;
      await taiLai();
    } catch (err) { oLoi.textContent = err.message || 'Không cấp phát được, thử lại nhé.'; }
  });

  function veLichSuHtml(ds) {
    if (!ds.length) return '<p class="hint">Chưa có lịch sử.</p>';
    return ds.map(ls => `<div class="list-item">` +
      `<div class="nm">${esc(NHAN_SU_KIEN_TS[ls.loai_su_kien] || ls.loai_su_kien)}</div>` +
      `<div class="sm">${esc(ls.luc)} · ${esc(ls.nguoi_thuc_hien_ten || '')}` +
      (ls.nguoi_giu_moi_ten ? ` · giao cho ${esc(ls.nguoi_giu_moi_ten)}` : '') +
      (ls.ghi_chu ? ` · ${esc(ls.ghi_chu)}` : '') + `</div></div>`).join('');
  }


  /* ---- Chi tiết tài sản: header + QR + hiện tại + lịch sử + quick actions ---- */
  function svgQR(noiDung) {
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(noiDung);
      qr.make();
      return qr.createSvgTag(4, 8);
    } catch { return '<p class="hint">Không tạo được mã QR.</p>'; }
  }

  let tsDangXem = null;
  function moChiTietData(t) {
    tsDangXem = t;
    const tt = NHAN_TT_TS[t.trang_thai] || { chu: t.trang_thai, mau: 'mute' };
    const dk = NHAN_TINH_TRANG_TS[t.tinh_trang] || { chu: t.tinh_trang, mau: 'mute' };
    $('#tsCtTen').textContent = t.ten;
    $('#tsCtMa').textContent = t.ma_ts;
    $('#tsCtQR').innerHTML = svgQR(t.ma_ts);
    $('#tsCtTag').innerHTML = `<span class="tag ${tt.mau}">${esc(tt.chu)}</span> <span class="tag ${dk.mau}">${esc(dk.chu)}</span>`;

    const laNguoiGiu = t.nguoi_giu_id && t.nguoi_giu_id === TOI.id;
    $('#tsCtNutCapPhat').hidden = !(quanLy && ['san_sang', 'da_cap_phat'].includes(t.trang_thai));
    $('#tsCtNutCapPhat').textContent = t.trang_thai === 'da_cap_phat' ? 'Điều chuyển' : 'Bàn giao';
    $('#tsCtNutThuHoi').hidden = !(quanLy && t.trang_thai === 'da_cap_phat');
    $('#tsCtNutBaoHong').hidden = !((quanLy || laNguoiGiu) && ['san_sang', 'da_cap_phat'].includes(t.trang_thai));
    $('#tsCtNutBaoMat').hidden = !((quanLy || laNguoiGiu) && ['san_sang', 'da_cap_phat'].includes(t.trang_thai));
    $('#tsCtNutBaoTriXong').hidden = !(quanLy && ['bao_hong', 'mat'].includes(t.trang_thai));
    $('#tsCtNutSua').hidden = !quanLy;
    $('#tsCtNutThanhLy').hidden = !(quanLy && t.trang_thai !== 'da_thanh_ly');

    const dong = (nhan, gia) => gia ? `<div class="ts-ct-dong"><span>${esc(nhan)}</span><b>${gia}</b></div>` : '';
    $('#tsCtThongTin').innerHTML =
      dong('Người giữ', t.nguoi_giu_ten ? esc(t.nguoi_giu_ten) + (t.nguoi_giu_ma ? ' · ' + esc(t.nguoi_giu_ma) : '') : '') +
      dong('Phòng ban', t.phong_ban_ten ? esc(t.phong_ban_ten) : '') +
      dong('Vị trí', t.vi_tri_ten || t.vi_tri ? esc(t.vi_tri_ten || t.vi_tri) : '') +
      dong('Danh mục', t.danh_muc_ten || t.danh_muc ? esc(t.danh_muc_ten || t.danh_muc) : '') +
      dong('Hãng SX / Model', [t.hang_sx, t.model].filter(Boolean).map(esc).join(' / ')) +
      dong('Số serial', t.serial ? esc(t.serial) : '') +
      dong('Ngày mua', t.ngay_mua ? esc(t.ngay_mua) : '') +
      dong('Nhà cung cấp', t.nha_cung_cap ? esc(t.nha_cung_cap) : '') +
      dong('Giá mua (tham chiếu)', t.gia_mua ? tienVN(t.gia_mua) + ' đ' : '') +
      dong('Hết bảo hành', t.het_bao_hanh ? esc(t.het_bao_hanh) : '') +
      dong('Ghi chú', t.ghi_chu ? esc(t.ghi_chu) : '') +
      (t.anh ? `<div style="margin-top:10px"><img src="data:image/*;base64,${t.anh}" style="max-width:220px; border-radius:10px"></div>` : '');

    $('#tsCtLichSu').innerHTML = '<p class="hint">Đang tải…</p>';
    API.taiSanLichSu(t.id).then(kq => { $('#tsCtLichSu').innerHTML = veLichSuHtml(kq.ds || []); })
      .catch(() => { $('#tsCtLichSu').innerHTML = '<p class="hint">Không tải được lịch sử.</p>'; });

    $('#tsChiTietModalNen').hidden = false;
  }
  function moChiTiet(id) {
    const t = DS_TS.find(x => x.id === id);
    if (t) moChiTietData(t);
  }
  $('#tsCtDong').addEventListener('click', () => { $('#tsChiTietModalNen').hidden = true; });
  $('#tsCtNutCapPhat').addEventListener('click', () => { $('#tsChiTietModalNen').hidden = true; moModalCapPhat(tsDangXem.id); });
  $('#tsCtNutThuHoi').addEventListener('click', async () => {
    if (!confirm('Thu hồi tài sản này về kho?')) return;
    try { await API.taiSanThuHoi({ id: tsDangXem.id }); $('#tsChiTietModalNen').hidden = true; await taiLai(); }
    catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
  });
  $('#tsCtNutBaoHong').addEventListener('click', () => {
    moHopNhap({
      tieuDe: 'Báo hỏng tài sản', loai: 'textarea', nhan: 'Mô tả tình trạng hỏng', placeholder: 'Không bắt buộc',
      xuLyLuu: async val => { await API.taiSanBaoHong({ id: tsDangXem.id, loai: 'hong', ghi_chu: val }); $('#tsChiTietModalNen').hidden = true; await taiLai(); }
    });
  });
  $('#tsCtNutBaoMat').addEventListener('click', () => {
    moHopNhap({
      tieuDe: 'Báo mất tài sản', loai: 'textarea', nhan: 'Mô tả (mất khi nào, ở đâu...)', placeholder: 'Không bắt buộc',
      xuLyLuu: async val => { await API.taiSanBaoHong({ id: tsDangXem.id, loai: 'mat', ghi_chu: val }); $('#tsChiTietModalNen').hidden = true; await taiLai(); }
    });
  });
  $('#tsCtNutBaoTriXong').addEventListener('click', async () => {
    const nhan = tsDangXem.trang_thai === 'mat' ? 'Xác nhận đã tìm lại được — tài sản về trạng thái sẵn sàng?' : 'Xác nhận đã sửa xong — tài sản về trạng thái sẵn sàng?';
    if (!confirm(nhan)) return;
    try { await API.taiSanBaoTriXong({ id: tsDangXem.id }); $('#tsChiTietModalNen').hidden = true; await taiLai(); }
    catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
  });
  $('#tsCtNutThanhLy').addEventListener('click', async () => {
    if (!confirm('Thanh lý tài sản này? Sau đó không cấp phát lại được nữa.')) return;
    try { await API.taiSanThanhLy({ id: tsDangXem.id }); $('#tsChiTietModalNen').hidden = true; await taiLai(); }
    catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
  });
  $('#tsCtNutInTem').addEventListener('click', () => inTemNhieu([tsDangXem]));

  /* ---- Sửa ---- */
  $('#tsCtNutSua').addEventListener('click', () => moSua(tsDangXem));
  function moSua(t) {
    $('#tsChiTietModalNen').hidden = true;
    $('#tsSuaId').value = t.id;
    $('#tsSuaTen').value = t.ten || '';
    $('#tsSuaDanhMucId').value = t.danh_muc_id || '';
    veSuaDanhMuc();
    $('#tsSuaViTriId').value = t.vi_tri_id || '';
    veSuaViTri();
    $('#tsSuaTinhTrang').value = t.tinh_trang || 'tot';
    $('#tsSuaHangSx').value = t.hang_sx || '';
    $('#tsSuaModel').value = t.model || '';
    $('#tsSuaSerial').value = t.serial || '';
    $('#tsSuaNgayMua').value = t.ngay_mua || '';
    $('#tsSuaNCC').value = t.nha_cung_cap || '';
    $('#tsSuaGiaMua').value = t.gia_mua || '';
    $('#tsSuaHetBaoHanh').value = t.het_bao_hanh || '';
    veChonPhongBan($('#tsSuaPhongBan'), t.phong_ban_id);
    $('#tsSuaGhiChu').value = t.ghi_chu || '';
    $('#tsSuaAnhXemTruoc').innerHTML = t.anh ? `<img src="data:image/*;base64,${t.anh}" style="max-width:160px; border-radius:8px">` : '';
    $('#tsSuaLoi').textContent = '';
    $('#tsSuaModalNen').hidden = false;
  }
  $('#tsSuaHuy').addEventListener('click', () => { $('#tsSuaModalNen').hidden = true; });
  $('#tsSuaForm').addEventListener('submit', async e => {
    e.preventDefault();
    const oLoi = $('#tsSuaLoi'); oLoi.textContent = '';
    try {
      const anh = await docAnh($('#tsSuaAnh'), '#tsSuaAnhXemTruoc');
      await API.taiSanSua({
        id: $('#tsSuaId').value,
        ten: $('#tsSuaTen').value.trim(),
        danh_muc_id: $('#tsSuaDanhMucId').value || null,
        vi_tri_id: $('#tsSuaViTriId').value || null,
        tinh_trang: $('#tsSuaTinhTrang').value,
        hang_sx: $('#tsSuaHangSx').value.trim(),
        model: $('#tsSuaModel').value.trim(),
        serial: $('#tsSuaSerial').value.trim(),
        ngay_mua: $('#tsSuaNgayMua').value,
        nha_cung_cap: $('#tsSuaNCC').value.trim(),
        gia_mua: $('#tsSuaGiaMua').value || null,
        het_bao_hanh: $('#tsSuaHetBaoHanh').value,
        phong_ban_id: $('#tsSuaPhongBan').value || null,
        anh, ghi_chu: $('#tsSuaGhiChu').value.trim()
      });
      $('#tsSuaModalNen').hidden = true;
      await taiLai();
    } catch (err) { oLoi.textContent = err.message || 'Không lưu được, thử lại nhé.'; }
  });

  /* ---- In tem 60×40mm ngang (ASSET_LABEL_60X40, xem @page trong style.css)
     — hỗ trợ in 1 tem hoặc hàng loạt (mỗi tài sản 1 trang). Reprint dùng lại
     đúng ma_ts/ten hiện có, KHÔNG sinh mã mới — chỉ đọc, không ghi gì thêm
     (Sếp Ngọc: "không cần spam Audit nếu việc này không có giá trị"). ---- */
  function inTemNhieu(dsTaiSan) {
    $('#tsTemMauDon').innerHTML = dsTaiSan.map(t =>
      `<div class="ts-tem">` +
        `<div class="ts-tem-trai">` +
          `<div class="ts-tem-cty">ALPHA GREEN COMMERCE</div>` +
          `<div class="ts-tem-ten">${esc(t.ten)}</div>` +
          `<div class="ts-tem-ma">${esc(t.ma_ts)}</div>` +
          `<div class="ts-tem-phu">TÀI SẢN NỘI BỘ</div>` +
        `</div>` +
        `<div class="ts-tem-qr">${svgQR(t.ma_ts)}</div>` +
      `</div>`
    ).join('');

    /* GỠ `hidden` TRƯỚC khi in, đặt lại sau khi in xong.
       Trước đây `#tsInTemVung` mang `hidden` cố định và tem in ra được CHỈ nhờ
       `@media print { .ts-in-tem-vung { display: block } }` đè lên luật mặc
       định `[hidden] { display: none }` của trình duyệt — tức là dựa vào đúng
       cái cơ chế mà CTL-0008 xác định là lỗi. Ai siết `[hidden]` chặt hơn là
       tem lập tức in ra giấy trắng, không báo lỗi, không ghi log (REV-0004
       mục 2, ADR-0008). Giờ tem hiện ra vì mình chủ động gỡ `hidden`, không
       còn phụ thuộc vào thứ tự đè nhau của CSS nữa.

       Đặt lại bằng `afterprint` chứ không đặt ngay sau `window.print()`: nơi
       nào print() trả về luôn (không chặn tới lúc đóng hộp thoại) thì đặt lại
       ngay sẽ giấu mất tem giữa lúc đang in. Nếu `afterprint` không bắn thì
       màn hình vẫn sạch, vì `.ts-in-tem-vung { display: none }` (lúc xem
       thường) đã ẩn sẵn rồi. */
    const vungTem = $('#tsInTemVung');
    window.addEventListener('afterprint', () => { vungTem.hidden = true; }, { once: true });
    vungTem.hidden = false;
    window.print();
  }

  /* ---- Quét mã: BarcodeDetector (native, không cần thư viện ngoài) — nơi
     trình duyệt chưa hỗ trợ thì nhập tay Mã tài sản (xem docs/audit/AUDIT-TAISAN-MODULE.md
     mục G — không tự viết decoder để tránh rủi ro quét sai). ---- */
  let quetStream = null, quetDangChay = false;
  function dongQuet() {
    quetDangChay = false;
    if (quetStream) { quetStream.getTracks().forEach(tr => tr.stop()); quetStream = null; }
    $('#tsQuetVideo').hidden = true;
  }
  async function xuLyMaQuet(ma) {
    dongQuet();
    $('#tsQuetModalNen').hidden = true;
    try {
      const kq = await API.taiSanTraCuu(ma);
      moChiTietData(kq.ts);
    } catch (err) { alert(err.message || `Không tìm thấy tài sản với mã "${ma}".`); }
  }
  async function quetVongLap(detector, video) {
    if (!quetDangChay) return;
    try {
      const ds = await detector.detect(video);
      if (ds.length) { await xuLyMaQuet(ds[0].rawValue); return; }
    } catch { /* frame lỗi thoáng qua — thử lại frame sau, không báo lỗi dồn dập */ }
    requestAnimationFrame(() => quetVongLap(detector, video));
  }
  async function moQuet() {
    $('#tsQuetLoi').textContent = '';
    $('#tsQuetNhapTay').value = '';
    $('#tsQuetGhiChu').textContent = 'Đưa camera vào mã QR dán trên tài sản.';
    $('#tsQuetModalNen').hidden = false;
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          quetStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const video = $('#tsQuetVideo');
          video.srcObject = quetStream;
          video.hidden = false;
          await video.play();
          quetDangChay = true;
          quetVongLap(detector, video);
          return;
        }
      } catch { /* không có camera/không cấp quyền — rơi xuống nhập tay */ }
    }
    $('#tsQuetGhiChu').textContent = 'Máy này chưa quét camera trực tiếp được — nhập mã tài sản bên dưới rồi bấm "Mở tài sản".';
  }
  $('#ts-nut-quet').addEventListener('click', moQuet);
  $('#tsQuetDong').addEventListener('click', () => { dongQuet(); $('#tsQuetModalNen').hidden = true; });
  $('#tsQuetTraCuu').addEventListener('click', () => {
    const ma = $('#tsQuetNhapTay').value.trim();
    if (!ma) { $('#tsQuetLoi').textContent = 'Nhập mã tài sản trước đã.'; return; }
    xuLyMaQuet(ma);
  });
  $('#tsQuetNhapTay').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#tsQuetTraCuu').click(); } });

  $('#ts-bang').addEventListener('click', async e => {
    const btnCapPhat = e.target.closest('[data-ts-capphat]');
    const btnThuHoi = e.target.closest('[data-ts-thuhoi]');
    const btnBaoTriXong = e.target.closest('[data-ts-baotrixong]');
    const btnMo = e.target.closest('[data-ts-mo]');
    try {
      if (btnCapPhat) {
        await moModalCapPhat(btnCapPhat.dataset.tsCapphat);
      } else if (btnThuHoi) {
        if (!confirm('Thu hồi tài sản này về kho?')) return;
        await API.taiSanThuHoi({ id: btnThuHoi.dataset.tsThuhoi }); await taiLai();
      } else if (btnBaoTriXong) {
        if (!confirm('Xác nhận đã xử lý xong — tài sản về trạng thái sẵn sàng?')) return;
        await API.taiSanBaoTriXong({ id: btnBaoTriXong.dataset.tsBaotrixong }); await taiLai();
      } else if (btnMo) {
        moChiTiet(btnMo.dataset.tsMo);
      }
    } catch (err) { alert(err.message || 'Không thực hiện được, thử lại nhé.'); }
  });

  await taiLai();
  await taiDanhMucViTri();
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
          /* `maxlength`: ô một dòng KHÔNG khai trần là ô nhận chữ vô hạn — nặng
             hơn ô 120 ký tự, mà phép đếm cũ lọc `maxLength >= 100` thì bỏ sót
             sạch (REV-0047/L1). Ô này đếm người nên 3 chữ số là quá đủ. */
          return `<td><input type="text" maxlength="3" inputmode="numeric" class="xc-kh-o" data-xc-kh-ngay="${ng}" data-xc-kh-mauca="${mc.id}" value="${gtri}" style="width:44px;text-align:center;border:1px solid var(--line);border-radius:6px;padding:3px"></td>`;
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
      const NHAN_LLD = LOAI_LD_NGAN;   // khai báo chung đầu tệp (SPEC-0007 Đợt 1)
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
        /* Máy chủ CỐ Ý bỏ qua người ký hợp đồng khoán việc (ISSUE-1 · REV-0009).
           Phải nói ra TÊN từng người, nếu không anh Duy chỉ thấy "đã chốt 12 ca"
           mà không biết ai bị bỏ lại — đúng cái im lặng cần dẹp (N-1 · REV-0013). */
        let tb = `Đã chốt ${kq.da_khoa || 0} ca làm việc trong tuần.`;
        const boQuaAi = Array.isArray(kq.bo_qua_ai) ? kq.bo_qua_ai : [];
        if (boQuaAi.length) {
          tb += `\n\n⚠️ BỎ QUA ${kq.bo_qua_khoan || 0} ca của ${boQuaAi.length} người ký hợp đồng khoán việc:\n`
              + boQuaAi.map(t => `  • ${t}`).join('\n')
              + `\n\nHợp đồng khoán việc là hợp đồng dân sự — không chốt lịch theo giờ được.`
              + `\nMấy ca này vẫn để nguyên, anh/chị tự thoả thuận trực tiếp với các bạn nhé.`;
        }
        alert(tb);
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

  const veNhapSP = $('#kvNhapSP') ? ganCombo({
    hienThi: $('#kvNhapSPHienThi'), panel: $('#kvNhapSPPanel'),
    tim: $('#kvNhapSPTim'), goiY: $('#kvNhapSPGoiY'), giaTri: $('#kvNhapSP')
  }, () => DS_SP.map(s => ({ gia_tri: s.id, nhan: `${s.ten} — ${s.ma_sku}` })), null, 'Chọn sản phẩm...').capNhatHienThi : null;
  const veXuatSP = $('#kvXuatSP') ? ganCombo({
    hienThi: $('#kvXuatSPHienThi'), panel: $('#kvXuatSPPanel'),
    tim: $('#kvXuatSPTim'), goiY: $('#kvXuatSPGoiY'), giaTri: $('#kvXuatSP')
  }, () => DS_SP.map(s => ({ gia_tri: s.id, nhan: `${s.ten} — tồn ${s.ton} ${s.don_vi}` })), null, 'Chọn sản phẩm...').capNhatHienThi : null;
  function doDropdown() {
    veNhapSP?.();
    veXuatSP?.();
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
        /* ĐỢT 2c — hai mã dán cứng ở đây nằm NGOÀI bảng màu style.css:
           #3f6b3f là xanh của bảng CŨ, #b3462f là một sắc đỏ tự chế. Bảng màu
           tách làm hai chính là cách nó âm thầm lệch đi (đúng loại lỗi
           REV-0026/H1). Dùng token bộ màu mang nghĩa: xanh = nhập, đỏ = xuất. */
        `<td class="num" style="color:var(--ok-dark)">+${esc(tienVN(r.nhap))}</td>` +
        `<td class="num" style="color:var(--danger-dark)">-${esc(tienVN(r.xuat))}</td>` +
        `<td class="num"><b>${esc(tienVN(r.ton_cuoi))}</b></td>`);
      $('#kv-bc-trong').hidden = bang.length > 0;
    } catch (err) {
      alert(err.message);
    } finally {
      nut.disabled = false; nut.textContent = 'Xem báo cáo';
    }
  });
}

/* Ảnh minh chứng khiếu nại: cạnh dài nhất 1280px, JPEG chất lượng 0.72 — đủ
   rõ để làm bằng chứng, đủ nhẹ để nằm gọn trong giới hạn 2MB/giá trị của D1.
   CTL-0011: hàm `nenAnh()` riêng đã bỏ, dùng chung `nenAnhChung()` ở đầu file
   với ĐÚNG tham số cũ (không thêm vòng tự lọt giới hạn — giữ nguyên hành vi
   màn hình Khiếu nại trong đợt này). */
const NEN_ANH_KHIEU_NAI = { canhToiDa: 1280, chatLuong: 0.72 };

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
      try { anhDangChon.push({ base64: await nenAnhChung(f, NEN_ANH_KHIEU_NAI) }); }
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
  let CAT_LS = null;   // vết cắt do trần LIMIT — null nghĩa là KHÔNG bị cắt
  let TRUOC_LS = null; // con trỏ `tao_luc_shopee|return_sn` để tải tiếp đơn cũ hơn
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
    // Ô đếm này TỪNG NÓI DỐI: `DS_LS.length` là 500 dòng đã bị trần cắt, nên
    // với 523 đơn thật nó in "500/500" — khẳng định đã hiện hết trong khi mất
    // 23 đơn. Có `CAT_LS` thì mẫu số phải là TỔNG THẬT.
    const tong = (CAT_LS && Number.isFinite(CAT_LS.tong)) ? CAT_LS.tong : DS_LS.length;
    $('#ls-dem').textContent = `${ds.length}/${tong} đơn hoàn`;
  }

  /* Cùng lỗi câu chữ với Lịch sử làm việc (REV-0034 · L2): dải cũ chỉ người ta
     *"dùng ô tìm theo mã đơn nếu cần tra đơn cũ"* — mà `#ls-tim` lọc trên
     `DS_LS`, tức đúng 500 dòng ĐÃ TẢI; đơn cũ hơn không nằm trong đó nên tìm
     mãi không ra. Nay: nói đúng giới hạn của ô tìm + nút tải tiếp từ MÁY CHỦ. */
  function veDaiCatLs() {
    if (!TRUOC_LS) return veDaiCat('#ls-cat', null);
    const conLai = (CAT_LS && Number.isFinite(CAT_LS.tong))
      ? Math.max(0, CAT_LS.tong - DS_LS.length) : null;
    veDaiCat('#ls-cat', { gioi_han: DS_LS.length, tong: CAT_LS ? CAT_LS.tong : null }, {
      don_vi: 'đơn hoàn',
      goi_y: 'Đang tải các đơn sàn tạo GẦN NHẤT. Ô tìm phía trên chỉ tìm trong phần ĐÃ TẢI về máy.',
      nut: {
        chu: conLai != null ? `Tải thêm ${Math.min(500, conLai)} đơn cũ hơn` : 'Tải thêm đơn cũ hơn',
        chay: async (b) => { b.disabled = true; b.textContent = 'Đang tải…'; await veLichSu({ them: true }); }
      }
    });
  }

  async function veLichSu({ them = false } = {}) {
    let kq;
    try { kq = await API.hoanLichSu(them ? TRUOC_LS : null); }
    catch { if (TRUOC_LS) veDaiCatLs(); return; }   // đừng để nút kẹt "Đang tải…"
    DS_LS = them ? DS_LS.concat(kq.don_hoan || []) : (kq.don_hoan || []);
    TRUOC_LS = kq.truoc_tiep || null;
    if (kq.cat && Number.isFinite(kq.cat.tong)) CAT_LS = kq.cat;
    else if (!them) CAT_LS = kq.cat || null;
    veDaiCatLs();
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

  // DÙNG CHUNG giữa bảng "Quản trị → Tài khoản" và khối "Tài khoản ERP"
  // trong Hồ sơ nhân sự (Employee Profile Phase 1, 25/08/2026) — cùng 1 hàm,
  // gắn ở cả 2 nơi, khỏi viết lại luồng Tạo/Đổi vai trò/Đặt lại MK/Khoá/Xoá
  // 2 lần. Sau khi xong, nếu hộp Hồ sơ đang mở đúng người vừa đổi thì tự vẽ
  // lại luôn (window.LAM_MOI_HOSO_NHANSU, gắn ở khối Nhân sự phía trên).
  async function xuLyThaoTacTaiKhoan(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.tao) {
      moHopTaoTaiKhoan(btn.dataset.tao, btn.dataset.tenGoiY, btn.dataset.ten);
    } else if (btn.dataset.datlai) {
      if (!confirm('Đặt lại mật khẩu cho tài khoản này? Mật khẩu cũ sẽ hết hiệu lực ngay.')) return;
      btn.disabled = true;
      try {
        const kq = await API.qtDatLaiMatKhau(parseInt(btn.dataset.datlai, 10));
        /* Tài khoản đang giữ quyền duyệt góp ý ERP: máy chủ CỐ Ý không trả
           mật khẩu tạm về đây (ADR-0015 — mật khẩu về tay người bấm là mượn
           được danh tính chủ tài khoản). Nói thẳng cho người bấm biết, đừng
           mở hộp mật khẩu rỗng ghi "undefined". */
        if (kq.da_gui_kenh_rieng) {
          alert('Đã khôi phục đăng nhập cho "' + kq.ten_dang_nhap + '".\n\n'
            + 'Mật khẩu tạm KHÔNG hiện ở đây — máy chủ gửi thẳng vào Telegram riêng của '
            + 'chủ tài khoản (người giữ quyền duyệt góp ý ERP). Bạn không cần chép gì cả.\n\n'
            + 'Cả nhóm Telegram chung cũng nhận được một dòng ghi nhận việc bạn vừa làm.');
        } else {
          hienMatKhauTam('Đã đặt lại mật khẩu', kq.ten_dang_nhap, kq.mat_khau_tam);
        }
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
      moHopDoiVaiTro(btn.dataset.doivaitro, btn.dataset.doivaitroTen, btn.dataset.doivaitroHientai, btn.dataset.doivaitroVitri);
    } else if (btn.dataset.quyenduyetgopy) {
      const bat = btn.dataset.qdgBat === '1';
      const ten = btn.dataset.qdgTen;
      if (!confirm(bat
        ? `Cho "${ten}" duyệt góp ý ERP ở cấp cuối? Người này sẽ duyệt/từ chối được như bạn.`
        : `Thu quyền duyệt góp ý ERP của "${ten}"? Sau đó họ vẫn xem đầy đủ, chỉ không duyệt được nữa.`)) return;
      btn.disabled = true;
      try {
        await API.qtQuyenDuyetGopY(parseInt(btn.dataset.quyenduyetgopy, 10), bat);
        await taiLaiNhanSuQuanTri();
      } catch (err) { alert(err.message); btn.disabled = false; }
    }
  }
  $('#qtBang').addEventListener('click', xuLyThaoTacTaiKhoan);
  $('#nsSua-taikhoan').addEventListener('click', xuLyThaoTacTaiKhoan);

  /* HAI COMBOBOX, KHÔNG PHẢI MỘT (Sếp Ngọc chốt 04/09/2026: "gộp 2 vai trò
     như này ko biết phân quyền kiểu gì nhé, tách ra 2 vai trò đi").
     Trước bản này CHỈ CÓ MỘT combobox, bên trong chia 2 tiêu đề nhóm cho dễ
     nhìn — nhưng vẫn chọn được ĐÚNG MỘT, nên ai cũng phải bỏ một nửa.
     Danh sách của từng ô lấy THẲNG từ máy chủ (VAI_TRO_HE_THONG /
     VI_TRI_CONG_VIEC trong src/quyen.js) — frontend KHÔNG tự đoán mã nào
     thuộc ô nào. tienTo khớp id các phần tử combo (${tienTo}HienThi/Panel/
     Tim/GoiY) + input hidden ${tienTo}. */
  function veComboVaiTro(tienTo, danhSach, hienTai, chuRong, chuTrong) {
    const oGiaTri = $('#' + tienTo);
    if (!oGiaTri) return null;
    oGiaTri.value = hienTai || '';
    return ganCombo({
      hienThi: $('#' + tienTo + 'HienThi'), panel: $('#' + tienTo + 'Panel'),
      tim: $('#' + tienTo + 'Tim'), goiY: $('#' + tienTo + 'GoiY'), giaTri: oGiaTri
    }, () => danhSach().map(v => ({ gia_tri: v.ma, nhan: v.ten })), chuTrong, chuRong);
  }
  const veComboO1 = (tienTo, hienTai) =>
    veComboVaiTro(tienTo, () => DS_VAI_TRO_HE_THONG, hienTai, 'Chọn vai trò...', null);
  /* Ô 2 CÓ lựa chọn rỗng "— Chưa gán —": bỏ vị trí của một người là việc
     thật (chuyển bộ phận, tạm ngưng), phải bấm được, không phải chỉ đặt vào
     mà không gỡ ra được. */
  const veComboO2 = (tienTo, hienTai) =>
    veComboVaiTro(tienTo, () => DS_VI_TRI_CONG_VIEC, hienTai, 'Chưa gán vị trí', '— Chưa gán —');

  // Hộp tạo tài khoản
  function moHopTaoTaiKhoan(nhanSuId, tenGoiY, hoTen) {
    $('#taoTkHoTen').textContent = hoTen || '';
    $('#taoTkTen').value = tenGoiY || '';
    veComboO1('taoTkVaiTro', '');
    veComboO2('taoTkViTri', '');
    // Chưa nạp migration thì ô 2 không lưu được gì — nói thẳng ra thay vì để
    // Sếp chọn xong rồi mới báo lỗi (máy chủ vẫn chặn, đây chỉ là báo sớm).
    const oO2 = $('#taoTkViTri')?.closest('.field');
    if (oO2) oO2.hidden = QT_CO_COT_VI_TRI === false;
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
      const kq = await API.qtTaoTaiKhoan(
        $('#taoTkForm').dataset.nhanSuId, $('#taoTkTen').value.trim(),
        $('#taoTkVaiTro').value, $('#taoTkViTri').value);
      $('#taoTkModalNen').hidden = true;
      hienMatKhauTam('Đã tạo tài khoản', kq.ten_dang_nhap, kq.mat_khau_tam);
      await taiLaiNhanSuQuanTri();
    } catch (err) { oLoi.textContent = err.message || 'Không tạo được, thử lại nhé.'; }
  });

  // Hộp đổi vai trò — nay đổi được CẢ HAI ô trong một lần bấm
  function moHopDoiVaiTro(taiKhoanId, hoTen, vaiTroHienTai, viTriHienTai) {
    $('#doiVaiTroHoTen').textContent = hoTen || '';
    const ten = (ma) => (DS_VAI_TRO_QT.find(v => v.ma === ma) || {}).ten || ma || '';
    $('#doiVaiTroHienTai').textContent =
      [ten(vaiTroHienTai), ten(viTriHienTai)].filter(Boolean).join(' · ') || '—';
    veComboO1('doiVaiTroMoi', vaiTroHienTai);
    veComboO2('doiViTri', viTriHienTai);
    /* Ai chỉ được đặt VỊ TRÍ (HCNS) thì không thấy ô 1 — và quan trọng hơn,
       không GỬI ô 1 lên (xem submit bên dưới), nên không có đường nào tự
       nâng mình lên Admin qua màn này. Máy chủ vẫn chặn độc lập. */
    const chinhO1 = !!TOI.duoc_tao_tai_khoan;
    const oO1 = $('#doiVaiTroO1'); if (oO1) oO1.hidden = !chinhO1;
    const oO2 = $('#doiVaiTroO2'); if (oO2) oO2.hidden = QT_CO_COT_VI_TRI === false;
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
      // `undefined` = KHÔNG gửi ô đó lên = máy chủ giữ nguyên.
      await API.qtSuaVaiTro(
        parseInt($('#doiVaiTroForm').dataset.taiKhoanId, 10),
        TOI.duoc_tao_tai_khoan ? $('#doiVaiTroMoi').value : undefined,
        QT_CO_COT_VI_TRI === false ? undefined : $('#doiViTri').value);
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

/* ==========================================================================
   CÂU BÁO SAU MỖI LƯỢT QUÉT — DÙNG CHUNG CHO CẢ HAI CỬA
   ---------------------------------------------------------------------------
   ⛔ VÁ REV-0044 · L1 — CÂU "CHỐT KHÔNG CHẠY" BỊ GIAO DIỆN NUỐT.
   Bản trước rẽ theo `kq.ocr_so_trang` và **nhánh CÓ chữ không in `ocr_ghi_chu`**.
   Cả thiết kế "không giả vờ đã kiểm" nằm ở một dòng chữ KHÔNG BAO GIỜ được in:
   người quét — người DUY NHẤT còn cầm tờ giấy trên tay để đối chiếu — thấy
   "bóc chữ được 3 trang" rồi bấm OK; câu kia chỉ hiện về sau ở màn "Xem chữ đã
   bóc", cho người KHÔNG cầm giấy.

   Nên `ocr_ghi_chu` in ở CẢ HAI nhánh, và đặt ở ĐÚNG MỘT hàm để không có cửa
   nào lỡ quên — cửa hồ sơ nhân sự (CTL-0025) gọi lại chính hàm này.
   ========================================================================== */
function cauSauKhiQuet(kq) {
  const n = Number(kq.ocr_so_trang) || 0;
  const neo = Number(kq.ocr_so_trang_neo) || 0;
  /* Tải file có sẵn thì gọi ĐÚNG TÊN FILE — người vừa bấm là người biết mình
     chọn file nào, và đó là mẩu duy nhất giúp họ nhận ra lưu đúng file chưa. */
  const dong = [kq.la_tep_goc && kq.ten_tep_goc
    ? `Đã lưu file "${kq.ten_tep_goc}" (${kq.so_trang} trang) — LƯU NGUYÊN BẢN, không bọc lại.`
    : `Đã lưu ${kq.so_trang} trang.`];

  /* CẢ MỘT LOẠT NHIỀU FILE PDF (CTL-0026 vòng 7). Báo mỗi file cuối rồi im về
     những file trước là để Sếp không biết cả xấp đã vào kho hay chưa. */
  if (Array.isArray(kq.loat) && kq.loat.length > 1) {
    dong.unshift(`Đã lưu xong ${kq.loat.length} tài liệu của loạt vừa chọn:\n` +
      kq.loat.map((x, i) => `${i + 1}. ${x.tieu_de}`).join('\n'));
  }

  /* ⚠️ CHỮ TỪ ĐÂU RA THÌ NÓI ĐÚNG CHỖ ĐÓ. Chữ có sẵn trong file PDF (máy scan
     nhận dạng) và chữ AI đọc từ ảnh chụp tin được tới mức khác nhau — dán
     chung một nhãn là nói dối một nửa. Cả hai vẫn là chữ MÁY ĐỌC, nên con số
     vẫn phải đối chiếu bản giấy: đó là chỗ hai đường giống nhau. */
  if (!n) {
    /* Với PDF có sẵn thì `ocr_ghi_chu` ngay dưới nói đủ và nói ĐÚNG bệnh (chỉ
       có ảnh · có mật khẩu · đọc không đủ rõ) — in thêm câu chung chung này là
       nói hai lần, lần sau nhẹ hơn lần trước. */
    if (!kq.la_tep_goc) dong.push('Chưa bóc được chữ — vẫn tra được bằng tên.');
  } else if (kq.chu_nguon === 'pdf_lop_chu') {
    dong.push(`Máy scan đã nhận dạng chữ sẵn trong file này — lấy được chữ của ${n} ` +
              `trang, trong đó ${neo} trang đối chiếu được với thứ bạn vừa gõ. ` +
              'Tài liệu này TÌM ĐƯỢC theo nội dung bên trong.');
    dong.push('⚠️ Con số trong phần chữ là do MÁY đọc, không phải người nhập — máy ' +
              'scan vẫn đọc nhầm chữ số. Đối chiếu bản giấy trước khi dùng.');
  } else {
    dong.push(`Bóc chữ được ${n} trang, trong đó ${neo} trang đối chiếu được với ` +
              'thứ bạn vừa gõ.');
    dong.push('⚠️ AI đọc — CHƯA KIỂM: mọi con số trong phần chữ đã bóc là do AI đọc ' +
              'từ ảnh, có thể sai vài chữ số. Đối chiếu bản giấy trước khi dùng.');
  }
  /* Câu này in ở CẢ HAI nhánh — đó chính là bản vá. */
  if (kq.ocr_ghi_chu) dong.push('⚠️ ' + kq.ocr_ghi_chu);
  return dong.join('\n\n');
}

/* ==========================================================================
   "XEM CHỮ ĐÃ BÓC" — MỘT HÀM, HAI CỬA  ·  vá REV-0046 lỗi #4
   ---------------------------------------------------------------------------
   Thẻ giấy tờ ở khối HỒ SƠ NHÂN SỰ trước đây không có nút này, nên người vừa
   quét — người DUY NHẤT còn cầm tờ giấy trên tay — không xem lại được chữ AI
   đọc. Cả cơ chế "CHƯA KIỂM" chỉ có nghĩa khi người ta MỞ RA KIỂM ĐƯỢC; nhãn
   không kiểm được là nhãn trang trí.

   Đặt ở ĐÚNG MỘT chỗ, đúng nếp `cauSauKhiQuet` ở trên: hai cửa gọi chung một
   hàm vẽ và một hàm bắt sự kiện. Chép bản thứ hai là chỗ để lần sau một cửa
   quên mất câu "AI đọc — CHƯA KIỂM".
   ⚠️ Mỗi lượt bấm gọi `API.tlMo` — với giấy NHẠY CẢM đó là một lượt GHI nhật
   ký (gộp theo ngày, xem `ghiNhatKy()`), đúng thứ Luật BVDLCN bắt phải có.
   ========================================================================== */

/** Bôi vàng đúng những cụm số MÁY đọc. Vị trí cụm do MÁY CHỦ tính
 *  (`so_ai`, src/so-ai.js) — trình duyệt KHÔNG giữ bản dò số thứ hai.
 *
 *  ⚠️ VÁ REV-0055 · CAO-2 — NHÃN LẤY TỪ MÁY CHỦ, KHÔNG DÁN CỨNG.
 *  Bản trước dán cứng "AI đọc — CHƯA KIỂM" cho MỌI con số, kể cả chữ lấy từ
 *  lớp chữ có sẵn trong PDF — đoạn chữ mà Workers AI chưa được gọi lấy một
 *  lượt (`do-kho-tai-lieu` ⑬a tự chứng minh: 0 lượt AI cho đường PDF). Nói sai
 *  nguồn gốc của chữ là làm hỏng chính cái luật "con số máy đọc = chưa kiểm":
 *  người đọc thấy nhãn dán bừa một lần thì lần sau bỏ qua nó. */
/** ĐƯỜNG LUI khi máy chủ không trả nhãn (bản cũ còn trong bộ nhớ đệm trình
 *  duyệt). Khai ĐÚNG MỘT chỗ: hai bản chép tay của cùng một nhãn là cách nhãn
 *  bắt đầu lệch nhau, và bàn đo cũng chỉ soi được khi có đúng một chuỗi
 *  (REV-0055 · CAO-2). */
const NHAN_MAY_DOC_LUI = 'AI đọc — CHƯA KIỂM';

function veChuCoSo(chu, viTri, nhan) {
  const s = String(chu || '');
  const nh = nhan || NHAN_MAY_DOC_LUI;
  if (!Array.isArray(viTri) || !viTri.length) return esc(s);
  let ra = '', xong = 0;
  for (const [i, dai] of viTri) {
    if (!Number.isFinite(i) || !Number.isFinite(dai) || i < xong) continue;
    ra += esc(s.slice(xong, i));
    ra += `<mark class="so-ai" title="${esc(nh)}">${esc(s.slice(i, i + dai))}</mark>`;
    xong = i + dai;
  }
  return ra + esc(s.slice(xong));
}

/* ==========================================================================
   SỬA SỐ HIỆU + TÊN TÀI LIỆU SAU KHI ĐÃ LƯU — MỘT HÀM, HAI CỬA
   ---------------------------------------------------------------------------
   Sếp Ngọc 03/09/2026: *"trước khi thêm tài liệu hoặc khi đã upload tài liệu
   lên thì để cho đổi tên số tài liệu và tên tài liệu nhé"*.

   TRƯỚC KHI LƯU đã sửa được từ đầu (hai ô trên màn quét). Đây là chiều còn
   lại. Đặt ở ĐÚNG MỘT chỗ như `noiNutXemChu` — kho chung và hồ sơ nhân sự gọi
   chung một hàm vẽ, một hàm bắt sự kiện. Chép bản thứ hai là chỗ để lần sau
   một cửa quên mất câu nhắc về mỏ neo.

   ⚠️ KHÔNG BẮT GHI LÝ DO. Đây là sửa chính tả, không phải đổi cam kết (chốt
   `trg_doi_cam_ket_phai_co_ly_do` chỉ đòi lý do cho hạn chót và người nhận).
   Bắt ghi lý do cho một lỗi đánh máy thì người ta quay về thói xoá đi quét
   lại — mà quét lại nghĩa là đi tìm lại TỜ GIẤY THẬT.

   ⚠️ KHÔNG SỬA ĐƯỢC ở đây: file đã lưu, và NHÓM giấy tờ (đổi nhóm là đổi ai
   được xem — một quyết định về quyền, không phải sửa chính tả).
   ========================================================================== */

/** Nhóm giấy tờ người này LƯU được — máy chủ trả (`nhom_luu_duoc`), giao diện
 *  không tự đoán. Cả hai cửa cùng ghi vào đây sau mỗi lượt nạp.
 *  Ẩn nút khi không sửa được là để KHÔNG HỨA SUÔNG (bài học REV-0040 #8): máy
 *  chủ vẫn chặn 403 thật, nhưng bày một cái nút bấm vào là ăn lỗi thì tệ. */
let TL_NHOM_LUU_DUOC = [];

function nutSuaTaiLieu(t) {
  if (!TL_NHOM_LUU_DUOC.includes(t.nhom)) return '';
  return `<button type="button" class="tl-nut-mo tl-nut-sua" data-sua="${esc(t.id)}">Sửa số &amp; tên</button>`;
}

function oSuaTaiLieu(t) {
  return `<div class="tl-chu tl-sua" id="tl-sua-${esc(t.id)}" hidden
               data-ten="${esc(t.tieu_de || '')}" data-so="${esc(t.so_hieu || '')}"></div>`;
}

/** Nối nút "Sửa số & tên" cho mọi thẻ trong `goc`. `khiXong` để cửa gọi nạp lại
 *  danh sách — không tự gọi hàm nạp của một cửa cụ thể, vì có hai cửa. */
function noiNutSuaTaiLieu(goc, khiXong) {
  if (!goc) return;
  goc.querySelectorAll('[data-sua]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.sua;
    const o = document.getElementById('tl-sua-' + id);
    if (!o) return;
    if (!o.hidden) { o.hidden = true; return; }
    o.hidden = false;
    o.innerHTML = `
      <p class="tl-so-ai-nhac">Sửa gõ nhầm thì cứ sửa, <b>không phải ghi lý do</b> —
        nhưng máy vẫn ghi lại ai sửa, lúc nào, cũ → mới.</p>
      <label class="tl-sua-o">Tên tài liệu
        <input type="text" id="tl-sua-ten-${esc(id)}" maxlength="200" value="${esc(o.dataset.ten)}">
      </label>
      <label class="tl-sua-o">Số hiệu
        <input type="text" id="tl-sua-so-${esc(id)}" maxlength="120" value="${esc(o.dataset.so)}">
      </label>
      ${/* ⚠️ NÓI TRƯỚC chuyện mỏ neo. Người sửa số hiệu cần biết nhãn tin cậy
            của phần chữ sẽ được tính lại — nếu không, họ sửa số rồi ngạc nhiên
            vì "đã đối chiếu" biến mất, và tưởng ERP làm hỏng dữ liệu. */''}
      <p class="tl-so-ai-nhac">Đổi <b>số hiệu</b> thì máy sẽ <b>đối chiếu lại</b> phần chữ
        đã bóc với số mới — nhãn "đã đối chiếu" có thể đổi theo. Đó là đúng: giữ
        một nhãn tính bằng số cũ là giữ một kết luận đã hết hiệu lực.</p>
      <div class="tl-the-nut">
        <button type="button" class="tl-nut-mo tl-nut-luu-sua" data-luu="${esc(id)}">Lưu</button>
        <button type="button" class="tl-nut-mo" data-huy="${esc(id)}">Huỷ</button>
        <button type="button" class="tl-nut-mo" data-ls="${esc(id)}">Xem lịch sử sửa</button>
      </div>
      <div class="tl-chu" id="tl-ls-${esc(id)}" hidden></div>`;

    o.querySelector('[data-huy]').addEventListener('click', () => { o.hidden = true; });

    o.querySelector('[data-ls]').addEventListener('click', async () => {
      const ols = document.getElementById('tl-ls-' + id);
      if (!ols.hidden) { ols.hidden = true; return; }
      ols.textContent = 'Đang mở…'; ols.hidden = false;
      try {
        const r = await API.tlLichSu(id);
        const d = r.ds || [];
        if (!d.length) { ols.textContent = 'Chưa ai sửa tài liệu này.'; return; }
        const ten = { tieu_de: 'tên tài liệu', so_hieu: 'số hiệu' };
        ols.innerHTML = '<ul class="tl-nk-ds">' + d.map(k =>
          `<li><b>${esc(k.nguoi_ten || '—')}</b> đổi ${esc(ten[k.truong] || k.truong)}: ` +
          `"${esc(k.gia_tri_cu || '(trống)')}" → "${esc(k.gia_tri_moi || '(trống)')}" ` +
          `lúc ${esc(String(k.luc || '').slice(0, 16))}</li>`).join('') + '</ul>';
      } catch (e) { ols.textContent = e.message; }
    });

    const nutLuu = o.querySelector('[data-luu]');
    nutLuu.addEventListener('click', async () => {
      if (nutLuu.disabled) return;                 // chặn hai lượt bấm chồng nhau
      nutLuu.disabled = true;
      const tenMoi = document.getElementById('tl-sua-ten-' + id).value.trim();
      const soMoi = document.getElementById('tl-sua-so-' + id).value.trim();
      try {
        const r = await API.tlSua({ id, tieu_de: tenMoi, so_hieu: soMoi });
        o.hidden = true;
        if (r.khong_doi) { alert('Bạn chưa đổi gì cả — không có gì để lưu.'); }
        else {
          alert('Đã sửa xong.' +
            (r.neo_tinh_lai
              ? '\n\nSố hiệu đổi nên máy vừa đối chiếu lại phần chữ đã bóc.' +
                (r.ocr_ghi_chu ? '\n⚠️ ' + r.ocr_ghi_chu : '')
              : ''));
        }
        if (typeof khiXong === 'function') khiXong();
      } catch (e) {
        alert(e.message);
        nutLuu.disabled = false;
      }
    });
  }));
}

/** Ô chữ + nút, dán vào thẻ giấy tờ ở cả hai cửa. */
function nutXemChuTaiLieu(id) {
  return `<button type="button" class="tl-nut-mo tl-nut-chu" data-xem="${esc(id)}">Xem chữ đã bóc</button>`;
}
function oChuTaiLieu(id) {
  return `<div class="tl-chu" id="tl-chu-${esc(id)}" hidden></div>`;
}

/** Nối nút "Xem chữ đã bóc" cho mọi thẻ nằm trong `goc`. */
function noiNutXemChu(goc) {
  if (!goc) return;
  goc.querySelectorAll('[data-xem]').forEach(b => b.addEventListener('click', async () => {
    const o = document.getElementById('tl-chu-' + b.dataset.xem);
    if (!o) return;
    if (!o.hidden) { o.hidden = true; return; }
    o.textContent = 'Đang mở…'; o.hidden = false;
    try {
      const r = await API.tlMo(b.dataset.xem);
      const tl = r.tai_lieu || {};
      if (!tl.noi_dung) {
        o.textContent = 'Chưa bóc được chữ từ tài liệu này' +
          (tl.ocr_ghi_chu ? ' — ' + tl.ocr_ghi_chu : '') + '.';
        return;
      }
      /* ⚠️ VÁ REV-0055 · CAO-2 — NÓI ĐÚNG NGUỒN GỐC CỦA CHỮ.
         Bản trước dán cứng "AI đọc từ ảnh" cho cả chữ lấy từ lớp chữ có sẵn
         trong PDF — đoạn chữ mà Workers AI chưa được gọi lấy một lượt. Nhãn
         nói sai nguồn là nhãn sẽ bị bỏ qua, và cả cơ chế "CHƯA KIỂM" sống
         bằng việc người đọc còn tin nhãn đó.
         Nhãn và câu giải thích đều rẽ theo `chu_nguon` MÁY CHỦ trả về; nhãn
         khai ở `src/tai-lieu.js` (`NHAN_CHU_PDF` / `NHAN_SO_AI`), trình duyệt
         KHÔNG giữ bản chép tay. Điểm CHUNG của hai nhánh giữ nguyên: cả hai
         đều là chữ MÁY đọc, con số đều phải đối chiếu bản giấy.
         Câu nhắc đứng TRƯỚC đoạn chữ, không phải chú thích cuối trang: người
         đọc phải biết đây là chữ máy đọc TRƯỚC khi đọc con số. */
      const tuPDF = tl.chu_nguon === 'pdf_lop_chu';
      const nhan = tl.nhan_so_ai ||
        (tuPDF ? 'Chữ có sẵn trong file PDF — CHƯA KIỂM' : NHAN_MAY_DOC_LUI);
      o.innerHTML =
        `<p class="tl-so-ai-nhac">⚠️ <b>${esc(nhan)}.</b> ` +
        (tuPDF
          ? 'Con số được bôi là chữ máy scan nhận dạng sẵn trong file, KHÔNG phải ' +
            'do AI đọc ảnh — nhưng máy scan vẫn đọc nhầm chữ số. '
          : 'Con số được bôi là do AI đọc từ ảnh. AI có thể đọc đúng tờ giấy mà ' +
            'vẫn chép sai vài chữ số. ') +
        'Đối chiếu bản giấy trước khi dùng bất kỳ con số nào vào giấy tờ, tờ ' +
        'khai hay hồ sơ.</p>' +
        `<pre class="tl-chu-van">${veChuCoSo(tl.noi_dung, tl.so_ai, nhan)}</pre>` +
        (tl.ocr_ghi_chu ? `<p class="tl-so-ai-nhac">${esc(tl.ocr_ghi_chu)}</p>` : '');
    } catch (e) { o.textContent = e.message; }
  }));
}

/* ==========================================================================
   KHO TÀI LIỆU QUẢN TRỊ  ·  CTL-0026 Đợt 1 — cửa vào KHO CHUNG
   ---------------------------------------------------------------------------
   Màn này CHỈ làm ba việc: bày danh sách, tìm, và mở màn quét. Toàn bộ lõi
   quét (chụp → nén → gộp trang → gửi lại khi hụt) nằm ở `quet-tai-lieu.js`
   để Đợt 2 (CTL-0025 — quét vào hồ sơ một người) gọi lại y nguyên.

   Danh sách nhóm và quyền lưu do MÁY CHỦ trả về (`nhom`, `nhom_luu_duoc`);
   ở đây không có một dòng nào tự quyết ai xem được gì.
   ========================================================================== */
async function khoiDongKhoTaiLieu() {
  const oDanhSach = $('#tl-danh-sach');
  const oTrong = $('#tl-trong');
  const oTim = $('#tl-tim');
  const oSapHet = $('#tl-sap-het');
  const oNhomLoc = $('#tl-nhom-loc');
  if (!oDanhSach) return;

  const nutQuet = $('#tl-nut-quet');
  let dsNhom = [];            // nhóm XEM được
  let nhomLuuDuoc = [];       // nhóm LƯU được (tập con)
  let nhomDangLoc = '';
  const laAdminTL = TOI.vai_tro === 'admin';

  /* ⚠️ VÁ REV-0040 · LỖI #8 — ĐỪNG HỨA SUÔNG.
     Ba vai trò (nhân viên kho · CSKH · người dùng) XEM được nhóm "Quản trị nội
     bộ" nhưng KHÔNG lưu được nhóm nào. Bản trước vẫn bày nút "📷 Quét tài liệu
     mới" cho họ: bấm vào là mở màn quét rỗng, không nhóm nào chọn được. Máy
     chủ đã chặn đúng (`duocLuuNhomTaiLieu`) nên không mất dữ liệu — nhưng hứa
     một việc rồi không cho làm là lỗi với người dùng.
     BA CHỖ: ẩn sẵn lúc khởi động, hiện lại sau mỗi lần nạp, và cả khi nạp hỏng. */
  function veNutQuet() { if (nutQuet) nutQuet.hidden = !nhomLuuDuoc.length; }
  veNutQuet();

  const tenNhom = (ma) => (dsNhom.find(n => n.ma === ma) || {}).ten || ma;

  function veLoc() {
    if (!oNhomLoc) return;
    oNhomLoc.innerHTML =
      `<button type="button" class="tl-chip${nhomDangLoc ? '' : ' chon'}" data-nhom="">Tất cả</button>` +
      dsNhom.map(n => `<button type="button" class="tl-chip${nhomDangLoc === n.ma ? ' chon' : ''}" data-nhom="${esc(n.ma)}">${esc(n.ten)}</button>`).join('');
    oNhomLoc.querySelectorAll('[data-nhom]').forEach(b => b.addEventListener('click', () => {
      nhomDangLoc = b.dataset.nhom; veLoc(); nap();
    }));
  }

  function ngayGon(s) { return s ? s.split('-').reverse().join('/') : ''; }

  /** Còn mấy ngày tới hạn — số âm là đã quá hạn. */
  function conNgay(hetHan) {
    if (!hetHan) return null;
    const homNay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    return Math.round((Date.parse(hetHan) - Date.parse(homNay)) / 86400000);
  }

  function veMot(t) {
    const con = conNgay(t.ngay_het_han);
    /* Đỏ là NGOẠI LỆ DUY NHẤT của luật ba màu (docs/BANG-MAU.md Mục 3) và chỉ
       dùng cho thứ đã hỏng: giấy đã quá hạn. Sắp hết hạn thì dùng `--warn`
       (vàng nâu, vẫn trong họ nâu–cam), không phải đỏ. */
    const dai = con === null ? ''
      : con < 0 ? `<span class="tl-dai tl-dai-qua">Quá hạn ${-con} ngày</span>`
      : con <= 30 ? `<span class="tl-dai tl-dai-sap">Còn ${con} ngày</span>`
      : `<span class="tl-dai">Hết hạn ${ngayGon(t.ngay_het_han)}</span>`;
    return `
      <article class="tl-the">
        <div class="tl-the-dau">
          <b class="tl-ten">${esc(t.tieu_de)}</b>
          ${t.nhay_cam ? '<span class="tl-dai tl-dai-kin">Nhạy cảm</span>' : ''}
          ${dai}
        </div>
        <div class="tl-the-phu">
          ${esc(tenNhom(t.nhom))}${t.loai ? ' · ' + esc(t.loai) : ''}${t.so_hieu ? ' · ' + esc(t.so_hieu) : ''}
          ${/* MỘT KHO, HAI CỬA NHÌN (CTL-0025 Đợt 2). Giấy quét ở cửa hồ sơ vẫn
                nằm trong kho chung — nhưng phải NÓI RA nó thuộc hồ sơ của ai,
                không thì kho chung hiện thêm một tờ "Quyết định" trôi nổi mà
                người tra không biết của người nào. */''}
          ${t.gan_ten ? '· <b>hồ sơ ' + esc(t.gan_ten) + '</b>' : ''}
          · ${Number(t.so_trang)||0} trang
          ${/* Bóc được mấy trang, và mấy trang trong số đó ĐỐI CHIẾU được. Nói
                cả hai con số: "đã bóc chữ 3 trang" trơn làm người đọc tưởng cả
                ba trang đều đã được kiểm (REV-0044 · L2 — chữ bịa được bảo
                lãnh). Chưa đối chiếu được thì nói thẳng ra ngay ở danh sách. */''}
          ${/* ⚠️ HAI LOẠI PDF PHẢI NHÌN RA ĐƯỢC NGAY TỪ DANH SÁCH (CTL-0026
                vòng 7). "Tìm được theo nội dung" và "chỉ xem được" là khác biệt
                quyết định việc Sếp có phải đi chỉnh máy scan hay không — giấu
                nó sau một cú bấm là để không ai bao giờ thấy. */''}
          ${t.ocr_so_trang
            ? `· ${t.chu_nguon === 'pdf_lop_chu' ? 'chữ có sẵn trong file' : 'bóc chữ'} ` +
              `${Number(t.ocr_so_trang) || 0} trang` +
              (Number(t.ocr_so_trang_neo) >= Number(t.ocr_so_trang)
                ? ' <span class="tl-dai tl-dai-neo">đã đối chiếu</span>'
                : ` <span class="tl-dai tl-dai-sap">${Number(t.ocr_so_trang) - (Number(t.ocr_so_trang_neo) || 0)} trang CHƯA KIỂM</span>`)
            : '· <i>chỉ xem được — tìm bằng tên, số hiệu, loại giấy</i>'}
        </div>
        ${t.trich ? `<p class="tl-trich">${esc(t.trich)}…</p>`
          /* Giấy tờ nhạy cảm KHÔNG có trích đoạn ở danh sách — máy chủ cắt sẵn,
             vì đường danh sách không ghi nhật ký (REV-0036 #5). Phải NÓI RA chỗ
             bị cắt, đừng để trống lặng lẽ: người ta sẽ tưởng tài liệu chưa bóc
             được chữ rồi đi quét lại thêm một lần nữa. */
          : (t.nhay_cam && t.ocr_so_trang
              ? '<p class="tl-trich"><i>Giấy tờ nhạy cảm — nội dung chỉ hiện khi bấm ' +
                '"Xem chữ đã bóc", và mỗi lượt xem đều được ghi nhật ký.</i></p>'
              : '')}
        <div class="tl-the-nut">
          <a class="tl-nut-mo" href="/api/tai-lieu/tep?id=${encodeURIComponent(t.id)}" target="_blank" rel="noopener">Mở bản quét</a>
          ${nutXemChuTaiLieu(t.id)}
          ${/* ⚠️ VÁ REV-0040 · LỖI #7 — NHẬT KÝ GHI MÀ KHÔNG AI XEM ĐƯỢC.
                `API.tlNhatKy` có sẵn từ đợt trước nhưng KHÔNG chỗ nào gọi. Nhật
                ký tồn tại để trả lời "ai đã tiếp cận dữ liệu cá nhân này, ngày
                nào" (Luật BVDLCN 91/2025/QH15) — ghi đủ mà không mở ra xem được
                thì chưa chứng minh được gì, chỉ là ghi cho có.
                CHỈ ADMIN: máy chủ đã chặn 403, đây chỉ là không bày nút vô ích.
                Chỉ hiện ở giấy tờ NHẠY CẢM vì chỉ nhóm đó mới có nhật ký. */''}
          ${laAdminTL && t.nhay_cam
            ? `<button type="button" class="tl-nut-mo tl-nut-nk" data-nk="${t.id}">Nhật ký truy cập</button>` : ''}
          ${/* Sửa số hiệu + tên SAU khi đã lưu — Sếp Ngọc 03/09/2026. */''}
          ${nutSuaTaiLieu(t)}
        </div>
        ${oChuTaiLieu(t.id)}
        ${oSuaTaiLieu(t)}
        <div class="tl-chu tl-nk" id="tl-nk-${t.id}" hidden></div>
      </article>`;
  }

  /* ⚠️ VÁ REV-0040 · LỖI #3 — CON SỐ AI ĐỌC PHẢI HIỆN KHÁC HẲN.
     Hồ Ly đo được một dải mà mô hình GIỮ ĐÚNG danh tính tờ giấy nhưng thay
     lặng lẽ vài con số: MST `0110938472` → `0110934872`, bên mua bịa tên khác,
     không một lời cảnh báo. Mỏ neo không cứu được dải này — danh tính đúng,
     chỉ số sai. Nên mọi con số phải TỰ NÓI nó chưa được kiểm.
     Vị trí cụm số do MÁY CHỦ tính (`so_ai`, src/so-ai.js) — trình duyệt không
     giữ bản dò số thứ hai, vì hai bản chép tay của cùng một định nghĩa chính
     là cách đường đọc CCCD chết âm thầm 11 ngày. */
  async function nap() {
    try {
      const kq = await API.tlDanhSach({
        q: oTim ? oTim.value.trim() : '',
        nhom: nhomDangLoc,
        sapHetHan: oSapHet && oSapHet.checked
      });
      if (kq.nhom && kq.nhom.length !== dsNhom.length) { dsNhom = kq.nhom; veLoc(); }
      else if (!dsNhom.length) { dsNhom = kq.nhom || []; veLoc(); }
      nhomLuuDuoc = kq.nhom_luu_duoc || [];
      TL_NHOM_LUU_DUOC = nhomLuuDuoc;
      veNutQuet();

      const ds = kq.ds || [];
      oDanhSach.innerHTML = ds.map(veMot).join('');
      oTrong.hidden = ds.length > 0;

      /* ---- TỈ LỆ TRA CỨU ĐƯỢC / CHỈ XEM ĐƯỢC  ·  CTL-0026 vòng 7 --------
         Sếp Ngọc cần con số này để biết có phải đi chỉnh máy scan hay không.
         Nhìn từng thẻ một thì không bao giờ thấy ra được tỉ lệ. Đếm do MÁY CHỦ
         làm trên đúng bộ lọc đang hiện, nên lọc theo nhóm thì con số đổi theo —
         một con số đứng yên khi bộ lọc đổi là một con số nói dối.
         Đếm hụt (`dem_chu` = null) thì IM LẶNG bỏ dải, không in số 0 trông như
         đã đếm. */
      /* ---- BA VẾ, MỖI VẾ MỘT CÁCH XỬ KHÁC NHAU ------------------------
         ⚠️ VÁ REV-0055 VÒNG 2 · CAO-A. Bản trước chỉ có hai vế và vế đầu đếm
         "có bóc được chữ không" trong khi CHỮ HỨA là "tìm được theo nội dung"
         — thổi lên 40% trên kho thật. Nay con số vế đầu đúng bằng số tài liệu
         mà gõ một từ trong ruột nó SẼ RA (bàn đo `do-kho-tai-lieu` ⑱ chốt bằng
         đường cuối: lưu N file, gõ tìm, số ra phải khớp con số này).
         Vế GIỮA không phải để cho đẹp: đó là ca CÓ CÁCH XỬ ngay (gõ số hiệu
         vào là máy đối chiếu lại được), khác hẳn vế cuối là không có chữ nào.
         Gộp nó vào vế cuối thì Sếp đi chỉnh máy scan cho những tờ mà máy scan
         đã làm đúng phần việc của nó. */
      const oDem = $('#tl-dem-chu');
      if (oDem) {
        const d = kq.dem_chu;
        const chua = d ? (d.co_chu_chua_tra_duoc || 0) : 0;
        const tong = d ? d.tra_cuu_duoc + chua + d.chi_xem_duoc : 0;
        oDem.hidden = !d || !tong;
        if (d && tong) {
          oDem.innerHTML =
            `<b>${d.tra_cuu_duoc}</b> tài liệu tìm được theo nội dung bên trong` +
            (chua
              ? ` · <b>${chua}</b> có chữ nhưng chưa tra được theo nội dung ` +
                '(máy chưa đối chiếu được chữ với số hiệu — gõ số hiệu vào rồi ' +
                'lưu lại là máy kiểm giúp; riêng giấy tờ nhạy cảm thì nội dung ' +
                'cố ý không vào ô tìm)'
              : '') +
            ` · <b>${d.chi_xem_duoc}</b> chỉ xem được (tìm bằng tên, số hiệu, loại giấy)` +
            (d.chi_xem_duoc
              ? ' — muốn tìm được cả nội dung thì chỉnh máy scan sang chế độ nhận ' +
                'dạng chữ rồi quét lại những tờ hay phải tra.'
              : '');
        }
      }
      /* Bị cắt thì nói ra bằng lời, kèm cách thu hẹp — không im lặng cắt. Dùng
         CHUNG `veDaiCat` như mọi màn khác: bản tự viết cũ ở đây in "đang hiện
         50" mà không có tổng thật, tức là vẫn giấu mất con số người ta cần. */
      veDaiCat('#tl-cat', kq.cat, {
        don_vi: 'tài liệu',
        goi_y: 'Gõ vào ô tìm hoặc chọn một nhóm để thu hẹp lại.'
      });

      /* MỘT hàm cho cả hai cửa (kho chung + hồ sơ nhân sự) — xem
         `noiNutXemChu` ở đầu mục. */
      noiNutXemChu(oDanhSach);
      noiNutSuaTaiLieu(oDanhSach, nap);

      /* Nhật ký truy cập — chỉ Admin, chỉ giấy tờ nhạy cảm (vá REV-0040 #7). */
      oDanhSach.querySelectorAll('[data-nk]').forEach(b => b.addEventListener('click', async () => {
        const o = document.getElementById('tl-nk-' + b.dataset.nk);
        if (!o) return;
        if (!o.hidden) { o.hidden = true; return; }
        o.textContent = 'Đang mở…'; o.hidden = false;
        try {
          const r = await API.tlNhatKy(b.dataset.nk);
          const d = r.ds || [];
          if (!d.length) { o.textContent = 'Chưa ai mở tài liệu này.'; return; }
          /* Nhãn nói ĐÚNG cái nhật ký đang đo: mốc NGÀY, giờ là lượt mở ĐẦU
             TIÊN trong ngày. Ghi "lúc 9:05" trơn là để người ta hiểu nhầm đó là
             lượt mở gần nhất (xem ghiNhatKy() trong src/tai-lieu.js). */
          o.innerHTML =
            '<p class="tl-so-ai-nhac">Nhật ký gộp theo NGÀY: mỗi người mỗi ngày một ' +
            'dòng, giờ ghi là lượt mở <b>đầu tiên</b> trong ngày — không phải số lượt.</p>' +
            '<ul class="tl-nk-ds">' + d.map(k =>
              `<li><b>${esc(k.ho_ten || k.nhan_su_id || '—')}</b> — ` +
              `${k.hanh_dong === 'tai' ? 'tải file' : 'mở xem'} ngày ` +
              `${esc(String(k.ngay || '').split('-').reverse().join('/'))}` +
              `${k.lan_dau_luc ? ', lần đầu lúc ' + esc(String(k.lan_dau_luc).slice(11, 16)) : ''}</li>`
            ).join('') + '</ul>' +
            (r.bi_cat
              ? `<p class="tl-so-ai-nhac">✂️ Đã tải ${r.tran}` +
                `${r.cat && Number.isFinite(r.cat.tong) ? ' trong tổng ' + r.cat.tong : ''} ` +
                'dòng — nhật ký này <b>đã bị cắt bớt</b>. Cần bản đầy đủ thì lấy từ ' +
                'bản sao lưu tháng.</p>'
              : '');
        } catch (e) { o.textContent = e.message; }
      }));
    } catch (e) {
      oDanhSach.innerHTML = '';
      oTrong.hidden = false;
      oTrong.textContent = 'Không tải được kho tài liệu: ' + e.message;
      nhomLuuDuoc = []; veNutQuet();
    }
  }

  if (nutQuet) nutQuet.addEventListener('click', () => {
    moQuetTaiLieu({
      cuaVao: 'kho_chung',
      nhom: dsNhom.filter(n => nhomLuuDuoc.includes(n.ma)),
      /* REV-0046 #2 — Sếp Ngọc: "lưu vào đây luôn THÀNH 1 BỘ là đẹp".
         Chọn nhóm "Nhân sự" ở cửa kho chung thì phải chọn NGƯỜI, không thì tờ
         giấy mang `gan_id` NULL và không bao giờ nằm trong bộ của ai — mở hồ
         sơ ra vẫn thiếu. Danh sách lấy từ MÁY CHỦ ngay lúc cần: không giữ bản
         chép sẵn ở tab này, vì `DS_NHAN_SU_QT` chỉ có khi người dùng đã mở tab
         Nhân sự, mà HCNS hoàn toàn có thể vào thẳng tab Kho tài liệu. */
      timNguoi: async () => {
        const kq = await API.nhanSu();
        return (kq.nhan_su || [])
          .filter(n => n && n.id && n.dang_lam !== 0)
          .map(n => ({ id: n.id, ho_ten: n.ho_ten, chuc_danh: n.chuc_danh || n.vi_tri || '' }));
      },
      khiXong: (kq) => {
        nap();
        alert(cauSauKhiQuet(kq) + '\n\n⚠️ Đây là bản dự phòng. ĐỪNG huỷ bản giấy gốc.');
      }
    });
  });

  if (oTim) {
    let hen = null;
    oTim.addEventListener('input', () => { clearTimeout(hen); hen = setTimeout(nap, 300); });
  }
  if (oSapHet) oSapHet.addEventListener('change', nap);

  await nap();
}

/* ==========================================================================
   BÁO "CÒN CỘT BÊN PHẢI" — Sếp Ngọc 29/08/2026
   ---------------------------------------------------------------------------
   Bảng đối chiếu (đối soát sàn · đơn hoàn · lịch sử đơn hoàn · ma trận xếp
   ca) không ép vừa màn được: bỏ cột là hỏng việc đọc theo hàng ngang. Chúng
   được phép cuộn — nhưng cuộn IM LẶNG mới là lỗi. Người dùng nhìn một bảng
   trông như đã hết, không ai đoán được bên phải còn "Số tiền" với "Kho nhận".

   Dải này CHỈ hiện khi bảng THẬT SỰ còn cột chưa thấy, và tự tắt khi đã kéo
   tới cuối — không phải nhãn trang trí dán sẵn, mà là phép đo tại chỗ. Gắn
   cho MỌI `.table-wrap`/`.table-wrap-cuon` trong ERP, không chép tay từng
   bảng. Bàn đo: `npm run do-bang-vua-man`.
   ========================================================================== */
function ganBaoCuonNgang() {
  const capNhat = (w) => {
    const coCuon = w.scrollWidth > w.clientWidth + 1;
    w.classList.toggle('co-cuon', coCuon);
    // "hết cuộn" = đã kéo tới mép phải; +2px cho sai số làm tròn của trình duyệt.
    w.classList.toggle('het-cuon', w.scrollWidth - w.clientWidth - w.scrollLeft <= 2);
    if (coCuon && !(w.nextElementSibling && w.nextElementSibling.classList.contains('cuon-bao'))) {
      const bao = document.createElement('div');
      bao.className = 'cuon-bao';
      bao.innerHTML = '<b>Còn cột bên phải</b> — kéo ngang để xem tiếp →';
      w.after(bao);
    }
  };
  /* GỘP NHỊP KIỂU "ĐÃ HẸN THÌ THÔI", KHÔNG PHẢI "HUỶ RỒI HẸN LẠI".
     Bản cũ dùng `cancelAnimationFrame(hen)` mỗi lần được gọi. Khi có hai thứ
     cùng theo dõi DOM (dải cuộn + lưới bảng) thì mutation về liên tục từng
     khung hình, lần nào cũng HUỶ cái đã hẹn rồi hẹn cái mới — và phép đo
     KHÔNG BAO GIỜ chạy. Đây là lỗi thật, bắt được 04/09/2026: bảng đã vừa màn
     mà dải "còn cột bên phải" vẫn nằm đó, vì `capNhat` bị bỏ đói.
     Cách này bảo đảm chạy trong đúng khung hình kế tiếp và vẫn gộp. */
  let daHen = false;
  const quetHet = () => {
    if (daHen) return;
    daHen = true;
    requestAnimationFrame(() => {
      daHen = false;
      document.querySelectorAll('.table-wrap, .table-wrap-cuon').forEach(w => {
        if (!w.dataset.baoCuon) {
          w.dataset.baoCuon = '1';
          w.addEventListener('scroll', () => capNhat(w), { passive: true });
          if (window.ResizeObserver) new ResizeObserver(() => capNhat(w)).observe(w);
        }
        capNhat(w);
      });
    });
  };
  quetHet();
  /* `luoiBang()` gọi lại sau khi nó dập lớp cột. Bắt buộc phải có: việc ẩn
     một cột là đổi CLASS (mutation kiểu attributes), mà observer dưới đây chỉ
     nghe `childList` — không có móc này thì dải "còn cột bên phải" giữ nguyên
     trạng thái đo TRƯỚC lúc cột bị ẩn, và bảng đã vừa màn vẫn dán lời nhắc
     kéo ngang. Đúng thứ Sếp bảo bỏ. Bàn đo `do-bang-that` arm B2 bắt được. */
  window.quetLaiBaoCuon = quetHet;
  window.addEventListener('resize', quetHet, { passive: true });
  /* Bảng được vẽ lại liên tục (veBang thay innerHTML của tbody) nên phải theo
     dõi childList.
     Nghe cả `attributes` chứ không chỉ `childList` (thêm 04/09/2026). Việc ẩn
     một cột bảng là đổi CLASS, không thêm bớt thẻ nào — chỉ nghe `childList`
     thì dải "còn cột bên phải" giữ nguyên số đo của lúc bảng CÒN ĐỦ CỘT, và
     một cái bảng đã vừa màn vẫn dán lời nhắc kéo ngang lên mặt người dùng.
     Đúng thứ Sếp gửi ảnh bảo bỏ. Lọc theo ba thuộc tính đổi bố cục, không
     nghe tất — và `capNhat` chỉ `toggle` về đúng giá trị cũ nên không tự kích
     lại chính nó thành vòng lặp. */
  new MutationObserver(quetHet).observe(document.body,
    { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
}
ganBaoCuonNgang();

/* ==========================================================================
   LƯỚI BẢNG — Sếp Ngọc nhắc LẦN THỨ HAI 04/09/2026:
     "ưu tiên hiển thị trên 1 màn hình, hạn chế thanh kéo sang"
   ---------------------------------------------------------------------------
   LỚP VẤN ĐỀ (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md): *mọi bảng trong ERP tràn
   ngang ở bề ngang người ta thật sự dùng*. Không phải một bảng — đo bằng dữ
   liệu THẬT thì 17/26 bảng tràn ngay ở 1440px.

   Sếp gửi ảnh CÓ SẴN dòng "Còn cột bên phải — kéo ngang để xem tiếp →" trong
   khung hình. Nghĩa là lời nhắc KHÔNG PHẢI câu trả lời: Sếp không muốn được
   chỉ cách kéo, Sếp muốn không phải kéo. Dòng đó vẫn giữ, nhưng chỉ cho mấy
   bảng đối chiếu thật sự không ép vừa được.

   HÀM NÀY LÀM BA VIỆC, cho MỌI bảng, kể cả bảng thêm sau này:
     ① dập nhãn cột (`data-nhan`) từ `<th>` xuống từng `<td>` — để ≤780px bảng
       biến thành thẻ mà không mất nghĩa của con số.
     ② dập lớp `.cot-chu` (chữ dài, có trần) và `.cot-phu` (không tham gia
       quyết định → không nằm trên bảng) xuống đúng cột.
     ③ gắn nút "Chi tiết" cho dòng nào CÓ cột phụ. Nút đọc thẳng các ô đang
       ẩn trong DOM — không chép lại dữ liệu, nên không thể lệch với bảng, và
       không có trường nào bị mất đường xem (bài học chị Vũ Lan Hương: cắt
       danh sách âm thầm, `npm run do-cat-im-lang`).

   VÌ SAO ẨN CỘT PHỤ Ở CẢ 1440px. Câu hỏi chọn cột là: *"nhìn một dòng, người
   dùng đang cần quyết định điều gì?"*. Cột không tham gia câu trả lời thì để
   trên bảng cũng chỉ tốn bề ngang. Ẩn ở mọi bề ngang cho ra một luật DUY
   NHẤT, thay vì ba luật theo ba mốc màn hình mà không ai nhớ nổi.

   BẢNG CỐ Ý GIỮ KÉO NGANG nằm ở `BANG_GIU_CUON` — phải có LÝ DO viết bằng
   chữ, bàn đo `do-bang-that.mjs` đọc đúng danh sách này và bắt lỗi nếu thiếu
   lý do. Không có cửa "thêm một con số cho qua".
   ========================================================================== */
const BANG_GIU_CUON = {
  'kd-ds-bang': 'Đối soát sàn — người làm tick từng dòng rồi đọc NGANG cả hàng ' +
    'để so tiền với sàn; đã có 4 cột ghim trái nên kéo ngang vẫn thấy mã đơn. ' +
    'Bỏ cột là hỏng chính việc đối chiếu. Trên điện thoại vẫn đổi sang thẻ.',
  'xc-kehoach-tbody': 'Ma trận xếp ca — một cột là MỘT NGÀY, số cột do lịch ' +
    'quyết chứ không do người thiết kế; ép vừa màn là ép bỏ bớt ngày.',
  'xc-matrix-tbody': 'Ma trận xếp ca theo tuần — cũng một cột một ngày, tiêu đề ' +
    'cột do JS dựng theo lịch chứ không viết sẵn trong app.html, nên không đổi ' +
    'sang thẻ được: nhãn "Thứ Ba 09/09" đi kèm từng ô còn khó đọc hơn bảng.'
};

/* Bảng KHÔNG đổi được sang thẻ: tiêu đề cột do JS dựng theo lịch (một cột một
   ngày), nên nhãn "Thứ Ba 09/09" đi kèm từng ô là vô nghĩa — thẻ ở đây khó
   đọc hơn chính cái bảng. Hai bảng này giữ kéo ngang ở MỌI bề ngang. */
const BANG_KHONG_THANH_THE = new Set(['xc-kehoach-tbody', 'xc-matrix-tbody']);

function luoiBang() {
  const LOP_DAP = ['cot-chu', 'cot-phu', 'num'];
  document.querySelectorAll('table').forEach(t => {
    const hangTieuDe = t.querySelector('thead tr:last-of-type');
    const tb = t.tBodies[0];
    if (!tb) return;
    const ma = tb.id || t.id || '';
    if (!BANG_KHONG_THANH_THE.has(ma)) t.classList.add('luoi-bang');
    if (!hangTieuDe) return;
    const ths = [...hangTieuDe.children];

    for (const tr of tb.rows) {
      /* Đã dập rồi thì THÔI. Bắt buộc: hàm này chạy trong MutationObserver,
         mà nó có chèn nút vào DOM — không chặn ở đây là tự gọi lại vô hạn. */
      if (tr.dataset.luoi || tr.classList.contains('dong-chitiet')) continue;
      if (tr.cells.length !== ths.length) continue;   // dòng gộp ô (trống/tổng) — không phải dòng dữ liệu
      tr.dataset.luoi = '1';

      let coPhu = false;
      [...tr.cells].forEach((td, i) => {
        const th = ths[i];
        const nhan = (th.textContent || '').trim();
        td.dataset.nhan = nhan;
        for (const lop of LOP_DAP) if (th.classList.contains(lop)) td.classList.add(lop);
        if (i === 0) td.classList.add('o-dau');
        /* CHỮ TRẦN TRONG CỘT CHỮ → bọc vào `.dai-gon` (kẹp 2 dòng) kèm nút
           "Xem thêm". Dùng đúng cơ chế `dg()` đã chạy từ trước, không đẻ cách
           thứ hai. Chỉ bọc khi ô CHỈ CÓ CHỮ: ô nào render sẵn nhiều lớp con
           (tên việc + mô tả + kết quả) thì đã tự lo phần hiển thị của nó.
           Chữ ngắn để nguyên — bọc vào cũng không kẹp, chỉ tốn một lớp thẻ. */
        if (td.classList.contains('cot-chu') && !td.children.length) {
          const chu = td.textContent;
          if (chu.length > 55 || (chu.match(/\n/g) || []).length >= 2) td.innerHTML = dg(chu);
        }
        if (th.classList.contains('cot-phu') && td.textContent.trim()) coPhu = true;
      });

      if (coPhu) {
        /* Gắn vào ô HIỆN đầu tiên, không phải ô số 0: có bảng mà chính cột
           đầu là cột phụ (`#` của bảng khách hàng, `Nguồn` của đơn hoàn) —
           gắn vào đó thì nút nằm trong vùng `display:none` và to 0×0px. Bàn
           đo `do-bang-that` arm G2 bắt được đúng lỗi này. */
        const oDau = [...tr.cells].find(td => !td.classList.contains('cot-phu')) || tr.cells[0];
        const nut = document.createElement('button');
        nut.type = 'button';
        nut.className = 'o-chitiet';
        nut.dataset.chitiet = '1';
        nut.setAttribute('aria-expanded', 'false');
        nut.innerHTML = '<span class="mui" aria-hidden="true">›</span><span class="chu">Chi tiết</span>';
        nut.title = 'Xem các trường không hiện trên bảng';
        nut.setAttribute('aria-label', 'Xem các trường không hiện trên bảng');
        oDau.classList.add('co-chitiet');
        oDau.appendChild(nut);
      }
    }
  });
  /* Cột vừa bị ẩn xong thì bảng hẹp lại — bảo dải "còn cột bên phải" đo lại,
     không thì nó giữ số đo của lúc bảng còn đủ cột và dán lời nhắc kéo ngang
     lên một cái bảng đã vừa màn. */
  if (typeof window.quetLaiBaoCuon === 'function') window.quetLaiBaoCuon();
}

/* Mở/đóng dòng chi tiết. Uỷ quyền trên `document` nên bảng vẽ lại bao nhiêu
   lần cũng không phải gắn lại. Nội dung dòng chi tiết dựng TẠI CHỖ từ chính
   các ô đang ẩn — một nguồn sự thật, không có bản chép thứ hai để lệch. */
document.addEventListener('click', (e) => {
  const nut = e.target.closest('button[data-chitiet]');
  if (!nut) return;
  e.stopPropagation();
  const tr = nut.closest('tr');
  if (!tr) return;
  const sau = tr.nextElementSibling;
  if (sau && sau.classList.contains('dong-chitiet')) {
    sau.remove();
    nut.setAttribute('aria-expanded', 'false');
    return;
  }
  /* CỬA QUYỀN. Cột nào đang bị JS ẩn vì QUYỀN (`<th hidden>` — lương, hợp
     đồng, người gửi góp ý…) thì dòng chi tiết TUYỆT ĐỐI không được mở ra:
     "xem chi tiết" là đường xem cho cột bị giấu vì CHẬT, không phải cửa sau
     cho cột bị giấu vì KHÔNG ĐƯỢC XEM. Đọc trạng thái `<th>` ngay lúc bấm,
     không tin vào lớp đã dập từ trước — quyền có thể đổi giữa chừng. */
  const bang = tr.closest('table');
  const ths = bang ? [...(bang.querySelector('thead tr:last-of-type')?.children || [])] : [];
  const oAn = [...tr.cells].filter((td, i) =>
    td.classList.contains('cot-phu') && td.textContent.trim() && !(ths[i] && ths[i].hidden));
  const dong = document.createElement('tr');
  dong.className = 'dong-chitiet';
  const o = document.createElement('td');
  o.colSpan = tr.cells.length;
  const luoi = document.createElement('div');
  luoi.className = 'chitiet-luoi';
  for (const td of oAn) {
    const khoi = document.createElement('div');
    khoi.className = 'chitiet-o';
    const nhan = document.createElement('span');
    nhan.className = 'chitiet-nhan';
    nhan.textContent = td.dataset.nhan || '';
    const tri = document.createElement('span');
    tri.className = 'chitiet-tri';
    /* Chép NODE, không chép chữ: giữ nguyên thẻ trạng thái, liên kết, nút —
       đúng thứ người dùng thấy khi cột còn nằm trên bảng. */
    for (const con of td.childNodes) tri.appendChild(con.cloneNode(true));
    khoi.append(nhan, tri);
    luoi.appendChild(khoi);
  }
  o.appendChild(luoi);
  dong.appendChild(o);
  tr.after(dong);
  nut.setAttribute('aria-expanded', 'true');
});

/* Chạy cùng nhịp với `ganBaoCuonNgang`: một lần lúc dựng, rồi mỗi lần có
   bảng được vẽ lại. `requestAnimationFrame` gộp nhiều lần vẽ liên tiếp thành
   một lượt dập. */
(function noiLuoiBang() {
  /* "Đã hẹn thì thôi", KHÔNG "huỷ rồi hẹn lại" — xem ghi chú dài ở
     `ganBaoCuonNgang`. Huỷ-rồi-hẹn-lại làm phép dập lớp bị bỏ đói khi mutation
     về đều mỗi khung hình. */
  let daHen = false;
  const quet = () => {
    if (daHen) return;
    daHen = true;
    requestAnimationFrame(() => { daHen = false; luoiBang(); });
  };
  quet();
  new MutationObserver(quet).observe(document.body, { childList: true, subtree: true });
})();

/* ---- Mở tab đầu tiên người dùng được xem -------------------------------- */
moTab(TOI.quyen[0]);
