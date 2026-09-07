/* ==========================================================================
   BÀN ĐO "MỞ RA XEM ĐƯỢC" — cả lớp của GY-0006 và GY-0007
   ---------------------------------------------------------------------------
   VÌ SAO CÓ TỆP NÀY. Hai góp ý của Sếp nói cùng một câu:
     · GY-0006 "Không dùng được chat trên máy tính — bị lỗi, không mở ra xem được"
     · GY-0007 "Không xem được mục kho tài liệu trên app điện thoại, không kéo xuống được"
   Đi đo thì ra gốc: tab Kho tài liệu chết ở LẦN VẼ ĐẦU, ở MỌI bề ngang và
   MỌI vai trò có quyền `khotailieu` — `let TL_NHOM_LUU_DUOC` khai ở dòng
   ~10334 trong khi `await khoiDongKhoTaiLieu()` chạy ở dòng ~7462, tức chạm
   biến trong vùng chết TDZ. Tab chỉ hiện đúng một dòng chữ "Không tải được
   kho tài liệu: Cannot access 'TL_NHOM_LUU_DUOC' before initialization" và
   KHÔNG có tài liệu nào — nên cũng chẳng có gì để kéo xuống.
   (Đo lại REV-0062 ⓪: tab HỒI PHỤC sau MỘT cú bấm nút lọc hoặc một phím gõ
   vào ô tìm, vì `veLoc()` nối dây nút lọc TRƯỚC dòng nổ. Bản đầu của tệp này
   khai "CHẾT HOÀN TOÀN" — nói quá, đã sửa. Mức nghiêm trọng không đổi: người
   mở ERP ra thấy màn trống + câu lỗi máy, không ai bảo họ bấm thử.)

   VÌ SAO CỔNG KHÓI KHÔNG BẮT ĐƯỢC. Lỗi bị một `catch` nuốt và IN RA MÀN HÌNH
   thành một dòng chữ tiếng Việt. Không `console.error`, không ngoại lệ chưa
   bắt, nút cửa ngõ vẫn bấm được → cổng khói XANH trong khi tính năng đã chết.
   Đây là cách hỏng THỨ SÁU, tiếp nối năm cách đã ghi ở `cong-khoi.mjs`:
     ⑥ Lỗi được bắt tử tế rồi in ra màn hình — không bàn đo nào ĐỌC màn hình.

   LỚP VẤN ĐỀ (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md Mục 2):
     "MÀN MỞ RA MÀ KHÔNG XEM ĐƯỢC NỘI DUNG."
   Sáu dạng, bàn đo này canh cả sáu:
     Ⓐ Màn hiện CÂU LỖI KỸ THUẬT thay cho dữ liệu ("Không tải được…",
       "Cannot access…", "undefined", "[object Object]", "NaN").
     Ⓑ Có `console.error` hoặc ngoại lệ chưa bắt trong lúc đi qua các tab.
     Ⓒ Nội dung cao hơn khung nhìn mà KHÔNG cuộn xuống được — kể cả khi có ai
       đó quên gỡ khoá cuộn (`body{overflow:hidden}`) sau khi đóng cửa sổ chat
       hay màn quét tài liệu.
     Ⓓ Trần chiều cao của thứ NỔI ĐÈ màn hình viết sai đơn vị (`vh` một mình,
       hoặc `dvh` một mình không có đường lui) — lưới đọc CSS.
     Ⓔ Ổ GIẢ CỦA CHÍNH BÀN ĐO lệch hợp đồng máy chủ, làm bàn đo đo một màn
       nhỏ hơn màn thật mà không ai biết.
     Ⓕ MÀN TRỐNG TRƠN — không câu lỗi nào, cũng chẳng có nội dung nào. Đây là
       dạng Ⓐ bỏ lọt (REV-0062 CHẶN-1), và là dạng khó nhất vì nó IM LẶNG.
   Kèm một lượt đi trọn đường CHAT (GY-0006): bấm "Chat ngay" ở Danh bạ → cửa
   sổ phải hiện TRONG khung nhìn, có ô nhập, vùng tin cuộn được, gõ và gửi ăn.

   QUÉT CẢ ERP, KHÔNG QUÉT MỘT CHỖ: mọi tab của BỐN vai trò × BA bề ngang.

   CHẠY:
     npm run do-mo-ra-xem-duoc            → đo cây làm việc hiện tại
     npm run do-mo-ra-xem-duoc-luoi       → CHỈ mục Ⓓ + Ⓔ (đọc tệp, xong ngay).
       Dùng khi sửa CSS hoặc sửa ổ giả — khỏi chờ 12 lượt Chrome.
     npm run do-mo-ra-xem-duoc-tu-kiem    → GÀI LẠI ĐÚNG LỖI GY-0007 (dời
       `let TL_NHOM_LUU_DUOC` về chỗ cũ, dưới đáy tệp). Bàn đo PHẢI ĐỎ.

     ⚠️ GÀI LẠI LỖI CŨ CỦA CHÍNH MÌNH THÌ CHƯA CHỨNG MINH ĐƯỢC MẤY — đó là tự
     chấm bài mình: bàn đo bắt được đúng thứ nó sinh ra để bắt. Bốn ca dưới
     đây gài BỐN CÁCH HỎNG KHÁC NHAU, và bản trước của bàn đo này MÙ ĐÚNG HAI
     CA ĐẦU (REV-0062 CHẶN-1):
     npm run do-mo-ra-xem-duoc-ca-A   → chết y hệt, `catch` in câu KHÁC   → Ⓕ
     npm run do-mo-ra-xem-duoc-ca-B   → không vẽ gì, im lặng hoàn toàn    → Ⓕ
     npm run do-mo-ra-xem-duoc-ca-C   → ngoại lệ chưa bắt                 → Ⓑ
     npm run do-mo-ra-xem-duoc-ca-D   → đóng chat quên gỡ khoá cuộn       → Ⓒ
     Mỗi ca khai sẵn phép chấm nào PHẢI đỏ; đỏ vì lý do KHÁC cũng tính là
     TRƯỢT, vì lần sau đổi chỗ một tí là mù lại mà không ai biết.
   MÃ THOÁT: 0 = xanh, 1 = đỏ. (Ca đối chứng: 0 = bắt được, 1 = bàn đo MÙ.)
   ========================================================================== */

import { dungMayGia, moChrome, TOI, TOI_ID, NGUOI, DANH_BA, dungTin } from './lib/ban-do-chrome.mjs';

const dso = process.argv;
const TU_KIEM = dso.includes('--tu-kiem');
const CHUP = dso.includes('--chup');
/* `--chi-luoi`: chỉ chạy mục Ⓓ (đọc CSS), bỏ 12 lượt Chrome. Mục Ⓓ là lưới
   đọc tệp, chạy trong một phần nghìn giây — bắt nó phải chờ 12 lượt Chrome
   xong mới xem được kết quả là lý do người ta thôi không chạy nó nữa. */
const CHI_LUOI = dso.includes('--chi-luoi');
const lay = (co, mac) => { const i = dso.indexOf(co); return i > 0 ? dso[i + 1] : mac; };
const THU_MUC_ANH = lay('--anh', '.anh-do-mo-ra-xem-duoc');

/* ==========================================================================
   MẪU HỎNG GIẢ — dời `let TL_NHOM_LUU_DUOC = []` trở lại đáy tệp
   ---------------------------------------------------------------------------
   Đây ĐÚNG là hình dạng lỗi đã sống trên `main`, không phải một lỗi bịa cho
   dễ bắt. Ba bước: gỡ dòng khai ở khối đầu tệp, rồi khai lại ngay trên
   `function nutSuaTaiLieu(` ở cuối tệp. Bước nào không khớp thì NÉM LỖI —
   bàn đo âm thầm chạy trên bản LÀNH rồi báo "đã tự kiểm" là tự lừa.
   ========================================================================== */
const NEO_KHAI_MOI = `let TL_NHOM_LUU_DUOC = [];\n\nconst taiDanhMucNen = ngheDuLieu(`;
const NEO_KHAI_MOI_THAY = `const taiDanhMucNen = ngheDuLieu(`;
const NEO_CHO_CU = `function nutSuaTaiLieu(t) {`;
const NEO_CHO_CU_THAY = `let TL_NHOM_LUU_DUOC = [];\n\nfunction nutSuaTaiLieu(t) {`;

