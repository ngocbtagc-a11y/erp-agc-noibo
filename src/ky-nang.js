/* ==========================================================================
   BỘ NĂNG LỰC — SPEC-0007 Đợt 4
   ---------------------------------------------------------------------------
   Tính năng dùng được cho MỌI người, nhưng KHÔNG ép nhập hàng loạt: danh mục
   chia theo nhóm, kho nhập trước vì đó là nơi có ích ngay.

   HAI MÀN HÌNH LÀ LÝ DO TỒN TẠI CỦA BẢNG NÀY (không có chúng thì đây chỉ là
   một bảng chữ chết, và sau 2 tuần không ai cập nhật):
     ① `aiLamDuoc()`  — xếp ca: ai lái được xe nâng, ai vận hành được máy
     ② `aiThayDuoc()` — nghỉ đột xuất: ai gánh được phần việc của người này
   Kèm cảnh báo ngược: `diemChet()` — kỹ năng CHỈ MỘT NGƯỜI biết. Đó là thứ
   anh Duy cần mà hôm nay chỉ nằm trong đầu anh ấy.

   CỐ Ý KHÔNG LÀM: "gợi ý người khi giao việc" — chạm `cong_viec` (Rule 13)
   và dễ trượt thành đo năng suất cá nhân (điều cấm 20 của Hiến pháp).

   AI ĐƯỢC CHẤM: quản lý trực tiếp (`nhan_su.quan_ly_id`), trưởng phòng của
   phòng ban người đó (`phong_ban.truong_phong_id`), hoặc vai trò quản lý hồ
   sơ. NHÂN VIÊN KHÔNG TỰ KHAI (Rule 9) — rác trong bảng này nghĩa là xếp
   nhầm người vào xe nâng.
   ⚠️ Kiểm quyền viết Ở ĐÂY chứ KHÔNG thêm hàm vào `src/quyen.js`: đụng file
   đó là `CORE_CHANGE`. Không thêm vai trò, không đổi bảng vai trò — chỉ đọc
   lại hai quan hệ đã có sẵn trong DB.
   ========================================================================== */

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }
function chuoi(v) { const s = String(v ?? '').trim(); return s || null; }

/* Bốn mức. Thứ tự có Ý NGHĨA — `aiThayDuoc` xếp hạng theo nó. */
export const MUC = ['biet', 'lam_duoc', 'thanh_thao', 'day_duoc'];
export const MUC_CHU = {
  biet: 'Biết', lam_duoc: 'Làm được', thanh_thao: 'Thành thạo', day_duoc: 'Dạy được người khác'
};
/** Điểm của một mức, 0 nếu không có. HÀM THUẦN — bàn thử gọi thẳng. */
export function diemMuc(m) { const i = MUC.indexOf(m); return i < 0 ? 0 : i + 1; }

/** Từ mức này trở lên thì coi là LÀM ĐƯỢC VIỆC. "Biết" KHÔNG đủ để xếp ca:
 *  biết xe nâng chạy thế nào khác hẳn tự lấy được pallet trên kệ cao. Đây là
 *  ranh giới quan trọng nhất của cả module, nên đặt tên rõ chứ không rải số
 *  2 khắp nơi. */
export const MUC_TOI_THIEU_XEP_CA = 'lam_duoc';

/* ---- Ai được chấm cho ai ----------------------------------------------- */

/** Trả { duoc, vi_tri } — `vi_tri` để ghi lại đã chấm với tư cách gì. */
export async function duocChamCho(env, phien, nhanSuId, laQuanLyHoSo) {
  if (laQuanLyHoSo) return { duoc: true, vi_tri: 'quan_ly_ho_so' };
  if (nhanSuId === phien.nhan_su_id) {
    // Tự chấm cho chính mình là đúng thứ Rule 9 cấm.
    return { duoc: false, vi_tri: null };
  }
  const n = await env.DB.prepare('SELECT quan_ly_id, phong_ban_id FROM nhan_su WHERE id = ?')
                        .bind(nhanSuId).first();
  if (!n) return { duoc: false, vi_tri: null };
  if (n.quan_ly_id && n.quan_ly_id === phien.nhan_su_id) return { duoc: true, vi_tri: 'quan_ly_truc_tiep' };
  if (n.phong_ban_id) {
    const pb = await env.DB.prepare('SELECT truong_phong_id FROM phong_ban WHERE id = ?')
                           .bind(n.phong_ban_id).first();
    if (pb && pb.truong_phong_id === phien.nhan_su_id) return { duoc: true, vi_tri: 'truong_phong' };
  }
  return { duoc: false, vi_tri: null };
}

