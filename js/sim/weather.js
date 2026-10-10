/* Thời tiết: dự báo 3 ngày + diễn biến trong ngày theo mùa Việt Nam; ảnh hưởng khách tới cửa hàng, online/livestream, giao hàng, tâm trạng */
(function () {
  'use strict';
  var G = window.G;
  var TYPES = {
    nang: { name: 'Nắng', icon: 'sun', traffic: 1.0, online: 1.0, ship: 0, pat: 1.0 },
    may: { name: 'Nhiều mây', icon: 'cloud', traffic: 1.0, online: 1.0, ship: 0, pat: 1.0 },
    muanhe: { name: 'Mưa nhẹ', icon: 'rain', traffic: 0.88, online: 1.15, ship: 0.08, pat: 0.95 },
    muato: { name: 'Mưa to / bão', icon: 'storm', traffic: 0.5, online: 1.4, ship: 0.4, pat: 0.85 },
    nom: { name: 'Nồm ẩm', icon: 'humid', traffic: 0.92, online: 1.05, ship: 0.04, pat: 0.95 },
    ret: { name: 'Rét đậm', icon: 'cold', traffic: 0.8, online: 1.1, ship: 0.05, pat: 0.92 },
    nong: { name: 'Nắng nóng', icon: 'hot', traffic: 0.85, online: 1.05, ship: 0.02, pat: 0.9 }
  };
  // trọng số theo tháng dương lịch (G.cal.moy) + dải nhiệt độ
  function monthTable(m) {
    if (m === 12 || m === 1 || m === 2) return { w: { ret: 0.3, may: 0.3, nang: 0.2, muanhe: 0.2 }, t: [8, 20] };
    if (m === 3 || m === 4) return { w: { nom: 0.35, muanhe: 0.3, may: 0.25, nang: 0.1 }, t: [18, 27] };
    if (m >= 5 && m <= 8) return { w: { nong: 0.35, nang: 0.25, muato: 0.2, muanhe: 0.1, may: 0.1 }, t: [29, 38] };
    return { w: { nang: 0.3, may: 0.3, muanhe: 0.2, muato: m === 9 ? 0.15 : 0.05, ret: m === 11 ? 0.1 : 0 }, t: [21, 30] };
  }
  G.addDefaults({ weather: { day: 0, cur: null, fc: [], changed: false } });
  function roll(day) {
    var tb = monthTable(G.cal.moy(day)), keys = Object.keys(tb.w).filter(function (k) { return tb.w[k] > 0; });
    var t = G.weighted(keys, function (k) { return tb.w[k]; }), lo = tb.t[0], hi = tb.t[1], temp = Math.round(lo + (hi - lo) * Math.random());
    if (t === 'ret') temp = Math.min(temp, 14); if (t === 'nong') temp = Math.max(temp, 34); if (t === 'muato' || t === 'muanhe') temp -= 3;
    return { t: t, temp: temp };
  }
  var W = G.weather = {
    TYPES: TYPES,
    cur: function () { var w = G.state.weather; if (!w.cur) W.init(); return w.cur; },
    def: function () { return TYPES[W.cur().t]; },
    init: function () { var s = G.state, w = s.weather; if (!w.cur) { w.cur = roll(s.day); w.day = s.day; } while (w.fc.length < 3) w.fc.push(roll(s.day + w.fc.length + 1)); },
    next: function () { // sang ngày mới: dự báo -> thực tế (80% đúng)
      var s = G.state, w = s.weather; W.init();
      var pred = w.fc.shift(); w.cur = G.chance(0.8) ? pred : roll(s.day); w.day = s.day; w.changed = false;
      w.fc.push(roll(s.day + 3));
    },
    forecast: function () { W.init(); return G.state.weather.fc; },
    icon: function (t) { return TYPES[t].icon; },
    traffic: function () { return W.def().traffic; },
    online: function () { return W.def().online; },
    shipDelay: function () { return W.def().ship; },
    patience: function () { return W.def().pat; },
    demand: function (type) {
      var t = W.cur().t, m = 1;
      if (t === 'ret') m = { chan: 1.8, topper: 1.2, ga: 1.1 }[type] || 1;
      else if (t === 'nom') m = { dem: 1.2, topper: 1.3, phukien: 1.5, chan: 0.8 }[type] || 1;
      else if (t === 'nong') m = { ga: 1.25, chan: 0.4, topper: 0.8 }[type] || 1;
      else if (t === 'muato') m = { phukien: 1.2 }[type] || 1;
      return m;
    },
    forecastText: function () {
      var f = W.forecast(), lbl = ['Ngày mai', 'Ngày kia', 'Ngày kìa'];
      return f.map(function (d, i) { return lbl[i] + ': <b>' + TYPES[d.t].name + ' ' + d.temp + '°</b>'; }).join(' · ');
    },
    hint: function () {
      var f = W.forecast(), out = [];
      f.forEach(function (d) { if (d.t === 'ret') out.push('rét: chăn ấm sẽ bán chạy'); else if (d.t === 'nong') out.push('nắng nóng: bộ ga mát / lụa bán chạy'); else if (d.t === 'nom') out.push('nồm ẩm: đệm / chống ẩm bán chạy'); else if (d.t === 'muato') out.push('mưa to: ít khách tới cửa hàng, chú ý livestream'); });
      return out.filter(function (x, i, a) { return a.indexOf(x) === i; });
    }
  };
  var tm = function () { return W.traffic(); }; tm.label = 'Thời tiết'; G.trafficMods.push(tm);
  G.conversionMods.push(function (c, eff, ctx) {
    var t = ctx && ctx.sku && G.skus[ctx.sku]; if (!t) return 1; var w = W.cur().t;
    if (t.cw && w === 'nong' && /tencel|lụa|satin/.test(t.cw.mat || '')) return 1.15;
    if (t.cw && w === 'ret' && /microfiber|cotton/.test(t.cw.mat || '')) return 1.05;
    return 1;
  });
  G.on('init', W.init);
  G.on('dayStart', function () { W.next(); var t = W.cur(), d = TYPES[t.t]; if (t.t === 'muato' || t.t === 'ret' || t.t === 'nong') G.notify.push({ title: 'Thời tiết hôm nay: ' + d.name + ' ' + t.temp + '°', text: 'Lượng khách tới cửa hàng ×' + d.traffic + (d.online > 1 ? ', online/livestream tăng.' : '.'), type: 'info', sound: false, toast: false }); });
  // diễn biến trong ngày
  G.on('hour', function (h) {
    var w = G.state.weather; if (w.changed || h.hour < 12 || h.hour > 18 || !G.chance(0.12)) return; w.changed = true;
    var t = w.cur.t, to = { nang: 'may', may: 'muanhe', muanhe: G.chance(0.3) ? 'muato' : 'may', nong: 'muato', nom: 'muanhe', ret: 'may', muato: 'muanhe' }[t];
    if (to && to !== t) { w.cur = { t: to, temp: w.cur.temp - (to === 'muato' || to === 'muanhe' ? 3 : 0) }; G.notify.push({ title: 'Thời tiết đổi: ' + TYPES[to].name, text: 'Trời chuyển ' + TYPES[to].name.toLowerCase() + ' từ ' + h.hour + 'h.', type: 'info', sound: false, toast: false }); }
  });
})();
