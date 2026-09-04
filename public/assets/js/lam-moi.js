/* ==========================================================================
   ĐÀI TÍN HIỆU "DỮ LIỆU VỪA ĐỔI" — MÀN HÌNH TỰ LÀM MỚI
   ---------------------------------------------------------------------------
   GÓP Ý GỐC (Sếp Ngọc, 03/09/2026): *"đã duyệt hoàn thành mà nó vẫn hiện ở
   đây"* — bấm Duyệt xong, máy chủ ghi đúng, nhưng màn hình vẫn kể việc cũ cho
   tới khi bấm F5.

   LỚP VẤN ĐỀ (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md ①) — KHÔNG phải "nút Duyệt ở
   Trạm Mục Tiêu". Lớp là: **mọi chỗ người dùng bấm một nút làm ĐỔI DỮ LIỆU mà
   danh sách / con số trên màn hình không tự vẽ lại theo.**

   QUÉT CẢ ERP TRƯỚC KHI SỬA (luật ②). Đếm theo KHỐI HIỂN THỊ — đơn vị người
   dùng thật sự nhìn thấy — chứ KHÔNG theo nút bấm. Vòng đầu tôi đếm theo nút
   và cách đó giấu mất mức nặng: nút "Duyệt xong" CÓ gọi hàm nạp lại (nên
   trông như rổ B nhẹ), nhưng cái THẺ tóm tắt ngay cạnh nó chạy đúng một lần
   lúc mở trang rồi thôi (rổ A tuyệt đối) — nên Sếp vấp trúng ngay ngày đầu.

   Số đếm trên mốc `merge-base` — 46 khối hiển thị / 123 chỗ gọi + 13 chỗ
   truyền hàm ghi làm tham số (= 136):
     · RỔ A — khối KHÔNG BAO GIỜ vẽ lại:               13 khối
     · RỔ B — vẽ ở chỗ này, không vẽ ở chỗ kia:        28 khối
     · RỔ C — đã đúng:                                  5 khối

   ĐỌC CON SỐ RỔ A CHO ĐÚNG — máy đếm theo HÀM, người đọc theo MÀN HÌNH, và
   hai thứ đó không trùng khít. Soi tay 13 khối rổ A:
     · 6 khối là bệnh thật, NAY ĐÃ NỐI DÂY — thẻ tóm tắt Trạm Mục Tiêu ·
       chuông 🔔 · bảng "Khách hoàn nhiều" (chị Huyền) · ô chọn Phòng ban ở
       Xếp ca · danh sách Lịch sử làm việc · danh sách Lịch sử hoàn.
       Hai cái cuối nghe CÓ ĐIỀU KIỆN, xem ghi chú ngay dưới.
     · 4 khối là HỘP MỞ THEO YÊU CẦU (mở ra mới đọc, nên không cần nghe):
       chi tiết Mục tiêu · "ai làm được" của Năng lực · giấy tờ trong hồ sơ ·
       tay xử lý quét mã QR.
     · 3 khối là NHIỄU CỦA PHÉP ĐẾM, không phải khối thật: `veLaiBangNs` là
       một dòng điều phối, `khoiDongKho`/`khoiDongKhoTaiLieu` là hàm khởi
       động — khối thật đằng sau chúng đều đã nối dây.

   HAI MÀN CÓ CON TRỎ "XEM TIẾP" — Lịch sử làm việc và Lịch sử hoàn — nghe
   theo ĐIỀU KIỆN: CHƯA bấm "Tải thêm" lần nào thì tự nạp lại như mọi màn
   khác; bấm rồi thì thôi. Lý do: con trỏ `truoc_tiep` chỉ đi được một chiều,
   nạp lại trang 1 là vứt sạch những trang người dùng vừa bấm về mà không
   dựng lại được. Vòng 3 tôi để cả hai KHÔNG nghe hẳn — đúng lý do nhưng quá
   tay: phần lớn thời gian người ta chưa bấm trang nào, và số cũ nằm đó tới
   tận lần tải lại trang (Hồ Ly chỉ ra, REV-0057 vòng 4).

   ĐỌC SỐ LƯỢT GỌI CỦA LỊCH SỬ LÀM VIỆC CHO ĐÚNG. Ở ba phạm vi "của tôi"
   (mặc định), bảng đó vẽ từ `window.CV_DU_LIEU_CUA_TOI` — đúng bộ dữ liệu mà
   `lamMoiCacManLienQuanCv` vừa nạp mới ngay trước đó — nên nó CÓ đổi nội dung
   mà KHÔNG gọi thêm `cvLichSu` lượt nào. Đo bằng số lượt gọi sẽ thấy 0 và
   tưởng nó không nghe; đo bằng CHỮ trong bảng thì thấy "Chờ duyệt" đổi thành
   "Hoàn thành". Chỉ phạm vi "Toàn công ty" mới thật sự gọi mạng, và chỉ khi
   người dùng chưa bấm sang trang.


   VÒNG 4 CÒN SỬA MỘT BẢN VÁ KHÔNG CHẠY: ô chọn Phòng ban ở Xếp ca vòng 3 có
   đăng ký nghe, có chạy, nhưng vẽ lại từ một mảng không ai nạp lại — nên vẫn
   ra tên cũ. Đo bằng số lượt gọi thì thấy xanh; Hồ Ly đo bằng CHỮ trong ô
   chọn nên thấy đỏ. Một bản vá không chạy kèm chú thích nói rằng nó chạy còn
   nguy hơn không vá.

   BA CON SỐ ĐÓ ĐẾM LẠI ĐƯỢC: `npm run do-kiem-ke-lam-moi`.
   VÒNG 2 PHẢI VIẾT LẠI CÁCH ĐẾM (REV-0057 vòng 2 · CAO-2). Bản đầu lấy danh
   sách khối từ chính bảng đăng ký của bản vá — định nghĩa vòng tròn: khối nào
   chưa ai nối dây thì không bao giờ lọt vào bảng, nên không bao giờ bị xếp
   vào rổ A. Nó chỉ đếm được những chỗ tôi đã sửa. Hồ Ly đi tìm tay và ra ngay
   hai khối bị bỏ sót. Nay máy TỰ DÒ từ mã đang chạy: khối = hàm vừa gọi API
   ĐỌC vừa vẽ ra màn hình — và nó tìm ra đúng hai khối đó mà không cần ai mách.

   VÌ SAO KHÔNG SỬA TỪNG NÚT. Cách cũ là mỗi nút tự nhớ gọi thêm một hàm nạp
   lại. 123 chỗ bấm thì 123 lần phải nhớ — và chỗ thứ 124 sẽ lại quên, y như
   "Lịch sử làm việc" và "Tổng quan công ty" từng quên (audit 23/08/2026).
   Trí nhớ không phải kiến trúc. Bằng chứng ngay trong vòng này: gộp nhánh đọc
   chữ PDF vào, hai hàm ghi mới (`tlLuuTep`, `tlSua`) chưa khai nhóm — bàn đo
   `do-tu-lam-moi` đỏ ngay, không phải chờ Sếp bấm rồi kêu.

   CÁCH LÀM. MỘT chỗ duy nhất phát tín hiệu: `api.js` bọc mọi hàm gọi máy chủ
   KIỂU GHI, thành công thì bắn tên NHÓM DỮ LIỆU vừa bị đụng (`viec`,
   `muc_tieu`, `thong_bao`…). Màn nào đang hiển thị nhóm đó thì tự nạp lại
   PHẦN CỦA MÌNH. Nút thứ 123 tự động đúng, không ai phải nhớ gì.

   BỐN RÀNG BUỘC ĐÃ CÀI SẴN TRONG FILE NÀY
   ① Không nạp lại cả trang — chỉ gọi đúng hàm vẽ lại của phần liên quan.
   ② Không nạp chồng chéo — gộp mọi tín hiệu trong 60ms rồi bắn MỘT lượt; và
      người nghe nào ĐÃ tự chạy sau lúc phát tín hiệu thì BỎ QUA (chống chạy
      hai lần với những chỗ vốn đã tự gọi tay `taiLai()` từ trước).
   ③ Đang gõ dở KHÔNG mất chữ — người nghe nào có ô chữ đang gõ nằm trong
      vùng vẽ lại của mình thì HOÃN, chạy nốt khi con trỏ rời ô đó.
   ④ Đếm được — `soLuot()` trả về số lượt đã bắn / đã chạy / đã bỏ qua, để đo
      lượt đọc D1 tăng thêm bao nhiêu, không phải đoán.
   ========================================================================== */

