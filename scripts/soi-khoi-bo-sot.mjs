/* ==========================================================================
   KHỐI HIỂN THỊ BỊ BỎ SÓT — Hồ Ly, REV-0057 vòng 2
   ---------------------------------------------------------------------------
   `do-kiem-ke-lam-moi` định nghĩa "khối hiển thị" = NHỮNG KHỐI BẢN VÁ ĐÃ ĐĂNG
   KÝ NGHE (bảng `KHOI`, 26 dòng viết tay). Định nghĩa đó vòng tròn: một khối
   không ai nối dây thì KHÔNG BAO GIỜ lọt vào bảng, nên KHÔNG BAO GIỜ bị xếp
   vào rổ A — đúng thứ bản kiểm kê sinh ra để bắt.

   Bàn này đi tìm khối như thế bằng TRÌNH DUYỆT THẬT: đứng ở đúng màn có khối
   đó, ghi vào đúng nhóm dữ liệu nó hiển thị, rồi xem nó có tự nạp lại không.

   Chạy:  node scripts/soi-khoi-bo-sot.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';

const QUYEN = ['tongquan', 'chat', 'congviec', 'muctieu', 'kinhdoanh', 'khovan',
               'ketoan', 'donhoan', 'xepca', 'nhansu'];
const dem = new Map();
const may = await dungMayGia({
  tatHoatAnh: true,
  suaTep: (s, f) => f === 'assets/js/app.js' ? s + `\nwindow.__API = API;\n` : s,
  apiRieng: (duong, u, traJson) => {
    dem.set(duong, (dem.get(duong) || 0) + 1);
    if (duong === '/api/toi-la-ai') return traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: 1,
      them_nhan_su: 1, thao_tac_van_hanh: 1, phong_ban_quan_ly: [{ id: 1, ten: 'Kho vận' }],
      quyen: QUYEN, shopee: { xem: 1 }
    }) || true;
    if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
    if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
    if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
    if (duong === '/api/muc-tieu/danh-sach')
      return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
    if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
    if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach_hang: [] }) || true;
    if (duong === '/api/kinh-doanh/don-hang-huy') return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
    if (duong === '/api/ke-toan/can-tra-soat') return traJson({ can_tra_soat: [] }) || true;
    if (duong === '/api/ke-toan/hang-hong') return traJson({ hang_hong: [] }) || true;
    if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
    if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
    if (duong === '/api/quan-tri/danh-sach') return traJson({ nhan_su: [], tai_khoan: [], vai_tro: [] }) || true;
    if (duong === '/api/nhan-su/viec-can-lam') return traJson({}) || true;
    if (duong === '/api/ca/ma-tran-tuan')
      return traJson({ nhan_su: [], ca_mo: [], dang_ky: [], ke_hoach: [], khoa: 0 }) || true;
    return false;
  }
});
const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3500 });

async function thu(nhan, tab, ghi, duong, viSao) {
  await cr.chay(`(() => { const b = document.querySelector('.sb-item[data-tab="${tab}"]'); if (b) b.click(); })()`);
  await cr.doi(700);
  dem.clear();
  await cr.chay(`window.__API.${ghi}.catch(() => {})`);
  await cr.doi(1200);
  const n = dem.get(duong) || 0;
  console.log(`  ${nhan}`);
  console.log(`     đứng ở tab "${tab}", ghi ${ghi.split('(')[0]} → ${duong}: ${n} lượt   ` +
    (n > 0 ? '✔ CÓ tự nạp lại' : '❌ KHÔNG tự nạp lại — khối này vẫn kể số cũ'));
  console.log(`     ${viSao}`);
}

console.log('\nKHỐI HIỂN THỊ KHÔNG NẰM TRONG BẢNG 26 — có tự làm mới không?\n');

await thu('① Bảng "Khách hoàn nhiều" (CSKH, tab Kinh doanh) — app.js:6796',
  'kinhdoanh', `kdDaDoiSoat('RS1')`, '/api/kinh-doanh/khach-hoan-nhieu',
  'Bảng này đọc dữ liệu ĐƠN HOÀN (nhóm `hoan`) và chỉ chạy MỘT lần lúc mở trang.');

await thu('② Ma trận Xếp ca tuần (tab Xếp ca) — app.js:8220',
  'xepca', `caDangKy({ca_mo_id:1})`, '/api/ca/ma-tran-tuan',
  'Đọc nhóm `ca`. Trên `main` mọi NÚT trong khối đó đều nhớ gọi tay `taiMaTran()`,\n' +
  '     nhưng nó KHÔNG đăng ký nghe — nút thứ N+1 thêm ngày mai sẽ lại quên.');

await thu('③ Đối chứng: bảng Đối soát sàn (CÓ đăng ký nghe) — cùng cú ghi',
  'kinhdoanh', `kdDaDoiSoat('RS2')`, '/api/kinh-doanh/can-doi-soat',
  'Khối này nằm trong bảng 26 → phải CÓ tự nạp lại. Nếu nó xanh mà ① đỏ thì\n' +
  '     khác biệt là ở CHỖ ĐĂNG KÝ NGHE, không phải ở phép đo.');

const loi = [...cr.ngoaiLe, ...cr.loiConsole.filter(l => !/favicon|404/.test(l))];
console.log('\nNgoại lệ/console lỗi:', loi.length ? loi.slice(0, 3).join(' | ') : 'sạch');
cr.dong(); may.dong();
