/* ==========================================================================
   NÚT "XEM THÊM" CÓ NÓI DỐI KHÔNG — TRẦN `GO_TOI_DA` ĐẾM THEO CHÙM
   ---------------------------------------------------------------------------
   Chạy:  npm run do-nut-noi-doi        (tự lái Chrome, tự chấm, tự thoát)

   NÚT NÓI DỐI LÀ GÌ: một nút "Xem thêm" còn nằm trên ô mà ô ấy ĐÃ HẾT KẸP.
   Bấm vào nó thì bung ra đúng thứ đang bày sẵn — "một lời nói dối nhỏ, cùng
   họ với chính lỗi đang vá" (ghi ngay trong `capNutDongPhu()`).

   VÌ SAO CÓ BÀN ĐO NÀY — REV-0063 vòng 3, VỪA-1. Vòng 2 chữa nút nói dối bằng
   cách gỡ cả nút THẬT, và chặn "vòng lặp gắn/gỡ" giả định bằng `GO_TOI_DA = 2`
   đếm trên CẢ ĐỜI DOM, kèm lời khai *"2 là đủ để dọn sạch mọi ca kéo co / xoay
   máy ĐO ĐƯỢC"*. Hồ Ly đo lại và câu ấy SAI: nới rồi thu 5 vòng, từ lượt nới
   thứ BA trần chạm và 4 nút nói dối quay lại. Lời khai là giả thuyết trình bày
   như số đo — không có bàn đo nào canh, nên không ai thấy.

   HAI CA, HAI CHIỀU NGƯỢC NHAU — đó là cả điểm của bàn đo này. Một cái trần
   chỉ sai theo ĐÚNG MỘT trong hai chiều, nên phải hỏi cả hai:

     CA A · KÉO CO (trần quá CHẶT thì đỏ)
       Nới khung SKU rồi thu lại 8 vòng liên tiếp, không có lượt tải dữ liệu
       nào xen vào — đúng cảnh xoay máy tính bảng / kéo co cửa sổ. `resize`
       KHÔNG vẽ lại bảng (nó chỉ gọi `quetHet`), nên bộ đếm không được xoá.
       ĐÒI: 0 nút nói dối ở CẢ 8 vòng.
       (Vì sao 8 chứ không phải 5: xem ghi chú ở `SO_VONG` trong `caA()`. Năm
       vòng chỉ bắt được chiều "`GO_TOI_DA` quá nhỏ"; chiều "`CHUM_MS` quá
       dài" cần `GO_TOI_DA` + 1 vòng mới lộ.)

     CA B · VÒNG LẶP TỰ NUÔI (trần quá LỎNG thì đỏ)
       Gài bằng CSS: ô kẹp khi KHÔNG có nút, hết kẹp khi CÓ nút
       (`td.cot-chu:has(.dai-gon-btn) .sm { max-height: none }`). Gỡ nút →
       ô kẹp lại → gắn nút → ô hết kẹp → gỡ nút… `MutationObserver` +
       `requestAnimationFrame` quay hết tốc lực. Đây đúng cái vòng lặp mà
       `GO_TOI_DA` sinh ra để chặn, lần đầu tiên được DỰNG LÊN thay vì được
       nhắc tới trong bình luận.
       ĐÒI: số lần gỡ phải CÓ TRẦN, và trang phải TỰ LẶNG (500ms cuối không
       thêm lần gỡ nào). Bóp nhịp không tính là chặn.

   CA ĐỐI CHỨNG (BH-16) — bàn đo phải tự chứng minh nó có răng, nếu không nó
   là một dấu tick không đo gì. Cả hai ca chạy lại trên BẢN TẠM đã bị sửa
   `app.js` qua `suaTep`:
     · đối chứng A: trả về `GO_TOI_DA = 2` + `CHUM_MS` vô hạn (đúng bản vòng 2)
       → ca A BẮT BUỘC phải đỏ. Không đỏ thì ca A không đo cái nó hứa đo.
     · đối chứng B: `GO_TOI_DA` vô hạn → ca B BẮT BUỘC phải đỏ (loạn không dừng).
   `suaTep` phải ĐỔI ĐƯỢC THẬT: mỗi ca tự đọc lại hằng số trong trang và in ra,
   vì Hồ Ly đã mắc đúng bẫy này một lần ("ba bản đối chứng" hoá ra ba lần chạy
   cùng một bản, vì `suaTep` không nhận tệp CSS).
   ========================================================================== */

import { dungMayGia, moChrome, TOI } from './lib/ban-do-chrome.mjs';

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

