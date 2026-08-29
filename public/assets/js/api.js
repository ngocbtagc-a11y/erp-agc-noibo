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
  nsLichSu: (id) => goi('/api/nhan-su/lich-su?id=' + encodeURIComponent(id)),

  /* Hợp đồng lao động (SPEC-0007 Đợt 1). `nsHopDongLuu` có thể trả về
     { can_ly_do: true, canh_bao: [...] } với mã 200 — nghĩa là CHƯA lưu, cần
     người nhập gõ lý do rồi gọi lại. Kiểm `can_ly_do` trước khi mừng vì `ok`. */
  nsHopDong: (id) => goi('/api/nhan-su/hop-dong?id=' + encodeURIComponent(id)),
  nsHopDongLuu: (du) => goi('/api/nhan-su/hop-dong/luu', {
    method: 'POST', body: JSON.stringify(du)
  }),
  nsHopDongAn: (id, lyDo) => goi('/api/nhan-su/hop-dong/an', {
    method: 'POST', body: JSON.stringify({ id, ly_do: lyDo })
  }),

  /* Sinh nhật (SPEC-0007 Đợt 2). `id` bỏ trống = đổi công tắc của CHÍNH MÌNH
     — ai cũng gọi được. Truyền `id` người khác thì MÁY CHỦ đòi quyền quản lý
     hồ sơ; giao diện chỉ ẩn nút cho gọn mắt, không phải chỗ chặn thật. */
  nsSinhNhatCongKhai: (bat, id) => goi('/api/nhan-su/sinh-nhat-cong-khai', {
    method: 'POST', body: JSON.stringify({ bat, id })
  }),
  /* `ngay_sinh` là mức 2 (ADR-0011 A2) nên đi cửa riêng, KHÔNG nằm trong
     `/api/nhan-su` chung. Có đường sửa này thì tính năng sinh nhật mới sống:
     trước đợt này cột đó chỉ ghi được lúc nhận hồ sơ mới. */
  nsSinhNhat: (id) => goi('/api/nhan-su/sinh-nhat' + (id ? '?id=' + encodeURIComponent(id) : '')),
  nsNgaySinhLuu: (id, ngaySinh) => goi('/api/nhan-su/ngay-sinh', {
    method: 'POST', body: JSON.stringify({ id, ngay_sinh: ngaySinh })
  }),
  nsViecCanLam: () => goi('/api/nhan-su/viec-can-lam'),

  /* Mô tả công việc theo MBOs (SPEC-0007 Đợt 3). ĐỌC mở cho mọi người đã
     đăng nhập; GHI đi qua cửa quản lý hồ sơ. `mtcvLuu` có thể trả 200 kèm
     `canh_bao` — đó là NHẮC ("đây là hoạt động, chưa phải đầu ra"), đã lưu
     rồi, khác hẳn `can_ly_do` của hợp đồng (chưa lưu). */
  mtcv: (q) => goi('/api/mo-ta-cong-viec?' + new URLSearchParams(q).toString()),
  mtcvMau: (nhom) => goi('/api/mo-ta-cong-viec/mau' + (nhom ? '?nhom=' + encodeURIComponent(nhom) : '')),
  mtcvLuu: (du) => goi('/api/mo-ta-cong-viec/luu', { method: 'POST', body: JSON.stringify(du) }),
  mtcvAn: (id, lyDo) => goi('/api/mo-ta-cong-viec/an', {
    method: 'POST', body: JSON.stringify({ id, ly_do: lyDo })
  }),

  /* Bộ năng lực (SPEC-0007 Đợt 4). Hai đường `knAiLamDuoc` / `knAiThayDuoc`
     là LÝ DO TỒN TẠI của cả bảng: xếp ca và người nghỉ đột xuất. Không có
     hai màn đó thì đây chỉ là một bảng chữ chết. */
  knDanhMuc: (nhom) => goi('/api/ky-nang' + (nhom ? '?nhom=' + encodeURIComponent(nhom) : '')),
  knCuaNguoi: (id) => goi('/api/ky-nang/cua-nguoi?id=' + encodeURIComponent(id)),
  knQuyenCham: (id) => goi('/api/ky-nang/quyen-cham?id=' + encodeURIComponent(id)),
  knCham: (du) => goi('/api/ky-nang/cham', { method: 'POST', body: JSON.stringify(du) }),
  knGo: (nhanSuId, kyNangId, lyDo) => goi('/api/ky-nang/go', {
    method: 'POST', body: JSON.stringify({ nhan_su_id: nhanSuId, ky_nang_id: kyNangId, ly_do: lyDo })
  }),
  knAiLamDuoc: (kyNangId, muc) => goi('/api/ky-nang/ai-lam-duoc?ky_nang_id=' +
    encodeURIComponent(kyNangId) + (muc ? '&muc=' + encodeURIComponent(muc) : '')),
  knAiThayDuoc: (id) => goi('/api/ky-nang/ai-thay-duoc?id=' + encodeURIComponent(id)),

  nsAnhDaiDien: (anhBase64) => goi('/api/nhan-su/anh-dai-dien', {
    method: 'POST', body: JSON.stringify({ anh: anhBase64 })
  }),
  nsTrangThaiHD: (maTrangThai, ghiChu, thoiHan) => goi('/api/nhan-su/trang-thai-hd', {
    method: 'POST', body: JSON.stringify({ ma_trang_thai: maTrangThai, ghi_chu: ghiChu, thoi_han: thoiHan })
  }),

  /* ---- Góp ý & Cải tiến ERP ---- */
  gopYDanhSach: () => goi('/api/gop-y'),
  gopYGui: (du) => goi('/api/gop-y', { method: 'POST', body: JSON.stringify(du) }),
  gopYDoiTrangThai: (id, du) => goi('/api/gop-y/trang-thai', {
    method: 'POST', body: JSON.stringify({ id, ...du })
  }),
  // Cổng duyệt (SPEC-0002) — `du` nhận { id } hoặc { ids: [...] } để duyệt
  // hàng loạt, kèm quyet_dinh ('duyet'|'tu_choi'), risk, ly_do, ghi_chu.
  gopYDuyet: (du) => goi('/api/gop-y/duyet', { method: 'POST', body: JSON.stringify(du) }),
  // Hoàn tác cú duyệt/từ chối vừa bấm (15 phút, chỉ chính người bấm).
  gopYHoanTac: (id) => goi('/api/gop-y/hoan-tac', { method: 'POST', body: JSON.stringify({ id }) }),
  gopYLichSu: (id) => goi('/api/gop-y/lich-su?id=' + encodeURIComponent(id)),

  /* ---- Vinh danh (Tổng quan) ---- */
  vdDanhSach: () => goi('/api/vinh-danh'),
  vdGui: (nhanSuId, noiDung, soSao) => goi('/api/vinh-danh', {
    method: 'POST', body: JSON.stringify({ nhan_su_id: nhanSuId, noi_dung: noiDung, so_sao: soSao })
  }),
  // Sửa / gỡ lời khen trong 24h (REV-0037 · L5). `than` = { noi_dung, so_sao }
  // hoặc { go: true }. Máy chủ lùi lại đúng số sao đã cộng và bắn tin đính chính.
  vdSua: (id, than) => goi('/api/vinh-danh/sua', {
    method: 'POST', body: JSON.stringify({ id, ...than })
  }),

  /* ---- Trạm Việc: giao việc cho nhân viên ---- */
  cvDanhSach: () => goi('/api/cong-viec/danh-sach'),
  // SPEC-0004: "Việc của tôi hôm nay" + "Ai đang đọng việc" + "Đáng ghi nhận"
  // — MỘT lần gọi cho cả ba khối, vì cả ba đọc cùng một bộ dữ liệu.
  cvHomNay: () => goi('/api/cong-viec/hom-nay'),
  cvNhacTat: (tat) => goi('/api/cong-viec/nhac-tat', { method: 'POST', body: JSON.stringify({ tat }) }),
  cvTao: (cv) => goi('/api/cong-viec/tao', { method: 'POST', body: JSON.stringify(cv) }),
  cvCapNhat: (id, trangThai, ketQua) => goi('/api/cong-viec/cap-nhat', {
    method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai, ket_qua: ketQua })
  }),
  /* CTL-0017 — sửa NỘI DUNG việc đã giao. Cửa RIÊNG, không dùng chung với
     `cvCapNhat` (đổi trạng thái): hai luật khác hẳn nhau.
     `truong` chỉ chứa những trường THẬT SỰ muốn đổi — trường không gửi thì
     máy chủ không đụng tới, nên sửa mỗi tiêu đề sẽ không xoá trắng mô tả. */
  cvSua: (id, truong) => goi('/api/cong-viec/sua', {
    method: 'POST', body: JSON.stringify({ id, ...truong })
  }),
  /* Sổ sửa dùng chung cho cả lớp — bang = 'cong_viec' | 'muc_tieu'. Mỗi dòng
     đã kèm `cau` tiếng Việt dựng sẵn ở máy chủ, giao diện chỉ việc in ra. */
  suaLichSu: (bang, id) => goi(`/api/sua/lich-su?bang=${bang}&id=${id}`),
  /* `truoc` = con trỏ `cap_nhat_luc|id` của dòng cuối đã tải → máy chủ trả tiếp
     500 việc CŨ HƠN. Đây là ĐƯỜNG ĐI TIẾP CÓ THẬT của dải cắt (REV-0034 · L2):
     ô tìm kiếm ở màn đó lọc phía trình duyệt nên không với tới phần bị cắt. */
  cvLichSu: (truoc) => goi('/api/cong-viec/lich-su' + (truoc ? `?truoc=${encodeURIComponent(truoc)}` : '')),
  cvTongQuanCongTy: () => goi('/api/cong-viec/tong-quan-congty'),
  cvTongQuanPhongBan: () => goi('/api/cong-viec/tong-quan-phongban'),

  /* ---- Mục tiêu (MBOs: công ty / phòng ban) ---- */
  mtDanhSach: (nam, quy) => goi('/api/muc-tieu/danh-sach' +
    (nam && quy ? `?nam=${nam}&quy=${quy}` : '')),
  mtTao: (mt) => goi('/api/muc-tieu/tao', { method: 'POST', body: JSON.stringify(mt) }),
  mtChot: (id) => goi('/api/muc-tieu/chot', { method: 'POST', body: JSON.stringify({ id }) }),
  mtCapNhat: (id, truong) => goi('/api/muc-tieu/cap-nhat', {
    method: 'POST', body: JSON.stringify({ id, ...truong })
  }),
  mtViec: (id) => goi('/api/muc-tieu/viec?id=' + id),

  /* ---- Chat nội bộ (kênh chung + chat riêng từng người) ---- */
  /* `dangMo` = cửa sổ chat ĐANG THẬT SỰ MỞ trên màn hình. Máy chủ đóng dấu mốc
     đó để KHÔNG đẩy thông báo lên điện thoại khi người dùng đang ngồi nhìn
     thẳng vào đúng đoạn chat này (CTL-0014). Ghép vào lệnh gọi 6 giây/lần vốn
     đã chạy — KHÔNG thêm lệnh gọi thứ hai, không tốn thêm lượt Worker. */
  chatDanhSach: (sauId, voiId, dangMo) => {
    const q = new URLSearchParams();
    if (sauId) q.set('sau_id', sauId);
    if (voiId) q.set('voi', voiId);
    if (dangMo) q.set('dang_mo', '1');
    const qs = q.toString();
    return goi('/api/chat/tin-nhan' + (qs ? '?' + qs : ''));
  },
  chatChuaDoc: () => goi('/api/chat/chua-doc'),
  chatDaDoc: () => goi('/api/chat/da-doc', { method: 'POST' }),
  chatGanDay: () => goi('/api/chat/gan-day'),
  chatGui: (noiDung, tep, voiId) => {
    const fd = new FormData();
    if (noiDung) fd.append('noi_dung', noiDung);
    if (tep) fd.append('tep', tep);
    if (voiId) fd.append('nguoi_nhan_id', voiId);
    return goi('/api/chat/gui', { method: 'POST', body: fd });
  },

  /* ---- Thông báo đẩy lên điện thoại (CTL-0014) ---- */
  pushKhoa: () => goi('/api/push/khoa'),
  pushDangKy: (dk) => goi('/api/push/dang-ky', { method: 'POST', body: JSON.stringify(dk) }),
  pushHuy: (endpoint) => goi('/api/push/huy', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  pushTuyChon: (chatTat) => goi('/api/push/tuy-chon', {
    method: 'POST', body: JSON.stringify({ chat_tat: chatTat ? 1 : 0 })
  }),

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

  qtXoaTaiKhoan: (taiKhoanId) => goi('/api/quan-tri/xoa-tai-khoan', {
    method: 'POST', body: JSON.stringify({ tai_khoan_id: taiKhoanId })
  }),

  qtSuaVaiTro: (taiKhoanId, vaiTro) => goi('/api/quan-tri/sua-vai-tro', {
    method: 'POST', body: JSON.stringify({ tai_khoan_id: taiKhoanId, vai_tro: vaiTro })
  }),

  // Cờ "được duyệt góp ý ERP ở cấp cuối" — chỉ người ĐANG GIỮ quyền mới
  // cấp/thu được (máy chủ kiểm, xem qtQuyenDuyetGopY trong src/index.js).
  qtQuyenDuyetGopY: (taiKhoanId, bat) => goi('/api/quan-tri/quyen-duyet-gopy', {
    method: 'POST', body: JSON.stringify({ tai_khoan_id: taiKhoanId, bat: !!bat })
  }),

  qtSuaNhanSu: (ns) => goi('/api/quan-tri/sua-nhan-su', {
    method: 'POST', body: JSON.stringify(ns)
  }),

  qtKhoaNhanSu: (id, trangThaiDl) => goi('/api/quan-tri/khoa-nhan-su', {
    method: 'POST', body: JSON.stringify({ id, trang_thai_dl: trangThaiDl })
  }),

  qtXoaNhanSu: (id) => goi('/api/quan-tri/xoa-nhan-su', {
    method: 'POST', body: JSON.stringify({ id })
  }),

  /* ---- Kho: Xuất / Nhập / Tồn ---- */
  khoSanPham: () => goi('/api/kho/san-pham'),

  khoThemSanPham: (sp) => goi('/api/kho/them-san-pham', {
    method: 'POST', body: JSON.stringify(sp)
  }),

  khoSuaSanPham: (sp) => goi('/api/kho/sua-san-pham', {
    method: 'POST', body: JSON.stringify(sp)
  }),

  khoAnHienSanPham: (id, dangBan) => goi('/api/kho/an-hien-san-pham', {
    method: 'POST', body: JSON.stringify({ id, dang_ban: dangBan })
  }),

  khoKhoaSanPham: (id, trangThai) => goi('/api/kho/khoa-san-pham', {
    method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai })
  }),

  khoNhap: (d) => goi('/api/kho/nhap', { method: 'POST', body: JSON.stringify(d) }),

  khoXuat: (d) => goi('/api/kho/xuat', { method: 'POST', body: JSON.stringify(d) }),

  khoLo: (sanPhamId) =>
    goi('/api/kho/lo?san_pham_id=' + encodeURIComponent(sanPhamId)),

  khoBaoCao: (tu, den) =>
    goi('/api/kho/bao-cao?tu=' + encodeURIComponent(tu) + '&den=' + encodeURIComponent(den)),

  khoLichSu: (sanPhamId, gioiHan = 30) =>
    goi('/api/kho/lich-su?san_pham_id=' + encodeURIComponent(sanPhamId) + '&gioi_han=' + gioiHan),

  /* ---- Dữ liệu nền: Phòng ban / Chức danh / Đơn vị tính ---- */
  dlnPhongBan: () => goi('/api/dulieunen/phong-ban'),
  dlnThemPhongBan: (ten, xacNhan) => goi('/api/dulieunen/phong-ban/them', { method: 'POST', body: JSON.stringify({ ten, xac_nhan: !!xacNhan }) }),
  dlnSuaPhongBan: (id, d) => goi('/api/dulieunen/phong-ban/sua', { method: 'POST', body: JSON.stringify({ id, ...d }) }),
  dlnGanTruongPhong: (id, truongPhongId) => goi('/api/dulieunen/phong-ban/gan-truong-phong', { method: 'POST', body: JSON.stringify({ id, truong_phong_id: truongPhongId }) }),
  dlnKhoaPhongBan: (id, trangThai) => goi('/api/dulieunen/phong-ban/khoa', { method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai }) }),

  dlnChucDanh: () => goi('/api/dulieunen/chuc-danh'),
  dlnThemChucDanh: (ten, xacNhan) => goi('/api/dulieunen/chuc-danh/them', { method: 'POST', body: JSON.stringify({ ten, xac_nhan: !!xacNhan }) }),
  dlnSuaChucDanh: (id, d) => goi('/api/dulieunen/chuc-danh/sua', { method: 'POST', body: JSON.stringify({ id, ...d }) }),
  dlnKhoaChucDanh: (id, trangThai) => goi('/api/dulieunen/chuc-danh/khoa', { method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai }) }),
  dlnDanhMucTaiSan: () => goi('/api/dulieunen/tai-san-danh-muc'),
  dlnThemDanhMucTaiSan: (ten, xacNhan) => goi('/api/dulieunen/tai-san-danh-muc/them', { method: 'POST', body: JSON.stringify({ ten, xac_nhan: !!xacNhan }) }),
  dlnSuaDanhMucTaiSan: (id, d) => goi('/api/dulieunen/tai-san-danh-muc/sua', { method: 'POST', body: JSON.stringify({ id, ...d }) }),
  dlnKhoaDanhMucTaiSan: (id, trangThai) => goi('/api/dulieunen/tai-san-danh-muc/khoa', { method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai }) }),
  dlnViTriTaiSan: () => goi('/api/dulieunen/tai-san-vi-tri'),
  dlnThemViTriTaiSan: (ten, xacNhan) => goi('/api/dulieunen/tai-san-vi-tri/them', { method: 'POST', body: JSON.stringify({ ten, xac_nhan: !!xacNhan }) }),
  dlnSuaViTriTaiSan: (id, d) => goi('/api/dulieunen/tai-san-vi-tri/sua', { method: 'POST', body: JSON.stringify({ id, ...d }) }),
  dlnKhoaViTriTaiSan: (id, trangThai) => goi('/api/dulieunen/tai-san-vi-tri/khoa', { method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai }) }),

  dlnDonVi: () => goi('/api/dulieunen/don-vi'),
  dlnThemDonVi: (ten, xacNhan) => goi('/api/dulieunen/don-vi/them', { method: 'POST', body: JSON.stringify({ ten, xac_nhan: !!xacNhan }) }),
  dlnSuaDonVi: (id, d) => goi('/api/dulieunen/don-vi/sua', { method: 'POST', body: JSON.stringify({ id, ...d }) }),
  dlnKhoaDonVi: (id, trangThai) => goi('/api/dulieunen/don-vi/khoa', { method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai }) }),

  dlnTinhTrang: () => goi('/api/dulieunen/tinh-trang'),

  dlnNCC: () => goi('/api/dulieunen/ncc'),
  dlnThemNCC: (d) => goi('/api/dulieunen/ncc/them', { method: 'POST', body: JSON.stringify(d) }),
  dlnSuaNCC: (id, d) => goi('/api/dulieunen/ncc/sua', { method: 'POST', body: JSON.stringify({ id, ...d }) }),
  dlnKhoaNCC: (id, trangThai) => goi('/api/dulieunen/ncc/khoa', { method: 'POST', body: JSON.stringify({ id, trang_thai: trangThai }) }),

  dlnKho: () => goi('/api/dulieunen/kho'),
  dlnThemKho: (d) => goi('/api/dulieunen/kho/them', { method: 'POST', body: JSON.stringify(d) }),
  dlnSuaKho: (id, d) => goi('/api/dulieunen/kho/sua', { method: 'POST', body: JSON.stringify({ id, ...d }) }),

  /* ---- Đăng ký ca / Xếp ca ---- */
  caMauCa: () => goi('/api/ca/mau-ca'),
  caThemMauCa: (d) => goi('/api/ca/mau-ca/them', { method: 'POST', body: JSON.stringify(d) }),
  caSuaMauCa: (d) => goi('/api/ca/mau-ca/sua', { method: 'POST', body: JSON.stringify(d) }),
  caXoaMauCa: (id) => goi('/api/ca/mau-ca/xoa', { method: 'POST', body: JSON.stringify({ id }) }),
  caThemCaMo: (d) => goi('/api/ca/mo/them', { method: 'POST', body: JSON.stringify(d) }),
  caMoDangKyTuan: (d) => goi('/api/ca/mo/mo-tuan', { method: 'POST', body: JSON.stringify(d) }),
  caKhoaCaMo: (id) => goi('/api/ca/mo/khoa', { method: 'POST', body: JSON.stringify({ id }) }),
  caDangMo: () => goi('/api/ca/dang-mo'),
  caDangKy: (d) => goi('/api/ca/dang-ky', { method: 'POST', body: JSON.stringify(d) }),
  caHuyDangKy: (id) => goi('/api/ca/dang-ky/huy', { method: 'POST', body: JSON.stringify({ id }) }),
  caLichCuaToi: (tu, den) => goi(`/api/ca/lich-cua-toi?tu=${tu}&den=${den}`),
  caMaTranTuan: (phongBanId, tu, den) => goi(`/api/ca/ma-tran-tuan?phong_ban_id=${phongBanId}&tu=${tu}&den=${den}`),
  caXepTuDong: (d) => goi('/api/ca/xep-tu-dong', { method: 'POST', body: JSON.stringify(d) }),
  caDuyet: (id) => goi('/api/ca/duyet', { method: 'POST', body: JSON.stringify({ id }) }),
  caDuyetHangLoat: (ids) => goi('/api/ca/duyet-hang-loat', { method: 'POST', body: JSON.stringify({ ids }) }),
  caTuChoi: (id, lyDo) => goi('/api/ca/tu-choi', { method: 'POST', body: JSON.stringify({ id, ly_do_tu_choi: lyDo }) }),
  caGanThuCong: (d) => goi('/api/ca/gan-thu-cong', { method: 'POST', body: JSON.stringify(d) }),
  caChotLichTuan: (d) => goi('/api/ca/chot-lich-tuan', { method: 'POST', body: JSON.stringify(d) }),

  /* ---- Tài sản ---- */
  taiSanDanhSach: () => goi('/api/tai-san'),
  taiSanLichSu: (id) => goi('/api/tai-san/lich-su?id=' + encodeURIComponent(id)),
  taiSanChiTiet: (id) => goi('/api/tai-san/chi-tiet?id=' + encodeURIComponent(id)),
  taiSanTraCuu: (ma) => goi('/api/tai-san/tra-cuu?ma=' + encodeURIComponent(ma)),
  taiSanThem: (d) => goi('/api/tai-san/them', { method: 'POST', body: JSON.stringify(d) }),
  taiSanSua: (d) => goi('/api/tai-san/sua', { method: 'POST', body: JSON.stringify(d) }),
  taiSanCapPhat: (d) => goi('/api/tai-san/cap-phat', { method: 'POST', body: JSON.stringify(d) }),
  taiSanThuHoi: (d) => goi('/api/tai-san/thu-hoi', { method: 'POST', body: JSON.stringify(d) }),
  taiSanBaoHong: (d) => goi('/api/tai-san/bao-hong', { method: 'POST', body: JSON.stringify(d) }),
  taiSanBaoTriXong: (d) => goi('/api/tai-san/bao-tri-xong', { method: 'POST', body: JSON.stringify(d) }),
  taiSanThanhLy: (d) => goi('/api/tai-san/thanh-ly', { method: 'POST', body: JSON.stringify(d) }),

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
  /* `truoc` = con trỏ `tao_luc_shopee|return_sn` — tải tiếp 500 đơn hoàn CŨ HƠN
     (REV-0034 · L2, cùng lý do với cvLichSu). */
  hoanLichSu: (truoc) => goi('/api/hoan/lich-su' + (truoc ? `?truoc=${encodeURIComponent(truoc)}` : '')),
  hoanDaNhan: (returnSn, tinhTrang) => goi('/api/hoan/da-nhan', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn, tinh_trang: tinhTrang })
  }),
  hoanKhieuNai: (returnSn, ghiChu, anh = []) => goi('/api/hoan/khieu-nai', {
    method: 'POST', body: JSON.stringify({ return_sn: returnSn, ghi_chu: ghiChu, anh })
  }),
  hoanKhieuNaiVideo: (returnSn, file) => {
    const fd = new FormData();
    fd.append('return_sn', returnSn);
    fd.append('file', file);
    return goi('/api/hoan/khieu-nai/video', { method: 'POST', body: fd });
  },
  hoanKhieuNaiVideoUrl: (id) => '/api/hoan/khieu-nai/video?id=' + encodeURIComponent(id),
  hoanKhieuNaiMinhChung: (returnSn) =>
    goi('/api/hoan/khieu-nai/minh-chung?return_sn=' + encodeURIComponent(returnSn)),
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
  kdDonHangHuy: () => goi('/api/kinh-doanh/don-hang-huy'),
  kdDongBoDonHang: () => goi('/api/kinh-doanh/dong-bo-don-hang', { method: 'POST' }),

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
