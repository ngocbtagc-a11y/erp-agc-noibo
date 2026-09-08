/* ==========================================================================
   NHẮC VIỆC NHÂN SỰ — SPEC-0007 Đợt 2 (sinh nhật)
   ---------------------------------------------------------------------------
   KHÔNG dựng cơ chế nhắc thứ hai (CTL-0015 §5). Mọi thứ ở đây nối vào đúng
   bộ máy SPEC-0004 đã chốt:

     · cùng `scheduled()` mỗi 5 phút đang có, không thêm cron trigger
     · cùng `guiThongBao()` — truyền từ ngoài vào để KHÔNG sao chép hàm
     · khung 8h–18h giờ VN, KHÔNG gửi Chủ nhật (ADR-0013: thứ Bảy VẪN làm)
     · chống trùng bằng CHÍNH bảng `thong_bao` — không thêm cột cờ nào

   HAI thứ được gửi, khác hẳn nhau:
   ① `ns_sinhnhat`       — đúng ngày, gửi chính chủ + quản lý trực tiếp
   ② `ns_sinhnhat_thang` — bản tin "sinh nhật tháng sau", 1 lần/tháng

   VÌ SAO KHÔNG VIẾT CỨNG "NGÀY 30" (CTL-0015 §3.2 — bẫy Sếp yêu cầu):
   tháng 2 không bao giờ có ngày 30, nên danh sách sinh nhật THÁNG 3 sẽ KHÔNG
   BAO GIỜ được báo. Cũng không dùng "ngày cuối tháng": rơi vào Chủ nhật ~1/7
   số tháng → ADR-0013 cấm gửi → mất trắng tháng đó. Dùng CỬA SỔ 5 NGÀY CUỐI
   THÁNG rồi bắn ở ngày đầu tiên đủ điều kiện → đúng 1 lần/tháng, MỌI tháng.

   BẪY 29/02: `strftime('%m-%d')` của người sinh 29/02 chỉ khớp vào năm nhuận
   → 4 năm mới được chúc một lần. Xử ở `mmddCanChucHomNay()`.
   ========================================================================== */

/* ---- Phần THUẦN: không chạm DB, không chạm mạng ------------------------
   Tách riêng để kiểm được ngoại tuyến bằng đồng hồ giả (BH-25) — đây là chỗ
   chứa toàn bộ logic dễ sai, và cũng là chỗ BH-16 đòi ca đối chứng. */

/** Giờ Việt Nam của một mốc UTC. Trả về Date mà các hàm getUTC* đọc ra chính
 *  là số của đồng hồ VN — KHÔNG dùng getHours()/getDay() thường trên nó, vì
 *  Worker chạy ở UTC còn máy dev thì không, hai nơi ra hai kết quả. */
export function gioVN(luc = new Date()) {
  return new Date(luc.getTime() + 7 * 3600 * 1000);
}

export function laNamNhuan(nam) {
  return (nam % 4 === 0 && nam % 100 !== 0) || nam % 400 === 0;
}

export function soNgayTrongThang(nam, thang /* 1-12 */) {
  return [31, laNamNhuan(nam) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][thang - 1];
}

function hai(n) { return String(n).padStart(2, '0'); }

/** 'YYYY-MM-DD' của giờ VN. */
export function ngayVN(vn) {
  return `${vn.getUTCFullYear()}-${hai(vn.getUTCMonth() + 1)}-${hai(vn.getUTCDate())}`;
}
/** 'YYYY-MM' của giờ VN — khoá chống trùng theo THÁNG DƯƠNG LỊCH. */
export function thangVN(vn) {
  return `${vn.getUTCFullYear()}-${hai(vn.getUTCMonth() + 1)}`;
}

/** Cửa gửi chung của mọi lời nhắc (SPEC-0004 · ADR-0013).
 *  Chủ nhật là ngày nghỉ DUY NHẤT — thứ Bảy vẫn làm, vẫn nhắc. */