function gaiLoiCu(maGoc) {
  /* Quy về LF trước khi khớp: git trên máy Windows này đổi LF ↔ CRLF tuỳ lúc
     checkout, nên chuỗi nhiều dòng viết trong bàn đo có lúc khớp có lúc không.
     Đúng cái bẫy `do-kho-tai-lieu.mjs` đã ghi. */
  const ma = maGoc.replace(/\r\n/g, '\n');
  if (!ma.includes(NEO_KHAI_MOI))
    throw new Error('Mẫu hỏng giả trượt: không thấy chỗ khai TL_NHOM_LUU_DUOC ở đầu tệp — sửa bàn đo.');
  if (!ma.includes(NEO_CHO_CU))
    throw new Error('Mẫu hỏng giả trượt: không thấy `function nutSuaTaiLieu(t) {` — sửa bàn đo.');
  return ma.replace(NEO_KHAI_MOI, NEO_KHAI_MOI_THAY).replace(NEO_CHO_CU, NEO_CHO_CU_THAY);
}
/* ==========================================================================
   BỐN CA ĐỐI CHỨNG A · B · C · D — GÀI BỐN CÁCH HỎNG KHÁC NHAU
   ---------------------------------------------------------------------------
   VÌ SAO CÓ (REV-0062 CHẶN-1). Bản trước chỉ tự kiểm bằng cách gài lại ĐÚNG
   lỗi cũ của chính mình — cùng biến, cùng câu lỗi. Đó là tự chấm bài mình:
   bàn đo bắt được thứ nó được viết ra để bắt, và mù đúng hai dạng khó nhất.
   Hồ Ly gài bốn kiểu, bàn đo cũ XANH ở A và B.

   Nay bốn ca nằm TRONG bàn đo, chạy lại được bằng một lệnh, và mỗi ca ghi rõ
   phép chấm nào PHẢI đỏ. Ca nào gài trượt (không khớp mẫu) thì NÉM LỖI —
   im lặng chạy trên bản lành rồi khai "đã đối chứng" là tự lừa.

   CHẠY:  npm run do-mo-ra-xem-duoc-ca-A   (và -B, -C, -D)
   ========================================================================== */
const CA = lay('--ca', null);

/** Đổi đúng một chuỗi, không thấy thì ném lỗi — không bao giờ gài âm thầm. */
function doi(ma, tim, thay, nhan) {
  if (!ma.includes(tim))
    throw new Error(`Ca ${CA} gài TRƯỢT ở "${nhan}": không thấy mẫu trong app.js — sửa bàn đo, đừng chạy tiếp.`);
  return ma.replace(tim, thay);
}

const CAC_CA = {
  /* A — CHẾT Y HỆT LỖI CŨ, NHƯNG `catch` IN MỘT CÂU KHÁC.
     Câu lỗi tử tế, đúng luật nhà, không có trong danh sách sáu câu của Ⓐ.
     Màn ra 0 thẻ. Ⓐ mù (câu lạ), Ⓑ sạch (đã catch), Ⓒ mù (rỗng thì "vừa một
     màn"). CHỈ Ⓕ bắt được — đây là ca chứng minh mục Ⓕ có lý do tồn tại. */
  A: {
    vi: 'chết TDZ y hệt lỗi cũ, nhưng `catch` in câu KHÁC — màn 0 thẻ, không câu nào trong danh sách Ⓐ',
    phaiDo: 'Ⓕ khotailieu — SỐ ĐÚNG',
    lam: s => doi(gaiLoiCu(s),
      `oTrong.textContent = 'Không tải được kho tài liệu: ' + e.message;`,
      `oTrong.textContent = 'Kho tài liệu đang bảo trì, Sếp quay lại sau giúp em.';`,
      'câu lỗi thay thế')
  },
  /* B — IM LẶNG HOÀN TOÀN. Nạp xong, không lỗi, không ngoại lệ, không một chữ
     nào trên màn — chỉ đơn giản là không vẽ gì. Đây là ca ĐỘC NHẤT: không có
     câu lỗi nào để mà bắt, nên mọi lưới đọc-chữ đều mù theo định nghĩa. */
  B: {
    vi: 'nạp xong, KHÔNG lỗi, chỉ không vẽ gì — màn trống trơn và im lặng tuyệt đối',
    phaiDo: 'Ⓕ khotailieu — SỐ ĐÚNG',
    lam: s => doi(
      doi(s, `oDanhSach.innerHTML = ds.map(veMot).join('');`,
             `oDanhSach.innerHTML = '';`, 'chỗ vẽ thẻ'),
      `oTrong.hidden = ds.length > 0;`,
      `oTrong.hidden = true;`, 'chỗ bật dòng "chưa có gì"')
  },
  /* C — NGOẠI LỆ KHÔNG AI BẮT. Ⓑ phải đỏ. */
  C: {
    vi: 'ném một ngoại lệ KHÔNG bị catch trong lúc dựng màn',
    phaiDo: 'Ⓑ không có ngoại lệ chưa bắt nào',
    lam: s => doi(s, `  function veLoc() {`,
      `  function veLoc() {\n    setTimeout(() => { throw new Error('ca C — nổ không ai bắt'); }, 50);`,
      'đầu hàm veLoc')
  },
  /* D — ĐÓNG CHAT MÀ QUÊN GỠ KHOÁ CUỘN. Cả ERP đứng im. Ⓒ phải đỏ. */
  D: {
    vi: 'đóng cửa sổ chat mà QUÊN gỡ khoá cuộn `cnb-mo` — cả trang nền đứng im',
    phaiDo: 'chat — đóng xong KHÔNG còn lớp khoá cuộn trên body',
    lam: s => doi(s, `    document.body.classList.remove('cnb-mo');`,
      `    /* ca D: cố ý quên gỡ */`, 'chỗ gỡ khoá cuộn')
  }
};

if (CA && !CAC_CA[CA]) { console.error(`Không có ca "${CA}". Chọn A, B, C hoặc D.`); process.exit(2); }

const suaTep = CA ? (s, ten) => (ten === 'assets/js/app.js' ? CAC_CA[CA].lam(s.replace(/\r\n/g, '\n')) : s)
  : TU_KIEM ? (s, ten) => (ten === 'assets/js/app.js' ? gaiLoiCu(s) : s) : null;

/* ==========================================================================
   BỐN VAI TRÒ THẬT — bộ tab lấy đúng từ `src/quyen.js`
   ---------------------------------------------------------------------------
   Đo một vai admin là bỏ sót đúng nhóm hay gặp lỗi nhất: người có ÍT quyền.
   ========================================================================== */
const VAI_TRO = [
  { ma: 'du_quyen', ten: 'Đủ quyền (admin)', admin: 1,
    tab: ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu', 'khovan', 'kinhdoanh',
          'ketoan', 'taisan', 'xepca', 'donhoan', 'khotailieu', 'quantri', 'dulieunen',
          'congviec', 'muctieu'],
    nhomXem: '*', nhomLuu: '*' },
  { ma: 'nguoi_dung', ten: 'Người dùng', admin: 0,
    tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'taisan', 'xepca', 'khotailieu', 'gopy'],
    nhomXem: ['noi_bo'], nhomLuu: [] },
  { ma: 'quan_ly_kho', ten: 'Quản lý kho', admin: 0,
    tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'nhansu',
          'dulieunen', 'taisan', 'xepca', 'khotailieu', 'gopy'],
    nhomXem: ['nhap_khau', 'attp', 'noi_bo'], nhomLuu: ['nhap_khau', 'attp'] },
  { ma: 'ke_toan_truong', ten: 'Kế toán trưởng', admin: 0,
    tab: ['tongquan', 'danhba', 'chat', 'congviec', 'lichsuviec', 'khovan', 'donhoan',
          'ketoan', 'taisan', 'xepca', 'khotailieu', 'gopy'],
    nhomXem: ['ke_toan', 'nhap_khau', 'ncc', 'phap_ly', 'noi_bo'],
    nhomLuu: ['ke_toan', 'nhap_khau', 'ncc'] }
];

const BE_NGANG = [
  { rong: 375, cao: 667, ten: 'iPhone SE' },
  { rong: 414, cao: 896, ten: 'iPhone Plus' },
  { rong: 1440, cao: 900, ten: 'Máy tính' }
];

/* ==========================================================================
   BẢY NHÓM GIẤY TỜ — CHÉP ĐÚNG `NHOM_TAI_LIEU` trong `src/quyen.js`
   ---------------------------------------------------------------------------
   Bản đầu của bàn đo này bịa bốn mã nhóm, và mã `luu` của vai "Quản lý kho"
   (`nhap_khau`·`attp`) không nằm trong danh sách bịa đó → màn quét mở ra
   KHÔNG có nhóm nào để chọn và bàn đo TREO CỨNG, không đỏ không xanh. Một bàn
   đo treo còn tệ hơn một bàn đo đỏ: người ta không đọc nó, người ta tắt nó.
   Dữ liệu giả phải cùng BỘ MÃ với sản phẩm, không được bịa.
   ========================================================================== */
const NHOM_TL = [
  { ma: 'phap_ly',   ten: 'Pháp lý doanh nghiệp' },
  { ma: 'attp',      ten: 'An toàn thực phẩm' },
  { ma: 'nhap_khau', ten: 'Nhập khẩu' },
  { ma: 'ke_toan',   ten: 'Kế toán – thuế' },
  { ma: 'nhan_su',   ten: 'Nhân sự' },
  { ma: 'ncc',       ten: 'Nhà cung cấp' },
  { ma: 'noi_bo',    ten: 'Quản trị nội bộ' }
];

/* Ba tài liệu — đúng bằng số tài liệu THẬT đang có trong kho (Sếp báo 3).
   Chọn nhóm sao cho MỌI vai trò đều nhìn thấy ít nhất một tờ (`noi_bo` ai
   cũng xem được) — không thì mấy vai ít quyền chỉ đo được một màn rỗng. */
