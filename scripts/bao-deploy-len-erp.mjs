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

/** Khoảng commit của lượt đẩy này — hoặc đúng commit cuối nếu không đọc được. */
function phamVi() {
  if (TRUOC && TRUOC !== KHONG) {
    try { git('cat-file', '-e', `${TRUOC}^{commit}`); return [`${TRUOC}..${NAY}`]; }
    catch { /* commit trước không có trong bản checkout nông */ }
  }
  console.log('Không đọc được commit trước lượt đẩy — chỉ xét đúng commit cuối.');
  return ['-1', NAY];
}

/** Đọc git log ra mảng { sha, tieu_de, than }. Dùng ký tự phân tách hiếm
 *  (\x00 giữa các trường, \x01 giữa các commit) để thông điệp commit có xuống
 *  dòng, dấu ngoặc, emoji… cũng không cắt nhầm. */
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
  }).filter(c => /^[0-9a-f]{7,40}$/i.test(c.sha));
}

async function main() {
  if (!KHOA && !THU) {
    console.log('Chưa đặt secret DEPLOY_CHOT_KHOA — bỏ qua, KHÔNG đổi góp ý nào.');
    console.log('Cách bật: thêm secret cùng tên ở GitHub Settings → Secrets, VÀ ở két');
    console.log('          Cloudflare (npx wrangler secret put DEPLOY_CHOT_KHOA). Hai bên giống hệt nhau.');
    return;
  }

  const cacCommit = docCommit();
  const banTin = JSON.stringify({ luc: new Date().toISOString(), cac_commit: cacCommit });
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
  if (!ma.length) return;   // 0 mã → 0 lượt gọi, 0 câu ghi D1

  const chuKy = createHmac('sha256', KHOA).update(banTin).digest('hex');
  let tl;
  try {
    tl = await fetch(`${ERP}/api/gop-y/da-len-that`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-erp-chu-ky': `sha256=${chuKy}` },
      body: banTin
    });
  } catch (e) {
    console.log(`::warning::Không gọi được ERP (${e.message}). Deploy VẪN THÀNH CÔNG; không góp ý nào bị đổi.`);
    return;
  }

  const chu = await tl.text();
  console.log(`ERP trả mã ${tl.status}: ${chu.slice(0, 2000)}`);
  if (tl.status === 503)
    console.log('::warning::ERP chưa sẵn sàng chốt góp ý (thiếu khoá hoặc chưa nạp ' +
                'migrations/them-gopy-da-len-that.sql). Không góp ý nào bị đổi.');
  else if (!tl.ok)
    console.log('::warning::ERP từ chối bản tin chốt góp ý. Không góp ý nào bị đổi.');
}

main().catch(e => {
  // Deploy đã xong ở bước trước — báo tin hỏng thì KÊU TO, không nhuộm đỏ.
  console.log(`::warning::Bước báo góp ý gặp sự cố: ${e.message}. Deploy vẫn thành công.`);
});
