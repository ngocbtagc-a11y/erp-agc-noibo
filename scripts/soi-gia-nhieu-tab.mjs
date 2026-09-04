/* ==========================================================================
   GIÁ THẬT CỦA "NHIỀU TAB" — Hồ Ly, REV-0057 vòng 2
   ---------------------------------------------------------------------------
   Lời khai: "+1 lệnh gọi mỗi cú bấm · tab ẩn vẫn ngủ nên không tốn thêm".
   Câu hỏi: "tab ẩn" ở đây là tab TRONG ỨNG DỤNG hay tab của TRÌNH DUYỆT?
   Đo thẳng: mở 1 · 2 · 3 · 4 tab ERP rồi bấm ĐÚNG một nút, đếm lệnh gọi.

   Chạy:  node scripts/soi-gia-nhieu-tab.mjs
   ========================================================================== */

import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';
import { execFileSync } from 'node:child_process';

const MAIN = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: GOC }).toString().trim();
const QUYEN = ['tongquan', 'lichsuviec', 'chat', 'congviec', 'muctieu', 'taisan'];

async function do1(nhan, commit, soTab) {
  const dem = new Map();
  const may = await dungMayGia({
    commit, tatHoatAnh: true,
    suaTep: (s, f) => f === 'assets/js/app.js' ? s + `\nwindow.__API = API;\n` : s,
    apiRieng: (duong, u, traJson) => {
      dem.set(duong, (dem.get(duong) || 0) + 1);
      if (duong === '/api/toi-la-ai') return traJson({
        ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
        phong_ban: 'Ban Giám đốc', vai_tro: 'nhan_vien', phai_doi_mk: 0, anh_dai_dien: null,
        trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
        la_admin: 0, phong_ban_quan_ly: [], them_nhan_su: 0, thao_tac_van_hanh: 0,
        quyen: QUYEN, shopee: null
      }) || true;
      if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
      if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
      if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
      if (duong === '/api/muc-tieu/danh-sach')
        return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
      if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 0 } }) || true;
      return false;
    }
  });
  const url = `http://127.0.0.1:${may.cong}/app.html`;
  const cr = await moChrome({ url, doiMs: 3000 });
  const phu = [];
  for (let i = 1; i < soTab; i++) {
    const t = await cr.goi('Target.createTarget', { url });
    phu.push(t.targetId);
    await cr.doi(2600);
  }
  /* VÒNG 3 — SỬA LỖI CỦA CHÍNH BÀN SOI NÀY. `Target.createTarget` đưa tab MỚI
     ra TRƯỚC, nên tab 1 (chỗ tôi bấm) tụt xuống NỀN. Người dùng thật không bao
     giờ bấm nút trong một tab đang nằm nền — đo như vậy là đo một cảnh không có
     thật, và nó làm con số ra 8 thay vì 5. Kéo tab 1 về trước rồi mới bấm.
     (Khỉ Đột báo đúng chỗ này ở ca ⑪ của nó; tôi vấp đúng cái hố đó.) */
  await cr.goi('Page.bringToFront', {}, cr.sessionId);
  await cr.doi(800);
  const tabPhuAn = [];
  for (const t of phu) {
    const { sessionId: sp } = await cr.goi('Target.attachToTarget', { targetId: t, flatten: true });
    const r = await cr.goi('Runtime.evaluate', { expression: 'document.hidden', returnByValue: true }, sp);
    tabPhuAn.push(r.result.value);
  }
  dem.clear();
  /* Đường NÚT THẬT: ghi rồi gọi tay hàm làm mới (y như app.js làm) */
  await cr.chay(`(async () => {
    await window.__API.cvCapNhat(1, 'hoan_thanh', 'xong').catch(()=>{});
    if (window.LAM_MOI_CONGVIEC) await window.LAM_MOI_CONGVIEC();
    if (window.LAM_MOI_MUCTIEU) await window.LAM_MOI_MUCTIEU();
  })()`);
  await cr.doi(2200);
  const bo = [...dem.entries()].filter(([d]) => !/chat\//.test(d));
  const tong = bo.reduce((a, [, n]) => a + n, 0);
  for (const t of phu) { try { await cr.goi('Target.closeTarget', { targetId: t }); } catch { /* kệ */ } }
  cr.dong(); may.dong();
  return { nhan, soTab, tong, tabPhuAn,
    chiTiet: bo.map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · ') };
}

console.log('\nMỘT CÚ BẤM "DUYỆT XONG" TỐN BAO NHIÊU LỆNH GỌI MÁY CHỦ');
console.log('(bỏ nhịp tim chat; tất cả tab đều đứng ở Tổng quan — đúng thói quen thật)\n');
const bang = [];
bang.push(await do1('TRƯỚC (origin/main)', MAIN, 1));
bang.push(await do1('TRƯỚC (origin/main)', MAIN, 3));
for (const n of [1, 2, 3, 4]) bang.push(await do1('SAU  (bản vá)', null, n));
for (const r of bang) {
  const dk = r.soTab > 1
    ? (r.tabPhuAn.every(x => x === true) ? ' [tab phụ đều ở NỀN ✔]' : ' [⚠ tab phụ KHÔNG ở nền: ' + JSON.stringify(r.tabPhuAn) + ']')
    : '';
  console.log(`${r.nhan.padEnd(22)} ${r.soTab} tab → ${String(r.tong).padStart(3)} lệnh gọi${dk}   ${r.chiTiet}`);
}
const t1 = bang.find(r => r.nhan.startsWith('SAU') && r.soTab === 1).tong;
const m1 = bang.find(r => r.nhan.startsWith('TRƯỚC') && r.soTab === 1).tong;
const m3 = bang.find(r => r.nhan.startsWith('TRƯỚC') && r.soTab === 3).tong;
const t3 = bang.find(r => r.nhan.startsWith('SAU') && r.soTab === 3).tong;
console.log(`\n1 tab : ${m1} → ${t1}   (${t1 - m1 >= 0 ? '+' : ''}${t1 - m1})`);
console.log(`3 tab : ${m3} → ${t3}   (${t3 - m3 >= 0 ? '+' : ''}${t3 - m3})   ← lời khai "+1" chỉ đúng khi mở ĐÚNG MỘT tab`);
