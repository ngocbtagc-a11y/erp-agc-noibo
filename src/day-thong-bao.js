/* ==========================================================================
   ĐẨY THÔNG BÁO LÊN ĐIỆN THOẠI — chính sách + hàng gửi (CTL-0014, Đợt 1)
   ---------------------------------------------------------------------------
   YÊU CẦU GỐC: Phạm Thị Lan, qua Góp ý ERP mục Danh bạ —
       "Không hiện thông báo khi có tin nhắn đến"

   ĐO ĐƯỢC GÌ TRƯỚC KHI XÂY (đọc code, không đoán):
     · Số đỏ đếm tin chưa đọc — CÓ RỒI, và TỰ cập nhật 6 giây/lần
       (`public/assets/js/app.js`, `setInterval(hoiChuaDocToanCuc, 6000)`).
       Vậy chị Lan KHÔNG thiếu cái này.
     · Kêu / rung — KHÔNG CÓ. Không một chỗ nào trong `app.js` gọi `Audio`,
       `AudioContext`, `navigator.vibrate` hay `Notification`.
     · Đẩy khi đóng app — KHÔNG CÓ. `public/sw.js` chỉ có `install`/`activate`/
       `fetch`, KHÔNG có handler `push`. Đóng ERP là điếc hoàn toàn.
   Thiếu hai, và cái đắt giá là cái thứ ba: đóng app vẫn phải biết.

   ---------------------------------------------------------------------------
   RỦI RO LỚN NHẤT — VÌ SAO FILE NÀY TOÀN LÀ CHỐT CHẶN, KHÔNG PHẢI TÍNH NĂNG

   Chuông ERP đang gánh CẢNH BÁO ĐƠN HOÀN của Kho vận. Nếu tin nhắn đổ quá
   nhiều, nhân viên sẽ tắt thông báo Ở TẦNG HỆ ĐIỀU HÀNH — mà tầng đó không
   phân biệt được loại nào với loại nào. Tắt tin nhắn = tắt luôn cảnh báo đơn
   hoàn = MẤT TIỀN THẬT, và không ai hay biết.

   Nên trần cứng `TRAN_NGAY` dưới đây quan trọng hơn cả tính năng. Đợt 1 CỐ Ý
   chỉ đẩy CHAT RIÊNG; kênh chung 20 người KHÔNG đẩy — mỗi tin kênh chung mà
   đẩy là 19 thông báo, một buổi họp qua chat là đủ khiến cả công ty tắt sạch.

   ---------------------------------------------------------------------------
   KHÔNG DỰNG BỘ LUẬT CHỐNG LÀM PHIỀN THỨ HAI (CTL-0014 §6): cửa giờ lấy
   NGUYÊN `duocGuiNhac()` của `nhac-nhan-su.js` (ADR-0013 — 8h–18h, nghỉ Chủ
   nhật, thứ Bảy vẫn làm). Ở đây KHÔNG định nghĩa lại khung giờ nào cả.
   ========================================================================== */

import { gioVN, ngayVN, duocGuiNhac } from './nhac-nhan-su.js';
import { guiMotDangKy, khoaVAPID } from './webpush.js';

/** Gộp: một người gửi chỉ làm kêu MỘT lần trong ngần này giây.
 *  60s = "5 tin trong một phút thì chỉ 1 thông báo" của yêu cầu. */
export const GOP_GIAY = 60;

/** Trần cứng: tối đa ngần này thông báo CHAT mỗi người mỗi ngày. Chạm trần thì
 *  im hẳn tới sáng hôm sau — số đỏ và âm trong app vẫn còn, chỉ ngừng ĐẨY.
 *  Đây là hàng rào bảo vệ cảnh báo đơn hoàn, không phải con số cho đẹp. */
export const TRAN_NGAY = 12;

/** Còn coi là "đang ngồi trước cửa sổ chat đó" trong ngần này giây kể từ nhịp
 *  tim cuối. Máy hỏi lại mỗi 6 giây nên 45s là đã bỏ qua 7 nhịp — chắc chắn
 *  người đó đã đóng máy chứ không phải mạng chập. */
export const CON_DANG_XEM_GIAY = 45;

/* ---- Quyết định: có đẩy hay không ---------------------------------------
   Trả về { day, ly_do }. `ly_do` là mã máy đọc được — bàn thử soi thẳng vào
   nó, nên mỗi chốt chặn kiểm được RIÊNG, không phải đoán qua kết quả cuối. */

