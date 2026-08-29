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
   Chỉ vai trò hệ thống Admin/Admin backup thấy.
   "lichsuviec" = Lịch sử làm việc (Sếp Ngọc yêu cầu 21/08/2026: lưu trữ quá
   trình làm việc của nhân sự, ai làm gì, xong task nào ra sao) — mở cho MỌI
   vai trò, đúng tinh thần minh bạch đã áp dụng cho Trạm Mục Tiêu (MBOs).
   "gopy" = Góp ý & Cải tiến ERP (spec Sếp Ngọc 25/08/2026) — mở cho MỌI
   vai trò để gửi vấn đề thực tế, nhưng mỗi người CHỈ xem request của MÌNH
   (enforced ở src/index.js, không phải ở đây — tab mở nghĩa là "vào được
   trang", còn dữ liệu bên trong lọc theo laAdmin() để phân Employee/
   Reviewer, xem nsTrangThaiHD-style pattern). */
export const TAB = ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'nhansu', 'kinhdoanh', 'khovan', 'donhoan', 'ketoan', 'dulieunen', 'quantri', 'taisan', 'xepca', 'khotailieu', 'gopy'];

/* Vai trò → được xem mảng nào và làm được gì.
   Danh bạ VÀ Chat nội bộ mở cho tất cả (Sếp Ngọc yêu cầu: ai cũng tra được
   số liên hệ; chat là kênh làm việc chung thay Zalo/Misa chat đang loạn).

   Ba mức quyền, TÁCH RIÊNG để lương không bị dính theo:
   - admin        : cấp/khoá/đặt lại tài khoản, thêm nhân sự có cả lương.
   - them_nhan_su : thêm nhân sự vào hồ sơ (KHÔNG đụng tới lương, KHÔNG cấp
                    được tài khoản). HCNS có mức này.
   - xem_luong    : xem cột lương. HCNS KHÔNG có — đây là ranh giới cứng. */