export function duocGuiNhac(vn) {
  if (vn.getUTCDay() === 0) return { duoc: false, ly_do: 'chu_nhat' };
  const gio = vn.getUTCHours();
  if (gio < 8 || gio >= 18) return { duoc: false, ly_do: 'ngoai_khung_gio' };
  return { duoc: true, ly_do: null };
}

/** Hôm nay có nằm trong 5 NGÀY CUỐI THÁNG không?
 *  Tháng 31 ngày → 27,28,29,30,31 · tháng 2 (28 ngày) → 24,25,26,27,28.
 *  Mọi tháng đều có đủ 5 ngày này, nên không tháng nào bị bỏ sót. */
export function trongCuaSoCuoiThang(vn, soNgayCuaSo = 5) {
  const soNgay = soNgayTrongThang(vn.getUTCFullYear(), vn.getUTCMonth() + 1);
  return vn.getUTCDate() > soNgay - soNgayCuaSo;
}

/** Tháng kế tiếp của mốc đang xét — trả { nam, thang, mm }. */
export function thangKeTiep(vn) {
  const thang = vn.getUTCMonth() + 2;          // +1 sang tháng sau, +1 vì getUTCMonth 0-based
  const nam = vn.getUTCFullYear() + (thang > 12 ? 1 : 0);
  const t = thang > 12 ? thang - 12 : thang;
  return { nam, thang: t, mm: hai(t) };
}

/** Những 'MM-DD' được coi là "sinh nhật HÔM NAY".
 *  Bình thường đúng một giá trị. Riêng ngày 28/02 của năm KHÔNG nhuận thì
 *  nhận thêm '02-29': người sinh 29/02 phải được chúc HÀNG NĂM, không phải
 *  4 năm một lần (SPEC-0007 §1.3). Ngày 29/02 của năm nhuận vẫn tự khớp. */
export function mmddCanChucHomNay(vn) {
  const mm = hai(vn.getUTCMonth() + 1), dd = hai(vn.getUTCDate());
  const ds = [`${mm}-${dd}`];
  if (mm === '02' && dd === '28' && !laNamNhuan(vn.getUTCFullYear())) ds.push('02-29');
  return ds;
}

/* ---- Phần chạm DB ------------------------------------------------------ */

/** Đã có tin loại này gửi cho người này TRONG NGÀY chưa?
 *  `thong_bao.tao_luc` vốn đã ghi bằng giờ VN nên `date()` là ngày VN. */
async function daGuiTrongNgay(env, loai, nguoiNhanId, ngay) {
  const r = await env.DB.prepare(
    `SELECT 1 AS co FROM thong_bao
      WHERE loai = ? AND nguoi_nhan_id = ? AND date(tao_luc) = ? LIMIT 1`
  ).bind(loai, nguoiNhanId, ngay).first();
  return !!r;
}

/** Đã có tin loại này TRONG THÁNG DƯƠNG LỊCH chưa? Không hỏi người nhận —
 *  bản tin tháng là một LƯỢT, một dòng bất kỳ trong tháng là bằng chứng lượt
 *  đó đã chạy. Nhờ vậy cron chạy lại, deploy giữa chừng, hay lỡ một lượt đều
 *  không sinh ra lượt gửi thứ hai. */
async function daGuiTrongThang(env, loai, thang) {
  const r = await env.DB.prepare(
    `SELECT 1 AS co FROM thong_bao
      WHERE loai = ? AND strftime('%Y-%m', tao_luc) = ? LIMIT 1`
  ).bind(loai, thang).first();
  return !!r;
}

/** Nhân sự nhận vai trò HCNS. Lấy từ `tai_khoan.vai_tro` chứ KHÔNG bịa vai
 *  trò mới (CTL-0015 §4.C.2) và KHÔNG đụng `src/quyen.js`.
 *  Không có ai mang vai trò `hcns` thì rơi về Admin — nếu không, tính năng
 *  sẽ IM LẶNG TUYỆT ĐỐI mà không ai biết (BH-21). */
