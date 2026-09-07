/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px + CHIỀU CAO DẢI + SỐ DÒNG BẢNG THẤY ĐƯỢC
   ---------------------------------------------------------------------------
   Chạy:  npm run do-nut-dai-cat        (tự lái Chrome, tự chấm, tự thoát)

   ⚠️ TỆP NÀY TỪNG LÀ MỘT TRANG CHO NGƯỜI NHÌN MANG TÊN CỔNG (REV-0063 vòng 3,
   VỪA-4). Bản cũ `listen(8919)` rồi ĐỨNG CHỜ: không tự mở trình duyệt, không
   in kết luận, không mã thoát — `dat_het` chỉ nằm trong DOM của trang, chỉ
   NGƯỜI mở trình duyệt mới đọc được. Hệ quả đo được: người soi phải tự viết
   bàn đo lái Chrome vào đọc hộ, và cổng không thể nằm trong bất kỳ lượt chạy
   tự động nào. Thêm nữa cổng mạng 8919 VIẾT CỨNG, nên một tiến trình mồ côi
   của chính lượt chạy trước giữ cổng là `npm run` chết `EADDRINUSE` — ĐỎ VÌ
   CỔNG MẠNG BẬN, không vì luật 44px hỏng, đúng lớp "đỏ nhầm lý do" kho mã này
   chống. Nay: cổng lấy 0 để hệ điều hành tự cấp (đổi được bằng biến môi
   trường `CONG_DO_NUT`), tự lái Chrome, in `KET_QUA_JSON=` ra stdout, trả mã
   thoát 0/1 — như mọi cổng khác trong kho.

   ĐO CÁI GÌ
     ① 44px trên TRANG GIẤY TỰ DỰNG (`<iframe>` cách ly, nạp đúng
        `public/assets/css/style.css` đang chạy) — bốn chỗ bấm:
        · nút trong dải cắt                (`.dai-cat .dai-cat-nut`)
        · BỘ LỌC PHẠM VI của màn gộp       (`.seg-loc .seg-nut`)
        · dải PHẠM VI cũ                   (`.cv-pham-vi`) — xem ghi chú ②
        · nút "Xem thêm" trong ô bảng      (`td .dai-gon-btn`)
     ② CHIỀU CAO dải PHẠM VI — TRƯỚC (`ab92afc`) vs SAU (REV-0034 · L4).
        ⚠️ ĐÂY LÀ PHÉP ĐO LỊCH SỬ. Từ 29/08/2026 dải `.cv-pham-vi` KHÔNG CÒN
        TỒN TẠI trong bản chạy thật: ba tab + dải này đã gộp về tab Lịch sử
        làm việc (Sếp Ngọc nhắc hai lần). Luật CSS của nó nằm ở
        `CSS_DAI_PHAM_VI_DA_XOA` ngay trong file này, không còn trong
        `style.css`. Giữ phép đo lại vì nó là bằng chứng của REV-0034 · L4;
        số dòng bảng của MÀN GỘP mới đo ở bàn đo riêng
        `scripts/do-gop-viec-lichsu.mjs` (chạy app THẬT trong Chrome).
     ③ SỐ DÒNG BẢNG còn thấy được trong màn hình điện thoại (375×667 và
        320×568) — con số cuối cùng người dùng thật quan tâm. Ràng buộc:
        **không được giảm**.
     ④ NÚT "XEM THÊM" TRÊN ỨNG DỤNG THẬT — chín bề ngang, `elementFromPoint`.
        Xem "ARM ② " ở cuối tệp. Trang giấy tự dựng KHÔNG thay được arm này:
        REV-0063 vòng 3 THẤP-3.

   VÌ SAO PHẢI ĐO: commit 8909355 của chính kho mã này từng KHAI "mọi nút
   ≥44px" mà đo tay ra 28px. Khai không phải là đo (BH-16).

   ⚠️ HỘP KHÔNG PHẢI VÙNG CHẠM — VÀ TỆP NÀY TỪNG NÓI DỐI ĐÚNG CHỖ ẤY.
   REV-0063 vòng 3, CAO-1. Bản cũ tính `const chamO = oNutO.height` rồi gọi nó
   là *"vùng ngón tay bấm trúng"* — CÙNG MỘT BIỂU THỨC với `nut_o_bang_hop`,
   và trong cả tệp KHÔNG CÓ MỘT `elementFromPoint` NÀO. JSON của nó tự tố cáo:
   `_hop:44, _cham:44` ở cả 5 bộ số, trong khi ứng dụng thật ở 375px cho 38px.
   Đó là họ `MOC_CAO_DONG` — CHỐT GIẢ: một con số đứng đó để được cộng vào dấu
   tick, không đo cái nó hứa đo.
   Nay `chamDoc()`/`chamNgang()` QUÉT TỪNG PIXEL bằng `elementFromPoint`, sau
   khi `scrollIntoView` (quên bước này thì mọi nút dưới nếp gấp trả `null` và
   người đọc tưởng "có thứ che nút" — Hồ Ly tự khai đã mắc một lần).

   ⚠️ VÀ PHẢI CÓ MỘT KHUNG Ở CHẾ ĐỘ THẺ. Lỗi CAO-1 chỉ xuất hiện ở ≤980px, khi
   `.luoi-bang` biến `tr`/`td` thành khối và các ô XẾP CHỒNG. Bản cũ dựng bảng
   `#tbKep` KHÔNG có lớp `.luoi-bang` nên nó ở chế độ BẢNG tại mọi bề ngang —
   kể cả có `elementFromPoint` thì cũng không bao giờ gặp hình dạng gây lỗi.
   Nay `BANG_KEP` mang `class="luoi-bang"` + `data-nhan` đúng như `luoiBang()`
   dập ra, nên hai khung 375/320 CHẠY THẬT ở chế độ thẻ.

   CÁCH ĐO (BH-02): `<iframe>` cách ly, nạp ĐÚNG `public/assets/css/style.css`
   đang chạy, rồi đọc `getBoundingClientRect()` + `elementFromPoint` THẬT.
   KHÔNG khớp chuỗi CSS — khớp chuỗi chính là thứ đã để lọt lỗi lần trước.

   CA ĐỐI CHỨNG (BH-16) — BA cái, mỗi cái bắt một lớp khác nhau:
     · `va=0`  gỡ hẳn luật `min-height: 44px` → hộp lẫn chạm phải < 44px.
       Không có nó thì phép đo có thể đang đo một hằng số.
     · `va=2`  GIỮ nguyên hộp 44px, chỉ gỡ `position: relative; z-index: 1`.
       Đây là ca gài lại ĐÚNG lỗi CAO-1: hộp phải VẪN ≥44 mà CHẠM phải <44.
       Nếu ca này xanh thì `_cham` lại là một con số giả và cổng vô dụng.
     · arm ② `--gai-lai` làm đúng thế trên ỨNG DỤNG THẬT.
   `go()` kiểm regex có khớp thật — trượt một phát là dừng với mã lỗi 2.

   KHUNG "TRƯỚC": chép NGUYÊN VĂN đánh dấu + luật CSS của bản `ab92afc` (dán
   ở `CSS_TRUOC`/`HTML_TRUOC` dưới đây). Không có nó thì con số "gọn đi bao
   nhiêu" chỉ là lời khai. Bản `ab92afc` CHƯA CÓ khối `td .dai-gon-btn`, nên
   khung "trước" phải gỡ khối ấy ra — bản cũ không gỡ, nên hai con số
   `truoc.375.nut_o_bang_hop = 44 = nay.375` trông như một phép so mà không so
   gì cả (REV-0063 vòng 3, THẤP-5).

   ⚠️ ĐỌC CSS PHẢI CHUẨN HOÁ XUỐNG DÒNG. Kho này để `core.autocrlf = true` và
   không có `.gitattributes`, nên `style.css` trên đĩa mang CRLF: mọi biểu
   thức `X\n` trong `go()` sẽ TRƯỢT IM LẶNG nếu đọc thô. Lớp lỗi này đã bị bắt
   bốn lần ở bốn tệp khác nhau; chính dòng `td \.dai-gon-btn \{[\s\S]*?\n\}`
   dưới đây trước nay sống được chỉ vì `[\s\S]` nuốt hộ `\r`. Chuẩn hoá một
   lần ở đây là hết cửa (xem `docs/HANG-DOI.md` — chữa cả lớp bằng
   `.gitattributes`).
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dungMayGia, moChrome, TOI } from './lib/ban-do-chrome.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Ca gài lại chạy MẶC ĐỊNH, không nấp sau một cờ. Cờ nào cũng có ngày không
   ai gõ, và một cổng chưa từng đỏ thì không ai biết nó có răng hay không.
   Giá của nó là ~200ms mỗi bề ngang vì dùng lại đúng cửa sổ Chrome đang mở. */
