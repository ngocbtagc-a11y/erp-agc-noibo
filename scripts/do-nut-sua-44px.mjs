/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px — CTL-0017 (nút Sửa việc đã giao)
   ---------------------------------------------------------------------------
   Cùng cách đo với `scripts/do-nut-44px.mjs`: dựng `<iframe>` CÁCH LY, nạp
   ĐÚNG file `public/assets/css/style.css` đang chạy, đặt bề ngang 375px
   (điện thoại — đường chính của Sếp và nhân viên kho), rồi đọc
   `getBoundingClientRect().height` THẬT. KHÔNG khớp chuỗi CSS — khớp chuỗi
   chính là thứ đã để lọt lỗi "tự khai 44px mà đo tay ra 28px" lần trước.

   ĐÁNH DẤU HTML lấy NGUYÊN theo `public/app.html` (#cvSuaModalNen) và
   `public/assets/js/app.js` (nút `.btn-nho.cv-nut-sua` trong bảng việc).

   CA ĐỐI CHỨNG (BH-16): khung thứ hai nạp CÙNG file CSS nhưng ĐÃ GỠ đúng
   khối `.cv-sua-nut, .btn-nho.cv-nut-sua { … }` của đợt này. Khung đó PHẢI đo
   ra DƯỚI 44px (nút rơi về `.btn-nho` trần ~29px). Nếu nó cũng ≥44px thì
   phép đo vô dụng — đo cái gì cũng "đạt" thì không chứng minh được gì.

   Chạy:  node scripts/do-nut-sua-44px.mjs     (mở http://127.0.0.1:8903)
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8');

/* Gỡ ĐÚNG khối vá của CTL-0017 → trả CSS về trạng thái trước đợt này. */
const CSS_CHUA_VA = CSS
  .replace(/\.cv-sua-nut,\s*\n\.btn-nho\.cv-nut-sua \{[^}]*\}/, '')
  .replace(/\.cv-sua-canhbao input \{[^}]*\}/, '')
  // REV-0037 · L5 — nút Sửa/Gỡ lời khen. Bấm nhầm "Gỡ" thay "Sửa" là người
  // được khen ăn ngay một tin đính chính không đáng có, nên vùng chạm phải đủ.
  .replace(/\.vd-item \.vd-nut \.btn-nho \{[^}]*\}/, '');
if (CSS_CHUA_VA === CSS) {
  console.error('LỖI: không gỡ được khối CSS nào — ca đối chứng vô nghĩa, phép đo hỏng.');
  process.exit(1);
}

const KHUNG = (css) => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style></head><body>
<!-- .table-wrap KHÔNG phải trang trí: trong public/app.html bảng việc nằm
     đúng trong khung này (overflow-x:auto). Bỏ nó ra thì bảng tràn ngang
     thật và phép đo báo động giả — đo sai chỗ còn tệ hơn không đo (BH-26).
     Thêm nút "Sửa" làm ô thao tác rộng thêm, nên đây là chỗ PHẢI đo lại.
     (Không dùng dấu backtick trong khối này: nó nằm trong template literal
      của JS, một dấu backtick lạc là cả file không nạp được — và server cũ
      vẫn chạy code cũ, làm phép đo báo "đạt" trên bản chưa hề đổi.) -->
<div class="table-wrap"><table><tbody><tr>
  <td style="white-space:nowrap">
    <button type="button" class="btn-nho btn-primary">Duyệt xong</button>
    <button type="button" class="btn-nho cv-nut-sua" data-cv-sua="1">Sửa</button>
    <button type="button" class="btn-nho" data-cv-huy="1">Huỷ</button>
  </td>
</tr></tbody></table></div>
<div class="modal-nen" id="cvSuaModalNen"><div class="modal">
  <h4>Sửa việc đã giao</h4>
  <form id="cv-sua-form" class="form-luoi">
    <div class="field field-rong cv-sua-canhbao" id="cv-sua-khoi-lydo">
      <label for="cv-sua-ly-do">Vì sao dời hạn chót? *</label>
      <input type="text" id="cv-sua-ly-do" placeholder="VD: chờ NCC gửi báo giá">
    </div>
    <div class="field field-nut" style="display:flex; gap:10px; flex-wrap:wrap">
      <button type="submit" class="btn-primary cv-sua-nut" id="cv-sua-nut-luu" style="width:auto">Lưu thay đổi</button>
      <button type="button" class="btn-phu cv-sua-nut" id="cv-sua-nut-huy" style="width:auto">Hủy</button>
    </div>
  </form>
</div></div>
<!-- Vinh danh: nút Sửa / Gỡ lời khen (REV-0037 L5) -->
<div class="vd-item person"><div style="flex:1">
  <div class="vd-noidung">Dong goi 200 don khong sai don nao</div>
  <div class="vd-nut">
    <button type="button" class="btn-nho" data-vd-sua="1">Sửa</button>
    <button type="button" class="btn-nho" data-vd-go="1">Gỡ</button>
  </div>
</div></div>
</body></html>`;

const TRANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Đo 44px — CTL-0017 nút Sửa</title></head><body style="font:13px monospace;margin:12px">
<h3>Chiều cao nút THẬT ở bề ngang 375px (điện thoại)</h3>
<iframe id="sau"   src="/khung?va=1" width="375" height="360" style="border:1px solid #ccc"></iframe>
<iframe id="truoc" src="/khung?va=0" width="375" height="360" style="border:1px solid #ccc"></iframe>
<pre id="kq">đang đo…</pre>
<script>
const NUT = [
  ['Sửa (trong bảng)', '.cv-nut-sua'],
  ['Lưu thay đổi',     '#cv-sua-nut-luu'],
  ['Hủy',              '#cv-sua-nut-huy'],
  ['ô nhập lý do',     '#cv-sua-ly-do'],
  ['Sửa lời khen',     '[data-vd-sua]'],
  ['Gỡ lời khen',      '[data-vd-go]']
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
  const d = document.getElementById('sau').contentDocument.documentElement;
  const tranNgang = d.scrollWidth > d.clientWidth;
  const dong = sau.map((s, i) =>
    \`\${s.ten.padEnd(20)} CHUA VA \${String(truoc[i].cao).padStart(6)}px  ->  DA VA \${String(s.cao).padStart(6)}px  \${s.cao >= 44 ? 'DAT' : 'TRUOT'}\`);
  const datHet = sau.every(s => s.cao >= 44);
  const doiChung = truoc.some(t => t.cao < 44);
  document.getElementById('kq').textContent =
    dong.join('\\n') +
    \`\\n\\nKET_LUAN dat=\${datHet} doi_chung_bat_duoc=\${doiChung} tran_ngang=\${tranNgang}\`;
}
addEventListener('load', () => setTimeout(veKetQua, 250));
</script></body></html>`;

/* Cổng đổi được: `PORT=8913 node scripts/do-nut-sua-44px.mjs`. Cổng 8903 hay
   bị một `workerd` (wrangler dev) bỏ quên chiếm — và một bàn đo không chạy
   được vì kẹt cổng là một bàn đo bị bỏ qua trong im lặng. */
const CONG = parseInt(process.env.PORT || '8903', 10);

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/khung') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(KHUNG(u.searchParams.get('va') === '1' ? CSS : CSS_CHUA_VA));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(TRANG);
}).listen(CONG, '127.0.0.1', () => console.log(`Bàn đo 44px CTL-0017: http://127.0.0.1:${CONG}`));
