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
  /* `layThongBao` ĐÃ RA KHỎI BẢNG NÀY (REV-0034 · L3). Lý do miễn trừ cũ —
     "chuông chỉ đếm chưa đọc nên chưa lệch nghĩa" — là SAI: `chuaDoc` đếm trên
     mảng ĐÃ bị trần 50 cắt, tức đúng lỗi `#ls-dem` in "500/500". Nay hàm đó
     gọi catBot/nhanCat thật nên không cần miễn trừ nữa. */
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

/** Cắt mã nguồn thành các khối hàm ở cấp cao nhất.
 *
 *  ⚠️ VÁ 29/08/2026 (REV-0034 · L1). Bản đầu chỉ nhận `function x(` ở cột 0.
 *  `src/dulieunen.js` khai TOÀN BỘ handler danh mục bằng
 *  `export const danhSachPhongBan = async (env) => {…}` → **cả tệp vô hình với
 *  máy quét**. Hôm nay chưa có `LIMIT` nào ở đó; mai ai thêm, máy vẫn xanh.
 *  Một lưới thủng không phải là lưới — lời "đã quét sạch" khi ấy là vô nghĩa.
 *
 *  Nay nhận cả:
 *    · `function x(` · `async function x(` · `export (default) (async) function x(`
 *    · `(export) const|let|var x = (async) (…) => {`  ← kiểu của dulieunen.js
 *    · `(export) const|let|var x = (async) function (`
 *  Thêm khối `(cấp tệp)` cho phần mã nằm TRƯỚC hàm đầu tiên (hằng SQL dùng chung). */
