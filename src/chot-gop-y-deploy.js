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

/* ============================================================================
   ⚠️ TỪ KHOÁ ĐÓNG — CHỐT QUAN TRỌNG NHẤT SAU REV-0064 C1
   ---------------------------------------------------------------------------
   NHẮC TÊN MỘT PHIẾU KHÔNG PHẢI LÀ SỬA PHIẾU ĐÓ. Bản trước đọc *"lượt sửa này
   có NHẮC TÊN phiếu nào không"* và coi đó là *"lượt sửa này VÁ phiếu nào"*.
   Hai thứ đó khác nhau, và repo này có sẵn **một commit thật** chứng minh:

     f1ab6c9 (đang nằm trên origin/main)
       tiêu đề: "GY-0007: Kho tài liệu chết vì TDZ — dời khai báo lên trước
                 khối khởi động"
       thân   : "GY-0006 (chat máy tính): ĐO LẠI THẤY ĐÃ HẾT LỖI, không vá gì."

   Bản cũ đọc commit đó ra hai mã, thấy có file `public/assets/js/app.js` bị
   đổi, rồi ĐÓNG GY-6 và nhắn người báo *"đã được sửa xong"* — trong khi chính
   commit nói thẳng bằng tiếng Việt là KHÔNG VÁ GÌ. Đo trên 15 trạng thái mở:
   7/15 bị đổi trạng thái, 12/15 bị nhắn người gửi, chỉ vì mã bị nhắc tên. Và
   trên 284 commit gần nhất của main, 29% commit nhắc mã là nhắc từ 2 mã trở
   lên — đây là cách repo này viết commit, không phải ca hiếm.

   ---------------------------------------------------------------------------
   LUẬT MỚI — MỘT CÁCH DUY NHẤT, KHÔNG CÓ CÁCH THỨ HAI:

       Vá GY-12

   • Từ khoá là đúng một chữ: **Vá** (có dấu sắc). Không nhận `Va`, `Fix`,
     `Close`, `Đóng`, `Sửa` — nhiều cách viết là nhiều chỗ đoán, mà đoán chính
     là lỗi C1. Không phân biệt hoa/thường (`vá`, `Vá`, `VÁ` đều được).
   • Từ khoá phải đứng **ở ĐẦU MỘT DÒNG** — dòng tiêu đề, hoặc một dòng bất kỳ
     trong thân commit. Cho phép rác đầu dòng (`- `, `* `, `> `, `#`, `[`).
     VÌ SAO ĐẦU DÒNG: giữa câu thì `"chưa vá GY-12"` và `"không vá gì cho
     GY-12"` cũng thành tuyên bố vá — đúng kiểu ngược nghĩa mà f1ab6c9 viết.
   • Một `Vá` phủ được **một DÃY mã liền nhau**: `Vá GY-12 GY-13` hoặc
     `Vá GY-12, GY-13`. Dãy dừng NGAY khi gặp bất kỳ chữ nào khác, nên
     `Vá GY-7, và GY-6 thì đo lại thấy hết lỗi` chỉ đóng GY-7.
   • **Mọi cách nhắc khác chỉ được ĐÍNH BẰNG CHỨNG** (đóng dấu `deploy_sha`,
     dựng cờ cho Sếp) — KHÔNG đổi trạng thái, KHÔNG nhắn người gửi.

   Lệch về phía BỎ SÓT: quên viết `Vá` thì cùng lắm phiếu chậm được đóng, và
   Sếp vẫn thấy cờ. Lệch về phía BẮT NHẦM thì người báo nhận tin sai — mất
   lòng tin, và họ thôi báo. Đó là mất mát lớn nhất (xem khối đầu file).

   Tài liệu cho người viết commit: `HUONG-DAN-DEPLOY.md` §"Vá GY-…".
   ========================================================================== */
export const TU_KHOA_DONG = 'Vá';

/* `^` với cờ `m` khớp ngay sau `\n`; `\r` không nằm trong lớp ký tự nào bên
   dưới nên dãy mã KHÔNG BAO GIỜ vắt qua hai dòng (CRLF cũng vậy). */
