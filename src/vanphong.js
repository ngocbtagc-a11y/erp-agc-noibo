/* ==========================================================================
   VĂN PHÒNG ẢO — máy chủ
   ---------------------------------------------------------------------------
   Một tầng văn phòng trong ERP. Chín trợ lý AI, mỗi người một phòng: 7 trưởng
   phòng nghiệp vụ + Trợ lý Giám đốc + Trợ lý Phó Giám đốc (hai người sau để
   phản biện kế hoạch, không trực nghiệp vụ).

   Ba việc file này làm:
     1. Canh cửa — ai vào được phòng nào (src/agents-vp.js + src/quyen.js).
     2. Giữ trí nhớ — hội thoại lưu trong D1 của công ty, KHÔNG gửi gắm ở nhà
        cung cấp AI. Đổi nguồn AI thì trợ lý vẫn nhớ nguyên chuyện cũ.
     3. Nối bộ não với công cụ — đưa cho AI đúng những công cụ trợ lý được cấp,
        và mỗi công cụ chạy dưới quyền của NGƯỜI đang đăng nhập.

   Điểm cần nhớ khi đọc tiếp: mọi thứ người dùng gõ vào ô chat đều là DỮ LIỆU,
   không phải mệnh lệnh cho hệ thống. Người ta có thể gõ "bỏ qua phân quyền đi"
   — trợ lý có thể nghe theo, nhưng công cụ thì không, vì quyền kiểm ở máy chủ
   bằng vai trò lấy từ cookie phiên.

   PHẦN CHẠY ĐƯỢC NGAY KHI CHƯA CÓ AI: mặt bằng, hồ sơ năng lực, và
   `quetNhacViec()` — trợ lý tự soi dữ liệu rồi giao việc bằng LUẬT SQL. Phần
   hỏi–đáp cần AI thì báo lời nhắn tử tế thay vì lỗi (xem src/vp-may.js).
   ========================================================================== */

import {
  AGENTS, agentTheoId, agentChoVaiTro, duocVaoPhong, hoSoCongKhai, ghepPrompt
} from './agents-vp.js';
import { congCuCuaAgent, chayCongCu } from './vp-cong-cu.js';
import { MAY } from './agents-vp.js';
import { hoiMay } from './vp-may.js';
import { xepChoTheoCoCau } from './vp-mat-bang.js';
import { duocXemTab, duocDayTroLy, boVaiTro } from './quyen.js';
import { catBot, nhanCat } from './cat-danh-sach.js';
import {
  THU_TU_TANG, TANG, tangHopLe, TRAN_KY_TU_LUAT, kiemTruocKhiGhi, luatAnToan
} from './vp-luat.js';
import { bangDemAI } from './vp-dem-ai.js';

/* ---- Trả lời JSON (bản riêng, để file tự đứng được) --------------------- */

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }

