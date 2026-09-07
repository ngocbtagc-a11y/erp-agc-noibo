/* HỒ LY · REV-0063 vòng 3 — soi hành vi MỚI của `capNutDongPhu()` (có GỠ nút),
 * trần `GO_TOI_DA`, ca nới-rồi-thu liên tục, hai bảng cùng vẽ lại, tốc độ,
 * và hình học nút `.dai-gon-btn` trong ô bảng (44px — đo bằng CẢ HAI cách).
 * KHÔNG sửa mã sản phẩm. Chỉ đọc và đo.
 */
import { dungMayGia, moChrome, TOI } from './lib/ban-do-chrome.mjs';

const MO_HET = `(function(){
  document.querySelectorAll('[hidden]').forEach(el => { if (!el.closest('template')) el.hidden = false; });
  return document.querySelectorAll('[hidden]').length;
})()`;

/* Chép ĐÚNG dòng mẫu của `do-bang-that.mjs` (CHU_DAI 200 ký tự · TEN_NGUOI) —
   không có dữ liệu thật thì mọi bảng rỗng và phép đo nói dối. */
const CHU_DAI = 'Rà soát toàn bộ tồn kho hàng nhập khẩu quý 3, đối chiếu số liệu giữa ' +
  'phần mềm và kiểm kê thực tế tại kho Hà Nội, lập biên bản chênh lệch gửi Kế toán trưởng ' +
  'trước ngày 15 và gửi bản mềm cho chị Hằng ok';
const TEN_NGUOI = 'Nguyễn Thị Huyền (Vận hành sàn Shopee & TikTok)';
const CHEN_DONG_THAT = `(function(){
  const DAI = ${JSON.stringify(CHU_DAI)};
  const TEN = ${JSON.stringify(TEN_NGUOI)};
  let dem = 0;
  document.querySelectorAll('table').forEach(t => {
    const tb = t.tBodies[0]; if (!tb || tb.rows.length) return;
    const ths = [...t.querySelectorAll('thead th')];
    if (!ths.length) return;
    const tr = document.createElement('tr');
    tr.dataset.dongMau = '1';
    ths.forEach(th => {
      const td = document.createElement('td');
      const nhan = th.textContent.trim().toLowerCase();
      if (!nhan) { td.innerHTML = '<button class="btn-nho">Xem</button>'; }
      else if (th.classList.contains('num')) { td.className = 'num'; td.textContent = '1.234.567'; }
      else if (/việc|đầu ra|mô tả|ghi chú|nội dung|kết quả|lý do|tiêu đề|sản phẩm|mục tiêu|kỹ năng|thay đổi|đo bằng|khách hàng|tên/.test(nhan)) td.textContent = DAI;
      else if (/người|nhận|giao|thực hiện|phối|nhân sự|giữ|xác nhận|đối tác|hủy/.test(nhan)) td.textContent = TEN;
      else td.textContent = '29/08/2026';
      tr.appendChild(td);
    });
    tb.appendChild(tr); dem++;
  });
  return dem;
})()`;

/* Đếm nút: THẬT (ô còn kẹp) vs NÓI DỐI (ô đã hết kẹp mà nút vẫn còn) */
const DEM = `(function(){
  let that = 0, noiDoi = 0, doan = 0, kepKhongNut = 0, tongSm = 0;
  const soGo = {};
  for (const sm of document.querySelectorAll('td.cot-chu .sm, td .sm.dong-phu')) {
    if (sm.classList.contains('dai-gon-mo')) continue;
    tongSm++;
    const ke = sm.nextElementSibling;
    const nut = ke && ke.classList.contains('dai-gon-btn') ? ke : null;
    const kep = sm.scrollHeight > sm.clientHeight + 1;
    if (nut && nut.dataset.doan) doan++;
    else if (nut && kep) that++;
    else if (nut && !kep) noiDoi++;
    else if (!nut && kep) kepKhongNut++;
    const g = sm.dataset.soGo || '0'; soGo[g] = (soGo[g] || 0) + 1;
  }
  return { that, noiDoi, doan, kepKhongNut, tongSm, soGo };
})()`;

const NOI = `(function(){
  let s = document.getElementById('holy-noi');
  if (!s) { s = document.createElement('style'); s.id = 'holy-noi'; document.head.appendChild(s); }
  s.textContent = '.kd-sku-cot { display: block !important; }';
  const d = document.createElement('span'); d.id='holy-cham'; document.body.appendChild(d); d.remove();
  return true;
})()`;
const THU = `(function(){
  const s = document.getElementById('holy-noi'); if (s) s.textContent = '';
  const d = document.createElement('span'); d.id='holy-cham'; document.body.appendChild(d); d.remove();
  return true;
})()`;

