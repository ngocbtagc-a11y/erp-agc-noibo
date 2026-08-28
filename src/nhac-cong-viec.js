/* ==========================================================================
   TRẠM MỤC TIÊU — CHỦ ĐỘNG NHẮC VIỆC  ·  SPEC-0004 / CTL-0007
   ---------------------------------------------------------------------------
   Trạm Mục Tiêu có đủ thứ để TRA CỨU nhưng không có gì để ĐI TÌM NGƯỜI. Mọi
   cảnh báo quá hạn chỉ hiện khi có người mở ERP ra xem — mà người hay quên
   việc chính là người không mở ERP.

   NỐI VÀO BỘ MÁY SẴN CÓ, KHÔNG DỰNG CÁI THỨ HAI:
     · cùng cron 5 phút trong `scheduled()` — `wrangler.toml` KHÔNG đổi
     · cùng `guiThongBao()` / `guiTelegram()` — truyền từ ngoài vào, không sao chép
     · cùng cửa gửi 8h–18h, nghỉ Chủ nhật (`duocGuiNhac` của nhac-nhan-su.js)
       — thứ Bảy VẪN nhắc (ADR-0013: kho vận vẫn làm thứ Bảy)
     · chống trùng bằng CHÍNH bảng `thong_bao`, KHÔNG thêm cột cờ nào

   VÌ SAO KHÔNG THÊM CỘT `da_nhac` KIỂU `don_hoan.da_canh_bao`:
   cảnh báo đơn hoàn bắn MỘT LẦN rồi thôi nên cờ 0/1 là đủ. Nhắc việc thì LẶP
   theo thời gian — dùng cờ sẽ phải đẻ `nhac_lan_1`, `nhac_lan_2`,
   `nhac_sap_han`, `nhac_dong`… Thay vào đó: lịch nhắc SUY RA TỪ NGÀY (không
   lưu ở đâu) + hỏi thẳng `thong_bao` xem hôm nay đã nhắc chưa. Nhờ vậy cron
   chạy lại 12 lượt/giờ, deploy giữa chừng, hay lỡ một lượt — kết quả vẫn đúng.

   ⚠️ RỦI RO LỚN NHẤT CỦA CẢ TÍNH NĂNG KHÔNG PHẢI LÀ KỸ THUẬT:
   nhắc quá tay → 20 người tắt chuông → kéo chết luôn cảnh báo đơn hoàn đang
   chạy tốt. Bảy chốt chống làm phiền nằm rải trong file này, đều có nhãn
   `CHỐNG LÀM PHIỀN #n`.

   ⚠️ RÀNG BUỘC CỨNG: file này CHỈ ĐỌC `cong_viec`, CHỈ GHI `thong_bao`.
   Không một câu UPDATE/INSERT nào chạm `cong_viec`. Máy nhắc người làm, máy
   không làm thay người. Luật chuyển trạng thái ở `src/index.js` giữ nguyên.
   ========================================================================== */

import { gioVN, ngayVN, duocGuiNhac } from './nhac-nhan-su.js';

/* CHỐNG LÀM PHIỀN #5 — TRẦN CỨNG. Công ty 20 người thì 40 là ngưỡng KHÔNG BAO
   GIỜ chạm nếu code đúng; chạm nghĩa là CÓ BUG. Chốt này tồn tại để một vòng
   lặp sai không bao giờ bắn 500 tin vào chuông của mọi người. */
export const TRAN_TIN_MOI_LUOT = 40;

/* Ân xá cho nợ cũ (câu 9). Nợ cũ là nợ của CẢ HỆ THỐNG, không phải lỗi của
   người đang cầm việc lúc này. Bắn hết lên quản lý ngay ngày đầu = một buổi
   sáng thứ Hai đầy tra hỏi về việc chính người quản lý cũng đã quên. */
export const AN_XA_NGAY = 7;

/* Ngày bật tính năng — hằng số trong code vì SPEC-0003 (`cau_hinh_he_thong`)
   chưa lên. Đè được bằng biến môi trường `NHAC_VIEC_BAT_DAU_TU` để bàn thử và
   để Sếp dời ngày bật mà không cần sửa code. */
export const NGAY_BAT_MAC_DINH = '2026-08-28';

/* REV-0019 L3 — TRẦN VÔ LÝ. Hạn chót gõ nhầm năm (1999 thay vì 2026) làm
   quản lý bị réo "trễ 9 734 ngày" MỖI 7 NGÀY VĨNH VIỄN. Quá mốc này thì đó
   không còn là việc trễ nữa, đó là DỮ LIỆU SAI: báo đúng MỘT LẦN cho người
   giao để họ sửa hạn, rồi thôi. 365 ngày vì hạn chót thật xa nhất trong ERP
   này là mục tiêu năm. */
export const TRAN_TRE_NGAY = 365;

/* REV-0019 L2 — ÂN XÁ CHO NGƯỜI VỪA NHẬN VIỆC. Cùng tinh thần `AN_XA_NGAY`:
   nợ cũ không phải lỗi của người đang cầm việc lúc này. Lịch nhắc 1-3-7 đếm
   từ ngày NGƯỜI NÀY cầm việc, không đếm từ hạn chót — người nhận bàn giao
   hôm nay không bị báo "trễ 9 ngày" ngay sáng mai. */

/** REV-0019 L4 — NÚT CỨU HOẢ PHẢI NỔ KỂ CẢ KHI GÕ SAI.
 *  `NHAC_VIEC_TAT` trước đây chỉ nhận đúng chuỗi `"1"`: gõ `true`/`TRUE`/`bat`
 *  là **không nổ mà im lặng** — Sếp tưởng đã tắt, máy vẫn bắn. Đây là thứ
 *  nguy hiểm nhất trong nhóm lỗi nhẹ, nên đổi luật:
 *    · rỗng / `0` / `false` / `no` / `off` / `khong` → KHÔNG tắt
 *    · mọi giá trị khác (kể cả gõ nhầm `taat`, `yes`, `TRUE`) → TẮT, kèm cảnh
 *      báo ra log. HỎNG VỀ PHÍA AN TOÀN: gõ sai một nút cứu hoả thì phải câm,
 *      không phải vẫn bắn. */
