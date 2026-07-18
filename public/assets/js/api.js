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
  })
};
