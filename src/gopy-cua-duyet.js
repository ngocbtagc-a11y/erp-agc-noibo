/* ==========================================================================
   CỬA DUYỆT GÓP Ý — MỘT NHÁNH QUYẾT ĐỊNH DÙNG CHUNG CHO MỌI ĐƯỜNG TẠO PHIẾU
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY (lỗi đo được ngày 10/09/2026):

   Có HAI đường tạo phiếu góp ý, và chỉ MỘT đường biết luật.
     · `gopYGui()` trong src/index.js — người tự bấm gửi ở tab Góp ý. Đường này
       BIẾT luật miễn duyệt: người giữ cờ `duyet_gopy` thì phiếu vào thẳng
       'cho_phan_tich'.
     · `taoPhieuGopY()` trong src/vp-gopy.js — Mây bóc câu nói trong Văn phòng
       ảo thành phiếu. Đường này viết CỨNG trang_thai='moi' + ['NGUOI_GUI',
       'QL_CAP1'] và KHÔNG hề gọi `duocDuyetGopY`.

   Hậu quả đo được trên CSDL sản xuất: Sếp Bùi Thị Ngọc ĐÃ CÓ `duyet_gopy = 1`,
   vậy mà hai phiếu Sếp tạo qua Mây lúc 01:43 và 01:45 ngày 10/09/2026
   (GY-0011 "Kéo đơn hàng về ERP", GY-0012 "Kết nối API") vẫn nằm ở 'moi' với
   next_owner = 'QL_CAP1', tức là chờ anh Nguyễn Duy Phong duyệt.

   NÊN: KHÔNG chép luật sang chỗ thứ hai — chép là đẻ ra đúng cái lỗi đang vá.
   Toàn bộ phần "quyết định trạng thái + người cầm việc + dấu duyệt khi người
   gửi được miễn" rút về ĐÂY, và cả hai đường cùng gọi `taoPhieuGopYChung()`.
   Đây cũng đúng món nợ kỹ thuật mà src/vp-gopy.js đã ghi sẵn từ 06/09/2026:
   "khi nhánh feature/gopy-paste-anh merge xong thì GỘP hai chỗ lại thành một
   hàm tạo phiếu duy nhất (Rule 5: Reuse → Extend → Create)".

   ---------------------------------------------------------------------------
   VÌ SAO MODULE RIÊNG CHỨ KHÔNG ĐỂ TRONG index.js
   ---------------------------------------------------------------------------
   `vp-gopy.js` KHÔNG import ngược được từ `index.js`: index.js đã import
   vanphong.js → vp-may.js → vp-gopy.js. Import ngược là vòng tròn module.
   File này chỉ phụ thuộc `quyen.js` (thuần hàm, không import ai), nên cả hai
   đường đều với tới được mà không sinh vòng.
   ========================================================================== */

import { duocDuyetGopY } from './quyen.js';

/* Chỉ nuốt ĐÚNG lỗi thiếu cột — `catch` trần là một lỗ thật (REV-0058 ①): D1
   nghẽn / hết giờ / mất kết nối cũng rơi vào cùng chỗ bắt, và `catch` trần
   đọc nó thành "chưa có cột" rồi lặng lẽ đi nhánh lui. CHỈ SO MỘT VẾ, không
   đòi thông báo lỗi phải kèm tên cột: câu thăm dò chỉ tham chiếu đúng cột
   đang hỏi, nên mọi "no such column" phát ra từ nó tất yếu nói về cột ấy —
   thêm vế so tên cột chỉ nhân đôi bề mặt phụ thuộc vào câu chữ Cloudflare. */
function laLoiThieuCot(e) {
  return /no such column/i.test(String(e && e.message));
}

