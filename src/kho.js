/* ==========================================================================
   MODULE KHO — Xuất / Nhập / Tồn   (chạy trên máy chủ Cloudflare Worker)
   ---------------------------------------------------------------------------
   NGUYÊN TẮC:
   1. Tồn kho KHÔNG lưu sẵn thành con số. Mỗi lần nhập/xuất là một dòng trong
      sổ cái giao_dich_kho (nhập dương, xuất âm). Tồn = cộng dồn sổ cái. Nhờ
      vậy số liệu không bao giờ "trôi" và luôn truy được nguồn gốc.
   2. Xuất kho theo FEFO: lô nào cận hạn nhất thì xuất trước — đúng đặc thù
      thực phẩm, tránh để hàng hết hạn trong kho.
   3. Phân quyền kiểm ở đây, tại máy chủ. Nhân viên kho không có quyền xem giá
      vốn thì đơn giá KHÔNG được chọn ra khỏi database (giống cách giấu lương).
   ========================================================================== */

import { duocThaoTacKho, duocQuanLyKho, duocDieuChinhKho, duocXemGiaVon, duocSuaSanPham, duocKhoaSanPham, laAdmin } from './quyen.js';
import { ghiLichSuThayDoi } from './dulieunen.js';
/* Kê danh sách lô trong câu từ chối của `dieuChinhKho` cũng là một lần CẮT —
   dùng đúng khuôn chung, không tự viết `LIMIT 20` rồi im (`do-cat-im-lang`). */
import { catBot } from './cat-danh-sach.js';

/* ---- Trả lời dạng JSON (bản riêng của module, để file tự đứng được) ----- */

