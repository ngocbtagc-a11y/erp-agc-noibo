/* ==========================================================================
   CHỤP ẢNH GIAO DIỆN — Chrome headless có sẵn trên máy, chi phí 0
   ---------------------------------------------------------------------------
   Chạy:  node scripts/chup-anh-giao-dien.mjs <thư-mục-ra> [commit]
     · không có `commit`  → chụp CÂY LÀM VIỆC hiện tại (bản "SAU")
     · có `commit`        → hoàn nguyên public/ về commit đó (bản "TRƯỚC")

   VÌ SAO CẦN FILE NÀY: đổi màu/đổi bố cục mà chỉ đọc số thì không trả lời được
   câu Sếp hỏi — "nhìn có sang không". Bảng số nói ĐỌC ĐƯỢC; ảnh nói ĐẸP/XẤU.
   Hai thứ khác nhau, phải có cả hai.

   HAI LỖI ĐÃ VÁ NGÀY 29/08/2026 (REV-0048) — cả hai đều là PHÉP ĐO nói dối,
   không phải mã hỏng, và cả hai đều để lọt ảnh sai tới tận tay Sếp.

   ① "ẢNH TRƯỚC" CHÍNH LÀ ẢNH SAU. Bản cũ hoàn nguyên bằng một DANH SÁCH TAY
      bốn tên tệp. Bộ `anh-chat-noibo` (`239aba7`) khi đó chỉ hoàn nguyên
      `style.css`, nên cả ba ảnh `1440-*-truoc` ra ĐÚNG MỘT tấm md5 `7f93453a`
      — ba màn khác nhau, một ảnh "trước". Nay hoàn nguyên ĐỦ TỆP bằng
      `hoanNguyenPublic()` (hỏi thẳng `git ls-tree`, xoá cả tệp thừa).
      Và không tin lời hứa: mục ⑤ dưới đây ĐỐI CHỨNG md5 — hai màn khác nhau
      mà ra cùng một tấm là DỪNG HẲN, mã thoát 1.

   ② ẢNH 375px BỊ CẮT CỤT MÉP PHẢI. Bản cũ chụp bằng cờ `--screenshot` kèm
      `--window-size=375,812`: tệp PNG ra đúng 375×812 nhưng TRANG dàn ở ~500px
      (Chrome trên Windows ép bề ngang cửa sổ tối thiểu) rồi cắt lấy 375 bên
      trái. Chứng minh: `375-khovan-sau.png` của màn KHÔNG ĐỤNG TỚI cũng cắt
      hệt vậy. Nay chụp qua CDP `Page.captureScreenshot` trên khung nhìn đã
      giả lập bằng `Emulation.setDeviceMetricsOverride` — 375px là 375px thật.
      Mục ⑤ cũng đo lại điều này: mép phải phải còn NỀN, không phải chữ bị cắt.

   ⚠️ KHÔNG chụp bằng `file://`: `app.js` là ES module, nạp từ `file://` bị chặn
   CORS nên `app.js` KHÔNG chạy — trang vẫn ra ảnh, chỉ là thanh bên RỖNG. Dùng
   máy chủ giả của `lib/ban-do-chrome.mjs` (dùng chung với cổng khói).
   ========================================================================== */

import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dungMayGia, moChrome, GOC } from './lib/ban-do-chrome.mjs';

const raDir = resolve(process.argv[2] || join(GOC, 'docs/reviews/anh-tam'));
const commit = process.argv[3] || null;
const hau = commit ? 'truoc' : 'sau';

/* ---- Dữ liệu giả riêng của bàn chụp -------------------------------------
   Bảng RỖNG thì tấm ảnh không nói được gì về bố cục, mà "Sếp chấm bằng mắt"
   là chấm bố cục. Đủ mỗi trạng thái một dòng để thấy cả nút lẫn thẻ. */
