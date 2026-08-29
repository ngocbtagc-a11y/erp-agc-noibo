/* ==========================================================================
   MÁY QUÉT: DANH SÁCH BỊ CẮT MÀ KHÔNG NÓI LÀ ĐÃ CẮT
   ---------------------------------------------------------------------------
   Chạy:  npm run do-cat-im-lang        (node scripts/do-cat-im-lang.mjs)

   CHUYỆN. Chị Vũ Lan Hương (HCNS) góp ý 28/08/2026: *"không hiển thị hết công
   việc public ở mục 'Việc cần làm' để dễ theo dõi"*. Chị chỉ được MỘT chỗ —
   chỗ chị đụng vào. LỚP vấn đề rộng hơn nhiều và đã có HAI ca thật cùng ngày:
   `hoanLichSu` (LIMIT 500 trên 523 dòng) và `apiDanhSach` màn Kho vận
   (LIMIT 300 cắt đúng đơn tồn lâu nhất). Sửa đúng chỗ được chỉ = ngồi chờ
   người tiếp theo kêu (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md).

   FILE NÀY CANH CẢ LỚP, hai mặt trận:

   ① MÁY CHỦ (`src/`) — mọi hàm TRẢ DỮ LIỆU RA TRÌNH DUYỆT (thân hàm có gọi
      `json(`) mà có `LIMIT` cỡ danh sách (≥ ${'NGUONG'}) thì BẮT BUỘC hoặc:
        · gọi `catBot(`/`nhanCat(` (src/cat-danh-sach.js) để nói ra vết cắt, HOẶC
        · nằm trong bảng MIỄN TRỪ dưới đây KÈM LÝ DO VIẾT RA.
      Không có cửa thứ ba. Bảng miễn trừ chính là "hàng đợi phải ghi ra" —
      im lặng không còn là một lựa chọn hợp lệ nữa.

   ② GIAO DIỆN (`public/`) — `.slice(0, N)` cắt bớt một danh sách trước khi vẽ
      thì quanh đó phải có lời NÓI RA phần bị cắt (`length >`, `còn`, `nữa`,
      `…`, hoặc `veDaiCat`). Cắt xong im lặng là bị bắt.

   ⚠️ CA ĐỐI CHỨNG (BH-16) — MÁY QUÉT PHẢI TỰ CHỨNG MINH NÓ BẮT ĐƯỢC.
   Trước khi quét kho mã thật, file này chạy chính hai phép quét trên với MẪU
   VI PHẠM GIẢ dựng sẵn trong bộ nhớ, và với mẫu SẠCH tương ứng:
     · mẫu bẩn KHÔNG bị bắt  -> dừng, mã lỗi 2 ("bàn đo hỏng")
     · mẫu sạch BỊ bắt oan   -> dừng, mã lỗi 2
   Không có bước này thì chữ "đã quét, sạch" chỉ là lời khai. Đúng cái lỗi mà
   BH-16 sinh ra để chặn.

   MÃ THOÁT: 0 = sạch · 1 = có chỗ cắt im lặng · 2 = bàn đo hỏng.
   ========================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catBot, nhanCat } from '../src/cat-danh-sach.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Trần "cỡ danh sách". Dưới ngưỡng này là tra một dòng (`LIMIT 1`), lấy vài
 *  mục "gần đây"/"top" có chủ ý — những thứ đó nhãn giao diện đã tự nói rõ.
 *  Từ 20 trở lên là người dùng bắt đầu tin rằng "đây là tất cả". */
const NGUONG = 20;

/* ==========================================================================
   BẢNG MIỄN TRỪ — MỖI DÒNG PHẢI CÓ LÝ DO. Đây là HÀNG ĐỢI ĐƯỢC GHI RA.
   Thêm một dòng vào đây là một quyết định có tên, không phải một sự im lặng.
   ========================================================================== */
