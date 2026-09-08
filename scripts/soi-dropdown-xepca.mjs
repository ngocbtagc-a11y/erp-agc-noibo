/* ==========================================================================
   Ô CHỌN PHÒNG BAN Ở MÀN XẾP CA — Hồ Ly, REV-0057 vòng 4
   ---------------------------------------------------------------------------
   ⚠️ SỬA LỖI CỦA CHÍNH BÀN SOI TÔI. Vòng 3 tôi kết luận ô này "còn nói dối"
   bằng chứng cứ **SAI**: `soi-khoi-bo-sot.mjs` đếm lượt gọi
   `/api/du-lieu-nen/phong-ban`, mà đường THẬT là `/api/dulieunen/phong-ban`
   (`api.js:308`) — không có dấu gạch. Đường sai thì đếm bao giờ cũng ra 0, và
   một phép đo luôn ra 0 thì không chứng minh được gì cả.

   Kết luận vòng 3 vẫn ĐÚNG, nhưng đúng vì lý do khác: `taiDanhMucNen` CÓ nạp
   lại `DS_PHONG_BAN` (nó nghe `du_lieu_nen` từ vòng 1), chỉ là **ô chọn ở màn
   Xếp ca không được vẽ lại** từ kho vừa nạp. Nên phải đo bằng thứ người dùng
   thật sự nhìn: **CHỮ TRONG Ô CHỌN**, không phải lượt gọi mạng.

   Chạy:  node scripts/soi-dropdown-xepca.mjs
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';

const MB = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: GOC }).toString().trim();
const QUYEN = ['tongquan', 'chat', 'congviec', 'muctieu', 'xepca', 'nhansu', 'khovan', 'quantri', 'dulieunen'];

async function doMot(nhan, commit) {
  let tenPB = 'Kho vận';
  const dem = new Map();
  const may = await dungMayGia({
    commit, tatHoatAnh: true,
    suaTep: (s, f) => f === 'assets/js/app.js' ? s + '\nwindow.__API = API;\n' : s,
    apiRieng: (duong, u, traJson) => {
      dem.set(duong, (dem.get(duong) || 0) + 1);
      if (duong === '/api/toi-la-ai') return traJson({
        ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
        phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
        trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: 1,
        them_nhan_su: 1, thao_tac_van_hanh: 1,
        phong_ban_quan_ly: [{ id: 1, ten: tenPB }], quyen: QUYEN, shopee: null
      }) || true;
      /* ĐÚNG đường: `/api/dulieunen/…`, không phải `/api/du-lieu-nen/…` */
      if (duong === '/api/dulieunen/phong-ban')
        return traJson({ ds: [{ id: 1, ten: tenPB, hoat_dong: 1 }] }) || true;
      if (duong === '/api/dulieunen/chuc-danh') return traJson({ ds: [] }) || true;
      if (duong === '/api/dulieunen/don-vi') return traJson({ ds: [] }) || true;
      if (duong === '/api/dulieunen/tinh-trang') return traJson({ muc: [], viec_tiep_theo: [] }) || true;
      if (duong === '/api/dulieunen/ncc') return traJson({ ds: [] }) || true;
      if (duong === '/api/dulieunen/kho') return traJson({ ds: [] }) || true;
      if (duong === '/api/thong-bao') return traJson({ thong_bao: [], chua_doc: 0 }) || true;
      if (duong === '/api/cong-viec/hom-nay') return traJson({ toi: {}, nhac_tat: 0 }) || true;
      if (duong === '/api/cong-viec/danh-sach') return traJson({ nhan: [], giao: [] }) || true;
      if (duong === '/api/muc-tieu/danh-sach')
        return traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }) || true;
      if (duong === '/api/ca/mau-ca') return traJson({ ds: [] }) || true;
      if (duong === '/api/ca/dang-mo') return traJson({ ds: [], loai_lao_dong: 'toan_thoi_gian' }) || true;
      if (duong === '/api/ca/lich-cua-toi') return traJson({ ds: [] }) || true;
      if (duong === '/api/ca/ma-tran-tuan')
        return traJson({ nhan_su: [], ca_mo: [], dang_ky: [], ke_hoach: [], lich_lam: [], khoa: 0 }) || true;
      if (duong === '/api/quan-tri/danh-sach') return traJson({ nhan_su: [], tai_khoan: [], vai_tro: [] }) || true;
      if (duong === '/api/nhan-su/viec-can-lam') return traJson({}) || true;
      if (duong === '/api/kho/san-pham') return traJson({ san_pham: [], quyen: {} }) || true;
      return false;
    }
  });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, doiMs: 3500 });
  await cr.chay(`(() => { const b = document.querySelector('.sb-item[data-tab="xepca"]'); if (b) b.click(); })()`);
  await cr.doi(900);

  const docO = () => cr.chay(`(() => {
    const o = document.querySelector('#xcPhongBan');
    if (!o) return 'KHÔNG CÓ Ô CHỌN';
    return JSON.stringify({
      chu: [...o.options].map(x => x.textContent.trim()),
      dangChon: o.value
    });
  })()`);

  const truoc = await docO();
  tenPB = 'Kho vận ĐỔI TÊN';          // máy chủ đổi tên
  dem.clear();
  await cr.chay(`window.__API.dlnSuaPhongBan(1, { ten: 'Kho vận ĐỔI TÊN' }).catch(() => {})`);
  await cr.doi(1500);
  const sau = await docO();
  const goiPB = dem.get('/api/dulieunen/phong-ban') || 0;
  const loi = [...cr.ngoaiLe, ...cr.loiConsole.filter(l => !/favicon|404/.test(l))];
  cr.dong(); may.dong();
  return { nhan, truoc, sau, goiPB, loi };
}

console.log('\nĐỔI TÊN PHÒNG BAN → ô chọn ở màn Xếp ca có đổi theo không?');
console.log('(đo bằng CHỮ trong ô chọn — thứ người dùng nhìn — không phải lượt gọi mạng)\n');

for (const [nhan, commit] of [['TRƯỚC (merge-base)', MB], ['SAU  (bản vá vòng 4)', null]]) {
  const r = await doMot(nhan, commit);
  const doiRoi = r.sau.includes('ĐỔI TÊN');
  const giuChon = (() => {
    try { return JSON.parse(r.truoc).dangChon === JSON.parse(r.sau).dangChon; } catch { return null; }
  })();
  console.log(`── ${r.nhan}`);
  console.log(`   trước: ${r.truoc}`);
  console.log(`   sau  : ${r.sau}`);
  console.log(`   ⇒ ${doiRoi ? '✔ Ô CHỌN ĐÃ ĐỔI THEO' : '✘ ô chọn VẪN GIỮ TÊN CŨ'}` +
    `  · giữ nguyên lựa chọn đang chọn: ${giuChon === null ? '?' : (giuChon ? '✔ có' : '✘ bị nhảy')}` +
    `  · gọi /api/dulieunen/phong-ban: ${r.goiPB} lượt`);
  console.log(`   ngoại lệ: ${r.loi.length ? r.loi.slice(0, 2).join(' | ') : 'sạch'}\n`);
}
