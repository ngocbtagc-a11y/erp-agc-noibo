/* ==========================================================================
   HỒ LY — ĐO TRÊN ĐƯỜNG RENDER THẬT, KHÔNG PHẢI DÒNG TỔNG HỢP
   ---------------------------------------------------------------------------
   `do-bang-that.mjs` chỉ chèn dòng mẫu vào bảng có `tbody` RỖNG
   (`scripts/do-bang-that.mjs:96` — `if (!tb || tb.rows.length) return`), và
   dòng mẫu của nó có ĐÚNG một `<td>` cho mỗi `<th>`. Hai điều đó cùng nhau
   làm nó không bao giờ đi qua hai nhánh mà ứng dụng thật đi qua:

     ① Ô render lồng thẻ con — `<div class="nm">…</div>` — chứ không phải
        textContent phẳng. `td .nm` vẫn là `white-space: nowrap`
        (style.css:1757) và CHỈ được gỡ trong cột `.cot-chu`
        (style.css:1578). Cột đầu của bảng Nhân sự KHÔNG mang `.cot-chu`.
     ② Số `<td>` render theo ĐIỀU KIỆN nên KHÁC số `<th>` (app.js:431
        `NS_XEM_LUONG_DOC ? <td> : ''`, app.js:6261/6263 góp ý). `luoiBang()`
        bỏ qua nguyên dòng khi lệch (app.js `if (tr.cells.length !== ths.length) continue`).

   Bàn đo này nạp dữ liệu THẬT qua API giả, đúng đường `veBangNsDoc()`.
   CHẠY: node scripts/ho-ly-duong-that.mjs
   ========================================================================== */

import { dungMayGia, moChrome, TOI, TOI_ID, NGUOI, DANH_BA } from './lib/ban-do-chrome.mjs';

/* Tên 80 ký tự — ĐÚNG trần ô nhập của ERP (app.html:818 maxlength="80").
   Không bịa: tên Việt đầy đủ + chức danh là chuyện thường ở công ty này. */
const TEN_80 = 'Nguyễn Thị Hoàng Yến Phương Thảo Quỳnh Anh Trần Lê Minh Khuê Bảo Ngọc Hà My Chi';
const NS = [
  { id: 'NS-A', ma_nv: 'AGC-0001', ho_ten: TEN_80, viet_tat: 'NY', chuc_vu: 'Chuyên viên Vận hành sàn Shopee & TikTok kiêm Chăm sóc khách hàng',
    bo_phan: 'Kinh doanh', trang_thai: 'dang_lam', ngay_vao: '2025-01-05', dang_lam: 1, co_anh: 0 },
  { id: 'NS-B', ma_nv: 'AGC-0002', ho_ten: 'Phạm Khương Duy', viet_tat: 'KD', chuc_vu: 'Quản lý kho',
    bo_phan: 'Kho vận', trang_thai: 'dang_lam', ngay_vao: '2024-03-01', dang_lam: 1, co_anh: 0 }
];

/* Vai trò KHÔNG xem được lương → `veBangNsDoc` render 4 ô, còn <thead> vẫn 6-7
   <th>. Đây đúng là cấu hình của chị Vũ Lan Hương (hcns) và anh Phạm Khương
   Duy (quan_ly_kho) — `src/quyen.js:49,50` cả hai đều `xem_luong: false`. */
const apiRieng = (duong, u, traJson) => {
  if (duong === '/api/toi-la-ai') {
    traJson({ ...TOI, vai_tro: 'quan_ly_kho', them_nhan_su: false,
              quyen: ['tongquan', 'lichsuviec', 'danhba', 'nhansu', 'khovan'] });
    return true;
  }
  if (duong === '/api/nhan-su') { traJson({ nhan_su: NS, xem_luong: false }); return true; }
  if (duong === '/api/danh-ba') { traJson({ danh_ba: DANH_BA }); return true; }
  return false;
};

const DO = `(function(){
  const t = document.querySelector('#ns-bang') ? document.querySelector('#ns-bang').closest('table') : null;
  if (!t) return { co: false };
  const tb = t.tBodies[0];
  const hang = t.querySelector('thead tr:last-of-type');
  const w = t.closest('.table-wrap, .table-wrap-cuon') || t.parentElement;
  const tr0 = tb.rows[0];
  const nm = tr0 ? tr0.querySelector('.nm') : null;
  return {
    co: true,
    soDong: tb.rows.length,
    soTh: hang ? hang.children.length : null,
    soTd: tr0 ? tr0.cells.length : null,
    daDapLuoi: tr0 ? !!tr0.dataset.luoi : null,
    coDataNhan: tr0 && tr0.cells[0] ? tr0.cells[0].hasAttribute('data-nhan') : null,
    coNutChiTiet: tr0 ? !!tr0.querySelector('button[data-chitiet]') : null,
    coOdau: tr0 && tr0.cells[0] ? tr0.cells[0].classList.contains('o-dau') : null,
    cotPhuDuocAn: (function(){
      /* <th class="cot-phu">Vào làm</th> — nếu luoiBang() có chạy thì ô <td>
         tương ứng phải mang .cot-phu và bị ẩn. */
      if (!tr0) return null;
      return [...tr0.cells].some(td => td.classList.contains('cot-phu'));
    })(),
    laLuoiBang: t.classList.contains('luoi-bang'),
    wsNm: nm ? getComputedStyle(nm).whiteSpace : null,
    rongNm: nm ? Math.round(nm.getBoundingClientRect().width) : null,
    khung: w.clientWidth,
    rongBang: Math.max(t.scrollWidth, w.scrollWidth),
    /* Thẻ có bị tràn ngang không — thứ Sếp gửi ảnh bảo bỏ. */
    tran: Math.max(t.scrollWidth, w.scrollWidth) > w.clientWidth + 1,
    /* Cả trang có kéo ngang không (kéo ngang cấp trang còn tệ hơn cấp bảng). */
    tranTrang: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    /* Nhãn người dùng thật sự nhìn thấy trên thẻ. */
    nhanTrenThe: tr0 ? [...tr0.cells].map(td => td.dataset.nhan == null ? '(KHÔNG CÓ)' : (td.dataset.nhan || '(rỗng)')) : null
  };
})()`;

const may = await dungMayGia({ tatHoatAnh: true, apiRieng });
for (const RONG of [1440, 375]) {
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
  await cr.chay(`document.querySelector('[data-tab="nhansu"]')?.click(); 1`);
  await cr.doi(1500);
  const d = await cr.chay(DO);
  console.log(`\n===== ${RONG}px · bảng Nhân sự, vai trò quan_ly_kho (xem_luong=false) =====`);
  console.log(JSON.stringify(d, null, 2));
  cr.dong();
}
may.dong();
