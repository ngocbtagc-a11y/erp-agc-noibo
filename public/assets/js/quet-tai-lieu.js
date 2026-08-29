/* ==========================================================================
   QUÉT TÀI LIỆU BẰNG ĐIỆN THOẠI — LÕI DÙNG CHUNG
   CTL-0026 (kho chung, Đợt 1)  ·  CTL-0025 (hồ sơ nhân sự, Đợt 2)
   ---------------------------------------------------------------------------
   MỘT cỗ máy, HAI cửa vào. Khác nhau CHỈ ở hai tham số `cuaVao` + `ganId`;
   mọi thứ còn lại — chụp, nén, gộp trang, xem lại, chụp lại, nhập hạn, gửi
   lại khi sóng yếu — dùng chung. Đợt 2 chỉ việc gọi:

       moQuetTaiLieu({ cuaVao: 'nhan_su', ganId: nhanSu.id, ... })

   ---------------------------------------------------------------------------
   NĂM CHUYỆN THẬT PHẢI GIẢI (CTL-0025 Mục 3 · CTL-0026 phần "Năm chuyện"):

   ① NHIỀU TRANG   → `gop-trang-pdf.js` gộp N ảnh thành MỘT file PDF ở máy.
                     Kho nhận đúng 1 tài liệu, không phải 5 ảnh rời.
   ② ẢNH 3–8 MB    → nén bằng `nenAnhChung()` NGAY khi vừa chụp, trước khi
                     bất cứ byte nào rời điện thoại. Kho sóng yếu, gửi nguyên
                     ảnh máy ảnh là treo.
   ③ CHỤP LỆCH/MỜ  → mỗi trang có ô xem lại + nút "Chụp lại" RIÊNG cho trang
                     đó. Lưu rồi mới thấy mờ là phải làm lại cả bộ.
   ④ LOẠI GIẤY TỜ  → chọn nhóm TRƯỚC KHI mở máy ảnh. Chọn xong máy ảnh bật
                     luôn, không tốn thêm một cú chạm nào.
   ⑤ NGÀY HẾT HẠN  → hỏi ngay ở màn cuối, có phím tắt +1/+2/+3 năm. Để sau là
                     không ai quay lại nhập.

   ---------------------------------------------------------------------------
   SÓNG YẾU (ràng buộc cứng): toàn bộ bộ ảnh đã chụp nằm trong `localStorage`
   NGAY SAU MỖI LẦN CHỤP. Gửi hụt, tắt máy, hết pin, đóng nhầm tab — mở lại
   vẫn còn nguyên và bấm "Gửi lại" là xong. `maGui` giữ NGUYÊN qua mọi lần gửi
   lại, nên máy chủ nhận ra và KHÔNG tạo bản trùng trên Drive.

   ⚠️ Câu bắt buộc trên màn hình (CTL-0026 Mục 2): đây là BẢN DỰ PHÒNG, KHÔNG
   thay bản giấy. Không có câu đó là có ngày ai đó dọn kho giấy.

   MIỄN PHÍ, KHÔNG THƯ VIỆN: máy ảnh mở bằng `<input capture="environment">`,
   nén bằng canvas có sẵn, gộp PDF viết tay. Không cài gì thêm.
   ========================================================================== */

import { nenAnhChung, coByteCuaDataUrl } from './anh-chung.js';
import { gopTrangThanhPDF, dataUrlThanhByte, byteThanhBase64 } from './gop-trang-pdf.js';
import { API } from './api.js';

/* ---- Thông số nén. Đo thật rồi mới chốt (xem báo cáo CTL-0026):
   1700px/chất lượng 0.72 giữ được chữ in 10pt và dấu tiếng Việt, mà một
   trang A4 ra 180–380 KB. Trần 450 KB để 12 trang vẫn dưới trần 6 MB của
   máy chủ. Ảnh bóc chữ nhỏ hơn hẳn: AI đọc ảnh không cần nét bằng mắt
   người, mà ảnh nhỏ thì gọi AI nhanh hơn nhiều. */
const ANH_TRANG = { cheDo: 'vua-khung', canhToiDa: 1700, chatLuong: 0.72, gioiHanByte: 450 * 1024 };
const ANH_BOC_CHU = { cheDo: 'vua-khung', canhToiDa: 1100, chatLuong: 0.65, gioiHanByte: 160 * 1024 };
const TRAN_SO_TRANG = 12;
const TRAN_TRANG_BOC_CHU = 3;      // khớp TRAN_TRANG_BOC_CHU ở src/tai-lieu.js

export const CAU_PHAP_LY =
  'Đây là bản dự phòng để tra cứu. KHÔNG thay bản giấy — đừng huỷ giấy gốc.';
export const CAU_TRA_GIAY =
  'Chỉ lưu BẢN SAO. Quét xong trả giấy lại cho nhân viên ngay.';

/* ==========================================================================
   1. Bản nháp trong máy — thứ giữ cho "gửi hụt không mất ảnh"
   ========================================================================== */
