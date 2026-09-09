/* ==========================================================================
   MÂY — FRONT DESK / ORCHESTRATOR CỦA VĂN PHÒNG ẢO
   ---------------------------------------------------------------------------
   Một cửa duy nhất cho nhân sự thật. Người dùng KHÔNG phải biết nên hỏi ai —
   họ nói tự nhiên, Mây tự phân loại rồi đưa đúng chuyên gia (Sếp Ngọc
   06/09/2026: "Không để người dùng phải biết nên hỏi Agent nào").

   LUỒNG:
     người hỏi → Mây phân loại → chọn chuyên gia → chạy công cụ tra số thật
     → chuyên gia trả lời → Owner Gate nếu cần → trả về + lưu

   VÌ SAO HAI LƯỢT GỌI AI, KHÔNG DÙNG TOOL CALLING:
   Hồ Ly đã chạy thật trong production bằng cách bảo model trả JSON rồi bóc
   JSON ra (xem hoLyTuDongTriage trong src/index.js). Cách đó đã chứng minh
   chạy được trên chính model này, còn tool calling của Workers AI thì chưa ai
   trong repo thử. Dùng lại đường đã đi thay vì mở đường mới (Rule 5), nhất là
   khi đường mới có thể im lặng trả sai.

     Lượt 1 — Mây đọc câu hỏi, trả JSON: loại tương tác, chuyên gia nào, cần
              tra dữ liệu gì, có phải việc rủi ro cao không.
     (giữa hai lượt: code chạy công cụ, lấy số thật từ D1)
     Lượt 2 — chuyên gia trả lời, có sẵn số liệu trong tay.

   BA LOẠI TƯƠNG TÁC (mục VII của Sếp) — cố ý phân biệt để KHÔNG biến mọi câu
   chat thành task:
     CHAT           tra cứu, hỏi đáp. Không tạo gì cả.
     ANALYSIS       cần chuyên gia phân tích. Trả lời sâu, vẫn không tạo task.
     ACTION_REQUEST cần thay đổi/thực thi. Mới tạo yêu cầu vào hàng đợi.
     HUAN_LUYEN     dạy nghề cho trợ lý ảo. Ghi kỹ năng vào hồ sơ phòng đó.
     GOP_Y_ERP      góp ý về chính phần mềm ERP. Mở phiếu có mã số để theo dõi.

   MÂY KHÔNG LÀM: không trở thành chuyên gia của mọi lĩnh vực, không tự quyết
   thay Owner, không tự đổi trạng thái yêu cầu rủi ro cao.
   ========================================================================== */

import { AGENTS, agentTheoId, agentChoVaiTro, ghepPrompt, ghepPromptNgan } from './agents-vp.js';
import { congCuCuaAgent, chayCongCu, CONG_CU } from './vp-cong-cu.js';
import { taoPhieuGopY } from './vp-gopy.js';
import { docLuat, kiemTruocKhiGhi } from './vp-luat.js';
import { demLuotAI } from './vp-dem-ai.js';

/* Cùng model Hồ Ly đang dùng thật trong production. Đổi model là đổi một chỗ. */
export const MAY_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/* ==========================================================================
   CÔNG TẮC: MÂY CÓ ĐƯỢC TỰ TẠO ĐẦU VIỆC CHO NGƯỜI THẬT KHÔNG?
   --------------------------------------------------------------------------
   false  = Mây phân tích rồi ĐỀ XUẤT "nên giao việc này cho ai", nhưng không
            ghi gì vào bảng cong_viec. Người quyết vẫn là người.
   true   = Mây tự tạo đầu việc, giao đích danh vào hàng việc của người đó.

   Đang để false. Sếp Ngọc chốt 06/09/2026, giai đoạn golive dần: nhân sự nhận
   một đầu việc do máy tự đẻ ra — trong khi chưa ai kiểm chứng Mây hiểu đúng câu
   hỏi hay chưa — là kiểu sai khó gỡ nhất, vì người ta sẽ đi làm thật.

   BẬT KHI NÀO: sau vài ngày Sếp chạy thật, thấy phần "nên giao cho ai" nó đề
   xuất đúng người đúng việc thì đổi thành true. Code giao việc đã viết xong và
   có kiểm tra người nhận có thật + chống giao trùng — chỉ chờ bật.
   ========================================================================== */
export const MAY_DUOC_TU_GIAO_VIEC = false;

/* Việc rủi ro cao — Mây KHÔNG được tự quyết, phải dừng ở Owner Gate.
   Lấy đúng danh sách Sếp liệt kê ở mục XIV. */
const VIEC_RUI_RO_CAO = [
  'chiến lược', 'đầu tư', 'lương', 'sa thải', 'kỷ luật', 'hợp đồng',
  'thanh toán', 'thuế', 'pháp lý', 'điều chỉnh tồn kho', 'phân quyền',
  'xoá dữ liệu', 'nguồn dữ liệu chuẩn'
];

/* ---- Gọi model, bóc JSON ------------------------------------------------
   Model này khi trả đúng JSON thì cho sẵn object; khi trả kèm lời dẫn thì
   phải bóc. Nhận cả hai dạng cho chắc — đúng cách Hồ Ly đang làm. */
function bocJson(tho) {
  if (tho && typeof tho === 'object') return tho;
  const s = String(tho || '');
  const dau = s.indexOf('{');
  const cuoi = s.lastIndexOf('}');
  if (dau < 0 || cuoi <= dau) return null;
  try { return JSON.parse(s.slice(dau, cuoi + 1)); } catch { return null; }
}

/* MỘT CỬA DUY NHẤT GỌI AI TRONG FILE NÀY — nên cũng là chỗ duy nhất đếm.
   Đếm ở từng chỗ gọi (8 chỗ trong file) thì chỗ thứ 9 người sau thêm vào sẽ
   không đếm, và bảng số lặng lẽ nói dối là đang dùng ít hơn thực tế. */
async function goiAI(env, prompt, maxTokens = 900) {
  /* Đếm TRƯỚC khi gọi, không phải sau. Lượt gọi hỏng giữa chừng vẫn tiêu
     Neuron của Cloudflare; chỉ đếm lượt thành công là đếm thiếu đúng những
     lượt đáng lo nhất. */
  await demLuotAI(env, 'may');
  const kq = await env.AI.run(MAY_MODEL, {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens
  });
  return kq && kq.response;
}

/* ==========================================================================
   LƯỢT 1 — MÂY PHÂN LOẠI VÀ ĐỊNH TUYẾN
   ========================================================================== */

/* ==========================================================================
   QUY NGÀY TƯƠNG ĐỐI RA NGÀY THẬT
   --------------------------------------------------------------------------
   Bắt mô hình tự tính "hôm qua là ngày mấy" là chỗ nó sai thường xuyên: nó trả
   về chuỗi "hôm qua" hoặc tính lệch một ngày, công cụ báo lỗi định dạng, rồi
   trợ lý quay ra HỎI NGƯỢC người dùng hôm qua là ngày nào — vô lý với người đang
   ngồi trước máy. Tính sẵn trong code rồi đưa nguyên bảng vào prompt: tốn vài
   chục token, đổi lại bỏ hẳn một loại lỗi.
   ========================================================================== */
function bangNgay(homNay) {
  const d = new Date(homNay + 'T00:00:00Z');
  const dich = n => {
    const x = new Date(d.getTime() + n * 86400000);
    return x.toISOString().slice(0, 10);
  };
  const thu = d.getUTCDay();                 // 0 = Chủ nhật
  const dauTuan = dich(-((thu + 6) % 7));    // về Thứ Hai
  const dauThang = homNay.slice(0, 8) + '01';
  const thangTruoc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  const cuoiThangTruoc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));

  return [
    'hôm nay = ' + homNay,
    'hôm qua = ' + dich(-1),
    '7 ngày gần đây = ' + dich(-6) + ' đến ' + homNay,
    '30 ngày gần đây = ' + dich(-29) + ' đến ' + homNay,
    'tuần này = ' + dauTuan + ' đến ' + homNay,
    'tháng này = ' + dauThang + ' đến ' + homNay,
    'tháng trước = ' + thangTruoc.toISOString().slice(0, 10) + ' đến ' + cuoiThangTruoc.toISOString().slice(0, 10)
  ].join('; ');
}

