/* ==========================================================================
   R&D SẢN PHẨM — New Product Development (Domain: P. Kinh Doanh-MKT)
   ---------------------------------------------------------------------------
   Spec: docs/FEATURE-SPEC-RND-SANPHAM.md — Boundary LOCAL_DOMAIN.

   Data Owner: Kinh doanh (cùng chủ với Sản phẩm/SKU — họ quyết định bán gì,
   xem docs/DATA_OWNERSHIP_MATRIX.md). Vì vậy TÁI DÙNG đúng 2 hàm quyền đã
   có của Sản phẩm thay vì đẻ quyền mới (KHÔNG sửa src/quyen.js):
     - duocSuaSanPham()  -> tạo/sửa dự án, tick bước, chuyển giai đoạn
     - duocKhoaSanPham() -> bỏ qua việc bắt buộc + huỷ dự án
     - laBanGiamDoc()    -> cổng Duyệt ra mắt (Go/No-Go) — CHỈ Ban Giám đốc
                            (Sếp Ngọc chốt 11/09/2026)
   XEM thì chặn ở index.js theo tab 'kinhdoanh' (chặn kép giống taisan.js).

   Vòng đời 1 dự án — 12 giai đoạn cố định, đi tuần tự:
     y_tuong -> tham_dinh -> nguon_hang -> mau_thu -> cam_quan -> kiem_nghiem
     -> bao_bi -> gia_thanh -> san_xuat_thu -> duyet_ra_mat -> ra_mat
     -> theo_doi -> (trang_thai = hoan_thanh)
   Ngoài luồng: tam_dung (giữ nguyên giai đoạn, quay lại được) · huy (kết
   thúc, GIỮ dữ liệu để tra cứu — không xoá cứng, Rule 10).

   Mọi thay đổi ghi vào rnd_lich_su (sổ cái bất biến, chỉ INSERT) — cùng
   khuôn tai_san_lich_su/giao_dich_kho đã dùng trong ERP này.
   ========================================================================== */

import { duocSuaSanPham, duocKhoaSanPham } from './quyen.js';
import { sinhMa } from './dinh-danh.js';
/* Định nghĩa Ban Giám đốc DÙNG CHUNG với cổng duyệt góp ý — chức vụ (cắt phần
   "kiêm …") hoặc hộp phòng ban cấp công ty. Không đẻ định nghĩa thứ hai. */
import { laBanGiamDoc } from './gopy-cua-duyet.js';

