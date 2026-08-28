/* ==========================================================================
   src/sao-luu.js — SAO LƯU TOÀN BỘ DỮ LIỆU ERP
   ---------------------------------------------------------------------------
   SPEC-0005 Phần B · ADR-0011 (Drive tài khoản công ty, KHÔNG R2) ·
   ADR-0013 (hai nhịp: hằng ngày + hằng tháng đưa tận tay Sếp)

   BỐI CẢNH: trước hôm nay công ty KHÔNG CÓ BẢN SAO LƯU NÀO. Toàn bộ dữ liệu
   nằm trong một database D1. Hỏng là mất sạch.

   HAI NHỊP, cả hai đều bắt buộc:

     ① HẰNG NGÀY  — máy tự chạy 0h–8h sáng, để trên Drive công ty, giữ 30 bản.
                    Cứu khi hỏng dữ liệu.
     ② HẰNG THÁNG — NGÀY 15, gói dữ liệu của THÁNG TRƯỚC thành một file .zip
                    đưa tận tay Sếp qua Telegram. Sếp tự cất. Vì bản ngày nằm
                    trên Drive công ty — MẤT TÀI KHOẢN GOOGLE LÀ MẤT LUÔN CẢ
                    KHO LẪN BẢN SAO LƯU.

   VÀ MỖI BẢN SAO LƯU TỰ MANG THEO CÁCH KHÔI PHỤC CHÍNH NÓ (Sếp Ngọc 27/08:
   "phải lưu cả cách tao khôi phục bộ nhớ và chuyển bộ nhớ đấy nhé"). Ba thứ đi
   kèm: DOC-CACH-DOC.txt đủ 3 phần · KHOI-PHUC.mjs chạy được thật ·
   SO-DO-DU-LIEU.txt. Lý do đầy đủ ở đầu src/khoi-phuc-kem.js — tóm tắt: lúc
   cần khôi phục là lúc ERP đã hỏng, không vào được repo, không có ai trực.

   BA RÀNG BUỘC KỸ THUẬT ĐỊNH HÌNH TOÀN BỘ FILE NÀY:

     · Workers gói miễn phí: 10 ms CPU MỖI LƯỢT cron → phải chia lô, không thể
       xuất cả bản sao lưu trong một lượt.
     · Google Drive resumable upload: mỗi mẩu phải là bội số 256 KiB (trừ mẩu
       cuối) → phải giữ phần đuôi lại chờ lượt sau.
     · CSV cho người Việt mở bằng Excel: PHẢI có BOM, và số điện thoại phải
       bọc ="0..." nếu không Excel ăn mất số 0 đầu.
   ========================================================================== */

import * as khoFile from './kho-file.js';
import { crc32, dauTep, cuoiTep, mucLuc } from './zip.js';
import { KHOI_PHUC_MJS, soDoDuLieu } from './khoi-phuc-kem.js';

/* ==========================================================================
   0. Các con số điều chỉnh được
   ========================================================================== */

/* --------------------------------------------------------------------------
   ⚠️ BỐN CON SỐ DƯỚI ĐÂY LÀ ĐO THẬT, KHÔNG PHẢI ĐOÁN (`npm run sao-luu-thu`).
   Cloudflare cho 10 ms CPU MỖI LƯỢT CRON trên gói miễn phí — và 10 ms đó là
   của CẢ lượt, dùng chung với đồng bộ Shopee/TikTok đang chạy trước ta.

     một lô 2.000 dòng = 5,3 ms CPU trung vị · 5,6 ms xấu nhất
                         (đã GỒM CRC32 cho cả bản ngày — vá B1 REV-0011.
                          Riêng CRC32 tốn +0,24 ms; phần còn lại là ghép CSV.)
     bản ngày năm 1    = 69 lô       (103.000 dòng, 21 bảng, 18,2 MB)
     cửa sổ 0h–8h      = 96 lượt cron, bỏ lượt đầu mỗi giờ → 88 lượt dùng được
     sức chứa một đêm  = 88 lô       (88 lượt × 1 lô — xem LO_KHI_TRE)

   → MỘT lô mỗi lượt = 5,6 ms xấu nhất trong trần 10 ms, còn 4,4 ms cho phần
     cron của người khác. 69 ≤ 88 nên xong trong một đêm, dư 19 lô cho bản tháng.

   ⚠️ TRẦN CỦA THIẾT KẾ NÀY (BH-22): ~176.000 dòng/ngày — nay đang dùng 78%
   sức (chật hơn trước vì `LO_KHI_TRE` đã hạ 2 → 1, M3 REV-0011). Vượt qua đó
   thì một đêm KHÔNG đủ lượt, và code TỰ BÁO ĐỘNG chứ không im lặng (xem
   `boPhienQuaHan`). Lúc đó phải đổi hướng: Workers Paid cho 30 GIÂY CPU mỗi
   lượt cron thay vì 10 ms, hoặc sao lưu phần thay đổi trong ngày.

   ⚠️ Số trên đo bằng Node trên máy Sếp, KHÔNG phải `workerd` trên hạ tầng
   Cloudflare, và cùng lượt cron còn 5 việc chạy trước ta chưa ai đo. Là số
   đại diện, không phải bảo chứng — tuần đầu phải soi log Cloudflare tìm dòng
   "Exceeded CPU".
   -------------------------------------------------------------------------- */

/** Số dòng đọc mỗi lô. */
export const DONG_MOI_LO = 2000;

/** Số lô mỗi lượt cron. Bình thường 1 (4,3 ms — an toàn). Sau GIO_TANG_TOC mà
    vẫn chưa xong thì lên 2 (8,6 ms — sát trần) để kịp trước giờ kho vào làm.

    Vì sao dám để chế độ sát trần: nếu VƯỢT 10 ms thật, Cloudflare cắt ngang
    lượt cron đó — nhưng KHÔNG hỏng gì. Phần đồng bộ Shopee/TikTok chạy trước ta
    đã ghi xong; phần sao lưu chưa kịp ghi trạng thái nên lượt sau làm lại đúng
    lô ấy; và nếu bị cắt đúng lúc Google vừa nhận byte thì `guiMau()` tự hỏi lại
    Google "nhận tới đâu rồi" mà đi tiếp. Tệ nhất là mất một lượt, không phải
    hỏng bản sao lưu. Đổi rủi ro đó lấy việc CÓ bản sao lưu là đáng. */
export const LO_MOI_LUOT = 1;
/** M3 (REV-0011 §3): HẠ TỪ 2 XUỐNG 1. Số 4,3 ms đo trên Node desktop chứ không
    phải `workerd`, và cùng lượt cron còn NĂM việc chạy TRƯỚC ta mà chưa ai đo
    (`shopee.dongBoNen`, `tiktok.dongBoNen`, `kiemTraCanhBaoHoan`,
    `kiemTraLyDoNghiemTrong`, `hoLyTuDongTriage`). "Còn dư 0,3 ms" là phép tính
    trên một nửa dữ liệu. Giữ 1 lô/lượt cho tới khi có số đo thật trên workerd —
    88 lượt/đêm vẫn thừa cho 69 lô. */
export const LO_KHI_TRE = 1;
export const GIO_TANG_TOC = 6;

/** Cửa sổ chạy: 0h–8h sáng giờ VN. Kho vào làm từ 8h nên cả cửa sổ này là giờ
    thấp điểm. Rộng hơn đề xuất 1h–4h của SPEC-0005, vì số đo CPU THẬT cho thấy
    36 lượt không đủ cho 69 lô. Thà chạy thong thả 1 lô/lượt suốt 8 tiếng còn
    hơn nhồi 3 lô/lượt trong 3 tiếng rồi bị Cloudflare cắt ngang liên tục. */
export const GIO_BAT_DAU = 0;
export const GIO_KET_THUC = 8;

/** Giữ bao nhiêu bản ngày (SPEC-0005 Mục 9.3). */
export const GIU_BAN_NGAY = 30;

/* --------------------------------------------------------------------------
   BẢN THÁNG CHẠY NGÀY 15, GÓI DỮ LIỆU CỦA THÁNG TRƯỚC (Sếp Ngọc chốt 27/08:
   "cứ ngày 15 hàng tháng thì sao lưu của tháng trước cho tao").

   VÌ SAO NGÀY 15 CHỨ KHÔNG PHẢI MÙNG 1 — ghi lại cho người sau khỏi "tối ưu"
   ngược: mùng 1 thì tháng vừa đóng cửa xong, kế toán chưa chốt sổ, chứng từ nhà
   cung cấp còn về muộn, đơn hoàn Shopee còn chạy. Gói ra là gói một con số còn
   động đậy. Tới ngày 15 thì tháng trước ĐÃ ỔN ĐỊNH THẬT — gói ra là số cuối
   cùng, không phải sửa lại.

   ⚠️ TÊN FILE THEO THÁNG DỮ LIỆU, KHÔNG THEO NGÀY CHẠY.
     15/09/2026 → gói tháng 08 → sao-luu-AGC-2026-08.zip
     15/10/2026 → gói tháng 09 → sao-luu-AGC-2026-09.zip
     15/01/2027 → gói tháng 12/2026 → sao-luu-AGC-2026-12.zip  ← ĐỔI CẢ NĂM,
                  đây là ca dễ sai nhất, có ca thử riêng trong npm run sao-luu-thu.

   Bản tháng chạy bằng số lượt CÒN THỪA sau khi bản ngày xong nên phải cho nó
   nhiều đêm: mở ngày 15, chưa xong tới hết ngày 24 thì báo động.
   -------------------------------------------------------------------------- */
export const NGAY_CHAY_BAN_THANG = 15;
export const NGAY_CUOI_CHO_BAN_THANG = 24;

/* ==========================================================================
   1. Chọn bảng nào để sao lưu — dùng DANH SÁCH LOẠI TRỪ, không phải liệt kê
   ---------------------------------------------------------------------------
   Vì sao loại trừ chứ không liệt kê: bảng mới sẽ còn thêm (tai_lieu, hồ sơ
   nhân sự, ...). Liệt kê thì bảng mới bị BỎ QUÊN ÂM THẦM — đúng loại lỗi mà
   không ai phát hiện cho tới ngày cần phục hồi. Loại trừ thì bảng mới tự động
   được sao lưu; muốn bỏ ra phải cố ý viết tên vào đây.
   ========================================================================== */

/** Không bao giờ sao lưu. */
export const BANG_KHONG_SAO_LUU = new Set([
  'phien',                 // phiên đăng nhập — phục hồi xong đăng nhập lại là có
  'lan_dang_nhap_hong',    // nhật ký chống dò mật khẩu, không có giá trị lịch sử
  'schema_migrations',     // do công cụ tự dựng lại
  // trạng thái của chính việc sao lưu — kể cả `sao_luu_ban` (L1 REV-0011: nó bị
  // sót lại trong khi 3 bảng anh em đều đã có mặt)
  'sao_luu_phien', 'sao_luu_thu_muc', 'sao_luu_canh_bao', 'sao_luu_ban'
]);

/** Chỉ vào bản THÁNG, không vào bản ngày. Lý do (SOURCE-OF-TRUTH.md): chủ sở
    hữu thật của đơn hàng/đơn hoàn là Shopee/TikTok — mất thì cron kéo lại
    được. Cái mất là mất luôn mới cần sao lưu hằng ngày. */