/* ---- Danh mục ---------------------------------------------------------- */

/** Danh mục kỹ năng. KHÔNG có đường nhập tự do ở màn chấm — người chấm CHỈ
 *  chọn từ danh sách này. Đó là thứ duy nhất ngăn "Excel"/"excel"/"MS Excel". */
export async function danhMuc(env, nhom) {
  try {
    const n = chuoi(nhom);
    const { results } = await env.DB.prepare(`
      SELECT id, ten, nhom, mo_ta, an_toan, trang_thai FROM ky_nang
       WHERE hoat_dong = 1 ${n ? 'AND nhom = ?' : ''}
       ORDER BY nhom, ten
    `).bind(...(n ? [n] : [])).all();
    return json({ ky_nang: results || [], muc: MUC.map(m => ({ ma: m, chu: MUC_CHU[m] })) });
  } catch {
    return json({ ky_nang: [], muc: MUC.map(m => ({ ma: m, chu: MUC_CHU[m] })), chua_nap: true });
  }
}

/* ---- Hồ sơ năng lực của một người -------------------------------------- */

export async function cuaNguoi(env, nhanSuId) {
  const id = chuoi(nhanSuId);
  if (!id) return loi('Thiếu id nhân sự');
  try {
    const { results } = await env.DB.prepare(`
      SELECT k.id AS ky_nang_id, k.ten, k.nhom, k.mo_ta, k.an_toan,
             x.muc, x.ghi_chu, x.luc, c.ho_ten AS nguoi_cham_ten
        FROM nhan_su_ky_nang x
        JOIN ky_nang k ON k.id = x.ky_nang_id
        LEFT JOIN nhan_su c ON c.id = x.nguoi_cham_id
       WHERE x.nhan_su_id = ?
       ORDER BY k.nhom, k.ten
    `).bind(id).all();
    return json({ ky_nang: results || [] });
  } catch {
    return json({ ky_nang: [], chua_nap: true });
  }
}

/** Chấm (thêm hoặc sửa) một kỹ năng cho một người. */
export async function cham(env, phien, b, laQuanLyHoSo) {
  const nsId = chuoi(b.nhan_su_id);
  const knId = b.ky_nang_id ? parseInt(b.ky_nang_id, 10) : null;
  if (!nsId || !knId) return loi('Thiếu nhân sự hoặc kỹ năng');
  if (!MUC.includes(b.muc)) return loi('Mức chưa hợp lệ — chọn: biết / làm được / thành thạo / dạy được');

  const q = await duocChamCho(env, phien, nsId, laQuanLyHoSo);
  if (!q.duoc) {
    return loi('Chỉ quản lý trực tiếp, trưởng phòng hoặc HCNS mới xác nhận được năng lực. ' +
      'Tự khai năng lực của mình thì không ai kiểm được.', 403);
  }

  const kn = await env.DB.prepare('SELECT id, ten FROM ky_nang WHERE id = ? AND hoat_dong = 1')
                         .bind(knId).first();
  if (!kn) return loi('Kỹ năng này không có trong danh mục', 404);

  await env.DB.prepare(`
    INSERT INTO nhan_su_ky_nang (nhan_su_id, ky_nang_id, muc, ghi_chu, nguoi_cham_id, luc)
    VALUES (?, ?, ?, ?, ?, datetime('now','+7 hours'))
    ON CONFLICT(nhan_su_id, ky_nang_id) DO UPDATE SET
      muc = excluded.muc, ghi_chu = excluded.ghi_chu,
      nguoi_cham_id = excluded.nguoi_cham_id, luc = excluded.luc
  `).bind(nsId, knId, b.muc, chuoi(b.ghi_chu), phien.nhan_su_id).run();

  try {
    await env.DB.prepare(`
      INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_moi, ghi_chu, nguoi_thuc_hien_id, luc)
      VALUES (?, 'ky_nang', ?, ?, ?, datetime('now','+7 hours'))
    `).bind(nsId, `${kn.ten}: ${MUC_CHU[b.muc]}`, q.vi_tri, phien.nhan_su_id).run();
  } catch { /* chưa nạp them-nhansu-lichsu.sql — bỏ qua êm */ }

  return json({ ok: true });
}