const GAI_LAI = !process.argv.includes('--khong-gai');

/* DẢI PHẠM VI đã bị XOÁ khỏi bản chạy thật ngày 29/08/2026 (gộp ba tab về tab
   Lịch sử làm việc — Sếp Ngọc nhắc hai lần). Luật CSS của nó dọn về ĐÂY,
   nguyên văn bản cuối cùng từng chạy, để phép đo lịch sử TRƯỚC(ab92afc)/SAU
   không mất mà `style.css` cũng không phải cõng CSS không ai dùng. */
const CSS_DAI_PHAM_VI_DA_XOA = `
.cv-pham-vi {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; flex-wrap: nowrap; width: 100%;
  margin: 0 0 8px; padding: 4px 12px; min-height: 44px;
  border-radius: 12px; background: var(--warn-wash);
  border: 0; border-left: 3px solid var(--warn);
  color: var(--text); font-size: 13.5px; font-weight: 400; line-height: 1.4;
  text-align: left; white-space: normal; cursor: pointer;
}
.cv-pham-vi:hover { background: var(--warn-wash); border-left-color: var(--warn-dark); }
.cv-pham-vi-chu { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cv-pham-vi-di { color: var(--warn-dark); font-weight: 600; white-space: nowrap; flex-shrink: 0; }
`;
/* Chuẩn hoá CRLF → LF NGAY khi đọc: xem ghi chú ở đầu tệp. */
const CSS = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8')
              .replace(/\r\n/g, '\n') + CSS_DAI_PHAM_VI_DA_XOA;

function go(css, tim, thay, ten) {
  const sau = css.replace(tim, thay);
  if (sau === css) {
    console.error(`HỎNG: không gỡ được luật "${ten}" khỏi CSS — regex trượt.\n` +
      'Ca đối chứng sẽ giống hệt bản vá, phép đo thành vô nghĩa. Sửa regex rồi chạy lại.');
    process.exit(2);
  }
  return sau;
}

/* Trả các chỗ bấm về "chưa ai nghĩ tới ngón tay": cỡ tự nhiên theo cỡ chữ. */
let CSS_CHUA_VA = go(CSS, /\.dai-cat-nut \{[^}]*\}/,
  '.dai-cat-nut { padding: 2px 8px; border: 1px solid #ccc; border-radius: 12px; font-size: 13.5px; }',
  '.dai-cat-nut');
CSS_CHUA_VA = go(CSS_CHUA_VA, /(\.cv-pham-vi \{[^}]*?)min-height: 44px;/,
  '$1min-height: 0;', '.cv-pham-vi min-height');
CSS_CHUA_VA = go(CSS_CHUA_VA, /\.seg-loc \.seg-nut \{ min-height: 44px; \}/,
  '.seg-loc .seg-nut { min-height: 0; }', '.seg-loc .seg-nut min-height');
/* Nút "Xem thêm" TRONG Ô BẢNG — đường thoát DUY NHẤT khỏi chỗ chữ bị kẹp
   (REV-0063 vòng 2, VỪA-3). Ca đối chứng gỡ đúng khối 44px, trả nút về cái đã
   đo được trước khi vá: hộp 60×15px. */
const RE_KHOI_NUT = /td \.dai-gon-btn \{[\s\S]*?\n\}/;
CSS_CHUA_VA = go(CSS_CHUA_VA, RE_KHOI_NUT,
  'td .dai-gon-btn { padding: 0; font-size: 12px; }', 'td .dai-gon-btn');

/* CA GÀI LẠI ĐÚNG LỖI CAO-1 — giữ hộp 44px, chỉ gỡ hai dòng xếp lớp. Ở chế độ
   thẻ, ô kế tiếp sẽ trùm lại lên đáy nút và VÙNG CHẠM phải tụt xuống 37–38px
   trong khi HỘP vẫn 44px. Đây là ca chứng minh `_cham` không phải `_hop`. */
