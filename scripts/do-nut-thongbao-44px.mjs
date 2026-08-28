/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px — các nút trên thanh tiêu đề cửa sổ Chat nội bộ
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY: commit 8909355 của chính kho mã này từng KHAI "mọi nút
   ≥44px" mà đo tay ra 28px và 40px. Khai không phải là đo.

   ĐO NHỮNG GÌ:
     · Các nút mới của CTL-0014 (chuông, Bật thông báo, Để sau, Tắt đẩy…).
     · Hai nút CŨ cùng thanh tiêu đề: "←" (.cnb-lui) và "✕" (.cnb-dong).
       Đo ngày 2026-08-28 trước khi vá: 24 x 29.8px và 24 x 29.1px — dưới
       ngưỡng. Chúng nằm SÁT nút chuông 44px của CTL-0014 nên bấm trượt càng dễ.
     · Chiều cao thanh `.cnb-dau` — nâng nút lên 44px không được làm vỡ bố cục
       cửa sổ chat, nhất là ở `@media (max-width: 480px)`.

   CÁCH ĐO (BH-02): dựng `<iframe>` CÁCH LY hoàn toàn, nạp ĐÚNG file
   `public/assets/css/style.css` đang chạy, đặt bề ngang 375px (iPhone SE), rồi
   đọc `getBoundingClientRect().height` THẬT. KHÔNG khớp chuỗi CSS — khớp chuỗi
   chính là thứ đã để lọt lỗi lần trước.

   CA ĐỐI CHỨNG (BH-16 · BH-26): khung thứ hai nạp CÙNG file CSS nhưng đã GỠ
   đúng các luật `min-height: 44px` của đợt này (máy chủ cắt bằng regex khi phục
   vụ). Đó là lệch CƠ HỌC — xoá hẳn câu lệnh, hỏng với mọi đầu vào. Khung đó
   BẮT BUỘC phải đo ra dưới 44px; nếu nó cũng ≥44px thì phép đo vô dụng.
   Mỗi phép gỡ đều được KIỂM là có thật (xem `go()` bên dưới): regex trượt →
   bản đối chứng y hệt bản vá → phép đo vô dụng mà không ai hay.

   Khung thứ ba: cùng bản vá nhưng bề ngang 320px (máy hẹp nhất còn dùng thật) —
   canh tràn ngang và chiều cao thanh tiêu đề.

   Chạy:  node scripts/do-nut-thongbao-44px.mjs
          rồi mở http://127.0.0.1:8917  (hoặc để Agent lái trình duyệt)
   Trang tự in JSON kết quả vào `window.KET_QUA` để đọc bằng máy.
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8');

/* Gỡ ĐÚNG các luật vá → trả CSS về trạng thái "chưa ai nghĩ tới ngón tay":
   nút trở về kích thước tự nhiên theo cỡ chữ.
   `go()` bắt buộc regex phải khớp thật; trượt một phát là dừng hẳn, vì bản đối
   chứng lặng lẽ giống hệt bản vá thì cả phép đo thành vô nghĩa (BH-16). */
function go(css, tim, thay, ten) {
  const sau = css.replace(tim, thay);
  if (sau === css) {
    console.error(`HỎNG: không gỡ được luật "${ten}" khỏi CSS — regex trượt.\n` +
      'Ca đối chứng sẽ giống hệt bản vá, phép đo thành vô dụng. Sửa regex rồi chạy lại.');
    process.exit(1);
  }
  return sau;
}

let CSS_CHUA_VA = CSS;
CSS_CHUA_VA = go(CSS_CHUA_VA, /\.cnb-chuong \{[^}]*\}/,
  '.cnb-chuong { background:none; border:none; cursor:pointer; font-size:17px; line-height:1; padding:4px 8px; }',
  '.cnb-chuong');
CSS_CHUA_VA = go(CSS_CHUA_VA, /\.tbd-nut \{[^}]*\}/,
  '.tbd-nut { padding:2px 8px; border:1px solid #ccc; border-radius:10px; font-size:13px; }',
  '.tbd-nut');
CSS_CHUA_VA = go(CSS_CHUA_VA, /\.tbd-dong \{[^}]*\}/,
  '.tbd-dong { display:flex; align-items:center; gap:10px; font-size:13px; }',
  '.tbd-dong');
/* Nguyên văn luật cũ của hai nút "←" và "✕" trước khi vá — chép từ chính file
   này ở commit b1f2331, không phải tự nghĩ ra. */
CSS_CHUA_VA = go(CSS_CHUA_VA, /\.cnb-lui, \.cnb-dong \{[^}]*\}/,
  '.cnb-lui, .cnb-dong { background:none; border:none; cursor:pointer; ' +
  'font-size:16px; padding:4px 8px; border-radius:8px; flex-shrink:0; line-height:1; }',
  '.cnb-lui, .cnb-dong');

/* Đánh dấu HTML lấy ĐÚNG theo `public/app.html` (khối `#cnbPopup` của
   CTL-0014) — sai cấu trúc cha là số đo vô nghĩa. */
