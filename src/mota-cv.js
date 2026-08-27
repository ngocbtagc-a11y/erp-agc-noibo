/* ==========================================================================
   MÔ TẢ CÔNG VIỆC (JD) THEO MBOs — SPEC-0007 Đợt 3
   ---------------------------------------------------------------------------
   Hiến pháp bắt OUTCOME-BASED, không activity-based. JD ở đây trả lời
   "ĐẦU RA CỤ THỂ LÀ GÌ", không trả lời "hằng ngày làm những việc gì".

   Ép bằng CẤU TRÚC chứ không bằng lời khuyên:
   · `dau_ra`  NOT NULL — thứ bàn giao được (danh từ)
   · `do_bang` NOT NULL — đo thế nào là đạt      ← chỗ ép thật sự
   Không điền được "đo bằng gì" nghĩa là câu vừa viết không phải đầu ra. Ràng
   buộc nằm ở TẦNG DỮ LIỆU nên gọi thẳng API cũng không lách được.

   Thêm một lớp CẢNH BÁO MỀM cho những mở đầu là động từ hoạt động (quản lý,
   theo dõi, hỗ trợ…). CHỈ NHẮC, KHÔNG CHẶN: tiếng Việt không đủ tin cậy để
   chặn cứng — "Quản lý kho khớp sổ ≤ 0,5%" chặn đi là chặn nhầm.

   GẮN THEO CHỨC DANH. `nhan_su_id` chỉ dùng cho phần KIÊM NHIỆM riêng.
   ========================================================================== */

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }
function chuoi(v) { const s = String(v ?? '').trim(); return s || null; }

export const NHIP_HOP_LE = ['ngay', 'tuan', 'thang', 'quy'];
export const NHOM_MAU_HOP_LE = ['kho', 'ke_toan', 'hcns', 'van_hanh_san'];

/* Những mở đầu KHÔNG phải đầu ra — đây là hoạt động. Danh sách lấy thẳng từ
   SPEC-0007 §6, không tự nghĩ thêm. So khớp sau khi hạ chữ thường và bỏ dấu
   câu đầu, để "Quản lý..." và "quản lý..." đều bắt được. */
const MO_DAU_HOAT_DONG = ['quản lý', 'theo dõi', 'hỗ trợ', 'phối hợp', 'thực hiện', 'đảm bảo'];

/** Trả về động từ hoạt động nếu `dau_ra` mở đầu bằng một trong số đó, ngược
 *  lại trả null. HÀM THUẦN — bàn thử ngoại tuyến gọi thẳng (BH-25). */
export function moDauLaHoatDong(dauRa) {
  const s = String(dauRa || '').trim().toLowerCase();
  return MO_DAU_HOAT_DONG.find(v => s.startsWith(v)) || null;
}

/** Câu nhắc hiện cho người viết. Tách riêng để giao diện và máy chủ dùng CÙNG
 *  một câu chữ — hai nơi viết hai kiểu là người dùng tưởng có hai loại lỗi. */
export function cauNhacHoatDong(dongTu) {
  return `“${dongTu}…” là một HOẠT ĐỘNG, chưa phải đầu ra. Đầu ra là thứ ` +
    `BÀN GIAO ĐƯỢC — hỏi tiếp: làm xong thì có cái gì trên tay? ` +
    `(“${dongTu} kho” → “Số liệu tồn kho khớp giữa ERP và đếm thực tế”.)`;
}

/* ---- Đọc --------------------------------------------------------------- */

/** JD của một chức danh, hoặc của một người (JD chức danh của người đó CỘNG
 *  phần kiêm nhiệm riêng). Mức 1 · nội bộ theo ADR-0011 A2 — MỌI vai trò xem
 *  được: MBOs mà giấu đầu ra của nhau thì không đối chiếu được với ai. */
