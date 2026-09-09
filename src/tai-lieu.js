/* ==========================================================================
   KHO TÀI LIỆU — LÕI DÙNG CHUNG  ·  CTL-0026 (Đợt 1) + CTL-0025 (Đợt 2)
   ---------------------------------------------------------------------------
   MỘT KHO, HAI CỬA VÀO (CTL-0026 Mục 5). Cỗ máy chỉ có một:

       chụp → nén ở máy → gộp nhiều trang thành MỘT tài liệu → bóc chữ
       → lưu Drive → gắn thẻ → tra cứu

   Khác nhau CHỈ ở cột `cua_vao`:
     · 'kho_chung' — kho chung của công ty            (Đợt 1, phiếu này)
     · 'nhan_su'   — gắn vào hồ sơ một người          (Đợt 2, CTL-0025)
   Mọi hàm dưới đây đã nhận `cua_vao`/`gan_id` ngay từ bây giờ, nên Đợt 2 chỉ
   phải thêm CỬA VÀO ở giao diện, KHÔNG viết lại lõi. Xây hai lần là hai chỗ
   để hỏng, hai chỗ phải sửa.

   ---------------------------------------------------------------------------
   ⚠️ ĐÂY LÀ BẢN DỰ PHÒNG, KHÔNG THAY BẢN GIẤY
   Luật Giao dịch điện tử 2023 (hiệu lực 01/7/2024) công nhận bản số hoá CHỈ
   KHI đủ điều kiện ký số + toàn vẹn. Quét bằng điện thoại KHÔNG đạt. Luật Kế
   toán vẫn bắt giữ bản gốc có dấu đỏ, lưu 5/10 năm/vĩnh viễn.
   → Câu này in thẳng lên màn hình quét VÀ đi kèm mọi câu trả lời của máy chủ
     (`CANH_BAO_PHAP_LY`). Không có nó là có ngày ai đó dọn kho giấy.

   ⚠️ DỮ LIỆU CÁ NHÂN — Luật BVDLCN 91/2025/QH15 + NĐ 356/2025 (01/01/2026)
   Nhóm `nhan_su` là dữ liệu cá nhân: bắt buộc GHI NHẬN ĐỒNG Ý (ai, lúc nào,
   mục đích gì) lúc lưu, và GHI NHẬT KÝ mỗi lượt mở.

   ---------------------------------------------------------------------------
   HẠN MỨC GHI D1 (REV-0031 vừa vá) — một lượt quét tốn ĐÚNG 1 lượt ghi:
     1 × INSERT INTO tai_lieu.  Không hơn.
   Bản nháp nhiều trang nằm ở ĐIỆN THOẠI, nên sóng yếu gửi hụt rồi gửi lại
   cũng không sinh thêm lượt ghi nào.
   Nhật ký truy cập chỉ ghi cho giấy tờ NHẠY CẢM và gộp thật theo NGÀY: đọc
   trước, đã có dòng hôm nay thì KHÔNG ghi nữa → mở 10 lần = 1 lượt ghi + 9
   lượt đọc. (Trước REV-0036 chỗ này là `DO UPDATE SET so_lan = so_lan+1`,
   tức 10 lượt GHI trong khi vẫn khai là 1 — đó là lời khai sai, không phải
   chú thích lỗi thời.)
   ========================================================================== */

import {
  NHOM_TAI_LIEU, MA_NHOM_TAI_LIEU,
  duocXemNhomTaiLieu, duocLuuNhomTaiLieu,
  nhomTaiLieuXemDuoc, nhomTaiLieuLuuDuoc, nhomTaiLieuNhayCam,
  laAdmin
} from './quyen.js';
import { luuFile, layFile, xoaFile, timHoacTaoThuMuc, daCauHinh, duongDanTep } from './kho-file.js';
import { gioVN, ngayVN, duocGuiNhac } from './nhac-nhan-su.js';
import { catBot, nhanCat } from './cat-danh-sach.js';
import { NHAN_SO_AI, viTriSoAI, soCCCD } from './so-ai.js';
/* Dò chữ ký `%PDF-` + đọc chữ nằm sẵn trong PDF. Khai ĐÚNG MỘT chỗ
   (`src/pdf-chu.js`) — hai bản chép tay của cùng một định nghĩa chính là cách
   đường đọc CCCD từng chết âm thầm 11 ngày. */
import { laByteCuaPDF, docChuTuPDF, LOAI_PDF, laChuVun } from './pdf-chu.js';

/** Câu phải xuất hiện ở mọi cửa. Đặt ở ĐÚNG MỘT chỗ để không có hai bản
 *  lệch nhau, và để phép kiểm tự động soi được một chuỗi duy nhất. */
export const CANH_BAO_PHAP_LY =
  'Đây là bản dự phòng để tra cứu. KHÔNG thay bản giấy — đừng huỷ giấy gốc.';

/* ==========================================================================
   HAI CỬA VÀO, MỘT KHO  ·  CTL-0025 Đợt 2 mở cửa `nhan_su`
   ---------------------------------------------------------------------------
   Sếp Ngọc 29/08/2026: *"khi có các giấy tờ kiểu như quyết định, uỷ quyền liên
   quan đến nhân sự đó tao sẽ lưu vào đây luôn THÀNH 1 BỘ là đẹp"*.

   "Thành 1 bộ" = mở hồ sơ một người là thấy TRỌN giấy tờ của người đó, không
   phải sang kho chung mò. Nhưng đó là MỘT CỬA NHÌN, không phải kho thứ hai:
   giấy quét ở cửa hồ sơ vẫn nằm nguyên trong bảng `tai_lieu`, vẫn hiện ở kho
   chung với ai có quyền xem nhóm `nhan_su`. Hai kho là hai chỗ để lệch nhau,
   hai chỗ phải sao lưu, hai chỗ phải phân quyền.

   Khác nhau giữa hai cửa CHỈ là hai cột: `cua_vao` + `gan_id`.
   ========================================================================== */
export const CUA_VAO_HOP_LE = ['kho_chung', 'nhan_su'];

/* Cửa `nhan_su` KHOÁ CỨNG vào nhóm giấy tờ `nhan_su`. Không phải cho gọn: nhóm
   đó là nhóm NHẠY CẢM, và chính cờ `nhay_cam` mới bật hai thứ luật đòi — bắt
   ghi nhận đồng ý lúc lưu, và ghi nhật ký mỗi lượt mở. Cho phép gắn một tờ hoá
   đơn nhóm `ke_toan` vào hồ sơ một người là mở đúng lối đi vòng qua cả hai. */
export const NHOM_CUA_NHAN_SU = 'nhan_su';

/* ⚠️ LOẠI GIẤY TỜ NHÂN SỰ — KHAI Ở MÁY CHỦ, KHÔNG CHÉP SANG TRÌNH DUYỆT.
   Sếp gọi đích danh "quyết định" và "uỷ quyền"; phần còn lại là bộ giấy một hồ
   sơ lao động thật sự có. Đây là GỢI Ý cho ô "Loại giấy" (bấm một cái thay vì
   gõ tay trên điện thoại) — KHÔNG phải danh sách đóng: gõ tay loại khác vẫn
   lưu được, vì đời thật luôn có tờ giấy không nằm trong danh sách nào.

   `cccd: true` bật chốt "số hiệu phải là 12 chữ số" — xem `luuTaiLieu`. */
export const LOAI_GIAY_NHAN_SU = [
  { ma: 'quyet_dinh',  ten: 'Quyết định',         goi_y_so: 'VD: 12/2026/QĐ-AGC' },
  { ma: 'uy_quyen',    ten: 'Uỷ quyền',           goi_y_so: 'VD: 03/2026/GUQ' },
  { ma: 'hdld',        ten: 'Hợp đồng lao động',  goi_y_so: 'VD: 12/2026/HĐLĐ' },
  { ma: 'phu_luc',     ten: 'Phụ lục hợp đồng',   goi_y_so: 'VD: 01/PL-HĐLĐ' },
  { ma: 'cccd',        ten: 'CCCD',               goi_y_so: '12 chữ số', cccd: true },
  { ma: 'bang_cap',    ten: 'Bằng cấp – chứng chỉ', goi_y_so: 'Số hiệu bằng' },
  { ma: 'suc_khoe',    ten: 'Khám sức khoẻ',      goi_y_so: 'Số phiếu khám' },
  { ma: 'cam_ket',     ten: 'Cam kết',            goi_y_so: 'Số hiệu (nếu có)' },
  { ma: 'bien_ban',    ten: 'Biên bản',           goi_y_so: 'VD: 05/2026/BB' }
];

/* ==========================================================================
   HỒ SƠ (BỘ)  ·  PHASE 2 — Sếp Ngọc chốt 09/09/2026
   ---------------------------------------------------------------------------
   Sếp Ngọc: *"HỒ SƠ (bộ) chứa nhiều TÀI LIỆU"* — mở một bộ ra là thấy TRỌN
   giấy tờ của một việc, và biết bộ đó còn THIẾU giấy gì.

   ⚠️⚠️ HỒ SƠ KHÔNG CÓ QUYỀN RIÊNG. Đây là ràng buộc nặng nhất của cả tính năng.
   Ai xem được một tờ giấy vẫn CHỈ do `nhom` của tờ đó quyết định
   (`duocXemNhomTaiLieu`, src/quyen.js:440), y như trước khi có bộ. Không một
   dòng nào dưới đây nới quyền theo bộ, và không được thêm.
     · Vì sao: bộ *Hồ sơ pháp lý doanh nghiệp* chứa CCCD người đại diện, mà
       CCCD bắt buộc ở nhóm `nhan_su` — chính cờ nhóm đó mới bật ghi-nhận-đồng-ý
       và nhật ký truy cập theo Luật BVDLCN 91/2025/QH15. Cho bộ cấp quyền là
       cho một tờ giấy HAI ông chủ, và cách hỏng KHÔNG kêu một tiếng: kéo một
       tờ vào bộ rồi đột nhiên thêm (hoặc bớt) người đọc được nó.
     · Hệ quả BẮT BUỘC làm đúng: người không đủ quyền mở một bộ thì màn hình
       NÓI THẲNG *"bộ này có N giấy tờ bạn không được xem"* — xem `soGiayBiChan`
       trong `danhSachTaiLieu`. Không giấu im, không trả danh sách rỗng.
   ========================================================================== */

/** Tiền tố id của một bộ — để nhìn chuỗi là biết ngay nó là bộ hay tài liệu. */
export const TIEN_TO_HO_SO = 'hs_';

/* ⚠️ BẢNG KIỂM "BỘ NÀY CẦN GIẤY GÌ" — VIẾT CỨNG VÒNG ĐẦU (Gạo chốt 09/09/2026).
   Ba cách đã cân: (a) viết cứng — nhanh, thêm loại giấy phải deploy;
   (b) Sếp tự tick trong ERP — mềm, phải xây thêm màn quản trị; (c) suy ra từ
   những bộ đã có — không tin được khi kho mới có 3 tờ. Chọn (a) cho vòng đầu,
   dùng lại ĐÚNG khuôn `LOAI_GIAY_NHAN_SU` đã có sẵn ở trên (cùng hai trường
   `ma` + `ten`), để sau nâng lên (b) mà không phải đổi khuôn dữ liệu.

   `tu` = các cụm chữ ĐÃ BỎ DẤU dùng để nhận ra một tờ giấy đã có trong bộ.
   Soi vào `loai` TRƯỚC, rồi mới tới `tieu_de` — người ta gõ loại để PHÂN LOẠI,
   nên nó là mẩu sự thật sát nhất. Nhận nhầm ở đây chỉ làm bảng kiểm tick sớm,
   KHÔNG nới quyền và KHÔNG đụng vào tờ giấy nào. */
export const LOAI_HO_SO = {
  phap_ly_dn: {
    ten: 'Hồ sơ pháp lý doanh nghiệp',
    can: [
      { ma: 'gcn_dkkd',    ten: 'GCN đăng ký doanh nghiệp', tu: ['dang ky doanh nghiep', 'dkkd', 'dkdn'] },
      { ma: 'dieu_le',     ten: 'Điều lệ công ty',          tu: ['dieu le'] },
      { ma: 'qd_bo_nhiem', ten: 'Quyết định bổ nhiệm',      tu: ['bo nhiem'] },
      { ma: 'bien_ban',    ten: 'Biên bản họp',             tu: ['bien ban'] },
      { ma: 'cccd_dai_dien', ten: 'CCCD người đại diện',    tu: ['cccd', 'cmnd', 'can cuoc'] },
      { ma: 'uy_quyen',    ten: 'Giấy uỷ quyền',            tu: ['uy quyen'] },
      { ma: 'mau_dau',     ten: 'Thông báo mẫu con dấu',    tu: ['mau dau', 'con dau'] },
      { ma: 'dk_thue',     ten: 'Đăng ký thuế / MST',       tu: ['dang ky thue', 'ma so thue', 'mst'] },
      { ma: 'giay_phep_con', ten: 'Giấy phép con (nếu có)', tu: ['giay phep'] }
    ]
  },
  nhan_su: {
    ten: 'Hồ sơ nhân sự một người',
    /* Dùng lại NGUYÊN 9 loại của `LOAI_GIAY_NHAN_SU` — khai lại `tu` chứ không
       khai lại danh sách, để thêm một loại giấy nhân sự chỉ phải sửa MỘT chỗ. */
    can: null,
    tu_theo_loai_giay: {
      quyet_dinh: ['quyet dinh'], uy_quyen: ['uy quyen'], hdld: ['hop dong lao dong', 'hdld'],
      phu_luc: ['phu luc'], cccd: ['cccd', 'cmnd', 'can cuoc'], bang_cap: ['bang cap', 'chung chi'],
      suc_khoe: ['suc khoe', 'kham suc khoe'], cam_ket: ['cam ket'], bien_ban: ['bien ban']
    }
  },
  ncc: {
    ten: 'Hồ sơ nhà cung cấp',
    can: [
      { ma: 'hop_dong',  ten: 'Hợp đồng nguyên tắc', tu: ['hop dong'] },
      { ma: 'phu_luc',   ten: 'Phụ lục hợp đồng',    tu: ['phu luc'] },
      { ma: 'gcn_dkkd',  ten: 'GCN đăng ký doanh nghiệp của NCC', tu: ['dang ky doanh nghiep', 'dkkd'] },
      { ma: 'attp',      ten: 'Giấy ATTP / công bố', tu: ['attp', 'an toan thuc pham', 'cong bo'] },
      { ma: 'bao_gia',   ten: 'Báo giá',             tu: ['bao gia'] }
    ]
  },
  nhap_khau: {
    ten: 'Hồ sơ lô nhập khẩu',
    can: [
      { ma: 'to_khai',   ten: 'Tờ khai hải quan',  tu: ['to khai'] },
      { ma: 'co',        ten: 'C/O xuất xứ',       tu: ['c/o', 'xuat xu', 'co form'] },
      { ma: 'kiem_dich', ten: 'Kiểm dịch',         tu: ['kiem dich'] },
      { ma: 'packing',   ten: 'Packing list',      tu: ['packing'] },
      { ma: 'invoice',   ten: 'Invoice',           tu: ['invoice', 'hoa don thuong mai'] }
    ]
  },
  /* Không bảng kiểm. Cố ý: một bộ không rõ loại thì không có "đủ" hay "thiếu",
     và bịa ra một bảng kiểm cho nó là bịa ra một con số Sếp sẽ tin. */
  khac: { ten: 'Hồ sơ khác', can: [] }
};

export const MA_LOAI_HO_SO = Object.keys(LOAI_HO_SO);
export const TRANG_THAI_HO_SO = ['dang_dung', 'da_dong'];

/** Bảng kiểm của một loại bộ, đã nở sẵn ca `nhan_su` (dùng lại
 *  `LOAI_GIAY_NHAN_SU` thay vì chép tay lần thứ hai). */
export function bangKiemHoSo(loai) {
  const l = LOAI_HO_SO[loai];
  if (!l) return [];
  if (Array.isArray(l.can)) return l.can;
  return LOAI_GIAY_NHAN_SU.map(g => ({
    ma: g.ma, ten: g.ten, tu: l.tu_theo_loai_giay[g.ma] || [boDau(g.ten)]
  }));
}

/** Bộ này còn thiếu giấy gì — tính trên ĐÚNG những tờ người đang xem THẤY được.
 *
 *  ⚠️ NÓI THẲNG GIỚI HẠN: nếu bộ còn giấy người này không được xem thì bảng
 *  kiểm ở đây có thể báo THIẾU một thứ thật ra ĐÃ CÓ. Máy chủ trả kèm
 *  `so_bi_chan` để giao diện nói ra điều đó — đếm mà không nói rõ đếm trên cái
 *  gì thì đó là một con số nói dối (bài học REV-0055 vòng 2 · CAO-A). */
export function soatBangKiem(loai, dsTaiLieu) {
  const bang = bangKiemHoSo(loai);
  if (!bang.length) return [];
  const moc = (dsTaiLieu || []).map(t => boDau((t.loai || '') + ' ' + (t.tieu_de || '')));
  return bang.map(m => ({
    ma: m.ma,
    ten: m.ten,
    co: moc.some(s => m.tu.some(k => s.includes(k)))
  }));
}

/** Loại giấy người dùng gõ/chọn có phải CCCD không — so bằng TÊN đã bỏ dấu, vì
 *  ô "Loại giấy" là ô chữ tự do (bấm chip điền sẵn tên, nhưng gõ tay cũng được).
 *  Cố tình rộng tay: "cccd", "CCCD/CMND", "Căn cước công dân" đều tính. */
export function laLoaiCCCD(loai) {
  const s = boDau(loai || '');
  return /\bcccd\b|\bcmnd\b|can cuoc/.test(s);
}

/** Nhóm nhạy cảm thì thêm câu này (CTL-0025 Mục 2 ②). */
export const CANH_BAO_TRA_GIAY =
  'Chỉ lưu BẢN SAO. Quét xong trả giấy lại cho nhân viên ngay — doanh nghiệp ' +
  'không được giữ giấy tờ gốc của người lao động.';

/* Trần kích thước. Điện thoại đã nén mỗi trang xuống ~150–400 KB, 12 trang là
   quá đủ cho hợp đồng dài nhất công ty đang có. Đặt trần để một cú gửi hỏng
   không kéo cả Worker vượt CPU. */
const TRAN_BYTE_PDF   = 6 * 1024 * 1024;
const TRAN_SO_TRANG   = 12;

/* ==========================================================================
   ĐƯỜNG THỨ HAI VÀO CÙNG KHO: FILE CÓ SẴN TRÊN MÁY  ·  CTL-0026 vòng 6
   ---------------------------------------------------------------------------
   Sếp Ngọc 29/08/2026: *"nếu tôi upload file từ máy tính lên thì không có chỗ
   thêm tài liệu à"*. Trên máy tính giấy tờ ĐÃ LÀ FILE — bản scan từ máy scan
   thật, PDF nhận qua email. Bắt chụp lại màn hình là vô lý.

   Máy chủ KHÔNG có đường xử lý thứ hai. Cùng `luuTaiLieu`, cùng phân quyền,
   cùng chốt đồng ý, cùng chống trùng `ma_gui`, cùng ĐÚNG MỘT lượt ghi D1.
   Khác nhau đúng HAI con số và MỘT nhánh bóc chữ, cả ba nằm ngay dưới đây.
   ========================================================================== */

/** Định dạng thân gửi lên. `anh_gop` = xấp ảnh đã gộp thành PDF ở máy (đường
 *  cũ, mặc định khi trình duyệt cũ chưa gửi cột này). `pdf_goc` = file PDF có
 *  sẵn, chép nguyên byte. */
const DINH_DANG_HOP_LE = ['anh_gop', 'pdf_goc'];

/* ⚠️ TRẦN 25 MB CHO PDF CÓ SẴN — BỐN CON SỐ ÉP RA NÓ (bản đầy đủ ở
   `public/assets/js/quet-tai-lieu.js`, khai lại tóm tắt để người đọc máy chủ
   không phải mở file khác):
     ① BỘ NHỚ WORKER 128 MB là chốt CHẶT NHẤT. Một file N byte tồn tại nhiều
        bản cùng lúc trong Worker: thân JSON (~1,34N) → chuỗi base64 sau
        `JSON.parse` (~1,34N) → chuỗi nhị phân của `atob` (~1N) → `Uint8Array`
        (~1N). Đỉnh ≈ 3,7N. N = 25 MB → ≈ 93 MB, còn chỗ thở; N = 30 MB →
        ≈ 111 MB, sát trần tới mức một lượt gửi đôi là chết Worker.
     ② Trần thân yêu cầu của Cloudflare Workers là 100 MB — 25 MB thành 33,4 MB
        base64, dư rộng. KHÔNG phải chốt chặt nhất, đừng lấy nó biện minh cho
        số to hơn.
     ③ Drive còn ~12 GB (SPEC-0005 Mục 4): 25 MB/file thì được ~480 file.
     ④ Đường máy ảnh GIỮ NGUYÊN 6 MB. Ảnh nén ở máy còn 150–400 KB/trang, 12
        trang không bao giờ chạm 6 MB — nới trần đường đó là nới vô cớ.
   Trình duyệt báo trần TRƯỚC khi gửi (đọc `file.size`, chưa tốn một byte
   mạng). Dòng dưới đây là lưới thứ hai cho ca gọi thẳng API. */
const TRAN_BYTE_PDF_GOC = 25 * 1024 * 1024;

/* Bản scan máy scan thật hay dày 20–50 trang, và nó là MỘT tài liệu chứ không
   phải mấy chục tài liệu. Trần 12 trang của đường máy ảnh sinh ra từ "chụp tay
   quá 12 trang là quá sức", không áp được cho file đã có sẵn. 200 chỉ là chốt
   chống số rác (`so_trang` do trình duyệt đếm và gửi lên). */