const TAI_LIEU = [
  { id: 'TL-001', tieu_de: 'Giấy chứng nhận đăng ký doanh nghiệp Alpha Green Commerce',
    nhom: 'phap_ly', loai: 'Giấy phép', so_hieu: '0110938472', so_trang: 3,
    ngay_het_han: null, nhay_cam: 0, ocr_so_trang: 3, ocr_so_trang_neo: 3,
    chu_nguon: 'pdf_lop_chu', trich: 'Công ty TNHH Alpha Green Commerce, trụ sở Hà Nội' },
  { id: 'TL-002', tieu_de: 'Giấy tiếp nhận bản công bố hạt điều rang muối',
    nhom: 'attp', loai: 'Công bố sản phẩm', so_hieu: 'ATTP-2451', so_trang: 5,
    ngay_het_han: '2026-09-20', nhay_cam: 0, ocr_so_trang: 5, ocr_so_trang_neo: 2,
    chu_nguon: 'boc_chu', trich: 'Bản công bố phù hợp quy định an toàn thực phẩm' },
  { id: 'TL-003', tieu_de: 'Quy trình đóng gói hàng khô — bản ban hành 2026',
    nhom: 'noi_bo', loai: 'Quy trình', so_hieu: 'QT-KV-07', so_trang: 4,
    ngay_het_han: null, nhay_cam: 0, ocr_so_trang: 0, ocr_so_trang_neo: 0,
    chu_nguon: null, trich: null }
];
const loc = (ds, cho) => (cho === '*' ? ds : ds.filter(x => cho.includes(x.ma || x.nhom)));

/* ==========================================================================
   `dem_chu` — PHẢI ĐÚNG HỢP ĐỒNG MÁY CHỦ, KHÔNG ĐƯỢC BỊA KHOÁ
   ---------------------------------------------------------------------------
   BÀI HỌC 07/09/2026 (REV-0062 CAO-3). Bản đầu của ổ giả trả cứng
   `{ tra_cuu_duoc, co_chu_chua_neo, khong_chu }` — hai khoá sau BỊA. Máy chủ
   thật trả `{ tra_cuu_duoc, co_chu_chua_tra_duoc, chi_xem_duoc }`
   (`src/tai-lieu.js`). Hậu quả trong `app.js`:
       tong = tra_cuu_duoc + 0 + undefined  →  NaN
       oDem.hidden = !tong                  →  DẢI ĐẾM BỊ ẨN HOÀN TOÀN
   Tức là **đúng cái dải chữ Sếp chụp được thì bàn đo chưa bao giờ nhìn thấy**.
   Ổ giả lệch hợp đồng là bàn đo tự bịt mắt mình: nó đo một màn NHỎ HƠN màn
   thật, rồi khai là đã quét cả màn.

   Nay đếm bằng ĐÚNG ba điều kiện SQL của máy chủ (`src/tai-lieu.js`), tính
   trên đúng bộ tài liệu ĐÃ LỌC THEO QUYỀN của từng vai — y như máy chủ đếm
   trên `dieuKien` của chính lượt đó:
     · tra_cuu_duoc         = ocr_so_trang_neo > 0 AND nhay_cam = 0
     · co_chu_chua_tra_duoc = ocr_so_trang > 0 AND NOT(điều kiện trên)
     · chi_xem_duoc         = ocr_so_trang <= 0
   ========================================================================== */
const KHOA_DEM_CHU = ['tra_cuu_duoc', 'co_chu_chua_tra_duoc', 'chi_xem_duoc'];

function demChu(ds) {
  const traDuoc = t => t.ocr_so_trang_neo > 0 && !t.nhay_cam;
  return {
    tra_cuu_duoc: ds.filter(traDuoc).length,
    co_chu_chua_tra_duoc: ds.filter(t => t.ocr_so_trang > 0 && !traDuoc(t)).length,
    chi_xem_duoc: ds.filter(t => !(t.ocr_so_trang > 0)).length
  };
}

/* ==========================================================================
   Ổ CHAT CÓ TRÍ NHỚ — máy giả phải NHẬN được tin vừa gửi
   ---------------------------------------------------------------------------
   Ổ chung của thư viện trả một danh sách 120 tin CỐ ĐỊNH. Gửi tin xong,
   `app.js` gọi `?sau_id=120` để lấy tin mới — ổ cố định trả rỗng, nên phép đo
   "gửi có ăn không" luôn ĐỎ dù sản phẩm chạy đúng. Đó là bàn đo nói dối, và
   một bàn đo đỏ oan sẽ bị người ta tắt đi. Ổ này nhớ tin vừa gửi.
   ========================================================================== */
function oChatCoTriNho(voiMacDinh) {
  const themVao = [];   // tin do bàn đo gửi lên
  let idKe = 121;
  return { themVao, tiep(duong, u, traJson, req) {
    if (duong === '/api/chat/gui') {
      themVao.push({
        id: idKe, nguoi_gui_id: TOI_ID, nguoi_gui_ten: TOI.ho_ten, nguoi_gui_viet_tat: 'BN',
        nguoi_nhan_id: voiMacDinh, noi_dung: 'Thử gửi từ bàn đo',
        tep_ten: null, tep_loai: null, tep_kich_thuoc: null,
        tao_luc: '2026-09-07 09:00:00'
      });
      return traJson({ ok: true, id: idKe++ }) || true;
    }
    if (duong === '/api/chat/tin-nhan') {
      const sauId = parseInt(u.searchParams.get('sau_id'), 10) || 0;
      const truoc = parseInt(u.searchParams.get('truoc_id'), 10) || 0;
      const het = dungTin(u.searchParams.get('voi') || null).concat(themVao);
      if (sauId > 0) return traJson({ tin_nhan: het.filter(t => t.id > sauId), toi_id: TOI_ID }) || true;
      if (truoc > 0) {
        const cu = het.filter(t => t.id < truoc).slice(-50);
        return traJson({ tin_nhan: cu, con_nua: het.some(t => t.id < (cu[0]?.id ?? 0)), toi_id: TOI_ID }) || true;
      }
      const cuoi = het.slice(-50);
      return traJson({ tin_nhan: cuoi, con_nua: het.length > 50, toi_id: TOI_ID }) || true;
    }
    return false;
  } };
}

function oTraLoi(vai, chat) {
  return function apiRieng(duong, u, traJson, req) {
    if (chat.tiep(duong, u, traJson, req)) return true;
    if (duong === '/api/toi-la-ai') return traJson({
      ...TOI, id: TOI_ID, nhan_su_id: TOI_ID, quyen: vai.tab,
      vai_tro: vai.admin ? 'admin' : vai.ma,
      la_admin: vai.admin, them_nhan_su: vai.admin, thao_tac_van_hanh: vai.admin,
      phong_ban_quan_ly: [], shopee: { xem: vai.tab.includes('donhoan') ? 1 : 0 }
    }) || true;
    if (duong === '/api/tai-lieu') {
      /* Máy chủ thật lọc theo quyền XEM của từng vai (src/quyen.js
         `QUYEN_NHOM_TAI_LIEU`) — bàn đo lọc y hệt, không trả cả kho cho vai
         chỉ xem được một nhóm. */
      const nhom = loc(NHOM_TL, vai.nhomXem);
      const ds = loc(TAI_LIEU, vai.nhomXem);
      return traJson({
        ds, nhom, tong: ds.length, bi_cat: 0,
        nhom_luu_duoc: vai.nhomLuu === '*' ? NHOM_TL.map(n => n.ma) : vai.nhomLuu,
        dem_chu: demChu(ds)
      }) || true;
    }
    if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
    if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
    if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
    if (duong === '/api/muc-tieu/danh-sach')
      return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
    if (duong === '/api/dulieunen/tinh-trang') return traJson({ muc: [], viec_tiep_theo: [] }) || true;
    if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
    if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach_hang: [] }) || true;
    if (duong === '/api/kinh-doanh/don-hang-huy')
      return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
    if (duong === '/api/ke-toan/can-tra-soat') return traJson({ can_tra_soat: [] }) || true;
    if (duong === '/api/ke-toan/hang-hong') return traJson({ hang_hong: [] }) || true;
    if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: vai.admin } }) || true;
    if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
    if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
    if (duong === '/api/quan-tri/danh-sach') return traJson({ nhan_su: [], vai_tro: [] }) || true;
    if (duong === '/api/nhan-su/viec-can-lam')
      return traJson({ qua_han: [], sap_het: [], sinh_nhat_thang_sau: [] }) || true;
    return false;
  };
}

/* ==========================================================================
   CÂU LỖI KỸ THUẬT LỌT RA MÀN HÌNH
   ---------------------------------------------------------------------------
   Hai họ:
     · Chữ MÁY: `Cannot access … before initialization`, `is not defined`,
       `undefined`, `[object Object]`, `NaN`. Người dùng đọc không hiểu gì —
       và mỗi lần nó hiện là một tính năng đã chết.
     · Chữ NGƯỜI báo hỏng: "Không tải được", "Không mở được"… Câu này viết
       đúng luật nhà, nhưng ở bàn đo thì nó vẫn là bằng chứng màn KHÔNG xem
       được — vì mọi đường API trong bàn đo đều trả 200.
   ========================================================================== */
const MAU_LOI_MAY = [
  /Cannot access '[^']+' before initialization/,
  /is not defined/, /is not a function/, /\[object Object\]/,
  /\bundefined\b/, /\bNaN\b/, /TypeError/, /ReferenceError/
];
const MAU_LOI_NGUOI = [
  /Không tải được/, /Không mở được/, /Không đọc được/, /Không xem được/,
  /Không dựng được/, /Không nạp được/
];