/* Xuất ra để bàn đo do-tach-vai-tro.mjs gọi được thẳng (ca đối chứng DC-H:
   soi mỗi ô 1 thì chị Vũ Lan Hương mất hết tin nhắc mà im lặng tuyệt đối). */
export async function nguoiNhanHCNS(env) {
  /* HAI Ô (Sếp chốt 04/09/2026): sau migration them-vi-tri-cong-viec.sql thì
     `hcns` là một VỊ TRÍ (ô 2), không còn nằm ở cột `vai_tro`. Soi mỗi ô 1 là
     chị Vũ Lan Hương không nhận được MỘT tin nhắc nhân sự nào nữa, mà lại im
     lặng tuyệt đối — đúng bẫy BH-21 câu chú thích trên vừa nhắc. Soi CẢ HAI.
     Cột ô 2 có thể chưa nạp: thiếu thì lùi về đúng câu cũ, không ném lỗi. */
  const cau = (coViTri) => `
    SELECT t.nhan_su_id, t.vai_tro,
           ${coViTri ? 't.vi_tri_cong_viec' : "'' AS vi_tri_cong_viec"}
      FROM tai_khoan t
      JOIN nhan_su n ON n.id = t.nhan_su_id
     WHERE t.kich_hoat = 1 AND n.dang_lam = 1
       AND (t.vai_tro IN ('hcns', 'admin', 'admin_backup')
            ${coViTri ? "OR t.vi_tri_cong_viec = 'hcns'" : ''})
  `;
  let results;
  try {
    ({ results } = await env.DB.prepare(cau(true)).all());
  } catch (e) {
    if (!/no such column/i.test(String(e && e.message))) throw e;
    ({ results } = await env.DB.prepare(cau(false)).all());
  }
  const ds = results || [];
  const laHcns = (x) => x.vai_tro === 'hcns' || x.vi_tri_cong_viec === 'hcns';
  const hcns = ds.filter(laHcns).map(x => x.nhan_su_id);
  return hcns.length ? hcns : ds.map(x => x.nhan_su_id);
}

/* ---- ① Lời chúc đúng ngày sinh nhật ------------------------------------ */

async function quetChucSinhNhat(env, guiThongBao, vn) {
  const mmdd = mmddCanChucHomNay(vn);
  const homNay = ngayVN(vn);
  const cho = mmdd.map(() => '?').join(',');

  /* `dang_lam = 1` là ĐIỀU KIỆN CỨNG: chúc mừng sinh nhật một người đã nghỉ
     việc là lỗi rất mất mặt (CTL-0015 §4.C.5).
     `cong_khai_sinh_nhat` đọc bằng COALESCE trên một cột có thể CHƯA tồn tại
     → bọc try/catch ở nơi gọi, chưa nạp migration thì bỏ qua êm. */
  const { results } = await env.DB.prepare(`
    SELECT n.id, n.ho_ten, n.chuc_vu, n.quan_ly_id, q.ho_ten AS quan_ly_ten
      FROM nhan_su n
      LEFT JOIN nhan_su q ON q.id = n.quan_ly_id AND q.dang_lam = 1
     WHERE n.dang_lam = 1
       AND n.ngay_sinh IS NOT NULL
       AND COALESCE(n.cong_khai_sinh_nhat, 1) = 1
       AND strftime('%m-%d', n.ngay_sinh) IN (${cho})
  `).bind(...mmdd).all();

  const ds = results || [];
  if (!ds.length) return 0;

  let daGui = 0;

  // Chính chủ — mỗi người tối đa 1 tin/ngày.
  for (const n of ds) {
    if (await daGuiTrongNgay(env, 'ns_sinhnhat', n.id, homNay)) continue;
    await guiThongBao(env, null,
      `🎂 Chúc mừng sinh nhật ${n.ho_ten}! Chúc bạn một tuổi mới thật nhiều sức khoẻ và niềm vui. — Alpha Green Commerce`,
      'ns_sinhnhat', null, n.id);
    daGui++;
  }

  /* Quản lý trực tiếp — GỘP theo người nhận, không mỗi nhân viên một tin
     (SPEC-0004 chốt 1: một người nhận MỘT tin/ngày cho mọi việc nhân sự).
     Loại `loai='ns_sinhnhat_ql'` riêng để tin của quản lý không bị chống
     trùng nhầm với tin của chính chủ khi quản lý cũng có sinh nhật hôm nay. */
  const theoQuanLy = new Map();
  for (const n of ds) {
    if (!n.quan_ly_id || !n.quan_ly_ten) continue;   // không có QL, hoặc QL đã nghỉ
    if (n.quan_ly_id === n.id) continue;             // tự quản lý mình — đã nhận tin trên
    if (!theoQuanLy.has(n.quan_ly_id)) theoQuanLy.set(n.quan_ly_id, []);
    theoQuanLy.get(n.quan_ly_id).push(n);
  }
  for (const [qlId, nhom] of theoQuanLy) {
    if (await daGuiTrongNgay(env, 'ns_sinhnhat_ql', qlId, homNay)) continue;
    const ten = nhom.map(x => x.ho_ten + (x.chuc_vu ? ` (${x.chuc_vu})` : '')).join(', ');
    await guiThongBao(env, null,
      `🎂 Hôm nay là sinh nhật ${ten} — người bạn quản lý trực tiếp. ` +
      `Một câu chúc nói trực tiếp đáng giá hơn mọi thông báo tự động.`,
      'ns_sinhnhat_ql', null, qlId);
    daGui++;
  }
  return daGui;
}