export const BANG_CHI_THEO_THANG = new Set([
  'don_hang', 'don_hang_lich_su', 'don_hoan', 'don_hoan_lich_su'
]);

/** ⚠️ CỘT BỊ LOẠI — KHOÁ SÀN KHÔNG BAO GIỜ RỜI CLOUDFLARE.
    Mất khoá thì bấm kết nối lại mất 2 phút. Khoá rò rỉ thì người ngoài đọc
    được toàn bộ đơn hàng của công ty. Không đánh đổi. */
export const COT_KHONG_SAO_LUU = {
  shopee_ket_noi: ['access_token', 'refresh_token'],
  tiktok_ket_noi: ['access_token', 'refresh_token', 'shop_cipher']
};

/** Lưới chắn cuối: bất kỳ cột nào tên nghe như khoá thì cũng bỏ, kể cả ở bảng
    chưa ai nghĩ tới. Thà thiếu một cột còn hơn phát tán một khoá. */
const MAU_TEN_COT_NGUY = /(access_token|refresh_token|_secret$|^secret|partner_key|app_secret|api_key)/i;

/** Cột hay bị Excel ăn mất số 0 đứng đầu → bọc ="0...". */
export const COT_BOC_CHUOI = new Set([
  'sdt', 'so_dien_thoai', 'dien_thoai', 'ma_nv', 'ma_sku', 'ma_ts',
  'ma_van_don', 'ma_kho', 'so_tai_khoan', 'cccd', 'so_cccd'
]);

const TEN_BANG_HOP_LE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/* ==========================================================================
   2. Làm CSV — mấy hàm thuần, không đụng mạng, dễ đem ra thử riêng
   ========================================================================== */

export const BOM = '﻿';

/* --------------------------------------------------------------------------
   ⛔ B2 (REV-0011 §6) — BẢN SAO LƯU TỰ MỞ ĐƯỜNG CHẠY MÃ TRÊN MÁY SẾP

   Excel (và Google Trang tính) coi ô bắt đầu bằng `= + - @` là CÔNG THỨC và
   CHẠY nó ngay lúc mở file. Mà `ghi_chu`, `gop_y`, `tin_nhan_chat` là ô NHÂN
   VIÊN TỰ GÕ: một người gõ `=HYPERLINK("http://…"&A1,"Bấm")` vào ô góp ý, ba
   tuần sau Sếp bấm đúp `gop_y.csv` theo đúng hướng dẫn — là nó chạy. Rào bằng
   dấu nháy CSV không cứu được: Excel bóc nháy rồi mới xét.

   CÁCH VÁ — RÀO BẰNG MỘT DẤU NHÁY ĐƠN ĐỨNG TRƯỚC, VÀ RÀO ĐẢO NGƯỢC ĐƯỢC.
   Ô nguy hiểm được viết ra thành `"'<nội dung>"`. Excel / LibreOffice / Google
   Trang tính đều hiểu dấu `'` đứng đầu là "đây là chữ, đừng tính" → hiện
   nguyên văn, KHÔNG chạy.

   VÌ SAO KHÔNG DÙNG lại mẹo `="…"` như cột số 0 đứng đầu: `="…"` không chứa
   được ký tự xuống dòng (Excel báo lỗi công thức), mà `ghi_chu` thì đầy xuống
   dòng. Dấu `'` chứa được mọi thứ.

   ⚠️ HOÀN NGUYÊN ĐÚNG LÀ BẮT BUỘC — vá kiểu làm hỏng giá trị gốc là đổi một lỗ
   lấy một lỗ tệ hơn. Nên chính dấu `'` cũng nằm trong danh sách phải rào: giá
   trị gốc `'abc` được viết ra thành `''abc`. Nhờ vậy quy tắc đọc ngược chỉ có
   MỘT câu — "thấy dấu ' đứng đầu thì bóc ĐÚNG MỘT dấu" — và không bao giờ nhập
   nhằng. Xem `docO()` bên dưới và ca thử vòng tròn trong `npm run sao-luu-thu`.
   -------------------------------------------------------------------------- */

/** Ký tự mở đầu bắt buộc phải rào:
      61 43 45 64  →  = + - @   Excel chạy cả ô như công thức
       9 10 13     →  Tab \n \r Excel cắt bỏ khoảng trắng đầu rồi mới xét, cắt
                                xong thì ký tự nguy hiểm phía sau lại lộ ra đầu
      39          →  '          dấu rào của chính ta — rào nó để đọc ngược được */
const DAU_O_NGUY = new Set([61, 43, 45, 64, 9, 10, 13, 39]);

/** Một ô CSV. Quy tắc ở SPEC-0005 Mục 9.1 + vá B2.
    @param boc  cột này có thuộc diện bọc ="0..." không — TÍNH SẴN MỘT LẦN cho
                cả bảng chứ không tra Set 22.000 lần mỗi lô. */
export function oCsv(giaTri, boc) {
  if (giaTri === null || giaTri === undefined) return '';
  const kieu = typeof giaTri;
  if (kieu === 'number') return '' + giaTri;   // số thì không bao giờ phải rào
  let s;
  if (kieu === 'string') s = giaTri;
  else if (giaTri instanceof ArrayBuffer || ArrayBuffer.isView(giaTri)) return '[nhi_phan]';
  else s = String(giaTri);
  if (s === '') return '';

  // Số 0 đứng đầu: Excel mặc định coi là số và xoá mất. Bọc thành công thức
  // ="0987654321" thì Excel giữ nguyên. An toàn vì ruột chỉ có chữ số — không
  // nhét được payload vào. Trông lạ trong Notepad nhưng Excel mới là chỗ người
  // ta sẽ mở nó.
  if (boc && s.charCodeAt(0) === 48 && /^0\d+$/.test(s)) return '"=""' + s + '"""';

  // ⛔ B2: ô bắt đầu bằng ký tự nguy hiểm → rào bằng ' và bọc nháy.
  if (DAU_O_NGUY.has(s.charCodeAt(0))) return '"\'' + s.replace(/"/g, '""') + '"';

  // Quét bằng mã ký tự thay vì biểu thức chính quy: rẻ hơn, và ô CSV thường
  // rất ngắn nên vòng lặp này gần như luôn dừng ở vài ký tự đầu.
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 44 || c === 34 || c === 10 || c === 13) return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/* --------------------------------------------------------------------------
   ĐỌC NGƯỢC — nửa còn lại của phép vá B2
   ---------------------------------------------------------------------------
   Nhận GIÁ TRỊ ĐÃ TÁCH KHỎI CSV (`phanTichCsv` đã bóc nháy, đã gộp `""` → `"`)
   và trả về ĐÚNG CHUỖI BAN ĐẦU trong database. Ai viết công cụ phục hồi thì
   dùng đúng hai hàm này, đừng tự tách bằng `split(',')`.

   Hai luật, xét theo đúng thứ tự này:
     ① Bắt đầu bằng `'`  → bóc ĐÚNG MỘT dấu. (rào B2)
     ② Đúng dạng `="0…"` → lấy ruột.          (rào giữ số 0 đứng đầu)
   Không nhập nhằng: giá trị gốc mà THẬT SỰ là chuỗi `="0123"` thì bắt đầu bằng
   `=` nên đã rơi vào luật ① lúc ghi, ra `'="0123"` — luật ① bóc trước.
   -------------------------------------------------------------------------- */
export function docO(o) {
  if (typeof o !== 'string' || o === '') return o;
  if (o.charCodeAt(0) === 39) return o.slice(1);
  const m = /^="(0\d+)"$/.exec(o);
  return m ? m[1] : o;
}

/** Tách một văn bản CSV thành mảng các hàng, mỗi hàng là mảng ô THÔ (chưa
    `docO`). Hiểu nháy kép, `""` lồng, và xuống dòng NẰM TRONG ô. */
export function phanTichCsv(vanBan) {
  const s = vanBan.charCodeAt(0) === 0xFEFF ? vanBan.slice(1) : vanBan;
  const hang = [];
  let cot = [], o = '', trongNhay = false;
  const chotO = () => { cot.push(o); o = ''; };
  const chotHang = () => { chotO(); hang.push(cot); cot = []; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (trongNhay) {
      if (c !== '"') { o += c; continue; }
      if (s[i + 1] === '"') { o += '"'; i++; } else trongNhay = false;
      continue;
    }
    if (c === '"') trongNhay = true;
    else if (c === ',') chotO();
    else if (c === '\r' && s[i + 1] === '\n') { chotHang(); i++; }
    else if (c === '\n') chotHang();
    else o += c;
  }
  if (o !== '' || cot.length) chotHang();
  return hang;
}

/* Với mỗi danh sách cột, tính SẴN cột nào phải bọc ="0...". Nhớ theo chính
   mảng cột (WeakMap) nên bảng nào tra bảng nấy, không đụng nhau. */
const nhoKeHoach = new WeakMap();
function keHoachCot(cot) {
  let k = nhoKeHoach.get(cot);
  if (!k) { k = cot.map(c => COT_BOC_CHUOI.has(c)); nhoKeHoach.set(cot, k); }
  return k;
}

/** Một dòng CSV, kết thúc bằng \r\n. */
export function dongCsv(cot, banGhi) {
  const boc = keHoachCot(cot);
  let s = '';
  for (let i = 0; i < cot.length; i++) {
    if (i) s += ',';
    s += oCsv(banGhi[cot[i]], boc[i]);
  }
  return s + '\r\n';
}

/** Dòng tiêu đề — dùng ĐÚNG tên cột trong database, không dịch sang tiếng Việt
    cho đẹp: người phục hồi cần tên thật để nạp lại. */
export function dongTieuDe(cot) {
  return cot.map(c => oCsv(c, false)).join(',') + '\r\n';
}

/** Nối hai mảng byte. Thay cho việc đổi byte ↔ chuỗi nhị phân: đo được 0,14 ms
    thay vì 2,17 ms mỗi lô — tức là lấy lại 1/5 trần CPU của cả lượt cron. */
export function noiByte(a, b) {
  if (!a || !a.length) return b;
  if (!b || !b.length) return a;
  const t = new Uint8Array(a.length + b.length);
  t.set(a, 0); t.set(b, a.length);
  return t;
}

const MA_HOA = new TextEncoder();

/* ==========================================================================
   3. KIỂM BẢN SAO LƯU — hàm thuần, là chỗ ca đối chứng bấu vào
   ---------------------------------------------------------------------------
   BH-16: bản sao lưu chưa từng thử đọc lại thì KHÔNG PHẢI bản sao lưu.
   Hàm này so bản kê khai (KIEM-TRA.csv) với những gì THẬT SỰ có.

   NÓI RÕ NÓ CHẠY Ở ĐÂU, đừng để ai tưởng nhầm:
     · `scripts/kiem-tra-ban-sao-luu.mjs` gọi hàm này trên thư mục Sếp đã TẢI
       VỀ MÁY — đây mới là phép kiểm đầy đủ: có đủ file không, đếm lại từng
       dòng, so từng byte.
     · Trong Worker thì KHÔNG gọi hàm này. Worker kiểm bằng hai cách rẻ hơn
       ngay lúc ghi (xem `hoanTat`): so cỡ file Google báo với cỡ ta đếm, và
       đọc ngược 400 byte cuối của một file bất kỳ. Đọc lại cả 18 MB mỗi đêm
       chỉ để đếm dòng thì hết sạch trần 10 ms CPU.

   Ca đối chứng: xoá một file CSV đi → hàm này PHẢI trả về lỗi 'thieu_tep'.
   Nếu nó vẫn báo "ổn" thì phép kiểm hỏng, chứ không phải bản sao lưu tốt.
   ========================================================================== */

/**
 * @param {Array} keKhai  [{bang, so_dong, co_byte, crc}] — bản kê khai lúc ghi
 * @param {Array} thucTe  [{ten, co_byte, so_dong?, crc?}] — thứ thật sự đang có
 * @returns {{dat:boolean, loi:string[]}}
 */
export function kiemTraKeKhai(keKhai, thucTe) {
  const loi = [];
  const co = new Map(thucTe.map(t => [t.ten, t]));

  if (!Array.isArray(keKhai) || keKhai.length === 0) {
    return { dat: false, loi: ['thieu_ke_khai: không có KIEM-TRA.csv hoặc nó rỗng'] };
  }

  for (const k of keKhai) {
    const ten = `${k.bang}.csv`;
    const t = co.get(ten);
    if (!t) { loi.push(`thieu_tep: kê khai có "${ten}" nhưng KHÔNG tìm thấy file`); continue; }
    if (Number(t.co_byte) !== Number(k.co_byte)) {
      loi.push(`lech_byte: ${ten} kê khai ${k.co_byte} byte, thật ${t.co_byte} byte`);
    }
    if (t.so_dong !== undefined && Number(t.so_dong) !== Number(k.so_dong)) {
      loi.push(`lech_dong: ${ten} kê khai ${k.so_dong} dòng, thật ${t.so_dong} dòng`);
    }

    /* ---- ⛔ B1 — MÃ KIỂM CRC32: chỗ DUY NHẤT bắt được file bị SỬA RUỘT ------
       Tên · số dòng · số byte đều mù trước ca "sửa một ký tự, giữ nguyên cỡ" —
       đúng dạng hỏng của bit rot, của lỗi ghi Drive, của người sửa lén. CRC32
       nhìn TỪNG BYTE nên đổi một ký tự là lệch ngay. */
    if (k.crc === undefined || k.crc === null || k.crc === '') {
      loi.push(`thieu_ma_kiem: ${ten} — bản kê khai KHÔNG có cột crc32, ` +
        `không kiểm được ruột file. Bản sao lưu này ghi bằng bản mã cũ.`);
    } else if (t.crc !== undefined && (Number(t.crc) >>> 0) !== (Number(k.crc) >>> 0)) {
      loi.push(`lech_ma_kiem: ${ten} kê khai crc32 ${Number(k.crc) >>> 0}, ` +
        `thật ${Number(t.crc) >>> 0} — file ĐÚNG CỠ nhưng RUỘT ĐÃ KHÁC.`);
    }
    co.delete(ten);
  }

  for (const [ten] of co) {
    if (TEP_DI_KEM.has(ten)) continue;
    loi.push(`thua_tep: có "${ten}" nhưng không nằm trong bản kê khai`);
  }

  return { dat: loi.length === 0, loi };
}

/** Đếm số dòng dữ liệu của một file CSV (bỏ dòng tiêu đề, bỏ dòng rỗng cuối).
    Đếm theo \r\n ở NGOÀI dấu nháy — trong ô có thể có xuống dòng. */
export function demDongCsv(vanBan) {
  let s = vanBan.charCodeAt(0) === 0xFEFF ? vanBan.slice(1) : vanBan;
  let trongNhay = false, dong = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { if (trongNhay && s[i + 1] === '"') i++; else trongNhay = !trongNhay; }
    else if (c === '\n' && !trongNhay) dong++;
  }
  return Math.max(0, dong - 1); // trừ dòng tiêu đề
}