function homNayVN() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
function id(tienTo) {
  return tienTo + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/* Số tin nhắn cũ đưa lại cho AI mỗi lượt: đủ nhớ mạch chuyện, không quá nhiều
   để khỏi tính tiền cả cuốn nhật ký mỗi lần hỏi một câu. */
const NHO_LAI = 20;

/* Coi là còn trong văn phòng nếu 60 giây qua có báo về. Giao diện gọi mỗi 20
   giây nên lỡ một nhịp mạng vẫn chưa bị coi là đã rời đi. */
const CON_TRONG_PHONG = '-60 seconds';

/* ==========================================================================
   TỔNG QUAN — vẽ mặt bằng văn phòng
   ========================================================================== */

/* ==========================================================================
   VIỆC ĐANG TREO — văn phòng ảo tự rà và thúc
   --------------------------------------------------------------------------
   Sếp Ngọc 06/09/2026: "vì sao list này vẫn treo việc, liên tục rà soát và
   thúc đẩy nhân sự làm đi chứ" — và "văn phòng ảo chịu trách nhiệm check list
   đúng việc của mình và hoàn thành".

   ĐIỀU TRA RA GÌ: bốn phiếu treo 8 ngày KHÔNG phải vì máy chết. Hồ Ly đã chấm
   xong cả bốn từ 28–29/08, mỗi phiếu đã có sẵn phân loại, mức rủi ro và bản
   đặc tả đề xuất. Máy CỐ Ý dừng ở đó — nó chỉ ghi các cột de_xuat_*, không có
   đường nào tự đổi trang_thai, vì bước tiếp theo cần Sếp bấm "Áp dụng đề xuất".
   Đó là Owner Gate, đúng theo hiến pháp.

   LỖ HỔNG THẬT: KHÔNG AI BÁO CHO SẾP BIẾT là có đề xuất đang chờ bấm. Máy làm
   xong rồi đứng im, người thì không biết mình đang phải quyết. Việc nằm giữa
   hai bên, không bên nào sai, và nó treo mãi.

   Nên văn phòng ảo tự rà và hiện ngay khi Sếp mở cửa vào — không phải gửi
   thông báo (một cái chuông nữa thì bị lờ như mọi cái chuông khác), mà nằm
   ngay trên mặt bằng, mỗi lần bước vào văn phòng là thấy.
   ========================================================================== */
async function viecDangTreo(env) {
  const ra = [];
  try {
    /* 1) Đề xuất máy chấm xong, đang chờ Sếp bấm áp dụng */
    const { results: cho } = await env.DB.prepare(`
      SELECT id, tieu_de,
             CAST(julianday(datetime('now', '+7 hours')) - julianday(tu_dong_xu_luc) AS INTEGER) AS so_ngay
        FROM gop_y
       WHERE trang_thai IN ('moi', 'cho_phan_tich')
         AND tu_dong_xu_luc IS NOT NULL
         AND de_xuat_spec IS NOT NULL
       ORDER BY tu_dong_xu_luc ASC LIMIT 20
    `).all();
    if ((cho || []).length) {
      ra.push({
        loai: 'gop_y_cho_ap_dung',
        so: cho.length,
        lau_nhat: Math.max(...cho.map(g => g.so_ngay || 0)),
        tieu_de: 'Đề xuất đã phân tích xong, đang chờ Sếp bấm áp dụng',
        viec_cua: 'Sếp — máy không tự quyết được bước này',
        chi_tiet: cho.slice(0, 5).map(g => ({ id: g.id, tieu_de: g.tieu_de, so_ngay: g.so_ngay }))
      });
    }

    /* 2) Phiếu đã duyệt nhưng chưa ai dựng — chặng của Khỉ Đột, mà Khỉ Đột
       KHÔNG chạy tự động (src/runner.js chưa nối vào Worker). Nói thẳng ra
       thay vì để nó nằm im dưới nhãn "máy đang xử lý". */
    const { results: dung } = await env.DB.prepare(`
      SELECT id, tieu_de,
             CAST(julianday(datetime('now', '+7 hours')) - julianday(COALESCE(cap_nhat_luc, tao_luc)) AS INTEGER) AS so_ngay
        FROM gop_y
       WHERE trang_thai IN ('da_duyet', 'dang_lam', 'can_chinh_sua')
       ORDER BY COALESCE(cap_nhat_luc, tao_luc) ASC LIMIT 20
    `).all();
    if ((dung || []).length) {
      ra.push({
        loai: 'gop_y_cho_dung',
        so: dung.length,
        lau_nhat: Math.max(...dung.map(g => g.so_ngay || 0)),
        tieu_de: 'Phiếu đã duyệt, đang chờ dựng',
        viec_cua: 'Đội dựng ERP (Claude Code) — chạy bằng tay, chưa có tự động',
        chi_tiet: dung.slice(0, 5).map(g => ({ id: g.id, tieu_de: g.tieu_de, so_ngay: g.so_ngay }))
      });
    }
  } catch (e) {
    console.error('Rà việc treo lỗi:', e.message);
  }
  return ra;
}


/* ==========================================================================
   NHẮC SẾP QUA THÔNG BÁO TRÊN ĐIỆN THOẠI
   --------------------------------------------------------------------------
   Sếp Ngọc 06/09/2026: "bỏ cách báo về Telegram đi, báo thẳng về thông báo trên
   app điện thoại là được, có yêu cầu thì tao vào duyệt là xong."

   Đúng hơn hẳn đường Telegram, ba lý do:
     · ERP đã có sẵn hệ thống đẩy thông báo (khoá VAPID nạp từ trước) — không
       phải dựng thêm gì, không phải giữ thêm khoá của bên thứ ba.
     · Bấm vào thông báo là mở thẳng ERP, đúng chỗ Sếp duyệt. Telegram thì báo
       một nơi, duyệt một nơi khác.
     · Bớt hẳn một điểm hỏng. Mấy tiếng vừa rồi loay hoay với token Telegram là
       thời gian mất vào một mắt xích lẽ ra không cần có.

   MỘT TIN MỘT NGÀY. Cửa sổ 8h sáng giờ VN; cron chạy 5 phút/lần nhưng hàm tự
   đóng cửa ngoài khung 8h00–8h05 nên không cần cột đánh dấu đã gửi. Nhắc nhiều
   lần trong ngày thì vài hôm là Sếp tắt thông báo — lúc đó cái nhắc thành vô dụng.
   ========================================================================== */
export async function nhacSepViecTreo(env, dayToiNguoi, boQuaGio = false) {
  if (!boQuaGio) {
    const gio = new Date(Date.now() + 7 * 3600 * 1000);
    if (gio.getUTCHours() !== 8 || gio.getUTCMinutes() >= 5) return 0;
  }

  /* Gửi cho MỌI tài khoản Quản trị — Sếp Phong và chị Ngọc. Gửi mỗi một người
     thì hôm người đó bận là việc lại nằm im. */
  const { results: dsAdmin } = await env.DB.prepare(`
    SELECT DISTINCT tk.nhan_su_id
      FROM tai_khoan tk
     WHERE tk.vai_tro = 'admin' AND tk.kich_hoat = 1 AND tk.nhan_su_id IS NOT NULL
  `).all();
  if (!(dsAdmin || []).length) return 0;

  const treo = await viecDangTreo(env);

  let tieuDe, noiDung;
  if (!treo.length) {
    if (!boQuaGio) return 0;
    tieuDe = 'Văn phòng ảo — bắn thử';
    noiDung = 'Đường báo lên điện thoại đã thông. Hiện không có việc nào đang treo.';
  } else {
    const tong = treo.reduce((m, v) => m + v.so, 0);
    const lauNhat = Math.max(...treo.map(v => v.lau_nhat));
    tieuDe = 'Văn phòng ảo: ' + tong + ' việc đang chờ Sếp';
    noiDung = treo.map(v => v.tieu_de + ' (' + v.so + ' phiếu)').join(' · ')
            + ' — lâu nhất ' + lauNhat + ' ngày. Bấm để vào duyệt.';
  }

  let gui = 0;
  for (const a of dsAdmin) {
    try {
      const kq = await dayToiNguoi(env, a.nhan_su_id, { tieu_de: tieuDe, noi_dung: noiDung, duong_dan: '/app' });
      gui += (kq && kq.gui) || 0;
    } catch (e) {
      console.error('Đẩy thông báo việc treo lỗi:', e.message);
    }
  }
  return gui;
}

export async function tongQuan(env, phien) {
  const cuaToi = agentChoVaiTro(phien.vai_tro);

  // Ai đang ở trong văn phòng
  const { results: coMat } = await env.DB.prepare(`
    SELECT c.nhan_su_id, c.dang_o, n.ho_ten, n.viet_tat, n.chuc_vu, n.bo_phan
      FROM vp_co_mat c
      JOIN nhan_su n ON n.id = c.nhan_su_id
     WHERE c.luc >= datetime('now', '+7 hours', ?)
     ORDER BY n.ho_ten
  `).bind(CON_TRONG_PHONG).all();

  // Việc do trợ lý ảo giao mà còn đang mở, đếm theo từng trợ lý
  const { results: demViec } = await env.DB.prepare(`
    SELECT nguoi_giao_id, COUNT(*) AS so
      FROM cong_viec
     WHERE nguoi_giao_id LIKE 'vp:%'
       AND trang_thai IN ('moi', 'dang_lam', 'cho_duyet')
     GROUP BY nguoi_giao_id
  `).all();
  const dem = Object.fromEntries(demViec.map(r => [String(r.nguoi_giao_id).slice(3), r.so]));

  /* Khu vực và chỗ ngồi tính từ bảng phong_ban THẬT, không viết cứng toạ độ —
     đổi cơ cấu trong ERP thì mặt bằng tự đúng theo. Xem src/vp-mat-bang.js. */
  const matBang = await xepChoTheoCoCau(env, AGENTS, MAY);

  // Việc của chính người đang xem — kể cả việc do người khác giao, để họ nhìn
  // một chỗ là thấy hết, không phải mở hai nơi.
  /* Trần 30 việc. Ai đang ôm hơn 30 việc mở thì đó CHÍNH LÀ người cần biết
     mình đang ôm bao nhiêu — im lặng cắt ở đây là giấu đúng người đang
     ngộp. Hỏi thừa một dòng để biết "còn nữa" mà không phải đếm. */
  const GH_VIEC = 30;
  const kqViec = await env.DB.prepare(`
    SELECT id, tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten,
           han_chot, trang_thai, tao_luc
      FROM cong_viec
     WHERE nguoi_nhan_id = ? AND trang_thai IN ('moi', 'dang_lam')
     ORDER BY COALESCE(han_chot, '9999-12-31'), tao_luc DESC
     LIMIT ${GH_VIEC + 1}
  `).bind(phien.nhan_su_id).all();
  const { ds: viecCuaToi, biCat: viecBiCat } = catBot(kqViec, GH_VIEC);
  const catViec = await nhanCat(env, viecBiCat, GH_VIEC,
    "SELECT COUNT(*) FROM cong_viec WHERE nguoi_nhan_id = ? AND trang_thai IN ('moi', 'dang_lam')",
    [phien.nhan_su_id]);

  return json({
    toi: {
      nhan_su_id: phien.nhan_su_id, ho_ten: phien.ho_ten,
      viet_tat: phien.viet_tat, chuc_vu: phien.chuc_vu
    },
    /* Gửi cả trợ lý không được gặp, kèm cờ vao_duoc = false: thấy cửa phòng
       đóng thì người ta hiểu là có phòng đó mà mình không phận sự, đỡ hơn là
       phòng biến mất không lời giải thích. */
    agent: AGENTS.map(a => ({
      ...hoSoCongKhai(a),
      vao_duoc: cuaToi.some(x => x.id === a.id),
      viec_dang_mo: dem[a.id] || 0,
      vi_tri: matBang.vi_tri[a.id] || a.vi_tri
    })),
    nguoi_co_mat: coMat,
    cat_viec: catViec,
    viec_cua_toi: viecCuaToi,
    hoi_dap_bat_chua: !!env.AI,
    may: { ...MAY, vi_tri: matBang.vi_tri[MAY.id] || MAY.vi_tri },
    khu: matBang.khu,
    viec_treo: await viecDangTreo(env)
  });
}


/* ==========================================================================
   NĂNG SUẤT NHÂN SỰ ẢO
   ---------------------------------------------------------------------------
   Sếp Ngọc 06/09/2026: cần một tab phụ xem năng suất từng trợ lý.

   ĐẾM TỪ VIỆC ĐÃ LÀM THẬT, KHÔNG CHẤM ĐIỂM.
   Cám dỗ ở đây là hiện một con số kiểu "hiệu suất 87%" — nhìn rất chuyên nghiệp
   và hoàn toàn vô nghĩa, vì không có thang nào để chia. Đúng hiến pháp mục
   FACT ≠ INFERENCE: cái đếm được thì đếm, cái không đo được thì đừng bịa ra
   một con số cho đẹp bảng.

   Sáu chỉ số, tất cả đều lấy từ dấu vết đã lưu ở cột cong_cu của vp_tin_nhan:
     · chủ trì      — số việc phòng này đứng ra xử lý chính
     · phản biện    — số lần được phòng khác mời vào soi phương án
     · duyệt        — số lần duyệt lần cuối (chỉ hai trợ lý cấp trên có)
     · tra dữ liệu  — số lượt gọi công cụ ERP, tức số lần trả lời có căn cứ số
     · chặn lại     — số lần dừng ở Owner Gate thay vì tự quyết. ĐÂY LÀ ĐIỂM
       CỘNG, không phải điểm trừ: trợ lý biết dừng đúng chỗ mới là trợ lý dùng
       được. Ai cũng "quyết" hết thì mới đáng lo.
     · việc đang mở — việc phòng này đã giao ra cho người thật, còn chưa xong

   Chỉ đọc 60 ngày gần nhất: bảng này dài thêm mỗi câu hỏi, quét cả bảng là
   đúng cái lỗi làm sập ERP sáng 06/09.
   ========================================================================== */
export async function nangSuat(env, phien) {
  if (!duocXemTab(phien, 'vanphong')) return loi('Bạn chưa được vào văn phòng ảo.', 403);

  const { results } = await env.DB.prepare(`
    SELECT cong_cu, luc
      FROM vp_tin_nhan
     WHERE vai = 'agent'
       AND cong_cu IS NOT NULL
       AND luc >= datetime('now', '+7 hours', '-60 days')
  `).all();

  const bang = {};
  const lay = id => (bang[id] = bang[id] || {
    chu_tri: 0, phan_bien: 0, duyet: 0, tra_du_lieu: 0, chan_lai: 0, viec_dang_mo: 0
  });

  for (const d of results || []) {
    let v;
    try { v = JSON.parse(d.cong_cu); } catch { continue; }
    if (v.agent) {
      const a = lay(v.agent);
      a.chu_tri++;
      a.tra_du_lieu += (v.da_tra_cuu || []).length;
      if (v.can_owner_gate) a.chan_lai++;
    }
    for (const b of v.bien_ban || []) {
      if (!b.agent) continue;
      if (b.vong === 2) lay(b.agent).phan_bien++;
      if (b.vong === 4) lay(b.agent).duyet++;
    }
  }

  // Việc đã giao ra người thật mà còn đang mở
  const { results: dsViec } = await env.DB.prepare(`
    SELECT nguoi_giao_id, COUNT(*) AS so
      FROM cong_viec
     WHERE nguoi_giao_id LIKE 'vp:%'
       AND trang_thai IN ('moi', 'dang_lam', 'cho_duyet')
     GROUP BY nguoi_giao_id
  `).all();
  for (const d of dsViec || []) lay(String(d.nguoi_giao_id).slice(3)).viec_dang_mo = d.so;

  /* MÂY KHÔNG ĐO BẰNG THƯỚC CỦA TRƯỞNG PHÒNG.
     Cô ấy không chủ trì, không phản biện, không duyệt — việc của cô ấy là tiếp
     nhận và phân đúng cửa. Đếm cô ấy bằng sáu cột kia thì lúc nào cũng ra 0 ở
     cả sáu, và bảng số đọc thành "Mây làm kém" trong khi thực tế cô ấy chạm vào
     MỌI câu hỏi. Số 0 sai chỗ còn tệ hơn không có số.

     Thước đúng của lễ tân là SỐ LƯỢT TIẾP NHẬN. Còn "phân có đúng cửa không"
     thì không đo được bằng dữ liệu đang có — muốn đo thì phải có người chấm
     lại từng lượt, và đó là việc khác. Không bịa ra một con số cho đủ cột. */
  const soTiepNhan = (results || []).length;

  const dong = [...AGENTS, MAY]
    .filter(a => a.id === 'may' || duocVaoPhong(phien.vai_tro, a.id))
    .map(a => ({
      id: a.id, ten: a.ten, chuc_danh: a.chuc_danh, khoi: a.khoi, chibi: a.chibi,
      la_le_tan: a.id === 'may',
      tiep_nhan: a.id === 'may' ? soTiepNhan : null,
      ...lay(a.id)
    }));

  return json({
    tu_ngay_qua: 60,
    tong_cau_hoi: (results || []).length,
    dong,
    /* Nói thẳng đây là ĐẾM chứ không phải CHẤM ĐIỂM — người đọc bảng số hay tự
       động hiểu là bảng xếp hạng, rồi kết luận sai về trợ lý ít việc. */
    ghi_chu: 'Đây là số việc đã làm trong 60 ngày, không phải điểm xếp hạng. ' +
             'Trợ lý ít lượt không có nghĩa là kém — có thể đơn giản là ít ai hỏi tới mảng đó. ' +
             'Riêng cột "chặn lại" là điểm cộng: trợ lý biết dừng để Sếp quyết mới là trợ lý dùng được. ' +
             'Mây đo bằng số lượt TIẾP NHẬN, không đo bằng thước của trưởng phòng — cô ấy ' +
             'không chủ trì cũng không phản biện, việc của cô ấy là nhận đúng và phân đúng cửa.'
  });
}


/* ==========================================================================
   KỸ NĂNG ĐÃ DẠY — xem lại và tắt
   --------------------------------------------------------------------------
   Dạy được thì phải GỠ được. Một bài học sai mà không tắt đi thì nó lặng lẽ
   làm hỏng mọi câu trả lời về sau, và càng lâu càng khó lần ra vì sao trợ lý
   tự nhiên tư vấn lệch.

   Tắt chứ không xoá: giữ lại để còn đối chiếu "hôm đó Sếp dạy gì mà ra kết
   luận này". Xoá trắng là mất luôn manh mối.
   ========================================================================== */
/** Trợ lý mà người này được XEM luật — đẩy thẳng vào `WHERE agent_id IN (…)`.
 *
 *  Đúng khuôn `nhomTaiLieuXemDuoc()` → `WHERE nhom IN (?,…)` ở
 *  src/tai-lieu.js:1282: lọc NGAY TỪ ĐẦU chứ không lấy hết rồi lọc sau. Lấy hết
 *  rồi lọc ở JS nghĩa là dữ liệu đã rời máy chủ rồi mới bị vứt đi — và với màn
 *  này thì "dữ liệu" chính là toàn bộ luật riêng của chín trợ lý.
 *
 *  Trước bản này `kyNangDs` KHÔNG có mệnh đề WHERE nào cả: không lọc agent_id,
 *  không lọc `vao_duoc`. Ai vào được văn phòng là đọc được luật của cả chín. */
function agentXemDuoc(phien) {
  const ds = new Set();
  for (const v of boVaiTro(phien)) for (const a of agentChoVaiTro(v)) ds.add(a.id);
  return [...ds];
}

export async function kyNangDs(env, phien) {
  if (!duocXemTab(phien, 'vanphong')) return loi('Bạn chưa được vào văn phòng ảo.', 403);

  const agentDuoc = agentXemDuoc(phien);
  if (!agentDuoc.length) {
    return json({ ky_nang: [], cat: null, duoc_day: false, agent_xem_duoc: [] });
  }

  /* Trần 200 bài. Kỹ năng bị cắt im lặng là kiểu hỏng tệ nhất ở đây: Sếp
     mở ra thấy đủ, tưởng đã dạy hết, trong khi bài thứ 201 không bao giờ
     hiện ra để mà tắt đi. */
  const GH_KN = 200;
  const oDau = agentDuoc.map(() => '?').join(',');
  const kqKn = await env.DB.prepare(
    'SELECT k.id, k.agent_id, k.tieu_de, k.noi_dung, k.yeu_cau_goc, k.dang_dung, k.tao_luc, ' +
    '       k.tang, k.pham_vi_id, k.het_han_luc, k.cap_nhat_luc, ' +
    '       k.nguoi_thuc_hien_loai, k.tac_nhan, ' +
    '       ns.ho_ten AS nguoi_day, uq.ho_ten AS uy_quyen_boi ' +
    '  FROM vp_ky_nang k ' +
    '  LEFT JOIN nhan_su ns ON ns.id = k.nguoi_day_id ' +
    '  LEFT JOIN nhan_su uq ON uq.id = k.uy_quyen_boi_id ' +
    /* Tầng chung (company/department/role) KHÔNG gắn với một trợ lý nào, nên
       không lọc theo agent_id được — chúng áp cho mọi trợ lý người này gặp. */
    " WHERE k.tang IN ('company','department','role') OR k.agent_id IN (" + oDau + ') ' +
    ' ORDER BY k.tao_luc DESC LIMIT ' + (GH_KN + 1)
  ).bind(...agentDuoc).all();

  const { ds: kyNang, biCat } = catBot(kqKn, GH_KN);
  const cat = await nhanCat(env, biCat, GH_KN, 'SELECT COUNT(*) FROM vp_ky_nang');

  return json({
    ky_nang: kyNang,
    cat,
    /* Giao diện dùng cờ này để ẩn nút Tắt/Bật. ĐÂY KHÔNG PHẢI CHỖ CHẶN —
       chặn thật ở `kyNangDoiTrangThai` bên dưới, trả 403. Ẩn nút chỉ để người
       không có quyền khỏi bấm vào một thứ chắc chắn hỏng. */
    duoc_day: duocDayTroLy(phien),
    agent_xem_duoc: agentDuoc
  });
}

/* Bật/tắt một bài học — HAI thay đổi so với bản trước:
     ① cửa hẹp `duocDayTroLy` thay cho `duocXemTab('vanphong')` (D3)
     ② GHI NHẬT KÝ. Trước đây `UPDATE ... SET dang_dung=?` rồi
        `return json({ok:true})`, hết — sau vài vòng bật tắt thì không cách nào
        biết ai đã tắt, lúc nào, vì sao. Đúng kiểu hỏng mà chú thích ngay trên
        đầu mục này đã tự cảnh báo, chỉ là hỏng ngược chiều: bài BỊ TẮT OAN
        cũng không lần ra. */
export async function kyNangDoiTrangThai(env, phien, body) {
  if (!duocXemTab(phien, 'vanphong')) return loi('Bạn chưa được vào văn phòng ảo.', 403);
  if (!duocDayTroLy(phien))
    return loi('Bạn vào xem được văn phòng ảo, nhưng bật/tắt bài học của trợ lý là quyền riêng — nhờ Quản trị.', 403);

  const id = String(body?.id || '').trim();
  const bat = body?.dang_dung ? 1 : 0;
  const lyDo = String(body?.ly_do || '').trim().slice(0, 300);
  if (!id) return loi('Thiếu mã kỹ năng');

  const co = await env.DB.prepare(
    'SELECT id, agent_id, tieu_de, dang_dung FROM vp_ky_nang WHERE id = ?'
  ).bind(id).first();
  if (!co) return loi('Không có kỹ năng này', 404);

  /* Trợ lý ngoài tầm nhìn của người này thì cũng ngoài tầm tay. Không lọc ở
     đây thì `duoc_day` biến thành "được đụng vào cả chín trợ lý". */
  const agentDuoc = agentXemDuoc(phien);
  if (co.agent_id && !agentDuoc.includes(co.agent_id))
    return loi('Bài học này thuộc trợ lý bạn chưa được vào phòng.', 403);

  if (Number(co.dang_dung) === bat) return json({ ok: true, dang_dung: bat, khong_doi: true });

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE vp_ky_nang SET dang_dung = ?, cap_nhat_luc = datetime('now','+7 hours') WHERE id = ?"
    ).bind(bat, id),
    /* Sổ chung `lich_su_thay_doi_nen`, đúng khuôn src/index.js:4026 — không đẻ
       bảng nhật ký thứ hai. `ban_ghi_id` là cột TEXT và `vp_ky_nang.id` vốn đã
       là chuỗi 'kn_…', nên KHÔNG dính cái bẫy "nhét số vào cột TEXT ra chuỗi
       2.0" mà index.js:4031 đã ghi lại. */
    env.DB.prepare(
      'INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, ' +
      "                                  nguoi_id, nguoi_ten, ly_do, luc) " +
      "VALUES ('vp_ky_nang', ?, 'dang_dung', ?, ?, ?, ?, ?, datetime('now','+7 hours'))"
    ).bind(id, String(co.dang_dung), String(bat),
           phien.nhan_su_id || null, phien.ho_ten || phien.ten_dang_nhap || '',
           lyDo || null)
  ]);

  return json({ ok: true, dang_dung: bat });
}

