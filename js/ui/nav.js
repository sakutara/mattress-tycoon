/* Điều hướng kiểu ứng dụng điện thoại: thanh dưới (Cửa hàng/Kho/Nhập/Nhân viên/Thêm), panel dạng bottom-sheet, ẩn tab chưa mở khóa, thẻ trang chủ */
(function () {
  'use strict';
  var G = window.G, E = G.esc, F = G.fmt, UI = G.ui, P = UI.panels;
  function $(id) { return document.getElementById(id); }
  P.groups = [
    { id: 'home', label: 'Cửa hàng', icon: '🏪', tabs: [] },
    { id: 'stock', label: 'Kho', icon: '📦', tabs: ['stock', 'price', 'decor'] },
    { id: 'buy', label: 'Nhập', icon: '🛒', tabs: ['buy', 'cart', 'ship', 'b2b'] },
    { id: 'staff', label: 'Nhân viên', icon: '👥', tabs: ['staff'] },
    { id: 'more', label: 'Thêm', icon: '☰', tabs: ['more', 'report', 'upgrade', 'warranty', 'rev', 'debts', 'camp', 'live'] }
  ];
  P.sheetOpen = false;
  // tab chỉ hiện khi liên quan
  var VIS = {
    ship: function (s) { return s.shipping.orders.length > 0 || s.special.list.length > 0 || s.level >= 1; },
    b2b: function (s) { return s.level >= 3 || s.b2b.orders.length > 0 || s.b2b.offers.length > 0; },
    rev: function (s) { return s.revs.list.length > 0; },
    debts: function (s) { return s.events.debts.length > 0; },
    camp: function (s) { return s.level >= 1 || s.camp.reports.length > 0 || s.camp.offers.length > 0; },
    warranty: function (s) { return s.level >= 1 || s.returns.claims.length > 0 || s.returns.pending.length > 0; },
    live: function (s) { return s.level >= G.live.MIN_LEVEL || s.live.built; }
  };
  P.visible = function (id) { var s = G.state; if (!s) return true; if (G.settings.showLocked) return true; return VIS[id] ? !!VIS[id](s) : true; };
  P.tabDef = function (id) { return P.tabs.filter(function (t) { return t.id === id; })[0]; };
  P.groupOf = function (id) { return P.groups.filter(function (g) { return g.tabs.indexOf(id) >= 0; })[0] || P.groups[1]; };
  // trang "Thêm": danh sách các mục còn lại
  P.register({ id: 'more', label: 'Menu', render: function () {
    var s = G.state, h = '<div class="more-grid">';
    [['report', '📊', 'Báo cáo'], ['upgrade', '⬆', 'Nâng cấp'], ['warranty', '🛠', 'Bảo hành'], ['rev', '⭐', 'Đánh giá'], ['debts', '💸', 'Công nợ khó đòi'], ['camp', '📣', 'Sự kiện & Ưu đãi'], ['live', '🎥', 'Livestream']].forEach(function (x) {
      if (!P.visible(x[0])) return; var t = P.tabDef(x[0]), b = t && t.badge ? t.badge() : '';
      h += '<button class="more-btn" data-act="goTab" data-id="' + x[0] + '"><span class="mi">' + x[1] + '</span><span>' + x[2] + '</span>' + (b ? '<i class="tbadge" style="display:inline-block">' + b + '</i>' : '') + '</button>';
    });
    h += '<button class="more-btn" data-act="openLookbook"><span class="mi">📖</span><span>Lookbook</span></button><button class="more-btn" data-act="openBook"><span class="mi">🧓</span><span>Sổ tay Bác Tư</span></button></div>';
    var t = UI.unlockTeasers ? UI.unlockTeasers() : ''; return h + t;
  } });
  P.act.goTab = function (el) { P.show(el.dataset.id); };
  P.act.openLookbook = function () { if (UI.openLookbook) { P.closeSheet && P.closeSheet(); UI.openLookbook(); } };
  // chế độ chỉ hiện đồ hoạ game: ẩn HUD, thẻ trang chủ, panel, nút điều khiển (CSS .game-view)
  P.gameView = false;
  P.setGameView = function (on) {
    P.gameView = !!on; $('app').classList.toggle('game-view', P.gameView);
    if (G.render && G.render.layoutCanvas) G.render.layoutCanvas(true);
    P.renderBottom();
  };
  P.show = function (id) { if (!P.tabDef(id)) return; if (P.gameView) P.setGameView(false); P.active = id; P.sheetOpen = true; P.buildNav(true); P.refresh(true); };
  P.closeSheet = function () { P.sheetOpen = false; P.buildNav(true); document.getElementById('panel').classList.remove('open'); $('sheet-back') && 0; };
  P.openGroup = function (gid) {
    if (P.gameView) { P.setGameView(false); if (gid === 'home') { P.closeSheet(); return; } }
    else if (gid === 'home') { if (!P.sheetOpen) { P.setGameView(true); return; } P.closeSheet(); return; }
    var g = P.groups.filter(function (x) { return x.id === gid; })[0], cur = g.tabs.indexOf(P.active) >= 0 && P.visible(P.active) ? P.active : g.tabs.filter(function (t) { return P.visible(t); })[0];
    if (P.sheetOpen && g.tabs.indexOf(P.active) >= 0) { P.closeSheet(); P.setGameView(true); return; } // chạm lần nữa: ẩn hết, chỉ còn đồ hoạ game
    P.show(cur);
  };
  // dựng chip tab của nhóm hiện tại + highlight thanh dưới
  P.buildNav = function (quiet) {
    var nav = $('tabs'), g = P.groupOf(P.active);
    if (!quiet && !P.sheetOpen) P.sheetOpen = true; // gọi kiểu cũ (đổi tab bằng code) => mở sheet
    var ids = g.tabs.filter(function (id) { return P.visible(id) && P.tabDef(id); });
    if (!ids.length) ids = [P.active];
    nav.style.display = ids.length > 1 ? 'flex' : 'none';
    nav.innerHTML = ids.map(function (id) { var t = P.tabDef(id); return '<button data-tab="' + id + '" class="' + (id === P.active ? 'on' : '') + '">' + E(t.label) + '<span class="tbadge" data-badge="' + id + '"></span></button>'; }).join('');
    nav.onclick = function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; P.active = b.dataset.tab; P.buildNav(true); P.refresh(true); };
    $('sheet-title').textContent = g.icon + ' ' + g.label;
    $('panel').classList.toggle('open', P.sheetOpen); $('app').classList.toggle('sheet-open', P.sheetOpen);
    P.renderBottom();
    UI.layoutSheets();
  };
  P.renderBottom = function () {
    var nav = $('bottom-nav'), g = P.gameView ? '' : P.sheetOpen ? P.groupOf(P.active).id : 'home';
    nav.innerHTML = P.groups.map(function (x) {
      var b = 0; x.tabs.forEach(function (id) { var t = P.tabDef(id); if (t && t.badge && P.visible(id)) { var v = t.badge(); b += (+v) || (v ? 1 : 0); } });
      return '<button data-g="' + x.id + '" class="' + (x.id === g ? 'on' : '') + '"><span class="ni">' + x.icon + '</span><span class="nl">' + x.label + '</span>' + (b ? '<i class="nb">' + (b > 99 ? '99+' : b) + '</i>' : '') + '</button>';
    }).join('');
  };
  P.refresh = function (force) {
    var body = $('tab-body'); if (!body || !G.state) return;
    if (P._tick) { /* badge nav */ }
    P.renderBottomLazy();
    if (!P.sheetOpen) return;
    if (!P.visible(P.active) && !P.tabDef(P.active).hidden) { P.active = P.groupOf(P.active).tabs.filter(function (t) { return P.visible(t); })[0] || 'stock'; P.buildNav(true); }
    var ae = document.activeElement;
    if (!force && ((ae && body.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) || P.pressed || (UI.drag && UI.drag.active))) return;
    var tab = P.tabDef(P.active); if (!tab) return;
    var html; try { html = tab.render(); } catch (e) { console.error(e); html = '<p class="neg">Lỗi hiển thị tab: ' + E(e.message) + '</p>'; }
    if (html !== P.last || force) {
      var top = body.scrollTop; body.innerHTML = html; P.last = html; body.scrollTop = top;
      body.querySelectorAll('table').forEach(function (t) { if (!t.parentNode.classList.contains('tblwrap')) { var w = document.createElement('div'); w.className = 'tblwrap'; t.parentNode.insertBefore(w, t); w.appendChild(t); } });
    }
    UI.layoutSheets();
    P.tabs.forEach(function (t) { if (!t.badge) return; var el = document.querySelector('[data-badge="' + t.id + '"]'); if (el) { var n = t.badge(), cu = t.id === 'buy' && G.suggest ? G.suggest.countCust() : 0; el.textContent = n ? (cu ? cu + '/' + n : n) : ''; el.classList.toggle('red', cu > 0); el.title = cu ? cu + ' đơn khách cần hàng' : ''; el.style.display = n ? 'inline-block' : 'none'; } });
  };
  var lastNavKey = '';
  P.renderBottomLazy = function () { var k = P.groups.map(function (g) { return g.tabs.map(function (id) { var t = P.tabDef(id); return t && t.badge && P.visible(id) ? t.badge() : ''; }).join(','); }).join('|') + P.sheetOpen + P.active; if (k !== lastNavKey) { lastNavKey = k; P.renderBottom(); } };

  // ---- cuộc đua tab mới mở khóa -> thông báo ----
  var known = null;
  function checkUnlocks() {
    var cur = {}; P.tabs.forEach(function (t) { if (P.visible(t.id) && !t.hidden) cur[t.id] = 1; });
    if (known) { var nw = Object.keys(cur).filter(function (id) { return !known[id] && id !== 'more'; }); if (nw.length) { G.notify.push({ title: '🔓 Mở khóa mục mới', text: nw.map(function (id) { return P.tabDef(id).label; }).join(', ') + ' (xem ở thanh dưới)', type: 'good', sound: 'good' }); P.buildNav(true); } }
    known = cur;
  }
  // chip cho tab "more" (menu) cần hiện trong nhóm Thêm: dùng 'Menu'
  UI.layoutSheets = function () {
    var app = $('app'), st = $('stage'); if (!app || !st) return;
    var sm = $('sheet-money'); if (sm && G.state) sm.textContent = '💰 ' + F.short(G.state.money);
    var top = Math.round(st.getBoundingClientRect().bottom - app.getBoundingClientRect().top);
    app.style.setProperty('--sheet-top', top + 'px');
  };
  // ---- thẻ trang chủ ----
  function homeCards() {
    var s = G.state, t = s.today, h = '';
    h += '<div class="card"><b>Hôm nay</b> <span class="muted small">(ngày ' + s.day + ')</span><div class="kpis"><div><b>' + F.short(t.revenue) + '</b><small>doanh thu</small></div><div><b class="' + (G.econ.profit(t) >= 0 ? 'pos' : 'neg') + '">' + F.short(G.econ.profit(t)) + '</b><small>lãi tạm tính</small></div><div><b>' + t.sales + '</b><small>đơn</small></div><div><b>' + t.visitors + '</b><small>khách vào</small></div></div></div>';
    var alerts = [];
    var emp = s.slots.filter(function (x) { return !x.sku; }).length; if (emp) alerts.push('📭 ' + emp + ' ô trưng bày trống - chạm để chọn mẫu');
    var sg = G.suggest.count(), sgc = G.suggest.countCust(); if (sg) alerts.push('🛒 ' + sg + ' gợi ý nhập hàng' + (sgc ? ' (' + sgc + ' cho đơn khách đã đặt!)' : ''));
    var wc = G.returns.pendingList().length; if (wc) alerts.push('🛠 ' + wc + ' yêu cầu bảo hành chờ xử lý');
    var rv = G.reviews.unanswered().length; if (rv) alerts.push('⭐ ' + rv + ' đánh giá chờ phản hồi');
    if (G.meeting && G.meeting.isDue()) alerts.push('👥 Họp nhân viên tuần này - vào Nhân viên → Họp');
    var abn = G.autobuy ? G.autobuy.unreviewed() : 0; if (abn) alerts.push('📋 ' + abn + ' mặt hàng Thủ kho đề xuất mua - vào tab Nhập để duyệt');
    var ws = G.shipping.pendingCount(); if (ws) alerts.push('📦 ' + ws + ' đơn chờ đặt ship' + (G.shipping.sameDayOk() ? ' - đặt trước 17h để giao trong ngày' : ' - quá 17h: giao sáng mai'));
    var mc = G.shipping.morningCount(); if (mc) alerts.push('🚚 ' + mc + ' đơn giao sáng nay');
    var lows = s.money < 0 ? ['⚠ Tiền mặt đang âm!'] : []; alerts = lows.concat(alerts);
    h += '<div class="card"><b>Việc cần làm</b>' + (alerts.length ? '<ul class="alist">' + alerts.map(function (a) { return '<li>' + E(a) + '</li>'; }).join('') + '</ul>' : '<p class="muted small">Mọi thứ đang ổn.</p>') + '</div>';
    h += '<div class="card small muted">💡 Chạm vào kệ / giường trưng bày trên sơ đồ để chọn MẫU trưng bày (mỗi ô 1 mẫu, hàng bán lấy từ kho); giữ lâu để mở menu nhanh; kéo thẻ mẫu trong Kho thả lên kệ.</div>';
    return h;
  }
  var lastHome = '';
  G.on('uiRefresh', function () {
    if (!G.state) return;
    UI.layoutSheets();
    var h = homeCards(); if (h !== lastHome) { lastHome = h; $('home-cards').innerHTML = h; }
    checkUnlocks();
  });
  // tap để xem chi tiết khách/giờ (thay tooltip hover)
  G.on('uiRefresh', function () {
    var box = $('traffic-bd'); if (!box || box.style.display === 'none') return;
    var bd = G.customers.breakdown(); box.innerHTML = '<table class="tbl small">' + bd.rows.map(function (r) { return '<tr><td>' + E(r[0]) + '</td><td class="r">' + E(r[1]) + '</td></tr>'; }).join('') + '<tr class="tot"><td>Tổng</td><td class="r">' + bd.total.toFixed(1) + '/giờ</td></tr></table><div class="muted small">' + E(G.decor.summary()) + '</div>';
  });
  UI.initNav = function () {
    UI.initShelf();
    $('sheet-x').onclick = function () { P.closeSheet(); };
    $('bottom-nav').onclick = function (e) { var b = e.target.closest('[data-g]'); if (b) P.openGroup(b.dataset.g); };
    $('drawer-btn').onclick = function (e) { e.stopPropagation(); $('drawer').classList.toggle('open'); UI.layoutSheets(); setTimeout(UI.layoutSheets, 260); };
    $('h-traffic-box').onclick = function () { var b = $('traffic-bd'); b.style.display = b.style.display === 'none' ? 'block' : 'none'; };
    $('set-autolive').checked = !!G.settings.autoLive; $('set-autolive').onchange = function () { G.settings.autoLive = this.checked; G.saveSettings(); };
    $('set-locked').checked = !!G.settings.showLocked;
    $('set-locked').onchange = function () { G.settings.showLocked = this.checked; G.saveSettings(); P.buildNav(true); P.refresh(true); };
    window.addEventListener('resize', UI.layoutSheets);
    if (window.ResizeObserver) new ResizeObserver(function () { UI.layoutSheets(); }).observe($('stage'));
    $('canvas-tip') && 0;
    P.buildNav(true); P.refresh(true); known = null; setTimeout(function () { checkUnlocks(); }, 0);
  };
})();
