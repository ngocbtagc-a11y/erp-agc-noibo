/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px + CHIỀU CAO DẢI + SỐ DÒNG BẢNG THẤY ĐƯỢC
   ---------------------------------------------------------------------------
   Chạy:  npm run do-nut-dai-cat        rồi mở http://127.0.0.1:8919
          (hoặc để máy đọc: trang tự in `KET_QUA_JSON=` vào <pre>)

   ĐO CÁI GÌ
     ① 44px — hai chỗ bấm khi xử góp ý chị Vũ Lan Hương:
        · dải PHẠM VI, nay CẢ DẢI là nút   (`.cv-pham-vi`)
        · nút trong dải cắt                (`.dai-cat .dai-cat-nut`)
     ② CHIỀU CAO dải PHẠM VI — TRƯỚC (bản `ab92afc`) vs SAU (bản này).
        Dải này LUÔN hiện nên mỗi pixel của nó là pixel lấy của bảng việc.
        REV-0034 · L4 đo bản trước ra 137px ở 375px và 157px ở 320px.
     ③ SỐ DÒNG BẢNG còn thấy được trong màn hình điện thoại (375×667 và
        320×568) — con số cuối cùng người dùng thật quan tâm. Ràng buộc:
        **không được giảm**.

   VÌ SAO PHẢI ĐO: commit 8909355 của chính kho mã này từng KHAI "mọi nút
   ≥44px" mà đo tay ra 28px. Khai không phải là đo (BH-16).

   CÁCH ĐO (BH-02): `<iframe>` cách ly, nạp ĐÚNG `public/assets/css/style.css`
   đang chạy, rồi đọc `getBoundingClientRect()` THẬT. KHÔNG khớp chuỗi CSS —
   khớp chuỗi chính là thứ đã để lọt lỗi lần trước.

   CA ĐỐI CHỨNG (BH-16): khung "chưa vá" nạp CÙNG file CSS nhưng đã GỠ đúng
   luật `min-height: 44px`. Đó là lệch CƠ HỌC. Khung đó BẮT BUỘC phải đo ra
   <44px; nếu nó cũng ≥44px thì phép đo vô dụng và phải TRƯỢT. `go()` kiểm
   regex có khớp thật — trượt một phát là dừng với mã lỗi 2.

   KHUNG "TRƯỚC": chép NGUYÊN VĂN đánh dấu + luật CSS của bản `ab92afc` (dán
   ở `CSS_TRUOC`/`HTML_TRUOC` dưới đây). Không có nó thì con số "gọn đi bao
   nhiêu" chỉ là lời khai.
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
      'Ca đối chứng sẽ giống hệt bản vá, phép đo thành vô nghĩa. Sửa regex rồi chạy lại.');
    process.exit(2);
  }
  return sau;
}

/* Trả hai chỗ bấm về "chưa ai nghĩ tới ngón tay": cỡ tự nhiên theo cỡ chữ. */
let CSS_CHUA_VA = go(CSS, /\.dai-cat-nut \{[^}]*\}/,
  '.dai-cat-nut { padding: 2px 8px; border: 1px solid #ccc; border-radius: 12px; font-size: 13.5px; }',
  '.dai-cat-nut');
CSS_CHUA_VA = go(CSS_CHUA_VA, /(\.cv-pham-vi \{[^}]*?)min-height: 44px;/,
  '$1min-height: 0;', '.cv-pham-vi min-height');

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
<div class="seg"><button class="seg-nut active">Việc cần làm</button><button class="seg-nut">Việc phối hợp</button><button class="seg-nut">Việc tôi giao</button></div>
<div class="panel"><div class="table-wrap"><table>
<thead><tr><th>Việc</th><th>Đầu ra cần đạt</th><th>Người giao</th><th>Hạn chót</th><th>Trạng thái</th><th></th></tr></thead>
<tbody id="tb">${Array.from({ length: 30 }, (_, i) =>
  `<tr class="hang"><td><div class="nm">Đối soát đơn hoàn ngày ${i + 1}</div></td><td class="sm">Bảng khớp 100%</td>` +
  `<td class="sm">Sếp Ngọc</td><td class="sm">0${(i % 9) + 1}/09/2026</td><td><span class="tag">Mới</span></td><td></td></tr>`).join('')}
</tbody></table></div></div>`;

const KHUNG = (css, than, extra = '') => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style></head><body style="margin:0;padding:8px">
${than}
<div class="dai-cat" id="daiCat">
  <span class="dai-cat-chu">✂️ Đã tải <b>500</b> trong tổng <b>700</b> việc — còn <b>200</b> việc chưa tải về máy. Ô tìm kiếm phía trên chỉ tìm trong phần ĐÃ TẢI về máy.</span>
  <button type="button" class="dai-cat-nut" id="nutXemThem">Tải thêm 200 việc cũ hơn</button>
</div>
<div class="dai-cat" id="daiCatAn" hidden></div>
${BANG}${extra}</body></html>`;

const TRANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Đo dải phạm vi — 44px · chiều cao · số dòng</title></head><body style="font:13px monospace;margin:12px">
<h3>Khung 1–2 = BẢN NAY (375×667, 320×568) · Khung 3–4 = BẢN TRƯỚC (ab92afc) · Khung 5 = đối chứng (gỡ luật 44px)</h3>
<div>
  <iframe id="nay375"    src="/khung?ban=nay&va=1"    width="375" height="667" style="border:1px solid #ccc"></iframe>
  <iframe id="nay320"    src="/khung?ban=nay&va=1"    width="320" height="568" style="border:1px solid #ccc"></iframe>
  <iframe id="truoc375"  src="/khung?ban=truoc&va=1"  width="375" height="667" style="border:1px solid #ccc"></iframe>
  <iframe id="truoc320"  src="/khung?ban=truoc&va=1"  width="320" height="568" style="border:1px solid #ccc"></iframe>
  <iframe id="dc"        src="/khung?ban=nay&va=0"    width="375" height="667" style="border:1px solid #ccc"></iframe>