/* ==========================================================================
   THỨ BẬC LUẬT — màn QUY TẮC
   --------------------------------------------------------------------------
   Trả về tầng SYSTEM SAFETY (đọc thẳng từ mã nguồn, KHÔNG sửa được ở đây) cùng
   thứ tự ưu tiên, để màn hình bày ra chứ không tự chế lại.
   ========================================================================== */
export async function luatThuBac(env, phien) {
  if (!duocXemTab(phien, 'vanphong')) return loi('Bạn chưa được vào văn phòng ảo.', 403);
  return json({
    thu_tu: ['system_safety', ...THU_TU_TANG],
    tang: TANG,
    an_toan: luatAnToan(),
    tran_ky_tu: TRAN_KY_TU_LUAT,
    duoc_day: duocDayTroLy(phien)
  });
}

/* ==========================================================================
   HƯỚNG DẪN RIÊNG — Sếp gõ THẲNG, không qua mô hình
   --------------------------------------------------------------------------
   ⚠️ ĐÂY LÀ ĐƯỜNG NGUY NHẤT TRONG CẢ KHU NÀY, và nói ra để người sau đừng nới.
   Mọi bài học cũ đều phải đi qua `promptHocNghe` — tức là còn một cái đệm mô
   hình ở giữa. Đường này thì chuỗi Sếp gõ đi THẲNG vào prompt của mọi lượt hỏi
   sau đó. Không cần ai cố ý: dán một đoạn quy trình copy từ file Word có dòng
   gạch ngang '=====' là đủ làm vỡ cấu trúc prompt.

   BA LỚP, KHÔNG LỚP NÀO LÀ LỜI DẶN TRONG PROMPT:
     ① `kiemTruocKhiGhi` thoát ký tự phân cách NGAY LÚC GHI (vp-luat.js)
     ② `bocTrichDan` đẩy mọi dòng khỏi cột 0 lúc ghép prompt (agents-vp.js)
     ③ `soNghiepVu` chặn cứng khi có số liệu nghiệp vụ (so-ai.js)
   Cả ba đều đo được bằng `scripts/do-tiem-lenh-ky-nang.mjs`.
   ========================================================================== */
