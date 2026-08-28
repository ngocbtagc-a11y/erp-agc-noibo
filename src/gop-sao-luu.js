/* ==========================================================================
   src/gop-sao-luu.js — ĐÓNG THÁNG VÀ ĐÓNG NĂM
   ---------------------------------------------------------------------------
   CTL-0022 · Sếp Ngọc chốt 2026-08-27:
     "tạo 1 thư mục lưu trữ trên driver, khung lưu trữ theo tháng, dữ liệu cập
      nhật theo ngày vào file tháng đó, 1 năm chia thành 12 tháng"
     "sau 1 tháng thì nén luôn"

   KHUNG LƯU TRỮ MỚI TRÊN DRIVE:

     Sao-luu-ERP-AGC/
     ├── 2026/
     │   ├── 08/                    ← THÁNG ĐANG CHẠY: để nguyên thư mục ngày,
     │   │   ├── 2026-08-27/           mỗi thư mục là ~25 file .csv bấm đúp mở
     │   │   └── 2026-08-28/           được bằng Excel. KHÔNG đụng vào.
     │   ├── 2026-07.zip            ← tháng đã đóng: MỘT file
     │   └── 2026-06.zip
     ├── 2025.zip                   ← hết năm: 12 file tháng gom thành một
     └── BAN-THANG-CUA-SEP/         ← gói Telegram ngày 15 (ADR-0013, giữ nguyên)

   ⛔ BỎ HẲN luật cũ "giữ 30 bản ngày rồi cuộn vòng đè lên bản cũ nhất". Luật đó
   làm mất lịch sử quá 30 ngày — mà luật kế toán bắt giữ chứng từ nhiều năm.
   NAY KHÔNG XOÁ GÌ CẢ, chỉ gộp lại cho gọn.

   ==========================================================================
   VÌ SAO PHẢI NÉN THẬT, VÀ VÌ SAO NÉN KIỂU NÀY — ĐO, KHÔNG ĐOÁN
   ==========================================================================
   Số đo thật (`npm run gop-thang-thu`, một bản ngày 17,9 MB / 103.000 dòng):

     · Gộp KHÔNG NÉN (STORE, kiểu file .zip tháng đang dùng):  1,00x — KHÔNG
       lãi một byte nào. 30 ngày vẫn là 0,52 GB. Cả năm 6,3 GB → Drive (còn
       ~12 GB) ĐẦY SAU 1,9 NĂM.
     · Nén gzip cả file một lượt:                              7,62x
     · Nén gzip TỪNG MẨU 256 KiB rồi nối lại:                  7,35x
       → 73 MB/tháng · 0,86 GB/năm · Drive dùng được ~14 NĂM.

   Tức là: cái đẻ ra 7 lần KHÔNG PHẢI phép "gộp", mà là phép "nén". Gộp suông
   lãi đúng 0%. Đây là chỗ dễ nhầm nhất của cả yêu cầu này.

   VÌ SAO PHẢI CẮT MẨU 256 KiB RỒI NÉN RIÊNG TỪNG MẨU, chứ không nén cả file:
   Cloudflare gói miễn phí cho 10 ms CPU MỖI LƯỢT cron. Nén cả một bản ngày
   17,9 MB tốn 156 ms — gấp 15 lần trần. Mà bộ nén thì KHÔNG cất trạng thái
   giữa hai lượt cron được (cửa sổ từ điển 32 KB nằm trong bộ nhớ của isolate,
   isolate bị thu hồi là mất).

   Cách giải, và nó là cách DUY NHẤT vừa nén được vừa chạy lại được:
   định dạng gzip cho phép NỐI NHIỀU THÂN GZIP LẠI VỚI NHAU và mọi công cụ giải
   nén chuẩn đều bung ra thành một luồng liền mạch (RFC 1952 mục 2.2). Nên mỗi
   lượt cron ta nén trọn vẹn MỘT mẩu 256 KiB thành một thân gzip hoàn chỉnh
   (2,71 ms xấu nhất — vừa trần), rồi nối đuôi nhau. Trạng thái phải nhớ giữa
   hai lượt chỉ còn đúng một con số: "đã ghi tới byte nào".
   Ca thử ③ trong `npm run gop-thang-thu` bung lại và so ĐÚNG TỪNG BYTE.

   Giá phải trả, nói thẳng: mấy file trong gói tháng mang đuôi `.csv.gz` nên
   KHÔNG bấm đúp mở bằng Excel được ngay. Bù lại, gói tháng có sẵn `BUNG-NEN.mjs`
   — chạy một lệnh là mọi `.csv.gz` trở lại thành `.csv` y như bản ngày. Và
   THÁNG ĐANG CHẠY vẫn để nguyên .csv không nén, đúng ý Sếp: thứ người ta hay
   mở ra xem nhất thì vẫn bấm đúp là xong.

   ==========================================================================
   ⚠️ KIỂM TRƯỚC, XOÁ SAU — LUẬT KHÔNG ĐƯỢC PHÉP LÁCH
   ==========================================================================
   Việc này XOÁ 30 thư mục ngày. Làm sai thứ tự là mất trắng một tháng dữ liệu
   của công ty, và không có đường lùi. Nên nó đi qua BỐN GIAI ĐOẠN có thứ tự
   cứng, ghi vào cột `giai_doan` của bảng `sao_luu_gop`:

     ① liet_ke  Lấy danh sách thư mục ngày của tháng đó.
     ② gop      Đọc từng byte của từng tệp về, nén, ghi vào file gộp.
                Vừa đọc vừa tính LẠI mã kiểm CRC32 của byte GỐC rồi ĐỐI CHIẾU
                với con số ghi trong KIEM-TRA.csv của chính ngày đó. Lệch một
                byte là DỪNG — nghĩa là thư mục ngày đã hỏng sẵn từ trước, gộp
                vào rồi xoá đi là nhân cái hỏng lên.
     ③ kiem     ĐỌC NGƯỢC TOÀN BỘ FILE GỘP TỪ DRIVE VỀ, tính CRC32 lại từ đầu,
                so với con số cộng dồn lúc ghi. Không lấy mẫu, không tin lời
                Drive — đọc lại đủ từng byte.
     ④ xoa      Tới đây mới được xoá thư mục ngày.

   Bất kỳ giai đoạn nào hỏng thì DỪNG TẠI ĐÓ, báo động, và KHÔNG bao giờ nhảy
   sang ④. Ca đối chứng bắt buộc (BH-16): làm hỏng file gộp rồi chạy ③ —
   hệ thống PHẢI từ chối xoá. Xem `npm run gop-thang-thu`.

   ĐỨT GIỮA CHỪNG THÌ SAO: mọi giai đoạn đều chạy lại được. Ta chỉ nhớ "đang ở
   tệp nào, byte nào" nên lượt sau đi tiếp đúng chỗ đó; và nếu Google đã nhận
   nhiều hơn ta tưởng thì `khoFile.guiMau()` tự hỏi lại Google rồi đi tiếp
   (đường tự chữa đã có sẵn, đã PASS ở CTL-0013). Không hỏng, không mất, không
   nhân đôi.
   ========================================================================== */

import * as khoFile from './kho-file.js';
import { crc32, dauTep, cuoiTep, mucLuc } from './zip.js';
import { soDoDuLieu } from './khoi-phuc-kem.js';

/* ==========================================================================
   0. Các con số điều chỉnh được — ĐỀU LÀ SỐ ĐO, không phải đoán
   ========================================================================== */

