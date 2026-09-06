/* ==========================================================================
   TRƯỞNG PHÒNG IT SOẠN KẾ HOẠCH THI CÔNG
   ---------------------------------------------------------------------------
   Sếp Ngọc chốt 06/09/2026: phiếu góp ý đã duyệt thì Tuấn tự soạn kế hoạch
   triển khai, để khi ai đó bắt tay vào làm thì phần suy nghĩ đã xong sẵn.

   RANH GIỚI QUAN TRỌNG NHẤT — TUẤN KHÔNG ĐỌC ĐƯỢC MÃ NGUỒN.
   Trợ lý ảo chạy trong Worker, nó không có repo, không thấy file nào. Nên nếu
   để nó viết "sửa hàm gopYDanhSach ở src/index.js dòng 3200" thì đó là BỊA —
   nghe rất chuyên nghiệp, và người đọc sẽ đi mở đúng chỗ đó rồi ngơ ngác.

   Vì vậy kế hoạch nằm ở TẦNG NGHIỆP VỤ: sửa cái gì người dùng nhìn thấy, thứ
   tự làm, kiểm thế nào là đạt, hỏng thì hỏng ở đâu. Đó là phần Tuấn thật sự
   biết, và cũng là phần tốn thời gian nhất khi người ta ngồi vào làm. Phần
   "file nào, hàm nào" để người cầm code tự tìm — họ mở repo ra là thấy.

   KHÔNG ĐÈ de_xuat_spec: đặc tả của Hồ Ly trả lời "xong là thế nào", kế hoạch
   của Tuấn trả lời "làm ra sao". Người đọc cần cả hai.
   ========================================================================== */

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/* Mỗi lượt cron chỉ soạn 2 phiếu: soạn kế hoạch là lượt gọi AI dài (800 token
   đầu ra), làm ồ ạt thì một lần lỗi kéo theo cả loạt và tốn hạn mức vô ích.
   Cron chạy 5 phút/lần nên hàng đợi vẫn tiêu hết nhanh. */
const MOI_LUOT = 2;

function nhacViec(g) {
  return `Bạn là Tuấn, Trưởng phòng IT của Công ty TNHH Alpha Green Commerce — thương mại
điện tử thực phẩm sạch và hàng mẹ & bé, bán trên Shopee và TikTok Shop, 15 nhân sự.

Một góp ý về phần mềm ERP nội bộ vừa được duyệt cho làm. Việc của bạn: soạn KẾ HOẠCH
THI CÔNG để người bắt tay vào làm không phải nghĩ lại từ đầu.

--- PHIẾU ---
Tiêu đề: ${g.tieu_de || ''}
Khu vực: ${g.khu_vuc || '(không rõ)'}
Loại: ${g.de_xuat_loai || '(chưa phân loại)'}
Bối cảnh: ${g.boi_canh || ''}
Vướng ở đâu: ${g.vuong_o_dau || ''}
Mong muốn: ${g.mong_muon || ''}
Đặc tả đã có: ${g.de_xuat_spec || '(chưa có)'}
--- HẾT ---

BẠN KHÔNG ĐỌC ĐƯỢC MÃ NGUỒN. Tuyệt đối KHÔNG viết tên file, tên hàm, số dòng —
bạn không nhìn thấy chúng, viết ra là bịa. Người cầm code tự tìm được chỗ đó.
Bạn lo phần họ KHÔNG tự nghĩ ra nhanh được.

Viết đúng năm mục sau, tiếng Việt, tổng cộng dưới 300 từ, không lời mở đầu:

1. LÀM GÌ — mô tả thay đổi theo thứ NGƯỜI DÙNG NHÌN THẤY, không phải theo code.
2. THỨ TỰ — chia 2 đến 4 bước, bước nào xong trước thì đã dùng được ngay bước đó.
   Việc chia được thành từng mẩu chạy được là chỗ quyết định nó có bị bỏ dở không.
3. KIỂM THẾ NÀO LÀ ĐẠT — nêu 2–3 câu kiểm cụ thể, đọc xong là bấm thử được ngay.
   Không viết "kiểm tra hoạt động tốt"; viết "mở màn Kho vận trên điện thoại, danh
   sách hiện trong 3 giây".
4. DỄ HỎNG Ở ĐÂU — chỗ nào sửa xong dễ làm vỡ thứ khác. Không nghĩ ra thì ghi
   "chưa thấy chỗ nào đáng lo", đừng bịa cho đủ mục.
5. CẦN HỎI AI — việc này có cần ai xác nhận trước không (Sếp, kế toán, kho…).
   Không cần thì ghi "không cần hỏi ai".`;
}

export async function soanKeHoach(env) {
  if (!env.AI) return 0;

  const { results } = await env.DB.prepare(`
    SELECT id, tieu_de, khu_vuc, boi_canh, vuong_o_dau, mong_muon,
           de_xuat_loai, de_xuat_spec
      FROM gop_y
     WHERE trang_thai IN ('da_duyet', 'dang_lam')
       AND ke_hoach_thi_cong IS NULL
     ORDER BY tao_luc ASC LIMIT ${MOI_LUOT}
  `).all();

  let xong = 0;
  for (const g of results || []) {
    try {
      const kq = await env.AI.run(MODEL, {
        messages: [{ role: 'user', content: nhacViec(g) }],
        max_tokens: 800
      });
      const ban = String(kq?.response || '').trim();

      /* Bản quá ngắn là dấu hiệu model trả rác — ghi vào còn tệ hơn để trống,
         vì lần sau nó bị coi là "đã có kế hoạch" và không ai soạn lại nữa. */
      if (ban.length < 120) continue;

      await env.DB.prepare(`
        UPDATE gop_y
           SET ke_hoach_thi_cong = ?, ke_hoach_luc = datetime('now', '+7 hours')
         WHERE id = ? AND ke_hoach_thi_cong IS NULL
      `).bind(ban.slice(0, 4000), g.id).run();

      xong++;
    } catch (e) {
      console.error('Soạn kế hoạch #' + g.id + ':', e.message);
    }
  }
  return xong;
}

/* Bản chẩn đoán — trả về LÝ DO không soạn được, thay vì im lặng return 0.
   Cron nuốt lỗi vào console mà console thì không ai đọc được từ xa. */
export async function soanKeHoachChanDoan(env) {
  if (!env.AI) return { ok: false, vi_sao: 'Worker khong co binding AI' };
  let ds;
  try {
    const r = await env.DB.prepare().all();
    ds = r.results || [];
  } catch (e) { return { ok: false, vi_sao: 'Loi doc gop_y: ' + e.message }; }

  if (!ds.length) return { ok: true, so: 0, vi_sao: 'Khong con phieu nao can soan ke hoach' };

  const g = ds[0];
  let ban;
  try {
    const kq = await env.AI.run(MODEL, { messages: [{ role: 'user', content: nhacViec(g) }], max_tokens: 800 });
    ban = String(kq?.response || '').trim();
  } catch (e) { return { ok: false, phieu: g.id, vi_sao: 'Loi goi AI: ' + e.message }; }

  if (ban.length < 120) return { ok: false, phieu: g.id, vi_sao: 'AI tra ve qua ngan (' + ban.length + ' ky tu)', mau: ban.slice(0,150) };

  try {
    const r = await env.DB.prepare().bind(ban.slice(0,4000), g.id).run();
    return { ok: true, phieu: g.id, da_ghi: !!r?.meta?.changes, dai: ban.length };
  } catch (e) { return { ok: false, phieu: g.id, vi_sao: 'Loi ghi: ' + e.message }; }
}
