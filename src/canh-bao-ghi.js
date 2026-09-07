/* ==========================================================================
   CANH HẠN MỨC GHI D1 — "hỏng âm thầm" là thứ đắt nhất trong vụ này
   ---------------------------------------------------------------------------
   ERP đã ghi vượt hạn mức gói miễn phí 3,47 lần (346.688 / 100.000 dòng mỗi
   ngày) SUỐT NHIỀU TUẦN mà không ai biết — không phải vì khó sửa, mà vì
   KHÔNG AI ĐƯỢC BÁO. Vá xong mà không đặt chuông thì lần sau lại đúng như vậy.

   CÁCH LÀM — chi phí 0, KHÔNG thêm cron:
     · Mỗi lệnh ghi của luồng đồng bộ sàn tự khai số dòng nó vừa ghi. D1 trả
       sẵn con số này trong `meta.rows_written` (đã tính cả dòng chỉ mục), nên
       đây là SỐ ĐO THẬT, không phải ước lượng.
     · Cộng dồn trong bộ nhớ của lượt chạy, cuối mỗi lượt cron ghi MỘT dòng
       vào `d1_ghi_ngay` (1 dòng/ngày, ~288 lệnh/ngày = 0,6% hạn mức — trả
       0,6% để canh 100% là món hời).
     · Chạm 80% hạn mức -> Telegram cho Gạo, đúng MỘT lần mỗi ngày.

   ĐO ĐƯỢC GÌ: mọi lượt ghi của luồng ĐỒNG BỘ SÀN + của chính bộ đếm. Đây là
   nơi 99,6% lượt ghi phát sinh và cũng là nơi mọi vụ nổ hạn mức từ trước tới
   nay bắt nguồn (ghi hàng loạt theo cron). Lượt ghi do người dùng bấm tay
   KHÔNG nằm trong con số này — nói thẳng trong tin Telegram để không ai đọc
   nhầm thành "tổng của cả hệ thống". Con số tổng thật vẫn tra bằng
   `npx wrangler d1 info crm-agc`.
   ========================================================================== */

/** Hạn mức gói miễn phí Cloudflare D1 (tra tài liệu 28/08/2026). */
export const HAN_MUC_NGAY = 100000;
/** Kêu ở 80% — còn 20.000 dòng đệm để kịp xử lý trước khi bị chặn ghi. */
export const NGUONG_BAO = Math.round(HAN_MUC_NGAY * 0.8);

let donCho = 0;   // số dòng đã ghi trong lượt chạy này, chưa chốt vào DB

/** Cộng số dòng của MỘT kết quả D1 (`.run()`) hoặc MỘT mảng (`.batch()`). */
export function demGhi(kq) {
  if (!kq) return;
  for (const r of (Array.isArray(kq) ? kq : [kq])) {
    const n = r?.meta?.rows_written;
    if (typeof n === 'number' && n > 0) donCho += n;
  }
}

/** Chỉ dùng cho bàn thử — đọc/đặt lại bộ đếm đang treo. */
export function dangCho() { return donCho; }
export function datLai(n = 0) { donCho = n; }