/** Mẩu đọc-và-nén mỗi lần. 256 KiB là con số của Google (mỗi mẩu tải lên phải
    là bội số 256 KiB) và cũng vừa đúng trần CPU: nén một mẩu tốn 2,26 ms trung
    bình, 2,71 ms xấu nhất. */
export const MAU_NEN = 256 * 1024;

/** Mẩu SAO CHÉP THẲNG (đóng năm) — không nén nên chỉ tốn CRC32, rẻ hơn nhiều
    nên lấy mẩu to hơn cho nhanh. */
export const MAU_CHEP = 1024 * 1024;

/** Bao nhiêu mẩu mỗi lượt cron. ⚠️ TÍNH THEO MẨU XẤU NHẤT, KHÔNG THEO TRUNG BÌNH.
    Số đo (`npm run gop-thang-thu`, 252 mẩu thật): trung vị 2,26 ms · trung bình
    2,42 ms · XẤU NHẤT 7,04 ms. Cái đuôi 7 ms đó là thật (gom rác, hâm nóng bộ
    nén) và nó sẽ rơi vào một lượt cron nào đó — lấy trung bình mà tính thì
    đúng 99% số lượt và vỡ trần ở 1% còn lại.

      · Nén: 1 × 7,04 + 0,6 ms (5 việc cron chạy trước ta) = 7,6 ms < 10 ms.
        Đã thử 2 mẩu/lượt: 14,7 ms — VƯỢT TRẦN, bác.
      · Chép (đóng năm, chỉ CRC32 không nén): 4 × 1 MiB ≈ 2,8 ms.

    Sức chở vẫn thừa: một tháng = 30 ngày × 72 mẩu = 2.160 lượt. Cửa sổ ngày
    15→28 cho ~264 lượt/ngày × 14 ngày = 3.696 lượt. Dư 1,7 lần. */
export const MAU_MOI_LUOT_NEN = 1;
export const MAU_MOI_LUOT_CHEP = 4;

/** Giai đoạn KIỂM đọc ngược: mỗi lượt đọc bấy nhiêu byte rồi tính CRC32.
    CRC32 đo được ~1,4 MB/ms nên 4 MiB ≈ 2,9 ms — trong trần. */
export const MAU_KIEM = 4 * 1024 * 1024;

/** Cửa sổ chạy việc gộp: từ ngày 15 (cùng nhịp ADR-0013) tới hết ngày 28.
    Rộng hơn cửa sổ của gói Telegram (15→24) vì việc gộp nặng hơn nhiều lần. */
export const NGAY_MO_GOP = 15;
export const NGAY_HAN_GOP = 28;

/** Còn dưới ngần này là kêu — ADR-0011 A1, giữ nguyên. */
export const THANG_BAO_TRUOC = 6;

/* Tên bốn tệp đi kèm đặt ở gốc gói, KHÔNG nén, để ai mở gói ra là đọc được ngay.
   Yêu cầu Mục 7 của CTL-0022: hai file chữ phải có trong MỌI gói. */
const TEP_GOC_GOI = ['DOC-CACH-DOC.txt', 'SO-DO-DU-LIEU.txt', 'BUNG-NEN.mjs', 'KIEM-TRA-GOI.csv'];

const MA_HOA = new TextEncoder();
const GIAI_MA = new TextDecoder();
const BOM = '﻿';

/* ==========================================================================
   1. NÉN MỘT MẨU — hàm thuần, không đụng mạng
   ---------------------------------------------------------------------------
   `CompressionStream` có sẵn trong Cloudflare Workers và trong Node 18+, nên
   ĐÚNG MỘT đoạn mã này chạy cả trên máy chủ thật lẫn trong ca thử. Không có
   thư viện ngoài (SPEC-0005 Mục 11 cấm).

   Mỗi lần gọi đẻ ra MỘT THÂN GZIP HOÀN CHỈNH. Nối các thân lại là một file .gz
   hợp lệ — `gzip -d`, 7-Zip, `zlib.gunzipSync` của Node đều bung đúng.
   ========================================================================== */
export async function nenGzip(bytes) {
  const may = new CompressionStream('gzip');
  const but = may.writable.getWriter();
  but.write(bytes);
  but.close();
  const doc = may.readable.getReader();
  const manh = [];
  let tong = 0;
  for (;;) {
    const { done, value } = await doc.read();
    if (done) break;
    manh.push(value); tong += value.length;
  }
  const ra = new Uint8Array(tong);
  let v = 0;
  for (const m of manh) { ra.set(m, v); v += m.length; }
  return ra;
}

/* ==========================================================================
   2. MÁY GÓI — trạng thái thuần, ca thử lái thẳng được không cần Drive
   ---------------------------------------------------------------------------
   `g.du` là bộ đệm byte chờ đẩy lên. Trên máy chủ thật, mỗi lượt cron đẩy phần
   đã đủ bội số 256 KiB đi rồi giữ lại cái đuôi. Trong ca thử thì cứ để nó
   phình ra rồi ghi thẳng xuống đĩa — CÙNG MỘT ĐƯỜNG MÃ, nên ca thử kiểm được
   đúng thứ chạy thật, không phải một bản mô phỏng.
   ========================================================================== */

export function moGoi() {
  return {
    du: new Uint8Array(0),   // đuôi chưa đẩy
    byteDaGui: 0,            // đã đẩy lên Drive bao nhiêu
    zipMuc: [],              // mục lục trung tâm
    crcTep: 0,               // CRC32 cộng dồn của TOÀN BỘ file gộp
    keKhai: [],              // kê khai từng mục, đi vào KIEM-TRA-GOI.csv
    coByteGoc: 0,            // tổng cỡ TRƯỚC khi nén — để báo tỉ lệ nén thật
    mucDangMo: 0, mucBatDau: 0, mucCrc: 0, mucCoByte: 0, mucCrcGoc: 0,
    mucTen: null, mucLuc: 0
  };
}

/** Vị trí byte hiện tại trong file gộp. */
export function viTri(g) { return g.byteDaGui + g.du.length; }

/** Nối hai mảng byte (bê từ sao-luu.js — đo được rẻ hơn 15 lần so với đổi qua
    chuỗi nhị phân). */
export function noiByte(a, b) {
  if (!a || !a.length) return b;
  if (!b || !b.length) return a;
  const t = new Uint8Array(a.length + b.length);
  t.set(a, 0); t.set(b, a.length);
  return t;
}

/** ⚠️ MỌI byte của file gộp PHẢI đi qua đúng cửa này — đây là chỗ duy nhất
    cộng dồn `crcTep`. Byte nào lọt ra ngoài cửa này thì giai đoạn KIỂM sẽ báo
    lệch, tức là báo động giả, tức là không ai dám tin phép kiểm nữa. */
function themByte(g, bytes) {
  if (!bytes || !bytes.length) return;
  g.crcTep = crc32(bytes, g.crcTep);
  g.du = noiByte(g.du, bytes);
}

/** Mở một mục mới trong file gộp.

    ⚠️ `luc` phải NHỚ LẠI, không được lấy `Date.now()` hai lần. Một mục kéo dài
    nhiều lượt cron — có khi nhiều NGÀY. Nếu phần đầu mục lấy giờ lúc mở mà mục
    lục trung tâm lấy giờ lúc đóng thì hai chỗ ghi hai giờ khác nhau trong cùng
    một file .zip. Công cụ giải nén thường bỏ qua, nhưng đó là loại lệch âm thầm
    mà người soi file sau này không hiểu nổi vì sao. Ghi một giờ, dùng cả hai chỗ. */