export async function huongDanGhi(env, phien, body) {
  if (!duocXemTab(phien, 'vanphong')) return loi('Bạn chưa được vào văn phòng ảo.', 403);
  if (!duocDayTroLy(phien))
    return loi('Đặt hướng dẫn riêng cho trợ lý là quyền riêng — nhờ Quản trị.', 403);
  if (!phien.nhan_su_id)
    return loi('Tài khoản chưa nối với hồ sơ nhân sự nên không ghi được ai chịu trách nhiệm. Nhờ Quản trị nối hồ sơ giúp.');

  const agentId = String(body?.agent_id || '').trim();
  const tang = String(body?.tang || 'agent').trim();
  const soNgay = Number(body?.so_ngay) || 0;

  if (!tangHopLe(tang)) return loi('Tầng luật không hợp lệ.');
  /* Tầng gắn với một trợ lý thì bắt buộc phải nói rõ trợ lý nào, và phải là
     trợ lý người này vào được phòng. */
  if (tang === 'agent' || tang === 'user_tmp') {
    if (!agentTheoId(agentId)) return loi('Chưa chọn trợ lý.');
    if (!agentXemDuoc(phien).includes(agentId))
      return loi('Bạn chưa được vào phòng trợ lý này.', 403);
  }

  const kiem = kiemTruocKhiGhi(body?.tieu_de, body?.noi_dung);
  if (!kiem.ok) return json({ loi: kiem.ly_do, chi_tiet: kiem.chi_tiet || null }, 400);

  /* USER TEMPORARY phải hết hạn THẬT. Không đặt hạn thì nó không còn là "tạm
     thời" — nó chỉ là một bài học tầng thấp sống mãi và tính tiền token mãi.
     Mặc định 7 ngày, trần 90: xa hơn thế thì đặt ở tầng `agent` cho đúng tên. */
  const hetHan = tang === 'user_tmp'
    ? "datetime('now','+7 hours','+" + Math.min(Math.max(soNgay || 7, 1), 90) + " days')"
    : 'NULL';

  const id = 'kn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  try {
    await env.DB.prepare(
      'INSERT INTO vp_ky_nang (id, agent_id, tieu_de, noi_dung, yeu_cau_goc, nguoi_day_id, ' +
      '                        tang, pham_vi_id, het_han_luc, nguoi_thuc_hien_loai, ' +
      '                        tac_nhan, uy_quyen_boi_id) ' +
      "VALUES (?, ?, ?, ?, NULL, ?, ?, ?, " + hetHan + ", 'nguoi', NULL, ?)"
    ).bind(
      id,
      /* Tầng chung không thuộc trợ lý nào. `agent_id` là NOT NULL nên dùng
         chuỗi rỗng làm "không thuộc ai" — cột này không có FK, và câu đọc luật
         chỉ so `agent_id` cho hai tầng agent/user_tmp. */
      (tang === 'agent' || tang === 'user_tmp') ? agentId : '',
      kiem.tieu_de, kiem.noi_dung,
      phien.nhan_su_id, tang,
      String(body?.pham_vi_id || '').trim() || null,
      phien.nhan_su_id
    ).run();
  } catch (e) {
    console.error('Ghi hướng dẫn riêng lỗi:', e.message);
    return loi('Chưa lưu được. Nếu vừa deploy thì có thể migration them-vp-kynang-tang.sql chưa chạy.', 500);
  }

  await env.DB.prepare(
    'INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, ' +
    "                                  nguoi_id, nguoi_ten, ly_do, luc) " +
    "VALUES ('vp_ky_nang', ?, 'them', NULL, ?, ?, ?, ?, datetime('now','+7 hours'))"
  ).bind(id, kiem.tieu_de, phien.nhan_su_id,
         phien.ho_ten || phien.ten_dang_nhap || '',
         'Thêm hướng dẫn tầng ' + tang).run();

  return json({ ok: true, id, tang, tieu_de: kiem.tieu_de, noi_dung: kiem.noi_dung });
}

