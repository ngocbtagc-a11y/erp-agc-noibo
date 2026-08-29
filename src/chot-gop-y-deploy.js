/* ============================================================================
   CHỐT GÓP Ý KHI BẢN VÁ ĐÃ LÊN HỆ THỐNG THẬT
   ---------------------------------------------------------------------------
   Sếp Ngọc 28/08/2026: *"lỗi nào đã làm xong thì hiện đã xong đi chứ"*.

   VẤN ĐỀ GỐC — nói thẳng: quy trình đang là góp ý → duyệt → giao việc → xây →
   soi → đẩy lên… **rồi hết**. Không ai quay lại đổi trạng thái góp ý. Người
   báo lỗi không bao giờ biết lỗi của mình đã được sửa. Đó đúng là thứ tính
   năng trạng thái sinh ra để tránh, và nó hỏng ngay ở bước cuối.

   KHÔNG vá bằng "nhớ kỹ hơn". Trí nhớ người và trí nhớ Gạo đều đã chứng minh
   là không đáng tin (28/08 có 3 lần "sổ ghi một đằng, thực tế một nẻo").

   ---------------------------------------------------------------------------
   SỢI DÂY CHỌN: MÃ GÓP Ý TRONG THÔNG ĐIỆP COMMIT (`GY-12`)

   Đã đo và loại ba cách khác:

   ① **Tiêu đề/thân Pull Request.** Cần có PR mới nối được, mà repo này vẫn
      đẩy thẳng lên `main` (a9dc0f1 là commit gộp, không qua PR). Lại phải gọi
      GitHub API kèm token trong workflow. Nhiều mảnh hơn, mà mất đúng những
      lần deploy không qua PR. **Loại.**

   ② **Một file trong repo liệt kê "góp ý nào ứng với commit nào".** Đây là
      nguồn sự thật THỨ HAI, sống song song với git và chắc chắn sẽ lệch khỏi
      nó — đúng thứ Rule 1 cấm. **Loại.**

   ③ **Đối chiếu `gop_y.bang_chung_url` với SHA vừa deploy.** Cái này KHÔNG bị
      loại — nó được giữ lại làm **đường thứ hai**, chạy song song (xem
      `docShaTrongLink`). Nó mạnh ở chỗ: link đó do NGƯỜI dán vào ERP, đã nằm
      trên sổ từ trước, nên hai đường xác nhận lẫn nhau. Nhưng nó không đủ
      MỘT MÌNH: góp ý chưa ai dán link thì không có gì để đối chiếu.

   → Chọn ①+③: mã trong commit là đường chính (luôn có, đi cùng code, không
   sửa được sau khi đã đẩy), `bang_chung_url` là đường phụ. Không thêm dịch
   vụ, không thêm cron, không thêm khoá của bên thứ ba. Chi phí 0.

   ---------------------------------------------------------------------------
   ⚠️ LUẬT AN TOÀN — CÁI QUAN TRỌNG NHẤT TRONG FILE NÀY

   Báo "xong" mà chưa xong là **mất lòng tin của người báo** — họ sẽ thôi báo,
   và đó là mất mát lớn nhất. Nên máy chỉ được làm ĐÚNG PHẦN VIỆC CƠ HỌC của
   nó: *"code này giờ đã nằm trên hệ thống thật"*. Máy **không bao giờ** làm
   thay phần cần người phán đoán.

   | Góp ý đang ở | Máy làm gì | Vì sao |
   |---|---|---|
   | `san_sang_phat_hanh` | → `hoan_thanh` | Người đã nghiệm thu xong rồi, thứ duy nhất còn thiếu là PHÁT HÀNH. Deploy chính là phát hành. Máy làm đúng việc của máy. |
   | `da_duyet` · `dang_lam` · `dang_kiem_tra` · `can_chinh_sua` · `nghiem_thu_chua_dat` | → `cho_nghiem_thu`, nhắn người gửi | Bản vá đã lên thật, nhưng CHƯA AI xác nhận nó giải quyết được vướng mắc. Bóng sang sân người gửi. |
   | `moi` · `cho_phan_tich` · `dang_phan_tich` · `cho_quyet_dinh` · `bi_chan` | **KHÔNG đổi trạng thái**, dựng cờ `deploy_cho_xac_nhan`, báo Sếp | Chưa qua cổng duyệt (hoặc đang đóng băng). Đẩy nó đi là máy tự vượt đúng cái cổng SPEC-0002 dựng lên. Thà để nguyên chờ người xác nhận. |
   | `hoan_thanh` · `da_huy` · `bi_tu_choi` | không đụng | Đã đóng rồi. |
   | không tồn tại / mã sai | không đụng, không nổ | Gõ nhầm số trong commit là chuyện thường. |

   Nghĩa là: **máy không bao giờ tự đưa một góp ý CHƯA QUA CỔNG DUYỆT sang
   "đã xong"**. Đó là ca đối chứng bắt buộc của `scripts/do-chot-gop-y-deploy.mjs`.

   Toàn bộ file này là HÀM THUẦN — không đụng DB, không đụng mạng — để bàn thử
   soi thẳng vào luật mà không cần dựng D1.
   ============================================================================ */

