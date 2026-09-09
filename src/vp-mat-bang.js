/* ==========================================================================
   XẾP CHỖ TRÊN MẶT BẰNG THEO CƠ CẤU THẬT
   ---------------------------------------------------------------------------
   Sếp Ngọc 06/09/2026: "cái này đang sai với cơ cấu."

   Đúng. Mặt bằng cũ vẽ BẢY phòng do tôi tự nghĩ ra (Kinh doanh, MKT, Kho vận,
   Kế toán, Pháp chế, HCNS, IT), trong khi công ty thật có BỐN phòng ban trong
   bảng phong_ban. Nó vẽ một công ty không tồn tại.

   VÌ SAO TÍNH Ở ĐÂY CHỨ KHÔNG VIẾT CỨNG TOẠ ĐỘ NỮA:
   Viết cứng thì mỗi lần Sếp đổi cơ cấu trong ERP là mặt bằng lại lệch, và lệch
   âm thầm — không ai báo, chỉ tới lúc ai đó nhìn kỹ mới phát hiện. Đọc thẳng từ
   phong_ban thì đổi cơ cấu xong mặt bằng tự đúng theo, không phải sửa code.
   Sếp từng hỏi đúng câu này lúc mới dựng: "sau này update mô hình tổ chức thì
   sửa theo được không". Đây là câu trả lời đúng cho nó.

   Trợ lý ảo vẫn giữ chuyên môn hẹp (kế toán, pháp chế, IT… mỗi người một nghề)
   — chỉ CHỖ NGỒI là gom theo phòng thật. Gộp bốn chuyên môn thành một "trợ lý
   Support" thì mất luôn chiều sâu, mà chiều sâu mới là lý do có trợ lý ảo.
   ========================================================================== */

/* Mỗi phòng một hàng, cộng một hàng quầy lễ tân dưới cùng. Chừa 10% trên và
   11% dưới cho biển tên khu và cho quầy Mây khỏi tràn mép sàn. */
const TREN = 13, DUOI = 88;

export async function xepChoTheoCoCau(env, agents, may) {
  let phong = [];
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, ten FROM phong_ban ORDER BY id'
    ).all();
    phong = results || [];
  } catch (e) {
    console.error('Đọc phòng ban lỗi:', e.message);
  }

  /* Chỉ lấy phòng THẬT SỰ có trợ lý ngồi. Vẽ một khu trống toen hoẻn cho phòng
     chưa có trợ lý nào thì mặt bằng loang lổ mà chẳng nói lên điều gì. */
  const coNguoi = phong.filter(p => agents.some(a => a.phong_ban_id === p.id));

  const soHang = coNguoi.length + 1;                 // +1 cho sảnh lễ tân
  const buoc = (DUOI - TREN) / Math.max(1, soHang - 1);

  const khu = [];
  const viTri = {};

  coNguoi.forEach((p, i) => {
    const y = Math.round(TREN + buoc * i);
    const trong = agents.filter(a => a.phong_ban_id === p.id);

    /* Trải đều theo bề ngang. Một người thì đứng giữa; nhiều người thì chia đều
       khoảng 8%–92%, chừa mép cho thẻ không bị cắt. */
    trong.forEach((a, j) => {
      const x = trong.length === 1
        ? 50
        : Math.round(8 + (84 / (trong.length - 1)) * j);
      viTri[a.id] = { x, y };
    });

    /* Chiều cao khu tính theo KHOẢNG CÁCH THẬT giữa hai hàng, không viết cứng.
       Viết cứng 22% thì khi có 5 phòng, bước chỉ còn 18.75% và các khu đè mép
       lên nhau — đo ra Ban Giám đốc 2-24 chồng P. Support 21-43. Chừa 2% khe
       để biển tên khu dưới có chỗ thở. */
    const cao = Math.max(12, Math.round(buoc) - 2);
    khu.push({
      id: 'pb' + p.id,
      ten: p.ten,
      y_tren: Math.max(1, y - Math.round(cao / 2) - 1),
      cao
    });
  });

  /* Mây đứng quầy hàng dưới cùng */
  viTri[may.id] = { x: 50, y: DUOI };
  const caoLeTan = Math.max(12, Math.round(buoc) - 2);
  khu.push({ id: 'letan', ten: 'Sảnh lễ tân', y_tren: DUOI - Math.round(caoLeTan / 2) - 1, cao: caoLeTan });

  return { khu, vi_tri: viTri };
}