/* ==========================================================================
   LỊCH SỬ — ai đụng vào luật, lúc nào, vì sao
   --------------------------------------------------------------------------
   Đọc `lich_su_thay_doi_nen` với `bang='vp_ky_nang'` — sổ chung 9 module đang
   dùng, có sẵn chỉ mục `idx_lstdn_doc (bang, ban_ghi_id, luc DESC)`. Không đẻ
   bảng nhật ký thứ hai.
   Kèm bảng đếm lượt gọi AI mỗi ngày (src/vp-dem-ai.js) — hôm nay là con số
   THẬT đầu tiên về chi phí AI của hệ thống này.
   ========================================================================== */
export async function luatLichSu(env, phien) {
  if (!duocXemTab(phien, 'vanphong')) return loi('Bạn chưa được vào văn phòng ảo.', 403);

  const GH = 100;
  const kq = await env.DB.prepare(
    'SELECT l.id, l.ban_ghi_id, l.truong, l.gia_tri_cu, l.gia_tri_moi, ' +
    '       l.nguoi_ten, l.ly_do, l.luc, k.tieu_de, k.agent_id, k.tang ' +
    '  FROM lich_su_thay_doi_nen l ' +
    '  LEFT JOIN vp_ky_nang k ON k.id = l.ban_ghi_id ' +
    " WHERE l.bang = 'vp_ky_nang' " +
    ' ORDER BY l.luc DESC LIMIT ' + (GH + 1)
  ).all();
  const { ds, biCat } = catBot(kq, GH);
  const cat = await nhanCat(env, biCat, GH,
    "SELECT COUNT(*) FROM lich_su_thay_doi_nen WHERE bang = 'vp_ky_nang'");

  return json({ lich_su: ds, cat, dem_ai: await bangDemAI(env, 14) });
}

