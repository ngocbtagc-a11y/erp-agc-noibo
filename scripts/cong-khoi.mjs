/* ==========================================================================
   CỔNG KHÓI — BƯỚC BẮT BUỘC TRƯỚC MỌI LẦN ĐẨY
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY. Ngày 29/08/2026 Sếp Ngọc báo "ấn Chat ngay không được".
   Chat đã CHẾT HOÀN TOÀN trên bản thật suốt từ commit `7bf0e58`, qua HAI vòng
   soi (REV-0028, REV-0031) mà không vòng nào thấy. Truy ra năm nguyên nhân,
   tất cả đều là lỗi CỦA PHÉP ĐO, không phải của mã:
     ① Không vòng nào NẠP `app.js` trong trình duyệt — chỉ đo hàm thuần, mù
        tuyệt đối với lỗi lúc nạp (TDZ).
     ② Không ai BẤM THỬ. Có bàn đo kích thước nút, có bàn đo trạng thái nút,
        không bàn đo nào hỏi "bấm vào có ăn không".
     ③ `console.error` KHÔNG được tính là TRƯỢT. Dòng
        `Cannot access 'TBDay' before initialization` in ra mỗi lần mở ERP
        suốt nhiều tuần, thành tiếng động trong phòng trống.
     ④ `?.` xoá nốt bằng chứng: `window.moChatVoi?.()` biến "hàm không tồn
        tại" thành "không làm gì cả".
     ⑤ Phạm vi soi bám VIỆC VỪA LÀM, không bám thứ mã đó nằm cạnh.

   CỔNG NÀY ĐÓNG ③ VÀ ②:
     · Nạp `app.html` thật trong Chrome headless.
     · TRƯỢT nếu có BẤT KỲ `console.error` hay ngoại lệ chưa bắt nào.
     · BẤM THẬT vào danh sách "nút cửa ngõ" — mỗi tab một nút chính. Bấm mà
       không có phản ứng nhìn thấy được là TRƯỢT.
   Lint `no-use-before-define` KHÔNG thay được cổng này: nó không bắt ca
   `TBDay`, vì chỗ dùng nằm trong một hàm (Hồ Ly đã thử).

   CHẠY:
     npm run cong-khoi                → đo cây làm việc hiện tại
     node scripts/cong-khoi.mjs --commit main   → đo một commit khác
     node scripts/cong-khoi.mjs --rong 375      → đo ở bề ngang điện thoại
     npm run cong-khoi-tu-kiem        → MẪU HỎNG GIẢ: cố ý chèn một lỗi
       console; cổng khói PHẢI đỏ. Không chứng minh được thì cổng khói chỉ là
       đồ trang trí — chạy cái này trước khi tin nó.
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { dungMayGia, moChrome, TOI, TOI_ID } from './lib/ban-do-chrome.mjs';

/* ---- LƯỢT THỨ HAI: VAI ĐỦ QUYỀN (REV-0057 vòng 3 · VỪA-2) --------------
   Người dùng giả dùng chung chỉ có BẢY quyền, nên tám mô-đun này chưa bao
   giờ chạy dưới cổng khói — cái cổng BẮT BUỘC trước mọi lần đẩy của cả đội:
     khoiDongCongViec · khoiDongDoiSoatSan · khoiDongDuLieuNen ·
     khoiDongTaiSan · khoiDongXepCa · khoiDongKhoTaiLieu ·
     khoiDongDonHoan · khoiDongLichSuHoan
   Hồ Ly chứng minh cái giá: gài một lỗi TDZ ở `khoiDongCSKH` thì cổng khói
   vẫn XANH. Đó cũng là lý do lỗi Đối soát sàn của chị Hằng sống được lâu.

   KHÔNG sửa `TOI` dùng chung — sáu bàn đo khác đang dựa vào đúng bảy quyền
   đó, đổi nó là lặng lẽ đổi bài của người khác. Thay vào đó chạy THÊM một
   lượt với vai đủ quyền, chỉ hỏi một câu: nạp trang có nổ không. */
const QUYEN_DU = ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu',
                  'khovan', 'kinhdoanh', 'ketoan', 'taisan', 'xepca', 'donhoan',
                  'khotailieu', 'quantri', 'dulieunen', 'congviec', 'muctieu'];

/* Ổ trả lời cho những đường mà tám mô-đun kia đọc. Ổ chung của thư viện trả
   `{ok:true, danh_sach:[]}` cho mọi thứ, mà vài màn đòi khoá riêng — thiếu
   thì cổng đỏ vì BÀN ĐO, không phải vì sản phẩm. */