function promptPhanLoai(cauHoi, dsAgent, nguoi, homNay) {
  const bangAgent = dsAgent
    .map(a => `- ${a.id}: ${a.chuc_danh} — ${a.mo_ta}`)
    .join('\n');

  const bangCongCu = Object.entries(CONG_CU)
    .map(([ten, c]) => {
      // Kèm đúng tên tham số. Thiếu dòng này mô hình tự đặt tên (ngay_bat_dau,
      // from_date...) rồi công cụ báo lỗi định dạng — mất trắng một lượt gọi AI.
      const ts = Object.keys(c.tham_so?.properties || {});
      return `- ${ten}${ts.length ? ' (' + ts.join(', ') + ')' : ''}: ${c.mo_ta}`;
    })
    .join('\n');

  return `Bạn là MÂY — lễ tân kiêm điều phối của Văn phòng ảo Alpha Green Commerce.

Việc của bạn ở bước này: đọc câu người ta vừa hỏi, rồi quyết định đưa cho ai và cần tra dữ liệu gì. KHÔNG trả lời câu hỏi ở bước này.

NGƯỜI HỎI: ${nguoi.ho_ten} — ${nguoi.chuc_vu}. Hôm nay ${homNay}.

CÂU HỎI:
"""
${cauHoi}
"""

CÁC CHUYÊN GIA ĐANG TRỰC (chỉ được chọn trong danh sách này):
${bangAgent}

CÔNG CỤ TRA DỮ LIỆU THẬT TRONG ERP:
${bangCongCu}

PHÂN LOẠI TƯƠNG TÁC — chọn đúng một:
- CHAT: hỏi đáp, tra cứu đơn giản. Không cần tạo việc gì.
- ANALYSIS: cần chuyên gia phân tích sâu, so sánh, phản biện. Vẫn không tạo việc.
- ACTION_REQUEST: người ta muốn THAY ĐỔI thứ gì đó trong hệ thống hoặc cách làm việc, cần ai đó thực thi.
- GOP_Y_ERP: người ta nói về CHÍNH PHẦN MỀM ERP NÀY — báo lỗi, xin thêm nút, xin sửa màn hình, chê chỗ khó dùng. Dấu hiệu: nói về giao diện, thao tác, chức năng của ERP, không phải về hàng hoá hay đơn hàng.
  Ví dụ: "màn kho load chậm quá", "muốn thêm nút xuất Excel ở đơn hoàn", "nhập liệu chỗ này bấm nhiều bước quá", "bấm lưu mà không thấy gì".
  KHÔNG nhầm với ANALYSIS: "doanh số tụt vì sao" là hỏi việc kinh doanh, không phải góp ý phần mềm.
  Loại này luôn chuyển cho phòng IT (agent = "it").
- HUAN_LUYEN: người ta muốn DẠY NGHỀ cho đội trợ lý ảo — "cần học soạn thảo văn bản", "học cách đọc hợp đồng nhà cung cấp", "dạy cách xử lý khiếu nại". Dấu hiệu: nói về NĂNG LỰC CỦA TRỢ LÝ chứ không hỏi số liệu hay xin làm việc gì.
  Việc DUY NHẤT của bạn với loại này: nhận ra nó, rồi chọn đúng phòng sở hữu kỹ năng đó.
    · soạn thảo công văn, quyết định, nội quy, hồ sơ nhân sự → hcns
    · hợp đồng, điều khoản, tuân thủ, công bố sản phẩm, quảng cáo → phapche
    · bán hàng, chăm khách, xử lý khiếu nại, vận hành gian hàng → kinhdoanh
    · nội dung, hình ảnh, chiến dịch, thương hiệu → mkt
    · nhập xuất, kiểm kê, đóng gói, giao vận, hạn dùng → khovan
    · hoá đơn, thuế, công nợ, giá vốn, dòng tiền → ketoan
    · phần mềm, dữ liệu, tự động hoá, tính năng ERP → it
    · chiến lược, ưu tiên, cơ cấu tổ chức → trolygd
  KHÔNG tự phán kỹ năng đó học được hay không, KHÔNG tự nghĩ nội dung bài học —
  đó là việc của trưởng phòng, họ mới biết nghề. Bạn là lễ tân: nhận và chuyển đúng cửa.

RỦI RO CAO (can_owner_gate = true) nếu câu hỏi dính tới: ${VIEC_RUI_RO_CAO.join(', ')}.

CHỈ trả về JSON đúng khuôn sau, không chào hỏi, không giải thích thêm:
{
  "loai": "CHAT" | "ANALYSIS" | "ACTION_REQUEST" | "HUAN_LUYEN" | "GOP_Y_ERP",
  "agent": "<id chuyên gia phù hợp nhất>",
  "agent_phu": ["<id chuyên gia khác nên hỏi thêm, tối đa 2, để [] nếu không cần>"],
  "cong_cu": ["<tên công cụ cần chạy, để [] nếu không cần tra số>"],
  "tham_so": { "<tên công cụ>": { } },
  "can_owner_gate": true | false,
  "tom_tat": "<một câu nói lại người ta đang cần gì>"
}

Quy tắc chọn chuyên gia:
- Chọn theo NỘI DUNG câu hỏi, không theo chức vụ người hỏi.
- Câu hỏi cần nhiều phòng cùng nhìn (ví dụ "có nên tuyển thêm người kho không") thì đặt agent chính là người sát việc nhất, và điền agent_phu những phòng còn lại.
- Câu hỏi về chiến lược, ưu tiên nguồn lực, có nên làm hay không: chọn trolygd.
- Câu hỏi về ai làm, phối hợp giữa các phòng, kế hoạch thực thi: chọn trolypgd.
- Không chắc thì chọn chuyên gia gần nhất và để cong_cu rỗng.

Quy tắc chọn công cụ:
- Chỉ chọn công cụ thật sự cần cho câu hỏi này. Không chọn thừa — mỗi công cụ chạy đều tốn thời gian của người đang chờ.
- Ngày tháng trong tham_so BẮT BUỘC dạng YYYY-MM-DD. Không được để nguyên chữ "hôm qua", "tuần này".
- Đã tính sẵn cho bạn, cứ lấy thẳng: ${bangNgay(homNay)}.
- Người hỏi không nói mốc thời gian mà câu hỏi cần một mốc thì lấy 7 ngày gần đây.`;
}

/* ==========================================================================
   LƯỢT 2 — CHUYÊN GIA TRẢ LỜI
   ========================================================================== */

function promptTraLoi(agent, nguoi, homNay, cauHoi, duLieu, lichSu, yKienPhu, kyNang = [], coAnhKem = false) {
  const heThong = ghepPrompt(agent, nguoi, homNay, kyNang);

  const phanDuLieu = duLieu.length
    ? duLieu.map(d =>
        `### Kết quả công cụ "${d.ten}"\n${JSON.stringify(d.ket_qua)}`
      ).join('\n\n')
    : '(Không tra công cụ nào cho câu này.)';

  /* Chỉ lấy 6 lượt gần nhất, mỗi lượt cắt còn 600 ký tự. Mạch trò chuyện chỉ
     cần đủ để hiểu "cái đó" đang trỏ vào đâu; nạp lại cả cuộc đời hội thoại vào
     MỌI lượt gọi AI là khoản tốn token âm thầm lớn nhất trong hệ thống này. */
  const lichSuGan = lichSu.slice(-6).map(t => ({ vai: t.vai, noi_dung: String(t.noi_dung || '').slice(0, 600) }));
  const phanLichSu = lichSuGan.length
    ? lichSuGan.map(t => `${t.vai === 'nguoi' ? 'Người hỏi' : 'Bạn'}: ${t.noi_dung}`).join('\n')
    : '(Đây là câu đầu tiên của cuộc trò chuyện.)';

  /* Trưởng phòng chức năng TIẾP NHẬN rồi PHÂN BỔ — đúng luồng Sếp Ngọc chốt
     06/09/2026: Mây tiếp nhận → chuyển xuống trưởng phòng → trưởng phòng phân
     bổ → làm và tự phản biện → trưởng phòng phản biện lần cuối → trả về Mây →
     Mây báo người gửi.

     Bắt nói rõ phân bổ phần nào cho phòng nào là chỗ then chốt: có phân bổ thì
     vòng sau mới có cái CỤ THỂ để phản biện. Không có thì các phòng chỉ bình
     luận chung chung về một ý tưởng chung chung. */
  /* Ảnh: nói THẲNG là không xem được. Bỏ trống chỗ này thì mô hình thấy chữ
     "ảnh" trong câu hỏi và bắt đầu bình luận về thứ nó chưa từng thấy — đúng
     kiểu bịa mà hiến pháp cấm. Thà hỏi lại người gửi một câu. */
  const phanAnh = coAnhKem
    ? `
==================================================
NGƯỜI GỬI CÓ ĐÍNH KÈM MỘT ẢNH
==================================================

Bạn KHÔNG XEM ĐƯỢC ảnh đó — bạn chỉ đọc được chữ. Tuyệt đối không suy đoán
trong ảnh có gì.

Nếu câu hỏi phải nhìn ảnh mới trả lời được thì nói thẳng: bạn không xem được
ảnh, và nhờ người gửi gõ ra vài dòng ảnh đang hiện cái gì (con số nào, màn hình
nào, thông báo lỗi ra sao). Ảnh vẫn được lưu lại trong hội thoại để NGƯỜI đọc,
và sẽ đi kèm nếu việc này được giao ra cho người thật.
`
    : '';

  const phanPhanBo = (yKienPhu === null)
    ? `

Bạn là trưởng phòng chức năng vừa được Mây chuyển việc này xuống. Trước khi trả lời, làm đủ hai việc:
1. TIẾP NHẬN — nói rõ bạn hiểu người ta đang cần gì. Hiểu sai đề thì mọi thứ sau đó vô nghĩa.
2. PHÂN BỔ — kết thúc bằng đúng một dòng:
   PHÂN BỔ: <tên phòng> lo <phần việc gì>; <tên phòng khác> lo <phần việc gì>
   Việc nào bạn tự làm hết thì ghi "PHÂN BỔ: tự làm trong phòng".
   Chỉ phân bổ phần THẬT SỰ cần chuyên môn phòng khác — kéo thêm phòng vào cho đông là phí thời gian của họ.`
    : '';

  const phanPhu = yKienPhu && yKienPhu.length
    ? '\n\n## Ý KIẾN CÁC PHÒNG KHÁC (Mây đã hỏi giúp)\n' +
      yKienPhu.map(y => `### ${y.chuc_danh}\n${y.noi_dung}`).join('\n\n') +
      '\n\nHãy tổng hợp cả những ý kiến trên vào câu trả lời của bạn. Nếu bạn KHÔNG đồng ý với phòng nào, nói rõ chỗ không đồng ý và vì sao — đừng gộp bừa cho êm.'
    : '';

  return `${heThong}

==================================================
DỮ LIỆU THẬT VỪA TRA TỪ ERP
==================================================

${phanDuLieu}

QUAN TRỌNG: mọi con số bạn nói ra phải lấy từ phần dữ liệu trên. Không có số ở đó thì nói rõ CHƯA ĐỦ DỮ LIỆU và cần tra thêm gì — TUYỆT ĐỐI không tự nghĩ ra số.
${phanPhu}

==================================================
MẠCH TRÒ CHUYỆN TRƯỚC ĐÓ
==================================================

${phanLichSu}

==================================================
CÂU HỎI LÚC NÀY
==================================================

${cauHoi}

${phanAnh}
Trả lời bằng tiếng Việt, đi thẳng vào việc.${phanPhanBo}`;
}

