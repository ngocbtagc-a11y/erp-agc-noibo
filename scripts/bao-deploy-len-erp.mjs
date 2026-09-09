/* ============================================================================
   BÁO VỀ ERP: NHỮNG GÓP Ý NÀO VỪA ĐƯỢC SỬA XONG VÀ ĐÃ LÊN HỆ THỐNG THẬT
   ---------------------------------------------------------------------------
   Chạy ở bước CUỐI của .github/workflows/deploy.yml, sau khi wrangler deploy
   đã xong. Đọc thông điệp các commit vừa lên, tìm mã góp ý (`GY-12`), ký HMAC
   rồi POST về /api/gop-y/da-len-that của chính ERP vừa deploy.

   Chạy thử ở máy (KHÔNG gửi đi đâu, chỉ in ra bản tin sẽ gửi):
     node scripts/bao-deploy-len-erp.mjs --thu

   Biến môi trường:
     DEPLOY_CHOT_KHOA  khoá HMAC — thiếu thì bỏ qua êm, KHÔNG đổi góp ý nào
     DEPLOY_TRUOC      commit trước lượt đẩy (github.event.before)
     DEPLOY_NAY        commit cuối lượt đẩy (github.sha)
     ERP_URL           gốc địa chỉ ERP

   ⚠️ HỎNG THEO CHIỀU AN TOÀN. Không đọc được khoảng commit (đẩy nhánh mới,
   bấm tay workflow_dispatch, lịch sử nông) thì LÙI VỀ ĐÚNG COMMIT CUỐI. Bỏ
   sót vài commit là chiều an toàn: cùng lắm một góp ý chậm được đóng, chứ
   không bao giờ đóng nhầm góp ý của người khác.
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';

const THU = process.argv.includes('--thu');
const KHOA = process.env.DEPLOY_CHOT_KHOA || '';
const ERP  = (process.env.ERP_URL || 'https://erp-agc.noiboagc.workers.dev').replace(/\/+$/, '');
const NAY  = process.env.DEPLOY_NAY || 'HEAD';
const TRUOC = process.env.DEPLOY_TRUOC || '';

const KHONG = '0000000000000000000000000000000000000000';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}

/* ⚠️ CẮT LỊCH SỬ THÌ PHẢI KÊU — REV-0064 H1.
   Bản trước lùi về "chỉ commit cuối" rồi in MỘT DÒNG console thường: không
   `::warning::`, không Telegram, không nằm trong thân bản tin. Máy chủ dựng
   trần 200 commit kèm chuông Telegram để chặn đúng chuyện này — nhưng
   `fetch-depth: 50` cắt trước ở ngưỡng thấp hơn bốn lần, nên chuông kia không
   bao giờ kêu. Hỏng theo chiều an toàn (bỏ sót, không đóng nhầm) NHƯNG IM
   LẶNG — mà im lặng chính là thứ làm Sếp phải hỏi lần thứ ba.
   Hai lớp bây giờ: `fetch-depth: 0` ở workflow, VÀ cờ này. */
let LICH_SU_BI_CAT = false;

/** Khoảng commit của lượt đẩy này — hoặc đúng commit cuối nếu không đọc được. */
function phamVi() {
  if (TRUOC && TRUOC !== KHONG) {
    try { git('cat-file', '-e', `${TRUOC}^{commit}`); return [`${TRUOC}..${NAY}`]; }
    catch {
      /* Có mốc trước NHƯNG không đọc được — đây đúng là ca bị cắt lịch sử,
         khác hẳn ca "lượt đẩy đầu tiên" bên dưới. */
      LICH_SU_BI_CAT = true;
      console.log(`::warning::KHÔNG ĐỌC ĐƯỢC LỊCH SỬ GIT của lượt đẩy này ` +
        `(${String(TRUOC).slice(0, 7)}..${String(NAY).slice(0, 7)} — bản checkout quá nông). ` +
        'Máy CHỈ XÉT ĐÚNG COMMIT CUỐI: mọi commit khác trong lượt đẩy có tuyên bố ' +
        '"Vá GY-…" đều KHÔNG được chốt và người báo KHÔNG được báo. ' +
        'Sửa: đặt fetch-depth: 0 ở .github/workflows/deploy.yml.');
      return ['-1', NAY];
    }
  }
  // Lượt đẩy đầu tiên / chạy tay: không có mốc trước là ĐÚNG, không phải cắt.
  console.log('Không có mốc commit trước (lượt đầu hoặc chạy tay) — chỉ xét đúng commit cuối.');
  return ['-1', NAY];
}

