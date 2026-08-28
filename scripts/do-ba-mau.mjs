/* ==========================================================================
   PHÉP KIỂM LUẬT BA MÀU — docs/BANG-MAU.md Mục 4
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-ba-mau.mjs [đường-dẫn-style.css]
   So bản cũ:  git show <commit>:public/assets/css/style.css > cu.css
               node scripts/do-ba-mau.mjs cu.css

   Sếp Ngọc chốt 28/08/2026: "không quá 3 màu chính: Nâu, Xanh lá, Cam".
   Ngoại lệ DUY NHẤT là đỏ báo lỗi — và đỏ phải HIẾM (Kho vận dựa vào đỏ để
   bắt đơn hoàn quá hạn; đỏ mà nhan nhản thì không ai nhìn nữa).

   BỐN THỨ FILE NÀY ĐO:
     ① CỤM SẮC   — trích MỌI mã màu, quy về góc sắc, phải rơi đúng ba họ
                   (nâu–cam · xanh lá · đỏ báo lỗi). Có họ thứ tư → HỎNG.
     ② LUẬT ①    — "không đen, không trắng": đếm mã trắng tuyền/đen tuyền
                   còn sót. Hai vùng được miễn, có lý do vật lý, xem MIEN[].
     ③ TỈ TRỌNG  — đếm số mã theo họ, đối chiếu ~80/12/8 và "đỏ phải hiếm".
     ④ ĐỐI CHỨNG — BH-16: tự tiêm màu ngoài họ (tím, lơ) và một mã trắng
                   tuyền vào bản sao CSS. Không bắt được thì PHÉP ĐO hỏng,
                   không phải màu đúng.

   VÌ SAO ĐẾM MÃ MÀU CHỨ KHÔNG ĐO DIỆN TÍCH: diện tích cần dựng DOM thật và
   phụ thuộc dữ liệu từng màn. Đếm mã màu là phép đo TĨNH, chạy được trong
   0,2 giây ở mọi lượt sửa, và bắt đúng thứ luật ba màu cấm — sự XUẤT HIỆN
   của một họ màu thứ tư. Tỉ trọng diện tích thì nhìn ảnh chụp mà xét.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const duongDan = process.argv[2] || new URL('../public/assets/css/style.css', import.meta.url);
const rawGoc = readFileSync(duongDan, 'utf8');

/* ── Giải mã màu ─────────────────────────────────────────────────────────── */
/*  REV-0029/K1 — BÀI HỌC ĐẮT NHẤT VÒNG NÀY, chép nguyên vào đây để đời sau
    không đạp lại: bản trước chỉ giải mã `#hex` · `rgb()` · `rgba()` · hai
    TÊN `white`/`black`. Hồ Ly tiêm `rgba(255,255,255,1)` + `rgba(0,0,0,1)`
    — trắng tuyền và đen tuyền, đục 100% — vào CSS rồi chạy file này, nó
    VẪN in "ĐẠT". Hai lỗ hổng chồng nhau:
      · `TRANG_DEN` khớp CHUỖI NGUYÊN `#fff|#ffffff|white|#000|…` nên dạng
        `rgba(…)` không đời nào khớp;
      · mà sắc độ của trắng/đen = 0 nên nó cũng bị `KHONG_SAC` gạt khỏi §①.
        Trắng dạng `rgba` rơi vào KHE giữa hai mục, không mục nào soi.
    Và 4 ca đối chứng cũ bắt được cả 4 vì CẢ 4 ĐỀU LÀ `#hex` — bộ đối chứng
    tự chọn đúng loại mình bắt được.
    → LUẬT: ca đối chứng phải phủ mọi DẠNG VIẾT, không chỉ mọi GIÁ TRỊ.
    → Nay giải mã đủ: `#hex` 3/4/6/8 · `rgb()`/`rgba()` (số và %) ·
      `hsl()`/`hsla()` (deg/rad/turn/grad) · tên màu CSS · `color-mix()`
      (bắt qua chính các mã màu nằm trong ngoặc của nó).
    → Và §② nay so THEO GIÁ TRỊ RGB đã giải mã, không so theo chuỗi nữa.  */