/* ==========================================================================
   4. BỐN FILE ĐI KÈM MỖI BẢN SAO LƯU
   ---------------------------------------------------------------------------
   Chúng KHÔNG nằm trong bản kê khai (kê khai chỉ kê các bảng dữ liệu), nên
   `kiemTraKeKhai` phải biết mà bỏ qua — không thì phép kiểm sẽ hô `thua_tep`,
   tức BÁO ĐỘNG GIẢ đúng lúc người ta đang hoảng nhất, lúc đang phục hồi.

   KHOI-PHUC.sql cũng nằm trong danh sách này: chính KHOI-PHUC.mjs đẻ ra nó
   ngay trong thư mục bản sao lưu ở Bước 5, rồi người ta chạy lại phép kiểm.
   ========================================================================== */
export const TEP_DI_KEM = new Set([
  'KIEM-TRA.csv', 'DOC-CACH-DOC.txt', 'SO-DO-DU-LIEU.txt',
  'KHOI-PHUC.mjs', 'KHOI-PHUC.sql'
]);

/** ⛔ B1: cột `crc32` là mã kiểm từng byte. Để trống khi không có — để phép
    kiểm KÊU LÊN (`thieu_ma_kiem`) thay vì âm thầm chấm ĐẠT. */
export function keKhaiCsv(keKhai) {
  let s = BOM + 'bang,so_dong,co_byte,crc32,ten_tep\r\n';
  for (const k of keKhai) {
    const ma = (k.crc === undefined || k.crc === null) ? '' : String(Number(k.crc) >>> 0);
    s += `${k.bang},${k.so_dong},${k.co_byte},${ma},${k.bang}.csv\r\n`;
  }
  return s;
}

