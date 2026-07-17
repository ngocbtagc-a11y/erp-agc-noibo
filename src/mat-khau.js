/* ==========================================================================
   Kiểm tra mật khẩu đặt có đủ an toàn không
   ---------------------------------------------------------------------------
   Vì sao không ép mật khẩu phải dài:
   Cơ chế khoá 5 lần sai / 15 phút đã chặn được việc dò từng tổ hợp một.
   Cái nó KHÔNG chặn được là mật khẩu đoán trúng ngay từ lần đầu — kẻ xấu
   thử "123456" là vào, chẳng cần dò gì cả.
   Nên thay vì bắt gõ cho dài, ta chặn thẳng những mật khẩu dễ đoán.
   "k9Vm2x" 6 ký tự an toàn hơn "Duy@12345678" 12 ký tự.
   ========================================================================== */

export const DAI_TOI_THIEU = 6;

/* Mật khẩu bị dùng nhiều nhất — kẻ xấu luôn thử những cái này đầu tiên.
   Gồm cả các kiểu người Việt hay đặt. */
const HAY_BI_DOAN = new Set([
  // Phổ biến nhất thế giới
  '123456', '1234567', '12345678', '123456789', '1234567890',
  'password', 'password1', 'passw0rd', 'qwerty', 'qwertyuiop',
  'abc123', 'abcdef', '111111', '000000', '123123', '654321',
  '666666', '888888', '999999', '112233', '121212', '1q2w3e',
  '1q2w3e4r', 'qwe123', 'asdfgh', 'zxcvbn', 'iloveyou', 'admin',
  'admin123', 'letmein', 'welcome', 'monkey', 'dragon', 'sunshine',
  'princess', 'football', 'baseball', 'master', 'login', 'test123',
  // Kiểu người Việt hay đặt
  'matkhau', 'matkhau123', 'vietnam', 'hanoi', 'saigon', 'anhyeuem',
  'yeuem', 'chaoban', 'khongbiet', 'toiyeuem', 'vietnam123',
  // Liên quan công ty — dễ nghĩ ra nhất
  'alphagreen', 'alpha123', 'agc123', 'onfod', 'onfod123',
  'congty', 'congty123', 'shopee', 'shopee123', 'kho123', 'ketoan123'
]);

/* Bỏ dấu + về chữ thường. Dùng ̀-ͯ thay vì gõ thẳng ký tự dấu
   vào regex — gõ thẳng thì file qua tay công cụ khác dễ hỏng mã ký tự. */
function chuanHoa(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
                  .replace(/đ/gi, 'd').toLowerCase();
}

/* Bỏ nốt dấu cách và ký tự ngăn cách để so với danh sách mật khẩu dễ đoán.
   Không có bước này thì "Mật Khẩu" -> "mat khau" không khớp "matkhau",
   và người dùng lách được bằng cách gõ thêm dấu cách. */
function chuanHoaChat(s) {
  return chuanHoa(s).replace(/[\s._-]+/g, '');
}

/* Toàn một ký tự lặp: aaaaaa, 111111 */
function toanMotKyTu(s) {
  return /^(.)\1+$/.test(s);
}

/* Dãy liền nhau: 123456, abcdef, 654321, fedcba */
function dayLienNhau(s) {
  if (s.length < 4) return false;
  let tang = true, giam = true;
  for (let i = 1; i < s.length; i++) {
    const hieu = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (hieu !== 1) tang = false;
    if (hieu !== -1) giam = false;
  }
  return tang || giam;
}

/**
 * Trả về câu báo lỗi nếu mật khẩu không đạt, hoặc null nếu đạt.
 * @param {string} matKhau     mật khẩu người dùng đặt
 * @param {string} tenDangNhap để chặn kiểu đặt mật khẩu trùng tên đăng nhập
 * @param {string} hoTen       để chặn kiểu lấy tên mình làm mật khẩu
 */
export function kiemTraMatKhauDat(matKhau, tenDangNhap = '', hoTen = '') {
  const mk = String(matKhau || '');

  if (mk.length < DAI_TOI_THIEU) {
    return `Mật khẩu phải từ ${DAI_TOI_THIEU} ký tự trở lên`;
  }

  // Khoảng trắng đầu/cuối gần như luôn là gõ nhầm, và sau này rất khó tìm ra
  if (mk !== mk.trim()) {
    return 'Mật khẩu không được có dấu cách ở đầu hoặc cuối';
  }

  const g    = chuanHoa(mk);
  const chat = chuanHoaChat(mk);   // bỏ luôn dấu cách, tránh lách bằng "mat khau"

  if (HAY_BI_DOAN.has(g) || HAY_BI_DOAN.has(chat)) {
    return 'Mật khẩu này quá dễ đoán, kẻ xấu luôn thử nó đầu tiên. Vui lòng đặt mật khẩu khác.';
  }

  if (toanMotKyTu(chat)) {
    return 'Mật khẩu không được lặp lại mãi một ký tự';
  }

  if (dayLienNhau(chat)) {
    return 'Mật khẩu không được là dãy liền nhau kiểu 123456 hay abcdef';
  }

  // Mật khẩu chứa tên đăng nhập: "duy123", "ngoc2026"
  const ten = chuanHoaChat(tenDangNhap);
  if (ten.length >= 3 && chat.includes(ten)) {
    return 'Mật khẩu không được chứa tên đăng nhập của bạn';
  }

  // Mật khẩu chứa tên riêng: "Phạm Khương Duy" -> chặn "khuongduy", "duy2026"
  for (const phan of chuanHoa(hoTen).split(/\s+/)) {
    if (phan.length >= 3 && chat.includes(phan)) {
      return 'Mật khẩu không được chứa tên của bạn';
    }
  }

  // Chỉ toàn số thì dễ đoán hơn hẳn (ngày sinh, số điện thoại)
  if (/^\d+$/.test(chat) && chat.length < 10) {
    return 'Mật khẩu không nên chỉ toàn chữ số — thêm vài chữ cái vào cho chắc';
  }

  return null;
}
