/* ==========================================================================
   BÀN ĐO — HỘP SỬA MỤC TIÊU TRÊN MÀN HÌNH THẬT (Chrome headless, 375px)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-hop-sua-muctieu.mjs        (thêm --rong 1440 nếu cần)
   0 phút GitHub Actions, 0 token, không chạm mạng.

   VÌ SAO CÓ BÀN ĐO NÀY, KHÁC VỚI `do-sua-muc-tieu-day-du.mjs`. Bàn kia đo
   MÁY CHỦ: API nhận đủ 7 trường, cắt đúng chỗ, ghi vết đủ. Nhưng Sếp Ngọc
   không gọi API — Sếp bấm nút. Máy chủ nhận 7 trường mà HỘP SỬA chỉ vẽ 2 ô
   thì với Sếp vẫn đúng là "mục tiêu đã giao không sửa được", lần thứ tư.
   Nên bàn này mở app THẬT trong Chrome THẬT ở 375px (điện thoại là đường
   chính), bấm nút Sửa THẬT, rồi đọc `getBoundingClientRect()` THẬT.

   ĐO GÌ
     ① BẢY Ô CÓ MẶT VÀ NHÌN THẤY ĐƯỢC — không phải "có trong HTML" mà là có
        kích thước thật > 0 trên màn.
     ② 44px NGƯỠNG NGÓN TAY — đo `height` thật của nút và ô chạm, không khớp
        chuỗi CSS (khớp chuỗi chính là thứ đã để lọt "tự khai 44px mà đo tay
        ra 28px" lần trước).
     ③ HỎI LÝ DO ĐÚNG LÚC — hộp lý do PHẢI đóng lúc mới mở, PHẢI đóng khi chỉ
        sửa tên (nếu không thì luật thành hình thức), và PHẢI mở khi đổi quý.
     ④ CẢNH BÁO HẬU QUẢ kèm SỐ VIỆC THẬT trước khi bấm Lưu.
     ⑤ LỐI RA "MỞ LẠI" cho mục tiêu đã đóng sổ — và ở chế độ đó thì ô nội
        dung phải ẩn hết, chỉ còn lý do.
     ⑥ KHÔNG TRÀN NGANG ở 375px.

   CA ĐỐI CHỨNG (BH-16) — bẻ ĐÚNG MỘT chỗ, nói TRƯỚC phép kiểm nào phải đỏ:
     DC-A  gỡ khối CSS min-height 44px        → nút/ô tụt xuống dưới ngưỡng
     DC-B  ⚠️ CẮT QUÁ TAY: bật hộp lý do sẵn  → sửa chính tả cũng bị hỏi
     DC-C  bỏ dải cảnh báo hậu quả            → đổi kỳ mà không ai báo trước
     DC-D  bỏ ẩn ô nội dung ở chế độ Mở lại   → hộp mở lại lẫn ô đang bị khoá
   ========================================================================== */

import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const RONG = (() => {
  const i = process.argv.indexOf('--rong');
  return i > 0 ? parseInt(process.argv[i + 1], 10) : 375;
})();

/* Mục tiêu #1: phòng ban, ĐANG có 3 việc (1 xong) — để đo dải cảnh báo nói
   đúng số. Mục tiêu #2: đã hoàn thành — để đo lối ra "Mở lại". */
const MUC_TIEU = {
  nam: 2026, quy: 3, cat: null,
  cong_ty: [],
  phong_ban: [{
    id: 1, cap: 'phong_ban', bo_phan: 'Kho vận', tieu_de: 'Giảm sai sót đóng gói',
    mo_ta: 'Dưới 1% đơn bị khách báo sai hàng', nam: 2026, quy: 3,
    nguoi_tao_id: 'NS-NGOC', nguoi_tao_ten: 'Bùi Thị Ngọc', trang_thai: 'dang_thuc_hien',
    da_chot: 0, so_viec: 3, so_viec_xong: 1, han_gan_nhat: null
  }, {
    id: 2, cap: 'phong_ban', bo_phan: 'Kế toán', tieu_de: 'Chốt sổ quý 3',
    mo_ta: null, nam: 2026, quy: 3,
    nguoi_tao_id: 'NS-NGOC', nguoi_tao_ten: 'Bùi Thị Ngọc', trang_thai: 'hoan_thanh',
    da_chot: 0, so_viec: 2, so_viec_xong: 2, han_gan_nhat: null
  }],
  ca_nhan: []
};

