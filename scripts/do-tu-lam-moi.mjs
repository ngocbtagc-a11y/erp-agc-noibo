/* ==========================================================================
   BÀN ĐO "MÀN HÌNH TỰ LÀM MỚI"
   ---------------------------------------------------------------------------
   GÓP Ý GỐC (Sếp Ngọc 03/09/2026): *"đã duyệt hoàn thành mà nó vẫn hiện ở
   đây"* — bấm Duyệt, máy chủ ghi đúng, màn hình vẫn kể việc cũ tới khi F5.

   LỚP VẤN ĐỀ: mọi chỗ bấm một nút làm ĐỔI DỮ LIỆU mà danh sách / con số trên
   màn hình không tự vẽ lại. Bàn đo này canh CẢ LỚP, không canh một nút.

   BẢY CÂU HỎI
     ① Mọi hàm GHI trong `api.js` có khai nhóm dữ liệu chưa? (quên = chỗ thứ
        123 sẽ lại im lặng hỏng — đúng cách lỗi này sinh ra)
     ② Nhóm nào khai rồi mà KHÔNG màn nào nghe? (bắn vào hư không)
     ③ Đoạn bọc phát tín hiệu còn nguyên trong `api.js` không?
     ④ TRÌNH DUYỆT THẬT: gọi một hàm ghi → khối việc + CHUÔNG có tự nạp lại
        trong nửa giây, KHÔNG F5? (chuông = "rổ B", chỗ dễ bỏ sót nhất)
     ⑤ Không nạp CHỒNG CHÉO: một cú bấm → mỗi đường API đúng MỘT lượt.
     ⑥ Tab đang ẨN thì KHÔNG nạp (khỏi đốt lượt đọc D1), và mở tab ra thì nạp.
     ⑦ Đang gõ dở thì HOÃN, chữ còn nguyên; rời ô là nạp.

     ⑧ ĐỐI CHỨNG — chạy lại ca ④ trên bản đã GỠ đoạn bọc. Ca này mà vẫn xanh
        thì bàn đo đang mù, và phải sửa bàn đo chứ không phải mừng.

   Chạy:  npm run do-tu-lam-moi      (mã thoát 0 = đạt)
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';

let dat = 0, truot = 0;
function ok(ten, dung, chiTiet = '') {
  if (dung) { dat++; console.log(`  ✅ ${ten}` + (chiTiet ? `  — ${chiTiet}` : '')); }
  else { truot++; console.log(`  ❌ ${ten}` + (chiTiet ? `  — ${chiTiet}` : '')); }
}

/* ==========================================================================
   PHẦN A — ĐỌC MÃ NGUỒN
   ========================================================================== */
const apiSrc = readFileSync(join(GOC, 'public/assets/js/api.js'), 'utf8');
const busSrc = readFileSync(join(GOC, 'public/assets/js/lam-moi.js'), 'utf8');
const appSrc = readFileSync(join(GOC, 'public/assets/js/app.js'), 'utf8');

/** Mọi khoá cấp 1 của `export const API = {…}` cùng thân của nó. */
function docAPI() {
  const than = apiSrc.slice(apiSrc.indexOf('export const API = {'));
  const ds = [];
  let ten = null, buf = '';
  for (const d of than.split(/\r?\n/)) {
    const m = d.match(/^ {2}([A-Za-z0-9_]+):/);
    if (m) { if (ten) ds.push([ten, buf]); ten = m[1]; buf = d; }
    else if (ten) buf += '\n' + d;
    if (/^};/.test(d)) break;
  }
  if (ten) ds.push([ten, buf]);
  return ds;
}

const HAM_API = docAPI();
const HAM_GHI = HAM_API.filter(([, b]) => /method:\s*'(POST|PUT|PATCH|DELETE)'/.test(b)).map(([t]) => t);

/** Khoá cấp 1 của một object đã `export const TEN = { … };` trong lam-moi.js */
function docBang(ten) {
  const i = busSrc.indexOf(`export const ${ten} = {`);
  if (i < 0) return null;
  const doan = busSrc.slice(i, busSrc.indexOf('\n};', i));
  return doan.split(/\r?\n/)
    .map(d => d.match(/^ {2}([A-Za-z0-9_]+):/))
    .filter(Boolean).map(m => m[1]);
}

