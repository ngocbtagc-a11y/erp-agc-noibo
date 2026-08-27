/* ==========================================================================
   src/kho-file.js — MỘT CỬA DUY NHẤT ra kho file bên ngoài
   ---------------------------------------------------------------------------
   SPEC-0005 Mục 5.1 · ADR-0011 B1.

   Đây là chỗ giữ lời hứa "đổi công cụ là dùng được ngay". Mọi nơi khác trong
   ERP chỉ gọi các hàm ở file này, KHÔNG bao giờ gọi thẳng Google Drive. Sau
   này muốn chuyển sang chỗ lưu khác thì sửa đúng file này, không sửa chỗ khác.

   Chọn nhà bằng biến môi trường `KHO_FILE_NHA`:
       'drive'   → Google Drive, tài khoản công ty  (MẶC ĐỊNH — ADR-0011 A1)
       'r2'      → Cloudflare R2   (ADR-0011 B1: KHÔNG bật, vì bắt gắn thẻ)
       'd1_tam'  → base64 trong D1 (phao cứu sinh cho file NHỎ)

   VÌ SAO KHÔNG DÙNG SERVICE ACCOUNT của Google: service account không có dung
   lượng lưu trữ riêng và không sở hữu được file — sẽ hỏng ngay lần tải lên đầu
   tiên với lỗi storageQuotaExceeded. Ta dùng OAuth refresh token của chính tài
   khoản công ty, scope hẹp nhất `drive.file` (chỉ thấy file do ERP tự tạo).

   ⚠️ BẪY CHẾT ÂM THẦM: màn hình OAuth để nguyên trạng thái "Testing" thì
   refresh token HẾT HẠN SAU 7 NGÀY. Phải chuyển sang "In production".
   Xem hướng dẫn từng bước ở docs/huong-dan/CAP-QUYEN-GOOGLE-DRIVE.md
   ========================================================================== */

const GOC_OAUTH   = 'https://oauth2.googleapis.com/token';
const GOC_DRIVE   = 'https://www.googleapis.com/drive/v3';
const GOC_TAI_LEN = 'https://www.googleapis.com/upload/drive/v3/files';

/** Cỡ một mẩu tải lên. Google bắt buộc bội số của 256 KiB (trừ mẩu cuối). */
export const CO_MAU = 256 * 1024;

/** Ngưỡng cảnh báo dung lượng — ADR-0011 A1 mục 1: còn dưới 3 GB là phải kêu. */
export const NGUONG_CANH_BAO_BYTE = 3 * 1024 * 1024 * 1024;

export function nhaDangDung(env) {
  return env.KHO_FILE_NHA || 'drive';
}

/** Kho đã cấu hình đủ để chạy chưa. Thiếu thì bỏ qua êm, KHÔNG crash
    (bê nguyên khuôn `if (!env.MINH_CHUNG)` đang dùng cho R2 minh chứng). */
export function daCauHinh(env) {
  const nha = nhaDangDung(env);
  if (nha === 'drive') return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
  if (nha === 'r2') return !!env.MINH_CHUNG;
  return true; // d1_tam luôn sẵn sàng
}

/* ==========================================================================
   1. Vé vào cửa Google — access_token
   ========================================================================== */

/* Giữ tạm trong biến của isolate: access_token sống 1 giờ, cron chạy 5 phút/lần
   nên phần lớn các lượt KHÔNG phải gọi lại Google. Tiết kiệm subrequest và độ
   trễ. Isolate bị thu hồi thì mất — không sao, lượt sau xin lại. */
let veTam = { token: null, hetHanLuc: 0 };

export async function layAccessToken(env) {
  if (veTam.token && Date.now() < veTam.hetHanLuc - 60_000) return veTam.token;

  const than = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });
  const res = await fetch(GOC_OAUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: than.toString()
  });
  if (!res.ok) {
    const chiTiet = (await res.text()).slice(0, 300);
    // Lỗi hay gặp nhất ở đây là invalid_grant = khoá đã hết hạn vì màn OAuth
    // còn ở chế độ "Testing". Nói thẳng ra để người đọc log biết phải làm gì.
    throw new Error(`Google từ chối cấp vé (${res.status}). ${chiTiet}` +
      (chiTiet.includes('invalid_grant')
        ? ' → Nhiều khả năng màn hình OAuth còn ở chế độ "Testing" nên khoá hết hạn sau 7 ngày. Chuyển sang "In production" rồi lấy khoá mới.'
        : ''));
  }
  const j = await res.json();
  veTam = { token: j.access_token, hetHanLuc: Date.now() + (j.expires_in || 3600) * 1000 };
  return veTam.token;
}

