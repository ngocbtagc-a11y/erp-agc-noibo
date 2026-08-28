/* ==========================================================================
   NHỊP TIM CHAT — khi nào ĐƯỢC hỏi máy chủ, khi nào ĐƯỢC đóng dấu "tôi đang
   nhìn cửa sổ chat này"
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY (REV-0031 · Việc 2)

   Vòng lặp 6 giây của chat gửi kèm cờ `dang_mo=1`, và máy chủ lấy cờ đó ghi
   một dòng vào `tai_khoan` để biết KHÔNG cần đẩy thông báo lên điện thoại
   người đang ngồi đọc đúng đoạn chat đó. Bản trước:
     · KHÔNG có `clearInterval` — vòng lặp chạy tới khi đóng tab;
     · KHÔNG nghe `visibilitychange` — tab ẩn vẫn hỏi đều;
     · KHÔNG biết giờ làm — máy bàn ở kho để quên cửa sổ chat qua 3 ngày nghỉ
       ghi 43.200 dòng, trong khi hạn mức cả hệ thống là 100.000 dòng/ngày.

   BA CHỐT, tách hẳn ra hàm thuần để bàn thử đo được ĐÚNG thứ đang chạy thật
   (`scripts/do-nhiptim-chat.mjs`), không phải một bản chép lại:

     ① TAB ẨN      → dừng hẳn cả vòng lặp (không hỏi, không ghi). Người ta
                     không nhìn thì hỏi cho ai xem.
     ② NGỒI KHÔNG  → quá `IDLE_PHUT` phút không chạm chuột/phím/màn hình thì
                     coi như đã bỏ đi: dừng vòng lặp. Đây mới là chốt bắt được
                     "máy bàn bỏ quên" — máy đó tab vẫn HIỆN, ① không cứu được.
     ③ NGOÀI GIỜ   → ngoài 8h–18h hoặc Chủ nhật (ADR-0013) thì VẪN HỎI TIN
                     (chat phải chạy, ai cũng có lúc làm muộn) nhưng KHÔNG đóng
                     dấu — tức không ghi một dòng nào vào D1.

   RANH GIỚI: ba chốt này chỉ được làm giảm số lượt GHI. Không được làm mất
   tin nhắn — vòng lặp bật lại là hỏi ngay một lượt (`hoiTinMoi` lấy theo
   `id > idCuoi` nên không sót tin nào trong lúc ngủ).
   ========================================================================== */

/** Ngồi không quá bao lâu thì coi như đã rời máy. */
export const IDLE_PHUT = 5;
const IDLE_MS = IDLE_PHUT * 60 * 1000;

/** Giờ làm theo ADR-0013: 8h–18h giờ VN, nghỉ Chủ nhật (thứ Bảy vẫn tính). */
export function trongGioLam(luc = Date.now()) {
  const vn = new Date(luc + 7 * 3600 * 1000);
  const gio = vn.getUTCHours();
  return vn.getUTCDay() !== 0 && gio >= 8 && gio < 18;
}

/**
 * Vòng lặp hỏi tin có được chạy không (chốt ① và ②).
 * @param {{tabHien:boolean, hoatDongCachDay:number}} mt
 */
export function nenChayVongLap(mt = {}) {
  const { tabHien = true, hoatDongCachDay = 0 } = mt;
  if (!tabHien) return false;
  return hoatDongCachDay < IDLE_MS;
}

/**
 * Có được đóng dấu "đang xem cửa sổ chat này" không — tức có được GHI D1 không.
 * Chỉ đúng khi: cửa sổ chat đang mở THẬT, vòng lặp còn được chạy, và đang
 * trong giờ làm. Máy chủ vẫn chặn thêm một lớp 30 giây ở SQL — hai lớp là cố
 * ý: sửa được trình duyệt thì vẫn không lách được máy chủ.
 * @param {{dangMo:boolean, tabHien:boolean, hoatDongCachDay:number, luc:number}} mt
 */
export function nenDongDau(mt = {}) {
  const { dangMo = false, luc = Date.now() } = mt;
  if (!dangMo) return false;
  if (!nenChayVongLap(mt)) return false;
  return trongGioLam(luc);
}
