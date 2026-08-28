/* ==========================================================================
   TRẠNG THÁI THÔNG BÁO TIN NHẮN — "nhìn là biết", không phải bấm mới biết
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY (REV-0028 · H2)

   Bản trước ĐÃ CÓ đủ câu chữ hướng dẫn cho iPhone chưa cài PWA và cho người
   lỡ bấm Chặn — nhưng cả hai nằm trong bảng `#tbdCaiDat`, mà bảng đó `hidden`
   cho tới khi người dùng tự bấm nút 🔔; còn nút 🔔 thì KHÔNG đổi hình khi
   chưa thật sự nhận được gì. Kết quả: chị Lan trên iPhone chưa cài PWA không
   nhận được tin nào, và cũng KHÔNG có một dấu hiệu nào cho biết mình đang bỏ
   lỡ. Chị gửi góp ý chính vì không biết mình điếc — vá mà vẫn để người ta
   không biết thì chưa giải quyết yêu cầu của chị.

   NÊN: tách hẳn phần QUYẾT ĐỊNH trạng thái ra một hàm thuần, để
     · giao diện thật (`app.js`) dùng đúng hàm này, và
     · bàn thử (`scripts/do-trangthai-thongbao.mjs`) đo được ĐÚNG hàm đang
       chạy thật, không phải một bản chép lại rồi tự khen nhau.

   LUẬT BẤT BIẾN: mọi trạng thái mà người dùng KHÔNG thật sự nhận được thông
   báo đều phải (1) đổi hình nút 🔔 và (2) có một dòng chữ ngắn hiện sẵn — cả
   hai KHÔNG cần bấm gì. Trạng thái duy nhất được im là "đang bật thật".
   ========================================================================== */

/** Nút khi mọi thứ chạy đúng. Mọi trạng thái điếc phải KHÁC ký tự này. */
export const NUT_DANG_BAT = '🔔';
export const NUT_DANG_TAT = '🔕';

/**
 * @param {object} mt Đo được từ trình duyệt, không phải phỏng đoán:
 *   batTrenMayChu     — két Cloudflare đã có khoá VAPID chưa (`/api/push/khoa`)
 *   chatTat           — người dùng tự tắt riêng loại "tin nhắn"
 *   coNotification    — trình duyệt có API Notification không
 *   quyen             — 'granted' | 'denied' | 'default' | null
 *   laIOS             — iPhone/iPad
 *   daCaiManHinhChinh — đã "Thêm vào màn hình chính" (chạy dạng PWA)
 *   dangKyHong        — đã cho quyền nhưng đăng ký đẩy KHÔNG thành (điếc âm thầm)
 * @returns {{ma:string, nut:string, canhBao:boolean, nhanDuoc:boolean,
 *            chu:string, chuNgan:string, hienDai:boolean, coNutBat:boolean,
 *            coNutTatMay:boolean}}
 */