/* ==========================================================================
   CÓ MẶT — giao diện gọi mỗi 20 giây
   ========================================================================== */
export async function coMat(env, phien, body) {
  const dangO = String(body?.dang_o || '').trim();
  // Chỉ nhận id trợ lý có thật, không nhận chuỗi tuỳ ý từ trình duyệt.
  const phong = dangO && agentTheoId(dangO) ? dangO : null;

  await env.DB.prepare(`
    INSERT INTO vp_co_mat (nhan_su_id, luc, dang_o)
    VALUES (?, datetime('now', '+7 hours'), ?)
    ON CONFLICT(nhan_su_id) DO UPDATE
      SET luc = datetime('now', '+7 hours'), dang_o = excluded.dang_o
  `).bind(phien.nhan_su_id, phong).run();

  const { results } = await env.DB.prepare(`
    SELECT c.nhan_su_id, c.dang_o, n.ho_ten, n.viet_tat, n.chuc_vu, n.bo_phan
      FROM vp_co_mat c
      JOIN nhan_su n ON n.id = c.nhan_su_id
     WHERE c.luc >= datetime('now', '+7 hours', ?)
     ORDER BY n.ho_ten
  `).bind(CON_TRONG_PHONG).all();

  return json({ nguoi_co_mat: results });
}

/* ==========================================================================
   MỞ CỬA MỘT PHÒNG
   ========================================================================== */
export async function hoiThoai(env, phien) {
  /* Một mạch duy nhất với Mây cho mỗi người. Không tách theo từng chuyên gia:
     người dùng chỉ thấy mình đang nói với Mây, còn việc Mây chuyền cho ai thì
     nằm trong dấu vết của từng câu trả lời. */
  const ht = await layHoacTaoHoiThoai(env, phien.nhan_su_id, 'may');
  const { results } = await env.DB.prepare(`
    SELECT vai, noi_dung, cong_cu, anh, luc
      FROM vp_tin_nhan WHERE hoi_thoai_id = ?
     ORDER BY id DESC LIMIT 60
  `).bind(ht.id).all();

  return json({
    may: MAY,
    hoi_dap_bat_chua: !!env.AI,
    tin_nhan: results.reverse()
  });
}

async function layHoacTaoHoiThoai(env, nhanSuId, agentId) {
  const cu = await env.DB.prepare(
    'SELECT id FROM vp_hoi_thoai WHERE nhan_su_id = ? AND agent_id = ?'
  ).bind(nhanSuId, agentId).first();
  if (cu) return cu;

  const moi = id('ht');
  await env.DB.prepare(
    'INSERT INTO vp_hoi_thoai (id, agent_id, nhan_su_id) VALUES (?, ?, ?)'
  ).bind(moi, agentId, nhanSuId).run();
  return { id: moi };
}

/* ==========================================================================
   HỎI MÂY — MỘT CỬA DUY NHẤT
   --------------------------------------------------------------------------
   Người dùng không chọn trợ lý. Họ nói tự nhiên với Mây; Mây phân loại, chọn
   đúng chuyên gia, tra số thật rồi mới trả lời (xem src/vp-may.js).
   Mạch trò chuyện lưu chung một hội thoại 'may' cho mỗi người — không tách
   theo từng chuyên gia, vì người dùng chỉ thấy mình đang nói với Mây.
   ========================================================================== */