export async function xetDayChat(env, tin, luc = new Date()) {
  const { nguoi_nhan_id: nhan, nguoi_gui_id: gui } = tin;

  // ① Kênh chung KHÔNG đẩy (Đợt 1). 1 tin × 19 người = thảm hoạ, xem đầu file.
  if (!nhan) return { day: false, ly_do: 'kenh_chung_khong_day' };

  // ② Không bao giờ báo cho chính người vừa gõ. Chốt này nằm ở tầng máy chủ
  //    chứ không ở giao diện — giao diện có lỗi thì tin vẫn không tự dội lại.
  if (nhan === gui) return { day: false, ly_do: 'tu_gui_cho_minh' };

  const tk = await env.DB.prepare(
    `SELECT push_chat_tat, xem_chat_voi, xem_chat_luc
       FROM tai_khoan WHERE nhan_su_id = ?`
  ).bind(nhan).first();
  if (!tk) return { day: false, ly_do: 'khong_co_tai_khoan' };

  // ③ Người dùng đã tự tắt riêng loại "tin nhắn" — cảnh báo đơn hoàn KHÔNG
  //    bị tắt theo, đó chính là lý do phải tắt được riêng từng loại.
  if (tk.push_chat_tat) return { day: false, ly_do: 'nguoi_dung_da_tat' };

  // ④ Cửa giờ dùng CHUNG với hệ nhắc việc — không có khung giờ thứ hai.
  const vn = gioVN(luc);
  const cua = duocGuiNhac(vn);
  if (!cua.duoc) return { day: false, ly_do: cua.ly_do };

  // ⑤ Đang mở ĐÚNG cửa sổ chat với người vừa gửi → không đẩy. Họ đang nhìn
  //    thẳng vào tin nhắn rồi; đẩy nữa là làm phiền vô nghĩa. (Vẫn có âm nhẹ
  //    do giao diện tự phát — xem `app.js`.)
  if (tk.xem_chat_voi && tk.xem_chat_voi === gui && tk.xem_chat_luc) {
    const cach = (luc.getTime() - Date.parse(tk.xem_chat_luc.replace(' ', 'T') + 'Z')) / 1000;
    if (cach >= 0 && cach <= CON_DANG_XEM_GIAY) {
      return { day: false, ly_do: 'dang_mo_dung_cua_so' };
    }
  }

  const khoa = `chat:${gui}`;
  const ngay = ngayVN(vn);

  /* ⑥ Gộp: vừa đẩy cho đúng cặp (người nhận ← người gửi) này trong 60 giây.

     ⚠️ MÚI GIỜ — chỗ này từng sai và bàn thử bắt được: `push_nhat_ky.tao_luc`
     ghi theo GIỜ VN (giống mọi bảng khác trong ERP), nên phải so với mốc hiện
     tại CŨNG ĐỔI SANG GIỜ VN. Đem giờ UTC trừ giờ VN thì hiệu luôn là −7 tiếng,
     điều kiện `cach >= 0` không bao giờ đúng, và chốt gộp KHÔNG BAO GIỜ chạy —
     5 tin một phút ra 5 thông báo trong khi mọi phép kiểm khác vẫn xanh.
     (Cột `tai_khoan.xem_chat_luc` ở chốt ⑤ thì do SQL `datetime('now')` ghi nên
     là giờ UTC — CỐ Ý so bằng mốc UTC, khác chốt này.) */
  const vua = await env.DB.prepare(
    `SELECT tao_luc FROM push_nhat_ky
      WHERE nhan_su_id = ? AND khoa = ? ORDER BY id DESC LIMIT 1`
  ).bind(nhan, khoa).first();
  if (vua) {
    const cach = (vn.getTime() - Date.parse(vua.tao_luc.replace(' ', 'T') + 'Z')) / 1000;
    if (cach >= 0 && cach < GOP_GIAY) return { day: false, ly_do: 'gop_trong_mot_phut' };
  }

  // ⑦ Trần cứng theo ngày — hàng rào bảo vệ cảnh báo đơn hoàn.
  const dem = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM push_nhat_ky
      WHERE nhan_su_id = ? AND ngay = ? AND khoa LIKE 'chat:%'`
  ).bind(nhan, ngay).first();
  if ((dem?.n || 0) >= TRAN_NGAY) return { day: false, ly_do: 'cham_tran_ngay' };

  // ⑧ Chưa bật trên máy nào thì không có gì để gửi (iPhone chưa Thêm vào màn
  //    hình chính rơi vào đây — và đó là lý do phải có đường lùi trong app).
  const may = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM push_dangky WHERE nhan_su_id = ?`
  ).bind(nhan).first();
  if ((may?.n || 0) === 0) return { day: false, ly_do: 'chua_bat_tren_may_nao' };

  return { day: true, ly_do: null, khoa, ngay };
}

/* ---- Gửi thật ------------------------------------------------------------ */

/** Nội dung hiện trên màn hình KHOÁ. CỐ Ý KHÔNG kèm lời tin nhắn: điện thoại
 *  để trên bàn kho là người khác đọc được, mà chat nội bộ có cả chuyện lương
 *  và kỷ luật (CTL-0014 §5.3). Chỉ nói AI nhắn; muốn đọc thì mở ERP ra. */