export async function danhSach(env, chucDanhId, nhanSuId, keCaAn = false) {
  const cdId = chucDanhId ? parseInt(chucDanhId, 10) : null;
  const nsId = chuoi(nhanSuId);
  if (!cdId && !nsId) return loi('Cần chức danh hoặc nhân sự');

  try {
    let cd = cdId, ten = null;
    if (nsId) {
      const n = await env.DB.prepare(
        'SELECT chuc_danh_id, chuc_vu FROM nhan_su WHERE id = ?'
      ).bind(nsId).first();
      if (!n) return loi('Không tìm thấy nhân sự', 404);
      cd = n.chuc_danh_id;
      ten = n.chuc_vu;
    }
    /* Không có chức danh thì KHÔNG trả rỗng im lặng — nói thẳng lý do, không
       thì HCNS sẽ tưởng JD chưa viết trong khi thật ra người này chưa được
       gán chức danh nào (hai việc phải làm khác hẳn nhau). */
    if (!cd) return json({ mo_ta: [], chuc_danh_id: null, chua_co_chuc_danh: true, chuc_vu: ten });

    const dk = keCaAn ? '' : ' AND m.hieu_luc = 1';
    const { results } = await env.DB.prepare(`
      SELECT m.id, m.chuc_danh_id, m.nhan_su_id, m.dau_ra, m.do_bang, m.nhip,
             m.thu_tu, m.hieu_luc, m.tao_luc, n.ho_ten AS kiem_nhiem_ten
        FROM mo_ta_cong_viec m
        LEFT JOIN nhan_su n ON n.id = m.nhan_su_id
       WHERE m.chuc_danh_id = ?
         AND (m.nhan_su_id IS NULL ${nsId ? 'OR m.nhan_su_id = ?' : ''})
         ${dk}
       ORDER BY (m.nhan_su_id IS NOT NULL), m.thu_tu, m.id
       LIMIT 200
    `).bind(...(nsId ? [cd, nsId] : [cd])).all();

    const cdRow = await env.DB.prepare('SELECT ten FROM chuc_danh WHERE id = ?').bind(cd).first();
    return json({ mo_ta: results || [], chuc_danh_id: cd, chuc_danh_ten: cdRow?.ten || null });
  } catch {
    // Chưa nạp them-mota-congviec.sql — trả rỗng êm, KHÔNG làm hỏng hồ sơ.
    return json({ mo_ta: [], chuc_danh_id: null, chua_nap: true });
  }
}

/** Bộ mẫu điền sẵn. KHÔNG có mẫu thì tính năng chết ngay tuần đầu — người ta
 *  mở ô trống, không biết "đầu ra đo được" trông thế nào, rồi bỏ đó. */
