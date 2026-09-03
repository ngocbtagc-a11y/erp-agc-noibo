/* ==========================================================================
   KIỂM KÊ "MÀN HÌNH TỰ LÀM MỚI" — BA RỔ, ĐẾM THEO KHỐI HIỂN THỊ
   ---------------------------------------------------------------------------
   VÌ SAO CÓ TỆP NÀY (REV-0057 · L4). Vòng trước tôi báo "1 / 50 / 64" mà
   KHÔNG có máy nào sinh ra ba con số đó — tức tháng sau không ai kiểm lại
   được, đúng thứ luật "phải dựng lưới tự động" đòi tránh. Và tôi đếm theo
   NÚT BẤM, mà đếm theo nút thì cái bệnh Sếp nhìn thấy bị xếp vào rổ nhẹ:
   nút "Duyệt xong" CÓ gọi hàm nạp lại (nên "rổ B"), nhưng THẺ tóm tắt cạnh
   nó chạy đúng một lần lúc mở trang và không bao giờ vẽ lại (rổ A tuyệt đối).
   Sếp vấp trúng ngay ngày đầu chính vì thế.

   NAY ĐẾM THEO KHỐI HIỂN THỊ — đơn vị mà người dùng thật sự nhìn thấy:
     · RỔ A — khối KHÔNG BAO GIỜ được vẽ lại sau khi dữ liệu nó hiện bị đổi.
     · RỔ B — có chỗ vẽ lại, có chỗ không (tuỳ nút nào ai đó nhớ viết thêm).
     · RỔ C — mọi chỗ ghi vào dữ liệu của nó đều dẫn tới vẽ lại.

   ĐO TRÊN `origin/main` (trạng thái TRƯỚC bản vá), bằng cách đọc mã:
     ① Lấy danh sách khối hiển thị = những khối bản vá đăng ký nghe, quy về
        đúng tên chúng mang trên `main` (bảng `KHOI` bên dưới).
     ② Dựng đồ thị gọi hàm của `app.js` trên `main` (2 mức) + bảng bí danh
        `window.LAM_MOI_*`, để biết gọi `lamMoiCacManLienQuanCv()` cũng là
        vẽ lại `veHomNay`.
     ③ Với mỗi khối: đếm những chỗ gọi hàm GHI đụng đúng nhóm dữ liệu của nó,
        rồi xem bao nhiêu chỗ trong số đó thật sự dẫn tới vẽ lại khối ấy.

   Đây là KIỂM KÊ TĨNH — nó đọc mã, không lái trình duyệt. Việc chứng minh
   hành vi thật là của `npm run do-tu-lam-moi`. Hai bàn khác việc nhau, và
   tệp này KHÔNG đánh trượt ai: nó chỉ in số để lần sau còn đếm lại được.

   Chạy:  npm run do-kiem-ke-lam-moi
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOC } from './lib/ban-do-chrome.mjs';
import { lamSachMa } from './lib/soi-doi-so-thua.mjs';

const MOC = process.argv[2] || 'origin/main';
const doc = (p) => execFileSync('git', ['show', `${MOC}:${p}`], { cwd: GOC, maxBuffer: 1 << 28 }).toString();

/* ---- Bảng nhóm dữ liệu: lấy từ bản vá, vì đó CHÍNH LÀ bản kiểm kê "hàm ghi
   này đụng vào dữ liệu nào" mà vòng vá vừa rồi dựng ra. ---- */
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

/* ---- KHỐI HIỂN THỊ: tên trên bản vá → tên trên `main` ----------------------
   Bản vá đổi tên vài hàm cho khỏi trùng (`taiLai` có bốn cái). Cột "main" là
   tên THẬT phải đi tìm trong mã cũ; `trong` là hàm khởi động bao ngoài, dùng
   để phân biệt bốn cái `taiLai` với nhau. */
