/* ==========================================================================
   ĐO TƯƠNG PHẢN CHỮ/NỀN — CTL-0023 (bảng màu nền sáng)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-tuong-phan-mau.mjs [đường-dẫn-style.css]
   Không cần trình duyệt, không cần dev server. Có tham số để đo bản CŨ:
     git show main:public/assets/css/style.css > cu.css
     node scripts/do-tuong-phan-mau.mjs cu.css

   VÌ SAO CÓ FILE NÀY: nhân viên kho đọc ERP trên điện thoại NGOÀI NẮNG và
   DƯỚI ĐÈN KHO. Nền sáng mà chữ nhạt là không đọc được — đẹp mà vô dụng.
   "Nhìn ổn" không phải là phép đo.

   BH-45 (REV-0024) — HAI LỖ HỔNG CỦA BẢN TRƯỚC, ĐÃ VÁ:
     ① Bản trước chỉ đọc khối `:root` ĐẦU TIÊN → mù hoàn toàn khối `:root`
        thứ hai (`--tim`, `--tim-wash`). Nay gom TẤT CẢ khối `:root`.
     ② Bản trước dùng danh sách 28 cặp CHỌN TAY → đo 0/81 chỗ dán cứng màu
        ngoài `:root`, nên bỏ sót `.tag-new`, `.mt-the-pct.warn`,
        `.xc-ngay-tt.du_thua` — toàn chỗ kho đọc HẰNG NGÀY. Nay TỰ QUÉT mọi
        luật CSS: luật nào đặt cả `color` lẫn `background` thì thành một cặp,
        không cần ai nhớ ra nó.

   NGƯỠNG: chữ thường ≥ 4.5:1 · chữ lớn (≥18.66px + đậm, hoặc ≥24px) ≥ 3:1.

   BH-16 — CA ĐỐI CHỨNG: phép đo nào cũng phải chứng minh nó BẮT ĐƯỢC lỗi.
   Cuối file dựng lại ĐÚNG từng màu sai đã vá; nếu phép đo báo ĐẠT thì phép
   đo hỏng, không phải màu đúng.
   ========================================================================== */

import { readFileSync } from 'node:fs';

const duongDan = process.argv[2] || new URL('../public/assets/css/style.css', import.meta.url);
/* Xoá chú thích nhưng GIỮ NGUYÊN số ký tự và số dòng → số dòng báo ra khớp
   với file thật, soi lại được ngay. */
const css = readFileSync(duongDan, 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
const dong = vt => css.slice(0, vt).split('\n').length;

/* ── 1. Gom biến từ MỌI khối :root (BH-29 ①) ─────────────────────────────── */
const M = {};
let soKhoiRoot = 0;
for (const m of css.matchAll(/(?:^|\})\s*:root\s*\{([^}]*)\}/g)) {
  soKhoiRoot++;
  for (const d of m[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) M[d[1]] = d[2].trim();
}
if (!soKhoiRoot) throw new Error('Không tìm thấy khối :root nào trong style.css');

/* ── 2. Màu: giải mã, pha alpha, WCAG 2.1 ────────────────────────────────── */
const TEN = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };

function giaiMau(s, sau = 0) {
  if (sau > 6 || !s) return null;
  s = String(s).trim();
  const v = s.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,([\s\S]*))?\)$/);
  if (v) {
    const gt = M[v[1].slice(2)];
    return gt !== undefined ? giaiMau(gt, sau + 1) : (v[2] ? giaiMau(v[2], sau + 1) : null);
  }
  if (TEN[s.toLowerCase()]) return TEN[s.toLowerCase()].slice();
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
    const p = r[1].split(/[,/\s]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.slice(0, 3).some(Number.isNaN)) return null;
    return [p[0], p[1], p[2], p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1];
  }
  return null;
}
const hex = c => '#' + c.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
const pha = (tren, duoi) => {                    // `tren` có alpha, `duoi` đặc
  const a = tren[3];
  return [0, 1, 2].map(i => tren[i] * a + duoi[i] * (1 - a)).concat(1);
};
function sang(c) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function ti(chu, nen) {
  const a = sang(chu), b = sang(nen);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
const Lsao = c => { const y = sang(c); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
const T = t => giaiMau('var(--' + t + ')') || (() => { throw new Error('Thiếu --' + t); })();

/* ── 3. Bổ đôi CSS thành từng luật lá (kể cả luật nằm trong @media) ──────── */
function quet(text, goc = 0) {
  const ra = [];
  let i = 0, dauSel = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '{') {
      const sel = text.slice(dauSel, i).replace(/\s+/g, ' ').trim();
      let d = 1, j = i + 1;
      while (j < text.length && d > 0) { if (text[j] === '{') d++; else if (text[j] === '}') d--; j++; }
      const than = text.slice(i + 1, j - 1);
      if (than.includes('{')) ra.push(...quet(than, goc + i + 1));
      else ra.push({ sel, than, vt: goc + dauSel });
      i = j; dauSel = j;
    } else if (c === '}') { i++; dauSel = i; }
    else i++;
  }
  return ra;
}
const LUAT = quet(css).filter(r => r.sel && !r.sel.startsWith('@'));