/** Gỡ một dòng chấm. Đây KHÔNG phải dữ liệu pháp lý như hợp đồng — chấm
 *  nhầm thì phải gỡ được, giữ lại một dòng sai còn hại hơn: nó nói người này
 *  lái được xe nâng. Vẫn ghi lịch sử để biết ai gỡ. */
export async function go(env, phien, b, laQuanLyHoSo) {
  const nsId = chuoi(b.nhan_su_id);
  const knId = b.ky_nang_id ? parseInt(b.ky_nang_id, 10) : null;
  if (!nsId || !knId) return loi('Thiếu nhân sự hoặc kỹ năng');
  const q = await duocChamCho(env, phien, nsId, laQuanLyHoSo);
  if (!q.duoc) return loi('Không đủ quyền gỡ xác nhận năng lực của người này', 403);

  await env.DB.prepare('DELETE FROM nhan_su_ky_nang WHERE nhan_su_id = ? AND ky_nang_id = ?')
              .bind(nsId, knId).run();
  try {
    await env.DB.prepare(`
      INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_moi, ghi_chu, nguoi_thuc_hien_id, luc)
      VALUES (?, 'ky_nang', 'gỡ xác nhận', ?, ?, datetime('now','+7 hours'))
    `).bind(nsId, chuoi(b.ly_do), phien.nhan_su_id).run();
  } catch { /* bỏ qua êm */ }
  return json({ ok: true });
}

/* ==========================================================================
   MÀN HÌNH ① — "AI LÀM ĐƯỢC VIỆC NÀY?"  (dùng khi xếp ca)
   ---------------------------------------------------------------------------
   Chỉ người ĐANG LÀM. Mặc định lọc từ `lam_duoc` trở lên: người mới "biết"
   thì không xếp vào ca chạy xe nâng được, và đó chính là chỗ bảng này phải
   trả lời đúng hoặc không đáng tồn tại.
   ========================================================================== */
export async function aiLamDuoc(env, kyNangId, mucToiThieu) {
  const knId = kyNangId ? parseInt(kyNangId, 10) : null;
  if (!knId) return loi('Chưa chọn kỹ năng');
  const nguong = diemMuc(MUC.includes(mucToiThieu) ? mucToiThieu : MUC_TOI_THIEU_XEP_CA);

  try {
    const kn = await env.DB.prepare('SELECT id, ten, mo_ta, an_toan FROM ky_nang WHERE id = ?')
                           .bind(knId).first();
    if (!kn) return loi('Không có kỹ năng này', 404);

    const { results } = await env.DB.prepare(`
      SELECT n.id, n.ho_ten, n.chuc_vu, n.bo_phan, n.loai_lao_dong,
             x.muc, x.ghi_chu, x.luc, c.ho_ten AS nguoi_cham_ten
        FROM nhan_su_ky_nang x
        JOIN nhan_su n ON n.id = x.nhan_su_id AND n.dang_lam = 1
        LEFT JOIN nhan_su c ON c.id = x.nguoi_cham_id
       WHERE x.ky_nang_id = ?
    `).bind(knId).all();

    const ds = (results || [])
      .map(r => ({ ...r, diem: diemMuc(r.muc) }))
      .filter(r => r.diem >= nguong)
      .sort((a, b) => b.diem - a.diem || a.ho_ten.localeCompare(b.ho_ten, 'vi'));

    /* Cảnh báo tại chỗ khi chỉ còn một người: đó là điểm chết của kho, và
       lúc xếp ca là lúc duy nhất người ta thật sự để ý tới nó. */
    return json({
      ky_nang: kn, muc_toi_thieu: MUC[nguong - 1], nguoi: ds,
      diem_chet: ds.length === 1, khong_ai: ds.length === 0
    });
  } catch {
    return json({ ky_nang: null, nguoi: [], chua_nap: true });
  }
}

/* ==========================================================================
   MÀN HÌNH ② — "AI THAY ĐƯỢC NGƯỜI NÀY?"  (nghỉ đột xuất)
   ---------------------------------------------------------------------------
   Cách tính: lấy các kỹ năng người vắng đạt từ `lam_duoc` trở lên, rồi tìm
   người ĐANG LÀM khác cũng đạt từ `lam_duoc` trở lên ở từng kỹ năng đó.
   Xếp theo SỐ kỹ năng phủ được, không xếp theo tổng điểm: hôm nay việc cần
   là "ca này có chạy được không", không phải "ai giỏi hơn ai" — xếp theo
   điểm là bước đầu tiên trượt sang đo năng suất cá nhân (điều cấm 20).
   ========================================================================== */
