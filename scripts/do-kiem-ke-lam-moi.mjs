/* ==========================================================================
   KIỂM KÊ "MÀN HÌNH TỰ LÀM MỚI" — BA RỔ, ĐẾM THEO KHỐI HIỂN THỊ
   ---------------------------------------------------------------------------
   VÌ SAO VIẾT LẠI LẦN HAI (REV-0057 vòng 2 · CAO-2). Bản trước dựng danh sách
   khối từ một BẢNG VIẾT TAY 26 dòng, mà bảng đó chép từ "khối nào BẢN VÁ đã
   đăng ký nghe". Đó là định nghĩa vòng tròn: **khối nào chưa ai nối dây thì
   không bao giờ lọt vào bảng, nên không bao giờ bị xếp vào rổ A** — đúng thứ
   bản kiểm kê sinh ra để tìm. Nó chỉ đếm được những chỗ tôi đã sửa.

   Hồ Ly chứng minh bằng cách đi tìm tay và ra ngay hai khối bị bỏ sót: bảng
   "Khách hoàn nhiều" (chị Huyền dùng cả ngày) và ma trận Xếp ca.

   NAY TỰ DÒ TỪ MÃ ĐANG CHẠY, không đọc bảng đăng ký của ai:
     KHỐI HIỂN THỊ = một hàm vừa GỌI API ĐỌC vừa GHI RA MÀN HÌNH.
   Nhờ vậy một khối chưa ai nối dây vẫn hiện ra, và rổ A mới có nghĩa.

   NHÓM DỮ LIỆU CỦA MỘT KHỐI cũng suy ra bằng máy, không chép tay: mỗi hàm GHI
   đã khai nhóm ở `lam-moi.js` và có một đường `/api/...`; hàm ĐỌC nào dùng
   chung tiền tố đường đó thì thuộc cùng nhóm. Thí dụ `cvDanhSach`
   (`/api/cong-viec/danh-sach`) cùng tiền tố `/api/cong-viec` với `cvCapNhat`
   (nhóm `viec`), nên khối nào gọi `cvDanhSach` là khối của nhóm `viec`.

   BA RỔ, đo trên mã TRƯỚC BẢN VÁ:
     · RỔ A — khối KHÔNG BAO GIỜ được vẽ lại sau khi dữ liệu nó hiện bị đổi.
     · RỔ B — có chỗ vẽ lại, có chỗ không (tuỳ nút nào ai đó nhớ viết thêm).
     · RỔ C — mọi chỗ ghi vào dữ liệu của nó đều dẫn tới vẽ lại.

   Đây là KIỂM KÊ TĨNH (đọc mã). Hành vi thật do `npm run do-tu-lam-moi`
   chứng minh trên trình duyệt. Tệp này KHÔNG đánh trượt ai — nó in số để lần
   sau còn đếm lại được.

   Chạy:  npm run do-kiem-ke-lam-moi            (mốc mặc định: merge-base)
          npm run do-kiem-ke-lam-moi -- <mốc>   (đo trên một commit khác)
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOC } from './lib/ban-do-chrome.mjs';
import { lamSachMa } from './lib/soi-doi-so-thua.mjs';

/* MỐC ĐO — mặc định `merge-base HEAD origin/main`, KHÔNG phải `origin/main`
   (REV-0057 vòng 2 · THẤP-1). `origin/main` là cái mốc BIẾT ĐI: hôm Hồ Ly soi
   nó đã đi 5 lần trong một ngày. Bàn đo sinh ra để con số đếm lại được mà lại
   đo trên mốc trôi thì tháng sau hai người chạy ra hai kết quả. `merge-base`
   là điểm nhánh này tách ra — cố định, và đúng nghĩa "trước bản vá". */
const MOC = process.argv[2] ||
  execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: GOC }).toString().trim();
const doc = (p) => execFileSync('git', ['show', `${MOC}:${p}`], { cwd: GOC, maxBuffer: 1 << 28 }).toString();

/* Mọi tệp giao diện — KHÔNG chỉ ba tệp như bản trước (Hồ Ly quét 13). Bỏ hai
   thư viện bên ngoài đã rút gọn (qrcode, html5-qrcode): không phải mã của ta. */