const TRAN_SO_TRANG_PDF_GOC = 200;

/** ⚠️ CÂU PHẢI GHI VÀO CỘT, KHÔNG PHẢI CHỈ HIỆN MỘT LẦN RỒI BAY.
 *
 *  Từ CTL-0026 vòng 7, PDF CÓ LỚP CHỮ được bóc chữ thật (`src/pdf-chu.js`), nên
 *  câu này chỉ còn dùng cho ca ĐỌC HỤT ngoài dự kiến. Ba ca thường gặp — chỉ có
 *  ảnh, có mật khẩu, đọc không đủ rõ — có câu riêng, đúng bệnh, ở `CAU_LOAI`.
 *  Đừng để `ocr_ghi_chu` rỗng: rỗng thì người ta gõ một cụm chữ trong hợp đồng,
 *  không thấy gì, và kết luận SAI rằng hợp đồng chưa được lưu.
 *  Ghi vào CỘT nên câu còn nguyên ở màn xem chữ, ở bản sao lưu CSV, ở bản khôi
 *  phục — bài học REV-0044 · L3 (nhãn sống trong một màn thì ra tới Excel là
 *  trần trụi). */
export const GHI_CHU_PDF_CHUA_BOC =
  'Không lấy được chữ trong file PDF này. Tài liệu vẫn lưu nguyên bản và mở xem ' +
  'được bình thường, vẫn tra được bằng tên, số hiệu, loại giấy và nhóm — chỉ là ' +
  'không tìm được theo chữ bên trong.';

/** Chữ bóc từ lớp chữ của PDF vẫn là chữ MÁY ĐỌC (máy scan nhận dạng), nên vẫn
 *  đeo nhãn CHƯA KIỂM như chữ AI đọc ảnh. Nó ĐÁNG TIN HƠN — chữ nằm sẵn trong
 *  file chứ không do mô hình sinh ra, nên không có chuyện "bịa cả tờ giấy" —
 *  nhưng máy scan vẫn đọc nhầm chữ số, và nó KHÔNG PHẢI người xác nhận. */
export const NGUON_CHU = {
  anh_ai:      'anh_ai',        // Workers AI đọc ảnh chụp
  pdf_lop_chu: 'pdf_lop_chu',   // lớp chữ có sẵn trong PDF
  khong:       'khong'          // không có chữ
};
/* Bóc chữ tối đa 3 trang: trang đầu luôn là trang có tiêu đề, số hiệu, ngày —
   đủ để tra cứu. Bóc cả 12 trang thì mỗi lượt quét gọi AI 12 lần, chờ rất lâu
   mà giá trị tra cứu tăng không đáng kể. Nêu rõ ở `ocr_so_trang` để người đọc
   biết phần chữ mình đang tìm có được bóc hay không — KHÔNG im lặng. */
const TRAN_TRANG_BOC_CHU = 3;

/* ⚠️ MÔ HÌNH ĐỌC ẢNH — ĐO THẬT NGÀY 29/08/2026, ĐỌC KỸ TRƯỚC KHI ĐỔI
   ---------------------------------------------------------------------------
   Gọi thật bằng chính tài khoản Cloudflare của công ty (Worker tạm, không đụng
   ERP đang chạy). Cổng Workers AI khoá theo TỪNG MÔ HÌNH, không phải cả tài
   khoản:

     @cf/meta/llama-3.2-11b-vision-instruct  → lỗi 5016, đòi ký Llama Community
                                               License + AUP trước khi dùng
     @cf/meta/llama-4-scout-17b-16e-instruct → CHẠY ĐƯỢC NGAY, không phải ký gì
     @cf/mistralai/mistral-small-3.1-24b-…   → CHẠY ĐƯỢC NGAY (đường lui)

   → Dùng mô hình KHÔNG CẦN KÝ. Bắt Sếp đi ký một thoả thuận pháp lý với Meta
     để lấy thứ đã có sẵn miễn phí là đẩy việc lên bàn Sếp vô cớ.
   → `src/nhansu.js` (đọc ảnh CCCD) import ĐÚNG hằng số này — một chỗ sửa, hai
     đường cùng sống. Trước đây hai file chép tay cùng một chuỗi, nên đường đọc
     CCCD chết âm thầm 11 ngày (18/08 → 29/08) mà không ai biết. */
export const MO_HINH_DOC_ANH = '@cf/meta/llama-4-scout-17b-16e-instruct';

/* ⚠️ ĐỊNH DẠNG ĐẦU VÀO — ĐO NGÀY 29/08/2026. ĐÂY LÀ CHỖ ĐÃ LÀM HỎNG CẢ TÍNH NĂNG
   ---------------------------------------------------------------------------
   ĐÚNG MỘT mô hình, ĐÚNG MỘT tấm ảnh, đổi mỗi định dạng — hai kết quả khác hẳn
   (`@cf/meta/llama-4-scout-17b-16e-instruct`, đo cạnh nhau trong cùng một lượt):

     { image: [...bytes], prompt }      → 0/4 mốc, 15,8 giây. KHÔNG BÁO LỖI —
                                          nó bịa ra một công văn của Bộ Giáo dục.
     { messages: [ text + image_url ] } → 4/4 mốc, 8,4 giây. Đọc đúng tờ giấy.

   Khuôn `{image, prompt}` là khuôn cũ của llama-3.2-vision. Mô hình đời mới
   nhận ảnh qua `messages` kiểu OpenAI; đưa sai khuôn thì trường `image` bị
   BỎ QUA LẶNG LẼ và mô hình chỉ trả lời riêng câu nhắc. Không `try/catch` nào
   bắt được chuyện này: nó KHÔNG phải một lỗi, nó là một câu trả lời SAI trông
   y như câu trả lời đúng. Đó là lý do phải có chốt `chuCoThatKhong()` ở dưới.

   Đo cả bảng cho người sau khỏi thử lại (tài khoản công ty, 29/08/2026):
     mistral-small-3.1-24b · messages → 4/4, 9,1 giây, NHƯNG dấu tiếng Việt
       kém rõ ("CỐ SỐ DỰ ĐIỀU KIỆN" thay vì "CƠ SỞ ĐỦ ĐIỀU KIỆN") — đường lui.
     llava-1.5-7b-hf · legacy → 0/4: nó chép lại chính câu nhắc, không đọc giấy.
     uform-gen2-qwen-500m → 5028, Cloudflare gỡ từ 30/05/2026.
     gemma-3-12b-it → 5018 "This account is not allowed" — CỔNG KHÁC với 5016,
       KHÔNG phải thứ gửi `prompt:'agree'` mở được. Đừng mất công.
     qwen2.5-vl-7b-instruct → 5007, Workers AI không có mô hình này. */
export function khuonDocAnh(anhBase64, nhac) {
  const sach = String(anhBase64 || '').replace(/^data:[^,]*,/, '');
  return {
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: nhac },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + sach } }
      ]
    }],
    max_tokens: 1024
  };
}

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }

/* ==========================================================================
   1. TÌM ĐƯỢC BẰNG TIẾNG VIỆT CÓ DẤU VÀ KHÔNG DẤU
   ---------------------------------------------------------------------------
   Ràng buộc CTL-0026 Mục 6. Nhân viên kho gõ điện thoại thường bỏ dấu; Sếp gõ
   máy tính thì có dấu. Cả hai phải ra cùng kết quả.

   Cách làm: tách dấu bằng NFD rồi bỏ các dấu tổ hợp, riêng chữ đ/Đ phải xử
   tay vì NFD KHÔNG tách nó (đ là một ký tự độc lập, không phải d + dấu).
   Đây là bẫy kinh điển: bỏ sót là "hợp đồng" tra thành "hợp ong".
   ========================================================================== */
export function boDau(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chuỗi nhét vào cột `tim_kiem`. Gộp mọi thứ đáng tra vào một ô, đã bỏ dấu.
 *
 *  ⚠️ VÁ REV-0040 · LỖI #4 — Ô TÌM KIẾM LÀ MỘT ĐƯỜNG ĐỌC RUỘT KHÔNG AI THẤY.
 *  Bản trước nhét CẢ `noi_dung` vào đây cho mọi nhóm, kể cả nhóm NHẠY CẢM. Đo
 *  được: chuỗi sinh ra chứa nguyên `001091027384` và `18.500.000`. Mà đường
 *  danh sách quét `tim_kiem LIKE ?` và **ghi 0 lượt nhật ký** — nên chỉ cần gõ
 *  một số CCCD vào ô tìm, thấy dòng hiện lên là đã XÁC NHẬN số đó nằm trong hồ
 *  sơ nào, đọc được ruột mà không để lại một vết nào. Đúng thứ Luật BVDLCN
 *  91/2025/QH15 bắt phải ghi lại.
 *
 *  Vá: nhóm NHẠY CẢM thì `noi_dung` KHÔNG vào ô tìm kiếm. Cái mất: không tra
 *  được hồ sơ nhân sự bằng chữ bên trong giấy. Cái được: không ai dò được số
 *  CCCD hay mức lương bằng cách gõ mò. Đổi như thế là đúng — muốn đọc ruột
 *  giấy tờ nhạy cảm thì phải MỞ nó ra, và mở là có nhật ký.
 *  Tiêu đề, số hiệu, loại, tên nhóm vẫn tra được bình thường. */
export function chuoiTimKiem({ tieu_de, so_hieu, loai, nhom, noi_dung, ho_so_ten }) {
  /* Nhóm LẠ → coi như NHẠY CẢM. Fail-open ở đây (nhóm không có trong bảng thì
     `nhomTaiLieuNhayCam` trả false ⇒ ruột vào thẳng ô tìm) là mặc định sai
     chiều cho một chốt bảo vệ dữ liệu cá nhân — REV-0044 · L4. */
  const laLa = !NHOM_TAI_LIEU[nhom];
  const ten = NHOM_TAI_LIEU[nhom]?.ten || '';
  /* `noi_dung` truyền vào đây PHẢI là `boc.chuTim` — phần chữ của trang ĐÃ ĐỐI
     CHIẾU và đã gọt sạch số máy đọc (xem `chuChoOTim`). Truyền thẳng `noi_dung`
     đầy đủ vào là mở lại đúng hai lỗ vừa bịt. */
  const ruot = (laLa || nhomTaiLieuNhayCam(nhom)) ? null : noi_dung;
  /* ⚠️ TÊN BỘ HỒ SƠ CỐ Ý **KHÔNG** NẰM TRONG CỘT NÀY — PHASE 2, đã cân và bỏ.
     Bản soát PHASE 1 đề nghị nhét tên bộ vào đây ("một dòng, 0 lượt ghi D1
     thêm"). Dựng thử rồi bỏ, vì nó đẻ ra đúng lớp lỗi tệ nhất của dự án này —
     một chuỗi tra cứu mang giá trị ĐÃ CŨ mà không ai thấy:
       · Sếp đổi tên bộ ⇒ mọi tờ trong bộ còn mang TÊN CŨ trong ô tìm. Gõ tên
         cũ vẫn ra, gõ tên mới không ra. Đúng kiểu lỗi không ai phát hiện.
       · Vá bằng một câu `UPDATE ... REPLACE(tim_kiem, ten_cu, ten_moi)` thì
         KHÔNG chạy: cột này đã BỎ DẤU, còn `ho_so.ten` thì có dấu, và SQLite
         không có hàm bỏ dấu. Câu vá trông như chạy mà không thay được gì.
       · Và nó tốn thêm một lượt GHI D1 cho mỗi tờ, mỗi lần đổi tên bộ.
     Thay vào đó, tìm theo tên bộ được xử ở ĐƯỜNG ĐỌC (`danhSachTaiLieu`): so
     tên bộ ngay lúc tra, bằng chính `boDau()` này, nên KHÔNG BAO GIỜ cũ.
     Tham số `ho_so_ten` giữ trong chữ ký để nơi gọi truyền vào cũng vô hại. */
  void ho_so_ten;
  return boDau([tieu_de, so_hieu, loai, ten, ruot].filter(Boolean).join(' ')).slice(0, 20000);
}

/* ==========================================================================
   2. Tiện ích
   ========================================================================== */

/** base64 (có/không tiền tố data:) → Uint8Array. Cùng khuôn `src/nhansu.js`. */
function base64ToBytes(b64) {
  const raw = String(b64 || '').replace(/^data:[^,]*,/, '');
  const bin = atob(raw);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function chuoi(v, dai = 300) {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, dai) : null;
}

/** 'YYYY-MM-DD' hoặc null. Ngày rác thì bỏ, đừng lưu để rồi nhắc hạn sai. */
function ngay(v) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? null : s;
}

function nowVN() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

/* ==========================================================================
   3. BÓC CHỮ — Workers AI đã có sẵn, đã chạy thật trong ERP
   ---------------------------------------------------------------------------
   `wrangler.toml` đã khai `[ai]`, và `src/nhansu.js` đang dùng đúng mô hình
   này để đọc ảnh CCCD. Miễn phí, đã chứng minh chạy được trong chính mã nguồn
   này (CTL-0026 Mục 3 ③) → KHÔNG đi tìm dịch vụ OCR khác.

   AI hỏng thì KHÔNG chặn việc lưu — bê nguyên cách xử của `docCCCD`: tài liệu
   vẫn vào kho, chỉ là tra bằng tiêu đề thay vì tra bằng nội dung. Mất chữ còn
   hơn mất cả tài liệu.
   ========================================================================== */
/* ⚠️ CÂU CHỈ ĐƯỜNG PHẢI ĐÚNG — REV-0036 lỗi #1
   ---------------------------------------------------------------------------
   Bản trước bảo Sếp "chấp nhận điều khoản ở Dashboard → AI → Workers AI".
   KHÔNG có cái nút đó. Chính câu lỗi 5016 nói cách thật: gửi MỘT lượt suy luận
   với `prompt: 'agree'` tới đúng mô hình bị khoá — một cú gọi API, không phải
   một cái nút. Chỉ đường sai thì Sếp đi tìm nút không tồn tại rồi quay lại hỏi.

   Từ 29/08/2026 `MO_HINH_DOC_ANH` đã đổi sang mô hình KHÔNG CẦN KÝ, nên nhánh
   này gần như không còn nổ. Giữ lại để nếu ngày nào có người đổi về mô hình
   Meta thì câu hiện ra vẫn là câu ĐÚNG. */
function dichLoiAI(e) {
  const m = String((e && e.message) || '');
  if (/5016|must submit the prompt/i.test(m)) {
    return `Mô hình "${MO_HINH_DOC_ANH}" đòi chủ tài khoản ký thoả thuận Meta ` +
           'trước khi dùng (KHÔNG có nút nào trong Dashboard — cách duy nhất là ' +
           "gửi một lượt suy luận với prompt 'agree'). Đường vòng không phải ký " +
           'gì: đổi MO_HINH_DOC_ANH sang @cf/meta/llama-4-scout-17b-16e-instruct. ' +
           'Tài liệu ĐÃ LƯU an toàn, chỉ là chưa bóc được chữ.';
  }
  if (/429|rate limit|capacity/i.test(m)) {
    return 'Workers AI đang quá tải, chưa bóc được chữ lần này. Tài liệu đã lưu.';
  }
  return 'AI đọc ảnh lỗi: ' + m.slice(0, 140);
}

/* ==========================================================================
   CHỮ BỊA — mối nguy lớn hơn chữ thiếu.  ĐO NGÀY 29/08/2026
   ---------------------------------------------------------------------------
   Đưa đúng một tờ Giấy chứng nhận ATTP của công ty (đã qua đúng đường nén của
   sản phẩm) cho mô hình đọc ảnh, mô hình trả về một văn bản đọc rất xuôi tai:

     "Số: 2345/KH-UBND … Bộ Giáo dục và Đào tạo … tỉnh Quảng Ngãi"

   Không một chữ nào có trên tờ giấy. 0/8 trường then chốt đúng, cả ba tấm ảnh
   (nét / mờ / nén tệ) đều ra một tờ giấy tưởng tượng KHÁC NHAU. Mô hình KHÔNG
   báo lỗi — nó chỉ đơn giản không nhìn thấy ảnh và trả lời riêng câu nhắc.

   Chữ bịa đi thẳng vào cột `noi_dung` và `tim_kiem` thì kho giấy tờ pháp lý
   có nội dung giả: Sếp bấm "Xem chữ đã bóc" trên tờ ATTP và đọc được một
   công văn của Bộ Giáo dục. THÀ KHÔNG CÓ CHỮ CÒN HƠN CÓ CHỮ BỊA — không bóc
   được thì màn hình đã nói sẵn "tra bằng tên", còn bịa thì không ai biết.

   ⚠️ GẠO CHỐT LẠI 29/08/2026 (REV-0044 · L2) — MỎ NEO KHÔNG ĐƯỢC DÙNG ĐỂ VỨT
   ---------------------------------------------------------------------------
   Bản trước lấy mỏ neo làm BẰNG CHỨNG và vứt chữ khi không trúng. Hồ Ly dựng
   49 ca và bác đúng: **nó vứt giấy THẬT**.
     · hoá đơn GTGT của NCC Sơn La (số hiệu trống, gõ "Chứng từ mua nguyên liệu")
     · sao kê Techcombank tháng 8 (trống, "Chứng từ ngân hàng tháng 8")
     · trang mờ AI trả "[không rõ]"
   Cả ba đều bị vứt chữ, vì neo ③ ĐÒI từ người gõ phải có mặt trên giấy — nhưng
   người ta gõ tên để PHÂN LOẠI, không phải để CHÉP LẠI; còn giấy của nhà cung
   cấp thì không nhắc tên công ty mình.

   NĂM LUẬT MỚI. Đọc kỹ trước khi đổi bất cứ dòng nào dưới đây:
   ① KHÔNG BAO GIỜ VỨT BẢN QUÉT. Người ta cầm giấy thật đứng chụp — vứt là mất
      giấy tờ thật, tệ hơn mọi thứ khác. Ảnh và PDF LUÔN được lưu.
   ② Mỏ neo chỉ NÂNG/HẠ ĐỘ TIN của phần CHỮ, không quyết định lưu hay không.
   ③ Không mỏ neo nào trúng → chữ đeo nhãn "CHƯA KIỂM", KHÔNG vào cột tìm kiếm.
      Ảnh vẫn lưu, vẫn tra tay được.
   ④ Chốt chạy TỪNG TRANG, không chạy trên chuỗi đã gộp — một trang thật KHÔNG
      được bảo lãnh cho trang khác (đo được: trang 1 thật + trang 2 bịa → cùng
      lưu, cùng vào ô tìm).
   ⑤ Cắt theo TỪ, không theo ÂM TIẾT. Ngưỡng "âm tiết ≥5 chữ" cũ làm 8/9 cặp
      tên gần nhau trúng oan (thông báo↔thông tư · quyết định↔quyết toán) VÀ
      8/12 tên tài liệu thật không sinh nổi một mỏ neo nào. Tên không sinh nổi
      mỏ neo thì NÓI THẲNG là không có, đừng bịa ra một cái yếu rồi tin nó.

   HAI HẠNG MỎ NEO — vì một dấu hiệu yếu không phải bằng chứng:
     MẠNH (đủ để nói "đã đối chiếu"):
       · `so_hieu` người vừa gõ khi nhìn vào tờ giấy   (mẩu sự thật chắc nhất)
       · TÊN CÔNG TY / tên HKD tiền thân trên giấy
       · CỤM BẮT BUỘC của loại giấy (thẻ CCCD luôn in "CĂN CƯỚC CÔNG DÂN")
     YẾU (KHÔNG đủ, chỉ đỡ hơn không có gì):
       · cụm từ trong tên tài liệu người vừa gõ. Vì sao yếu: mô hình bịa văn
         bản hành chính Việt Nam bằng ĐÚNG bộ từ vựng ấy — gõ "Quyết định" thì
         trang bịa "QUYẾT ĐỊNH · Bộ Giáo dục và Đào tạo" cũng trúng. Để nó
         chứng nhận là để chữ bịa tự bảo lãnh cho mình.

   ⚠️ Mỏ neo KHÔNG cứu được DẢI GIỮA (danh tính đúng, vài con số bị thay lặng
   lẽ) — dải đó chặn bằng `src/so-ai.js`: nhãn "AI đọc — CHƯA KIỂM", cấm con số
   tự vào ô dữ liệu chính thức, và cấm con số vào cột tìm kiếm (xem
   `chuChoOTim()`). Đừng ai tưởng chốt này bắt được cả hai.
   ========================================================================== */

/** Tên công ty — mỏ neo MẠNH. Gồm cả tên HKD tiền thân vì giấy tờ 2024–2025
 *  còn mang tên đó, và giai đoạn hợp nhất hai pháp nhân vẫn đang chạy (Q3/2026). */
export const TEN_CONG_TY_NEO = [
  'Công ty TNHH Alpha Green Commerce',
  'Alpha Green Commerce',
  'Onfod'
];

/** Ba mức tin của phần chữ một TRANG. Không có mức "vứt" — luật ①. */
export const MUC_TIN = {
  da_neo:     'ĐÃ ĐỐI CHIẾU',
  neo_yeu:    'CHƯA KIỂM (chỉ trúng tên bạn tự gõ)',
  chua_kiem:  'CHƯA KIỂM'
};

/** Âm tiết đã bỏ dấu, hạ thường. */
function amTiet(s) {
  return boDau(s || '').split(/[^a-z0-9]+/).filter(Boolean);
}

/** Bỏ dấu VÀ bỏ mọi ký tự không phải chữ-số — để "124/2026/GCN-ATTP" và
 *  "124 / 2026 / GCN – ATTP" là cùng một chuỗi. */