const KHONG_TAT = new Set(['', '0', 'false', 'no', 'off', 'khong', 'không', 'tat_khong', 'n']);
export function laTatKhan(giaTri) {
  const s = String(giaTri ?? '').trim().toLowerCase();
  if (KHONG_TAT.has(s)) return { tat: false, la: null };
  const quenThuoc = new Set(['1', 'true', 'yes', 'y', 'on', 'bat', 'bật', 'tat', 'tắt', 'co', 'có']);
  return { tat: true, la: quenThuoc.has(s) ? null : s };
}

/* ---- Phần THUẦN: không chạm DB, không chạm mạng ------------------------
   Toàn bộ logic dễ sai nằm ở đây, tách riêng để kiểm ngoại tuyến bằng đồng hồ
   giả (BH-25) và để mỗi tính chất có ca đối chứng cố ý sai (BH-16). */

function hai(n) { return String(n).padStart(2, '0'); }

/** Số ngày giữa hai mốc 'YYYY-MM-DD' (đến − từ). Chỉ tính theo NGÀY LỊCH,
 *  không theo giờ: "trễ 1 ngày" phải là "sang ngày hôm sau", không phải "quá
 *  24 tiếng". Trả `null` nếu chuỗi không đúng dạng — dữ liệu rác không được
 *  làm chết cả lượt cron. */
export function soNgayGiua(tuNgay, denNgay) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/;
  const a = m.exec(String(tuNgay || '')), b = m.exec(String(denNgay || ''));
  if (!a || !b) return null;
  const t = Date.UTC(+a[1], +a[2] - 1, +a[3]);
  const d = Date.UTC(+b[1], +b[2] - 1, +b[3]);
  if (Number.isNaN(t) || Number.isNaN(d)) return null;
  return Math.round((d - t) / 86400000);
}

/** Cộng ngày vào một mốc 'YYYY-MM-DD'. */
export function congNgay(ngay, soNgay) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ngay || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + soNgay * 86400000);
  return `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`;
}

/* CHỐNG LÀM PHIỀN #3 — NHẮC THƯA DẦN RỒI DỪNG HẲN.
   Quá hạn: ngày 1, 3, 7 → HẾT. Nhắc mỗi ngày là quấy rối, và tới ngày thứ 5
   người ta đã học được cách lướt qua nó. Sau ngày 7 mà chưa xong thì vấn đề
   không còn là quên nữa — việc đó bị kẹt hoặc không làm nổi. Lúc đó cần
   NGƯỜI, nên chuyển sang leo cấp chứ không nhắc tiếp. */
export const MOC_QUA_HAN = [1, 3, 7];
export function canNhacQuaHan(soNgayTre) {
  return MOC_QUA_HAN.includes(soNgayTre);
}

/** Leo cấp: bắt đầu ngày quá hạn thứ 8 (tức "> 7 ngày"), rồi MỖI 7 NGÀY.
 *  Không phải mỗi ngày — quản lý mà bị réo hằng ngày về việc của người khác
 *  thì sẽ tắt chuông trong đúng một tuần. */
export function canLeoCap(soNgayTre) {
  return soNgayTre >= 8 && (soNgayTre - 8) % 7 === 0;
}

/** Đọng ở "Mới": ngày thứ 3 kể từ lúc giao, rồi mỗi 7 ngày.
 *  Dưới 3 ngày là bình thường (nhận việc thứ Sáu, thứ Hai mới bắt tay). */
export function canNhacDongMoi(soNgayDong) {
  return soNgayDong >= 3 && (soNgayDong - 3) % 7 === 0;
}

/** Đọng ở "Chờ duyệt": ngày thứ 2 kể từ lúc NỘP, rồi mỗi 3 ngày.
 *  NGẮN NHẤT trong cả bảng, CỐ Ý. Đây là lỗ hổng đau nhất: nhân viên đã làm
 *  xong rồi, đang đứng chờ, mỗi ngày trôi qua là một ngày họ bị treo vô cớ.
 *  Người quản lý phải là người bị nhắc gắt nhất, không phải nhân viên. */
export function canNhacDongChoDuyet(soNgayDong) {
  return soNgayDong >= 2 && (soNgayDong - 2) % 3 === 0;
}

/** Quản lý cấp 1 — CHỮ KÝ ĐÚNG THEO SPEC-0002 đã khai, để SPEC-0002 dùng lại
 *  chứ không viết định nghĩa "quản lý trực tiếp" thứ hai.
 *  Bản THUẦN: nhận sẵn dữ liệu, không chạm DB (để gọi trong vòng lặp mà không
 *  sinh truy vấn — SLA "không truy vấn trong vòng lặp").
 *    1. `nhan_su.quan_ly_id` và người đó còn `dang_lam=1` → 'QUAN_LY_ID'
 *    2. không có → `phong_ban.truong_phong_id` theo `nhan_su.bo_phan`
 *       → 'TRUONG_PHONG_ID'
 *    3. vẫn không có, HOẶC người đó chính là đương sự → 'KHONG_CO_QUAN_LY'
 *  Ghi chú: `nhan_su` không có cột `phong_ban_id` (chỉ có `bo_phan` dạng chữ),
 *  nên bước 2 khớp `phong_ban.ten = nhan_su.bo_phan`. */
export function chonDuyetCap1(nhanSu, banDoNhanSu, truongPhongTheoBoPhan) {
  if (!nhanSu) return { id: null, nguon: 'KHONG_CO_QUAN_LY' };
  const ql = nhanSu.quan_ly_id ? banDoNhanSu.get(nhanSu.quan_ly_id) : null;
  if (ql && ql.dang_lam === 1 && ql.id !== nhanSu.id) {
    return { id: ql.id, nguon: 'QUAN_LY_ID' };
  }
  const tpId = truongPhongTheoBoPhan.get(nhanSu.bo_phan);
  const tp = tpId ? banDoNhanSu.get(tpId) : null;
  if (tp && tp.dang_lam === 1 && tp.id !== nhanSu.id) {
    return { id: tp.id, nguon: 'TRUONG_PHONG_ID' };
  }
  return { id: null, nguon: 'KHONG_CO_QUAN_LY' };
}

