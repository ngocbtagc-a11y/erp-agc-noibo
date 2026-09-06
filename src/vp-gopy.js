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

   ⚠️ NỢ KỸ THUẬT CÓ CHỦ Ý — ghi ra đây để người sau không tưởng là sót:
   phần dựng câu INSERT dưới đây trùng ý với `gopYGui`. Khi nhánh
   `feature/gopy-paste-anh` merge xong thì GỘP hai chỗ lại thành một hàm tạo
   phiếu duy nhất (Rule 5: Reuse → Extend → Create). Để hai chỗ lâu dài thì sớm
   muộn một bên đổi cột mà bên kia không biết.

   PHIẾU TỪ VĂN PHÒNG ẢO VÀO Ở TRẠNG THÁI 'moi' — giống hệt người tự bấm gửi,
   KHÔNG tự duyệt giúp. Mây nghe được câu nói không có nghĩa là câu nói đó đã
   được ai duyệt; cho vào thẳng 'cho_phan_tich' là lặng lẽ bỏ qua cửa duyệt cấp
   1 mà quy trình đang có.
   ========================================================================== */

/* Nguồn sự thật của cặp owner là GOPY_OWNER_THEO_TT trong src/index.js. Chép
   đúng một dòng 'moi' ở đây vì index.js không export được sang (vanphong.js đã
   được index.js import — import ngược lại là vòng tròn). */
const OWNER_MOI = ['NGUOI_GUI', 'QL_CAP1'];

export async function taoPhieuGopY(env, { nguoiGuiId, tieuDe, boiCanh, vuongODau, mongMuon, khuVuc }) {
  const cat = (s, n) => String(s || '').trim().slice(0, n);

  const td = cat(tieuDe, 160);
  const bc = cat(boiCanh, 2000);
  const vo = cat(vuongODau, 2000);
  const mm = cat(mongMuon, 2000);
  if (!td || !bc || !vo || !mm) return null;

  const r = await env.DB.prepare(`
    INSERT INTO gop_y (nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon,
                       khu_vuc, trang_thai, current_owner, next_owner, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, 'moi', ?, ?, datetime('now', '+7 hours'))
  `).bind(nguoiGuiId, td, bc, vo, mm, cat(khuVuc, 80) || null,
          OWNER_MOI[0], OWNER_MOI[1]).run();

  const id = r?.meta?.last_row_id;
  return id ? { id, tieu_de: td } : null;
}
