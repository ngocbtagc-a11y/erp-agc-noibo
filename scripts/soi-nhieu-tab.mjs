/* ==========================================================================
   BÀN SOI ĐỘC LẬP — NHIỀU TAB ERP  (Hồ Ly, REV-0057 vòng 2)
   ---------------------------------------------------------------------------
   `BroadcastChannel('agc-lam-moi')` là TÍNH NĂNG MỚI, chưa ai soi. Bàn đo của
   Khỉ Đột chỉ có ca HAI tab, cùng một người dùng, cùng đứng ở Tổng quan. Sáu
   câu dưới đây là những chỗ kiểu vá này hay chết:

     A. BA và BỐN tab thì sao — mỗi tab một lượt, hay bùng lên?
     B. Có DỘI QUA DỘI LẠI không (tab A báo B, B báo lại A, vô tận)?
     C. Tab đang ẨN (người dùng đang xem tab khác của TRÌNH DUYỆT) có ngủ thật
        không? Lời khai: "tab ẩn vẫn ngủ nên không tốn thêm lượt đọc".
     D. Tab ở màn KHÁC (Tài sản) có bị đánh thức oan không?
     E. TIN NHẮN chở gì? Nếu chở DỮ LIỆU thì hai tài khoản dùng chung một máy
        là rò dữ liệu. Đây là chỗ nguy nhất.
     F. Đóng tab đột ngột · hết phiên (401) · đăng xuất thì tab kia ra sao?

   Chạy:  node scripts/soi-nhieu-tab.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';

const QUYEN = ['tongquan', 'lichsuviec', 'chat', 'congviec', 'muctieu', 'taisan', 'nhansu'];
let choDuyet = 2;
let tra401 = false;
const dem = new Map();
const demTheoTab = [];            // đếm riêng theo `referer`, để biết tab nào gọi

function viec(i, tt) {
  return { id: i, tieu_de: 'Việc ' + i, trang_thai: tt, han_chot: null,
           nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy', nguoi_giao_id: TOI_ID };
}

const may = await dungMayGia({
  tatHoatAnh: true,
  suaTep: (s, f) => f === 'assets/js/app.js'
    ? s + `\nwindow.__API = API;\n` +
      `\nwindow.__TIN = [];\ntry { const k = new BroadcastChannel('agc-lam-moi');\n` +
      `  k.onmessage = (e) => { window.__TIN.push(JSON.stringify(e.data)); }; } catch {}\n`
    : s,
  apiRieng: (duong, u, traJson, req) => {
    dem.set(duong, (dem.get(duong) || 0) + 1);
    demTheoTab.push(duong);
    if (tra401 && duong !== '/api/toi-la-ai') { traJson({ loi: 'Hết phiên' }, 401); return true; }
    if (duong === '/api/toi-la-ai') return traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'nhan_vien', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
      la_admin: 0, phong_ban_quan_ly: [], them_nhan_su: 0, thao_tac_van_hanh: 0,
      quyen: QUYEN, shopee: null
    }) || true;
    if (duong === '/api/cong-viec/danh-sach') return traJson({
      nhan: [],
      giao: [viec(1, choDuyet >= 1 ? 'cho_duyet' : 'dang_lam'),
             viec(2, choDuyet >= 2 ? 'cho_duyet' : 'dang_lam')]
    }) || true;
    if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: choDuyet }) || true;
    if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
    if (duong === '/api/muc-tieu/danh-sach')
      return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
    if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 0 } }) || true;
    if (duong === '/api/nhan-su') return traJson({ nhan_su: [], xem_luong: false }) || true;
    return false;
  }
});

const URL_APP = `http://127.0.0.1:${may.cong}/app.html`;
const cr = await moChrome({ url: URL_APP, doiMs: 3000 });

/* ---- Mở thêm tab trong CÙNG một trình duyệt (BroadcastChannel cần vậy) ---- */
const tab = [{ ten: 'tab1', sid: null }];
async function moThemTab(ten) {
  const t = await cr.goi('Target.createTarget', { url: URL_APP });
  const { sessionId } = await cr.goi('Target.attachToTarget', { targetId: t.targetId, flatten: true });
  await cr.goi('Runtime.enable', {}, sessionId);
  await cr.doi(3200);
  const o = { ten, sid: sessionId, tid: t.targetId };
  tab.push(o);
  return o;
}
async function chayO(o, js) {
  if (!o.sid) return cr.chay(js);
  const r = await cr.goi('Runtime.evaluate',
    { expression: js, returnByValue: true, awaitPromise: true }, o.sid);
  if (r.exceptionDetails) return 'LỖI: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const theCho = (o) => chayO(o, `(() => {
  const b = document.querySelector('#tq-tomtat');
  if (!b) return 'KHÔNG CÓ Ô';
  for (const s of b.querySelectorAll('.stat')) {
    const k = s.querySelector('.k'), v = s.querySelector('.v');
    if (k && v && k.textContent.includes('Việc tôi giao')) return v.textContent.trim();
  }
  return '(không thấy thẻ)';
})()`);
const chuong = (o) => chayO(o, `(() => {
  const b = document.querySelector('#tb-so') || document.querySelector('.tb-so');
  return b ? (b.textContent || '').trim() : '(không có huy hiệu)';
})()`);

const bd = t => console.log(`\n──────── ${t}`);

/* ==========================================================================
   A · BỐN TAB — mỗi tab tốn thêm bao nhiêu lượt gọi?
   ========================================================================== */
bd('A · Bốn tab ERP cùng mở, bấm Duyệt ở tab 1');
await moThemTab('tab2'); await moThemTab('tab3'); await moThemTab('tab4');
console.log('   thẻ trước khi bấm:', (await Promise.all(tab.map(theCho))).join(' · '));

choDuyet = 0;
dem.clear(); demTheoTab.length = 0;
await chayO(tab[0], `window.__API.cvCapNhat(1,'hoan_thanh','xong').catch(()=>{})`);
await cr.doi(2000);
console.log('   thẻ SAU khi bấm  :', (await Promise.all(tab.map(theCho))).join(' · '),
  '   ', (await Promise.all(tab.map(theCho))).every(x => x === '0') ? '✔ cả 4 tab cùng đúng' : '❌ có tab kể số cũ');
const tong = [...dem.values()].reduce((a, b) => a + b, 0);
console.log(`   Lượt gọi máy chủ cho MỘT cú bấm với 4 tab: ${tong}`);
console.log('   ', [...dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · '));
console.log(`   ⇒ 1 tab tốn 6 lượt (đo ở ⑤). 4 tab tốn ${tong} → tăng ${(tong / 6).toFixed(1)} lần`);

/* ==========================================================================
   B · CÓ DỘI QUA DỘI LẠI KHÔNG
   ========================================================================== */
bd('B · Dội qua dội lại: mỗi tab NHẬN được mấy tin cho một cú bấm?');
for (const o of tab) {
  const n = await chayO(o, `window.__TIN ? window.__TIN.length : -1`);
  const noi = await chayO(o, `window.__TIN ? JSON.stringify(window.__TIN.slice(0,3)) : '[]'`);
  console.log(`   ${o.ten}: nhận ${n} tin   ${noi}`);
}
console.log('   ⇒ tab nào cũng nhận ĐÚNG 1 tin (tab bấm nhận 0 vì trình duyệt không tự gửi cho mình)');
console.log('     = KHÔNG dội lại. Nếu là vòng lặp thì số này sẽ tăng vô hạn.');

/* ==========================================================================
   C · TIN NHẮN CHỞ GÌ — chỗ nguy nhất
   ========================================================================== */
bd('C · Nội dung tin nhắn giữa các tab (rò dữ liệu?)');
const tin = await chayO(tab[1], `window.__TIN ? window.__TIN[0] : '(không có)'`);
console.log('   Nguyên văn:', tin);
const chiTen = /^\{"nhom":\["[a-z_",\s]+\]\}$/.test(String(tin || '').replace(/\s/g, ''));
console.log('   ⇒', chiTen
  ? '✔ CHỈ chở TÊN NHÓM (chuỗi thường), KHÔNG chở một byte dữ liệu nào.'
  : '⚠️ KIỂM TAY — tin có thứ khác ngoài tên nhóm');
console.log('     Tab nhận tự gọi máy chủ bằng CHÍNH cookie phiên của nó, nên máy chủ');
console.log('     vẫn là chỗ quyết ai được xem gì. Đây là thiết kế đúng.');

/* ==========================================================================
   D · TAB Ở MÀN KHÁC CÓ BỊ ĐÁNH THỨC OAN KHÔNG
   ========================================================================== */
bd('D · tab4 chuyển sang màn Tài sản, rồi bấm Duyệt ở tab1');
await chayO(tab[3], `document.querySelector('.sb-item[data-tab="taisan"]')?.click()`);
await cr.doi(600);
choDuyet = 2;
dem.clear();
await chayO(tab[0], `window.__API.cvCapNhat(1,'cho_duyet','x').catch(()=>{})`);
await cr.doi(1800);
console.log('   Lượt gọi:', [...dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · '));
const dsTab4 = await chayO(tab[3], `(() => { const o = document.querySelector('#v-taisan'); return o && !o.hidden ? 'đang ở Tài sản' : 'không'; })()`);
console.log('   tab4 đang ở:', dsTab4, '· /api/cong-viec/danh-sach:', dem.get('/api/cong-viec/danh-sach') || 0,
  '(4 tab, 1 tab ở màn khác → nếu là 3 thì tab4 đã ngủ đúng)');

/* ==========================================================================
   E · TAB ẨN CỦA TRÌNH DUYỆT — lời khai "tab ẩn vẫn ngủ"
   ========================================================================== */
bd('E · Tab ẩn của TRÌNH DUYỆT (không phải tab trong ứng dụng)');
const anGiau = await chayO(tab[1], `JSON.stringify({
  hidden: document.hidden,
  visibility: document.visibilityState,
  offsetParent_conNull: document.querySelector('#v-tongquan') ? (document.querySelector('#v-tongquan').offsetParent === null) : null,
  soHinhChuNhat: document.querySelector('#v-tongquan') ? document.querySelector('#v-tongquan').getClientRects().length : null
})`);
console.log('   tab2 (đang ở nền):', anGiau);
console.log('   ⇒ `hienThi()` trong lam-moi.js dùng offsetParent + getClientRects — hai thứ này');
console.log('     KHÔNG biết tab trình duyệt đang ẩn. Xem con số ở mục A để biết giá thật.');

/* ==========================================================================
   F · HẾT PHIÊN / ĐÓNG TAB ĐỘT NGỘT
   ========================================================================== */
bd('F · Đóng tab đột ngột rồi bấm tiếp');
try { await cr.goi('Target.closeTarget', { targetId: tab[3].tid }); } catch { /* kệ */ }
tab.pop();
await cr.doi(500);
choDuyet = 0;
dem.clear();
const loiTruoc = cr.loiConsole.length + cr.ngoaiLe.length;
await chayO(tab[0], `window.__API.cvCapNhat(1,'hoan_thanh','xong').catch(()=>{})`);
await cr.doi(1500);
console.log('   Sau khi đóng 1 tab, còn 3 tab:',
  [...dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · '));
console.log('   thẻ:', (await Promise.all(tab.map(theCho))).join(' · '));
console.log('   lỗi console mới phát sinh:', cr.loiConsole.length + cr.ngoaiLe.length - loiTruoc);

bd('F2 · Hết phiên (401) ở tab kia');
tra401 = true;
choDuyet = 2;
dem.clear();
await chayO(tab[0], `window.__API.cvCapNhat(1,'cho_duyet','x').catch(()=>{})`);
await cr.doi(2500);
for (const o of tab) {
  const url = await chayO(o, `location.pathname`);
  console.log(`   ${o.ten} đang ở trang: ${url}` +
    (String(url).includes('index.html') ? '   ✔ bị đá về màn đăng nhập (đúng)' : ''));
}
tra401 = false;

const loi = [...cr.ngoaiLe, ...cr.loiConsole.filter(l => !/favicon|404|Hết phiên|401/.test(l))];
console.log('\nNgoại lệ / console lỗi (đã lọc 401 cố ý):', loi.length ? loi.slice(0, 4).join(' | ') : 'sạch');

cr.dong(); may.dong();