/** Viết cho người KHÔNG biết kỹ thuật. Không có từ chuyên môn nào không giải thích. */
export function docCachDoc({ moc, loai, keKhai }) {
  const tongDong = keKhai.reduce((t, k) => t + Number(k.so_dong || 0), 0);
  const tongMb = (keKhai.reduce((t, k) => t + Number(k.co_byte || 0), 0) / 1048576).toFixed(1);
  const nhan = loai === 'thang' ? `tháng ${moc}` : `ngày ${moc}`;

  return `BẢN SAO DỮ LIỆU ERP — CÔNG TY TNHH ALPHA GREEN COMMERCE
Bản của ${nhan}. Tổng ${keKhai.length} bảng, ${tongDong.toLocaleString('vi-VN')} dòng, khoảng ${tongMb} MB.

TRONG FILE NÀY CÓ BA PHẦN — NHẢY THẲNG TỚI PHẦN CẦN ĐỌC
-------------------------------------------------------
  PHẦN 1  File nào là gì, mở bằng gì            ← đọc khi chỉ muốn XEM dữ liệu
  PHẦN 2  Khôi phục: đưa bản này trở lại ERP    ← đọc khi ERP HỎNG, MẤT DỮ LIỆU
  PHẦN 3  Chuyển sang phần mềm khác             ← đọc khi công ty BỎ ERP này

Cùng thư mục còn hai file nữa, cũng là của bản sao lưu này:
  KHOI-PHUC.mjs     công cụ khôi phục, chạy được thật, không cần Internet
  SO-DO-DU-LIEU.txt bảng nào nối bảng nào, dành cho người nhận dữ liệu

Ba thứ đó nằm NGAY TRONG bản sao lưu là cố ý: lúc cần khôi phục thì ERP đã
hỏng, có khi không vào được mạng nội bộ, không có ai trực. Thứ duy nhất còn
trong tay là chính thư mục này — nên mọi thứ cần biết phải nằm ở đây.


${'='.repeat(78)}
  PHẦN 1 — FILE NÀO LÀ GÌ
${'='.repeat(78)}

ĐÂY LÀ CÁI GÌ
-------------
Đây là bản chụp toàn bộ dữ liệu trong phần mềm ERP của công ty tại thời điểm
trên. Nếu một ngày nào đó phần mềm hỏng, mất tài khoản, hay công ty đổi sang
phần mềm khác, thì mở mấy file trong đây ra là vẫn còn nguyên dữ liệu.

Không cần phần mềm ERP để đọc. Không cần Internet. Không cần ai giúp.

MỞ BẰNG GÌ
----------
Mỗi file đuôi .csv là MỘT BẢNG dữ liệu. Bấm đúp vào là Microsoft Excel mở ra,
y như một file Excel bình thường.

Nếu máy không có Excel: mở bằng Google Trang tính (sheets.google.com →
Tệp → Nhập → Tải lên), hoặc LibreOffice Calc (miễn phí).

Chữ tiếng Việt hiện đúng dấu, số điện thoại giữ nguyên số 0 đứng đầu.
Riêng cột số điện thoại và mã nhân viên nhìn trong Notepad sẽ thấy dạng
="0987654321" — đó là cố ý, mở bằng Excel là hiện đúng.

HAI DẤU LẠ TRONG FILE — CỐ Ý CẢ, ĐỪNG SỬA
------------------------------------------
1. Dạng ="0987654321"  → giữ số 0 đứng đầu, Excel mở ra hiện 0987654321.
2. Một dấu nháy đơn '  đứng ngay đầu ô → ô đó bắt đầu bằng = + - @ hoặc dấu
   nháy đơn. Excel coi ô bắt đầu bằng = + - @ là PHÉP TÍNH và tự chạy nó. Nhân
   viên gõ gì vào ô ghi chú thì máy chép nguyên vào đây, nên nếu không chặn thì
   mở file ra là máy chạy thứ người khác gõ. Dấu ' chính là cái chặn đó.

   Muốn lấy lại đúng chữ ban đầu: bỏ ĐÚNG MỘT dấu ' ở đầu ô. Không mất gì cả —
   ô nào vốn đã bắt đầu bằng ' thì máy ghi thành hai dấu, bỏ một còn một.

CẦN GÌ THÌ XEM Ở ĐÂU
--------------------
${motTaBang(keKhai)}
Muốn biết chắc bản này còn NGUYÊN VẸN không: mở file KIEM-TRA.csv. Nó ghi mỗi
bảng có bao nhiêu dòng, nặng bao nhiêu byte, và một MÃ KIỂM (cột crc32).

Mã kiểm là con số tính ra từ TỪNG BYTE của file. Đổi đúng một chữ cái trong
file mà không đổi kích thước thì số dòng và số byte vẫn khớp — chỉ mã kiểm là
lệch. Đó là cách duy nhất biết được file có bị sửa ruột hay hỏng ngầm không.

Người kỹ thuật chấm cả thư mục bằng một lệnh:
  npm run sao-luu-kiemtra -- "đường-dẫn-thư-mục-vừa-tải-về"

CẤT Ở ĐÂU
---------
${loai === 'thang'
  ? `Bản này là bản của RIÊNG SẾP, máy gói vào NGÀY 15 hằng tháng và gói dữ
liệu của THÁNG TRƯỚC (tới ngày 15 thì tháng trước đã chốt sổ xong, số liệu
không còn nhúc nhích nữa). Tải về máy, chép ra một ổ cứng rời hoặc một chỗ
khác Google Drive. Lý do: bản chạy hằng ngày nằm trên Drive của công ty — nếu
mất tài khoản Google thì mất luôn cả bản sao lưu. Bản này phải nằm ngoài.`
  : `Bản này máy tự tạo mỗi đêm và giữ ${GIU_BAN_NGAY} bản gần nhất. Quá ${GIU_BAN_NGAY} ngày thì tự
xoá bản cũ nhất. Ngày 15 hằng tháng máy gói riêng dữ liệu của THÁNG TRƯỚC
thành một file .zip và gửi cho Sếp qua Telegram để Sếp tự cất ra ngoài.`}

DỮ LIỆU NHẠY CẢM — ĐỌC KỸ
-------------------------
Trong này có lương, số căn cước, chứng từ thuế của nhân viên. Ai cầm được thư
mục này là đọc được hết. KHÔNG gửi qua Zalo, KHÔNG để trong thư mục dùng chung.

Mật khẩu đăng nhập ERP thì KHÔNG có trong đây (phần mềm không lưu mật khẩu
thật, chỉ lưu dấu vân của nó). Khoá kết nối Shopee và TikTok cũng KHÔNG có
trong đây — cố ý bỏ ra, vì khoá lọt ra ngoài là người lạ đọc được đơn hàng.


${'='.repeat(78)}
  PHẦN 2 — KHÔI PHỤC: ĐƯA BẢN NÀY TRỞ LẠI VÀO ERP
${'='.repeat(78)}

Đọc phần này khi ERP hỏng, mất dữ liệu, hoặc ai đó lỡ tay xoá mất thứ gì.

⚠️⚠️ ĐỌC HẾT KHUNG NÀY TRƯỚC KHI GÕ BẤT KỲ LỆNH NÀO ⚠️⚠️

  KHÔI PHỤC LÀ XOÁ TRẮNG RỒI GHI ĐÈ, KHÔNG PHẢI "GỘP THÊM VÀO".

  Mọi dòng dữ liệu phát sinh SAU thời điểm ${nhan} sẽ MẤT VĨNH VIỄN. Đơn hàng
  mới, phiếu kho mới, chấm công mới — mất hết, không có nút hoàn tác.

  Cho nên VIỆC ĐẦU TIÊN, TRƯỚC KHI KHÔI PHỤC, là SAO LƯU CÁI ĐANG CÓ. Kể cả
  khi cái đang có trông như đã hỏng — hỏng vẫn hơn không có. Cách làm ở Bước 2.

BƯỚC 1 — CHUẨN BỊ BỐN THỨ
--------------------------
  a) Chính thư mục này (đã giải nén ra khỏi file .zip nếu là bản tháng).
  b) Node.js phiên bản 22 trở lên. Chưa có thì tải ở nodejs.org, bản "LTS",
     bấm Next tới hết. Kiểm bằng cách mở PowerShell gõ:  node --version
  c) Tài khoản Cloudflare của công ty (nơi đang chứa dữ liệu ERP).
  d) Mã nguồn ERP trên máy. Không có cũng khôi phục được — xem Bước 5b.

  Máy Sếp dùng PowerShell. Mở bằng cách: bấm nút Start, gõ chữ powershell,
  bấm Enter. Cửa sổ nền xanh hoặc đen hiện ra là đúng.

BƯỚC 2 — SAO LƯU CÁI ĐANG CÓ (KHÔNG ĐƯỢC BỎ QUA)
-------------------------------------------------
  Trong PowerShell, ở thư mục mã nguồn ERP, gõ:

      npx wrangler d1 export crm-agc --remote --output=truoc-khi-khoi-phuc.sql

  Chạy xong sẽ có một file truoc-khi-khoi-phuc.sql. Chép nó ra chỗ khác, ngoài
  máy này. Đó là đường lùi duy nhất nếu khôi phục xong mới phát hiện chọn nhầm
  bản. ERP hỏng nặng tới mức lệnh này cũng không chạy được thì ghi lại đúng
  dòng báo lỗi rồi mới đi tiếp.

BƯỚC 3 — SOI BẢN SAO LƯU XEM CÒN NGUYÊN KHÔNG
----------------------------------------------
  Trong PowerShell, gõ (nhớ dấu nháy kép quanh đường dẫn):

      cd "đường-dẫn-tới-thư-mục-này"
      node KHOI-PHUC.mjs

  File KHOI-PHUC.mjs nằm sẵn ngay trong thư mục này. Nó tự chạy được, không cần
  Internet, không cần mã nguồn ERP.

  Nó sẽ soi từng file: đủ file chưa, đủ dòng chưa, đủ byte chưa, và MÃ KIỂM
  CRC32 có khớp không.

  ✔ Thấy dòng "ĐẠT — đủ … bảng, … mã kiểm khớp từng file"  → đi tiếp Bước 4.
  ✘ Thấy khung "TỪ CHỐI KHÔI PHỤC"                          → DỪNG. Bản này đã
    hỏng. Nó KHÔNG ghi gì cả, dữ liệu hiện tại vẫn nguyên. Lấy bản sao lưu của
    NGÀY KHÁC, hoặc file .zip tháng Sếp cất ở ổ cứng rời, rồi làm lại Bước 3.
    Đừng cố ép bản hỏng vào — ép vào là hỏng thêm cái đang có.

BƯỚC 4 — XÁC NHẬN
------------------
  Soi xong nó in ra một khung cảnh báo và dừng lại hỏi. Đọc kỹ dòng "Sẽ ghi:
  … bảng, … dòng" xem có đúng bản mình định dùng không, rồi gõ đúng hai chữ

      GHI ĐÈ

  và bấm Enter. Gõ sai chữ, hay bấm Enter suông, là nó huỷ và không ghi gì.

BƯỚC 5 — GHI VÀO ERP
---------------------
  5a) Bước 4 xong, nó tạo ra file KHOI-PHUC.sql ngay trong thư mục này và in
      ra màn hình đúng dòng lệnh cần chạy. Chép nguyên dòng đó, dán vào
      PowerShell ĐANG MỞ TẠI THƯ MỤC MÃ NGUỒN ERP, bấm Enter. Dạng của nó:

          npx wrangler d1 execute crm-agc --remote --file="…\\KHOI-PHUC.sql"

      Muốn chắc ăn thì chạy thử trên máy trước: đổi --remote thành --local.
      Chạy thử không đụng gì tới dữ liệu thật.

  5b) KHÔNG CÓ MÃ NGUỒN ERP, hoặc chỉ muốn lấy dữ liệu ra dùng chỗ khác:

          node KHOI-PHUC.mjs --vao-sqlite=du-lieu-erp.db

      Nó đổ thẳng toàn bộ vào một file du-lieu-erp.db. Mở file đó bằng
      DB Browser for SQLite (miễn phí, tải ở sqlitebrowser.org) là xem được
      hết. Xem thêm PHẦN 3 bên dưới.

BƯỚC 6 — LÀM SAO BIẾT ĐÃ KHÔI PHỤC ĐÚNG
----------------------------------------
  Ba phép kiểm, làm đủ cả ba thì mới yên tâm:

  ① Đếm dòng. Trong PowerShell ở thư mục mã nguồn ERP:

        npx wrangler d1 execute crm-agc --remote --command="SELECT COUNT(*) FROM nhan_su"

     Con số hiện ra phải BẰNG ĐÚNG số ở cột so_dong, dòng nhan_su, trong file
     KIEM-TRA.csv. Làm lại phép này với thêm hai ba bảng nữa cho chắc —
     giao_dich_kho và lich_lam_viec là hai bảng đáng kiểm nhất.

  ② Mở ERP lên, đăng nhập, vào xem danh sách nhân sự và sổ kho. Thấy dữ liệu
     hiện ra bình thường, tiếng Việt đúng dấu, là đúng.

  ③ Xem mốc thời gian. Bản ghi mới nhất trong ERP phải rơi vào khoảng ${nhan},
     không được mới hơn. Nếu thấy mới hơn thì lệnh chưa chạy hết — chạy lại
     Bước 5 từ đầu.

  Xong cả ba thì báo cho bộ phận kỹ thuật biết đã khôi phục bản nào, lúc nào.

CÓ TRỤC TRẶC
-------------
  · "node : The term 'node' is not recognized"
      → Chưa cài Node.js, hoặc cài xong chưa mở lại PowerShell. Đóng cửa sổ,
        mở cửa sổ PowerShell mới rồi gõ lại.
  · "Không thấy file KIEM-TRA.csv trong thư mục này"
      → Đang đứng nhầm chỗ, hoặc chưa giải nén file .zip. Giải nén rồi cd vào
        đúng thư mục vừa giải nén ra.
  · Windows báo file .zip HỎNG, không giải nén được
      ("The compressed (zipped) folder is invalid", hoặc bấm đúp không mở ra gì)
      → File .zip bị hỏng lúc tải về, KHÔNG phải bản sao lưu hỏng. Làm theo
        thứ tự này, dừng lại ngay khi được:
        ① Tải lại file .zip đó từ Google Drive một lần nữa — hay gặp nhất là
           tải dở nửa chừng. Đối chiếu dung lượng file vừa tải với dung lượng
           Drive hiển thị, phải bằng nhau.
        ② Vẫn hỏng thì thử giải nén bằng 7-Zip (miễn phí, 7-zip.org) — nó đọc
           được nhiều file mà Windows chê.
        ③ Vẫn hỏng thì LẤY BẢN SAO LƯU KHÁC. Trên Drive còn nhiều bản của các
           ngày trước, mỗi bản đứng độc lập, lấy bản gần nhất còn mở được là
           dùng bình thường — chỉ mất phần dữ liệu phát sinh sau ngày đó.
        ④ Không bản nào mở được thì báo bộ phận kỹ thuật, kèm tên file và
           dung lượng. ĐỪNG cố sửa file .zip bằng công cụ vá lỗi trên mạng.
  · Giải nén ra rồi nhưng KHÔNG THẤY file KHOI-PHUC.mjs
      → Thiếu đúng cái công cụ chạy Bước 5. Bản sao lưu vẫn còn nguyên giá trị:
        toàn bộ dữ liệu nằm trong các file .csv, chúng mới là thứ quan trọng.
        ① Cách nhanh nhất: tải một bản sao lưu KHÁC trên Drive, chép riêng file
           KHOI-PHUC.mjs từ bản đó sang thư mục này. File này giống hệt nhau ở
           mọi bản, không gắn với ngày nào — chép sang là chạy được ngay.
        ② Không có bản nào khác thì vẫn đọc được hết dữ liệu mà không cần công
           cụ: bấm đúp bất kỳ file .csv nào, Excel mở ra xem bình thường. Nhập
           lại vào phần mềm khác thì đọc PHẦN 3 bên dưới.
        ③ Cần khôi phục vào ERP thật thì báo bộ phận kỹ thuật — họ sinh lại
           file này từ mã nguồn trong vài phút.
  · "FOREIGN KEY constraint failed" lúc chạy Bước 5
      → Chạy lại đúng lệnh đó thêm một lần. File .sql đã có sẵn dòng
        PRAGMA defer_foreign_keys = ON để tránh chuyện này.
      → Lỗi này KHÔNG làm mất dữ liệu — xem mục ngay dưới đây.
      → Vẫn báo lỗi ở lần thứ hai thì dừng lại, báo bộ phận kỹ thuật.
  · "please use the state.storage.transaction() ... instead of ... BEGIN"
      → Đang chạy một file .sql sinh ra cho sqlite3 (có dòng BEGIN) vào ERP.
        ERP không nhận dòng đó. Sinh lại bản đúng bằng lệnh:
              node KHOI-PHUC.mjs
        rồi chạy lại Bước 5. Lỗi này dừng trước khi ghi, không mất gì.
  · Chạy nửa chừng thì mất điện / mất mạng / lỡ đóng cửa sổ
      → DỮ LIỆU KHÔNG MẤT. Cả file .sql chạy trọn trong MỘT giao dịch: hoặc vào
        được hết, hoặc không vào gì cả. Chưa chốt xong mà đứt thì cơ sở dữ liệu
        tự hoàn tác sạch, quay về đúng như trước lúc chạy — không bao giờ có
        cảnh xoá xong mà chưa kịp ghi lại.
      → Cứ chạy lại Bước 5 từ đầu. Chạy mấy lần cũng ra cùng một kết quả, không
        bị nhân đôi dữ liệu.
      → Muốn chắc thì làm Bước 6 ① trước khi chạy lại: đếm thử vài bảng, so với
        KIEM-TRA.csv để biết đang đứng ở đâu.
  · Muốn chạy file KHOI-PHUC.sql bằng sqlite3 hoặc DB Browser (không qua ERP)
      → Sinh lại bản dành riêng cho công cụ đó, nó tự bọc giao dịch:
              node KHOI-PHUC.mjs --sql-cho-sqlite
        Bản mặc định KHÔNG bọc, vì ERP tự bọc hộ và cấm file tự bọc lấy.


${'='.repeat(78)}
  PHẦN 3 — CHUYỂN SANG PHẦN MỀM KHÁC
${'='.repeat(78)}

Đọc phần này khi công ty bỏ ERP này. Nguyên tắc Sếp Ngọc đặt ra từ đầu:
ĐỔI CÔNG CỤ LÀ DÙNG ĐƯỢC NGAY — dữ liệu không được nhốt trong phần mềm nào.

Người tiếp nhận KHÔNG CẦN biết gì về ERP cũ, không cần hỏi ai. Đủ ba thứ:
mấy file .csv trong đây, file SO-DO-DU-LIEU.txt, và phần chữ này.

BƯỚC ĐẦU TIÊN — DỰNG LẠI THÀNH MỘT CƠ SỞ DỮ LIỆU
-------------------------------------------------
Đưa cả đống .csv về một file duy nhất, phần mềm nào cũng đọc được:

    node KHOI-PHUC.mjs --vao-sqlite=du-lieu-erp.db

Ra file du-lieu-erp.db, định dạng SQLite — định dạng cơ sở dữ liệu phổ biến
nhất thế giới, mọi ngôn ngữ lập trình và mọi công cụ nhập liệu đều đọc được.
Mở bằng mắt thì dùng DB Browser for SQLite (miễn phí, sqlitebrowser.org).

Không muốn dùng SQLite thì cứ nhập thẳng từng file .csv — chúng là CSV chuẩn,
mã UTF-8, có BOM, ngăn bằng dấu phẩy, xuống dòng kiểu CRLF, ô có dấu phẩy hoặc
xuống dòng thì được bọc trong nháy kép và nháy kép trong ô được viết thành hai.

BẢNG NÀO NỐI VỚI BẢNG NÀO
--------------------------
Nằm đủ trong file SO-DO-DU-LIEU.txt cùng thư mục. Mở nó ra đọc trước khi nhập.

Quy tắc đọc, chỉ có một câu: cột nào tên kiểu <tên-bảng>_id thì con số trong đó
là số ở cột id của file <tên-bảng>.csv. Ví dụ giao_dich_kho.csv có cột
nhan_su_id — muốn biết lần xuất kho đó ai làm thì lấy số ấy, sang nhan_su.csv
tìm dòng có id đúng bằng số ấy.

MẤY CÁI TÊN CỘT LẶP ĐI LẶP LẠI — NGHĨA LÀ GÌ
---------------------------------------------
  id             Số thứ tự riêng của dòng đó, do máy tự đánh. Không trùng nhau
                 trong cùng một bảng. Đây là thứ mọi cột …_id trỏ tới.
  ten            Tên gọi, dạng chữ.
  tao_luc        Lúc dòng này được TẠO RA. Dạng "2026-08-27 14:30:00", giờ Việt
                 Nam (không phải giờ quốc tế — đã cộng sẵn 7 tiếng).
  cap_nhat_luc   Lúc dòng này được SỬA LẦN GẦN NHẤT. Cùng dạng như trên.
  luc            Mốc thời gian của chính sự việc (không phải lúc nhập máy).
  trang_thai     Tình trạng, ghi bằng chữ không dấu: cho_duyet, da_duyet,
                 tu_choi, dang_chay, xong, huy… Đọc là chờ duyệt / đã duyệt /
                 từ chối / đang chạy / xong / huỷ.
  hoat_dong      1 là còn dùng, 0 là đã ngưng. KHÔNG PHẢI ĐÃ XOÁ — ERP này gần
                 như không xoá gì, chỉ tắt đi. Nhập liệu nhớ giữ đúng ý đó.
  loai           Phân loại, ghi bằng chữ không dấu.
  ghi_chu        Chữ do người dùng tự gõ. Có thể có xuống dòng bên trong ô.
  nhan_su_id     → nhan_su.id — người liên quan tới dòng này.
  phong_ban_id   → phong_ban.id
  san_pham_id    → san_pham.id
  gia_tri_cu     Ở các bảng tên …_lich_su: giá trị TRƯỚC khi sửa.
  gia_tri_moi    Ở các bảng tên …_lich_su: giá trị SAU khi sửa.
  truong         Ở các bảng tên …_lich_su: tên cột nào vừa bị sửa.

Bảng nào tên kết thúc bằng _lich_su là NHẬT KÝ THAY ĐỔI của bảng cùng tên —
ai sửa gì, lúc nào, từ giá trị nào sang giá trị nào. Không nhập cũng chạy được
phần mềm mới, nhưng mất dấu vết thì mất luôn khả năng đối chất về sau.

BA CHỖ DỄ MẤT DỮ LIỆU KHI NHẬP — CẨN THẬN
------------------------------------------
1. Bỏ nốt hai dấu rào. Ô bắt đầu bằng một dấu ' thì bỏ ĐÚNG MỘT dấu đó. Ô dạng
   ="0987654321" thì lấy phần trong nháy. Không bỏ thì số điện thoại của cả
   công ty thừa một ký tự lạ. (Vì sao có hai dấu này: xem PHẦN 1 bên trên.)

2. Số 0 đứng đầu. Số điện thoại, mã nhân viên, số căn cước, mã vận đơn — nhập
   vào cột kiểu SỐ là mất số 0 đầu ngay. Phải để kiểu CHỮ.

3. Ô trống. File CSV không phân biệt được "không có gì" với "chuỗi rỗng". Chọn
   một cách hiểu rồi giữ nguyên cách đó cho toàn bộ, đừng lúc này lúc khác.

THỨ KHÔNG CÓ TRONG BẢN NÀY
---------------------------
  · Mật khẩu đăng nhập — ERP không lưu mật khẩu thật. Sang phần mềm mới thì
    phải đặt mật khẩu mới cho từng người.
  · Khoá kết nối Shopee / TikTok — cố ý bỏ ra vì lý do an toàn. Sang phần mềm
    mới thì bấm kết nối lại, mất 2 phút.
  · Ảnh và tệp đính kèm — ô nào ghi [nhi_phan] là chỗ đó vốn là dữ liệu nhị
    phân. File thật nằm ở kho tài liệu trên Google Drive, tải riêng.

Tạo tự động lúc ${new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16)} (giờ Việt Nam).
`;
}

