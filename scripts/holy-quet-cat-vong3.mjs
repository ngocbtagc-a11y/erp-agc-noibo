/* ==========================================================================
   HỒ LY · vòng 3 — ĐẾM ĐỘC LẬP lớp "màn nhận `cat` rồi vứt"
   ---------------------------------------------------------------------------
   Người xây khai: 14 hàm máy chủ trả `cat` → 10 đường API → 9 hàm `API.*`;
   quét 12 tệp giao diện ra 6 chỗ; vá 4, miễn trừ 2.
   File này KHÔNG dùng máy quét của người xây. Tự dựng lại từ đầu:
     ① tìm mọi `return json({...})` có khoá `cat` trong src/index.js
     ② bảng tuyến → tên hàm xử lý → đường API
     ③ api.js: đường API → tên hàm `API.*`
     ④ mọi tệp .js trong public/assets/js: gọi `API.<ten>` rồi CÓ đọc `.cat` không
   Không sửa mã sản phẩm. Chỉ đọc.
   ========================================================================== */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(path.join(GOC, 'src', 'index.js'), 'utf8');

/* ---- ① hàm máy chủ trả `cat` ------------------------------------------- */
// Tìm tên hàm bao quanh một vị trí.
const dsHam = [];
const reHam = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g;
let m;
while ((m = reHam.exec(src))) dsHam.push({ ten: m[1], vt: m.index });
const hamTai = (vt) => {
  let t = null;
  for (const h of dsHam) { if (h.vt <= vt) t = h.ten; else break; }
  return t;
};

// `return json({ … })` — cân ngoặc để lấy trọn thân object.
const traCat = new Map();   // tên hàm -> [khoá cat tìm thấy]
const reJson = /return\s+json\(\s*\{/g;
while ((m = reJson.exec(src))) {
  let i = m.index + m[0].length - 1, sau = 1, j = i;
  while (sau > 0 && j < src.length - 1) { j++; if (src[j] === '{') sau++; else if (src[j] === '}') sau--; }
  const than = src.slice(i, j + 1);
  const khoa = [...than.matchAll(/(?:^|[\s,{])(cat[A-Za-z0-9_]*)\s*[,:}]/g)].map(x => x[1]);
  if (khoa.length) {
    const h = hamTai(m.index);
    if (!traCat.has(h)) traCat.set(h, new Set());
    khoa.forEach(k => traCat.get(h).add(k));
  }
}

/* ---- ② bảng tuyến ------------------------------------------------------- */
const tuyen = [];   // {duong, ham}
for (const r of src.matchAll(/'(GET|POST|PUT|DELETE)\s+(\/api\/[^']+)'\s*:\s*([A-Za-z0-9_$]+)/g)) {
  tuyen.push({ pt: r[1].trim(), duong: r[2], ham: r[3] });
}

/* ---- ③ api.js ----------------------------------------------------------- */
const apiJs = readFileSync(path.join(GOC, 'public', 'assets', 'js', 'api.js'), 'utf8');
const apiHam = [];  // {ten, duong}
for (const r of apiJs.matchAll(/(?:^|\n)\s{2}([A-Za-z0-9_$]+)\s*:\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>\s*([\s\S]{0,300}?)(?=\n\s{2}[A-Za-z0-9_$]+\s*:|\n\};)/g)) {
  const d = [...r[2].matchAll(/['"`](\/api\/[^'"`?]*)/g)].map(x => x[1]);
  if (d.length) apiHam.push({ ten: r[1], duong: [...new Set(d)] });
}

/* ---- ghép -------------------------------------------------------------- */
const hamCat = [...traCat.keys()].filter(Boolean);
const duongCat = tuyen.filter(t => hamCat.includes(t.ham));
const apiCat = apiHam.filter(a => a.duong.some(d => duongCat.some(t => t.duong === d)));

/* ---- ④ chỗ gọi trong giao diện ------------------------------------------ */
const thuMuc = path.join(GOC, 'public', 'assets', 'js');
const tepJs = readdirSync(thuMuc).filter(f => f.endsWith('.js'));
const goi = [];
for (const f of tepJs) {
  const noi = readFileSync(path.join(thuMuc, f), 'utf8');
  const dong = noi.split('\n');
  for (const a of apiCat) {
    const re = new RegExp(`API\\.${a.ten}\\s*\\(`, 'g');
    let x;
    while ((x = re.exec(noi))) {
      const soDong = noi.slice(0, x.index).split('\n').length;
      // Nhìn 40 dòng quanh chỗ gọi xem có đọc `.cat`/`cat_` hay `veDaiCat` không
      const quanh = dong.slice(Math.max(0, soDong - 6), soDong + 40).join('\n');
      const doc = /\.cat\b|\bcat_[a-z]|veDaiCat|\bcat\b\s*[),}]|{\s*[^}]*\bcat\b[^}]*}\s*=/.test(quanh);
      goi.push({ tep: f, dong: soDong, api: a.ten, doc });
    }
  }
}

