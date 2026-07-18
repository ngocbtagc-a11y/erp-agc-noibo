/* ==========================================================================
   Kiểm tra mật khẩu đặt — bản NHẸ cho web nội bộ
   ---------------------------------------------------------------------------
   Sếp Ngọc yêu cầu không khắt khe (web nội bộ ~20 người). Nên bỏ hết các
   quy tắc chặn nội dung (chặn 123456, tên mình, ngày sinh, dãy liền…) —
   những thứ hay từ chối mật khẩu người dùng vừa gõ, gây bực.

   Cái thực sự bảo vệ vẫn còn nguyên, KHÔNG nằm ở file này:
   - Khoá 5 lần sai / 15 phút (src/auth.js) → chặn dò mật khẩu.
   - Bắt đổi mật khẩu ở lần đăng nhập đầu → không để mật khẩu admin cấp trôi nổi.
   - Phiên cookie HttpOnly, mật khẩu băm một chiều.

   Ở đây chỉ giữ 2 kiểm tra tối thiểu, và cả hai đều là để BẢO VỆ người dùng
   khỏi tự bắn vào chân, không phải để làm khó.
   ========================================================================== */

export const DAI_TOI_THIEU = 6;

/**
 * Trả về câu báo lỗi nếu mật khẩu không đạt, hoặc null nếu đạt.
 * (Vẫn nhận tenDangNhap, hoTen để giữ nguyên chữ ký hàm — không dùng tới nữa.)
 */
export function kiemTraMatKhauDat(matKhau /*, tenDangNhap, hoTen */) {
  const mk = String(matKhau || '');

  if (mk.length < DAI_TOI_THIEU) {
    return `Mật khẩu phải từ ${DAI_TOI_THIEU} ký tự trở lên`;
  }

  // Dấu cách ở đầu/cuối gần như luôn là gõ nhầm, và sau này rất khó tìm ra
  // vì sao đăng nhập mãi không được → giữ lại để tránh cho người dùng.
  if (mk !== mk.trim()) {
    return 'Mật khẩu không được có dấu cách ở đầu hoặc cuối';
  }

  return null;
}
