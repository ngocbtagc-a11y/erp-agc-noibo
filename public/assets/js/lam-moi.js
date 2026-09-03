/* ==========================================================================
   ĐÀI TÍN HIỆU "DỮ LIỆU VỪA ĐỔI" — MÀN HÌNH TỰ LÀM MỚI
   ---------------------------------------------------------------------------
   GÓP Ý GỐC (Sếp Ngọc, 03/09/2026): *"đã duyệt hoàn thành mà nó vẫn hiện ở
   đây"* — bấm Duyệt xong, máy chủ ghi đúng, nhưng màn hình vẫn kể việc cũ cho
   tới khi bấm F5.

   LỚP VẤN ĐỀ (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md ①) — KHÔNG phải "nút Duyệt ở
   Trạm Mục Tiêu". Lớp là: **mọi chỗ người dùng bấm một nút làm ĐỔI DỮ LIỆU mà
   danh sách / con số trên màn hình không tự vẽ lại theo.**

   QUÉT CẢ ERP TRƯỚC KHI SỬA (luật ②) — số đếm thật trên `origin/main`,
   115 chỗ trong giao diện gọi một hàm ghi:
     · RỔ A — bấm xong KHÔNG vẽ lại gì:                              1 chỗ
       (công tắc "công khai sinh nhật": dải "sinh nhật tháng sau" không đổi)
     · RỔ B — vẽ lại chỗ mình, KHÔNG vẽ lại chỗ liên quan:          50 chỗ
       (ổ lớn nhất là CHUÔNG 🔔 — máy chủ bắn tin vào chuông ở 18 đường ghi
        mà chuông chỉ tự hỏi lại 5 phút/lần; kế đó là thẻ tóm tắt Trạm Mục
        Tiêu, danh mục nền dùng chung, và bốn màn cùng đọc bảng đơn hoàn)
     · RỔ C — đã đúng:                                              64 chỗ

   VÌ SAO KHÔNG SỬA TỪNG NÚT. Cách cũ là mỗi nút tự nhớ gọi thêm một hàm nạp
   lại. 115 chỗ bấm thì 115 lần phải nhớ — và chỗ thứ 116 sẽ lại quên, y như
   "Lịch sử làm việc" và "Tổng quan công ty" từng quên (audit 23/08/2026).
   Trí nhớ không phải kiến trúc.

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

  /* -- Kho tài liệu quản trị -- */
  tlLuu:              ['tai_lieu', 'ho_so'],
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
   của mười phút trước. */
export function lamMoiManVuaMo() {
  for (const n of nguoiNghe) {
    if (!n.ngu || !hienThi(n)) continue;
    n.ngu = false;
    dem.danhThuc++;
    chay(n);
  }
}

/* ---- ④ PHÁT TÍN HIỆU ---------------------------------------------------- */
export function baoDuLieuDoi(dsNhom) {
  if (!dsNhom || !dsNhom.length) return;
  const luc = gio();
  dem.ban++;
  for (const n of dsNhom) if (!dangCho.has(n)) dangCho.set(n, luc);
  // Gộp trong 60ms: một cú bấm đụng 3 nhóm thì vẫn CHỈ một lượt vẽ lại.
  if (hen) return;
  hen = setTimeout(() => { hen = null; xa(); }, 60);
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

    if (dangGoTrong(n)) { n.hoan = true; dem.hoan++; canhGac(); continue; }
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

/* Không khai gốc = luôn coi như đang hiện (chuông, kho danh mục nền). Khai
   gốc mà tìm không thấy phần tử = coi như ĐANG HIỆN, không phải đang ẩn: thà
   nạp thừa một lượt còn hơn để màn hình nói dối vì một cái id gõ sai. */
function hienThi(n) {
  const ds = layGoc(n);
  if (!ds) return true;
  return ds.some(el => el.offsetParent !== null || el.getClientRects().length > 0);
}

function dangGoTrong(n) {
  const o = oDangGo();
  if (!o) return false;
  const ds = layGoc(n);
  if (!ds) return false;
  return ds.some(x => x.contains && x.contains(o));
}

let henGac = null;
function thuLaiNguoiHoan() {
  for (const n of nguoiNghe) {
    if (!n.hoan) continue;
    if (dangGoTrong(n)) continue;   // vẫn đang gõ trong vùng đó → chờ tiếp
    dem.hoan--;
    chay(n);
  }
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