export async function mau(env, nhom) {
  const n = chuoi(nhom);
  if (n && !NHOM_MAU_HOP_LE.includes(n)) return loi('Nhóm mẫu không hợp lệ');
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, nhom, dau_ra, do_bang, nhip FROM jd_mau
        ${n ? 'WHERE nhom = ?' : ''} ORDER BY nhom, thu_tu`
    ).bind(...(n ? [n] : [])).all();
    return json({ mau: results || [] });
  } catch {
    return json({ mau: [] });
  }
}

/* ---- Ghi --------------------------------------------------------------- */

async function ghiLichSu(env, nhanSuId, nguoiId, giaTriMoi, ghiChu) {
  if (!nhanSuId) return;   // JD của cả vị trí — không gắn được vào hồ sơ ai
  try {
    await env.DB.prepare(`
      INSERT INTO nhan_su_lich_su (nhan_su_id, loai_su_kien, gia_tri_moi, ghi_chu, nguoi_thuc_hien_id, luc)
      VALUES (?, 'mo_ta_cong_viec', ?, ?, ?, datetime('now','+7 hours'))
    `).bind(nhanSuId, giaTriMoi, ghiChu, nguoiId).run();
  } catch { /* chưa nạp them-nhansu-lichsu.sql — bỏ qua êm */ }
}

/** Thêm/sửa một dòng đầu ra.
 *  LUỒNG THIẾT KẾ THEO ĐÚNG CÂU 3 MỤC 13: quản lý mảng VIẾT nội dung (trên
 *  giấy/chat), HCNS NHẬP vào. Nên cửa ghi là `them_nhan_su` — cùng một cửa
 *  với hồ sơ và hợp đồng, KHÔNG mở bề mặt quyền mới, KHÔNG sửa `quyen.js`. */
export async function luu(env, phien, b) {
  const cdId = b.chuc_danh_id ? parseInt(b.chuc_danh_id, 10) : null;
  if (!cdId) return loi('Chưa chọn chức danh cho mô tả công việc này');

  const cd = await env.DB.prepare('SELECT id, ten FROM chuc_danh WHERE id = ?').bind(cdId).first();
  if (!cd) return loi('Không tìm thấy chức danh', 404);

  const dauRa = chuoi(b.dau_ra);
  if (!dauRa) return loi('Chưa ghi ĐẦU RA — đây là thứ bàn giao được, không phải việc phải làm');

  /* CHẶN CỨNG, và là chỗ ép outcome duy nhất. Thông điệp phải nói ĐƯỢC
     PHẢI LÀM GÌ, không chỉ nói "thiếu trường". */
  const doBang = chuoi(b.do_bang);
  if (!doBang) {
    return loi('Chưa ghi ĐO BẰNG GÌ. Không nói được cách đo thì đó chưa phải đầu ra — ' +
      'thử viết bằng một con số, một mốc thời gian, hoặc một điều kiện đúng/sai.');
  }

  const nhip = NHIP_HOP_LE.includes(b.nhip) ? b.nhip : 'thang';

  /* Kiêm nhiệm: chỉ nhận nếu người đó THẬT SỰ mang chức danh này. Không thì
     một dòng kiêm nhiệm sẽ treo lơ lửng ở JD của vị trí người ta không giữ. */
  let nsId = chuoi(b.nhan_su_id);
  if (nsId) {
    const n = await env.DB.prepare('SELECT id, chuc_danh_id FROM nhan_su WHERE id = ?').bind(nsId).first();
    if (!n) return loi('Không tìm thấy nhân sự cho phần kiêm nhiệm', 404);
    if (n.chuc_danh_id !== cdId) {
      return loi('Người này không giữ chức danh đó — phần kiêm nhiệm phải gắn vào đúng chức danh của họ');
    }
  }

  const suaId = b.id ? parseInt(b.id, 10) : null;
  if (suaId) {
    const cu = await env.DB.prepare('SELECT id FROM mo_ta_cong_viec WHERE id = ?').bind(suaId).first();
    if (!cu) return loi('Không tìm thấy mô tả cần sửa', 404);
  }

  /* CẢNH BÁO MỀM — trả kèm `ok`, KHÔNG chặn. Trả 200 chứ không 4xx vì lớp
     `goi()` ở api.js ném Error cho mọi mã != 2xx và chỉ đọc trường `loi`;
     trả 4xx ở đây là mất câu nhắc trên giao diện (cùng bài học Đợt 1). */
  const dongTu = moDauLaHoatDong(dauRa);
  const canhBao = dongTu ? [cauNhacHoatDong(dongTu)] : [];

  const thuTu = Number.isFinite(+b.thu_tu) ? parseInt(b.thu_tu, 10) : 0;

  if (suaId) {
    await env.DB.prepare(`
      UPDATE mo_ta_cong_viec
         SET chuc_danh_id = ?, nhan_su_id = ?, dau_ra = ?, do_bang = ?, nhip = ?, thu_tu = ?,
             sua_luc = datetime('now','+7 hours')
       WHERE id = ?
    `).bind(cdId, nsId, dauRa, doBang, nhip, thuTu, suaId).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO mo_ta_cong_viec (chuc_danh_id, nhan_su_id, dau_ra, do_bang, nhip, thu_tu, nguoi_tao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(cdId, nsId, dauRa, doBang, nhip, thuTu, phien.nhan_su_id).run();
  }

  await ghiLichSu(env, nsId, phien.nhan_su_id, `${cd.ten}: ${dauRa}`, doBang);
  return json({ ok: true, canh_bao: canhBao });
}

/** Ẩn / dùng lại. KHÔNG xoá (Rule 10): một đầu ra đã cam kết rồi thì phải
 *  còn dấu vết, không thì tháng sau không ai chứng minh được đã hứa gì. */
export async function an(env, phien, b) {
  const id = b.id ? parseInt(b.id, 10) : null;
  if (!id) return loi('Thiếu id mô tả công việc');
  const m = await env.DB.prepare(
    'SELECT id, nhan_su_id, hieu_luc, dau_ra FROM mo_ta_cong_viec WHERE id = ?'
  ).bind(id).first();
  if (!m) return loi('Không tìm thấy mô tả công việc', 404);

  const moi = m.hieu_luc ? 0 : 1;
  await env.DB.prepare('UPDATE mo_ta_cong_viec SET hieu_luc = ?, sua_luc = datetime(\'now\',\'+7 hours\') WHERE id = ?')
    .bind(moi, id).run();
  await ghiLichSu(env, m.nhan_su_id, phien.nhan_su_id,
    (moi ? 'mở lại: ' : 'ẩn: ') + m.dau_ra, chuoi(b.ly_do));
  return json({ ok: true, hieu_luc: moi });
}