/* ---- ① NHÓM DỮ LIỆU CỦA TỪNG HÀM GHI ------------------------------------
   Khoá = đúng tên hàm trong `API` (api.js). Giá trị = những nhóm dữ liệu mà
   một lần gọi thành công sẽ làm CŨ đi trên màn hình.

   LUẬT: thêm một hàm ghi mới vào `api.js` thì PHẢI thêm một dòng vào đây
   (hoặc vào `MIEN_TRU` kèm lý do). Quên là `npm run do-tu-lam-moi` đỏ ngay,
   không phải chờ Sếp bấm rồi kêu.

   `thong_bao` xuất hiện nhiều là CÓ CHỦ Ý: máy chủ bắn tin vào chuông 🔔 ở
   rất nhiều đường ghi (`guiThongBao` trong src/index.js), mà chuông chỉ tự
   hỏi lại 5 PHÚT/LẦN. Đó chính là "rổ B" — danh sách đã đúng nhưng con số
   trên huy hiệu đỏ vẫn là số cũ. */
export const NHOM_DU_LIEU = {
  /* -- Công việc: đổi việc là đổi luôn tiến độ mục tiêu đang gắn + chuông -- */
  cvTao:              ['viec', 'muc_tieu', 'thong_bao'],
  cvCapNhat:          ['viec', 'muc_tieu', 'thong_bao'],
  cvSua:              ['viec', 'muc_tieu', 'thong_bao'],

  /* -- Mục tiêu -- */
  mtTao:              ['muc_tieu', 'viec'],
  mtChot:             ['muc_tieu'],
  mtCapNhat:          ['muc_tieu', 'viec', 'thong_bao'],

  /* -- Góp ý ERP (chính màn Sếp Ngọc đang bấm Duyệt) -- */
  gopYGui:            ['gop_y', 'thong_bao'],
  gopYDoiTrangThai:   ['gop_y', 'thong_bao'],
  gopYDuyet:          ['gop_y', 'thong_bao'],
  gopYHoanTac:        ['gop_y', 'thong_bao'],

  /* -- Vinh danh -- */
  vdGui:              ['vinh_danh', 'thong_bao'],
  vdSua:              ['vinh_danh', 'thong_bao'],

  /* -- Hồ sơ của chính tôi mà NGƯỜI KHÁC cũng nhìn thấy (Danh bạ, bảng
        Nhân sự): ảnh đại diện và trạng thái sẵn sàng. -- */
  nsAnhDaiDien:       ['nhan_su'],
  nsTrangThaiHD:      ['nhan_su'],

  /* -- Hồ sơ nhân sự: hợp đồng · mô tả công việc · năng lực · sinh nhật.
        Đụng hợp đồng là đụng luôn dải "việc cần làm" (hợp đồng quá hạn) và
        cột Hợp đồng ở bảng Nhân sự — hai chỗ nằm ở màn khác. -- */
  nsHopDongLuu:       ['ho_so', 'nhan_su'],
  nsHopDongAn:        ['ho_so', 'nhan_su'],
  nsSinhNhatCongKhai: ['ho_so'],
  nsNgaySinhLuu:      ['ho_so'],
  mtcvLuu:            ['ho_so'],
  mtcvAn:             ['ho_so'],
  knCham:             ['ho_so'],
  knGo:               ['ho_so'],
  nsDonMoi:           ['nhan_su', 'tai_khoan', 'ho_so'],

  /* -- Quản trị nhân sự & tài khoản -- */
  qtThemNhanSu:       ['nhan_su', 'tai_khoan'],
  qtSuaNhanSu:        ['nhan_su', 'tai_khoan'],
  qtKhoaNhanSu:       ['nhan_su', 'tai_khoan'],
  qtXoaNhanSu:        ['nhan_su', 'tai_khoan'],
  qtTaoTaiKhoan:      ['tai_khoan', 'nhan_su'],
  qtDatLaiMatKhau:    ['tai_khoan', 'thong_bao'],
  qtKhoaTaiKhoan:     ['tai_khoan'],
  qtXoaTaiKhoan:      ['tai_khoan'],
  qtSuaVaiTro:        ['tai_khoan'],
  qtQuyenDuyetGopY:   ['tai_khoan'],

  /* -- Kho: xuất / nhập / tồn / mã hàng -- */
  khoThemSanPham:     ['kho'],
  khoSuaSanPham:      ['kho'],
  khoAnHienSanPham:   ['kho'],
  khoKhoaSanPham:     ['kho'],
  khoNhap:            ['kho'],
  khoXuat:            ['kho'],

  /* -- Dữ liệu nền. Đổi tên phòng ban là đổi luôn mọi dropdown đang mở ở
        Nhân sự / Kho vận / Tài sản, nên bắn cả `nhan_su` và `tai_san`. -- */
  dlnThemPhongBan:        ['du_lieu_nen', 'nhan_su'],
  dlnSuaPhongBan:         ['du_lieu_nen', 'nhan_su'],
  dlnKhoaPhongBan:        ['du_lieu_nen', 'nhan_su'],
  dlnGanTruongPhong:      ['du_lieu_nen', 'nhan_su'],
  dlnThemChucDanh:        ['du_lieu_nen', 'nhan_su'],
  dlnSuaChucDanh:         ['du_lieu_nen', 'nhan_su'],
  dlnKhoaChucDanh:        ['du_lieu_nen', 'nhan_su'],
  dlnThemDonVi:           ['du_lieu_nen', 'kho'],
  dlnSuaDonVi:            ['du_lieu_nen', 'kho'],
  dlnKhoaDonVi:           ['du_lieu_nen', 'kho'],
  dlnThemNCC:             ['du_lieu_nen'],
  dlnSuaNCC:              ['du_lieu_nen'],
  dlnKhoaNCC:             ['du_lieu_nen'],
  dlnThemKho:             ['du_lieu_nen', 'kho'],
  dlnSuaKho:              ['du_lieu_nen', 'kho'],
  dlnThemDanhMucTaiSan:   ['du_lieu_nen', 'tai_san'],
  dlnSuaDanhMucTaiSan:    ['du_lieu_nen', 'tai_san'],
  dlnKhoaDanhMucTaiSan:   ['du_lieu_nen', 'tai_san'],
  dlnThemViTriTaiSan:     ['du_lieu_nen', 'tai_san'],
  dlnSuaViTriTaiSan:      ['du_lieu_nen', 'tai_san'],
  dlnKhoaViTriTaiSan:     ['du_lieu_nen', 'tai_san'],

  /* -- Tài sản -- */
  taiSanThem:         ['tai_san'],
  taiSanSua:          ['tai_san'],
  taiSanCapPhat:      ['tai_san'],
  taiSanThuHoi:       ['tai_san'],
  taiSanBaoHong:      ['tai_san'],
  taiSanBaoTriXong:   ['tai_san'],
  taiSanThanhLy:      ['tai_san'],

  /* -- Xếp ca -- */
  caThemMauCa:        ['ca'],
  caSuaMauCa:         ['ca'],
  caXoaMauCa:         ['ca'],
  caThemCaMo:         ['ca'],
  caMoDangKyTuan:     ['ca'],
  caKhoaCaMo:         ['ca'],
  caDangKy:           ['ca'],
  caHuyDangKy:        ['ca'],
  caXepTuDong:        ['ca'],
  caDuyet:            ['ca'],
  caDuyetHangLoat:    ['ca'],
  caTuChoi:           ['ca'],
  caGanThuCong:       ['ca'],
  caChotLichTuan:     ['ca'],

  /* -- Đơn hoàn / đối soát / tra soát: MỘT bảng, BỐN màn nhìn vào nó (Kho ·
        Kinh doanh · Kế toán · Lịch sử hoàn). Đây là ổ "rổ B" thứ hai. -- */
  hoanDongBo:         ['hoan', 'thong_bao'],
  hoanDaNhan:         ['hoan', 'thong_bao'],
  hoanChuaNhan:       ['hoan'],
  hoanPhanLoai:       ['hoan', 'thong_bao'],
  hoanKhieuNai:       ['hoan', 'thong_bao'],
  hoanKhieuNaiVideo:  ['hoan', 'thong_bao'],
  hoanSkuMapGan:      ['hoan'],
  tiktokDongBo:       ['hoan'],
  kdDaDoiSoat:        ['hoan'],
  kdDayKho:           ['hoan', 'thong_bao'],
  kdDayKeToan:        ['hoan', 'thong_bao'],
  kdDongBoDonHang:    ['hoan'],
  ktDaTraSoat:        ['hoan'],
  ktLapBienBan:       ['hoan'],

  /* -- Kho tài liệu quản trị. `tlLuuTep` là ĐƯỜNG BYTE THẲNG cho PDF có sẵn
        (CTL-0026 vòng 7) — cùng một kho, cùng một cửa `/api/tai-lieu/luu`, nên
        cùng nhóm với `tlLuu`. Nó vào ERP sau bản vá này và bàn đo
        `do-tu-lam-moi` bắt được ngay lúc gộp nhánh — đúng thứ cái lưới sinh
        ra để làm. -- */
  tlLuu:              ['tai_lieu', 'ho_so'],
  tlLuuTep:           ['tai_lieu', 'ho_so'],
  tlSua:              ['tai_lieu', 'ho_so'],
  tlAn:               ['tai_lieu', 'ho_so']
};

