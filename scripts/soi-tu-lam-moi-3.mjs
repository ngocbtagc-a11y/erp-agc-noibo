/* ==========================================================================
   BÀN SOI ĐỘC LẬP — VÒNG 3 (Hồ Ly, REV-0057)
   ---------------------------------------------------------------------------
   Câu hỏi: CÁI NÚT SẾP NGỌC BẤM nằm rổ nào, và trên `origin/main` nó hỏng
   đúng như Sếp kể không?

   Đường đi thật của nút "Duyệt xong" ở Trạm Mục Tiêu trên `origin/main`:
       await API.cvCapNhat(id, 'hoan_thanh')     → máy chủ ghi
       await lamMoiCacManLienQuanCv()            → = window.LAM_MOI_CONGVIEC
       await window.LAM_MOI_MUCTIEU()

   Nếu sau CẢ BA bước đó mà thẻ "Việc tôi giao — chờ duyệt" vẫn kể số cũ, thì
   nút này KHÔNG phải "rổ B nhẹ" — nó là chỗ Sếp thấy bệnh bằng mắt thường.

   Chạy:  node scripts/soi-tu-lam-moi-3.mjs
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';

const MAIN = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: GOC }).toString().trim();
const QUYEN = ['tongquan', 'lichsuviec', 'chat', 'congviec', 'muctieu', 'taisan'];

function viec(i, tt) {
  return { id: i, tieu_de: 'Việc ' + i, trang_thai: tt, han_chot: null,
           nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy', nguoi_giao_id: TOI_ID };
}

async function doMot(nhan, commit) {
  let choDuyet = 2;
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
      if (duong === '/api/cong-viec/danh-sach') return traJson({
        nhan: [],
        giao: [viec(1, choDuyet >= 1 ? 'cho_duyet' : 'dang_lam'),
               viec(2, choDuyet >= 2 ? 'cho_duyet' : 'dang_lam')]
      }) || true;
      if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
      if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
      if (duong === '/api/muc-tieu/danh-sach')
        return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
      if (duong === '/api/tai-san') return traJson({ ds: [], quyen: { quan_ly: 0 } }) || true;
      return false;
    }
  });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3000 });
  const doc = () => cr.chay(`(() => {
    const o = document.querySelector('#tq-tomtat');
    if (!o) return 'KHÔNG CÓ THẺ';
    const m = (o.textContent || '').match(/Việc tôi giao — chờ duyệt(\\d+)/);
    return m ? m[1] : '(không thấy thẻ chờ duyệt) ' + (o.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 90);
  })()`);

  const truoc = await doc();
  choDuyet = 0;                                   // Sếp bấm Duyệt → máy chủ về 0
  dem.clear();
  /* ĐÚNG đường của nút "Duyệt xong" trên origin/main */
  await cr.chay(`(async () => {
    await window.__API.cvCapNhat(1, 'hoan_thanh', 'xong').catch(()=>{});
    if (window.LAM_MOI_CONGVIEC) await window.LAM_MOI_CONGVIEC();
    if (window.LAM_MOI_MUCTIEU) await window.LAM_MOI_MUCTIEU();
  })()`);
  await cr.doi(1200);
  const sau = await doc();
  const goi = [...dem.entries()].map(([d, n]) => `${d.replace('/api/', '')}×${n}`).join(' · ');
  cr.dong(); may.dong();
  return { nhan, truoc, sau, goi };
}

console.log('\nTHẺ "Việc tôi giao — chờ duyệt" sau khi bấm ĐÚNG nút "Duyệt xong"\n' +
            '(máy chủ đã về 0 — thẻ phải là 0)\n');
for (const [nhan, commit] of [['TRƯỚC (origin/main)', MAIN], ['SAU  (bản vá)', null]]) {
  const r = await doMot(nhan, commit);
  console.log(`── ${r.nhan}`);
  console.log(`   thẻ trước khi bấm: ${r.truoc}   →   sau khi bấm: ${r.sau}` +
    (r.sau === '0' ? '   ✔ ĐÚNG' : '   ❌ VẪN HIỆN SỐ CŨ — đúng câu "đã duyệt hoàn thành mà nó vẫn hiện ở đây"'));
  console.log(`   lượt gọi máy chủ trong cú bấm: ${r.goi}\n`);
}
