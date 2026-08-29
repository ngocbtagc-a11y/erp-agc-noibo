/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px — MÀN GÓP Ý (duyệt trên điện thoại)
   ---------------------------------------------------------------------------
   Sếp Ngọc chốt 28/08/2026: Sếp là NGƯỜI DUY NHẤT duyệt góp ý ở cấp cuối, và
   "tao duyệt đt cũng được". Điện thoại là ĐƯỜNG CHÍNH, không phải đường phụ:
   bấm trượt ở đây là cả hàng góp ý của công ty đứng lại.

   CÁCH ĐO (BH-02): `<iframe>` cách ly, nạp ĐÚNG `public/assets/css/style.css`
   đang chạy, đặt bề ngang 375px (iPhone SE/13 mini), đọc
   `getBoundingClientRect().height` THẬT. KHÔNG khớp chuỗi CSS — commit trước
   của tính năng khác đã tự khai "44px" mà đo tay ra 28px và 40px.

   ĐÁNH DẤU lấy ĐÚNG theo `veTheGopY`/`veTheHoanTac` trong
   `public/assets/js/app.js` và `#gy-choduyet-panel` trong `public/app.html`.

   CA ĐỐI CHỨNG (BH-16): khung thứ hai nạp CÙNG file CSS nhưng ĐÃ GỠ đúng ba
   luật vá của lần này (trả về nguyên trạng trước khi sửa: min-height 40px,
   ô chọn 18px, nút duyệt lô không có min-height). Khung đó PHẢI đo ra dưới
   44px — nếu nó cũng đạt thì phép đo vô dụng.

   Chạy:  node scripts/do-nut-gopy-44px.mjs     (mở http://127.0.0.1:8901)
   Con số kết luận nằm ở dòng `KET_LUAN` cuối trang.
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8');

/* Gỡ ĐÚNG ba luật vá 28/08/2026 → CSS trở về nguyên trạng trước khi sửa. */
const CSS_CHUA_VA = CSS
  .replace(/\.gy-the-nut > button \{[^}]*\}/, '.gy-the-nut > button { min-height: 40px; flex: 1 1 auto; }')
  .replace(/\.gy-the-chon \{[^}]*\}/, '.gy-the-chon { display: flex; align-items: center; margin: 0; }')
  .replace(/\.gy-the-chon input \{[^}]*\}/, '.gy-the-chon input { width: 18px; height: 18px; }')
  .replace(/#gy-duyetlo \{[^}]*\}/, '');

const KHUNG = (css) => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style></head><body>
<div class="panel" id="gy-choduyet-panel">
  <div class="panel-head">
    <h4 id="gy-choduyet-tieude">Chờ tôi duyệt (3)</h4>
    <button type="button" class="btn-nho" id="gy-duyetlo" style="width:auto">Duyệt các mục đã chọn</button>
  </div>
  <div class="gy-the-ds" id="gy-choduyet-ds">
    <div class="gy-the" data-id="2">
      <div class="gy-the-dau">
        <label class="gy-the-chon"><input type="checkbox" class="gy-chon" value="2"></label>
        <span class="sm">GY-0002</span><span class="tag warn">Trung bình</span></div>
      <div class="nm gy-the-ten">Quét QR ở kho chậm, mỗi đơn mất 4 giây</div>
      <div class="sm"><span class="tag mute">Chờ duyệt</span> · Chờ: Sếp · 1 ngày trước</div>
      <div class="sm">Nguyễn Văn An — Kho vận</div>
      <div class="gy-the-nut">
        <button type="button" class="btn-primary btn-nho" data-gyduyet="2">Duyệt</button>
        <button type="button" class="btn-phu btn-nho" data-gyxem="2">Xem / Chưa duyệt</button>
      </div>
    </div>
  </div>
  <div class="form-loi" id="gy-duyet-loi"></div>
</div>
<div class="panel" id="gy-hoantac-panel">
  <div class="panel-head"><h4>Vừa xử lý xong</h4></div>
  <div class="gy-the-ds" id="gy-hoantac-ds">
    <div class="gy-the" data-id="2">
      <div class="gy-the-dau"><span class="sm">GY-0002</span><span class="tag ok">Đã duyệt — chờ phân tích</span></div>
      <div class="nm gy-the-ten">Quét QR ở kho chậm, mỗi đơn mất 4 giây</div>
      <div class="sm">Bạn vừa xử lý — bấm nhầm thì hoàn lại được trong 15 phút.</div>
      <div class="gy-the-nut">
        <button type="button" class="btn-phu btn-nho" data-gyhoantac="2">↩︎ Hoàn tác</button>
      </div>
    </div>
  </div>
</div>
</body></html>`;

const TRANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Đo ngưỡng 44px — màn Góp ý</title></head><body style="font:13px monospace;margin:12px">
<h3>Chiều cao nút thật ở bề ngang 375px (màn Góp ý)</h3>
<iframe id="sau"   src="/khung?va=1" width="375" height="520" style="border:1px solid #ccc"></iframe>
<iframe id="truoc" src="/khung?va=0" width="375" height="520" style="border:1px solid #ccc"></iframe>
<pre id="kq">đang đo…</pre>
<script>
const NUT = [
  ['Duyệt (1 chạm)',   '[data-gyduyet]'],
  ['Xem / Chưa duyệt', '[data-gyxem]'],
  ['Hoàn tác',         '[data-gyhoantac]'],
  ['Duyệt hàng loạt',  '#gy-duyetlo'],
  ['Ô chọn để duyệt lô', '.gy-the-chon']
];
function do_(id) {
  const d = document.getElementById(id).contentDocument;
  return NUT.map(([ten, sel]) => {
    const e = d.querySelector(sel);
    const r = e ? e.getBoundingClientRect() : null;
    return { ten, cao: r ? Math.round(r.height * 10) / 10 : null,
                   rong: r ? Math.round(r.width * 10) / 10 : null };
  });
}
function veKetQua() {
  const sau = do_('sau'), truoc = do_('truoc');
  const d = document.getElementById('sau').contentDocument.documentElement;
  const tranNgang = d.scrollWidth > d.clientWidth;
  const dong = sau.map((s, i) =>
    \`\${s.ten.padEnd(22)} CHƯA VÁ \${String(truoc[i].cao).padStart(5)}px  →  ĐÃ VÁ \${String(s.cao).padStart(5)}px ×\${String(s.rong).padStart(6)}px  \${s.cao >= 44 ? 'ĐẠT' : 'TRƯỢT'}\`);
  const datHet   = sau.every(s => s.cao >= 44);
  const doiChung = truoc.filter(t => t.cao < 44).length;
  document.getElementById('kq').textContent =
    dong.join('\\n') +
    \`\\n\\nKET_LUAN dat=\${datHet} doi_chung_bat_duoc=\${doiChung}/\${NUT.length} tran_ngang=\${tranNgang}\`;
}
addEventListener('load', () => setTimeout(veKetQua, 200));
</script></body></html>`;

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/khung') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(KHUNG(u.searchParams.get('va') === '1' ? CSS : CSS_CHUA_VA));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(TRANG);
}).listen(8901, '127.0.0.1', () => console.log('Bàn đo 44px màn Góp ý: http://127.0.0.1:8901'));