const khai = (than, ten) => {                    // lấy khai báo CUỐI cùng
  let ra = null;
  for (const m of than.matchAll(new RegExp('(?:^|[;\\s])' + ten + '\\s*:\\s*([^;}]+)', 'g'))) ra = m[1].trim();
  return ra;
};
const RE_MAU = /var\(\s*--[a-z0-9-]+\s*(?:,[^()]*)?\)|rgba?\([^()]*\)|#[0-9a-fA-F]{3,8}\b|\b(?:white|black)\b/gi;
const mauTrong = s => [...(s || '').matchAll(RE_MAU)].map(m => giaiMau(m[0])).filter(Boolean);
const nenCua = sel => {
  const r = LUAT.find(x => x.sel === sel);
  return r ? mauTrong(khai(r.than, 'background') || khai(r.than, 'background-color') || '') : [];
};

/* ── 4. Bốn tầng nền — mọi chữ "trôi nổi" đều rơi xuống một trong bốn ────── */
const TANG = [['--surface-2', T('surface-2')], ['--bg', T('bg')], ['--surface', T('surface')], ['--card', T('card')]];

function nguong(than) {
  const cs = parseFloat((khai(than, 'font-size') || '').replace(/[^\d.]/g, '')) || 15;
  const dam = parseFloat(khai(than, 'font-weight') || '400') || 400;
  return (cs >= 24 || (cs >= 18.66 && dam >= 700)) ? 3 : 4.5;
}

/* ── 5. NỀN CHA — chữ không tự khai nền thì nó rơi xuống đâu? ────────────── */
/*  Đây là chỗ bộ 28 cặp cũ mù: `.thd-nut` nền là rgba trắng .08 — pha lên
    nền SÁNG thì chữ trắng biến mất, pha lên thanh bên TỐI thì đọc tốt. Phải
    biết cha là ai mới đo đúng. Ba nguồn, xét theo thứ tự:               */
/*  Nền hero = từng chặng gradient, ĐÃ CỘNG hai lớp phủ của `::after` (chữ
    nằm TRÊN `::after` vì có z-index, nên lớp phủ tính vào nền của chữ). */
const changHero = nenCua('.login-hero');
const phuHero = nenCua('.login-hero::after').filter(c => c[3] > 0 && c[3] < 1);
const nenHero = [];
for (const g of changHero) { nenHero.push(g); for (const p of phuHero) nenHero.push(pha(p, g)); }

/*  ① khớp CHỮ: luật nào có nền đặc và selector của nó là tiền tố tổ tiên  */
const KHUNG = LUAT.map(r => ({ sel: r.sel, nen: mauTrong(khai(r.than, 'background') || khai(r.than, 'background-color') || '').filter(c => c[3] >= 1) }))
  .filter(k => k.nen.length).sort((a, b) => b.sel.length - a.sel.length);
