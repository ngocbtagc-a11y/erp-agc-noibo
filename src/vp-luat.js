/* ==========================================================================
   THỨ BẬC LUẬT CỦA NHÂN SỰ ẢO — một chỗ duy nhất
   ---------------------------------------------------------------------------
   Sếp Ngọc ban hành 09/09/2026:

       SYSTEM SAFETY > COMPANY > DEPARTMENT > ROLE > AGENT-SPECIFIC > USER TEMPORARY

   Tầng thấp KHÔNG BAO GIỜ đè tầng cao. Hướng dẫn riêng KHÔNG được trở thành
   nguồn sự thật cho dữ kiện nghiệp vụ.

   VÌ SAO CÓ FILE NÀY, VÀ VÌ SAO NÓ NHỎ.
   Bản soát 09/09/2026 đo được ba chỗ hỏng cùng một gốc: luật mềm do người gõ đi
   thẳng vào prompt, không thoát ký tự, không trần, không hạn. Ba chỗ ấy vá ở ba
   nơi khác nhau thì sẽ lệch nhau trong vòng một tháng. Nên gom vào đây đúng bốn
   việc, và KHÔNG hơn:
     ① nói tên các tầng và thứ tự của chúng          → TANG, THU_TU_TANG
     ② thoát ký tự phân cách                          → thoatKyTuPhanCach, bocTrichDan
     ③ đọc đúng những tầng có liên quan, có trần      → docLuat
     ④ bày tầng SYSTEM SAFETY ra màn hình, KHÔNG SỬA  → luatAnToan

   ⚠️ SYSTEM SAFETY KHÔNG CÓ TRONG BẢNG `vp_ky_nang`, VÀ ĐÓ LÀ CHỦ Ý (mục D1).
   Nó là hằng `HIEN_PHAP` trong src/agents-vp.js — sửa được bằng deploy, không
   sửa được bằng màn hình. Bảng `vp_ky_nang` có đúng một câu
   `UPDATE ... SET dang_dung = 0` bật tắt được mọi dòng của nó; cho luật an toàn
   vào chung bảng là cho nó chung luôn cái công tắc ấy. Không có đường ghi thì
   không có đường lách. Màn hình chỉ BÀY nó ra, kèm đúng câu "không sửa được ở
   đây" — xem `luatAnToan()` ở cuối file.
   ========================================================================== */

import { HIEN_PHAP_DOC, agentTheoId } from './agents-vp.js';
import { soNghiepVu } from './so-ai.js';
import { thoatKyTuPhanCach } from './vp-thoat.js';

/* ---- ① CÁC TẦNG ---------------------------------------------------------- */

/** Năm tầng GHI ĐƯỢC, xếp từ CAO xuống THẤP. Tầng đứng trước đè tầng đứng sau.
 *  `system_safety` cố ý vắng mặt: nó không ghi được nên không nằm trong bảng. */
export const THU_TU_TANG = ['company', 'department', 'role', 'agent', 'user_tmp'];

export const TANG = {
  company:    { ten: 'Toàn công ty',   giai_thich: 'Quy tắc áp cho cả chín trợ lý.' },
  department: { ten: 'Phòng ban',      giai_thich: 'Chỉ trợ lý thuộc phòng này đọc.' },
  role:       { ten: 'Vai trò',        giai_thich: 'Theo vị trí công việc của người đang hỏi.' },
  agent:      { ten: 'Riêng trợ lý',   giai_thich: 'Nghề Sếp dạy riêng cho một trợ lý.' },
  user_tmp:   { ten: 'Tạm thời',       giai_thich: 'Hướng dẫn có hạn — hết hạn là tự rụng khỏi prompt.' }
};

export function tangHopLe(t) { return THU_TU_TANG.includes(String(t || '')); }