/* Đếm nút NÓI DỐI: có nút mà ô KHÔNG còn kẹp. Bỏ qua ô đang bung
   (`dai-gon-mo`) và nút mang cờ `doan` — hai thứ ấy có luật riêng. */
const DEM = `(function(){
  let that = 0, noiDoi = 0, doan = 0, kepKhongNut = 0;
  const soGo = {};
  for (const sm of document.querySelectorAll('td.cot-chu .sm, td .sm.dong-phu')) {
    if (sm.classList.contains('dai-gon-mo')) continue;
    const ke = sm.nextElementSibling;
    const nut = ke && ke.classList.contains('dai-gon-btn') ? ke : null;
    const kep = sm.scrollHeight > sm.clientHeight + 1;
    if (nut && nut.dataset.doan) doan++;
    else if (nut && kep) that++;
    else if (nut && !kep) noiDoi++;
    else if (!nut && kep) kepKhongNut++;
    const g = sm.dataset.soGo || '0';
    soGo[g] = (soGo[g] || 0) + 1;
  }
  return { that, noiDoi, doan, kepKhongNut, soGo };
})()`;

/* Nới / thu khung hai bảng SKU. Mỗi lượt kèm một mutation `childList` để đánh
   thức `MutationObserver` — vì `resize` KHÔNG vẽ lại bảng, đó chính là điều
   làm ca này tới được cái trần. */
const CHAM = `const d = document.createElement('span'); document.body.appendChild(d); d.remove();`;
const NOI = `(function(){
  let s = document.getElementById('kd-noi');
  if (!s) { s = document.createElement('style'); s.id = 'kd-noi'; document.head.appendChild(s); }
  s.textContent = '.kd-sku-cot { display: block !important; }';
  ${CHAM}
  return true;
})()`;
const THU = `(function(){
  const s = document.getElementById('kd-noi'); if (s) s.textContent = '';
  ${CHAM}
  return true;
})()`;

/* CA B — gài vòng lặp tự nuôi, và ĐẾM số lần gỡ bằng chính MutationObserver.
   `:has()` là cách duy nhất buộc "có nút thì hết kẹp" mà không phải sờ vào mã
   sản phẩm. Bộ đếm ghi cả MỐC THỜI GIAN để trả lời được câu "trang có TỰ LẶNG
   không", chứ không chỉ "gỡ bao nhiêu lần" — một vòng lặp bị bóp nhịp vẫn là
   một vòng lặp. */
const GAI_VONG_LAP = `(function(){
  window.__go = [];
  // Bao nhiêu ô có thể rơi vào vòng lặp — dùng để suy ra TRẦN kỳ vọng, thay vì
  // viết cứng một con số "trông có vẻ đủ".
  window.__soO = document.querySelectorAll('td.cot-chu .sm, td .sm.dong-phu').length;
  new MutationObserver(list => {
    for (const m of list) for (const n of m.removedNodes)
      if (n.nodeType === 1 && n.classList && n.classList.contains('dai-gon-btn'))
        window.__go.push(Math.round(performance.now()));
  }).observe(document.body, { childList: true, subtree: true });
  const s = document.createElement('style');
  s.id = 'kd-gai-vonglap';
  s.textContent = 'td.cot-chu:has(.dai-gon-btn) .sm { max-height: none !important; overflow: visible !important; }';
  document.head.appendChild(s);
  ${CHAM}
  return CSS.supports('selector(:has(*))');
})()`;
const DOC_GO = `(function(){
  const g = window.__go || [];
  const nay = Math.round(performance.now());
  const cuoi = g.length ? nay - g[g.length - 1] : null;
  // khoảng cách giữa hai lần gỡ liên tiếp — con số nuôi hằng số CHUM_MS
  const cach = [];
  for (let i = 1; i < g.length; i++) cach.push(g[i] - g[i - 1]);
  cach.sort((a, b) => a - b);
  return { soLanGo: g.length, imLangMs: cuoi, soO: window.__soO || 0,
           cachNhoNhat: cach[0] ?? null,
           cachGiua: cach.length ? cach[Math.floor(cach.length / 2)] : null };
})()`;
/* Hằng số ĐANG CHẠY THẬT trong trang — in ra để ca đối chứng tự chứng minh nó
   đổi được cái gì, thay vì tin rằng `suaTep` đã chạy. */
const DOC_HANG_SO = `(function(){
  const s = String(window.__HANG_SO_GO || '');
  return s || 'khong-lo-ra';
})()`;

