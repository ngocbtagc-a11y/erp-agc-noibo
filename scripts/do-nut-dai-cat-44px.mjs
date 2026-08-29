/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px — nút của DẢI CẮT và DẢI PHẠM VI
   ---------------------------------------------------------------------------
   Chạy:  npm run do-nut-dai-cat        rồi mở http://127.0.0.1:8919

   ĐO CÁI GÌ: hai nút mới thêm khi xử góp ý chị Vũ Lan Hương —
     · "Xem việc toàn công ty"          (`.cv-pham-vi .dai-cat-nut`)
     · "Xem đầy đủ ở Lịch sử làm việc"  (`.dai-cat .dai-cat-nut`)

   VÌ SAO PHẢI ĐO: commit 8909355 của chính kho mã này từng KHAI "mọi nút
   ≥44px" mà đo tay ra 28px. Khai không phải là đo (BH-16).

   CÁCH ĐO (BH-02): `<iframe>` cách ly, nạp ĐÚNG `public/assets/css/style.css`
   đang chạy, bề ngang 375px (iPhone SE) và 320px (máy hẹp nhất còn dùng thật),
   rồi đọc `getBoundingClientRect()` THẬT. KHÔNG khớp chuỗi CSS — khớp chuỗi
   chính là thứ đã để lọt lỗi lần trước.

   CA ĐỐI CHỨNG (BH-16): khung thứ ba nạp CÙNG file CSS nhưng đã GỠ đúng luật
   `min-height: 44px` của `.dai-cat-nut`. Đó là lệch CƠ HỌC. Khung đó BẮT BUỘC
   phải đo ra <44px; nếu nó cũng ≥44px thì phép đo vô dụng và phải TRƯỢT.
   `go()` kiểm regex có khớp thật — trượt một phát là dừng với mã lỗi 2, vì bản
   đối chứng lặng lẽ giống hệt bản vá thì cả phép đo thành vô nghĩa.

   Trang tự in JSON vào `window.KET_QUA` để đọc bằng máy.
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8');

function go(css, tim, thay, ten) {
  const sau = css.replace(tim, thay);
  if (sau === css) {
    console.error(`HỎNG: không gỡ được luật "${ten}" khỏi CSS — regex trượt.\n` +
      'Ca đối chứng sẽ giống hệt bản vá, phép đo thành vô dụng. Sửa regex rồi chạy lại.');
    process.exit(2);
  }
  return sau;
}

/* Trả `.dai-cat-nut` về "chưa ai nghĩ tới ngón tay": cỡ tự nhiên theo cỡ chữ. */
const CSS_CHUA_VA = go(CSS, /\.dai-cat-nut \{[^}]*\}/,
  '.dai-cat-nut { padding: 2px 8px; border: 1px solid #ccc; border-radius: 12px; font-size: 13.5px; }',
  '.dai-cat-nut');

/* Đánh dấu HTML chép ĐÚNG theo `public/app.html` + đúng chuỗi mà `veDaiCat()`
   sinh ra (`public/assets/js/app.js`) — sai cấu trúc cha là số đo vô nghĩa. */
const KHUNG = (css) => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style></head><body style="margin:0;padding:8px">
<div class="cv-pham-vi">
  <span class="cv-pham-vi-chu">Ba bảng dưới đây chỉ hiện <b>việc liên quan trực tiếp tới bạn</b> (bạn nhận · bạn được mời phối hợp · bạn giao). Việc của người khác không nằm ở đây.</span>
  <button type="button" class="dai-cat-nut" id="nutPhamVi" data-dai-cat-tab="lichsuviec">Xem việc toàn công ty</button>
</div>
<div class="dai-cat" id="daiCat">
  <span class="dai-cat-chu">✂️ Đang hiện <b>300</b> trong tổng <b>523</b> việc — còn <b>223</b> việc chưa hiện ở đây.</span>
  <button type="button" class="dai-cat-nut" id="nutXemThem" data-dai-cat-tab="lichsuviec">Xem đầy đủ ở Lịch sử làm việc</button>