const CSS_GO_XEP_LOP = go(CSS, /(td \.dai-gon-btn \{[\s\S]*?)\n  position: relative;\n  z-index: 1;/,
  '$1', 'td .dai-gon-btn position/z-index');

/* ==========================================================================
   BẢN TRƯỚC (`ab92afc`) — chép nguyên văn để có số ĐỐI CHIẾU, không phải khai
   ========================================================================== */
const CSS_TRUOC = `
.dai-cat, .cv-pham-vi {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; border-radius: 12px;
  background: var(--warn-wash); border-left: 3px solid var(--warn);
  font-size: 13.5px; color: var(--text); line-height: 1.5;
  /* gỡ mọi luật của bản NAY để khung "trước" đúng là bản trước */
  min-height: 0; justify-content: flex-start; white-space: normal;
}
.dai-cat { margin: 10px 0 2px; }
.cv-pham-vi { margin: 0 0 12px; }
.dai-cat-chu, .cv-pham-vi-chu {
  flex: 1 1 240px; min-width: 0;
  white-space: normal; overflow: visible; text-overflow: clip;
}
`;
/* `ab92afc` CHƯA CÓ khối `td .dai-gon-btn` — khung "trước" phải KHÔNG có nó,
   nếu không thì cột TRƯỚC/SAU của nút trong ô bảng so hai con số y hệt nhau
   (REV-0063 vòng 3, THẤP-5). */
const CSS_NEN_TRUOC = go(CSS, RE_KHOI_NUT, '', 'td .dai-gon-btn (khung TRƯỚC)');

const HTML_TRUOC = `
<div class="cv-pham-vi" id="daiPhamVi">
  <span class="cv-pham-vi-chu">Ba bảng dưới đây chỉ hiện <b>việc liên quan trực tiếp tới bạn</b> (bạn nhận · bạn được mời phối hợp · bạn giao). Việc của người khác không nằm ở đây.</span>
  <button type="button" class="dai-cat-nut" id="nutPhamVi" data-dai-cat-tab="lichsuviec">Xem việc toàn công ty</button>
</div>`;

/* Bản NAY — chép ĐÚNG theo `public/app.html`: cả dải LÀ nút. */
const HTML_NAY = `
<button type="button" class="cv-pham-vi dai-cat-nut" id="daiPhamVi" data-dai-cat-tab="lichsuviec"
        title="Ba bảng dưới đây chỉ hiện việc bạn nhận · bạn được mời phối hợp · bạn giao.">
  <span class="cv-pham-vi-chu">Đây chỉ là việc của bạn</span>
  <span class="cv-pham-vi-di">Xem việc toàn công ty →</span>
</button>`;
/* Bảng việc thật bên dưới — để đếm CÒN THẤY ĐƯỢC MẤY DÒNG. Đánh dấu chép theo
   `public/app.html` (`.table-wrap > table`, 6 cột). */
const BANG = `
<div class="seg seg-loc" id="segLoc"><button class="seg-nut active" id="nutLoc">Việc của tôi</button><button class="seg-nut">Tôi phối hợp</button><button class="seg-nut">Tôi giao</button><button class="seg-nut">Toàn công ty</button></div>
<div class="panel"><div class="table-wrap"><table>
<thead><tr><th>Việc</th><th>Đầu ra cần đạt</th><th>Người giao</th><th>Hạn chót</th><th>Trạng thái</th><th></th></tr></thead>
<tbody id="tb">${Array.from({ length: 30 }, (_, i) =>
  `<tr class="hang"><td><div class="nm">Đối soát đơn hoàn ngày ${i + 1}</div></td><td class="sm">Bảng khớp 100%</td>` +
  `<td class="sm">Sếp Ngọc</td><td class="sm">0${(i % 9) + 1}/09/2026</td><td><span class="tag">Mới</span></td><td></td></tr>`).join('')}
</tbody></table></div></div>`;

/* Ô BẢNG CÓ CHỮ BỊ KẸP + NÚT "XEM THÊM" — chép đúng hình dạng mà
   `capNutDongPhu()` dựng ra ở màn Kinh doanh: `td.cot-chu` chứa `.nm` (mã SKU)
   và `.sm` (tên hàng, bị `max-height` kẹp), nút `.dai-gon-btn` đặt NGAY SAU
   `.sm`. Tên hàng là dữ liệu ngành thật, 96 ký tự.
   ⚠️ `class="luoi-bang"` + `data-nhan` + `td.o-dau` là BẮT BUỘC, không phải
   trang trí: đó đúng thứ `luoiBang()` dập ra, và là điều kiện để ≤980px vào
   CHẾ ĐỘ THẺ — hình dạng DUY NHẤT làm lộ lỗi CAO-1 (ô sau trùm lên đáy nút).
   Bỏ lớp ấy đi là quay lại cái bàn đo không bao giờ gặp lỗi.
   ⚠️ TÊN HÀNG PHẢI ĐỦ DÀI ĐỂ KẸP Ở **CẢ HAI** CHẾ ĐỘ. Ở chế độ bảng ô bị
   `td.cot-chu { max-width: 240px }` bóp nên 96 ký tự đã đủ kẹp; ở chế độ thẻ
   `max-width: none` nên ô rộng ~341px và đúng cái tên ấy vừa khít 2 dòng —
   KHÔNG kẹp, tức phép đo thành đo một cái nút không ai cần. Bản đầu của vòng
   này mắc đúng thế và `o_mau_that_su_bi_kep` bắt được. 150 ký tự (tên hàng
   nhập khẩu thật, có kèm chứng từ) kẹp ở cả hai chế độ.
   ⚠️ VÀ PHẢI BỌC ĐÚNG `.kd-sku-cot` > `.table-wrap-cuon`, HAI BẢNG như ứng
   dụng thật. Bản đầu của vòng này bọc `.panel > .table-wrap` MỘT bảng: ở
   khung 1100px cái bảng ăn hết bề ngang nên ô chữ rộng 549px và KHÔNG kẹp
   (hiện 34 / thật 34). `td.cot-chu { max-width: 240px }` chỉ là GỢI Ý với
   `table-layout: auto`; thứ ép ô hẹp lại trong ứng dụng thật là LƯỚI HAI CỘT
   `minmax(360px, 1fr)` chia panel thành hai khung ~537px. Chép sai cái bọc là
   chép sai hình học, và bàn đo lại đo một cái nút không ai cần. */
const O_SKU = (idTb, idNut) => `
<div>
  <h5 style="margin:0 0 8px">🔥 10 SKU bán chạy nhất</h5>
  <div class="table-wrap-cuon"><table class="luoi-bang">
  <thead><tr><th class="cot-chu">Mã SKU · Tên hàng</th><th class="num">SL bán</th><th class="num">Doanh thu</th></tr></thead>
  <tbody id="${idTb}"><tr class="hang" data-luoi="1">
    <td class="cot-chu o-dau" data-nhan="">
      <div class="nm">AGC-HDRM-500G-LOAI-A-1</div>
      <div class="sm">Hạt điều rang muối Bình Phước loại A đóng túi zip 500g — lô nhập tháng 8/2026 kèm giấy kiểm định an toàn thực phẩm và phiếu kiểm nghiệm chỉ tiêu vi sinh</div>
      <button type="button" class="dai-gon-btn" id="${idNut}">Xem thêm</button>
    </td>
    <td class="num" data-nhan="SL bán">1.234</td>
    <td class="num" data-nhan="Doanh thu">9.876.543.210</td>
  </tr></tbody></table></div>
</div>`;
const BANG_KEP = `
<div class="panel"><div class="kd-sku-cot">${O_SKU('tbKep', 'nutXemThemO')}${O_SKU('tbKep2', 'nutXemThemO2')}</div></div>`;

const KHUNG = (css, than, extra = '') => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style></head><body style="margin:0;padding:8px">
${than}
<div class="dai-cat" id="daiCat">
  <span class="dai-cat-chu">✂️ Đã tải <b>500</b> trong tổng <b>700</b> việc — còn <b>200</b> việc chưa tải về máy. Ô tìm kiếm phía trên chỉ tìm trong phần ĐÃ TẢI về máy.</span>
  <button type="button" class="dai-cat-nut" id="nutXemThem">Tải thêm 200 việc cũ hơn</button>
</div>
<div class="dai-cat" id="daiCatAn" hidden></div>
${BANG}${BANG_KEP}${extra}</body></html>`;

const TRANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Đo dải phạm vi — 44px · chiều cao · số dòng</title></head><body style="font:13px monospace;margin:12px">
<h3>1–2 = NAY chế độ THẺ · 3 = NAY chế độ BẢNG · 4–5 = TRƯỚC (ab92afc) · 6 = đối chứng gỡ 44px · 7 = đối chứng gỡ XẾP LỚP</h3>
<div>
  <iframe id="nay375"    src="/khung?ban=nay&va=1"    width="375"  height="667" style="border:1px solid #ccc"></iframe>
  <iframe id="nay320"    src="/khung?ban=nay&va=1"    width="320"  height="568" style="border:1px solid #ccc"></iframe>
  <iframe id="nay1100"   src="/khung?ban=nay&va=1"    width="1100" height="700" style="border:1px solid #ccc"></iframe>
  <iframe id="truoc375"  src="/khung?ban=truoc&va=1"  width="375"  height="667" style="border:1px solid #ccc"></iframe>
  <iframe id="truoc320"  src="/khung?ban=truoc&va=1"  width="320"  height="568" style="border:1px solid #ccc"></iframe>
  <iframe id="dc"        src="/khung?ban=nay&va=0"    width="375"  height="667" style="border:1px solid #ccc"></iframe>
  <iframe id="dcXepLop"  src="/khung?ban=nay&va=2"    width="375"  height="667" style="border:1px solid #ccc"></iframe>
</div>
<pre id="kq">đang đo…</pre>
<script>
/* VÙNG CHẠM THẬT — quét từng pixel bằng \`elementFromPoint\`, KHÔNG đọc lại
   chiều cao hộp. Xem ghi chú "HỘP KHÔNG PHẢI VÙNG CHẠM" ở đầu tệp .mjs.
   Trả về dải LIÊN TỤC dài nhất trúng nút: một vùng chạm 44px bị cắt làm đôi
   không phải một vùng chạm 44px. */
function chamDoc(d, nut) {
  nut.scrollIntoView({ block: 'center' });
  const r = nut.getBoundingClientRect();
  if (!r.width) return { cao: 0, rong: 0, che: null };
  const cx = Math.round(r.left + r.width / 2);
  let max = 0, cur = 0;
  let che = null;
  for (let y = Math.floor(r.top); y <= Math.ceil(r.bottom); y++) {
    const e = d.elementFromPoint(cx, y);
    if (e && (e === nut || nut.contains(e))) { cur++; if (cur > max) max = cur; }
    else { cur = 0; if (e && !che) che = e.tagName + (e.className ? '.' + e.className : ''); }
  }
  const cy = Math.round(r.top + r.height / 2);
  let rong = 0;
  for (let x = Math.floor(r.left); x <= Math.ceil(r.right); x++) {
    const e = d.elementFromPoint(x, cy);
    if (e && (e === nut || nut.contains(e))) rong++;
  }
  return { cao: max, rong: rong, che: che };
}
function doKhung(id, be, cao) {
  const d = document.getElementById(id).contentDocument;
  const lay = (sel) => { const e = d.querySelector(sel); const o = e && e.getBoundingClientRect();
                         return o ? Math.round(o.height * 10) / 10 : null; };
  // Chỗ bấm của dải phạm vi: bản TRƯỚC là nút con, bản NAY là cả dải.
  const nutPv = d.querySelector('#nutPhamVi') || d.querySelector('#daiPhamVi');
  const oPv = nutPv && nutPv.getBoundingClientRect();
  // Dải phạm vi chiếm bao nhiêu chiều DỌC, kể cả margin dưới.
  const dai = d.querySelector('#daiPhamVi');
  const cs = dai && d.defaultView.getComputedStyle(dai);
  const chiemDoc = dai
    ? Math.round((dai.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)) * 10) / 10
    : null;
  // Còn thấy được mấy DÒNG bảng trong đúng màn hình đó (dòng nằm TRỌN trong màn).
  let dong = 0;
  for (const tr of d.querySelectorAll('#tb tr')) if (tr.getBoundingClientRect().bottom <= cao) dong++;
  const an = d.querySelector('#daiCatAn');
  const csAn = an ? d.defaultView.getComputedStyle(an) : null;
  /* Nút "Xem thêm" TRONG Ô BẢNG. Đo HAI số THẬT SỰ KHÁC NHAU, và đó là cả
     điểm của phép đo này (REV-0063 vòng 2 VỪA-3 · vòng 3 CAO-1):
       · HỘP nút        — \`getBoundingClientRect\`, phải >= 44px
       · VÙNG CHẠM      — \`elementFromPoint\` quét từng pixel, phải >= 44px
         Hai số này LỆCH NHAU ở chế độ thẻ: hộp 44, chạm 37–38, vì ô kế tiếp
         trùm lên đáy nút. Bản cũ của tệp này đặt \`cham = hop.height\` nên
         không bao giờ thấy được chuyện đó — chốt giả.
       · CHIỀU CAO DÒNG — phải KHÔNG phình ra, vì nút cao lên mà dòng cao theo
         là đổi từ lỗi ngón tay sang lỗi "ăn mất số dòng thấy được"
     Lề âm trên/dưới là thứ làm hai số đầu cùng đạt một lúc; \`z-index\` là thứ
     giữ số thứ hai ở chế độ thẻ.
     (Lưu ý cho người sửa: đoạn này nằm TRONG một chuỗi mẫu — đừng viết dấu
     huyền ngược ở đây, nó đóng chuỗi và cả tệp thành lỗi cú pháp.) */
  const nutO = d.querySelector('#nutXemThemO');
  const oNutO = nutO && nutO.getBoundingClientRect();
  const q = nutO ? chamDoc(d, nutO) : { cao: null, rong: null, che: null };
  const dongKep = d.querySelector('#tbKep tr');
  const smKep = d.querySelector('#tbKep .sm');
  // Chế độ THẺ hay chế độ BẢNG — ghi ra để không ai đọc nhầm phạm vi lần nữa.
  const trKep = d.querySelector('#tbKep tr');
  const cheDo = trKep && d.defaultView.getComputedStyle(trKep).display === 'block' ? 'the' : 'bang';
  return {
    che_do: cheDo,
    nut_pham_vi: oPv ? Math.round(oPv.height * 10) / 10 : null,
    nut_xem_them: lay('#nutXemThem'),
    nut_loc_pham_vi: lay('#nutLoc'),
    nut_o_bang_hop: oNutO ? Math.round(oNutO.height * 10) / 10 : null,
    nut_o_bang_rong: oNutO ? Math.round(oNutO.width * 10) / 10 : null,
    nut_o_bang_cham: q.cao,
    nut_o_bang_cham_rong: q.rong,
    nut_o_bang_ai_che: q.che,
    dong_o_kep_cao: dongKep ? Math.round(dongKep.getBoundingClientRect().height * 10) / 10 : null,
    o_kep_that_su_bi_kep: !!(smKep && smKep.scrollHeight > smKep.clientHeight + 1),
    /* In ra hai con số nuôi câu trên. Không có chúng thì lúc cờ hoá FALSE,
       người sửa chỉ biết "phép đo vô nghĩa" mà không biết vì sao — tôi vừa
       mất một lượt chạy đúng vì thế. (Và đoạn này nằm trong chuỗi mẫu: KHÔNG
       viết dấu huyền ngược ở đây, nó đóng chuỗi và cả tệp thành lỗi cú pháp
       — tôi vừa dính đúng cái bẫy ghi ngay phía trên.) */
    o_kep_hien: smKep ? smKep.clientHeight : null,
    o_kep_that: smKep ? smKep.scrollHeight : null,
    o_kep_rong: smKep ? Math.round(smKep.getBoundingClientRect().width) : null,
    dai_chiem_doc: chiemDoc,
    dong_bang_thay_duoc: dong,
    an_dung_khi_hidden: !!csAn && csAn.display === 'none' && an.getBoundingClientRect().height === 0,
    tran_ngang: d.documentElement.scrollWidth > be + 1
  };
}
function ve() {
  const n375 = doKhung('nay375', 375, 667), n320 = doKhung('nay320', 320, 568);
  const n1100 = doKhung('nay1100', 1100, 700);
  const t375 = doKhung('truoc375', 375, 667), t320 = doKhung('truoc320', 320, 568);
  const dc = doKhung('dc', 375, 667);
  const dcz = doKhung('dcXepLop', 375, 667);

  const cham44 = (x) => x.nut_o_bang_cham >= 44 && x.nut_o_bang_cham_rong >= 44;
  const nut44 = n375.nut_pham_vi >= 44 && n320.nut_pham_vi >= 44 &&
                n375.nut_xem_them >= 44 && n320.nut_xem_them >= 44 &&
                n375.nut_loc_pham_vi >= 44 && n320.nut_loc_pham_vi >= 44 &&
                cham44(n375) && cham44(n320) && cham44(n1100);
  const dcNhay = !(dc.nut_pham_vi >= 44 && dc.nut_xem_them >= 44 && dc.nut_loc_pham_vi >= 44) &&
                 !cham44(dc);
  /* ĐỐI CHỨNG XẾP LỚP — ca gài lại đúng lỗi CAO-1. HỘP phải vẫn >= 44 (chứng
     minh ta chỉ gỡ z-index chứ không gỡ 44px) mà CHẠM phải < 44 (chứng minh
     phép đo chạm KHÔNG phải phép đo hộp đội lốt). Ca này xanh nghĩa là cổng
     mù đúng chỗ nó sinh ra để canh. */
  const dczNhay = dcz.nut_o_bang_hop >= 44 && dcz.nut_o_bang_cham < 44;
  /* Khung thẻ phải THẬT SỰ ở chế độ thẻ, khung bảng phải THẬT SỰ ở chế độ
     bảng — nếu không thì "đã đo cả hai chế độ" lại là một lời khai. */
  const duCheDo = n375.che_do === 'the' && n320.che_do === 'the' && n1100.che_do === 'bang';
  /* Vùng chạm nới ra mà DÒNG KHÔNG ĐƯỢC PHÌNH. */
  const dongKhongPhinh = n375.dong_o_kep_cao <= dc.dong_o_kep_cao + 10 &&
                         n320.dong_o_kep_cao <= dc.dong_o_kep_cao + 10;
  /* Ô mẫu phải THẬT SỰ bị kẹp — Ở CẢ BA KHUNG, không chỉ hai khung điện
     thoại. Nếu không thì phép đo trên là đo một cái nút không ai cần, và bàn
     đo tự nói dối. Khung 1100 (chế độ bảng) trước nay không bị hỏi câu này. */
  const oKepThat = n375.o_kep_that_su_bi_kep && n320.o_kep_that_su_bi_kep &&
                   n1100.o_kep_that_su_bi_kep;
  const gonHon = n375.dai_chiem_doc < t375.dai_chiem_doc && n320.dai_chiem_doc < t320.dai_chiem_doc;
  const dongKhongGiam = n375.dong_bang_thay_duoc >= t375.dong_bang_thay_duoc &&
                        n320.dong_bang_thay_duoc >= t320.dong_bang_thay_duoc;
  const anDung = n375.an_dung_khi_hidden && n320.an_dung_khi_hidden;
  const khongTran = !n375.tran_ngang && !n320.tran_ngang;

  const kq = { nut_44px: nut44, doi_chung_con_hieu_luc: dcNhay,
               doi_chung_xep_lop_con_hieu_luc: dczNhay, du_hai_che_do: duCheDo,
               dai_gon_hon: gonHon,
               dong_bang_khong_giam: dongKhongGiam, an_dung_khi_hidden: anDung,
               khong_tran_ngang: khongTran,
               nut_o_bang_khong_phinh_dong: dongKhongPhinh, o_mau_that_su_bi_kep: oKepThat,
               nay: { '375': n375, '320': n320, '1100': n1100 },
               truoc: { '375': t375, '320': t320 },
               doi_chung: dc, doi_chung_xep_lop: dcz };
  kq.dat_het = nut44 && dcNhay && dczNhay && duCheDo && gonHon && dongKhongGiam && anDung &&
               khongTran && dongKhongPhinh && oKepThat;
  window.KET_QUA = kq;
  const d = (x) => String(x).padStart(6);
  document.getElementById('kq').textContent =
    'NGUONG NGON TAY 44px (WCAG 2.5.5 / Apple HIG)\\n' +
    '  Nut dai PHAM VI  375px: ' + d(n375.nut_pham_vi) + 'px   320px: ' + d(n320.nut_pham_vi) +
      'px   doi chung (go luat): ' + d(dc.nut_pham_vi) + 'px\\n' +
    '  Nut "Tai them"   375px: ' + d(n375.nut_xem_them) + 'px   320px: ' + d(n320.nut_xem_them) +
      'px   doi chung (go luat): ' + d(dc.nut_xem_them) + 'px\\n' +
    '  Nut BO LOC pham vi 375px: ' + d(n375.nut_loc_pham_vi) + 'px   320px: ' + d(n320.nut_loc_pham_vi) +
      'px   doi chung (go luat): ' + d(dc.nut_loc_pham_vi) + 'px\\n' +
    '  Nut "Xem them" TRONG O BANG — HOP vs VUNG CHAM (elementFromPoint)\\n' +
    '    375px  che do ' + n375.che_do + ' : hop ' + d(n375.nut_o_bang_hop) + ' | CHAM ' +
      d(n375.nut_o_bang_cham) + 'x' + n375.nut_o_bang_cham_rong + '\\n' +
    '    320px  che do ' + n320.che_do + ' : hop ' + d(n320.nut_o_bang_hop) + ' | CHAM ' +
      d(n320.nut_o_bang_cham) + 'x' + n320.nut_o_bang_cham_rong + '\\n' +
    '    1100px che do ' + n1100.che_do + ': hop ' + d(n1100.nut_o_bang_hop) + ' | CHAM ' +
      d(n1100.nut_o_bang_cham) + 'x' + n1100.nut_o_bang_cham_rong + '\\n' +
    '    TRUOC (ab92afc) 375px: hop ' + d(t375.nut_o_bang_hop) + ' | CHAM ' + d(t375.nut_o_bang_cham) + '\\n' +
    '    doi chung GO 44px     : hop ' + d(dc.nut_o_bang_hop) + ' | CHAM ' + d(dc.nut_o_bang_cham) + '\\n' +
    '    doi chung GO XEP LOP  : hop ' + d(dcz.nut_o_bang_hop) + ' | CHAM ' + d(dcz.nut_o_bang_cham) +
      '   (ai che: ' + dcz.nut_o_bang_ai_che + ')\\n' +
    '    dong o kep 375px: ' + d(n375.dong_o_kep_cao) + 'px   doi chung: ' + d(dc.dong_o_kep_cao) +
      'px   (khong duoc phinh)   o co that su bi kep: ' + n375.o_kep_that_su_bi_kep + '\\n' +
    '\\nCHIEU CAO DAI PHAM VI (ke ca margin) — TRUOC vs SAU\\n' +
    '  375px: TRUOC ' + d(t375.dai_chiem_doc) + 'px  ->  SAU ' + d(n375.dai_chiem_doc) +
      'px   (bot ' + Math.round(t375.dai_chiem_doc - n375.dai_chiem_doc) + 'px)\\n' +
    '  320px: TRUOC ' + d(t320.dai_chiem_doc) + 'px  ->  SAU ' + d(n320.dai_chiem_doc) +
      'px   (bot ' + Math.round(t320.dai_chiem_doc - n320.dai_chiem_doc) + 'px)\\n' +
    '\\nSO DONG BANG CON THAY DUOC TRONG MAN HINH — TRUOC vs SAU\\n' +
    '  375x667: TRUOC ' + t375.dong_bang_thay_duoc + ' dong  ->  SAU ' + n375.dong_bang_thay_duoc + ' dong\\n' +
    '  320x568: TRUOC ' + t320.dong_bang_thay_duoc + ' dong  ->  SAU ' + n320.dong_bang_thay_duoc + ' dong\\n' +
    '\\nTat ca nut >= 44px  : ' + (nut44 ? 'DAT' : 'HONG') +
    '\\nDu CA HAI che do    : ' + (duCheDo ? 'DAT (the 375/320 + bang 1100)' : 'HONG') +
    '\\nDai gon hon         : ' + (gonHon ? 'DAT' : 'HONG') +
    '\\nSo dong KHONG giam  : ' + (dongKhongGiam ? 'DAT' : 'HONG') +
    '\\nDai [hidden] van an : ' + (anDung ? 'DAT' : 'HONG') +
    '\\nKhong tran ngang    : ' + (khongTran ? 'DAT' : 'HONG') +
    '\\nNut o bang: dong KHONG phinh : ' + (dongKhongPhinh ? 'DAT' : 'HONG') +
    '\\nO mau THAT SU bi kep         : ' + (oKepThat ? 'DAT' : 'HONG - phep do vo nghia') +
    '\\nDoi chung GO 44px con nhay   : ' + (dcNhay ? 'CO (ban khong va do ra <44px)' : 'KHONG - PHEP DO VO DUNG') +
    '\\nDoi chung GO XEP LOP con nhay: ' + (dczNhay ? 'CO (hop >=44 ma CHAM <44)' : 'KHONG - _cham lai la so gia') +
    '\\n\\nKET_QUA_JSON=' + JSON.stringify(kq);
}
let xong = 0;
const KHUNGS = ['nay375', 'nay320', 'nay1100', 'truoc375', 'truoc320', 'dc', 'dcXepLop'];
for (const id of KHUNGS) {
  document.getElementById(id).addEventListener('load', () => {
    if (++xong === KHUNGS.length) setTimeout(ve, 120);
  });
}
</script></body></html>`;

/* ==========================================================================
   ARM ① — TRANG GIẤY TỰ DỰNG, TỰ LÁI CHROME VÀO ĐỌC
   ========================================================================== */
const CONG = Number(process.env.CONG_DO_NUT || 0);   // 0 = hệ điều hành tự cấp
const may = createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/khung') {
    const truoc = u.searchParams.get('ban') === 'truoc';
    const va = u.searchParams.get('va');
    const nen = truoc ? CSS_NEN_TRUOC : va === '0' ? CSS_CHUA_VA : va === '2' ? CSS_GO_XEP_LOP : CSS;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(KHUNG(nen + (truoc ? CSS_TRUOC : ''), truoc ? HTML_TRUOC : HTML_NAY));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(TRANG);
});
await new Promise(ok => may.listen(CONG, '127.0.0.1', ok));
const cong = may.address().port;