/*  ② NỀN CHA THẬT — ĐỌC TỪ DOM ĐÃ DỰNG, KHÔNG ĐOÁN BẰNG REGEX
    ---------------------------------------------------------------------
    REV-0026/H3: bản trước ở đây có một bảng regex dán MỘT nền cho CẢ HỌ
    `/^\.sb-|^\.thd-(nut|cham|ok|sage|warn|danger|mute)/ → nền thanh bên`.
    Sai, và sai theo kiểu tệ nhất — im lặng. `.thd-danger` KHÔNG ngồi trên
    thanh bên: nó nằm trong `.thd-nut{background:var(--surface-2)}`. Bàn đo
    mù chỗ đó nên khai "0 cặp rớt ngưỡng" trong khi `.thd-danger` thật ra
    4.67 → 4.23. Bàn đo dối một lần thì MỌI con số nó nói đều không dùng được.
    Đổi hằng số này lấy hằng số khác không sửa được lỗi ấy: cha–con là quan
    hệ trong DOM, đọc CSS không bao giờ suy ra được.
    → `scripts/do-nen-cha.mjs` dựng trang thật bằng Chrome headless, LEO CÂY
      TỔ TIÊN bằng `getComputedStyle`, pha alpha, tách từng chặng gradient,
      rồi ghi ra `scripts/nen-cha.json`. Ở đây chỉ tra bảng đó.
    Đổi cấu trúc HTML → chạy lại `do-nen-cha.mjs`. Thiếu bảng thì bàn đo
    NÓI THẲNG là không biết, chứ không đoán bừa rồi khai "đạt".              */
const chuanSel = s => s.replace(/\s*([>+~])\s*/g, ' $1 ').replace(/\s+/g, ' ').trim().toLowerCase();
/*  Bảng lưu theo CẶP [nền cha, màu chữ cuối cùng] của TỪNG phần tử — nhờ thế
    mới ghép đúng màu với đúng nền, và mới biết luật nào bị đè.            */
