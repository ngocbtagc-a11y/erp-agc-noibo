/* ==========================================================================
   ĐO H2 — "CÓ NGƯỜI ĐIẾC MÀ KHÔNG BIẾT MÌNH ĐIẾC"
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-trangthai-thongbao.mjs

   LỖI ĐANG VÁ (REV-0028 H2): câu chữ hướng dẫn iPhone và câu chữ cho người lỡ
   bấm Chặn ĐÃ CÓ, nhưng nằm trong bảng `#tbdCaiDat` mang thuộc tính `hidden`
   cho tới khi người dùng tự bấm nút 🔔 — mà nút 🔔 lại KHÔNG đổi hình khi chưa
   thật sự nhận được gì. Chị Lan gửi góp ý chính vì không biết mình đang bỏ lỡ.

   ĐÍNH CHÍNH (REV-0031 · Việc 3): vòng trước bàn thử này khai ① và ② hiện ra
   "KHÔNG cần bấm gì" — SAI, và nó khai vậy vì chỉ đo hàm vẽ chứ không đo CHỖ
   ĐẶT phần tử trong `app.html`. Cả `#cnbChuong` lẫn `#tbdMoi` đều nằm trong
   `#cnbPopup`, mà popup `hidden` cho tới khi bấm bong bóng chat. Đúng ra ①②
   chỉ là "không cần bấm nút 🔔 nữa, nhưng vẫn phải MỞ cửa sổ chat".

   ĐO CÁI GÌ: liệt kê MỌI trạng thái một người có thể rơi vào (9 nhánh), rồi
   với từng trạng thái đòi hỏi:
     ① nút 🔔 đổi ký tự (🔔 → 🔕) — tín hiệu chính, không phụ thuộc màu;
     ② một dòng chữ ngắn nói cần làm gì, đổ vào dải `#tbdMoi`;
        (①② nằm trong cửa sổ chat — mục A ở dưới ĐO và NÓI RÕ điều đó)
     ⑤ DẤU trên bong bóng `#cnbNut` và ⑥ chữ trên `title`/`aria-label` của
        chính bong bóng đó — hai thứ này nằm NGOÀI popup, tức là phần DUY NHẤT
        thấy được mà KHÔNG BẤM GÌ CẢ. Đây mới là thứ trả lời đúng yêu cầu gốc.

   ĐO THẬT, KHÔNG KHỚP CHUỖI (BH-34): nạp CHÍNH `public/assets/js/tbd-trangthai.js`
   mà giao diện đang dùng, gọi ĐÚNG hàm `veGiaoDienTB()` mà `app.js` gọi, rồi
   đọc kết quả trên các phần tử. Phần tử là bản dựng tối thiểu có đúng bề mặt
   DOM mà hàm chạm tới (textContent · hidden · classList · title).

   CA ĐỐI CHỨNG (BH-16): nạp thêm một bản `tbd-trangthai.js` đã bị GỠ CƠ HỌC
   phần đổi ký tự nút và phần hiện dải (regex cắt hẳn câu lệnh). Bản đó BẮT
   BUỘC phải trượt; nó mà cũng "đạt" thì phép đo vô dụng.
   ========================================================================== */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NGUON = path.join(GOC, 'public', 'assets', 'js', 'tbd-trangthai.js');