let arm1 = null;
{
  /* Khung nhìn phải đủ rộng cho iframe 1100px, nếu không nó bị bóp và khung
     "chế độ bảng" lặng lẽ thành chế độ thẻ — `du_hai_che_do` bắt chuyện đó. */
  const cr = await moChrome({ url: `http://127.0.0.1:${cong}/trang.html`, rong: 1600, cao: 1000, doiMs: 2500 });
  for (let i = 0; i < 40 && !arm1; i++) {
    arm1 = await cr.chay('window.KET_QUA || null');
    if (!arm1) await cr.doi(250);
  }
  const chu = await cr.chay("document.getElementById('kq').textContent");
  cr.dong();
  console.log('─── ARM ① · TRANG GIẤY TỰ DỰNG ───');
  console.log(chu);
}
may.close();
if (!arm1) { console.error('HỎNG: trang không in ra KET_QUA sau 10 giây.'); process.exit(2); }

/* ==========================================================================
   ARM ② — NÚT "XEM THÊM" TRÊN ỨNG DỤNG THẬT, CHÍN BỀ NGANG
   ---------------------------------------------------------------------------
   REV-0063 vòng 3, THẤP-3 + CAO-1 điểm ②. Arm ① chấm trên trang giấy tự dựng;
   dù nay nó đã có chế độ thẻ thật, nó vẫn là bảng do TAY dựng — nếu mai
   `luoiBang()` đổi hình dạng ô thì arm ① không biết. Arm này nạp `app.js`
   thật, để `capNutDongPhu()` tự gắn nút, rồi quét `elementFromPoint`.

   CHÍN BỀ NGANG, không phải ba: 1440 · 1280 · 1200 · 1024 (chế độ BẢNG) và
   414 · 390 · 375 · 360 · 320 (chế độ THẺ). Ba vòng liên tiếp của nhánh này
   đo một phía của cái vạch rồi kết luận cho cả hai — danh sách này là chỗ
   chặn chuyện đó lặp lần thứ tư. Thêm một bề ngang vào `RONGS` của
   `do-bang-that` thì cân nhắc thêm cả ở đây.

   ⚠️ TỰ CẮT PHẠM VI, GHI RA ĐỂ ĐỪNG AI ĐỌC RỘNG HƠN. Arm này chỉ chấm được ở
   bề ngang nào CÓ nút, mà nút chỉ sinh ra ở ô ĐANG BỊ KẸP. Có những bề ngang
   không ô nào kẹp nên không có nút nào để đo — ví dụ **768px**: hai bảng SKU
   đã xếp chồng, cột chữ rộng ra, không ô nào kẹp, `0 nút`. Ở đó arm này
   KHÔNG KẾT LUẬN GÌ, và cố tình KHÔNG in dấu tick: một bề ngang trống bị
   tính là TRƯỢT (`thieuNut`), vì một phép đo trống in ra dấu tick chính là
   cách chốt giả sinh ra. Nên đừng thêm 768 vào `RONGS` mà không nghĩ — chín
   mức dưới đây là chín mức ĐO ĐƯỢC, không phải "mọi bề ngang".

   `--gai-lai`: tiêm CSS gỡ `position/z-index` của `td .dai-gon-btn` rồi đo
   lại — arm này BẮT BUỘC phải đỏ ở chế độ thẻ. Đó là ca chứng minh arm ② có
   răng, chạy ngay trong cùng lượt.
   ========================================================================== */