/* ---- Ai đang cầm việc theo trạng thái -----------------------------------
   [current_owner, next_owner] backend TỰ TÍNH sau mỗi lần chuyển — client
   KHÔNG được gửi hai cột này lên.

   KHÔNG nhồi vào nguoi_phu_trach_id (cột đó trỏ nhân sự thật — nhồi
   'HOLY'/'KHIDOT' vào là phải tạo hồ sơ nhân sự giả, hỏng Danh bạ/Chấm
   công/bảng lương, Rule 9).

   CHUYỂN TỪ index.js SANG ĐÂY vì vp-gopy.js cũng cần đúng bảng này. Trước
   bản vá, vp-gopy.js giữ một bản chép tay tên `OWNER_MOI` kèm chú thích
   "nguồn sự thật là GOPY_OWNER_THEO_TT trong src/index.js" — hai chỗ, một
   luật, đúng loại lỗi file này sinh ra để chấm dứt. */
export const GOPY_OWNER_THEO_TT = {
  moi:                 ['NGUOI_GUI', 'QL_CAP1'],
  bi_tu_choi:          ['NGUOI_GUI', 'NGUOI_GUI'],
  cho_quyet_dinh:      ['OWNER',     'OWNER'],
  cho_phan_tich:       ['HOLY',      'HOLY'],
  dang_phan_tich:      ['HOLY',      'OWNER'],
  da_duyet:            ['OWNER',     'KHIDOT'],
  dang_lam:            ['KHIDOT',    'KHIDOT'],
  dang_kiem_tra:       ['KHIDOT',    'HOLY'],
  can_chinh_sua:       ['KHIDOT',    'KHIDOT'],
  cho_nghiem_thu:      ['NGUOI_GUI', 'NGUOI_GUI'],
  nghiem_thu_chua_dat: ['KHIDOT',    'KHIDOT'],
  san_sang_phat_hanh:  ['OWNER',     'OWNER'],
  hoan_thanh:          ['NONE',      'NONE'],
  da_huy:              ['NONE',      'NONE'],
  bi_chan:             ['OWNER',     'OWNER']
};

/* ---- Ai là người duyệt cấp 1 của người gửi ------------------------------
   Viết MỘT LẦN dưới dạng biểu thức SQL để danh sách, cổng duyệt và SLA dùng
   chung đúng một luật (Rule 1: một sự thật, một nguồn). Cần bí danh bảng `n`
   là nhan_su của NGƯỜI GỬI.

   ADR-0006 B1: nhan_su.quan_ly_id THẮNG; phong_ban.truong_phong_id chỉ là
   đường lui khi quan_ly_id trống.

   ĐƯỜNG LUI NỐI BẰNG KHOÁ, KHÔNG NỐI BẰNG TÊN (REV-0016 mục 1 · BH-32):
   lớp 3 chỉ chạy khi phong_ban_id NULL, nên người đã có id thì tên phòng lệch
   cũng không kéo nhầm ai. */
export const GOPY_SQL_QL1 = `COALESCE(
    (SELECT q.id FROM nhan_su q
      WHERE q.id = n.quan_ly_id AND q.dang_lam = 1 AND q.id <> n.id),
    (SELECT pb.truong_phong_id FROM phong_ban pb
      WHERE pb.hoat_dong = 1 AND pb.truong_phong_id IS NOT NULL AND pb.truong_phong_id <> n.id
        AND n.phong_ban_id IS NOT NULL AND pb.id = n.phong_ban_id LIMIT 1),
    (SELECT pb.truong_phong_id FROM phong_ban pb
      WHERE pb.hoat_dong = 1 AND pb.truong_phong_id IS NOT NULL AND pb.truong_phong_id <> n.id
        AND n.phong_ban_id IS NULL
        AND LOWER(TRIM(pb.ten)) = LOWER(TRIM(n.bo_phan)) LIMIT 1)
  )`;