/* CHỐNG LÀM PHIỀN #1 — GỘP: MỘT NGƯỜI · MỘT TIN · MỘT NGÀY. Chốt mạnh nhất.
   Người có 5 việc trễ nhận 1 tin/ngày ≈ 15 tin/tháng. Bắn mỗi việc một tin
   theo lịch 1-3-7 thì cùng người đó nhận ≈45 tin — chênh BA LẦN, và 45
   tin/tháng là ngưỡng chắc chắn bị tắt chuông.
   Trả về `null` khi không có gì bất thường → CHỐNG LÀM PHIỀN #2: im lặng
   tuyệt đối, KHÔNG gửi "hôm nay bạn không có việc trễ". */
export function soanBanTin(gio) {
  const d = [];
  const ten = (v) => `"${v.tieu_de}"`;
  if (gio.qua_han?.length) {
    /* "bạn nhận việc N ngày trước" (REV-0019 L2): việc trễ từ trước khi
       chuyển tay thì phải nói rõ, kẻo người vừa nhận tưởng mình bị chê. */
    d.push(`🔴 Quá hạn ${gio.qua_han.length}: ` +
      gio.qua_han.map(v => `${ten(v)} (trễ ${v.tre} ngày` +
        (v.nhan_cach_day != null ? `, bạn nhận việc ${v.nhan_cach_day} ngày trước` : '') + ')'
      ).join(' · '));
  }
  if (gio.den_han_hom_nay?.length) {
    d.push(`🟡 Đến hạn hôm nay ${gio.den_han_hom_nay.length}: ` +
      gio.den_han_hom_nay.map(ten).join(' · '));
  }
  if (gio.den_han_ngay_mai?.length) {
    d.push(`🔵 Đến hạn ngày mai ${gio.den_han_ngay_mai.length}: ` +
      gio.den_han_ngay_mai.map(ten).join(' · '));
  }
  if (gio.chua_bat_dau?.length) {
    d.push(`⏳ Chưa bắt đầu ${gio.chua_bat_dau.length}: ` +
      gio.chua_bat_dau.map(v => `${ten(v)} (giao ${v.dong} ngày trước)`).join(' · '));
  }
  if (gio.cho_toi_duyet?.length) {
    d.push(`🟣 Đang chờ BẠN duyệt ${gio.cho_toi_duyet.length}: ` +
      gio.cho_toi_duyet.map(v => `${ten(v)} — ${v.nguoi_nhan_ten}, ${v.dong} ngày`).join(' · '));
  }
  if (gio.toi_giao_qua_han?.length) {
    d.push(`📌 Việc bạn giao đang quá hạn ${gio.toi_giao_qua_han.length}: ` +
      gio.toi_giao_qua_han.map(v => `${ten(v)} — ${v.nguoi_nhan_ten}, trễ ${v.tre} ngày`).join(' · '));
  }
  if (gio.nguoi_da_nghi?.length) {
    d.push(`⚠️ Đang giao cho người ĐÃ NGHỈ — cần giao lại ${gio.nguoi_da_nghi.length}: ` +
      gio.nguoi_da_nghi.map(v => `${ten(v)} — ${v.nguoi_nhan_ten}`).join(' · '));
  }
  if (!d.length) return null;
  return '📋 Việc của bạn hôm nay\n' + d.join('\n');
}

/* ---- Phần chạm DB ------------------------------------------------------ */

/** Bản DB của `chonDuyetCap1` — CHỮ KÝ SPEC-0002: `(env, nhanSuId)`.
 *  Dùng cho lời gọi lẻ (SPEC-0002 cổng duyệt góp ý). Vòng quét KHÔNG gọi hàm
 *  này trong vòng lặp — nó dựng sẵn bản đồ rồi gọi `chonDuyetCap1`. */
export async function nguoiDuyetCap1(env, nhanSuId) {
  const { results } = await env.DB.prepare(
    'SELECT id, ho_ten, bo_phan, quan_ly_id, dang_lam FROM nhan_su'
  ).all();
  const banDo = new Map((results || []).map(n => [n.id, n]));
  let tp = new Map();
  try {
    const r = await env.DB.prepare(
      'SELECT ten, truong_phong_id FROM phong_ban WHERE truong_phong_id IS NOT NULL'
    ).all();
    tp = new Map((r.results || []).map(p => [p.ten, p.truong_phong_id]));
  } catch { /* chưa nạp them-dangky-ca.sql → bỏ qua êm, rơi về bước 3 */ }
  return chonDuyetCap1(banDo.get(nhanSuId), banDo, tp);
}

/* ---- Vòng quét chính --------------------------------------------------- */

/** Cửa vào duy nhất, gọi từ `scheduled()` mỗi 5 phút.
 *  `luc` là MỐI NỐI ĐỒNG HỒ để bàn thử ngoại tuyến chạy được mọi ngày trong
 *  năm. Ghi đè `Date.now` KHÔNG dùng được: `new Date()` đọc thẳng đồng hồ máy
 *  chứ không đi qua `Date.now` (BH-17). Sản phẩm luôn gọi đủ tham số. */