const TEN = {
  white: [255, 255, 255], black: [0, 0, 0],
  /* Tên màu CSS hay bị dán ẩu. Đủ để §② bắt mọi bí danh của trắng/đen
     tuyền, và để §① nhìn thấy một họ màu thứ tư viết bằng tên. */
  red: [255, 0, 0], lime: [0, 255, 0], blue: [0, 0, 255], yellow: [255, 255, 0],
  cyan: [0, 255, 255], aqua: [0, 255, 255], magenta: [255, 0, 255], fuchsia: [255, 0, 255],
  silver: [192, 192, 192], gray: [128, 128, 128], grey: [128, 128, 128],
  maroon: [128, 0, 0], olive: [128, 128, 0], green: [0, 128, 0], purple: [128, 0, 128],
  teal: [0, 128, 128], navy: [0, 0, 128], orange: [255, 165, 0], pink: [255, 192, 203],
  gold: [255, 215, 0], brown: [165, 42, 42], beige: [245, 245, 220], ivory: [255, 255, 240],
  snow: [255, 250, 250], whitesmoke: [245, 245, 245], violet: [238, 130, 238],
  indigo: [75, 0, 130], crimson: [220, 20, 60], salmon: [250, 128, 114],
  khaki: [240, 230, 140], tan: [210, 180, 140], plum: [221, 160, 221],
  orchid: [218, 112, 214], turquoise: [64, 224, 208], lavender: [230, 230, 250]
};
const so = (t, thang) => /%$/.test(t) ? parseFloat(t) / 100 * thang : parseFloat(t);
function giaiMau(s) {
  s = String(s).trim();
  const t = TEN[s.toLowerCase()];
  if (t) return [...t, 1];
  const h = s.match(/^#([0-9a-fA-F]{3,8})$/);
  if (h) {
    let x = h[1];
    if (x.length === 3 || x.length === 4) x = [...x].map(c => c + c).join('');
    if (x.length !== 6 && x.length !== 8) return null;
    const n = i => parseInt(x.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), x.length === 8 ? n(6) / 255 : 1];
  }
  const r = s.match(/^rgba?\(([^)]*)\)$/i);
  if (r) {
    const p = r[1].split(/[,/\s]+/).filter(Boolean);
    if (p.length < 3) return null;
    const v = p.slice(0, 3).map(x => so(x, 255));
    if (v.some(Number.isNaN)) return null;
    let a = 1;
    if (p.length > 3) { a = so(p[3], 1); if (Number.isNaN(a)) a = 1; }
    return [...v, a];
  }
  const l = s.match(/^hsla?\(([^)]*)\)$/i);
  if (l) {
    const p = l[1].split(/[,/\s]+/).filter(Boolean);
    if (p.length < 3) return null;
    let H = parseFloat(p[0]);
    if (Number.isNaN(H)) return null;
    if (/rad$/i.test(p[0])) H = H * 180 / Math.PI;
    else if (/turn$/i.test(p[0])) H *= 360;
    else if (/grad$/i.test(p[0])) H *= 0.9;
    const S = parseFloat(p[1]) / 100, L = parseFloat(p[2]) / 100;
    if (Number.isNaN(S) || Number.isNaN(L)) return null;
    let a = 1;
    if (p.length > 3) { a = so(p[3], 1); if (Number.isNaN(a)) a = 1; }
    const C = (1 - Math.abs(2 * L - 1)) * S;
    const hh = ((H % 360) + 360) % 360 / 60;
    const X = C * (1 - Math.abs(hh % 2 - 1));
    const seg = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(hh) % 6];
    const m = L - C / 2;
    return [Math.round((seg[0] + m) * 255), Math.round((seg[1] + m) * 255), Math.round((seg[2] + m) * 255), a];
  }
  return null;
}
function sac(c) {                       // [góc sắc 0–360, sắc độ 0–255]
  const [r, g, b] = c;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return [null, 0];
  let h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return [h, d];
}