function gonHet(s) {
  return boDau(s || '').replace(/[^a-z0-9]/g, '');
}

/** CỤM NEO từ tên người gõ — CẮT THEO TỪ, không theo âm tiết (luật ⑤).
 *
 *  Tiếng Việt là chuỗi âm tiết ngắn, nên lấy TỪNG âm tiết làm mỏ neo là vừa
 *  trúng oan (`thông báo` ↔ `thông tư` chung âm tiết `thong`) vừa hụt (`Giấy
 *  ATTP kho Hà Nội` không có âm tiết nào ≥5 chữ). Lấy CẶP ÂM TIẾT LIỀN NHAU
 *  thì cả hai vấn đề biến mất cùng lúc: `thong bao` ≠ `thong tu`, mà `giay
 *  attp` thì sinh ra được.
 *
 *  Tên chỉ có MỘT âm tiết thì KHÔNG sinh cụm nào — và như thế là đúng: nói
 *  thẳng "không có mỏ neo" còn hơn bịa ra một cái yếu rồi tin nó. */
export function cumNeoTuTen(...phan) {
  const ra = new Set();
  for (const p of phan) {
    const at = amTiet(p);
    for (let i = 0; i + 1 < at.length; i++) {
      /* Cặp quá ngắn ("do an", "ky so") dễ trúng oan — đòi tổng ≥6 chữ. */
      if ((at[i] + at[i + 1]).length >= 6) ra.add(at[i] + ' ' + at[i + 1]);
    }
  }
  return [...ra];
}

/** ĐỘ TIN CỦA CHỮ MỘT TRANG. KHÔNG bao giờ trả "vứt" — luật ①/②.
 *
 *  @returns {{muc: string, neo: ?string, coMoc: string[], viSao: ?string,
 *             traiMocBatBuoc: boolean}}
 *    · `muc` — khoá trong `MUC_TIN`.
 *    · `traiMocBatBuoc` — CHỈ bật khi nơi gọi đưa `cum` (cụm chữ mà chính tờ
 *      giấy LUÔN in sẵn) mà chữ đọc được không có. Đường quét tài liệu KHÔNG
 *      dùng cờ này (nó không vứt gì cả); đường đọc ảnh CCCD ở `src/nhansu.js`
 *      thì có — ở đó không có tờ giấy nào bị mất, chỉ là KHÔNG ĐIỀN SẴN form. */
export function docTinChu(chu, { soHieu = null, loai = null, tieuDe = null,
                                 cum = null, tenCum = 'dòng chữ bắt buộc của loại giấy tờ này' } = {}) {
  const rong = { muc: 'chua_kiem', neo: null, coMoc: [], viSao: null, traiMocBatBuoc: false };
  if (!chu) return rong;

  const chuGon = gonHet(chu);
  /* Chuỗi âm tiết có khoảng trắng hai đầu — để khớp CỤM theo ranh giới từ,
     không khớp mẩu giữa từ. */
  const chuCum = ' ' + amTiet(chu).join(' ') + ' ';

  const coMoc = [];
  let manh = null, yeu = null, traiMocBatBuoc = false;

  /* ---- MỎ NEO MẠNH ① — cụm bắt buộc của loại giấy tờ -------------------- */
  if (Array.isArray(cum) && cum.length) {
    coMoc.push(tenCum);
    if (cum.some(c => chuGon.includes(gonHet(c)))) manh = manh || tenCum;
    else traiMocBatBuoc = true;
  }

  /* ---- MỎ NEO MẠNH ② — số hiệu người vừa gõ ---------------------------- */
  const maSo = gonHet(soHieu);
  if (maSo.length >= 4) {
    coMoc.push(`số hiệu "${soHieu}"`);
    if (chuGon.includes(maSo)) manh = manh || `số hiệu "${soHieu}"`;
  }

  /* ---- MỎ NEO MẠNH ③ — tên công ty (CHỈ ĐỂ TRÚNG, không để ĐÒI) --------
     Giấy của nhà cung cấp hay của một cá nhân hoàn toàn có thể không nhắc tên
     công ty mình. Đưa nó vào `coMoc` là vứt oan đúng những tờ đó. */
  if (TEN_CONG_TY_NEO.some(t => chuGon.includes(gonHet(t)))) manh = manh || 'tên công ty';

  /* ---- MỎ NEO YẾU — cụm từ trong tên tài liệu người gõ ------------------ */
  const cumTen = cumNeoTuTen(loai, tieuDe);
  if (cumTen.length) {
    const trung = cumTen.find(c => chuCum.includes(' ' + c + ' '));
    if (trung) yeu = `cụm "${trung}" trong tên bạn vừa gõ`;
  }

  /* ⚠️ VÁ REV-0055 · CHỐT MỎ NEO TỪNG MÙ ĐÚNG BỆNH CHỮ TÁCH RỜI.
     (Không gọi đây là "tầng phòng thủ thứ hai": laChuVun chỉ bắt dạng RỜI
      RẠC, mù với dạng DÍNH LIỀN — xem khối chú thích trên hàm đó ở
      src/pdf-chu.js. Nói quá phạm vi của một chốt là cách để người sau đọc
      xong tưởng đã được che kín.)
     Cả ba mỏ neo MẠNH ở trên so bằng `gonHet()`, tức BỎ HẾT khoảng trắng
     trước khi so. Nên khi chữ bóc ra vỡ vụn thành `"S 3 Y 0 A X D 0 0 0 0 1"`,
     `gonHet` vẫn nặn nó về `s3y0axd00001` và mỏ neo VẪN TRÚNG — rồi ERP trao
     nhãn tin cậy CAO NHẤT ("ĐÃ ĐỐI CHIẾU") cho một mớ chữ mà gõ "invoice" vào
     ô tìm ra 0 kết quả (Hồ Ly đo được trên CSDL thật, REV-0055).
     Luật giữ nguyên như lần trước: THÀ MẤT NHÃN TIN CẬY CÒN HƠN GIỮ NHÃN SAI.
     Chữ vẫn LƯU (luật ①), chỉ là không lên được bậc "đã đối chiếu" và không
     vào ô tìm kiếm. Một chỗ định nghĩa `laChuVun` — dùng chung với
     `src/pdf-chu.js`, không có bản chép tay thứ hai. */
  if (manh && laChuVun(chu)) {
    return {
      muc: 'chua_kiem', neo: null, coMoc, traiMocBatBuoc,
      viSao: `Chữ trang này có trúng ${manh}, NHƯNG chỉ trúng khi bỏ hết khoảng ` +
             'trắng: chữ bóc ra bị rời rạc từng ký tự nên gõ vào ô tìm sẽ không ' +
             'ra. Máy KHÔNG dám nhận là đã đối chiếu. Chữ vẫn lưu để bạn tự đọc, ' +
             'nhưng KHÔNG đưa vào ô tìm kiếm.'
    };
  }
  if (manh) {
    return { muc: 'da_neo', neo: manh, coMoc, viSao: null, traiMocBatBuoc: false };
  }
  if (yeu) {
    return {
      muc: 'neo_yeu', neo: yeu, coMoc, traiMocBatBuoc,
      viSao: `Chữ trang này chỉ trúng ${yeu} — mà AI hay bịa văn bản hành chính ` +
             'bằng đúng bộ từ đó, nên CHƯA đủ để coi là đã đối chiếu. Chữ vẫn ' +
             'được lưu để đọc, nhưng KHÔNG đưa vào ô tìm kiếm.'
    };
  }
  return {
    muc: 'chua_kiem', neo: null, coMoc, traiMocBatBuoc,
    viSao: coMoc.length
      ? `Chữ trang này KHÔNG chứa ${coMoc.join(' hay ')}, cũng không nhắc tên ` +
        'công ty — có thể AI không nhìn thấy ảnh mà tự bịa. Chữ vẫn lưu để bạn ' +
        'tự đối chiếu, nhưng KHÔNG đưa vào ô tìm kiếm.'
      : 'Bạn chưa gõ số hiệu, và tên tài liệu không sinh được cụm nào để đối ' +
        'chiếu, nên máy KHÔNG có mốc nào để kiểm. Chữ vẫn lưu, nhưng KHÔNG đưa ' +
        'vào ô tìm kiếm. Gõ số hiệu vào là máy kiểm giúp được.'
  };
}

/** CHỮ ĐƯỢC PHÉP VÀO CỘT TÌM KIẾM.
 *
 *  Hai lớp gọt, cả hai đều là chuyện "một con số sai tự xác nhận mình":
 *  ① chỉ chữ của trang ĐÃ ĐỐI CHIẾU mới vào (luật ③);
 *  ② VẪN gọt sạch mọi cụm SỐ khỏi phần đó. Vì sao gắt tới vậy: nhãn "AI đọc —
 *     CHƯA KIỂM" chỉ sống trong MỘT màn (REV-0044 · L3), còn ô tìm thì không
 *     đeo nhãn nào — gõ một mã số thuế SAI vào ô tìm mà thấy tài liệu hiện lên
 *     là người ta đã tự xác nhận con số sai đó là đúng, và đường tìm kiếm ghi
 *     0 lượt nhật ký. Số hiệu NGƯỜI GÕ vẫn vào ô tìm bình thường (nó ở nhánh
 *     khác của `chuoiTimKiem`) — cái bị gọt chỉ là số MÁY ĐỌC. */
export function chuChoOTim(chu) {
  return String(chu || '').replace(/\d[\d.,\/\- ]*/g, ' ');
}

async function bocChu(env, dsAnhOCR, moc = {}) {
  const rong = (ghiChu) => ({ chu: '', chuTim: '', soTrang: 0, soTrangNeo: 0, ghiChu, trang: [] });
  if (!env.AI) return rong('Máy chủ chưa bật AI đọc ảnh');
  if (!dsAnhOCR.length) return rong('Không có ảnh để bóc chữ');

  const nhac =
    'Đây là ảnh chụp một trang giấy tờ hành chính Việt Nam. Hãy chép lại TOÀN BỘ ' +
    'chữ nhìn thấy trong ảnh, giữ nguyên tiếng Việt CÓ DẤU, giữ nguyên số hiệu, ' +
    'ngày tháng, tên riêng và các con số. Xuống dòng như trên giấy. ' +
    'KHÔNG tóm tắt, KHÔNG giải thích, KHÔNG thêm lời nào của bạn. ' +
    'Chỗ nào mờ không đọc được thì ghi [không rõ].';

  /* ⚠️ CHỐT CHẠY TỪNG TRANG (luật ④). Bản trước nối mọi trang thành một chuỗi
     rồi gọi chốt ĐÚNG MỘT LẦN — đo được: trang 1 thật + trang 2 bịa thì cả hai
     cùng được nhận là thật. Một trang thật KHÔNG được bảo lãnh cho xấp còn lại. */
  const trang = [];
  let hong = null;
  for (let i = 0; i < dsAnhOCR.length; i++) {
    try {
      const bytes = base64ToBytes(dsAnhOCR[i]);
      if (bytes.length < 100) { hong = hong || 'Ảnh bóc chữ quá nhỏ'; continue; }
      const kq = await env.AI.run(MO_HINH_DOC_ANH, khuonDocAnh(dsAnhOCR[i], nhac));
      const chu = String(kq?.response ?? kq?.description ?? kq?.text ??
                         kq?.choices?.[0]?.message?.content ?? '').trim();
      if (chu) trang.push({ so: i + 1, chu, tin: docTinChu(chu, moc) });
    } catch (e) {
      hong = hong || dichLoiAI(e);
    }
  }

  if (!trang.length) return rong(hong || 'Không đọc được chữ nào');
  return gopChuDaBoc(trang, { hong, nguonChu: NGUON_CHU.anh_ai });
}

/** Nhãn cho chữ lấy từ LỚP CHỮ có sẵn trong PDF.
 *  Khác nhãn AI đọc ảnh vì hai thứ khác nhau về độ tin: chữ này KHÔNG do mô
 *  hình sinh ra nên không có chuyện bịa cả một tờ giấy khác. Nhưng nó vẫn là
 *  chữ MÁY ĐỌC — máy scan nhận dạng nhầm chữ số là chuyện thường — và nó
 *  KHÔNG PHẢI người xác nhận. Nên vẫn qua chốt mỏ neo như mọi chữ máy đọc. */
export const NHAN_CHU_PDF = 'Chữ có sẵn trong file PDF — CHƯA KIỂM';

/** GỘP CHỮ ĐÃ BÓC THEO TRANG — dùng chung cho cả ba đường: AI đọc ảnh, đọc lớp
 *  chữ PDF, và TÍNH LẠI mỏ neo khi số hiệu đổi (`suaTaiLieu`). Một chỗ khai
 *  luật ①②③, không ba bản chép tay lệch nhau. */
function gopChuDaBoc(trang, { hong = null, nguonChu = NGUON_CHU.anh_ai, themGhiChu = null } = {}) {
  const nhan = nguonChu === NGUON_CHU.pdf_lop_chu ? NHAN_CHU_PDF : NHAN_SO_AI;
  /* Nhãn đi THEO TỪNG TRANG ngay trong chính chuỗi `noi_dung`, nên nó còn
     nguyên ở mọi nơi chuỗi đó đi tới — màn xem chữ, bản sao lưu CSV, bản khôi
     phục. Nhãn chỉ sống trong một màn thì ra tới Excel là trần trụi (L3). */
  const chuGop = trang.map(t =>
    `--- Trang ${t.so} · ${MUC_TIN[t.tin.muc]} · ${nhan} ---\n${t.chu}`
  ).join('\n\n').slice(0, 60000);

  const daNeo = trang.filter(t => t.tin.muc === 'da_neo');
  const chuaKiem = trang.filter(t => t.tin.muc !== 'da_neo');

  /* Câu ghi chú PHẢI có mặt khi còn trang chưa kiểm — đây chính là câu mà
     REV-0044 · L1 phát hiện là không bao giờ tới mắt người quét. Giao diện
     in nó ở CẢ HAI nhánh (có chữ / không có chữ). */
  const ghiChu = chuaKiem.length
    ? `${chuaKiem.length}/${trang.length} trang CHƯA ĐỐI CHIẾU ĐƯỢC ` +
      `(trang ${chuaKiem.map(t => t.so).join(', ')}). ` +
      chuaKiem[0].tin.viSao +
      (daNeo.length ? ` ${daNeo.length} trang còn lại đã đối chiếu (trúng ${daNeo[0].tin.neo}).` : '')
    : null;

  return {
    chu: chuGop,
    /* Chỉ trang ĐÃ ĐỐI CHIẾU mới được vào ô tìm, và vẫn gọt sạch số máy đọc. */
    chuTim: chuChoOTim(daNeo.map(t => t.chu).join(' ')),
    soTrang: trang.length,
    soTrangNeo: daNeo.length,
    nguonChu,
    ghiChu: [themGhiChu, ghiChu || hong || null].filter(Boolean).join(' ') || null,
    trang: trang.map(t => ({ so: t.so, muc: t.tin.muc, neo: t.tin.neo }))
  };
}

/** TÁCH NGƯỢC `noi_dung` ĐÃ LƯU RA TỪNG TRANG.
 *  Cần cho `suaTaiLieu`: đổi số hiệu là đổi MỎ NEO, mà mỏ neo chạy TỪNG TRANG
 *  (luật ④). Không tách lại được thì KHÔNG được đoán — hạ hết về "chưa kiểm".
 *  Trả `[]` khi chuỗi không mang dấu trang (dòng lưu trước bản này). */
export function tachTrangDaLuu(noiDung) {
  const s = String(noiDung || '');
  if (!s) return [];
  const re = /^--- Trang (\d+) · [^\n]*---$/gm;
  const moc = [...s.matchAll(re)];
  if (!moc.length) return [];
  const ra = [];
  for (let i = 0; i < moc.length; i++) {
    const dau = moc[i].index + moc[i][0].length;
    const het = i + 1 < moc.length ? moc[i + 1].index : s.length;
    const chu = s.slice(dau, het).trim();
    if (chu) ra.push({ so: parseInt(moc[i][1], 10) || (i + 1), chu });
  }
  return ra;
}

/* ==========================================================================
   3b. ĐỌC CHỮ NẰM SẴN TRONG PDF  ·  CTL-0026 vòng 7
   ---------------------------------------------------------------------------
   Sếp Ngọc 03/09/2026: *"định dạng file sẽ là scan pdf"* — nên đây là ĐƯỜNG
   CHÍNH, không phải đường phụ.

   ⚠️ CHỮ NÀY CŨNG PHẢI QUA CHỐT MỎ NEO, KHÔNG CÓ NGOẠI LỆ.
   Nó đáng tin hơn chữ AI đọc ảnh (không do mô hình sinh ra, nên không bịa nổi
   một tờ giấy khác), NHƯNG vẫn là chữ MÁY ĐỌC và vẫn KHÔNG PHẢI người xác
   nhận: máy scan đọc nhầm `0` thành `8` là chuyện xảy ra hằng ngày, và một số
   sai lọt vào ô tìm thì người gõ đúng số sai ấy sẽ tự xác nhận nó là đúng.
   Nên: cùng `docTinChu()`, cùng `chuChoOTim()`, cùng luật ①②③④.

   Hàm này KHÔNG BAO GIỜ ném lỗi ra ngoài — hỏng thì tài liệu vẫn lưu, chỉ là
   tra bằng tên. Mất chữ còn hơn mất cả tài liệu (luật ①).
   ========================================================================== */
async function bocChuTrongPDF(bytes, moc) {
  const rong = (ghiChu, nguon = NGUON_CHU.khong) => ({
    chu: '', chuTim: '', soTrang: 0, soTrangNeo: 0, nguonChu: nguon, ghiChu, trang: []
  });
  let kq;
  try {
    kq = await docChuTuPDF(bytes);
  } catch (e) {
    console.error('Đọc chữ trong PDF:', (e && e.message) || e);
    return rong(GHI_CHU_PDF_CHUA_BOC);
  }
  if (kq.loai !== LOAI_PDF.co_lop_chu || !kq.trang.length) {
    /* KHÔNG có lớp chữ. Câu ở `src/pdf-chu.js` đã viết bằng tiếng người và nói
       đúng bệnh (chỉ ảnh · có mật khẩu · đọc không đủ rõ) — dùng nguyên. */
    return rong(kq.ghi_chu || GHI_CHU_PDF_CHUA_BOC);
  }
  const trang = kq.trang.map(t => ({ so: t.so, chu: t.chu, tin: docTinChu(t.chu, moc) }));
  const dau = kq.co_dau ? '' : ' Lưu ý: chữ đọc ra không có dấu tiếng Việt — ' +
    'tra cứu bằng chữ không dấu vẫn ra, nhưng đọc lại sẽ hơi khó.';
  return gopChuDaBoc(trang, {
    nguonChu: NGUON_CHU.pdf_lop_chu,
    themGhiChu: `Đã lấy chữ có sẵn trong file PDF (${kq.trang.length} trang, ` +
                `${kq.so_ky_tu.toLocaleString('vi-VN')} ký tự) — không phải AI đọc ảnh.` +
                dau + (kq.ghi_chu ? ' ' + kq.ghi_chu : '')
  });
}

/* ==========================================================================
   4. LƯU MỘT TÀI LIỆU  —  POST /api/tai-lieu/luu
   ========================================================================== */