/* Người duyệt cấp 1 của một nhân sự (ADR-0006 B1). Trả kèm `nguon` để ĐÓNG
   BĂNG vào gop_y.duyet_cap1_nguon lúc duyệt — sau này HCNS đổi quan_ly_id
   thì hồ sơ duyệt cũ vẫn đọc đúng ai duyệt, với tư cách gì (Rule 10).

   Không tìm được ai thì PHẢI NÓI RÕ VÌ SAO, không im lặng gộp làm một
   (REV-0016 mục 1). Hai lý do khác hẳn nhau, việc phải làm cũng khác:
     KHONG_CO_QUAN_LY    — đã xếp phòng ban rồi mà phòng chưa có trưởng phòng,
                           hoặc chính người này là trưởng phòng. Việc của Sếp.
     CHUA_XEP_PHONG_BAN  — hồ sơ nhân sự còn thiếu phong_ban_id. Việc của HCNS,
                           sửa hồ sơ là hết. */
export async function nguoiDuyetCap1(env, nhanSuId) {
  const r = await env.DB.prepare(`
    SELECT ${GOPY_SQL_QL1} AS ql_id,
           (n.quan_ly_id IS NOT NULL AND EXISTS
              (SELECT 1 FROM nhan_su q WHERE q.id = n.quan_ly_id AND q.dang_lam = 1 AND q.id <> n.id)) AS theo_quan_ly,
           (n.phong_ban_id IS NULL) AS chua_xep_phong
      FROM nhan_su n WHERE n.id = ?
  `).bind(nhanSuId).first();
  if (!r || !r.ql_id)
    return { id: null, nguon: (r && r.chua_xep_phong) ? 'CHUA_XEP_PHONG_BAN' : 'KHONG_CO_QUAN_LY' };
  return { id: r.ql_id, nguon: r.theo_quan_ly ? 'QUAN_LY_ID' : 'TRUONG_PHONG_ID' };
}

/* ==========================================================================
   VỊ TỪ "NGƯỜI GỬI THUỘC BAN GIÁM ĐỐC"
   ---------------------------------------------------------------------------
   Sếp Bùi Thị Ngọc chốt 10/09/2026:
       "Các yêu cầu của ban giám đốc thì không cần duyệt đâu."

   VÌ SAO KHÔNG DÙNG RIÊNG CỜ `tai_khoan.duyet_gopy`:
   cờ đó là thứ PHẢI NHỚ BẬT bằng tay cho từng tài khoản. Đo được ngày
   10/09/2026 trên bản thật: Bùi Thị Ngọc `duyet_gopy = 1`, Nguyễn Duy Phong
   — GIÁM ĐỐC — `duyet_gopy = 0`, mọi người khác 0. Nghĩa là luật Sếp vừa chốt
   KHÔNG chạy cho chính người đứng đầu công ty. Bổ nhiệm người mới vào Ban
   Giám đốc mà quên bật cờ thì hỏng y hệt. Luật phải-nhớ là luật sẽ quên, nên
   luật này đi theo CƠ CẤU (hồ sơ nhân sự nói người đó ở đâu, làm chức gì),
   không đi theo một cái cờ.

   Cờ `duyet_gopy` GIỮ NGUYÊN, không bị thay: nó vẫn là đường Sếp tạm uỷ quyền
   cho một người cụ thể mà không cần đổi cơ cấu. Hai vế nối bằng HOẶC.

   ---------------------------------------------------------------------------
   HAI VẾ, VÌ MỘT VẾ KHÔNG PHỦ ĐỦ NGƯỜI Ở CẢ HAI QUÃNG CSDL
   ---------------------------------------------------------------------------
   ① PHÒNG BAN — hồ sơ nằm trong hộp "Ban Giám đốc".
   ② CHỨC VỤ  — chức danh đúng bằng "Giám đốc" / "Phó Giám đốc".

   Vế ② KHÔNG phải cho đẹp. Sau khi Sếp chạy `xep-lai-co-cau-2026-09.sql`,
   hồ sơ của Sếp Ngọc (Phó Giám đốc) chuyển sang `phong_ban_id = 2` — Phòng
   Vận hành và Hỗ trợ, phòng Sếp trực tiếp phụ trách — chứ KHÔNG còn nằm ở hộp
   Ban Giám đốc. Chỉ có vế ① thì đúng lúc cơ cấu mới lên, Phó Giám đốc rơi
   khỏi luật và lại phải dựa vào cái cờ. Đó là đúng cái bẫy vế này sinh ra để
   tránh.

   TẬP CHỨC VỤ LÀ TẬP ĐÓNG, so KHỚP TRỌN CHUỖI chứ không so "có chứa":
   "Trợ lý Giám đốc" CÓ CHỨA "Giám đốc" nhưng KHÔNG thuộc Ban Giám đốc — so
   kiểu chứa là phát quyền miễn duyệt cho cả trợ lý. Nhận cả bản có dấu lẫn
   bản không dấu vì `nhan_su.chuc_vu` là ô chữ tự do do HCNS gõ.
   ========================================================================== */