let dat = 0, truot = 0;
function ok(ten, dung, chiTiet = '') {
  if (dung) { dat++; console.log(`  ✅ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
  else { truot++; console.log(`  ❌ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
}

/* ---- Phần tử giả: đúng bề mặt DOM mà `veGiaoDienTB()` chạm tới ----------- */
function phanTu() {
  const lop = new Set();
  return {
    hidden: true, textContent: '', title: '', thuocTinh: {},
    classList: {
      toggle: (t, b) => { if (b) lop.add(t); else lop.delete(t); },
      contains: (t) => lop.has(t)
    },
    setAttribute(k, v) { this.thuocTinh[k] = v; }
  };
}
function banGiaoDien() {
  const e = {
    nutChuong: phanTu(), chuTrangThai: phanTu(), nutTatMay: phanTu(),
    daiMoi: phanTu(), chuMoi: phanTu(), nutBat: phanTu(), nutDeSau: phanTu(),
    /* REV-0031 Việc 3 — hai phần tử NGOÀI `#cnbPopup`: thứ DUY NHẤT thấy được
       mà KHÔNG BẤM GÌ. Bảy phần tử ở trên đều nằm trong popup, tức vẫn phải
       mở cửa sổ chat mới thấy — đúng chỗ vòng trước khai nhầm. */
    dauTB: phanTu(), nutNoi: phanTu()
  };
  return e;
}

/* ---- MỌI trạng thái một người có thể rơi vào ---------------------------- */
const CA = [
  ['Android/máy tính · đang bật thật', {
    batTrenMayChu: true, quyen: 'granted', coNotification: true
  }, { nhanDuoc: true }],

  ['Android/máy tính · chưa hỏi quyền lần nào', {
    batTrenMayChu: true, quyen: 'default', coNotification: true
  }, { nhanDuoc: false, coNutBat: true }],

  ['Đã lỡ bấm CHẶN', {
    batTrenMayChu: true, quyen: 'denied', coNotification: true
  }, { nhanDuoc: false, coNutBat: false }],

  ['iPhone chưa "Thêm vào màn hình chính"', {
    batTrenMayChu: true, quyen: null, coNotification: false, laIOS: true, daCaiManHinhChinh: false
  }, { nhanDuoc: false, coNutBat: false }],

  ['iPhone đã cài PWA nhưng chưa cho quyền', {
    batTrenMayChu: true, quyen: 'default', coNotification: true, laIOS: true, daCaiManHinhChinh: true
  }, { nhanDuoc: false, coNutBat: true }],

  ['Trình duyệt không có Notification', {
    batTrenMayChu: true, quyen: null, coNotification: false
  }, { nhanDuoc: false, coNutBat: false }],

  ['Máy chủ chưa đặt khoá VAPID', {
    batTrenMayChu: false, quyen: 'granted', coNotification: true
  }, { nhanDuoc: false, coNutBat: false }],

  ['Đã cho quyền nhưng máy KHÔNG đăng ký được', {
    batTrenMayChu: true, quyen: 'granted', coNotification: true, dangKyHong: true
  }, { nhanDuoc: false, coNutBat: false }],

  ['Người dùng TỰ tắt báo tin nhắn', {
    batTrenMayChu: true, quyen: 'granted', coNotification: true, chatTat: 1
  }, { nhanDuoc: false, coNutBat: false, tuTat: true }],

  /* REV-0031 Việc 4 (L4) — quyền trình duyệt vẫn `granted` NHƯNG máy chủ
     không còn giữ đăng ký nào của người này (`so_may = 0`): máy dùng chung ở
     kho bị người đăng nhập sau chiếm mất endpoint, hoặc vừa bấm "Tắt đẩy trên
     máy này". Trước bản vá cả hai đều rơi vào ④ "Đang bật. Đóng ERP rồi vẫn
     nhận được tin nhắn" — điếc âm thầm mà màn hình nói dối. */
  ['Máy chủ đã MẤT đăng ký của máy này (máy dùng chung / vừa tắt)', {
    batTrenMayChu: true, quyen: 'granted', coNotification: true, soMayTrenMayChu: 0
  }, { nhanDuoc: false, coNutBat: true }]
];

async function chay() {
  console.log('='.repeat(72));
  console.log('ĐO H2 — mọi trạng thái có nhìn thấy được mà KHÔNG cần bấm không');
  console.log('='.repeat(72));

  const M = await import('file://' + NGUON.replace(/\\/g, '/'));

  /* --- ① Dải trạng thái phải nằm NGOÀI bảng cài đặt ---------------------- */
  console.log('\nA · Chỗ đặt dải chữ trong public/app.html');
  const html = readFileSync(path.join(GOC, 'public', 'app.html'), 'utf8');
  const viTriMoi = html.indexOf('id="tbdMoi"');
  const moCaiDat = html.indexOf('id="tbdCaiDat"');
  const dongCaiDat = html.indexOf('</div>', html.indexOf('id="tbdTatMay"'));
  ok('dải #tbdMoi nằm NGOÀI bảng #tbdCaiDat (không cần bấm 🔔 mới thấy)',
    viTriMoi > 0 && moCaiDat > 0 && !(viTriMoi > moCaiDat && viTriMoi < dongCaiDat),
    `#tbdMoi ở ${viTriMoi}, #tbdCaiDat ở ${moCaiDat}`);

  /* --- ①b REV-0031 Việc 3 — ĐÍNH CHÍNH LỜI KHAI "KHÔNG CẦN BẤM GÌ" ------
     Vòng trước khai dải #tbdMoi hiện ra mà không cần bấm gì. SAI: nó nằm
     TRONG `#cnbPopup`, mà popup `hidden` cho tới khi bấm bong bóng `#cnbNut`.
     Đo lại cho đúng sự thật, rồi đòi phải có một dấu hiệu NGOÀI popup. */
  {
    const moPopup = html.indexOf('id="cnbPopup"');
    const dongPopup = html.indexOf('id="cnbGanDay"');   // phần tử đầu tiên SAU khi popup đóng thẻ
    const trongPopup = (id) => {
      const v = html.indexOf(`id="${id}"`);
      return v > moPopup && v < dongPopup;
    };
    if (moPopup < 0 || dongPopup < 0) { console.error('HỎNG: không tìm được mốc #cnbPopup/#cnbGanDay'); process.exit(2); }
    ok('SỰ THẬT: #tbdMoi và #cnbChuong ĐỀU nằm trong #cnbPopup → vẫn phải MỞ cửa sổ chat mới thấy',
      trongPopup('tbdMoi') && trongPopup('cnbChuong'), 'đúng như REV-0031 chỉ ra');
    ok('#cnbPopup có thuộc tính hidden (popup đóng khi vừa vào ERP)',
      /id="cnbPopup"[^>]*\shidden/.test(html));
    ok('DẤU ĐIẾC #cnbDauTB nằm NGOÀI #cnbPopup, gắn trên bong bóng #cnbNut luôn hiện',
      html.includes('id="cnbDauTB"') && !trongPopup('cnbDauTB') &&
      html.indexOf('id="cnbDauTB"') > html.indexOf('id="cnbNut"'));
    const css = readFileSync(path.join(GOC, 'public', 'assets', 'css', 'style.css'), 'utf8');
    ok('CSS có chốt `.cnb-dau-tb[hidden] { display: none }` (lỗi ADR-0008: thiếu là báo oan mãi)',
      /\.cnb-dau-tb\[hidden\]\s*\{\s*display:\s*none/.test(css));
  }

  /* --- ② Từng trạng thái ------------------------------------------------ */
  console.log('\nB · Mọi trạng thái người dùng có thể rơi vào');
  const maDaGap = new Set();
  for (const [ten, mt, mong] of CA) {
    const tt = M.tinhTrangThaiTB(mt);
    const els = banGiaoDien();
    M.veGiaoDienTB(els, tt, { daHoan: false });
    maDaGap.add(tt.ma);

    const doiHinh = els.nutChuong.textContent !== M.NUT_DANG_BAT;
    const coDai = els.daiMoi.hidden === false && els.chuMoi.textContent.length >= 20;
    const coCham = els.nutChuong.classList.contains('tbd-canh-bao');

    console.log(`\n  ${ten}  →  ${tt.ma}`);
    if (mong.nhanDuoc) {
      ok('  đang nhận được thật → nút 🔔 bình thường, không doạ người dùng',
        els.nutChuong.textContent === M.NUT_DANG_BAT && !coCham && els.daiMoi.hidden === true,
        `nút "${els.nutChuong.textContent}"`);
      ok('  có nút "Tắt đẩy trên máy này"', els.nutTatMay.hidden === false);
    } else if (mong.tuTat) {
      // Người tự tắt: vẫn phải đổi hình nút (kẻo ngồi chờ tin), nhưng không doạ.
      ok('  tự tắt → nút đổi hình 🔕, không có chấm báo động',
        doiHinh && !coCham, `nút "${els.nutChuong.textContent}"`);
    } else {
      ok('  ① nút đổi ký tự 🔔 → 🔕 (không cần bấm gì)', doiHinh,
        `nút "${els.nutChuong.textContent}"`);
      ok('  ② có chấm cam báo động trên nút', coCham);
      ok('  ③ có DÒNG CHỮ NGẮN hiện sẵn nói cần làm gì', coDai,
        `"${els.chuMoi.textContent.slice(0, 70)}…"`);
      ok('  ④ nút "Bật thông báo" chỉ hiện ở ca còn hỏi quyền được',
        els.nutBat.hidden === !mong.coNutBat,
        mong.coNutBat ? 'có nút Bật' : 'không có nút Bật (bấm cũng vô ích)');
    }
    ok('  chữ dài trong bảng cài đặt vẫn có, không mất đi',
      els.chuTrangThai.textContent.length >= 20);

    /* REV-0031 Việc 3 — ĐÒI HỎI MỚI: thấy được mà KHÔNG BẤM GÌ CẢ, tức phải
       nằm trên phần tử ngoài `#cnbPopup`. Đây là thứ vòng trước khai có mà
       thực ra không có. */
    ok('  ⑤ KHÔNG BẤM GÌ: dấu trên bong bóng chat nói đúng tình trạng',
      els.dauTB.hidden === !!mong.nhanDuoc &&
      (mong.nhanDuoc ? true : els.dauTB.textContent === M.NUT_DANG_TAT),
      mong.nhanDuoc ? 'đang nhận được thật → không có dấu, không doạ người dùng'
                    : `hiện dấu "${els.dauTB.textContent}"`);
    ok('  ⑥ KHÔNG BẤM GÌ: rê chuột / máy đọc màn hình trên bong bóng đọc được tình trạng',
      String(els.nutNoi.thuocTinh['aria-label'] || '').includes(tt.chuNgan) &&
      els.nutNoi.title.includes(tt.chuNgan));
  }

  /* 9 nhánh của `tinhTrangThaiTB()` phải được đi qua HẾT. (10 ca > 9 trạng
     thái là cố ý: iPhone-đã-cài-PWA-chưa-cho-quyền và Android-chưa-hỏi-quyền
     là hai đường vào KHÁC NHAU cùng dẫn tới `chua_bat` — phải đo cả hai.) */
  ok(`${CA.length} ca đi qua ĐỦ ${maDaGap.size}/9 nhánh trạng thái, không sót nhánh nào`,
    maDaGap.size === 9, [...maDaGap].join(', '));
  ok('trạng thái "máy chủ mất đăng ký" KHÔNG bị "Để sau" giấu đi được',
    M.hoanDuoc('may_mat_dangky') === false);

  /* --- ③ "Để sau" chỉ được giấu LỜI MỜI, không được giấu cảnh báo -------- */
  console.log('\nC · Bấm "Để sau" rồi thì ai còn được nhìn thấy');
  {
    const ttMoi = M.tinhTrangThaiTB({ batTrenMayChu: true, quyen: 'default', coNotification: true });
    const e1 = banGiaoDien();
    M.veGiaoDienTB(e1, ttMoi, { daHoan: true });
    ok('lời mời xin quyền thì "Để sau" giấu được (không hỏi lại mỗi lượt)',
      e1.daiMoi.hidden === true && e1.nutChuong.textContent !== M.NUT_DANG_BAT,
      'nhưng nút 🔕 + chấm cam VẪN ở đó');

    for (const ma of ['ios_chua_cai', 'bi_chan', 'may_chu_chua_bat', 'dang_ky_hong']) {
      ok(`"${ma}" KHÔNG giấu đi được bằng "Để sau"`, M.hoanDuoc(ma) === false);
    }
    const ttIOS = M.tinhTrangThaiTB({
      batTrenMayChu: true, coNotification: false, laIOS: true, daCaiManHinhChinh: false
    });
    const e2 = banGiaoDien();
    M.veGiaoDienTB(e2, ttIOS, { daHoan: true });
    ok('iPhone chưa cài: đã bấm "Để sau" trước đó thì dải VẪN hiện',
      e2.daiMoi.hidden === false, `"${e2.chuMoi.textContent.slice(0, 60)}…"`);
  }

  /* --- ④ CA ĐỐI CHỨNG (BH-16) ------------------------------------------- */
  console.log('\nD · Ca đối chứng — gỡ hai dấu hiệu ra thì phép đo có bắt được không');
  const goc = readFileSync(NGUON, 'utf8');
  const tim1 = /els\.nutChuong\.textContent = tt\.nut;/;
  const tim2 = /els\.daiMoi\.hidden = !hienDai;/;
  const tim3 = /els\.dauTB\.hidden = !!tt\.nhanDuoc;/;
  if (!tim1.test(goc) || !tim2.test(goc) || !tim3.test(goc)) {
    console.error('HỎNG: regex ca đối chứng đã lạc hậu so với code — sửa rồi chạy lại.');
    process.exit(2);
  }
  const khongVa = goc
    .replace(tim1, '/* GỠ CỐ Ý: nút không đổi hình, đúng như bản trước khi vá */')
    .replace(tim2, 'els.daiMoi.hidden = true;   /* GỠ CỐ Ý: dải không bao giờ hiện */')
    .replace(tim3, 'els.dauTB.hidden = true;    /* GỠ CỐ Ý: bong bóng không có dấu điếc */');
  const duongTam = path.join(path.dirname(NGUON), '_doichung_trangthai.js');
  writeFileSync(duongTam, khongVa, 'utf8');
  try {
    const KV = await import('file://' + duongTam.replace(/\\/g, '/') + '?v=' + Date.now());
    let batDuoc = 0;
    for (const [, mt, mong] of CA) {
      if (mong.nhanDuoc) continue;
      const els = banGiaoDien();
      els.nutChuong.textContent = KV.NUT_DANG_BAT;   // như HTML gốc: nút luôn là 🔔
      KV.veGiaoDienTB(els, KV.tinhTrangThaiTB(mt), { daHoan: false });
      const nhinThay = els.nutChuong.textContent !== KV.NUT_DANG_BAT ||
        els.daiMoi.hidden === false || els.dauTB.hidden === false;
      if (!nhinThay) batDuoc++;
    }
    ok(`ĐỐI CHỨNG · bản KHÔNG VÁ để LỌT cả ${CA.length - 1} ca điếc (phép đo nhạy thật)`,
      batDuoc === CA.length - 1, `${batDuoc}/${CA.length - 1} ca không có dấu hiệu nào`);
  } finally {
    try { unlinkSync(duongTam); } catch { /* đã xoá */ }
  }

  console.log('\n' + '='.repeat(72));
  console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
  return truot === 0;
}

chay()
  .then((d) => process.exit(d ? 0 : 1))
  .catch((e) => { console.error('\nBÀN ĐO HỎNG:', e.stack || e.message); process.exit(2); });
