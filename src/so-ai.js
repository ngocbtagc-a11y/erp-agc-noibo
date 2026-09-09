/* ==========================================================================
   CON SỐ DO AI ĐỌC RA — "AI đọc — CHƯA KIỂM"
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY. REV-0040 (Hồ Ly, 29/08/2026) tìm ra một kiểu hỏng mà
   không chốt nào trước đó bắt được: có một DẢI GIỮA (ảnh 500–620px) mà mô hình
   **giữ đúng danh tính tờ giấy** — vẫn là tờ hoá đơn ấy, vẫn đúng số hiệu —
   nhưng **thay lặng lẽ vài con số**:

       MST 0110938472  →  0110934872        (lệch 2 chữ số)
       bên mua          →  bịa một tên khác
       năm 2026         →  2020

   Không một lời cảnh báo, không một dấu `[không rõ]`. Mỏ neo (số hiệu / tên
   công ty / tên loại giấy tờ) KHÔNG cứu được dải này: danh tính đúng, chỉ số
   sai. Đó chính là lý do file này tồn tại.

   GẠO CHỐT HƯỚNG (29/08/2026):
     · Mọi CON SỐ do AI bóc ra phải được đánh dấu "AI đọc — CHƯA KIỂM", hiện
       khác hẳn về mặt thị giác.
     · Con số do AI bóc ra KHÔNG được tự điền thẳng vào ô dữ liệu CHÍNH THỨC
       cho tới khi có người xác nhận.
     · Chữ MÔ TẢ thì thoải mái. CON SỐ thì không.

   Vì sao khắt khe đúng với con số: trong kho giấy tờ pháp lý và hồ sơ lao
   động, một con số sai KHÔNG PHẢI lỗi phần mềm — là **giấy tờ sai sự thật**.
   Mã số thuế lệch 2 chữ số trên tờ khai, số CCCD lệch 1 chữ số trong hồ sơ
   lao động: thứ đi ra ngoài là văn bản, không phải một ô trên màn hình. Thà
   bắt người gõ tay 12 chữ số còn hơn để máy điền sai một chữ.

   MỘT ĐỊNH NGHĨA, HAI ĐƯỜNG DÙNG. Máy chủ tính vị trí con số rồi trả kèm
   (`so_ai`), giao diện chỉ việc bọc lại. Cố ý KHÔNG chép một bản dò số thứ
   hai sang `public/` — đường đọc CCCD đã chết âm thầm 11 ngày đúng vì có hai
   bản chép tay của cùng một hằng số (xem `MO_HINH_DOC_ANH`).
   ========================================================================== */

/** Nhãn duy nhất. Mọi chỗ hiện con số AI đọc đều phải mang đúng câu này. */
export const NHAN_SO_AI = 'AI đọc — CHƯA KIỂM';

/** Câu giải thích đi kèm mỗi lần trả chữ đã bóc ra ngoài. */
export const CAU_SO_AI =
  'Các con số bôi đậm là do AI đọc từ ảnh và CHƯA ĐƯỢC KIỂM. AI có thể đọc ' +
  'đúng tờ giấy mà vẫn chép sai vài chữ số. Đối chiếu bản giấy trước khi dùng ' +
  'bất kỳ con số nào vào giấy tờ, tờ khai hay hồ sơ.';

/* Một "con số" = một cụm chữ số, cho phép dính dấu phân cách ở GIỮA (không ở
   hai đầu) để giữ nguyên khối các dạng người Việt hay viết:
       0110938472 · 18.000.000 · 05/01/1995 · 42.350.000 · 2026-08-29
   Cắt vụn "18.000.000" thành ba mẩu thì người đọc mất đúng thứ cần nhìn. */
const CUM_SO = /\d(?:[\d.,\/\- ]*\d)?/g;

/** Vị trí mọi cụm số trong `chu`, dạng `[[batDau, dai], …]`.
 *  Trả VỊ TRÍ chứ không trả chữ đã bọc sẵn: máy chủ không được đoán giao diện
 *  sẽ bọc bằng thẻ gì, và chuỗi trả về vẫn phải là chữ THẬT để còn tra cứu. */
export function viTriSoAI(chu) {
  const s = String(chu || '');
  if (!s) return [];
  const ra = [];
  CUM_SO.lastIndex = 0;
  let m;
  while ((m = CUM_SO.exec(s)) !== null) {
    /* Gọt đuôi: `CUM_SO` bắt được "2026-" nếu dòng kết thúc bằng dấu gạch. */
    let t = m[0].replace(/[.,\/\- ]+$/, '');
    if (!t) continue;
    ra.push([m.index, t.length]);
    if (ra.length >= 2000) break;      // trần để một trang chữ rác không nổ CPU
  }
  return ra;
}

/** Có con số nào không — dùng để quyết định có đính câu nhắc hay không. */
export function coSoAI(chu) {
  return viTriSoAI(chu).length > 0;
}