/* Hàng "Ban Giám đốc" ở quãng CSDL CŨ — bảng `phong_ban` 4 hàng phẳng, chưa
   có cột `cap`. Đây là ĐƯỜNG LUI CHUYỂN TIẾP, sống đúng tới lúc Sếp chạy
   `them-phongban-ba-tang.sql`; từ đó trở đi nhánh này không còn được chạy vì
   cột `cap` đã tồn tại và nói thẳng hộp nào là cấp công ty.
   Số 1 lấy từ chính `xep-lai-co-cau-2026-09.sql` ("id 1 Ban Giám đốc → giữ
   tên, thành cấp CÔNG TY") — không phải đoán. */
const BAN_GIAM_DOC_ID_CU = 1;

/* Cấp của hộp Ban Giám đốc ở quãng CSDL MỚI. Tập giá trị đóng đã có CHECK ở
   `them-phongban-ba-tang.sql`: 'cong_ty' | 'phong' | 'nhom'. */
const CAP_CONG_TY = 'cong_ty';

const CHUC_VU_BAN_GIAM_DOC = new Set([
  'giám đốc', 'phó giám đốc',        // bản có dấu — cách HCNS gõ đúng chuẩn
  'giam doc', 'pho giam doc'         // bản không dấu — hồ sơ cũ nhập vội
]);

/* CẮT PHẦN KIÊM NHIỆM TRƯỚC KHI SO.
   Hồ sơ thật ngày 10/09/2026 ghi "Giám đốc kiêm TP. Kinh doanh - MKT" và
   "Phó Giám đốc kiêm TP. Support" — chức kiêm nhiệm thời còn hai pháp nhân.
   Khớp TRỌN chuỗi thì không cái nào trúng: Giám đốc còn lọt nhờ vế phòng ban,
   nhưng Phó Giám đốc trượt CẢ HAI vế và chỉ còn sống nhờ cờ `duyet_gopy` đặt
   tay trên tài khoản — đúng thứ "luật phải nhớ" mà vị từ này sinh ra để bỏ đi.
   Xoá cờ đó một cái là luật Sếp vừa chốt thôi phủ tới Phó Giám đốc, mà không
   ai biết, vì ai cũng đã tin luật chạy theo cơ cấu rồi.

   Cắt tại " kiêm ", KHÔNG nới thành so-có-chứa: so-có-chứa thì "Trợ lý Giám
   đốc" cũng được miễn duyệt. Phần đầu vẫn phải khớp TRỌN.

   ⚠️ Còn sót: "Phó Giám đốc điều hành" vẫn trượt. Đường sạch là buộc chức vụ
   vào danh mục `chuc_danh` đóng thay cho ô chữ HCNS gõ tay — việc riêng. */
function chuanHoaChucVu(s) {
  const t = String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  return t.split(/ ki[êe]m /)[0].trim();
}