export async function luuTaiLieu(env, phien, body) {
  /* ---- CỬA VÀO — đọc TRƯỚC nhóm, vì cửa `nhan_su` khoá cứng nhóm -------- */
  const cuaVao = chuoi(body.cua_vao, 20) || 'kho_chung';
  if (!CUA_VAO_HOP_LE.includes(cuaVao)) {
    return loi(`Cửa vào "${cuaVao}" không có thật`, 400);
  }
  const nhom = cuaVao === 'nhan_su' ? NHOM_CUA_NHAN_SU : chuoi(body.nhom, 40);
  if (!nhom || !NHOM_TAI_LIEU[nhom]) return loi('Chưa chọn nhóm giấy tờ');

  /* ---- GIẤY NHÂN SỰ LUÔN THUỘC VỀ MỘT NGƯỜI  ·  REV-0046 lỗi #2 ---------
     Sếp Ngọc nói nguyên văn: "lưu vào đây luôn THÀNH 1 BỘ là đẹp".

     Lỗ cũ: HCNS đứng ở tab Kho tài liệu (cửa `kho_chung`) chọn nhóm "Nhân sự"
     → `gan_id` bị vứt vì cửa không phải `nhan_su` → dòng có `gan_id` NULL ⇒
     KHÔNG BAO GIỜ nằm trong bộ của ai. Mở hồ sơ Phạm Khương Duy vẫn thiếu tờ
     đó, dù nó nằm ngay trong kho.

     Vá theo hướng BẮT CHỌN NGƯỜI, không theo hướng "gắn vào hồ sơ sau":
       · Gắn sau để tờ giấy mồ côi một quãng dài vô hạn — lỗ vẫn nguyên, chỉ
         đổi tên thành "chưa gắn", mà ai quên gắn thì không ai biết.
       · Gắn sau còn cần một đường UPDATE mới trên `tai_lieu`, phá đúng ràng
         buộc hạn mức ghi D1 mà migration ghi ở đầu file: "MỘT lượt quét =
         ĐÚNG 1 dòng INSERT. Không hơn."
       · Bắt chọn ngay thì dùng lại NGUYÊN máy móc đã dựng cho cửa hồ sơ (kiểm
         nhân sự có thật, ngay dưới đây), tốn thêm 0 lượt ghi, và bất biến
         phát biểu được thành MỘT câu kiểm được: nhóm `nhan_su` ⇒ LUÔN có
         `gan_id`, quét ở cửa nào cũng vậy.

     Nên `gan_id` đọc theo NHÓM chứ không theo CỬA, và giấy nhân sự quét ở kho
     chung được ghi thẳng `cua_vao='nhan_su'` — cùng một tờ giấy thì cùng một
     dòng. Kho chung VẪN thấy nó (cửa nhìn kho chung không lọc `cua_vao` —
     xem `danhSachTaiLieu`), nên "một kho hai cửa nhìn" giữ nguyên, chỉ hết
     chỗ rơi.

     Nhóm KHÁC mà gửi kèm `gan_id` thì vẫn VỨT như cũ: một dòng
     `cua_vao='kho_chung'` mang `gan_id` là dòng không cửa nào tra ra. */
  const laGiayNhanSu = nhom === NHOM_CUA_NHAN_SU;
  const ganId = laGiayNhanSu ? chuoi(body.gan_id, 64) : null;
  const cuaGhi = laGiayNhanSu ? 'nhan_su' : cuaVao;

  /* ⚠️ CẮT Ở MÁY CHỦ. Đây là chỗ chặn thật — giao diện có ẩn nút hay không
     cũng không liên quan. Gọi thẳng API bằng tư cách kế toán để lưu vào nhóm
     `nhan_su` thì dừng ở đúng dòng này. */
  if (!duocLuuNhomTaiLieu(phien, nhom)) {
    return loi(`Bạn không có quyền lưu tài liệu vào nhóm "${NHOM_TAI_LIEU[nhom].ten}"`, 403);
  }

  const tieuDe = chuoi(body.tieu_de, 200);
  if (!tieuDe || tieuDe.length < 3) return loi('Vui lòng đặt tên cho tài liệu (ít nhất 3 ký tự)');

  /* ---- ĐỊNH DẠNG THÂN GỬI LÊN — quyết định HAI trần và MỘT nhánh bóc chữ --
     Thiếu cột này (trình duyệt còn nhớ bản cũ) thì rơi về `anh_gop`, tức là
     đúng hành vi trước bản này. Mặc định phải là đường CHẶT hơn: đoán nhầm
     thành `pdf_goc` là tự nới trần từ 6 MB lên 25 MB cho mọi lượt gửi. */
  const dinhDang = DINH_DANG_HOP_LE.includes(chuoi(body.dinh_dang, 20))
    ? chuoi(body.dinh_dang, 20) : 'anh_gop';
  const laPdfGoc = dinhDang === 'pdf_goc';

  const soTrang = parseInt(body.so_trang, 10) || 0;
  const tranTrang = laPdfGoc ? TRAN_SO_TRANG_PDF_GOC : TRAN_SO_TRANG;
  if (soTrang < 1) return loi('Chưa có trang nào');
  if (soTrang > tranTrang) {
    return loi(laPdfGoc
      ? `File PDF khai ${soTrang} trang, vượt trần ${tranTrang} trang.`
      : `Một tài liệu tối đa ${tranTrang} trang`);
  }

  /* ---- GIẤY NHÂN SỰ: phải gắn vào một người CÓ THẬT ---------------------
     Một lượt ĐỌC D1 để đổi lấy việc không bao giờ có tài liệu mồ côi trong
     bảng. Gắn nhầm `gan_id` thì tờ giấy biến mất khỏi mọi hồ sơ mà vẫn nằm
     trong kho — không ai đi tìm, không ai biết nó của ai. Lượt đọc rẻ hơn lượt
     ghi cả một bậc, và đây là đường ghi (mỗi lượt quét đúng một lần).
     Điều kiện là NHÓM chứ không phải CỬA — xem lý do ở khối REV-0046 #2 trên. */
  let tenNguoi = null;
  if (laGiayNhanSu) {
    if (!ganId) return loi('Giấy tờ nhân sự phải nằm trong hồ sơ của một người — hãy chọn nhân sự.');
    const ns = await env.DB.prepare(
      'SELECT id, ho_ten FROM nhan_su WHERE id = ?').bind(ganId).first();
    if (!ns) return loi('Không có nhân sự nào mang mã này', 404);
    tenNguoi = ns.ho_ten || null;
  }

  /* ---- QUÉT THẲNG VÀO MỘT BỘ  ·  PHASE 2 --------------------------------
     Chỗ RẺ NHẤT để sinh ra quan hệ bộ: ghi `ho_so_id` ngay trong đúng lượt
     `INSERT` vốn đã có ⇒ **0 lượt ghi D1 thêm**, giữ nguyên bất biến "MỘT lượt
     quét = ĐÚNG 1 lượt ghi" (REV-0046 #2, REV-0050 Câu 3).
     Đường "gắn sau" vẫn có (`taiLieuVaoBo`) vì ba tờ giấy đang nằm trên hệ
     thống phải kéo vào bộ được — nhưng nó là một VIỆC NGƯỜI TA BẤM, tốn lượt
     ghi của riêng nó, không phải cái giá mặc định của mỗi lượt quét.

     Một lượt ĐỌC D1 để đổi lấy việc không bao giờ có `ho_so_id` trỏ vào hư
     không. Bộ đã ĐÓNG thì không nhận giấy mới: đóng bộ là một tuyên bố
     ("pháp nhân này xong rồi"), nhận thêm giấy vào là làm tuyên bố đó thành
     sai mà không ai thấy. */
  const hoSoId = chuoi(body.ho_so_id, 64);
  let tenBo = null;
  if (hoSoId) {
    const hs = await env.DB.prepare(
      'SELECT id, ten, trang_thai FROM ho_so WHERE id = ? AND an = 0').bind(hoSoId).first();
    if (!hs) return loi('Không có bộ hồ sơ nào mang mã này', 404);
    if (hs.trang_thai === 'da_dong') {
      return loi(`Bộ "${hs.ten}" đã đóng — không nhận thêm giấy tờ. ` +
                 'Mở lại bộ (đổi trạng thái về "Đang dùng") rồi quét lần nữa.');
    }
    tenBo = hs.ten;
  }

  /* ---- SỐ CCCD PHẢI ĐỦ 12 CHỮ SỐ ---------------------------------------
     Ô "Số hiệu" của một tờ CCCD chính là số CCCD. CCCD Việt Nam (mẫu từ 2021)
     luôn 12 chữ số; lưu một số 11 chữ số vào hồ sơ lao động không phải lỗi
     phần mềm — là giấy tờ sai sự thật (xem `soCCCD()` trong src/so-ai.js, cùng
     luật với đường đọc ảnh CCCD ở src/nhansu.js).
     Bỏ trống thì thôi, không ép: có người quét CCCD trước, đối chiếu số sau. */
  const loaiGiay = chuoi(body.loai, 120);
  const soHieuTho = chuoi(body.so_hieu, 120);
  if (soHieuTho && laLoaiCCCD(loaiGiay)) {
    const { so, dung } = soCCCD(soHieuTho);
    if (!dung) {
      return loi(`Số CCCD phải đủ 12 chữ số — bạn nhập "${soHieuTho}" ` +
                 `(${so.length} chữ số). Nhìn thẻ và gõ lại, hoặc để trống.`);
    }
  }

  const nhayCam = nhomTaiLieuNhayCam(nhom) ? 1 : 0;
  /* Luật BVDLCN 91/2025/QH15: giấy tờ cá nhân phải có dấu ĐỒNG Ý — ai đồng ý,
     lúc nào, cho mục đích gì. Không đủ ba thứ đó thì KHÔNG lưu. Đây là ràng
     buộc xây vào sản phẩm, không phải câu nhắc trên màn hình. */
  const dongYBoi = chuoi(body.dong_y_boi, 200);
  const dongYMucDich = chuoi(body.dong_y_muc_dich, 300);
  if (nhayCam && (!dongYBoi || !dongYMucDich)) {
    return loi('Giấy tờ cá nhân: phải ghi rõ AI đồng ý và đồng ý cho MỤC ĐÍCH GÌ ' +
               '(Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, hiệu lực 01/01/2026)');
  }

  if (!daCauHinh(env)) {
    return loi('Chưa cấp quyền Google Drive cho ERP — chưa lưu được tài liệu. ' +
               'Xem docs/huong-dan/CAP-QUYEN-GOOGLE-DRIVE.md', 409);
  }

  /* ---- CHỐNG NHÂN ĐÔI KHI SÓNG YẾU -------------------------------------
     Kho sóng yếu: điện thoại gửi xong, Drive nhận rồi, nhưng câu trả lời
     không về tới máy → người dùng bấm "Gửi lại". Không có chốt này thì kho
     có hai bản y hệt và không ai biết bản nào mới. Điện thoại giữ NGUYÊN
     `ma_gui` qua mọi lần gửi lại, nên máy chủ nhận ra ngay. */
  const maGui = chuoi(body.ma_gui, 64);
  if (maGui) {
    const cu = await env.DB.prepare(
      'SELECT id, kho_khoa, so_trang FROM tai_lieu WHERE ma_gui = ?').bind(maGui).first();
    if (cu) {
      return json({
        ok: true, id: cu.id, da_co_san: true,
        duong_dan: cu.kho_khoa ? duongDanTep(cu.kho_khoa) : null,
        canh_bao: CANH_BAO_PHAP_LY
      });
    }
  }

  /* ---- HAI KHUÔN THÂN GỬI LÊN — VÁ REV-0054 · LỖI #2 --------------------
     ĐƯỜNG BYTE THẲNG (`body.tep_byte`, do `tlLuu` trong src/index.js dựng từ
     `Content-Type: application/octet-stream`): file đi lên NGUYÊN khối byte,
     trong Worker chỉ tồn tại ĐÚNG MỘT bản (`arrayBuffer`), `subarray` là cửa
     sổ nhìn vào cùng vùng nhớ chứ không phải bản chép.

     ĐƯỜNG BASE64 TRONG JSON (`body.tep`): giữ lại cho đường ảnh (6 MB) và cho
     mọi trình duyệt còn nhớ bản cũ. Đường này tốn ~3,7 lần cỡ file trong bộ
     nhớ Worker: thân JSON → chuỗi base64 sau `JSON.parse` → chuỗi nhị phân của
     `atob` → `Uint8Array`.

     VÌ SAO PHẢI ĐỔI: bộ nhớ 128 MB là của cả isolate, KHÔNG phải của một yêu
     cầu. Hai người cùng tải 25 MB qua đường base64 = 185 MB ⇒ chết isolate,
     kéo theo mọi yêu cầu đang bay của người khác (REV-0054 lỗi #2). Qua đường
     byte thẳng, hai lượt 25 MB chỉ còn ~50 MB — hết hẳn ca đó, mà KHÔNG phải
     hạ trần xuống 15 MB, tức không phải bắt Sếp tách đôi bản scan. */
  let bytes;
  if (body.tep_byte instanceof Uint8Array) {
    bytes = body.tep_byte;
  } else {
    const tep = String(body.tep || '');
    if (!tep) return loi('Chưa có nội dung tài liệu để lưu.');
    try { bytes = base64ToBytes(tep); }
    catch { return loi('Không đọc được nội dung file vừa gửi. Chọn lại file rồi gửi lần nữa.'); }
  }
  if (bytes.length < 200) return loi('File này rỗng hoặc đã hỏng — mở thử trên máy xem có mở được không.');
  const tranByte = laPdfGoc ? TRAN_BYTE_PDF_GOC : TRAN_BYTE_PDF;
  if (bytes.length > tranByte) {
    return loi(`File nặng ${(bytes.length / 1048576).toFixed(1)} MB, quá mức ERP nhận ` +
               `được (tối đa ${tranByte / 1048576} MB một file). ` +
               (laPdfGoc
                 ? 'Quét lại ở 200 DPI, chế độ xám hoặc đen trắng — thường nhẹ đi 3–5 ' +
                   'lần mà chữ vẫn rõ. Hoặc tách thành nhiều file, mỗi file một tài liệu.'
                 : 'Chụp lại với ít trang hơn.'));
  }
  /* ---- ĐÚNG LÀ PDF KHÔNG — soi CHỮ KÝ, không tin lời khai ---------------
     Áp cho CẢ HAI đường. File đi lên Drive mang `kieu:'application/pdf'` và
     đuôi `.pdf`; không soi ở đây thì bất cứ khối byte nào cũng vào được kho
     giấy tờ pháp lý dưới lốt PDF. Trình duyệt đã soi một lần — đây là lưới
     thứ hai, cho ca gọi thẳng API. */
  if (!laByteCuaPDF(bytes)) {
    return loi('File này không phải PDF — ruột bên trong là định dạng khác, dù tên ' +
               'file ghi là .pdf. Thử mở nó bằng trình đọc PDF xem có mở được không. ' +
               'Kho nhận ảnh JPG · PNG · HEIC và file PDF.');
  }

  /* ---- Bóc chữ TRƯỚC khi tải lên ---------------------------------------
     Cố ý: nếu AI treo thì ta chưa đẩy gì lên Drive, không để lại file mồ côi.
     Cả hai nhánh tự nuốt mọi lỗi nên không bao giờ chặn luồng lưu.

     ⚠️ PDF CÓ SẴN — CTL-0026 VÒNG 7, ĐÂY LÀ CHỖ ĐỔI LỚN NHẤT.
     Sếp Ngọc 03/09/2026: *"định dạng file sẽ là scan pdf"*. Máy scan ra HAI
     loại PDF trông y hệt nhau khi mở lên:
       · CÓ LỚP CHỮ (máy scan bật nhận dạng chữ) → chữ nằm ngay trong file,
         lấy ra được bằng thứ Workers có sẵn, không tốn đồng nào, không gọi AI.
       · CHỈ CÓ ẢNH → không có chữ nào để lấy. Phải NÓI RA, và nói bằng tiếng
         người: bản trước trả câu "cần thư viện đọc PDF, ràng buộc chi phí 0",
         bạn kho đọc câu đó sẽ tưởng ERP đang hỏng (REV-0054 lỗi #3).
     Cả hai loại đều LƯU ĐƯỢC và MỞ XEM ĐƯỢC — chỉ khác ở chỗ có tra được theo
     nội dung hay không. */
  const dsOCR = laPdfGoc
    ? []
    : (Array.isArray(body.anh_boc_chu) ? body.anh_boc_chu.slice(0, TRAN_TRANG_BOC_CHU) : []);
  /* Đưa MỌI mẩu sự thật người vừa gõ xuống làm mốc đối chiếu — xem `docTinChu()`.
     Không mốc nào trúng thì chữ vẫn LƯU, chỉ là đeo nhãn CHƯA KIỂM và không vào
     ô tìm (luật ①②③ ở khối chú thích trên `docTinChu`). */
  const boc = laPdfGoc
    ? await bocChuTrongPDF(bytes, { soHieu: soHieuTho, loai: loaiGiay, tieuDe: tieuDe })
    : await bocChu(env, dsOCR, { soHieu: soHieuTho, loai: loaiGiay, tieuDe: tieuDe });

  /* ---- Lưu lên Drive ---------------------------------------------------
     Đi qua `src/kho-file.js` — MỘT CỬA DUY NHẤT ra kho ngoài (SPEC-0005 5.1).
     Không gọi thẳng Google ở đây, để ngày nào đổi chỗ lưu thì sửa đúng một
     file. Thư mục ghi nhớ trong `sao_luu_thu_muc` nên chỉ tạo một lần cho mỗi
     nhóm (8 dòng cả đời), không phải mỗi lượt quét. */
  const id = 'tl_' + crypto.randomUUID().slice(0, 12);
  const tenFile = `${id}__${tieuDe.replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 80)}.pdf`;

  let luuXong;
  try {
    const goc = await timHoacTaoThuMuc(env, 'tailieu_goc', 'ERP - Kho tài liệu', null);
    const thuMuc = await timHoacTaoThuMuc(env, 'tailieu_' + nhom, NHOM_TAI_LIEU[nhom].ten, goc);
    luuXong = await luuFile(env, {
      duLieu: bytes, tenFile, kieu: 'application/pdf', thuMucId: thuMuc
    });
  } catch (e) {
    /* Nói thẳng là CHƯA LƯU ĐƯỢC, và điện thoại vẫn giữ bản nháp nên bấm
       "Gửi lại" là xong — không mất ảnh đã chụp.

       ⚠️ VÁ REV-0055 · THẤP-2 — KHÔNG PHUN `e.message` RA MẶT NGƯỜI DÙNG.
       `src/kho-file.js` nhét cả thân JSON của Google vào `e.message`, nên câu
       cũ ra tới bạn kho là: `Chưa gửi được lên kho: Google từ chối cấp vé
       (401). { "error": "inva… — ảnh vẫn giữ trên máy…`. Đọc câu đó không ai
       biết phải làm gì, mà lại tưởng ERP hỏng nặng.
       Chi tiết kỹ thuật đi vào `console.error` — chỗ của nó, và Workers Logs
       đang bật nên vẫn đọc được khi cần dò. Người dùng nhận đúng hai thứ họ
       dùng được: chuyện gì xảy ra, và làm gì tiếp. */
    console.error('Đẩy tài liệu lên kho hỏng:', (e && e.message) || e);
    return loi('Chưa gửi được lên kho — có thể mạng chập chờn, hoặc kho ngoài ' +
               'đang bận. Ảnh và file vẫn còn nguyên trên máy: bấm "Gửi lại" ' +
               'khi có sóng. Thử vài lần vẫn không được thì nhắn quản trị ERP.', 502);
  }

  const banGhi = {
    id,
    ma_gui: maGui,
    nhom,
    loai: loaiGiay,
    tieu_de: tieuDe,
    so_hieu: soHieuTho,
    ngay_ban_hanh: ngay(body.ngay_ban_hanh),
    ngay_het_han: ngay(body.ngay_het_han),
    han_luu: NHOM_TAI_LIEU[nhom].han_luu,
    cua_vao: cuaGhi,
    gan_id: ganId,
    /* PHASE 2 — bộ hồ sơ. NULL là giá trị bình thường, không phải thiếu sót:
       tài liệu "chưa vào bộ nào" hiện ở mục riêng, không rơi mất. */
    ho_so_id: hoSoId,
    so_trang: soTrang,
    kho_nha: luuXong.nha,
    kho_khoa: luuXong.khoa,
    co_byte: luuXong.coByte || bytes.length,
    noi_dung: boc.chu || null,
    ocr_so_trang: boc.soTrang,
    /* Mấy trang trong số đó ĐÃ ĐỐI CHIẾU được. Cột riêng chứ không suy ra từ
       `noi_dung`: mọi màn (kể cả bản khôi phục từ CSV) phải đọc được con số
       này mà không phải bóc chuỗi. */
    ocr_so_trang_neo: boc.soTrangNeo || 0,
    ocr_ghi_chu: boc.ghiChu,
    /* CHỮ NÀY TỪ ĐÂU RA — cột riêng vì Sếp cần biết TỈ LỆ kho: bao nhiêu tài
       liệu tra được theo nội dung, bao nhiêu chỉ xem được. Suy ra từ
       `ocr_so_trang` thì không phân biệt được "PDF chỉ có ảnh" với "AI đọc
       hụt", mà hai ca đó cần hai cách xử khác nhau. */
    chu_nguon: boc.nguonChu || (boc.chu ? NGUON_CHU.anh_ai : NGUON_CHU.khong),
    nhay_cam: nhayCam,
    dong_y_boi: dongYBoi,
    dong_y_luc: nhayCam ? nowVN() : null,
    dong_y_muc_dich: dongYMucDich,
    nguoi_tao: phien.nhan_su_id || null,
    tao_luc: nowVN()
  };

  /* ⚠️ `boc.chuTim` chứ KHÔNG phải `banGhi.noi_dung`. Vào ô tìm chỉ có chữ của
     trang ĐÃ ĐỐI CHIẾU, và đã gọt sạch mọi con số máy đọc — xem `chuChoOTim()`. */
  banGhi.tim_kiem = chuoiTimKiem({
    tieu_de: banGhi.tieu_de, so_hieu: banGhi.so_hieu,
    loai: banGhi.loai, nhom, noi_dung: boc.chuTim
  });

  /* ĐÚNG MỘT LƯỢT GHI D1 cho cả một lượt quét. */
  try {
    await env.DB.prepare(`
      INSERT INTO tai_lieu
        (id, ma_gui, nhom, loai, tieu_de, so_hieu, tim_kiem,
         ngay_ban_hanh, ngay_het_han, han_luu, cua_vao, gan_id, ho_so_id, so_trang,
         kho_nha, kho_khoa, co_byte, noi_dung, ocr_so_trang, ocr_so_trang_neo, ocr_ghi_chu,
         chu_nguon, nhay_cam, dong_y_boi, dong_y_luc, dong_y_muc_dich, nguoi_tao, tao_luc)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      banGhi.id, banGhi.ma_gui, banGhi.nhom, banGhi.loai, banGhi.tieu_de,
      banGhi.so_hieu, banGhi.tim_kiem, banGhi.ngay_ban_hanh, banGhi.ngay_het_han,
      banGhi.han_luu, banGhi.cua_vao, banGhi.gan_id, banGhi.ho_so_id, banGhi.so_trang,
      banGhi.kho_nha, banGhi.kho_khoa, banGhi.co_byte, banGhi.noi_dung,
      banGhi.ocr_so_trang, banGhi.ocr_so_trang_neo, banGhi.ocr_ghi_chu,
      banGhi.chu_nguon, banGhi.nhay_cam,
      banGhi.dong_y_boi, banGhi.dong_y_luc, banGhi.dong_y_muc_dich,
      banGhi.nguoi_tao, banGhi.tao_luc
    ).run();
  } catch (e) {
    /* ---- BẤM "GỬI LẠI" KHI LẦN 1 CÒN ĐANG BAY — REV-0036 lỗi #4 -----------
       Chốt `ma_gui` ở trên chỉ bắt được lần gửi ĐÃ XONG. Hai yêu cầu chồng
       nhau (hai tab, hoặc tải lại trang giữa lúc đang gửi trên 3G ~16 giây)
       thì cả hai cùng thấy `SELECT ma_gui` rỗng, cả hai cùng đẩy file lên
       Drive, rồi `UNIQUE(ma_gui)` mới chặn ở đây. Trước bản này lỗi đó BAY
       THẲNG ra ngoài: người dùng thấy báo lỗi dù tài liệu đã lưu xong, và
       Drive giữ một file MỒ CÔI không dòng nào trỏ tới — không ai dọn, không
       ai biết nó là gì (tên file mang `id` mà D1 không hề có).

       `UNIQUE` ở đây KHÔNG phải sự cố, nó là câu "đã có rồi": dọn đúng file
       mình vừa đẩy lên rồi trả về bản đã lưu, y như đường gửi lại bình thường. */
    const m = String((e && e.message) || '');

    /* ⚠️ VÁ REV-0055 · CAO-3 — GHI CSDL HỎNG THÌ PHẢI DỌN FILE VỪA ĐẨY LÊN.
       Trước bản vá, mọi lỗi KHÔNG phải `UNIQUE` đều `throw e` ra ngoài. Nhưng
       file ĐÃ nằm trên Drive rồi (lượt đẩy ở trên đã xong): kết quả là 500 cho
       người dùng CỘNG một file MỒ CÔI trên Drive mà không dòng nào trong CSDL
       trỏ tới — không ai tìm thấy, không ai dọn được. Mỗi lần Sếp bấm "Gửi
       lại" là thêm một file mồ côi nữa.
       Hồ Ly dựng được ca thật: deploy mã mới TRƯỚC khi chạy migration ⇒ câu
       `INSERT` nổ `no such column: chu_nguon` ⇒ rơi đúng vào đường này.
       Nay: dọn file, rồi trả câu TIẾNG NGƯỜI. Ném ra ngoài để lớp trên biến
       thành chữ "undefined" là hai lỗi chồng lên nhau. */
    if (!/UNIQUE constraint failed/i.test(m) || !maGui) {
      let daDon = false;
      try {
        await xoaFile(env, { nha: luuXong.nha, khoa: luuXong.khoa });
        daDon = true;
      } catch (e2) {
        /* Dọn hụt thì KHÔNG được nuốt im: file mồ côi vẫn nằm trên Drive, phải
           để lại đúng mã file trong log để dọn tay được. */
        console.error(`Tài liệu ${id}: ghi CSDL hỏng VÀ dọn file mồ côi hụt ` +
                      `(kho_khoa=${luuXong.khoa}): ${e2.message}`);
      }
      console.error(`Tài liệu ${id}: ghi CSDL hỏng: ${m}`);
      return loi('Chưa lưu được tài liệu vào kho — máy chủ đang trục trặc ở bước ' +
                 'ghi dữ liệu. File trên máy bạn vẫn còn nguyên: chọn lại rồi gửi ' +
                 'lần nữa. Nếu vẫn báo lỗi thì nhắn quản trị ERP.' +
                 (daDon ? '' : ' (Có một bản file thừa còn nằm trên kho — quản trị ' +
                  'ERP dọn giúp, bạn không phải làm gì.)'), 500);
    }

    let donDuoc = false;
    try {
      await xoaFile(env, { nha: luuXong.nha, khoa: luuXong.khoa });
      donDuoc = true;
    } catch (e2) {
      /* Dọn hụt thì KHÔNG được nuốt im: file mồ côi vẫn nằm trên Drive, phải
         để lại đúng mã file trong log để dọn tay được. */
      console.error(`Tài liệu ${maGui}: file mồ côi trên Drive chưa dọn được ` +
                    `(kho_khoa=${luuXong.khoa}): ${e2.message}`);
    }

    const cu = await env.DB.prepare(
      'SELECT id, kho_khoa, so_trang FROM tai_lieu WHERE ma_gui = ?').bind(maGui).first();
    if (!cu) throw e;          // UNIQUE vì lý do khác → không che, ném tiếp

    return json({
      ok: true, id: cu.id, da_co_san: true, so_trang: cu.so_trang,
      duong_dan: cu.kho_khoa ? duongDanTep(cu.kho_khoa) : null,
      da_don_ban_thua: donDuoc,
      canh_bao: CANH_BAO_PHAP_LY + (nhayCam ? ' ' + CANH_BAO_TRA_GIAY : '')
    });
  }

  return json({
    ok: true,
    id,
    cua_vao: cuaGhi,
    gan_id: ganId,
    gan_ten: tenNguoi,
    ho_so_id: hoSoId,
    ho_so_ten: tenBo,
    so_trang: soTrang,
    co_byte: banGhi.co_byte,
    ocr_so_trang: boc.soTrang,
    ocr_so_trang_neo: boc.soTrangNeo,
    ocr_trang: boc.trang,
    ocr_ghi_chu: boc.ghiChu,
    /* Chữ này lấy từ đâu ra — để màn hình nói đúng một trong hai câu: "tra được
       theo nội dung" hay "chỉ xem được". Đoán bằng `ocr_so_trang > 0` thì hai
       ca khác hẳn nhau bị gộp làm một. */
    chu_nguon: banGhi.chu_nguon,
    /* Có bóc được chữ thì lượt quét nào cũng phải mang theo câu này — người
       vừa quét là người duy nhất còn cầm tờ giấy trên tay để đối chiếu. */
    canh_bao_so_ai: boc.chu ? NHAN_SO_AI : null,
    duong_dan: duongDanTep(luuXong.khoa),
    canh_bao: CANH_BAO_PHAP_LY + (nhayCam ? ' ' + CANH_BAO_TRA_GIAY : '')
  });
}

/* ==========================================================================
   5. TRA CỨU  —  GET /api/tai-lieu
   ========================================================================== */
export async function danhSachTaiLieu(env, phien, thamSo) {
  const duocXem = nhomTaiLieuXemDuoc(phien);

  /* ---- MỘT KHO, HAI CỬA NHÌN  ·  CTL-0025 Đợt 2 -------------------------
     `gan_id` có mặt = đang nhìn qua cửa HỒ SƠ MỘT NGƯỜI (chỉ giấy của người
     đó). Không có = nhìn qua cửa KHO CHUNG, và kho chung thấy TẤT CẢ, kể cả
     giấy quét vào hồ sơ ai đó.

     ⚠️ Bản Đợt 1 khoá cứng `cua_vao = 'kho_chung'` ở đây. Giữ nguyên dòng đó
     là biến "hai cửa nhìn" thành HAI KHO: giấy quét ở hồ sơ biến mất khỏi kho
     chung, HCNS đi tìm một tờ quyết định phải nhớ nó được quét ở cửa nào. Bỏ
     lọc `cua_vao` KHÔNG nới quyền một chút nào — quyền vẫn cắt bằng NHÓM ở
     ngay dưới, và giấy nhân sự vốn đã thuộc nhóm `nhan_su`. */
  const ganId = String(thamSo.get('gan_id') || '').trim().slice(0, 64);

  /* Xin giấy tờ của MỘT NGƯỜI mà không có quyền xem nhóm nhân sự → 403 nói
     thẳng, KHÔNG trả danh sách rỗng. Rỗng làm người ta tưởng người này chưa có
     giấy tờ nào và đi quét lại từ đầu — che quyền bằng cách nói dối về dữ liệu
     là chỗ tệ nhất để tiết kiệm một dòng chữ. */
  if (ganId && !duocXemNhomTaiLieu(phien, NHOM_CUA_NHAN_SU)) {
    return loi('Bạn không có quyền xem giấy tờ nhân sự. Chỉ HCNS và Ban giám ' +
               'đốc mở được hồ sơ giấy tờ của người khác.', 403);
  }

  /* ---- CỬA THỨ BA: XEM MỘT BỘ HỒ SƠ  ·  PHASE 2 -------------------------
     Dùng lại NGUYÊN khuôn `?gan_id=` ở trên — cùng một hàm, cùng một câu SQL,
     cùng một chốt quyền. Khác đúng một cột trong mệnh đề `WHERE`.

     ⚠️ VÀ ĐÂY LÀ CHỖ DỄ LÀM SAI NHẤT CỦA CẢ TÍNH NĂNG: cửa `?gan_id=` có một
     chốt quyền riêng ở trên (`duocXemNhomTaiLieu(phien,'nhan_su')`) vì hồ sơ
     một NGƯỜI là dữ liệu cá nhân. Cửa `?ho_so_id=` **KHÔNG được có chốt tương
     đương** — bộ không có quyền riêng (Sếp Ngọc chốt 09/09/2026). Một bộ chứa
     giấy của nhiều nhóm; ai xem được nhóm nào thì thấy đúng giấy của nhóm ấy,
     và phần bị chặn được ĐẾM RA rồi NÓI THẲNG (`so_bi_chan` ở dưới). Thêm một
     chốt "được xem bộ hay không" ở đây chính là cấp quyền cho bộ. Đừng thêm. */
  const hoSoId = String(thamSo.get('ho_so_id') || '').trim().slice(0, 64);

  if (!duocXem.length) {
    return json({ ds: [], nhom: [], canh_bao: CANH_BAO_PHAP_LY, tong: 0, bi_cat: false, cat: null,
                  nhom_luu_duoc: [], loai_goi_y: [] });
  }

  /* Bộ có thật không — hỏi TRƯỚC khi lọc, để mã sai trả 404 chứ không trả một
     danh sách rỗng trông y như "bộ này chưa có giấy nào". */
  let bo = null;
  if (hoSoId) {
    bo = await env.DB.prepare(
      'SELECT id, ten, loai, trang_thai, ghi_chu, tao_luc FROM ho_so WHERE id = ? AND an = 0'
    ).bind(hoSoId).first();
    if (!bo) return loi('Không có bộ hồ sơ nào mang mã này', 404);
  }

  const dieuKien = [`an = 0`];
  const bien = [];
  if (ganId) {
    dieuKien.push(`cua_vao = ? AND gan_id = ?`);
    bien.push('nhan_su', ganId);
  }
  if (hoSoId) {
    dieuKien.push(`ho_so_id = ?`);
    bien.push(hoSoId);
  }
  /* Kho chung: cho lọc ra đúng những tờ CHƯA vào bộ nào. Đây là hàng đợi việc
     của Sếp ("còn tờ nào chưa xếp vào bộ"), không phải một bộ lọc trang trí. */
  if (!hoSoId && thamSo.get('chua_vao_bo') === '1') {
    dieuKien.push(`ho_so_id IS NULL`);
  }

  /* Lọc theo nhóm NGAY TRONG CÂU SQL. Cố ý không lấy hết rồi lọc trong JS:
     lấy hết là dữ liệu đã rời máy chủ, và chỉ cần một lần quên lọc là lộ. */
  const nhomHoi = String(thamSo.get('nhom') || '').trim();
  if (nhomHoi) {
    if (!duocXemNhomTaiLieu(phien, nhomHoi)) {
      return loi('Bạn không có quyền xem nhóm giấy tờ này', 403);
    }
    dieuKien.push('nhom = ?'); bien.push(nhomHoi);
  } else {
    dieuKien.push(`nhom IN (${duocXem.map(() => '?').join(',')})`);
    bien.push(...duocXem);
  }

  /* Tìm CÓ DẤU VÀ KHÔNG DẤU: bỏ dấu câu hỏi rồi soi vào cột `tim_kiem` vốn đã
     bỏ dấu sẵn. Nhờ vậy "giay attp" và "Giấy ATTP" ra cùng một kết quả mà
     không cần bảng tìm kiếm riêng, không cần lượt ghi nào thêm. */
  const q = boDau(thamSo.get('q') || '');
  /* ---- TRA THEO TÊN BỘ  ·  PHASE 2 --------------------------------------
     Đo thật ở PHASE 1: gõ *"hồ sơ pháp lý doanh nghiệp"* trả về **0 kết quả**
     — chữ "hồ sơ" không nằm trong ô tìm của tờ nào cả. Nay tên bộ được so
     NGAY LÚC TRA, bằng chính `boDau()` ở trên, nên:
       · đổi tên bộ xong là tra bằng tên mới ra ngay, tên cũ hết ra ngay;
       · KHÔNG có chuỗi tra cứu nào phải bảo trì, không lượt ghi D1 nào thêm.
     `ho_so` là bảng nhỏ (chục dòng), đọc cả bảng rẻ hơn hẳn việc dựng một
     đường tìm kiếm thứ hai. Chỉ đọc KHI có câu hỏi — 0 đồng cho màn thường. */
  let boTrung = [];
  if (q && !hoSoId) {
    try {
      const rb = await env.DB.prepare('SELECT id, ten FROM ho_so WHERE an = 0').all();
      const tuKhoa = q.split(' ').filter(Boolean).slice(0, 6);
      boTrung = (rb.results || [])
        .filter(b => { const s = boDau(b.ten); return tuKhoa.every(t => s.includes(t)); })
        .map(b => b.id);
    } catch (e) {
      /* Tra bộ hụt thì tra tài liệu vẫn phải chạy — nhưng KHÔNG im: thiếu kết
         quả mà không nói là một câu trả lời sai trông y như câu đúng. */
      console.error('Tra theo tên bộ hồ sơ:', e.message);
    }
  }
  if (q) {
    const veTu = q.split(' ').filter(Boolean).slice(0, 6)
      .map(() => 'tim_kiem LIKE ?');
    const bienTu = q.split(' ').filter(Boolean).slice(0, 6)
      .map(tu => '%' + tu.replace(/[%_]/g, ' ') + '%');
    if (boTrung.length) {
      /* GỘP thành MỘT mệnh đề có ngoặc: `dieuKien` được dùng lại NGUYÊN VĂN
         cho câu ĐẾM ở `nhanCat` và cho dải đếm ba vế. Đẩy `OR` vào mà không
         đóng ngoặc là mọi con số đếm đều sai — và sai âm thầm. */
      dieuKien.push(`((${veTu.join(' AND ')}) OR ho_so_id IN (${boTrung.map(() => '?').join(',')}))`);
      bien.push(...bienTu, ...boTrung);
    } else {
      for (let i = 0; i < veTu.length; i++) { dieuKien.push(veTu[i]); bien.push(bienTu[i]); }
    }
  }

  const sapHet = thamSo.get('sap_het_han') === '1';
  if (sapHet) dieuKien.push(`ngay_het_han IS NOT NULL AND ngay_het_han <= date('now','+7 hours','+60 days')`);

  const GH = 50;
  /* ⚠️ `trich` CẮT Ở MÁY CHỦ CHO GIẤY TỜ NHẠY CẢM — REV-0036 lỗi #5.
     180 ký tự đầu của chữ đã bóc từ một tờ CCCD hay hợp đồng lao động là RUỘT
     của giấy tờ đó: họ tên, số CCCD, mức lương thường nằm ngay mấy dòng đầu.
     Mà đường danh sách KHÔNG ghi nhật ký (nó không mở một tài liệu cụ thể nào),
     nên ai đó đọc được ruột giấy tờ nhạy cảm mà không để lại vết — đúng thứ
     Luật BVDLCN 91/2025/QH15 bắt phải ghi lại.
     Muốn đọc nội dung giấy tờ nhạy cảm thì phải MỞ nó ra (`/api/tai-lieu/mo`),
     và mở là có nhật ký. Cắt bằng CASE trong SQL, không lọc trong JS: dữ liệu
     không rời máy chủ thì không có chỗ nào quên lọc.
     Danh sách vẫn còn tiêu đề, số hiệu, ngày hết hạn — đủ để tra cứu. */
  const kq = await env.DB.prepare(`
    SELECT id, nhom, loai, tieu_de, so_hieu, ngay_ban_hanh, ngay_het_han,
           han_luu, so_trang, co_byte, ocr_so_trang, ocr_so_trang_neo, chu_nguon,
           ocr_ghi_chu, nhay_cam, nguoi_tao, tao_luc, cua_vao, gan_id,
           -- PHASE 2. Chỉ lấy hai cột TRẦN; tên bộ và tên tờ thay thế được
           -- điền ở dưới bằng ĐÚNG MỘT lượt đọc gộp, không phải câu con nhân
           -- lên theo từng dòng — và quan trọng hơn: điền ở JS thì mới CHE
           -- được tên tờ giấy thuộc nhóm người này không xem được.
           ho_so_id, thay_the_boi_id,
           -- Tên người tờ giấy này thuộc về — để kho chung nói được "của ai"
           -- thay vì bày một mã ns_xxx. Câu con, KHÔNG phải JOIN: dieuKien ở
           -- trên viết cột trần (an, nhom) và được dùng lại NGUYÊN VĂN cho câu
           -- ĐẾM ở nhanCat — thêm JOIN là cột trần thành nhập nhằng ở đúng câu
           -- đếm mà không ai thử.
           (SELECT ho_ten FROM nhan_su WHERE nhan_su.id = tai_lieu.gan_id) AS gan_ten,
           CASE WHEN nhay_cam = 1 THEN NULL
                ELSE substr(COALESCE(noi_dung,''), 1, 180) END AS trich
      FROM tai_lieu
     WHERE ${dieuKien.join(' AND ')}
     ORDER BY (ngay_het_han IS NULL), ngay_het_han, tao_luc DESC
     LIMIT ${GH + 1}
  `).bind(...bien).all();

  /* Danh sách bị cắt thì PHẢI NÓI RA — luật "danh sách bị cắt mà không nói là
     đã cắt" (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md Mục 2). Dùng CHUNG
     `src/cat-danh-sach.js` chứ không tự viết lại lần thứ hai: bản tự viết cũ
     ở đây trả đúng `bi_cat` nhưng KHÔNG có tổng thật, và mỗi bản chép tay là
     một chỗ nữa để lệch (REV-0040). Câu đếm chỉ chạy KHI có cắt — 0 đồng cho
     ca thường ngày. */
  const { ds, biCat } = catBot(kq, GH);
  const cat = await nhanCat(env, biCat, GH,
    `SELECT COUNT(*) AS n FROM tai_lieu WHERE ${dieuKien.join(' AND ')}`, bien,
    'Gõ vào ô tìm hoặc chọn một nhóm để thu hẹp lại.');

  /* ---- BỘ HỒ SƠ + QUAN HỆ THAY THẾ, ĐIỀN BẰNG MỘT LƯỢT ĐỌC · PHASE 2 -----
     Ba nhãn phải hiện trên thẻ, và cả ba đều là chữ của DÒNG KHÁC:
       ① tờ này thuộc bộ nào          (ho_so.ten)
       ② tờ này ĐÃ BỊ tờ nào thay thế (tai_lieu.tieu_de của tờ mới)
       ③ tờ này THAY THẾ cho tờ nào   (chiều ngược, hỏi bằng thay_the_boi_id)

     ⚠️ CHE THEO NHÓM, KHÔNG CHE THEO BỘ. Tên một tờ giấy nhóm `nhan_su` là
     chữ mà chỉ người xem được nhóm đó mới được đọc — kế toán trưởng thấy tờ
     `02/2026/PLDN` bị thay thế thì được biết CÓ tờ thay thế, nhưng nếu tờ mới
     nằm ở nhóm họ không xem được thì chỉ hiện câu "thuộc nhóm bạn không xem
     được", KHÔNG hiện tên. Che ở đây (JS) chứ không ở SQL vì phải chạy qua
     đúng hàm `duocXemNhomTaiLieu` — viết lại luật quyền bằng SQL là mở một
     bản chép tay thứ hai của bảng quyền.

     Một lượt ĐỌC D1 cho cả màn (đọc rẻ hơn ghi cả một bậc), và chỉ chạy khi
     thật sự có gì để điền — kho chưa dùng bộ thì 0 đồng. */
  const canBo = [...new Set(ds.map(r => r.ho_so_id).filter(Boolean))];
  const idTrangHien = ds.map(r => r.id);
  const canTo = [...new Set(ds.map(r => r.thay_the_boi_id).filter(Boolean))];

  if (canBo.length) {
    try {
      const r = await env.DB.prepare(
        `SELECT id, ten, trang_thai FROM ho_so WHERE id IN (${canBo.map(() => '?').join(',')})`
      ).bind(...canBo).all();
      const map = new Map((r.results || []).map(x => [x.id, x]));
      for (const d of ds) {
        const b = d.ho_so_id ? map.get(d.ho_so_id) : null;
        d.ho_so_ten = b ? b.ten : null;
        d.ho_so_da_dong = b ? (b.trang_thai === 'da_dong' ? 1 : 0) : 0;
      }
    } catch (e) {
      /* Điền hụt thì THÔI — danh sách tài liệu vẫn phải hiện. Nhưng KHÔNG bịa
         một cái tên: `null` để giao diện im lặng bỏ nhãn bộ. */
      console.error('Điền tên bộ hồ sơ:', e.message);
    }
  }

  if (canTo.length || idTrangHien.length) {
    try {
      const dk = [];
      const bd = [];
      if (canTo.length) { dk.push(`id IN (${canTo.map(() => '?').join(',')})`); bd.push(...canTo); }
      if (idTrangHien.length) {
        dk.push(`thay_the_boi_id IN (${idTrangHien.map(() => '?').join(',')})`);
        bd.push(...idTrangHien);
      }
      const r = await env.DB.prepare(
        `SELECT id, nhom, tieu_de, so_hieu, thay_the_boi_id FROM tai_lieu
          WHERE an = 0 AND (${dk.join(' OR ')})`
      ).bind(...bd).all();
      const theoId = new Map((r.results || []).map(x => [x.id, x]));
      const nguoc = new Map();
      for (const x of (r.results || [])) {
        if (x.thay_the_boi_id && !nguoc.has(x.thay_the_boi_id)) nguoc.set(x.thay_the_boi_id, x);
      }
      /* Một hàm cho cả hai chiều — hai bản chép tay của cùng một chốt che là
         hai chỗ để một bên quên che. */
      const nhan = (x) => {
        if (!x) return null;
        return duocXemNhomTaiLieu(phien, x.nhom)
          ? { id: x.id, tieu_de: x.tieu_de, so_hieu: x.so_hieu, xem_duoc: true }
          : { id: null, tieu_de: null, so_hieu: null, xem_duoc: false };
      };
      for (const d of ds) {
        d.thay_the_boi = d.thay_the_boi_id ? nhan(theoId.get(d.thay_the_boi_id)) : null;
        d.thay_the_cho = nhan(nguoc.get(d.id));
      }
    } catch (e) {
      console.error('Điền quan hệ thay thế:', e.message);
    }
  }

  /* ---- "BỘ NÀY CÓ N GIẤY TỜ BẠN KHÔNG ĐƯỢC XEM"  ·  PHASE 2 -------------
     ⚠️ SẾP NGỌC CHỐT 09/09/2026, NGUYÊN VĂN YÊU CẦU: *không giấu im, không
     hiện danh sách rỗng*. Vì bộ KHÔNG có quyền riêng, một bộ hoàn toàn có thể
     chứa giấy thuộc nhóm người đang xem không mở được — bộ *Hồ sơ pháp lý
     doanh nghiệp* chứa CCCD người đại diện (nhóm `nhan_su`) là ca thật.

     Chỉ trả về CON SỐ. Không trả tên, không trả nhóm, không trả số hiệu: nói
     "còn 1 tờ nữa" là đủ để người ta biết đi hỏi ai; nói "còn 1 tờ CCCD của
     ông X" là đã để họ đọc được thứ họ không có quyền đọc. */
  let soBiChan = 0;
  if (hoSoId) {
    try {
      const c = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM tai_lieu
          WHERE an = 0 AND ho_so_id = ?
            AND nhom NOT IN (${duocXem.map(() => '?').join(',')})`
      ).bind(hoSoId, ...duocXem).first();
      soBiChan = Number(c?.n) || 0;
    } catch (e) {
      /* Đếm hụt thì KHÔNG được im: nói là chưa đếm được, đừng in số 0 trông
         như đã đếm và không thiếu gì. */
      console.error('Đếm giấy bị chặn trong bộ:', e.message);
      soBiChan = -1;
    }
  }

  /* ---- BA VẾ: TÌM ĐƯỢC · CÓ CHỮ MÀ CHƯA TRA ĐƯỢC · CHỈ XEM ĐƯỢC --------
     Sếp Ngọc cần con số này để biết có phải đi chỉnh máy scan hay không. Một
     kho mà 90% tài liệu "chỉ xem được" thì ô tìm kiếm gần như vô dụng, mà
     nhìn từng thẻ một thì không bao giờ thấy ra điều đó.

     ⚠️ VÁ REV-0055 VÒNG 2 · CAO-A — ĐẾM BẰNG ĐÚNG THỨ Ô TÌM DÙNG.
     Bản trước đếm `ocr_so_trang > 0`, tức "có bóc ra được chữ không". Nhưng
     dòng chữ hiện trên màn hình hứa một điều KHÁC: "tìm được theo NỘI DUNG".
     Hai thứ đó không bằng nhau, và chỗ lệch chính là chỗ ERP nói dối:
     Hồ Ly đo trên CSDL thật, 5 file PDF thật — ERP khoe 5, sự thật 3, THỔI LÊN
     40%; gõ "maslow" (từ CÓ THẬT trong file) trả về 0 kết quả.
     Đó đúng là bệnh đã làm vòng 1 FAIL, chỉ đổi đường đi: vòng 1 nói dối qua
     nhãn "đã đối chiếu", vòng 2 nói dối qua dải đếm. Và nó TỰ NẶNG THÊM —
     càng nhiều tài liệu chưa đối chiếu được thì số càng thổi.

     Nay đếm bằng ĐÚNG hai điều kiện quyết định chữ có vào cột `tim_kiem` hay
     không — đọc thẳng từ `chuoiTimKiem()` + luật ③ của khối mỏ neo:
       ① `ocr_so_trang_neo > 0` — chỉ trang ĐÃ ĐỐI CHIẾU mới được vào ô tìm;
       ② `nhay_cam = 0`         — nhóm nhạy cảm thì ruột giấy KHÔNG vào ô tìm,
                                  dù chữ có lành tới đâu (vá REV-0040 #4).
     Đổi một trong hai luật trên thì PHẢI đổi câu này cùng lúc, không thì dải
     đếm lại nói dối lần nữa. Bàn đo `do-kho-tai-lieu` ⑱ chốt bằng ĐƯỜNG CUỐI:
     lưu N file, gõ tìm từng file, số tra ra được PHẢI khớp con số ERP khoe.

     Vế GIỮA sinh ra để không mất thông tin khi hạ con số vế đầu: tài liệu có
     chữ mà chưa tra được theo nội dung là ca CÓ CÁCH XỬ (gõ số hiệu vào là máy
     đối chiếu lại được), khác hẳn tài liệu không có chữ nào.

     MỘT lượt ĐỌC D1 thêm cho cả màn (đọc rẻ hơn ghi cả một bậc), đếm trên ĐÚNG
     bộ điều kiện của danh sách nên con số luôn khớp thứ đang hiện — đếm trên cả
     bảng thì lọc theo nhóm xong tỉ lệ vẫn đứng yên, và đó là một con số nói
     dối. Đếm trong SQL để dữ liệu không rời máy chủ. */
  let dem = null;
  try {
    const d = await env.DB.prepare(`
      SELECT SUM(CASE WHEN ocr_so_trang_neo > 0 AND nhay_cam = 0
                      THEN 1 ELSE 0 END) AS tra,
             SUM(CASE WHEN ocr_so_trang > 0
                       AND NOT (ocr_so_trang_neo > 0 AND nhay_cam = 0)
                      THEN 1 ELSE 0 END) AS chua,
             SUM(CASE WHEN ocr_so_trang > 0 THEN 0 ELSE 1 END) AS xem
        FROM tai_lieu WHERE ${dieuKien.join(' AND ')}`).bind(...bien).first();
    dem = {
      tra_cuu_duoc: Number(d?.tra) || 0,
      co_chu_chua_tra_duoc: Number(d?.chua) || 0,
      chi_xem_duoc: Number(d?.xem) || 0
    };
  } catch (e) {
    /* Đếm hụt thì THÔI, không làm hỏng cả màn danh sách — nhưng cũng không
       bịa một con số 0 trông như đã đếm: `null` để giao diện im lặng bỏ dải. */
    console.error('Đếm tỉ lệ tra cứu được:', e.message);
    dem = null;
  }

  return json({
    ds,
    dem_chu: dem,
    tong: ds.length,
    bi_cat: biCat,
    cat,
    tran: GH,
    nhom: duocXem.map(m => ({ ma: m, ...NHOM_TAI_LIEU[m] })),
    nhom_luu_duoc: nhomTaiLieuLuuDuoc(phien),
    /* Cửa hồ sơ nhân sự: trả kèm bộ loại giấy tờ + quyền quét, để giao diện
       KHÔNG giữ bản chép tay nào của hai thứ đó. Một chỗ khai, một đường đi. */
    gan_id: ganId || null,
    loai_goi_y: ganId ? LOAI_GIAY_NHAN_SU : [],
    duoc_quet_nhan_su: duocLuuNhomTaiLieu(phien, NHOM_CUA_NHAN_SU),
    /* ---- CỬA XEM MỘT BỘ  ·  PHASE 2 ------------------------------------
       Bảng kiểm tính trên ĐÚNG những tờ người này thấy được, và `so_bi_chan`
       đi kèm để giao diện nói thẳng rằng chỗ "thiếu" có thể không thiếu thật.
       Trả một bảng kiểm trơn mà giấu con số bị chặn là bịa ra một kết luận. */
    ho_so: bo ? {
      id: bo.id, ten: bo.ten, loai: bo.loai,
      ten_loai: LOAI_HO_SO[bo.loai]?.ten || bo.loai,
      trang_thai: bo.trang_thai, ghi_chu: bo.ghi_chu, tao_luc: bo.tao_luc,
      bang_kiem: soatBangKiem(bo.loai, ds),
      so_bi_chan: soBiChan
    } : null,
    canh_bao: CANH_BAO_PHAP_LY + (ganId ? ' ' + CANH_BAO_TRA_GIAY : '')
  });
}

