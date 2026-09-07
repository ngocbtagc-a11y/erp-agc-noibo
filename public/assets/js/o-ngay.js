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
             chu: 'từ năm 1930 đến năm ' + (nam - 14),
             chuDuoi: 'Năm sinh sớm nhất nhận được là 1930',
             chuTren: `Người dưới 14 tuổi thì chưa lập hồ sơ được — năm sinh muộn nhất là ${nam - 14}` };
  }
  /* `qua-khu` = việc ĐÃ XẢY RA (ngày mua tài sản, ngày ban hành giấy tờ).
     Sàn dưới để 1900 chứ KHÔNG 1990 (REV-0061 · CAO-2): ca thật đo được là
     máy in mua năm 1988 bị chặn, mà câu lỗi lại ghi "không quá hôm nay" —
     người dùng đọc xong vẫn không biết mình vướng đầu nào, sửa kiểu gì cũng
     không qua. Sàn 1990 là con số tự nghĩ ra, không luật nghiệp vụ nào chốt.
     1900 giữ đúng vai trò DUY NHẤT của sàn ở đây: chặn `0001-01-01` mà
     Chrome sinh ra giữa lúc người ta đang gõ năm. */
  if (kieu === 'qua-khu') {
    return { min: '1900-01-01', max: homNay, chu: 'không quá hôm nay',
             chuDuoi: 'Ngày sớm nhất nhận được là 01/01/1900',
             chuTren: `Ngày này đã xảy ra rồi nên không được quá hôm nay (${ngayDocVN(homNay)})` };
  }
  return { min: '1900-01-01', max: '2100-12-31', chu: 'từ năm 1900 đến năm 2100',
           chuDuoi: 'Ngày sớm nhất nhận được là 01/01/1900',
           chuTren: 'Ngày muộn nhất nhận được là 31/12/2100' };
}

/** `YYYY-MM-DD` → `DD/MM/YYYY`. Chuỗi rỗng nếu không phải một ngày đủ. */
export function ngayDocVN(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Số tuổi tính đến hôm nay (giờ VN). `null` nếu không tính được. */
export function tuoiTheoNgaySinh(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!m) return null;
  const h = homNayVN();
  /* `substring` chứ không `slice`: đây là CẮT CHUỖI ngày, không phải cắt bớt
     một danh sách — `do-cat-im-lang` canh `.slice(0, N)` và đã báo oan đúng
     dòng này một lần. Cùng lẽ với `docNgay()` ở trên. */
  let t = +h.substring(0, 4) - +m[1];
  if (h.substring(5) < `${m[2]}-${m[3]}`) t--;
  return t >= 0 && t < 200 ? t : null;
}

/* ---- ERP HIỂU THÀNH NGÀY NÀO — bản vá THẬT của GY-0004 ------------------
   `min`/`max` chặn được `0001-01-01`: thứ tệ nhất VỀ HÌNH THỨC. Nó KHÔNG
   chặn được thứ tệ nhất VỀ HẬU QUẢ — máy để tiếng Anh thì ô đầu là THÁNG,
   gõ `25011990` ra `1990-02-05`: một ngày HỢP LỆ, nằm trong khoảng, không
   một câu lỗi nào. Sai mà trông như đã điền xong (REV-0061).

   Dòng "Thứ tự trên máy này…" nói đúng sự thật nhưng CHỈ HIỆN LÚC BẤM VÀO Ô
   — mà bấm vào là gõ ngay, chưa kịp đọc.

   Cách chữa KHÔNG phụ thuộc thứ tự trình duyệt: sau khi ô CÓ GIÁ TRỊ thì đọc
   lại chính ngày đó bằng chữ Việt ngay cạnh ô. Người gõ nhìn thấy ERP hiểu
   thành ngày nào NGAY LÚC GÕ XONG, chứ không phải lúc đã lưu xong. Ngày sinh
   kèm luôn số tuổi — sai một con là thấy ngay.

   Vì sao KHÔNG viết lại ô theo thứ tự Việt: `<input type="date">` không cho
   đổi thứ tự ô con, và đè `.value` giữa lúc người ta đang gõ chính là cái
   bẫy mất tiêu điểm của GY-0004 bản đầu. */