/* ---- MIỄN TRỪ — hàm ghi KHÔNG làm cũ màn hình nào -----------------------
   Phải ghi LÝ DO. Danh sách này là nơi duy nhất được phép trống tín hiệu, và
   nó ngắn có chủ ý: dài ra là dấu hiệu đang lách luật. */
export const MIEN_TRU = {
  dangNhap:   'Thành công là CHUYỂN TRANG sang app.html — không còn màn nào để vẽ lại.',
  dangXuat:   'Thành công là CHUYỂN TRANG về index.html.',
  doiMatKhau: 'Đổi xong là chuyển trang; không màn nào đang hiện mật khẩu.',
  nsDocCCCD:  'Chỉ ĐỌC chữ trong ảnh rồi trả về, không ghi vào bảng nào cả.',
  /* Ba cái dưới đây KHÔNG phải "quên": bắn tín hiệu ở đây là gọi trùng, mà
     gọi trùng là đốt lượt đọc D1 — ERP này từng vượt hạn mức miễn phí. */
  chatGui:    'Màn chat đã có nhịp tim 6 giây/lần tự hỏi tin mới (nhip-tim-chat.js); ' +
              'tin vừa gửi cũng đã hiện ngay tại chỗ. Bắn thêm là gọi trùng.',
  chatDaDoc:  'Cùng lý do với chatGui — nhịp tim chat lo phần này.',
  thongBaoDaXem: 'Giao diện tự tắt huy hiệu đỏ ngay tại chỗ bấm; nạp lại chuông ' +
                 'chỉ tốn thêm một lượt đọc mà không thêm chữ nào mới.',
  cvNhacTat:  'Chỉ là công tắc nhận nhắc việc của riêng mình — nút tự đổi chữ tại chỗ, ' +
              'không danh sách nào trên màn hình đổi theo.',
  pushDangKy: 'Cài đặt đẩy thông báo lên điện thoại — không màn nào hiện dữ liệu này.',
  pushHuy:    'Cùng lý do với pushDangKy.',
  pushTuyChon: 'Cùng lý do với pushDangKy — công tắc tự đổi tại chỗ.'
};

