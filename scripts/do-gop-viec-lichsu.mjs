/* ==========================================================================
   BÀN ĐO — GỘP 3 TAB VIỆC VÀO "LỊCH SỬ LÀM VIỆC"
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-gop-viec-lichsu.mjs
          node scripts/do-gop-viec-lichsu.mjs --rong 375
   Chi phí 0: Chrome sẵn trên máy, máy chủ giả trong RAM, không chạm mạng/D1.

   VÌ SAO CÓ FILE NÀY. Sếp Ngọc nhắc HAI LẦN: "gộp vào lịch sử làm việc đi".
   Gộp màn hình là lúc dễ ĐÁNH RƠI chức năng nhất — nút biến mất mà không ai
   kêu, vì người dùng tưởng mình nhớ nhầm chỗ. Nên mỗi thứ ba tab cũ làm được
   phải có MỘT DÒNG ĐO ở đây, và mỗi dòng đo phải có CA ĐỐI CHỨNG chứng minh
   nó biết kêu (BH-16). Khai không phải là đo.

   ĐO GÌ
     ① ĐỐI CHIẾU CHỨC NĂNG — 14 việc ba tab cũ làm được, làm ở màn gộp.
        Đo trong Chrome THẬT: bấm thật, đọc DOM thật.
     ② SỐ DÒNG THẤY ĐƯỢC ở 375px và 1440px — TRƯỚC (`cbea4d9`, gốc nhánh) vs SAU.
        Ràng buộc Sếp đặt: KHÔNG ĐƯỢC GIẢM.
     ③ NÚT ≥44px — bộ lọc phạm vi, đo `getBoundingClientRect()`.
     ④ 5 CA ĐỐI CHỨNG — mỗi ca bẻ gãy ĐÚNG MỘT chỗ trong `app.js`; phép kiểm
        tương ứng BẮT BUỘC phải đỏ. Ca nào không đỏ = phép đo đó vô dụng.

   KHÔNG đo quyền ở đây — quyền cắt ở MÁY CHỦ, đo bằng
   `scripts/do-quyen-man-viec-gop.mjs` (gọi API thật, soi JSON).
   ========================================================================== */

import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const dso = process.argv;
const lay = (co, mac) => { const i = dso.indexOf(co); return i > 0 ? dso[i + 1] : mac; };
const RONG = Number(lay('--rong', 0)) || null;   // null = đo cả 375 và 1440
/* MỐC "TRƯỚC" = commit nhánh này mọc ra, KHÔNG phải `origin/main`.
   `origin/main` là mục tiêu di động: trong lúc làm việc này nó đã nhảy từ
   `cbea4d9` sang `9f344ed` (nhánh khác đẩy lên). Lấy nó làm mốc là so bản này
   với một bản có thêm tính năng của người khác — số ra sẽ sai mà không ai
   biết vì sao. Đổi mốc bằng `--truoc <commit>` khi cần. */
const TRUOC = lay('--truoc', 'cbea4d9');

/* ---- DỮ LIỆU GIẢ -------------------------------------------------------
   Cố ý cho MỖI trạng thái có ít nhất một dòng, và cố ý cho `cat_*` khác null
   để dải cắt phải hiện — dải đó là thứ vừa làm hôm qua, không được rơi. */
const TOI_ID = 'NS-NGOC';
const TOI = {
  ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
  phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
  trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID, la_admin: true,
  phong_ban_quan_ly: [],
  quyen: ['tongquan', 'congviec', 'lichsuviec', 'danhba', 'chat', 'gopy']
};