export function loiThongBao(nguoiGuiTen, soTin = 1) {
  return {
    tieu_de: `💬 ${nguoiGuiTen}`,
    than: soTin > 1 ? `Gửi bạn ${soTin} tin nhắn mới` : 'Gửi bạn một tin nhắn mới',
    loai: 'chat',
    // Bấm vào thì mở ĐÚNG đoạn chat đó, không đổ về trang chủ bắt tự tìm.
    duong_dan: '/app.html#chat'
  };
}

/** Đẩy tới MỌI máy người đó đã bật. Tự dọn đăng ký chết (đổi máy, gỡ app).
 *  Trả về { gui, hong, xoa }. */
export async function dayToiNguoi(env, nhanSuId, noiDung, luc = new Date()) {
  const khoa = khoaVAPID(env);
  if (!khoa) return { gui: 0, hong: 0, xoa: 0, ly_do: 'chua_dat_khoa_vapid' };

  const { results } = await env.DB.prepare(
    `SELECT id, endpoint, p256dh, auth FROM push_dangky WHERE nhan_su_id = ?`
  ).bind(nhanSuId).all();

  let gui = 0, hong = 0, xoa = 0;
  for (const dk of results || []) {
    const kq = await guiMotDangKy(dk, noiDung, khoa, { hienTai: luc.getTime() });
    if (kq.ok) {
      gui++;
      await env.DB.prepare(
        `UPDATE push_dangky SET dung_luc = ?, hong_lien_tiep = 0 WHERE id = ?`
      ).bind(mocSQL(luc), dk.id).run();
    } else if (kq.chet) {
      // Máy chủ đẩy nói thẳng đăng ký không còn — xoá ngay, thử lại vô ích.
      await env.DB.prepare(`DELETE FROM push_dangky WHERE id = ?`).bind(dk.id).run();
      xoa++;
    } else {
      hong++;
      /* Lỗi mạng tạm thời thì còn cứu được, nhưng hỏng 10 lượt LIÊN TIẾP là
         đăng ký rác thật — không dọn thì nó ăn một lượt fetch mỗi tin nhắn,
         mãi mãi. Đây là câu trả lời cho "đổi điện thoại thì rác dọn thế nào". */
      const r = await env.DB.prepare(
        `UPDATE push_dangky SET hong_lien_tiep = hong_lien_tiep + 1 WHERE id = ?
         RETURNING hong_lien_tiep`
      ).bind(dk.id).first();
      if ((r?.hong_lien_tiep || 0) >= 10) {
        await env.DB.prepare(`DELETE FROM push_dangky WHERE id = ?`).bind(dk.id).run();
        xoa++;
      }
    }
  }
  return { gui, hong, xoa };
}

function mocSQL(luc) {
  return new Date(luc.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

/** Đường vào duy nhất cho luồng chat: xét chính sách → ghi nhật ký → đẩy.
 *  Gọi trong `ctx.waitUntil` nên KHÔNG làm chậm nút Gửi của người nhắn, và
 *  KHÔNG bao giờ ném lỗi ra ngoài — thông báo hỏng thì tin nhắn vẫn phải gửi. */
export async function dayTinNhanChat(env, tin, luc = new Date()) {
  try {
    const xet = await xetDayChat(env, tin, luc);
    if (!xet.day) return xet;

    /* Ghi nhật ký TRƯỚC khi gửi. Hai tin đến sát nhau mà ghi sau thì cả hai
       đều thấy "chưa ai đẩy" rồi cùng đẩy — gộp thủng ngay ở đúng tình huống
       nó sinh ra để chặn. */
    await env.DB.prepare(
      `INSERT INTO push_nhat_ky (nhan_su_id, khoa, ngay, tao_luc)
       VALUES (?, ?, ?, ?)`
    ).bind(tin.nguoi_nhan_id, xet.khoa, xet.ngay, mocSQL(luc)).run();

    const kq = await dayToiNguoi(env, tin.nguoi_nhan_id, loiThongBao(tin.nguoi_gui_ten), luc);
    return { day: true, ly_do: null, ...kq };
  } catch (e) {
    console.error('Đẩy tin nhắn:', e.message);
    return { day: false, ly_do: 'loi_' + e.message };
  }
}

/** Dọn nhật ký cũ — chỉ cần giữ đủ để tính gộp 60s và trần theo ngày.
 *  Gọi trong cron; không có nó thì bảng phình mãi. */
export async function donNhatKyCu(env, luc = new Date()) {
  const cu = new Date(luc.getTime() - 3 * 86400 * 1000);
  const r = await env.DB.prepare(
    `DELETE FROM push_nhat_ky WHERE tao_luc < ?`
  ).bind(mocSQL(cu)).run();
  return r?.meta?.changes || 0;
}