/* Vài dòng mô tả bảng bằng tiếng người. Bảng nào chưa có mô tả thì bỏ qua —
   thà im lặng còn hơn mô tả sai. */
export const MO_TA_BANG = {
  nhan_su: 'danh sách nhân sự (họ tên, phòng ban, chức danh, ngày vào)',
  tai_khoan: 'tài khoản đăng nhập ERP (KHÔNG có mật khẩu thật)',
  san_pham: 'danh mục sản phẩm',
  nha_cung_cap: 'danh sách nhà cung cấp',
  kho: 'các kho hàng',
  giao_dich_kho: 'SỔ CÁI XUẤT NHẬP KHO — từng lần nhập, từng lần xuất',
  lo_hang: 'lô hàng và hạn sử dụng',
  cong_viec: 'công việc đã giao và kết quả',
  muc_tieu: 'mục tiêu quý/năm',
  lich_lam_viec: 'CHẤM CÔNG — ai làm ca nào ngày nào',
  dang_ky_ca: 'đăng ký ca của nhân viên',
  ca_mo: 'các ca đã mở cho nhân viên đăng ký',
  tai_san: 'tài sản công ty (máy móc, thiết bị)',
  thong_bao: 'thông báo đã gửi trong hệ thống',
  gop_y: 'góp ý của nhân viên',
  don_hang: 'đơn hàng Shopee/TikTok',
  don_hoan: 'đơn hoàn Shopee/TikTok',
  vinh_danh: 'ghi nhận, khen thưởng nhân viên'
};

function motTaBang(keKhai) {
  const co = keKhai.filter(k => MO_TA_BANG[k.bang]);
  if (!co.length) return '(mỗi file .csv là tên bảng dữ liệu tương ứng)\n';
  return co.map(k => `  ${(k.bang + '.csv').padEnd(24)} ${MO_TA_BANG[k.bang]}`).join('\n') +
    (co.length < keKhai.length ? `\n  (còn ${keKhai.length - co.length} bảng phụ khác)` : '') + '\n';
}

/* ==========================================================================
   5. Giờ giấc
   ========================================================================== */

/** Giờ Việt Nam, trả về một Date mà các hàm getUTC* đọc ra giờ VN. */
export function gioVN(luc = Date.now()) { return new Date(luc + 7 * 3600 * 1000); }
export function ngayVN(d = gioVN()) { return d.toISOString().slice(0, 10); }
export function thangVN(d = gioVN()) { return d.toISOString().slice(0, 7); }

/** THÁNG TRƯỚC của một mốc, dạng YYYY-MM. Bản tháng chạy ngày 15 gói tháng này.

    ⚠️ Ca dễ sai nhất là THÁNG 1: ngày 15/01/2027 phải ra "2026-12" — lùi tháng
    thì phải lùi CẢ NĂM. Viết bằng phép tính tay trên số năm/tháng chứ không
    bằng `setUTCMonth(-1)` cho khỏi dính mấy trò nhảy múi giờ của Date. */
export function thangTruoc(d = gioVN()) {
  const nam = d.getUTCFullYear();
  const thang0 = d.getUTCMonth();                 // 0–11
  const t = thang0 === 0 ? 12 : thang0;           // tháng trước, 1–12
  const n = thang0 === 0 ? nam - 1 : nam;
  return `${n}-${String(t).padStart(2, '0')}`;
}

/* ==========================================================================
   6. VÒNG CHẠY CHÍNH — gọi từ scheduled() mỗi 5 phút
   ========================================================================== */

/**
 * @param {object} env
 * @param {{guiThongBao:Function, guiTelegram:Function}} bao  — mượn của index.js,
 *        để KHÔNG dựng kênh báo thứ hai (SPEC-0005 Mục 11).
 */