/** Đọc git log ra mảng { sha, tieu_de, than }. Dùng ký tự phân tách hiếm
 *  (\x00 giữa các trường, \x01 giữa các commit) để thông điệp commit có xuống
 *  dòng, dấu ngoặc, emoji… cũng không cắt nhầm. */
/* ⚠️ BẰNG CHỨNG, KHÔNG PHẢI LỜI KHAI (REV-0042 C1). Thông điệp commit là thứ
   người GÕ — gõ nhầm số, hoặc viết `"REV-0042: soi lại GY-1, chưa sửa gì"` thì
   bản trước đóng luôn GY-1 và nhắn nhầm người gửi. Danh sách file bị đổi là
   thứ không gõ nhầm được. Máy chủ mới đòi nó.

   Đọc hỏng thì trả `null` chứ KHÔNG trả `[]`: hai thứ khác hẳn nhau. `[]` là
   "commit này không đổi file nào"; `null` là "không biết" — và máy chủ xử
   `null` theo chiều an toàn (dựng cờ cho Sếp, không tự đẩy, không nhắn ai). */
function docTepCuaCommit(sha) {
  try {
    return git('diff-tree', '--no-commit-id', '--name-only', '-r', '-m', sha)
      .split('\n').map(s => s.trim()).filter(Boolean).slice(0, 300);
  } catch { return null; }
}

function docCommit() {
  let raw = '';
  try {
    raw = git('log', '--no-merges', '--format=%H%x00%s%x00%b%x01', ...phamVi());
  } catch (e) {
    console.log('Không đọc được git log:', e.message, '— bỏ qua, KHÔNG đổi góp ý nào.');
    return [];
  }
  return raw.split('\x01').map(s => s.trim()).filter(Boolean).map(khoi => {
    const [sha, tieu_de, than] = khoi.split('\x00');
    // Cắt `than` ở 2000 ký tự đúng bằng trần máy chủ — thông điệp commit ở
    // repo này có cái dài vài chục nghìn ký tự, gửi nguyên là phí băng thông
    // mà máy chủ cũng cắt. Mã góp ý luôn nằm ở đầu, không mất.
    return { sha: (sha || '').trim(), tieu_de: (tieu_de || '').trim(),
             than: (than || '').trim().slice(0, 2000) };
  }).filter(c => /^[0-9a-f]{7,40}$/i.test(c.sha))
    .map(c => ({ ...c, cac_tep: docTepCuaCommit(c.sha) }));
}

