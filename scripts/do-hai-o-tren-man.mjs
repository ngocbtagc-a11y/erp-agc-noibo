/* ==========================================================================
   ĐO TRÊN TRÌNH DUYỆT THẬT: FORM "TẠO TÀI KHOẢN" CÓ ĐÚNG HAI Ô KHÔNG
   ---------------------------------------------------------------------------
   `do-tach-vai-tro.mjs` chứng minh LUẬT đúng ở máy chủ. Nó KHÔNG chứng minh
   được cái Sếp nhìn thấy — mà yêu cầu 04/09/2026 bắt đầu bằng một ẢNH CHỤP
   MÀN HÌNH, không phải bằng một dòng log. Bàn thử chứng minh logic đúng; chỉ
   trình duyệt mới chứng minh tính năng còn sống (REV-0038).

   BÀN ĐO NÀY NẠP `app.html` THẬT trong Chrome, BẤM THẬT, và đo:
     ① Hộp "Tạo tài khoản" có ĐÚNG HAI combobox (trước đây một).
     ② Bấm mở được từng ô, và mỗi ô CHỈ liệt kê đúng nhóm của nó —
        ô 1 không có "Kế toán trưởng", ô 2 không có "Admin".
     ③ Ở 375px hộp VỪA MỘT MÀN — không phải cuộn để thấy nút Lưu.
        (Luật nhà: ưu tiên vừa một màn, xem docs/HANG-DOI.md.)
     ④ Vùng chạm của cả hai ô ≥ 44px.
     ⑤ Không một dòng console.error nào.

   CA ĐỐI CHỨNG (BH-16) chạy trên bản `public/` ĐÃ SỬA CỐ Ý:
     DC-1  gỡ ô 2 khỏi app.html         → ① phải đỏ
     DC-2  nhồi cả 10 mã vào ô 2        → ② phải đỏ
     DC-3  ép hai ô cao 200px           → ③ phải đỏ (bắt được cảnh chật màn)

   Chạy:  node scripts/do-hai-o-tren-man.mjs
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';
import { ok, tongKet } from './ban-thu-d1.mjs';

const RONG = 375, CAO = 812;

/* Máy giả trả ĐÚNG hình dạng dữ liệu máy chủ thật trả về sau bản này. */
const VAI_TRO_HE_THONG = [
  { ma: 'admin', ten: 'Admin' }, { ma: 'admin_backup', ten: 'Admin backup' },
  { ma: 'nguoi_dung', ten: 'Người dùng' }
];
const VI_TRI_CONG_VIEC = [
  { ma: 'ke_toan_truong', ten: 'Kế toán trưởng' }, { ma: 'quan_ly_kho', ten: 'Quản lý kho' },
  { ma: 'nhan_vien_kho', ten: 'Nhân viên kho' }, { ma: 'hcns', ten: 'Hành chính nhân sự' },
  { ma: 'van_hanh_san', ten: 'Vận hành sàn' }, { ma: 'cskh', ten: 'Nhân viên CSKH' },
  { ma: 'nv_test', ten: 'Nhân viên (test luồng)' }
];
const NHAN_SU = [
  { id: 'NS-DUY', ma_nv: 'NV01', ho_ten: 'Phạm Khương Duy', viet_tat: 'KD',
    chuc_vu: 'TP. Kho Vận - Sản Xuất', bo_phan: 'Kho vận', sdt: '0900000001',
    trang_thai: 'chinh_thuc', dang_lam: 1, co_anh: 0, tai_khoan_id: null }
];