/* ⚠️ PHẢI CUỘN NÚT VÀO KHUNG NHÌN TRƯỚC KHI `elementFromPoint`.
   Bản đầu của chính bàn đo này quên, và mọi nút nằm dưới nếp gấp trả về `null`
   — tôi suýt đọc thành "có thứ che nút". `elementFromPoint` chấm theo toạ độ
   KHUNG NHÌN, ngoài khung nhìn là null, không phải bị che. */
const HINH_HOC_NUT = `(function(){
  const ra = [];
  for (const nut of document.querySelectorAll('td .dai-gon-btn')) {
    nut.scrollIntoView({ block: 'center' });
    const r = nut.getBoundingClientRect();
    if (r.width === 0) continue;
    const td = nut.closest('td'), tr = nut.closest('tr');
    const rt = td.getBoundingClientRect(), rr = tr.getBoundingClientRect();
    const cs = getComputedStyle(nut);
    const gx = Math.round(r.left + r.width/2), gy = Math.round(r.top + r.height/2);
    const tren = document.elementFromPoint(gx, gy);
    // bốn mép trong hộp — vùng chạm thật
    const goc = [[r.left+2, r.top+2],[r.right-2, r.top+2],[r.left+2, r.bottom-2],[r.right-2, r.bottom-2]]
      .map(([x,y]) => { const e = document.elementFromPoint(Math.round(x), Math.round(y)); return e === nut || nut.contains(e); });
    // nút có thò sang DÒNG KẾ TIẾP không
    const trSau = tr.nextElementSibling;
    let deDongSau = false, chongLan = 0;
    if (trSau) { const rs = trSau.getBoundingClientRect();
      chongLan = Math.max(0, r.bottom - rs.top); deDongSau = chongLan > 0; }
    const sm = nut.previousElementSibling;
    let deChu = 0;
    if (sm && sm.classList.contains('sm')) { const rsm = sm.getBoundingClientRect(); deChu = Math.max(0, rsm.bottom - r.top); }
    ra.push({ ma: (td.closest('table').tBodies[0]||{}).id || '?',
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      minH: cs.minHeight, mt: cs.marginTop, mb: cs.marginBottom, pad: cs.padding, disp: cs.display,
      caoDong: +rr.height.toFixed(1),
      thoDayO: +Math.max(0, r.bottom - rt.bottom).toFixed(1),
      cachMepTrai: +(r.left - rt.left).toFixed(1),
      giuaLaChinhNo: tren === nut || nut.contains(tren),
      tenTren: tren ? (tren.className || tren.tagName) : null,
      bonGoc: goc.filter(Boolean).length, deDongSau, chongLan: +chongLan.toFixed(1), deChu: +deChu.toFixed(1) });
  }
  return ra;
})()`;

/* Nhồi 300 dòng rồi ĐO TỐC ĐỘ vẽ lại (gồm cả vòng gỡ nút mới) */
const NHOI_VA_DO = `(async function(){
  const tb = document.getElementById('kd-sku-kem'); if (!tb) return { loi: 'không có kd-sku-kem' };
  const mau = tb.rows[0] ? tb.rows[0].outerHTML : null; if (!mau) return { loi: 'bảng rỗng' };
  let h = ''; for (let i = 0; i < 300; i++) h += mau;
  const t0 = performance.now();
  tb.insertAdjacentHTML('beforeend', h);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const t1 = performance.now();
  const sm = document.querySelectorAll('#kd-sku-kem .sm').length;
  const nut = document.querySelectorAll('#kd-sku-kem .dai-gon-btn').length;
  // đo riêng một lượt vẽ lại NỮA (đã ổn định, chỉ còn phí của vòng quét+gỡ)
  const t2 = performance.now();
  const d = document.createElement('span'); document.body.appendChild(d); d.remove();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const t3 = performance.now();
  return { chenVaVeLai: +(t1-t0).toFixed(1), veLaiLan2: +(t3-t2).toFixed(1), sm, nut };
})()`;

/* NUÔI BẢNG SKU BẰNG DỮ LIỆU NGÀNH THẬT — tên hàng nhập khẩu dài đúng kiểu
   Onfod/Alpha Green gõ. Không có cái này thì `.sm` không ra đời và mọi phép đo
   về `capNutDongPhu()` đo trên một màn hình trống. */