console.log('\n① MỌI HÀM GHI PHẢI KHAI NHÓM DỮ LIỆU');
const NHOM = docBang('NHOM_DU_LIEU');
const MIEN = docBang('MIEN_TRU');
ok('đọc được hai bảng trong lam-moi.js', !!NHOM && !!MIEN,
  NHOM && MIEN ? `${NHOM.length} hàm có nhóm · ${MIEN.length} hàm miễn trừ` : 'THIẾU');

const thieu = HAM_GHI.filter(t => !(NHOM || []).includes(t) && !(MIEN || []).includes(t));
ok(`${HAM_GHI.length} hàm ghi đều đã khai`, thieu.length === 0,
  thieu.length ? 'CHƯA KHAI: ' + thieu.join(', ') +
    ' → thêm vào NHOM_DU_LIEU (hoặc MIEN_TRU kèm lý do) trong public/assets/js/lam-moi.js'
  : 'không sót hàm nào');

// Khai thừa cũng là lỗi: tên gõ sai thì tín hiệu không bao giờ bắn.
const thua = [...(NHOM || []), ...(MIEN || [])].filter(t => !HAM_GHI.includes(t));
ok('không khai thừa tên hàm không tồn tại / không phải hàm ghi', thua.length === 0,
  thua.length ? 'THỪA: ' + thua.join(', ') : 'khớp đúng danh sách hàm ghi');

// Miễn trừ phải có LÝ DO bằng chữ, không được để rỗng.
const mienRong = (MIEN || []).filter(t => {
  const m = busSrc.match(new RegExp(`^ {2}${t}:\\s*(.*)$`, 'm'));
  return !m || m[1].replace(/['"+,\s]/g, '').length < 20;
});
ok('mỗi hàm miễn trừ đều ghi rõ lý do', mienRong.length === 0,
  mienRong.length ? 'THIẾU LÝ DO: ' + mienRong.join(', ') : `${(MIEN || []).length} lý do đều có chữ`);

console.log('\n② NHÓM NÀO CŨNG PHẢI CÓ MÀN NGHE');
const nhomKhai = new Set();
{
  const i = busSrc.indexOf('export const NHOM_DU_LIEU = {');
  const doan = busSrc.slice(i, busSrc.indexOf('\n};', i));
  for (const m of doan.matchAll(/'([a-z_]+)'/g)) nhomKhai.add(m[1]);
}
const nhomNghe = new Set();
for (const m of appSrc.matchAll(/ngheDuLieu\(\s*(\[[^\]]*\]|'[a-z_]+')/g)) {
  for (const x of m[1].matchAll(/'([a-z_]+)'/g)) nhomNghe.add(x[1]);
}
const bangHuVo = [...nhomKhai].filter(n => !nhomNghe.has(n));
ok(`${nhomKhai.size} nhóm dữ liệu đều có ít nhất một màn nghe`, bangHuVo.length === 0,
  bangHuVo.length ? 'BẮN VÀO HƯ VÔ: ' + bangHuVo.join(', ') : [...nhomKhai].sort().join(' · '));

ok('nhóm `thong_bao` (chuông 🔔 — "rổ B") có màn nghe', nhomNghe.has('thong_bao'),
  nhomNghe.has('thong_bao') ? 'chuông tự nạp lại sau mỗi lần ghi' : 'CHUÔNG VẪN CHỜ 5 PHÚT');

console.log('\n③ ĐOẠN BỌC PHÁT TÍN HIỆU CÒN NGUYÊN');
ok('api.js còn gọi baoDuLieuDoi sau khi ghi thành công',
  /baoDuLieuDoi\(nhom\)/.test(apiSrc) && /NHOM_DU_LIEU\[ten\]/.test(apiSrc));

/* ==========================================================================
   PHẦN B — TRÌNH DUYỆT THẬT
   Bàn thử chứng minh logic đúng; chỉ trình duyệt mới chứng minh tính năng
   còn sống (docs/BAI-HOC.md).
   ========================================================================== */

const QUYEN = ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu',
               'khovan', 'kinhdoanh', 'ketoan', 'taisan', 'xepca', 'donhoan',
               'khotailieu', 'quantri', 'congviec', 'muctieu'];

/** Mở một phiên đo: trả về { cr, may, dem, datLai } — `dem` đếm lượt gọi API. */
async function moPhien({ goBoc = false } = {}) {
  const dem = new Map();
  const may = await dungMayGia({
    tatHoatAnh: true,
    suaTep: (s, f) => {
      if (f === 'assets/js/app.js') {
        // Cửa thử: đưa API + đài ra window để lái được từ bàn đo.
        return s + `\nwindow.__API = API;\nwindow.__DAI = { ngheDuLieu, lamMoiManVuaMo };\n`
          + `\nimport('./lam-moi.js').then(m => { window.__SO_LUOT = m.soLuot; });\n`;
      }
      if (f === 'assets/js/api.js' && goBoc) {
        // ĐỐI CHỨNG: gỡ đúng một dòng — không bắn tín hiệu nữa.
        return s.replace('baoDuLieuDoi(nhom);', '/* ĐỐI CHỨNG: đã gỡ tín hiệu */');
      }
      return s;
    },
    apiRieng: (duong, u, traJson) => {
      dem.set(duong, (dem.get(duong) || 0) + 1);
      if (duong === '/api/toi-la-ai') {
        return traJson({
          ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
          phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
          trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: 1,
          them_nhan_su: 1, quyen: QUYEN, shopee: { xem: 1 }
        }) || true;
      }
      if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
      if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
      if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
      if (duong === '/api/muc-tieu/danh-sach')
        return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
      // Các đường có KHOÁ RIÊNG mà ổ trả lời chung của thư viện không có sẵn.
      if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
      if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach: [] }) || true;
      if (duong === '/api/kinh-doanh/don-hang-huy') return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
      if (duong === '/api/ke-toan/can-tra-soat') return traJson({ can_tra_soat: [] }) || true;
      if (duong === '/api/ke-toan/hang-hong') return traJson({ hang_hong: [] }) || true;
      if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 1 } }) || true;
      if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
      if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
      if (duong === '/api/thong-bao/da-xem') return traJson({ ok: true }) || true;
      return false;     // còn lại để ổ trả lời chung của thư viện lo
    }
  });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3000 });
  return {
    cr, may, dem,
    datLai() { dem.clear(); },
    lay: (d) => dem.get(d) || 0,
    dong() { cr.dong(); may.dong(); }
  };
}

