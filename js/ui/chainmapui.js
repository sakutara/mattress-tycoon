/* Bản đồ chuỗi: trụ sở, chi nhánh, đại lý nhượng quyền, đối thủ trên một bản đồ khu vực (SVG), chạm vào ghim để xem chi tiết */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels, res = UI.res, Ch = G.chain;
  UI.st.map = { sel: 'hq', view: null };
  var BR = [[95, 150], [265, 150], [70, 262], [290, 262], [110, 352], [250, 352], [180, 105], [180, 392]];
  var FR = [[35, 75], [130, 60], [230, 55], [325, 85], [335, 195], [335, 320], [310, 405], [210, 418], [110, 418], [40, 385], [28, 300], [30, 190]];
  var RV = [[140, 195], [228, 192], [190, 305]];
  var HQ = [180, 232];
  function pin(x, y, fill, stroke, sc, id, extra) {
    var sel = UI.st.map.sel === id;
    return '<g data-act="mapSel" data-id="' + id + '" style="cursor:pointer" transform="translate(' + x + ' ' + y + ') scale(' + sc + ')">' + (sel ? '<circle cx="0" cy="-20" r="25" fill="none" stroke="#FF6F5E" stroke-width="2.5" stroke-dasharray="4 3"/>' : '') +
      '<ellipse cx="0" cy="2" rx="9" ry="3" fill="rgba(0,0,0,.18)"/><path d="M0 0 C-17 -18 -17 -40 0 -40 C17 -40 17 -18 0 0Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>' + (extra || '<path d="M-8 -22 H8 V-14 H-8Z M-10 -22 L0 -31 L10 -22Z" fill="#fff"/>') + '</g>';
  }
  function swordPin(x, y, id) { return pin(x, y, '#E5384F', '#9B1C2E', 0.7, id, '<path d="M-7 -30 L7 -14 M7 -30 L-7 -14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'); }
  function label(x, y, t, sc) { return '<text x="' + x + '" y="' + (y + 12 * (sc || 1)) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#26325F" stroke="#fff" stroke-width="3" paint-order="stroke">' + E(t) + '</text>'; }
  function svg() {
    var s = G.state, mx = G.progress.maxBranches(), list = Ch.list(), paying = Ch.paying(), o = '';
    o += '<svg viewBox="0 0 360 440" width="100%" style="display:block;border-radius:12px;background:#EFE9D6">' +
      '<defs><pattern id="mg" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#E4DCC2" stroke-width="1"/></pattern></defs><rect width="360" height="440" fill="url(#mg)"/>' +
      '<path d="M-10 340 C70 300 130 385 220 345 S330 300 370 322" fill="none" stroke="#9AD3F5" stroke-width="22" stroke-linecap="round"/><path d="M-10 340 C70 300 130 385 220 345 S330 300 370 322" fill="none" stroke="#C6E8FB" stroke-width="12" stroke-linecap="round"/>' +
      '<ellipse cx="60" cy="110" rx="34" ry="22" fill="#BFE3B4"/><ellipse cx="300" cy="215" rx="30" ry="20" fill="#BFE3B4"/><ellipse cx="205" cy="268" rx="26" ry="16" fill="#C9E9BE"/><ellipse cx="55" cy="215" rx="22" ry="14" fill="#C9E9BE"/>' +
      '<g stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none"><path d="M0 232H360"/><path d="M180 0V440"/><path d="M0 60L360 400"/><path d="M360 40L0 410"/></g><g stroke="#F6D77A" stroke-width="2" fill="none" stroke-dasharray="6 5"><path d="M0 232H360"/><path d="M180 0V440"/></g>' +
      '<text x="12" y="425" font-size="10" fill="#9C8F6A" font-weight="700">Hà Nội · khu vực kinh doanh</text>';
    FR.forEach(function (p, i) { if (i < s.corp.franchises) { o += pin(p[0], p[1], '#FF9F43', '#B8651A', 0.55, 'f' + i, '<path d="M-7 -24 H7 V-16 H-7Z M-9 -24 L0 -32 L9 -24Z" fill="#fff"/>'); } });
    s.rivals.list.forEach(function (r, i) { var p = RV[i % RV.length]; o += swordPin(p[0], p[1], 'r' + r.id) + label(p[0], p[1], r.name, 0.8); });
    BR.forEach(function (p, i) {
      if (i < s.branches) { var b = list[i], col = !paying ? '#9AA5C4' : b.f < 0.95 ? '#F5B041' : '#34C997'; o += pin(p[0], p[1], col, '#1F7A5A', 0.95, 'b' + b.id) + label(p[0], p[1], b.district); }
      else if (i < mx) { o += '<g data-act="mapOpen" style="cursor:pointer" transform="translate(' + p[0] + ' ' + p[1] + ')"><circle cx="0" cy="-18" r="14" fill="rgba(255,255,255,.7)" stroke="#36A8F0" stroke-width="2" stroke-dasharray="4 3"/><path d="M-6 -18H6M0 -24V-12" stroke="#36A8F0" stroke-width="3" stroke-linecap="round"/></g>' + label(p[0], p[1], Ch.DIST[i]); }
      else o += '<g opacity=".45" transform="translate(' + p[0] + ' ' + p[1] + ')"><circle cx="0" cy="-18" r="12" fill="#fff" stroke="#9AA5C4" stroke-width="1.5" stroke-dasharray="3 3"/><rect x="-5" y="-20" width="10" height="8" rx="1.5" fill="#9AA5C4"/><path d="M-3 -20 v-3 a3 3 0 0 1 6 0 v3" fill="none" stroke="#9AA5C4" stroke-width="1.6"/></g>';
    });
    o += pin(HQ[0], HQ[1], '#FFD93D', '#B8860B', 1.3, 'hq') + label(HQ[0], HQ[1], 'Trụ sở · Hoàn Kiếm', 1.3);
    return o + '</svg>';
  }
  function row(k, v) { return '<tr><td>' + k + '</td><td class="r">' + v + '</td></tr>'; }
  function detail() {
    var s = G.state, sel = UI.st.map.sel, h = '', list = Ch.list(), tot = Ch.totalPerDay();
    if (sel === 'hq') {
      var t = s.today;
      h += '<b>Trụ sở · ' + E(s.shopName) + '</b> <span class="muted small">' + E(G.lvl().name) + '</span><table class="tbl small">' + row('Doanh thu hôm nay', F.short(t.revenue)) + row('Lãi tạm tính hôm nay', F.short(G.econ.profit(t))) + row('Khách vào hôm nay', t.visitors) + row('Nhân viên', s.staff.length) + row('Danh tiếng / sao', Math.round(s.rep) + ' · ' + s.avgRating.toFixed(1).replace('.', ',') + '★') + '</table>';
    } else if (sel.charAt(0) === 'b') {
      var b = list.filter(function (x) { return 'b' + x.id === sel; })[0];
      if (!b) h += '<span class="muted">Chọn một ghim trên bản đồ.</span>';
      else {
        var rank = list.slice().sort(function (a, c) { return Ch.avg7(c) - Ch.avg7(a); }).indexOf(b) + 1;
        h += '<b>' + E(s.shopName) + ' · ' + E(b.district) + '</b> <span class="muted small">mở ngày ' + b.opened + '</span><table class="tbl small">' + row('Trạng thái', Ch.paying() ? '<span class="pos">Hoạt động</span>' : '<span class="neg">Thiếu Quản lý (' + G.staff.count('manager') + '/' + s.branches + '): chưa có thu nhập</span>') + row('Thu nhập TB 7 ngày', F.short(Ch.avg7(b)) + '/ngày') + row('Thu nhập tháng (ước tính)', F.short(Ch.avg7(b) * 30)) + row('Tổng từ khi mở', F.short(b.total)) + row('Hiệu suất khu vực', '×' + b.f.toFixed(2).replace('.', ',')) + row('Xếp hạng trong chuỗi', rank + '/' + list.length) + '</table><button class="btn primary" data-act="mapEnter" data-id="' + b.id + '">🏬 Xem nội thất cửa hàng</button>';
      }
    } else if (sel.charAt(0) === 'f') {
      h += '<b>Đại lý nhượng quyền</b><table class="tbl small">' + row('Bản quyền', F.short(G.corp.frRoyalty()) + '/tháng') + row('Tổng đại lý', s.corp.franchises + '/' + G.corp.frMax()) + '</table><div class="muted small">Danh tiếng dưới 50 thì đại lý có thể làm ăn ẩu và kéo tụt thương hiệu.</div>';
    } else if (sel.charAt(0) === 'r') {
      var r = s.rivals.list.filter(function (x) { return 'r' + x.id === sel; })[0];
      h += r ? '<b>⚔ ' + E(r.name) + '</b> <span class="muted small">' + E(G.rivals.TYPES[r.type].label) + '</span><table class="tbl small">' + row('Sức mạnh', G.rivals.strLabel(r)) + row('Kéo khách', (G.rivals.impact(r) * 100).toFixed(1).replace('.', ',') + '%') + row('Tình trạng', G.rivals.promoting(r) ? 'Đang khuyến mãi' : r.closedUntil >= s.day ? 'Tạm đóng cửa' : 'Bình thường') + '</table>' : '';
    }
    return h;
  }
  function branchPage() {
    var s = G.state, list = Ch.list(), i = list.map(function (x) { return x.id; }).indexOf(UI.st.map.view), b = list[i];
    if (!b) { UI.st.map.view = null; return null; }
    var v = G.branchView.cur, f = v && v.id === b.id ? v.fr : null;
    var h = '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:6px"><button class="mini" data-act="mapBack">← Bản đồ</button><b>' + E(s.shopName) + ' · ' + E(b.district) + '</b></div>';
    h += '<canvas id="branch-cv" style="width:100%;display:block;border-radius:12px;background:#fbe3d3;' + (f ? 'aspect-ratio:' + f.w.toFixed(1) + '/' + f.h.toFixed(1) : 'min-height:220px') + '"></canvas>';
    h += '<div class="muted small" style="margin:4px 0">Cảnh minh họa: mẫu trưng bày đồng bộ với trụ sở; người đi lại chỉ để xem, không ảnh hưởng doanh thu thật.</div>';
    h += '<div class="card"><table class="tbl small">' + row('Quy mô', E(G.data.levels[v ? v.lv : 2].name) + ' (' + G.data.levels[v ? v.lv : 2].shelves + ' kệ, ' + G.data.levels[v ? v.lv : 2].beds + ' giường trưng bày)') + row('Quản lý', v && v.manager ? E(v.manager) : '<span class="neg">Chưa có</span>') + row('Thu nhập TB 7 ngày', F.short(Ch.avg7(b)) + '/ngày') + row('Hiệu suất khu vực', '×' + b.f.toFixed(2).replace('.', ',')) + '</table></div>';
    return h;
  }
  function render() {
    if (UI.st.map.view) { var bp = branchPage(); if (bp) return bp; }
    var s = G.state, mx = G.progress.maxBranches(), list = Ch.list(), tot = Ch.totalPerDay();
    var h = '<div class="kpis"><div><b>' + (1 + s.branches) + '</b><small>cửa hàng</small></div><div><b>' + s.branches + '/' + mx + '</b><small>chi nhánh</small></div><div><b>' + F.short(tot) + '</b><small>thu nhập chi nhánh/ngày</small></div><div><b>' + s.corp.franchises + '</b><small>đại lý</small></div></div>';
    h += svg();
    h += '<div class="small muted" style="margin:4px 0">Ghim vàng: trụ sở · xanh lá: chi nhánh tốt · cam: hiệu suất thấp · xám: thiếu Quản lý · cam nhỏ: đại lý · đỏ: đối thủ · dấu + : chỗ trống có thể mở.</div>';
    h += '<div class="card">' + detail() + '</div>';
    if (!s.branches) h += '<p class="muted small">Chưa có chi nhánh. Chạm dấu + trên bản đồ (hoặc vào Nâng cấp / Doanh nghiệp) để mở chi nhánh đầu tiên.</p>';
    return h;
  }
  UI.openChainMap = function () { UI.st.map.view = null; G.branchView.close(); if (P.closeSheet) P.closeSheet(); UI.sheet2.open('Bản đồ chuỗi cửa hàng', render); };
  P.act.openChainMap = function () { UI.openChainMap(); };
  P.act.mapEnter = function (el) { var id = +el.dataset.id, list = Ch.list(), i = list.map(function (x) { return x.id; }).indexOf(id); if (i < 0) return; UI.st.map.view = id; G.branchView.open(list[i], i); };
  P.act.mapBack = function () { UI.st.map.view = null; G.branchView.close(); };
  P.act.mapSel = function (el) { UI.st.map.sel = el.dataset.id; };
  P.act.mapOpen = function () { if (!G.lvl().branches) { G.notify.toast('Cần cấp Chuỗi cửa hàng để mở chi nhánh', 'warn'); return; } res(G.progress.buyBranch()); };
})();