const TEN_DAI = 'Hạnh nhân Mỹ nguyên vỏ rang mộc không muối nhập khẩu California hũ 500g — lô nhập tháng 8/2026';
const API_SKU = (duong, u, traJson) => {
  if (duong === '/api/toi-la-ai') { traJson({ ...TOI, la_admin: true, quyen: [...TOI.quyen, 'kinhdoanh'] }); return true; }
  if (duong === '/api/kinh-doanh/xep-hang-sku') {
    const h = (i, ten, sl) => ({ sku: 'AGC-NK-' + (1000 + i), ten, so_luong: sl, doanh_thu: 9876543210 });
    traJson({ co_bang: true, nguon_xep_hang: 'don_hang', so_ma_hang: 120, so_ma_ban_duoc: 96,
      ky: { nhan: 'Tháng 8/2026' },
      ban_chay: [h(1, TEN_DAI, 412), h(2, TEN_DAI + ' loại 2', 388), h(3, 'Óc chó Chile', 300)],
      ban_kem:  [h(4, TEN_DAI, 3), h(5, TEN_DAI + ' loại 2', 1), h(6, 'Nho khô Úc', 0)] });
    return true;
  }
  return false;
};
const MO_KD = `(function(){
  if (typeof window.moTab === 'function') { try { window.moTab('kinhdoanh'); } catch(e) {} }
  const t = document.querySelector('[data-tab="kinhdoanh"], #tab-kinhdoanh, [href="#kinhdoanh"]');
  if (t) t.click();
  return document.querySelectorAll('#kd-sku-chay tr').length;
})()`;
/* Gỡ xếp lớp NGAY TRONG TRANG — `dungMayGia({suaTep})` không nhận tệp CSS
   (Hồ Ly đo được: "ba bản đối chứng" hoá ra ba lần chạy cùng một bản). Tiêm
   tại chỗ rồi TỰ IN `z-index` sau khi tiêm để chứng minh đã đổi được gì. */