export function tinhTrangThaiTB(mt = {}) {
  const {
    batTrenMayChu = false, chatTat = 0, coNotification = false, quyen = null,
    laIOS = false, daCaiManHinhChinh = false, dangKyHong = false
  } = mt;

  const dat = (o) => ({
    nut: NUT_DANG_TAT, canhBao: true, nhanDuoc: false,
    hienDai: true, coNutBat: false, coNutTatMay: false, ...o
  });

  // ① Người dùng CHỦ ĐỘNG tắt — không phải hỏng, nên không báo động; nhưng nút
  //    vẫn phải khác hình để không ai ngồi chờ tin trong vô vọng.
  if (chatTat) {
    return dat({
      ma: 'nguoi_dung_tat', canhBao: false, hienDai: false,
      chu: 'Đang TẮT báo tin nhắn. Cảnh báo đơn hoàn của Kho vận KHÔNG bị tắt theo.',
      chuNgan: 'Bạn đang TẮT báo tin nhắn.'
    });
  }

  // ② Két Cloudflare chưa có khoá VAPID — lỗi TRIỂN KHAI, người dùng không sửa
  //    được, nhưng phải nhìn thấy (H3 song song bắn Telegram cho Gạo).
  if (!batTrenMayChu) {
    return dat({
      ma: 'may_chu_chua_bat',
      chu: 'Máy chủ chưa bật đẩy thông báo. Hiện chỉ có tiếng kêu khi ERP đang mở.',
      chuNgan: 'Máy chủ chưa bật đẩy thông báo — đóng ERP là không nhận được tin. Báo người quản trị ERP.'
    });
  }

  // ③ Đã cho quyền nhưng máy KHÔNG đăng ký được — điếc âm thầm đúng nghĩa.
  if (quyen === 'granted' && dangKyHong) {
    return dat({
      ma: 'dang_ky_hong',
      chu: 'Đã cho quyền nhưng máy này chưa đăng ký được với máy chủ đẩy. ' +
           'Thử tải lại trang; còn nữa thì báo người quản trị ERP.',
      chuNgan: 'Máy này chưa đăng ký được nhận tin — hãy tải lại trang.'
    });
  }

  // ④ Chạy đúng — trạng thái DUY NHẤT được phép im.
  if (quyen === 'granted') {
    return dat({
      ma: 'dang_bat', nut: NUT_DANG_BAT, canhBao: false, nhanDuoc: true,
      hienDai: false, coNutTatMay: true,
      chu: 'Đang bật. Đóng ERP rồi vẫn nhận được tin nhắn trên điện thoại.',
      chuNgan: 'Đang bật thông báo tin nhắn.'
    });
  }

  // ⑤ iPhone chưa "Thêm vào màn hình chính" — hỏi quyền cũng không hỏi được,
  //    nên KHÔNG có nút "Bật", chỉ có đúng thao tác cần làm.
  if (laIOS && !daCaiManHinhChinh) {
    return dat({
      ma: 'ios_chua_cai',
      chu: 'Trên iPhone cần mở bằng Safari → nút Chia sẻ → "Thêm vào MH chính", ' +
           'rồi mở ERP từ biểu tượng đó thì mới nhận được thông báo khi đóng app. ' +
           'Chưa làm thì vẫn có tiếng kêu lúc đang mở ERP.',
      chuNgan: 'iPhone: Safari → Chia sẻ → "Thêm vào MH chính", rồi mở ERP từ biểu tượng đó. ' +
               'Chưa làm thì đóng app là KHÔNG nhận được tin nhắn.'
    });
  }

  // ⑥ Đã bấm Chặn — trình duyệt không cho hỏi lại, chỉ người dùng tự mở.
  if (quyen === 'denied') {
    return dat({
      ma: 'bi_chan',
      chu: 'Trình duyệt đang CHẶN thông báo của ERP. Mở phần cài đặt trang trong ' +
           'trình duyệt để cho phép lại — ERP không tự hỏi lại được.',
      chuNgan: 'Trình duyệt đang CHẶN thông báo ERP → bạn KHÔNG nhận được tin nhắn. ' +
               'Mở cài đặt trang trong trình duyệt để cho phép lại.'
    });
  }

  // ⑦ Trình duyệt không có Notification (máy quá cũ, chế độ riêng tư…).
  if (!coNotification) {
    return dat({
      ma: 'khong_ho_tro',
      chu: 'Trình duyệt này không nhận được thông báo khi đóng app. ' +
           'Dùng Chrome (Android/máy tính) hoặc Safari đã "Thêm vào MH chính" (iPhone).',
      chuNgan: 'Trình duyệt này không nhận được thông báo khi đóng app. Dùng Chrome, hoặc Safari đã cài ERP ra màn hình chính.'
    });
  }

  // ⑧ Chưa hỏi quyền lần nào — đây là ca DUY NHẤT còn mời bật được.
  return dat({
    ma: 'chua_bat', coNutBat: true,
    chu: 'Chưa bật thông báo khi đóng app.',
    chuNgan: 'Bật thông báo để biết có tin nhắn kể cả khi đã đóng ERP? ' +
             'Chỉ hiện TÊN người gửi, không hiện nội dung tin — điện thoại để trên bàn ' +
             'người khác cũng không đọc được.'
  });
}

/** Trạng thái nào được phép biến mất khỏi màn hình khi bấm "Để sau".
 *  CHỈ lời mời. Người đang điếc vì iPhone/bị Chặn/máy chủ chưa bật thì dải
 *  hướng dẫn KHÔNG được tắt đi — tắt là quay về đúng lỗi H2. */
export function hoanDuoc(ma) { return ma === 'chua_bat'; }

/** Đổ trạng thái ra DOM. Nhận thẳng các phần tử thật của `app.html` — bàn thử
 *  đưa vào phần tử giả có cùng bề mặt, nên đo được ĐÚNG hàm này. */
export function veGiaoDienTB(els, tt, { daHoan = false } = {}) {
  const hienDai = tt.hienDai && !(hoanDuoc(tt.ma) && daHoan);

  if (els.nutChuong) {
    els.nutChuong.hidden = false;
    els.nutChuong.textContent = tt.nut;
    els.nutChuong.classList.toggle('tbd-dang-tat', tt.ma === 'nguoi_dung_tat');
    els.nutChuong.classList.toggle('tbd-canh-bao', !!tt.canhBao);
    // Chữ cho người dùng đọc màn hình — cũng là "nhìn là biết" cho máy đọc.
    els.nutChuong.title = tt.chuNgan;
    els.nutChuong.setAttribute?.('aria-label', 'Thông báo tin nhắn — ' + tt.chuNgan);
  }
  if (els.chuTrangThai) els.chuTrangThai.textContent = tt.chu;
  if (els.nutTatMay) els.nutTatMay.hidden = !tt.coNutTatMay;

  if (els.daiMoi) {
    els.daiMoi.hidden = !hienDai;
    // Nền cam cho ca đang điếc, nền xanh nhạt cho lời mời — khác nhau từ xa.
    els.daiMoi.classList?.toggle('tbd-moi-canhbao', !!tt.canhBao && !tt.coNutBat);
    if (els.chuMoi) els.chuMoi.textContent = hienDai ? tt.chuNgan : '';
    // "Bật thông báo" / "Để sau" chỉ có nghĩa ở ca còn hỏi quyền được.
    if (els.nutBat) els.nutBat.hidden = !tt.coNutBat;
    if (els.nutDeSau) els.nutDeSau.hidden = !tt.coNutBat;
  }
  return { ma: tt.ma, hienDai };
}
