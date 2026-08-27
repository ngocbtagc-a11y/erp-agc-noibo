/* ==========================================================================
   src/sao-luu.js — SAO LƯU TOÀN BỘ DỮ LIỆU ERP
   ---------------------------------------------------------------------------
   SPEC-0005 Phần B · ADR-0011 (Drive tài khoản công ty, KHÔNG R2) ·
   ADR-0013 (hai nhịp: hằng ngày + hằng tháng đưa tận tay Sếp)

   BỐI CẢNH: trước hôm nay công ty KHÔNG CÓ BẢN SAO LƯU NÀO. Toàn bộ dữ liệu
   nằm trong một database D1. Hỏng là mất sạch.

   HAI NHỊP, cả hai đều bắt buộc:

     ① HẰNG NGÀY  — máy tự chạy 1h–4h sáng, để trên Drive công ty, giữ 30 bản.
                    Cứu khi hỏng dữ liệu.
     ② HẰNG THÁNG — mùng 1, một file .zip đưa tận tay Sếp qua Telegram.
                    Sếp tự cất. Vì bản ngày nằm trên Drive công ty — MẤT TÀI
                    KHOẢN GOOGLE LÀ MẤT LUÔN CẢ KHO LẪN BẢN SAO LƯU.

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

/* ==========================================================================
   0. Các con số điều chỉnh được
   ========================================================================== */

/* --------------------------------------------------------------------------
   ⚠️ BỐN CON SỐ DƯỚI ĐÂY LÀ ĐO THẬT, KHÔNG PHẢI ĐOÁN (`npm run sao-luu-thu`).
   Cloudflare cho 10 ms CPU MỖI LƯỢT CRON trên gói miễn phí — và 10 ms đó là
   của CẢ lượt, dùng chung với đồng bộ Shopee/TikTok đang chạy trước ta.

     một lô 2.000 dòng = 4,3 ms CPU  (bản ngày) · 4,9 ms (bản tháng, thêm CRC32)
     bản ngày năm 1    = 69 lô       (103.000 dòng, 21 bảng, 18,2 MB)
     cửa sổ 0h–8h      = 96 lượt cron, bỏ lượt đầu mỗi giờ → 88 lượt dùng được
     sức chứa một đêm  = 110 lô      (66 lượt × 1 lô, rồi 22 lượt × 2 lô từ 6h)

   → MỘT lô mỗi lượt = 4,3 ms trong trần 10 ms, còn 5,7 ms cho phần cron của
     người khác. 69 ≤ 110 nên xong trong một đêm (khoảng 6h10), dư cho bản tháng.

   ⚠️ TRẦN CỦA THIẾT KẾ NÀY (BH-22): ~220.000 dòng/ngày — nay đang dùng 63%
   sức. Vượt qua đó thì một đêm KHÔNG đủ lượt, và code TỰ BÁO ĐỘNG chứ không
   im lặng (xem `boPhienQuaHan`). Lúc đó phải đổi hướng: Workers Paid cho 30
   GIÂY CPU mỗi lượt cron thay vì 10 ms, hoặc sao lưu phần thay đổi trong ngày.
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
export const LO_KHI_TRE = 2;
export const GIO_TANG_TOC = 6;

/** Cửa sổ chạy: 0h–8h sáng giờ VN. Kho vào làm từ 8h nên cả cửa sổ này là giờ
    thấp điểm. Rộng hơn đề xuất 1h–4h của SPEC-0005, vì số đo CPU THẬT cho thấy
    36 lượt không đủ cho 69 lô. Thà chạy thong thả 1 lô/lượt suốt 8 tiếng còn
    hơn nhồi 3 lô/lượt trong 3 tiếng rồi bị Cloudflare cắt ngang liên tục. */
export const GIO_BAT_DAU = 0;
export const GIO_KET_THUC = 8;

/** Giữ bao nhiêu bản ngày (SPEC-0005 Mục 9.3). */
export const GIU_BAN_NGAY = 30;

/** Bản tháng chạy bằng số lượt CÒN THỪA sau khi bản ngày xong, nên phải cho
    nó nhiều đêm. Mùng 1 → mùng 10. Chưa xong tới mùng 10 thì báo động. */
export const NGAY_CUOI_CHO_BAN_THANG = 10;

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
  'sao_luu_phien', 'sao_luu_thu_muc', 'sao_luu_canh_bao'  // trạng thái của chính việc sao lưu
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