console.log('\n④ TRÌNH DUYỆT THẬT · ghi xong màn có TỰ nạp lại không (không F5)');
const p = await moPhien();
{
  const loiNang = [...p.cr.ngoaiLe, ...p.cr.loiConsole.filter(l => !/favicon|404/.test(l))];
  ok('trang nạp xong không ngoại lệ', loiNang.length === 0, loiNang[0] || 'sạch');

  p.datLai();
  await p.cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong')`);
  await p.cr.doi(600);

  ok('④a khối "Việc của tôi hôm nay" tự nạp lại', p.lay('/api/cong-viec/hom-nay') === 1,
    `gọi /api/cong-viec/hom-nay ${p.lay('/api/cong-viec/hom-nay')} lượt (cần đúng 1)`);
  ok('④b CHUÔNG 🔔 tự nạp lại — RỔ B', p.lay('/api/thong-bao') === 1,
    `gọi /api/thong-bao ${p.lay('/api/thong-bao')} lượt (cần đúng 1)`);
  ok('④c thẻ tóm tắt + mục tiêu tự nạp lại', p.lay('/api/muc-tieu/danh-sach') >= 1,
    `gọi /api/muc-tieu/danh-sach ${p.lay('/api/muc-tieu/danh-sach')} lượt`);

  console.log('\n⑤ KHÔNG NẠP CHỒNG CHÉO');
  const chong = [...p.dem.entries()].filter(([d, n]) => n > 1 && d !== '/api/chat/tin-nhan'
    && d !== '/api/chat/chua-doc' && d !== '/api/chat/gan-day');
  ok('mỗi đường API chỉ bị gọi đúng 1 lượt cho 1 cú bấm', chong.length === 0,
    chong.length ? chong.map(([d, n]) => `${d}×${n}`).join(' · ')
                 : [...p.dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · '));

  console.log('\n⑥ TAB ĐANG ẨN THÌ NGỦ (giữ lượt đọc D1), MỞ RA THÌ NẠP');
  ok('⑥a Tài sản đang ẩn → KHÔNG gọi máy chủ', p.lay('/api/tai-san') === 0,
    `/api/tai-san bị gọi ${p.lay('/api/tai-san')} lượt`);

  p.datLai();
  await p.cr.chay(`window.__API.taiSanSua({ id: 1, ten: 'x' })`);
  await p.cr.doi(400);
  const nguYen = p.lay('/api/tai-san');
  await p.cr.chay(`(() => { const b = document.querySelector('.sb-item[data-tab="taisan"]'); if (b) b.click(); })()`);
  await p.cr.doi(500);
  ok('⑥b ghi tài sản khi đang ở tab khác → ngủ, chưa gọi', nguYen === 0, `${nguYen} lượt`);
  ok('⑥c mở tab Tài sản ra → nạp lại ngay', p.lay('/api/tai-san') >= 1,
    `${p.lay('/api/tai-san')} lượt sau khi mở tab`);

  console.log('\n⑦ ĐANG GÕ DỞ THÌ KHÔNG MẤT CHỮ');
  await p.cr.chay(`(() => { const b = document.querySelector('.sb-item[data-tab="tongquan"]'); if (b) b.click(); })()`);
  await p.cr.doi(300);
  /* Ô "#vd-noidung" (lời khen ở khu Vinh danh) nằm THẬT SỰ trong `#v-tongquan`
     — đúng vùng mà `taiLaiVinhDanh` vẽ lại. Chọn ô nằm ngoài vùng thì phép đo
     xanh mà chẳng chứng minh được gì. */
  const coO = await p.cr.chay(`(() => {
    const o = document.querySelector('#vd-noidung');
    if (!o) return false;
    // Mở HẾT các lớp cha đang ẩn (form gập lại nhiều tầng) — còn một lớp ẩn
    // là focus() không ăn, và phép đo sẽ nói dối.
    for (let k = o.closest('[hidden]'); k; k = o.closest('[hidden]')) k.hidden = false;
    o.value = 'Đang gõ dở — không được mất chữ này';
    o.focus();
    return document.activeElement === o
        && document.getElementById('v-tongquan').contains(o);
  })()`);
  p.datLai();
  await p.cr.chay(`window.__API.vdGui('NS-DUY', 'khen', 3)`);
  await p.cr.doi(300);      // ngắn hơn nhịp canh 500ms, để đo ĐÚNG lúc đang hoãn
  const hoan = p.lay('/api/vinh-danh');
  const soLuot = await p.cr.chay(`JSON.stringify(window.__SO_LUOT ? window.__SO_LUOT() : {})`);
  const oDangFocus = await p.cr.chay(`document.activeElement && document.activeElement.id`);
  const conChu = await p.cr.chay(`document.querySelector('#vd-noidung').value`);
  ok('⑦a đặt được con trỏ vào ô đang gõ, ô nằm trong vùng sẽ bị vẽ lại', coO === true, String(coO));
  ok('⑦b đang gõ → HOÃN nạp lại ĐÚNG vùng đó', hoan === 1,
    `/api/vinh-danh: ${hoan} lượt (1 = lượt GỬI, chưa có lượt nạp lại) · ` +
    `con trỏ ở "${oDangFocus}" · đài: ${soLuot}`);
  ok('⑦c chữ đang gõ còn NGUYÊN', conChu === 'Đang gõ dở — không được mất chữ này', String(conChu));
  ok('⑦d hoãn ĐÚNG người, không hoãn cả làng — chuông vẫn nạp',
    p.lay('/api/thong-bao') === 1, `/api/thong-bao: ${p.lay('/api/thong-bao')} lượt`);

  await p.cr.chay(`document.querySelector('#vd-noidung').blur()`);
  await p.cr.doi(800);
  ok('⑦e rời ô là nạp nốt, không bỏ quên', p.lay('/api/vinh-danh') >= 2,
    `/api/vinh-danh: ${p.lay('/api/vinh-danh')} lượt sau khi rời ô`);
}
p.dong();

console.log('\n⑧ ĐỐI CHỨNG — gỡ đúng một dòng tín hiệu, bàn đo PHẢI bắt được');
const d = await moPhien({ goBoc: true });
{
  d.datLai();
  await d.cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong')`);
  await d.cr.doi(600);
  const hn = d.lay('/api/cong-viec/hom-nay'), tb = d.lay('/api/thong-bao');
  ok('bản GỠ TÍN HIỆU → khối việc IM RE (đúng bệnh Sếp gặp)', hn === 0, `${hn} lượt`);
  ok('bản GỠ TÍN HIỆU → chuông cũng IM RE', tb === 0, `${tb} lượt`);
  if (hn > 0 || tb > 0) console.log('     ⚠️  Ca đối chứng mà vẫn nạp lại nghĩa là BÀN ĐO ĐANG MÙ — sửa bàn đo trước.');
}
d.dong();

console.log(`\n══════════════════════════════════════════\nĐẠT ${dat} · TRƯỢT ${truot}\n`);
process.exit(truot ? 1 : 0);