const GAI = `(function(){
  const s = document.createElement('style');
  s.textContent = 'td .dai-gon-btn { position: static !important; z-index: auto !important; }';
  document.head.appendChild(s);
  const n = document.querySelector('td .dai-gon-btn');
  return n ? getComputedStyle(n).position + '/' + getComputedStyle(n).zIndex : 'khong-co-nut';
})()`;
const QUET_THAT = `(function(){
  const ra = [];
  for (const nut of document.querySelectorAll('td .dai-gon-btn')) {
    nut.scrollIntoView({ block: 'center' });
    const r = nut.getBoundingClientRect();
    if (!r.width) continue;
    const cx = Math.round(r.left + r.width / 2);
    let max = 0, cur = 0, che = null;
    for (let y = Math.floor(r.top); y <= Math.ceil(r.bottom); y++) {
      const e = document.elementFromPoint(cx, y);
      if (e && (e === nut || nut.contains(e))) { cur++; if (cur > max) max = cur; }
      else { cur = 0; if (e && !che) che = e.tagName + (e.className ? '.' + e.className : ''); }
    }
    const cy = Math.round(r.top + r.height / 2);
    let rong = 0;
    for (let x = Math.floor(r.left); x <= Math.ceil(r.right); x++) {
      const e = document.elementFromPoint(x, cy);
      if (e && (e === nut || nut.contains(e))) rong++;
    }
    const tr = nut.closest('tr'), tb = nut.closest('table').tBodies[0];
    ra.push({ ma: tb ? tb.id : '?', hop: +r.height.toFixed(1), hopW: +r.width.toFixed(1),
      cham: max, chamRong: rong, che: che,
      cheDo: getComputedStyle(tr).display === 'block' ? 'the' : 'bang',
      dongCao: +tr.getBoundingClientRect().height.toFixed(1) });
  }
  return ra;
})()`;

