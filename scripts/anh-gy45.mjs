/* ==========================================================================
   ẢNH TRƯỚC / SAU cho GY-0004 (ô ngày) và GY-0005 (nhận xét).
   Chạy:  node scripts/anh-gy45.mjs
   Bản "trước" hoàn nguyên TOÀN BỘ `public/` về `origin/main` (`hoanNguyenPublic`
   — không phải danh sách tệp chép tay, đó là cách ra hai tấm ảnh y hệt nhau
   ở REV-0048). Ảnh vào `docs/reviews/anh-gy45/`.
   ========================================================================== */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dungMayGia, moChrome, TOI } from './lib/ban-do-chrome.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RA = path.join(GOC, 'docs', 'reviews', 'anh-gy45');
mkdirSync(RA, { recursive: true });

const VIEC_TOI = {
  id: 11, tieu_de: 'Rà soát tồn lô chè chưng yến', dau_ra: 'File đối chiếu khớp 100%, gửi trước 17h',
  mo_ta: '', nguoi_giao_id: 'NS-DUY', nguoi_giao_ten: 'Phạm Khương Duy',
  nguoi_nhan_id: 'NS-NGOC', nguoi_nhan_ten: 'Bùi Thị Ngọc',
  han_chot: '2026-09-10', trang_thai: 'dang_lam', muc_tieu_id: null, tao_luc: '2026-09-01 09:00:00'
};
const VIEC_GIAO = {
  id: 12, tieu_de: 'Kiểm kê hàng nhập khẩu quý 3', dau_ra: 'Biên bản có chữ ký 2 bên',
  mo_ta: '', nguoi_giao_id: 'NS-NGOC', nguoi_giao_ten: 'Bùi Thị Ngọc',
  nguoi_nhan_id: 'NS-DUY', nguoi_nhan_ten: 'Phạm Khương Duy',
  han_chot: '2026-09-12', trang_thai: 'hoan_thanh', muc_tieu_id: null, tao_luc: '2026-09-01 09:00:00'
};

function apiRieng(duong, u, traJson) {
  if (duong === '/api/toi-la-ai') {
    traJson({ ...TOI, la_admin: 1, them_nhan_su: 1, thao_tac_van_hanh: 1, phong_ban_quan_ly: [],
      quyen: [...TOI.quyen, 'quantri', 'congviec', 'muctieu', 'lichsuviec'] });
    return true;
  }
  if (duong === '/api/quan-tri/danh-sach') {
    traJson({ nhan_su: [{
      id: 'NS-DUY', ho_ten: 'Phạm Khương Duy', viet_tat: 'KD', chuc_vu: 'Quản lý kho',
      bo_phan: 'Kho vận', chuc_danh_id: null, phong_ban_id: null, quan_ly_id: null,
      trang_thai: 'da_ky', trang_thai_dl: 'dang_lam', dang_lam: 1,
      loai_lao_dong: 'toan_thoi_gian', ma_nv: '01-0002', sdt: '', email: '',
      cong_khai_sinh_nhat: true, tai_khoan: null
    }], vai_tro: [], quyen: { quan_ly: 1 } });
    return true;
  }
  if (duong.startsWith('/api/nhan-su/sinh-nhat')) { traJson({ ngay_sinh: null }); return true; }
  if (duong === '/api/nhan-su/ngay-sinh') { traJson({ ok: true }); return true; }
  if (duong.startsWith('/api/nhan-su/hop-dong')) { traJson({ hop_dong: [] }); return true; }
  if (duong.startsWith('/api/ky-nang')) { traJson({ ky_nang: [], danh_muc: [], duoc: false }); return true; }
  if (duong.startsWith('/api/mo-ta-cong-viec')) { traJson({ mo_ta: [], ds: [] }); return true; }
  if (duong === '/api/cong-viec/danh-sach') { traJson({ nhan: [VIEC_TOI], giao: [VIEC_GIAO] }); return true; }
  if (duong === '/api/cong-viec/hom-nay') {
    traJson({ nhac_tat: 0, toi: { qua_han: [], den_han_hom_nay: [], chua_bat_dau: [], cho_toi_duyet: [] },
              dong_viec: [], ghi_nhan: [] });
    return true;
  }
  if (duong === '/api/cong-viec/nhan-xet') { traJson({ ok: true, id: 1 }); return true; }
  if (duong === '/api/sua/lich-su') {
    traJson({ ds: [{ truong: 'nhan_xet', gia_tri_moi: 'Chỗ làm tốt: gửi đúng hạn',
                     nguoi_ten: 'Phạm Khương Duy', luc: '2026-09-05 10:00:00',
                     cau: 'Phạm Khương Duy nhận xét: "Chỗ làm tốt: file đối chiếu gửi trước 17h, đúng cam kết đầu ra."' }],
              cat: null });
    return true;
  }
  return false;
}

async function chupBo(nhan, commit) {
  const may = await dungMayGia({ apiRieng, commit, tatHoatAnh: true });
  const c = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: 375, cao: 812 });
  try {
    // ① Ô NGÀY SINH trong hồ sơ nhân sự
    await c.chay(`document.querySelector('[data-tab="nhansu"]')?.click(); true`);
    await c.doi(800);
    await c.chay(`document.querySelector('[data-sua-ns]')?.click(); true`);
    await c.doi(900);
    await c.chay(`(()=>{const o=document.getElementById('nsSua-ngaysinh');
      if(!o) return false; o.scrollIntoView({block:'center'}); o.focus(); return true})()`);
    await c.doi(500);
    await c.chup(path.join(RA, `375-o-ngay-sinh-${nhan}.png`));

    // ② MÀN VIỆC — có/không nút "Nhận xét"
    await c.chay(`document.getElementById('nsSuaModalNen').hidden = true;
      document.querySelector('[data-tab="lichsuviec"]')?.click(); true`);
    await c.doi(1000);
    await c.chup(path.join(RA, `375-man-viec-${nhan}.png`));

    // ③ HỘP NHẬN XÉT (chỉ bản SAU mới có)
    const co = await c.chay(`(()=>{const n=document.querySelector('#ls-cv-bang [data-cv-nhanxet]');
      if(!n) return false; n.click(); return true})()`);
    if (co) {
      await c.doi(800);
      await c.chay(`(()=>{const o=document.getElementById('cv-nx-noi-dung');
        o.value='Chỗ làm tốt: đối chiếu khớp 100% và gửi trước 17h, đúng cam kết đầu ra.';
        o.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
      await c.doi(400);
      await c.chup(path.join(RA, `375-hop-nhan-xet-${nhan}.png`));
    }
    console.log(`  ${nhan}: xong (hộp nhận xét: ${co ? 'có' : 'KHÔNG có'})`);
  } finally { c.dong(); may.dong(); }
}

console.log('Chụp ảnh GY-0004 / GY-0005 @375px →', RA);
await chupBo('truoc', 'origin/main');
await chupBo('sau', null);
console.log('Xong.');