export async function aiThayDuoc(env, nhanSuId) {
  const id = chuoi(nhanSuId);
  if (!id) return loi('Chưa chọn người vắng');

  try {
    const nguoiVang = await env.DB.prepare('SELECT id, ho_ten, chuc_vu, bo_phan FROM nhan_su WHERE id = ?')
                                  .bind(id).first();
    if (!nguoiVang) return loi('Không tìm thấy người này', 404);

    const nguong = diemMuc(MUC_TOI_THIEU_XEP_CA);

    const { results: canCo } = await env.DB.prepare(`
      SELECT k.id, k.ten, k.an_toan, x.muc
        FROM nhan_su_ky_nang x JOIN ky_nang k ON k.id = x.ky_nang_id
       WHERE x.nhan_su_id = ? AND k.hoat_dong = 1
    `).bind(id).all();

    const can = (canCo || []).filter(r => diemMuc(r.muc) >= nguong);
    if (!can.length) {
      return json({ nguoi_vang: nguoiVang, can_ky_nang: [], ung_vien: [], chua_cham: true });
    }

    const cho = can.map(() => '?').join(',');
    const { results } = await env.DB.prepare(`
      SELECT n.id, n.ho_ten, n.chuc_vu, n.bo_phan, x.ky_nang_id, x.muc
        FROM nhan_su_ky_nang x
        JOIN nhan_su n ON n.id = x.nhan_su_id AND n.dang_lam = 1 AND n.id <> ?
       WHERE x.ky_nang_id IN (${cho})
    `).bind(id, ...can.map(c => c.id)).all();

    const theoNguoi = new Map();
    for (const r of results || []) {
      if (diemMuc(r.muc) < nguong) continue;
      if (!theoNguoi.has(r.id)) {
        theoNguoi.set(r.id, { id: r.id, ho_ten: r.ho_ten, chuc_vu: r.chuc_vu, bo_phan: r.bo_phan, phu: [] });
      }
      theoNguoi.get(r.id).phu.push(r.ky_nang_id);
    }

    const ungVien = [...theoNguoi.values()]
      .map(u => ({
        ...u,
        so_phu: u.phu.length,
        thieu: can.filter(c => !u.phu.includes(c.id)).map(c => c.ten)
      }))
      .sort((a, b) => b.so_phu - a.so_phu || a.ho_ten.localeCompare(b.ho_ten, 'vi'));

    /* Kỹ năng KHÔNG ai khác gánh được — đúng phần việc sẽ đứng lại nếu người
       này nghỉ. Nói thẳng ra, đừng để người xếp ca tự suy từ bảng ứng viên. */
    const khongAiGanh = can
      .filter(c => ![...theoNguoi.values()].some(u => u.phu.includes(c.id)))
      .map(c => ({ ten: c.ten, an_toan: c.an_toan }));

    return json({
      nguoi_vang: nguoiVang,
      can_ky_nang: can.map(c => ({ id: c.id, ten: c.ten, an_toan: c.an_toan })),
      ung_vien: ungVien.slice(0, 20),
      khong_ai_ganh: khongAiGanh
    });
  } catch {
    return json({ nguoi_vang: null, ung_vien: [], chua_nap: true });
  }
}

/* ==========================================================================
   CẢNH BÁO NGƯỢC — kỹ năng CHỈ MỘT NGƯỜI biết
   ---------------------------------------------------------------------------
   Đếm theo mức `lam_duoc` trở lên, chỉ người đang làm. Đây là thứ đi vào dải
   Exception-First: điểm chết của kho, thứ hôm nay chỉ nằm trong đầu anh Duy.
   ========================================================================== */
export async function diemChet(env) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT k.id, k.ten, k.nhom, k.an_toan,
             COUNT(*) AS so_nguoi,
             MIN(n.ho_ten) AS nguoi_duy_nhat
        FROM nhan_su_ky_nang x
        JOIN ky_nang k ON k.id = x.ky_nang_id AND k.hoat_dong = 1
        JOIN nhan_su n ON n.id = x.nhan_su_id AND n.dang_lam = 1
       WHERE x.muc IN ('lam_duoc','thanh_thao','day_duoc')
       GROUP BY k.id
      HAVING COUNT(*) = 1
       ORDER BY k.an_toan DESC, k.ten
    `).all();
    return results || [];
  } catch {
    return [];   // chưa nạp them-ky-nang.sql — dải cứ im lặng
  }
}