/* Hộp phòng ban này có phải Ban Giám đốc không — CHẠY ĐÚNG Ở CẢ HAI QUÃNG.

   ĐỌC PHÒNG THỦ, đúng khuôn `docPhien()` ở src/auth.js:191-195: bắt ĐÚNG lỗi
   "no such column" rồi chạy lại bằng câu không có cột `cap`. Mọi lỗi CSDL
   khác vẫn ném ra như cũ — `catch` trần đọc một cú nghẽn D1 thành "chưa có
   cột" và đó là một lỗi thật (REV-0058 ①).

   HỎNG THEO CHIỀU AN TOÀN: không tìm thấy hàng, hộp đã tắt (`hoat_dong = 0`),
   hay `phong_ban_id` trống → trả FALSE. False ở đây nghĩa là phiếu đi qua
   cổng duyệt bình thường — chiều bảo thủ, không phải chiều lọt.

   Vì sao nhánh lui KHÔNG trả thẳng false: false ở quãng CSDL cũ là luật Sếp
   vừa chốt KHÔNG chạy được ngày hôm nay, tức chính cái lỗi đang vá. Nhánh lui
   phải trả lời ĐÚNG cho quãng cũ, và nó làm thế bằng số hiệu hàng đã biết. */
async function laPhongBanGiamDoc(env, phongBanId) {
  if (phongBanId == null || phongBanId === '') return false;
  try {
    const r = await env.DB.prepare(
      'SELECT cap FROM phong_ban WHERE id = ? AND hoat_dong = 1').bind(phongBanId).first();
    return !!r && String(r.cap) === CAP_CONG_TY;
  } catch (e) {
    if (!laLoiThieuCot(e)) throw e;             // ① chưa có cột `cap` — quãng CSDL cũ
    const r = await env.DB.prepare(
      'SELECT id FROM phong_ban WHERE id = ? AND hoat_dong = 1').bind(phongBanId).first();
    return !!r && Number(r.id) === BAN_GIAM_DOC_ID_CU;
  }
}

/** Người gửi có thuộc Ban Giám đốc không. `hoSo` là một dòng đã đọc sẵn có
 *  `chuc_vu` + `phong_ban_id` (phiên đăng nhập cũng đủ hai ô này). */
export async function laBanGiamDoc(env, hoSo) {
  if (!hoSo) return false;
  if (CHUC_VU_BAN_GIAM_DOC.has(chuanHoaChucVu(hoSo.chuc_vu))) return true;
  return await laPhongBanGiamDoc(env, hoSo.phong_ban_id);
}

/* ==========================================================================
   HỒ SƠ NGƯỜI GỬI — TRA LẠI TỪ `nguoiGuiId`, KHÔNG NHẬN TỪ PHIÊN
   ---------------------------------------------------------------------------
   `taoPhieuGopY()` của Văn phòng ảo trước đây chỉ nhận `nguoiGuiId`. Để nó
   biết người gửi có được miễn duyệt không thì có hai cách, và ở đây CHỌN CÁCH
   TRA LẠI TỪ `nguoiGuiId`:

     · MÂY TẠO PHIẾU THAY NGƯỜI KHÁC ĐƯỢC. `vp-may.js:876` truyền
       `nguoi.nhan_su_id` — người đang nói chuyện — chứ không phải chủ phiên.
       Nếu lấy quyền miễn duyệt từ PHIÊN thì một phiếu ghi tên người khác lại
       được miễn theo cờ của người bấm. Quyền miễn phải bám NGƯỜI GỬI ghi trên
       phiếu, không bám người thao tác.
     · MỘT NGUỒN, MỘT CÁCH ĐỌC. Cả hai đường tạo phiếu cùng tra lại từ
       `nguoi_gui_id`, nên không có đường nào đọc quyền theo kiểu riêng và
       không có chỗ cho hai đường lệch nhau lần nữa.

   Giá phải trả: THÊM ĐÚNG MỘT lượt đọc D1 cho đường `gopYGui()` (đường này đã
   có sẵn phiên). Tạo phiếu góp ý là việc thưa — vài phiếu một ngày — không
   phải đường nóng; đổi một lượt đọc lấy việc xoá hẳn một lớp lỗi là đáng.

   `duyet_gopy` nằm ở `tai_khoan`, không nằm ở `nhan_su`, nên phải bắc qua.
   MAX(...) vì một nhân sự có thể có nhiều tài khoản; chỉ tính tài khoản CÒN
   KÍCH HOẠT — cờ trên một tài khoản đã khoá không được cấp quyền cho ai.
   Không có tài khoản nào → MAX trả NULL → Number(null) = 0 → false. */
