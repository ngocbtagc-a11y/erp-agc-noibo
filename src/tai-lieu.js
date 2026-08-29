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
export function chuoiTimKiem({ tieu_de, so_hieu, loai, nhom, noi_dung }) {
  const ten = NHOM_TAI_LIEU[nhom]?.ten || '';
  const ruot = nhomTaiLieuNhayCam(nhom) ? null : noi_dung;
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

   Nên: `so_hieu` do người quét TỰ GÕ khi nhìn vào tờ giấy là mẩu sự thật duy
   nhất máy chủ có. Chữ bóc được mà KHÔNG chứa số hiệu đó thì gần như chắc
   chắn không phải chữ của tờ giấy này → vứt, và nói rõ vì sao vứt.

   ⚠️ VÁ REV-0040 · LỖI CHẶN #1 — BA MỎ NEO, KHÔNG PHẢI MỘT
   ---------------------------------------------------------------------------
   Bản trước chỉ có MỘT mỏ neo là `so_hieu`, nên nó hở đúng chỗ người quét vội:
     · **ô số hiệu để trống** → chốt KHÔNG CHẠY, công văn bịa vào thẳng kho;
     · số hiệu < 4 ký tự ("12") → cũng không chạy.
   Người quét một xấp giấy tờ **SẼ** bỏ trống ô số hiệu. Đó không phải ca hiếm,
   đó là ca thường — Hồ Ly gọi đúng tên.

   Nay chữ bóc được phải trúng ÍT NHẤT MỘT trong ba mỏ neo:
     ① `so_hieu` người vừa gõ                    (mốc mạnh nhất, nếu có)
     ② TÊN CÔNG TY — giấy tờ của công ty gần như luôn có tên công ty trên đó,
        kể cả khi đứng ở vai bên mua trên hoá đơn của người khác. Hồ Ly đo mỏ
        neo này bắt **7/7** ca bịa toàn trang, KỂ CẢ khi ô số hiệu trống.
     ③ TÊN LOẠI GIẤY TỜ / TÊN TÀI LIỆU người vừa gõ — khớp theo TỪ NGUYÊN VẸN
        (không khớp mẩu), từ ≥ 5 chữ cái, để "quyết định" đừng trúng oan
        "nghị định".

   CÓ MỎ NEO thì phải trúng; KHÔNG có mỏ neo nào dùng được thì nói thẳng là
   chốt không chạy chứ không giả vờ đã kiểm.
   ⚠️ Mỏ neo KHÔNG cứu được DẢI GIỮA (danh tính đúng, vài con số bị thay lặng
   lẽ) — dải đó chặn bằng `src/so-ai.js`: nhãn "AI đọc — CHƯA KIỂM" và cấm con
   số tự vào ô dữ liệu chính thức. Đừng ai tưởng chốt này bắt được cả hai.
   ========================================================================== */

/** Tên công ty — mỏ neo ②. Gồm cả tên HKD tiền thân vì giấy tờ 2024–2025 còn
 *  mang tên đó, và giai đoạn hợp nhất hai pháp nhân vẫn đang chạy (Q3/2026). */
export const TEN_CONG_TY_NEO = [
  'Công ty TNHH Alpha Green Commerce',
  'Alpha Green Commerce',
  'Onfod'
];

/** Từ trong `loai`/`tieu_de` đủ dài để làm mỏ neo. Dưới 5 chữ cái thì quá dễ
 *  trúng oan ("dinh" nằm trong "nghị định"), mà trúng oan là mở lại đúng cái
 *  lỗ vừa vá. */
const DAI_TU_NEO = 5;

function chuCoThatKhong(chu, { soHieu = null, loai = null, tieuDe = null,
                              cum = null, tenCum = 'dòng chữ bắt buộc của loại giấy tờ này' } = {}) {
  if (!chu) return { that: true, viSao: null, neo: null };

  /* So sau khi bỏ dấu VÀ bỏ mọi ký tự không phải chữ-số: mô hình hay đọc
     "124/2026/GCN-ATTP" thành "124 / 2026 / GCN – ATTP". Khác dấu gạch thì
     vẫn là cùng một số hiệu, đừng vứt oan chữ đọc đúng. */
  const gon = (s) => boDau(s).replace(/[^a-z0-9]/g, '');
  const chuGon = gon(chu);
  const chuTu = new Set(boDau(chu).split(/[^a-z0-9]+/).filter(Boolean));

  const coMoc = [];      // mỏ neo DÙNG ĐƯỢC (người đã cho ta mẩu sự thật)
  let trung = null;      // mỏ neo đã TRÚNG

  /* Mỏ neo CỤM — dành cho loại giấy tờ mà chính tờ giấy LUÔN in sẵn một dòng
     cố định: thẻ CCCD luôn có "CĂN CƯỚC CÔNG DÂN". Khác `tuNeo` ở chỗ đây là
     cả CỤM (khớp trên chuỗi đã gộp, nên "CĂN CƯỚC CÔNG DÂN" và
     "Căn-cước công dân" là một), và nó vừa ĐÒI vừa TRÚNG được: dòng đó bắt
     buộc phải có, thiếu là thứ trong ảnh không phải tờ giấy nó đang khai. */
  if (Array.isArray(cum) && cum.length) {
    coMoc.push(tenCum);
    if (cum.some(c => chuGon.includes(gon(c)))) trung = trung || tenCum;
  }

  const maSo = gon(soHieu || '');
  if (maSo.length >= 4) {
    coMoc.push(`số hiệu "${soHieu}"`);
    if (chuGon.includes(maSo)) trung = trung || `số hiệu "${soHieu}"`;
  }

  const tuNeo = [...new Set(
    boDau([loai, tieuDe].filter(Boolean).join(' '))
      .split(/[^a-z0-9]+/).filter(t => t.length >= DAI_TU_NEO)
  )];
  if (tuNeo.length) {
    coMoc.push(`tên tài liệu bạn vừa gõ`);
    if (tuNeo.some(t => chuTu.has(t))) trung = trung || 'tên tài liệu bạn vừa gõ';
  }

  /* Tên công ty CHỈ ĐỂ TRÚNG, không để ĐÒI: giấy tờ của nhà cung cấp hoặc của
     một cá nhân hoàn toàn có thể không nhắc tên công ty. Đưa nó vào `coMoc`
     thì mọi tờ như thế bị vứt oan. */
  if (TEN_CONG_TY_NEO.some(t => chuGon.includes(gon(t)))) trung = trung || 'tên công ty';

  if (!coMoc.length) {
    return {
      that: true, neo: null,
      viSao: 'Bạn chưa gõ số hiệu và tên tài liệu quá ngắn, nên máy KHÔNG có ' +
             'mốc nào để đối chiếu — chữ AI đọc được lưu NGUYÊN VĂN mà chưa ' +
             'kiểm là của đúng tờ giấy này. Gõ số hiệu vào để máy kiểm giúp.'
    };
  }
  if (trung) return { that: true, viSao: null, neo: trung };

  return {
    that: false, neo: null,
    viSao: `Chữ AI đọc được KHÔNG chứa ${coMoc.join(' hay ')}, cũng không nhắc ` +
           'tên công ty — nhiều khả năng AI không nhìn thấy ảnh mà tự bịa ra nội ' +
           'dung, nên đã bỏ đi. Tài liệu vẫn lưu bình thường, tra bằng tên và số hiệu.'
  };
}

/* Xuất ra để bàn đo gọi thẳng được — chốt chống bịa mà chỉ đo gián tiếp qua
   `luuTaiLieu` thì mỗi ca phải dựng cả một lượt lưu, và ca "số hiệu trống"
   dễ bị bỏ sót đúng như vòng 1. */
export { chuCoThatKhong };

async function bocChu(env, dsAnhOCR, moc = {}) {
  if (!env.AI) return { chu: '', soTrang: 0, ghiChu: 'Máy chủ chưa bật AI đọc ảnh' };
  if (!dsAnhOCR.length) return { chu: '', soTrang: 0, ghiChu: 'Không có ảnh để bóc chữ' };

  const nhac =
    'Đây là ảnh chụp một trang giấy tờ hành chính Việt Nam. Hãy chép lại TOÀN BỘ ' +
    'chữ nhìn thấy trong ảnh, giữ nguyên tiếng Việt CÓ DẤU, giữ nguyên số hiệu, ' +
    'ngày tháng, tên riêng và các con số. Xuống dòng như trên giấy. ' +
    'KHÔNG tóm tắt, KHÔNG giải thích, KHÔNG thêm lời nào của bạn. ' +
    'Chỗ nào mờ không đọc được thì ghi [không rõ].';

  const phan = [];
  let hong = null;
  for (let i = 0; i < dsAnhOCR.length; i++) {
    try {
      const bytes = base64ToBytes(dsAnhOCR[i]);
      if (bytes.length < 100) { hong = hong || 'Ảnh bóc chữ quá nhỏ'; continue; }
      const kq = await env.AI.run(MO_HINH_DOC_ANH, khuonDocAnh(dsAnhOCR[i], nhac));
      const chu = String(kq?.response ?? kq?.description ?? kq?.text ??
                         kq?.choices?.[0]?.message?.content ?? '').trim();
      if (chu) phan.push(`--- Trang ${i + 1} ---\n${chu}`);
    } catch (e) {
      hong = hong || dichLoiAI(e);
    }
  }
  const chuGop = phan.join('\n\n').slice(0, 60000);
  const that = chuCoThatKhong(chuGop, moc);
  if (!that.that) return { chu: '', soTrang: 0, ghiChu: that.viSao };
  return {
    chu: chuGop,
    soTrang: phan.length,
    /* `that.viSao` khi `that === true` là câu "chốt KHÔNG chạy vì thiếu mốc" —
       phải nói ra, đừng để ai tưởng chữ này đã được kiểm. */
    ghiChu: phan.length ? (that.viSao || null) : (hong || 'Không đọc được chữ nào')
  };
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
  /* `gan_id` chỉ có nghĩa ở cửa hồ sơ. Cửa kho chung mà gửi kèm thì VỨT, đừng
     lưu: một dòng `cua_vao='kho_chung'` mang `gan_id` là dòng không cửa nào tra
     ra — kho chung không lọc theo nó, hồ sơ thì không nhận nó. */
  const ganId = cuaVao === 'nhan_su' ? chuoi(body.gan_id, 64) : null;

  const nhom = cuaVao === 'nhan_su' ? NHOM_CUA_NHAN_SU : chuoi(body.nhom, 40);
  if (!nhom || !NHOM_TAI_LIEU[nhom]) return loi('Chưa chọn nhóm giấy tờ');

  /* ⚠️ CẮT Ở MÁY CHỦ. Đây là chỗ chặn thật — giao diện có ẩn nút hay không
     cũng không liên quan. Gọi thẳng API bằng tư cách kế toán để lưu vào nhóm
     `nhan_su` thì dừng ở đúng dòng này. */
  if (!duocLuuNhomTaiLieu(phien.vai_tro, nhom)) {
    return loi(`Bạn không có quyền lưu tài liệu vào nhóm "${NHOM_TAI_LIEU[nhom].ten}"`, 403);
  }

  const tieuDe = chuoi(body.tieu_de, 200);
  if (!tieuDe || tieuDe.length < 3) return loi('Vui lòng đặt tên cho tài liệu (ít nhất 3 ký tự)');

  const soTrang = parseInt(body.so_trang, 10) || 0;
  if (soTrang < 1) return loi('Chưa có trang nào');
  if (soTrang > TRAN_SO_TRANG) return loi(`Một tài liệu tối đa ${TRAN_SO_TRANG} trang`);

  /* ---- CỬA HỒ SƠ NHÂN SỰ: phải gắn vào một người CÓ THẬT ----------------
     Một lượt ĐỌC D1 để đổi lấy việc không bao giờ có tài liệu mồ côi trong
     bảng. Gắn nhầm `gan_id` thì tờ giấy biến mất khỏi mọi hồ sơ mà vẫn nằm
     trong kho — không ai đi tìm, không ai biết nó của ai. Lượt đọc rẻ hơn lượt
     ghi cả một bậc, và đây là đường ghi (mỗi lượt quét đúng một lần). */
  let tenNguoi = null;
  if (cuaVao === 'nhan_su') {
    if (!ganId) return loi('Quét vào hồ sơ nhân sự thì phải kèm mã nhân sự');
    const ns = await env.DB.prepare(
      'SELECT id, ho_ten FROM nhan_su WHERE id = ?').bind(ganId).first();
    if (!ns) return loi('Không có nhân sự nào mang mã này', 404);
    tenNguoi = ns.ho_ten || null;
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

  const tep = String(body.tep || '');
  if (!tep) return loi('Thiếu nội dung tài liệu');
  let bytes;
  try { bytes = base64ToBytes(tep); } catch { return loi('Nội dung tài liệu không đọc được'); }
  if (bytes.length < 200) return loi('Tài liệu rỗng hoặc hỏng');
  if (bytes.length > TRAN_BYTE_PDF) {
    return loi(`Tài liệu nặng ${(bytes.length / 1048576).toFixed(1)} MB, vượt trần ` +
               `${TRAN_BYTE_PDF / 1048576} MB. Chụp lại với ít trang hơn.`);
  }

  /* ---- Bóc chữ TRƯỚC khi tải lên ---------------------------------------
     Cố ý: nếu AI treo thì ta chưa đẩy gì lên Drive, không để lại file mồ côi.
     `bocChu` tự nuốt mọi lỗi nên nó không bao giờ chặn luồng. */
  const dsOCR = Array.isArray(body.anh_boc_chu) ? body.anh_boc_chu.slice(0, TRAN_TRANG_BOC_CHU) : [];
  /* Đưa MỌI mẩu sự thật người vừa gõ xuống làm mốc đối chiếu chữ bịa — xem
     `chuCoThatKhong()`. Bản trước chỉ đưa `so_hieu`, nên bỏ trống ô đó là chốt
     tắt hẳn (REV-0040 lỗi #1). */
  const boc = await bocChu(env, dsOCR, {
    soHieu: soHieuTho, loai: loaiGiay, tieuDe: tieuDe
  });

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
       "Gửi lại" là xong — không mất ảnh đã chụp. */
    return loi('Chưa gửi được lên kho: ' + (e.message || '').slice(0, 200) +
               ' — ảnh vẫn giữ trên máy, bấm "Gửi lại" khi có sóng.', 502);
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
    cua_vao: cuaVao,
    gan_id: ganId,
    so_trang: soTrang,
    kho_nha: luuXong.nha,
    kho_khoa: luuXong.khoa,
    co_byte: luuXong.coByte || bytes.length,
    noi_dung: boc.chu || null,
    ocr_so_trang: boc.soTrang,
    ocr_ghi_chu: boc.ghiChu,
    nhay_cam: nhayCam,
    dong_y_boi: dongYBoi,
    dong_y_luc: nhayCam ? nowVN() : null,
    dong_y_muc_dich: dongYMucDich,
    nguoi_tao: phien.nhan_su_id || null,
    tao_luc: nowVN()
  };

  banGhi.tim_kiem = chuoiTimKiem({
    tieu_de: banGhi.tieu_de, so_hieu: banGhi.so_hieu,
    loai: banGhi.loai, nhom, noi_dung: banGhi.noi_dung
  });

  /* ĐÚNG MỘT LƯỢT GHI D1 cho cả một lượt quét. */
  try {
    await env.DB.prepare(`
      INSERT INTO tai_lieu
        (id, ma_gui, nhom, loai, tieu_de, so_hieu, tim_kiem,
         ngay_ban_hanh, ngay_het_han, han_luu, cua_vao, gan_id, so_trang,
         kho_nha, kho_khoa, co_byte, noi_dung, ocr_so_trang, ocr_ghi_chu,
         nhay_cam, dong_y_boi, dong_y_luc, dong_y_muc_dich, nguoi_tao, tao_luc)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      banGhi.id, banGhi.ma_gui, banGhi.nhom, banGhi.loai, banGhi.tieu_de,
      banGhi.so_hieu, banGhi.tim_kiem, banGhi.ngay_ban_hanh, banGhi.ngay_het_han,
      banGhi.han_luu, banGhi.cua_vao, banGhi.gan_id, banGhi.so_trang,
      banGhi.kho_nha, banGhi.kho_khoa, banGhi.co_byte, banGhi.noi_dung,
      banGhi.ocr_so_trang, banGhi.ocr_ghi_chu, banGhi.nhay_cam,
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
    if (!/UNIQUE constraint failed/i.test(m) || !maGui) throw e;

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
    cua_vao: cuaVao,
    gan_id: ganId,
    gan_ten: tenNguoi,
    so_trang: soTrang,
    co_byte: banGhi.co_byte,
    ocr_so_trang: boc.soTrang,
    ocr_ghi_chu: boc.ghiChu,
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
  const duocXem = nhomTaiLieuXemDuoc(phien.vai_tro);

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
  if (ganId && !duocXemNhomTaiLieu(phien.vai_tro, NHOM_CUA_NHAN_SU)) {
    return loi('Bạn không có quyền xem giấy tờ nhân sự. Chỉ HCNS và Ban giám ' +
               'đốc mở được hồ sơ giấy tờ của người khác.', 403);
  }

  if (!duocXem.length) {
    return json({ ds: [], nhom: [], canh_bao: CANH_BAO_PHAP_LY, tong: 0, bi_cat: false, cat: null,
                  nhom_luu_duoc: [], loai_goi_y: [] });
  }

  const dieuKien = [`an = 0`];
  const bien = [];
  if (ganId) {
    dieuKien.push(`cua_vao = ? AND gan_id = ?`);
    bien.push('nhan_su', ganId);
  }

  /* Lọc theo nhóm NGAY TRONG CÂU SQL. Cố ý không lấy hết rồi lọc trong JS:
     lấy hết là dữ liệu đã rời máy chủ, và chỉ cần một lần quên lọc là lộ. */
  const nhomHoi = String(thamSo.get('nhom') || '').trim();
  if (nhomHoi) {
    if (!duocXemNhomTaiLieu(phien.vai_tro, nhomHoi)) {
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
  if (q) {
    for (const tu of q.split(' ').filter(Boolean).slice(0, 6)) {
      dieuKien.push('tim_kiem LIKE ?');
      bien.push('%' + tu.replace(/[%_]/g, ' ') + '%');
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
           han_luu, so_trang, co_byte, ocr_so_trang, nhay_cam, nguoi_tao, tao_luc,
           cua_vao, gan_id,
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

  return json({
    ds,
    tong: ds.length,
    bi_cat: biCat,
    cat,
    tran: GH,
    nhom: duocXem.map(m => ({ ma: m, ...NHOM_TAI_LIEU[m] })),
    nhom_luu_duoc: nhomTaiLieuLuuDuoc(phien.vai_tro),
    /* Cửa hồ sơ nhân sự: trả kèm bộ loại giấy tờ + quyền quét, để giao diện
       KHÔNG giữ bản chép tay nào của hai thứ đó. Một chỗ khai, một đường đi. */
    gan_id: ganId || null,
    loai_goi_y: ganId ? LOAI_GIAY_NHAN_SU : [],
    duoc_quet_nhan_su: duocLuuNhomTaiLieu(phien.vai_tro, NHOM_CUA_NHAN_SU),
    canh_bao: CANH_BAO_PHAP_LY + (ganId ? ' ' + CANH_BAO_TRA_GIAY : '')
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
  if (!duocXemNhomTaiLieu(phien.vai_tro, tl.nhom)) {
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
  return json({
    ok: true,
    tai_lieu: {
      id: tl.id, nhom: tl.nhom, ten_nhom: NHOM_TAI_LIEU[tl.nhom]?.ten || tl.nhom,
      loai: tl.loai, tieu_de: tl.tieu_de, so_hieu: tl.so_hieu,
      ngay_ban_hanh: tl.ngay_ban_hanh, ngay_het_han: tl.ngay_het_han,
      han_luu: tl.han_luu, so_trang: tl.so_trang, co_byte: tl.co_byte,
      noi_dung: tl.noi_dung, ocr_so_trang: tl.ocr_so_trang, ocr_ghi_chu: tl.ocr_ghi_chu,
      nhay_cam: tl.nhay_cam, nguoi_tao: tl.nguoi_tao, tao_luc: tl.tao_luc,
      /* ⚠️ VÁ REV-0040 · LỖI #3 — CON SỐ AI ĐỌC PHẢI ĐEO NHÃN.
         `noi_dung` là chữ MÁY ĐỌC, và REV-0040 đo được dải mô hình giữ đúng
         danh tính tờ giấy mà vẫn thay lặng lẽ vài con số (MST lệch 2 chữ số).
         Máy chủ trả VỊ TRÍ từng cụm số để giao diện bôi khác hẳn — một định
         nghĩa ở `src/so-ai.js`, không chép bản thứ hai sang trình duyệt. */
      so_ai: viTriSoAI(tl.noi_dung),
      nhan_so_ai: NHAN_SO_AI
    },
    canh_bao: CANH_BAO_PHAP_LY
  });
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
  if (!laAdmin(phien.vai_tro)) return loi('Chỉ Admin xem được nhật ký truy cập', 403);
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
  if (!duocLuuNhomTaiLieu(phien.vai_tro, tl.nhom)) {
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
  const { results: tk } = await env.DB.prepare(`
    SELECT t.nhan_su_id, t.vai_tro FROM tai_khoan t
      JOIN nhan_su n ON n.id = t.nhan_su_id
     WHERE t.kich_hoat = 1 AND n.dang_lam = 1
  `).all();

  const theoNguoi = new Map();
  for (const nguoi of (tk || [])) {
    const cua = canNhac.filter(t => duocXemNhomTaiLieu(nguoi.vai_tro, t.nhom));
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