export async function hoi(env, phien, body) {
  const noiDung = String(body?.noi_dung || '').trim();
  const anh = String(body?.anh || '').trim();

  /* Có ảnh thì cho phép chữ rỗng — nhiều lúc người ta chỉ chụp màn hình rồi
     hỏi "cái này là sao", chữ nghĩa nằm hết trong ảnh. */
  if (!noiDung && !anh) return loi('Chưa nhập nội dung');
  if (noiDung.length > 4000) return loi('Câu hỏi dài quá, Sếp rút gọn giúp tôi');

  /* Ảnh lưu thẳng vào D1 dạng data URL đã nén ở trình duyệt. Chặn ở đây một
     lần nữa: trình duyệt nén hỏng hoặc ai đó gọi thẳng API thì một dòng D1
     phình lên vài MB, và bảng hội thoại sẽ chậm dần mà không ai hiểu vì sao. */
  if (anh) {
    if (!anh.startsWith('data:image/')) return loi('Ảnh không hợp lệ');
    if (anh.length > 900000) return loi('Ảnh nặng quá, Sếp chụp gọn lại giúp tôi');
  }

  const ht = await layHoacTaoHoiThoai(env, phien.nhan_su_id, 'may');

  // Lấy mạch cũ TRƯỚC khi ghi câu mới, để câu vừa gõ không bị lặp hai lần.
  const { results: cu } = await env.DB.prepare(`
    SELECT vai, noi_dung FROM vp_tin_nhan
     WHERE hoi_thoai_id = ? ORDER BY id DESC LIMIT ?
  `).bind(ht.id, NHO_LAI).all();
  const lichSu = cu.reverse();

  let kq;
  try {
    kq = await hoiMay({
      env, phien, cauHoi: noiDung || '(Sếp gửi ảnh, không kèm chữ)',
      lichSu, homNay: homNayVN(), coAnhKem: !!anh
    });
  } catch (e) {
    if (e.thieu_ai) return loi(e.message, 503);
    console.error('Mây lỗi:', e.stack || e.message);
    return loi('Mây tạm thời không trả lời được. Sếp thử lại sau ít phút.', 503);
  }

  /* Ghi cả cặp hỏi–đáp một lượt, đúng thứ tự. Ghi câu hỏi trước rồi Mây lỗi
     thì lần sau mở lại thấy một câu treo lơ lửng không ai trả lời, người dùng
     tưởng bị phớt lờ.

     Cột cong_cu giữ luôn dấu vết điều phối: Mây đã chuyền cho ai, hỏi thêm
     phòng nào, tra công cụ gì. Đó là thứ cho phép nhìn lại "câu trả lời này
     dựa trên đâu" — không phải tin suông. */
  const dauVet = {
    loai: kq.loai,
    agent: kq.agent,
    agent_ten: kq.agent_ten,
    agent_chuc_danh: kq.agent_chuc_danh,
    agent_phu: kq.agent_phu,
    can_owner_gate: kq.can_owner_gate,
    da_tra_cuu: kq.da_tra_cuu,
    so_vong: kq.so_vong,
    /* Biên bản họp: ai đề xuất gì, ai phản biện gì, chốt ra sao. Cắt mỗi lượt
       còn 2000 ký tự — đủ để sau này nhìn lại vì sao ra quyết định đó, mà không
       phình một dòng D1 lên vài chục KB. */
    bien_ban: (kq.bien_ban || []).map(b => ({
      vong: b.vong, agent: b.agent, chuc_danh: b.chuc_danh, vai: b.vai,
      noi_dung: String(b.noi_dung || '').slice(0, 2000)
    }))
  };

  const chen = env.DB.prepare(
    'INSERT INTO vp_tin_nhan (hoi_thoai_id, vai, noi_dung, cong_cu, anh) VALUES (?, ?, ?, ?, ?)'
  );
  await env.DB.batch([
    chen.bind(ht.id, 'nguoi', noiDung, null, anh || null),
    chen.bind(ht.id, 'agent', kq.tra_loi, JSON.stringify(dauVet), null),
    env.DB.prepare("UPDATE vp_hoi_thoai SET cap_nhat_luc = datetime('now', '+7 hours') WHERE id = ?")
      .bind(ht.id)
  ]);

  return json({
    tra_loi: kq.tra_loi,
    so_vong: kq.so_vong,
    bien_ban: kq.bien_ban,
    loai: kq.loai,
    tom_tat: kq.tom_tat,
    agent: kq.agent,
    agent_ten: kq.agent_ten,
    agent_chuc_danh: kq.agent_chuc_danh,
    agent_phu: kq.agent_phu,
    can_owner_gate: kq.can_owner_gate,
    da_tra_cuu: kq.da_tra_cuu
  });
}

/* ==========================================================================
   TRỢ LÝ TỰ NHẮC VIỆC — chạy nền mỗi sáng, KHÔNG CẦN AI
   --------------------------------------------------------------------------
   Đây là nửa còn lại của văn phòng ảo, và là nửa chạy được ngay hôm nay:
   không chờ ai hỏi, sáng ra trợ lý tự soi dữ liệu phòng mình rồi đặt việc lên
   bàn người phụ trách.

   VÌ SAO PHẦN NÀY KHÔNG GỌI AI: nhắc việc định kỳ là những luật rõ ràng — lô
   này còn 12 ngày là hết hạn, mã kia tụt dưới mức tồn, đơn hoàn quá 12 tiếng
   chưa đối soát. Luật viết thẳng bằng SQL thì luôn đúng, chạy trong một phần
   nghìn giây và không tốn một đồng nào. Đưa việc này cho mô hình ngôn ngữ chỉ
   tổ đắt hơn, chậm hơn, và có ngày nó nhắc sai một con số. AI để dành cho việc
   nó làm tốt hơn: trả lời câu hỏi mở và phản biện.

   Việc giao ra đi thẳng vào bảng `cong_viec` — cùng một hàng đợi với việc do
   người giao, không phải một danh sách riêng mà rồi chẳng ai mở.
   ========================================================================== */

/* Tìm người phụ trách theo VAI TRÒ tài khoản, không dò theo tên bộ phận — tên
   bộ phận do người nhập tay, mỗi nơi gõ một kiểu, còn vai trò là dữ liệu hệ
   thống nên luôn khớp. */
async function nguoiPhuTrach(env, vaiTro) {
  return env.DB.prepare(`
    SELECT n.id, n.ho_ten
      FROM tai_khoan t
      JOIN nhan_su n ON n.id = t.nhan_su_id
     WHERE t.vai_tro = ? AND t.kich_hoat = 1 AND n.dang_lam = 1
     ORDER BY n.ho_ten LIMIT 1
  `).bind(vaiTro).first();
}

/* Đặt một việc, bỏ qua nếu đã có việc y hệt còn đang mở. */
async function datViec(env, agentId, nguoi, v) {
  if (!nguoi) return false;

  const trung = await env.DB.prepare(`
    SELECT 1 FROM cong_viec
     WHERE nguoi_nhan_id = ? AND tieu_de = ?
       AND trang_thai IN ('moi', 'dang_lam', 'cho_duyet') LIMIT 1
  `).bind(nguoi.id, v.tieu_de).first();
  if (trung) return false;

  const a = agentTheoId(agentId);
  await env.DB.prepare(`
    INSERT INTO cong_viec
      (tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten,
       nguoi_nhan_id, nguoi_nhan_ten, han_chot, trang_thai, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'moi', datetime('now', '+7 hours'))
  `).bind(
    v.tieu_de, v.dau_ra, v.mo_ta || null,
    'vp:' + agentId, `${a.ten} (${a.chuc_danh})`,
    nguoi.id, nguoi.ho_ten, v.han_chot || null
  ).run();
  return true;
}