export async function chayMotLuot(env, bao) {
  if (!khoFile.daCauHinh(env)) {
    // Chưa cấp quyền Google → im lặng bỏ qua, KHÔNG crash cron của Shopee/TikTok.
    // Bê nguyên khuôn `if (!env.MINH_CHUNG)` đang dùng cho R2 minh chứng.
    console.log('Sao lưu: chưa cấu hình Google Drive — bỏ qua.');
    return { bo: 'chua_cau_hinh' };
  }

  const vn = gioVN();
  const gio = vn.getUTCHours(), phut = vn.getUTCMinutes();

  // ---- LỚP BÁO ĐỘNG B: "hôm qua có bản không?" (BH-21) -------------------
  // Lớp A chỉ báo được KHI NÓ CHẠY. Cron chết hẳn, khoá bị thu hồi, ai đó lỡ
  // tay xoá một dòng — lớp A im lặng tuyệt đối, đúng lúc cần nhất. Lớp B là
  // câu hỏi độc lập, hỏi mỗi ngày một lần, không phụ thuộc việc sao lưu có
  // chạy hay không.
  if (gio === 9 && phut < 5) {
    try { await kiemTraLopB(env, bao); } catch (e) { console.error('Sao lưu lớp B:', e.message); }
    try { await kiemTraDungLuong(env, bao); } catch (e) { console.error('Sao lưu dung lượng:', e.message); }
  }

  // ---- Ngoài cửa sổ 0h–8h sáng thì thôi ----------------------------------
  if (gio < GIO_BAT_DAU || gio >= GIO_KET_THUC) return { bo: 'ngoai_gio' };

  // Lượt đầu mỗi giờ (phút 0–4) là lượt NẶNG NHẤT của cron: đó là lúc
  // dongBoDonHangNen() kéo hàng nghìn đơn hàng về. Nhồi thêm việc sao lưu vào
  // đúng lượt đó là cách chắc chắn nhất để vượt 10 ms. Nhường.
  if (phut < 5) return { bo: 'nhuong_dong_bo_don_hang' };

  await boPhienQuaHan(env, bao);

  let p = await layPhien(env);
  if (!p) {
    p = await moPhienMoi(env, bao);
    if (!p) return { bo: 'khong_co_viec' };
  }
  napDem(p);

  // Trễ giờ thì tăng tốc — xem chú thích ở LO_KHI_TRE.
  const soLo = gio >= GIO_TANG_TOC ? LO_KHI_TRE : LO_MOI_LUOT;

  try {
    for (let i = 0; i < soLo; i++) {
      const ket = await motLo(env, p, bao);
      if (ket === 'xong') break;
    }
    await luuPhien(env, p);
    return { ban: p.ban_id, bang: p.chi_so_bang };
  } catch (e) {
    await baoHong(env, bao, p, e);
    throw e;
  }
}

/* ---- Phiên ------------------------------------------------------------- */

async function layPhien(env) {
  // Bản NGÀY được ưu tiên trước bản THÁNG: bản ngày là lưới an toàn, bản tháng
  // được phép trải 3 đêm nên nhường được.
  return env.DB.prepare(
    `SELECT * FROM sao_luu_phien ORDER BY (ban_id LIKE 'ngay-%') DESC, ban_id LIMIT 1`
  ).first();
}

async function moPhienMoi(env, bao) {
  const vn = gioVN();
  const ngay = ngayVN(vn);

  // 1) Bản ngày hôm nay chưa có → làm ngay.
  if (!(await coBan(env, `ngay-${ngay}`))) return taoPhien(env, 'ngay', ngay);

  // 2) Bản tháng: mở từ ngày 15 tới hết ngày 24, và chỉ khi bản ngày đã xong.
  //    Gói THÁNG TRƯỚC, không phải tháng đang chạy.
  //    CHỐNG TRÙNG: `coBan('thang-<tháng trước>')` là chốt duy nhất — cron quét
  //    12 lượt/giờ suốt 10 ngày, cả 1.000+ lượt đó chỉ mở được ĐÚNG MỘT phiên
  //    cho mỗi tháng dữ liệu, vì `taoPhien` ghi ngay dòng `sao_luu_ban` và mọi
  //    lượt sau nhìn thấy nó. Không phụ thuộc "hôm nay là ngày mấy".
  const ngayTrongThang = vn.getUTCDate();
  if (ngayTrongThang >= NGAY_CHAY_BAN_THANG && ngayTrongThang <= NGAY_CUOI_CHO_BAN_THANG) {
    const thangGoi = thangTruoc(vn);
    if (!(await coBan(env, `thang-${thangGoi}`))) return taoPhien(env, 'thang', thangGoi);
  }

  // 3) Rảnh → tranh thủ dọn bản quá hạn giữ.
  await donBanQuaHan(env);
  return null;
}

/** "Bản này đã có chưa?" — M2 ca (b): CÂU HỎI NÀY TỪNG TRẢ LỜI SAI.
    `taoPhien()` ghi HAI dòng vào hai bảng. Cron chết đúng giữa hai lệnh →
    `sao_luu_ban` có dòng, `sao_luu_phien` không → câu hỏi cũ ("có dòng nào
    không") trả TRUE → ngày đó VĨNH VIỄN KHÔNG CÓ BẢN SAO LƯU. Lớp B 9h sáng
    bắt được nên không im lặng, nhưng mất trắng một đêm.

    Nay: đã có = đã XONG, hoặc đã HỎNG (đã báo động rồi, làm lại vô ích và sẽ
    lặp vô tận), hoặc đang có phiên chạy dở THẬT. Còn đúng một ca lọt lưới cũ —
    `dang_chay` mà KHÔNG có phiên — thì nay làm lại được. */
async function coBan(env, id) {
  const r = await env.DB.prepare(
    `SELECT 1 FROM sao_luu_ban b WHERE b.id = ? AND (b.trang_thai IN ('xong','hong')
       OR EXISTS (SELECT 1 FROM sao_luu_phien p WHERE p.ban_id = b.id))`
  ).bind(id).first();
  return !!r;
}

async function taoPhien(env, loai, moc) {
  const banId = `${loai}-${moc}`;
  const bangs = await danhSachBang(env, loai);

  let thuMucId = null;
  if (loai === 'ngay') {
    const goc = await khoFile.timHoacTaoThuMuc(env, 'goc', 'ERP-AGC', null);
    const chung = await khoFile.timHoacTaoThuMuc(env, 'SAO-LUU', 'SAO-LUU', goc);
    thuMucId = await khoFile.timHoacTaoThuMuc(env, `SAO-LUU/${moc}`, moc, chung);
  } else {
    const goc = await khoFile.timHoacTaoThuMuc(env, 'goc', 'ERP-AGC', null);
    thuMucId = await khoFile.timHoacTaoThuMuc(env, 'BAN-THANG', 'BAN-THANG-CUA-SEP', goc);
  }

  // M2 ca (b): `OR REPLACE` chứ không `INSERT` trần — lần trước có thể đã ghi
  // được dòng này rồi mới chết, và `coBan()` nay CỐ Ý cho làm lại ca đó.
  await env.DB.prepare(
    `INSERT OR REPLACE INTO sao_luu_ban (id, loai, moc, trang_thai, thu_muc_id)
     VALUES (?, ?, ?, 'dang_chay', ?)`
  ).bind(banId, loai, moc, thuMucId).run();

  await env.DB.prepare(
    `INSERT OR REPLACE INTO sao_luu_phien (ban_id, danh_sach) VALUES (?, ?)`
  ).bind(banId, JSON.stringify(bangs)).run();

  return env.DB.prepare('SELECT * FROM sao_luu_phien WHERE ban_id = ?').bind(banId).first();
}

/** D1 trả BLOB về dạng ArrayBuffer — đổi sang Uint8Array để làm việc. */
function napDem(p) {
  p.du = p.du_byte ? new Uint8Array(p.du_byte) : new Uint8Array(0);
}

async function luuPhien(env, p) {
  const dem = p.du && p.du.length
    ? p.du.buffer.slice(p.du.byteOffset, p.du.byteOffset + p.du.byteLength)
    : null;
  await env.DB.prepare(`
    UPDATE sao_luu_phien SET chi_so_bang=?, rid_cuoi=?, upload_url=?, byte_da_gui=?,
      du_byte=?, ke_khai=?, muc_dang_mo=?, muc_bat_dau=?, muc_so_dong=?, muc_co_byte=?,
      muc_crc=?, zip_muc=?, da_bao_loi=?, cap_nhat_luc=datetime('now','+7 hours')
    WHERE ban_id=?`).bind(
    p.chi_so_bang, p.rid_cuoi, p.upload_url, p.byte_da_gui, dem, p.ke_khai,
    p.muc_dang_mo, p.muc_bat_dau, p.muc_so_dong, p.muc_co_byte, p.muc_crc,
    p.zip_muc, p.da_bao_loi, p.ban_id).run();
}

/** Phiên chạy dở quá lâu = đêm qua KHÔNG KỊP. Bỏ nó đi và làm bản mới, chứ
    không kéo lê sang đêm sau (kéo lê thì đêm sau lại càng không kịp — vỡ dây
    chuyền). Và BÁO, vì đây chính là dấu hiệu thiết kế đã chạm trần 10 ms CPU
    của gói miễn phí (BH-22): dữ liệu lớn tới mức một đêm không đủ lượt cron. */
async function boPhienQuaHan(env, bao) {
  const vn = gioVN();
  const homNay = ngayVN(vn);
  const { results } = await env.DB.prepare('SELECT ban_id FROM sao_luu_phien').all();
  for (const r of results) {
    const laNgay = r.ban_id.startsWith('ngay-');
    const moc = r.ban_id.slice(laNgay ? 5 : 6);
    // Bản THÁNG quá hạn khi: (a) nó là tháng CŨ HƠN tháng đáng lẽ đang gói —
    // tức đã trôi sang tháng sau mà vẫn chưa xong; hoặc (b) đã qua ngày 24.
    const qua = laNgay
      ? moc < homNay
      : (moc < thangTruoc(vn) || vn.getUTCDate() > NGAY_CUOI_CHO_BAN_THANG);
    if (!qua) continue;

    await env.DB.prepare('DELETE FROM sao_luu_phien WHERE ban_id=?').bind(r.ban_id).run();
    await env.DB.prepare(`UPDATE sao_luu_ban SET trang_thai='hong', loi=? WHERE id=?`)
      .bind('không chạy xong trong cửa sổ cho phép', r.ban_id).run();

    const khoa = `qua-gio-${r.ban_id}`;
    if (await daBao(env, khoa)) continue;
    await ghiDaBao(env, khoa);
    const tin = laNgay
      ? `🔴 SAO LƯU NGÀY ${moc} KHÔNG CHẠY XONG TRONG ĐÊM\n\n` +
        `Máy chỉ có ${GIO_KET_THUC - GIO_BAT_DAU} tiếng ban đêm và mỗi lượt chỉ được ` +
        `10 phần nghìn giây tính toán (giới hạn gói miễn phí của Cloudflare).\n\n` +
        `Nghĩa là dữ liệu ĐÃ LỚN HƠN sức của cách làm hiện tại. Bản ngày ${moc} bị bỏ dở.\n\n` +
        `Việc cần làm: báo bộ phận kỹ thuật. Hai đường đi — nâng Cloudflare lên gói ` +
        `trả phí (mỗi lượt được 30 giây thay vì 10 phần nghìn giây), hoặc đổi sang ` +
        `cách chỉ sao lưu phần thay đổi trong ngày.`
      : `⚠️ Bản sao lưu THÁNG ${moc} không gói xong trong hạn (mở ngày ` +
        `${NGAY_CHAY_BAN_THANG}, hạn chót hết ngày ${NGAY_CUOI_CHO_BAN_THANG}). ` +
        `Bản ngày vẫn chạy bình thường, nhưng tháng ${moc} Sếp chưa có bản để tự cất.`;
    await bao.guiTelegram(env, tin).catch(() => {});
    await bao.guiThongBao(env, 'admin', tin.split('\n')[0], 'sao_luu_hong').catch(() => {});
  }
}