/* ---- ② ĐÀI TÍN HIỆU ----------------------------------------------------- */

const nguoiNghe = [];      // { nhom:Set, ham, goc, ten, batDauLuc, hoan, ngu }
let dangCho = new Map();   // nhóm -> mốc thời gian phát tín hiệu SỚM NHẤT
let hen = null;

const dem = { ban: 0, chay: 0, boQua: 0, hoan: 0, ngu: 0, danhThuc: 0 };
/** Số lượt đã bắn tín hiệu / đã thật sự nạp lại / đã bỏ qua vì thừa / đang hoãn
 *  vì người dùng gõ dở. Dùng để ĐO lượt đọc D1, không phải để đoán. */
export function soLuot() { return { ...dem }; }

const gio = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ---- ③ ĐĂNG KÝ NGHE -----------------------------------------------------
   Trả về CHÍNH hàm đã bọc, và chỗ gọi tay phải dùng bản bọc này:

       const taiLaiMucTieu = ngheDuLieu('muc_tieu', async () => { … });

   Bọc như vậy thì đài BIẾT được lần chạy tay vừa rồi, nên khi tín hiệu tới nó
   không gọi lần thứ hai — đúng ràng buộc "không nạp lại chồng chéo". Nếu chỉ
   đăng ký mà chỗ khác vẫn gọi hàm gốc thì mỗi cú bấm sẽ tốn GẤP ĐÔI lượt đọc
   D1, và ERP này đã một lần vượt hạn mức miễn phí.

   `tuyChon.goc` = hàm trả về phần tử gốc (hoặc mảng phần tử) của vùng sẽ bị vẽ
   lại. Nó làm HAI việc, cả hai đều để tiết kiệm:
     · Đang gõ dở TRONG vùng đó thì HOÃN, khỏi mất chữ (ràng buộc ③).
     · Vùng đó đang ẨN (tab khác đang mở) thì NGỦ, không gọi máy chủ — đánh
       dấu "cũ rồi" và chỉ nạp khi người dùng thật sự mở tab đó (`moTab` gọi
       `lamMoiManVuaMo()`). Nhờ vậy một cú bấm KHÔNG kéo 13 tab cùng nạp lại,
       và lượt đọc D1 còn ÍT HƠN cách cũ.
   Không truyền `goc` = luôn hiện, luôn chạy (chuông thông báo, kho danh mục
   nền dùng chung).                                                            */