/* ---- chạy một ca ------------------------------------------------------- */
async function caA(cong) {
  const cr = await moChrome({ url: `http://127.0.0.1:${cong}/app.html`, rong: 1440, doiMs: 2600 });
  await cr.chay(MO_KD); await cr.doi(900);
  const hangSo = await cr.chay(DOC_HANG_SO);
  const nen = await cr.chay(DEM);
  const vong = [];
  const mocGo = [];
  /* TÁM vòng, không phải năm — và con số này có lý do tính được, không phải
     "cho chắc". Ca A phải đỏ khi CẶP (`GO_TOI_DA`, `CHUM_MS`) quá chặt theo
     BẤT KỲ chiều nào:
       · `GO_TOI_DA` quá nhỏ  → bản vòng 2 (trần 2) đỏ ngay vòng 3.
       · `CHUM_MS` quá dài    → mọi lượt gỡ bị gộp làm MỘT chùm, nên phải chạy
         đủ `GO_TOI_DA` + 1 = 7 vòng thì bộ đếm mới chạm trần và nút nói dối
         mới hiện ra. Năm vòng KHÔNG đủ để bắt chiều này — bản đầu của bàn đo
         này chạy 5 vòng và tôi đã suýt khai rằng nó canh được cả hai đầu.
     Tám = 7 + 1 vòng để nhìn thấy hậu quả. Nâng `GO_TOI_DA` thì phải nâng số
     vòng ở đây, nếu không cổng lặng lẽ mất một đầu. */
  const SO_VONG = 8;
  for (let v = 1; v <= SO_VONG; v++) {
    await cr.chay(NOI); await cr.doi(320);
    const a = await cr.chay(DEM);
    mocGo.push(await cr.chay(`(function(){const r=[];for(const sm of document.querySelectorAll('td.cot-chu .sm'))if(sm.dataset.goLuc)r.push(Math.round(Number(sm.dataset.goLuc)));return r;})()`));
    await cr.chay(THU); await cr.doi(320);
    const b = await cr.chay(DEM);
    vong.push({ v, noiA: a.noiDoi, thatA: a.that, noiB: b.noiDoi, thatB: b.that, soGo: b.soGo });
  }
  cr.dong();
  /* Khoảng cách giữa hai lần gỡ liên tiếp trên CÙNG một ô — con số biện minh
     cho `CHUM_MS`. Lấy từ `data-go-luc` chứ không phỏng đoán. */
  const cach = [];
  for (let i = 1; i < mocGo.length; i++) {
    const t = mocGo[i], s = mocGo[i - 1];
    for (let k = 0; k < Math.min(t.length, s.length); k++) if (t[k] > s[k]) cach.push(t[k] - s[k]);
  }
  cach.sort((a, b) => a - b);
  return { hangSo, nen, vong, cachNhoNhat: cach[0] ?? null, cachGiua: cach.length ? cach[Math.floor(cach.length / 2)] : null,
           noiDoiToiDa: Math.max(nen.noiDoi, ...vong.flatMap(x => [x.noiA, x.noiB])) };
}

async function caB(cong) {
  const cr = await moChrome({ url: `http://127.0.0.1:${cong}/app.html`, rong: 1440, doiMs: 2600 });
  await cr.chay(MO_KD); await cr.doi(900);
  const hangSo = await cr.chay(DOC_HANG_SO);
  const coHas = await cr.chay(GAI_VONG_LAP);
  await cr.doi(2500);
  const kq = await cr.chay(DOC_GO);
  cr.dong();
  return { hangSo, coHas, ...kq };
}

/* ---- ba bản: THẬT + hai bản đối chứng ---------------------------------- */
/* ⚠️ `\r?\n`, KHÔNG `\n`. Kho này để `core.autocrlf = true` và không có
   `.gitattributes`, nên `app.js` trên đĩa mang CRLF: một `\n` trần ở đây là
   một ca đối chứng TRƯỢT IM LẶNG — bàn đo sẽ tưởng nó đã đổi được mã trong
   khi ba bản chạy y hệt nhau. Lớp lỗi này đã bị bắt bốn lần ở bốn tệp khác
   nhau (xem `docs/HANG-DOI.md`). Mỗi lần sửa đều NÉM LỖI chứ không đi tiếp. */
const CAP_HANG = /const GO_TOI_DA = ([^;]+);\r?\nconst CHUM_MS = ([^;]+);/;
const LO_HANG_SO = (s) =>
  s.replace(CAP_HANG, (m, a, b) =>
    `${m}\nwindow.__HANG_SO_GO = 'GO_TOI_DA=${a.trim()} CHUM_MS=${b.trim()}';`);