/* ==========================================================================
   Ⓕ MỎ NEO SỐNG — "TAB NÀY CÓ NỘI DUNG KHÔNG", HỎI THẲNG, KHÔNG ĐI ĐOÁN CÂU
   ---------------------------------------------------------------------------
   VÌ SAO CÓ MỤC NÀY (REV-0062 CHẶN-1). Mục Ⓐ ở trên là một DANH SÁCH SÁU CÂU
   TIẾNG VIỆT CHÉP TAY. Hồ Ly gài bốn kiểu hỏng và bàn đo mù đúng hai kiểu khó
   nhất — cả hai đều để lại MỘT MÀN TRỐNG TRƠN:
     · kiểu A — vẫn chết y hệt, nhưng `catch` in câu KHÁC ("Kho tài liệu đang
       bảo trì, Sếp quay lại sau giúp em."). Câu thứ bảy thì Ⓐ chưa từng nghe.
     · kiểu B — nạp xong, KHÔNG lỗi, chỉ không vẽ gì. Im lặng hoàn toàn.
   Cả hai đi qua Ⓐ (không có câu nào trong danh sách) VÀ đi qua Ⓒ (rỗng thì
   lấy gì mà cuộn — "vừa một màn"). Bàn đo XANH, tính năng CHẾT.

   Nguyên văn Hồ Ly: "cách hỏng thứ SÁU mới đóng được một CÂU, chưa đóng được
   một CÁCH HỎNG."

   CHỮA BẰNG CÁCH ĐẢO CÂU HỎI. Đi liệt kê thêm câu lỗi là thua sẵn — câu thứ
   tám luôn lọt. Câu hỏi đúng không phải "màn có câu xấu nào không" mà là
   "TAB NÀY CÓ NỘI DUNG KHÔNG". Nên mỗi tab TỰ KHAI một MỎ NEO: một thứ cụ
   thể mà CHỈ CÓ nếu bộ vẽ của tab đã chạy xong. Không có mỏ neo → ĐỎ, bất kể
   màn im lặng hay in ra câu gì, bất kể câu đó dễ thương tới đâu.

   MỎ NEO PHẢI DO JS VẼ RA, KHÔNG ĐƯỢC NẰM SẴN TRONG `app.html`. Mỏ neo tĩnh
   là mỏ neo mù: tab chết thì nó vẫn nằm đó. Cả bảng dưới đây được chọn bằng
   cách ĐO — dựng `app.html` bằng `DOMParser` (không chạy script) rồi trừ đi
   khỏi DOM sống, giữ lại đúng thứ JS THÊM VÀO. Số đo ngày 07/09/2026, vai
   admin @1440px, ghi ở cột "đo được".

   HAI HẠNG MỎ NEO
     ① SỐ ĐÚNG — tab mà bàn đo có GIEO dữ liệu, nên biết chính xác phải ra bao
       nhiêu. Mạnh nhất: rỗng là ĐỎ, mà thừa/thiếu cũng ĐỎ.
     ② CÓ KHUNG — tab mà ổ giả trả mảng RỖNG. Ở đây rỗng là ĐÚNG, và đó chính
       là "lý do chính đáng" nói trong REV-0062; nhưng bộ vẽ vẫn phải chạy và
       vẫn phải dựng KHUNG (bảng, ô số, dòng "chưa có gì"). Khung không dựng
       = bộ vẽ chết = ĐỎ. Tức là bàn đo không bao giờ đòi dữ liệu mà nó không
       gieo — nó chỉ đòi đúng thứ nó có quyền đòi.
   ========================================================================== */
const MO_NEO = {
  /* ① SỐ ĐÚNG — bàn đo gieo dữ liệu nên biết con số phải ra */
  danhba: { chon: '.person', dung: () => DANH_BA.length,
    vi: 'mỗi người trong danh bạ một thẻ `.person` (đo: 0→5 do JS vẽ)' },
  khotailieu: { chon: '.tl-the', dung: vai => loc(TAI_LIEU, vai.nhomXem).length,
    vi: 'mỗi giấy tờ một thẻ `.tl-the` (đo: 0→3 do JS vẽ) — ĐÂY là mỏ neo bắt kiểu A và B' },

  /* ② CÓ KHUNG — ổ giả trả rỗng, nhưng bộ vẽ phải dựng được khung */
  /* `.stat` ở Trạm Mục Tiêu ĐỔI THEO VAI — đo 07/09/2026: admin ra 3 ô,
     ba vai còn lại (Người dùng · Quản lý kho · Kế toán trưởng) ra 2 ô, đều
     nhau ở cả 375/414/1440px. Bản đầu tôi đặt cứng ≥3 và ăn 9 ĐỎ OAN — chính
     bàn đo mới bắt được cái sai của tôi. Ngưỡng theo vai giữ được độ chặt cho
     admin thay vì hạ sàn xuống 2 cho tất cả. */
  tongquan: { chon: '.stat', toiThieu: vai => (vai.admin ? 3 : 2),
    vi: 'ô số Trạm Mục Tiêu (đo: 0→3 admin / 0→2 vai hạn chế, do JS vẽ)' },
  khovan: { chon: '.stat', toiThieu: 4,
    vi: 'ô số tồn kho (đo: 0→4 do JS vẽ)' },
  lichsuviec: { chon: '.luoi-bang', toiThieu: 1,
    vi: 'khung bảng lịch sử (đo: 0→1 — `.luoi-bang` KHÔNG có trong app.html, chỉ JS thêm)' },
  gopy: { chon: '.luoi-bang', toiThieu: 1, vi: 'khung bảng góp ý (đo: 0→1)' },
  kinhdoanh: { chon: '.luoi-bang', toiThieu: 1, vi: 'khung bảng kinh doanh (đo: 0→7)' },
  nhansu: { chon: '.luoi-bang', toiThieu: 1, vi: 'khung bảng nhân sự (đo: 0→2)' },
  ketoan: { chon: '.luoi-bang', toiThieu: 1, vi: 'khung bảng kế toán (đo: 0→2)' },
  taisan: { chon: '.luoi-bang', toiThieu: 1, vi: 'khung bảng tài sản (đo: 0→1)' },
  quantri: { chon: '.luoi-bang', toiThieu: 1, vi: 'khung bảng quản trị (đo: 0→1)' },
  xepca: { chon: '.het-cuon', toiThieu: 1,
    vi: 'khung bảng xếp ca (đo: 0→2; tab này JS không thêm `.luoi-bang` nên neo vào `.het-cuon`)' },

  /* ③ ĐỔI CHỮ — tab mà JS KHÔNG thêm một thẻ nào, chỉ ghi đè chữ có sẵn.
     Đo được: `donhoan` sống mà số thẻ y hệt khung tĩnh, nên đếm thẻ là mù ở
     đây. Neo vào việc chữ chờ trong `app.html` PHẢI bị thay. */
  donhoan: { doiChu: [
      { chon: '#dh-trangthai', chuTinh: 'Đang kiểm tra…' },
      { chon: '#dh-tk-trangthai', chuTinh: 'Đang kiểm tra…' }
    ], vi: 'chữ trạng thái kết nối sàn phải được ghi đè (app.html để sẵn "Đang kiểm tra…")' }
};

function batLoiTrongChu(chu) {
  const ra = [];
  for (const m of MAU_LOI_MAY) { const k = chu.match(m); if (k) ra.push('chữ máy: ' + k[0]); }
  for (const m of MAU_LOI_NGUOI) {
    const i = chu.search(m);
    if (i >= 0) ra.push('báo hỏng: ' + chu.slice(i, i + 90).replace(/\s+/g, ' '));
  }
  return ra;
}

/* ---- Sổ chấm ------------------------------------------------------------ */
let soHong = 0, soCham = 0;
let LUOT = '';                      // "vai trò @ bề ngang" của lượt đang chạy
let DANG_MO = null;                 // { b, may } của lượt đang chạy — để dọn khi TREO
const HONG = [];
function cham(ok, nhan, them = '') {
  soCham++;
  if (!ok) { soHong++; HONG.push(`[${LUOT}] ` + nhan + (them ? ' — ' + them : '')); }
  console.log(`  ${ok ? 'ĐẠT  ' : '✗ HỎNG'}  ${nhan}${them ? '   ' + them : ''}`);
  return ok;
}
const muc = (s) => console.log(`\n─── ${s} ───`);

/* ==========================================================================
   MỘT LƯỢT: một vai trò × một bề ngang
   ========================================================================== */