/** Một ô CSV. Quy tắc ở SPEC-0005 Mục 9.1.
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

  // Số 0 đứng đầu: Excel mặc định coi là số và xoá mất. Bọc thành công thức
  // ="0987654321" thì Excel giữ nguyên. Trông lạ trong Notepad nhưng Excel
  // mới là chỗ người ta sẽ mở nó.
  if (boc && s.charCodeAt(0) === 48 && /^0\d+$/.test(s)) return '"=""' + s + '"""';

  // Quét bằng mã ký tự thay vì biểu thức chính quy: rẻ hơn, và ô CSV thường
  // rất ngắn nên vòng lặp này gần như luôn dừng ở vài ký tự đầu.
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 44 || c === 34 || c === 10 || c === 13) return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
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
 * @param {Array} keKhai  [{bang, so_dong, co_byte}]  — bản kê khai lúc ghi
 * @param {Array} thucTe  [{ten, co_byte, so_dong?}]  — thứ thật sự đang có
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
    co.delete(ten);
  }

  for (const [ten] of co) {
    if (ten === 'KIEM-TRA.csv' || ten === 'DOC-CACH-DOC.txt') continue;
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
   4. Hai file chữ đi kèm mỗi bản sao lưu
   ========================================================================== */

export function keKhaiCsv(keKhai) {
  let s = BOM + 'bang,so_dong,co_byte,ten_tep\r\n';
  for (const k of keKhai) s += `${k.bang},${k.so_dong},${k.co_byte},${k.bang}.csv\r\n`;
  return s;
}

/** Viết cho người KHÔNG biết kỹ thuật. Không có từ chuyên môn nào không giải thích. */
export function docCachDoc({ moc, loai, keKhai }) {
  const tongDong = keKhai.reduce((t, k) => t + Number(k.so_dong || 0), 0);
  const tongMb = (keKhai.reduce((t, k) => t + Number(k.co_byte || 0), 0) / 1048576).toFixed(1);
  const nhan = loai === 'thang' ? `tháng ${moc}` : `ngày ${moc}`;

  return `BẢN SAO DỮ LIỆU ERP — CÔNG TY TNHH ALPHA GREEN COMMERCE
Bản của ${nhan}. Tổng ${keKhai.length} bảng, ${tongDong.toLocaleString('vi-VN')} dòng, khoảng ${tongMb} MB.

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

CẦN GÌ THÌ XEM Ở ĐÂU
--------------------
${motTaBang(keKhai)}
Muốn biết chắc bản này còn đủ không: mở file KIEM-TRA.csv. Nó ghi mỗi bảng có
bao nhiêu dòng và nặng bao nhiêu. So với từng file thật là biết có thiếu không.

CẤT Ở ĐÂU
---------
${loai === 'thang'
  ? `Bản này là bản của RIÊNG SẾP. Tải về máy, chép ra một ổ cứng rời hoặc một
chỗ khác Google Drive. Lý do: bản chạy hằng ngày nằm trên Drive của công ty —
nếu mất tài khoản Google thì mất luôn cả bản sao lưu. Bản này phải nằm ngoài.`
  : `Bản này máy tự tạo mỗi đêm và giữ ${GIU_BAN_NGAY} bản gần nhất. Quá ${GIU_BAN_NGAY} ngày thì tự
xoá bản cũ nhất. Bản của mùng 1 hằng tháng được gửi riêng cho Sếp qua Telegram.`}

DỮ LIỆU NHẠY CẢM — ĐỌC KỸ
-------------------------
Trong này có lương, số căn cước, chứng từ thuế của nhân viên. Ai cầm được thư
mục này là đọc được hết. KHÔNG gửi qua Zalo, KHÔNG để trong thư mục dùng chung.

Mật khẩu đăng nhập ERP thì KHÔNG có trong đây (phần mềm không lưu mật khẩu
thật, chỉ lưu dấu vân của nó). Khoá kết nối Shopee và TikTok cũng KHÔNG có
trong đây — cố ý bỏ ra, vì khoá lọt ra ngoài là người lạ đọc được đơn hàng.

Tạo tự động lúc ${new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16)} (giờ Việt Nam).
`;
}

