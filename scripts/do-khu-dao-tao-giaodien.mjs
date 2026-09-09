/* ==========================================================================
   BÀN ĐO GIAO DIỆN KHU ĐÀO TẠO — TRƯỚC và SAU, hai bề ngang
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-khu-dao-tao-giaodien.mjs

   ĐO BẰNG CHROME THẬT, `Emulation.setDeviceMetricsOverride` — KHÔNG dùng
   `--window-size`: Chrome ép cửa sổ rộng tối thiểu ~500px, nên đo 375px bằng
   window-size là phép đo NÓI DỐI (bài học scripts/lib/ban-do-chrome.mjs).

   HAI LUẬT NHÀ PHẢI CHỨNG MINH:
     · ưu tiên hiển thị TRỌN 1 MÀN
     · hạn chế KÉO NGANG  → tràn ngang phải bằng 0

   "TRƯỚC" là bản ở commit nền `integration/2026-09-09`, dựng lại bằng
   `hoanNguyenPublic` — không phải trí nhớ, không phải con số chép từ báo cáo cũ.

   DỮ LIỆU GIẢ = 6 BÀI HỌC, đúng bằng số bài đang có trên CSDL sản xuất
   (phapche 3 · hcns 2 · it 1). Đo bằng 2 bài rồi khoe "gọn" là tự lừa mình.
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';
import { execFileSync } from 'node:child_process';

const COMMIT_NEN = execFileSync('git', ['rev-parse', 'integration/2026-09-09'],
  { encoding: 'utf8' }).trim();

/* ⚠️ Khoá là `agent`, KHÔNG phải `doi` — hình dạng lấy từ src/vanphong.js:299.
   Bàn đo dựng sai khoá thì màn hình rỗng và mọi phép đo ra 0 mà vẫn "xanh" ở
   những mục không kiểm chiều cao. Đây chính là cách bản đầu của bàn đo này
   suýt khai sạch: `duLieu.doi` rỗng → không vẽ phòng nào → hộp hồ sơ 0px. */
const DOI = [
  { id: 'trolygd', ten: 'Trợ lý Giám đốc', chuc_danh: 'Trợ lý Giám đốc', phong: 'Ban Giám đốc',
    mo_ta: 'Phản biện kế hoạch.', vi_tri: { x: 20, y: 20 }, phong_ban_id: null,
    chibi: { toc: '#3a2a1c', da: '#e8c9a8', ao: '#4e8122' },
    nang_luc: { lam_duoc: ['Phản biện kế hoạch'], khong_lam: ['Không quyết thay Sếp'], hoi_thu: ['Kế hoạch quý này ổn chưa?'] },
    viec_dang_mo: 0 },
  { id: 'phapche', ten: 'Trưởng phòng Pháp chế', chuc_danh: 'Trưởng phòng Pháp chế', phong: 'Pháp chế',
    mo_ta: 'Soi hợp đồng và giấy tờ.', vi_tri: { x: 50, y: 20 }, phong_ban_id: 3,
    chibi: { toc: '#3a2a1c', da: '#e8c9a8', ao: '#b45606' },
    nang_luc: { lam_duoc: ['Soi hợp đồng'], khong_lam: ['Không ký thay'], hoi_thu: ['Hợp đồng này có rủi ro gì?'] },
    viec_dang_mo: 1 },
  { id: 'hcns', ten: 'Trưởng phòng HCNS', chuc_danh: 'Trưởng phòng HCNS', phong: 'HCNS',
    mo_ta: 'Hồ sơ lao động, chấm công.', vi_tri: { x: 80, y: 20 }, phong_ban_id: 4,
    chibi: { toc: '#3a2a1c', da: '#e8c9a8', ao: '#6f8f5f' },
    nang_luc: { lam_duoc: ['Soạn quyết định'], khong_lam: ['Không xem lương'], hoi_thu: ['Thử việc tối đa bao lâu?'] },
    viec_dang_mo: 0 },
  { id: 'it', ten: 'Trưởng phòng IT', chuc_danh: 'Trưởng phòng IT', phong: 'IT',
    mo_ta: 'Bóc góp ý thành phiếu.', vi_tri: { x: 20, y: 60 }, phong_ban_id: 7,
    chibi: { toc: '#3a2a1c', da: '#e8c9a8', ao: '#a64f07' },
    nang_luc: { lam_duoc: ['Bóc góp ý'], khong_lam: ['Không tự sửa ERP'], hoi_thu: ['Màn kho chậm quá'] },
    viec_dang_mo: 2 }
];