/* ---- Danh sách bảng và cột --------------------------------------------- */

async function danhSachBang(env, loai) {
  const { results } = await env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '\\_cf%' ESCAPE '\\' ORDER BY name`).all();
  return results.map(r => r.name)
    .filter(n => TEN_BANG_HOP_LE.test(n))
    .filter(n => !BANG_KHONG_SAO_LUU.has(n))
    .filter(n => loai === 'thang' || !BANG_CHI_THEO_THANG.has(n));
}

const nhoCot = new Map();
async function layCot(env, bang) {
  if (nhoCot.has(bang)) return nhoCot.get(bang);
  const { results } = await env.DB.prepare(`PRAGMA table_info(${bang})`).all();
  const bo = new Set(COT_KHONG_SAO_LUU[bang] || []);
  const cot = results.map(r => r.name)
    .filter(c => !bo.has(c) && !MAU_TEN_COT_NGUY.test(c));
  nhoCot.set(bang, cot);
  return cot;
}

/* ==========================================================================
   7. MỘT LÔ — trái tim của việc chia nhỏ theo 10 ms CPU
   ========================================================================== */

async function motLo(env, p, bao) {
  const bangs = JSON.parse(p.danh_sach);
  const laThang = p.ban_id.startsWith('thang-');

  if (p.chi_so_bang >= bangs.length) { await hoanTat(env, p, bao); return 'xong'; }

  const bang = bangs[p.chi_so_bang];
  const cot = await layCot(env, bang);
  if (!cot.length) { p.chi_so_bang++; p.rid_cuoi = 0; return 'tiep'; }

  const ban = await env.DB.prepare('SELECT thu_muc_id FROM sao_luu_ban WHERE id = ?').bind(p.ban_id).first();

  // ---- Mở mục mới nếu chưa mở ------------------------------------------
  if (!p.muc_dang_mo) {
    if (laThang) {
      if (!p.upload_url) {
        const tenZip = `sao-luu-AGC-${p.ban_id.slice(6)}.zip`;
        await khoFile.donTepTrungTen(env, { ten: tenZip, thuMucId: ban.thu_muc_id });
        p.upload_url = await khoFile.moPhienTaiLen(env, {
          ten: tenZip, kieu: 'application/zip', thuMucId: ban.thu_muc_id
        });
      }
      p.muc_bat_dau = viTriHienTai(p);
      themByte(p, dauTep(`${bang}.csv`));
    } else {
      // M2 ca (a): lượt trước có thể đã chốt xong file này rồi mới chết, chưa
      // kịp ghi `chi_so_bang++`. Dọn bản sót trước khi ghi lại, kẻo Drive có
      // hai file trùng tên → lúc phục hồi báo `thua_tep` giả.
      await khoFile.donTepTrungTen(env, { ten: `${bang}.csv`, thuMucId: ban.thu_muc_id });
      p.upload_url = await khoFile.moPhienTaiLen(env, {
        ten: `${bang}.csv`, kieu: 'text/csv', thuMucId: ban.thu_muc_id
      });
      p.byte_da_gui = 0; p.du = new Uint8Array(0); p.muc_bat_dau = 0;
    }
    p.muc_dang_mo = 1; p.muc_so_dong = 0; p.muc_co_byte = 0; p.muc_crc = 0; p.rid_cuoi = 0;
    themNoiDung(p, BOM + dongTieuDe(cot));
  }

  // ---- Đọc một lô dòng --------------------------------------------------
  // Phân trang theo rowid, KHÔNG dùng OFFSET: với bảng 40.000 dòng thì OFFSET
  // bắt SQLite quét lại từ đầu mỗi lô — tốn gấp 10 lần hạn mức đọc của D1.
  const { results } = await env.DB.prepare(
    `SELECT rowid AS __rid, * FROM ${bang} WHERE rowid > ? ORDER BY rowid LIMIT ?`
  ).bind(p.rid_cuoi, DONG_MOI_LO).all();

  let van = '';
  for (const r of results) van += dongCsv(cot, r);
  if (results.length) p.rid_cuoi = results[results.length - 1].__rid;
  p.muc_so_dong += results.length;
  themNoiDung(p, van);

  const hetBang = results.length < DONG_MOI_LO;

  // ---- Đẩy phần đã đủ 256 KiB lên Drive ---------------------------------
  if (!hetBang) { await dayPhanDayDu(env, p); return 'tiep'; }

  // ---- Hết bảng: đóng mục ----------------------------------------------
  const keKhai = JSON.parse(p.ke_khai);

  if (laThang) {
    themByte(p, cuoiTep(p.muc_crc, p.muc_co_byte));
    const zm = JSON.parse(p.zip_muc);
    zm.push({ ten: `${bang}.csv`, crc: p.muc_crc, coByte: p.muc_co_byte, viTriDau: p.muc_bat_dau, luc: Date.now() });
    p.zip_muc = JSON.stringify(zm);
    keKhai.push({ bang, so_dong: p.muc_so_dong, co_byte: p.muc_co_byte, crc: p.muc_crc });
    await dayPhanDayDu(env, p);
  } else {
    const tong = p.byte_da_gui + p.du.length;
    const kq = await khoFile.guiMau(env, p.upload_url, p.du, p.byte_da_gui, tong);
    p.byte_da_gui = tong; p.du = new Uint8Array(0); p.upload_url = null;

    // ---- CANARY LỚP 1 ---------------------------------------------------
    // Google trả về cỡ file NÓ THẬT SỰ LƯU. Lệch một byte so với số ta đếm là
    // ghi thiếu / đứt giữa chừng / Drive nhận nhưng lưu hỏng. Không đợi đến
    // lúc cần phục hồi mới biết.
    if (kq.coByte !== undefined && Number(kq.coByte) !== tong) {
      throw new Error(`Canary lệch ở ${bang}.csv: gửi ${tong} byte, Drive lưu ${kq.coByte} byte`);
    }
    keKhai.push({ bang, so_dong: p.muc_so_dong, co_byte: tong, crc: p.muc_crc, tep_id: kq.tepId });
  }

  p.ke_khai = JSON.stringify(keKhai);
  p.muc_dang_mo = 0;
  p.chi_so_bang++;
  p.rid_cuoi = 0;
  return 'tiep';
}

/* ---- Bộ đệm byte ------------------------------------------------------- */

function viTriHienTai(p) { return p.byte_da_gui + p.du.length; }

/** Thêm byte thô vào bộ đệm (dùng cho phần khung của zip). */
function themByte(p, bytes) { p.du = noiByte(p.du, bytes); }

/** Thêm nội dung CSV, cộng dồn cỡ và MÃ KIỂM CRC32 của mục.
    ⛔ B1: trước đây chỉ bản THÁNG mới tính CRC (zip cần). Nay bản NGÀY cũng
    tính, vì `KIEM-TRA.csv` phải kê được mã kiểm — không có nó thì phép kiểm mù
    trước ca "sửa một ký tự, giữ nguyên cỡ". Giá: +0,56 ms/lô (đo lại ở
    `npm run sao-luu-thu`), vẫn trong trần 10 ms. */
function themNoiDung(p, van) {
  if (!van) return;
  const bytes = MA_HOA.encode(van);
  p.muc_co_byte += bytes.length;
  p.muc_crc = crc32(bytes, p.muc_crc);
  p.du = noiByte(p.du, bytes);
}

/** Đẩy phần bội số 256 KiB, giữ lại phần đuôi cho lượt sau.
    Google bắt mỗi mẩu phải là bội số 256 KiB — trừ mẩu cuối cùng. */
async function dayPhanDayDu(env, p) {
  const co = Math.floor(p.du.length / khoFile.CO_MAU) * khoFile.CO_MAU;
  if (co === 0) return;
  await khoFile.guiMau(env, p.upload_url, p.du.subarray(0, co), p.byte_da_gui, null);
  p.byte_da_gui += co;
  p.du = p.du.slice(co);   // slice (KHÔNG subarray): cắt đứt hẳn khỏi vùng nhớ cũ
}

/* ==========================================================================
   8. Hoàn tất một bản
   ========================================================================== */

async function hoanTat(env, p, bao) {
  const laThang = p.ban_id.startsWith('thang-');
  const keKhai = JSON.parse(p.ke_khai);
  const ban = await env.DB.prepare('SELECT * FROM sao_luu_ban WHERE id = ?').bind(p.ban_id).first();
  const moc = ban.moc;

  const vanDoc = docCachDoc({ moc, loai: ban.loai, keKhai });
  const vanKe = keKhaiCsv(keKhai);
  const vanSoDo = soDoDuLieu({
    moc, loai: ban.loai, keKhai, moTa: MO_TA_BANG, quanHe: await docQuanHe(env)
  });

  /* BỐN FILE ĐI KÈM — thứ tự này là thứ tự chúng nằm trong zip. DOC-CACH-DOC
     đứng đầu để ai giải nén ra cũng thấy nó trước tiên. Tổng cộng ~40 KB, tức
     0,2% của bản 18 MB — không làm phình bản sao lưu. */
  const kem = [
    ['DOC-CACH-DOC.txt', vanDoc, 'text/plain; charset=utf-8'],
    ['SO-DO-DU-LIEU.txt', vanSoDo, 'text/plain; charset=utf-8'],
    ['KHOI-PHUC.mjs', KHOI_PHUC_MJS, 'text/plain; charset=utf-8'],
    ['KIEM-TRA.csv', vanKe, 'text/csv; charset=utf-8']
  ];

  let tepId = null, duongDan = null, tongByte = 0;

  if (laThang) {
    // Nhét nốt mấy file chữ vào zip rồi đóng mục lục.
    const zm = JSON.parse(p.zip_muc);
    for (const [ten, noi] of kem) {
      const b = MA_HOA.encode(noi);
      const viTriDau = viTriHienTai(p);
      themByte(p, dauTep(ten));
      themByte(p, b);
      themByte(p, cuoiTep(crc32(b, 0), b.length));
      zm.push({ ten, crc: crc32(b, 0), coByte: b.length, viTriDau, luc: Date.now() });
    }
    themByte(p, mucLuc(zm, viTriHienTai(p)));

    tongByte = p.byte_da_gui + p.du.length;
    const kq = await khoFile.guiMau(env, p.upload_url, p.du, p.byte_da_gui, tongByte);
    if (kq.coByte !== undefined && Number(kq.coByte) !== tongByte) {
      throw new Error(`Canary lệch ở file nén: gửi ${tongByte} byte, Drive lưu ${kq.coByte} byte`);
    }
    tepId = kq.tepId;
    duongDan = khoFile.duongDanTep(tepId);
  } else {
    // M2 ca (c): `hoanTat` có thể bị cắt giữa hai lần ghi này, lượt sau ghi
    // lại → hai `DOC-CACH-DOC.txt` trong cùng thư mục. Dọn trước.
    for (const [ten, noi, kieu] of kem) {
      await khoFile.donTepTrungTen(env, { ten, thuMucId: ban.thu_muc_id });
      await khoFile.luuFile(env, { duLieu: noi, tenFile: ten, kieu, thuMucId: ban.thu_muc_id });
    }
    tongByte = keKhai.reduce((t, k) => t + Number(k.co_byte), 0);
    duongDan = khoFile.duongDanThuMuc(ban.thu_muc_id);

    // ---- CANARY LỚP 1, phần đọc ngược ------------------------------------
    // Đọc lại ĐUÔI của một file bất kỳ trong bản vừa ghi. Bắt được ca Drive
    // nhận đủ byte nhưng lưu ra thứ khác. Chỉ đọc 400 byte cuối → gần như
    // không tốn gì, nhưng là lần DUY NHẤT ta thật sự đọc lại thứ vừa ghi.
    const thu = keKhai.filter(k => k.tep_id && k.co_byte > 0);
    if (thu.length) {
      const chon = thu[Math.floor(Math.random() * thu.length)];
      const res = await khoFile.layFile(env, { nha: 'drive', khoa: chon.tep_id, pham: 'bytes=-400' });
      const duoi = res.ok ? await res.text() : '';
      if (!duoi.endsWith('\r\n')) {
        throw new Error(`Canary đọc ngược hỏng ở ${chon.bang}.csv: đuôi file không kết thúc bằng một dòng trọn vẹn`);
      }
    }
  }

  await env.DB.prepare(`
    UPDATE sao_luu_ban SET trang_thai='xong', tep_id=?, duong_dan=?, so_bang=?, so_dong=?,
      co_byte=?, xong_luc=datetime('now','+7 hours') WHERE id=?`
  ).bind(tepId, duongDan, keKhai.length,
    keKhai.reduce((t, k) => t + Number(k.so_dong), 0), tongByte, p.ban_id).run();

  await env.DB.prepare('DELETE FROM sao_luu_phien WHERE ban_id = ?').bind(p.ban_id).run();
  p.chi_so_bang = JSON.parse(p.danh_sach).length; // để vòng lặp ngoài dừng

  const mb = (tongByte / 1048576).toFixed(1);
  if (laThang) {
    // ADR-0013: "Báo Sếp qua Telegram kèm đường dẫn tải + dung lượng."
    const tin =
      `📦 BẢN SAO LƯU THÁNG ${moc} — CỦA RIÊNG SẾP\n\n` +
      `Máy vừa gói xong toàn bộ dữ liệu ERP tháng ${moc} thành một file nén.\n\n` +
      `Tên file: sao-luu-AGC-${moc}.zip\n` +
      `Dung lượng: ${mb} MB\n` +
      `Số bảng: ${keKhai.length} · Số dòng: ${keKhai.reduce((t, k) => t + Number(k.so_dong), 0).toLocaleString('vi-VN')}\n\n` +
      `Tải về: ${duongDan}\n\n` +
      `Sếp tải về máy rồi chép ra một ổ cứng rời hoặc chỗ nào KHÔNG phải Google Drive.\n` +
      `Lý do: bản chạy hằng đêm nằm trên Drive công ty — mất tài khoản Google là mất luôn cả kho lẫn bản sao lưu. Bản này phải nằm ngoài.\n\n` +
      `Mở ra: giải nén, bấm đúp file .csv nào cũng mở bằng Excel. Đọc file DOC-CACH-DOC.txt trước.`;
    await bao.guiTelegram(env, tin);
    await bao.guiThongBao(env, 'admin', `Bản sao lưu tháng ${moc} đã xong (${mb} MB) — Sếp tải về và cất ra ngoài Google Drive.`, 'sao_luu', duongDan);
  } else {
    await donBanQuaHan(env);
  }
}

/* --------------------------------------------------------------------------
   SƠ ĐỒ QUAN HỆ BẢNG — đọc THẬT ra khỏi database, không gõ tay.

   Vì sao không gõ tay một bảng tra như MO_TA_BANG: schema có ~50 khoá ngoại và
   bảng mới còn thêm nữa. Danh sách gõ tay sẽ mốc meo sau vài tháng, và mốc meo
   ở đây nghĩa là người tiếp nhận dữ liệu nối sai bảng — hỏng âm thầm.

   ĐÚNG MỘT CÂU TRUY VẤN cho cả ~50 bảng, nhờ hàm bảng `pragma_foreign_key_list`
   của SQLite. Không lặp 50 lượt gọi D1 (Workers chỉ cho 50 subrequest mỗi lượt,
   mà `hoanTat` còn phải gọi Drive).

   Tra không được thì TRẢ MẢNG RỖNG chứ không ném lỗi: sơ đồ là thứ đi kèm cho
   dễ đọc, không đáng để làm chết cả một đêm sao lưu.
   -------------------------------------------------------------------------- */
async function docQuanHe(env) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT m.name AS bang, f."table" AS den, f."from" AS cot, f."to" AS cot_den
         FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f
        WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
        ORDER BY m.name`).all();
    return (results || []).filter(q =>
      q.bang && q.den && TEN_BANG_HOP_LE.test(q.bang) && TEN_BANG_HOP_LE.test(q.den));
  } catch (e) {
    console.error('Sao lưu: không đọc được sơ đồ quan hệ bảng —', e.message);
    return [];
  }
}