async function motLuot(vai, bn) {
  const chat = oChatCoTriNho('NS-DUY');
  const may = await dungMayGia({ apiRieng: oTraLoi(vai, chat), suaTep });
  const b = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: bn.rong, cao: bn.cao });
  /* Ghi lại để đồng hồ chết ở cuối tệp còn dọn được Chrome khi lượt TREO —
     `finally` dưới đây không chạy nổi lúc đó vì lượt vẫn đang chờ. */
  DANG_MO = { b, may };
  LUOT = `${vai.ten} @ ${bn.rong}px`;
  muc(`${LUOT}  (${bn.ten})`);

  try {
    const soTab = await b.chay(`document.querySelectorAll('[data-tab]').length`);
    if (!cham(soTab > 0, 'dựng được thanh bên', `${soTab} tab`)) return;

    const dsTab = await b.chay(`[...document.querySelectorAll('[data-tab]')].map(x => x.dataset.tab)`);

    /* ---- Ⓐ + Ⓒ: đi qua TỪNG tab ---------------------------------------- */
    for (const tab of dsTab) {
      await b.chay(`document.querySelector('[data-tab="${tab}"]').click(); 1`);
      await b.doi(600);
      const neo = MO_NEO[tab] || null;
      const kq = await b.chay(`(async () => {
        const v = document.getElementById('v-${tab}');
        const se = document.scrollingElement;
        const chu = v ? (v.innerText || '') : '';
        /* Ⓕ mỏ neo: đếm thứ CHỈ CÓ khi bộ vẽ của tab đã chạy xong. */
        const neo = ${JSON.stringify(neo)};
        let soNeo = null, chuNeo = null;
        if (v && neo && neo.chon) soNeo = v.querySelectorAll(neo.chon).length;
        if (v && neo && neo.doiChu) chuNeo = neo.doiChu.map(d => {
          const e = v.querySelector(d.chon);
          return { chon: d.chon, co: !!e, chu: e ? (e.textContent || '').trim() : null, chuTinh: d.chuTinh };
        });
        // Cuộn thật: đẩy xuống đáy rồi đọc lại scrollTop.
        const canCuon = se.scrollHeight - se.clientHeight;
        let cuonDuoc = true, cuonToi = 0;
        if (canCuon > 8) {
          se.scrollTop = 0;
          window.scrollTo(0, 99999);
          await new Promise(r => setTimeout(r, 200));
          cuonToi = se.scrollTop;
          cuonDuoc = cuonToi > 0;
          window.scrollTo(0, 0);
        }
        return {
          chu, canCuon, cuonDuoc, cuonToi, soNeo, chuNeo,
          bodyOy: getComputedStyle(document.body).overflowY,
          htmlOy: getComputedStyle(document.documentElement).overflowY,
          coChu: chu.trim().length
        };
      })()`);

      const loi = batLoiTrongChu(kq.chu);
      cham(loi.length === 0, `Ⓐ ${tab} — không có câu lỗi trên màn`,
        loi.length ? loi.join(' | ') : `${kq.coChu} ký tự`);

      /* ---- Ⓕ MỎ NEO SỐNG — "tab này CÓ NỘI DUNG không" ------------------
         Đặt NGAY SAU Ⓐ để đọc nhật ký thấy được cặp đôi: Ⓐ nói "không có câu
         xấu", Ⓕ nói "mà cũng chẳng có gì cả". Một mình Ⓐ thì màn trống trơn
         là XANH — đúng lỗ hổng REV-0062 CHẶN-1. */
      if (!neo) {
        cham(false, `Ⓕ ${tab} — có khai mỏ neo sống`,
          `tab này CHƯA khai mỏ neo trong bảng MO_NEO — thêm tab mới thì phải khai, ` +
          `không thì nó đi qua bàn đo mà không ai chứng minh nó có nội dung`);
      } else if (neo.doiChu) {
        for (const d of kq.chuNeo) {
          cham(d.co && d.chu !== d.chuTinh && d.chu.length > 0,
            `Ⓕ ${tab} — \`${d.chon}\` đã được bộ vẽ ghi đè`,
            !d.co ? 'KHÔNG THẤY THẺ — sửa mỏ neo'
              : d.chu === d.chuTinh
                ? `VẪN LÀ CHỮ CHỜ TĨNH "${d.chuTinh}" → bộ vẽ KHÔNG chạy tới nơi`
                : `"${d.chu.slice(0, 60)}"`);
        }
      } else if (neo.dung) {
        const phai = neo.dung(vai);
        cham(kq.soNeo === phai, `Ⓕ ${tab} — SỐ ĐÚNG: \`${neo.chon}\` phải ra ${phai}`,
          kq.soNeo === phai ? `${kq.soNeo} — ${neo.vi}`
            : `ra ${kq.soNeo} — bàn đo GIEO ${phai}, tab vẽ ra ${kq.soNeo}. ` +
              (kq.soNeo === 0
                ? 'MÀN TRỐNG mà ổ giả CÓ trả dữ liệu → bộ vẽ chết, dù màn im lặng hay in ra câu gì.'
                : 'số không khớp dữ liệu đã gieo.'));
      } else {
        const san = typeof neo.toiThieu === 'function' ? neo.toiThieu(vai) : neo.toiThieu;
        cham(kq.soNeo >= san, `Ⓕ ${tab} — CÓ KHUNG: \`${neo.chon}\` ≥ ${san}`,
          kq.soNeo >= san ? `${kq.soNeo} — ${neo.vi}`
            : `ra ${kq.soNeo} — ổ giả trả RỖNG nên không đòi dữ liệu, nhưng KHUNG cũng không dựng ` +
              `→ bộ vẽ của tab không chạy. (${neo.vi})`);
      }

      cham(kq.cuonDuoc, `Ⓒ ${tab} — cuộn xuống được`,
        kq.canCuon > 8 ? `cần cuộn ${kq.canCuon}px, cuộn tới ${kq.cuonToi}px` : 'vừa một màn');
    }

    /* ---- GY-0006: đi trọn đường CHAT ------------------------------------ */
    if (dsTab.includes('danhba')) {
      await b.chay(`document.querySelector('[data-tab="danhba"]').click(); 1`);
      await b.doi(700);
      const moChat = await b.chay(`(() => {
        const v = document.getElementById('v-danhba');
        const nut = [...v.querySelectorAll('button, a')].find(x => /chat ngay/i.test(x.textContent));
        if (!nut) return 'khong-thay-nut';
        nut.click(); return 'ok';
      })()`);
      cham(moChat === 'ok', `chat — có nút "Chat ngay" ở Danh bạ`, moChat);
      if (moChat === 'ok') {
        await b.doi(1400);
        const cs = await b.chay(`(() => {
          const p = document.querySelector('.cnb-popup');
          if (!p || p.hidden) return { mo: false };
          const r = p.getBoundingClientRect();
          const khung = [...p.querySelectorAll('*')].find(e => e.scrollHeight - e.clientHeight > 8);
          return {
            mo: true,
            trongMan: r.top < window.innerHeight - 40 && r.bottom > 40 &&
                      r.left < window.innerWidth - 40 && r.right > 40,
            w: Math.round(r.width), h: Math.round(r.height),
            top: Math.round(r.top), bottom: Math.round(r.bottom),
            soTin: p.querySelectorAll('.chat-tin').length,
            coONhap: !!p.querySelector('textarea, input[type=text]'),
            vungCuon: khung ? khung.scrollHeight - khung.clientHeight : 0,
            chu: p.innerText || ''
          };
        })()`);
        cham(cs.mo, 'chat — cửa sổ MỞ RA sau khi bấm');
        if (cs.mo) {
          cham(cs.trongMan, 'chat — cửa sổ nằm trong khung nhìn',
            `${cs.w}×${cs.h} tại y ${cs.top}…${cs.bottom}, màn cao ${bn.cao}`);
          cham(cs.soTin > 0, 'chat — có tin nhắn hiện ra', `${cs.soTin} tin`);
          cham(cs.coONhap, 'chat — có ô gõ tin');
          cham(cs.vungCuon > 0, 'chat — vùng đọc tin cuộn ngược được', `${cs.vungCuon}px`);
          const loiChat = batLoiTrongChu(cs.chu);
          cham(loiChat.length === 0, 'chat — không có câu lỗi trong cửa sổ', loiChat.join(' | '));

          /* Gõ + gửi: bấm mà không có phản ứng nhìn thấy được là TRƯỢT. */
          const gui = await b.chay(`(async () => {
            const p = document.querySelector('.cnb-popup');
            const o = p.querySelector('textarea, input[type=text]');
            const truoc = p.querySelectorAll('.chat-tin').length;
            o.focus(); o.value = 'Thử gửi từ bàn đo';
            o.dispatchEvent(new Event('input', { bubbles: true }));
            const nut = [...p.querySelectorAll('button')].find(x => /^gửi$/i.test(x.textContent.trim()));
            if (!nut) return { loi: 'khong-thay-nut-gui' };
            nut.click();
            await new Promise(r => setTimeout(r, 900));
            return { truoc, sau: p.querySelectorAll('.chat-tin').length,
                     oConChu: o.value.length };
          })()`);
          cham(!gui.loi && gui.sau > gui.truoc, 'chat — gửi tin thì có tin mới hiện lên',
            gui.loi || `${gui.truoc} → ${gui.sau} tin`);
          cham(!gui.loi && gui.oConChu === 0, 'chat — gửi xong ô gõ được dọn sạch',
            gui.loi || `còn ${gui.oConChu} ký tự`);
        }

        if (CHUP) await b.chup(`${process.cwd()}/${THU_MUC_ANH}/${vai.ma}-${bn.rong}-chat.png`);

        /* ---- Ⓒ: ĐÓNG cửa sổ rồi kiểm khoá cuộn có được gỡ không --------- */
        await b.chay(`(document.querySelector('.cnb-dong') || {click(){}}).click(); 1`);
        await b.doi(500);
        const sauDong = await b.chay(`(async () => {
          const se = document.scrollingElement;
          const canCuon = se.scrollHeight - se.clientHeight;
          se.scrollTop = 0; window.scrollTo(0, 99999);
          await new Promise(r => setTimeout(r, 200));
          const toi = se.scrollTop;
          window.scrollTo(0, 0);
          return {
            conLop: document.body.classList.contains('cnb-mo') ||
                    document.body.classList.contains('tlq-khoa-cuon'),
            bodyOy: getComputedStyle(document.body).overflowY,
            canCuon, toi
          };
        })()`);
        cham(!sauDong.conLop, 'chat — đóng xong KHÔNG còn lớp khoá cuộn trên body',
          `body.overflow-y = ${sauDong.bodyOy}`);
        cham(sauDong.canCuon <= 8 || sauDong.toi > 0,
          'chat — đóng xong trang nền cuộn lại được',
          `cần ${sauDong.canCuon}px, cuộn tới ${sauDong.toi}px`);
      }

      /* ---- GY-0006: ĐƯỜNG VÀO THỨ HAI — nút chat nổi góc màn ------------
         "Không dùng được chat trên máy tính" không nói rõ bấm từ đâu. Đường
         "Chat ngay" ở Danh bạ đã đo ở trên; đây là đường người ta dùng nhiều
         hơn hẳn: cái nút tròn góc dưới phải, mở ra DANH SÁCH HỘI THOẠI rồi
         mới vào một luồng. Hai đường, hai lượt đo — đo một đường rồi khai
         "chat chạy tốt" là khai thừa. */
      const moNoi = await b.chay(`(() => {
        const n = document.querySelector('.cnb-nut');
        if (!n || getComputedStyle(n).display === 'none') return 'khong-thay-nut-noi';
        n.click(); return 'ok';
      })()`);
      cham(moNoi === 'ok', 'chat — có nút chat nổi ở góc màn', moNoi);
      if (moNoi === 'ok') {
        await b.doi(1300);
        const ds = await b.chay(`(() => {
          const p = document.querySelector('.cnb-popup');
          if (!p || p.hidden) return { mo: false };
          const o = p.querySelector('#cnbDs');
          const muc = o ? [...o.querySelectorAll('.cnb-ds-muc')] : [];
          return { mo: true, soMuc: muc.length,
                   tenDau: muc[0] ? muc[0].innerText.trim().slice(0, 40) : '',
                   chu: p.innerText || '' };
        })()`);
        cham(ds.mo, 'chat — nút nổi MỞ được cửa sổ');
        if (ds.mo) {
          cham(ds.soMuc > 0, 'chat — danh sách hội thoại có dòng để bấm', `${ds.soMuc} dòng`);
          const loiDs = batLoiTrongChu(ds.chu);
          cham(loiDs.length === 0, 'chat — danh sách hội thoại không có câu lỗi', loiDs.join(' | '));
          if (ds.soMuc > 0) {
            await b.chay(`document.querySelector('.cnb-popup #cnbDs .cnb-ds-muc').click(); 1`);
            await b.doi(1300);
            const luong = await b.chay(`(() => {
              const p = document.querySelector('.cnb-popup');
              return { soTin: p.querySelectorAll('.chat-tin').length,
                       coONhap: !!p.querySelector('textarea, input[type=text]') };
            })()`);
            cham(luong.soTin > 0, 'chat — bấm một hội thoại thì vào đọc được tin',
              `${luong.soTin} tin`);
            cham(luong.coONhap, 'chat — vào luồng có ô gõ tin');
          }
        }
        await b.chay(`(document.querySelector('.cnb-dong') || {click(){}}).click(); 1`);
        await b.doi(400);
      }
    }

    /* ---- Ⓒ (tiếp): MÀN QUÉT TÀI LIỆU — khoá cuộn thứ HAI của ERP -------
       `.tlq-khoa-cuon` đặt `overflow:hidden` lên `body`. Quên gỡ nó là CẢ ERP
       đứng im, không riêng kho tài liệu — đúng câu "không kéo xuống được". */
    if (dsTab.includes('khotailieu')) {
      await b.chay(`document.querySelector('[data-tab="khotailieu"]').click(); 1`);
      await b.doi(600);

      /* ---- DẢI ĐẾM `dem_chu` — CHÍNH LÀ DẢI SẾP CHỤP ĐƯỢC ----------------
         REV-0062 CAO-3: ổ giả cũ trả sai khoá → `NaN` → `oDem.hidden` bật →
         bàn đo chưa BAO GIỜ nhìn thấy dải này, dù nó nằm ngay giữa màn Sếp
         chụp. Sửa ổ giả thôi chưa đủ: không có phép chấm thì lần sau khoá
         lệch lại, dải lại ẩn, và bàn đo lại im. */
      const dem = demChu(loc(TAI_LIEU, vai.nhomXem));
      const tongDem = dem.tra_cuu_duoc + dem.co_chu_chua_tra_duoc + dem.chi_xem_duoc;
      const oDem = await b.chay(`(() => {
        const o = document.querySelector('#tl-dem-chu');
        if (!o) return { co: false };
        return { co: true, an: !!o.hidden, chu: (o.textContent || '').trim().replace(/\\s+/g, ' ') };
      })()`);
      cham(oDem.co, 'dải đếm — có thẻ `#tl-dem-chu` trên màn');
      if (oDem.co) {
        cham(!oDem.an, 'dải đếm — HIỆN RA (không bị ẩn vì NaN)',
          oDem.an ? `bị ẩn dù ổ giả trả tổng ${tongDem} — khoá \`dem_chu\` lệch hợp đồng?`
                  : `"${oDem.chu.slice(0, 80)}"`);
        cham(!/NaN|undefined/.test(oDem.chu), 'dải đếm — không in NaN/undefined ra màn', oDem.chu.slice(0, 80));
        cham(oDem.chu.includes(String(dem.tra_cuu_duoc)) && oDem.chu.includes(String(dem.chi_xem_duoc)),
          `dải đếm — khoe đúng số ổ giả gieo (${dem.tra_cuu_duoc} tra được · ${dem.chi_xem_duoc} chỉ xem được)`,
          oDem.chu.slice(0, 100));
      }

      const coNutQuet = await b.chay(`(() => { const n = document.querySelector('#tl-nut-quet'); return !!n && !n.hidden; })()`);
      if (coNutQuet) {
        await b.chay(`document.querySelector('#tl-nut-quet').click(); 1`);
        await b.doi(1000);
        const dangMo = await b.chay(`(() => {
          const nen = document.querySelector('.tlq-nen');
          if (!nen) return { mo: false };
          const tam = nen.querySelector('.tlq-tam');
          const x = nen.querySelector('.tlq-x');
          const rt = tam.getBoundingClientRect(), rx = x ? x.getBoundingClientRect() : null;
          return {
            mo: true,
            khoa: document.body.classList.contains('tlq-khoa-cuon'),
            tamVuaMan: rt.top >= -1 && rt.bottom <= window.innerHeight + 1,
            tamCao: Math.round(rt.height), manCao: window.innerHeight,
            nutXTrongMan: !!rx && rx.top >= 0 && rx.bottom <= window.innerHeight,
            tuCuon: tam.scrollHeight - tam.clientHeight
          };
        })()`);
        cham(dangMo.mo, 'màn quét — mở ra được');
        if (dangMo.mo) {
          cham(dangMo.khoa, 'màn quét — có khoá cuộn trang nền lúc đang mở');
          cham(dangMo.tamVuaMan, 'màn quét — tấm quét nằm gọn trong khung nhìn',
            `tấm cao ${dangMo.tamCao}px / màn ${dangMo.manCao}px`);
          cham(dangMo.nutXTrongMan, 'màn quét — nút ✕ đóng nằm trong khung nhìn');
          await b.chay(`(document.querySelector('.tlq-x') || {click(){}}).click(); 1`);
          await b.doi(600);
          const sauQuet = await b.chay(`(async () => {
            const se = document.scrollingElement;
            const canCuon = se.scrollHeight - se.clientHeight;
            se.scrollTop = 0; window.scrollTo(0, 99999);
            await new Promise(r => setTimeout(r, 200));
            const toi = se.scrollTop; window.scrollTo(0, 0);
            return { conNen: !!document.querySelector('.tlq-nen'),
                     conKhoa: document.body.classList.contains('tlq-khoa-cuon'),
                     bodyOy: getComputedStyle(document.body).overflowY, canCuon, toi };
          })()`);
          cham(!sauQuet.conNen, 'màn quét — bấm ✕ thì đóng hẳn');
          cham(!sauQuet.conKhoa, 'màn quét — đóng xong GỠ khoá cuộn trang nền',
            `body.overflow-y = ${sauQuet.bodyOy}`);
          cham(sauQuet.canCuon <= 8 || sauQuet.toi > 0,
            'màn quét — đóng xong kho tài liệu cuộn lại được',
            `cần ${sauQuet.canCuon}px, cuộn tới ${sauQuet.toi}px`);
        }
      }
    }

    /* ---- Ⓑ: console sạch sau cả lượt ------------------------------------ */
    cham(b.loiConsole.length === 0, 'Ⓑ không có console.error nào trong cả lượt',
      b.loiConsole.slice(0, 3).join(' | '));
    cham(b.ngoaiLe.length === 0, 'Ⓑ không có ngoại lệ chưa bắt nào',
      b.ngoaiLe.slice(0, 3).join(' | '));

    if (CHUP) {
      await b.chay(`(document.querySelector('[data-tab="khotailieu"]')||{click(){}}).click(); 1`);
      await b.doi(600);
      await b.chup(`${process.cwd()}/${THU_MUC_ANH}/${vai.ma}-${bn.rong}-khotailieu.png`);
    }
  } finally {
    b.dong(); may.dong(); DANG_MO = null;
  }
}

