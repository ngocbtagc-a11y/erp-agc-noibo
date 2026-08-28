/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px — các nút mới của CTL-0014
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY: commit 8909355 của chính kho mã này từng KHAI "mọi nút
   ≥44px" mà đo tay ra 28px và 40px. Khai không phải là đo.

   CÁCH ĐO (BH-02): dựng `<iframe>` CÁCH LY hoàn toàn, nạp ĐÚNG file
   `public/assets/css/style.css` đang chạy, đặt bề ngang 375px (iPhone SE), rồi
   đọc `getBoundingClientRect().height` THẬT. KHÔNG khớp chuỗi CSS — khớp chuỗi
   chính là thứ đã để lọt lỗi lần trước.

   CA ĐỐI CHỨNG (BH-16 · BH-26): khung thứ hai nạp CÙNG file CSS nhưng đã GỠ
   đúng các luật `min-height: 44px` của đợt này (máy chủ cắt bằng regex khi phục
   vụ). Đó là lệch CƠ HỌC — xoá hẳn câu lệnh, hỏng với mọi đầu vào. Khung đó
   BẮT BUỘC phải đo ra dưới 44px; nếu nó cũng ≥44px thì phép đo vô dụng.

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

/* Gỡ ĐÚNG ba luật vá của CTL-0014 → trả CSS về trạng thái "chưa ai nghĩ tới
   ngón tay": nút trở về kích thước tự nhiên theo cỡ chữ. */
const CSS_CHUA_VA = CSS
  .replace(/\.cnb-chuong \{[^}]*\}/,
    '.cnb-chuong { background:none; border:none; cursor:pointer; font-size:17px; line-height:1; padding:4px 8px; }')
  .replace(/\.tbd-nut \{[^}]*\}/,
    '.tbd-nut { padding:2px 8px; border:1px solid #ccc; border-radius:10px; font-size:13px; }')
  .replace(/\.tbd-dong \{[^}]*\}/,
    '.tbd-dong { display:flex; align-items:center; gap:10px; font-size:13px; }');

/* Đánh dấu HTML lấy ĐÚNG theo `public/app.html` (khối `#cnbPopup` của
   CTL-0014) — sai cấu trúc cha là số đo vô nghĩa. */
const KHUNG = (css) => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style></head><body style="margin:0">
<div class="cnb-widget">
  <div class="cnb-popup" style="position:static;width:auto;height:auto;max-height:none">
    <div class="cnb-dau">
      <button type="button" class="cnb-lui" title="Về kênh chung">←</button>
      <div class="cnb-dau-ten"><span>💬 Phạm Khương Duy</span><span class="sm">Chat riêng</span></div>
      <button type="button" class="cnb-chuong" id="cnbChuong">🔔</button>
      <button type="button" class="cnb-dong">✕</button>
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
  ['🔔 chuông cài đặt', '#cnbChuong'],
  ['Bật thông báo',     '#tbdBat'],
  ['Để sau',            '#tbdDeSau'],
  ['Tắt đẩy trên máy này', '#tbdTatMay'],
  ['dòng bật/tắt tin nhắn', '#tbdDong']
]);

const TRANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Đo 44px — CTL-0014</title></head><body style="font:13px monospace;margin:12px">
<h3>Chiều cao nút THẬT ở bề ngang 375px (iPhone SE)</h3>
<div>
  <iframe id="sau"   src="/khung?va=1" width="375" height="420" style="border:1px solid #ccc"></iframe>
  <iframe id="truoc" src="/khung?va=0" width="375" height="420" style="border:1px solid #ccc"></iframe>
</div>
<pre id="kq">đang đo…</pre>
<script>
const NUT = ${NUT_JSON};
function doKhung(id) {
  const d = document.getElementById(id).contentDocument;
  const r = {};
  for (const [ten, sel] of NUT) {
    const e = d.querySelector(sel);
    const h = e ? e.getBoundingClientRect().height : null;
    const w = e ? e.getBoundingClientRect().width : null;
    r[ten] = { cao: h == null ? null : Math.round(h * 10) / 10,
               rong: w == null ? null : Math.round(w * 10) / 10 };
  }
  // Tràn ngang phải đo TRONG khung 375px, không đo trang bao ngoài.
  r._tran_ngang = d.documentElement.scrollWidth > 375 + 1;
  return r;
}
function ve() {
  const sau = doKhung('sau'), truoc = doKhung('truoc');
  const dong = [];
  let datHet = true, doiChungHetHieuLuc = false;
  for (const [ten] of NUT) {
    const a = sau[ten].cao, b = truoc[ten].cao;
    const dat = a !== null && a >= 44;
    const dcHong = b !== null && b >= 44;   // bản KHÔNG vá mà vẫn ≥44 = phép đo vô dụng
    if (!dat) datHet = false;
    if (dcHong) doiChungHetHieuLuc = true;
    dong.push((dat ? '  DAT ' : '  HONG') + ' | ' + ten.padEnd(26) +
      ' co va: ' + String(a).padStart(6) + 'px   doi chung (go luat): ' + String(b).padStart(6) + 'px');
  }
  const kq = {
    dat_het: datHet,
    doi_chung_con_hieu_luc: !doiChungHetHieuLuc,
    tran_ngang_375: sau._tran_ngang,
    chi_tiet: sau
  };
  window.KET_QUA = kq;
  document.getElementById('kq').textContent =
    'Nguong 44px (WCAG 2.5.5 / Apple HIG)\\n' + dong.join('\\n') +
    '\\n\\nTran ngang o 375px: ' + (sau._tran_ngang ? 'CO - HONG' : 'khong') +
    '\\nTat ca >= 44px      : ' + (datHet ? 'DAT' : 'HONG') +
    '\\nDoi chung con nhay  : ' + (!doiChungHetHieuLuc ? 'CO (ban khong va do ra <44px)' : 'KHONG - PHEP DO VO DUNG') +
    '\\n\\nKET_QUA_JSON=' + JSON.stringify(kq);
}
let xong = 0;
for (const id of ['sau', 'truoc']) {
  document.getElementById(id).addEventListener('load', () => { if (++xong === 2) setTimeout(ve, 60); });
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
  console.log('Đo nút CTL-0014 — mở http://127.0.0.1:8917');
});
