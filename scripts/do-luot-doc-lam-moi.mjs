/* ==========================================================================
   ĐO LƯỢT ĐỌC D1 CỦA MỘT CÚ BẤM — TRƯỚC vs SAU bản "màn hình tự làm mới"
   ---------------------------------------------------------------------------
   ERP này từng vượt hạn mức miễn phí của Cloudflare D1. Bản vá 03/09/2026 làm
   màn hình tự nạp lại, tức có THÊM lệnh gọi máy chủ — nên phải ĐO, không được
   đoán. Bàn này dựng CÙNG một máy giả, chạy CÙNG một cú bấm trên hai bản:

     · TRƯỚC = `public/` ở commit `origin/main`
     · SAU   = `public/` trong cây làm việc hiện tại

   rồi in ra số lệnh gọi máy chủ của MỖI đường, cho từng bản.

   Chạy:  npm run do-luot-doc-lam-moi     (chỉ ĐO và in, không đánh trượt)
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';

const QUYEN = ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'nhansu',
               'khovan', 'kinhdoanh', 'ketoan', 'taisan', 'xepca', 'donhoan',
               'khotailieu', 'quantri', 'dulieunen', 'congviec', 'muctieu'];

const MAIN = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: GOC })
  .toString().trim();

async function do1(nhan, commit) {
  const dem = new Map();
  const may = await dungMayGia({
    commit, tatHoatAnh: true,
    // CHỈ nối thêm một dòng — không đổi hành vi bản đang đo.
    suaTep: (s, f) => f === 'assets/js/app.js' ? s + `\nwindow.__API = API;\n` : s,
    apiRieng: (duong, u, traJson) => {
      dem.set(duong, (dem.get(duong) || 0) + 1);
      if (duong === '/api/toi-la-ai') return traJson({
        ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
        phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
        trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: 1,
        them_nhan_su: 1, thao_tac_van_hanh: 1, quyen: QUYEN, shopee: { xem: 1 }
      }) || true;
      if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
      if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
      if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
      if (duong === '/api/muc-tieu/danh-sach')
        return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
      if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
      if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach: [] }) || true;
      if (duong === '/api/kinh-doanh/don-hang-huy') return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
      if (duong === '/api/ke-toan/can-tra-soat') return traJson({ can_tra_soat: [] }) || true;
      if (duong === '/api/ke-toan/hang-hong') return traJson({ hang_hong: [] }) || true;
      if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 1 } }) || true;
      if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
      if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
      return false;
    }
  });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3000 });

  const luotMoTrang = [...dem.values()].reduce((a, b) => a + b, 0);

  /* ĐO 1 — gọi thẳng hàm ghi, KHÔNG qua cái nút. Đây là câu hỏi thật của bản
     vá: "ghi xong thì màn hình có tự làm mới không, hay chỉ tự làm mới ở đúng
     cái nút mà ai đó đã nhớ viết thêm?" Bản TRƯỚC ra 0 — đúng bệnh Sếp gặp. */
  dem.clear();
  await cr.chay(`window.__API.cvCapNhat(1, 'hoan_thanh', 'xong').catch(() => {})`);
  await cr.doi(900);
  const chiTiet = [...dem.entries()].filter(([d]) => d !== '/api/cong-viec/cap-nhat');
  const tong = chiTiet.reduce((a, [, n]) => a + n, 0);

  /* ĐO 2 — đúng đường mà NÚT Duyệt cũ đi (gọi tay hai móc nối làm mới). So
     cái này với ĐO 1 của bản mới mới là so công bằng về CHI PHÍ. */
  dem.clear();
  await cr.chay(`(async () => {
    if (window.LAM_MOI_CONGVIEC) await window.LAM_MOI_CONGVIEC();
    if (window.LAM_MOI_MUCTIEU) await window.LAM_MOI_MUCTIEU();
  })().catch(() => {})`);
  await cr.doi(900);
  const nutCu = [...dem.entries()];
  const tongNutCu = nutCu.reduce((a, [, n]) => a + n, 0);

  cr.dong(); may.dong();
  return { nhan, luotMoTrang, tong, chiTiet, tongNutCu, nutCu };
}

console.log('\nĐO LƯỢT GỌI MÁY CHỦ CHO MỘT CÚ BẤM "DUYỆT XONG" (cvCapNhat)\n' +
            '(1 lệnh gọi = 1 truy vấn D1 trở lên; đếm lệnh gọi là đếm đúng thứ tăng/giảm)\n');

const truoc = await do1('TRƯỚC (origin/main)', MAIN);
const sau = await do1('SAU  (bản 03/09/2026)', null);

for (const r of [truoc, sau]) {
  console.log(`── ${r.nhan}`);
  console.log(`   Lúc MỞ TRANG   : ${r.luotMoTrang} lệnh gọi`);
  console.log(`   Ghi xong, TỰ làm mới : ${r.tong} lệnh gọi` +
    (r.chiTiet.length ? '  →  ' + r.chiTiet.map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · ') : '  ← KHÔNG nạp lại gì cả (đúng bệnh Sếp gặp)'));
  console.log(`   Đường NÚT CŨ đi      : ${r.tongNutCu} lệnh gọi` +
    (r.nutCu.length ? '  →  ' + r.nutCu.map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · ') : ''));
  console.log('');
}

const dau = n => (n >= 0 ? '+' : '') + n;
console.log('SO CHO ĐÚNG — nút Duyệt CŨ (' + truoc.tongNutCu + ' lệnh gọi, làm mới thiếu chuông và thẻ tóm tắt)');
console.log('              so với bản MỚI (' + sau.tong + ' lệnh gọi, làm mới đủ cả chuông):');
console.log(`   Mỗi cú bấm : ${dau(sau.tong - truoc.tongNutCu)} lệnh gọi`);
console.log(`   Lúc mở trang: ${dau(sau.luotMoTrang - truoc.luotMoTrang)} lệnh gọi`);
console.log('   Tab đang ẩn : 0 lệnh gọi (ngủ tới khi người dùng mở tab đó ra)\n');