async function docHoSoNguoiGui(env, nguoiGuiId) {
  if (!nguoiGuiId) return null;
  const cau = (oCo) => `
    SELECT n.id AS nhan_su_id, n.ho_ten, n.chuc_vu, n.phong_ban_id, ${oCo} AS duyet_gopy
      FROM nhan_su n WHERE n.id = ?`;
  const oCo = `(SELECT MAX(t.duyet_gopy) FROM tai_khoan t
                 WHERE t.nhan_su_id = n.id AND t.kich_hoat = 1)`;
  try {
    return await env.DB.prepare(cau(oCo)).bind(nguoiGuiId).first();
  } catch (e) {
    /* Chưa nạp `them-quyen-duyet-gopy.sql` thì cột `duyet_gopy` chưa có. Lùi
       về `0` — cờ tắt, phiếu đi qua cổng duyệt như thường (chiều an toàn),
       CHỨ KHÔNG 500 lúc gửi góp ý. Cùng khuôn với docPhien(). */
    if (!laLoiThieuCot(e)) throw e;             // ② chưa có cột `duyet_gopy`
    return await env.DB.prepare(cau('0')).bind(nguoiGuiId).first();
  }
}

/* ==========================================================================
   MIỄN DUYỆT KHÔNG PHẢI MIỄN GHI VẾT
   ---------------------------------------------------------------------------
   Phiếu đi thẳng vẫn phải để lại MỘT DÒNG lịch sử nói rõ vì sao nó không có
   dấu duyệt — để sau này không ai phải đoán. Mỗi lý do miễn có câu chữ riêng:
   đọc dòng nhật ký là biết phiếu này bỏ qua cổng theo đường nào.

   `nguon` được đóng băng vào `gop_y.duyet_cap1_nguon`; giao diện dịch nó ở
   `public/assets/js/app.js` (bảng NGUON trong phần dựng dòng "✓ Cấp 1"). */
export const LY_DO_MIEN_DUYET = {
  CO_DUYET_GOPY: {
    nguon: 'TU_DUYET_OWNER',
    ghiChu: 'Bỏ qua cả hai cổng duyệt vì người gửi cũng là người duyệt cấp cuối'
          + ' — không ai duyệt góp ý của chính mình. Rủi ro tạm ghi Trung bình.'
  },
  BAN_GIAM_DOC: {
    nguon: 'BAN_GIAM_DOC',
    ghiChu: 'Bỏ qua cả hai cổng duyệt vì người gửi thuộc Ban Giám đốc — Sếp Bùi'
          + ' Thị Ngọc chốt 10/09/2026: "Các yêu cầu của ban giám đốc thì không'
          + ' cần duyệt đâu". Rủi ro tạm ghi Trung bình.'
  }
};

/* ==========================================================================
   NHÁNH QUYẾT ĐỊNH DÙNG CHUNG
   ---------------------------------------------------------------------------
   Ba ca, xét theo đúng thứ tự này:

     ① NGƯỜI GỬI ĐƯỢC MIỄN (giữ cờ duyệt, HOẶC thuộc Ban Giám đốc)
        → vào thẳng 'cho_phan_tich', không qua cổng nào. Chốt luôn mức rủi ro
          MEDIUM (sàn an toàn) — nếu không thì phiếu kẹt ở bước 'da_duyet' vì
          `canRisk` mà không còn cổng nào để chốt rủi ro nữa.
     ② KHÔNG CÓ AI Ở CẤP 1 (trưởng phòng, hoặc hồ sơ chưa xếp phòng ban)
        → bỏ qua cổng 1, đi thẳng lên Sếp. Trước bản vá việc này nằm ở
          next_owner='QL_CAP1' chờ một người KHÔNG TỒN TẠI, và chỉ thoát ra
          được nhờ SLA sau 5 ngày.
     ③ Nhân viên thường → nguyên như cũ: quản lý cấp 1 rồi mới tới Sếp.

   VÒNG LẶP (người vừa giữ cờ, vừa là quản lý cấp 1 của chính mình): ca ① xét
   TRƯỚC và thoát luôn, nên không có đường nào chạy hai ca. Ở tầng dưới,
   GOPY_SQL_QL1 cũng đã cấm một người làm quản lý cấp 1 của chính mình. */
