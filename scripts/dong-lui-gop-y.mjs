/* ============================================================================
   ĐÓNG LÙI GÓP Ý ĐÃ SỬA XONG TỪ TRƯỚC — CHẠY TAY, HỎI TRƯỚC KHI GHI
   ---------------------------------------------------------------------------
   Vì sao có file này: từ hôm nay deploy tự chốt góp ý (GY-12 trong thông điệp
   commit). Nhưng những bản vá đã lên TRƯỚC hôm nay thì commit của chúng không
   có mã nào — máy không đọc ra được. Chúng vẫn đang mang nhãn "Đã duyệt — chờ
   phân tích" trong khi đã chạy thật từ lâu. Đây là cái dụng cụ đóng chúng lại.

   ⚠️ KHÔNG viết cứng vào migration. Migration chạy là ghi luôn, không ai kịp
   nhìn. File này thì NGƯỢC LẠI: nó IN RA từng dòng sẽ đổi (từ gì → sang gì,
   của ai) rồi mới hỏi. Không gõ đúng chữ xác nhận thì nó không ghi một chữ.

   ---------------------------------------------------------------------------
   CÁCH DÙNG

   1) TÌM góp ý cần đóng (chỉ đọc, không ghi gì):
        node scripts/dong-lui-gop-y.mjs --tim "thông báo khi có tin nhắn"
        node scripts/dong-lui-gop-y.mjs --tim "" --remote        (xem tất cả)

   2) XEM TRƯỚC kế hoạch (vẫn chưa ghi gì):
        node scripts/dong-lui-gop-y.mjs --remote 12=7bf0e58 15=cc13f89

   3) GHI THẬT — sau khi đã đọc kỹ bảng in ra:
        node scripts/dong-lui-gop-y.mjs --remote --ghi 12=7bf0e58 15=cc13f89
      Nó vẫn hỏi lại, phải gõ đúng: ĐỒNG Ý

   Cờ khác:
     --remote        chạy trên DB THẬT (mặc định là DB ở máy, --local)
     --uy-quyen ID   mã nhân sự chịu trách nhiệm cho lượt đóng lùi này
                     (mặc định ns_001 — Sếp Ngọc). Ghi vào cột uy_quyen_boi_id.
     --tom-tat "…"   một câu "đã sửa gì" gửi cho người gửi; không có thì lấy
                     tiêu đề commit từ git.

   ---------------------------------------------------------------------------
   CHỈ ĐỔI ĐÚNG NHỮNG DÒNG ĐÃ IN RA — chứng minh bằng ba lớp:
     ① mỗi câu UPDATE khoá cứng `WHERE id = ? AND trang_thai = ?` với ĐÚNG
        trạng thái vừa in. Dòng đã đổi trong lúc bạn đọc → 0 dòng bị ghi, và
        script nói ra chuyện đó.
     ② chụp ảnh TOÀN BẢNG gop_y trước và sau, rồi so từng dòng. Có một dòng
        nào ngoài danh sách bị đổi → in ĐỎ và trả mã lỗi.
     ③ `lenhDongLui()` là hàm THUẦN, được bàn thử do-chot-gop-y-deploy.mjs
        chạy thẳng trên SQLite thật (không chép lại một dòng SQL nào).
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';

/* ---- Sinh các câu lệnh cho MỘT góp ý — HÀM THUẦN, bàn thử soi thẳng ------
   `trangThaiDaIn` là chốt an toàn: đúng cái trạng thái vừa in ra màn hình.
   Đưa vào WHERE nghĩa là "chỉ ghi nếu thực tế vẫn y như lúc bạn nhìn". */
