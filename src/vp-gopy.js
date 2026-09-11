/* ==========================================================================
   VĂN PHÒNG ẢO → PHIẾU GÓP Ý ERP
   ---------------------------------------------------------------------------
   Sếp Ngọc chốt 06/09/2026: bỏ tab Góp ý ERP, ai có góp ý thì vào văn phòng ảo
   nói với Mây. Nên phải có đường từ câu nói của người dùng thành một phiếu có
   mã số, theo dõi được — không thì góp ý bay vào hội thoại rồi mất.

   VÌ SAO LÀ FILE RIÊNG CHỨ KHÔNG SỬA `gopYGui` TRONG index.js:
   `gopYGui` / `#gy-form` / `dinh_kem` đang thuộc nhánh `feature/gopy-paste-anh`
   của Khỉ Đột, chưa merge, và docs/ACTIVE-WORK.md ghi rõ KHÔNG ĐỤNG. Sửa vào
   đó là dẫm lên việc người khác đang làm dở và gần như chắc chắn xung đột lúc
   merge.

   ⚠️ NỢ KỸ THUẬT ĐÃ TRẢ — 10/09/2026. Bản trước dựng câu INSERT riêng, trùng
   ý với `gopYGui` trong index.js, và nó đã nổ đúng như chú thích cũ cảnh báo:
   index.js biết luật miễn duyệt cho người giữ cờ `duyet_gopy`, chỗ này KHÔNG.
   Đo được trên bản thật: Sếp Ngọc có `duyet_gopy = 1` mà hai phiếu Sếp tạo
   qua Mây (GY-0011, GY-0012) vẫn rơi vào hàng chờ duyệt của anh Phong.
   Nay cả hai đường cùng gọi `taoPhieuGopYChung()` trong src/gopy-cua-duyet.js
   — một luật, một chỗ (Rule 5: Reuse → Extend → Create).

   PHIẾU TỪ VĂN PHÒNG ẢO KHÔNG ĐƯỢC TỰ DUYỆT GIÚP. Mây nghe được câu nói không
   có nghĩa là câu nói đó đã được ai duyệt. Nó chỉ đi thẳng đúng khi CHÍNH
   NGƯỜI GỬI được miễn duyệt theo luật chung — cùng đúng một nhánh quyết định
   với đường người tự bấm gửi, không có ngoại lệ riêng cho Văn phòng ảo.
   ========================================================================== */

import { taoPhieuGopYChung } from './gopy-cua-duyet.js';

/* `nguoiGuiId` chứ không phải phiên đăng nhập: Mây tạo phiếu THAY NGƯỜI KHÁC
   được (vp-may.js truyền `nguoi.nhan_su_id`, người đang nói chuyện). Quyền
   miễn duyệt phải bám người ghi trên phiếu, nên `taoPhieuGopYChung()` tự tra
   lại hồ sơ từ chính id này. */
export async function taoPhieuGopY(env, { nguoiGuiId, tieuDe, boiCanh, vuongODau, mongMuon, khuVuc }) {
  const cat = (s, n) => String(s || '').trim().slice(0, n);

  const td = cat(tieuDe, 160);
  const bc = cat(boiCanh, 2000);
  const vo = cat(vuongODau, 2000);
  const mm = cat(mongMuon, 2000);
  if (!td || !bc || !vo || !mm) return null;

  return await taoPhieuGopYChung(env, {
    nguoiGuiId, tieuDe: td, boiCanh: bc, vuongODau: vo, mongMuon: mm,
    khuVuc: cat(khuVuc, 80) || null
  });
}