export function moMuc(g, ten, luc = Date.now()) {
  if (g.mucDangMo) throw new Error(`Mở mục "${ten}" khi mục "${g.mucTen}" chưa đóng`);
  g.mucDangMo = 1; g.mucTen = ten; g.mucLuc = luc;
  g.mucBatDau = viTri(g);
  g.mucCrc = 0; g.mucCoByte = 0; g.mucCrcGoc = 0;
  themByte(g, dauTep(ten, new Date(luc)));
}

/** Thêm một mẩu nội dung ĐÃ NÉN vào mục đang mở.
    @param goc   byte gốc (chưa nén) — chỉ dùng để cộng CRC32 gốc và đếm cỡ
    @param nen   byte đã nén, chính là thứ ghi vào file */
export function themMauDaNen(g, goc, nen) {
  g.mucCrcGoc = crc32(goc, g.mucCrcGoc);
  g.coByteGoc += goc.length;
  g.mucCrc = crc32(nen, g.mucCrc);
  g.mucCoByte += nen.length;
  themByte(g, nen);
}

/** Thêm một mẩu KHÔNG nén (đóng năm: file tháng đã nén rồi, nén lại vô ích). */
export function themMauTho(g, bytes) {
  g.mucCrcGoc = crc32(bytes, g.mucCrcGoc);
  g.coByteGoc += bytes.length;
  g.mucCrc = crc32(bytes, g.mucCrc);
  g.mucCoByte += bytes.length;
  themByte(g, bytes);
}

/** Đóng mục đang mở và ghi kê khai. */
export function dongMuc(g, keKhaiThem = {}) {
  if (!g.mucDangMo) throw new Error('Đóng mục khi không có mục nào đang mở');
  themByte(g, cuoiTep(g.mucCrc, g.mucCoByte));
  g.zipMuc.push({ ten: g.mucTen, crc: g.mucCrc, coByte: g.mucCoByte, viTriDau: g.mucBatDau, luc: g.mucLuc });
  g.keKhai.push({
    ten: g.mucTen, co_byte: g.mucCoByte, crc32: g.mucCrc >>> 0,
    crc32_goc: g.mucCrcGoc >>> 0, ...keKhaiThem
  });
  g.mucDangMo = 0; g.mucTen = null;
}

/** Một tệp nhỏ, ghi trọn trong một lượt, KHÔNG nén (mấy file chữ ở gốc gói). */
export function themTepNho(g, ten, noiDung, luc = Date.now()) {
  const b = noiDung instanceof Uint8Array ? noiDung : MA_HOA.encode(String(noiDung));
  moMuc(g, ten, luc);
  themMauTho(g, b);
  dongMuc(g, { co_byte_goc: b.length });
}

/** Đóng file gộp: ghi mục lục trung tâm. Sau lệnh này không thêm gì được nữa. */
export function dongGoi(g) {
  if (g.mucDangMo) throw new Error(`Đóng gói khi mục "${g.mucTen}" còn dở`);
  themByte(g, mucLuc(g.zipMuc, viTri(g)));
}

/* ==========================================================================
   3. Đọc kê khai của một bản ngày — nguồn của phép đối chiếu CRC32
   ========================================================================== */

/** Đọc KIEM-TRA.csv của một thư mục ngày ra dạng máy dùng được.
    Cố ý viết riêng chứ không gọi `phanTichCsv` của sao-luu.js: file này do
    chính ta đẻ ra, không có ô nào chứa dấu phẩy hay xuống dòng, nên tách bằng
    dòng-và-phẩy là đủ và rẻ hơn nhiều. */
export function docKeKhai(vanBan) {
  const s = vanBan.charCodeAt(0) === 0xFEFF ? vanBan.slice(1) : vanBan;
  const dong = s.split(/\r?\n/).filter(d => d.trim() !== '');
  if (dong.length < 1) return [];
  const tieuDe = dong[0].split(',');
  const iBang = tieuDe.indexOf('bang'), iByte = tieuDe.indexOf('co_byte'), iCrc = tieuDe.indexOf('crc32');
  if (iBang < 0 || iByte < 0) return [];
  const ra = [];
  for (let i = 1; i < dong.length; i++) {
    const o = dong[i].split(',');
    ra.push({
      bang: o[iBang],
      co_byte: Number(o[iByte]),
      crc: (iCrc >= 0 && o[iCrc] !== '' && o[iCrc] !== undefined) ? Number(o[iCrc]) >>> 0 : null
    });
  }
  return ra;
}

/* ==========================================================================
   4. VÒNG CHẠY — gọi từ sao-luu.chayMotLuot() khi không có việc gấp hơn
   ========================================================================== */

export async function chayMotLuot(env, bao) {
  let g = await env.DB.prepare(
    `SELECT * FROM sao_luu_gop WHERE giai_doan NOT IN ('xong','hong')
      ORDER BY (loai='thang') DESC, moc LIMIT 1`).first();

  // Bản THÁNG được ưu tiên trước bản NĂM: ngày 15/01 phải đóng xong tháng
  // 12/2026 rồi mới gom được cả năm 2026 — thiếu tháng 12 thì gói năm khuyết.

  if (!g) {
    g = await moLuotGopMoi(env);
    if (!g) return { bo: 'khong_co_viec_gop' };
  }

  try {
    if (g.giai_doan === 'liet_ke') return await giaiDoanLietKe(env, g, bao);
    if (g.giai_doan === 'gop') return await giaiDoanGop(env, g);
    if (g.giai_doan === 'kiem') return await giaiDoanKiem(env, g, bao);
    if (g.giai_doan === 'xoa') return await giaiDoanXoa(env, g, bao);
    return { bo: 'giai_doan_la' };
  } catch (e) {
    await baoHong(env, bao, g, e);
    throw e;
  }
}

/* ---- Mở một lượt gộp mới ------------------------------------------------ */

async function moLuotGopMoi(env) {
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  const ngay = vn.getUTCDate();
  if (ngay < NGAY_MO_GOP || ngay > NGAY_HAN_GOP) return null;

  const nam = vn.getUTCFullYear();
  const thang0 = vn.getUTCMonth();

  // ① Đóng THÁNG TRƯỚC.
  const tThang = thang0 === 0 ? 12 : thang0;
  const tNam = thang0 === 0 ? nam - 1 : nam;
  const mocThang = `${tNam}-${String(tThang).padStart(2, '0')}`;
  if (!(await daCo(env, `thang-${mocThang}`))) return taoLuot(env, 'thang', mocThang);

  // ② Đóng NĂM TRƯỚC — chỉ trong tháng 1, và chỉ khi tháng 12 đã đóng xong.
  //    ⚠️ Ca 15/01/2027: phải đóng tháng 12/2026 TRƯỚC, rồi mới đóng năm 2026.
  //    Sai thứ tự thì gói năm thiếu mất tháng 12. Có ca thử riêng.
  if (thang0 === 0) {
    const mocNam = String(nam - 1);
    if (!(await daCo(env, `nam-${mocNam}`))) {
      const t12 = await env.DB.prepare(
        `SELECT giai_doan FROM sao_luu_gop WHERE id = ?`).bind(`thang-${nam - 1}-12`).first();
      // Tháng 12 phải XONG (hoặc chưa từng có bản nào của tháng 12 → 'trong'),
      // không thì đợi lượt sau.
      if (t12 && t12.giai_doan !== 'xong') return null;
      return taoLuot(env, 'nam', mocNam);
    }
  }
  return null;
}

async function daCo(env, id) {
  const r = await env.DB.prepare('SELECT 1 FROM sao_luu_gop WHERE id = ?').bind(id).first();
  return !!r;
}