/** Dùng khi thử lại sau lỗi 401 — vứt vé cũ đi. */
export function boVeTam() { veTam = { token: null, hetHanLuc: 0 }; }

async function goiDrive(env, duongDan, tuyChon = {}) {
  const token = await layAccessToken(env);
  const res = await fetch(duongDan, {
    ...tuyChon,
    headers: { Authorization: `Bearer ${token}`, ...(tuyChon.headers || {}) }
  });
  if (res.status === 401) { // vé hỏng giữa chừng → xin vé mới, thử lại đúng 1 lần
    boVeTam();
    const token2 = await layAccessToken(env);
    return fetch(duongDan, {
      ...tuyChon,
      headers: { Authorization: `Bearer ${token2}`, ...(tuyChon.headers || {}) }
    });
  }
  return res;
}

/* ==========================================================================
   2. Thư mục
   ========================================================================== */

/** Tạo thư mục trên Drive, trả về id. */
export async function taoThuMuc(env, ten, chaId) {
  const res = await goiDrive(env, `${GOC_DRIVE}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: ten,
      mimeType: 'application/vnd.google-apps.folder',
      ...(chaId ? { parents: [chaId] } : {})
    })
  });
  if (!res.ok) throw new Error(`Tạo thư mục "${ten}" hỏng (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).id;
}

/** Tìm trong D1 xem thư mục này tạo chưa; chưa thì tạo và nhớ lại.
    KHÔNG dùng files.list để tìm — scope `drive.file` chỉ thấy file do ERP tạo,
    và tra D1 thì nhanh hơn, không tốn subrequest. */
export async function timHoacTaoThuMuc(env, khoa, ten, chaId) {
  const cu = await env.DB.prepare('SELECT drive_id FROM sao_luu_thu_muc WHERE khoa = ?').bind(khoa).first();
  if (cu?.drive_id) return cu.drive_id;
  const id = await taoThuMuc(env, ten, chaId);
  await env.DB.prepare('INSERT OR REPLACE INTO sao_luu_thu_muc (khoa, drive_id) VALUES (?, ?)').bind(khoa, id).run();
  return id;
}

/* ==========================================================================
   3. Tải lên NHIỀU LƯỢT (resumable) — trái tim của việc sao lưu
   ---------------------------------------------------------------------------
   Ràng buộc cứng: Workers gói miễn phí cho 10 ms CPU MỖI LƯỢT cron. Ghép chuỗi
   CSV cho 40.000 dòng trong một lượt là vượt. Nên phải chia lô ngay từ thiết
   kế, không phải tối ưu về sau. Google hỗ trợ đúng thứ ta cần: mở một phiên
   tải lên, rồi đẩy từng mẩu 256 KiB qua nhiều lượt, phiên sống 1 tuần.
   ========================================================================== */

/** Mở phiên tải lên nhiều lượt. Trả về đường dẫn để đẩy các mẩu vào. */
export async function moPhienTaiLen(env, { ten, kieu, thuMucId }) {
  if (nhaDangDung(env) !== 'drive') {
    throw new Error(`Nhà kho "${nhaDangDung(env)}" chưa hỗ trợ tải lên nhiều lượt — sao lưu bắt buộc dùng 'drive'.`);
  }
  const res = await goiDrive(env, `${GOC_TAI_LEN}?uploadType=resumable&fields=id,size,name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ name: ten, mimeType: kieu || 'text/csv', ...(thuMucId ? { parents: [thuMucId] } : {}) })
  });
  if (!res.ok) throw new Error(`Mở phiên tải "${ten}" hỏng (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const noi = res.headers.get('Location');
  if (!noi) throw new Error(`Google không trả đường dẫn tải lên cho "${ten}"`);
  return noi;
}

/**
 * Đẩy MỘT mẩu vào phiên đang mở.
 * @param {Uint8Array} bytes  mẩu này (phải là bội số 256 KiB, TRỪ mẩu cuối)
 * @param {number} tuByte     vị trí byte đầu của mẩu trong cả file
 * @param {number|null} tong  tổng cỡ file — chỉ biết ở mẩu CUỐI, còn lại null
 * @returns {{xong:boolean, tepId?:string, coByte?:number}}
 */
export async function guiMau(env, upload_url, bytes, tuByte, tong, dangChua) {
  if (bytes.length === 0 && tong === null) return { xong: false };
  const den = tuByte + bytes.length - 1;
  const dai = tong === null ? '*' : String(tong);
  // Không có byte nào để gửi mà đã biết tổng cỡ → đây là lượt CHỐT SỔ: bảo
  // Google "hết rồi, tổng là ngần này". Google trả về luôn thông tin file.
  const pham = bytes.length === 0 ? `bytes */${dai}` : `bytes ${tuByte}-${den}/${dai}`;

  const token = await layAccessToken(env);
  const res = await fetch(upload_url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Range': pham },
    body: bytes.length ? bytes : null
  });

  if (res.status === 308) return { xong: false };       // Google: "gửi tiếp đi"
  if (res.status === 200 || res.status === 201) {
    const j = await res.json().catch(() => ({}));
    return { xong: true, tepId: j.id, coByte: Number(j.size || 0) };
  }

  /* ---- TỰ CHỮA: lượt trước gửi xong nhưng chưa kịp ghi lại "đã gửi tới đâu"
     -------------------------------------------------------------------------
     Cron có thể bị cắt ngang BẤT KỲ LÚC NÀO — Cloudflare thu hồi isolate, hết
     CPU, mạng đứt. Nếu bị cắt đúng giữa "Google đã nhận" và "ghi vào D1", thì
     lượt sau ta tưởng mình đang ở byte X trong khi Google đã có tới X+256K.
     Gửi lại từ X thì Google trả 400 và bản sao lưu đêm đó chết.

     Cứu: hỏi thẳng Google "anh nhận tới đâu rồi?" rồi đi tiếp từ đó. Làm được
     vì dữ liệu SINH RA GIỐNG HỆT NHAU mỗi lần — cùng dải rowid, cùng thứ tự.
     Chỉ thử MỘT lần, tránh vòng lặp vô tận. ---------------------------------- */
  if (!dangChua && (res.status === 400 || res.status === 416 || res.status === 503)) {
    const daNhan = await hoiDaNhanToiDau(env, upload_url);
    if (daNhan !== null) {
      const ketThuc = tuByte + bytes.length;      // vị trí sau byte cuối của mẩu này
      if (daNhan >= ketThuc) return { xong: false };            // Google đã có đủ mẩu này
      if (daNhan >= tuByte) {                                    // có một phần → gửi nốt
        return guiMau(env, upload_url, bytes.subarray(daNhan - tuByte), daNhan, tong, true);
      }
      // Google nhận ÍT hơn ta tưởng → có lỗ hổng, phần bị thiếu ta không giữ
      // lại nữa. Không vá được, và tuyệt đối không được giả vờ là xong.
      throw new Error(
        `Thủng bản sao lưu: Google mới nhận ${daNhan} byte nhưng ta đang định ghi tiếp từ ${tuByte}. ` +
        `Bỏ bản này, đêm sau làm lại từ đầu.`);
    }
  }

  throw new Error(`Đẩy mẩu ${pham} hỏng (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

/** Hỏi Google đã nhận bao nhiêu byte của phiên tải này.
    Trả về SỐ BYTE đã nhận, hoặc null nếu không hỏi được. */
async function hoiDaNhanToiDau(env, upload_url) {
  const token = await layAccessToken(env);
  const res = await fetch(upload_url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Range': 'bytes */*' }
  });
  if (res.status !== 308) return null;
  const pham = res.headers.get('Range');       // dạng "bytes=0-262143"
  if (!pham) return 0;                          // 308 mà không có Range = chưa nhận byte nào
  const m = /bytes=0-(\d+)/.exec(pham);
  return m ? Number(m[1]) + 1 : null;
}

/* ==========================================================================
   4. Ba hàm chung — dùng cho cả kho tài liệu sau này (Đợt sau)
   ========================================================================== */

/** Lưu MỘT file nhỏ trong một lượt. Dùng cho DOC-CACH-DOC.txt, KIEM-TRA.csv. */
export async function luuFile(env, { duLieu, tenFile, kieu, thuMucId }) {
  const nha = nhaDangDung(env);
  const bytes = duLieu instanceof Uint8Array ? duLieu : new TextEncoder().encode(String(duLieu));

  if (nha === 'drive') {
    const ranh = '----agc' + Math.random().toString(36).slice(2);
    const md = JSON.stringify({ name: tenFile, mimeType: kieu || 'text/plain', ...(thuMucId ? { parents: [thuMucId] } : {}) });
    const dau = new TextEncoder().encode(
      `--${ranh}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${md}\r\n--${ranh}\r\nContent-Type: ${kieu || 'text/plain'}\r\n\r\n`);
    const cuoi = new TextEncoder().encode(`\r\n--${ranh}--\r\n`);
    const than = new Uint8Array(dau.length + bytes.length + cuoi.length);
    than.set(dau, 0); than.set(bytes, dau.length); than.set(cuoi, dau.length + bytes.length);

    const res = await goiDrive(env, `${GOC_TAI_LEN}?uploadType=multipart&fields=id,size`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${ranh}` },
      body: than
    });
    if (!res.ok) throw new Error(`Lưu "${tenFile}" hỏng (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    return { nha, khoa: j.id, coByte: bytes.length };
  }

  if (nha === 'r2') {
    // ADR-0011 B1: KHÔNG bật R2 (bắt gắn thẻ tín dụng). Để sẵn đường vào cho
    // ngày nào Sếp đổi ý — khi đó bỏ comment binding trong wrangler.toml và
    // viết ~40 dòng ở đúng đây, KHÔNG phải sửa chỗ nào khác.
    if (!env.MINH_CHUNG) throw new Error('R2 chưa bật trên tài khoản Cloudflare (ADR-0011 B1: cố ý không bật).');
    const khoa = `${thuMucId || 'chung'}/${tenFile}`;
    await env.MINH_CHUNG.put(khoa, bytes, { httpMetadata: { contentType: kieu } });
    return { nha, khoa, coByte: bytes.length };
  }

  // d1_tam — PHAO CỨU SINH, chỉ cho file NHỎ. KHÔNG dùng cho sao lưu: một bản
  // sao lưu ~22 MB/ngày sẽ ăn hết 500 MB của D1 trong ba tuần.
  if (bytes.length > 800 * 1024) throw new Error('Phao cứu sinh d1_tam chỉ nhận file dưới 800 KB.');
  const khoa = 'tam_' + crypto.randomUUID();
  let nhiPhan = '';
  for (let i = 0; i < bytes.length; i += 8192) nhiPhan += String.fromCharCode(...bytes.subarray(i, i + 8192));
  await env.DB.prepare('INSERT INTO sao_luu_thu_muc (khoa, drive_id) VALUES (?, ?)').bind(khoa, btoa(nhiPhan)).run();
  return { nha, khoa, coByte: bytes.length };
}

/** Lấy file về. Trả `Response` để nơi gọi tự stream ra ngoài, không nạp vào RAM. */
export async function layFile(env, { nha, khoa, pham }) {
  const n = nha || nhaDangDung(env);
  if (n === 'drive') {
    return goiDrive(env, `${GOC_DRIVE}/files/${khoa}?alt=media&supportsAllDrives=true`,
      pham ? { headers: { Range: pham } } : {});
  }
  if (n === 'r2') {
    const o = await env.MINH_CHUNG.get(khoa);
    return o ? new Response(o.body) : new Response('Không có file', { status: 404 });
  }
  const d = await env.DB.prepare('SELECT drive_id FROM sao_luu_thu_muc WHERE khoa = ?').bind(khoa).first();
  if (!d) return new Response('Không có file', { status: 404 });
  const th = atob(d.drive_id);
  const b = new Uint8Array(th.length);
  for (let i = 0; i < th.length; i++) b[i] = th.charCodeAt(i);
  return new Response(b);
}

/* --------------------------------------------------------------------------
   M2 (REV-0011 §7) — CHỐNG HAI FILE TRÙNG TÊN SAU KHI CRON CHẾT NỬA CHỪNG

   Ca thật: Google đã CHỐT xong `thong_bao.csv`, nhưng cron bị cắt trước khi
   `luuPhien()` kịp ghi `chi_so_bang++`. Lượt sau ta tưởng bảng đó chưa làm →
   mở phiên tải MỚI → Drive có HAI file cùng tên `thong_bao.csv`. Tải cả thư
   mục về máy thì Windows đặt tên file thứ hai là `thong_bao (1).csv`, và
   `kiemTraKeKhai` báo `thua_tep` — BÁO ĐỘNG GIẢ đúng lúc người ta hoảng nhất,
   vì lúc đó là lúc đang phục hồi.

   Vá: trước khi mở một file mới, XOÁ HẲN bản cùng tên còn sót trong thư mục
   đó. Bản sót luôn là bản dở hoặc bản trùng — bản thật đang sắp được ghi đè.
   `files.list` chạy được với scope hẹp `drive.file` vì ta chỉ hỏi về file do
   chính ERP tạo ra. Tốn 1 lượt gọi mạng mỗi lần mở file (21 lần/đêm, trần 50
   lượt gọi MỖI lượt cron) — rẻ so với một báo động giả lúc phục hồi.
   -------------------------------------------------------------------------- */
export async function donTepTrungTen(env, { ten, thuMucId }) {
  if (nhaDangDung(env) !== 'drive' || !thuMucId) return 0;
  const q = encodeURIComponent(
    `name = '${String(ten).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' ` +
    `and '${thuMucId}' in parents and trashed = false`);
  const res = await goiDrive(env, `${GOC_DRIVE}/files?q=${q}&fields=files(id)&pageSize=20`);
  if (!res.ok) {
    // Không hỏi được thì THÔI, đừng chặn việc sao lưu vì một phép dọn dẹp.
    console.error(`Dọn tệp trùng "${ten}" hỏng (${res.status}) — bỏ qua.`);
    return 0;
  }
  const ds = (await res.json().catch(() => ({}))).files || [];
  for (const f of ds) await xoaFile(env, { nha: 'drive', khoa: f.id });
  if (ds.length) console.log(`Sao lưu: dọn ${ds.length} bản sót cùng tên "${ten}".`);
  return ds.length;
}

/** Xoá file. CHỈ dùng cho bản sao lưu quá hạn giữ — SPEC-0005 Mục 7.5 cấm
    tuyệt đối xoá tài liệu gốc, bản sao lưu thì là bản chụp nên được dọn. */
export async function xoaFile(env, { nha, khoa }) {
  const n = nha || nhaDangDung(env);
  if (n === 'drive') {
    const res = await goiDrive(env, `${GOC_DRIVE}/files/${khoa}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`Xoá ${khoa} hỏng (${res.status})`);
    return true;
  }
  if (n === 'r2') { await env.MINH_CHUNG.delete(khoa); return true; }
  await env.DB.prepare('DELETE FROM sao_luu_thu_muc WHERE khoa = ?').bind(khoa).run();
  return true;
}

/* ==========================================================================
   5. Dung lượng còn lại
   ---------------------------------------------------------------------------
   ADR-0011 A1: 15 GB dùng chung với Gmail và Photos, và chúng vẫn lớn dần.
   "Phải có cảnh báo khi còn dưới 3 GB, đừng để đầy rồi mới biết."
   Endpoint about.get chấp nhận scope `drive.file`, không cần xin thêm quyền.
   ========================================================================== */
export async function dungLuong(env) {
  if (nhaDangDung(env) !== 'drive') return null;
  const res = await goiDrive(env, `${GOC_DRIVE}/about?fields=storageQuota`);
  if (!res.ok) throw new Error(`Hỏi dung lượng hỏng (${res.status})`);
  const q = (await res.json()).storageQuota || {};
  const tong = Number(q.limit || 0);
  const daDung = Number(q.usage || 0);
  return { tong, daDung, conLai: tong ? tong - daDung : null };
}

/** Đường dẫn Sếp bấm vào mở được (mở trong Drive của chính tài khoản công ty). */
export function duongDanThuMuc(id) { return `https://drive.google.com/drive/folders/${id}`; }
export function duongDanTep(id) { return `https://drive.google.com/file/d/${id}/view`; }