function apiRieng(duong, u, traJson) {
  if (duong === '/api/muc-tieu/danh-sach') { traJson(MUC_TIEU); return true; }
  if (duong === '/api/muc-tieu/cap-nhat') { traJson({ ok: true, so_dong_ghi: 2, so_viec: 3 }); return true; }
  if (duong === '/api/sua/lich-su') { traJson({ ds: [], cat: null }); return true; }
  if (duong === '/api/cong-viec/hom-nay') {
    traJson({ nhac_tat: 0, toi: { qua_han: [], den_han_hom_nay: [], chua_bat_dau: [], cho_toi_duyet: [] },
              dong_viec: [], ghi_nhan: [] });
    return true;
  }
  return false;
}

/* ---- CA ĐỐI CHỨNG ------------------------------------------------------- */
const DOI_CHUNG = [
  /* DC-A — PHÉP ĐO 44px CÓ ĐỎ ĐƯỢC KHÔNG.
     ⚠️ GHI LẠI MỘT KẾT QUẢ NGƯỢC VỚI DỰ ĐOÁN CỦA TÔI, vì nó quan trọng hơn
     một dòng khoe: ca đầu tiên tôi viết là "gỡ khối `min-height: 44px` của
     đợt này" và bản gãy VẪN XANH — tức kiểu chữ + padding SẴN CÓ của form đã
     cho 44–47px, khối CSS tôi thêm KHÔNG phải thứ đang gánh ngưỡng ngón tay
     (nó chỉ là dây bảo hiểm cho lần ai đó chỉnh padding chung). Nếu cứ để ca
     cũ thì nó "đạt" vì một lý do sai — và một ca đối chứng đạt sai còn tệ
     hơn không có ca nào.
     Nên ca này đổi mục đích cho đúng thứ nó chứng minh được: ép chiều cao ô
     xuống 20px và đòi phép đo phải BẮT ĐƯỢC. Không có ca này thì con số
     "45px ĐẠT" chỉ là một dòng chữ chưa ai thử làm cho nó sai. */
  { ma: 'DC-A', chu: 'ép chiều cao ô xuống 20px — phép đo 44px có đỏ được không',
    phai_do: ['nut.dat_44'],
    tep: 'assets/css/style.css',
    be: s => s + '\n#mt-form select, #mt-form input, #mt-form textarea, .cv-sua-nut { min-height: 20px !important; height: 20px !important; padding: 0 !important; }\n' },
  /* ⚠️ CHIỀU NGƯỢC LẠI — nới quá tay cũng là hỏng, mà CẮT quá tay còn tệ hơn:
     hỏi lý do cho cả sửa chính tả thì người ta gõ cho có, và luật thành hình
     thức đúng ở chỗ nó cần thật nhất. */
  { ma: 'DC-B', chu: '⚠️ CẮT QUÁ TAY: bật hộp lý do ngay từ đầu',
    phai_do: ['lydo.dong_luc_moi_mo', 'lydo.dong_khi_sua_ten'],
    tep: 'assets/js/app.js',
    be: s => s.replace("$('#mt-khoi-lydo').hidden = !canLyDo;", "$('#mt-khoi-lydo').hidden = false;") },
  { ma: 'DC-C', chu: 'bỏ dải cảnh báo hậu quả khi đổi kỳ',
    phai_do: ['canhbao.hien_khi_doi_quy', 'canhbao.noi_dung_so_viec'],
    tep: 'assets/js/app.js',
    be: s => s.replace("$('#mt-canh-bao').hidden = cauCanhBao.length === 0;", "$('#mt-canh-bao').hidden = true;") },
  { ma: 'DC-D', chu: 'bỏ ẩn ô nội dung ở chế độ Mở lại',
    phai_do: ['molai.an_o_noi_dung'],
    tep: 'assets/js/app.js',
    be: s => s.replace("document.querySelectorAll('.mt-o-noidung').forEach(o => { o.hidden = !!moLai; });", '') }
];

