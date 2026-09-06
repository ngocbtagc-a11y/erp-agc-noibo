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

   MÂY KHÔNG LÀM: không trở thành chuyên gia của mọi lĩnh vực, không tự quyết
   thay Owner, không tự đổi trạng thái yêu cầu rủi ro cao.
   ========================================================================== */

import { AGENTS, agentTheoId, agentChoVaiTro, ghepPrompt, ghepPromptNgan } from './agents-vp.js';
import { congCuCuaAgent, chayCongCu, CONG_CU } from './vp-cong-cu.js';

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

async function goiAI(env, prompt, maxTokens = 900) {
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

RỦI RO CAO (can_owner_gate = true) nếu câu hỏi dính tới: ${VIEC_RUI_RO_CAO.join(', ')}.

CHỈ trả về JSON đúng khuôn sau, không chào hỏi, không giải thích thêm:
{
  "loai": "CHAT" | "ANALYSIS" | "ACTION_REQUEST",
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

function promptTraLoi(agent, nguoi, homNay, cauHoi, duLieu, lichSu, yKienPhu) {
  const heThong = ghepPrompt(agent, nguoi, homNay);

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

function promptChot(agent, nguoi, homNay, cauHoi, phuongAn, phanBien, duLieu) {
  const heThong = ghepPrompt(agent, nguoi, homNay);

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

export async function hoiMay({ env, phien, cauHoi, lichSu = [], homNay }) {
  if (!env.AI) {
    const e = new Error('Máy chủ chưa bật AI. Cần binding [ai] trong wrangler.toml.');
    e.thieu_ai = true;
    throw e;
  }

  const nguoi = { ho_ten: phien.ho_ten, chuc_vu: phien.chuc_vu || '' };

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

  const dangBan = dinh.loai !== 'CHAT' && dsPhu.length > 0;
  const bienBan = [];        // ghi lại cuộc họp, để người đọc biết đã bàn những gì
  let traLoi;

  try {
    if (!dangBan) {
      /* Việc đơn giản: một chuyên gia trả lời thẳng. */
      traLoi = await goiAI(
        env, promptTraLoi(agent, nguoi, homNay, cauHoi, daTraCuu, lichSu, null), 1500
      );
    } else {
      /* --- Vòng 1: phương án đầu --- */
      const phuongAn = String(await goiAI(
        env, promptTraLoi(agent, nguoi, homNay, cauHoi, daTraCuu, lichSu, null), 1200
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
        env, promptChot(agent, nguoi, homNay, cauHoi, phuongAn, phanBien, daTraCuu), 1600
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

  const loai = ['CHAT', 'ANALYSIS', 'ACTION_REQUEST'].includes(dinh.loai) ? dinh.loai : 'CHAT';
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