function apiRieng(duong, u, traJson) {
  if (duong === '/api/toi-la-ai') {
    traJson({
      id: 'NS-NGOC', ten: 'Bùi Thị Ngọc', viet_tat: 'BN', chuc_vu: 'Giám đốc',
      vai_tro: 'admin', vi_tri_cong_viec: null, phai_doi_mk: false, co_anh: false,
      phong_ban_quan_ly: [], quyen: ['tongquan', 'danhba', 'chat', 'nhansu', 'quantri'],
      xem_luong: true, la_admin: true, them_nhan_su: true, quan_ly_chinh_sach_ca: true,
      duoc_tao_tai_khoan: true, duoc_dat_vi_tri: true, duyet_gopy: true,
      kho: { thao_tac: true, quan_ly: true, gia_von: true },
      shopee: { xem: true, quan_ly: true }, thao_tac_van_hanh: true,
      mat_khau_dai_toi_thieu: 8
    });
    return true;
  }
  /* Ổ trả lời cho các tab tự khởi động lúc nạp trang. Khuôn dùng chung trong
     ban-do-chrome.mjs thiếu khoá `don_hoan`, nên `khoiDongDonHoan` ném
     `undefined.filter` và phép ⑤ (không một dòng console.error) đỏ vì TIẾNG
     ĐỘNG CỦA BÀN ĐO chứ không vì mã. Trả mảng RỖNG chứ không bỏ khoá — thiếu
     khoá là lỗi của bàn đo, không phải của ứng dụng. */
  if (/^\/api\/(don-hoan|hoan|shopee|tiktok|lich-su-hoan)/.test(duong)) {
    traJson({ ok: true, don_hoan: [], lich_su: [], danh_sach: [], ket_noi: null,
              quyen: { quan_ly: false, xem: false } });
    return true;
  }
  if (duong === '/api/quan-tri/danh-sach') {
    traJson({
      nhan_su: NHAN_SU,
      vai_tro: [...VAI_TRO_HE_THONG.map(v => ({ ...v, nhom: 'he_thong' })),
                ...VI_TRI_CONG_VIEC.map(v => ({ ...v, nhom: 'vi_tri' }))],
      vai_tro_he_thong: VAI_TRO_HE_THONG,
      vi_tri_cong_viec: VI_TRI_CONG_VIEC,
      co_cot_vi_tri: true
    });
    return true;
  }
  return false;
}

/* ---- Một vòng đo trên một bản public/ -----------------------------------
   ĐO CÁI GÌ Ở PHÉP ③: cái phải "vừa một màn" là HỘP THOẠI, không phải cả
   trang. Bản đầu của bàn đo này so `scrollHeight` của cả tài liệu — mà bảng
   Quản trị phía sau thì LÚC NÀO cũng dài hơn màn, nên phép đo đỏ vĩnh viễn dù
   hộp có cao 100px hay 1000px. Một phép đo lúc nào cũng đỏ thì vô dụng ngang
   một phép đo lúc nào cũng xanh. Nay hỏi hai thứ: chiều cao hộp so với chỗ
   trống thật (màn trừ đệm 20px × 2 của `.modal-nen`), và hộp có phải tự cuộn
   bên trong nó không — cuộn trong lòng hộp cũng là "phải kéo mới thấy nút". */