export function lenhDongLui({ id, sha, tomTat, trangThaiDaIn, uyQuyenBoiId, daBaoRoi = false }) {
  const q = (s) => s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
  const NAY = "datetime('now', '+7 hours')";
  const lenh = [
    // ① Bản ghi góp ý. KHÔNG ghi đè bang_chung_url nếu người đã dán tay.
    `UPDATE gop_y
        SET trang_thai = 'hoan_thanh', current_owner = 'NONE', next_owner = 'NONE',
            dong_kieu = 'code', can_xac_minh_lai = 0, deploy_cho_xac_nhan = 0,
            deploy_sha = ${q(sha)}, deploy_luc = ${NAY}, deploy_tom_tat = ${q(tomTat)},
            bang_chung_url = COALESCE(NULLIF(bang_chung_url, ''), ${q(sha)}),
            bao_da_len_luc = COALESCE(bao_da_len_luc, ${NAY}),
            cap_nhat_luc = ${NAY}
      WHERE id = ${Number(id)} AND trang_thai = ${q(trangThaiDaIn)};`,

    // ② Lịch sử — KHÔNG mạo danh ai. `tac_nhan` nói cái gì chạy, `uy_quyen_boi_id`
    //    nói ai chịu trách nhiệm. Đúng ba trường SPEC-0002 dựng ra để dùng.
    `INSERT INTO gop_y_lich_su
        (gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, nguoi_thuc_hien_loai,
         tac_nhan, uy_quyen_boi_id, job_id, ghi_chu, luc)
      SELECT ${Number(id)}, ${q(trangThaiDaIn)}, 'hoan_thanh', NULL, 'he_thong',
             'ĐÓNG LÙI TAY', ${q(uyQuyenBoiId)}, ${q(String(sha).slice(0, 12))},
             ${q(`Bản vá đã lên hệ thống thật từ trước (commit ${String(sha).slice(0, 7)})` +
                 (tomTat ? ` — ${tomTat}` : '') +
                 '. Đóng lùi bằng scripts/dong-lui-gop-y.mjs sau khi người xác nhận.')},
             ${NAY}
       WHERE EXISTS (SELECT 1 FROM gop_y WHERE id = ${Number(id)} AND trang_thai = 'hoan_thanh'
                       AND deploy_sha = ${q(sha)});`
  ];

  /* ③ Báo người gửi — ĐÚNG MỘT TIN.
     Chốt nằm ở `daBaoRoi`, đọc từ `gop_y.bao_da_len_luc` TRƯỚC khi câu ① đóng
     dấu. Góp ý đã từng được báo (deploy tự chốt, hoặc lần chạy trước của
     chính file này) thì câu này không tồn tại — không phải "chèn rồi lọc". */
  if (!daBaoRoi) lenh.push(
    `INSERT INTO thong_bao (nhom, noi_dung, loai, lien_ket, nguoi_nhan_id, tao_luc)
      SELECT 'ca_nhan',
             'Góp ý "' || g.tieu_de || '" của bạn đã được sửa xong và đã lên hệ thống' ||
             ${tomTat ? `' — ' || ${q(tomTat)} || '.'` : `'.'`},
             'gop_y_cap_nhat', ${q(String(id))}, g.nguoi_gui_id, ${NAY}
        FROM gop_y g
       WHERE g.id = ${Number(id)} AND g.trang_thai = 'hoan_thanh' AND g.deploy_sha = ${q(sha)};`);

  return lenh;
}

/* ========================================================================== */
/*  Từ đây xuống là phần chạy tay — không được import vào máy chủ.            */
/* ========================================================================== */

const ARG = process.argv.slice(2);
const co = (c) => ARG.includes(c);
const lay = (c, md = null) => { const i = ARG.indexOf(c); return i >= 0 ? ARG[i + 1] : md; };
const XA = co('--remote');
const GHI = co('--ghi');
const UY_QUYEN = lay('--uy-quyen', 'ns_001');

function d1(sql) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'crm-agc',
    XA ? '--remote' : '--local', '--json', '--command', sql],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, shell: process.platform === 'win32' });
  const j = out.slice(out.indexOf('['));
  const kq = JSON.parse(j);
  return { dong: kq[0]?.results || [], ghi: kq[0]?.meta?.changes ?? kq[0]?.meta?.rows_written ?? 0 };
}