async function taoLuot(env, loai, moc) {
  const id = `${loai}-${moc}`;
  await env.DB.prepare(
    `INSERT OR REPLACE INTO sao_luu_gop (id, loai, moc, giai_doan) VALUES (?, ?, ?, 'liet_ke')`
  ).bind(id, loai, moc).run();
  return env.DB.prepare('SELECT * FROM sao_luu_gop WHERE id = ?').bind(id).first();
}

/* ---- ① LIỆT KÊ ---------------------------------------------------------- */

async function giaiDoanLietKe(env, g, bao) {
  let nguon = [];

  if (g.loai === 'thang') {
    const { results } = await env.DB.prepare(
      `SELECT id, moc, thu_muc_id FROM sao_luu_ban
        WHERE loai='ngay' AND trang_thai='xong' AND thu_muc_id IS NOT NULL
          AND goi_id IS NULL AND moc LIKE ? ORDER BY moc`).bind(`${g.moc}-%`).all();
    nguon = results.map(r => ({ ten: r.moc, banId: r.id, thuMucId: r.thu_muc_id }));
  } else {
    const { results } = await env.DB.prepare(
      `SELECT id, moc, tep_id, co_byte FROM sao_luu_gop
        WHERE loai='thang' AND giai_doan='xong' AND tep_id IS NOT NULL
          AND moc LIKE ? ORDER BY moc`).bind(`${g.moc}-%`).all();
    nguon = results.map(r => ({ ten: r.moc, gopId: r.id, tepId: r.tep_id, coByte: Number(r.co_byte) }));
  }

  // Không có gì để gộp (tháng trước khi hệ thống chạy) → đánh dấu xong, KHÔNG
  // đẻ ra một file zip rỗng làm rác.
  if (nguon.length === 0) {
    await env.DB.prepare(
      `UPDATE sao_luu_gop SET giai_doan='xong', loi='không có nguồn nào để gộp',
        cap_nhat_luc=datetime('now','+7 hours') WHERE id=?`).bind(g.id).run();
    return { gop: g.id, bo: 'khong_co_nguon' };
  }

  const thuMucId = await thuMucDich(env, g);
  const tenZip = `${g.moc}.zip`;
  // Lượt trước có thể đã mở phiên tải rồi mới chết → dọn bản sót cùng tên,
  // kẻo Drive có hai file `2026-07.zip` và không ai biết bản nào đủ.
  await khoFile.donTepTrungTen(env, { ten: tenZip, thuMucId });
  const url = await khoFile.moPhienTaiLen(env, { ten: tenZip, kieu: 'application/zip', thuMucId });

  await env.DB.prepare(`
    UPDATE sao_luu_gop SET giai_doan='gop', nguon=?, upload_url=?, chi_so_nguon=0,
      chi_so_tep=0, vi_tri_doc=0, byte_da_gui=0, du_byte=NULL, zip_muc='[]',
      ke_khai='[]', crc_tep=0, co_byte_goc=0, muc_dang_mo=0,
      cap_nhat_luc=datetime('now','+7 hours') WHERE id=?`
  ).bind(JSON.stringify(nguon), url, g.id).run();

  return { gop: g.id, giai_doan: 'gop', nguon: nguon.length };
}

/** Thư mục đích trên Drive theo khung năm/tháng của Sếp.
    · Gói THÁNG `2026-07.zip` nằm trong thư mục năm  `Sao-luu-ERP-AGC/2026/`
    · Gói NĂM   `2025.zip`    nằm thẳng trong        `Sao-luu-ERP-AGC/` */
async function thuMucDich(env, g) {
  const goc = await khoFile.timHoacTaoThuMuc(env, 'goc', 'ERP-AGC', null);
  const chung = await khoFile.timHoacTaoThuMuc(env, 'SAO-LUU', 'Sao-luu-ERP-AGC', goc);
  if (g.loai === 'nam') return chung;
  const nam = g.moc.slice(0, 4);
  return khoFile.timHoacTaoThuMuc(env, `SAO-LUU/${nam}`, nam, chung);
}

/* ---- ② GỘP -------------------------------------------------------------- */

async function giaiDoanGop(env, g) {
  const nguon = JSON.parse(g.nguon);
  const gg = napGoi(g);

  const laThang = g.loai === 'thang';
  const soMau = laThang ? MAU_MOI_LUOT_NEN : MAU_MOI_LUOT_CHEP;
  const coMau = laThang ? MAU_NEN : MAU_CHEP;

  for (let i = 0; i < soMau; i++) {
    // Hết nguồn → đóng gói.
    if (g.chi_so_nguon >= nguon.length) { await dongGoiVaChot(env, g, gg); return { gop: g.id, giai_doan: 'kiem' }; }

    const n = nguon[g.chi_so_nguon];

    /* --- Nguồn là một FILE (đóng năm): một mục, chép thẳng, không nén ----- */
    if (!laThang) {
      if (!gg.mucDangMo) moMuc(gg, `${n.ten}.zip`);
      const den = Math.min(g.vi_tri_doc + coMau, n.coByte) - 1;
      const bytes = await khoFile.docKhuc(env, { khoa: n.tepId, tu: g.vi_tri_doc, den });
      themMauTho(gg, bytes);
      g.vi_tri_doc += bytes.length;
      if (g.vi_tri_doc >= n.coByte) {
        dongMuc(gg, { nguon: n.ten, co_byte_goc: n.coByte });
        g.chi_so_nguon++; g.vi_tri_doc = 0;
      }
      continue;
    }

    /* --- Nguồn là một THƯ MỤC NGÀY: nhiều tệp, nén từng mẩu ---------------- */
    let tepHien = g.tep_hien ? JSON.parse(g.tep_hien) : null;
    if (!tepHien) {
      tepHien = await lietKeNgay(env, n);
      g.tep_hien = JSON.stringify(tepHien);
      g.chi_so_tep = 0; g.vi_tri_doc = 0;
    }
    if (g.chi_so_tep >= tepHien.length) {
      g.chi_so_nguon++; g.tep_hien = null; g.chi_so_tep = 0; g.vi_tri_doc = 0;
      continue;
    }

    const t = tepHien[g.chi_so_tep];
    if (!gg.mucDangMo) moMuc(gg, `${n.ten}/${t.ten}.gz`);

    // Tệp rỗng: vẫn phải có mục (không thì lúc phục hồi báo thiếu tệp), nhưng
    // không có byte nào để đọc.
    if (t.coByte === 0) {
      themMauDaNen(gg, new Uint8Array(0), await nenGzip(new Uint8Array(0)));
    } else {
      const den = Math.min(g.vi_tri_doc + coMau, t.coByte) - 1;
      const bytes = await khoFile.docKhuc(env, { khoa: t.id, tu: g.vi_tri_doc, den });
      if (bytes.length === 0) throw new Error(`Đọc rỗng ở ${n.ten}/${t.ten} tại byte ${g.vi_tri_doc}`);
      themMauDaNen(gg, bytes, await nenGzip(bytes));
      g.vi_tri_doc += bytes.length;
    }

    if (g.vi_tri_doc >= t.coByte) {
      /* ⛔ ĐỐI CHIẾU MÃ KIỂM — chỗ quan trọng nhất của cả giai đoạn này.
         Ta vừa đọc lại từng byte của tệp gốc và tính CRC32; con số đó phải
         khớp với con số ghi trong KIEM-TRA.csv của chính ngày đó lúc sao lưu.
         Lệch = thư mục ngày ĐÃ HỎNG SẴN từ trước. Gộp vào rồi xoá thư mục đi
         là biến một hỏng thầm lặng thành mất trắng. DỪNG. */
      if (t.crcGoc !== null && t.crcGoc !== undefined && (gg.mucCrcGoc >>> 0) !== (t.crcGoc >>> 0)) {
        throw new Error(
          `Lệch mã kiểm ở ${n.ten}/${t.ten}: KIEM-TRA.csv của ngày đó ghi crc32 ` +
          `${t.crcGoc >>> 0}, đọc lại ra ${gg.mucCrcGoc >>> 0}. Thư mục ngày này đã hỏng ` +
          `từ trước. KHÔNG gộp, KHÔNG xoá — phải xem lại bằng tay.`);
      }
      dongMuc(gg, { nguon: n.ten, co_byte_goc: t.coByte });
      g.chi_so_tep++; g.vi_tri_doc = 0;
    }
  }

  await dayPhanDayDu(env, g, gg);
  await luuGoi(env, g, gg);
  return { gop: g.id, nguon: g.chi_so_nguon, tep: g.chi_so_tep };
}