export async function quetNhacViec(env) {
  let daTao = 0;
  const homNay = homNayVN();

  const nguoiKho = await nguoiPhuTrach(env, 'quan_ly_kho');
  const nguoiSan = await nguoiPhuTrach(env, 'van_hanh_san');
  const nguoiHcns = await nguoiPhuTrach(env, 'hcns');

  /* ---- Khang (Kho vận): lô cận hạn còn tồn ------------------------------ */
  const { results: canHan } = await env.DB.prepare(`
    SELECT sp.ma_sku, sp.ten, sp.don_vi, l.han_su_dung,
           COALESCE(SUM(g.so_luong), 0) AS ton
      FROM lo_hang l
      JOIN san_pham sp ON sp.id = l.san_pham_id
      LEFT JOIN giao_dich_kho g ON g.lo_hang_id = l.id
     WHERE l.han_su_dung IS NOT NULL
       AND l.han_su_dung <= date('now', '+7 hours', '+30 days')
     GROUP BY l.id
    HAVING ton > 0
     ORDER BY l.han_su_dung ASC
     LIMIT 10
  `).all();

  for (const r of canHan) {
    const conLai = Math.round(
      (Date.parse(r.han_su_dung + 'T00:00:00Z') - Date.parse(homNay + 'T00:00:00Z')) / 86400000
    );
    const daQua = conLai < 0;
    if (await datViec(env, 'khovan', nguoiKho, {
      tieu_de: daQua
        ? `Hàng quá hạn còn trong kho: ${r.ten}`
        : `Đẩy gấp lô cận hạn: ${r.ten} (còn ${conLai} ngày)`,
      dau_ra: daQua
        ? 'Lô đã tách khỏi hàng bán và xử lý xong theo quy định thực phẩm'
        : 'Lô này đã được lên lịch xuất hoặc lên phương án xả hàng',
      mo_ta: `Mã ${r.ma_sku} còn ${r.ton} ${r.don_vi}, hạn dùng ${r.han_su_dung}` +
             (daQua ? ' — ĐÃ QUÁ HẠN.' : `, còn ${conLai} ngày.`) +
             ' Trợ lý Kho vận tự phát hiện khi soi kho buổi sáng.',
      han_chot: r.han_su_dung
    })) daTao++;
  }

  /* ---- Khang: hàng tụt dưới mức tồn tối thiểu --------------------------- */
  const { results: duoiMuc } = await env.DB.prepare(`
    SELECT sp.ma_sku, sp.ten, sp.don_vi, sp.ton_toi_thieu,
           COALESCE(SUM(g.so_luong), 0) AS ton
      FROM san_pham sp
      LEFT JOIN giao_dich_kho g ON g.san_pham_id = sp.id
     WHERE sp.dang_ban = 1 AND sp.ton_toi_thieu > 0
     GROUP BY sp.id
    HAVING ton < sp.ton_toi_thieu
     ORDER BY (sp.ton_toi_thieu - ton) DESC
     LIMIT 10
  `).all();

  for (const r of duoiMuc) {
    if (await datViec(env, 'khovan', nguoiKho, {
      tieu_de: r.ton <= 0 ? `Hết sạch hàng: ${r.ten}` : `Sắp hết hàng: ${r.ten}`,
      dau_ra: 'Đã đặt hàng bổ sung hoặc có ngày hàng về cụ thể',
      mo_ta: `Mã ${r.ma_sku} còn ${r.ton} ${r.don_vi}, dưới mức tồn tối thiểu ${r.ton_toi_thieu}. ` +
             'Đang bán trên sàn mà hết hàng là mất đơn và tụt hạng hiển thị.'
    })) daTao++;
  }

  /* ---- Doanh (Kinh doanh): đơn hoàn quá 12 tiếng chưa đối soát ---------- */
  const quaHan = await env.DB.prepare(`
    SELECT COUNT(*) AS so FROM don_hoan
     WHERE kho_nhan_luc IS NULL AND doi_soat_luc IS NULL
       AND cho_kho_nhan_tu IS NOT NULL
       AND cho_kho_nhan_tu <= datetime('now', '+7 hours', '-12 hours')
  `).first();

  if (quaHan?.so > 0) {
    if (await datViec(env, 'kinhdoanh', nguoiSan, {
      tieu_de: `Đối soát ${quaHan.so} đơn hoàn quá 12 tiếng`,
      dau_ra: 'Tất cả đơn trong danh sách đã được đánh dấu đã đối soát với sàn',
      mo_ta: `Có ${quaHan.so} đơn hoàn đã về mà kho chưa quẹt nhận, đã quá mốc 12 tiếng. ` +
             'Để trôi thêm là mất quyền khiếu nại với sàn. Xem danh sách ở tab Kết nối sàn.',
      han_chot: homNay
    })) daTao++;
  }

  /* ---- Nhân (HCNS): hồ sơ thiếu giấy tờ, hợp đồng chưa ký --------------- */
  const { results: hoSo } = await env.DB.prepare(`
    SELECT id, ho_ten, bo_phan, trang_thai,
           (so_cccd  IS NULL OR so_cccd  = '') AS thieu_cccd,
           (so_bhxh  IS NULL OR so_bhxh  = '') AS thieu_bhxh,
           (ngay_vao IS NULL OR ngay_vao = '') AS thieu_ngay_vao
      FROM nhan_su WHERE dang_lam = 1 LIMIT 80
  `).all();

  const thieu = hoSo.filter(r => r.thieu_cccd || r.thieu_bhxh || r.thieu_ngay_vao);
  if (thieu.length) {
    if (await datViec(env, 'hcns', nguoiHcns, {
      // Khoá theo tháng nằm ngay trong tiêu đề: mỗi tháng nhắc đúng một lần,
      // không nhắc lại mỗi sáng.
      tieu_de: `Bổ sung giấy tờ cho ${thieu.length} hồ sơ nhân sự (tháng ${homNay.slice(0, 7)})`,
      dau_ra: 'Các hồ sơ trong danh sách đã đủ căn cước, số bảo hiểm xã hội và ngày vào làm',
      mo_ta: 'Đang thiếu: ' + thieu.slice(0, 8).map(r => r.ho_ten).join(', ') +
             (thieu.length > 8 ? ` và ${thieu.length - 8} người nữa` : '') +
             '. Thiếu những mục này thì không chốt được bảo hiểm và dễ vướng khi thanh tra.'
    })) daTao++;
  }

  for (const r of hoSo.filter(x => x.trang_thai === 'cho_ky').slice(0, 10)) {
    if (await datViec(env, 'hcns', nguoiHcns, {
      tieu_de: `Chốt hợp đồng lao động: ${r.ho_ten}`,
      dau_ra: 'Hợp đồng đã ký và hồ sơ chuyển sang trạng thái đã ký',
      mo_ta: `${r.ho_ten} (${r.bo_phan || 'chưa rõ bộ phận'}) vẫn ở trạng thái chờ ký hợp đồng. ` +
             'Người đã đi làm mà chưa có hợp đồng là rủi ro pháp lý thuộc về công ty.'
    })) daTao++;
  }

  return daTao;
}