</div>
<div class="dai-cat" id="daiCatAn" hidden></div>
</body></html>`;

const NUT_JSON = JSON.stringify([
  ['Xem việc toàn công ty', '#nutPhamVi'],
  ['Xem đầy đủ ở Lịch sử',  '#nutXemThem']
]);

const TRANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Đo 44px — nút dải cắt</title></head><body style="font:13px monospace;margin:12px">
<h3>Chiều cao nút THẬT — khung 1 ở 375px, khung 2 ở 320px, khung 3 = đối chứng (gỡ luật)</h3>
<div>
  <iframe id="rong" src="/khung?va=1" width="375" height="300" style="border:1px solid #ccc"></iframe>
  <iframe id="hep"  src="/khung?va=1" width="320" height="300" style="border:1px solid #ccc"></iframe>
  <iframe id="dc"   src="/khung?va=0" width="375" height="300" style="border:1px solid #ccc"></iframe>
</div>
<pre id="kq">đang đo…</pre>
<script>
const NUT = ${NUT_JSON};
function doKhung(id, be) {
  const d = document.getElementById(id).contentDocument;
  const r = {};
  for (const [ten, sel] of NUT) {
    const e = d.querySelector(sel);
    const o = e ? e.getBoundingClientRect() : null;
    r[ten] = { cao: o ? Math.round(o.height * 10) / 10 : null,
               rong: o ? Math.round(o.width * 10) / 10 : null };
  }
  // Dải mang [hidden] PHẢI tàng hình: .dai-cat đặt display:flex, chốt toàn
  // cục [hidden]{display:none!important} phải thắng, nếu không thì mọi màn
  // KHÔNG bị cắt vẫn hiện một dải trống.
  const an = d.querySelector('#daiCatAn');
  const cs = an ? d.defaultView.getComputedStyle(an) : null;
  r._an_dung_khi_hidden = !!cs && cs.display === 'none' && an.getBoundingClientRect().height === 0;
  r._tran_ngang = d.documentElement.scrollWidth > be + 1;
  return r;
}
function ve() {
  const rong = doKhung('rong', 375), hep = doKhung('hep', 320), dc = doKhung('dc', 375);
  const dong = [];
  let datHet = true, dcHongHet = false;
  for (const [ten] of NUT) {
    const a = rong[ten].cao, c = hep[ten].cao, b = dc[ten].cao;
    const dat = a !== null && a >= 44 && c !== null && c >= 44;
    if (!dat) datHet = false;
    if (b !== null && b >= 44) dcHongHet = true;
    dong.push((dat ? '  DAT ' : '  HONG') + ' | ' + ten.padEnd(24) +
      ' 375px: ' + String(a).padStart(6) + 'px   320px: ' + String(c).padStart(6) +
      'px   doi chung (go luat): ' + String(b).padStart(6) + 'px');
  }
  const anDung = rong._an_dung_khi_hidden && hep._an_dung_khi_hidden;
  const khongTran = !rong._tran_ngang && !hep._tran_ngang;
  const kq = { dat_het: datHet, doi_chung_con_hieu_luc: !dcHongHet,
               an_dung_khi_hidden: anDung, khong_tran_ngang: khongTran, chi_tiet: rong };
  window.KET_QUA = kq;
  document.getElementById('kq').textContent =
    'Nguong 44px (WCAG 2.5.5 / Apple HIG)\\n' + dong.join('\\n') +
    '\\n\\nDai [hidden] van an : ' + (anDung ? 'DAT' : 'HONG - display:flex de bep [hidden]') +
    '\\nKhong tran ngang    : ' + (khongTran ? 'DAT' : 'HONG') +
    '\\nTat ca >= 44px      : ' + (datHet ? 'DAT' : 'HONG') +
    '\\nDoi chung con nhay  : ' + (!dcHongHet ? 'CO (ban khong va do ra <44px)' : 'KHONG - PHEP DO VO DUNG') +
    '\\n\\nKET_QUA_JSON=' + JSON.stringify(kq);
}
let xong = 0;
for (const id of ['rong', 'hep', 'dc']) {
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
}).listen(8919, '127.0.0.1', () => {
  console.log('Đo nút dải cắt — mở http://127.0.0.1:8919');
});