/** Liệt kê tệp của một thư mục ngày + đọc kê khai để biết CRC32 gốc của từng tệp. */
async function lietKeNgay(env, n) {
  const ds = await khoFile.lietKeTep(env, { thuMucId: n.thuMucId });
  if (!ds.length) throw new Error(`Thư mục ngày ${n.ten} rỗng — không gộp thư mục rỗng rồi xoá nó.`);

  // KIEM-TRA.csv là bản kê khai lúc ghi. Không có nó thì vẫn gộp được, nhưng
  // MẤT phép đối chiếu CRC32 — nói to ra trong log, đừng im lặng.
  const kt = ds.find(t => t.ten === 'KIEM-TRA.csv');
  let keKhai = [];
  if (kt) {
    const res = await khoFile.layFile(env, { khoa: kt.id });
    if (res.ok) keKhai = docKeKhai(await res.text());
  }
  if (!keKhai.length) {
    console.error(`Gộp tháng: thư mục ngày ${n.ten} KHÔNG có KIEM-TRA.csv đọc được — ` +
      `gộp mà không đối chiếu được mã kiểm từng tệp.`);
  }
  const tra = new Map(keKhai.map(k => [`${k.bang}.csv`, k]));

  return ds
    .filter(t => t.kieu !== 'application/vnd.google-apps.folder')
    .map(t => ({ id: t.id, ten: t.ten, coByte: t.coByte, crcGoc: tra.get(t.ten)?.crc ?? null }));
}

/* ---- Đóng gói: nhét mấy file chữ vào rồi chốt sổ ------------------------- */

async function dongGoiVaChot(env, g, gg) {
  const nguon = JSON.parse(g.nguon);

  /* Mục 7 CTL-0022: DOC-CACH-DOC.txt và SO-DO-DU-LIEU.txt phải có trong MỌI
     gói — gói tháng và gói năm cũng vậy, không riêng gói ngày. Cộng thêm
     BUNG-NEN.mjs (bung .csv.gz trở lại .csv) và KIEM-TRA-GOI.csv (kê khai). */
  const tiLe = gg.coByteGoc > 0 ? (gg.coByteGoc / Math.max(1, viTri(gg))) : 1;
  const luc = Date.now();
  themTepNho(gg, 'DOC-CACH-DOC.txt', docCachDocGoi({
    loai: g.loai, moc: g.moc, nguon, coByteGoc: gg.coByteGoc, tiLe, luc
  }), luc);
  themTepNho(gg, 'SO-DO-DU-LIEU.txt', await soDoGoi(env, g, gg), luc);
  if (g.loai === 'thang') themTepNho(gg, 'BUNG-NEN.mjs', BUNG_NEN_MJS, luc);
  themTepNho(gg, 'KIEM-TRA-GOI.csv', keKhaiGoiCsv(gg.keKhai), luc);

  dongGoi(gg);

  const tong = gg.byteDaGui + gg.du.length;
  const kq = await khoFile.guiMau(env, g.upload_url, gg.du, gg.byteDaGui, tong);
  // Canary lớp 1: Drive báo cỡ nó THẬT SỰ lưu — lệch một byte là ghi thiếu.
  if (kq.coByte !== undefined && Number(kq.coByte) !== tong) {
    throw new Error(`Canary lệch ở gói ${g.id}: gửi ${tong} byte, Drive lưu ${kq.coByte} byte`);
  }

  await env.DB.prepare(`
    UPDATE sao_luu_gop SET giai_doan='kiem', tep_id=?, duong_dan=?, co_byte=?, co_byte_goc=?,
      crc_tep=?, zip_muc=?, ke_khai=?, byte_da_gui=?, du_byte=NULL, upload_url=NULL,
      kiem_vi_tri=0, kiem_crc=0, cap_nhat_luc=datetime('now','+7 hours') WHERE id=?`
  ).bind(kq.tepId, khoFile.duongDanTep(kq.tepId), tong, gg.coByteGoc, gg.crcTep | 0,
    JSON.stringify(gg.zipMuc), JSON.stringify(gg.keKhai), tong, g.id).run();
}

/* ---- ③ KIỂM — đọc ngược CẢ file gộp về, so từng byte -------------------- */

async function giaiDoanKiem(env, g, bao) {
  const den = Math.min(g.kiem_vi_tri + MAU_KIEM, g.co_byte) - 1;
  const bytes = await khoFile.docKhuc(env, { khoa: g.tep_id, tu: g.kiem_vi_tri, den });
  if (bytes.length === 0) throw new Error(`Kiểm gói ${g.id}: Drive trả rỗng ở byte ${g.kiem_vi_tri}`);

  const crc = crc32(bytes, g.kiem_crc);
  const toi = g.kiem_vi_tri + bytes.length;

  if (toi < g.co_byte) {
    await env.DB.prepare(
      `UPDATE sao_luu_gop SET kiem_vi_tri=?, kiem_crc=?, cap_nhat_luc=datetime('now','+7 hours')
        WHERE id=?`).bind(toi, crc | 0, g.id).run();
    return { gop: g.id, giai_doan: 'kiem', da_kiem: toi, tong: g.co_byte };
  }

  /* ⛔ CA ĐỐI CHỨNG BH-16 BẤU VÀO ĐÚNG ĐÂY.
     Đọc hết cả file rồi. Nếu mã kiểm KHÔNG khớp thì file gộp trên Drive đã
     khác thứ ta ghi ra — và thư mục ngày là bản duy nhất còn đúng. TUYỆT ĐỐI
     KHÔNG được sang giai đoạn xoá. Dừng, báo động, để người xem lại bằng tay. */
  if ((crc >>> 0) !== (Number(g.crc_tep) >>> 0)) {
    throw new Error(
      `TỪ CHỐI XOÁ THƯ MỤC NGÀY — gói ${g.id} đọc ngược không khớp mã kiểm. ` +
      `Lúc ghi crc32=${Number(g.crc_tep) >>> 0}, đọc lại từ Drive ra ${crc >>> 0} ` +
      `(${g.co_byte} byte). File gộp đã hỏng. Thư mục ngày GIỮ NGUYÊN, không mất gì.`);
  }

  await env.DB.prepare(
    `UPDATE sao_luu_gop SET giai_doan='xoa', kiem_vi_tri=?, kiem_crc=?,
      cap_nhat_luc=datetime('now','+7 hours') WHERE id=?`).bind(toi, crc | 0, g.id).run();
  return { gop: g.id, giai_doan: 'xoa', kiem: 'dat' };
}