async function motVong(suaTep) {
  const may = await dungMayGia({ apiRieng, suaTep, tatHoatAnh: true });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, cao: CAO, doiMs: 3000 });
  try {
    // Vào tab Quản trị rồi bấm "Tạo tài khoản" — BẤM THẬT, không gọi hàm.
    await cr.chay(`document.querySelector('[data-tab="quantri"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 900))`);
    const coNut = await cr.chay(`!!document.querySelector('[data-tao]')`);
    await cr.chay(`document.querySelector('[data-tao]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 500))`);

    const kq = await cr.chay(`(() => {
      const modal = document.querySelector('#taoTkModalNen');
      const mo = modal && !modal.hidden;
      const o1 = document.querySelector('#taoTkVaiTroHienThi');
      const o2 = document.querySelector('#taoTkViTriHienThi');
      const nhan = [...document.querySelectorAll('#taoTkForm label')].map(l => l.textContent.trim());
      const hop = (e) => e ? e.getBoundingClientRect() : null;
      const m = modal ? modal.querySelector('.modal') : null;
      return {
        mo, coO1: !!o1, coO2: !!o2, nhan,
        caoO1: o1 ? hop(o1).height : 0,
        caoO2: o2 ? hop(o2).height : 0,
        caoHop: m ? hop(m).height : 0,
        caoMan: window.innerHeight,
        /* Đo đúng thứ cần đo — xem chú thích ĐO CÁI GÌ phía trên hàm này. */
        hopPhaiCuon: m ? m.scrollHeight > m.clientHeight + 1 : false
      };
    })()`);

    /* Mở từng ô, đọc danh sách gợi ý VÀ ĐO CHIỀU CAO TỪNG DÒNG.
       REV-0058 ④: bản trước chỉ đo hai cái NÚT mở danh sách, mà nút chỉ để
       BẬT panel — thứ ngón tay chạm để CHỌN một vai trò là `.ql-goiy-item`,
       đo được 36,9px. Đo thứ DỄ ĐO thay vì thứ người dùng CHẠM chính là loại
       phép đo lúc nào cũng xanh mà lỗi vẫn còn (BH-47). */
    const doc = async (nutId, goiYId) => {
      await cr.chay(`document.querySelector('#${nutId}').click(), 1`);
      await cr.chay(`new Promise(r => setTimeout(r, 300))`);
      const r = await cr.chay(`(() => {
        const ds = [...document.querySelectorAll('#${goiYId} .ql-goiy-item')];
        return {
          nhan: ds.map(e => e.textContent.trim()),
          cao: ds.map(e => Math.round(e.getBoundingClientRect().height * 10) / 10)
        };
      })()`);
      await cr.chay(`document.querySelector('#${nutId}').click(), 1`);
      await cr.chay(`new Promise(r => setTimeout(r, 200))`);
      return r || { nhan: [], cao: [] };
    };
    const r1 = kq.coO1 ? await doc('taoTkVaiTroHienThi', 'taoTkVaiTroGoiY') : { nhan: [], cao: [] };
    const r2 = kq.coO2 ? await doc('taoTkViTriHienThi', 'taoTkViTriGoiY') : { nhan: [], cao: [] };
    kq.dsO1 = r1.nhan; kq.dsO2 = r2.nhan;
    kq.caoDong = [...r1.cao, ...r2.cao];
    kq.dongThapNhat = kq.caoDong.length ? Math.min(...kq.caoDong) : 0;
    kq.coNut = coNut;
    kq.loiConsole = cr.loiConsole.slice();
    kq.ngoaiLe = cr.ngoaiLe.slice();
    return kq;
  } finally { await cr.dong(); may.dong(); }
}

/* ---- Chấm một kết quả: trả về danh sách phép nào ĐỎ ---------------------- */
function chamDo(k) {
  const do_ = [];
  if (!k.mo || !k.coO1 || !k.coO2) do_.push('①');
  if (k.dsO1.some(x => /Kế toán trưởng|Quản lý kho/.test(x)) ||
      k.dsO2.some(x => /^Admin/.test(x))) do_.push('②');
  // Hộp thoại nằm trong .modal-nen có đệm 20px mỗi bên — trừ ra rồi mới so.
  if (k.hopPhaiCuon || k.caoHop > k.caoMan - 40) do_.push('③');
  // ④ đo CẢ nút mở danh sách LẪN từng dòng chọn — dòng chọn mới là thứ chạm.
  if (k.caoO1 < 44 || k.caoO2 < 44) do_.push('④');
  if (!k.caoDong.length || k.dongThapNhat < 44) do_.push('④b');
  if (k.loiConsole.length || k.ngoaiLe.length) do_.push('⑤');
  return do_;
}

/* ==========================================================================
   CHẠY
   ========================================================================== */
console.log(`\n=== BẢN THẬT @${RONG}px ==========================================\n`);
const k = await motVong(null);

console.log(`  nhãn trên form : ${JSON.stringify(k.nhan)}`);
console.log(`  ô 1 liệt kê    : ${JSON.stringify(k.dsO1)}`);
console.log(`  ô 2 liệt kê    : ${JSON.stringify(k.dsO2)}`);
console.log(`  hộp cao ${Math.round(k.caoHop)}px / màn ${k.caoMan}px · hộp phải cuộn: ${k.hopPhaiCuon}`);
console.log(`  vùng chạm      : ô1 ${Math.round(k.caoO1)}px · ô2 ${Math.round(k.caoO2)}px\n`);

ok('Bấm được nút "Tạo tài khoản" trên tab Quản trị', k.coNut && k.mo);
ok('① Form có ĐÚNG HAI ô (trước đây một)', k.coO1 && k.coO2);
ok('① Hai nhãn nói rõ đây là hai thứ khác nhau',
   k.nhan.some(x => /Vai trò hệ thống/.test(x)) && k.nhan.some(x => /Vị trí công việc/.test(x)),
   k.nhan.join(' | '));