const QUYEN_THEO_VAI_TRO = {
  // ---- Vai trò HỆ THỐNG (nhomVaiTro='he_thong') — Sếp chốt 23/08/2026 ----
  // Admin = toàn quyền (gộp Giám đốc + Phó Giám đốc + Admin hệ thống cũ
  // thành 1 vai trò hệ thống duy nhất — chức danh thật của người đó vẫn ở
  // hồ sơ nhân sự (chuc_vu), KHÔNG còn gắn cứng vào vai trò đăng nhập).
  admin:           { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'nhansu', 'kinhdoanh', 'khovan', 'donhoan', 'ketoan', 'dulieunen', 'quantri', 'taisan', 'xepca', 'khotailieu', 'gopy'], xem_luong: true,  admin: true,  them_nhan_su: true  },
  // Admin backup = "quyền tạo tài khoản, phân quyền" — KHÔNG phải toàn
  // quyền Admin (không unlock dữ liệu khoá, không khoá/xoá tài khoản người
  // khác, không xem lương). Dùng khi Admin vắng mặt cần người tạo gấp tài
  // khoản cho nhân viên mới — xem duocTaoTaiKhoan()/qtSuaVaiTro bên dưới.
  admin_backup:    { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'nhansu', 'dulieunen', 'quantri', 'taisan', 'xepca', 'khotailieu', 'gopy'],                                 xem_luong: false, admin: false, them_nhan_su: true  },
  // Người dùng = tài khoản thường, không quyền hệ thống gì thêm — mặc định
  // hợp lý cho ai chưa gán đúng vị trí công việc cụ thể.
  nguoi_dung:      { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'taisan', 'xepca', 'khotailieu', 'gopy'],                                                                  xem_luong: false, admin: false, them_nhan_su: false },
  // ---- Vị trí công việc (nhomVaiTro='vi_tri') ----
  ke_toan_truong:  { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'donhoan', 'ketoan', 'taisan', 'xepca', 'khotailieu', 'gopy'],                                   xem_luong: true,  admin: false, them_nhan_su: false },
  quan_ly_kho:     { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'nhansu', 'dulieunen', 'taisan', 'xepca', 'khotailieu', 'gopy'],                                 xem_luong: false, admin: false, them_nhan_su: false },
  nhan_vien_kho:   { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'taisan', 'xepca', 'khotailieu', 'gopy'],                                                        xem_luong: false, admin: false, them_nhan_su: false },
  hcns:            { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'nhansu', 'dulieunen', 'quantri', 'taisan', 'xepca', 'khotailieu', 'gopy'],                                xem_luong: false, admin: false, them_nhan_su: true  },
  van_hanh_san:    { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'kinhdoanh', 'donhoan', 'taisan', 'xepca', 'khotailieu', 'gopy'],                                          xem_luong: false, admin: false, them_nhan_su: false },
  // NV Chăm sóc khách hàng (Sếp Ngọc yêu cầu 20/08/2026): xem tab Kinh doanh
  // (đặc biệt pill "Chăm sóc KH" — xếp hạng khách hoàn/hủy nhiều) + Đơn hoàn
  // để nắm tình trạng đơn khi trả lời khách, nhưng KHÔNG được thao tác luồng
  // 3 chặng (không nằm trong CO_THAO_TAC_VAN_HANH bên dưới) — chỉ xem, việc
  // xử lý vẫn của Vận hành sàn/Kho/Kế toán đúng ranh giới bộ phận đã chốt.
  cskh:            { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'kinhdoanh', 'donhoan', 'taisan', 'xepca', 'khotailieu', 'gopy'],                                          xem_luong: false, admin: false, them_nhan_su: false },
  // Vai trò TEST (Sếp Ngọc chốt 19/08/2026): cho nhân viên vào bấm thử để
  // hiểu luồng 3 chặng Kho -> Vận hành sàn -> Kế toán, KHÔNG dính quyền admin
  // (không cấp/khoá tài khoản, không xem lương, không thêm nhân sự). Xem
  // được đủ các tab liên quan tới luồng đơn hoàn để test trọn vẹn từ đầu tới cuối.
  nv_test:         { tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'kinhdoanh', 'khovan', 'donhoan', 'ketoan', 'taisan', 'xepca', 'khotailieu', 'gopy'],                      xem_luong: false, admin: false, them_nhan_su: false }
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
  admin:          { thao_tac: true,  quan_ly: true,  gia_von: true  },
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

/* ---- Quyền Sản phẩm/SKU — TÁCH RIÊNG khỏi "quan_ly" kho nói chung
   (Sếp chốt 22/08/2026: Kinh doanh là chủ sở hữu Sản phẩm/SKU — họ quyết
   định bán gì — nhưng Kho vận vẫn sửa được hằng ngày vì là người nhập/
   xuất thực tế). Data Ownership: xem docs/DATA_OWNERSHIP_MATRIX.md.
   - sua  : được Thêm/Sửa/Ẩn-hiện mã hàng.
   - khoa : được "Hoàn tất" (khoá) — chỉ chủ sở hữu thật (Kinh doanh) +
            Admin. Kho vận sửa ngày thường nhưng KHÔNG phải người khoá. */
const QUYEN_SAN_PHAM = {
  admin:         { sua: true, khoa: true },
  van_hanh_san:  { sua: true, khoa: true },
  quan_ly_kho:   { sua: true, khoa: false }
};
const KHONG_QUYEN_SAN_PHAM = { sua: false, khoa: false };

export function quyenSanPham(vaiTro) {
  return QUYEN_SAN_PHAM[vaiTro] || KHONG_QUYEN_SAN_PHAM;
}

export function duocSuaSanPham(vaiTro) {
  return quyenSanPham(vaiTro).sua === true;
}

export function duocKhoaSanPham(vaiTro) {
  return quyenSanPham(vaiTro).khoa === true;
}