const NGU = (ms) => new Promise(ok => setTimeout(ok, ms));

/* Bảy ô, đúng bảy trường máy chủ nhận. */
const BAY_O = {
  tieu_de: '#mt-tieu-de', mo_ta: '#mt-mo-ta', cap: '#mt-cap', bo_phan: '#mt-bo-phan',
  nam: '#mt-nam', quy: '#mt-quy', trang_thai: '#mt-trang-thai'
};

async function doMotVong({ be = null, tep = null } = {}) {
  let daBe = false;
  const suaTep = be
    ? (s, ten) => { if (ten !== tep) return s; const sau = be(s); if (sau !== s) daBe = true; return sau; }
    : null;
  /* `dungMayGia` chỉ chạy `suaTep` cho app.html + app.js. Ca DC-A cần bẻ CSS,
     nên bẻ thẳng trên thư mục tạm sau khi máy giả đã dựng xong. */
  const may = await dungMayGia({ apiRieng, tatHoatAnh: true, suaTep: tep === 'assets/css/style.css' ? null : suaTep });
  if (tep === 'assets/css/style.css' && be) {
    const { readFileSync, writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const p = join(may.thuMuc, 'assets/css/style.css');
    const truoc = readFileSync(p, 'utf8');
    const sau = be(truoc);
    if (sau !== truoc) { writeFileSync(p, sau, 'utf8'); daBe = true; }
  }
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 3000 });
  const kq = { rong: RONG, chuc_nang: {}, nut: {}, loi: null, da_be: daBe };
  const chay = (js) => cr.chay(js);

  try {
    /* CHỜ CÓ ĐIỀU KIỆN, không chờ theo đồng hồ — `doiMs` cố định là phép đo
       phụ thuộc máy đang bận hay rảnh (BH-17). */
    async function doiCho(js, ten, hetHan = 15000) {
      const moc = Date.now();
      for (;;) {
        let co = false;
        try { co = !!(await chay(js)); } catch { co = false; }
        if (co) return true;
        if (Date.now() - moc > hetHan) throw new Error(`Chờ quá ${hetHan}ms mà chưa có: ${ten}`);
        await NGU(200);
      }
    }
    await doiCho("!!document.querySelector('[data-mt-sua=\"1\"]')", 'nút Sửa trên thẻ mục tiêu');

    /* --- ① mở hộp Sửa, đếm ô NHÌN THẤY ĐƯỢC --- */
    await chay("document.querySelector('[data-mt-sua=\"1\"]').click()");
    await doiCho("!document.getElementById('mtFormModalNen').hidden", 'hộp Sửa mở ra');

    const O_JS = JSON.stringify(BAY_O);
    kq.chuc_nang['o.du_7_truong'] = await chay(`(() => {
      const O = ${O_JS};
      return Object.values(O).every(sel => {
        const e = document.querySelector(sel);
        if (!e || e.offsetParent === null) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    })()`);
    kq.chuc_nang['o.thieu'] = await chay(`(() => {
      const O = ${O_JS};
      return Object.entries(O).filter(([, sel]) => {
        const e = document.querySelector(sel);
        return !e || e.offsetParent === null || e.getBoundingClientRect().height === 0;
      }).map(([t]) => t).join(',') || 'khong-thieu';
    })()`);
    /* Ô phòng ban chỉ có nghĩa khi cấp = phòng ban — mục tiêu #1 đúng cấp đó
       nên nó phải HIỆN; đổi sang cá nhân thì phải ẩn đi. */
    kq.chuc_nang['bophan.an_khi_doi_sang_ca_nhan'] = await chay(`(() => {
      const s = document.getElementById('mt-cap');
      s.value = 'ca_nhan'; s.dispatchEvent(new Event('change'));
      const an = document.getElementById('mt-field-bophan').hidden;
      s.value = 'phong_ban'; s.dispatchEvent(new Event('change'));
      return an && !document.getElementById('mt-field-bophan').hidden;
    })()`);

    /* --- ③ hỏi lý do ĐÚNG LÚC --- */
    kq.chuc_nang['lydo.dong_luc_moi_mo'] = await chay(
      "document.getElementById('mt-khoi-lydo').hidden === true");
    kq.chuc_nang['lydo.dong_khi_sua_ten'] = await chay(`(() => {
      const t = document.getElementById('mt-tieu-de');
      t.value = 'Giảm sai sót đóng gói (sửa chính tả)';
      t.dispatchEvent(new Event('input'));
      document.getElementById('mt-quy').dispatchEvent(new Event('change'));  // ép vẽ lại
      return document.getElementById('mt-khoi-lydo').hidden === true;
    })()`);
    kq.chuc_nang['lydo.mo_khi_doi_quy'] = await chay(`(() => {
      const q = document.getElementById('mt-quy');
      q.value = '4'; q.dispatchEvent(new Event('change'));
      return document.getElementById('mt-khoi-lydo').hidden === false
          && document.getElementById('mt-ly-do').required === true;
    })()`);

    /* --- ④ cảnh báo hậu quả, kèm SỐ VIỆC THẬT --- */
    /* ⚠️ ĐỌC CHỮ THÔI LÀ CHƯA ĐỦ — phải NHÌN THẤY ĐƯỢC. Bản đầu của bàn đo
       này chỉ đọc `textContent`, nên ca đối chứng DC-C (ép `hidden = true`)
       vẫn "đạt": `innerHTML` còn nguyên, chỉ có người dùng là không thấy gì.
       Một cảnh báo có chữ mà không hiện thì đúng bằng không có (BH-17 — phép
       đo hỏng, không phải mã hỏng). Nay đo cả `offsetParent`. */
    const HIEN = (id) => `(() => { const e = document.getElementById('${id}');
      return !!e && !e.hidden && e.offsetParent !== null; })()`;
    kq.chuc_nang['canhbao.hien_khi_doi_quy'] = await chay(HIEN('mt-canh-bao'));
    kq.chuc_nang['canhbao.noi_dung_so_viec'] = await chay(`(() => {
      const e = document.getElementById('mt-canh-bao');
      if (!e || e.hidden || e.offsetParent === null) return false;
      const t = e.textContent || '';
      return /3 việc/.test(t) && /kỳ báo cáo/.test(t);
    })()`);
    kq.chuc_nang['canhbao.noi_ro_giau_khi_ha_ca_nhan'] = await chay(`(() => {
      const s = document.getElementById('mt-cap');
      s.value = 'ca_nhan'; s.dispatchEvent(new Event('change'));
      const e = document.getElementById('mt-canh-bao');
      if (!e || e.hidden || e.offsetParent === null) return false;
      return /giấu mục tiêu khỏi cả công ty/.test(e.textContent || '');
    })()`);

    /* --- ② 44px, ĐO THẬT ---
       ⚠️ TRẢ CẤP VỀ `phong_ban` TRƯỚC KHI ĐO. Phép kiểm ngay trên vừa hạ cấp
       xuống `ca_nhan`, mà ô Phòng ban CỐ Ý ẩn ở cấp đó — đo lúc đang ẩn thì
       nó ra 0px và bàn đo báo "trượt 44px" oan, trong khi CSS không hề sai.
       Trạng thái rò từ phép kiểm này sang phép kiểm kia đúng là bẫy BH-17. */
    await chay(`(() => { const s = document.getElementById('mt-cap');
      s.value = 'phong_ban'; s.dispatchEvent(new Event('change')); })()`);
    const CHAM = ['#mt-nut-luu', '#mt-nut-huy', '#mt-cap', '#mt-quy', '#mt-nam',
                  '#mt-trang-thai', '#mt-bo-phan', '#mt-ly-do'];
    kq.nut.cao = await chay(`(() => {
      const S = ${JSON.stringify(CHAM)};
      return S.map(sel => {
        const e = document.querySelector(sel);
        return e ? Math.round(e.getBoundingClientRect().height * 10) / 10 : null;
      });
    })()`);
    kq.nut.ten = CHAM;
    kq.nut.dat_44 = (kq.nut.cao || []).every(h => h !== null && h >= 44);

    /* --- ⑥ không tràn ngang --- */
    kq.chuc_nang['khong_tran_ngang'] = await chay(
      'document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1');

    /* --- ⑤ lối ra MỞ LẠI (mục tiêu #2 đã hoàn thành) --- */
    await chay("document.getElementById('mt-nut-huy').click()");
    kq.chuc_nang['molai.co_nut'] = await chay("!!document.querySelector('[data-mt-molai=\"2\"]')");
    if (kq.chuc_nang['molai.co_nut']) {
      await chay("document.querySelector('[data-mt-molai=\"2\"]').click()");
      await doiCho("!document.getElementById('mtFormModalNen').hidden", 'hộp Mở lại');
      kq.chuc_nang['molai.an_o_noi_dung'] = await chay(`(() => {
        const O = ${O_JS};
        return Object.values(O).every(sel => {
          const e = document.querySelector(sel);
          return !e || e.offsetParent === null;
        });
      })()`);
      kq.chuc_nang['molai.bat_ly_do'] = await chay(
        "document.getElementById('mt-khoi-lydo').hidden === false && document.getElementById('mt-ly-do').required === true");
      kq.chuc_nang['molai.doi_chu_nut'] = await chay(
        "/Mở lại/.test(document.getElementById('mt-nut-luu').textContent)");
    }

    kq.loi_console = cr.loiConsole.filter(l => !/favicon|manifest/i.test(l));
    kq.ngoai_le = cr.ngoaiLe;
  } catch (e) {
    kq.loi = String(e && e.message || e);
  } finally {
    cr.dong(); may.dong();
  }
  return kq;
}

