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
import { MO_HINH_DOC_ANH, khuonDocAnh, docTinChu } from './tai-lieu.js';
import { NHAN_SO_AI, CAU_SO_AI, tachSoChuaKiem, soCCCD } from './so-ai.js';

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

  /* ⚠️ VÁ REV-0040 · LỖI #2 — `chu_tren_the` LÀ MỎ NEO, KHÔNG PHẢI TRANG TRÍ.
     Bản trước chỉ đòi 6 trường đã bóc sẵn, nên máy chủ KHÔNG có một mẩu chữ
     thô nào để đối chiếu — và `docCCCD` vì thế không gọi được chốt chống bịa
     nào cả (`chuCoThatKhong` chỉ nằm trong `bocChu()` của kho tài liệu). Hồ Ly
     đo thật: khuôn mới trả **họ tên ĐÚNG đứng cạnh số CCCD SAI 11 chữ số**, và
     khuôn cũ bịa hẳn "NGUYỄN VĂN A · 1234567890123".
     Bắt mô hình chép thêm dòng tiêu đề trên thẻ cho ta đúng một mẩu sự thật
     kiểm được: thẻ CCCD Việt Nam LUÔN in "CĂN CƯỚC CÔNG DÂN" (hoặc "CĂN CƯỚC").
     Không có nó thì thứ trong ảnh không phải cái thẻ nó đang khai. */
  const prompt =
    'Đây là ảnh thẻ Căn cước công dân Việt Nam. Hãy đọc và trả về DUY NHẤT một ' +
    'JSON (không thêm chữ nào khác) với các khóa: ' +
    'ho_ten, ngay_sinh (định dạng YYYY-MM-DD), gioi_tinh (Nam/Nữ), so_cccd, ' +
    'que_quan, noi_thuong_tru, chu_tren_the (chép NGUYÊN VĂN các dòng chữ in ' +
    'sẵn ở đầu thẻ, ví dụ tên nước và tên loại thẻ). ' +
    'Trường nào không đọc được thì để chuỗi rỗng.';

  try {
    /* ⚠️ Khuôn `{image, prompt}` cũ KHÔNG dùng được nữa: mô hình đời mới bỏ
       qua trường `image` mà không báo lỗi, rồi bịa ra một tấm CCCD tưởng
       tượng — HR sẽ điền sẵn một họ tên và số CCCD KHÔNG CÓ THẬT vào hồ sơ
       lao động. Đo ngày 29/08/2026, xem `khuonDocAnh()` trong tai-lieu.js. */
    const kq = await env.AI.run(MO_HINH_DOC_ANH, khuonDocAnh(anh, prompt));
    const tho = String(kq && (kq.response ?? kq.description ?? kq.text ??
                              kq.choices?.[0]?.message?.content) || '');
    const data = rutJSON(tho) || {};

    /* ---- CHỐT ① CHỐNG BỊA — gọi ĐÚNG chốt của kho tài liệu ---------------
       Mỏ neo là tên loại giấy tờ: thẻ nào cũng in "CĂN CƯỚC CÔNG DÂN". Đưa cả
       `chu_tren_the` lẫn chuỗi thô mô hình trả về vào để đối chiếu — mô hình
       hay bọc thêm chữ ngoài JSON, phần đó cũng là chữ nó "nhìn thấy". */
    const neo = docTinChu(String(data.chu_tren_the || '') + ' ' + tho, {
      cum: ['can cuoc cong dan', 'can cuoc', 'citizen identity card',
            'chung minh nhan dan', 'socialist republic of viet nam'],
      tenCum: 'dòng "CĂN CƯỚC CÔNG DÂN" in sẵn trên thẻ'
    });
    /* ⚠️ CHỖ DUY NHẤT mỏ neo còn quyền TỪ CHỐI — và nó không vứt tờ giấy nào.
       Ở đường kho tài liệu, người ta cầm giấy thật đứng chụp: vứt chữ là mất
       giấy tờ thật, nên luật mới cấm vứt (xem `docTinChu` trong tai-lieu.js).
       Ở đây KHÔNG có bản quét nào được lưu — đây là đường ĐIỀN SẴN một cái
       form. Không điền sẵn thì HR gõ tay, mất một phút; điền sẵn một họ tên và
       số CCCD KHÔNG CÓ THẬT vào hồ sơ lao động thì đó là giấy tờ sai sự thật.
       `traiMocBatBuoc` chỉ bật khi nơi gọi đưa `cum`, nên cờ này không bao giờ
       chạm tới đường kho tài liệu. */
    if (neo.traiMocBatBuoc) {
      return json({
        ok: false,
        loi_ai: 'Chữ AI đọc được không có dòng "CĂN CƯỚC CÔNG DÂN" nào — nhiều ' +
                'khả năng AI không nhìn thấy ảnh mà tự bịa. Mời điền tay.',
        thong_tin: {}, so_chua_kiem: {}
      });
    }

    /* ---- CHỐT ② SỐ CCCD LUÔN ĐỦ 12 CHỮ SỐ ---------------------------------
       Ca Hồ Ly đo được là ca nguy nhất: họ tên ĐÚNG đứng cạnh `03691004271`
       — 11 chữ số, mất đúng một chữ. Cái tên đúng làm người ta tin luôn con
       số. CCCD Việt Nam (mẫu từ 2021) LUÔN 12 chữ số; không đủ 12 thì đó KHÔNG
       phải số CCCD, dù nó trông giống. Vứt, và nói rõ vì sao.

       Luật "đủ 12 chữ số" nay nằm ở `soCCCD()` trong `src/so-ai.js` — MỘT chỗ
       khai, để đường quét giấy tờ vào hồ sơ nhân sự (CTL-0025) dùng CÙNG luật
       chứ không chép bản thứ hai. */
    const { so: soTho, dung: soDung } = soCCCD(data.so_cccd);

    /* ---- CHỐT ③ CON SỐ KHÔNG TỰ ĐIỀN VÀO Ô CHÍNH THỨC ---------------------
       Gạo chốt 29/08/2026. `thong_tin` (chữ mô tả) điền sẵn được; `so_chua_kiem`
       (số CCCD, ngày sinh) chỉ là GỢI Ý, người phải xác nhận mới vào ô. Một số
       CCCD bịa trong hồ sơ lao động không phải lỗi phần mềm — là giấy tờ sai
       sự thật. Thà bắt HR gõ tay 12 chữ số. */
    const { thongTin, soChuaKiem } = tachSoChuaKiem({
      ho_ten: String(data.ho_ten || '').trim(),
      gioi_tinh: String(data.gioi_tinh || '').trim(),
      que_quan: String(data.que_quan || '').trim(),
      noi_thuong_tru: String(data.noi_thuong_tru || '').trim(),
      so_cccd: soDung ? soTho : '',
      ngay_sinh: String(data.ngay_sinh || '').trim()
    }, ['so_cccd', 'ngay_sinh']);

    return json({
      ok: true,
      thong_tin: thongTin,
      so_chua_kiem: soChuaKiem,
      nhan_so_ai: NHAN_SO_AI,
      canh_bao_so: CAU_SO_AI,
      loi_so_cccd: soTho && !soDung
        ? `AI đọc ra "${soTho}" — ${soTho.length} chữ số, mà số CCCD luôn đủ 12. ` +
          'Đã bỏ đi, mời nhìn thẻ và gõ tay.'
        : null
    });
  } catch (e) {
    // AI lỗi thì KHÔNG chặn quy trình — báo để HR tự điền tay.
    return json({ ok: false, loi_ai: 'Không đọc được ảnh, mời điền tay: ' + (e.message || ''),
                  thong_tin: {}, so_chua_kiem: {} });
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