function json(d, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
function loi(msg, status = 400) { return json({ loi: msg }, status); }

function chuoi(v) { const s = String(v ?? '').trim(); return s || null; }
function soNguyen(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/* ==========================================================================
   KHUÔN QUY TRÌNH — quy trình phát triển sản phẩm THỰC PHẨM, A→Z
   ---------------------------------------------------------------------------
   Đây là CODE chứ không phải dữ liệu người dùng tự sửa: nếu để mỗi dự án tự
   đặt bước riêng thì hết so sánh được dự án nào đang tắc ở đâu, và mất luôn
   tác dụng của cổng chặn. Muốn đổi quy trình thì sửa đúng 1 chỗ ở đây —
   dự án ĐANG CHẠY giữ nguyên bộ bước lúc bắt đầu (đã lưu ở rnd_buoc), chỉ
   dự án tạo mới nhận khuôn mới (Rule 10 — lịch sử cũ phải còn đúng).

   bat_buoc = true  -> chưa xong thì KHÔNG qua cổng sang giai đoạn sau được
                       (trừ khi người có quyền khoá SKU bấm "bỏ qua kèm lý do").
   Các bước phụ thuộc tình huống (mã vạch GS1, mẫu lần 2, quy định riêng cho
   trẻ nhỏ...) cố tình để bat_buoc = false + có nút "Không áp dụng" — bắt
   buộc hết là cách nhanh nhất khiến người dùng bỏ quy trình giữa chừng.

   Lưu ý phạm vi: checklist này là LỜI NHẮC VẬN HÀNH cho đội Kinh doanh,
   không phải tư vấn pháp lý. Tên nghị định ghi kèm để người làm biết tra
   đúng chỗ, không thay cho việc hỏi đơn vị chuyên môn.
   ========================================================================== */
export const GIAI_DOAN = [
  { ma: 'y_tuong',      so: 1,  ten: 'Ý tưởng' },
  { ma: 'tham_dinh',    so: 2,  ten: 'Thẩm định thị trường' },
  { ma: 'nguon_hang',   so: 3,  ten: 'Nguồn hàng & nguyên liệu' },
  { ma: 'mau_thu',      so: 4,  ten: 'Công thức & mẫu thử' },
  { ma: 'cam_quan',     so: 5,  ten: 'Thử nếm & cảm quan' },
  { ma: 'kiem_nghiem',  so: 6,  ten: 'Kiểm nghiệm & pháp lý' },
  { ma: 'bao_bi',       so: 7,  ten: 'Bao bì & nhãn' },
  { ma: 'gia_thanh',    so: 8,  ten: 'Giá thành & định giá' },
  { ma: 'san_xuat_thu', so: 9,  ten: 'Sản xuất thử (lô pilot)' },
  { ma: 'duyet_ra_mat', so: 10, ten: 'Duyệt ra mắt (Go/No-Go)' },
  { ma: 'ra_mat',       so: 11, ten: 'Ra mắt & lên sàn' },
  { ma: 'theo_doi',     so: 12, ten: 'Theo dõi sau ra mắt' }
];

const MA_GIAI_DOAN = GIAI_DOAN.map(g => g.ma);

/* Giai đoạn 10 là CỔNG DUYỆT: chỉ người có quyền khoá SKU (Kinh doanh +
   Admin) mới đẩy được từ đây sang Ra mắt. */
const GIAI_DOAN_CAN_DUYET = 'duyet_ra_mat';

const KHUON_QUY_TRINH = {
  y_tuong: [
    { ten: 'Mô tả ý tưởng & lý do nên làm sản phẩm này', bat_buoc: true },
    { ten: 'Nguồn ý tưởng (khách hỏi / đối thủ / xu hướng sàn / nội bộ)', bat_buoc: false },
    { ten: 'Xác định khách hàng nhắm tới (ai mua, mua cho ai, vì sao)', bat_buoc: true },
    { ten: 'Kiểm tra trùng với sản phẩm đang bán / dự án R&D khác', bat_buoc: true }
  ],
  tham_dinh: [
    { ten: 'Khảo sát nhu cầu trên Shopee/TikTok (lượt tìm, top bán, xu hướng)', bat_buoc: true },
    { ten: 'Liệt kê đối thủ đang bán mặt hàng này + giá bán của họ', bat_buoc: true },
    { ten: 'Ước lượng sản lượng/tháng và giá bán mục tiêu', bat_buoc: true },
    { ten: 'Xác định điểm khác biệt so với đối thủ (vì sao khách chọn mình)', bat_buoc: true },
    { ten: 'Kết luận: đi tiếp hay dừng', bat_buoc: true }
  ],
  nguon_hang: [
    { ten: 'Tìm và so sánh ít nhất 2 nhà cung cấp', bat_buoc: true },
    { ten: 'Xin báo giá + số lượng tối thiểu (MOQ) + thời gian giao', bat_buoc: true },
    { ten: 'Thu hồ sơ NCC: giấy phép kinh doanh, GCN đủ điều kiện ATTP', bat_buoc: true },
    { ten: 'Thu hồ sơ nguyên liệu: công bố/CO/CQ, phiếu kiểm nghiệm nguyên liệu', bat_buoc: true },
    { ten: 'Kiểm tra chứng nhận hữu cơ (nếu định gắn nhãn organic)', bat_buoc: false },
    { ten: 'Đánh giá năng lực giao hàng ổn định (đủ hàng khi bán chạy)', bat_buoc: false }
  ],
  mau_thu: [
    { ten: 'Chốt quy cách: khối lượng tịnh, thành phần, dạng đóng gói', bat_buoc: true },
    { ten: 'Nhận mẫu thử lần 1 từ NCC', bat_buoc: true },
    { ten: 'Yêu cầu chỉnh & nhận mẫu lần 2 (nếu mẫu 1 chưa đạt)', bat_buoc: false },
    { ten: 'Chốt mẫu cuối cùng để làm hồ sơ + bao bì', bat_buoc: true },
    { ten: 'Lưu mẫu đối chứng để so sánh khi vào hàng loạt', bat_buoc: true }
  ],
  cam_quan: [
    { ten: 'Thử nếm nội bộ tối thiểu 5 người, chấm vị / mùi / màu / kết cấu', bat_buoc: true },
    { ten: 'Gửi mẫu cho nhóm khách hàng thân thiết lấy phản hồi thật', bat_buoc: false },
    { ten: 'So sánh trực tiếp với sản phẩm cùng loại của đối thủ', bat_buoc: false },
    { ten: 'Kết luận: đạt để đi tiếp, hay quay lại chỉnh công thức', bat_buoc: true }
  ],
  kiem_nghiem: [
    { ten: 'Gửi mẫu kiểm nghiệm tại phòng lab được chỉ định', bat_buoc: true },
    { ten: 'Nhận phiếu kết quả kiểm nghiệm ĐẠT (lưu bản gốc)', bat_buoc: true },
    { ten: 'Làm hồ sơ tự công bố / đăng ký bản công bố sản phẩm (NĐ 15/2018)', bat_buoc: true },
    { ten: 'Xác nhận hồ sơ ATTP của cơ sở sản xuất còn hiệu lực', bat_buoc: true },
    { ten: 'Sản phẩm cho trẻ nhỏ / ăn dặm: rà quy định riêng trước khi bán', bat_buoc: false },
    { ten: 'Xác định hạn sử dụng công bố + điều kiện bảo quản', bat_buoc: true }
  ],
  bao_bi: [
    { ten: 'Thiết kế nhãn đủ nội dung bắt buộc (NĐ 43/2017, sửa đổi 111/2021): tên hàng, thành phần, định lượng, NSX–HSD, hướng dẫn sử dụng & bảo quản, tên & địa chỉ chịu trách nhiệm, xuất xứ', bat_buoc: true },
    { ten: 'Ghi cảnh báo dị ứng / đối tượng không nên dùng (nếu có)', bat_buoc: false },
    { ten: 'Đăng ký mã vạch GS1 cho mã hàng mới', bat_buoc: false },
    { ten: 'Duyệt maquette + in thử, kiểm tra lỗi chữ trước khi in hàng loạt', bat_buoc: true },
    { ten: 'Chốt quy cách đóng gói: lẻ, lốc, thùng carton, vật liệu chống ẩm/vỡ', bat_buoc: true }
  ],
  gia_thanh: [
    { ten: 'Tính giá vốn đủ: nguyên liệu + gia công + bao bì + hao hụt', bat_buoc: true },
    { ten: 'Cộng chi phí bán hàng: phí sàn, phí thanh toán, ship, đóng gói', bat_buoc: true },
    { ten: 'Cộng chi phí marketing dự kiến (ads, KOC, voucher, livestream)', bat_buoc: false },
    { ten: 'Chốt giá bán niêm yết + giá khuyến mãi sàn', bat_buoc: true },
    { ten: 'Kiểm tra biên lợi nhuận còn đạt mục tiêu sau tất cả chi phí', bat_buoc: true }
  ],
  san_xuat_thu: [
    { ten: 'Đặt lô sản xuất thử số lượng nhỏ', bat_buoc: true },
    { ten: 'Kiểm lô nhận: cảm quan, khối lượng tịnh, in date, niêm phong, bao bì', bat_buoc: true },
    { ten: 'Theo dõi độ ổn định / hạn sử dụng trên mẫu lưu', bat_buoc: true },
    { ten: 'Chốt định mức hao hụt và thời gian giao thực tế của NCC', bat_buoc: false },
    { ten: 'Xác nhận kho đủ điều kiện bảo quản mặt hàng này', bat_buoc: true }
  ],
  duyet_ra_mat: [
    { ten: 'Tập hợp hồ sơ: mẫu, kiểm nghiệm, công bố, nhãn, giá thành, kế hoạch bán', bat_buoc: true },
    { ten: 'Trình Ban giám đốc quyết định ra mắt / hoãn / dừng', bat_buoc: true }
  ],
  ra_mat: [
    { ten: 'Tạo mã hàng (SKU) trong ERP và gắn vào dự án này', bat_buoc: true },
    { ten: 'Nhập kho lô hàng đầu tiên (có số lô + hạn sử dụng)', bat_buoc: true },
    { ten: 'Lên listing Shopee: ảnh, tiêu đề, mô tả, phân loại, giá', bat_buoc: false },
    { ten: 'Lên listing TikTok Shop', bat_buoc: false },
    { ten: 'Chốt kế hoạch đẩy hàng 30 ngày đầu (ads / KOC / livestream / voucher)', bat_buoc: true },
    { ten: 'Hướng dẫn CSKH: công dụng, cách dùng, câu hỏi thường gặp', bat_buoc: false }
  ],
  theo_doi: [
    { ten: 'Rà doanh số + tồn kho sau 30 ngày', bat_buoc: true },
    { ten: 'Rà đánh giá của khách + tỉ lệ hoàn/hủy', bat_buoc: true },
    { ten: 'Rà lại biên lợi nhuận thực tế so với lúc tính giá', bat_buoc: true },
    { ten: 'Kết luận: giữ nguyên / cải tiến / ngừng kinh doanh', bat_buoc: true }
  ]
};

function thongTinGiaiDoan(ma) { return GIAI_DOAN.find(g => g.ma === ma) || null; }
function giaiDoanKe(ma) {
  const i = MA_GIAI_DOAN.indexOf(ma);
  return (i >= 0 && i < MA_GIAI_DOAN.length - 1) ? MA_GIAI_DOAN[i + 1] : null;
}
function giaiDoanTruoc(ma) {
  const i = MA_GIAI_DOAN.indexOf(ma);
  return i > 0 ? MA_GIAI_DOAN[i - 1] : null;
}

/* ==========================================================================
   TRUY VẤN
   ========================================================================== */

/* Cột SELECT dùng chung cho danh sách + chi tiết — 1 chỗ duy nhất, thêm cột
   mới chỉ sửa ở đây (Rule 5, tránh 2 câu SELECT lệch nhau). */
const RND_COT = `
  d.id, d.ma_rnd, d.ten, d.nhom_hang, d.doi_tuong, d.kenh, d.y_tuong,
  d.giai_doan, d.trang_thai, d.uu_tien, d.han_ra_mat,
  d.gia_ban_du_kien, d.gia_von_du_kien, d.ghi_chu, d.ly_do_dung,
  d.phu_trach_id, pt.ho_ten AS phu_trach_ten, pt.ma_nv AS phu_trach_ma,
  d.san_pham_id, sp.ma_sku AS san_pham_sku, sp.ten AS san_pham_ten,
  d.tao_boi, tb.ho_ten AS tao_boi_ten, d.tao_luc, d.cap_nhat_luc
`;
const RND_TU = `
  rnd_du_an d
  LEFT JOIN nhan_su  pt ON pt.id = d.phu_trach_id
  LEFT JOIN nhan_su  tb ON tb.id = d.tao_boi
  LEFT JOIN san_pham sp ON sp.id = d.san_pham_id
`;

/* Đếm bước xong/tổng trong 1 câu — không N+1 query cho từng dự án.
   "khong_ap_dung" tính là đã xử lý xong (không còn chờ ai làm nữa). */
const RND_TIEN_DO = `
  (SELECT COUNT(*) FROM rnd_buoc b WHERE b.du_an_id = d.id) AS tong_buoc,
  (SELECT COUNT(*) FROM rnd_buoc b WHERE b.du_an_id = d.id
     AND b.trang_thai IN ('xong','khong_ap_dung')) AS buoc_xong
`;

export async function danhSachDuAn(env, phien) {
  const { results } = await env.DB.prepare(`
    SELECT ${RND_COT}, ${RND_TIEN_DO}
      FROM ${RND_TU}
     WHERE d.hoat_dong = 1
     ORDER BY
       CASE d.trang_thai WHEN 'dang_lam' THEN 0 WHEN 'tam_dung' THEN 1
                         WHEN 'hoan_thanh' THEN 2 ELSE 3 END,
       CASE d.uu_tien WHEN 'cao' THEN 0 WHEN 'trung_binh' THEN 1 ELSE 2 END,
       COALESCE(d.han_ra_mat, '9999-12-31'),
       d.tao_luc DESC
  `).all();

  return json({
    ds: results,
    giai_doan: GIAI_DOAN,
    quyen: {
      sua: duocSuaSanPham(phien),
      duyet: duocKhoaSanPham(phien),
      // Cổng Duyệt ra mắt chỉ Ban Giám đốc — giao diện dùng cờ này để ẩn nút.
      duyet_ra_mat: await laBanGiamDoc(env, phien)
    },
    toi_id: phien.nhan_su_id
  });
}

export async function chiTietDuAn(env, id) {
  const idSach = chuoi(id);
  if (!idSach) return loi('Thiếu id dự án');

  const du_an = await env.DB.prepare(`
    SELECT ${RND_COT}, ${RND_TIEN_DO} FROM ${RND_TU} WHERE d.id = ? AND d.hoat_dong = 1
  `).bind(idSach).first();
  if (!du_an) return loi('Không tìm thấy dự án R&D', 404);

  const { results: buoc } = await env.DB.prepare(`
    SELECT b.*, n.ho_ten AS nguoi_lam_ten
      FROM rnd_buoc b
      LEFT JOIN nhan_su n ON n.id = b.nguoi_lam_id
     WHERE b.du_an_id = ?
     ORDER BY b.thu_tu, b.id
  `).bind(idSach).all();

  const { results: lich_su } = await env.DB.prepare(`
    SELECT ls.*, n.ho_ten AS nguoi_thuc_hien_ten
      FROM rnd_lich_su ls
      LEFT JOIN nhan_su n ON n.id = ls.nguoi_thuc_hien
     WHERE ls.du_an_id = ?
     ORDER BY ls.luc DESC, ls.id DESC
  `).bind(idSach).all();

  return json({ du_an, buoc, lich_su, giai_doan: GIAI_DOAN });
}

/* ==========================================================================
   GHI SỔ — sổ cái bất biến, chỉ INSERT
   ========================================================================== */
async function ghiSo(env, duAnId, loaiSuKien, phien, du = {}) {
  await env.DB.prepare(`
    INSERT INTO rnd_lich_su (du_an_id, loai_su_kien, giai_doan_cu, giai_doan_moi, ghi_chu, nguoi_thuc_hien)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    duAnId, loaiSuKien,
    du.giai_doan_cu ?? null, du.giai_doan_moi ?? null,
    du.ghi_chu ?? null, phien.nhan_su_id
  ).run();
}

/* Lấy dự án + chặn thao tác trên dự án đã huỷ/đã xong. Trả { du_an } hoặc
   { loi } để nơi gọi return thẳng — cùng khuôn batBuoc* trong index.js. */
async function layDuAnDangMo(env, id, choPhepDaXong = false) {
  const idSach = chuoi(id);
  if (!idSach) return { loi: loi('Thiếu id dự án') };
  const du_an = await env.DB.prepare('SELECT * FROM rnd_du_an WHERE id = ? AND hoat_dong = 1').bind(idSach).first();
  if (!du_an) return { loi: loi('Không tìm thấy dự án R&D', 404) };
  if (du_an.trang_thai === 'huy') return { loi: loi('Dự án đã huỷ — không sửa được nữa') };
  if (du_an.trang_thai === 'hoan_thanh' && !choPhepDaXong) return { loi: loi('Dự án đã hoàn thành — không sửa được nữa') };
  return { du_an };
}

/* ==========================================================================
   TẠO DỰ ÁN — sinh sẵn toàn bộ checklist 12 giai đoạn
   ========================================================================== */
export async function taoDuAn(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền tạo dự án R&D', 403);

  const ten = chuoi(body.ten);
  if (!ten) return loi('Vui lòng nhập tên sản phẩm dự kiến');

  const doiTuong = ['nguoi_lon', 'me_be', 'ca_hai'].includes(body.doi_tuong) ? body.doi_tuong : 'nguoi_lon';
  const kenh = ['shopee', 'tiktok', 'ca_hai'].includes(body.kenh) ? body.kenh : 'ca_hai';
  const uuTien = ['cao', 'trung_binh', 'thap'].includes(body.uu_tien) ? body.uu_tien : 'trung_binh';

  const id = 'rnd_' + crypto.randomUUID().slice(0, 12);
  const maRnd = await sinhMa(env, 'rnd_du_an');

  await env.DB.prepare(`
    INSERT INTO rnd_du_an (
      id, ma_rnd, ten, nhom_hang, doi_tuong, kenh, y_tuong,
      giai_doan, trang_thai, uu_tien, phu_trach_id, han_ra_mat,
      gia_ban_du_kien, gia_von_du_kien, ghi_chu, tao_boi
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'y_tuong', 'dang_lam', ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, maRnd, ten, chuoi(body.nhom_hang), doiTuong, kenh, chuoi(body.y_tuong),
    uuTien, chuoi(body.phu_trach_id), chuoi(body.han_ra_mat),
    soNguyen(body.gia_ban_du_kien), soNguyen(body.gia_von_du_kien), chuoi(body.ghi_chu),
    phien.nhan_su_id
  ).run();

  // Dựng sẵn toàn bộ bước — đây là chỗ tiết kiệm thao tác lớn nhất so với
  // làm tay (người dùng không phải gõ lại hàng chục dòng checklist).
  const lenh = [];
  let thuTu = 0;
  for (const g of MA_GIAI_DOAN) {
    for (const b of (KHUON_QUY_TRINH[g] || [])) {
      thuTu += 1;
      lenh.push(env.DB.prepare(`
        INSERT INTO rnd_buoc (du_an_id, giai_doan, thu_tu, ten, bat_buoc) VALUES (?, ?, ?, ?, ?)
      `).bind(id, g, thuTu, b.ten, b.bat_buoc ? 1 : 0));
    }
  }
  if (lenh.length) await env.DB.batch(lenh);

  await ghiSo(env, id, 'tao', phien, { giai_doan_moi: 'y_tuong', ghi_chu: `Tạo dự án R&D "${ten}"` });

  return json({ ok: true, id, ma_rnd: maRnd, so_buoc: lenh.length });
}

/* ==========================================================================
   SỬA THÔNG TIN CHUNG — KHÔNG đổi được ma_rnd (bất biến), KHÔNG đổi
   giai_doan/trang_thai ở đây (đi qua chuyenGiaiDoan/doiTrangThai để giữ vết).
   ========================================================================== */
export async function suaDuAn(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền sửa dự án R&D', 403);

  const { du_an, loi: l } = await layDuAnDangMo(env, body.id);
  if (l) return l;

  const ten = chuoi(body.ten);
  if (!ten) return loi('Vui lòng nhập tên sản phẩm dự kiến');

  const doiTuong = ['nguoi_lon', 'me_be', 'ca_hai'].includes(body.doi_tuong) ? body.doi_tuong : du_an.doi_tuong;
  const kenh = ['shopee', 'tiktok', 'ca_hai'].includes(body.kenh) ? body.kenh : du_an.kenh;
  const uuTien = ['cao', 'trung_binh', 'thap'].includes(body.uu_tien) ? body.uu_tien : du_an.uu_tien;

  await env.DB.prepare(`
    UPDATE rnd_du_an SET
      ten = ?, nhom_hang = ?, doi_tuong = ?, kenh = ?, y_tuong = ?, uu_tien = ?,
      phu_trach_id = ?, han_ra_mat = ?, gia_ban_du_kien = ?, gia_von_du_kien = ?, ghi_chu = ?,
      cap_nhat_boi = ?, cap_nhat_luc = datetime('now', '+7 hours')
    WHERE id = ?
  `).bind(
    ten, chuoi(body.nhom_hang), doiTuong, kenh, chuoi(body.y_tuong), uuTien,
    chuoi(body.phu_trach_id), chuoi(body.han_ra_mat),
    soNguyen(body.gia_ban_du_kien), soNguyen(body.gia_von_du_kien), chuoi(body.ghi_chu),
    phien.nhan_su_id, du_an.id
  ).run();

  await ghiSo(env, du_an.id, 'sua', phien, { ghi_chu: 'Cập nhật thông tin dự án' });
  return json({ ok: true });
}

/* ==========================================================================
   TICK 1 BƯỚC — việc làm nhiều nhất hằng ngày, phải rẻ (1 click)
   trang_thai: chua_lam | xong | khong_ap_dung
   ========================================================================== */
export async function capNhatBuoc(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền cập nhật bước R&D', 403);

  const buocId = soNguyen(body.buoc_id);
  if (!buocId) return loi('Thiếu bước cần cập nhật');

  const trangThai = ['chua_lam', 'xong', 'khong_ap_dung'].includes(body.trang_thai) ? body.trang_thai : null;
  if (!trangThai) return loi('Trạng thái bước không hợp lệ');

  const buoc = await env.DB.prepare('SELECT * FROM rnd_buoc WHERE id = ?').bind(buocId).first();
  if (!buoc) return loi('Không tìm thấy bước này', 404);

  const { du_an, loi: l } = await layDuAnDangMo(env, buoc.du_an_id);
  if (l) return l;

  // ket_qua: undefined = không đụng tới ghi chú cũ; chuỗi rỗng = xoá ghi chú.
  const coKetQua = body.ket_qua !== undefined;
  const ketQua = coKetQua ? chuoi(body.ket_qua) : null;

  await env.DB.prepare(`
    UPDATE rnd_buoc SET
      trang_thai = ?,
      ket_qua = CASE WHEN ? = 1 THEN ? ELSE ket_qua END,
      nguoi_lam_id = CASE WHEN ? = 'chua_lam' THEN NULL ELSE ? END,
      xong_luc = CASE WHEN ? = 'chua_lam' THEN NULL ELSE datetime('now', '+7 hours') END
    WHERE id = ?
  `).bind(
    trangThai,
    coKetQua ? 1 : 0, ketQua,
    trangThai, phien.nhan_su_id,
    trangThai, buocId
  ).run();

  const nhan = { xong: 'Xong', khong_ap_dung: 'Không áp dụng', chua_lam: 'Bỏ đánh dấu' }[trangThai];
  await ghiSo(env, du_an.id, 'buoc', phien, {
    giai_doan_cu: buoc.giai_doan,
    ghi_chu: `${nhan}: ${buoc.ten}` + (ketQua ? ` — ${ketQua}` : '')
  });

  return json({ ok: true });
}

/* ==========================================================================
   CỔNG CHUYỂN GIAI ĐOẠN
   ---------------------------------------------------------------------------
   Đây là điểm khác biệt giữa "checklist trang trí" và "quy trình thật":
   máy chủ TỪ CHỐI nếu còn bước bắt buộc chưa xong, kèm đúng tên bước còn
   thiếu để người dùng biết phải làm gì (không chỉ ẩn nút ở trình duyệt).

   Ngoại lệ có kiểm soát (Rule 4): người có quyền khoá SKU được bỏ qua cổng
   nhưng BẮT BUỘC nhập lý do, và lý do đi thẳng vào sổ lịch sử.
   ========================================================================== */
export async function chuyenGiaiDoan(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền chuyển giai đoạn', 403);

  const { du_an, loi: l } = await layDuAnDangMo(env, body.id);
  if (l) return l;
  if (du_an.trang_thai === 'tam_dung') return loi('Dự án đang tạm dừng — bấm "Tiếp tục" trước đã');

  const keTiep = giaiDoanKe(du_an.giai_doan);
  if (!keTiep) return loi('Đây đã là giai đoạn cuối — dùng "Hoàn thành dự án"');

  // Cổng duyệt Go/No-Go: CHỈ Ban Giám đốc (Sếp Ngọc chốt 11/09/2026). Admin
  // KHÔNG tự động được duyệt — quyền hệ thống không phải chức danh điều hành.
  if (du_an.giai_doan === GIAI_DOAN_CAN_DUYET && !(await laBanGiamDoc(env, phien))) {
    return loi('Chỉ Ban Giám đốc mới được duyệt ra mắt sản phẩm', 403);
  }

  const { results: conThieu } = await env.DB.prepare(`
    SELECT ten FROM rnd_buoc
     WHERE du_an_id = ? AND giai_doan = ? AND bat_buoc = 1 AND trang_thai = 'chua_lam'
     ORDER BY thu_tu
  `).bind(du_an.id, du_an.giai_doan).all();

  const boQua = body.bo_qua === true;
  const lyDo = chuoi(body.ly_do);

  if (conThieu.length) {
    if (!boQua) {
      return json({
        loi: `Còn ${conThieu.length} việc bắt buộc chưa xong ở giai đoạn này`,
        con_thieu: conThieu.map(b => b.ten)
      }, 400);
    }
    if (!duocKhoaSanPham(phien)) return loi('Chỉ Kinh doanh/Admin mới được bỏ qua việc bắt buộc', 403);
    if (!lyDo) return loi('Bỏ qua việc bắt buộc thì phải ghi rõ lý do');
  }

  const loaiSuKien = du_an.giai_doan === GIAI_DOAN_CAN_DUYET ? 'duyet_ra_mat'
    : (conThieu.length ? 'bo_qua_cong' : 'chuyen_giai_doan');
  const ghiChu = conThieu.length
    ? `Bỏ qua ${conThieu.length} việc bắt buộc — lý do: ${lyDo}`
    : (lyDo || null);

  await env.DB.prepare(`
    UPDATE rnd_du_an SET giai_doan = ?, cap_nhat_boi = ?, cap_nhat_luc = datetime('now', '+7 hours')
    WHERE id = ?
  `).bind(keTiep, phien.nhan_su_id, du_an.id).run();

  await ghiSo(env, du_an.id, loaiSuKien, phien, {
    giai_doan_cu: du_an.giai_doan, giai_doan_moi: keTiep, ghi_chu: ghiChu
  });

  return json({ ok: true, giai_doan: keTiep, ten_giai_doan: thongTinGiaiDoan(keTiep)?.ten });
}

/* Quay lại giai đoạn trước — tình huống thật: mẫu bị loại ở khâu thử nếm,
   phải về làm lại công thức. Bắt buộc lý do, ghi sổ. Không đụng tới các
   bước đã tick (Rule 10 — việc đã làm vẫn là đã làm). */
export async function quayLaiGiaiDoan(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền chuyển giai đoạn', 403);

  const { du_an, loi: l } = await layDuAnDangMo(env, body.id);
  if (l) return l;

  const truoc = giaiDoanTruoc(du_an.giai_doan);
  if (!truoc) return loi('Đang ở giai đoạn đầu, không lùi được nữa');

  const lyDo = chuoi(body.ly_do);
  if (!lyDo) return loi('Vui lòng ghi lý do quay lại giai đoạn trước');

  await env.DB.prepare(`
    UPDATE rnd_du_an SET giai_doan = ?, cap_nhat_boi = ?, cap_nhat_luc = datetime('now', '+7 hours')
    WHERE id = ?
  `).bind(truoc, phien.nhan_su_id, du_an.id).run();

  await ghiSo(env, du_an.id, 'quay_lai', phien, {
    giai_doan_cu: du_an.giai_doan, giai_doan_moi: truoc, ghi_chu: lyDo
  });

  return json({ ok: true, giai_doan: truoc, ten_giai_doan: thongTinGiaiDoan(truoc)?.ten });
}

/* ==========================================================================
   TẠM DỪNG / TIẾP TỤC / HUỶ / HOÀN THÀNH
   Huỷ = kết thúc nhưng GIỮ NGUYÊN dữ liệu để tra cứu (Rule 10) — không xoá
   cứng, không mất bài học "vì sao dự án này không đi tiếp".
   ========================================================================== */
export async function doiTrangThai(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền đổi trạng thái dự án', 403);

  const trangThai = ['dang_lam', 'tam_dung', 'huy', 'hoan_thanh'].includes(body.trang_thai) ? body.trang_thai : null;
  if (!trangThai) return loi('Trạng thái không hợp lệ');

  // Huỷ cũng phải thao tác được trên dự án đã hoàn thành? Không — đã xong
  // thì thôi. Chỉ cho phép đọc dự án chưa kết thúc.
  const { du_an, loi: l } = await layDuAnDangMo(env, body.id);
  if (l) return l;
  if (du_an.trang_thai === trangThai) return loi('Dự án đang ở đúng trạng thái này rồi');

  const lyDo = chuoi(body.ly_do);
  if ((trangThai === 'tam_dung' || trangThai === 'huy') && !lyDo) {
    return loi(trangThai === 'huy' ? 'Vui lòng ghi lý do huỷ dự án' : 'Vui lòng ghi lý do tạm dừng');
  }
  if (trangThai === 'huy' && !duocKhoaSanPham(phien)) {
    return loi('Chỉ Kinh doanh/Admin mới được huỷ dự án R&D', 403);
  }
  if (trangThai === 'hoan_thanh') {
    if (du_an.giai_doan !== MA_GIAI_DOAN[MA_GIAI_DOAN.length - 1]) {
      return loi('Chỉ hoàn thành được khi đã tới giai đoạn "Theo dõi sau ra mắt"');
    }
    const conThieu = await env.DB.prepare(`
      SELECT COUNT(*) AS n FROM rnd_buoc
       WHERE du_an_id = ? AND giai_doan = ? AND bat_buoc = 1 AND trang_thai = 'chua_lam'
    `).bind(du_an.id, du_an.giai_doan).first();
    if (conThieu && conThieu.n > 0) return loi(`Còn ${conThieu.n} việc bắt buộc chưa xong ở giai đoạn cuối`);
  }

  await env.DB.prepare(`
    UPDATE rnd_du_an SET
      trang_thai = ?,
      ly_do_dung = CASE WHEN ? IN ('tam_dung','huy') THEN ? ELSE NULL END,
      cap_nhat_boi = ?, cap_nhat_luc = datetime('now', '+7 hours')
    WHERE id = ?
  `).bind(trangThai, trangThai, lyDo, phien.nhan_su_id, du_an.id).run();

  const loaiSuKien = { tam_dung: 'tam_dung', dang_lam: 'tiep_tuc', huy: 'huy', hoan_thanh: 'hoan_thanh' }[trangThai];
  await ghiSo(env, du_an.id, loaiSuKien, phien, { giai_doan_cu: du_an.giai_doan, ghi_chu: lyDo });

  return json({ ok: true, trang_thai: trangThai });
}

/* ==========================================================================
   GẮN SKU — nối dự án với sản phẩm THẬT trong bảng san_pham.
   Không tạo sản phẩm ở đây: SKU vẫn tạo bên tab Sản phẩm/Kho vận đúng
   chủ sở hữu dữ liệu, đây chỉ lưu con trỏ (Rule 1 — không đẻ nguồn thứ hai).
   ========================================================================== */
export async function ganSanPham(env, phien, body) {
  if (!duocSuaSanPham(phien)) return loi('Bạn không có quyền gắn mã hàng', 403);

  const { du_an, loi: l } = await layDuAnDangMo(env, body.id);
  if (l) return l;

  const spId = chuoi(body.san_pham_id);
  if (!spId) {   // gửi rỗng = gỡ liên kết
    await env.DB.prepare(`
      UPDATE rnd_du_an SET san_pham_id = NULL, cap_nhat_boi = ?, cap_nhat_luc = datetime('now', '+7 hours')
      WHERE id = ?
    `).bind(phien.nhan_su_id, du_an.id).run();
    await ghiSo(env, du_an.id, 'gan_sku', phien, { ghi_chu: 'Gỡ liên kết mã hàng' });
    return json({ ok: true });
  }

  const sp = await env.DB.prepare('SELECT id, ma_sku, ten FROM san_pham WHERE id = ?').bind(spId).first();
  if (!sp) return loi('Không tìm thấy mã hàng này trong danh mục Sản phẩm', 404);

  const daGan = await env.DB.prepare(`
    SELECT ma_rnd FROM rnd_du_an WHERE san_pham_id = ? AND id <> ? AND hoat_dong = 1
  `).bind(spId, du_an.id).first();
  if (daGan) return loi(`Mã hàng này đã gắn với dự án ${daGan.ma_rnd} rồi`);

  await env.DB.prepare(`
    UPDATE rnd_du_an SET san_pham_id = ?, cap_nhat_boi = ?, cap_nhat_luc = datetime('now', '+7 hours')
    WHERE id = ?
  `).bind(spId, phien.nhan_su_id, du_an.id).run();

  await ghiSo(env, du_an.id, 'gan_sku', phien, { ghi_chu: `Gắn mã hàng ${sp.ma_sku} — ${sp.ten}` });
  return json({ ok: true, san_pham_sku: sp.ma_sku, san_pham_ten: sp.ten });
}