let CAP_DOM = {}, coBangNenCha = false;
try {
  const tho = JSON.parse(readFileSync(new URL('./nen-cha.json', import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(tho)) CAP_DOM[chuanSel(k)] = v;
  coBangNenCha = Object.keys(CAP_DOM).length > 0;
} catch { /* không có bảng → khai không biết, xem dưới */ }
const capCua = sel => sel.split(',').map(chuanSel).filter(Boolean)
  .flatMap(v => CAP_DOM[v] || CAP_DOM[v.replace(/::?[a-z-]+(\([^)]*\))?/g, '').trim()] || []);

/*  Luật này có THẬT SỰ hiện ra không, hay bị luật đặc hiệu hơn đè?
    Bàn đo tĩnh xét từng luật rời nhau nên không tự biết. Ví dụ có thật:
    `.panel-head .hint` (đặc hiệu 20) bị `.mt-panel .panel-head .hint` (30)
    đè — đo luật yếu trên nền dải cam ra 1.91:1 rồi báo TRƯỢT là TỐ OAN: chỗ
    đó không bao giờ hiện màu ấy. Hỏi DOM: màu luật này khai có phần tử nào
    thật sự mang không. Không chỗ nào → bị đè.
    Chỉ dám kết luận khi CÓ bảng đo; thiếu bảng thì cứ báo, thà tố oan còn
    hơn im lặng bỏ sót.                                                    */
function biDe(sel, mauKhai) {
  if (!coBangNenCha || !mauKhai) return false;
  const c = capCua(sel);
  return c.length > 0 && !c.some(x => x[1] === hex(mauKhai));
}

/*  Selector trong CSS có thể là một danh sách ngăn bởi dấu phẩy; bảng nền
    cha lưu theo TỪNG vế. Trả về cả nền lẫn ĐỘ TIN CẬY để bảng in ra nói rõ
    chỗ nào là đo thật, chỗ nào là suy đoán.                                */
function nenCha(sel, mauKhai) {
  const c = capCua(sel);
  /* Chỉ lấy nền của những phần tử THẬT SỰ đang mang màu luật này khai. Lấy
     hết là ghép nhầm nền của phần tử khác — đúng lỗi tố oan nói ở `biDe`. */
  let gom = (mauKhai ? c.filter(x => x[1] === hex(mauKhai)) : c).map(x => giaiMau(x[0])).filter(Boolean);
  if (!gom.length) gom = c.map(x => giaiMau(x[0])).filter(Boolean);
  if (gom.length) return [gom, 'nền cha ĐO THẬT'];
  const k = KHUNG.find(x => sel.startsWith(x.sel + ' '));
  if (k) return [k.nen, k.sel];
  if (/^\.hero-|^\.login-hero/.test(sel)) return [nenHero, '.login-hero'];
  return [TANG.map(t => t[1]), coBangNenCha ? 'KHÔNG có trong DOM → thử 4 tầng' : 'CHƯA ĐO nền cha → thử 4 tầng'];
}

/* ── 6. TỰ QUÉT MỌI LUẬT CÓ `color` ──────────────────────────────────────── */
const CAP = [];
const daCo = new Set();
const themCap = (ten, chu, nen, ng, ghi) => {
  const k = ten + hex(chu) + hex(nen) + ng;
  if (daCo.has(k)) return;
  daCo.add(k);
  CAP.push({ ten, r: ti(chu, nen), ng, ghi, chu: hex(chu), nen: hex(nen) });
};
let soBiDe = 0;
for (const r of LUAT) {
  const cChu = giaiMau(khai(r.than, 'color') || '');
  if (!cChu || cChu[3] === 0) continue;
  if (cChu[3] >= 1 && biDe(r.sel, cChu)) { soBiDe++; continue; }
  const ng = nguong(r.than), ghi = 'd.' + dong(r.vt);
  const [dsCha, tenCha] = nenCha(r.sel, cChu[3] >= 1 ? cChu : null);
  const dsNen = mauTrong(khai(r.than, 'background') || khai(r.than, 'background-color') || '').filter(c => c[3] > 0);
  if (dsNen.length) {
    /* luật TỰ CHỨA cả chữ lẫn nền — cặp chắc chắn nhất, đo từng chặng */
    for (const n of dsNen) {
      const dsThat = n[3] >= 1 ? [[n, '']] : dsCha.map(c => [pha(n, c), ' / ' + tenCha]);
      for (const [nn, hau] of dsThat) themCap(r.sel + hau, cChu[3] >= 1 ? cChu : pha(cChu, nn), nn, ng, ghi);
    }
  } else {
    /* CHỈ đặt chữ → đo trên nền cha XẤU NHẤT (không in cả 4 cho đỡ nhiễu) */
    let xau = null;
    for (const n of dsCha) {
      const c = cChu[3] >= 1 ? cChu : pha(cChu, n);
      if (!xau || ti(c, n) < xau[0]) xau = [ti(c, n), c, n];
    }
    if (xau) themCap(r.sel + ' / ' + tenCha, xau[1], xau[2], ng, ghi);
  }
}

/* ── 7. In bảng ──────────────────────────────────────────────────────────── */
CAP.sort((a, b) => a.r - b.r);
let dat = 0, truot = 0;
console.log('\n═══ ĐO TƯƠNG PHẢN — WCAG 2.1 ═══');
console.log(`  Nguồn: ${String(duongDan).replace(/^file:\/\/\//, '')}`);
console.log(`  ${soKhoiRoot} khối :root · ${Object.keys(M).length} biến · ${LUAT.length} luật lá · ${CAP.length} cặp chữ–nền`);
console.log(`  Nền cha: ${coBangNenCha ? 'ĐO THẬT từ DOM (scripts/nen-cha.json)' : '⚠️ CHƯA ĐO — chạy `node scripts/do-nen-cha.mjs`'}` +
            `${soBiDe ? ` · bỏ ${soBiDe} luật bị luật đặc hiệu hơn ĐÈ (không hiện ra)` : ''}\n`);
for (const c of CAP) {
  const ok = c.r >= c.ng;
  ok ? dat++ : truot++;
  if (!ok || process.env.DAY_DU) {
    console.log(`  ${ok ? 'ĐẠT ' : 'TRƯỢT'} ${c.r.toFixed(2).padStart(6)}:1 (cần ${c.ng})  ${c.chu} trên ${c.nen}  ${c.ten.slice(0, 54).padEnd(54)} ${c.ghi}`);
  }
}
console.log(`  (mặc định chỉ in dòng TRƯỢT; đặt DAY_DU=1 để in cả ${dat} dòng ĐẠT)`);

/* ── 8. Bốn tầng nền có tách nhau không ──────────────────────────────────── */
console.log('\n═══ PHÂN CẤP MẶT PHẲNG (ΔL*) ═══\n');
const in2 = (ten, a, b, ng, ok, xau) => {
  const d = Math.abs(Lsao(a) - Lsao(b));
  console.log(`  ${d >= ng ? 'ĐẠT ' : 'TRƯỢT'} ${ten}: L* ${Lsao(a).toFixed(2)} ↔ ${Lsao(b).toFixed(2)} = ΔL* ${d.toFixed(2)}  → ${d >= ng ? ok : xau}`);
  if (d < ng) truot++;
};
/* F1 — ĐỌC THẲNG nền `.main` TỪ CSS, không tin lời khai. `.app` phủ 100vh
   nên `.main` mới là nền Sếp thật sự nhìn thấy sau khi đăng nhập. */
const nenMain = nenCua('.main')[0];
console.log(`  Nền vùng nội dung (.main) đọc từ CSS = ${hex(nenMain)}   (--bg=${hex(T('bg'))} · --surface=${hex(T('surface'))})`);
in2('.main ↔ mặt thẻ (.panel)', nenMain, T('card'), 4, 'THẺ TRẮNG NỔI RÕ trên màn làm việc', '✗ thẻ chìm — Sếp sẽ nói "vẫn thế"');
in2('Nền --bg ↔ mặt thẻ      ', T('bg'), T('card'), 2, 'thẻ nổi khỏi nền', 'QUÁ SÁT — trang thành tấm giấy phẳng');
in2('Nền --bg ↔ --surface    ', T('bg'), T('surface'), 2, 'khung đăng nhập còn nổi', 'KHUNG ĐĂNG NHẬP TAN VÀO NỀN');
in2('--surface ↔ mặt thẻ     ', T('surface'), T('card'), 2, 'ô nhập/dòng di chuột còn chìm rõ', 'Ô NHẬP MẤT HÌNH trong thẻ trắng');
in2('Rãnh .seg ↔ nút chọn    ', T('surface-2'), T('card'), 3, 'nút đang chọn còn thấy', 'nút .seg đang chọn BIẾN MẤT');
in2('Đường kẻ ↔ mặt thẻ      ', T('line'), T('card'), 3, 'viền thẻ còn nhìn ra', 'VIỀN TÀNG HÌNH');
in2('Đường kẻ ↔ nền trang    ', T('line'), T('bg'), 2, 'viền còn thấy ngoài nền', 'viền chìm khi đặt trên nền trang');
const dungThuTu = TANG.every((t, i) => i === 0 || Lsao(t[1]) > Lsao(TANG[i - 1][1]));
console.log(`\n  Thứ tự tầng ${TANG.map(t => t[0] + '(' + Lsao(t[1]).toFixed(2) + ')').join(' < ')}`);
console.log(`  ${dungThuTu ? 'ĐẠT   ĐÚNG thứ tự chìm→nổi' : 'TRƯỢT ✗ ĐẢO TẦNG — phân cấp mặt phẳng hỏng'}`);
if (!dungThuTu) truot++;

/* ── 10. TEM TÀI SẢN 60×40mm IN RA GIẤY (ADR-0008) ───────────────────────── */
console.log('\n═══ TEM TÀI SẢN 60×40mm — @media print ═══\n');
{
  const dauTem = css.indexOf('.ts-tem {');
  const vungTem = css.slice(dauTem, css.indexOf('@media print', dauTem) + 200);
  const dungBien = [...vungTem.matchAll(/color:\s*var\(--([a-z0-9-]+)\)/g)].map(m => m[1]);
  const ok1 = dungBien.length === 0;
  console.log(`  ${ok1 ? 'ĐẠT ' : 'TRƯỢT'}  Chữ tem KHÔNG phụ thuộc bảng màu` + (ok1 ? '  (đen tuyền #000/#333, cố định)' : `  ← DÍNH BIẾN: ${dungBien.join(', ')}`));
  if (!ok1) truot++;
  const ok2 = /background:\s*var\(--/.test(vungTem.slice(0, vungTem.indexOf('@media print')));
  console.log(`  ${!ok2 ? 'ĐẠT ' : 'TRƯỢT'}  Nền tem KHÔNG phụ thuộc bảng màu`);
  if (ok2) truot++;
  const ok3 = /visibility/.test(vungTem.slice(vungTem.indexOf('@media print')));
  console.log(`  ${ok3 ? 'ĐẠT ' : 'TRƯỢT'}  @media print giữ cơ chế visibility (ADR-0008) nguyên vẹn`);
  if (!ok3) truot++;
  console.log(`  ĐẠT    Chữ #000 trên giấy trắng: ${ti(giaiMau('#000'), giaiMau('#fff')).toFixed(2)}:1`);
  console.log(`  ĐẠT    Chữ #333 (dòng phụ) trên giấy trắng: ${ti(giaiMau('#333'), giaiMau('#fff')).toFixed(2)}:1`);
  const mucCu = (100 - Lsao(giaiMau('#ded9d3'))).toFixed(2), mucMoi = (100 - Lsao(T('bg'))).toFixed(2);
  console.log(`  Nếu bật "in cả nền": phủ mực nền cũ ${mucCu}% → mới ${mucMoi}%  → ${+mucMoi < +mucCu ? 'ĐỠ TỐN MỰC HƠN TRƯỚC' : 'TỐN HƠN — xem lại'}`);
}

/* ── 11. BH-16 · CA ĐỐI CHỨNG — dựng lại ĐÚNG từng màu đã vá ────────────── */
console.log('\n═══ CA ĐỐI CHỨNG (BH-16) — phép đo phải BẮT ĐƯỢC màu sai ═══\n');
const nenXc = giaiMau('var(--bg2, #f3f4f0)');
const doiChung = [
  ['Chữ #cfc9c0 (xám nhạt) trên mặt thẻ', ti(giaiMau('#cfc9c0'), T('card')), 4.5],
  ['Chữ #9aab86 (sage CŨ) trên mặt thẻ', ti(giaiMau('#9aab86'), T('card')), 4.5],
  ['TRẮNG trên #6ca839 (xanh logo) — vì sao KHÔNG làm nền cho chữ trắng', ti(giaiMau('#fff'), giaiMau('#6ca839')), 4.5],
  ['TRẮNG cỡ LỚN + ĐẬM trên #6ca839 — font-weight KHÔNG cứu nổi', ti(giaiMau('#fff'), giaiMau('#6ca839')), 3],
  ['F1 hoàn nguyên: .main = --surface → ΔL* nền↔thẻ', Math.abs(Lsao(T('surface')) - Lsao(T('card'))), 4],
  ['F2 hoàn nguyên: .hero-foot trắng .82 trên #9aab86 cũ', ti(pha(giaiMau('rgba(255,255,255,.82)'), giaiMau('#9aab86')), giaiMau('#9aab86')), 4.5],
  ['F3 hoàn nguyên: .topbar #f2f1ee cũ lệch nền .main mới (ΔL*, nghịch)', 1 / Math.max(Math.abs(Lsao(giaiMau('#f2f1ee')) - Lsao(nenMain)), 1e-9), 1 / 0.8],
  ['F5a hoàn nguyên: .tag-new chữ trắng trên #e8590c', ti(giaiMau('#fff'), giaiMau('#e8590c')), 4.5],
  ['F5b hoàn nguyên: .mt-the-pct.warn --warn trên --surface', ti(T('warn'), T('surface')), 4.5],
  ['F5c hoàn nguyên: .xc-ngay-tt.du_thua #8a6d00 trên đầu bảng', ti(giaiMau('#8a6d00'), nenXc), 4.5],
  ['F6 hoàn nguyên: .sb-item.active --ink trên --sage', ti(T('ink'), T('sage')), 4.5],
  /* ĐỢT 2 — thanh bên đổi nền TỐI→SÁNG. Dựng lại bộ màu chữ SÁNG của bản cũ
     đặt lên nền thanh bên sáng #fbf9f5.
     ⚠️ DÙNG HẰNG SỐ #fbf9f5, KHÔNG đọc token của file đang đo. Bản nháp đầu
     đọc token và hỏng ngay: chạy trên file CŨ (thanh bên còn tối) thì hai ca
     này hoá ra "không bắt được" → bàn đo tự tuyên bố mình hỏng và mất luôn
     khả năng so trước/sau, đúng lúc cần nó nhất. Ca đối chứng phải là một tổ
     hợp CỐ ĐỊNH đã biết là sai, không phụ thuộc file đem ra đo. */
  ['ĐỢT2: chữ .thd-ok cũ #8fc47a trên nền thanh bên sáng #fbf9f5', ti(giaiMau('#8fc47a'), giaiMau('#fbf9f5')), 4.5],
  ['ĐỢT2: chữ .sb-item cũ trắng .76 trên nền thanh bên sáng #fbf9f5', ti(pha(giaiMau('rgba(255,255,255,.76)'), giaiMau('#fbf9f5')), giaiMau('#fbf9f5')), 4.5],
  ['ĐỢT2 hoàn nguyên: nền thanh bên = --ink → L* phải bị bắt là quá tối', Lsao(T('ink')), 90],
  /* ── ĐỢT 2c — mỗi chỗ vá vòng này một ca đối chứng (BH-16). Vì sao từng ca
     BẮT BUỘC phải hỏng, nói trước khi chạy (BH-26):                        */
  /*  ① Nền thanh bên đậm thêm 9,5 bậc L*. Giữ `--text-mute` CŨ #6e675e thì
         dòng chức danh dưới tên Sếp tụt dưới 4.5 — lệch cơ học, không phụ
         thuộc dữ liệu nào.                                                 */
  ['2c: --text-mute CŨ #6e675e trên nền thanh bên beige #ebdcca', ti(giaiMau('#6e675e'), giaiMau('#ebdcca')), 4.5],
  /*  ② `--line` cũ #e5dccd L* 88.09 cạnh nền thanh bên L* 88.50 → đường kẻ
         nhóm chênh 0.41 bậc, mắt không thấy. Đo bằng ΔL*, ngưỡng 2.         */
  ['2c: --line CŨ #e5dccd cạnh nền thanh bên beige (ΔL*)', Math.abs(Lsao(giaiMau('#e5dccd')) - Lsao(giaiMau('#ebdcca'))), 2],
  /*  ③ Chữ kem trên dải cam CŨ của `.mt-panel` — đúng chỗ bàn đo DOM bắt
         được (2.92:1, ngưỡng chữ lớn 3).                                   */
  ['2c: chữ kem --white trên dải cam CŨ #e2792e (chữ lớn)', ti(T('white'), giaiMau('#e2792e')), 3],
  /*  ④ Nút "+ Khen ai đó" bản cũ: kem .22 pha lên đầu SÁNG của dải vinh danh. */
  ['2c: #vd-nut-mo CŨ — kem .22 trên #d9a441', ti(giaiMau('#fff'), pha(giaiMau('rgba(255,255,255,.22)'), giaiMau('#d9a441'))), 4.5],
  /*  ⑤ `var(--ok)` trong app.js d.4711 trên nền `.form-loi` — lỗi H2.       */
  ['2c: app.js var(--ok) CŨ trên --danger-wash ("Đã đồng bộ xong…")', ti(T('ok'), T('danger-wash')), 4.5],
  /*  ⑥ `--danger` làm CHỮ trên `--surface-2` — 11 chỗ Kho đọc hằng ngày.    */
  ['2c: --danger làm CHỮ trên --surface-2 (chưa có --danger-dark)', ti(T('danger'), T('surface-2')), 4.5],
  /* (Không thêm ca "nền thanh bên hiện tại phải sáng" vào đây: mục đối chứng
     kiểm PHÉP ĐO có bắt được lỗi cố ý hay không, không phải nơi khẳng định
     thiết kế. Nhét vào thì chạy bàn đo trên bản CŨ sẽ tự báo "phép đo hỏng"
     và mất luôn khả năng so trước/sau.) */
];
let batDuoc = 0;
for (const [ten, r, ng] of doiChung) {
  const bat = r < ng;
  if (bat) batDuoc++;
  console.log(`  ${bat ? 'BẮT ĐƯỢC      ' : 'KHÔNG BẮT ←HỎNG'} ${r.toFixed(2).padStart(6)} (ngưỡng ${ng})  ${ten}`);
}

console.log('\n───────────────────────────────────────────────────────────');
console.log(`  Cặp chữ–nền: ${dat} đạt · ${truot} trượt   (trên ${CAP.length} cặp TỰ QUÉT, không chọn tay)`);
console.log(`  Đối chứng: bắt được ${batDuoc}/${doiChung.length} trường hợp cố ý sai`);
if (batDuoc !== doiChung.length) {
  console.log('\n  ✗ PHÉP ĐO HỎNG — không bắt được màu cố ý sai. Sửa phép đo trước.');
  process.exit(2);
}
console.log(truot === 0 ? '\n  ✓ Mọi cặp chữ–nền đạt ngưỡng WCAG.' : `\n  ✗ Còn ${truot} chỗ dưới ngưỡng — xem dòng TRƯỢT ở trên.`);
process.exit(truot === 0 ? 0 : 1);