/* ── Ba họ được phép + ngoại lệ đỏ ───────────────────────────────────────── */
/*  Ranh giới lấy từ chính hai màu logo (BANG-MAU §5) chứ không bịa:
    cam logo #eb7c17 = 28.6° · lá xanh logo #6ca839 = 92.4° · đỏ báo lỗi
    --danger #a85641 = 12.2°. Nới mỗi phía đủ chứa sắc độ đậm/nhạt của cùng
    một họ, KHÔNG đủ để nuốt một họ khác (tím 253°, lơ 187°, hồng 330°). */
const HO = [
  ['ĐỎ BÁO LỖI', h => h >= 340 || h <= 14],
  ['NÂU–CAM',    h => h > 14 && h <= 52],
  ['XANH LÁ',    h => h >= 70 && h <= 165]
];
const KHONG_SAC = 6;                    // sắc độ < 6/255 → coi là không có sắc

/* Hai vùng được miễn luật "không đen không trắng" — lý do VẬT LÝ, không phải
   thẩm mỹ. Miễn theo VÙNG KÝ TỰ, không miễn theo mã màu: dán #000 chỗ khác
   vẫn bị bắt. */
const MIEN = [
  [/\.ts-tem\s*\{/, /@media print[\s\S]*?\}\s*\}/, 'tem in 60×40mm — mực đen trên GIẤY TRẮNG (ADR-0008)'],
  [/\.kn-video-box video \{/, /\}/, 'nền khung video quét mã — camera letterbox']
];

/* ── Trích mọi mã màu (giữ nguyên số dòng để soi lại được) ───────────────── */
/*  Tên màu CSS chỉ tính khi đứng ở VỊ TRÍ GIÁ TRỊ — tức sau `:` `,` `(`
    hoặc khoảng trắng bên trong khai báo — chứ không phải khi nó là tên lớp
    (`.beige`) hay tên biến (`--tan-nhat`). Guard `(?<![-\w#.])` chặn đúng
    hai ca đó mà vẫn bắt `color: white` và `color-mix(in srgb, white 40%…)`.
    `color-mix()` KHÔNG cần luật riêng: mọi mã màu nằm trong ngoặc của nó
    đều bị chính RE_MAU này quét trúng như mã màu thường.                   */
const TEN_RE = Object.keys(TEN).sort((a, b) => b.length - a.length).join('|');
const RE_MAU = new RegExp(
  `rgba?\\([^()]*\\)|hsla?\\([^()]*\\)|#[0-9a-fA-F]{3,8}\\b|(?<![-\\w#.])(?:${TEN_RE})(?![-\\w])`, 'gi');
function trich(raw) {
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const vungMien = [];
  for (const [dau, cuoi, ly] of MIEN) {
    const i = css.search(dau);
    if (i < 0) continue;
    const j = css.slice(i).search(cuoi);
    vungMien.push([i, j < 0 ? css.length : i + j + css.slice(i).match(cuoi)[0].length, ly]);
  }
  const ra = [];
  for (const m of css.matchAll(RE_MAU)) {
    const c = giaiMau(m[0]);
    if (!c || c[3] === 0) continue;
    ra.push({ ma: m[0], c, dong: css.slice(0, m.index).split('\n').length,
              mien: vungMien.find(v => m.index >= v[0] && m.index < v[1])?.[2] || null });
  }
  return ra;
}