export function ngheDuLieu(nhom, ham, tuyChon = {}) {
  const ds = Array.isArray(nhom) ? nhom : [nhom];
  const ban = {
    nhom: new Set(ds),
    ten: tuyChon.ten || ham.name || ds.join('+'),
    goc: tuyChon.goc || null,
    batDauLuc: 0,
    hoan: false,
    ngu: false,
    ham: null
  };
  ban.ham = async (...thamSo) => {
    ban.batDauLuc = gio();
    ban.ngu = false;          // chạy tay là hết cũ, khỏi đánh thức lần nữa
    return await ham(...thamSo);
  };
  nguoiNghe.push(ban);
  return ban.ham;
}

/* ---- MÀN VỪA ĐƯỢC MỞ RA ------------------------------------------------
   `moTab()` gọi hàm này. Màn nào lúc có tín hiệu đang ẩn nên ngủ, giờ hiện
   ra thì nạp lại — người dùng chuyển tab sang là thấy số mới, không thấy số
   của mười phút trước.

   `await` Ở ĐÂY LÀ BẮT BUỘC, KHÔNG PHẢI CHO ĐẸP (REV-0057 · L1).
   Bản đầu 03/09/2026 gọi `chay(n)` trần, và Hồ Ly bắt được: đứng Tổng quan →
   sang Tài sản → duyệt xong → quay lại Tổng quan, thẻ "Việc tôi giao — chờ
   duyệt" vẫn kể số CŨ. Vì hai người nghe của tab đó chạy SONG SONG: khối việc
   đang tải dữ liệu mới thì thẻ tóm tắt đã đọc xong biến cũ
   (`window.CV_DU_LIEU_CUA_TOI`, đọc đồng bộ ngay dòng đầu). Đúng bằng bệnh Sếp
   kể, chỉ khác đường vào. Ba đường đánh thức người nghe — `xa`, hàm này, và
   `thuLaiNguoiHoan` — PHẢI cùng chạy lần lượt, không được lệch nhau chỗ nào. */
