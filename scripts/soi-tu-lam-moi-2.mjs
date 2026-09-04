/* ==========================================================================
   BÀN SOI ĐỘC LẬP — VÒNG 2 (Hồ Ly, REV-0057)
   ---------------------------------------------------------------------------
   Một câu hỏi duy nhất, và là câu hỏi nặng nhất còn lại:

   `lamMoiManVuaMo()` (đánh thức các màn ngủ khi mở tab) gọi `chay(n)` KHÔNG
   `await` — khác hẳn `xa()` gọi `await chay(n)`. Mà chính `lam-moi.js` khai
   thứ tự chạy là RÀNG BUỘC: thẻ tóm tắt Trạm Mục Tiêu ĐỌC LẠI
   `window.CV_DU_LIEU_CUA_TOI` (không gọi máy chủ), nên nó PHẢI chạy SAU khi
   `taiLai()` đã thay biến đó.

   → Nếu đánh thức chạy song song, thẻ tóm tắt đọc biến CŨ.
     Đó đúng bằng bệnh Sếp Ngọc gặp, chỉ đổi đường vào.

   Kịch bản: đứng ở Tổng quan (thẻ "Việc tôi giao — chờ duyệt: 2") → sang tab
   Tài sản → duyệt xong 2 việc (máy chủ đổi sang 0) → quay lại Tổng quan.
   Thẻ phải là 0. Nếu vẫn 2 = màn hình nói dối.

   Chạy:  node scripts/soi-tu-lam-moi-2.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI_ID } from './lib/ban-do-chrome.mjs';

const QUYEN = ['tongquan', 'lichsuviec', 'chat', 'congviec', 'muctieu', 'taisan'];

let choDuyet = 2;                 // máy chủ đang kể: 2 việc chờ duyệt
const dem = new Map();

function viec(i, tt) {
  return { id: i, tieu_de: 'Việc ' + i, trang_thai: tt, han_chot: null,
           nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy', nguoi_giao_id: TOI_ID };
}

/* Cho phép đo CÙNG phép đọc trên một commit cũ — đó là cách duy nhất
   chứng minh "xanh vì bản vá" chứ không phải "xanh vì tôi sửa phép đọc". */
const COMMIT = process.env.AGC_COMMIT || null;
const may = await dungMayGia({
  commit: COMMIT, tatHoatAnh: true,
  suaTep: (s, f) => f === 'assets/js/app.js' ? s + `\nwindow.__API = API;\n` : s,
  apiRieng: (duong, u, traJson) => {
    dem.set(duong, (dem.get(duong) || 0) + 1);
    if (duong === '/api/toi-la-ai') return traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'nhan_vien', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
      /* KHÔNG admin, KHÔNG trưởng phòng → đi đúng nhánh thẻ đọc lại
         `window.CV_DU_LIEU_CUA_TOI`, không gọi máy chủ lần hai. */
      la_admin: 0, phong_ban_quan_ly: [], them_nhan_su: 0, thao_tac_van_hanh: 0,
      quyen: QUYEN, shopee: null
    }) || true;
    if (duong === '/api/cong-viec/danh-sach') {
      return traJson({
        nhan: [],
        giao: [viec(1, choDuyet >= 1 ? 'cho_duyet' : 'dang_lam'),
               viec(2, choDuyet >= 2 ? 'cho_duyet' : 'dang_lam')]
      }) || true;
    }
    if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
    if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
    if (duong === '/api/muc-tieu/danh-sach')
      return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
    if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 0 } }) || true;
    return false;
  }
});
const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3000 });