/* ==========================================================================
   VÒNG 2 — MỘT PHÒNG KHÁC PHẢN BIỆN PHƯƠNG ÁN
   --------------------------------------------------------------------------
   Khác hẳn promptTraLoi: phòng này KHÔNG trả lời câu hỏi gốc theo cách của
   mình. Việc của họ là soi thủng phương án đồng nghiệp vừa đưa ra, từ góc
   chuyên môn của phòng mình. Nêu ý kiến song song thì ba phòng ra ba câu trả
   lời rời rạc; soi vào một phương án cụ thể thì mới lòi ra chỗ hổng.
   ========================================================================== */

function promptPhanBien(agentPhu, nguoi, homNay, cauHoi, phuongAn, agentChinh, duLieu) {
  /* Bản rút gọn: phòng đi soi phương án không cần format phân tích 11 mục hay
     thang tái cơ cấu — thứ đó dành cho người CHỦ TRÌ phương án. Cắt ~59%. */
  const heThong = ghepPromptNgan(agentPhu, nguoi, homNay);

  const phanDuLieu = duLieu.length
    ? duLieu.map(d => `### Kết quả công cụ "${d.ten}"\n${JSON.stringify(d.ket_qua)}`).join('\n\n')
    : '(Không tra công cụ nào cho việc này.)';

  return `${heThong}

==================================================
BẠN ĐANG NGỒI HỌP — VIỆC CỦA BẠN LÀ PHẢN BIỆN
==================================================

Người hỏi: ${nguoi.ho_ten || nguoi.tai_khoan}
Câu hỏi gốc: ${cauHoi}

${agentChinh.chuc_danh} vừa tiếp nhận việc này và PHÂN BỔ một phần cho bạn.
Phương án và phần phân bổ ở dưới. Bạn làm hai việc, theo thứ tự:

A. NHẬN PHẦN CỦA MÌNH — nói rõ phần được phân bổ cho ${agentPhu.chuc_danh} thì làm thế nào,
   rồi TỰ PHẢN BIỆN chính cách làm đó: chỗ nào trong cách làm của bạn có thể hỏng?
   Tự soi mình trước khi soi người là thứ phân biệt người làm nghề với người nói cho có.
B. SOI PHƯƠNG ÁN CHUNG — sau đó mới soi phương án của ${agentChinh.chuc_danh}, từ góc
   ${agentPhu.chuc_danh}. KHÔNG trả lời lại câu hỏi gốc theo cách riêng của bạn.

--- PHƯƠNG ÁN CỦA ${agentChinh.chuc_danh.toUpperCase()} ---
${phuongAn}
--- HẾT PHƯƠNG ÁN ---

DỮ LIỆU THẬT ĐANG CÓ (cùng bộ dữ liệu họ dùng):
${phanDuLieu}

BẮT BUỘC SOI ĐỦ HAI CỬA NÀY TRƯỚC (Sếp Ngọc chốt 06/09/2026):
1. PHÁP LÝ — phương án này có vướng gì không: hợp đồng, thuế, hoá đơn, nhãn mác,
   công bố sản phẩm, an toàn thực phẩm, quảng cáo sai, luật lao động, chính sách
   sàn? Có phương án khác an toàn hơn về pháp lý mà vẫn đạt mục tiêu không?
2. TÀI CHÍNH — phương án này tốn gì và được gì: tiền mặt bỏ ra, dòng tiền, biên
   lợi nhuận, hàng tồn chết, phí sàn, chi phí cơ hội? Có cách rẻ hơn mà kết quả
   tương đương không?

Chỉ khi hai cửa trên sạch mới xét đến tiện, nhanh, dễ làm.

Sau đó nói tiếp phần chuyên môn riêng của phòng bạn. Viết ngắn, gạch đầu dòng:
- CHỖ SAI / CHỖ HỔNG: cụ thể, chỉ đúng câu chữ trong phương án.
- RỦI RO HỌ CHƯA TÍNH: nói rõ nếu xảy ra thì mất gì.
- ĐỀ XUẤT SỬA: sửa thế nào cho đúng, hoặc phương án thay thế tối ưu hơn.
- Nếu bạn thấy phương án ổn thì nói thẳng "Tôi đồng ý" kèm lý do — KHÔNG bịa ra
  lỗi để tỏ ra có đóng góp.

Không có dữ liệu để khẳng định thì nói "chưa đủ dữ liệu", không đoán số.`;
}

/* ==========================================================================
   VÒNG 3 — CHUYÊN GIA CHÍNH NGHE PHẢN BIỆN RỒI CHỐT
   ========================================================================== */

function promptChot(agent, nguoi, homNay, cauHoi, phuongAn, phanBien, duLieu, kyNang = []) {
  const heThong = ghepPrompt(agent, nguoi, homNay, kyNang);

  const phanDuLieu = duLieu.length
    ? duLieu.map(d => `### Kết quả công cụ "${d.ten}"\n${JSON.stringify(d.ket_qua)}`).join('\n\n')
    : '(Không tra công cụ nào cho việc này.)';

  const phanPhanBien = phanBien.length
    ? phanBien.map(p => `### ${p.chuc_danh} phản biện\n${p.noi_dung}`).join('\n\n')
    : '(Không phòng nào phản biện được.)';

  return `${heThong}

==================================================
VĂN PHÒNG VỪA HỌP XONG — GIỜ BẠN CHỐT
==================================================

Câu hỏi gốc: ${cauHoi}

--- PHƯƠNG ÁN BAN ĐẦU CỦA BẠN ---
${phuongAn}
--- HẾT ---

--- CÁC PHÒNG PHẢN BIỆN ---
${phanPhanBien}
--- HẾT ---

DỮ LIỆU THẬT:
${phanDuLieu}

Đây là lượt PHẢN BIỆN LẦN CUỐI của bạn với tư cách trưởng phòng chức năng: soi lại
toàn bộ phương án sau khi đã nghe các phòng, rồi TRẢ KẾT QUẢ VỀ CHO MÂY để Mây báo
lại người gửi. Yêu cầu:

1. Ý phản biện nào ĐÚNG thì sửa phương án theo, đừng bảo vệ cái sai của mình.
2. Ý phản biện nào SAI thì nói rõ vì sao bạn không theo — có quyền giữ ý kiến,
   nhưng phải nêu lý do, không được lờ đi.
3. TRƯỚC KHI CHỐT, tự kiểm hai cửa (Sếp Ngọc chốt 06/09/2026): phương án bạn đưa
   ra đã là phương án TỐI ƯU NHẤT VỀ PHÁP LÝ VÀ TÀI CHÍNH trong các phương án khả
   thi chưa? Nếu có phương án khác an toàn hơn về pháp lý hoặc rẻ hơn về tiền mà
   vẫn đạt mục tiêu, phải chọn phương án đó và nói rõ vì sao chọn nó.
4. Nếu các phòng vẫn chưa thống nhất và việc này rủi ro cao về PHÁP LÝ, VẬN HÀNH
   hoặc CON NGƯỜI thì KHÔNG tự chốt — nêu 2 phương án kèm cái giá của từng cái,
   ghi rõ cần Sếp quyết.

5. CẤM BỊA SỐ Ở PHẦN "CÁI GIÁ". Đây là chỗ dễ sai nhất: viết "giảm lợi nhuận 5%,
   tăng doanh số 15%" nghe rất chuyên nghiệp nhưng nếu con số đó không có trong
   phần DỮ LIỆU THẬT ở trên thì nó là bịa, và Sếp sẽ quyết dựa trên một con số
   không tồn tại. Cái giá phải viết theo một trong hai cách:
   · Có số trong dữ liệu thật → trích đúng số đó, nói rõ lấy từ đâu.
   · Không có số → mô tả bằng lời ("ăn vào biên lợi nhuận, chưa đo được bao nhiêu")
     rồi ghi rõ CẦN ĐO GÌ để biết: cần giá vốn mã nào, cần doanh số kỳ nào.
   Nói "chưa đo được" là câu trả lời hợp lệ. Bịa một con số cho tròn ý thì không.

Viết cho người hỏi đọc, không viết như biên bản họp. KHÔNG cần tự giới thiệu và
KHÔNG cần ghi "đã hỏi thêm phòng nào" ở cuối — Mây sẽ nói phần đó khi báo lại
người gửi, bạn ghi nữa là lặp.

Tiếng Việt, đi thẳng vào việc.`;
}