const KHOI = [
  ['Kho danh mục nền dùng chung',      'taiDanhMucNen',        null,                    ['du_lieu_nen']],
  ['Bảng Nhân sự + Bảng Tài khoản',    'taiLaiNhanSuQuanTri',  null,                    ['nhan_su', 'tai_khoan']],
  ['Dải "việc cần làm" (hợp đồng/sinh nhật)', 'taiViecCanLam',  null,                   ['ho_so']],
  ['Thẻ tóm tắt Trạm Mục Tiêu',        'veTongQuanTheoVaiTro', null,                    ['viec', 'muc_tieu']],
  ['Khối "Việc của tôi hôm nay"',      'veHomNay',             null,                    ['viec']],
  ['Bảng Vinh danh',                   'taiLai',               'khoiDongVinhDanh',      ['vinh_danh']],
  ['Danh sách Mục tiêu',               'taiLaiMucTieu',        'khoiDongMucTieu',       ['muc_tieu']],
  ['Trạm Việc + Lịch sử làm việc',     'lamMoiCacManLienQuanCv', 'khoiDongCongViec',    ['viec']],
  ['Bảng mã hàng (Kinh doanh)',        'taiLaiSp',             null,                    ['kho']],
  ['Danh sách Góp ý ERP',              'taiLai',               'khoiDongGopY',          ['gop_y']],
  ['Bảng Đối soát sàn',                'veDoiSoat',            'khoiDongDoiSoatSan',    ['hoan']],
  ['Bảng Đơn hàng huỷ',                'taiDonHangHuy',        'khoiDongDonHangHuy',    ['hoan']],
  ['Chuông thông báo 🔔',              'taiThongBao',          'chuongThongBao',        ['thong_bao']],
  ['Màn Cơ cấu tổ chức',               'lamMoiTatCa',          'khoiDongDuLieuNen',     ['du_lieu_nen']],
  ['Danh mục Nhà cung cấp',            'veNCC',                'khoiDongDuLieuNen',     ['du_lieu_nen']],
  ['Danh mục Kho',                     'veKhoList',            'khoiDongDuLieuNen',     ['du_lieu_nen']],
  ['Danh sách Tài sản',                'taiLai',               'khoiDongTaiSan',        ['tai_san']],
  ['Danh mục + Vị trí tài sản',        'taiDanhMucViTri',      'khoiDongTaiSan',        ['du_lieu_nen', 'tai_san']],
  ['Danh sách Mẫu ca',                 'taiMauCaDungChung',    'khoiDongXepCa',         ['ca']],
  ['Bảng Đăng ký ca',                  'taiDangKy',            'khoiDongXepCa',         ['ca']],
  ['Lịch ca của tôi',                  'taiLichCuaToi',        'khoiDongXepCa',         ['ca']],
  ['Bảng Kho (Xuất/Nhập/Tồn)',         'taiLai',               'khoiDongKho',           ['kho']],
  ['Danh sách Đơn hoàn',               'veDanhSach',           'khoiDongDonHoan',       ['hoan']],
  ['Bảng Tra soát (Kế toán)',          'veTraSoat',            'khoiDongKeToanTraSoat', ['hoan']],
  ['Bảng Hàng hỏng (Kế toán)',         'veHangHong',           'khoiDongKeToanHangHong',['hoan']],
  ['Kho tài liệu',                     'nap',                  'khoiDongKhoTaiLieu',    ['tai_lieu']]
];

/* ==========================================================================
   ĐỌC `app.js` CỦA `main`: thân từng hàm + bảng bí danh window.*
   ========================================================================== */
const appMain = doc('public/assets/js/app.js');
const sach = lamSachMa(appMain);
const dongSach = sach.split(/\r?\n/);
const dongGoc = appMain.split(/\r?\n/);

/** Thân của hàm khai ở `thut` dấu cách, bắt đầu ở dòng `i` (0-based). */
function thanHam(i, thut) {
  const dong = ' '.repeat(thut) + '}';
  let j = i + 1;
  while (j < dongSach.length && dongSach[j] !== dong && dongSach[j] !== dong + ')' &&
         dongSach[j] !== dong + ');' && !dongSach[j].startsWith(dong + ',')) j++;
  return { than: dongSach.slice(i, j).join('\n'), tu: i + 1, den: j + 1 };
}