/* ĐỌC THEO CẤU TRÚC, KHÔNG CẮT CHUỖI GỘP.
   LỖI CỦA CHÍNH BÀN SOI NÀY — Hồ Ly tự nhận (vòng 2, 03/09/2026); người bắt
   được là bên bị chấm. `veThe` (app.js:1757) vẽ mỗi thẻ thành BA ô: `.k`
   (nhãn) · `.v` (giá trị) · `.d` (mô tả). `textContent` gộp cả ba, nên
   "chờ duyệt" + "0" + "2 việc đang giao" ra chuỗi "…chờ duyệt02 việc đang
   giao" — regex `(\d+)` nuốt luôn chữ số ĐẦU CỦA MÔ TẢ, đọc ra "02" rồi in ❌
   OAN trên bản LÀNH. Nay hỏi thẳng ô `.v` của đúng thẻ cần đọc. */
const docThe = () => cr.chay(`(() => {
  const o = document.querySelector('#tq-tomtat');
  if (!o) return '[]';
  return JSON.stringify([...o.querySelectorAll('.stat')].map(t => ({
    k: ((t.querySelector('.k') || {}).textContent || '').trim(),
    v: ((t.querySelector('.v') || {}).textContent || '').trim(),
    d: ((t.querySelector('.d') || {}).textContent || '').trim()
  })));
})()`);
const inThe = async () => {
  const ds = JSON.parse(await docThe());
  return ds.length ? ds.map(t => `${t.k}=${t.v} (${t.d})`).join(' | ') : 'KHÔNG CÓ THẺ';
};
const layThe = async (nhan) => {
  const ds = JSON.parse(await docThe());
  const t = ds.find(x => x.k.includes(nhan));
  return t ? t.v : `(không có thẻ "${nhan}")`;
};

console.log('\n① Lúc mở trang (máy chủ: 2 việc chờ duyệt)');
console.log('   #tq-tomtat →', await inThe());

console.log('\n② Sang tab Tài sản, rồi DUYỆT XONG cả 2 việc (máy chủ đổi sang 0)');
await cr.chay(`document.querySelector('.sb-item[data-tab="taisan"]')?.click()`);
await cr.doi(500);
choDuyet = 0;
dem.clear();
await cr.chay(`window.__API.cvCapNhat(1,'hoan_thanh','xong').catch(()=>{})`);
await cr.doi(700);
console.log('   Lượt gọi trong lúc ở tab Tài sản:',
  [...dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · ') || '(không có)');

console.log('\n③ Quay lại tab Tổng quan — thẻ phải nói 0');
dem.clear();
await cr.chay(`document.querySelector('.sb-item[data-tab="tongquan"]')?.click()`);
await cr.doi(1200);
const sau = await inThe();
console.log('   Lượt gọi khi đánh thức:',
  [...dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · ') || '(không có)');
console.log('   #tq-tomtat →', sau);
const soChoDuyet = await layThe('chờ duyệt');
console.log(`\n   ⇒ Thẻ "Việc tôi giao — chờ duyệt" = ${soChoDuyet}` +
  (soChoDuyet === '0' ? '   ✔ ĐÚNG (đã bắt kịp)' : '   ❌ NÓI DỐI — máy chủ đã 0 mà thẻ vẫn kể số cũ'));

console.log('\n④ Ca đối chiếu: KHÔNG rời tab (đường `xa()` có await) — phải luôn đúng');
choDuyet = 2;
await cr.chay(`window.__API.cvCapNhat(1,'cho_duyet','x').catch(()=>{})`);
await cr.doi(900);
console.log('   sau khi máy chủ về 2:', await inThe());
choDuyet = 0;
await cr.chay(`window.__API.cvCapNhat(1,'hoan_thanh','xong').catch(()=>{})`);
await cr.doi(900);
const sau2 = await inThe();
const so2 = await layThe('chờ duyệt');
console.log(`   #tq-tomtat → ${sau2}`);
console.log(`   ⇒ Đang ở ngay tab đó: ${so2}` + (so2 === '0' ? '   ✔ ĐÚNG' : '   ❌ SAI'));

const loi = [...cr.ngoaiLe, ...cr.loiConsole.filter(l => !/favicon|404/.test(l))];
console.log('\nNgoại lệ/console lỗi:', loi.length ? loi.join(' | ') : 'sạch');

cr.dong(); may.dong();