function suaTepThat(s, f) {
  if (f !== 'assets/js/app.js') return s;
  const r = LO_HANG_SO(s);
  if (r === s) throw new Error('Không cắm được đường lộ hằng số vào app.js — đổi tên hằng rồi?');
  return r;
}
/* ĐỐI CHỨNG A — trả về đúng bản vòng 2: trần 2, đếm trên cả đời DOM (chùm dài
   vô hạn thì "cùng chùm" luôn đúng, tức không bao giờ đặt lại bộ đếm). */
function suaTepDcA(s, f) {
  if (f !== 'assets/js/app.js') return s;
  const r = s.replace(CAP_HANG, 'const GO_TOI_DA = 2;\nconst CHUM_MS = 1e12;');
  if (r === s) throw new Error('Đối chứng A: không sửa được GO_TOI_DA/CHUM_MS.');
  return LO_HANG_SO(r);
}
/* ĐỐI CHỨNG A2 — GIỮ `GO_TOI_DA` thật, chỉ kéo `CHUM_MS` dài vô hạn. Đây là
   chiều hỏng thứ hai của ca A: bộ đếm không bao giờ đặt lại, nên đủ số vòng
   là chạm trần. Không có ca này thì câu "ca A canh CẢ HAI đầu" chỉ là lời
   khai — và bản đầu của bàn đo này chạy 5 vòng, tức KHÔNG canh được đầu ấy. */
function suaTepDcA2(s, f) {
  if (f !== 'assets/js/app.js') return s;
  const m = CAP_HANG.exec(s);
  if (!m) throw new Error('Đối chứng A2: không đọc được GO_TOI_DA.');
  const r = s.replace(CAP_HANG, `const GO_TOI_DA = ${m[1].trim()};\nconst CHUM_MS = 1e12;`);
  if (r === s) throw new Error('Đối chứng A2: không sửa được CHUM_MS.');
  return LO_HANG_SO(r);
}
/* ĐỐI CHỨNG B — bỏ hẳn trần. Vòng lặp phải chạy không dừng. */
function suaTepDcB(s, f) {
  if (f !== 'assets/js/app.js') return s;
  const r = s.replace(CAP_HANG, 'const GO_TOI_DA = 1e12;\nconst CHUM_MS = 250;');
  if (r === s) throw new Error('Đối chứng B: không sửa được GO_TOI_DA.');
  return LO_HANG_SO(r);
}

const mThat = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU, suaTep: suaTepThat });
const A = await caA(mThat.cong);
const B = await caB(mThat.cong);
mThat.dong();

const mDcA = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU, suaTep: suaTepDcA });
const dcA = await caA(mDcA.cong);
mDcA.dong();

const mDcA2 = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU, suaTep: suaTepDcA2 });
const dcA2 = await caA(mDcA2.cong);
mDcA2.dong();

const mDcB = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU, suaTep: suaTepDcB });
const dcB = await caB(mDcB.cong);
mDcB.dong();

/* ---- chấm --------------------------------------------------------------- */
console.log('─── CA A · KÉO CO (nới/thu 8 vòng, không vẽ lại bảng) ───');
console.log(`hằng số đang chạy: ${A.hangSo}`);
console.log(`  NỀN  : thật ${A.nen.that} · NÓI DỐI ${A.nen.noiDoi} · đoán ${A.nen.doan} · kẹp-không-nút ${A.nen.kepKhongNut}`);
for (const v of A.vong)
  console.log(`  vòng ${v.v}: NỚI → thật ${v.thatA} · NÓI DỐI ${v.noiA}  ‖  THU → thật ${v.thatB} · NÓI DỐI ${v.noiB}   soGo=${JSON.stringify(v.soGo)}`);
console.log(`  khoảng cách hai lần gỡ liên tiếp trên CÙNG một ô: nhỏ nhất ${A.cachNhoNhat}ms · giữa ${A.cachGiua}ms`);
const aDat = A.noiDoiToiDa === 0;
console.log(`  → nút nói dối tối đa: ${A.noiDoiToiDa}  ${aDat ? '✅ ĐẠT' : '❌ HỎNG'}`);

