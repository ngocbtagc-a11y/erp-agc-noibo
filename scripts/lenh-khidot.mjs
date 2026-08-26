/* ==========================================================================
   Sinh lệnh cho KHỈ ĐỘT (Agent B — Main Builder) từ 1 góp ý trong bảng
   gop_y. Dán NGUYÊN VĂN output vào 1 phiên Claude Code MỚI (khác phiên
   Hồ Ly) để nó tiếp nhận và code — đúng mô hình "Sếp gửi 1 lần, không tự
   tay chuyển lời giữa 2 Agent" nhưng KHÔNG tự động hoàn toàn: Sếp vẫn là
   người bấm gửi, giữ đúng Owner Gate đã thống nhất 26/08/2026 (không cho
   AI tự merge/deploy khi chưa ai xem qua).

   Dùng:
     node scripts/lenh-khidot.mjs <id>            (đọc DB máy)
     node scripts/lenh-khidot.mjs <id> --remote    (đọc DB thật)
   ========================================================================== */
import { execSync } from 'node:child_process';

const id = process.argv[2];
const moiTruong = process.argv.includes('--remote') ? '--remote' : '--local';

if (!id || isNaN(parseInt(id, 10))) {
  console.error('Thiếu id. Dùng: node scripts/lenh-khidot.mjs <id> [--remote]');
  process.exit(1);
}

function docJSON(sql) {
  // Gộp về 1 dòng — chuỗi nhiều dòng qua execSync trên Windows bị vỡ quote
  // (backslash-n lẫn vào tham số dòng lệnh, wrangler đọc sai thành SQL rác).
  const motDong = sql.replace(/\s+/g, ' ').trim();
  const raw = execSync(
    `npx wrangler d1 execute crm-agc ${moiTruong} --json --command ${JSON.stringify(motDong)}`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }
  );
  const parsed = JSON.parse(raw);
  return parsed[0]?.results || [];
}

const gopYId = parseInt(id, 10);
const rows = docJSON(`
  SELECT g.id, g.tieu_de, g.boi_canh, g.vuong_o_dau, g.mong_muon, g.khu_vuc, g.tan_suat,
         g.loai, g.de_xuat_loai, g.trang_thai, g.de_xuat_spec, g.spec_reference,
         n.ho_ten AS nguoi_gui_ten
    FROM gop_y g JOIN nhan_su n ON n.id = g.nguoi_gui_id
   WHERE g.id = ${gopYId}
`);

const g = rows[0];
if (!g) {
  console.error(`Không tìm thấy góp ý #${gopYId} (đã kiểm tra DB ${moiTruong}).`);
  process.exit(1);
}

if (g.trang_thai !== 'da_duyet') {
  console.error(`⚠️  Góp ý #${gopYId} đang ở trạng thái "${g.trang_thai}", chưa phải "da_duyet" (Đã duyệt làm).`);
  console.error('   Vẫn in lệnh bên dưới để Sếp xem trước — nên xác nhận đã sẵn sàng build rồi mới gửi Khỉ Đột.\n');
}

const lichSu = docJSON(`
  SELECT ls.ghi_chu
    FROM gop_y_lich_su ls
   WHERE ls.gop_y_id = ${gopYId} AND ls.ghi_chu IS NOT NULL AND ls.ghi_chu != ''
   ORDER BY ls.luc DESC LIMIT 1
`);
const ghiChuMoiNhat = lichSu[0]?.ghi_chu || '';

const specNoiDung = g.de_xuat_spec ||
  '(Chưa có nháp spec từ Hồ Ly (AI) — Khỉ Đột tự viết Feature Spec đầy đủ theo mẫu ở Mục VIII trước khi code, dựa trên phần "Đang làm gì / Vướng ở đâu / Mong muốn" bên dưới.)';

const lenh = `Bạn là KHỈ ĐỘT — Agent B / Main Builder / Senior Developer của ERP AGC (Cloudflare Workers + D1, repo local: C:\\Users\\Admin\\Desktop\\AI\\crm-agc).

NHIỆM VỤ: Build góp ý #${g.id} — "${g.tieu_de}"

QUY TRÌNH BẮT BUỘC trước khi code:
1. Đọc CLAUDE.md
2. Đọc docs/START-HERE.md
3. Đọc docs/ACTIVE-WORK.md — kiểm tra không ai đang đụng vùng này, ghi dòng của mình vào trước khi code
4. Đọc Feature Spec bên dưới
5. Audit đúng module liên quan (grep/Explore đúng vùng, đừng audit toàn repo)
6. Xác định Source of Truth, kiểm tra reuse (Rule 5 — có component/API/entity dùng lại được không)
7. Phân loại LOW/MEDIUM/HIGH — nếu HIGH hoặc thiếu business decision → STOP, KHÔNG code, báo lại cho Sếp/Hồ Ly
8. Nếu hợp lệ → code đúng scope, không tự mở rộng, không tự đổi business rule
9. Chạy build/test, kiểm tra migration an toàn, backend permission đúng, UI không cần F5, mobile nếu liên quan
10. Tạo Handoff đúng format, báo trạng thái READY_FOR_REVIEW

── FEATURE SPEC (Hồ Ly soạn nháp — tự viết lại đầy đủ hơn nếu cần) ──
Người gửi: ${g.nguoi_gui_ten}
Khu vực: ${g.khu_vuc || 'chưa rõ'}
Tần suất gặp: ${g.tan_suat || 'chưa rõ'}
Phân loại: ${g.loai || g.de_xuat_loai || 'chưa phân loại'}

Đang làm gì: ${g.boi_canh}
Vướng ở đâu: ${g.vuong_o_dau}
Mong muốn: ${g.mong_muon}

${specNoiDung}
${ghiChuMoiNhat ? `\nGhi chú Admin lúc duyệt: ${ghiChuMoiNhat}` : ''}

── SAU KHI XONG ──
Ghi Handoff đầy đủ (Feature / Spec / Commit-Branch / Files changed / DB changes / API changes / UI changes / Permission impact / Source of Truth impact / Tests / Known limitations / Risk / Rollback / Status: READY_FOR_REVIEW) rồi báo lại NGUYÊN VĂN cho Sếp — Sếp sẽ đưa cho Hồ Ly review, không tự ý merge/deploy khi chưa ai xem qua.`;

console.log(lenh);