const COT_SOI = 'id, trang_thai, deploy_sha, deploy_cho_xac_nhan, bao_da_len_luc, dong_kieu, bang_chung_url';
const anhChup = () => new Map(d1(`SELECT ${COT_SOI} FROM gop_y ORDER BY id`).dong.map(r => [r.id, JSON.stringify(r)]));

function hoi(cauHoi) {
  return new Promise((giai) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(cauHoi, (tl) => { rl.close(); giai(tl.trim()); });
  });
}

function tieuDeCommit(sha) {
  try { return execFileSync('git', ['log', '-1', '--format=%s', sha], { encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

async function main() {
  console.log(`\n═══ ĐÓNG LÙI GÓP Ý — DB ${XA ? '🌐 THẬT (--remote)' : '💻 ở máy (--local)'} ═══\n`);

  /* ---- Chế độ TÌM: chỉ đọc ---------------------------------------------- */
  if (co('--tim')) {
    const tu = (lay('--tim', '') || '').trim();
    const dieu = tu ? `WHERE (g.tieu_de LIKE '%${tu.replace(/'/g, "''")}%'
                          OR g.vuong_o_dau LIKE '%${tu.replace(/'/g, "''")}%')` : '';
    const ds = d1(`SELECT g.id, g.trang_thai, g.tieu_de, n.ho_ten, g.deploy_sha
                     FROM gop_y g JOIN nhan_su n ON n.id = g.nguoi_gui_id
                    ${dieu} ORDER BY g.id LIMIT 50`).dong;
    if (!ds.length) { console.log('Không tìm thấy góp ý nào khớp.\n'); return; }
    for (const g of ds)
      console.log(`  GY-${String(g.id).padEnd(4)} [${String(g.trang_thai).padEnd(20)}] ` +
                  `${g.ho_ten} — ${g.tieu_de}${g.deploy_sha ? ' · đã có dấu deploy' : ''}`);
    console.log(`\n${ds.length} góp ý. Chọn xong thì chạy lại với:  <mã>=<commit>  ví dụ 12=7bf0e58\n`);
    return;
  }

  /* ---- Đọc cặp <mã>=<commit> -------------------------------------------- */
  const cap = ARG.filter(a => /^\d+=[0-9a-f]{7,40}$/i.test(a))
    .map(a => { const [id, sha] = a.split('='); return { id: parseInt(id, 10), sha: sha.toLowerCase() }; });
  if (!cap.length) {
    console.log('Chưa nêu góp ý nào. Ví dụ:\n' +
      '  node scripts/dong-lui-gop-y.mjs --tim "thông báo tin nhắn"\n' +
      '  node scripts/dong-lui-gop-y.mjs --remote 12=7bf0e58 15=cc13f89\n' +
      '  node scripts/dong-lui-gop-y.mjs --remote --ghi 12=7bf0e58 15=cc13f89\n');
    process.exit(1);
  }

  /* ---- IN RÕ SẼ ĐỔI NHỮNG GÌ -------------------------------------------- */
  const ds = d1(`SELECT g.id, g.trang_thai, g.tieu_de, g.bang_chung_url, g.deploy_sha,
                        g.bao_da_len_luc, n.ho_ten
                   FROM gop_y g JOIN nhan_su n ON n.id = g.nguoi_gui_id
                  WHERE g.id IN (${cap.map(c => c.id).join(',')})`).dong;
  const theoId = new Map(ds.map(g => [g.id, g]));

  const keHoach = [], boQua = [];
  for (const c of cap) {
    const g = theoId.get(c.id);
    if (!g) { boQua.push({ ...c, vi_sao: 'không có góp ý mang mã này' }); continue; }
    if (['hoan_thanh', 'da_huy', 'bi_tu_choi'].includes(g.trang_thai)) {
      boQua.push({ ...c, vi_sao: `đã đóng rồi ("${g.trang_thai}")` }); continue;
    }
    const tomTat = lay('--tom-tat') || tieuDeCommit(c.sha) || null;
    keHoach.push({ ...c, g, tomTat, trangThaiDaIn: g.trang_thai });
  }

  console.log('SẼ ĐỔI ĐÚNG NHỮNG DÒNG NÀY:\n');
  for (const k of keHoach) {
    console.log(`  GY-${k.id} — ${k.g.tieu_de}`);
    console.log(`     người gửi   : ${k.g.ho_ten}  ← sẽ nhận 1 tin "đã sửa xong và đã lên hệ thống"`);
    console.log(`     trạng thái  : "${k.trangThaiDaIn}"  →  "hoan_thanh"`);
    console.log(`     bằng chứng  : ${k.g.bang_chung_url || '(trống)'}  →  ${k.g.bang_chung_url || k.sha}`);
    console.log(`     tóm tắt gửi : ${k.tomTat || '(không có — chỉ báo là đã lên)'}`);
    console.log(`     chịu trách nhiệm: ${UY_QUYEN}\n`);
  }
  if (boQua.length) {
    console.log('BỎ QUA (không ghi gì):');
    for (const b of boQua) console.log(`  GY-${b.id} — ${b.vi_sao}`);
    console.log('');
  }
  console.log(`Tổng: sẽ đổi ${keHoach.length} dòng, bỏ qua ${boQua.length} dòng.`);
  if (!keHoach.length) { console.log('Không có gì để làm.\n'); return; }

  if (!GHI) {
    console.log('\n👀 ĐANG Ở CHẾ ĐỘ XEM TRƯỚC — chưa ghi một chữ nào.');
    console.log('   Đọc kỹ bảng trên. Đúng rồi thì chạy lại y hệt và thêm cờ  --ghi\n');
    return;
  }

  const tl = await hoi('\nGõ đúng hai chữ  ĐỒNG Ý  để ghi thật (bất kỳ chữ nào khác = huỷ): ');
  if (tl.toUpperCase() !== 'ĐỒNG Ý') { console.log('Đã huỷ. Không ghi một chữ nào.\n'); return; }

  /* ---- Ghi, kèm chứng minh chỉ đổi đúng những dòng đã in ---------------- */
  const truoc = anhChup();
  for (const k of keHoach) {
    console.log(`\n→ GY-${k.id}`);
    for (const sql of lenhDongLui({ id: k.id, sha: k.sha, tomTat: k.tomTat,
                                    trangThaiDaIn: k.trangThaiDaIn, uyQuyenBoiId: UY_QUYEN,
                                    daBaoRoi: !!k.g.bao_da_len_luc })) {
      const r = d1(sql);
      console.log(`   ${r.ghi} dòng ghi · ${sql.trim().split('\n')[0].slice(0, 60)}…`);
      if (r.ghi === 0 && /^UPDATE gop_y/.test(sql.trim())) {
        console.log(`   ⚠️  0 dòng — góp ý này đã đổi trạng thái kể từ lúc in bảng. BỎ QUA, không ép.`);
        break;
      }
    }
  }

  const sau = anhChup();
  const doi = [...sau.keys()].filter(id => truoc.get(id) !== sau.get(id));
  const chuY = new Set(keHoach.map(k => k.id));
  const ngoaiDanhSach = doi.filter(id => !chuY.has(id));
  const themBot = [...sau.keys()].length !== [...truoc.keys()].length;

  console.log('\n─── CHỨNG MINH ───');
  console.log(`  dòng đã đổi   : ${doi.length} (${doi.map(i => 'GY-' + i).join(', ') || '—'})`);
  console.log(`  ngoài danh sách: ${ngoaiDanhSach.length} ${ngoaiDanhSach.length ? '❌ ' + ngoaiDanhSach.join(',') : '✅'}`);
  console.log(`  số dòng bảng   : ${[...truoc.keys()].length} → ${[...sau.keys()].length} ${themBot ? '❌' : '✅'}\n`);
  if (ngoaiDanhSach.length || themBot) process.exit(1);
}

// Chỉ chạy khi gọi thẳng từ dòng lệnh; bàn thử import `lenhDongLui` thì không.
if (process.argv[1] && /dong-lui-gop-y\.mjs$/.test(process.argv[1]))
  main().catch(e => { console.error('\n💥 ' + (e.stack || e.message)); process.exit(2); });