export async function lamMoiManVuaMo() {
  for (const n of nguoiNghe) {
    if (!n.ngu || !hienThi(n)) continue;
    n.ngu = false;
    dem.danhThuc++;
    await chay(n);
  }
}

/* ---- ④ PHÁT TÍN HIỆU ----------------------------------------------------
   HAI TAB ERP CÙNG MỞ (REV-0057 · L9). Sếp Ngọc bấm Duyệt ở tab 1 thì tab 2
   trước nay không biết gì — vẫn kể số cũ, đúng lớp bệnh đang vá, chỉ khác
   đường vào. `BroadcastChannel` có sẵn trong trình duyệt (chi phí 0, không
   thêm gói, không thêm dịch vụ, không đi qua máy chủ) nên tab nào ghi thì báo
   luôn cho các tab còn lại.

   HAI CHỖ PHẢI CẨN THẬN, đã xử ngay tại đây:
   ① KHÔNG dội lại. Tín hiệu NHẬN từ tab khác chỉ xếp vào hàng chờ, tuyệt đối
      không phát tiếp — không thì hai tab bắn qua bắn lại vô tận.
   ② KHÔNG tốn thêm lượt đọc D1 một cách vô ích: tab kia thường đang ẩn hoặc
      đang mở tab khác, mà màn đang ẩn thì NGỦ (xem `hienThi`). Chỉ đúng khối
      người ta đang nhìn mới nạp lại. */
let keChung = null;
try {
  if (typeof BroadcastChannel === 'function') {
    keChung = new BroadcastChannel('agc-lam-moi');
    keChung.onmessage = (e) => {
      const ds = e && e.data && e.data.nhom;
      if (Array.isArray(ds) && ds.length) xepHang(ds);   // xếp hàng, KHÔNG phát lại
    };
  }
} catch { keChung = null; }   // trình duyệt cũ không có thì thôi, mọi thứ khác vẫn chạy

export function baoDuLieuDoi(dsNhom) {
  if (!dsNhom || !dsNhom.length) return;
  xepHang(dsNhom);
  // Báo sang các tab ERP khác của cùng người dùng. Hỏng thì kệ, không chặn.
  try { if (keChung) keChung.postMessage({ nhom: [...dsNhom] }); } catch { /* kệ */ }
}

function xepHang(dsNhom) {
  const luc = gio();
  dem.ban++;
  for (const n of dsNhom) if (!dangCho.has(n)) dangCho.set(n, luc);
  // Gộp trong 60ms: một cú bấm đụng 3 nhóm thì vẫn CHỈ một lượt vẽ lại.
  if (hen) return;
  hen = setTimeout(() => { hen = null; batDauXa(); }, 60);
}