/* Mã góp ý trong thông điệp commit. Chấp nhận `GY-12`, `gy 12`, `GY_12`,
   `#GY-12`, `[GY-12]`. KHÔNG chấp nhận `LEGY-12` · `GY-12a` · `GY12`.

   VÌ SAO DẤU NỐI LÀ BẮT BUỘC (đo được, bàn thử §②): để dấu nối tuỳ chọn thì
   `GY2` trong một câu tiếng Anh bất kỳ cũng thành mã, và bàn thử bắt được
   đúng ca đó. Lệch về phía BỎ SÓT: người viết `GY12` thì cùng lắm góp ý chậm
   được đóng vài hôm. Lệch về phía BẮT NHẦM thì một người nhận tin "góp ý của
   bạn đã xong" trong khi chưa ai đụng vào — mất lòng tin, và họ thôi báo. */
const MAU_MA_GOP_Y = /(?<![A-Za-z0-9])GY[-_ ](\d{1,7})(?![0-9A-Za-z])/gi;

/** Đọc mọi mã góp ý trong một đoạn chữ (tiêu đề + thân commit).
 *  Trả về mảng số nguyên, đã khử trùng, đã sắp — thứ tự ổn định để bàn thử so được. */
export function docMaGopY(chu) {
  if (!chu) return [];
  const ra = new Set();
  for (const m of String(chu).matchAll(MAU_MA_GOP_Y)) {
    const n = parseInt(m[1], 10);
    if (Number.isInteger(n) && n > 0) ra.add(n);
  }
  return [...ra].sort((a, b) => a - b);
}

/** Mọi chuỗi trông như SHA git (>= 7 ký tự hex) nằm trong một đường link.
 *  Dùng để đối chiếu `gop_y.bang_chung_url` với danh sách commit vừa lên.
 *  Chặn số thuần (`/pull/1234567`) — SHA phải có ít nhất một chữ cái a-f,
 *  nếu không thì mọi số hiệu PR dài đều thành "SHA" và khớp bừa. */
export function docShaTrongLink(link) {
  if (!link) return [];
  const ra = new Set();
  for (const m of String(link).matchAll(/(?<![0-9a-f])([0-9a-f]{7,40})(?![0-9a-f])/gi)) {
    const s = m[1].toLowerCase();
    if (/[a-f]/.test(s)) ra.add(s);
  }
  return [...ra];
}

/** Hai SHA có phải cùng một commit không — một bên có thể là bản rút gọn. */
export function shaKhop(a, b) {
  if (!a || !b) return false;
  const x = String(a).toLowerCase(), y = String(b).toLowerCase();
  const ngan = x.length < y.length ? x : y, dai = x.length < y.length ? y : x;
  return ngan.length >= 7 && dai.startsWith(ngan);
}

/* ---- Xếp trạng thái thành ba rổ ------------------------------------------
   Danh sách viết TƯỜNG MINH, không dùng "mọi trạng thái còn lại". Thêm một
   trạng thái mới vào ERP mà quên xếp rổ thì `xepRo()` trả 'chua_xep' và máy
   xử như rổ an toàn nhất (chờ người xác nhận) — chứ không im lặng đoán. */

/** Người đã nghiệm thu xong, chỉ còn chờ phát hành. Deploy = phát hành. */
export const TT_CHI_CHO_PHAT_HANH = ['san_sang_phat_hanh'];

/** Đang xây / đang kiểm nội bộ. Bản vá lên thật rồi thì bóng sang người gửi. */
export const TT_DANG_XAY = ['da_duyet', 'dang_lam', 'dang_kiem_tra',
                            'can_chinh_sua', 'nghiem_thu_chua_dat'];

