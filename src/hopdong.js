/* ==========================================================================
   HỢP ĐỒNG LAO ĐỘNG — SPEC-0007 Đợt 1
   ---------------------------------------------------------------------------
   Một người có NHIỀU hợp đồng nối tiếp. Thứ luật đòi là "hợp đồng thứ mấy":
   BLLĐ 2019 Đ.20 — hợp đồng XÁC ĐỊNH THỜI HẠN tối đa 36 tháng, chỉ ký được
   2 lần liên tiếp; lần thứ 3 phải là KHÔNG xác định thời hạn. Quá 30 ngày
   không ký lại thì luật TỰ coi là không xác định thời hạn (không đảo ngược).

   Nguyên tắc: CHẶN MỀM, không chặn cứng. Hệ thống không được tự cho mình
   quyền phủ quyết một văn bản Sếp đã ký ngoài đời — việc của nó là không để
   ai vi phạm mà KHÔNG BIẾT. Bắt gõ lý do là đủ, và lý do đó vào
   `nhan_su_lich_su` làm bằng chứng.

   Ngoại lệ chặn CỨNG duy nhất: `xac_dinh_th` mà trống ngày hết hạn — đó
   không phải "Sếp quyết khác", đó là thiếu dữ liệu, lưu vào là hỏng số liệu.
   ========================================================================== */

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }
function chuoi(v) { const s = String(v ?? '').trim(); return s || null; }

export const LOAI_HD_HOP_LE = ['thu_viec', 'xac_dinh_th', 'khong_xac_dinh_th', 'khoan_viec'];

/* YYYY-MM-DD — không nhận định dạng khác, tránh lọt "31/12/2026" rồi so sánh
   chuỗi ra kết quả sai ở mọi truy vấn hạn hợp đồng sau này. */