/* ========================================================================== */
console.log('\n' + '='.repeat(72));
console.log(`HỘP SỬA MỤC TIÊU — ĐO TRÊN MÀN HÌNH THẬT @${RONG}px`);
console.log('='.repeat(72) + '\n');

const THAT = await doMotVong({});
if (THAT.loi) { console.error('LỖI khi đo bản thật:', THAT.loi); process.exit(1); }

let truot = 0;
const ok = (nhan, dk, chiTiet = '') => {
  if (dk) console.log(`  ✅ ${nhan}${chiTiet ? ' — ' + chiTiet : ''}`);
  else { truot++; console.log(`  ❌ ${nhan}${chiTiet ? ' — ' + chiTiet : ''}`); }
};

console.log('--- ① HỘP SỬA CÓ ĐỦ 7 Ô NHÌN THẤY ĐƯỢC ---\n');
ok('cả 7/7 ô hiện thật trên màn (không phải chỉ có trong HTML)',
   THAT.chuc_nang['o.du_7_truong'], `thiếu: ${THAT.chuc_nang['o.thieu']}`);
ok('ô Phòng ban tự ẩn/hiện theo Cấp (không mời điền vào chỗ máy chủ sẽ xoá)',
   THAT.chuc_nang['bophan.an_khi_doi_sang_ca_nhan']);

