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

   ĐÍNH CHÍNH (REV-0031 · Việc 3). Vòng trước file này khai "KHÔNG cần bấm gì"
   — SAI, và bàn thử cũ cũng đo theo lời khai sai đó. Nút 🔔 (`#cnbChuong`) và
   dải chữ (`#tbdMoi`) đều nằm TRONG `#cnbPopup`, mà popup `hidden` cho tới khi
   người ta bấm bong bóng chat `#cnbNut`. Đúng ra chỉ là "không cần bấm nút 🔔
   nữa, nhưng vẫn phải MỞ cửa sổ chat". Chị Lan không mở cửa sổ chat thì vẫn
   không biết mình điếc — lỗi H2 mới vá được một nửa.

   VÌ THẾ có thêm DẤU TRÊN BONG BÓNG (`#cnbDauTB`, gắn ngay trên `#cnbNut`,
   nằm NGOÀI `#cnbPopup`): phần tử duy nhất luôn nhìn thấy ở mọi màn hình của
   ERP. Mọi trạng thái KHÔNG nhận được tin đều bật dấu này, kèm `title` /
   `aria-label` nói rõ cần làm gì.

   LUẬT BẤT BIẾN: mọi trạng thái mà người dùng KHÔNG thật sự nhận được thông
   báo đều phải (1) đổi hình nút 🔔, (2) có một dòng chữ ngắn hiện sẵn, và
   (3) hiện DẤU trên bong bóng chat — riêng (3) thấy được mà KHÔNG BẤM GÌ.
   Trạng thái duy nhất được im là "đang bật thật".
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
 *   soMayTrenMayChu   — MÁY CHỦ đang giữ bao nhiêu đăng ký của tôi (`so_may`
 *                       của `/api/push/khoa`). `null` = chưa hỏi được, đừng
 *                       kết luận gì; `0` = máy chủ KHÔNG còn giữ đăng ký nào.
 * @returns {{ma:string, nut:string, canhBao:boolean, nhanDuoc:boolean,
 *            chu:string, chuNgan:string, hienDai:boolean, coNutBat:boolean,
 *            coNutTatMay:boolean}}
 */
export function tinhTrangThaiTB(mt = {}) {
  const {
    batTrenMayChu = false, chatTat = 0, coNotification = false, quyen = null,
    laIOS = false, daCaiManHinhChinh = false, dangKyHong = false,
    soMayTrenMayChu = null
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

  /* ⑨ MÁY CHỦ KHÔNG CÒN GIỮ ĐĂNG KÝ NÀO CỦA TÔI (REV-0031 · Việc 4 · L4).
     Trước bản vá, trạng thái "Đang bật" chỉ tính từ quyền của TRÌNH DUYỆT và
     KHÔNG hỏi máy chủ còn giữ đăng ký không — dù `/api/push/khoa` đã trả sẵn
     `so_may` mà không ai dùng. Hai đường rơi vào đây, cả hai đều là điếc âm
     thầm trong khi màn hình nói "Đang bật. Đóng ERP rồi vẫn nhận được":
       · Máy dùng chung ở kho: `push_dangky.endpoint` là UNIQUE và
         `DO UPDATE SET nhan_su_id = excluded.nhan_su_id` — B đăng nhập trên
         máy đó là đăng ký của A âm thầm chuyển sang B (so_may của A về 0).
       · Người dùng vừa bấm "Tắt đẩy trên máy này" nhưng quyền trình duyệt
         vẫn `granted` — máy vẫn khoe "Đang bật", đúng nghĩa nói dối.
     `soMayTrenMayChu === null` là "chưa hỏi được" -> KHÔNG kết luận, giữ
     nguyên hành vi cũ; chỉ con số 0 THẬT mới đổi trạng thái. */
  if (quyen === 'granted' && soMayTrenMayChu === 0) {
    return dat({
      ma: 'may_mat_dangky', coNutBat: true,
      chu: 'Máy chủ KHÔNG còn giữ đăng ký nhận tin của máy này (bị tắt, hoặc ' +
           'người khác vừa đăng nhập trên chính máy này). Đóng ERP là không nhận ' +
           'được tin — bấm "Bật lại" để đăng ký lại.',
      chuNgan: 'Máy này đã MẤT đăng ký nhận tin — đóng ERP là không nhận được gì. Bấm "Bật lại".'
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

  /* DẤU TRÊN BONG BÓNG CHAT — phần tử DUY NHẤT nằm ngoài `#cnbPopup`, tức
     thứ duy nhất thấy được mà KHÔNG bấm gì (REV-0031 Việc 3). Không chịu ảnh
     hưởng của "Để sau": "Để sau" chỉ được giấu LỜI MỜI, không được giấu việc
     một người đang điếc. `nutNoi` mang câu chữ cho chuột rê + máy đọc màn hình
     — kể cả ca "đang bật thật", để 8/8 trạng thái đều đọc được không cần bấm. */
  if (els.dauTB) {
    els.dauTB.hidden = !!tt.nhanDuoc;
    els.dauTB.textContent = tt.nhanDuoc ? '' : tt.nut;
    els.dauTB.classList?.toggle('tbd-dau-canhbao', !!tt.canhBao);
    els.dauTB.title = tt.chuNgan;
  }
  if (els.nutNoi) {
    els.nutNoi.title = 'Chat nội bộ — ' + tt.chuNgan;
    els.nutNoi.setAttribute?.('aria-label', 'Chat nội bộ. ' + tt.chuNgan);
  }

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
  return { ma: tt.ma, hienDai, hienDauTB: !tt.nhanDuoc };
}