/* 6 bài — ĐÚNG số bài đang có trên bản thật, và cùng độ dài thật (~400 chữ). */
const THAN = 'Trước khi ký phiếu nhập, đối chiếu theo thứ tự: tên hàng trên phiếu với tên trên hợp ' +
  'đồng, hạn dùng với quy định lưu kho, rồi mới tới chữ ký. Chỗ hay sai: người kiểm nhìn tên hàng ' +
  'trước rồi bỏ qua hạn dùng vì tin nhà cung cấp — với hàng thực phẩm nhập khẩu thì đó là chỗ mất ' +
  'tiền nhiều nhất. Gắn vào Alpha Green: hàng về theo lô, mỗi lô một hạn khác nhau, nên phải kiểm ' +
  'từng lô chứ không kiểm theo phiếu. Bước cuối: chụp ảnh mặt sau thùng có in hạn, đính vào phiếu, ' +
  'rồi mới ký. Không có ảnh thì không ký, kể cả khi hàng đã nằm trong kho rồi.';
const KY_NANG = [
  ['kn_1', 'phapche', 'Soát điều khoản đổi trả trong hợp đồng nhà cung cấp', 1],
  ['kn_2', 'phapche', 'Soạn công văn theo Nghị định 30', 1],
  ['kn_3', 'phapche', 'Kiểm giấy tự công bố sản phẩm', 0],
  ['kn_4', 'hcns', 'Soạn quyết định bổ nhiệm', 1],
  ['kn_5', 'hcns', 'Kiểm hồ sơ lao động trước khi lưu', 1],
  ['kn_6', 'it', 'Bóc một câu góp ý thành phiếu đủ bốn phần', 1]
].map(([id, agent_id, tieu_de, dang_dung]) => ({
  id, agent_id, tieu_de, noi_dung: THAN, yeu_cau_goc: 'Sếp dạy', dang_dung,
  tao_luc: '2026-09-06 09:00:00', tang: 'agent', pham_vi_id: null,
  het_han_luc: null, cap_nhat_luc: null,
  nguoi_thuc_hien_loai: 'may', tac_nhan: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  nguoi_day: 'Bùi Thị Ngọc', uy_quyen_boi: 'Bùi Thị Ngọc'
}));