/* ==========================================================================
   9. Dọn bản quá hạn giữ
   ========================================================================== */

async function donBanQuaHan(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, thu_muc_id FROM sao_luu_ban
      WHERE loai='ngay' AND trang_thai='xong' ORDER BY moc DESC LIMIT 5 OFFSET ?`
  ).bind(GIU_BAN_NGAY).all();

  // Tối đa 2 bản mỗi lượt — mỗi ngày chỉ đẻ thêm 1 bản nên 2 là thừa sức đuổi
  // kịp, mà không đốt subrequest của lượt cron.
  for (const r of results.slice(0, 2)) {
    try {
      if (r.thu_muc_id) await khoFile.xoaFile(env, { nha: 'drive', khoa: r.thu_muc_id });
      await env.DB.prepare('DELETE FROM sao_luu_ban WHERE id=?').bind(r.id).run();
      await env.DB.prepare('DELETE FROM sao_luu_thu_muc WHERE drive_id=?').bind(r.thu_muc_id).run();
    } catch (e) { console.error('Dọn bản cũ', r.id, e.message); }
  }
}

/* ==========================================================================
   10. Báo động
   ========================================================================== */

/** LỚP A — hỏng khi đang chạy. Báo đúng một lần cho mỗi bản, không spam. */
async function baoHong(env, bao, p, e) {
  await env.DB.prepare(`UPDATE sao_luu_ban SET trang_thai='hong', loi=? WHERE id=?`)
    .bind(String(e.message).slice(0, 500), p.ban_id).run().catch(() => {});
  if (p.da_bao_loi) return;
  p.da_bao_loi = 1;
  await env.DB.prepare('UPDATE sao_luu_phien SET da_bao_loi=1 WHERE ban_id=?').bind(p.ban_id).run().catch(() => {});
  const tin = `🔴 SAO LƯU HỎNG — ${p.ban_id}\n\nBảng đang làm: thứ ${p.chi_so_bang + 1}\nLỗi: ${e.message}\n\nDữ liệu công ty đêm nay CHƯA có bản sao. Cần xem lại ngay.`;
  await bao.guiTelegram(env, tin).catch(() => {});
  await bao.guiThongBao(env, 'admin', `Sao lưu ${p.ban_id} hỏng: ${e.message}`, 'sao_luu_hong').catch(() => {});
}

/** LỚP B — hỏng vì KHÔNG chạy. Chạy độc lập, mỗi ngày 9h sáng.
    Đây là lớp bắt được ca cron chết hẳn, khoá bị thu hồi, hay code bị gỡ mất
    — những ca mà lớp A im lặng tuyệt đối (BH-21). */
async function kiemTraLopB(env, bao) {
  const homQua = new Date(gioVN().getTime() - 86400000).toISOString().slice(0, 10);
  const khoa = `thieu-ban-${homQua}`;
  if (await daBao(env, khoa)) return;

  const r = await env.DB.prepare(
    `SELECT trang_thai, co_byte FROM sao_luu_ban WHERE id = ?`).bind(`ngay-${homQua}`).first();

  if (r && r.trang_thai === 'xong' && r.co_byte > 0) return; // ổn

  await ghiDaBao(env, khoa);
  const vien = r ? `có bản nhưng trạng thái "${r.trang_thai}"` : 'KHÔNG có bản nào';
  const tin =
    `🔴 BÁO ĐỘNG ĐỎ — KHÔNG CÓ BẢN SAO LƯU CỦA NGÀY ${homQua}\n\n` +
    `Máy kiểm lúc 9h sáng nay và thấy: ${vien}.\n\n` +
    `Nghĩa là dữ liệu công ty của ngày hôm qua ĐANG KHÔNG CÓ BẢN SAO NÀO ngoài ` +
    `database chính. Hỏng lúc này là mất.\n\n` +
    `Việc cần làm: mở nhật ký Cloudflare xem cron có chạy không, và kiểm khoá ` +
    `Google còn hạn không (khoá hết hạn sau 7 ngày nếu màn OAuth còn ở chế độ "Testing").`;
  await bao.guiTelegram(env, tin).catch(() => {});
  await bao.guiThongBao(env, 'admin', `KHÔNG có bản sao lưu ngày ${homQua} — kiểm tra ngay.`, 'sao_luu_hong').catch(() => {});
}

/** Cảnh báo dung lượng — ADR-0011 A1: còn dưới 3 GB là phải kêu, mỗi tuần
    một lần cho tới khi dọn. */
async function kiemTraDungLuong(env, bao) {
  const vn = gioVN();
  if (vn.getUTCDay() !== 1) return; // thứ Hai
  const dl = await khoFile.dungLuong(env);
  if (!dl || dl.conLai === null) return;
  if (dl.conLai >= khoFile.NGUONG_CANH_BAO_BYTE) return;

  const khoa = `dung-luong-${ngayVN(vn)}`;
  if (await daBao(env, khoa)) return;
  await ghiDaBao(env, khoa);

  const gb = (n) => (n / 1073741824).toFixed(2);
  const tin =
    `⚠️ GOOGLE DRIVE SẮP ĐẦY\n\n` +
    `Đã dùng ${gb(dl.daDung)} GB / ${gb(dl.tong)} GB. Còn ${gb(dl.conLai)} GB.\n\n` +
    `Drive này dùng chung cho Gmail, Google Photos và bản sao lưu ERP. Đầy thì ` +
    `KHÔNG sao lưu được nữa (và Drive báo lỗi chứ không tự trừ tiền).\n\n` +
    `Cách dọn, rẻ nhất trước: xoá thư mục sao lưu cũ hơn 2 năm · dọn thư rác ` +
    `và thùng rác Gmail · dọn Google Photos · cuối cùng mới tính tới Google One.`;
  await bao.guiTelegram(env, tin).catch(() => {});
  await bao.guiThongBao(env, 'admin', `Google Drive còn ${gb(dl.conLai)} GB — sắp đầy.`, 'sao_luu').catch(() => {});
}

async function daBao(env, khoa) {
  const r = await env.DB.prepare('SELECT 1 FROM sao_luu_canh_bao WHERE khoa=?').bind(khoa).first();
  return !!r;
}
async function ghiDaBao(env, khoa) {
  await env.DB.prepare('INSERT OR IGNORE INTO sao_luu_canh_bao (khoa) VALUES (?)').bind(khoa).run();
  // Dọn nhật ký cảnh báo cũ hơn 90 ngày để bảng không phình.
  await env.DB.prepare(`DELETE FROM sao_luu_canh_bao WHERE luc < datetime('now','+7 hours','-90 days')`).run();
}