/* ==========================================================================
   HÀM CHÍNH — MỘT LƯỢT HỎI MÂY
   --------------------------------------------------------------------------
   Trả về:
     { tom_tat, loai, agent, agent_phu, can_owner_gate, tra_loi, da_tra_cuu }
   ========================================================================== */
/* ==========================================================================
   MÂY THÔNG BÁO LẠI CHO NGƯỜI GỬI
   --------------------------------------------------------------------------
   Khâu cuối của luồng Sếp Ngọc chốt 06/09/2026: trưởng phòng trả kết quả về
   Mây, Mây báo lại người đã gửi yêu cầu. Người hỏi chỉ nói chuyện với Mây từ
   đầu tới cuối — đó là ý nghĩa của "một lối vào duy nhất".

   VÌ SAO GHÉP BẰNG CODE, KHÔNG GỌI THÊM MỘT LƯỢT AI:
   · Tốn thêm ~4.000 token mỗi câu hỏi, trong khi Sếp đã chốt văn phòng ảo bắt
     buộc tiết kiệm token.
   · Nguy hiểm hơn: bắt Mây viết lại lời trưởng phòng là mở đường cho tam sao
     thất bản đúng chỗ chết người nhất — con số. Trưởng phòng nói "tồn 412
     thùng", Mây kể lại thành "hơn 400" hoặc tệ hơn là một số khác.
   Nên Mây chỉ nói phần của Mây — ai xử lý, đã bàn với ai — còn nội dung chuyên
   môn giữ NGUYÊN VĂN của trưởng phòng.
   ========================================================================== */
function mayBaoLai({ agent, dsPhuTen, soVong, coOwnerGate, noiDung, nguoiDuyet }) {
  const dan = [];
  dan.push(`Em đã chuyển việc này cho **${agent.chuc_danh}**`);
  if (dsPhuTen.length) {
    dan.push(soVong > 1
      ? `, và phòng bên đã họp ${soVong} vòng với ${dsPhuTen.join(', ')}`
      : `, có hỏi thêm ${dsPhuTen.join(', ')}`);
  }
  if (nguoiDuyet) dan.push(`, rồi **${nguoiDuyet}** duyệt lại`);
  dan.push('. Đây là kết quả:');

  const dau = `_${dan.join('')}_\n\n`;
  const cuoi = coOwnerGate
    ? '\n\n---\n_Việc này em không tự chốt được, đang chờ Sếp quyết. Sếp bảo một câu là em cho chạy tiếp._'
    : '\n\n---\n_Cần em hỏi rõ thêm chỗ nào thì Sếp cứ nhắn tiếp ạ._';

  return dau + noiDung + cuoi;
}

/* ==========================================================================
   CHẶNG DUYỆT CỦA KHỐI ĐIỀU HÀNH
   --------------------------------------------------------------------------
   Sếp Ngọc hỏi 06/09/2026: có nên đi qua khối điều hành trước không?

   Đặt cửa duyệt Ở CUỐI chứ không phải ở đầu. Duyệt đầu thì cấp trên đọc một
   câu hỏi trống trơn, chưa có phương án, chưa có số — góp được đúng vài câu
   chung chung rồi vẫn phải chuyển xuống phòng. Duyệt cuối thì họ đọc một
   phương án đã qua phản biện, có dữ liệu, và câu hỏi của họ trở nên sắc:
   "phòng chốt vậy nhưng có ai lo phần này chưa?"

   Và CHỈ MỞ CỬA NÀY VỚI VIỆC HỆ TRỌNG — chạm nhiều phòng, cần Sếp quyết, hoặc
   là yêu cầu hành động thật. Bắt "doanh số hôm qua bao nhiêu" đi qua hai cấp
   thì thành quan liêu, mà mỗi lượt duyệt tốn thêm khoảng 4.000 token — trái
   đúng cái rule tiết kiệm Sếp vừa đặt.
   ========================================================================== */
function promptDuyet(capTren, nguoi, homNay, cauHoi, ketLuan, agentChinh, dsPhuTen) {
  const heThong = ghepPromptNgan(capTren, nguoi, homNay);

  return `${heThong}

==================================================
BẠN DUYỆT LẦN CUỐI TRƯỚC KHI TRẢ VỀ NGƯỜI GỬI
==================================================

Người gửi: ${nguoi.ho_ten || nguoi.tai_khoan}
Yêu cầu gốc: ${cauHoi}

${agentChinh.chuc_danh} đã tiếp nhận, phân bổ${dsPhuTen.length ? ", họp với " + dsPhuTen.join(", ") : ""},
phản biện lần cuối và chốt như dưới đây. Việc của bạn KHÔNG phải viết lại kết luận
này — mà là nhìn nó từ tầm công ty, chỗ trưởng phòng không nhìn tới.

--- KẾT LUẬN CỦA ${agentChinh.chuc_danh.toUpperCase()} ---
${ketLuan}
--- HẾT ---

Soi đúng bốn chỗ, viết thật ngắn, tối đa 6 dòng:
1. Việc này có đụng phòng nào mà chưa ai hỏi không?
2. Có xung đột với ưu tiên khác của công ty đang chạy không? Alpha Green đang nhắm
   Shopee 120 tỷ và TikTok Shop 20 tỷ trong 12 tháng — việc này đẩy hay kéo mục tiêu đó?
3. Nguồn lực: công ty có 15 người và họ đã kín việc. Làm cái này thì bỏ cái gì?
4. Hai cửa pháp lý và tài chính đã được soi đủ chưa, hay còn chỗ hở?

Kết bằng ĐÚNG MỘT trong ba dòng sau:
DUYỆT: đồng ý, làm được.
DUYỆT CÓ ĐIỀU KIỆN: <điều kiện cụ thể phải có trước khi làm>
CHƯA DUYỆT: <thiếu gì, cần ai làm rõ trước>

Kết luận ổn thì DUYỆT thẳng. KHÔNG bịa ra điều kiện để tỏ ra mình có soi.`;
}

/* ==========================================================================
   HUẤN LUYỆN — TRƯỞNG PHÒNG TỰ SOẠN BÀI CHO CHÍNH MÌNH
   --------------------------------------------------------------------------
   Sếp Ngọc chốt 06/09/2026: "Mây chỉ đơn thuần là lễ tân tiếp nhận và phân
   loại thôi". Nên Mây dừng ở chỗ nhận ra đây là buổi dạy nghề và chuyển đúng
   cửa. Từ đó trở đi là việc của trưởng phòng.

   TRƯỞNG PHÒNG PHẢI TRẢ LỜI HAI CÂU, THEO THỨ TỰ:

   1. Kỹ năng này CÓ CẦN CÔNG CỤ KHÔNG?

      ĐỪNG hiểu câu này thành "tôi đã biết chưa" — dĩ nhiên là chưa, đó chính
      là lý do buổi dạy này diễn ra. Câu hỏi là: giả sử bây giờ bạn ngồi viết
      ra cách làm, bạn viết được không, hay phải mở ERP tra số mới viết nổi?
      Học được: nó là CÁCH LÀM, là quy tắc nghề. "Công văn phải có số hiệu và
      nơi nhận", "hợp đồng nhà cung cấp phải có điều khoản đổi trả hàng cận
      hạn". Đọc xong là làm được, không cần tra gì thêm.
      KHÔNG học được: nó cần DỮ LIỆU hoặc cần thao tác lên hệ thống. "Biết
      tính điểm đặt hàng lại từ tốc độ bán" nghe như kỹ năng, nhưng muốn làm
      thì phải đọc được lịch sử bán của từng mã — mà đó là một công cụ, phải
      có người viết code.

      Đây là chỗ dễ sai nhất và sai thì nguy: nhận bừa một kỹ năng cần dữ liệu
      rồi ghi vào hồ sơ, trợ lý sẽ TIN LÀ MÌNH BIẾT và bắt đầu bịa số ở những
      câu sau. Thà nói "cái này em phải nhờ phòng IT dựng công cụ" — chậm một
      nhịp còn hơn nói sai một cách tự tin.

   2. Nếu học được thì SOẠN BÀI. Trưởng phòng tự viết, vì họ là người biết
      nghề — Mây hay bất cứ ai khác viết hộ thì ra bài học chung chung.
   ========================================================================== */
