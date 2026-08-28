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
import { guiMotDangKy, khoaVAPID, chuKyVAPID, LOAI_HONG, duocXoaDangKy } from './webpush.js';

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
export function loiThongBao(nguoiGuiTen, soTin = 1, nguoiGuiId = null) {
  return {
    tieu_de: `💬 ${nguoiGuiTen}`,
    than: soTin > 1 ? `Gửi bạn ${soTin} tin nhắn mới` : 'Gửi bạn một tin nhắn mới',
    loai: 'chat',
    /* REV-0028 M1 — nhãn gộp PHẢI theo TỪNG NGƯỜI GỬI. Trước bản vá `sw.js`
       dùng chung nhãn `'chat'`, nên tin của anh Duy THAY THẾ tin của chị Hằng
       trên màn hình khoá và không kêu lại: chị Lan thấy một dòng, tưởng chỉ
       một người nhắn. Cùng một người thì vẫn gộp — đó mới là ý ban đầu. */
    nguoi_gui_id: nguoiGuiId,
    nguoi_gui_ten: nguoiGuiTen,
    /* REV-0028 M3 — bấm vào thì mở ĐÚNG đoạn chat đó, không đổ về kênh chung
       bắt tự đi tìm. Đã cố ý giấu nội dung thì cú bấm bắt buộc phải tới nơi. */
    duong_dan: nguoiGuiId ? `/app.html#chat=${encodeURIComponent(nguoiGuiId)}` : '/app.html#chat'
  };
}

/* ---- Kêu to khi hỏng ở PHÍA MÌNH (REV-0028 H1 · H3) ----------------------
   Log LUÔN LUÔN (mỗi lượt), Telegram MỘT LẦN MỖI NGÀY cho mỗi loại — không
   thì một sự cố khoá lệch bắn hàng trăm tin nhắn Telegram cho Gạo.
   Chỗ đánh dấu "đã báo hôm nay" mượn luôn bảng `push_nhat_ky` sẵn có (không
   thêm bảng, không thêm migration): dòng hệ thống mang `nhan_su_id` riêng và
   `khoa` không khớp `'chat:%'` nên KHÔNG lọt vào phép đếm trần ngày. */
export const NGUOI_HE_THONG = '_he_thong';

async function baoMotLanMoiNgay(env, maCanhBao, ngay, luc) {
  try {
    const co = await env.DB.prepare(
      `SELECT id FROM push_nhat_ky WHERE nhan_su_id = ? AND khoa = ? AND ngay = ? LIMIT 1`
    ).bind(NGUOI_HE_THONG, maCanhBao, ngay).first();
    if (co) return false;
    await env.DB.prepare(
      `INSERT INTO push_nhat_ky (nhan_su_id, khoa, ngay, tao_luc) VALUES (?, ?, ?, ?)`
    ).bind(NGUOI_HE_THONG, maCanhBao, ngay, mocSQL(luc)).run();
    return true;
  } catch {
    /* Bảng chưa có (chưa nạp migration) — đó CHÍNH LÀ ca phải kêu, nên cho kêu. */
    return true;
  }
}

/** Kêu to: log mọi lượt + Telegram tối đa 1 lần/ngày/loại. */
export async function baoDong(env, maCanhBao, loiNhan, { guiTelegram, luc = new Date() } = {}) {
  console.error(`[CTL-0014] ${maCanhBao}: ${loiNhan}`);
  if (typeof guiTelegram !== 'function') return false;
  const ngay = ngayVN(gioVN(luc));
  if (!(await baoMotLanMoiNgay(env, `canhbao:${maCanhBao}`, ngay, luc))) return false;
  try { return await guiTelegram(env, `⚠️ ERP · Thông báo tin nhắn (CTL-0014)\n\n${loiNhan}`); }
  catch { return false; }
}

/** Ngần này lượt hỏng TẠM THỜI liên tiếp thì kêu lên — nhưng KHÔNG xoá.
 *  Đăng ký rác thật (đổi máy, gỡ app) được máy chủ đẩy trả 404/410 và bị dọn ở
 *  nhánh `thue_bao_chet`; không cần đoán mò bằng cách đếm lỗi mạng. Google 5xx
 *  một tiếng là MỌI đăng ký cùng hỏng — đếm rồi xoá thì mất sạch cả công ty,
 *  đúng thảm hoạ mà H1 mô tả, chỉ chậm hơn 10 nhịp. */
export const NGUONG_KEU_HONG = 10;

/** Đẩy tới MỌI máy người đó đã bật. Chỉ dọn đăng ký THẬT SỰ chết.
 *  Trả về { gui, hong, xoa, dung_lai } — `dung_lai` là mã lý do dừng nửa chừng
 *  (khoá sai / bị chặn tốc độ), để nơi gọi và bàn thử soi thẳng vào. */
