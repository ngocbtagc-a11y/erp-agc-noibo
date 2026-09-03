/* ==========================================================================
   BÀN ĐO "MÀN HÌNH TỰ LÀM MỚI"
   ---------------------------------------------------------------------------
   GÓP Ý GỐC (Sếp Ngọc 03/09/2026): *"đã duyệt hoàn thành mà nó vẫn hiện ở
   đây"* — bấm Duyệt, máy chủ ghi đúng, màn hình vẫn kể việc cũ tới khi F5.

   LỚP VẤN ĐỀ: mọi chỗ bấm một nút làm ĐỔI DỮ LIỆU mà danh sách / con số trên
   màn hình không tự vẽ lại. Bàn đo này canh CẢ LỚP, không canh một nút.

   ĐÃ MỞ MẮT SAU REV-0057 — Hồ Ly gài ba lỗi, bản đầu chỉ bắt được một:
     · Ca "không nạp chồng chéo" trước đây gọi thẳng `API.x()` rồi đếm. Nhưng
       phép chống chồng chéo CHỈ ăn ở ĐƯỜNG NÚT THẬT ("ghi xong rồi GỌI TAY
       hàm làm mới"). Ca ⑤ nay đi đúng đường đó.
     · Thêm ca ⑨: ghi HỎNG (500) thì không được bắn tín hiệu.
     · Thêm ca ⑧: rời tab rồi quay lại — đo bằng CON SỐ THẬT trên thẻ, không
       đo bằng số lượt gọi. Đây là chỗ thiếu `await` ở `lamMoiManVuaMo` làm
       thẻ tóm tắt nói dối mà đếm-lượt-gọi không thấy.
     · `QUYEN` thêm `dulieunen` — thiếu nó thì `khoiDongDuLieuNen()` không
       chạy, và 4 người nghe chưa từng được đo lần nào.
     · Thêm phép soi TĨNH cho lớp "đối số rơi vào hư không" — đúng lớp đã làm
       hai tuỳ chọn `goc` rơi vào `Array.filter` và `veBang` mà không ai kêu.

   MƯỜI CÂU HỎI
     ① Mọi hàm GHI trong `api.js` có khai nhóm dữ liệu chưa?
     ② Nhóm nào khai rồi mà KHÔNG màn nào nghe? (bắn vào hư không)
     ③ Bọc còn nguyên · chỉ bắn ở nhánh THÀNH CÔNG · mọi `chay(n)` đều `await`
        · không tuỳ chọn nào rơi vào hàm không nhận nó.
     ④ TRÌNH DUYỆT THẬT: ghi xong → khối việc + CHUÔNG + THẺ tự đúng, không F5.
     ⑤ ĐƯỜNG NÚT THẬT: ghi + gọi tay hàm làm mới → đúng 6 lượt, không nhân đôi.
     ⑥ Tab đang ẨN thì không nạp; mở tab ra thì nạp.
     ⑦ Đang gõ dở thì hoãn ĐÚNG vùng đó, chữ còn nguyên, rời ô là nạp nốt.
     ⑧ ĐÁNH THỨC: rời tab rồi quay lại → CON SỐ trên thẻ tóm tắt phải đúng.
     ⑨ Ghi HỎNG (500) → 0 lượt gọi thêm.
     ⑩ BA CA ĐỐI CHỨNG — gài lại đúng ba lỗi, bàn đo phải bắt được cả ba.

   Chạy:  npm run do-tu-lam-moi      (mã thoát 0 = đạt)
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';
import { soiDoiSoThua, lamSachMa } from './lib/soi-doi-so-thua.mjs';

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
let soManNghe = 0;
for (const m of appSrc.matchAll(/ngheDuLieu\(\s*(\[[^\]]*\]|'[a-z_]+')/g)) {
  soManNghe++;
  for (const x of m[1].matchAll(/'([a-z_]+)'/g)) nhomNghe.add(x[1]);
}
const bangHuVo = [...nhomKhai].filter(n => !nhomNghe.has(n));
ok(`${nhomKhai.size} nhóm dữ liệu đều có ít nhất một màn nghe`, bangHuVo.length === 0,
  bangHuVo.length ? 'BẮN VÀO HƯ VÔ: ' + bangHuVo.join(', ') : [...nhomKhai].sort().join(' · '));
console.log(`     (số màn đăng ký nghe: ${soManNghe})`);

ok('nhóm `thong_bao` (chuông 🔔 — "rổ B") có màn nghe', nhomNghe.has('thong_bao'),
  nhomNghe.has('thong_bao') ? 'chuông tự nạp lại sau mỗi lần ghi' : 'CHUÔNG VẪN CHỜ 5 PHÚT');

console.log('\n③ BỐN PHÉP SOI TĨNH — thứ hỏng KHÔNG kêu một tiếng nào');
ok('③a api.js còn gọi baoDuLieuDoi sau khi ghi thành công',
  /baoDuLieuDoi\(nhom\)/.test(apiSrc) && /NHOM_DU_LIEU\[ten\]/.test(apiSrc));

/* Ghi HỎNG mà cũng bắn tín hiệu thì cả ERP nạp lại vì một cú thất bại. Phải
   móc vào ĐÚNG nhánh thành công — không có tay xử lý lỗi nào ở đó. */
{
  const doan = lamSachMa(apiSrc.slice(apiSrc.indexOf('for (const ten of Object.keys(API))')));
  const soChoBan = (doan.match(/baoDuLieuDoi\(/g) || []).length;
  const coThen = /\.then\(\s*\(\s*v\s*\)\s*=>\s*\{/.test(doan);
  /* `.then(ok, hong)` hai tay, `.catch`, `.finally` — bất kỳ thứ nào trong đó
     đều là đường cho nhánh HỎNG chạm tới tín hiệu. */
  const coTayHong = /\.(catch|finally)\s*\(/.test(doan) || /\}\s*,\s*\(/.test(doan);
  ok('③b chỉ bắn tín hiệu ở nhánh THÀNH CÔNG (ghi hỏng thì im)',
    coThen && !coTayHong && soChoBan === 1,
    coThen && !coTayHong && soChoBan === 1
      ? 'đúng một chỗ bắn, nằm trong .then(…) MỘT tay, không catch/finally'
      : `${soChoBan} chỗ bắn · có .then: ${coThen} · có tay xử lý lỗi: ${coTayHong}`);
}

/* Ba đường đánh thức người nghe phải CÙNG chạy lần lượt. Thiếu một `await` là
   thẻ tóm tắt đọc trúng dữ liệu cũ (REV-0057 · L1) — không nổ, không log. */
{
  /* Bóc chú thích TRƯỚC khi dò: chính chú thích của bản vá có nhắc chữ
     `chay(n)`, dò trên mã thô là bàn đo tự báo oan mình. */
  const dongBus = lamSachMa(busSrc).split(/\r?\n/);
  const goiChay = dongBus.map((d, i) => [i + 1, d])
    .filter(([, d]) => /(^|[^\w.])chay\(n\)/.test(d) && !/function chay/.test(d));
  const thieuAwait = goiChay.filter(([, d]) => !/await\s+chay\(n\)/.test(d));
  ok(`③c cả ${goiChay.length} chỗ gọi chay(n) đều có await`, thieuAwait.length === 0 && goiChay.length >= 3,
    thieuAwait.length ? 'THIẾU AWAIT ở dòng ' + thieuAwait.map(([i]) => i).join(', ') +
      ' → người nghe chạy song song, màn đọc-lại-dữ-liệu sẽ đọc biến CŨ'
    : 'ba đường (xa · lamMoiManVuaMo · thuLaiNguoiHoan) đều chạy lần lượt');
}

/* Lớp "đối số rơi vào hư không" (REV-0057 · L2). Hai thể: tuỳ chọn `{ goc: … }`
   của đài lạc sang hàm khác, và bất kỳ chỗ gọi nào truyền nhiều đối số hơn
   hàm nhận. Cả hai đều im lặng tuyệt đối nên phải soi bằng máy. */
{
  const dongApp = appSrc.split(/\r?\n/);
  const lacGoc = [];
  dongApp.forEach((d, i) => {
    if (!/\{\s*goc:/.test(d)) return;
    if (/ngheDuLieu\(/.test(d)) return;                  // khai ngay trên cùng dòng
    /* Hoặc là dòng đóng `}, { goc: … });` của một lời `ngheDuLieu` — dò ngược
       lên tối đa 400 dòng; không gặp lời đăng ký nào thì nó đang LẠC. */
    let j = i - 1, gap = false;
    for (; j >= 0 && i - j <= 400; j--) if (/ngheDuLieu\(/.test(dongApp[j])) { gap = true; break; }
    if (!gap) lacGoc.push(i + 1);
  });
  ok('③d không tuỳ chọn `{ goc: … }` nào lạc khỏi ngheDuLieu', lacGoc.length === 0,
    lacGoc.length ? 'LẠC ở dòng ' + lacGoc.join(', ') : 'mọi `{ goc: … }` đều gắn đúng lời đăng ký');

  const thuaDoiSo = soiDoiSoThua(appSrc);
  ok('③e không chỗ gọi nào truyền thừa đối số vào hàm không nhận', thuaDoiSo.length === 0,
    thuaDoiSo.length
      ? thuaDoiSo.map(b => `app.js:${b.ln} ${b.ten}(…) truyền ${b.truyen}/nhận ${b.nhan} (khai ở dòng ${b.khaiO})`).join(' · ')
      : 'đã soi mọi hàm khai đúng một lần trong app.js');
}

/* ==========================================================================
   PHẦN B — TRÌNH DUYỆT THẬT
   Bàn thử chứng minh logic đúng; chỉ trình duyệt mới chứng minh tính năng
   còn sống (docs/BAI-HOC.md).
   ========================================================================== */

/* `dulieunen` BẮT BUỘC có mặt (REV-0057 · L3): thiếu nó thì
   `khoiDongDuLieuNen()` không chạy và 4 người nghe không bao giờ được nạp. */
const QUYEN = ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu',
               'khovan', 'kinhdoanh', 'ketoan', 'taisan', 'xepca', 'donhoan',
               'khotailieu', 'quantri', 'dulieunen', 'congviec', 'muctieu'];

/** Hai việc "chờ duyệt" → thẻ tóm tắt phải nói 2; duyệt xong → 0. */
function viec(id, trangThai) {
  return { id, tieu_de: 'Việc thử ' + id, trang_thai: trangThai, dau_ra: 'x',
           nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy',
           nguoi_giao_id: TOI_ID, bo_phan: 'Kho vận', han_chot: null, mo_ta: '' };
}

/** Mở một phiên đo. `dem` đếm lượt gọi API; máy chủ giả đổi trạng thái thật. */
/* `laAdmin` — CÓ CHỦ ĐÍCH, không phải tuỳ tiện. Thẻ "Việc tôi giao — chờ
   duyệt" CHỈ có ở nhánh NHÂN VIÊN của `veTongQuanTheoVaiTro` (app.js); Admin
   thấy bộ thẻ khác (Decision First). Ca nào đo CON SỐ trên thẻ thì phải đóng
   vai nhân viên, còn ca nào cần phủ hết tab/khối thì đóng vai Admin. Đóng sai
   vai là phép đo xanh mà không chứng minh gì. */
async function moPhien({ goBoc = false, boChongChongCheo = false, ghiHong = false,
                         laAdmin = true, suaThem = null } = {}) {
  const dem = new Map();
  const trangThai = { choDuyet: 2, canLyDo: false };
  /* Chốt tự kiểm cho ca đối chứng: chuỗi thay thế mà TRƯỢT thì ca đó đang
     chạy trên bản LÀNH và không chứng minh gì — phải biết ngay. */
  const daGai = { goBoc: false, boChong: false };
  const may = await dungMayGia({
    tatHoatAnh: true,
    suaTep: (s, f) => {
      if (f === 'assets/js/app.js') {
        // Cửa thử: đưa API + đài ra window để lái được từ bàn đo.
        s += `\nwindow.__API = API;\nwindow.__DAI = { ngheDuLieu, lamMoiManVuaMo };\n`
           + `\nimport('./lam-moi.js').then(m => { window.__SO_LUOT = m.soLuot; });\n`;
      }
      if (f === 'assets/js/api.js' && goBoc) {
        // ĐỐI CHỨNG ①: gỡ đúng một dòng — không bắn tín hiệu nữa.
        const moi = s.replace('baoDuLieuDoi(nhom);', '/* ĐỐI CHỨNG: đã gỡ tín hiệu */');
        daGai.goBoc = moi !== s; s = moi;
      }
      if (f === 'assets/js/lam-moi.js' && boChongChongCheo) {
        // ĐỐI CHỨNG ②: bỏ phép chống chạy hai lần.
        const moi = s.replace(/if \(n\.batDauLuc >= tinHieuLuc\) \{ dem\.boQua\+\+; continue; \}/,
                              '/* ĐỐI CHỨNG: đã bỏ chống chạy hai lần */');
        daGai.boChong = moi !== s; s = moi;
      }
      if (suaThem) s = suaThem(s, f);
      return s;
    },
    apiRieng: (duong, u, traJson) => {
      dem.set(duong, (dem.get(duong) || 0) + 1);
      if (duong === '/api/cong-viec/cap-nhat') {
        if (ghiHong) return traJson({ loi: 'Máy chủ gặp sự cố (bàn đo cố tình)' }, 500) || true;
        trangThai.choDuyet = 0;
        return traJson({ ok: true }) || true;
      }
      if (duong === '/api/toi-la-ai') {
        return traJson({
          ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
          phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
          trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
          la_admin: laAdmin ? 1 : 0, phong_ban_quan_ly: [],
          them_nhan_su: 1, thao_tac_van_hanh: 1, quyen: QUYEN, shopee: { xem: 1 }
        }) || true;
      }
      if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
      if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
      /* Sau khi duyệt: việc 1 XONG, việc 2 lùi về `dang_lam`. Có chủ đích —
         nếu cho cả hai xong thì `giao` rỗng, `veTongQuanTheoVaiTro` KHÔNG vẽ
         thẻ "Việc tôi giao" nữa, và ca đo sẽ không phân biệt được "thẻ nói 0"
         với "thẻ biến mất". Còn một việc đang giao thì thẻ vẫn còn và phải
         nói 0. */
      if (duong === '/api/cong-viec/danh-sach') return traJson({
        nhan: [],
        giao: [viec(1, trangThai.choDuyet >= 1 ? 'cho_duyet' : 'hoan_thanh'),
               viec(2, trangThai.choDuyet >= 2 ? 'cho_duyet' : 'dang_lam')]
      }) || true;
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
      if (duong === '/api/dulieunen/tinh-trang')
        return traJson({ muc: [], viec_tiep_theo: [] }) || true;
      if (duong === '/api/dulieunen/phong-ban' || duong === '/api/dulieunen/chuc-danh'
       || duong === '/api/dulieunen/don-vi' || duong === '/api/dulieunen/ncc'
       || duong === '/api/dulieunen/kho' || duong === '/api/dulieunen/tai-san-danh-muc'
       || duong === '/api/dulieunen/tai-san-vi-tri') return traJson({ ds: [] }) || true;
      if (duong === '/api/quan-tri/danh-sach') return traJson({ nhan_su: [], vai_tro: [] }) || true;
      if (duong === '/api/nhan-su/viec-can-lam')
        return traJson({ qua_han: [], sap_het: [], sinh_nhat_thang_sau: [] }) || true;
      /* Chặn MỀM của hợp đồng: mã 200 nhưng CHƯA GHI GÌ, đang đợi một dòng
         lý do. Bàn đo bật ca này bằng cờ `__can_ly_do` trong thân yêu cầu. */
      if (duong === '/api/nhan-su/hop-dong/luu')
        return traJson(trangThai.canLyDo ? { can_ly_do: true, canh_bao: ['thử'] } : { ok: true }) || true;
      return false;     // còn lại để ổ trả lời chung của thư viện lo
    }
  });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3000 });
  return {
    cr, may, dem,
    daGai,
    datLai() { dem.clear(); },
    datCanLyDo(v) { trangThai.canLyDo = !!v; },
    lay: (d) => dem.get(d) || 0,
    tong: () => [...dem.values()].reduce((a, b) => a + b, 0),
    /* Con số THẬT trên thẻ "Việc tôi giao — chờ duyệt". Đọc theo CẤU TRÚC
       (`.stat > .k` nhãn, `.v` số) chứ không cắt chuỗi: nhãn + số + mô tả dính
       liền nhau trong `textContent` ("…chờ duyệt" + "2" + "2 việc đang giao"),
       cắt chuỗi ra "22" — phép đo tự nói dối. */
    theChoDuyet: () => cr.chay(`(() => {
      const box = document.querySelector('#tq-tomtat');
      if (!box) return 'KHÔNG CÓ Ô THẺ';
      for (const o of box.querySelectorAll('.stat')) {
        const k = o.querySelector('.k'), v = o.querySelector('.v');
        if (k && v && k.textContent.includes('Việc tôi giao')) return v.textContent.trim();
      }
      return '(không thấy thẻ) ' + (box.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
    })()`),
    moTab: (id) => cr.chay(`(() => { const b = document.querySelector('.sb-item[data-tab="${id}"]'); if (b) b.click(); return !!b; })()`),
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
  await p.cr.doi(700);

  ok('④a khối "Việc của tôi hôm nay" tự nạp lại', p.lay('/api/cong-viec/hom-nay') === 1,
    `gọi /api/cong-viec/hom-nay ${p.lay('/api/cong-viec/hom-nay')} lượt (cần đúng 1)`);
  ok('④b CHUÔNG 🔔 tự nạp lại — RỔ B', p.lay('/api/thong-bao') === 1,
    `gọi /api/thong-bao ${p.lay('/api/thong-bao')} lượt (cần đúng 1)`);
  ok('④c mục tiêu + tổng quan công ty cũng nạp lại',
    p.lay('/api/muc-tieu/danh-sach') === 1 && p.lay('/api/cong-viec/tong-quan-congty') === 1,
    `muc-tieu ${p.lay('/api/muc-tieu/danh-sach')} · tong-quan-congty ${p.lay('/api/cong-viec/tong-quan-congty')}`);

  console.log('\n⑥ TAB ĐANG ẨN THÌ NGỦ (giữ lượt đọc D1), MỞ RA THÌ NẠP');
  ok('⑥a Tài sản đang ẩn → KHÔNG gọi máy chủ', p.lay('/api/tai-san') === 0,
    `/api/tai-san bị gọi ${p.lay('/api/tai-san')} lượt`);

  /* REV-0057 · L2: ba nhóm này TỪNG vẫn gọi dù tab đang ẩn, vì hai tuỳ chọn
     `goc` rơi nhầm vào `Array.filter` và `veBang`. */
  p.datLai();
  await p.cr.chay(`window.__API.qtSuaNhanSu({ id: 'NS-DUY', ho_ten: 'x' }).catch(() => {})`);
  await p.cr.doi(400);
  ok('⑥b nhóm nhan_su/tai_khoan cũng NGỦ khi tab Nhân sự đang ẩn',
    p.lay('/api/quan-tri/danh-sach') === 0,
    `/api/quan-tri/danh-sach ${p.lay('/api/quan-tri/danh-sach')} lượt`);

  p.datLai();
  await p.cr.chay(`window.__API.nsHopDongLuu({ nhan_su_id: 'NS-DUY' }).catch(() => {})`);
  await p.cr.doi(400);
  ok('⑥c nhóm ho_so cũng NGỦ khi tab Nhân sự đang ẩn',
    p.lay('/api/nhan-su/viec-can-lam') === 0,
    `/api/nhan-su/viec-can-lam ${p.lay('/api/nhan-su/viec-can-lam')} lượt`);

  p.datLai();
  await p.cr.chay(`window.__API.taiSanSua({ id: 1, ten: 'x' })`);
  await p.cr.doi(400);
  const nguYen = p.lay('/api/tai-san');
  await p.moTab('taisan');
  await p.cr.doi(700);
  ok('⑥d ghi tài sản khi đang ở tab khác → ngủ, chưa gọi', nguYen === 0, `${nguYen} lượt`);
  ok('⑥e mở tab Tài sản ra → nạp lại ngay', p.lay('/api/tai-san') >= 1,
    `${p.lay('/api/tai-san')} lượt sau khi mở tab`);

  console.log('\n⑦ ĐANG GÕ DỞ THÌ KHÔNG MẤT CHỮ');
  await p.moTab('tongquan');
  await p.cr.doi(300);
  /* Ô "#vd-noidung" (lời khen ở khu Vinh danh) nằm THẬT SỰ trong `#v-tongquan`
     — đúng vùng mà `taiLaiVinhDanh` vẽ lại. Chọn ô nằm ngoài vùng thì phép đo
     xanh mà chẳng chứng minh được gì. */
  const coO = await p.cr.chay(`(() => {
    const o = document.querySelector('#vd-noidung');
    if (!o) return false;
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
  const conChu = await p.cr.chay(`document.querySelector('#vd-noidung').value`);
  ok('⑦a đặt được con trỏ vào ô đang gõ, ô nằm trong vùng sẽ bị vẽ lại', coO === true, String(coO));
  ok('⑦b đang gõ → HOÃN nạp lại ĐÚNG vùng đó', hoan === 1,
    `/api/vinh-danh: ${hoan} lượt (1 = lượt GỬI, chưa có lượt nạp lại) · đài: ${soLuot}`);
  ok('⑦c chữ đang gõ còn NGUYÊN', conChu === 'Đang gõ dở — không được mất chữ này', String(conChu));
  ok('⑦d hoãn ĐÚNG người, không hoãn cả làng — chuông vẫn nạp',
    p.lay('/api/thong-bao') === 1, `/api/thong-bao: ${p.lay('/api/thong-bao')} lượt`);

  await p.cr.chay(`document.querySelector('#vd-noidung').blur()`);
  await p.cr.doi(900);
  ok('⑦e rời ô là nạp nốt, không bỏ quên', p.lay('/api/vinh-danh') >= 2,
    `/api/vinh-danh: ${p.lay('/api/vinh-danh')} lượt sau khi rời ô`);
}
p.dong();

/* -------------------------------------------------------------------------
   ⑧ ĐÁNH THỨC — đo bằng CON SỐ THẬT trên thẻ, không đo bằng số lượt gọi.
   Đây đúng ca REV-0057 · L1: dữ liệu mới ĐÃ về (lượt gọi có), nhưng thẻ tóm
   tắt vẫn vẽ bằng biến cũ vì hai người nghe chạy song song.
   ------------------------------------------------------------------------- */
console.log('\n⑧ CON SỐ THẬT TRÊN THẺ — hai đường, cùng phải đúng (vai NHÂN VIÊN)');
{
  // ⑧① Đường `xa()` — đứng yên tại chỗ, không rời tab.
  const q = await moPhien({ laAdmin: false });
  const theDau = await q.theChoDuyet();
  ok('⑧a đứng Tổng quan, thẻ "Việc tôi giao — chờ duyệt" nói 2', theDau === '2', 'thẻ = ' + theDau);
  await q.cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong')`);
  await q.cr.doi(900);
  const theTaiCho = await q.theChoDuyet();
  ok('⑧b duyệt ngay tại chỗ → thẻ nói 0, không F5', theTaiCho === '0', 'thẻ = ' + theTaiCho);
  q.dong();
}
{
  // ⑧② Đường `lamMoiManVuaMo()` — rời tab rồi quay lại. ĐÂY LÀ CA REV-0057·L1:
  //     dữ liệu mới đã về nhưng thẻ vẫn vẽ bằng biến cũ nếu thiếu `await`.
  const q = await moPhien({ laAdmin: false });
  ok('⑧c thẻ ban đầu nói 2', (await q.theChoDuyet()) === '2');
  await q.moTab('taisan');
  await q.cr.doi(500);
  q.datLai();
  await q.cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong')`);
  await q.cr.doi(600);
  ok('⑧d đang ở tab khác → hai người nghe của Tổng quan cùng NGỦ',
    q.lay('/api/cong-viec/danh-sach') === 0, `${q.lay('/api/cong-viec/danh-sach')} lượt`);
  await q.moTab('tongquan');
  await q.cr.doi(1200);
  const the = await q.theChoDuyet();
  ok('⑧e quay lại Tổng quan → thẻ nói 0 (không phải số cũ)', the === '0',
    `thẻ = ${the}` + (the === '2' ? '  ❌ NÓI DỐI — thiếu await ở lamMoiManVuaMo' : '') +
    ` · dữ liệu mới đã về: cong-viec/danh-sach ${q.lay('/api/cong-viec/danh-sach')} lượt`);
  q.dong();
}

/* -------------------------------------------------------------------------
   ⑤ ĐƯỜNG NÚT THẬT — "ghi xong RỒI GỌI TAY hàm làm mới". Chống chạy hai lần
   CHỈ ăn ở đường này; bản đầu của bàn đo gọi thẳng `API.x()` nên mù hẳn
   (REV-0057 · L3).
   ------------------------------------------------------------------------- */
console.log('\n⑤ KHÔNG NẠP CHỒNG CHÉO — đi ĐÚNG đường nút thật');
const DUONG_NUT = `(async () => {
  await window.__API.cvCapNhat(1, 'hoan_thanh', 'xong').catch(() => {});
  if (window.LAM_MOI_CONGVIEC) await window.LAM_MOI_CONGVIEC();
  if (window.LAM_MOI_MUCTIEU) await window.LAM_MOI_MUCTIEU();
})()`;
{
  const q = await moPhien();
  q.datLai();
  await q.cr.chay(DUONG_NUT);
  await q.cr.doi(1000);
  const chiTiet = [...q.dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · ');
  const chong = [...q.dem.entries()].filter(([, n]) => n > 1);
  ok('⑤a mỗi đường API đúng 1 lượt cho 1 cú bấm', chong.length === 0,
    chong.length ? 'NHÂN ĐÔI: ' + chong.map(([d, n]) => `${d}×${n}`).join(' · ') : chiTiet);
  ok('⑤b tổng đúng 6 lượt (1 ghi + 5 nạp lại)', q.tong() === 6, `${q.tong()} lượt`);
  q.dong();
}

console.log('\n⑨ GHI KHÔNG THÀNH → KHÔNG được nạp lại gì');
{
  const q = await moPhien({ ghiHong: true });
  q.datLai();
  await q.cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong').catch(() => {})`);
  await q.cr.doi(700);
  const themVao = q.tong() - q.lay('/api/cong-viec/cap-nhat');
  const soLuot = await q.cr.chay(`JSON.stringify(window.__SO_LUOT ? window.__SO_LUOT() : {})`);
  ok('⑨a máy chủ trả 500 → không bắn tín hiệu, 0 lượt gọi thêm', themVao === 0,
    `${themVao} lượt thêm · đài: ${soLuot}`);

  /* Mã 200 mà CHƯA GHI GÌ: `nsHopDongLuu` trả `can_ly_do` = chặn mềm, đang
     đợi người nhập gõ lý do (REV-0057 · L10). Bắn tín hiệu lúc đó là nạp lại
     đúng dữ liệu cũ. */
  await q.moTab('nhansu');
  await q.cr.doi(500);
  q.datLai();
  q.datCanLyDo(true);
  await q.cr.chay(`window.__API.nsHopDongLuu({ nhan_su_id: 'NS-DUY' }).catch(() => {})`);
  await q.cr.doi(700);
  const themHD = q.tong() - q.lay('/api/nhan-su/hop-dong/luu');
  ok('⑨b mã 200 kèm `can_ly_do` (chưa lưu) → cũng không nạp lại', themHD === 0,
    `${themHD} lượt thêm`);
  q.dong();
}

/* -------------------------------------------------------------------------
   ⑪ HAI TAB ERP CÙNG MỞ (REV-0057 · L9). Bấm ở tab 1, tab 2 phải tự đúng.
   ------------------------------------------------------------------------- */
console.log('\n⑪ HAI TAB ERP CÙNG MỞ — bấm ở tab này, tab kia phải tự đúng');
{
  const q = await moPhien({ laAdmin: false });
  // Mở tab thứ hai vào CÙNG trang, cùng gốc → BroadcastChannel nối được.
  const t2 = await q.cr.goi('Target.createTarget', { url: `http://127.0.0.1:${q.may.cong}/app.html` });
  const { sessionId: s2 } = await q.cr.goi('Target.attachToTarget', { targetId: t2.targetId, flatten: true });
  await q.cr.goi('Runtime.enable', {}, s2);
  await q.cr.doi(3500);
  const doc2 = async () => {
    const r = await q.cr.goi('Runtime.evaluate', {
      expression: `(() => {
        const box = document.querySelector('#tq-tomtat');
        if (!box) return 'KHÔNG CÓ Ô THẺ';
        for (const o of box.querySelectorAll('.stat')) {
          const k = o.querySelector('.k'), v = o.querySelector('.v');
          if (k && v && k.textContent.includes('Việc tôi giao')) return v.textContent.trim();
        }
        return '(không thấy thẻ)';
      })()`, returnByValue: true, awaitPromise: true }, s2);
    return r.result.value;
  };
  ok('⑪a tab 2 mở lên, thẻ nói 2', (await doc2()) === '2', 'tab 2: thẻ = ' + (await doc2()));
  // Bấm Duyệt ở TAB 1
  await q.cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong')`);
  await q.cr.doi(1200);
  const t1 = await q.theChoDuyet(), the2 = await doc2();
  ok('⑪b tab 1 (chỗ bấm) nói 0', t1 === '0', 'tab 1: thẻ = ' + t1);
  ok('⑪c tab 2 (không bấm gì) cũng tự nói 0', the2 === '0',
    'tab 2: thẻ = ' + the2 + (the2 === '2' ? '  ❌ tab kia vẫn kể số cũ' : ''));
  try { await q.cr.goi('Target.closeTarget', { targetId: t2.targetId }); } catch { /* kệ */ }
  q.dong();
}

/* -------------------------------------------------------------------------
   ⑩ BA CA ĐỐI CHỨNG. Bàn đo luôn xanh là bàn đo mù — mỗi ca dưới đây gài lại
   đúng MỘT lỗi và bàn đo PHẢI đỏ ở đúng chỗ tương ứng. Ba lỗi này chính là ba
   lỗi Hồ Ly gài trong REV-0057; bản đầu chỉ bắt được ca ⑩a.
   ------------------------------------------------------------------------- */
console.log('\n⑩ ĐỐI CHỨNG — gài lại lỗi, bàn đo PHẢI bắt được cả ba');
{
  const d = await moPhien({ goBoc: true });
  d.datLai();
  await d.cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong')`);
  await d.cr.doi(700);
  const hn = d.lay('/api/cong-viec/hom-nay'), tb = d.lay('/api/thong-bao');
  ok('⑩a0 gài được lỗi vào bản tạm', d.daGai.goBoc,
    d.daGai.goBoc ? 'đã gỡ dòng bắn tín hiệu' : 'CHUỖI THAY THẾ TRƯỢT — sửa bàn đo');
  ok('⑩a GỠ TÍN HIỆU → khối việc và chuông cùng im re (đúng bệnh Sếp gặp)',
    hn === 0 && tb === 0, `hom-nay ${hn} · thong-bao ${tb}`);
  d.dong();
}
{
  const d = await moPhien({ boChongChongCheo: true });
  d.datLai();
  await d.cr.chay(DUONG_NUT);
  await d.cr.doi(1000);
  const chong = [...d.dem.entries()].filter(([, n]) => n > 1);
  ok('⑩b0 gài được lỗi vào bản tạm', d.daGai.boChong,
    d.daGai.boChong ? 'đã bỏ phép chống chạy hai lần' : 'CHUỖI THAY THẾ TRƯỢT — sửa bàn đo');
  ok('⑩b BỎ CHỐNG CHẠY HAI LẦN → ca ⑤ phải thấy nhân đôi', chong.length > 0 && d.tong() > 6,
    `${d.tong()} lượt · ` + (chong.length
      ? chong.map(([x, n]) => `${x.replace('/api/', '')}×${n}`).join(' · ')
      : 'KHÔNG thấy nhân đôi — BÀN ĐO MÙ, sửa bàn đo trước'));
  d.dong();
}
{
  /* ĐỐI CHỨNG ③: cho bắn tín hiệu ở CẢ nhánh hỏng. Ca ⑨ phải thấy lượt gọi
     thêm. `daGai` là chốt tự kiểm: nếu chuỗi thay thế trượt (thí dụ vì tệp
     dùng CRLF) thì ca đối chứng đang chạy trên bản LÀNH và chẳng chứng minh
     gì cả — phải biết ngay, chứ không được lặng lẽ xanh. */
  let daGai = false;
  const d = await moPhien({
    ghiHong: true,
    suaThem: (s, f) => {
      if (f !== 'assets/js/api.js') return s;
      const moi = s.replace(/(\r?\n\s*return v;\r?\n\s*\})\);/,
                            '$1, (e) => { baoDuLieuDoi(nhom); throw e; });');
      daGai = moi !== s;
      return moi;
    }
  });
  ok('⑩c0 gài được lỗi vào bản tạm (nếu không thì ca dưới vô nghĩa)', daGai,
    daGai ? 'đã thêm tay xử lý lỗi vào đoạn bọc' : 'CHUỖI THAY THẾ TRƯỢT — sửa bàn đo');
  d.datLai();
  await d.cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong').catch(() => {})`);
  await d.cr.doi(700);
  const themVao = d.tong() - d.lay('/api/cong-viec/cap-nhat');
  ok('⑩c GHI HỎNG CŨNG BẮN → ca ⑨ phải thấy lượt gọi thừa', themVao > 0,
    `${themVao} lượt thêm` + (themVao === 0 ? ' — BÀN ĐO MÙ, sửa bàn đo trước' : ''));
  d.dong();
}

console.log(`\n══════════════════════════════════════════\nĐẠT ${dat} · TRƯỢT ${truot}\n`);
process.exit(truot ? 1 : 0);
