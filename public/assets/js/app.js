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
  { id: 'gopy',      ten: 'Góp ý ERP',  nhom: null, icon: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
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
  window.LAM_MOI_HOSO_NHANSU?.();
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

/* Badge trạng thái Tài khoản + nút thao tác — DÙNG CHUNG giữa bảng "Quản
   trị → Tài khoản" và khối "Tài khoản ERP" trong Hồ sơ nhân sự (Employee
   Profile Phase 1, 25/08/2026) — Rule 5, không viết lại 2 lần. `n` là 1
   dòng trong DS_NHAN_SU_QT (đã có sẵn tai_khoan_id/ten_dang_nhap/vai_tro/
   kich_hoat/phai_doi_mk qua qtDanhSach, không cần gọi thêm API). */
function veCotTaiKhoan(n) {
  if (!n.tai_khoan_id) return '<span class="tag mute">Chưa có</span>';
  if (!n.kich_hoat) return `<span class="tag danger">Đã khoá</span> <span class="sm">${esc(n.ten_dang_nhap)}</span>`;
  return `<span class="nm">${esc(n.ten_dang_nhap)}</span>` + (n.phai_doi_mk ? ' <span class="tag warn">chờ đổi MK</span>' : '');
}
function veThaoTacTaiKhoan(n) {
  if (!n.tai_khoan_id) {
    return TOI.duoc_tao_tai_khoan
      ? `<button class="btn-nho btn-primary" data-tao="${esc(n.id)}" data-ten-goi-y="${esc(String(n.sdt || '').replace(/\D/g, ''))}" data-ten="${esc(n.ho_ten)}">Tạo tài khoản</button>`
      : '<span class="sm">—</span>';
  }
  if (!TOI.la_admin) return '<span class="sm">—</span>';
  return `<button class="btn-nho btn-phu" data-doivaitro="${n.tai_khoan_id}" data-doivaitro-ten="${esc(n.ho_ten)}" data-doivaitro-hientai="${esc(n.vai_tro || '')}">Đổi vai trò</button> ` +
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
    const tenVaiTro = coTK ? (vai_tro.find(v => v.ma === n.vai_tro)?.ten || n.vai_tro) : '';
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
  moi:                  { chu: 'Mới gửi',              mau: 'mute',   uuTien: true  },
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

/* Số byte THẬT của ảnh sau khi giải mã base64 — đúng cách backend đo
   (`atob(raw).length` trong gopYGui), để frontend không đoán sai rồi bị
   backend trả 413. */
function coByteCuaDataUrl(dataUrl) {
  const s = String(dataUrl || '');
  const b64 = s.slice(s.indexOf(',') + 1);
  const demDauBang = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor(b64.length * 3 / 4) - demDauBang;
}

/* Nén ảnh bằng canvas — MỘT hàm cho mọi chỗ trong ERP. Luôn trả về data URL
   JPEG (máy chủ chỉ lưu base64/nhị phân thẳng vào D1, không tự nén được).

   tuyChon:
   - `cheDo`        'vua-khung' (mặc định) giữ nguyên tỉ lệ, CHỈ co lại chứ
                    không phóng to · 'vuong' cắt giữa thành ảnh vuông đúng
                    `canhToiDa`×`canhToiDa` (ảnh đại diện — phải đủ nét ở mọi
                    kích thước hiển thị nên cho phép phóng to ảnh nhỏ).
   - `canhToiDa`    cạnh dài nhất (px).
   - `chatLuong`    chất lượng JPEG lượt vẽ đầu (0–1).
   - `gioiHanByte`  > 0 thì nén cho tới khi LỌT giới hạn của backend: hạ chất
                    lượng trước (chữ trong ảnh chụp màn hình còn đọc được),
                    hết nấc mới thu nhỏ kích thước. Rule 12 (Human Cost) —
                    người dùng dán ảnh to thì máy tự lo, không bắt họ mở phần
                    mềm khác cắt/nén rồi quay lại.

   Luôn tô NỀN TRẮNG trước khi vẽ: JPEG không có kênh trong suốt, không tô
   thì ảnh PNG trong suốt ra nền ĐEN, người dùng tưởng ảnh hỏng. */
function nenAnhChung(file, tuyChon = {}) {
  const {
    cheDo = 'vua-khung',
    canhToiDa = 1600,
    chatLuong = 0.8,
    gioiHanByte = 0,
    nacChatLuong = [0.7, 0.6, 0.5],
    soLanThuNho = 6
  } = tuyChon;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');

      const ve = (tiLe, cl) => {
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (cheDo === 'vuong') {
          const canh = Math.min(img.width, img.height);
          sx = (img.width - canh) / 2; sy = (img.height - canh) / 2;
          sw = canh; sh = canh;
          canvas.width = canvas.height = Math.max(1, Math.round(canhToiDa * tiLe));
        } else {
          canvas.width = Math.max(1, Math.round(img.width * tiLe));
          canvas.height = Math.max(1, Math.round(img.height * tiLe));
        }
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', cl);
      };

      let ti = cheDo === 'vuong'
        ? 1
        : Math.min(1, canhToiDa / Math.max(img.width, img.height));

      let kq = ve(ti, chatLuong);
      if (gioiHanByte > 0) {
        for (const cl of nacChatLuong) {
          if (coByteCuaDataUrl(kq) <= gioiHanByte) break;
          kq = ve(ti, cl);
        }
        // Vẫn nặng (ảnh chụp màn hình 4K nhiều chi tiết) → thu nhỏ dần.
        const clCuoi = nacChatLuong.length ? nacChatLuong[nacChatLuong.length - 1] : chatLuong;
        for (let i = 0; i < soLanThuNho && coByteCuaDataUrl(kq) > gioiHanByte; i++) {
          ti *= 0.8;
          kq = ve(ti, clCuoi);
        }
      }
      resolve(kq);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này')); };
    img.src = url;
  });
}

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
    window.LAM_MOI_TRANGTHAI_DANHBA?.(TOI.id, ma, ghiChu || null);
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
});
nutCaiDat?.addEventListener('click', async () => {
  if (!_suKienCaiDat) return;
  nutCaiDat.hidden = true;
  _suKienCaiDat.prompt();
  await _suKienCaiDat.userChoice;
  _suKienCaiDat = null;
});
window.addEventListener('appinstalled', () => { nutCaiDat.hidden = true; });

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
    window.moChatVoi?.(btn.getAttribute('data-chatngay'), btn.getAttribute('data-ten'), btn.getAttribute('data-vt'));
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
  nutMoVd.addEventListener('click', () => dongMoFormVd($('#vd-form-body').hidden));
  $('#vd-nut-huy').addEventListener('click', () => {
    $('#vd-form').reset();
    veNguoiVd();
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
    chonNguoi.value = nhanSuId;
    veNguoiVd();
    $('#vd-noidung').value = loiKhenNhap || '';
    const oSao = $('#vd-so-sao');
    if (oSao) oSao.value = 3;
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
      veNguoiVd();
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
    if (choDuyetGiao > 0) canhBao.push({ m: 'warn', b: `${choDuyetGiao} việc đang chờ Sếp duyệt`, s: 'Bấm để xem trong Việc tôi giao', t: 'Công việc',
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
    the.push({ k: 'Việc đang mở', v: String(nhan.length), d: 'Việc cần làm của tôi',
      onClick: () => window.MO_DEN_VIEC_CUA_TOI && window.MO_DEN_VIEC_CUA_TOI('nhan') });
    the.push({ k: 'Việc quá hạn', v: String(quaHanNhan.length), d: quaHanNhan.length ? 'Cần xử lý ngay' : 'Không có', dir: quaHanNhan.length ? 'down' : '',
      onClick: quaHanNhan.length ? () => window.MO_DEN_VIEC_CUA_TOI && window.MO_DEN_VIEC_CUA_TOI('nhan', quaHanNhan[0].id) : null });
    if (giao.length > 0) the.push({ k: 'Việc tôi giao — chờ duyệt', v: String(choDuyetGiao), d: `${giao.length} việc đang giao`,
      onClick: () => window.MO_DEN_VIEC_CUA_TOI && window.MO_DEN_VIEC_CUA_TOI('giao') });
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

  // Chuyển màn Việc tôi nhận / Việc tôi giao
  function chuyenSegCv(seg) {
    const nut = document.querySelector(`#cvSeg .seg-nut[data-cv="${seg}"]`);
    if (!nut) return;
    document.querySelectorAll('#cvSeg .seg-nut').forEach(b => b.classList.toggle('active', b === nut));
    ['nhan', 'phoihop', 'giao'].forEach(k => {
      const pane = document.getElementById('cv-pane-' + k);
      if (pane) pane.hidden = (k !== seg);
    });
  }
  $('#cvSeg').addEventListener('click', (e) => {
    const nut = e.target.closest('.seg-nut');
    if (nut) chuyenSegCv(nut.dataset.cv);
  });

  // Drill Down to Action (audit Home/Dashboard 23/08/2026): counter "Việc
  // đang mở/quá hạn/chờ duyệt" ở khối tóm tắt (veTongQuanTheoVaiTro) bấm
  // vào phải nhảy thẳng tới đúng bảng Việc của MÌNH, không phải ngõ cụt —
  // chỉ dùng cho Việc CỦA NGƯỜI ĐANG XEM (cv-bang-nhan/giao vốn đã lọc
  // theo đúng người). Việc của NGƯỜI KHÁC (Admin/Manager xem team) dùng
  // window.MO_DEN_LICHSU_TIM ở khoiDongLichSuViec thay vì hàm này.
  window.MO_DEN_VIEC_CUA_TOI = (seg, rowId) => {
    moTab('tongquan');
    chuyenSegCv(seg);
    requestAnimationFrame(() => {
      const box = $('#cvSeg');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (rowId != null) {
        const tr = document.querySelector(`#cv-bang-${seg} tr[data-id="${rowId}"]`);
        if (tr) { tr.scrollIntoView({ behavior: 'smooth', block: 'center' }); tr.classList.add('canh-bao'); setTimeout(() => tr.classList.remove('canh-bao'), 2500); }
      }
    });
  };

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
      return `<td><div class="nm">${esc(r.tieu_de)}${nhanTodo}</div>${r.muc_tieu_ten ? `<div class="sm">🎯 Thuộc mục tiêu: ${esc(r.muc_tieu_ten)}</div>` : ''}${r.mo_ta ? `<div class="sm">${dg(r.mo_ta)}</div>` : ''}${r.phoi_hop_ten ? `<div class="sm">🤝 Phối hợp: ${esc(r.phoi_hop_ten)}</div>` : ''}${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${dg(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm">${r.dau_ra ? dg(r.dau_ra) : '—'}</td>` +
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
      return `<td><div class="nm">${esc(r.tieu_de)}</div>${r.muc_tieu_ten ? `<div class="sm">🎯 Thuộc mục tiêu: ${esc(r.muc_tieu_ten)}</div>` : ''}${r.mo_ta ? `<div class="sm">${dg(r.mo_ta)}</div>` : ''}${r.phoi_hop_ten ? `<div class="sm">🤝 Phối hợp: ${esc(r.phoi_hop_ten)}</div>` : ''}${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${dg(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm">${dg(r.dau_ra)}</td>` +
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
      return `<td><div class="nm">${esc(r.tieu_de)}</div>${r.muc_tieu_ten ? `<div class="sm">🎯 Thuộc mục tiêu: ${esc(r.muc_tieu_ten)}</div>` : ''}${r.mo_ta ? `<div class="sm">${dg(r.mo_ta)}</div>` : ''}</td>` +
        `<td class="sm">${dg(r.dau_ra)}</td>` +
        `<td class="sm">${esc(r.nguoi_nhan_ten)}</td>` +
        `<td class="sm">${esc(r.nguoi_giao_ten)}</td>` +
        `<td class="sm">${dongHan(r.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>`;
    });
    $('#cv-trong-phoihop').hidden = (kq.phoi_hop || []).length > 0;
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
    await taiLai();
    await taiLaiTongQuanCongTy();
    if (window.LAM_MOI_LICHSU_VIEC) window.LAM_MOI_LICHSU_VIEC();
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
  $('#cv-bang-nhan').addEventListener('click', xuLyNut);
  $('#cv-bang-giao').addEventListener('click', xuLyNut);

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
      return `<td><div class="nm">${esc(r.tieu_de)}</div>${r.dau_ra ? `<div class="sm">${dg(r.dau_ra)}</div>` : ''}${r.ket_qua ? `<div class="sm"><b>Kết quả:</b> ${dg(r.ket_qua)}</div>` : ''}</td>` +
        `<td class="sm">${esc(r.nguoi_nhan_ten)}</td>` +
        `<td class="sm">${esc(r.nguoi_giao_ten)}</td>` +
        `<td class="sm">${esc(r.muc_tieu_ten || '—')}</td>` +
        `<td class="sm">${hanChotVN(r.han_chot)}</td>` +
        `<td><span class="tag ${tt.mau}">${tt.chu}</span></td>` +
        `<td class="sm">${capNhatVN(r.cap_nhat_luc)}</td>`;
    });
    $('#ls-cv-trong').hidden = ds.length > 0;
  }

  async function taiLaiLichSuCv() {
    try {
      const { viec } = await API.cvLichSu();
      DS_LSCV = viec || [];
    } catch { /* trống — hiện bảng rỗng, không chặn cả trang */ }
    veBangLsCv();
  }

  await taiLaiLichSuCv();
  // UI STATE CONSISTENCY: mọi màn khác đổi cong_viec (khoiDongCongViec) gọi
  // hàm này để tab Lịch sử làm việc luôn khớp dữ liệu mới nhất, không cần F5
  // (bug thật 23/08/2026: hoàn thành/tạo việc xong, tab này vẫn hiện dữ liệu
  // cũ vì chỉ tải 1 lần lúc vào trang).
  window.LAM_MOI_LICHSU_VIEC = taiLaiLichSuCv;

  // Drill Down to Action: Admin/Manager bấm 1 dòng "quá hạn/chờ duyệt"
  // của NGƯỜI KHÁC ở khối tóm tắt (veTongQuanTheoVaiTro) — bảng Việc
  // cần làm/tôi giao của họ chỉ có việc CỦA CHÍNH họ nên không scroll-tới
  // được; Lịch sử làm việc là nơi DUY NHẤT xem được việc của mọi người,
  // tái dùng luôn ô tìm/lọc trạng thái đã có thay vì xây thêm view mới
  // (audit Home/Dashboard 23/08/2026, Rule 5 reuse).
  window.MO_DEN_LICHSU_TIM = (tuKhoa) => {
    moTab('lichsuviec');
    const oTim = $('#ls-cv-tim'), oLoc = $('#ls-cv-loctt');
    if (oLoc) oLoc.value = '';
    if (oTim) { oTim.value = tuKhoa || ''; oTim.dispatchEvent(new Event('input', { bubbles: true })); oTim.focus(); }
    requestAnimationFrame(() => { const b = $('#ls-cv-bang'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
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
      hop_dong: 'Hợp đồng lao động'
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
        `<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">${veCotTaiKhoan(n)}<span class="sm">${n.tai_khoan_id ? esc((DS_VAI_TRO_QT.find(v => v.ma === n.vai_tro) || {}).ten || n.vai_tro || '') : ''}</span></div>` +
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
        return `<td class="sm">${esc(LOAI_HD_CHU[h.loai] || h.loai)}${an ? ' <span class="tag mute">đã ẩn</span>' : ''}</td>` +
          `<td class="sm">${esc(ngayIsoVN(h.ngay_bat_dau))}</td>` +
          `<td class="sm">${nhanHan}</td>` +
          `<td class="sm">${h.loai === 'xac_dinh_th' ? esc(String(h.lan_thu || 1)) : '—'}</td>` +
          `<td class="sm">${esc(h.so_hd || '—')}</td>` +
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
  let dsGopY = [], laAd = false;

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

  function veDongGopY(g) {
    const tt = GOPY_TRANG_THAI[g.trang_thai] || GOPY_TRANG_THAI.moi;
    return `<tr data-id="${g.id}">` +
      `<td><div class="nm">${esc(g.tieu_de)}</div>${g.khu_vuc ? `<div class="sm">${esc((TAB.find(t => t.id === g.khu_vuc) || {}).ten || g.khu_vuc)}</div>` : ''}</td>` +
      (laAd ? `<td class="sm">${esc(g.nguoi_gui_ten)}</td>` : '') +
      `<td><span class="tag ${tt.mau}">${esc(tt.chu)}</span>` +
        (laAd && g.trang_thai === 'moi' && g.de_xuat_trang_thai ? ' <span title="Hồ Ly đã có đề xuất">🦊</span>' : '') +
      `</td>` +
      `<td class="sm">${thoiGianTruoc(g.cap_nhat_luc || g.tao_luc)}</td>` +
      `<td><button type="button" class="btn-nho" data-gyxem="${g.id}">Xem</button></td></tr>`;
  }

  async function taiLai() {
    let kq;
    try { kq = await API.gopYDanhSach(); } catch { return; }
    dsGopY = kq.gop_y || [];
    laAd = !!kq.la_admin;

    $('#gy-cot-nguoigui').hidden = !laAd;
    $('#gy-danhsach-tieude').textContent = laAd ? 'Tất cả góp ý' : 'Yêu cầu của tôi';

    const canXuLy = laAd ? dsGopY.filter(g => (GOPY_TRANG_THAI[g.trang_thai] || {}).uuTien) : [];
    $('#gy-canxuly-panel').hidden = canXuLy.length === 0;
    $('#gy-canxuly-bang').innerHTML = canXuLy.map(veDongGopY).join('');

    $('#gy-bang').innerHTML = dsGopY.map(veDongGopY).join('');
    $('#gy-trong').hidden = dsGopY.length > 0;
  }

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

    const triageKhoi = $('#gyCtTriageKhoi');
    triageKhoi.hidden = !laAd;
    if (laAd) {
      $('#gyCtTrangThai').value = g.trang_thai;
      $('#gyCtLoai').value = g.loai || '';
      $('#gyCtGhiChu').value = '';
      $('#gyCtTriageLoi').textContent = '';
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
    modal.hidden = false;

    try {
      const { lich_su } = await API.gopYLichSu(id);
      $('#gyCtLichSu').innerHTML = (lich_su || []).length
        ? lich_su.map(ls => `<div class="sm" style="margin-bottom:4px">` +
            `${esc(ls.nguoi_doi_ten)} đổi ` +
            `${ls.tu_trang_thai ? `<b>${esc((GOPY_TRANG_THAI[ls.tu_trang_thai] || {}).chu || ls.tu_trang_thai)}</b> → ` : ''}` +
            `<b>${esc((GOPY_TRANG_THAI[ls.den_trang_thai] || {}).chu || ls.den_trang_thai)}</b>` +
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
    $('#gyCtTrangThai').value = g.de_xuat_trang_thai;
    $('#gyCtLoai').value = g.de_xuat_loai || '';
    $('#gyCtGhiChu').value = '🦊 Hồ Ly (AI) đề xuất: ' + (g.de_xuat_ly_do || '');
    $('#gyCtGhiChu').focus();
  });

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
        ghi_chu: $('#gyCtGhiChu').value.trim() || null
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
  }
  $('#qtBang').addEventListener('click', xuLyThaoTacTaiKhoan);
  $('#nsSua-taikhoan').addEventListener('click', xuLyThaoTacTaiKhoan);

  /* Combobox vai trò, giữ 2 nhóm "Vai trò hệ thống" tách khỏi "Vị trí công
     việc" (Sếp chốt 23/08/2026: 2 thứ khác nhau, không gộp 1 danh sách
     phẳng) — nhom đến từ src/quyen.js nhomVaiTro(), không suy đoán ở
     frontend. tienTo = "taoTkVaiTro" | "doiVaiTroMoi", khớp id các phần tử
     combo (${tienTo}HienThi/Panel/Tim/GoiY) + input hidden ${tienTo}. */
  function veTuyChonVaiTro(tienTo, hienTai) {
    const oGiaTri = $('#' + tienTo);
    if (hienTai) oGiaTri.value = hienTai;
    return ganCombo({
      hienThi: $('#' + tienTo + 'HienThi'), panel: $('#' + tienTo + 'Panel'),
      tim: $('#' + tienTo + 'Tim'), goiY: $('#' + tienTo + 'GoiY'), giaTri: oGiaTri
    }, () => DS_VAI_TRO_QT.map(v => ({
      gia_tri: v.ma, nhan: v.ten, nhom: v.nhom === 'he_thong' ? 'Vai trò hệ thống' : 'Vị trí công việc'
    })), null, 'Chọn vai trò...');
  }

  // Hộp tạo tài khoản
  function moHopTaoTaiKhoan(nhanSuId, tenGoiY, hoTen) {
    $('#taoTkHoTen').textContent = hoTen || '';
    $('#taoTkTen').value = tenGoiY || '';
    $('#taoTkVaiTro').value = '';
    veTuyChonVaiTro('taoTkVaiTro');
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
    veTuyChonVaiTro('doiVaiTroMoi', vaiTroHienTai);
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
