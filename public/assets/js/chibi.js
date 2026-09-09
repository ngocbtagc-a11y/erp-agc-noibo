/* ==========================================================================
   CHIBI — vẽ nhân vật bằng SVG ngay trong trình duyệt
   ---------------------------------------------------------------------------
   Không dùng file ảnh: mỗi nhân vật là mấy chục dòng hình học, nặng chưa tới
   một phần trăm một tấm PNG, phóng to bao nhiêu cũng không vỡ, và đổi màu áo
   chỉ là đổi một biến. Kho ảnh chibi cho 15 nhân sự thì phải thuê người vẽ và
   mỗi lần có người mới lại phải vẽ thêm.

   Người thật thì màu tóc/da/áo sinh ra từ chính tên của họ (xem bam()) — cùng
   một cái tên luôn cho ra cùng một nhân vật, nên hôm nay nhìn thấy chị Lan áo
   xanh thì ngày mai vẫn là chị Lan áo xanh đó.
   ========================================================================== */

/* Bảng màu lấy từ tông Sage của ERP, đủ khác nhau để nhận ra người này với
   người kia từ xa. */
const MAU_AO = ['#9aab86', '#7d8f68', '#8a9a6b', '#8a6a4a', '#6b5138',
                '#c07a5a', '#b8863b', '#a8b892', '#5c6b45', '#5f9e6a'];
const MAU_TOC = ['#2f2a26', '#1f1a17', '#3b2a1e', '#4a3226', '#241d19', '#5a4232'];
const MAU_DA  = ['#f6d5b8', '#f0c9a8', '#eec5a2', '#e8b98d', '#f2d0b0'];

/* Băm tên thành một số ổn định — cùng tên thì cùng nhân vật, không phụ thuộc
   thứ tự hiển thị hay lần tải trang. */