/* ==========================================================================
   SỐ LIỆU NGHIỆP VỤ TRONG MỘT BÀI HỌC — cửa chặn ghi
   ---------------------------------------------------------------------------
   Sếp Ngọc chốt 09/09/2026 (D2 mục 3): bài học dạy CÁCH LÀM, không dạy SỐ.
   Số thì phải tra ERP mới đúng; dạy suông thì hôm sau đã sai mà trợ lý vẫn nói
   chắc nịch. Lời hứa này đã nằm trong chú thích migrations/them-vp-kynang.sql:14
   từ 06/09 và trong prompt dạy nghề (vp-may.js) — nhưng chú thích không phải
   ràng buộc, và lời dặn trong prompt thì dỗ được. Đây là chỗ biến nó thành mã.

   VÌ SAO KHÔNG DÙNG THẲNG `coSoAI()` LÀM CỬA CHẶN — đo được, không phải ý kiến:
   `coSoAI` bắt MỌI cụm chữ số. Chính prompt dạy nghề của repo này (vp-may.js:597)
   nêu bài học mẫu đúng chuẩn là *"công văn gồm 9 phần theo thứ tự…"*, và chính
   nó dặn *"khoảng 150 đến 400 chữ"*. Lấy `coSoAI` làm cửa chặn thì hai câu ấy
   bị đá ra — cùng với mọi mốc luật ("Điều 24 Bộ luật Lao động"), mọi ngày tháng
   quy trình, mọi bước đánh số. Một cái cửa chặn gần như mọi thứ đi qua là cái
   cửa sẽ bị gỡ trong tuần. Thước kêu sai vài lần là người ta thôi tin nó.

   NÊN CHIA HAI NHỊP:
     ① `coSoAI(chu)` — sàng RẺ. Không có chữ số nào thì thôi, khỏi quét tiếp.
     ② `soNghiepVu(chu)` — con số ĐỨNG CẠNH một dấu hiệu nghiệp vụ.
   Dấu hiệu nghiệp vụ = đơn vị tiền/lượng, hoặc tên một đại lượng chỉ ERP mới
   biết (tồn kho, doanh số, giá vốn, công nợ…). Đó đúng là loại số "hôm sau đã
   sai": tồn kho đổi mỗi giờ, doanh số đổi mỗi ngày, giá vốn đổi mỗi lô nhập.
   Còn "9 phần của công văn" thì sang năm vẫn 9 phần.

   CỬA SỔ 40 KÝ TỰ mỗi bên: đủ ôm "tồn kho hiện tại 412 thùng" và "412 thùng
   hàng đang nằm trong kho", không đủ để một con số ở đầu đoạn dính vào một chữ
   "doanh số" ở cuối đoạn.

   Trả về `{ dinh, tu, doan }` — KHÔNG trả true/false trống. Người bị chặn phải
   nhìn thấy CHÍNH CÂU đã làm họ bị chặn, nếu không họ chỉ biết là "không lưu
   được" rồi gõ lại y hệt.
   ========================================================================== */

/* HAI LOẠI DẤU HIỆU, HAI CÁCH DÒ — và sự khác nhau này là kết quả của một ca
   ĐỎ THẬT trên bàn đo, không phải thiết kế trên giấy.

   Bản đầu gộp làm một danh sách và dò "có xuất hiện trong cửa sổ quanh con số".
   Bàn đo `do-khu-dao-tao.mjs` lập tức bắt được câu

       "Hợp đồng thử việc tối đa 60 ngày theo Điều 25 Bộ luật Lao động 2019."

   bị chặn oan — vì chữ **"đồng"** (đơn vị tiền) nằm ngay trong **"hợp đồng"**.
   Đó là một bài học pháp chế hoàn toàn đúng chuẩn, và nếu cửa chặn đá nó ra thì
   trong tuần sẽ có người gỡ cửa. Nên tách: */

/** ① ĐƠN VỊ — chỉ tính khi đứng NGAY SAU con số. "185.000 đồng" là tiền;
 *  "hợp đồng … 60 ngày" thì chữ đồng đứng TRƯỚC, không phải đơn vị. */
const DON_VI_SAU_SO = [
  'đồng', 'vnđ', 'vnd', 'triệu', 'tỷ', 'usd', '₫',
  'thùng', 'kiện', 'hộp', 'gói', 'kg', 'tấn'
];

/** ② ĐẠI LƯỢNG — tính ở bất kỳ đâu trong cửa sổ, vì chúng chỉ có một nghĩa.
 *
 *  CỐ Ý KHÔNG CÓ Ở ĐÂY: 'lương', 'số lượng', 'chi phí', 'đơn hàng', 'lô hàng'.
 *  Chúng xuất hiện liên tục trong bài học về QUY TRÌNH ("kiểm 3 đơn hàng đầu
 *  ca", "đối chiếu số lượng ở 2 chỗ") và sẽ chặn oan hàng loạt. Mà bỏ chúng ra
 *  KHÔNG mở lỗ hổng nào: con số thật đi kèm chúng bao giờ cũng có đơn vị ở
 *  ngay sau — "lương 8 triệu", "số lượng 412 thùng" — nên danh sách ① bắt được.
 *  Nếu Sếp thấy vẫn lọt ca nào thì thêm vào đây, một chỗ duy nhất. */