function apiVaiDuQuyen(duong, u, traJson) {
  if (duong === '/api/toi-la-ai') return traJson({
    ...TOI, id: TOI_ID, nhan_su_id: TOI_ID, quyen: QUYEN_DU,
    la_admin: 1, them_nhan_su: 1, thao_tac_van_hanh: 1, phong_ban_quan_ly: [],
    shopee: { xem: 1 }
  }) || true;
  if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
  if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
  if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
  if (duong === '/api/muc-tieu/danh-sach')
    return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
  if (duong === '/api/dulieunen/tinh-trang') return traJson({ muc: [], viec_tiep_theo: [] }) || true;
  if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
  if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach_hang: [] }) || true;
  if (duong === '/api/kinh-doanh/don-hang-huy')
    return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
  if (duong === '/api/ke-toan/can-tra-soat') return traJson({ can_tra_soat: [] }) || true;
  if (duong === '/api/ke-toan/hang-hong') return traJson({ hang_hong: [] }) || true;
  if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 1 } }) || true;
  if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
  if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
  if (duong === '/api/quan-tri/danh-sach') return traJson({ nhan_su: [], vai_tro: [] }) || true;
  if (duong === '/api/nhan-su/viec-can-lam')
    return traJson({ qua_han: [], sap_het: [], sinh_nhat_thang_sau: [] }) || true;
  return false;
}

const dso = process.argv;
const lay = (co, mac) => { const i = dso.indexOf(co); return i > 0 ? dso[i + 1] : mac; };
const COMMIT = lay('--commit', null);
const RONG = Number(lay('--rong', 1440));
const TU_KIEM = dso.includes('--tu-kiem');   // chèn mẫu hỏng giả để tự chứng minh
const TU_KIEM_TDZ = dso.includes('--tu-kiem-tdz');

/* MẪU HỎNG GIẢ — một dòng `console.error` cố ý, chèn vào bản TẠM của app.js
   (không đụng tệp thật trong repo). Nếu cổng khói vẫn XANH với dòng này thì
   cổng khói hỏng, không phải mã hỏng. */
const MAU_HONG = `\nconsole.error('MẪU HỎNG GIẢ — cổng khói phải bắt được dòng này');\n`;
/* MẪU HỎNG GIẢ THỨ HAI — lỗi TDZ THẬT (REV-0057 vòng 3 · VỪA-2).
   Đổi 'khoiDongCSKH' sang 'const' và bỏ lambda chuyển tiếp: hàm bị GỌI ở
   phía trên chỗ nó được khai, nên trang nổ ngay lúc mở. Hồ Ly gài đúng lỗi
   này và cổng khói CŨ vẫn XANH — vì vai 7 quyền không nạp tới mô-đun đó.
   Nay lượt ĐỦ QUYỀN phải bắt được. Đây là cách cổng khói tự chứng minh nó có
   mắt ở phần vừa mở rộng, thay vì bắt người ta tin lời.
   Chạy:  npm run cong-khoi-tu-kiem-tdz   → PHẢI ĐỎ.
   Mẫu này TRƯỢT thì ném lỗi ngay, không lặng lẽ chạy trên bản lành. */
const MAU_TDZ = [
  ["    const lamMoiCSKH = ngheDuLieu('hoan', () => khoiDongCSKH(),", ""],
  ["      { ten: 'Bảng Khách hoàn nhiều', goc: oTab('kinhdoanh') });", ""],
  ["    try { await lamMoiCSKH(); }", "    try { await khoiDongCSKH(); }"],
  ["async function khoiDongCSKH() {", "const khoiDongCSKH = async function () {"]
];
function gaiTDZ(ma) {
  for (const [cu, moiDoan] of MAU_TDZ) {
    if (!ma.includes(cu)) throw new Error(`Mẫu TDZ trượt, sửa bàn đo: ${cu.trim().slice(0, 60)}`);
    ma = ma.replace(cu, moiDoan);
  }
  return ma;
}

const suaTep = TU_KIEM
  ? (s, ten) => (ten === 'assets/js/app.js' ? s + MAU_HONG : s)
  : (TU_KIEM_TDZ
      ? (s, ten) => (ten === 'assets/js/app.js' ? gaiTDZ(s) : s)
      : null);

/* ---- DANH SÁCH NÚT CỬA NGÕ ---------------------------------------------
   Mỗi tab một nút chính — thứ người dùng bấm ĐẦU TIÊN khi vào tab đó. Bấm
   thật, rồi ĐÒI một phản ứng nhìn thấy được. Không đòi phản ứng thì chỉ
   chứng minh được "nút có tồn tại", đúng cái bẫy đã bỏ lọt lần trước.
   Muốn thêm tab mới thì thêm một dòng ở đây — đó là toàn bộ chi phí. */
