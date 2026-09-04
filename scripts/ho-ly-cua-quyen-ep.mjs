/* ==========================================================================
   HỒ LY VÒNG 2 — ÉP ĐÚNG CA MÀ CỬA QUYỀN SINH RA ĐỂ CHẶN
   ---------------------------------------------------------------------------
   Cửa quyền trong bộ xử lý nút "Chi tiết" lọc bỏ ô có `ths[i].hidden`. Nhưng
   sau bản vá vòng 1, khi số ô khớp danh sách cột ĐANG HIỆN thì `ths = thHien`
   — một danh sách ĐÃ LỌC BỎ th ẩn — nên `ths[i].hidden` LUÔN LUÔN false, tức
   cửa quyền thành vô hiệu trong nhánh đó.

   Câu hỏi: nhánh đó có bao giờ chở dữ liệu cần giấu không?

   Ca duy nhất cửa quyền thật sự phải chặn là: `<th>` bị ẩn VÌ QUYỀN mà `<td>`
   VẪN được vẽ kèm dữ liệu. Ép đúng ca đó ở đây — vẽ đủ ô rồi mới ẩn `<th>`
   của cột `.cot-phu` "Người gửi" — và xem bấm "Chi tiết" có lòi ra không.

   CHẠY: node scripts/ho-ly-cua-quyen-ep.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI, DANH_BA } from './lib/ban-do-chrome.mjs';

const BI_MAT = 'BIMAT-NGUOI-GUI-KHONG-DUOC-XEM';

const apiRieng = (d, u, j) => {
  if (d === '/api/danh-ba') { j({ danh_ba: DANH_BA }); return true; }
  if (d === '/api/toi-la-ai') {
    j({ ...TOI, vai_tro: 'nguoi_dung', la_admin: false,
        quyen: ['tongquan', 'lichsuviec', 'danhba', 'gopy'] });
    return true;
  }
  if (d === '/api/gop-y') {
    /* nguoi_gui_id KHÁC tôi → coCotNguoiGui = true → <td> ĐƯỢC VẼ kèm dữ liệu */
    const ds = [{ id: 1, ma: 'GY-001', tieu_de: 'Việc thử', trang_thai: 'moi',
      next_owner: 'ADMIN', tao_luc: '2026-09-01 08:00:00',
      nguoi_gui_id: 'NS-KHAC', nguoi_gui_ten: BI_MAT, nguoi_gui_bo_phan: '',
      risk: null, de_xuat_risk: null, khu_vuc: null }];
    j({ gop_y: ds, danh_sach: ds, toi: TOI.id });
    return true;
  }
  return false;
};

/* Vẽ xong rồi mới ẩn <th> — mô phỏng đúng "máy chủ vẫn gửi, giao diện mới
   khoá". Đây là ca mà cửa quyền tồn tại để chặn. */
const EP_AN_TH = `(function(){
  const th = document.querySelector('#gy-cot-nguoigui');
  if (!th) return 'khong co th';
  th.hidden = true;
  return { daAn: th.hidden };
})()`;

const BAM = `(function(){
  const tb = document.querySelector('#gy-bang');
  const tr = [...tb.rows].find(r => !r.classList.contains('dong-chitiet'));
  const t = tb.closest('table');
  const thTatCa = [...t.querySelector('thead tr:last-of-type').children];
  const thHien = thTatCa.filter(x => !x.hidden);
  const nut = tr.querySelector('button[data-chitiet]');
  const kq = { soO: tr.cells.length, thTatCa: thTatCa.length, thHien: thHien.length,
               nhanhDuocChon: tr.cells.length === thHien.length ? 'thHien'
                            : tr.cells.length === thTatCa.length ? 'thTatCa' : 'KHONG-KHOP',
               coNut: !!nut, biMatTrenBang: false, biMatTrongChiTiet: false, o: [] };
  /* Ô "Người gửi" trên bảng có bị CSS ẩn không (cot-phu → display:none)? */
  for (const td of tr.cells) {
    if ((td.textContent || '').includes('${BI_MAT}'))
      kq.biMatTrenBang = getComputedStyle(td).display !== 'none';
  }
  if (nut) {
    nut.click();
    const sau = tr.nextElementSibling;
    if (sau && sau.classList.contains('dong-chitiet')) {
      kq.o = [...sau.querySelectorAll('.chitiet-o')].map(x => ({
        nhan: (x.querySelector('.chitiet-nhan')||{}).textContent||'',
        tri:  (x.querySelector('.chitiet-tri') ||{}).textContent||'' }));
      kq.biMatTrongChiTiet = sau.textContent.includes('${BI_MAT}');
    }
  }
  return kq;
})()`;

const may = await dungMayGia({ tatHoatAnh: true, apiRieng });
const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: 1440, doiMs: 2600 });
await cr.chay(`document.querySelector('[data-tab="gopy"]')?.click(); 1`);
await cr.doi(1800);

console.log('--- TRƯỚC khi ép ẩn <th> (cột hiện bình thường) ---');
console.log(JSON.stringify(await cr.chay(BAM), null, 1));

console.log('\n--- SAU khi ép ẩn <th> "Người gửi" mà <td> vẫn có dữ liệu ---');
console.log(JSON.stringify(await cr.chay(EP_AN_TH)));
await cr.doi(900);
const sau = await cr.chay(BAM);
console.log(JSON.stringify(sau, null, 1));
console.log(sau.biMatTrongChiTiet
  ? '\n❌❌ CHẶN — bí mật LỌT ra dòng "Chi tiết" dù <th> đã bị ẩn vì quyền'
  : '\n✅ Cửa quyền giữ được: bí mật KHÔNG lọt ra dòng "Chi tiết"');
if (cr.loiConsole.length) console.log('LỖI CONSOLE: ' + cr.loiConsole.join(' | '));
cr.dong(); may.dong();
