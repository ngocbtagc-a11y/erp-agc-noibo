/* ==========================================================================
   CẮT DANH SÁCH THÌ PHẢI NÓI RÕ LÀ ĐÃ CẮT
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY. Góp ý của chị Vũ Lan Hương (HCNS, 28/08/2026):
   *"không hiển thị hết công việc public ở mục 'Việc cần làm' để dễ theo dõi"*.
   Chị chỉ được MỘT chỗ, nhưng LỚP vấn đề là:
   **danh sách bị cắt bớt mà giao diện không nói cho người dùng biết là đã cắt**
   (docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md).

   Hôm 28/08 đã có HAI ca thật cùng lớp: `hoanLichSu` (LIMIT 500 trên 523 dòng)
   và `apiDanhSach` màn Kho vận (LIMIT 300 cắt đúng đơn tồn lâu nhất). Cả hai
   đều IM LẶNG — người dùng nhìn màn hình đầy dòng và tin rằng mình đã thấy hết.
   Một màn hình cắt im lặng KHÔNG PHẢI là màn hình thiếu dữ liệu, nó là màn hình
   NÓI DỐI: nó khẳng định "đây là tất cả" trong khi không phải.

   VÌ SAO KHÔNG BỎ HẲN `LIMIT`. Bảng `don_hang` đã hàng nghìn dòng và còn tăng;
   bỏ trần là đổi một lời nói dối lấy một màn hình treo. Cách đúng:
   **GIỮ trần + NÓI RÕ đang cắt + CHỈ ĐƯỜNG xem tiếp.**

   CÁCH ĐẾM TỐN 0 ĐỒNG (quan trọng — D1 tính theo `rows_read`, xem
   src/canh-bao-ghi.js). KHÔNG chạy `COUNT(*)` kèm mọi lần đọc. Thay vào đó:
     ① hỏi `LIMIT gioiHan + 1` — thừa đúng MỘT dòng;
     ② nếu về đủ `gioiHan + 1` dòng thì mới biết là "còn nữa", lúc ĐÓ mới chạy
        `COUNT(*)` để lấy tổng thật.
   Trường hợp thường ngày (chưa chạm trần) tốn thêm 0 câu lệnh, 1 dòng đọc.

   DÙNG THẾ NÀO — hai bước ở mỗi chỗ đọc danh sách:

       const GH = 300;
       const kq = await env.DB.prepare(`SELECT ... LIMIT ${GH + 1}`).bind(x).all();
       const { ds, biCat } = catBot(kq, GH);
       const cat = await nhanCat(env, biCat, GH,
         'SELECT COUNT(*) AS n FROM cong_viec WHERE nguoi_nhan_id = ?', [x],
         'Lịch sử làm việc');
       return json({ viec: ds, cat });

   Giao diện gọi `veDaiCat('#...', kq.cat)` (public/assets/js/app.js) để in dải
   *"Đang hiện 300 trong tổng 523 — 223 mục chưa hiện ở đây"* kèm nút xem tiếp.

   Máy canh tái phát cả LỚP: `npm run do-cat-im-lang`.
   ========================================================================== */

/** Cắt phần dôi ra và cho biết CÓ bị cắt hay không.
 *  `ketQua` nhận cả `{ results }` của D1 lẫn mảng thuần.
 *  Điều kiện: câu lệnh phải hỏi `LIMIT gioiHan + 1` — thừa một dòng chính là
 *  cách biết "còn nữa" mà không phải đếm. */
export function catBot(ketQua, gioiHan) {
  const tatCa = Array.isArray(ketQua) ? ketQua : (ketQua?.results || []);
  const biCat = tatCa.length > gioiHan;
  return { ds: biCat ? tatCa.slice(0, gioiHan) : tatCa, biCat };
}

/** Mô tả vết cắt để giao diện in ra. Trả `null` khi KHÔNG cắt — không cắt thì
 *  không có gì phải nói, và một dải luôn hiện là một dải mắt người học được
 *  cách bỏ qua trong đúng một tuần.
 *
 *  `tong` có thể là `null` nếu câu đếm hỏng (bảng chưa nạp migration chẳng
 *  hạn) — giao diện vẫn phải báo "đang bị cắt", chỉ là không có con số tổng.
 *  Im lặng vì đếm hỏng là quay lại đúng cái lỗi đang vá. */
export async function nhanCat(env, biCat, gioiHan, cauDem, thamSo = [], xemThem = null) {
  if (!biCat) return null;
  let tong = null;
  try {
    const r = await env.DB.prepare(cauDem).bind(...thamSo).first();
    const v = r ? Number(Object.values(r)[0]) : NaN;
    if (Number.isFinite(v)) tong = v;
    // REV-0034 · L6. `tong` NHỎ HƠN số dòng đang hiện là chuyện có thật: cron
    // đơn hoàn xoá/ghi lại mỗi 5 phút, câu đếm chạy SAU câu đọc nên có thể rơi
    // đúng lúc bảng vừa bị xoá bớt. Không chặn thì dải in *"còn -50 việc chưa
    // hiện"* — một con số vô nghĩa còn tệ hơn không có số.
    if (tong !== null && tong < gioiHan) tong = null;
  } catch { /* đếm hỏng thì vẫn báo là đã cắt, chỉ thiếu con số */ }
  return { gioi_han: gioiHan, tong, xem_them: xemThem };
}