const MOC_HAM = [
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*\(/,
  /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:function\b|\(|[A-Za-z0-9_$]+\s*=>)/
];

function tachHam(src) {
  const dong = src.split('\n');
  const moc = [];
  for (let i = 0; i < dong.length; i++) {
    for (const r of MOC_HAM) {
      const m = r.exec(dong[i]);
      if (m) { moc.push({ ten: m[1], tu: i }); break; }
    }
  }
  const ra = moc.map((m, k) => ({
    ten: m.ten,
    tuDong: m.tu + 1,
    than: dong.slice(m.tu, k + 1 < moc.length ? moc[k + 1].tu : dong.length).join('\n')
  }));
  if (moc.length && moc[0].tu > 0) {
    ra.unshift({ ten: '(cấp tệp)', tuDong: 1, than: dong.slice(0, moc[0].tu).join('\n') });
  } else if (!moc.length) {
    ra.push({ ten: '(cấp tệp)', tuDong: 1, than: src });
  }
  return ra;
}

/* ==========================================================================
   DẤU CẮT — MỌI KIỂU CẮT DANH SÁCH, không riêng `LIMIT <số>`
   ---------------------------------------------------------------------------
   VÁ 29/08/2026 (REV-0034 · L1). Hồ Ly viết 5 mẫu vi phạm kiểu khác, bản đầu
   **bắt đúng 1**. Bài học của chính hôm nay: bộ đối chứng do người viết lưới
   tự chọn thì nó chỉ chứa đúng loại lưới ấy bắt được. Nay liệt kê THEO KIỂU
   CẮT, và mỗi kiểu phải có một mẫu vi phạm trong `tuKiem()`.
   ========================================================================== */
const DAU_CAT = [
  // — máy chủ: câu SQL —
  { ten: 'LIMIT <số>',        re: /\bLIMIT\s+(\d+)\b/gi },
  { ten: 'LIMIT ${…}',        re: /\bLIMIT\s+(\$\{[^}]*\})/gi },
  { ten: 'LIMIT ?',           re: /\bLIMIT\s+(\?)/gi },
  // `'SELECT … LIMIT ' + tran` — ghép chuỗi bằng `+`, KHÔNG template. Mẫu ② Hồ Ly.
  { ten: 'LIMIT ghép chuỗi',  re: /\bLIMIT\s*(['"`]\s*\+\s*[A-Za-z0-9_$.[\]]+)/gi },
  // — cắt trong JS: mảng —
  // `.slice(0, 30)` VÀ `.slice(0, TRAN_HIEN)` (mẫu ③ Hồ Ly — tham số là ĐỊNH DANH).
  // `min: 2` — cắt danh sách bằng `.slice` thì CỠ NÀO cũng phải nói ra: một
  // bảng "Top 5" im lặng vẫn là một bảng khẳng định sai "đây là tất cả".
  { ten: '.slice(0, N)',      re: /\.slice\(\s*0\s*,\s*([A-Za-z0-9_$.]+)\s*\)/g, min: 2 },
  { ten: '.slice(-N)',        re: /\.slice\(\s*-\s*([A-Za-z0-9_$.]+)\s*\)/g, min: 2 },
  // `.splice(30)` một tham số = chặt đuôi. Mẫu ⑤ Hồ Ly.
  { ten: '.splice(N)',        re: /\.splice\(\s*([A-Za-z0-9_$.]+)\s*\)/g, min: 2 },
  // `ds.length = 100` — chặt đuôi bằng cách gán length. (Tôi thêm)
  { ten: '.length = N',       re: /\.length\s*=\s*(\d+)\s*;/g },
  // `for (let i = 0; i < 30; i++)` — chặn bằng vòng lặp. Mẫu ⑤ Hồ Ly.
  { ten: 'for (i < N)',       re: /for\s*\([^;\n]*;[^;\n]*<\s*(\d+)\s*[;)]/g },
  // `Math.min(50, ds.length)` — idiom cắt phổ biến nhất còn lại. (Tôi thêm)
  { ten: 'Math.min(N, …)',    re: /Math\.min\(\s*(\d+)\s*,/g }
];

/** Một dấu cắt có "cỡ danh sách" không?
 *  · số → phải ≥ NGUONG (dưới đó là `LIMIT 1`, top-3… nhãn đã tự nói rõ)
 *  · định danh / `?` / `${…}` → KHÔNG đọc được số ⇒ phải coi là cỡ danh sách,
 *    vì đúng chỗ đó là chỗ lưới cũ mù. */
function coDanhSach(v, min = NGUONG) {
  if (/^\d+$/.test(v)) return Number(v) >= min;
  return true;
}

/** Dấu cắt nào là cắt trong JS (phải soi từng DÒNG để loại cắt CHUỖI),
 *  dấu nào là cắt trong SQL (soi cả thân, vì câu SQL trải nhiều dòng). */
const LA_CAT_JS = (ten) => /^(\.slice|\.splice|\.length|for |Math\.min)/.test(ten);

/** Ở MÁY CHỦ, `.slice()` phần lớn KHÔNG phải cắt danh sách trả ra: cắt trần ảnh
 *  tải lên (`b.anh.slice(0, 6)`), chọn suất trong thuật toán phân ca
 *  (`hopLe.slice(0, con)`)… Lớp ta canh là **danh sách ĐI RA màn hình** bị cắt.
 *  Dấu hiệu: chỗ cắt nằm trên dòng có dính tới kết quả truy vấn hoặc tới `json(`.
 *  (Ở `public/` thì KHÔNG lọc kiểu này — ở đó mọi `.slice` đều là để vẽ.) */
const CHAY_RA_MAN_HINH = /\bjson\s*\(|\bresults\b|\.all\(\)|\brows\b|\bds\b|\bdanh_sach\b/;

/** Mọi dấu cắt cỡ danh sách trong một đoạn mã. */
function dauCatCoDanhSach(than, locRaManHinh = false) {
  const ra = [];
  const dong = than.split('\n');
  for (const d of DAU_CAT) {
    if (LA_CAT_JS(d.ten)) {
      for (const l of dong) {
        // Cắt CHUỖI (ngày ISO, tiêu đề nhập vào, mã UUID) KHÔNG phải cắt danh sách.
        if (laCatChuoi(l)) continue;
        if (locRaManHinh && !CHAY_RA_MAN_HINH.test(l)) continue;
        for (const m of l.matchAll(d.re)) if (coDanhSach(m[1], d.min)) ra.push(`${d.ten} → ${m[1]}`);
      }
    } else {
      for (const m of than.matchAll(d.re)) if (coDanhSach(m[1], d.min)) ra.push(`${d.ten} → ${m[1]}`);
    }
  }
  return ra;
}

/** Hàm này có phải "chỗ cắt cần nói ra" không? (chưa xét miễn trừ) */
function laChoCanNoi(h) {
  // Chỉ soi hàm TRẢ RA TRÌNH DUYỆT. Cron/tác vụ nền cắt lô là đúng việc
  // của nó — không ai đang nhìn một màn hình để mà bị nói dối.
  if (!/\bjson\s*\(/.test(h.than)) return null;
  const lim = dauCatCoDanhSach(h.than, true);
  if (!lim.length) return null;
  if (/\b(?:catBot|nhanCat)\s*\(/.test(h.than)) return null;
  return [...new Set(lim)].join(' · ');
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
  // VÁ 29/08/2026: thêm randomUUID()/res.text()/JSON.stringify() (sinh mã id,
  // cắt đuôi thông báo lỗi) và nhận cả `.slice(-2)` (lấy 2 từ cuối của HỌ TÊN).
  // VÁ 29/08/2026 (REV-0040 — BÁO OAN): `String(…)` phải nuốt được MỘT tầng
  // ngoặc lồng. Ca thật `public/assets/js/quet-tai-lieu.js:144`:
  //   (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())).slice(0, 40)
  // `[^)]*` dừng ngay ở `Date.now()` nên cả dòng trượt lưới "đây là CHUỖI" rồi
  // bị tố là cắt danh sách. Sinh một mã gửi 40 ký tự thì không cắt của ai cái
  // gì. Báo oan là cách nhanh nhất để người ta tắt máy quét đi — nguy hiểm
  // ngang với để lọt.
  /(\|\|\s*''\s*\)|String\s*\((?:[^()]|\([^()]*\))*\)|JSON\.stringify\([^)]*\)|toISOString\(\)|randomUUID\(\)|\.text\(\)|\.trim\(\)|\.split\([^)]*\)|\.value|\.textContent|\.toFixed\([^)]*\))(?:\s*\))*\s*\.slice\(\s*-?\s*[0-9A-Za-z_$]/,
  // dấu vết đứng SAU: s.slice(0, 10).split('-') — chỉ chuỗi mới làm tiếp được
  // mấy việc này. Bắt được lỗi thật ở app.js:534 ngay vòng quét đầu.
  /\.slice\(\s*0\s*,\s*[A-Za-z0-9_$.]+\s*\)\s*\.(split|replace|padStart|padEnd|toUpperCase|toLowerCase|trim|charAt|includes)\s*\(/,
  // chuỗi văn bản: `'…'.slice(` / "…".slice( / `…`.slice(
  /['"`]\s*\)?\s*\.slice\(/
];
const laCatChuoi = (dong) => LA_CHUOI.some(r => r.test(dong));

/** Đã NÓI RA phần bị cắt chưa? Đủ loại cách nói mà kho mã đang dùng thật. */
const CO_NOI = /(\.length\s*>|còn|nữa|…|veDaiCat|dai-cat)/;

function quetGiaoDien(danhSachTep, docTep, cuaSo = 6) {
  const loi = [];
  for (const tep of danhSachTep) {
    const dong = docTep(tep).split('\n');
    for (let i = 0; i < dong.length; i++) {
      if (laCatChuoi(dong[i])) continue;
      // VÁ 29/08/2026 (L1): trước chỉ nhìn `.slice(0, <số>)`. Nay dùng CHUNG
      // bảng DAU_CAT với phép quét máy chủ — `.slice(0, TRAN)`, `.slice(-N)`,
      // `.splice(N)`, `.length = N`, `for (i < N)`, `Math.min(N, …)`.
      const dau = dauCatCoDanhSach(dong[i]);
      if (!dau.length) continue;
      const quanh = dong.slice(Math.max(0, i - cuaSo), i + cuaSo + 1).join('\n');
      if (CO_NOI.test(quanh)) continue;
      loi.push({ tep, dong: i + 1, chi: dong[i].trim().slice(0, 90), dau: dau.join(' · ') });
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
`,

  /* ======================================================================
     5 MẪU CỦA HỒ LY (REV-0034 §④) — bản đầu bắt 1/5. Giữ NGUYÊN VĂN kiểu
     viết của chị để lần sau ai sửa lưới còn đo lại được đúng chỗ đã thủng.
     ====================================================================== */
  'ban/hl1-offset.js': `
async function dsPhanTrang(req, env) {
  const { results } = await env.DB.prepare('SELECT * FROM viec LIMIT 50 OFFSET 100').all();
  return json({ viec: results });   // giao diện KHÔNG có nút trang sau
}
`,
  'ban/hl2-ghepchuoi.js': `
async function dsGhepChuoi(req, env) {
  const tran = 200;
  const { results } = await env.DB.prepare('SELECT * FROM viec LIMIT ' + tran).all();
  return json({ viec: results });
}
`,
  'ban/hl3-slice-dinhdanh.js': `
async function dsSliceDinhDanh(req, env) {
  const TRAN_HIEN = 100;
  const { results } = await env.DB.prepare('SELECT * FROM viec').all();
  return json({ viec: results.slice(0, TRAN_HIEN) });
}
`,
  'ban/hl4-arrow.js': `
export const dsArrow = async (env) => {
  const { results } = await env.DB.prepare('SELECT * FROM phong_ban LIMIT 300').all();
  return json({ ds: results });
};
`,
  'ban/hl5-for-splice.js': `
async function dsVongLap(req, env) {
  const { results } = await env.DB.prepare('SELECT * FROM viec').all();
  const ra = [];
  for (let i = 0; i < 30; i++) ra.push(results[i]);
  return json({ viec: ra });
}
async function dsSplice(req, env) {
  const { results } = await env.DB.prepare('SELECT * FROM viec').all();
  results.splice(30);
  return json({ viec: results });
}
`,

  /* ======================================================================
     4 MẪU TÔI TỰ NGHĨ THÊM — cùng LỚP, kiểu cắt khác nữa.
     ====================================================================== */
  'ban/kd1-slice-am.js': `
async function dsSliceAm(req, env) {
  const { results } = await env.DB.prepare('SELECT * FROM viec').all();
  return json({ viec: results.slice(-50) });   // lấy 50 dòng CUỐI, im lặng
}
`,
  'ban/kd2-gan-length.js': `
async function dsGanLength(req, env) {
  const { results } = await env.DB.prepare('SELECT * FROM viec').all();
  results.length = 100;                        // chặt đuôi bằng cách gán length
  return json({ viec: results });
}
`,
  'ban/kd3-mathmin.js': `
function veTopMathMin(ds) {
  const n = Math.min(50, ds.length);
  let h = '';
  for (let k = 0; k < n; k++) h += ds[k].ten;
  o.innerHTML = h;
}
`,
  /* Mặt trận mới: MÁY CHỦ cắt bằng .slice() trước khi json() — trước đây phép
     quét ② chỉ soi public/, nên chỗ này lọt cả hai lưới. */
  'ban/kd4-slice-may-chu.js': `
export const dsSliceMayChu = async (env) => {
  const { results } = await env.DB.prepare('SELECT * FROM nhan_su').all();
  return json({ ds: results.slice(0, 200) });
};
`,

  /* ======================================================================
     MẪU SẠCH mới — lưới rộng ra thì phải chứng minh không tố oan.
     ====================================================================== */
  'ban/sach-chuoi-dinhdanh.js': `
function veMa(don) {
  const MA_DAI = 12;
  return String(don.ma || '').slice(0, MA_DAI).toUpperCase();
}
`,
  'ban/sach-vonglap-thuc.js': `
function veHet(ds) {
  let h = '';
  for (let i = 0; i < ds.length; i++) h += ds[i].ten;
  o.innerHTML = h;
}
function xoaHet(ds) { ds.length = 0; }
`,
  /* REV-0040 — ca BÁO OAN thật ở quet-tai-lieu.js:144. Sinh một mã gửi, cắt
     CHUỖI 40 ký tự. Lưới cũ tố nó vì `String\\([^)]*\\)` không nuốt nổi
     `Date.now()`. Giữ nguyên văn để lần sau ai siết lưới còn đo lại được. */
  'ban/sach-uuid-ngoac-long.js': `
function moiBo() {
  return {
    maGui: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())).slice(0, 40),
    trang: []
  };
}
`,
  /* Bẫy đi kèm: ngoặc lồng KHÔNG được thành cửa sau. Đây là cắt DANH SÁCH
     thật, chỉ khác là trên dòng có một `String(...)` chứa ngoặc lồng. Lưới
     rộng ra mà bắt trượt dòng này thì bản vá trên là mở một lỗ mới. */
  'ban/ban-ngoac-long-van-cat.js': `
function veTop(ds) {
  o.innerHTML = String(new Date().getFullYear() + ' — top') + ds.slice(0, 5).map(x => x.ten).join(', ');
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

  /* ---- 9 KIỂU VI PHẠM KHÁC (REV-0034 · L1) ----
     5 mẫu của Hồ Ly + 4 mẫu tôi tự nghĩ. Bản lưới đầu bắt 1/5. Mỗi dòng dưới
     đây là một kiểu cắt mà lưới TỪNG mù — xoá dòng nào là mở lại đúng lỗ đó. */
  const KIEU_KHAC = [
    ['HL① LIMIT 50 OFFSET 100',        'ban/hl1-offset.js',        'may-chu'],
    ['HL② LIMIT ghép chuỗi (+ biến)',  'ban/hl2-ghepchuoi.js',     'may-chu'],
    ['HL③ .slice(0, ĐỊNH_DANH)',       'ban/hl3-slice-dinhdanh.js','may-chu'],
    ['HL④ handler arrow-function',     'ban/hl4-arrow.js',         'may-chu'],
    ['HL⑤ for (i<30) và .splice(30)',  'ban/hl5-for-splice.js',    'may-chu'],
    ['KĐ⑥ .slice(-50) lấy đuôi',       'ban/kd1-slice-am.js',      'may-chu'],
    ['KĐ⑦ gán .length = 100',          'ban/kd2-gan-length.js',    'may-chu'],
    ['KĐ⑧ Math.min(50, ds.length)',    'ban/kd3-mathmin.js',       'giao-dien'],
    ['KĐ⑨ .slice() ở MÁY CHỦ',         'ban/kd4-slice-may-chu.js', 'may-chu']
  ];
  let bat = 0;
  const truot = [];
  for (const [ten, tep, mat] of KIEU_KHAC) {
    const n = mat === 'may-chu' ? quetMayChu([tep], docMau).length : quetGiaoDien([tep], docMau).length;
    if (n > 0) bat++; else truot.push(ten);
  }
  console.log(`  ✅ Kiểu vi phạm KHÁC: bắt ${bat}/${KIEU_KHAC.length} (5 mẫu Hồ Ly + 4 mẫu tự nghĩ).`);
  if (truot.length) chet('lưới vẫn thủng ở: ' + truot.join(' · ') +
    ' — "đã quét sạch" là vô nghĩa khi lưới còn lỗ');

  const sachChuoi = quetGiaoDien(['ban/sach-chuoi-dinhdanh.js'], docMau);
  const sachVong  = quetGiaoDien(['ban/sach-vonglap-thuc.js'], docMau);
  if (sachChuoi.length !== 0) chet('cắt CHUỖI bằng ĐỊNH DANH (`.slice(0, MA_DAI)` trên mã đơn) bị bắt oan');
  if (sachVong.length !== 0)  chet('vòng lặp chạy HẾT `i < ds.length` và `ds.length = 0` bị bắt oan');

  /* REV-0040 — vá BÁO OAN, kèm bẫy để bản vá không thành cửa sau. */
  const sachUuid = quetGiaoDien(['ban/sach-uuid-ngoac-long.js'], docMau);
  const banLong  = quetGiaoDien(['ban/ban-ngoac-long-van-cat.js'], docMau);
  if (sachUuid.length !== 0) chet('sinh mã gửi `(… : String(Date.now() + Math.random())).slice(0, 40)` bị bắt oan — đúng ca REV-0040');
  if (banLong.length !== 1)  chet('nới `String(…)` cho ngoặc lồng đã mở CỬA SAU: dòng có String(…) mà cắt danh sách thật KHÔNG bị bắt');

  console.log('  ✅ Ca đối chứng: 13/13 mẫu bẩn BỊ BẮT · 8/8 mẫu sạch KHÔNG bị bắt oan — máy quét có hiệu lực.');
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
    console.log(`  ❌ ${l.tep}:${l.dong}  ${l.ham}()  [${l.lim}] — cắt mà KHÔNG gọi catBot/nhanCat và KHÔNG có trong bảng miễn trừ`);
  }
}
console.log(`  ℹ️  ${MIEN_TRU.length} chỗ miễn trừ CÓ LÝ DO VIẾT RA (hàng đợi + top-N có chủ ý):`);
for (const m of MIEN_TRU) console.log(`      · ${m.tep} ${m.ham}() — ${m.lyDo}`);

console.log(`\n② GIAO DIỆN — quét ${TEP_GD.length} tệp trong public/`);
if (loiGiaoDien.length === 0) {
  console.log('  ✅ Mọi chỗ .slice(0, N) cắt danh sách đều có nói ra phần bị cắt.');
} else {
  for (const l of loiGiaoDien) console.log(`  ❌ ${l.tep}:${l.dong}  [${l.dau}]  ${l.chi}`);
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
