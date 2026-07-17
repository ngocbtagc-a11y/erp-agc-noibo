/* ==========================================================================
   CRM Alpha Green Commerce — Điều khiển giao diện
   ---------------------------------------------------------------------------
   LƯU Ý VỀ PHÂN QUYỀN:
   Phần ẩn/hiện tab theo vai trò ở đây chỉ là ẩn trên trình duyệt, KHÔNG phải
   bảo mật. Người biết kỹ thuật vẫn xem được toàn bộ dữ liệu trong file data.js.
   Khi làm bản thật, máy chủ phải tự kiểm tra quyền trước khi trả dữ liệu về.
   ========================================================================== */

(function () {
  'use strict';

  /* ---- Danh mục tab ------------------------------------------------- */
  var TAB = [
    { id: 'tongquan',  ten: 'Tổng quan',  icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
    { id: 'danhba',    ten: 'Danh bạ',    icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8' },
    { id: 'nhansu',    ten: 'Nhân sự',    icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    { id: 'kinhdoanh', ten: 'Kinh doanh', icon: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
    { id: 'khovan',    ten: 'Kho vận',    icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' },
    { id: 'ketoan',    ten: 'Kế toán',    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' }
  ];

  /* ---- Kiểm tra phiên đăng nhập ------------------------------------- */
  var uid = sessionStorage.getItem('agc_user');
  var U = DB.taiKhoan.find(function (x) { return x.id === uid; });

  if (!U) { window.location.replace('index.html'); return; }

  /* ---- Trợ giúp ----------------------------------------------------- */
  function $(s) { return document.querySelector(s); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  // Chặn ký tự HTML để dữ liệu không phá vỡ trang
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- Thông tin người dùng ----------------------------------------- */
  $('#uAv').textContent = U.vietTat;
  $('#uTen').textContent = U.ten;
  $('#uChucVu').textContent = U.chucVu;

  var d = new Date();
  $('#ngayHomNay').textContent = 'Hôm nay, ' +
    ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'][d.getDay()] +
    ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();

  /* ---- Dựng thanh điều hướng theo quyền ----------------------------- */
  var nav = $('#dieuHuong');
  TAB.forEach(function (t) {
    var duocXem = U.quyen.indexOf(t.id) !== -1;
    var b = el('button', 'sb-item' + (duocXem ? '' : ' locked'));
    b.innerHTML =
      '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="' + t.icon + '"/></svg>' +
      '<span>' + esc(t.ten) + '</span>';
    if (duocXem) {
      b.dataset.tab = t.id;
      b.addEventListener('click', function () { moTab(t.id); });
    } else {
      b.title = 'Chức vụ của bạn không được xem mục này';
    }
    nav.appendChild(b);
  });

  /* ---- Chuyển tab --------------------------------------------------- */
  function moTab(id) {
    if (U.quyen.indexOf(id) === -1) return;

    TAB.forEach(function (t) {
      var v = document.getElementById('v-' + t.id);
      if (v) v.hidden = (t.id !== id);
    });

    document.querySelectorAll('.sb-item[data-tab]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === id);
    });

    var t = TAB.find(function (x) { return x.id === id; });
    $('#tieuDe').textContent = t ? t.ten : '';

    dongThanhBen();
    window.scrollTo(0, 0);
  }

  /* ---- Thanh bên trên điện thoại ------------------------------------ */
  var sb = $('#thanhBen'), lp = $('#lopPhu');
  function dongThanhBen() { sb.classList.remove('open'); lp.classList.remove('show'); }
  $('#nutMenu').addEventListener('click', function () {
    sb.classList.toggle('open'); lp.classList.toggle('show');
  });
  lp.addEventListener('click', dongThanhBen);

  $('#nutThoat').addEventListener('click', function () {
    sessionStorage.removeItem('agc_user');
    window.location.replace('index.html');
  });

  /* ==========================================================================
     CÁC KHỐI DỰNG SẴN
     ========================================================================== */

  function veThe(dich, ds) {
    var box = $(dich);
    if (!box) return;
    box.innerHTML = '';
    ds.forEach(function (s) {
      box.appendChild(el('div', 'stat',
        '<div class="k">' + esc(s.k) + '</div>' +
        '<div class="v">' + esc(s.v) + '</div>' +
        '<div class="d ' + (s.dir || '') + '">' + esc(s.d) + '</div>'
      ));
    });
  }

  function veChart(dich, ds) {
    var box = $(dich);
    if (!box) return;
    box.innerHTML = '';
    var max = Math.max.apply(null, ds.map(function (x) { return x.v; })) || 1;
    ds.forEach(function (c) {
      var col = el('div', 'col' + (c.hi ? ' hi' : ''));
      col.innerHTML =
        '<div class="vl">' + esc(c.v) + '</div>' +
        '<div class="fill" style="height:0"></div>' +
        '<div class="lb">' + esc(c.lb) + '</div>';
      box.appendChild(col);
      // Chờ một nhịp để hiệu ứng cột chạy từ dưới lên
      requestAnimationFrame(function () {
        col.querySelector('.fill').style.height = Math.max(2, (c.v / max) * 100) + '%';
      });
    });
  }

  function veTienDo(dich, ds) {
    var box = $(dich);
    if (!box) return;
    box.innerHTML = '';
    ds.forEach(function (m) {
      var mau = m.pct >= 70 ? '' : (m.pct >= 40 ? 'warn' : 'danger');
      var r = el('div', 'list-item');
      r.innerHTML =
        '<div class="body">' +
          '<b>' + esc(m.b) + '</b>' +
          '<span>' + esc(m.note) + '</span>' +
          '<div class="bar-row" style="margin-top:8px">' +
            '<div class="bar"><i class="' + mau + '" style="width:0"></i></div>' +
            '<div class="pct">' + m.pct + '%</div>' +
          '</div>' +
        '</div>';
      box.appendChild(r);
      requestAnimationFrame(function () {
        r.querySelector('.bar > i').style.width = m.pct + '%';
      });
    });
  }

  function veDanhSach(dich, ds) {
    var box = $(dich);
    if (!box) return;
    box.innerHTML = '';
    ds.forEach(function (i) {
      box.appendChild(el('div', 'list-item',
        '<div class="bullet ' + (i.m || '') + '"></div>' +
        '<div class="body"><b>' + esc(i.b) + '</b><span>' + esc(i.s) + '</span></div>' +
        '<div class="meta">' + esc(i.t) + '</div>'
      ));
    });
  }

  function veBang(dich, ds, hang) {
    var box = $(dich);
    if (!box) return;
    box.innerHTML = '';
    ds.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = hang(r);
      box.appendChild(tr);
    });
  }

  /* ==========================================================================
     ĐỔ DỮ LIỆU TỪNG TAB
     ========================================================================== */

  /* -- Tổng quan -- */
  veThe('#tq-the', DB.tongQuan.the);
  veChart('#tq-chart', DB.tongQuan.doanhThu6Thang);
  veTienDo('#tq-muctieu', DB.tongQuan.mucTieuQuy);
  veDanhSach('#tq-canhbao', DB.tongQuan.cannBaoDong);

  /* -- Danh bạ -- */
  if (U.quyen.indexOf('danhba') !== -1) {
    // Bỏ dấu để gõ "ke toan" cũng tìm ra "Kế toán"
    function boDau(s) {
      return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    }

    function veDanhBa(tuKhoa) {
      var k = boDau((tuKhoa || '').trim());
      var ds = DB.danhBa.filter(function (n) {
        if (!k) return true;
        return boDau(n.ten + ' ' + n.cv + ' ' + n.bp + ' ' + n.sdt + ' ' + n.email).indexOf(k) !== -1;
      });

      veBang('#db-bang', ds, function (n) {
        return '' +
          '<td><div class="person"><div class="av">' + esc(n.vt) + '</div>' +
            '<div><div class="nm">' + esc(n.ten) + '</div>' +
            '<div class="sm">' + esc(n.cv) + '</div></div></div></td>' +
          '<td>' + esc(n.bp) + '</td>' +
          '<td><a class="lnk" href="tel:' + esc(n.sdt.replace(/\s/g, '')) + '">' + esc(n.sdt) + '</a></td>' +
          '<td><a class="lnk" href="mailto:' + esc(n.email) + '">' + esc(n.email) + '</a></td>' +
          '<td class="sm">' + esc(n.ql) + '</td>';
      });

      $('#db-trong').hidden = ds.length > 0;
      $('#db-dem').textContent = ds.length + '/' + DB.danhBa.length + ' người';
    }

    veDanhBa('');
    $('#db-tim').addEventListener('input', function (e) { veDanhBa(e.target.value); });
  }

  /* -- Nhân sự -- */
  if (U.quyen.indexOf('nhansu') !== -1) {
    veThe('#ns-the', DB.nhanSu.the);
    veTienDo('#ns-chuyendoi', DB.nhanSu.chuyenDoi);
    veDanhSach('#ns-lich', DB.nhanSu.lich);

    // Cột lương chỉ hiện với Giám đốc, Phó Giám đốc, Kế toán trưởng
    if (!U.xemLuong) {
      $('#ns-thLuong').remove();
      $('#ns-hint').textContent = 'Chức vụ của bạn không xem được cột lương';
    }

    veBang('#ns-bang', DB.nhanSu.danhSach, function (r) {
      return '' +
        '<td><div class="person"><div class="av">' + esc(r.vt) + '</div>' +
          '<div><div class="nm">' + esc(r.ten) + '</div>' +
          '<div class="sm">' + esc(r.cv) + '</div></div></div></td>' +
        '<td>' + esc(r.bp) + '</td>' +
        '<td><span class="tag ' + (r.pn === 'Công ty' ? 'sage' : 'mute') + '">' + esc(r.pn) + '</span></td>' +
        '<td><span class="tag ' + esc(r.tt) + '">' + esc(r.ttx) + '</span></td>' +
        '<td class="sm">' + esc(r.vao) + '</td>' +
        (U.xemLuong ? '<td class="num">' + esc(DB.nhanSu.luong[r.id] || '—') + '</td>' : '');
    });
  }

  /* -- Kinh doanh -- */
  if (U.quyen.indexOf('kinhdoanh') !== -1) {
    veThe('#kd-the', DB.kinhDoanh.the);
    veChart('#kd-chart', DB.kinhDoanh.theoKenh);
    veDanhSach('#kd-doithu', DB.kinhDoanh.doiThu);
    veBang('#kd-bang', DB.kinhDoanh.topSanPham, function (r) {
      return '' +
        '<td><div class="nm">' + esc(r.sp) + '</div></td>' +
        '<td class="sm">' + esc(r.dm) + '</td>' +
        '<td class="num">' + esc(r.dh) + '</td>' +
        '<td class="num">' + esc(r.dt) + '</td>' +
        '<td><span class="tag ' + esc(r.tt) + '">' + esc(r.ttx) + '</span></td>';
    });
  }

  /* -- Kho vận -- */
  if (U.quyen.indexOf('khovan') !== -1) {
    veThe('#kv-the', DB.khoVan.the);
    veChart('#kv-chart', DB.khoVan.donHang);
    veDanhSach('#kv-nhap', DB.khoVan.nhapHang);
    veBang('#kv-bang', DB.khoVan.tonKho, function (r) {
      return '' +
        '<td><div class="nm">' + esc(r.sp) + '</div></td>' +
        '<td class="sm">' + esc(r.ma) + '</td>' +
        '<td class="num">' + esc(r.sl) + '</td>' +
        '<td class="num">' + esc(r.ngay.toFixed(1)) + '</td>' +
        '<td><span class="tag ' + esc(r.tt) + '">' + esc(r.ttx) + '</span></td>';
    });
  }

  /* -- Kế toán -- */
  if (U.quyen.indexOf('ketoan') !== -1) {
    veThe('#kt-the', DB.keToan.the);
    veChart('#kt-chart', DB.keToan.chiPhi);
    veDanhSach('#kt-thue', DB.keToan.thue.map(function (x) {
      return { m: x.t === 'Hoàn thành' ? '' : (x.t === 'Đang xử lý' ? 'warn' : 'danger'), b: x.b, s: x.s, t: x.t };
    }));
    veBang('#kt-bang', DB.keToan.congNo, function (r) {
      return '' +
        '<td><div class="nm">' + esc(r.dt) + '</div></td>' +
        '<td><span class="tag ' + (r.loai === 'Phải thu' ? 'ok' : 'mute') + '">' + esc(r.loai) + '</span></td>' +
        '<td class="num">' + esc(r.st) + '</td>' +
        '<td class="sm">' + esc(r.han) + '</td>' +
        '<td><span class="tag ' + esc(r.tt) + '">' + esc(r.ttx) + '</span></td>';
    });
  }

  /* ---- Mở tab đầu tiên mà người dùng được xem ------------------------ */
  moTab(U.quyen[0]);

})();
