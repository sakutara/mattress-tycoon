/* Khởi tạo & nối các module. Dev cheats ở G.debug. */
(function () {
  'use strict';
  var G = window.G;
  G.debug = {
    icons: function () { return G.icon.show(); },
    forceMeeting: function () { var m = G.state.meeting; m.due = true; m.held = false; m.nextDay = G.state.day; G.debug._forceMeet = true; G.ui.openMeeting(); G.debug._forceMeet = false; },
    addConflict: function (a, b, cause) { var c = G.meeting.addConflict(a, b, cause); return c; },
    suggestStats: function () { var S = G.suggest, c = S.tierCounts(), o = { tiers: c, meaningful: S.count(), customer: S.countCust(), raw: S.countAll(), ok: true }; var rows = S.compute().rows; o.badTier = rows.filter(function (r) { return !r.tier; }).length; o.tier1NoCust = rows.filter(function (r) { return r.tier === 1 && !(r.cust && r.cust.orders.length); }).length; o.ok = !o.badTier; console.log('suggestStats', JSON.stringify(o)); return o; },
    setWeather: function (t, temp) { G.state.weather.cur = { t: t, temp: temp || 28 }; },
    lookbook: function () { return G.ui.openLookbook(); },
    addMoney: function (n) { G.state.money += n; G.ui.panels.refresh(true); return G.state.money; },
    addRevenue: function (n) { G.state.totalRevenue += n; return G.state.totalRevenue; },
    addRep: function (n) { G.state.rep = G.clamp(G.state.rep + n, 0, 100); return G.state.rep; },
    setRating: function (x) { G.reviews.setAvg(x); return G.reviews.avg(); },
    // tua nhanh n ngày game (mô phỏng đầy đủ, modal tự chọn mặc định)
    skipDays: function (n) {
      var target = G.state.day + (n || 1), guard = 0;
      G.state.prep = false; G.clock.skipping = true;
      try { while (G.state.day < target && guard++ < 200000) G.clock.advance(2); } finally { G.clock.skipping = false; G.state.prep = true; }
      G.ui.panels.refresh(true); G.ui.hud.update();
      return 'Đã tua tới ngày ' + G.state.day;
    },
    forceB2B: function () { var n = G.emit('debug:forceB2B'); if (!n) G.notify.toast('Không có sự kiện B2B nào đang chạy', 'warn'); return n; },
    forceEvent: function (type) { return G.events.force(type); },
    addReview: function (r, meta) { G.reviews.add(r, meta || { force: true, late: r <= 2 }); G.ui.panels.refresh(true); },
    levelUp: function () { G.state.totalRevenue = 1e12; G.state.rep = 100; G.state.money += 1e11; var r = G.progress.upgrade(); G.ui.panels.refresh(true); return r; },
    release: function (brand) { return G.life.release(brand || 'songhuong'); },
    forceClaim: function (n) { var c = G.returns.force(n || 3); return c + ' yêu cầu mới, ' + G.returns.pendingList().length + ' đang chờ'; },
    forceLive: function () { var r = G.emit('debug:forceLive'); if (!r) G.notify.toast('Livestream chưa sẵn sàng', 'warn'); G.ui.panels.refresh(true); return G.live.running() ? 'đang live' : 'đã đặt lịch'; },
    giveDecor: function (id, n, auto) { if (!G.decorById[id]) return 'Mã: ' + G.data.decor.map(function (d) { return d.id; }).join(', '); G.decor.give(id, n || 1, auto !== false); G.ui.panels.refresh(true); return G.state.decor.items.length + ' món'; },
    setNames: function (shop, name) { G.state.shopName = shop || G.state.shopName; if (name) { G.state.player.name = name; } G.profile.apply(); },
    tutorial: function (i) { var t = G.state.story; t.tutDone = false; t.introDone = true; t.tutStep = i || 0; t.started = true; G.story.busy = false; G.story.resume(); return 'bước ' + t.tutStep + '/' + G.story.SEQ.length; },
    skipTutorial: function () { G.story.skipAll(); },
    giveStock: function (skuId, n) { G.wh.add(skuId, n || 10, 'st'); G.state.costBasis[skuId] = G.state.costBasis[skuId] || G.skus[skuId].cost; }
  };
  // bàn phím số cho mọi ô nhập số (điện thoại)
  document.addEventListener('focusin', function (e) { var t = e.target; if (t && t.tagName === 'INPUT' && t.type === 'number' && !t.inputMode) t.inputMode = (t.step && String(t.step).indexOf('.') >= 0) ? 'decimal' : 'numeric'; });
  function boot() {
    // khoá chiều dọc (chỉ chạy được khi cài PWA/toàn màn hình; lỗi thì bỏ qua)
    try { var lk = screen.orientation && screen.orientation.lock && screen.orientation.lock('portrait'); if (lk && lk.catch) lk.catch(function () {}); } catch (e) {}
    var saved = G.save.load();
    G.buildState(saved);
    var s = G.state, fresh = !saved;
    G.notify.init();
    G.render.init(document.getElementById('shop'), document.getElementById('canvas-tip'));
    G.emit('init');
    if (fresh) {
      s.started = Date.now();
      // hàng khởi điểm (tổng khối lượng phải nhỏ hơn sức chứa kho cấp 0 = 60, nếu không không đặt được đơn nhập nào ngày 1)
      [['l2_goi|Tiêu chuẩn', 6], ['l2_ga_1|1m6', 6], ['l2_chan|1m6', 3], ['l2_dem|1m6', 1], ['l2_vo|Tiêu chuẩn', 6], ['l1_goi|Tiêu chuẩn', 4], ['l1_ga_1|1m6', 4], ['sh_goi|Tiêu chuẩn', 4], ['sh_chan|1m6', 2], ['sh_ga_1|1m6', 3]].forEach(function (x) {
        G.wh.add(x[0], x[1], 'st'); s.costBasis[x[0]] = G.skus[x[0]].cost;
      });
      G.shelf.autoArrange();
    }
    G.render.resize();
    G.ui.hud.init();
    G.ui.panels.init(); G.ui.initNav();
    G.save.startAuto();
    G.clock.start();
    // hướng dẫn NPC (Bác Tư): người mới -> hồ sơ -> mở đầu; đang dở -> tiếp tục; save cũ -> bỏ qua
    if (fresh || (!s.player.done && !s.story.started && !s.story.tutDone)) { G.profile.onFirst = function () { G.story.begin(); }; G.profile.show(true); }
    else G.story.resume();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
