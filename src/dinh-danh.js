/* ==========================================================================
   SINH MÃ (Business Code) TẬP TRUNG — xem docs/ENTITY_IDENTITY.md
   ---------------------------------------------------------------------------
   1 nơi duy nhất khai báo format mã cho mọi loại entity — không hardcode
   prefix/số chữ số rải rác từng file. Thêm loại mã mới chỉ cần thêm 1 dòng
   ở CAU_HINH_MA bên dưới.

   Mã CHỈ để nhận diện — không nhét phòng ban/năm/trạng thái vào mã (những
   thứ đó đã có field riêng lưu). Mã sinh 1 lần, không đổi, không tái sử
   dụng — kể cả khi entity ngừng hoạt động.
   ========================================================================== */

const CAU_HINH_MA = {
  // Mã nhân sự — tiền tố theo Loại lao động (Sếp chốt 22/08/2026), đếm
  // RIÊNG từng loại (01-0001, 02-0001... không dùng chung 1 dãy số).
  // Tiền tố gán 1 LẦN lúc tạo — đổi Loại lao động sau đó KHÔNG đổi mã
  // (xem docs/ENTITY_IDENTITY.md — mã bất biến, chỉ field mô tả mới đổi).
  nhan_su_toan_thoi_gian: { prefix: '01-', so_chu_so: 4 },   // 01-0001
  nhan_su_ban_thoi_gian:  { prefix: '02-', so_chu_so: 4 },   // 02-0001
  nhan_su_thoi_vu:        { prefix: '03-', so_chu_so: 4 },   // 03-0001
  // 04 = Khoán việc (SPEC-0007 Đợt 1). BẮT BUỘC phải có dòng này: mã nhân sự
  // sinh theo 'nhan_su_' + loai_lao_dong, thiếu cấu hình thì sinhMa() ném lỗi
  // và KHÔNG thêm được người khoán việc nào.
  nhan_su_khoan_viec:     { prefix: '04-', so_chu_so: 4 },   // 04-0001
  tai_san: { prefix: 'TS', so_chu_so: 4 }    // TS0001
};

/* Tăng bộ đếm và trả mã mới trong 1 câu lệnh (RETURNING) — tránh 2 người
   tạo cùng lúc bị trùng số, không cần transaction đa câu lệnh. */
export async function sinhMa(env, loai) {
  const cfg = CAU_HINH_MA[loai];
  if (!cfg) throw new Error('Chưa cấu hình mã cho loại: ' + loai);

  const r = await env.DB.prepare(`
    INSERT INTO bo_dem_ma (loai, tiep_theo) VALUES (?, 1)
    ON CONFLICT(loai) DO UPDATE SET tiep_theo = tiep_theo + 1
    RETURNING tiep_theo
  `).bind(loai).first();

  return cfg.prefix + String(r.tiep_theo).padStart(cfg.so_chu_so, '0');
}