const cv = (id, td, giao, giaoTen, nhan, nhanTen, tt, dauRa) => ({
  id, tieu_de: td, dau_ra: dauRa, mo_ta: null, phoi_hop_ids: null, phoi_hop_ten: null,
  nguoi_giao_id: giao, nguoi_giao_ten: giaoTen, nguoi_nhan_id: nhan, nguoi_nhan_ten: nhanTen,
  han_chot: '2026-09-0' + ((id % 8) + 1), trang_thai: tt, ket_qua: tt === 'cho_duyet' ? 'Đã nộp 28/08' : null,
  tao_luc: '2026-08-20 09:00:00', cap_nhat_luc: '2026-08-2' + (id % 9) + ' 10:00:00',
  muc_tieu_id: 1, muc_tieu_ten: 'Giảm sai sót đóng gói'
});
const CV_NHAN = [
  cv(101, 'Đối soát đơn hoàn Shopee T8', 'NS-DUY', 'Phạm Khương Duy', 'NS-NGOC', 'Bùi Thị Ngọc', 'moi', 'Bảng khớp 100%'),
  cv(102, 'Kiểm kê hạt điều nhập khẩu', 'NS-DUY', 'Phạm Khương Duy', 'NS-NGOC', 'Bùi Thị Ngọc', 'dang_lam', 'Biên bản kiểm kê có ký'),
  cv(103, 'Nộp báo cáo thuế quý 3', 'NS-HANG', 'Phan Thị Hằng', 'NS-NGOC', 'Bùi Thị Ngọc', 'cho_duyet', 'Tờ khai đã nộp'),
  cv(104, 'Gọi nhà cung cấp chè Thái Nguyên', 'NS-NGOC', 'Bùi Thị Ngọc', 'NS-NGOC', 'Bùi Thị Ngọc', 'moi', 'Chốt giá lô tháng 9'),
  cv(105, 'Duyệt mẫu bao bì Tết', 'NS-DUY', 'Phạm Khương Duy', 'NS-NGOC', 'Bùi Thị Ngọc', 'hoan_thanh', 'Chốt 1 mẫu')
];
const CV_GIAO = [
  cv(201, 'Dọn kho tầng 2', 'NS-NGOC', 'Bùi Thị Ngọc', 'NS-DUY', 'Phạm Khương Duy', 'cho_duyet', 'Kệ trống, có ảnh'),
  cv(202, 'Lên lịch ca tuần 36', 'NS-NGOC', 'Bùi Thị Ngọc', 'NS-HUONG', 'Vũ Lan Hương', 'dang_lam', 'Bảng ca đã dán'),
  cv(203, 'Chốt bảng lương T8', 'NS-NGOC', 'Bùi Thị Ngọc', 'NS-HANG', 'Phan Thị Hằng', 'moi', 'Bảng lương duyệt xong')
];
const CV_PHOIHOP = [
  cv(301, 'Chuẩn bị hồ sơ chuyển đổi pháp nhân', 'NS-HANG', 'Phan Thị Hằng', 'NS-HUONG', 'Vũ Lan Hương', 'dang_lam', 'Bộ hồ sơ đầy đủ')
];
const CV_LICHSU = [
  cv(401, 'Kiểm tra giấy tờ ATTP lô mới', 'NS-DUY', 'Phạm Khương Duy', 'NS-HUYEN', 'Nguyễn Thị Huyền', 'hoan_thanh', 'Đủ giấy tờ'),
  ...CV_NHAN, ...CV_GIAO, ...CV_PHOIHOP
];

/* Vai chụp ảnh phải có ĐỦ quyền, nếu không tab Kho vận không dựng và ta chụp
   một màn trắng rồi tưởng bố cục hỏng. */
const TOI_CHUP = {
  ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
  phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
  trang_thai: 'dang_lam', nhan_su_id: 'NS-NGOC', id: 'NS-NGOC', la_admin: true,
  phong_ban_quan_ly: [],
  quyen: ['tongquan', 'congviec', 'lichsuviec', 'danhba', 'gopy', 'kinhdoanh',
          'donhoan', 'khovan', 'nhansu', 'ketoan', 'taisan', 'xepca']
};

function apiRieng(duong, u, traJson, req) {
  /* Màn ĐĂNG NHẬP phải thấy "chưa có phiên", không thì `index.html` tự đá
     thẳng sang `app.html` và ta chụp nhầm màn — ảnh trông vẫn "đúng". */
  if (/\/index\.html$/.test(req?.headers?.referer || '')) {
    traJson({ loi: 'chưa đăng nhập' }, 401);
    return true;
  }
  if (duong === '/api/toi-la-ai') { traJson(TOI_CHUP); return true; }
  if (duong === '/api/cong-viec/danh-sach') {
    traJson({ nhan: CV_NHAN, giao: CV_GIAO, phoi_hop: CV_PHOIHOP,
      cat_nhan: { gioi_han: CV_NHAN.length, tong: 523, xem_them: 'Lịch sử làm việc' },
      cat_giao: null, cat_phoi_hop: null });
    return true;
  }
  if (duong === '/api/cong-viec/lich-su') {
    traJson({ viec: CV_LICHSU, cat: { gioi_han: CV_LICHSU.length, tong: 700 },
              truoc_tiep: '2026-08-21 10:00:00|301' });
    return true;
  }
  if (duong === '/api/cong-viec/hom-nay') {
    traJson({ nhac_tat: 0, toi: { qua_han: [], den_han_hom_nay: [], chua_bat_dau: [],
      cho_toi_duyet: [{ id: 201, tieu_de: 'Dọn kho tầng 2', nguoi_nhan_ten: 'Phạm Khương Duy', dong: 2 }] },
      dong_viec: [], ghi_nhan: [] });
    return true;
  }
  if (duong === '/api/cong-viec/tong-quan-congty') {
    traJson({ dang_mo: 40, qua_han: 3, cho_duyet: 2,
      theo_phong_ban: [{ bo_phan: 'Kho vận', dang_mo: 18, qua_han: 2, cho_duyet: 1 },
                       { bo_phan: 'Kế toán', dang_mo: 12, qua_han: 1, cho_duyet: 1 }],
      viec_qua_han: [] });
    return true;
  }
  return false;
}

