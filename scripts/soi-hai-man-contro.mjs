/* ==========================================================================
   HAI MÀN CÓ CON TRỎ "XEM TIẾP" — Hồ Ly, REV-0057 vòng 4
   ---------------------------------------------------------------------------
   `lam-moi.js` khai 13 khối rổ A chia làm bốn nhóm, trong đó:
     · "danh sách Lịch sử làm việc"  → xếp vào nhóm **5 khối ĐÃ NỐI DÂY**
     · "danh sách Lịch sử hoàn"      → xếp vào nhóm **1 khối CỐ Ý KHÔNG NGHE**
   Nhưng đọc mã thì HAI màn này có CÙNG một hình dạng: cùng con trỏ tải tiếp
   (`TRUOC_LSCV` / `TRUOC_LS`), cùng `{ them: true }` nối thêm trang cũ hơn.
   Cùng hình dạng mà xếp hai nhóm khác nhau thì ít nhất một chỗ khai sai.

   Bàn này hỏi thẳng trình duyệt: đứng ở đúng màn đó, ghi vào đúng nhóm dữ
   liệu nó hiển thị — nó có tự nạp lại không?

   Chạy:  node scripts/soi-hai-man-contro.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';

const QUYEN = ['tongquan', 'lichsuviec', 'chat', 'congviec', 'muctieu',
               'khovan', 'donhoan', 'kinhdoanh', 'ketoan'];
const dem = new Map();
const may = await dungMayGia({
  tatHoatAnh: true,
  suaTep: (s, f) => f === 'assets/js/app.js' ? s + '\nwindow.__API = API;\n' : s,
  apiRieng: (duong, u, traJson) => {
    dem.set(duong, (dem.get(duong) || 0) + 1);
    if (duong === '/api/toi-la-ai') return traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: 1,
      them_nhan_su: 1, thao_tac_van_hanh: 1, phong_ban_quan_ly: [],
      quyen: QUYEN, shopee: { xem: 1 }
    }) || true;
    if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
    if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
    if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
    if (duong === '/api/cong-viec/lich-su') return traJson({ viec: [], truoc_tiep: null }) || true;
    if (duong === '/api/muc-tieu/danh-sach')
      return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
    if (duong === '/api/hoan/lich-su') return traJson({ don_hoan: [], truoc_tiep: null, cat: null }) || true;
    if (duong === '/api/hoan/danh-sach') return traJson({ don_hoan: [] }) || true;
    if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
    if (duong === '/api/kinh-doanh/can-doi-soat') return traJson({ can_doi_soat: [] }) || true;
    if (duong === '/api/kinh-doanh/khach-hoan-nhieu') return traJson({ khach_hang: [] }) || true;
    if (duong === '/api/kinh-doanh/don-hang-huy')
      return traJson({ don_huy: [], co_bang: 1, co_van_don: 1 }) || true;
    if (duong === '/api/ke-toan/can-tra-soat') return traJson({ can_tra_soat: [] }) || true;
    if (duong === '/api/ke-toan/hang-hong') return traJson({ hang_hong: [] }) || true;
    return false;
  }
});
const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3500 });

async function thu(nhan, tab, ghi, duong, khai) {
  await cr.chay(`(() => { const b = document.querySelector('.sb-item[data-tab="${tab}"]'); if (b) b.click(); })()`);
  await cr.doi(800);
  dem.clear();
  await cr.chay(`window.__API.${ghi}.catch(() => {})`);
  await cr.doi(1300);
  const n = dem.get(duong) || 0;
  console.log(`  ${nhan}`);
  console.log(`     tab "${tab}" · ghi ${ghi.split('(')[0]} → ${duong}: ${n} lượt   ` +
    (n > 0 ? '✔ CÓ tự nạp lại' : '✘ KHÔNG tự nạp lại'));
  console.log(`     lam-moi.js khai: ${khai}`);
  return n;
}

console.log('\nHAI MÀN CÓ CON TRỎ "XEM TIẾP" — lời khai có khớp hành vi không?\n');

const a = await thu('① Danh sách Lịch sử làm việc (taiLaiLichSuCv)',
  'lichsuviec', `cvCapNhat(1, 'hoan_thanh', 'x')`, '/api/cong-viec/lich-su',
  'nằm trong nhóm "5 khối bệnh thật NAY ĐÃ NỐI DÂY"');

const b = await thu('② Danh sách Lịch sử hoàn (veLichSu)',
  'donhoan', `kdDaDoiSoat('RS1')`, '/api/hoan/lich-su',
  'VÒNG 5 đổi thành NGHE CÓ ĐIỀU KIỆN: chưa bấm "Tải thêm" thì nạp lại, bấm rồi thì thôi');

const c = await thu('③ ĐỐI CHỨNG: bảng Đơn hoàn (veDanhSachDonHoan, CÓ nghe)',
  'donhoan', `kdDaDoiSoat('RS2')`, '/api/hoan/danh-sach',
  'khối này CÓ đăng ký nghe → phải nạp lại');

console.log('\n── ĐỌC KẾT QUẢ');
/* ⚠️ SỬA VÒNG 5 — KẾT LUẬN CŨ CỦA BÀN SOI NÀY LÀ SAI.
   Vòng 4 tôi đọc "① 0 lượt" rồi kết luận Lịch sử làm việc "khai đã nối dây
   nhưng KHÔNG". SAI: 0 lượt ở đó là ĐÚNG và TIẾT KIỆM — bảng `#ls-cv-bang`
   được `window.LAM_MOI_LICHSU_VIEC` vẽ lại từ `CV_DU_LIEU_CUA_TOI` mà
   `lamMoiCacManLienQuanCv` vừa nạp mới, nên CHỮ TRÊN MÀN HÌNH có đổi mà
   không tốn thêm lượt gọi nào. Chứng minh bằng chữ: `soi-lichsu-bang-chu.mjs`
   ca A. Đếm lượt gọi mạng là phép đo GIÁN TIẾP — đúng bài học tôi tự rút ra ở
   vòng 4 và tự vi phạm ngay trong cùng báo cáo đó. */
console.log(`   ① ${a === 0 ? 'ĐÚNG — 0 lượt là TIẾT KIỆM, không phải bỏ sót (vẽ lại từ dữ liệu vừa nạp; xem soi-lichsu-bang-chu.mjs ca A)' : 'có gọi ' + a + ' lượt'}`);
console.log(`   ② ${b > 0 ? 'ĐÚNG lời khai VÒNG 5 — chưa bấm "Tải thêm" nên CÓ nạp lại' : 'không nạp lại'}`);
console.log(`   ③ ${c > 0 ? 'đối chứng xanh — phép đo có mắt' : '❌ đối chứng ĐỎ — phép đo hỏng, đừng tin ① và ②'}`);

const loi = [...cr.ngoaiLe, ...cr.loiConsole.filter(l => !/favicon|404/.test(l))];
console.log('\nNgoại lệ/console lỗi:', loi.length ? loi.slice(0, 3).join(' | ') : 'sạch');
cr.dong(); may.dong();
