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
   Chỉ admin (Giám đốc, Phó Giám đốc) thấy.
   "ketnoisan" = tab riêng chỉ để kết nối/đồng bộ Shopee, TikTok — tách khỏi
   Kho vận vì đây là việc cấp công ty (ủy quyền shop), không phải việc kho.
   Đơn hoàn không còn là tab riêng — đã gộp làm 1 màn con trong "khovan"
   (xem kvSeg trong app.js), vì đây là nơi kho xác nhận nhận lại hàng hoàn. */
export const TAB = ['tongquan', 'danhba', 'nhansu', 'kinhdoanh', 'khovan', 'ketnoisan', 'ketoan', 'quantri'];

/* Vai trò → được xem mảng nào và làm được gì.
   Danh bạ mở cho tất cả (Sếp Ngọc yêu cầu: ai cũng tra được số liên hệ).

   Ba mức quyền, TÁCH RIÊNG để lương không bị dính theo:
   - admin        : cấp/khoá/đặt lại tài khoản, thêm nhân sự có cả lương.
   - them_nhan_su : thêm nhân sự vào hồ sơ (KHÔNG đụng tới lương, KHÔNG cấp
                    được tài khoản). HCNS có mức này.
   - xem_luong    : xem cột lương. HCNS KHÔNG có — đây là ranh giới cứng.

   Vận hành sàn không có nghiệp vụ kho (không nhập/xuất/tồn — quyenKho() của
   vai trò này mặc định toàn false), nhưng vẫn cần tab "khovan" vì màn Đơn
   hoàn nằm trong đó; app.js tự ẩn các màn con Tồn/Nhập/Xuất/Báo cáo, chỉ để
   lại Đơn hoàn cho vai trò này (xem hàm khoiDongKho). */
const QUYEN_THEO_VAI_TRO = {
  giam_doc:        { tab: ['tongquan', 'danhba', 'nhansu', 'kinhdoanh', 'khovan', 'ketnoisan', 'ketoan', 'quantri'], xem_luong: true,  admin: true,  them_nhan_su: true  },
  pho_giam_doc:    { tab: ['tongquan', 'danhba', 'nhansu', 'kinhdoanh', 'khovan', 'ketnoisan', 'ketoan', 'quantri'], xem_luong: true,  admin: true,  them_nhan_su: true  },
  ke_toan_truong:  { tab: ['tongquan', 'danhba', 'khovan', 'ketnoisan', 'ketoan'],                                   xem_luong: true,  admin: false, them_nhan_su: false },
  quan_ly_kho:     { tab: ['tongquan', 'danhba', 'khovan', 'nhansu'],                                                xem_luong: false, admin: false, them_nhan_su: false },
  nhan_vien_kho:   { tab: ['tongquan', 'danhba', 'khovan'],                                                          xem_luong: false, admin: false, them_nhan_su: false },
  hcns:            { tab: ['tongquan', 'danhba', 'nhansu', 'quantri'],                                               xem_luong: false, admin: false, them_nhan_su: true  },
  van_hanh_san:    { tab: ['tongquan', 'danhba', 'kinhdoanh', 'khovan', 'ketnoisan'],                                xem_luong: false, admin: false, them_nhan_su: false }
};

/* ---- Quyền trong module Kho --------------------------------------------
   Tách 3 mức, giống cách lương được tách riêng ở trên:
   - thao_tac : được nhập/xuất kho (ghi vào sổ cái). Cả quản lý kho lẫn
                nhân viên kho đều có — đây là việc hằng ngày ở kho.
   - quan_ly  : được thêm/sửa mã hàng (SKU), đặt mức tồn tối thiểu. Chỉ
                quản lý kho và ban giám đốc — nhân viên kho KHÔNG có.
   - gia_von  : được xem giá vốn (đơn giá nhập) và giá trị tồn kho. Nhân
                viên kho KHÔNG thấy giá — đây là ranh giới cứng, kiểm ở
                máy chủ chứ không phải ẩn nút.
   Kế toán trưởng xem được tồn + báo cáo + giá vốn nhưng KHÔNG thao tác
   (không nhập/xuất thay kho). */
const QUYEN_KHO = {
  giam_doc:       { thao_tac: true,  quan_ly: true,  gia_von: true  },
  pho_giam_doc:   { thao_tac: true,  quan_ly: true,  gia_von: true  },
  quan_ly_kho:    { thao_tac: true,  quan_ly: true,  gia_von: true  },
  nhan_vien_kho:  { thao_tac: true,  quan_ly: false, gia_von: false },
  ke_toan_truong: { thao_tac: false, quan_ly: false, gia_von: true  }
};

const KHONG_QUYEN_KHO = { thao_tac: false, quan_ly: false, gia_von: false };

export function quyenKho(vaiTro) {
  return QUYEN_KHO[vaiTro] || KHONG_QUYEN_KHO;
}

export function duocThaoTacKho(vaiTro) {
  return quyenKho(vaiTro).thao_tac === true;
}

export function duocQuanLyKho(vaiTro) {
  return quyenKho(vaiTro).quan_ly === true;
}

export function duocXemGiaVon(vaiTro) {
  return quyenKho(vaiTro).gia_von === true;
}

/* ---- Quyền module Đơn hoàn (Shopee/TikTok) ------------------------------
   - xem     : xem danh sách đơn hoàn (trong tab Kho vận) + kết nối/đồng bộ
               (tab Kết nối sàn). Vận hành sàn, kế toán trưởng và ban giám
               đốc đều có.
   - quan_ly : được KẾT NỐI Shopee/TikTok (ủy quyền shop) — chỉ ban giám đốc,
               vì đây là hành động cấp công ty đụng tới tài khoản shop. */
const QUYEN_SHOPEE = {
  giam_doc:       { xem: true, quan_ly: true  },
  pho_giam_doc:   { xem: true, quan_ly: true  },
  van_hanh_san:   { xem: true, quan_ly: false },
  ke_toan_truong: { xem: true, quan_ly: false }
};

const KHONG_QUYEN_SHOPEE = { xem: false, quan_ly: false };

export function quyenShopee(vaiTro) {
  return QUYEN_SHOPEE[vaiTro] || KHONG_QUYEN_SHOPEE;
}

export function duocXemDonHoan(vaiTro) {
  return quyenShopee(vaiTro).xem === true;
}

export function duocQuanLyShopee(vaiTro) {
  return quyenShopee(vaiTro).quan_ly === true;
}

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
  nhan_vien_kho:  'Nhân viên kho',
  hcns:           'Hành chính nhân sự',
  van_hanh_san:   'Vận hành sàn'
};
