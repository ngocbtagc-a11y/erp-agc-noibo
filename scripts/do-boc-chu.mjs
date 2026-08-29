/* ==========================================================================
   ĐO ĐỘ CHÍNH XÁC BÓC CHỮ — CTL-0026 Mục 7
   ---------------------------------------------------------------------------
   Yêu cầu của phiếu: "Đo độ chính xác bóc chữ trên giấy tờ tiếng Việt thật
   (dấu, chữ in mờ, dấu đỏ) — NÊU SỐ, đừng nói 'đọc tốt'."

   Chạy hai bước:
     1. node scripts/ban-quet-tai-lieu.mjs   → mở http://127.0.0.1:8902
        (bàn đo trình duyệt tự ghi 3 ảnh thử vào `.do-tam/`)
     2. node scripts/do-boc-chu.mjs

   VÌ SAO PHẢI QUA BƯỚC 1: ảnh thử BẮT BUỘC đi qua đúng `nenAnhChung()` với
   đúng thông số màn quét đang chạy. Tự dựng ảnh riêng cho phép đo OCR là đo
   một đường KHÁC với đường sản phẩm — số ra đẹp mà vô giá trị.

   BA TẤM ẢNH, cố ý khác nhau về CHẤT (đây là ca đối chứng, BH-16/BH-26):
     · anh-thu-net  — đúng thông số sản phẩm (1100px · 0.65)
     · anh-thu-mo   — CÙNG nội dung nhưng làm nhoè 6px: cảnh "chụp mờ"
     · anh-thu-te   — nén rất mạnh (700px · 0.40): xem tệ tới đâu thì hỏng
   Nếu ba tấm ra CÙNG một điểm số thì phép đo hỏng, không phải AI giỏi.

   CÁCH TÍNH ĐIỂM — hai con số, đo hai thứ khác nhau:
     ① ĐÚNG TRƯỜNG   — bao nhiêu trong 8 thông tin then chốt (số hiệu, tên
                       công ty, ngày cấp, ngày hết hạn, tên người đại diện,
                       số nghị định…) xuất hiện ĐÚNG trong chữ bóc được.
                       Đây mới là con số quyết định "tra cứu có dùng được
                       không". Có so cả bản CÓ DẤU lẫn bản BỎ DẤU, vì kho
                       tài liệu tra được cả hai.
     ② GIỐNG KÝ TỰ   — khoảng cách Levenshtein giữa chữ bóc được và bản gốc,
                       quy ra phần trăm. Con số này khắt khe và hay thấp,
                       nêu ra để không ai tưởng AI chép lại nguyên văn.

   TỐN TIỀN KHÔNG: không. Workers AI đã có trong tài khoản và ERP đang dùng
   đúng mô hình này để đọc CCCD. Bàn đo dựng một Worker TẠM trong `.do-tam/`
   để không đụng vào ERP đang chạy.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = path.join(GOC, '.do-tam');
const CONG = 8903;

const ANH = ['anh-thu-net', 'anh-thu-mo', 'anh-thu-te'];
const THIEU = ANH.filter(t => !existsSync(path.join(TAM, t + '.jpg')));
if (THIEU.length) {
  console.error(`Thiếu ảnh thử: ${THIEU.join(', ')}\n` +
    'Chạy `node scripts/ban-quet-tai-lieu.mjs` rồi mở http://127.0.0.1:8902 một lượt trước.');
  process.exit(2);
}

/* ---- Bản gốc: ĐÚNG chữ đã vẽ lên trang giấy trong bàn đo trình duyệt ---- */
const BAN_GOC = [
  'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  'Độc lập — Tự do — Hạnh phúc',
  'GIẤY CHỨNG NHẬN',
  'CƠ SỞ ĐỦ ĐIỀU KIỆN AN TOÀN THỰC PHẨM',
  'Số: 124/2026/GCN-ATTP',
  'Tên cơ sở: CÔNG TY TNHH ALPHA GREEN COMMERCE',
  'Địa chỉ: Số 12, ngõ 45, phường Yên Hoà, quận Cầu Giấy, Hà Nội',
  'Người đại diện: Bùi Thị Ngọc — Chức vụ: Giám đốc',
  'Loại hình: Kinh doanh thực phẩm nhập khẩu và nông sản khô',
  'Ngày cấp: 15/03/2026        Có giá trị đến: 15/03/2029',
  'Cơ sở nêu trên đủ điều kiện an toàn thực phẩm theo quy định',
  'tại Nghị định số 15/2018/NĐ-CP ngày 02 tháng 02 năm 2018 của',
  'Chính phủ quy định chi tiết thi hành một số điều của Luật An',
  'toàn thực phẩm.',
  'Giấy chứng nhận này có giá trị trong thời hạn 03 (ba) năm kể',
  'từ ngày ký. Cơ sở có trách nhiệm duy trì các điều kiện đã được',
  'thẩm định trong suốt quá trình hoạt động.'
].join('\n');