ok('② Ô 1 CHỈ có vai trò hệ thống (không lẫn vị trí)',
   k.dsO1.length === 3 && !k.dsO1.some(x => /Kế toán trưởng|Quản lý kho|CSKH/.test(x)),
   k.dsO1.join(', '));
ok('② Ô 2 CHỈ có vị trí công việc (không lẫn Admin)',
   k.dsO2.length >= 7 && !k.dsO2.some(x => /^Admin/.test(x)),
   `${k.dsO2.length} mục`);
ok('② Ô 2 bỏ trống được ("— Chưa gán —")', k.dsO2.some(x => /Chưa gán/.test(x)));
ok(`③ Ở ${RONG}px hộp thoại VỪA MỘT MÀN, không phải cuộn`,
   !k.hopPhaiCuon && k.caoHop <= k.caoMan - 40,
   `hộp ${Math.round(k.caoHop)}px / chỗ trống ${k.caoMan - 40}px`);
ok('④ Nút MỞ danh sách của cả hai ô ≥ 44px',
   k.caoO1 >= 44 && k.caoO2 >= 44, `${Math.round(k.caoO1)}px · ${Math.round(k.caoO2)}px`);
/* Phép đo quan trọng hơn phép trên: nút chỉ MỞ panel, còn thứ ngón tay chạm
   để CHỌN là từng dòng trong panel (REV-0058 ④). */
ok(`④ TỪNG DÒNG CHỌN vai trò/vị trí ≥ 44px (${k.caoDong.length} dòng)`,
   k.caoDong.length > 0 && k.dongThapNhat >= 44,
   k.caoDong.length ? `thấp nhất ${k.dongThapNhat}px` : 'KHÔNG đo được dòng nào');
ok('⑤ Không một dòng console.error nào',
   k.loiConsole.length === 0 && k.ngoaiLe.length === 0,
   [...k.loiConsole, ...k.ngoaiLe].join(' | ') || 'sạch');

/* ---- Ca đối chứng ------------------------------------------------------- */
console.log('\n=== CA ĐỐI CHỨNG (sửa hỏng public/ cố ý) =======================\n');

const DC = [
  ['1', 'gỡ hẳn ô 2 khỏi app.html', '①',
    (s, ten) => ten !== 'app.html' ? s
      : s.replace(/<div class="field">\s*<label>Vị trí công việc<\/label>[\s\S]*?<input type="hidden" id="taoTkViTri">\s*<\/div>/, '')],
  ['2', 'nhồi cả 10 mã vào ô 2 (gộp lại như cũ)', '②',
    (s, ten) => ten !== 'assets/js/app.js' ? s
      : s.replace('veComboVaiTro(tienTo, () => DS_VI_TRI_CONG_VIEC, hienTai',
                  'veComboVaiTro(tienTo, () => DS_VAI_TRO_QT, hienTai')],
  ['3', 'ép hai ô cao 200px (làm hộp tràn màn)', '③',
    (s, ten) => ten !== 'app.html' ? s
      : s.replace('</head>', '<style>#taoTkForm .combo1-hienthi{height:200px}</style></head>')],
  /* DC-4 dựng lại ĐÚNG cảnh REV-0058 ④ đã bắt được: nút mở danh sách vẫn
     44px (nên phép ④ cũ vẫn XANH), chỉ riêng dòng chọn tụt về 36,9px. Ca này
     là bằng chứng bàn đo đã hết mù — bản trước lọt đúng ở đây. */
  ['4', 'dòng chọn tụt về 36,9px (nút vẫn 44px — bản trước LỌT ca này)', '④b',
    (s, ten) => ten !== 'app.html' ? s
      : s.replace('</head>', '<style>.ql-goiy-item{min-height:0;display:block;padding:8px 10px}</style></head>')]
];

for (const [ma, ten, mongDoi, sua] of DC) {
  let doRa = [];
  try { doRa = chamDo(await motVong(sua)); }
  catch (e) { doRa = ['nổ: ' + String(e.message).slice(0, 60)]; }
  ok(`DC-${ma} ${ten}`, doRa.includes(mongDoi) || doRa.some(x => x.startsWith('nổ')),
     doRa.length ? 'bàn đo BẮT ĐƯỢC — đỏ ở ' + doRa.join(',') : 'LỌT — bàn đo mù chỗ này');
}

process.exit(tongKet() ? 0 : 1);