/* ---- ② THOÁT KÝ TỰ PHÂN CÁCH -------------------------------------------
   Hai lớp, cả hai đều ở `src/vp-thoat.js` — file lá, không import ai, nên cả
   `agents-vp.js` (lúc ghép prompt) lẫn file này (lúc ghi) đều dùng chung một
   định nghĩa mà không thành vòng import. Lý do đầy đủ ghi trong file đó.
     · `thoatKyTuPhanCach` — lớp 1, gọi LÚC GHI (dưới, `kiemTruocKhiGhi`)
     · `bocTrichDan`       — lớp 2, gọi LÚC GHÉP PROMPT (agents-vp.js)
   ---------------------------------------------------------------------- */

/* ---- ③ TRẦN CHI PHÍ -----------------------------------------------------
   ĐO THẬT (bản soát §1.4, gọi chính `ghepPrompt()` của repo):
     prompt nền, 0 bài học ............ 14.450 ký tự ≈ 4.520 token
     12 bài kịch trần ................. 43.787 ký tự ≈ 13.680 token  (3,03×)
     5 tầng × 12 bài, nếu bê nguyên ... ~161.000 ký tự ≈ 50.300 token (~11,1×)

   Nạp 50.000 token cho MỘT lượt gọi, mà một câu ACTION_REQUEST hệ trọng gọi
   BẢY lượt. Cùng lúc đó Workers AI free chỉ có 10.000 Neuron/ngày DÙNG CHUNG
   với Hồ Ly triage (cron 5 phút = 288 lượt/ngày) và soạn kế hoạch.

   TRẦN ĐẶT THEO TỔNG KÝ TỰ, KHÔNG THEO SỐ BÀI. Trần "12 bài" hiện tại
   (vp-may.js) chặn được rất ít: 12 × 2.400 = 28.800 ký tự vẫn lọt. Đếm bài là
   đếm nhầm đơn vị — thứ tính tiền là ký tự.

   8.000 ký tự ≈ 2.500 token ≈ +55% so với prompt nền. Chọn con số này vì nó là
   mức khối luật mềm còn đọc được mà chưa nuốt mất phần còn lại của prompt;
   không phải con số thiêng, sửa được ở đúng một chỗ này. */
export const TRAN_KY_TU_LUAT = 8000;

/* ---- ĐỌC LUẬT CHO MỘT TRỢ LÝ -------------------------------------------- */

/** Đọc đúng những tầng CÓ LIÊN QUAN tới trợ lý này và người đang hỏi.
 *
 *  BA THỨ ĐƯỢC LÀM Ở SQL, KHÔNG LÀM Ở JS — vì làm ở JS nghĩa là dữ liệu đã rời
 *  database rồi mới bị vứt đi, tức là đã trả tiền đọc:
 *    · `dang_dung = 1`         — bài đã tắt không được nạp
 *    · `het_han_luc`           — hướng dẫn tạm HẾT HẠN THẬT, lọc ngay ở WHERE
 *    · phạm vi từng tầng       — phòng khác, vai trò khác thì không đọc lên
 *
 *  @returns {{tang: {...}, tong_ky_tu: number, bi_cat: number}}
 */