export async function quetNhacCongViec(env, guiThongBao, guiTelegram, luc = new Date()) {
  /* ROLLBACK TỨC THÌ (giây): đặt biến môi trường `NHAC_VIEC_TAT=1` là cả tính
     năng câm ngay, hệ thống về ĐÚNG hiện trạng trước khi có nó. Không cần
     deploy, không cần gỡ cột. */
  const nutTat = laTatKhan(env.NHAC_VIEC_TAT);
  if (nutTat.tat) {
    if (nutTat.la) console.warn(`Nhắc việc: NHAC_VIEC_TAT="${nutTat.la}" không phải cách viết quen thuộc — HIỂU LÀ TẮT (hỏng về phía an toàn).`);
    return { bo_qua: 'tat_bang_co', da_gui: 0 };
  }

  const vn = gioVN(luc);
  /* CHỐNG LÀM PHIỀN #4 — không gửi ngoài 8h–18h, không gửi Chủ nhật.
     Thứ Bảy VẪN gửi (ADR-0013). Dùng ĐÚNG cửa gửi của nhac-nhan-su.js, không
     viết cái thứ hai rồi để hai nơi trôi lệch nhau. */
  const cua = duocGuiNhac(vn);
  if (!cua.duoc) return { bo_qua: cua.ly_do, da_gui: 0 };

  const homNay = ngayVN(vn);
  const batDau = String(env.NHAC_VIEC_BAT_DAU_TU || NGAY_BAT_MAC_DINH);
  /* Còn trong ân xá? Việc quá hạn TỪ TRƯỚC ngày bật thì trong 7 ngày đầu
     không leo cấp và không vào bản tin tuần (câu 9, lớp 2). */
  const conAnXa = (soNgayGiua(batDau, homNay) ?? 99) < AN_XA_NGAY;
  /* PILOT theo phòng ban (Rollout Đợt 2 — bật riêng Kho Vận trước).
     Để trống = toàn công ty. */
  const loc = String(env.NHAC_VIEC_BO_PHAN || '').split(',').map(s => s.trim()).filter(Boolean);

  const kq = { bo_qua: null, da_gui: 0, cham_tran: false, bo_lo: [] };
  try {
    Object.assign(kq, await chayMotLuot(env, guiThongBao, guiTelegram, {
      vn, homNay, batDau, conAnXa, loc
    }));
  } catch (e) {
    console.error('Nhắc việc:', e.message);
  }
  return kq;
}