/* Tám thông tin then chốt — đây là thứ quyết định kho có tra được không. */
const TRUONG = [
  ['Số hiệu giấy',        '124/2026/GCN-ATTP'],
  ['Tên công ty',         'ALPHA GREEN COMMERCE'],
  ['Ngày cấp',            '15/03/2026'],
  ['Ngày hết hạn',        '15/03/2029'],
  ['Người đại diện',      'Bùi Thị Ngọc'],
  ['Số nghị định',        '15/2018/NĐ-CP'],
  ['Quận (có dấu)',       'Cầu Giấy'],
  ['Tên loại giấy',       'AN TOÀN THỰC PHẨM']
];

/* ---- Bỏ dấu: DÙNG LẠI đúng hàm của sản phẩm, không viết bản thứ hai ----- */
const { boDau } = await import(new URL('../src/tai-lieu.js', import.meta.url).href);

/* ---- Khoảng cách Levenshtein, hai hàng bộ nhớ (chuỗi vài nghìn ký tự) --- */
function khoangCach(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let truoc = Array.from({ length: b.length + 1 }, (_, i) => i);
  let nay = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    nay[0] = i;
    for (let j = 1; j <= b.length; j++) {
      nay[j] = Math.min(truoc[j] + 1, nay[j - 1] + 1, truoc[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [truoc, nay] = [nay, truoc];
  }
  return truoc[b.length];
}

const gonChu = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/* ==========================================================================
   Worker TẠM — cùng mô hình, cùng câu nhắc với src/tai-lieu.js
   ========================================================================== */
const NHAC =
  'Đây là ảnh chụp một trang giấy tờ hành chính Việt Nam. Hãy chép lại TOÀN BỘ ' +
  'chữ nhìn thấy trong ảnh, giữ nguyên tiếng Việt CÓ DẤU, giữ nguyên số hiệu, ' +
  'ngày tháng, tên riêng và các con số. Xuống dòng như trên giấy. ' +
  'KHÔNG tóm tắt, KHÔNG giải thích, KHÔNG thêm lời nào của bạn. ' +
  'Chỗ nào mờ không đọc được thì ghi [không rõ].';

mkdirSync(TAM, { recursive: true });
writeFileSync(path.join(TAM, 'worker-boc-chu.js'), `
export default {
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('POST đi', { status: 405 });
    const { anh, nhac, mo } = await req.json();
    const bin = atob(anh);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const t0 = Date.now();
    try {
      const kq = await env.AI.run(mo || '@cf/meta/llama-3.2-11b-vision-instruct', {
        image: Array.from(u8), prompt: nhac, max_tokens: 1024
      });
      return Response.json({ ok: true, chu: kq?.response ?? kq?.description ?? kq?.text ?? '', ms: Date.now() - t0 });
    } catch (e) {
      return Response.json({ ok: false, loi: String(e && e.message), ms: Date.now() - t0 });
    }
  }
};
`);
writeFileSync(path.join(TAM, 'wrangler-boc-chu.toml'), `
name = "do-boc-chu-tam"
main = "worker-boc-chu.js"
compatibility_date = "2026-06-10"
[ai]
binding = "AI"
`);

console.log('Khởi động Worker tạm để gọi Workers AI…');
const wr = spawn('npx', ['wrangler', 'dev',
  '--config', path.join(TAM, 'wrangler-boc-chu.toml'),
  '--port', String(CONG), '--ip', '127.0.0.1'],
  { cwd: TAM, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });

let log = '';
wr.stdout.on('data', d => { log += d; });
wr.stderr.on('data', d => { log += d; });

const cho = (ms) => new Promise(r => setTimeout(r, ms));
let san = false;
for (let i = 0; i < 90 && !san; i++) {
  await cho(1000);
  try { await fetch(`http://127.0.0.1:${CONG}/`, { method: 'POST', body: '{}' }); san = true; } catch { /* chưa lên */ }
}
if (!san) {
  console.error('Worker tạm không lên được. Log:\n' + log.slice(-2000));
  wr.kill(); process.exit(1);
}
console.log('Worker tạm đã sẵn sàng.\n');

/* ========================================================================== */
const gocGon = gonChu(BAN_GOC);
const gocGonKD = boDau(gocGon);
const ketQua = [];

for (const ten of ANH) {
  const b64 = readFileSync(path.join(TAM, ten + '.jpg')).toString('base64');
  process.stdout.write(`  ${ten} (${(b64.length * 3 / 4 / 1024).toFixed(0)} KB) → đang hỏi AI… `);
  let j;
  try {
    const r = await fetch(`http://127.0.0.1:${CONG}/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anh: b64, nhac: NHAC })
    });
    j = await r.json();
  } catch (e) { j = { ok: false, loi: e.message, ms: 0 }; }

  if (!j.ok) {
    console.log('✗');
    /* Lỗi 5016 KHÔNG phải lỗi mã nguồn và KHÔNG phải "AI đọc kém" — nó là
       một cái CỔNG CHƯA MỞ trên tài khoản Cloudflare. Phải nói rõ ra, chứ in
       nguyên câu tiếng Anh thì người đọc báo cáo tưởng bóc chữ hỏng. */
    if (/5016|must submit the prompt/i.test(String(j.loi))) {
      console.log('\n  ╔══════════════════════════════════════════════════════════════════╗');
      console.log('  ║  CHẶN Ở TÀI KHOẢN, KHÔNG PHẢI Ở MÃ NGUỒN                        ║');
      console.log('  ╚══════════════════════════════════════════════════════════════════╝');
      console.log('  Workers AI trả lỗi 5016: mô hình đọc ảnh (Llama 3.2 Vision) đòi chủ');
      console.log('  tài khoản CHẤP NHẬN ĐIỀU KHOẢN Llama một lần trước khi dùng.');
      console.log('  → Việc này là chấp nhận một thoả thuận pháp lý thay công ty, nên');
      console.log('    PHẢI do Sếp (chủ tài khoản) tự bấm, không ai làm thay được.');
      console.log('  → HỆ QUẢ RỘNG HƠN: đường đọc ảnh CCCD đang có trong ERP');
      console.log('    (src/nhansu.js → docCCCD) cũng đang chết vì đúng lý do này.');
      console.log('  → Chạy lại bàn đo này sau khi mở cổng để có con số độ chính xác.\n');
      wr.kill();
      process.exit(3);
    }
    ketQua.push({ ten, hong: j.loi });
    continue;
  }

  const bocGon = gonChu(j.chu);
  const bocKD = boDau(bocGon);
  const giong = 100 * (1 - khoangCach(bocKD, gocGonKD) / Math.max(bocKD.length, gocGonKD.length, 1));

  let dungTruong = 0;
  const chiTiet = [];
  for (const [nhan, gia] of TRUONG) {
    const coDau = bocGon.includes(gia);
    const khongDau = bocKD.includes(boDau(gia));
    if (coDau || khongDau) dungTruong++;
    chiTiet.push(`      ${(coDau ? 'ĐÚNG cả dấu' : khongDau ? 'đúng (sai dấu)' : '✗ SAI/thiếu ').padEnd(16)} ${nhan}: ${gia}`);
  }
  console.log(`${j.ms} ms`);
  ketQua.push({ ten, ms: j.ms, dungTruong, giong, chiTiet, chu: bocGon });
}

wr.kill();

console.log('\n═══ ĐỘ CHÍNH XÁC BÓC CHỮ — @cf/meta/llama-3.2-11b-vision-instruct ═══');
for (const k of ketQua) {
  if (k.hong) { console.log(`\n${k.ten}: ✗ HỎNG — ${k.hong}`); continue; }
  console.log(`\n${k.ten}  (${k.ms} ms)`);
  console.log(`  ① ĐÚNG TRƯỜNG: ${k.dungTruong}/${TRUONG.length} = ${(k.dungTruong / TRUONG.length * 100).toFixed(0)}%`);
  k.chiTiet.forEach(d => console.log(d));
  console.log(`  ② GIỐNG KÝ TỰ (Levenshtein, đã bỏ dấu): ${k.giong.toFixed(1)}%`);
  console.log(`  Chữ bóc được (240 ký tự đầu): ${k.chu.slice(0, 240)}…`);
}

/* ---- Ca đối chứng: ảnh nét PHẢI hơn ảnh mờ/nén tệ ----------------------- */
const net = ketQua.find(k => k.ten === 'anh-thu-net');
const mo = ketQua.find(k => k.ten === 'anh-thu-mo');
const te = ketQua.find(k => k.ten === 'anh-thu-te');
console.log('\n─── CA ĐỐI CHỨNG (BH-16) ───');
if (net && mo && !net.hong && !mo.hong) {
  const batDuoc = net.dungTruong > mo.dungTruong || net.giong > mo.giong + 2;
  console.log(`  Ảnh NÉT ${net.dungTruong}/${TRUONG.length} trường (${net.giong.toFixed(1)}% ký tự) · ` +
              `ảnh MỜ ${mo.dungTruong}/${TRUONG.length} (${mo.giong.toFixed(1)}%)`);
  console.log(`  ${batDuoc ? 'BẮT ĐƯỢC' : '✗ PHÉP ĐO ĐÁNG NGỜ'} — ảnh mờ phải kém hơn ảnh nét. ` +
    `${batDuoc ? '' : 'Bằng nhau nghĩa là phép đo không nhạy với chất lượng ảnh.'}`);
}
if (net && te && !net.hong && !te.hong) {
  console.log(`  Nén tệ (700px · 0.40): ${te.dungTruong}/${TRUONG.length} trường (${te.giong.toFixed(1)}%) — ` +
    'mốc để biết hạ thông số nén tới đâu là bắt đầu mất chữ.');
}
console.log('\n  Nhắc lại: bóc chữ HỎNG cũng KHÔNG chặn việc lưu tài liệu.');
console.log('  Tài liệu vẫn vào kho, chỉ là tra bằng tên thay vì tra bằng nội dung.');