/* ==========================================================================
   Ⓓ TRẦN CHIỀU CAO ĐO BẰNG `vh` TRÊN THỨ NỔI ĐÈ MÀN HÌNH
   ---------------------------------------------------------------------------
   Đây là phần KHÔNG đo được bằng Chrome không đầu, và phải nói thẳng ra:
   Chrome chạy không đầu KHÔNG có thanh địa chỉ co giãn, nên ở đó `100vh` luôn
   bằng `innerHeight` và cái bẫy này TÀNG HÌNH với mọi phép đo trên máy này.
   Trên điện thoại thật thì `vh` tính theo màn hình lúc thanh địa chỉ CHƯA
   hiện — cao hơn vùng nhìn thấy ~60-90px. Một tấm nổi cao `92vh` nằm trong
   khung `position:fixed` (chỉ cao bằng vùng nhìn thấy) sẽ THÒI ra ngoài, và
   phần thòi ra thì `overflow:auto` của chính nó không kéo tới được: mất nút
   đóng, mất hàng nút Lưu/Huỷ. ERP đã trả giá đúng chuyện này một lần và ghi
   thành chú thích ở `.cnb-popup` (29/08/2026) — bản vá 100dvh.

   Vì không đo được bằng mắt trình duyệt, canh bằng LUẬT trên chính tệp CSS:
   thứ nào có `position: fixed` (hoặc nằm trong nền `fixed`) mà đặt trần chiều
   cao bằng `vh` thì ĐỎ. Đây là lưới chống tái phát, không phải phép đo giả
   vờ. Danh sách chỗ nổi được liệt kê tay và có kèm lý do — thêm chỗ nổi mới
   thì thêm vào đây.

   SỬA 07/09/2026 (REV-0062 CHẶN-2) — LUẬT CŨ THIẾU MỘT NỬA.
   Bản đầu của lưới này chỉ đòi "không được có `vh`", nên nó chấm XANH cho một
   dòng `dvh` ĐỨNG MỘT MÌNH. Mà `dvh` một mình là cái bẫy NẶNG HƠN: `dvh` chỉ
   có từ Chrome 108 / Safari 15.4 / Firefox 101 (cuối 2022), và trình duyệt cũ
   hơn vứt CẢ DÒNG luật có đơn vị lạ — mất sạch trần chiều cao, chứ không lùi
   về `vh`. Đo thật bằng `getComputedStyle`, dùng đơn vị bịa `qvh` đóng vai máy
   cũ: `calc(100qvh - 40px)` một mình → `none`; `92qvh` một mình → `none`; cặp
   `calc(100vh - 40px)` rồi `calc(100qvh - 40px)` → `772px` (giữ được trần);
   cặp `100vh` rồi `50dvh` trên Chrome mới → `406px`, tức dòng SAU vẫn thắng.
   → Luật ĐÚNG là CẶP: `vh` trước làm nền, `dvh` sau đè lên. Lưới nay chấm ba
     trạng thái, không phải hai:
       · `vh` một mình              → ĐỎ (bẫy cũ: cao hơn vùng nhìn thấy)
       · `dvh` một mình             → ĐỎ (bẫy mới: máy cũ mất sạch trần)
       · CẶP `vh` rồi `dvh`         → ĐẠT
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOC_REPO = resolve(decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));

/** Bộ chọn của những thứ NỔI ĐÈ màn hình (nằm trong một nền `position:fixed`).
 *  Trần chiều cao của chúng phải đo bằng `dvh`, không được đo bằng `vh`. */
