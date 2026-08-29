/* ==========================================================================
   BÀN ĐO TRONG TRÌNH DUYỆT — KHO TÀI LIỆU  ·  CTL-0026 Đợt 1
   ---------------------------------------------------------------------------
   Chạy:  node scripts/ban-quet-tai-lieu.mjs     rồi mở  http://127.0.0.1:8902

   Ba thứ CHỈ đo được trong trình duyệt thật, không đo được bằng Node:
     ① CỠ ẢNH TRƯỚC/SAU NÉN — `nenAnhChung()` chạy bằng canvas. Ảnh thử là
        một trang A4 3024×4032 dựng thật (chữ tiếng Việt có dấu, dấu đỏ,
        nhiễu hạt như ảnh chụp thiếu sáng) rồi mã hoá JPEG 0.95 — đúng cỡ
        ảnh máy ảnh điện thoại đang cho ra.
     ② SỐ CHẠM — đếm ĐÚNG số lần ngón tay chạm, từ lúc mở kho tới lúc lưu
        xong một bộ BA TRANG. Đếm bằng cách bắt sự kiện `click` thật ở tầng
        document, không phải đọc code đếm nút.
     ③ CHIỀU CAO NÚT THẬT ở bề ngang 375px — `getBoundingClientRect()`, đo
        chính màn quét đang chạy, không khớp chuỗi CSS (BH-02).

   CA ĐỐI CHỨNG (BH-16) đi kèm từng mục, xem `KET_LUAN` ở cuối trang.
   ========================================================================== */

import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONG = 8902;

const KIEU = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8'
};

/* Số byte thân yêu cầu mà máy chủ NHẬN ĐƯỢC — dùng để đo thời gian gửi thật
   và đối chiếu với cỡ PDF mà trình duyệt báo. */
let lanGuiCuoi = null;
/* Công tắc ÉP HỎNG — để dựng lại đúng cảnh kho sóng yếu: gửi đi, máy chủ
   không nhận được. Ràng buộc CTL-0025 Mục 4: "gửi hụt phải gửi lại được,
   không mất ảnh đã chụp". Không ép hỏng được thì không chứng minh được. */
let epHong = false;
/* Sổ ghi mọi lượt gửi — để chứng minh lần gửi lại mang ĐÚNG `ma_gui` cũ. */
const soGui = [];

/* Đọc LẠI mỗi lượt — sửa bàn đo xong chỉ cần tải lại trang, không phải khởi
   động lại máy chủ. Bản đầu đọc một lần lúc khởi động và đã làm mất nguyên
   một vòng gỡ rối: sửa file mà trình duyệt vẫn nhận bản cũ. */
const docTrang = () =>
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'ban-quet-tai-lieu.html'), 'utf8');

createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');

  /* Giả lập API lưu — trả về ngay, để phần đo SỐ CHẠM không phụ thuộc mạng.
     Cỡ thân yêu cầu vẫn được ghi lại để báo cáo. */
  if (u.pathname === '/ep-hong') {
    epHong = u.searchParams.get('bat') === '1';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ep_hong: epHong }));
  }

  if (u.pathname === '/api/tai-lieu/luu' && req.method === 'POST') {
    let co = 0;
    const manh = [];
    const t0 = Date.now();
    req.on('data', c => { co += c.length; manh.push(c); });
    req.on('end', () => {
      let ma = null, soTrang = 0;
      try {
        const j = JSON.parse(Buffer.concat(manh).toString('utf8'));
        ma = j.ma_gui; soTrang = j.so_trang;
      } catch { /* thân hỏng — vẫn ghi số byte */ }
      soGui.push({ ma_gui: ma, so_trang: soTrang, co_byte_than: co, ep_hong: epHong });
      lanGuiCuoi = { co_byte_than: co, ms_nhan: Date.now() - t0, ma_gui: ma };
      if (epHong) {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ loi: 'Mạng kho yếu, máy chủ không nhận được (ép hỏng để thử)' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, id: 'tl_ban_do', so_trang: soTrang, ocr_so_trang: soTrang,
        co_byte_than: co, canh_bao: 'Đây là bản dự phòng để tra cứu. KHÔNG thay bản giấy — đừng huỷ giấy gốc.' }));
    });
    return;
  }
  /* Ghi ảnh thử ra đĩa để bàn đo BÓC CHỮ (scripts/do-boc-chu.mjs) dùng lại
     ĐÚNG những tấm ảnh đã đi qua đúng đường nén của sản phẩm. Tự dựng ảnh
     riêng cho phép đo OCR thì đo một đường khác với đường đang chạy. */
  if (u.pathname === '/luu-anh-thu' && req.method === 'POST') {
    const manh = [];
    req.on('data', c => manh.push(c));
    req.on('end', () => {
      const j = JSON.parse(Buffer.concat(manh).toString('utf8'));
      mkdirSync(path.join(GOC, '.do-tam'), { recursive: true });
      for (const [ten, b64] of Object.entries(j)) {
        writeFileSync(path.join(GOC, '.do-tam', ten + '.jpg'),
          Buffer.from(String(b64).replace(/^data:[^,]*,/, ''), 'base64'));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, so_tep: Object.keys(j).length }));
    });
    return;
  }

  if (u.pathname === '/lan-gui-cuoi') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ...(lanGuiCuoi || {}), so_gui: soGui }));
  }

  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': KIEU['.html'] });
    return res.end(docTrang());
  }

  /* Phục vụ thẳng file thật trong public/ — bàn đo phải chạy trên ĐÚNG mã
     đang phát hành, không phải bản chép tay. */
  const tep = path.join(GOC, 'public', u.pathname.replace(/^\/+/, ''));
  if (tep.startsWith(path.join(GOC, 'public')) && existsSync(tep)) {
    res.writeHead(200, { 'Content-Type': KIEU[path.extname(tep)] || 'application/octet-stream' });
    return res.end(readFileSync(tep));
  }

  res.writeHead(404); res.end('Không có');
}).listen(CONG, '127.0.0.1', async () => {
  console.log(`Bàn đo Kho tài liệu: http://127.0.0.1:${CONG}`);

  /* ---- TỰ CHẠY (`--tu-dong`) -------------------------------------------
     Bàn đo này vốn phải mở bằng tay, nên số đo của nó KHÔNG vào được cổng nào
     và cũng không ai chạy lại sau mỗi lần sửa. Cùng một trang, cùng một mã:
     mở bằng Chrome headless ở ĐÚNG 375px rồi đọc thẳng khối kết quả ra màn
     hình. Số đo tự chạy được là số đo còn sống sau ba tuần.
     Mã thoát 1 nếu có dòng HỎNG — để cắm được vào cổng. */
  if (!process.argv.includes('--tu-dong')) return;
  const { moChrome } = await import('./lib/ban-do-chrome.mjs');
  /* `/index.html` chứ không phải `/`: `moChrome` tìm tab theo `url.includes('.html')`. */
  const cr = await moChrome({ url: `http://127.0.0.1:${CONG}/index.html`, rong: 375, cao: 812, doiMs: 3000 });
  let chu = '';
  const han = Date.now() + 120000;
  while (Date.now() < han) {
    chu = await cr.chay(`document.querySelector('#kq')?.textContent || ''`);
    if (/KET_LUAN /.test(chu) || /BÀN ĐO HỎNG/.test(chu)) break;
    await cr.doi(500);
  }
  /* Lọc tiếng động của CHÍNH bàn đo, không lọc lỗi thật:
       · 502 là cảnh "ép hỏng" mục ⑤ cố ý dựng ra — đó là thứ đang được ĐO.
       · 404 là favicon; trang bàn đo không có icon.
     Mọi `console.error` khác vẫn tính là trượt. */
  const loiCon = cr.loiConsole.filter(l =>
    !/^\[log\] Failed to load resource.*(404|502)/.test(String(l)));
  cr.dong();
  console.log(chu);
  const soHong = (chu.match(/✗ HỎNG|BÀN ĐO HỎNG/g) || []).length;
  console.error(`\nBÀN QUÉT [375px]: ` +
    (soHong === 0 && loiCon.length === 0 ? '✅ ĐẠT' : `❌ ${soHong} dòng HỎNG, ${loiCon.length} console.error`));
  for (const l of loiCon.slice(0, 8)) console.error('  console.error: ' + l);
  process.exit(soHong === 0 && loiCon.length === 0 ? 0 : 1);
});