function viec(id, o) {
  return {
    id, tieu_de: o.tieu_de, dau_ra: o.dau_ra || 'Bảng khớp 100%, có biên bản',
    mo_ta: o.mo_ta || null, phoi_hop_ids: null, phoi_hop_ten: o.phoi_hop_ten || null,
    nguoi_giao_id: o.giao, nguoi_giao_ten: o.giao_ten, nguoi_nhan_id: o.nhan,
    nguoi_nhan_ten: o.nhan_ten, han_chot: o.han || '2026-09-05',
    trang_thai: o.tt, ket_qua: o.ket_qua || null,
    tao_luc: '2026-08-20 09:00:00', cap_nhat_luc: '2026-08-2' + (id % 9) + ' 10:00:00',
    muc_tieu_id: 1, muc_tieu_ten: 'Giảm sai sót đóng gói'
  };
}
const NHAN = [
  viec(101, { tieu_de: 'Đối soát đơn hoàn Shopee T8', giao: 'NS-DUY', giao_ten: 'Phạm Khương Duy', nhan: TOI_ID, nhan_ten: 'Bùi Thị Ngọc', tt: 'moi' }),
  viec(102, { tieu_de: 'Kiểm kê hạt điều nhập khẩu', giao: 'NS-DUY', giao_ten: 'Phạm Khương Duy', nhan: TOI_ID, nhan_ten: 'Bùi Thị Ngọc', tt: 'dang_lam' }),
  viec(103, { tieu_de: 'Nộp báo cáo thuế quý 3', giao: 'NS-HANG', giao_ten: 'Phan Thị Hằng', nhan: TOI_ID, nhan_ten: 'Bùi Thị Ngọc', tt: 'cho_duyet', ket_qua: 'Đã nộp 28/08' }),
  viec(104, { tieu_de: 'Gọi nhà cung cấp chè Thái Nguyên', giao: TOI_ID, giao_ten: 'Bùi Thị Ngọc', nhan: TOI_ID, nhan_ten: 'Bùi Thị Ngọc', tt: 'moi' }),
  viec(105, { tieu_de: 'Duyệt mẫu bao bì Tết', giao: 'NS-DUY', giao_ten: 'Phạm Khương Duy', nhan: TOI_ID, nhan_ten: 'Bùi Thị Ngọc', tt: 'hoan_thanh', ket_qua: 'Chốt mẫu B' })
];
for (let i = 6; i <= 30; i++) {
  NHAN.push(viec(100 + i, { tieu_de: `Việc tôi nhận số ${i}`, giao: 'NS-DUY', giao_ten: 'Phạm Khương Duy', nhan: TOI_ID, nhan_ten: 'Bùi Thị Ngọc', tt: 'moi' }));
}
const GIAO = [
  viec(201, { tieu_de: 'Dọn kho tầng 2', giao: TOI_ID, giao_ten: 'Bùi Thị Ngọc', nhan: 'NS-DUY', nhan_ten: 'Phạm Khương Duy', tt: 'cho_duyet', ket_qua: 'Xong 27/08' }),
  viec(202, { tieu_de: 'Lên lịch ca tuần 36', giao: TOI_ID, giao_ten: 'Bùi Thị Ngọc', nhan: 'NS-HUONG', nhan_ten: 'Vũ Lan Hương', tt: 'dang_lam' }),
  viec(203, { tieu_de: 'Chốt bảng lương T8', giao: TOI_ID, giao_ten: 'Bùi Thị Ngọc', nhan: 'NS-HANG', nhan_ten: 'Phan Thị Hằng', tt: 'moi' }),
  viec(204, { tieu_de: 'Đóng HKĐ cũ', giao: TOI_ID, giao_ten: 'Bùi Thị Ngọc', nhan: 'NS-HUONG', nhan_ten: 'Vũ Lan Hương', tt: 'hoan_thanh' })
];
const PHOI_HOP = [
  viec(301, { tieu_de: 'Chuẩn bị hồ sơ chuyển đổi pháp nhân', giao: 'NS-HANG', giao_ten: 'Phan Thị Hằng', nhan: 'NS-HUONG', nhan_ten: 'Vũ Lan Hương', tt: 'dang_lam', phoi_hop_ten: 'Bùi Thị Ngọc' }),
  viec(302, { tieu_de: 'Kiểm tra giấy tờ ATTP lô mới', giao: 'NS-DUY', giao_ten: 'Phạm Khương Duy', nhan: 'NS-HUYEN', nhan_ten: 'Nguyễn Thị Huyền', tt: 'moi', phoi_hop_ten: 'Bùi Thị Ngọc' })
];
/* Việc của NGƯỜI KHÁC — chỉ có ở phạm vi "Toàn công ty". Dòng 401 là mốc: nó
   KHÔNG có trong ba phạm vi kia, nên thấy nó = thật sự đang xem toàn công ty. */