/* ---- ② Bản tin "sinh nhật tháng sau" ----------------------------------- */

async function quetBanTinThangSau(env, guiThongBao, vn) {
  if (!trongCuaSoCuoiThang(vn)) return 0;
  const thangNay = thangVN(vn);
  /* REV-0010 ISSUE-2 — MỖI ĐƯỜNG GỬI MỘT CỘT MỐC RIÊNG.
     Trước đây cả hai đường (HCNS và quản lý trực tiếp) cùng soi một cột mốc
     `ns_sinhnhat_thang` — cột mốc đó chỉ được ghi khi CÓ người nhận HCNS.
     Không tài khoản nào đang kích hoạt mang `hcns`/`admin`/`admin_backup` và
     còn `dang_lam = 1` ⇒ cột mốc không bao giờ ghi, còn bản tin cho quản lý
     VẪN gửi lại mỗi lượt cron: 5 phút/lượt, khung 8h–18h, cửa sổ 5 ngày ⇒ tối
     đa ~600 tin đổ vào máy anh Duy. Tách đôi thì đường này hỏng không kéo
     đường kia hỏng theo. */
  const xongHCNS = await daGuiTrongThang(env, 'ns_sinhnhat_thang', thangNay);
  const xongQL   = await daGuiTrongThang(env, 'ns_sinhnhat_thang_ql', thangNay);
  if (xongHCNS && xongQL) return 0;

  const { nam, thang, mm } = thangKeTiep(vn);

  const { results } = await env.DB.prepare(`
    SELECT n.id, n.ho_ten, n.chuc_vu, n.bo_phan, n.ngay_sinh, n.quan_ly_id,
           COALESCE(n.cong_khai_sinh_nhat, 1) AS cong_khai
      FROM nhan_su n
     WHERE n.dang_lam = 1
       AND n.ngay_sinh IS NOT NULL
       AND strftime('%m', n.ngay_sinh) = ?
     ORDER BY strftime('%d', n.ngay_sinh), n.ho_ten
  `).bind(mm).all();

  const ds = results || [];
  if (!ds.length) return 0;

  /* Người sinh 29/02 mà tháng sau là tháng 2 của năm KHÔNG nhuận: nói thẳng
     ra ngày sẽ chúc, để HCNS không đi tìm một ngày không tồn tại. */
  const nhuan = laNamNhuan(nam);
  const dong = (n) => {
    const d = String(n.ngay_sinh).slice(8, 10);
    const ghi = (mm === '02' && d === '29' && !nhuan) ? ' → năm nay chúc ngày 28/02' : '';
    return `${d}/${mm} · ${n.ho_ten}${n.bo_phan ? ' (' + n.bo_phan + ')' : ''}${ghi}`;
  };

  let daGui = 0;

  /* HCNS: danh sách ĐẦY ĐỦ, KHÔNG chịu công tắc riêng tư — đây là dữ liệu
     vận hành để bao quát cả tháng, mà HCNS vốn đã xem được hồ sơ (SPEC-0007
     §5). Bản tin chỉ nêu NGÀY/THÁNG, không nêu năm sinh, nên vẫn không lộ
     tuổi của người đã tắt công tắc. */
  if (!xongHCNS) for (const id of await nguoiNhanHCNS(env)) {
    await guiThongBao(env, null,
      `📅 Sinh nhật tháng ${thang}/${nam} — ${ds.length} người:\n` + ds.map(dong).join('\n'),
      'ns_sinhnhat_thang', null, id);
    daGui++;
  }

  /* Quản lý trực tiếp: CHỈ người trong nhóm mình, và CÓ chịu công tắc riêng
     tư — quản lý không có quyền xem hồ sơ như HCNS, nên ai đã tắt thì không
     xuất hiện. Đây là ADR-0011 A2 (xem được bản ghi VÀ đủ mức nhạy cảm) áp
     nguyên xi, KHÔNG đẻ luật quyền thứ hai. */
  const theoQuanLy = new Map();
  if (!xongQL) for (const n of ds) {
    if (!n.quan_ly_id || n.quan_ly_id === n.id || !n.cong_khai) continue;
    if (!theoQuanLy.has(n.quan_ly_id)) theoQuanLy.set(n.quan_ly_id, []);
    theoQuanLy.get(n.quan_ly_id).push(n);
  }
  for (const [qlId, nhom] of theoQuanLy) {
    await guiThongBao(env, null,
      `📅 Tháng ${thang}/${nam} có sinh nhật của người bạn quản lý trực tiếp:\n` +
      nhom.map(dong).join('\n'),
      'ns_sinhnhat_thang_ql', null, qlId);
    daGui++;
  }
  return daGui;
}