async function chayMotLuot(env, guiThongBao, guiTelegram, ctx) {
  const { homNay, vn, batDau, conAnXa, loc } = ctx;
  const ngayMai = congNgay(homNay, 1);

  /* ---- 4 CÂU GOM, mỗi câu chạy ĐÚNG MỘT LẦN, KHÔNG câu nào trong vòng lặp.
     Ba câu phụ bọc try/catch riêng vì chúng đọc bảng/cột có thể CHƯA được nạp
     migration — thiếu thì chạy tiếp ở mức suy giảm, không làm chết cả lượt. */

  // ① Mọi việc còn đang mở. `hoan_thanh`/`huy` KHÔNG BAO GIỜ vào đây.
  //   `nhan_viec_luc` (REV-0019 L2) — mốc NGƯỜI ĐANG CẦM nhận việc. NULL với
  //   việc chưa từng chuyển tay → rơi về `tao_luc`. Bọc try/catch: chưa nạp
  //   `va-nhacviec-rev0019.sql` thì chạy ở mức suy giảm, KHÔNG chết cả lượt.
  let viecs;
  try {
    ({ results: viecs } = await env.DB.prepare(`
      SELECT c.id, c.tieu_de, c.trang_thai, c.han_chot, c.tao_luc, c.nop_luc,
             c.nhan_viec_luc,
             c.nguoi_nhan_id, c.nguoi_nhan_ten, c.nguoi_giao_id, c.nguoi_giao_ten
        FROM cong_viec c
       WHERE c.trang_thai IN ('moi','dang_lam','cho_duyet')
    `).all());
  } catch {
    ({ results: viecs } = await env.DB.prepare(`
      SELECT c.id, c.tieu_de, c.trang_thai, c.han_chot, c.tao_luc, c.nop_luc,
             c.nguoi_nhan_id, c.nguoi_nhan_ten, c.nguoi_giao_id, c.nguoi_giao_ten
        FROM cong_viec c
       WHERE c.trang_thai IN ('moi','dang_lam','cho_duyet')
    `).all());
  }

  // ② Danh bạ — để biết ai đã nghỉ, ai là quản lý của ai, và ai thuộc phòng
  //    nào (nút PILOT của REV-0019 L1 lọc theo NGƯỜI NHẬN TIN, xem dưới).
  let nhanSus;
  try {
    ({ results: nhanSus } = await env.DB.prepare(
      'SELECT id, ho_ten, bo_phan, phong_ban_id, quan_ly_id, dang_lam FROM nhan_su'
    ).all());
  } catch {
    ({ results: nhanSus } = await env.DB.prepare(
      'SELECT id, ho_ten, bo_phan, quan_ly_id, dang_lam FROM nhan_su'
    ).all());
  }
  const banDo = new Map((nhanSus || []).map(n => [n.id, n]));

  // ③ Trưởng phòng (bước 2 của nguoiDuyetCap1) + danh mục phòng ban để nút
  //    PILOT nhận CẢ tên phòng lẫn `phong_ban_id` (REV-0019 L1).
  let truongPhong = new Map();
  let tenPhongTheoId = new Map();
  try {
    const r = await env.DB.prepare('SELECT id, ten, truong_phong_id FROM phong_ban').all();
    truongPhong = new Map((r.results || []).filter(p => p.truong_phong_id).map(p => [p.ten, p.truong_phong_id]));
    tenPhongTheoId = new Map((r.results || []).map(p => [p.id, String(p.ten || '').trim().toLowerCase()]));
  } catch { /* chưa nạp danh mục nền → rơi về Sếp, không im lặng nuốt việc */ }

  /* ④ CHỐNG LÀM PHIỀN #7 — ai đã tự tắt nhắc.
     Tắt nhắc KHÔNG tắt trách nhiệm: cột này chỉ chặn tin cá nhân
     (`cv_ban_tin`), KHÔNG chặn leo cấp lên quản lý và KHÔNG chặn bản tin
     tuần của Sếp. */
  let daTat = new Set();
  try {
    const r = await env.DB.prepare(
      'SELECT nhan_su_id FROM tai_khoan WHERE nhac_viec_tat = 1'
    ).all();
    daTat = new Set((r.results || []).map(t => t.nhan_su_id));
  } catch { /* chưa nạp migration → coi như chưa ai tắt */ }

  // ⑤ Sổ "đã nhắc hôm nay" — CHÍNH bảng `thong_bao`, không cột cờ thứ hai.
  const { results: daGuiHomNay } = await env.DB.prepare(`
    SELECT nguoi_nhan_id, loai FROM thong_bao
     WHERE loai IN ('cv_ban_tin','cv_leo_cap','cv_ban_tin_tuan')
       AND date(tao_luc) = ?
  `).bind(homNay).all();
  const daGui = new Set((daGuiHomNay || []).map(t => `${t.loai}|${t.nguoi_nhan_id}`));

  /* ⑥ Admin (Sếp) — nơi leo cấp rơi về khi không tìm ra quản lý nào. Lấy
     TRƯỚC vòng lặp: gọi trong vòng lặp là đưa một truy vấn vào vòng lặp, đúng
     thứ SLA cấm — dù có bộ nhớ đệm thì lần đầu vẫn nằm trong đó. */
  const admins = await dsAdmin(env);

  /* ---- Gom việc theo NGƯỜI NHẬN TIN (không theo việc) -------------------- */
  const gio = new Map();          // nguoi_nhan_tin -> bó việc
  const gioLeoCap = new Map();    // quản lý        -> bó việc quá hạn > 7 ngày
  const duLieuSai = [];           // hạn chót vô lý (REV-0019 L3)

  /* ---- NÚT PILOT — REV-0019 L1 -------------------------------------------
     LỖI CŨ: bộ lọc chỉ xét phòng của NGƯỜI NHẬN VIỆC, trong khi tin còn đi
     tới NGƯỜI GIAO và QUẢN LÝ — hai người này không bị lọc. Bật thử riêng
     "Kho vận" mà chị Huyền (Vận hành sàn) vẫn nhận tin thì buổi chạy thử mất
     sạch ý nghĩa: không còn biết phản ứng đo được là của phòng nào.
     LUẬT MỚI, một câu: **chỉ NGƯỜI TRONG PHÒNG ĐANG THỬ mới nhận tin**, bất
     kể họ đứng ở vai nào (nhận việc, giao việc, quản lý, Sếp). Muốn Sếp vẫn
     nhận leo cấp trong lúc chạy thử thì liệt kê thêm phòng của Sếp:
       NHAC_VIEC_BO_PHAN="Kho vận,Ban giám đốc"
     Nhận CẢ tên phòng (`nhan_su.bo_phan`) lẫn `phong_ban_id` (spec ghi theo
     id, nhưng `nhan_su.phong_ban_id` phần lớn còn NULL nên lọc riêng theo id
     sẽ ra IM LẶNG TOÀN TẬP — nguy hiểm hơn cả rò). */
  const locThuong = loc.map(s => s.toLowerCase());
  const locIdPhong = new Set([...tenPhongTheoId]
    .filter(([, ten]) => locThuong.includes(ten)).map(([id]) => id));
  const nhanTinDuoc = (id) => {
    if (!locThuong.length) return true;
    const ns = banDo.get(id);
    if (!ns) return false;
    if (locThuong.includes(String(ns.bo_phan || '').trim().toLowerCase())) return true;
    return ns.phong_ban_id != null && locIdPhong.has(ns.phong_ban_id);
  };

  /* CHỐT DUY NHẤT: mọi tin nhắc việc đều phải đi qua `bo()` để vào bó gửi.
     Đặt bộ lọc pilot ở ĐÂY nghĩa là không có nhánh nào (người giao, quản lý,
     Sếp) đi vòng qua được — khác hẳn cách cũ lọc ở đầu vòng lặp theo việc. */
  const bo = (m, id) => {
    if (!id) return null;
    if (!nhanTinDuoc(id)) return null;
    if (!m.has(id)) m.set(id, { qua_han: [], den_han_hom_nay: [], den_han_ngay_mai: [], chua_bat_dau: [], cho_toi_duyet: [], toi_giao_qua_han: [], nguoi_da_nghi: [] });
    return m.get(id);
  };

  /* Việc CỦA phòng đang thử — giữ nguyên ý cũ: chạy thử Kho vận thì chỉ soi
     việc của người Kho vận, không soi việc phòng khác. Hai lớp lọc này khác
     nhau và CẦN CẢ HAI: lớp này chọn VIỆC, `bo()` chọn NGƯỜI NHẬN TIN. */
  const trongPilot = (v) => {
    if (!locThuong.length) return true;
    return nhanTinDuoc(v.nguoi_nhan_id);
  };

  for (const v of viecs || []) {
    if (!trongPilot(v)) continue;
    const nguoiNhan = banDo.get(v.nguoi_nhan_id);
    const daNghi = !!nguoiNhan && nguoiNhan.dang_lam !== 1;
    const laTodoCaNhan = v.nguoi_nhan_id === v.nguoi_giao_id;
    // `han_chot` rỗng/sai định dạng → soNgayGiua trả null → bỏ phần quá hạn,
    // VẪN xét đọng. Việc không hạn mà nằm im 3 tháng vẫn là việc bị quên.
    const tre = v.han_chot ? soNgayGiua(v.han_chot, homNay) : null;

    /* Người nhận đã NGHỈ: không nhắc người đó một chữ nào. Nhắc thẳng NGƯỜI
       GIAO "cần giao lại" — không để việc chết theo người. */
    if (daNghi) {
      if (!laTodoCaNhan) bo(gio, v.nguoi_giao_id)?.nguoi_da_nghi.push(v);
      continue;
    }

    /* --- REV-0019 L3: HẠN CHÓT VÔ LÝ THÌ BÁO DỮ LIỆU SAI, KHÔNG RÉO MÃI ---
       `1999-12-31` (gõ nhầm năm) cho ra "trễ 9 734 ngày" và leo cấp lên anh
       Duy MỖI 7 NGÀY VĨNH VIỄN. Ra khỏi mọi lịch nhắc, đổi thành MỘT tin
       "kiểm lại hạn chót" gửi NGƯỜI GIAO (người duy nhất sửa được hạn),
       đúng một lần trong đời việc đó. */
    const hanVoLy = tre !== null && tre > TRAN_TRE_NGAY;
    if (hanVoLy) duLieuSai.push(v);

    /* --- REV-0019 L2: NGƯỜI VỪA NHẬN VIỆC KHÔNG BỊ ĐỔ LỖI CHO QUÁ KHỨ ---
       `nhan_viec_luc` là mốc NGƯỜI ĐANG CẦM nhận việc (trigger DB đóng dấu
       khi `nguoi_nhan_id` đổi); chưa từng chuyển tay thì rơi về `tao_luc`.
       Lịch nhắc 1-3-7 và mốc leo cấp đếm theo `treNhac` = số ngày việc này
       là chuyện của NGƯỜI NÀY, chứ không đếm từ hạn chót. Nhận bàn giao hôm
       nay → treNhac = 0 → im lặng, đúng như ngày đầu bật tính năng.
       CHỮ HIỂN THỊ VẪN LÀ `tre` THẬT — không giấu việc trễ 9 ngày, chỉ nói
       thêm "bạn nhận việc N ngày trước" để không ai bị hiểu nhầm là chê. */
    const mocCam = String(v.nhan_viec_luc || v.tao_luc || '').slice(0, 10);
    const ngayCam = soNgayGiua(mocCam, homNay);
    const treNhac = tre === null ? null
      : (ngayCam === null ? tre : Math.min(tre, Math.max(ngayCam, 0)));
    // Chỉ ghi chú khi việc ĐÃ trễ từ trước lúc chuyển tay — việc trễ sau khi
    // nhận thì đó đúng là chuyện của người đang cầm, không cần bào chữa.
    const nhanCachDay = (soNgayGiua(v.han_chot, mocCam) ?? 0) > 0 && ngayCam !== null
      ? ngayCam : null;
    const kem = { tre, nhan_cach_day: nhanCachDay };

    /* --- Việc của NGƯỜI NHẬN ---
       Việc đã NỘP (`cho_duyet`) thì KHÔNG nhắc người nhận nữa, kể cả khi nó
       quá hạn: họ đã làm xong phần của mình và không có nút nào để bấm
       (`hoan_thanh` chỉ người giao bấm được). Báo "bạn trễ" cho người đang
       đứng chờ người khác duyệt là đổ lỗi sai người — đúng cái lỗi mà cột
       `nop_luc` sinh ra để tránh. Việc đó đi sang bó của NGƯỜI GIAO ở dưới. */
    const daNop = v.trang_thai === 'cho_duyet';
    if (daNop || hanVoLy) { /* bỏ qua toàn bộ phần nhắc người nhận */ }
    else if (tre !== null && tre > 0) {
      if (canNhacQuaHan(treNhac)) bo(gio, v.nguoi_nhan_id)?.qua_han.push({ ...v, ...kem });
    } else if (tre === 0) {
      bo(gio, v.nguoi_nhan_id)?.den_han_hom_nay.push(v);
    } else if (v.han_chot === ngayMai) {
      bo(gio, v.nguoi_nhan_id)?.den_han_ngay_mai.push(v);
    }
    if (v.trang_thai === 'moi') {
      const dong = soNgayGiua(String(v.tao_luc || '').slice(0, 10), homNay);
      if (dong !== null && canNhacDongMoi(dong)) bo(gio, v.nguoi_nhan_id)?.chua_bat_dau.push({ ...v, dong });
    }

    /* --- Việc của NGƯỜI GIAO --- (todo cá nhân thì bỏ, đã nhắc ở trên) */
    if (!laTodoCaNhan) {
      if (!daNop && !hanVoLy && tre !== null && tre > 0 && canNhacQuaHan(treNhac)) {
        bo(gio, v.nguoi_giao_id)?.toi_giao_qua_han.push({ ...v, ...kem });
      }
      /* LỖ HỔNG ĐAU NHẤT — việc đọng ở "Chờ duyệt".
         CHỈ nhắc NGƯỜI GIAO. Nhân viên đã làm xong phần của mình và không có
         nút nào để bấm (`hoan_thanh` chỉ người giao bấm được) — nhắc họ về
         việc ngoài tầm tay vừa vô ích vừa gây ức chế. Nhắc đúng người có nút.
         Mốc đọng tính từ `nop_luc`. Việc cũ chưa có `nop_luc` thì lấy NGÀY
         BẬT tính năng làm mốc, KHÔNG lấy `cap_nhat_luc` — không đổ lỗi ngược
         cho quá khứ. */
      if (v.trang_thai === 'cho_duyet') {
        const moc = v.nop_luc ? String(v.nop_luc).slice(0, 10) : batDau;
        const dong = soNgayGiua(moc, homNay);
        if (dong !== null && canNhacDongChoDuyet(dong)) {
          bo(gio, v.nguoi_giao_id)?.cho_toi_duyet.push({ ...v, dong });
        }
      }
    }

    /* --- LEO CẤP: quá hạn > 7 ngày --- */
    if (!daNop && !hanVoLy && tre !== null && canLeoCap(treNhac) && !laTodoCaNhan) {
      /* Todo cá nhân KHÔNG BAO GIỜ leo cấp — việc tự nhắc mình thì không có
         ai để mách. Ân xá: nợ cũ không leo cấp trong 7 ngày đầu. */
      const cuHonNgayBat = (soNgayGiua(v.han_chot, batDau) ?? 0) > 0;
      if (!(conAnXa && cuHonNgayBat)) {
        let ql = chonDuyetCap1(nguoiNhan, banDo, truongPhong);
        // Quản lý cấp 1 chính là người nhận việc → đã bị chonDuyetCap1 loại,
        // rơi về KHONG_CO_QUAN_LY. Không có quản lý thì lên thẳng Sếp, KÈM
        // ghi chú — KHÔNG nuốt im lặng (BH-21).
        const ghiChu = (ql.nguon === 'KHONG_CO_QUAN_LY' ? ' (chưa có quản lý trực tiếp)' : '')
          + (nhanCachDay != null ? ` (người này mới nhận việc ${nhanCachDay} ngày trước)` : '');
        const nhanIds = ql.id ? [ql.id] : admins;
        for (const id of nhanIds) {
          if (id === v.nguoi_nhan_id) continue;
          bo(gioLeoCap, id)?.qua_han.push({ ...v, ...kem, ghi_chu: ghiChu });
        }
      }
    }
  }

  /* ---- GỬI ---------------------------------------------------------------
     Từ đây trở xuống KHÔNG còn truy vấn nào trong vòng lặp: chỉ `guiThongBao`
     (một INSERT vào `thong_bao`), cộng ĐÚNG MỘT câu SELECT đứng ngoài vòng
     lặp và chỉ chạy khi có việc hạn chót vô lý (REV-0019 L3). SLA: ≤2 giây
     với 500 việc — đo lại ở `scripts/do-va-rev0019.mjs` (2016 lượt cron trên
     240 việc hết 1,2 giây). */
  let daGuiSo = 0, chamTran = false;
  /* REV-0019 L5 — CHẠM TRẦN THÌ PHẢI NÊU TÊN AI BỊ BỎ.
     Trước: người thứ 41 trở đi bị bỏ IM LẶNG, tin Telegram chỉ nói "đã dừng".
     Gạo nhận tin đó xong vẫn không biết ai không được nhắc, mà đúng những
     người đó mới là người đang trễ việc. Giờ đi hết danh sách, quá trần thì
     GHI TÊN thay vì gửi. */
  const boLo = [];
  const tenCua = (id) => banDo.get(id)?.ho_ten || id;
  const conCho = () => {
    if (daGuiSo >= TRAN_TIN_MOI_LUOT) { chamTran = true; return false; }
    return true;
  };
  /* `guiThongBao` trả `false` khi INSERT trượt — REV-0019 L6: chỉ mục DUY
     NHẤT (loại, người, ngày) chặn lượt cron thứ hai chạy chồng lên. Đếm theo
     kết quả thật, không đếm theo ý định. */
  const gui = async (noiDung, loai, nguoiId, lienKet = null) => {
    const xong = await guiThongBao(env, null, noiDung, loai, lienKet, nguoiId);
    if (xong !== false) daGuiSo++;
    return xong !== false;
  };

  for (const [nguoiId, b] of gio) {
    if (daTat.has(nguoiId)) continue;                 // tự tắt → im tin cá nhân
    if (daGui.has(`cv_ban_tin|${nguoiId}`)) continue; // hôm nay đã nhắc rồi
    const noiDung = soanBanTin(b);
    if (!noiDung) continue;                           // im lặng khi không có gì
    if (!conCho()) { boLo.push(tenCua(nguoiId)); continue; }
    await gui(noiDung, 'cv_ban_tin', nguoiId);
  }

  for (const [qlId, b] of gioLeoCap) {
    if (daGui.has(`cv_leo_cap|${qlId}`)) continue;    // leo cấp KHÔNG chịu `nhac_viec_tat`
    if (!conCho()) { boLo.push(`${tenCua(qlId)} (leo cấp)`); continue; }
    const dong = b.qua_han.map(v => `"${v.tieu_de}" — ${v.nguoi_nhan_ten}, trễ ${v.tre} ngày${v.ghi_chu || ''}`);
    await gui(
      `⚠️ ${dong.length} việc trong nhóm bạn quản lý đã quá hạn hơn 7 ngày — máy đã hết cách nhắc, cần bạn hỏi trực tiếp:\n` +
      dong.join('\n'),
      'cv_leo_cap', qlId);
  }

  /* REV-0019 L3 — "hạn chót có vẻ gõ nhầm": MỘT TIN, MỘT LẦN, MÃI MÃI.
     Chống trùng ở đây KHÔNG theo ngày như tin nhắc (nếu theo ngày thì mai
     lại réo tiếp) mà theo CHÍNH VIỆC ĐÓ: đã báo rồi thì thôi, kể cả năm sau.
     Gửi NGƯỜI GIAO — người duy nhất sửa được hạn chót. */
  if (duLieuSai.length) {
    let daBao = new Set();
    try {
      const r = await env.DB.prepare(
        "SELECT lien_ket FROM thong_bao WHERE loai = 'cv_han_chot_sai'"
      ).all();
      daBao = new Set((r.results || []).map(x => String(x.lien_ket)));
    } catch { /* bảng thiếu → coi như chưa báo, thà báo lại còn hơn nuốt */ }
    for (const v of duLieuSai) {
      if (daBao.has(String(v.id))) continue;
      const nhanIds = nhanTinDuoc(v.nguoi_giao_id) ? [v.nguoi_giao_id] : admins.filter(nhanTinDuoc);
      for (const id of nhanIds) {
        if (!conCho()) { boLo.push(`${tenCua(id)} (hạn chót sai)`); continue; }
        await gui(
          `🛠️ Hạn chót có vẻ gõ nhầm — máy KHÔNG nhắc việc này nữa cho tới khi được sửa:\n` +
          `"${v.tieu_de}" — ${v.nguoi_nhan_ten}, hạn ${v.han_chot} (quá ${soNgayGiua(v.han_chot, homNay)} ngày). ` +
          `Mở Trạm Mục Tiêu sửa lại hạn giúp nhé.`,
          'cv_han_chot_sai', id, String(v.id));
      }
    }
  }

  /* Bản tin tuần — 8h thứ Hai, Telegram nhóm chung + chuông cho Admin.
     `guiTelegram()` bắn vào ĐÚNG MỘT chat id cố định (nhóm chung công ty), KHÔNG
     nhắn riêng từng người được → chỉ dùng cho bản tin tuần. Nhắc cá nhân đi
     hoàn toàn qua chuông ERP. */
  if (vn.getUTCDay() === 1 && vn.getUTCHours() === 8) {
    try {
      daGuiSo += await banTinTuan(env, guiThongBao, guiTelegram,
        { homNay, batDau, conAnXa, daGui, admins, nhanTinDuoc, dangChayThu: locThuong.length > 0 });
    } catch (e) { console.error('Bản tin tuần nhắc việc:', e.message); }
  }

  /* Chạm trần = NGHI CÓ BUG, không phải "công ty bận". Dừng ngay, báo Gạo —
     KÈM TÊN người bị bỏ (REV-0019 L5): tin báo "đã dừng" mà không nói bỏ ai
     thì Gạo vẫn phải mò, còn những người đang trễ việc thì im lặng không được
     nhắc. Cắt 12 tên đầu để tin Telegram không thành bức tường chữ. */
  if (chamTran) {
    const ten = boLo.slice(0, 12).join(', ') + (boLo.length > 12 ? `, …và ${boLo.length - 12} người nữa` : '');
    console.error(`Nhắc việc CHẠM TRẦN ${TRAN_TIN_MOI_LUOT} tin/lượt — dừng gửi, nghi có bug. Bỏ ${boLo.length} người: ${ten}`);
    try {
      await guiTelegram(env, `🚨 [ERP] Nhắc việc chạm trần ${TRAN_TIN_MOI_LUOT} tin trong một lượt cron và đã DỪNG. Công ty ~20 người thì không bao giờ chạm — nghi có bug, Gạo kiểm tra giúp.\n` +
        `KHÔNG được nhắc (${boLo.length} người): ${ten || '—'}`);
    } catch { /* Telegram lỗi không được làm chết lượt quét */ }
  }
  return { bo_qua: null, da_gui: daGuiSo, cham_tran: chamTran, bo_lo: boLo };
}