/* Một lượt xả đang chạy thì lượt sau XẾP HÀNG, không chạy chồng (REV-0057 ·
   L10). `xa()` nay `await` từng người nghe, nên với mạng chậm một lượt có thể
   còn đang chạy khi hẹn 60ms kế tiếp nổ — hai lượt chồng nhau là mất luôn thứ
   tự chạy, mà thứ tự chạy chính là thứ giữ cho thẻ tóm tắt không nói dối. */
let dangXa = false, coLuotChoXa = false;
async function batDauXa() {
  if (dangXa) { coLuotChoXa = true; return; }
  dangXa = true;
  try {
    do {
      coLuotChoXa = false;
      await xa();
    } while (coLuotChoXa);
  } finally { dangXa = false; }
}

/* Chạy LẦN LƯỢT, không bắn cả loạt cùng lúc. Hai lý do, cả hai là thật:
   ① Thứ tự đăng ký quyết định thứ tự chạy, nên màn nào NẠP dữ liệu chạy
      trước, màn nào chỉ ĐỌC LẠI dữ liệu đó (thẻ tóm tắt) chạy sau và không
      phải gọi máy chủ lần hai.
   ② Không dội một chùm lệnh gọi vào D1 trong cùng một khoảnh khắc. */
async function xa() {
  const lo = dangCho;
  dangCho = new Map();
  if (!lo.size) return;

  for (const n of nguoiNghe) {
    // Mốc phát tín hiệu SỚM NHẤT trong những nhóm mà người nghe này quan tâm.
    let tinHieuLuc = Infinity;
    for (const g of n.nhom) { const t = lo.get(g); if (t !== undefined && t < tinHieuLuc) tinHieuLuc = t; }
    if (tinHieuLuc === Infinity) continue;

    /* Đã tự chạy SAU lúc phát tín hiệu → nó đã nhìn thấy dữ liệu mới rồi.
       Gọi thêm lần nữa là đúng nghĩa "nạp lại chồng chéo". */
    if (n.batDauLuc >= tinHieuLuc) { dem.boQua++; continue; }

    /* Màn đang ẩn thì NGỦ — gọi máy chủ để vẽ vào một cái tab không ai nhìn
       là đốt lượt đọc D1. Đánh dấu "cũ rồi", `moTab` sẽ đánh thức. */
    if (!hienThi(n)) { n.ngu = true; dem.ngu++; continue; }

    /* `if (!n.hoan)` — chỉ đếm LẦN ĐẦU bị hoãn. Bản trước cộng mỗi lượt tín
       hiệu mà chỉ trừ một lần lúc chạy, nên `dem.hoan` trôi dần và con số
       báo ra sai (REV-0057 · L10). Số để đọc thì cũng phải đọc được. */
    if (dangGoTrong(n)) { if (!n.hoan) dem.hoan++; n.hoan = true; canhGac(); continue; }
    await chay(n);
  }
}

async function chay(n) {
  n.hoan = false;
  dem.chay++;
  try { await n.ham(); } catch (e) { keu(n, e); }
}

/* Một màn hỏng KHÔNG được kéo theo các màn còn lại. Nhưng cũng KHÔNG được im:
   im lặng đúng là cách chat chết mấy tuần mà không ai biết (REV-0038 · L3). */
function keu(n, e) {
  console.error(`Làm mới "${n.ten}" hỏng:`, e && e.message ? e.message : e);
}

/* ---- ⑤ ĐANG GÕ DỞ THÌ KHÔNG ĐƯỢC MẤT CHỮ --------------------------------
   Chỉ hoãn ĐÚNG người nghe có ô đang gõ nằm trong vùng của mình. Hoãn cả làng
   là để màn hình nói dối lâu hơn cần thiết. */
function oDangGo() {
  const el = typeof document !== 'undefined' ? document.activeElement : null;
  if (!el) return null;
  const the = (el.tagName || '').toLowerCase();
  const laO = (the === 'textarea')
    || (the === 'input' && !['button', 'submit', 'checkbox', 'radio', 'file', 'reset'].includes((el.type || 'text').toLowerCase()))
    || el.isContentEditable;
  if (!laO) return null;
  // Ô rỗng thì chẳng có chữ nào để mất — vẽ lại thoải mái.
  const chu = el.isContentEditable ? (el.textContent || '') : (el.value || '');
  return chu.trim() ? el : null;
}

/* Gốc của một người nghe, luôn trả về MẢNG (có người nghe vẽ hai tab: khối
   việc ở Trạm Mục Tiêu và bảng ở Lịch sử làm việc là cùng một hàm). */
