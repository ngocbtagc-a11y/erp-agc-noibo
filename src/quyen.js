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
   "lichsuviec" = Lịch sử làm việc (Sếp Ngọc yêu cầu 21/08/2026: lưu trữ quá
   trình làm việc của nhân sự, ai làm gì, xong task nào ra sao) — mở cho MỌI
   vai trò, đúng tinh thần minh bạch đã áp dụng cho Trạm Mục Tiêu (MBOs). */
export const TAB = ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'nhansu', 'kinhdoanh', 'khovan', 'donhoan', 'ketoan', 'quantri'];

/* Vai trò → được xem mảng nào và làm được gì.
   Danh bạ VÀ Chat nội bộ mở cho tất cả (Sếp Ngọc yêu cầu: ai cũng tra được
   số liên hệ; chat là kênh làm việc chung thay Zalo/Misa chat đang loạn).

   Ba mức quyền, TÁCH RIÊNG để lương không bị dính theo:
   - admin        : cấp/khoá/đặt lại tài khoản, thêm nhân sự có cả lương.
   - them_nhan_su : thêm nhân sự vào hồ sơ (KHÔNG đụng tới lương, KHÔNG cấp
                    được tài khoản). HCNS có mức này.
   - xem_luong    : xem cột lương. HCNS KHÔNG có — đây là ranh giới cứng. */
const QUYEN_THEO_VAI_TRO = {
  giam_doc:        { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'nhansu', 'kinhdoanh', 'khovan', 'donhoan', 'ketoan', 'quantri'], xem_luong: true,  admin: true,  them_nhan_su: true  },
  pho_giam_doc:    { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'nhansu', 'kinhdoanh', 'khovan', 'donhoan', 'ketoan', 'quantri'], xem_luong: true,  admin: true,  them_nhan_su: true  },
  ke_toan_truong:  { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'donhoan', 'ketoan'],                                   xem_luong: true,  admin: false, them_nhan_su: false },
  quan_ly_kho:     { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'nhansu'],                                              xem_luong: false, admin: false, them_nhan_su: false },
  nhan_vien_kho:   { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan'],                                                        xem_luong: false, admin: false, them_nhan_su: false },
  hcns:            { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'nhansu', 'quantri'],                                             xem_luong: false, admin: false, them_nhan_su: true  },
  van_hanh_san:    { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'kinhdoanh', 'donhoan'],                                          xem_luong: false, admin: false, them_nhan_su: false },
  // NV Chăm sóc khách hàng (Sếp Ngọc yêu cầu 20/08/2026): xem tab Kinh doanh
  // (đặc biệt pill "Chăm sóc KH" — xếp hạng khách hoàn/hủy nhiều) + Đơn hoàn
  // để nắm tình trạng đơn khi trả lời khách, nhưng KHÔNG được thao tác luồng
  // 3 chặng (không nằm trong CO_THAO_TAC_VAN_HANH bên dưới) — chỉ xem, việc
  // xử lý vẫn của Vận hành sàn/Kho/Kế toán đúng ranh giới bộ phận đã chốt.
  cskh:            { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'kinhdoanh', 'donhoan'],                                          xem_luong: false, admin: false, them_nhan_su: false },
  // Vai trò TEST (Sếp Ngọc chốt 19/08/2026): cho nhân viên vào bấm thử để
  // hiểu luồng 3 chặng Kho -> Vận hành sàn -> Kế toán, KHÔNG dính quyền admin
  // (không cấp/khoá tài khoản, không xem lương, không thêm nhân sự). Xem
  // được đủ các tab liên quan tới luồng đơn hoàn để test trọn vẹn từ đầu tới cuối.
  nv_test:         { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'kinhdoanh', 'khovan', 'donhoan', 'ketoan'],                      xem_luong: false, admin: false, them_nhan_su: false }
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
  ke_toan_truong: { thao_tac: false, quan_ly: false, gia_von: true  },
  nv_test:        { thao_tac: true,  quan_ly: false, gia_von: false }   // test "Đã nhận"/"Cần khiếu nại" ở Kho vận
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

/* ---- Quyền module Đơn hoàn (Shopee) ------------------------------------
   - xem     : xem danh sách đơn hoàn + bấm đồng bộ. Vận hành sàn, kế toán
               trưởng và ban giám đốc đều có.
   - quan_ly : được KẾT NỐI Shopee (ủy quyền shop) — chỉ ban giám đốc, vì
               đây là hành động cấp công ty đụng tới tài khoản shop. */
const QUYEN_SHOPEE = {
  giam_doc:       { xem: true, quan_ly: true  },
  pho_giam_doc:   { xem: true, quan_ly: true  },
  van_hanh_san:   { xem: true, quan_ly: false },
  ke_toan_truong: { xem: true, quan_ly: false },
  // Kho cần XEM đơn hoàn (để nhận hàng, bấm "Đã nhận", quẹt QR) — nhưng KHÔNG
  // được kết nối sàn (quan_ly=false). Danh sách đơn hoàn nằm trong tab Kho vận.
  quan_ly_kho:    { xem: true, quan_ly: false },
  nhan_vien_kho:  { xem: true, quan_ly: false },
  cskh:           { xem: true, quan_ly: false },   // xem để trả lời khách, không thao tác luồng
  nv_test:        { xem: true, quan_ly: false }   // test xem/thao tác đơn hoàn, KHÔNG được nối shop thật
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

/* ---- Ranh giới bộ phận trong luồng đơn hoàn 3 chặng Kho <-> Vận hành sàn <->
   Kế toán (Sếp Ngọc chốt 19/08/2026): mỗi bộ phận CHỈ được sửa/thao tác ở
   đúng chặng việc của mình, xem thì có thể xem rộng hơn (để biết đơn đang ở
   đâu) nhưng KHÔNG được bấm nút của chặng khác. Bộ phận nào, việc nấy:
   - Kho: chỉ "Đã nhận" / "Cần khiếu nại" (duocThaoTacKho, đã có sẵn).
   - Vận hành sàn: chỉ "Đã tra soát" / "Đẩy sang Kho vận" / "Đẩy sang Kế toán"
     (duocThaoTacVanHanh — MỚI, trước đây dùng chung duocXemDonHoan nên kế
     toán trưởng lỡ thao tác được cả bước của vận hành sàn).
   - Kế toán: chỉ "Đã tra soát tiền" (duocXemTab(vaiTro,'ketoan'), đã có sẵn). */
const CO_THAO_TAC_VAN_HANH = new Set(['giam_doc', 'pho_giam_doc', 'van_hanh_san', 'nv_test']);
export function duocThaoTacVanHanh(vaiTro) {
  return CO_THAO_TAC_VAN_HANH.has(vaiTro);
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
  van_hanh_san:   'Vận hành sàn',
  cskh:           'Nhân viên CSKH',
  nv_test:        'Nhân viên (test luồng)'
};