export async function docLuat(env, agentId, vaiTro) {
  const agent = agentTheoId(agentId);
  const phongBan = agent?.phong_ban_id || null;

  /* CHỈ NẠP TẦNG CÓ LIÊN QUAN. Trước bản này mọi bài học của trợ lý đều nạp
     hết; nay tầng phòng ban chỉ nạp cho trợ lý thuộc phòng đó, tầng vai trò
     chỉ nạp theo vai trò người đang ngồi. Nạp cả 5 tầng cho mọi trợ lý là
     nhân chi phí lên đúng số tầng, ở mọi lượt hỏi, mãi mãi. */
  const dieuKien = [
    ["tang = 'company'", []],
    phongBan ? ["tang = 'department' AND pham_vi_id = ?", [phongBan]] : null,
    vaiTro   ? ["tang = 'role'       AND pham_vi_id = ?", [vaiTro]]   : null,
    ["tang = 'agent'    AND agent_id = ?", [agentId]],
    ["tang = 'user_tmp' AND agent_id = ?", [agentId]]
  ].filter(Boolean);

  const menh = dieuKien.map(([sql]) => '(' + sql + ')').join(' OR ');
  const bien = dieuKien.flatMap(([, b]) => b);

  let dong = [];
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, tang, tieu_de, noi_dung FROM vp_ky_nang ' +
      ' WHERE dang_dung = 1 ' +
      /* Hết hạn lọc TẠI ĐÂY. NULL = không hạn, đó là mặc định của bốn tầng kia. */
      "   AND (het_han_luc IS NULL OR het_han_luc > datetime('now', '+7 hours')) " +
      '   AND (' + menh + ') ' +
      ' ORDER BY tao_luc DESC'
    ).bind(...bien).all();
    dong = results || [];
  } catch (e) {
    /* Thiếu cột `tang` = migration chưa chạy. Trợ lý phải vẫn trả lời được,
       chỉ là không có bài học nào — gãy cả văn phòng vì một cột thiếu thì tệ
       hơn nhiều. Ghi ra log để còn biết mà chạy migration. */
    console.error('Đọc luật lỗi (migration them-vp-kynang-tang.sql đã chạy chưa?):', e.message);
    return { tang: {}, tong_ky_tu: 0, bi_cat: 0 };
  }

  /* ---- TRẦN THEO TỔNG KÝ TỰ, ƯU TIÊN TẦNG CAO ---------------------------
     Cắt từ dưới lên: tầng thấp rụng trước. Nếu cắt từ trên xuống thì đúng cái
     tầng quan trọng nhất (quy tắc toàn công ty) là thứ mất đầu tiên. */
  const theoTang = {};
  for (const t of THU_TU_TANG) theoTang[t] = [];
  for (const d of dong) if (theoTang[d.tang]) theoTang[d.tang].push(d);

  let con = TRAN_KY_TU_LUAT;
  let biCat = 0;
  const ra = {};
  for (const t of THU_TU_TANG) {
    ra[t] = [];
    for (const d of theoTang[t]) {
      const dai = (d.tieu_de || '').length + (d.noi_dung || '').length + 6;
      if (dai > con) { biCat++; continue; }
      con -= dai;
      ra[t].push(d);
    }
  }

  return { tang: ra, tong_ky_tu: TRAN_KY_TU_LUAT - con, bi_cat: biCat };
}

/* ---- CỬA CHẶN NỘI DUNG LÚC GHI ------------------------------------------
   Một cửa duy nhất cho MỌI đường ghi luật mềm — đường dạy qua Mây
   (vp-may.js dayNghe) và đường Sếp gõ thẳng (vanphong.js huongDanGhi). Hai
   đường ghi với hai bộ kiểm khác nhau là cách một bộ kiểm chết âm thầm.
   ---------------------------------------------------------------------- */

/** Kiểm một bài học trước khi ghi. Trả `{ok:true, tieu_de, noi_dung}` hoặc
 *  `{ok:false, ly_do, chi_tiet}`. KHÔNG tự sửa im lặng ngoài việc thoát ký tự
 *  phân cách — đó là thay đổi duy nhất được phép làm sau lưng người gõ, và nó
 *  không đổi nghĩa câu nào. */