function layGoc(n) {
  if (!n.goc) return null;
  let g;
  try { g = typeof n.goc === 'function' ? n.goc() : n.goc; } catch { g = null; }
  if (!g) return null;
  const ds = (Array.isArray(g) ? g : [g]).filter(Boolean);
  return ds.length ? ds : null;
}

/* ---- CẢ TAB TRÌNH DUYỆT ĐANG ẨN THÌ CŨNG NGỦ (REV-0057 vòng 2 · CAO-1) ---
   `offsetParent` và `getClientRects()` KHÔNG biết tab trình duyệt đang nằm ở
   NỀN: Chrome vẫn bố cục đầy đủ cho tab nền, nên hỏi hai thứ đó ra "đang
   hiện", và cả bốn tab ERP cùng nạp lại cho MỘT cú bấm của MỘT người.
   Hồ Ly đo được: 1 tab +1 lệnh gọi · 2 tab +5 · 3 tab +9 · 4 tab +13 — tức
   chính tính năng nhiều tab lại ăn mất cái tiết kiệm mà nó khoe.
   `document.hidden` mới là câu hỏi đúng. Dùng lại ĐÚNG khuôn mà mô-đun chat
   đã dùng từ trước (`visibilitychange`, app.js) — không nghĩ cách mới. */
function tabTrinhDuyetAn() {
  return typeof document !== 'undefined' && document.hidden === true;
}

/* Không khai gốc = luôn coi như đang hiện (chuông, kho danh mục nền). Khai
   gốc mà tìm không thấy phần tử = coi như ĐANG HIỆN, không phải đang ẩn: thà
   nạp thừa một lượt còn hơn để màn hình nói dối vì một cái id gõ sai.
   NHƯNG tab TRÌNH DUYỆT ẩn thì ngủ HẾT, kể cả người nghe không khai gốc
   (chuông): người dùng đang không nhìn cái tab này. */
function hienThi(n) {
  if (tabTrinhDuyetAn()) return false;
  const ds = layGoc(n);
  if (!ds) return true;
  return ds.some(el => el.offsetParent !== null || el.getClientRects().length > 0);
}

/* Quay lại tab là nạp nốt những màn đã ngủ. Thiếu dòng này thì "ngủ" biến
   thành "quên", và màn hình lại nói dối — đúng bệnh đang vá. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lamMoiManVuaMo();
  });
}

function dangGoTrong(n) {
  const o = oDangGo();
  if (!o) return false;
  const ds = layGoc(n);
  if (!ds) return false;
  return ds.some(x => x.contains && x.contains(o));
}

let henGac = null;
let dangThuLai = false;
/* `await chay(n)` — CÙNG LÝ DO với `lamMoiManVuaMo` (REV-0057 · L1): đây là
   đường "rời ô là nạp nốt", và nó cũng có thể đánh thức HAI người nghe cùng
   một tab. Chạy song song thì màn đọc-lại-dữ-liệu (thẻ tóm tắt) đọc trúng
   biến cũ, tức màn hình lại nói dối đúng kiểu Sếp đã kêu.
   `dangThuLai` chặn hai lượt chồng nhau: hàm này chạy từ `setInterval`
   500ms/lần lẫn từ `focusout`, mà nay nó `await` nên một lượt có thể còn
   đang chạy khi lượt sau tới. */
async function thuLaiNguoiHoan() {
  if (dangThuLai) return;
  dangThuLai = true;
  try {
    for (const n of nguoiNghe) {
      if (!n.hoan) continue;
      if (dangGoTrong(n)) continue;   // vẫn đang gõ trong vùng đó → chờ tiếp
      n.hoan = false;                 // gỡ cờ TRƯỚC khi chạy, để `dem.hoan` không trôi
      dem.hoan--;
      await chay(n);
    }
  } finally { dangThuLai = false; }
  if (!nguoiNghe.some(n => n.hoan) && henGac) {
    clearInterval(henGac);
    henGac = null;
    document.removeEventListener('focusout', roiO, true);
  }
}
const roiO = () => setTimeout(thuLaiNguoiHoan, 0);

/* Canh hai đường: rời ô (focusout) là thử ngay, và 500ms/lần cho trường hợp
   người dùng xoá sạch ô mà không rời con trỏ đi đâu. */
function canhGac() {
  if (henGac || typeof document === 'undefined') return;
  henGac = setInterval(thuLaiNguoiHoan, 500);
  document.addEventListener('focusout', roiO, true);
}