const LICH_SU = [
  viec(401, { tieu_de: 'ZZZ việc riêng của anh Duy giao chị Huyền', giao: 'NS-DUY', giao_ten: 'Phạm Khương Duy', nhan: 'NS-HUYEN', nhan_ten: 'Nguyễn Thị Huyền', tt: 'hoan_thanh' }),
  ...NHAN, ...GIAO, ...PHOI_HOP
];

function apiRieng(duong, u, traJson) {
  if (duong === '/api/toi-la-ai') { traJson(TOI); return true; }
  if (duong === '/api/cong-viec/danh-sach') {
    traJson({
      nhan: NHAN, giao: GIAO, phoi_hop: PHOI_HOP,
      // Cắt CÓ THẬT ở cả ba phạm vi — dải cắt phải hiện đủ ba.
      cat_nhan: { gioi_han: NHAN.length, tong: 523, xem_them: 'Lịch sử làm việc' },
      cat_giao: { gioi_han: GIAO.length, tong: 88, xem_them: 'Lịch sử làm việc' },
      cat_phoi_hop: { gioi_han: PHOI_HOP.length, tong: 41, xem_them: 'Lịch sử làm việc' }
    });
    return true;
  }
  if (duong === '/api/cong-viec/lich-su') {
    const truoc = u.searchParams.get('truoc');
    if (truoc) { traJson({ viec: [], cat: null, truoc_tiep: null }); return true; }
    const cuoi = LICH_SU[LICH_SU.length - 1];
    traJson({ viec: LICH_SU, cat: { gioi_han: LICH_SU.length, tong: 700 },
              truoc_tiep: `${cuoi.cap_nhat_luc}|${cuoi.id}` });
    return true;
  }
  if (duong === '/api/cong-viec/hom-nay') {
    traJson({ nhac_tat: 0, toi: { qua_han: [], den_han_hom_nay: [], chua_bat_dau: [],
      cho_toi_duyet: [{ id: 201, tieu_de: 'Dọn kho tầng 2', nguoi_nhan_ten: 'Phạm Khương Duy', dong: 2 }] },
      dong_viec: [], ghi_nhan: [] });
    return true;
  }
  if (duong === '/api/cong-viec/cap-nhat' || duong === '/api/cong-viec/sua') { traJson({ ok: true }); return true; }
  if (duong === '/api/cong-viec/tong-quan-congty') {
    traJson({ dang_mo: 40, qua_han: 3, cho_duyet: 2, theo_phong_ban: [], viec_qua_han: [] });
    return true;
  }
  if (duong === '/api/muc-tieu') { traJson({ cong_ty: [], phong_ban: [], ca_nhan: [], nam: 2026, quy: 3 }); return true; }
  return false;
}

/* ---- CA ĐỐI CHỨNG (BH-16) ----------------------------------------------
   Mỗi ca bẻ ĐÚNG MỘT chỗ và nói TRƯỚC phép kiểm nào bắt buộc phải đỏ. */
const DOI_CHUNG = [
  { ma: 'DC-A', chu: 'bỏ cột nút hành động khỏi dòng việc',
    phai_do: ['toi.batdau', 'toi.nop', 'toi.todo_xong', 'toi.sua', 'giao.duyet', 'giao.tralai', 'giao.sua', 'giao.huy'],
    be: s => s.replace('`<td style="white-space:nowrap">${nut}</td>`', '`<td></td>`') },
  { ma: 'DC-B', chu: 'giấu dải cắt ở ba phạm vi CỦA TÔI',
    phai_do: ['dai_cat_cua_toi'],
    be: s => s.replace("return veDaiCat('#ls-cv-cat', cat, {", "return veDaiCat('#ls-cv-cat', null, {") },
  { ma: 'DC-C', chu: 'chặn không cho sang phạm vi "Toàn công ty"',
    phai_do: ['congty.thay_viec_nguoi_khac'],
    be: s => s.replace('if (!NHAN_LOC[loc]) return;', "if (!NHAN_LOC[loc] || loc === 'congty') return;") },
  { ma: 'DC-D', chu: 'đường dẫn cũ MO_DEN_VIEC_CUA_TOI rơi sai phạm vi',
    phai_do: ['duongcu.giao', 'duongcu.sang_dong'],
    be: s => s.replace("await doiLoc(loc || 'toi');", "await doiLoc('toi');") },
  /* ⚠️ CHIỀU NGƯỢC LẠI — nới quá tay cũng là hỏng: phối hợp mà mọc nút thao
     tác là phá đúng luật "1 đầu mối chịu trách nhiệm báo cáo" Sếp đã chốt. */
  { ma: 'DC-E', chu: 'cho phạm vi "Tôi phối hợp" mọc nút thao tác',
    phai_do: ['phoihop.chi_theo_doi'],
    be: s => s.replace("phoihop: { trong: 'Chưa được mời phối hợp việc nào.',        nut: null }",
                       "phoihop: { trong: 'Chưa được mời phối hợp việc nào.',        nut: 'toi' }") }
];