function ngay(v) {
  const s = chuoi(v);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/* Số tháng giữa 2 mốc — chỉ để cảnh báo mốc 36 tháng, không dùng tính lương
   nên xấp xỉ theo tháng dương lịch là đủ và ổn định (không lệ thuộc số ngày
   trong tháng). */
function soThang(tu, den) {
  const [ny, nm, nd] = tu.split('-').map(Number);
  const [dy, dm, dd] = den.split('-').map(Number);
  return (dy - ny) * 12 + (dm - nm) + (dd >= nd ? 0 : -1);
}

/* Số NGÀY giữa 2 mốc — dùng cho mốc đứt quãng 30 ngày. Chỗ này phải đúng
   từng ngày nên tính bằng mốc UTC, không xấp xỉ theo tháng như `soThang`. */
function mocNgay(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function soNgay(tu, den) {
  return Math.round((mocNgay(den) - mocNgay(tu)) / 86400000);
}

/* Danh sách hợp đồng của 1 người — mới nhất trước. Kể cả bản đã ẩn
   (hieu_luc = 0) vì đây là hồ sơ pháp lý: ẩn là để khỏi tính, không phải
   để giấu (Rule 10 — không xoá). */
export async function danhSach(env, nhanSuId) {
  const id = chuoi(nhanSuId);
  if (!id) return loi('Thiếu id nhân sự');
  try {
    const { results } = await env.DB.prepare(`
      SELECT h.id, h.loai, h.so_hd, h.phap_nhan, h.ngay_bat_dau, h.ngay_het_han,
             h.lan_thu, h.hieu_luc, h.ly_do_an, h.tao_luc,
             n.ho_ten AS nguoi_tao_ten
        FROM hop_dong_lao_dong h
        LEFT JOIN nhan_su n ON n.id = h.nguoi_tao_id
       WHERE h.nhan_su_id = ?
       ORDER BY h.ngay_bat_dau DESC, h.id DESC
       LIMIT 100
    `).bind(id).all();
    return json({ hop_dong: results || [] });
  } catch {
    return json({ hop_dong: [] });   // chưa nạp them-hopdong-laodong.sql
  }
}

/* ==========================================================================
   `lan_thu` — "đây là hợp đồng xác định thời hạn thứ mấy LIÊN TIẾP"
   ---------------------------------------------------------------------------
   QUY TẮC (sửa ISSUE-2 · REV-0009). Bản cũ dùng `COUNT(*)` nên sai 2 chỗ có
   thật: nhập bù hợp đồng cũ SAU hợp đồng mới, và người nghỉ hẳn rồi quay lại.

   1. Chỉ đếm `xac_dinh_th` còn `hieu_luc = 1`. Thử việc / không xác định thời
      hạn / khoán việc không nằm trong giới hạn 2 lần của BLLĐ 2019 Đ.20.
   2. XẾP THEO NGÀY BẮT ĐẦU, không theo thứ tự nhập. Nhập bù hợp đồng 2023 sau
      khi đã nhập 2024–2026 thì nó phải ra lần 1, và 2024/2025/2026 phải được
      TÍNH LẠI thành 2/3/4 — chứ không phải hai dòng cùng ghi "lần 3".
   3. ĐỨT QUÃNG > 30 NGÀY thì chuỗi RESET về 1. Căn cứ: BLLĐ 2019 Đ.20 k.2b —
      hết hạn mà quá 30 ngày không ký lại thì hợp đồng cũ TỰ trở thành không
      xác định thời hạn, chuỗi "ký liên tiếp có thời hạn" đã đứt ở đó. Người
      nghỉ 5 năm quay lại ký mới là lần 1, không phải lần 3.
      Mốc so: `ngay_het_han` của bản trước → `ngay_bat_dau` của bản sau
      (bản trước trống hạn thì lấy `ngay_bat_dau` — không xảy ra với
      `xac_dinh_th` vì đã chặn cứng, chỉ để không vỡ nếu dữ liệu cũ bẩn).
      Chồng lấn ngày (số ngày âm) vẫn coi là liên tiếp.
   4. `lan_thu` KHÔNG còn là ảnh chụp lúc lưu: mọi lần thêm/sửa/ẩn/dùng lại
      đều `tinhLaiLanThu` cho TOÀN BỘ hợp đồng của người đó.
   ========================================================================== */
const DUT_QUANG_NGAY = 30;

/* Nhận danh sách {id, ngay_bat_dau, ngay_het_han}, trả về đúng danh sách đó
   đã xếp theo ngày và gắn thêm `lan_thu_moi`. Thuần hàm — không chạm DB, để
   dựng ca kiểm chứng được. */
function xepChuoiLanThu(ds) {
  const khoaId = h => (h.id == null ? Number.MAX_SAFE_INTEGER : Number(h.id));
  const sap = ds.slice().sort((a, b) =>
    a.ngay_bat_dau < b.ngay_bat_dau ? -1 :
    a.ngay_bat_dau > b.ngay_bat_dau ? 1 :
    khoaId(a) - khoaId(b));

  let dem = 0, truoc = null;
  for (const h of sap) {
    if (!truoc) {
      dem = 1;
    } else {
      const ketTruoc = truoc.ngay_het_han || truoc.ngay_bat_dau;
      dem = soNgay(ketTruoc, h.ngay_bat_dau) > DUT_QUANG_NGAY ? 1 : dem + 1;
    }
    h.lan_thu_moi = dem;
    truoc = h;
  }
  return sap;
}

async function dsXacDinhTh(env, nhanSuId, boQuaId) {
  const { results } = await env.DB.prepare(`
    SELECT id, so_hd, ngay_bat_dau, ngay_het_han, lan_thu FROM hop_dong_lao_dong
     WHERE nhan_su_id = ? AND loai = 'xac_dinh_th' AND hieu_luc = 1
       AND (? IS NULL OR id <> ?)
  `).bind(nhanSuId, boQuaId, boQuaId).all();
  return results || [];
}

/* Lần thứ mấy của BẢN ĐANG LƯU — bản này chưa có (hoặc chưa cập nhật) trong
   DB nên ghép vào danh sách trong bộ nhớ rồi mới xếp chuỗi. */
async function tinhLanThu(env, nhanSuId, loai, boQuaId, batDau, hetHan) {
  if (loai !== 'xac_dinh_th') return 1;
  const ds = await dsXacDinhTh(env, nhanSuId, boQuaId);
  const dangLuu = { id: boQuaId ?? null, ngay_bat_dau: batDau, ngay_het_han: hetHan, dang_luu: true };
  ds.push(dangLuu);
  xepChuoiLanThu(ds);
  return dangLuu.lan_thu_moi;
}

/* Tính lại `lan_thu` cho TOÀN BỘ hợp đồng của một người. Gọi sau mọi
   thêm/sửa/ẩn — nếu không thì ẩn bản lần 1 xong các bản sau vẫn ghi 2, 3,
   tức bảng hiển thị mâu thuẫn với chính quy tắc của nó.

   TRẢ VỀ danh sách các bản BỊ ĐẨY LÊN lần ≥ 3 do lượt này (N-5 · REV-0013).
   Đánh số lại mà không bật lại cảnh báo Đ.20 là nửa vời: nhập bù một hợp đồng
   cũ có thể đẩy một bản ĐÃ LƯU lên "lần 3" — tức vi phạm giới hạn 2 lần —
   trong khi `canhBao` của `luu()` chỉ soi đúng bản đang lưu. Người nhập phải
   được báo về CẢ những bản khác vừa đổi số. */
async function tinhLaiLanThu(env, nhanSuId) {
  const dayLen3 = [];
  try {
    const ds = await dsXacDinhTh(env, nhanSuId, null);
    for (const h of xepChuoiLanThu(ds)) {
      if (h.lan_thu !== h.lan_thu_moi) {
        await env.DB.prepare('UPDATE hop_dong_lao_dong SET lan_thu = ? WHERE id = ?')
          .bind(h.lan_thu_moi, h.id).run();
        if (h.lan_thu_moi >= 3) dayLen3.push(h);
      }
    }
  } catch { /* chưa nạp them-hopdong-laodong.sql — bỏ qua êm */ }
  return dayLen3;
}

/* Câu chữ cảnh báo cho các bản bị đánh số lại lên lần ≥ 3. */
function canhBaoDayLen3(ds) {
  return (ds || []).map(h =>
    `Hợp đồng ${h.so_hd ? '"' + h.so_hd + '"' : 'bắt đầu ' + h.ngay_bat_dau} vừa được ` +
    `đánh số lại thành lần thứ ${h.lan_thu_moi} (trước là lần ${h.lan_thu || '?'}). ` +
    `BLLĐ 2019 Đ.20: từ lần thứ 3 phải ký không xác định thời hạn — bản này cần rà lại.`);
}

async function ghiLichSu(env, nhanSuId, nguoiId, giaTriMoi, ghiChu) {
  try {
    await env.DB.prepare(`
      INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_moi, ghi_chu, nguoi_thuc_hien_id, luc)
      VALUES (?, 'hop_dong', ?, ?, ?, datetime('now','+7 hours'))
    `).bind(nhanSuId, giaTriMoi, ghiChu, nguoiId).run();
  } catch { /* chưa nạp them-nhansu-lichsu.sql — bỏ qua êm, không chặn lưu */ }
}

/* Thêm mới hoặc sửa 1 hợp đồng.
   Trả về { cảnh báo } kèm ok — giao diện hiện lại cho người nhập thấy vì sao
   bản này bị đánh dấu, chứ không im lặng. */
export async function luu(env, phien, b) {
  const nhanSuId = chuoi(b.nhan_su_id);
  if (!nhanSuId) return loi('Thiếu id nhân sự');

  const ns = await env.DB.prepare('SELECT id, ho_ten FROM nhan_su WHERE id = ?').bind(nhanSuId).first();
  if (!ns) return loi('Không tìm thấy nhân sự', 404);

  const loaiHd = chuoi(b.loai);
  if (!LOAI_HD_HOP_LE.includes(loaiHd)) return loi('Chưa chọn loại hợp đồng');

  const batDau = ngay(b.ngay_bat_dau);
  if (!batDau) return loi('Ngày bắt đầu chưa đúng (cần dạng ngày/tháng/năm)');

  let hetHan = ngay(b.ngay_het_han);
  // Không xác định thời hạn thì KHÔNG có ngày hết hạn — nhận vào cũng bỏ,
  // để không sinh ra dòng tự mâu thuẫn với chính loại hợp đồng của nó.
  if (loaiHd === 'khong_xac_dinh_th') hetHan = null;

  // Chặn CỨNG (thiếu dữ liệu, không phải bất đồng nghiệp vụ)
  if (loaiHd === 'xac_dinh_th' && !hetHan) {
    return loi('Hợp đồng xác định thời hạn thì bắt buộc phải có ngày hết hạn');
  }
  if (hetHan && hetHan <= batDau) {
    return loi('Ngày hết hạn phải sau ngày bắt đầu');
  }

  const suaId = b.id ? parseInt(b.id, 10) : null;
  if (suaId) {
    const cu = await env.DB.prepare('SELECT id FROM hop_dong_lao_dong WHERE id = ? AND nhan_su_id = ?')
      .bind(suaId, nhanSuId).first();
    if (!cu) return loi('Không tìm thấy hợp đồng cần sửa', 404);
  }

  const lanThu = await tinhLanThu(env, nhanSuId, loaiHd, suaId, batDau, hetHan);

  // Chặn MỀM — vẫn lưu được, nhưng phải gõ lý do, và lý do vào lịch sử.
  const canhBao = [];
  if (loaiHd === 'xac_dinh_th' && lanThu >= 3) {
    canhBao.push('Đây là hợp đồng xác định thời hạn lần thứ ' + lanThu +
      ' với người này. BLLĐ 2019 Đ.20: từ lần thứ 3 phải ký không xác định thời hạn.');
  }
  if (loaiHd === 'xac_dinh_th' && hetHan && soThang(batDau, hetHan) > 36) {
    canhBao.push('Thời hạn dài hơn 36 tháng — BLLĐ 2019 Đ.20 giới hạn tối đa 36 tháng một lần ký.');
  }

  // Trả 200 chứ không phải lỗi: đây KHÔNG phải hỏng, đây là "cần Sếp xác nhận
  // bằng một dòng lý do". Lớp `goi()` ở api.js ném Error cho mọi mã != 2xx và
  // chỉ đọc trường `loi` — trả 4xx ở đây là mất sạch danh sách cảnh báo trên
  // giao diện. Nơi gọi kiểm `can_ly_do` TRƯỚC khi kiểm `ok`.
  const lyDo = chuoi(b.ly_do);
  if (canhBao.length && !lyDo) {
    return json({ can_ly_do: true, canh_bao: canhBao });
  }

  if (suaId) {
    await env.DB.prepare(`
      UPDATE hop_dong_lao_dong
         SET loai = ?, so_hd = ?, phap_nhan = ?, ngay_bat_dau = ?, ngay_het_han = ?, lan_thu = ?
       WHERE id = ? AND nhan_su_id = ?
    `).bind(loaiHd, chuoi(b.so_hd), chuoi(b.phap_nhan), batDau, hetHan, lanThu, suaId, nhanSuId).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO hop_dong_lao_dong
        (nhan_su_id, loai, so_hd, phap_nhan, ngay_bat_dau, ngay_het_han, lan_thu, nguoi_tao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(nhanSuId, loaiHd, chuoi(b.so_hd), chuoi(b.phap_nhan), batDau, hetHan, lanThu,
      phien.nhan_su_id).run();
  }

  // Bản vừa lưu có thể chen vào GIỮA chuỗi (nhập bù) — các bản sau nó phải
  // được đánh số lại, nếu không thì hai dòng cùng ghi "lần 3".
  const canhBaoKhac = canhBaoDayLen3(await tinhLaiLanThu(env, nhanSuId));

  await ghiLichSu(env, nhanSuId, phien.nhan_su_id,
    `${loaiHd}${hetHan ? ' · hết hạn ' + hetHan : ''}${lanThu > 1 ? ' · lần ' + lanThu : ''}`,
    [canhBao.join(' '), canhBaoKhac.join(' '), lyDo].filter(Boolean).join(' — ') || null);

  return json({ ok: true, canh_bao: canhBao, canh_bao_khac: canhBaoKhac, lan_thu: lanThu });
}

/* Ẩn (hieu_luc = 0) — KHÔNG xoá. Hợp đồng nhập nhầm vẫn phải để lại dấu vết:
   nó đã từng được dùng để tính `lan_thu` cho những bản sau. */
export async function an(env, phien, b) {
  const id = b.id ? parseInt(b.id, 10) : null;
  if (!id) return loi('Thiếu id hợp đồng');
  const lyDo = chuoi(b.ly_do);
  if (!lyDo) return loi('Cần ghi lý do ẩn hợp đồng này');

  const hd = await env.DB.prepare('SELECT id, nhan_su_id, hieu_luc FROM hop_dong_lao_dong WHERE id = ?')
    .bind(id).first();
  if (!hd) return loi('Không tìm thấy hợp đồng', 404);

  const moi = hd.hieu_luc ? 0 : 1;
  await env.DB.prepare('UPDATE hop_dong_lao_dong SET hieu_luc = ?, ly_do_an = ? WHERE id = ?')
    .bind(moi, moi ? null : lyDo, id).run();

  // Ẩn/dùng lại là ĐỔI CHUỖI — bản lần 1 bị ẩn thì bản sau phải tụt xuống 1,
  // không được giữ nguyên con số đã chụp lúc lưu. Dùng lại một bản cũ có thể
  // đẩy bản sau lên lần 3 ⇒ cũng phải bật cảnh báo Đ.20 (N-5).
  const canhBaoKhac = canhBaoDayLen3(await tinhLaiLanThu(env, hd.nhan_su_id));

  await ghiLichSu(env, hd.nhan_su_id, phien.nhan_su_id,
    moi ? 'hop_dong_mo_lai' : 'hop_dong_an',
    [lyDo, canhBaoKhac.join(' ')].filter(Boolean).join(' — '));

  return json({ ok: true, hieu_luc: moi, canh_bao_khac: canhBaoKhac });
}