const THU_NOI = [
  { chon: '.modal', vi: 'mọi hộp thoại trong ERP' },
  { chon: '.tlq-tam', vi: 'tấm quét giấy tờ (Kho tài liệu)' },
  { chon: '.tb-panel', vi: 'bảng thông báo dưới chuông' },
  { chon: '.cnb-popup', vi: 'cửa sổ chat' }
];

/* `(?<![a-z])vh\b` chứ KHÔNG phải `\bvh\b`: trong `100vh` thì trước `vh` là
   chữ số, mà chữ số cũng là ký tự từ nên KHÔNG có ranh giới `\b` ở đó — bản
   đầu tiên của bàn đo này viết `\bvh\b` và bỏ lọt SẠCH cả BỐN chỗ hỏng thật
   trên `main` (`.modal` · `.tlq-tam` · `.tb-panel` · `.cnb-popup`). Đúng kiểu
   phép đo im lặng nói dối. Lookbehind chặn chữ cái đứng trước cũng là cách
   tách `vh` khỏi `dvh`/`svh`/`lvh`. */
const LA_VH = /(?<![a-z])vh\b/;
const LA_DVH = /(?<![a-z])dvh\b/;

/* ==========================================================================
   Ⓔ HỢP ĐỒNG Ổ GIẢ — KHOÁ BÀN ĐO TRẢ PHẢI ĐÚNG KHOÁ HAI ĐẦU THẬT ĐANG DÙNG
   ---------------------------------------------------------------------------
   Sinh ra từ REV-0062 CAO-3: ổ giả bịa hai khoá `dem_chu`, `app.js` đọc ra
   `undefined`, cộng thành `NaN`, dải đếm bị ẩn — và bàn đo vẫn XANH suốt vì
   nó không hề biết mình đang đo một màn thiếu mất một dải.

   Đây là cách hỏng riêng của BÀN ĐO, không phải của sản phẩm, và nó độc ở chỗ
   im lặng: ổ giả lệch hợp đồng thì mọi phép chấm phía sau đều đo nhầm màn.
   Chốt bằng cách đối chiếu BA ĐẦU:
     ① khoá ổ giả trả   ② khoá `src/tai-lieu.js` (máy chủ thật) trả
     ③ khoá `app.js` thật sự ĐỌC
   Lệch bất kỳ hướng nào cũng ĐỎ — kể cả ổ giả trả THỪA một khoá mà `app.js`
   không đọc, vì khoá thừa là dấu hiệu hợp đồng đã trôi ở đâu đó.
   ========================================================================== */
function doHopDongODa() {
  muc('Ⓔ hợp đồng ổ giả — khoá `dem_chu` phải khớp máy chủ thật và `app.js`');
  LUOT = 'hợp đồng ổ giả';
  const doc = f => readFileSync(GOC_REPO + '/' + f, 'utf8').replace(/\r\n/g, '\n');
  const app = doc('public/assets/js/app.js');
  const may = doc('src/tai-lieu.js');

  /* Khoá `app.js` ĐỌC: mọi `d.<khoá>` quanh khối vẽ dải đếm. Lấy hẹp quanh
     `#tl-dem-chu` để không quét nhầm cả tệp. */
  const i = app.indexOf("$('#tl-dem-chu')");
  const khuc = i >= 0 ? app.slice(i, i + 2000) : '';
  if (!khuc) { cham(false, 'Ⓔ tìm được khối vẽ dải đếm trong app.js', 'không thấy `#tl-dem-chu` — sửa bàn đo'); return; }
  const docBoi = [...new Set([...khuc.matchAll(/\bd\.([a-z_]+)/g)].map(m => m[1]))].sort();

  /* Khoá máy chủ THẬT trả: đọc thẳng khối dựng `dem` trong `src/tai-lieu.js`. */
  const j = may.indexOf('dem = {');
  const khucMay = j >= 0 ? may.slice(j, may.indexOf('};', j)) : '';
  const mayTra = [...new Set([...khucMay.matchAll(/^\s*([a-z_]+):/gm)].map(m => m[1]))].sort();

  const oGiaTra = [...KHOA_DEM_CHU].sort();
  const nhu = a => a.join(', ') || '(rỗng)';

  cham(mayTra.length > 0, 'Ⓔ đọc được khoá máy chủ thật trả', nhu(mayTra));
  cham(docBoi.length > 0, 'Ⓔ đọc được khoá app.js dùng', nhu(docBoi));
  cham(JSON.stringify(oGiaTra) === JSON.stringify(mayTra),
    'Ⓔ khoá ổ giả == khoá máy chủ thật',
    `ổ giả [${nhu(oGiaTra)}] · máy chủ [${nhu(mayTra)}]`);

  const thua = oGiaTra.filter(k => !docBoi.includes(k));
  const thieu = docBoi.filter(k => !oGiaTra.includes(k));
  cham(thieu.length === 0, 'Ⓔ app.js không đọc phải khoá ổ giả THIẾU',
    thieu.length ? `app.js đọc \`d.${thieu.join('`, `d.')}\` mà ổ giả không trả → undefined → NaN → dải đếm bị ẩn`
                 : `app.js đọc ${nhu(docBoi)}`);
  cham(thua.length === 0, 'Ⓔ ổ giả không trả khoá THỪA mà app.js chẳng đọc',
    thua.length ? `thừa: ${nhu(thua)}` : 'không thừa khoá nào');

  /* Số ổ giả sinh ra phải cộng ĐƯỢC, không ra NaN — chốt luôn cái hậu quả. */
  for (const vai of VAI_TRO) {
    const d = demChu(loc(TAI_LIEU, vai.nhomXem));
    const tong = d.tra_cuu_duoc + (d.co_chu_chua_tra_duoc || 0) + d.chi_xem_duoc;
    cham(Number.isFinite(tong) && tong > 0,
      `Ⓔ ${vai.ma} — dải đếm có số để hiện (không NaN, không 0)`,
      `tra ${d.tra_cuu_duoc} · chưa ${d.co_chu_chua_tra_duoc} · xem ${d.chi_xem_duoc} → tổng ${tong}`);
  }
}

