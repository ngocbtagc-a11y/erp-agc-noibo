/* ==========================================================================
   DỮ LIỆU MẪU — CRM Alpha Green Commerce
   ---------------------------------------------------------------------------
   TOÀN BỘ SỐ LIỆU TRONG FILE NÀY LÀ DỮ LIỆU GIẢ, chỉ để xem trước giao diện
   của các tab CHƯA nối máy chủ: Tổng quan, Kinh doanh, Kho vận, Kế toán.

   Danh bạ, danh sách nhân sự, lương và tài khoản ĐÃ CHUYỂN SANG MÁY CHỦ
   (xem src/index.js) nên không còn nằm ở đây nữa.

   ⚠️ File này trình duyệt tải về được nên AI CŨNG ĐỌC ĐƯỢC HẾT.
   Tuyệt đối không thay số thật (doanh thu, công nợ, giá vốn) vào đây.
   Muốn dùng số thật thì phải chuyển tab đó sang máy chủ trước.
   ========================================================================== */

const DB = {

  /* ---- Tổng quan ---------------------------------------------------- */
  tongQuan: {
    the: [
      { k: 'Doanh thu tháng 7', v: '6,84 tỷ', d: '+12,4% so tháng trước', dir: 'up' },
      { k: 'Đơn hàng tháng 7',  v: '9.412',   d: '+8,1% so tháng trước',  dir: 'up' },
      { k: 'Giá trị đơn TB',    v: '727 K',   d: '+3,9% so tháng trước',  dir: 'up' },
      { k: 'Tiến độ mục tiêu năm', v: '48%',  d: '43,2 tỷ / 90 tỷ',       dir: '' }
    ],
    doanhThu6Thang: [
      { lb: 'T2', v: 5.1 }, { lb: 'T3', v: 5.8 }, { lb: 'T4', v: 6.2 },
      { lb: 'T5', v: 5.9 }, { lb: 'T6', v: 6.1 }, { lb: 'T7', v: 6.8, hi: true }
    ],
    cannBaoDong: [
      { m: 'danger', b: 'Hạnh nhân Mỹ 1kg sắp hết hàng', s: 'Còn 42 kg, bán trung bình 31 kg/ngày — dự kiến hết trong 1,4 ngày', t: 'Kho vận' },
      { m: 'danger', b: 'Công nợ NCC Hàn Quốc quá hạn 12 ngày', s: '486 triệu — đã quá hạn thanh toán theo hợp đồng', t: 'Kế toán' },
      { m: 'warn',   b: '9 nhân sự chưa ký hợp đồng công ty', s: 'Vẫn đang thuộc pháp nhân HKD Onfod — mục tiêu Q3 là hợp nhất', t: 'Nhân sự' },
      { m: 'warn',   b: 'Nho khô Chile tồn kho 118 ngày', s: 'Vượt ngưỡng 90 ngày — cân nhắc chạy khuyến mãi xả hàng', t: 'Kho vận' },
      { m: 'sage',   b: 'Macca Úc vượt mục tiêu tháng', s: 'Đạt 134% kế hoạch tháng 7 — nhóm hàng tăng trưởng tốt nhất', t: 'Kinh doanh' }
    ],
    mucTieuQuy: [
      { b: 'Chuyển toàn bộ nhân sự về 1 pháp nhân', pct: 62, note: '11/20 người đã ký hợp đồng công ty' },
      { b: 'Đóng các hộ kinh doanh cũ',             pct: 30, note: 'Đang chờ quyết toán thuế HKD Onfod' },
      { b: 'Chuyển tồn dư HKD lên công ty',         pct: 55, note: 'Đã chuyển 2,1 tỷ / 3,8 tỷ giá trị tồn' },
      { b: 'Ban hành quy trình cho các khâu',       pct: 25, note: '2/8 khâu đã có quy trình viết ra' }
    ]
  },

  /* ---- Nhân sự ------------------------------------------------------ */
  nhanSu: {
    the: [
      { k: 'Tổng nhân sự',       v: '20', d: '10 fulltime · 10 parttime' },
      { k: 'Đã ký HĐ công ty',   v: '11', d: 'Còn 9 người thuộc HKD', dir: '' },
      { k: 'Đang thử việc',      v: '3',  d: '1 người hết hạn tuần này' },
      { k: 'Tỷ lệ đi làm T7',    v: '96%', d: '+2% so tháng trước', dir: 'up' }
    ],
    chuyenDoi: [
      { b: 'Nhóm Giữ & Đầu tư',        pct: 100, note: '8 người — đã ký hợp đồng công ty' },
      { b: 'Nhóm Quan sát thêm',       pct: 50,  note: '6 người — đang trong buổi 1:1 vòng 2' },
      { b: 'Nhóm Để tự quyết định',    pct: 33,  note: '3 người — chờ phản hồi cá nhân' },
      { b: 'Chưa xếp nhóm',            pct: 0,   note: '3 người parttime — chưa làm 1:1' }
    ],
    lich: [
      { b: '1:1 với Vũ Lan Hương', s: 'Check-in tuần — giao việc theo đầu ra', t: 'Thứ 4, 15:00' },
      { b: '1:1 với Phạm Khương Duy', s: 'Check-in tuần — KPI team kho', t: 'Thứ 2, 14:00' },
      { b: 'Hết hạn thử việc — Vũ Lan Hương', s: 'Cần đánh giá và quyết định ký chính thức', t: '05/08/2026' },
      { b: 'Khóa Văn hóa doanh nghiệp', s: 'Sếp Ngọc tham dự — Mai Xuân Đạt', t: 'Đã học 20/06/2026' }
    ]
  },

  /* ---- Kinh doanh --------------------------------------------------- */
  kinhDoanh: {
    the: [
      { k: 'Doanh thu Shopee T7', v: '6,12 tỷ', d: '89% tổng doanh thu', dir: '' },
      { k: 'Doanh thu TikTok T7', v: '0,72 tỷ', d: '+41% so tháng trước', dir: 'up' },
      { k: 'Tỷ lệ hoàn/huỷ',      v: '3,2%',    d: '-0,6% so tháng trước', dir: 'up' },
      { k: 'Đánh giá trung bình', v: '4,9/5',   d: '2.184 lượt đánh giá', dir: '' }
    ],
    topSanPham: [
      { sp: 'Hạnh nhân Mỹ tách vỏ 1kg',   dm: 'Hạt dinh dưỡng', dh: 1284, dt: '1.412.400.000', tt: 'ok',     ttx: '134% KH' },
      { sp: 'Macca Úc nứt vỏ 500g',       dm: 'Hạt dinh dưỡng', dh: 1102, dt: '1.058.000.000', tt: 'ok',     ttx: '128% KH' },
      { sp: 'Óc chó Chile 1kg',           dm: 'Hạt dinh dưỡng', dh: 894,  dt: '804.600.000',   tt: 'ok',     ttx: '112% KH' },
      { sp: 'Nho khô Chile không hạt 1kg',dm: 'Trái cây sấy',   dh: 612,  dt: '336.600.000',   tt: 'warn',   ttx: '78% KH' },
      { sp: 'Táo đỏ Tân Cương 500g',      dm: 'Nông sản khô',   dh: 588,  dt: '294.000.000',   tt: 'ok',     ttx: '104% KH' },
      { sp: 'Hạt điều rang muối 500g',    dm: 'Hạt dinh dưỡng', dh: 502,  dt: '251.000.000',   tt: 'warn',   ttx: '82% KH' },
      { sp: 'Việt quất sấy Mỹ 200g',      dm: 'Trái cây sấy',   dh: 431,  dt: '215.500.000',   tt: 'danger', ttx: '61% KH' }
    ],
    theoKenh: [
      { lb: 'Shopee', v: 6.12, hi: true },
      { lb: 'TikTok', v: 0.72 },
      { lb: 'Lazada', v: 0 },
      { lb: 'Website', v: 0 }
    ],
    doiThu: [
      { b: 'Nông sản Giọt nắng', s: 'Giảm giá 22% dòng hạt dinh dưỡng từ 10/07', t: 'Theo dõi' },
      { b: 'DK Harvest',         s: 'Ra mắt combo quà tặng — cạnh tranh trực tiếp nhóm quà biếu', t: 'Theo dõi' },
      { b: 'Anpaso',             s: 'Chưa có động thái mới trong tháng 7', t: 'Ổn định' }
    ]
  },

  /* ---- Kho vận ------------------------------------------------------ */
  khoVan: {
    the: [
      { k: 'Giá trị tồn kho', v: '4,86 tỷ',  d: '218 mã hàng' },
      { k: 'Đơn chờ đóng gói', v: '284',     d: 'Cần xong trước 17:00 hôm nay', dir: '' },
      { k: 'Tỷ lệ giao đúng hạn', v: '97,4%', d: '+1,2% so tháng trước', dir: 'up' },
      { k: 'Mã sắp hết hàng', v: '7',        d: '3 mã dưới 2 ngày bán', dir: 'down' }
    ],
    tonKho: [
      { sp: 'Hạnh nhân Mỹ tách vỏ 1kg',    ma: 'HN-MY-1000', sl: 42,   ngay: 1.4,   tt: 'danger', ttx: 'Sắp hết' },
      { sp: 'Macca Úc nứt vỏ 500g',        ma: 'MC-UC-500',  sl: 96,   ngay: 2.6,   tt: 'danger', ttx: 'Sắp hết' },
      { sp: 'Việt quất sấy Mỹ 200g',       ma: 'VQ-MY-200',  sl: 118,  ngay: 3.1,   tt: 'warn',   ttx: 'Cần nhập' },
      { sp: 'Óc chó Chile 1kg',            ma: 'OC-CL-1000', sl: 412,  ngay: 14.2,  tt: 'ok',     ttx: 'Bình thường' },
      { sp: 'Táo đỏ Tân Cương 500g',       ma: 'TD-TC-500',  sl: 684,  ngay: 34.9,  tt: 'ok',     ttx: 'Bình thường' },
      { sp: 'Hạt điều rang muối 500g',     ma: 'HD-VN-500',  sl: 912,  ngay: 54.5,  tt: 'ok',     ttx: 'Bình thường' },
      { sp: 'Nho khô Chile không hạt 1kg', ma: 'NK-CL-1000', sl: 2384, ngay: 118.0, tt: 'warn',   ttx: 'Tồn lâu' }
    ],
    donHang: [
      { lb: 'T2', v: 312 }, { lb: 'T3', v: 284 }, { lb: 'T4', v: 356 },
      { lb: 'T5', v: 298 }, { lb: 'T6', v: 402, hi: true }, { lb: 'T7', v: 388 }, { lb: 'CN', v: 246 }
    ],
    nhapHang: [
      { b: 'Hạnh nhân Mỹ — 2 tấn', s: 'NCC California Nuts · đã thanh toán cọc 30%', t: 'Về kho 22/07' },
      { b: 'Macca Úc — 800 kg',    s: 'NCC Australian Harvest · đang làm thủ tục hải quan', t: 'Về kho 25/07' },
      { b: 'Việt quất sấy — 300 kg', s: 'NCC US Dried Fruit · chờ xác nhận đơn', t: 'Dự kiến 02/08' }
    ]
  },

  /* ---- Kế toán ------------------------------------------------------ */
  keToan: {
    the: [
      { k: 'Doanh thu luỹ kế 2026', v: '43,2 tỷ', d: '48% mục tiêu 90 tỷ', dir: '' },
      { k: 'Công nợ phải trả',      v: '2,14 tỷ', d: '486 tr đã quá hạn', dir: 'down' },
      { k: 'Công nợ phải thu',      v: '1,82 tỷ', d: 'Chủ yếu từ sàn Shopee' },
      { k: 'Lợi nhuận gộp T7',      v: '1,71 tỷ', d: 'Biên 25,0%', dir: 'up' }
    ],
    congNo: [
      { dt: 'California Nuts Co.',    loai: 'Phải trả', st: '486.000.000',   han: '05/07/2026', tt: 'danger', ttx: 'Quá hạn 12 ngày' },
      { dt: 'Korea Food Import',      loai: 'Phải trả', st: '312.000.000',   han: '20/07/2026', tt: 'warn',   ttx: 'Còn 3 ngày' },
      { dt: 'Australian Harvest',     loai: 'Phải trả', st: '724.000.000',   han: '05/08/2026', tt: 'ok',     ttx: 'Trong hạn' },
      { dt: 'US Dried Fruit Ltd.',    loai: 'Phải trả', st: '618.000.000',   han: '15/08/2026', tt: 'ok',     ttx: 'Trong hạn' },
      { dt: 'Shopee — kỳ 1 tháng 7',  loai: 'Phải thu', st: '1.284.000.000', han: '25/07/2026', tt: 'ok',     ttx: 'Chờ sàn trả' },
      { dt: 'TikTok Shop — tháng 7',  loai: 'Phải thu', st: '536.000.000',   han: '31/07/2026', tt: 'ok',     ttx: 'Chờ sàn trả' }
    ],
    chiPhi: [
      { lb: 'Giá vốn', v: 5.13, hi: true },
      { lb: 'Vận chuyển', v: 0.58 },
      { lb: 'Sàn TMĐT', v: 0.71 },
      { lb: 'Lương', v: 0.34 },
      { lb: 'Marketing', v: 0.29 },
      { lb: 'Khác', v: 0.12 }
    ],
    thue: [
      { b: 'Tờ khai thuế GTGT tháng 6', s: 'Đã nộp đúng hạn · Chị Hằng phụ trách', t: 'Hoàn thành' },
      { b: 'Tờ khai thuế GTGT tháng 7', s: 'Hạn nộp 20/08/2026', t: 'Chưa tới hạn' },
      { b: 'Quyết toán thuế HKD Onfod', s: 'Đang chờ cơ quan thuế · chặn mục tiêu đóng HKD', t: 'Đang xử lý' },
      { b: 'Thuế TNDN tạm tính Q2', s: 'Đã nộp 214 triệu', t: 'Hoàn thành' }
    ]
  }
};