const TEP_JS = ['app.js', 'api.js', 'lam-moi.js', 'quet-tai-lieu.js', 'anh-chung.js',
                'gop-trang-pdf.js', 'so-do-bieu-tuong.js', 'nhip-tim-chat.js',
                'tbd-trangthai.js', 'data.js', 'cat-khung.js'];
const TEP_HTML = ['app.html', 'index.html', 'reset.html'];

/* Tệp có thể CHƯA tồn tại ở mốc đo (`lam-moi.js` là tệp mới của bản vá) — im
   lặng bỏ qua, đừng để `git show` phun lỗi ra màn hình làm người đọc tưởng hỏng. */
function docNeuCo(p) {
  try {
    return execFileSync('git', ['show', `${MOC}:${p}`],
      { cwd: GOC, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch { return null; }
}

/* ==========================================================================
   ① BẢNG NHÓM: hàm ghi → nhóm (lấy từ bản vá — đó CHÍNH LÀ bản kiểm kê "hàm
      này đụng dữ liệu nào" mà vòng vá dựng ra), rồi suy ra nhóm của hàm ĐỌC.
   ========================================================================== */
const busSrc = readFileSync(join(GOC, 'public/assets/js/lam-moi.js'), 'utf8');
const NHOM = {}, MIEN = new Set();
{
  const i = busSrc.indexOf('export const NHOM_DU_LIEU = {');
  for (const d of busSrc.slice(i, busSrc.indexOf('\n};', i)).split(/\r?\n/)) {
    const m = d.match(/^ {2}([A-Za-z0-9_]+):\s*(\[[^\]]*\])/);
    if (m) NHOM[m[1]] = JSON.parse(m[2].replace(/'/g, '"'));
  }
  const j = busSrc.indexOf('export const MIEN_TRU = {');
  for (const d of busSrc.slice(j, busSrc.indexOf('\n};', j)).split(/\r?\n/)) {
    const m = d.match(/^ {2}([A-Za-z0-9_]+):/);
    if (m) MIEN.add(m[1]);
  }
}

/** Mọi khoá cấp 1 của `export const API = {…}` trên MỐC, kèm thân. */
function docAPI(src) {
  const than = src.slice(src.indexOf('export const API = {'));
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
const HAM_API = docAPI(doc('public/assets/js/api.js'));
const LA_GHI = new Set(HAM_API.filter(([, b]) => /method:\s*'(POST|PUT|PATCH|DELETE)'/.test(b)).map(([t]) => t));
/** Tiền tố đường của một hàm API: `/api/cong-viec/cap-nhat` → `/api/cong-viec` */
const tienTo = (than) => {
  const m = than.match(/'(\/api\/[a-z0-9-]+)/);
  return m ? m[1] : null;
};
const TIEN_TO = {};
for (const [ten, than] of HAM_API) TIEN_TO[ten] = tienTo(than);

/* Mỗi NHÓM đụng vào những tiền tố đường nào. */
const TIEN_TO_CUA_NHOM = {};
for (const [ten, nhomDs] of Object.entries(NHOM)) {
  const t = TIEN_TO[ten];
  if (!t) continue;
  for (const g of nhomDs) (TIEN_TO_CUA_NHOM[g] ||= new Set()).add(t);
}

/** Nhóm dữ liệu mà một hàm ĐỌC đang hiển thị.
 *
 *  KHÔNG lấy hợp tất cả nhóm dùng chung tiền tố — làm thế thì `thong_bao`
 *  (chuông) dính vào MỌI khối, vì gần như đường ghi nào cũng bắn thêm tin vào
 *  chuông. Khối danh sách Góp ý đâu có hiển thị thông báo. Hai luật, theo thứ
 *  tự:
 *    ① Tên nhóm TRÙNG đoạn đường (`thong_bao` ↔ `/api/thong-bao`) → chính nó.
 *    ② Không trùng thì lấy nhóm HẸP NHẤT có tiền tố đó — nhóm đụng ít đường
 *       nhất là nhóm đặc trưng cho đường ấy, còn nhóm cắt ngang như
 *       `thong_bao` đụng cả chục đường nên tự bị loại. */
function nhomCuaHamDoc(ten) {
  const t = TIEN_TO[ten];
  if (!t) return [];
  const doan = t.replace('/api/', '');
  const trungTen = Object.keys(TIEN_TO_CUA_NHOM).filter(g => g.replace(/_/g, '-') === doan);
  if (trungTen.length) return trungTen;
  const ungVien = Object.entries(TIEN_TO_CUA_NHOM).filter(([, ds]) => ds.has(t));
  if (!ungVien.length) return [];
  const heNhat = Math.min(...ungVien.map(([, ds]) => ds.size));
  return ungVien.filter(([, ds]) => ds.size === heNhat).map(([g]) => g);
}

/* ==========================================================================
   ② ĐỌC `app.js` CỦA MỐC: thân từng hàm + bí danh window.* + bí danh THAM SỐ
   ========================================================================== */
const appSrc = doc('public/assets/js/app.js');
const sach = lamSachMa(appSrc);
const dongSach = sach.split(/\r?\n/);

/** Thân hàm khai ở dòng `i` (0-based), thụt `thut` dấu cách. */
function thanHam(i, thut) {
  const dong = ' '.repeat(thut) + '}';
  let j = i + 1;
  while (j < dongSach.length &&
         dongSach[j] !== dong && !dongSach[j].startsWith(dong + ')') &&
         !dongSach[j].startsWith(dong + ',') && !dongSach[j].startsWith(dong + ';')) j++;
  return { than: dongSach.slice(i, j).join('\n'), tu: i + 1, den: j + 1 };
}

const ham = new Map();                       // "TRONG::TEN" -> {ten, trong, than, tu, thamSo}
/* `const X = (…)` CHƯA CHẮC là hàm: `const k = (KN_DANH_MUC || []).find(…)`
   cũng khớp khuôn đó, và bản trước đếm nhầm nó thành một "khối hiển thị".
   Hàm mũi tên thì sau cặp ngoặc phải có `=>`. */
const laHamMuiTen = (d) => /=\s*(?:async\s*)?\([^)]*\)\s*=>/.test(d) || /=\s*(?:async\s*)?[A-Za-z0-9_$]+\s*=>/.test(d);
dongSach.forEach((d, i) => {
  const m0 = d.match(/^(?:async )?function ([A-Za-z0-9_$]+)\s*\(/);
  if (m0) {
    ham.set('::' + m0[1], { ...thanHam(i, 0), ten: m0[1], trong: '', thamSo: tenThamSo(d) });
    return;
  }
  const m = d.match(/^( {2,6})(?:async )?function ([A-Za-z0-9_$]+)\s*\(/)
         || (/^( {2,6})const ([A-Za-z0-9_$]+) = (?:async )?function/.test(d)
              ? d.match(/^( {2,6})const ([A-Za-z0-9_$]+) = /) : null)
         || (laHamMuiTen(d) ? d.match(/^( {2,6})const ([A-Za-z0-9_$]+) = /) : null);
  if (!m) return;
  const thut = m[1].length;
  let trong = '';
  for (let k = i; k >= 0; k--) {
    const t = dongSach[k].match(/^(?:async )?function ([A-Za-z0-9_$]+)\s*\(/)
           || dongSach[k].match(/^\(function ([A-Za-z0-9_$]+)\s*\(/);
    if (t) { trong = t[1]; break; }
  }
  const khoa = trong + '::' + m[2];
  if (!ham.has(khoa)) ham.set(khoa, { ...thanHam(i, thut), ten: m[2], trong, thamSo: tenThamSo(d) });
});

/** Tên các tham số của một dòng khai hàm — để dò bí danh THAM SỐ VỊ TRÍ. */
function tenThamSo(d) {
  const mo = d.indexOf('(');
  if (mo < 0) return [];
  let sau = 0, j = mo;
  for (; j < d.length; j++) {
    if (d[j] === '(') sau++;
    else if (d[j] === ')') { sau--; if (!sau) break; }
  }
  return d.slice(mo + 1, j).split(',')
    .map(x => (x.split('=')[0] || '').trim())
    .filter(x => /^[A-Za-z0-9_$]+$/.test(x));
}

/** `window.LAM_MOI_X = tenHam;` */
const biDanhWindow = new Map();
for (const m of sach.matchAll(/window\.([A-Za-z_0-9]+)\s*=\s*([A-Za-z0-9_$]+)\s*;/g)) {
  biDanhWindow.set(m[1], m[2]);
}

/* BÍ DANH THAM SỐ (REV-0057 vòng 2 · điểm mù ②). Hàm truyền làm tham số rồi
   gọi qua TÊN KHÁC: `khiXong: nap` → trong mô-đun kia gọi `khiXong()`, mà đó
   chính là `nap`. Bản trước không theo được đường này nên xếp "Kho tài liệu"
   vào rổ A trong khi nó là rổ C. Bắt hai khuôn: `khoa: tenHam` và
   `khoa: window.TEN_HOA`. */
const biDanhThamSo = new Map();              // tênHàm -> Set(tên khoá truyền đi)
function themBiDanh(tenHam, khoa) {
  if (!biDanhThamSo.has(tenHam)) biDanhThamSo.set(tenHam, new Set());
  biDanhThamSo.get(tenHam).add(khoa);
}
const NGUON_JS = TEP_JS.map(x => 'public/assets/js/' + x)
  .map(p => [p, docNeuCo(p)]).filter(([, s]) => s).map(([p, s]) => [p, lamSachMa(s)]);

// ① Khuôn object: `khiXong: nap` / `capNhatDs: window.LAM_MOI_DANHMUC_NEN`
for (const [, ss] of NGUON_JS) {
  for (const m of ss.matchAll(/([A-Za-z0-9_$]+)\s*:\s*(?:window\.)?([A-Za-z0-9_$]+)\s*[,}\n]/g)) {
    const khoa = m[1], giaTri = m[2];
    if (khoa === giaTri) continue;
    themBiDanh(biDanhWindow.get(giaTri) || giaTri, khoa);
  }
}

/* ② Khuôn THAM SỐ VỊ TRÍ: `noiNutSuaTaiLieu(oDanhSach, nap)` — bên trong gọi
   `khiXong()`, mà `khiXong` chính là `nap`. Đây đúng điểm mù Hồ Ly chỉ ra:
   bản trước xếp "Kho tài liệu" vào rổ A trong khi nó là rổ C, vì không theo
   được hàm truyền làm tham số rồi gọi qua tên khác. */
function tachDoiSo(chuoi) {
  const ra = []; let sau = 0, cur = '';
  for (const ch of chuoi) {
    if ('([{'.includes(ch)) sau++;
    else if (')]}'.includes(ch)) sau--;
    if (ch === ',' && sau === 0) { ra.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) ra.push(cur);
  return ra.map(x => x.trim());
}
for (const [, ss] of NGUON_JS) {
  for (const [, v] of ham) {
    if (!v.thamSo || !v.thamSo.length) continue;
    const re = new RegExp(`(^|[^\\w.$])${v.ten}\\s*\\(`, 'g');
    for (const m of ss.matchAll(re)) {
      const mo = m.index + m[0].length - 1;
      let sau = 0, j = mo;
      for (; j < ss.length; j++) {
        if ('([{'.includes(ss[j])) sau++;
        else if (')]}'.includes(ss[j])) { sau--; if (!sau) break; }
      }
      if (j >= ss.length) continue;
      tachDoiSo(ss.slice(mo + 1, j)).forEach((d, idx) => {
        if (!/^[A-Za-z0-9_$]+$/.test(d) || !v.thamSo[idx]) return;
        themBiDanh(biDanhWindow.get(d) || d, v.thamSo[idx]);
      });
    }
  }
}

/* ==========================================================================
   ③ TỰ DÒ KHỐI HIỂN THỊ — hàm nào vừa ĐỌC máy chủ vừa VẼ ra màn hình
   ========================================================================== */
const VE_RA_MAN = /\.innerHTML\s*=|\.textContent\s*=|\bveBang\s*\(|\bveThe\s*\(|\bveDanhSach\s*\(|\bveDanhMuc\s*\(|\bveChart\s*\(|\bveTienDo\s*\(|\bappendChild\s*\(|\.hidden\s*=/;

/* QUY VỀ HÀM TRONG CÙNG. Một `khoiDong*()` bao trọn hàng chục hàm con, nên nếu
   cứ đọc cả thân nó thì nó "thừa hưởng" mọi lời gọi API và mọi nét vẽ của con
   — hoá ra 54 khối trong đó có cả những hàm chẳng vẽ gì. Mỗi dòng phải thuộc
   về hàm TRONG CÙNG chứa nó, đúng như người đọc mã hiểu. */
function hamTrongCung(dongIdx) {
  let chon = null;
  for (const [, v] of ham) {
    if (dongIdx + 1 < v.tu || dongIdx + 1 > v.den) continue;
    if (!chon || (v.den - v.tu) < (chon.den - chon.tu)) chon = v;
  }
  return chon;
}
const rieng = new Map();                     // hàm -> { doc:Set, ve:bool }
dongSach.forEach((d, i) => {
  const coDoc = [...d.matchAll(/API\.([A-Za-z0-9_]+)\s*\(/g)]
    .map(m => m[1]).filter(t => !LA_GHI.has(t) && !MIEN.has(t));
  const coVe = VE_RA_MAN.test(d);
  if (!coDoc.length && !coVe) return;
  const chu = hamTrongCung(i);
  if (!chu) return;
  const khoa = chu.trong + '::' + chu.ten;
  if (!rieng.has(khoa)) rieng.set(khoa, { doc: new Set(), ve: false, v: chu });
  const o = rieng.get(khoa);
  for (const t of coDoc) o.doc.add(t);
  if (coVe) o.ve = true;
});

const KHOI = [];
for (const [khoa, o] of rieng) {
  if (!o.doc.size || !o.ve) continue;        // phải VỪA đọc máy chủ VỪA vẽ
  const docApi = [...o.doc];
  const nhomKhoi = [...new Set(docApi.flatMap(nhomCuaHamDoc))];
  if (!nhomKhoi.length) continue;            // đọc thứ không nhóm nào ghi vào
  KHOI.push({ khoa, ten: o.v.ten, trong: o.v.trong, tu: o.v.tu, nhom: nhomKhoi, docApi });
}

/* ==========================================================================
   ④ ĐỒ THỊ GỌI — mọi cách gọi dẫn tới một khối
   ========================================================================== */
function duongToi(k) {
  const ten = new Set([k.ten]);              // tên hàm thật — gọi trần
  const biDanh = new Set();                  // tên mượn — có thể gọi qua `t.khiXong()`
  const themBiDanhCho = () => {
    for (const [bd, dich] of biDanhWindow) if (ten.has(dich) || biDanh.has(dich)) biDanh.add(bd);
    for (const t of [...ten, ...biDanh]) for (const bd of (biDanhThamSo.get(t) || [])) biDanh.add(bd);
  };
  /* Bí danh gọi được cả kiểu THUỘC TÍNH (`t.khiXong(…)`, `tuyChon.capNhatDs()`)
     vì mô-đun nhận nó thường gói vào một object tuỳ chọn. Tên hàm THẬT thì
     không cho dấu chấm phía trước — `x.taiLai()` là hàm của người khác. */
  const khop = (than) => {
    for (const g of ten) if (new RegExp(`(^|[^\\w.$])${g}\\s*\\(`).test(than)) return true;
    for (const g of biDanh) if (new RegExp(`\\b${g}\\s*\\(`).test(than)) return true;
    return false;
  };
  themBiDanhCho();
  for (let vong = 0; vong < 3; vong++) {
    const them = [];
    for (const [, v] of ham) {
      if (ten.has(v.ten)) continue;
      /* PHẠM VI (REV-0057 vòng 2 · điểm mù ①). Bản trước chặn cứng
         `v.trong !== k.trong` nên bỏ sót hẳn ca `lamMoiTatCa` (nằm trong
         `khoiDongDuLieuNen`) gọi `taiDanhMucNen` (mức 0) — xếp nhầm "Kho danh
         mục nền" vào rổ A. Luật đúng: gọi được nếu CÙNG hàm khởi động, hoặc
         nếu khối đích khai ở MỨC 0 (ai cũng gọi được). */
      if (v.trong !== k.trong && k.trong !== '') continue;
      if (khop(v.than)) them.push(v.ten);
    }
    if (!them.length) break;
    for (const t of them) ten.add(t);
    themBiDanhCho();
  }
  return { khop };
}

/* ==========================================================================
   ⑤ CHỖ GỌI HÀM GHI — quét MỌI tệp giao diện
   ========================================================================== */
const choGhi = [], choTruyen = [];
for (const p of [...TEP_JS.map(x => 'public/assets/js/' + x), ...TEP_HTML.map(x => 'public/' + x)]) {
  const raw = docNeuCo(p);
  if (!raw) continue;
  const s = lamSachMa(raw);
  const dd = s.split(/\r?\n/);
  dd.forEach((d, i) => {
    for (const m of d.matchAll(/API\.([A-Za-z0-9_]+)\s*\(/g)) {
      const h = m[1];
      if (!NHOM[h] && !MIEN.has(h)) continue;
      const cua = [d.slice(m.index + m[0].length), ...dd.slice(i + 1, i + 35)].join('\n');
      choGhi.push({ tep: p.split('/').pop(), ln: i + 1, ham: h, nhom: NHOM[h] || [], cua });
    }
    /* Chỗ TRUYỀN `API.x` làm tham số (không có ngoặc ngay sau) — 13 chỗ mà bản
       trước bỏ hẳn. Chúng cũng là chỗ ghi thật, chỉ gọi ở nơi khác. */
    for (const m of d.matchAll(/API\.([A-Za-z0-9_]+)(?!\s*\()/g)) {
      const h = m[1];
      if (!NHOM[h] && !MIEN.has(h)) continue;
      choTruyen.push({ tep: p.split('/').pop(), ln: i + 1, ham: h });
    }
  });
}

/* ==========================================================================
   ⑥ XẾP RỔ
   ========================================================================== */
const rA = [], rB = [], rC = [];
for (const k of KHOI) {
  const { khop } = duongToi(k);
  const lienQuan = choGhi.filter(c => c.nhom.some(g => k.nhom.includes(g)));
  let veLai = 0;
  for (const c of lienQuan) if (khop(c.cua)) veLai++;
  const d = { ...k, tong: lienQuan.length, veLai };
  if (lienQuan.length === 0) continue;       // không chỗ ghi nào đụng — không xếp rổ
  else if (veLai === 0) rA.push(d);
  else if (veLai === lienQuan.length) rC.push(d);
  else rB.push(d);
}

const nhan = (x) => `   · ${x.ten}${x.trong ? ` (trong ${x.trong})` : ''} — dòng ${x.tu}` +
  `  [${x.nhom.join('+')}]  ${x.veLai}/${x.tong} chỗ ghi có vẽ lại`;

console.log(`\nKIỂM KÊ TRÊN \`${MOC.slice(0, 12)}\` — ĐẾM THEO KHỐI HIỂN THỊ`);
console.log('(khối = hàm vừa GỌI API ĐỌC vừa VẼ ra màn hình — tự dò từ mã, KHÔNG đọc bảng đăng ký)\n');
console.log(`Khối hiển thị dò được          : ${KHOI.length}  (xếp rổ được ${rA.length + rB.length + rC.length})`);
console.log(`Chỗ GỌI hàm ghi                : ${choGhi.length}`);
console.log(`Chỗ TRUYỀN hàm ghi làm tham số : ${choTruyen.length}`);
console.log(`                          TỔNG : ${choGhi.length + choTruyen.length}\n`);
console.log(`RỔ A — khối KHÔNG BAO GIỜ vẽ lại: ${rA.length}`);
console.log(rA.map(nhan).join('\n'));
console.log(`\nRỔ B — vẽ ở chỗ này, KHÔNG vẽ ở chỗ kia: ${rB.length}`);
console.log(rB.map(nhan).join('\n'));
console.log(`\nRỔ C — đã đúng: ${rC.length}`);
console.log(rC.map(nhan).join('\n'));
console.log('\nĐây là kiểm kê TĨNH (đọc mã). Hành vi thật do `npm run do-tu-lam-moi` chứng minh.\n');