/* ---- Cửa vào duy nhất, gọi từ scheduled() ------------------------------ */

/** Gọi mỗi lượt cron 5 phút. Tự đóng cửa ngoài khung giờ / Chủ nhật, tự
 *  chống trùng — nơi gọi KHÔNG phải biết gì về lịch.
 *  `guiThongBao` truyền từ `src/index.js` vào để dùng ĐÚNG hàm đang chạy,
 *  không sao chép ra bản thứ hai rồi trôi lệch nhau.
 *  `luc` là MỐI NỐI ĐỒNG HỒ để bàn thử ngoại tuyến chạy được mọi ngày trong
 *  năm mà không đợi tới ngày đó. Ghi đè `Date.now` KHÔNG dùng được: `new
 *  Date()` đọc thẳng đồng hồ máy, không đi qua `Date.now` (BH-17 — bàn thử
 *  đầu tiên ở đây đo nhầm đúng vì lý do này). Sản phẩm luôn gọi 2 tham số. */
export async function quetNhacNhanSu(env, guiThongBao, luc = new Date()) {
  const vn = gioVN(luc);
  const cua = duocGuiNhac(vn);
  if (!cua.duoc) return { bo_qua: cua.ly_do, da_gui: 0 };

  let daGui = 0;
  try { daGui += await quetChucSinhNhat(env, guiThongBao, vn); }
  catch (e) { console.error('Nhắc sinh nhật:', e.message); }
  try { daGui += await quetBanTinThangSau(env, guiThongBao, vn); }
  catch (e) { console.error('Bản tin sinh nhật tháng sau:', e.message); }
  return { bo_qua: null, da_gui: daGui };
}
