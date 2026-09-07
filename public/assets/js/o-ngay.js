/* ==========================================================================
   Ô NHẬP NGÀY DÙNG CHUNG — một chỗ cho MỌI ô ngày trong ERP
   ---------------------------------------------------------------------------
   GỐC: góp ý GY-0004 của Sếp Ngọc — *"nhập năm sinh ko đc"*, muốn *"nhập đc
   dễ dàng"*. Tái hiện trong Chrome thật (`scripts/do-o-ngay.mjs`) ra BA thứ
   hỏng, và cả ba đều KHÔNG chỉ nằm ở ô ngày sinh — đó là lớp vấn đề:

   ① NĂM MỘT CHỮ SỐ LÀ MỘT GIÁ TRỊ "HỢP LỆ".
      `<input type="date">` của Chrome đặt xong ngày + tháng thì vừa gõ chữ
      số ĐẦU TIÊN của năm là `value` đã thành `0001-01-01` và bắn `change`.
      Ô ngày sinh nghe `change` rồi `disabled = true` để gọi máy chủ ⇒ ô mất
      tiêu điểm ngay giữa lúc đang gõ, ba chữ số còn lại của "1990" rơi ra
      ngoài, và máy chủ trả về "Năm sinh không hợp lý". Đúng câu Sếp báo.
   ② KHÔNG DÁN ĐƯỢC. Dán "01/01/1990" vào ô ngày: Chrome bỏ qua im lặng.
   ③ THỨ TỰ Ô KHÔNG DO ERP QUYẾT. Chrome dựng ngày/tháng theo NGÔN NGỮ GIAO
      DIỆN CỦA TRÌNH DUYỆT, không theo `<html lang="vi-VN">` (đã đo: đặt
      `lang` ở cả ô lẫn thẻ `<html>` đều KHÔNG đổi thứ tự). Máy để tiếng Anh
      thì ô đầu là THÁNG: gõ 25/01/1990 ra `11990-02-05` — sai mà trông như
      đã điền xong. Người dùng không có cách nào biết máy mình đang ở thứ tự
      nào, vì ô rỗng không hiện chữ gợi ý nào cả.

   FILE NÀY CHỮA CẢ LỚP, MỘT CHỖ:
     · đặt `min`/`max` hợp lý cho từng loại ô ⇒ `0001-01-01` thành SAI THẤY
       ĐƯỢC, và bảng lịch mở ra đúng vùng năm cần chọn;
     · cho DÁN mọi kiểu người Việt hay viết: 25/01/1990 · 25-01-1990 ·
       25.1.1990 · 1990-01-25 · 25011990 · 19900125;
     · nói ra THỨ TỰ THẬT mà trình duyệt này đang đòi, ngay lúc bấm vào ô;
     · câu sai bằng tiếng người, ngay dưới ô, thay vì im lặng.

   KHÔNG đổi `id`, KHÔNG đổi `type`, KHÔNG đổi `value` (vẫn là YYYY-MM-DD).
   Mọi đoạn mã đang đọc `.value` của các ô này chạy y như cũ.
   ========================================================================== */

/* Hôm nay theo giờ VN — máy chủ cũng tính bằng `+7 hours`, hai bên phải
   khớp, nếu không thì ô "không được quá hôm nay" lệch một ngày lúc nửa đêm. */
