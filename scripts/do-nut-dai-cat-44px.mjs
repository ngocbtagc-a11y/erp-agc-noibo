/* ==========================================================================
   ĐO NGƯỠNG NGÓN TAY 44px + CHIỀU CAO DẢI + SỐ DÒNG BẢNG THẤY ĐƯỢC
   ---------------------------------------------------------------------------
   Chạy:  npm run do-nut-dai-cat        rồi mở http://127.0.0.1:8919
          (hoặc để máy đọc: trang tự in `KET_QUA_JSON=` vào <pre>)

   ĐO CÁI GÌ
     ① 44px — ba chỗ bấm:
        · nút trong dải cắt                (`.dai-cat .dai-cat-nut`)
        · BỘ LỌC PHẠM VI của màn gộp       (`.seg-loc .seg-nut`) ← thêm 29/08
        · dải PHẠM VI cũ                   (`.cv-pham-vi`) — xem ghi chú ②
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
const CSS = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8') + CSS_DAI_PHAM_VI_DA_XOA;

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
CSS_CHUA_VA = go(CSS_CHUA_VA, /\.seg-loc \.seg-nut \{ min-height: 44px; \}/,
  '.seg-loc .seg-nut { min-height: 0; }', '.seg-loc .seg-nut min-height');
/* Nút "Xem thêm" TRONG Ô BẢNG — đường thoát DUY NHẤT khỏi chỗ chữ bị kẹp
   (REV-0063 vòng 2, VỪA-3). Ca đối chứng gỡ đúng khối 44px, trả nút về cái đã
   đo được trước khi vá: hộp 60×15px. */
CSS_CHUA_VA = go(CSS_CHUA_VA, /td \.dai-gon-btn \{[\s\S]*?\n\}/,
  'td .dai-gon-btn { padding: 0; font-size: 12px; }', 'td .dai-gon-btn');

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
   `.sm`. Tên hàng là dữ liệu ngành thật, 96 ký tự. */