const MAU_TUYEN_BO_VA = /^[ \t>*+\-–—•#[\]()|]*vá[ \t]+((?:GY[-_ ]\d{1,7}[ \t,+]*)+)/gim;

/** Đọc những mã góp ý được TUYÊN BỐ VÁ trong một đoạn chữ.
 *  Trả mảng số nguyên đã khử trùng, đã sắp — luôn là TẬP CON của docMaGopY().
 *
 *  Chuẩn hoá NFC trước khi khớp: `á` gõ rời (`a` + U+0301) và `á` dựng sẵn
 *  (U+00E1) là hai chuỗi khác nhau với regex nhưng cùng một chữ với người. */
export function docMaTuyenBoVa(chu) {
  if (!chu) return [];
  const ra = new Set();
  for (const m of String(chu).normalize('NFC').matchAll(MAU_TUYEN_BO_VA))
    for (const n of docMaGopY(m[1])) ra.add(n);
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

/* ---- CHỐT MỚI ①: ĐỌC FILE NÀO BỊ ĐỔI, KHÔNG CHỈ ĐỌC THÔNG ĐIỆP ----------
   REV-0042 ca 8: commit `"REV-0042: soi lại GY-1, chưa sửa gì"` đóng luôn GY-1
   và nhắn người gửi. Vì máy chỉ đọc CÂU CHỮ. Câu chữ là lời khai; danh sách
   file bị đổi là bằng chứng. Từ bản này máy đòi bằng chứng.

   Chỉ những thư mục THẬT SỰ LÊN HỆ THỐNG mới tính. `docs/`, `*.md`,
   `scripts/do-*` không đổi một hành vi nào của ERP đang chạy. */
export const THU_MUC_CODE_THAT = ['src/', 'public/', 'migrations/'];
export const TEP_CODE_THAT     = ['wrangler.toml', 'schema.sql'];

export function tepLaCodeThat(tep) {
  const t = String(tep || '').trim().replace(/^\.\//, '').replace(/\\/g, '/');
  if (!t) return false;
  if (TEP_CODE_THAT.includes(t)) return true;
  return THU_MUC_CODE_THAT.some(d => t.startsWith(d));
}

/** 'co_code' · 'chi_tai_lieu' · 'khong_biet' (không đọc được danh sách file).
 *  `khong_biet` KHÔNG được coi là 'co_code' — nhưng cũng không im: nó rơi vào
 *  đường "dựng cờ cho Sếp", vì một lượt deploy có thật mà máy không phân loại
 *  được là thứ Sếp nên nhìn thấy, không phải thứ nên nuốt. */
export function xepCommitTheoTep(commit) {
  const ds = commit && commit.cac_tep;
  if (!Array.isArray(ds)) return 'khong_biet';
  if (!ds.length) return 'chi_tai_lieu';       // commit rỗng / chỉ đổi metadata
  return ds.some(tepLaCodeThat) ? 'co_code' : 'chi_tai_lieu';
}

/* ---- CHỐT MỚI ②: NHẬN DIỆN COMMIT LÙI (revert) --------------------------
   REV-0042 ca 2 và 3: lượt đẩy chỉ có `Revert "GY-1 sửa lỗi X"` — bản vá vừa
   bị GỠ mà máy vẫn báo "đã sửa xong". Ca 3 tệ hơn: góp ý đã `hoan_thanh` rồi
   bị revert thì nhãn "Hoàn thành" NÓI DỐI vĩnh viễn.

   Bắt hai dấu hiệu: tiêu đề mở đầu bằng `Revert`, hoặc thân có câu git tự
   sinh `This reverts commit …`. KHÔNG bắt chữ "revert" nằm giữa câu — commit
   `"GY-5: revert lại nút xoá theo yêu cầu Sếp"` là một bản vá THẬT (ca cắt
   quá tay, có đối chứng trong bàn thử). */
export function laCommitLui(commit) {
  const td = String((commit && commit.tieu_de) || '');
  const th = String((commit && commit.than) || '');
  return /^\s*revert\b/i.test(td) || /this\s+reverts\s+commit\s+[0-9a-f]{7,40}/i.test(th);
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

/* ⚠️ RỔ MỚI — QUY TRÌNH HỤT (REV-0042 câu 2, Gạo chốt 29/08).
   Hồ Ly đọc DB thật: 4/4 góp ý đang mở đều ở `cho_phan_tich`, nên bản trước
   đóng ĐÚNG 0 GÓP Ý. Nhưng cả 4 đã sửa xong và lên thật từ lâu — `cho_phan_tich`
   ở repo này là **bằng chứng quy trình hụt**, không phải bằng chứng chưa làm:
   góp ý nhảy thẳng từ "chờ phân tích" sang "Khỉ Đột build xong", không ai đẩy
   trạng thái qua các bước giữa.

   Nên: có commit THẬT đụng CODE THẬT (không revert, không phải chỉ sửa tài
   liệu, đọc từ thông điệp commit chứ không phải đường phụ) thì đẩy sang
   `cho_nghiem_thu` — CHỜ SẾP NGHIỆM THU, **không** phải `hoan_thanh`. Cổng
   "đã xong" vẫn là của người. */
export const TT_QUY_TRINH_HUT = ['cho_phan_tich'];

/** Chưa qua cổng duyệt, hoặc đang đóng băng. MÁY KHÔNG ĐƯỢC ĐẨY ĐI. */
export const TT_CHUA_QUA_CONG = ['moi', 'dang_phan_tich',
                                 'cho_quyet_dinh', 'bi_chan'];

/** Đã đóng — không đụng, không nhắn lại. */
export const TT_DA_DONG = ['hoan_thanh', 'da_huy', 'bi_tu_choi'];

export function xepRo(trangThai) {
  if (TT_CHI_CHO_PHAT_HANH.includes(trangThai))   return 'cho_phat_hanh';
  if (TT_DANG_XAY.includes(trangThai))            return 'dang_xay';
  if (TT_QUY_TRINH_HUT.includes(trangThai))       return 'quy_trinh_hut';
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
   `tuyenBoVa`: commit này có viết `Vá GY-<id>` ở đầu dòng không (C1). KHÔNG có
              thì mã chỉ được ĐÍNH BẰNG CHỨNG — không đổi trạng thái, không
              nhắn người gửi. Mặc định `false`: quên truyền là ngả về an toàn.

   Trả về { hanh_dong, trang_thai_moi, bao_nguoi_gui, bao_sep, ly_do }
     hanh_dong ∈ 'dong' | 'day_sang_nghiem_thu' | 'dong_dau' | 'cho_xac_nhan' | 'bo_qua'
   ========================================================================== */
export function quyetDinhChot(gopY, commit, nguon = 'commit', tuyenBoVa = false) {
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

  /* Đã đóng dấu đúng commit này rồi → lượt deploy sau không làm gì nữa.
     REV-0042 T3: bản trước chừa `chua_qua_cong` ra khỏi chốt này, nên phát lại
     bản tin 3 lần sinh 3 dòng lịch sử. Giờ KHÔNG chừa rổ nào. */
  if (gopY.deploy_sha && shaKhop(gopY.deploy_sha, sha)) {
    return { hanh_dong: 'bo_qua', ly_do: 'da_dong_dau', sha, tom_tat: tomTat,
             mo_ta: 'Góp ý này đã được đóng dấu bằng đúng commit đó ở lượt deploy trước.' };
  }

  /* ⚠️ CHỐT LÙI (C2). Bản vá vừa bị GỠ — không có gì "đã xong" ở đây cả.
     Máy không đổi trạng thái, không nhắn người gửi trong MỌI ca. Nhưng nếu
     góp ý đang mang nhãn đã đóng thì cái nhãn đó ĐANG NÓI DỐI — kêu cho Sếp. */
  if (laCommitLui(commit)) {
    if (ro === 'da_dong')
      return { hanh_dong: 'canh_bao_lui', trang_thai_moi: null, sha, tom_tat: tomTat,
               bao_nguoi_gui: false, bao_sep: true, nguon, ly_do: 'lui_sau_khi_da_dong',
               mo_ta: `Commit này GỠ bản vá, mà góp ý đang mang nhãn "${gopY.trang_thai}". ` +
                      'Nhãn đang nói dối — máy không tự mở lại, Sếp xem giúp.' };
    return { hanh_dong: 'bo_qua', ly_do: 'commit_lui', sha, tom_tat: tomTat,
             mo_ta: 'Commit này là một lượt GỠ bản vá (revert) — không phải bằng chứng đã sửa xong.' };
  }

  if (ro === 'da_dong') {
    return { hanh_dong: 'bo_qua', ly_do: 'da_dong', sha, tom_tat: tomTat,
             mo_ta: `Góp ý đã ở "${gopY.trang_thai}" — đóng rồi thì không mở lại bằng máy.` };
  }

  /* ⚠️ CHỐT BẰNG CHỨNG (C1). Lời khai trong thông điệp commit KHÔNG đủ —
     phải có file thật trong `src/` · `public/` · `migrations/` bị đổi. */
  const tep = xepCommitTheoTep(commit);
  if (tep === 'chi_tai_lieu') {
    return { hanh_dong: 'bo_qua', ly_do: 'chi_sua_tai_lieu', sha, tom_tat: tomTat,
             mo_ta: 'Commit này nhắc mã góp ý nhưng KHÔNG đổi file nào trong ' +
                    'src/ · public/ · migrations/ — chỉ là ghi chép, không phải bản vá.' };
  }

  /* Máy tin được đến đâu thì nói đến đó:
       - `tep === 'khong_biet'`  : có commit thật nhưng không đọc được danh sách
                                  file → KHÔNG đẩy, KHÔNG nhắn người gửi, dựng cờ.
       - `nguon === 'bang_chung'`: link do người dán, tự nó KHÔNG đủ (C5) —
                                  chỉ dựng cờ, không bao giờ đổi trạng thái.
       - `!tuyenBoVa`            : commit CHỈ NHẮC TÊN mã, không tuyên bố vá
                                  (REV-0064 C1, ca f1ab6c9) → chỉ đính bằng
                                  chứng, không đổi trạng thái, không nhắn ai. */
  const duDeDay = tep === 'co_code' && nguon === 'commit' && tuyenBoVa;

  /* 🔒 ĐÚNG MỘT TIN — THEO (GÓP Ý, COMMIT), không phải theo góp ý (C4).
     Bản trước đóng dấu vĩnh viễn: một lần nhắn nhầm là người gửi KHÔNG BAO GIỜ
     được báo nữa, và vòng nghiệm thu thứ 2 câm. Commit khác = đợt vá khác =
     đáng một tin. Cùng commit thì đã bị chặn ở `da_dong_dau` phía trên. */
  const chuaBao = !gopY.bao_da_len_luc || !shaKhop(gopY.deploy_sha, sha);

  if (duDeDay && ro === 'cho_phat_hanh') {
    return { hanh_dong: 'dong', trang_thai_moi: 'hoan_thanh', sha, tom_tat: tomTat,
             bao_nguoi_gui: chuaBao, bao_sep: false, nguon, ly_do: 'da_nghiem_thu_va_da_len',
             mo_ta: 'Người đã nghiệm thu xong, chỉ còn chờ phát hành — deploy chính là phát hành.' };
  }

  if (duDeDay && (ro === 'dang_xay' || ro === 'quy_trinh_hut')) {
    return { hanh_dong: 'day_sang_nghiem_thu', trang_thai_moi: 'cho_nghiem_thu', sha, tom_tat: tomTat,
             bao_nguoi_gui: chuaBao, bao_sep: ro === 'quy_trinh_hut', nguon,
             ly_do: ro === 'quy_trinh_hut' ? 'quy_trinh_hut_nhung_code_da_len' : 'da_len_cho_nguoi_gui_thu',
             mo_ta: ro === 'quy_trinh_hut'
               ? `Góp ý còn nằm ở "${gopY.trang_thai}" nhưng bản vá đã lên thật — quy trình hụt bước, ` +
                 'không phải chưa làm. Đẩy sang CHỜ NGHIỆM THU, cổng "đã xong" vẫn của Sếp.'
               : 'Bản vá đã lên hệ thống thật, nhưng chưa ai xác nhận nó hết vướng — bóng sang sân người gửi.' };
  }

  if (duDeDay && ro === 'san_nguoi_gui') {
    return { hanh_dong: 'dong_dau', trang_thai_moi: null, sha, tom_tat: tomTat,
             bao_nguoi_gui: chuaBao, bao_sep: false, nguon, ly_do: 'da_o_dung_cho',
             mo_ta: 'Đã ở "Chờ nghiệm thu" — chỉ đóng dấu bằng chứng và báo người gửi, không đổi trạng thái.' };
  }

  /* ⚠️ RỔ AN TOÀN. Máy KHÔNG đổi trang_thai — cổng duyệt là của Sếp.
     NHƯNG KHÔNG ĐƯỢC IM (Gạo chốt 29/08, mục 2a): nỗi đau gốc của Sếp là
     "người báo không biết". Có code thật lên thật thì người gửi vẫn được báo —
     báo đúng sự thật: *đã có bản sửa, đang chờ Sếp xác nhận*, không phải
     "đã xong". Đường phụ `bang_chung` và ca `khong_biet` thì KHÔNG nhắn: bằng
     chứng yếu hơn, thà im còn hơn báo sai. */
  const chiNhacTen = tep === 'co_code' && nguon === 'commit' && !tuyenBoVa;
  const baoNguoiGui = tep === 'co_code' && nguon === 'commit' && tuyenBoVa && chuaBao;
  const lyDo = tep === 'khong_biet' ? 'khong_doc_duoc_danh_sach_tep'
             : nguon === 'bang_chung' ? 'chi_co_link_bang_chung'
             : chiNhacTen ? 'chi_nhac_ten_khong_tuyen_bo_va'
             : ro === 'chua_xep' ? 'trang_thai_la' : 'chua_qua_cong_duyet';
  return { hanh_dong: 'cho_xac_nhan', trang_thai_moi: null, sha, tom_tat: tomTat,
           bao_nguoi_gui: baoNguoiGui, kieu_tin: 'cho_sep_xac_nhan', bao_sep: true, nguon, ly_do: lyDo,
           mo_ta: tep === 'khong_biet'
             ? 'Không đọc được commit này đổi những file nào — không đủ bằng chứng để đẩy, dựng cờ cho Sếp.'
             : nguon === 'bang_chung'
             ? 'Nhận ra qua link bằng chứng người dán sẵn. Một mình nó KHÔNG đủ để đổi trạng thái — dựng cờ cho Sếp.'
             : chiNhacTen
             ? `Commit này chỉ NHẮC TÊN GY-${gopY.id}, không viết "${TU_KHOA_DONG} GY-${gopY.id}" ở đầu dòng. ` +
               'Nhắc tên không phải là vá (REV-0064 C1) — máy chỉ đính bằng chứng, KHÔNG đổi trạng thái ' +
               'và KHÔNG nhắn người gửi. Đúng là đã vá thì Sếp bấm xác nhận, hoặc đẩy lại với "' +
               TU_KHOA_DONG + ' GY-' + gopY.id + '".'
             : ro === 'chua_xep'
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
/* Một góp ý có thể bị NHIỀU commit trong cùng lượt đẩy nhắc tên: một commit
   chỉ sửa tài liệu, một commit vá thật. Lấy "commit đầu tiên khớp" như bản
   trước là để một dòng ghi chép che mất bản vá thật ngay sau nó. Nên xếp hạng
   và GIỮ CÁI MẠNH NHẤT — bằng chứng thật thắng lời ghi chép. */
const HANG_HANH_DONG = { dong: 5, day_sang_nghiem_thu: 5, dong_dau: 5,
                         cho_xac_nhan: 4, canh_bao_lui: 3, bo_qua: 1 };

/** Hành động có ĐỘNG VÀO một cột nào của `gop_y` không. `canh_bao_lui` và
 *  `bo_qua` thì KHÔNG — chúng chỉ ghi lịch sử và kêu cho Sếp (REV-0064 H3). */
export const HANH_DONG_CO_GHI = new Set(['dong', 'day_sang_nghiem_thu',
                                         'dong_dau', 'cho_xac_nhan']);

/* ⚠️ AI BỊ GỠ TRONG CHÍNH LƯỢT ĐẨY NÀY — REV-0064 C2.
   Bản trước để bảng xếp hạng quyết: `dong` = 5 > `canh_bao_lui` = 3, nên
   lượt đẩy có CẢ bản vá LẪN bản gỡ thì bản vá luôn thắng, và người báo nhận
   tin "đã sửa xong" trong khi code trên hệ thống thật KHÔNG CÓ bản vá. Đúng
   thứ chốt lùi C2 sinh ra để chặn, bị chính bảng xếp hạng C6 mở lại.

   Từ nay GỠ là PHỦ QUYẾT, không phải xếp hạng. Nguyên tắc: NGHI NGỜ THÌ
   KHÔNG ĐÓNG.

   Bắt hai đường, vì commit gỡ không phải lúc nào cũng nhắc lại mã:
     ① mã nhắc trong chính thông điệp commit gỡ (git revert giữ nguyên tiêu
        đề cũ nên đường này bắt được ca thường gặp);
     ② `This reverts commit <sha>` trỏ tới một commit KHÁC TRONG CÙNG LƯỢT —
        thì mọi mã của commit bị gỡ đó cũng bị phủ quyết, kể cả khi người viết
        commit gỡ bằng câu chữ của riêng mình. */
function machGoTrongLuot(cacCommit) {
  const ds = cacCommit || [];
  const luiTheoId = new Map();          // gop_y_id → commit gỡ
  const dinhKem = (id, c) => { if (!luiTheoId.has(id)) luiTheoId.set(id, c); };

  for (const c of ds) {
    if (!laCommitLui(c)) continue;
    for (const id of docMaGopY(`${c.tieu_de || ''}\n${c.than || ''}`)) dinhKem(id, c);

    for (const m of String((c && c.than) || '')
                      .matchAll(/this\s+reverts\s+commit\s+([0-9a-f]{7,40})/gi)) {
      for (const bi of ds) {
        if (!shaKhop(bi.sha, m[1])) continue;
        for (const id of docMaGopY(`${bi.tieu_de || ''}\n${bi.than || ''}`)) dinhKem(id, c);
      }
    }
  }
  return luiTheoId;
}

export function chotCaLuot(cacCommit, tra, traTheoSha = () => []) {
  const raTheoId = new Map();

  const ghi = (id, qd) => {
    const cu = raTheoId.get(id);
    if (cu && (HANG_HANH_DONG[cu.hanh_dong] || 0) >= (HANG_HANH_DONG[qd.hanh_dong] || 0)) return;
    raTheoId.set(id, { gop_y_id: id, ...qd });
  };

  for (const c of cacCommit || []) {
    const chu = `${c.tieu_de || ''}\n${c.than || ''}`;
    const daTuyenBo = new Set(docMaTuyenBoVa(chu));
    for (const id of docMaGopY(chu))
      ghi(id, quyetDinhChot(tra(id), c, 'commit', daTuyenBo.has(id)));
  }

  /* Đường phụ: góp ý đã có sẵn link bằng chứng trỏ đúng một commit vừa lên.
     REV-0042 C5: một mình nó KHÔNG bao giờ đổi được trạng thái nữa (xem
     `duDeDay` trong quyetDinhChot) — cùng lắm dựng cờ cho Sếp. Vì người gửi
     hay dán chính link "commit GÂY RA lỗi" làm bằng chứng. */
  for (const c of cacCommit || []) {
    for (const g of traTheoSha(c.sha) || []) {
      if (!g) continue;
      const khop = docShaTrongLink(g.bang_chung_url).some(s => shaKhop(s, c.sha));
      if (khop) ghi(g.id, quyetDinhChot(g, c, 'bang_chung', false));
    }
  }

  /* ---- PHỦ QUYẾT (C2) — chạy SAU CÙNG nên không xếp hạng nào lật được ---- */
  for (const [id, cLui] of machGoTrongLuot(cacCommit)) {
    const cu = raTheoId.get(id);
    const g = tra(id);
    if (!g) continue;                       // không có phiếu thì không có gì để phủ quyết

    /* Lượt đẩy vừa VÁ vừa GỠ cùng một phiếu: đây là ca dễ nhầm nhất, phải KÊU
       chứ không được im — nhưng tuyệt đối không đổi cột nào, không nhắn người
       báo. Code trên hệ thống thật không có bản vá. */
    if (cu && HANH_DONG_CO_GHI.has(cu.hanh_dong)) {
      raTheoId.set(id, {
        gop_y_id: id, hanh_dong: 'canh_bao_lui', trang_thai_moi: null,
        sha: String(cLui.sha || '').toLowerCase(), tom_tat: cu.tom_tat,
        bao_nguoi_gui: false, bao_sep: true, nguon: 'commit', ly_do: 'va_roi_go_cung_luot',
        mo_ta: `Lượt đẩy này VỪA VÁ VỪA GỠ góp ý — commit ${String(cLui.sha).slice(0, 7)} ` +
               `gỡ lại bản vá. Code trên hệ thống thật KHÔNG CÓ bản vá, nên máy không đổi ` +
               `trạng thái (đang là "${g.trang_thai}") và không nhắn người báo. Sếp xem giúp.`
      });
      continue;
    }

    /* Còn lại: để chính quyetDinhChot xử commit gỡ đó — ra `canh_bao_lui` nếu
       phiếu đang mang nhãn đã đóng (nhãn nói dối), `bo_qua` nếu chưa. */
    if (!cu || (HANG_HANH_DONG[cu.hanh_dong] || 0) <= 3)
      raTheoId.set(id, { gop_y_id: id, ...quyetDinhChot(g, cLui, 'commit', false) });
  }

  return [...raTheoId.values()];
}
