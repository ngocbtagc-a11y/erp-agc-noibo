/* ==========================================================================
   BÀN ĐO TẢI FILE CÓ SẴN LÊN KHO  ·  CTL-0026 vòng 6
   ---------------------------------------------------------------------------
   Chạy:  npm run do-tai-tep          (tự chạy Chrome, in kết quả, thoát 0/1)
          node scripts/ban-tai-tep.mjs    rồi mở  http://127.0.0.1:8903

   Sếp Ngọc 29/08/2026: *"rất oke nhưng đang thấy chưa tối ưu, nếu tôi upload
   file từ máy tính lên thì không có chỗ thêm tài liệu à"*.

   VÌ SAO PHẢI ĐO TRONG TRÌNH DUYỆT THẬT, KHÔNG ĐO BẰNG NODE:
   sáu thứ dưới đây KHÔNG tồn tại ngoài trình duyệt — `File`/`DataTransfer`,
   `matchMedia('(pointer: coarse)')`, `canvas` (đường nén ảnh), `dragstart/drop`,
   `getBoundingClientRect()` (chiều cao nút THẬT), và thứ tự `input.files`.
   Đọc mã đoán ra thì đoán được, nhưng đoán không phải đo.

   Phần MÁY CHỦ của cùng đường này (trần 25 MB · chữ ký `%PDF-` · lượt ghi D1 ·
   hai cửa · câu "chưa bóc chữ" vào cột) nằm ở `scripts/do-kho-tai-lieu.mjs`
   mục ⑬ — gọi hàm thật của `src/tai-lieu.js`, không khớp chuỗi.

   Chạy Ở HAI BỀ NGANG: 1440 (máy tính) và 375 (điện thoại). Cả hai đều là
   một lượt chạy riêng, vì thứ đang đo chính là "hai máy mở ra thấy KHÁC nhau".
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONG = 8903;

const KIEU = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8'
};

/* Sổ ghi mọi lượt gửi — để chứng minh (a) ca vượt trần KHÔNG gửi byte nào, và
   (b) file PDF gửi lên GIỐNG HỆT file gốc từng byte (không bọc lại). */
const soGui = [];

const docTrang = () => readFileSync(path.join(GOC, 'scripts/ban-tai-tep.html'), 'utf8');

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');

  if (u.pathname === '/api/tai-lieu/luu' && req.method === 'POST') {
    const manh = [];
    req.on('data', c => manh.push(c));
    req.on('end', () => {
      let j = {};
      try { j = JSON.parse(Buffer.concat(manh).toString('utf8')); } catch {}
      soGui.push({
        ma_gui: j.ma_gui, so_trang: j.so_trang, dinh_dang: j.dinh_dang,
        nguon: j.nguon, tieu_de: j.tieu_de,
        /* Băm nội dung để so BẰNG BYTE với file gốc mà không phải chuyển cả
           file về đây — chuỗi base64 là đủ, nó là song ánh với khối byte. */
        tep_b64: j.tep || '', so_anh_boc_chu: (j.anh_boc_chu || []).length
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true, id: 'tl_ban_do', so_trang: j.so_trang,
        ocr_so_trang: j.dinh_dang === 'pdf_goc' ? 0 : (j.anh_boc_chu || []).length,
        ocr_so_trang_neo: 0,
        ocr_ghi_chu: j.dinh_dang === 'pdf_goc'
          ? 'File PDF lưu NGUYÊN BẢN. ERP chưa bóc được chữ bên trong PDF để tra cứu.'
          : null,
        canh_bao: 'Đây là bản dự phòng để tra cứu. KHÔNG thay bản giấy.'
      }));
    });
    return;
  }

  if (u.pathname === '/so-gui') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(soGui));
  }

  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': KIEU['.html'] });
    return res.end(docTrang());
  }

  const tep = path.join(GOC, 'public', u.pathname.replace(/^\/+/, ''));
  if (tep.startsWith(path.join(GOC, 'public')) && existsSync(tep)) {
    res.writeHead(200, { 'Content-Type': KIEU[path.extname(tep)] || 'application/octet-stream' });
    return res.end(readFileSync(tep));
  }
  res.writeHead(404); res.end('Không có');
}).listen(CONG, '127.0.0.1', async () => {
  console.log(`Bàn đo tải file: http://127.0.0.1:${CONG}`);
  if (!process.argv.includes('--tu-dong')) return;

  const { moChrome } = await import('./lib/ban-do-chrome.mjs');
  let soHong = 0;

  /* HAI LƯỢT CHẠY, HAI BỀ NGANG. Không gộp: thứ đang đo là sự KHÁC NHAU giữa
     hai máy, mà một lượt chạy chỉ nói được về một máy. */
  for (const [nhan, rong] of [['MÁY TÍNH', 1440], ['ĐIỆN THOẠI', 375]]) {
    const cr = await moChrome({ url: `http://127.0.0.1:${CONG}/index.html`, rong, cao: 900, doiMs: 2500 });
    /* Bật cảm ứng cho lượt 375 — `setDeviceMetricsOverride` một mình KHÔNG
       đặt `maxTouchPoints` hay `pointer: coarse`, mà đó đúng là hai dấu hiệu
       `duongMacDinh()` đọc. Không bật thì bàn đo đo một cái điện thoại không
       có màn cảm ứng — tức là đo nhầm máy. */
    /* `maxTouchPoints` phải nằm trong 1..16 — CDP từ chối số 0, nên lượt máy
       tính chỉ TẮT cảm ứng và không khai số điểm chạm. */
    await cr.goi('Emulation.setTouchEmulationEnabled',
      rong <= 640 ? { enabled: true, maxTouchPoints: 5 } : { enabled: false }, cr.sessionId);
    await cr.goi('Page.reload', {}, cr.sessionId);
    await cr.doi(2500);

    let chu = '';
    const han = Date.now() + 120000;
    while (Date.now() < han) {
      chu = await cr.chay(`document.querySelector('#kq')?.textContent || ''`);
      if (/KET_LUAN /.test(chu) || /BÀN ĐO HỎNG/.test(chu)) break;
      await cr.doi(500);
    }
    const loiCon = cr.loiConsole.filter(l => !/^\[log\] Failed to load resource.*404/.test(String(l)));
    cr.dong();

    console.log(`\n═══════════ ${nhan} · ${rong}px ═══════════`);
    console.log(chu);
    const hong = (chu.match(/✗ HỎNG|BÀN ĐO HỎNG/g) || []).length;
    soHong += hong + loiCon.length;
    for (const l of loiCon.slice(0, 6)) console.error('  console.error: ' + l);
  }

  console.log('\n───────────────────────────────────────────────────────────');
  console.error(`BÀN TẢI FILE: ${soHong === 0 ? '✅ ĐẠT cả hai bề ngang' : `❌ ${soHong} dòng HỎNG`}`);
  process.exit(soHong === 0 ? 0 : 1);
});