function khoaNhap(cuaVao, ganId) {
  return `tl_nhap_v1_${cuaVao}_${ganId || 'chung'}`;
}

function docNhap(cuaVao, ganId) {
  try {
    const s = localStorage.getItem(khoaNhap(cuaVao, ganId));
    if (!s) return null;
    const d = JSON.parse(s);
    return (d && Array.isArray(d.trang) && d.trang.length) ? d : null;
  } catch { return null; }
}

/** Trả về true nếu ghi được. Ghi HỎNG (hết chỗ, chế độ ẩn danh) thì KHÔNG
 *  ném lỗi — bộ ảnh vẫn nằm trong bộ nhớ trang, chỉ là đóng tab thì mất, và
 *  màn hình sẽ nói thẳng câu đó ra thay vì im lặng. */
function ghiNhap(cuaVao, ganId, d) {
  try {
    localStorage.setItem(khoaNhap(cuaVao, ganId), JSON.stringify(d));
    return true;
  } catch { return false; }
}

function xoaNhap(cuaVao, ganId) {
  try { localStorage.removeItem(khoaNhap(cuaVao, ganId)); } catch { /* kệ */ }
}

/* ==========================================================================
   2. Tiện ích nhỏ
   ========================================================================== */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const coDoc = (b) => b < 1024 ? b + ' B'
  : b < 1048576 ? (b / 1024).toFixed(0) + ' KB'
  : (b / 1048576).toFixed(2) + ' MB';

function dataUrlThanhTep(dataUrl, ten) {
  const u8 = dataUrlThanhByte(dataUrl);
  return new File([u8], ten, { type: 'image/jpeg' });
}

