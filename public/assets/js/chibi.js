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
const MAU_AO = ['#9aab86', '#7d8f68', '#8a9a6b', '#6b7f9e', '#5b6b8c',
                '#c07a5a', '#b8863b', '#a8b892', '#8c7ba0', '#5f9ea0'];
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
    kieu_toc: (h >> 11) % 3,     // 0 ngắn, 1 dài, 2 buộc đuôi
    phu_kien: null
  };
}

/* ---- Các mảnh ghép ------------------------------------------------------ */

function toc(kieu, mau) {
  // Kiểu 1 và 2 có phần tóc xoã sau lưng, phải vẽ TRƯỚC thân thì mới nằm dưới.
  const sau = (kieu === 1)
    ? `<path d="M22 44 Q18 78 26 92 L74 92 Q82 78 78 44 Z" fill="${mau}" opacity=".9"/>`
    : (kieu === 2)
      ? `<path d="M74 40 Q88 52 84 70 Q80 78 74 74 Q80 58 70 46 Z" fill="${mau}"/>`
      : '';

  // Phần tóc trùm đỉnh đầu, vẽ sau khuôn mặt.
  const truoc = `<path d="M20 44 Q20 12 50 12 Q80 12 80 44 Q80 34 68 30
                          Q58 26 44 30 Q30 34 26 42 Q23 46 20 44 Z" fill="${mau}"/>`;
  return { sau, truoc };
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
        <g stroke="#3f4d33" stroke-width="2" fill="rgba(255,255,255,.28)">
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
        <path d="M20 46 Q20 14 50 14 Q80 14 80 46" stroke="#3f4d33"
              stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <rect x="12" y="42" width="12" height="19" rx="6" fill="#3f4d33"/>
        <rect x="76" y="42" width="12" height="19" rx="6" fill="#3f4d33"/>
        <path d="M24 56 Q34 64 40 66" stroke="#3f4d33" stroke-width="2.5"
              fill="none" stroke-linecap="round"/>
        <circle cx="41" cy="66" r="3" fill="#3f4d33"/>`;
    case 'kep_ho_so':
      return `
        <g transform="rotate(-8 74 100)">
          <rect x="64" y="86" width="22" height="28" rx="2.5" fill="#f2f1ee" stroke="#b9b5ab" stroke-width="1.5"/>
          <rect x="71" y="83" width="8" height="5" rx="1.5" fill="#8a8a81"/>
          <path d="M69 96 H81 M69 101 H81 M69 106 H77" stroke="#b9b5ab"
                stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
    case 'may_tinh':
      return `
        <g transform="rotate(6 72 102)">
          <rect x="63" y="92" width="19" height="24" rx="2.5" fill="#3f4d33"/>
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
  ${phuKien(nh.phu_kien)}
  ${dangNghi}
</svg>`;
}

/* Chibi của một agent — ngoại hình do src/agents.js quy định, không random */
export function veChibiAgent(agent, tuyChon = {}) {
  return veChibi({ ...agent.chibi, kieu_toc: 0 }, tuyChon);
}

/* Chibi của một người thật — ngoại hình suy ra từ tên */
export function veChibiNguoi(hoTen, tuyChon = {}) {
  return veChibi(ngoaiHinhTuTen(hoTen), tuyChon);
}
