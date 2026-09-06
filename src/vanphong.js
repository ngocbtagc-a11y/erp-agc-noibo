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
  AGENTS, agentTheoId, agentChoVaiTro, duocVaoPhong, hoSoCongKhai, ghepPrompt,
  DOI_IT, CACH_GOI_DOI_IT
} from './agents-vp.js';
import { congCuCuaAgent, chayCongCu } from './vp-cong-cu.js';
import { MAY } from './agents-vp.js';
import { hoiMay } from './vp-may.js';
import { duocXemTab } from './quyen.js';

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
   TẢI VIỆC CỦA XƯỞNG ERP
   --------------------------------------------------------------------------
   Sếp Ngọc 06/09/2026: việc vẫn tới Hồ Ly và Khỉ Đột, chỉ là đi vòng qua
   Trưởng phòng IT — nên hai bạn cũng phải có cảnh báo bận như mọi phòng khác.

   Hàng đợi thật của họ KHÔNG nằm ở bảng cong_viec mà ở bảng gop_y: mỗi phiếu
   góp ý ERP đi qua một chuỗi trạng thái, và src/index.js đã khai sẵn trạng thái
   nào đang thuộc tay ai (GOPY_OWNER_THEO_TT). Lấy đúng nguồn đó chứ không tự
   nghĩ ra một thước đo mới — hai chỗ đếm hai kiểu thì sớm muộn cũng lệch nhau,
   rồi không ai biết tin cái nào.

   Chỉ ĐỌC gop_y, không ghi. Vùng gop_y đang có phiên khác làm dở.
   ========================================================================== */
const TAI_XUONG_THEO_TT = {
  holy:   ['cho_phan_tich', 'dang_phan_tich'],
  khidot: ['dang_lam', 'dang_kiem_tra', 'can_chinh_sua', 'nghiem_thu_chua_dat']
};

async function taiCuaXuong(env) {
  const ra = { holy: 0, khidot: 0 };
  try {
    const { results } = await env.DB.prepare(
      'SELECT trang_thai, COUNT(*) AS so FROM gop_y GROUP BY trang_thai'
    ).all();
    for (const d of results || []) {
      for (const [ai, ds] of Object.entries(TAI_XUONG_THEO_TT)) {
        if (ds.includes(d.trang_thai)) ra[ai] += Number(d.so) || 0;
      }
    }
  } catch (e) {
    // Thiếu bảng gop_y thì coi như rảnh, KHÔNG làm hỏng cả mặt bằng vì một cái chấm.
    console.error('Đếm tải Xưởng ERP lỗi:', e.message);
  }
  return ra;
}


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
        viec_cua: 'Xưởng ERP — chạy bằng tay, chưa có tự động',
        chi_tiet: dung.slice(0, 5).map(g => ({ id: g.id, tieu_de: g.tieu_de, so_ngay: g.so_ngay }))
      });
    }
  } catch (e) {
    console.error('Rà việc treo lỗi:', e.message);
  }
  return ra;
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

  // Tải của Xưởng ERP đếm từ hàng đợi góp ý, không phải từ cong_viec —
  // xem chú thích ở taiCuaXuong().
  const taiXuong = await taiCuaXuong(env);

  // Việc của chính người đang xem — kể cả việc do người khác giao, để họ nhìn
  // một chỗ là thấy hết, không phải mở hai nơi.
  const { results: viecCuaToi } = await env.DB.prepare(`
    SELECT id, tieu_de, dau_ra, mo_ta, nguoi_giao_id, nguoi_giao_ten,
           han_chot, trang_thai, tao_luc
      FROM cong_viec
     WHERE nguoi_nhan_id = ? AND trang_thai IN ('moi', 'dang_lam')
     ORDER BY COALESCE(han_chot, '9999-12-31'), tao_luc DESC
     LIMIT 30
  `).bind(phien.nhan_su_id).all();

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
      viec_dang_mo: dem[a.id] || 0
    })),
    nguoi_co_mat: coMat,
    viec_cua_toi: viecCuaToi,
    hoi_dap_bat_chua: !!env.AI,
    may: MAY,
    /* Đội dựng ERP: hiện trên mặt bằng ở Xưởng ERP cạnh phòng IT. Gửi kèm cả
       CACH_GOI để giao diện nói thẳng "hỏi ở đây hai bạn không nghe thấy" —
       thấy mặt mà tưởng hỏi được thì còn tệ hơn không hiện. */
    doi_it: DOI_IT.map(a => ({
      id: a.id, ten: a.ten, chuc_danh: a.chuc_danh, phong: a.phong,
      mo_ta: a.mo_ta, chibi: a.chibi, nang_luc: a.nang_luc, truc_thuoc: a.truc_thuoc,
      viec_dang_mo: taiXuong[a.id] || 0
    })),
    doi_it_cach_goi: CACH_GOI_DOI_IT,
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
export async function kyNangDs(env, phien) {
  if (!duocXemTab(phien, 'vanphong')) return loi('Bạn chưa được vào văn phòng ảo.', 403);
  const { results } = await env.DB.prepare(
    'SELECT k.id, k.agent_id, k.tieu_de, k.noi_dung, k.yeu_cau_goc, k.dang_dung, k.tao_luc, ' +
    '       ns.ho_ten AS nguoi_day ' +
    '  FROM vp_ky_nang k LEFT JOIN nhan_su ns ON ns.id = k.nguoi_day_id ' +
    ' ORDER BY k.tao_luc DESC LIMIT 200'
  ).all();
  return json({ ky_nang: results || [] });
}

export async function kyNangDoiTrangThai(env, phien, body) {
  if (!duocXemTab(phien, 'vanphong')) return loi('Bạn chưa được vào văn phòng ảo.', 403);
  const id = String(body?.id || '').trim();
  const bat = body?.dang_dung ? 1 : 0;
  if (!id) return loi('Thiếu mã kỹ năng');

  const co = await env.DB.prepare('SELECT id FROM vp_ky_nang WHERE id = ?').bind(id).first();
  if (!co) return loi('Không có kỹ năng này', 404);

  await env.DB.prepare('UPDATE vp_ky_nang SET dang_dung = ? WHERE id = ?').bind(bat, id).run();
  return json({ ok: true, dang_dung: bat });
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