/* ==========================================================================
   5b. HỒ SƠ (BỘ)  —  GET /api/ho-so  ·  POST /api/ho-so/luu
   ---------------------------------------------------------------------------
   ⚠️ ĐỌC LẠI MỘT LẦN NỮA TRƯỚC KHI SỬA BẤT CỨ DÒNG NÀO Ở ĐÂY:
   BỘ KHÔNG CÓ QUYỀN RIÊNG. Ba hàm dưới đây không được gọi bất cứ chốt quyền
   nào theo BỘ. Chúng chỉ mượn lại đúng hai chốt đã có của kho tài liệu:
     · `nhomTaiLieuLuuDuoc(phien).length` — lập/sửa bộ là việc văn thư, ai lưu
       được ít nhất một nhóm giấy thì làm được. Bộ là NHÃN, không phải giấy.
     · `duocLuuNhomTaiLieu(phien, tl.nhom)` — đưa MỘT TỜ vào/ra bộ là SỬA tờ
       giấy đó, nên đi đúng chốt của `suaTaiLieu`, không nới một ly.
   ========================================================================== */

/** Đếm giấy trong từng bộ — CHỈ đếm giấy người này xem được, và nói ra là đã
 *  lọc. Đếm cả giấy họ không xem được là để họ suy ra kho có gì; đếm rồi im
 *  lặng là để họ tưởng bộ chỉ có bấy nhiêu. Chọn: đếm phần thấy được + trả
 *  kèm con số bị chặn ở màn xem một bộ. */