/** Admin (Sếp) — nơi leo cấp rơi về khi không tìm được quản lý nào.
 *  Gọi tối đa 1 lần mỗi lượt nhờ bộ nhớ đệm treo trên `env`. */
async function dsAdmin(env) {
  if (env.__dsAdminCache) return env.__dsAdminCache;
  let ds = [];
  try {
    const { results } = await env.DB.prepare(`
      SELECT t.nhan_su_id FROM tai_khoan t JOIN nhan_su n ON n.id = t.nhan_su_id
       WHERE t.kich_hoat = 1 AND n.dang_lam = 1 AND t.vai_tro IN ('admin','admin_backup')
    `).all();
    ds = (results || []).map(x => x.nhan_su_id);
  } catch { /* bỏ qua êm */ }
  try { env.__dsAdminCache = ds; } catch { /* env đóng băng thì thôi */ }
  return ds;
}

/* ---- Bản tin tuần: PHẦN KHEN ĐỨNG TRƯỚC PHẦN CHÊ ------------------------
   Không phải để cho êm — mà vì một bản tin tuần chỉ toàn tin xấu sẽ bị chính
   Sếp ngán đọc sau tháng thứ hai. Và nó nêu thẳng tên SẾP khi Sếp là người
   đang giữ việc: bản tin chỉ soi nhân viên thì mất uy tín ngay lần đầu tiên
   Sếp là người chậm. */