function homNayVN() {
  const t = new Date(Date.now() + 7 * 3600 * 1000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** Ngày có thật không (chặn 31/02, 29/02 năm không nhuận…). */
export function ngayCoThat(y, m, d) {
  if (!(y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * Đọc một chuỗi người ta gõ/dán ra `YYYY-MM-DD`, hoặc `null` nếu không hiểu.
 * QUY ƯỚC: khi chuỗi mơ hồ (03/04/2026) thì đọc theo lối VIỆT — NGÀY trước,
 * THÁNG sau. Đây là chỗ ERP tự quyết được, khác hẳn ô gõ tay của Chrome.
 */
export function docNgay(chuoi) {
  const s = String(chuoi == null ? '' : chuoi).trim();
  if (!s) return null;

  // 1990-01-25 (ISO, có thể kèm giờ) — năm đứng đầu thì không mơ hồ.
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const [, y, th, ng] = m.map(Number);
    return ngayCoThat(y, th, ng) ? `${y}-${String(th).padStart(2, '0')}-${String(ng).padStart(2, '0')}` : null;
  }

  // 25/01/1990 · 25-1-1990 · 25.01.1990 — ngày trước, tháng sau.
  m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (m) {
    const ng = +m[1], th = +m[2], y = +m[3];
    return ngayCoThat(y, th, ng) ? `${y}-${String(th).padStart(2, '0')}-${String(ng).padStart(2, '0')}` : null;
  }

  // 25011990 (tám chữ số liền, ngày-tháng-năm) hoặc 19900125 (năm trước).
  // Dùng `substring` chứ không `slice`: đây là CẮT CHUỖI, không phải cắt bớt
  // một danh sách — `do-cat-im-lang` canh `.slice(0, N)` và báo oan ở đây thì
  // lần sau người ta tắt máy quét đi, nguy hiểm ngang với để lọt.
  m = s.match(/^(\d{8})$/);
  if (m) {
    const t = m[1];
    const ng1 = t.substring(0, 2), th1 = t.substring(2, 4), y1 = +t.substring(4);
    if (ngayCoThat(y1, +th1, +ng1)) return `${y1}-${th1}-${ng1}`;
    const y2 = +t.substring(0, 4), th2 = t.substring(4, 6), ng2 = t.substring(6);
    if (ngayCoThat(y2, +th2, +ng2)) return `${y2}-${th2}-${ng2}`;
  }
  return null;
}

/* ---- THỨ TỰ Ô MÀ TRÌNH DUYỆT NÀY ĐANG ĐÒI ------------------------------
   Chrome dựng ô ngày theo ngôn ngữ giao diện của chính nó. `Intl` đọc cùng
   một nguồn đó, nên thứ tự nó trả về khớp với thứ tự các ô con. Máy nào lạ
   quá thì rơi về câu chung, KHÔNG đoán bừa "ngày/tháng/năm" — đoán sai ở
   đây là dạy người ta gõ sai. */
export function thuTuONgay() {
  try {
    const phan = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(2026, 0, 25))
      .filter(p => p.type === 'day' || p.type === 'month' || p.type === 'year')
      .map(p => p.type);
    const ten = { day: 'ngày', month: 'tháng', year: 'năm' };
    if (phan.length === 3) return phan.map(p => ten[p]).join(' / ');
  } catch { /* rơi xuống dưới */ }
  return null;
}

/* ---- KHOẢNG NĂM CHO TỪNG LOẠI Ô ----------------------------------------
   Khai bằng `data-ngay-kieu` ngay trên thẻ `<input>`. Không khai thì vẫn
   được chặn ở khoảng rộng 1900–2100 — đủ để `0001` không bao giờ lọt. */
export function khoangCuaKieu(kieu) {
  const homNay = homNayVN();
  const nam = +homNay.slice(0, 4);
  if (kieu === 'ngay-sinh') {
    // Khớp ĐÚNG chốt của máy chủ (`nsNgaySinhLuu`): 1930 … năm nay − 14.
    return { min: '1930-01-01', max: `${nam - 14}-12-31`,
             chu: 'từ năm 1930 đến năm ' + (nam - 14) };
  }
  if (kieu === 'qua-khu') return { min: '1990-01-01', max: homNay, chu: 'không quá hôm nay' };
  return { min: '1900-01-01', max: '2100-12-31', chu: 'từ năm 1900 đến năm 2100' };
}

/** Câu sai bằng tiếng người cho một ô ngày. `null` = không sai. */
export function cauSaiONgay(o) {
  if (!o.value) return o.validity && o.validity.badInput ? 'Ngày này chưa điền đủ ba ô ngày / tháng / năm.' : null;
  const v = o.validity || {};
  const kh = khoangCuaKieu(o.dataset.ngayKieu || '');
  if (v.rangeUnderflow || v.rangeOverflow) {
    return o.dataset.ngayKieu === 'ngay-sinh'
      ? `Năm sinh phải ${kh.chu} — kiểm lại giúp tôi.`
      : `Ngày phải ${kh.chu} — kiểm lại giúp tôi.`;
  }
  if (v.badInput) return 'Ngày này chưa điền đủ ba ô ngày / tháng / năm.';
  return null;
}

/* ---- NÂNG CẤP MỘT Ô ----------------------------------------------------- */
function nangCapMot(o) {
  if (o.dataset.ngayDaNang === '1') return;
  o.dataset.ngayDaNang = '1';

  const kh = khoangCuaKieu(o.dataset.ngayKieu || '');
  // Không đè lên min/max ai đó đã cố ý đặt tay trong HTML.
  if (!o.min) o.min = kh.min;
  if (!o.max) o.max = kh.max;

  const thuTu = thuTuONgay();
  const cauGoiY = (thuTu ? `Thứ tự trên máy này: ${thuTu}. ` : '') +
                  `Dán được: 25/01/1990 · 1990-01-25 · 25011990. Nhận ${kh.chu}.`;
  o.title = cauGoiY;

  /* Dòng gợi ý + dòng báo sai nằm CHUNG một ô, và MẶC ĐỊNH ẨN — hiện lúc
     bấm vào ô, hoặc lúc đang sai. Hiện sẵn cho cả 15 ô là đẩy mọi form dài
     thêm 15 dòng, phá đúng luật "vừa một màn" Sếp đã nhắc hai lần. */
  const nhac = document.createElement('div');
  nhac.className = 'o-ngay-nhac';
  nhac.hidden = true;
  o.insertAdjacentElement('afterend', nhac);

  const veNhac = (dangBam) => {
    const sai = cauSaiONgay(o);
    if (sai) {
      nhac.textContent = sai;
      nhac.classList.add('sai');
      nhac.hidden = false;
      o.classList.add('o-ngay-sai');
      return;
    }
    o.classList.remove('o-ngay-sai');
    nhac.classList.remove('sai');
    nhac.textContent = cauGoiY;
    nhac.hidden = !dangBam;
  };

  o.addEventListener('focus', () => veNhac(true));
  o.addEventListener('blur', () => veNhac(false));
  o.addEventListener('input', () => veNhac(document.activeElement === o));

  /* DÁN. `paste` CÓ bắn trên `<input type="date">` và huỷ được — đã đo. */
  o.addEventListener('paste', (e) => {
    const chu = e.clipboardData && e.clipboardData.getData('text');
    const iso = docNgay(chu);
    e.preventDefault();          // Chrome sẽ bỏ qua chuỗi này, chặn luôn cho gọn
    if (!iso) {
      nhac.textContent = `Không đọc được "${String(chu || '').trim().slice(0, 30)}" thành một ngày. ` + cauGoiY;
      nhac.classList.add('sai');
      nhac.hidden = false;
      return;
    }
    o.value = iso;
    o.dispatchEvent(new Event('input', { bubbles: true }));
    o.dispatchEvent(new Event('change', { bubbles: true }));
    veNhac(document.activeElement === o);
  });
}

/** Nâng cấp mọi ô ngày đang có trong `goc`. Trả về SỐ ô vừa nâng. */
export function nangCapONgay(goc) {
  const g = goc || document;
  let n = 0;
  for (const o of g.querySelectorAll('input[type="date"]')) {
    if (o.dataset.ngayDaNang === '1') continue;
    nangCapMot(o); n++;
  }
  return n;
}

/* Ô ngày sinh ra sau (Kho tài liệu dựng bằng chuỗi HTML, hộp sửa vẽ lại…)
   cũng phải được nâng — nếu không thì lớp vá này chỉ đúng với những ô có
   sẵn lúc mở trang, và lỗi cũ quay lại qua đúng cái cửa hậu đó. */
export function theoDoiONgay() {
  nangCapONgay(document);
  const soi = new MutationObserver((ds) => {
    for (const m of ds) {
      for (const nut of m.addedNodes) {
        if (nut.nodeType !== 1) continue;
        if (nut.matches && nut.matches('input[type="date"]')) nangCapMot(nut);
        else if (nut.querySelectorAll) nangCapONgay(nut);
      }
    }
  });
  soi.observe(document.body, { childList: true, subtree: true });
  return soi;
}