/** 'YYYY-MM-DD' của hôm nay theo giờ Việt Nam. */
function homNayVN() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function congNam(n) {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

/* ==========================================================================
   3. Mở màn quét
   ---------------------------------------------------------------------------
   @param {object} t
   @param {string} t.cuaVao       'kho_chung' (Đợt 1) | 'nhan_su' (Đợt 2)
   @param {string} [t.ganId]      nhan_su.id khi cuaVao='nhan_su'
   @param {Array}  t.nhom         [{ma, ten, vi_du, han_luu, nhay_cam}] — CHỈ
                                  các nhóm người này được LƯU (máy chủ vẫn
                                  kiểm lại, đây chỉ là bớt chỗ bấm nhầm)
   @param {Function} [t.timNguoi] async () => [{id, ho_ten}] — CHỈ cửa KHO
                                  CHUNG truyền. Nhóm "Nhân sự" chọn ở cửa kho
                                  chung BẮT BUỘC phải chọn người trước khi lưu
                                  (REV-0046 #2 — Sếp Ngọc: "thành 1 bộ là
                                  đẹp"). Danh sách lấy từ MÁY CHỦ lúc cần,
                                  không chép sẵn vào đây.
   @param {string} [t.tenGoiY]    điền sẵn tiêu đề (Đợt 2: tên nhân viên)
   @param {string} [t.dongYGoiY]  điền sẵn ô "ai đồng ý" (Đợt 2: tên nhân viên
                                  — người có giấy tờ CHÍNH LÀ người đó)
   @param {Array}  [t.loaiGoiY]   [{ma, ten, goi_y_so}] — chip bấm một cái là
                                  xong ô "Loại giấy", thay vì gõ tay trên điện
                                  thoại. MÁY CHỦ trả danh sách này, trình duyệt
                                  KHÔNG giữ bản chép tay.
   @param {boolean} [t.boQuaChonNhom] cửa chỉ có ĐÚNG MỘT nhóm (hồ sơ nhân sự)
                                  thì bỏ hẳn màn chọn nhóm và mở máy ảnh luôn —
                                  tiết kiệm đúng một cú chạm. Cửa kho chung
                                  KHÔNG truyền cờ này: ở đó chọn nhóm là một
                                  quyết định thật.
   @param {Function} t.khiXong    gọi lại sau khi lưu thành công
   ========================================================================== */
export function moQuetTaiLieu(t) {
  const cuaVao = t.cuaVao || 'kho_chung';
  const ganId = t.ganId || null;
  const dsLoaiGoiY = Array.isArray(t.loaiGoiY) ? t.loaiGoiY.filter(x => x && x.ten) : [];
  const dsNhom = (t.nhom || []).filter(n => n && n.ma);
  if (!dsNhom.length) {
    alert('Bạn không có quyền quét tài liệu vào nhóm nào. Nhờ Admin cấp quyền.');
    return null;
  }

  /* ---- Trạng thái ---- */
  /* Bỏ màn chọn nhóm CHỈ khi cửa vào thật sự có đúng một nhóm — cờ do nơi gọi
     bật, không tự đoán: đoán sai là người ta mất luôn màn chọn nhóm ở kho
     chung mà không hiểu vì sao. */
  const boQuaChonNhom = t.boQuaChonNhom === true && dsNhom.length === 1;
  let hs = docNhap(cuaVao, ganId) || moiBo();
  let dangGui = false;
  let loiGui = null;
  let nhapKhongLuuDuoc = false;                       // localStorage không ghi được

  /* ---- NHÓM NHÂN SỰ PHẢI CÓ CHỦ  ·  REV-0046 #2 ------------------------
     Máy chủ đã chặn cứng (giấy nhóm `nhan_su` không có `gan_id` → 400). Màn
     này chỉ để người ta không đi hết 12 chạm rồi mới bị chặn. Cửa hồ sơ đã có
     `ganId` sẵn nên không bao giờ vào màn này. */
  const timNguoi = typeof t.timNguoi === 'function' ? t.timNguoi : null;
  let dsNguoi = null;                 // null = chưa nạp
  let loiNguoi = null;
  const canChonNguoi = () => hs.nhom === 'nhan_su' && !ganId && !hs.ganId;

  let manHinh = hs.trang.length ? 'trang' : boQuaChonNhom ? 'trang' : 'chon-nhom';

  function moiBo() {
    return {
      maGui: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())).slice(0, 40),
      nhom: dsNhom.length === 1 ? dsNhom[0].ma : '',
      /* Người được gắn khi quét ở cửa KHO CHUNG mà chọn nhóm Nhân sự. Nằm
         trong bản nháp để tắt máy giữa chừng mở lại vẫn còn — mất nó là người
         ta phải chọn lại người cho một xấp ảnh đã chụp xong. */
      ganId: '', ganTen: '',
      trang: [], tieuDe: t.tenGoiY || '', loai: '', soHieu: '',
      ngayBanHanh: '', ngayHetHan: '',
      /* Điền sẵn TÊN người, KHÔNG điền sẵn mục đích: "ai đồng ý" là chuyện xác
         định được (giấy của người nào thì người đó), còn "đồng ý cho mục đích
         gì" là chuyện phải hỏi thật. Điền sẵn cả hai thì cái dấu đồng ý của
         Luật BVDLCN 91/2025/QH15 thành một ô máy tự gõ. */
      dongYBoi: t.dongYGoiY || '', dongYMucDich: ''
    };
  }

  function luuNhap() {
    if (!hs.trang.length) { xoaNhap(cuaVao, ganId); nhapKhongLuuDuoc = false; return; }
    nhapKhongLuuDuoc = !ghiNhap(cuaVao, ganId, hs);
  }

  function nhomDangChon() { return dsNhom.find(n => n.ma === hs.nhom) || null; }

  /** Loại giấy đang chọn có phải CCCD không. Bản NGẮN của `laLoaiCCCD()` ở máy
   *  chủ, và cố ý chỉ dùng để HIỆN LỜI NHẮC — chốt thật nằm ở máy chủ
   *  (`src/tai-lieu.js`), nên hai bản có lệch nhau thì cùng lắm là thiếu một
   *  dòng nhắc, KHÔNG phải lọt một số CCCD sai. */
  function laCCCD(loai) {
    return /cccd|cmnd|căn cước|can cuoc/i.test(String(loai || ''));
  }

  function goiYSoHieu() {
    const l = dsLoaiGoiY.find(x => x.ten === hs.loai);
    return (l && l.goi_y_so) || 'VD: 123/2026/GCN-ATTP';
  }

  /* ---- Khung ---- */
  const nen = document.createElement('div');
  nen.className = 'tlq-nen';
  nen.innerHTML = '<div class="tlq-tam" role="dialog" aria-modal="true" aria-label="Quét tài liệu"></div>';
  const tam = nen.querySelector('.tlq-tam');
  document.body.appendChild(nen);
  document.body.classList.add('tlq-khoa-cuon');

  /* Máy ảnh — MỘT ô input dùng lại cho mọi trang.
     `capture="environment"` bảo điện thoại mở THẲNG camera sau. Đây là cả
     phần "tiện lợi để scan trên điện thoại" mà Sếp yêu cầu, và nó miễn phí,
     không cần một dòng thư viện nào. Máy tính bàn không có camera thì trình
     duyệt tự rơi về hộp chọn file — vẫn dùng được, không hỏng. */
  const oMayAnh = document.createElement('input');
  oMayAnh.type = 'file';
  oMayAnh.accept = 'image/*';
  oMayAnh.setAttribute('capture', 'environment');
  oMayAnh.hidden = true;
  document.body.appendChild(oMayAnh);

  let viTriChupLai = -1;        // -1 = chụp trang mới; ≥0 = chụp lại đúng trang đó

  oMayAnh.addEventListener('change', async () => {
    const f = oMayAnh.files && oMayAnh.files[0];
    oMayAnh.value = '';                    // để chụp lại cùng một trang vẫn nổ sự kiện
    if (!f) return;
    try {
      const coGoc = f.size;
      const t0 = performance.now();
      const nen_ = await nenAnhChung(f, ANH_TRANG);
      const trang = {
        anh: nen_,
        co_goc: coGoc,
        co_nen: coByteCuaDataUrl(nen_),
        ms_nen: Math.round(performance.now() - t0)
      };
      if (viTriChupLai >= 0) hs.trang[viTriChupLai] = trang;
      else hs.trang.push(trang);
      viTriChupLai = -1;
      luuNhap();
      manHinh = 'trang';
      ve();
    } catch (e) {
      alert('Không đọc được ảnh vừa chụp: ' + e.message);
    }
  });

  function moMayAnh(viTri = -1) {
    if (viTri < 0 && hs.trang.length >= TRAN_SO_TRANG) {
      alert(`Một tài liệu tối đa ${TRAN_SO_TRANG} trang. Tách thành hai tài liệu nhé.`);
      return;
    }
    viTriChupLai = viTri;
    oMayAnh.click();
  }

  /* ---- Đóng ---- */
  function dong() {
    document.body.classList.remove('tlq-khoa-cuon');
    nen.remove();
    oMayAnh.remove();
    document.removeEventListener('keydown', phimEsc);
  }
  function phimEsc(e) { if (e.key === 'Escape') hoiThoat(); }
  document.addEventListener('keydown', phimEsc);

  function hoiThoat() {
    if (dangGui) return;
    if (hs.trang.length && !confirm(
      `Còn ${hs.trang.length} trang đã chụp chưa lưu.\n\n` +
      `Bấm OK để đóng — bộ này vẫn giữ trong máy, lần sau mở ra quét tiếp được.`)) return;
    dong();
  }

  nen.addEventListener('click', (e) => { if (e.target === nen) hoiThoat(); });

  /* ======================================================================
     4. Vẽ màn hình
     ====================================================================== */
  function ve() {
    tam.innerHTML =
      dauTrang() +
      (manHinh === 'chon-nhom' ? veChonNhom()
        : manHinh === 'chon-nguoi' ? veChonNguoi()
        : manHinh === 'thong-tin' ? veThongTin()
        : veTrang());
    noiSuKien();
    const oDau = tam.querySelector('[data-tu-focus]');
    if (oDau) setTimeout(() => oDau.focus(), 30);
  }

  function dauTrang() {
    const n = nhomDangChon();
    const cua = hs.ganTen ? ' · ' + esc(hs.ganTen) : '';
    return `
      <div class="tlq-dau">
        <b>Quét tài liệu${n ? ' · ' + esc(n.ten) : ''}${cua}</b>
        <button type="button" class="tlq-x" data-viec="dong" aria-label="Đóng">✕</button>
      </div>
      <div class="tlq-luat">
        <b>⚠️ ${esc(CAU_PHAP_LY)}</b>
        <div class="tlq-luat-phu">
          Luật Giao dịch điện tử 2023 chỉ công nhận bản số hoá khi có ký số và
          bảo đảm toàn vẹn — quét bằng điện thoại không đạt. Luật Kế toán vẫn
          bắt giữ bản giấy có dấu đỏ.
          ${n && n.nhay_cam ? `<br><b>${esc(CAU_TRA_GIAY)}</b>` : ''}
        </div>
      </div>`;
  }

  function veChonNhom() {
    return `
      <div class="tlq-than">
        <p class="tlq-huong">Chọn loại giấy tờ <b>trước</b> — chọn xong máy ảnh mở luôn.</p>
        <div class="tlq-nhom">
          ${dsNhom.map(n => `
            <button type="button" class="tlq-o-nhom" data-viec="chon-nhom" data-ma="${esc(n.ma)}">
              <b>${esc(n.ten)}</b>
              <span>${esc(n.vi_du || '')}</span>
              <i>Hạn lưu bản giấy: ${esc(n.han_luu || '—')}</i>
            </button>`).join('')}
        </div>
      </div>`;
  }

  /* ---- MÀN CHỌN NGƯỜI  ·  REV-0046 #2 ---------------------------------
     Chỉ hiện ở cửa KHO CHUNG khi nhóm đang chọn là "Nhân sự". Không có màn
     này thì tờ giấy nhân sự quét ở kho chung nằm ngoài bộ của mọi người —
     đúng thứ Sếp Ngọc gọi là không "thành 1 bộ". */
  function veChonNguoi() {
    if (loiNguoi) {
      return `<div class="tlq-than">
        <p class="tlq-loi">Không lấy được danh sách nhân sự: ${esc(loiNguoi)}</p>
        <button type="button" class="tlq-nut-chinh" data-viec="tai-lai-nguoi">↻ Thử lại</button>
        <button type="button" class="tlq-nut-nhi" data-viec="doi-nhom">← Chọn nhóm giấy khác</button>
      </div>`;
    }
    if (dsNguoi === null) {
      return `<div class="tlq-than"><p class="tlq-huong">Đang lấy danh sách nhân sự…</p></div>`;
    }
    if (!dsNguoi.length) {
      return `<div class="tlq-than">
        <p class="tlq-canh">Chưa có nhân sự nào đang làm việc để gắn giấy tờ vào.</p>
        <button type="button" class="tlq-nut-nhi" data-viec="doi-nhom">← Chọn nhóm giấy khác</button>
      </div>`;
    }
    return `
      <div class="tlq-than">
        <p class="tlq-huong">Giấy tờ nhân sự phải nằm <b>trong hồ sơ của một người</b> —
          chọn người trước, để mở hồ sơ ra là thấy đủ <b>một bộ</b>.</p>
        <input class="tlq-o" id="tlqTimNguoi" data-tu-focus maxlength="60"
               placeholder="Gõ tên để lọc — VD: Phạm Khương Duy">
        <div class="tlq-nhom" id="tlqDsNguoi">${veODsNguoi('')}</div>
        <button type="button" class="tlq-nut-nhi" data-viec="doi-nhom">← Chọn nhóm giấy khác</button>
      </div>`;
  }

  /** Bỏ dấu + hạ chữ thường, để gõ "duy" ra "Phạm Khương Duy". Cùng luật với
   *  ô tìm ở máy chủ, nhưng đây chỉ lọc TẠI CHỖ, không gọi thêm lượt nào. */
  function khongDau(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  function veODsNguoi(tu) {
    const k = khongDau(tu).trim();
    /* KHÔNG cắt danh sách. Cắt im lặng ở đây nghĩa là người quét gõ đúng tên
       mà không thấy ai, rồi tưởng người đó chưa có trong ERP (đúng thứ
       `do-cat-im-lang` sinh ra để bắt). Danh sách đã lọc "đang làm việc" nên
       cỡ vài chục dòng — vẽ hết là đúng và vẫn nhanh. */
    const ds = (dsNguoi || []).filter(n => !k || khongDau(n.ho_ten).includes(k));
    if (!ds.length) return `<p class="tlq-huong">Không có ai khớp "${esc(tu)}".</p>`;
    return ds.map(n => `
      <button type="button" class="tlq-o-nhom" data-viec="chon-nguoi"
              data-id="${esc(n.id)}" data-ten="${esc(n.ho_ten || '')}">
        <b>${esc(n.ho_ten || '(chưa có tên)')}</b>
        <span>${esc(n.chuc_danh || n.vi_tri || '')}</span>
      </button>`).join('');
  }

  async function napNguoi() {
    if (!timNguoi) { loiNguoi = 'màn này chưa được nối danh sách nhân sự'; ve(); return; }
    dsNguoi = null; loiNguoi = null; ve();
    try {
      const ds = await timNguoi();
      dsNguoi = (Array.isArray(ds) ? ds : []).filter(n => n && n.id);
    } catch (e) {
      loiNguoi = e.message || 'không rõ lý do';
    }
    ve();
  }

  function veTrang() {
    const tongNen = hs.trang.reduce((a, x) => a + x.co_nen, 0);
    const tongGoc = hs.trang.reduce((a, x) => a + (x.co_goc || 0), 0);
    return `
      <div class="tlq-than">
        ${nhapKhongLuuDuoc ? `<p class="tlq-canh">Máy không lưu được bản nháp (hết chỗ hoặc chế độ ẩn danh).
          <b>Đừng đóng trang này</b> cho tới khi lưu xong.</p>` : ''}
        <div class="tlq-dsdanh">
          ${hs.trang.map((tr, i) => `
            <div class="tlq-the">
              <img src="${tr.anh}" alt="Trang ${i + 1}" loading="lazy">
              <div class="tlq-the-tin">
                <b>Trang ${i + 1}</b>
                <span>${coDoc(tr.co_goc || 0)} → <b>${coDoc(tr.co_nen)}</b></span>
              </div>
              <div class="tlq-the-nut">
                <button type="button" class="tlq-nut-phu" data-viec="chup-lai" data-i="${i}">Chụp lại</button>
                <button type="button" class="tlq-nut-phu" data-viec="xoa-trang" data-i="${i}">Xoá</button>
              </div>
            </div>`).join('')}
        </div>
        ${hs.trang.length ? `<p class="tlq-do">
          ${hs.trang.length} trang · gốc ${coDoc(tongGoc)} → sau nén <b>${coDoc(tongNen)}</b>
          (nhẹ đi ${tongGoc ? Math.round((1 - tongNen / tongGoc) * 100) : 0}%)</p>` : ''}
        <button type="button" class="tlq-nut-chinh" data-viec="chup-tiep">
          📷 ${hs.trang.length ? 'Chụp trang tiếp' : 'Chụp trang đầu'}
        </button>
        ${hs.trang.length ? `
          <button type="button" class="tlq-nut-nhi" data-viec="sang-thong-tin">
            Xong ${hs.trang.length} trang — nhập thông tin →
          </button>` : ''}
      </div>`;
  }

  function veThongTin() {
    const n = nhomDangChon();
    return `
      <div class="tlq-than">
        <form class="tlq-form" id="tlqForm">
          <label class="tlq-nhan">Tên tài liệu <i>*</i></label>
          <input class="tlq-o" id="tlqTieuDe" data-tu-focus maxlength="200" required
                 value="${esc(hs.tieuDe)}" placeholder="VD: Giấy chứng nhận ATTP nhà xưởng">

          <label class="tlq-nhan">Loại giấy</label>
          ${dsLoaiGoiY.length ? `
            <div class="tlq-chip">
              ${dsLoaiGoiY.map(l => `
                <button type="button" class="tlq-nut-phu${hs.loai === l.ten ? ' chon' : ''}"
                        data-viec="loai" data-ten="${esc(l.ten)}"
                        data-so="${esc(l.goi_y_so || '')}">${esc(l.ten)}</button>`).join('')}
            </div>` : ''}
          <input class="tlq-o" id="tlqLoai" maxlength="120" value="${esc(hs.loai)}"
                 placeholder="${esc((n && n.vi_du ? n.vi_du.split(',')[0] : '') || 'VD: Hợp đồng')}">
          ${dsLoaiGoiY.length ? `<p class="tlq-huong">Bấm một loại ở trên, hoặc gõ tay —
            danh sách này là <b>gợi ý</b>, không phải danh sách đóng.</p>` : ''}

          <label class="tlq-nhan">Số hiệu</label>
          <input class="tlq-o" id="tlqSoHieu" maxlength="120" value="${esc(hs.soHieu)}"
                 placeholder="${esc(goiYSoHieu())}">
          ${laCCCD(hs.loai) ? `<p class="tlq-huong"><b>Số CCCD phải đủ 12 chữ số.</b>
            CCCD Việt Nam mẫu từ 2021 luôn 12 chữ số — thiếu một chữ là hồ sơ lao động
            mang số sai. Máy chủ chặn, không phải nhắc suông.</p>` : ''}

          <label class="tlq-nhan">Ngày ban hành</label>
          <input class="tlq-o" id="tlqBanHanh" type="date" value="${esc(hs.ngayBanHanh)}">

          <label class="tlq-nhan">Ngày hết hạn</label>
          <input class="tlq-o" id="tlqHetHan" type="date" value="${esc(hs.ngayHetHan)}">
          <div class="tlq-chip">
            <button type="button" class="tlq-nut-phu" data-viec="han" data-nam="1">+1 năm</button>
            <button type="button" class="tlq-nut-phu" data-viec="han" data-nam="2">+2 năm</button>
            <button type="button" class="tlq-nut-phu" data-viec="han" data-nam="3">+3 năm</button>
            <button type="button" class="tlq-nut-phu" data-viec="han" data-nam="0">Không hết hạn</button>
          </div>
          <p class="tlq-huong">Nhập hạn <b>ngay bây giờ</b>. Giấy hết hạn có thể bị khoá gian hàng —
            ERP sẽ nhắc trước 30 ngày, 7 ngày và đúng hôm hết hạn.</p>

          ${n && n.nhay_cam ? `
            <div class="tlq-dongy">
              <b>Giấy tờ cá nhân — bắt buộc ghi nhận đồng ý</b>
              <p>Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và NĐ 356/2025, hiệu lực 01/01/2026.</p>
              <label class="tlq-nhan">Ai đồng ý cho lưu <i>*</i></label>
              <input class="tlq-o" id="tlqDongYBoi" maxlength="200" value="${esc(hs.dongYBoi)}"
                     placeholder="Họ tên người có giấy tờ">
              <label class="tlq-nhan">Đồng ý cho mục đích gì <i>*</i></label>
              <input class="tlq-o" id="tlqMucDich" maxlength="300" value="${esc(hs.dongYMucDich)}"
                     placeholder="VD: quản lý hồ sơ lao động, đóng BHXH">
            </div>` : ''}

          ${loiGui ? `<p class="tlq-loi">${esc(loiGui)}
            <br><b>Ảnh vẫn còn trong máy</b> — bấm Gửi lại khi có sóng.</p>` : ''}

          <button type="submit" class="tlq-nut-chinh" ${dangGui ? 'disabled' : ''}>
            ${dangGui ? 'Đang gửi…' : (loiGui ? '↻ Gửi lại' : `💾 Lưu ${hs.trang.length} trang vào kho`)}
          </button>
          <button type="button" class="tlq-nut-nhi" data-viec="ve-trang" ${dangGui ? 'disabled' : ''}>
            ← Quay lại xem ${hs.trang.length} trang
          </button>
        </form>
      </div>`;
  }

  /* ======================================================================
     5. Sự kiện
     ====================================================================== */
  function noiSuKien() {
    tam.querySelectorAll('[data-viec]').forEach(el => {
      el.addEventListener('click', () => {
        const v = el.dataset.viec;
        if (v === 'dong') return hoiThoat();
        if (v === 'chon-nhom') {
          hs.nhom = el.dataset.ma;
          hs.ganId = ''; hs.ganTen = '';     // đổi nhóm là bỏ người đã chọn
          luuNhap();
          /* Nhóm Nhân sự ở cửa kho chung: chọn NGƯỜI trước rồi mới mở máy ảnh
             (REV-0046 #2). Nhóm khác thì máy ảnh bật luôn như cũ. */
          if (canChonNguoi()) { manHinh = 'chon-nguoi'; napNguoi(); return; }
          manHinh = 'trang';
          ve();
          moMayAnh(-1);                      // chọn nhóm xong máy ảnh bật LUÔN
          return;
        }
        if (v === 'chon-nguoi') {
          hs.ganId = el.dataset.id || '';
          hs.ganTen = el.dataset.ten || '';
          /* Giấy của ai thì người đó là người đồng ý — điền sẵn ĐÚNG một ô, y
             như cửa hồ sơ đang làm. "Đồng ý cho mục đích gì" vẫn phải gõ tay. */
          if (!hs.dongYBoi) hs.dongYBoi = hs.ganTen;
          if (!hs.tieuDe && hs.ganTen) hs.tieuDe = hs.ganTen + ' — ';
          luuNhap();
          manHinh = 'trang';
          ve();
          if (!hs.trang.length) moMayAnh(-1);
          return;
        }
        if (v === 'tai-lai-nguoi') { napNguoi(); return; }
        if (v === 'doi-nhom') { manHinh = 'chon-nhom'; ve(); return; }
        if (v === 'chup-tiep') return moMayAnh(-1);
        if (v === 'chup-lai') return moMayAnh(parseInt(el.dataset.i, 10));
        if (v === 'xoa-trang') {
          const i = parseInt(el.dataset.i, 10);
          if (!confirm(`Xoá trang ${i + 1}?`)) return;
          hs.trang.splice(i, 1);
          luuNhap(); ve(); return;
        }
        if (v === 'sang-thong-tin') { thu(); manHinh = 'thong-tin'; loiGui = null; ve(); return; }
        if (v === 've-trang') { thu(); manHinh = 'trang'; ve(); return; }
        if (v === 'han') {
          const nam = parseInt(el.dataset.nam, 10);
          const o = tam.querySelector('#tlqHetHan');
          if (o) o.value = nam ? congNam(nam) : '';
          return;
        }
        /* Chip loại giấy: THU trước rồi mới vẽ lại — không thu là tiêu đề và
           số hiệu người ta vừa gõ bay sạch chỉ vì bấm một cái chip. */
        if (v === 'loai') {
          thu();
          hs.loai = el.dataset.ten || '';
          luuNhap();
          ve();
          return;
        }
      });
    });

    const form = tam.querySelector('#tlqForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); gui(); });

    /* Ô lọc tên: vẽ lại RIÊNG danh sách, không vẽ lại cả màn — vẽ cả màn là
       ô nhập bị dựng lại và mất con trỏ sau mỗi chữ. */
    const oTim = tam.querySelector('#tlqTimNguoi');
    if (oTim) oTim.addEventListener('input', () => {
      const o = tam.querySelector('#tlqDsNguoi');
      if (!o) return;
      o.innerHTML = veODsNguoi(oTim.value);
      o.querySelectorAll('[data-viec="chon-nguoi"]').forEach(b => b.addEventListener('click', () => {
        hs.ganId = b.dataset.id || '';
        hs.ganTen = b.dataset.ten || '';
        if (!hs.dongYBoi) hs.dongYBoi = hs.ganTen;
        if (!hs.tieuDe && hs.ganTen) hs.tieuDe = hs.ganTen + ' — ';
        luuNhap();
        manHinh = 'trang';
        ve();
        if (!hs.trang.length) moMayAnh(-1);
      }));
    });
  }

  /** Thu các ô đang gõ dở về `hs` — không thu là chuyển màn một cái mất sạch. */
  function thu() {
    const lay = (id) => tam.querySelector('#' + id)?.value?.trim() ?? null;
    if (tam.querySelector('#tlqTieuDe') != null) {
      hs.tieuDe = lay('tlqTieuDe') || '';
      hs.loai = lay('tlqLoai') || '';
      hs.soHieu = lay('tlqSoHieu') || '';
      hs.ngayBanHanh = lay('tlqBanHanh') || '';
      hs.ngayHetHan = lay('tlqHetHan') || '';
      hs.dongYBoi = lay('tlqDongYBoi') || '';
      hs.dongYMucDich = lay('tlqMucDich') || '';
      luuNhap();
    }
  }

  /* ======================================================================
     6. Gửi
     ====================================================================== */
  async function gui() {
    /* CHỐT ĐẦU HÀM — REV-0036 lỗi #4. Nút có `disabled` khi đang gửi, nhưng
       `disabled` chỉ chặn con chuột: phím Enter trong ô nhập, hay `form.submit`
       gọi lại lúc màn hình đang vẽ dở, vẫn lọt vào đây. Hai lượt gửi chồng nhau
       là hai file trên Drive (một mồ côi) + một lỗi UNIQUE. Chặn ở chỗ RẺ nhất
       trước; máy chủ vẫn có lưới thứ hai cho ca hai tab. */
    if (dangGui) return;
    thu();
    if (!hs.tieuDe || hs.tieuDe.length < 3) { alert('Đặt tên cho tài liệu đã nhé.'); return; }
    if (!hs.trang.length) { alert('Chưa có trang nào.'); return; }
    /* Bản nháp cũ (lưu trước bản vá REV-0046 #2) có thể đã có đủ trang mà chưa
       có người. Máy chủ chặn thật; ở đây đưa người ta về đúng màn để chọn, chứ
       đừng để họ bấm Lưu rồi ăn một câu lỗi. */
    if (canChonNguoi()) { manHinh = 'chon-nguoi'; napNguoi(); return; }
    const n = nhomDangChon();
    if (n && n.nhay_cam && (!hs.dongYBoi || !hs.dongYMucDich)) {
      alert('Giấy tờ cá nhân: phải ghi rõ AI đồng ý và đồng ý cho MỤC ĐÍCH GÌ.');
      return;
    }
    if (hs.ngayHetHan && hs.ngayHetHan < homNayVN() &&
        !confirm('Ngày hết hạn đã qua. Vẫn lưu?')) return;

    dangGui = true; loiGui = null; ve();
    try {
      /* ① Gộp N trang thành MỘT file PDF — ngay tại máy, không nhờ máy chủ. */
      const pdf = gopTrangThanhPDF(hs.trang.map(x => dataUrlThanhByte(x.anh)), { tieuDe: hs.tieuDe });

      /* ② Ảnh cho AI bóc chữ: thu nhỏ thêm một nấc, tối đa 3 trang đầu. AI
         đọc ảnh không cần nét bằng mắt người, mà ảnh nhỏ thì gọi nhanh hơn
         nhiều và không tốn thêm đồng nào (Workers AI đã có sẵn). */
      const anhBocChu = [];
      for (let i = 0; i < Math.min(hs.trang.length, TRAN_TRANG_BOC_CHU); i++) {
        const tep = dataUrlThanhTep(hs.trang[i].anh, `trang-${i + 1}.jpg`);
        anhBocChu.push(await nenAnhChung(tep, ANH_BOC_CHU));
      }

      const t0 = performance.now();
      const kq = await API.tlLuu({
        ma_gui: hs.maGui,                    // GIỮ NGUYÊN qua mọi lần gửi lại
        cua_vao: cuaVao,
        /* Cửa hồ sơ đã có `ganId`; cửa kho chung lấy người vừa chọn ở màn
           `chon-nguoi` (REV-0046 #2). Máy chủ ghi `cua_vao='nhan_su'` cho mọi
           giấy nhóm nhân sự, nên hai đường về cùng MỘT dạng dòng. */
        gan_id: ganId || hs.ganId || null,
        nhom: hs.nhom,
        tieu_de: hs.tieuDe,
        loai: hs.loai || null,
        so_hieu: hs.soHieu || null,
        ngay_ban_hanh: hs.ngayBanHanh || null,
        ngay_het_han: hs.ngayHetHan || null,
        so_trang: hs.trang.length,
        tep: byteThanhBase64(pdf),
        anh_boc_chu: anhBocChu,
        dong_y_boi: hs.dongYBoi || null,
        dong_y_muc_dich: hs.dongYMucDich || null
      });
      const msGui = Math.round(performance.now() - t0);

      xoaNhap(cuaVao, ganId);
      dong();
      if (typeof t.khiXong === 'function') {
        t.khiXong({ ...kq, so_trang: hs.trang.length, co_byte_pdf: pdf.length, ms_gui: msGui });
      }
    } catch (e) {
      /* KHÔNG xoá bản nháp. Đây chính là chỗ ràng buộc "sóng yếu gửi hụt phải
         gửi lại được" sống hay chết. */
      dangGui = false;
      loiGui = e.message || 'Không gửi được';
      manHinh = 'thong-tin';
      ve();
    }
  }

  ve();
  /* Cửa một-nhóm (hồ sơ nhân sự): mở máy ảnh LUÔN, đúng tinh thần "chọn xong
     máy ảnh bật luôn, không tốn thêm một cú chạm nào" (CTL-0025 Mục 3 ④). Chỉ
     làm khi chưa có trang nào — đang mở lại bộ quét dở mà máy ảnh tự bật là
     cướp mất màn xem lại. */
  if (boQuaChonNhom && !hs.trang.length && hs.nhom) moMayAnh(-1);
  /* Đang có bản nháp dở thì nói ngay, đừng để người ta tưởng mất ảnh. */
  if (hs.trang.length) {
    setTimeout(() => {
      const o = tam.querySelector('.tlq-than');
      if (!o) return;
      const p = document.createElement('p');
      p.className = 'tlq-canh';
      p.textContent = `Đang mở lại bộ quét dở: ${hs.trang.length} trang vẫn còn trong máy.`;
      o.prepend(p);
    }, 0);
  }

  return { dong };
}