const BANG_KEP = `
<div class="panel"><div class="table-wrap"><table>
<thead><tr><th>Mã SKU · Tên hàng</th><th class="num">SL bán</th><th class="num">Doanh thu</th></tr></thead>
<tbody id="tbKep"><tr class="hang">
  <td class="cot-chu">
    <div class="nm">AGC-HDRM-500G-LOAI-A-1</div>
    <div class="sm">Hạt điều rang muối Bình Phước loại A đóng túi zip 500g — lô nhập tháng 8/2026 kèm giấy kiểm định</div>
    <button type="button" class="dai-gon-btn" id="nutXemThemO">Xem thêm</button>
  </td>
  <td class="num">1.234</td>
  <td class="num">9.876.543.210</td>
</tr></tbody></table></div></div>`;

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
  /* Nút "Xem thêm" TRONG Ô BẢNG. Đo HAI số khác nhau, và đó là cả điểm của
     phép đo này (REV-0063 vòng 2, VỪA-3):
       · HỘP nút     — vùng ngón tay bấm trúng, phải >= 44px
       · CHIỀU CAO DÒNG — phải KHÔNG phình ra, vì nút cao lên mà dòng cao theo
         là đổi từ lỗi ngón tay sang lỗi "ăn mất số dòng thấy được"
     Lề âm trên/dưới là thứ làm hai số này cùng đạt một lúc.
     (Lưu ý cho người sửa: đoạn này nằm TRONG một chuỗi mẫu — đừng viết dấu
     huyền ngược ở đây, nó đóng chuỗi và cả tệp thành lỗi cú pháp.) */
  const nutO = d.querySelector('#nutXemThemO');
  const oNutO = nutO && nutO.getBoundingClientRect();
  const chamO = oNutO ? oNutO.height : null;
  const dongKep = d.querySelector('#tbKep tr');
  const smKep = d.querySelector('#tbKep .sm');
  return {
    nut_pham_vi: oPv ? Math.round(oPv.height * 10) / 10 : null,
    nut_xem_them: lay('#nutXemThem'),
    nut_loc_pham_vi: lay('#nutLoc'),
    nut_o_bang_hop: oNutO ? Math.round(oNutO.height * 10) / 10 : null,
    nut_o_bang_rong: oNutO ? Math.round(oNutO.width * 10) / 10 : null,
    nut_o_bang_cham: chamO === null ? null : Math.round(chamO * 10) / 10,
    dong_o_kep_cao: dongKep ? Math.round(dongKep.getBoundingClientRect().height * 10) / 10 : null,
    o_kep_that_su_bi_kep: !!(smKep && smKep.scrollHeight > smKep.clientHeight + 1),
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
                n375.nut_xem_them >= 44 && n320.nut_xem_them >= 44 &&
                n375.nut_loc_pham_vi >= 44 && n320.nut_loc_pham_vi >= 44 &&
                n375.nut_o_bang_cham >= 44 && n320.nut_o_bang_cham >= 44;
  const dcNhay = !(dc.nut_pham_vi >= 44 && dc.nut_xem_them >= 44 && dc.nut_loc_pham_vi >= 44) &&
                 !(dc.nut_o_bang_cham >= 44);
  /* Vùng chạm nới ra mà DÒNG KHÔNG ĐƯỢC PHÌNH. Ngưỡng 4px là đúng phần đệm
     4px trên/dưới thêm vào cho chữ nút dễ đọc, không phải một con số nới tay:
     44px vùng chạm mà cộng 29px vào mọi dòng thì đã đổi sang lỗi khác. */
  const dongKhongPhinh = n375.dong_o_kep_cao <= dc.dong_o_kep_cao + 10 &&
                         n320.dong_o_kep_cao <= dc.dong_o_kep_cao + 10;
  /* Ô mẫu phải THẬT SỰ bị kẹp, nếu không thì phép đo trên là đo một cái nút
     không ai cần — bàn đo tự nói dối. */
  const oKepThat = n375.o_kep_that_su_bi_kep && n320.o_kep_that_su_bi_kep;
  const gonHon = n375.dai_chiem_doc < t375.dai_chiem_doc && n320.dai_chiem_doc < t320.dai_chiem_doc;
  const dongKhongGiam = n375.dong_bang_thay_duoc >= t375.dong_bang_thay_duoc &&
                        n320.dong_bang_thay_duoc >= t320.dong_bang_thay_duoc;
  const anDung = n375.an_dung_khi_hidden && n320.an_dung_khi_hidden;
  const khongTran = !n375.tran_ngang && !n320.tran_ngang;

  const kq = { nut_44px: nut44, doi_chung_con_hieu_luc: dcNhay, dai_gon_hon: gonHon,
               dong_bang_khong_giam: dongKhongGiam, an_dung_khi_hidden: anDung,
               khong_tran_ngang: khongTran,
               nut_o_bang_khong_phinh_dong: dongKhongPhinh, o_mau_that_su_bi_kep: oKepThat,
               nay: { '375': n375, '320': n320 },
               truoc: { '375': t375, '320': t320 }, doi_chung: dc };
  kq.dat_het = nut44 && dcNhay && gonHon && dongKhongGiam && anDung && khongTran &&
               dongKhongPhinh && oKepThat;
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
    '  Nut "Xem them" TRONG O BANG (REV-0063 v2, VUA-3)\\n' +
    '    vung CHAM  375px: ' + d(n375.nut_o_bang_cham) + 'px   320px: ' + d(n320.nut_o_bang_cham) +
      'px   doi chung (go luat): ' + d(dc.nut_o_bang_cham) + 'px\\n' +
    '    hop        375px: ' + d(n375.nut_o_bang_hop) + 'x' + n375.nut_o_bang_rong +
      '   doi chung: ' + d(dc.nut_o_bang_hop) + 'x' + dc.nut_o_bang_rong + '\\n' +
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
    '\\nDai gon hon         : ' + (gonHon ? 'DAT' : 'HONG') +
    '\\nSo dong KHONG giam  : ' + (dongKhongGiam ? 'DAT' : 'HONG') +
    '\\nDai [hidden] van an : ' + (anDung ? 'DAT' : 'HONG') +
    '\\nKhong tran ngang    : ' + (khongTran ? 'DAT' : 'HONG') +
    '\\nNut o bang: dong KHONG phinh : ' + (dongKhongPhinh ? 'DAT' : 'HONG') +
    '\\nO mau THAT SU bi kep         : ' + (oKepThat ? 'DAT' : 'HONG - phep do vo nghia') +
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