function doTranChieuCao() {
  muc('Ⓓ trần chiều cao của thứ nổi đè màn hình — phải là CẶP `vh` rồi `dvh`');
  LUOT = 'luật CSS';
  /* GỠ CHÚ THÍCH TRƯỚC KHI SOI. Bắt được lúc tự thử 07/09/2026: chú thích
     mới viết ở `.modal` có nhắc lại nguyên văn mấy dòng `max-height:
     calc(100qvh - 40px)` làm ví dụ, và lưới ĐỌC LUÔN CHÚNG như khai báo thật
     — một khối hỏng có thể mượn chữ trong chú thích để qua cửa, hoặc một khối
     lành bị chú thích của chính nó làm cho đỏ. Lưới đọc chữ thì phải đọc đúng
     phần chữ CÓ HIỆU LỰC. */
  const css = readFileSync(GOC_REPO + '/public/assets/css/style.css', 'utf8')
    .replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const t of THU_NOI) {
    /* Lấy mọi khối luật mở đầu bằng đúng bộ chọn đó. Soi TỪNG KHỐI RIÊNG, không
       gộp thân lại: `.cnb-popup` có hai khối (luật gốc + khối trong
       `@media (max-width: 640px)`), mà mỗi khối phải TỰ có đường lui của mình.
       Gộp lại rồi soi chung là để một khối mượn cặp của khối kia — đúng kiểu
       lưới tự bịt mắt. */
    const re = new RegExp('(?<![\\w.#-])\\' + t.chon + '\\s*(?:,[^{}]*)?\\{([^{}]*)\\}', 'g');
    const khoi = [...css.matchAll(re)].map(m => m[1]);
    if (!khoi.length) { cham(false, `Ⓓ ${t.chon} — tìm thấy luật CSS`, 'không thấy khối nào, sửa bàn đo'); continue; }

    khoi.forEach((than, i) => {
      const ten = `Ⓓ ${t.chon}${khoi.length > 1 ? ` (khối ${i + 1}/${khoi.length})` : ''}`;
      /* Chỉ soi TRẦN chiều cao (`height` / `max-height`). `max-width: 90vw` là
         chuyện khác, không đụng. */
      const khai = [...than.matchAll(/(max-height|height)\s*:\s*([^;]*);/g)]
        .map(m => ({ ten: m[1], gt: m[2].trim() }));
      /* Gom theo TỪNG thuộc tính: `height` và `max-height` là hai trần rời
         nhau, mỗi cái phải có cặp của chính nó. */
      const theoThuocTinh = new Map();
      for (const k of khai) {
        if (!theoThuocTinh.has(k.ten)) theoThuocTinh.set(k.ten, []);
        theoThuocTinh.get(k.ten).push(k.gt);
      }
      let coDoDuoc = false;
      for (const [thuocTinh, ds] of theoThuocTinh) {
        const cheDo = ds.map(g => (LA_DVH.test(g) ? 'dvh' : LA_VH.test(g) ? 'vh' : 'khac'));
        if (!cheDo.some(c => c !== 'khac')) continue;   // trần cố định (px…) — không phải việc của lưới này
        coDoDuoc = true;
        const iVh = cheDo.indexOf('vh');
        const iDvh = cheDo.lastIndexOf('dvh');
        const viet = ds.map((g, j) => `${thuocTinh}: ${g} [${cheDo[j]}]`).join(' · ');
        if (iVh < 0)
          cham(false, `${ten} — \`${thuocTinh}\` có CẶP vh+dvh`,
            `${t.vi}: \`dvh\` ĐỨNG MỘT MÌNH → máy cũ (Chrome <108 / Safari <15.4) vứt cả dòng, MẤT SẠCH TRẦN. Thiếu dòng nền \`vh\`. ${viet}`);
        else if (iDvh < 0)
          cham(false, `${ten} — \`${thuocTinh}\` có CẶP vh+dvh`,
            `${t.vi}: chỉ có \`vh\`, thiếu dòng \`dvh\` → trên điện thoại trần cao hơn vùng nhìn thấy ~60-90px. ${viet}`);
        else if (iDvh < iVh)
          cham(false, `${ten} — \`${thuocTinh}\` có CẶP vh+dvh`,
            `${t.vi}: SAI THỨ TỰ — \`vh\` phải đứng TRƯỚC làm nền, \`dvh\` đứng SAU đè lên. ${viet}`);
        else
          cham(true, `${ten} — \`${thuocTinh}\` có CẶP vh+dvh`, `${t.vi}: ${viet}`);
      }
      if (!coDoDuoc)
        cham(true, `${ten} — không đặt trần bằng vh/dvh`, `${t.vi}: trần cố định, không dính bẫy này`);
    });
  }
}

/* ==========================================================================
   CHẠY
   ========================================================================== */
console.log('BÀN ĐO "MỞ RA XEM ĐƯỢC" — lớp: màn mở ra mà không xem được nội dung');
console.log(CA ? `⚠ CA ĐỐI CHỨNG ${CA}: ${CAC_CA[CA].vi}\n  → phép chấm PHẢI đỏ: "${CAC_CA[CA].phaiDo}"\n`
          : TU_KIEM ? '⚠ CHẾ ĐỘ TỰ KIỂM: đã gài lại đúng lỗi GY-0007 — bàn đo PHẢI ĐỎ\n'
                    : `Quét ${VAI_TRO.length} vai trò × ${BE_NGANG.length} bề ngang\n`);

doTranChieuCao();
doHopDongODa();

if (CHI_LUOI) {
  console.log(`\nChỉ chạy lưới Ⓓ · Chấm ${soCham} phép · HỎNG ${soHong}`);
  if (HONG.length) { console.log('\nDanh sách chỗ hỏng:'); for (const h of HONG) console.log('  · ' + h); }
  process.exit(soHong ? 1 : 0);
}

/* ==========================================================================
   ĐỒNG HỒ CHẾT CHO TỪNG LƯỢT — MỘT BÀN ĐO TREO LÀ MỘT BÀN ĐO BỊ TẮT
   ---------------------------------------------------------------------------
   Đã dính một lần trong chính đợt này: dữ liệu giả sai bộ mã làm màn quét mở
   ra không có nhóm nào, bàn đo đứng im 20 phút — không đỏ, không xanh, không
   một dòng chữ. Treo thì người ta bấm Ctrl-C rồi thôi luôn, tệ hơn hẳn ĐỎ.
   Quá giờ = ĐỎ, kèm tên lượt, để còn biết mà đi tìm.
   ========================================================================== */
const HAN_MOT_LUOT = 4 * 60 * 1000;
async function motLuotCoHan(vai, bn) {
  let hen;
  const chuong = new Promise((_, hong) => {
    hen = setTimeout(() => hong(new Error(`quá ${HAN_MOT_LUOT / 1000}s — lượt này TREO`)), HAN_MOT_LUOT);
  });
  try {
    await Promise.race([motLuot(vai, bn), chuong]);
  } catch (e) {
    LUOT = `${vai.ten} @ ${bn.rong}px`;
    cham(false, 'lượt chạy trọn vẹn', e?.message || String(e));
    if (DANG_MO) { try { DANG_MO.b.dong(); DANG_MO.may.dong(); } catch {} DANG_MO = null; }
  } finally {
    clearTimeout(hen);
  }
}

for (const vai of VAI_TRO) {
  for (const bn of BE_NGANG) await motLuotCoHan(vai, bn);
}

console.log('\n══════════════════════════════════════════════');
console.log(`Chấm ${soCham} phép · HỎNG ${soHong}`);
if (HONG.length) {
  console.log('\nDanh sách chỗ hỏng:');
  for (const h of HONG) console.log('  · ' + h);
}

if (CA) {
  const c = CAC_CA[CA];
  console.log(`\n─── ĐỐI CHỨNG CA ${CA} ───\n${c.vi}`);
  const trung = HONG.filter(h => h.includes(c.phaiDo));
  if (soHong === 0) {
    console.log(`\n✗ CA ${CA} TRƯỢT: đã gài hỏng mà bàn đo vẫn XANH — BÀN ĐO MÙ ĐÚNG CÁCH HỎNG NÀY.`);
    process.exit(1);
  }
  if (!trung.length) {
    console.log(`\n✗ CA ${CA} TRƯỢT: bàn đo có đỏ, nhưng KHÔNG đỏ ở phép chấm phải bắt được ` +
      `("${c.phaiDo}"). Đỏ vì lý do khác thì lần sau đổi chỗ là mù lại.`);
    process.exit(1);
  }
  console.log(`\n✔ CA ${CA} ĐẠT: phép chấm "${c.phaiDo}" ĐỎ ${trung.length} lượt.`);
  console.log(`  ví dụ: ${trung[0]}`);
  process.exit(0);
}

if (TU_KIEM) {
  if (soHong === 0) {
    console.log('\n✗ TỰ KIỂM TRƯỢT: đã gài lại lỗi GY-0007 mà bàn đo vẫn XANH — bàn đo MÙ.');
    process.exit(1);
  }
  console.log('\n✔ TỰ KIỂM ĐẠT: gài lại lỗi thì bàn đo bắt được. Số nó in ra dùng được.');
  process.exit(0);
}
process.exit(soHong ? 1 : 0);