</div>
<pre id="kq">đang đo…</pre>
<script>
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
  return {
    nut_pham_vi: oPv ? Math.round(oPv.height * 10) / 10 : null,
    nut_xem_them: lay('#nutXemThem'),
    dai_chiem_doc: chiemDoc,
    dong_bang_thay_duoc: dong,
    an_dung_khi_hidden: !!csAn && csAn.display === 'none' && an.getBoundingClientRect().height === 0,
    tran_ngang: d.documentElement.scrollWidth > be + 1
  };
}
function ve() {
  const n375 = doKhung('nay375', 375, 667), n320 = doKhung('nay320', 320, 568);
  const t375 = doKhung('truoc375', 375, 667), t320 = doKhung('truoc320', 320, 568);
  const dc = doKhung('dc', 375, 667);

  const nut44 = n375.nut_pham_vi >= 44 && n320.nut_pham_vi >= 44 &&
                n375.nut_xem_them >= 44 && n320.nut_xem_them >= 44;
  const dcNhay = !(dc.nut_pham_vi >= 44 && dc.nut_xem_them >= 44);
  const gonHon = n375.dai_chiem_doc < t375.dai_chiem_doc && n320.dai_chiem_doc < t320.dai_chiem_doc;
  const dongKhongGiam = n375.dong_bang_thay_duoc >= t375.dong_bang_thay_duoc &&
                        n320.dong_bang_thay_duoc >= t320.dong_bang_thay_duoc;
  const anDung = n375.an_dung_khi_hidden && n320.an_dung_khi_hidden;
  const khongTran = !n375.tran_ngang && !n320.tran_ngang;

  const kq = { nut_44px: nut44, doi_chung_con_hieu_luc: dcNhay, dai_gon_hon: gonHon,
               dong_bang_khong_giam: dongKhongGiam, an_dung_khi_hidden: anDung,
               khong_tran_ngang: khongTran, nay: { '375': n375, '320': n320 },
               truoc: { '375': t375, '320': t320 }, doi_chung: dc };
  kq.dat_het = nut44 && dcNhay && gonHon && dongKhongGiam && anDung && khongTran;
  window.KET_QUA = kq;
  const d = (x) => String(x).padStart(6);
  document.getElementById('kq').textContent =
    'NGUONG NGON TAY 44px (WCAG 2.5.5 / Apple HIG)\\n' +
    '  Nut dai PHAM VI  375px: ' + d(n375.nut_pham_vi) + 'px   320px: ' + d(n320.nut_pham_vi) +
      'px   doi chung (go luat): ' + d(dc.nut_pham_vi) + 'px\\n' +
    '  Nut "Tai them"   375px: ' + d(n375.nut_xem_them) + 'px   320px: ' + d(n320.nut_xem_them) +
      'px   doi chung (go luat): ' + d(dc.nut_xem_them) + 'px\\n' +
    '\\nCHIEU CAO DAI PHAM VI (ke ca margin) — TRUOC vs SAU\\n' +
    '  375px: TRUOC ' + d(t375.dai_chiem_doc) + 'px  ->  SAU ' + d(n375.dai_chiem_doc) +
      'px   (bot ' + Math.round(t375.dai_chiem_doc - n375.dai_chiem_doc) + 'px)\\n' +
    '  320px: TRUOC ' + d(t320.dai_chiem_doc) + 'px  ->  SAU ' + d(n320.dai_chiem_doc) +
      'px   (bot ' + Math.round(t320.dai_chiem_doc - n320.dai_chiem_doc) + 'px)\\n' +
    '\\nSO DONG BANG CON THAY DUOC TRONG MAN HINH — TRUOC vs SAU\\n' +
    '  375x667: TRUOC ' + t375.dong_bang_thay_duoc + ' dong  ->  SAU ' + n375.dong_bang_thay_duoc + ' dong\\n' +
    '  320x568: TRUOC ' + t320.dong_bang_thay_duoc + ' dong  ->  SAU ' + n320.dong_bang_thay_duoc + ' dong\\n' +
    '\\nTat ca nut >= 44px  : ' + (nut44 ? 'DAT' : 'HONG') +
    '\\nDai gon hon         : ' + (gonHon ? 'DAT' : 'HONG') +
    '\\nSo dong KHONG giam  : ' + (dongKhongGiam ? 'DAT' : 'HONG') +
    '\\nDai [hidden] van an : ' + (anDung ? 'DAT' : 'HONG') +
    '\\nKhong tran ngang    : ' + (khongTran ? 'DAT' : 'HONG') +
    '\\nDoi chung con nhay  : ' + (dcNhay ? 'CO (ban khong va do ra <44px)' : 'KHONG - PHEP DO VO DUNG') +
    '\\n\\nKET_QUA_JSON=' + JSON.stringify(kq);
}
let xong = 0;
for (const id of ['nay375', 'nay320', 'truoc375', 'truoc320', 'dc']) {
  document.getElementById(id).addEventListener('load', () => { if (++xong === 5) setTimeout(ve, 80); });
}
</script></body></html>`;

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/khung') {
    const truoc = u.searchParams.get('ban') === 'truoc';
    const css = (u.searchParams.get('va') === '1' ? CSS : CSS_CHUA_VA) + (truoc ? CSS_TRUOC : '');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(KHUNG(css, truoc ? HTML_TRUOC : HTML_NAY));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(TRANG);
}).listen(8919, '127.0.0.1', () => {
  console.log('Đo dải phạm vi — mở http://127.0.0.1:8919');
});
