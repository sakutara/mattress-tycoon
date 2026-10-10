/* HUD: tiền, ngày giờ, đánh giá, danh tiếng, cấp, khách/giờ, tốc độ */
(function () {
  'use strict';
  var G = window.G, UI = G.ui = G.ui || {}, E = G.esc;
  function $(id) { return document.getElementById(id); }
  UI.hud = {
    init: function () {
      $('speed').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (G.state.prep && +b.dataset.s > 0) { var sp0 = +b.dataset.s; UI.abGate(function () { G.clock.openShop(); G.clock.setSpeed(sp0); UI.hud.update(); }); return; } G.clock.setSpeed(+b.dataset.s); UI.hud.update(); };
      $('open-btn').onclick = $('open-mini').onclick = function () { UI.abGate(function () { G.clock.openShop(); if (G.state.speed === 0) G.clock.setSpeed(1); UI.hud.update(); }); };
      // cài đặt
      var st = G.settings;
      function syncSet() { $('set-music').checked = st.music; $('set-vol').value = Math.round(st.musicVol * 100); $('set-sfx').checked = st.sfx; $('set-auto').checked = st.autoOpen; $('pb-auto').checked = st.autoOpen; }
      syncSet();
      $('set-music').onchange = function () { st.music = this.checked; G.saveSettings(); G.music.apply(); };
      $('set-vol').oninput = function () { st.musicVol = this.value / 100; G.saveSettings(); G.music.apply(); };
      $('set-sfx').onchange = function () { st.sfx = this.checked; G.saveSettings(); };
      $('set-auto').onchange = function () { st.autoOpen = this.checked; G.saveSettings(); syncSet(); };
      $('pb-auto').onchange = function () { st.autoOpen = this.checked; G.saveSettings(); syncSet(); };
      G.music.arm();
      $('profile-btn').onclick = function () { G.profile.show(false); };
      $('help-btn').onclick = function () { $('drawer').classList.remove('open'); G.story.openBook(); };
      $('save-btn').onclick = function () { G.save.save(); G.notify.toast('Đã lưu game', 'good'); };
      $('reset-btn').onclick = function () { G.save.reset(); };
      document.addEventListener('keydown', function (e) {
        if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        var m = { ' ': null, '1': 1, '2': 2, '3': 4, '0': 0 };
        if (e.key === 'Escape') { G.decor.placing = null; return; }
        if (e.key === ' ') { e.preventDefault(); if (G.state.prep) { UI.abGate(function () { G.clock.openShop(); if (G.state.speed === 0) G.clock.setSpeed(1); UI.hud.update(); }); } else G.clock.setSpeed(G.state.speed === 0 ? 1 : 0); UI.hud.update(); }
        else if (e.key in m) { if (G.state.prep && m[e.key] > 0) { var mk = m[e.key]; UI.abGate(function () { G.clock.openShop(); G.clock.setSpeed(mk); UI.hud.update(); }); return; } G.clock.setSpeed(m[e.key]); UI.hud.update(); }
      });
      G.on('uiRefresh', UI.hud.update);
      UI.hud.update();
    },
    update: function () {
      var s = G.state; if (!s) return;
      var mt = G.fmt.short(s.money); $('h-money').textContent = mt; $('h-money').style.fontSize = mt.length > 13 ? '9px' : mt.length > 11 ? '10px' : mt.length > 8 ? '11.5px' : ''; $('h-money').className = 'val' + (s.money < 0 ? ' neg' : '');
      $('h-wd').textContent = G.cal.WD[G.cal.weekday(s.day)] + ' · Tháng ' + G.cal.moy(s.day);
      $('h-day').textContent = 'Ngày ' + s.day;
      var wx = G.weather && G.weather.cur(), wxh = wx ? G.icon(G.weather.icon(wx.t), 12) + ' ' + wx.temp + '°' : ''; if (UI._wx !== wxh) { UI._wx = wxh; $('h-wx').innerHTML = wxh; $('h-wx').title = wx ? G.weather.def().name + ' ' + wx.temp + '°C' : ''; }
      $('h-time').textContent = s.prep ? '🌅' : G.cal.hm(s.minute) + (G.clock.isOpen() && !G.staff.closed() ? '' : ' (đóng)');
      UI.hud.prep(s);
      var sn = $('h-shop'); if (sn && sn.textContent !== s.shopName) sn.textContent = s.shopName;
      if (UI.hud._tt !== s.minute >> 3) { // cập nhật tooltip khách/giờ (nhẹ)
        UI.hud._tt = s.minute >> 3; var bd = G.customers.breakdown();
        $('h-traffic-box').title = 'Khách/giờ = ' + bd.rows.map(function (r) { return r[0] + ' ' + r[1]; }).join('  ') + '\n= ' + bd.total.toFixed(1) + ' khách/giờ\n' + G.decor.summary();
      }
      var r = G.reviews.avg();
      $('h-rating').textContent = r.toFixed(2); $('h-rep').textContent = Math.floor(s.rep); $('h-level').textContent = G.lvl().name;
      var rate = G.customers.rate();
      $('h-traffic').textContent = rate.toFixed(1) + ' (×' + (r / 3).toFixed(2) + ')';
      Array.prototype.forEach.call($('speed').children, function (b) { b.classList.toggle('on', +b.dataset.s === s.speed); });
      var info = $('stage-info');
      if (info) {
        var cu = G.customers.list, asked = cu.filter(function (c) { return c.state === 'wait' && c.asked; }).length, selfN = cu.filter(function (c) { return c.self || (c.state === 'browse'); }).length;
        var ents = G.staff.ents.filter(function (e) { return e.role === 'sales' || e.role === 'owner'; }), idle = ents.filter(function (e) { return e.state === 'idle'; }).length;
        info.innerHTML = '<span>🏷 <b>' + E(G.lvl().name) + '</b></span><span>👥 Khách: <b>' + cu.length + '</b> (chờ tư vấn <b class="' + (asked > 2 ? 'neg' : '') + '">' + asked + '</b>)</span><span>🧑‍💼 Nhân viên bán: <b>' + ents.length + '</b> (rảnh <b>' + idle + '</b>)</span><span>🌤 ' + G.season.name(s.day) + '</span><span>📦 Kho: <b>' + Math.round(G.wh.used('st')) + '/' + G.wh.cap('st') + '</b></span>' + (G.live.running() ? '<span class="neg">🔴 LIVE 👁 ' + Math.round(G.live.running().st.viewers) + '</span>' : '') + (G.clock.modalCount ? '<span class="neg">⏸ Đang chờ bạn quyết định</span>' : (s.prep ? '<span class="pos">🌅 Đang chuẩn bị - thời gian đứng yên</span>' : (s.speed === 0 ? '<span class="neg">⏸ Tạm dừng</span>' : '')));
      }
    },
    prep: function (s) {
      var b = $('prep-banner'); if (!b) return;
      b.style.display = s.prep ? 'flex' : 'none'; var fab = $('open-btn'); if (fab) fab.style.display = s.prep ? 'block' : 'none'; document.getElementById('app').classList.toggle('is-prep', !!s.prep); if (!s.prep) return;
      var h = s.history.days[s.history.days.length - 1], sum = h ? 'Hôm qua (ngày ' + h.day + '): doanh thu <b>' + G.fmt.short(h.revenue) + '</b> · lãi <b class="' + (h.profit >= 0 ? 'pos' : 'neg') + '">' + G.fmt.short(h.profit) + '</b> · ' + h.sales + ' đơn · ' + h.visitors + ' khách · ' + h.rating.toFixed(2) + '★' : 'Ngày đầu tiên! Xếp hàng, đặt giá, rồi mở cửa.';
      var emptySlots = s.slots.filter(function (x) { return !x.sku; }).length, away = s.staff.filter(function (x) { return x.status !== 'ok'; }).length, unb = G.shipping ? G.shipping.pendingCount() : 0, rv = G.reviews.unanswered().length;
      var abB = G.autobuy && G.autobuy.open(); if (abB && !abB.shown && !G.clock.skipping && !UI._abPop) { UI._abPop = 1; setTimeout(function () { UI._abPop = 0; if (G.autobuy.open() && !G.autobuy.open().shown && G.state.prep) UI.openAbReview(); }, 400); }
      var abTxt = abB ? '<button class="chipx neg abchip" data-abopen="1">' + G.icon('receipt', 12) + ' ' + G.autobuy.unreviewed() + ' mặt hàng cần duyệt · tổng ' + G.fmt.short(G.autobuy.totals(abB).total) + '</button>' : '';
      var mtTxt = G.meeting && (G.meeting.isDue() || G.meeting.st().current) ? '<button class="chipx warn abchip" data-mtopen="1">' + G.icon('people', 12) + (G.meeting.st().current ? ' Tiếp tục họp nhân viên' : ' Họp nhân viên tuần này') + '</button>' : '';
      var todo = [mtTxt, abTxt, 'Ô trưng bày trống: <b>' + emptySlots + '</b>', 'NV vắng: <b>' + away + '</b>', 'Đơn chờ ship: <b>' + unb + '</b>', '<b>' + (G.shipping ? G.shipping.morningCount() : 0) + '</b> đơn giao sáng nay', 'Đánh giá chờ trả lời: <b>' + rv + '</b>', '<b>' + G.suggest.count() + '</b> gợi ý nhập hàng' + (G.suggest.countCust() ? ' (<b class="neg">' + G.suggest.countCust() + '</b> cho đơn khách)' : ''), '<b>' + G.returns.pendingList().length + '</b> yêu cầu bảo hành', 'Tiền: <b>' + G.fmt.short(s.money) + '</b>'];
      $('pb-title').textContent = '🌅 Chuẩn bị ngày mới · Ngày ' + s.day + ' (' + G.cal.WDFULL[G.cal.weekday(s.day)] + ')';
      var a = '<span>' + sum + '</span>' + (G.weather ? '<br><span class="small">' + G.icon(G.weather.icon(G.weather.cur().t), 14) + ' Hôm nay <b>' + G.weather.def().name + ' ' + G.weather.cur().temp + '°</b> · ' + G.weather.forecastText() + (G.weather.hint().length ? ' <i class="muted">(' + G.weather.hint().join('; ') + ')</i>' : '') + '</span>' : ''), t = todo.filter(function (x) { return x; }).join(' · ');
      if (UI._pbA !== a) { UI._pbA = a; $('pb-sum').innerHTML = a; } if (UI._pbT !== t) { UI._pbT = t; $('pb-todo').innerHTML = t; }
    }
  };
})();