console.log('\n─── ĐỐI CHỨNG A · trần 2 đếm trên cả đời DOM (bản vòng 2) ───');
console.log(`hằng số đang chạy: ${dcA.hangSo}`);
for (const v of dcA.vong)
  console.log(`  vòng ${v.v}: NỚI → NÓI DỐI ${v.noiA}  ‖  THU → NÓI DỐI ${v.noiB}   soGo=${JSON.stringify(v.soGo)}`);
const dcADat = dcA.noiDoiToiDa > 0;
console.log(`  → nút nói dối tối đa: ${dcA.noiDoiToiDa}  ${dcADat ? '✅ CÓ RĂNG (ca A bắt được bản cũ)' : '❌ CA A KHÔNG ĐO GÌ'}`);

console.log('\n─── ĐỐI CHỨNG A2 · GIỮ GO_TOI_DA thật, chỉ kéo CHUM_MS vô hạn ───');
console.log(`hằng số đang chạy: ${dcA2.hangSo}`);
for (const v of dcA2.vong)
  console.log(`  vòng ${v.v}: NỚI → NÓI DỐI ${v.noiA}  ‖  THU → NÓI DỐI ${v.noiB}   soGo=${JSON.stringify(v.soGo)}`);
const dcA2Dat = dcA2.noiDoiToiDa > 0;
console.log(`  → nút nói dối tối đa: ${dcA2.noiDoiToiDa}  ` +
  (dcA2Dat ? '✅ CÓ RĂNG (ca A canh được CẢ chiều "CHUM_MS quá dài")'
           : '❌ CA A MÙ Ở CHIỀU "CHUM_MS quá dài" — thêm vòng vào SO_VONG'));

/* TRẦN KỲ VỌNG suy ra từ chính hằng số đang chạy và số ô có thể dính, KHÔNG
   viết cứng: mỗi ô được gỡ tối đa `GO_TOI_DA` lần trong một chùm, cộng một
   chùm dự phòng cho lượt vẽ lại hợp lệ ngay trước lúc gài. Viết cứng một con
   số ở đây thì đổi `GO_TOI_DA` là cổng lặng lẽ hết nghĩa. */
const tranKyVong = (hangSo, soO) => {
  const m = /GO_TOI_DA=([\d.e+]+)/.exec(hangSo || '');
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n < 1e6 ? Math.ceil(soO * n * 2) : Infinity;
};
console.log('\n─── CA B · VÒNG LẶP TỰ NUÔI (gài bằng :has) ───');
console.log(`hằng số đang chạy: ${B.hangSo} · trình duyệt hiểu :has = ${B.coHas}`);
const tranB = tranKyVong(B.hangSo, B.soO);
console.log(`  số lần gỡ trong 2.5s: ${B.soLanGo} · im lặng ${B.imLangMs}ms cuối` +
            ` · cách nhau nhỏ nhất ${B.cachNhoNhat}ms · giữa ${B.cachGiua}ms` +
            `  (${B.soO} ô · trần kỳ vọng ${tranB})`);
const bDat = B.coHas && B.soLanGo > 0 && B.soLanGo <= tranB && B.imLangMs >= 500;
console.log(`  → ${bDat ? '✅ ĐẠT — vòng lặp DỪNG hẳn, không phải chạy chậm lại'
                        : '❌ HỎNG — vòng lặp chưa dừng (hoặc chưa gài được)'}`);

console.log('\n─── ĐỐI CHỨNG B · bỏ hẳn trần ───');
console.log(`hằng số đang chạy: ${dcB.hangSo}`);
console.log(`  số lần gỡ trong 2.5s: ${dcB.soLanGo} · im lặng ${dcB.imLangMs}ms cuối` +
            `  (${dcB.soO} ô · trần kỳ vọng ${tranKyVong(B.hangSo, dcB.soO)} theo hằng số THẬT)`);
const dcBDat = dcB.soLanGo > tranKyVong(B.hangSo, dcB.soO) || dcB.imLangMs < 500;
console.log(`  → ${dcBDat ? '✅ CÓ RĂNG (ca B bắt được bản không trần)' : '❌ CA B KHÔNG ĐO GÌ'}`);

const datHet = aDat && dcADat && dcA2Dat && bDat && dcBDat;
console.log('\nKET_QUA_JSON=' + JSON.stringify({ dat_het: datHet, A, B, dcA, dcA2, dcB }));
console.log(datHet
  ? '\n✅ XANH — 0 nút nói dối khi kéo co, và vòng lặp tự nuôi bị chặn cứng. Cả hai ca đều có đối chứng đỏ.'
  : '\n❌ ĐỎ — xem dòng ❌ ở trên.');
process.exit(datHet ? 0 : 1);