console.log('\n--- ② 44px NGƯỠNG NGÓN TAY (đo getBoundingClientRect thật) ---\n');
THAT.nut.ten.forEach((t, i) => {
  console.log(`  ${t.padEnd(18)} ${String(THAT.nut.cao[i]).padStart(6)}px  ${THAT.nut.cao[i] >= 44 ? 'ĐẠT' : 'TRƯỢT'}`);
});
ok('mọi nút và ô chạm trong hộp đều ≥ 44px', THAT.nut.dat_44);
ok(`không tràn ngang @${RONG}px`, THAT.chuc_nang['khong_tran_ngang']);

console.log('\n--- ③ HỎI LÝ DO ĐÚNG LÚC (không cắt quá tay) ---\n');
ok('lúc mới mở hộp: KHÔNG hỏi lý do', THAT.chuc_nang['lydo.dong_luc_moi_mo']);
ok('⚠️ chỉ sửa TÊN: vẫn KHÔNG hỏi lý do — sửa chính tả phải đi lọt',
   THAT.chuc_nang['lydo.dong_khi_sua_ten']);
ok('đổi QUÝ: hộp lý do bật lên và thành bắt buộc', THAT.chuc_nang['lydo.mo_khi_doi_quy']);

console.log('\n--- ④ CẢNH BÁO HẬU QUẢ TRƯỚC KHI BẤM LƯU ---\n');
ok('đổi quý → dải cảnh báo hiện ra', THAT.chuc_nang['canhbao.hien_khi_doi_quy']);
ok('  → nói ĐÚNG số việc đang treo (3 việc) và nói rõ "đổi kỳ báo cáo"',
   THAT.chuc_nang['canhbao.noi_dung_so_viec']);
