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
  const res = await fetch(duongDan, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
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
  hoanDaNhan: (returnSn) => goi('/api/hoan/da-nhan', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn })
  }),

  /* ---- Đơn hoàn (TikTok) ---- */
  tiktokTrangThai: () => goi('/api/tiktok/trang-thai'),
  tiktokDongBo: () => goi('/api/tiktok/dong-bo', { method: 'POST' })
  // Lưu ý: kết nối Shopee đi thẳng bằng chuyển trang tới /api/shopee/connect
  // (server trả 302 sang trang ủy quyền Shopee), không qua lớp fetch này.
};