export async function dayToiNguoi(env, nhanSuId, noiDung, luc = new Date(), { guiTelegram } = {}) {
  const khoa = khoaVAPID(env);
  if (!khoa) return { gui: 0, hong: 0, xoa: 0, ly_do: 'chua_dat_khoa_vapid' };

  const { results } = await env.DB.prepare(
    `SELECT id, endpoint, p256dh, auth FROM push_dangky WHERE nhan_su_id = ?`
  ).bind(nhanSuId).all();

  let gui = 0, hong = 0, xoa = 0, dungLai = null;
  for (const dk of results || []) {
    const kq = await guiMotDangKy(dk, noiDung, khoa, { hienTai: luc.getTime() });

    if (kq.ok) {
      gui++;
      await env.DB.prepare(
        `UPDATE push_dangky SET dung_luc = ?, hong_lien_tiep = 0 WHERE id = ?`
      ).bind(mocSQL(luc), dk.id).run();
      continue;
    }

    hong++;

    /* ① ĐĂNG KÝ THẬT SỰ CHẾT — và CHỈ hai loại này. Máy chủ đẩy nói thẳng
       "không còn nữa" (404/410), hoặc dữ liệu khoá của máy đó méo hẳn. */
    if (duocXoaDangKy(kq.loai)) {
      await env.DB.prepare(`DELETE FROM push_dangky WHERE id = ?`).bind(dk.id).run();
      xoa++;
      continue;
    }

    /* ② LỖI CẤU HÌNH CỦA CHÍNH TA (khoá VAPID sai, 401, 403). Dán nhầm một ký
       tự vào két là mọi đăng ký cùng trả lỗi này — xoá ở đây là xoá sạch cả
       công ty. DỪNG ĐẨY, KÊU TO, KHÔNG ĐỘNG VÀO DỮ LIỆU NGƯỜI TA. */
    if (kq.loai === LOAI_HONG.CAU_HINH_SAI) {
      dungLai = LOAI_HONG.CAU_HINH_SAI;
      await baoDong(env,
        'khoa_vapid_sai',
        `Máy chủ đẩy TỪ CHỐI chữ ký của ERP (mã ${kq.ma || 'khoá hỏng'}${kq.loi ? ' · ' + kq.loi : ''}).\n` +
        'Nhân viên KHÔNG nhận được thông báo tin nhắn nào cho tới khi sửa.\n' +
        'Việc cần làm: kiểm tra lại VAPID_KHOA_CONG_KHAI và VAPID_KHOA_BI_MAT trong két Cloudflare ' +
        '(npm run khoa-vapid để sinh lại cặp khoá khớp nhau).\n' +
        'ĐĂNG KÝ CỦA NHÂN VIÊN ĐƯỢC GIỮ NGUYÊN — không ai phải bật lại.',
        { guiTelegram, luc });
      break;
    }

    /* ③ BỊ CHẶN TỐC ĐỘ — lỗi của nhịp gửi, không phải của đăng ký. Lùi lại. */
    if (kq.loai === LOAI_HONG.CHAN_TOC_DO) {
      dungLai = LOAI_HONG.CHAN_TOC_DO;
      await baoDong(env, 'bi_chan_toc_do',
        `Máy chủ đẩy trả 429 (chặn tốc độ)${kq.doi_giay ? `, bảo đợi ${kq.doi_giay}s` : ''}. ` +
        'Đã ngừng đẩy lượt này và GIỮ NGUYÊN mọi đăng ký; tin nhắn sau sẽ tự thử lại.',
        { guiTelegram, luc });
      break;
    }

    /* ④ 5xx / lỗi mạng — tạm thời. Đếm RIÊNG TỪNG ĐĂNG KÝ để biết cái nào dai
       dẳng, nhưng KHÔNG xoá: chỉ 404/410 mới chắc chắn là thuê bao chết. */
    const r = await env.DB.prepare(
      `UPDATE push_dangky SET hong_lien_tiep = hong_lien_tiep + 1 WHERE id = ?
       RETURNING hong_lien_tiep`
    ).bind(dk.id).first();
    if ((r?.hong_lien_tiep || 0) >= NGUONG_KEU_HONG) {
      await baoDong(env, 'dangky_hong_dai_dang',
        `Một đăng ký đã hỏng ${r.hong_lien_tiep} lượt liên tiếp (mã ${kq.ma || 'mạng'}). ` +
        'KHÔNG xoá — chỉ 404/410 mới chắc là máy đã bỏ. Kiểm tra xem máy chủ đẩy có đang sự cố không.',
        { guiTelegram, luc });
    }
  }
  return { gui, hong, xoa, dung_lai: dungLai };
}