export async function quyetDinhCuaDuyet(env, nguoiGuiId) {
  const hoSo = await docHoSoNguoiGui(env, nguoiGuiId);
  const ql1 = await nguoiDuyetCap1(env, nguoiGuiId);

  let mien = null;
  if (duocDuyetGopY(hoSo)) mien = LY_DO_MIEN_DUYET.CO_DUYET_GOPY;
  else if (await laBanGiamDoc(env, hoSo)) mien = LY_DO_MIEN_DUYET.BAN_GIAM_DOC;

  if (mien) {
    const [cur, nxt] = GOPY_OWNER_THEO_TT.cho_phan_tich;
    return { mien: true, nguon: mien.nguon, trangThai: 'cho_phan_tich',
             cur, nxt, denTrangThai: 'cho_phan_tich', ghiChu: mien.ghiChu, ql1, hoSo };
  }
  if (!ql1.id) {
    return { mien: false, nguon: null, trangThai: 'moi',
             cur: 'NGUOI_GUI', nxt: 'OWNER', denTrangThai: 'moi',
             ghiChu: `Bỏ qua cổng duyệt cấp 1 vì người gửi không có ai duyệt cấp trên (${ql1.nguon}) — chuyển thẳng lên ERP Owner.`,
             ql1, hoSo };
  }
  const [cur, nxt] = GOPY_OWNER_THEO_TT.moi;
  return { mien: false, nguon: null, trangThai: 'moi',
           cur, nxt, denTrangThai: 'moi', ghiChu: null, ql1, hoSo };
}

/* ---- Ghi 1 dòng nhật ký. ĐÂY LÀ CỬA DUY NHẤT để ghi gop_y_lich_su. -------
   - Người bấm  → truyền nguoiDoiId, KHÔNG truyền tacNhan.
   - Máy chạy   → truyền tacNhan ('SLA'/'RUNNER'/...), nguoi_doi_id để NULL,
                  kèm uyQuyenBoiId = người đã cho phép chuỗi tự động này.
   CHECK ở tầng DB chặn mọi kiểu mạo danh kể cả khi hàm này bị gọi sai. */
export async function gopYGhiLichSu(env, gopYId, tu, den, o = {}) {
  const laMay = !!o.tacNhan;
  await env.DB.prepare(`
    INSERT INTO gop_y_lich_su (gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id,
                               nguoi_thuc_hien_loai, tac_nhan, uy_quyen_boi_id, job_id, ghi_chu, luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
  `).bind(gopYId, tu, den,
          laMay ? null : (o.nguoiDoiId || null),
          laMay ? (o.loai || 'he_thong') : 'nguoi',
          laMay ? o.tacNhan : null,
          o.uyQuyenBoiId || null, o.jobId || null,
          (o.ghiChu || null)).run();
}

/* ---- ĐỒNG HỒ SLA — CỬA THỨ 14 (REV-0030 lỗi 1) --------------------------
   Một cột RIÊNG `cho_duyet_tu_luc`, tách hẳn khỏi `cap_nhat_luc`. Nó chỉ được
   đóng dấu khi việc THẬT SỰ vào một hàng chờ mới (gửi mới · qua một cổng
   duyệt · đổi trạng thái), không bao giờ vì một lần lưu tại chỗ.

   PHÒNG THỦ như docPhien(): chưa nạp migration thì nuốt đúng lỗi "no such
   column" — đồng hồ lùi về `cap_nhat_luc` như cũ, chứ không 500 khi gửi góp ý. */