export async function danhSachHoSo(env, phien) {
  const duocXem = nhomTaiLieuXemDuoc(phien);
  const GH = 100;
  const kq = await env.DB.prepare(`
    SELECT id, ten, loai, trang_thai, ghi_chu, nguoi_tao, tao_luc
      FROM ho_so
     WHERE an = 0
     ORDER BY (trang_thai = 'da_dong'), ten
     LIMIT ${GH + 1}`).all();
  const { ds, biCat } = catBot(kq, GH);
  const cat = await nhanCat(env, biCat, GH,
    'SELECT COUNT(*) AS n FROM ho_so WHERE an = 0', [],
    'Đóng bớt những bộ đã xong để danh sách gọn lại.');

  /* MỘT lượt đọc gộp cho cả màn, không phải một lượt cho mỗi bộ. Kho chưa có
     bộ nào thì không tốn lượt nào. */
  if (ds.length && duocXem.length) {
    try {
      const r = await env.DB.prepare(`
        SELECT ho_so_id, COUNT(*) AS n
          FROM tai_lieu
         WHERE an = 0 AND ho_so_id IS NOT NULL
           AND nhom IN (${duocXem.map(() => '?').join(',')})
         GROUP BY ho_so_id`).bind(...duocXem).all();
      const dem = new Map((r.results || []).map(x => [x.ho_so_id, Number(x.n) || 0]));
      for (const b of ds) b.so_giay = dem.get(b.id) || 0;
    } catch (e) {
      console.error('Đếm giấy theo bộ:', e.message);
      for (const b of ds) b.so_giay = null;      // null = CHƯA ĐẾM ĐƯỢC, khác 0
    }
  } else {
    for (const b of ds) b.so_giay = 0;
  }

  for (const b of ds) {
    b.ten_loai = LOAI_HO_SO[b.loai]?.ten || b.loai;
    b.so_can = bangKiemHoSo(b.loai).length;
  }

  return json({
    ds, bi_cat: biCat, cat, tran: GH,
    loai: MA_LOAI_HO_SO.map(m => ({ ma: m, ten: LOAI_HO_SO[m].ten, so_can: bangKiemHoSo(m).length })),
    /* Giao diện KHÔNG tự đoán ai được lập bộ — máy chủ trả lời, và máy chủ
       vẫn kiểm lại ở `luuHoSo`. */
    sua_duoc: nhomTaiLieuLuuDuoc(phien).length > 0,
    canh_bao: CANH_BAO_PHAP_LY
  });
}

/** Lập bộ mới, hoặc đổi tên / đổi loại / đóng–mở một bộ đã có.
 *  Ghi vết vào SỔ SỬA CHUNG `lich_su_thay_doi_nen` (CTL-0017) — KHÔNG đẻ bảng
 *  nhật ký thứ hai. */