const CUA_NGO = [
  { ten: 'Chat ngay (Danh bạ)', tab: 'danhba',
    bam: `document.querySelector('[data-chatngay]')`,
    doi: `!document.querySelector('#cnbPopup').hidden` },
  { ten: 'Nút chat nổi', tab: 'danhba',
    truoc: `document.querySelector('#cnbPopup').hidden = true; document.body.classList.remove('cnb-mo');`,
    bam: `document.querySelector('#cnbNut')`,
    doi: `document.querySelectorAll('.cnb-ds-muc').length > 0` },
  { ten: 'Một dòng hội thoại', tab: 'danhba',
    bam: `document.querySelector('.cnb-ds-muc')`,
    doi: `!document.querySelector('#chat-form').hidden` },
  { ten: 'Nút "←" về danh sách', tab: 'danhba',
    bam: `document.querySelector('#cnbLui')`,
    doi: `document.querySelectorAll('.cnb-ds-muc').length > 0` },
  { ten: 'Đóng cửa sổ chat', tab: 'danhba',
    bam: `document.querySelector('#cnbDong')`,
    doi: `document.querySelector('#cnbPopup').hidden === true` },
  { ten: 'Mở tab Góp ý ERP', tab: null,
    bam: `document.querySelector('[data-tab="gopy"]')`,
    doi: `!document.querySelector('#v-gopy').hidden` },
  { ten: 'Mở tab Nhân sự', tab: null,
    bam: `document.querySelector('[data-tab="nhansu"]')`,
    doi: `!document.querySelector('#v-nhansu').hidden` },
  { ten: 'Mở tab Kho vận', tab: null,
    bam: `document.querySelector('[data-tab="khovan"]')`,
    doi: `!document.querySelector('#v-khovan').hidden` },
  { ten: 'Mở tab Lịch sử làm việc', tab: null,
    bam: `document.querySelector('[data-tab="lichsuviec"]')`,
    doi: `!document.querySelector('#v-lichsuviec').hidden` },
  { ten: 'Mở tab Trạm Mục Tiêu', tab: null,
    bam: `document.querySelector('[data-tab="tongquan"]')`,
    doi: `!document.querySelector('#v-tongquan').hidden` },
  /* MÀN GỘP (29/08/2026) — ba tab Việc dọn về tab Lịch sử làm việc thành bộ
     lọc phạm vi. Đây là nút người ta bấm nhiều nhất ở tab đó từ nay: bấm
     thật, đòi tab đổi trạng thái thật. */
  { ten: 'Bộ lọc "Toàn công ty" (Lịch sử làm việc)', tab: 'lichsuviec',
    bam: `document.querySelector('#lsv-loc .seg-nut[data-lsv="congty"]')`,
    doi: `document.querySelector('#lsv-loc .seg-nut[data-lsv="congty"]').classList.contains('active')` },
  { ten: 'Bộ lọc "Việc của tôi" (Lịch sử làm việc)', tab: 'lichsuviec',
    bam: `document.querySelector('#lsv-loc .seg-nut[data-lsv="toi"]')`,
    doi: `document.querySelector('#lsv-loc .seg-nut[data-lsv="toi"]').classList.contains('active')` }
];

const may = await dungMayGia({ commit: COMMIT, suaTep });
const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 3000 });

const kq = { commit: COMMIT || 'cây làm việc', rong: RONG, tu_kiem: TU_KIEM, cua_ngo: [] };

/* ---- ① NẠP TRANG: có dựng nổi giao diện không? ------------------------- */
kq.nap = await cr.chay(`({
  co_sidebar: !!document.querySelector('[data-tab]'),
  so_tab: document.querySelectorAll('[data-tab]').length,
  co_moChatVoi: typeof window.moChatVoi
})`);

/* ---- ② BẤM THẬT từng nút cửa ngõ --------------------------------------- */
for (const c of CUA_NGO) {
  const dong = { ten: c.ten, co_nut: false, dat: false, loi: null };
  try {
    if (c.tab) { await cr.chay(`document.querySelector('[data-tab="${c.tab}"]')?.click(); 1`); await cr.doi(500); }
    if (c.truoc) await cr.chay(c.truoc + ' 1');
    dong.co_nut = await cr.chay(`!!(${c.bam})`);
    if (dong.co_nut) {
      await cr.chay(`(${c.bam}).click(); 1`);
      await cr.doi(700);
      dong.dat = !!(await cr.chay(`!!(${c.doi})`));
    }
  } catch (e) { dong.loi = String(e.message || e).slice(0, 160); }
  kq.cua_ngo.push(dong);
}

kq.loi_console = cr.loiConsole;
kq.ngoai_le = cr.ngoaiLe;
kq.canh_bao_so = cr.canhBao.length;