/* ── Phân họ ─────────────────────────────────────────────────────────────── */
function phanHo(ds) {
  const kq = { ho: {}, lac: [], khongSac: [], goc: [] };
  for (const x of ds) {
    const [h, d] = sac(x.c);
    if (h === null || d < KHONG_SAC) { kq.khongSac.push(x); continue; }
    x.goc = h; kq.goc.push(h);
    const ten = HO.find(([, f]) => f(h))?.[0];
    if (!ten) kq.lac.push(x);
    else (kq.ho[ten] ||= []).push(x);
  }
  return kq;
}
/* Cụm theo KHE HỞ — không áp ranh giới nào, để tự nó nói ra có mấy cụm */
function cum(gocs, khe = 22) {
  const s = [...gocs].sort((a, b) => a - b);
  const ra = [];
  for (const g of s) {
    const cuoi = ra[ra.length - 1];
    if (cuoi && g - cuoi[cuoi.length - 1] <= khe) cuoi.push(g); else ra.push([g]);
  }
  // vòng qua 360°: cụm đầu và cụm cuối có thể là một
  if (ra.length > 1 && (360 - ra[ra.length - 1][ra[ra.length - 1].length - 1]) + ra[0][0] <= khe) {
    ra[0] = ra.pop().concat(ra[0]);
  }
  return ra;
}

/*  §② so THEO GIÁ TRỊ đã giải mã, KHÔNG so theo chuỗi.
    Bản cũ dùng `/^(#fff|#ffffff|white|#000|#000000|black)$/i` — khớp chuỗi
    nguyên, nên `rgba(255,255,255,1)` lọt sạch (REV-0029/K1). Nay chỉ hỏi
    một câu duy nhất: ba kênh RGB có đúng 255 cả ba, hay đúng 0 cả ba, mà
    alpha > 0 không? Câu hỏi đó không phụ thuộc dạng viết, nên mọi bí danh
    của trắng/đen tuyền — `#fff` `#ffffff` `#ffffffff` `white` `rgb(100%,
    100%,100%)` `rgba(255,255,255,.92)` `hsl(0,0%,100%)` `hsl(0 0% 0%)`
    hay nằm trong `color-mix()` — đều rơi vào cùng một cái lưới.            */
function laTrangDen(x) {
  const [r, g, b, a] = x.c;
  if (!(a > 0)) return false;
  return (r === 255 && g === 255 && b === 255) || (r === 0 && g === 0 && b === 0);
}

function chay(raw, im = true) {
  const ds = trich(raw);
  const kq = phanHo(ds);
  const trangDen = ds.filter(x => laTrangDen(x) && !x.mien);
  const duocMien = ds.filter(x => laTrangDen(x) && x.mien);
  if (!im) return { kq, trangDen, ds };

  console.log(`\n═══ LUẬT BA MÀU — ${String(duongDan).replace(/^file:\/\/\//, '')} ═══`);
  console.log(`  ${ds.length} mã màu · ${kq.goc.length} có sắc · ${kq.khongSac.length} không sắc\n`);

  console.log('─── ① CỤM SẮC ───');
  const cs = cum(kq.goc);
  console.log(`  Cụm theo khe hở 22°: ${cs.length} cụm — ` +
    cs.map(c => `${c[0].toFixed(0)}–${c[c.length - 1].toFixed(0)}° (${c.length} mã)`).join(' · '));
  for (const [ten] of HO) {
    const v = kq.ho[ten] || [];
    if (!v.length) { console.log(`  ${ten.padEnd(11)} —`); continue; }
    const g = v.map(x => x.goc);
    console.log(`  ${ten.padEnd(11)} ${String(v.length).padStart(3)} mã · ${Math.min(...g).toFixed(0)}–${Math.max(...g).toFixed(0)}°`);
  }
  if (kq.lac.length) {
    console.log(`\n  ✗ HỎNG LUẬT — ${kq.lac.length} mã NGOÀI ba họ:`);
    for (const x of kq.lac) console.log(`      d.${String(x.dong).padStart(4)}  ${x.ma.padEnd(22)} góc sắc ${x.goc.toFixed(1)}°`);
  } else console.log('\n  ĐẠT  Không có họ màu thứ tư.');

  console.log('\n─── ② LUẬT ①: KHÔNG ĐEN, KHÔNG TRẮNG ───');
  for (const x of duocMien) console.log(`  MIỄN  d.${String(x.dong).padStart(4)}  ${x.ma.padEnd(10)} ${x.mien}`);
  if (trangDen.length) {
    console.log(`  ✗ HỎNG LUẬT ① — ${trangDen.length} mã trắng/đen tuyền:`);
    const gom = {};
    for (const x of trangDen) (gom[x.ma.toLowerCase()] ||= []).push(x.dong);
    for (const [m, ds2] of Object.entries(gom)) console.log(`      ${m.padEnd(10)} ×${ds2.length}  d.${ds2.slice(0, 12).join(', ')}${ds2.length > 12 ? '…' : ''}`);
  } else console.log('  ĐẠT  Không còn mã trắng tuyền / đen tuyền ngoài vùng được miễn.');

  console.log('\n─── ③ TỈ TRỌNG (đếm mã màu — tham chiếu, không phải diện tích) ───');
  const tong = kq.goc.length;
  for (const [ten] of HO) {
    const n = (kq.ho[ten] || []).length;
    console.log(`  ${ten.padEnd(11)} ${String(n).padStart(3)} mã = ${(n / tong * 100).toFixed(1).padStart(5)}%`);
  }
  const nDo = (kq.ho['ĐỎ BÁO LỖI'] || []).length;
  console.log(`  → ${nDo / tong <= 0.15 ? 'ĐẠT ' : 'CẢNH BÁO'} đỏ báo lỗi chiếm ${(nDo / tong * 100).toFixed(1)}% số mã (ngưỡng "hiếm": ≤15%)`);

  return { kq, trangDen, ds };
}