/* ---- ④ XOÁ — chỉ tới được sau khi ③ ĐẠT --------------------------------- */

async function giaiDoanXoa(env, g, bao) {
  const nguon = JSON.parse(g.nguon);
  const laThang = g.loai === 'thang';

  // Tối đa 3 nguồn mỗi lượt: xoá là gọi mạng, đừng đốt hết subrequest của lượt.
  let da = 0;
  for (let i = g.chi_so_nguon; i < nguon.length && da < 3; i++, da++) {
    const n = nguon[i];
    if (laThang) {
      // `xoaFileEm` KHÔNG ném lỗi: dọn không được thì thôi, đừng để một phép
      // dọn dẹp làm hỏng một lượt gộp đã kiểm ĐẠT.
      await khoFile.xoaFileEm(env, { nha: 'drive', khoa: n.thuMucId });
      await env.DB.prepare(`UPDATE sao_luu_ban SET goi_id=?, thu_muc_id=NULL, duong_dan=? WHERE id=?`)
        .bind(g.id, g.duong_dan, n.banId).run();
      await env.DB.prepare('DELETE FROM sao_luu_thu_muc WHERE drive_id=?').bind(n.thuMucId).run();
    } else {
      await khoFile.xoaFileEm(env, { nha: 'drive', khoa: n.tepId });
      await env.DB.prepare(`UPDATE sao_luu_gop SET goi_id=?, tep_id=NULL, duong_dan=? WHERE id=?`)
        .bind(g.id, g.duong_dan, n.gopId).run().catch(() => {});
    }
  }

  const toi = g.chi_so_nguon + da;
  if (toi < nguon.length) {
    await env.DB.prepare(
      `UPDATE sao_luu_gop SET chi_so_nguon=?, cap_nhat_luc=datetime('now','+7 hours') WHERE id=?`)
      .bind(toi, g.id).run();
    return { gop: g.id, giai_doan: 'xoa', da_xoa: toi, tong: nguon.length };
  }

  await env.DB.prepare(
    `UPDATE sao_luu_gop SET giai_doan='xong', chi_so_nguon=?, cap_nhat_luc=datetime('now','+7 hours')
      WHERE id=?`).bind(toi, g.id).run();

  await baoXong(env, bao, g, nguon.length);
  return { gop: g.id, giai_doan: 'xong' };
}

/* ---- Bộ đệm và trạng thái ---------------------------------------------- */

function napGoi(g) {
  return {
    du: g.du_byte ? new Uint8Array(g.du_byte) : new Uint8Array(0),
    byteDaGui: Number(g.byte_da_gui) || 0,
    zipMuc: JSON.parse(g.zip_muc || '[]'),
    crcTep: Number(g.crc_tep) >>> 0,
    keKhai: JSON.parse(g.ke_khai || '[]'),
    coByteGoc: Number(g.co_byte_goc) || 0,
    mucDangMo: g.muc_dang_mo, mucBatDau: Number(g.muc_bat_dau) || 0,
    mucCrc: Number(g.muc_crc) >>> 0, mucCoByte: Number(g.muc_co_byte) || 0,
    mucCrcGoc: Number(g.muc_crc_goc) >>> 0, mucTen: g.muc_ten || null,
    mucLuc: Number(g.muc_luc) || Date.now()
  };
}

/** Đẩy phần đã đủ bội số 256 KiB lên Drive, giữ lại cái đuôi cho lượt sau. */
async function dayPhanDayDu(env, g, gg) {
  const co = Math.floor(gg.du.length / khoFile.CO_MAU) * khoFile.CO_MAU;
  if (co === 0) return;
  await khoFile.guiMau(env, g.upload_url, gg.du.subarray(0, co), gg.byteDaGui, null);
  gg.byteDaGui += co;
  gg.du = gg.du.slice(co);   // slice, KHÔNG subarray: cắt hẳn khỏi vùng nhớ cũ
}

/** D1 cho tối đa 1.000.000 byte MỘT CỘT. Mục lục của gói tháng lớn nhất hiện
    nay (30 ngày × 25 tệp = 750 mục) đo được ~82 KB — còn xa. Nhưng "còn xa"
    không phải lý do để im lặng khi tới nơi: vượt trần mà không có dòng này thì
    D1 trả một lỗi khó hiểu giữa đêm, và không ai biết vì sao. */
const TRAN_COT_D1 = 900_000;

async function luuGoi(env, g, gg) {
  for (const [ten, v] of [['zip_muc', gg.zipMuc], ['ke_khai', gg.keKhai]]) {
    const co = JSON.stringify(v).length;
    if (co > TRAN_COT_D1) {
      throw new Error(
        `Mục lục gói ${g.id} đã ${co} byte, vượt trần một cột của D1 (${TRAN_COT_D1}). ` +
        `Gói này có quá nhiều mục (${v.length}). Phải chia gói tháng thành nhiều file, ` +
        `hoặc chuyển mục lục sang một bảng riêng. Dừng ở đây, KHÔNG ghi ra gói sai.`);
    }
  }
  const dem = gg.du.length
    ? gg.du.buffer.slice(gg.du.byteOffset, gg.du.byteOffset + gg.du.byteLength) : null;
  await env.DB.prepare(`
    UPDATE sao_luu_gop SET chi_so_nguon=?, tep_hien=?, chi_so_tep=?, vi_tri_doc=?,
      byte_da_gui=?, du_byte=?, zip_muc=?, ke_khai=?, crc_tep=?, co_byte_goc=?,
      muc_dang_mo=?, muc_bat_dau=?, muc_crc=?, muc_co_byte=?, muc_crc_goc=?, muc_ten=?,
      muc_luc=?, cap_nhat_luc=datetime('now','+7 hours') WHERE id=?`
  ).bind(g.chi_so_nguon, g.tep_hien, g.chi_so_tep, g.vi_tri_doc,
    gg.byteDaGui, dem, JSON.stringify(gg.zipMuc), JSON.stringify(gg.keKhai),
    gg.crcTep | 0, gg.coByteGoc, gg.mucDangMo, gg.mucBatDau, gg.mucCrc | 0,
    gg.mucCoByte, gg.mucCrcGoc | 0, gg.mucTen, gg.mucLuc, g.id).run();
}

/* ==========================================================================
   5. Báo động và báo xong
   ========================================================================== */

async function baoHong(env, bao, g, e) {
  await env.DB.prepare(
    `UPDATE sao_luu_gop SET giai_doan='hong', loi=?, cap_nhat_luc=datetime('now','+7 hours')
      WHERE id=?`).bind(String(e.message).slice(0, 500), g.id).run().catch(() => {});
  if (g.da_bao_loi) return;
  await env.DB.prepare('UPDATE sao_luu_gop SET da_bao_loi=1 WHERE id=?').bind(g.id).run().catch(() => {});

  const nhan = g.loai === 'thang' ? `THÁNG ${g.moc}` : `NĂM ${g.moc}`;
  const tin =
    `🔴 GỘP SAO LƯU ${nhan} HỎNG — DỪNG Ở GIAI ĐOẠN "${g.giai_doan}"\n\n` +
    `${e.message}\n\n` +
    `KHÔNG MẤT DỮ LIỆU GÌ CẢ. Máy chỉ xoá thư mục ngày SAU KHI đã đọc ngược cả ` +
    `file gộp về và mã kiểm khớp từng byte — chưa tới bước đó thì các bản ngày ` +
    `vẫn nằm nguyên trên Drive.\n\n` +
    `Việc cần làm: báo bộ phận kỹ thuật. Đừng tự xoá thư mục ngày nào.`;
  await bao.guiTelegram(env, tin).catch(() => {});
  await bao.guiThongBao(env, 'admin', `Gộp sao lưu ${g.id} hỏng: ${e.message}`, 'sao_luu_hong').catch(() => {});
}