/* Vài dòng mô tả bảng bằng tiếng người. Bảng nào chưa có mô tả thì bỏ qua —
   thà im lặng còn hơn mô tả sai. */
const MO_TA_BANG = {
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

  // ---- Ngoài cửa sổ 0h–7h sáng thì thôi ----------------------------------
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
  const ngay = ngayVN(vn), thang = thangVN(vn);

  // 1) Bản ngày hôm nay chưa có → làm ngay.
  if (!(await coBan(env, `ngay-${ngay}`))) return taoPhien(env, 'ngay', ngay);

  // 2) Bản tháng: chỉ mở trong 3 ngày đầu tháng, và chỉ khi bản ngày đã xong.
  if (vn.getUTCDate() <= NGAY_CUOI_CHO_BAN_THANG && !(await coBan(env, `thang-${thang}`))) {
    return taoPhien(env, 'thang', thang);
  }

  // 3) Rảnh → tranh thủ dọn bản quá hạn giữ.
  await donBanQuaHan(env);
  return null;
}

async function coBan(env, id) {
  const r = await env.DB.prepare('SELECT 1 FROM sao_luu_ban WHERE id = ?').bind(id).first();
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

  await env.DB.prepare(
    `INSERT INTO sao_luu_ban (id, loai, moc, trang_thai, thu_muc_id) VALUES (?, ?, ?, 'dang_chay', ?)`
  ).bind(banId, loai, moc, thuMucId).run();

  await env.DB.prepare(
    `INSERT INTO sao_luu_phien (ban_id, danh_sach) VALUES (?, ?)`
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
    const qua = laNgay ? moc < homNay : (moc < thangVN(vn) || vn.getUTCDate() > NGAY_CUOI_CHO_BAN_THANG);
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
      : `⚠️ Bản sao lưu THÁNG ${moc} không gói xong trước mùng ${NGAY_CUOI_CHO_BAN_THANG}. ` +
        `Bản ngày vẫn chạy bình thường, nhưng tháng này Sếp chưa có bản để tự cất.`;
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
        p.upload_url = await khoFile.moPhienTaiLen(env, {
          ten: `sao-luu-AGC-${p.ban_id.slice(6)}.zip`,
          kieu: 'application/zip', thuMucId: ban.thu_muc_id
        });
      }
      p.muc_bat_dau = viTriHienTai(p);
      themByte(p, dauTep(`${bang}.csv`));
    } else {
      p.upload_url = await khoFile.moPhienTaiLen(env, {
        ten: `${bang}.csv`, kieu: 'text/csv', thuMucId: ban.thu_muc_id
      });
      p.byte_da_gui = 0; p.du = new Uint8Array(0); p.muc_bat_dau = 0;
    }
    p.muc_dang_mo = 1; p.muc_so_dong = 0; p.muc_co_byte = 0; p.muc_crc = 0; p.rid_cuoi = 0;
    themNoiDung(p, BOM + dongTieuDe(cot), laThang);
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
  themNoiDung(p, van, laThang);

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
    keKhai.push({ bang, so_dong: p.muc_so_dong, co_byte: p.muc_co_byte });
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
    keKhai.push({ bang, so_dong: p.muc_so_dong, co_byte: tong, tep_id: kq.tepId });
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

/** Thêm nội dung CSV. Với bản tháng còn phải cộng dồn CRC32 và cỡ của mục. */
function themNoiDung(p, van, laThang) {
  if (!van) return;
  const bytes = MA_HOA.encode(van);
  p.muc_co_byte += bytes.length;
  if (laThang) p.muc_crc = crc32(bytes, p.muc_crc);
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
  let tepId = null, duongDan = null, tongByte = 0;

  if (laThang) {
    // Nhét nốt hai file chữ vào zip rồi đóng mục lục.
    const zm = JSON.parse(p.zip_muc);
    for (const [ten, noi] of [['DOC-CACH-DOC.txt', vanDoc], ['KIEM-TRA.csv', vanKe]]) {
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
    await khoFile.luuFile(env, { duLieu: vanDoc, tenFile: 'DOC-CACH-DOC.txt', kieu: 'text/plain; charset=utf-8', thuMucId: ban.thu_muc_id });
    await khoFile.luuFile(env, { duLieu: vanKe, tenFile: 'KIEM-TRA.csv', kieu: 'text/csv; charset=utf-8', thuMucId: ban.thu_muc_id });
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