export async function gopYDongDauChoDuyet(env, id) {
  if (!id) return false;
  try {
    await env.DB.prepare(
      `UPDATE gop_y SET cho_duyet_tu_luc = datetime('now', '+7 hours') WHERE id = ?`).bind(id).run();
    return true;
  } catch (e) {
    if (!laLoiThieuCot(e)) throw e;             // ③ chưa có cột `cho_duyet_tu_luc`
    return false;
  }
}

/* ==========================================================================
   TẠO PHIẾU GÓP Ý — CỬA DUY NHẤT
   ---------------------------------------------------------------------------
   Cả `gopYGui()` (người tự bấm gửi) lẫn `taoPhieuGopY()` (Mây bóc câu nói)
   đều đi qua đây. Muốn thêm một đường tạo phiếu thứ ba thì gọi hàm này —
   KHÔNG chép câu INSERT ra chỗ khác.

   `tanSuat` / `dinhKem` chỉ có ở đường người tự bấm gửi (form có hai ô đó);
   đường Văn phòng ảo để trống. Đó là khác biệt DỮ LIỆU, không phải khác biệt
   LUẬT — nên vẫn chung một hàm.
   ========================================================================== */
export async function taoPhieuGopYChung(env, d) {
  const { nguoiGuiId, tieuDe, boiCanh, vuongODau, mongMuon } = d;
  const tanSuat = d.tanSuat ?? null;
  const khuVuc  = d.khuVuc  ?? null;
  const dinhKem = d.dinhKem ?? null;

  const qd = await quyetDinhCuaDuyet(env, nguoiGuiId);
  // Người được miễn: đóng dấu risk + cả hai cổng duyệt NGAY lúc tạo.
  const luc = qd.mien ? "datetime('now', '+7 hours')" : 'NULL';

  const r = await env.DB.prepare(`
    INSERT INTO gop_y (nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon, tan_suat, khu_vuc, dinh_kem,
                       trang_thai, current_owner, next_owner, tao_luc,
                       risk, risk_chot_boi_id, risk_chot_luc,
                       duyet_cap1_boi_id, duyet_cap1_luc, duyet_cap1_nguon,
                       duyet_owner_boi_id, duyet_owner_luc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'),
            ?, ?, ${luc},
            ?, ${luc}, ?,
            ?, ${luc})
  `).bind(nguoiGuiId, tieuDe, boiCanh, vuongODau, mongMuon, tanSuat, khuVuc, dinhKem,
          qd.trangThai, qd.cur, qd.nxt,
          qd.mien ? 'MEDIUM' : null, qd.mien ? nguoiGuiId : null,
          qd.mien ? nguoiGuiId : null, qd.mien ? qd.nguon : null,
          qd.mien ? nguoiGuiId : null).run();

  const id = r?.meta?.last_row_id;
  if (!id) return null;

  // Đồng hồ hàng chờ bắt đầu chạy TỪ ĐÂY (cửa 14).
  await gopYDongDauChoDuyet(env, id);

  /* BỎ QUA NHƯNG KHÔNG ÂM THẦM. Ca ③ (nhân viên thường) không có gì bất
     thường để giải thích nên `ghiChu` rỗng và không ghi dòng nào. */
  if (qd.ghiChu) {
    await gopYGhiLichSu(env, id, 'moi', qd.denTrangThai, {
      nguoiDoiId: nguoiGuiId, ghiChu: qd.ghiChu
    });
  }

  return { id, tieu_de: tieuDe, trang_thai: qd.trangThai,
           current_owner: qd.cur, next_owner: qd.nxt,
           mien_duyet: qd.mien, nguon_mien: qd.nguon };
}
