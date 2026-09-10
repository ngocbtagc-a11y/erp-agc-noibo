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

/* ==========================================================================
   TỰ ĐẨY VIỆC NHẸ — nhân viên ảo tự làm, không bắt Sếp bấm
   ---------------------------------------------------------------------------
   Sếp Ngọc chốt 06/09/2026: "rủi ro thấp thì nhân viên ảo tự làm luôn, rủi ro
   cao nếu tao online thì đẩy sang cho tao duyệt, nếu tao không online thì đẩy
   về Telegram."

   Ở đây chỉ làm vế thứ nhất — RỦI RO THẤP. Vế rủi ro cao nằm ở
   nhacSepViecTreo() bên vanphong.js.

   VÌ SAO ĐƯỢC PHÉP TỰ ĐẨY MÀ KHÔNG PHẠM OWNER GATE:
   Hiến pháp bắt dừng ở việc RỦI RO CAO, không bắt dừng ở mọi việc. Bước này chỉ
   gán loại + mức rủi ro rồi cho phiếu đi tiếp trong hàng đợi — không đụng tiền,
   không sửa dữ liệu thật, không phát hành gì. Bắt Sếp bấm tay cho từng phiếu
   rủi ro thấp là biến cửa duyệt thành thủ tục, mà thủ tục nhiều quá thì người
   ta bấm cho xong — lúc đó cửa duyệt mất tác dụng đúng ở phiếu cần nó nhất.

   BỐN CHỐT CHẶN, mất một cái là không được tự đẩy:
     1. de_xuat_risk phải đúng bằng 'LOW' — máy tự chấm MEDIUM/HIGH thì dừng.
     2. Phải có de_xuat_spec — nghĩa là Hồ Ly đã thật sự phân tích, không phải
        dòng trống.
     3. Chỉ đi từ 'cho_phan_tich' hoặc 'dang_phan_tich' sang 'da_duyet' — đúng
        luật CHUYEN_HOP_LE của gop_y, không nhảy cóc.
     4. Điều kiện lặp lại NGAY TRONG CÂU UPDATE. Kiểm ở JS rồi mới ghi là để hở
        một khe: giữa lúc đọc và lúc ghi, Sếp có thể vừa đổi trạng thái phiếu đó
        trên màn hình.

   Mỗi lượt tối đa 5 phiếu: cron chạy 5 phút/lần nên vẫn tiêu hết hàng đợi
   nhanh, mà một lần lỗi thì chỉ ảnh hưởng 5 dòng chứ không phải cả bảng.
   ========================================================================== */
export async function tuDayViecNhe(env) {
  const { results } = await env.DB.prepare(`
    SELECT id, tieu_de, de_xuat_loai, de_xuat_risk, de_xuat_ly_do, trang_thai
      FROM gop_y
     WHERE trang_thai IN ('cho_phan_tich', 'dang_phan_tich')
       AND de_xuat_risk = 'LOW'
       AND de_xuat_spec IS NOT NULL
     ORDER BY tao_luc ASC LIMIT 5
  `).all();

  let daDay = 0;
  for (const g of results || []) {
    try {
      const r = await env.DB.prepare(`
        UPDATE gop_y
           SET risk = 'LOW',
               loai = COALESCE(loai, de_xuat_loai),
               trang_thai = 'da_duyet',
               current_owner = 'OWNER',
               next_owner = 'KHIDOT',
               cap_nhat_luc = datetime('now', '+7 hours')
         WHERE id = ?
           AND trang_thai = ?
           AND de_xuat_risk = 'LOW'
      `).bind(g.id, g.trang_thai).run();

      if (!r?.meta?.changes) continue;   // ai đó vừa đổi trạng thái trước mình

      /* Ghi vết dưới danh nghĩa MÁY, không mạo danh người. Bảng lịch sử có
         CHECK chặn mọi kiểu mạo danh — 'ho_ly' là đúng tác nhân ở đây vì phần
         phân tích do Hồ Ly làm, văn phòng ảo chỉ cho nó đi tiếp. */
      await env.DB.prepare(`
        INSERT INTO gop_y_lich_su (gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id,
                                   nguoi_thuc_hien_loai, tac_nhan, ghi_chu, luc)
        VALUES (?, ?, 'da_duyet', NULL, 'ho_ly', 'VAN_PHONG_AO', ?, datetime('now', '+7 hours'))
      `).bind(g.id, g.trang_thai,
              'Văn phòng ảo tự cho đi tiếp: rủi ro THẤP, đã có đặc tả. ' +
              (g.de_xuat_ly_do || '')).run();

      daDay++;
    } catch (e) {
      console.error('Tự đẩy góp ý #' + g.id + ':', e.message);
    }
  }
  return daDay;
}