/* ==========================================================================
   ⑤ MÁY QUÉT ②b CỦA NGƯỜI XÂY CÓ MÙ CHỖ NÀO KHÔNG?
   ---------------------------------------------------------------------------
   Ca đối chứng của họ chứng minh được 2 mẫu bẩn BỊ BẮT (hàm chỉ gọi MỘT cửa
   rồi vứt `cat`) và 3 mẫu sạch KHÔNG bị bắt oan. Cả hai mẫu bẩn đều là "hàm
   này không nhắc chữ `cat` ở đâu cả".
   CÁCH THỨ BA — cái ca đối chứng của họ KHÔNG có: một hàm nghe `cat` cho cửa
   NÀY rồi vứt `cat` của cửa KIA. Vị ngữ của họ là "thân hàm bao quanh CÓ
   nhắc tới cat", một lần cho cả thân hàm — nên chỉ cần một chữ `cat` ở bất
   kỳ đâu trong hàm là mọi lời gọi khác trong cùng hàm được tha.
   Dưới đây dựng lại NGUYÊN VĂN vị ngữ ấy rồi cho ăn mẫu cách-thứ-ba.
   ========================================================================== */
const MOC_HAM_LONG =
  /^(\s*)(?:export\s+)?(?:default\s+)?(?:(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:function\b|\(|[A-Za-z0-9_$]+\s*=>))/;
function thanHamQuanh(dong, i) {
  for (let k = i; k >= 0; k--) {
    const mm = MOC_HAM_LONG.exec(dong[k]);
    if (!mm) continue;
    const thut = mm[1].length;
    let het = dong.length;
    for (let j = k + 1; j < dong.length; j++) {
      if (/^\s*[}\])]/.test(dong[j]) && (dong[j].match(/^\s*/) || [''])[0].length <= thut) { het = j + 1; break; }
    }
    if (het <= i) continue;
    return { ten: mm[2] || mm[3], tuDong: k + 1, than: dong.slice(k, het).join('\n') };
  }
  return { ten: '(cấp tệp)', tuDong: 1, than: dong.join('\n') };
}
const CO_NGHE_CAT = /\bveDaiCat\s*\(|\.cat(_[a-z_]+)?\b|\bcat(_[a-z_]+)?\s*[,}):]/;

const MAU_CACH_3 = {
  'a · một hàm: nghe `cat` cửa NÀY, vứt `cat` cửa KIA': `
  async function veMotMan(id) {
    const viec = await API.cvDanhSach();
    veDaiCat('#cv-cat', viec.cat_nhan, { don_vi: 'việc' });
    const ls = await API.suaLichSu('cong_viec', id);
    const ds = (ls.ds || []).filter(d => d.truong === 'nhan_xet');
    if (!ds.length) { trong.hidden = false; return; }
    khoi.innerHTML = ds.map(d => d.cau).join('');
  }
`,
  'b · vứt `cat`, nhưng trong hàm có một chữ `.category` / biến tên `cat`': `
  async function veManKhac(id) {
    const cat = 'nhóm-hàng';
    const ls = await API.suaLichSu('cong_viec', id);
    o.innerHTML = (ls.ds || []).map(d => d.cau + cat).join('');
  }
`,
  'c · lời gọi nằm trong hàm-con, hàm-cha có `veDaiCat` cho danh sách khác': `
  function moMan() {
    veDaiCat('#ls-cat', DU_LIEU.cat, { don_vi: 'đơn' });
    nut.addEventListener('click', async () => {
      const ls = await API.suaLichSu('cong_viec', 1);
      o.innerHTML = (ls.ds || []).map(d => d.cau).join('');
    });
  }
`
};
console.log('⑤ ĐIỂM MÙ CÁCH-THỨ-BA của vị ngữ ②b ("thân hàm bao quanh có nhắc `cat`")');
let soLot = 0;
for (const [ten, ma] of Object.entries(MAU_CACH_3)) {
  const dong = ma.split('\n');
  const i = dong.findIndex(d => /API\.suaLichSu\s*\(/.test(d));
  const h = thanHamQuanh(dong, i);
  const batDuoc = !CO_NGHE_CAT.test(h.than);
  if (!batDuoc) soLot++;
  console.log(`   ${batDuoc ? '✅ BẮT ĐƯỢC' : '❌ LỌT     '}  ${ten}  (hàm bao quanh: ${h.ten})`);
}
console.log(`   => ${soLot}/3 mẫu bẩn cách-thứ-ba LỌT qua lưới ②b\n`);

console.log('\n① HÀM MÁY CHỦ TRẢ `cat`: ' + hamCat.length);
console.log('   ' + hamCat.join(' · '));
console.log('\n② ĐƯỜNG API dẫn tới các hàm đó: ' + duongCat.length);
duongCat.forEach(t => console.log(`   ${t.pt} ${t.duong}  →  ${t.ham}`));
console.log('\n③ HÀM API.* tương ứng: ' + apiCat.length);
apiCat.forEach(a => console.log(`   API.${a.ten}  →  ${a.duong.join(', ')}`));
console.log(`\n④ CHỖ GỌI trong ${tepJs.length} tệp giao diện: ${goi.length}`);
const vut = goi.filter(g => !g.doc);
goi.forEach(g => console.log(`   ${g.doc ? '✔ đọc cat ' : '✘ VỨT     '} ${g.tep}:${g.dong}  API.${g.api}`));
console.log(`\n=> NGHI VỨT: ${vut.length} chỗ`);
vut.forEach(g => console.log(`   ${g.tep}:${g.dong}  API.${g.api}`));