/* ---- Quyền module Tài sản -----------------------------------------------
   Data Owner = P. Support/Hành chính (admin, admin_backup, hcns — đúng bộ
   vai trò đang gộp Kế toán-Nhân sự-Admin thành 1 phòng thật, xem
   docs/ENTITY_IDENTITY.md). Toàn bộ nhân viên (đã có tab 'taisan') XEM
   được danh sách + lịch sử — chỉ nhóm này mới tạo/cấp phát/thu hồi/thanh lý.
   Riêng "Báo hỏng" cho phép TỰ báo với tài sản đang giữ (self-service, xem
   src/taisan.js), không cần nằm trong nhóm này. */
const CO_QUAN_LY_TAI_SAN = new Set(['admin', 'admin_backup', 'hcns']);
export function duocQuanLyTaiSan(vaiTro) {
  return CO_QUAN_LY_TAI_SAN.has(vaiTro);
}

/* ---- Quyền module Đăng ký ca / Xếp ca ------------------------------------
   Data Owner CHÍNH SÁCH (mẫu ca, ca mở, hạn đăng ký) = HR/Admin — cùng bộ
   vai trò với them_nhan_su (admin, admin_backup, hcns).
   DUYỆT đăng ký thì KHÔNG theo vai trò — theo phong_ban.truong_phong_id có
   khớp với người đang đăng nhập không (kiểm tra ở src/ca.js, cần đọc DB nên
   không thể là 1 hàm tĩnh ở đây). Admin (laAdmin) luôn duyệt được mọi phòng.
   XEM tab 'xepca' mở cho MỌI vai trò — nhân viên part-time/thời vụ tự đăng
   ký; ai không phải trưởng phòng/admin thì chỉ thấy phần đăng ký của mình. */
const CO_QUAN_LY_CHINH_SACH_CA = new Set(['admin', 'admin_backup', 'hcns']);
export function duocQuanLyChinhSachCa(vaiTro) {
  return CO_QUAN_LY_CHINH_SACH_CA.has(vaiTro);
}

/* ---- Quyền module Đơn hoàn (Shopee) ------------------------------------
   - xem     : xem danh sách đơn hoàn + bấm đồng bộ. Vận hành sàn, kế toán
               trưởng và ban giám đốc đều có.
   - quan_ly : được KẾT NỐI Shopee (ủy quyền shop) — chỉ ban giám đốc, vì
               đây là hành động cấp công ty đụng tới tài khoản shop. */
