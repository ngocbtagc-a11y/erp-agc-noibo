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

import { duocThaoTacKho, duocQuanLyKho, duocXemGiaVon, duocSuaSanPham, duocKhoaSanPham, laAdmin } from './quyen.js';
import { ghiLichSuThayDoi } from './dulieunen.js';

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
    // Lấy các lô còn hàng, sắp xếp cận hạn nhất trước (lô không có hạn xếp cuối)
    const { results: los } = await env.DB.prepare(`
      SELECT l.id, l.so_lo, l.han_su_dung, COALESCE(SUM(g.so_luong), 0) AS ton
        FROM lo_hang l
        LEFT JOIN giao_dich_kho g ON g.lo_hang_id = l.id
       WHERE l.san_pham_id = ?
       GROUP BY l.id
      HAVING ton > 0
       ORDER BY (l.han_su_dung IS NULL), l.han_su_dung ASC, l.tao_luc ASC
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
   5. CHI TIẾT TỒN THEO LÔ (cho một sản phẩm)
   ========================================================================== */

export async function loTheoSanPham(env, phien, spId) {
  spId = String(spId || '').trim();
  if (!spId) return loi('Thiếu mã sản phẩm');

  const { results } = await env.DB.prepare(`
    SELECT l.id, l.so_lo, l.han_su_dung, COALESCE(SUM(g.so_luong), 0) AS ton
      FROM lo_hang l
      LEFT JOIN giao_dich_kho g ON g.lo_hang_id = l.id
     WHERE l.san_pham_id = ?
     GROUP BY l.id
    HAVING ton > 0
     ORDER BY (l.han_su_dung IS NULL), l.han_su_dung ASC, l.tao_luc ASC
  `).bind(spId).all();

  const los = results.map(l => ({
    id: l.id, so_lo: l.so_lo, han_su_dung: l.han_su_dung, ton: l.ton,
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