export function kiemTruocKhiGhi(tieuDe, noiDung) {
  const td = String(tieuDe || '').trim().slice(0, 60);
  const nd = String(noiDung || '').trim().slice(0, 2400);

  if (!td) return { ok: false, ly_do: 'Bài học phải có tiêu đề.' };
  if (nd.length < 40)
    return { ok: false, ly_do: 'Bài học ngắn quá (dưới 40 ký tự) — viết cách làm theo bước, đừng viết định nghĩa.' };

  /* SỐ LIỆU NGHIỆP VỤ → CHẶN CỨNG, không cảnh báo rồi vẫn ghi.
     Chú thích migrations/them-vp-kynang.sql:14-17 đã tự viết ra lý do: "dữ liệu
     thì tra ERP mới đúng, còn dạy suông thì hôm sau đã sai mà trợ lý vẫn nói
     chắc nịch". Cảnh báo rồi vẫn ghi = vẫn có con số sai trong mọi câu trả lời
     về sau, chỉ khác là có thêm một dòng chữ vàng không ai đọc. */
  const so = soNghiepVu(td + '\n' + nd);
  if (so) {
    return {
      ok: false,
      ly_do: 'Bài học đang chứa số liệu nghiệp vụ. Ở đây dạy CÁCH LÀM, không dạy SỐ — ' +
             'số thì trợ lý phải tra thẳng ERP mới đúng, chép vào bài học là hôm sau đã sai ' +
             'mà trợ lý vẫn nói chắc nịch.',
      chi_tiet: `Con số "${so.dinh}" đứng cạnh "${so.tu}" — trong đoạn: “…${so.doan}…”`
    };
  }

  return { ok: true, tieu_de: thoatKyTuPhanCach(td), noi_dung: thoatKyTuPhanCach(nd) };
}

/* ---- ④ TẦNG SYSTEM SAFETY — BÀY RA, KHÔNG SỬA ĐƯỢC ---------------------- */

/** Câu đứng cạnh tầng an toàn ở màn hình. Một câu, một chỗ định nghĩa — để
 *  giao diện không tự chế ra một câu nhẹ hơn. */
export const CAU_KHONG_SUA_DUOC =
  'Tầng này KHÔNG SỬA ĐƯỢC Ở ĐÂY. Nó nằm trong mã nguồn (hằng HIEN_PHAP, ' +
  'src/agents-vp.js) và chỉ đổi được bằng một lần deploy có lịch sử git. ' +
  'Cố ý như vậy: màn hình không có ô ghi thì không có đường lách.';

/** Tầng SYSTEM SAFETY, bóc thành từng mục để bày lên màn QUY TẮC.
 *  Đọc thẳng từ hằng trong mã nguồn — KHÔNG chép lại một bản thứ hai. Hai bản
 *  chép tay của cùng một luật là cách một bản chết âm thầm (bài học so-ai.js). */
export function luatAnToan() {
  const dong = HIEN_PHAP_DOC.split('\n');
  const laDauMuc = d => /^[IVX]{1,5}\.\s+\S/.test(d.trim());

  const muc = [];
  let mo = null;
  const dat = () => { if (mo) { mo.noi_dung = mo.noi_dung.join('\n').trim(); muc.push(mo); } };

  for (const d of dong) {
    if (laDauMuc(d)) { dat(); mo = { ten: d.trim(), noi_dung: [] }; continue; }
    if (!mo) continue;
    if (/^=+$/.test(d.trim())) continue;              // bỏ dải phân cách, màn hình tự vẽ khung
    mo.noi_dung.push(d);
  }
  dat();

  return {
    tang: 'system_safety',
    ten: 'An toàn hệ thống',
    o_dau: 'src/agents-vp.js — hằng HIEN_PHAP',
    khong_sua_duoc: true,
    ghi_chu: CAU_KHONG_SUA_DUOC,
    muc: muc.map(m => ({
      ...m,
      /* Mục VII là chỗ hồ sơ vai trò được chèn vào lúc chạy. Bày ra nguyên
         cái dấu ngoặc vuông thì người đọc tưởng luật bị thiếu. */
      noi_dung: m.noi_dung.replace('[ROLE PROFILE ĐƯỢC CHÈN Ở ĐÂY]',
        '(Hồ sơ nghề của từng trợ lý được chèn vào đây lúc chạy — xem src/vp-role-profile.js)')
    }))
  };
}