const MIEN_TRU = [
  { tep: 'src/index.js', ham: 'chatDanhSach',
    lyDo: 'HÀNG ĐỢI: 50 tin gần nhất, chưa có nút "xem tin cũ hơn" — cần thiết kế cuộn ngược riêng, không vá bằng một dải chữ.' },
  { tep: 'src/index.js', ham: 'layThongBao',
    lyDo: 'HÀNG ĐỢI: 50 thông báo gần nhất; chuông chỉ đếm chưa đọc nên chưa lệch nghĩa, nhưng cần dải cắt khi bảng lớn lên.' },
  { tep: 'src/index.js', ham: 'nsLichSu',
    lyDo: 'HÀNG ĐỢI: lịch sử 1 hồ sơ nhân sự, trần 200 — 23 nhân sự hiện tại còn xa ngưỡng.' },
  { tep: 'src/index.js', ham: 'kdKhachHoanNhieu',
    lyDo: 'CÓ CHỦ Ý: bảng XẾP HẠNG 30 khách hoàn/huỷ nhiều nhất — nhãn giao diện đã nói là xếp hạng, không phải danh mục khách.' },
  { tep: 'src/index.js', ham: 'donHangHuy',
    lyDo: 'HÀNG ĐỢI: đơn huỷ trong THÁNG hiện tại, trần 300 — cần dải cắt ở vòng sau, chưa chạm trần theo số liệu 28/08/2026.' },
  { tep: 'src/index.js', ham: 'vdDanhSach',
    lyDo: 'CÓ CHỦ Ý: 20 lời khen trong 48h gần nhất — bảng tin theo thời gian, không phải sổ tra cứu.' },
  { tep: 'src/hopdong.js', ham: 'danhSach',
    lyDo: 'HÀNG ĐỢI: hợp đồng của MỘT người, trần 100 — một người ký 100 hợp đồng là chuyện chưa từng có.' },
  { tep: 'src/mota-cv.js', ham: 'danhSach',
    lyDo: 'HÀNG ĐỢI: mô tả công việc của MỘT chức danh, trần 200 — xa ngưỡng.' },
  { tep: 'src/kho.js', ham: 'lichSu',
    lyDo: 'HÀNG ĐỢI: lịch sử giao dịch 1 sản phẩm, trần do người gọi truyền (≤200) — cần dải cắt khi kho chạy thật.' }
];

/* ==========================================================================
   PHÉP QUÉT ① — máy chủ
   ========================================================================== */

/** GỠ GHI CHÚ TRƯỚC KHI QUÉT — giữ nguyên số dòng (thay ký tự bằng dấu cách).
 *  Bắt được lỗi thật ngay vòng đầu: `src/shopee.js` có nguyên một đoạn ghi chú
 *  *"❗KHÔNG ĐƯỢC ĐẶT LẠI `LIMIT 300` Ở ĐÂY"* — máy quét đọc chính lời cảnh báo
 *  đó rồi tố ngược nó là vi phạm. Máy quét tin vào ghi chú là máy quét vô dụng.
 *  Cùng lẽ đó, một ghi chú nhắc tới `catBot` KHÔNG được tính là đã vá. */
function boGhiChu(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/** Cắt mã nguồn thành các khối hàm ở cấp cao nhất (kiểu viết của kho mã này:
 *  `function x(`, `async function x(`, `export function x(`, …, cột 0). */
function tachHam(src) {
  const dong = src.split('\n');
  const moc = [];
  for (let i = 0; i < dong.length; i++) {
    const m = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/.exec(dong[i]);
    if (m) moc.push({ ten: m[1], tu: i });
  }
  return moc.map((m, k) => ({
    ten: m.ten,
    tuDong: m.tu + 1,
    than: dong.slice(m.tu, k + 1 < moc.length ? moc[k + 1].tu : dong.length).join('\n')
  }));
}

/** Mọi `LIMIT` cỡ danh sách trong một thân hàm. Bắt cả `LIMIT 300`,
 *  `LIMIT ${GH + 1}` (biến — không đọc được số nên coi như cỡ danh sách) và
 *  `LIMIT ?` (trần do người gọi truyền). */
function limitCoDanhSach(than) {
  const ra = [];
  for (const m of than.matchAll(/\bLIMIT\s+(\$\{[^}]*\}|\?|\d+)/gi)) {
    const v = m[1];
    if (/^\d+$/.test(v)) { if (Number(v) >= NGUONG) ra.push(v); }
    else ra.push(v);                       // `${...}` hoặc `?` — không đọc được số
  }
  return ra;
}