/** Ngày theo giờ VN, dạng YYYY-MM-DD. */
function ngayVN(luc = Date.now()) {
  return new Date(luc + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/* Cộng thẳng một số dòng vào sổ ngày. Tách riêng để hai đường cùng dùng:
   cron chốt số treo, và nạp file chốt NGAY (xem congNgayNgay bên dưới). */
async function congVaoNgay(env, ngay, them) {
  return env.DB.prepare(`
    INSERT INTO d1_ghi_ngay (ngay, so_dong) VALUES (?, ?)
    ON CONFLICT(ngay) DO UPDATE SET so_dong = so_dong + excluded.so_dong
    RETURNING so_dong, da_bao
  `).bind(ngay, them).first();
}

/* ==========================================================================
   CHỐT NGAY — dành cho việc GHI HÀNG LOẠT do NGƯỜI bấm (nạp file số liệu)
   --------------------------------------------------------------------------
   ⚠️ VÌ SAO KHÔNG DÙNG CHUNG ĐƯỜNG CỦA CRON ĐƯỢC.
   `demGhi` cộng vào biến `donCho` nằm trong BỘ NHỚ của isolate đang chạy.
   Cron `scheduled()` chạy ở isolate KHÁC với isolate phục vụ lời gọi HTTP,
   nên số mà một lần nạp file cộng vào `donCho` gần như KHÔNG BAO GIỜ tới
   được chỗ cron chốt sổ. Tức là: nạp file ghi 40.000 dòng thật, mà sổ ngày
   vẫn ghi 0.

   Hậu quả đúng bằng cái mà chốt chặn hạn mức sinh ra để chặn: Sếp nạp file
   thứ nhất (5.000 dòng = 40.000 lượt), màn xem trước vẫn báo "hôm nay còn
   100.000 lượt"; nạp tiếp file thứ hai, thứ ba — vẫn "còn 100.000". Ba file
   là 120.000 lượt, vượt hạn mức, D1 chặn ghi cả hệ thống: đơn hoàn ngừng
   cập nhật, kho vận không thấy đơn quá hạn. Chốt chặn có mà như không.

   Nên nạp file tự chốt sổ NGAY, không đợi cron. Giá phải trả: đúng MỘT lượt
   ghi thêm cho mỗi lần nạp — trong khi bản thân lần nạp đó đã tốn hàng nghìn.
   ========================================================================== */
/* ==========================================================================
   ĐẶT CHỖ TRƯỚC KHI GHI — chống hai người cùng lọt qua chốt chặn
   --------------------------------------------------------------------------
   ⚠️ VÌ SAO "ĐỌC RỒI MỚI QUYẾT" LÀ HỎNG.
   `SELECT so_dong … ` rồi so sánh rồi mới ghi là ba việc rời nhau. Ba người
   nạp cùng lúc thì cả ba đều ĐỌC thấy "còn 65.000", cả ba đều thấy file mình
   cần 45.000, cả ba đều đi qua — 140.000/100.000, D1 chặn ghi CẢ HỆ THỐNG.
   Đo được: `node scripts/ho-ly-rev0060-b.mjs` mục ①.

   Cách đúng: ĐẶT CHỖ trước. Cộng phần DỰ TÍNH vào sổ ngày bằng đúng câu
   `ON CONFLICT DO UPDATE … + excluded` (nguyên tử, đã đo là không bị đè), rồi
   ĐỌC SỐ TRẢ VỀ. Người thứ hai thấy ngay số của người thứ nhất vì phép cộng
   và phép đọc là MỘT câu lệnh. Vượt thì trả chỗ lại rồi 429; không vượt thì
   ghi, xong chỉnh lại chênh lệch giữa dự tính và số thật.

   Bản thân hai lượt ghi của đặt chỗ/hoàn chỗ KHÔNG tự đếm vào sổ — cố ý:
   ca bị chặn phải để sổ ngày y nguyên như trước khi thử (bàn đo canh việc
   này), và 2 dòng cho mỗi lần nạp là sai số nằm dưới mức đáng quan tâm.
   ========================================================================== */

/** Đặt chỗ `soDuTinh` lượt ghi. Trả `{ngay, so_dong}` — số SAU khi đã đặt. */
export async function datChoGhi(env, soDuTinh) {
  if (!(soDuTinh > 0)) return null;
  const ngay = ngayVN();
  const d = await congVaoNgay(env, ngay, soDuTinh);
  return { ngay, so_dong: d?.so_dong || 0 };
}

/** Trả lại chỗ đã đặt (khi bị chặn, hoặc khi ghi ít hơn dự tính). */
export async function traLaiCho(env, so) {
  if (!(so > 0)) return null;
  const ngay = ngayVN();
  try {
    const d = await congVaoNgay(env, ngay, -so);
    return { ngay, so_dong: d?.so_dong || 0 };
  } catch (e) {
    console.error('Trả lại chỗ ghi:', e.message);
    return null;
  }
}

/**
 * Chỉnh sổ ngày theo chênh lệch giữa DỰ TÍNH đã đặt chỗ và SỐ THẬT đã ghi.
 * `chenh` dương = ghi nhiều hơn dự tính (đặt thêm), âm = ghi ít hơn (trả về).
 */
export async function chinhLaiCho(env, chenh) {
  if (!chenh) return null;
  const ngay = ngayVN();
  try {
    const d = await congVaoNgay(env, ngay, chenh);
    return { ngay, so_dong: d?.so_dong || 0 };
  } catch (e) {
    console.error('Chỉnh sổ lượt ghi:', e.message);
    return null;
  }
}

export async function chotNgayLuon(env, soDong) {
  if (!(soDong > 0)) return null;
  const ngay = ngayVN();
  try {
    const d = await congVaoNgay(env, ngay, soDong);
    return { ngay, so_dong: d?.so_dong || 0 };
  } catch (e) {
    /* Chưa nạp migration hoặc D1 trục trặc: KHÔNG được làm hỏng lần nạp đã
       ghi xong. Ghi lại vào bộ đếm treo để cron còn vớt được nếu may mắn
       cùng isolate, rồi thôi. */
    donCho += soDong;
    console.error('Chốt lượt ghi nạp file:', e.message);
    return null;
  }
}

/**
 * Chốt số đang treo vào bảng ngày + kêu Telegram nếu chạm ngưỡng.
 * Gọi ở CUỐI `scheduled()` — dùng lại cron 5 phút sẵn có, không thêm lịch.
 * Bảng chưa nạp migration thì im lặng bỏ qua (không được làm hỏng cron).
 * @returns {Promise<{ngay:string,so_dong:number,da_bao:boolean}|null>}
 */
export async function chotVaCanhBao(env, guiTelegram) {
  const them = donCho;
  donCho = 0;                       // nhả sớm: lỗi ở dưới thì mất 1 lượt đếm, không cộng đôi
  if (them <= 0) return null;
  const ngay = ngayVN();

  let dong;
  try {
    dong = await congVaoNgay(env, ngay, them);
  } catch (e) {
    donCho += them;                 // chưa nạp migration / D1 lỗi -> giữ lại đếm tiếp
    console.error('Đếm lượt ghi D1:', e.message);
    return null;
  }

  const soDong = dong?.so_dong || 0;
  if (soDong < NGUONG_BAO || dong?.da_bao) return { ngay, so_dong: soDong, da_bao: !!dong?.da_bao };

  const phanTram = Math.round((soDong / HAN_MUC_NGAY) * 100);
  await guiTelegram(env,
    `🚨 ERP — LƯỢT GHI D1 CHẠM ${phanTram}% HẠN MỨC MIỄN PHÍ\n\n` +
    `Hôm nay (${ngay}) luồng đồng bộ sàn đã ghi ${soDong.toLocaleString('vi-VN')} dòng ` +
    `trên hạn mức ${HAN_MUC_NGAY.toLocaleString('vi-VN')} dòng/ngày của gói miễn phí.\n` +
    `(Chưa gồm lượt ghi do người dùng thao tác tay — số tổng thật xem bằng ` +
    `"npx wrangler d1 info crm-agc".)\n\n` +
    `Vượt hạn mức là D1 CHẶN GHI: đơn hoàn ngừng cập nhật, kho vận không thấy ` +
    `đơn quá hạn. Kiểm ngay lệnh đồng bộ nào đang ghi đè dữ liệu không đổi ` +
    `(xem src/chi-ghi-khi-doi.js).`);

  await env.DB.prepare('UPDATE d1_ghi_ngay SET da_bao = 1 WHERE ngay = ?').bind(ngay).run();
  return { ngay, so_dong: soDong, da_bao: true };
}