/* ---- MỘT VÒNG ĐO -------------------------------------------------------- */
const NGU = (ms) => new Promise(ok => setTimeout(ok, ms));

/* ĐẾM DÒNG THẤY ĐƯỢC — công thức phải GIỐNG HỆT cho bản trước và bản sau, kể
   cả chỗ đứng. Bản đầu của bàn đo này cuộn bản TRƯỚC tới sát thanh tab nhưng
   đo bản SAU từ đỉnh trang: ra 8 vs 5 và tưởng là mất 3 dòng, trong khi phần
   lớn chênh lệch chỉ là "đã cuộn tới đâu" (BH-17 — phép đo hỏng, không phải mã
   hỏng). Nay: cuộn bảng lên đầu màn ở CẢ HAI bên rồi mới đếm dòng nằm TRỌN
   trong khung nhìn — đúng thứ người dùng thấy sau khi lướt tới danh sách. */
const DEM_DONG = (bang) => `(() => {
  const b = document.querySelector('${bang}');
  if (!b) return null;
  b.scrollIntoView({ block: 'start' });
  return [...b.querySelectorAll('tr')]
    .filter(t => { const o = t.getBoundingClientRect(); return o.top >= 0 && o.bottom <= window.innerHeight; }).length;
})()`;

async function doMotVong({ commit = null, be = null, rong = 1440 }) {
  /* Ca đối chứng phải BẺ ĐƯỢC THẬT. `String.replace` trượt thì trả về y
     nguyên chuỗi cũ — ca đối chứng thành bản sao của bản vá, và "đo được"
     thành "đo cái gì cũng xanh". Bắt tại chỗ, dừng hẳn. */
  let daBe = false;
  const suaTep = be ? (s, ten) => {
    if (ten !== 'assets/js/app.js') return s;
    const sau = be(s);
    if (sau !== s) daBe = true;
    return sau;
  } : null;
  const may = await dungMayGia({ commit, apiRieng, tatHoatAnh: true, suaTep });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong, doiMs: 3500 });
  const kq = { commit: commit || 'cây làm việc', rong, chuc_nang: {}, so_dong: {}, nut: {} };
  const chay = (js) => cr.chay(js);

  /* CHỜ CÓ ĐIỀU KIỆN, không chờ theo đồng hồ. `doiMs` cố định là phép đo phụ
     thuộc vào máy đang bận hay rảnh — chạy vòng thứ hai trong cùng tiến trình
     là thấy ngay: thanh bên chưa kịp dựng, bàn đo báo "hỏng" oan (BH-17). */
  async function doiCho(js, ten, hetHan = 15000) {
    const moc = Date.now();
    for (;;) {
      let co = false;
      try { co = !!(await chay(js)); } catch { co = false; }
      if (co) return true;
      if (Date.now() - moc > hetHan) throw new Error(`Chờ quá ${hetHan}ms mà chưa có: ${ten}`);
      await NGU(250);
    }
  }

  try {
    await doiCho(`document.querySelectorAll('[data-tab]').length > 0`, 'thanh bên (sidebar)');
    /* Trang có dựng nổi giao diện không — hỏi TRƯỚC khi bấm gì. Không có dòng
       này thì lỗi "querySelector(...).click() của null" chỉ nói được là bấm
       hụt, không nói được vì sao (BH-17: phép đo hỏng chứ không phải mã hỏng). */
    kq.chuan_bi = await chay(`({
      so_tab: document.querySelectorAll('[data-tab]').length,
      co_cvSeg: !!document.querySelector('#cvSeg'),
      co_lsvLoc: !!document.querySelector('#lsv-loc'),
      co_bang_lichsu: !!document.querySelector('#ls-cv-bang')
    })`);
    const coManGop = kq.chuan_bi.co_lsvLoc;
    kq.man_gop = coManGop;
    if (!kq.chuan_bi.so_tab) throw new Error('Trang không dựng nổi thanh bên — không có [data-tab] nào');

    if (coManGop) {
      /* ---------- BẢN SAU: màn gộp ---------- */
      await chay(`document.querySelector('[data-tab="lichsuviec"]').click(); 1`);
      await NGU(600);

      const doLoc = async (loc) => {
        await chay(`document.querySelector('#lsv-loc .seg-nut[data-lsv="${loc}"]').click(); 1`);
        await NGU(500);
      };

      // -- phạm vi "Việc của tôi"
      await doLoc('toi');
      Object.assign(kq.chuc_nang, await chay(`(() => {
        const tr = [...document.querySelectorAll('#ls-cv-bang tr')];
        const co = (sel) => !!document.querySelector('#ls-cv-bang ' + sel);
        return {
          'toi.co_dong': tr.length > 0,
          'toi.batdau': co('button[data-cv-batdau]'),
          'toi.nop': co('button[data-cv-nop]'),
          'toi.todo_xong': co('button[data-cv-xongngay]'),
          'toi.sua': co('button[data-cv-sua]'),
          'toi.nhan_todo': !!document.querySelector('#ls-cv-bang .tag.sage'),
          'toi.cot_muctieu': [...document.querySelectorAll('#ls-cv-tbl thead th')].some(t => /Mục tiêu/.test(t.textContent)),
          'toi.cot_capnhat': [...document.querySelectorAll('#ls-cv-tbl thead th')].some(t => /Cập nhật/.test(t.textContent)),
          'dai_cat_cua_toi': !document.querySelector('#ls-cv-cat').hidden &&
                             /523/.test(document.querySelector('#ls-cv-cat').textContent)
        };
      })()`));

      // -- lọc trạng thái + ô tìm (dùng CHUNG cho mọi phạm vi)
      await chay(`(() => { const s = document.querySelector('#ls-cv-loctt'); s.value = 'dang_lam';
        s.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`);
      await NGU(300);
      kq.chuc_nang['loc.trangthai'] = await chay(
        `[...document.querySelectorAll('#ls-cv-bang tr')].length > 0 &&
         [...document.querySelectorAll('#ls-cv-bang tr')].every(t => /Đang làm/.test(t.textContent))`);
      await chay(`(() => { const s = document.querySelector('#ls-cv-loctt'); s.value = '';
        s.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`);
      await NGU(250);

      await chay(`(() => { const o = document.querySelector('#ls-cv-tim'); o.value = 'hạt điều';
        o.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
      await NGU(300);
      kq.chuc_nang['loc.timkiem'] = await chay(
        `document.querySelectorAll('#ls-cv-bang tr').length === 1 &&
         /hạt điều/i.test(document.querySelector('#ls-cv-bang tr').textContent)`);
      await chay(`(() => { const o = document.querySelector('#ls-cv-tim'); o.value = '';
        o.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
      await NGU(250);

      // -- bấm THẬT "Bắt đầu làm": hộp/API giả trả ok, dòng phải chạy lại
      kq.chuc_nang['toi.bam_that'] = await chay(`(() => {
        const b = document.querySelector('#ls-cv-bang button[data-cv-batdau]');
        if (!b) return false; b.click(); return true; })()`);
      await NGU(600);

      // -- phạm vi "Tôi phối hợp": CÓ dòng, KHÔNG nút (chỉ theo dõi)
      await doLoc('phoihop');
      Object.assign(kq.chuc_nang, await chay(`(() => {
        const tr = [...document.querySelectorAll('#ls-cv-bang tr')];
        return {
          'phoihop.co_dong': tr.length > 0,
          'phoihop.chi_theo_doi': tr.length > 0 && !document.querySelector('#ls-cv-bang button[data-cv-batdau],#ls-cv-bang button[data-cv-nop],#ls-cv-bang button[data-cv-sua],#ls-cv-bang button[data-cv-huy],#ls-cv-bang button[data-cv-duyet]'),
          'phoihop.cot_nguoi_chinh': [...document.querySelectorAll('#ls-cv-bang tr')].some(t => /Vũ Lan Hương/.test(t.textContent))
        };
      })()`));

      // -- phạm vi "Tôi giao"
      await doLoc('giao');
      Object.assign(kq.chuc_nang, await chay(`(() => {
        const co = (sel) => !!document.querySelector('#ls-cv-bang ' + sel);
        return {
          'giao.co_dong': document.querySelectorAll('#ls-cv-bang tr').length > 0,
          'giao.duyet': co('button[data-cv-duyet]'),
          'giao.tralai': co('button[data-cv-tralai]'),
          'giao.sua': co('button[data-cv-sua]'),
          'giao.huy': co('button[data-cv-huy]'),
          'giao.cot_giaocho': [...document.querySelectorAll('#ls-cv-bang tr')].some(t => /Phạm Khương Duy/.test(t.textContent))
        };
      })()`));

      // -- phạm vi "Toàn công ty": thấy việc của người khác + nút Tải thêm
      await doLoc('congty');
      Object.assign(kq.chuc_nang, await chay(`(() => ({
        'congty.thay_viec_nguoi_khac': /ZZZ việc riêng của anh Duy/.test(document.querySelector('#ls-cv-bang').textContent),
        'congty.dai_cat_taithem': !document.querySelector('#ls-cv-cat').hidden &&
          /Tải thêm/.test(document.querySelector('#ls-cv-cat').textContent),
        'congty.khong_nut_thaotac': !document.querySelector('#ls-cv-bang button[data-cv-batdau],#ls-cv-bang button[data-cv-duyet],#ls-cv-bang button[data-cv-sua]')
      }))()`));

      // -- ĐƯỜNG DẪN CŨ: MO_DEN_VIEC_CUA_TOI('giao', 201) phải rơi đúng chỗ
      await chay(`window.MO_DEN_VIEC_CUA_TOI('giao', 201); 1`);
      await NGU(900);
      Object.assign(kq.chuc_nang, await chay(`(() => ({
        'duongcu.giao': document.querySelector('#lsv-loc .seg-nut[data-lsv="giao"]').classList.contains('active'),
        'duongcu.sang_dong': !!document.querySelector('#ls-cv-bang tr[data-id="201"]'),
        'duongcu.dung_tab': !document.querySelector('#v-lichsuviec').hidden
      }))()`));

      // -- MO_DEN_LICHSU_TIM vẫn sang Toàn công ty và tìm sẵn
      await chay(`window.MO_DEN_LICHSU_TIM('ZZZ'); 1`);
      await NGU(900);
      kq.chuc_nang['duongcu.lichsu_tim'] = await chay(
        `document.querySelector('#lsv-loc .seg-nut[data-lsv="congty"]').classList.contains('active') &&
         document.querySelectorAll('#ls-cv-bang tr').length === 1`);

      // -- 44px cho nút bộ lọc
      kq.nut = await chay(`(() => {
        const bs = [...document.querySelectorAll('#lsv-loc .seg-nut')].map(b => Math.round(b.getBoundingClientRect().height * 10) / 10);
        return { cao_nut_loc: bs, dat_44: bs.every(h => h >= 44) };
      })()`);

      // -- SỐ DÒNG THẤY ĐƯỢC
      await chay(`(() => { const o = document.querySelector('#ls-cv-tim'); o.value = '';
        o.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
      await NGU(300);
      for (const loc of ['toi', 'congty']) {
        await doLoc(loc);
        kq.so_dong['gop.' + loc] = await chay(DEM_DONG('#ls-cv-bang'));
      }
      kq.so_dong['man_chinh'] = kq.so_dong['gop.toi'];
    } else {
      /* ---------- BẢN TRƯỚC: ba tab ở Trạm Mục Tiêu + Lịch sử chỉ đọc ------ */
      await chay(`document.querySelector('[data-tab="tongquan"]').click(); 1`);
      await NGU(700);
      await chay(`(() => { const b = document.querySelector('#cvSeg .seg-nut[data-cv="nhan"]'); if (b) b.click(); return 1; })()`);
      await NGU(400);
      kq.so_dong['tab_nhan'] = await chay(DEM_DONG('#cv-bang-nhan'));
      await chay(`document.querySelector('[data-tab="lichsuviec"]').click(); 1`);
      await NGU(700);
      kq.so_dong['lichsu'] = await chay(DEM_DONG('#ls-cv-bang'));
      kq.so_dong['man_chinh'] = kq.so_dong['tab_nhan'];
    }
  } catch (e) {
    kq.loi = String(e.message || e).slice(0, 200);
  }

  kq.loi_console = cr.loiConsole;
  kq.ngoai_le = cr.ngoaiLe;
  kq.da_be = daBe;
  cr.dong(); may.dong();
  return kq;
}

/* ========================================================================== */
console.log('\n' + '='.repeat(74));
console.log('BÀN ĐO — GỘP 3 TAB VIỆC VÀO "LỊCH SỬ LÀM VIỆC"');
console.log('='.repeat(74));

const CAC_RONG = RONG ? [RONG] : [375, 1440];
const bao = { rong: {}, doi_chung: [], truot: [] };

for (const rong of CAC_RONG) {
  const sau = await doMotVong({ rong });
  const truoc = await doMotVong({ commit: TRUOC, rong });
  bao.rong[rong] = { truoc: truoc.so_dong, sau: sau.so_dong, nut: sau.nut, chuc_nang: sau.chuc_nang,
                     loi_console: sau.loi_console, ngoai_le: sau.ngoai_le,
                     loi_truoc: truoc.loi || null, loi_sau: sau.loi || null,
                     man_gop_truoc: truoc.man_gop, man_gop_sau: sau.man_gop };
  if (truoc.loi) {
    console.log(`  ⚠️ vòng TRƯỚC (${TRUOC}) ném lỗi: ${truoc.loi}`);
    console.log('     chuẩn bị: ' + JSON.stringify(truoc.chuan_bi));
    for (const l of (truoc.loi_console || []).slice(0, 4)) console.log('     console.error: ' + String(l).split('\n')[0]);
  }
  if (sau.loi) console.log(`  ⚠️ vòng SAU ném lỗi: ${sau.loi}`);

  console.log(`\n--- ${rong}px ------------------------------------------------`);
  console.log(`  SỐ DÒNG THẤY ĐƯỢC — TRƯỚC: tab "Việc cần làm" ${truoc.so_dong.tab_nhan} dòng · Lịch sử ${truoc.so_dong.lichsu} dòng`);
  console.log(`                       SAU: "Việc của tôi" ${sau.so_dong['gop.toi']} dòng · "Toàn công ty" ${sau.so_dong['gop.congty']} dòng`);
  const khongGiam = sau.so_dong['gop.toi'] >= truoc.so_dong.tab_nhan &&
                    sau.so_dong['gop.congty'] >= truoc.so_dong.lichsu;
  console.log(`  Số dòng KHÔNG giảm : ${khongGiam ? 'ĐẠT' : '❌ HỎNG'}`);
  console.log(`  Nút bộ lọc ≥44px   : ${sau.nut.dat_44 ? 'ĐẠT' : '❌ HỎNG'}  (${(sau.nut.cao_nut_loc || []).join(' · ')} px)`);
  if (!khongGiam) bao.truot.push(`${rong}px: số dòng bị giảm`);
  if (!sau.nut.dat_44) bao.truot.push(`${rong}px: nút bộ lọc <44px`);
  if (sau.loi_console.length) bao.truot.push(`${rong}px: ${sau.loi_console.length} dòng console.error`);
  if (sau.ngoai_le.length) bao.truot.push(`${rong}px: ${sau.ngoai_le.length} ngoại lệ chưa bắt`);
}

/* ---- ① BẢNG ĐỐI CHIẾU CHỨC NĂNG ---------------------------------------- */
const CN = bao.rong[CAC_RONG[0]].chuc_nang;
const NHAN_CN = {
  'toi.co_dong': 'Việc cần làm — có dòng',
  'toi.batdau': 'Việc cần làm — nút "Bắt đầu làm"',
  'toi.nop': 'Việc cần làm — nút "Nộp kết quả"',
  'toi.todo_xong': 'Việc cần làm — todo cá nhân "✓ Xong"',
  'toi.sua': 'Việc cần làm — nút "Sửa"',
  'toi.nhan_todo': 'Việc cần làm — nhãn 🙋 "Việc của tôi"',
  'toi.cot_muctieu': 'Cột "Mục tiêu" (vốn chỉ có ở Lịch sử)',
  'toi.cot_capnhat': 'Cột "Cập nhật" (vốn chỉ có ở Lịch sử)',
  'toi.bam_that': 'Bấm THẬT một nút, có phản ứng',
  'loc.trangthai': 'Lọc theo trạng thái',
  'loc.timkiem': 'Ô tìm kiếm',
  'dai_cat_cua_toi': 'Dải cắt "đã tải N trong tổng M"',
  'phoihop.co_dong': 'Việc phối hợp — có dòng',
  'phoihop.chi_theo_doi': 'Việc phối hợp — CHỈ theo dõi, không nút',
  'phoihop.cot_nguoi_chinh': 'Việc phối hợp — thấy người chính',
  'giao.co_dong': 'Việc tôi giao — có dòng',
  'giao.duyet': 'Việc tôi giao — nút "Duyệt xong"',
  'giao.tralai': 'Việc tôi giao — nút "Trả lại"',
  'giao.sua': 'Việc tôi giao — nút "Sửa"',
  'giao.huy': 'Việc tôi giao — nút "Huỷ"',
  'giao.cot_giaocho': 'Việc tôi giao — thấy "Giao cho"',
  'congty.thay_viec_nguoi_khac': 'Toàn công ty — thấy việc người khác',
  'congty.dai_cat_taithem': 'Toàn công ty — nút "Tải thêm"',
  'congty.khong_nut_thaotac': 'Toàn công ty — không nút thao tác',
  'duongcu.giao': 'Đường cũ MO_DEN_VIEC_CUA_TOI → đúng phạm vi',
  'duongcu.sang_dong': 'Đường cũ → tới đúng dòng',
  'duongcu.dung_tab': 'Đường cũ → đúng tab, không trang trắng',
  'duongcu.lichsu_tim': 'Đường cũ MO_DEN_LICHSU_TIM → Toàn công ty'
};
console.log('\n--- ① ĐỐI CHIẾU CHỨC NĂNG (ba tab cũ → màn gộp) ---------------');
let thieu = 0;
for (const [ma, nhan] of Object.entries(NHAN_CN)) {
  const dat = CN[ma] === true;
  if (!dat) thieu++;
  console.log(`  ${dat ? '✅' : '❌'}  ${nhan}`);
}
if (thieu) bao.truot.push(`${thieu} chức năng KHÔNG chuyển sang được`);

/* ---- ④ CA ĐỐI CHỨNG ----------------------------------------------------- */
console.log('\n--- ④ CA ĐỐI CHỨNG (BH-16) — gỡ chỗ vá, phép kiểm phải BẮT ĐƯỢC');
for (const dc of DOI_CHUNG) {
  const r = await doMotVong({ be: dc.be, rong: 1440 });
  const doDung = dc.phai_do.filter(k => r.chuc_nang[k] !== true);
  const dat = r.da_be && doDung.length === dc.phai_do.length;
  bao.doi_chung.push({ ma: dc.ma, chu: dc.chu, phai_do: dc.phai_do, do_that: doDung,
                       da_be: r.da_be, loi: r.loi || null, dat });
  console.log(`  ${dat ? '✅' : '❌'}  ${dc.ma} — ${dc.chu}`);
  if (!r.da_be) console.log('        ⚠️ KHÔNG bẻ được gì (regex trượt) — ca này vô nghĩa, sửa regex.');
  if (r.loi) console.log(`        ⚠️ vòng đo ném lỗi: ${r.loi}`);
  console.log(`        phải đỏ: ${dc.phai_do.join(', ')}`);
  console.log(`        đỏ thật: ${doDung.length ? doDung.join(', ') : '(KHÔNG CÓ GÌ ĐỎ — phép đo vô dụng)'}`);
  if (!dat) bao.truot.push(`${dc.ma} không bắt được`);
}

console.log('\n' + '='.repeat(74));
console.log(bao.truot.length ? '❌ TRƯỢT — ' + bao.truot.join(' · ') : '✅ ĐẠT TẤT CẢ');
console.log('='.repeat(74) + '\n');
console.log('KET_QUA_JSON=' + JSON.stringify(bao));
process.exit(bao.truot.length ? 1 : 0);
