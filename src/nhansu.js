/* ==========================================================================
   HỒ SƠ NHÂN SỰ MỞ RỘNG — đón nhân sự mới bằng ảnh CCCD
   ---------------------------------------------------------------------------
   1. docCCCD: nhận ảnh CCCD (base64), nhờ AI của Cloudflare (Workers AI) đọc
      và bóc các trường cơ bản → trả về để ĐIỀN SẴN form. HR luôn xem lại.
   2. donNhanSuMoi: lưu hồ sơ (kèm ảnh nén base64 lưu thẳng DB) + các trường
      HR gõ tay. CCCD/BHXH/ảnh là dữ liệu nhạy cảm — chỉ HCNS/admin thao tác;
      lương vẫn chỉ admin đặt được (giữ nguyên ranh giới cũ).

   Ảnh do TRÌNH DUYỆT nén + thu nhỏ trước khi gửi (xem app.js), nên máy chủ chỉ
   việc lưu chuỗi base64 gọn nhẹ — không cần R2 cho quy mô nhỏ.
   ========================================================================== */

import { duocThemNhanSu, laAdmin } from './quyen.js';
/* MỘT chỗ khai mô hình đọc ảnh cho CẢ ERP (`src/tai-lieu.js`). Chép tay chuỗi
   mô hình sang đây chính là cách đường đọc CCCD chết âm thầm 11 ngày kể từ
   18/08/2026: kho tài liệu đo ra lỗi 5016 rồi vá, còn đường này không ai chạm
   tới vì nó là một chuỗi khác nằm ở một file khác. */
import { MO_HINH_DOC_ANH, khuonDocAnh } from './tai-lieu.js';

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }

/* base64 (có/không tiền tố data:) → Uint8Array */
function base64ToBytes(b64) {
  const raw = String(b64 || '').replace(/^data:[^,]*,/, '');
  const bin = atob(raw);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/* Viết tắt tên: "Phạm Khương Duy" -> "KD" */
function vietTatTen(hoTen) {
  const tu = String(hoTen).trim().split(/\s+/).filter(Boolean);
  if (!tu.length) return '?';
  return tu.slice(-2).map(t => t[0].toUpperCase()).join('');
}

/* Rút JSON đầu tiên trong một đoạn text (model hay bọc thêm chữ) */
function rutJSON(text) {
  if (!text) return null;
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

/* ==========================================================================
   1. AI ĐỌC ẢNH CCCD → trả các trường điền sẵn
   ========================================================================== */
export async function docCCCD(env, phien, body) {
  if (!duocThemNhanSu(phien.vai_tro)) return loi('Bạn không có quyền quản lý nhân sự', 403);
  if (!env.AI) return loi('Máy chủ chưa bật AI đọc ảnh', 409);

  const anh = body.anh;
  if (!anh) return loi('Chưa có ảnh CCCD');

  let bytes;
  try { bytes = base64ToBytes(anh); } catch { return loi('Ảnh không hợp lệ'); }
  if (bytes.length < 100) return loi('Ảnh quá nhỏ hoặc hỏng');

  const prompt =
    'Đây là ảnh thẻ Căn cước công dân Việt Nam. Hãy đọc và trả về DUY NHẤT một ' +
    'JSON (không thêm chữ nào khác) với các khóa: ' +
    'ho_ten, ngay_sinh (định dạng YYYY-MM-DD), gioi_tinh (Nam/Nữ), so_cccd, ' +
    'que_quan, noi_thuong_tru. Trường nào không đọc được thì để chuỗi rỗng.';

  try {
    /* ⚠️ Khuôn `{image, prompt}` cũ KHÔNG dùng được nữa: mô hình đời mới bỏ
       qua trường `image` mà không báo lỗi, rồi bịa ra một tấm CCCD tưởng
       tượng — HR sẽ điền sẵn một họ tên và số CCCD KHÔNG CÓ THẬT vào hồ sơ
       lao động. Đo ngày 29/08/2026, xem `khuonDocAnh()` trong tai-lieu.js. */
    const kq = await env.AI.run(MO_HINH_DOC_ANH, khuonDocAnh(anh, prompt));
    const data = rutJSON(kq && (kq.response ?? kq.description ?? kq.text ??
                                kq.choices?.[0]?.message?.content)) || {};
    return json({
      ok: true,
      thong_tin: {
        ho_ten: String(data.ho_ten || '').trim(),
        ngay_sinh: String(data.ngay_sinh || '').trim(),
        gioi_tinh: String(data.gioi_tinh || '').trim(),
        so_cccd: String(data.so_cccd || '').replace(/\s+/g, ''),
        que_quan: String(data.que_quan || '').trim(),
        noi_thuong_tru: String(data.noi_thuong_tru || '').trim()
      }
    });
  } catch (e) {
    // AI lỗi thì KHÔNG chặn quy trình — báo để HR tự điền tay.
    return json({ ok: false, loi_ai: 'Không đọc được ảnh, mời điền tay: ' + (e.message || ''), thong_tin: {} });
  }
}

/* ==========================================================================
   2. LƯU HỒ SƠ NHÂN SỰ MỚI (kèm ảnh + trường HR gõ tay)
   ========================================================================== */
export async function donNhanSuMoi(env, phien, body) {
  if (!duocThemNhanSu(phien.vai_tro)) return loi('Bạn không có quyền quản lý nhân sự', 403);

  const hoTen = String(body.ho_ten || '').trim();
  if (hoTen.length < 2) return loi('Vui lòng nhập họ tên');

  const id = 'ns_' + crypto.randomUUID().slice(0, 12);

  // Lương: chỉ admin mới đặt được (HCNS gửi lên cũng bị ép NULL)
  const luong = laAdmin(phien.vai_tro)
    ? ((body.luong === '' || body.luong == null) ? null : parseInt(String(body.luong).replace(/\D/g, ''), 10) || null)
    : null;

  const chuoi = v => { const s = String(v ?? '').trim(); return s || null; };

  // Phòng ban/Chức danh: nếu body gửi *_id (chọn từ Dữ liệu nền chuẩn) thì ưu
  // tiên ghi FK + tên thật vào cột chữ cũ để màn cũ vẫn đọc đúng — cùng đúng
  // 1 khuôn với qtThemNhanSu() trong index.js (Employee Profile Phase 1,
  // đóng nốt khoảng trống ENTITY_IDENTITY.md §10 đã ghi: "bo_phan/chuc_vu
  // text tồn tại song song FK, chờ khép lại"). Chưa chọn từ danh mục (form
  // CCCD hiện chưa có UI này) thì vẫn nhận chữ tự do như cũ, không chặn luồng.
  let pb = null, cd = null;
  if (body.phong_ban_id) {
    pb = await env.DB.prepare('SELECT id, ten FROM phong_ban WHERE id = ? AND hoat_dong = 1')
                     .bind(parseInt(body.phong_ban_id, 10)).first();
  }
  if (body.chuc_danh_id) {
    cd = await env.DB.prepare('SELECT id, ten FROM chuc_danh WHERE id = ? AND hoat_dong = 1')
                     .bind(parseInt(body.chuc_danh_id, 10)).first();
  }

  await env.DB.prepare(`
    INSERT INTO nhan_su
      (id, ho_ten, viet_tat, chuc_vu, bo_phan, phong_ban_id, chuc_danh_id, sdt, email, quan_ly_id, phap_nhan,
       trang_thai, ngay_vao, luong,
       so_cccd, ngay_sinh, gioi_tinh, que_quan, noi_thuong_tru, so_bhxh, anh_cccd, anh_chan_dung)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Công ty', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, hoTen, vietTatTen(hoTen),
    cd ? cd.ten : (chuoi(body.chuc_vu) || ''),
    pb ? pb.ten : (chuoi(body.bo_phan) || ''),
    pb ? pb.id : null, cd ? cd.id : null,
    chuoi(body.sdt), chuoi(body.email), chuoi(body.quan_ly_id),
    chuoi(body.trang_thai) || 'thu_viec', chuoi(body.ngay_vao), luong,
    chuoi(body.so_cccd), chuoi(body.ngay_sinh), chuoi(body.gioi_tinh),
    chuoi(body.que_quan), chuoi(body.noi_thuong_tru), chuoi(body.so_bhxh),
    chuoi(body.anh_cccd), chuoi(body.anh_chan_dung)
  ).run();

  return json({ ok: true, id });
}