function promptHocNghe(agent, nguoi, homNay, yeuCau, kyNangDaCo) {
  const heThong = ghepPrompt(agent, nguoi, homNay, kyNangDaCo);

  const daCo = kyNangDaCo.length
    ? kyNangDaCo.map(k => '- ' + k.tieu_de).join('\n')
    : '(Chưa được dạy thêm kỹ năng nào ngoài hồ sơ gốc.)';

  return `${heThong}

==================================================
BẠN ĐANG ĐƯỢC DẠY NGHỀ
==================================================

${nguoi.ho_ten || nguoi.tai_khoan} muốn đội trợ lý học thêm một kỹ năng, và Mây
xác định kỹ năng này thuộc phòng bạn.

NGUYÊN VĂN YÊU CẦU: ${yeuCau}

KỸ NĂNG BẠN ĐÃ ĐƯỢC DẠY TRƯỚC ĐÓ:
${daCo}

Trả lời DUY NHẤT một khối JSON, không thêm chữ nào ngoài nó:

{
  "can_cong_cu": xem quy tắc ngay dưới đây trước khi điền,
  "ly_do": "chỉ điền khi can_cong_cu=true: cần công cụ đọc dữ liệu gì. Còn lại để chuỗi rỗng",
  "trung_lap": true nếu kỹ năng này đã có trong danh sách trên, false nếu chưa,
  "tieu_de": "tên kỹ năng, dưới 60 ký tự, gọi đúng như người trong nghề gọi",
  "noi_dung": "bài học, viết cho chính bạn đọc lại mỗi lần làm việc"
}

KHI NÀO can_cong_cu = true — CHỈ ĐÚNG HAI TRƯỜNG HỢP, ngoài ra luôn là false:
  (a) Muốn làm được thì phải đọc SỐ LIỆU KINH DOANH ĐANG SỐNG trong ERP: tồn kho
      hiện tại, doanh số, đơn hàng, công nợ, danh sách nhân sự, giá vốn.
  (b) Muốn làm được thì phải THAO TÁC lên hệ thống: sửa dữ liệu, tạo bản ghi,
      gọi sang Shopee hay TikTok Shop.

KHÔNG PHẢI cần công cụ, những thứ sau đều học suông được hết:
  · "cần mẫu biểu, cần quy định của công ty" — mẫu và quy định là KIẾN THỨC, và
    đây chính là buổi để Sếp truyền nó cho bạn. Bạn cứ viết theo chuẩn nghề phổ
    thông; chỗ nào Alpha Green làm khác thì Sếp sẽ dạy tiếp.
  · "tôi chưa được đào tạo cái này" — đúng, nên mới có buổi dạy này.
  · "cần thêm thông tin chi tiết" — cứ viết bản đủ dùng đã, thiếu thì bổ sau.

PHÂN VÂN THÌ CHỌN false. Từ chối nhầm một kỹ năng học được thì Sếp mất công đi
một vòng vô ích; còn nhận bừa một kỹ năng cần dữ liệu thì bạn sẽ bịa số ở những
câu sau — nhưng chuyện đó chỉ xảy ra với (a) và (b) ở trên, không phải với việc
soạn thảo, quy trình, cách viết, cách kiểm tra.

QUY TẮC VIẾT noi_dung — bỏ qua là bài học vô dụng:
- Viết CÁCH LÀM theo bước, không viết định nghĩa. "Soạn thảo văn bản là việc
  tạo ra văn bản" là câu vô nghĩa; "công văn gồm 9 phần theo thứ tự: quốc hiệu,
  số hiệu, địa danh và ngày, tên loại và trích yếu, nơi nhận..." mới dùng được.
- Nêu rõ CHỖ HAY SAI. Bài học không có cảnh báo thì chỉ là mục lục.
- Gắn vào Alpha Green: thực phẩm sạch và hàng mẹ & bé, bán trên Shopee và
  TikTok Shop, 15 người. Bài chung chung thì lên mạng đọc còn nhanh hơn.
- TUYỆT ĐỐI KHÔNG nhét số liệu kinh doanh vào (tồn kho, doanh số, giá vốn).
  Số thì phải tra ERP mới đúng; viết vào bài học là hôm sau đã sai mà bạn vẫn
  nói chắc nịch.
- Dài vừa đủ, khoảng 150 đến 400 chữ. Bài này sẽ được nạp vào MỌI câu trả lời
  của bạn sau này, viết dài là mỗi câu hỏi về sau đều phải trả giá.`;
}

/* Bài học của RIÊNG một trợ lý (tầng `agent`) — dùng cho chặng DẠY NGHỀ, nơi
   mô hình cần thấy nó đã có bài nào để không viết trùng.
   KHÔNG dùng để ghép prompt: chỗ đó gọi `docLuat()` (src/vp-luat.js), vốn đọc
   đủ năm tầng, lọc hạn ở SQL và có trần theo tổng ký tự.

   Trần 12 bài giữ nguyên ở đây vì đây là con số cho MẮT MÔ HÌNH lúc nó tự soi
   trùng lặp, không phải con số chi phí. Trần chi phí là TRAN_KY_TU_LUAT. */
async function docKyNang(env, agentId) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, tieu_de, noi_dung FROM vp_ky_nang ' +
      "WHERE agent_id = ? AND dang_dung = 1 AND tang = 'agent' " +
      'ORDER BY tao_luc DESC LIMIT 12'
    ).bind(agentId).all();
    return results || [];
  } catch (e) {
    /* Thiếu cột `tang` = migration them-vp-kynang-tang.sql chưa chạy. Trợ lý
       vẫn phải dạy được, chỉ là chưa soi được trùng lặp. */
    console.error('Đọc kỹ năng lỗi (migration them-vp-kynang-tang.sql đã chạy chưa?):', e.message);
    return [];
  }
}

/* ==========================================================================
   DẠY NGHỀ — chặng của trưởng phòng, sau khi Mây đã chuyển đúng cửa
   ========================================================================== */
async function dayNghe(env, agent, nguoi, homNay, yeuCau) {
  const daCo = await docKyNang(env, agent.id);

  let kq;
  try {
    kq = bocJson(await goiAI(env, promptHocNghe(agent, nguoi, homNay, yeuCau, daCo), 900));
  } catch (e) {
    console.error('Dạy nghề lỗi:', e.message);
    return { loi: true };
  }
  if (!kq) return { loi: true };

  if (kq.can_cong_cu === true) {
    return { tu_choi: true, ly_do: String(kq.ly_do || "").trim() };
  }
  if (kq.trung_lap === true) {
    return { trung_lap: true, tieu_de: String(kq.tieu_de || "").trim() };
  }

  /* CỬA CHẶN NỘI DUNG — dùng chung với đường Sếp gõ thẳng (vanphong.js).
     Trước bản này, toàn bộ kiểm tra trước khi ghi chỉ có ba cửa ĐỘ DÀI và hai
     cửa do CHÍNH MÔ HÌNH tự chấm (`can_cong_cu`, `trung_lap`). Không một dòng
     nào kiểm nội dung: không lọc số liệu, không thoát ký tự phân cách.
     `kiemTruocKhiGhi` làm cả hai, và làm ở một chỗ cho cả hai đường ghi. */
  const kiem = kiemTruocKhiGhi(kq.tieu_de, kq.noi_dung);
  if (!kiem.ok) {
    /* Mô hình vừa soạn ra một bài chứa số nghiệp vụ — dù prompt dạy nghề đã
       dặn đừng. Đúng bằng chứng cho luật nhà "lời dặn thì dỗ được": trả lý do
       thật ra ngoài để Sếp thấy nó vừa định dạy cái gì. */
    return { tu_choi: true, ly_do: kiem.ly_do + (kiem.chi_tiet ? ' ' + kiem.chi_tiet : '') };
  }
  const tieuDe = kiem.tieu_de;
  const noiDung = kiem.noi_dung;

  if (daCo.length >= 12) {
    return { day_roi: true, tieu_de: tieuDe, noi_dung: noiDung,
             qua_tai: true, dang_co: daCo.length };
  }

  /* ---- SỔ GHI ĐÚNG NGƯỜI, ĐÚNG MÁY (D4) --------------------------------
     400 chữ `noi_dung` này do Llama soạn (goiAI ở đầu hàm). Sếp chỉ nói một
     câu "cần học soạn thảo văn bản". Bản trước ghi `nguoi_day_id` = Sếp cho cả
     dòng chữ của máy — sổ ghi tên người cho việc của máy.
     Nay ba cột nói ba sự thật khác nhau:
       nguoi_thuc_hien_loai = 'may'  → AI SOẠN ra chữ này
       tac_nhan = MAY_MODEL          → MÁY NÀO soạn
       uy_quyen_boi_id = Sếp         → AI CHỊU TRÁCH NHIỆM
     `nguoi_day_id` giữ nguyên nghĩa cũ "ai bấm nút dạy" để mọi câu đọc cũ và
     6 dòng cũ trên bản thật không phải diễn giải lại (Rule 10).

     ⚠️ CHECK ở tầng DB đòi `uy_quyen_boi_id IS NOT NULL` khi loại là 'may'.
     Thiếu nhan_su_id thì THÀ TỪ CHỐI còn hơn ghi một bài học không ai bảo lãnh
     — đó chính là 6 dòng NULL đang phải mang nhãn 'khong_ro' hôm nay. */
  if (!nguoi.nhan_su_id) {
    return { tu_choi: true, ly_do:
      'Tài khoản đang dùng chưa nối với hồ sơ nhân sự, nên không ghi được ai chịu trách nhiệm ' +
      'cho bài học này. Nhờ Quản trị nối hồ sơ giúp rồi dạy lại.' };
  }

  const id = "kn_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  await env.DB.prepare(
    "INSERT INTO vp_ky_nang (id, agent_id, tieu_de, noi_dung, yeu_cau_goc, nguoi_day_id, " +
    "                        tang, nguoi_thuc_hien_loai, tac_nhan, uy_quyen_boi_id) " +
    "VALUES (?, ?, ?, ?, ?, ?, 'agent', 'may', ?, ?)"
  ).bind(id, agent.id, tieuDe, noiDung, String(yeuCau).slice(0, 500),
         nguoi.nhan_su_id, MAY_MODEL, nguoi.nhan_su_id).run();

  return { day_roi: true, id, tieu_de: tieuDe, noi_dung: noiDung, dang_co: daCo.length + 1 };
}