/** Đã ở đúng chỗ rồi — chỉ đóng dấu bằng chứng, không đổi trạng thái. */
export const TT_DA_O_SAN_NGUOI_GUI = ['cho_nghiem_thu'];

/** Chưa qua cổng duyệt, hoặc đang đóng băng. MÁY KHÔNG ĐƯỢC ĐẨY ĐI. */
export const TT_CHUA_QUA_CONG = ['moi', 'cho_phan_tich', 'dang_phan_tich',
                                 'cho_quyet_dinh', 'bi_chan'];

/** Đã đóng — không đụng, không nhắn lại. */
export const TT_DA_DONG = ['hoan_thanh', 'da_huy', 'bi_tu_choi'];

export function xepRo(trangThai) {
  if (TT_CHI_CHO_PHAT_HANH.includes(trangThai))   return 'cho_phat_hanh';
  if (TT_DANG_XAY.includes(trangThai))            return 'dang_xay';
  if (TT_DA_O_SAN_NGUOI_GUI.includes(trangThai))  return 'san_nguoi_gui';
  if (TT_CHUA_QUA_CONG.includes(trangThai))       return 'chua_qua_cong';
  if (TT_DA_DONG.includes(trangThai))             return 'da_dong';
  return 'chua_xep';
}

/** Bỏ mã góp ý và rác đầu dòng khỏi tiêu đề commit để lấy MỘT CÂU tóm tắt
 *  "đã sửa gì" đủ cho người gửi đọc hiểu, không phải mở GitHub. */