const TEN_DAI = 'Hạnh nhân Mỹ nguyên vỏ rang mộc không muối nhập khẩu California hũ 500g — lô nhập tháng 8/2026';
const API_SKU = (duong, u, traJson) => {
  if (duong === '/api/toi-la-ai') { traJson({ ...TOI, la_admin: true, quyen: [...TOI.quyen, 'kinhdoanh'] }); return true; }
  if (duong === '/api/kinh-doanh/xep-hang-sku') {
    const hang = (i, ten, sl) => ({ sku: 'AGC-NK-' + String(1000 + i), ten, so_luong: sl, doanh_thu: 9876543210 });
    traJson({ co_bang: true, nguon_xep_hang: 'don_hang', so_ma_hang: 120, so_ma_ban_duoc: 96,
      ky: { nhan: 'Tháng 8/2026' },
      ban_chay: [hang(1, TEN_DAI, 412), hang(2, TEN_DAI + ' loại 2', 388), hang(3, 'Óc chó Chile', 300)],
      ban_kem: [hang(4, TEN_DAI, 3), hang(5, TEN_DAI + ' loại 2', 1), hang(6, 'Nho khô Úc', 0)] });
    return true;
  }
  return false;
};

const RONGS = [1440, 1280, 1024, 375];
const may = await dungMayGia({ tatHoatAnh: true, apiRieng: API_SKU });
const doi = (cr, n = 2) => cr.chay(`(async function(){ for (let i=0;i<${n};i++) await new Promise(r=>requestAnimationFrame(r)); return 1; })()`);

for (const RONG of RONGS) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(MO_HET);
  const soChen = await cr.chay(CHEN_DONG_THAT);
  await cr.doi(900);
  console.log(`(chèn dòng thật vào ${soChen} bảng)`);
  console.log(`\n══════════════ ${RONG}px ══════════════`);
  const nen = await cr.chay(DEM);
  console.log(`  NỀN   : nút thật ${nen.that} · NÓI DỐI ${nen.noiDoi} · đoán ${nen.doan} · kẹp-mà-không-nút ${nen.kepKhongNut} · tổng ô .sm ${nen.tongSm}`);

  if (RONG >= 1024) {
    console.log('  --- CA NỚI RỒI THU LIÊN TỤC (trần GO_TOI_DA = 2) ---');
    for (let v = 1; v <= 5; v++) {
      await cr.chay(NOI);  await doi(cr, 3); await cr.doi(120);
      const a = await cr.chay(DEM);
      await cr.chay(THU);  await doi(cr, 3); await cr.doi(120);
      const b = await cr.chay(DEM);
      console.log(`   vòng ${v}: NỚI → thật ${a.that} · nói dối ${a.noiDoi} · kẹp-không-nút ${a.kepKhongNut}` +
                  `   ‖ THU → thật ${b.that} · nói dối ${b.noiDoi} · kẹp-không-nút ${b.kepKhongNut}` +
                  `   soGo=${JSON.stringify(b.soGo)}`);
    }
  }

  const hh = await cr.chay(HINH_HOC_NUT);
  console.log(`  --- HÌNH HỌC ${hh.length} nút .dai-gon-btn trong ô bảng ---`);
  const xau = hh.filter(x => x.h < 44 || x.bonGoc < 4 || !x.giuaLaChinhNo || x.deDongSau);
  for (const x of hh.slice(0, 4))
    console.log(`   ${x.ma.padEnd(14)} hộp ${x.w}×${x.h} (min-height ${x.minH}, lề ${x.mt}/${x.mb}, ${x.disp})` +
      ` · dòng cao ${x.caoDong} · thò đáy ô ${x.thoDayO} · mép trái +${x.cachMepTrai}` +
      ` · giữa=chính nó ${x.giuaLaChinhNo} · 4 góc chạm ${x.bonGoc}/4 · đè chữ ${x.deChu}px · đè dòng sau ${x.chongLan}px`);
  if (hh.length > 4) console.log(`   … còn ${hh.length - 4} nút`);
  console.log(`   ➤ nút DƯỚI 44px hoặc chạm hụt hoặc đè dòng sau: ${xau.length}/${hh.length}`);
  for (const x of xau.slice(0, 5)) console.log(`      ❌ ${x.ma} ${x.w}×${x.h} góc ${x.bonGoc}/4 giữa=${x.giuaLaChinhNo}(${x.tenTren}) đèDòngSau ${x.chongLan}px`);

  if (RONG === 1440) {
    const t = await cr.chay(NHOI_VA_DO);
    console.log(`  --- TỐC ĐỘ (nhồi 300 dòng vào kd-sku-kem) --- ${JSON.stringify(t)}`);
  }
  cr.dong();
}
may.dong();
console.log('\nXONG.');