async function baoXong(env, bao, g, soNguon) {
  const r = await env.DB.prepare('SELECT * FROM sao_luu_gop WHERE id=?').bind(g.id).first();
  const mb = (n) => (Number(n) / 1048576).toFixed(1);
  const tiLe = r.co_byte_goc > 0 ? (r.co_byte_goc / r.co_byte).toFixed(2) : '1,00';

  const tin = g.loai === 'thang'
    ? `🗂️ ĐÃ ĐÓNG THÁNG ${g.moc}\n\n` +
      `${soNguon} thư mục ngày đã gộp thành một file: ${g.moc}.zip\n` +
      `Trước khi nén: ${mb(r.co_byte_goc)} MB → sau khi nén: ${mb(r.co_byte)} MB (gọn ${tiLe} lần)\n\n` +
      `Máy đã đọc ngược CẢ file từ Drive về và đối chiếu mã kiểm từng byte TRƯỚC KHI ` +
      `xoá các thư mục ngày. Không mất ngày nào — mở file zip ra là đủ cả ${soNguon} ngày.\n\n` +
      `Xem tại: ${r.duong_dan}\n\n` +
      `Muốn xem một ngày cụ thể: tải file zip về, giải nén, mở thư mục của ngày đó, ` +
      `rồi chạy lệnh "node BUNG-NEN.mjs" là mọi file trở lại dạng Excel mở được.`
    : `🗄️ ĐÃ ĐÓNG NĂM ${g.moc}\n\n` +
      `${soNguon} file tháng đã gom thành một file: ${g.moc}.zip (${mb(r.co_byte)} MB)\n\n` +
      `Nói thật cho Sếp khỏi tưởng nhầm: gộp lần hai này GẦN NHƯ KHÔNG tiết kiệm ` +
      `thêm chỗ, vì mỗi file tháng đã nén sẵn rồi — nén cái đã nén thì không nhỏ ` +
      `thêm được. Cái được là GỌN: cả năm ${g.moc} nay chỉ còn một file, tải một ` +
      `lần là có đủ 12 tháng.\n\n` +
      `Xem tại: ${r.duong_dan}`;

  await bao.guiTelegram(env, tin).catch(() => {});
  await bao.guiThongBao(env, 'admin', tin.split('\n')[0], 'sao_luu', r.duong_dan).catch(() => {});
}

/* ==========================================================================
   6. Mấy file chữ đi kèm trong gói
   ========================================================================== */

export function keKhaiGoiCsv(keKhai) {
  let s = BOM + 'ten_trong_goi,nguon,co_byte_goc,co_byte_trong_goi,crc32_trong_goi,crc32_goc\r\n';
  for (const k of keKhai) {
    s += `${k.ten},${k.nguon || ''},${k.co_byte_goc ?? ''},${k.co_byte},${k.crc32 >>> 0},${k.crc32_goc >>> 0}\r\n`;
  }
  return s;
}

async function soDoGoi(env, g, gg) {
  // Sơ đồ quan hệ bảng đọc thẳng từ database, y như bản ngày. Lấy danh sách
  // bảng từ chính kê khai của gói (bỏ đuôi .gz và tên thư mục ngày).
  const bang = new Map();
  for (const k of gg.keKhai) {
    const m = /^[^/]+\/(.+)\.csv\.gz$/.exec(k.ten);
    if (m) bang.set(m[1], { bang: m[1], so_dong: 0, co_byte: k.co_byte_goc || 0 });
  }
  let quanHe = [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT m.name AS bang, f."table" AS den, f."from" AS cot, f."to" AS cot_den
         FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f
        WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%' ORDER BY m.name`).all();
    quanHe = results || [];
  } catch (e) { console.error('Gộp: không đọc được sơ đồ quan hệ —', e.message); }

  return soDoDuLieu({
    moc: g.moc, loai: g.loai === 'thang' ? 'thang' : 'nam',
    keKhai: [...bang.values()], quanHe, moTa: {}
  });
}

/** DOC-CACH-DOC.txt cho GÓI THÁNG / GÓI NĂM. Viết cho người không biết kỹ
    thuật, và nói thẳng chỗ khác với bản ngày (đuôi .csv.gz). */
export function docCachDocGoi({ loai, moc, nguon, coByteGoc, tiLe, luc = Date.now() }) {
  const laThang = loai === 'thang';
  const nhan = laThang ? `THÁNG ${moc}` : `NĂM ${moc}`;
  const dsNguon = nguon.map(n => n.ten).join(', ');

  return `BẢN SAO DỮ LIỆU ERP — CÔNG TY TNHH ALPHA GREEN COMMERCE
GÓI ${nhan}

ĐÂY LÀ CÁI GÌ
-------------
${laThang
  ? `Toàn bộ ${nguon.length} bản sao lưu HẰNG NGÀY của tháng ${moc}, gói lại thành một
file duy nhất cho gọn. Mỗi ngày là một thư mục riêng bên trong.

Các ngày có trong gói này:
${dsNguon}

Trước khi nén ${(coByteGoc / 1048576).toFixed(1)} MB, sau khi nén nhỏ đi khoảng ${Number(tiLe).toFixed(1)} lần.`
  : `Toàn bộ 12 gói THÁNG của năm ${moc}, gom lại thành một file cho gọn.
Bên trong là ${nguon.length} file: ${dsNguon} — mỗi file là một gói tháng.

Nói thật để Sếp khỏi tưởng nhầm: lần gom này GẦN NHƯ KHÔNG tiết kiệm thêm chỗ,
vì mỗi gói tháng đã được nén sẵn rồi, nén cái đã nén thì không nhỏ thêm được.
Cái được là GỌN — cả năm chỉ còn một file, tải một lần là có đủ.`}

VÌ SAO KHÔNG BẤM ĐÚP MỞ ĐƯỢC NGAY BẰNG EXCEL
--------------------------------------------
${laThang
  ? `Mấy file bên trong mang đuôi .csv.gz chứ không phải .csv. Cái đuôi .gz nghĩa
là "đã nén". Nén là cố ý: không nén thì một năm sao lưu chiếm hơn 6 GB trên
Google Drive và chỉ chưa đầy 2 năm là đầy; nén rồi thì dùng được hơn 10 năm.

BUNG RA THÀNH .csv — MỘT LỆNH LÀ XONG:

  1. Giải nén file .zip này ra một thư mục (bấm chuột phải → Extract All).
  2. Mở PowerShell (bấm Start, gõ powershell, Enter).
  3. Gõ:
         cd "đường-dẫn-thư-mục-vừa-giải-nén"
         node BUNG-NEN.mjs

  Xong. Mọi file .csv.gz trở lại thành .csv, bấm đúp là Excel mở, y hệt bản
  sao lưu hằng ngày. Máy chưa có Node.js thì tải ở nodejs.org, bản "LTS".

  BUNG-NEN.mjs còn đối chiếu MÃ KIỂM của từng file trong lúc bung. File nào
  hỏng nó báo ngay chứ không bung ra một file sai rồi im lặng.

  Không muốn cài Node.js: dùng 7-Zip (miễn phí, 7-zip.org) — bấm chuột phải
  vào file .csv.gz → 7-Zip → Extract Here. Làm từng file một.`
  : `Bên trong là các file .zip của từng tháng. Giải nén file năm này ra trước,
rồi giải nén tiếp file tháng nào cần dùng, rồi đọc file DOC-CACH-DOC.txt
nằm trong tháng đó — nó chỉ tiếp phần còn lại.`}

KHÔI PHỤC VÀO ERP
-----------------
${laThang
  ? `Sau khi chạy BUNG-NEN.mjs, mỗi thư mục ngày trở lại y hệt một bản sao lưu
hằng ngày — có đủ KIEM-TRA.csv, KHOI-PHUC.mjs, DOC-CACH-DOC.txt của ngày đó.
Vào đúng thư mục của ngày muốn khôi phục rồi làm theo DOC-CACH-DOC.txt trong
đó (PHẦN 2). Đừng khôi phục từ thư mục gốc của gói — phải vào thư mục MỘT
NGÀY cụ thể.`
  : `Giải nén ra file tháng cần dùng, rồi làm theo DOC-CACH-DOC.txt bên trong.`}

VÌ SAO GIỮ ĐỦ TỪNG NGÀY CHỨ KHÔNG CHỈ GIỮ BẢN CUỐI THÁNG
---------------------------------------------------------
Giữ mỗi bản cuối tháng thì tốn ít chỗ hơn 30 lần. Nhưng khi đó mất khả năng
quay về MỘT NGÀY CỤ THỂ. Ví dụ có người xoá nhầm hàng loạt vào ngày 17, hai
tháng sau kế toán mới phát hiện — nếu chỉ còn bản cuối tháng thì bản đó ĐÃ
CHỨA SẴN cái lỗi ấy, không cứu được gì. Giữ đủ ngày thì mở đúng ngày 16 ra là
xong. Chỗ trên Drive vẫn đủ dùng hơn 10 năm, nên tiết kiệm chỗ để đổi lấy rủi
ro mất dữ liệu là tối ưu sai chỗ.

DỮ LIỆU NHẠY CẢM — ĐỌC KỸ
-------------------------
Trong này có lương, số căn cước, chứng từ thuế của nhân viên. Ai cầm được file
này là đọc được hết. KHÔNG gửi qua Zalo, KHÔNG để trong thư mục dùng chung.

MUỐN BIẾT GÓI NÀY CÒN NGUYÊN VẸN KHÔNG
--------------------------------------
Mở file KIEM-TRA-GOI.csv cùng thư mục. Nó kê từng thứ trong gói: nặng bao
nhiêu byte, mã kiểm CRC32 là bao nhiêu, cả trước lẫn sau khi nén.

Tạo tự động lúc ${new Date(luc + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16)} (giờ Việt Nam).
`;
}