function bam(chuoi) {
  let h = 0;
  const s = String(chuoi || '');
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function chonTu(mang, hat) {
  return mang[hat % mang.length];
}

/* Bộ dạng của một người thật, suy ra từ tên */
export function ngoaiHinhTuTen(hoTen) {
  const h = bam(hoTen);
  return {
    da:  chonTu(MAU_DA,  h),
    toc: chonTu(MAU_TOC, h >> 3),
    ao:  chonTu(MAU_AO,  h >> 7),
    kieu_toc: (h >> 11) % 7,     // xem hàm toc(): 0..6
    gioi_tinh: ((h >> 17) & 1) ? 'nu' : 'nam',
    net_rieng: chonTu(['', 'ca_vat', 'kep_toc', 'hoa_tai', 'khan_quang', 'rau_quai'], h >> 19),
    phu_kien: null
  };
}

/* ---- Các mảnh ghép ------------------------------------------------------ */

function toc(kieu, mau) {
  /* Bảy kiểu tóc, đủ để mười nhân vật đứng cạnh nhau mà nhận ra ngay ai là ai.
     Trước đây chỉ có ba kiểu và tám người dùng chung kiểu 0 — nhìn từ xa thành
     một dãy người giống hệt, chỉ khác màu áo.

     Phần xoã sau lưng phải vẽ TRƯỚC thân thì mới nằm dưới áo.
       0 ngắn        1 dài xoã      2 buộc đuôi ngựa   3 tóc bob
       4 búi cao     5 hói/tóc thưa 6 tóc rối (dev) */
  const sau =
      kieu === 1 ? `<path d="M22 44 Q18 80 26 96 L74 96 Q82 80 78 44 Z" fill="${mau}" opacity=".92"/>`
    : kieu === 2 ? `<path d="M74 40 Q90 54 86 74 Q82 84 74 78 Q82 60 70 46 Z" fill="${mau}"/>`
    : kieu === 3 ? `<path d="M20 44 Q18 66 24 74 L76 74 Q82 66 80 44 Z" fill="${mau}" opacity=".92"/>`
    : '';

  // kiểu 3 — tóc bob: đỉnh tròn, hai bên ôm má, cắt ngang ở cằm
  if (kieu === 3) {
    return { sau, truoc: `<path d="M18 46 Q18 10 50 10 Q82 10 82 46 Q82 34 70 29
                                  Q58 24 42 29 Q28 34 24 44 Q21 48 18 46 Z" fill="${mau}"/>` };
  }

  // kiểu 4 — búi cao: gọn gàng, thêm nút búi trên đỉnh
  if (kieu === 4) {
    return {
      sau: '',
      truoc: `<circle cx="50" cy="11" r="9" fill="${mau}"/>
              <path d="M21 43 Q21 13 50 13 Q79 13 79 43 Q79 33 67 29
                       Q57 25 43 29 Q31 33 27 41 Q24 45 21 43 Z" fill="${mau}"/>`
    };
  }

  // kiểu 5 — tóc thưa hai bên: chỉ còn vành tóc, trán cao
  if (kieu === 5) {
    return {
      sau: '',
      truoc: `<path d="M19 48 Q19 26 30 20 Q28 32 27 44 Q23 46 19 48 Z" fill="${mau}"/>
              <path d="M81 48 Q81 26 70 20 Q72 32 73 44 Q77 46 81 48 Z" fill="${mau}"/>
              <path d="M28 24 Q40 15 50 16 Q62 17 71 23 Q60 19 50 20 Q38 21 28 24 Z"
                    fill="${mau}" opacity=".75"/>`
    };
  }

  // kiểu 6 — tóc rối: mấy chỏm dựng lên, kiểu người ngồi máy quá khuya
  if (kieu === 6) {
    return {
      sau: '',
      truoc: `<path d="M20 44 Q20 14 50 12 Q80 14 80 44 Q80 34 68 30
                       Q58 26 44 30 Q30 34 26 42 Q23 46 20 44 Z" fill="${mau}"/>
              <path d="M32 18 L28 6 L38 14 Z" fill="${mau}"/>
              <path d="M48 14 L47 2 L56 12 Z" fill="${mau}"/>
              <path d="M64 17 L68 6 L70 18 Z" fill="${mau}"/>`
    };
  }

  // kiểu 0, 1, 2 — dùng chung phần trùm đỉnh đầu
  const truoc = `<path d="M20 44 Q20 12 50 12 Q80 12 80 44 Q80 34 68 30
                          Q58 26 44 30 Q30 34 26 42 Q23 46 20 44 Z" fill="${mau}"/>`;
  return { sau, truoc };
}

/* Nét nhận dạng riêng của từng người — thứ khiến "anh Khang có râu quai nón"
   trở thành cách gọi tự nhiên, thay vì "cái anh áo xanh lá". */
function netRieng(loai, mauToc) {
  switch (loai) {
    case 'ca_vat':
      return `<path d="M50 76 L46 80 L50 84 L54 80 Z" fill="#b8484a"/>
              <path d="M50 84 L46.5 100 L50 104 L53.5 100 Z" fill="#b8484a"/>`;
    case 'rau_quai':
      return `<path d="M24 52 Q26 70 38 74 Q50 78 62 74 Q74 70 76 52
                       Q74 66 62 70 Q50 73 38 70 Q26 66 24 52 Z"
                    fill="${mauToc}" opacity=".82"/>`;
    case 'but_sau_tai':
      return `<g transform="rotate(-16 80 44)">
                <rect x="77" y="34" width="4" height="18" rx="1.4" fill="#e0a12c"/>
                <path d="M77 52 L81 52 L79 57 Z" fill="#f0d8a8"/>
                <rect x="77" y="34" width="4" height="3" rx="1" fill="#c98c1f"/>
              </g>`;
    case 'kep_toc':
      return `<g transform="rotate(-18 27 30)">
                <rect x="21" y="27" width="14" height="4.5" rx="2.2" fill="#e8a0a8"/>
                <circle cx="24" cy="29.2" r="2.4" fill="#fff" opacity=".8"/>
              </g>`;
    case 'hoa_tai':
      return `<circle cx="20" cy="58" r="2.8" fill="#e0a12c"/>
              <circle cx="80" cy="58" r="2.8" fill="#e0a12c"/>`;
    case 'khan_quang':
      return `<path d="M28 74 Q50 84 72 74 Q72 82 68 86 Q50 94 32 86 Q28 82 28 74 Z"
                    fill="#c98ca0"/>
              <path d="M66 84 Q74 92 72 102 L64 100 Q66 92 64 86 Z" fill="#b87c90"/>`;
    case 'ao_hoodie':
      return `<path d="M30 84 Q50 96 70 84 Q68 92 60 96 L40 96 Q32 92 30 84 Z"
                    fill="rgba(0,0,0,.14)"/>
              <path d="M46 96 L46 108 M54 96 L54 108" stroke="#f4f2ec"
                    stroke-width="2" stroke-linecap="round"/>`;
    default:
      return '';
  }
}

/* Mắt: con gái thêm hàng mi, con trai lông mày đậm hơn. Chỉ vài nét mà đủ để
   người xem đọc ra ngay, không cần ghi chú giới tính ở đâu cả. */
function netGioiTinh(gioiTinh) {
  return gioiTinh === 'nu'
    ? `<path d="M31.5 43.5 Q38 40 44.5 43.5" stroke="#2b2622" stroke-width="1.6"
             fill="none" stroke-linecap="round"/>
       <path d="M55.5 43.5 Q62 40 68.5 43.5" stroke="#2b2622" stroke-width="1.6"
             fill="none" stroke-linecap="round"/>
       <path d="M32 46 L29.5 43.5 M33.5 44.6 L31.5 41.8" stroke="#2b2622"
             stroke-width="1.5" stroke-linecap="round"/>
       <path d="M68 46 L70.5 43.5 M66.5 44.6 L68.5 41.8" stroke="#2b2622"
             stroke-width="1.5" stroke-linecap="round"/>`
    : `<path d="M31 42.5 Q38 39.5 45 42.5" stroke="#2b2622" stroke-width="2.6"
             fill="none" stroke-linecap="round"/>
       <path d="M55 42.5 Q62 39.5 69 42.5" stroke="#2b2622" stroke-width="2.6"
             fill="none" stroke-linecap="round"/>`;
}

function khuonMat(da) {
  return `
    <ellipse cx="50" cy="46" rx="30" ry="29" fill="${da}"/>
    <ellipse cx="21" cy="50" rx="4" ry="6" fill="${da}"/>
    <ellipse cx="79" cy="50" rx="4" ry="6" fill="${da}"/>`;
}

function net(dangNoi) {
  // Mắt to, cách xa nhau, đốm sáng lệch lên trên — công thức làm nên nét chibi.
  const mieng = dangNoi
    ? `<ellipse cx="50" cy="62" rx="4.5" ry="5" fill="#8a4a42"/>`
    : `<path d="M45 60 Q50 65 55 60" stroke="#8a4a42" stroke-width="2"
             fill="none" stroke-linecap="round"/>`;
  return `
    <ellipse cx="38" cy="49" rx="5" ry="6" fill="#2b2622"/>
    <ellipse cx="62" cy="49" rx="5" ry="6" fill="#2b2622"/>
    <circle cx="39.8" cy="46.6" r="1.9" fill="#fff"/>
    <circle cx="63.8" cy="46.6" r="1.9" fill="#fff"/>
    <ellipse cx="30" cy="58" rx="5" ry="3" fill="#e79a92" opacity=".45"/>
    <ellipse cx="70" cy="58" rx="5" ry="3" fill="#e79a92" opacity=".45"/>
    ${mieng}`;
}

function than(ao) {
  return `
    <path d="M50 74 Q34 78 30 96 Q28 108 30 120 L70 120 Q72 108 70 96 Q66 78 50 74 Z" fill="${ao}"/>
    <path d="M50 74 L50 92" stroke="rgba(0,0,0,.12)" stroke-width="1.4"/>
    <rect x="20" y="88" width="11" height="26" rx="5.5" fill="${ao}"/>
    <rect x="69" y="88" width="11" height="26" rx="5.5" fill="${ao}"/>`;
}

/* Phụ kiện — thứ giúp nhận ra ai là ai khi cả năm agent đứng cạnh nhau */
function phuKien(loai) {
  switch (loai) {
    case 'kinh':
      return `
        <g stroke="#46583a" stroke-width="2" fill="rgba(255,255,255,.28)">
          <circle cx="38" cy="49" r="9.5"/><circle cx="62" cy="49" r="9.5"/>
          <path d="M47.5 49 L52.5 49" stroke-linecap="round"/>
        </g>`;
    case 'mu_bao_ho':
      return `
        <path d="M18 34 Q18 8 50 8 Q82 8 82 34 Z" fill="#e0a12c"/>
        <path d="M14 34 L86 34 Q86 39 80 39 L20 39 Q14 39 14 34 Z" fill="#c98c1f"/>
        <path d="M50 8 L50 34" stroke="#c98c1f" stroke-width="2.5"/>`;
    case 'tai_nghe':
      return `
        <path d="M20 46 Q20 14 50 14 Q80 14 80 46" stroke="#46583a"
              stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <rect x="12" y="42" width="12" height="19" rx="6" fill="#46583a"/>
        <rect x="76" y="42" width="12" height="19" rx="6" fill="#46583a"/>
        <path d="M24 56 Q34 64 40 66" stroke="#46583a" stroke-width="2.5"
              fill="none" stroke-linecap="round"/>
        <circle cx="41" cy="66" r="3" fill="#46583a"/>`;
    case 'kep_ho_so':
      return `
        <g transform="rotate(-8 74 100)">
          <rect x="64" y="86" width="22" height="28" rx="2.5" fill="#f2f1ee" stroke="#b9b5ab" stroke-width="1.5"/>
          <rect x="71" y="83" width="8" height="5" rx="1.5" fill="#8a8172"/>
          <path d="M69 96 H81 M69 101 H81 M69 106 H77" stroke="#b9b5ab"
                stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
    case 'may_tinh':
      return `
        <g transform="rotate(6 72 102)">
          <rect x="63" y="92" width="19" height="24" rx="2.5" fill="#46583a"/>
          <rect x="66" y="95" width="13" height="6" rx="1.2" fill="#c9d3ba"/>
          <g fill="#8a9a6b">
            <rect x="66" y="103" width="3.4" height="3.4" rx="1"/>
            <rect x="71.8" y="103" width="3.4" height="3.4" rx="1"/>
            <rect x="77.6" y="103" width="3.4" height="3.4" rx="1"/>
            <rect x="66" y="108.5" width="3.4" height="3.4" rx="1"/>
            <rect x="71.8" y="108.5" width="3.4" height="3.4" rx="1"/>
            <rect x="77.6" y="108.5" width="3.4" height="3.4" rx="1"/>
          </g>
        </g>`;
    default:
      return '';
  }
}

/* ==========================================================================
   VẼ MỘT NHÂN VẬT
   --------------------------------------------------------------------------
   ngoaiHinh: { da, toc, ao, kieu_toc, phu_kien }
   tuyChon:   { dangNghi, mo, cao }
   ========================================================================== */
export function veChibi(ngoaiHinh, tuyChon = {}) {
  const nh = ngoaiHinh || {};
  const kieuToc = Number.isInteger(nh.kieu_toc) ? nh.kieu_toc : 0;
  const t = toc(kieuToc, nh.toc || MAU_TOC[0]);

  // Bong bóng "đang nghĩ" — ba chấm nhấp nháy trên đầu, để người dùng biết
  // agent đang tra cứu chứ không phải trang bị treo.
  const dangNghi = tuyChon.dangNghi ? `
    <g class="chibi-nghi">
      <rect x="66" y="2" width="30" height="17" rx="8.5" fill="#fff" stroke="#dcdad4" stroke-width="1.5"/>
      <circle cx="74" cy="10.5" r="2.2" fill="#9aab86"><animate attributeName="opacity"
        values="1;.25;1" dur="1.1s" repeatCount="indefinite" begin="0s"/></circle>
      <circle cx="81" cy="10.5" r="2.2" fill="#9aab86"><animate attributeName="opacity"
        values="1;.25;1" dur="1.1s" repeatCount="indefinite" begin=".25s"/></circle>
      <circle cx="88" cy="10.5" r="2.2" fill="#9aab86"><animate attributeName="opacity"
        values="1;.25;1" dur="1.1s" repeatCount="indefinite" begin=".5s"/></circle>
    </g>` : '';

  return `
<svg class="chibi${tuyChon.mo ? ' chibi-mo' : ''}" viewBox="0 0 100 128"
     role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="50" cy="121" rx="24" ry="5" fill="rgba(63,77,51,.16)"/>
  ${t.sau}
  ${than(nh.ao || MAU_AO[0])}
  ${khuonMat(nh.da || MAU_DA[0])}
  ${t.truoc}
  ${net(!!tuyChon.dangNghi)}
  ${netGioiTinh(nh.gioi_tinh)}
  ${netRieng(nh.net_rieng, nh.toc || MAU_TOC[0])}
  ${phuKien(nh.phu_kien)}
  ${dangNghi}
</svg>`;
}

/* Chibi của một agent — ngoại hình do src/agents.js quy định, không random */
export function veChibiAgent(agent, tuyChon = {}) {
  // KHÔNG ép kieu_toc về 0 nữa: kiểu tóc chính là thứ phân biệt mười nhân vật
  // khi họ đứng cạnh nhau trên mặt bằng. Ép về 0 là xoá sạch bản sắc vừa khai.
  return veChibi(agent.chibi, tuyChon);
}

/* Chibi của một người thật — ngoại hình suy ra từ tên */
export function veChibiNguoi(hoTen, tuyChon = {}) {
  return veChibi(ngoaiHinhTuTen(hoTen), tuyChon);
}

/* ==========================================================================
   NỘI THẤT VĂN PHÒNG
   ---------------------------------------------------------------------------
   Vẽ ở LỚP NỀN, phía sau các buồng làm việc. Bàn ghế cây cối mà nằm trên người
   thì che mất mặt nhân vật — thứ duy nhất người dùng thật sự cần nhìn.

   Toạ độ tính theo phần trăm sàn, đặt vào những dải trống giữa và hai bên các
   dãy phòng. Mỗi món là một SVG nhỏ tự chứa, thêm bớt món nào chỉ là thêm bớt
   một dòng trong mảng dưới.
   ========================================================================== */

const NOI_THAT = {
  cay_canh: `
    <svg viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 66 L40 66 L37 88 L23 88 Z" fill="#c98c6a"/>
      <path d="M18 62 L42 62 L40 70 L20 70 Z" fill="#b87c5a"/>
      <path d="M30 64 Q14 52 16 34 Q28 40 30 58 Z" fill="#7d8f68"/>
      <path d="M30 64 Q46 52 44 32 Q32 38 30 58 Z" fill="#8a9a6b"/>
      <path d="M30 60 Q30 34 30 14 Q38 26 34 46 Q32 54 30 60 Z" fill="#6b7f58"/>
    </svg>`,

  tu_ho_so: `
    <svg viewBox="0 0 70 96" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="58" height="84" rx="4" fill="#d9d3c6"/>
      <rect x="6" y="8" width="58" height="84" rx="4" fill="none" stroke="#bdb6a6" stroke-width="1.5"/>
      <rect x="12" y="16" width="46" height="20" rx="2.5" fill="#eceadf"/>
      <rect x="12" y="40" width="46" height="20" rx="2.5" fill="#eceadf"/>
      <rect x="12" y="64" width="46" height="20" rx="2.5" fill="#eceadf"/>
      <rect x="28" y="24" width="14" height="3" rx="1.5" fill="#b0a897"/>
      <rect x="28" y="48" width="14" height="3" rx="1.5" fill="#b0a897"/>
      <rect x="28" y="72" width="14" height="3" rx="1.5" fill="#b0a897"/>
    </svg>`,

  ban_hop: `
    <svg viewBox="0 0 150 80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="75" cy="46" rx="62" ry="24" fill="#c9a882"/>
      <ellipse cx="75" cy="42" rx="62" ry="24" fill="#dcc09a"/>
      <ellipse cx="75" cy="42" rx="48" ry="17" fill="none" stroke="#c9a882" stroke-width="1.2" opacity=".6"/>
      <g fill="#9aab86">
        <circle cx="22" cy="30" r="9"/><circle cx="75" cy="20" r="9"/><circle cx="128" cy="30" r="9"/>
        <circle cx="30" cy="60" r="9"/><circle cx="120" cy="60" r="9"/>
      </g>
      <rect x="66" y="34" width="18" height="12" rx="2" fill="#f4f2ec"/>
    </svg>`,

  cay_nuoc: `
    <svg viewBox="0 0 44 96" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8 Q22 2 32 8 L30 34 L14 34 Z" fill="#cfe0a8" opacity=".85"/>
      <rect x="10" y="34" width="24" height="52" rx="3" fill="#e4e1d8"/>
      <rect x="10" y="34" width="24" height="52" rx="3" fill="none" stroke="#c8c4b8" stroke-width="1.2"/>
      <rect x="15" y="48" width="14" height="9" rx="2" fill="#9aab86"/>
      <rect x="8" y="86" width="28" height="6" rx="2" fill="#c8c4b8"/>
    </svg>`,

  bang_trang: `
    <svg viewBox="0 0 110 74" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="102" height="60" rx="3" fill="#fbfaf7" stroke="#c8c4b8" stroke-width="2"/>
      <path d="M16 20 H62 M16 30 H78 M16 40 H48" stroke="#9aab86" stroke-width="3" stroke-linecap="round"/>
      <path d="M70 44 L80 34 L88 46" stroke="#c07a5a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="30" y="64" width="50" height="4" rx="2" fill="#c8c4b8"/>
    </svg>`,

  dong_ho: `
    <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="24" fill="#fbfaf7" stroke="#b0a897" stroke-width="3"/>
      <circle cx="28" cy="28" r="2.4" fill="#46583a"/>
      <path d="M28 28 L28 14" stroke="#46583a" stroke-width="3" stroke-linecap="round"/>
      <path d="M28 28 L38 33" stroke="#46583a" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,

  ke_hang: `
    <svg viewBox="0 0 84 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="76" height="80" rx="3" fill="#cbb79b"/>
      <rect x="8" y="12" width="68" height="22" fill="#e0d3bd"/>
      <rect x="8" y="38" width="68" height="22" fill="#e0d3bd"/>
      <rect x="8" y="64" width="68" height="18" fill="#e0d3bd"/>
      <g fill="#b8863b" opacity=".85">
        <rect x="13" y="17" width="15" height="13" rx="1.5"/>
        <rect x="31" y="17" width="15" height="13" rx="1.5"/>
        <rect x="49" y="17" width="15" height="13" rx="1.5"/>
        <rect x="13" y="43" width="15" height="13" rx="1.5"/>
        <rect x="31" y="43" width="15" height="13" rx="1.5"/>
      </g>
    </svg>`
};

/* Chỗ đặt từng món — chọn những dải trống giữa và hai bên ba dãy phòng.
   x,y tính theo phần trăm sàn; w là bề ngang tính theo phần trăm bề ngang sàn. */
const BAY_TRI = [
  { mon: 'dong_ho',    x: 50,   y: 4,  w: 5 },
  { mon: 'bang_trang', x: 5.5,  y: 58, w: 13 },   // dưới băng tên khu, không nấp sau chữ
  { mon: 'tu_ho_so',   x: 95,   y: 51, w: 8 },
  { mon: 'cay_canh',   x: 5,    y: 84, w: 7 },
  { mon: 'cay_canh',   x: 95,   y: 84, w: 7 },
  { mon: 'cay_nuoc',   x: 94.5, y: 20, w: 5 },
  { mon: 'ke_hang',    x: 5,    y: 20, w: 8.5 },
  { mon: 'ban_hop',    x: 50,   y: 36, w: 20 }
];

export function veNoiThat() {
  return BAY_TRI.map(v => {
    const svg = NOI_THAT[v.mon];
    if (!svg) return '';
    return `<div class="vp-do" data-mon="${v.mon}"
                 style="left:${v.x}%;top:${v.y}%;width:${v.w}%">${svg}</div>`;
  }).join('');
}

/* ==========================================================================
   QUẦY LỄ TÂN CỦA MÂY
   ---------------------------------------------------------------------------
   Mây là lối vào duy nhất của cả văn phòng, nên trên mặt bằng em ấy phải trông
   khác hẳn chín trưởng phòng: có quầy đứng, có biển "LỄ TÂN", đứng giữa hàng
   dưới ngay chỗ người ta bước vào. Nhìn một cái là biết hỏi ai.

   Quầy vẽ ĐÈ LÊN nửa dưới người — đúng như đứng sau quầy thật.
   ========================================================================== */
export function veQuayLeTan() {
  return `
<svg class="vp-quay-ban" viewBox="0 0 200 86" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-hidden="true">
  <path d="M14 30 Q14 20 26 20 L174 20 Q186 20 186 30 L186 78
           Q186 84 178 84 L22 84 Q14 84 14 78 Z" fill="#d8c3a3"/>
  <path d="M8 20 Q8 12 20 12 L180 12 Q192 12 192 20 Q192 27 180 27 L20 27
           Q8 27 8 20 Z" fill="#e6d5b8"/>
  <path d="M30 40 H170" stroke="#c9a882" stroke-width="1.6" opacity=".7"/>
  <path d="M30 56 H170" stroke="#c9a882" stroke-width="1.6" opacity=".7"/>

  <rect x="72" y="46" width="56" height="17" rx="4" fill="#fbfaf7" stroke="#c8c4b8" stroke-width="1.4"/>
  <text x="100" y="58.5" text-anchor="middle" font-size="10.5"
        font-family="Georgia, serif" fill="#5b6b4a" letter-spacing="1.4">LỄ TÂN</text>

  <g transform="translate(28 -4)">
    <rect x="0" y="6" width="20" height="14" rx="1.8" fill="#f4f2ec" stroke="#c8c4b8" stroke-width="1.2"/>
    <path d="M4 11 H16 M4 15 H13" stroke="#b0a897" stroke-width="1.4" stroke-linecap="round"/>
  </g>
  <g transform="translate(150 -6)">
    <path d="M8 20 L8 8 Q8 4 12 4 Q16 4 16 8 L16 20 Z" fill="#9aab86"/>
    <ellipse cx="12" cy="20" rx="9" ry="3" fill="#7d8f68"/>
  </g>
</svg>`;
}

/* ==========================================================================
   KHU VỰC — vách mềm ngăn các phòng ban
   ---------------------------------------------------------------------------
   Chín cái thẻ giống nhau nằm trên một sàn trống thì đọc ra là cái LƯỚI, không
   ra văn phòng. Chia khu thì mắt tự gom nhóm: "à, hai bạn này cùng làm doanh
   thu", "ba bạn kia là khối hỗ trợ".

   Cố ý KHÔNG dựng tường kín. Tường thật sẽ giết mất thứ hay nhất của mặt bằng
   này — nhìn một phát thấy cả công ty; và ở khổ điện thoại các phòng đã xếp
   thành lưới hai cột nên tường mất nghĩa hoàn toàn. Vách mềm = một mảng nền
   nhạt + viền đứt + tấm biển tên khu.

   Chia theo đúng cơ cấu tổ chức Sếp đã dựng ở thanh điều hướng ERP.
   ========================================================================== */

export function veKhuVuc(dsKhu) {
  /* Danh sách khu do MÁY CHỦ gửi xuống, dựng từ bảng phong_ban thật — không
     còn bảng viết cứng trong file này nữa. Đổi cơ cấu trong ERP thì mặt bằng
     tự đúng theo, không phải sửa code. */
  if (!Array.isArray(dsKhu) || !dsKhu.length) return '';
  return dsKhu.map((k, i) =>
    `<div class="vp-khu" data-khoi="k${i % 5}"
          style="left:1%;top:${k.y_tren}%;width:98%;height:${k.cao}%">
       <span class="vp-khu-ten">${k.ten}</span>
     </div>`).join('');
}