const KHUNG = (css) => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style></head><body style="margin:0">
<div class="cnb-widget">
  <div class="cnb-popup" id="cnbPopup" style="position:static;width:auto;height:auto;max-height:none">
    <div class="cnb-dau" id="cnbDau">
      <button type="button" class="cnb-lui" id="cnbLui" title="Về kênh chung">←</button>
      <div class="cnb-dau-ten" id="cnbTen"><span>💬 Phạm Khương Duy</span><span class="sm">Chat riêng</span></div>
      <button type="button" class="cnb-chuong" id="cnbChuong">🔔</button>
      <button type="button" class="cnb-dong" id="cnbDong">✕</button>
      <!-- Bẫy "display" vs "[hidden]": trong app.html nút "←" và nút chuông đều
           mang thuộc tính hidden, mà luật vá lại đặt display:flex. Chốt toàn cục
           [hidden]{display:none!important} (dòng 31 của style.css) phải thắng.
           Hai nút dưới đây là ca thử: chúng PHẢI đo ra 0px và computed display
           là "none". Chốt đó mà bị xoá thì chúng hiện ra, phép đo bắt được ngay. -->
      <button type="button" class="cnb-lui"    id="cnbLuiAn"    hidden>←</button>
      <button type="button" class="cnb-chuong" id="cnbChuongAn" hidden>🔔</button>
    </div>
    <div class="tbd-moi" id="tbdMoi">
      <div class="tbd-moi-chu">Bật thông báo để biết có tin nhắn kể cả khi đã đóng ERP?
        Chỉ hiện TÊN người gửi, không hiện nội dung tin.</div>
      <div class="tbd-moi-nut">
        <button type="button" class="tbd-nut tbd-nut-chinh" id="tbdBat">Bật thông báo</button>
        <button type="button" class="tbd-nut" id="tbdDeSau">Để sau</button>
      </div>
    </div>
    <div class="tbd-caidat" id="tbdCaiDat">
      <label class="tbd-dong" id="tbdDong"><input type="checkbox"><span>Báo khi có tin nhắn riêng</span></label>
      <p class="tbd-ghichu">Đang bật. Đóng ERP rồi vẫn nhận được tin nhắn trên điện thoại.</p>
      <button type="button" class="tbd-nut" id="tbdTatMay">Tắt đẩy trên máy này</button>
    </div>
  </div>
