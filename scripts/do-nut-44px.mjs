/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px — REV-0019 L7
   ---------------------------------------------------------------------------
   Commit 8909355 KHAI "điện thoại một tay mọi dòng ≥44px" mà KHÔNG có phép đo
   nào — bàn thử cũ `tu-kiem-nhac-cong-viec.mjs` không có một dòng nào về CSS.
   Hồ Ly đo tay ra 28px và 40px. File này là phép tự kiểm còn thiếu.

   CÁCH ĐO (BH-02): dựng `<iframe>` CÁCH LY hoàn toàn, nạp ĐÚNG file
   `public/assets/css/style.css` đang chạy, đặt bề ngang 375px, rồi đọc
   `getBoundingClientRect().height` THẬT của từng nút. Không khớp chuỗi CSS —
   khớp chuỗi chính là thứ đã để lọt lỗi này lần trước.

   CA ĐỐI CHỨNG (BH-16): khung thứ hai nạp CÙNG file CSS nhưng ĐÃ GỠ đúng hai
   luật vá của REV-0019 (server cắt bằng regex khi phục vụ). Khung đó PHẢI đo
   ra dưới 44px — nếu nó cũng ≥44px thì phép đo vô dụng.

   Chạy:  node scripts/do-nut-44px.mjs        (mở http://127.0.0.1:8899)
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8');

/* Gỡ ĐÚNG hai luật vá REV-0019 → trả CSS về đúng trạng thái commit 8909355. */
const CSS_CHUA_VA = CSS
  .replace(/\.cv-nut-ghinhan \{[^}]*\}/, '.cv-nut-ghinhan { width: 100%; min-height: 40px; margin-top: 8px; }')
  .replace(/\.cv-homnay \.panel-head \.btn-nho \{[^}]*\}/, '');

/* Đánh dấu HTML lấy ĐÚNG theo `public/app.html` + `public/assets/js/app.js`:
   nút 🔔 nằm trong `.panel.cv-homnay > .panel-head`, nút ⭐ là
   `button.btn-nho.btn-primary.cv-nut-ghinhan` trong `.cv-dong-the`. */
const KHUNG = (css) => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style></head><body>
<div class="panel cv-homnay" id="cv-homnay-panel">
  <div class="panel-head">
    <h4>📋 Việc của tôi hôm nay</h4>
    <button type="button" class="btn-nho" id="cv-nhactat-nut">🔔 Đang nhận nhắc việc</button>
  </div>
  <div class="panel-body"></div>
</div>
<div class="cv-hai-bang"><div class="panel"><div class="panel-body">
  <div class="cv-dong-the">
    <div class="nm">Nhân viên kho 1 <span class="tag sage">đúng hạn</span></div>
    <div class="sm">“Kiểm kê lô hạt điều nhập khẩu”</div>
    <button type="button" class="btn-nho btn-primary cv-nut-ghinhan">⭐ Ghi nhận</button>
  </div>
</div></div></div>
<button type="button" class="cv-dong qua-han" style="display:flex">
  <span class="cv-dong-ten">Đối chiếu tồn kho Shopee</span>
  <span class="cv-dong-phu">trễ 1 ngày</span>
</button>
</body></html>`;

const TRANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Đo ngưỡng 44px — REV-0019 L7</title></head><body style="font:14px monospace;margin:12px">
<h3>Đo chiều cao nút thật ở bề ngang 375px</h3>
<iframe id="sau"   src="/khung?va=1" width="375" height="420" style="border:1px solid #ccc"></iframe>
<iframe id="truoc" src="/khung?va=0" width="375" height="420" style="border:1px solid #ccc"></iframe>
<pre id="kq">đang đo…</pre>
<script>
const NUT = [
  ['🔔 bật/tắt nhắc', '#cv-nhactat-nut'],
  ['⭐ Ghi nhận',      '.cv-nut-ghinhan'],
  ['dòng việc',        '.cv-dong']
];
function do_(id) {
  const d = document.getElementById(id).contentDocument;
  return NUT.map(([ten, sel]) => {
    const e = d.querySelector(sel);
    return { ten, cao: e ? Math.round(e.getBoundingClientRect().height * 10) / 10 : null };
  });
}
function veKetQua() {
  const sau = do_('sau'), truoc = do_('truoc');
  // Tràn ngang phải đo TRONG khung 375px, không đo trang bao ngoài (trang bao
  // xếp hai khung cạnh nhau nên đương nhiên rộng hơn — đo nhầm chỗ là ra một
  // con số đáng sợ mà vô nghĩa).
  const d = document.getElementById('sau').contentDocument.documentElement;
  const tranNgang = d.scrollWidth > d.clientWidth;
  const dong = sau.map((s, i) =>
    \`\${s.ten.padEnd(18)} CHƯA VÁ \${String(truoc[i].cao).padStart(5)}px  →  ĐÃ VÁ \${String(s.cao).padStart(5)}px  \${s.cao >= 44 ? 'ĐẠT' : 'TRƯỢT'}\`);
  const datHet  = sau.every(s => s.cao >= 44);
  const doiChung = truoc.some(t => t.cao < 44);
  document.getElementById('kq').textContent =
    dong.join('\\n') +
    \`\\n\\nKET_LUAN dat=\${datHet} doi_chung_bat_duoc=\${doiChung} tran_ngang=\${tranNgang}\`;
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
}).listen(8899, '127.0.0.1', () => console.log('Bàn đo 44px: http://127.0.0.1:8899'));