ok('hạ cấp xuống Cá nhân → nói thẳng là ĐANG GIẤU mục tiêu khỏi cả công ty',
   THAT.chuc_nang['canhbao.noi_ro_giau_khi_ha_ca_nhan']);

console.log('\n--- ⑤ LỐI RA "MỞ LẠI" cho mục tiêu đã đóng sổ ---\n');
ok('thẻ mục tiêu đã hoàn thành có nút "Mở lại"', THAT.chuc_nang['molai.co_nut']);
ok('  → chế độ Mở lại ẩn hết ô nội dung (đang khoá, không vẽ ra để trêu người dùng)',
   THAT.chuc_nang['molai.an_o_noi_dung']);
ok('  → và bắt buộc ghi lý do', THAT.chuc_nang['molai.bat_ly_do']);
ok('  → nút đổi chữ thành "Mở lại mục tiêu"', THAT.chuc_nang['molai.doi_chu_nut']);

console.log('\n--- LỖI TRÌNH DUYỆT ---\n');
ok('không có lỗi console', (THAT.loi_console || []).length === 0, JSON.stringify(THAT.loi_console));
ok('không có ngoại lệ chưa bắt', (THAT.ngoai_le || []).length === 0, JSON.stringify(THAT.ngoai_le));

/* ---- CA ĐỐI CHỨNG ------------------------------------------------------- */
console.log('\n' + '='.repeat(72));
console.log('CA ĐỐI CHỨNG — bẻ ĐÚNG MỘT chỗ, phép kiểm đã nêu PHẢI đỏ');
console.log('='.repeat(72) + '\n');

for (const dc of DOI_CHUNG) {
  const G = await doMotVong({ be: dc.be, tep: dc.tep });
  if (!G.da_be) { truot++; console.log(`  ❌ ${dc.ma} · ${dc.chu} — KHÔNG bẻ được gì, ca đối chứng vô nghĩa`); continue; }
  if (G.loi) { truot++; console.log(`  ❌ ${dc.ma} · ${dc.chu} — bản gãy lỗi khi đo: ${G.loi}`); continue; }
  const doThat = dc.phai_do.filter(k => k === 'nut.dat_44' ? !G.nut.dat_44 : !G.chuc_nang[k]);
  const dat = doThat.length === dc.phai_do.length;
  if (dat) console.log(`  ✅ ${dc.ma} · ${dc.chu} → đỏ đúng: ${doThat.join(', ')}`);
  else {
    truot++;
    console.log(`  ❌ ${dc.ma} · ${dc.chu} — phải đỏ [${dc.phai_do.join(', ')}] nhưng chỉ đỏ [${doThat.join(', ') || 'không cái nào'}]` +
                (dc.ma === 'DC-A' ? ` (cao đo được: ${JSON.stringify(G.nut.cao)})` : ''));
  }
}

console.log(`\n${'='.repeat(72)}\n${truot === 0 ? '✅ XANH' : `❌ ĐỎ — ${truot} phép kiểm trượt`}`);
process.exit(truot === 0 ? 0 : 1);