export function tomTatTuCommit(tieuDe) {
  let s = String(tieuDe || '').trim();
  s = s.replace(MAU_MA_GOP_Y, ' ');
  s = s.replace(/^[\s:•\-–—#\[\]()|,.]+/, '').replace(/[\s:|,]+$/, '');
  s = s.replace(/\s{2,}/g, ' ');
  return s.slice(0, 200);
}

/* ============================================================================
   QUYẾT ĐỊNH — hàm trung tâm. Một góp ý + một commit đã lên thật → làm gì.

   `gopY`   : { id, trang_thai, bang_chung_url, deploy_sha, bao_da_len_luc }
              (null/undefined = không tìm thấy góp ý mang mã đó)
   `commit` : { sha, tieu_de }
   `nguon`  : 'commit' (mã GY trong thông điệp) | 'bang_chung' (link đã dán sẵn)

   Trả về { hanh_dong, trang_thai_moi, bao_nguoi_gui, bao_sep, ly_do }
     hanh_dong ∈ 'dong' | 'day_sang_nghiem_thu' | 'dong_dau' | 'cho_xac_nhan' | 'bo_qua'
   ========================================================================== */
export function quyetDinhChot(gopY, commit, nguon = 'commit') {
  const sha = commit && commit.sha ? String(commit.sha).toLowerCase() : '';
  const tomTat = tomTatTuCommit(commit && commit.tieu_de);

  if (!gopY) {
    return { hanh_dong: 'bo_qua', ly_do: 'khong_tim_thay',
             mo_ta: 'Không có góp ý nào mang mã này — có thể gõ nhầm số trong commit.' };
  }
  if (!sha) {
    return { hanh_dong: 'bo_qua', ly_do: 'thieu_sha',
             mo_ta: 'Không đọc được mã commit — không có bằng chứng thì không đóng.' };
  }

  const ro = xepRo(gopY.trang_thai);

  // Đã đóng dấu đúng commit này rồi → lượt deploy sau không làm gì nữa. Đây là
  // chốt chống nhắn lại; chốt thứ hai là `bao_da_len_luc` ở dưới.
  if (gopY.deploy_sha && shaKhop(gopY.deploy_sha, sha) && ro !== 'chua_qua_cong') {
    return { hanh_dong: 'bo_qua', ly_do: 'da_dong_dau', sha, tom_tat: tomTat,
             mo_ta: 'Góp ý này đã được đóng dấu bằng đúng commit đó ở lượt deploy trước.' };
  }

  if (ro === 'da_dong') {
    return { hanh_dong: 'bo_qua', ly_do: 'da_dong', sha, tom_tat: tomTat,
             mo_ta: `Góp ý đã ở "${gopY.trang_thai}" — đóng rồi thì không mở lại bằng máy.` };
  }

  const chuaBao = !gopY.bao_da_len_luc;

  if (ro === 'cho_phat_hanh') {
    return { hanh_dong: 'dong', trang_thai_moi: 'hoan_thanh', sha, tom_tat: tomTat,
             bao_nguoi_gui: chuaBao, bao_sep: false, nguon, ly_do: 'da_nghiem_thu_va_da_len',
             mo_ta: 'Người đã nghiệm thu xong, chỉ còn chờ phát hành — deploy chính là phát hành.' };
  }

  if (ro === 'dang_xay') {
    return { hanh_dong: 'day_sang_nghiem_thu', trang_thai_moi: 'cho_nghiem_thu', sha, tom_tat: tomTat,
             bao_nguoi_gui: chuaBao, bao_sep: false, nguon, ly_do: 'da_len_cho_nguoi_gui_thu',
             mo_ta: 'Bản vá đã lên hệ thống thật, nhưng chưa ai xác nhận nó hết vướng — bóng sang sân người gửi.' };
  }

  if (ro === 'san_nguoi_gui') {
    return { hanh_dong: 'dong_dau', trang_thai_moi: null, sha, tom_tat: tomTat,
             bao_nguoi_gui: chuaBao, bao_sep: false, nguon, ly_do: 'da_o_dung_cho',
             mo_ta: 'Đã ở "Chờ nghiệm thu" — chỉ đóng dấu bằng chứng và báo người gửi, không đổi trạng thái.' };
  }

  /* ⚠️ RỔ AN TOÀN. `chua_qua_cong` và `chua_xep` cùng rơi vào đây.
     Máy KHÔNG đổi trang_thai. Người gửi KHÔNG nhận tin (chưa chắc đã xong —
     báo sớm là mất lòng tin). Chỉ Sếp thấy, và Sếp bấm một nút để chốt. */
  return { hanh_dong: 'cho_xac_nhan', trang_thai_moi: null, sha, tom_tat: tomTat,
           bao_nguoi_gui: false, bao_sep: true, nguon,
           ly_do: ro === 'chua_xep' ? 'trang_thai_la' : 'chua_qua_cong_duyet',
           mo_ta: ro === 'chua_xep'
             ? `Trạng thái "${gopY.trang_thai}" chưa được xếp rổ trong chot-gop-y-deploy.js — xử theo chiều an toàn.`
             : `Góp ý đang ở "${gopY.trang_thai}", chưa qua cổng duyệt (hoặc đang bị chặn). ` +
               'Máy KHÔNG tự đẩy nó sang "đã xong" — Sếp xác nhận thì mới đóng.' };
}

/* ============================================================================
   GHÉP CẢ LƯỢT DEPLOY — thuần, không đụng DB.
   `cacCommit` : [{ sha, tieu_de, than }]
   `tra`       : (id) => gopY | null           — nơi gọi bơm dữ liệu vào
   `traTheoSha`: (sha) => [gopY]               — đường phụ qua bang_chung_url
   Trả về mảng { gop_y_id, ...quyetDinh } — đã khử trùng theo góp ý (một góp ý
   chỉ nhận MỘT quyết định cho cả lượt, lấy commit đầu tiên khớp).
   ========================================================================== */
export function chotCaLuot(cacCommit, tra, traTheoSha = () => []) {
  const raTheoId = new Map();

  const ghi = (id, qd) => {
    if (raTheoId.has(id)) return;              // một góp ý, một quyết định
    raTheoId.set(id, { gop_y_id: id, ...qd });
  };

  for (const c of cacCommit || []) {
    const chu = `${c.tieu_de || ''}\n${c.than || ''}`;
    for (const id of docMaGopY(chu)) ghi(id, quyetDinhChot(tra(id), c, 'commit'));
  }

  // Đường phụ: góp ý đã có sẵn link bằng chứng trỏ đúng một commit vừa lên.
  for (const c of cacCommit || []) {
    for (const g of traTheoSha(c.sha) || []) {
      if (!g || raTheoId.has(g.id)) continue;
      const khop = docShaTrongLink(g.bang_chung_url).some(s => shaKhop(s, c.sha));
      if (khop) ghi(g.id, quyetDinhChot(g, c, 'bang_chung'));
    }
  }

  return [...raTheoId.values()];
}