/* ==========================================================================
   GÓP Ý ERP — Trưởng phòng IT bóc câu nói thành một phiếu đủ thông tin
   --------------------------------------------------------------------------
   Sếp Ngọc bỏ tab Góp ý, người dùng nói thẳng với Mây. Nhưng phiếu góp ý cần
   bốn phần rõ ràng (bối cảnh, vướng ở đâu, mong muốn, khu vực) — mà người ta
   nói chuyện thì chỉ buông một câu: "màn kho load chậm quá".

   Việc của Trưởng phòng IT là bóc câu đó ra thành phiếu. KHÔNG BỊA THÊM:
   thiếu phần nào thì ghi thẳng là người gửi chưa nói, để người phân tích biết
   mà hỏi lại — chứ đừng tự nghĩ ra bối cảnh nghe cho đầy đủ, vì phiếu đầy đủ
   mà sai còn tốn công hơn phiếu thiếu mà thật.
   ========================================================================== */
function promptGopY(agent, nguoi, homNay, cauHoi) {
  const heThong = ghepPromptNgan(agent, nguoi, homNay);

  return `${heThong}

==================================================
BÓC MỘT CÂU GÓP Ý THÀNH PHIẾU
==================================================

${nguoi.ho_ten || nguoi.tai_khoan} vừa góp ý về chính phần mềm ERP này.

NGUYÊN VĂN: ${cauHoi}

Trả lời DUY NHẤT một khối JSON, không thêm chữ nào ngoài nó:

{
  "tieu_de": "một câu ngắn dưới 100 ký tự, gọi đúng vấn đề",
  "boi_canh": "họ đang làm gì thì gặp chuyện này. Chưa nói thì ghi: Người gửi chưa mô tả bối cảnh.",
  "vuong_o_dau": "cụ thể chỗ nào khó/lỗi. Chưa rõ thì ghi: Người gửi chưa nói rõ, cần hỏi lại.",
  "mong_muon": "họ muốn thành ra thế nào. Chưa nói thì suy ra điều hiển nhiên nhất và ghi kèm chữ (suy đoán).",
  "khu_vuc": "tên màn hình trong ERP, ví dụ Kho vận, Đơn hoàn, Nhân sự, Kinh doanh. Không rõ thì để chuỗi rỗng"
}

KHÔNG BỊA. Người gửi không nói thì ghi là chưa nói. Phiếu đầy đủ mà sai còn
tốn công của người phân tích hơn là phiếu thiếu mà thật.`;
}