const DAI_LUONG_ERP = [
  'tồn kho', 'tồn cuối', 'doanh số', 'doanh thu', 'giá vốn', 'giá bán',
  'giá nhập', 'đơn giá', 'chiết khấu', 'công nợ', 'lợi nhuận', 'sản lượng',
  'tỷ lệ hoàn', 'mã số thuế', 'mst', 'cccd', 'số tài khoản', 'stk'
];

/** Con số nghiệp vụ đầu tiên tìm thấy, hoặc `null`.
 *  @returns {{dinh: string, tu: string, doan: string} | null}
 *    dinh — chính con số bị bắt
 *    tu   — dấu hiệu nghiệp vụ đứng cạnh nó
 *    doan — đoạn chữ quanh đó, để hiện lại cho người gõ nhìn thấy */
export function soNghiepVu(chu) {
  const s = String(chu || '');
  if (!s) return null;
  const viTri = viTriSoAI(s);
  if (!viTri.length) return null;          // ① sàng rẻ: không chữ số thì thôi

  const thuong = s.toLowerCase();
  const CUA_SO = 40;
  for (const [batDau, dai] of viTri) {
    const sauSo = thuong.slice(batDau + dai, batDau + dai + 12).replace(/^[\s.,:]+/, '');
    for (const tu of DON_VI_SAU_SO) {
      if (sauSo.startsWith(tu)) {
        return { dinh: s.slice(batDau, batDau + dai), tu,
                 doan: s.slice(Math.max(0, batDau - CUA_SO), batDau + dai + CUA_SO).trim() };
      }
    }
    const traiI = Math.max(0, batDau - CUA_SO);
    const phaiI = Math.min(s.length, batDau + dai + CUA_SO);
    const quanh = thuong.slice(traiI, phaiI);
    for (const tu of DAI_LUONG_ERP) {
      if (quanh.includes(tu)) {
        return { dinh: s.slice(batDau, batDau + dai), tu, doan: s.slice(traiI, phaiI).trim() };
      }
    }
  }
  return null;
}

/* ==========================================================================
   Ô DỮ LIỆU CHÍNH THỨC — CON SỐ KHÔNG ĐƯỢC TỰ ĐIỀN VÀO
   ---------------------------------------------------------------------------
   `docCCCD` (src/nhansu.js) trả các trường để ĐIỀN SẴN form hồ sơ lao động.
   Trường chữ (họ tên, quê quán, nơi thường trú) điền sẵn thì cùng lắm HR sửa
   lại một câu. Trường SỐ (số CCCD, ngày sinh) điền sẵn thì HR nhìn thấy một
   con số trông rất chuẩn nằm sẵn trong ô và bấm Lưu — REV-0040 đo được đúng
   ca đó: **họ tên ĐÚNG đứng cạnh một số CCCD SAI 11 chữ số**. Cái tên đúng
   làm người ta tin luôn con số.

   Nên hai loại trường đi ra bằng HAI ĐƯỜNG KHÁC NHAU:
     `thong_tin`       → điền sẵn được
     `so_chua_kiem`    → CHỈ là gợi ý, người phải tự gõ hoặc bấm xác nhận
   ========================================================================== */

/** SỐ CCCD LUÔN ĐỦ 12 CHỮ SỐ — một định nghĩa, mọi đường dùng.
 *
 *  CCCD Việt Nam (mẫu từ 2021) luôn 12 chữ số. Ca REV-0040 đo được là ca nguy
 *  nhất: họ tên ĐÚNG đứng cạnh `03691004271` — 11 chữ số, mất đúng một chữ, mà
 *  cái tên đúng làm người ta tin luôn con số.
 *
 *  Trước đây luật này nằm CHÉP TAY trong `src/nhansu.js` (`/^\d{12}$/`), nên
 *  đường quét giấy tờ vào hồ sơ nhân sự (CTL-0025) không có gì để gọi và suýt
 *  chép bản thứ hai. Hai bản chép tay của cùng một hằng số chính là cách đường
 *  đọc CCCD chết âm thầm 11 ngày (xem `MO_HINH_DOC_ANH`) — không lặp lại.
 *
 *  Trả về `{ so, dung }`: `so` là chuỗi CHỈ CÒN chữ số, `dung` là đủ 12 hay chưa. */
export function soCCCD(v) {
  const so = String(v ?? '').replace(/\D+/g, '');
  return { so, dung: /^\d{12}$/.test(so) };
}

/** Tách một bộ trường thành (điền sẵn được) / (phải người xác nhận).
 *  @param truong   object các trường AI đọc ra
 *  @param tenSo    tên các trường thuộc diện CON SỐ */
export function tachSoChuaKiem(truong, tenSo) {
  const bo = new Set(tenSo);
  const thongTin = {};
  const soChuaKiem = {};
  for (const [k, v] of Object.entries(truong || {})) {
    if (bo.has(k)) { if (v) soChuaKiem[k] = { gia_tri: v, nhan: NHAN_SO_AI }; }
    else thongTin[k] = v;
  }
  return { thongTin, soChuaKiem };
}
