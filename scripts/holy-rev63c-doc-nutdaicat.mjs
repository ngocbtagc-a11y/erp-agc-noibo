/* HỒ LY · REV-0063 vòng 3 — ĐỌC kết quả của `do-nut-dai-cat`.
 * `npm run do-nut-dai-cat` KHÔNG tự chấm: nó dựng một máy chủ ở cổng 8919 rồi
 * đứng đó chờ NGƯỜI mở trình duyệt. Không in kết luận, không có mã thoát.
 * Tệp này mở giúp bằng Chrome thật và đọc dòng KET_LUAN ra màn hình, để con số
 * `dat_het` là thứ ĐO ĐƯỢC LẠI chứ không phải thứ ai đó nhìn thấy một lần.
 * Cổng 8929 = bản chép của tôi (8919 đang bị một tiến trình mồ côi từ 22:36 giữ).
 */
import { moChrome } from './lib/ban-do-chrome.mjs';

const cr = await moChrome({ url: 'http://127.0.0.1:8929/trang.html', rong: 1440, cao: 900, doiMs: 4000 });
await cr.doi(2500);
const kq = await cr.chay(`(function(){
  const t = document.body.innerText;
  const m = t.match(/KET_LUAN[^\\n]*/);
  return { ketLuan: m ? m[0] : '(chưa có dòng KET_LUAN)',
           chu: t.slice(0, 4000) };
})()`);
console.log('KET_LUAN:', kq.ketLuan);
console.log('\n--- toàn văn ---\n' + kq.chu);
cr.dong();