/* Khoá = "TRONG::TEN" (TRONG = hàm khởi động bao ngoài, '' nếu ở mức 0). */
const ham = new Map();
dongSach.forEach((d, i) => {
  const m0 = d.match(/^(?:async )?function ([A-Za-z0-9_$]+)\s*\(/);
  if (m0) { ham.set('::' + m0[1], { ...thanHam(i, 0), ten: m0[1], trong: '' }); return; }
  /* Bắt cả mức thụt 4: vài khối nằm trong hàm tự gọi ngay (IIFE) — thí dụ
     `taiLaiSp` (bảng mã hàng ở Kinh doanh). Bỏ mức này là bỏ sót khối thật. */
  const m2 = d.match(/^ {2,4}(?:async )?function ([A-Za-z0-9_$]+)\s*\(/)
          || d.match(/^ {2,4}const ([A-Za-z0-9_$]+) = (?:async )?(?:function|\()/);
  if (m2) {
    const thut = d.match(/^ */)[0].length;
    // hàm khởi động bao ngoài = hàm mức 0 gần nhất phía trên
    let trong = '';
    for (let k = i; k >= 0; k--) {
      const t = dongSach[k].match(/^(?:async )?function ([A-Za-z0-9_$]+)\s*\(/)
             || dongSach[k].match(/^\(function ([A-Za-z0-9_$]+)\s*\(/);
      if (t) { trong = t[1]; break; }
    }
    ham.set(trong + '::' + m2[1], { ...thanHam(i, thut), ten: m2[1], trong });
  }
});

/** window.LAM_MOI_X = tenHam  →  bí danh. */
const biDanh = new Map();
for (const m of sach.matchAll(/window\.([A-Z_0-9]+)\s*=\s*([A-Za-z0-9_$]+)\s*;/g)) biDanh.set(m[1], m[2]);

/* ==========================================================================
   ĐỒ THỊ GỌI — tên nào gọi tới khối này (2 mức)
   ========================================================================== */
function timKhoi(ten, trong) {
  if (trong && ham.has(trong + '::' + ten)) return ham.get(trong + '::' + ten);
  if (ham.has('::' + ten)) return ham.get('::' + ten);
  for (const [k, v] of ham) if (v.ten === ten) return v;
  return null;
}

/** Mọi cách gọi dẫn tới khối `k`: chính tên nó, bí danh, và hàm gọi nó (2 mức). */
function duongToi(k) {
  const goc = new Set([k.ten]);
  for (const [bd, dich] of biDanh) if (goc.has(dich)) goc.add(bd);
  for (let vong = 0; vong < 2; vong++) {
    const them = [];
    for (const [, v] of ham) {
      if (goc.has(v.ten)) continue;
      // Chỉ tính hàm CÙNG hàm khởi động, hoặc hàm mức 0 — đúng phạm vi thật.
      if (v.trong !== k.trong && v.trong !== '') continue;
      for (const g of goc) if (new RegExp(`(^|[^\\w.$])${g}\\s*\\(`).test(v.than)) { them.push(v.ten); break; }
    }
    for (const t of them) goc.add(t);
    for (const [bd, dich] of biDanh) if (goc.has(dich)) goc.add(bd);
  }
  return goc;
}

/* ==========================================================================
   CHỖ GỌI HÀM GHI trên `main` (đã lọc chú thích)
   ========================================================================== */
const TEP_GIAO_DIEN = ['public/assets/js/app.js', 'public/assets/js/quet-tai-lieu.js', 'public/index.html'];
const choGhi = [];
for (const p of TEP_GIAO_DIEN) {
  const s = lamSachMa(doc(p));
  const dd = s.split(/\r?\n/);
  dd.forEach((d, i) => {
    for (const m of d.matchAll(/API\.([A-Za-z0-9_]+)\s*\(/g)) {
      const h = m[1];
      if (!NHOM[h] && !MIEN.has(h)) continue;
      // Cửa sổ dò: phần CÒN LẠI của chính dòng đó + 34 dòng sau (đủ một tay xử lý).
      const cua = [d.slice(m.index + m[0].length), ...dd.slice(i + 1, i + 35)].join('\n');
      choGhi.push({ tep: p.split('/').pop(), ln: i + 1, ham: h, nhom: NHOM[h] || [], cua });
    }
  });
}

/* ==========================================================================
   XẾP RỔ TỪNG KHỐI
   ========================================================================== */
const rA = [], rB = [], rC = [], khongTim = [];
for (const [nhan, ten, trong, nhomKhoi] of KHOI) {
  const k = timKhoi(ten, trong);
  if (!k) { khongTim.push(`${nhan} (${trong || 'mức 0'}::${ten})`); continue; }
  const duong = duongToi(k);
  const lienQuan = choGhi.filter(c => c.nhom.some(g => nhomKhoi.includes(g)));
  let veLai = 0;
  for (const c of lienQuan) {
    let co = false;
    for (const g of duong) if (new RegExp(`(^|[^\\w.$])${g}\\s*\\(`).test(c.cua)) { co = true; break; }
    if (co) veLai++;
  }
  const d = { nhan, ten, tong: lienQuan.length, veLai };
  if (lienQuan.length === 0) rC.push({ ...d, ghi: 'không chỗ ghi nào đụng nhóm này' });
  else if (veLai === 0) rA.push(d);
  else if (veLai === lienQuan.length) rC.push(d);
  else rB.push(d);
}

const in1 = (r) => r.map(x => `   · ${x.nhan}  (${x.veLai}/${x.tong} chỗ ghi có vẽ lại)`).join('\n');
console.log(`\nKIỂM KÊ TRÊN \`${MOC}\` — ĐẾM THEO KHỐI HIỂN THỊ`);
console.log(`Tổng số khối hiển thị soi được: ${KHOI.length - khongTim.length}/${KHOI.length}`);
console.log(`Tổng số chỗ gọi hàm ghi trong giao diện: ${choGhi.length}` +
            `  (${new Set(choGhi.map(c => c.ham)).size} hàm ghi khác nhau)\n`);
console.log(`RỔ A — khối KHÔNG BAO GIỜ vẽ lại: ${rA.length}`);
if (rA.length) console.log(in1(rA));
console.log(`\nRỔ B — vẽ lại ở chỗ này, KHÔNG vẽ ở chỗ kia: ${rB.length}`);
if (rB.length) console.log(in1(rB));
console.log(`\nRỔ C — đã đúng: ${rC.length}`);
if (rC.length) console.log(in1(rC));
if (khongTim.length) {
  console.log(`\n⚠️  KHÔNG TÌM THẤY ${khongTim.length} khối trong mã của \`${MOC}\` — bảng KHOI đã cũ, sửa lại:`);
  for (const x of khongTim) console.log('   · ' + x);
}
console.log('\nĐây là kiểm kê TĨNH (đọc mã). Hành vi thật do `npm run do-tu-lam-moi` chứng minh.\n');
process.exit(khongTim.length ? 1 : 0);