function json(duLieu, status = 200) {
  return new Response(JSON.stringify(duLieu), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function loi(thongDiep, status = 400) {
  return json({ loi: thongDiep }, status);
}

/* ---- Tiện ích ----------------------------------------------------------- */

/* Hôm nay theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD.
   Worker chạy giờ UTC nên phải tự cộng 7 tiếng, không thì báo cáo lệch ngày. */
function homNayVN() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/* Số ngày từ hôm nay tới một mốc (âm = đã quá hạn) */
function soNgayToi(ngay) {
  if (!ngay) return null;
  const a = new Date(homNayVN() + 'T00:00:00Z').getTime();
  const b = new Date(ngay + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

/* Ép một giá trị về số nguyên dương; trả null nếu không hợp lệ */
function soNguyenDuong(v) {
  const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const LA_NGAY = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

/* Ngưỡng coi là "cận hạn": còn 30 ngày trở xuống */
const NGAY_CAN_HAN = 30;

/* ==========================================================================
   1. DANH SÁCH SẢN PHẨM + TỒN KHO HIỆN TẠI
   ========================================================================== */

export async function danhSachSanPham(env, phien) {
  const xemGiaVon = duocXemGiaVon(phien);

  // (A) Danh mục sản phẩm đang bán
  const { results: sps } = await env.DB.prepare(`
    SELECT id, ma_sku, ten, danh_muc, don_vi, don_vi_id, theo_doi_hsd, ton_toi_thieu, trang_thai
      FROM san_pham WHERE dang_ban = 1 ORDER BY ten
  `).all();

  // (B) Tồn từng sản phẩm = cộng dồn sổ cái
  const { results: tons } = await env.DB.prepare(`
    SELECT san_pham_id, COALESCE(SUM(so_luong), 0) AS ton
      FROM giao_dich_kho GROUP BY san_pham_id
  `).all();
  const tonTheo = Object.fromEntries(tons.map(t => [t.san_pham_id, t.ton]));

  // (C) Hạn sử dụng gần nhất trong các lô CÒN hàng (để cảnh báo cận hạn)
  const { results: hans } = await env.DB.prepare(`
    SELECT l.san_pham_id, MIN(l.han_su_dung) AS han_gan
      FROM lo_hang l
      JOIN (
        SELECT lo_hang_id, SUM(so_luong) AS ton
          FROM giao_dich_kho WHERE lo_hang_id IS NOT NULL GROUP BY lo_hang_id
      ) b ON b.lo_hang_id = l.id
     WHERE b.ton > 0 AND l.han_su_dung IS NOT NULL
     GROUP BY l.san_pham_id
  `).all();
  const hanTheo = Object.fromEntries(hans.map(h => [h.san_pham_id, h.han_gan]));

  // (D) Giá vốn = đơn giá lần nhập gần nhất (chỉ lấy khi người xem có quyền)
  let giaTheo = {};
  if (xemGiaVon) {
    const { results: gia } = await env.DB.prepare(`
      SELECT san_pham_id, don_gia, luc
        FROM giao_dich_kho
       WHERE loai = 'nhap' AND don_gia IS NOT NULL
       ORDER BY luc DESC
    `).all();
    for (const g of gia) {
      if (!(g.san_pham_id in giaTheo)) giaTheo[g.san_pham_id] = g.don_gia;  // dòng đầu = mới nhất
    }
  }

  let tongGiaTri = 0;
  const danhSach = sps.map(sp => {
    const ton = tonTheo[sp.id] || 0;
    const hanGan = hanTheo[sp.id] || null;
    const ngayToiHan = soNgayToi(hanGan);
    const giaVon = xemGiaVon ? (giaTheo[sp.id] ?? null) : null;
    const giaTriTon = (giaVon != null) ? giaVon * ton : null;
    if (giaTriTon != null) tongGiaTri += giaTriTon;

    // Xếp trạng thái (ưu tiên nặng nhất)
    let trang_thai = 'binh_thuong';
    if (ton <= 0) trang_thai = 'het';
    else if (sp.ton_toi_thieu > 0 && ton <= sp.ton_toi_thieu) trang_thai = 'sap_het';
    else if (ngayToiHan != null && ngayToiHan <= NGAY_CAN_HAN) trang_thai = 'can_han';

    return {
      id: sp.id, ma_sku: sp.ma_sku, ten: sp.ten, danh_muc: sp.danh_muc,
      don_vi: sp.don_vi, theo_doi_hsd: !!sp.theo_doi_hsd,
      ton_toi_thieu: sp.ton_toi_thieu, ton,
      han_gan_nhat: hanGan, so_ngay_toi_han: ngayToiHan,
      gia_von: giaVon, gia_tri_ton: giaTriTon,
      trang_thai
    };
  });

  return json({
    san_pham: danhSach,
    xem_gia_von: xemGiaVon,
    tong_gia_tri_ton: xemGiaVon ? tongGiaTri : null,
    quyen: {
      thao_tac: duocThaoTacKho(phien),
      quan_ly: duocQuanLyKho(phien),
      gia_von: xemGiaVon,
      sua_san_pham: duocSuaSanPham(phien),
      khoa_san_pham: duocKhoaSanPham(phien)
    }
  });
}

/* ==========================================================================
   2. THÊM SẢN PHẨM (SKU)  — chỉ người có quyền quản lý kho
   ========================================================================== */

/* Đơn vị tính: nếu body gửi don_vi_id (chọn từ danh mục chuẩn Dữ liệu nền)
   thì lấy TÊN thật từ đó ghi luôn vào cột don_vi (chữ) để mọi màn hình cũ
   đọc don_vi vẫn hiển thị đúng — không phải sửa lại chỗ khác. Id không hợp
   lệ/đã ẩn thì âm thầm bỏ qua, không chặn thêm/sửa sản phẩm. */
async function donViTuId(env, donViId) {
  if (!donViId) return null;
  const dv = await env.DB.prepare('SELECT id, ten FROM don_vi_tinh WHERE id = ? AND hoat_dong = 1')
    .bind(donViId).first();
  return dv || null;
}

export async function themSanPham(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền thêm mã hàng', 403);

  const maSku = String(body.ma_sku || '').trim().toUpperCase();
  const ten = String(body.ten || '').trim();
  if (!maSku) return loi('Vui lòng nhập mã hàng (SKU)');
  if (ten.length < 2) return loi('Vui lòng nhập tên sản phẩm');

  const trung = await env.DB.prepare('SELECT id FROM san_pham WHERE ma_sku = ?').bind(maSku).first();
  if (trung) return loi('Mã hàng này đã tồn tại');

  const id = 'sp_' + crypto.randomUUID().slice(0, 12);
  const theoDoiHsd = body.theo_doi_hsd === false ? 0 : 1;
  const tonToiThieu = soNguyenDuong(body.ton_toi_thieu) || 0;
  const dv = await donViTuId(env, body.don_vi_id ? parseInt(body.don_vi_id, 10) : null);

  await env.DB.prepare(`
    INSERT INTO san_pham (id, ma_sku, ten, danh_muc, don_vi, don_vi_id, theo_doi_hsd, ton_toi_thieu)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, maSku, ten,
    String(body.danh_muc || '').trim() || null,
    dv ? dv.ten : (String(body.don_vi || '').trim() || 'sản phẩm'),
    dv ? dv.id : null,
    theoDoiHsd, tonToiThieu
  ).run();

  return json({ ok: true, id });
}

/* Sửa sản phẩm đã có — cùng quyền với Thêm (duocQuanLyKho). Không cho đổi
   mã SKU (khoá tự nhiên, đổi sẽ vỡ liên kết giao_dich_kho/lo_hang/sku_map
   đang trỏ theo id chứ không theo mã, nên thực ra đổi mã vẫn an toàn về mặt
   dữ liệu — nhưng CỐ TÌNH khoá lại để tránh gõ nhầm mã đang dùng thật). */
export async function suaSanPham(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền sửa mã hàng', 403);

  const id = String(body.id || '').trim();
  if (!id) return loi('Thiếu id sản phẩm');

  const hienCo = await env.DB.prepare('SELECT id, ten, danh_muc, don_vi, trang_thai FROM san_pham WHERE id = ?').bind(id).first();
  if (!hienCo) return loi('Không tìm thấy sản phẩm', 404);

  // Đã khoá thì chỉ Admin sửa được (Data Lock — xem migration them-khoa-danhmuc-nen.sql)
  if (hienCo.trang_thai === 'da_khoa' && !laAdmin(phien)) {
    return loi('Mã hàng này đã khoá — cần Admin sửa hoặc mở khoá lại', 403);
  }

  const ten = String(body.ten || '').trim();
  if (ten.length < 2) return loi('Vui lòng nhập tên sản phẩm');

  const theoDoiHsd = body.theo_doi_hsd === false ? 0 : 1;
  const tonToiThieu = soNguyenDuong(body.ton_toi_thieu) || 0;
  const dv = await donViTuId(env, body.don_vi_id ? parseInt(body.don_vi_id, 10) : null);
  const danhMucMoi = String(body.danh_muc || '').trim() || null;
  const donViMoi = dv ? dv.ten : (String(body.don_vi || '').trim() || 'sản phẩm');

  await env.DB.prepare(`
    UPDATE san_pham SET ten = ?, danh_muc = ?, don_vi = ?, don_vi_id = ?,
           theo_doi_hsd = ?, ton_toi_thieu = ?
     WHERE id = ?
  `).bind(ten, danhMucMoi, donViMoi, dv ? dv.id : null, theoDoiHsd, tonToiThieu, id).run();

  if (hienCo.trang_thai === 'da_khoa') {
    await ghiLichSuThayDoi(env, phien, 'san_pham', id, {
      ten: [hienCo.ten, ten],
      danh_muc: [hienCo.danh_muc, danhMucMoi],
      don_vi: [hienCo.don_vi, donViMoi]
    });
  }

  return json({ ok: true });
}

/* Ẩn/hiện sản phẩm (dang_ban) — KHÔNG xoá vật lý, vì lô hàng/giao dịch kho
   cũ vẫn tham chiếu tới id này (đúng nguyên tắc "không DELETE nếu đã dùng").
   Ẩn/hiện KHÔNG bị chặn bởi khoá — đây là việc vận hành (còn bán hay
   không), không phải đổi định nghĩa mã hàng. */
export async function anHienSanPham(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền ẩn/hiện mã hàng', 403);

  const id = String(body.id || '').trim();
  if (!id) return loi('Thiếu id sản phẩm');

  await env.DB.prepare('UPDATE san_pham SET dang_ban = ? WHERE id = ?')
    .bind(body.dang_ban ? 1 : 0, id).run();

  return json({ ok: true });
}

/* Khoá (Kinh doanh/Admin bấm "Hoàn tất" — Kho vận sửa ngày thường nhưng
   KHÔNG phải người khoá, vì Kinh doanh mới là chủ sở hữu định nghĩa sản
   phẩm) / Mở khoá (chỉ Admin). */
export async function khoaSanPham(env, phien, body) {
  if (!duocKhoaSanPham(phien)) return loi('Bạn không có quyền khoá/mở khoá mã hàng — chỉ Kinh doanh/Admin', 403);

  const id = String(body.id || '').trim();
  if (!id) return loi('Thiếu id sản phẩm');
  const muon = body.trang_thai === 'da_khoa' ? 'da_khoa' : 'nhap';
  if (muon === 'nhap' && !laAdmin(phien)) {
    return loi('Chỉ Admin mới mở khoá lại được', 403);
  }

  await env.DB.prepare('UPDATE san_pham SET trang_thai = ? WHERE id = ?').bind(muon, id).run();
  return json({ ok: true });
}

/* ==========================================================================
   3. NHẬP KHO  — người có quyền thao tác kho
   ========================================================================== */

export async function nhapKho(env, phien, body) {
  if (!duocThaoTacKho(phien)) return loi('Bạn không có quyền nhập kho', 403);

  const spId = String(body.san_pham_id || '').trim();
  const soLuong = soNguyenDuong(body.so_luong);
  if (!spId) return loi('Chưa chọn sản phẩm');
  if (!soLuong) return loi('Số lượng nhập phải là số nguyên dương');

  const sp = await env.DB.prepare('SELECT id, theo_doi_hsd, dang_ban FROM san_pham WHERE id = ?')
                         .bind(spId).first();
  if (!sp) return loi('Không tìm thấy sản phẩm này', 404);
  if (!sp.dang_ban) return loi('Sản phẩm này đã ngừng kinh doanh');

  const hanSuDung = String(body.han_su_dung || '').trim();
  if (hanSuDung && !LA_NGAY(hanSuDung)) return loi('Hạn sử dụng phải dạng năm-tháng-ngày (YYYY-MM-DD)');

  // Đơn giá (giá vốn) chỉ ghi nhận khi người nhập có quyền xem giá vốn —
  // giống cách máy chủ ép NULL cột lương với người không có quyền.
  const donGia = duocXemGiaVon(phien) ? soNguyenDuong(body.don_gia) : null;
  const doiTac = String(body.doi_tac || '').trim() || null;
  const ghiChu = String(body.ghi_chu || '').trim() || null;
  const phieuId = 'pn_' + crypto.randomUUID().slice(0, 12);

  const cauLenh = [];
  let loId = null;

  // Sản phẩm theo dõi HSD → mỗi lần nhập tạo một lô riêng
  if (sp.theo_doi_hsd) {
    loId = 'lo_' + crypto.randomUUID().slice(0, 12);
    cauLenh.push(env.DB.prepare(
      'INSERT INTO lo_hang (id, san_pham_id, so_lo, han_su_dung) VALUES (?, ?, ?, ?)'
    ).bind(loId, spId, String(body.so_lo || '').trim() || null, hanSuDung || null));
  }

  cauLenh.push(env.DB.prepare(`
    INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, don_gia, doi_tac, ghi_chu, nguoi_id)
    VALUES (?, ?, ?, 'nhap', ?, ?, ?, ?, ?)
  `).bind(phieuId, spId, loId, soLuong, donGia, doiTac, ghiChu, phien.nhan_su_id));

  // batch() chạy các câu lệnh trong một giao dịch — hoặc xong hết, hoặc không gì cả
  await env.DB.batch(cauLenh);

  return json({ ok: true, phieu_id: phieuId });
}

/* ==========================================================================
   4. XUẤT KHO  — trừ theo FEFO (lô cận hạn nhất trước)
   ========================================================================== */

export async function xuatKho(env, phien, body) {
  if (!duocThaoTacKho(phien)) return loi('Bạn không có quyền xuất kho', 403);

  const spId = String(body.san_pham_id || '').trim();
  const soLuong = soNguyenDuong(body.so_luong);
  if (!spId) return loi('Chưa chọn sản phẩm');
  if (!soLuong) return loi('Số lượng xuất phải là số nguyên dương');

  const sp = await env.DB.prepare('SELECT id, ten, don_vi, theo_doi_hsd FROM san_pham WHERE id = ?')
                         .bind(spId).first();
  if (!sp) return loi('Không tìm thấy sản phẩm này', 404);

  const doiTac = String(body.doi_tac || '').trim() || null;
  const ghiChu = String(body.ghi_chu || '').trim() || null;
  const phieuId = 'px_' + crypto.randomUUID().slice(0, 12);
  const cauLenh = [];

  if (sp.theo_doi_hsd) {
    /* Lấy các lô còn hàng, sắp xếp cận hạn nhất trước (lô không có hạn xếp cuối).
       `l.id ASC` là chốt cuối (REV-0060 vòng 4 · THẤP-④): hai lô cùng HSD nhập
       trong cùng một giây thì `tao_luc` bằng nhau, và D1 KHÔNG hứa thứ tự nào
       cho phần hoà — đo được lô nhập SAU bị ăn trước. Tồn không sai, nhưng
       “cận hạn xuất trước” thành lời hứa suông và hai lần chạy ra hai kết quả. */
    const { results: los } = await env.DB.prepare(`
      SELECT l.id, l.so_lo, l.han_su_dung, COALESCE(SUM(g.so_luong), 0) AS ton
        FROM lo_hang l
        LEFT JOIN giao_dich_kho g ON g.lo_hang_id = l.id
       WHERE l.san_pham_id = ?
       GROUP BY l.id
      HAVING ton > 0
       ORDER BY (l.han_su_dung IS NULL), l.han_su_dung ASC, l.tao_luc ASC, l.id ASC
    `).bind(spId).all();

    const tongCo = los.reduce((s, l) => s + l.ton, 0);
    if (tongCo < soLuong) {
      return loi(`Tồn không đủ để xuất. "${sp.ten}" chỉ còn ${tongCo} ${sp.don_vi}.`);
    }

    let conLai = soLuong;
    for (const lo of los) {
      if (conLai <= 0) break;
      const tru = Math.min(conLai, lo.ton);
      cauLenh.push(env.DB.prepare(`
        INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, doi_tac, ghi_chu, nguoi_id)
        VALUES (?, ?, ?, 'xuat', ?, ?, ?, ?)
      `).bind(phieuId, spId, lo.id, -tru, doiTac, ghiChu, phien.nhan_su_id));
      conLai -= tru;
    }
  } else {
    // Không theo dõi HSD → chỉ cần đủ tổng tồn
    const row = await env.DB.prepare(
      'SELECT COALESCE(SUM(so_luong), 0) AS ton FROM giao_dich_kho WHERE san_pham_id = ?'
    ).bind(spId).first();
    if ((row.ton || 0) < soLuong) {
      return loi(`Tồn không đủ để xuất. "${sp.ten}" chỉ còn ${row.ton || 0} ${sp.don_vi}.`);
    }
    cauLenh.push(env.DB.prepare(`
      INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, doi_tac, ghi_chu, nguoi_id)
      VALUES (?, ?, NULL, 'xuat', ?, ?, ?, ?)
    `).bind(phieuId, spId, -soLuong, doiTac, ghiChu, phien.nhan_su_id));
  }

  await env.DB.batch(cauLenh);
  return json({ ok: true, phieu_id: phieuId });
}

/* ==========================================================================
   4b. PHIẾU ĐIỀU CHỈNH TỒN  — kéo sổ về đúng số ĐẾM ĐƯỢC ngoài kho
   --------------------------------------------------------------------------
   VÌ SAO CÓ (REV-0060 vòng 3 · CHẶN-ⓑ). Bảng `giao_dich_kho` có `loai =
   'dieu_chinh'` từ ngày đầu và báo cáo XNT đã có sẵn cột cho nó, nhưng KHÔNG
   một câu `INSERT` nào trong cả ERP từng ghi được một dòng như thế. Nghĩa là
   cột ấy chỉ tồn tại trên giấy. Hệ quả đo được: nạp nhầm tồn → kho bán mất
   vài món → bấm “Gỡ lượt nạp” → 409 vì gỡ sẽ làm tồn ÂM → và câu từ chối chỉ
   sang “lập phiếu điều chỉnh ở màn Kho vận”, một cái màn không có. Lối duy
   nhất còn lại là mở D1 sửa tay — đúng cái việc REV-0060 sinh ra để xoá bỏ.

   ĐÂY LÀ ĐƯỜNG RA THẬT, và nó cũng là nghiệp vụ kho đúng: hàng vỡ, hàng hết
   hạn phải huỷ, kiểm kê lệch, tồn đầu kỳ nạp sai — mọi kho thật đều cần một
   chứng từ nói “sổ đang ghi X, đếm thật là Y, chênh vì lý do này”. Ghi một
   dòng có dấu vết vẫn tốt hơn vô hạn lần so với xoá ngược lịch sử.

   HAI LUẬT CỨNG:
   1. Người lập nhập TỒN THẬT ĐẾM ĐƯỢC (≥ 0), máy chủ tự tính phần chênh.
      KHÔNG cho nhập thẳng phần chênh: gõ nhầm dấu trừ là ra một con số hoàn
      toàn khác mà không ai nhìn ra, còn “đếm được bao nhiêu” thì anh Duy
      đọc lại được và cãi lại được.
   2. Sau điều chỉnh, tồn của MÃ và tồn của LÔ đều phải ≥ 0. Phiếu điều chỉnh
      là cửa sửa sai, không phải cửa lách bất biến TỒN ≥ 0 của module kho.

   AI ĐƯỢC LẬP: `duocDieuChinhKho` — Quản lý kho (anh Duy) · Kế toán trưởng
   (chị Hằng) · Admin. KHÔNG phải cả 17 bạn part-time có `thao_tac_kho`. Chọn
   chặt vì đây là cửa duy nhất trong ERP ghi thẳng một con số vào sổ cái mà
   không có chứng từ mua/bán đứng sau.

   ⚠️ VÌ SAO KHÔNG DÙNG LẠI `duocQuanLyKho` (Sếp Ngọc chốt 09/09/2026 · C2):
   Sếp mở thêm cho Kế toán trưởng — chị Hằng là người đối chiếu sổ với số kiểm
   kê, kéo sổ về đúng số đếm được là việc của chị. Nhưng `duocQuanLyKho` còn
   đèo theo quyền THÊM/SỬA MÃ HÀNG và quyền GỠ LƯỢT NẠP CỦA NGƯỜI KHÁC — mở
   bằng cách đó là trao nhầm hai thứ không ai xin. Nên tách một cờ riêng
   (`QUYEN_KHO.dieu_chinh` trong src/quyen.js). Nới thêm nữa là quyết định của
   Sếp, không phải của người viết mã.
   ========================================================================== */

/* Trần trên của một con số tồn (REV-0060 vòng 4 · CAO-①). Cột `so_luong` khai
   INTEGER, nhưng SQLite không ép kiểu: `"99999999999999999999"` lưu được thành
   `1e20` kiểu 'real', và mọi phép cộng tồn từ đó về sau đều là số thực. Trên
   `MAX_SAFE_INTEGER` thì `9007199254740993` lưu ra `…992` — lệch 1 mà không ai
   báo. Một tỷ đơn vị đã là gấp hàng vạn lần kho lớn nhất Alpha Green từng có;
   chạm trần nghĩa là gõ nhầm, và phải NÓI RA chứ không lặng lẽ nhận. */
const TRAN_TON = 1_000_000_000;

/* Đọc "số tồn thật đếm được" — trả `{ so }` hoặc `{ loi }`.
   ⚠️ KHÔNG `replace(/[.\s,]/g,'')` như bản trước: nuốt hết dấu chấm thì
   `"12.5"` kg thành `125` kg và ERP in ra một câu chúc mừng cho con số gấp 10
   (đo được ở REV-0060 vòng 4 · CAO-①). Cũng KHÔNG `replace(/[^\d]/g,'')`:
   dấu trừ ở cửa này là một Ý ĐỊNH, nuốt đi thì `-5` lặng lẽ thành `5`.
   Luật: hoặc số nguyên trần trụi (`^\d+$`), hoặc nhóm nghìn CHUẨN — cùng MỘT
   dấu ngăn, mỗi nhóm đúng 3 chữ số (`1.000` · `1,000` · `2 000` · `1.000.000`).
   Mọi thứ khác thì TỪ CHỐI VÀ NÓI RA. */
function docTonThat(tho) {
  /* Ép kiểu trước: `String(['7'])` là `'7'` nên một MẢNG lọt qua như số thường
     (đo được: `ton_thuc: ["7"]` → HTTP 200). Chỉ nhận chuỗi và số. */
  if (tho === null || tho === undefined || (typeof tho !== 'string' && typeof tho !== 'number')) {
    return { loi: 'Xin nhập số tồn THẬT đếm được (số nguyên từ 0 trở lên, có thể là 0).' };
  }
  const s = String(tho).trim();
  if (s === '') return { loi: 'Xin nhập số tồn THẬT đếm được (số nguyên từ 0 trở lên, có thể là 0).' };

  const catNgan = s.length > 20 ? s.slice(0, 20) + '…' : s;
  let sach = null;
  if (/^\d+$/.test(s)) sach = s;
  else {
    const nhom = s.match(/^(\d{1,3})((?:([.,\s])\d{3})+)$/);
    /* Cùng một dấu ngăn cho mọi nhóm — `1.000,000` là gõ nhầm, không phải
       một triệu. */
    if (nhom && new Set(nhom[2].replace(/\d/g, '')).size === 1) sach = s.replace(/[.,\s]/g, '');
  }
  if (sach === null) {
    return {
      loi: `“${catNgan}” không phải số tồn hợp lệ. ERP ghi tồn theo SỐ NGUYÊN — ` +
           `xin ghi số ĐẾM ĐƯỢC ngoài kho, từ 0 trở lên, không dấu trừ. ` +
           (/[.,]\s*\d{1,2}$/.test(s)
             ? `Hàng cân theo kg mà lẻ (12,5 kg) thì xin quy về đơn vị nhỏ hơn (12500 g) ` +
               `hoặc làm tròn rồi ghi rõ trong lý do — ERP KHÔNG tự bỏ dấu phẩy, ` +
               `vì bỏ đi là “12,5” thành “125” mà không ai nhìn ra.`
             : `Muốn giảm tồn thì ghi số CÒN LẠI, ERP tự tính phần chênh.`)
    };
  }

  const so = Number(sach);
  if (!Number.isSafeInteger(so) || so < 0) {
    return { loi: `“${catNgan}” vượt sức chứa của một con số nguyên trong sổ cái. ` +
                  `Tồn tối đa ERP nhận là ${TRAN_TON.toLocaleString('vi-VN')}.` };
  }
  if (so > TRAN_TON) {
    return { loi: `“${catNgan}” lớn hơn trần ${TRAN_TON.toLocaleString('vi-VN')} đơn vị mà ERP nhận cho một mã. ` +
                  `Con số này gần như chắc chắn là gõ nhầm — xin đếm lại. ` +
                  `Nếu kho thật sự có ngần này, xin báo người quản trị để nới trần.` };
  }
  return { so };
}

export async function dieuChinhKho(env, phien, body) {
  /* 403 NÓI THẲNG LÝ DO + chỉ đúng người lập giúp, không trả về im lặng
     (khuôn `danhSachTaiLieu` trong src/tai-lieu.js). Cắt ở MÁY CHỦ: gọi thẳng
     `POST /api/kho/dieu-chinh` vẫn ăn 403, ẩn nút ngoài giao diện chỉ là thêm. */
  if (!duocDieuChinhKho(phien)) {
    return loi('Bạn không có quyền lập phiếu điều chỉnh tồn kho. Sếp Ngọc chốt 09/09/2026: ' +
               'phiếu điều chỉnh ghi thẳng một con số vào sổ cái mà không có chứng từ mua – bán ' +
               'đứng sau, nên chỉ Quản lý kho, Kế toán trưởng và Admin lập được. ' +
               'Đếm ra lệch thì báo anh Phạm Khương Duy (Quản lý kho) kèm mã hàng và số đếm được.', 403);
  }

  const spId = String(body.san_pham_id || '').trim();
  if (!spId) return loi('Chưa chọn sản phẩm');

  const sp = await env.DB.prepare(
    'SELECT id, ten, don_vi, theo_doi_hsd, dang_ban FROM san_pham WHERE id = ?').bind(spId).first();
  if (!sp) return loi('Không tìm thấy sản phẩm này', 404);

  /* Số thật đếm được: cho phép 0 (đếm ra không còn cái nào) nên KHÔNG dùng
     `soNguyenDuong` — hàm đó coi 0 là không hợp lệ. */
  const doc = docTonThat(body.ton_thuc);
  if (doc.loi) return loi(doc.loi);
  const tonThuc = doc.so;

  const lyDo = String(body.ly_do || '').trim();
  if (lyDo.length < 5) {
    return loi('Xin ghi rõ LÝ DO điều chỉnh (ít nhất 5 ký tự) — VD: “kiểm kê 07/09, hàng vỡ 12 túi”, ' +
               '“gỡ lượt nạp tồn nhầm phiếu pn_xxx”. Sổ cái không nhận một con số không có lý do.');
  }

  const loId = String(body.lo_hang_id || '').trim() || null;

  /* ---- HÀNG THEO LÔ THÌ BẮT CHỌN LÔ (REV-0060 vòng 4 · CHẶN-①) ----------
     Bản trước CHỈ VIẾT ra luật này trong lời bình rồi `SELECT theo_doi_hsd`
     mà không dùng lần nào. Hậu quả đo được qua đúng đường ngón tay: lô A âm
     −100 · lô B 200, chọn mã rồi để trống ô lô, gõ 200 → HTTP 200 kèm câu
     “✓ từ 100 về 200 túi”, mà LÔ A VẪN −100 — đúng cái trạng thái CHẶN-ⓐ
     dựng ra để cấm, chỉ khác là nay nó đến sau một cái nút tên “Điều chỉnh”.
     Chiều lên còn dựng ra TỒN MA: mã 10 → 500 thì màn Kho vận và báo cáo XNT
     đều hiện 500, nhưng `xuatKho(100)` trả 400 “chỉ còn 10” — vì `xuatKho`
     với hàng theo lô cộng theo LÔ, không theo mã (`kho.js` mục 4).
     Chặn ở MÁY CHỦ trước, `required` ở giao diện chỉ là phép lịch sự. */
  if (sp.theo_doi_hsd && !loId) {
    /* Hỏi THỪA MỘT DÒNG rồi mới biết có cắt hay không — cùng khuôn `catBot`
       của cả repo. Kê thẳng 200 lô thì không ai đọc; kê 12 lô rồi IM là đúng
       lớp "cắt im lặng" mà `do-cat-im-lang` sinh ra để cấm. */
    const KE_LO = 12;
    const { results: thoLo } = await env.DB.prepare(`
      SELECT l.id, l.so_lo, l.han_su_dung, COALESCE(SUM(g.so_luong), 0) AS ton
        FROM lo_hang l
        LEFT JOIN giao_dich_kho g ON g.lo_hang_id = l.id
       WHERE l.san_pham_id = ?
       GROUP BY l.id
       ORDER BY (l.han_su_dung IS NULL), l.han_su_dung ASC, l.tao_luc ASC, l.id ASC
       LIMIT ${KE_LO + 1}
    `).bind(spId).all();
    const { ds: dsLo, biCat: cat } = catBot({ results: thoLo || [] }, KE_LO);
    const ke = dsLo.map(l =>
      `“${l.so_lo || l.id}”${l.han_su_dung ? ' (HSD ' + String(l.han_su_dung).split('-').reverse().join('/') + ')' : ''}` +
      ` sổ ghi ${Number(l.ton || 0).toLocaleString('vi-VN')}${Number(l.ton || 0) < 0 ? ' ⚠ ÂM' : ''}`).join(' · ');
    /* Cắt thì NÓI RA và chỉ đường: ô chọn lô ở màn Điều chỉnh liệt kê đủ. */
    const cauCat = cat
      ? ` (mới kê ${KE_LO} lô cận hạn nhất, mã này còn lô nữa — xem đủ ở ô chọn lô trên màn Điều chỉnh)`
      : '';
    return loi(
      `“${sp.ten}” là hàng THEO DÕI HẠN SỬ DỤNG — tồn của nó nằm ở từng LÔ, ` +
      `nên phải chọn đúng lô để điều chỉnh. Sửa ở mức mã sẽ để lại lô âm mà màn Xuất kho ` +
      `không nhìn thấy, hoặc dựng ra tồn ma không lấy ra được. ` +
      (ke
        ? `Các lô của mã này: ${ke}${cauCat}. Xin chọn một lô rồi lập lại phiếu.`
        : `Mã này chưa có lô nào trong sổ — xin nhập kho một phiếu (có Số lô) trước, ` +
          `hoặc bỏ “theo dõi hạn dùng” cho mã này nếu kho không quản theo lô.`));
  }

  let lo = null;
  if (loId) {
    /* Ngược lại: hàng KHÔNG theo lô mà gửi kèm `lo_hang_id` thì dòng lô ấy là
       RÁC CÂM — `xuatKho` đi đường mã nên không bao giờ đọc tới nó, và tồn mã
       với tồn lô lệch nhau vĩnh viễn (đo: mã 17 / lô 7). Từ chối. */
    if (!sp.theo_doi_hsd) {
      return loi(`“${sp.ten}” KHÔNG theo dõi hạn sử dụng — tồn của nó nằm ở mức mã, không ở lô. ` +
                 `Xin bỏ trống ô lô rồi lập lại phiếu.`);
    }
    lo = await env.DB.prepare(
      'SELECT id, so_lo, han_su_dung, san_pham_id FROM lo_hang WHERE id = ?').bind(loId).first();
    if (!lo) return loi('Không tìm thấy lô hàng này', 404);
    if (String(lo.san_pham_id) !== spId) return loi('Lô hàng này không thuộc mã hàng đang chọn');
  }

  /* Tồn đang ghi trong sổ — cộng dồn THÔ, có tính cả dòng âm. Đây đúng là chỗ
     KHÔNG được lọc `ton > 0`: cái cần sửa thường chính là một lô đang âm. */
  /* Một chuỗi con dùng cho CẢ phép đọc lẫn phép kiểm lúc ghi — hai câu khác
     nhau là hai câu sẽ lệch nhau, mà lệch ở đây nghĩa là chốt chặn đồng thời
     canh một con số không phải con số vừa đọc. */
  const DU_LO = 'SELECT COALESCE(SUM(so_luong),0) FROM giao_dich_kho WHERE lo_hang_id = ?';
  const DU_MA = 'SELECT COALESCE(SUM(so_luong),0) FROM giao_dich_kho WHERE san_pham_id = ?';
  const dangGhi = Number((await env.DB.prepare(
    `SELECT (${loId ? DU_LO : DU_MA}) AS ton`).bind(loId || spId).first())?.ton || 0);

  const lech = tonThuc - dangGhi;
  if (lech === 0) {
    return loi(`Sổ đang ghi đúng ${dangGhi.toLocaleString('vi-VN')} ${sp.don_vi || 'đơn vị'}` +
               `${lo ? ` cho lô “${lo.so_lo || lo.id}”` : ''} — không có gì để điều chỉnh.`);
  }

  /* Sau điều chỉnh, tồn của MÃ cũng phải ≥ 0 (điều chỉnh một lô vẫn kéo tổng
     của mã xuống). Bất biến TỒN ≥ 0 là của cả module kho, không riêng lô. */
  let tonMa = dangGhi;
  if (loId) {
    tonMa = Number((await env.DB.prepare(`SELECT (${DU_MA}) AS ton`).bind(spId).first())?.ton || 0);
    if (tonMa + lech < 0) {
      return loi(`Không lập được: sổ đang ghi tồn ${tonMa.toLocaleString('vi-VN')} ${sp.don_vi || 'đơn vị'} ` +
                 `cho “${sp.ten}”, điều chỉnh lô này ${lech.toLocaleString('vi-VN')} sẽ làm tồn của cả mã ÂM. ` +
                 `Xin kiểm lại số đếm được, hoặc điều chỉnh các lô khác trước.`);
    }
  }

  /* ---- GHI BẰNG MỘT CÂU CÓ ĐIỀU KIỆN (REV-0060 vòng 4 · CHẶN-②) --------
     Bản trước đọc số dư ở một lượt `await` rồi `INSERT` ở lượt sau: không
     giao dịch, không khoá, không kiểm lại. Hai người cùng bấm trên MỘT lô
     thì cả hai cùng đọc 100, cùng tính chênh −100, cả hai được ghi ⇒ LÔ =
     −100 (đo được: 200/200, lô âm, tồn mã âm). Kiểm kê cuối tháng chính là
     lúc hai người cùng ngồi sửa cùng một mã, và `TỒN ≥ 0` không phải thứ
     được phép hỏng theo xác suất.
     Cách đóng — đúng cách đã dùng cho `huyLuotNap` ở CAO-④ đợt này: không
     khoá, mà nhét phép kiểm VÀO CHÍNH câu ghi. `INSERT … SELECT … WHERE
     (số dư đọc lúc nãy vẫn đúng)` là một phép so-và-đặt nguyên tử của D1;
     người thứ hai ghi 0 dòng và biết ngay mình là người thứ hai.
     Kiểm CẢ HAI vế khi có lô: số dư LÔ và số dư MÃ đều phải chưa đổi — bằng
     không thì bất biến “tồn mã ≥ 0” vừa kiểm ở trên lại hỏng theo đường mã. */
  const phieuId = 'pd_' + crypto.randomUUID().slice(0, 12);
  const ghiChu = `Điều chỉnh tồn: sổ ghi ${dangGhi} → đếm thật ${tonThuc}. Lý do: ${lyDo.slice(0, 400)}`;
  const dieuKien = loId
    ? `WHERE (${DU_LO}) = ? AND (${DU_MA}) = ?`
    : `WHERE (${DU_MA}) = ?`;
  const thamSo = loId ? [loId, dangGhi, spId, tonMa] : [spId, dangGhi];
  const kq = await env.DB.prepare(`
    INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, doi_tac, ghi_chu, nguoi_id)
    SELECT ?, ?, ?, 'dieu_chinh', ?, NULL, ?, ?
    ${dieuKien}
  `).bind(phieuId, spId, loId, lech, ghiChu, phien.nhan_su_id, ...thamSo).run();

  /* D1 thật trả cả `changes` lẫn `rows_written`; ổ giả của bàn đo chỉ trả một
     trong hai. Đọc cái nào có — nhưng KHÔNG mặc định là 1 khi thiếu cả hai,
     vì mặc định-thành-thành-công đúng là cách chốt chặn này chết âm thầm. */
  const daGhi = Number(kq?.meta?.changes ?? kq?.meta?.rows_written ?? 0);
  if (!daGhi) {
    return loi(
      `Số dư ${lo ? `của lô “${lo.so_lo || lo.id}”` : 'của mã này'} vừa thay đổi ngay lúc bạn bấm ` +
      `(có người khác vừa nhập/xuất/điều chỉnh). ERP KHÔNG ghi phiếu nào cả — ` +
      `xin bấm “Làm mới”, xem lại số sổ đang ghi rồi lập phiếu lần nữa.`, 409);
  }

  /* ---- SỔ VẾT TRA ĐƯỢC BẰNG MÁY (REV-0060 vòng 4 · CAO-④) --------------
     `ghi_chu` là một câu tiếng Việt: đọc được bằng mắt, nhưng không lọc được,
     không thống kê được “tháng này điều chỉnh mất bao nhiêu vì hàng vỡ”, và
     đổi câu chữ một lần là mọi phiếu cũ đọc máy không ra. Ghi thêm MỘT dòng
     `lich_su_thay_doi_nen` — đúng bảng mọi cửa sửa dữ liệu nền đang dùng, 0
     migration, và cửa đọc `?bang=giao_dich_kho` đã mở sẵn từ vòng trước.
     `truong = 'dieu_chinh'` nên KHÔNG lẫn với `'nap_file'` của `dsLuotNap`
     hay của hai câu số dư trong `huyLuotNap`.
     Bọc `try`: sổ cái là sự thật, sổ vết là phần thêm — mất sổ vết thì báo
     vào console, KHÔNG được nuốt mất một phiếu đã ghi thành công. */
  try {
    await env.DB.prepare(`
      INSERT INTO lich_su_thay_doi_nen (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi,
                                        nguoi_id, nguoi_ten, ly_do, luc)
      VALUES ('giao_dich_kho', ?, 'dieu_chinh', ?, ?, ?, ?, ?, datetime('now','+7 hours'))
    `).bind(phieuId, String(dangGhi), String(tonThuc), phien.nhan_su_id,
            phien?.ho_ten || phien?.ten_dang_nhap || null, lyDo.slice(0, 400)).run();
  } catch (e) {
    console.error('Ghi vết phiếu điều chỉnh:', e && e.message);
  }

  /* Mã đã NGỪNG BÁN vẫn điều chỉnh được — CÓ CHỦ Ý, và đây là chỗ viết ra
     (REV-0060 vòng 4 · CAO-③). `nhapKho` từ chối `dang_ban = 0` vì nhập thêm
     hàng cho một mã đã ngừng kinh doanh là sai; nhưng ĐẾM LẠI và ghi giảm về
     0 cho hàng tồn của mã đã ngừng bán là việc kho thật phải làm (thanh lý,
     huỷ hàng hết hạn). Cấm ở đây thì tồn của mã ngừng bán treo vĩnh viễn.
     Đổi lại phải NÓI RA, vì `danhSachSanPham` chỉ lấy `dang_ban = 1` nên sửa
     xong không nhìn thấy ở màn nào. */
  const nhacNgungBan = sp.dang_ban ? '' :
    ` ⚠ “${sp.ten}” đã NGỪNG KINH DOANH — phiếu vẫn vào sổ cái và báo cáo XNT, ` +
    `nhưng mã này không hiện ở danh sách tồn kho nên số vừa sửa chỉ tra lại được qua báo cáo.`;

  return json({
    ok: true, phieu_id: phieuId,
    san_pham_id: spId, lo_hang_id: loId,
    ton_truoc: dangGhi, ton_sau: tonThuc, chenh_lech: lech,
    tin: `Đã lập phiếu điều chỉnh ${phieuId}: ` +
         `${lo ? `lô “${lo.so_lo || lo.id}” của ` : ''}“${sp.ten}” từ ${dangGhi.toLocaleString('vi-VN')} ` +
         `về ${tonThuc.toLocaleString('vi-VN')} ${sp.don_vi || 'đơn vị'} ` +
         `(${lech > 0 ? '+' : ''}${lech.toLocaleString('vi-VN')}). Lý do đã ghi vào sổ cái.` + nhacNgungBan
  });
}

/* ==========================================================================
   5. CHI TIẾT TỒN THEO LÔ (cho một sản phẩm)
   ========================================================================== */

export async function loTheoSanPham(env, phien, spId, tatCa = false) {
  spId = String(spId || '').trim();
  if (!spId) return loi('Thiếu mã sản phẩm');

  /* `HAVING ton > 0` là ĐÚNG cho màn xuất kho (chọn lô để lấy hàng ra) nhưng
     SAI cho màn điều chỉnh: lô cần sửa thường chính là lô đang ÂM, mà lô âm
     thì lưới này lọc mất — người đi sửa không nhìn thấy đúng cái mình phải
     sửa (REV-0060 vòng 3 · CHẶN-ⓐ/ⓑ). `tatCa` mở lưới ra cho đường đó.

     ⚠️ `tatCa` bỏ HẲN mệnh đề lọc, không đổi thành `ton <> 0` (REV-0060 vòng 4).
     Từ vòng này máy chủ BẮT chọn lô với hàng theo dõi HSD (CHẶN-①), nên ô chọn
     lô là lối đi DUY NHẤT: lô nào không hiện ở đây là lô không sửa được. Mà lô
     `ton = 0` đúng là ca phải sửa được — kiểm kê thấy còn hàng thật trong khi
     sổ ghi 0, hoặc một lô âm vừa được kéo về 0 rồi phát hiện đếm nhầm.
     `l.id ASC` chốt cuối cho thứ tự xác định (THẤP-④). */
  const { results } = await env.DB.prepare(`
    SELECT l.id, l.so_lo, l.han_su_dung, l.tao_luc, COALESCE(SUM(g.so_luong), 0) AS ton
      FROM lo_hang l
      LEFT JOIN giao_dich_kho g ON g.lo_hang_id = l.id
     WHERE l.san_pham_id = ?
     GROUP BY l.id
    ${tatCa ? '' : 'HAVING ton > 0'}
     ORDER BY (l.han_su_dung IS NULL), l.han_su_dung ASC, l.tao_luc ASC, l.id ASC
  `).bind(spId).all();

  /* `tao_luc` trả kèm để giao diện phân biệt được HAI LÔ TRÙNG TÊN (REV-0060
     vòng 4 · THẤP-③): hai lượt nạp cùng “Số lô LO-A” đẻ ra hai dòng `lo_hang`
     khác nhau, cùng tên, cùng HSD — ô chọn lô hiện hai dòng giống hệt nhau và
     người đi sửa không biết mình đang sửa cái nào. */
  const los = results.map(l => ({
    id: l.id, so_lo: l.so_lo, han_su_dung: l.han_su_dung, ton: l.ton,
    tao_luc: l.tao_luc || null,
    so_ngay_toi_han: soNgayToi(l.han_su_dung)
  }));

  return json({ lo: los });
}

/* ==========================================================================
   6. BÁO CÁO XUẤT–NHẬP–TỒN theo kỳ
   --------------------------------------------------------------------------
   Với mỗi sản phẩm: tồn đầu kỳ, nhập trong kỳ, xuất trong kỳ, điều chỉnh,
   tồn cuối kỳ. Tất cả suy ra từ sổ cái — không cần chốt sổ tay.
   ========================================================================== */

export async function baoCaoXNT(env, phien, tu, den) {
  tu = String(tu || '').trim();
  den = String(den || '').trim();
  if (!LA_NGAY(tu) || !LA_NGAY(den)) return loi('Khoảng thời gian phải dạng YYYY-MM-DD');
  if (tu > den) return loi('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');

  const { results } = await env.DB.prepare(`
    SELECT sp.id, sp.ma_sku, sp.ten, sp.don_vi, sp.danh_muc,
           COALESCE(SUM(CASE WHEN substr(g.luc,1,10) <  ?                         THEN g.so_luong END), 0) AS ton_dau,
           COALESCE(SUM(CASE WHEN g.loai='nhap'        AND substr(g.luc,1,10) BETWEEN ? AND ? THEN g.so_luong END), 0) AS nhap,
           COALESCE(-SUM(CASE WHEN g.loai='xuat'       AND substr(g.luc,1,10) BETWEEN ? AND ? THEN g.so_luong END), 0) AS xuat,
           COALESCE(SUM(CASE WHEN g.loai='dieu_chinh'  AND substr(g.luc,1,10) BETWEEN ? AND ? THEN g.so_luong END), 0) AS dieu_chinh,
           COALESCE(SUM(CASE WHEN substr(g.luc,1,10) <= ?                        THEN g.so_luong END), 0) AS ton_cuoi
      FROM san_pham sp
      LEFT JOIN giao_dich_kho g ON g.san_pham_id = sp.id
     WHERE sp.dang_ban = 1
     GROUP BY sp.id
     ORDER BY sp.ten
  `).bind(tu, tu, den, tu, den, tu, den, den).all();

  // Chỉ giữ dòng có phát sinh hoặc có tồn (bỏ mã hàng hoàn toàn trống trong kỳ)
  const bang = results.filter(r =>
    r.ton_dau || r.nhap || r.xuat || r.dieu_chinh || r.ton_cuoi);

  return json({ tu, den, bang });
}

/* ==========================================================================
   7. LỊCH SỬ GIAO DỊCH của một sản phẩm (mới nhất trước)
   ========================================================================== */

export async function lichSu(env, phien, spId, gioiHan) {
  spId = String(spId || '').trim();
  if (!spId) return loi('Thiếu mã sản phẩm');
  const gh = Math.min(Math.max(parseInt(gioiHan, 10) || 30, 1), 200);
  const xemGiaVon = duocXemGiaVon(phien);

  const { results } = await env.DB.prepare(`
    SELECT g.loai, g.so_luong, ${xemGiaVon ? 'g.don_gia' : 'NULL AS don_gia'},
           g.doi_tac, g.ghi_chu, g.luc, g.phieu_id,
           lo.so_lo, lo.han_su_dung, ns.ho_ten AS nguoi
      FROM giao_dich_kho g
      LEFT JOIN lo_hang lo ON lo.id = g.lo_hang_id
      LEFT JOIN nhan_su ns ON ns.id = g.nguoi_id
     WHERE g.san_pham_id = ?
     ORDER BY g.luc DESC, g.id DESC
     LIMIT ?
  `).bind(spId, gh).all();

  return json({ lich_su: results });
}