async function main() {
  /* ⚠️ THIẾU KHOÁ PHÍA GITHUB THÌ PHẢI KÊU (REV-0042 mục 3). Bản trước in
     `console.log` thường rồi `return` — job Actions vẫn XANH, ERP không nhận
     được một tiếng nào, và cả đường "báo người gửi" TẮT HẲN mà không ai biết.
     Giờ: `::warning::` cho Actions, VÀ vẫn gõ cửa ERP một tiếng không chữ ký
     để ERP kêu bằng Telegram (nó trả 401 và bắn 1 tin/ngày). */
  if (!KHOA && !THU) {
    console.log('::warning::Chưa đặt secret DEPLOY_CHOT_KHOA phía GitHub — KHÔNG góp ý nào ' +
                'được chốt, KHÔNG người báo lỗi nào được báo.');
    console.log('Cách bật: thêm secret cùng tên ở GitHub Settings → Secrets, VÀ ở két');
    console.log('          Cloudflare (npx wrangler secret put DEPLOY_CHOT_KHOA). Hai bên giống hệt nhau.');
    await chaoHoi(null);
    return;
  }

  const cacCommit = docCommit();
  /* `lich_su_bi_cat` đi CÙNG bản tin để ERP gõ chuông Telegram — nhật ký
     Actions không ai đọc mỗi ngày, `::warning::` một mình là chưa đủ. */
  const banTin = JSON.stringify({ luc: new Date().toISOString(), cac_commit: cacCommit,
                                  lich_su_bi_cat: LICH_SU_BI_CAT });
  console.log(`Có ${cacCommit.length} commit trong lượt đẩy này.`);

  // In ra ĐÚNG những mã góp ý đọc được, để nhật ký Actions tự nó là bằng chứng.
  const ma = [...new Set(cacCommit.flatMap(c =>
    // Cùng một khuôn với MAU_MA_GOP_Y trong src/chot-gop-y-deploy.js. Ở đây
    // nó chỉ để IN RA nhật ký Actions và để bỏ hẳn lượt gọi khi không có mã
    // nào; luật thật vẫn do máy chủ quyết, nên hai bên lệch nhau cũng không
    // đóng nhầm được góp ý nào — cùng lắm là gọi thừa một lượt.
    [...`${c.tieu_de}\n${c.than}`.matchAll(/(?<![A-Za-z0-9])GY[-_ ](\d{1,7})(?![0-9A-Za-z])/gi)]
      .map(m => `GY-${parseInt(m[1], 10)}`)))];
  console.log(ma.length ? `Mã góp ý đọc được: ${ma.join(', ')}` : 'Không commit nào nhắc mã góp ý — không có gì để chốt.');

  if (THU) { console.log(banTin); return; }

  /* 0 mã: vẫn gõ cửa MỘT tiếng (bản tin rỗng) thay vì im.
     REV-0042 mục 3: bản trước `return` thẳng ở đây, nên một lượt đẩy không
     nhắc mã nào là khoá lệch KHÔNG BAO GIỜ lộ ra — tới hôm có góp ý thật thì
     nó đã hỏng từ lâu. Bản tin rỗng: máy chủ xác thực chữ ký rồi trả ngay ở
     `khong_co_commit`, KHÔNG đọc, KHÔNG ghi một câu D1 nào. */
  const than = ma.length ? banTin
    : JSON.stringify({ luc: new Date().toISOString(), cac_commit: [], chao_hoi: true,
                       lich_su_bi_cat: LICH_SU_BI_CAT });
  await chaoHoi(than);
}

/** Gọi ERP một tiếng. `than = null` nghĩa là KHÔNG có khoá — cố tình gửi
 *  không chữ ký để ERP biết đường mà kêu (401 + 1 tin Telegram/ngày). */
async function chaoHoi(than) {
  const body = than || JSON.stringify({ luc: new Date().toISOString(), cac_commit: [], chao_hoi: true });
  const headers = { 'content-type': 'application/json' };
  if (than && KHOA) headers['x-erp-chu-ky'] = `sha256=${createHmac('sha256', KHOA).update(body).digest('hex')}`;

  let tl;
  try {
    tl = await fetch(`${ERP}/api/gop-y/da-len-that`, { method: 'POST', headers, body });
  } catch (e) {
    console.log(`::warning::Không gọi được ERP (${e.message}). Deploy VẪN THÀNH CÔNG; không góp ý nào bị đổi.`);
    return;
  }

  const chu = await tl.text();
  console.log(`ERP trả mã ${tl.status}: ${chu.slice(0, 2000)}`);
  if (tl.status === 503)
    console.log('::warning::ERP chưa sẵn sàng chốt góp ý (thiếu khoá phía Cloudflare hoặc chưa nạp ' +
                'migrations/them-gopy-da-len-that.sql). Không góp ý nào bị đổi.');
  else if (tl.status === 401)
    console.log('::warning::ERP TỪ CHỐI CHỮ KÝ — khoá DEPLOY_CHOT_KHOA ở GitHub và ở Cloudflare ' +
                'đang KHÁC NHAU (hoặc thiếu một bên). Đặt lại GIỐNG HỆT ở cả hai nơi. ' +
                'Từ giờ tới lúc sửa: không góp ý nào được chốt, không ai được báo.');
  else if (!tl.ok)
    console.log('::warning::ERP từ chối bản tin chốt góp ý. Không góp ý nào bị đổi.');
}

main().catch(e => {
  // Deploy đã xong ở bước trước — báo tin hỏng thì KÊU TO, không nhuộm đỏ.
  console.log(`::warning::Bước báo góp ý gặp sự cố: ${e.message}. Deploy vẫn thành công.`);
});