</div>
</body></html>`;

const NUT_JSON = JSON.stringify([
  ['← về kênh chung',   '#cnbLui'],
  ['✕ đóng chat',       '#cnbDong'],
  ['🔔 chuông cài đặt', '#cnbChuong'],
  ['Bật thông báo',     '#tbdBat'],
  ['Để sau',            '#tbdDeSau'],
  ['Tắt đẩy trên máy này', '#tbdTatMay'],
  ['dòng bật/tắt tin nhắn', '#tbdDong']
]);

/* Trần chiều cao thanh tiêu đề = 44 (nút) + 14 + 14 (padding `.cnb-dau`)
   + 1 (border-bottom, `getBoundingClientRect` có tính viền) = 73px. Đó là
   ĐÚNG BẰNG số đo được, cố ý không cho dư: nở thêm dù 1px cũng là có thứ khác
   đẩy thanh cao lên và phải xem lại. Cửa sổ chat chỉ cao 500px — thanh tiêu đề
   nuốt thêm là mất chỗ đọc tin.
   Mốc: trước khi vá thanh cao 67.7px, sau khi vá 73px — nở 5.3px. */
const TRAN_THANH_DAU = 73;

const TRANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Đo 44px — thanh tiêu đề Chat nội bộ</title></head><body style="font:13px monospace;margin:12px">
<h3>Chiều cao nút THẬT — khung 1&2 ở 375px (iPhone SE), khung 3 ở 320px</h3>
<div>
  <iframe id="sau"   src="/khung?va=1" width="375" height="420" style="border:1px solid #ccc"></iframe>
  <iframe id="truoc" src="/khung?va=0" width="375" height="420" style="border:1px solid #ccc"></iframe>
  <iframe id="hep"   src="/khung?va=1" width="320" height="420" style="border:1px solid #ccc"></iframe>
</div>
<pre id="kq">đang đo…</pre>
<script>
const NUT = ${NUT_JSON};
const TRAN_THANH_DAU = ${TRAN_THANH_DAU};
function doKhung(id, be) {
  const d = document.getElementById(id).contentDocument;
  const r = {};
  for (const [ten, sel] of NUT) {
    const e = d.querySelector(sel);
    const o = e ? e.getBoundingClientRect() : null;
    r[ten] = { cao: o ? Math.round(o.height * 10) / 10 : null,
               rong: o ? Math.round(o.width * 10) / 10 : null };
  }
  const dau = d.querySelector('#cnbDau');
  const ten = d.querySelector('#cnbTen');
  // Ca thử [hidden]: nút mang hidden phải TÀNG HÌNH dù luật vá đặt display:flex.
  r._an_dung_khi_hidden = ['#cnbLuiAn', '#cnbChuongAn'].every((sel) => {
    const e = d.querySelector(sel);
    if (!e) return false;
    const cs = d.defaultView.getComputedStyle(e);
    return cs.display === 'none' && e.getBoundingClientRect().height === 0;
  });
  r._thanh_dau_cao = dau ? Math.round(dau.getBoundingClientRect().height * 10) / 10 : null;
  r._o_ten_rong    = ten ? Math.round(ten.getBoundingClientRect().width * 10) / 10 : null;
  // Tràn ngang phải đo TRONG khung, không đo trang bao ngoài.
  r._tran_ngang = d.documentElement.scrollWidth > be + 1;
  return r;
}
function ve() {
  const sau = doKhung('sau', 375), truoc = doKhung('truoc', 375), hep = doKhung('hep', 320);
  const dong = [];
  let datHet = true, doiChungHetHieuLuc = false;
  for (const [ten] of NUT) {
    const a = sau[ten].cao, b = truoc[ten].cao, c = hep[ten].cao;
    const dat = a !== null && a >= 44 && c !== null && c >= 44;
    const dcHong = b !== null && b >= 44;   // bản KHÔNG vá mà vẫn ≥44 = phép đo vô dụng
    if (!dat) datHet = false;
    if (dcHong) doiChungHetHieuLuc = true;
    dong.push((dat ? '  DAT ' : '  HONG') + ' | ' + ten.padEnd(24) +
      ' co va: ' + String(a).padStart(6) + 'px  (320px: ' + String(c).padStart(6) +
      'px)   doi chung (go luat): ' + String(b).padStart(6) + 'px');
  }
  // Bo cuc: thanh tieu de khong duoc cao qua tran, va o ten khong duoc bop het.
  const boCucOk = sau._thanh_dau_cao !== null && sau._thanh_dau_cao <= TRAN_THANH_DAU
    && hep._thanh_dau_cao !== null && hep._thanh_dau_cao <= TRAN_THANH_DAU
    && sau._o_ten_rong > 80 && hep._o_ten_rong > 80
    && !sau._tran_ngang && !hep._tran_ngang;
  const anDung = sau._an_dung_khi_hidden && hep._an_dung_khi_hidden;
  const kq = {
    dat_het: datHet,
    doi_chung_con_hieu_luc: !doiChungHetHieuLuc,
    bo_cuc_con_nguyen: boCucOk,
    an_dung_khi_hidden: anDung,
    thanh_dau: { va_375: sau._thanh_dau_cao, va_320: hep._thanh_dau_cao,
                 chua_va_375: truoc._thanh_dau_cao, tran: TRAN_THANH_DAU },
    o_ten_rong: { va_375: sau._o_ten_rong, va_320: hep._o_ten_rong },
    tran_ngang: { va_375: sau._tran_ngang, va_320: hep._tran_ngang },
    chi_tiet: sau
  };
  window.KET_QUA = kq;
  document.getElementById('kq').textContent =
    'Nguong 44px (WCAG 2.5.5 / Apple HIG)\\n' + dong.join('\\n') +
    '\\n\\nThanh .cnb-dau cao : co va 375px=' + sau._thanh_dau_cao +
      'px | co va 320px=' + hep._thanh_dau_cao +
      'px | chua va=' + truoc._thanh_dau_cao + 'px | tran=' + TRAN_THANH_DAU + 'px' +
    '\\nO ten con rong     : 375px=' + sau._o_ten_rong + 'px | 320px=' + hep._o_ten_rong + 'px' +
    '\\nTran ngang         : 375px=' + (sau._tran_ngang ? 'CO - HONG' : 'khong') +
      ' | 320px=' + (hep._tran_ngang ? 'CO - HONG' : 'khong') +
    '\\nTat ca >= 44px     : ' + (datHet ? 'DAT' : 'HONG') +
    '\\nBo cuc con nguyen  : ' + (boCucOk ? 'DAT' : 'HONG') +
    '\\nNut co [hidden] van an: ' + (anDung ? 'DAT' : 'HONG - display:flex da de bep [hidden]') +
    '\\nDoi chung con nhay : ' + (!doiChungHetHieuLuc ? 'CO (ban khong va do ra <44px)' : 'KHONG - PHEP DO VO DUNG') +
    '\\n\\nKET_QUA_JSON=' + JSON.stringify(kq);
}
let xong = 0;
for (const id of ['sau', 'truoc', 'hep']) {
  document.getElementById(id).addEventListener('load', () => { if (++xong === 3) setTimeout(ve, 60); });
}
</script></body></html>`;

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/khung') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(KHUNG(u.searchParams.get('va') === '1' ? CSS : CSS_CHUA_VA));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(TRANG);
}).listen(8917, '127.0.0.1', () => {
  console.log('Đo nút thanh tiêu đề Chat — mở http://127.0.0.1:8917');
});