const RONGS = [1440, 1280, 1200, 1024, 414, 390, 375, 360, 320];
const mayThat = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU });
const arm2 = [];
for (const rong of RONGS) {
  const cr = await moChrome({ url: `http://127.0.0.1:${mayThat.cong}/app.html`, rong, doiMs: 2600 });
  await cr.chay(MO_KD); await cr.doi(1000);
  const nay = await cr.chay(QUET_THAT);
  let gai = null, daGai = null;
  if (GAI_LAI) {
    daGai = await cr.chay(GAI);
    await cr.doi(200);
    gai = await cr.chay(QUET_THAT);
  }
  cr.dong();
  arm2.push({ rong, nay, gai, daGai });
}
mayThat.dong();

console.log('\n─── ARM ② · ỨNG DỤNG THẬT · ' + RONGS.length + ' BỀ NGANG ───');
console.log(' be ngang | nut | che do |    hop    | VUNG CHAM | dong cao | ai che day');
console.log('----------|-----|--------|-----------|-----------|----------|-----------');
let xau2 = 0, tongNut = 0, thieuNut = 0;
for (const h of arm2) {
  if (!h.nay.length) { thieuNut++; console.log(` ${String(h.rong).padStart(8)} |   0 | — KHONG CO NUT NAO — bang khong bi kep?`); continue; }
  const cham = Math.min(...h.nay.map(x => x.cham));
  const chamR = Math.min(...h.nay.map(x => x.chamRong));
  const dat = cham >= 44 && chamR >= 44;
  if (!dat) xau2++;
  tongNut += h.nay.length;
  const che = h.nay.map(x => x.che).find(Boolean) || '—';
  console.log(` ${String(h.rong).padStart(8)} | ${String(h.nay.length).padStart(3)} | ${h.nay[0].cheDo.padEnd(6)} |` +
    ` ${String(h.nay[0].hopW + 'x' + h.nay[0].hop).padStart(9)} | ${dat ? '✅' : '❌'} ${String(chamR).padStart(2)}x${String(cham).padStart(2)} |` +
    ` ${String(h.nay[0].dongCao).padStart(8)} | ${che}`);
}
/* Không có nút nào ở một bề ngang KHÔNG phải "đạt" — nó là phép đo trống, và
   phép đo trống in ra dấu tick chính là cách chốt giả sinh ra. */