function apiRieng(duong, u, traJson) {
  if (duong === '/api/toi-la-ai') {
    traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc',
      phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: true,
      quyen: ['tongquan', 'danhba', 'vanphong']
    });
    return true;
  }
  if (duong === '/api/van-phong/tong-quan') {
    traJson({
      toi: { nhan_su_id: TOI_ID, ho_ten: 'Bùi Thị Ngọc', viet_tat: 'BN', chuc_vu: 'Giám đốc' },
      may: { id: 'may', ten: 'Mây', chuc_danh: 'Lễ tân', vi_tri: { x: 50, y: 88 },
             chibi: { toc: '#3a2a1c', da: '#e8c9a8', ao: '#4e8122' },
             nang_luc: { lam_duoc: [], khong_lam: [], hoi_thu: ['Doanh số tuần này tụt vì sao?'] } },
      hoi_dap_bat_chua: true, nguoi_co_mat: [], doi_it: [],
      agent: DOI.map(a => ({ ...a, vao_duoc: true })),
      cat_viec: null, viec_cua_toi: [],
      doi_it_cach_goi: '', khu: [], viec_treo: []
    });
    return true;
  }
  if (duong === '/api/van-phong/ky-nang') {
    traJson({ ky_nang: KY_NANG, cat: null, duoc_day: true,
              agent_xem_duoc: DOI.map(a => a.id) });
    return true;
  }
  if (duong === '/api/van-phong/hoi-thoai') { traJson({ may: {}, hoi_dap_bat_chua: true, tin_nhan: [] }); return true; }
  if (duong === '/api/van-phong/luat') {
    traJson({
      thu_tu: ['system_safety', 'company', 'department', 'role', 'agent', 'user_tmp'],
      tang: {
        company:    { ten: 'Toàn công ty', giai_thich: 'Quy tắc áp cho cả chín trợ lý.' },
        department: { ten: 'Phòng ban',    giai_thich: 'Chỉ trợ lý thuộc phòng này đọc.' },
        role:       { ten: 'Vai trò',      giai_thich: 'Theo vị trí công việc của người đang hỏi.' },
        agent:      { ten: 'Riêng trợ lý', giai_thich: 'Nghề Sếp dạy riêng cho một trợ lý.' },
        user_tmp:   { ten: 'Tạm thời',     giai_thich: 'Hướng dẫn có hạn.' }
      },
      an_toan: {
        tang: 'system_safety', ten: 'An toàn hệ thống',
        o_dau: 'src/agents-vp.js — hằng HIEN_PHAP', khong_sua_duoc: true,
        ghi_chu: 'Tầng này KHÔNG SỬA ĐƯỢC Ở ĐÂY.',
        muc: [
          { ten: 'I. NGUYÊN TẮC NỀN', noi_dung: 'FACT FIRST — không khẳng định điều gì là sự thật nếu không có nguồn.' },
          { ten: 'VIII. QUY TẮC CUỐI', noi_dung: 'Dữ liệu không đủ: HỎI hoặc ĐỀ XUẤT CÁCH LẤY DỮ LIỆU.' }
        ]
      },
      tran_ky_tu: 8000, duoc_day: true
    });
    return true;
  }
  if (duong === '/api/van-phong/luat-lich-su') { traJson({ lich_su: [], cat: null, dem_ai: [] }); return true; }
  if (duong === '/api/van-phong/nang-suat') { traJson({ tu_ngay_qua: 60, tong_cau_hoi: 0, dong: [], ghi_chu: '' }); return true; }
  if (duong === '/api/van-phong/co-mat') { traJson({ nguoi_co_mat: [] }); return true; }
  return false;
}

/* Đo một bề ngang. `moTabVP` mở tab Văn phòng ảo rồi (nếu có) mở khu Đào tạo. */
async function do1(cong, rong, cao, moKhu) {
  const c = await moChrome({ url: `http://127.0.0.1:${cong}/app.html`, rong, cao, doiMs: 2600 });
  await c.chay(`!!document.querySelector('.sb-item[data-tab="vanphong"]')?.click()`);
  await c.doi(900);

  if (moKhu) {
    await c.chay(`!!document.querySelector('.vp-tabphu-nut[data-man="daotao"]')?.click()`);
    await c.doi(900);
  }

  /* Mở hộp hồ sơ một trợ lý CÓ bài học (pháp chế, 3 bài) — đây là chỗ khối kỹ
     năng cũ chiếm 79,5% chiều cao. */
  await c.chay(`!!document.querySelector('.vp-phong[data-agent="phapche"]')?.click()`);
  await c.doi(900);

  const tho = await c.chay(`(() => {
      const q = s => document.querySelector(s);
      const cao = e => e ? Math.round(e.getBoundingClientRect().height) : null;
      const than = q('#vp-hoso-than');
      const kn = than ? than.querySelector('.vp-kn-muc') : null;
      const tab1 = q('.vp-tabphu'), tab2 = q('.vp-tab2');
      return JSON.stringify({
        tran_ngang: document.body.scrollWidth - document.documentElement.clientWidth,
        body_rong: document.body.scrollWidth,
        khung_rong: document.documentElement.clientWidth,
        hoso_noi_dung: than ? than.scrollHeight : null,
        hoso_khung: cao(than),
        khoi_kynang: kn ? Math.round(kn.getBoundingClientRect().height) : 0,
        tab_ngoai_cao: cao(tab1),
        tab_ngoai_hang: tab1 ? [...new Set([...tab1.children].map(n => Math.round(n.getBoundingClientRect().top)))].length : null,
        tab_trong_cao: cao(tab2),
        tab_trong_hang: tab2 ? [...new Set([...tab2.children].map(n => Math.round(n.getBoundingClientRect().top)))].length : null,
        tab_trong_tran: tab2 ? tab2.scrollWidth - tab2.clientWidth : null,
        /* Ngưỡng ngón tay: nút thấp nhất trong thanh tab của khu. Trên điện
           thoại phải ≥44px — chuẩn chung của ERP này. */
        nut_thap_nhat: tab2
          ? Math.min(...[...tab2.children].map(n => Math.round(n.getBoundingClientRect().height)))
          : null,
        vuot_khung: [...document.querySelectorAll('#v-vanphong *')]
          .filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length
      });
    })()`);
  const so = JSON.parse(tho);
  so.loi_console = c.loiConsole.length;
  so.ngoai_le = c.ngoaiLe.length;
  await c.dong();
  return so;
}

