/* ==========================================================================
   PHÂN QUYỀN — nơi duy nhất quyết định ai được xem gì
   ---------------------------------------------------------------------------
   File này chạy TRÊN MÁY CHỦ. Trình duyệt không đọc được, không sửa được.
   Đây là khác biệt cốt lõi so với bản xem trước cũ: trước kia việc ẩn/hiện
   nằm ở trình duyệt nên chỉ là che; giờ máy chủ tự kiểm tra trước khi trả
   dữ liệu, nên dữ liệu người không có quyền KHÔNG BAO GIỜ rời khỏi máy chủ.
   ========================================================================== */

/* Các mảng dữ liệu trong hệ thống.
   "quantri" = tab quản trị: thêm nhân sự, tạo tài khoản, đặt lại mật khẩu.
   Chỉ admin (Giám đốc, Phó Giám đốc) thấy. */
export const TAB = ['tongquan', 'danhba', 'nhansu', 'kinhdoanh', 'khovan', 'ketoan', 'quantri'];

/* Vai trò → được xem mảng nào và làm được gì.
   Danh bạ mở cho tất cả (Sếp Ngọc yêu cầu: ai cũng tra được số liên hệ).

   Ba mức quyền, TÁCH RIÊNG để lương không bị dính theo:
   - admin        : cấp/khoá/đặt lại tài khoản, thêm nhân sự có cả lương.
   - them_nhan_su : thêm nhân sự vào hồ sơ (KHÔNG đụng tới lương, KHÔNG cấp
                    được tài khoản). HCNS có mức này.
   - xem_luong    : xem cột lương. HCNS KHÔNG có — đây là ranh giới cứng. */
const QUYEN_THEO_VAI_TRO = {
  giam_doc:        { tab: ['tongquan', 'danhba', 'nhansu', 'kinhdoanh', 'khovan', 'ketoan', 'quantri'], xem_luong: true,  admin: true,  them_nhan_su: true  },
  pho_giam_doc:    { tab: ['tongquan', 'danhba', 'nhansu', 'kinhdoanh', 'khovan', 'ketoan', 'quantri'], xem_luong: true,  admin: true,  them_nhan_su: true  },
  ke_toan_truong:  { tab: ['tongquan', 'danhba', 'ketoan'],                                             xem_luong: true,  admin: false, them_nhan_su: false },
  quan_ly_kho:     { tab: ['tongquan', 'danhba', 'khovan', 'nhansu'],                                   xem_luong: false, admin: false, them_nhan_su: false },
  hcns:            { tab: ['tongquan', 'danhba', 'nhansu', 'quantri'],                                  xem_luong: false, admin: false, them_nhan_su: true  },
  van_hanh_san:    { tab: ['tongquan', 'danhba', 'kinhdoanh'],                                          xem_luong: false, admin: false, them_nhan_su: false }
};

/* Vai trò lạ (do gõ sai trong database) → không có quyền gì cả.
   Thà chặn nhầm còn hơn mở nhầm. */
const KHONG_QUYEN = { tab: [], xem_luong: false };

export function quyenCua(vaiTro) {
  return QUYEN_THEO_VAI_TRO[vaiTro] || KHONG_QUYEN;
}

export function duocXemTab(vaiTro, tab) {
  return quyenCua(vaiTro).tab.includes(tab);
}

export function duocXemLuong(vaiTro) {
  return quyenCua(vaiTro).xem_luong === true;
}

/* Admin = người được cấp/khoá/đặt lại tài khoản, thêm nhân sự có cả lương.
   Chỉ Giám đốc và Phó Giám đốc. */
export function laAdmin(vaiTro) {
  return quyenCua(vaiTro).admin === true;
}

/* Được thêm nhân sự vào hồ sơ (admin + HCNS). KHÔNG kéo theo quyền xem lương
   hay cấp tài khoản — hai thứ đó kiểm tra riêng. */
export function duocThemNhanSu(vaiTro) {
  return quyenCua(vaiTro).them_nhan_su === true;
}

/* Các vai trò hợp lệ để admin chọn khi tạo tài khoản mới */
export const VAI_TRO_HOP_LE = Object.keys(QUYEN_THEO_VAI_TRO);

/* Tên hiển thị của vai trò */
export const TEN_VAI_TRO = {
  giam_doc:       'Giám đốc',
  pho_giam_doc:   'Phó Giám đốc',
  ke_toan_truong: 'Kế toán trưởng',
  quan_ly_kho:    'Quản lý kho',
  hcns:           'Hành chính nhân sự',
  van_hanh_san:   'Vận hành sàn'
};