if (thieuNut) console.log(`⚠️  ${thieuNut} bề ngang KHÔNG có nút nào để đo — phép đo trống, tính là TRƯỢT.`);

let gaiDo = null;
if (GAI_LAI) {
  console.log('\n─── ARM ② · CA GÀI LẠI (gỡ position/z-index) ───');
  let batDuoc = 0, coTheMac = 0;
  for (const h of arm2) {
    if (!h.gai || !h.gai.length) continue;
    const cham = Math.min(...h.gai.map(x => x.cham));
    const hop = Math.min(...h.gai.map(x => x.hop));
    const laThe = h.gai[0].cheDo === 'the';
    if (laThe) { coTheMac++; if (cham < 44) batDuoc++; }
    console.log(` ${String(h.rong).padStart(8)} | ${h.gai[0].cheDo.padEnd(6)} | sau khi tiem: ${h.daGai}` +
      ` | hop ${hop} | CHAM ${cham} ${laThe ? (cham < 44 ? '← BAT DUOC ✅' : '← LOT ❌') : '(che do bang, khong ky vong do)'}`);
  }
  gaiDo = { bat_duoc: batDuoc, so_muc_che_do_the: coTheMac, dat: coTheMac > 0 && batDuoc === coTheMac };
  console.log(`\nGài lại ở chế độ THẺ: ${batDuoc}/${coTheMac} mức bắt được` +
    (gaiDo.dat ? ' — arm ② CÓ RĂNG ✅' : ' — ARM ② MÙ ĐÚNG CHỖ NÓ SINH RA ĐỂ CANH ❌'));
}

/* ==========================================================================
   CHẤM CHUNG + MÃ THOÁT
   ========================================================================== */
const arm2Dat = xau2 === 0 && thieuNut === 0;
const gaiDat = !GAI_LAI || (gaiDo && gaiDo.dat);
const datHet = !!arm1.dat_het && arm2Dat && gaiDat;

console.log('\n─── KẾT LUẬN ───');
console.log(`ARM ① trang giấy      : ${arm1.dat_het ? '✅ ĐẠT' : '❌ HỎNG'}`);
console.log(`ARM ② ứng dụng thật   : ${arm2Dat ? '✅ ĐẠT' : '❌ HỎNG'} (${tongNut} nút · ${xau2} bề ngang dưới 44px · ${thieuNut} bề ngang trống)`);
if (GAI_LAI) console.log(`ARM ② ca gài lại      : ${gaiDo.dat ? '✅ ĐẠT' : '❌ HỎNG'}`);
if (!arm1.dat_het) {
  for (const [k, v] of Object.entries(arm1)) {
    if (typeof v === 'boolean' && !v && k !== 'dat_het') console.log(`   ❌ arm ① : ${k}`);
  }
}
console.log('\nKET_QUA_JSON=' + JSON.stringify({ dat_het: datHet, arm1, arm2: arm2.map(h => ({
  rong: h.rong, so_nut: h.nay.length,
  che_do: h.nay[0] ? h.nay[0].cheDo : null,
  hop: h.nay[0] ? h.nay[0].hop : null,
  cham: h.nay.length ? Math.min(...h.nay.map(x => x.cham)) : null,
  cham_rong: h.nay.length ? Math.min(...h.nay.map(x => x.chamRong)) : null,
  dong_cao: h.nay[0] ? h.nay[0].dongCao : null
})), gai_lai: gaiDo }));
console.log(datHet ? '\n✅ XANH — 44px cả HỘP lẫn VÙNG CHẠM, ở cả chế độ bảng và chế độ thẻ.'
                   : '\n❌ ĐỎ — xem dòng ❌ ở trên.');
process.exit(datHet ? 0 : 1);