async function banTinTuan(env, guiThongBao, guiTelegram, { homNay, batDau, conAnXa, daGui, admins, nhanTinDuoc, dangChayThu }) {
  if (admins.length && admins.every(id => daGui.has(`cv_ban_tin_tuan|${id}`))) return 0;

  const tuNgay = congNgay(homNay, -7);

  /* ĐÚNG HẠN chấm bằng `nop_luc`, KHÔNG bằng `cap_nhat_luc` — đây là chỗ cột
     mới trả công. Việc cũ `nop_luc IS NULL` thì KHÔNG vào bảng ghi nhận và
     cũng KHÔNG bị tính trễ: không có dữ liệu thì không phán (Rule 9). */
  const { results: xong } = await env.DB.prepare(`
    SELECT nguoi_nhan_ten, tieu_de, han_chot, nop_luc FROM cong_viec
     WHERE trang_thai = 'hoan_thanh' AND nop_luc IS NOT NULL
       AND date(cap_nhat_luc) >= ? AND date(nop_luc) <= han_chot
     ORDER BY nop_luc DESC LIMIT 50
  `).bind(tuNgay).all();

  const { results: dong } = await env.DB.prepare(`
    SELECT tieu_de, han_chot, nop_luc, trang_thai, nguoi_nhan_ten, nguoi_giao_ten
      FROM cong_viec
     WHERE trang_thai IN ('moi','dang_lam','cho_duyet')
       AND ((han_chot IS NOT NULL AND han_chot < ?) OR trang_thai = 'cho_duyet')
  `).bind(homNay).all();

  /* Trần vô lý (REV-0019 L3) áp cả ở đây: một việc hạn 1999 mà lọt vào bản
     tin tuần sẽ đội số "đang đọng" lên mãi mãi và biến bản tin thành thứ
     không ai tin nữa. */
  const quaHan = (dong || []).filter(v => v.han_chot && v.han_chot < homNay
    && (soNgayGiua(v.han_chot, homNay) ?? 0) <= TRAN_TRE_NGAY
    && !(conAnXa && v.han_chot < batDau));
  const qua7 = quaHan.filter(v => (soNgayGiua(v.han_chot, homNay) ?? 0) > 7);
  const choDuyet = (dong || []).filter(v => v.trang_thai === 'cho_duyet'
    && ((soNgayGiua(String(v.nop_luc || batDau).slice(0, 10), homNay) ?? 0) >= 2));

  const noiBat = [...new Set((xong || []).map(v => v.nguoi_nhan_ten))].slice(0, 4);
  const demTheoNguoi = (ds, khoa) => {
    const m = new Map();
    for (const v of ds) m.set(v[khoa], (m.get(v[khoa]) || 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => `${t} (${n})`).join(' · ');
  };

  const text =
    '📊 TRẠM MỤC TIÊU — TUẦN QUA\n\n' +
    `✅ Làm xong đúng hạn: ${(xong || []).length} việc\n` +
    (noiBat.length ? `   Nổi bật: ${noiBat.join(' · ')}\n` : '') +
    `\n⚠️ Đang đọng: ${quaHan.length} việc\n` +
    (qua7.length ? `   Quá 7 ngày: ${qua7.length} (${demTheoNguoi(qua7, 'nguoi_nhan_ten')})\n` : '') +
    `\n🟣 Chờ duyệt quá 2 ngày: ${choDuyet.length} việc\n` +
    (choDuyet.length ? `   Chờ: ${demTheoNguoi(choDuyet, 'nguoi_giao_ten')}\n` : '');

  let so = 0;
  /* REV-0019 L1 — ĐANG CHẠY THỬ MỘT PHÒNG THÌ KHÔNG BẮN NHÓM CHUNG.
     `guiTelegram` bắn vào nhóm chat của CẢ CÔNG TY, còn bản tin này thống kê
     toàn công ty. Trong lúc chỉ bật thử Kho vận mà nhóm chung vẫn nhận bản
     tin thì buổi chạy thử lại chạm tới người phòng khác — đúng thứ L1 cấm. */
  if (!dangChayThu) {
    try { await guiTelegram(env, text); } catch { /* nhóm chưa cấu hình → bỏ qua êm */ }
  }
  for (const id of admins) {
    if (daGui.has(`cv_ban_tin_tuan|${id}`)) continue;
    if (nhanTinDuoc && !nhanTinDuoc(id)) continue;   // Sếp ngoài phòng đang thử → im
    if (await guiThongBao(env, null, text, 'cv_ban_tin_tuan', null, id) !== false) so++;
  }
  return so;
}