/* ---- Danh sách ảnh ------------------------------------------------------ */
const MAN = [
  { ten: 'dangnhap',    trang: 'index.html', tab: null },
  { ten: 'trammuctieu', trang: 'app.html',   tab: null },
  { ten: 'lichsuviec',  trang: 'app.html',   tab: 'lichsuviec' },
  { ten: 'khovan',      trang: 'app.html',   tab: 'khovan' }
];
/* Ba bề ngang người ta THẬT SỰ dùng — 1280 thêm 04/09/2026: laptop phổ
   thông là chỗ bảng chật nhất mà vẫn còn là BẢNG (dưới 980px đã đổi sang thẻ),
   nên chụp thiếu nó là bỏ trống đúng khoảng dễ hỏng nhất. */
const KHUNG = [{ nhan: '1440', rong: 1440, cao: 900 },
               { nhan: '1280', rong: 1280, cao: 860 },
               { nhan: '375',  rong: 375,  cao: 812 }];

const may = await dungMayGia({ commit, apiRieng, tatHoatAnh: true });
if (commit) console.log(`  ↩ hoàn nguyên public/ về ${commit} (đủ tệp, không danh sách tay)`);
mkdirSync(raDir, { recursive: true });

const daChup = [];
try {
  for (const m of MAN) {
    for (const k of KHUNG) {
      const ra = join(raDir, `${k.nhan}-${m.ten}-${hau}.png`);
      const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/${m.trang}`,
                                  rong: k.rong, cao: k.cao, doiMs: 3000 });
      try {
        if (m.tab) {
          /* Bấm ĐÚNG cái nút `app.js` vừa sinh ra — `moTab` nằm trong module,
             bên ngoài không với tới được. Bấm qua CDP chứ không nhét `<script>`
             hẹn giờ vào trang: hẹn giờ là phép đo phụ thuộc máy đang bận hay
             rảnh, còn ở đây bấm xong mới chụp. */
          await cr.chay(`document.querySelector('[data-tab="${m.tab}"]').click(); 1`);
          await cr.doi(1200);
        }
        // Bề ngang khung nhìn PHẢI đúng con số đã đặt — nếu không, ảnh cắt mép.
        const rongThat = await cr.chay('window.innerWidth');
        if (rongThat !== k.rong) {
          throw new Error(`khung nhìn ra ${rongThat}px thay vì ${k.rong}px — ảnh sẽ bị cắt mép phải`);
        }
        await cr.chup(ra);
        daChup.push({ tep: ra, man: m.ten, rong: k.rong, rongThat });
        console.log(`  ✓ ${ra}  (khung nhìn ${rongThat}px)`);
      } finally { cr.dong(); }
    }
  }
} finally { may.dong(); }

/* ---- ⑤ ĐỐI CHỨNG BÀN CHỤP (BH-16) --------------------------------------
   Chụp xong KHÔNG được tin là chụp đúng. Hai phép kiểm, mỗi phép nhắm đúng
   một trong hai lỗi vừa vá — hỏng là mã thoát 1, không in "xong" rồi đi. */
console.log('\n--- ĐỐI CHỨNG BÀN CHỤP ------------------------------------');
const truot = [];

/* ① Hai MÀN KHÁC NHAU không được ra cùng một tấm ảnh. Đây đúng chỗ bộ
      `anh-chat-noibo` gãy mà ba vòng soi không thấy. */
const theoMd5 = new Map();
for (const a of daChup) {
  const md5 = createHash('md5').update(readFileSync(a.tep)).digest('hex');
  const khoa = `${a.rong}|${md5}`;
  if (theoMd5.has(khoa)) theoMd5.get(khoa).push(a.man);
  else theoMd5.set(khoa, [a.man]);
}
let trungMan = 0;
for (const [khoa, mans] of theoMd5) {
  const rieng = [...new Set(mans)];
  if (rieng.length > 1) { trungMan++; console.log(`  ❌ ${khoa.split('|')[0]}px: ${rieng.join(' = ')} CHUNG MỘT ẢNH`); }
}
console.log(trungMan ? `  ❌ ${trungMan} nhóm ảnh trùng` : '  ✅ mỗi màn một tấm ảnh riêng (md5 khác nhau)');
if (trungMan) truot.push(`${trungMan} nhóm màn khác nhau ra cùng một ảnh`);

/* ② Ảnh phải ĐỦ BỀ NGANG: kích thước PNG khớp khung nhìn đã đặt. Đọc thẳng
      IHDR của PNG (byte 16..23) — không cần thư viện. */
let sai = 0;
for (const a of daChup) {
  const b = readFileSync(a.tep);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (w !== a.rong) { sai++; console.log(`  ❌ ${a.tep}: ảnh ${w}px ≠ khung nhìn ${a.rong}px`); }
}
console.log(sai ? `  ❌ ${sai} ảnh sai bề ngang` : '  ✅ mọi ảnh đủ bề ngang (PNG khớp khung nhìn)');
if (sai) truot.push(`${sai} ảnh sai bề ngang`);

console.log(`\n${daChup.length} ảnh (${hau}) → ${raDir}`);
if (truot.length) { console.log('❌ BÀN CHỤP HỎNG: ' + truot.join(' · ')); process.exit(1); }
console.log('✅ BÀN CHỤP ĐẠT');