cr.dong(); may.dong();

/* ---- ③ LƯỢT ĐỦ QUYỀN: nạp trang với vai thấy HẾT mô-đun -------------- */
const may2 = await dungMayGia({ commit: COMMIT, suaTep, apiRieng: apiVaiDuQuyen });
const cr2 = await moChrome({ url: `http://127.0.0.1:${may2.cong}/app.html`, rong: RONG, doiMs: 3500 });
kq.du_quyen = {
  so_tab: await cr2.chay(`document.querySelectorAll('[data-tab]').length`),
  loi_console: cr2.loiConsole.slice(),
  ngoai_le: cr2.ngoaiLe.slice()
};
cr2.dong(); may2.dong();
/* Gộp vào cùng một rổ: một ngoại lệ ở lượt nào cũng là cổng ĐỎ. */
kq.loi_console = kq.loi_console.concat(kq.du_quyen.loi_console);
kq.ngoai_le = kq.ngoai_le.concat(kq.du_quyen.ngoai_le);

/* ---- KẾT LUẬN ----------------------------------------------------------- */
const nutHong = kq.cua_ngo.filter(c => !c.co_nut || !c.dat || c.loi);
const doVi = [];
if (kq.loi_console.length) doVi.push(`${kq.loi_console.length} dòng console.error`);
if (kq.ngoai_le.length)    doVi.push(`${kq.ngoai_le.length} ngoại lệ chưa bắt`);
if (nutHong.length)        doVi.push(`${nutHong.length}/${CUA_NGO.length} nút cửa ngõ hỏng`);
if (!kq.nap.co_sidebar)    doVi.push('trang không dựng nổi giao diện');

const XANH = doVi.length === 0;
kq.ket_luan = XANH ? 'XANH' : 'ĐỎ';
kq.vi_sao_do = doVi;

console.log(JSON.stringify(kq, null, 2));
console.error('');
console.error(`CỔNG KHÓI [${kq.commit} @${RONG}px]: ${XANH ? '✅ XANH' : '❌ ĐỎ — ' + doVi.join(' · ')}`);
console.error(`  hai lượt vai: 7 quyền (${kq.nap.so_tab} tab) + đủ 17 quyền (${kq.du_quyen.so_tab} tab)`);
for (const l of kq.loi_console.slice(0, 12)) console.error('  console.error: ' + l);
for (const l of kq.ngoai_le.slice(0, 12))    console.error('  ngoại lệ:      ' + String(l).split('\n')[0]);
for (const c of nutHong) console.error(`  nút hỏng:      ${c.ten}` +
  (!c.co_nut ? ' (không tìm thấy nút)' : c.loi ? ' (' + c.loi + ')' : ' (bấm xong không có phản ứng)'));

/* TỰ KIỂM: chạy với `--tu-kiem` thì cổng khói PHẢI đỏ. Nếu nó xanh, chính
   cổng khói mới là thứ hỏng — và lúc đó phải thoát 1 để không ai kịp tin nó. */
if (TU_KIEM) {
  const dat = !XANH && kq.loi_console.some(l => String(l).includes('MẪU HỎNG GIẢ'));
  console.error(dat
    ? '  ✅ TỰ KIỂM ĐẠT — mẫu hỏng giả làm cổng khói đỏ đúng như phải thế.'
    : '  ❌ TỰ KIỂM TRƯỢT — chèn lỗi thật mà cổng khói vẫn xanh: cổng khói là đồ trang trí.');
  process.exit(dat ? 0 : 1);
}

/* TỰ KIỂM THỨ HAI — lỗi TDZ thật ở một trong tám mô-đun chỉ vai ĐỦ QUYỀN mới
   nạp tới. CÙNG QUY ƯỚC với `--tu-kiem`: bắt được thì thoát 0. Hai lệnh cùng
   họ mà ngược quy ước mã thoát là bẫy cho người sau (REV-0057 vòng 4). */
if (TU_KIEM_TDZ) {
  const dat = !XANH && [...kq.loi_console, ...kq.ngoai_le]
    .some(l => String(l).includes('khoiDongCSKH') && String(l).includes('before initialization'));
  console.error(dat
    ? '  ✅ TỰ KIỂM TDZ ĐẠT — lỗi ở mô-đun chỉ vai đủ quyền mới nạp tới đã làm cổng khói đỏ.'
    : '  ❌ TỰ KIỂM TDZ TRƯỢT — gài lỗi TDZ thật mà cổng khói không thấy: lượt vai đủ quyền đang hỏng.');
  process.exit(dat ? 0 : 1);
}

process.exit(XANH ? 0 : 1);