export async function luuHoSo(env, phien, body) {
  if (!nhomTaiLieuLuuDuoc(phien).length) {
    return loi('Bạn không có quyền lập hoặc sửa bộ hồ sơ. Nhờ HCNS hoặc Admin.', 403);
  }
  const id = chuoi(body.id, 64);
  /* ⚠️ CHỈ NHẬN TRƯỜNG NƠI GỌI THẬT SỰ GỬI (xem khối chú thích ở phần SỬA bên
     dưới). Nên phép kiểm cũng phải chạy TRÊN ĐÚNG những trường đó: bắt gửi kèm
     `ten` chỉ để đóng một bộ là ép nơi gọi chép lại giá trị cũ, mà chép lại là
     một chỗ nữa để chép sai. */
  const co = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const ten = chuoi(body.ten, 200);
  if ((!id || co('ten')) && (!ten || ten.length < 3)) {
    return loi('Đặt tên cho bộ hồ sơ (ít nhất 3 ký tự) — để trống thì sau này không ai tìm ra nó.');
  }
  const loaiBo = chuoi(body.loai, 40) || 'khac';
  if (co('loai') && !LOAI_HO_SO[loaiBo]) return loi(`Loại hồ sơ "${loaiBo}" không có thật`);
  const trangThai = chuoi(body.trang_thai, 20) || 'dang_dung';
  if (co('trang_thai') && !TRANG_THAI_HO_SO.includes(trangThai)) {
    return loi('Trạng thái bộ hồ sơ không hợp lệ');
  }
  const ghiChu = chuoi(body.ghi_chu, 500);

  const nguoiTen = phien.ho_ten || phien.ten_dang_nhap || phien.nhan_su_id || null;
  const luc = nowVN();

  /* ---- LẬP BỘ MỚI — 1 lượt ghi D1 --------------------------------------- */
  if (!id) {
    const idMoi = TIEN_TO_HO_SO + crypto.randomUUID().slice(0, 12);
    try {
      await env.DB.prepare(`
        INSERT INTO ho_so (id, ten, loai, trang_thai, ghi_chu, nguoi_tao, tao_luc, an)
        VALUES (?,?,?,?,?,?,?,0)`
      ).bind(idMoi, ten, loaiBo, trangThai, ghiChu, phien.nhan_su_id || null, luc).run();
    } catch (e) {
      /* `UNIQUE` ở đây KHÔNG phải sự cố — nó là câu "đã có bộ tên này rồi".
         Ném nguyên lỗi SQLite ra mặt người dùng là hai lỗi chồng lên nhau. */
      if (/UNIQUE constraint failed/i.test(String(e?.message || ''))) {
        return loi(`Đã có một bộ tên "${ten}". Mở bộ đó ra dùng, hoặc đặt tên khác ` +
                   '(ví dụ thêm tên pháp nhân hoặc năm vào cuối).', 409);
      }
      console.error('Lập bộ hồ sơ:', e.message);
      return loi('Chưa lập được bộ hồ sơ — máy chủ đang trục trặc ở bước ghi dữ liệu.', 500);
    }
    return json({ ok: true, id: idMoi, ten, loai: loaiBo, trang_thai: trangThai, luot_ghi_d1: 1 });
  }

  /* ---- SỬA BỘ ĐÃ CÓ ----------------------------------------------------- */
  const cu = await env.DB.prepare(
    'SELECT * FROM ho_so WHERE id = ? AND an = 0').bind(id).first();
  if (!cu) return loi('Không có bộ hồ sơ nào mang mã này', 404);

  /* ⚠️ CHỈ NHẬN TRƯỜNG NƠI GỌI THẬT SỰ GỬI — cùng luật với `suaTaiLieu`.
     "Không gửi = không đụng tới", KHÔNG phải "gửi rỗng = xoá trắng". Bàn đo
     `do-ho-so-bo` ⑥ bắt được đúng ca này: gọi đổi TÊN mà không kèm `ghi_chu`
     thì bản trước thổi bay luôn ghi chú của bộ, lặng lẽ, và còn tính thêm một
     lượt ghi lịch sử cho một thay đổi không ai yêu cầu. */
  const tenCuoi   = co('ten') ? ten : cu.ten;
  const loaiCuoi  = co('loai') ? loaiBo : cu.loai;
  const ttCuoi    = co('trang_thai') ? trangThai : cu.trang_thai;
  const ghiCuoi   = co('ghi_chu') ? ghiChu : (cu.ghi_chu ?? null);

  const doi = [];
  if (tenCuoi !== cu.ten) doi.push(['ten', cu.ten, tenCuoi]);
  if (loaiCuoi !== cu.loai) doi.push(['loai', cu.loai, loaiCuoi]);
  if (ttCuoi !== cu.trang_thai) doi.push(['trang_thai', cu.trang_thai, ttCuoi]);
  if ((ghiCuoi || '') !== (cu.ghi_chu || '')) doi.push(['ghi_chu', cu.ghi_chu, ghiCuoi]);
  /* Không đổi gì thì KHÔNG ghi gì — 0 lượt ghi D1, 0 dòng lịch sử rác. */
  if (!doi.length) return json({ ok: true, khong_doi: true, luot_ghi_d1: 0 });

  const cauLenh = [
    env.DB.prepare('UPDATE ho_so SET ten = ?, loai = ?, trang_thai = ?, ghi_chu = ? WHERE id = ?')
      .bind(tenCuoi, loaiCuoi, ttCuoi, ghiCuoi, id)
  ];
  for (const [truong, giaCu, giaMoi] of doi) {
    cauLenh.push(env.DB.prepare(
      `INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                         nguoi_id, nguoi_ten, luc)
       VALUES ('ho_so', ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, truong, giaCu ?? null, giaMoi ?? null, phien.nhan_su_id || null, nguoiTen, luc));
  }

  /* ⚠️ ĐỔI TÊN BỘ KHÔNG PHẢI ĐỘNG VÀO MỘT TỜ GIẤY NÀO.
     Đây là lý do tên bộ KHÔNG nằm trong cột `tim_kiem` (xem khối chú thích ở
     `chuoiTimKiem`): tra theo tên bộ được so ngay lúc ĐỌC, nên đổi tên xong là
     tra bằng tên mới ra ngay, tên cũ hết ra ngay, mà tốn ĐÚNG 0 lượt ghi trên
     bảng `tai_lieu`. Đổi tên một bộ 200 tờ vẫn là 1 UPDATE + N dòng lịch sử. */
  await env.DB.batch(cauLenh);
  return json({
    ok: true, id, ten: tenCuoi, loai: loaiCuoi, trang_thai: ttCuoi,
    luot_ghi_d1: cauLenh.length
  });
}

/* ==========================================================================
   5c. ĐƯA MỘT TỜ VÀO BỘ / RÚT RA  —  POST /api/tai-lieu/vao-bo
   ---------------------------------------------------------------------------
   ⚠️ VÌ SAO CÓ ĐƯỜNG "GẮN SAU" TRONG KHI REV-0046 #2 ĐÃ CHỐT LÀ KHÔNG NÊN CÓ.
   Chốt đó nói về giấy NHÂN SỰ: gắn người sau thì tờ giấy mồ côi một quãng dài
   vô hạn, mà quên gắn thì không ai biết. Bộ hồ sơ khác ở hai chỗ đo được:
     ① Ba tờ giấy ĐANG NẰM TRÊN HỆ THỐNG (02/2026/PLDN, 03/2026/PLDN,
        01/2026/ĐL) không có đường nào khác để vào bộ — migration cố ý KHÔNG
        chạy `UPDATE` nào trên dữ liệu cũ, nên Sếp phải kéo tay.
     ② "Chưa vào bộ nào" KHÔNG phải trạng thái hỏng: tuyệt đại đa số giấy tờ
        đời thật không thuộc bộ nào, và kho chung vẫn tra ra chúng bình thường.
   Nên đường quét thẳng vào bộ vẫn là đường chính (0 lượt ghi thêm), còn đây là
   một VIỆC NGƯỜI TA BẤM, tốn lượt ghi của riêng nó: 1 UPDATE + 1 dòng lịch sử.

   QUYỀN: đưa một tờ vào/ra bộ là SỬA tờ giấy đó ⇒ đi ĐÚNG chốt của `suaTaiLieu`
   (`duocLuuNhomTaiLieu` theo NHÓM của tờ giấy). Không có chốt nào theo BỘ.
   ========================================================================== */
export async function taiLieuVaoBo(env, phien, body) {
  const { tl, loi: l } = await layVaKiemQuyen(env, phien, body.id);
  if (l) return l;
  if (!duocLuuNhomTaiLieu(phien, tl.nhom)) {
    return loi(`Bạn không có quyền sửa tài liệu nhóm "${NHOM_TAI_LIEU[tl.nhom]?.ten || tl.nhom}"`, 403);
  }

  /* `null` (hoặc chuỗi rỗng) = RÚT KHỎI BỘ. Cố ý cho rút: xếp nhầm bộ mà không
     rút ra được thì người ta quay về thói ẩn tờ giấy đi rồi quét lại. */
  const boMoi = chuoi(body.ho_so_id, 64);
  if ((tl.ho_so_id || null) === (boMoi || null)) {
    return json({ ok: true, khong_doi: true, luot_ghi_d1: 0 });
  }

  let tenBo = null;
  if (boMoi) {
    const hs = await env.DB.prepare(
      'SELECT id, ten, trang_thai FROM ho_so WHERE id = ? AND an = 0').bind(boMoi).first();
    if (!hs) return loi('Không có bộ hồ sơ nào mang mã này', 404);
    if (hs.trang_thai === 'da_dong') {
      return loi(`Bộ "${hs.ten}" đã đóng — không nhận thêm giấy tờ. ` +
                 'Mở lại bộ rồi thử lần nữa.');
    }
    tenBo = hs.ten;
  }

  const nguoiTen = phien.ho_ten || phien.ten_dang_nhap || phien.nhan_su_id || null;
  const luc = nowVN();
  await env.DB.batch([
    env.DB.prepare('UPDATE tai_lieu SET ho_so_id = ? WHERE id = ?').bind(boMoi || null, tl.id),
    /* SỔ SỬA CHUNG của cả ERP (CTL-0017) — KHÔNG đẻ bảng nhật ký thứ hai. */
    env.DB.prepare(
      `INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                         nguoi_id, nguoi_ten, luc)
       VALUES ('tai_lieu', ?, 'ho_so_id', ?, ?, ?, ?, ?)`
    ).bind(tl.id, tl.ho_so_id || null, boMoi || null, phien.nhan_su_id || null, nguoiTen, luc)
  ]);

  return json({ ok: true, id: tl.id, ho_so_id: boMoi || null, ho_so_ten: tenBo, luot_ghi_d1: 2 });
}

/* ==========================================================================
   5d. TỜ NÀY ĐÃ BỊ TỜ KIA THAY THẾ  —  POST /api/tai-lieu/thay-the
   ---------------------------------------------------------------------------
   🔴 ĐÂY LÀ RỦI RO ĐANG NẰM TRÊN HỆ THỐNG THẬT, KHÔNG PHẢI TIỆN NGHI.
   Kho có GCN đăng ký doanh nghiệp `02/2026/PLDN` và bản Sửa đổi lần 1
   `03/2026/PLDN` nằm HAI DÒNG RỜI NHAU. Mở tờ 02 ra, màn hình không nói một
   chữ nào về chuyện nó đã bị sửa đổi. Ai đó SẼ dùng tờ 02 đi làm thủ tục.

   BA LUẬT, Sếp Ngọc chốt 09/09/2026:
   ① ĐÁNH DẤU "HẾT HIỆU LỰC" + CHỈ SANG TỜ MỚI. Hai chiều: tờ cũ đeo dải cảnh
      báo và một đường dẫn sang tờ mới; tờ mới ghi rõ nó thay thế tờ nào.
   ② CẤM ẨN TỜ CŨ ĐI. SPEC-0005 Mục 7.5 cấm làm mất dấu tài liệu gốc, và bản
      sửa đổi KHÔNG làm bản gốc vô giá trị — vẫn cần để chứng minh lịch sử
      pháp nhân. Tờ cũ vẫn mở được, vẫn tải được, vẫn tra ra.
   ③ NGƯỜI PHẢI BẤM XÁC NHẬN. Máy được phép GỢI Ý (xem `goiYThayThe`) nhưng
      KHÔNG BAO GIỜ tự nối. Nối sai một cặp là dán nhãn "hết hiệu lực" lên một
      tờ giấy còn hiệu lực — nguy hơn hẳn cái nó định chữa.
   ========================================================================== */
export async function danhDauThayThe(env, phien, body) {
  const { tl, loi: l } = await layVaKiemQuyen(env, phien, body.id);
  if (l) return l;
  if (!duocLuuNhomTaiLieu(phien, tl.nhom)) {
    return loi(`Bạn không có quyền sửa tài liệu nhóm "${NHOM_TAI_LIEU[tl.nhom]?.ten || tl.nhom}"`, 403);
  }

  const idMoi = chuoi(body.thay_the_boi_id, 64);   // rỗng = GỠ đánh dấu
  if ((tl.thay_the_boi_id || null) === (idMoi || null)) {
    return json({ ok: true, khong_doi: true, luot_ghi_d1: 0 });
  }

  let toMoi = null;
  if (idMoi) {
    if (idMoi === tl.id) return loi('Một tài liệu không thể tự thay thế chính nó.');
    /* Tờ MỚI cũng phải đi qua chốt XEM: dán một tờ giấy mình không được xem
       làm "bản thay thế" là mượn tính năng này để dò xem tài liệu nào có thật. */
    const { tl: moi, loi: l2 } = await layVaKiemQuyen(env, phien, idMoi);
    if (l2) return l2;
    /* Vòng lặp hai chiều (A thay B, B thay A) làm cả hai tờ cùng đeo dải "hết
       hiệu lực" và không tờ nào còn hiệu lực — một kho tự mâu thuẫn. Chặn ngay
       ở đây, một lượt đọc đã có sẵn. */
    if (moi.thay_the_boi_id === tl.id) {
      return loi(`"${moi.tieu_de}" đang được đánh dấu là bị chính tài liệu này ` +
                 'thay thế. Gỡ đánh dấu bên kia trước đã.');
    }
    toMoi = moi;
  }

  const nguoiTen = phien.ho_ten || phien.ten_dang_nhap || phien.nhan_su_id || null;
  const luc = nowVN();
  await env.DB.batch([
    env.DB.prepare('UPDATE tai_lieu SET thay_the_boi_id = ? WHERE id = ?').bind(idMoi || null, tl.id),
    env.DB.prepare(
      `INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                         nguoi_id, nguoi_ten, luc)
       VALUES ('tai_lieu', ?, 'thay_the_boi_id', ?, ?, ?, ?, ?)`
    ).bind(tl.id, tl.thay_the_boi_id || null, idMoi || null, phien.nhan_su_id || null, nguoiTen, luc)
  ]);

  return json({
    ok: true, id: tl.id,
    thay_the_boi_id: idMoi || null,
    thay_the_boi_ten: toMoi ? toMoi.tieu_de : null,
    luot_ghi_d1: 2
  });
}

/** Máy GỢI Ý cặp nghi ngờ — GET /api/tai-lieu/goi-y-thay-the?id=...
 *
 *  Mọi dấu hiệu để nhận ra cặp `02/2026/PLDN` ↔ `03/2026/PLDN` đều có sẵn từ
 *  ngày đầu: cùng nhóm, cùng loại, số hiệu liền kề, tên chứa "Sửa đổi lần 1".
 *  Hệ thống chỉ đơn giản là CHƯA BAO GIỜ ĐƯỢC HỎI CÂU ĐÓ.
 *
 *  ⚠️ CHỈ GỢI Ý. Không hàm nào ở đây ghi một chữ vào CSDL. Người phải bấm.
 *  Trả kèm `vi_sao` để người bấm nhìn thấy máy đang dựa vào đâu — một gợi ý
 *  không nói lý do là một mệnh lệnh trá hình. */
export async function goiYThayThe(env, phien, id) {
  const { tl, loi: l } = await layVaKiemQuyen(env, phien, id);
  if (l) return l;

  const duocXem = nhomTaiLieuXemDuoc(phien);
  if (!duocXem.length) return json({ ds: [] });

  /* Chỉ soi trong CÙNG NHÓM: một tờ giấy pháp lý không bao giờ bị một tờ hoá
     đơn thay thế, và giới hạn này giữ câu SQL bám đúng `idx_tai_lieu_nhom`. */
  const r = await env.DB.prepare(`
    SELECT id, nhom, loai, tieu_de, so_hieu, ngay_ban_hanh, tao_luc
      FROM tai_lieu
     WHERE an = 0 AND id <> ? AND nhom = ?
       AND nhom IN (${duocXem.map(() => '?').join(',')})
     ORDER BY tao_luc DESC
     LIMIT 200`).bind(tl.id, tl.nhom, ...duocXem).all();

  /* Dấu hiệu SỬA ĐỔI nằm ở tên tờ MỚI, không phải tờ cũ. Bỏ dấu để "Sửa đổi"
     và "sua doi" cùng trúng — dùng lại `boDau()`, không viết bảng chữ thứ hai. */
  const TU_SUA_DOI = ['sua doi', 'thay the', 'bo sung', 'dieu chinh', 'thay doi lan', 'lan 2', 'lan 3'];
  const soCua = (s) => {
    const m = String(s || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  };
  const soCu = soCua(tl.so_hieu);
  const duoiCu = boDau(String(tl.so_hieu || '').replace(/^\s*\d+/, ''));   // phần sau con số

  const ds = [];
  for (const x of (r.results || [])) {
    const viSao = [];
    const tenX = boDau(x.tieu_de || '');
    if (TU_SUA_DOI.some(t => tenX.includes(t))) viSao.push('tên có chữ "sửa đổi / thay thế / bổ sung"');
    if (tl.loai && x.loai && boDau(tl.loai) === boDau(x.loai)) viSao.push('cùng loại giấy');
    const soX = soCua(x.so_hieu);
    const duoiX = boDau(String(x.so_hieu || '').replace(/^\s*\d+/, ''));
    if (soCu !== null && soX !== null && duoiCu && duoiCu === duoiX && soX > soCu && soX - soCu <= 3) {
      viSao.push(`số hiệu liền kề (${tl.so_hieu} → ${x.so_hieu})`);
    }
    /* Đòi ÍT NHẤT HAI dấu hiệu. Một dấu hiệu đơn lẻ ("cùng loại giấy") đúng với
       gần như cả nhóm — bày ra là bày một danh sách nhiễu, mà danh sách nhiễu
       thì người ta bấm bừa. */
    if (viSao.length >= 2) ds.push({ id: x.id, tieu_de: x.tieu_de, so_hieu: x.so_hieu, vi_sao: viSao });
  }
  ds.sort((a, b) => b.vi_sao.length - a.vi_sao.length);

  return json({
    ds: ds.slice(0, 10),
    /* Nói thẳng máy đang đoán bằng gì, và nó KHÔNG đọc được ruột giấy — trên
       kho thật 0/3 tờ bóc được chữ, nên đây thuần tuý là suy từ tên và số hiệu. */
    dua_vao: 'Máy chỉ suy từ TÊN, SỐ HIỆU và LOẠI GIẤY — không đọc nội dung bên ' +
             'trong tờ giấy. Nhìn hai tờ rồi mới bấm.'
  });
}

/* ==========================================================================
   6. MỞ MỘT TÀI LIỆU  —  GET /api/tai-lieu/mo  ·  GET /api/tai-lieu/tep
   ========================================================================== */

/** Lấy bản ghi + KIỂM QUYỀN THEO NHÓM. Trả `{ tl }` hoặc `{ loi }`. */
async function layVaKiemQuyen(env, phien, id) {
  if (!id) return { loi: loi('Thiếu mã tài liệu') };
  const tl = await env.DB.prepare('SELECT * FROM tai_lieu WHERE id = ? AND an = 0').bind(id).first();
  if (!tl) return { loi: loi('Không có tài liệu này', 404) };
  /* ⚠️ ĐÂY LÀ CHỖ CHẶN THẬT (BH-16 sẽ dựng ca đối chứng đúng dòng này):
     kế toán gọi thẳng API xin một tài liệu nhóm `nhan_su` → dừng ở đây, 403.
     Bỏ dòng này thì phép kiểm PHẢI đỏ. */
  if (!duocXemNhomTaiLieu(phien, tl.nhom)) {
    return { loi: loi('Bạn không có quyền xem nhóm giấy tờ này', 403) };
  }
  return { tl };
}

/** Ghi nhật ký truy cập — CHỈ giấy tờ nhạy cảm, GỘP THẬT theo NGÀY.
 *
 *  ⚠️ REV-0036 lỗi #3 — bản trước KHAI SAI. Nó viết `ON CONFLICT DO UPDATE SET
 *  so_lan = so_lan + 1`, tức là mở 10 lần = 1 DÒNG nhưng **10 LƯỢT GHI** D1,
 *  trong khi cả file lại khai "1 lượt ghi/người/ngày". Hạn mức ghi D1 mới vá
 *  xong (REV-0031/0033) nên con số đó không phải chuyện chữ nghĩa.
 *
 *  Sửa: ĐỌC TRƯỚC — đã có dòng của hôm nay thì thôi, KHÔNG ghi gì nữa. Lượt
 *  đọc D1 rẻ hơn lượt ghi cả một bậc, và đây là đường đọc (mở tài liệu) nên
 *  thêm một lượt đọc là đúng chỗ.
 *
 *  ĐÁNH ĐỔI — nói thẳng, đừng để người sau tưởng nhật ký đếm từng lượt:
 *  nhật ký giờ trả lời "NGÀY NÀO ai đã mở tài liệu nào", KHÔNG trả lời "mở
 *  bao nhiêu lần trong ngày". Với nghĩa vụ Luật BVDLCN 91/2025/QH15 (chứng
 *  minh được ai đã tiếp cận dữ liệu cá nhân, khi nào) thì mốc NGÀY là đủ.
 *  Cột `so_lan` vì thế luôn = 1 và `luc` là giờ mở ĐẦU TIÊN trong ngày —
 *  đúng như nhãn ghi ở màn nhật ký, không còn chỗ hiểu nhầm.
 *
 *  Trả về SỐ LƯỢT GHI D1 thật sự tốn (0 hoặc 1) — bàn đo đếm bằng con số này. */
async function ghiNhatKy(env, tl, phien, hanhDong) {
  if (!tl.nhay_cam) return 0;
  const nguoi = phien.nhan_su_id || phien.id || 'khong_ro';
  const homNay = ngayVN(gioVN());
  const khoa = `${tl.id}|${nguoi}|${homNay}|${hanhDong}`;
  try {
    const daCo = await env.DB.prepare(
      'SELECT 1 AS co FROM tai_lieu_nhat_ky WHERE khoa = ?').bind(khoa).first();
    if (daCo) return 0;                       // lượt mở thứ 2..N trong ngày: 0 ghi
    /* `DO NOTHING` chứ không `DO UPDATE`: hai lượt mở đúng cùng một khoảnh khắc
       thì lượt sau im lặng đi qua, không ném lỗi ra giữa đường đọc tài liệu. */
    await env.DB.prepare(
      `INSERT INTO tai_lieu_nhat_ky (khoa, tai_lieu_id, nhan_su_id, ngay, hanh_dong, so_lan, luc)
       VALUES (?,?,?,?,?,1,?)
       ON CONFLICT(khoa) DO NOTHING`
    ).bind(khoa, tl.id, nguoi, homNay, hanhDong, nowVN()).run();
    return 1;
  } catch (e) {
    /* Nhật ký hỏng KHÔNG được chặn người ta đọc giấy tờ của chính công ty
       mình — nhưng phải kêu lên log để còn biết mà sửa. */
    console.error('Ghi nhật ký tài liệu:', e.message);
    return 0;
  }
}

export async function moTaiLieu(env, phien, id) {
  const { tl, loi: l } = await layVaKiemQuyen(env, phien, id);
  if (l) return l;
  await ghiNhatKy(env, tl, phien, 'mo');

  /* ---- BỘ + QUAN HỆ THAY THẾ  ·  PHASE 2 --------------------------------
     Mở MỘT tờ ra là lúc người ta sắp đem nó đi dùng — nên đây là chỗ câu "tờ
     này đã hết hiệu lực" phải xuất hiện rõ nhất, không phải chỗ giấu nó đi.
     Một lượt đọc gộp cho cả ba nhãn; tờ giấy không thuộc bộ và không dính quan
     hệ thay thế nào thì 0 lượt. */
  let tenBo = null, boDaDong = 0, toMoi = null, toCu = null;
  try {
    if (tl.ho_so_id) {
      const b = await env.DB.prepare(
        'SELECT ten, trang_thai FROM ho_so WHERE id = ? AND an = 0').bind(tl.ho_so_id).first();
      if (b) { tenBo = b.ten; boDaDong = b.trang_thai === 'da_dong' ? 1 : 0; }
    }
    /* CHE THEO NHÓM, không theo bộ: tên một tờ giấy nhóm `nhan_su` chỉ người
       xem được nhóm đó mới được đọc. Người khác vẫn biết CÓ tờ thay thế — đó
       là thứ họ cần để không đem nhầm giấy đi nộp — nhưng không biết nó là gì. */
    const nhan = (x) => x
      ? (duocXemNhomTaiLieu(phien, x.nhom)
          ? { id: x.id, tieu_de: x.tieu_de, so_hieu: x.so_hieu, xem_duoc: true }
          : { id: null, tieu_de: null, so_hieu: null, xem_duoc: false })
      : null;
    if (tl.thay_the_boi_id) {
      toMoi = nhan(await env.DB.prepare(
        'SELECT id, nhom, tieu_de, so_hieu FROM tai_lieu WHERE id = ? AND an = 0')
        .bind(tl.thay_the_boi_id).first());
    }
    toCu = nhan(await env.DB.prepare(
      'SELECT id, nhom, tieu_de, so_hieu FROM tai_lieu WHERE thay_the_boi_id = ? AND an = 0 LIMIT 1')
      .bind(tl.id).first());
  } catch (e) {
    /* Điền hụt thì KHÔNG bịa: để `null` và giao diện im lặng bỏ nhãn. Nhưng
       phải kêu lên log — nhãn "hết hiệu lực" biến mất là chuyện đáng biết. */
    console.error('Điền bộ/quan hệ thay thế khi mở tài liệu:', e.message);
  }

  return json({
    ok: true,
    tai_lieu: {
      id: tl.id, nhom: tl.nhom, ten_nhom: NHOM_TAI_LIEU[tl.nhom]?.ten || tl.nhom,
      ho_so_id: tl.ho_so_id || null, ho_so_ten: tenBo, ho_so_da_dong: boDaDong,
      thay_the_boi_id: tl.thay_the_boi_id || null,
      thay_the_boi: toMoi, thay_the_cho: toCu,
      loai: tl.loai, tieu_de: tl.tieu_de, so_hieu: tl.so_hieu,
      ngay_ban_hanh: tl.ngay_ban_hanh, ngay_het_han: tl.ngay_het_han,
      han_luu: tl.han_luu, so_trang: tl.so_trang, co_byte: tl.co_byte,
      noi_dung: tl.noi_dung, ocr_so_trang: tl.ocr_so_trang,
      ocr_so_trang_neo: tl.ocr_so_trang_neo ?? 0, ocr_ghi_chu: tl.ocr_ghi_chu,
      nhay_cam: tl.nhay_cam, nguoi_tao: tl.nguoi_tao, tao_luc: tl.tao_luc,
      /* ⚠️ VÁ REV-0040 · LỖI #3 — CON SỐ AI ĐỌC PHẢI ĐEO NHÃN.
         `noi_dung` là chữ MÁY ĐỌC, và REV-0040 đo được dải mô hình giữ đúng
         danh tính tờ giấy mà vẫn thay lặng lẽ vài con số (MST lệch 2 chữ số).
         Máy chủ trả VỊ TRÍ từng cụm số để giao diện bôi khác hẳn — một định
         nghĩa ở `src/so-ai.js`, không chép bản thứ hai sang trình duyệt. */
      so_ai: viTriSoAI(tl.noi_dung),
      /* Nhãn nói ĐÚNG nguồn chữ: máy scan nhận dạng sẵn hay AI đọc ảnh. Hai
         thứ tin được tới mức khác nhau, dán chung một nhãn là nói dối một nửa. */
      nhan_so_ai: tl.chu_nguon === NGUON_CHU.pdf_lop_chu ? NHAN_CHU_PDF : NHAN_SO_AI,
      chu_nguon: tl.chu_nguon || null,
      /* Ai được bấm nút sửa số hiệu / tên. MÁY CHỦ trả lời, giao diện không tự
         đoán — và máy chủ vẫn kiểm lại lần nữa ở `suaTaiLieu`. */
      sua_duoc: duocLuuNhomTaiLieu(phien, tl.nhom)
    },
    canh_bao: CANH_BAO_PHAP_LY
  });
}

/* ==========================================================================
   6b. SỬA SỐ HIỆU + TÊN TÀI LIỆU  —  POST /api/tai-lieu/sua
   ---------------------------------------------------------------------------
   Sếp Ngọc 03/09/2026: *"trước khi thêm tài liệu hoặc khi đã upload tài liệu
   lên thì để cho đổi tên số tài liệu và tên tài liệu nhé"*.

   TRƯỚC KHI LƯU đã sửa được từ đầu (hai ô trên màn quét). Thiếu là chiều còn
   lại: SAU KHI LƯU thì đóng băng, gõ nhầm một chữ là phải ẩn đi quét lại — mà
   quét lại nghĩa là đi tìm lại TỜ GIẤY THẬT. Đó đúng là lớp vấn đề CTL-0017 đã
   chốt cho việc và mục tiêu, nay áp cho tài liệu.

   BA LUẬT, chép đúng nếp CTL-0017 đã lên hệ thống thật:
   ① SỬA CHÍNH TẢ KHÔNG BẮT GHI LÝ DO. `so_hieu` và `tieu_de` là chỗ gõ nhầm,
      không phải cam kết. Bắt ghi lý do cho một lỗi đánh máy thì người ta quay
      về thói XOÁ ĐI QUÉT LẠI — mất cả tờ giấy đã quét. (Chốt CSDL
      `trg_doi_cam_ket_phai_co_ly_do` chỉ đòi lý do cho `han_chot` và
      `nguoi_nhan_id`, nên hai trường này đi qua tự do — đúng thiết kế.)
   ② CÓ GHI VẾT: ai sửa, lúc nào, cũ → mới. Dùng lại `lich_su_thay_doi_nen`
      (SỔ SỬA CHUNG của cả ERP từ CTL-0017), KHÔNG đẻ bảng mới.
   ③ KHÔNG SỬA ĐƯỢC: file đã lưu, và NHÓM giấy tờ. Đổi nhóm là đổi AI ĐƯỢC XEM
      — đó là một quyết định về quyền, không phải sửa chính tả, nên nó là việc
      riêng có cảnh báo riêng, không đi ké cửa này.

   ⚠️⚠️ TƯƠNG TÁC PHẢI XỬ: `so_hieu` CHÍNH LÀ MỎ NEO.
   `docTinChu()` lấy `so_hieu` người gõ làm mỏ neo MẠNH ② để chấm chữ máy đọc
   là "ĐÃ ĐỐI CHIẾU" hay "CHƯA KIỂM". Chốt đó chạy MỘT LẦN lúc quét, với số
   hiệu CŨ. Sửa số hiệu sau đó mà không tính lại thì kết luận cũ thành sai:
     · gõ nhầm số → không trúng neo → chữ mang nhãn "CHƯA KIỂM". Sửa đúng số
       thì LẼ RA phải trúng; không tính lại thì nhãn sai đó đeo VĨNH VIỄN.
     · nguy hơn: đang TRÚNG neo, sửa số hiệu thành số khác → nhãn "ĐÃ ĐỐI
       CHIẾU" thành một lời NÓI DỐI, và chữ đó vẫn nằm trong ô tìm kiếm.
   → Nên: đổi `so_hieu` thì TÍNH LẠI chốt mỏ neo trên đúng phần chữ đã lưu.
   → Tách lại từng trang không được (dòng lưu trước bản này không có dấu trang)
     thì HẠ HẾT VỀ "CHƯA KIỂM" và nói rõ ra. Thà mất một nhãn tin cậy còn hơn
     giữ lại một nhãn sai — đúng luật ② của khối mỏ neo ở trên.

   LƯỢT GHI D1: 1 UPDATE + 1 dòng lịch sử cho MỖI trường thật sự đổi. Sửa cả
   hai trường = 3 lượt ghi, sửa một trường = 2, không đổi gì = 0 (chặn sớm).
   Đi bằng `batch()` nên cả cụm vào/ra cùng lúc, không có ca "sửa xong mà
   lịch sử rỗng".
   ========================================================================== */
export async function suaTaiLieu(env, phien, body) {
  const { tl, loi: l } = await layVaKiemQuyen(env, phien, body.id);
  if (l) return l;

  /* ⚠️ CẮT Ở MÁY CHỦ, THEO ĐÚNG QUYỀN NHÓM. Giao diện có ẩn nút hay không cũng
     không liên quan: kế toán gọi thẳng API để sửa một tờ giấy nhóm `nhan_su`
     thì dừng ở đúng dòng này. Cùng một chốt với `anTaiLieu`. */
  if (!duocLuuNhomTaiLieu(phien, tl.nhom)) {
    return loi(`Bạn không có quyền sửa tài liệu nhóm "${NHOM_TAI_LIEU[tl.nhom]?.ten || tl.nhom}"`, 403);
  }

  /* Chỉ nhận trường nào NƠI GỌI thật sự gửi. Không gửi = không đụng tới, chứ
     không phải "gửi rỗng = xoá trắng" — người sửa mỗi cái tên không được vô
     tình thổi bay số hiệu. */
  const coTieuDe = Object.prototype.hasOwnProperty.call(body, 'tieu_de');
  const coSoHieu = Object.prototype.hasOwnProperty.call(body, 'so_hieu');
  if (!coTieuDe && !coSoHieu) return loi('Chưa có gì để sửa');

  const tieuDeMoi = coTieuDe ? chuoi(body.tieu_de, 200) : tl.tieu_de;
  const soHieuMoi = coSoHieu ? chuoi(body.so_hieu, 120) : tl.so_hieu;

  if (coTieuDe && (!tieuDeMoi || tieuDeMoi.length < 3)) {
    return loi('Tên tài liệu phải có ít nhất 3 ký tự — để trống thì sau này không ai tìm ra nó.');
  }
  /* Cùng chốt 12 chữ số của đường lưu: một tờ CCCD thì ô số hiệu CHÍNH LÀ số
     CCCD, và lưu một số 11 chữ số vào hồ sơ lao động là giấy tờ sai sự thật. */
  if (soHieuMoi && laLoaiCCCD(tl.loai)) {
    const { so, dung } = soCCCD(soHieuMoi);
    if (!dung) {
      return loi(`Số CCCD phải đủ 12 chữ số — bạn nhập "${soHieuMoi}" (${so.length} chữ số). ` +
                 'Nhìn thẻ và gõ lại, hoặc để trống.');
    }
  }

  const doiTieuDe = coTieuDe && (tieuDeMoi || '') !== (tl.tieu_de || '');
  const doiSoHieu = coSoHieu && (soHieuMoi || '') !== (tl.so_hieu || '');
  if (!doiTieuDe && !doiSoHieu) {
    /* Không đổi gì thì KHÔNG ghi gì — 0 lượt ghi D1, 0 dòng lịch sử rác. Bấm
       Lưu mà không sửa gì là chuyện xảy ra suốt. */
    return json({ ok: true, khong_doi: true, luot_ghi_d1: 0 });
  }

  /* ---- TÍNH LẠI MỎ NEO khi số hiệu đổi ---------------------------------- */
  let neoMoi = null;
  if (doiSoHieu && tl.noi_dung) {
    const trangCu = tachTrangDaLuu(tl.noi_dung);
    if (trangCu.length) {
      const trang = trangCu.map(t => ({
        so: t.so, chu: t.chu,
        tin: docTinChu(t.chu, { soHieu: soHieuMoi, loai: tl.loai, tieuDe: tieuDeMoi })
      }));
      neoMoi = gopChuDaBoc(trang, {
        nguonChu: tl.chu_nguon || NGUON_CHU.anh_ai,
        themGhiChu: `Số hiệu vừa đổi từ "${tl.so_hieu || '(trống)'}" thành ` +
                    `"${soHieuMoi || '(trống)'}" nên máy đã đối chiếu lại phần chữ.`
      });
    } else {
      /* KHÔNG tách lại được từng trang ⇒ KHÔNG tính lại được ⇒ HẠ VỀ CHƯA KIỂM.
         Giữ nguyên nhãn cũ là giữ một kết luận đã hết hiệu lực. Chữ vẫn còn
         nguyên để đọc, chỉ ra khỏi ô tìm kiếm. */
      neoMoi = {
        chu: tl.noi_dung, chuTim: '', soTrang: tl.ocr_so_trang || 0, soTrangNeo: 0,
        nguonChu: tl.chu_nguon || NGUON_CHU.anh_ai,
        ghiChu: 'Số hiệu vừa đổi, mà phần chữ của tài liệu này lưu theo lối cũ nên ' +
                'máy không đối chiếu lại được từng trang. Chữ đã hạ về CHƯA KIỂM và ' +
                'tạm rút khỏi ô tìm kiếm — thà mất một nhãn tin cậy còn hơn giữ lại ' +
                'một nhãn sai. Quét lại tài liệu này là máy đối chiếu lại được.'
      };
    }
  }

  const nguoiTen = phien.ho_ten || phien.ten_dang_nhap || phien.nhan_su_id || null;
  const luc = nowVN();
  const dat = ['tieu_de = ?', 'so_hieu = ?', 'tim_kiem = ?'];
  const bien = [
    tieuDeMoi, soHieuMoi,
    chuoiTimKiem({
      tieu_de: tieuDeMoi, so_hieu: soHieuMoi, loai: tl.loai, nhom: tl.nhom,
      /* Ô tìm dựng LẠI từ đầu, không vá vào chuỗi cũ: chuỗi cũ còn mang tên và
         số hiệu CŨ, để lại là tra bằng số đã bỏ vẫn ra — đúng kiểu lỗi không
         ai phát hiện. */
      noi_dung: neoMoi ? neoMoi.chuTim : chuChoOTim(soHieuDaNeo(tl))
    })
  ];
  if (neoMoi) {
    dat.push('noi_dung = ?', 'ocr_so_trang_neo = ?', 'ocr_ghi_chu = ?');
    bien.push(neoMoi.chu || null, neoMoi.soTrangNeo || 0, neoMoi.ghiChu || null);
  }
  bien.push(tl.id);

  const cauLenh = [
    env.DB.prepare(`UPDATE tai_lieu SET ${dat.join(', ')} WHERE id = ?`).bind(...bien)
  ];
  const ghiVet = (truong, cu, moi) => env.DB.prepare(
    `INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                       nguoi_id, nguoi_ten, luc)
     VALUES ('tai_lieu', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(tl.id, truong, cu ?? null, moi ?? null, phien.nhan_su_id || null, nguoiTen, luc);
  if (doiTieuDe) cauLenh.push(ghiVet('tieu_de', tl.tieu_de, tieuDeMoi));
  if (doiSoHieu) cauLenh.push(ghiVet('so_hieu', tl.so_hieu, soHieuMoi));

  await env.DB.batch(cauLenh);

  return json({
    ok: true,
    id: tl.id,
    tieu_de: tieuDeMoi,
    so_hieu: soHieuMoi,
    luot_ghi_d1: cauLenh.length,
    /* Nói RA chuyện mỏ neo vừa được tính lại — người vừa sửa là người duy nhất
       còn nhớ mình vừa đổi số, và họ cần biết nhãn tin cậy đã đổi theo. */
    neo_tinh_lai: !!neoMoi,
    ocr_so_trang_neo: neoMoi ? neoMoi.soTrangNeo : (tl.ocr_so_trang_neo ?? 0),
    ocr_ghi_chu: neoMoi ? neoMoi.ghiChu : tl.ocr_ghi_chu,
    canh_bao: CANH_BAO_PHAP_LY
  });
}

/** ĐỌC LẠI VẾT SỬA của một tài liệu — GET /api/tai-lieu/lich-su.
 *  Ghi vết mà không mở ra đọc được thì chưa chứng minh được gì, chỉ là ghi cho
 *  có (đúng bài học REV-0040 lỗi #7 với nhật ký truy cập). Ai XEM được tài
 *  liệu thì xem được vết sửa của nó — đây là chuyện "ai gõ nhầm rồi sửa", không
 *  phải ruột giấy tờ, nên không cần cửa hẹp hơn cửa xem. */
export async function lichSuTaiLieu(env, phien, id) {
  const { tl, loi: l } = await layVaKiemQuyen(env, phien, id);
  if (l) return l;
  const GH = 100;
  const kq = await env.DB.prepare(`
    SELECT truong, gia_tri_cu, gia_tri_moi, nguoi_ten, luc
      FROM lich_su_thay_doi_nen
     WHERE bang = 'tai_lieu' AND ban_ghi_id = ?
     ORDER BY luc DESC, id DESC
     LIMIT ${GH + 1}`).bind(tl.id).all();
  const { ds, biCat } = catBot(kq, GH);
  const cat = await nhanCat(env, biCat, GH,
    "SELECT COUNT(*) AS n FROM lich_su_thay_doi_nen WHERE bang = 'tai_lieu' AND ban_ghi_id = ?",
    [tl.id], 'Cần bản đầy đủ thì lấy từ bản sao lưu tháng.');
  return json({ ds, bi_cat: biCat, cat, tran: GH });
}

/** Phần chữ ĐANG được phép nằm trong ô tìm của một dòng đã lưu — chỉ dùng khi
 *  KHÔNG đổi số hiệu (đổi tên thôi thì kết luận mỏ neo cũ vẫn còn hiệu lực,
 *  không có cớ gì tính lại). Tách từ `noi_dung` theo đúng nhãn đã ghi kèm. */
function soHieuDaNeo(tl) {
  if (!tl.noi_dung || !(tl.ocr_so_trang_neo > 0)) return '';
  const s = String(tl.noi_dung);
  const re = /^--- Trang \d+ · ([^·\n]*) ·[^\n]*---$/gm;
  const moc = [...s.matchAll(re)];
  let ra = '';
  for (let i = 0; i < moc.length; i++) {
    if (moc[i][1].trim() !== MUC_TIN.da_neo) continue;
    const dau = moc[i].index + moc[i][0].length;
    ra += ' ' + s.slice(dau, i + 1 < moc.length ? moc[i + 1].index : s.length);
  }
  return ra.trim();
}

/** Tải bản PDF về. Đi qua máy chủ CHỦ Ý — không đưa đường dẫn Drive ra ngoài,
 *  vì đường dẫn Drive không biết ai là ai, mà tài liệu thì có nhóm nhạy cảm. */
export async function tepTaiLieu(env, phien, id) {
  const { tl, loi: l } = await layVaKiemQuyen(env, phien, id);
  if (l) return l;
  if (!tl.kho_khoa) return loi('Tài liệu chưa có file', 404);
  await ghiNhatKy(env, tl, phien, 'tai');

  const res = await layFile(env, { nha: tl.kho_nha, khoa: tl.kho_khoa });
  if (!res.ok) return loi('Không lấy được file từ kho (' + res.status + ')', 502);
  const ten = `${tl.tieu_de.replace(/[^\p{L}\p{N} .-]/gu, ' ').trim().slice(0, 60) || 'tai-lieu'}.pdf`;
  return new Response(res.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(ten)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/** Nhật ký ai đã mở — chỉ Admin. Người thường xem được nhật ký truy cập của
 *  người khác thì chính cái nhật ký lại thành chỗ rò thông tin. */
export async function nhatKyTaiLieu(env, phien, id) {
  if (!laAdmin(phien)) return loi('Chỉ Admin xem được nhật ký truy cập', 403);
  if (!id) return loi('Thiếu mã tài liệu');
  /* `k.luc` là giờ mở ĐẦU TIÊN trong ngày — nhật ký gộp theo ngày, xem
     `ghiNhatKy()`. Đặt tên cột trả về cho đúng nghĩa để màn hình không lỡ
     hiển thị "lúc 9:05" như thể đó là lượt mở gần nhất.

     ⚠️ VÁ REV-0040 · LỖI #6 — ĐÂY LÀ CẮT IM LẶNG THẬT, VÀ CẮT ĐÚNG CHỖ TỆ NHẤT.
     Bản trước `LIMIT 200` mà không báo gì. Nhật ký truy cập là chỗ ÍT ĐƯỢC
     PHÉP cắt lặng nhất trong cả ERP: nó tồn tại để trả lời "ai đã tiếp cận dữ
     liệu cá nhân này". Một màn nhật ký cắt 200 dòng đầu rồi im lặng không phải
     màn thiếu dữ liệu — nó là màn KHẲNG ĐỊNH SAI rằng đây là toàn bộ lượt truy
     cập, đúng lúc người ta cần con số đó để trả lời cơ quan quản lý hoặc chủ
     thể dữ liệu. */
  const GH = 200;
  const kq = await env.DB.prepare(`
    SELECT k.ngay, k.hanh_dong, k.luc AS lan_dau_luc, k.nhan_su_id,
           COALESCE(n.ho_ten, k.nhan_su_id) AS ho_ten
      FROM tai_lieu_nhat_ky k
      LEFT JOIN nhan_su n ON n.id = k.nhan_su_id
     WHERE k.tai_lieu_id = ?
     ORDER BY k.ngay DESC, k.luc DESC
     LIMIT ${GH + 1}
  `).bind(id).all();
  const { ds, biCat } = catBot(kq, GH);
  const cat = await nhanCat(env, biCat, GH,
    'SELECT COUNT(*) AS n FROM tai_lieu_nhat_ky WHERE tai_lieu_id = ?', [id],
    'Đây là nhật ký truy cập — cần bản đầy đủ thì lấy từ bản sao lưu tháng.');
  return json({ ds, bi_cat: biCat, cat, tran: GH });
}

/** Ẩn một tài liệu. KHÔNG xoá: SPEC-0005 Mục 7.5 cấm xoá tài liệu gốc, và
 *  giấy tờ quản trị có hạn lưu theo luật. Ẩn là gỡ khỏi danh sách, giữ file. */
export async function anTaiLieu(env, phien, body) {
  const { tl, loi: l } = await layVaKiemQuyen(env, phien, body.id);
  if (l) return l;
  if (!duocLuuNhomTaiLieu(phien, tl.nhom)) {
    return loi('Bạn không có quyền sửa tài liệu nhóm này', 403);
  }
  await env.DB.prepare('UPDATE tai_lieu SET an = 1 WHERE id = ?').bind(tl.id).run();
  return json({ ok: true });
}

/* ==========================================================================
   7. NHẮC TRƯỚC KHI HẾT HẠN — đi nhờ đúng đường nhắc SPEC-0004
   ---------------------------------------------------------------------------
   CTL-0026 Mục 6: "dùng lại đường nhắc việc của SPEC-0004, KHÔNG tạo cron
   mới". Hàm này gắn vào chuỗi `scheduled()` 5 phút sẵn có ở `src/index.js`,
   `wrangler.toml` KHÔNG đổi một dòng.

   Mượn nguyên bộ luật đã chốt của SPEC-0004/ADR-0013:
     · `duocGuiNhac()` — chỉ gửi 8h–18h, KHÔNG gửi Chủ nhật (thứ Bảy vẫn làm)
     · chống trùng bằng CHÍNH bảng `thong_bao` — không thêm cột cờ nào
     · GỘP một người MỘT tin/ngày, dù có 10 giấy sắp hết hạn

   Vì sao chuyện này đáng nhắc: CTL-0026 Mục 3 ① — "giấy tờ hết hạn = khoá
   gian hàng = mất doanh thu thật". Không phải phiền hà hành chính.
   ========================================================================== */

const MOC_NHAC = [30, 7, 0];      // còn 30 ngày · còn 7 ngày · đúng hôm hết hạn

export async function quetNhacHetHanTaiLieu(env, guiThongBao, luc = new Date()) {
  const vn = gioVN(luc);
  const cua = duocGuiNhac(vn);
  if (!cua.duoc) return { bo_qua: cua.ly_do, da_gui: 0 };

  const homNay = ngayVN(vn);
  const xa = Math.max(...MOC_NHAC);

  let ds;
  try {
    const r = await env.DB.prepare(`
      SELECT id, nhom, tieu_de, so_hieu, ngay_het_han,
             CAST(julianday(ngay_het_han) - julianday(?) AS INTEGER) AS con_ngay
        FROM tai_lieu
       WHERE an = 0 AND ngay_het_han IS NOT NULL
         AND ngay_het_han >= ? AND ngay_het_han <= date(?, '+' || ? || ' days')
       ORDER BY ngay_het_han
       LIMIT 100
    `).bind(homNay, homNay, homNay, xa).all();
    ds = r.results || [];
  } catch (e) {
    /* Bảng chưa nạp migration → im lặng đi tiếp, KHÔNG làm hỏng các việc nền
       khác đang chạy chung một lượt cron. */
    return { bo_qua: 'chua_co_bang', da_gui: 0 };
  }

  const canNhac = ds.filter(t => MOC_NHAC.includes(Number(t.con_ngay)));
  if (!canNhac.length) return { bo_qua: null, da_gui: 0 };

  /* Gửi cho ai: người có quyền XEM nhóm đó và đang đi làm. Dùng đúng bảng
     phân quyền ở `src/quyen.js`, không viết luật thứ hai — quản lý kho không
     xem được nhóm nhân sự thì cũng KHÔNG nhận tin nhắc hạn của nhóm đó. */
  /* Lấy CẢ HAI ô (Sếp chốt 04/09/2026) rồi truyền nguyên dòng vào
     duocXemNhomTaiLieu — hàm đó hợp hai ô. Truyền mỗi `vai_tro` là sau
     migration chị Phan Thị Hằng (nguoi_dung + ke_toan_truong) mất hết tin
     nhắc hạn giấy tờ kế toán. Cột ô 2 có thể chưa nạp: thiếu thì lùi về câu
     cũ, cron nhắc hạn không được phép chết vì một cột. */
  const cau = (coViTri) => `
    SELECT t.nhan_su_id, t.vai_tro,
           ${coViTri ? 't.vi_tri_cong_viec' : "'' AS vi_tri_cong_viec"}
      FROM tai_khoan t
      JOIN nhan_su n ON n.id = t.nhan_su_id
     WHERE t.kich_hoat = 1 AND n.dang_lam = 1
  `;
  let tk;
  try {
    ({ results: tk } = await env.DB.prepare(cau(true)).all());
  } catch (e) {
    if (!/no such column/i.test(String(e && e.message))) throw e;
    ({ results: tk } = await env.DB.prepare(cau(false)).all());
  }

  const theoNguoi = new Map();
  for (const nguoi of (tk || [])) {
    const cua = canNhac.filter(t => duocXemNhomTaiLieu(nguoi, t.nhom));
    if (cua.length) theoNguoi.set(nguoi.nhan_su_id, cua);
  }

  let daGui = 0;
  for (const [nsId, cua] of theoNguoi) {
    const daCo = await env.DB.prepare(
      `SELECT 1 FROM thong_bao WHERE loai = 'tl_het_han' AND nguoi_nhan_id = ?
         AND date(tao_luc) = ? LIMIT 1`).bind(nsId, homNay).first();
    if (daCo) continue;                       // một người MỘT tin/ngày

    const dong = cua.map(t => {
      const n = Number(t.con_ngay);
      const khi = n === 0 ? 'HẾT HẠN HÔM NAY' : `còn ${n} ngày`;
      return `• ${t.tieu_de}${t.so_hieu ? ' (' + t.so_hieu + ')' : ''} — ${khi}, hết hạn ${t.ngay_het_han}`;
    }).join('\n');

    await guiThongBao(env, null,
      `📄 Giấy tờ sắp hết hạn — ${cua.length} tài liệu:\n${dong}\n\n` +
      `Giấy hết hạn có thể bị khoá gian hàng. Vào tab Kho tài liệu để xem bản quét ` +
      `và đi làm lại bản giấy.`,
      'tl_het_han', null, nsId);
    daGui++;
  }
  return { bo_qua: null, da_gui: daGui };
}