/* ==========================================================================
   7. BUNG-NEN.mjs — đi kèm trong mọi gói THÁNG
   ---------------------------------------------------------------------------
   Vì sao nhét cả công cụ vào trong gói (y như KHOI-PHUC.mjs của bản ngày): lúc
   cần mở gói này ra là lúc ERP đã hỏng, không vào được repo, không có ai trực.
   Thứ duy nhất còn trong tay là chính cái file .zip vừa tải về.
   Chỉ dùng `node:zlib` và `node:fs` — có sẵn trong Node, không cài gì thêm.
   ========================================================================== */
export const BUNG_NEN_MJS = String.raw`#!/usr/bin/env node
/* BUNG-NEN.mjs — bung mọi file .csv.gz trong gói tháng trở lại .csv
   Dùng:  node BUNG-NEN.mjs            (bung tại chỗ, giữ luôn file .gz)
          node BUNG-NEN.mjs --xoa-gz   (bung xong xoá file .gz cho đỡ chật)
   Không cần Internet, không cần cài gì. Node.js 18 trở lên. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const goc = process.cwd();
const xoaGz = process.argv.includes('--xoa-gz');

/* Mã kiểm CRC32 — cùng thuật toán ERP dùng lúc sao lưu. */
const BANG = (() => {
  const b = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); b[i] = c >>> 0; }
  return b;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = (BANG[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (~c) >>> 0;
}

/* Kê khai của gói: ten_trong_goi,nguon,co_byte_goc,co_byte_trong_goi,crc32_trong_goi,crc32_goc */
const keKhai = new Map();
const duongKe = path.join(goc, 'KIEM-TRA-GOI.csv');
if (fs.existsSync(duongKe)) {
  const van = fs.readFileSync(duongKe, 'utf8').replace(/^﻿/, '');
  const dong = van.split(/\r?\n/).filter(d => d.trim() !== '');
  for (let i = 1; i < dong.length; i++) {
    const o = dong[i].split(',');
    keKhai.set(o[0], { crcGoc: Number(o[5]) >>> 0, coByteGoc: Number(o[2]) });
  }
} else {
  console.log('⚠️  Không thấy KIEM-TRA-GOI.csv — vẫn bung được, nhưng KHÔNG đối chiếu được mã kiểm.');
}

function quet(thuMuc, tien = '') {
  const ra = [];
  for (const m of fs.readdirSync(thuMuc, { withFileTypes: true })) {
    const p = path.join(thuMuc, m.name);
    const t = tien ? tien + '/' + m.name : m.name;
    if (m.isDirectory()) ra.push(...quet(p, t));
    else if (m.name.endsWith('.gz')) ra.push({ duong: p, ten: t });
  }
  return ra;
}

const ds = quet(goc);
if (ds.length === 0) {
  console.log('Không thấy file .gz nào ở đây. Đứng đúng thư mục vừa giải nén ra chưa?');
  process.exit(1);
}

let ok = 0, hong = 0;
for (const t of ds) {
  const ra = t.duong.slice(0, -3);                 // bỏ đuôi .gz
  let byte;
  try {
    /* gunzipSync đọc được NHIỀU THÂN GZIP NỐI NHAU — đúng cách ERP ghi ra
       (mỗi mẩu 256 KiB là một thân, để nén được trong trần 10 ms CPU). */
    byte = zlib.gunzipSync(fs.readFileSync(t.duong));
  } catch (e) {
    console.log('❌ ' + t.ten + ' — bung không được: ' + e.message);
    hong++; continue;
  }
  const ke = keKhai.get(t.ten);
  if (ke && ke.crcGoc !== crc32(byte)) {
    console.log('❌ ' + t.ten + ' — MÃ KIỂM LỆCH. File này đã hỏng, KHÔNG dùng để khôi phục.');
    hong++; continue;
  }
  fs.writeFileSync(ra, byte);
  if (xoaGz) fs.unlinkSync(t.duong);
  ok++;
}

console.log('');
console.log('Bung xong: ' + ok + ' file' + (hong ? ', ' + hong + ' FILE HỎNG' : '') + '.');
if (hong) {
  console.log('');
  console.log('CÓ FILE HỎNG — đừng khôi phục từ gói này. Làm theo thứ tự:');
  console.log('  1. Tải lại file .zip từ Google Drive một lần nữa (hay gặp nhất là tải dở).');
  console.log('  2. Vẫn hỏng thì lấy gói của THÁNG KHÁC, hoặc bản .zip Sếp cất ở ổ cứng rời.');
  console.log('  3. Vẫn hỏng thì báo bộ phận kỹ thuật, kèm đúng mấy dòng ❌ ở trên.');
  process.exit(1);
}
console.log('Mọi file đã trở lại dạng .csv — bấm đúp là Excel mở.');
console.log('Muốn khôi phục vào ERP: vào thư mục của NGÀY cần dùng, đọc DOC-CACH-DOC.txt trong đó.');
`;