const QUYEN_SHOPEE = {
  admin:          { xem: true, quan_ly: true  },
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
const CO_THAO_TAC_VAN_HANH = new Set(['admin', 'van_hanh_san', 'nv_test']);
export function duocThaoTacVanHanh(vaiTro) {
  return CO_THAO_TAC_VAN_HANH.has(vaiTro);
}

/* ---- DUYỆT GÓP Ý Ở CẤP CUỐI (cổng ERP Owner) ----------------------------
   Sếp Bùi Thị Ngọc chốt 28/08/2026: "riêng cái góp ý ERP đừng để sếp Phong
   duyệt, 1 mình tao duyệt hết".

   ĐÂY LÀ QUYỀN DUY NHẤT KHÔNG ĐI THEO VAI TRÒ, và có lý do: anh Nguyễn Duy
   Phong là Giám đốc, tài khoản `admin`, TOÀN QUYỀN MỌI THỨ KHÁC — không thể
   tách bằng cách hạ vai trò của anh. Tách bằng một cờ riêng đặt trên chính
   tài khoản (`tai_khoan.duyet_gopy`, migrations/them-quyen-duyet-gopy.sql).

   KHÔNG viết cứng id hay tên người vào code — cờ nằm ở DỮ LIỆU:
     · Sếp đổi ý muốn cho ai đó duyệt → bật cờ ở tab Quản trị, không deploy.
     · Sếp đi vắng muốn tạm uỷ quyền → bật, xong tắt.
   Cấp/thu cờ CHỈ người đang giữ cờ làm được (qtQuyenDuyetGopY trong
   src/index.js) — admin không tự bật cho mình.

   Cờ này KHÔNG đụng tới cấp 1: quản lý trực tiếp của người gửi vẫn duyệt
   cấp 1 y như cũ (luật đó nằm ở gop_y.next_owner + GOPY_SQL_QL1).

   Nhận cả PHIÊN (docPhien có trả t.duyet_gopy) lẫn một dòng tai_khoan.
   Dùng Number(...) vì SQLite trả số còn JSON có thể trả về chuỗi. */
export function duocDuyetGopY(phien) {
  return phien != null && Number(phien.duyet_gopy) === 1;
}

/* ---- KHO TÀI LIỆU — quyền theo NHÓM GIẤY TỜ  ·  CTL-0026 / CTL-0025 ------
   Sếp Ngọc chốt qua CTL-0026 Mục 6: "Phân quyền theo nhóm giấy tờ: kế toán
   chỉ thấy chứng từ kế toán; quản lý kho KHÔNG thấy CCCD nhân viên. Cắt ở
   MÁY CHỦ, không ẩn nút."

   Vì sao KHÔNG dựa vào tab: tab `khotailieu` mở cho mọi vai trò — ai cũng
   phải tra được quy trình, quy định nội bộ đã ban hành. Cái phải chặn là
   NHÓM GIẤY TỜ bên trong, chặt hơn tab một bậc. Đúng khuôn `QUYEN_KHO` ở
   trên: tab Kho vận mở cho cả nhân viên kho, nhưng giá vốn thì không.

   HAI mức, tách riêng vì chúng không đi cùng nhau:
   - xem : mở tài liệu nhóm đó ra đọc, tải bản PDF về.
   - luu : quét thêm tài liệu MỚI vào nhóm đó.
   Vận hành sàn được LƯU giấy ATTP (họ là người đi làm công bố sản phẩm)
   nhưng KHÔNG được lưu vào Pháp lý doanh nghiệp. Kế toán trưởng XEM được
   pháp lý (cần bản ĐKKD để kê khai) nhưng không được lưu vào đó.

   `'*'` = mọi nhóm. Chỉ Admin có, vì Admin đã toàn quyền mọi thứ khác. */
export const NHOM_TAI_LIEU = {
  phap_ly:   { ten: 'Pháp lý doanh nghiệp', vi_du: 'ĐKKD, con dấu, điều lệ, quyết định bổ nhiệm', han_luu: 'vĩnh viễn',                  nhay_cam: 0 },
  attp:      { ten: 'An toàn thực phẩm',    vi_du: 'Giấy ATTP, tự công bố sản phẩm, COA',         han_luu: 'theo hạn giấy + 5 năm',     nhay_cam: 0 },
  nhap_khau: { ten: 'Nhập khẩu',            vi_du: 'Tờ khai, C/O, kiểm dịch, packing list',       han_luu: '10 năm',                    nhay_cam: 0 },
  ke_toan:   { ten: 'Kế toán – thuế',       vi_du: 'Hoá đơn, chứng từ, tờ khai, BHXH',            han_luu: '5 / 10 năm theo loại',      nhay_cam: 0 },
  /* NHẠY CẢM: hồ sơ nhân sự có CCCD, HĐLĐ, bằng cấp — dữ liệu cá nhân theo
     Luật BVDLCN 91/2025/QH15 (hiệu lực 01/01/2026). Cờ này bật hai thứ:
     bắt buộc GHI NHẬN ĐỒNG Ý lúc lưu, và GHI NHẬT KÝ mỗi lượt mở. */
  nhan_su:   { ten: 'Nhân sự',              vi_du: 'HĐLĐ, phụ lục, quyết định, CCCD',             han_luu: 'HĐLĐ 10 năm sau chấm dứt',  nhay_cam: 1 },
  ncc:       { ten: 'Nhà cung cấp',         vi_du: 'Hợp đồng, phụ lục, báo giá',                  han_luu: 'hết hạn + 5 năm',           nhay_cam: 0 },
  noi_bo:    { ten: 'Quản trị nội bộ',      vi_du: 'Quy trình, quy định, thông báo đã ban hành',  han_luu: 'vĩnh viễn',                 nhay_cam: 0 }
};

export const MA_NHOM_TAI_LIEU = Object.keys(NHOM_TAI_LIEU);

const QUYEN_NHOM_TAI_LIEU = {
  admin:          { xem: ['*'],                                                    luu: ['*'] },
  // Admin backup thay Admin lúc vắng mặt ở việc HÀNH CHÍNH — không phải chỗ
  // để lách vào hồ sơ nhân sự. Không có `nhan_su`, y như không có xem_luong.
  admin_backup:   { xem: ['phap_ly', 'noi_bo'],                                    luu: ['noi_bo'] },
  hcns:           { xem: ['nhan_su', 'noi_bo', 'phap_ly'],                         luu: ['nhan_su', 'noi_bo'] },
  ke_toan_truong: { xem: ['ke_toan', 'nhap_khau', 'ncc', 'phap_ly', 'noi_bo'],     luu: ['ke_toan', 'nhap_khau', 'ncc'] },
  // ⚠️ Quản lý kho KHÔNG có 'nhan_su' — đây là ranh giới CTL-0025 Mục 4 gọi
  // đích danh: "Không cho quản lý kho xem CCCD nhân viên."  Anh Duy quản 12
  // người ở kho, nhưng quản người không phải là được xem giấy tờ tuỳ thân.
  quan_ly_kho:    { xem: ['nhap_khau', 'attp', 'noi_bo'],                          luu: ['nhap_khau', 'attp'] },
  nhan_vien_kho:  { xem: ['noi_bo'],                                               luu: [] },
  van_hanh_san:   { xem: ['attp', 'ncc', 'noi_bo'],                                luu: ['attp'] },
  cskh:           { xem: ['noi_bo'],                                               luu: [] },
  nguoi_dung:     { xem: ['noi_bo'],                                               luu: [] },
  nv_test:        { xem: ['noi_bo'],                                               luu: ['noi_bo'] }
};

const KHONG_QUYEN_TAI_LIEU = { xem: [], luu: [] };

function quyenTaiLieu(vaiTro) {
  return QUYEN_NHOM_TAI_LIEU[vaiTro] || KHONG_QUYEN_TAI_LIEU;
}

function coTrong(ds, nhom) {
  return ds.includes('*') || ds.includes(nhom);
}

/** Được MỞ tài liệu thuộc nhóm này không. Kiểm ở máy chủ, mọi lối vào. */
export function duocXemNhomTaiLieu(vaiTro, nhom) {
  if (!NHOM_TAI_LIEU[nhom]) return false;      // nhóm lạ → chặn, đừng đoán
  return coTrong(quyenTaiLieu(vaiTro).xem, nhom);
}

/** Được QUÉT THÊM tài liệu vào nhóm này không. */
export function duocLuuNhomTaiLieu(vaiTro, nhom) {
  if (!NHOM_TAI_LIEU[nhom]) return false;
  return coTrong(quyenTaiLieu(vaiTro).luu, nhom);
}

/** Danh sách nhóm người này xem được — dùng để dựng câu SQL lọc NGAY TỪ ĐẦU,
 *  chứ không lấy hết rồi lọc sau (lấy hết là dữ liệu đã rời máy chủ rồi). */
export function nhomTaiLieuXemDuoc(vaiTro) {
  const ds = quyenTaiLieu(vaiTro).xem;
  return ds.includes('*') ? MA_NHOM_TAI_LIEU.slice() : ds.filter(n => !!NHOM_TAI_LIEU[n]);
}

/** Danh sách nhóm người này lưu được — giao diện dùng để chỉ hiện đúng các
 *  ô chọn bấm được. ĐÂY KHÔNG PHẢI CHỖ CHẶN: chặn thật ở `duocLuuNhomTaiLieu`
 *  trong `src/tai-lieu.js`, gọi API thẳng cũng không lách được. */
export function nhomTaiLieuLuuDuoc(vaiTro) {
  const ds = quyenTaiLieu(vaiTro).luu;
  return ds.includes('*') ? MA_NHOM_TAI_LIEU.slice() : ds.filter(n => !!NHOM_TAI_LIEU[n]);
}

/** Nhóm này có phải giấy tờ nhạy cảm không (bắt buộc ghi nhận đồng ý + nhật
 *  ký truy cập). Lấy từ đúng một chỗ để không có hai định nghĩa lệch nhau. */
export function nhomTaiLieuNhayCam(nhom) {
  return NHOM_TAI_LIEU[nhom]?.nhay_cam === 1;
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

/* Admin = người được cấp/khoá/đặt lại/xoá tài khoản, đổi vai trò, thêm
   nhân sự có cả lương. Chỉ vai trò hệ thống "Admin". */
export function laAdmin(vaiTro) {
  return quyenCua(vaiTro).admin === true;
}

/* Được TẠO/SỬA vai trò tài khoản (không phải toàn bộ quyền Admin) — Admin
   luôn được, cộng thêm vai trò hệ thống "Admin backup" (Sếp chốt
   23/08/2026: "Admin backup — quyền tạo tài khoản, phân quyền"). Người
   dùng quyền này mà KHÔNG phải Admin thật thì CHỈ được tạo/gán vai trò
   thường — không được tự tạo/tự gán tài khoản Admin hay Admin backup khác
   (chặn ở qtTaoTaiKhoan/qtSuaVaiTro — tránh tự nâng quyền). */
export function duocTaoTaiKhoan(vaiTro) {
  return laAdmin(vaiTro) || vaiTro === 'admin_backup';
}

/* Được thêm nhân sự vào hồ sơ (admin + HCNS). KHÔNG kéo theo quyền xem lương
   hay cấp tài khoản — hai thứ đó kiểm tra riêng. */
export function duocThemNhanSu(vaiTro) {
  return quyenCua(vaiTro).them_nhan_su === true;
}

/* Các vai trò hợp lệ để admin chọn khi tạo tài khoản mới */
export const VAI_TRO_HOP_LE = Object.keys(QUYEN_THEO_VAI_TRO);

/* Nhóm vai trò CHỈ để hiển thị đúng chỗ trên UI (Vai trò hệ thống tách
   khỏi Vị trí công việc, không gộp 1 danh sách phẳng) — KHÔNG phải quyền
   thật, quyền thật vẫn nằm ở QUYEN_THEO_VAI_TRO/QUYEN_KHO/... phía trên.
   Sếp chốt 23/08/2026: "các vai trò kia cũng là vị trí nhân viên chứ
   không phải vai trò hệ thống nữa". */
const NHOM_VAI_TRO_HE_THONG = new Set(['admin', 'admin_backup', 'nguoi_dung']);
export function nhomVaiTro(vaiTro) {
  return NHOM_VAI_TRO_HE_THONG.has(vaiTro) ? 'he_thong' : 'vi_tri';
}

/* Tên hiển thị của vai trò */
export const TEN_VAI_TRO = {
  admin:          'Admin',
  admin_backup:   'Admin backup',
  nguoi_dung:     'Người dùng',
  ke_toan_truong: 'Kế toán trưởng',
  quan_ly_kho:    'Quản lý kho',
  nhan_vien_kho:  'Nhân viên kho',
  hcns:           'Hành chính nhân sự',
  van_hanh_san:   'Vận hành sàn',
  cskh:           'Nhân viên CSKH',
  nv_test:        'Nhân viên (test luồng)'
};