export async function hoiMay({ env, phien, cauHoi, lichSu = [], homNay, coAnhKem = false }) {
  if (!env.AI) {
    const e = new Error('Máy chủ chưa bật AI. Cần binding [ai] trong wrangler.toml.');
    e.thieu_ai = true;
    throw e;
  }

  /* nhan_su_id PHẢI có mặt: nó là người gửi khi mở phiếu góp ý và là người
     giao khi tạo đầu việc. Thiếu nó thì D1 ném D1_TYPE_ERROR ngay lúc ghi —
     đã dính đúng lỗi này ở chặng tạo phiếu góp ý, và chặng giao việc thật cũng
     mang sẵn cùng lỗi mà chưa lộ vì công tắc tự giao việc đang tắt. */
  const nguoi = {
    ho_ten: phien.ho_ten,
    chuc_vu: phien.chuc_vu || '',
    nhan_su_id: phien.nhan_su_id,
    tai_khoan: phien.ten_dang_nhap || phien.tai_khoan || null
  };

  /* Chỉ đưa cho Mây những chuyên gia mà NGƯỜI NÀY được gặp. Mây không được
     route sang phòng người ta không có quyền vào — chặn ngay từ khâu chọn,
     chứ không để chọn xong rồi mới từ chối. */
  const duocGap = agentChoVaiTro(phien.vai_tro);
  if (!duocGap.length) {
    return {
      loai: 'CHAT', agent: null, tra_loi:
        'Chức vụ của bạn hiện chưa được cấp quyền gặp trợ lý nào trong văn phòng ảo. ' +
        'Nhờ Quản trị mở quyền giúp.',
      da_tra_cuu: [], can_owner_gate: false
    };
  }

  /* ---- Lượt 1: phân loại + định tuyến ---- */
  let dinh;
  try {
    dinh = bocJson(await goiAI(env, promptPhanLoai(cauHoi, duocGap, nguoi, homNay), 700));
  } catch (e) {
    console.error('Mây phân loại lỗi:', e.message);
    dinh = null;
  }

  /* Model trả không ra JSON thì vẫn phải phục vụ được: rơi về hỏi đáp thường,
     đưa cho chuyên gia đầu tiên người này gặp được. Thà trả lời hơi lệch
     phòng còn hơn báo lỗi vào mặt người dùng. */
  if (!dinh || !dinh.agent) {
    dinh = { loai: 'CHAT', agent: duocGap[0].id, agent_phu: [], cong_cu: [], tham_so: {}, can_owner_gate: false };
  }

  const agent = agentTheoId(dinh.agent) && duocGap.some(a => a.id === dinh.agent)
    ? agentTheoId(dinh.agent)
    : duocGap[0];

  /* ---- Chạy công cụ (code chạy, không phải AI chạy) ---- */
  const ctx = { db: env.DB, env, phien, agent_id: agent.id, agent };
  const duocCap = new Set((agent.cong_cu || []));
  const daTraCuu = [];

  for (const ten of (Array.isArray(dinh.cong_cu) ? dinh.cong_cu : []).slice(0, 4)) {
    // Mây có thể chọn công cụ mà chuyên gia đó không được cấp — bỏ qua, không
    // nới quyền. Hàng rào nằm ở agents-vp.js, Mây không được vượt.
    if (!duocCap.has(ten)) continue;
    const thamSo = (dinh.tham_so && dinh.tham_so[ten]) || {};
    const ketQua = await chayCongCu(ten, thamSo, ctx, agent);
    daTraCuu.push({ ten, tham_so: thamSo, ket_qua: ketQua });
  }

  /* ==========================================================================
     VĂN PHÒNG TỰ BÀN BẠC NHIỀU VÒNG (Sếp Ngọc chốt 06/09/2026)
     --------------------------------------------------------------------------
     Hỏi ý kiến MỘT vòng rồi gộp lại là kiểu họp mà ai cũng nói một câu rồi về —
     không ai phản biện ai, và phương án đầu tiên thường thắng chỉ vì nó nói
     trước. Nên với việc đáng bàn, văn phòng họp thật:

       Vòng 1  chuyên gia chính đưa phương án đầu
       Vòng 2  các phòng liên quan ĐỌC phương án đó rồi phản biện thẳng vào nó
       Vòng 3  chuyên gia chính nghe phản biện, chỉnh lại rồi mới chốt

     Vòng 2 là chỗ khác biệt: các phòng phản biện MỘT PHƯƠNG ÁN CỤ THỂ, không
     phải trả lời câu hỏi gốc một cách độc lập. Phản biện vào phương án thì mới
     tìm ra chỗ hổng; trả lời độc lập chỉ ra ba ý kiến rời rạc.

     Câu hỏi tra cứu đơn giản (CHAT) thì KHÔNG họp — hỏi tồn kho còn bao nhiêu
     mà bắt ba phòng bàn ba vòng là phá thời gian của người đang chờ.
     ========================================================================== */
  /* Số phòng ngồi họp theo mức hệ trọng, không cào bằng (Sếp Ngọc chốt tiết
     kiệm token 06/09/2026). Việc có hệ quả thật — xin làm gì đó, hoặc chạm vào
     ba nhóm rủi ro cao — thì mời 2 phòng soi. Phân tích thuần đọc số thì 1 phòng
     là đủ: mời thêm phòng thứ hai vào đọc lại cùng bộ số không làm kết luận
     đúng thêm, chỉ tốn gấp đôi. */
  const heTrong = dinh.loai === 'ACTION_REQUEST' || !!dinh.can_owner_gate;
  const dsPhu = (Array.isArray(dinh.agent_phu) ? dinh.agent_phu : [])
    .filter(id => id !== agent.id && duocGap.some(a => a.id === id))
    .slice(0, heTrong ? 2 : 1);

  /* Dạy nghề KHÔNG họp ba vòng. Họp là để chọn giữa nhiều phương án; còn dạy
     nghề thì phòng sở hữu kỹ năng tự viết bài cho mình, các phòng khác ngồi vào
     chỉ tốn lượt gọi AI mà không thêm được gì. */
  const laDayNghe = dinh.loai === 'HUAN_LUYEN';
  const laGopY = dinh.loai === 'GOP_Y_ERP';

  /* Đọc luật mềm MỘT LẦN rồi dùng lại cho cả ba vòng. Đọc ở từng vòng là ba
     lượt truy vấn cho cùng một thứ không đổi giữa chừng.

     `docLuat` trả về năm tầng đã lọc: chỉ tầng có liên quan tới TRỢ LÝ NÀY và
     VAI TRÒ người đang hỏi, đã bỏ bài hết hạn ngay ở SQL, đã cắt theo trần
     tổng ký tự. Trước bản này chỗ đây đọc phẳng 12 bài của một trợ lý và
     không có trần nào tính bằng ký tự — xem src/vp-luat.js để biết con số. */
  const kyNangCuaAgent = (laDayNghe || laGopY)
    ? []
    : await docLuat(env, agent.id, phien.vai_tro);
  const dangBan = !laDayNghe && !laGopY && dinh.loai !== 'CHAT' && dsPhu.length > 0;
  const bienBan = [];        // ghi lại cuộc họp, để người đọc biết đã bàn những gì
  let traLoi;

  let ketQuaDay = null;

  try {
    if (dinh.loai === 'GOP_Y_ERP') {
      /* Góp ý ERP: bóc thành phiếu có mã số. Không họp, không phản biện —
         phiếu vào hàng đợi rồi Hồ Ly phân tích, đó là việc của quy trình góp
         ý sẵn có chứ không phải của cuộc họp văn phòng. */
      let phieu = null;
      try {
        const bo = bocJson(await goiAI(env, promptGopY(agent, nguoi, homNay, cauHoi), 700));
        if (bo) {
          phieu = await taoPhieuGopY(env, {
            nguoiGuiId: nguoi.nhan_su_id,
            tieuDe: bo.tieu_de, boiCanh: bo.boi_canh,
            vuongODau: bo.vuong_o_dau, mongMuon: bo.mong_muon, khuVuc: bo.khu_vuc
          });
        }
      } catch (e) {
        console.error('Tạo phiếu góp ý lỗi:', e.message);
      }

      traLoi = phieu
        ? 'Tôi đã ghi thành phiếu góp ý **#' + phieu.id + '** — "' + phieu.tieu_de + '".'
          + '\n\nPhiếu vào hàng đợi của đội dựng ERP: Hồ Ly phân tích trước, '
          + 'Khỉ Đột dựng sau khi có đặc tả. Sếp hỏi tôi bất cứ lúc nào để biết phiếu đang ở đâu.'
        : 'Tôi chưa ghi được thành phiếu. Sếp nói rõ hơn giúp tôi: đang ở màn nào, '
          + 'bấm gì thì gặp chuyện, và Sếp muốn nó thành ra thế nào.';
    } else if (laDayNghe) {
      ketQuaDay = await dayNghe(env, agent, nguoi, homNay, cauHoi);
      if (ketQuaDay.loi) {
        traLoi = 'Tôi chưa ghi được kỹ năng này. Sếp thử nói lại rõ hơn giúp tôi.';
      } else if (ketQuaDay.tu_choi) {
        /* Trưởng phòng từ chối vì kỹ năng cần dữ liệu — đây là câu trả lời ĐÚNG,
           không phải lỗi. Nói thẳng đường đi tiếp thay vì để Sếp tắc. */
        traLoi = 'Kỹ năng này tôi không học suông được.' + '\n\n' + ketQuaDay.ly_do
          + '\n\nĐể làm được, cần phòng IT dựng thêm công cụ tra dữ liệu. '
          + 'Sếp nói với Mây "nhờ anh Tuấn xem việc này" là tôi chuyển sang đó.';
      } else if (ketQuaDay.trung_lap) {
        traLoi = 'Kỹ năng này tôi đã được dạy rồi — "' + ketQuaDay.tieu_de
          + '". Tôi không ghi trùng. Sếp muốn sửa lại nội dung thì nói rõ chỗ cần sửa.';
      } else if (ketQuaDay.qua_tai) {
        traLoi = 'Tôi đang giữ 12 kỹ năng dạy thêm — đã kịch trần.'
          + '\n\nTrần này không phải để tiết kiệm chỗ lưu, mà vì mỗi bài học đều được '
          + 'nạp vào MỌI câu trả lời của tôi sau này. Nhiều quá thì câu nào cũng nặng và chậm.'
          + '\n\nSếp vào hồ sơ của tôi, tắt bớt bài không còn dùng, rồi dạy lại.';
      } else {
        traLoi = 'Tôi đã học xong và ghi vào hồ sơ: **' + ketQuaDay.tieu_de + '**'
          + '\n\n' + ketQuaDay.noi_dung
          + '\n\n---\nTừ giờ mọi câu Sếp hỏi tới tôi đều có phần này trong đầu. '
          + 'Thấy tôi hiểu sai chỗ nào thì vào hồ sơ tắt bài này đi rồi dạy lại.';
      }
    } else if (!dangBan) {
      /* Việc đơn giản: một chuyên gia trả lời thẳng. */
      traLoi = await goiAI(
        env, promptTraLoi(agent, nguoi, homNay, cauHoi, daTraCuu, lichSu, null, kyNangCuaAgent, coAnhKem), 1500
      );
    } else {
      /* --- Vòng 1: phương án đầu --- */
      const phuongAn = String(await goiAI(
        env, promptTraLoi(agent, nguoi, homNay, cauHoi, daTraCuu, lichSu, null, kyNangCuaAgent, coAnhKem), 1200
      ) || '').trim();
      bienBan.push({ vong: 1, agent: agent.id, chuc_danh: agent.chuc_danh, vai: 'đề xuất', noi_dung: phuongAn });

      /* --- Vòng 2: các phòng phản biện chính phương án đó --- */
      const phanBien = [];
      for (const id of dsPhu) {
        const ap = agentTheoId(id);
        if (!ap) continue;
        try {
          const y = await goiAI(env, promptPhanBien(ap, nguoi, homNay, cauHoi, phuongAn, agent, daTraCuu), 550);
          const noiDung = String(y || '').trim();
          if (noiDung) {
            phanBien.push({ id, chuc_danh: ap.chuc_danh, noi_dung: noiDung });
            bienBan.push({ vong: 2, agent: id, chuc_danh: ap.chuc_danh, vai: 'phản biện', noi_dung: noiDung });
          }
        } catch (e) {
          console.error('Vòng phản biện, phòng ' + id + ' lỗi:', e.message);
        }
      }

      /* --- Vòng 3: chuyên gia chính chỉnh lại rồi chốt --- */
      traLoi = await goiAI(
        env, promptChot(agent, nguoi, homNay, cauHoi, phuongAn, phanBien, daTraCuu, kyNangCuaAgent), 1600
      );
      bienBan.push({ vong: 3, agent: agent.id, chuc_danh: agent.chuc_danh, vai: 'chốt', noi_dung: String(traLoi || '').trim() });

      /* --- Vòng 4: khối Điều hành duyệt, CHỈ với việc hệ trọng --- */
      const capTren = (agent.id === 'trolygd' || agent.id === 'trolypgd')
        ? null                                   // chủ trì đã là cấp trên rồi, duyệt chính mình là vô nghĩa
        : (duocGap.find(a => a.id === 'trolygd') || duocGap.find(a => a.id === 'trolypgd'));

      if (heTrong && capTren) {
        try {
          const yDuyet = String(await goiAI(env,
            promptDuyet(capTren, nguoi, homNay, cauHoi, String(traLoi || ''), agent,
              bienBan.filter(b => b.vong === 2).map(b => b.chuc_danh)), 600) || '').trim();
          if (yDuyet) {
            /* Ghép thành một khối riêng, KHÔNG bắt cấp trên viết lại kết luận
               của trưởng phòng — viết lại là mở đường cho sai lệch số liệu, mà
               giá trị của chặng này nằm ở góc nhìn công ty, không ở câu chữ. */
            traLoi = String(traLoi || '') +
              '\n\n---\n**' + capTren.chuc_danh + ' duyệt**\n\n' + yDuyet;
            bienBan.push({ vong: 4, agent: capTren.id, chuc_danh: capTren.chuc_danh, vai: 'duyệt', noi_dung: yDuyet });
          }
        } catch (e) {
          console.error('Chặng duyệt khối Điều hành lỗi:', e.message);
        }
      }
    }
  } catch (e) {
    console.error('Văn phòng bàn bạc lỗi:', e.message);
    throw e;
  }

  const yKienPhu = bienBan.filter(b => b.vong === 2).map(b => ({ id: b.agent, chuc_danh: b.chuc_danh }));

  const loai = ['CHAT', 'ANALYSIS', 'ACTION_REQUEST', 'HUAN_LUYEN', 'GOP_Y_ERP'].includes(dinh.loai) ? dinh.loai : 'CHAT';
  let vanBan = String(traLoi || '').trim() ||
    'Tôi chưa trả lời được câu này. Sếp hỏi lại cụ thể hơn giúp tôi.';
  let viecDaGiao = null;

  /* ---- ACTION_REQUEST: giao việc thật cho người thật ---- */
  if (loai === 'ACTION_REQUEST') {
    if (dinh.can_owner_gate) {
      /* Việc rủi ro cao thì KHÔNG tạo gì cả — dừng ở cổng, chờ Sếp quyết.
         Đúng mục XIV: AI không tự quyết lương, hợp đồng, thanh toán, phân
         quyền, điều chỉnh tồn kho... Mẫu câu theo đúng khuôn Sếp đưa. */
      vanBan += `\n\n---\n**[CẦN QUYẾT ĐỊNH]**\n\n` +
        `Việc này thuộc nhóm rủi ro cao nên tôi không tự tạo đầu việc. ` +
        `Sếp xem phần trên rồi bảo tôi có làm hay không — bảo "làm đi" là tôi giao việc ngay.`;
    } else if (!MAY_DUOC_TU_GIAO_VIEC) {
      /* Giai đoạn 1: chỉ đề xuất, không tự tạo đầu việc. */
      vanBan += `

---
**[ĐỀ XUẤT GIAO VIỆC]**

` +
        `Việc này giao ra người thật là hợp lý, nhưng văn phòng ảo đang ở giai đoạn ` +
        `chạy thử nên tôi không tự tạo đầu việc. Sếp bảo "giao đi" thì tôi tạo, ` +
        `hoặc Sếp tự tạo ở tab Công việc.`;
    } else {
      viecDaGiao = await giaoViecThat(env, ctx, agent, cauHoi, vanBan, homNay);
      if (viecDaGiao?.da_tao) {
        vanBan += `\n\n---\n✓ Đã giao việc **#${viecDaGiao.ma}** cho ${viecDaGiao.giao_cho}` +
          (viecDaGiao.han_chot !== 'không đặt hạn' ? `, hạn ${viecDaGiao.han_chot}` : '') +
          `. Việc nằm trong hàng việc chung của người đó, không phải danh sách riêng.`;
      } else if (viecDaGiao?.da_co_roi) {
        vanBan += `\n\n---\nViệc này đã được giao trước đó và vẫn đang mở, tôi không tạo trùng.`;
      }
    }
  }

  /* Khâu cuối của luồng: trưởng phòng trả về Mây, Mây báo lại người gửi.
     Câu tra cứu đơn giản (CHAT, một phòng, không họp) thì KHÔNG khoác lời dẫn —
     hỏi "doanh số hôm qua bao nhiêu" mà phải đọc hai câu thủ tục mới tới con số
     là làm phiền người đang vội. */
  if (dangBan || loai !== 'CHAT') {
    vanBan = mayBaoLai({
      agent,
      dsPhuTen: bienBan.filter(b => b.vong === 2).map(b => b.chuc_danh),
      soVong: dangBan ? (bienBan.some(b => b.vong === 4) ? 4 : 3) : 1,
      nguoiDuyet: (bienBan.find(b => b.vong === 4) || {}).chuc_danh || null,
      coOwnerGate: !!dinh.can_owner_gate,
      noiDung: vanBan
    });
  }

  return {
    tom_tat: dinh.tom_tat || null,
    loai,
    agent: agent.id,
    agent_ten: agent.ten,
    agent_chuc_danh: agent.chuc_danh,
    agent_phu: yKienPhu.map(y => ({ id: y.id, chuc_danh: y.chuc_danh })),
    can_owner_gate: !!dinh.can_owner_gate,
    so_vong: dangBan ? 3 : 1,
    bien_ban: bienBan,
    tra_loi: vanBan,
    viec_da_giao: viecDaGiao,
    da_tra_cuu: daTraCuu.map(d => ({ ten: d.ten, tham_so: d.tham_so }))
  };
}