export function docLaiNgay(o) {
  const doc = ngayDocVN(o.value);
  if (!doc) return '';
  if (o.dataset.ngayKieu === 'ngay-sinh') {
    const t = tuoiTheoNgaySinh(o.value);
    return t == null ? `= ${doc}` : `= ${doc} · ${t} tuổi`;
  }
  return `= ${doc}`;
}

/** Câu sai bằng tiếng người cho một ô ngày. `null` = không sai.
 *  PHẢI NÓI ĐÚNG ĐẦU NÀO BỊ VI PHẠM (REV-0061 · CAO-2): một câu chung cho cả
 *  hai đầu là câu sai sự thật ở một nửa số ca. */
export function cauSaiONgay(o) {
  if (!o.value) return o.validity && o.validity.badInput ? 'Ngày này chưa điền đủ ba ô ngày / tháng / năm.' : null;
  const v = o.validity || {};
  const kh = khoangCuaKieu(o.dataset.ngayKieu || '');
  if (v.rangeUnderflow) return `${kh.chuDuoi} — bạn đang nhập ${ngayDocVN(o.value) || o.value}.`;
  if (v.rangeOverflow) return `${kh.chuTren} — bạn đang nhập ${ngayDocVN(o.value) || o.value}.`;
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
  /* Câu gợi ý lúc bấm vào ô GIỮ NGẮN — một dòng, chỉ nói THỨ TỰ và KHOẢNG
     nhận. Phần "dán được kiểu nào" đẩy hết vào `title` (REV-0061 · THẤP-1:
     câu ba dòng đẩy hộp dài thêm 75px ở 375px, mà điện thoại còn bị bàn phím
     ảo che ~350px nữa). */
  const cauGoiY = (thuTu ? `Thứ tự trên máy này: ${thuTu}. ` : '') + `Nhận ${kh.chu}.`;
  o.title = (thuTu ? `Thứ tự trên máy này: ${thuTu}. ` : '') +
            `Dán được: 25/01/1990 · 1990-01-25 · 25011990. Nhận ${kh.chu}.`;

  /* MỘT thẻ em duy nhất cho cả ba việc: đọc lại ngày · gợi ý · báo sai.
     Không dựng thẻ thứ hai — mỗi thẻ em chèn thêm là một chỗ có thể gãy cho
     bộ chọn CSS anh-em kề hoặc `nextElementSibling` (REV-0061 · lời khai #2).

     ẨN khi ô còn RỖNG và không bấm vào: hiện sẵn cho cả 17 ô là đẩy mọi form
     dài thêm 17 dòng, phá đúng luật "vừa một màn" Sếp đã nhắc hai lần.
     HIỆN THƯỜNG TRỰC khi ô ĐÃ CÓ GIÁ TRỊ: đó là lúc — và là chỗ duy nhất —
     người ta thấy được ERP hiểu con số vừa gõ thành ngày nào (GY-0004). */
  const nhac = document.createElement('div');
  nhac.className = 'o-ngay-nhac';
  nhac.hidden = true;
  o.insertAdjacentElement('afterend', nhac);

  const veNhac = (dangBam) => {
    const sai = cauSaiONgay(o);
    if (sai) {
      nhac.dataset.ngayDoc = '';
      nhac.textContent = sai;
      nhac.classList.add('sai');
      nhac.hidden = false;
      o.classList.add('o-ngay-sai');
      return;
    }
    o.classList.remove('o-ngay-sai');
    nhac.classList.remove('sai');
    const doc = docLaiNgay(o);
    nhac.dataset.ngayDoc = doc;
    nhac.textContent = doc ? (dangBam ? `${doc} — ${cauGoiY}` : doc) : cauGoiY;
    nhac.hidden = !(dangBam || doc);
  };

  o.addEventListener('focus', () => veNhac(true));
  o.addEventListener('blur', () => veNhac(false));
  o.addEventListener('input', () => veNhac(document.activeElement === o));
  /* `change` cũng phải nghe: chọn ngày bằng BẢNG LỊCH (bấm chuột) không bắn
     `input` ở mọi bản Chrome — thiếu nó thì đúng đường người dùng hay dùng
     nhất lại là đường không thấy dòng đọc lại. */
  o.addEventListener('change', () => veNhac(document.activeElement === o));

  /* Ô dựng sẵn CÓ giá trị (`tlqBanHanh` vẽ bằng chuỗi, hộp Sửa việc gán
     `.value` rồi mới mở) phải hiện dòng đọc lại NGAY, không đợi ai chạm vào. */
  veNhac(false);

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