const chinh = chay(rawGoc);

/* ── ⑤ MÀU NẰM NGOÀI style.css ───────────────────────────────────────────
   REV-0026/H1: `app.html` đổi `theme-color` sang bảng màu mới, còn
   `index.html` và `manifest.webmanifest` vẫn giữ `#3f4d33`/`#f2f1ee` của
   bảng màu CŨ. Trên điện thoại, màn ĐĂNG NHẬP và màn khởi động PWA vẫn vẽ
   một dải ô liu tối trên đầu ERP — đúng cái "đen thùi lùi" Sếp chê, chỉ khác
   là ở màn trước đó nên soi CSS không bao giờ thấy.
   Phép kiểm họ màu KHÔNG bắt được lỗi này: #3f4d33 là màu XANH LÁ, vẫn nằm
   trong ba họ. Thứ bắt được nó là câu hỏi khác: "mã này có phải MỘT GIÁ TRỊ
   ĐANG DÙNG trong style.css không?" — bảng màu cũ thì không.
   ⚠️ Cứ thêm màu vào HTML/JS là phải chạy lại file này.                   */
const NGOAI = ['public/index.html', 'public/app.html', 'public/reset.html',
               'public/manifest.webmanifest', 'public/assets/js/app.js'];
function soiNgoai(raw, duong) {
  /* Gom mã ĐANG DÙNG — phải BỎ CHÚ THÍCH trước. Không bỏ thì mọi mã cũ nhắc
     trong chú thích ("Đợt 1 hạ --ink #3f4d33 → #1e2417") đều bị coi là còn
     dùng, ca đối chứng của chính mục này lọt, và phép kiểm tự vô hiệu hoá
     mình mà không báo gì. */
  const sach = rawGoc.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const kho = new Set([...sach.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0].toLowerCase()));
  /* Miễn theo DÒNG, có lý do vật lý — không phải miễn theo mã màu. */
  const MIEN_DONG = [[/ctx\.fillStyle/, 'nền lót canvas trước khi nén JPEG — JPEG không có kênh trong suốt']];
  const ra = [];
  const txt = raw.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  const dongCua = i => txt.slice(txt.lastIndexOf('\n', i) + 1, (txt.indexOf('\n', i) + 1 || txt.length));
  for (const m of txt.matchAll(/#[0-9a-fA-F]{3,6}\b/g)) {
    const ma = m[0].toLowerCase();
    if (kho.has(ma)) continue;
    if (MIEN_DONG.some(([re]) => re.test(dongCua(m.index)))) continue;
    const c = giaiMau(ma); if (!c) continue;
    const [h, d] = sac(c);
    ra.push({ duong, ma, dong: txt.slice(0, m.index).split('\n').length,
              goc: h === null || d < KHONG_SAC ? 'không sắc' : h.toFixed(0) + '°' });
  }
  return ra;
}
console.log('\n─── ⑤ MÃ MÀU NGOÀI style.css (HTML · manifest · JS) ───');
{
  const goc = resolve(decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
  let lac = [];
  for (const f of NGOAI) {
    let raw; try { raw = readFileSync(join(goc, f), 'utf8'); } catch { continue; }
    lac.push(...soiNgoai(raw, f));
  }
  if (lac.length) {
    console.log(`  ✗ ${lac.length} mã KHÔNG có trong style.css — bảng màu đã tách làm hai:`);
    for (const x of lac) console.log(`      ${x.duong} d.${x.dong}  ${x.ma}  (${x.goc})`);
    chinh.kq.lac.push(...lac);          // tính vào lỗi chung
  } else console.log('  ĐẠT  Mọi mã màu ngoài style.css đều là giá trị đang dùng trong style.css.');
  /* Đối chứng riêng cho mục này (BH-26 — nói trước vì sao PHẢI hỏng):
     #3f4d33 là ĐÚNG mã cũ của H1. Nó là xanh lá nên mục ① không bao giờ bắt
     được; chỉ mục ⑤ bắt, vì nó không còn là giá trị nào trong style.css. */
  const thu = soiNgoai('<meta name="theme-color" content="#3f4d33">', 'ĐỐI CHỨNG');
  console.log(`  ${thu.length ? 'BẮT ĐƯỢC      ' : 'KHÔNG BẮT ←HỎNG'} đối chứng: theme-color #3f4d33 (bảng màu trước CTL-0023)`);
  if (!thu.length) process.exit(2);
}

/* ── ④ BH-16 · CA ĐỐI CHỨNG ─────────────────────────────────────────────── */
console.log('\n─── ④ CA ĐỐI CHỨNG (BH-16) — phép kiểm phải BẮT ĐƯỢC lỗi cố ý ───');
/*  Vì sao mấy ca này BẮT BUỘC phải hỏng (BH-26 — nói ra trước khi chạy):
      · tím #7c4dff góc sắc 258° — không nằm trong bất kỳ khoảng nào của HO,
        nên PHẢI rơi vào `lac`. Lệch cơ học, không phụ thuộc dữ liệu.
      · lơ #00bcd4 góc sắc 187° — nằm giữa xanh lá (≤165°) và đỏ (≥340°).
      · hồng #ff4fa3 góc sắc 335° — SÁT mép đỏ 340°, ca khó nhất: nếu ranh
        giới bị nới ẩu thì ca này lọt, và ta biết ngay.
      · #ffffff — trắng tuyền dán ở dòng thường (ngoài vùng miễn), phải bị
        luật ① bắt.
    ⚠️ BỐN CA TRÊN ĐỀU LÀ `#hex` — VÀ ĐÓ CHÍNH LÀ CHỖ HỎNG (REV-0029/K1).
    Bộ đối chứng cũ bắt được cả 4 không phải vì phép kiểm khoẻ, mà vì nó
    tự chọn đúng loại mình bắt được. Hồ Ly tiêm ĐÚNG ca dưới đây thì nó im.
    → Sáu ca mới phủ theo DẠNG VIẾT, mỗi ca một dạng khác nhau:
      · `rgba(255,255,255,1)` + `rgba(0,0,0,1)` — ĐÚNG ca đã lọt qua bản cũ;
      · `hsl()` — dạng chưa từng được giải mã trước vòng này;
      · `hsl()` tím 258° — vừa dạng mới, vừa họ màu thứ tư, kiểm cả §① lẫn
        khả năng giải mã hsl trong một ca;
      · tên màu CSS `white` — bí danh chuỗi;
      · `color-mix()` — kiểm rằng mã màu trong ngoặc lồng vẫn bị quét.
    Bất kỳ ai thêm dạng viết mới vào CSS: THÊM MỘT CA Ở ĐÂY TRƯỚC.          */
const CA = [
  ['tím  #7c4dff (258°)', ':root{--doi-chung:#7c4dff}\n', r => r.kq.lac.some(x => x.ma === '#7c4dff')],
  ['lơ   #00bcd4 (187°)', ':root{--doi-chung:#00bcd4}\n', r => r.kq.lac.some(x => x.ma === '#00bcd4')],
  ['hồng #ff4fa3 (335°)', ':root{--doi-chung:#ff4fa3}\n', r => r.kq.lac.some(x => x.ma === '#ff4fa3')],
  ['trắng tuyền #ffffff ngoài vùng miễn', '.doi-chung{color:#ffffff}\n', r => r.trangDen.some(x => x.ma === '#ffffff')],
  /* Ca của Hồ Ly, nguyên văn — bản trước in "ĐẠT" khi có dòng này. */
  ['trắng tuyền dạng rgba() — CA ĐÃ LỌT REV-0029',
   '.hl-doi-chung{color:rgba(255,255,255,1)}\n',
   r => r.trangDen.some(x => /^rgba\(255,255,255/i.test(x.ma))],
  ['đen  tuyền dạng rgba() — CA ĐÃ LỌT REV-0029',
   '.hl-doi-chung-2{background:rgba(0,0,0,1)}\n',
   r => r.trangDen.some(x => /^rgba\(0,0,0/i.test(x.ma))],
  ['trắng tuyền dạng hsl(0,0%,100%)',
   '.doi-chung-hsl{color:hsl(0,0%,100%)}\n',
   r => r.trangDen.some(x => /^hsl\(0,0%,100%/i.test(x.ma))],
  ['đen  tuyền dạng hsl(0 0% 0%)',
   '.doi-chung-hsl2{background:hsl(0 0% 0%)}\n',
   r => r.trangDen.some(x => /^hsl\(0 0% 0%/i.test(x.ma))],
  ['tím dạng hsl(258 100% 65%) — họ thứ tư viết bằng hsl',
   ':root{--doi-chung-hsl3:hsl(258 100% 65%)}\n',
   r => r.kq.lac.some(x => /^hsl\(258/i.test(x.ma))],
  ['trắng tuyền viết bằng TÊN màu CSS `white`',
   '.doi-chung-ten{color:white}\n',
   r => r.trangDen.some(x => /^white$/i.test(x.ma))],
  ['trắng tuyền nằm trong color-mix()',
   '.doi-chung-mix{background:color-mix(in srgb, #ffffff 40%, var(--cam))}\n',
   r => r.trangDen.some(x => x.ma === '#ffffff')],
  ['tím viết bằng TÊN màu CSS `purple` (300°) — họ thứ tư',
   ':root{--doi-chung-ten2:purple}\n',
   r => r.kq.lac.some(x => /^purple$/i.test(x.ma))]
];
let bat = 0;
for (const [ten, them, kiem] of CA) {
  const r = chay(them + rawGoc, false);
  const ok = kiem(r);
  if (ok) bat++;
  console.log(`  ${ok ? 'BẮT ĐƯỢC      ' : 'KHÔNG BẮT ←HỎNG'} ${ten}`);
}

console.log('\n───────────────────────────────────────────────────────────');
if (bat !== CA.length) {
  console.log('  ✗ PHÉP KIỂM HỎNG — không bắt được màu cố ý sai. Sửa phép kiểm trước.');
  process.exit(2);
}
const loi = chinh.kq.lac.length + chinh.trangDen.length;
console.log(`  Đối chứng: bắt được ${bat}/${CA.length}`);
console.log(loi === 0
  ? '  ✓ ĐẠT LUẬT BA MÀU — không có họ thứ tư, không còn trắng/đen tuyền.'
  : `  ✗ ${chinh.kq.lac.length} mã ngoài ba họ · ${chinh.trangDen.length} mã trắng/đen tuyền`);
process.exit(loi === 0 ? 0 : 1);