/* ==========================================================================
   GIAO VIỆC THẬT — lượt gọi AI thứ ba, chỉ chạy khi là ACTION_REQUEST
   --------------------------------------------------------------------------
   Vì sao tách riêng một lượt: hai lượt trên lo hiểu và trả lời. Việc rút ra
   "giao cho ai, xong thì có cái gì" là một việc khác hẳn, và nếu nhét chung
   vào lượt trả lời thì model hay bịa mã nhân sự cho đủ khuôn JSON.

   Người nhận PHẢI có thật và đang làm việc — kiểm ở công cụ giao_viec, không
   tin vào mã model đưa ra.
   ========================================================================== */
async function giaoViecThat(env, ctx, agent, cauHoi, traLoi, homNay) {
  // Lấy danh sách người thật để model chọn — không có danh sách thì nó bịa mã.
  const ds = await chayCongCu('danh_sach_nhan_su', {}, ctx, agent);
  const nhanSu = (ds && ds.nhan_su) || [];
  if (!nhanSu.length) return null;

  const bangNguoi = nhanSu
    .map(n => `- ${n.id}: ${n.ho_ten} — ${n.chuc_vu || ''} (${n.bo_phan || 'chưa rõ bộ phận'})`)
    .join('\n');

  const prompt = `Bạn là ${agent.ten}, ${agent.chuc_danh}. Người ta vừa yêu cầu một việc cần làm.

YÊU CẦU:
"""
${cauHoi}
"""

BẠN ĐÃ TRẢ LỜI:
"""
${traLoi.slice(0, 1200)}
"""

NHÂN SỰ ĐANG LÀM VIỆC (chỉ được chọn mã trong danh sách này):
${bangNguoi}

Hãy rút ra MỘT đầu việc cụ thể. CHỈ trả JSON, không giải thích:
{
  "giao_cho_id": "<mã nhân sự phù hợp nhất>",
  "tieu_de": "<việc cần làm, một dòng, bắt đầu bằng động từ>",
  "dau_ra": "<xong việc thì có cái gì cụ thể - đây là phần bắt buộc>",
  "mo_ta": "<vì sao cần làm, kèm số liệu căn cứ nếu có>",
  "han_chot": "<YYYY-MM-DD hoặc chuỗi rỗng nếu không rõ hạn>"
}

Quy tắc:
- Chọn người theo BỘ PHẬN và CHỨC VỤ khớp với việc, không chọn bừa người đầu danh sách.
- "dau_ra" phải đo được, tránh viết chung chung kiểu "đã xử lý xong".
- Hôm nay là ${homNay}. Không đặt hạn trong quá khứ.`;

  let rut;
  try {
    rut = bocJson(await goiAI(env, prompt, 600));
  } catch (e) {
    console.error('Mây rút đầu việc lỗi:', e.message);
    return null;
  }
  if (!rut || !rut.giao_cho_id || !rut.tieu_de) return null;

  // Chạy qua đúng công cụ giao_viec — để mọi lớp kiểm tra ở đó vẫn hiệu lực:
  // người nhận có thật không, đã có việc trùng chưa, đầu ra có không.
  return chayCongCu('giao_viec', {
    giao_cho_id: rut.giao_cho_id,
    tieu_de: String(rut.tieu_de).slice(0, 200),
    dau_ra: String(rut.dau_ra || '').slice(0, 300),
    mo_ta: String(rut.mo_ta || '').slice(0, 1000),
    han_chot: rut.han_chot || null
  }, ctx, agent);
}