const BE = [[1440, 900], [375, 812]];
const ra = { truoc: {}, sau: {} };

console.log('\nĐO GIAO DIỆN KHU ĐÀO TẠO — Chrome thật, 6 bài học\n');

console.log('… dựng bản TRƯỚC (commit nền ' + COMMIT_NEN.slice(0, 7) + ')');
{
  const may = await dungMayGia({ commit: COMMIT_NEN, tatHoatAnh: true, apiRieng });
  for (const [r, c] of BE) ra.truoc[`${r}x${c}`] = await do1(may.cong, r, c, false);
  may.dong();
}

console.log('… dựng bản SAU (cây làm việc hiện tại)');
{
  const may = await dungMayGia({ tatHoatAnh: true, apiRieng });
  for (const [r, c] of BE) ra.sau[`${r}x${c}`] = await do1(may.cong, r, c, true);
  may.dong();
}

/* ---- In bảng ------------------------------------------------------------ */
const hang = (ten, khoa, don = 'px') => {
  const g = (b, k) => { const v = ra[b][k]?.[khoa]; return v === null || v === undefined ? '—' : v + don; };
  console.log(
    '  ' + ten.padEnd(38) +
    ('' + g('truoc', '1440x900')).padStart(10) + ('' + g('sau', '1440x900')).padStart(10) +
    ('' + g('truoc', '375x812')).padStart(10) + ('' + g('sau', '375x812')).padStart(10));
};

console.log('\n' + ' '.repeat(40) + '── 1440×900 ──  ── 375×812 ──');
console.log(' '.repeat(40) + '  TRƯỚC     SAU     TRƯỚC     SAU');
hang('Tràn ngang trang', 'tran_ngang');
hang('Phần tử vượt khung', 'vuot_khung', '');
hang('Nội dung trong hộp hồ sơ', 'hoso_noi_dung');
hang('Riêng khối kỹ năng trong hồ sơ', 'khoi_kynang');
hang('Thanh tab ngoài — chiều cao', 'tab_ngoai_cao');
hang('Thanh tab ngoài — số hàng', 'tab_ngoai_hang', '');
hang('Thanh tab trong khu — chiều cao', 'tab_trong_cao');
hang('Thanh tab trong khu — số hàng', 'tab_trong_hang', '');
hang('Thanh tab trong khu — tràn ngang', 'tab_trong_tran');
hang('Nút thấp nhất trong khu', 'nut_thap_nhat');
hang('Lỗi console', 'loi_console', '');
hang('Ngoại lệ chưa bắt', 'ngoai_le', '');

/* ---- Chốt --------------------------------------------------------------- */
let hong = 0;
const bao = (ok, chu) => { console.log(`\n  ${ok ? '✅' : '❌'} ${chu}`); if (!ok) hong++; };