function mocSQL(luc) {
  return new Date(luc.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

/** Đường vào duy nhất cho luồng chat: xét chính sách → ghi nhật ký → đẩy.
 *  Gọi trong `ctx.waitUntil` nên KHÔNG làm chậm nút Gửi của người nhắn, và
 *  KHÔNG bao giờ ném lỗi ra ngoài — thông báo hỏng thì tin nhắn vẫn phải gửi. */
export async function dayTinNhanChat(env, tin, luc = new Date(), { guiTelegram } = {}) {
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

    const kq = await dayToiNguoi(
      env, tin.nguoi_nhan_id,
      loiThongBao(tin.nguoi_gui_ten, 1, tin.nguoi_gui_id),
      luc, { guiTelegram }
    );
    return { day: true, ly_do: null, ...kq };
  } catch (e) {
    console.error('Đẩy tin nhắn:', e.message);
    return { day: false, ly_do: 'loi_' + e.message };
  }
}

/* ---- H3 · Tự phát hiện thiếu bước cài đặt -------------------------------
   Trước bản vá, thiếu bất kỳ bước nào trong ba bước triển khai là IM LẶNG
   TUYỆT ĐỐI: `xetDayChat` ném "no such column" rồi bị `try/catch` nuốt, hoặc
   `khoaVAPID()` trả null rồi thoát êm, còn giao diện thì tự ẩn phần thông báo
   đi. Không log, không Telegram, không ai biết. Đúng kiểu hỏng đã xảy ra thật
   với Sếp hôm nay: sổ ghi "đã nạp" mà dữ liệu chưa đổi.

   RẺ NHẤT: bám vào `scheduled()` sẵn có (ADR-0013), KHÔNG thêm cron nào vào
   `wrangler.toml`. Cửa 9h VN + 5 phút đầu giờ = đúng MỘT lượt cron mỗi ngày,
   đúng được cả khi bảng `push_nhat_ky` chưa tồn tại (không cần chỗ đánh dấu). */

export async function kiemTraCaiDatDay(env, guiTelegram, luc = new Date()) {
  const vn = gioVN(luc);
  if (vn.getUTCHours() !== 9 || vn.getUTCMinutes() >= 5) {
    return { chay: false, ly_do: 'ngoai_cua_kiem_9h' };
  }

  const thieu = [];

  // Bước 1 — migration. Hỏi thẳng cả hai bảng và cả cột mới của `tai_khoan`.
  try {
    await env.DB.prepare(`SELECT 1 FROM push_dangky LIMIT 1`).first();
    await env.DB.prepare(`SELECT 1 FROM push_nhat_ky LIMIT 1`).first();
    await env.DB.prepare(`SELECT push_chat_tat FROM tai_khoan LIMIT 1`).first();
  } catch (e) {
    thieu.push(`Bước 1 — chưa nạp migration (${e.message}). Chạy: npm run nap-daythongbao`);
  }

  // Bước 2 & 3 — hai khoá trong két Cloudflare.
  if (!env.VAPID_KHOA_CONG_KHAI) {
    thieu.push('Bước 2 — thiếu VAPID_KHOA_CONG_KHAI. Chạy: npm run khoa-vapid rồi npx wrangler secret put VAPID_KHOA_CONG_KHAI');
  }
  if (!env.VAPID_KHOA_BI_MAT) {
    thieu.push('Bước 3 — thiếu VAPID_KHOA_BI_MAT. Chạy: npx wrangler secret put VAPID_KHOA_BI_MAT');
  }

  /* Có đủ hai khoá vẫn chưa chắc đúng: dán nhầm/lệch cặp thì ký là hỏng ngay.
     Ký thử một chữ ký thật — bắt được đúng cái đã gây ra H1, TRƯỚC khi nó chạm
     vào đăng ký của ai. Không gọi ra Internet, chỉ tính toán tại chỗ. */
  const khoa = khoaVAPID(env);
  if (khoa) {
    try { await chuKyVAPID('https://kiem-tra-khoa.test/ep', khoa, luc.getTime()); }
    catch (e) {
      thieu.push(`Khoá VAPID có trong két nhưng KÝ KHÔNG ĐƯỢC (${e.message}). ` +
        'Nhiều khả năng dán nhầm hoặc hai khoá không cùng một cặp — sinh lại bằng npm run khoa-vapid.');
    }
  }

  if (!thieu.length) return { chay: true, thieu: [], da_bao: false };

  const daBao = await baoDong(env, 'thieu_buoc_cai_dat',
    'Thông báo tin nhắn lên điện thoại ĐANG KHÔNG CHẠY — không ai nhận được gì khi đóng app.\n\n' +
    thieu.map((t, i) => `${i + 1}. ${t}`).join('\n') +
    '\n\nXem HUONG-DAN-DEPLOY.md mục "Bật thông báo tin nhắn lên điện thoại".',
    { guiTelegram, luc });

  return { chay: true, thieu, da_bao: daBao };
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