/** Hàm này có phải "chỗ cắt cần nói ra" không? (chưa xét miễn trừ) */
function laChoCanNoi(h) {
  // Chỉ soi hàm TRẢ RA TRÌNH DUYỆT. Cron/tác vụ nền cắt lô là đúng việc
  // của nó — không ai đang nhìn một màn hình để mà bị nói dối.
  if (!/\bjson\s*\(/.test(h.than)) return null;
  const lim = limitCoDanhSach(h.than);
  if (!lim.length) return null;
  if (/\b(?:catBot|nhanCat)\s*\(/.test(h.than)) return null;
  return [...new Set(lim)].join(', ');
}

function quetMayChu(danhSachTep, docTep) {
  const loi = [];
  for (const tep of danhSachTep) {
    for (const h of tachHam(boGhiChu(docTep(tep)))) {
      const lim = laChoCanNoi(h);
      if (!lim) continue;
      if (MIEN_TRU.some(x => x.tep === tep && x.ham === h.ten)) continue;
      loi.push({ tep, ham: h.ten, dong: h.tuDong, lim });
    }
  }
  return loi;
}

/** MIỄN TRỪ CHẾT là miễn trừ nguy hiểm: hàm đổi tên hoặc đã được vá mà dòng
 *  miễn trừ còn nằm đó thì lần sau ai đó đặt lại `LIMIT` vào đúng tên ấy sẽ
 *  được tha miễn phí. Bắt buộc mỗi dòng phải đang che một vi phạm CÓ THẬT. */
function kiemMienTru(docTep) {
  const chet = [];
  for (const m of MIEN_TRU) {
    let ham = null;
    try { ham = tachHam(boGhiChu(docTep(m.tep))).find(h => h.ten === m.ham); }
    catch { /* tệp không còn */ }
    if (!ham) { chet.push(`${m.tep} ${m.ham}() — KHÔNG CÒN HÀM NÀY`); continue; }
    if (!laChoCanNoi(ham)) chet.push(`${m.tep} ${m.ham}() — hàm đã hết vi phạm, XOÁ dòng miễn trừ này đi`);
  }
  return chet;
}

/* ==========================================================================
   PHÉP QUÉT ② — giao diện
   ========================================================================== */

/** `.slice(0, N)` trên CHUỖI thì bỏ qua — cắt ngày giờ/ký tự không phải cắt
 *  danh sách. Nhận diện bằng dấu vết ngay trước lời gọi. */
const LA_CHUOI = [
  // dấu vết đứng TRƯỚC: (x || '').slice(0,10) · String(x).slice(0,…) · .trim().slice(…)
  /(\|\|\s*''\s*\)|String\s*\([^)]*\)|toISOString\(\)|\.trim\(\)|\.split\([^)]*\)|\.value)\s*\.slice\(\s*0\s*,/,
  // dấu vết đứng SAU: s.slice(0, 10).split('-') — chỉ chuỗi mới làm tiếp được
  // mấy việc này. Bắt được lỗi thật ở app.js:534 ngay vòng quét đầu.
  /\.slice\(\s*0\s*,\s*\d+\s*\)\s*\.(split|replace|padStart|padEnd|toUpperCase|toLowerCase|trim|charAt)\s*\(/
];
const laCatChuoi = (dong) => LA_CHUOI.some(r => r.test(dong));

/** Đã NÓI RA phần bị cắt chưa? Đủ loại cách nói mà kho mã đang dùng thật. */
const CO_NOI = /(\.length\s*>|còn|nữa|…|veDaiCat|dai-cat)/;

function quetGiaoDien(danhSachTep, docTep, cuaSo = 6) {
  const loi = [];
  for (const tep of danhSachTep) {
    const dong = docTep(tep).split('\n');
    for (let i = 0; i < dong.length; i++) {
      const m = /\.slice\(\s*0\s*,\s*(\d+)\s*\)/.exec(dong[i]);
      if (!m) continue;
      if (laCatChuoi(dong[i])) continue;
      const quanh = dong.slice(Math.max(0, i - cuaSo), i + cuaSo + 1).join('\n');
      if (CO_NOI.test(quanh)) continue;
      loi.push({ tep, dong: i + 1, chi: dong[i].trim().slice(0, 90) });
    }
  }
  return loi;
}

/* ==========================================================================
   CA ĐỐI CHỨNG — máy quét phải tự chứng minh trước khi được tin
   ========================================================================== */

const MAU = {
  'ban/may-chu-ban.js': `
async function dsBan(req, env) {
  const { results } = await env.DB.prepare('SELECT * FROM viec LIMIT 300').all();
  return json({ viec: results });
}
`,
  'ban/may-chu-sach.js': `
async function dsSach(req, env) {
  const kq = await env.DB.prepare('SELECT * FROM viec LIMIT 301').all();
  const { ds, biCat } = catBot(kq, 300);
  const cat = await nhanCat(env, biCat, 300, 'SELECT COUNT(*) AS n FROM viec');
  return json({ viec: ds, cat });
}
`,
  'ban/may-chu-nen.js': `
async function cronDonRac(env) {
  const { results } = await env.DB.prepare('SELECT id FROM viec LIMIT 500').all();
  for (const r of results) await xoa(env, r.id);
}
`,
  'ban/giao-dien-ban.js': `
function veTop(ds) {
  const html = ds.slice(0, 5).map(x => x.ten).join(', ');
  o.innerHTML = html;
}
`,
  'ban/giao-dien-sach.js': `
function veTopSach(ds) {
  const html = ds.slice(0, 5).map(x => x.ten).join(', ')
    + (ds.length > 5 ? \` và \${ds.length - 5} mục nữa\` : '');
  o.innerHTML = html;
}
`,
  'ban/giao-dien-chuoi.js': `
function veNgay(h) {
  return (h.luc || '').slice(0, 10);
}
function veNgayKieuKhac(s) {
  const [y, m, d] = s.slice(0, 10).split('-');   // ca thật app.js:534
  return d + '/' + m + '/' + y;
}
`,
  /* Ca thật src/shopee.js: ghi chú CẢNH BÁO đừng đặt lại LIMIT. Máy quét đọc
     chính lời cảnh báo rồi tố ngược nó — phải bỏ qua ghi chú. */
  'ban/may-chu-ghichu.js': `
export async function dsKhongTran(env, phien) {
  // ❗KHÔNG ĐƯỢC ĐẶT LẠI \`LIMIT 300\` Ở ĐÂY — cắt là mất đơn tồn lâu nhất.
  /* Trước đây câu này là: SELECT ... ORDER BY dong_bo_luc DESC LIMIT 300 */
  const { results } = await env.DB.prepare('SELECT * FROM don_hoan').all();
  return json({ don_hoan: results });
}
`,
  /* Ghi chú NHẮC TỚI catBot không phải là đã vá. */
  'ban/may-chu-khaisuong.js': `
async function dsKhaiSuong(req, env) {
  // Chỗ này lẽ ra nên gọi catBot() để nói ra vết cắt. Chưa làm.
  const { results } = await env.DB.prepare('SELECT * FROM viec LIMIT 300').all();
  return json({ viec: results });
}
`
};
const docMau = (t) => MAU[t];

function chet(vi) { console.error('\nBÀN ĐO HỎNG: ' + vi); process.exit(2); }

function tuKiem() {
  const mcBan   = quetMayChu(['ban/may-chu-ban.js'], docMau);
  const mcSach  = quetMayChu(['ban/may-chu-sach.js'], docMau);
  const mcNen    = quetMayChu(['ban/may-chu-nen.js'], docMau);
  const gdBan   = quetGiaoDien(['ban/giao-dien-ban.js'], docMau);
  const gdSach  = quetGiaoDien(['ban/giao-dien-sach.js'], docMau);
  const gdChuoi = quetGiaoDien(['ban/giao-dien-chuoi.js'], docMau);
  const mcGhiChu = quetMayChu(['ban/may-chu-ghichu.js'], docMau);
  const mcKhai = quetMayChu(['ban/may-chu-khaisuong.js'], docMau);

  if (mcBan.length !== 1)    chet('mẫu MÁY CHỦ vi phạm (LIMIT 300, không nói) KHÔNG bị bắt — phép quét ① vô dụng');
  if (mcKhai.length !== 1)   chet('ghi chú "lẽ ra nên gọi catBot()" được tính là ĐÃ VÁ — lời khai qua mặt được phép quét ①');
  if (gdBan.length !== 1)    chet('mẫu GIAO DIỆN vi phạm (.slice(0,5) im lặng) KHÔNG bị bắt — phép quét ② vô dụng');
  if (mcSach.length !== 0)   chet('mẫu MÁY CHỦ sạch (đã gọi catBot/nhanCat) bị bắt OAN — phép quét ① sẽ bị người ta tắt đi');
  if (mcNen.length !== 0)    chet('tác vụ nền (không `json(`) bị bắt oan — phép quét ① sai địa chỉ');
  if (mcGhiChu.length !== 0) chet('`LIMIT 300` nằm trong GHI CHÚ cảnh báo bị tố là vi phạm — phép quét ① đọc cả ghi chú');
  if (gdSach.length !== 0)   chet('mẫu GIAO DIỆN sạch (có "và N mục nữa") bị bắt OAN — phép quét ② sẽ bị tắt đi');
  if (gdChuoi.length !== 0)  chet('cắt CHUỖI ngày giờ bị nhận nhầm là cắt danh sách — phép quét ② sai địa chỉ');

  console.log('  ✅ Ca đối chứng: 3/3 mẫu bẩn BỊ BẮT · 5/5 mẫu sạch KHÔNG bị bắt oan — máy quét có hiệu lực.');
}

/* ==========================================================================
   CHẠY THẬT
   ========================================================================== */

function liet(thuMuc, duoi) {
  const ra = [];
  (function di(d) {
    for (const t of readdirSync(path.join(GOC, d))) {
      const p = d + '/' + t;
      if (statSync(path.join(GOC, p)).isDirectory()) di(p);
      else if (t.endsWith(duoi)) ra.push(p);
    }
  })(thuMuc);
  return ra;
}

const docThat = (t) => readFileSync(path.join(GOC, t), 'utf8');

console.log('QUÉT LỚP "DANH SÁCH BỊ CẮT MÀ KHÔNG NÓI LÀ ĐÃ CẮT"');
console.log('Góp ý gốc: chị Vũ Lan Hương (HCNS) · docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md\n');

tuKiem();

const TEP_SRC = liet('src', '.js');
const TEP_GD = [...liet('public/assets/js', '.js'), 'public/app.html']
  .filter(t => !/qrcode-lib|html5-qrcode/.test(t));   // thư viện ngoài, không phải mã của ta

const mienTruChet = kiemMienTru(docThat);
if (mienTruChet.length) {
  console.error('MIỄN TRỪ ĐÃ CHẾT — sửa bảng MIEN_TRU trong chính file này rồi chạy lại:');
  for (const c of mienTruChet) console.error('  · ' + c);
  process.exit(2);
}
console.log('  ✅ Bảng miễn trừ: cả ' + MIEN_TRU.length + ' dòng đều đang che một vi phạm CÓ THẬT (không dòng nào chết).\n');

const loiMayChu = quetMayChu(TEP_SRC, docThat);
const loiGiaoDien = quetGiaoDien(TEP_GD, docThat);

console.log(`① MÁY CHỦ — quét ${TEP_SRC.length} tệp trong src/`);
if (loiMayChu.length === 0) {
  console.log(`  ✅ Không có hàm trả JSON nào cắt im lặng (ngưỡng LIMIT ≥ ${NGUONG}).`);
} else {
  for (const l of loiMayChu) {
    console.log(`  ❌ ${l.tep}:${l.dong}  ${l.ham}()  LIMIT ${l.lim} — cắt mà KHÔNG gọi catBot/nhanCat và KHÔNG có trong bảng miễn trừ`);
  }
}
console.log(`  ℹ️  ${MIEN_TRU.length} chỗ miễn trừ CÓ LÝ DO VIẾT RA (hàng đợi + top-N có chủ ý):`);
for (const m of MIEN_TRU) console.log(`      · ${m.tep} ${m.ham}() — ${m.lyDo}`);

console.log(`\n② GIAO DIỆN — quét ${TEP_GD.length} tệp trong public/`);
if (loiGiaoDien.length === 0) {
  console.log('  ✅ Mọi chỗ .slice(0, N) cắt danh sách đều có nói ra phần bị cắt.');
} else {
  for (const l of loiGiaoDien) console.log(`  ❌ ${l.tep}:${l.dong}  ${l.chi}`);
}

/* ==========================================================================
   ③ CHẠY THẬT `catBot`/`nhanCat` — quét tĩnh chỉ thấy LỜI GỌI, không thấy
   lời gọi ấy có ĐÚNG không. Hai cái bẫy chết người nằm ở đây.
   ========================================================================== */
console.log('\n③ HÀNH VI THẬT của src/cat-danh-sach.js');

let loiHanhVi = 0;
const chấm = (ten, dung, chiTiet = '') => {
  if (dung) console.log(`  ✅ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`);
  else { loiHanhVi++; console.log(`  ❌ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
};

const hang = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));

// BẪY 1 — hỏi ĐÚNG trần thay vì trần + 1. Danh sách đầy chằn chặn 500/500 thì
// `biCat` mãi mãi false và cả cơ chế lặng lẽ quay về đúng lỗi cũ.
{
  const a = catBot({ results: hang(501) }, 500);
  chấm('523 dòng, hỏi 501 → biết là CÓ cắt', a.biCat === true && a.ds.length === 500,
    `giữ ${a.ds.length} dòng, biCat=${a.biCat}`);
  const b = catBot({ results: hang(500) }, 500);
  chấm('đúng 500 dòng, hỏi 501 → KHÔNG báo cắt oan', b.biCat === false && b.ds.length === 500);
  const c = catBot({ results: hang(500) }, 500);   // như thể chỗ gọi hỏi LIMIT 500
  chấm('BẪY: nếu chỗ gọi hỏi LIMIT bằng ĐÚNG trần thì vết cắt TÀNG HÌNH',
    c.biCat === false, 'đây là lý do mọi chỗ vá phải viết `LIMIT ${GH + 1}`');
}

// BẪY 2 — "tốn 0 đồng": không cắt thì TUYỆT ĐỐI không được chạy câu COUNT.
{
  let soLanDem = 0;
  const envGia = { DB: { prepare(sql) {
    soLanDem++;
    return { bind: () => ({ first: async () => ({ n: 523 }) }), first: async () => ({ n: 523 }) };
  } } };
  const khongCat = await nhanCat(envGia, false, 500, 'SELECT COUNT(*) AS n FROM x');
  chấm('KHÔNG cắt → trả null và chạy 0 câu đếm (D1 rows_read = 0)',
    khongCat === null && soLanDem === 0, `số câu đếm đã chạy: ${soLanDem}`);
  const coCat = await nhanCat(envGia, true, 500, 'SELECT COUNT(*) AS n FROM x');
  chấm('CÓ cắt → trả { gioi_han, tong } đúng số',
    coCat && coCat.gioi_han === 500 && coCat.tong === 523 && soLanDem === 1,
    JSON.stringify(coCat));
}

// BẪY 3 — câu đếm hỏng (chưa nạp migration) vẫn PHẢI báo là đã cắt.
{
  const envVo = { DB: { prepare() { throw new Error('no such table'); } } };
  const r = await nhanCat(envVo, true, 300, 'SELECT COUNT(*) AS n FROM chua_co');
  chấm('đếm HỎNG vẫn báo đã cắt (chỉ thiếu con số), KHÔNG im lặng',
    r !== null && r.gioi_han === 300 && r.tong === null, JSON.stringify(r));
}

/* ④ Mọi chỗ đã vá phải hỏi thừa ĐÚNG một dòng — kiểm trên mã nguồn thật. */
{
  const src = boGhiChu(docThat('src/index.js'));
  const xau = [...src.matchAll(/LIMIT\s+\$\{\s*GH\s*([+\-]\s*\d+)?\s*\}/g)]
    .map(m => (m[1] || '').replace(/\s/g, ''))
    .filter(x => x !== '+1');
  chấm('mọi `LIMIT ${GH…}` trong src/index.js đều là `GH + 1`',
    xau.length === 0, xau.length ? `sai: ${xau.join(', ')}` : 'không có chỗ nào hỏng');
}

const tong = loiMayChu.length + loiGiaoDien.length + loiHanhVi;
console.log(`\nKẾT QUẢ: ${tong === 0 ? 'SẠCH' : tong + ' CHỖ HỎNG'}`);
process.exit(tong === 0 ? 0 : 1);