for (const [r, c] of BE) {
  const k = `${r}x${c}`;
  bao(ra.sau[k].tran_ngang === 0, `${k}: tràn ngang trang = ${ra.sau[k].tran_ngang}px (phải 0)`);
  bao(ra.sau[k].vuot_khung === 0, `${k}: ${ra.sau[k].vuot_khung} phần tử vượt khung (phải 0)`);
  bao(ra.sau[k].khoi_kynang === 0,
    `${k}: hộp hồ sơ KHÔNG còn khối kỹ năng (trước: ${ra.truoc[k].khoi_kynang}px)`);
  bao(ra.sau[k].hoso_noi_dung < ra.truoc[k].hoso_noi_dung,
    `${k}: nội dung hộp hồ sơ ${ra.truoc[k].hoso_noi_dung}px → ${ra.sau[k].hoso_noi_dung}px ` +
    `(giảm ${Math.round((1 - ra.sau[k].hoso_noi_dung / ra.truoc[k].hoso_noi_dung) * 100)}%)`);
  bao(ra.sau[k].hoso_noi_dung <= c,
    `${k}: hộp hồ sơ VỪA TRỌN 1 MÀN (${ra.sau[k].hoso_noi_dung}px ≤ ${c}px)`);
  bao(ra.sau[k].tab_ngoai_hang === 1,
    `${k}: thanh tab ngoài giữ đúng 1 hàng (${ra.sau[k].tab_ngoai_cao}px)`);
  bao(ra.sau[k].tab_trong_tran === 0,
    `${k}: thanh tab trong khu không tràn ngang`);
  /* Ngưỡng ngón tay CHỈ áp cho điện thoại — trên desktop người ta bấm chuột,
     ép 44px ở đó là ăn chỗ mà không đổi được gì. */
  if (r <= 640) bao(ra.sau[k].nut_thap_nhat >= 44,
    `${k}: nút trong khu đạt ngưỡng ngón tay (${ra.sau[k].nut_thap_nhat}px ≥ 44px)`);
  bao(ra.sau[k].loi_console === 0 && ra.sau[k].ngoai_le === 0,
    `${k}: console sạch (${ra.sau[k].loi_console} lỗi, ${ra.sau[k].ngoai_le} ngoại lệ)`);
}

/* ĐỐI CHỨNG: bàn đo này có thật sự nhìn thấy tràn ngang không? Dựng lại bản
   SAU với `white-space: nowrap` nhét vào thanh tab — đúng đường mà bản soát
   cảnh báo là sẽ tràn 216px — rồi xem phép đo có kêu. Thước im lặng là thước
   đã chết (BH-16). */
console.log('\n④ ĐỐI CHỨNG — cố ý bẻ, phép đo phải kêu\n');
{
  const may = await dungMayGia({
    tatHoatAnh: true, apiRieng,
    suaTep: (s, f) => f === 'app.html'
      ? s.replace('</head>',
          '<style>.vp-tab2{flex-wrap:nowrap;overflow-x:visible}' +
          '.vp-tab2-nut{white-space:nowrap;min-width:132px}</style></head>')
      : s
  });
  const xau = await do1(may.cong, 375, 812, true);
  may.dong();
  console.log(`     bản bẻ ở 375×812: tràn ngang trang = ${xau.tran_ngang}px, ` +
              `thanh tab ${xau.tab_trong_cao}px / ${xau.tab_trong_hang} hàng`);
  bao(xau.tran_ngang > 0 || xau.tab_trong_tran > 0,
    'phép đo BẮT ĐƯỢC bản cố ý bẻ — nó thật sự nhìn thấy tràn ngang');
}

console.log('\n───────────────────────────────────────────────────────────');
if (hong) { console.log(`✗ ${hong} CHỖ HỎNG.`); process.exit(1); }
console.log('✓ ĐẠT — trọn 1 màn, không kéo ngang, ở cả hai bề ngang.');
