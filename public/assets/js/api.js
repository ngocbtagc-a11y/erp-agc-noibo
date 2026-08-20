/* ==========================================================================
   Lớp gọi máy chủ
   ---------------------------------------------------------------------------
   Phiên đăng nhập nằm trong cookie HttpOnly — JavaScript ở đây KHÔNG đọc
   được nó, và đó là chủ ý: trang có dính mã độc cũng không lấy được phiên.
   Trình duyệt tự đính cookie vào mỗi lệnh gọi nhờ credentials: 'same-origin'.
   ========================================================================== */

/* tuChoiTuDong: true = gặp 401 thì tự đá về màn đăng nhập.
   Phải tắt cờ này ở chính màn đăng nhập, không thì trang tự đá về chính nó
   và tải lại vô tận. */
async function goi(duongDan, tuyChon = {}, tuDongVeDangNhap = true) {
  // FormData (gửi kèm file) thì KHÔNG tự đặt Content-Type — để trình duyệt tự
  // ghi boundary multipart, đặt tay vào là hỏng luôn cả yêu cầu.
  const laFormData = tuyChon.body instanceof FormData;
  const res = await fetch(duongDan, {
    credentials: 'same-origin',
    ...(laFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
    ...tuyChon
  });

  // Hết phiên → đưa về màn đăng nhập
  if (res.status === 401 && tuDongVeDangNhap) {
    window.location.replace('index.html');
    throw new Error('Hết phiên đăng nhập');
  }

  let duLieu = null;
  try { duLieu = await res.json(); } catch { /* không phải JSON */ }

  if (!res.ok) throw new Error((duLieu && duLieu.loi) || 'Máy chủ gặp sự cố');
  return duLieu;
}

export const API = {
  dangNhap: (ten, mk) => goi('/api/dang-nhap', {
    method: 'POST',
    body: JSON.stringify({ ten_dang_nhap: ten, mat_khau: mk })
  }, false),

  dangXuat: () => goi('/api/dang-xuat', { method: 'POST' }, false),

  /* Dùng ở cả màn đăng nhập nên không tự đá đi đâu — nơi gọi tự xử lý */
  toiLaAi: () => goi('/api/toi-la-ai', {}, false),

  /* Màn đổi mật khẩu lần đầu cũng nằm ở index.html */
  doiMatKhau: (cu, moi) => goi('/api/doi-mat-khau', {
    method: 'POST',
    body: JSON.stringify({ mat_khau_cu: cu, mat_khau_moi: moi })
  }, false),

  danhBa: () => goi('/api/danh-ba'),

  nhanSu: () => goi('/api/nhan-su'),
  nsAnhDaiDien: (anhBase64) => goi('/api/nhan-su/anh-dai-dien', {
    method: 'POST', body: JSON.stringify({ anh: anhBase64 })
  }),

  /* ---- Vinh danh (Tổng quan) ---- */
  vdDanhSach: () => goi('/api/vinh-danh'),
  vdGui: (nhanSuId, noiDung) => goi('/api/vinh-danh', {
    method: 'POST', body: JSON.stringify({ nhan_su_id: nhanSuId, noi_dung: noiDung })
  }),

  /* ---- Trạm Việc: giao việc cho nhân viên ---- */
  cvDanhSach: () => goi('/api/cong-viec/danh-sach'),
  cvTao: (cv) => goi('/api/cong-viec/tao', { method: 'POST', body: JSON.stringify(cv) }),
  cvCapNhat: (id, trangThai, ketQua) => goi('/api/cong-viec/cap-nhat', {
    method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai, ket_qua: ketQua })
  }),

  /* ---- Chat nội bộ (kênh chung + chat riêng từng người) ---- */
  chatDanhSach: (sauId, voiId) => {
    const q = new URLSearchParams();
    if (sauId) q.set('sau_id', sauId);
    if (voiId) q.set('voi', voiId);
    const qs = q.toString();
    return goi('/api/chat/tin-nhan' + (qs ? '?' + qs : ''));
  },
  chatChuaDoc: (sauId) => goi('/api/chat/chua-doc?sau_id=' + (sauId || 0)),
  chatGanDay: () => goi('/api/chat/gan-day'),
  chatGui: (noiDung, tep, voiId) => {
    const fd = new FormData();
    if (noiDung) fd.append('noi_dung', noiDung);
    if (tep) fd.append('tep', tep);
    if (voiId) fd.append('nguoi_nhan_id', voiId);
    return goi('/api/chat/gui', { method: 'POST', body: fd });
  },

  /* ---- Quản trị (chỉ admin) ---- */
  qtDanhSach: () => goi('/api/quan-tri/danh-sach'),

  qtThemNhanSu: (ns) => goi('/api/quan-tri/them-nhan-su', {
    method: 'POST', body: JSON.stringify(ns)
  }),

  qtTaoTaiKhoan: (nhanSuId, tenDangNhap, vaiTro) => goi('/api/quan-tri/tao-tai-khoan', {
    method: 'POST',
    body: JSON.stringify({ nhan_su_id: nhanSuId, ten_dang_nhap: tenDangNhap, vai_tro: vaiTro })
  }),

  qtDatLaiMatKhau: (taiKhoanId) => goi('/api/quan-tri/dat-lai-mat-khau', {
    method: 'POST', body: JSON.stringify({ tai_khoan_id: taiKhoanId })
  }),

  qtKhoaTaiKhoan: (taiKhoanId, kichHoat) => goi('/api/quan-tri/khoa-tai-khoan', {
    method: 'POST', body: JSON.stringify({ tai_khoan_id: taiKhoanId, kich_hoat: kichHoat })
  }),

  /* ---- Kho: Xuất / Nhập / Tồn ---- */
  khoSanPham: () => goi('/api/kho/san-pham'),

  khoThemSanPham: (sp) => goi('/api/kho/them-san-pham', {
    method: 'POST', body: JSON.stringify(sp)
  }),

  khoNhap: (d) => goi('/api/kho/nhap', { method: 'POST', body: JSON.stringify(d) }),

  khoXuat: (d) => goi('/api/kho/xuat', { method: 'POST', body: JSON.stringify(d) }),

  khoLo: (sanPhamId) =>
    goi('/api/kho/lo?san_pham_id=' + encodeURIComponent(sanPhamId)),

  khoBaoCao: (tu, den) =>
    goi('/api/kho/bao-cao?tu=' + encodeURIComponent(tu) + '&den=' + encodeURIComponent(den)),

  khoLichSu: (sanPhamId, gioiHan = 30) =>
    goi('/api/kho/lich-su?san_pham_id=' + encodeURIComponent(sanPhamId) + '&gioi_han=' + gioiHan),

  /* ---- Đón nhân sự mới (ảnh CCCD) ---- */
  nsDocCCCD: (anhBase64) => goi('/api/nhan-su/doc-cccd', {
    method: 'POST', body: JSON.stringify({ anh: anhBase64 })
  }),
  nsDonMoi: (hoSo) => goi('/api/nhan-su/don-moi', {
    method: 'POST', body: JSON.stringify(hoSo)
  }),

  /* ---- Đơn hoàn (Shopee) ---- */
  shopeeTrangThai: () => goi('/api/shopee/trang-thai'),
  hoanDongBo: () => goi('/api/hoan/dong-bo', { method: 'POST' }),
  hoanDanhSach: () => goi('/api/hoan/danh-sach'),
  hoanDaNhan: (returnSn, tinhTrang) => goi('/api/hoan/da-nhan', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn, tinh_trang: tinhTrang })
  }),
  hoanKhieuNai: (returnSn, ghiChu) => goi('/api/hoan/khieu-nai', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn, ghi_chu: ghiChu })
  }),
  hoanChuaNhan: (returnSn) => goi('/api/hoan/chua-nhan', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn })
  }),
  hoanPhanLoai: (returnSn, phanLoai) => goi('/api/hoan/phan-loai', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn, phan_loai: phanLoai })
  }),

  /* ---- Thông báo trong ERP (chuông) ---- */
  thongBao: () => goi('/api/thong-bao'),
  thongBaoDaXem: () => goi('/api/thong-bao/da-xem', { method: 'POST' }),

  /* ---- Đơn hoàn (TikTok) ---- */
  tiktokTrangThai: () => goi('/api/tiktok/trang-thai'),
  tiktokDongBo: () => goi('/api/tiktok/dong-bo', { method: 'POST' }),

  /* ---- Kinh doanh: đơn hoàn cần đối soát với sàn (quá 12h kho chưa nhận) ---- */
  kdCanDoiSoat: () => goi('/api/kinh-doanh/can-doi-soat'),
  kdKhachHoanNhieu: () => goi('/api/kinh-doanh/khach-hoan-nhieu'),
  kdDaDoiSoat: (returnSn) => goi('/api/kinh-doanh/da-doi-soat', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn })
  }),
  kdDayKho: (dsReturnSn) => goi('/api/kinh-doanh/day-kho', {
    method: 'POST', body: JSON.stringify({ return_sn: dsReturnSn })
  }),
  kdDayKeToan: (dsReturnSn) => goi('/api/kinh-doanh/day-ke-toan', {
    method: 'POST', body: JSON.stringify({ return_sn: dsReturnSn })
  }),

  /* ---- Kế toán: đơn hoàn cần tra soát tiền ---- */
  ktCanTraSoat: () => goi('/api/ke-toan/can-tra-soat'),
  ktDaTraSoat: (returnSn) => goi('/api/ke-toan/da-tra-soat', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn })
  }),

  /* ---- Kế toán: hàng hỏng do vận chuyển (đơn huỷ) — biên bản hủy hàng tháng ---- */
  ktHangHong: () => goi('/api/ke-toan/hang-hong'),
  ktLapBienBan: (dsReturnSn) => goi('/api/ke-toan/lap-bien-ban', {
    method: 'POST', body: JSON.stringify({ return_sn: dsReturnSn })
  }),

  /* ---- Ghép tên sản phẩm (sàn) -> SKU (kho), cho đơn hoàn cũ không có SKU ---- */
  hoanSkuMapDanhSach: () => goi('/api/hoan/sku-map'),
  hoanSkuMapGan: (tenSanPham, maSku) => goi('/api/hoan/sku-map', {
    method: 'POST', body: JSON.stringify({ ten_san_pham: tenSanPham, ma_sku: maSku })
  })
  // Lưu ý: kết nối Shopee đi thẳng bằng chuyển trang tới /api/shopee/connect
  // (server trả 302 sang trang ủy quyền Shopee), không qua lớp fetch này.
};
